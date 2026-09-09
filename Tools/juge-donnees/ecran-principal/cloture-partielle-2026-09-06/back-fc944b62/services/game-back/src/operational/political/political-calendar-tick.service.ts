// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C2 (city-global
//             NIGHTLY/19.5 calendar eval tick + electoral/budget triggers + overlap_max_active gate)
//             Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §3 (same-tick
//             overlay visibility) + §4.3 (overlap_max_active RULED: permanents count, over-cap SKIPPED)
//             Scheduler REUSE: services/game-back/src/operational/meta_market/meta-market-tick.service.ts
//             (`OnApplicationBootstrap` + `registerSystem` pattern).
//             — 04e-A2 C2 — 2026-07-05
//
// `PoliticalCalendarTickService` — the city-global NIGHTLY calendar eval tick (design §3, plan C2).
//
// SLOT (★ C0-M2 re-anchor finding, resolved here): the plan's original text assumed NIGHTLY/19 was
// free for this tick, but 04d-C's `META_MARKET_ANTICHEAT_TICK` already occupies NIGHTLY/19 (merged
// before 04e-A1 on this base), and NIGHTLY/20 is 04e-A1's own federal-investigator reconcile (which
// this tick's `reloadNow()` MUST land before, design §3 — "register the calendar tick at a NIGHTLY slot
// BEFORE the substrate reconciles it feeds"). `CitySimSchedulerService.registerSystem`'s sort comparator
// is a plain numeric `a.order - b.order` compare (city_sim_scheduler.service.ts:616) — NOT
// integer-constrained — so this tick registers at the FRACTIONAL slot **NIGHTLY/19.5**, strictly between
// META_MARKET_ANTICHEAT_TICK (19) and the federal reconcile (20), with zero renumbering of any existing
// NIGHTLY registration. `registerSystem` throws at boot if the (cadence, order) pair is not ALSO declared
// in the static `SCHEDULE` array (`city_sim_scheduler.service.ts`) — both sides are updated together in
// this same commit (this file's registration + the SCHEDULE/CitySystemId declarations).
//
// THE TICK BODY (per-player-firing, city-global-state — the established shape, IA_THRESHOLD_TICK /
// META_MARKET_RETENTION_TICK precedent): the city-sim engine is per-player-clocked (every dynamic row is
// keyed by player_id, `city_sim_scheduler.service.ts` header doc), so THIS tick's `run(ctx)` fires once
// per PLAYER's own NIGHTLY boundary crossing — yet the political calendar is explicitly CITY-GLOBAL
// (canon invariant #5 "affect ALL active players in city", design §5.2 "one shared active-event set").
// Idempotency is therefore NOT "this tick never runs twice for one player" but "this tick's EFFECT never
// double-applies for one in-game day, no matter how many different players' NIGHTLY firings land on it":
// `PoliticalEventRepository.claimGameDay` (an atomic row-locked claim on the `political_calendar_state`
// singleton) is the guard — only the FIRST caller to claim a given day evaluates triggers; every other
// (or later/earlier) caller for that day is a pure no-op.
//
// BOOTSTRAP (the very first tick ever, `previousGameDay === null`): there is no "previous month" to
// detect a boundary crossing AGAINST on a save's first night, so the bootstrap tick claims its day (
// establishing the watermark) and runs `revertExpired` + `reloadNow` (both harmless no-ops on an empty
// engine) but evaluates NO calendar trigger — an explicit, documented choice (not a canon requirement)
// that avoids an artificial "an election happens on your very first in-game day" surprise. Every
// SUBSEQUENT tick has a real previous day to compare against.
//
// ORDER OF OPERATIONS (matches plan text order — gate BEFORE apply, revert BEFORE gate so a freshly-
// expired slot is available to a same-day new activation):
//   1. claim the day (idempotency gate) — abort (no-op) if the claim is lost.
//   2. `EffectModifierService.revertExpired(gameDay)` — reclaims any now-expired timed modifiers' cap
//      slots (`political_event_active` rows are a LEDGER and are NEVER deleted here — only the
//      `effect_modifier` rows the engine owns; "currently active" is a query filter, see the repository).
//   3. evaluate the 2 calendar triggers (electoral, budget) — skipped entirely on the bootstrap tick.
//   4. `overlap_max_active` gate (RULED §4.3): count currently-active rows (permanents included); for
//      each due event, activate if under cap, else SKIP (never queued — re-evaluated fresh next tick,
//      deterministic, no backlog).
//   5. `await EffectOverlayStore.reloadNow()` — same-tick overlay visibility (design §3/A2-D2) for any
//      later same-NIGHTLY-run slot (the federal reconcile at /20) that reads the overlay this same tick.
//
// LIFECYCLE (04e-A2 C4 — refactor, behavior-preserving): the private `activateEvent` helper this file
// used to own (C2) has been EXTRACTED into `political-event-lifecycle.service.ts`
// (`PoliticalEventLifecycleService.activate`) — the SAME two calls in the SAME order
// (`insertActiveEvent` then `applyEvent`), now shared by every political trigger source (this tick,
// C5's substrate/DISTRICT triggers, C6's opposition-victory, C7's counter-play). This tick calls
// `this.lifecycle.activate(event, gameDay)` exactly where it used to call its own private method —
// zero behavioral change for E-POL-01/02/03 (`political_calendar_tick.spec.ts`, C2's own test floor,
// stays green unchanged, proving the extraction is behavior-preserving).
//
// C4 ADDITIONS (this chunk): 2 more GLOBAL events are now evaluated in the SAME due-event batch (SAME
// `overlap_max_active` cap-gate loop, so they compose correctly with the 3 calendar events for the cap):
//   - E-POL-04 (RANDOM_WEIGHTED_NOISE) — a seeded per-day roll weighted by the REAL, canon-cited
//     `scandal_random_weight_per_event_noise` getter (`evaluateRandomWeightedNoiseTrigger`). Guarded
//     against re-triggering while already active (E-POL-04 is PERMANENT — no natural expiry sweep would
//     otherwise stop a same-day/every-day re-roll from stacking duplicate modifiers).
//   - E-POL-06 (RANDOM_OR_AFTER_SCANDAL, deterministic half only) — chains off a REAL SCANDAL-category
//     `political_event_active` row activated THIS SAME gameDay (`evaluateAfterScandalTrigger` +
//     `PoliticalEventRepository.wasCategoryActivatedToday` — category-generic, so it activates for real
//     once C5 wires E-POL-09's own production trigger; the independent "Random" half of E-POL-06's OR has
//     no canon-cited probability and is parked as TD-158, see `political-trigger-evaluators.ts`'s own
//     doc comment). Also guarded against re-chaining while already active.
// E-POL-09's own effects (audit-pin substrate) and E-POL-10's own trigger (opposition-victory-at-
// electoral-end) remain OUT of this tick — C5/C6 respectively; C4's live-fire proof of E-POL-10's lawyer
// lever uses the gated test-only `force-activate`/`force-deactivate` hooks instead
// (`political-event-test.controller.ts`), calling the SAME shared `activate`/`deactivate` this tick uses.
//
// C6 ADDITIONS (this chunk — plan §C6): E-POL-10's own production trigger lands HERE, no longer
// force-activate-only, PLUS the permanent-until-election revert lifecycle for E-POL-10/E-POL-12:
//   - PERMANENT-UNTIL-ELECTION REVERT (design §3: "E-POL-10 + E-POL-12 revert at the next election, E-POL-01
//     activation"): when `boundaries.electoralDue` (a NEW E-POL-01 is about to (re)activate THIS tick — "the
//     next election"), any STILL-LIVE E-POL-10/E-POL-12 activation from the PREVIOUS cycle is reverted via
//     `PoliticalEventLifecycleService.revertPermanentUntilElection` (the explicit-revert half PLUS a ledger
//     stamp — see that method's own doc + `political-event.repository.ts`'s `markEventActiveExpired`) —
//     BEFORE the overlap-cap count is taken, so the freed slot is available to the SAME-tick's new
//     activations (matches `revertExpired`'s own "revert BEFORE gate" ordering). E-POL-04/E-POL-07 are
//     DIFFERENT permanents (game-state shifts, "revert only via explicit BO abort", design §3/L2) — NOT
//     touched by this loop; that BO-abort path lands at C9 (see TD-163 forward-note,
//     `political-event.repository.ts`'s `markEventActiveExpired` doc).
//   - OPPOSITION-VICTORY ROLL (E-POL-10, `OPPOSITION_VICTORY_ROLL`, catalogue.md :150 "End of the
//     ELECTORAL-category event"): evaluated EXACTLY on the gameDay E-POL-01's OWN ledger row expires
//     (`PoliticalEventRepository.wasEventExpiringToday('E-POL-01', gameDay)` — the SAME exact-same-day
//     discipline C4's `wasCategoryActivatedToday` already established for E-POL-06's chain trigger). A
//     SEEDED roll (`evaluateOppositionVictoryRoll`, C3, REUSED unchanged) weighted by the REAL per-player
//     citywide `HeatPropagationService.getCitywideBucket(playerId)` reading — the SAME per-player heat
//     accessor E-POL-11's own predicate already reads (design §6.4: "no cross-player aggregate exists",
//     an HONEST, established gap, not new). `playerId` is threaded from the REAL scheduler's `ctx.playerId`
//     (production) or defaults to a fixed placeholder for the pre-existing direct-probe callers that never
//     supply one (C2/C4's OWN `run-calendar-tick` test floors — unaffected: neither ever lands exactly on
//     an E-POL-01 expiry day, so this NEW branch never evaluates in their scenarios — zero regression).
//     Guarded against a stale/already-live E-POL-10 (`findLiveActiveEventId`) — by construction already
//     cleared by the SAME tick's own revert-at-next-election step above, on any PRIOR cycle. If opposition
//     wins, `E-POL-10` joins `dueEventIds` and competes for the `overlap_max_active` cap exactly like every
//     other due event (skip-if-over-cap, never queued — SAME fate as a skipped calendar boundary).
//
// C10 ADDITIONS (closeout — ★★ autonomous-triggering reconciliation, the C5/C6 reviewers' critical
// finding): after C0-C9, only E-POL-01/02/03/04/06/10 (6 of 12) ever reached `dueEventIds` autonomously —
// E-POL-05/07/08/09/11/12 fired ONLY via the test-only `force-activate` hook. This chunk wires the 2
// REMAINING triggers whose C3 evaluator already reads a REAL, already-persisted state source with NO
// missing producer (E-POL-05's territory-gain half, TD-156; E-POL-07's sustain counter, TD-157; E-POL-08's
// probability, TD-162; E-POL-09's `scandal_noise_accumulator` producer, TD-167 — all 4 stay genuinely
// blocked, TD'd, force-activate-only):
//   - E-POL-11 (`FEDERAL_BPD_AGGREGATE_AND_ELIMINATIONS`): `evaluateFederalTaskForceTrigger` combines the
//     REAL per-player citywide HeatBucket (`HeatPropagationService.getCitywideBucket`, the SAME accessor
//     E-POL-10's roll already reads — the SAME "no cross-player aggregate exists" honest precedent, design
//     §6.4, extended here rather than re-argued) with the REAL rolling-window count over
//     `rival_elimination_ledger` (`countRivalEliminationsInWindow`, C3's real bus-subscriber-fed table).
//     Neither input is missing a producer — this is exactly why it is wireable, unlike the 4 above. GLOBAL
//     scope, TIMED (a natural `revertExpired` sweep applies) — still guarded against re-triggering while
//     already active (`isEventCurrentlyActive`, mirrors E-POL-04's guard) so a persistently-true condition
//     does not stack duplicate modifiers day after day.
//   - E-POL-12 (`DISTRICT_SUSTAINED_GOOD_BEHAVIOR`): every district (`PoliticalEventRepository.
//     listAllDistrictIds`, the GLOBAL static `districts` table) has its REAL cohesion
//     (`readDistrictCohesion`) + REAL per-district HeatBucket (`HeatPropagationService.
//     getDistrictPeakBucket`) evaluated + its REAL sustained-window streak advanced
//     (`advanceDistrictSignalDay`, mig 0113, day-idempotent) EVERY tick this branch runs — a continuously
//     running real per-district measurement, independent of whether E-POL-12 itself is currently active
//     elsewhere (a district's good-behavior streak keeps accruing even while another district holds the
//     reform). A NEW activation is proposed only while NO E-POL-12 instance is already live (the ledger
//     carries no `scope_ref` column, so "currently active" is GLOBAL-per-event-id — only ONE district can
//     hold the "sympathetic district representative" reform at a time, mirrors E-POL-10's single-instance
//     guard) — the FIRST district (ascending id) to cross its sustained window this tick wins the slot,
//     threaded as `scopeRef` into `lifecycle.activate` (the activation loop below now threads a per-event
//     `scopeRef` map instead of always passing `null` — GLOBAL effects ignore it regardless, per
//     `PoliticalEventLifecycleService.activate`'s own "GLOBAL forces scope_ref null" contract). A district
//     never seeded for this player (`readDistrictCohesion` returns `null`) is skipped, never fabricated.
//     PERMANENT-UNTIL-ELECTION (null expiry) — reverts at the next election via the SAME
//     `ELECTION_BOUND_PERMANENT_EVENT_IDS` loop above (already includes 'E-POL-12').
//
// MERGE-GATE FIX (post-C10 — 04e-A2 merge-gate F1/F2): both new blocks above are now wrapped in their OWN
// try/catch (mirrors `LieutenantTickService.runTick`'s per-lieutenant isolation, `lieutenant-tick.
// service.ts`). Root cause: `countRivalEliminationsInWindow`/`readDistrictCohesion` filter a `uuid`-typed
// `player_id` column by the tick's threaded `playerId`; a caller supplying a non-UUID-shaped id (the C6
// floor's own pre-existing test fixture, authored before either trigger was wireable) makes Postgres raise
// `22P02 invalid input syntax for type uuid` — a hard DB error, not an "absent state" `null`/`0` — which
// propagated OUT of `runNightlyCalendarTick` uncaught and 500'd the whole tick (failing E-POL-01's own
// electoral/budget triggers evaluated in the SAME call). A NIGHTLY tick must NEVER 500: each block now
// degrades any failure (this one, or any other unexpected fault) to "not due this tick" — logged and
// contained, the SAME outcome an honestly-absent signal already produces, never a fabricated activation.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { EffectOverlayStore } from '../../config/effect-overlay-store';
import { HeatPropagationService } from '../../citysim/heat/heat-propagation.service';
import { EffectModifierService } from '../effect_engine/effect-modifier.service';
import { politicalEventsTunables } from '../effect_engine/effect-engine.tunables';
import { PoliticalEventRepository } from './political-event.repository';
import { PoliticalEventLifecycleService } from './political-event-lifecycle.service';
import {
  deriveGameDay,
  deriveMonthIndex,
  evaluateCalendarBoundaries,
  evaluateRandomWeightedNoiseTrigger,
  evaluateAfterScandalTrigger,
  evaluateOppositionVictoryRoll,
  evaluateFederalTaskForceTrigger,
  resolveBpdAggregateTriggerRank,
  heatBucketRank,
  FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS,
  evaluateDistrictConditionGoodToday,
  hasSustainedGoodBehavior,
} from './political-trigger-evaluators';
import { getPoliticalEventById } from './political-event-catalogue';
import { politicalTunables, EPOL12_DISTRICT_HEAT_CEILING_BUCKET } from './political.tunables';

