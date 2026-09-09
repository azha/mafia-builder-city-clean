// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 6 (C6) + Task 7 (C7) + Task 8 (C8)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.1 (:46-52)
//             — Forensic C6 + C7 — 2026-06-19
//
// `LeadingDigitAuditService` — §5.1 Benford's Law ring-buffer service.
//
// C6 scope (recordReceipt):
//   recordReceipt(playerId, frontId, amountCents): Promise<void>
//     — push firstDigit(amountCents) into ledger_entry_ring.ring (FIFO, bounded by
//       benfordRingBufferLength = 64); advance ring_head; lazy-create the ring row
//       if absent (UPSERT pattern, idempotent).
//       EMISSION ONLY: the laundering throughput / declared baseline / every return value
//       of the calling service is BYTE-IDENTICAL (the laundering seam is not touched).
//
// C7 scope (computeChiSquare + runWeeklyAuditTick):
//   computeChiSquare(ring: number[]): number
//     — PURE: χ² statistic over the ring histogram.
//       DECISION DD-CHISQUARE-N (user 2026-06-19): CLASSICAL PEARSON χ² (×N) implemented.
//       Formula: χ² = Σ_d (hist[d] − N·reference[d])² / (N·reference[d])   for d ∈ 1..9
//       where hist[d] = count of entries with first digit d, N = ring.length,
//       reference[d] = BENFORD_REFERENCE[d-1].
//       Guard N=0 → return 0. No DB, no Math.random.
//       NOTE: canon §5.1 (:49) writes the PROPORTION form (hist[d]/N − reference[d])²/reference[d],
//       but that formula gives a UNIFORM ring (7×each digit, N=63) χ²≈0.40 — it NEVER fires H∈8..24.
//       The classical Pearson (×N) gives the same UNIFORM ring χ²≈25.3 → fires H=14 correctly.
//       The canon proportion form will be annotated at C26 closeout to note the ×N normalization.
//
//   runWeeklyAuditTick(ctx, weekId): Promise<void>
//     — WEEKLY/9; iterates all rings for the player; idempotent per-ring on last_audit_tick (OQ-7);
//       stamps last_chi_square; if χ² > benfordChi2ThresholdH → soft_flag_count++.
//       No-op if 0 rings (zero-regression invariant §1.3).
//       NOTE: event emit + BPD-memory dual-write land at C8 — NOT here.
//
// C9 scope (triggerHardAudit + production caller wiring in recordSoftFlag):
//   triggerHardAudit(playerId, frontId, currentTick): Promise<void> — 3-in-60d seizure + dark.
//     (0) single-fire guard — read front_dark_until_tick; if non-null AND >= currentTick → no-op.
//     (a) cash-clear seizure — debit floor(cash_cents * hardAuditSeizurePct) via §4.1 pattern.
//     (b) set front_dark_until_tick horizon + reset soft_flag_count = 0.
//   recordSoftFlag wired at C9: after UPSERT, if countSoftFlagsInWindow(...) >= count → triggerHardAudit.
//
// Anti-fabrication: NO Math.random in this file (banned — market-rng.service.ts:24).
//   darkWeeks lives in forensic-constants.ts (also Math.random-free).
// Zero-regression invariant (§1.3): recordReceipt is purely ADDITIVE — never mutates
//   laundering_nodes, tail_risk_estimates, economy_states, or any laundering return value.
//   runWeeklyAuditTick is a no-op on a fresh world (no ring rows → returns immediately).
// OQ-7: idempotent per-ring on last_audit_tick — same weekId twice → exactly one increment.
// OQ-10: the ring stores first-digits 1..9 (NOT raw amounts); sufficient for χ².
// R2.2: last_chi_square is stamped in DB (server-only); never returned to a client projection.
//
// Implementation note (FIFO JSONB approach):
//   We use a single `db.execute(sql`...`)` for the UPSERT+append because Drizzle-ORM's
//   column-reference interpolation in `.set({...})` can pass column references as parameterized
//   scalar values when used in SQL function calls (jsonb_array_length, jsonb_set), causing
//   PG "cannot get array length of a scalar" errors. The raw `execute` approach mirrors
//   patrol.repository.ts:171 (the codebase's precedent for complex JSONB SQL).

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { ledgerEntryRing, forensicSoftFlagRing } from '../../db/schema/forensic';
import { building } from '../../db/schema/city_state';
import { economyState } from '../../db/schema/player_economy_state';
import { BENFORD_REFERENCE, firstDigit, darkWeeks } from './forensic-constants';
import { forensicTunables } from './forensic-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { PoliceMemoryService } from '../../citysim/police_memory/police_memory.service';
import { ForensicRepository } from './forensic.repository';
import { BookkeeperLieutenantService } from './bookkeeper-lieutenant.service';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { bandFromChiSquare } from './forensic-severity';
import { ApiError } from '../../protocol/api-error';

/** Severity for the 'forensic_benford_soft_flag' declaration entry (OQ-4, C8). Mid-range bucket 0-100. */
const FORENSIC_SOFTFLAG_SEVERITY = 50;

