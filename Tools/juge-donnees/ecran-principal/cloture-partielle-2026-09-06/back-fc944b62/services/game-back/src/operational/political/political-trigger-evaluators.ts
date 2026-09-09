// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C2 (electoral/budget
//             calendar triggers, `month_minutes` calendar arithmetic)
//             Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §3
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md E-POL-01
//             ("Every electoral_cycle_in_game_months in-game months, fixed schedule"), E-POL-02/03
//             ("Quarterly (variable, budget_cycle_in_game_months)" — E-POL-03 "Opposite of E-POL-02").
//             — 04e-A2 C2 — 2026-07-05
//
// Pure, deterministic calendar-boundary predicates (NO `Math.random`, NO `Date.now()` — design
// "Determinism"). C2 scope: the 2 CALENDAR triggers only (electoral + budget). C3 adds the
// state-driven evaluators (rival-regime, scandal-noise, opposition-victory, BPD-aggregate,
// district-signal) — SIBLING functions in this SAME file (the plan's file-structure table: "C2 calendar
// + C3 state-driven").
//
// "Boundary crossing" (not "current value satisfies X"): every NIGHTLY tick recomputes `monthIndex =
// floor(gameMinute / month_minutes)` (political.tunables getter `monthMinutes`), but the tick fires
// once PER IN-GAME DAY, not once per month — so a trigger must fire ONLY on the tick where a NEW
// month/cycle boundary was just crossed since the LAST evaluated day, never on every day within an
// already-triggered month. This file compares the CURRENT `monthIndex` against the PREVIOUS evaluated
// tick's `monthIndex` (reconstructed by the caller from `political_calendar_state.last_evaluated_game_day`
// — see `political-calendar-tick.service.ts`) via a `floor(monthIndex / cycleLength)` cycle-counter: a
// crossing is detected when that counter's value INCREASED since the previous evaluation. This is
// mathematically identical to `monthIndex % cycleLength === 0` for the common single-day-step case (the
// city-sim engine's `advancePlayer` fires NIGHTLY sequentially, one day at a time — city_sim_scheduler.
// service.ts's `inGameCadencesCrossedAt` loop), but additionally stays CORRECT if a jump ever skips
// several months at once (e.g. a very large `advancePlayer` ticks argument, or a lagging caller
// catching up) — it fires the event exactly ONCE for the whole skipped span, never once-per-skipped-
// cycle. `political-calendar-tick.service.ts`'s bootstrap case (the very first tick ever,
// `previousGameDay === null`) never calls these functions at all — there is no "previous month" to
// compare against on a save's first night, so no trigger can be said to have "just crossed."

import type { HeatBucket } from '../../citysim/events/city-event-bus';
import { makeRng } from '../../common/seeded-rng';

/** Which budget-cycle phase is due at a crossed boundary (E-POL-02 = increase, E-POL-03 = cut). */
export type BudgetCyclePhase = 'INCREASE' | 'CUT';

/** The C2 calendar-trigger evaluation result for one NIGHTLY tick. */
export interface CalendarBoundaryEvaluation {
  /** `true` iff an electoral-cycle boundary was just crossed (E-POL-01 is due). */
  readonly electoralDue: boolean;
  /** The budget-cycle phase due this tick, or `null` if no budget-cycle boundary was crossed. */
  readonly budgetDue: BudgetCyclePhase | null;
}

/**
 * `deriveGameDay` — the in-game DAY a `gameMinute` value falls on (integer division; the NIGHTLY
 * cadence only ever fires on an exact multiple of `inGameDayLengthMinutes`, so this is exact, never a
 * lossy floor over a partial day in production — `city_sim_scheduler.service.ts`'s own `cadenceWidth`
 * uses the SAME `citySimTunables.inGameDayLengthMinutes` getter as the NIGHTLY cadence width).
 */
