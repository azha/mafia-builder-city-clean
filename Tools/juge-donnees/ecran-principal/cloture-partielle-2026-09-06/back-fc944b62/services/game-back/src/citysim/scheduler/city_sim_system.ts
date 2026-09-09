// IMPLEMENTS: docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (Interface
//             `SystemUpdate` partagée + `update(tick)`) + cross_system_interactions.md §Ordre DAG canonique
//             -- session:2026-06-02 (Phase 1 Task 1) --
//
// The system-hook registry CONTRACT — the seam the 11 city-sim systems (T2–T13) plug into. T1 ships
// this interface + ordering + no-op placeholders so the engine runs end-to-end with ZERO real systems.
// Keep this decoupled from system internals: a system registers a `CitySimSystem` for a (cadence, order)
// slot and the scheduler runs it; the scheduler never imports a concrete system module.

/**
 * The canonical cadences of the CitySimScheduler (tick_schedule_and_memory_budget.md §Full tick schedule).
 * Each cadence is a distinct execution band; systems declare their PRIMARY cadence (+ optional downstream
 * cadences via separate registrations). `TWO_HZ` is real-time (flow_cell_update_hz); the rest are in-game.
 * `ON_EVENT` is event-driven (System 3 Police Memory) — not on a fixed boundary; the scheduler exposes a
 * hook list that the event bus drives in T4+.
 */
export enum Cadence {
  /** 2 Hz real-time — System 1 → System 11 → System 2 (composition_overview §Tick schedule canonique). */
  TWO_HZ = 'two_hz',
  /** Every in-game minute — System 9 → System 8 → System 10 → Heat. */
  MINUTE = 'minute',
  /** Every 5 in-game minutes — System 2 schedule update. */
  FIVE_MIN = 'five_min',
  /** Every 30 in-game minutes — System 4 observation accumulation. */
  THIRTY_MIN = 'thirty_min',
  /** Every 60 in-game minutes — D1b C2 Lane Collapse Pricing hourly clearing tick (2.1). */
  HOURLY = 'hourly',
  /** Every 12 in-game hours — System 4 precinct review → System 6 MIS pull → System 2 biographies. */
  TWELVE_H = 'twelve_h',
  /** Nightly / every in-game day — System 5 cohesion → System 7 unconformity. */
  NIGHTLY = 'nightly',
  /** Weekly (in-game) — System 11 lek decay → System 10 percentile baseline reset. */
  WEEKLY = 'weekly',
  /** On-event (async) — System 3 Police Memory (CityEventBus subscriber); never on a fixed boundary. */
  ON_EVENT = 'on_event',
}

/**
 * Canonical city-sim system identity (composition_overview.md §Les 11 systèmes — table d'identité).
 * Stable string ids so a system can be looked up / logged / projected without importing its module.
 */