/**
 * W6a C2 (D3.c) — true iff a thrown DB error is the ownership-immutability trigger violation
 * (migration 0142, custom SQLSTATE 'OW001' — NOT the built-in unique_violation 23505). Mirrors the
 * `isUniqueViolation` idiom already established by `standing-order.service.ts` / `flag-discipline.
 * service.ts` / `degraded-category-pressure-producer.service.ts`: "each service/repository keeps its
 * own copy" — never a shared extraction. Belt-and-suspenders here (0136:6-13 posture): the app-layer
 * `WHERE …player_id = $playerId` predicate on `recordSoftFlag`'s UPSERT already makes this trigger
 * unreachable FROM THIS FILE — this catch only matters if some OTHER future write on these tables
 * forgets the predicate. Either way, D2 requires 404, never a 5xx.
 */
function isOwnershipImmutableViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === 'OW001' || err?.cause?.code === 'OW001';
}

/**
 * TEST-CANONICAL: the precinct used for declaration_ledger writes in the test harness.
 * In the E2E test, seed-ring-digits returns precinctId=TEST_PRECINCT_ID.
 * In production (C23), the precinct is derived from the front's district geography via
 * PoliceMemoryService's districtToPrecinct mapping. For C8, we use a deterministic fixed precinct.
 */
const TEST_PRECINCT_ID = 1;

@Injectable()
export class LeadingDigitAuditService {
  private readonly logger = new Logger(LeadingDigitAuditService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly policeMemory: PoliceMemoryService,
    private readonly forensicRepository: ForensicRepository,
    @Optional() private readonly bookkeeperLieutenant?: BookkeeperLieutenantService,
    @Optional() private readonly cityEventBus?: CityEventBus,
  ) {}

  /**
   * recordReceipt — push the first significant digit of `amountCents` into the FIFO ring
   * for this front (`ledger_entry_ring`). FIFO-bounded by `benfordRingBufferLength` (default 64).
   *
   * Lazy-create: if no ring row exists for (player_id, front_id), it is INSERT-ed first
   * (ring=[], ring_head=0). Then the FIFO append/overwrite is applied atomically in one SQL.
   *
   * FIFO semantics (OQ-10, plan :1048-1054):
   *   - While ring.length < capacity: append the digit to the end → ring grows linearly.
   *   - When ring.length == capacity: overwrite ring[ring_head % capacity] with the new digit
   *     (rolling overwrite); ring_head advances each write (modulo capacity).
   *
   * EMISSION ONLY: this method has NO effect on the laundering throughput, the front's declared
   * baseline, any node occupancy, or any caller return value. The call is the LAST statement
   * after the inject body in LaunderingService.inject (additive seam).
   *
   * Anti-fabrication: NO Math.random. Deterministic: same ring order for same receipt sequence.
   * Zero-regression: calling this on an empty world (no ring rows) is a no-op-equivalent
   * (inserts a new ring row, then writes to it — no existing row mutated).
   *
   * ── W6a C7 (P-A′, "propriété à la création") ────────────────────────────────────────────────
   * Migration 0142 (W6a C2) makes `ledger_entry_ring.player_id` DB-immutable post-INSERT (a
   * `BEFORE UPDATE` trigger, SQLSTATE 'OW001') — but the trigger only fires on UPDATE. The INSERT
   * itself was, pre-fix, free: `playerId` is an unverified ARGUMENT, so the FIRST caller for a
   * given `frontId` permanently fixed the ring's owner, and 0142 then froze that mistake forever
   * (a mis-attribution went from repairable to irreparable). The guard below closes the INSERT,
   * not just the UPDATE: a JOINT READ on `buildings` (the real ownership source — R9.3, ch09
   * `schema_city_state.md`) runs BEFORE any write in this method. `frontId` must resolve to a
   * `buildings` row with `player_id = playerId AND ownership = 'player'` — the SAME predicate
   * `LaunderingRepository.getOwnedOperationalFrontShop` already enforces upstream on the
   * production path (`laundering.service.ts#inject`, line ~112, called before `recordReceipt`) —
   * so this is a no-op for `laundering.inject`. It only bites illegitimate callers: the `_test`
   * route (`forensic-test.controller.ts` `POST /v1/_test/forensic/record-receipt`) takes
   * `playerId`/`frontId` straight from the request body, unrecouped (D6-Q1).
   * The guard is UNCONDITIONAL (every call, not just the lazy-create branch): the FIFO UPDATE at
   * the bottom of this method is scoped by `front_id` ALONE (no `player_id` predicate) — without
   * this guard, an ALREADY-existing ring could still be polluted by a caller supplying a
   * mismatched `playerId` after creation, even though 0142 blocks reassigning the row's own
   * `player_id` column.
   * @throws ApiError('RESOURCE_NOT_FOUND') if `frontId` is not a player-owned building for
   *         `playerId` (D2 — existence-masking convention, no new error code).
   * ─────────────────────────────────────────────────────────────────────────────────────────────
   *
   * @param playerId    - player uuid (FK for the ring row; cascade-delete on player remove).
   * @param frontId     - front building uuid (PK for the ring row — one ring per front).
   * @param amountCents - declared receipt amount in cents (the Benford input).
   */
  async recordReceipt(playerId: string, frontId: string, amountCents: number): Promise<void> {
    const rawDigit = firstDigit(amountCents);
    if (rawDigit === 0) {
      // Excluded from the histogram (amountCents ≤ 0 or non-finite — defensive guard).
      this.logger.debug(`recordReceipt: amountCents=${amountCents} → digit=0, excluded from ring (frontId=${frontId})`);
      return;
    }

    // ── W6a C7 (P-A′) — ownership-at-creation guard (see docblock above). ──
    // Joint read on `buildings` BEFORE any write: 0 rows ⇒ `frontId` is not a player-owned
    // building for `playerId` ⇒ 404 (D2), and NEITHER the lazy-create INSERT NOR the FIFO UPDATE
    // below ever run — no ring row created, no existing ring row touched.
    const [ownerRow] = await this.db
      .select({ building_id: building.building_id })
      .from(building)
      .where(
        and(
          eq(building.building_id, frontId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
        ),
      )
      .limit(1);
    if (!ownerRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `recordReceipt: front ${frontId} is not a player-owned building for player ${playerId} (W6a C7 ownership-at-creation guard).`,
      });
    }

