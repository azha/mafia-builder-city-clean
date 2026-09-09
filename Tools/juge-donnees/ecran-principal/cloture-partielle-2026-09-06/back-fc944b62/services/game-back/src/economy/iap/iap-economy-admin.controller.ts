// IMPLEMENTS: docs/tech/09_data_model/schema_player_economy_state.md §9.1 (PATCH
//             /admin/players/:id/economy/marks — "Mutation marks (cas compensation support…)" +
//             GET /admin/players/:id/iap-history) + design §3-C5 (the robinet de production — no
//             egress required, §2.4) + docs/tech/10_economy_monetization/refund_policy.md (C6 —
//             POST /admin/iap-transactions/:txn_id/refund, the 30-day no-questions policy).
// -- W1.3-C5 -- 2026-08-13 --
// -- W1.3-C6 -- 2026-08-13 -- (POST iap-transactions/:txn_id/refund — restore_in_game=true
//    reverses via a NEGATIVE marks_ledger entry, CLAMPED at 0, never a bare UPDATE, §5-A3 policy
//    (i). window_days gets a REAL consumer here — a gate, not a range statement.)
// -- FIX (review ⊥ B2, 2026-08-13) -- the anti-double-refund guard was a `SELECT` OUTSIDE the
//    transaction, then an `UPDATE` with no predicate on `refunded_at` — two in-flight requests
//    (retry after timeout, double-click) both pass the `SELECT` before either commits, both
//    reverse the grant. This is EXACTLY the TOCTOU form the design forbade verbatim for C4
//    ("jamais un SELECT préalable"), reproduced here on the withdrawal side. Fixed: the guard is
//    now the `UPDATE … WHERE txn_id = ? AND refunded_at IS NULL` itself, `.returning()`+cardinality
//    check INSIDE the transaction, BEFORE the marks reversal — a second in-flight request's
//    guarded UPDATE blocks on the row lock, then matches 0 rows once the first commits (same
//    guarded-UPDATE discipline as `debitGuarded`/the entitlement PK/the receipt unique index).
//    The pre-transaction `SELECT` stays (404 lookup + window-eligibility read) but is no longer
//    the guard — it's a plain read.
// -- FIX (review ⊥ B3, 2026-08-13) -- `T.econ.refund.no_questions` gated the OPERATOR audit
//    reason backwards: canon (`refund_policy.md:123`, `gdd/14:3281`) says the operator's free-text
//    reason is required PRECISELY WHEN `no_questions=true` (the default) — "no questions asked OF
//    THE PLAYER, beyond a free-text reason for audit". The code required it only when `false`,
//    the exact inverse, so at the shipped default `refund_reason` persisted NULL — the one column
//    `refund_policy.md:130,152` names as the 7-year audit-retention artifact. Fixed: `reason_text`
//    is now required UNCONDITIONALLY (server-side, this is what the canon actually governs here).
//    `T.econ.refund.no_questions` itself governs whether the PLAYER must additionally justify —
//    there is no player-facing refund-request surface in this lot (refunds are BO-initiated
//    only), so that half of the tunable has no code to gate; the getter is removed from
//    `iap.tunables.ts` rather than left wired to the wrong thing (matches the ALREADY-established
//    precedent there: the 2 post-launch `T.ui.iap.cost_*` are correctly consumer-less and just
//    documented, never wired to an unrelated check for R2.3's sake).
//
// `IapEconomyAdminController` — the ONLY production Marks TAP that doesn't depend on an outbound
// store call (§1.7 measured zero egress capability). MUST ship in the SAME lot as the receipt
// port (design §2.4) — otherwise the ledger only ever has ONE positive entry (the welcome grant)
// and the balance can only decrease.
//
// RBAC (fixed, review ⊥ I2): canon (`schema_player_economy_state.md §9.1`) says role `admin` for
// the marks PATCH — REUSE as-is (`refund_policy.md:196` says `player_support` explicitly does
// NOT carry `adjust_currency`, so `admin` is correct here, not a fallback). The history GET names
// `ops`/`compliance`, neither of which exists in this stack's `StaffRoleClaim` (`player |
// player_support | gm | admin | super_admin`) — gated on `admin`, the closest available role
// (Deviation, consigned in implementation-notes.md). The REFUND names THREE roles
// (`refund_policy.md:124,190`): `player_support` is the PRIMARY actor ("Acteur = Support L1"),
// plus `admin`/`compliance` for escalation — `player_support` DOES exist in `StaffRoleClaim` and
// is now the gate (`requireStaffRole('player_support')`, `ROLE_ORDINAL` admits gm/admin/
// super_admin too, `staff-role.guard.ts:63-69`) — gating this on `admin` alone would have locked
// the canonical operator out of the route their own policy names them for.
//
// Two-person rule: NOT WIRED on this route (TD-107 — the ch17 approval workflow shipped in migration 0152). Same
// precedent as every sibling BO controller in this codebase (marker only, no enforcement path).

