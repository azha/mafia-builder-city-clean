import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
// W1.2-a C2 — TwoPersonModule (ch17 `authorization_rbac.md` §Two-person rule, :134-159): the
// `two_person_approval` service + the 3 canon `/v1/admin/twoperson/*` routes. Registered as its OWN
// module (not folded into AuthModule) — the périmètre spec's own C2 charter names this file.
import { TwoPersonModule } from './auth/two_person/two-person.module';
// W1.2-a C3+C4 — AntiCheatModule (ch13): the enforcement chain (propose → two-person approval →
// execute), the player appeal surface (ch09 §9.1), and the ONE `cheat_flag` writer (C1 decoy-spam).
// `InspectionQueueModule` ALSO imports this module (for `CheatFlagService`, C4's appelant de
// production) — same shape as `AuthModule` being imported both here AND by `InspectionQueueModule`
// (Nest deduplicates a module imported from two places; `auth.module.ts`'s own header note).
import { AntiCheatModule } from './anti_cheat/anti-cheat.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { I18nModule } from './i18n/i18n.module';
import { IdempotencyInterceptor } from './protocol/idempotency.interceptor';
import { ProtocolModule } from './protocol/protocol.module';
import { SchedulerModule } from './citysim/scheduler/scheduler.module';
import { FlowCellsModule } from './citysim/flow_cells/flow_cells.module';
import { PoliceMemoryModule } from './citysim/police_memory/police_memory.module';
import { PatrolDoctrineModule } from './citysim/patrol/patrol.module';
import { CohesionPermafrostModule } from './citysim/cohesion/cohesion.module';
import { InspectionQueueModule } from './citysim/inspection/inspection.module';
import { UnconformityLedgerModule } from './citysim/unconformity/unconformity.module';
import { DwellTimeModule } from './citysim/dwell_time/dwell-time.module';
import { ErlangStashModule } from './citysim/erlang_stash/erlang-stash.module';
import { BufferBloatModule } from './citysim/buffer_bloat/buffer-bloat.module';
import { DealLekModule } from './citysim/deal_lek/deal-lek.module';
import { HeatModule } from './citysim/heat/heat.module';
import { DistrictInteriorModule } from './citysim/district_interior/district-interior.module';
import { SparseCitizensModule } from './citysim/sparse_citizens/sparse_citizens.module';
import { RealEstateModule } from './operational/real_estate/real-estate.module';
import { PrecursorsModule } from './operational/precursors/precursors.module';
import { ProductionModule } from './operational/production/production.module';
import { DistributionModule } from './operational/distribution/distribution.module';
import { SellingModule } from './operational/selling/selling.module';
import { LaunderingModule } from './operational/laundering/laundering.module';
import { HeatContribModule } from './operational/heat_contrib/heat-contrib.module';
import { EnforcementModule } from './operational/enforcement/enforcement.module';
import { ColdChainModule } from './operational/coldchain/coldchain.module';
import { HushModule } from './operational/hush/hush.module';
import { AshModule } from './operational/ash/ash.module';
import { GrowModule } from './operational/grow/grow.module';
import { MoneyHoldingModule } from './operational/money_holding/money-holding.module';
import { LieutenantModule } from './operational/lieutenant/lieutenant.module';
import { MarketModule } from './operational/market/market.module';
import { PrecursorMarketModule } from './operational/precursors/precursor-market.module';
import { ReputationModule } from './operational/reputation/reputation.module';
import { InsuranceModule } from './operational/insurance/insurance.module';
import { ForensicSignalingModule } from './operational/forensic/forensic.module';
import { LawyerModule } from './operational/legal/legal.module';
import { InternalAffairsModule } from './operational/internal_affairs/internal-affairs.module';
import { DslModule } from './dsl/dsl.module';
import { EconomyModule } from './economy/economy.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { ProgressionModule } from './progression/progression.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { RivalAiModule } from './operational/conflict/rival/rival-ai.module';
import { CombatModule } from './operational/conflict/combat/combat.module';
import { EngagementsModule } from './operational/conflict/combat/engagements.module';
import { DiplomacyModule } from './operational/conflict/diplomacy/diplomacy.module';
import { InformationWarfareModule } from './operational/conflict/infowar/infowar.module';
import { MetaMarketModule } from './operational/meta_market/meta-market.module';
import { EffectEngineModule } from './operational/effect_engine/effect-engine.module';
import { PoliticalModule } from './operational/political/political.module';
import { LiveOpsModule } from './operational/liveops/live-ops.module';
import { MaintenanceModule } from './operational/maintenance/maintenance.module';
import { RecruitmentModule } from './operational/recruitment/recruitment.module';
import { CoreLoopsModule } from './core_loops/core-loops.module';
import { SessionModule } from './session/session.module';
import { FlagDisciplineModule } from './core_loops/flag_discipline/flag-discipline.module';
import { CueStackModule } from './core_loops/cue_stack/cue-stack.module';
import { AnnealingModule } from './core_loops/annealing/annealing.module';
import { AmbientModule } from './operational/ambient/ambient.module';
import { RandomWorldModule } from './operational/random_world/random-world.module';
import { NewsBeatModule } from './operational/news_beat/news-beat.module';
import { DemolitionModule } from './core_loops/demolition/demolition.module';
import { CompressionModule } from './core_loops/compression/compression.module';
import { TemplateLibraryModule } from './operational/template_library/template-library.module';
import { DelegationRatchetModule } from './meta_progression/delegation-ratchet.module';
import { BudgetsHorizonModule } from './meta_progression/budgets-horizon.module';
import { VerticalHorizonModule } from './meta_progression/vertical-horizon.module';
import { OnboardingUiModule } from './onboarding/onboarding-ui.module';
import { IapModule } from './economy/iap/iap.module';

/**
 * Root module of the game-back NestJS modular monolith.
 *
 * Phase 0 Task 2: DbModule imported once here (Drizzle client + Redis,
 * @Global() — cf. 09 §5.2). Singleton DB providers DB/REDIS now DI-available.
 *
 * Phase 0 Task 3: the T1 `/health`→200 stub controller is REPLACED by the real
 * HealthModule (HealthService aggregating postgres/redis/migrations probes,
 * 09 §6). Endpoints: /health (public) + /health/detailed (ops, permissive stub
 * until StaffRoleGuard lands Task 6).
 *
 * Phase 0 Task 9: I18nModule (string-table bundle endpoint, ch19) + TelemetryModule
 * (telemetry ingestion + staff read, ch20/26 — consent-gated, append-only INSERT).
 */