    const capacity = Math.max(1, forensicTunables.benfordRingBufferLength);

    // ── Lazy-create the ring row if absent. ──
    // INSERT with defaults (ring='[]'::jsonb, ring_head=0); if the row already exists for
    // this front_id, the conflict is ignored — the existing row is used as-is.
    await this.db
      .insert(ledgerEntryRing)
      .values({
        front_id: frontId,
        player_id: playerId,
        // ring='[]', ring_head=0 (DB defaults).
      })
      .onConflictDoNothing();

    // ── C10: Bookkeeper noise-injection (ADDITIVE — un-protected fronts byte-unchanged). ──
    // If a BOOKKEEPER lieutenant is assigned to this front, route the digit through
    // `BookkeeperLieutenantService.injectStructurallyRealisticNoise` BEFORE the ring push.
    // The Bookkeeper shapes the digit toward the Benford distribution (deterministic, seeded
    // from frontId:ringIndex where ringIndex = current ring length before this push).
    // If no Bookkeeper is assigned (null return), use the raw first-digit (zero-regression).
    let digit = rawDigit;
    if (this.bookkeeperLieutenant) {
      // Query the current ring length to use as the deterministic seed index.
      // (The ring length before this push = the position we're writing at in the Benford sequence.)
      const [ringRow] = await this.db
        .select({ ring: ledgerEntryRing.ring, ring_head: ledgerEntryRing.ring_head })
        .from(ledgerEntryRing)
        .where(eq(ledgerEntryRing.front_id, frontId))
        .limit(1);
      const ringArr: number[] = Array.isArray(ringRow?.ring) ? (ringRow!.ring as number[]) : [];
      const ringIndex = ringArr.length; // 0-based position in the Benford sequence (before this push)

      const shapedDigit = await this.bookkeeperLieutenant.injectStructurallyRealisticNoise(
        playerId,
        frontId,
        ringIndex,
        amountCents,
      );
      if (shapedDigit !== null) {
        digit = shapedDigit;
      }
    }

    // ── Append the digit via FIFO JSONB in a single atomic UPDATE. ──
    //
    // Uses db.execute(sql`...`) — the codebase precedent for complex JSONB SQL (patrol.repository.ts:171).
    // Drizzle .set({col: sql`...`}) can mishandle jsonb column references in SQL function calls
    // (jsonb_array_length, jsonb_set) by parameterizing the column reference as a scalar, causing
    // PG "cannot get array length of a scalar" errors. The raw execute approach avoids this.
    //
    // FIFO logic in SQL:
    //   CASE WHEN jsonb_array_length(ring) < capacity
    //     THEN ring || to_jsonb(digit)                         -- (A) append: ring grows
    //     ELSE jsonb_set(ring, ARRAY[(ring_head % capacity)::text], to_jsonb(digit))  -- (B) overwrite
    //   END
    //
    //   ring_head advances:
    //   CASE WHEN jsonb_array_length(ring) < capacity
    //     THEN jsonb_array_length(ring) + 1                    -- (A) head points after new last
    //     ELSE (ring_head + 1) % capacity                      -- (B) advance modulo capacity
    //   END
    //
    // Both column references (ring, ring_head) are the LIVE column values at UPDATE time.
    // Parameters ($1..$4) are passed as bind params (no string interpolation).

    await this.db.execute(sql`
      UPDATE ${ledgerEntryRing}
      SET
        ring = CASE
          WHEN jsonb_array_length(ring) < ${capacity}
          THEN ring || to_jsonb(${digit}::int)
          ELSE jsonb_set(ring, ARRAY[((ring_head % ${capacity})::text)], to_jsonb(${digit}::int))
        END,
        ring_head = CASE
          WHEN jsonb_array_length(ring) < ${capacity}
          THEN jsonb_array_length(ring) + 1
          ELSE (ring_head + 1) % ${capacity}
        END
      WHERE front_id = ${frontId}::uuid
    `);