export enum CitySystemId {
  FLOW_CELLS = 'system_1_flow_cells',
  SPARSE_CITIZENS = 'system_2_sparse_citizens',
  POLICE_MEMORY = 'system_3_police_memory',
  PATROL_DOCTRINE = 'system_4_patrol_doctrine',
  COHESION_PERMAFROST = 'system_5_cohesion_permafrost',
  INSPECTION_QUEUE = 'system_6_inspection_queue',
  UNCONFORMITY_LEDGERS = 'system_7_unconformity_ledgers',
  THROUGHPUT_TRILEMMA = 'system_8_throughput_trilemma',
  ERLANG_STASH = 'system_9_erlang_stash',
  BUFFER_BLOAT = 'system_10_buffer_bloat',
  DEAL_LEK = 'system_11_deal_lek',
  HEAT = 'heat_cross_system',
  /**
   * Phase 2 — the OPERATIONAL conversion-setup advancer (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band: each in-game minute it decrements
   * setup_remaining_ticks on in-progress building conversions and flips conversion_stage → 'operational' at 0.
   */
  OPERATIONAL_SETUP = 'operational_conversion_setup',
  /**
   * Phase 2 — the OPERATIONAL precursor-arrival advancer (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs in the MINUTE band after OPERATIONAL_SETUP: each in-game
   * minute it delivers pending precursor_orders whose arrives_at_tick has passed — marks them 'delivered' and
   * increments precursor_stock (Pyralin sourcing arrival, precursors_supply_chain.md §Canal légitime — Pyralin).
   */
  PRECURSOR_ARRIVAL = 'operational_precursor_arrival',
  /**
   * Phase 2 — the OPERATIONAL Brindle cook-advance advancer (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs in the MINUTE band after PRECURSOR_ARRIVAL: each in-game
   * minute it advances in-progress cook_sessions one functional stage at a time per the uniform stage-duration clock,
   * and on completion of stage_4 yields the finished Brindle into product_storage (cook cycle, production_brindle.md
   * §Vue d'ensemble du pipeline 4-stage). Deterministic (NO RNG).
   */
  COOK_ADVANCE = 'operational_cook_advance',
  /**
   * Phase 2 — the OPERATIONAL foot-courier transit advancer (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs in the MINUTE band after COOK_ADVANCE: each in-game minute it
   * advances in-transit courier_shifts along their route (the foot-speed-derived deterministic transit duration), and
   * on arrival transfers the carried cargo (courier_shift.cargo_grams) into the destination product_storage + marks
   * the shift completed / the courier at_destination (foot courier distribution, distribution_couriers_runners.md
   * §`Courier`/§`Route`/§Data model `Shift`). Deterministic (NO RNG).
   */
  COURIER_TRANSIT = 'operational_courier_transit',
  /**
   * Phase 2 — the OPERATIONAL dealer-sell advancer (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs in the MINUTE band after COURIER_TRANSIT: each in-game minute
   * it sells product at every WORKING dealer assigned to a dealer-spot whose covered lek tile (deal_leks, System 11 —
   * CONSUMED, never recomputed) has a lek present — decrements the dealer-spot building's product_storage by the
   * per-tick sell amount (guarded, min(rate, available)) and increments the dealer's cash float (dealer.float_cents)
   * by amount × deal value, in batched set-based SQL (dealer selling at leks, selling_dealers_leks.md §How a deal
   * works — cash transfert vers dealer.float_cents). Deterministic (NO RNG).
   */
  DEALER_SELL = 'operational_dealer_sell',
  /**
   * Phase 2 — the OPERATIONAL laundering clean-output advancer (NOT one of the 11 city-sim systems; an
   * operational-chain tick-hook that plugs into the SAME scheduler). Runs in the MINUTE band after DEALER_SELL: each
   * in-game minute it reads each Stage-1 laundering node's cleanliness_at_output (the [0,1] float SYSTEM 8 recomputes
   * at MINUTE/2 — CONSUMED, never recomputed) and, once a node's cleaned cash reaches the clean band, releases the
   * laundered output to the wallet (economy_states.cash_cents += buffered_cents × (1 - dwell_tax_rate)) and zeroes
   * tail_risk_estimates.current_occupancy (buffer_load re-syncs to 0 on System 10's next tick), in batched set-based
   * SQL (laundering Stage 1 → clean cash, laundering_pipeline.md §Stage 2 / §Stage 4). Placed AFTER System 8
   * (MINUTE/2) in the per-minute span so the cleanliness it reads is the freshest recompute. Deterministic (NO RNG).
   */
  LAUNDER_OUTPUT = 'operational_launder_output',
  /**
   * Phase 2 — the OPERATIONAL heat-contribution advancer (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band after LAUNDER_OUTPUT: each in-game
   * minute it reads each product-HOLDING building (product_storage > 0) and EMITS a HeatInjectionEvent on the
   * CityEventBus (the SAME seam System 10's BufferOverflow re-emit uses) with the storage magnitude band — the passive
   * "holding product radiates background heat" contribution (product_storage.md §Storage heat). The cook-completion +
   * per-deal heat contributions are point-emissions at their own tick sites (COOK_ADVANCE / DEALER_SELL); this slot
   * owns ONLY the per-tick storage contribution. It WRITES nothing — System Heat (MINUTE/4) buffers the injection and
   * flushes it onto buildings.heat on its next tick (R9.3 — consume, don't reimplement). Deterministic (NO RNG).
   */
  OPERATIONAL_HEAT_CONTRIB = 'operational_heat_contrib',
  /**
   * Phase 2b — the OPERATIONAL raid-execution FLUSH (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band after OPERATIONAL_HEAT_CONTRIB: each
   * in-game minute it DRAINS the buffer of RaidPlannedEvents the RaidExecutionService accumulated on the CityEventBus
   * (the buffer-on-event + flush-on-tick discipline the HeatPropagationService established — onRaidPlanned is a
   * synchronous BUFFER, never a per-event DB write) and EXECUTES the seizures set-based in a transaction: for the
   * player's operational product-holding buildings (lab/stash) on each raided block, seizes product_storage +
   * transitions structural_state → 'damaged' + inserts a building_raid ledger row. CONSUMES the existing
   * RaidPlannedEvent (System 4 Patrol Doctrine — never reimplements raid-decision logic). Deterministic (NO RNG).
   */
  RAID_EXECUTION = 'operational_raid_execution',
  /**
   * Phase 2b — the OPERATIONAL repair-completion advancer (NOT one of the 11 city-sim systems; an operational-chain
   * tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band after RAID_EXECUTION: each in-game
   * minute it set-based flips every 'repairing' building whose `repair_completes_at_tick <= current_tick` back to
   * structural_state='operational' (NULLing repair_completes_at_tick — the repair is no longer armed) + moves the
   * corresponding building_raid row status repairing → repaired. The cook/storage/deal ticks gate on
   * structural_state='operational' (T2), so a repaired building's ops RESUME from the next tick (the repair recovery
   * of the raid consequence loop — design §2). Deterministic (NO RNG; a fixed function of repair_completes_at_tick vs
   * the current tick). Organically a no-op (no building under repair — the common case).
   */
  OPERATIONAL_REPAIR = 'operational_repair',
  /**
   * Phase 2b — the OPERATIONAL Crick cold-chain degrade advancer (NOT one of the 11 city-sim systems; an
   * operational-chain tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band after
   * OPERATIONAL_REPAIR: each in-game minute it degrades the player's WARM cold-chain product (Crick — coldChain=true)
   * set-based: a STORED holding of a cold-chain substance in a building that is NOT cold_storage_capable loses the
   * MODERATE per-tick grams rate; an IN-TRANSIT cargo of a cold-chain substance on a courier that is NOT a
   * refrigerated_van loses the HOT per-tick grams rate. Both decrements are GUARDED ≥ 0 (greatest(qty - rate, 0)).
   * Cold holdings (cold_storage_capable — a refinery / cold stash) + refrigerated_van cargo are SKIPPED (preserved).
   * Brindle (coldChain=false) is NEVER selected (not in the registry-derived cold-chain substance set). Deterministic
   * (NO RNG; a fixed grams/tick). Organically a no-op (no warm Crick — the common case).
   */
  COLD_CHAIN_DEGRADE = 'operational_cold_chain_degrade',
  /**
   * 04b-A C3 — the RIVAL AI regime pressure recompute + flip tick (NOT one of the 11 city-sim systems;
   * an 04b-A operational-chain tick-hook on the SHARED scheduler). Runs in the TWELVE_H band (order 6,
   * LAST after MONEY_HOLDING_AUDIT/5) — consumes heat/reputation/cohesion that have all settled in their
   * own bands. Each 12-game-hour sweep it: (1) recomputes regime_pressure from territory/casualty/revenue
   * inputs + peaceful-decay; (2) threshold-compares vs flip_threshold; (3) flips regime + emits
   * RegimeTransitionEvent if threshold crossed; (4) runs the intel-mode flip (§3.7 on the same sweep).
   * DD-MODULE §4.2: TWELVE_H / order 6 (next free after MONEY_HOLDING_AUDIT/5). Empty-state L1 skip:
   * no rivals seeded → ZERO writes (the byte-identical no-regression guarantee). Per-rival try/catch.
   * Deterministic (NO RNG except the seeded tie-break). Registered by RivalTickService.onApplicationBootstrap.
   */
  RIVAL_REGIME_TICK = 'rival_regime_tick',
  /**
   * 04b-A C3 — the RIVAL AI daily decay tick (NOT one of the 11 city-sim systems; an 04b-A operational-chain
   * tick-hook on the SHARED scheduler). Runs in the NIGHTLY band (order 13, LAST after ROUTE_SEVER_SWEEP/12).
   * Each in-game night it: (1) applies the peaceful-pressure decay (-2/day per regimePressureDecayRatePeacefulPerDay)
   * to every rival's regime_pressure; (2) runs the Adaptive Skin unused-pattern decay hook (C7 body lands in C7 —
   * the call site is wired here). DD-MODULE §4.2: NIGHTLY / order 13 (next free after ROUTE_SEVER_SWEEP/12).
   * Empty-state L1 skip: no rivals → ZERO writes. Per-rival try/catch. Deterministic (NO RNG).
   * Registered by RivalTickService.onApplicationBootstrap.
   */
  RIVAL_DAILY_TICK = 'rival_daily_tick',
  /**
   * Phase 2b vector #2b — the OPERATIONAL Hush addiction-loyalty decay/withdrawal advancer (NOT one of the 11 city-sim
   * systems; an operational-chain tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band after
   * COLD_CHAIN_DEGRADE/15: each in-game minute it ages the player's Hush dealer-spot loyalty (hush_addiction —
   * addiction=true) set-based in TWO DISJOINT UPDATEs: an un-served SUB-DEPENDENT spot (loyalty_score < dependent that
   * did NOT sell this tick) DECAYS toward NEW by the per-tick decrement (GUARDED ≥ 0); a DEPENDENT spot (loyalty_score
   * ≥ dependent) gone dry past the withdrawal window WITHDRAWS — its loyalty COLLAPSES to established−1 + withdrawn=true
   * (the selling boost lost). A DEPENDENT spot is STICKY (it HOLDS its score until withdrawal — the canon "sticky
   * demand, then sharp withdrawal"). The accumulation (+increment per Hush deal) happens earlier in the same minute at
   * DEALER_SELL/10 (stamping last_hush_deal_tick=currentTick), so this tick correctly SKIPS spots that sold this tick.
   * Brindle/Crick (addiction=false) have no hush_addiction row → never touched (HushAddictionAdvanceService, T5).
   * Deterministic (NO RNG). Organically a no-op (no Hush addiction row).
   */
  HUSH_ADDICTION = 'operational_hush_addiction',
  /**
   * Phase-2c vector #2c — the OPERATIONAL Ash appointment-expiry advancer (NOT one of the 11 city-sim systems; an
   * operational-chain tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band after
   * HUSH_ADDICTION/16: each in-game minute it flips every of the player's SCHEDULED Ash appointments (ash_appointment —
   * the luxury-channel booking) gone past its window (expires_at_tick < currentTick) to EXPIRED, in ONE set-based UPDATE
   * (status='expired' WHERE status='scheduled' AND expires_at_tick < currentTick). A HONORED/EXPIRED booking is never
   * touched; a SCHEDULED booking still inside its window is preserved; honor (T8) flips SCHEDULED → honored BEFORE the
   * window, so an honored booking is excluded by the status predicate. Brindle/Crick/Hush have no ash_appointment row →
   * never touched (AshAppointmentAdvanceService, T7). Deterministic (NO RNG). Organically a no-op (no SCHEDULED booking
   * past its window — the common case).
   */
  APPOINTMENT_EXPIRE = 'operational_appointment_expire',
  /**
   * Phase-3 vector #3 — the OPERATIONAL grow_house GROW_ADVANCE advancer (NOT one of the 11 city-sim systems; an
   * operational-chain tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band after
   * APPOINTMENT_EXPIRE/17 (the next FREE slot) — it depends on nothing in the minute band and is a self-contained
   * set-based stage walk, so running it last keeps the city-sim DAG untouched. Each in-game minute it advances every
   * in-progress grow_session (current_stage <> 'completed') whose stage clock has elapsed (stage_started_at_tick +
   * grow.stage_duration_ticks <= currentTick) ONE grow stage (stage_1→stage_2→stage_3→completed) in ONE set-based
   * UPDATE — re-anchoring stage_started_at_tick = currentTick and CLEARING tended_in_stage (the new stage is tendable
   * again). A grow that reaches 'completed' STOPS advancing (it waits for T5's harvest). Sibling of COOK_ADVANCE/8 but
   * yields a PRECURSOR (T5), not a product. Brindle/Crick/Hush/Ash have no grow_session → never touched. Deterministic
   * (NO RNG; a fixed function of the persisted stage_started_at_tick vs the current tick). Organically a no-op (no
   * in-progress grow — the common case).
   */
  GROW_ADVANCE = 'operational_grow_advance',
  /**
   * Phase-6 vector #6 — the OPERATIONAL lieutenant DELEGATION advancer (NOT one of the 11 city-sim systems; an
   * operational-chain tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band (order 19, after
   * GROW_ADVANCE/18 — the next FREE minute slot, MINUTE/19 having been freed when MONEY_HOLDING_AUDIT moved to the SLOW
   * 12-h band) — it depends on nothing in the minute band and is a self-contained per-player delegated-lieutenant scan, so
   * running it last keeps the city-sim DAG untouched. Each in-game minute it selects the player's DELEGATED lieutenants
   * with a VALID behavior_script (mode='delegated' AND granted_role='executor', joined to behavior_script.valid=true),
   * and for EACH (per-lieutenant try/catch — a fault on one lieutenant never breaks the tick or another lieutenant):
   * builds the per-tick SignalSnapshot from real game state (the COOK binding T5 — cook_idle/heat), resolves the stored
   * compiled IR against it (the DSL executor T3 — pure, deterministic, highest-priority rule wins, tie-break lowest IR
   * index), and APPLIES the resolved token: PAUSE_OPS → delegation_paused mirrors the resolution (written ONLY on a
   * transition — write-amplification discipline); EXECUTE_DEFAULT → restart the cook (the binding's benign-409 catch
   * handles "already cooking"/"no precursor"); NONE → no operational action. delegation_paused is the OBSERVABLE
   * reflection of the last resolution (the executor is stateless and re-evaluates every tick — it is NOT a control input;
   * T7's projection reads it as the PAUSED band). Organically a no-op: the select returns nothing for a player with NO
   * delegated valid-script lieutenant → ZERO writes (the byte-identical no-regression guarantee). Brindle/Crick/Hush/Ash/
   * grow players with no delegated lieutenant are never touched. Deterministic (NO RNG — a fixed function of the persisted
   * IR + the resolved snapshot signals + the persisted delegation_paused). This is the vector's ONE NEW TICK.
   */
  LIEUTENANT_TICK = 'operational_lieutenant_tick',
  /**
   * D1 C6 — the OPERATIONAL equipment-tier upgrade window drain tick (NOT one of the 11 city-sim systems; an
   * operational-chain tick-hook). Runs LAST in the MINUTE band at order 20 (after LIEUTENANT_TICK/19). Each in-game
   * minute it drains equipment_tier_upgrade_remaining_ticks by 1 on in-progress equipment-tier upgrades, and
   * increments equipment_tier++ (capped 5) on buildings that reach 0 this tick. Batched set-based UPDATE (Phase-1
   * determinism). Organically a no-op (no in-progress upgrade — the common case). Mirrors ConversionSetupService.
   */
  EQUIPMENT_TIER_UPGRADE = 'operational_equipment_tier_upgrade',
  /**
   * D2 R2b — the REPUTATION Boss Mirror WEEKLY TICK (NOT one of the 11 city-sim systems; a reputation-module
   * tick-hook that plugs into the SAME scheduler). Runs in the WEEKLY band (order 3, after DEAL_LEK/1 and
   * BUFFER_BLOAT/2): each in-game week it scans all boss_mirror_violation_ring rows for the player and
   * recomputes violation_density = Σ (severity_i · recency_weight_i) + defection_tolerance = base_tolerance ·
   * (1 + γ · violation_density) per lieutenant, then computes consistency_index = 1 − (retractions/declarations)
   * over the last 90 days on the player's declaration ledger (reputation_mechanics.md:53-59,:65).
   * Idempotent per week via last_tick_week guard. All derived scalars are server-only (R2.2/P5).
   * γ, recency_decay, and base_tolerance read from the registry (DD-REG-NAME — no inline coefficient).
   * Organically a no-op for players with no violation ring rows.
   */
  BOSS_MIRROR_TICK = 'operational_boss_mirror_tick',
  /**
   * D2 R4a — REPUTATION Restraint Index WEEKLY TICK (order 4, after BOSS_MIRROR_TICK/3).
   * Recomputes restraint_ratio + offer_terms + wary_active + collateral_amount per counterparty ring.
   * Idempotent per week via last_tick_week guard. All derived scalars are server-only (R2.2/P5).
   * δ, T_wary, window, escrow_inflation, base_terms read from registry (DD-REG-NAME).
   * Organically a no-op for players with no restraint_dispute_ring rows.
   */
  RESTRAINT_INDEX_TICK = 'operational_restraint_index_tick',
  /**
   * D2 R5a — REPUTATION Lek Memory WEEKLY DECAY TICK (order 5, after RESTRAINT_INDEX_TICK/4).
   * Applies λ_now decay to all lek_memory_cell_state rows for the player:
   *   λ_now_new = λ_now_current · exp(−1 / τ_halflife_in_weeks)
   * where τ_halflife_in_weeks = lek_memory_halflife_days / 7.
   * Idempotent per week via last_decay_week column (no double-decay on same week).
   * All derived scalars (lambda_weight = current λ_now, position_memory_aggregate) are server-only (R2.2/P5).
   * λ, τ, decay_rate, slots all read from registry (DD-REG-NAME — no inline coefficient).
   * Organically a no-op for players with no lek_memory_cell_state rows.
   */
  LEK_MEMORY_TICK = 'operational_lek_memory_tick',
  /**
   * D2 R7a — REPUTATION Hidden Curriculum WEEKLY REVIEW TICK (order 6, after LEK_MEMORY_TICK/5).
   * Runs the weekly review tick for HiddenCurriculumService (04a ch14 primary owner — DD-HC-GREENFIELD).
   * For each hidden_curriculum_norms_vector row in the player's scope, computes per-norm ratios
   * from the witnessed_event_ring and flips norm flags ON/OFF/unchanged per the registry thresholds:
   *   ratio = events_exhibiting_norm / events_total
   *   ratio > curriculum_flip_on_threshold  → flag ON
   *   ratio < curriculum_flip_off_threshold → flag OFF
   *   otherwise                              → flag unchanged (mid-range)
   * Idempotent per week via last_review_week guard. All norms_flags are server-only (R2.2/P5).
   * Thresholds + buffer size read from registry (DD-REG-NAME — no inline 0.60/0.30/16).
   * Organically a no-op for players with no hidden_curriculum_norms_vector rows.
   * Canon: reputation_mechanics.md §3.4 (:162-168).
   */
  HIDDEN_CURRICULUM_TICK = 'operational_hidden_curriculum_tick',
  /**
   * D2 R8b — REPUTATION Forbidden-Triad WEEKLY TICK (order 7, after HIDDEN_CURRICULUM_TICK/6).
   * Runs evaluatePairs() for ForbiddenTriadDetectionService: for each UNMET pair, accrues
   * anomaly_pressure_bucket += triad_observer_attention_share (Δ_per_week); when pressure
   * crosses triad_H_observer_weeks (H_observer), flips observer_interest_flag and emits
   * ForbiddenTriadInterestFlag on the CityEventBus (the MIS routing seam for R9).
   * Idempotent per week via last_eval_week guard on each pair row.
   * All scalars (anomaly_pressure_bucket, observer_interest_flag) are server-only (R2.2/P5).
   * H_observer + attention_share + decay all read from registry (DD-REG-NAME — no inline coefficient).
   * Organically a no-op for players with no forbidden_triad_pair_state rows.
   * Canon: reputation_mechanics.md §3.5 (:201-206).
   * TD-120: observer-NPC actor without real producer — emit+defer (R13 Insurance+MIS lot wires NPC).
   */
  FORBIDDEN_TRIAD_TICK = 'operational_forbidden_triad_tick',
  /**
   * D1b C2 — the MARKET lane-collapse pricing HOURLY CLEARING TICK (NOT one of the 11 city-sim systems; a market-module
   * tick-hook that plugs into the SAME scheduler). Runs in the HOURLY band (order 1, the first and only HOURLY slot):
   * each in-game hour it scans ALL lane_pricing_state rows (global — not per-player) and applies the canon clearing rule
   * (market_mechanics.md:62-67):
   *   c > c_hi → fast-clear (jam cleared, t_refractory_minutes = 0, updated_at refreshed).
   *   c < c_lo OR t_refractory > 0 → scatter (t_refractory decremented by 60; scatter offset stored
   *     [DESIGN DECISION — SCATTER_MAGNITUDE] ±W·(1−c) via MarketRngService.seedFromTick deterministic draw).
   * This tick runs on ALL lanes globally (lane_pricing_state is a global table, not per-player), so the
   * CitySimTickContext.playerId is a synthetic placeholder (the harness still drives it per-player, but the tick
   * ignores playerId and scans the full table). Deterministic (RNG via MarketRngService.seedFromTick — C4).
   */
  MARKET_LANE_CLEARING = 'market_lane_clearing',
  /**
   * D1b C3 — the MARKET Composition Telegraph DAILY INFERENCE TICK (NOT one of the 11 city-sim systems; a market-module
   * tick-hook that plugs into the SAME scheduler). Runs in the NIGHTLY band (order 4, after POLICE_MEMORY/3 and
   * COHESION_PERMAFROST/1 + UNCONFORMITY_LEDGERS/2): each in-game day it scans ALL buyer_roster_entry rows for the
   * current player and computes q_inferred per (player_id × region_id) from the rolling 24-slot roster using the
   * canon weighted-average formula (market_mechanics.md:93-96):
   *   q_inferred = Σ(tier_w[slot.tier]) / N + ε
   * where ε ~ N(0, η²) is drawn ONCE per day from MarketRngService.seedFromDay(dayId, regionId) via Box-Muller
   * transform (C4 — same dayId + same roster → identical result; NO Math.random()). Results are UPSERTED into
   * buyer_roster_daily_state. Cadence is fixed at 1/day (Cadence.NIGHTLY) — no registry-add for
   * composition_daily_inference_cadence (market_mechanics.md:114 lists it as a tunable but the registry has 0
   * occurrences; fixed daily tick is clean and sufficient).
   */
  MARKET_COMPOSITION_INFERENCE = 'market_composition_inference',
  /**
   * D1b C5 — the MARKET Carrying-Capacity Haze DAILY TICK. Per-district (not per-player) — runs in the
   * NIGHTLY band (order 5, after MARKET_COMPOSITION_INFERENCE/4). Each in-game day, for all districts
   * with a capacity state row, it: recomputes λ = Q_total/K_current; increments T_over if λ>1.0 (resets
   * to 0 otherwise); applies permanent K-damage when T_over ≥ grace (K ← K·(1−δ_K)); applies partial
   * K-recovery if λ<0.5 AND has_civic_investment (K ← K + k_baseline·recovery_rate, capped at k_baseline).
   * K is NEVER exposed to client (P5 invariant — market_mechanics.md:178). Emits district_capacity_damage_bucket
   * (§3.3 contract, R2.2-banded, DD12). Cadence fixed at 1/day (Cadence.NIGHTLY).
   */
  MARKET_CARRYING_CAPACITY_HAZE = 'market_carrying_capacity_haze',
  /**
   * D1c B3 — the PRECURSOR MARKET endogenous daily inference tick (NOT one of the 11 city-sim systems; a
   * precursor-market tick-hook that plugs into the SAME scheduler). Runs in the NIGHTLY band (order 6,
   * after MARKET_CARRYING_CAPACITY_HAZE/5): each in-game day it reads the demand_accumulator for each
   * precursor type, applies the `demand_accumulator_decay` mean-reversion factor, then compares the decayed
   * accumulator to `demand_trend_up_threshold` / `demand_trend_down_threshold` to set `price_trend`
   * (UP / STABLE / DOWN). The `last_inference_day` idempotence guard ensures the tick applies at most once
   * per in-game day (precursors_supply_chain.md §Dynamique de prix §7).
   *
   * DD-T (LOCKED): the base price_trend is driven ENTIRELY by the player-demand accumulator (endogenous
   * auto-regulation). NO autonomous seeded oscillation — exogenous shocks are B4's `scarcity_active` field.
   * Math.random() BANNED (C4). Pure threshold comparison — no RNG needed for B3.
   */
  PRECURSOR_MARKET_INFERENCE = 'precursor_market_inference',
  /**
   * Phase-5 vector #5a — the OPERATIONAL money_holding AUDIT-FORFEITURE advancer (NOT one of the 11 city-sim systems; an
   * operational-chain tick-hook that plugs into the SAME scheduler). Runs LAST in the TWELVE_H band (order 5, after the
   * 12-h precinct-review band) — it depends on nothing in that band and is a self-contained per-player money_holding scan,
   * so running it last keeps the city-sim DAG untouched. It lives on the SLOW 12-h band (NOT the per-minute band) because
   * the audit-forfeiture is a slow, telegraphed legal process that does NOT need minute granularity, and keeping a
   * per-player scan off the tick-heavy minute band is the perf discipline (the per-minute version, and even a 30-min one,
   * timed out the tick-heavy citysim 43,200-tick DECAY / patrol-review E2E). This is the vector's ONE NEW TICK (T4 yield is lazy/no-tick; T5a
   * street raid reuses RAID_EXECUTION). It is the value-driven, TELEGRAPHED forfeiture — DISTINCT from the heat-driven
   * street raid (T5a): each tick it batch-reads the player's money_holdings, computes the EFFECTIVE held (held_cents +
   * live-accrued yield, read-only — the pure accrual fn, NOT a persisted settle), and runs a deterministic SET-BASED
   * lifecycle per holding: SCHEDULE (effectiveHeld ≥ forfeiture_threshold_cents AND not yet scheduled → arm
   * forfeiture_scheduled_at_tick = now + forfeiture_warning_ticks), CANCEL (scheduled AND effectiveHeld dropped below the
   * threshold → NULL the schedule — the player reacted), EXECUTE (scheduled AND now ≥ scheduled_at_tick AND still ≥
   * threshold → settle yield, then seize forfeiture_seize_pct (0.5 > the raid's 0.4 — the bigger LEGAL bite), NULL the
   * schedule; NO structural_state change, NO building_raid row — a legal forfeiture, not a raid). Write-amplification:
   * only WRITES on a transition (the steady state writes nothing). Brindle/Crick/Hush/Ash/grow have no money_holding row →
   * never touched. Deterministic (NO RNG). Organically a no-op (no money_holding, or every hold below the threshold with
   * no schedule armed — the common case).
   */
  MONEY_HOLDING_AUDIT = 'operational_money_holding_audit',
  /**
   * Insurance C2 — the INSURANCE underwriting walk NIGHTLY OBSERVATION TICK (NOT one of the 11 city-sim systems; an
   * insurance-module tick-hook that plugs into the SAME scheduler). Runs in the NIGHTLY band (order 7, after
   * PRECURSOR_MARKET_INFERENCE/6 — the next free NIGHTLY slot): each in-game day it scans all `underwriter_walk_record`
   * rows with `status = 'WALKING'` for the player, snapshots the coverage's substrate domain (read-only — PROPERTY:
   * building.heat; STASH_LOSS: product_storage.quantity_grams; COURIER_ARREST: courier_shift.in_transit count;
   * FENCE_DEFAULT: laundering_nodes.buffer_load), derives the day's FindingType bits, and monotone-ORs them into
   * `findings_bitmask` (DD-WALK invariant: bits are never cleared). Idempotent per day via observation_depth guard.
   * All findings_bitmask values are server-only (R2.2/P5). Math.random() BANNED (C4 — deterministic snapshot).
   * Organically a no-op for players with no WALKING walk rows.
   * Canon: insurance_mechanics.md §4.1 (:46-56); DD-WALK (LOCKED — design §1.1/§4).
   */
  INSURANCE_WALK_OBSERVATION = 'insurance_walk_observation',
  /**
   * Insurance C7 — the INSURANCE COURIER INTERCEPTION MINUTE TICK (NOT one of the 11 city-sim systems; an
   * insurance-module tick-hook that plugs into the SAME scheduler). Runs LAST in the MINUTE band (order 21,
   * after EQUIPMENT_TIER_UPGRADE/20 — the next FREE MINUTE slot): each in-game minute it scans all
   * `courier_shift` rows with `status = 'in_transit'` for the player; for each shift whose `patrol_heat`
   * exceeds `courier_intercept_heat_threshold` (sentinel 0 = producer is no-op), it uses
   * `MarketRngService.seedFromDay(dayId, courierRegionInt)` to deterministically select the shift with the
   * highest seed value and sets its `status = 'caught'` (the existing shiftStatus enum member — NO enum
   * migration) then emits `CourierInterceptedEvent`. DD-PRODUCERS-MINIMAL: minimal deterministic producer
   * that makes COURIER_ARREST claims real. Math.random() BANNED (C4). Organically a no-op when threshold
   * is 0 (sentinel) or no shift exceeds the threshold.
   * Canon: insurance_mechanics.md §4.1 (:46-56 — COURIER_ARREST coverage type); TD-123 deferred (full System 9).
   */
  INSURANCE_COURIER_INTERCEPTION = 'insurance_courier_interception',
  /**
   * Insurance C8 — the INSURANCE FENCE DEFAULT NIGHTLY TICK (NOT one of the 11 city-sim systems; an
   * insurance-module tick-hook that plugs into the SAME scheduler). Runs in the NIGHTLY band (order 8,
   * after INSURANCE_WALK_OBSERVATION/7 — the next free NIGHTLY slot): each in-game night it scans all
   * `laundering_nodes.buffer_load` values for the player; when a node's `buffer_load` exceeds
   * `fence_default_exposure_threshold` (default 0.80, [0..1] scale), it uses
   * `MarketRngService.seedFromDay(dayId, nodeRegionInt)` to deterministically select the defaulting node
   * (highest seed value — same deterministic tie-break as C7) and emits `FenceDefaultedEvent` carrying
   * `throughput_in_per_hour` (for the C9 payout). `buffer_load` is read from `laundering_nodes`
   * (substrate correction — NOT `tail_risk_estimates`). DD-PRODUCERS-MINIMAL: minimal deterministic
   * producer that makes FENCE_DEFAULT claims real. Math.random() BANNED (C4). Organically a no-op
   * when no node exceeds the threshold (the production default — all nodes start at buffer_load=0).
   * Canon: insurance_mechanics.md §4.1 (:46-56 — FENCE_DEFAULT coverage type); TD-124 deferred (full System 12).
   */
  INSURANCE_FENCE_DEFAULT = 'insurance_fence_default',
  /**
   * Insurance Drift C10 — COVERAGE-INDUCED DRIFT WEEKLY TICK (WEEKLY/8, next free after FORBIDDEN_TRIAD_TICK/7).
   * Each in-game week: for each coverage_induced_drift_state row of the player —
   *   1. Recomputes true_loss_prob = base_loss_prob · (1 + α · hazard_shift) (computed, not stored — C10 decision).
   *      When base_loss_prob null (uncalibrated sentinel — C2) → skip recompute, still decay.
   *   2. Decays hazard_shift ← max(0, hazard_shift − shift_decay_per_week).
   *   3. Stamps last_drift_tick = weekId (idempotence guard).
   * Idempotent per game-week (last_drift_tick guard keyed on weekId).
   * No Math.random(). Organically a no-op for players with no drift_state rows (zero-regression).
   * Canon: insurance_mechanics.md §4.2 (:100-104). C11 will insert renewal BEFORE decay (§2.6 strict order).
   */
  INSURANCE_DRIFT_TICK = 'insurance_drift_tick',
  /**
   * Forensic C5 — FORENSIC Environmental Inspector Scan NIGHTLY TICK (NIGHTLY/9, next free after
   * INSURANCE_FENCE_DEFAULT/8). Each in-game night it runs the effluent deviation check
   * (EffluentStoichiometryService.runEnvironmentalInspectorScan — C14), the standing-gap monthly tick
   * (StandingGapHeatService.runMonthlyTick — C17, DD-MONTHLY-ON-NIGHTLY idempotent month_id guard), and
   * the tail-ramp advance (StandingGapHeatService.advanceTailRamp — C18). The 3 sub-calls chain in that
   * order inside the single NIGHTLY/9 run callback (registered in forensic.module.ts onApplicationBootstrap
   * at C5 — no run callback yet; C14/C17/C18 will wire the sub-calls). No Math.random(). Organically a no-op
   * for players with no workshops / no tracked lieutenants (zero-regression invariant §1.3).
   * Canon: forensic_signaling_mechanics.md §5.2 (:98) + §5.3 (:139) + §5.4 (:157).
   */
  FORENSIC_INSPECTOR_SCAN = 'system_6_forensic_inspector_scan',
  /**
   * Forensic C5 — FORENSIC Leading-Digit Audit WEEKLY TICK (WEEKLY/9, next free after INSURANCE_DRIFT_TICK/8).
   * Each in-game week it runs LeadingDigitAuditService.runWeeklyAuditTick (C7): iterates the player's
   * ledger_entry_ring rows; idempotent per-ring on last_audit_tick; stamps last_chi_square; if χ² >
   * benfordChi2ThresholdH → emit ForensicSoftFlagDetected + soft_flag_count++. No Math.random(). Organically
   * a no-op for players with no rings (zero-regression invariant §1.3). The run callback is registered in
   * forensic.module.ts onApplicationBootstrap (C5 opens the slot only; C7 wires the run callback).
   * Canon: forensic_signaling_mechanics.md §5.1 (:64) + §5.2 (:78-90).
   */
  FORENSIC_AUDIT_TICK = 'system_6_forensic_audit_tick',
  /**
   * System 9 C9 — DISTRIBUTION Caught-Exception Auto-Abandon Sweep NIGHTLY TICK (NIGHTLY/10,
   * next free after FORENSIC_INSPECTOR_SCAN/9). Each in-game night it scans all `caught_exception`
   * rows with `status = 'pending'` whose `resolution_deadline_tick <= gameMinute` for the player,
   * and auto-resolves them to `abandoned` (the deterministic default, OQ-14). Organically a no-op
   * for players with no overdue pending exceptions. No Math.random(). Deterministic.
   * Canon: distribution_couriers_runners.md §9 :165-167 (caught exception window OQ-14).
   */
  CAUGHT_EXCEPTION_SWEEP = 'distribution_caught_exception_sweep',
  /**
   * System 9b C8 — DISTRIBUTION Corridor-Debt Decay NIGHTLY TICK (NIGHTLY/11,
   * next free after CAUGHT_EXCEPTION_SWEEP/10). Each in-game night it decays all
   * `corridor_debt` rows for the player: debt_magnitude ← max(0, debt_magnitude − corridorDebtDecayPerTick)
   * (default 0.05). Floors debt at 0. Stamps last_updated_tick = ctx.gameMinute.
   * Game-time deterministic (ctx.gameMinute — NO Date.now). Organically a no-op for players
   * with no corridor_debt rows (zero-regression invariant). All debt magnitudes are server-only
   * (R2.2/P5). Canon: distribution_couriers_runners.md §9b DD-DEBT-SSOT (C8, mig 0076).
   */
  CORRIDOR_DEBT_DECAY = 'distribution_corridor_debt_decay',
  /**
   * C9 DD-SEVER — light sweep that flips saved routes to `state='severed'` (or `saturated`)
   * when max-of-corridors corridor_debt meets or exceeds the sever/warn threshold.
   * Fires NIGHTLY/12 (the next free slot after CORRIDOR_DEBT_DECAY NIGHTLY/11).
   * The sweep is a DERIVED read — it never writes corridor_debt (DD-DEBT-SSOT D3).
   * The player sees the `severed` badge before dispatching the next shift (OQ-SV3 light-sweep).
   */
  ROUTE_SEVER_SWEEP = 'distribution_route_sever_sweep',
  /**
   * 04b-A C4 — RIVAL AI saturation_pressure passive decay + band recompute HOURLY TICK
   * (HOURLY/2, next free after MARKET_LANE_CLEARING/1). Registered by RivalTickService.
   * Fires every in-game hour; uses the DD-CADENCE 6h-analog guard:
   *   if (gameMinute % 360 === 0) → applies saturationPassiveDecayRatePerTick (0.05) per rival,
   *   then recomputes the biphasic band (silent/trained/suppressed) per rival.
   * At non-6h HOURLY boundaries (gameMinute % 360 !== 0) → NO-OP (guard short-circuits).
   * Empty-state L1 skip: no rival rows → ZERO writes (zero-regression guarantee).
   * Per-rival try/catch. Deterministic game-time modulo (NO Date.now, NO Math.random).
   * Canon: rival_ai_mechanics.md :170 (6h recompute cadence); §3.3 saturation decay.
   */
  RIVAL_SATURATION_TICK = 'rival_saturation_tick',
  /**
   * 04b-A C5 (cadence fix) — RIVAL AI per-rival tempo decision + Distributed Hold reroute MINUTE TICK
   * (MINUTE/22, next free after INSURANCE_COURIER_INTERCEPTION/21). Registered by RivalTickService.
   *
   * Cadence: MINUTE (every in-game minute). Guard: `gameMinute % 4 === 0` — fires every 4 game-minutes.
   *   Canon (tick_schedule_and_memory_budget_conflict.md :18): "Every 4 ticks — Distributed Hold
   *   reroute_evaluation". The "tick" unit is the in-game minute (the live scheduler's per-player tick).
   *   Moving from HOURLY → MINUTE makes the `% 4` guard a real filter: at HOURLY boundaries
   *   (60-minute multiples), 60 % 4 == 0 ALWAYS, so the guard was INERT on HOURLY cadence.
   *   On MINUTE cadence, only minutes 0, 4, 8, 12, ... fire the decision body — a true every-4-ticks.
   *
   * NOTE (C4→C5 correction): C4 registered this system on HOURLY/3 with a `% N` guard. The guard
   * was INERT (60 % 4 == 0 always → reroute fired EVERY hour, not every 4 game-minutes as canon
   * intends). C5 moves it to MINUTE/22 to make the cadence semantics correct.
   *
   * At `gameMinute % 4 === 0`:
   *   For each rival: checks shouldFireObserveTick (the per-rival observe modulo, §3.2).
   *   For Coil only: calls DistributedHoldService.rerouteEvaluation (the C5 body).
   * At off-boundary minutes → NO-OP.
   * Empty-state L1 skip: no rival rows → ZERO writes.
   * Per-rival try/catch. Deterministic game-time modulo (NO Date.now, NO Math.random).
   * Canon: rival_ai_mechanics.md §3.2 (per-rival tempo); tick_schedule…:18 (every 4 ticks = 4 game-minutes).
   */
  RIVAL_DECISION_TICK = 'rival_decision_tick',

