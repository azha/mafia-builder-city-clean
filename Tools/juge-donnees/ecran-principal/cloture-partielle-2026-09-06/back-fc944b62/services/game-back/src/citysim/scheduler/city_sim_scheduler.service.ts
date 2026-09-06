// IMPLEMENTS: docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §NestJS — backend jeu
//             (4 tick loops + circuit-breaker + RAM watermark) + cross_system_interactions.md §Ordre DAG
//             canonique (the SCHEDULE static config) + composition_overview.md §NestJS — backend jeu
//             -- session:2026-06-02 (Phase 1 Task 1) --
//
// `CitySimSchedulerService` — the multi-cadence engine. T1 SCOPE: the ENGINE + the deterministic
// clock-advance harness. It runs end-to-end with ZERO real systems via an ordered system-hook registry
// (no-op placeholders day-1); T2–T13 register real `CitySimSystem`s at their cadence + DAG order.
//
// The city sim is PER-PLAYER: every dynamic state row is keyed by player_id, and the clock is the
// per-save `city_sim_clock` (PK player_id seul). The continuous loops tick all players that HAVE a
// city_sim_clock row (bounded + simple day-1); the deterministic advance harness targets one player.

import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import { pool } from '../../db/index';
import type { DrizzleClient } from '../../db';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { cityEpoch } from '../../db/schema/city_epoch';
import { gameplaySessionRow } from '../../db/schema/sessions_and_audit';
import { citySimTunables } from '../citysim-tunables';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';
import { Cadence, CitySystemId, type CitySimSystem, type CitySimTickContext } from './city_sim_system';
import { OperationalStateGuardService } from './operational-state-guard.service';
import { CITYSIM_CLOCK, CITYSIM_CLOCK_EPOCH_FLOOR, type LiveOpsClockPort } from './city-sim-clock.port';

/** Internal scheduler signal (NOT a cross-system CityEvent) — emitted on circuit-breaker degradation. */
export interface TickOverrunEvent {
  cadence: Cadence;
  consecutiveOverruns: number;
  lastDurationMs: number;
  thresholdMs: number;
  degradedToHz: number;
}

/** Per-cadence duration metric (day-1 in-memory; the SLI surface — exposed to BO later via getStats). */
interface CadenceMetric {
  runs: number;
  lastDurationMs: number;
  maxDurationMs: number;
  overruns: number;
}

/**
 * Per-system profiling metric — accumulated when CITYSIM_PROFILE=on (flag-gated; zero overhead when off).
 * Key format: `${cadence}/${systemId}` (e.g. "minute/ERLANG_STASH").
 * `totalMs` and `calls` are the raw accumulators; `msPerCall` and `pctOfTotal` are derived at read-time.
 */
export interface SystemProfileMetric {
  key: string;
  cadence: string;
  systemId: string;
  totalMs: number;
  calls: number;
  msPerCall: number;
  pctOfTotal: number;
}

/** Summary returned by the deterministic advance harness (the test-only driver). */
export interface AdvanceSummary {
  player_id: string;
  game_minute: number;
  advanced_by: number;
  /** How many times each cadence handler fired across the crossed span. */
  cadences_fired: Record<string, number>;
}

const TWO_HZ_REAL_MS = 500; // 2 Hz = one real-time step every 500 ms (tick_schedule §NestJS: "setInterval 500ms").
const DEGRADED_HZ = 1; // circuit-breaker target on 3 consecutive overruns (tick_schedule §Circuit-breaker).
const CONSECUTIVE_OVERRUN_LIMIT = 3; // 3 consecutive overruns → degrade (tick_schedule §Circuit-breaker).
const CITY_SIM_TICK_OVERRUN_EVENT = 'tick_overrun'; // internal bus event for the tick circuit-breaker.
// W1.1-d C3 — fixed advisory-lock key for the continuous-loop tour's inter-instance mutual exclusion
// (`withCitySimTourLock`, below). A single constant string, never per-player — this lock protects the
// TOUR as a whole (one game-back replica ticking the whole session-fresh population + city_epoch per
// period), not a per-row claim (unlike every OTHER `hashtext(...)` advisory-lock call site in this
// codebase, which locks per-player/per-(game_day,district) — R2.3 N/A here: this is a fixed protocol
// constant, not a tunable value).
const CITYSIM_TOUR_LOCK_KEY = 'citysim-continuous-tour';

