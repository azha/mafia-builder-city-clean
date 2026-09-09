// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C3-bis (l'appel, côté
//             JOUEUR) + ch09 `docs/tech/09_data_model/schema_anti_cheat.md §9.1` (routes + composite).
//             Schema: db/schema/anti_cheat.ts (`appealCaseRow`, migration 0011 — `UNIQUE
//             (enforcement_action_id)`, "un seul appel par sanction").
//             -- W1.2-a C3-bis — 2026-09-02 --
//
// `AppealCaseRepository` — the ONLY writer of `appeal_case` this lot adds. Two disciplines, both IDOR
// discipline (§12 C3-bis's ⛔): the guarded INSERT below only creates a row when the referenced
// `enforcement_action` BELONGS to the calling player (`WHERE EXISTS (... AND target_player_id = …)`
// inside the SAME guarded statement, never a pre-check-then-write pair — the SAME TOCTOU class
// `two-person-approval.repository.ts`'s own header documents), and every READ is scoped by
// `player_id` in its OWN `WHERE` — a request for someone else's `appeal_id` finds NO ROW, not a
// forbidden one (404, never 403 — `two-person-approval.controller.ts`'s own header cites the same
// discipline for a different resource: "a 403 confirmerait l'existence").
//
// Every method returns ONLY the 5-field `AppealStatusSelfProjection` (§12 C3-bis: `reason_text` /
// `decision_reason` NEVER leave this repository toward a player-facing caller — narrower than "the
// controller doesn't render them", the SELECT itself never fetches them on this path, so there is no
// value in memory to leak by a future refactor mistake).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { appealCaseRow, enforcementActionRow, type AppealOutcomeKindEnumTs, type AppealStateEnumTs } from '../../db/schema/anti_cheat';
import type { AntiCheatTx } from '../cheat_flag/cheat-flag.repository';

/** Byte-identical to `AntiCheatTx`/`EnforcementTx` — see those files' own header note on why this
 *  codebase names the SAME `Parameters<Parameters<DrizzleClient['transaction']>[0]>[0]` type once per
 *  file rather than sharing one import (established per-repository idiom, not a new one). */
export type AppealTx = AntiCheatTx;

/** ch09 `schema_anti_cheat.md §9.1`'s own composite, verbatim — the ONLY shape a player-facing appeal
 *  route ever returns (§12 C3-bis: `reason_text`/`decision_reason` excluded on EVERY route, including
 *  `GET .../:id` — see `implementation-notes.md` §Deviations D-C3bis-projection for why this narrows
 *  ch09's own prose one step further). */
export interface AppealStatusSelfProjection {
  readonly appeal_id: string;
  readonly state: AppealStateEnumTs;
  readonly submitted_at: Date;
  readonly decided_at: Date | null;
  readonly outcome: AppealOutcomeKindEnumTs | null;
}

const SELF_PROJECTION_COLUMNS = {
  appeal_id: appealCaseRow.appeal_id,
  state: appealCaseRow.state,
  submitted_at: appealCaseRow.submitted_at,
  decided_at: appealCaseRow.decided_at,
  outcome: appealCaseRow.outcome,
};

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

function mapSelfRow(r: Record<string, unknown>): AppealStatusSelfProjection {
  return {
    appeal_id: String(r['appeal_id']),
    state: r['state'] as AppealStateEnumTs,
    submitted_at: r['submitted_at'] as Date,
    decided_at: (r['decided_at'] as Date | null) ?? null,
    outcome: (r['outcome'] as AppealOutcomeKindEnumTs | null) ?? null,
  };
}

export type InsertAppealOutcome =
  | { readonly row: AppealStatusSelfProjection; readonly reason: 'ok' }
  | { readonly row: null; readonly reason: 'not_found' }
  | { readonly row: null; readonly reason: 'duplicate' };

@Injectable()
export class AppealCaseRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * `POST /v1/me/appeals` (ch09 §9.1). ONE guarded statement: the `INSERT … SELECT … WHERE EXISTS`
   * clause is BOTH the ownership check (IDOR — `enforcement_action.target_player_id = playerId`) AND
   * the write, so a caller can never distinguish "doesn't exist" from "exists, not yours" by timing or
   * by a partial write. `ON CONFLICT (enforcement_action_id) DO NOTHING` is the table's OWN
   * `appeal_case_enforcement_action_uq` (migration 0011) — "un seul appel par sanction" enforced in
   * base, never re-implemented as a pre-check.
   */
  async insertAppeal(
    playerId: string,
    enforcementActionId: string,
    reasonText: string,
    executor?: AppealTx,
  ): Promise<InsertAppealOutcome> {
    const db = executor ?? this.db;
    const result = await db.execute(sql`
      INSERT INTO ${appealCaseRow} (player_id, enforcement_action_id, reason_text)
      SELECT ${playerId}::uuid, ${enforcementActionId}::uuid, ${reasonText}
      WHERE EXISTS (
        SELECT 1 FROM ${enforcementActionRow}
        WHERE ${enforcementActionRow.enforcement_action_id} = ${enforcementActionId}::uuid
          AND ${enforcementActionRow.target_player_id} = ${playerId}::uuid
      )
      ON CONFLICT (enforcement_action_id) DO NOTHING
      RETURNING appeal_id, state, submitted_at, decided_at, outcome
    `);
    const row = rowsOf(result)[0];
    if (row) return { row: mapSelfRow(row), reason: 'ok' };

    // Disambiguate the 0-rows outcome with a PLAIN read, SCOPED THE SAME WAY (player_id in the WHERE):
    // if the action doesn't belong to this player (or doesn't exist at all), this probe ALSO finds
    // nothing — the two cases are indistinguishable from the caller's side, which is the point (404,
    // never 403). Only when the action IS this player's own does a 0-row INSERT mean "duplicate".
    const probe = await db.execute(sql`
      SELECT 1 FROM ${enforcementActionRow}
      WHERE ${enforcementActionRow.enforcement_action_id} = ${enforcementActionId}::uuid
        AND ${enforcementActionRow.target_player_id} = ${playerId}::uuid
    `);
    if (rowsOf(probe).length === 0) return { row: null, reason: 'not_found' };
    return { row: null, reason: 'duplicate' };
  }

  /** `GET /v1/me/appeals` — this player's appeals, newest first. `player_id` in the `WHERE` is the
   *  ENTIRE IDOR discipline for a list route (there is no cross-player id to smuggle in). */
  async listSelf(playerId: string): Promise<AppealStatusSelfProjection[]> {
    return this.db
      .select(SELF_PROJECTION_COLUMNS)
      .from(appealCaseRow)
      .where(eq(appealCaseRow.player_id, playerId))
      .orderBy(desc(appealCaseRow.submitted_at));
  }

  /** `GET /v1/me/appeals/:id` — `appeal_id` AND `player_id` both in the `WHERE` (IDOR): another
   *  player's `appeal_id` returns `null` here, which the service/controller turn into 404, never 403. */
  async getSelf(playerId: string, appealId: string): Promise<AppealStatusSelfProjection | null> {
    const rows = await this.db
      .select(SELF_PROJECTION_COLUMNS)
      .from(appealCaseRow)
      .where(and(eq(appealCaseRow.appeal_id, appealId), eq(appealCaseRow.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }
}