  /**
   * 04d-A C6 — LEGAL INFO-LEAK MINUTE TICK (MINUTE/23, next free after RIVAL_DECISION_TICK/22).
   * Registered by LawyerLegalTickService.onApplicationBootstrap.
   *
   * Cadence: MINUTE (every in-game minute). L1 empty-state skip: no active legal_cases for this
   * player → ZERO writes (zero-regression guarantee: pre-A / no-case worlds are byte-identical).
   *
   * Each minute: for every active legal_cases row for the player, rolls a seeded probability
   * against info_leak_rate (makeRng(`leak:${caseId}:${gameDay}`) — deterministic per (case, day);
   * same day → same roll → idempotent leak). On hit: draws ONE unleaked item from knowledge_set_ref,
   * appends its id to items_leaked, increments info_leak_total by item.importance, and writes a
   * 'legal_case_leak' entry to declaration_ledger via PoliceMemoryService.appendDeclarationEntry
   * (source_origin_id = case_id, the slot reserved at police_memory.service.ts:168).
   * Always decrements ticks_remaining (regardless of leak outcome — time passes each tick).
   * Deterministic (makeRng seeded — NO Math.random, NO Date.now).
   * Per-case try/catch — a fault on ONE case never breaks the tick or another case.
   * Canon: plan §C6 + lawyer_legal_system.md §2 info-leak mechanic.
   */
  LEGAL_LEAK_TICK = 'legal_leak_tick',

  /**
   * 04b-B C-esc — the ESCALATION 12h tick. Runs in the TWELVE_H band (order 7, next free after
   * RIVAL_REGIME_TICK/6). Each 12-game-hour sweep: (1) recomputes sandpile system_criticality;
   * (2) triggers cascade checks if above threshold (seeded draw via makeRng — deterministic);
   * (3) recomputes resonance_factor for each active pair (game-time, DD-RESONANCE-GAMETIME OQ-B5);
   * (4) runs Lotka-Volterra dynamics for each contested lek.
   * L1 empty-state skip: no escalation rows → ZERO writes.
   * Registered by EscalationTickService.onApplicationBootstrap.
   */
  ESCALATION_TICK = 'escalation_tick',

  /**
   * W6.1 C2 — the COMBAT RESOLUTION NIGHTLY TICK (NIGHTLY/13.5 — a FRACTIONAL slot, the SAME
   * `a.order - b.order` numeric comparator that already admits POLITICAL_CALENDAR_TICK/19.5; see
   * that entry + this file's `registerSystem` doc comment). Slotted strictly between
   * RIVAL_DAILY_TICK/13 (the rival AI has acted for the night) and COMBAT_DAILY_TICK/14 (the 4
   * de-escalation decays must see the REAL post-resolution conflict state, not the night before's —
   * design §1 D3). Each in-game night, for every player's `combat_event` row with
   * `type='assault' AND outcome_bucket IS NULL`, in `(created_at_minute, id)` order:
   *   1. FrictionBudgetService.commitActionWithFriction — accrues the friction pool, derives the
   *      divergence outcome (deterministic registry lookup, C4 — NO Math.random).
   *   2. ConflictOrchestratorService.recordAssaultCascade — the §9.1 5-layer cascade (idempotent on
   *      assaultEventId — a crash-recovered re-run is a dedup no-op).
   *   3. CombatRepository.markAssaultResolved — the GUARDED UPDATE (`outcome_bucket IS NULL`) LAST
   *      (design §1 D6: `outcome_bucket` is never written before the cascade has committed — the
   *      reverse order would mark an event resolved whose cascade never ran).
   * L1 empty-state skip: zero pending assaults for the player → ZERO writes (byte-identical
   * no-regression guarantee — combat_event existed before this chunk with nothing ever resolving it).
   * Per-event try/catch: a fault on ONE event is logged and contained — it never breaks the tick or
   * another event. Deterministic (NO Math.random, NO Date.now — game-time only via ctx.gameMinute).
   * Registered by CombatResolutionTickService.onApplicationBootstrap.
   */
  COMBAT_RESOLUTION_TICK = 'combat_resolution_tick',