@Module({
  imports: [
    DbModule,
    AuthModule,
    // W1.2-a C2 — two-person-approval workflow (ch17). imports: [] (no ambient module needed — see
    // two-person.module.ts's own header).
    TwoPersonModule,
    // W1.2-a C3+C4 — ch13 enforcement chain + player appeals + the cheat_flag writer.
    AntiCheatModule,
    HealthModule,
    ProtocolModule,
    I18nModule,
    TelemetryModule,
    SchedulerModule,
    // Phase 1 Task 2: System 1 Block-Local Flow Cells (in-memory Jackson 2 Hz) + P5 backpressure
    // projection. Registers into the CitySimScheduler at slot {TWO_HZ, order 1, FLOW_CELLS} at bootstrap.
    FlowCellsModule,
    // Phase 1 Task 3: System 2 Sparse Citizens (PERSISTED RichNPCs in rich_citizens + conceptual sparse
    // FlowParticles) + whisper_state P5 projection. Registers into the CitySimScheduler at slots
    // {TWO_HZ/3, FIVE_MIN/1, TWELVE_H/3} (multi-cadence) at bootstrap.
    SparseCitizensModule,
    // Phase 1 Task 4: System 3 Asymmetric Police Memory (PERSISTED precinct_memory, 6 rows/player) —
    // event-driven lossy suspicion belief (CityEventBus subscriber) + nightly decay + 12h precinct review +
    // P5 belief projection. Subscribes to FlowCell/Whisper + (T5 handoff) PatrolObservation/RaidPlanned events;
    // registers into the CitySimScheduler at slots {ON_EVENT/1, MINUTE/5, TWELVE_H/4, NIGHTLY/3}. Since T5 it
    // produces NO cross-system events (System 4 owns Raid/Undercover); it exposes getTopTargets() read-only.
    PoliceMemoryModule,
    // Phase 1 Task 5: System 4 Delayed-Response Patrol Doctrine (PERSISTED patrol_observation_queues, 6 rows/
    // player) — 30-min observation accumulation (per-precinct ring buffer from FlowCellCongested sightings,
    // overflow drops low-severity-first) + 12h review/clustering → RaidPlanned/UndercoverDispatched (canonical
    // owner) + P5 patrol-heat projection. The System 3↔4 handoff: emits PatrolObservationEvent (System 3 bumps
    // suspicion) + reads System 3 getTopTargets() READ-ONLY (Inv 6). Registers into the CitySimScheduler at
    // slots {THIRTY_MIN/1, TWELVE_H/1} at bootstrap (imports PoliceMemoryModule for the read-only coupling).
    PatrolDoctrineModule,
    // Phase 1 Task 6: System 5 Cohesion Permafrost (PERSISTED district_cohesion, 18 rows/player) — NIGHTLY
    // delta (police-presence read-only from System 4 + passive recovery + legit-service slider) + thaw
    // detection (irreversible hysteresis ratchet + one-way permanent_marginal gate + non-linear informant
    // yield) + CohesionState band projection (Inv 7 reconciled with R2.2 — qualitative band + flag, no raw
    // float). Producer-only (Inv 6): emits CohesionStateChanged / CohesionFactorUpdated / WhisperIndexUpdated;
    // reads System 4 patrol presence READ-ONLY. Registers at slot {NIGHTLY/1} at bootstrap (imports
    // PatrolDoctrineModule for the read-only coupling). Crime-event + legit-slider INPUTS deferred Phase 1.
    CohesionPermafrostModule,
    // Phase 1 Task 7: System 6 Inspection Cascade Queue / MIS (PERSISTED inspection_queues, 18 rows/player —
    // Inv 1 per-district) — the 12h dispatch tick (Phase A effective rate / DispatcherRegime + Phase B FIFO-
    // within-priority dispatch + Phase C/D priority decay + Inv 3 overflow drop-low-first) + SCHEDULED-audit
    // fill (deterministic, no RNG) + the queue-load/type-severity projection (Inv 4 — informant-fee read surface,
    // no positions/buildings/counts). Cross-system BOTH directions: SUBSCRIBES CohesionStateChangedEvent THAWED
    // (System 5 → cascade amplification, Inv 5/7) + EMITS BuildingEvidenceFoundEvent (→ System 3 BPD referral,
    // Inv 6). Registers at slot {TWELVE_H/2} at bootstrap. FalseReportLedger / informant-fee charge / System 7
    // mismatch targeting DEFERRED Phase 1 (documented). System 3 wires its own BuildingEvidenceFound subscription.
    InspectionQueueModule,
    // Phase 1 Task 8: System 7 Unconformity Ledgers (TWO-TIER: in-memory block-aggregate + per-promoted-building
    // ledgers; the AUDIT PIN PERSISTED on the migrated buildings.audit_pin_expires_at) — the NIGHTLY tick (Phase A
    // ring buffer + Phase B deviation z-score + Phase C bucket map NOMINAL/LOW/HIGH/CRITICAL relative to
    // deviation_threshold_sigma + Phase D audit-pin activation/expiry, Inv 4 composite / Inv 7 suppression flag) +
    // the AUDIT_PIN_ACTIVE / deviation-bucket projection (Inv 1 / R2.2 — never the raw sigma float). EMITS
    // UnconformityAuditPin + AuditPinObservationHint (emit-only day-1 — System 6/4 consumers wire later); exposes
    // getMismatchScore (Inv 6 — System 6 cascade-targeting read, wired when P2 populates buildings). Registers at
    // slot {NIGHTLY/2} (after System 5 cohesion). Revenue/transaction_profile + the promotion trigger + the G31
    // declaration-ledger amplification DEFERRED Phase 1 (no P2/04c producer — documented). Organically a no-op
    // (buildings empty Phase 1); the E2E seeds promoted buildings to exercise the deterministic deviation → pin path.
    UnconformityLedgerModule,
    // Phase 1 Task 9: System 8 Dwell-Time Tax / Throughput Trilemma (PERSISTED per-minute floats on the migrated
    // laundering_nodes table; in-memory PipelineNetwork aggregate) — the MINUTE tick (the FINEST city-sim cadence,
    // Inv 3): per laundering_node Little's-Law recompute (dwell_time_hours = buffer_load / throughput_in_per_hour;
    // throughput==0 → dwell defaults to dwell_time_per_node_hr) + cleanliness_at_output ∈ [0,1] (Inv 6) + overflow
    // detect (buffer_load ratio >= 1 = AT inventory_cap_per_node — the buffer_load schema-unit reconciliation:
    // buffer_load is a DB-CHECK-enforced [0..1] normalized ratio, NOT the raw $ figure) + the throughput-weighted
    // network aggregate (inventory_at_risk_global, Inv 4). Inv 1 Little's Law HARD: inventory_at_risk = throughput
    // × dwell (never decoupled). Projection (Inv 5 / Inv 6 / R2.2): ThroughputBucket UNDER/NOMINAL/OVER/OVERFLOW +
    // CleanlinessBucket + an exposure band — never the raw throughput/dwell/cleanliness floats or raw cash. EMITS
    // PipelineMinuteSnapshot (emit-only day-1); exposes getInventoryAtRisk (the System 3/4/6 consumer seam, wired
    // when P2 routes dirty-cash inflow). Registers at slot {MINUTE/2} (after System 9 Erlang Stash). The throughput
    // INFLOW (λ from deals) + the pipeline-BUILD flow + the System 7 baseline cap + the System 9 safehouse cap
    // DEFERRED Phase 1 (no P2 / System-9 producer — documented). Organically a no-op (laundering_nodes empty Phase
    // 1); the E2E seeds a building + nodes to exercise the deterministic Little's-Law / bucket / overflow recompute.
    DwellTimeModule,
    // Phase 1 Task 10: System 9 Erlang Stash Capacity (READS the migrated `safehouses` table; blocking_probability
    // DERIVED in-memory per safehouse — no persisted blocking column) — the MINUTE tick (Inv 4): per-safehouse
    // Erlang-B blocking_probability recompute B(C, A) = (A^C/C!) / Σ_{k=0}^C (A^k/k!) via the numerically-stable
    // Jagerman recursion (Inv 1 HARD — never factorial/power; the knee Inv 2 IS the mechanic). A = λ/μ traffic
    // intensity (λ = arrival_rate; μ = 1.0 normalized service rate → A = arrival_rate erlangs). The 5-sec
    // cash-arrivals tick (Inv 3) is DEFERRED Phase 1 (cash inflow = P2); the minute tick recomputes blocking from
    // the current persisted state. Projection (Inv 1/2/5 / R2.2): StashLoadBucket EMPTY/LOW/NOMINAL/HIGH/FULL + a
    // StashBlockingBand LOW/MODERATE/HIGH/SATURATED + a district summary — never the raw blocking float / per-slot
    // fill / cash / arrival_rate. EMITS StashHighBlockingAlert when blocking > stash.blocking_alert_threshold
    // (emit-only day-1); exposes getBlockingProbability (the System 8 throughput-cap seam — a MAGNITUDE since System
    // 8 needs proportionality, per the cross-system accessor convention; wired when P2 routes throughput inflow).
    // Registers at slot {MINUTE/1} (BEFORE System 8 at MINUTE/2 — the DAG System 9 → System 8 → System 10 → Heat).
    // Raids (Inv 6 deterministic drain order) = P2 — genuinely unimplemented here (0 `raid` reference
    // anywhere in this module), independent of whether `safehouses` has rows; LOT PLANQUE gave the
    // table its first application writer, so it is no longer organically empty, but nothing yet reads
    // `raid_drain_policy` to act on it. The E2E seeds a building + safehouses (varied slot_count /
    // arrival_rate / current_fill) to exercise the Erlang-B knee / bucket / alert. R9.3: 09 = source
    // of truth for safehouses (this READS the schema; app_rw has UPDATE per 0013).
    ErlangStashModule,
    // Phase 1 Task 11: System 10 Buffer Bloat Laundering (OWNS the migrated `tail_risk_estimates` table — lazy-creates
    // one row per laundering_node on first tick; SYNCs `laundering_nodes.buffer_load` so System 8's dwell tick sees
    // the buffer fill — System 10 is the WRITER, System 8 READS it per T9). TWO cadence slots: MINUTE/3 BUFFER_BLOAT
    // (after System 8 at MINUTE/2, before Heat at MINUTE/4) advances per-node occupancy = inflow (System 8's
    // throughput_in_per_hour read-only) − drain (drain_rate_to_next_stage_per_hr); detects overflow (occupancy >
    // capacity → cap hard + drop the excess cash + emit BufferOverflowEvent, emit-only day-1 — Heat consumer wires
    // T13/P2); refreshes tail_p95_estimate ∝ occupancy (Inv 2 — the cash IN the buffer IS the seizure exposure, the
    // central lesson). WEEKLY/2 BUFFER_BLOAT (after System 11 at WEEKLY/1) resets the percentile baseline + the
    // per-period overflow flags. The spec's "hourly tail recompute" is reconciled (the SCHEDULE gives MINUTE+WEEKLY
    // only — the tail refresh is folded into the minute tick; the baseline reset runs weekly). Projection (Inv 3/5/7
    // / R2.2): a BufferLoadBucket EMPTY/LOW/NOMINAL/HIGH/CRITICAL + a TailPercentileState LOW/MODERATE/HIGH/CRITICAL +
    // an overflow badge + a district summary — never the raw current_occupancy / tail_p95 / overflow_amount cash.
    // Inv 3: the projection exposes the BUCKET (which reveals the silent buffer growth the deceptive average hides).
    // Organically a no-op (laundering_nodes empty Phase 1); the E2E seeds a building + a laundering_node (+ a
    // tail_risk_estimate or lets System 10 lazy-create it) with throughput/occupancy to exercise occupancy / overflow
    // / bucket / buffer_load sync. R9.3: 09 = source of truth for tail_risk_estimates + laundering_nodes (this READS
    // the schemas; app_rw has UPDATE on both per 0013).
    BufferBloatModule,
    // Phase 1 Task 12: System 11 Deal Lek (OWNS the migrated `deal_leks` table — SPARSE, PK player_id/tile_id;
    // Inv 1 only tiles with score>0 exist as rows, bounded by lek_tile_count=600 — never a pre-seeded grid). TWO
    // cadence slots: TWO_HZ/2 DEAL_LEK (after System 1 Flow Cells at TWO_HZ/1, before System 2 Sparse Citizens at
    // TWO_HZ/3) accumulates per-tile lek_score from FlowCellCongestedEvent (System 1 -> System 11 — the ORGANIC
    // Phase-1 driver; flow congestion forms leks lazily on congested block-tiles, day-phase-weighted accrual);
    // WEEKLY/1 DEAL_LEK (before System 10 Buffer Bloat at WEEKLY/2) decays lek_score (Inv 2 — round((1 - rate)*score
    // + deals), aggravated x1.5 if the district is THAWED — System 5 -> System 11 CohesionStateChanged modifier),
    // kills leks with no deals for 4 weeks (Inv 5 -> control_state=DEAD + emit LekDeathEvent; the tile keeps its
    // historical score), resets deals_this_week, and re-ranks the top-N (leks_per_district) per district (a DERIVED
    // attractor marker — the demoted tiles keep their row). Projection (Inv 6/7 / R2.2): LekControlState
    // CONTROLLED/CONTESTED/DEAD + a score-intensity band + a contest-pressure band + presence buckets (Inv 7 — NONE
    // day-1, the P2 presence-assignment read surface) — NEVER the raw lek_score / contest_pressure int. SUBSCRIBES
    // FlowCellCongestedEvent (System 1, the organic driver) + CohesionStateChangedEvent THAWED (System 5, aggravated
    // decay); EMITS LekDeathEvent (emit-only day-1 — Unity marker retirement wires T14/P2). Controller-org
    // convention: org 0 = player org for organic leks (rivals 1..4 coil/tarcum/iron_throat/saltline). The
    // player-deal tribute economy + the presence-contest control-flip + the 04a selling.lek_* composites are
    // DEFERRED Phase 1 (P2/operations — documented). Organically leks form from System 1's flow congestion; the
    // E2E seeds deal_leks rows to exercise the deterministic weekly decay / lek death / projection. R9.3: 09 =
    // source of truth for deal_leks (this READS the schema; app_rw has SELECT/INSERT/UPDATE/DELETE per 0013).
    DealLekModule,
    // Phase 1 Task 13: System Heat (Heat Propagation — the cross-system signal capstone). Registers at the slot
    // {MINUTE/4 HEAT} (the canonical DAG System 9 → 8 → 10 → Heat — Heat runs LAST in the minute band), REPLACING
    // the no-op placeholder. The MINUTE/4 tick, per player's OPERATIONAL buildings: FLUSHES buffered heat injections
    // (the §Consommation event-driven accumulation — never per-event DB writes), DECAYS heat by the HALF-LIFE
    // exponential (Inv 4 — heat × 0.5^(1/(heat_decay_half_life_hours×60)) per minute; cools even without activity =
    // long-absence cooling), PROPAGATES a HOT/BURNING building's heat as a SPATIAL "heat shadow" to buildings within
    // heat_propagation_radius_tiles (=2) by heat_propagation_factor_per_tick (=0.05) — NOT district-wide (Inv 5;
    // Stack-profile districts dampen by stack_district_heat_propagation_dampening_pct=50; a Cohesion-STABLE district
    // further suppresses), ESCALATES a building ≥ heat_escalation_threshold (=0.7) → emits HeatEscalationEvent (Inv
    // 6), and AGGREGATES the in-memory district + citywide PEAK HeatBucket (Inv 7 — qualitative, never a float sum).
    // R2.2 STRICT (Inv 1/2): heat is a cross-system SIGNAL surfaced ONLY as a HeatBucket COLD/WARM/HOT/BURNING overlay
    // — never a raw float; its effect is MEDIATED by other systems, never a direct penalty. Persists buildings.heat
    // (the migrated real [0..1], CHECK b_heat_chk; app_rw has UPDATE per 0013); district + citywide HeatState are
    // in-memory. CONSUMES BufferOverflowEvent (System 10 → heat injection — the ONE built organic source) +
    // HeatInjectionEvent (the canonical seam — the production-gated test hook + the deferred P2 producers:
    // CASH_OVERFLOW System 8 / STASH_OPEN System 9 / LEK_DEAL System 11 / FLOW_CONGESTION System 1) +
    // CohesionStateChanged (STABLE → propagation SUPPRESSED). CROSS-SYSTEM INFLUENCE WIRED: emits HeatEscalationEvent
    // → System 4 Patrol Doctrine subscribes + records a heat sighting on the escalated block → raised observation
    // severity → (transitively, via PatrolObservation) System 3 police memory — the heat → patrol → police chain made
    // real. System 7 unconformity consumption is the documented seam. Projection (Inv 1/2/3/7 / R2.2): a per-district
    // HeatBucket + the citywide aggregate + the escalation flag + per-building HeatBucket — never the raw heat float.
    // Organically a no-op (buildings empty Phase 1); the E2E seeds player-owned operational buildings with heat
    // values + adjacent block_ids to exercise the deterministic decay / heat-shadow / escalation / buckets. R9.3:
    // 09 = source of truth for buildings (this READS the schema, no schema change; app_rw has UPDATE per 0013).
    HeatModule,
    // W3.U2 C2 — the district-interior diorama screen's back projection: `GET /v1/city/district/:id/interior`
    // (D1/D2/D8). A pure READ route (grid + per-building bands, C1's DistrictInteriorRepository/
    // DistrictInteriorProjectionService, consumed as-is) + binding 5 (lapse_phase_bucket/
    // maintenance_in_progress) + day_phase (D8, shares its quarter-index formula with DealLekService via
    // citysim/day-phase-quarter.ts). No tick-hook, no schema change — imports MaintenanceModule for the
    // cross-module reads (MaintenanceRepository/MaintenancePhaseService), the SAME shape RealEstateModule
    // below already uses for those two providers.
    DistrictInteriorModule,
    // Phase 2 Task 1: Operational chain — M1 real-estate slice (acquire → convert → setup). Player ACTIONS
    // (RealEstateService.purchase = legitimate purchase, debits the grounded acquisition price = acquisition_cost_ratio
    // × reference conversion cost at STANDARD cover [the canonical district-based nominal pricing model is DEFERRED to
    // the fuller real-estate/economy pass — gdd/14 carries only relative district multipliers, no $ base / size];
    // ConversionService.convert = debit the grounded conversion.base_cost_* × multiplier from
    // economy_states.cash_cents + create building_operational_state, conversion_stage='gutting') + the SETUP
    // TICK-HOOK (ConversionSetupService registers at slot {MINUTE/6 OPERATIONAL_SETUP}, LAST in the minute band after
    // POLICE_MEMORY/5, REPLACING the no-op placeholder — drains setup_remaining_ticks each in-game minute and flips
    // conversion_stage → 'operational' at 0, in ONE batched UPDATE; the operational tick-hook pattern T2–T6 inherit)
    // + the qualitative projection (GET /v1/operational/building/:id — setup-state / cover band / operational flag,
    // R2.2 no raw timer/tier/price). R9.3: 09 = source of truth for buildings / building_operational_state /
    // economy_states (this READS + mutates per the 0013/0017 grants; no schema change).
    RealEstateModule,
    // Phase 2 Task 2: Operational chain — M1 Pyralin sourcing slice (order → lead-time arrival → stock). Player
    // ACTION (PrecursorService.order = legitimate Pyralin order; debits the grounded order cost = qty ×
    // precursors.pyralin_unit_price_ratio [the ONLY NEW tunable, 0.01, [PROV-Y26Q2]] × the STANDARD-cover reference
    // conversion cost conversion.base_cost_standard_min [$15000 anchor]; creates a pending precursor_order that
    // ARRIVES after the deterministic Pyralin lead time = precursors.pyralin_lead_time_days_min [2 game-days] ×
    // clock.in_game_day_length_minutes [1440] = 2880 minute-ticks) + the ARRIVAL TICK-HOOK (PrecursorArrivalService
    // registers at slot {MINUTE/7 PRECURSOR_ARRIVAL}, after OPERATIONAL_SETUP/6, REPLACING the no-op placeholder —
    // each in-game minute it delivers pending orders whose arrives_at_tick <= the current tick: marks them delivered
    // + increments precursor_stock in ONE batched transaction; the operational tick-hook pattern shared with T1) +
    // the qualitative projection (GET /v1/operational/precursors — stock band / order-state booleans, R2.2 no raw
    // quantity/price/ticks). M1 = the LEGITIMATE Pyralin channel ONLY (gray/restricted/degradation/disruption
    // DEFERRED — YAGNI). R9.3: 09 = source of truth for precursor_order / precursor_stock / building_operational_state
    // / economy_states / city_sim_clock (this READS + mutates per the 0013/0017 grants; no schema change).
    PrecursorsModule,
    // Phase 2 Task 3: Operational chain — M1 Brindle production slice (startCook → tick-advance cook cycle → product
    // yield). Player ACTION (ProductionService.startCook = consume ONE batch of Pyralin [production.brindle.pyralin_
    // units_per_batch = 2 units, the ONLY NEW tunable, [PROV-Y26Q2]] from precursor_stock, guarded; create a cook_
    // session at stage_1 on a player-owned OPERATIONAL LAB) + the COOK-ADVANCE TICK-HOOK (ProductionCookAdvanceService
    // registers at slot {MINUTE/8 COOK_ADVANCE}, after PRECURSOR_ARRIVAL/7, REPLACING the no-op placeholder — each
    // in-game minute it advances in-progress cooks one functional stage per elapsed uniform stage duration
    // [substance.brindle.cook_stage_duration_ticks = 30; cook_stages = 4 → 120-tick cycle] and on stage_4 completion
    // yields the flat Tier-1 output [production.brindle.tier_1_standard_output_g_per_cook = 200 g] into product_storage
    // at the M1 deterministic STANDARD purity / STANDARD cut, in batched set-based SQL; the operational tick-hook
    // pattern shared with T1/T2) + the qualitative projections (GET /v1/operational/lab/:id cook-stage band + GET
    // /v1/operational/storage/:id product band, R2.2 no raw grams/purity/stage-clock). M1 = the LEGITIMATE 4-stage cook
    // consuming ONLY Pyralin (secondary precursors / stage knobs / Operator / tier upgrades / byproducts DEFERRED —
    // YAGNI). R9.3: 09 = source of truth for cook_session / product_storage / precursor_stock / building_operational_
    // state / city_sim_clock (this READS + mutates per the 0013/0017 grants; no schema change).
    ProductionModule,
    // Phase 2 Task 4: Operational chain — M1 foot-courier distribution slice (dispatch → tick-driven transit → cargo
    // arrival). Player ACTION (DistributionService.dispatch = move Brindle from one OPERATIONAL building to another;
    // sources the cargo from the source product_storage [guarded decrement], creates a route [M1 deterministic 2-stop
    // block path] + a FOOT courier [vehicle_type='foot', in_transit] + a courier_shift carrying the cargo
    // [courier_shift.cargo_grams]) + the COURIER-TRANSIT TICK-HOOK (DistributionTransitService registers at slot
    // {MINUTE/9 COURIER_TRANSIT}, after COOK_ADVANCE/8, REPLACING the no-op placeholder — each in-game minute it
    // advances in-transit couriers by the foot-speed-derived deterministic transit duration [transit_ticks = max(1,
    // ceil(block_distance / distribution.foot_courier_blocks_per_tick=1, the ONLY NEW tunable, [PROV-Y26Q2])] and on
    // arrival transfers the cargo into the destination product_storage in batched set-based SQL; the operational
    // tick-hook pattern shared with T1/T2/T3) + the qualitative projection (GET /v1/operational/couriers — transit
    // band IDLE/IN_TRANSIT/ARRIVED, R2.2 no raw coords/cargo/segment/clock). M1 = FOOT couriers carrying PRODUCT only
    // (bike/car/van, runner cash-carry, A* RouteFinderService, detection-roll/raid, Ephemeral Architecture, dispatch
    // coordinator behavior script DEFERRED — YAGNI; light-detection coupling = documented seam). R9.3: 09 = source of
    // truth for courier / route / courier_shift / product_storage / building_operational_state / city_sim_clock (this
    // READS + mutates per the 0013/0017 grants; no schema change).
    DistributionModule,
    // Phase 2 — OPERATIONAL dealer-at-lek SELLING slice (Task 5). The player ACTIONS (SellingService.assignDealer —
    // create a WORKING Brindle dealer at an operational dealer-spot covering a lek tile; SellingService.collect — the
    // runner pickup ferrying the dealer's whole float into a player-owned safehouse, depositing into the Erlang slot
    // model atomically/guarded, refused 409 if the safehouse is full) + the DEALER-SELL TICK-HOOK (SellingSellService
    // registers at slot {MINUTE/10 DEALER_SELL}, after COURIER_TRANSIT/9, REPLACING the no-op placeholder — each
    // in-game minute it sells selling.deal_grams_per_tick=5 g [[PROV-Y26Q2]] off every WORKING dealer's lek-present
    // operational dealer-spot product_storage [guarded min(rate,available)] and credits grams × the deal value
    // selling.brindle_deal_value_cents_per_gram=2500 [[PROV-Y26Q2]] to dealer.float_cents, in batched set-based SQL;
    // the operational tick-hook pattern shared with T1–T4) + the qualitative projection (GET /v1/operational/dealer/:id
    // + /dealers — activity band WORKING/IDLE/ABSENT/COMPROMISED + cash band NONE/LOW/MODERATE/HIGH/FULL, R2.2 no raw
    // cents/tile/grams). CONSUMES System 11 (deal_leks — lek presence READ in the batched query, never recomputes
    // lek_score) + System 9 (ErlangStashService — the safehouse occupation/blocking read for the runner deposit, the
    // raw slot model the schema owns is filled, never the Erlang-B math reimplemented). M1 = a single Brindle dealer
    // per spot (customer loyalty / recruitment / fatigue / bust-compromise / lek competition / appointment dispatch
    // DEFERRED — YAGNI). R9.3: 09 = source of truth for dealer / product_storage / building_operational_state +
    // deal_leks (System 11) + safehouses (System 9) (this READS + mutates per the 0013/0017 grants; no schema change).
    SellingModule,
    // Phase 2 — OPERATIONAL Stage-1 laundering slice (Task 6). The player INJECT action (LaunderingService.inject —
    // drain cash from a safehouse into a player-owned operational front-shop's Stage-1 laundering node buffer,
    // guarded/atomic; refused 409 on insufficient safehouse cash or node at capacity) + the LAUNDER-OUTPUT TICK-HOOK
    // (LaunderingOutputService registers at slot {MINUTE/11 LAUNDER_OUTPUT}, after DEALER_SELL/10, REPLACING the no-op
    // placeholder — each in-game minute it releases the laundered cash of every Stage-1 node whose cleanliness reached
    // the clean band into economy_states.cash_cents minus the modest dwell-tax cut laundering.dwell_tax_rate=0.10
    // [[PROV-Y26Q2]] and zeroes tail_risk_estimates.current_occupancy (buffer_load re-syncs to 0 on System 10's next
    // tick), in batched set-based SQL; the operational tick-hook pattern shared with T1–T5) + the qualitative
    // projection (GET /v1/operational/laundering/:nodeId — cleanliness band DIRTY/PARTIAL/MOSTLY_CLEAN/CLEAN +
    // deviation flag AUDIT_PIN_ACTIVE, R2.2 no raw buffer/cleanliness/cents/sigma).
    // CONSUMES System 8 (cleanliness_at_output READ — the [0,1] float recomputed at MINUTE/2, never recomputes Little's
    // Law) + System 9 (the safehouse percent slot model is drained, never the Erlang-B math reimplemented) + System 7
    // (an inject over laundering.front_shop_legit_baseline_cents=250000 [[PROV-Y26Q2]] writes a deviation-bearing
    // front-shop transaction_profile — the input System 7's NIGHTLY tick already scores → audit pin; the deviation
    // DECISION stays System 7's). M1 = Stage 1 only (Stages 2-4 / parallel pipelines / standing-transfer DSL DEFERRED —
    // YAGNI). R9.3: 09 = source of truth for laundering_nodes (System 8) / safehouses (System 9) / economy_states /
    // buildings (this READS + mutates per the 0013 grants; no schema change — only the LAUNDER_OUTPUT scheduler slot, code).
    LaunderingModule,
    // Phase 2 — OPERATIONAL heat-contribution coupling (Task 7). The ONE producer turning operational activity into
    // HeatInjectionEvents on the canonical CityEventBus seam: cook completion (COOK_ADVANCE/8 → MICRO on the LAB) +
    // per-deal (DEALER_SELL/10 → LOW on the dealer-spot) point-emissions + a per-tick storage contribution (registers
    // the MINUTE/12 OPERATIONAL_HEAT_CONTRIB slot → MICRO per product-holding building). System Heat (MINUTE/4) buffers
    // + flushes them onto buildings.heat — this module WRITES NO heat (R9.3 — consume the Phase-1 Heat engine, never
    // reimplement decay/propagation/escalation). NO new scalar + NO new endpoint: heat is surfaced ONLY via the
    // existing Heat projection GET /v1/city/district/:id/heat (R2.2). Magnitude bands = NEW M1 tunables
    // operational.heat.* ([PROV-Y26Q2], FLAG VETO). Imported by ProductionModule + SellingModule for the point-emits;
    // listed here so its storage-tick registration bootstraps. R9.3: 09 = source of truth; READS buildings / blocks /
    // product_storage, no schema change (only the OPERATIONAL_HEAT_CONTRIB scheduler slot, code).
    HeatContribModule,
    // Phase 2b Task 1: Operational chain — police-risk ENFORCEMENT slice (consequence vector #1: building raid).
    // RaidExecutionService is an ADDITIVE, LISTENER-ISOLATED CONSUMER of the existing RaidPlannedEvent (emitted by
    // System 4 Patrol Doctrine at the 12h precinct review — Phase 1); it never reimplements raid-decision logic. It
    // SUBSCRIBES on the CityEventBus and BUFFERS each raid synchronously (no per-event DB write — the Heat buffer/flush
    // discipline), then on its registered slot {MINUTE/13 RAID_EXECUTION} (REPLACING the no-op placeholder, after
    // OPERATIONAL_HEAT_CONTRIB/12) DRAINS the buffer + executes the seizures SET-BASED in a transaction: for the
    // player's operational product-holding buildings (lab/stash) on each raided block, seizes product_storage (×(1 -
    // operational.raid.seizure_fraction), default 1.0 → 0), transitions structural_state → 'damaged', and inserts a
    // building_raid ledger row (grams_seized BO-only, R2.2). A raid on a block with no product-holder = dry raid (no-op
    // total). The building-card projection (GET /v1/operational/building/:id) gains the structural_state band +
    // recently_raided flag + seized_amount BAND (RealEstateProjectionService — never raw grams, R2.2). The repair
    // action (T3) + the telegraphed raid-risk band (T4) land in later tasks. R9.3: 09 = source of truth for
    // building_operational_state / product_storage / building_raid (this READS + mutates per the 0017/0018 grants; no
    // schema change — T0 landed the schema). Listed here so its bus subscription + MINUTE/13 registration bootstrap.
    EnforcementModule,
    // Phase 2b vector #2 (substances/Crick) Task 5: Operational chain — COLD-CHAIN slice. ColdChainDegradeService is an
    // operational tick-hook registered at the slot {MINUTE/15 COLD_CHAIN_DEGRADE} (REPLACING the no-op placeholder,
    // after OPERATIONAL_REPAIR/14) — each in-game minute it degrades the player's WARM cold-chain product set-based: a
    // STORED Crick holding (coldChain=true — registry) in a building that is NOT cold_storage_capable loses the MODERATE
    // per-tick grams rate; an IN-TRANSIT Crick cargo on a courier that is NOT a refrigerated_van loses the HOT per-tick
    // grams rate (both GUARDED ≥ 0 — greatest(qty - rate, 0)). Cold holdings (a refinery / cold-opted stash) +
    // refrigerated_van cargo are preserved; Brindle (coldChain=false) is NEVER selected. The grams rates are M1
    // groundings of the canon %/game-day degradation (gdd/14 coldchain.crick.degrade_grams_per_tick_{moderate,hot},
    // [PROV-Y26Q2] — the flat-per-tick-grams is an HONEST approximation of the proportional %/day; precise proportional
    // accumulation DEFERRED — no per-row anchor this slice). ColdChainService DERIVES the read-time temperature_status
    // band (OPTIMAL_COLD/MODERATE/HOT — R2.2, no raw °C) the production-storage + distribution-transit projections
    // surface (+ a degrading flag). R9.3: 09 = source of truth for product_storage / courier_shift / building_operational
    // _state / courier (this READS + mutates per the 0017/0019/0020 grants; NO schema change — T0/T4 landed every column).
    // Listed here so its MINUTE/15 registration bootstraps + the projections can inject the derivation service.
    ColdChainModule,
    // Phase 2b vector #2b (substances/Hush) Task 5: Operational chain — HUSH ADDICTION-LOYALTY slice (the distinct Hush
    // trait). HushAddictionAdvanceService is an operational tick-hook registered at the slot {MINUTE/16 HUSH_ADDICTION}
    // (REPLACING the no-op placeholder, after COLD_CHAIN_DEGRADE/15) — each in-game minute it ages the player's Hush
    // dealer-spot loyalty (hush_addiction, addiction=true) in TWO DISJOINT set-based UPDATEs: an un-served SUB-DEPENDENT
    // spot DECAYS toward NEW by production.hush.addiction_loyalty_decay_per_tick (GUARDED ≥ 0); a DEPENDENT spot gone
    // dry past substance.hush.withdrawal_period_ticks WITHDRAWS (collapse to addiction_loyalty_established_score−1 +
    // withdrawn=true, the boost lost). The selling tick (DEALER_SELL/10, SellingSellService) is now addiction-aware: a
    // Hush dealer-spot sells grams_sold = min(rate × loyalty_boost_multiplier-when-DEPENDENT, available) and
    // accumulates +addiction_loyalty_increment_per_deal on the spot's hush_addiction row (lazy upsert). The dealer
    // projection (GET /v1/operational/dealer/:id) surfaces a Hush spot's addiction_loyalty_status LOW/STABLE/HIGH +
    // withdrawn (HushAddictionService bands — R2.2, never the raw score/cut-points). Brindle/Crick (addiction=false) get
    // NO addiction row, the BASE rate, addiction_loyalty_status=null (behavior-preserving — gated on
    // descriptor.addiction===true). The five production.hush.* keys + the boost are gdd/14 mirrors ([PROV-Y26Q2], T0);
    // withdrawal_period_ticks REUSES the pre-existing substance.hush.* key. R9.3: 09 = source of truth for
    // hush_addiction (this READS + mutates per the 0021 grant; NO schema change — T0 landed the table + grant). Listed
    // here so its MINUTE/16 registration bootstraps + SellingModule can inject the service + repository.
    HushModule,
    // Phase-2c vector #2c (Ash — luxury channel) appointment slice: POST /v1/operational/appointment (book at a
    // player-owned Glass-district venue → SCHEDULED) + GET /v1/operational/appointment/:id (the qualitative status band)
    // + the APPOINTMENT_EXPIRE tick-hook (MINUTE/17, after HUSH_ADDICTION/16 — flips a SCHEDULED booking past its window
    // to EXPIRED, ONE set-based UPDATE). The Glass-venue gate joins buildings → blocks → districts.profile='glass' (the
    // real geography model); 404 not-owned / 422 not-a-glass-venue. R9.3: 09 = source of truth for ash_appointment (this
    // READS + mutates per the 0022 grant; NO schema change — T0 landed the table + the (status, expires_at_tick) index +
    // the grant). Listed here so its MINUTE/17 registration bootstraps + the controller routes mount. AshModule also
    // EXPORTS AshPurityService (the cook-advance stamp, T6) — ProductionModule already imports AshModule for that.
    AshModule,
    // Phase-3 vector #3 (grow_house) — the in-house precursor-cultivation slice. T2 ships the PLANT action (POST
    // /v1/operational/grow-house/:id/plant): validate the player-owned grow_house + a GROWABLE plant-derived precursor +
    // no active grow on this building → atomic guarded seed-cost debit (grow.seed_cost_ratio × the $15000 conversion
    // reference, deliberately << the order cost — the make-vs-buy saving) → INSERT a stage_1 grow_session. R9.3: 09 =
    // source of truth for grow_session (this READS + INSERTs per the 0023 grant; NO schema change — T0 landed the table +
    // indexes + the grant). Listed here so the PLANT controller route mounts. The grow cycle tick (T3, GROW_ADVANCE
    // MINUTE/18), tend (T4), harvest/yield (T5), heat + raid (T6) and the band projections (T7) extend GrowModule.
    GrowModule,
    // Phase-5 vector #5a (money_holding) — the clean-cash holding vault slice (Stage-4 GDD entity). T2 ships the
    // TIER-UPGRADE action (POST /v1/operational/building/:id/upgrade-money-holding-tier): validate the player-owned
    // money_holding + money_holding_tier < money_holding.max_tier → atomic guarded cash debit (money_holding.
    // upgrade_cost_ratio.<targetTier> × the $15000 conversion reference) → money_holding_tier++ in one tx. The
    // BYTE-MIRROR of the distribution_hub upgrade-hub-tier action, here in its OWN module for cohesion. Listed here so
    // the upgrade controller route mounts. R9.3: 09 = source of truth for money_holding (this READS + UPDATEs per the
    // 0025 grant; NO schema change — T0 landed the table + the tunables). Deposit/withdraw (T3), yield (T4), forfeiture
    // (T5b) and the band projections (T6) extend MoneyHoldingModule.
    MoneyHoldingModule,
    // D1b C1 — MarketModule: the §2 market mechanics module (04c). Wires MarketProjectionService (the R2.2
    // banded-projection filter — the P5 wall for all 4 mechanics: lane_confidence_bucket / q_inferred_bucket /
    // realised_price_multiplier_bucket / lambda_bucket) + MarketRngService (deterministic day/tick-seeded RNG, C4).
    // C1 = greenfield scaffold only — no mechanic logic, no tick hooks, no DB schema. The 4 mechanic services
    // (LaneCollapsePricingService / CompositionTelegraphService / WearMarkPremiumService / CarryingCapacityHazeService)
    // + the BO endpoints + the selling integration land in C2–C7. MarketTestController (test-only probe routes
    // /v1/_test/market/projection-probe + /rng-probe) is mounted ONLY when NODE_ENV !== 'production' (R-EC-2).
    // EXPORTS: MarketProjectionService + MarketRngService (consumed by C2–C7).
    // R9.3: no schema change in C1 (the 3 NEW market entities land in C2/C3/C5). gdd/14 market.* REUSE by reference.
    MarketModule,
    // D1c B1 — PrecursorMarketModule: the precursor buy-market mechanics module (04a §Dynamique de prix des précurseurs).
    // B1 = greenfield scaffold — wires PrecursorMarketStateService (R2.2 projection scaffold + registry-getter wiring) +
    // SupplierPressureService (observable-only empty shell, B5 fills) + PrecursorMarketTestController (test-only probe
    // routes /v1/_test/precursor-market/projection-probe + /rng-probe, R-EC-2). DD-REG REUSE: imports MarketModule for
    // MarketRngService (C4 determinism) + MarketProjectionService (R2.2 P5 wall) — NOT re-hosted. The 8 NEW precursor
    // market tunables (precursors.market_trend_multiplier_* / supply_disruption_scarcity_multiplier /
    // demand_trend_*_threshold / demand_accumulator_*) added registry-FIRST to gdd/14. No tick, no DB schema in B1.
    // EXPORTS: PrecursorMarketStateService + SupplierPressureService (consumed by B3+ + selling/BO integration).
    PrecursorMarketModule,
    // D2 R0 — ReputationModule: the §3 reputation mechanics module (04c). R0 = EMPTY SCAFFOLD — providers [],
    // no mechanic, no entity, no tick. Only the ReputationTestController (test-only ping probe
    // /v1/_test/reputation/ping, R-EC-2) is conditionally mounted to prove module wiring. The 5 canon services
    // (BossMirrorService, RestraintIndexService, LekMemoryService, HiddenCurriculumService,
    // ForbiddenTriadDetectionService) + 6 NEW persistence entities + deep integration into police_memory /
    // inspection / lieutenant / deal_lek land in R1–R12. R9.3: no schema change at R0 (D2 migrations start at 0045).
    // gdd/14 reputation.* REUSE by reference (20 existing registry rows + forbidden_triad_n_strong_cap registry-add at R8a/R13).
    ReputationModule,
    // Insurance Tranche B C0 — InsuranceModule: the §4.1 insurance mechanics module (04c). C0 = EMPTY SCAFFOLD —
    // providers [], no mechanic, no entity, no tick. Only InsuranceTestController (test-only tunables-probe
    // /v1/_test/insurance/tunables-probe, R-EC-2) is conditionally mounted to prove module wiring + the 5 §4.1
    // canon tunables resolve. IMPORTS MarketModule (REUSE MarketRngService.seedFromDay — C4, NO Math.random) +
    // SchedulerModule (REUSE CitySimSchedulerService — C7/C8 producer registration). C1+ fill providers with
    // 4 entities (mig 0059-0062) + services + 2 producers. Zero-regression invariant (§0.2): purely additive.
    InsuranceModule,
    // Forensic Signaling C0 — ForensicSignalingModule: the §5 forensic signaling mechanics module (04c). C0 = EMPTY
    // SCAFFOLD — providers [], no mechanic, no entity, no tick. The DI plumbing is wired (SchedulerModule for
    // CitySimSchedulerService + CityEventBus; InspectionQueueModule for applyQueues; PoliceMemoryModule for
    // appendDeclarationEntry; MarketModule for seedFromDay determinism — no Math.random). C1+ fill providers
    // with the 6 schema tables (mig 0071-0074) + 5 services + 2 scheduler slots + dispatcher subscriber.
    // Zero-regression invariant (§1.3): purely additive — no rings / no workshops / no tracked lieutenants → inert.
    ForensicSignalingModule,
    // 04d-A C0 — LawyerModule: the §2 Lawyer & Legal System mechanics module (04d-A). C0 = EMPTY SCAFFOLD —
    // providers [LawyerService stub], no mechanic, no entity, no tick. Only LegalTestController (test-only ping
    // probe /v1/_test/legal/ping, R-EC-2) is conditionally mounted to prove module wiring. The DI seams are
    // anchored: SchedulerModule (C6 LEGAL_LEAK_TICK MINUTE + NIGHTLY sweep), PoliceMemoryModule (C6-C7
    // appendDeclarationEntry info-leak drip + conviction final-dump), MarketModule (C3/C6 seedFromDay — NO
    // Math.random). C1+ fill providers: 4 pgEnums + lawyers + legal_cases (mig 0097) + ALTER caught_exception
    // legal_case_id (mig 0098) + LegalCaseService + LawyerService + InfoLeakService + LawyerLegalTickService
    // + LegalProjectionService + LegalAdminController. The LAWYER_UP re-wire (decision #3 2026-06-30) lands
    // at C4 as the ONLY scoped mutation of an existing path; all other chunks are purely additive.
    // Zero-regression invariant: no existing table/service/tick/path touched at C0.
    LawyerModule,
    // 04d-B C0 — InternalAffairsModule: the §3 Internal Affairs / Corruption Discovery mechanics module (04d-B).
    // C0 = EMPTY SCAFFOLD — providers [IATargetService stub], no schema, no migration, no tick. Only
    // IATestController (test-only ping probe /v1/_test/ia/ping, R-EC-2) is conditionally mounted to prove
    // module wiring. DI seams anchored: SchedulerModule (C4 IA_THRESHOLD_TICK NIGHTLY + C6 IA_DECAY_TICK WEEKLY),
    // PoliceMemoryModule (C5 appendDeclarationEntry forward-cascade exposure), MarketModule (seeded RNG — no
    // Math.random), LawyerModule (§13: LawyerService recordTier3Use/forceBurnLawyer + LegalProjectionService
    // getBurnRiskBand), ReputationModule (player-profile weight, C3 3-factor accrual). C1+ fill: mig 0099-0101
    // (internal_affairs_targets + ia_investigations + ia_intel_purchases + 4 enums) + 8 services + 2 scheduler
    // slots + 5 BO endpoints. Backward cascade DEFERRED (decision #1, no live multi-cooperator consumer). The
    // ONLY live target type is `lawyer`; clerk/port_inspector/broker/judge_aide are enum-reserved + inert (TD).
    // Zero-regression invariant: no existing table/service/tick/path touched at C0.
    InternalAffairsModule,
    // Phase-6 vector #6 (lieutenants + behavior-script DSL, slice 1) Task 1: the archetype-agnostic DSL engine module.
    // Slice-1 T1 ships ONLY the parser stage (DslParserService: player-authored DSL source → a tier-tagged
    // BehaviorScriptAst, per 07/behavior_script_dsl.md §Grammar EBNF — the full Tier-1 grammar parsed; Tier ≥ 2 constructs
    // RECOGNIZED + tagged so the compiler T2 can reject them, never silently dropped). PURE (no DB / I/O / RNG / eval), so
    // the module has no imports. The compiler (T2 DslCompilerService) + the sandboxed executor (T3 DslExecutorService)
    // join THIS module later; the lieutenant/ module (T4) imports it to parse/compile an attached behavior script. No
    // schema, no endpoint, no tick here — organically inert until a consumer wires it (the no-regression guarantee).
    DslModule,
    // Phase-6 vector #6 (lieutenants + behavior-script DSL, slice 1) Task 4: the lieutenant entity module (recruit /
    // attach-script / validate). POST /v1/lieutenants recruits a COOK lieutenant (granted_role=executor, mode=delegated)
    // on a player-owned operational lab, capped by T.lieutenant.max_count_per_player (409 over cap; 404 not-owned/not-
    // operational; 409 wrong host type; 422 a non-COOK archetype). POST /v1/lieutenants/:id/behavior-script attaches a
    // player-authored DSL source (DslParserService.parse → DslCompilerService.compile → store source + compiled IR +
    // valid; 422 + diagnostics on an invalid DSL — NO store). POST .../validate is the dry-run (same verdicts, no store).
    // Imports DslModule (the parse/compile engine — the executor T3 is NOT called here) + AuthModule. Idempotency via the
    // global interceptor. EXPORTS LieutenantService (T6's delegation tick consumes it). R9.3: 09 = source of truth for
    // lieutenant + behavior_script (this READS + mutates per the 0013 grant; NO schema change — T0 landed the subset,
    // migration 0026). The COOK binding (T5), the LIEUTENANT_TICK delegation tick (T6) + the band projection (T7) extend it.
    LieutenantModule,
    // economy wallet-band projection (GET /v1/economy/wallet). The player-facing read surface for the M1 dashboard
    // screen_1 "encaisser" payoff: maps economy_states.cash_cents → a qualitative wallet_band BROKE/LOW/MODERATE/HIGH/
    // FLUSH (R2.2 — never the raw cents; the projection is the only raw→band mapper). JWT-gated (GAME_BACK), resolves
    // account → player via the same 1-1 bridge the operational controllers use. R9.3: 09 = source of truth for
    // economy_states (this READS the schema, no schema change; app_rw has SELECT per 0013).
    EconomyModule,
    // Phase-14 Exception Queue module (T1 skeleton): the Exception Queue primary verb (lieutenant raises an Exception
    // card; the player lists it and resolves it via ONE_TIME / ESCALATE / ADD_RULE). T1 = repository skeleton only
    // (the projection/producer/service/controller come in T2-T4). No migration (table + enum exist from migration 0007).
    // R9.3: 09 = source of truth for exception_queue (this READS + mutates per the 0007 grants; no schema change).
    ExceptionsModule,
    // Phase-17 Progression module: the DSL vocabulary-tier progression subsystem. Owns the only writer of
    // rule_vocabulary_tier. Provides ProgressionService (the dual-gate Tier 1→2 writer) + ProgressionRepository
    // (reads/writes player_progression_state, counts exception_queue). Migration 0030 adds taught_signals.
    ProgressionModule,
    // 04b-A Rival AI Foundation (C0 — DI-wiring shell; services + migrations land C1-C9).
    // GREENFIELD additive module: no existing table/service/tick mutated. The conflict layer is new.
    // Imports SchedulerModule (CitySimSchedulerService + CityEventBus) — the C3/C4 registration seam.
    // No slow-tick registered yet (C3 registers RIVAL_REGIME_TICK + RIVAL_DAILY_TICK; C4 registers
    // RIVAL_SATURATION_TICK + RIVAL_DECISION_TICK). Empty-state L1 skip ensures byte-identical no-op
    // for any pre-A world. Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md.
    RivalAiModule,
    // 04b-B Combat & Escalation (C0 — DI-wiring shell; services + migrations land C1-C-cls).
    // GREENFIELD additive module: no existing table/service/tick mutated. Imports RivalAiModule
    // (A's §13 read/write API — B never reads rival_state directly) + SchedulerModule +
    // DistributionModule (Oxbow zones) + HeatContribModule (combat heat-producer) +
    // EnforcementModule (DIV-B2 raid seam) + ReputationModule (Cumulative Attrition READ).
    // No slow-tick registered yet (ESCALATION_TICK TWELVE_H / COMBAT_DAILY_TICK NIGHTLY /
    // DEAD_HAND_TICK modulo-8-HOURLY land at their respective chunks). Shell-only at C0.
    // Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md.
    CombatModule,
    // W6.1 C3 — EngagementsModule: the player-facing `POST /v1/me/engagements` commit route
    // (`EngagementsController`). A SIBLING module (not folded into CombatModule) — LieutenantModule
    // already imports CombatModule (for MuscleBindingService), so CombatModule importing
    // LieutenantModule back would be a 2-module cycle. Imports CombatModule (CombatService.
    // requestAssault, D5 REUSE) + LieutenantModule (LieutenantRepository — owned-lieutenant +
    // current-game-minute reads). Design: docs/superpowers/specs/2026-08-12-w6.1-combat-production-design.md §4 C3.
    EngagementsModule,
    // 04b-C Diplomacy & Information Warfare (C0 — DI-wiring shells; services + migrations land C1-C12).
    // GREENFIELD additive module: no existing table/service/tick mutated. Imports RivalAiModule
    // (A's §13 read/write API — C never reads rival_state directly) + CombatModule (B's §13.2
    // PRODUCES-for-C surface + the 3 forward slots) + SchedulerModule (INFO_LOOP_DAILY_TICK NIGHTLY
    // C9 registers) + PoliceMemoryModule (BPD seam READ + bounded WRITE — DIV-C3).
    // No service/table/migration/tunable/enum-member/archetype/DSL-action at C0 — shells only.
    // Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md.
    DiplomacyModule,
    // 04b-C InformationWarfareModule (C0 — DI-wiring shell, paired with DiplomacyModule).
    // Imports RivalAiModule (Pillar-5 wall: applyDisinformation lands iff intel_mode=PULL) +
    // CombatModule (B reads + degradeRegisterIntel forward slot C9 wires) + SchedulerModule
    // + PoliceMemoryModule (getPrecinctBeliefRaw READ for Dual-Use Signal Bayesian prior).
    // No service/table/migration/tunable/enum-member/archetype/DSL-action at C0 — shell only.
    InformationWarfareModule,
    // 04d-C C0 — MetaMarketModule: the §1 Async Meta-Market mechanics module (04d-C, G4).
    // C0 = EMPTY SCAFFOLD — providers [MetaMarketStubService (DI anchor)], no schema, no migration,
    // no tick. Only MetaMarketTestController (test-only ping probe /v1/_test/meta-market/ping,
    // R-EC-2) is conditionally mounted to prove module wiring. DI seams anchored:
    //   SchedulerModule (C5 META_MARKET_AGGREGATION_TICK HOURLY + META_MARKET_RETENTION_TICK NIGHTLY).
    // C1+ fill: MaxMindGeoIpService (geo-IP in-process, decision #1) + RegionService (IP→region,
    //   mig 0102) + MetaMarketRepository + 3 schema tables (mig 0103-0104) + MetaMarketTunables
    //   (9 canon meta_market.* keys) + MetaMarketContributionService (additive sell-path emit,
    //   decision #2) + MetaMarketHashService (HMAC-SHA256) + aggregation/retention/read/anti-cheat
    //   services + 5 BO endpoints (MetaMarketAdminController, C8). CLOSES ch04d (G4+G5+G9 shipped).
    // Zero-regression invariant: no existing table/service/tick/path touched at C0.
    MetaMarketModule,
    // 04e-A1 C0 — EffectEngineModule: the shared, revert-guaranteed effect-modifier engine (the
    // structural foundation for both G7 political events, this lot, and G8 live-ops, 04e-B).
    // C0 = EMPTY SCAFFOLD — providers [EffectModifierService (DI anchor, injects DB + scheduler)],
    // no schema, no migration, no tick. Only EffectEngineTestController (test-only ping probe
    // /v1/_test/effect-engine/ping, R-EC-2) is conditionally mounted to prove module wiring. DI seams
    // anchored: SchedulerModule (CitySimSchedulerService — the political NIGHTLY tick registers at A2;
    // the 4 substrate ticks register at C6-C9). C1+ fill: effect-engine.tunables.ts + effect_modifier/
    // political_event_active schema (mig 0106) + EffectOverlayStore (config singleton) +
    // EffectModifierService.applyEvent/revertEvent/revertExpired (SERIALIZABLE + pg_notify) + the 9
    // lever getters' overlay wiring + the 4 substrate builds.
    // Zero-regression invariant: no existing table/service/tick/path touched at C0.
    EffectEngineModule,
    // 04e-A2 C0 — PoliticalModule: the 12-event political catalogue (G7), the 2nd part of sub-lot 04e-A
    // (A1 → A2), wired to FIRE through the A1 EffectModifierService/EffectOverlayStore engine.
    // C0 = EMPTY SCAFFOLD — providers [PoliticalEventService (DI anchor, injects EffectModifierService +
    // scheduler + DB)], no schema, no migration, no tick. Only PoliticalTestController (test-only ping
    // probe /v1/_test/political/ping, R-EC-2) is conditionally mounted to prove module wiring. DI seams
    // anchored: EffectEngineModule (now EXPORTS EffectModifierService, a C0 additive fix — A1 left it
    // empty) + SchedulerModule (the political calendar NIGHTLY tick registers at C2 — the plan's assumed
    // NIGHTLY/19 slot is no longer free, re-anchor finding, C2 re-confirms). C1+ fill: 12-event static
    // catalogue + template_id binding + NEW [PROV-Y26Q2] A2 tunables + calendar/trigger/lifecycle
    // services + political_calendar_state/rival_elimination_ledger/political_district_signal_state
    // schema (migs 0111-0113) + read-only R2.2 calendar API + 5 BO endpoints.
    // Zero-regression invariant: no existing table/service/tick/path touched at C0 (the ONE additive
    // touch to A1 code is config/effect-overlay-store.ts's F2-RACE token guard + reloadNow(), byte-
    // identical for the empty-overlay path, + effect-engine.module.ts's exports fix, above).
    PoliticalModule,
    // 04e-B C0 — LiveOpsModule: the 10-event live-ops catalogue (G8), 2nd sub-lot of chapter 04e
    // (A -> B -> C), wired to FIRE through the SAME A1 EffectModifierService/EffectOverlayStore engine
    // A2 already reuses -- this time as PLAYER-scoped overlays (D1, the first real per-player A1
    // consumer). A/B/C boundary: B = engine + 10 static events + thin ops-BO; the composer wizard /
    // push composer / two-person integration is 04e-C (docs/tech/12_backoffice_admin/
    // liveops_events_and_push.md:6 pins the engine contract as REUSE for that BO chunk; decisions doc §8).
    // C0 = EMPTY SCAFFOLD -- providers [LiveOpsEventService (DI anchor, injects EffectModifierService +
    // scheduler + DB), LIVE_OPS_CLOCK (LiveOpsClockPort seam, DD-B3, no consumer yet)], no schema, no
    // migration, no tick. Only LiveOpsTestController (test-only ping probe /v1/_test/liveops/ping,
    // R-EC-2) is conditionally mounted to prove module wiring. DI seams anchored: EffectEngineModule
    // (already EXPORTS EffectModifierService since 04e-A2 C0) + SchedulerModule (DI-graph anchor; DD-B3's
    // real-time reconciler is a SEPARATE loop, not a registerSystem cadence -- see C4). C1+ fill: 10-event
    // static catalogue + template_id binding + 29 NEW [PROV-Y26Q2] liveops.* tunables +
    // targeting/lifecycle/cadence/notification services + live_ops_event_active/
    // live_ops_aggression_ledger/live_ops_notification schema (migs 0114-0116) + the DD-B2 effect_modifier
    // dual-FK generalization + read-only R2.2 surface + 5 BO endpoints.
    // Zero-regression invariant: no existing table/service/tick/path touched at C0 (no A1/A2 code is
    // touched at all this chunk -- the EffectEngineModule export this module relies on already exists).
    LiveOpsModule,
    // 04f-A C1 (Building Maintenance & Decay, G10+G20+G26) — data-model + tunables foundation. C1 = pure
    // DI shell (MaintenanceTestController read-tunables probe only, R-EC-2); C2+ fill in the phase
    // engine/rolls/pricing/exception-card/heat-pin couples/Facility-manager DSL/BO surface.
    MaintenanceModule,
    // 04f-B C1 (Lieutenant Recruitment Quests, G11) — data-model + tunables foundation. C1 = pure DI shell
    // (RecruitmentTestController read-tunables probe only, R-EC-2); C2+ fill in the quest machine/mapper/
    // availability tick/defector+civilian depth/BO surface/F4 profiler. Mig 0124 (renumbered from 0120 at
    // the P3-A+P3-B integration — see migrations/0124_recruitment_quests.sql's header).
    RecruitmentModule,
    // P3-A C1 — CoreLoopsModule: 1st sub-lot of ch05 Session Spine + Exception-Queue completion +
    // Loop 10 governor + HighestLeverageCard (design docs/superpowers/specs/2026-07-10-
    // p3-A-session-spine-design.md). C1 = tunables-only shell (DD-P2 note in core-loops.module.ts's
    // own header — the coder-realized cross-cutting home for `core-loops-*` artifacts; `session/` and
    // `progression/loop10/` land C2/C5 as their own modules per DD-P2). ONLY CoreLoopsTestController
    // (test-only ping + read-tunables probe, R-EC-2) is conditionally mounted at C1 to prove the
    // `core-loops-tunables.ts` registry resolves for real inside the booted app. No schema/service
    // touches any existing module — append-only import (D3 collision wall / zero-regression).
    CoreLoopsModule,
    // P3-A C2 — SessionModule: activates the dormant `gameplay_sessions` table (D1/D2/D10, DD-P2 §2.2
    // ratified home `src/session/`). Player-facing POST /v1/session/open + /close (idempotent) +
    // SESSION_SWEEP HOURLY/5 (stale-close) + the counter-increment seam ExceptionsModule now imports
    // (D2, additive). No existing table/service/tick/path touched — append-only import.
    SessionModule,
    // P3-B C2 — FlagDisciplineModule: the ch05 Loop 2 token & flag state machine (D2/D3/D10, DD-P2 leaf
    // module — imports Lieutenant/Exceptions/Session/Scheduler; nothing imports it back except
    // CoreLoopsModule, for its `_test` routes). Player endpoints POST /v1/flag-review/:flagId/
    // validate|dismiss. No existing table/service/tick/path touched — append-only import.
    FlagDisciplineModule,
    // P3-D C2 — CueStackModule: the ch05 Loop 6 Cue Stack lifecycle (compose/reorder/commit + GET
    // current, buckets-only). Activates the dormant `cue_stacks` table (C1, mig 0129) with its first
    // writers. Player endpoints POST /v1/cue-stack/{compose,reorder,commit} + GET /v1/cue-stack/current.
    // No existing table/service/tick/path touched — append-only import.
    CueStackModule,
    // P3-D C6 — AnnealingModule: the ch05 Loop 7 Annealing Window (settling per-BUILDING, D8 coexist-
    // disjoint with Phase-11's own per-lieutenant settling — zero column/assertion touched there).
    // Subscribes to the 5 NEW additive bus events (route_created/route_rebuilt/lieutenant_reassigned/
    // hire_completed/script_attached) emitted from route/lieutenant/recruitment's OWN verb sites (ADDITIVE
    // one-line emits — no existing behavior touched). ANNEALING_SETTLE_SWEEP MINUTE/30 real-clock GLOBAL
    // sweep (I6). No existing table/service/tick/path touched — append-only import.
    AnnealingModule,
    // 04g-A C1 — AmbientModule: the Constant Hum substrate (G-loved keystone). C1 = the 168-cell weekly
    // heat grid (ConstantHumService/Repository, migration 0125, CONSTANT_HUM_CELL_TICK HOURLY/6). C2+
    // fill in the micro-event stream/attend loop/Off-Hours Drift detector/BO surface. No existing
    // table/service/tick/path touched — append-only import.
    AmbientModule,
    // 04g-B C1 — RandomWorldModule: the RANDOM-WORLD runtime (G24, keystone ❤️ Sideways Failure).
    // C1 = empty DI scaffold (registry-first tunables + 14-template registry + pure RecoveryCurve
    // functions are plain TS, not Nest providers) + migration 0128 (3 tables + additive 3rd-parent
    // effect_modifier surgery, DD-RW1) + 3 new EffectModifierService siblings (in EffectEngineModule,
    // untouched here). C2+ fill in the generator/repository/controllers. No existing table/service/
    // tick/path touched — append-only import.
    RandomWorldModule,
    // 04g-C C1 — NewsBeatModule: the News-beat runtime (G23, Brennar Daily). C1 = data foundation ONLY —
    // migration 0130 (3 tables + 2 pgEnums, schema-only, zero consumer yet) + the 12-template registry +
    // the press substrate (3 outlets + 6 journalists, plain TS, not Nest providers) + registry-first
    // tunables + the ONE real provider this chunk ships: NewsBeatBootGuardService (onModuleInit
    // keystone-probability mutex boot guard). C2+ fill in the tick/generator/fodder-reader/projection/BO.
    // No existing table/service/tick/path touched — append-only import.
    NewsBeatModule,
    // P3-E C2 — DemolitionModule: the ch05 Loop 8 Demolition Mandate friction engine (design §4). 1-1
    // per-player `friction_budget_state` cache (activated at C1, mig 0132) + `FRICTION_BUDGET_TICK`
    // NIGHTLY/31 (lazy-stamp D20 -> refresh cache I4 -> penalty apply/revert I4) + spine card
    // (`FrictionThresholdExceptionProducer`, source tag `FRICTION_THRESHOLD`, dedup 1-pending/player).
    // Standalone leaf module (mirrors SupplyChainModule/CueStackModule) — no existing table/service/
    // tick/path touched, append-only import. C3 (output-site teeth)/C4 (decommission)/C5 (replacement
    // options)/C8 (BO panel) extend this SAME module.
    DemolitionModule,
    // P3-E C6 — CompressionModule: the ch05 Loop 9 Compression Week runtime (design §8/§9). Session-close
    // stress subscriber (`CompressionStressSubscriber`, D5 — subscribes the EXISTING `SessionClosedEvent`,
    // ZERO new emit) + `COMPRESSION_QUIET_DECAY_TICK` WEEKLY/14 (§8.3) + `POST /v1/compression/defer` (I6).
    // Imports DemolitionModule ONE-WAY (`FrictionBudgetRepository` EXPORT — the friction-penalty §8.2
    // source). Standalone leaf module (mirrors DemolitionModule itself) — no existing table/service/tick/
    // path touched beyond the additive `SessionClosedEvent` subscribe, append-only import. C7 (board)
    // extends this SAME module.
    CompressionModule,
    // 04g-D C1 — TemplateLibraryModule: the Template meta-layer + library (DERNIER sous-lot du chapitre
    // 04g). C1 = foundation only — migration 0131 (`event_reskin` table + 2 pgEnums, schema-only, zero
    // consumer yet) + the 6 registries unified under `TemplateCategory` (4 NEW + 2 REUSE adapters
    // importing `NewsBeatModule`'s/`RandomWorldModule`'s own registries directly, zero copy) + registry-
    // first tunables (16 getters) + `TemplateLibraryService` (`OnApplicationBootstrap` boot assertions
    // §3.7.1-2) + 3 BO GET endpoints (`summary`/`library`/`health`). C2+ fill in the mapping registry/
    // opportunity backlog/validators/composer/mount adapter/BO Vue. No existing table/service/tick/path
    // touched — append-only import.
    TemplateLibraryModule,
    // P3-F C1 — DelegationRatchetModule: the ch06 MÈRE (Delegation Ratchet — Graduated Retirement /
    // Promotion Lock / Recall Debt) runtime home. C1 = scaffold only — mig 0135 (3 NEW tables:
    // graduation_events append-only spine, promotion_locks, player_proficiency) + the 3 repositories
    // (DI-ready, zero methods — C2+ fills them in against their real call sites) + a test-only tunables
    // probe controller (11 `meta.*` getters, `meta-progression-tunables.ts`). Standalone leaf module
    // (mirrors DemolitionModule/CompressionModule/CueStackModule) — nothing imports it back yet. `mastery_
    // score`/`player_progression_state` (ch09 mig 0002) are ACTIVATED by this lot, zero column touched.
    DelegationRatchetModule,
    // P3-G C1 — BudgetsHorizonModule: the ch06 successor lot (Budgets & Horizon — Complexity Budget /
    // Possibility Horizon / Rule Vocabulary T3-T6 / Isostatic Debt) runtime home. C1 = scaffold only —
    // mig 0137 (2 NEW tables: capability_adoptions, capability_debts + the possibility_horizon_cards
    // extension) + the 2 repositories (DI-ready, zero methods — C2+ fills them in against their real
    // call sites) + a test-only tunables probe controller (8 NEW `meta.*` getters, extending the SHARED
    // `meta-progression-tunables.ts`, DD-G5). Standalone leaf module (mirrors DelegationRatchetModule/
    // DemolitionModule/CompressionModule/CueStackModule) — nothing imports it back yet, no edit to
    // `delegation-ratchet.module.ts` (DD-G1). `possibility_horizon_cards`/`player_progression_state.
    // {complexity_budget_cap,complexity_budget_used,rule_vocabulary_tier}` (ch09 mig 0002/0007) remain
    // DORMANT this chunk.
    BudgetsHorizonModule,
    // P3-H C1 — VerticalHorizonModule: the ch06 8th sub-lot (Vertical Horizon — Decision Horizon Lock /
    // Pressure Inverse / Benchmark Drift) runtime home. C1 = scaffold only — mig 0141 (5 NEW tables:
    // execution_plans, execution_cycle_slots, script_stability_counters, player_metric_benchmarks,
    // player_reanchor_quotas + 7 pgEnums + the player_progression_state pressure columns) + the 5
    // repositories (DI-ready, zero methods — C2+ fills them in against their real call sites) + a
    // test-only tunables probe controller (~13 NEW `meta.*` key families, extending the SHARED
    // `meta-progression-tunables.ts`, DD-H5). Standalone leaf module (mirrors BudgetsHorizonModule/
    // DelegationRatchetModule/DemolitionModule/CompressionModule/CueStackModule) — nothing imports it back
    // yet, no edit to `budgets-horizon.module.ts`/`delegation-ratchet.module.ts` (DD-H1). `decision_
    // horizon_tier` (ch09 mig 0002) and the NEW pressure columns remain DORMANT this chunk.
    VerticalHorizonModule,
    // W1.1-b C2 — OnboardingUiModule: the tutorial-overlay player routes (`/v1/ui/…`, design D5).
    // Standalone leaf module (mirrors BudgetsHorizonModule/VerticalHorizonModule) — `SessionModule`
    // does NOT import it and it does NOT import `SessionModule` (design D9 — the resolver/service
    // stay OFF the session/open cold-open path). `TutorialOverlayService` = EXACTLY the 2 canon
    // methods (`getTutorialState`/`markShown`, screen_c8:333); `tutorial_state`/`tutorials_opt_out`
    // (ch09 mig 0146, W1.1-b C1) are ACTIVATED by this module, zero column touched.
    OnboardingUiModule,
    // W1.3-C1 — IapModule: ch10 monetization (the catalogue — GET /v1/iap/catalogue, PATCH
    // /admin/iap/skus/:sku_id). Standalone leaf module (mirrors OnboardingUiModule/
    // VerticalHorizonModule) — nothing imports it back. Migration 0147 (iap_sku_override, the
    // catalogue's ONLY persisted half — A1 option (C); the 9 SKU definitions are code-owned +
    // boot-asserted, iap-sku-catalogue.ts). `iap_transactions`/`economy_states` (ch09 mig 0003)
    // stay untouched by C1 — C2+ activates them.
    IapModule,
  ],
  providers: [
    // IdempotencyInterceptor registered as APP_INTERCEPTOR so Nest DI injects the
    // @Global() DbModule REDIS provider (ioredis). It runs INNER of the
    // main.ts-bound EnvelopeInterceptor: it captures/replays the handler's raw
    // value (Redis hot-tier dedup, idempotency.md §Concurrence), then Envelope
    // wraps the result. Mutations only; GET/HEAD/PUT pass through.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