export function deriveGameDay(gameMinute: number, inGameDayLengthMinutes: number): number {
  return Math.floor(gameMinute / inGameDayLengthMinutes);
}

/**
 * `deriveMonthIndex` — the calendar MONTH `gameMinute` falls in, per `political_events.month_minutes`
 * (design §5.1, `politicalEventsTunables.monthMinutes` — a SEPARATE registry key from the in-game day
 * length, deliberately: "so a DB override can recalibrate the month length independently of the day
 * length", effect-engine.tunables.ts's own doc comment).
 */
export function deriveMonthIndex(gameMinute: number, monthMinutes: number): number {
  return Math.floor(gameMinute / monthMinutes);
}

/** One CALENDAR-driven event's next due in-game day (structural data only — no rendering). */
export interface CalendarDueEntry {
  readonly eventId: 'E-POL-01' | 'E-POL-02' | 'E-POL-03';
  readonly scheduledGameDay: number;
}

/** The cycle-length + calendar-arithmetic inputs `computeNextCalendarDueDays` needs (all REUSED getters — never inlined, R2.3). */
export interface CalendarCycleParams {
  readonly monthMinutes: number;
  readonly inGameDayLengthMinutes: number;
  readonly electoralCycleInGameMonths: number;
  readonly budgetCycleInGameMonths: number;
}

/**
 * `computeNextCalendarDueDays` — the NEXT due in-game day for each of the 3 CALENDAR-driven events
 * (E-POL-01 electoral, E-POL-02/03 budget), skipping any that is currently active (04e-A2 C9 extraction:
 * this was `PoliticalEventReadService`'s own private `computeUpcoming` cycle math, C8 — pulled out to a
 * shared pure function here so BOTH the player-facing qualitative `upcoming` bucket (C8,
 * `political-event-read.service.ts`) AND the BO raw `forecast` endpoint (C9, `political-admin.controller.ts`)
 * derive the SAME due-day numbers from ONE computation, never two independently-drifting copies of the
 * cycle math). Structural data only (`eventId` + `scheduledGameDay`) — each caller renders its OWN view
 * (qualitative vs raw) on top. Zero-regression: `political_player_surface.spec.ts` test (d) — C8's own
 * test floor — re-asserts the SAME numbers this function now produces, unchanged.
 */
export function computeNextCalendarDueDays(
  gameDay: number,
  activeEventIds: ReadonlySet<string>,
  params: CalendarCycleParams,
): CalendarDueEntry[] {
  const { monthMinutes, inGameDayLengthMinutes, electoralCycleInGameMonths, budgetCycleInGameMonths } = params;
  const currentMonthIndex = deriveMonthIndex(gameDay * inGameDayLengthMinutes, monthMinutes);

  const entries: CalendarDueEntry[] = [];

  // E-POL-01 — electoral cycle (fixed schedule).
  if (!activeEventIds.has('E-POL-01')) {
    const nextElectoralMonthIndex = (Math.floor(currentMonthIndex / electoralCycleInGameMonths) + 1) * electoralCycleInGameMonths;
    const scheduledGameDay = deriveGameDay(nextElectoralMonthIndex * monthMinutes, inGameDayLengthMinutes);
    entries.push({ eventId: 'E-POL-01', scheduledGameDay });
  }

  // E-POL-02/E-POL-03 — alternating budget-cycle phases (only the NEXT phase is "due").
  const nextBudgetCycleIndex = Math.floor(currentMonthIndex / budgetCycleInGameMonths) + 1;
  const nextBudgetMonthIndex = nextBudgetCycleIndex * budgetCycleInGameMonths;
  const nextBudgetEventId: 'E-POL-02' | 'E-POL-03' = nextBudgetCycleIndex % 2 === 0 ? 'E-POL-02' : 'E-POL-03';
  if (!activeEventIds.has(nextBudgetEventId)) {
    const scheduledGameDay = deriveGameDay(nextBudgetMonthIndex * monthMinutes, inGameDayLengthMinutes);
    entries.push({ eventId: nextBudgetEventId, scheduledGameDay });
  }

  return entries;
}