  /**
   * 04b-B C-deesc — the COMBAT DAILY (de-escalation) NIGHTLY TICK (NIGHTLY/14, next free after
   * RIVAL_DAILY_TICK/13). Each in-game night it drives the 4 per-player de-escalation decays via
   * `runCombatDailyTickForPlayer` (the shared per-entity method — Lesson #3, called by BOTH this
   * scheduler and the `_test` route to guarantee zero live-vs-test divergence):
   *   1. MaladaptiveMemoryService.decayDepthOnQuietTicks (C-esc — quiet-tick depth decay)
   *   2. FamiliarityDiscountService.accrueFamiliarity (C-deesc §5.1 — dear-enemy accrual)
   *   3. EphemeralOperationService.clearStateOlderThanWindow (C6 — ephemeral state expiry)
   *   4. CumulativeAttritionService.decayCPIDaily (C8 — CPI daily decay)
   * L1 empty-state skip: no deescalation_pair_state rows AND no conflict_flow_state rows → ZERO
   * writes (byte-identical pre-B world guarantee). Per-rival try/catch. Deterministic (NO RNG, NO
   * Date.now — game-time only via ctx.gameMinute). Registered by DeEscalationTickService.onApplicationBootstrap.
   */
  COMBAT_DAILY_TICK = 'combat_daily_tick',

  /**
   * 04b-B C-cas — the DEAD HAND CACHE REFRESH HOURLY TICK (HOURLY/3, next-free after
   * RIVAL_SATURATION_TICK/HOURLY/2; HOURLY/3 was freed by C5's cadence correction of
   * RIVAL_DECISION_TICK from HOURLY/3 → MINUTE/22).
   *
   * Registered by ConflictOrchestratorService.onApplicationBootstrap.
   *
   * Cadence: HOURLY (every 60 in-game minutes). Guard: `gameMinute % 480 === 0`
   *   — fires every 8 in-game hours (8 × 60 min = 480 game-minutes), matching the
   *   `cache_refresh_ticks=8` canon (retaliation_mechanics.md:76 — "every 8 game ticks").
   *
   * Each run: for each player's dead_hand_cache_state row, calls
   *   `DeadHandCacheService.refreshCache(playerId, rivalKey, gameDay)` to materialise the
   *   deterministic pre-committed retaliation cache_script_ref.
   *
   * L1 empty-state skip: no dead_hand_cache_state rows for this player → ZERO writes.
   *   Registered via a per-rival try/catch — a fault on ONE rival never aborts others.
   * Deterministic: game-time modulo only. NO Math.random(). NO Date.now().
   * Canon: retaliation_mechanics.md:76 (cache_refresh_ticks=8, HOURLY cadence).
   */
  DEAD_HAND_TICK = 'dead_hand_tick',

  /**
   * 04b-C C9 — INFO-WARFARE INFO_LOOP_DAILY_TICK (NIGHTLY/15, next free after COMBAT_DAILY_TICK/14).
   * Each in-game night it runs the info-loop for the player:
   *   1. DeadReckoningService.decayBeliefStatePerTick (per-rival with belief rows)
   *   2. ObservationDisturbanceService.runSurveillance (detection draw + applyDisinformation if detected)
   *   3. PurgeTrapService.evalPurge (purge threshold check — no-op if below threshold)
   * L1 empty-state skip: no info-warfare rows → ZERO writes (zero-regression invariant).
   * Registered by InformationWarfareOrchestratorService.onApplicationBootstrap via dual-pattern.
   * Deterministic (makeRng seeded draws — NO Math.random, NO Date.now).
   * DD-P5-REALIZATION: disinfo lands iff rival intel_mode='pull' (via A's applyDisinformation).
   */
  INFO_LOOP_DAILY_TICK = 'info_loop_daily_tick',

  /**
   * 04d-A C7 — LEGAL NIGHTLY RESOLUTION TICK (NIGHTLY/16, next free after INFO_LOOP_DAILY_TICK/15).
   * Each in-game night: scans all legal_cases with status='active' AND ticks_remaining<=0 for the player
   * → resolves each eligible case with a seeded RNG roll gated by tier + charge_severity:
   *   - Tier-3 + low severity (misdemeanor/felony_low): rolls dismissProbabilityTier3LowSeverity → 'dismissed'
   *   - Tier-2 (boutique): rolls pleaDownProbabilityTier2 → 'plea_down'
   *   - Base conviction roll (tier-gated [PROV-Y26Q2]): 70%/50%/30% convicted for Tier-1/2/3 respectively
   *   - Otherwise: 'acquitted'
   * On 'convicted': final-dump — all remaining knowledge_set items NOT yet in items_leaked are
   *   batch-written to declaration_ledger via PoliceMemoryService.appendDeclarationEntry (the BPD seam,
   *   REUSE active since mig 0052). items_leaked becomes complete (all items' IDs) after conviction.
   * Emits CaseResolvedEvent (qualitative only — no raw info_leak_total, R2.2/P5).
   * L1 empty-state skip: no active cases → ZERO writes (zero-regression guarantee).
   * Deterministic (makeRng(`resolve:${caseId}`) — NO Math.random, NO Date.now).
   * Per-case try/catch — a fault on ONE case never breaks the sweep or another case.
   * Registered by LawyerLegalTickService.onApplicationBootstrap (same service as MINUTE/23 LEGAL_LEAK_TICK).
   * Canon: plan §C7 + lawyer_legal_system.md §Case timeline step 5.
   */
  LEGAL_NIGHTLY_TICK = 'legal_nightly_tick',

  /**
   * 04d-B C4 — IA INVESTIGATION THRESHOLD NIGHTLY TICK (NIGHTLY/17, next free after LEGAL_NIGHTLY_TICK/16).
   * Each in-game night: scans all `internal_affairs_targets` for `suspicion_level >= open_investigation_threshold`
   * (gdd/14 registry key `internal_affairs.open_investigation_threshold`, default 0.60) with no active
   * investigation (`investigation_id IS NULL`) → for each matching target: inserts an `ia_investigations` row
   * (closes_at = now + `investigation_duration_days`), updates `investigation_open_since` + `investigation_id`
   * on the target, emits `InvestigationOpenedEvent` (qualitative — NO suspicion_level, R2.2/P5).
   * L1 empty-state skip: no targets above threshold → ZERO writes (zero-regression invariant).
   * Idempotent: targets with `investigation_id` already set are filtered by the WHERE clause.
   * GLOBAL table (no player FK): the scan runs once per player NIGHTLY tick; the row-level idempotency
   * guard (investigation_id IS NULL) prevents double-opening if multiple players fire NIGHTLY concurrently.
   * Deterministic: NO Math.random(), NO Date.now() — opens on suspicion threshold, not on an RNG roll.
   * Registered by IATickService.onApplicationBootstrap (04d-B C4).
   * Canon: internal_affairs_corruption_discovery.md §3 threshold mechanic + §State (:40-52).
   */
  IA_THRESHOLD_TICK = 'ia_threshold_tick',

  /**
   * 04d-B C6 — IA SUSPICION DECAY WEEKLY TICK (WEEKLY/10, next free after FORENSIC_AUDIT_TICK/9).
   * Each in-game week: scans all `internal_affairs_targets` whose `last_weekly_decay_at` timestamp
   * encodes a game-week epoch BEFORE the current week (i.e., no activity stamped this week) →
   * for each qualifying target: `suspicion_level = MAX(0, suspicion_level − decay_rate_per_week)`
   * (gdd/14 registry key `internal_affairs.decay_rate_per_week`, default 0.05), then stamps
   * `last_weekly_decay_at = thisWeekEpoch` (the game-week pseudo-epoch, computed from gameMinute).
   *
   * Cool-off (natural consequence): if the player used a corrupt actor this game-week,
   * `recordCorruptUse` already stamped `last_weekly_decay_at = thisWeekEpoch`, so the target
   * is filtered OUT of the decay scan (no decay for active targets). Targets not used decay.
   *
   * Use-spreading (inherent): separate `internal_affairs_targets` rows per actor → each actor
   * accumulates suspicion independently. Using 2 actors half-as-often = lower per-actor suspicion
   * than 1 actor twice-as-often (non-linear frequency_multiplier) → each stays below threshold longer.
   *
   * Idempotent per game-week: `last_weekly_decay_at = thisWeekEpoch` after first decay → no target
   * matches `< thisWeekEpoch` on re-run for the same game-week. Two WEEKLY fires in the same game-week
   * → exactly 1 decay applied (idempotent).
   *
   * L1 empty-state skip: no qualifying targets → ZERO writes (zero-regression invariant).
   * Deterministic: NO Math.random(), NO Date.now() — weekId derived from ctx.gameMinute.
   * GLOBAL table (no player FK): the scan covers ALL targets; the game-week epoch guard prevents
   * any target from decaying more than once per game-week.
   * Registered by IATickService.onApplicationBootstrap (04d-B C6).
   * Canon: internal_affairs_corruption_discovery.md §3 decay mechanic (§5 mitigations).
   */
  IA_DECAY_TICK = 'ia_decay_tick',

  /**
   * 04d-C C5 — META-MARKET HOURLY AGGREGATION TICK (HOURLY/4, next free after DEAD_HAND_TICK/3).
   * Each in-game hour: `MetaMarketAggregationService.runHourlyAggregation` reads all pending
   * `meta_market_contributions`, groups by `(region_id, substance, district_profile)`, trims top/bottom
   * `trim_pct` (default 5%) outliers, computes `median`/`p10`/`p90` + `sample_count`, and upserts one
   * `meta_market_signals` row per group (bucket `aggregated_at` = current UTC hour boundary).
   * Consumed contributions are deleted after aggregation (the pending queue is cleared per group).
   * L1 empty-state skip: no pending contributions → ZERO writes (zero-regression invariant).
   * Idempotent per-bucket: re-running with the same `aggregated_at` → UPSERT merges correctly.
   * Deterministic: NO Math.random(), NO game-time dependency — `aggregated_at` is the wall-clock UTC hour.
   * Privacy: NO `player_id` ever read or written — only `contributor_hash` (HMAC-SHA256, C4) in contributions;
   *   signal rows carry NO contributor identifier (only aggregate stats).
   * Registered by MetaMarketTickService.onApplicationBootstrap (04d-C C5).
   * Canon: async_meta_market.md §1.2 (HOURLY aggregation) + plan §C5.
   */
  META_MARKET_AGGREGATION_TICK = 'meta_market_aggregation_tick',

  /**
   * 04d-C C5 — META-MARKET NIGHTLY RETENTION PURGE TICK (NIGHTLY/18, next free after IA_THRESHOLD_TICK/17).
   * Each in-game night: `MetaMarketRetentionService.purgeOlderThan` deletes:
   *   - `meta_market_signals` WHERE `aggregated_at < NOW() − retention_days` (canon: 30d default).
   *   - `meta_market_contributions` WHERE `contributed_at < NOW() − retention_days` (orphaned rows).
   * Idempotent: DELETE WHERE is pure — re-running with the same cutoff → same DB state.
   * L1 natural: no rows older than cutoff → ZERO writes (zero-cost no-op).
   * Deterministic: NO Math.random() — cutoff = `Date.now() − retentionDays × 24h` (wall-clock, pure).
   * `retention_days` sourced via MetaMarketTunables.retentionDays (gdd/14 registry key, R2.3 — never inlined).
   * Registered by MetaMarketTickService.onApplicationBootstrap (04d-C C5).
   * Canon: async_meta_market.md §1 retention + plan §C5.
   */
  META_MARKET_RETENTION_TICK = 'meta_market_retention_tick',

  /**
   * 04d-C C6 — META-MARKET NIGHTLY ANTI-CHEAT COHORT DETECTION TICK (NIGHTLY/19, next free after META_MARKET_RETENTION_TICK/18).
   * Each in-game night: `MetaMarketAntiCheatService.detectCoordinatedCohort` scans `meta_market_contributions`
   * for the last 24h, groups by `(region_id, substance)`, counts DISTINCT `contributor_hash`.
   * When count >= `coordinated_cohort_detection_threshold_accounts` (default 100, canon async_meta_market.md :181):
   *   → inserts one `meta_market_cohort_flags` row (flagged_pattern='volume_spike', cohort_size=count).
   * BO-visible: the flag is read by C8 GET /v1/admin/meta-market/anti-cheat-cluster-flags (gdd/13 consumer = TD).
   * L1 natural: no contributions in 24h → 0 rows queried → 0 flags (zero-writes).
   * Deterministic: NO Math.random() — detection is pure SQL COUNT DISTINCT.
   * Registered by MetaMarketTickService.onApplicationBootstrap (04d-C C6).
   * Canon: async_meta_market.md §1.10 + plan §C6.
   */
  META_MARKET_ANTICHEAT_TICK = 'meta_market_anticheat_tick',

  /**
   * 04e-A2 C2 — ★ POLITICAL CALENDAR EVAL TICK (NIGHTLY/19.5 — a FRACTIONAL slot, strictly between
   * META_MARKET_ANTICHEAT_TICK/19 and the federal-investigator reconcile/20; `registerSystem`'s sort
   * comparator, `city_sim_scheduler.service.ts:616`, is a plain numeric `a.order - b.order` compare, not
   * integer-constrained). RE-ANCHOR FINDING (C0-M2, 04e-A2 C0): the plan originally assumed NIGHTLY/19
   * was free for this tick, but 04d-C's META_MARKET_ANTICHEAT_TICK took it on this base — 19.5 slots the
   * calendar tick before the federal reconcile without renumbering any existing NIGHTLY registration
   * (design §3 requires this tick's `EffectOverlayStore.reloadNow()` to land BEFORE the federal reconcile
   * reads the overlay the same NIGHTLY run).
   * Each in-game night: `PoliticalCalendarTickService.runNightlyCalendarTick` derives `gameDay`/
   * `monthIndex` (`political_events.month_minutes`), atomically CLAIMS the day on the city-global
   * `political_calendar_state` singleton (idempotent across every player's own per-clock NIGHTLY
   * firing — the SAME "per-player-firing, city-global-state" shape as IA_THRESHOLD_TICK/
   * META_MARKET_RETENTION_TICK), evaluates the electoral/budget calendar triggers, gates newly-due
   * activations on `political_events.overlap_max_active` (permanents count; over-cap = SKIPPED, never
   * queued), applies them through the REAL `EffectModifierService.applyEvent` + reclaims expired ones
   * via `revertExpired`, then awaits `EffectOverlayStore.reloadNow()` for same-tick visibility.
   * L1 natural: no boundary crossed (or the bootstrap first-ever tick) → ZERO activations (byte-
   * identical empty overlay). Deterministic: NO Math.random(), NO Date.now() — a pure function of
   * gameMinute + persisted state + registered tunable getters.
   * Registered by PoliticalCalendarTickService.onApplicationBootstrap (04e-A2 C2).
   * Canon: political_event_catalogue.md invariant #5/#6 + plan §C2.
   */
  POLITICAL_CALENDAR_TICK = 'political_calendar_tick',

  /**
   * 04e-B C4 — LIVE-OPS REAL-CLOCK SWEEP (MINUTE/24, next free after LEGAL_LEAK_TICK/23). NOT one of the
   * 11 city-sim systems; a live-ops-module tick-hook that plugs into the SAME scheduler (DD-B3). GLOBAL
   * sweep (mirrors MARKET_LANE_CLEARING's own precedent, `:302-313` above): `ctx.playerId` is IGNORED —
   * this system scans the whole `live_ops_event_active` table regardless of which player's own per-clock
   * MINUTE firing triggered it (idempotent + cheap indexed query on `(status, ends_at)`; redundant
   * firings across N players' same real-time tick are harmless).
   * Each firing: `LiveOpsSchedulerService.sweepExpiredEvents` reverts every `live_ops_event_active` row
   * with `status='ACTIVE' AND ends_at <= LiveOpsClockPort.now()` through the REAL
   * `LiveOpsEventService.deactivateLiveOpsEvent` (never a re-implementation of the revert path) — the
   * REAL-TIME analog of A1's `revertExpired` game-day sweep. `LiveOpsClockPort` is the ONLY real-clock
   * dependency (DD-B3, injectable — production reads the system clock, E2E injects a deterministic fake,
   * `live-ops-clock.port.ts`'s `FakeLiveOpsClock`); NO inline `Date.now()`/`new Date()` in this mechanic.
   * A dedicated `OnApplicationBootstrap` boot reconciler runs the SAME sweep once, immediately, at process
   * start (crash-recovery — no permanent shift from a timed event survives a crash while the process was
   * down waiting for this system's own next MINUTE firing).
   * L1 natural: no ACTIVE row past its `ends_at` → ZERO writes (zero-regression invariant).
   * Registered by LiveOpsSchedulerService.onApplicationBootstrap (04e-B C4).
   * Canon: liveops_event_catalogue.md (real-clock auto-revert) + plan §C4 (DD-B3).
   */
  LIVE_OPS_REAL_CLOCK_SWEEP = 'live_ops_real_clock_sweep',

