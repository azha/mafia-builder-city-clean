// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 16 (C16) + Task 17 (C17) + Task 18 (C18) + Task 19 (C19)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.3 (:122-129, :139, :154-157) + §4.3
//             — Forensic C16 — 2026-06-20
//             — Forensic C17 — 2026-06-20
//             — Forensic C18 — 2026-06-20
//             — Forensic C19 — 2026-06-20
//
// `StandingGapHeatService` — §5.3 Standing-Gap lifestyle state + pure gap formula.
//
// C16 stands up:
//   1. computeGap (PURE, cost in cents): gap = visibleStandardCost − declaredCut·(1−savings).
//      No DB, no Math.random, no side effects. Takes COST in cents (not index) — keeps it pure.
//      The index→cost conversion is the CALLER'S job (populateLifestyleState below).
//      Formula (canon :129): gap = visible_standard_cost − declared_cut · (1 − savings_rate).
//
//   2. populateLifestyleState(playerId, lieutenantId, declaredCutCents, visibleStandardIndex):
//      - Converts index→cost: visible_standard_cost = visibleStandardIndex ×
//          forensicTunables.standingGapVisibleStandardCentsPerIndex (DD-VISIBLE-STANDARD-COST —
//          SOURCED from the getter, NEVER an inline scalar).
//      - Calls computeGap(declaredCutCents, visible_standard_cost).
//      - Creates/updates the lifestyle_audit_state row with declared_cut_cents,
//          visible_standard_index, and last_gap.
//
// C17 stands up:
//   3. runMonthlyTick(ctx, monthId):
//      - Idempotent: skips if last_month_id == monthId (OQ-9 / DD-MONTHLY-ON-NIGHTLY).
//      - Per lifestyle row: G = declared_cut_cents · standingGapGThresholdMult (getter, NO inline).
//        - last_gap > G → consecutive_flag_months++ (increment).
//        - last_gap ≤ G → consecutive_flag_months = max(0, consecutive_flag_months − 1) (decrement).
//      - Stamps last_month_id.
//      - If consecutive_flag_months ≥ standingGapConsecutiveMonths (2) AND tail_ramp_stage == 'none':
//          sets tail_ramp_stage = 'passive', tail_started_tick = ctx.gameMinute (the spawn).
//      - No-op if 0 rows for the player.
//      - No Math.random. No Date.now(). All tunables sourced from getters (anti-fabrication).
//
// C18 adds advanceTailRamp(ctx, dayId):
//   - For each lifestyle row with tail_ramp_stage != 'none': compute
//       currentGameMinute = dayId × TICKS_PER_DAY
//       daysSinceSpawn = (currentGameMinute − tail_started_tick) / TICKS_PER_DAY
//       progress = daysSinceSpawn / (standingGapTailRampWeeks × 7)
//       stageIndex = clamp(floor(progress × 3), 0, 2)  [ANTI-FIG-LEAF: structural, not magic 0.333]
//       targetStage: ACTIVE_STAGES[stageIndex] where ACTIVE_STAGES = ['passive', 'tailing', 'subpoena']
//   - Monotone non-decreasing: only advances (never regresses). Stage ordinals enforced via index.
//   - If stage ADVANCED, UPDATE tail_ramp_stage in DB + LOG internal notification.
//     (LifestyleGapFlag event bus emit deferred to C20 — NOT emitted here.)
//   - No-op if all rows are tail_ramp_stage='none' or if no rows exist.
//   - No Math.random. No Date.now(). Game-time only (dayId × TICKS_PER_DAY / tail_started_tick).
//   - ANTI-FIG-LEAF: stage thresholds STRUCTURALLY derived from ACTIVE_STAGES.length (3) and
//       standingGapTailRampWeeks getter. No hardcoded 0.333/0.667 magic literals anywhere.
//
// C19 adds per-stage inspection_queues emission to advanceTailRamp:
//   - After determining the current stage (which may be the pre-existing stage or the newly
//     advanced one), emit ONE inspection_queues entry per stage via EXISTING applyQueues (DIV-2).
//   - Emit-once-per-stage (idempotent): check existing FORENSIC/tail_<stage> entries; skip if
//     already present. This ensures re-running the same dayId never duplicates.
//   - Stage → forensic_kind + priority_bucket (§4.3):
//       'passive'  → 'tail_passive'  + LOW
//       'tailing'  → 'tail_active'   + MEDIUM
//       'subpoena' → 'tail_subpoena' + HIGH
//   - building_id: deterministic integer derived from the lieutenant UUID (hash of first 8 hex
//     chars sans dashes). No DB lookup needed — QueueEntry.building_id is a numeric handle for
//     hash-based dispatch outcomes (C22), not a FK to the buildings table (same pattern as C15).
//   - districtId: for each inspection_queues row this player has (from listQueues), check + emit.
//     In production the player may have 1 or 18 district rows; the emit-once guard prevents
//     duplicate entries across multiple calls.
//   - Read-modify-write PRESERVES pre-existing queue entries (the C15 clobber lesson):
//     updatedEntries = [...existingEntries, newEntry] (APPEND, not replace).
//   - No-op if no inspection_queues rows exist for the player (lazy-seed not yet run).
//   - No Math.random. No Date.now(). All tunables from getters.
//
// OQ-8 (5.3 greenfield): this service is built from scratch. The canon "REUSE 04a ch14" was never
//   implemented (police_memory.service.ts:79-81 is the deferred emitter). Full greenfield.
//
// DD-VISIBLE-STANDARD-COST (canon-silent): the tier table (index→cost) is NOT defined in canon.
//   Resolution: PROVISIONAL linear model `cost = index × standingGapVisibleStandardCentsPerIndex`
//   (default 10000 = $100/tier, [PROPOSED DEFAULT][PROV-Y26Q2]). The real tier table is a
//   calibration-TD deliverable (C26). MUST source the getter, NEVER inline `× 10000`.
//
// R2.2: last_gap is server-only — never projected to client (client sees LifestyleAlarmBucket C24).
// Anti-fabrication: no Math.random, no inline scalars beyond typed defaults.
// Zero-regression invariant (§1.3): no existing service extended (full greenfield).

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { lifestyleAuditState } from '../../db/schema/forensic';
import { forensicTunables } from './forensic-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import {
  InspectionQueueRepository,
  type QueueEntry,
  type PriorityBucket,
} from '../../citysim/inspection/inspection.repository';
// C5 carry-forward #6 — shared reverse-hash util (anti-drift between forensic + legal paths).
import { lieutenantBuildingIdHash as _lieutenantBuildingIdHash } from '../../common/lieutenant-building-id-hash';
import type { ForensicKind } from './forensic-severity';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { ApiError } from '../../protocol/api-error';