@Injectable()
export class CitySimSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CitySimSchedulerService.name);

  /**
   * SCHEDULE = the canonical DAG order per cadence (cross_system_interactions.md §Ordre DAG canonique).
   * STATIC config — the order is declared here, never ad-hoc in system services. T2–T13 register a
   * `CitySimSystem` whose (cadence, order) MUST match a slot below; `registerSystem` validates membership
   * so an out-of-band registration fails loud. Day-1 every slot is a no-op placeholder.
   *
   * NOTE: `FIVE_MIN` (System 2 schedule update) and `ON_EVENT` (System 3 Police Memory) are real cadences
   * the engine drives; they are listed here so the registry shape is complete from day-1.
   */
  static readonly SCHEDULE: ReadonlyArray<{
    cadence: Cadence;
    order: number;
    id: CitySystemId;
  }> = [
    // [2 Hz] System 1 → System 11 → System 2 (composition_overview §Tick schedule canonique).
    { cadence: Cadence.TWO_HZ, order: 1, id: CitySystemId.FLOW_CELLS },
    { cadence: Cadence.TWO_HZ, order: 2, id: CitySystemId.DEAL_LEK },
    { cadence: Cadence.TWO_HZ, order: 3, id: CitySystemId.SPARSE_CITIZENS },
    // [Every minute] System 9 → System 8 → System 10 → Heat → System 3 observation flush.
    { cadence: Cadence.MINUTE, order: 1, id: CitySystemId.ERLANG_STASH },
    { cadence: Cadence.MINUTE, order: 2, id: CitySystemId.THROUGHPUT_TRILEMMA },
    { cadence: Cadence.MINUTE, order: 3, id: CitySystemId.BUFFER_BLOAT },
    { cadence: Cadence.MINUTE, order: 4, id: CitySystemId.HEAT },
    // System 3 Police Memory OBSERVATION FLUSH (system_3_police_memory.md §Update tick Tick 1 "par
    // observation, immédiat"). System 3's Tick 1 is event-driven (CityEventBus subscriber): each event bumps
    // an in-memory suspicion_map tile of the owning precinct. This MINUTE slot is the PERSISTENCE cadence for
    // that accumulation — it flushes the dirty per-player suspicion buffers to `precinct_memory` once per
    // in-game minute (a single batched UPDATE, NOT per-event round-trips). ADDED to the canonical SCHEDULE
    // because the original tick-synthesis listed System 3 only at ON_EVENT and did not specify where the
    // event-accumulated belief is persisted; per-minute is the natural flush cadence (Tick 1 is "immédiat").
    // Placed LAST in the minute band (order 5) so it runs after the minute systems + Heat that may inject
    // suspicion-relevant events in the same minute.
    { cadence: Cadence.MINUTE, order: 5, id: CitySystemId.POLICE_MEMORY },
    // Phase 2 — OPERATIONAL conversion-setup advancer (NOT a city-sim system; an operational-chain tick-hook on the
    // SAME scheduler). Placed LAST in the minute band (order 6, after POLICE_MEMORY/5) — it depends on nothing in the
    // minute band and is a self-contained setup-timer advance, so running it last keeps the city-sim DAG untouched.
    // Each minute it decrements setup_remaining_ticks on in-progress building conversions and flips
    // conversion_stage → 'operational' when the timer reaches 0 (ConversionSetupService, Phase 2 T1).
    { cadence: Cadence.MINUTE, order: 6, id: CitySystemId.OPERATIONAL_SETUP },
    // Phase 2 — OPERATIONAL precursor-arrival advancer (NOT a city-sim system; an operational-chain tick-hook on the
    // SAME scheduler). Placed in the minute band after OPERATIONAL_SETUP (order 7) — it depends on nothing in the
    // minute band and is a self-contained order-arrival advance, so running it after setup keeps the city-sim DAG
    // untouched. Each minute it delivers pending precursor_orders whose arrives_at_tick <= the current tick: marks
    // them 'delivered' and increments precursor_stock in batched set-based SQL (PrecursorArrivalService, Phase 2 T2).
    { cadence: Cadence.MINUTE, order: 7, id: CitySystemId.PRECURSOR_ARRIVAL },
    // Phase 2 — OPERATIONAL Brindle cook-advance advancer (NOT a city-sim system; an operational-chain tick-hook on the
    // SAME scheduler). Placed in the minute band after PRECURSOR_ARRIVAL (order 8) — it depends on nothing in the
    // minute band and is a self-contained cook-stage advance, so running it after arrival keeps the city-sim DAG
    // untouched. Each minute it advances in-progress cook_sessions one functional stage at a time per the uniform
    // stage-duration clock, and on stage_4 completion yields the finished Brindle into product_storage in batched
    // set-based SQL (ProductionCookAdvanceService, Phase 2 T3).
    { cadence: Cadence.MINUTE, order: 8, id: CitySystemId.COOK_ADVANCE },
    // Phase 2 — OPERATIONAL foot-courier transit advancer (NOT a city-sim system; an operational-chain tick-hook on the
    // SAME scheduler). Placed in the minute band after COOK_ADVANCE (order 9) — it depends on nothing in the minute
    // band and is a self-contained transit advance, so running it after cook-advance keeps the city-sim DAG untouched.
    // Each minute it advances in-transit courier_shifts along their route by the foot-speed-derived transit duration,
    // and on arrival transfers the carried cargo into the destination product_storage in batched set-based SQL
    // (DistributionTransitService, Phase 2 T4).
    { cadence: Cadence.MINUTE, order: 9, id: CitySystemId.COURIER_TRANSIT },
    // Phase 2 — OPERATIONAL dealer-sell advancer (NOT a city-sim system; an operational-chain tick-hook on the SAME
    // scheduler). Placed in the minute band after COURIER_TRANSIT (order 10) — it depends on nothing in the minute
    // band and is a self-contained sell advance, so running it after courier-transit (whose arrivals top up the
    // dealer-spot product_storage) keeps the city-sim DAG untouched. Each minute it sells product at every WORKING
    // dealer at a lek-present dealer-spot: decrements the dealer-spot product_storage (guarded, min(rate, available))
    // and increments dealer.float_cents by amount × deal value, in batched set-based SQL (SellingService, Phase 2 T5).
    // CONSUMES deal_leks (System 11 — lek presence read, never recomputed) — no sibling-system reimplementation.
    { cadence: Cadence.MINUTE, order: 10, id: CitySystemId.DEALER_SELL },
    // Phase 2 — OPERATIONAL laundering clean-output advancer (NOT a city-sim system; an operational-chain tick-hook on
    // the SAME scheduler). Placed in the minute band after DEALER_SELL (order 11) — it READS the cleanliness_at_output
    // System 8 recomputed at MINUTE/2 earlier in the SAME per-minute span (System 8 → … → LAUNDER_OUTPUT), so the
    // cleanliness it consumes is the freshest. Each minute it releases the laundered cash of every Stage-1 node whose
    // cleanliness reached the clean band into economy_states.cash_cents (minus the modest dwell-tax cut) and zeroes
    // tail_risk_estimates.current_occupancy (buffer_load re-syncs to 0 on System 10's next tick), in batched set-based
    // SQL (LaunderingOutputService, Phase 2 T6). CONSUMES System 8 (cleanliness READ, never recomputed) — no
    // sibling-system reimplementation.
    { cadence: Cadence.MINUTE, order: 11, id: CitySystemId.LAUNDER_OUTPUT },
    // Phase 2 — OPERATIONAL heat-contribution advancer (NOT a city-sim system; an operational-chain tick-hook on the
    // SAME scheduler). Placed LAST in the minute band (order 12, after LAUNDER_OUTPUT/11) — it depends on nothing in
    // the minute band and only EMITS HeatInjectionEvents (it writes no DB state), so running it last keeps the
    // city-sim DAG untouched. Each minute it reads each product-HOLDING building (product_storage > 0) and emits a
    // storage-magnitude HeatInjectionEvent on the CityEventBus; System Heat (MINUTE/4) buffers + flushes it onto
    // buildings.heat on its NEXT tick (the cross-minute buffer the seam already uses). The cook-completion + per-deal
    // heat contributions are point-emissions at COOK_ADVANCE/8 + DEALER_SELL/10; this slot owns ONLY the per-tick
    // storage contribution (HeatContribService, Phase 2 T7). CONSUMES System Heat (the HeatInjection seam — never
    // reimplements the decay/propagation/escalation engine — R9.3).
    { cadence: Cadence.MINUTE, order: 12, id: CitySystemId.OPERATIONAL_HEAT_CONTRIB },
    // Phase 2b — OPERATIONAL raid-execution FLUSH (NOT a city-sim system; an operational-chain tick-hook on the SAME
    // scheduler). Placed LAST in the minute band (order 13, after OPERATIONAL_HEAT_CONTRIB/12) — it depends on nothing
    // in the minute band; it DRAINS the buffer of RaidPlannedEvents the RaidExecutionService accumulated on the
    // CityEventBus (the buffer-on-event + flush-on-tick discipline HeatPropagationService established — onRaidPlanned
    // BUFFERS synchronously, never a per-event DB write) and executes the seizures set-based in a transaction: for the
    // player's operational product-holding buildings (lab/stash) on each raided block, seizes product_storage,
    // transitions structural_state → 'damaged', inserts a building_raid ledger row (RaidExecutionService, Phase 2b T1).
    // CONSUMES the existing RaidPlannedEvent (System 4 — never reimplements raid-decision logic). Deterministic (NO RNG).
    { cadence: Cadence.MINUTE, order: 13, id: CitySystemId.RAID_EXECUTION },
    // Phase 2b — OPERATIONAL repair-completion advancer (NOT a city-sim system; an operational-chain tick-hook on the
    // SAME scheduler). Placed LAST in the minute band (order 14, after RAID_EXECUTION/13) — it depends on nothing in
    // the minute band and is a self-contained completion-timer flip, so running it last keeps the city-sim DAG
    // untouched. Each minute it set-based flips every 'repairing' building whose repair_completes_at_tick <= the
    // current tick back to structural_state='operational' (NULLing the timer) + moves the corresponding building_raid
    // row status repairing → repaired. The cook/storage/deal ticks gate on structural_state='operational' (T2), so a
    // repaired building's ops RESUME from the next tick (OperationalRepairService, Phase 2b T3). Deterministic (NO RNG).
    { cadence: Cadence.MINUTE, order: 14, id: CitySystemId.OPERATIONAL_REPAIR },
    // Phase 2b — OPERATIONAL Crick cold-chain degrade advancer (NOT a city-sim system; an operational-chain tick-hook on
    // the SAME scheduler). Placed LAST in the minute band (order 15, after OPERATIONAL_REPAIR/14) — it depends on nothing
    // in the minute band and is a self-contained set-based decrement, so running it last keeps the city-sim DAG
    // untouched. Each minute it degrades the player's WARM cold-chain product set-based: a STORED Crick holding in a
    // non-cold building loses the MODERATE per-tick grams rate; an IN-TRANSIT Crick cargo on a non-refrigerated courier
    // loses the HOT per-tick grams rate (both GUARDED ≥ 0). Cold holdings + refrigerated_van cargo are preserved; Brindle
    // (coldChain=false) is never selected (ColdChainDegradeService, Phase 2b T5). Deterministic (NO RNG). Organically a
    // no-op (no warm Crick).
    { cadence: Cadence.MINUTE, order: 15, id: CitySystemId.COLD_CHAIN_DEGRADE },
    // Phase 2b vector #2b — OPERATIONAL Hush addiction-loyalty decay/withdrawal advancer (NOT a city-sim system; an
    // operational-chain tick-hook on the SAME scheduler). Placed LAST in the minute band (order 16, after
    // COLD_CHAIN_DEGRADE/15) — it depends on nothing in the minute band and is a self-contained set-based aging, so
    // running it last keeps the city-sim DAG untouched. It runs AFTER DEALER_SELL/10 in the same minute, which is
    // correct: the selling tick's accumulation (+increment per Hush deal) stamps last_hush_deal_tick=currentTick, so
    // this tick's decay correctly SKIPS spots that sold this tick. Each minute it ages the player's Hush dealer-spot
    // loyalty (hush_addiction) in TWO DISJOINT set-based UPDATEs: an un-served SUB-DEPENDENT spot DECAYS toward NEW
    // (GUARDED ≥ 0); a DEPENDENT spot gone dry past the withdrawal window WITHDRAWS (collapse to established−1 +
    // withdrawn=true). Brindle/Crick (addiction=false) have no hush_addiction row → never touched
    // (HushAddictionAdvanceService, Phase 2b vector #2b T5). Deterministic (NO RNG). Organically a no-op (no Hush row).
    { cadence: Cadence.MINUTE, order: 16, id: CitySystemId.HUSH_ADDICTION },
    // Phase-2c vector #2c — OPERATIONAL Ash appointment-expiry advancer (NOT a city-sim system; an operational-chain
    // tick-hook on the SAME scheduler). Placed LAST in the minute band (order 17, after HUSH_ADDICTION/16) — it depends
    // on nothing in the minute band and is a self-contained set-based sweep, so running it last keeps the city-sim DAG
    // untouched. Each minute it flips every SCHEDULED Ash appointment (ash_appointment) gone past its window
    // (expires_at_tick < currentTick) to EXPIRED in ONE set-based UPDATE (status='expired' WHERE status='scheduled' AND
    // expires_at_tick < currentTick). A HONORED/EXPIRED booking is never touched; honor (T8) flips SCHEDULED → honored
    // before the window, so an honored booking is excluded by the status predicate. Brindle/Crick/Hush have no
    // ash_appointment row → never touched (AshAppointmentAdvanceService, Phase-2c vector #2c T7). Deterministic (NO RNG).
    // Organically a no-op (no SCHEDULED booking past its window).
    { cadence: Cadence.MINUTE, order: 17, id: CitySystemId.APPOINTMENT_EXPIRE },
    // Phase-3 vector #3 — OPERATIONAL grow_house GROW_ADVANCE advancer (NOT a city-sim system; an operational-chain
    // tick-hook on the SAME scheduler). Placed LAST in the minute band (order 18, after APPOINTMENT_EXPIRE/17 — the next
    // FREE slot) — it depends on nothing in the minute band and is a self-contained set-based grow-stage walk, so running
    // it last keeps the city-sim DAG untouched. Each minute it advances every in-progress grow_session (current_stage <>
    // 'completed') whose stage clock has elapsed (stage_started_at_tick + grow.stage_duration_ticks <= currentTick) ONE
    // grow stage (stage_1→stage_2→stage_3→completed) in ONE set-based UPDATE, re-anchoring stage_started_at_tick =
    // currentTick + CLEARING tended_in_stage (the new stage is tendable again). A grow that reaches 'completed' STOPS
    // advancing (it waits for T5's harvest). Sibling of COOK_ADVANCE/8 but yields a precursor (T5), not a product
    // (GrowAdvanceService, Phase-3 vector #3 T3). Deterministic (NO RNG). Organically a no-op (no in-progress grow).
    { cadence: Cadence.MINUTE, order: 18, id: CitySystemId.GROW_ADVANCE },
    // Phase-6 vector #6 — OPERATIONAL lieutenant DELEGATION advancer (NOT a city-sim system; an operational-chain
    // tick-hook on the SAME scheduler). Placed LAST in the minute band (order 19, after GROW_ADVANCE/18 — the next FREE
    // slot, MINUTE/19 having been freed when MONEY_HOLDING_AUDIT moved to the SLOW 12-h band) — it depends on nothing in
    // the minute band and is a self-contained per-player delegated-lieutenant scan, so running it last keeps the city-sim
    // DAG untouched. Each minute it selects the player's DELEGATED valid-script lieutenants (mode='delegated' AND
    // granted_role='executor' joined to behavior_script.valid=true); for EACH (per-lieutenant try/catch — one bad
    // lieutenant never breaks the tick or another lieutenant) it builds the per-tick SignalSnapshot (COOK binding T5),
    // resolves the stored IR (DSL executor T3 — highest-priority rule, tie-break lowest IR index), and APPLIES the token:
    // PAUSE_OPS → delegation_paused mirrors the resolution (written ONLY on a transition — write-amplification);
    // EXECUTE_DEFAULT → restart the cook (the binding's benign-409 catch handles already-cooking/no-precursor); NONE → no
    // operational action. delegation_paused is the OBSERVABLE reflection of the last resolution, NOT a control input
    // (T7's projection reads it as the PAUSED band). Organically a no-op: the select returns nothing for a player with no
    // delegated valid-script lieutenant → ZERO writes (the byte-identical no-regression guarantee). This is the vector's
    // ONE NEW TICK (LieutenantTickService, Phase-6 vector #6 T6). Deterministic (NO RNG).
    { cadence: Cadence.MINUTE, order: 19, id: CitySystemId.LIEUTENANT_TICK },
    // D1 C6 — OPERATIONAL equipment-tier upgrade window drain tick (NOT a city-sim system; an operational-chain
    // tick-hook on the SAME scheduler). Placed LAST in the minute band (order 20, after LIEUTENANT_TICK/19) — it
    // depends on nothing in the minute band and is a self-contained per-player upgrade-window drain, so running it
    // last keeps the city-sim DAG untouched. Each minute it drains equipment_tier_upgrade_remaining_ticks by 1 on
    // in-progress equipment-tier upgrades and increments equipment_tier++ (capped 5) on buildings that reach 0 this
    // tick (EquipmentTierUpgradeService, D1 C6). Batched set-based UPDATE. Organically a no-op (no in-progress upgrade).
    { cadence: Cadence.MINUTE, order: 20, id: CitySystemId.EQUIPMENT_TIER_UPGRADE },
    // Insurance C7 — INSURANCE courier-interception MINUTE TICK (order 21, after EQUIPMENT_TIER_UPGRADE/20 — the
    // next FREE MINUTE slot). Each minute it scans courier_shift rows (status='in_transit') for the player, and for
    // each shift whose patrol_heat exceeds courier_intercept_heat_threshold (sentinel 0 = no-op), deterministically
    // selects the one highest-seed shift via seedFromDay and sets status='caught' (the existing shiftStatus enum
    // member — NO enum migration). Emits CourierInterceptedEvent (C9 COURIER_ARREST claim seam). Math.random() BANNED
    // (C4 — same day+state → same arrest). Organically a no-op when threshold=0 or no shift exceeds it.
    { cadence: Cadence.MINUTE, order: 21, id: CitySystemId.INSURANCE_COURIER_INTERCEPTION },
    // 04b-A C5 (cadence fix) — RIVAL AI per-rival tempo decision + Distributed Hold reroute MINUTE TICK
    // (MINUTE/22, next free after INSURANCE_COURIER_INTERCEPTION/21). Canon tick_schedule :18 "Every 4 ticks".
    // Moved from HOURLY/3 (C4) where the % 4 guard was inert (60 % 4 = 0 always → fired every hour, not
    // every 4 minutes). On MINUTE cadence, gameMinute % 4 === 0 is a genuine 4-minute filter.
    // Empty-state L1 skip. Per-rival try/catch. Registered by RivalTickService.onApplicationBootstrap.
    // Deterministic (NO Date.now, NO Math.random).
    { cadence: Cadence.MINUTE, order: 22, id: CitySystemId.RIVAL_DECISION_TICK },
    // 04d-A C6 — LEGAL INFO-LEAK MINUTE TICK (MINUTE/23, next free after RIVAL_DECISION_TICK/22).
    // Registered by LawyerLegalTickService.onApplicationBootstrap. L1 empty-state skip (no active cases → no-op).
    // Deterministic (makeRng seeded draws — NO Math.random, NO Date.now).
    { cadence: Cadence.MINUTE, order: 23, id: CitySystemId.LEGAL_LEAK_TICK },
    // 04e-B C4 — LIVE-OPS REAL-CLOCK SWEEP (MINUTE/24, next free after LEGAL_LEAK_TICK/23, DD-B3). GLOBAL
    // sweep (mirrors MARKET_LANE_CLEARING — ctx.playerId ignored): reverts every live_ops_event_active
    // row with status='ACTIVE' AND ends_at <= LiveOpsClockPort.now() via the real deactivateLiveOpsEvent.
    // Registered by LiveOpsSchedulerService.onApplicationBootstrap (+ a boot reconciler, crash-recovery).
    { cadence: Cadence.MINUTE, order: 24, id: CitySystemId.LIVE_OPS_REAL_CLOCK_SWEEP },
    // P3-C C5 — BACKPRESSURE_UPDATE (MINUTE/26, next free after LIVE_OPS_REAL_CLOCK_SWEEP/24 — MINUTE/25
    // courtesy-skipped for 04f-B). Each in-game minute, per player: detect blocked-output sources (6 live
    // detectors) → accrue source pressure (weighted, §8.3) → BFS-propagate upstream on inverted legs
    // (decay/hop, floor, max-hops, shortest-hop-wins) → relieve every other existing node. Organic no-op
    // for a player with no blocked output and no prior pressure state. Registered by
    // BackpressureUpdateService.onApplicationBootstrap (P3-C C5). Deterministic (NO Math.random, NO
    // Date.now).
    { cadence: Cadence.MINUTE, order: 26, id: CitySystemId.BACKPRESSURE_UPDATE },
    // P3-C C4 — MYCELIAL_MAINTENANCE_ADVANCE (MINUTE/27, next free after BACKPRESSURE_UPDATE/26). Each
    // in-game minute, per player: ONE set-based UPDATE flips every DUE timed maintenance job
    // (quick_patch/structural_reinforce) to its completion effect + frees the maintenance_mode slot.
    // reroute_bypass never matches this tick (its own exit is decay-driven, NIGHTLY/25). Organic no-op.
    // Registered by MycelialMaintenanceAdvanceService.onApplicationBootstrap (P3-C C4). Deterministic
    // (NO Math.random, NO Date.now).
    { cadence: Cadence.MINUTE, order: 27, id: CitySystemId.MYCELIAL_MAINTENANCE_ADVANCE },
    // P3-D C3 — CUE_STACK_EXECUTE (MINUTE/29, next free after MYCELIAL_MAINTENANCE_ADVANCE/27 — MINUTE/28
    // deliberately left free, courtesy per plan §0.5/§18). Each in-game minute, per player: promote
    // committed→executing on the first tick, then either no-op (current slot's duration not yet elapsed)
    // or FIRE (atomic claim I3 → dependency check §6.1 → the real verb → single-statement outcome commit
    // + cursor advance). Organic no-op for a player with no committed/executing stack. Registered by
    // CueStackExecutionTickService.onApplicationBootstrap (P3-D C3). Deterministic (NO Math.random, NO
    // Date.now — game-minute only).
    { cadence: Cadence.MINUTE, order: 29, id: CitySystemId.CUE_STACK_EXECUTE },
    // P3-D C6 — ANNEALING_SETTLE_SWEEP (MINUTE/30, next free after CUE_STACK_EXECUTE/29 — the M/24
    // LIVE_OPS_REAL_CLOCK_SWEEP precedent). GLOBAL, real-clock (ctx.playerId ignored — see CitySystemId's
    // own doc comment): ONE conditional UPDATE...RETURNING constates settled=false AND settling_ends_at<=
    // now() rows across every player (I6 exactly-once). Registered by
    // AnnealingSettleSweepService.onApplicationBootstrap (P3-D C6).
    { cadence: Cadence.MINUTE, order: 30, id: CitySystemId.ANNEALING_SETTLE_SWEEP },
    // [Every 5 min] System 2 schedule update.
    { cadence: Cadence.FIVE_MIN, order: 1, id: CitySystemId.SPARSE_CITIZENS },
    // [Every 30 min] System 4 observation accumulation.
    { cadence: Cadence.THIRTY_MIN, order: 1, id: CitySystemId.PATROL_DOCTRINE },
    // (THIRTY_MIN/2 was briefly the MONEY_HOLDING_AUDIT slot during the perf fix — but even 30-min was insufficient for the
    // tick-heavy DECAY / patrol-review citysim E2E, so it moved to the SLOW 12-h band, see below — THIRTY_MIN/2 is FREE.)
    // [Every 60 min / 1 in-game hour] D1b C2 Market Lane Collapse Pricing hourly clearing tick.
    // Runs in the HOURLY band (order 1, the only HOURLY slot day-1). The tick scans ALL lane_pricing_state rows globally
    // (not per-player — lane_pricing_state is a shared global table like districts) and applies the canon clearing rule
    // (market_mechanics.md:62-67): c > c_hi → jam cleared; c < c_lo OR t_refractory > 0 → scatter + decrement jam timer.
    // Registered by LaneCollapsePricingService.onApplicationBootstrap() in MarketModule.
    { cadence: Cadence.HOURLY, order: 1, id: CitySystemId.MARKET_LANE_CLEARING },
    // 04b-A C4 — RIVAL AI saturation decay + band recompute HOURLY TICK (HOURLY/2, next free after
    // MARKET_LANE_CLEARING/1). Fires each in-game hour; the DD-CADENCE 6h-analog guard inside the run
    // callback (gameMinute % 360 === 0) restricts the actual work to every 6 in-game hours.
    // At non-6h boundaries → NO-OP (guard short-circuits). Empty-state L1 skip. Per-rival try/catch.
    // Registered by RivalTickService.onApplicationBootstrap. Deterministic (NO Date.now, NO Math.random).
    { cadence: Cadence.HOURLY, order: 2, id: CitySystemId.RIVAL_SATURATION_TICK },
    // 04b-B C-cas — DEAD HAND TICK (HOURLY/3, next-free after RIVAL_SATURATION_TICK/2). Fires each in-game hour;
    // the internal guard (gameMinute % 480 === 0) restricts actual work to every 8 in-game hours (one dead-hand
    // cycle). At non-8h boundaries → NO-OP (guard short-circuits). L1 empty-state skip (no rows → zero writes).
    // Registered by ConflictOrchestratorService.onApplicationBootstrap(). Deterministic (NO Date.now, NO Math.random).
    { cadence: Cadence.HOURLY, order: 3, id: CitySystemId.DEAD_HAND_TICK },
    // 04d-C C5 — META-MARKET HOURLY AGGREGATION TICK (HOURLY/4, next free after DEAD_HAND_TICK/3).
    // Each in-game hour: aggregates pending meta_market_contributions per (region × substance × district_profile)
    // → trim 5% + median/p10/p90 → upserts meta_market_signals. Consumed contributions are deleted.
    // L1 empty-state skip: no pending contributions → ZERO writes (zero-regression invariant).
    // Registered by MetaMarketTickService.onApplicationBootstrap (04d-C C5). Deterministic (NO Date.now outside bucket).
    { cadence: Cadence.HOURLY, order: 4, id: CitySystemId.META_MARKET_AGGREGATION_TICK },
    // P3-A C2 — SESSION_SWEEP (HOURLY/5, next free after META_MARKET_AGGREGATION_TICK/4 — re-verified
    // free this session: HOURLY occupied 1-4 only, C0/C2 re-anchor). Each in-game hour it closes THIS
    // player's active gameplay_sessions row IFF started_at predates session.stale_timeout_real_minutes
    // (real wall-clock minutes — a REAL session-boundary rule, not game-time). Organically a no-op: no
    // active session, or a still-fresh one → ZERO writes. SessionService.sweepStaleForPlayer is the SAME
    // method the run-session-sweep _test route calls. Registered by SessionService.onApplicationBootstrap.
    { cadence: Cadence.HOURLY, order: 5, id: CitySystemId.SESSION_SWEEP },
    // 04g-A C1 — CONSTANT_HUM_CELL_TICK (HOURLY/6, next free after SESSION_SWEEP/5 — C0 re-anchor,
    // `2026-07-13-04g-A-C0-reanchor.md` §1 S1). Each in-game hour folds AVG(buildings.heat) cross-player
    // per district into the 168-cell weekly grid (constant_hum_cell). Per-cell idempotency claim (see
    // CitySystemId.CONSTANT_HUM_CELL_TICK's own doc comment, city_sim_system.ts, for the full contract).
    // Registered by ConstantHumService.onApplicationBootstrap (04g-A C1).
    { cadence: Cadence.HOURLY, order: 6, id: CitySystemId.CONSTANT_HUM_CELL_TICK },
    // P3-F C8 — PROMOTION_LOCK_TICK (HOURLY/7, next free after CONSTANT_HUM_CELL_TICK/6 — C0 re-anchor
    // confirmed free, `2026-07-18-p3-F-C0-reanchor.md` §1). Each in-game hour, per player: set-based
    // batch-close of every ACTIVE promotion_locks row whose window_end_tick <= ctx.gameMinute (design
    // §4/§9.2, D10). Idempotent by construction — see CitySystemId.PROMOTION_LOCK_TICK's own doc comment
    // for the full contract. Registered by PromotionLockTickService.onApplicationBootstrap (P3-F C8).
    { cadence: Cadence.HOURLY, order: 7, id: CitySystemId.PROMOTION_LOCK_TICK },
    // P3-G C8 — ISOSTATIC_DEBT_TICK (HOURLY/8, next free after PROMOTION_LOCK_TICK/7). Each in-game hour,
    // per player: set-based passive decay of every capability_debts row with structural_debt > 0 (design
    // §12.3, D11) — elapsed-game-hours x meta.passive_decay_rate, floor 0, decay_path PASSIVE/MIXED
    // bookkeeping. Idempotent by construction — see CitySystemId.ISOSTATIC_DEBT_TICK's own doc comment for
    // the full contract (incl. why it writes its OWN last_passive_tick baseline, never last_decay_tick).
    // Registered by IsostaticDebtService.onApplicationBootstrap (P3-G C8 — the SAME service C7's accrual/
    // active-decay writers already live on).
    { cadence: Cadence.HOURLY, order: 8, id: CitySystemId.ISOSTATIC_DEBT_TICK },
    // [Every 12 h] System 4 precinct review → System 6 MIS pull → System 2 biographies → System 3 review.
    { cadence: Cadence.TWELVE_H, order: 1, id: CitySystemId.PATROL_DOCTRINE },
    { cadence: Cadence.TWELVE_H, order: 2, id: CitySystemId.INSPECTION_QUEUE },
    { cadence: Cadence.TWELVE_H, order: 3, id: CitySystemId.SPARSE_CITIZENS },
    // System 3 Police Memory PRECINCT REVIEW (system_3_police_memory.md §Update tick Tick 3 "toutes
    // precinct_review_tick_hours=12h" — recompute top_5_buildings + softmax raid-target + raid/undercover
    // decision). The tick-synthesis table that seeded the original SCHEDULE under-listed System 3's
    // maintenance passes (it placed System 3 only at ON_EVENT); System 3's own spec §Tick 3 defines this 12h
    // review, so the slot is ADDED here (SCHEDULE is the canonical config). Placed LAST in the 12h band so it
    // runs AFTER System 4's BPD review (canonical owner of RaidPlannedEvent once T6 lands) + System 6 MIS pull
    // (whose outcomes feed System 3) — the review consumes the freshest belief state.
    { cadence: Cadence.TWELVE_H, order: 4, id: CitySystemId.POLICE_MEMORY },
    // Phase-5 vector #5a — OPERATIONAL money_holding AUDIT-FORFEITURE advancer (NOT a city-sim system; an operational-chain
    // tick-hook on the SAME scheduler). Placed on the SLOW 12-h band (order 5, LAST — after the precinct-review band
    // PATROL_DOCTRINE/1 … POLICE_MEMORY/4) — it depends on nothing in the 12-h band and is a self-contained per-player
    // money_holding scan, so running it last keeps the city-sim DAG untouched. It lives on TWELVE_H (NOT the per-minute
    // band where it originally landed at MINUTE/19, NOR the 30-min band) because the audit-forfeiture is a SLOW,
    // telegraphed legal process that does NOT need minute (or 30-min) granularity — and keeping a per-player scan OFF the
    // tick-heavy minute band is the perf discipline: the per-minute version (MINUTE/19) timed out the tick-heavy DECAY /
    // patrol-review citysim E2E (43,200-tick advances), and even THIRTY_MIN was insufficient; the 12-h band fires it ~60×
    // across that span (not 43,200×) so those specs stay well under the per-test cap. This is the money_holding vector's
    // ONE NEW TICK (T4 yield = lazy/no-tick; T5a street raid = reused RAID_EXECUTION/13). Each firing it batch-reads the
    // player's money_holdings, computes the EFFECTIVE held (held_cents + live-accrued yield, read-only — the pure accrual
    // fn), and runs the value-driven, TELEGRAPHED forfeiture lifecycle set-based: SCHEDULE (≥ forfeiture_threshold_cents,
    // none armed → arm forfeiture_scheduled_at_tick = now + forfeiture_warning_ticks), CANCEL (armed but dropped below
    // threshold → NULL), EXECUTE (armed, now ≥ scheduled_at_tick, still ≥ threshold → settle yield then seize
    // forfeiture_seize_pct 0.5 — the bigger LEGAL bite vs the raid's 0.4 — NULL the schedule; NO DAMAGED, NO building_raid).
    // Write-amplification: WRITES only on a transition (the steady state writes nothing). DISTINCT from the heat-driven
    // street raid (T5a). Deterministic (NO RNG) (MoneyHoldingAuditService, Phase-5 vector #5a T5b). Organically a no-op (no
    // money_holding / all below threshold).
    { cadence: Cadence.TWELVE_H, order: 5, id: CitySystemId.MONEY_HOLDING_AUDIT },
    // [Nightly] System 5 cohesion → System 7 unconformity → System 3 decay.
    { cadence: Cadence.NIGHTLY, order: 1, id: CitySystemId.COHESION_PERMAFROST },
    { cadence: Cadence.NIGHTLY, order: 2, id: CitySystemId.UNCONFORMITY_LEDGERS },
    // System 3 Police Memory DECAY PASS (system_3_police_memory.md §Update tick Tick 2 "chaque jour in-game"
    // — tiles not bumped in 24h decay by memory_decay_per_tile_per_day; memory is ephemeral). Again ADDED to
    // the canonical SCHEDULE because the original tick-synthesis under-listed it. Placed LAST in the nightly
    // band (after cohesion + unconformity) so the decay runs on the day's settled belief state.
    { cadence: Cadence.NIGHTLY, order: 3, id: CitySystemId.POLICE_MEMORY },
    // D1b C3 — MARKET Composition Telegraph DAILY INFERENCE TICK (NIGHTLY/4).
    // Computes q_inferred per (player × region) from the rolling 24-slot buyer roster (day-seeded, C4).
    { cadence: Cadence.NIGHTLY, order: 4, id: CitySystemId.MARKET_COMPOSITION_INFERENCE },
    // D1b C5 — MARKET Carrying-Capacity Haze DAILY TICK (NIGHTLY/5).
    // Recomputes λ = Q_total/K_current, increments T_over, applies permanent K-damage when T_over ≥ grace,
    // and applies civic-investment partial K-recovery when λ < 0.5 + has_civic_investment. Global per-district.
    { cadence: Cadence.NIGHTLY, order: 5, id: CitySystemId.MARKET_CARRYING_CAPACITY_HAZE },
    // D1c B3 — PRECURSOR MARKET endogenous demand-accumulator inference tick (NIGHTLY/6).
    // Applies decay to demand_accumulator, then writes price_trend (UP/STABLE/DOWN) per threshold comparison.
    // Idempotent per day via last_inference_day. DD-T: endogenous auto-regulation only.
    { cadence: Cadence.NIGHTLY, order: 6, id: CitySystemId.PRECURSOR_MARKET_INFERENCE },
    // Insurance C2 — INSURANCE underwriting walk NIGHTLY OBSERVATION TICK (NIGHTLY/7).
    // For each player's WALKING walk: snapshot coverage's substrate domain (read-only), derive the day's
    // FindingType bits, monotone-OR into findings_bitmask (DD-WALK invariant). Idempotent per day via
    // observation_depth guard. All bitmask values server-only (R2.2/P5). Math.random() BANNED (C4).
    // Organically a no-op for players with no WALKING walk rows. Canon: insurance_mechanics.md §4.1 :46-56.
    { cadence: Cadence.NIGHTLY, order: 7, id: CitySystemId.INSURANCE_WALK_OBSERVATION },
    // Insurance C8 — INSURANCE fence-default NIGHTLY TICK (NIGHTLY/8, after INSURANCE_WALK_OBSERVATION/7 —
    // the next FREE NIGHTLY slot). Each in-game night it scans laundering_nodes.buffer_load for the player;
    // when a node's buffer_load exceeds fence_default_exposure_threshold (default 0.80, [0..1] scale), it
    // deterministically selects the defaulting node via seedFromDay (C4 — NO Math.random()) and emits
    // FenceDefaultedEvent carrying throughput_in_per_hour (for the C9 FENCE_DEFAULT payout).
    // Substrate correction: buffer_load is on laundering_nodes (NOT tail_risk_estimates).
    // DD-PRODUCERS-MINIMAL: minimal producer making FENCE_DEFAULT claims real. TD-124 deferred (full System 12).
    // Organically a no-op when no node exceeds threshold (production default: buffer_load=0 → all below).
    { cadence: Cadence.NIGHTLY, order: 8, id: CitySystemId.INSURANCE_FENCE_DEFAULT },
    // [Weekly] System 11 lek decay → System 10 percentile baseline reset.
    { cadence: Cadence.WEEKLY, order: 1, id: CitySystemId.DEAL_LEK },
    { cadence: Cadence.WEEKLY, order: 2, id: CitySystemId.BUFFER_BLOAT },
    // D2 R2b — REPUTATION Boss Mirror WEEKLY TICK (order 3, after BUFFER_BLOAT/2).
    // Recomputes violation_density + defection_tolerance per lieutenant + consistency_index per player.
    // Idempotent per week. All scalars server-only (R2.2/P5). DD-REG-NAME: γ/recency_decay/base_tolerance
    // read from registry via reputationTunables (no inline coefficient).
    { cadence: Cadence.WEEKLY, order: 3, id: CitySystemId.BOSS_MIRROR_TICK },
    // D2 R4a — REPUTATION Restraint Index WEEKLY TICK (order 4, after BOSS_MIRROR_TICK/3).
    // Recomputes restraint_ratio + offer_terms + wary_active + collateral_amount per counterparty ring.
    // Idempotent per week. All scalars server-only (R2.2/P5). DD-REG-NAME: δ/T_wary/window/escrow/base_terms
    // read from registry via reputationTunables (no inline coefficient).
    { cadence: Cadence.WEEKLY, order: 4, id: CitySystemId.RESTRAINT_INDEX_TICK },
    // D2 R5a — REPUTATION Lek Memory WEEKLY DECAY TICK (order 5, after RESTRAINT_INDEX_TICK/4).
    // Applies λ_now exponential decay to all lek_memory_cell_state rows for the player:
    //   λ_now_new = λ_now_current · exp(−7 / lek_memory_halflife_days)
    // Idempotent per week via last_decay_week guard. All scalars server-only (R2.2/P5).
    // DD-REG-NAME: λ/τ/slots/decay_rate read from registry via reputationTunables (no inline coefficient).
    { cadence: Cadence.WEEKLY, order: 5, id: CitySystemId.LEK_MEMORY_TICK },
    // D2 R7a — REPUTATION Hidden Curriculum WEEKLY REVIEW TICK (order 6, after LEK_MEMORY_TICK/5).
    // For each lieutenant row in player scope, computes ratio = events_exhibiting_norm / events_total
    // for each of the 8 norm flags, and flips ON (>flip_on) / OFF (<flip_off) / unchanged (mid).
    // Idempotent per week via last_review_week guard. All norms_flags server-only (R2.2/P5).
    // DD-REG-NAME: flip_on/flip_off/buffer read from registry via reputationTunables (no inline thresholds).
    // DD-HC-GREENFIELD: HiddenCurriculumService defined in 04a ch14 (primary owner) + consumed here.
    { cadence: Cadence.WEEKLY, order: 6, id: CitySystemId.HIDDEN_CURRICULUM_TICK },
    // D2 R8b — REPUTATION Forbidden-Triad WEEKLY TICK (order 7, after HIDDEN_CURRICULUM_TICK/6).
    // For each UNMET pair, accrues anomaly_pressure_bucket += triad_observer_attention_share (Δ_per_week);
    // if pressure >= triad_H_observer_weeks (H_observer), flips observer_interest_flag + emits
    // ForbiddenTriadInterestFlag on CityEventBus (MIS routing seam for R9 — TD-120 deferred).
    // Idempotent per week via last_eval_week guard per pair row. All scalars server-only (R2.2/P5).
    // DD-REG-NAME: H_observer + attention_share + decay all from registry (no inline coefficient).
    // Canon: reputation_mechanics.md §3.5 (:201-206).
    { cadence: Cadence.WEEKLY, order: 7, id: CitySystemId.FORBIDDEN_TRIAD_TICK },
    // Insurance Drift C10 — COVERAGE-INDUCED DRIFT WEEKLY TICK (WEEKLY/8, after FORBIDDEN_TRIAD_TICK/7).
    // Each in-game week: recompute true_loss_prob + decay hazard_shift. Idempotent per weekId.
    // No Math.random(). Organically a no-op for players with no drift_state rows (zero-regression).
    // Canon: insurance_mechanics.md §4.2 :100-104 (true_loss_prob + hazard decay).
    { cadence: Cadence.WEEKLY, order: 8, id: CitySystemId.INSURANCE_DRIFT_TICK },
    // Forensic C5 — FORENSIC Environmental Inspector Scan NIGHTLY TICK (NIGHTLY/9, after INSURANCE_FENCE_DEFAULT/8).
    // Chains: runEnvironmentalInspectorScan (C14) → runMonthlyTick (C17, DD-MONTHLY-ON-NIGHTLY) → advanceTailRamp (C18).
    // No Math.random(). Organically a no-op for players with no workshops / no tracked lieutenants (zero-regression §1.3).
    // SLOT OPEN ONLY — the run callback is wired in forensic.module.ts onApplicationBootstrap at C14/C17/C18.
    { cadence: Cadence.NIGHTLY, order: 9, id: CitySystemId.FORENSIC_INSPECTOR_SCAN },
    // System 9 C9 — DISTRIBUTION Caught-Exception Auto-Abandon Sweep NIGHTLY TICK (NIGHTLY/10, after
    // FORENSIC_INSPECTOR_SCAN/9 — the next FREE NIGHTLY slot). Each in-game night it scans all
    // `caught_exception` rows with `status = 'pending'` whose `resolution_deadline_tick <= gameMinute`
    // for the player and auto-resolves them to `abandoned` (the deterministic default, OQ-14). Organically
    // a no-op for players with no overdue pending exceptions (zero-regression invariant). No Math.random().
    // Canon: distribution_couriers_runners.md §9 :165-167 (caught exception window OQ-14).
    { cadence: Cadence.NIGHTLY, order: 10, id: CitySystemId.CAUGHT_EXCEPTION_SWEEP },
    // System 9b C8 — DISTRIBUTION Corridor-Debt Decay NIGHTLY TICK (NIGHTLY/11, next free after
    // CAUGHT_EXCEPTION_SWEEP/10). Each in-game night: debt_magnitude ← GREATEST(0, debt_magnitude −
    // corridorDebtDecayPerTick) (default 0.05) for all corridor_debt rows of the player. Stamps
    // last_updated_tick = ctx.gameMinute. Game-time deterministic (ctx.gameMinute — NO Date.now).
    // Organically a no-op for players with no corridor_debt rows (zero-regression invariant).
    // No Math.random(). Canon: distribution_couriers_runners.md §9b DD-DEBT-SSOT (C8, mig 0076).
    // SLOT OPEN ONLY — the run callback is wired in CorridorDebtService.onApplicationBootstrap.
    { cadence: Cadence.NIGHTLY, order: 11, id: CitySystemId.CORRIDOR_DEBT_DECAY },
    // System 9b C9 — DISTRIBUTION Route Sever Sweep NIGHTLY TICK (NIGHTLY/12, next free after
    // CORRIDOR_DEBT_DECAY/11). Each in-game night: scans all saved routes for the player; derives
    // saturation = max(corridor_debt for block in path_blocks) (OQ-SV1 max-of-corridors); flips
    // route.state to 'severed' (>= sever_threshold) / 'saturated' (>= warn_threshold) / 'active'
    // (below both). This is the LIGHT SWEEP component of OQ-SV3 (dispatch-time hard gate is the other).
    // DERIVED read: never writes corridor_debt (DD-DEBT-SSOT D3). No Math.random.
    // Organically a no-op for players with no saved routes (zero-regression invariant).
    // Canon: distribution_couriers_runners.md §9b DD-SEVER (C9, mig 0077).
    // SLOT OPEN ONLY — the run callback is wired in RouteService.onApplicationBootstrap.
    { cadence: Cadence.NIGHTLY, order: 12, id: CitySystemId.ROUTE_SEVER_SWEEP },
    // 04b-A C3 — RIVAL AI regime pressure recompute + flip NIGHTLY DECAY TICK (NIGHTLY/13, next free
    // after ROUTE_SEVER_SWEEP/12). Each in-game night: applies peaceful-decay on regime_pressure + hooks
    // the C7 Adaptive Skin unused-pattern decay (body lands in C7). Empty-state L1 skip (no rivals → no-op).
    // Registered by RivalTickService.onApplicationBootstrap. Deterministic (NO RNG). Zero-regression.
    { cadence: Cadence.NIGHTLY, order: 13, id: CitySystemId.RIVAL_DAILY_TICK },
    // W6.1 C2 — ★ COMBAT RESOLUTION NIGHTLY TICK (NIGHTLY/13.5 — a FRACTIONAL slot; see this file's
    // `registerSystem` doc comment: the sort comparator is a plain numeric `a.order - b.order`
    // compare, not integer-constrained — same precedent as POLITICAL_CALENDAR_TICK/19.5 below).
    // Slotted strictly between RIVAL_DAILY_TICK/13 (rival AI has acted for the night) and
    // COMBAT_DAILY_TICK/14 (de-escalation must see the REAL post-resolution conflict state, not the
    // night before's) — design §1 D3, ZERO renumbering of any existing NIGHTLY slot. Each in-game
    // night: resolves every pending assault (`combat_event` type='assault' AND outcome_bucket IS
    // NULL) via the Friction Budget divergence lookup (C4) then the §9.1 cascade (idempotent on
    // assaultEventId), THEN the guarded UPDATE — design §1 D6 crash-safe ordering. L1 empty-state
    // skip: no pending assaults → ZERO writes. Per-event try/catch. Deterministic (NO Math.random).
    // Registered by CombatResolutionTickService.onApplicationBootstrap.
    { cadence: Cadence.NIGHTLY, order: 13.5, id: CitySystemId.COMBAT_RESOLUTION_TICK },
    // 04b-B C-deesc — COMBAT DAILY (de-escalation) NIGHTLY TICK (NIGHTLY/14, next free after
    // RIVAL_DAILY_TICK/13). Each in-game night: drives 4 per-player de-escalation decays via
    // DeEscalationTickService.runCombatDailyTickForPlayer:
    //   1. MaladaptiveMemoryService.decayDepthOnQuietTicks (C-esc — quiet-tick depth decay)
    //   2. FamiliarityDiscountService.accrueFamiliarity    (C-deesc §5.1 — dear-enemy accrual)
    //   3. EphemeralOperationService.clearStateOlderThanWindow (C6 — ephemeral state expiry)
    //   4. CumulativeAttritionService.decayCPIDaily        (C8 — CPI daily decay)
    // L1 empty-state skip: no deescalation_pair_state rows → ZERO writes (pre-deesc world byte-identical).
    // Registered by DeEscalationTickService.onApplicationBootstrap. Per-pair try/catch. Deterministic (NO RNG).
    // ★ Lesson #3: runCombatDailyTickForPlayer is the SAME shared method used by both scheduler AND _test route.
    { cadence: Cadence.NIGHTLY, order: 14, id: CitySystemId.COMBAT_DAILY_TICK },
    // 04b-C C9 — INFO-WARFARE INFO_LOOP_DAILY_TICK (NIGHTLY/15, next free after COMBAT_DAILY_TICK/14).
    // Each in-game night: decayBeliefStatePerTick + runSurveillance (detection draw +
    // applyDisinformation if detected + degradeRegisterIntel if disinfo landed) +
    // evalPurge (purge threshold check — no-op if below threshold).
    // L1 skip: no info-warfare rows → ZERO writes (zero-regression invariant).
    // Registered by InformationWarfareOrchestratorService.onApplicationBootstrap.
    // Deterministic (makeRng seeded draws). DD-P5-REALIZATION: disinfo lands iff PULL.
    { cadence: Cadence.NIGHTLY, order: 15, id: CitySystemId.INFO_LOOP_DAILY_TICK },
    // 04d-A C7 — LEGAL NIGHTLY RESOLUTION TICK (NIGHTLY/16, next free after INFO_LOOP_DAILY_TICK/15).
    // Scans active legal_cases with ticks_remaining<=0 → seeded-RNG resolution (tier+charge gated)
    // → conviction final-dump to declaration_ledger → CaseResolvedEvent emitted.
    // L1 skip: no eligible cases → ZERO writes. Registered by LawyerLegalTickService.onApplicationBootstrap.
    { cadence: Cadence.NIGHTLY, order: 16, id: CitySystemId.LEGAL_NIGHTLY_TICK },
    // 04d-B C4 — IA INVESTIGATION THRESHOLD NIGHTLY TICK (NIGHTLY/17, next free after LEGAL_NIGHTLY_TICK/16).
    // Each in-game night: scans internal_affairs_targets for suspicion_level >= open_investigation_threshold
    // → opens ia_investigations + emits InvestigationOpenedEvent. L1 skip: no targets → ZERO writes.
    // Idempotent (investigation_id IS NULL guard). Registered by IATickService.onApplicationBootstrap.
    { cadence: Cadence.NIGHTLY, order: 17, id: CitySystemId.IA_THRESHOLD_TICK },
    // 04d-C C5 — META-MARKET NIGHTLY RETENTION PURGE TICK (NIGHTLY/18, next free after IA_THRESHOLD_TICK/17).
    // Each in-game night: purges meta_market_signals (aggregated_at < cutoff) + meta_market_contributions
    // (contributed_at < cutoff) older than retention_days (default 30d, gdd/14 registry key).
    // Idempotent: DELETE WHERE is pure — re-running with same cutoff → same DB state.
    // Registered by MetaMarketTickService.onApplicationBootstrap (04d-C C5). Deterministic (NO Math.random).
    { cadence: Cadence.NIGHTLY, order: 18, id: CitySystemId.META_MARKET_RETENTION_TICK },
    // 04d-C C6 — META-MARKET NIGHTLY ANTI-CHEAT COHORT DETECTION TICK (NIGHTLY/19, next free after META_MARKET_RETENTION_TICK/18).
    // Each in-game night: scans meta_market_contributions (last 24h) for coordinated contribution spikes
    // → writes meta_market_cohort_flags when distinct contributors >= threshold (100, gdd/14 registry key).
    // L1 natural: no recent contributions → 0 flags. Deterministic (SQL COUNT DISTINCT, no Math.random).
    // Registered by MetaMarketTickService.onApplicationBootstrap (04d-C C6).
    { cadence: Cadence.NIGHTLY, order: 19, id: CitySystemId.META_MARKET_ANTICHEAT_TICK },
    // 04e-A2 C2 — ★ POLITICAL CALENDAR EVAL TICK (NIGHTLY/19.5 — a FRACTIONAL slot; see this file's
    // `registerSystem` doc comment: the sort comparator is a plain numeric `a.order - b.order` compare,
    // not integer-constrained). RE-ANCHOR (C0-M2): the plan assumed NIGHTLY/19 but META_MARKET_
    // ANTICHEAT_TICK already took it on this base; 19.5 slots strictly between it and the federal
    // reconcile (20) so this tick's reloadNow() lands before the federal reconcile reads the overlay in
    // the SAME NIGHTLY run (design §3), with ZERO renumbering of any existing NIGHTLY slot. Each in-game
    // night: evaluates the electoral/budget calendar triggers (city-global idempotent claim on
    // political_calendar_state), gates on overlap_max_active (permanents count; over-cap SKIPPED, not
    // queued), applies newly-due events via the real EffectModifierService + reclaims expired ones, then
    // awaits EffectOverlayStore.reloadNow(). L1 natural: no boundary crossed → 0 activations.
    // Registered by PoliticalCalendarTickService.onApplicationBootstrap (04e-A2 C2).
    { cadence: Cadence.NIGHTLY, order: 19.5, id: CitySystemId.POLITICAL_CALENDAR_TICK },
    // 04e-A1 C7 — ★ Substrate 2: FEDERAL INVESTIGATOR RECONCILE (NIGHTLY/20, next free after
    // META_MARKET_ANTICHEAT_TICK/19). Each in-game night: reads isFederalInvestigatorSignalActive()
    // (police-memory-tunables.ts) fresh — a GLOBAL effect_modifier shifting either federal BASE tunable
    // away from base — and spawns/maintains (or despawns) this player's federal_investigators row
    // (design §4.2). Distinct from POLICE_MEMORY's own NIGHTLY/3 decay pass (order 3) — an independent
    // reconciliation, not a repurposing of it. Registered by PoliceMemoryService.onApplicationBootstrap
    // (04e-A1 C7). Deterministic (NO Math.random, NO Date.now — a pure function of the persisted
    // effect_modifier rows via the overlay + this player's DB row).
    { cadence: Cadence.NIGHTLY, order: 20, id: CitySystemId.POLICE_MEMORY },
    // 04f-A C2 — ★ MAINTENANCE PHASE-PROGRESSION TICK (NIGHTLY/21, next free after POLICE_MEMORY/20).
    // Each in-game night, per player: (1) recompute the D1 lapse_phase for every OPERATIONAL building
    // (write-only-on-change, set-based) + emit MaintenancePhaseChangedEvent per transition; (2) complete
    // armed scheduled-maintenance jobs (D13). HONEST PARTIAL (C2 scope): the critical-phase daily failure
    // roll + the critical/failed periodic Exception re-emission (design §4 steps 4-5) are C4/C5 — NOT
    // wired here. L1 empty-state skip: no operational buildings → ZERO writes. Idempotent per game-day
    // (same-day re-run → zero writes). Registered by MaintenancePhaseTickService.onApplicationBootstrap
    // (04f-A C2). Deterministic (NO Math.random, NO Date.now).
    { cadence: Cadence.NIGHTLY, order: 21, id: CitySystemId.MAINTENANCE_PHASE_TICK },
    // P3-A C3 — EXCEPTION_QUEUE_TICK (NIGHTLY/22 — 21 was reserved for the in-flight 04f-A lot's own
    // NIGHTLY claim per the D3 collision wall, now landed above as MAINTENANCE_PHASE_TICK/21 post-merge —
    // no collision, contiguous). Each in-game night, per player: re-priority every PENDING card
    // (set-based, zero-write when unchanged) + aged-out transition for cards past the horizon +
    // `ExceptionAgedOutEvent`. Organically a no-op for players with no pending cards. Registered by
    // ExceptionQueueTickService.onApplicationBootstrap (P3-A C3).
    { cadence: Cadence.NIGHTLY, order: 22, id: CitySystemId.EXCEPTION_QUEUE_TICK },
    // 04f-B C4 — ★ RECRUITMENT AVAILABILITY TICK (NIGHTLY/23 — ★ ANTI-COLLISION: NIGHTLY/22 is CEDED to
    // the parallel P3-A session's `EXCEPTION_QUEUE_TICK`, which merges FIRST; 04f-B therefore claims the
    // NEXT free slot after MAINTENANCE_PHASE_TICK/21, i.e. 23, never 22 — controller ruling, 2026-07-11).
    // Each in-game night, per player: (1) Saltline replenish; (2) Defector regime scan (D8, LIVE —
    // `rival_state.regime ∈ (bleeding,retrench)`, dedup-gated per rival); (3) Civilian affinity scan (D7,
    // DERIVED over `rich_citizens` — no new schema), dedup-gated per citizen, small cap; (4) candidate
    // expiry. L1 natural: a fully-topped/no-qualifying/no-stale player → ZERO writes. Idempotent by
    // construction (dedup + cap + threshold — no epoch-claim column needed). Registered by
    // RecruitmentAvailabilityTickService.onApplicationBootstrap (04f-B C4). Deterministic (NO
    // Math.random, NO Date.now — makeRng only, for candidate PROFILE content).
    { cadence: Cadence.NIGHTLY, order: 23, id: CitySystemId.RECRUITMENT_AVAILABILITY_TICK },
    // P3-B C4 — FLAG_DISCIPLINE_TICK (NIGHTLY/24 — 23 deliberately SKIPPED, reserved for the in-flight
    // 04f-B lot's own NIGHTLY claim per the D3 collision wall, re-verified free this session: nothing
    // registered past NIGHTLY/22 + 19.5 on this base). Each in-game night, per player, 5 strictly
    // ordered steps (D7): (1) auto-confirm yesterday's pending routine items (set-based); (2) timeout
    // PENDING flags past the real-hours review window (token RETURNED, ruling #3); (3) regen tokens
    // (LEAST-clamped, in-row day guard, set-based); (4) generate today's routine items + flag decisions
    // + the D9 exhaustion fallback (spine REUSE, zero EffectType edits); (5) prune terminal routine rows
    // past retention (never a row referenced by a PENDING flag). Organically a no-op for a player with
    // no lieutenants/buildings. Idempotent per game-day (same-day re-run across all 5 steps → zero
    // writes). Registered by FlagDisciplineTickService.onApplicationBootstrap (P3-B C4). Deterministic
    // (NO Math.random anywhere in the tick).
    { cadence: Cadence.NIGHTLY, order: 24, id: CitySystemId.FLAG_DISCIPLINE_TICK },
    // P3-C C3 — MYCELIAL_DECAY_TICK (NIGHTLY/25, next free after FLAG_DISCIPLINE_TICK/24 — re-verified
    // free this session, nothing registered past NIGHTLY/24). Each in-game night, per player: ONE
    // set-based WITH...UPDATE...FROM statement decays IDLE supply_chain_legs (idle >= cooling period,
    // design §5.2) + derives stressed (debt_load > threshold, D4) + maintains stress_streak (design
    // §5.5) for EVERY leg touched, idle or actively-accruing. Day-keyed idempotent on
    // last_decay_eval_tick (same-gameMinute re-run → zero writes). Organic no-op for a player with no
    // legs. Registered by MycelialDecayTickService.onApplicationBootstrap (P3-C C3). Deterministic
    // (NO Math.random, NO Date.now).
    { cadence: Cadence.NIGHTLY, order: 25, id: CitySystemId.MYCELIAL_DECAY_TICK },
    // P3-C C7 — ROUTE_PATCH_SWEEP (NIGHTLY/26, next free after MYCELIAL_DECAY_TICK/25 — re-verified
    // free this session, nothing registered past NIGHTLY/25; MINUTE/26 BACKPRESSURE_UPDATE is a
    // DIFFERENT cadence namespace, no collision). Each in-game night, per player: for every saved,
    // non-severed, non-rebuilding route with a hot (>= warn threshold) corridor-debt block on its path,
    // recomputes A* debt-aware, archives+writes a NEW path/SI/patch_count (design §7.2), then re-runs
    // the OR-extended collapse check (ruling-B, evaluateAndMaybeSever). The sibling NIGHTLY/12
    // ROUTE_SEVER_SWEEP is left byte-untouched (ruling header). Registered by
    // RoutePatchSweepService.onApplicationBootstrap (P3-C C7). Deterministic (NO Math.random/Date.now).
    { cadence: Cadence.NIGHTLY, order: 26, id: CitySystemId.ROUTE_PATCH_SWEEP },
    // 04g-A C2 — ★ AMBIENT_DAILY_TICK (RENUMBERED NIGHTLY/25→27 at P3-C integration — P3-C took NIGHTLY/25
    // MYCELIAL_DECAY + /26 ROUTE_PATCH; 27 = next free). Each in-game night: (1) decay sweep — every
    // `live` ambient_micro_event past its expiry → `expired` (ONE set-based UPDATE, status-only); (2)
    // Poisson-seeded generation for ALL 18 districts (city-global), idempotent per (game_day, district).
    // Per-(game_day,district) idempotency claim (see CitySystemId.AMBIENT_DAILY_TICK's own doc comment,
    // city_sim_system.ts). Registered by AmbientMicroEventService.onApplicationBootstrap (04g-A C2).
    { cadence: Cadence.NIGHTLY, order: 27, id: CitySystemId.AMBIENT_DAILY_TICK },
    // 04g-B C2 — ★ RANDOM_WORLD_DAILY_TICK (NIGHTLY/28, next free after AMBIENT_DAILY_TICK/27 — C0
    // re-anchor confirmed nothing registered past NIGHTLY/27). Runs AFTER the political NIGHTLY/19.5
    // reconciliation (design §3.2 ordering note — the political revertExpired sweep is
    // parent-agnostic, so it may already have reaped this tick's expired effect rows before this
    // slot fires; phase 1 below is idempotent to that). Each in-game night: (0) claim the game_day
    // (random_world_daily_run, ON CONFLICT DO NOTHING); (1) resolve-expired (generic hard-ceiling
    // sweep); (2) recovery-curve reapply/resolution for active halgren_tannery_hailstorm events;
    // (3) daily activation triggers (hum-weighted hailstorm roll + permanent_residue successor
    // roll, gated by district-cooldown/concurrent-cap, D6); (5) daily_run counters update. See
    // CitySystemId.RANDOM_WORLD_DAILY_TICK's own doc comment (city_sim_system.ts) for the full
    // phase breakdown. Registered by RandomWorldEventGeneratorService.onApplicationBootstrap
    // (04g-B C2). Deterministic (NO Math.random/Date.now — makeRng only).
    { cadence: Cadence.NIGHTLY, order: 28, id: CitySystemId.RANDOM_WORLD_DAILY_TICK },
    // P3-D C3 — CUE_STACK_STALE_SWEEP (NIGHTLY/29 — RENUMBERED 28→29 at the 04g-B integration: P3-D
    // authored at the then-next-free N/28; 04g-B merged first and took N/28 RANDOM_WORLD_DAILY_TICK,
    // so this sweep moved to the next-free 29 per the "whoever merges second renumbers" protocol).
    // Each in-game night, per player: ONE set-based UPDATE force-resolves any `executing` stack stuck
    // on its current slot past the crash-safe horizon
    // (core_loops.cue_stack_stale_executing_horizon_hours, C1 getter). Organic no-op for a healthy
    // player. Registered by CueStackStaleSweepService.onApplicationBootstrap (P3-D C3). Deterministic.
    { cadence: Cadence.NIGHTLY, order: 29, id: CitySystemId.CUE_STACK_STALE_SWEEP },
    // 04g-C C2 — ★ BRENNAR_DAILY_TICK (NIGHTLY/30 — RENUMBERED 29→30 at the 04g-C integration: 04g-C
    // authored at the then-next-free N/29; P3-D merged first and took N/29 CUE_STACK_STALE_SWEEP, so
    // this tick moved to the next-free 30 per the "whoever merges second renumbers" protocol). Runs
    // LAST among the 04g NIGHTLY family (design §2 S1: "hum HOURLY/6 < ambient N/27 < random-world
    // N/28 < brennar N/last" — the evening journal narrates the SAME day's events). Each in-game
    // night: (0) claim the game_day (news_daily_run, ON CONFLICT DO NOTHING); (1) NewsFodderReader.
    // scanFodder — READ-only across the 4 upstream fodder sources; (2-4) thread advance/wire-day/
    // template evaluations — C3-C5 scope, no-op THIS chunk; (5) digest fill — template-less plancher
    // beats citing real fodder rows (D4); (6) news_daily_run counters update. See
    // CitySystemId.BRENNAR_DAILY_TICK's own doc comment (city_sim_system.ts) for the full
    // phase breakdown. Registered by BrennarDailyService.onApplicationBootstrap (04g-C C2).
    { cadence: Cadence.NIGHTLY, order: 30, id: CitySystemId.BRENNAR_DAILY_TICK },
    // P3-E C2 — ★ FRICTION_BUDGET_TICK (NIGHTLY/31 provisoire, next free after BRENNAR_DAILY_TICK/30 —
    // C0/C2 re-anchor confirmed nothing registered past 30 on this base). Each in-game night, per player:
    // (0) lazy-stamp any NULL `buildings.acquired_at_tick` of the ★#1 périmètre (D20, one-shot idempotent);
    // (1) recompute friction_budget_total/friction_org_size over the SAME périmètre + refresh the
    // friction_budget_state cache (single-statement, I4); (2) penalty apply/revert transition (I4
    // exactly-once) + EfficiencyPenaltyApplied/RevertedEvent + FrictionThresholdExceptionProducer on a
    // FRESH apply. See CitySystemId.FRICTION_BUDGET_TICK's own doc comment (city_sim_system.ts) for the
    // full phase breakdown. Registered by FrictionBudgetTickService.onApplicationBootstrap (P3-E C2).
    { cadence: Cadence.NIGHTLY, order: 31, id: CitySystemId.FRICTION_BUDGET_TICK },
    // P3-H C6 — ★ BENCHMARK_DRIFT_TICK (NIGHTLY/32 — the courtesy gap C3's own EXECUTION_PLAN_EVALUATOR_
    // TICK/33 comment RESERVED for this exact tick; C0-reanchor §9/R7 re-confirmed free this session,
    // filled HERE, in numeric order alongside its NIGHTLY siblings — mirrors the RECRUITMENT_AVAILABILITY_
    // TICK/23 courtesy-gap-fill precedent above). Each in-game night, per player, per LIVE metric
    // (SAFEHOUSE_UTILIZATION + COURIER_DELIVERY_RATE, ★H-3 2-LIVE + 1-RESERVED): lazy-init the baseline on
    // first touch, else accumulate elapsed-game-day drift (idempotent elapsed-guard idiom) and silently
    // auto-update the baseline on threshold cross (BO-only BaselineAutoUpdatedEvent, never surfaced
    // player). See CitySystemId.BENCHMARK_DRIFT_TICK's own doc comment (city_sim_system.ts) for the full
    // phase breakdown. Registered by BenchmarkDriftService.onApplicationBootstrap (P3-H C6).
    { cadence: Cadence.NIGHTLY, order: 32, id: CitySystemId.BENCHMARK_DRIFT_TICK },
    // P3-H C3 — ★ EXECUTION_PLAN_EVALUATOR_TICK (NIGHTLY/33 provisoire, next free after FRICTION_BUDGET_
    // TICK/31 — C0-reanchor §9/R1/R7 confirmed both 32 and 33 free this session). NIGHTLY/32 is a
    // COURTESY GAP, deliberately SKIPPED — reserved for C6's own BENCHMARK_DRIFT_TICK, never reused (the
    // SAME "whoever lands second gets the next free slot, gaps are never backfilled" convention this
    // SCHEDULE array already follows for MINUTE/25, MINUTE/28, WEEKLY/12). Each in-game night, per player:
    // per ACTIVE plan with a PENDING slot at cycle_tick=ctx.gameMinute, run DeviationEvaluatorService.
    // evaluate (3 LIVE + 2 RESERVED constraint-evaluators.ts registry, CAPABILITY_DEBT_BELOW LIVE per
    // ★H-2 WIRE-LIVE) -> no-deviation: slot EXECUTED_ON_PLAN + counter+1 + plan COMPLETED-if-done +
    // CycleExecutedOnPlanEvent; deviation: slot DEVIATED, then ABORT (plan ABORTED + remaining slots
    // bulk-ABORTED + counter->0 + PlanAbortedEvent) or ESCALATE/ADAPT-fallback (plan ESCALATED + an
    // Exception into the LIVE spine, counter frozen). See CitySystemId.EXECUTION_PLAN_EVALUATOR_TICK's own
    // doc comment (city_sim_system.ts) for the full phase breakdown. Registered by
    // ExecutionPlanEvaluatorService.onApplicationBootstrap (P3-H C3). Deterministic (NO Math.random/Date.now).
    { cadence: Cadence.NIGHTLY, order: 33, id: CitySystemId.EXECUTION_PLAN_EVALUATOR_TICK },
    // TD-517 — DÉCAI DE LA FENÊTRE DU LEDGER DE FAUX RAPPORTS (NIGHTLY/34, premier ordre libre).
    // Recalcule window_false_count / window_genuine_count depuis `false_report_ledger` sur les N
    // derniers jours. Idempotent (recalcul, pas décrément). Enregistré par
    // FalseReportWindowDecayService.onApplicationBootstrap.
    { cadence: Cadence.NIGHTLY, order: 34, id: CitySystemId.FALSE_REPORT_WINDOW_DECAY_TICK },
    // 04b-A C3 — RIVAL AI regime recompute + flip TWELVE_H TICK (TWELVE_H/6, next free after
    // MONEY_HOLDING_AUDIT/5). Each 12 game-hours: recompute regime_pressure, flip if past threshold +
    // emit RegimeTransitionEvent, run intel-mode flip. Empty-state L1 skip. Per-rival try/catch.
    // Registered by RivalTickService.onApplicationBootstrap. Deterministic (makeRng tie-break only).
    { cadence: Cadence.TWELVE_H, order: 6, id: CitySystemId.RIVAL_REGIME_TICK },
    // 04b-B C-esc — ESCALATION TICK (TWELVE_H/7, next free after RIVAL_REGIME_TICK/6).
    // Each 12 game-hours: (1) recomputes sandpile system_criticality (SOC); (2) triggers cascade checks
    // if above threshold (seeded draw via makeRng — deterministic); (3) recomputes resonance_factor for
    // each active pair (game-time, DD-RESONANCE-GAMETIME OQ-B5); (4) runs Lotka-Volterra dynamics for
    // each contested lek. L1 empty-state skip: no escalation rows → ZERO writes (pre-B world byte-identical).
    // Registered by EscalationTickService.onApplicationBootstrap. Deterministic (NO Math.random, NO Date.now).
    { cadence: Cadence.TWELVE_H, order: 7, id: CitySystemId.ESCALATION_TICK },
    // Forensic C5 — FORENSIC Leading-Digit Audit WEEKLY TICK (WEEKLY/9, after INSURANCE_DRIFT_TICK/8).
    // Runs LeadingDigitAuditService.runWeeklyAuditTick (C7): χ² check idempotent per ring on last_audit_tick.
    // No Math.random(). Organically a no-op for players with no rings (zero-regression §1.3).
    // SLOT OPEN ONLY — the run callback is wired in forensic.module.ts onApplicationBootstrap at C7.
    { cadence: Cadence.WEEKLY, order: 9, id: CitySystemId.FORENSIC_AUDIT_TICK },
    // 04d-B C6 — IA SUSPICION DECAY WEEKLY TICK (WEEKLY/10, next free after FORENSIC_AUDIT_TICK/9).
    // Each in-game week: scans internal_affairs_targets WHERE last_weekly_decay_at < thisWeekEpoch (idle targets)
    // → suspicion_level = MAX(0, suspicion_level − decay_rate_per_week); stamp last_weekly_decay_at = thisWeekEpoch.
    // Cool-off: targets used this week (stamped by recordCorruptUse) are filtered OUT (not decayed).
    // Idempotent per game-week (last_weekly_decay_at guard). L1 skip: no idle targets → ZERO writes.
    // Deterministic: NO Math.random(), NO Date.now() — weekId from ctx.gameMinute only.
    // Registered by IATickService.onApplicationBootstrap (04d-B C6).
    { cadence: Cadence.WEEKLY, order: 10, id: CitySystemId.IA_DECAY_TICK },
    // 04f-A C4 — ★ EQUIPMENT-FAILURE WEEKLY ROLL TICK (WEEKLY/11, next free after IA_DECAY_TICK/10).
    // Each in-game week: batch-reads every OPERATIONAL, non-critical building (critical rolls DAILY in
    // MAINTENANCE_PHASE_TICK instead), skips the 3 EXCLUDED types (grow_house/dealer_spot_front/
    // specialized_lab — no canon baseline, an honest skip-list), rolls a SEEDED (building_id, week_epoch)
    // failure probability per eligible building — a failing roll runs the atomic-5 (structural_state →
    // 'failed', halts via the EXISTING ='operational' gates, ZERO gate edits, D3) + an equipment_failure_log
    // row + EquipmentFailedEvent. L1 empty-state skip: no eligible building → ZERO writes. Idempotent per
    // game-week (pure function of building_id+week_epoch; a failed building drops out of the candidate set).
    // Registered by EquipmentFailureWeeklyTickService.onApplicationBootstrap (04f-A C4). Deterministic
    // (NO Math.random, NO Date.now — ONLY draw source is makeRng, D11).
    { cadence: Cadence.WEEKLY, order: 11, id: CitySystemId.EQUIPMENT_FAILURE_WEEKLY_TICK },
    // P3-B C5 — FLAG_WEEKLY_RESET_TICK (WEEKLY/13 — 12 deliberately SKIPPED, reserved for the in-flight
    // 04f-B lot's own WEEKLY claim per the D3 collision wall, re-verified free this session: nothing
    // registered past WEEKLY/11 on this base). Each in-game week, per player: ONE epoch-guarded
    // conditional UPDATE resets EVERY lieutenant_flag_state row this player owns to the max token getter
    // (D8 — "reset to max regardless of recent burns", canon-verbatim); idempotent per epoch (same-epoch
    // re-run -> zero writes). `week_epoch = Math.floor(game_day / 7)` (the WEEKLY cadence already fires
    // every 7 game-days — this file's OWN `cadenceWidth(Cadence.WEEKLY)` below). Organically a no-op for
    // a player with no lieutenants. Registered by FlagWeeklyResetTickService.onApplicationBootstrap
    // (P3-B C5). Deterministic (NO Math.random anywhere in the tick).
    { cadence: Cadence.WEEKLY, order: 13, id: CitySystemId.FLAG_WEEKLY_RESET_TICK },
    // P3-E C6 — ★ COMPRESSION_QUIET_DECAY_TICK (WEEKLY/14, next free after FLAG_WEEKLY_RESET_TICK/13).
    // Each in-game week, per player: quiet-week decay of `org_stress` (design §8.3) — see
    // CitySystemId.COMPRESSION_QUIET_DECAY_TICK's own doc comment (city_sim_system.ts) for the full
    // phase breakdown. Registered by CompressionQuietDecayTickService.onApplicationBootstrap (P3-E C6).
    { cadence: Cadence.WEEKLY, order: 14, id: CitySystemId.COMPRESSION_QUIET_DECAY_TICK },
    // [On event] System 3 Police Memory (event-driven; the bus drives this in T4+).
    { cadence: Cadence.ON_EVENT, order: 1, id: CitySystemId.POLICE_MEMORY },
  ];

  /**
   * CADENCE_PRIORITY — collision serialization order (tick_schedule §Edge cases: "12h d'abord, nightly
   * ensuite"). When multiple in-game boundaries fall on the same game-minute, the harness fires them in
   * THIS order (slower-but-coarser first is wrong — the spec serializes 12h before nightly). 2 Hz is the
   * real-time band and is stepped within each in-game minute, so it leads.
   */
  static readonly CADENCE_PRIORITY: ReadonlyArray<Cadence> = [
    Cadence.TWO_HZ,
    Cadence.MINUTE,
    Cadence.FIVE_MIN,
    Cadence.THIRTY_MIN,
    Cadence.HOURLY,
    Cadence.TWELVE_H,
    Cadence.NIGHTLY,
    Cadence.WEEKLY,
  ];

  /** Registered systems per cadence, kept sorted by DAG `order`. Day-1 these hold no-op placeholders. */
  private readonly registry = new Map<Cadence, CitySimSystem[]>();

  /** Per-cadence duration metrics (the SLI surface — getStats()). */
  private readonly metrics = new Map<Cadence, CadenceMetric>();

  /**
   * Flag-gated per-system profiling (CITYSIM_PROFILE=on). Read ONCE at construction; never re-read in the
   * hot tick path so the guard is a single boolean load with zero branch overhead when off.
   */
  private readonly profileEnabled: boolean;

  /**
   * Per-system timing accumulator: key = `${cadence}/${systemId}`, value = {totalMs, calls}.
   * Populated only when profileEnabled. Guarded by `if (this.profileEnabled)` before every write.
   */
  private readonly profileData = new Map<string, { totalMs: number; calls: number }>();

  /** Internal scheduler event emitter (TickOverrunEvent — NOT a cross-system CityEvent). */
  private readonly bus = new EventEmitter();

  /** Continuous-loop timers (started at bootstrap, cleared on destroy). */
  private twoHzTimer?: NodeJS.Timeout;
  private minuteTimer?: NodeJS.Timeout;

  /** Circuit-breaker state for the 2 Hz loop. */
  private twoHzConsecutiveOverruns = 0;
  private twoHzCurrentHz = 2;
  private twoHzDegraded = false;

  /** Separation-compute guard: the 2 Hz and minute loops must not overlap (tick_schedule §Separation). */
  private continuousTickInFlight = false;

  /** How many real 2 Hz sub-ticks fall within one in-game minute (deterministic stepping for the harness). */
  private readonly twoHzSubTicksPerGameMinute: number;

  /**
   * L1 — skips orders 6-12 and 14-20 in the MINUTE band for empty-state players.
   * Order 13 (RAID_EXECUTION) is always run (exogenous trigger — System 4 buffer).
   * Default: unknown player → guard TRUE (fail-safe — never wrongly skip).
   *
   * P3-D C3 note (plan §6.7 ruling #7, the "alternative" branch): `CUE_STACK_EXECUTE` (MINUTE/29) is
   * DELIBERATELY NOT added here, even though the ruling's default was inclusion. `OperationalStateGuardService.
   * isActive`'s union-EXISTS is a FIXED, hand-enumerated 13-predicate list (`operational-state-guard.service.ts`
   * :56-88) with NO `cue_stacks`/`recruitment_candidates` predicate — a committed/executing stack whose ONLY
   * slot is `RECRUITMENT_STEP` (a candidate target, no operational-building involvement at all) for a player
   * with ZERO other operational state would have `isActive` return false and this order would be silently
   * skipped FOREVER (the stack would never advance) if it were in this set — a genuine correctness gap, not
   * merely "a fragile proof" (the ruling's own stated bar for choosing the alternative). `CUE_STACK_EXECUTE`'s
   * OWN tick body already delivers the "no-op-cheap without a stack" property this set exists to provide (its
   * OWN first step is a cheap indexed SELECT that returns immediately with ZERO writes when no committed/
   * executing row exists) — without depending on, or extending, this guard's fixed predicate list.
   */
  private static readonly SKIPPABLE_OPERATIONAL_ORDERS = new Set([6,7,8,9,10,11,12,14,15,16,17,18,19,20]);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly guardService: OperationalStateGuardService,
    @Inject(CITYSIM_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {
    // Derived from the master ratio (R2.3 — not inline): real seconds per in-game minute × Hz = sub-ticks.
    this.twoHzSubTicksPerGameMinute = Math.max(
      1,
      Math.round(citySimTunables.realSecondsPerGameMinute * citySimTunables.flowCellUpdateHz),
    );
    // Flag-gated per-system profiling: read ONCE at construction. When off, no Date.now() or Map writes
    // ever happen in the tick path (the `if (this.profileEnabled)` guard is the only overhead).
    this.profileEnabled = process.env['CITYSIM_PROFILE'] === 'on';
    if (this.profileEnabled) {
      this.logger.log('CITYSIM_PROFILE=on — per-system tick profiling enabled (measurement only, zero behavior change)');
    }
    // Seed the registry with the canonical no-op placeholders so the engine runs with zero real systems.
    this.seedNoOpPlaceholders();
  }

  // ───────────────────────────── registry (the T2 contract) ─────────────────────────────

  /**
   * Register a real `CitySimSystem` at its declared (cadence, order). T2–T13 call this in their module's
   * onApplicationBootstrap (or via DI in the SchedulerModule). The (cadence, order, id) MUST match a slot
   * in `SCHEDULE` — registering an out-of-band system throws (no ad-hoc ordering). A real registration
   * REPLACES the no-op placeholder for that exact slot (same id+cadence+order).
   */
  registerSystem(system: CitySimSystem): void {
    const slot = CitySimSchedulerService.SCHEDULE.find(
      (s) => s.id === system.id && s.cadence === system.cadence && s.order === system.order,
    );
    if (!slot) {
      throw new Error(
        `CitySimScheduler: refusing to register ${system.id} at cadence=${system.cadence} order=${system.order} — ` +
          `no matching slot in the canonical SCHEDULE (cross_system_interactions §Ordre DAG canonique).`,
      );
    }
    const list = this.registry.get(system.cadence) ?? [];
    // Replace the placeholder occupying this slot (same id+order), else append.
    const idx = list.findIndex((s) => s.id === system.id && s.order === system.order);
    if (idx >= 0) {
      list[idx] = system;
    } else {
      list.push(system);
    }
    list.sort((a, b) => a.order - b.order);
    this.registry.set(system.cadence, list);
    this.logger.log(`registered ${system.id} → cadence=${system.cadence} order=${system.order}`);
  }

  /** The systems registered for a cadence, in DAG order. Used by the run loops + the advance harness. */
  systemsFor(cadence: Cadence): readonly CitySimSystem[] {
    return this.registry.get(cadence) ?? [];
  }

  /** Subscribe to internal scheduler signals (TickOverrunEvent). Used by BO health surface later. */
  onTickOverrun(listener: (e: TickOverrunEvent) => void): void {
    this.bus.on(CITY_SIM_TICK_OVERRUN_EVENT, listener);
  }

  /**
   * F4 budget snapshot (TD-092): exposes the values the boot RAM watermark and circuit-breaker
   * guards act on, so an E2E spec can assert them DIRECTLY (not indirectly via a boot panic).
   * Called by `GET /v1/_test/citysim/budgets`.
   *
   * measuredRamKb  — same `estimateCitySimRamKb()` call as `logRamWatermark()` (the boot check).
   * criticalRamKb  — `citySimTunables.ramBudgetLowMb * 1024` (the tightest device tier; the panic gate).
   * tickMaxMs      — `citySimTunables.tickMaxMs` (the circuit-breaker threshold).
   * twoHzDegraded  — whether the 2 Hz circuit-breaker has tripped since boot.
   * twoHzCurrentHz — actual current Hz (2 = nominal, 1 = degraded).
   */
  getBudgetSnapshot(): {
    measuredRamKb: number;
    criticalRamKb: number;
    tickMaxMs: number;
    twoHzDegraded: boolean;
    twoHzCurrentHz: number;
  } {
    return {
      measuredRamKb: this.estimateCitySimRamKb(),
      criticalRamKb: citySimTunables.ramBudgetLowMb * 1024,
      tickMaxMs: citySimTunables.tickMaxMs,
      twoHzDegraded: this.twoHzDegraded,
      twoHzCurrentHz: this.twoHzCurrentHz,
    };
  }

  /** Per-cadence SLI snapshot (tick_schedule §SLIs — exposed to BO ops surface in a later task). */
  getStats(): {
    twoHzHz: number;
    twoHzDegraded: boolean;
    tickMaxMs: number;
    metrics: Record<string, CadenceMetric>;
  } {
    const out: Record<string, CadenceMetric> = {};
    for (const [c, m] of this.metrics) out[c] = { ...m };
    return {
      twoHzHz: this.twoHzCurrentHz,
      twoHzDegraded: this.twoHzDegraded,
      tickMaxMs: citySimTunables.tickMaxMs,
      metrics: out,
    };
  }

  /**
   * Return the accumulated per-system profile metrics, sorted by totalMs descending.
   * Each entry includes the key (`cadence/systemId`), raw totals, and derived ms/call + pct-of-total.
   * Only meaningful when CITYSIM_PROFILE=on; returns empty array when off (the flag is off by default).
   */
  getProfileStats(): SystemProfileMetric[] {
    const rows: SystemProfileMetric[] = [];
    let grandTotal = 0;
    for (const [, v] of this.profileData) grandTotal += v.totalMs;

    for (const [key, v] of this.profileData) {
      const [cadence, ...rest] = key.split('/');
      rows.push({
        key,
        cadence: cadence ?? key,
        systemId: rest.join('/'),
        totalMs: v.totalMs,
        calls: v.calls,
        msPerCall: v.calls > 0 ? v.totalMs / v.calls : 0,
        pctOfTotal: grandTotal > 0 ? (v.totalMs / grandTotal) * 100 : 0,
      });
    }
    return rows.sort((a, b) => b.totalMs - a.totalMs);
  }

  /** Reset the per-system profile accumulators (call before a fresh profiling run). */
  resetProfileStats(): void {
    this.profileData.clear();
  }

  // ───────────────────────────── bootstrap: RAM watermark + loops ─────────────────────────────

  onApplicationBootstrap(): void {
    this.logRamWatermark();
    // The continuous real-time loops are OPT-IN day-1 (CITYSIM_CONTINUOUS_LOOPS=1). Default OFF because
    // the deterministic advance harness is THE canonical clock-driver for the whole of Phase 1 (every
    // downstream system E2E, T2–T13, drives the sim through it). Background timers ticking a player out of
    // band would race the per-test DB assertions — so they stay off until a phase explicitly enables them.
    // The loops themselves are fully implemented + tested-by-construction (they reuse the SAME advancePlayer
    // engine as the harness), so flipping this flag on in a live deployment runs the world 24/7 (P1 slow-tick).
    if (process.env.CITYSIM_CONTINUOUS_LOOPS === '1') {
      this.startContinuousLoops();
    } else {
      this.logger.log(
        'continuous loops OFF (CITYSIM_CONTINUOUS_LOOPS != 1) — deterministic advance harness drives ticks ' +
          '(Phase 1 canonical driver). Loops reuse the same advancePlayer engine; flip the flag to run 24/7.',
      );
    }
  }

  onModuleDestroy(): void {
    if (this.twoHzTimer) clearInterval(this.twoHzTimer);
    if (this.minuteTimer) clearInterval(this.minuteTimer);
  }

  /**
   * RAM watermark (tick_schedule §RAM watermark au démarrage): log the city-sim KB budget at bootstrap and
   * wire the panic-if-over-critical guard. Day-1 the per-system structures are empty (systems land T2–T13),
   * so the measured footprint is ~0 KB; the guard is wired so it bites once the registry grows. The critical
   * SLI is the tightest device tier RAM budget (perf.low.ram_budget_mb), per §SLIs `city_sim_ram_kb`.
   */
  private logRamWatermark(): void {
    const measuredKb = this.estimateCitySimRamKb();
    const criticalKb = citySimTunables.ramBudgetLowMb * 1024;
    // The mid/high device tiers are informational at boot (the gate is the tightest = low tier); logging them
    // here honours that — they are read, not resolved-but-unused.
    const midKb = citySimTunables.ramBudgetMidMb * 1024;
    const highKb = citySimTunables.ramBudgetHighMb * 1024;
    this.logger.log(
      `city_sim_ram_kb=${measuredKb} (critical=${criticalKb} KB = perf.low.ram_budget_mb; ` +
        `mid=${midKb} KB = perf.mid.ram_budget_mb, high=${highKb} KB = perf.high.ram_budget_mb, informational; ` +
        `systems empty until T2–T13 register real state stores)`,
    );
    if (measuredKb > criticalKb) {
      // Panic — never a silent degradation (tick_schedule §Edge cases: RAM allocation partielle).
      throw new Error(
        `CitySimScheduler RAM watermark exceeded critical budget: ${measuredKb} KB > ${criticalKb} KB ` +
          `(perf.low.ram_budget_mb). Refusing to serve on an over-budget city sim.`,
      );
    }
  }

  /**
   * City-sim RAM estimate (KB). Day-1 a logged stub the registry can grow: each registered system will
   * later report its own footprint. Until then the engine holds only the empty registry maps → ~0 KB.
   */
  private estimateCitySimRamKb(): number {
    // The registry maps + metric maps are negligible; systems report real footprints when they land.
    return 0;
  }

  // ───────────────────────────── continuous loops (real-time) ─────────────────────────────

  /**
   * Start the two continuous loops. The 2 Hz loop is the real-time band; the minute loop derives its real
   * period from the master ratio (tick.real_seconds_per_game_minute × 1000 ms). The slower in-game cadences
   * (30-min, 12-h, nightly, weekly) are NOT separate real timers — they are crossed when game_minute passes
   * their boundary, evaluated inside the minute loop per player (tick_schedule §Edge cases: missed-tick =
   * exactly one tick on wake, no multi-catch-up).
   */
  private startContinuousLoops(): void {
    this.twoHzTimer = setInterval(() => void this.runTwoHzLoop(), TWO_HZ_REAL_MS);
    const minuteRealMs = citySimTunables.realSecondsPerGameMinute * 1000;
    this.minuteTimer = setInterval(() => void this.runMinuteLoop(), minuteRealMs);
    this.logger.log(
      `continuous loops started: 2 Hz (${TWO_HZ_REAL_MS}ms) + minute (${minuteRealMs}ms = ` +
        `tick.real_seconds_per_game_minute). 30-min/12-h/nightly/weekly crossed inside the minute loop.`,
    );
  }

  /**
   * W1.1-d C3 — the real-time cutoff for "session fresh" (`session.repository.ts#findFreshActive`'s OWN
   * predicate, `started_at >= now - staleMinutes`). Factored out so `activePlayerIds` (bulk) and
   * `hasFreshSession` (per-player) can never drift against each other. NOT routed through the CITYSIM_CLOCK
   * seam (§4) — session freshness is a REAL wall-clock concept the SAME way `session.repository.ts` already
   * reads it (`Date.now()`), independent of the city-sim tick clock this chunk seams; this method is NOT a
   * reuse of `SessionRepository` itself (that would open a module cycle — `SessionModule` already imports
   * `SchedulerModule` for `CitySimSchedulerService`, so the reverse import back here would close a 2-way
   * cycle) — it re-derives the SAME predicate directly over `gameplaySessionRow`, the established
   * `FlagDisciplineRepository`/`ExceptionsRepository` "re-provide the trivial DB-only shape" precedent
   * (`session.module.ts`'s own header) applied to a plain query instead of a class.
   */
  private freshSessionCutoff(): Date {
    return new Date(Date.now() - coreLoopsTunables.sessionStaleTimeoutRealMinutes * 60_000);
  }

  /**
   * W1.1-d C3 — the player population the continuous loops tick, BOUNDED to sessions currently OPEN and
   * FRESH (`ended_at IS NULL AND started_at >= cutoff`) — EXACTLY `session.repository.ts#findFreshActive`'s
   * own predicate (design §2: "aucune notion nouvelle inventée"), minus the per-player filter (this needs
   * the whole population, not one player's row). WAS: every row in `city_sim_clock`, unbounded (§3.2 — the
   * argument FOR this bound: an unbounded `SELECT` on every real-time tick does not scale with the player
   * base — NOT an argument for lazy catch-up). Ruling user (design §0): this is what keeps every ticked
   * player's `game_minute` IN PHASE — a stale/closed session simply stops advancing rather than drifting
   * the player's clock while nobody is looking.
   */
  private async activePlayerIds(): Promise<string[]> {
    const rows = await this.db
      .select({ player_id: gameplaySessionRow.player_id })
      .from(gameplaySessionRow)
      .where(and(isNull(gameplaySessionRow.ended_at), gte(gameplaySessionRow.started_at, this.freshSessionCutoff())));
    return rows.map((r) => r.player_id);
  }

  /** W1.1-d C3 — the SAME bounded-session predicate as `activePlayerIds`, scoped to ONE player. Used by
   *  `tickIfDue` as a defense-in-depth re-check (the bulk list a tour started with can go stale mid-tour
   *  as sessions close) AND, in isolation, as the falsifiable unit for "bounded to open sessions" — it
   *  touches only `playerId`'s OWN row, so proving it via `_test/citysim/tick-if-due` never risks
   *  perturbing an unrelated co-tenant player sharing the same E2E stack (unlike driving the REAL bulk
   *  population, which this method deliberately avoids needing for that specific proof). */
  private async hasFreshSession(playerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: gameplaySessionRow.gameplay_session_id })
      .from(gameplaySessionRow)
      .where(
        and(
          eq(gameplaySessionRow.player_id, playerId),
          isNull(gameplaySessionRow.ended_at),
          gte(gameplaySessionRow.started_at, this.freshSessionCutoff()),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * W1.1-d C2 — advance ONE player by exactly one tick, but ONLY when BOTH hold: (1) their session is
   * open+fresh (`hasFreshSession` — C3's bound) and (2) the injected `CITYSIM_CLOCK` reports real time has
   * actually moved forward since their `last_real_tick_at` (`elapsedMs > 0`). Design §4.1: "elapsed ≤ 0 ⇒
   * zéro tick, jamais d'exception, jamais de réhorodatage en arrière" — the ONE behavior that can neither
   * throw (`advancePlayer`'s `ticks < 1` guard, :1123-1125 in the design's own citation) nor move the
   * stored timestamp backward: EITHER guard failing means this method returns WITHOUT ever calling
   * `advancePlayer`, so that guard is simply never reached with an invalid `ticks`. A player who never
   * ticked yet (`last_real_tick_at IS NULL` — every fresh signup, C1.3) falls back to
   * `CITYSIM_CLOCK_EPOCH_FLOOR`, not to `now` itself (see that constant's own header for why the obvious-
   * looking `now` fallback is a bug, not a simplification) — so their first tick fires the first time the
   * clock has moved at all since the dawn of the process, never earlier, never "forever never".
   *
   * This is the unit BOTH the continuous pilot (`runMinuteLoop`/`runContinuousTourForTest` below) and this
   * chunk's own falsifiables (`_test/citysim/tick-if-due`) drive — `advancePlayer` itself is UNCHANGED
   * (the deterministic harness contract, C7: `_test/citysim/advance` never routes through this method).
   */
  async tickIfDue(playerId: string): Promise<{ ticked: boolean; game_minute: number }> {
    await this.ensureClock(playerId);
    const [row] = await this.db
      .select({ game_minute: citySimClock.game_minute, last_real_tick_at: citySimClock.last_real_tick_at })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    const gameMinute = row?.game_minute ?? 0;

    if (!(await this.hasFreshSession(playerId))) {
      return { ticked: false, game_minute: gameMinute };
    }

    const now = this.clock.now();
    const last = row?.last_real_tick_at ?? CITYSIM_CLOCK_EPOCH_FLOOR;
    if (now.getTime() - last.getTime() <= 0) {
      return { ticked: false, game_minute: gameMinute };
    }

    const summary = await this.advancePlayer(playerId, 1);
    return { ticked: true, game_minute: summary.game_minute };
  }

  /**
   * W1.1-d C3 — advance the city-global epoch (`city_epoch`, C1.1's singleton) by exactly one game-minute.
   * UNGATED by session-freshness (unlike per-player ticking above): the epoch is a SINGLE row (O(1) per
   * tour — none of the §3.2 per-player scale concern applies), and its ONLY consumer is "seed a brand new
   * signup's clock in phase with the city" (C1.3, `auth.service.ts:421-425`) — it represents the city's OWN
   * age, not an aggregate over whoever happens to be logged in this exact minute. Advances unconditionally
   * once per tour, gated ONLY by `withCitySimTourLock` (the SAME lock that keeps two replicas from
   * double-advancing it — design §C3's own named acceptance criterion). `db/schema/index.ts:62` and
   * `citysim-test.controller.ts`'s own header already name this method's existence ("C3 is the bounded
   * pilot that organically advances city_epoch.game_minute — NOT [C1]") — this is that pilot.
   */
  private async advanceEpoch(): Promise<void> {
    await this.db
      .update(cityEpoch)
      .set({ game_minute: sql`${cityEpoch.game_minute} + 1` })
      .where(eq(cityEpoch.id, 1));
  }

  /**
   * W1.1-d C3 — ★★ inter-instance exclusion for the continuous-loop tour (design §C3's own acceptance
   * criterion, promoted from a §11 footnote after the review: "une note de bas de page sur un défaut de
   * production est ce qui le fait oublier"). `docker-compose.staging.yml` is a REAL deployment where >1
   * game-back replica is possible; without this, two replicas would each tick every session-fresh player
   * AND advance `city_epoch` every period, double-advancing both.
   *
   * A Postgres SESSION-level advisory lock (`pg_try_advisory_lock` — NON-BLOCKING: a replica that does not
   * hold it skips this period's tour entirely, without error, exactly the "le tour qui ne l'obtient pas
   * passe son tour" remedy the design names), held on a DEDICATED `pool.connect()` client for the duration
   * of `work`. ⚠️ Deviation from the design's own citation: the design names `AmbientMicroEventRepository.
   * generateForDistrict`/`city_sim_system.ts:1170-1171` as "the idiom that already exists in the depot" for
   * this — but that idiom (and every other advisory-lock call site in this codebase — `patrol.repository.ts`,
   * `police_memory.repository.ts`, `buffer-bloat.repository.ts`, `cohesion.repository.ts`,
   * `sparse_citizens.repository.ts`, `deal-lek.repository.ts`, `ambient-micro-event.repository.ts`,
   * `named-sequence.repository.ts`) uses `pg_advisory_xact_lock` (BLOCKING, TRANSACTION-scoped, auto-
   * released at COMMIT), not `pg_try_advisory_lock` — a genuine mismatch between the design's prose and the
   * code it cites (consigned here per the socle's "documenter honnêtement" rule, not silently substituted).
   * A transaction-scoped lock does not fit THIS use: `work` spans many separate `this.db` round-trips
   * (`ensureClock`/`advancePlayer` per player), none of which run inside the lock's own transaction, so a
   * `pg_advisory_xact_lock` acquired in its own short transaction would release the instant THAT
   * transaction committed — long before the tour actually finishes, defeating the whole point. Hence the
   * SESSION-scoped non-blocking form on a client this method owns exclusively for the lock's lifetime
   * (never returned to the pool while held — the `executor?: Tx` pitfall this codebase already documents:
   * a lock acquired on a POOLED connection that goes back into rotation before an explicit unlock would
   * leak onto an unrelated later query) — explicit `pg_advisory_unlock` in a `finally`, always on the SAME
   * client that acquired it, before that client is released back to the pool.
   */
  private async withCitySimTourLock(work: () => Promise<void>): Promise<boolean> {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ locked: boolean }>(
        `SELECT pg_try_advisory_lock(hashtext($1)) AS locked`,
        [CITYSIM_TOUR_LOCK_KEY],
      );
      if (!rows[0]?.locked) {
        this.logger.debug(
          'citysim continuous tour: advisory lock held by another instance — skipping this period',
        );
        return false;
      }
      try {
        await work();
        return true;
      } finally {
        await client.query(`SELECT pg_advisory_unlock(hashtext($1))`, [CITYSIM_TOUR_LOCK_KEY]);
      }
    } finally {
      client.release();
    }
  }

  /**
   * 2 Hz loop. Guarded sequential execution (tick_schedule §Separation compute): if a continuous tick is
   * still in flight, skip this 2 Hz step rather than overlap. Measures duration vs perf.game.tick_max_ms;
   * 3 consecutive overruns → circuit-breaker degrade to 1 Hz + TickOverrunEvent + WARN (no silent degrade).
   */
  private async runTwoHzLoop(): Promise<void> {
    if (this.continuousTickInFlight) return; // separation guard — minute tick wins, 2 Hz is soft priority.
    this.continuousTickInFlight = true;
    const started = Date.now();
    try {
      const players = await this.activePlayerIds();
      for (const playerId of players) {
        const gm = await this.readGameMinute(playerId);
        await this.runCadence(Cadence.TWO_HZ, { playerId, cadence: Cadence.TWO_HZ, gameMinute: gm, subTick: 0 });
      }
    } catch (err) {
      this.logger.error(`2 Hz loop error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      const durationMs = Date.now() - started;
      this.recordMetric(Cadence.TWO_HZ, durationMs);
      this.evaluateCircuitBreaker(durationMs);
      this.continuousTickInFlight = false;
    }
  }

  /**
   * W1.1-d C6 — ONE tour's SHARED body: lock → advance epoch → tick every session-fresh player, recording
   * the C6 observability metric (`recordPilotTourMetric` below) on every LOCK-ACQUIRING run (a period that
   * skips because another replica holds the lock leaves THIS instance's own metrics untouched — it did no
   * work this period, so it reports none). Both `runMinuteLoop` (the real `setInterval`-driven prod path)
   * and `runContinuousTourForTest` (C3's bypass-`setInterval` test driver) call this SAME body — never two
   * divergent copies (the `advancePlayer` header's own "SAME engine ... prod and test never diverge"
   * discipline, extended here from the tick level to the TOUR level). `afterWork` (optional) runs INSIDE
   * the lock, after the tick loop — `runContinuousTourForTest`'s own `holdMs` sleep, below.
   */
  private async runOneTour(afterWork?: () => Promise<void>): Promise<{
    lockAcquired: boolean;
    populationCount: number;
    tickedPlayerIds: string[];
  }> {
    const started = Date.now();
    let populationCount = 0;
    const tickedPlayerIds: string[] = [];
    const lockAcquired = await this.withCitySimTourLock(async () => {
      await this.advanceEpoch();
      const players = await this.activePlayerIds();
      populationCount = players.length;
      for (const playerId of players) {
        const result = await this.tickIfDue(playerId);
        if (result.ticked) tickedPlayerIds.push(playerId);
      }
      if (afterWork) await afterWork();
    });
    if (lockAcquired) {
      this.recordPilotTourMetric(populationCount, tickedPlayerIds.length, Date.now() - started);
    }
    return { lockAcquired, populationCount, tickedPlayerIds };
  }

  /**
   * Minute loop. Advances every session-fresh player (C3 — `activePlayerIds`, was: every player with a
   * clock row, unbounded) by ONE in-game minute via `tickIfDue` (C2 — the elapsed-guarded, fail-
   * deterministic dispatch: a player whose clock hasn't genuinely moved, or whose session just went stale,
   * gets `ticked:false`, never an exception) and fires every in-game cadence boundary that minute crosses
   * (in CADENCE_PRIORITY order, inside `advancePlayer`). Also advances `city_epoch` once per tour (C3 —
   * `advanceEpoch`). The WHOLE tour runs behind `withCitySimTourLock` — a concurrent replica's tour this
   * SAME period is skipped, not doubled (design §C3 acceptance criterion). Uses the shared `advancePlayer`
   * engine so the continuous path and the deterministic harness are the SAME code (no drift between prod +
   * test driver). C6: delegates to `runOneTour` (shared with `runContinuousTourForTest` below).
   */
  private async runMinuteLoop(): Promise<void> {
    if (this.continuousTickInFlight) return;
    this.continuousTickInFlight = true;
    const started = Date.now();
    try {
      await this.runOneTour();
    } catch (err) {
      this.logger.error(`minute loop error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.recordMetric(Cadence.MINUTE, Date.now() - started);
      this.continuousTickInFlight = false;
    }
  }

  /**
   * TEST-ONLY (W1.1-d C3): run ONE continuous-loop tour immediately, bypassing the `setInterval` timer —
   * the SAME "drive the real method directly" idiom `MaintenancePhaseTickService.runNightlyTick`'s own
   * `_test/maintenance/run-phase-tick` route uses (`maintenance-test.controller.ts`'s own header). Delegates
   * to `runOneTour` (C6 — the SAME body `runMinuteLoop` runs: lock → advance epoch → tick every
   * session-fresh player) — never a parallel re-implementation — plus one TEST-ONLY addition that never
   * affects the real periodic path:
   *
   *   - `holdMs`: after the tick loop completes, sleep `holdMs` BEFORE releasing the advisory lock. This is
   *     the ONLY way to make `pg_try_advisory_lock`'s non-blocking race observable/deterministic under N
   *     concurrent HTTP calls (`Promise.all(Array.from({length:N}, ...))`, this codebase's own concurrent-
   *     probe idiom — `hl_card.spec.ts`'s 12-concurrent-opens proof) instead of a race that MIGHT or might
   *     not genuinely overlap. Default 0 — zero behavior change from a bare call.
   *
   * The return value surfaces `lockAcquired` + the post-tour epoch value + which players were ticked —
   * `runMinuteLoop` itself returns nothing (fire-and-forget from `setInterval`); a test needs to SEE the
   * outcome of one specific tour.
   */
  async runContinuousTourForTest(
    holdMs = 0,
  ): Promise<{ lockAcquired: boolean; epochGameMinute: number; tickedPlayerIds: string[] }> {
    const { lockAcquired, tickedPlayerIds } = await this.runOneTour(
      holdMs > 0 ? () => new Promise<void>((resolve) => setTimeout(resolve, holdMs)) : undefined,
    );
    const [epochRow] = await this.db.select({ game_minute: cityEpoch.game_minute }).from(cityEpoch).limit(1);
    return { lockAcquired, epochGameMinute: epochRow?.game_minute ?? 0, tickedPlayerIds };
  }

  /**
   * W1.1-d C6 — the pilot-tour observability accumulators (in-memory, day-1 — mirrors `metrics`/
   * `profileData`'s own in-process SLI pattern above). Updated ONLY by `runOneTour`, ONLY on a
   * LOCK-ACQUIRING run (a skipped period reports nothing for THIS instance — it did no work).
   */
  private pilotToursRun = 0;
  private pilotLastPopulationCount = 0;
  private pilotLastTickedCount = 0;
  private pilotLastDurationMs = 0;
  private pilotMaxDurationMs = 0;
  private pilotOverruns = 0;

  /**
   * W1.1-d C6 — record one lock-acquiring tour's outcome. `periodBudgetMs` is the SAME real-period the
   * pilot's own `setInterval` is armed at (`realSecondsPerGameMinute × 1000`, `startContinuousLoops`
   * above) — a tour whose OWN duration exceeds its OWN period is the exact "le tour minute qui déborde"
   * defect design §3.2 names (a slow tour still holding the advisory lock when the NEXT setInterval fire
   * lands: `continuousTickInFlight` makes that next fire a silent no-op, and the 2 Hz band starves behind
   * it too — `runTwoHzLoop`'s own separation guard, above). Before this chunk, NOTHING recorded whether
   * that had ever happened; `pilotOverruns` below is the counter that makes it detectable rather than
   * merely theoretically possible.
   */
  private recordPilotTourMetric(populationCount: number, tickedCount: number, durationMs: number): void {
    this.pilotToursRun += 1;
    this.pilotLastPopulationCount = populationCount;
    this.pilotLastTickedCount = tickedCount;
    this.pilotLastDurationMs = durationMs;
    this.pilotMaxDurationMs = Math.max(this.pilotMaxDurationMs, durationMs);
    const periodBudgetMs = citySimTunables.realSecondsPerGameMinute * 1000;
    if (durationMs > periodBudgetMs) this.pilotOverruns += 1;
  }

  /**
   * W1.1-d C6 — the pilot observability SNAPSHOT, exposed via `GET /v1/admin/citysim/pilot-stats`
   * (`citysim-admin.controller.ts`, ALWAYS-ON production route — unlike `_test/citysim/budgets`, which is
   * NODE_ENV-gated and therefore cannot be the "detectable in production" surface design §C6 asks for).
   * `lastPopulationCount` is the falsifiable's OWN cross-check target: it MUST equal `activePlayerIds()`'s
   * own `findFreshActive`-mirroring predicate's count at tour time — never a constant (design §C6).
   */
  getPilotStats(): {
    toursRun: number;
    lastPopulationCount: number;
    lastTickedCount: number;
    lastDurationMs: number;
    maxDurationMs: number;
    periodBudgetMs: number;
    overruns: number;
  } {
    return {
      toursRun: this.pilotToursRun,
      lastPopulationCount: this.pilotLastPopulationCount,
      lastTickedCount: this.pilotLastTickedCount,
      lastDurationMs: this.pilotLastDurationMs,
      maxDurationMs: this.pilotMaxDurationMs,
      periodBudgetMs: citySimTunables.realSecondsPerGameMinute * 1000,
      overruns: this.pilotOverruns,
    };
  }

  /** Circuit-breaker (tick_schedule §Circuit-breaker 2 Hz): 3 consecutive overruns → degrade to 1 Hz. */
  private evaluateCircuitBreaker(durationMs: number): void {
    const threshold = citySimTunables.tickMaxMs;
    if (durationMs > threshold) {
      this.twoHzConsecutiveOverruns += 1;
    } else {
      this.twoHzConsecutiveOverruns = 0; // a healthy tick resets the streak.
    }
    if (this.twoHzConsecutiveOverruns >= CONSECUTIVE_OVERRUN_LIMIT && !this.twoHzDegraded) {
      this.twoHzDegraded = true;
      this.twoHzCurrentHz = DEGRADED_HZ;
      const evt: TickOverrunEvent = {
        cadence: Cadence.TWO_HZ,
        consecutiveOverruns: this.twoHzConsecutiveOverruns,
        lastDurationMs: durationMs,
        thresholdMs: threshold,
        degradedToHz: DEGRADED_HZ,
      };
      // No silent degradation: WARN log + internal event (tick_schedule §Circuit-breaker).
      this.logger.warn(
        `2 Hz circuit-breaker tripped: ${this.twoHzConsecutiveOverruns} consecutive overruns ` +
          `(${durationMs}ms > ${threshold}ms = perf.game.tick_max_ms) → degrading to ${DEGRADED_HZ} Hz`,
      );
      this.bus.emit(CITY_SIM_TICK_OVERRUN_EVENT, evt);
      // Re-arm the 2 Hz timer at the degraded period (1 Hz = 1000 ms).
      if (this.twoHzTimer) clearInterval(this.twoHzTimer);
      this.twoHzTimer = setInterval(() => void this.runTwoHzLoop(), 1000 / DEGRADED_HZ);
    }
  }

  // ───────────────────────────── deterministic advance harness (the T2+ driver) ─────────────────────────────

  /**
   * Advance ONE player's in-game clock by `ticks` in-game minutes AND run every cadence handler for every
   * in-game boundary crossed (minute, 5-min, 30-min, 12-h, nightly, weekly) in DAG order, plus step the
   * 2 Hz systems deterministically. This is THE canonical deterministic clock-driver every downstream
   * system E2E (T2–T13) calls. It is the SAME engine the minute loop uses (advancePlayer), so prod and
   * test never diverge. Lazily creates the clock row on first advance.
   *
   * Returns a small summary: the new game_minute + how many times each cadence fired across the span.
   */
  async advancePlayer(playerId: string, ticks: number): Promise<AdvanceSummary> {
    if (!Number.isInteger(ticks) || ticks < 1) {
      throw new Error(`advancePlayer: ticks must be a positive integer (got ${ticks})`);
    }
    const fired: Record<string, number> = {
      [Cadence.TWO_HZ]: 0,
      minute: 0,
      five_min: 0,
      thirty_min: 0,
      hourly: 0,
      twelve_h: 0,
      nightly: 0,
      weekly: 0,
    };

    // Lazy-create the clock row (idempotent), then ATOMICALLY increment game_minute and read back the
    // authoritative post-increment value. This replaces the old SELECT→compute-in-JS→UPDATE read-modify-write,
    // which had a lost-update window: a continuous minute-tick (CITYSIM_CONTINUOUS_LOOPS=1) interleaving with a
    // test-advance for the SAME player could clobber the other's write. With an atomic `game_minute = game_minute
    // + ticks RETURNING game_minute`, concurrent advances serialize at the DB and each gets a DISJOINT range, so
    // cadence firing stays correct per call. (UPDATE — app_rw has UPDATE on city_sim_clock; migration 0015 §grant.)
    // W1.1-d C2 — `last_real_tick_at` now writes the CITYSIM_CLOCK seam's value (was: `sql\`now()\`` — the
    // Postgres wall clock, one of two DIFFERENT clock sources this chunk unifies, design §4.1 site 1).
    await this.ensureClock(playerId);
    const [row] = await this.db
      .update(citySimClock)
      .set({
        game_minute: sql`${citySimClock.game_minute} + ${ticks}`,
        last_real_tick_at: this.clock.now(),
      })
      .where(eq(citySimClock.player_id, playerId))
      .returning({ game_minute: citySimClock.game_minute });

    // Derive THIS call's half-open range (from, to] from the authoritative returned value — never from a
    // pre-read JS value (which the window made stale).
    const to = row.game_minute;
    const from = to - ticks;

    // Fire every cadence handler for every boundary in (from, to], minute by minute, in DAG order. This is
    // arithmetically identical to the old per-minute loop but bound to the atomic range we own (no SELECT window).
    for (let m = from + 1; m <= to; m += 1) {
      // Step the 2 Hz (real-time) band deterministically: a fixed number of sub-ticks per in-game minute.
      for (let sub = 0; sub < this.twoHzSubTicksPerGameMinute; sub += 1) {
        await this.runCadence(Cadence.TWO_HZ, {
          playerId,
          cadence: Cadence.TWO_HZ,
          gameMinute: m,
          subTick: sub,
        });
        fired[Cadence.TWO_HZ] += 1;
      }
      // Fire each in-game cadence whose boundary minute `m` lands on, in CADENCE_PRIORITY order.
      for (const cadence of this.inGameCadencesCrossedAt(m)) {
        await this.runCadence(cadence, { playerId, cadence, gameMinute: m });
        fired[cadence] += 1;
      }
    }

    return {
      player_id: playerId,
      game_minute: to,
      advanced_by: ticks,
      cadences_fired: fired,
    };
  }

  /**
   * Which in-game cadence boundaries land exactly on `gameMinute` (1-indexed minute boundaries). MINUTE
   * fires every minute; the coarser cadences fire when gameMinute is a multiple of their game-minute width.
   * Returned in CADENCE_PRIORITY order (tick_schedule §Edge cases: 12h before nightly on collision).
   */
  private inGameCadencesCrossedAt(gameMinute: number): Cadence[] {
    const out: Cadence[] = [];
    for (const cadence of CitySimSchedulerService.CADENCE_PRIORITY) {
      if (cadence === Cadence.TWO_HZ) continue; // 2 Hz is the real-time band, stepped separately.
      const width = this.cadenceWidth(cadence);
      if (width > 0 && gameMinute % width === 0) out.push(cadence);
    }
    return out;
  }

  /**
   * Map a cadence to its game-minute boundary width (R2.3 — reads citySimTunables getters directly so a
   * DB-override of richNpcTickMinutes / precinctReviewTickHours / inGameDayLengthMinutes is reflected
   * per-tick without a restart). P23-T8: moved off the module-load-frozen CADENCE_WIDTH_GAME_MINUTES table.
   */
  private cadenceWidth(cadence: Cadence): number {
    switch (cadence) {
      case Cadence.MINUTE:
        return 1; // structural — one in-game minute is always the minimum tick width.
      case Cadence.FIVE_MIN:
        return citySimTunables.richNpcTickMinutes;
      case Cadence.THIRTY_MIN:
        return 30; // structural — 30 is hardcoded in gdd/14 (not a named tunable key).
      case Cadence.HOURLY:
        return 60; // structural — 60 in-game minutes per hour (D1b C2 market lane clearing tick).
      case Cadence.TWELVE_H:
        return citySimTunables.precinctReviewTickHours * 60;
      case Cadence.NIGHTLY:
        return citySimTunables.inGameDayLengthMinutes;
      case Cadence.WEEKLY:
        return citySimTunables.inGameDayLengthMinutes * 7;
      default:
        return 0;
    }
  }

  /** Run every registered system for a cadence, in DAG order, each with its own try/catch. */
  private async runCadence(cadence: Cadence, ctx: CitySimTickContext): Promise<void> {
    // L1 — For the MINUTE band, check whether operational systems can be skipped for this player.
    // The guard returns false ONLY when the player has NO active operational state (confirmed by a
    // union-EXISTS query). Order 13 (RAID_EXECUTION) is always run — its trigger is exogenous.
    // Unknown player → guard TRUE (fail-safe). This is checked once per tick per player.
    let skipOperational = false;
    if (cadence === Cadence.MINUTE && ctx.playerId !== undefined) {
      skipOperational = !(await this.guardService.isActive(ctx.playerId, ctx.gameMinute));
    }

    for (const system of this.systemsFor(cadence)) {
      // L1 skip: if the guard confirmed no operational state for this player, skip skippable orders.
      if (skipOperational && CitySimSchedulerService.SKIPPABLE_OPERATIONAL_ORDERS.has(system.order)) {
        continue;
      }
      // Flag-gated per-system timing: zero overhead (no Date.now, no Map writes) when profileEnabled=false.
      // The instrumentation wraps the SAME `await system.run(ctx)` — control flow, ordering, and tick logic
      // are unchanged (determinism invariant). The timer measures wall-time of the existing await only.
      if (this.profileEnabled) {
        const t0 = Date.now();
        try {
          await system.run(ctx);
        } catch (err) {
          this.logger.error(
            `system ${system.id} failed in cadence=${cadence} (player=${ctx.playerId}, gm=${ctx.gameMinute}): ` +
              `${err instanceof Error ? err.message : String(err)}`,
          );
        } finally {
          const elapsed = Date.now() - t0;
          const key = `${cadence}/${system.id}`;
          const entry = this.profileData.get(key) ?? { totalMs: 0, calls: 0 };
          entry.totalMs += elapsed;
          entry.calls += 1;
          this.profileData.set(key, entry);
        }
      } else {
        try {
          await system.run(ctx);
        } catch (err) {
          // A failing system never aborts the cadence (downstream systems still run on last-good state).
          this.logger.error(
            `system ${system.id} failed in cadence=${cadence} (player=${ctx.playerId}, gm=${ctx.gameMinute}): ` +
              `${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  // ───────────────────────────── clock persistence helpers ─────────────────────────────

  /** Lazy-create the per-save clock row (game_minute=0). Idempotent (ON CONFLICT DO NOTHING). W1.1-d C2 —
   *  `last_real_tick_at` now writes the CITYSIM_CLOCK seam's value (was: `new Date()` — the Node wall
   *  clock, the SECOND of two DIFFERENT clock sources this chunk unifies, design §4.1 site 2). A player
   *  whose row ALREADY exists (the normal case — C1.3 seeds it at signup, leaving `last_real_tick_at`
   *  NULL) is untouched by this INSERT (`onConflictDoNothing`) — this write only fires for a clock row
   *  created OUTSIDE signup (test-seeded players, design §8's 2323-player contingent). */
  private async ensureClock(playerId: string): Promise<void> {
    await this.db
      .insert(citySimClock)
      .values({ player_id: playerId, game_minute: 0, last_real_tick_at: this.clock.now() })
      .onConflictDoNothing({ target: citySimClock.player_id });
  }

  /** Read a player's current in-game minute (0 if no row — caller ensures the row exists first). */
  private async readGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  // ───────────────────────────── metrics + placeholders ─────────────────────────────

  private recordMetric(cadence: Cadence, durationMs: number): void {
    const m = this.metrics.get(cadence) ?? { runs: 0, lastDurationMs: 0, maxDurationMs: 0, overruns: 0 };
    m.runs += 1;
    m.lastDurationMs = durationMs;
    m.maxDurationMs = Math.max(m.maxDurationMs, durationMs);
    if (cadence === Cadence.TWO_HZ && durationMs > citySimTunables.tickMaxMs) m.overruns += 1;
    this.metrics.set(cadence, m);
  }

  /**
   * Seed the registry with no-op placeholders for every SCHEDULE slot so the engine runs end-to-end with
   * ZERO real systems (T1). T2–T13 call `registerSystem` to REPLACE a placeholder with a real system.
   */
  private seedNoOpPlaceholders(): void {
    for (const slot of CitySimSchedulerService.SCHEDULE) {
      const list = this.registry.get(slot.cadence) ?? [];
      list.push({
        id: slot.id,
        cadence: slot.cadence,
        order: slot.order,
        run: () => {
          /* no-op placeholder — replaced by the real system in T2–T13 */
        },
      });
      list.sort((a, b) => a.order - b.order);
      this.registry.set(slot.cadence, list);
    }
  }
}
