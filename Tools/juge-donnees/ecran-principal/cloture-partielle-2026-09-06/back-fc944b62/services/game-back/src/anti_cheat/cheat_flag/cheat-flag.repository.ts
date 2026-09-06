// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C4 (the ONE writer of
//             `cheat_flag` this lot adds, on the C1 decoy-spam signal)
//             Schema: db/schema/anti_cheat.ts (`cheatFlagRow`, migration 0011) + migration 0153 (the
//             partial UNIQUE `(target_player_id, source_signal) WHERE status='QUEUED'` this repository
//             leans on — NEVER re-implemented here as a pre-check-then-write pair, same TOCTOU class
//             `two-person-approval.repository.ts`'s own header documents at length).
//             -- W1.2-a C4 — 2026-09-02 --
//
// `CheatFlagRepository` — TWO reads/writes, both scoped to the C1 decoy-spam signal:
//   - `countRecentReports`: the false/genuine counts over a REAL 30-day window on
//     `false_report_ledger.submitted_at` — ⛔ NEVER `false_report_ledger_summary` (TD-517: its
//     `window_*_count` columns are cumulative-at-life, not rolling — see this repo's own header note
//     on the file that DOES use the summary, `false-report-ledger.service.ts`, for the flood-backlash
//     mechanic, a DIFFERENT and pre-existing consumer this lot does not touch).
//   - `insertQueuedFlag`: ONE guarded `INSERT … ON CONFLICT (target_player_id, source_signal) WHERE
//     status = 'QUEUED' DO NOTHING` — idempotent by construction (§12 C4: "au plus un flag QUEUED par
//     (joueur, source_signal)"), a single statement so a 0-row outcome (an already-queued flag) can
//     never be confused with a base rejection.
//
// Precedent this file follows LITERALLY (recopied, not reformulated — CLAUDE.md):
//   - `executor?: AntiCheatTx` + `(executor ?? this.db)` — `friction-budget.repository.ts:87,184,296,
//     335,367` / `two-person-approval.repository.ts:19-21` (`db` is pool-backed, `db/index.ts:30`).
//   - the local `rowsOf` dual-shape raw-execute reader — duplicated per-file across this codebase (no
//     shared helper exists; `cue-cascade-exception-producer.service.ts#rowsOf` is the precedent every
//     later file's docstring cites, incl. `two-person-approval.repository.ts:41-45`).

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { cheatFlagRow, type CheatFlagSeverityEnumTs } from '../../db/schema/anti_cheat';
import { falseReportLedger } from '../../db/schema/false_report_ledger';

/** The Drizzle transaction-callback client type (verbatim `friction-budget.repository.ts#FrictionTx`'s
 *  own shape — extracted via `Parameters<...>`, never guessed, so it is ALWAYS exactly the type
 *  `this.db.transaction(async (tx) => …)` infers). */
export type AntiCheatTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/** Defensive dual-shape read for a raw `db.execute` result (the `cue-cascade-exception-producer.
 *  service.ts#rowsOf` idiom, duplicated per-file across this codebase — no shared helper exists). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** `C1_DECOY_SPAM`'s own report counts over the REAL 30-day window this signal is defined on
 *  (`false_report_ledger.submitted_at`, never the cumulative-at-life summary table — TD-517). */
export interface RecentReportCounts {
  readonly falseN: number;
  readonly genuineN: number;
}

@Injectable()
export class CheatFlagRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * `false_report_ledger` FALSE_REPORT/GENUINE_REPORT counts for `playerId`, `submitted_at >= now() -
   * 30 days` (the DB clock, never the Node process clock — same discipline as
   * `two-person-approval.repository.ts#decideAtomic`'s own `expires_at > now()` guard). ONE aggregate
   * query, `count(*) FILTER (...)` so both counts come from the SAME snapshot / SAME window.
   */
  async countRecentReports(playerId: string, executor?: AntiCheatTx): Promise<RecentReportCounts> {
    const db = executor ?? this.db;
    const result = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE ${falseReportLedger.entry_type} = 'FALSE_REPORT')   AS false_n,
        count(*) FILTER (WHERE ${falseReportLedger.entry_type} = 'GENUINE_REPORT') AS genuine_n
      FROM ${falseReportLedger}
      WHERE ${falseReportLedger.player_id} = ${playerId}::uuid
        AND ${falseReportLedger.submitted_at} >= now() - interval '30 days'
    `);
    const row = rowsOf(result)[0] ?? {};
    return {
      falseN: Number(row['false_n'] ?? 0),
      genuineN: Number(row['genuine_n'] ?? 0),
    };
  }

  /**
   * Idempotent QUEUE of the C1 decoy-spam flag. `ON CONFLICT (target_player_id, source_signal) WHERE
   * status = 'QUEUED' DO NOTHING` (migration 0153's own partial unique index) — a repeat offender above
   * threshold on their NEXT report does NOT add a second QUEUED row for the same signal; the review
   * queue stays one-row-per-open-case (§12 C4: "sans ça … la file de revue humaine devient
   * inutilisable"). Returns whether a NEW row was actually queued (false = an open flag already existed
   * — informational only, never an error: this write is a best-effort side-detector, never load-bearing
   * for the report the player just filed).
   */
  async insertQueuedFlag(
    playerId: string,
    severity: CheatFlagSeverityEnumTs,
    executor?: AntiCheatTx,
  ): Promise<boolean> {
    const db = executor ?? this.db;
    const result = await db.execute(sql`
      INSERT INTO ${cheatFlagRow} (target_player_id, flag_kind, source_signal, detector, severity)
      VALUES (${playerId}::uuid, 'SOFT', 'C1_DECOY_SPAM', 'T4_SIGNAL', ${severity})
      ON CONFLICT (target_player_id, source_signal) WHERE status = 'QUEUED' DO NOTHING
      RETURNING cheat_flag_id
    `);
    return rowsOf(result).length > 0;
  }
}