  /**
   * 04f-A C2 — ★ MAINTENANCE PHASE-PROGRESSION TICK (NIGHTLY/21, next free after POLICE_MEMORY/20). NOT
   * one of the 11 city-sim systems; a maintenance-module tick-hook that plugs into the SAME scheduler.
   * Each in-game night, per player: (1) recompute the D1 `lapse_phase` (within_window/soft/hard/critical)
   * for every OPERATIONAL building from its anchor (`last_maintained_at_game_day` + REUSE
   * `maintenance_due_in_days`) — write-only-on-change, set-based (`MaintenanceRepository.
   * persistPhaseTransitions`) — and emit `MaintenancePhaseChangedEvent` per transition; (2) complete every
   * ARMED scheduled-maintenance job whose `maintenance_completes_at_day` has arrived (D13 — reset the
   * anchor to today, clear the job, phase back to within_window). HONEST PARTIAL (C2 scope): the
   * critical-phase daily failure roll (D11) and the critical/failed periodic Exception card re-emission
   * (design §4 steps 4-5) are C4/C5 — NOT wired here (no stub pretending to roll).
   * L1 natural: no OPERATIONAL building (or none whose derived phase changed / whose job completed) →
   * ZERO writes (the zero-regression invariant). Idempotent per game-day: re-running on the SAME day
   * recomputes the SAME phases → zero writes (the IA_DECAY_TICK / applySetupBatch precedent).
   * Deterministic: NO Math.random(), NO Date.now() — a pure function of the persisted anchor columns +
   * `ctx.gameMinute` + the registered `maintenance.*` tunable getters.
   * Registered by MaintenancePhaseTickService.onApplicationBootstrap (04f-A C2).
   * Canon: docs/tech/04f_maintenance_decay_recruitment/building_maintenance_decay.md §Lapse phases +
   * design §4 + plan §C2.
   */
  MAINTENANCE_PHASE_TICK = 'maintenance_phase_tick',

  /**
   * 04f-A C4 — ★ EQUIPMENT-FAILURE WEEKLY ROLL TICK (WEEKLY/11, next free after IA_DECAY_TICK/10). NOT one
   * of the 11 city-sim systems; a maintenance-module tick-hook that plugs into the SAME scheduler. Each
   * in-game week, per player: batch-reads every OPERATIONAL building whose LIVE-derived lapse phase is NOT
   * critical (critical rolls DAILY instead — wired into MAINTENANCE_PHASE_TICK, D11), skips the 3 EXCLUDED
   * types (`grow_house`/`dealer_spot_front`/`specialized_lab` — no canon baseline, sub-decision #2 — an
   * honest skip-list, not a zero-disguised-as-coverage), and for every remaining candidate rolls a SEEDED
   * `(building_id, week_epoch)` failure probability (`EquipmentFailureService`, design §5:
   * `baseline(type[,tier]) × (1 + overdue_factor) × phase_mult`, clamped ≤0.95). A failing roll runs the
   * atomic-5 (minus the card — C5): `structural_state → 'failed'` (halts via the EXISTING positive
   * `='operational'` gates, D3, ZERO gate edits) + an `equipment_failure_log` row (`roll_detail` BO-only,
   * R2.2) + `EquipmentFailedEvent` on the bus.
   * L1 natural: no eligible OPERATIONAL building (or every candidate excluded/critical) → ZERO writes (the
   * zero-regression invariant). Idempotent per game-week: the roll is a PURE function of `(building_id,
   * week_epoch)` — a same-week re-run reproduces the SAME outcome, and a building that already failed drops
   * out of the OPERATIONAL candidate set (naturally idempotent — no extra "last rolled" column needed).
   * Deterministic: NO `Math.random()`, NO `Date.now()` — ONLY draw source is `makeRng` (D11).
   * Registered by EquipmentFailureWeeklyTickService.onApplicationBootstrap (04f-A C4).
   * Canon: docs/tech/04f_maintenance_decay_recruitment/building_maintenance_decay.md §Equipment failure +
   * design §5 + plan §C4.
   */
  EQUIPMENT_FAILURE_WEEKLY_TICK = 'equipment_failure_weekly_tick',

  /**
   * P3-A C2 — the SESSION_SWEEP HOURLY/5 tick (NOT one of the 11 city-sim systems; a `session/`-module
   * tick-hook that plugs into the SAME scheduler). Runs in the HOURLY band (order 5, next free after
   * META_MARKET_AGGREGATION_TICK/4 — re-verified free this session, C0/C2 re-anchor). Each in-game hour
   * it closes THIS player's active `gameplay_sessions` row (`ended_at IS NULL`) IFF it has gone STALE —
   * `started_at` older than `session.stale_timeout_real_minutes` (default 240, REAL wall-clock minutes,
   * not game-time — design §4 "started_at-based staleness v1", the honest bound; an activity-tracking
   * refinement is TD). `SessionService.sweepStaleForPlayer` is the SAME method both this tick and the
   * `run-session-sweep` _test route call (Lesson #3 — zero live-vs-test divergence). Emits
   * `SessionClosedEvent` for every session it actually closes (0 in the common case). Organically a
   * no-op: no active session, or an active session still fresh → ZERO writes (design §13 zero-regression
   * — the byte-identical-when-nothing-stale guarantee). Deterministic real-time comparison (no
   * Math.random); no game-time dependency (a REAL session-boundary rule by canon definition, decisions
   * §1.1).
   * Registered by SessionService.onApplicationBootstrap (P3-A C2).
   * Canon: docs/tech/05_player_core_loops/one_decision_per_session.md + plan §C2 / design §4 (D1).
   */
  SESSION_SWEEP = 'session_sweep',

  /**
   * P3-A C3 — the EXCEPTION_QUEUE_TICK NIGHTLY/22 tick (NOT one of the 11 city-sim systems; an
   * `exceptions/`-module tick-hook that plugs into the SAME scheduler, D4). Runs in the NIGHTLY band
   * (order 22 — 21 deliberately SKIPPED: reserved for the in-flight 04f-A lot's own NIGHTLY claim per
   * the D3 collision wall, re-verified free this session — C0's exhaustive SCHEDULE grep showed nothing
   * registered past NIGHTLY/20 + 19.5, so 21 AND 22 are both free on this base; P3-A takes 22 anyway to
   * honor the reservation — 04f-A landed MAINTENANCE_PHASE_TICK/21 above post-merge, exactly as
   * reserved, zero collision). Each in-game night, per player: (1) re-priority every PENDING card —
   * `priority = round(severity × age_factor)`, linear decay over `core_loops.
   * exception_priority_decay_period_hours` (24h default) up to `core_loops.exception_priority_age_max_
   * factor` (2.0 ceiling) — set-based batched UPDATE (`ExceptionsRepository.updatePriorities`), ZERO
   * writes for any card whose recomputed priority is unchanged; (2) aged-out — PENDING cards older than
   * `core_loops.exception_aged_out_horizon_hours` (48h default) → `resolution_status='aged_out'` +
   * `resolution={method:'AGED_OUT', fallback:'NO_OP'}` + `ExceptionAgedOutEvent` (the honest
   * transposition of canon's "lieutenant's default rule fires" — no default-rule execution machine is
   * invented, D4). `ExceptionQueueTickService.runTick` is the SAME method both this tick and the
   * `run-exception-tick` `_test` route call (Lesson #3 — zero live-vs-test divergence). Organically a
   * no-op: no pending cards for the player → ZERO writes (design §13 zero-regression). Deterministic (NO
   * Math.random — the age_factor/priority formula is a pure function of severity + emitted_at + now).
   * Registered by ExceptionQueueTickService.onApplicationBootstrap (P3-A C3).
   * Canon: docs/tech/05_player_core_loops/exception_queue_spine.md §Invariants/§Edge cases + plan §C3 /
   * design §5 (D4/D5).
   */
  EXCEPTION_QUEUE_TICK = 'exception_queue_tick',

  /**
   * P3-B C4 — ★ FLAG_DISCIPLINE_TICK (NIGHTLY/24 provisional, next free after EXCEPTION_QUEUE_TICK/22 —
   * 23 deliberately SKIPPED, reserved for the in-flight 04f-B lot's own NIGHTLY claim, the SAME D3
   * collision-wall convention EXCEPTION_QUEUE_TICK's own header explains for its 21-skip; re-verified
   * free this session — C0's exhaustive SCHEDULE grep showed nothing registered past NIGHTLY/22 + 19.5,
   * so 23 AND 24 are both free on this base). NOT one of the 11 city-sim systems; a `core_loops/flag_
   * discipline/`-module tick-hook that plugs into the SAME scheduler (D7). Each in-game night, per
   * player, 5 STRICTLY ORDERED steps: (1) auto-confirm every `routine_items` row still `'pending'` from
   * an EARLIER game-day (`RoutineItemAutoConfirmService`, set-based UPDATE); (2) timeout PENDING
   * `flagged_items` rows whose `flagged_at` is older than `flag_batch_confirm_window_real_hours` — via
   * the C2 `resolveFlagTransition` atomic arbiter, token RETURNED per ruling sub-decision #3 (no
   * calibration signal from player absence ⇒ no penalty); (3) regen tokens (+`flag_token_regen_per_day`,
   * LEAST-clamped to the max getter, in-row `last_regen_game_day` guard, set-based across every
   * lieutenant this player owns in ONE statement); (4) generate today's `routine_items` per the C3
   * closed 5-generator registry + flag decisions (REUSE `RoutineItemGenerationService.runGeneration` —
   * never a duplicated enumerate/cap/flag loop) + the D9 exhaustion fallback (0 tokens + score ≥
   * `flag_exhaustion_exception_urgency_threshold` → a REAL spine exception card via
   * `FlagExhaustionFallbackService`, existing `EffectType` members only, dedup-gated — hazard 4); (5)
   * prune TERMINAL `routine_items` rows (never `'pending'`, never a row still referenced by a PENDING
   * flag) past `flag_routine_items_retention_days`.
   * L1 natural: no stale-pending/aged-flag/lieutenant-state/eligible-substrate/terminal-prune candidate
   * for a player → ZERO writes for the corresponding step (design §13 zero-regression); a player with NO
   * lieutenants/buildings at all → the WHOLE tick is a clean no-op. Idempotent per game-day: each step is
   * EITHER guard-keyed (regen's in-row day guard) OR set-complete (auto-confirm/timeout/prune naturally
   * exclude rows their OWN prior run already transitioned/deleted) OR UNIQUE-deduped (generation) — a
   * same-day re-run across ALL 5 steps together is a genuine zero-write proof, not a skipped no-op.
   * Deterministic: NO `Math.random()` anywhere in the tick; the real-hours timeout window is the ONE
   * deliberate real-clock read (design §6, divergence #9 — checked against `flagged_at` at NIGHTLY
   * granularity, honestly transposed).
   * Registered by FlagDisciplineTickService.onApplicationBootstrap (P3-B C4).
   * Canon: docs/tech/05_player_core_loops/flag_discipline.md + design §1 D7/D9 + plan §C4.
   */
  FLAG_DISCIPLINE_TICK = 'flag_discipline_tick',

  /**
   * P3-B C5 — ★ FLAG_WEEKLY_RESET_TICK (WEEKLY/13 provisional, next free after
   * EQUIPMENT_FAILURE_WEEKLY_TICK/11 — 12 deliberately SKIPPED, reserved for the in-flight 04f-B lot's own
   * WEEKLY claim, the SAME D3 collision-wall convention `FLAG_DISCIPLINE_TICK`'s own header explains for
   * its 23-skip; re-verified free this session — C0/C4's exhaustive SCHEDULE grep showed nothing
   * registered past WEEKLY/11, so 12 AND 13 are both free on this base). NOT one of the 11 city-sim
   * systems; a `core_loops/flag_discipline/`-module tick-hook that plugs into the SAME scheduler (D8).
   * Each in-game week, per player, ONE epoch-guarded conditional UPDATE: `SET credibility_tokens = $max,
   * last_weekly_reset_epoch = $epoch WHERE last_weekly_reset_epoch < $epoch` — resets EVERY
   * `lieutenant_flag_state` row this player owns to the max token getter, "regardless of recent burns"
   * (canon-verbatim) — a lieutenant already AT max still gets touched (the epoch guard advances) but its
   * `credibility_tokens` value is unchanged. `week_epoch = Math.floor(game_day / 7)` — the WEEKLY cadence
   * already fires every 7 game-days (`city_sim_scheduler.service.ts`'s own `cadenceWidth(Cadence.WEEKLY)
   * === inGameDayLengthMinutes * 7`), so this epoch increments exactly once per firing (the IA_DECAY_TICK
   * epoch precedent, decisions §1.8, keyed off THIS lot's own `game_day` concept). `flag_weekly_reset_day_
   * of_week` (canon key, default `monday`) is DELIBERATELY NOT a store key here — degenerate under the
   * WEEKLY cadence (a design-invariant gdd/14 row instead, ruling sub-decision #5).
   * L1 natural: no `lieutenant_flag_state` row for the player, or every row already at/past this epoch →
   * ZERO writes (design §13 zero-regression). Idempotent per epoch: the epoch guard is IN THE SAME
   * statement as the reset (D3 — guard and claim, un-raceable; a same-epoch re-run matches ZERO rows).
   * Deterministic: NO `Math.random()`, NO `Date.now()` — a pure function of `game_day` + the max-tokens
   * getter.
   * Registered by FlagWeeklyResetTickService.onApplicationBootstrap (P3-B C5).
   * Canon: docs/tech/05_player_core_loops/flag_discipline.md + design §1 D8 + plan §C5.
   */
  FLAG_WEEKLY_RESET_TICK = 'flag_weekly_reset_tick',

  /**
   * P3-C C3 — ★ MYCELIAL_DECAY_TICK (NIGHTLY/25 provisional, next free after FLAG_DISCIPLINE_TICK/24 —
   * re-verified free this session: nothing registered past NIGHTLY/24 on this base, the SAME exhaustive
   * SCHEDULE-grep discipline every prior NIGHTLY-claiming chunk documents). NOT one of the 11 city-sim
   * systems; a `core_loops/supply_chain/`-module tick-hook that plugs into the SAME scheduler (design
   * §5.2/§5.3/§5.5). Each in-game night, per player, ONE set-based `WITH ... UPDATE ... FROM` statement
   * (`LegRepository.applyNightlyDecayAndStressEval`) across every `supply_chain_legs` row not yet
   * evaluated this exact `gameMinute` (day-keyed idempotency guard on `last_decay_eval_tick`):
   *   - decays `debt_load` for legs IDLE past `mycelial_cooling_period_ticks_for_decay_start` (12) —
   *     `GREATEST(0, debt_load - mycelial_natural_decay_per_minute * idle_minutes_since_last_eval)`
   *     (design §5.2) — leaves an ACTIVE (non-idle) leg's `debt_load` untouched this tick;
   *   - derives `stressed ⇔ (resultant) debt_load > mycelial_stress_threshold` (design §5.3, D4 — never
   *     stored as its own column) and maintains `stress_streak` (+1 if stressed else reset 0, design
   *     §5.5) for EVERY touched leg, idle or actively-accruing (an actively overused, chronically
   *     stressed leg that never goes idle is the "persistent stress" case the future C4 `Mycelial
   *     StressExceptionProducer` targets — gating streak maintenance to the idle subset would make that
   *     unreachable for the game's most common overuse pattern).
   * L1 natural: no `supply_chain_legs` row for the player, or every row already evaluated this exact
   * `gameMinute` → ZERO writes (design §13-class zero-regression). Idempotent per NIGHTLY firing: the
   * day-guard is IN THE SAME statement as the decay/streak write (D3 — guard and claim, un-raceable; a
   * same-`gameMinute` re-run matches ZERO rows).
   * Deterministic: NO `Math.random()`, NO `Date.now()` — a pure function of `ctx.gameMinute` + the 4
   * getter-sourced tunables (`mycelial_natural_decay_per_minute`/`mycelial_cooling_period_ticks_for_
   * decay_start`/`mycelial_stress_threshold`, all C1).
   * Registered by `MycelialDecayTickService.onApplicationBootstrap` (P3-C C3).
   * Canon: docs/tech/05_player_core_loops/mycelial_ledger.md + design §5.2/§5.3/§5.5 + plan §C3.
   */
  MYCELIAL_DECAY_TICK = 'mycelial_decay_tick',