/**
 * `evaluateCalendarBoundaries` — the 2 C2 calendar triggers, both pure functions of
 * `(currentMonthIndex, previousMonthIndex, cycle lengths)`.
 *
 * Electoral (E-POL-01): due when `floor(currentMonthIndex / electoralCycleInGameMonths)` INCREASED
 * since `previousMonthIndex` — canon "every electoral_cycle_in_game_months in-game months, fixed
 * schedule" (catalogue.md E-POL-01).
 *
 * Budget (E-POL-02/03): "Quarterly (variable, budget_cycle_in_game_months)" for BOTH events, E-POL-03
 * explicitly "Opposite of E-POL-02" — i.e. the two ALTERNATE, never fire together. A boundary is
 * crossed when `floor(currentMonthIndex / budgetCycleInGameMonths)` (the "budget cycle index")
 * increased since `previousMonthIndex`; canon is silent on WHICH cycle index is "increase" vs "cut" —
 * this is a genuine, narrow, non-canon-affecting structural convention (same class of choice as
 * E-POL-07's literal target-0 "fully relaxed" constant, `political-event-catalogue.ts`): **even cycle
 * index = INCREASE (E-POL-02), odd = CUT (E-POL-03)**, so the very first budget-cycle boundary ever
 * crossed (cycle index 1 — index 0 is the bootstrap tick's own cycle, never itself a "crossing") is a
 * CUT. Documented here, not silently assumed; a coder-chosen convention, not a fabricated canon claim.
 */
