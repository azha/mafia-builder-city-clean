// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C3 (la chaîne
//             d'enforcement ch13 : proposition → approbation par un second → exécution)
//             Canon: docs/tech/13_anti_exploit_balance/enforcement_actions.md §7 (EnforcementAction)
//             Schema: db/schema/anti_cheat.ts (`enforcementActionRow`, migration 0011).
//             -- W1.2-a C3 — 2026-09-02 --
//
// `EnforcementActionRepository` — the ONLY writer of `enforcement_action` this lot adds. The table is
// APPEND-ONLY at the PRIVILEGE layer (`0011:87`, `REVOKE UPDATE, DELETE … FROM PUBLIC` — re-enforced at
// runtime by `app_rw`'s own grants, `0013`): this repository therefore exposes INSERT + read only, no
// update/delete method exists to expose in the first place (structural, not a discipline anyone has to
// remember — same shape as `AdminAuditLogService`, the codebase's other append-only writer).
//
// A PLAIN Drizzle fluent `.insert(...).values(...).returning()` — no guarded-write / ON CONFLICT idiom
// needed here (unlike `two-person-approval.repository.ts` or `cheat-flag.repository.ts`'s sibling in
// this same lot): `enforcement_action` carries no UNIQUE constraint this write path could collide with,
// and by construction (`EnforcementActionService`, this lot's C3) a row is inserted EITHER immediately
// (WARN) OR only after `TwoPersonApprovalService.consume()` has already succeeded (BAN/SUSPEND) — there
// is nothing left to guard against at the SQL layer.
//
// `executor?: EnforcementTx` + `(executor ?? this.db)` — `friction-budget.repository.ts:87,184,296,335,
// 367` / `two-person-approval.repository.ts:19-21` (`db` is pool-backed, `db/index.ts:30`; a repository
// that opens its OWN transaction cannot join an ambient one). Load-bearing here: `EnforcementActionService
// #execute` threads the SAME `tx` through BOTH `TwoPersonApprovalService.consume()` and this repository's
// `insert()`, so "consume the approval" and "write the sanction" commit or roll back TOGETHER (§12 C3:
// "consume() PUIS enforcement_action, two_person_approval_id renseigné" — never two separate writes a
// crash between them could split).

import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { enforcementActionRow, type EnforcementActionRow, type EnforcementActionTypeEnumTs } from '../../db/schema/anti_cheat';
import type { AntiCheatTx } from '../cheat_flag/cheat-flag.repository';

/** Re-exported under this file's own name (byte-identical type — `Parameters<Parameters<DrizzleClient
 *  ['transaction']>[0]>[0]`, the SAME shape every `*Tx` alias in this codebase extracts, never guessed)
 *  so a caller of THIS repository never has to know the type actually lives in the `cheat_flag` sibling
 *  file — both are literally `Parameters<Parameters<DrizzleClient['transaction']>[0]>[0]`, so this is a
 *  documentation-only distinction, not a runtime one. */
export type EnforcementTx = AntiCheatTx;

/** One `enforcement_action` row to insert. Field names mirror `anti_cheat.ts`'s column doc comments. */
export interface EnforcementActionInsert {
  readonly targetPlayerId: string;
  readonly actionEnum: EnforcementActionTypeEnumTs;
  /** Soft-ref `CheatFlag.cheat_flag_id`, nullable — a manual WARN with no automated source (`anti_cheat.
   *  ts:64`, "nullable — warn manuel"). */
  readonly sourceSignalId: string | null;
  /** The acting staff account — ALWAYS the caller's own `req.account!.account_id` (never a body field,
   *  R-ID-3). For BAN/SUSPEND this is necessarily the two-person INITIATOR (§12 C3: "l'exécution revient
   *  à l'initiateur" — `TwoPersonApprovalRepository.consumeAtomic`'s own `initiator_account_id = …` guard
   *  is what makes this true structurally, not a check this repository re-implements). */
  readonly staffId: string;
  readonly beforeState: Record<string, unknown>;
  readonly afterState: Record<string, unknown>;
  /** Populated ONLY on the two-person path (BAN/SUSPEND, after `consume()`); `null` for a direct WARN
   *  (no approval was ever requested for it — §11, WARN is NON two-person). */
  readonly twoPersonApprovalId: string | null;
  readonly ticketRef: string | null;
}

@Injectable()
export class EnforcementActionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async insert(input: EnforcementActionInsert, executor?: EnforcementTx): Promise<EnforcementActionRow> {
    const db = executor ?? this.db;
    const [row] = await db
      .insert(enforcementActionRow)
      .values({
        target_player_id: input.targetPlayerId,
        action_enum: input.actionEnum,
        source_signal_id: input.sourceSignalId,
        staff_id: input.staffId,
        before_state: input.beforeState,
        after_state: input.afterState,
        two_person_approval_id: input.twoPersonApprovalId,
        ticket_ref: input.ticketRef,
      })
      .returning();
    return row;
  }

  /** `GET /v1/admin/anticheat/enforcement?playerId=` (§12 C3) — this player's enforcement history,
   *  newest first. BO-only / `admin` role (route-level guard) — no P5 narrowing needed (R2.2 governs
   *  PLAYER-facing surfaces; this one never reaches a player). */
  async listByPlayer(targetPlayerId: string, executor?: EnforcementTx): Promise<EnforcementActionRow[]> {
    const db = executor ?? this.db;
    return db
      .select()
      .from(enforcementActionRow)
      .where(eq(enforcementActionRow.target_player_id, targetPlayerId))
      .orderBy(desc(enforcementActionRow.created_at));
  }
}