/**
 * W6a C2 (D3.c) — true iff a thrown DB error is the ownership-immutability trigger violation
 * (migration 0142, custom SQLSTATE 'OW001' — NOT the built-in unique_violation 23505). Mirrors the
 * `isUniqueViolation` idiom already established by `standing-order.service.ts` / `flag-discipline.
 * service.ts` / `degraded-category-pressure-producer.service.ts` — "each service/repository keeps
 * its own copy" — never a shared extraction (SAME copy as `leading-digit-audit.service.ts`'s own).
 * Belt-and-suspenders here (0136:6-13 posture): the app-layer `setWhere` predicate on
 * `populateLifestyleState`'s UPSERT already makes this trigger unreachable FROM THIS FILE — this
 * catch only matters if some OTHER future write on `lifestyle_audit_state` forgets the predicate.
 */
function isOwnershipImmutableViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === 'OW001' || err?.cause?.code === 'OW001';
}

/**
 * StandingGapHeatService — §5.3 Standing-Gap lifestyle state (C16 + C17 + C18 + C19).
 *
 * Provides:
 *   - computeGap (PURE): the gap formula on cost-in-cents, no DB/IO.
 *   - populateLifestyleState: convert index→cost via registry getter, then stamp last_gap.
 *   - runMonthlyTick: DD-MONTHLY-ON-NIGHTLY idempotent counter (C17).
 *   - advanceTailRamp: tail-ramp stage advance (C18) + per-stage queue emission (C19).
 *
 * C19 reuses InspectionQueueRepository.applyQueues (DIV-2 — System 6 not rebuilt/modified).
 */
@Injectable()
export class StandingGapHeatService {
  private readonly logger = new Logger(StandingGapHeatService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly inspectionQueueRepository: InspectionQueueRepository,
    @Optional() private readonly cityEventBus?: CityEventBus,
  ) {}

  /**
   * lieutenantBuildingId — derive a stable integer building_id from a lieutenant UUID.
   *
   * QueueEntry.building_id is typed as `number` (the JSONB stores an integer building
   * identifier used for hash-based dispatch outcomes — see inspection.service.ts :366).
   * The lieutenant_id is a UUID (text) with no numeric building FK.
   *
   * Resolution (C19 — RE-ANCHOR per plan): parse the first 8 hex chars of the UUID (sans
   * dashes) as a base-16 integer, then mask to a positive 31-bit integer. This is:
   *   1. Deterministic (same lieutenant_id → same building_id, always).
   *   2. No DB lookup (no buildings row required for the test lieutenant).
   *   3. Consistent with C15's precedent (blockId as integer representative for the
   *      "address building" — the exact value is informational at this chunk; C22 will
   *      route the FORENSIC/tail_* consequence by forensic_kind, not building_id hash).
   *   4. Not Math.random (deterministic hash, pure arithmetic).
   * Anti-fabrication: the hash function is explicit and non-magical.
   * Canon-silent: the "address building" concept is canon intent (§5.3 :139 "sedan sprite
   *   parks across from lieutenant's address") but the FK from lieutenant to address
   *   building is not in the migrated schema. This is the closest representable integer.
   *
   * @param lieutenantId — lieutenant UUID (e.g. '12a3bc45-...').
   * @returns a stable non-negative 31-bit integer building_id.
   */
  static lieutenantBuildingId(lieutenantId: string): number {
    // C5 carry-forward #6: delegates to the shared util in common/lieutenant-building-id-hash.ts
    // (anti-drift — the forensic and legal paths now share the same function body).
    return _lieutenantBuildingIdHash(lieutenantId);
  }