import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { iapTransaction } from '../../db/schema/player_economy_state';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { MarksWalletRepository } from './marks-wallet.repository';
import { MarksLedgerRepository } from './marks-ledger.repository';
import { findIapSku } from './iap-sku-catalogue';
import { iapTunables } from './iap.tunables';

interface PatchMarksBody {
  delta_marks?: number;
  reason_code?: string;
  reason_text?: string;
}

interface RefundBody {
  reason_code?: string;
  reason_text?: string;
  restore_in_game?: boolean;
}

const IAP_HISTORY_LIMIT = 50;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// `bo:` prefix (3 chars) + reason_code must fit marks_ledger.reason_sku varchar(64) (0148:29).
const REASON_CODE_MAX_LEN = 61;

// review ⊥ M4 — a non-uuid :id/:txn_id param reached Postgres raw and surfaced as a 500
// ("invalid input syntax for type uuid"). Micro-validator, no shared cross-file extraction (this
// codebase's own convention — precedent: cue-stack.service.ts:357-362's own `requireUuid`).
function requireUuid(value: unknown, field: string): string {
  const s = String(value ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    throw new ApiError('VALIDATION_FAILED', { message: `${field} must be a UUID (got '${s}').` });
  }
  return s;
}

@Controller('admin')
export class IapEconomyAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly walletRepo: MarksWalletRepository,
    private readonly ledgerRepo: MarksLedgerRepository,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  /**
   * `PATCH /v1/admin/players/:id/economy/marks` — Body: `{ delta_marks, reason_code, reason_text }`
   * (canon §9.1). `:id` is a `player_id` (not an account_id — the canon route is scoped to the
   * player, same as every sibling `/admin/players/:id/*` route). Writes the SAME marks_ledger
   * invariant every other mutation in this lot writes (`reason_sku = 'bo:<reason_code>'` — an
   * open marker, not a real catalogue sku_id) + one `admin_audit_log` row
   * (`db.economy_states.marks_change`, canon §9.3).
   */
  @Patch('players/:id/economy/marks')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async patchMarks(
    @Param('id') playerIdParam: string,
    @Body() body: PatchMarksBody | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ player_id: string; marks: number }> {
    const playerId = requireUuid(playerIdParam, 'id'); // review ⊥ M4.
    const deltaMarks = body?.delta_marks;
    const reasonCode = body?.reason_code;
    const reasonText = body?.reason_text;
    if (!Number.isInteger(deltaMarks) || deltaMarks === 0) {
      throw new ApiError('VALIDATION_FAILED', { message: 'delta_marks must be a non-zero integer.' });
    }
    if (typeof reasonCode !== 'string' || reasonCode === '' || typeof reasonText !== 'string' || reasonText === '') {
      throw new ApiError('VALIDATION_FAILED', { message: 'reason_code and reason_text are required.' });
    }
    if (reasonCode.length > REASON_CODE_MAX_LEN) {
      // review ⊥ M5 — `reason_sku: 'bo:' + reasonCode` must fit varchar(64); reject rather than
      // fail mid-transaction on a truncated insert.
      throw new ApiError('VALIDATION_FAILED', { message: `reason_code must be at most ${REASON_CODE_MAX_LEN} characters.` });
    }

    const result = await this.db.transaction(async (tx) => {
      const applied = await this.walletRepo.applyDelta(tx, playerId, deltaMarks!);
      if (!applied || applied === 'INSUFFICIENT') return applied;
      await this.ledgerRepo.insert(tx, { playerId, deltaMarks: deltaMarks!, reasonSku: `bo:${reasonCode}` });
      return applied;
    });
    if (result === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No economy_states row for player ${playerId}.` });
    }
    if (result === 'INSUFFICIENT') {
      // review ⊥ I4: a BO subvention can no longer manufacture a negative balance — refused
      // (not silently clamped), same posture as the player-facing guarded debit.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `delta_marks=${deltaMarks} would drive player ${playerId}'s balance negative — refused.`,
      });
    }

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'economy_states.marks',
      targetPlayerId: playerId,
      beforeState: { marks: result.before },
      afterState: { marks: result.after, delta_marks: deltaMarks, reason_code: reasonCode, reason_text: reasonText },
    });

    return { player_id: playerId, marks: result.after };
  }

  /**
   * `GET /v1/admin/players/:id/iap-history` — canon §9.1 (`{ items: IapTransactionRow[],
   * pagination: KeysetCursor }`). Deviation (consigned in implementation-notes.md): implemented as
   * a simple bounded list (LIMIT 50, ORDER BY purchased_at DESC) rather than full keyset-cursor
   * pagination — no falsifiable in this lot exercises pagination, and this keeps the surface
   * minimal; a follow-up adds cursor support when a caller needs more than 50 rows.
   */
  @Get('players/:id/iap-history')
  @UseGuards(requireStaffRole('admin'))
  async getIapHistory(@Param('id') playerIdParam: string, @Query('limit') limitParam?: string): Promise<{ items: IapHistoryItemView[] }> {
    const playerId = requireUuid(playerIdParam, 'id'); // review ⊥ M4.
    // review ⊥ M3 — a negative/zero limit ('-5' -> parseInt -5, which is TRUTHY so `|| 50` never
    // applies) reached `.limit(-5)` and threw a raw Postgres error (500). Clamp to [1, 50].
    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit >= 1 ? Math.min(parsedLimit, IAP_HISTORY_LIMIT) : IAP_HISTORY_LIMIT;
    const rows = await this.db
      .select()
      .from(iapTransaction)
      .where(eq(iapTransaction.player_id, playerId))
      .orderBy(desc(iapTransaction.purchased_at))
      .limit(limit);
    // amount_cents is a bigint (schema `mode: 'bigint'`) — JSON.stringify THROWS on a raw bigint
    // (no native serialization). Stringify it explicitly (the lot-0 bigint-string convention,
    // same as WalletProjection.cash_cents) rather than returning the raw Drizzle row.
    return {
      items: rows.map((r) => ({
        txn_id: r.txn_id,
        player_id: r.player_id,
        sku: r.sku,
        amount_cents: r.amount_cents.toString(),
        currency_code: r.currency_code,
        platform: r.platform,
        platform_receipt: r.platform_receipt,
        purchased_at: r.purchased_at,
        refunded_at: r.refunded_at,
        refund_reason: r.refund_reason,
      })),
    };
  }

  /**
   * `POST /v1/admin/iap-transactions/:txn_id/refund` — Body: `{ reason_code, reason_text,
   * restore_in_game }` (refund_policy.md §2). `T.econ.refund.window_days` GATES eligibility (409
   * past the window — a real consumer, design §6 "used_by: processRefund()"). `reason_text` is
   * REQUIRED UNCONDITIONALLY (review ⊥ B3 — canon requires the operator audit reason regardless
   * of `no_questions`, which governs a player-facing justification this lot has no route for).
   * `restore_in_game=true` reverses the grant via a NEGATIVE `marks_ledger` entry, CLAMPED at 0
   * (§5-A3 policy (i) — "keep them granted if the player likes them", refund_policy.md:128) —
   * NEVER a bare `UPDATE` without the paired ledger row (design §3-C6: "jamais un UPDATE nu").
   * Anti-double-refund guard is the `UPDATE … WHERE refunded_at IS NULL` itself, IN the
   * transaction (review ⊥ B2) — never a preceding `SELECT`.
   */
  @Post('iap-transactions/:txn_id/refund')
  @HttpCode(200)
  @UseGuards(requireStaffRole('player_support'))
  async refund(
    @Param('txn_id') txnIdParam: string,
    @Body() body: RefundBody | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ txn_id: string; refunded_at: string; marks_removed: number }> {
    const txnId = requireUuid(txnIdParam, 'txn_id'); // review ⊥ M4 — 400, never a raw pg 500.
    const reasonCode = body?.reason_code;
    const reasonText = body?.reason_text;
    const restoreInGame = body?.restore_in_game === true;
    if (typeof reasonCode !== 'string' || reasonCode === '') {
      throw new ApiError('VALIDATION_FAILED', { message: 'reason_code is required.' });
    }
    // review ⊥ B3: the operator audit reason is required UNCONDITIONALLY — canon
    // (refund_policy.md:123, gdd/14:3281) requires it precisely at the shipped default
    // (no_questions=true); it is NOT gated by that tunable, which has no player-facing surface
    // to govern in this lot (BO-initiated refunds only — see iap.tunables.ts header).
    if (typeof reasonText !== 'string' || reasonText === '') {
      throw new ApiError('VALIDATION_FAILED', { message: 'reason_text is required (the audit-retention record, refund_policy.md §2.1/§7.3).' });
    }

    const rows = await this.db.select().from(iapTransaction).where(eq(iapTransaction.txn_id, txnId)).limit(1);
    const txn = rows[0];
    if (!txn) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Unknown iap_transactions.txn_id: ${txnId}.` });
    }
    if (txn.refunded_at !== null) {
      // Fast, friendly 409 for the COMMON case (already refunded, no race). The REAL guard
      // against a concurrent double-refund is the DB-level UPDATE below, not this read.
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `Transaction ${txnId} was already refunded.` });
    }

    // T.econ.refund.window_days consumer: the policy window is a REAL gate, not a range statement.
    const ageDays = (Date.now() - txn.purchased_at.getTime()) / MS_PER_DAY;
    if (ageDays > iapTunables.refundWindowDays) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `Transaction ${txnId} is outside the ${iapTunables.refundWindowDays}-day refund policy window.`,
      });
    }

    let marksRemoved = 0;
    const refundedAt = new Date();
    const claimed = await this.db.transaction(async (tx) => {
      // review ⊥ B2 — THE guard: UPDATE … WHERE refunded_at IS NULL, IN this transaction,
      // BEFORE the marks reversal. A concurrent refund attempt's own guarded UPDATE blocks on
      // the row lock, then (once this commits) matches 0 rows — never a second reversal. Same
      // discipline as `debitGuarded`/the entitlement PK/the receipt unique index: the guard is
      // the WHERE clause + cardinality check, never a preceding read.
      const claimRows = await tx
        .update(iapTransaction)
        .set({ refunded_at: refundedAt, refund_reason: reasonText })
        .where(and(eq(iapTransaction.txn_id, txnId), isNull(iapTransaction.refunded_at)))
        .returning({ txn_id: iapTransaction.txn_id });
      if (claimRows.length === 0) {
        return false; // lost the race — someone else refunded this txn between our SELECT and here.
      }
      if (restoreInGame) {
        const sku = findIapSku(txn.sku);
        const marksGranted = sku?.resolveMarksGranted?.() ?? 0;
        if (marksGranted > 0) {
          const debited = await this.walletRepo.clampedDebitForRefund(tx, txn.player_id, marksGranted);
          if (debited) {
            marksRemoved = debited.actualDelta;
            if (marksRemoved > 0) {
              await this.ledgerRepo.insert(tx, { playerId: txn.player_id, deltaMarks: -marksRemoved, reasonSku: txn.sku });
            }
          }
        }
      }
      return true;
    });
    if (!claimed) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `Transaction ${txnId} was already refunded (concurrent request).` });
    }

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'iap_transactions',
      targetEntityId: txnId,
      targetPlayerId: txn.player_id,
      beforeState: { refunded_at: null },
      afterState: { refunded_at: refundedAt.toISOString(), restore_in_game: restoreInGame, marks_removed: marksRemoved, reason_code: reasonCode, reason_text: reasonText ?? null },
    });

    return { txn_id: txnId, refunded_at: refundedAt.toISOString(), marks_removed: marksRemoved };
  }
}

interface IapHistoryItemView {
  txn_id: string;
  player_id: string;
  sku: string;
  amount_cents: string;
  currency_code: string;
  platform: string;
  platform_receipt: string;
  purchased_at: Date;
  refunded_at: Date | null;
  refund_reason: string | null;
}