export function evaluateCalendarBoundaries(
  currentMonthIndex: number,
  previousMonthIndex: number,
  electoralCycleInGameMonths: number,
  budgetCycleInGameMonths: number,
): CalendarBoundaryEvaluation {
  const currentElectoralCycleIndex = Math.floor(currentMonthIndex / electoralCycleInGameMonths);
  const previousElectoralCycleIndex = Math.floor(previousMonthIndex / electoralCycleInGameMonths);
  const electoralDue = currentElectoralCycleIndex > previousElectoralCycleIndex;

  const currentBudgetCycleIndex = Math.floor(currentMonthIndex / budgetCycleInGameMonths);
  const previousBudgetCycleIndex = Math.floor(previousMonthIndex / budgetCycleInGameMonths);
  const budgetCrossed = currentBudgetCycleIndex > previousBudgetCycleIndex;
  const budgetDue: BudgetCyclePhase | null = !budgetCrossed
    ? null
    : (currentBudgetCycleIndex % 2 === 0 ? 'INCREASE' : 'CUT');

  return { electoralDue, budgetDue };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// C3 — STATE-DRIVEN TRIGGER EVALUATORS (plan §C3, design §5.3/§6, decisions §4.2)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// Every function below is a PURE predicate over ALREADY-DERIVED primitive state (numbers/enums/
// booleans) — exactly the C2 discipline above (`evaluateCalendarBoundaries`): NO DB access, NO
// `Math.random`/`Date.now`, no service injection. The REAL state each predicate consumes is gathered
// by `political-event.repository.ts` (DB reads) or `HeatPropagationService` (the per-player in-memory
// HeatBucket accessor, design §6.4) — C3 wires those REAL readings into these predicates via the
// gated test-only probe routes (`political-event-test.controller.ts`); wiring them into the REAL
// NIGHTLY tick (so they actually decide `applyEvent`) is explicitly C4/C5 scope (plan's own C3/C4/C5
// split — "Do NOT wire the events to FIRE via applyEvent yet").
//
// HONEST GAPS (surfaced, not hidden — the same discipline as design §6's 4 gaps / L3/L5 honest-
// scaffolding): two of the state signals canon/design name have NO real persisted source ANYWHERE in
// this codebase today, and building one is out of C3's migration budget (decisions §5: only 0112/0113
// allocated). Both predicates below take the missing signal as an explicit boolean/count PARAMETER
// (never fabricated internally) so the function itself is still real, deterministic and falsifiable;
// deriving the parameter from real state is left for C4/C5 (or a routed TD if no real derivation
// exists by then):
//   - E-POL-05 `playerGainedTerritoryRecently` — canon (catalogue.md :101) gives no numeric/temporal
//     definition of "gained territory recently", and no table in this codebase tracks a player's
//     territory-acquisition history (buildings/rival_holding have no acquisition timestamp;
//     rival_holding tracks RIVAL-held blocks, not player-held ones). TD-156.
//   - E-POL-07 `consecutiveDaysAboveThreshold` — canon (catalogue.md :120) requires "sustained
//     `epol07_stack_utilization_window_days`", but no migration in this chunk's budget persists a
//     day-streak counter for Stack utilization (unlike E-POL-12, which mig 0113 explicitly budgets
//     for). `district_capacity_state.t_over` is a REAL day-streak counter but tracks a DIFFERENT
//     threshold (λ > 1.0, not `epol07_stack_utilization_threshold_pct`) — reusing it would silently
//     evaluate the wrong condition, so it is deliberately NOT reused here. TD-157.

/** Ordinal rank of a HeatBucket (COLD=0 < WARM=1 < HOT=2 < BURNING=3) — mirrors the SAME canonical
 *  order already established in `heat-tunables.ts`/`heat-propagation.service.ts`/`city-event-bus.ts`
 *  (those ranks are private to their own classes/modules — this is the local, read-only mirror C3's
 *  evaluators need; not a new ordering). */
const HEAT_BUCKET_RANK: Readonly<Record<HeatBucket, number>> = { COLD: 0, WARM: 1, HOT: 2, BURNING: 3 };

/** Map a HeatBucket NAME to its ordinal rank (for `<=`/`>=` comparisons against another bucket). */
export function heatBucketRank(bucket: HeatBucket): number {
  return HEAT_BUCKET_RANK[bucket];
}

// ─── E-POL-05 — Lobbying campaign by rival (rival-regime-weakness) ──────────────────────────────

/** The `rival_regime` pgEnum member set a rival can be in (conflict_rival.ts, migration 0081). */
export type RivalRegimeVal =
  | 'expansionary' | 'consolidating' | 'bleeding' | 'defensive' | 'retrench' | 'withdrawal';

/** The 2 regimes canon (catalogue.md :101) treats as "weak" — a lashing-out crisis trigger. */
const WEAK_RIVAL_REGIMES: ReadonlySet<RivalRegimeVal> = new Set(['bleeding', 'retrench']);

/**
 * `evaluateRivalRegimeWeakness` — E-POL-05's real predicate (catalogue.md :101: "Rival regime is
 * BLEEDING or RETRENCH AND player has gained territory recently"). `playerGainedTerritoryRecently` is
 * the honest-gap parameter (see file header, TD-156) — this function is otherwise a REAL, falsifiable
 * predicate over the REAL persisted `rival_state.regime` (read by `political-event.repository.ts`'s
 * `readRivalRegime`).
 */
export function evaluateRivalRegimeWeakness(
  regime: RivalRegimeVal,
  playerGainedTerritoryRecently: boolean,
): boolean {
  return WEAK_RIVAL_REGIMES.has(regime) && playerGainedTerritoryRecently;
}

// ─── E-POL-07 — Industrial zoning relaxation (stack-utilization, sustained) ─────────────────────

/**
 * `evaluateStackUtilizationSustained` — E-POL-07's real predicate (catalogue.md :120: Stack district
 * utilization > `epol07_stack_utilization_threshold_pct` sustained
 * `epol07_stack_utilization_window_days`). `consecutiveDaysAboveThreshold` is the honest-gap parameter
 * (see file header, TD-157); `utilizationPct` is REAL (`political-event.repository.ts`'s
 * `readStackDistrictUtilization`, `100 * q_total / k_current` for `districts.profile = 'stack'`).
 */
export function evaluateStackUtilizationSustained(
  utilizationPct: number,
  thresholdPct: number,
  consecutiveDaysAboveThreshold: number,
  sustainWindowDays: number,
): boolean {
  return utilizationPct > thresholdPct && consecutiveDaysAboveThreshold >= sustainWindowDays;
}

// ─── E-POL-09 — City Hall scandal (scandal-noise accumulator) ───────────────────────────────────

/**
 * `evaluateScandalNoiseThresholdCrossed` — E-POL-09's real predicate (catalogue.md :140: accumulated
 * city-event noise >= `epol09_scandal_noise_threshold`). Both inputs are REAL: `accumulator` is
 * `political_calendar_state.scandal_noise_accumulator` (mig 0111, incremented by
 * `political-event.repository.ts`'s `incrementScandalNoise`); `threshold` is
 * `politicalTunables.epol09ScandalNoiseThreshold` (registered A2-C1 getter, REUSED — never inlined).
 */
export function evaluateScandalNoiseThresholdCrossed(accumulator: number, threshold: number): boolean {
  return accumulator >= threshold;
}

// ─── E-POL-10 — Mayor opposition victory (seeded roll, heat-weighted) ───────────────────────────

/**
 * `OPPOSITION_HEAT_WEIGHT_REF` — the heat-bucket weighting applied to `opposition_victory_
 * probability_base` before the seeded roll (catalogue.md :150: "weighted by city heat",
 * `getCitywideBucket`). `[PROV-Y26Q2]` — canon gives no numeric weighting formula; this is a LOCAL
 * ref map (never a registry key — `opposition_victory_probability_base` itself is ALREADY registered,
 * A1-C1, and stays the single tunable R2.3 governs; this map only decomposes "weighted by heat" into
 * per-bucket multipliers, the SAME pattern `ia-target.service.ts`'s `SEVERITY_REF_MAP`/
 * `PROFILE_WEIGHT_REF_MAP` already establish for a registered composite's internal refs). A hotter
 * city plausibly emboldens the opposition (more visible enforcement pressure to campaign against) —
 * monotonically increasing by bucket rank.
 *
 * KEPT LOCAL AT C6 (confirmed, not promoted to a registry tunable): now that E-POL-10 goes autonomous-live
 * (C6, `political-calendar-tick.service.ts`), this map was re-examined against R2.3 — it stays a plain
 * local ref-map, NOT a `politicalTunables`/`gdd/14` key, for the SAME reason `BPD_AGGREGATE_TRIGGER_REF`/
 * `EPOL12_DISTRICT_HEAT_CEILING_BUCKET` (below) are deliberately non-registry: it only DECOMPOSES the
 * ALREADY-registered `opposition_victory_probability_base` into per-HeatBucket multipliers, never a
 * second independent balance magnitude of its own — the single tunable R2.3 governs for this trigger stays
 * `opposition_victory_probability_base` (REUSED, untouched).
 */
const OPPOSITION_HEAT_WEIGHT_REF: Readonly<Record<HeatBucket, number>> = {
  COLD: 0.7, // [PROV-Y26Q2]
  WARM: 1.0, // [PROV-Y26Q2] — the neutral baseline (no adjustment).
  HOT: 1.3, // [PROV-Y26Q2]
  BURNING: 1.6, // [PROV-Y26Q2]
};

/**
 * `evaluateOppositionVictoryRoll` — E-POL-10's real predicate (catalogue.md :150:
 * `opposition_victory_probability_base` weighted by city heat, a SEEDED roll — no `Math.random`).
 * `seed` MUST be derived from reproducible game state by the caller (e.g.
 * `${playerId}:${gameMinute}:opposition_victory` — the `makeRng` contract, `common/seeded-rng.ts`);
 * the SAME seed always produces the SAME result (the C3 determinism falsifiable proof).
 * `heatBucket` is REAL (`HeatPropagationService.getCitywideBucket(playerId)` — a per-player
 * in-memory accessor, design §6.4 no cross-player aggregate exists); `probabilityBase` is REAL
 * (`politicalEventsTunables.oppositionVictoryProbabilityBase`, A1-C1, REUSED).
 */
export function evaluateOppositionVictoryRoll(
  seed: string,
  probabilityBase: number,
  heatBucket: HeatBucket,
): boolean {
  const weighted = Math.min(1, Math.max(0, probabilityBase * OPPOSITION_HEAT_WEIGHT_REF[heatBucket]));
  return makeRng(seed).chance(weighted);
}

// ─── E-POL-11 — Federal task force (BPD-aggregate bucket + rival-elimination ledger) ────────────

/**
 * `BPD_AGGREGATE_TRIGGER_REF` — resolves the ALREADY-REGISTERED composite string
 * `politicalEventsTunables.epol11BpdMemoryAggregateTrigger` (A1-C1, default `'composite:aggregate_
 * high'`) to a HeatBucket rank threshold (design §6.2b: "reuse the HEAT `getCitywideBucket`... compare
 * to the `aggregate_high` bucket. Never a raw citywide float."). `[PROV-Y26Q2]` — a LOCAL ref map
 * (the SAME `SEVERITY_REF_MAP`-style pattern as the opposition-victory weight above), NOT a NEW
 * registry key (the composite key itself is already registered; this only decomposes it). `HOT`
 * (rank 2) for `aggregate_high` — the bucket NAME literally says "high", matching the existing
 * HeatBucket naming convention (`heat-tunables.ts`: HOT = "high" tier, BURNING = the more extreme
 * "escalated" tier); an unrecognized override string falls back to `HOT` (a safe, documented default
 * — never silently 0/always-true).
 */
const BPD_AGGREGATE_TRIGGER_REF: Readonly<Record<string, HeatBucket>> = {
  'composite:aggregate_high': 'HOT', // [PROV-Y26Q2]
  'composite:aggregate_extreme': 'BURNING', // [PROV-Y26Q2] — headroom for a future stricter override.
};

/** Resolve a `politicalEventsTunables.epol11BpdMemoryAggregateTrigger` composite string to its
 *  HeatBucket rank threshold (falls back to HOT — see `BPD_AGGREGATE_TRIGGER_REF` doc). */
export function resolveBpdAggregateTriggerRank(compositeTrigger: string): number {
  return heatBucketRank(BPD_AGGREGATE_TRIGGER_REF[compositeTrigger] ?? 'HOT');
}

/** Canon-literal (catalogue.md :161: "2+ rival eliminations in past 6 months") — a structural
 *  constant, not a balance dial (mirrors E-POL-07's literal target-0 precedent, `political-event-
 *  catalogue.ts`). NOT a registry tunable (R2.3 governs BALANCE magnitudes; this is the canon count
 *  itself). */
export const FEDERAL_TASK_FORCE_MIN_ELIMINATIONS = 2;

/** Canon-literal (catalogue.md :161: "past 6 months") — the rolling-window width, in MONTHS (the
 *  caller converts to game-minutes via `politicalEventsTunables.monthMinutes * FEDERAL_TASK_FORCE_
 *  ELIMINATION_WINDOW_MONTHS`, REUSING the already-registered `month_minutes` getter — no NEW
 *  tunable). */
export const FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS = 6;

/**
 * `evaluateFederalTaskForceTrigger` — E-POL-11's real predicate (catalogue.md :161: citywide BPD
 * memory aggregate bucket > threshold AND 2+ rival eliminations in the past 6 months). Both inputs
 * are REAL: `citywideBucketRank` from `heatBucketRank(HeatPropagationService.getCitywideBucket
 * (playerId))`; `eliminationsInWindowCount` from `political-event.repository.ts`'s
 * `countRivalEliminationsInWindow` (a REAL count over `rival_elimination_ledger` rows a REAL bus
 * subscriber appended).
 */
export function evaluateFederalTaskForceTrigger(
  citywideBucketRank: number,
  aggregateTriggerRank: number,
  eliminationsInWindowCount: number,
): boolean {
  return (
    citywideBucketRank >= aggregateTriggerRank &&
    eliminationsInWindowCount >= FEDERAL_TASK_FORCE_MIN_ELIMINATIONS
  );
}

// ─── E-POL-12 — Sympathetic district representative (per-district sustained good behavior) ─────

/**
 * `evaluateDistrictConditionGoodToday` — the SINGLE-DAY observation half of E-POL-12's real predicate
 * (decisions §4.2, RULED: `cohesion >= epol12_district_cohesion_floor` AND `HeatBucket <=
 * EPOL12_DISTRICT_HEAT_CEILING_BUCKET`). Both inputs are REAL: `cohesion` from
 * `political-event.repository.ts`'s `readDistrictCohesion` (the EXISTING `district_cohesion.cohesion`
 * table, seed 0.7); `heatBucket` from `HeatPropagationService.getDistrictPeakBucket(playerId,
 * districtId)`. The heat comparison uses `heatBucketRank` (COLD/WARM qualify, HOT/BURNING fail) —
 * R2.2-strict, never a raw heat float (decisions §4.2 sub-ruling).
 */
export function evaluateDistrictConditionGoodToday(
  cohesion: number,
  heatBucket: HeatBucket,
  cohesionFloor: number,
  heatCeilingBucket: HeatBucket,
): boolean {
  return cohesion >= cohesionFloor && heatBucketRank(heatBucket) <= heatBucketRank(heatCeilingBucket);
}

/**
 * `hasSustainedGoodBehavior` — the WINDOW half of E-POL-12's real predicate: the streak
 * (`political_district_signal_state.consecutive_good_days`, mig 0113, advanced by
 * `political-event.repository.ts`'s `advanceDistrictSignalDay`) has reached
 * `epol12_district_sustain_window_days` (`politicalTunables.epol12DistrictSustainWindowDays`, A2-C1,
 * REUSED).
 */
export function hasSustainedGoodBehavior(consecutiveGoodDays: number, sustainWindowDays: number): boolean {
  return consecutiveGoodDays >= sustainWindowDays;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// C4 — the 2 remaining GLOBAL trigger predicates (plan §C4: E-POL-04, E-POL-06). Same discipline as
// C2/C3 above: pure, deterministic (NO `Math.random`/`Date.now`), no DB access — the caller
// (`political-calendar-tick.service.ts`) gathers the REAL inputs and evaluates once per NIGHTLY tick.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// ─── E-POL-04 — Substance scheduling change (random, weighted by scandal noise) ─────────────────

/**
 * `evaluateRandomWeightedNoiseTrigger` — E-POL-04's real predicate (catalogue.md :93: "Random, weighted by
 * recent substance demand spikes via `political_events.scandal_random_weight_per_event_noise`"). A SEEDED
 * roll (no `Math.random`) that REUSES the ALREADY-REGISTERED `scandalRandomWeightPerEventNoise` getter
 * (A1-C1) directly as the per-evaluation activation probability — canon cites this EXACT tunable for this
 * EXACT trigger, so (unlike the opposition-victory heat-weighting above) no new local ref-map/weighting
 * layer is needed. `seed` MUST be derived from reproducible game state by the caller (the calendar tick's
 * own `${gameDay}:E-POL-04:random_weighted_noise` convention) so the SAME gameDay always produces the SAME
 * roll (determinism — the C4/C10 falsifiable proof).
 */
export function evaluateRandomWeightedNoiseTrigger(seed: string, weight: number): boolean {
  return makeRng(seed).chance(Math.min(1, Math.max(0, weight)));
}

// ─── E-POL-06 — Anti-corruption initiative (random OR after major scandal) ──────────────────────

/**
 * `evaluateAfterScandalTrigger` — the DETERMINISTIC half of E-POL-06's OR trigger (catalogue.md :110:
 * "Random OR after major scandal (E-POL-09)"). `scandalCategoryEventActivatedToday` is REAL: the caller
 * reads `political_event_active` for any SCANDAL-category row activated on the SAME gameDay
 * (`PoliticalEventRepository.wasCategoryActivatedToday` — category-generic, not E-POL-09-specific, so it
 * activates automatically once C5 wires E-POL-09's own production trigger; today it is exercised via a
 * seeded SCANDAL-category ledger row in the C4 test floor).
 *
 * HONEST GAP (surfaced, not hidden — mirrors TD-156/157's discipline): the OTHER half of this OR
 * ("Random") has NO canon-cited probability tunable (unlike E-POL-04's `scandal_random_weight_per_event_
 * noise`, which canon explicitly names for THAT trigger). Reusing that E-POL-04-specific tunable here
 * would misattribute a magnitude canon ties to a different event's different trigger — rather than
 * fabricate a new `[PROV-Y26Q2]` probability with no ruling, this predicate models ONLY the deterministic
 * "after major scandal" disjunct; the independent "Random" roll is parked as TD-158
 * (`docs_int/tech_debt_inventory.md`).
 */
export function evaluateAfterScandalTrigger(scandalCategoryEventActivatedToday: boolean): boolean {
  return scandalCategoryEventActivatedToday;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// C5 — the 1 remaining seeded-random trigger predicate (plan §C5: E-POL-08). Same discipline as
// C2/C3/C4 above: pure, deterministic (NO Math.random/Date.now), no DB access.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// ─── E-POL-08 — Riverfront crackdown (seeded-random only, L5) ──────────────────────────────────

/**
 * `evaluateRandomSeededTrigger` — E-POL-08's real predicate (catalogue.md :127: "Random OR after high
 * port-inspection seizure" — L5 RULED: A2 wires ONLY the "Random" disjunct; the port-inspection-seizure
 * half is TD-154). A SEEDED roll (no `Math.random`) — mirrors `evaluateRandomWeightedNoiseTrigger`'s
 * exact shape (E-POL-04, above).
 *
 * HONEST GAP (mirrors TD-156/157/158's discipline): canon gives NO probability magnitude for this
 * disjunct (unlike E-POL-04, which cites `scandal_random_weight_per_event_noise` BY NAME for its own
 * random trigger) — there is no ruling to mint a NEW `[PROV-Y26Q2]` balance tunable here.
 * `probabilityPerDay` is therefore an EXPLICIT caller-supplied parameter (never fabricated internally),
 * the SAME honest-gap discipline as `evaluateRivalRegimeWeakness`/`evaluateStackUtilizationSustained`.
 * Wiring an AUTONOMOUS per-day production roll into the real NIGHTLY tick needs a ruled probability this
 * chunk does not invent — routed as **TD-162** (`docs_int/tech_debt_inventory.md`). This function is
 * otherwise real, deterministic and falsifiable in isolation; C5's live-fire double-proof drives the REAL
 * `PoliticalEventLifecycleService.activate` (→ `EffectModifierService.applyEvent`) via the SAME
 * `force-activate` hook C4 established for E-POL-10 (whose own trigger is likewise chunk-deferred) —
 * never a mock.
 */
export function evaluateRandomSeededTrigger(seed: string, probabilityPerDay: number): boolean {
  return makeRng(seed).chance(Math.min(1, Math.max(0, probabilityPerDay)));
}