/** The 2 PERMANENT-UNTIL-ELECTION event ids (design §3) — revert when the NEXT E-POL-01 activates. Distinct
 *  from E-POL-04/E-POL-07 (also PERMANENT, but "explicit BO abort only" — never touched by this list). */
const ELECTION_BOUND_PERMANENT_EVENT_IDS = ['E-POL-10', 'E-POL-12'] as const;

/** Fallback `playerId` for a direct-probe caller that omits one (the C2/C4 test floors' pre-existing
 *  `{ gameMinute }`-only `run-calendar-tick` calls) — the SAME "irrelevant playerId, GLOBAL-only" all-zero
 *  placeholder this test suite's own `readLevers()` helper already uses. `HeatPropagationService.
 *  getCitywideBucket` returns COLD for any id that never ticked — an honest, already-documented default
 *  (never a fabricated non-COLD reading). The REAL scheduler registration below always threads the real
 *  `ctx.playerId` instead. */
export const DEFAULT_CALENDAR_TICK_PLAYER_ID = '00000000-0000-0000-0000-000000000000';

/** The NIGHTLY slot this tick registers at — strictly between META_MARKET_ANTICHEAT_TICK (19) and the
 *  federal reconcile (20). See file header for the full re-anchor rationale. */
export const POLITICAL_CALENDAR_TICK_ORDER = 19.5;

