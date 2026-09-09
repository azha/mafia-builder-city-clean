// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Composite LieutenantArchetype +
//             §Archetype projection (the DISTRIBUTION archetype ↔ the 04a roles `Runner coordinator` / `Dealer
//             coordinator` — the dealer/runner street-distribution family; this DELEGATED binding is grounded on `Dealer
//             coordinator` — see lieutenant-archetype.ts DISTRIBUTION_ROLE_ID) +
//             docs/superpowers/specs/2026-06-08-phase-08-laundering-distribution-archetypes-design.md §Architecture
//             (the DISTRIBUTION binding — `dealer_float_cents` + `safehouse_headroom_cents` signals + `EXECUTE_DEFAULT` →
//             SellingService.collect the dealer-spot's whole float into its safehouse, ALL-OR-NOTHING, no amount) +
//             docs/tech/04a_operational_systems/selling_dealers_leks.md §Lek control vs dealer assignment ("Runners
//             pickup dealer float" → safehouse deposit — the reused collect action: ferry the dealer's WHOLE cash float
//             into a player-owned safehouse, depositing into the System-9 Erlang slot model, guarded/atomic) +
//             docs/tech/09_data_model/schema_operational_chain.md §2 (dealer.home_building_id — the dealer↔spot-building
//             FK the resolution rides on; dealer.float_cents — the collected float; R9.3 — READ, never redefine) +
//             schema_pipeline_and_laundering.md §2 (safehouse.building_id — the safehouse↔building FK; safehouse held +
//             slot capacity, the headroom read) + schema_lieutenant.md §2/§4 (lieutenant.target_building_id — the
//             Phase-7 T0 column, reused here as the safehouse, NO schema change) +
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md:135 (D2 R6 — Lek→lieutenant perf
//             multiplier: a lieutenant inheriting a strong corner outperforms baseline; on stigmatised corner
//             underperforms. The multiplier is applied to the effective float before collect — neutral `1.0` on a tile
//             with no Lek Memory so the SellingService.collect path is byte-unchanged for the no-Lek case.)
//             -- session:2026-06-08 (Phase 8 vector #8 lieutenant archetypes LAUNDERING + DISTRIBUTION — Task 2) --
//             -- session:D2 R6 — Lek→lieutenant perf multiplier in distribution-binding --
//
// `DistributionBindingService` — the DISTRIBUTION-archetype adapter the delegation tick + recruit dispatch through. The
// LAST (6th) `ArchetypeBinding` (after COOK + SECURITY + BOOKKEEPER + LOGISTICS + LAUNDERING, whose SHAPE this MIRRORS):
// the SAME three methods — `buildSnapshot` (resolve THIS archetype's signals from real state), `applyExecuteDefault` (map
// `EXECUTE_DEFAULT` to its real action), and `validateAssignment` (the recruit-time assignment gate) — and the DSL engine
// is unchanged. Like LOGISTICS + LAUNDERING, this archetype needs TWO buildings: the lieutenant's ASSIGNED (the dealer-spot
// building, which HOSTS a dealer) AND its `target_building_id` (the SAFEHOUSE the float is collected INTO — the Phase-7 T0
// column, reused here, NO schema change).
//
// The DISTRIBUTION default is AUTO-COLLECT the dealer-spot's accumulated cash float into the lieutenant's safehouse: when
// the dealer has float and the safehouse has headroom, the delegated DISTRIBUTION lieutenant runs the SAME player-driven
// collect (SellingService.collect — the runner pickup: ferries the dealer's WHOLE float into the safehouse, depositing
// into the System-9 Erlang slot model [exact headroom guard] and zeroing the dealer float in ONE atomic tx). The lieutenant
// simply calls the action the player would have called by hand — it reimplements NOTHING (no float zero, no slot fill, no
// headroom guard here; the collect owns all of that).
//
//   - `buildSnapshot` resolves TWO DISTRIBUTION signals (both NUMERIC — the rule compares them with a threshold):
//       · `state.dealer_float_cents` = the dealer at the assigned dealer-spot's `float_cents` (resolved via
//         home_building_id → dealer; the rule `WHEN STATE(dealer_float_cents,>=,<threshold>) THEN EXECUTE_DEFAULT` fires
//         once the float crosses the player-chosen threshold). OMITTED when no dealer hosts the assigned spot.
//       · `state.safehouse_headroom_cents` = the target safehouse's FREE room (slot total capacity − reconstructed held;
//         a player rule could gate `WHEN STATE(safehouse_headroom_cents,>=,…)` to avoid a doomed collect, though the
//         collect's own exact headroom guard already refuses an over-capacity deposit). OMITTED when the target cannot
//         be resolved to the player's safehouse.
//   - `applyExecuteDefault` consumes SellingService.collect(playerId, dealerId, safehouseId) — the DISTRIBUTION archetype's
//     default action. NB the collect is ALL-OR-NOTHING (NO amount arg): it ferries the dealer's WHOLE float or nothing —
//     so there is NO amount policy here (unlike LAUNDERING's tunable-capped inject or LOGISTICS's min-cargo). The only
//     decision is whether to ATTEMPT the collect at all; an empty float / a full safehouse / a concurrent-sell race are
//     all a benign caught 409 (see below). So this binding intentionally has NO tunable — the float threshold that decides
//     WHEN to collect lives in the player's DSL script literal (the `>=,<threshold>` in the rule), not a server tunable.
//
// THE ALL-OR-NOTHING SEMANTICS (documented): the collect moves the dealer's ENTIRE float into the safehouse in one atomic
// tx, or it moves nothing and throws a 409 RESOURCE_STATE_CONFLICT. There is no partial collect (M1 — the runner needs a
// safehouse that can take the whole float; selling.service.ts collect). The binding therefore does NOT size an amount; it
// only decides whether to call collect. We DO a cheap pre-check (skip the call when the dealer float is ≤ 0, or — when both
// signals resolved — when the safehouse headroom cannot fit the whole float) purely to avoid a doomed round-trip + a
// noisy benign-409 log; the collect's OWN guards remain the single authority (a race between the pre-check read and the
// collect's guarded zero still surfaces as the benign 409 below). DETERMINISTIC, no RNG.
//
// D2 R6 — LEK→LIEUTENANT PERFORMANCE MULTIPLIER (reputation_mechanics.md:135):
//
// `applyExecuteDefault` now reads `LekMemoryService.getPositionMemoryAggregate(playerId, tileId)` for
// the dealer's lek tile (dealer.coverage_lek_tile_id — the soft-ref tile the dealer occupies, which is
// the same tile the lek memory tracks) and applies a MULTIPLIER to the effective float before calling collect:
//
//   multiplier = clamp(1.0 + strength × (aggregate_fraction − NEUTRAL_FRACTION) / NEUTRAL_FRACTION, 0.5, 2.0)
//   where NEUTRAL_FRACTION = 8/15 (NEUTRAL_NIBBLE / NIBBLE_MAX from lek-memory.service.ts)
//         strength = reputationTunables.lekLieutenantPerfStrength ([PROPOSED DEFAULT] 0.30 [PROV-Y26Q2])
//
// When multiplier = 1.0 (no Lek Memory → neutral aggregate = 8/15 = NEUTRAL_FRACTION exactly):
//   adjusted_float = floor(float × 1.0) = float → NO DB adjustment → collect proceeds BYTE-IDENTICALLY
//   to the pre-R6 path (zero-regression invariant — the SellingService.collect path is byte-unchanged).
//
// When multiplier > 1.0 (strong corner — high fairness aggregate):
//   adjusted_float = floor(float × multiplier) > float → the dealer float is SET to adjusted_float
//   in the DB, then collect ferries it to the safehouse → the lieutenant OVER-PERFORMS vs baseline.
//   The extra amount represents the performance bonus: a strong corner drives more trust/throughput.
//
// When multiplier < 1.0 (stigmatized corner — low fairness aggregate):
//   adjusted_float = floor(float × multiplier) < float → the dealer float is SET to adjusted_float
//   in the DB, then collect ferries it → the lieutenant UNDER-PERFORMS vs baseline (the remaining
//   float stays in the dealer as uncollected "friction" — economic interpretation: stigma reduces
//   effective throughput).
//
// REUSE: `LekMemoryService.getPositionMemoryAggregate` is REUSED by reference (no parallel computation).
// DEPENDENCY DIRECTION: lieutenant → ReputationModule (one-directional; ReputationModule does NOT import
// LieutenantModule → no circular dep, no forwardRef).
// DI WIRING: ReputationModule is imported in LieutenantModule; LekMemoryService is injected here.
//
// CENTS ARITHMETIC: dealer.float_cents is `bigint('float_cents', { mode: 'number' })` — Drizzle returns it as a JS NUMBER
// (NOT a bigint), exact for M1 dealer-float magnitudes (« Number.MAX_SAFE_INTEGER). The safehouse held/capacity cents are
// likewise NUMBER (slot_capacity_cents is `integer`; the held reconstruction is integer cents — see getSafehouseForBuilding).
// So all the snapshot/pre-check math is plain Number (UNLIKE the BOOKKEEPER deposit whose held_cents column is `mode:'bigint'`).
//
// REUSE (never reinvent): `SellingService.collect` (the runner-pickup action — owns the empty-float guard, the System-9
// exact-headroom saturation guard, and the atomic float-zero + slot-deposit; consumed exactly as the player's POST
// /v1/operational/dealer/:id/collect does — its TWO id args are ENTITY ids: `dealerId` is the dealer PK [getOwnedDealer
// by dealer_id], `safehouseId` is the safehouse PK [getOwnedSafehouse by safehouse_id], NOT building ids). The lieutenant
// stores only the dealer-spot BUILDING id (assigned_building_id) + the safehouse BUILDING id (target_building_id), so the
// binding resolves the dealer ENTITY id via getDealerForSpotBuilding + the safehouse ENTITY id via getSafehouseForBuilding
// and passes THOSE to collect. Also REUSE `LieutenantRepository.getDealerForSpotBuilding` (the dealer-by-spot-building
// read — the dealer_id + float_cents) + `getSafehouseForBuilding` (the safehouse entity-id + held + free-headroom read,
// shared with LAUNDERING T1) + `getOwnedOperationalBuilding` (the SAME owned-operational gate the other bindings use —
// applied to the dealer-spot; the safehouse is gated by getSafehouseForBuilding's ownership filter). DETERMINISTIC, no RNG.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import type { SignalSnapshot } from '../../dsl/signals';
import { SellingService } from '../selling/selling.service';
import { LieutenantRepository } from './lieutenant.repository';
import type { ArchetypeBinding, DelegationLieutenant, SalientSignalSpec } from './archetype-binding';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';
import type { LieutenantArchetype } from './lieutenant-archetype';
import { lieutenantTunables } from './lieutenant-tunables';
import { LekMemoryService } from '../reputation/lek-memory.service';
import { reputationTunables } from '../reputation/reputation-tunables';

// D2 R6 — Lek Memory neutral fraction (NEUTRAL_NIBBLE / NIBBLE_MAX = 8/15).
// This is a CONSTANT (not a tunable) — the zero-regression identity for the multiplier.
// When aggregate_fraction = NEUTRAL_FRACTION, multiplier = 1.0 EXACTLY (no-Lek / fresh tile case).
// Canon: lek-memory.service.ts NEUTRAL_NIBBLE=8, NIBBLE_MAX=15.
const NEUTRAL_FRACTION = 8 / 15;

@Injectable()
export class DistributionBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(DistributionBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). REUSE LieutenantArchetype. */
  readonly archetype: LieutenantArchetype = 'DISTRIBUTION';

  constructor(
    private readonly selling: SellingService,
    private readonly repo: LieutenantRepository,
    /** D2 R6: Lek Memory service for the Lek↔lieutenant perf multiplier (REUSE by reference — no parallel aggregate). */
    private readonly lekMemory: LekMemoryService,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a DISTRIBUTION lieutenant — like LOGISTICS + LAUNDERING, the archetype needs TWO
   * buildings:
   *   - the ASSIGNED (dealer-spot) building must be the player's OWN OPERATIONAL building (not owned / not operational →
   *     404, via the SAME getOwnedOperationalBuilding read the other bindings use) that ACTUALLY HOSTS a dealer (a dealer
   *     row with home_building_id = this building for this player → else 409: there is no dealer at this spot to collect
   *     from — the player must assign a dealer first; the delegated binding never auto-assigns a dealer — assignDealer is
   *     a one-shot, out of scope). REUSE getDealerForSpotBuilding (the dealer-by-spot-building existence check).
   *   - the `targetBuildingId` is REQUIRED (the SAFEHOUSE the float is collected into; DISTRIBUTION reuses the Phase-7 T0
   *     target_building_id column): a null/empty target → 422 VALIDATION_FAILED. The target must be the player's OWN
   *     safehouse building (resolve `safehouse` by building_id via getSafehouseForBuilding → 404 if it is not the player's
   *     safehouse).
   * NO mutation — pure validation reads.
   */
  async validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    targetBuildingId: string | null,
  ): Promise<void> {
    // DEALER-SPOT — the player's OWN operational building (the ownership/operational gate first → 404).
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, assignedBuildingId);
    if (!owned) {
      // Not owned / not converted / not operational → 404 (cross-player invisible too).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${assignedBuildingId} is not a player-owned operational building for this player.`,
      });
    }
    const dealer = await this.repo.getDealerForSpotBuilding(playerId, assignedBuildingId);
    if (dealer === null) {
      // The operational building hosts no dealer for this player → there is nothing to collect from (the player must
      // assign a dealer first; the delegated binding never auto-assigns one — assignDealer is a one-shot, out of scope).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${assignedBuildingId} hosts no dealer for this player — ` +
          'assign a dealer at this spot before delegating a DISTRIBUTION lieutenant to it.',
      });
    }

    // SAFEHOUSE — REQUIRED for DISTRIBUTION (the collect destination; the column DISTRIBUTION reuses for the safehouse).
    if (typeof targetBuildingId !== 'string' || !targetBuildingId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'DISTRIBUTION requires a target_building_id (safehouse).',
      });
    }
    const safehouse = await this.repo.getSafehouseForBuilding(playerId, targetBuildingId);
    if (safehouse === null) {
      // The target is not the player's safehouse (no safehouse row on that building for this player) → 404.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `target_building ${targetBuildingId} is not a player-owned safehouse for this player.`,
      });
    }
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated DISTRIBUTION lieutenant from REAL game state (07 §NestJS — the
   * binding fills the snapshot the executor reads). Resolves the two DISTRIBUTION signals:
   *   - `state.dealer_float_cents` = the dealer at the assigned dealer-spot's accumulated `float_cents` (resolved via
   *     home_building_id → dealer; the rule `WHEN STATE(dealer_float_cents,>=,<threshold>) THEN EXECUTE_DEFAULT` compares
   *     it). Read via the repository boundary (getDealerForSpotBuilding) — never a duplicated dealer query. OMITTED when
   *     no dealer hosts the assigned spot.
   *   - `state.safehouse_headroom_cents` = the target safehouse's FREE room (slot total capacity − reconstructed held).
   *     Read via getSafehouseForBuilding (shared with LAUNDERING T1). OMITTED when the target cannot be resolved to the
   *     player's safehouse.
   * Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is OMITTED (not set to `undefined`). If the
   * assigned/target building is null, the corresponding signal is OMITTED → the executor takes no script-driven action.
   * NO mutation — pure reads.
   */
  async buildSnapshot(
    playerId: string,
    lieutenant: DelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean> = {};
    const events: Record<string, number | boolean> = {};

    const spotBuildingId = lieutenant.assigned_building_id;
    if (spotBuildingId !== null) {
      const dealer = await this.repo.getDealerForSpotBuilding(playerId, spotBuildingId);
      if (dealer !== null) {
        // float_cents is a JS number (bigint column, mode:'number') — exact for M1 float magnitudes. Plain number signal.
        state.dealer_float_cents = dealer.float_cents;
      }
      // (no dealer at the spot → `dealer_float_cents` OMITTED, per the absence contract — never set to undefined.)
    }

    const safehouseBuildingId = lieutenant.target_building_id;
    if (safehouseBuildingId !== null) {
      const safehouse = await this.repo.getSafehouseForBuilding(playerId, safehouseBuildingId);
      if (safehouse !== null) {
        // FREE room = total capacity − reconstructed held (floored at 0; the held reconstruction is integer cents).
        state.safehouse_headroom_cents = Math.max(0, safehouse.capacity_cents - safehouse.held_cents);
      }
      // (no safehouse row → `safehouse_headroom_cents` OMITTED, per the absence contract — never set to undefined.)
    }

    return { state, events };
  }

  /**
   * APPLY the DISTRIBUTION archetype's `EXECUTE_DEFAULT` (07 §NestJS — the binding maps the resolved token to the
   * archetype's real side-effect; the executor never acts itself). The DISTRIBUTION default is AUTO-COLLECT the dealer's
   * WHOLE cash float into the safehouse: call SellingService.collect(playerId, dealerId, safehouseId) — the SAME guarded
   * action the player's POST /v1/operational/dealer/:id/collect runs (it zeroes the dealer float + deposits the whole
   * float into the System-9 slot model in one atomic tx). NOTHING is reimplemented here.
   *
   * ALL-OR-NOTHING (documented in the file header): the collect has NO amount arg — it ferries the WHOLE float or nothing
   * (and throws 409 if it cannot). So there is no amount policy / no tunable here; the only decision is whether to ATTEMPT
   * the collect. We do a cheap PRE-CHECK to skip a doomed call (a noisy benign-409): resolve the dealer + the safehouse
   * and skip when the dealer float is ≤ 0 (nothing to ferry) or — both resolved — when the safehouse free headroom cannot
   * fit the whole float (the collect would refuse anyway). The collect's OWN guards remain the single authority — a race
   * between this pre-check read and the collect's guarded zero still surfaces as the benign 409 below.
   *
   * GUARDS: `assigned_building_id` (the dealer-spot) + `target_building_id` (the safehouse) are REQUIRED for a DISTRIBUTION
   * lieutenant (validateAssignment enforced them at recruit, so both are always set here). If either is null at apply-time
   * (a defensive impossibility), the apply is a benign logged no-op (nothing to collect / nowhere to deposit) — never a
   * crash. Likewise a dealer/safehouse that vanished between recruit and now → a benign no-op.
   *
   * BENIGN 409 NO-OP: a `RESOURCE_STATE_CONFLICT` from collect is EXPECTED in normal delegation —
   *   - empty float: the dealer accrued nothing since the last collect (float = 0 → 409);
   *   - safehouse full / insufficient headroom: the float does not FIT in the safehouse's remaining slot headroom (409);
   *   - concurrent-sell race: a DEALER_SELL tick changed the float between this binding's read and the collect's guarded
   *     zero → the guarded zero refuses (409, retryable).
   * — so it is CAUGHT here and logged as a benign no-op (the tick proceeds normally — the lieutenant simply retries next
   * tick on the fresh state; the collect tx rolled back, nothing moved). Any OTHER error PROPAGATES to the tick's
   * per-lieutenant try/catch (T6) — a genuine fault must not be swallowed.
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: DelegationLieutenant,
    _gameMinute: number, // unused — DISTRIBUTION's collect path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    const spotBuildingId = lieutenant.assigned_building_id;
    if (spotBuildingId === null) {
      return 'NOOP'; // no dealer-spot building → nothing to collect from (defensive — a delegated DISTRIBUTION lieutenant has one).
    }
    const safehouseBuildingId = lieutenant.target_building_id;
    if (safehouseBuildingId === null) {
      // target_building_id is REQUIRED at recruit (validateAssignment), so this is a defensive impossibility. Log + no-op
      // rather than crash the tick (never throw on a structural invariant the recruit already enforced).
      this.logger.warn(
        `applyExecuteDefault: DISTRIBUTION lieutenant=${lieutenant.lieutenant_id} has a null target_building_id ` +
          `(dealer_spot=${spotBuildingId}) — no collect (the safehouse target is required at recruit; should not happen).`,
      );
      return 'NOOP';
    }

    const dealer = await this.repo.getDealerForSpotBuilding(playerId, spotBuildingId);
    if (dealer === null) {
      return 'NOOP'; // the dealer vanished → nothing to collect from (benign no-op; recruit required it to exist).
    }
    const safehouse = await this.repo.getSafehouseForBuilding(playerId, safehouseBuildingId);
    if (safehouse === null) {
      return 'NOOP'; // the target safehouse vanished → nowhere to deposit (benign no-op).
    }

    // D2 R6 — LEK→LIEUTENANT PERFORMANCE MULTIPLIER (reputation_mechanics.md:135).
    // Compute the effective float to collect by reading the Lek Memory aggregate for the dealer's tile and
    // applying a multiplier. Zero-regression: no Lek Memory → neutral aggregate (8/15) → multiplier = 1.0
    // → effectiveFloatCents = floor(float × 1.0) = float → no DB adjustment → collect path is byte-identical.
    //
    // TILE: dealer.coverage_lek_tile_id (the lek cell the dealer occupies — the soft-ref tile the DISTRIBUTION
    // lieutenant inherits its reputation context from, per §2.3 / reputation_mechanics.md:135).
    // REUSE: LekMemoryService.getPositionMemoryAggregate (no parallel aggregate computation — grep proves REUSE).
    const lekTileId = dealer.coverage_lek_tile_id;
    const lekAggregate = await this.lekMemory.getPositionMemoryAggregate(playerId, lekTileId);
    const strength = reputationTunables.lekLieutenantPerfStrength;
    // Formula: multiplier = clamp(1.0 + strength × (aggregate_fraction − NEUTRAL_FRACTION) / NEUTRAL_FRACTION, 0.5, 2.0)
    // When aggregate_fraction = NEUTRAL_FRACTION (= 8/15): multiplier = 1.0 EXACTLY (zero-regression identity).
    const rawMultiplier = 1.0 + strength * (lekAggregate.aggregate_fraction - NEUTRAL_FRACTION) / NEUTRAL_FRACTION;
    const multiplier = Math.max(0.5, Math.min(2.0, rawMultiplier));
    // effectiveFloatCents: the float the lieutenant will actually collect (adjusted by the perf multiplier).
    const effectiveFloatCents = Math.floor(dealer.float_cents * multiplier);

    // PRE-CHECK (skip a doomed all-or-nothing call): nothing to ferry, or the effective float would not fit the headroom.
    if (effectiveFloatCents <= 0) {
      return 'NOOP'; // adjusted float is zero or negative → nothing to ferry; skip the round-trip.
    }
    const headroomCents = Math.max(0, safehouse.capacity_cents - safehouse.held_cents);
    if (effectiveFloatCents > headroomCents) {
      // The effective float does not fit the safehouse's remaining headroom → skip.
      // (The collect's exact guard remains the authority; this pre-check just avoids a doomed round-trip.)
      return 'NOOP';
    }

    // D2 R6 — Apply the Lek perf adjustment to the dealer float BEFORE calling collect (if multiplier ≠ 1.0).
    // When multiplier = 1.0 (no-Lek / neutral): effectiveFloatCents = dealer.float_cents → NO write → zero-regression.
    // When multiplier ≠ 1.0 (strong/stigmatized): set the dealer float to effectiveFloatCents, then collect ferries it.
    // The collect (all-or-nothing) reads the CURRENT float from DB and takes the whole thing — so adjusting first
    // ensures it takes exactly effectiveFloatCents. For the zero-regression case (multiplier = 1.0), floor(float × 1.0)
    // equals float exactly (integer), so this branch is never taken for the no-Lek path.
    if (effectiveFloatCents !== dealer.float_cents) {
      await this.repo.applyLekPerfAdjustment(playerId, dealer.dealer_id, effectiveFloatCents);
      this.logger.debug(
        `applyExecuteDefault: D2 R6 Lek perf adjustment for lieutenant=${lieutenant.lieutenant_id} ` +
          `tile=${lekTileId} aggregate=${lekAggregate.aggregate_fraction.toFixed(4)} ` +
          `multiplier=${multiplier.toFixed(4)} float=${dealer.float_cents}→${effectiveFloatCents}`,
      );
    }

    try {
      // collect's TWO id args are ENTITY ids (NOT building ids): dealerId = the dealer PK (getOwnedDealer by dealer_id),
      // safehouseId = the safehouse PK (getOwnedSafehouse by safehouse_id). The lieutenant stores only the BUILDING ids,
      // so the binding passes the resolved dealer.dealer_id + safehouse.safehouse_id (the entity ids) here.
      await this.selling.collect(playerId, dealer.dealer_id, safehouse.safehouse_id);
      return 'TAKEN';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        // Benign: the dealer float emptied / a race changed it between this binding's read and the collect's guarded zero,
        // or the safehouse headroom changed (a concurrent deposit). The delegated lieutenant simply takes no action this
        // tick (the collect tx rolled back, nothing moved) — NOT an error to propagate.
        this.logger.debug(
          `applyExecuteDefault: benign no-op for lieutenant=${lieutenant.lieutenant_id} ` +
            `dealer=${dealer.dealer_id} safehouse=${safehouse.safehouse_id} float=${effectiveFloatCents} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err; // any other fault propagates to the tick's per-lieutenant try/catch (T6).
    }
  }

  /** DISTRIBUTION salient manifest: dealer float high + uncollected, no collect rule → a teachable card. The baked rule's
   *  threshold equals the salient band so the taught rule fires on the same condition. */
  salientSignals(): SalientSignalSpec[] {
    const band = lieutenantTunables.distributionFloatSalientBand;
    const collect = {
      id: 'collect',
      label: 'Collect the float automatically',
      label_i18n: { key: 'exception.lieutenant_distribution.collect.label', params: {} }, // TD-455
      projected_consequence: 'The lieutenant sweeps the dealer float onward once it is high.',
      projected_consequence_i18n: { key: 'exception.lieutenant_distribution.collect.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: `WHEN STATE(dealer_float_cents,>=,${band}) THEN EXECUTE_DEFAULT @100;`,
      method: METHOD_BY_ACTION_ID.collect, // Lot 0 §1 D4 (C2).
    };
    return [
      {
        signal: 'dealer_float_cents',
        kind: 'STATE' as const,
        isSalient: (s) => typeof s.state.dealer_float_cents === 'number' && s.state.dealer_float_cents >= band,
        card: {
          event_descriptor: 'Dealer float is high and uncollected — the lieutenant has no collect rule.',
          candidate_actions: [
            collect,
            {
              id: 'acknowledge',
              label: 'Leave it for now',
              label_i18n: { key: 'exception.lieutenant_distribution.acknowledge.label', params: {} }, // TD-455
              projected_consequence: 'No rule is added; the float keeps growing.',
              projected_consequence_i18n: { key: 'exception.lieutenant_distribution.acknowledge.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: null,
              method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
            },
            // [lot-3 TD-074] 3rd candidate — collect only at a higher float threshold (less frequent collection).
            // Uses STATE(dealer_float_cents,>=,N) with N = band * 2 (double the salient band threshold) as the
            // "high threshold" analog. Valid DSL: STATE with numeric comparison on the same field.
            {
              id: 'collect_high',
              label: 'Collect only above a high threshold',
              label_i18n: { key: 'exception.lieutenant_distribution.collect_high.label', params: {} }, // TD-455
              projected_consequence: 'The lieutenant lets the float grow and only collects when it is high.',
              projected_consequence_i18n: { key: 'exception.lieutenant_distribution.collect_high.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: `WHEN STATE(dealer_float_cents,>=,${band * 2}) THEN EXECUTE_DEFAULT @100;`,
              method: METHOD_BY_ACTION_ID.collect_high, // Lot 0 §1 D4 (C2).
            },
          ],
          suggested_action: collect,
          confidence: 0.8,
          severity: 60,
          priority: 60,
        },
      },
    ];
  }
}