  /**
   * P3-C C4 — ★ MYCELIAL_MAINTENANCE_ADVANCE (MINUTE/27 provisional, next free after
   * LIVE_OPS_REAL_CLOCK_SWEEP/24 — MINUTE/25 deliberately SKIPPED, reserved for the in-flight 04f-B lot's
   * own MINUTE claim per the plan's courtesy-skip convention (§0.5); MINUTE/26 reserved for the future
   * `BACKPRESSURE_UPDATE` (C5/C6, design §6.2); re-verified free this session — nothing registered past
   * MINUTE/24 on this base). NOT one of the 11 city-sim systems; a `core_loops/supply_chain/`-module
   * tick-hook that plugs into the SAME scheduler (design §5.4/§11). Each in-game minute, per player, ONE
   * set-based `UPDATE ... RETURNING` (`LegRepository.completeDueMaintenanceJobs`) flips every
   * `supply_chain_legs` row whose TIMED job is due (`maintenance_mode IN ('quick_patch',
   * 'structural_reinforce') AND maintenance_completes_at_tick <= gameMinute`):
   *   - `quick_patch`          → `debt_load = LEAST(debt_load, mycelial_quick_patch_residual_debt)`
   *     (partial clear, design §5.4).
   *   - `structural_reinforce` → `debt_load = 0` (full clear — the STRUCTURAL mode's completion; the
   *     governor's OWN cap/audit bookkeeping happened at the CLAIM, not here).
   *   - both                  → `maintenance_mode = NULL`, `maintenance_completes_at_tick = NULL` — the
   *     I3 claim guard (`WHERE maintenance_mode IS NULL`) re-admits a NEW maintain call on this leg from
   *     the very next request.
   * `reroute_bypass` NEVER matches this tick's predicate (`maintenance_completes_at_tick` is always NULL
   * for it — a STATE, not a timed job, design §10.1's own 3-way CHECK); its own resume-exit is
   * decay-driven (`LegRepository.applyNightlyDecayAndStressEval`, NIGHTLY/25 — see that method's C4
   * addition #2).
   * L1 natural: no `supply_chain_legs` row for the player, or no row's job is due yet → ZERO writes
   * (design §13-class zero-regression). Idempotent: a job flipped THIS tick no longer matches the
   * `maintenance_mode IN (...)` predicate on any later re-run at the same or a later `gameMinute`.
   * Deterministic: NO `Math.random()`, NO `Date.now()` — a pure function of `ctx.gameMinute` +
   * `mycelial_quick_patch_residual_debt` (C1).
   * Registered by `MycelialMaintenanceAdvanceService.onApplicationBootstrap` (P3-C C4).
   * Canon: docs/tech/05_player_core_loops/mycelial_ledger.md + design §5.4/§11 + plan §C4.
   */
  MYCELIAL_MAINTENANCE_ADVANCE = 'mycelial_maintenance_advance',

  /**
   * P3-C C5 — ★ BACKPRESSURE_UPDATE (MINUTE/26 provisional, next free after MYCELIAL_MAINTENANCE_
   * ADVANCE/27's OWN sibling-slot reservation — see that entry's header: MINUTE/25 courtesy-skipped for
   * 04f-B, 26 reserved for exactly this since C4; re-verified free this session — nothing registered past
   * MINUTE/24 on this base besides 27 itself). NOT one of the 11 city-sim systems; a
   * `core_loops/supply_chain/`-module tick-hook that plugs into the SAME scheduler (design §6.2). Each
   * in-game minute, per player, 3 ordered steps (`BackpressureUpdateService.runTick`):
   *   1. DETECT — `BlockedOutputDetectorRegistry.detectAll` folds the 6 LIVE `BlockedOutputDetector`s
   *      (Erlang-stash blocking / hub-roster saturation / launder-node overflow (buffer-bloat OR
   *      money-holding at-capacity) / dealer unavailable / severed saved-route destination / stressed leg
   *      origin) into one building_id → source-tags map.
   *   2. ACCRUE — `SupplyNodePressureRepository.accrueSources`: `backpressure_index += pressure_per_tick`
   *      (half-weight when the ONLY diagnosed source is `LEG_STRESSED_ORIGIN`, design §8.3), `LEAST(...,
   *      1.0)`, `is_blocked_output=true`.
   *   3. PROPAGATE — BFS upstream on inverted legs from every source's OWN post-accrual index (`received =
   *      source_pressure × decay_per_hop^hops`, floored, max-hops-bounded, shortest-hop-wins across
   *      sources) → `SupplyNodePressureRepository.applyPropagation` (a plain SET, never additive).
   *   4. RELIEF — every OTHER existing row for this player decays `backpressure_index` by
   *      `relief_per_tick` (floor 0) via `SupplyNodePressureRepository.applyRelief`; `is_blocked_output`/
   *      the arrow clear IMMEDIATELY once a node stops being reached (design §6.2/D8).
   * L1 natural: no blocked-output source AND no existing `supply_node_pressure` row for the player → ZERO
   * writes (design §13-class zero-regression). Idempotent per minute (I5): EVERY one of the 3 repository
   * writes is guarded on `last_propagation_tick = gameMinute` — a same-`gameMinute` re-run touches ZERO
   * additional state.
   * Deterministic: NO `Math.random()`, NO `Date.now()` — a pure function of `ctx.gameMinute` + the
   * getter-sourced tunables (`backpressure_pressure_per_tick_when_blocked`/`...propagation_decay_per_hop`/
   * `...minimum_pressure_floor`/`...max_propagation_hops`/`...relief_per_tick`, all C1) + the BFS's own
   * stable-sorted neighbor order (D13).
   * Registered by `BackpressureUpdateService.onApplicationBootstrap` (P3-C C5).
   * Canon: docs/tech/05_player_core_loops/backpressure_trace.md + design §6.2/§4.3/§8.3 + plan §C5.
   */
  BACKPRESSURE_UPDATE = 'backpressure_update',

  /**
   * P3-C C7 — ★ ROUTE_PATCH_SWEEP (NIGHTLY/26 provisional, next free after MYCELIAL_DECAY_TICK/25 —
   * re-verified free this session: nothing registered past NIGHTLY/25 on this base. NOTE: MINUTE/26 is
   * a DIFFERENT cadence namespace, already claimed by the sibling `BACKPRESSURE_UPDATE` — cadence+order
   * pairs are the scheduler's real key (`registerSystem`'s own `(id, cadence, order)` match), so NIGHTLY/26
   * and MINUTE/26 do not collide). NOT one of the 11 city-sim systems; an `operational/distribution/`
   * tick-hook (route-domain, not core_loops — D12) that plugs into the SAME scheduler (design §7.2 — the
   * K2 canon "SI rises by patching" REALIZED GEOMETRICALLY, ruling-B sub-task 1, unchanged by the ruling).
   * Each in-game night, per player, for every SAVED route not severed and not currently rebuilding
   * (`state != 'severed' AND rebuild_completes_at_tick IS NULL`): if ANY block of `path_blocks` has
   * `corridor_debt.debt_magnitude >= distribution.route_saturated_warn_threshold` (6.0 — the EXISTING 9b
   * getter, READ here as the patch trigger; NOT renamed/removed from its own 9b "saturated" role, D9's
   * "sous l'option B, les deux gardent leur rôle 9b" — the SAME getter simply has a SECOND reader now),
   * `RoutePatchSweepService.maybePatchRoute` recomputes A* debt-aware (`RouteFinderService.computePath`
   * with the CURRENT full debt snapshot) and, if the resulting path_blocks differ from the frozen ones
   * (OQ-P1 — a patch is a WRITTEN, VERSIONED event, never a silent recompute-on-read): archives the OLD
   * path into `route_version_history` (REUSE `RouteLifecycleRepository.insertVersionHistory`, the SAME
   * `route.service.ts:293-299` mechanism `replanRoute` already uses), writes the NEW path/SI/
   * straight_line_distance/river_crossings, bumps `version`, increments `patch_count` — then immediately
   * re-runs `RouteService.evaluateAndMaybeSever` (the ONE collapse authority, ruling-B's OR-extended
   * threshold compare) so a patch that pushed SI ≥ `sinuosity_collapse_threshold` (2.4) collapses the
   * route THIS SAME tick (I6 exactly-once, `RouteCollapseExceptionProducer`). The SAME
   * `maybePatchRoute(playerId, routeId, gameMinute)` method is ALSO called (single-route, event-driven)
   * at saved-route dispatch time (design §7.2 "check patch léger au dispatch saved" — `DistributionService.
   * dispatch`'s `savedRouteId` path, BEFORE the I7 claim guard) — one shared, tested code path, zero
   * duplication between the tick and the dispatch-time light check.
   * L1 natural: no saved route for the player, or no route has a hot (≥warn) block → ZERO writes.
   * Deterministic: NO `Math.random()`, NO `Date.now()` — a pure function of `ctx.gameMinute` + the
   * getter-sourced `distribution.route_saturated_warn_threshold` + `core_loops.sinuosity_collapse_
   * threshold` (C1) + the A* engine's own deterministic cost function.
   * ★ RULING-B NOTE: the sibling NIGHTLY/12 `ROUTE_SEVER_SWEEP` (route.service.ts:61-70) is EXPLICITLY
   * left byte-untouched by this chunk (the ratified ruling header: "sweep N/12 conservé tel quel") — it
   * keeps its OWN inline debt-only threshold compare, UNCHANGED, so every pre-existing 9b assertion
   * against it stays green. The OR-extended collapse authority lives ONLY in `evaluateAndMaybeSever`,
   * reached from this NEW tick + the saved-route dispatch path + the pre-existing `_test` seams — never
   * from the untouched NIGHTLY/12 sweep body.
   * Registered by `RoutePatchSweepService.onApplicationBootstrap` (P3-C C7).
   * Canon: docs/tech/05_player_core_loops/sinuosity_debt.md + design §7.2/§7.3 + plan §C7 (ruling-B).
   */
  ROUTE_PATCH_SWEEP = 'route_patch_sweep',

  /**
   * 04f-B C4 — ★ RECRUITMENT AVAILABILITY TICK (NIGHTLY/23). NOT one of the 11 city-sim systems; a
   * recruitment-module tick-hook that plugs into the SAME scheduler. **Anti-collision (04f-B cedes
   * NIGHTLY/22 to the parallel P3-A session — `EXCEPTION_QUEUE_TICK` — which merges first; this lot
   * takes the NEXT free slot after MAINTENANCE_PHASE_TICK/21, i.e. NIGHTLY/23, never 22.** Each in-game
   * night, per player, in order: (1) Saltline replenish — tops the pool to `saltlineCandidatesPerPool`
   * `available` rows (deterministic generation seeded `(player_id, game_day, slot)`, the SAME
   * `SaltlineRecruitmentService.buildCandidateRows` the C2 `replenish-saltline` test route already
   * drives); (2) Defector scan (D8, regime-LIVE) — queries `rival_state.regime` per rival; any rival in
   * `bleeding`/`retrench` with no already-surfaced (available|in_quest) defector candidate gets ONE
   * dedup-gated candidate (`source_rival_key` carried, seeded profile); (3) Civilian scan (D7,
   * affinity-DERIVED) — a predicate over LIVE `rich_citizens` columns (alive + satisfaction band +
   * dealer-loyalty/connector — no new citizen schema) surfaces up to a small cap of dedup-gated
   * (`citizen_id`) candidates; (4) Candidate expiry — ages out `available` candidates past
   * `expires_at_game_day` to `expired`. L1 natural: a player with a full Saltline pool, no qualifying
   * rivals, no affine citizens, and no stale candidates → ZERO writes. Idempotent by construction
   * (dedup-gated on `source_rival_key`/`citizen_id`, cap-bounded, threshold-bounded — a same-day re-run
   * reproduces the SAME surfaced set, never duplicates; the EQUIPMENT_FAILURE_WEEKLY_TICK "naturally
   * idempotent, no extra marker column" precedent). Deterministic: NO `Math.random()`, NO `Date.now()` —
   * the ONLY draw source is `makeRng` (D9/D11) for candidate PROFILE content; the regime/affinity
   * eligibility gates themselves are pure predicates over persisted state.
   * Registered by RecruitmentAvailabilityTickService.onApplicationBootstrap (04f-B C4).
   * Canon: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §9 (availability tick) +
   * plan §C4.
   */
  RECRUITMENT_AVAILABILITY_TICK = 'recruitment_availability_tick',

  /**
   * P3-D C3 — ★ CUE_STACK_EXECUTE (MINUTE/29 provisional, next free after MYCELIAL_MAINTENANCE_ADVANCE/27
   * — MINUTE/28 deliberately SKIPPED, courtesy per plan §0.5/§18; re-verified free this session: nothing
   * registered past MINUTE/27 besides the sibling reservation). NOT one of the 11 city-sim systems; a
   * `core_loops/cue_stack/`-module tick-hook that plugs into the SAME scheduler (design §5.2). Each
   * in-game minute, per player, `CueStackExecutionTickService.runTick`:
   *   1. Cheap read — no `cue_stacks` row `state IN (committed,executing)` for the player → ZERO writes
   *      (the falsifiable "tick sans stack → 0 write" proof, plan §C3).
   *   2. `committed` → ONE-TIME atomic promotion to `executing` (`executing_slot_index=0`,
   *      `executing_slot_started_minute=gameMinute`).
   *   3. `executing` — the CURRENT slot (`executing_slot_index`): elapsed = gameMinute −
   *      `executing_slot_started_minute` < the slot_type's tunable duration (§5.3, C1 getters) → no-op
   *      (0 additional writes). Elapsed ≥ duration → FIRING, gated by an atomic CLAIM (`UPDATE ... WHERE
   *      executing_slot_index=$idx AND last_executed_game_minute IS DISTINCT FROM $gameMinute RETURNING`
   *      — **I3**: a double tick for the SAME gameMinute claims exactly once, the underlying verb call-
   *      count staying 1). Basic dependency check (design §6.1, `unsatisfied = dependencies − {done}`):
   *      unsatisfied → `failed_collision` (no verb call); satisfied → `SlotTypeExecutorRegistry.require
   *      (slotType).execute(...)` — the REAL production verb (`DistributionService.dispatch` /
   *      `MaintenanceService.scheduleMaintenance` / `RecruitmentQuestService.startQuest` /
   *      `ExceptionsService.resolve`, narrowed ONE_TIME-only). A throw → `failed_executor` (D4 — never a
   *      retry, cursor STILL advances). ONE UPDATE persists the new status+outcome jsonb + advances the
   *      cursor (or `state='resolved'` on the last slot).
   * `SlotExecutedEvent`/`SlotFailedEvent` emitted on the bus (additive, `city-event-bus.ts`).
   * **NOT included in `SKIPPABLE_OPERATIONAL_ORDERS`** (ruling #7's own "alternative" branch, plan §6.7 —
   * `OperationalStateGuardService.isActive`'s 13-predicate union-EXISTS has NO `cue_stacks`/
   * `recruitment_candidates` predicate; a RECRUITMENT_STEP-only committed stack for a player with ZERO
   * other operational state would be silently skipped forever if this order were added to that set — a
   * genuine correctness gap, not merely "fragile proof". The tick's OWN cheap read (step 1) already
   * delivers the "no-op-cheap sans stack executing" property ruling #7 asked for, WITHOUT touching the
   * guard's fixed predicate list). The cascade/collision producer + recovery ×1.5 multiplier (design §6.2/
   * §6.3) + heat-disruption subscriptions (§7) are explicitly C4's own scope (plan §C4) — NOT built here;
   * the dependency check above is the minimal correctness floor D5 requires from day one (a slot must
   * never fire with unmet dependencies), the cascade emerging for free from applying it per-slot at each
   * one's OWN firing (DD-CASCADE-LAZY).
   * Registered by `CueStackExecutionTickService.onApplicationBootstrap` (P3-D C3).
   * Canon: docs/tech/05_player_core_loops/cue_stack_integrity.md + design §5.2/§6.1 + plan §C3.
   */
  CUE_STACK_EXECUTE = 'cue_stack_execute',