    this.logger.debug(`recordReceipt: frontId=${frontId} digit=${digit} amountCents=${amountCents}`);
  }

  // ── C7: computeChiSquare + runWeeklyAuditTick ────────────────────────────────────────────────

  /**
   * computeChiSquare — compute the χ² statistic for a ring of leading digits.
   *
   * PURE: no DB, no Math.random, no side effects. Identical output for identical input.
   *
   * ── DD-CHISQUARE-N (user decision 2026-06-19) ──────────────────────────────────────────────
   * Canon §5.1 (:49) writes the PROPORTION formula:
   *   χ² = Σ_d (hist[d]/N − reference[d])² / reference[d]
   * BUT this proportion form is broken for detecting uniformity-smoothing:
   *   A genuinely uniform ring (7×each digit, N=63) gives χ²≈0.40 — it NEVER fires H∈8..24.
   *   The intent (canon §5.1: detect books "smoothed toward uniformity") requires a formula
   *   that IS sensitive to total deviation, not just frequency-normalized deviation.
   *
   * IMPLEMENTED: CLASSICAL PEARSON χ² (×N):
   *   χ² = Σ_d (hist[d] − N·reference[d])² / (N·reference[d])     for d ∈ 1..9
   *
   * This equals N × the canon proportion expression. Calibration with realistic fixtures:
   *   UNIFORM (7×each digit 1..9, N=63): χ² ≈ 25.3  → fires H=14.0  (cheat detected ✓)
   *   BENFORD-CONFORM (proportional, N=63): χ² ≈ 0.069 → no fire      (honest ring ✓)
   *   PARTIAL (50%-smoothed, N=50):         χ² ≈ 6.1  → no fire      (sensible monotone ✓)
   *
   * The canon §5.1 proportion form will be annotated at C26 closeout to note the ×N
   * normalization; this file must NOT be changed at that time (it is already correct).
   * ───────────────────────────────────────────────────────────────────────────────────────────
   *
   * Guard: N=0 → return 0 (no data, no chi-square).
   *
   * Anti-fabrication: uses BENFORD_REFERENCE (forensic-constants.ts) — NOT inline magic.
   *
   * @param ring - array of leading digits 1..9 (the ledger_entry_ring.ring JSONB column).
   * @returns χ² statistic (0 if ring is empty).
   */
  computeChiSquare(ring: number[]): number {
    const N = ring.length;
    if (N === 0) return 0;

    // Build histogram: hist[d] for d ∈ 1..9 (index 0 = digit 1, ... index 8 = digit 9).
    const hist = new Array<number>(9).fill(0);
    for (const d of ring) {
      if (d >= 1 && d <= 9) {
        hist[d - 1]++;
      }
    }

    // Classical Pearson χ² (×N) — DD-CHISQUARE-N (2026-06-19).
    // χ² = Σ_d (hist[d] − N·reference[d])² / (N·reference[d])   for d ∈ 1..9
    // = N × [proportion form] — sensitive to absolute deviation from Benford expectations.
    let chi2 = 0;
    for (let i = 0; i < 9; i++) {
      const expected = N * BENFORD_REFERENCE[i]; // N · reference[d]
      const diff = hist[i] - expected;           // observed count − expected count
      chi2 += (diff * diff) / expected;
    }

    return chi2;
  }

  /**
   * runWeeklyAuditTick — WEEKLY/9 Benford's Law χ² audit tick.
   *
   * Iterates all ledger_entry_ring rows for ctx.playerId.
   * For each ring:
   *   1. Skip if last_audit_tick === weekId (idempotent per-ring, OQ-7).
   *   2. Deserialize ring array from JSONB.
   *   3. Compute χ² via computeChiSquare(ring).
   *   4. Stamp last_chi_square = χ² and last_audit_tick = weekId.
   *   5. If χ² > benfordChi2ThresholdH → soft_flag_count++.
   *
   * No-op: if the player has 0 rings → returns immediately (zero-regression, §1.3).
   *
   * NOTE: event emit (ForensicSoftFlagDetected) + BPD-memory dual-write land at C8 — NOT here.
   *       Hard-audit cascade lands at C9 — NOT here.
   *
   * OQ-7: idempotent per-ring on last_audit_tick. Same weekId twice → one increment (not two).
   * R2.2: last_chi_square stamped server-side; never returned to a client projection.
   * Anti-fabrication: NO Math.random. Game-time from ctx.gameMinute + weekId arg (never Date.now()).
   *
   * @param ctx    - the CitySimTickContext (provides playerId + gameMinute; cadence=WEEKLY).
   * @param weekId - integer week identifier (floor(gameMinute / WEEKLY_MINUTES)).
   */
  async runWeeklyAuditTick(ctx: CitySimTickContext, weekId: number): Promise<void> {
    // 1. Select all rings for this player.
    const rings = await this.db
      .select()
      .from(ledgerEntryRing)
      .where(eq(ledgerEntryRing.player_id, ctx.playerId));

    if (rings.length === 0) {
      // Zero-regression: no rings → no-op.
      this.logger.debug(`runWeeklyAuditTick: playerId=${ctx.playerId} weekId=${weekId} — no rings, no-op`);
      return;
    }

    const H = forensicTunables.benfordChi2ThresholdH;
    const weekIdBigInt = BigInt(weekId);

    for (const ring of rings) {
      // 2. Idempotent per-ring guard (OQ-7): skip if already processed this week.
      if (ring.last_audit_tick !== null && ring.last_audit_tick === weekIdBigInt) {
        this.logger.debug(
          `runWeeklyAuditTick: frontId=${ring.front_id} weekId=${weekId} — already audited, skip (OQ-7)`,
        );
        continue;
      }

      // 3. Deserialize ring array from JSONB.
      //    Drizzle returns JSONB columns as the parsed JS value (number[] for our ring).
      //    Cast defensively to handle both number[] and null/undefined.
      const ringArr: number[] = Array.isArray(ring.ring) ? (ring.ring as number[]) : [];

      // 4. Compute χ² (PURE — no DB, no RNG).
      const chi2 = this.computeChiSquare(ringArr);

      // 5. Determine if this ring fires the soft-flag.
      const fires = chi2 > H;

      // 6. Stamp last_chi_square + last_audit_tick; if fires → soft_flag_count++ AND dual-write (C8).
      //    Use db.execute(sql`...`) for the atomic UPDATE (mirrors the FIFO JSONB precedent).
      //    Drizzle .update().set() handles scalar columns correctly (no JSONB function issue).
      if (fires) {
        await this.db
          .update(ledgerEntryRing)
          .set({
            last_chi_square: chi2,
            last_audit_tick: weekIdBigInt,
            soft_flag_count: sql`${ledgerEntryRing.soft_flag_count} + 1`,
          })
          .where(eq(ledgerEntryRing.front_id, ring.front_id));

        // C8 dual-write (DD-SOFTFLAG-DUAL): BPD memory + forensic_soft_flag_ring.
        await this.recordSoftFlag(ctx.playerId, ring.front_id, TEST_PRECINCT_ID, weekId);

        // C20 additive bus event (ADDITIVE — C8 dual-write above stays; this is cross-system notify).
        // Emit ForensicSoftFlagDetected with banded severity (bandFromChiSquare, DD-SEVERITY-BAND A).
        // The band is sourced from getters — NO inline scalar.
        this.cityEventBus?.emitForensicSoftFlagDetected({
          type: 'forensic_soft_flag_detected',
          playerId: ctx.playerId,
          frontId: ring.front_id,
          precinctId: TEST_PRECINCT_ID,
          severity: bandFromChiSquare(chi2),
          gameMinute: ctx.gameMinute,
        });

        this.logger.log(
          `runWeeklyAuditTick: frontId=${ring.front_id} weekId=${weekId} ` +
            `chi2=${chi2.toFixed(4)} > H=${H} → SOFT FLAG (soft_flag_count++ + dual-write C8)`,
        );
      } else {
        await this.db
          .update(ledgerEntryRing)
          .set({
            last_chi_square: chi2,
            last_audit_tick: weekIdBigInt,
          })
          .where(eq(ledgerEntryRing.front_id, ring.front_id));

        this.logger.debug(
          `runWeeklyAuditTick: frontId=${ring.front_id} weekId=${weekId} ` +
            `chi2=${chi2.toFixed(4)} ≤ H=${H} → no soft flag`,
        );
      }
    }
  }

  // ── C8: recordSoftFlag — DD-SOFTFLAG-DUAL dual-write (BPD memory + forensic_soft_flag_ring) ───

  /**
   * recordSoftFlag — dual-write on a soft-flag fire (DD-SOFTFLAG-DUAL, OQ-4).
   *
   * Called from `runWeeklyAuditTick` when χ² > H for a ring. Writes BOTH:
   *   (a) Windowed ring — `forensic_soft_flag_ring.flag_ticks` via JSONB UPSERT.
   *       Appends `tick` (the weekId) and prunes entries older than `benfordHardAuditWindowDays`
   *       game-days. Prune condition: (tick − flagTick) * 7 > benfordHardAuditWindowDays.
   *       This is the OQ-4 3-in-60d windowed counter used by C9 hard-audit trigger.
   *       It is SEPARATE from `soft_flag_count` (which is cumulative and does NOT prune).
   *       W6a C2: this write is OWNERSHIP-GATED and runs FIRST (see below) — everything else is
   *       downstream of it passing.
   *   (b) BPD memory — `declaration_ledger` via PoliceMemoryService.appendDeclarationEntry
   *       with declaration_type='forensic_benford_soft_flag'. REUSE System 3 — do NOT rebuild.
   *       The entry uses building_id=0 (city-wide channel), severity=50 (mid-range), frontId as
   *       source_origin_id, and tick*WEEKLY_MINUTES as written_at (game-time, never Date.now()).
   *
   * OQ-4 rationale: `declaration_ledger` prunes/decays independently and isn't a reliable 60-day
   * window counter. The `forensic_soft_flag_ring.flag_ticks` array IS the authoritative counter.
   *
   * Idempotent: protected by runWeeklyAuditTick's OQ-7 `last_audit_tick` guard on the ORGANIC path
   * (one call per ring per weekId). `ForensicAdminController.forceSoftFlag` and the W6a C2 ownership
   * guard below add a SECOND, non-organic caller with attacker-controlled `frontId` — see below.
   *
   * Anti-fabrication: NO Math.random. Game-time = tick * WEEKLY_MINUTES (game-minutes, not Date.now()).
   * Zero-regression: a world with no rings → runWeeklyAuditTick returns early → this is never called.
   *
   * W6a C2 (D3.b) — OWNERSHIP GUARD: `frontId` may already have a `forensic_soft_flag_ring` row owned by
   * a DIFFERENT player (the organic tick path never hits this — `ring.front_id` is always already scoped
   * to `ctx.playerId` — but `ForensicAdminController.forceSoftFlag` and any other caller MAY pass a
   * mismatched pair). The (a) UPSERT below never reattributes: a mismatched owner throws
   * `ApiError('RESOURCE_NOT_FOUND')` (404, D2) BEFORE the BPD-memory write, and before any hard-audit
   * cascade — "0 ligne affectée ⇒ 404, aucune donnée touchée" (D3.b) holds for the WHOLE method, not
   * just the ring row.
   *
   * @param playerId   - player uuid.
   * @param frontId    - front building uuid (FK for forensic_soft_flag_ring; source_origin_id for declaration).
   * @param precinctId - target precinct for the declaration_ledger write (1..precinctCount).
   * @param tick       - the weekId (game-week integer); used as the flag tick value + for pruning.
   * @throws ApiError('RESOURCE_NOT_FOUND') if `frontId` is owned by a player other than `playerId` (W6a C2).
   */
  async recordSoftFlag(
    playerId: string,
    frontId: string,
    precinctId: number,
    tick: number,
  ): Promise<void> {
    const windowDays = forensicTunables.benfordHardAuditWindowDays; // 60 days (default)
    const WEEKLY_MINUTES = 7 * 24 * 60; // 10080 game-minutes per in-game week
    const gameMinute = tick * WEEKLY_MINUTES; // game-time for written_at (NOT Date.now())

    // (a) Windowed ring write — UPSERT forensic_soft_flag_ring.flag_ticks.
    //     Append tick; prune entries older than windowDays game-days.
    //     Prune: keep ticks where (tick − flagTick) * 7 ≤ windowDays.
    //     Equivalently: flagTick >= tick − floor(windowDays / 7).
    //     Uses raw SQL to atomically read-modify-write the JSONB array (mirrors FIFO JSONB precedent).
    //
    // W6a C2 (D3.b, D1 raison 2) — ORDERING: this ownership-gated write now runs FIRST, ahead of the BPD
    // memory write (b). D3.b's own framing is "0 ligne affectée ⇒ 404. Aucune donnée touchée, aucun
    // oracle" — that only holds if NOTHING is written before the guard is checked. Pre-C2 this ran
    // second; keeping that order would let a mismatched-owner call still land a `declaration_ledger`
    // entry (b) before failing here, which is a write the guard was supposed to prevent.
    const windowWeeks = Math.floor(windowDays / 7); // e.g. floor(60/7) = 8 weeks
    const cutoffTick = tick - windowWeeks;           // prune ticks < cutoffTick

    // UPSERT: on first fire for this front, INSERT the row; on subsequent fires, append+prune.
    // ON CONFLICT references `forensic_soft_flag_ring.flag_ticks` (the existing row's column).
    // `jsonb_array_elements` returns one row per element; `elem::int` casts to integer for comparison.
    // COALESCE guards against jsonb_agg returning NULL (empty result after full prune → use '[]').
    //
    // `player_id` is REMOVED from the UPDATE branch's SET — it is written ONLY once, by the INSERT
    // branch, on row creation. The UPDATE branch is additionally gated on
    // `WHERE forensic_soft_flag_ring.player_id = $playerId`: a front owned by a DIFFERENT player yields
    // ZERO affected rows (Postgres leaves the conflicting row untouched — no exception, just no match) —
    // never a reattribution. `RETURNING front_id` turns "0 rows" into a directly-observable signal, read
    // via the SAME defensive dual-shape idiom as `forensic.repository.ts#countSoftFlagsInWindow` /
    // `exceptions.repository.ts#hasPendingForBuilding` (PG driver returns either `{ rows: [...] }` or a
    // bare array depending on version).
    let upsertResult: unknown;
    try {
      upsertResult = await this.db.execute(sql`
        INSERT INTO ${forensicSoftFlagRing} (front_id, player_id, flag_ticks)
        VALUES (
          ${frontId}::uuid,
          ${playerId}::uuid,
          ${JSON.stringify([tick])}::jsonb
        )
        ON CONFLICT (front_id) DO UPDATE
          SET
            flag_ticks = COALESCE(
              (
                SELECT jsonb_agg(elem)
                FROM jsonb_array_elements(
                  ${forensicSoftFlagRing}.flag_ticks || ${JSON.stringify([tick])}::jsonb
                ) AS elem
                WHERE elem::int >= ${cutoffTick}
              ),
              '[]'::jsonb
            )
          WHERE ${forensicSoftFlagRing}.player_id = ${playerId}::uuid
        RETURNING front_id
      `);
    } catch (e) {
      if (isOwnershipImmutableViolation(e)) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `recordSoftFlag: front ${frontId} is not owned by player ${playerId} (W6a C2 ownership guard, DB-enforced, migration 0142)`,
        });
      }
      throw e;
    }
    const upsertRows =
      (upsertResult as unknown as { rows?: { front_id: string }[] }).rows ??
      (upsertResult as unknown as { front_id: string }[]);
    if (!Array.isArray(upsertRows) || upsertRows.length === 0) {
      // 0 rows ⇒ front_id exists but is owned by a DIFFERENT player (D3.b — the WHERE predicate excluded
      // it). D2: object-level refusal is 404 RESOURCE_NOT_FOUND (existence-masking convention) — never a
      // new `*_NOT_OWNED` code (that would recreate the oracle in the `code` field of the envelope).
      // Thrown BEFORE the BPD memory write below — no data touched on the rejected path (D3.b).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `recordSoftFlag: front ${frontId} is not owned by player ${playerId} (W6a C2 ownership guard)`,
      });
    }

    // (b) BPD memory write — REUSE System 3's appendDeclarationEntry (PoliceMemoryService).
    //     DeclarationType: 'forensic_benford_soft_flag' (NEW bare-string value, R9.3 backported).
    //     Reached only once the ownership guard (a) has passed.
    await this.policeMemory.appendDeclarationEntry(
      playerId,
      precinctId,
      'forensic_benford_soft_flag',
      FORENSIC_SOFTFLAG_SEVERITY,
      frontId,
      gameMinute,
    );

    this.logger.log(
      `recordSoftFlag: playerId=${playerId} frontId=${frontId} tick=${tick} ` +
        `precinctId=${precinctId} windowDays=${windowDays} cutoffTick=${cutoffTick} ` +
        `→ dual-write: flag_ticks + declaration_ledger (forensic_benford_soft_flag)`,
    );

    // ── C9: hard-audit cascade production wiring ────────────────────────────────────────────────
    // After the UPSERT, check if the windowed flag count >= threshold.
    // flag_ticks are weekIds; gameMinute = tick * WEEKLY_MINUTES is the current game-tick.
    const softflagsCount = await this.forensicRepository.countSoftFlagsInWindow(
      frontId,
      gameMinute,
      forensicTunables.benfordHardAuditWindowDays,
    );
    if (softflagsCount >= forensicTunables.benfordHardAuditSoftflagsCount) {
      await this.triggerHardAudit(playerId, frontId, gameMinute);
    }
  }

  // ── C9: triggerHardAudit — 3-in-60d seizure + front dark (DD-FLAGTICK-UNIT) ─────────────────

  /**
   * triggerHardAudit — hard-audit cascade: cash seizure + front dark.
   *
   * Implements DD-FLAGTICK-UNIT + DD-SEIZURE-MAGNITUDE decisions (adjudicated, do NOT re-open).
   *
   * (0) Single-fire guard: read `ledger_entry_ring.front_dark_until_tick`; if non-null AND
   *     `>= currentTick` → the front is already dark → no-op return.
   * (a) Cash-clear seizure (DD-SEIZURE-MAGNITUDE):
   *     - Read the player's current `economy_states.cash_cents` wallet.
   *     - `seized = floor(Number(cash_cents) * forensicTunables.hardAuditSeizurePct)`.
   *     - The fraction SOURCES `T.forensic.hard_audit_seizure_pct` getter (default 0.25, [PROV-Y26Q2]).
   *       NEVER an inline scalar.
   *     - Debit via the §4.1-mirror UPDATE (cash_cents >= seized guard prevents negative balance):
   *         `UPDATE economy_states SET cash_cents = cash_cents − seized WHERE player_id=? AND cash_cents>=seized`.
   *     - Zero wallet → seized = 0 → no-op debit; the front still goes dark.
   * (b) Set `front_dark_until_tick = currentTick + darkWeeks(frontId, currentWeekId, min, max) * WEEKLY_MINUTES`.
   *     `darkWeeks` is deterministic (djb2 hash of `${frontId}:${currentWeekId}`) — no Math.random.
   *     Reset `soft_flag_count = 0` (schema comment :150).
   *     Log `triggerHardAudit fired front=…`.
   *
   * Caller: `recordSoftFlag` (after UPSERT; if countSoftFlagsInWindow >= benfordHardAuditSoftflagsCount).
   * Also callable directly from the `_test` route at C9 (`trigger-hard-audit-check`).
   *
   * W6a C3 (P-A, the "pire finding") — `frontId` is REMOVED as an independent source of authority.
   * Pre-fix, this method read on TWO keys that never met: the single-fire guard on `front_id` alone,
   * the wallet + debit on `player_id` alone — so `(victime, monPropreFront)` seized 25% of the
   * victim's cash while only ever touching the ATTACKER's own front. The fix is the joint read below
   * (`front_id = ? AND player_id = ?`, one round-trip): a front NOT owned by `playerId` yields 0 rows
   * ⇒ 404 `RESOURCE_NOT_FOUND` (D2), BEFORE the wallet is ever read. A guard of the shape
   * `if (front.player_id !== playerId) throw` would have left the couple itself expressible — the
   * joint predicate makes it inexpressible instead (design §2).
   *
   * Anti-fabrication: NO Math.random. No inline scalars.
   * Zero-regression: the front-dark write is additive on ledger_entry_ring (no laundering table touched).
   *
   * @param playerId    - player uuid. Must be the ACTUAL owner of `frontId` (W6a C3 joint read).
   * @param frontId     - front building uuid (PK of ledger_entry_ring + forensic_soft_flag_ring).
   * @param currentTick - current game-tick (game-minute). MUST be a game-tick, NOT a weekId.
   * @throws ApiError('RESOURCE_NOT_FOUND') if `frontId` is not owned by `playerId` (W6a C3).
   */
  async triggerHardAudit(playerId: string, frontId: string, currentTick: number): Promise<void> {
    const WEEKLY_MINUTES = 7 * 24 * 60; // 10080 game-minutes per in-game week

    // (0) W6a C3 (P-A) — joint read, single round-trip: `front_id = ? AND player_id = ?`. 0 rows ⇒
    // the front doesn't exist OR belongs to a DIFFERENT player ⇒ 404, BEFORE any wallet read (the
    // whole point of the joint predicate — see docblock above).
    const [ringRow] = await this.db
      .select({ front_dark_until_tick: ledgerEntryRing.front_dark_until_tick })
      .from(ledgerEntryRing)
      .where(and(eq(ledgerEntryRing.front_id, frontId), eq(ledgerEntryRing.player_id, playerId)))
      .limit(1);

    if (!ringRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `triggerHardAudit: front ${frontId} is not owned by player ${playerId} (W6a C3 ownership guard)`,
      });
    }

    if (ringRow.front_dark_until_tick != null) {
      // front_dark_until_tick is a BigInt (bigint column mode 'bigint').
      if (BigInt(ringRow.front_dark_until_tick) >= BigInt(currentTick)) {
        // Front is already dark — no-op (single-fire guard, closes C9-direct + C22-routed double-path hazard).
        this.logger.debug(
          `triggerHardAudit: front=${frontId} already dark until tick=${ringRow.front_dark_until_tick} ` +
            `(currentTick=${currentTick}) — single-fire guard engaged, no-op`,
        );
        return;
      }
    }

    // (a) Cash-clear seizure (DD-SEIZURE-MAGNITUDE).
    //     Read the player's cash_cents wallet (economy_states).
    const [walletRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);

    if (walletRow) {
      // seized = floor(Number(cash_cents) * hardAuditSeizurePct) — fraction from getter (never inline scalar).
      const seized = Math.floor(Number(walletRow.cash_cents) * forensicTunables.hardAuditSeizurePct);

      if (seized > 0) {
        // Debit via §4.1-mirror pattern: cash_cents >= seized guard prevents negative balance.
        // 0-rows returned ⇒ insufficient cash (zero wallet edge case) → no debit, front still dark.
        await this.db
          .update(economyState)
          .set({ cash_cents: sql`${economyState.cash_cents} - ${BigInt(seized)}` })
          .where(
            sql`${economyState.player_id} = ${playerId}::uuid AND ${economyState.cash_cents} >= ${BigInt(seized)}`,
          )
          .returning({ cash_cents: economyState.cash_cents });
      }
      // seized == 0 (zero wallet) → no-op debit; the front still goes dark below.
    }

    // (b) Set front_dark_until_tick horizon + reset soft_flag_count = 0.
    const currentWeekId = Math.floor(currentTick / WEEKLY_MINUTES);
    const darkW = darkWeeks(
      frontId,
      currentWeekId,
      forensicTunables.frontDarkWeeksMin,
      forensicTunables.frontDarkWeeksMax,
    );
    const darkHorizon = currentTick + darkW * WEEKLY_MINUTES; // game-tick horizon

    // W6a C3 — belt-and-suspenders: `playerId` is already proven the owner by the joint read at (0)
    // above, but this UPDATE re-states the predicate rather than trusting `frontId` alone a second
    // time (the exact "two arguments non recoupés" shape the guard exists to close).
    await this.db
      .update(ledgerEntryRing)
      .set({
        front_dark_until_tick: BigInt(darkHorizon),
        soft_flag_count: 0,
      })
      .where(and(eq(ledgerEntryRing.front_id, frontId), eq(ledgerEntryRing.player_id, playerId)));

    this.logger.log(
      `triggerHardAudit fired front=${frontId} playerId=${playerId} currentTick=${currentTick} ` +
        `darkWeeks=${darkW} horizon=${darkHorizon} (currentWeekId=${currentWeekId}) ` +
        `hardAuditSeizurePct=${forensicTunables.hardAuditSeizurePct}`,
    );
  }
}