  /**
   * computeGap — PURE gap formula (no DB, no Math.random, no side effects).
   *
   * Formula (canon forensic_signaling_mechanics.md :129):
   *   gap = visibleStandardCost − declaredCutCents · (1 − standingGapTypicalSavingsRate)
   *
   * Takes COST in cents (not index) — the index→cost conversion is the caller's responsibility
   * (applied in populateLifestyleState BEFORE this call, so this method stays pure).
   *
   * @param declaredCutCents — lieutenant's declared cut in cents (bigint or number).
   * @param visibleStandardCost — visible standard cost in cents (computed by caller from index).
   * @returns gap in cents (positive = lifestyle outruns declared cut; negative = justified).
   */
  computeGap(declaredCutCents: number, visibleStandardCost: number): number {
    const savingsRate = forensicTunables.standingGapTypicalSavingsRate;
    // gap = visible_standard_cost − declared_cut · (1 − savings_rate)
    // Canon :129: "gap = visible_standard_cost − declared_cut · (1 − typical_savings_rate)"
    return visibleStandardCost - declaredCutCents * (1 - savingsRate);
  }

  /**
   * populateLifestyleState — create or update the lifestyle_audit_state row for a lieutenant.
   *
   * Steps:
   *   1. Convert index→cost: visible_standard_cost = visibleStandardIndex ×
   *        forensicTunables.standingGapVisibleStandardCentsPerIndex
   *        (DD-VISIBLE-STANDARD-COST — SOURCED from the getter, NOT an inline scalar).
   *   2. Call computeGap(declaredCutCents, visible_standard_cost) → pure, no DB.
   *   3. UPSERT lifestyle_audit_state row: stamp declared_cut_cents, visible_standard_index,
   *        last_gap. Other columns (consecutive_flag_months, tail_ramp_stage, etc.) are
   *        preserved on UPDATE (set to their existing values or defaults on INSERT).
   *
   * Anti-fabrication: the index→cost conversion MUST source the getter, never an inline × 10000.
   * R2.2: last_gap is server-only — never projected to client.
   * OQ-8: full greenfield (no existing service extended).
   *
   * W6a C2 (D3.b) — OWNERSHIP GUARD: `lieutenantId` may already have a `lifestyle_audit_state` row
   * owned by a DIFFERENT player. The UPSERT below never reattributes: a mismatched owner throws
   * `ApiError('RESOURCE_NOT_FOUND')` (404, D2) with NO write at all (D3.b: "0 ligne affectée ⇒ 404,
   * aucune donnée touchée").
   *
   * @param playerId — player uuid (FK → player.player_id).
   * @param lieutenantId — lieutenant uuid (PK for lifestyle_audit_state).
   * @param declaredCutCents — lieutenant's declared cut in cents.
   * @param visibleStandardIndex — housing/transport/dependents tier index (smallint).
   * @throws ApiError('RESOURCE_NOT_FOUND') if `lieutenantId` is owned by a player other than
   *   `playerId` (W6a C2).
   */
  async populateLifestyleState(
    playerId: string,
    lieutenantId: string,
    declaredCutCents: number,
    visibleStandardIndex: number,
  ): Promise<void> {
    // DD-VISIBLE-STANDARD-COST: convert index→cost via the registry getter.
    // MUST source `forensicTunables.standingGapVisibleStandardCentsPerIndex` — NOT an inline scalar.
    // [PROPOSED DEFAULT][PROV-Y26Q2]: default 10000 cents/tier-step, range 5000..50000.
    // The real tier table is canon-silent → PROVISIONAL linear model; calibration TD C26.
    const centsPerIndex = forensicTunables.standingGapVisibleStandardCentsPerIndex;
    const visibleStandardCost = visibleStandardIndex * centsPerIndex;

    // computeGap: PURE formula — gap = cost − cut·(1−savings).
    // The conversion is done ABOVE (in the caller = this method), so computeGap stays pure.
    const lastGap = this.computeGap(declaredCutCents, visibleStandardCost);

    this.logger.debug(
      `populateLifestyleState: lieutenantId=${lieutenantId} playerId=${playerId} ` +
        `declaredCutCents=${declaredCutCents} visibleStandardIndex=${visibleStandardIndex} ` +
        `centsPerIndex=${centsPerIndex} visibleStandardCost=${visibleStandardCost} ` +
        `lastGap=${lastGap} (gap = cost − cut·(1−savings), C16 §5.3)`,
    );

    // UPSERT: create on first call, update declared_cut_cents/visible_standard_index/last_gap on repeat.
    // Other columns (consecutive_flag_months, tail_ramp_stage, etc.) are preserved on UPDATE.
    //
    // W6a C2 (D3.b, D1 raison 2): `player_id` is REMOVED from the UPDATE branch's `set` — written ONLY
    // once, by the INSERT branch, on row creation. `setWhere` gates the UPDATE branch on
    // `lifestyle_audit_state.player_id = $playerId`: a lieutenant owned by a DIFFERENT player yields
    // ZERO affected rows (Postgres leaves the conflicting row untouched — no exception, just no match) —
    // never a reattribution. `.returning()` reuses the "RETURNING length is the did-a-row-match test"
    // idiom already established in this codebase (`grow.repository.ts` / `precursors.repository.ts`).
    let upserted: { lieutenant_id: string }[];
    try {
      upserted = await this.db
        .insert(lifestyleAuditState)
        .values({
          lieutenant_id: lieutenantId,
          player_id: playerId,
          declared_cut_cents: BigInt(Math.round(declaredCutCents)),
          visible_standard_index: visibleStandardIndex,
          last_gap: lastGap,
        })
        .onConflictDoUpdate({
          target: lifestyleAuditState.lieutenant_id,
          set: {
            declared_cut_cents: BigInt(Math.round(declaredCutCents)),
            visible_standard_index: visibleStandardIndex,
            last_gap: lastGap,
          },
          setWhere: sql`${lifestyleAuditState.player_id} = ${playerId}::uuid`,
        })
        .returning({ lieutenant_id: lifestyleAuditState.lieutenant_id });
    } catch (e) {
      if (isOwnershipImmutableViolation(e)) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `populateLifestyleState: lieutenant ${lieutenantId} is not owned by player ${playerId} (W6a C2 ownership guard, DB-enforced, migration 0142)`,
        });
      }
      throw e;
    }
    if (upserted.length === 0) {
      // 0 rows ⇒ lieutenant_id exists but is owned by a DIFFERENT player (D3.b — setWhere excluded it).
      // D2: object-level refusal is 404 RESOURCE_NOT_FOUND (existence-masking convention) — never a new
      // `*_NOT_OWNED` code (that would recreate the oracle in the `code` field of the envelope).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `populateLifestyleState: lieutenant ${lieutenantId} is not owned by player ${playerId} (W6a C2 ownership guard)`,
      });
    }
  }

  /**
   * runMonthlyTick — §5.3 DD-MONTHLY-ON-NIGHTLY idempotent counter (C17).
   *
   * Driven by NIGHTLY/9 (no Cadence.MONTHLY exists — OQ-9). Called from forensic.module.ts
   * after runEnvironmentalInspectorScan in the NIGHTLY/9 chain.
   *
   * monthId = floor(gameMinute / DAILY_MINUTES / daysPerMonth) — derived by caller.
   *
   * Algorithm (per lifestyle_audit_state row for the player):
   *   1. Skip if last_month_id == monthId (idempotent per month — OQ-9).
   *   2. G = declared_cut_cents · standingGapGThresholdMult (getter — NO inline × 1.8).
   *   3. last_gap > G → consecutive_flag_months++ (gap exceeds threshold → suspicious).
   *      last_gap ≤ G → consecutive_flag_months = max(0, consecutive_flag_months − 1) (clean month).
   *   4. Stamp last_month_id = monthId.
   *   5. If consecutive_flag_months ≥ standingGapConsecutiveMonths (default 2) AND
   *      tail_ramp_stage == 'none':
   *        set tail_ramp_stage = 'passive', tail_started_tick = ctx.gameMinute (spawn).
   *   6. No-op if no lifestyle rows exist for the player (zero-regression §1.3).
   *
   * Anti-fabrication:
   *   - G formula sources standingGapGThresholdMult getter — NOT an inline scalar.
   *   - Threshold sources standingGapConsecutiveMonths getter.
   *   - No Math.random. No Date.now(). tail_started_tick = ctx.gameMinute (game-time).
   * R2.2: consecutive_flag_months, last_month_id, tail_ramp_stage = server-only scalars.
   * OQ-9: idempotent on last_month_id — same monthId twice → one update only.
   *
   * @param ctx — CitySimTickContext (playerId + gameMinute for tail_started_tick).
   * @param monthId — derived by caller: floor(gameMinute / DAILY_MINUTES / daysPerMonth).
   */
  async runMonthlyTick(ctx: CitySimTickContext, monthId: number): Promise<void> {
    // Fetch all lifestyle rows for the player.
    const rows = await this.db
      .select()
      .from(lifestyleAuditState)
      .where(eq(lifestyleAuditState.player_id, ctx.playerId));

    if (rows.length === 0) {
      // No lifestyle rows → no-op (zero-regression §1.3 — organic no-op for players not tracked).
      this.logger.debug(
        `runMonthlyTick: no lifestyle rows for playerId=${ctx.playerId} monthId=${monthId} — no-op (organic)`,
      );
      return;
    }

    // Tunables sourced from getters (anti-fabrication: NO inline scalars).
    const gMult = forensicTunables.standingGapGThresholdMult;               // default 1.8 (canon :154)
    const consecutiveThreshold = forensicTunables.standingGapConsecutiveMonths; // default 2  (canon :155)

    for (const row of rows) {
      // Idempotent guard (OQ-9 / DD-MONTHLY-ON-NIGHTLY):
      //   skip if last_month_id already equals this monthId (already processed this month).
      if (row.last_month_id === monthId) {
        this.logger.debug(
          `runMonthlyTick: idempotent skip — lieutenantId=${row.lieutenant_id} ` +
            `last_month_id=${row.last_month_id} == monthId=${monthId}`,
        );
        continue;
      }

      const declaredCutCents = Number(row.declared_cut_cents);
      const lastGap = row.last_gap ?? 0;  // null = not yet computed → treat as 0 (no gap)

      // G = declared_cut · standingGapGThresholdMult (getter — canon :154).
      // Anti-fabrication: gMult is from the getter above — NOT an inline 1.8 literal here.
      const G = declaredCutCents * gMult;

      // Increment or decrement consecutive_flag_months.
      const prevConsecutive = row.consecutive_flag_months ?? 0;
      let newConsecutive: number;
      if (lastGap > G) {
        // gap exceeds G → suspicious month → increment.
        newConsecutive = prevConsecutive + 1;
        this.logger.debug(
          `runMonthlyTick: gap=${lastGap} > G=${G} → consecutive ${prevConsecutive}→${newConsecutive} ` +
            `(lieutenantId=${row.lieutenant_id} monthId=${monthId})`,
        );
      } else {
        // gap ≤ G → clean month → decrement (floor at 0).
        newConsecutive = Math.max(0, prevConsecutive - 1);
        this.logger.debug(
          `runMonthlyTick: gap=${lastGap} ≤ G=${G} → consecutive ${prevConsecutive}→${newConsecutive} ` +
            `(lieutenantId=${row.lieutenant_id} monthId=${monthId})`,
        );
      }

      // Determine if tail should spawn.
      // Spawn condition: consecutive ≥ threshold AND tail_ramp_stage is still 'none'.
      // (If already 'passive'/'tailing'/'subpoena' the tail is already active — do NOT re-spawn.)
      const shouldSpawn =
        newConsecutive >= consecutiveThreshold && row.tail_ramp_stage === 'none';

      if (shouldSpawn) {
        // Spawn: set tail_ramp_stage = 'passive' + stamp tail_started_tick = ctx.gameMinute.
        // tail_started_tick is a game-minute (game-time, not wall-clock Date.now() — anti-fabrication).
        await this.db
          .update(lifestyleAuditState)
          .set({
            consecutive_flag_months: newConsecutive,
            last_month_id: monthId,
            tail_ramp_stage: 'passive',
            tail_started_tick: BigInt(ctx.gameMinute),
          })
          .where(
            and(
              eq(lifestyleAuditState.lieutenant_id, row.lieutenant_id),
              eq(lifestyleAuditState.player_id, ctx.playerId),
            ),
          );
        this.logger.log(
          `runMonthlyTick: SPAWN tail — lieutenantId=${row.lieutenant_id} ` +
            `playerId=${ctx.playerId} consecutive=${newConsecutive} ` +
            `tail_ramp_stage='passive' tail_started_tick=${ctx.gameMinute} monthId=${monthId} ` +
            `(standingGapConsecutiveMonths=${consecutiveThreshold}, canon §5.3 :155)`,
        );
      } else {
        // No spawn — update counter + stamp last_month_id only.
        await this.db
          .update(lifestyleAuditState)
          .set({
            consecutive_flag_months: newConsecutive,
            last_month_id: monthId,
          })
          .where(
            and(
              eq(lifestyleAuditState.lieutenant_id, row.lieutenant_id),
              eq(lifestyleAuditState.player_id, ctx.playerId),
            ),
          );
      }
    }

    this.logger.debug(
      `runMonthlyTick: processed ${rows.length} lifestyle row(s) for ` +
        `playerId=${ctx.playerId} monthId=${monthId} (DD-MONTHLY-ON-NIGHTLY OQ-9)`,
    );
  }

  /**
   * advanceTailRamp — §5.3 tail-ramp stage advance (C18).
   *
   * Driven by NIGHTLY/9 (chained AFTER runMonthlyTick in forensic.module.ts).
   * Called with the same `dayId` that NIGHTLY/9 passes to runEnvironmentalInspectorScan.
   *
   * Algorithm (per lifestyle_audit_state row with tail_ramp_stage != 'none'):
   *   1. Skip rows with tail_ramp_stage == 'none' (no tail active).
   *   2. Skip rows where tail_started_tick is null (should not happen after C17 spawn, but guard).
   *   3. RE-ANCHOR C18 (plan :2240):
   *        TICKS_PER_DAY = 1440 (game-minutes per in-game day).
   *        currentGameMinute = dayId × TICKS_PER_DAY.
   *        daysSinceSpawn = (currentGameMinute − tail_started_tick) / TICKS_PER_DAY.
   *   4. progress = daysSinceSpawn / (standingGapTailRampWeeks × 7).
   *   5. ANTI-FIG-LEAF (C14 lesson — critical):
   *        ACTIVE_STAGES = ['passive', 'tailing', 'subpoena']  (3 active stages, no magic literals).
   *        stageIndex = clamp(floor(progress × ACTIVE_STAGES.length), 0, ACTIVE_STAGES.length − 1).
   *        targetStage = ACTIVE_STAGES[stageIndex].
   *        No bare 0.333/0.667 thresholds. The ramp windows are STRUCTURAL derivations of
   *        ACTIVE_STAGES.length (3) and standingGapTailRampWeeks (getter, default 6).
   *   6. Monotone non-decreasing: currentStageIndex = indexOf(currentStage); only advance if
   *        stageIndex > currentStageIndex.
   *   7. If advanced: UPDATE tail_ramp_stage = targetStage + LOG internal notification.
   *        (LifestyleGapFlag bus event is deferred to C20 — NOT emitted here.)
   *   8. No-op if all rows have tail_ramp_stage='none' or no rows exist (zero-regression §1.3).
   *
   * Anti-fabrication:
   *   - No Math.random. No Date.now(). Game-time only.
   *   - standingGapTailRampWeeks sourced from getter (NOT inline `6`).
   *   - Stage thresholds: STRUCTURAL (ACTIVE_STAGES.length, not hardcoded 0.333/0.667).
   *   - Monotone: stage ordinals clamped; never regress subpoena→tailing.
   *
   * R2.2: tail_ramp_stage is server-only; client sees LifestyleAlarmBucket (C24).
   * OQ-8: full greenfield.
   *
   * @param ctx — CitySimTickContext (playerId; gameMinute NOT used — dayId is the canonical arg).
   * @param dayId — in-game day id (derived by caller: floor(gameMinute / TICKS_PER_DAY)).
   */
  async advanceTailRamp(ctx: CitySimTickContext, dayId: number): Promise<void> {
    // RE-ANCHOR C18 (plan line 2240): TICKS_PER_DAY = 1440 game-minutes per in-game day.
    // This anchors the game-time unit. tail_started_tick was set as ctx.gameMinute at C17 spawn.
    // The derive: currentGameMinute = dayId × TICKS_PER_DAY; daysSinceSpawn = ΔgameMinutes / TICKS_PER_DAY.
    const TICKS_PER_DAY = 1440; // game-minutes per in-game day

    // Fetch all lifestyle rows for the player.
    const rows = await this.db
      .select()
      .from(lifestyleAuditState)
      .where(eq(lifestyleAuditState.player_id, ctx.playerId));

    if (rows.length === 0) {
      // No lifestyle rows → no-op (zero-regression §1.3).
      this.logger.debug(
        `advanceTailRamp: no lifestyle rows for playerId=${ctx.playerId} dayId=${dayId} — no-op (organic)`,
      );
      return;
    }

    // ANTI-FIG-LEAF: the 3 active tail-ramp stages as an ordered array.
    // Stage thresholds are STRUCTURAL derivations of ACTIVE_STAGES.length (3) —
    // NO bare 0.333/0.667 magic literals anywhere in this method.
    // canon :139: "passive → tailing → subpoena".
    const ACTIVE_STAGES: ReadonlyArray<'passive' | 'tailing' | 'subpoena'> = ['passive', 'tailing', 'subpoena'];

    // Ramp duration in days: sourced from the getter (NEVER inline `42` or `6`).
    // standingGapTailRampWeeks default = 6 (canon :157, T.forensic.standing_gap_tail_ramp_weeks).
    const rampWeeks = forensicTunables.standingGapTailRampWeeks;
    const rampDays = rampWeeks * 7; // 6 × 7 = 42 at default; varies with tunable.

    // Current game-minute corresponding to this dayId (RE-ANCHOR C18).
    const currentGameMinute = dayId * TICKS_PER_DAY;

    // C19: load all inspection_queues rows for this player (used for per-stage emit-once guard).
    // listQueues returns all districts the player has queue rows for.
    // For test players seeded via populate-lifestyle, this is district 1 only.
    // In production, 1–18 district rows may exist (lazy-seeded on first tick).
    // No-op if the player has no inspection_queues rows yet (lazy-seed not run).
    const queueStates = await this.inspectionQueueRepository.listQueues(ctx.playerId);

    // C19: §4.3 stage → forensic_kind + priority_bucket mapping (source the PriorityBucket enum
    // values — do NOT inline magic strings beyond the typed enum domain).
    // Canon §4.3: passive=LOW, tailing(→tail_active)=MEDIUM, subpoena=HIGH.
    const STAGE_TO_FORENSIC_KIND: Record<'passive' | 'tailing' | 'subpoena', ForensicKind> = {
      passive:  'tail_passive',
      tailing:  'tail_active',   // NOTE: 'tailing' stage maps to forensic_kind='tail_active' (§4.3)
      subpoena: 'tail_subpoena',
    };
    const STAGE_TO_PRIORITY: Record<'passive' | 'tailing' | 'subpoena', PriorityBucket> = {
      passive:  'LOW',
      tailing:  'MEDIUM',
      subpoena: 'HIGH',
    };

    for (const row of rows) {
      const currentStage = row.tail_ramp_stage;

      // Skip rows where no tail is active ('none' = no tail spawned or already reset).
      if (currentStage === 'none') {
        this.logger.debug(
          `advanceTailRamp: tail_ramp_stage='none' — skip row lieutenantId=${row.lieutenant_id} ` +
            `(no tail active; advance is a no-op for 'none' stage, C18+C19)`,
        );
        continue;
      }

      // Guard: tail_started_tick must be non-null (set by C17 spawn; null = pre-spawn row).
      if (row.tail_started_tick == null) {
        this.logger.warn(
          `advanceTailRamp: tail_ramp_stage='${currentStage}' but tail_started_tick=null — ` +
            `skip row lieutenantId=${row.lieutenant_id} (C17 spawn should have set this; no-op)`,
        );
        continue;
      }

      // Compute days elapsed since tail spawn (game-time only — no Date.now()).
      // tail_started_tick is a game-minute (bigint in schema, mode:'bigint').
      // daysSinceSpawn = (currentGameMinute − tail_started_tick) / TICKS_PER_DAY.
      const tailStartedTick = Number(row.tail_started_tick);
      const daysSinceSpawn = (currentGameMinute - tailStartedTick) / TICKS_PER_DAY;

      // progress ∈ [0, ∞): 0 = just spawned, 1 = ramp complete.
      // Clamping stageIndex to [0, ACTIVE_STAGES.length−1] handles progress > 1 (ramp overrun).
      const progress = rampDays > 0 ? daysSinceSpawn / rampDays : 1;

      // ANTI-FIG-LEAF: stageIndex derived STRUCTURALLY from ACTIVE_STAGES.length (3).
      //   stageIndex 0 → 'passive'  (progress < 1/3, i.e. < 14d at default rampDays=42)
      //   stageIndex 1 → 'tailing'  (1/3 ≤ progress < 2/3, i.e. 14d ≤ days < 28d)
      //   stageIndex 2 → 'subpoena' (progress ≥ 2/3, i.e. days ≥ 28d)
      // The thirds boundaries are DERIVED from ACTIVE_STAGES.length — NOT magic literals.
      const rawIndex = Math.floor(progress * ACTIVE_STAGES.length);
      const stageIndex = Math.min(Math.max(rawIndex, 0), ACTIVE_STAGES.length - 1);
      const targetStage = ACTIVE_STAGES[stageIndex]!;

      // Monotone non-decreasing guard: only advance, never regress.
      const currentStageIndex = ACTIVE_STAGES.indexOf(currentStage as 'passive' | 'tailing' | 'subpoena');
      if (currentStageIndex < 0) {
        // currentStage is 'none' — should not reach here (guarded above), but defensive.
        this.logger.warn(
          `advanceTailRamp: unexpected currentStage='${currentStage}' not in ACTIVE_STAGES — skip ` +
            `lieutenantId=${row.lieutenant_id}`,
        );
        continue;
      }

      // Determine the effective (post-call) stage for C19 queue emission.
      // C18 monotone: advance only if stageIndex > currentStageIndex.
      let effectiveStage: 'passive' | 'tailing' | 'subpoena' = currentStage as 'passive' | 'tailing' | 'subpoena';

      if (stageIndex > currentStageIndex) {
        // Advance the stage: stageIndex > currentStageIndex.
        // UPDATE tail_ramp_stage in DB.
        // NOTE: the LifestyleGapFlag bus event (emitting to CityEventBus) is DEFERRED to C20.
        //   Here at C18/C19, we update the DB column + log an internal notification.
        await this.db
          .update(lifestyleAuditState)
          .set({ tail_ramp_stage: targetStage })
          .where(
            and(
              eq(lifestyleAuditState.lieutenant_id, row.lieutenant_id),
              eq(lifestyleAuditState.player_id, ctx.playerId),
            ),
          );

        effectiveStage = targetStage;

        this.logger.log(
          `advanceTailRamp: ADVANCED — lieutenantId=${row.lieutenant_id} ` +
            `playerId=${ctx.playerId} ` +
            `'${currentStage}'→'${targetStage}' ` +
            `dayId=${dayId} daysSinceSpawn=${daysSinceSpawn.toFixed(2)} ` +
            `progress=${progress.toFixed(4)} stageIndex=${stageIndex} rampDays=${rampDays} ` +
            `rampWeeks=${rampWeeks} tailStartedTick=${tailStartedTick} ` +
            `(ACTIVE_STAGES.length=${ACTIVE_STAGES.length} — structural thresholds, C18 §5.3 canon :139). ` +
            `C20 LifestyleGapFlag emitted additively.`,
        );

        // C20 additive bus event (ADDITIVE — C19 applyQueues below stays; this is cross-system notify).
        // Emit LifestyleGapFlag with rampStage directly (DD decision C: no banding fn, no severity field).
        // precinctId=1 (TEST_PRECINCT_ID sentinel — production precinct lookup deferred to C23).
        this.cityEventBus?.emitLifestyleGapFlag({
          type: 'lifestyle_gap_flag',
          playerId: ctx.playerId,
          lieutenantId: row.lieutenant_id,
          precinctId: 1,
          rampStage: targetStage,
          gameMinute: ctx.gameMinute,
        });
      } else {
        // No advancement — either same stage or progress maps to an earlier stage (regression guard).
        // effectiveStage = currentStage (already set above).
        this.logger.debug(
          `advanceTailRamp: no advancement — lieutenantId=${row.lieutenant_id} ` +
            `currentStage='${currentStage}' (idx=${currentStageIndex}) targetStage='${targetStage}' ` +
            `(idx=${stageIndex}) dayId=${dayId} daysSinceSpawn=${daysSinceSpawn.toFixed(2)} ` +
            `progress=${progress.toFixed(4)} rampDays=${rampDays} (monotone guard, C18). ` +
            `Will attempt C19 queue emission for current stage.`,
        );
      }

      // C19: emit-once-per-stage queue emission via EXISTING applyQueues (DIV-2).
      //
      // Canon §5.3 :139: "each stage feeds new entries into MIS queues".
      // Emit ONE inspection_queues entry for the effective stage, per district queue.
      // Idempotent: check existing FORENSIC/tail_<stage> entries — skip if already present.
      //
      // building_id: stable integer derived from lieutenant UUID (C19 RE-ANCHOR — see
      // StandingGapHeatService.lieutenantBuildingId for the hash rationale and canon note).
      const forensicKind = STAGE_TO_FORENSIC_KIND[effectiveStage];
      const priorityBucket = STAGE_TO_PRIORITY[effectiveStage];
      const buildingId = StandingGapHeatService.lieutenantBuildingId(row.lieutenant_id);

      if (queueStates.length === 0) {
        // No inspection_queues rows for this player yet (lazy-seed not run).
        // No-op — zero-regression §1.3 (the queue will be seeded on the next player tick).
        this.logger.warn(
          `advanceTailRamp C19: no inspection_queues rows for playerId=${ctx.playerId} ` +
            `lieutenantId=${row.lieutenant_id} effectiveStage='${effectiveStage}' ` +
            `— queue emit skipped (lazy seed not run yet)`,
        );
        continue;
      }

      for (const queueState of queueStates) {
        // Emit-once-per-stage guard: check if a FORENSIC/tail_<stage> entry already exists.
        // This prevents double-emit when advanceTailRamp is called twice with the same dayId
        // (idempotence — the stage doesn't advance, and the existing entry is already there).
        const alreadyEmitted = queueState.entries.some(
          (e) => e.source === 'FORENSIC' && e.forensic_kind === forensicKind,
        );
        if (alreadyEmitted) {
          this.logger.debug(
            `advanceTailRamp C19: emit-once guard — FORENSIC/${forensicKind} already in queue ` +
              `districtId=${queueState.district_id} lieutenantId=${row.lieutenant_id} — skip`,
          );
          continue;
        }

        // Append the new FORENSIC entry to the existing queue (read-modify-write).
        // PRESERVE pre-existing entries: updatedEntries = [...existing, newEntry] (NOT replace).
        // This is the C15 clobber lesson — applyQueues updates entries+length; must not lose
        // existing SCHEDULED/INFORMANT/other entries.
        const forensicEntry: QueueEntry = {
          building_id: buildingId,
          priority_bucket: priorityBucket,
          age_in_ticks: 0,
          source: 'FORENSIC',
          forensic_kind: forensicKind,
          decay_accumulator: 0,
        };

        const updatedEntries = [...queueState.entries, forensicEntry];
        await this.inspectionQueueRepository.applyQueues(ctx.playerId, [
          {
            district_id: queueState.district_id,
            entries: updatedEntries,
            length: updatedEntries.length,
            processing_rate_per_day: queueState.processing_rate_per_day,
            budget_modifier: queueState.budget_modifier,
          },
        ]);

        // Update our local in-memory view of this queue state so the next row in the outer loop
        // (if multiple lieutenants) sees the correct entries (prevents missed dedup across rows).
        queueState.entries = updatedEntries;
        queueState.length = updatedEntries.length;

        this.logger.log(
          `advanceTailRamp C19: FORENSIC/${forensicKind} entry emitted — ` +
            `playerId=${ctx.playerId} lieutenantId=${row.lieutenant_id} ` +
            `effectiveStage='${effectiveStage}' districtId=${queueState.district_id} ` +
            `buildingId=${buildingId} priorityBucket=${priorityBucket} ` +
            `queueLength=${updatedEntries.length} (DIV-2: applyQueues REUSED, C19 §5.3 §4.3)`,
        );
      }
    }

    this.logger.debug(
      `advanceTailRamp: processed ${rows.length} lifestyle row(s) for ` +
        `playerId=${ctx.playerId} dayId=${dayId} currentGameMinute=${currentGameMinute} ` +
        `rampDays=${rampDays} (C18+C19 §5.3)`,
    );
  }
}