  /**
   * P3-D C6 — ★ ANNEALING_SETTLE_SWEEP (MINUTE/30 provisional, next free after CUE_STACK_EXECUTE/29 — the
   * M/24 `LIVE_OPS_REAL_CLOCK_SWEEP` precedent, re-verified free this session). NOT one of the 11 city-sim
   * systems; a `core_loops/annealing/`-module tick-hook (design §9.4). UNLIKE `CUE_STACK_EXECUTE`/
   * `CUE_STACK_STALE_SWEEP` (both PER-PLAYER game-minute ticks), this one is GLOBAL and REAL-CLOCK
   * (`ctx.playerId` ignored, mirrors `LIVE_OPS_REAL_CLOCK_SWEEP`'s own established shape exactly): the
   * settling window is timestamped in REAL minutes (sub-décision #10), so there is no single firing
   * player's own game-minute tick that legitimately scopes "has this row's `settling_ends_at` elapsed" —
   * the whole `annealing_state` table is scanned via its own `annealing_state_unsettled_idx` partial index
   * (mig 0129, C1). ONE conditional `UPDATE ... WHERE settled=false AND settling_ends_at<=now() RETURNING`
   * (I6 exactly-once — the RETURNING gates `SettlingCompletedEvent`, once per row THIS call actually
   * flipped). State, NOT timer (P1 strict): nothing is decremented — the sweep CONSTATES. Registered by
   * `AnnealingSettleSweepService.onApplicationBootstrap` (P3-D C6).
   * Canon: docs/tech/05_player_core_loops/annealing_window.md + design §9.4 + plan §C6.
   */
  ANNEALING_SETTLE_SWEEP = 'annealing_settle_sweep',

  /**
   * P3-D C3 — ★ CUE_STACK_STALE_SWEEP (NIGHTLY/29 — renumbered 28→29 at the 04g-B integration, next free after ROUTE_PATCH_SWEEP/26 —
   * NIGHTLY/27 deliberately left free, courtesy per plan §0.5/§18; re-verified free this session).
   * NOT one of the 11 city-sim systems; a `core_loops/cue_stack/`-module tick-hook (design §5.2 crash-
   * safe note). Each in-game night, per player, ONE set-based `UPDATE ... RETURNING` flips every
   * `cue_stacks` row `state='executing'` whose CURRENT slot has been sitting at the SAME
   * `executing_slot_started_minute` for ≥ `core_loops.cue_stack_stale_executing_horizon_hours` (48
   * default, C1 getter, ×60 → game-minutes) back to `state='resolved'` — a crash-safe floor (whatever the
   * exact cause — a hung executor call, an unforeseen edge case — a stack must never permanently occupy
   * the player's ONE non-terminal I1 slot). L1 natural: no `executing` row, or none past the horizon →
   * ZERO writes. No event emitted (plan §C3 does not ask for one — a diagnostic-only recovery sweep).
   * Registered by `CueStackStaleSweepService.onApplicationBootstrap` (P3-D C3).
   * Canon: docs/tech/05_player_core_loops/cue_stack_integrity.md + design §5.2 + plan §C3.
   */
  CUE_STACK_STALE_SWEEP = 'cue_stack_stale_sweep',

  /**
   * 04g-A C1 — ★ CONSTANT_HUM_CELL_TICK (HOURLY/6, next free after SESSION_SWEEP/5 — C0 re-anchor,
   * `2026-07-13-04g-A-C0-reanchor.md` §1 S1: "HOURLY occupied 1-5 only"). NOT one of the 11 city-sim
   * systems; an `operational/ambient/`-module tick-hook that plugs into the SAME scheduler. Each in-game
   * hour: derives `hour_of_week` (0..167, `ambient-clock.ts`) from `ctx.gameMinute`, aggregates
   * `AVG(buildings.heat)` cross-player per district (ONE set-based GROUP BY query, design §3.1 D4), and
   * folds each observation into its `constant_hum_cell` (district_id, hour_of_week) — first-ever fold
   * inits the EMA AT the observation (no warm-up against 0); subsequent folds apply
   * `ema' = alpha × observed + (1 − alpha) × ema` (`liveops_templates.constant_hum_cell_ema_alpha`).
   * PER-PLAYER-FIRING, CITY-GLOBAL-STATE (the established shape, `POLITICAL_CALENDAR_TICK`/
   * `META_MARKET_AGGREGATION_TICK` precedent): idempotency is a PER-CELL claim
   * (`constant_hum_cell.last_updated_game_day`, `constant-hum.repository.ts`'s `foldHourlyObservation`
   * — a `SELECT ... FOR UPDATE` + conditional insert/update) rather than a singleton watermark table,
   * since a fixed cell only recurs once per game_day (hour_of_week wraps weekly).
   * L1 natural: a district with ZERO buildings produces NO GROUP BY row → ZERO cells created for it this
   * tick (design §3.1, C1 AC6 negation). Structural cap: the composite PK (district_id, hour_of_week) +
   * the `hour_of_week BETWEEN 0 AND 167` CHECK bound the grid to ≤ 168 cells/district REGARDLESS of any
   * `liveops_templates.constant_hum_cells_per_week` override attempt — that tunable is STRUCTURAL
   * (hot_reloadable: NO, Scenario 1 canon) and is never read by the arithmetic itself
   * (`ambient.tunables.ts`'s `structuralInt`). Deterministic: NO `Math.random()`, NO `Date.now()` — a
   * pure function of `gameMinute` + persisted `buildings.heat` + the registered alpha getter.
   * Registered by ConstantHumService.onApplicationBootstrap (04g-A C1).
   * Canon: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.1 + plan §C1.
   */
  CONSTANT_HUM_CELL_TICK = 'constant_hum_cell_tick',

  /**
   * 04g-A C2 — ★ AMBIENT_DAILY_TICK (NIGHTLY/27 — RENUMBERED 25→27 at P3-C integration, which took
   * NIGHTLY/25 MYCELIAL_DECAY + /26 ROUTE_PATCH; 25 was next-free/24 at C0 re-anchor pre-P3-C). NOT one of the 11
   * city-sim systems; an `operational/ambient/`-module tick-hook that plugs into the SAME scheduler.
   * PHASE 1 (C2, this chunk): each in-game night, per player firing: (1) DECAY SWEEP — every `live`
   * `ambient_micro_event` row whose `expires_at_game_minute` has passed → `expired` (ONE set-based UPDATE,
   * touches ONLY `status` — design §3.2 "routine residue", D9); (2) POISSON-SEEDED GENERATION — for ALL 18
   * districts (city-global, NOT gated by any one player's buildings), draws the day's micro-event batch
   * via `makeRng(ambient:{game_day}:{district_id})` (S6) in the FIXED order count → kinds → hours, then
   * claims + inserts via a per-(game_day, district) idempotent transaction
   * (`AmbientMicroEventRepository.generateForDistrict` — advisory-lock + existence-check, mirrors
   * `CohesionPermafrostRepository.seedDistricts`'s race-safe idiom). PER-PLAYER-FIRING, CITY-GLOBAL-STATE
   * (the established shape, `CONSTANT_HUM_CELL_TICK`/`POLITICAL_CALENDAR_TICK` precedent): whichever
   * player's NIGHTLY firing reaches a given game_day FIRST generates that day's stream for every district;
   * every other/later firing for the SAME game_day is a pure no-op (idempotent, crash-safe, design §8).
   * Deterministic: NO `Math.random()`, NO `Date.now()` — the ONLY draw source is `makeRng` (seed keyed on
   * `game_day` + `district_id`, never wall-clock or player identity).
   * PHASE 2 (C3, forward-note): `OffHoursDriftDetector`'s trip scan extends this SAME registration, run
   * AFTER phase 1, same tick — C2 ships phase 1 only.
   * Registered by AmbientMicroEventService.onApplicationBootstrap (04g-A C2).
   * Canon: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.2 + plan §C2.
   */
  AMBIENT_DAILY_TICK = 'ambient_daily_tick',

  /**
   * 04g-B C2 — ★ RANDOM_WORLD_DAILY_TICK (NIGHTLY/28 — next free after AMBIENT_DAILY_TICK/27, C0
   * re-anchor `2026-07-15-04g-B-C0-reanchor.md` §S9, re-confirmed live at C2). NOT one of the 11
   * city-sim systems; an `operational/random_world/`-module tick-hook that plugs into the SAME
   * scheduler, running AFTER the political NIGHTLY/19.5 reconciliation (design §3.2 ordering note).
   * PHASES (design §3.2, fixed order, per-run — see `RandomWorldEventGeneratorService.runDailyTick`):
   * (0) claim the game_day idempotently (`random_world_daily_run`, INSERT ... ON CONFLICT DO
   * NOTHING — mirrors `PoliticalEventRepository.claimGameDay`/`AmbientMicroEventRepository.
   * generateForDistrict`'s per-couple claim shape, S10); (1) resolve-expired — generic,
   * template-agnostic hard-ceiling sweep for any `active` event past its own `expires_at_game_day`
   * (idempotent even if the political NIGHTLY/19.5 `revertExpired` sweep already reaped the effect
   * rows — defense in depth, design §3.2/§3.3); (2) `applyRecoveryCurve` — daily magnitude recompute
   * for `halgren_tannery_hailstorm`'s scar-decay curve (`recovery-curve.ts`'s `contamination(d)`),
   * reapplied via `EffectModifierService.reapplyRandomWorldEvent` only when the magnitude actually
   * changed (byte-identical no-op otherwise), OR the full close-out (resolve + permanent residue)
   * once contamination drops below the detection threshold; (3) `evaluateActivationTriggersDaily` —
   * iterates the 6 LIVE templates in registry order, capped at
   * `random_world.daily_activation_evaluation_batch_size`; C2 wires 2 real trigger evaluators
   * (`halgren_tannery_hailstorm`'s hum-weighted daily roll, S13 + `permanent_residue`'s
   * resolved-parent successor roll) behind the district-cooldown + concurrent-cap gates (D6); the
   * other 4 live templates (`sideways_failure`/`apparent_recovery`/`hollow_at_the_corner`/
   * `quorum_on_stadler_row`) are evaluated (counted) but have no trigger predicate yet — C3/C4 land
   * theirs, same "N getters at C1, consumers land later" honest-scaffolding precedent as this lot's
   * own `random-world.tunables.ts`; phase 4 (sideways secondary shifts due) is C3 scope — no
   * `sideways_failure` event can exist yet to make that phase non-vacuous, mirrors 04g-A C2's own
   * "C3 amends this same registration" precedent for `OffHoursDriftDetector`; (5) `random_world_
   * daily_run` counters update (evaluated/activation counts — diagnostic, BO). Deterministic: NO
   * `Math.random()`/`Date.now()` — the ONLY draw source is `makeRng` (seeds `random_world:{game_day}:
   * {template_id}` / `random_world:{game_day}:permanent_residue:{parent_id}`, S11).
   * Registered by RandomWorldEventGeneratorService.onApplicationBootstrap (04g-B C2).
   * Canon: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.2 + plan §C2.
   */
  RANDOM_WORLD_DAILY_TICK = 'random_world_daily_tick',

  /**
   * 04g-C C2 — ★ BRENNAR_DAILY_TICK (NIGHTLY/30 — RENUMBERED 29→30 at the 04g-C integration: authored
   * at the then-next-free N/29 after RANDOM_WORLD_DAILY_TICK/28, C0 re-anchor
   * `2026-07-16-04g-C-C0-reanchor.md` §1 S1 re-confirmed nothing registered past 28; P3-D merged first
   * and took N/29 CUE_STACK_STALE_SWEEP, so this tick moved to the next-free 30 per "celui qui merge EN
   * SECOND renumérote"). NOT one of the 11 city-sim systems; an `operational/news_beat/`-module
   * tick-hook that plugs into the SAME scheduler, running AFTER both AMBIENT_DAILY_TICK/27 and
   * RANDOM_WORLD_DAILY_TICK/28 (design §2 S1 ordering note: "hum HOURLY/6 < ambient N/27 <
   * random-world N/28 < brennar N/last" — the evening journal narrates the SAME day's events, so it
   * must run last).
   * PHASES (design §3.2, fixed order, per-run — see `BrennarDailyService.dailyTick`): (0) claim the
   * game_day idempotently (`news_daily_run`, INSERT ... ON CONFLICT DO NOTHING — mirrors
   * `RandomWorldEventRepository.claimDay`'s "the claim IS the row" shape, S6); (1) `NewsFodderReader.
   * scanFodder` — normalized READ-only fodder scan across the 4 upstream sources (`random_world_
   * event_active`/`political_event_active`/`live_ops_event_active`/`ambient_micro_event`), F4-capped by
   * `news_beats.digest_fodder_scan_cap`; (2) thread advance (Cooper reframes, Slow Page installments,
   * Hindsight publications due, Storm salience/lock) — C3+ scope, a documented no-op THIS chunk (zero
   * `news_thread` writer exists yet); (3) wire-day determination — C3 scope, no-op; (4) template
   * evaluations (keystones/composites/storm/series/hindsight) — C3-C5 scope, no-op; (5) digest fill
   * (THIS chunk, design §3.2.5/D4): rank the day's uncited fodder (severity → recency → seeded
   * tie-break) and fill up to `news_beats.brennar_daily_beats_per_day_baseline` template-less beats,
   * each citing ≥1 real fodder row (`fodder_refs`) — anti-fig-leaf: fewer real fodder items than
   * baseline slots ⇒ `beats_generated_count < baseline`, honestly, never a fabricated beat; (6)
   * `news_daily_run` counters update (beats_generated_count/template_counts/fodder_counts/wire_day).
   * Deterministic: NO `Math.random()`/`Date.now()` as an RNG source — the ONLY draw source is
   * `makeRng`, seeded `news:{game_day}:digest` (design §8). READ-only against the 4 fodder tables
   * (design §0/§3.3 — zero-regression, floor proves byte-identical fodder snapshots).
   * Registered by BrennarDailyService.onApplicationBootstrap (04g-C C2).
   * Canon: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.2 + plan §C2.
   */
  BRENNAR_DAILY_TICK = 'brennar_daily_tick',

