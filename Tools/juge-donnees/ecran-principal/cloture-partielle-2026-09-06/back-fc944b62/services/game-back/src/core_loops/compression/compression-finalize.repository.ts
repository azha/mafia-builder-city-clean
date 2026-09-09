// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (finalize I8 —
//             "auto au budget épuisé / tout adressé / abandon N/31 D15" + the ★#6 downgrade teeth)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §10.4
//             (finalize + downgrade — the 4 mechanical steps, verbatim).
//             Decisions: D15 (abandon after N game-days, tunable default 14) ; I8 (guarded
//             `WHERE state='active' RETURNING`, exactly-once) ; ★#6 (3 real effects: reseed-aggravé,
//             carte spine, plancher de stress — never a label).
//             Pattern: `ExceptionsRepository#updatePriorities` (the batched `UPDATE … FROM (VALUES …)`
//             set-based write, REPLICATED here for the entries downgrade) + `CompressionWeekRepository#
//             applyStressIncrement`'s own guarded-UPDATE-then-conditional-2nd-UPDATE shape.
//             — P3-E C7 — 2026-07-18
//
// `CompressionFinalizeRepository` — DELIBERATELY self-contained (`@Inject(DB)` ONLY, zero other
// injected class — the SAME "stateless DB-only class, duplicate-provided" precedent `ExceptionsRepository`
// already establishes across `ExceptionsModule`/`DemolitionModule`): this repository (+ its sibling
// `CompressionFinalizeService`) is duplicate-provided in BOTH `CompressionModule` (the decide-triggered
// auto-finalize path, budget-exhausted/all-addressed) AND `DemolitionModule` (the N/31
// `FRICTION_BUDGET_TICK`'s OWN abandon-sweep, D15 — see that tick service's own header note: "Compression-
// week housekeeping … is C6/C7 scope") — a DIRECT `DemolitionModule -> CompressionModule` import would be
// a genuine cycle (`CompressionModule` ALREADY imports `DemolitionModule` for `FrictionBudgetRepository`,
// C6) — this file's zero-dependency shape sidesteps that entirely, zero new module edge either direction.

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { bumpTierBy, type ProblemTier } from './problem-tier';

/** Defensive dual-shape read (this codebase's own convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

export interface FinalizeOutcome {
  readonly finalized: boolean;
  readonly compressionEventId: string | null;
  readonly hasCriticalResidue: boolean;
  readonly orgStressAfter: number | null;
  /** `problem_key` of every entry that reached `tier='critical' AND persisted=true` THIS finalize (§10.4.2
   *  — the caller, `CompressionFinalizeService`, raises ONE spine card per key, POST-commit). */
  readonly criticalResidueProblemKeys: string[];
}

@Injectable()
export class CompressionFinalizeRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * The design §10.4 tx, ONE guarded UPDATE (I8) gating everything: `WHERE state='active'` — plus,
   * WHEN `minAbandonAgeTicks` is non-null (the N/31 abandon-sweep caller only), an ADDITIONAL
   * `fired_at_tick IS NOT NULL AND (gameMinute - fired_at_tick) >= minAbandonAgeTicks` conjunct (D15 —
   * the ONLY timestamp anchor `compression_events` carries for "time since fire"; the decide-triggered
   * callers pass `null`, no age requirement — any 'active' row with budget-exhausted/all-addressed
   * finalizes immediately regardless of age).
   *
   * `finalized: false` (0 rows matched) is the COMMON, EXPECTED outcome for every caller that isn't the
   * exact winner of a race (I8 concurrency: 2 concurrent finalizes -> exactly 1 `finalized: true`) or
   * every abandon-sweep tick whose player has no eligible row — never an error.
   */
  async finalizeIfEligible(
    playerId: string,
    gameMinute: number,
    downgradeTiers: number,
    postResetStress: number,
    floorWithCriticalResidue: number,
    minAbandonAgeTicks: number | null,
  ): Promise<FinalizeOutcome> {
    return this.db.transaction(async (tx) => {
      const ageGuard =
        minAbandonAgeTicks == null
          ? sql``
          : sql`AND fired_at_tick IS NOT NULL AND (${gameMinute}::bigint - fired_at_tick) >= ${minAbandonAgeTicks}::bigint`;

      const flipped = await tx.execute(sql`
        UPDATE compression_events
        SET state = 'finalized', finalized_at_tick = ${gameMinute}
        WHERE player_id = ${playerId}::uuid AND state = 'active' ${ageGuard}
        RETURNING id
      `);
      const eventId = rowsOf(flipped)[0]?.['id'] as string | undefined;
      if (!eventId) {
        return { finalized: false, compressionEventId: null, hasCriticalResidue: false, orgStressAfter: null, criticalResidueProblemKeys: [] };
      }

      // §10.4.1 — unaddressed entries -> tier+N cran + persisted=true (the SAME row this cycle inserted,
      // re-presented at the NEXT board via `ProblemAggregatorRepository#readPersistedCarryover`).
      const unaddressed = await tx.execute(sql`
        SELECT id, tier FROM compression_problem_entry
        WHERE compression_event_id = ${eventId}::uuid AND addressed_at IS NULL
      `);
      const unaddressedRows = rowsOf(unaddressed) as Array<{ id: string; tier: ProblemTier }>;
      if (unaddressedRows.length > 0) {
        const values = unaddressedRows.map((r) => sql`(${r.id}::uuid, ${bumpTierBy(r.tier, downgradeTiers)})`);
        await tx.execute(sql`
          UPDATE compression_problem_entry AS cpe
          SET tier = v.new_tier, persisted = true
          FROM (VALUES ${sql.join(values, sql`, `)}) AS v(entry_id, new_tier)
          WHERE cpe.id = v.entry_id
        `);
      }

      // §10.4.2 — critical residue: EVERY entry now `tier='critical' AND persisted=true` (both the
      // just-downgraded ones above AND any entry that was ALREADY critical+persisted from an earlier
      // partial-addressed pass this SAME cycle — the query re-reads post-update, no double logic).
      const critical = await tx.execute(sql`
        SELECT problem_key FROM compression_problem_entry
        WHERE compression_event_id = ${eventId}::uuid AND tier = 'critical' AND persisted = true
      `);
      const criticalResidueProblemKeys = rowsOf(critical).map((r) => String(r['problem_key']));
      const hasCriticalResidue = criticalResidueProblemKeys.length > 0;

      // §10.4.3/4 — stress reset + floor (★#6 tooth iii) + phase reset, SAME tx.
      const floor = hasCriticalResidue ? floorWithCriticalResidue : 0;
      const newStress = Math.max(postResetStress, floor);
      const stressRows = await tx.execute(sql`
        UPDATE player_progression_state
        SET org_stress = ${newStress}, compression_week_state = 'none'
        WHERE player_id = ${playerId}::uuid
        RETURNING org_stress
      `);
      const orgStressAfter = rowsOf(stressRows)[0]?.['org_stress'] != null ? Number(rowsOf(stressRows)[0]!['org_stress']) : newStress;

      return { finalized: true, compressionEventId: eventId, hasCriticalResidue, orgStressAfter, criticalResidueProblemKeys };
    });
  }
}