/** Result of one `runNightlyCalendarTick` call — returned by the production path (logged) and the
 *  gated test-only direct-probe route (`political-event-test.controller.ts`, falsifiable assertions). */
export interface PoliticalCalendarTickResult {
  /** `false` iff this call lost the idempotency claim (a no-op — someone already evaluated this day
   *  or a later one). */
  readonly evaluated: boolean;
  readonly gameDay: number;
  /** Event ids activated THIS call (empty on the bootstrap tick / no boundary crossed / claim lost). */
  readonly activated: readonly string[];
  /** Event ids that were DUE this tick but SKIPPED because `overlap_max_active` was already reached
   *  (RULED §4.3 — never queued, re-evaluated fresh next tick). */
  readonly skippedOverCap: readonly string[];
  /** C6 — event ids explicitly reverted THIS tick via the permanent-until-election lifecycle (the next
   *  election boundary closing out a still-live E-POL-10/E-POL-12 from the previous cycle). Empty when no
   *  electoral boundary was due this tick, or none was live. */
  readonly revertedPermanents: readonly string[];
}

@Injectable()
export class PoliticalCalendarTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PoliticalCalendarTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly effectModifierService: EffectModifierService,
    private readonly repo: PoliticalEventRepository,
    private readonly lifecycle: PoliticalEventLifecycleService,
    // C6: the REAL per-player in-memory citywide HeatBucket accessor E-POL-10's opposition-victory roll
    // reads (design §6.4 — the SAME per-player accessor E-POL-11's own predicate already reads; no
    // cross-player aggregate exists, an honest, established gap, not new).
    private readonly heatPropagationService: HeatPropagationService,
  ) {}

  /**
   * Register `POLITICAL_CALENDAR_TICK` at NIGHTLY/19.5 on the shared scheduler at application
   * bootstrap. The slot is declared in `CitySimSchedulerService.SCHEDULE` + `CitySystemId` (C2
   * additions, same commit) — `registerSystem` throws at boot if it is not.
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.POLITICAL_CALENDAR_TICK,
      cadence: Cadence.NIGHTLY,
      order: POLITICAL_CALENDAR_TICK_ORDER,
      // C6: threads the REAL per-player ctx.playerId (always present, city_sim_system.ts's
      // CitySimTickContext) — used ONLY for the opposition-victory roll's heat reading; every other
      // branch of this tick stays gameMinute-derived-state-only, unchanged (C2's own header note).
      run: async (ctx) => { await this.runNightlyCalendarTick(ctx.gameMinute, ctx.playerId); },
    });
    this.logger.log(
      `PoliticalCalendarTickService: registered POLITICAL_CALENDAR_TICK at NIGHTLY/${POLITICAL_CALENDAR_TICK_ORDER} — ` +
      'each in-game night evaluates the electoral/budget calendar triggers (city-global idempotency via ' +
      'political_calendar_state.last_evaluated_game_day claim), applies newly-due events through the real ' +
      'EffectModifierService, and awaits EffectOverlayStore.reloadNow() for same-tick visibility before the ' +
      'federal reconcile at NIGHTLY/20.',
    );
  }

  /**
   * The tick body — a function of `gameMinute` alone (+ persisted, deterministic DB state). Called by
   * the real scheduler registration above (`ctx.gameMinute`) AND directly by the gated test-only
   * `run-calendar-tick` probe (`political-event-test.controller.ts`) with an explicit `gameMinute`,
   * bypassing the (expensive, per-minute) real clock-advance harness for large day/month jumps — the
   * SAME direct-probe pattern already established for other NIGHTLY boundary-heavy mechanics in this
   * codebase (e.g. `ia_investigation_lifecycle.spec.ts`'s "evaluate-threshold" probe).
   *
   * Determinism: NO `Math.random()`, NO `Date.now()` — every branch below is a pure function of
   * `gameMinute` (+ `playerId`, C6 — used ONLY for the opposition-victory roll's heat reading) + the
   * persisted `political_calendar_state`/`political_event_active` rows + the registered tunable getters
   * (all deterministic, DB-override-only).
   */
  async runNightlyCalendarTick(
    gameMinute: number,
    playerId: string = DEFAULT_CALENDAR_TICK_PLAYER_ID,
  ): Promise<PoliticalCalendarTickResult> {
    const inGameDayLengthMinutes = citySimTunables.inGameDayLengthMinutes;
    const gameDay = deriveGameDay(gameMinute, inGameDayLengthMinutes);

    const claim = await this.repo.claimGameDay(gameDay);
    if (!claim.claimed) {
      return { evaluated: false, gameDay, activated: [], skippedOverCap: [], revertedPermanents: [] };
    }

    // Reclaim any now-expired timed modifiers' effect BEFORE gating new activations on the cap (so a
    // freshly-expired event's slot is available to a same-day new activation, matching the plan's own
    // "applyEvent new + revertExpired(gameDay)" ordering intent).
    await this.effectModifierService.revertExpired(gameDay);

    const activated: string[] = [];
    const skippedOverCap: string[] = [];
    const revertedPermanents: string[] = [];

    // Bootstrap tick: no previous day to compare against — evaluate NO trigger (file header rationale).
    if (claim.previousGameDay !== null) {
      const monthMinutes = politicalEventsTunables.monthMinutes;
      const currentMonthIndex = deriveMonthIndex(gameMinute, monthMinutes);
      const previousMonthIndex = deriveMonthIndex(claim.previousGameDay * inGameDayLengthMinutes, monthMinutes);

      const boundaries = evaluateCalendarBoundaries(
        currentMonthIndex,
        previousMonthIndex,
        politicalEventsTunables.electoralCycleInGameMonths,
        politicalEventsTunables.budgetCycleInGameMonths,
      );

      // C6 — permanent-until-election revert (design §3): "the next election" = a NEW E-POL-01 about to
      // (re)activate THIS tick. Runs BEFORE the overlap-cap count below so a freed slot is available to
      // this SAME tick's new activations (mirrors revertExpired's own "revert before gate" ordering).
      // E-POL-04/E-POL-07 (also PERMANENT, but explicit-BO-abort-only) are NEVER touched by this loop.
      if (boundaries.electoralDue) {
        for (const permanentEventId of ELECTION_BOUND_PERMANENT_EVENT_IDS) {
          const liveActiveEventId = await this.repo.findLiveActiveEventId(permanentEventId, gameDay);
          if (liveActiveEventId !== null) {
            await this.lifecycle.revertPermanentUntilElection(liveActiveEventId, gameDay);
            revertedPermanents.push(permanentEventId);
            this.logger.log(
              `POLITICAL_CALENDAR_TICK: reverted permanent-until-election ${permanentEventId} ` +
              `(activeEventId=${liveActiveEventId}) — the next election just fired at gameDay=${gameDay}.`,
            );
          }
        }
      }

      const dueEventIds: string[] = [];
      if (boundaries.electoralDue) dueEventIds.push('E-POL-01');
      if (boundaries.budgetDue === 'INCREASE') dueEventIds.push('E-POL-02');
      if (boundaries.budgetDue === 'CUT') dueEventIds.push('E-POL-03');

      // C4 — E-POL-04 (RANDOM_WEIGHTED_NOISE): a seeded per-day roll, weighted by the REAL, canon-cited
      // scandal_random_weight_per_event_noise getter. Guarded against re-triggering while already active
      // (PERMANENT — no natural expiry sweep would otherwise stop a same-day/every-day re-roll from
      // stacking duplicate modifiers).
      if (!(await this.repo.isEventCurrentlyActive('E-POL-04', gameDay))) {
        const seed = `${gameDay}:E-POL-04:random_weighted_noise`;
        if (evaluateRandomWeightedNoiseTrigger(seed, politicalEventsTunables.scandalRandomWeightPerEventNoise)) {
          dueEventIds.push('E-POL-04');
        }
      }

      // C4 — E-POL-06 (RANDOM_OR_AFTER_SCANDAL, deterministic half only — see political-trigger-
      // evaluators.ts's own TD-158 doc comment for the honest "Random" gap): chains off a REAL
      // SCANDAL-category political_event_active row activated THIS SAME gameDay (E-POL-09, wired at C5 —
      // this check is category-generic, not E-POL-09-specific, so it activates automatically once C5
      // lands). Also guarded against re-chaining while already active.
      if (!(await this.repo.isEventCurrentlyActive('E-POL-06', gameDay))) {
        if (evaluateAfterScandalTrigger(await this.repo.wasCategoryActivatedToday('SCANDAL', gameDay))) {
          dueEventIds.push('E-POL-06');
        }
      }

      // C6 — E-POL-10 (OPPOSITION_VICTORY_ROLL): fires EXACTLY on the gameDay E-POL-01's OWN ledger row
      // expires ("at electoral end", catalogue.md :150) — mirrors E-POL-06's exact-same-day discipline
      // above. A SEEDED, heat-weighted roll (no Math.random) — `evaluateOppositionVictoryRoll` (C3,
      // REUSED unchanged). Guarded against a stale/already-live E-POL-10 (defensive — the revert loop
      // above already clears any PRIOR cycle's E-POL-10 before ITS OWN later expiry could recur).
      if (await this.repo.wasEventExpiringToday('E-POL-01', gameDay)) {
        if ((await this.repo.findLiveActiveEventId('E-POL-10', gameDay)) === null) {
          const heatBucket = this.heatPropagationService.getCitywideBucket(playerId);
          const seed = `${gameDay}:E-POL-10:opposition_victory:${playerId}`;
          const oppositionWins = evaluateOppositionVictoryRoll(
            seed, politicalEventsTunables.oppositionVictoryProbabilityBase, heatBucket,
          );
          this.logger.log(
            `POLITICAL_CALENDAR_TICK: E-POL-01 expired at gameDay=${gameDay} — opposition-victory roll ` +
            `(citywideBucket=${heatBucket}) => ${oppositionWins ? 'OPPOSITION WINS, E-POL-10 due' : 'opposition loses'}.`,
          );
          if (oppositionWins) dueEventIds.push('E-POL-10');
        }
      }

      // C10 — E-POL-11 (FEDERAL_BPD_AGGREGATE_AND_ELIMINATIONS): wireable — both inputs are REAL, no
      // missing producer (see file header C10 addendum). GLOBAL, TIMED — guarded against re-triggering
      // while already active (mirrors E-POL-04's guard for a persistently-true condition).
      //
      // ISOLATION (merge-gate fix — mirrors `LieutenantTickService.runTick`'s own per-lieutenant
      // try/catch, `lieutenant-tick.service.ts`: "a fault on ONE [unit] is logged and contained — it
      // never breaks the tick"): a NIGHTLY tick must NEVER 500. `countRivalEliminationsInWindow` filters
      // `rival_elimination_ledger.player_id` — a `uuid` column — by the threaded `playerId`; a caller
      // that supplies a non-UUID-shaped id (e.g. a direct-probe test fixture that predates this trigger)
      // makes Postgres raise `22P02 invalid input syntax for type uuid`, not an empty/absent-state
      // result. Caught here and DEGRADED to "not due this tick" — exactly the same outcome an absent
      // rival-elimination row set already produces (`eliminationsInWindowCount = 0` → trigger false) —
      // so this trigger source can never fail the tick for every OTHER due event evaluated the same call.
      try {
        if (!(await this.repo.isEventCurrentlyActive('E-POL-11', gameDay))) {
          const citywideBucket = this.heatPropagationService.getCitywideBucket(playerId);
          const citywideBucketRank = heatBucketRank(citywideBucket);
          const aggregateTriggerRank = resolveBpdAggregateTriggerRank(politicalEventsTunables.epol11BpdMemoryAggregateTrigger);
          const windowMinutes = politicalEventsTunables.monthMinutes * FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS;
          const eliminationsInWindowCount = await this.repo.countRivalEliminationsInWindow(playerId, gameMinute, windowMinutes);
          if (evaluateFederalTaskForceTrigger(citywideBucketRank, aggregateTriggerRank, eliminationsInWindowCount)) {
            this.logger.log(
              `POLITICAL_CALENDAR_TICK: E-POL-11 federal-task-force trigger true at gameDay=${gameDay} ` +
              `(citywideBucket=${citywideBucket}, eliminationsInWindowCount=${eliminationsInWindowCount}).`,
            );
            dueEventIds.push('E-POL-11');
          }
        }
      } catch (err) {
        this.logger.error(
          `POLITICAL_CALENDAR_TICK: E-POL-11 evaluation failed at gameDay=${gameDay} (playerId=${playerId}) — ` +
          `degraded to "not due" this tick, contained: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // C10 — E-POL-12 (DISTRICT_SUSTAINED_GOOD_BEHAVIOR): wireable — every district's REAL cohesion +
      // REAL HeatBucket, no missing producer (see file header C10 addendum). Every district's streak is
      // advanced EVERY tick this branch runs (a continuously-running real measurement), but a NEW
      // activation is only proposed while NO E-POL-12 instance is already live GLOBALLY (only ONE
      // district can hold the reform at a time — the ledger carries no scope_ref). The FIRST district
      // (ascending id) to cross its sustained window this tick wins the slot.
      //
      // ISOLATION (merge-gate fix — SAME rationale as E-POL-11 above): `readDistrictCohesion` filters
      // `district_cohesion.player_id` — ALSO a `uuid` column — by the SAME threaded `playerId`, so the
      // SAME malformed-id failure mode applies here. Caught and degraded to "not due this tick" (no
      // district's streak advances this call, no new activation is proposed) rather than propagating.
      let epol12ScopeRef: string | null = null;
      try {
        if (!(await this.repo.isEventCurrentlyActive('E-POL-12', gameDay))) {
          const districtIds = await this.repo.listAllDistrictIds();
          const cohesionFloor = politicalTunables.epol12DistrictCohesionFloor;
          const sustainWindowDays = politicalTunables.epol12DistrictSustainWindowDays;
          for (const districtId of districtIds) {
            const cohesion = await this.repo.readDistrictCohesion(playerId, districtId);
            if (cohesion === null) continue; // district never seeded for this player — no real signal yet, never fabricated.
            const heatBucket = this.heatPropagationService.getDistrictPeakBucket(playerId, districtId);
            const isGoodToday = evaluateDistrictConditionGoodToday(cohesion, heatBucket, cohesionFloor, EPOL12_DISTRICT_HEAT_CEILING_BUCKET);
            const snapshot = await this.repo.advanceDistrictSignalDay(districtId, gameDay, isGoodToday);
            if (epol12ScopeRef === null && hasSustainedGoodBehavior(snapshot.consecutiveGoodDays, sustainWindowDays)) {
              epol12ScopeRef = String(districtId);
              this.logger.log(
                `POLITICAL_CALENDAR_TICK: E-POL-12 district-sustained-good-behavior trigger true at ` +
                `gameDay=${gameDay} for districtId=${districtId} (consecutiveGoodDays=${snapshot.consecutiveGoodDays}).`,
              );
            }
          }
          if (epol12ScopeRef !== null) dueEventIds.push('E-POL-12');
        }
      } catch (err) {
        this.logger.error(
          `POLITICAL_CALENDAR_TICK: E-POL-12 evaluation failed at gameDay=${gameDay} (playerId=${playerId}) — ` +
          `degraded to "not due" this tick, contained: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (dueEventIds.length > 0) {
        // overlap_max_active gate (RULED §4.3): permanents count toward the cap; over-cap = SKIPPED, not
        // queued. activeCount is re-read once (post-revertExpired) then incremented in-process as this
        // tick's own activations land, so a 2nd due event this SAME tick sees the 1st's fresh slot used.
        let activeCount = await this.repo.countCurrentlyActive(gameDay);
        const cap = politicalEventsTunables.overlapMaxActive;
        for (const eventId of dueEventIds) {
          if (activeCount >= cap) {
            skippedOverCap.push(eventId);
            this.logger.warn(
              `POLITICAL_CALENDAR_TICK: ${eventId} due at gameDay=${gameDay} but SKIPPED — ` +
              `overlap_max_active=${cap} already reached (not queued, re-evaluated next tick).`,
            );
            continue;
          }
          const event = getPoliticalEventById(eventId);
          // C10 — E-POL-12 is the only currently-autonomous DISTRICT-scoped event; every other due event
          // here is GLOBAL (activate() forces scope_ref null for a GLOBAL effect regardless of what is
          // passed, PoliticalEventLifecycleService's own contract), so passing null for them is unchanged.
          const scopeRef = eventId === 'E-POL-12' ? epol12ScopeRef : null;
          await this.lifecycle.activate(event, gameDay, scopeRef);
          activated.push(eventId);
          activeCount += 1;
          this.logger.log(`POLITICAL_CALENDAR_TICK: activated ${eventId} at gameDay=${gameDay}.`);
        }
      }
    }

    // Same-tick overlay visibility (design §3/A2-D2) — safe only because the F2-RACE token guard (C0)
    // is in place; a later same-NIGHTLY-run slot (the federal reconcile, /20) sees today's state.
    await EffectOverlayStore.reloadNow();

    return { evaluated: true, gameDay, activated, skippedOverCap, revertedPermanents };
  }
}
