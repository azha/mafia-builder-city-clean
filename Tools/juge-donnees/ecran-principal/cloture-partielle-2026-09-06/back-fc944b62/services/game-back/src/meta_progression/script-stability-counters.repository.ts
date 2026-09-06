// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1 (`VerticalHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-H1) + C3 ("no-
//             deviation -> EXECUTED_ON_PLAN + counter +1 ... ABORT (... counter->0 ...) ... ESCALATE (...
//             counter frozen ...)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §3 (`script_
//             stability_counters` — per-(player,lieutenant) consecutive-no-deviation ratchet, D5) + §6.6
//             (counter increment/reset + tier advancement).
//             ★ Fix-in-passing (⊥ C2 MINOR — the single-plan-per-order double-tick concern, resolved here):
//             the counter's KEY is `(player_id, lieutenant_id)` — a SCHEMA-fixed fact from C1 (no new
//             migration is authorized at C3, plan's own "Récap allocations"). Two ACTIVE plans on the SAME
//             lieutenant (whether from the SAME or different standing orders — C2 does not enforce
//             single-plan-per-order) therefore share ONE counter by construction: this is treated as a
//             COHERENT design, not merely an unavoidable artifact — the counter answers "how reliably does
//             THIS LIEUTENANT execute committed scripts overall", not "how reliable is this ONE plan". A
//             clean cycle on EITHER plan contributes +1 (more concurrently-active plans = more evidence
//             points, a fair trade for the added delegation load); an ABORT on EITHER plan resets the
//             WHOLE lieutenant's accumulated trust to 0 (one broken commitment costs the lieutenant's
//             trust regardless of how many of ITS OTHER plans are concurrently healthy) — see
//             `execution_plan_evaluator.spec.ts`'s own "(shared-lieutenant coherence)" test for the E2E
//             proof of both halves.
//             C9 ADDS (design §11 — the BO surface): `listAllForPlayer` (cross-lieutenant RAW read, the ★
//             P5 inversion `VerticalHorizonAdminController#getPlayerDecisionHorizon` consumes).
//             — P3-H C1 — 2026-07-24 / C3 — 2026-07-24 / C9 — 2026-07-25

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { scriptStabilityCounter, type ScriptStabilityCounterRow } from '../db/schema/vertical_horizon';

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own established idiom — never
 *  a shared extraction across repositories, see `capability-debts.repository.ts#rowsOf`). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class ScriptStabilityCountersRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * P3-H C3 (design §6.6 — "+1 on EXECUTED_ON_PLAN/ADAPTED"). ONE `INSERT ... ON CONFLICT (player_id,
   * lieutenant_id) DO UPDATE SET consecutive_no_deviation_cycles = ... + 1` — the SAME composite-PK upsert
   * idiom `CapabilityDebtsRepository.applyUpgrade` establishes for this codebase (a raw `sql` template over
   * a composite PK, never the query-builder's `.onConflictDoUpdate` for this shape). The row is LAZILY
   * created here — `script_stability_counters` has NO seed/ensureRow writer; the FIRST clean cycle for a
   * (player,lieutenant) pair creates it at count 1, every subsequent clean cycle increments in place.
   * Returns the post-write count.
   */
  async incrementOnStable(playerId: string, lieutenantId: string): Promise<number> {
    const result = await this.db.execute(sql`
      INSERT INTO script_stability_counters (player_id, lieutenant_id, consecutive_no_deviation_cycles)
      VALUES (${playerId}::uuid, ${lieutenantId}::uuid, 1)
      ON CONFLICT (player_id, lieutenant_id) DO UPDATE SET
        consecutive_no_deviation_cycles = ${scriptStabilityCounter.consecutive_no_deviation_cycles} + 1
      RETURNING consecutive_no_deviation_cycles
    `);
    const row = rowsOf(result)[0];
    return row ? Number(row.consecutive_no_deviation_cycles) : 0;
  }

  /**
   * P3-H C3 (design §6.6 — "->0 on ABORT"). A plain guarded UPDATE (never an upsert — an ABORT on a
   * (player,lieutenant) pair that never had a single clean cycle yet has NOTHING to reset; a missing row
   * already reads as "0" by absence, the SAME "missing row = zero state" convention this lot's own
   * `ProgressionRepository`/`MasteryScoreRepository` readers use). `WHERE ... consecutive_no_deviation_
   * cycles != 0` — the "TRUE zero-write when already-0" idiom (never a zero-EFFECT write). Returns whether
   * a row was actually reset (false = no row existed, or it was already at 0 — both honest no-ops).
   */
  async resetOnAbort(playerId: string, lieutenantId: string, tick: number): Promise<boolean> {
    const rows = await this.db
      .update(scriptStabilityCounter)
      .set({ consecutive_no_deviation_cycles: 0, last_reset_tick: tick, last_deviation_tick: tick })
      .where(
        and(
          eq(scriptStabilityCounter.player_id, playerId),
          eq(scriptStabilityCounter.lieutenant_id, lieutenantId),
          sql`${scriptStabilityCounter.consecutive_no_deviation_cycles} != 0`,
        ),
      )
      .returning({ player_id: scriptStabilityCounter.player_id });
    return rows.length > 0;
  }

  /**
   * P3-H C4 (design §6.6/D6 — "validate `counter.consecutive_no_deviation_cycles ≥ script_stability_
   * cycles_tierN` for the target lieutenant"). The tier-advance gate's OWN read: the CURRENT
   * `consecutive_no_deviation_cycles` for `(playerId, lieutenantId)`, or `0` for a missing row (the SAME
   * "missing row = zero state" convention `resetOnAbort`'s own header documents — a lieutenant with zero
   * clean cycles ever has never had this row lazily created by `incrementOnStable`). A READ — no state
   * change. `HorizonTierAdvancementService.advance` compares this against the target tier's threshold
   * BEFORE attempting the monotone WHERE-guarded `decision_horizon_tier` UPDATE.
   */
  async readForGate(playerId: string, lieutenantId: string): Promise<number> {
    const rows = await this.db
      .select({ n: scriptStabilityCounter.consecutive_no_deviation_cycles })
      .from(scriptStabilityCounter)
      .where(and(eq(scriptStabilityCounter.player_id, playerId), eq(scriptStabilityCounter.lieutenant_id, lieutenantId)))
      .limit(1);
    return rows[0]?.n ?? 0;
  }

  /**
   * P3-H C4 (design §6.6/D6 — "-> reset the counter" on a successful tier advancement). A plain guarded
   * UPDATE, the SAME "TRUE zero-write when already-0" idiom `resetOnAbort` uses (`WHERE ...
   * consecutive_no_deviation_cycles != 0`) — called ONLY after `HorizonTierAdvancementRepository.advanceTier`'s
   * own monotone WHERE-guarded UPDATE has ACTUALLY landed (never on a gate-refusal or a lost race). Unlike
   * `resetOnAbort`, this does NOT stamp `last_deviation_tick` — a tier advancement is a POSITIVE, stable
   * event (the counter reaching its threshold), not a deviation; stamping a "last deviation" tick for a
   * non-deviation event would be a dishonest audit trail. Returns whether a row was actually reset (false =
   * no row existed, or it was already at 0 — both honest no-ops, though `HorizonTierAdvancementService`
   * only ever calls this after `readForGate` proved the counter was AT OR ABOVE a positive threshold, so a
   * false return here would itself be a symptom worth investigating, never expected in practice).
   */
  async resetOnAdvance(playerId: string, lieutenantId: string, tick: number): Promise<boolean> {
    const rows = await this.db
      .update(scriptStabilityCounter)
      .set({ consecutive_no_deviation_cycles: 0, last_reset_tick: tick })
      .where(
        and(
          eq(scriptStabilityCounter.player_id, playerId),
          eq(scriptStabilityCounter.lieutenant_id, lieutenantId),
          sql`${scriptStabilityCounter.consecutive_no_deviation_cycles} != 0`,
        ),
      )
      .returning({ player_id: scriptStabilityCounter.player_id });
    return rows.length > 0;
  }

  /**
   * P3-H C9 (design §11 — `GET /v1/admin/players/:id/decision-horizon`, "raw stability counters per
   * lieutenant"). EVERY `script_stability_counters` row this player holds, ANY lieutenant — the ★ P5
   * inversion's own raw axis (the player-facing timeline GET, C8, exposes ONLY the derived `StabilityBucketEnum`
   * for the ONE `lieutenant_id` it was queried with; this admin read is the SAME underlying table,
   * cross-lieutenant, RAW `consecutive_no_deviation_cycles`). A player who never had a clean cycle for ANY
   * lieutenant returns `[]` (never a fabricated zero-row — the SAME "missing row = zero state" convention
   * `readForGate`'s own header documents, just applied at the LIST level here). A READ — no state change.
   */
  async listAllForPlayer(playerId: string): Promise<ScriptStabilityCounterRow[]> {
    return this.db
      .select()
      .from(scriptStabilityCounter)
      .where(eq(scriptStabilityCounter.player_id, playerId))
      .orderBy(asc(scriptStabilityCounter.lieutenant_id));
  }
}