  /**
   * P3-E C2 — ★ FRICTION_BUDGET_TICK (NIGHTLY/31 provisoire — next free after BRENNAR_DAILY_TICK/30, C0/C2
   * re-anchor confirmed nothing registered past 30 on this base). NOT one of the 11 city-sim systems; a
   * `core_loops/demolition/`-module tick-hook that plugs into the SAME scheduler (ch05 Loop 8 Demolition
   * Mandate).
   * PHASES (design §4.4, fixed order, per-run — see `FrictionBudgetTickService.runTick`): (0) lazy-stamp
   * (D20) — any `buildings.acquired_at_tick IS NULL` row of the ★#1 périmètre (`ownership='player' AND
   * structural_state != 'demolished'`, #18) is stamped to the CURRENT `gameMinute` — ONE-SHOT idempotent
   * (a 2nd pass matches zero rows for an already-fully-stamped player); (1) recompute
   * `friction_budget_total`/`friction_org_size` over the SAME périmètre (§4.2 accrual formula: base ×
   * age-in-days × route-connection count, `frictionLoadForNode`, DERIVED never stored, D4) and refresh
   * the `friction_budget_state` cache — single-statement, I4 race-safe (0-write if unchanged); (2) penalty
   * transition (§5.1): `total > friction_org_size × threshold_multiplier` → `efficiency_penalty_active`
   * apply/revert, single-statement guarded on the CURRENT state (I4 exactly-once) — on a FRESH apply,
   * `EfficiencyPenaltyAppliedEvent` (bus NEW) + `FrictionThresholdExceptionProducer.raiseIfClear` (source
   * tag `FRICTION_THRESHOLD`, dedup 1-pending/player, ONE_TIME); on a FRESH revert,
   * `EfficiencyPenaltyRevertedEvent` (bus NEW). Compression-week housekeeping (§4.4 "auto-finalize des
   * boards à l'abandon") is C6/C7 scope — no-op THIS chunk (zero `compression_events` writer exists yet).
   * Deterministic: no `Math.random()`/`Date.now()` anywhere in this tick.
   * Registered by FrictionBudgetTickService.onApplicationBootstrap (P3-E C2).
   * Canon: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §4.4 + plan §C2.
   */
  FRICTION_BUDGET_TICK = 'friction_budget_tick',

  /**
   * P3-E C6 — ★ COMPRESSION_QUIET_DECAY_TICK (WEEKLY/14 provisoire — next free after FLAG_WEEKLY_RESET_
   * TICK/13, C0/C6 re-anchor confirmed nothing registered past 13 on this base). NOT one of the 11
   * city-sim systems; a `core_loops/compression/`-module tick-hook that plugs into the SAME scheduler
   * (ch05 Loop 9 Compression Week).
   * Each in-game week, per player (design §8.3): a week is "quiet" iff EVERY §8.2 LIVE `signal_source`
   * (supply-chain / lieutenant-flags / cue-stack / friction-penalty / annealing-strain — the SAME 5
   * sources `CompressionStressSubscriber`'s own session-close update reads, `CompressionStressReaderService`
   * shared) is exactly 0 THIS window. Quiet -> ONE epoch-guarded conditional UPDATE (mirrors
   * `FLAG_WEEKLY_RESET_TICK`'s own `deriveWeekEpoch`/epoch-guard shape, the watermark living on the NEW
   * `compression_decay_state` table, mig 0134 — NOT on `player_progression_state`, that table's own
   * zero-migration DD-E-schema ruling): `org_stress := GREATEST(floor, org_stress -
   * compression_stress_decay_per_quiet_week)` where `floor` = `compression_stress_floor_with_critical_
   * residue` (40) IFF ≥1 `compression_problem_entry` `tier='critical' AND persisted=true` row exists for
   * this player (★#6 — organically 0 rows this chunk, C7 is the first writer of that table), else 0.
   * Idempotent per epoch: a same-epoch re-run matches the watermark guard and writes NOTHING (design §8.3:
   * "0-write si inchangé"). A player with ANY live signal this week -> 0-write (not quiet), regardless of
   * epoch. Deterministic: no `Math.random()`/`Date.now()` anywhere in this tick.
   * Registered by CompressionQuietDecayTickService.onApplicationBootstrap (P3-E C6).
   * Canon: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.3 + plan §C6.
   */
  COMPRESSION_QUIET_DECAY_TICK = 'compression_quiet_decay_tick',

  /**
   * P3-F C8 — ★ PROMOTION_LOCK_TICK (HOURLY/7, next free after CONSTANT_HUM_CELL_TICK/6 — C0 re-anchor
   * confirmed nothing registered past 6 on this base, `2026-07-18-p3-F-C0-reanchor.md` §1). NOT one of
   * the 11 city-sim systems; a `meta_progression/`-module tick-hook that plugs into the SAME scheduler
   * (ch06 Promotion Lock unmanaged-window lifecycle, design §4/§9.2, D10).
   * Each in-game hour, per player: set-based batch-close of every `promotion_locks` row `ACTIVE` whose
   * `window_end_tick <= ctx.gameMinute` -> `CLOSED` + `closed_at` + `UnmanagedWindowClosedEvent` per
   * closed row (the successor-SUSPENDED overlay lifts derivationally — no separate write, the projection
   * simply stops finding an ACTIVE row). Idempotent by construction: closing an already-CLOSED row is a
   * zero-write (the WHERE's `unmanaged_window_state = 'ACTIVE'` no longer matches — no epoch/watermark
   * column needed, unlike the WEEKLY/NIGHTLY ticks this scheduler also carries). Organically a no-op with
   * no ACTIVE windows (the overwhelming common case pre-first-recall — zero-regression, design §17).
   * Deterministic: no `Math.random()`/`Date.now()` — the comparison tick is `ctx.gameMinute`, the SAME
   * city-sim clock every other tick uses.
   * Registered by PromotionLockTickService.onApplicationBootstrap (P3-F C8).
   * Canon: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §4/§9.2 + plan §C8.
   */
  PROMOTION_LOCK_TICK = 'promotion_lock_tick',

  /**
   * P3-G C8 — ★ ISOSTATIC_DEBT_TICK (HOURLY/8, next free after PROMOTION_LOCK_TICK/7 — C0 0.3 re-verified,
   * plan §0.5). NOT one of the 11 city-sim systems; a `meta_progression/`-module tick-hook that plugs into
   * the SAME scheduler (ch06 Budgets & Horizon, Isostatic Debt passive decay, design §12.3, D11).
   * Each in-game hour, per player: set-based decay of every `capability_debts` row this player holds with
   * `structural_debt > 0` (the `capability_debts_active_idx` partial index, mig 0137) by `elapsed-game-
   * hours x |meta.passive_decay_rate|`, floor 0. Elapsed hours is a PLAIN `(ctx.gameMinute - baseline) / 60`
   * ratio (R9 — the ambient-clock 60-min/hour structural constant, NEVER a second real-time ratio), where
   * `baseline = COALESCE(last_passive_tick, last_upgrade_tick)` — `last_passive_tick` (mig 0140) is a
   * column EXCLUSIVE to this writer, deliberately NOT the C7 `last_decay_tick`/`last_decay_binding` pair
   * (the ACTIVE-decay dedup marker, mig 0139/#25/★#6) — see mig 0140's own header for the coupling bug
   * this separation avoids (a shared column would let this tick spuriously block/be-blocked-by an
   * unrelated active-decay write racing the same row at the same tick). `decay_path` bookkeeping:
   * 'NONE'->'PASSIVE', 'ACTIVE'->'MIXED', else unchanged (mirrors `applyActiveDecay`'s own CASE, the
   * reverse direction). Idempotent by construction: a same-tick re-run matches zero elapsed hours (the
   * WHERE's own `ctx.gameMinute > baseline` guard) -> zero write, never a zero-effect write.
   * `CapabilityDebtClearedEvent` fires per row whose decrement crosses pre>0 to post=0 THIS call (the SAME
   * crossing-detection shape `IsostaticDebtService.applyActiveDecay` already established, C7).
   * Registered by IsostaticDebtService.onApplicationBootstrap (P3-G C8 — the SAME service C7's accrual/
   * active-decay write paths already live on, the THIRD `capability_debts` writer).
   * Canon: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §12.3 + plan §C8.
   */
  ISOSTATIC_DEBT_TICK = 'isostatic_debt_tick',

  /**
   * P3-H C3 — ★ EXECUTION_PLAN_EVALUATOR_TICK (NIGHTLY/33 provisoire — next free after FRICTION_BUDGET_
   * TICK/31; NIGHTLY/32 stays a courtesy gap, reserved for C6's own BENCHMARK_DRIFT_TICK, never reused —
   * this lot's own C0-reanchor §9/R1/R7 confirmed both slots free this session). NOT one of the 11
   * city-sim systems; a `meta_progression/`-module tick-hook that plugs into the SAME scheduler (ch06
   * Vertical Horizon, Decision Horizon Lock, design §6.2, D3/D4/D13 — "cycle" = one game-day, R1
   * DEFINITIVE, genuinely net-new, zero existing eval tick to REUSE).
   * Each in-game night, per player (design §6.2, `ExecutionPlanEvaluatorService.runTick`): find every
   * `execution_cycle_slots` row `slot_status='PENDING'` at `cycle_tick = ctx.gameMinute` whose owning
   * `execution_plans` row is `plan_status='ACTIVE'` for THIS player (the `cycle_tick_idx` index); for each,
   * run `DeviationEvaluatorService.evaluate` (the closed `constraint-evaluators.ts` registry, 3 LIVE +
   * 2 RESERVED, boot-checked — `CAPABILITY_DEBT_BELOW` LIVE per ★H-2 WIRE-LIVE, D13, READ-ONLY against
   * P3-G's `capability_debts`). No deviation -> slot `EXECUTED_ON_PLAN` (guarded, idempotent) + the
   * `(player,lieutenant)` `script_stability_counters` `+1` (upsert) + plan `COMPLETED` if every slot is
   * now done + `CycleExecutedOnPlanEvent`. Deviation -> slot `DEVIATED` (guarded, stamped with the failed
   * clauses) then the plan's OWN `deviation_rule` fires: ABORT (plan `ABORTED`, remaining PENDING slots
   * bulk-transitioned `ABORTED`, counter reset to 0, `PlanAbortedEvent`) or ESCALATE/the C3-disclosed
   * ADAPT-fallback (plan `ESCALATED`, an Exception raised into the LIVE `exception_queue_spine`, counter
   * frozen — no bus event, the Exception insert IS the observable signal). A player with no ACTIVE plans,
   * or none due exactly today, organically no-ops (zero-regression dormant-by-data, design §16). Every
   * write is a single guarded conditional statement (0.4 atomic-first) — a double tick on the SAME
   * `cycle_tick` produces exactly ONE transition per slot, never a double counter increment.
   * Deterministic: no `Math.random()`/`Date.now()` anywhere in this tick.
   * Registered by ExecutionPlanEvaluatorService.onApplicationBootstrap (P3-H C3).
   * Canon: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.2/§6.3/§7 + plan §C3.
   */
  EXECUTION_PLAN_EVALUATOR_TICK = 'execution_plan_evaluator_tick',

  /**
   * P3-H C6 — ★ BENCHMARK_DRIFT_TICK (NIGHTLY/32 — the courtesy gap `EXECUTION_PLAN_EVALUATOR_TICK`'s own
   * C3 doc comment RESERVED, "never reused" per that comment's own promise; C0-reanchor §9/R7 confirmed it
   * free this session, filled HERE). NOT one of the 11 city-sim systems; a `meta_progression/`-module
   * tick-hook that plugs into the SAME scheduler (ch06 Vertical Horizon, Benchmark Drift, design §9.2, D11
   * — "cycle" = one game-day, R1's own DEFINITIVE finding, REUSED here verbatim).
   * Each in-game night, per player (`BenchmarkDriftService.runTick`), per LIVE metric (`metric-sources.ts
   * #LIVE_METRIC_KINDS_LIST` — SAFEHOUSE_UTILIZATION + COURIER_DELIVERY_RATE, ★H-3 2-LIVE + 1-RESERVED,
   * closed-by-construction): read the CURRENT real value via the `MetricValueRef` indirection (no copy, R3)
   * -> a row that does not exist yet gets lazily created (`baseline_source='INITIAL'`, `drift_accumulator=0`
   * — the day of a snapshot has zero elapsed drift since itself) -> an EXISTING row's `drift_accumulator` is
   * RECOMPUTED as `elapsed_game_days_since(baseline_snapshot_tick) * drift_accumulation_rate_pct_day` (the
   * idempotent elapsed-guard idiom `ISOSTATIC_DEBT_TICK` established, REUSED here — see `player-metric-
   * benchmarks.repository.ts#accumulateAndMaybeAutoUpdate`'s own header for the full atomic/concurrency
   * proof, including WHY this is genuinely idempotent under a same-game-day double tick, never a double
   * accumulation); crossing `benchmark_auto_update_threshold_pct` -> the baseline SILENTLY snapshots to the
   * real current value (`baseline_source='AUTO_UPDATE'`, `drift_accumulator->0`) + `BaselineAutoUpdatedEvent`
   * (BO-only — design §9.2's own "never surfaced player", the silent-invalidation canon seed). A player with
   * no substrate for a given metric (no courier history in particular — LOT PLANQUE ended the era where
   * `safehouses` was organically empty for every player, so that half is now the edge case, not the norm)
   * reads `0` for it (a real "no track record yet" value, never fabricated) — zero-regression dormant-by-
   * data, design §16.
   * Deterministic: no `Math.random()`/`Date.now()` anywhere in this tick (the SQL-side elapsed-day division
   * is a pure function of `(ctx.gameMinute, baseline_snapshot_tick, clock.in_game_day_length_minutes)`).
   * Registered by BenchmarkDriftService.onApplicationBootstrap (P3-H C6).
   * Canon: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §9.1/§9.2 + plan §C6.
   */
  BENCHMARK_DRIFT_TICK = 'benchmark_drift_tick',

  /**
   * TD-517 (2026-09-02) — LE DÉCAI DE LA FENÊTRE DU LEDGER DE FAUX RAPPORTS (NIGHTLY/34).
   *
   * Pourquoi il existe : `window_false_count` / `window_genuine_count` s'appellent « window » et la
   * migration comme le canon annoncent **30 jours** — mais les DEUX seuls écrivains les INCRÉMENTENT
   * (`+ 1`) et l'unique `UPDATE` de la table ne les touche jamais. Sa docstring promettait un décai
   * « future » qui n'est jamais venu. Elles étaient donc **monotones à vie**, et le ratio
   * false:genuine qu'elles alimentent finit par franchir le seuil **par ancienneté seule** — sur un
   * joueur honnête, et pour infliger une sanction réelle.
   *
   * Ce que ce tick fait : il RECALCULE les deux compteurs depuis `false_report_ledger`, la table qui
   * porte `submitted_at`. Recalculer, jamais décrémenter — un décrément suppose qu'on sait combien
   * d'entrées sont sorties de la fenêtre, un recalcul le LIT. Et il est idempotent par construction :
   * le rejouer donne le même résultat, ce qu'aucun `- 1` ne garantit.
   */
  FALSE_REPORT_WINDOW_DECAY_TICK = 'false_report_window_decay_tick',
}

/**
 * The per-tick context a system receives. Per-player (the city sim is per-player — all dynamic state is
 * keyed by player_id). `gameMinute` is the in-game clock AFTER this boundary; `cadence` is which band is
 * firing; `subTick` is the 2 Hz sub-step index within an in-game minute (0..N-1) for TWO_HZ runs only.
 */
export interface CitySimTickContext {
  readonly playerId: string;
  readonly cadence: Cadence;
  readonly gameMinute: number;
  /** 2 Hz sub-step index within the current in-game minute (TWO_HZ only; undefined for in-game cadences). */
  readonly subTick?: number;
}

/**
 * A registered city-sim system hook. T2–T13 implement this and register it at their primary cadence +
 * DAG order. T1 ships only no-op placeholders. The `run` is awaited in DAG order within its cadence.
 *
 * R-decoupling: the scheduler calls `run(ctx)`; it never reaches into a system's state store. Cross-system
 * data flows via the (future) CityEventBus, not via the scheduler holding references to concrete systems.
 */
export interface CitySimSystem {
  /** Canonical system identity (for logging / DAG validation / BO projection). */
  readonly id: CitySystemId;
  /** The cadence band this registration runs in. */
  readonly cadence: Cadence;
  /**
   * DAG order WITHIN the cadence (cross_system_interactions.md §Ordre DAG canonique). Lower runs first.
   * Downstream systems consume the state produced by upstream systems in the same tick.
   */
  readonly order: number;
  /** Run this system for one tick of its cadence. May be async (DB writes, event emission). */
  run(ctx: CitySimTickContext): void | Promise<void>;
}
