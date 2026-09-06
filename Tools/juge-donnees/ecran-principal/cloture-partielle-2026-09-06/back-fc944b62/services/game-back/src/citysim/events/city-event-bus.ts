// IMPLEMENTS: docs/tech/04_city_simulation/composition_overview.md §Cross-cutting (CityEventBus —
//             "event bus in-process pour les messages inter-systèmes event-driven … les systèmes sont
//             loosely coupled via le bus — un système n'importe pas directement un autre système")
//             -- session:2026-06-02 (Phase 1 Task 2) --
//
// `CityEventBus` — the in-process, loosely-coupled message bus the 11 city-sim systems use to talk to one
// another WITHOUT importing each other. T2 (System 1 Flow Cells) is the FIRST producer: it emits a
// `FlowCellCongestedEvent` when a cell changes BackpressureBucket. The downstream CONSUMERS (System 11
// Deal Lek, System 2 Sparse Citizens, System 4 Patrol Doctrine — per system_1_flow_cells.md §Émission
// d'événements) land in later tasks; they will `subscribe(...)` here. This is a separate bus from the
// scheduler's INTERNAL EventEmitter (TickOverrunEvent) — that one is a perf/SLI signal, NOT a CityEvent.
//
// Day-1 the bus has exactly one producer (Flow Cells) and zero consumers — emitting onto a bus with no
// listeners is a no-op (the event is still the canonical seam T3/T4/T12 plug into). This is the template
// every later producer-system copies (define its event type here, emit via this bus).

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';

import type { SalientCardContent } from '../../operational/lieutenant/archetype-binding';

/** Closed qualitative domain for a cell's backpressure state (P5 — never the raw float ρ). */
export enum BackpressureBucket {
  NORMAL = 'NORMAL', // rho < 0.7
  CONGESTED = 'CONGESTED', // 0.7 <= rho < 0.9
  SATURATED = 'SATURATED', // rho >= 0.9
}

/**
 * Emitted by System 1 (Flow Cells) when a cell crosses a BackpressureBucket boundary on a 2 Hz tick
 * (system_1_flow_cells.md §Émission d'événements). Carries the qualitative bucket transition + the
 * block/player identity — NEVER the raw float ρ/λ/μ (those stay inside the engine; cross-system consumers
 * react to the bucket, not the scalar). Consumers (T3/T4/T12) subscribe via `CityEventBus.onFlowCellCongested`.
 */
export interface FlowCellCongestedEvent {
  readonly type: 'flow_cell_congested';
  readonly playerId: string;
  readonly blockId: number;
  readonly districtId: number;
  /** The bucket BEFORE this tick (the transition origin). */
  readonly from: BackpressureBucket;
  /** The bucket AFTER this tick (the transition target). */
  readonly to: BackpressureBucket;
  /** The in-game minute the transition happened on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by System 2 (Sparse Citizens) when a RichNPC's whisper_pressure crosses the activation threshold
 * (DORMANT → ACTIVE) on a 5-min RichNPC tick (system_2_sparse_citizens.md §Update tick step 7 + §Émission
 * d'événements). Carries the qualitative citizen identity (id/demographic/home block) — NEVER the raw float
 * whisper_pressure (that stays BO-only inside the engine; cross-system consumers react to the activation,
 * not the scalar). Consumers (System 3 Police Memory T4, System 6 Inspection Queue T7) subscribe via
 * `CityEventBus.onWhisperActivated`.
 */
export interface WhisperActivatedEvent {
  readonly type: 'whisper_activated';
  readonly playerId: string;
  readonly citizenId: string;
  /** The citizen's demographic cohort (the informant-prone cohorts WHISPER/CONNECTOR are likeliest). */
  readonly demographic: string;
  /** The citizen's home block (where the informant act surfaces) — an identity, not raw sim state. */
  readonly homeBlockId: number;
  /** The in-game minute the activation happened on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted at the 12-hour BPD precinct review (system_3_police_memory.md §Update tick Tick 3 step 4) when a
 * precinct decides to PLAN a raid on its softmax-selected top target. Carries the qualitative precinct +
 * district + target-block identity — NEVER the raw suspicion_map tile score / raid_temperature scalar (those
 * stay inside the engine; consumers react to the planned raid, not the belief float).
 *
 * OWNERSHIP (cross_system_interactions.md §Producteurs line 117: "System 4 — Patrol Doctrine | RaidPlannedEvent,
 * UndercoverDispatchedEvent"): `RaidPlannedEvent` is CANONICALLY produced by System 4 — Patrol Doctrine at the
 * 12h precinct review. T4 (System 3) was the day-1 STAND-IN producer (until System 4 landed); T5 lands System 4,
 * which now OWNS this emission — its 12h review consumes System 3's `getTopTargets()` output (the DAG dependency
 * System 3 → System 4, Inv 6 read-only) to confirm the softmax-selected target, then emits. System 3 no longer
 * emits cross-system events (cross_system_interactions L116: "System 3 ne produit pas d'events cross-system").
 * Consumers (System 9 ErlangStash drain order, System 3 post-raid memory update) subscribe via
 * `CityEventBus.onRaidPlanned`.
 */
export interface RaidPlannedEvent {
  readonly type: 'raid_planned';
  readonly playerId: string;
  readonly precinctId: number;
  /** The district the targeted block belongs to (the precinct owns this district). */
  readonly districtId: number;
  /** The softmax-selected raid-target block (the precinct's hottest belief tile maps to this block). */
  readonly targetBlockId: number;
  /** The in-game minute the precinct review planned the raid on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted at the 12-hour BPD precinct review (system_4_patrol_doctrine.md §Update tick Tick 2 phase B) when a
 * precinct decides to dispatch a plain-clothes undercover agent instead of a raid. Same qualitative-identity
 * discipline as RaidPlannedEvent (no raw belief scalar). CANONICALLY produced by System 4 — Patrol Doctrine
 * (cross_system_interactions.md §Producteurs line 117); T5 lands System 4 as the owner (System 3's T4 stand-in
 * emission is removed). Consumers (System 3 undercover feed → discreet suspicion_map updates) subscribe via
 * `CityEventBus.onUndercoverDispatched`.
 */
export interface UndercoverDispatchedEvent {
  readonly type: 'undercover_dispatched';
  readonly playerId: string;
  readonly precinctId: number;
  readonly districtId: number;
  readonly targetBlockId: number;
  readonly gameMinute: number;
}

/**
 * Emitted by System 4 (Patrol Doctrine) at the 30-min observation-accumulation tick when a HIGH-severity
 * patrol observation is recorded for a precinct (system_4_patrol_doctrine.md §Update tick Tick 1 step 4 +
 * cross_system_interactions.md §Ordre DAG [Every 30 minutes] line "(30 min) System 4 PatrolObservation →
 * System 3 suspicion_map update"). This is the System 3↔4 HANDOFF seam: System 4 OWNS the patrol-observation
 * channel; System 3 SUBSCRIBES and bumps the precinct's suspicion_map tile (a NEW suspicion SOURCE alongside
 * FlowCellCongested/WhisperActivated). Carries the qualitative precinct + observed-block identity + a closed
 * qualitative severity band — NEVER the raw ObservationQueue entries / cluster scores (those stay inside
 * System 4's engine; System 3 reacts to the observation severity band, not the raw queue).
 *
 * P5 discipline: `severity` is a CLOSED qualitative band (LOW/MEDIUM/HIGH), not the raw uint8 1..5 — the
 * cross-system seam exchanges qualitative bands, never the internal scalar (the same discipline as the
 * BackpressureBucket transition in FlowCellCongestedEvent).
 */
export type PatrolObservationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PatrolObservationEvent {
  readonly type: 'patrol_observation';
  readonly playerId: string;
  readonly precinctId: number;
  /** The district the observed block belongs to (the precinct owns this district). */
  readonly districtId: number;
  /** The block the patrol observed (maps to a suspicion_map tile in System 3 — the lossy belief unit). */
  readonly blockId: number;
  /** The qualitative observation severity band (System 3 bumps proportionally — never the raw 1..5 scalar). */
  readonly severity: PatrolObservationSeverity;
  /** The in-game minute the 30-min accumulation tick recorded the observation on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative cohesion band (system_5_cohesion_permafrost.md §États CohesionState). A closed
 * 3-member domain — the ONLY cohesion state the cross-system seam (and, via the projection, the player) sees;
 * NEVER the raw cohesion [0,1] float or the raw thaw threshold (P5 / R2.2 — even though System 5 is one of the
 * few systems with a relatively direct player read, the raw scalar stays inside the engine; cross-system
 * consumers + the player see the qualitative band — Inv 7 reconciled with R2.2, see the projection header).
 *   - STABLE  = cohesion > thaw_threshold_current + 0.15.
 *   - FRAGILE  = thaw_threshold_current < cohesion ≤ thaw_threshold_current + 0.15.
 *   - THAWED   = cohesion ≤ thaw_threshold_current (informants active).
 */
export type CohesionState = 'STABLE' | 'FRAGILE' | 'THAWED';

/**
 * Emitted by System 5 (Cohesion Permafrost) at the NIGHTLY tick (system_5 §Update tick Phase C step 2) when a
 * district's qualitative `CohesionState` enum TRANSITIONS (STABLE↔FRAGILE↔THAWED). Carries the qualitative
 * district identity + the closed CohesionState band + the one-way `permanent_marginal_flag` (a boolean — the
 * one raw field that IS player-facing per Inv 7) — NEVER the raw cohesion [0,1] float or the raw threshold
 * (those stay inside System 5's engine; consumers react to the band, not the scalar). Consumers: System 6
 * (inspection queue amplification) + System 11 (lek decay modifier) — NOT built in Phase 1, so this currently
 * emits onto the bus with no consumers (a no-op delivery, the canonical seam T7/T12 plug into).
 */
export interface CohesionStateChangedEvent {
  readonly type: 'cohesion_state_changed';
  readonly playerId: string;
  readonly districtId: number;
  /** The previous qualitative band (the transition origin). */
  readonly from: CohesionState;
  /** The new qualitative band (the transition target). */
  readonly to: CohesionState;
  /** Whether the district has latched permanent-marginal (Inv 4 one-way gate — a player-facing boolean). */
  readonly permanentMarginal: boolean;
  /** The in-game minute the nightly tick recorded the transition on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by System 5 (Cohesion Permafrost) every NIGHTLY tick (system_5 §Update tick Phase C step 3) with the
 * district's per-district cohesion FACTOR, consumed by System 4 (Patrol Doctrine) Phase A to weight patrol
 * observations (cross_system_interactions: System 4 reads cohesion_factor). To keep the P5 discipline (the raw
 * cohesion float never crosses the cross-system seam), the factor is carried as a CLOSED qualitative band
 * (the same CohesionState domain) rather than the raw `cohesion / 1.0` float — System 4 reacts to the band.
 * System 4's consumption of this band is OPTIONAL day-1 (System 4 already runs without it); see the System 5
 * service header for the wiring decision. No-op delivery if System 4 has not subscribed.
 */
export interface CohesionFactorUpdatedEvent {
  readonly type: 'cohesion_factor_updated';
  readonly playerId: string;
  readonly districtId: number;
  /** The qualitative cohesion factor band (NEVER the raw cohesion float — P5). */
  readonly factor: CohesionState;
  readonly gameMinute: number;
}

/**
 * Emitted by System 5 (Cohesion Permafrost) at a THAW EVENT (system_5 §Update tick Phase B) — the thaw produces
 * informant pressure, raising the district's "whisper index". Carries the qualitative district identity + a
 * closed qualitative yield band (the non-linear informant_yield mapped to LOW/MEDIUM/HIGH — NEVER the raw
 * informant_yield float or the raw cohesion/threshold gap) — the System 5 → System 3 informant seam
 * (cross_system_interactions: thaw → informants → SuspicionMap). System 3 (Police Memory) is BUILT and could
 * consume this to spawn informant suspicion; the day-1 wiring decision (consume vs emit-only) is documented in
 * the System 5 service header. No-op delivery if no consumer has subscribed.
 */
export type WhisperYieldBand = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WhisperIndexUpdatedEvent {
  readonly type: 'whisper_index_updated';
  readonly playerId: string;
  readonly districtId: number;
  /** The qualitative informant-yield band the thaw produced (NEVER the raw informant_yield float — P5). */
  readonly yield: WhisperYieldBand;
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative evidence severity band for a dispatched MIS inspection that found evidence
 * (system_6_inspection_queue.md §Update tick Phase B: VIOLATION_MAJOR → HIGH, CRIMINAL_EVIDENCE → CRITICAL).
 * A closed 2-member domain — the cross-system seam exchanges the qualitative band, NEVER the raw building state
 * / outcome enum (the same P5 discipline as PatrolObservationSeverity / BackpressureBucket).
 */
export type EvidenceSeverity = 'HIGH' | 'CRITICAL';

/**
 * Emitted by System 6 (Inspection Cascade Queue) at the 12-hour dispatch tick (system_6_inspection_queue.md
 * §Update tick Phase B + Inv 6 "BPD referral = output conditionnel") when a DISPATCHED inspection finds
 * evidence at a building. This is the System 6 → System 3 BPD-REFERRAL seam: MIS never initiates a raid — it
 * produces a conditional OBSERVATION that feeds the BPD's lossy belief (SuspicionMap). System 3 (Police Memory)
 * SUBSCRIBES and bumps the OWNING precinct's suspicion tile (a NEW suspicion SOURCE alongside
 * FlowCellCongested / WhisperActivated / PatrolObservation — the MIS-referral channel). Carries the qualitative
 * district + observed-building identity + a closed qualitative severity band — NEVER the raw inspection outcome
 * enum / queue position / building structural state (those stay inside System 6's engine; System 3 reacts to
 * the referral severity band, not the raw outcome). Consumers (System 3 Police Memory) subscribe via
 * `CityEventBus.onBuildingEvidenceFound`. No-op delivery if no consumer has subscribed.
 */
export interface BuildingEvidenceFoundEvent {
  readonly type: 'building_evidence_found';
  readonly playerId: string;
  /** The district the inspected building belongs to (maps to the owning precinct in System 3). */
  readonly districtId: number;
  /** The inspected building (maps to a suspicion_map tile in System 3 — the lossy belief unit). */
  readonly buildingId: number;
  /** The qualitative referral severity band (System 3 bumps proportionally — never the raw outcome enum). */
  readonly severity: EvidenceSeverity;
  /** The in-game minute the 12h dispatch tick produced the referral on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by System 6 (Inspection Cascade Queue) at the cascade tick (system_6_inspection_queue.md §Update tick
 * Tick cascade Phase B) when a THAWED district's queue is amplified with extra CASCADE/INFORMANT entries. This
 * is an INTRA-System-6 signal (the cascade amplification observability seam) — it carries the qualitative
 * district identity + the closed cascade depth band + how many entries were injected. It is defined on the bus
 * (the canonical seam) so later observers (BO ops / a daily-summary aggregator) can react; day-1 no consumer
 * has subscribed (no-op delivery — the System 5 emit-only precedent). NEVER carries the raw queue positions.
 */
export interface InspectionCascadeTriggeredEvent {
  readonly type: 'inspection_cascade_triggered';
  readonly playerId: string;
  readonly districtId: number;
  /** The cascade depth reached when these entries were injected (1..cascade_depth_max — Inv 7 bound). */
  readonly cascadeDepth: number;
  /** How many CASCADE entries the amplification injected this tick (amplification volume, not a position). */
  readonly entriesInjected: number;
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative deviation-sigma bucket for a promoted building's UnconformityLedger
 * (system_7_unconformity_ledgers.md §États current_deviation_sigma_bucket). A closed 4-member domain — the ONLY
 * deviation signal the cross-system seam (and the projection) carries; NEVER the raw sigma float / z-score (Inv 1
 * / R2.2 — the chi-squared-like deviation score is INTERNAL; the badge is AUDIT_PIN_ACTIVE + this bucket). The
 * thresholds are relative to deviation_threshold_sigma (system_7 §enum): NOMINAL < 0.5×; LOW 0.5–1.0×; HIGH
 * 1.0–1.5×; CRITICAL > 1.5×.
 */
export type DeviationSigmaBucket = 'NOMINAL' | 'LOW_DEVIATION' | 'HIGH_DEVIATION' | 'CRITICAL_DEVIATION';

/**
 * Emitted by System 7 (Unconformity Ledgers) at the NIGHTLY tick (system_7_unconformity_ledgers.md §Update tick
 * Phase D) when a promoted building's audit pin ACTIVATES (deviation > deviation_threshold_sigma). Carries the
 * qualitative building/district identity + the closed DeviationSigmaBucket band — NEVER the raw sigma float, the
 * z-score, or the raw revenue (those stay inside System 7's engine; consumers react to the bucket, not the
 * scalar — Inv 1 / R2.2). Consumers: System 6 (Inspection Queue — cascade/inspection-focus targeting via the
 * mismatch_score read) + System 4 (Patrol Doctrine — augmented patrol-observation severity), per system_7
 * §Cross-cutting; emit-only day-1 (the canonical seam those consumers plug into — no consumer subscribes yet,
 * a no-op delivery, the System 5 emit-only precedent). The mismatch_score READ accessor (Inv 6) is the
 * synchronous read path System 6 uses; this event is the activation NOTIFICATION.
 */
export interface UnconformityAuditPinEvent {
  readonly type: 'unconformity_audit_pin';
  readonly playerId: string;
  /** The district the pinned building belongs to (the district the cascade/patrol focus applies to). */
  readonly districtId: number;
  /** The pinned building (an identity, not raw sim state — never used to leak the raw deviation). */
  readonly buildingId: string;
  /** The qualitative deviation bucket the pin activated on (NEVER the raw sigma float — Inv 1 / R2.2). */
  readonly deviationBucket: DeviationSigmaBucket;
  /** The in-game minute the nightly tick activated the pin on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by System 7 (Unconformity Ledgers) at the NIGHTLY tick (system_7_unconformity_ledgers.md §Update tick
 * Phase E) when a pinned building sits in a district where patrol could observe it — the observation HINT seam:
 * System 4 (Patrol Doctrine) would raise the severity of patrol observations on the hinted building/district.
 * Carries the qualitative district/building identity only (no raw sigma / revenue — Inv 1 / R2.2). Consumed by
 * System 4 (patrol-hint) later; emit-only day-1 (no consumer subscribes yet — a no-op delivery, the canonical
 * seam System 4 plugs into when wired).
 */
export interface AuditPinObservationHintEvent {
  readonly type: 'audit_pin_observation_hint';
  readonly playerId: string;
  readonly districtId: number;
  readonly buildingId: string;
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative throughput bucket for a laundering node (system_8_dwell_time_tax.md §Inv 5 +
 * §enum ThroughputBucket). A closed 4-member domain — the ONLY throughput signal the cross-system seam (and the
 * projection) carries; NEVER the raw throughput_in_per_hour float (Inv 5 / R2.2). Thresholds relative to
 * throughput_per_shop_per_hr: UNDER < 50%; NOMINAL 50–100%; OVER 100–150%; OVERFLOW > 150% (or an overflowing
 * buffer — buffer_load ratio >= 1).
 */
export type ThroughputBucket = 'UNDER' | 'NOMINAL' | 'OVER' | 'OVERFLOW';

/**
 * Player-facing qualitative money-cleanliness bucket for a laundering node's cleanliness_at_output ∈ [0,1]
 * (system_8_dwell_time_tax.md §Inv 6). A closed 4-member domain — the raw [0,1] cleanliness float is NEVER exposed
 * (R2.2). DIRTY = barely-laundered; CLEAN = fully laundered (saturation reached at dwell_time_per_node_hr).
 */
export type CleanlinessBucket = 'DIRTY' | 'PARTIAL' | 'MOSTLY_CLEAN' | 'CLEAN';

/**
 * Emitted by System 8 (Dwell-Time Tax) every MINUTE tick (system_8_dwell_time_tax.md §Update tick Phase E) with
 * the player's network-level qualitative aggregate: the network-cleanliness band + the exposure band (the
 * qualitative inventory_at_risk_global) + how many nodes are overflowing. Carries ONLY closed qualitative bands +
 * an overflow COUNT (an aggregate volume, not a per-node position) — NEVER the raw network_cleanliness float, the
 * raw inventory_at_risk_global scalar, or any raw cash (Inv 1 / Inv 5 / Inv 6 / R2.2 — the player never sees
 * inventory_at_risk_global). Consumers (BO pipeline observability / a network-health aggregator) subscribe via
 * `CityEventBus.onPipelineMinuteSnapshot`; emit-only day-1 (no consumer subscribes yet — the System 5/7 emit-only
 * precedent, a no-op delivery — the canonical seam BO ops plugs into when wired).
 */
export type ExposureBand = 'MINIMAL' | 'LOW' | 'ELEVATED' | 'CRITICAL';

export interface PipelineMinuteSnapshotEvent {
  readonly type: 'pipeline_minute_snapshot';
  readonly playerId: string;
  /** The qualitative throughput-weighted network cleanliness band (NEVER the raw float — Inv 6 / R2.2). */
  readonly networkCleanliness: CleanlinessBucket;
  /** The qualitative network exposure band (the inventory_at_risk_global mapped to a band — NEVER the scalar). */
  readonly exposureBand: ExposureBand;
  /** How many nodes are overflowing (buffer_load ratio >= 1) — an aggregate volume, not a per-node position. */
  readonly overflowNodesCount: number;
  /** The in-game minute the tick produced the snapshot on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative load bucket for a safehouse stash (system_9_erlang_stash.md §États StashLoadBucket).
 * A closed 5-member domain — the ONLY load signal the cross-system seam (and the projection) carries; NEVER the
 * raw current_fill[] per-slot percent (Inv 5 / R2.2). Thresholds on avg_fill (§enum): EMPTY all 0%; LOW < 25%;
 * NOMINAL 25–75%; HIGH 75–95%; FULL ≥ 95% OR open_parcels > 0 (saturation — parcels held in the open).
 */
export type StashLoadBucket = 'EMPTY' | 'LOW' | 'NOMINAL' | 'HIGH' | 'FULL';

/**
 * Player-facing qualitative blocking-pressure band for a safehouse's Erlang-B blocking_probability ∈ [0,1]
 * (system_9_erlang_stash.md §Inv 1/2 — the knee curve, qualitative). A closed 4-member domain — the raw blocking
 * float is NEVER exposed (Inv 5 / R2.2 — the player sees the qualitative knee, not the equation). LOW = far below
 * the knee; SATURATED = at/over the alert threshold (the Erlang-B curve has collapsed onto near-certain blocking).
 * Thresholds: LOW < 0.05; MODERATE 0.05–blocking_alert_threshold; HIGH blocking_alert_threshold–0.5; SATURATED ≥ 0.5
 * (or, the alert-relevant boundary, > blocking_alert_threshold — see the projection header for the alert mapping).
 */
export type StashBlockingBand = 'LOW' | 'MODERATE' | 'HIGH' | 'SATURATED';

/**
 * Emitted by System 9 (Erlang Stash) every MINUTE tick (system_9_erlang_stash.md §Update tick chaque minute Phase
 * C step 3) when a safehouse's recomputed Erlang-B blocking_probability EXCEEDS stash.blocking_alert_threshold.
 * Carries the qualitative building/district/safehouse identity + the closed StashBlockingBand (SATURATED at the
 * alert boundary) — NEVER the raw blocking_probability float, the per-slot current_fill, the arrival_rate λ, or
 * any cash (Inv 5 / R2.2 — the player/consumer reacts to the band, not the scalar). Consumer canonically =
 * UnityNotificationService ("stash saturé — risque de saisie élevé"); emit-only day-1 (no consumer subscribes yet
 * — the System 5/7/8 emit-only precedent, a no-op delivery — the canonical seam Unity/BO plug into when wired).
 */
export interface StashHighBlockingAlertEvent {
  readonly type: 'stash_high_blocking_alert';
  readonly playerId: string;
  /** The district the alerting safehouse's host building belongs to (the alert focus). */
  readonly districtId: number;
  /** The host building of the alerting safehouse (an identity, not raw sim state). */
  readonly buildingId: string;
  /** The alerting safehouse (a stable identity — never used to leak the raw blocking float). */
  readonly safehouseId: string;
  /** The qualitative blocking band the alert fired on (NEVER the raw blocking_probability float — Inv 5 / R2.2). */
  readonly blockingBand: StashBlockingBand;
  /** The in-game minute the minute tick recomputed the blocking on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative load bucket for a laundering-node buffer's fill ratio = current_occupancy /
 * buffer_capacity_per_node (system_10_buffer_bloat.md §Inv 5 BufferLoadBucket). A closed 5-member domain — the raw
 * current_occupancy float / cash NEVER escapes (Inv 3 / Inv 5 / R2.2; the player sees the bucket, which reveals the
 * silent growth the deceptive "average" hides). Thresholds (§États load_pct_bucket): EMPTY < 5%; LOW 5–30%; NOMINAL
 * 30–70%; HIGH 70–90%; CRITICAL ≥ 90% OR overflow this hour (the next raid = a massive seizure — the central lesson).
 */
export type BufferLoadBucket = 'EMPTY' | 'LOW' | 'NOMINAL' | 'HIGH' | 'CRITICAL';

/**
 * Player-facing qualitative tail-risk band for a node's tail_p95_estimate ∈ [0,1] (the P95 seizure-size estimate —
 * system_10_buffer_bloat.md §Inv 7 TailPercentileState). A closed 4-member domain — the raw tail_p95_estimate float
 * NEVER escapes (Inv 2 / Inv 7 / R2.2; the player sees the band in the tail-risk panel, never the equation).
 * Thresholds (§États tail_percentile_state, on tail_p95_estimate [0..1]): LOW < 0.10; MODERATE 0.10–0.30; HIGH
 * 0.30–0.60; CRITICAL > 0.60 (a single raid can devastate the current period — unlocks the tail-risk panel).
 */
export type TailPercentileState = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

/**
 * Emitted by System 10 (Buffer Bloat) every MINUTE tick (system_10_buffer_bloat.md §Update tick minute Phase C)
 * when a laundering-node buffer's new occupancy EXCEEDS buffer_capacity_per_node — the cap is hard-applied and the
 * excess cash is dropped on the street (Inv 1). Carries the qualitative node/district identity + the closed
 * BufferLoadBucket (CRITICAL on overflow) — NEVER the raw current_occupancy float, the raw overflow_amount cash, or
 * the buffer_capacity (Inv 3 / Inv 5 / R2.2 — the player/consumer reacts to the band + the "cash exposé" badge, not
 * the dollar figure). Consumer canonically = HeatPropagationService (heat injection in the host district —
 * §Cross-cutting heat_propagation); emit-only day-1 (no consumer subscribes yet — the System 5/7/8/9 emit-only
 * precedent, a no-op delivery — the canonical seam Heat/Unity plug into when wired Phase 1 T13 / P2).
 */
export interface BufferOverflowEvent {
  readonly type: 'buffer_overflow';
  readonly playerId: string;
  /** The district the overflowing node's host building belongs to (the heat-injection focus). */
  readonly districtId: number;
  /** The host building of the overflowing node (an identity, not raw sim state). */
  readonly buildingId: string;
  /** The overflowing laundering node (a stable identity — never used to leak the raw occupancy/cash float). */
  readonly nodeId: string;
  /** The qualitative load bucket the overflow fired on (always CRITICAL on overflow — NEVER the raw occupancy; Inv 5). */
  readonly loadBucket: BufferLoadBucket;
  /** The in-game minute the minute tick detected the overflow on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative lek-control state (system_11_deal_lek.md §États LekControlState, Inv 6). A closed
 * 3-member domain — the ONLY control signal the cross-system seam (and, via the projection, the player) sees;
 * NEVER the raw lek_score / contest_pressure int (Inv 6 / R2.2 — the internal scalars stay inside System 11).
 *   - CONTROLLED = contest_pressure < contest_threshold_presence (one org extracts the full tribute).
 *   - CONTESTED  = contest_pressure >= contest_threshold_presence (two orgs dispute the tile — tribute split).
 *   - DEAD       = weeks_without_deals >= 4 (the tile keeps its historical score but stops attracting customers).
 */
export type LekControlState = 'CONTROLLED' | 'CONTESTED' | 'DEAD';

/**
 * Emitted by System 11 (Deal Lek) at the WEEKLY tick (system_11_deal_lek.md §Update tick hebdomadaire Phase B,
 * Inv 5) when a lek's `weeks_without_deals` reaches the death threshold (4 weeks no deals) and its control_state
 * transitions TO DEAD. Carries the qualitative tile/district identity + the last controller org id — NEVER the
 * raw lek_score / contest_pressure int (Inv 6 / R2.2; the tile keeps its historical score, the consumer reacts
 * to the death, not the scalar). Consumer canonically = UnitySnapshotService (retire the lek marker from the
 * map); emit-only day-1 (no consumer subscribes yet — the System 5/7/8/9/10 emit-only precedent, a no-op
 * delivery — the canonical seam Unity/BO plug into when wired Phase 1 T14 / P2).
 */
export interface LekDeathEvent {
  readonly type: 'lek_death';
  readonly playerId: string;
  /** The district the dead lek's tile belongs to (the map-marker-retirement focus). */
  readonly districtId: number;
  /** The dead lek's tile (a block-tile identity — never used to leak the raw score; the historical score persists). */
  readonly tileId: number;
  /** The org that last controlled the lek before it died (an org identity, not a sim scalar). */
  readonly lastControllerOrgId: number;
  /** The in-game minute the weekly tick recorded the death on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Player-facing qualitative HEAT band for a building / district / citywide aggregate (heat_propagation.md §enum
 * HeatBucket, Inv 1/2 R2.2 STRICT). A closed 4-member domain — the ONLY heat signal the cross-system seam (and, via
 * the projection, the player) ever sees; NEVER the raw `heat` float (the persisted buildings.heat [0..1] / the
 * in-memory district+citywide aggregates stay inside the engine — heat is a SIGNAL, not an HP bar — its effect is
 * always MEDIATED by other systems, never a direct float penalty). Thresholds on the normalized heat [0..1] (§enum
 * HeatBucket, mapped from the 0–255 internal scale the spec describes): COLD < 0.2; WARM 0.2–0.5; HOT 0.5–0.8;
 * BURNING ≥ 0.8 (or ≥ heat_escalation_threshold → escalation). The same discipline as BackpressureBucket / CohesionState.
 */
export type HeatBucket = 'COLD' | 'WARM' | 'HOT' | 'BURNING';

/**
 * The qualitative source of a heat injection (heat_propagation.md §Event consumers — the HeatInjectionEvent
 * catalogue). A closed domain naming the operational system that produced the exposure; carried for ops/debug
 * attribution, never a raw cash/occupancy scalar. Phase 1: only BUFFER_OVERFLOW is WIRED (System 10 is built);
 * CASH_OVERFLOW (System 8), STASH_OPEN (System 9), LEK_DEAL (System 11), FLOW_CONGESTION (System 1) are the
 * deferred P2-operational sources the seam is defined for (documented in the HeatPropagationService header).
 * Phase 2 (operational chain T7) WIRES three of those operational producers as concrete contributions: COOK_HEAT
 * (a completed Brindle cook at a LAB — production_brindle.md §Heat shadow), STORAGE_HEAT (the passive per-tick heat
 * a STASH/LAB holding product accumulates — product_storage.md §Storage heat), and LEK_DEAL (a dealer selling at a
 * lek-present dealer-spot — selling_dealers_leks.md §How a deal works `+heat_per_deal_bucket`). They all emit on
 * the SAME canonical seam below — the Heat service buffers/flushes them identically to the BufferOverflow re-emit.
 */
export type HeatSource =
  | 'BUFFER_OVERFLOW'
  | 'CASH_OVERFLOW'
  | 'STASH_OPEN'
  | 'LEK_DEAL'
  | 'COOK_HEAT'
  | 'STORAGE_HEAT'
  // GROW_HEAT (Phase-3 vector #3 / grow_house, T6): a grow_house with an ACTIVE grow_session radiates per the GROW_ADVANCE
  // tick (the odeur / abnormal electricity signature — 04a/building_types.md §grow_house). The make-vs-buy A stakes:
  // an active grow climbs the building's raid-risk band above an idle grow_house. ADDITIVE — a new attribution source on
  // the SAME canonical HeatInjection seam (the Heat service buffers/flushes it identically); existing sources unchanged.
  | 'GROW_HEAT'
  // ASH_DEAL_HEAT (lot-4 TD-027 / production_secondaries.md:99): an Ash appointment honored at a Glass-district venue
  // emits one Glass-precinct heat injection per deal (+1 precinct_alert_bucket palier per honored appointment — the
  // highest-risk transaction in the M1 chain, closing the risk inversion). Point-emission on honor (AshAppointmentService)
  // via the SAME canonical emitForBuildings seam — a thin `emitAshDealHeat` wrapper on HeatContribService. ADDITIVE.
  | 'ASH_DEAL_HEAT'
  | 'FLOW_CONGESTION'
  // COURIER_SILENCE (System 9 §9 C10 — OQ-19/19b): emitted by CourierDetectionService when a caught courier
  // resolves via VIOLENT_SILENCE (the "violent silence raises BPD focus / heat" couple). Magnitude=MEDIUM
  // (OQ-19 — the police notice the enforced silence; stronger than a passive stash exposure). ADDITIVE —
  // a new attribution source on the SAME canonical HeatInjection seam; existing sources unchanged.
  | 'COURIER_SILENCE'
  // COMBAT_HEAT (04b-B C5 — DIV-B2): a combat assault via PercolationService REUSES the executeRaid path and emits
  // heat on the raided rival-territory building. A NEW attribution source on the SAME canonical HeatInjection seam;
  // existing sources unchanged. Magnitude = LOW (a single combat incursion raises visible block-level exposure).
  | 'COMBAT_HEAT'
  // MAINTENANCE_NEGLECT (04f-A C6, D7): the WEEKLY maintenance tick emits one injection per SOFT/HARD/CRITICAL
  // -lapsed building (building_maintenance_decay.md — a neglected building draws police attention). Magnitude =
  // nearest-band match of `maintenance.heat_additive_soft/hard_per_week` (soft→MICRO, hard/critical→LOW at the
  // shipped defaults) — the caller (MaintenanceHeatService) resolves the band, this member is purely the
  // attribution tag. ADDITIVE — a new source on the SAME canonical seam; existing sources unchanged.
  | 'MAINTENANCE_NEGLECT'
  // EQUIPMENT_REPAIR (04f-A C6, D7): the NIGHTLY maintenance tick emits one injection per building currently
  // `structural_state ∈ {'failed','repairing'}` (the repair-window spike — an active repair crew + a halted
  // operation draw attention). Magnitude = `maintenance.failure_repair_heat_magnitude_band` ([PROV-Y26Q2], a
  // direct band-string tunable). ADDITIVE — a new source on the SAME canonical seam; existing sources unchanged.
  | 'EQUIPMENT_REPAIR'
  | 'TEST_HOOK';

/**
 * The qualitative magnitude band of a heat injection (heat_propagation.md §Event consumers — the per-event delta
 * column MICRO/LOW/LOW-MEDIUM/MEDIUM). A closed domain — the cross-system seam carries the qualitative band, the
 * HeatPropagationService maps it to an internal delta (never the raw cash that produced it — R2.2).
 *   - MICRO       = a faint signature (Flow congestion near a tagged building).
 *   - LOW         = a modest exposure (a stash parcel open, a slow/moderate lek deal).
 *   - LOW_MEDIUM  = a buffer overflow (cash dropped on the street — the System-10 source, the only built one).
 *   - MEDIUM      = a strong, visible exposure (raw cash overflow in the open — System 8).
 */
export type HeatInjectionMagnitude = 'MICRO' | 'LOW' | 'LOW_MEDIUM' | 'MEDIUM';

/**
 * Emitted by an OPERATIONAL system when an action exposes a building to police attention — the canonical
 * HeatInjectionEvent SEAM (heat_propagation.md §Event consumers catalogue). HeatPropagationService SUBSCRIBES,
 * BUFFERS the injection in-memory, and FLUSHES it onto buildings.heat once per MINUTE tick (never a per-event DB
 * write — the System-10/12 event-storm lesson). Carries the qualitative building/district identity + a closed
 * magnitude band + the source — NEVER the raw cash / occupancy that produced it (R2.2). Phase 1: System 10's
 * BufferOverflow is RE-EMITTED as a HeatInjection by the Heat service's own BufferOverflow subscriber (the one
 * WIRED source); CASH_OVERFLOW/STASH_OPEN/LEK_DEAL/FLOW_CONGESTION producers are P2-operational (the seam is
 * defined + documented; no producer emits them organically Phase 1). A production-gated test hook injects directly
 * for the deterministic E2E (the emit-cohesion-state / lek-weekly precedent).
 */
export interface HeatInjectionEvent {
  readonly type: 'heat_injection';
  readonly playerId: string;
  /** The district the exposed building belongs to (the heat-injection focus). */
  readonly districtId: number;
  /** The building the exposure occurred at (an identity — the buildings.heat row the flush bumps). */
  readonly buildingId: string;
  /** The qualitative magnitude band (NEVER the raw cash/occupancy — R2.2; the service maps it to an internal delta). */
  readonly magnitude: HeatInjectionMagnitude;
  /** The producing operational system (ops/debug attribution — never a raw scalar). */
  readonly source: HeatSource;
  /** The in-game minute the injection happened on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by System Heat at the MINUTE/4 tick (heat_propagation.md §Update tick Phase C) when a building's heat
 * crosses heat_escalation_threshold — a DISCRETE escalation signal (Inv 6 — systems react to the EVENT, not the
 * float). Carries the qualitative building/district identity + the closed HeatBucket the building escalated at —
 * NEVER the raw heat float (Inv 1/2 / R2.2). The CROSS-SYSTEM INFLUENCE seam: heat raises observation severity in
 * System 3 (police memory) + System 4 (patrol) + System 7 (unconformity audits), always MEDIATED. Phase 1 CONSUMER:
 * System 4 (Patrol Doctrine) SUBSCRIBES and records a heat sighting on the escalated block → raised patrol
 * observation severity at its 30-min accumulation (the heat → patrol → police chain made real). System 3/7
 * consumption is the documented seam (no organic consumer yet beyond patrol).
 */
export interface HeatEscalationEvent {
  readonly type: 'heat_escalation';
  readonly playerId: string;
  /** The district the escalating building belongs to (maps to the owning precinct in System 3/4). */
  readonly districtId: number;
  /** The building that crossed the escalation threshold (an identity — the block patrol observes via its block). */
  readonly buildingId: string;
  /** The block the escalating building sits on (the suspicion/observation unit System 3/4 consume). */
  readonly blockId: number;
  /** The qualitative HeatBucket the building escalated at (NEVER the raw heat float — Inv 1/2 / R2.2). */
  readonly bucket: HeatBucket;
  /** The in-game minute the MINUTE/4 tick escalated on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK when a delegated lieutenant faces a SALIENT signal its compiled script has no rule
 * for (Phase-14 — the first Exception-Queue producer; Phase-17 generalized it to any binding's salient signal). Carries
 * the qualitative signal name + the ready-to-insert card (descriptor + candidate actions; the binding bakes the
 * teachable ADD_RULE rule). ExceptionProducerService SUBSCRIBES, dedups, and inserts the card. The funnel seam every future
 * producer reuses (05/exception_queue_spine.md §funnel). One-way coupling: the LIEUTENANT_TICK imports NOTHING from the
 * exceptions module — it emits onto THIS shared bus and the (decoupled) exceptions producer subscribes (the same
 * loosely-coupled seam every other CityEvent uses; no `lieutenant → exceptions` import).
 */
export interface LieutenantSalientUncoveredEvent {
  readonly type: 'lieutenant_salient_uncovered';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The salient signal the script does not cover (Phase-17: any binding signal name). */
  readonly signal: string;
  /** The card the producer inserts (the binding's SalientCardContent — descriptor + candidate_actions + BO scalars). */
  readonly card: SalientCardContent;
  readonly gameMinute: number;
}

/**
 * Emitted by RaidExecutionService AFTER a raid's seizure transaction has flipped a building to structural_state='damaged'
 * (Phase-16 — the raid-response Exception producer seam). Carries the qualitative identity (the damaged building + its
 * block/district), never a raw scalar. RaidExceptionProducerService SUBSCRIBES, resolves the delegated lieutenant for the
 * building, coverage-gates + dedups, and raises an exception card. One-way: RaidExecutionService imports NOTHING from the
 * exceptions module — it emits onto THIS shared bus (the same loosely-coupled seam every CityEvent uses).
 */
export interface BuildingRaidedEvent {
  readonly type: 'building_raided';
  readonly playerId: string;
  /** A building the raid just flipped operational→damaged (one event per damaged building). */
  readonly buildingId: string;
  readonly districtId: number;
  readonly blockId: number;
  /** The raided_at_tick (for the producer's logging — the resolution seed does NOT use it; it derives from exceptionId). */
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-19 L1a) when a delegated lieutenant's resolved EXECUTE_DEFAULT is REFUSED because
 * its per-category autonomy budget is depleted (the autonomy ceiling — delegation has a cost). Carries the qualitative
 * identity (the lieutenant + its archetype + the refused autonomy category) — NEVER the raw private budget counter (P5 /
 * R2.2 — the consumer reacts to the refusal, not the integer). AutonomyReportProducer (L1a T5, decoupled) SUBSCRIBES,
 * dedups, and appends an issue (with the per-archetype A/B options) to the autonomy_reports queue. One-way coupling: the
 * LIEUTENANT_TICK imports NOTHING from the autonomy report module — it emits onto THIS shared bus (the same loosely-coupled
 * seam every CityEvent uses; no `lieutenant → reports` import).
 */
export interface AutonomyCeilingRefusalEvent {
  readonly type: 'autonomy_ceiling_refusal';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The archetype whose autonomous action was refused (its primary category is the depleted one). */
  readonly archetype: string;
  /** The depleted autonomy category (projectCategory(archetype) — the qualitative category, never the raw counter). */
  readonly category: string;
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-19 L1a) when a delegated EXECUTE_DEFAULT is ALLOWED by the autonomy gate AND the
 * binding's action was TAKEN (a net-consuming action — the budget decremented). Fires on the same tick as the optional
 * `AutonomyCeilingStateUpdatedEvent` (the consume lowered the bucket). Carries the qualitative identity (lieutenant +
 * archetype + category) — NEVER the raw private budget counter (P5/R2.2). No subscriber in L1a (the BO audit / timeline
 * consumer plugs in later — the same loosely-coupled seam every CityEvent uses; no `lieutenant → reports` import).
 */
export interface AutonomyDecisionEmittedEvent {
  readonly type: 'autonomy_decision_emitted';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The archetype of the lieutenant whose autonomous decision was taken. */
  readonly archetype: string;
  /** The primary autonomy category consumed by this decision (qualitative — never the raw counter). */
  readonly category: string;
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-19 L1a) when the autonomy budget bucket for a lieutenant's primary category
 * CHANGES — either because `checkAndConsume` decremented the counter (ALLOWED → the bucket may have dropped from
 * `full→nominal`, `nominal→low`, or `low→depleted`) or because `refreshIfDue` restored every category to `full`. Carries
 * the new qualitative bucket after the change (the P5/R2.2 surface — never the raw `current` integer). No subscriber in
 * L1a (the BO budget-state consumer / real-time projection refresh seam a later consumer plugs into). One-way coupling:
 * the LIEUTENANT_TICK imports the BUS (the shared seam), never a consumer module.
 */
export interface AutonomyCeilingStateUpdatedEvent {
  readonly type: 'autonomy_ceiling_state_updated';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The archetype whose primary-category bucket just changed. */
  readonly archetype: string;
  /** The primary autonomy category whose bucket changed (qualitative — never the raw counter). */
  readonly category: string;
  /** The new qualitative bucket after the change (depleted | low | nominal | full). Never a raw integer (P5/R2.2). */
  readonly bucket: string;
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-24 L2b) when Signal Drift SUBSTITUTES the lieutenant's action: under `delegated`
 * + `INCIDENTAL_LOCKED`, the dominant incidental cue was present and the script was SILENT, so the override injected the
 * EXECUTE_DEFAULT that actually ran (the lieutenant acted by reflex on the over-relied cue, defying the player's
 * activation conditions). The BO audit trace of "the drift acted in the player's stead". Carries the qualitative dominant
 * cue + the outcome — never a raw counter. No subscriber in L2b (the trace seam a BO consumer plugs into later).
 */
export interface DriftSubstitutionEvent {
  readonly type: 'drift_substitution';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The dominant incidental cue the lieutenant locked onto (its presence this tick drove the substituted action). */
  readonly dominantCueKind: string;
  /** The substituted action (slice-1: always EXECUTE_DEFAULT — the override fills a script silence with the default). */
  readonly substitutedAction: 'EXECUTE_DEFAULT';
  /** The outcome of the substituted action (TAKEN = it took effect; NOOP = a benign no-op). */
  readonly outcome: 'TAKEN' | 'NOOP';
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-25 L3) when a delegated lieutenant's ACTIVE standing order EXPIRES (its TTL elapsed
 * → the lifecycle lapsed it, active→lapsed) AND its lapse_action is 'ESCALATE_TO_PLAYER' — the player asked to be notified
 * rather than have the order silently revert/hold. The decoupled ESCALATION seam (a BO/report consumer raises the "your
 * standing order lapsed — re-issue?" surface later; no subscriber in L3 — the canonical seam, a no-op delivery). Carries
 * the qualitative order identity (the stable signature + the lapse_action) — never a raw counter. REVERT_DEFAULT /
 * HOLD_LAST lapses do NOT emit (they resolve silently — revert to the default / keep injecting). One-way coupling: the
 * StandingOrderService imports the BUS (the shared seam), never a consumer module (the same loosely-coupled seam every
 * CityEvent uses).
 */
export interface StandingOrderLapsedEvent {
  readonly type: 'standing_order_lapsed';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The lapsed order's stable signature (the lapse-pattern key — never a raw counter). */
  readonly signature: string;
  /** The order's lapse_action (always 'ESCALATE_TO_PLAYER' for an emitted event — the only escalating action). */
  readonly lapseAction: string;
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-22 L2a — lot-5 TD-051) after `observeOutcome` runs and the drift_phase
 * TRANSITIONS to a new value (the previous and new phase differ). The audit seam for the BO timeline reconstruction
 * (Invariant 7 — "chaque transition drift_phase … génère un event composite persistant"). Carries the QUALITATIVE
 * identity only — never a raw hits/misses counter (P5/R2.2). No subscriber at this slice (the BO timeline consumer
 * plugs in later — the same loosely-coupled seam every CityEvent uses).
 */
export interface SignalDriftPhaseTransitionedEvent {
  readonly type: 'signal_drift_phase_transitioned';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The qualitative drift phase BEFORE this tick's observeOutcome ran (the transition's origin). */
  readonly previousPhase: string;
  /** The qualitative drift phase AFTER this tick's observeOutcome ran (the transition's destination). */
  readonly newPhase: string;
  /** The dominant cue kind after the transition (qualitative — never the raw bucket rank or counter). */
  readonly dominantCueKind: string;
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-22 L2a — lot-5 TD-051) when a player applies a `SignalDriftDecision`
 * (via POST /v1/lieutenants/:id/signal-drift/decision). The BO decision-audit seam (Invariant 7 — "chaque
 * SignalDriftDecision génère un event composite persistant"). Carries the qualitative decision identity
 * (kind + target cue) — never a raw cooldown counter (P5/R2.2). No subscriber at this slice.
 * Only emitted on a SUCCESSFUL application (the cooldown 409 guard in applyDecision rejects first).
 */
export interface SignalDriftDecisionEmittedEvent {
  readonly type: 'signal_drift_decision_emitted';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The decision kind applied by the player (one of the 3 SignalDriftDecisionKind values). */
  readonly kind: string;
  /** The target cue kind (relevant for disrupt_cue; DIRECT_ORDER for the non-cue-specific kinds). Qualitative. */
  readonly targetCueKind: string;
  readonly gameMinute: number;
}

/**
 * Emitted by the LIEUTENANT_TICK (Phase-22 L2a — lot-5 TD-051 / F-13.A) after `observeOutcome` runs and
 * the signal_drift_state row is updated — regardless of whether the phase transitioned. The Unity refresh
 * event (Unity §19: "refresh widget event-driven sur SignalDriftStateUpdatedEvent"). Carries the qualitative
 * post-update state (drift_phase + dominant_cue_kind) — never raw counters (P5/R2.2). No subscriber at this
 * slice (the Unity client / BO projection consumer plugs in later).
 */
export interface SignalDriftStateUpdatedEvent {
  readonly type: 'signal_drift_state_updated';
  readonly playerId: string;
  readonly lieutenantId: string;
  /** The drift phase after the state update (qualitative — P5/R2.2). */
  readonly driftPhase: string;
  /** The dominant cue kind after the state update (qualitative — P5/R2.2, never a raw rank). */
  readonly dominantCueKind: string;
  readonly gameMinute: number;
}

/**
 * Emitted by ForbiddenTriadDetectionService (D2 R8b) when a pair's `anomaly_pressure_bucket`
 * crosses the `triad_H_observer_weeks` threshold — the designated observer NPC flips its
 * `interest_flag` and begins probing the disjoint strong-tied pair
 * (reputation_mechanics.md:201-206). This is the MIS routing seam: `interest_flag` events
 * feed targeted MIS investigations routing to the player's perimeter (§3.5 §Couples with).
 *
 * P5/R2.2 discipline: carries ONLY qualitative identity (playerId + pairKey) — NEVER the raw
 * `anomaly_pressure_bucket` float (that is server-only, the player sees thickening dashed lines
 * + observer NPC cues at :208). Consumers: MIS routing acceptor (R9). No-op delivery until R9
 * wires the acceptor.
 *
 * TD-120: the observer-NPC actor itself has no real producer at D2 scope — this event is the
 * canonical MIS seam; the NPC behavior (routing to MIS investigation queue) is deferred to R13
 * (Insurance + MIS lot). Emit+defer is the honest contract: the flag transitions in DB, the event
 * fires on the bus, the NPC side-effect is annotated TD-120 for the future lot.
 */
export interface ForbiddenTriadInterestFlagEvent {
  readonly type: 'forbidden_triad_interest_flag';
  readonly playerId: string;
  /** The canonical pair key for the disjoint pair the observer is now probing. */
  readonly pairKey: string;
  /** The in-game minute the weekly tick crossed the H_observer threshold on. */
  readonly gameMinute: number;
}

/**
 * Emitted by HiddenCurriculumService (D2 R9) when a lieutenant with
 * `silence_at_handoffs = OFF` leaks operational details under MIS pressure
 * (reputation_mechanics.md:174, :217). This is the Hidden Curriculum → MIS
 * routing seam: the leak injects a high-priority INFORMANT entry into the
 * inspection queue for the affected district.
 *
 * P5/R2.2: carries ONLY qualitative identity (playerId + lieutenantId + districtId +
 * gameMinute) — NEVER the raw norms_flags vector or the leak pressure scalar.
 * Consumer: MIS routing acceptor in InspectionQueueService (R9).
 */
export interface HiddenCurriculumLeakMISEvent {
  readonly type: 'hidden_curriculum_leak_mis';
  readonly playerId: string;
  /** The lieutenant whose silence_at_handoffs=OFF flag triggered the leak. */
  readonly lieutenantId: string;
  /** The district the leak is attributed to (the MIS targeting district). */
  readonly districtId: number;
  /** The in-game minute the leak event was emitted (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Closed enum for the Boss Mirror declaration type (D2 R3a — system_3_police_memory.md :101-110).
 * Only the types that carry a PUBLIC SIGNAL across the bus (declare/retract) are here.
 * The full DeclarationType enum (including boss_mirror_violation, plea_record, etc.) lives at
 * the service layer (reputation-service internals). This bus-level enum covers only the 2 cross-system
 * events that signal to police-memory priors (reputation_mechanics.md:71).
 */
export enum BossMirrorDeclarationType {
  RULE_DECLARED  = 'RULE_DECLARED',
  RULE_RETRACTED = 'RULE_RETRACTED',
}

/**
 * Emitted by BossMirrorService (D2 R3a) when the player formally DECLARES a new rule on the public
 * declaration ledger (reputation_mechanics.md:63, :65 — the public retraction/declaration channel
 * that influences police-side priors, :71). Carries the qualitative player identity + rule identity +
 * closed declarationType + gameMinute — NEVER a raw float (P5 / R2.2). Consumers: police_memory
 * subscription (acceptor — R3b). No-op delivery until R3b wires the acceptor.
 *
 * FLAG (a) event→write mapping (R3a): the PRIMARY writer of a DeclarationEntry to
 * precinct_memory.declaration_ledger is the VIOLATION path (declaration_type = boss_mirror_violation,
 * system_3:105,169). The BossMirrorRuleDeclared / BossMirrorRuleRetracted events are the PUBLIC
 * SIGNAL channel only — they carry the retraction observable that influences police priors (:71)
 * but do NOT themselves stamp a severity-bearing DeclarationEntry. The violation → ring write
 * primitive (writeDeclarationEntry service method) is wired to recordViolation (R3a write primitive).
 * R3b will subscribe police_memory to these public events for the prior-influence path.
 */
export interface BossMirrorRuleDeclaredEvent {
  readonly type: 'boss_mirror_rule_declared';
  readonly playerId: string;
  /** The rule id being declared (string key, not a number — P5: no raw capability scalar). */
  readonly ruleId: string;
  /** Closed qualitative declaration type (RULE_DECLARED). Never a raw float. */
  readonly declarationType: BossMirrorDeclarationType;
  /** The in-game minute the declaration happened on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by BossMirrorService (D2 R3a) when the player formally RETRACTS a rule from the public
 * declaration ledger (reputation_mechanics.md:63 — « formally retracting clears slots referring to
 * that rule but is observable event. Lieutenants relax tolerance immediately; rivals read retraction
 * as weakness »). Carries qualitative identity + closed declarationType + gameMinute — NEVER a raw
 * float (P5 / R2.2). Consumers: police_memory subscription (acceptor — R3b). No-op until R3b.
 *
 * FLAG (a) event→write mapping (R3a): same as BossMirrorRuleDeclaredEvent — this is the public
 * signal channel. The retraction does NOT itself stamp a DeclarationEntry with a severity bucket;
 * it is the cross-system signal that police priors should be updated (R3b wires the consumer).
 */
export interface BossMirrorRuleRetractedEvent {
  readonly type: 'boss_mirror_rule_retracted';
  readonly playerId: string;
  /** The rule id being retracted (string key). */
  readonly ruleId: string;
  /** Closed qualitative declaration type (RULE_RETRACTED). Never a raw float. */
  readonly declarationType: BossMirrorDeclarationType;
  /** The in-game minute the retraction happened on. */
  readonly gameMinute: number;
}

/**
 * Emitted by CourierInterceptionService (Insurance C7, MINUTE/21) when a courier shift in transit
 * crosses the `courier_intercept_heat_threshold` and is deterministically selected (seedFromDay)
 * for interception. The service sets courier_shift.status = 'caught' (the existing enum member)
 * BEFORE emitting this event. Consumer: ClaimsService (C9 — COURIER_ARREST payout seam).
 *
 * DD-PRODUCERS-MINIMAL: a minimal-but-real arrest producer that makes COURIER_ARREST claims
 * testable. The fuller System 9 (dynamic patrols, route negotiation) is deferred to TD-123 (C13).
 *
 * P5/R2.2: carries ONLY qualitative identity (playerId + courierShiftId + routeId + cargoCents +
 * gameMinute) — NEVER the raw patrol_heat float (server-only; P5 BO invariant).
 * NO Math.random(): selection is via seedFromDay (C4 — same day + state → same outcome).
 */
export interface CourierInterceptedEvent {
  readonly type: 'courier_intercepted';
  readonly playerId: string;
  /** The courier_shift.shift_id that was arrested (status='caught'). */
  readonly courierShiftId: string;
  /** The route_id the shift was running on at interception. */
  readonly routeId: string;
  /** The cargo value in cents at the time of arrest (BO-only clear transaction value — DD-P5). */
  readonly cargoCents: number;
  /** The in-game minute the interception happened on. */
  readonly gameMinute: number;
}

/**
 * Emitted by `FenceDefaultService` (Insurance C8 — NIGHTLY/8) when a `laundering_nodes.buffer_load`
 * exceeds `fence_default_exposure_threshold` (design §2.3, plan Task 8). Carries the node identity +
 * `throughput_in_per_hour` so C9 can compute the FENCE_DEFAULT claim payout
 * (`fence_throughput_loss_compensation_fraction × throughputInPerHour × window`).
 *
 * `buffer_load` is read from `laundering_nodes` (substrate correction: NOT `tail_risk_estimates`).
 * The producer is deterministic: `seedFromDay(ctx.dayId, nodeRegionInt)` selects the defaulting
 * node when multiple nodes exceed the threshold. NO `Math.random()`.
 *
 * DD-PRODUCERS-MINIMAL (design §4): minimal producer that makes FENCE_DEFAULT claims real.
 * The fuller System 12 (fence renegotiation, rival laundering market) is deferred → TD-124 (C13).
 *
 * P5/R2.2: carries ONLY qualitative identity (playerId + launderingNodeId + throughputInPerHour +
 * gameMinute) — NEVER the raw `buffer_load` float (server-only; P5 BO invariant).
 * NO `Math.random()`: selection is via seedFromDay (C4 — same day + state → same outcome).
 */
export interface FenceDefaultedEvent {
  readonly type: 'fence_defaulted';
  readonly playerId: string;
  /** The laundering_nodes.node_id that defaulted. */
  readonly launderingNodeId: string;
  /** The laundering_nodes.throughput_in_per_hour at the time of default (used by C9 for payout). */
  readonly throughputInPerHour: number;
  /** The in-game minute the default happened on. */
  readonly gameMinute: number;
}

/**
 * Emitted ADDITIVELY by `MoneyHoldingService.deposit` on every SUCCESSFUL deposit (the return value
 * `{ deposited: true }` is BYTE-IDENTICAL — zero-regression). Consumer: CoverageInducedDriftService
 * (C4 — stash-ratio drift detection). No-op until CoverageInducedDriftService subscribes.
 *
 * P5/R2.2: carries ONLY clear, observable identity (playerId + buildingId + heldCentsAfter +
 * capacityCents + gameMinute) — these are all clear cash values surfaced by the projection (T6).
 * NO Math.random(). ADDITIVE-ONLY: the deposit hot-path return value is UNCHANGED.
 */
export interface StashFillEvent {
  readonly type: 'stash_fill';
  readonly playerId: string;
  /** The money_holding building_id that received the deposit. */
  readonly buildingId: string;
  /** The held_cents AFTER the successful deposit (for stash-ratio computation). */
  readonly heldCentsAfter: number;
  /** The capacity in cents for the holding's current tier (capacityCentsForTier(tier)). */
  readonly capacityCents: number;
  /** The in-game minute the deposit happened on (from the scheduler tick context). */
  readonly gameMinute: number;
}

/**
 * `CourierRotatedEvent` — emitted by `DistributionService.dispatch` AFTER the courier_shift INSERT
 * commits successfully. Consumed by `CoverageInducedDriftService.onCourierRotated` (Drift C5 —
 * courier-cadence drift detection). Shape mirrors `CourierInterceptedEvent` (:895).
 *
 * Polarity: a LONGER gap between rotations = less prudent (the subscriber checks if the interval
 * since the previous rotation exceeds the baseline cadence by ≥ coverage_drift_courier_cadence_slower_margin_days).
 *
 * P5/R2.2: carries ONLY clear, observable identity (playerId + courier/route/shift UUIDs + tick).
 * NO raw risk scalar. NO Math.random(). ADDITIVE-ONLY: the dispatch hot-path return value is UNCHANGED.
 */
export interface CourierRotatedEvent {
  readonly type: 'courier_rotated';
  readonly playerId: string;
  /** The UUID of the dispatched courier. */
  readonly courierId: string;
  /** The UUID of the route this shift traverses. */
  readonly routeId: string;
  /** The UUID of the courier_shift row just inserted. */
  readonly courierShiftId: string;
  /** The game-minute tick at which the shift was started (city_sim_clock.game_minute at dispatch time). */
  readonly dispatchedAtTick: number;
  /** The in-game minute the dispatch happened on (= dispatchedAtTick for the drift subscriber). */
  readonly gameMinute: number;
}

/**
 * `DealAcceptedEvent` — emitted by `SellingSellService.runMinuteTick` AFTER the batched sell commits,
 * once per tick (aggregate across all deals that sold). Consumed by `CoverageInducedDriftService.onDealAccepted`
 * (Drift C6 — marginal-deal acceptance rate drift detection). Shape mirrors `CourierInterceptedEvent` (:895).
 *
 * Per-tick aggregation (NOT per-deal) avoids concurrent async-subscriber races when multiple dealers sell
 * in the same tick. The `marginPermille` is the AVERAGE realized margin across all deals; `heatLevel` is
 * the MAX heat across all dealer-spot buildings in the tick.
 *
 * `marginPermille`: the average realized deal value per gram expressed as per-mille of the brindle base price
 *   (Math.round(1000 × avgValuePerGram / brindleBaseValuePerGram)). Brindle = ~1000‰, Hush = ~1500‰,
 *   Crick = ~3000‰. Below 1000‰ = tick aggregate in the scatter zone (realized price below brindle base).
 * `heatLevel`: the MAX heat across all dealer-spot buildings in the tick (Math.round(max building.heat)), [0..∞).
 *   Carries 0 when no building has heat.
 *
 * P5/R2.2: carries ONLY clear, observable identity (playerId + dealerSpotId + marginPermille + heatLevel
 *   + gameMinute) — no raw risk scalar. NO Math.random(). ADDITIVE-ONLY: the sell hot-path return value
 *   (void) is BYTE-IDENTICAL.
 */
export interface DealAcceptedEvent {
  readonly type: 'deal_accepted';
  readonly playerId: string;
  /** The dealer-spot building_id of the first dealer in the tick (representative — the tick may cover multiple). */
  readonly dealerSpotId: string;
  /**
   * Average realized deal margin in per-mille of the brindle base price, across all deals in the tick.
   * = Math.round(1000 × avgValuePerGram / brindleBaseValuePerGram).
   * Brindle = ~1000‰; ticks in the scatter zone (realized < modal) drop below 1000‰.
   */
  readonly marginPermille: number;
  /**
   * Maximum heat level across all dealer-spot buildings in the tick (Math.round(max building.heat)).
   * Carries 0 when no building has heat.
   */
  readonly heatLevel: number;
  /** The in-game minute the tick happened on (from the scheduler tick context). */
  readonly gameMinute: number;
}

/**
 * Emitted by `RegimeSwitchingService` (04b-A C3 — RIVAL_REGIME_TICK, Cadence.TWELVE_H/6) when a rival's
 * operational regime flips (regime_pressure crosses flip_threshold). Carries ONLY qualitative identity
 * (playerId + rivalKey + gameMinute) — **NO regime label, NO raw pressure scalar** (R2.2 / P6 — the player
 * NEVER sees the regime enum; consumers that need the new regime read it BO-side or via the projection).
 * This is the §8 ONE NEW EVENT for lot A. A's other mechanics (saturation/trophic/intel) are state
 * mutations on rival_state rows, not bus events.
 *
 * P6 / R2.2: payload is qualitative only. No raw rival_state scalar crosses the bus (same discipline as
 * FlowCellCongestedEvent carrying BackpressureBucket — NEVER the raw ρ float). The `rivalKey` is an
 * opaque identity, not a regime value.
 *
 * Canon: rival_ai_mechanics.md §OODA-regime-flip (:403); design §8.
 * Subscriber(s): (in A) rival mechanics that update decision policy; (later B) Exception-card hook;
 *   (later C) info-warfare inference. Day-1 no consumer has subscribed (no-op delivery; the seam).
 */
export interface RegimeTransitionEvent {
  readonly type: 'regime_transition';
  readonly playerId: string;
  /** The rival whose regime just flipped (the 4-faction key — an identity, NOT the new regime value). */
  readonly rivalKey: string;
  /** The in-game minute the 12h regime tick ran on (for ordering / debugging — NEVER a wall-clock). */
  readonly gameMinute: number;
}

/**
 * `DeadHandFiredEvent` — emitted by `DeadHandCacheService.fireCache` (04b-B C7) when a rival's
 * pre-committed retaliation cache fires (reserve drops below the per-rival trigger threshold).
 *
 * DISTINCT from A's `RegimeTransitionEvent` (different type discriminant + different payload).
 * Distinct from System 6's `InspectionCascadeTriggeredEvent` (combat domain, not forensic).
 *
 * P5/R2.2: carries only qualitative identity (playerId + rivalKey + scriptRef + gameDay).
 *   NO dead_hand_reserve, NO trigger_threshold, NO raw scalar — the P6 wall holds on the bus.
 *   `scriptRef` is the opaque string reference to the pre-committed script (not the script content).
 *   `gameDay` is in-game day (NOT wall-clock / Date.now()).
 *
 * Canon: retaliation_mechanics.md:78 / DD-DEADHAND-FIRE (design §6).
 * Consumer: `ConflictOrchestratorService` (C-cas — subscribes to drive the §7 cascade);
 *   no consumer yet in B (the cascade slot lands at C-cas; day-1 = no-op delivery).
 *
 * ADDITIVE: no existing event type modified. Type discriminant 'dead_hand_fired' is NEW.
 */
export interface DeadHandFiredEvent {
  readonly type: 'dead_hand_fired';
  readonly playerId: string;
  /** The rival whose dead-hand cache fired (the 4-faction key — an identity, NOT the new regime value). */
  readonly rivalKey: string;
  /** The opaque pre-committed script reference (the cache_script_ref — not the content). Server-safe. */
  readonly scriptRef: string;
  /** The in-game day the cache fired on (NOT wall-clock; game-time for ordering / cascade seeding). */
  readonly gameDay: number;
}

/**
 * `LookoutAssignedEvent` — emitted by `LieutenantService.recruit` when archetype === 'SECURITY',
 * AFTER the recruit tx commits (AFTER logger, BEFORE return — additive-only; byte-identical recruit hot-path).
 * Consumed by `CoverageInducedDriftService.onLookoutAssigned` (Drift C7 — lookout coverage drift detection).
 *
 * DD-LOOKOUT-MAPPING: A SECURITY lieutenant = a "lookout" in the coverage model. The event signals that a
 * new lookout has been assigned to a building. The subscriber re-evaluates the CURRENT lookout rate vs the
 * frozen baseline to detect chronic under-coverage (MORE lookouts can still show the player is under-covered
 * relative to their historical baseline — the check is coherent: rates are computed post-recruit).
 *
 * P5/R2.2: carries only observable identity (playerId + lieutenantId + buildingId + gameMinute) — no risk
 * scalar. ADDITIVE-ONLY: the recruit hot-path return value is BYTE-IDENTICAL.
 */
export interface LookoutAssignedEvent {
  readonly type: 'lookout_assigned';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly buildingId: string;
  /** The in-game minute the recruit happened on. Player-triggered actions use gameMinute=0 (no scheduler ctx). */
  readonly gameMinute: number;
}

/**
 * `RuleViolationEvent` — emitted by `BossMirrorService.recordViolation` AFTER the ring upsert
 * commits (BOTH branches: insert-fresh + update-existing). Consumed by
 * `CoverageInducedDriftService.onRuleViolation` (Drift C8 — DD-BOSSMIRROR-COUPLE).
 *
 * Canon :116: "Boss Mirror violation SIMULTANEOUSLY with a Coverage-Induced Drift increment."
 * The drift increment is UNCONDITIONAL (no margin comparison — a declared-rule violation IS a
 * less-cautious act by canon definition).
 *
 * P5/R2.2: carries only observable identity (playerId + lieutenantId + ruleId + severityBucket +
 * gameMinute) — no raw risk scalar. ADDITIVE-ONLY: the recordViolation hot-path return value
 * (void) is BYTE-IDENTICAL.
 */
export interface RuleViolationEvent {
  readonly type: 'rule_violation';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly ruleId: string;
  readonly severityBucket: string;
  readonly gameMinute: number;
}

// ── Forensic Signaling events (C20 — §5 Forensic Signaling, lot Forensic) ──────────────────────
// NOTE: these events use ForensicSeverityBand ('low'|'medium'|'high'|'critical'), NOT EvidenceSeverity.
// EvidenceSeverity (line 221) UNCHANGED — OQ-15 invariant.

/**
 * Emitted by LeadingDigitAuditService (§5.1 Benford's Law WEEKLY/9 tick) when χ² > H_audit → soft-flag.
 * Carries the banded severity (ForensicSeverityBand) — NEVER the raw χ² scalar (R2.2 / OQ-15).
 * Consumers (C22 dispatcher, C23 BPD-memory): subscribe via `CityEventBus.onForensicSoftFlagDetected`.
 * Producer fires ADDITIVE alongside the existing dual-write (C8 declaration_ledger + flag_ticks).
 */
export interface ForensicSoftFlagDetectedEvent {
  readonly type: 'forensic_soft_flag_detected';
  readonly playerId: string;
  readonly frontId: string;
  readonly precinctId: number;
  /** Banded severity (ForensicSeverityBand, 4-member) — NEVER the raw χ² scalar. OQ-15. */
  readonly severity: import('../../operational/forensic/forensic-severity').ForensicSeverityBand;
  readonly gameMinute: number;
}

/**
 * Emitted by EffluentStoichiometryService (§5.2 NIGHTLY/9 inspector scan) when deviation > σ → flag.
 * Carries the banded severity (ForensicSeverityBand) — NEVER the raw deviation scalar (R2.2 / OQ-15).
 * Consumers (C22 dispatcher, C23 BPD-memory): subscribe via `CityEventBus.onEffluentFlagDetected`.
 * Producer fires ADDITIVE alongside the existing C15 applyQueues queue-entry emission.
 */
export interface EffluentFlagDetectedEvent {
  readonly type: 'effluent_flag_detected';
  readonly playerId: string;
  readonly blockId: number;
  readonly districtId: number;
  /** Banded severity (ForensicSeverityBand, 4-member) — NEVER the raw deviation scalar. OQ-15. */
  readonly severity: import('../../operational/forensic/forensic-severity').ForensicSeverityBand;
  readonly gameMinute: number;
}

/**
 * Emitted by StandingGapHeatService (§5.3 tail ramp C18 — advanceTailRamp) on each stage transition.
 * Carries the rampStage (TailRampStage) DIRECTLY — DD decision C: NO banding fn, no severity field.
 * TailRampStage IS already a qualitative band (passive→tailing→subpoena); carrying it directly satisfies
 * R2.2 without introducing a redundant projection (neither gap nor consecutive_flag_months leaks).
 * Consumers (C22 dispatcher, C23 BPD-memory): subscribe via `CityEventBus.onLifestyleGapFlag`.
 * Producer fires ADDITIVE alongside the existing C19 applyQueues queue-entry emission.
 */
export interface LifestyleGapFlagEvent {
  readonly type: 'lifestyle_gap_flag';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly precinctId: number;
  /** The current tail-ramp stage at transition — carried directly (DD decision C: no severity banding). */
  readonly rampStage: import('../../operational/forensic/forensic-severity').TailRampStage;
  readonly gameMinute: number;
}

/**
 * Emitted by `InspectionQueueService` at dispatch-time (System 6 12h dispatch tick) when a drained
 * entry has `source === 'FORENSIC'` (C22 — DD-MIS-DISPATCHER/DIV-2). The existing non-forensic
 * dispatch path (SCHEDULED/INFORMANT/CASCADE/etc.) stays BYTE-IDENTICAL — only this additive branch
 * is added. Consumer: `InspectionQueueDispatcherService` (C22) routes per §4.3 by `forensicKind`.
 *
 * The FORENSIC entry SKIPS the building-hash outcome (no `BuildingEvidenceFoundEvent` from hash) —
 * the forensic consequence is the §4.3 consequence fired by the dispatcher, not the hash-proxy.
 *
 * P5/R2.2: carries qualitative identity only (playerId + districtId + buildingId + forensicKind +
 * priorityBucket + gameMinute) — NEVER raw internal scalars. The dispatcher consequence (seizure /
 * heat / observation) is server-side only and never surfaced to the client via this event.
 */
export interface ForensicEntryDispatchedEvent {
  readonly type: 'forensic_entry_dispatched';
  readonly playerId: string;
  readonly districtId: number;
  /** The targeted building id from the dispatched queue entry (maps to the forensic consequence target). */
  readonly buildingId: number;
  /** The forensic dispatch discriminator (§4.3 routing key). */
  readonly forensicKind: import('../../operational/forensic/forensic-severity').ForensicKind;
  /** The priority bucket of the dispatched entry (Inv 2 — closed enum, never a float). */
  readonly priorityBucket: import('../../citysim/inspection/inspection.repository').PriorityBucket;
  /** The in-game minute the 12h dispatch tick drained this entry on (for ordering / debugging). */
  readonly gameMinute: number;
}

/**
 * Emitted by `RouteRequestService.enqueueAndEmit` (System 9c C4 — DD-ROUTE-REQUEST, OQ-RR1) when a
 * shipment request is enqueued for a distribution hub. The C5 `CoordinatorExecutionService` SUBSCRIBES
 * via `onRouteRequest` and evaluates the hub's coordinator script, dispatching a courier if the conditions
 * match. The durable `route_request` row is written BEFORE the event is emitted (the row is the receipt,
 * this event is the trigger).
 *
 * P5/R2.2: carries ONLY qualitative identity (playerId + hubId + gameMinute) — NO raw scalar, NO cargo,
 * NO coordinates. The coordinator reads product_ready / heat / stash_fill BANDS from the snapshot
 * (server-side banding; no raw float crosses the bus). NO `Math.random()`, NO `Date.now()`.
 * Consumer: `CoordinatorExecutionService.onRouteRequest` (C5, greenfield).
 */
export interface RouteRequestEvent {
  readonly type: 'route_request';
  readonly playerId: string;
  /** The distribution_hub building_id the request was enqueued for (the coordinator's hub). */
  readonly hubId: string;
  /** The game-minute the request was enqueued on (ctx.gameMinute — NEVER Date.now()). */
  readonly gameMinute: number;
}

/**
 * `ConflictFlowRegimeEvent` — emitted by `DownstreamGateService.evaluateDownstream` (04b-B C-deesc)
 * when the downstream hydraulic-jump condition transitions the conflict from RUNNING → STANDING.
 *
 * ★ OQ-B7 RENAME: Canon (`de_escalation_mechanics.md:96`) calls this `RegimeTransitionEvent`, but that
 * collides with A's `RegimeTransitionEvent` (the rival-regime flip, type='regime_transition',
 * `rival_ai_mechanics.md:403`). B renames the de-escalation event to `ConflictFlowRegimeEvent`
 * (RUNNING↔STANDING) to avoid the collision — the 21-observability-lesson: two different concepts
 * must not share a class name (DD-DOWNSTREAM-EVENT-NAME design §5.2).
 *
 * DISTINCT from A's `RegimeTransitionEvent` (type='regime_transition', rival-regime flip).
 * DISTINCT from System 6's `InspectionCascadeTriggeredEvent` (type='inspection_cascade_triggered').
 *
 * P5/R2.2: no raw downstream_condition scalar crosses the bus.
 *   Carries only qualitative identity (playerId + rivalKey + from/to regime + gameMinute).
 *
 * Consumer: rival retaliation scripts (STANDING suspends retaliation — canon §5.2 :71);
 *   no consumer yet in C-deesc (day-1 emit-only — the suspend seam lands at C-cas).
 *
 * ADDITIVE: no existing event type modified. Type discriminant 'conflict_flow_regime' is NEW.
 */
export interface ConflictFlowRegimeEvent {
  readonly type: 'conflict_flow_regime';
  readonly playerId: string;
  /** The rival pair key for this conflict. */
  readonly rivalKey: string;
  /** The regime BEFORE the transition (the origin). */
  readonly from: 'running' | 'standing';
  /** The regime AFTER the transition (the target). */
  readonly to: 'running' | 'standing';
  /** The in-game minute the downstream evaluation ran on (game-time — NEVER Date.now()). */
  readonly gameMinute: number;
}

/**
 * `AssaultEvent` — emitted by ConflictOrchestratorService when an assault is initiated (C-cas).
 *
 * Signals that a combat assault has occurred for a given player × rival pair.
 * Consumers: downstream cascade seam (C-cas itself), BO ops monitoring.
 *
 * P5/R2.2: no raw damage scalar on the bus. Qualitative identity only.
 * ADDITIVE: new discriminant 'assault' — no existing type modified.
 */
export interface AssaultEvent {
  readonly type: 'assault';
  readonly playerId: string;
  readonly rivalKey: string;
  readonly assaultEventId: string;
  readonly gameMinute: number;
}

/**
 * `AssaultCascadeCompletedEvent` — emitted by ConflictOrchestratorService (C-cas) when
 * the §9.1 5-layer cascade completes (all layers applied atomically or all rolled back).
 *
 * DISTINCT discriminant resolution (dual-event hazard):
 *   - city-event-bus.ts `CascadeTriggeredEvent` uses type='cascade_triggered' (sandpile 12h tick).
 *   - This event uses type='assault_cascade_completed' (§9.1 assault cascade, different origin + payload).
 *   - System 6's InspectionCascadeTriggeredEvent uses type='inspection_cascade_triggered'.
 * All THREE are distinct types on the bus — no collision.
 *
 * The stale `CascadeTriggeredEvent` in combat.types.ts (type: 'cascade_triggered') was RENAMED to
 * `AssaultCascadeCompletedEvent` (type: 'assault_cascade_completed') at C-cas to resolve the hazard.
 *
 * P5/R2.2: no raw scalars on the bus — only qualitative bucket strings + boolean flags.
 * ADDITIVE: no existing event type modified.
 */
export interface AssaultCascadeCompletedEvent {
  readonly type: 'assault_cascade_completed';
  readonly playerId: string;
  readonly rivalKey: string;
  readonly assaultEventId: string;
  readonly gameMinute: number;
  /** Whether the heat layer propagated (Layer 1). */
  readonly heat_propagated: boolean;
  /** Qualitative sandpile delta bucket (Layer 2 — R2.2: never the raw float). */
  readonly sandpile_delta_bucket: string;
  /** Maladaptive depth increment (Layer 3 — 0 on dedup no-op). */
  readonly maladaptive_depth_increment: number;
  /** Whether the Adaptive Skin pattern was logged (Layer 4). */
  readonly adaptive_skin_pattern_logged: boolean;
  /** Burn-trust impact bucket (Layer 5 — C forward slot, 'none' in B). */
  readonly burn_trust_impact_bucket: string;
}

/**
 * `RivalEliminatedEvent` — emitted by RivalEliminationService (C-cas §9.2) after the 4-penalty
 * elimination tx commits successfully.
 *
 * Signals that a rival has been eliminated and all 4 penalties have been applied atomically.
 * Consumers: BO ops, downstream scoring, rival-retaliation suspension.
 *
 * P5/R2.2: no raw scalars — qualitative identity only.
 * ADDITIVE: new discriminant 'rival_eliminated' — no existing type modified.
 */
export interface RivalEliminatedEvent {
  readonly type: 'rival_eliminated';
  readonly playerId: string;
  readonly rivalKey: string;
  readonly gameMinute: number;
  /** The qualitative compounding penalty bucket (R2.2 — never the raw multiplier). */
  readonly compounding_penalty_bucket: string;
}

/**
 * `CascadeTriggeredEvent` (sandpile variant) — emitted by `SandpileStateService.triggerCascadeChecks`
 * (04b-B C-esc) when the sandpile system_criticality exceeds the cascade threshold + the seeded draw fires.
 *
 * DISTINCT from the §9.1 assault cascade `AssaultCascadeCompletedEvent` (type='assault_cascade_completed',
 * in combat.types.ts and this bus — which has `rivalKey` + `assaultEventId` + cascade result fields).
 * This sandpile variant is emitted by the ESCALATION 12h tick (not an assault event).
 * The two differ in semantic origin, type discriminant, AND payload — NO collision.
 *
 * ALSO DISTINCT from System 6's `InspectionCascadeTriggeredEvent` (type='inspection_cascade_triggered').
 * Type discriminant: 'cascade_triggered' (sandpile 12h tick).
 *
 * P5/R2.2: carries only qualitative identity. No raw system_criticality scalar crosses the bus.
 */
export interface CascadeTriggeredEvent {
  readonly type: 'cascade_triggered';
  readonly playerId: string;
  /** The in-game minute the 12h escalation tick ran on (game-time — NEVER Date.now()). */
  readonly gameMinute: number;
  /** Whether the cascade propagated (the seeded draw result). */
  readonly propagated: boolean;
}

/**
 * `CaseResolvedEvent` — emitted by `LegalCaseService.resolveCase` (C7 NIGHTLY sweep) when a legal case
 * reaches its terminal outcome.
 *
 * Qualitative only — NO raw `info_leak_total` (R2.2/P5 invariant). The `outcome` discriminant is the only
 * signal the player-facing Exception spine and BPD consumers receive. The raw info_leak accumulation
 * (server-side) is consumed internally (conviction → final-dump `appendDeclarationEntry`).
 *
 * Consumers: BPD (conviction → final `appendDeclarationEntry`), Exception spine (player notification).
 * Emitted C7. Declared C3.
 *
 * Canon: plan §Events "CaseResolvedEvent { type:'case_resolved'; playerId; caseId; defendantType;
 *   outcome:'acquitted'|'plea_down'|'convicted'|'dismissed'; gameMinute }". ADDITIVE.
 */
export interface CaseResolvedEvent {
  readonly type: 'case_resolved';
  readonly playerId: string;
  readonly caseId: string;
  readonly defendantType: 'courier' | 'lieutenant' | 'dealer';
  readonly outcome: 'acquitted' | 'plea_down' | 'convicted' | 'dismissed';
  readonly gameMinute: number;
}

/**
 * `LawyerBurnedEvent` — emitted by `LawyerService.evaluateBurnRisk` (C8 NIGHTLY sweep) when
 * `burn_risk_score > tier3_burn_threshold` for a Tier-3 corruption_pipeline lawyer.
 *
 * Qualitative only — NO raw `burn_risk_score` (R2.2/P5 invariant, decision #6).
 * Triggers: cancel pending Tier-3 cases → auto-switch to Tier-1; urgent player Exception.
 * This is the IA-B (04d-B) §13 entry-point: B fires on a forward-cascade discovery of a `lawyer`
 * target and uses `LawyerBurnedEvent` as the flip signal (§13 contract).
 *
 * Emitted C8. Declared C3.
 *
 * Canon: plan §Events "LawyerBurnedEvent { type:'lawyer_burned'; playerId; lawyerId; gameMinute }". ADDITIVE.
 */
export interface LawyerBurnedEvent {
  readonly type: 'lawyer_burned';
  readonly playerId: string;
  readonly lawyerId: string;
  readonly gameMinute: number;
}

/**
 * `Tier3LawyerUsedEvent` — plumbing event (decision #2, 2026-07-01) emitted by
 * `LawyerService.issueTier3Payoff` (lawyer.service.ts:383) when a Tier-3 corruption_pipeline
 * lawyer issues a payoff for a player.
 *
 * Bus-decoupled: A emits, B (IATargetService.handleTier3LawyerUsed) subscribes →
 * `recordCorruptUse` (suspicion accrual on `internal_affairs_targets`) + `recordTier3Use`
 * (reverse burn bump on `burn_risk_score`).
 *
 * Qualitative only — NO raw `burn_risk_score` or `suspicion_level` (R2.2/P5). ADDITIVE.
 * Payload: who (playerId + lawyerId) + when (gameMinute).
 *
 * Canon: plan §Events "Tier3LawyerUsedEvent { type:'tier3_lawyer_used'; playerId; lawyerId;
 *   gameMinute }". Emitted C3 (04d-B). B's IATargetService subscribes in onModuleInit.
 */
export interface Tier3LawyerUsedEvent {
  readonly type: 'tier3_lawyer_used';
  readonly playerId: string;
  readonly lawyerId: string;
  readonly gameMinute: number;
}

/**
 * `InvestigationOpenedEvent` — canon event (04d-B C4) emitted by
 * `IAInvestigationService.evaluateThresholdCrossing` when a target's `suspicion_level`
 * crosses `open_investigation_threshold` (NIGHTLY/17 scan) and a new investigation opens.
 *
 * Qualitative only — NO `suspicion_level` (R2.2/P5 — the raw float is SERVER-ONLY).
 * Payload: `targetId` (UUID) + `targetType` (closed enum string) + `gameMinute` (when).
 *
 * Canon: internal_affairs_corruption_discovery.md §3 + plan §Events
 *   "InvestigationOpenedEvent { type:'investigation_opened'; targetId; targetType; gameMinute }".
 * Consumer: Exception flow (actor-nervous warning, C8+) + the surveillance window.
 */
export interface InvestigationOpenedEvent {
  readonly type: 'investigation_opened';
  readonly targetId: string;
  /** The target category (closed domain — 'lawyer'=LIVE; 4 others reserved-inert). */
  readonly targetType: 'clerk' | 'port_inspector' | 'lawyer' | 'broker' | 'judge_aide';
  readonly gameMinute: number;
}

/**
 * `IATargetDiscoveredEvent` — canon event (04d-B C5) emitted by
 * `IADiscoveryService.executeDiscovery` when a target's double-condition triggers
 * discovery (`detection_events >= N` OR `suspicion_level >= threshold`, decision #3).
 *
 * Qualitative only — NO raw `suspicion_level` or `detection_events` (R2.2/P5 — SERVER-ONLY).
 * Payload: `targetId` (UUID) + `targetType` (closed enum string) + `gameMinute` (when).
 *
 * For `lawyer` targets: triggers `LawyerService.forceBurnLawyer` (the forward cascade action).
 * For 4 reserved types: inert forward hook (no substrate to cancel — anti-fig-leaf, RATIFIÉ #4).
 *
 * Consumer: forward cascade (C5 internal); Exception flow (arrest card, C8+).
 * Canon: internal_affairs_corruption_discovery.md §3 + plan §Events
 *   "IATargetDiscoveredEvent { type:'ia_target_discovered'; targetId; targetType; gameMinute }".
 */
export interface IATargetDiscoveredEvent {
  readonly type: 'ia_target_discovered';
  readonly targetId: string;
  /** The target category (closed domain — 'lawyer'=LIVE; 4 others reserved-inert). */
  readonly targetType: 'clerk' | 'port_inspector' | 'lawyer' | 'broker' | 'judge_aide';
  readonly gameMinute: number;
}

/**
 * `MaintenancePhaseChangedEvent` — canon event (04f-A C2) emitted by
 * `MaintenancePhaseTickService.runNightlyTick` (NIGHTLY/21) when a building's D1 `lapse_phase` transitions
 * (within_window↔soft↔hard↔critical, in either direction — a scheduled-maintenance completion or a
 * newly-crossed degradation boundary).
 *
 * Qualitative only — the 2 phase fields are the SAME closed 4-member domain the `building_lapse_phase`
 * pgEnum carries (R2.2/P5 — NO raw `days_overdue`, NO output multiplier, NO failure probability).
 *
 * Consumer: BO/telemetry hook (design §4); C6's heat/audit-pin couples MAY subscribe later (currently they
 * derive the phase live from the same pure formula rather than reacting to this event — no consumer wired
 * yet in C2, an honest producer-only landing, the SAME posture `InvestigationOpenedEvent` had at its own
 * introduction).
 */
export interface MaintenancePhaseChangedEvent {
  readonly type: 'maintenance_phase_changed';
  readonly buildingId: string;
  readonly playerId: string;
  readonly previousPhase: 'within_window' | 'soft' | 'hard' | 'critical';
  readonly newPhase: 'within_window' | 'soft' | 'hard' | 'critical';
  readonly gameMinute: number;
}

/**
 * `SessionOpenedEvent` — P3-A C2 (DD-P3): emitted by `SessionService.open` when a FRESH
 * `gameplay_sessions` row is inserted (D1). NOT emitted on the idempotent "return the same active
 * session" path (no new session, nothing to announce). Qualitative-identity only — no counters
 * (R2.2/P5 — the counters are BO-readable off the row itself, never in the event payload).
 *
 * Player-triggered action (HTTP `POST /v1/session/open`, or the HOURLY/5 sweep's auto-reopen path
 * — this lot never auto-reopens, only auto-closes) — `gameMinute=0` for the HTTP path (the
 * `LookoutAssignedEvent` convention: "Player-triggered actions use gameMinute=0, no scheduler ctx").
 *
 * Consumers: NONE this lot (the additive seam P3-B/E/H/telemetry subscribe to later — design DD-P3).
 */
export interface SessionOpenedEvent {
  readonly type: 'session_opened';
  readonly playerId: string;
  readonly sessionId: string;
  readonly gameMinute: number;
}

/**
 * `MaintenanceScheduledEvent` — canon event (04f-A C3) emitted by `MaintenanceService.scheduleMaintenance` /
 * `applyMassSchedule` when a player arms a scheduled-maintenance 1-game-day job (D13 — the completion leg is
 * `MaintenancePhaseChangedEvent`, emitted by the NIGHTLY/21 tick when the job actually completes; THIS event is
 * the scheduling/arming leg only).
 *
 * Qualitative only — `emergency` is the SAME closed boolean the D10 response carries (R2.2/P5 — NO raw
 * `days_overdue`, NO cost cents).
 *
 * Consumer: BO/telemetry hook (design §9); none wired yet in C3 (an honest producer-only landing, the SAME
 * posture `MaintenancePhaseChangedEvent` had at its own C2 introduction).
 */
export interface MaintenanceScheduledEvent {
  readonly type: 'maintenance_scheduled';
  readonly buildingId: string;
  readonly playerId: string;
  readonly emergency: boolean;
  readonly gameMinute: number;
}

/**
 * `SessionClosedEvent` — P3-A C2 (DD-P3): emitted by `SessionService.close` (explicit HTTP close) AND
 * by the `SESSION_SWEEP` HOURLY/5 tick (`SessionService.sweepStaleForPlayer`) for every session it
 * actually closes (organically zero emits when nothing is stale — design §13 zero-regression). Both
 * call the SAME `closeStaleAndEmit`/`close` seam (Lesson #3 — zero live-vs-test divergence: the
 * `run-session-sweep` test route drives the identical code path).
 *
 * `gameMinute=0` for the explicit HTTP close (player-triggered, no scheduler ctx — the
 * `LookoutAssignedEvent` convention); the real `ctx.gameMinute` for a sweep-triggered close.
 *
 * Consumers: NONE this lot (additive seam — design DD-P3).
 */
export interface SessionClosedEvent {
  readonly type: 'session_closed';
  readonly playerId: string;
  readonly sessionId: string;
  readonly gameMinute: number;
}

/**
 * `EquipmentFailedEvent` — canon event (04f-A C4) emitted by `EquipmentFailureService` (via
 * `MaintenanceRepository.applyEquipmentFailure`'s atomic-5 write, design §5) the moment a seeded weekly
 * (`EQUIPMENT_FAILURE_WEEKLY_TICK`, WEEKLY/11) or critical-daily (wired into `MAINTENANCE_PHASE_TICK`,
 * NIGHTLY/21, D11) roll FAILS: `structural_state` just flipped `'operational' → 'failed'` and the
 * `equipment_failure_log` row is committed.
 *
 * Qualitative only — NO `roll_detail` / probability / baseline / seed (R2.2/P5 — those stay BO-only on the
 * log row, DD-M3). Consumer: `EquipmentFailureExceptionProducerService` (C5 — subscribes to raise the
 * 4-option repair card, the exact `BuildingRaidedEvent`→`RaidExceptionProducerService` precedent). No
 * consumer wired yet in C4 (an honest producer-only landing, the SAME posture `MaintenancePhaseChangedEvent`
 * had at its own C2 introduction) — the event is REAL and fires now; the card is C5's job.
 */
export interface EquipmentFailedEvent {
  readonly type: 'equipment_failed';
  readonly buildingId: string;
  readonly playerId: string;
  readonly gameMinute: number;
}

/**
 * `ExceptionAgedOutEvent` — P3-A C3 (D4): emitted by `ExceptionQueueTickService.runTick`
 * (`EXCEPTION_QUEUE_TICK`, NIGHTLY/22 provisional) for every PENDING card it transitions to
 * `resolution_status='aged_out'` (past `core_loops.exception_aged_out_horizon_hours`). The honest
 * transposition of canon's "lieutenant's default rule fires" — carries `fallback: 'NO_OP'` so a
 * consumer never needs to guess which fallback ran (no default-rule execution machine exists, D4).
 *
 * Qualitative-identity only — no raw severity/priority/confidence (R2.2/P5).
 *
 * Consumers: NONE this lot (additive seam — P3-B/E/telemetry subscribe to later, design DD-P3).
 */
export interface ExceptionAgedOutEvent {
  readonly type: 'exception_aged_out';
  readonly playerId: string;
  readonly exceptionId: string;
  readonly lieutenantId: string | null;
  readonly fallback: 'NO_OP';
  readonly gameMinute: number;
}

/**
 * `StructuralDecisionCommittedEvent` — P3-A C5 (D8, DD-P3): emitted by
 * `StructuralDecisionGovernorService.commit` after EVERY successful structural commit — sessionful
 * (cap-bound) AND sessionless (pass-through-audited, D9) alike. `decisionType` is the catalogue KEY
 * (qualitative — R2.2/P5; the raw `decision_type` int is BO-only, `structural_decisions_audit`).
 * `sessionRef` mirrors the audit row's `after_state._session` (null for a sessionless commit — the D9
 * proof surface). `gameMinute=0` — every LIVE retrofit site is a player-triggered HTTP action, no
 * scheduler ctx (the `SessionOpenedEvent` convention).
 *
 * Consumers: NONE this lot (additive seam — P3-B/E/H/telemetry subscribe to later, design DD-P3).
 */
export interface StructuralDecisionCommittedEvent {
  readonly type: 'structural_decision_committed';
  readonly playerId: string;
  readonly decisionType: string;
  readonly sessionRef: string | null;
  readonly gameMinute: number;
}

/**
 * `FlagRaisedEvent` — P3-B C2 (D3/D4, DD-P3): emitted by `FlagDisciplineService.flagItem` the moment a
 * deviant `routine_items` candidate WINS its atomic token deduction AND its `flagged_items` INSERT lands
 * (i.e. NOT emitted on a no-token skip, nor on an insert-failure-compensated race loss — `flagged: false`
 * results emit nothing). `gameMinute=0` for the C2 `force-flag` test-seam / any other non-tick caller (the
 * `SessionOpenedEvent` convention); the REAL C4 `FLAG_DISCIPLINE_TICK` (NIGHTLY/24 provisional) will pass
 * its own `ctx.gameMinute` when it starts calling this same method for real generation-time flags.
 *
 * Qualitative-identity only — NO `deviation_score_internal` (R2.2/P5; that stays BO-only on the row).
 *
 * Consumers: NONE this lot (additive seam — P3-B/E/telemetry subscribe to later, design DD-P3).
 */
export interface FlagRaisedEvent {
  readonly type: 'flag_raised';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly flagId: string;
  readonly routineItemId: string;
  readonly gameMinute: number;
}

/**
 * `FlagVerdictEvent` — P3-B C2 (D10, DD-P3): emitted by `FlagDisciplineService.validateFlag` /
 * `dismissFlag` on a TRANSITION-WIN only (the `resolveFlagTransition` arbiter actually flipped the row —
 * a transition-lose 409s before this ever fires, D3 concurrency floor). `verdict` ∈
 * `validated | dismissed | timed_out` (the 3rd value reserved for C4's NIGHTLY timeout step — this chunk
 * only ever emits the first two). `gameMinute=0` — validate/dismiss are ALWAYS player-triggered HTTP
 * actions, no scheduler ctx (the `SessionOpenedEvent`/`StructuralDecisionCommittedEvent` convention).
 *
 * Qualitative-identity only — NO raw token counts/deltas (R2.2/P5; those stay BO-only).
 *
 * Consumers: NONE this lot (additive seam — P3-B/E/telemetry subscribe to later, design DD-P3).
 */
export interface FlagVerdictEvent {
  readonly type: 'flag_verdict';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly flagId: string;
  readonly verdict: 'validated' | 'dismissed' | 'timed_out';
  readonly gameMinute: number;
}

/**
 * `FlagTokenExhaustionEvent` — P3-B C4 (D9, DD-P3): emitted by `FlagExhaustionFallbackService.
 * raiseIfClear` the moment a genuinely-urgent, token-exhausted concern ACTUALLY lands a REAL
 * `exception_queue` card (`exceptionId`) through the spine (D9 REUSE — zero `EffectType` edits). NOT
 * emitted on a `deduped` (hazard 4 — an unrelated pending card already covers this lieutenant) or
 * `cap_refused` outcome — only a genuine insert.
 *
 * Qualitative-identity only — NO `deviation_score_internal` (R2.2/P5; that stays BO-only on the
 * `routine_items`/`exception_queue` rows).
 *
 * Consumers: NONE this lot (additive seam — the C7 BO `token-exhaustion-events` surface reads the
 * PERSISTED row back by payload tag, not this event; P3-E/telemetry subscribe to the event later,
 * design DD-P3).
 */
export interface FlagTokenExhaustionEvent {
  readonly type: 'flag_token_exhaustion';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly routineItemId: string;
  readonly exceptionId: string;
  readonly gameMinute: number;
}

/**
 * `FlagWeeklyResetEvent` — P3-B C5 (D8, DD-P3): emitted by `FlagWeeklyResetTickService.runTick` once PER
 * `lieutenant_flag_state` row the epoch-guarded reset UPDATE actually touched (mirrors `FlagRaisedEvent`/
 * `FlagVerdictEvent`'s own per-entity emission granularity — never one aggregate event for the whole
 * batch). Fires for EVERY row the WHERE clause matched, including a lieutenant already AT max tokens (the
 * epoch guard advances regardless — "reset to max regardless of recent burns", canon-verbatim); NEVER
 * fires on a same-epoch re-run (zero rows matched -> zero events, the D8 idempotency proof). `gameMinute`
 * is the tick's own `ctx.gameMinute` (0 for the `run-weekly-reset` test-seam / non-scheduler caller — the
 * `SessionOpenedEvent` convention).
 *
 * Qualitative-identity only — NO raw token counts (R2.2/P5; those stay BO-only on the row).
 *
 * Consumers: NONE this lot (additive seam — P3-B/E/telemetry subscribe to later, design DD-P3).
 */
export interface FlagWeeklyResetEvent {
  readonly type: 'flag_weekly_reset';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly epoch: number;
  readonly gameMinute: number;
}

/**
 * `StackCommittedEvent` — P3-D C2 (ch05 Loop 6 Cue Stack Integrity, design §4.3/§10): emitted by
 * `CueStackService.commit` on the ONE winning atomic commit (I2 — never on the 409 no-pending-row
 * branch; the RETURNING itself gates the emit). `sessionRef` mirrors `StructuralDecisionCommittedEvent`'s
 * own D9 zero-regression convention — `null` for a sessionless commit, never a forced session. `slotCount`
 * is the committed stack's own slot count (qualitative-adjacent — an int the player themselves composed,
 * not a derived secret; R2.2/P5 still forbids any DURATION/multiplier/cursor scalar here). `gameMinute` is
 * a REAL read (`CueStackRepository.getCurrentGameMinute`, the `MaintenanceScheduledEvent` convention — a
 * player-triggered HTTP action still stamps the live game-minute, not a placeholder 0).
 *
 * Consumers: NONE this lot (additive seam — C3's tick / C7's HL provider 108 `CUE_CASCADE_FALLOUT` / BO /
 * telemetry subscribe later, design DD-P3 precedent).
 */
export interface StackCommittedEvent {
  readonly type: 'stack_committed';
  readonly playerId: string;
  readonly cueStackId: string;
  readonly sessionRef: string | null;
  readonly slotCount: number;
  readonly gameMinute: number;
}

/**
 * `SlotExecutedEvent` — P3-D C3 (ch05 Loop 6, design §5.2): emitted by `CueStackExecutionTickService`
 * when a slot's FIRING succeeds (`status='done'` — dependencies satisfied AND the underlying executor
 * verb did not throw). Qualitative-identity only (`slotType`/`slotId`/`cueStackId` — the player themselves
 * authored these at compose, R2.2/P5 still forbids any duration/multiplier/cursor scalar here).
 *
 * Consumers: NONE this lot (additive seam — telemetry/BO subscribe later, DD-P3 precedent).
 */
export interface SlotExecutedEvent {
  readonly type: 'slot_executed';
  readonly playerId: string;
  readonly cueStackId: string;
  readonly slotId: string;
  readonly slotType: string;
  readonly gameMinute: number;
}

/**
 * `SlotFailedEvent` — P3-D C3 (ch05 Loop 6, design §5.2/§6.2/D4) + C4 (§7, ADDITIVE `failed_disrupted`
 * member): emitted when a slot's FIRING does NOT succeed — `failed_collision` (unsatisfied intra-stack
 * dependency, design §6.1/§6.2 — the verb never ran), `failed_executor` (the real verb threw, D4 — never
 * a retry, the cursor still advances), or `failed_disrupted` (C4 §7 — a `HeatEscalationEvent`/
 * `BuildingRaidedEvent` on the slot's OWN targeted building transitioned it OUT OF BAND, before the
 * cursor's own turn ever reached it — `CueStackDisruptionService` emits this one, never the tick itself).
 * `reason` is the closed 3-member discriminator (never a raw error message/stack — that stays server-log
 * only). Consumers: NONE this lot (`CueCascadeExceptionProducer` is a NEW caller of the spine `insert`,
 * not a subscriber of THIS event — additive seam, DD-P3 precedent).
 */
export interface SlotFailedEvent {
  readonly type: 'slot_failed';
  readonly playerId: string;
  readonly cueStackId: string;
  readonly slotId: string;
  readonly slotType: string;
  readonly reason: 'failed_collision' | 'failed_executor' | 'failed_disrupted';
  readonly gameMinute: number;
}

/**
 * The 6 `InitiatingChangeRegistry` LIVE members (P3-D C6, design §9.2; P3-E C4 flips `BUILDING_
 * DECOMMISSION` into this set, design §3.2) — inlined here (never a cross-module import of
 * `core_loops/annealing`'s own catalogue) mirroring `SlotFailedEvent.reason`'s own established "closed
 * literal union, no producer-module import into this leaf bus file" convention.
 */
type AnnealingInitiatingChangeType =
  | 'ROUTE_CREATED'
  | 'ROUTE_REBUILT'
  | 'LIEUTENANT_REASSIGNED'
  | 'NEW_HIRE'
  | 'MAJOR_SCRIPT_EDIT'
  | 'BUILDING_DECOMMISSION';

/**
 * `RouteCreatedEvent` — P3-D C6 (ch05 Loop 7 Annealing Window, design §9.2 table): emitted by `RouteService.
 * createRoute` on every genuinely persisted saved route (ADDITIVE — no existing consumer disturbed).
 * `originBuildingId`/`destinationBuildingId` are the ChangeType.ROUTE_CREATED "affected subgraph" — BOTH
 * endpoints anneal (design §9.2). `gameMinute` is whatever the caller passed to `createRoute` (the
 * controller currently always stamps a fixed `0` — pre-existing behavior, untouched by this chunk).
 *
 * Consumers: `AnnealingInitiationSubscriberService` (P3-D C6, NEW) — initiates/compounds settling on BOTH
 * buildings.
 */
export interface RouteCreatedEvent {
  readonly type: 'route_created';
  readonly playerId: string;
  readonly routeId: string;
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
  readonly gameMinute: number;
}

/**
 * `RouteRebuiltEvent` — P3-D C6 (design §9.2 table): emitted by `RouteRebuildService.rebuild` after a
 * successful rebuild (`applyRebuildResult` committed — ALL 3 modes, never on a refused/409 attempt).
 * `originBuildingId`/`destinationBuildingId` mirror `RouteCreatedEvent`'s own "both endpoints anneal" shape.
 *
 * Consumers: `AnnealingInitiationSubscriberService` (P3-D C6, NEW).
 */
export interface RouteRebuiltEvent {
  readonly type: 'route_rebuilt';
  readonly playerId: string;
  readonly routeId: string;
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
  readonly gameMinute: number;
}

/**
 * `LieutenantReassignedEvent` — P3-D C6 (design §9.2 table + §3.4 the reconciliation): emitted by
 * `LieutenantService.reassign` on its ONE atomic move+reset+settling write (never on a 404/409 refusal).
 * `oldBuildingId` is the lieutenant's PRIOR `assigned_building_id` (`null` if it was unassigned — a
 * defensive edge the Phase-11 schema itself allows, design §3.4 "ancien + nouveau building"); `newBuildingId`
 * is the destination. This event is STRICTLY additive to the Phase-11 lieutenant-settling write — it
 * carries NO tenure/settling-tick scalar of its own (R2.2; those stay `lieutenant.*`-internal, untouched).
 *
 * Consumers: `AnnealingInitiationSubscriberService` (P3-D C6, NEW) — initiates/compounds settling on
 * `oldBuildingId` (if non-null) AND `newBuildingId` (the "affected subgraph" transposed to the real
 * geography, design §3.4 — the coexist-disjoint reconciliation, ★ ruling ★#1).
 */
export interface LieutenantReassignedEvent {
  readonly type: 'lieutenant_reassigned';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly oldBuildingId: string | null;
  readonly newBuildingId: string;
  readonly gameMinute: number;
}

/**
 * `HireCompletedEvent` — P3-D C6 (design §9.2 table): emitted by `RecruitmentQuestService.finalizeHire`
 * ONLY on the winning branch of `finalizeHireAtomic`'s own RETURNING (never on the "quest was concurrently
 * ended" 409 branch) — pool-agnostic (saltline/defector/civilian all funnel through the SAME `finalizeHire`,
 * so this ONE emit site covers the canon "new hire" initiator for every pool).
 *
 * Consumers: `AnnealingInitiationSubscriberService` (P3-D C6, NEW) — initiates/compounds settling on
 * `assignedBuildingId` (the newly-hired lieutenant's building).
 */
export interface HireCompletedEvent {
  readonly type: 'hire_completed';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly assignedBuildingId: string;
  readonly gameMinute: number;
}

/**
 * `ScriptAttachedEvent` — P3-D C6 (design §9.2 table): emitted by `LieutenantService.attachScript`
 * ALONGSIDE the EXISTING Phase-11 A3 re-script settling-window-open block — i.e. ONLY on a genuine
 * REVISION (`wasValid===true`, a valid→valid re-script), NEVER on the FIRST authoring (`false→true` — the
 * SAME no-regression distinction the Phase-11 window itself already draws at this exact site, design §9.2
 * anchor note + C0 re-anchor §8.4 row 1: "the EXISTING Phase-11 re-script settling-window-open call sits
 * at :510-519 — where C6's additive one-line bus emit will sit alongside it"). `buildingId` is the
 * lieutenant's CURRENT `assigned_building_id` (`null` if unassigned — defensive; nothing to anneal then).
 *
 * Consumers: `AnnealingInitiationSubscriberService` (P3-D C6, NEW).
 */
export interface ScriptAttachedEvent {
  readonly type: 'script_attached';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly buildingId: string | null;
  readonly gameMinute: number;
}

/**
 * `SettlingInitiatedEvent` — P3-D C6 (ch05 Loop 7, design §9.2/§9.3): emitted by `AnnealingService.
 * initiateOrCompound` on the FRESH-INITIATION branch of the I5 UPSERT ONLY (never on the compounding
 * branch — see `CompoundingStrainEvent`). `changeType`/`ref` identify the initiating change (design §9.1
 * `ChangeRef`, inlined via `AnnealingInitiatingChangeType` above — the SAME "closed literal union, no
 * producer-module import into this leaf bus file" convention `SlotFailedEvent.reason` established).
 * `band` is the qualitative `SettlingBandBucket` ONLY (P1/P5 strict — NEVER `settling_ends_at`/the raw
 * remaining minutes on this event).
 *
 * Consumers: NONE this lot (additive seam — telemetry/BO subscribe later, DD-P3 precedent).
 */
export interface SettlingInitiatedEvent {
  readonly type: 'settling_initiated';
  readonly playerId: string;
  readonly buildingId: string;
  readonly changeType: AnnealingInitiatingChangeType;
  readonly ref: string;
  readonly band: 'short' | 'medium' | 'long';
  readonly gameMinute: number;
}

/**
 * `CompoundingStrainEvent` — P3-D C6 (design §9.3): emitted on the COMPOUNDING branch of the SAME I5
 * UPSERT (the row was ALREADY actively settling when this change landed). NEVER carries
 * `changesDuringSettling`/the raw `throughput_multiplier` (R2.2 — a compounding COUNT/multiplier scalar
 * stays server-only even cross-system; `band` is the ONLY qualitative signal this event exposes, mirroring
 * `SlotFailedEvent`'s own closed-discriminator-only discipline).
 *
 * Consumers: NONE this lot (additive seam — DD-P3 precedent).
 */
export interface CompoundingStrainEvent {
  readonly type: 'compounding_strain';
  readonly playerId: string;
  readonly buildingId: string;
  readonly changeType: AnnealingInitiatingChangeType;
  readonly ref: string;
  readonly band: 'short' | 'medium' | 'long';
  readonly gameMinute: number;
}

/**
 * `SettlingCompletedEvent` — P3-D C6 (design §9.4): emitted by `AnnealingSettleSweepService.runSweep` ONLY
 * for rows the sweep's OWN conditional `UPDATE … WHERE settled=false AND settling_ends_at<=now() RETURNING`
 * actually flipped THIS call (I6 exactly-once — the RETURNING gates the emit; a re-sweep of an
 * already-settled row emits nothing). `gameMinute` is always `0` here — this is a GLOBAL, real-clock sweep
 * (mirrors `LiveOpsSchedulerService`'s own MINUTE/24 precedent, `live-ops-scheduler.service.ts`): unlike a
 * player-triggered HTTP verb or a per-player scheduler tick, there is no single natural "this player's
 * current game-minute" to stamp for a sweep that may flip rows belonging to MANY different players in ONE
 * pass — `0` is the SAME documented placeholder convention `FlagWeeklyResetEvent` already establishes for
 * "a non-scheduler / no-natural-tick caller" above.
 *
 * Consumers: NONE this lot (additive seam — DD-P3 precedent).
 */
export interface SettlingCompletedEvent {
  readonly type: 'settling_completed';
  readonly playerId: string;
  readonly buildingId: string;
  readonly gameMinute: number;
}

/**
 * Emitted by `OffHoursDriftDetectorService` (`AMBIENT_DAILY_TICK` NIGHTLY/27, phase 2 — 04g-A C3, design
 * §3.4) when a district's off-hours `constant_hum_cell` EMAs trip the `drift_significant` composite (≥3
 * mature off-hours cells ≥ 0.25 relative drift vs the detector's own rolling `off_hours_drift_detection`
 * baseline — see `off-hours-drift.detector.ts`'s own header for the D10 mechanics resolution). The
 * underlying trip is DISTRICT-level (ONE `off_hours_drift_detection` row per district per trip), but the
 * Exception-card fan-out is PLAYER-level (design §3.4: "chaque joueur ayant ≥ 1 building dans le district
 * drifté") — this event is emitted ONCE PER AFFECTED PLAYER (mirrors every other CityEvent's
 * per-player-identity shape) so `AmbientDriftExceptionProducerService` (the S5 pattern — `OnModuleInit` +
 * `ExceptionsRepository.hasPendingPlayerLevelCard` dedup) can react exactly like
 * `HeatPressureExceptionProducerService` does for `HeatEscalationEvent`. Carries NO raw drift magnitude
 * (R2.2 — the card's copy is a FIXED i18n key, never magnitude-dependent; the raw `drift_relative` stays
 * BO-only on the `off_hours_drift_detection` row). Consumer: `AmbientDriftExceptionProducerService`
 * (`operational/ambient/ambient-drift-exception-producer.service.ts`, 04g-A C3).
 */
export interface OffHoursDriftDetectedEvent {
  readonly type: 'off_hours_drift_detected';
  readonly playerId: string;
  readonly districtId: number;
  readonly gameDay: number;
}

/**
 * Emitted by `RandomWorldCouplingService.applyCouplingDiscovery` (04g-B C3, design §3.6) when a player's
 * `coupling_discovery_cascade` row is FRESHLY INSERTED (never on a gated attempt — cap OR
 * already-exposed — those are silent, counted elsewhere via `random_world_daily_run.gated_cascade_attempts`,
 * design §3.6 "rejette silencieusement mais COMPTÉES"). Fired ONCE PER ADMITTED PLAYER (mirrors
 * `OffHoursDriftDetectedEvent`'s own per-player-identity shape) so
 * `RandomWorldExceptionProducerService` (the S14 pattern — `OnModuleInit` +
 * `ExceptionsRepository.hasPendingPlayerLevelCard` dedup) can react exactly like
 * `AmbientDriftExceptionProducerService` does for `OffHoursDriftDetectedEvent`. Carries NO raw
 * probability/condition (R2.2 — the card's copy is a FIXED i18n key; the pair's condition/probability
 * never escape to the client). Consumer: `RandomWorldExceptionProducerService`
 * (`operational/random_world/random-world-exception-producer.service.ts`, 04g-B C3).
 */
export interface CouplingDiscoveryExposedEvent {
  readonly type: 'coupling_discovery_exposed';
  readonly playerId: string;
  readonly pairKey: string;
  readonly cascadeId: string;
  readonly gameDay: number;
}

/**
 * `EfficiencyPenaltyAppliedEvent` — P3-E C2 (ch05 Loop 8, design §5.1): emitted by
 * `FrictionBudgetTickService.runTick` (`FRICTION_BUDGET_TICK` NIGHTLY/31) ONLY on the I4-guarded FRESH
 * `false → true` transition of `friction_budget_state.efficiency_penalty_active` (`FrictionBudgetRepository.
 * applyOrRevertPenalty`'s own RETURNING gates this emit — a re-tick that finds the penalty already active
 * emits nothing). `bucket` is the qualitative `FrictionBudgetBucket` ONLY (R2.2 — NEVER the raw
 * `friction_budget_total`/`friction_org_size`/`friction_threshold` scalars, mirrors `SettlingInitiatedEvent
 * .band`'s own "qualitative signal only" discipline).
 *
 * Consumer: `FrictionThresholdExceptionProducer` is called IN-LINE by the SAME tick (DD-P2 precedent — no
 * bus subscriber needed for that call); this event itself has NO subscriber yet (additive seam —
 * telemetry/BO subscribe later, DD-P3 precedent).
 */
export interface EfficiencyPenaltyAppliedEvent {
  readonly type: 'efficiency_penalty_applied';
  readonly playerId: string;
  readonly bucket: 'light' | 'balanced' | 'strained' | 'overloaded';
  readonly gameMinute: number;
}

/**
 * `EfficiencyPenaltyRevertedEvent` — P3-E C2 (design §5.1, divergence #9 — additive vs canon, which names
 * only `Applied`; necessary for the observability of the invariant's own "reversible" half). Emitted by
 * the SAME tick ONLY on the I4-guarded FRESH `true → false` transition. Carries NO magnitude (mirrors
 * `SettlingCompletedEvent`'s own minimal completion-event shape — identity + gameMinute only).
 *
 * Consumers: NONE this lot (additive seam — DD-P3 precedent; C3's output-site teeth read the LIVE
 * `friction_budget_state.efficiency_penalty_active` column directly, they do not subscribe to this event).
 */
export interface EfficiencyPenaltyRevertedEvent {
  readonly type: 'efficiency_penalty_reverted';
  readonly playerId: string;
  readonly gameMinute: number;
}

/**
 * `NodeDecommissionedEvent` — P3-E C4 (ch05 Loop 8, design §3.2/§6.3/D16): emitted POST-COMMIT by
 * `DecommissionService.decommission` (`DecommissionRepository.decommissionOwnedNode`'s own tx already
 * committed by the time this fires — belt-and-suspenders, mirrors every OTHER P3-D/P3-E verb-site emit
 * convention). `neighborBuildingIds` are EMBEDDED (computed INSIDE the decommission tx, BEFORE the
 * node's routes were severed, §3.2) — the subscriber (`AnnealingInitiationSubscriberService`) never
 * re-queries a state THIS SAME verb already mutated (0-race by construction, the SAME "voisins
 * pré-calculés" discipline `RouteCreatedEvent`'s own 2-building shape established). `freedBlockId` is
 * the world_geography block id the decommissioned node occupied (soft-ref — R2.2, an int, never a raw
 * cost/timestamp).
 */
export interface NodeDecommissionedEvent {
  readonly type: 'node_decommissioned';
  readonly playerId: string;
  readonly buildingId: string;
  readonly freedBlockId: number;
  readonly neighborBuildingIds: string[];
  readonly gameMinute: number;
}

/**
 * `CompressionWeekTriggeredEvent` — P3-E C6 (ch05 Loop 9, design §9.2): emitted by
 * `CompressionStressSubscriber` the moment `org_stress` crosses `compression_stress_threshold_trigger`
 * (85 default) at a session-close's own weighted stress update — the `compression_week_state`
 * `'none' -> 'warning'` transition, GUARDED exactly-once (the SAME `WHERE compression_week_state = 'none'`
 * single-statement guard that opens the `compression_events` row, I1 — a repeat crossing while already
 * `'warning'` fires NOTHING, design §9.2's own "le deferral NE change PAS cette valeur"). `stressAtFire`
 * is the qualitative-unsafe RAW scalar (R2.2 — BO/internal ONLY, never forwarded to any player-facing
 * projection; C8 owns the bucket-safe `compression_glance`/`GET /v1/compression/state` wall).
 *
 * Consumers: NONE this lot (additive seam — `ProblemAggregator`/board-seeding is C7's own subscriber,
 * DD-P3 precedent).
 */
export interface CompressionWeekTriggeredEvent {
  readonly type: 'compression_week_triggered';
  readonly playerId: string;
  readonly compressionEventId: string;
  readonly stressAtFire: number;
  readonly gameMinute: number;
}

/**
 * `CompressionWeekFinalizedEvent` — P3-E C7 (ch05 Loop 9, design §10.4): emitted POST-COMMIT by
 * `CompressionFinalizeService.finalize` the moment `compression_events.state` flips `'active' ->
 * 'finalized'` (I8, guarded exactly-once — a losing racer's `finalizeIfEligible` returns
 * `finalized: false` and this event never fires for it). `hasCriticalResidue` is the qualitative-safe
 * ★#6 tooth-3 signal (whether the stress floor applied vs the plain reset) — `orgStressAfter` is the
 * qualitative-UNSAFE raw scalar (R2.2 — BO/internal ONLY, mirrors `CompressionWeekTriggeredEvent`'s own
 * `stressAtFire`, never forwarded to any player-facing projection).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry hook later, DD-P3 precedent).
 */
export interface CompressionWeekFinalizedEvent {
  readonly type: 'compression_week_finalized';
  readonly playerId: string;
  readonly compressionEventId: string;
  readonly hasCriticalResidue: boolean;
  readonly orgStressAfter: number;
  readonly gameMinute: number;
}

/**
 * `PrecursorOrderFilledEvent` — P3-F C2 (ch06 Delegation Ratchet, design §6 SUPPLY_SOURCING binding; C0
 * re-anchor §5.2 gap closure): emitted by `PrecursorArrivalService.runMinuteTick` immediately after
 * `applyArrivalBatch` succeeds, ONCE PER ARRIVED ORDER (fulfillment — matching canon's literal "order
 * FILLED" language, NOT placement; `PrecursorService.order()` itself emits nothing). No precursor-related
 * bus event existed before this chunk (C0 §5.2 — confirmed zero hits). Additive, no existing consumer
 * disturbed.
 *
 * Consumers: `MasteryAccumulatorService` (P3-F C2, SUPPLY_SOURCING +1).
 */
export interface PrecursorOrderFilledEvent {
  readonly type: 'precursor_order_filled';
  readonly playerId: string;
  readonly orderId: string;
  readonly buildingId: string;
  readonly precursorType: string;
  readonly quantityUnits: number;
  readonly gameMinute: number;
}

/**
 * `DirectHireCompletedEvent` — P3-F C2 (ch06 Delegation Ratchet, design §6 LIEUTENANT_HIRING binding; C0
 * re-anchor §5.3 gap-#1 closure): emitted by `LieutenantService.recruit` on the CLASSIC direct-recruit
 * path ONLY (`questExtension` undefined — `POST /v1/lieutenants`, the GOVERNED `LIEUTENANT_RECRUIT` site),
 * fired only on a successful recruit (never on a 404/409/422 refusal). Deliberately a SIBLING event to
 * `HireCompletedEvent`, not a reuse of it: `LieutenantService.recruit` is ALSO the method the quest-hire
 * flow calls internally (`RecruitmentQuestService.finalizeHire` → `this.lieutenants.recruit(...)`, which
 * already emits its OWN `HireCompletedEvent` after `recruit()` returns) — an unconditional emit of
 * `HireCompletedEvent` INSIDE `recruit()` would double-fire for every quest hire (once here, once from
 * `finalizeHire`) AND would silently widen `AnnealingInitiationSubscriberService`'s existing `onHire
 * Completed` trigger set to include direct hires it never anneals today (a zero-regression violation,
 * design §17 — "no existing producer... changes"). A distinct event type keeps BOTH existing consumers of
 * `HireCompletedEvent` byte-untouched while giving `MasteryAccumulatorService` a clean parity signal for
 * "a player who never touches the quest system can still earn LIEUTENANT_HIRING mastery" (C0 §5.3).
 *
 * Consumers: `MasteryAccumulatorService` (P3-F C2, LIEUTENANT_HIRING +1).
 */
export interface DirectHireCompletedEvent {
  readonly type: 'direct_hire_completed';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly assignedBuildingId: string;
  readonly gameMinute: number;
}

/**
 * `MasteryThresholdCrossedEvent` — P3-F C2 (ch06 Delegation Ratchet, design §7.3): emitted by
 * `MasteryAccumulatorService.applyDelta` the moment a (player, category) row's `mastery_score` crosses
 * `meta.mastery_retirement_threshold` in EITHER direction — `'ELIGIBLE'` (crossed upward, at/above the
 * threshold) or `'REGRESSED'` (crossed back below it). Fires EXACTLY ONCE per crossing (a delta that
 * moves the score without crossing the threshold, e.g. 40→41 while the threshold is 50, emits nothing).
 * NEVER the raw `mastery_score` (R2.2 — a qualitative direction signal only; the org-overview/BO surface
 * reads it, C3+). Append-only fact, no consumer required to exist yet (design §4).
 *
 * Consumers: NONE this lot (additive seam — the org-overview projection/BO dashboard subscribe later).
 */
export interface MasteryThresholdCrossedEvent {
  readonly type: 'mastery_threshold_crossed';
  readonly playerId: string;
  readonly categoryId: number;
  readonly direction: 'ELIGIBLE' | 'REGRESSED';
  readonly gameMinute: number;
}

/**
 * `GraduationCommittedEvent` — P3-F C5 (ch06 Delegation Ratchet, design §4/§8.2 "Post-commit:
 * `GraduationCommittedEvent` on the bus (proficiency freeze subscriber + BO/telemetry)"). Emitted by
 * `GraduationService.executeGraduation` AFTER the `graduation_events` GRADUATION row + successor install
 * have committed (`recordGraduation`, `graduation-events.repository.ts`) — the runtime name of the canon
 * `GraduationEvent` composite (kept distinct in prose per the design's own note: the append-only TABLE is
 * also named `graduation_events`, so the BUS event carries the `Committed` suffix to avoid a naming
 * collision in code/prose, never in the DB). `masteryAtEvent` is the frozen raw score (BO-only, R2.2 —
 * D8's own "player_proficiency = mastery_at_event" transposition target, C7's frozen-copy seeder).
 *
 * Consumers: NONE this lot (additive seam — `PlayerProficiencySeeder` subscribes at C7, design §4).
 */
export interface GraduationCommittedEvent {
  readonly type: 'graduation_committed';
  readonly playerId: string;
  readonly categoryId: number;
  readonly lieutenantId: string;
  readonly masteryAtEvent: number;
  readonly successorCategoryId: number | null;
  readonly gameMinute: number;
}

/**
 * `RecallDebtRecoveredEvent` — P3-F C7 (ch06 Delegation Ratchet, design §4/§10.4 "at 0 →
 * `RecallDebtRecoveredEvent` (badge lifts)"). Emitted by `RecallDebtSessionSubscriber` the moment its
 * per-`SessionClosedEvent` recovery decrement (`player_proficiency.recovery_period_remaining -= 1`)
 * brings a (player, category) row to EXACTLY 0 — never re-fired on a subsequent session close for a row
 * already at 0 (the decrement UPDATE's own `recovery_period_remaining > 0` guard stops matching, D9).
 * Qualitative only — NO raw debt/recovery values (R2.2/P5). `recovery_period_remaining` reaching 0 has no
 * real producer on this base until C8 (`PromotionLockService`) ships (no writer sets it > 0 yet) — the
 * decrement/event mechanism is REAL and fires now; only its trigger (a real recall) is C8's job (mirrors
 * `EquipmentFailedEvent`'s own "producer-only landing" posture at its own introduction).
 *
 * Consumers: NONE this lot (additive seam — `DegradedCategoryPressureProducer` subscribes at C9, design §4).
 */
export interface RecallDebtRecoveredEvent {
  readonly type: 'recall_debt_recovered';
  readonly playerId: string;
  readonly categoryId: number;
  readonly gameMinute: number;
}

/**
 * `RecallInitiatedEvent` — P3-F C8 (ch06 Delegation Ratchet, design §9.1 "Post-commit:
 * `RecallInitiatedEvent`"). Emitted by `PromotionLockService.requestRecall` AFTER the recall's own
 * `graduation_events` RECALL row + `promotion_locks` ACTIVE row have committed — the recall's own
 * post-commit counterpart to `GraduationCommittedEvent` (never fired on a lost concurrency race, a
 * validation refusal, or an induced/genuine post-flip failure — the recall's own compensation path never
 * reaches this emit, mirroring C5's own "post-commit event only on full success" discipline).
 * `fallbackQualityBucket` is the qualitative bucket only (LOW|DEGRADED|MINIMAL, R2.2 — never a raw
 * number).
 *
 * Consumers: NONE this lot (additive seam — the org-overview projection/BO dashboard subscribe later).
 */
export interface RecallInitiatedEvent {
  readonly type: 'recall_initiated';
  readonly playerId: string;
  readonly categoryId: number;
  readonly lieutenantId: string;
  readonly fallbackQualityBucket: 'LOW' | 'DEGRADED' | 'MINIMAL';
  readonly gameMinute: number;
}

/**
 * `UnmanagedWindowClosedEvent` — P3-F C8 (ch06 Delegation Ratchet, design §4/§9.2 "`PROMOTION_LOCK_TICK`
 * (HOURLY) closes expired windows: `CLOSED` + `closed_at` + `UnmanagedWindowClosedEvent`"). Emitted by
 * `PromotionLockTickService.runTick`, ONCE per `promotion_locks` row this HOURLY (or direct-invocation
 * test-route) call ACTUALLY closed — an idempotent re-run at the same/later tick matches zero rows and
 * emits nothing (the batch-close's own `WHERE unmanaged_window_state = 'ACTIVE'` guard, design §4).
 *
 * Consumers: NONE this lot (additive seam — the successor-SUSPENDED overlay lifts DERIVATIONALLY, by the
 * projection simply no longer finding an ACTIVE lock row; no consumer is required to exist for the state
 * to be correct, the SAME "append-only fact" posture every other P3-F event carries).
 */
export interface UnmanagedWindowClosedEvent {
  readonly type: 'unmanaged_window_closed';
  readonly playerId: string;
  readonly categoryId: number;
  readonly lockId: string;
  readonly gameMinute: number;
}

/**
 * `AccordDegradationEvent` — P3-F C8 (ch06 Delegation Ratchet, design §9.3 "the composite still records
 * target+severity buckets and emits `AccordDegradationEvent` (trace)"). Emitted by
 * `PromotionLockService.requestRecall`'s own `applyReversalDamage` step — ALWAYS, every recall, never
 * skipped (the "honest-inert, never skipped" contract design §9.3 states for whichever branch fires;
 * `applied` distinguishes a genuine REAL 04c ring write (`target`/`severity` meaningful) from the
 * theoretical inert fallback design §9.3 names for a non-live accord surface — C0's own R1 re-anchor
 * found the LIVE branch DEFINITIVE for this stack, so `applied` is `true` on every real recall this lot
 * ships; the field stays honest either way, never hardcoded).
 *
 * Consumers: NONE this lot (additive seam — trace/telemetry, BO forensics later).
 */
export interface AccordDegradationEvent {
  readonly type: 'accord_degradation';
  readonly playerId: string;
  readonly categoryId: number;
  readonly applied: boolean;
  readonly target: 'RESTRAINT_INDEX' | 'BOSS_MIRROR';
  readonly severity: number;
  readonly gameMinute: number;
}

/**
 * `CapabilityHorizonSurfacedEvent` — P3-G C3 (ch06 Budgets & Horizon, design §4/§7.3: "INSERT card
 * (unseen, surfaced_predicate_snapshot = the evaluated clause values) + `CapabilityHorizonSurfacedEvent`").
 * Emitted by `HorizonCardSurfacingService.processSessionOpened` (the `SessionOpenedEvent` subscriber)
 * POST-COMMIT, exactly once per (player, capability) INSERT-if-absent that actually landed a NEW row — a
 * race loser (the R10 unique index refused the INSERT, `ON CONFLICT DO NOTHING` returned zero rows) never
 * emits (design §7.3/plan §0.4 — the unique index is the race-freedom proof, never a double emit for the
 * SAME pair). `cardId` IS the design's own "predicateSnapshot ref" (§4) — the full per-clause verdict
 * array is persisted on the card row itself (`surfaced_predicate_snapshot`), never duplicated into the
 * event payload (R2.2/P5 — an id is a handle, not a leak, the SAME `RosterRow.lieutenant_id` precedent).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces).
 */
export interface CapabilityHorizonSurfacedEvent {
  readonly type: 'capability_horizon_surfaced';
  readonly playerId: string;
  readonly capabilityId: number;
  readonly cardId: string;
  readonly gameMinute: number;
}

/**
 * `CapabilityAdoptedEvent` — P3-G C5 (ch06 Budgets & Horizon, design §9/§4: "post-commit, full success
 * only: `CapabilityAdoptedEvent`"). Emitted by the (not-yet-built) `AdoptionService` AFTER the atomic
 * card-claim winner gate + the `capability_adoptions` INSERT have both committed (the #27 compensation
 * shape — a card-claim loser or any post-gate failure never reaches this emit).
 *
 * ★ WIRED DORMANT AT C4 (design §4/plan C4: "the `CapabilityAdoptedEvent` subscription lands here — wired
 * here, dormant until C5"): `BudgetRecomputeService` subscribes NOW (`onCapabilityAdopted`, P3-G C4) so
 * the recompute topology is complete per D13's own "all three events, one subscriber" shape — but NO
 * production emitter exists yet (C5's own job). `freeUnitsAtAdoption` mirrors the canon `ComplexityUnlock
 * Event.free_units_at_unlock` payload (BO forensics — the SAME value the `capability_adoptions.free_units_
 * at_adoption` column snapshots, design §3).
 *
 * Consumers: `BudgetRecomputeService` (P3-G C4, dormant — no real emitter yet); `VocabTierAdvancementService`
 * (P3-G C6) + `IsostaticDebtService.applyUpgrade` (P3-G C7) subscribe later, same event (D13).
 */
export interface CapabilityAdoptedEvent {
  readonly type: 'capability_adopted';
  readonly playerId: string;
  readonly capabilityId: number;
  readonly cardId: string;
  readonly freeUnitsAtAdoption: number;
  readonly gameMinute: number;
}

/**
 * `VocabTierAdvancedEvent` — P3-G C6 (ch06 Budgets & Horizon, design §11/D9: "Emits
 * `VocabTierAdvancedEvent` on an actual write only (zero-write replay emits nothing)"). Emitted by
 * `VocabTierAdvancementService` AFTER the monotone WHERE-guarded `rule_vocabulary_tier` UPDATE has
 * ACTUALLY landed a row (`RETURNING` non-empty) — a replayed `CapabilityAdoptedEvent` or an out-of-order
 * hand-emit (the WHERE double wall: `rule_vocabulary_tier = newVocabTier - 1`) never reaches this emit.
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces).
 */
export interface VocabTierAdvancedEvent {
  readonly type: 'vocab_tier_advanced';
  readonly playerId: string;
  readonly newVocabTier: number;
  readonly capabilityId: number;
  readonly gameMinute: number;
}

/**
 * `CapabilityDebtClearedEvent` — P3-G C7 (ch06 Budgets & Horizon, design §12.1/§12.2: "a clearing UPDATE
 * (pre>0 → post=0) emits `CapabilityDebtClearedEvent{decayPath}` exactly once"). Emitted by
 * `IsostaticDebtService.applyActiveDecay` (the `ScriptAttachedEvent` binding + the ADD_RULE resolve-hook
 * sibling) AFTER a floor-guarded decrement's `RETURNING` shows `structural_debt = 0` for a row that
 * matched the decrement's OWN `structural_debt > 0` WHERE (i.e. the decrement genuinely crossed pre>0 to
 * post=0 THIS call) — a row already at 0 never matches that WHERE, so a re-fire never re-emits (design
 * §12.4's own floor-holds contract). `decayPath` is the row's `decay_path` AT THE MOMENT of clearing
 * (ACTIVE this chunk; C8's passive tick may also clear a row, MIXED/PASSIVE possible there).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces).
 */
export interface CapabilityDebtClearedEvent {
  readonly type: 'capability_debt_cleared';
  readonly playerId: string;
  readonly capabilityId: number;
  readonly decayPath: 'ACTIVE' | 'PASSIVE' | 'MIXED';
  readonly gameMinute: number;
}

/**
 * `CycleExecutedOnPlanEvent` — P3-H C3 (ch06 Vertical Horizon, Decision Horizon Lock, design §4/§6.2:
 * "no-deviation -> EXECUTED_ON_PLAN + counter +1 + CycleExecutedOnPlanEvent"). Emitted by
 * `ExecutionPlanEvaluatorService.runTick` (the NIGHTLY/33 tick) AFTER a slot's guarded `slot_status ->
 * 'EXECUTED_ON_PLAN'` UPDATE actually landed (`RETURNING` non-empty) — a lost-race duplicate tick on the
 * SAME slot never reaches this emit (the Concurrence proof — no double counter increment, no double
 * event).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces).
 */
export interface CycleExecutedOnPlanEvent {
  readonly type: 'cycle_executed_on_plan';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly planId: string;
  readonly slotId: string;
  readonly gameMinute: number;
}

/**
 * `PlanAbortedEvent` — P3-H C3 (ch06 Vertical Horizon, Decision Horizon Lock, design §4/§6.3: "ABORT
 * (plan ABORTED, recovery per plan_abort_recovery_cost_pct, counter->0, PlanAbortedEvent)"). Emitted by
 * `ExecutionPlanEvaluatorService.runTick` AFTER the plan's guarded `plan_status -> 'ABORTED'` UPDATE
 * actually landed. `failedConstraintType` carries the FIRST failed clause's type (a qualitative audit tag
 * — never a raw counter, mirrors `StandingOrderLapsedEvent`'s own "qualitative order identity" framing);
 * the full `deviation_record` (every failed clause + severity) lives on the slot row for BO/admin reads
 * (design §11), never duplicated onto the event payload.
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces). ESCALATE has NO dedicated bus event (design §4's own event list) — the Exception
 * Queue insert itself (`exception_queue_spine`, the LIVE spine REUSE) is the ESCALATE disposition's ONLY
 * observable signal.
 */
export interface PlanAbortedEvent {
  readonly type: 'plan_aborted';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly planId: string;
  readonly slotId: string;
  readonly failedConstraintType: string;
  readonly gameMinute: number;
}

/**
 * `PlanAdaptedEvent` — P3-H C4 (ch06 Vertical Horizon, Decision Horizon Lock, design §4/§6.4: "if every
 * remaining slot now has a satisfiable constraint set -> slots ADAPTED, counter += 1 (absorption =
 * stable), PlanAdaptedEvent"). Emitted by `AdaptationResolverService.resolve` (the T3 ADAPT-mode
 * disposition) AFTER the plan's guarded `plan_status -> 'ADAPTED'` UPDATE actually landed (`RETURNING`
 * non-empty) — the SAME atomic-first "only after the write landed" discipline `PlanAbortedEvent`/
 * `CycleExecutedOnPlanEvent` already follow. `newStandingOrderId` carries the RE-DERIVED, still-valid
 * standing order the plan re-bound to (`StandingOrderRepository.getActiveOrInjecting(lieutenantId)`,
 * REUSE — "re-read the still-valid standing order", design §6.4) — the ADAPT-specific audit fact, mirrors
 * `PlanAbortedEvent.failedConstraintType`'s own "one qualitative fact this disposition adds" shape.
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces).
 */
export interface PlanAdaptedEvent {
  readonly type: 'plan_adapted';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly planId: string;
  readonly slotId: string;
  readonly newStandingOrderId: string;
  readonly gameMinute: number;
}

/**
 * `HorizonTierAdvancedEvent` — P3-H C4 (ch06 Vertical Horizon, Decision Horizon Lock, design §4/§6.6/D6:
 * "monotone `UPDATE ... decision_horizon_tier = :n WHERE decision_horizon_tier = :n-1` (monotone by
 * construction; a replayed/out-of-order advance is a zero-write) -> reset the counter ->
 * HorizonTierAdvancedEvent"). Emitted by `HorizonTierAdvancementService.advance` AFTER the monotone
 * WHERE-guarded `decision_horizon_tier` UPDATE has ACTUALLY landed a row (`RETURNING` non-empty) — a
 * replayed/out-of-order/lost-race call never reaches this emit (mirrors `VocabTierAdvancedEvent`'s own
 * "on an actual write only" discipline, D6/D9's SAME monotone-WHERE template — C0-reanchor §10/R8's own
 * "freshest, most-representative template ... StandingOrderLapsedEvent" finding, realized here per the
 * SAME interface+emit+on triad every sibling event in this file uses). `lieutenantId` is the TARGET
 * lieutenant whose `script_stability_counters` row gated this advance (D6 — "validate counter ... for the
 * target lieutenant"); `newTier` is player-shared (D1) — the tier itself is not per-lieutenant.
 *
 * Consumers: `BenchmarkQuotaService.onHorizonAdvanced` (P3-H C7 — the re-anchor quota upgrade, D12 — WIRED:
 * `BenchmarkQuotaService.onApplicationBootstrap` subscribes via `onHorizonTierAdvanced` below, raising
 * `player_reanchor_quotas.max_uses_per_week` to the tier band, design §9.4). ★ hazard-5: the coupling reads
 * ONLY `newTier` off THIS event (the DECISION-HORIZON axis) — `pressure_tier` (the separate C5 axis) is
 * never read by `BenchmarkQuotaService` (grep-zero, see that file's own header).
 */
export interface HorizonTierAdvancedEvent {
  readonly type: 'horizon_tier_advanced';
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly newTier: number;
  readonly gameMinute: number;
}

/**
 * `PressureTierUnlockedEvent` — P3-H C5 (ch06 Vertical Horizon, Pressure Inverse, design §4/§8.1/D8: "at
 * `pressure_tier_unlock_graduation_count` and `tier < 4` -> advance tier and (T4) stamp `tier4_observation_
 * until_tick` ... emit `PressureTierUnlockedEvent`"). Emitted by `PressureTierService.onGraduation` (←
 * `GraduationCommittedEvent`, the P3-F graduation ratchet) AFTER the guarded, single-statement `pressure_
 * tier` UPDATE actually landed the advance THIS call (`graduation_count_since_last_pressure_unlock` reads
 * back `0` — the reset-branch signal, `pressure-tier.service.ts`'s own header explains why this is a
 * reliable crossing-detector without a separate old-vs-new read). `newTier` is 2..4 (never 1 — tier 1 is
 * the floor, never "unlocked"). `observationOpen` is `true` ONLY on the T3->T4 transition (D8's own
 * "(T4) stamp" parenthetical) — the SAME qualitative-fact-not-raw-timestamp discipline `PlanAbortedEvent.
 * failedConstraintType` establishes (the raw `tier4_observation_until_tick` stays a DB column / the `GET
 * /v1/meta/pressure` projection, never duplicated onto the event payload).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces).
 */
export interface PressureTierUnlockedEvent {
  readonly type: 'pressure_tier_unlocked';
  readonly playerId: string;
  readonly newTier: number;
  readonly observationOpen: boolean;
  readonly gameMinute: number;
}

/**
 * `PressureTierObservationExpiredEvent` — P3-H C5 (ch06 Vertical Horizon, Pressure Inverse, design §4/D9:
 * "the FIRST governor/session-open read after expiry (or the next `SessionOpenedEvent`) emits `PressureTier
 * ObservationExpiredEvent` once (a `WHERE tier4_observation_until_tick IS NOT NULL AND now >= it` guarded
 * clear)"). Emitted by `PressureTierService.onSessionStart` (← `SessionOpenedEvent`) AFTER the guarded
 * `tier4_observation_until_tick -> NULL` UPDATE actually matched a row THIS call (a session-open with no
 * open/expired window, or a window still genuinely open, never reaches this emit — see that service's own
 * header for the full guard account) — fires EXACTLY ONCE per observation window, never on a later
 * session-open for the same (already-cleared) window.
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces).
 */
export interface PressureTierObservationExpiredEvent {
  readonly type: 'pressure_tier_observation_expired';
  readonly playerId: string;
  readonly pressureTier: number;
  readonly gameMinute: number;
}

/**
 * `BaselineAutoUpdatedEvent` — P3-H C6 (ch06 Vertical Horizon, Benchmark Drift, design §9.2/D11: "at
 * `benchmark_auto_update_threshold_pct` -> snapshot the real value ... + `BaselineAutoUpdatedEvent` (BO-only,
 * never surfaced player)"). Emitted by `BenchmarkDriftService.runTick` AFTER `PlayerMetricBenchmarksRepository
 * #accumulateAndMaybeAutoUpdate`'s own guarded UPDATE actually performed a crossing THIS call (that method's
 * own header carries the full "why this can only fire once per genuine transition" proof — a same-game-day
 * repeat call for an already-crossed row is a true zero-write, never reaching this emit again).
 * `metricKind` is the LIVE metric that crossed (`SAFEHOUSE_UTILIZATION`|`COURIER_DELIVERY_RATE`, ★H-3);
 * `newBaselineValue` is the REAL current value the baseline just silently snapshotted TO — the SAME "post-
 * write fact, not a raw internal" discipline `PressureTierUnlockedEvent.newTier` establishes (this is the
 * new PUBLIC baseline, not the raw drift_accumulator pct, which never leaves the DB row — P5).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later, mirrors every other NEW event
 * this lot introduces). ★ BO-ONLY BY DESIGN: no player-facing projection EVER reads this event — the
 * silent-invalidation canon seed (design §9.2's own "never surfaced player") is enforced by simple omission,
 * never a player-facing subscriber existing to filter it.
 */
export interface BaselineAutoUpdatedEvent {
  readonly type: 'baseline_auto_updated';
  readonly playerId: string;
  readonly metricKind: string;
  readonly newBaselineValue: number;
  readonly gameMinute: number;
}

/**
 * `LaggingIndicatorRevealedEvent` — P3-H C7 (ch06 Vertical Horizon, Benchmark Drift, design §9.3/D11: "if
 * old was `ABOVE_ACTUAL` -> `LaggingIndicatorRevealedEvent` (the canon 'your good threshold masked a
 * decline')"). Emitted by `BenchmarkDriftService.reAnchor` — ONLY when the PRE-re-anchor baseline was
 * genuinely ABOVE the real current value (a stale "good" threshold that was silently masking a decline);
 * canon's own `LaggingIndicatorSignalEnum` also names `BELOW_ACTUAL`/`AT_ACTUAL`, but per canon's own
 * §Re-anchor action step 3 ("si l'ancien benchmark était au-dessus ... émettre") the event fires ONLY on the
 * ABOVE_ACTUAL branch — never for BELOW/AT (a non-lagging or improved re-anchor is silent, the falsifiable's
 * own "baseline ≈ real -> no event"). `oldBaselineValue`/`newBaselineValue` are the REAL pre/post snapshot
 * values (never the raw `drift_accumulator` pct — P5, the SAME "post-write fact, not a raw internal"
 * discipline every sibling event in this file follows).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry + the Unity `LaggingIndicatorRevealPanel`, TD-320+,
 * subscribe later, mirrors every other NEW event this lot introduces).
 */
export interface LaggingIndicatorRevealedEvent {
  readonly type: 'lagging_indicator_revealed';
  readonly playerId: string;
  readonly metricKind: string;
  readonly oldBaselineValue: number;
  readonly newBaselineValue: number;
  readonly gameMinute: number;
}

/**
 * `ReAnchorExecutedEvent` — P3-H C7 (ch06 Vertical Horizon, Benchmark Drift, design §9.3/D11: "decrement
 * quota -> `ReAnchorExecutedEvent`"). Emitted by `BenchmarkDriftService.reAnchor` AFTER the single-statement
 * guarded quota decrement (`BenchmarkQuotaService.claimReAnchorUse` -> `PlayerReanchorQuotasRepository
 * #claimUse`) actually landed AND every requested metric was snapshotted THIS call — a request refused at
 * the quota gate (409 `REANCHOR_QUOTA_EXHAUSTED`) or the metrics-count gate (422) never reaches this emit
 * (no partial re-anchor is ever observable on the bus). `metricKinds`/`laggingRevealed` are INDEX-CORRELATED
 * (canon's own `ReAnchorExecutedEvent.lagging_revealed: bool[]` shape verbatim); `usesRemaining` is the
 * POST-decrement quota (the player's own next-available count).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry subscribe later).
 */
export interface ReAnchorExecutedEvent {
  readonly type: 'reanchor_executed';
  readonly playerId: string;
  readonly metricKinds: readonly string[];
  readonly laggingRevealed: readonly boolean[];
  readonly usesRemaining: number;
  readonly gameMinute: number;
}

/**
 * `ReAnchorQuotaUpgradedEvent` — P3-H C7 (ch06 Vertical Horizon, Benchmark Drift, design §9.4/D12: "Quota
 * upgrade: `onHorizonAdvanced` (<- `HorizonTierAdvancedEvent`) raises `max_uses_per_week` to the tier band
 * (monotone) + `ReAnchorQuotaUpgradedEvent`"). Emitted by `BenchmarkQuotaService.onHorizonAdvanced` AFTER
 * `PlayerReanchorQuotasRepository#raiseMaxUsesOnHorizonAdvanced`'s own guarded UPDATE actually raised
 * `max_uses_per_week` THIS call (a `HorizonTierAdvancedEvent` whose computed band is NOT genuinely higher
 * than the current max — e.g. a prior larger override already in place — never reaches this emit, the
 * monotone-by-construction discipline every sibling event in this file follows). `horizonTier` is the
 * `HorizonTierAdvancedEvent.newTier` that triggered this upgrade (★ hazard-5 — NEVER `pressure_tier`, the
 * separate C5 axis; see `HorizonTierAdvancedEvent`'s own header above).
 *
 * Consumers: NONE this lot (additive seam — BO/telemetry + the Unity `ReAnchorQuotaUpgradeNotification`,
 * TD-320+, subscribe later).
 */
export interface ReAnchorQuotaUpgradedEvent {
  readonly type: 'reanchor_quota_upgraded';
  readonly playerId: string;
  readonly newMaxUsesPerWeek: number;
  readonly horizonTier: number;
  readonly gameMinute: number;
}

/** Every cross-system CityEvent (extended as later producer-systems land). Discriminated by `type`. */
export type CityEvent =
  | FlowCellCongestedEvent
  | WhisperActivatedEvent
  | RaidPlannedEvent
  | UndercoverDispatchedEvent
  | PatrolObservationEvent
  | CohesionStateChangedEvent
  | CohesionFactorUpdatedEvent
  | WhisperIndexUpdatedEvent
  | BuildingEvidenceFoundEvent
  | InspectionCascadeTriggeredEvent
  | UnconformityAuditPinEvent
  | AuditPinObservationHintEvent
  | PipelineMinuteSnapshotEvent
  | StashHighBlockingAlertEvent
  | BufferOverflowEvent
  | LekDeathEvent
  | HeatInjectionEvent
  | HeatEscalationEvent
  | LieutenantSalientUncoveredEvent
  | BuildingRaidedEvent
  | AutonomyCeilingRefusalEvent
  | AutonomyDecisionEmittedEvent
  | AutonomyCeilingStateUpdatedEvent
  | DriftSubstitutionEvent
  | StandingOrderLapsedEvent
  | SignalDriftPhaseTransitionedEvent
  | SignalDriftDecisionEmittedEvent
  | SignalDriftStateUpdatedEvent
  | BossMirrorRuleDeclaredEvent
  | BossMirrorRuleRetractedEvent
  | ForbiddenTriadInterestFlagEvent
  | HiddenCurriculumLeakMISEvent
  | CourierInterceptedEvent
  | FenceDefaultedEvent
  | StashFillEvent
  | CourierRotatedEvent
  | DealAcceptedEvent
  | LookoutAssignedEvent
  | RuleViolationEvent
  | ForensicSoftFlagDetectedEvent
  | EffluentFlagDetectedEvent
  | LifestyleGapFlagEvent
  | ForensicEntryDispatchedEvent
  | RouteRequestEvent
  | RegimeTransitionEvent
  | DeadHandFiredEvent
  | CascadeTriggeredEvent
  | ConflictFlowRegimeEvent
  | AssaultEvent
  | AssaultCascadeCompletedEvent
  | RivalEliminatedEvent
  | CaseResolvedEvent
  | LawyerBurnedEvent
  | Tier3LawyerUsedEvent
  | InvestigationOpenedEvent
  | IATargetDiscoveredEvent
  | MaintenancePhaseChangedEvent
  | MaintenanceScheduledEvent
  | EquipmentFailedEvent
  | SessionOpenedEvent
  | SessionClosedEvent
  | ExceptionAgedOutEvent
  | StructuralDecisionCommittedEvent
  | FlagRaisedEvent
  | FlagVerdictEvent
  | FlagTokenExhaustionEvent
  | FlagWeeklyResetEvent
  | StackCommittedEvent
  | SlotExecutedEvent
  | SlotFailedEvent
  | RouteCreatedEvent
  | RouteRebuiltEvent
  | LieutenantReassignedEvent
  | HireCompletedEvent
  | ScriptAttachedEvent
  | SettlingInitiatedEvent
  | CompoundingStrainEvent
  | SettlingCompletedEvent
  | OffHoursDriftDetectedEvent
  | CouplingDiscoveryExposedEvent
  | EfficiencyPenaltyAppliedEvent
  | EfficiencyPenaltyRevertedEvent
  | NodeDecommissionedEvent
  | CompressionWeekTriggeredEvent
  | CompressionWeekFinalizedEvent
  | PrecursorOrderFilledEvent
  | DirectHireCompletedEvent
  | MasteryThresholdCrossedEvent
  | GraduationCommittedEvent
  | RecallDebtRecoveredEvent
  | RecallInitiatedEvent
  | UnmanagedWindowClosedEvent
  | AccordDegradationEvent
  | CapabilityHorizonSurfacedEvent
  | CapabilityAdoptedEvent
  | VocabTierAdvancedEvent
  | CapabilityDebtClearedEvent
  | CycleExecutedOnPlanEvent
  | PlanAbortedEvent
  | PlanAdaptedEvent
  | HorizonTierAdvancedEvent
  | PressureTierUnlockedEvent
  | PressureTierObservationExpiredEvent
  | BaselineAutoUpdatedEvent
  | LaggingIndicatorRevealedEvent
  | ReAnchorExecutedEvent
  | ReAnchorQuotaUpgradedEvent;

const FLOW_CELL_CONGESTED = 'flow_cell_congested';
const WHISPER_ACTIVATED = 'whisper_activated';
const RAID_PLANNED = 'raid_planned';
const UNDERCOVER_DISPATCHED = 'undercover_dispatched';
const PATROL_OBSERVATION = 'patrol_observation';
const COHESION_STATE_CHANGED = 'cohesion_state_changed';
const COHESION_FACTOR_UPDATED = 'cohesion_factor_updated';
const WHISPER_INDEX_UPDATED = 'whisper_index_updated';
const BUILDING_EVIDENCE_FOUND = 'building_evidence_found';
const INSPECTION_CASCADE_TRIGGERED = 'inspection_cascade_triggered';
const UNCONFORMITY_AUDIT_PIN = 'unconformity_audit_pin';
const AUDIT_PIN_OBSERVATION_HINT = 'audit_pin_observation_hint';
const PIPELINE_MINUTE_SNAPSHOT = 'pipeline_minute_snapshot';
const STASH_HIGH_BLOCKING_ALERT = 'stash_high_blocking_alert';
const BUFFER_OVERFLOW = 'buffer_overflow';
const LEK_DEATH = 'lek_death';
const HEAT_INJECTION = 'heat_injection';
const HEAT_ESCALATION = 'heat_escalation';
const LIEUTENANT_SALIENT_UNCOVERED = 'lieutenant_salient_uncovered';
const BUILDING_RAIDED = 'building_raided';
const AUTONOMY_CEILING_REFUSAL = 'autonomy_ceiling_refusal';
const AUTONOMY_DECISION_EMITTED = 'autonomy_decision_emitted';
const AUTONOMY_CEILING_STATE_UPDATED = 'autonomy_ceiling_state_updated';
const DRIFT_SUBSTITUTION = 'drift_substitution';
const STANDING_ORDER_LAPSED = 'standing_order_lapsed';
const SIGNAL_DRIFT_PHASE_TRANSITIONED = 'signal_drift_phase_transitioned';
const SIGNAL_DRIFT_DECISION_EMITTED = 'signal_drift_decision_emitted';
const SIGNAL_DRIFT_STATE_UPDATED = 'signal_drift_state_updated';
const BOSS_MIRROR_RULE_DECLARED       = 'boss_mirror_rule_declared';
const BOSS_MIRROR_RULE_RETRACTED      = 'boss_mirror_rule_retracted';
const FORBIDDEN_TRIAD_INTEREST_FLAG   = 'forbidden_triad_interest_flag';
const HIDDEN_CURRICULUM_LEAK_MIS      = 'hidden_curriculum_leak_mis';
const COURIER_INTERCEPTED             = 'courier_intercepted';
const FENCE_DEFAULTED                 = 'fence_defaulted';
const STASH_FILL                      = 'stash_fill';
const COURIER_ROTATED                 = 'courier_rotated';
const DEAL_ACCEPTED                   = 'deal_accepted';
const LOOKOUT_ASSIGNED                = 'lookout_assigned';
const RULE_VIOLATION                  = 'rule_violation';
const FORENSIC_SOFT_FLAG_DETECTED     = 'forensic_soft_flag_detected';
const EFFLUENT_FLAG_DETECTED          = 'effluent_flag_detected';
const LIFESTYLE_GAP_FLAG              = 'lifestyle_gap_flag';
const FORENSIC_ENTRY_DISPATCHED       = 'forensic_entry_dispatched';
const ROUTE_REQUEST                   = 'route_request';
const REGIME_TRANSITION               = 'regime_transition';
const DEAD_HAND_FIRED                 = 'dead_hand_fired';
const CASCADE_TRIGGERED               = 'cascade_triggered';
const CONFLICT_FLOW_REGIME            = 'conflict_flow_regime';
const ASSAULT                         = 'assault';
const ASSAULT_CASCADE_COMPLETED       = 'assault_cascade_completed';
const RIVAL_ELIMINATED                = 'rival_eliminated';
const CASE_RESOLVED                   = 'case_resolved';
const LAWYER_BURNED                   = 'lawyer_burned';
const TIER3_LAWYER_USED               = 'tier3_lawyer_used';
const INVESTIGATION_OPENED            = 'investigation_opened';
const IA_TARGET_DISCOVERED            = 'ia_target_discovered';
const MAINTENANCE_PHASE_CHANGED       = 'maintenance_phase_changed';
const MAINTENANCE_SCHEDULED           = 'maintenance_scheduled';
const EQUIPMENT_FAILED                = 'equipment_failed';
const SESSION_OPENED                  = 'session_opened';
const SESSION_CLOSED                  = 'session_closed';
const EXCEPTION_AGED_OUT              = 'exception_aged_out';
const STRUCTURAL_DECISION_COMMITTED   = 'structural_decision_committed';
const FLAG_RAISED                     = 'flag_raised';
const FLAG_VERDICT                    = 'flag_verdict';
const FLAG_TOKEN_EXHAUSTION           = 'flag_token_exhaustion';
const FLAG_WEEKLY_RESET               = 'flag_weekly_reset';
const STACK_COMMITTED                 = 'stack_committed';
const SLOT_EXECUTED                   = 'slot_executed';
const SLOT_FAILED                     = 'slot_failed';
const ROUTE_CREATED                   = 'route_created';
const ROUTE_REBUILT                   = 'route_rebuilt';
const LIEUTENANT_REASSIGNED           = 'lieutenant_reassigned';
const HIRE_COMPLETED                  = 'hire_completed';
const SCRIPT_ATTACHED                 = 'script_attached';
const SETTLING_INITIATED              = 'settling_initiated';
const COMPOUNDING_STRAIN              = 'compounding_strain';
const SETTLING_COMPLETED              = 'settling_completed';
const OFF_HOURS_DRIFT_DETECTED        = 'off_hours_drift_detected';
const COUPLING_DISCOVERY_EXPOSED      = 'coupling_discovery_exposed';
const EFFICIENCY_PENALTY_APPLIED      = 'efficiency_penalty_applied';
const EFFICIENCY_PENALTY_REVERTED     = 'efficiency_penalty_reverted';
const NODE_DECOMMISSIONED             = 'node_decommissioned';
const COMPRESSION_WEEK_TRIGGERED      = 'compression_week_triggered';
const COMPRESSION_WEEK_FINALIZED      = 'compression_week_finalized';
const PRECURSOR_ORDER_FILLED          = 'precursor_order_filled';
const DIRECT_HIRE_COMPLETED           = 'direct_hire_completed';
const MASTERY_THRESHOLD_CROSSED       = 'mastery_threshold_crossed';
const GRADUATION_COMMITTED            = 'graduation_committed';
const RECALL_DEBT_RECOVERED           = 'recall_debt_recovered';
const RECALL_INITIATED                = 'recall_initiated';
const UNMANAGED_WINDOW_CLOSED         = 'unmanaged_window_closed';
const ACCORD_DEGRADATION              = 'accord_degradation';
const CAPABILITY_HORIZON_SURFACED     = 'capability_horizon_surfaced';
const CAPABILITY_ADOPTED              = 'capability_adopted';
const VOCAB_TIER_ADVANCED             = 'vocab_tier_advanced';
const CAPABILITY_DEBT_CLEARED         = 'capability_debt_cleared';
const CYCLE_EXECUTED_ON_PLAN          = 'cycle_executed_on_plan';
const PLAN_ABORTED                    = 'plan_aborted';
const PLAN_ADAPTED                    = 'plan_adapted';
const HORIZON_TIER_ADVANCED           = 'horizon_tier_advanced';
const PRESSURE_TIER_UNLOCKED          = 'pressure_tier_unlocked';
const PRESSURE_TIER_OBSERVATION_EXPIRED = 'pressure_tier_observation_expired';
const BASELINE_AUTO_UPDATED           = 'baseline_auto_updated';
const LAGGING_INDICATOR_REVEALED      = 'lagging_indicator_revealed';
const REANCHOR_EXECUTED               = 'reanchor_executed';
const REANCHOR_QUOTA_UPGRADED         = 'reanchor_quota_upgraded';

@Injectable()
export class CityEventBus {
  private readonly logger = new Logger(CityEventBus.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    // High ceiling: every city-sim system may subscribe (11 systems × a few handlers each).
    this.emitter.setMaxListeners(64);
  }

  /**
   * LISTENER ISOLATION (the bus's cross-system delivery guarantee — mirrors the scheduler's per-system
   * try/catch in runCadence): `EventEmitter.emit` invokes listeners synchronously and lets the FIRST
   * listener's synchronous throw propagate OUT of `emit`, so a later subscriber for the same event would
   * never run AND the throw would surface back into the producing system's emit tick (aborting it). The
   * scheduler already wraps each system's `run()` so one failure can't abort its siblings; cross-system
   * EVENT delivery must give the SAME isolation. So instead of `emitter.emit(name, payload)` (which fans
   * out without isolation), we iterate the registered listeners and invoke EACH inside its own try/catch:
   * a bad subscriber is logged (event type + error) and delivery continues to the rest — it can neither
   * starve sibling consumers nor throw back into the emitting tick. This is the template every later
   * producer/consumer (T5/T7/T11 add more consumers) inherits, so the isolation lives in ONE place.
   */
  private dispatch<E extends CityEvent>(eventName: string, event: E): void {
    for (const listener of this.emitter.listeners(eventName)) {
      try {
        (listener as (e: E) => void)(event);
      } catch (err) {
        this.logger.error(
          `CityEventBus listener for "${eventName}" threw (delivery continues to other listeners): ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /** Emit a FlowCellCongestedEvent (System 1 → bus). No-op if no consumer has subscribed yet (day-1). */
  emitFlowCellCongested(event: FlowCellCongestedEvent): void {
    this.dispatch(FLOW_CELL_CONGESTED, event);
  }

  /** Subscribe to FlowCellCongestedEvents. Used by System 11/2/4 in later tasks. */
  onFlowCellCongested(listener: (event: FlowCellCongestedEvent) => void): void {
    this.emitter.on(FLOW_CELL_CONGESTED, listener);
  }

  /** Emit a WhisperActivatedEvent (System 2 → bus). No-op if no consumer has subscribed yet. */
  emitWhisperActivated(event: WhisperActivatedEvent): void {
    this.dispatch(WHISPER_ACTIVATED, event);
  }

  /** Subscribe to WhisperActivatedEvents. Used by System 3 Police Memory (T4) / System 6 (T7). */
  onWhisperActivated(listener: (event: WhisperActivatedEvent) => void): void {
    this.emitter.on(WHISPER_ACTIVATED, listener);
  }

  /**
   * Emit a RaidPlannedEvent (System 4 Patrol Doctrine 12h review — the canonical owner since T5). No-op if no
   * consumer has subscribed yet (System 9 drain order / System 3 post-raid memory land in later tasks).
   */
  emitRaidPlanned(event: RaidPlannedEvent): void {
    this.dispatch(RAID_PLANNED, event);
  }

  /** Subscribe to RaidPlannedEvents. Used by System 9 (drain order) / System 3 (post-raid memory). */
  onRaidPlanned(listener: (event: RaidPlannedEvent) => void): void {
    this.emitter.on(RAID_PLANNED, listener);
  }

  /** Emit an UndercoverDispatchedEvent (System 4 Patrol Doctrine 12h review — the canonical owner since T5). */
  emitUndercoverDispatched(event: UndercoverDispatchedEvent): void {
    this.dispatch(UNDERCOVER_DISPATCHED, event);
  }

  /** Subscribe to UndercoverDispatchedEvents. Used by System 3 (undercover feed → discreet suspicion_map). */
  onUndercoverDispatched(listener: (event: UndercoverDispatchedEvent) => void): void {
    this.emitter.on(UNDERCOVER_DISPATCHED, listener);
  }

  /**
   * Emit a PatrolObservationEvent (System 4 Patrol Doctrine 30-min accumulation → bus). The System 3↔4 handoff
   * seam: System 4 OWNS the patrol-observation channel; System 3 subscribes and bumps the precinct suspicion_map.
   * No-op if no consumer has subscribed yet.
   */
  emitPatrolObservation(event: PatrolObservationEvent): void {
    this.dispatch(PATROL_OBSERVATION, event);
  }

  /** Subscribe to PatrolObservationEvents. Used by System 3 Police Memory (patrol-observation suspicion source). */
  onPatrolObservation(listener: (event: PatrolObservationEvent) => void): void {
    this.emitter.on(PATROL_OBSERVATION, listener);
  }

  /**
   * Emit a CohesionStateChangedEvent (System 5 Cohesion Permafrost NIGHTLY → bus). The cohesion-state-transition
   * seam: consumers (System 6 inspection amplification / System 11 lek decay) subscribe and react to the band.
   * No-op if no consumer has subscribed yet (System 6/11 not built in Phase 1).
   */
  emitCohesionStateChanged(event: CohesionStateChangedEvent): void {
    this.dispatch(COHESION_STATE_CHANGED, event);
  }

  /** Subscribe to CohesionStateChangedEvents. Used by System 6 (inspection amplification) / System 11 (lek decay). */
  onCohesionStateChanged(listener: (event: CohesionStateChangedEvent) => void): void {
    this.emitter.on(COHESION_STATE_CHANGED, listener);
  }

  /**
   * Emit a CohesionFactorUpdatedEvent (System 5 Cohesion Permafrost NIGHTLY → bus). Consumed by System 4
   * (Patrol Doctrine) Phase A to weight observations by the district's cohesion factor band. No-op if System 4
   * has not subscribed (the wiring decision is documented in the System 5 service header).
   */
  emitCohesionFactorUpdated(event: CohesionFactorUpdatedEvent): void {
    this.dispatch(COHESION_FACTOR_UPDATED, event);
  }

  /** Subscribe to CohesionFactorUpdatedEvents. Used by System 4 Patrol Doctrine (cohesion_factor weighting). */
  onCohesionFactorUpdated(listener: (event: CohesionFactorUpdatedEvent) => void): void {
    this.emitter.on(COHESION_FACTOR_UPDATED, listener);
  }

  /**
   * Emit a WhisperIndexUpdatedEvent (System 5 Cohesion Permafrost THAW EVENT → bus). The thaw → informant
   * pressure seam: System 3 (Police Memory) could consume this to spawn informant suspicion. No-op if no
   * consumer has subscribed yet (the wiring decision is documented in the System 5 service header).
   */
  emitWhisperIndexUpdated(event: WhisperIndexUpdatedEvent): void {
    this.dispatch(WHISPER_INDEX_UPDATED, event);
  }

  /** Subscribe to WhisperIndexUpdatedEvents. Used by System 3 Police Memory (thaw → informant suspicion source). */
  onWhisperIndexUpdated(listener: (event: WhisperIndexUpdatedEvent) => void): void {
    this.emitter.on(WHISPER_INDEX_UPDATED, listener);
  }

  /**
   * Emit a BuildingEvidenceFoundEvent (System 6 Inspection Queue 12h dispatch → bus). The MIS → BPD referral
   * seam: a dispatched inspection that finds evidence produces a conditional OBSERVATION (not a raid). System 3
   * (Police Memory) subscribes and bumps the owning precinct's suspicion tile. No-op if no consumer subscribed.
   */
  emitBuildingEvidenceFound(event: BuildingEvidenceFoundEvent): void {
    this.dispatch(BUILDING_EVIDENCE_FOUND, event);
  }

  /** Subscribe to BuildingEvidenceFoundEvents. Used by System 3 Police Memory (MIS-referral suspicion source). */
  onBuildingEvidenceFound(listener: (event: BuildingEvidenceFoundEvent) => void): void {
    this.emitter.on(BUILDING_EVIDENCE_FOUND, listener);
  }

  /**
   * Emit an InspectionCascadeTriggeredEvent (System 6 Inspection Queue cascade tick → bus). The cascade
   * amplification observability seam — day-1 no consumer subscribes (no-op delivery, the canonical seam BO
   * ops / a daily-summary aggregator plug into when they land).
   */
  emitInspectionCascadeTriggered(event: InspectionCascadeTriggeredEvent): void {
    this.dispatch(INSPECTION_CASCADE_TRIGGERED, event);
  }

  /** Subscribe to InspectionCascadeTriggeredEvents. Used by BO ops / cascade observability when wired. */
  onInspectionCascadeTriggered(listener: (event: InspectionCascadeTriggeredEvent) => void): void {
    this.emitter.on(INSPECTION_CASCADE_TRIGGERED, listener);
  }

  /**
   * Emit an UnconformityAuditPinEvent (System 7 Unconformity Ledgers NIGHTLY → bus). The audit-pin activation
   * seam: consumers (System 6 inspection-focus targeting / System 4 augmented patrol observations) react to the
   * deviation bucket. No-op if no consumer has subscribed yet (emit-only day-1 — the System 5 precedent; the
   * synchronous mismatch_score READ accessor, Inv 6, is the read path System 6 uses for cascade targeting).
   */
  emitUnconformityAuditPin(event: UnconformityAuditPinEvent): void {
    this.dispatch(UNCONFORMITY_AUDIT_PIN, event);
  }

  /** Subscribe to UnconformityAuditPinEvents. Used by System 6 (inspection-focus) / System 4 (patrol severity). */
  onUnconformityAuditPin(listener: (event: UnconformityAuditPinEvent) => void): void {
    this.emitter.on(UNCONFORMITY_AUDIT_PIN, listener);
  }

  /**
   * Emit an AuditPinObservationHintEvent (System 7 Unconformity Ledgers NIGHTLY → bus). The patrol-observation
   * hint seam: System 4 (Patrol Doctrine) would raise the severity of patrol observations on the hinted building.
   * No-op if no consumer has subscribed yet (emit-only day-1 — the canonical seam System 4 plugs into when wired).
   */
  emitAuditPinObservationHint(event: AuditPinObservationHintEvent): void {
    this.dispatch(AUDIT_PIN_OBSERVATION_HINT, event);
  }

  /** Subscribe to AuditPinObservationHintEvents. Used by System 4 Patrol Doctrine (augmented observation severity). */
  onAuditPinObservationHint(listener: (event: AuditPinObservationHintEvent) => void): void {
    this.emitter.on(AUDIT_PIN_OBSERVATION_HINT, listener);
  }

  /**
   * Emit a PipelineMinuteSnapshotEvent (System 8 Dwell-Time Tax MINUTE tick → bus). The network-level pipeline
   * observability seam: consumers (BO pipeline observability / a network-health aggregator) react to the
   * qualitative network-cleanliness + exposure bands. No-op if no consumer has subscribed yet (emit-only day-1 —
   * the System 5/7 emit-only precedent; the player-facing read path is the per-district projection endpoint).
   */
  emitPipelineMinuteSnapshot(event: PipelineMinuteSnapshotEvent): void {
    this.dispatch(PIPELINE_MINUTE_SNAPSHOT, event);
  }

  /** Subscribe to PipelineMinuteSnapshotEvents. Used by BO pipeline observability / a network-health aggregator. */
  onPipelineMinuteSnapshot(listener: (event: PipelineMinuteSnapshotEvent) => void): void {
    this.emitter.on(PIPELINE_MINUTE_SNAPSHOT, listener);
  }

  /**
   * Emit a StashHighBlockingAlertEvent (System 9 Erlang Stash MINUTE tick → bus). The high-blocking alert seam:
   * a safehouse whose recomputed Erlang-B blocking_probability exceeds stash.blocking_alert_threshold notifies the
   * consumer (UnityNotificationService — "stash saturé"). No-op if no consumer has subscribed yet (emit-only day-1
   * — the System 5/7/8 emit-only precedent; the player-facing read path is the per-district stash projection).
   */
  emitStashHighBlockingAlert(event: StashHighBlockingAlertEvent): void {
    this.dispatch(STASH_HIGH_BLOCKING_ALERT, event);
  }

  /** Subscribe to StashHighBlockingAlertEvents. Used by UnityNotificationService / BO ops blocking-risk surface. */
  onStashHighBlockingAlert(listener: (event: StashHighBlockingAlertEvent) => void): void {
    this.emitter.on(STASH_HIGH_BLOCKING_ALERT, listener);
  }

  /**
   * Emit a BufferOverflowEvent (System 10 Buffer Bloat MINUTE tick → bus). The overflow seam: a laundering-node
   * buffer whose new occupancy exceeds buffer_capacity_per_node drops the excess cash on the street (Inv 1) — the
   * consumer (HeatPropagationService) injects heat in the host district. No-op if no consumer has subscribed yet
   * (emit-only day-1 — the System 5/7/8/9 emit-only precedent; Heat wires this Phase 1 T13 / P2). The player-facing
   * read path is the per-district buffer projection (the CRITICAL BufferLoadBucket + the "cash exposé" overflow badge).
   */
  emitBufferOverflow(event: BufferOverflowEvent): void {
    this.dispatch(BUFFER_OVERFLOW, event);
  }

  /** Subscribe to BufferOverflowEvents. Used by HeatPropagationService (heat injection) / BO ops overflow surface. */
  onBufferOverflow(listener: (event: BufferOverflowEvent) => void): void {
    this.emitter.on(BUFFER_OVERFLOW, listener);
  }

  /**
   * Emit a LekDeathEvent (System 11 Deal Lek WEEKLY tick → bus). The lek-death seam: a lek with no deals for 4
   * weeks transitions TO DEAD (Inv 5) — the consumer (UnitySnapshotService) retires the lek marker from the map.
   * No-op if no consumer has subscribed yet (emit-only day-1 — the System 5/7/8/9/10 emit-only precedent; Unity
   * wires this Phase 1 T14 / P2). The player-facing read path is the per-district lek projection (the DEAD
   * LekControlState band).
   */
  emitLekDeath(event: LekDeathEvent): void {
    this.dispatch(LEK_DEATH, event);
  }

  /** Subscribe to LekDeathEvents. Used by UnitySnapshotService (map-marker retirement) / BO ops lek surface. */
  onLekDeath(listener: (event: LekDeathEvent) => void): void {
    this.emitter.on(LEK_DEATH, listener);
  }

  /**
   * Emit a HeatInjectionEvent (an operational system → bus — the canonical heat-injection SEAM). System Heat
   * SUBSCRIBES, buffers the injection in-memory, and flushes it onto buildings.heat once per MINUTE tick (never a
   * per-event DB write). Phase 1 the only WIRED producer is the Heat service's own BufferOverflow re-emit + the
   * production-gated test hook; CASH_OVERFLOW/STASH_OPEN/LEK_DEAL/FLOW_CONGESTION are the deferred P2 sources the
   * seam is defined for. No-op delivery if Heat has not subscribed.
   */
  emitHeatInjection(event: HeatInjectionEvent): void {
    this.dispatch(HEAT_INJECTION, event);
  }

  /** Subscribe to HeatInjectionEvents. Used by HeatPropagationService (buffer in-memory → flush onto buildings.heat). */
  onHeatInjection(listener: (event: HeatInjectionEvent) => void): void {
    this.emitter.on(HEAT_INJECTION, listener);
  }

  /**
   * Emit a HeatEscalationEvent (System Heat MINUTE/4 tick → bus). The cross-system escalation seam: a building
   * crossing heat_escalation_threshold notifies the consumers (System 4 Patrol Doctrine raises observation
   * severity on the block — the WIRED Phase-1 consumer; System 3 police memory + System 7 unconformity are the
   * documented seam). No-op delivery if no consumer has subscribed.
   */
  emitHeatEscalation(event: HeatEscalationEvent): void {
    this.dispatch(HEAT_ESCALATION, event);
  }

  /** Subscribe to HeatEscalationEvents. Used by System 4 Patrol Doctrine (heat sighting → observation severity). */
  onHeatEscalation(listener: (event: HeatEscalationEvent) => void): void {
    this.emitter.on(HEAT_ESCALATION, listener);
  }

  /** Emit a LieutenantSalientUncoveredEvent (LIEUTENANT_TICK → bus). No-op if the exceptions producer hasn't subscribed. */
  emitLieutenantSalientUncovered(event: LieutenantSalientUncoveredEvent): void {
    this.dispatch(LIEUTENANT_SALIENT_UNCOVERED, event);
  }

  /** Subscribe to LieutenantSalientUncoveredEvents. Used by ExceptionProducerService (Phase-14). */
  onLieutenantSalientUncovered(listener: (event: LieutenantSalientUncoveredEvent) => void): void {
    this.emitter.on(LIEUTENANT_SALIENT_UNCOVERED, listener);
  }

  /** Emit a BuildingRaidedEvent (RaidExecutionService → bus, after the seizure tx). No-op if the raid-exception producer hasn't subscribed. */
  emitBuildingRaided(event: BuildingRaidedEvent): void {
    this.dispatch(BUILDING_RAIDED, event);
  }

  /** Subscribe to BuildingRaidedEvents. Used by RaidExceptionProducerService (Phase-16). */
  onBuildingRaided(listener: (event: BuildingRaidedEvent) => void): void {
    this.emitter.on(BUILDING_RAIDED, listener);
  }

  /** Emit an AutonomyCeilingRefusalEvent (LIEUTENANT_TICK → bus, Phase-19 L1a). No-op if the autonomy report producer hasn't subscribed. */
  emitAutonomyCeilingRefusal(event: AutonomyCeilingRefusalEvent): void {
    this.dispatch(AUTONOMY_CEILING_REFUSAL, event);
  }

  /** Subscribe to AutonomyCeilingRefusalEvents. Used by AutonomyReportProducerService (Phase-19 L1a T5). */
  onAutonomyCeilingRefusal(listener: (event: AutonomyCeilingRefusalEvent) => void): void {
    this.emitter.on(AUTONOMY_CEILING_REFUSAL, listener);
  }

  /** Emit an AutonomyDecisionEmittedEvent (LIEUTENANT_TICK → bus, Phase-19 L1a). No-op until a BO audit consumer subscribes. */
  emitAutonomyDecisionEmitted(event: AutonomyDecisionEmittedEvent): void {
    this.dispatch(AUTONOMY_DECISION_EMITTED, event);
  }

  /** Subscribe to AutonomyDecisionEmittedEvents (the BO decision-audit / timeline seam — no consumer in L1a). */
  onAutonomyDecisionEmitted(listener: (event: AutonomyDecisionEmittedEvent) => void): void {
    this.emitter.on(AUTONOMY_DECISION_EMITTED, listener);
  }

  /** Emit an AutonomyCeilingStateUpdatedEvent (LIEUTENANT_TICK → bus, Phase-19 L1a). No-op until a BO budget-state consumer subscribes. */
  emitAutonomyCeilingStateUpdated(event: AutonomyCeilingStateUpdatedEvent): void {
    this.dispatch(AUTONOMY_CEILING_STATE_UPDATED, event);
  }

  /** Subscribe to AutonomyCeilingStateUpdatedEvents (the BO real-time budget-state / projection-refresh seam — no consumer in L1a). */
  onAutonomyCeilingStateUpdated(listener: (event: AutonomyCeilingStateUpdatedEvent) => void): void {
    this.emitter.on(AUTONOMY_CEILING_STATE_UPDATED, listener);
  }

  /** Emit a DriftSubstitutionEvent (LIEUTENANT_TICK → bus, Phase-24 L2b). No-op until a BO audit consumer subscribes. */
  emitDriftSubstitution(event: DriftSubstitutionEvent): void {
    this.dispatch(DRIFT_SUBSTITUTION, event);
  }

  /** Subscribe to DriftSubstitutionEvents (the BO drift-substitution audit trace — no consumer in L2b). */
  onDriftSubstitution(listener: (event: DriftSubstitutionEvent) => void): void {
    this.emitter.on(DRIFT_SUBSTITUTION, listener);
  }

  /** Emit a StandingOrderLapsedEvent (LIEUTENANT_TICK → bus, Phase-25 L3). No-op until a BO escalation consumer subscribes. */
  emitStandingOrderLapsed(event: StandingOrderLapsedEvent): void {
    this.dispatch(STANDING_ORDER_LAPSED, event);
  }

  /** Subscribe to StandingOrderLapsedEvents (the standing-order escalation seam — no consumer in L3). */
  onStandingOrderLapsed(listener: (event: StandingOrderLapsedEvent) => void): void {
    this.emitter.on(STANDING_ORDER_LAPSED, listener);
  }

  /** Emit a SignalDriftPhaseTransitionedEvent (LIEUTENANT_TICK → bus, lot-5 TD-051). No-op until a BO timeline consumer subscribes. */
  emitSignalDriftPhaseTransitioned(event: SignalDriftPhaseTransitionedEvent): void {
    this.dispatch(SIGNAL_DRIFT_PHASE_TRANSITIONED, event);
  }

  /** Subscribe to SignalDriftPhaseTransitionedEvents (the BO drift-phase timeline audit seam — no consumer at this slice). */
  onSignalDriftPhaseTransitioned(listener: (event: SignalDriftPhaseTransitionedEvent) => void): void {
    this.emitter.on(SIGNAL_DRIFT_PHASE_TRANSITIONED, listener);
  }

  /** Emit a SignalDriftDecisionEmittedEvent (controller → bus, lot-5 TD-051). No-op until a BO decision-audit consumer subscribes. */
  emitSignalDriftDecisionEmitted(event: SignalDriftDecisionEmittedEvent): void {
    this.dispatch(SIGNAL_DRIFT_DECISION_EMITTED, event);
  }

  /** Subscribe to SignalDriftDecisionEmittedEvents (the BO decision-audit seam — no consumer at this slice). */
  onSignalDriftDecisionEmitted(listener: (event: SignalDriftDecisionEmittedEvent) => void): void {
    this.emitter.on(SIGNAL_DRIFT_DECISION_EMITTED, listener);
  }

  /** Emit a SignalDriftStateUpdatedEvent (LIEUTENANT_TICK → bus, lot-5 TD-051 / F-13.A). No-op until a Unity/BO consumer subscribes. */
  emitSignalDriftStateUpdated(event: SignalDriftStateUpdatedEvent): void {
    this.dispatch(SIGNAL_DRIFT_STATE_UPDATED, event);
  }

  /** Subscribe to SignalDriftStateUpdatedEvents (the Unity widget refresh / BO projection seam — no consumer at this slice). */
  onSignalDriftStateUpdated(listener: (event: SignalDriftStateUpdatedEvent) => void): void {
    this.emitter.on(SIGNAL_DRIFT_STATE_UPDATED, listener);
  }

  /**
   * Emit a BossMirrorRuleDeclaredEvent (BossMirrorService D2 R3a → bus). The public-declaration seam:
   * police_memory subscribes in R3b to update its priors. No-op if no consumer has subscribed yet.
   *
   * FLAG (a): this event is the PUBLIC SIGNAL only — it does NOT write a DeclarationEntry ring entry.
   * The violation → ring write uses writeDeclarationEntry() in the service. See R3a report.
   */
  emitBossMirrorRuleDeclared(event: BossMirrorRuleDeclaredEvent): void {
    this.dispatch(BOSS_MIRROR_RULE_DECLARED, event);
  }

  /** Subscribe to BossMirrorRuleDeclaredEvents. Used by police_memory (R3b acceptor — prior update). */
  onBossMirrorRuleDeclared(listener: (event: BossMirrorRuleDeclaredEvent) => void): void {
    this.emitter.on(BOSS_MIRROR_RULE_DECLARED, listener);
  }

  /**
   * Emit a BossMirrorRuleRetractedEvent (BossMirrorService D2 R3a → bus). The public-retraction seam
   * (reputation_mechanics.md:63 — retraction is observable; rivals read it as weakness). Police_memory
   * subscribes in R3b to update its priors. No-op if no consumer has subscribed yet.
   *
   * FLAG (a): same as BossMirrorRuleDeclaredEvent — public signal channel, NOT a ring write.
   */
  emitBossMirrorRuleRetracted(event: BossMirrorRuleRetractedEvent): void {
    this.dispatch(BOSS_MIRROR_RULE_RETRACTED, event);
  }

  /** Subscribe to BossMirrorRuleRetractedEvents. Used by police_memory (R3b acceptor — prior update). */
  onBossMirrorRuleRetracted(listener: (event: BossMirrorRuleRetractedEvent) => void): void {
    this.emitter.on(BOSS_MIRROR_RULE_RETRACTED, listener);
  }

  /**
   * Emit a ForbiddenTriadInterestFlagEvent (ForbiddenTriadDetectionService D2 R8b → bus). The MIS
   * routing seam: when anomaly_pressure crosses H_observer, the observer NPC flips its interest_flag
   * and this event notifies the MIS routing acceptor (R9 — deferred). No-op if no consumer subscribed.
   *
   * TD-120: the observer-NPC actor itself (the NPC that routes this into MIS investigation queues)
   * has no real producer at D2 scope — emit+defer is the honest contract. The NPC behavior is deferred
   * to R13 (Insurance+MIS lot). The flag is set in DB, this event fires on the bus; MIS consumer at R9.
   *
   * P5/R2.2: carries ONLY qualitative identity (playerId + pairKey + gameMinute) — never the raw
   * anomaly_pressure_bucket float (server-only; player sees dashed-line thickness :208).
   */
  emitForbiddenTriadInterestFlag(event: ForbiddenTriadInterestFlagEvent): void {
    this.dispatch(FORBIDDEN_TRIAD_INTEREST_FLAG, event);
  }

  /** Subscribe to ForbiddenTriadInterestFlagEvents. Used by MIS routing acceptor (R9). */
  onForbiddenTriadInterestFlag(listener: (event: ForbiddenTriadInterestFlagEvent) => void): void {
    this.emitter.on(FORBIDDEN_TRIAD_INTEREST_FLAG, listener);
  }

  /**
   * Emit a HiddenCurriculumLeakMISEvent (HiddenCurriculumService D2 R9 → bus). The
   * Hidden Curriculum → MIS leak routing seam: a lieutenant with silence_at_handoffs=OFF
   * leaks under MIS pressure → InspectionQueueService injects a high-priority INFORMANT
   * entry (reputation_mechanics.md:174, :217). No-op if no consumer has subscribed.
   */
  emitHiddenCurriculumLeakMIS(event: HiddenCurriculumLeakMISEvent): void {
    this.dispatch(HIDDEN_CURRICULUM_LEAK_MIS, event);
  }

  /** Subscribe to HiddenCurriculumLeakMISEvents. Used by InspectionQueueService (R9 MIS acceptor). */
  onHiddenCurriculumLeakMIS(listener: (event: HiddenCurriculumLeakMISEvent) => void): void {
    this.emitter.on(HIDDEN_CURRICULUM_LEAK_MIS, listener);
  }

  /**
   * Emit a CourierInterceptedEvent (CourierInterceptionService Insurance C7 → bus, AFTER
   * setting status='caught' in courier_shift). Consumer: ClaimsService C9 (COURIER_ARREST payout).
   * No-op until ClaimsService C9 subscribes. P5: carries ONLY qualitative identity, never raw heat.
   */
  emitCourierIntercepted(event: CourierInterceptedEvent): void {
    this.dispatch(COURIER_INTERCEPTED, event);
  }

  /** Subscribe to CourierInterceptedEvents. Used by ClaimsService (C9 — COURIER_ARREST payout seam). */
  onCourierIntercepted(listener: (event: CourierInterceptedEvent) => void): void {
    this.emitter.on(COURIER_INTERCEPTED, listener);
  }

  /**
   * Emit a FenceDefaultedEvent (FenceDefaultService Insurance C8 → bus, AFTER detecting that
   * laundering_nodes.buffer_load exceeds fence_default_exposure_threshold). Consumer: ClaimsService
   * C9 (FENCE_DEFAULT payout). No-op until ClaimsService C9 subscribes.
   * P5: carries ONLY qualitative identity + throughputInPerHour, never raw buffer_load.
   */
  emitFenceDefaulted(event: FenceDefaultedEvent): void {
    this.dispatch(FENCE_DEFAULTED, event);
  }

  /** Subscribe to FenceDefaultedEvents. Used by ClaimsService (C9 — FENCE_DEFAULT payout seam). */
  onFenceDefaulted(listener: (event: FenceDefaultedEvent) => void): void {
    this.emitter.on(FENCE_DEFAULTED, listener);
  }

  /**
   * Emit a StashFillEvent (MoneyHoldingService.deposit → bus, AFTER a successful deposit commit).
   * Consumer: CoverageInducedDriftService (Drift C4 — stash-ratio comparison).
   * ADDITIVE-ONLY: the deposit hot-path return value `{ deposited: true }` is BYTE-IDENTICAL.
   * No-op until CoverageInducedDriftService subscribes.
   */
  emitStashFill(event: StashFillEvent): void {
    this.dispatch(STASH_FILL, event);
  }

  /** Subscribe to StashFillEvents. Used by CoverageInducedDriftService (Drift C4 — stash-ratio drift detection). */
  onStashFill(listener: (event: StashFillEvent) => void): void {
    this.emitter.on(STASH_FILL, listener);
  }

  /**
   * Emit a CourierRotatedEvent (DistributionService.dispatch → bus, AFTER the courier_shift INSERT commits).
   * Consumer: CoverageInducedDriftService (Drift C5 — courier-cadence drift detection).
   * ADDITIVE-ONLY: the dispatch hot-path return value `{ courierId, routeId, shiftId }` is BYTE-IDENTICAL.
   * No-op until CoverageInducedDriftService subscribes.
   */
  emitCourierRotated(event: CourierRotatedEvent): void {
    this.dispatch(COURIER_ROTATED, event);
  }

  /** Subscribe to CourierRotatedEvents. Used by CoverageInducedDriftService (Drift C5 — cadence drift detection). */
  onCourierRotated(listener: (event: CourierRotatedEvent) => void): void {
    this.emitter.on(COURIER_ROTATED, listener);
  }

  /**
   * Emit a DealAcceptedEvent (SellingSellService.runMinuteTick → bus, AFTER the batched sell commits).
   * One aggregate event per tick (NOT per-deal) to avoid concurrent async-subscriber races.
   * Consumer: CoverageInducedDriftService (Drift C6 — marginal-deal acceptance rate drift detection).
   * ADDITIVE-ONLY: the sell hot-path return value (void) is BYTE-IDENTICAL.
   * No-op until CoverageInducedDriftService subscribes.
   */
  emitDealAccepted(event: DealAcceptedEvent): void {
    this.dispatch(DEAL_ACCEPTED, event);
  }

  /** Subscribe to DealAcceptedEvents. Used by CoverageInducedDriftService (Drift C6 — marginal-deal drift detection). */
  onDealAccepted(listener: (event: DealAcceptedEvent) => void): void {
    this.emitter.on(DEAL_ACCEPTED, listener);
  }

  /**
   * Emit a LookoutAssignedEvent (LieutenantService.recruit[SECURITY] → bus, AFTER the recruit tx commits).
   * Consumer: CoverageInducedDriftService (Drift C7 — lookout coverage drift detection).
   * ADDITIVE-ONLY: the recruit hot-path return value is BYTE-IDENTICAL. No-op until subscriber wired.
   */
  emitLookoutAssigned(event: LookoutAssignedEvent): void {
    this.dispatch(LOOKOUT_ASSIGNED, event);
  }

  /** Subscribe to LookoutAssignedEvents. Used by CoverageInducedDriftService (Drift C7 — lookout coverage drift detection). */
  onLookoutAssigned(listener: (event: LookoutAssignedEvent) => void): void {
    this.emitter.on(LOOKOUT_ASSIGNED, listener);
  }

  /**
   * Emit a RuleViolationEvent (BossMirrorService.recordViolation → bus, AFTER the ring upsert commits).
   * ADDITIVE-ONLY: the recordViolation hot-path return value (void) is BYTE-IDENTICAL. No-op until subscriber wired.
   */
  emitRuleViolation(event: RuleViolationEvent): void {
    this.dispatch(RULE_VIOLATION, event);
  }

  /** Subscribe to RuleViolationEvents. Used by CoverageInducedDriftService (Drift C8 — DD-BOSSMIRROR-COUPLE unconditional hazard++ player-wide). */
  onRuleViolation(listener: (event: RuleViolationEvent) => void): void {
    this.emitter.on(RULE_VIOLATION, listener);
  }

  /**
   * Emit a ForensicSoftFlagDetectedEvent (LeadingDigitAuditService §5.1 WEEKLY/9 tick → bus).
   * Fires ADDITIVELY alongside the C8 dual-write (declaration_ledger + flag_ticks).
   * Consumers (C22 dispatcher, C23 BPD-memory) subscribe at their respective chunks.
   * No-op if no consumer has subscribed yet (emit-only day-1).
   * P5/OQ-15: carries ForensicSeverityBand ('low'|'medium'|'high'|'critical') — NOT EvidenceSeverity.
   */
  emitForensicSoftFlagDetected(event: ForensicSoftFlagDetectedEvent): void {
    this.dispatch(FORENSIC_SOFT_FLAG_DETECTED, event);
  }

  /** Subscribe to ForensicSoftFlagDetectedEvents. Used by C22 dispatcher + C23 BPD-memory. */
  onForensicSoftFlagDetected(listener: (event: ForensicSoftFlagDetectedEvent) => void): void {
    this.emitter.on(FORENSIC_SOFT_FLAG_DETECTED, listener);
  }

  /**
   * Emit an EffluentFlagDetectedEvent (EffluentStoichiometryService §5.2 NIGHTLY/9 scan → bus).
   * Fires ADDITIVELY alongside the C15 applyQueues queue-entry emission.
   * Consumers (C22 dispatcher, C23 BPD-memory) subscribe at their respective chunks.
   * No-op if no consumer has subscribed yet (emit-only day-1).
   * P5/OQ-15: carries ForensicSeverityBand — NOT EvidenceSeverity (2-member, UNCHANGED).
   */
  emitEffluentFlagDetected(event: EffluentFlagDetectedEvent): void {
    this.dispatch(EFFLUENT_FLAG_DETECTED, event);
  }

  /** Subscribe to EffluentFlagDetectedEvents. Used by C22 dispatcher + C23 BPD-memory. */
  onEffluentFlagDetected(listener: (event: EffluentFlagDetectedEvent) => void): void {
    this.emitter.on(EFFLUENT_FLAG_DETECTED, listener);
  }

  /**
   * Emit a LifestyleGapFlagEvent (StandingGapHeatService §5.3 advanceTailRamp → bus, on stage transition).
   * Fires ADDITIVELY alongside the C19 applyQueues queue-entry emission.
   * DD decision C: carries rampStage (TailRampStage) directly — NO severity field, no banding fn.
   * Consumers (C22 dispatcher, C23 BPD-memory) subscribe at their respective chunks.
   * No-op if no consumer has subscribed yet (emit-only day-1).
   * P5/OQ-15: rampStage is already a qualitative band (passive→tailing→subpoena); raw gap/consec not leaked.
   */
  emitLifestyleGapFlag(event: LifestyleGapFlagEvent): void {
    this.dispatch(LIFESTYLE_GAP_FLAG, event);
  }

  /** Subscribe to LifestyleGapFlagEvents. Used by C22 dispatcher + C23 BPD-memory. */
  onLifestyleGapFlag(listener: (event: LifestyleGapFlagEvent) => void): void {
    this.emitter.on(LIFESTYLE_GAP_FLAG, listener);
  }

  /**
   * Emit a ForensicEntryDispatchedEvent (System 6 `InspectionQueueService` 12h dispatch → bus).
   * Fires ADDITIVELY when a drained queue entry has `source === 'FORENSIC'` (C22 — DIV-2/DD-MIS-DISPATCHER).
   * The non-forensic dispatch path (SCHEDULED/INFORMANT/CASCADE/etc.) is BYTE-IDENTICAL — only this additive
   * branch fires. Consumer: `InspectionQueueDispatcherService` (C22) routes per §4.3 by `forensicKind`.
   * No-op if no consumer has subscribed yet (emit-only until InspectionQueueDispatcherService subscribes).
   * The FORENSIC entry skips the building-hash outcome (the dispatcher consequence IS the consequence).
   */
  emitForensicEntryDispatched(event: ForensicEntryDispatchedEvent): void {
    this.dispatch(FORENSIC_ENTRY_DISPATCHED, event);
  }

  /** Subscribe to ForensicEntryDispatchedEvents. Used by InspectionQueueDispatcherService (C22 §4.3 routing). */
  onForensicEntryDispatched(listener: (event: ForensicEntryDispatchedEvent) => void): void {
    this.emitter.on(FORENSIC_ENTRY_DISPATCHED, listener);
  }

  /**
   * Emit a `RouteRequestEvent` (System 9c C4 — DD-ROUTE-REQUEST, OQ-RR1).
   *
   * Called by `RouteRequestService.enqueueAndEmit` AFTER the durable `route_request` row is written
   * (the row is the receipt; this event is the trigger). The C5 `CoordinatorExecutionService` subscribes
   * via `onRouteRequest` and evaluates the hub's coordinator script.
   *
   * P5/R2.2: carries ONLY qualitative identity (playerId + hubId + gameMinute) — no raw scalar.
   * No-op if no consumer has subscribed yet (emit-only until CoordinatorExecutionService subscribes at C5).
   * DETERMINISM (C4): `gameMinute` is ctx.gameMinute (game-time); NEVER `Date.now()`.
   * ADDITIVE: the existing dispatch hot-path return value is BYTE-IDENTICAL.
   */
  emitRouteRequest(event: RouteRequestEvent): void {
    this.dispatch(ROUTE_REQUEST, event);
  }

  /**
   * Subscribe to `RouteRequestEvent`s.
   * Consumer: `CoordinatorExecutionService.onRouteRequest` (C5 — greenfield per C0 anchor check).
   */
  onRouteRequest(listener: (event: RouteRequestEvent) => void): void {
    this.emitter.on(ROUTE_REQUEST, listener);
  }

  /**
   * Emit a `RegimeTransitionEvent` (04b-A C3 — `RegimeSwitchingService` → bus on regime flip).
   * Payload: qualitative only — playerId + rivalKey + gameMinute. NO regime label, NO raw pressure (P6 / R2.2).
   * No-op if no consumer has subscribed yet (day-1 — the canonical seam B/C plug into when wired).
   */
  emitRegimeTransition(event: RegimeTransitionEvent): void {
    this.dispatch(REGIME_TRANSITION, event);
  }

  /**
   * Subscribe to `RegimeTransitionEvent`s (the §8 event — "something flipped" signal).
   * Consumers: (in A) rival mechanics that update decision policy; (later B) Exception-card hook;
   *   (later C) info-warfare inference. Emit-only day-1 (no consumer yet — a no-op delivery).
   */
  onRegimeTransition(listener: (event: RegimeTransitionEvent) => void): void {
    this.emitter.on(REGIME_TRANSITION, listener);
  }

  /**
   * Emit a `DeadHandFiredEvent` (04b-B C7 — `DeadHandCacheService.fireCache` → bus on cache activation).
   * Payload: qualitative only — playerId + rivalKey + scriptRef (opaque ref) + gameDay (in-game day).
   * NO dead_hand_reserve, NO trigger_threshold, NO raw scalar (P5/R2.2 — P6 wall holds on the bus).
   * No-op if no consumer has subscribed yet (day-1 — the canonical seam C-cas plugs into).
   * ADDITIVE: no existing event type or delivery path changed.
   */
  emitDeadHandFired(event: DeadHandFiredEvent): void {
    this.dispatch(DEAD_HAND_FIRED, event);
  }

  /**
   * Subscribe to `DeadHandFiredEvent`s.
   * Consumer: `ConflictOrchestratorService` (C-cas — drives the §7 cascade on cache activation).
   * Emit-only in B (no consumer yet — the cascade seam lands at C-cas).
   */
  onDeadHandFired(listener: (event: DeadHandFiredEvent) => void): void {
    this.emitter.on(DEAD_HAND_FIRED, listener);
  }

  /**
   * Emit a `CascadeTriggeredEvent` (sandpile variant — 04b-B C-esc, §4.1 Sandpile SOC).
   * Emitted by `SandpileStateService.triggerCascadeChecks` when system_criticality exceeds the
   * cascade threshold AND the seeded draw fires.
   *
   * DISTINCT from the §9.1 assault `AssaultCascadeCompletedEvent` (type='assault_cascade_completed')
   * in both combat.types.ts and this bus. This sandpile variant is emitted by the ESCALATION
   * 12h tick (not an assault event). Type discriminant: 'cascade_triggered' (sandpile 12h tick).
   *
   * P5/R2.2: no raw system_criticality scalar crosses the bus (only qualitative identity + gameMinute).
   * ADDITIVE: no existing event type or delivery path changed.
   */
  emitCascadeTriggered(event: CascadeTriggeredEvent): void {
    this.dispatch(CASCADE_TRIGGERED, event);
  }

  /**
   * Subscribe to `CascadeTriggeredEvent`s (sandpile variant).
   * Consumer: C-cas seam (the assault-cascade orchestrator) — the cascade seam lands at C-cas.
   * Emit-only in C-esc (no consumer yet — the downstream seam is at C-cas).
   */
  onCascadeTriggered(listener: (event: CascadeTriggeredEvent) => void): void {
    this.emitter.on(CASCADE_TRIGGERED, listener);
  }

  /**
   * Emit a `ConflictFlowRegimeEvent` (04b-B C-deesc — `DownstreamGateService.evaluateDownstream`
   * → bus on RUNNING→STANDING hydraulic-jump transition).
   *
   * ★ OQ-B7 RENAME: This is the de-escalation regime event, RENAMED from canon's `RegimeTransitionEvent`
   * to avoid collision with A's rival-regime flip (`RegimeTransitionEvent`, type='regime_transition').
   * Type discriminant: 'conflict_flow_regime' (NEW, ADDITIVE — no existing type modified).
   *
   * Payload: qualitative only — playerId + rivalKey + from/to regime + gameMinute.
   * NO raw downstream_condition scalar (R2.2 / P5 — the condition band is derived server-side).
   *
   * Consumer: rival retaliation suspension seam — STANDING mode suspends rival retaliation scripts
   *   (canon §5.2 :71). No consumer yet in C-deesc (day-1 emit-only; C-cas wires the suspend).
   *
   * ADDITIVE: no existing event type or delivery path changed.
   */
  emitConflictFlowRegime(event: ConflictFlowRegimeEvent): void {
    this.dispatch(CONFLICT_FLOW_REGIME, event);
  }

  /**
   * Subscribe to `ConflictFlowRegimeEvent`s.
   * Consumer: rival retaliation suspension (C-cas), BO ops, conflict-status updates.
   * Emit-only in C-deesc (no consumer yet — the suspend seam lands at C-cas).
   */
  onConflictFlowRegime(listener: (event: ConflictFlowRegimeEvent) => void): void {
    this.emitter.on(CONFLICT_FLOW_REGIME, listener);
  }

  /**
   * Emit an `AssaultEvent` (C-cas — ConflictOrchestratorService) when an assault is initiated.
   * ADDITIVE: new discriminant 'assault', no existing type modified.
   */
  emitAssault(event: AssaultEvent): void {
    this.dispatch(ASSAULT, event);
  }

  /** Subscribe to `AssaultEvent`s. Consumer: BO monitoring, downstream scoring (C-cas). */
  onAssault(listener: (event: AssaultEvent) => void): void {
    this.emitter.on(ASSAULT, listener);
  }

  /**
   * Emit an `AssaultCascadeCompletedEvent` (C-cas — ConflictOrchestratorService §9.1).
   * Emitted AFTER the SERIALIZABLE tx commits (all 5 layers applied or all rolled back).
   * DISTINCT from the sandpile `CascadeTriggeredEvent` (type='cascade_triggered') —
   * different discriminant, different origin, different payload.
   * ADDITIVE: new discriminant 'assault_cascade_completed', no existing type modified.
   */
  emitAssaultCascadeCompleted(event: AssaultCascadeCompletedEvent): void {
    this.dispatch(ASSAULT_CASCADE_COMPLETED, event);
  }

  /** Subscribe to `AssaultCascadeCompletedEvent`s. Consumer: downstream scoring, BO (C-cas). */
  onAssaultCascadeCompleted(listener: (event: AssaultCascadeCompletedEvent) => void): void {
    this.emitter.on(ASSAULT_CASCADE_COMPLETED, listener);
  }

  /**
   * Emit a `RivalEliminatedEvent` (C-cas — RivalEliminationService §9.2).
   * Emitted AFTER the 4-penalty SERIALIZABLE tx commits.
   * ADDITIVE: new discriminant 'rival_eliminated', no existing type modified.
   */
  emitRivalEliminated(event: RivalEliminatedEvent): void {
    this.dispatch(RIVAL_ELIMINATED, event);
  }

  /** Subscribe to `RivalEliminatedEvent`s. Consumer: BO ops, retaliation suspension (C-cas). */
  onRivalEliminated(listener: (event: RivalEliminatedEvent) => void): void {
    this.emitter.on(RIVAL_ELIMINATED, listener);
  }

  /**
   * Emit a `CaseResolvedEvent` (`LegalCaseService.resolveCase`, C7 NIGHTLY sweep).
   * Emitted C7; declared C3. Qualitative only — no raw `info_leak_total` (R2.2/P5). ADDITIVE.
   */
  emitCaseResolved(event: CaseResolvedEvent): void {
    this.dispatch(CASE_RESOLVED, event);
  }

  /** Subscribe to `CaseResolvedEvent`s. Consumers: BPD (conviction final-dump), Exception spine (C7). */
  onCaseResolved(listener: (event: CaseResolvedEvent) => void): void {
    this.emitter.on(CASE_RESOLVED, listener);
  }

  /**
   * Emit a `LawyerBurnedEvent` (`LawyerService.evaluateBurnRisk`, C8 NIGHTLY sweep).
   * Emitted C8; declared C3. Qualitative only — no raw `burn_risk_score` (R2.2/P5, decision #6).
   * This is the IA-B (04d-B) §13 entry-point (flip signal on discovery of a `lawyer` target). ADDITIVE.
   */
  emitLawyerBurned(event: LawyerBurnedEvent): void {
    this.dispatch(LAWYER_BURNED, event);
  }

  /** Subscribe to `LawyerBurnedEvent`s. Consumers: `LegalCaseService` (cancel Tier-3 cases → auto-Tier-1); IA-B §13. */
  onLawyerBurned(listener: (event: LawyerBurnedEvent) => void): void {
    this.emitter.on(LAWYER_BURNED, listener);
  }

  /**
   * Emit a `Tier3LawyerUsedEvent` (`LawyerService.issueTier3Payoff`, 04d-B C3 ADDITIVE emit).
   * Plumbing event (decision #2, 2026-07-01): A emits when a Tier-3 payoff is issued; B subscribes.
   * Qualitative only — NO raw `burn_risk_score` / `suspicion_level` (R2.2/P5). ADDITIVE.
   */
  emitTier3LawyerUsed(event: Tier3LawyerUsedEvent): void {
    this.dispatch(TIER3_LAWYER_USED, event);
  }

  /**
   * Subscribe to `Tier3LawyerUsedEvent`s.
   * Consumer: `IATargetService.handleTier3LawyerUsed` (04d-B C3 — recordCorruptUse accrual).
   */
  onTier3LawyerUsed(listener: (event: Tier3LawyerUsedEvent) => void): void {
    this.emitter.on(TIER3_LAWYER_USED, listener);
  }

  /**
   * Emit an `InvestigationOpenedEvent` (`IAInvestigationService.evaluateThresholdCrossing`, 04d-B C4).
   * Qualitative — NO raw `suspicion_level` (R2.2/P5). ADDITIVE (new NIGHTLY/17 system).
   */
  emitInvestigationOpened(event: InvestigationOpenedEvent): void {
    this.dispatch(INVESTIGATION_OPENED, event);
  }

  /**
   * Subscribe to `InvestigationOpenedEvent`s.
   * Consumers: Exception flow (actor-nervous card, C8+); IATestController (capture probe, C4).
   */
  onInvestigationOpened(listener: (event: InvestigationOpenedEvent) => void): void {
    this.emitter.on(INVESTIGATION_OPENED, listener);
  }

  /**
   * Emit an `IATargetDiscoveredEvent` (`IADiscoveryService.executeDiscovery`, 04d-B C5).
   * Qualitative — NO raw `suspicion_level` / `detection_events` (R2.2/P5).
   * ADDITIVE — new C5 event; no existing consumer disturbed.
   */
  emitIATargetDiscovered(event: IATargetDiscoveredEvent): void {
    this.dispatch(IA_TARGET_DISCOVERED, event);
  }

  /**
   * Subscribe to `IATargetDiscoveredEvent`s.
   * Consumers: IATestController (capture probe, C5); Exception flow (arrest card, C8+).
   */
  onIATargetDiscovered(listener: (event: IATargetDiscoveredEvent) => void): void {
    this.emitter.on(IA_TARGET_DISCOVERED, listener);
  }

  /**
   * Emit a `MaintenancePhaseChangedEvent` (`MaintenancePhaseTickService.runNightlyTick`, 04f-A C2 —
   * NIGHTLY/21). Qualitative — NO raw `days_overdue` / output multiplier (R2.2/P5).
   * ADDITIVE — new C2 event; no existing consumer disturbed.
   */
  emitMaintenancePhaseChanged(event: MaintenancePhaseChangedEvent): void {
    this.dispatch(MAINTENANCE_PHASE_CHANGED, event);
  }

  /**
   * Subscribe to `MaintenancePhaseChangedEvent`s.
   * Consumers: BO/telemetry hook (design §4); none wired yet in C2 (an honest producer-only landing).
   */
  onMaintenancePhaseChanged(listener: (event: MaintenancePhaseChangedEvent) => void): void {
    this.emitter.on(MAINTENANCE_PHASE_CHANGED, listener);
  }

  /**
   * Emit a `MaintenanceScheduledEvent` (`MaintenanceService.scheduleMaintenance` / `applyMassSchedule`, 04f-A
   * C3). Qualitative — NO raw cost cents / days_overdue (R2.2/P5). ADDITIVE — new C3 event; no existing
   * consumer disturbed.
   */
  emitMaintenanceScheduled(event: MaintenanceScheduledEvent): void {
    this.dispatch(MAINTENANCE_SCHEDULED, event);
  }

  /**
   * Subscribe to `MaintenanceScheduledEvent`s.
   * Consumers: BO/telemetry hook (design §9); none wired yet in C3 (an honest producer-only landing).
   */
  onMaintenanceScheduled(listener: (event: MaintenanceScheduledEvent) => void): void {
    this.emitter.on(MAINTENANCE_SCHEDULED, listener);
  }

  /**
   * Emit an `EquipmentFailedEvent` (`EquipmentFailureService`, 04f-A C4 — WEEKLY/11 seeded roll or the
   * critical-daily roll wired into NIGHTLY/21). Qualitative — NO `roll_detail` / probability / baseline
   * (R2.2/P5). ADDITIVE — new C4 event; no existing consumer disturbed.
   */
  emitEquipmentFailed(event: EquipmentFailedEvent): void {
    this.dispatch(EQUIPMENT_FAILED, event);
  }

  /**
   * Subscribe to `EquipmentFailedEvent`s.
   * Consumers: `EquipmentFailureExceptionProducerService` (C5 — the 4-option repair card); none wired yet in
   * C4 (an honest producer-only landing).
   */
  onEquipmentFailed(listener: (event: EquipmentFailedEvent) => void): void {
    this.emitter.on(EQUIPMENT_FAILED, listener);
  }

  /**
   * Emit a `SessionOpenedEvent` (`SessionService.open`, P3-A C2). ADDITIVE — new C2 event; no existing
   * consumer disturbed. Qualitative — NO counters (R2.2/P5).
   */
  emitSessionOpened(event: SessionOpenedEvent): void {
    this.dispatch(SESSION_OPENED, event);
  }

  /**
   * Subscribe to `SessionOpenedEvent`s.
   * Consumers: NONE this lot — the additive seam P3-B/E/H/telemetry subscribe to later (DD-P3).
   */
  onSessionOpened(listener: (event: SessionOpenedEvent) => void): void {
    this.emitter.on(SESSION_OPENED, listener);
  }

  /**
   * Emit a `SessionClosedEvent` (`SessionService.close` / `SessionService.sweepStaleForPlayer`, P3-A C2).
   * ADDITIVE — new C2 event; no existing consumer disturbed. Qualitative — NO counters (R2.2/P5).
   */
  emitSessionClosed(event: SessionClosedEvent): void {
    this.dispatch(SESSION_CLOSED, event);
  }

  /**
   * Subscribe to `SessionClosedEvent`s.
   * Consumers: NONE this lot — the additive seam P3-B/E/H/telemetry subscribe to later (DD-P3).
   */
  onSessionClosed(listener: (event: SessionClosedEvent) => void): void {
    this.emitter.on(SESSION_CLOSED, listener);
  }

  /**
   * Emit an `ExceptionAgedOutEvent` (`ExceptionQueueTickService.runTick`, P3-A C3, D4). ADDITIVE — new
   * C3 event; no existing consumer disturbed. Qualitative — NO raw severity/priority/confidence (R2.2/P5).
   */
  emitExceptionAgedOut(event: ExceptionAgedOutEvent): void {
    this.dispatch(EXCEPTION_AGED_OUT, event);
  }

  /**
   * Subscribe to `ExceptionAgedOutEvent`s.
   * Consumers: NONE this lot — the additive seam P3-B/E/telemetry subscribe to later (DD-P3).
   */
  onExceptionAgedOut(listener: (event: ExceptionAgedOutEvent) => void): void {
    this.emitter.on(EXCEPTION_AGED_OUT, listener);
  }

  /**
   * Emit a `StructuralDecisionCommittedEvent` (`StructuralDecisionGovernorService.commit`, P3-A C5,
   * D8). ADDITIVE — new C5 event; no existing consumer disturbed. Fires for EVERY successful commit,
   * sessionful or sessionless (D9) alike. Qualitative — the catalogue KEY, not the raw int (R2.2/P5).
   */
  emitStructuralDecisionCommitted(event: StructuralDecisionCommittedEvent): void {
    this.dispatch(STRUCTURAL_DECISION_COMMITTED, event);
  }

  /**
   * Subscribe to `StructuralDecisionCommittedEvent`s.
   * Consumers: NONE this lot — the additive seam P3-B/E/H/telemetry subscribe to later (DD-P3).
   */
  onStructuralDecisionCommitted(listener: (event: StructuralDecisionCommittedEvent) => void): void {
    this.emitter.on(STRUCTURAL_DECISION_COMMITTED, listener);
  }

  /**
   * Emit a `FlagRaisedEvent` (`FlagDisciplineService.flagItem`, P3-B C2, D3/D4). ADDITIVE — new C2 event;
   * no existing consumer disturbed. Fires ONLY on an actual flag creation (deduct-win + insert-win).
   */
  emitFlagRaised(event: FlagRaisedEvent): void {
    this.dispatch(FLAG_RAISED, event);
  }

  /**
   * Subscribe to `FlagRaisedEvent`s.
   * Consumers: NONE this lot — the additive seam P3-B/E/telemetry subscribe to later (DD-P3).
   */
  onFlagRaised(listener: (event: FlagRaisedEvent) => void): void {
    this.emitter.on(FLAG_RAISED, listener);
  }

  /**
   * Emit a `FlagVerdictEvent` (`FlagDisciplineService.validateFlag`/`dismissFlag`, P3-B C2, D10).
   * ADDITIVE — new C2 event; no existing consumer disturbed. Fires ONLY on a transition-win (never on the
   * 409 transition-lose branch).
   */
  emitFlagVerdict(event: FlagVerdictEvent): void {
    this.dispatch(FLAG_VERDICT, event);
  }

  /**
   * Subscribe to `FlagVerdictEvent`s.
   * Consumers: NONE this lot — the additive seam P3-B/E/telemetry subscribe to later (DD-P3).
   */
  onFlagVerdict(listener: (event: FlagVerdictEvent) => void): void {
    this.emitter.on(FLAG_VERDICT, listener);
  }

  /**
   * Emit a `FlagTokenExhaustionEvent` (`FlagExhaustionFallbackService.raiseIfClear`, P3-B C4, D9).
   * ADDITIVE — new C4 event; no existing consumer disturbed. Fires ONLY on an actual card insert
   * (never on `deduped`/`cap_refused`).
   */
  emitFlagTokenExhaustion(event: FlagTokenExhaustionEvent): void {
    this.dispatch(FLAG_TOKEN_EXHAUSTION, event);
  }

  /**
   * Subscribe to `FlagTokenExhaustionEvent`s.
   * Consumers: NONE this lot — the additive seam P3-E/telemetry subscribe to later (DD-P3).
   */
  onFlagTokenExhaustion(listener: (event: FlagTokenExhaustionEvent) => void): void {
    this.emitter.on(FLAG_TOKEN_EXHAUSTION, listener);
  }

  /**
   * Emit a `FlagWeeklyResetEvent` (`FlagWeeklyResetTickService.runTick`, P3-B C5, D8). ADDITIVE — new C5
   * event; no existing consumer disturbed. Fires ONCE per `lieutenant_flag_state` row the epoch-guarded
   * reset actually touched (never on a same-epoch re-run — zero rows touched, zero events).
   */
  emitFlagWeeklyReset(event: FlagWeeklyResetEvent): void {
    this.dispatch(FLAG_WEEKLY_RESET, event);
  }

  /**
   * Subscribe to `FlagWeeklyResetEvent`s.
   * Consumers: NONE this lot — the additive seam P3-B/E/telemetry subscribe to later (DD-P3).
   */
  onFlagWeeklyReset(listener: (event: FlagWeeklyResetEvent) => void): void {
    this.emitter.on(FLAG_WEEKLY_RESET, listener);
  }

  /**
   * Emit a `StackCommittedEvent` (`CueStackService.commit`, P3-D C2, I2). ADDITIVE — new C2 event; no
   * existing consumer disturbed. Fires ONLY on the ONE winning atomic commit (never on the 409 branch).
   */
  emitStackCommitted(event: StackCommittedEvent): void {
    this.dispatch(STACK_COMMITTED, event);
  }

  /**
   * Subscribe to `StackCommittedEvent`s.
   * Consumers: NONE this lot — C3's tick / C7's HL provider 108 / BO / telemetry subscribe later (DD-P3).
   */
  onStackCommitted(listener: (event: StackCommittedEvent) => void): void {
    this.emitter.on(STACK_COMMITTED, listener);
  }

  /**
   * Emit a `SlotExecutedEvent` (`CueStackExecutionTickService.runTick`, P3-D C3). Fires ONLY on a
   * successful firing (`status='done'`) — never on `failed_collision`/`failed_executor`.
   */
  emitSlotExecuted(event: SlotExecutedEvent): void {
    this.dispatch(SLOT_EXECUTED, event);
  }

  /**
   * Subscribe to `SlotExecutedEvent`s.
   * Consumers: NONE this lot — the additive seam telemetry/BO subscribe to later (DD-P3).
   */
  onSlotExecuted(listener: (event: SlotExecutedEvent) => void): void {
    this.emitter.on(SLOT_EXECUTED, listener);
  }

  /**
   * Emit a `SlotFailedEvent` (`CueStackExecutionTickService.runTick` for `failed_collision`/
   * `failed_executor`, P3-D C3; `CueStackDisruptionService` for `failed_disrupted`, P3-D C4).
   */
  emitSlotFailed(event: SlotFailedEvent): void {
    this.dispatch(SLOT_FAILED, event);
  }

  /**
   * Subscribe to `SlotFailedEvent`s.
   * Consumers: NONE this lot — `CueCascadeExceptionProducer` is a NEW `insert` caller, not a subscriber
   * here (additive seam, DD-P3).
   */
  onSlotFailed(listener: (event: SlotFailedEvent) => void): void {
    this.emitter.on(SLOT_FAILED, listener);
  }

  /**
   * Emit a `RouteCreatedEvent` (`RouteService.createRoute`, P3-D C6). ADDITIVE — new C6 event; no existing
   * consumer disturbed. Fires on every genuinely persisted saved route.
   */
  emitRouteCreated(event: RouteCreatedEvent): void {
    this.dispatch(ROUTE_CREATED, event);
  }

  /** Subscribe to `RouteCreatedEvent`s. Consumer: `AnnealingInitiationSubscriberService` (P3-D C6). */
  onRouteCreated(listener: (event: RouteCreatedEvent) => void): void {
    this.emitter.on(ROUTE_CREATED, listener);
  }

  /**
   * Emit a `RouteRebuiltEvent` (`RouteRebuildService.rebuild`, P3-D C6). ADDITIVE — new C6 event. Fires
   * ONLY after a successful rebuild commit (never on a refused/409 attempt).
   */
  emitRouteRebuilt(event: RouteRebuiltEvent): void {
    this.dispatch(ROUTE_REBUILT, event);
  }

  /** Subscribe to `RouteRebuiltEvent`s. Consumer: `AnnealingInitiationSubscriberService` (P3-D C6). */
  onRouteRebuilt(listener: (event: RouteRebuiltEvent) => void): void {
    this.emitter.on(ROUTE_REBUILT, listener);
  }

  /**
   * Emit a `LieutenantReassignedEvent` (`LieutenantService.reassign`, P3-D C6). ADDITIVE — new C6 event.
   * Fires ONLY on the ONE atomic move+reset+settling write (never on a 404/409 refusal).
   */
  emitLieutenantReassigned(event: LieutenantReassignedEvent): void {
    this.dispatch(LIEUTENANT_REASSIGNED, event);
  }

  /** Subscribe to `LieutenantReassignedEvent`s. Consumer: `AnnealingInitiationSubscriberService` (P3-D C6). */
  onLieutenantReassigned(listener: (event: LieutenantReassignedEvent) => void): void {
    this.emitter.on(LIEUTENANT_REASSIGNED, listener);
  }

  /**
   * Emit a `HireCompletedEvent` (`RecruitmentQuestService.finalizeHire`, P3-D C6). ADDITIVE — new C6
   * event. Fires ONLY on the winning branch of `finalizeHireAtomic`'s own RETURNING.
   */
  emitHireCompleted(event: HireCompletedEvent): void {
    this.dispatch(HIRE_COMPLETED, event);
  }

  /** Subscribe to `HireCompletedEvent`s. Consumer: `AnnealingInitiationSubscriberService` (P3-D C6). */
  onHireCompleted(listener: (event: HireCompletedEvent) => void): void {
    this.emitter.on(HIRE_COMPLETED, listener);
  }

  /**
   * Emit a `ScriptAttachedEvent` (`LieutenantService.attachScript`, P3-D C6). ADDITIVE — new C6 event.
   * Fires ONLY on a genuine re-script (`wasValid===true`), never on the first authoring.
   */
  emitScriptAttached(event: ScriptAttachedEvent): void {
    this.dispatch(SCRIPT_ATTACHED, event);
  }

  /** Subscribe to `ScriptAttachedEvent`s. Consumer: `AnnealingInitiationSubscriberService` (P3-D C6). */
  onScriptAttached(listener: (event: ScriptAttachedEvent) => void): void {
    this.emitter.on(SCRIPT_ATTACHED, listener);
  }

  /**
   * Emit a `SettlingInitiatedEvent` (`AnnealingService.initiateOrCompound`, P3-D C6, I5 fresh-initiation
   * branch). ADDITIVE — new C6 event.
   */
  emitSettlingInitiated(event: SettlingInitiatedEvent): void {
    this.dispatch(SETTLING_INITIATED, event);
  }

  /** Subscribe to `SettlingInitiatedEvent`s. Consumers: NONE this lot (DD-P3). */
  onSettlingInitiated(listener: (event: SettlingInitiatedEvent) => void): void {
    this.emitter.on(SETTLING_INITIATED, listener);
  }

  /**
   * Emit a `CompoundingStrainEvent` (`AnnealingService.initiateOrCompound`, P3-D C6, I5 compounding
   * branch). ADDITIVE — new C6 event.
   */
  emitCompoundingStrain(event: CompoundingStrainEvent): void {
    this.dispatch(COMPOUNDING_STRAIN, event);
  }

  /** Subscribe to `CompoundingStrainEvent`s. Consumers: NONE this lot (DD-P3). */
  onCompoundingStrain(listener: (event: CompoundingStrainEvent) => void): void {
    this.emitter.on(COMPOUNDING_STRAIN, listener);
  }

  /**
   * Emit a `SettlingCompletedEvent` (`AnnealingSettleSweepService.runSweep`, P3-D C6, I6 exactly-once —
   * the sweep's own RETURNING gates this emit, once per row it actually flipped). ADDITIVE — new C6 event.
   */
  emitSettlingCompleted(event: SettlingCompletedEvent): void {
    this.dispatch(SETTLING_COMPLETED, event);
  }

  /** Subscribe to `SettlingCompletedEvent`s. Consumers: NONE this lot (DD-P3). */
  onSettlingCompleted(listener: (event: SettlingCompletedEvent) => void): void {
    this.emitter.on(SETTLING_COMPLETED, listener);
  }

  /**
   * Emit an `OffHoursDriftDetectedEvent` (`OffHoursDriftDetectorService.runDetection`, 04g-A C3, design
   * §3.4). ADDITIVE — new C3 event; no existing consumer disturbed. Fired ONCE PER AFFECTED PLAYER on a
   * genuine district trip (never on a sub-threshold or calibration-only pass).
   */
  emitOffHoursDriftDetected(event: OffHoursDriftDetectedEvent): void {
    this.dispatch(OFF_HOURS_DRIFT_DETECTED, event);
  }

  /** Subscribe to `OffHoursDriftDetectedEvent`s. Used by `AmbientDriftExceptionProducerService` (S5 pattern). */
  onOffHoursDriftDetected(listener: (event: OffHoursDriftDetectedEvent) => void): void {
    this.emitter.on(OFF_HOURS_DRIFT_DETECTED, listener);
  }

  /**
   * Emit a `CouplingDiscoveryExposedEvent` (`RandomWorldCouplingService.applyCouplingDiscovery`, 04g-B
   * C3, design §3.6). ADDITIVE — new C3 event; no existing consumer disturbed. Fired ONCE PER ADMITTED
   * PLAYER on a genuine FRESH cascade-row insert (never on a gated or already-exposed attempt).
   */
  emitCouplingDiscoveryExposed(event: CouplingDiscoveryExposedEvent): void {
    this.dispatch(COUPLING_DISCOVERY_EXPOSED, event);
  }

  /** Subscribe to `CouplingDiscoveryExposedEvent`s. Used by `RandomWorldExceptionProducerService` (S14 pattern). */
  onCouplingDiscoveryExposed(listener: (event: CouplingDiscoveryExposedEvent) => void): void {
    this.emitter.on(COUPLING_DISCOVERY_EXPOSED, listener);
  }

  /**
   * Emit an `EfficiencyPenaltyAppliedEvent` (`FrictionBudgetTickService.runTick`, P3-E C2, design §5.1).
   * ADDITIVE — new C2 event; no existing consumer disturbed. Fired ONLY on the I4-guarded FRESH
   * `false → true` penalty transition (never on a re-tick that finds it already active).
   */
  emitEfficiencyPenaltyApplied(event: EfficiencyPenaltyAppliedEvent): void {
    this.dispatch(EFFICIENCY_PENALTY_APPLIED, event);
  }

  /** Subscribe to `EfficiencyPenaltyAppliedEvent`s. Consumers: NONE this lot (additive seam, DD-P3 precedent). */
  onEfficiencyPenaltyApplied(listener: (event: EfficiencyPenaltyAppliedEvent) => void): void {
    this.emitter.on(EFFICIENCY_PENALTY_APPLIED, listener);
  }

  /**
   * Emit an `EfficiencyPenaltyRevertedEvent` (`FrictionBudgetTickService.runTick`, P3-E C2, design §5.1,
   * divergence #9). ADDITIVE — new C2 event. Fired ONLY on the I4-guarded FRESH `true → false` transition.
   */
  emitEfficiencyPenaltyReverted(event: EfficiencyPenaltyRevertedEvent): void {
    this.dispatch(EFFICIENCY_PENALTY_REVERTED, event);
  }

  /** Subscribe to `EfficiencyPenaltyRevertedEvent`s. Consumers: NONE this lot (additive seam, DD-P3 precedent). */
  onEfficiencyPenaltyReverted(listener: (event: EfficiencyPenaltyRevertedEvent) => void): void {
    this.emitter.on(EFFICIENCY_PENALTY_REVERTED, listener);
  }

  /**
   * Emit a `NodeDecommissionedEvent` (`DecommissionService.decommission`, P3-E C4, design §3.2/§6.3).
   * ADDITIVE — new C4 event. Fires ONCE, POST-COMMIT, on every genuine decommission (never on a
   * refused/404/409 attempt — the tx that would have produced this event never committed).
   */
  emitNodeDecommissioned(event: NodeDecommissionedEvent): void {
    this.dispatch(NODE_DECOMMISSIONED, event);
  }

  /** Subscribe to `NodeDecommissionedEvent`s. Consumer: `AnnealingInitiationSubscriberService` (P3-E C4
   *  — the BUILDING_DECOMMISSION annealing trigger on every embedded neighbor). */
  onNodeDecommissioned(listener: (event: NodeDecommissionedEvent) => void): void {
    this.emitter.on(NODE_DECOMMISSIONED, listener);
  }

  /**
   * Emit a `CompressionWeekTriggeredEvent` (`CompressionStressSubscriber`, P3-E C6, design §9.2).
   * ADDITIVE — new C6 event. Fires ONCE per genuine `'none' -> 'warning'` transition (never on a
   * re-crossing while already `'warning'`/`'active'` — the transition's own guarded UPDATE gates this).
   */
  emitCompressionWeekTriggered(event: CompressionWeekTriggeredEvent): void {
    this.dispatch(COMPRESSION_WEEK_TRIGGERED, event);
  }

  /** Subscribe to `CompressionWeekTriggeredEvent`s. Consumers: NONE this lot (additive seam — C7's
   *  `ProblemAggregator`/board-seeding subscribes later, DD-P3 precedent). */
  onCompressionWeekTriggered(listener: (event: CompressionWeekTriggeredEvent) => void): void {
    this.emitter.on(COMPRESSION_WEEK_TRIGGERED, listener);
  }

  /**
   * Emit a `CompressionWeekFinalizedEvent` (`CompressionFinalizeService.finalize`, P3-E C7, design
   * §10.4). ADDITIVE — new C7 event. Fires ONCE per genuine `'active' -> 'finalized'` transition (I8 —
   * a losing racer under 2 concurrent finalizes never reaches this).
   */
  emitCompressionWeekFinalized(event: CompressionWeekFinalizedEvent): void {
    this.dispatch(COMPRESSION_WEEK_FINALIZED, event);
  }

  /** Subscribe to `CompressionWeekFinalizedEvent`s. Consumers: NONE this lot (additive seam — BO/
   *  telemetry hook later, DD-P3 precedent). */
  onCompressionWeekFinalized(listener: (event: CompressionWeekFinalizedEvent) => void): void {
    this.emitter.on(COMPRESSION_WEEK_FINALIZED, listener);
  }

  /**
   * Emit a `PrecursorOrderFilledEvent` (`PrecursorArrivalService.runMinuteTick`, P3-F C2). ADDITIVE — new
   * C2 event. Fires ONCE PER ARRIVED ORDER, immediately after `applyArrivalBatch` succeeds.
   */
  emitPrecursorOrderFilled(event: PrecursorOrderFilledEvent): void {
    this.dispatch(PRECURSOR_ORDER_FILLED, event);
  }

  /** Subscribe to `PrecursorOrderFilledEvent`s. Consumer: `MasteryAccumulatorService` (P3-F C2). */
  onPrecursorOrderFilled(listener: (event: PrecursorOrderFilledEvent) => void): void {
    this.emitter.on(PRECURSOR_ORDER_FILLED, listener);
  }

  /**
   * Emit a `DirectHireCompletedEvent` (`LieutenantService.recruit`, P3-F C2, classic direct-recruit path
   * ONLY — `questExtension` undefined). ADDITIVE — new C2 event, a SIBLING of `HireCompletedEvent` (never
   * fired alongside it for the SAME recruit — see the interface's own header for why).
   */
  emitDirectHireCompleted(event: DirectHireCompletedEvent): void {
    this.dispatch(DIRECT_HIRE_COMPLETED, event);
  }

  /** Subscribe to `DirectHireCompletedEvent`s. Consumer: `MasteryAccumulatorService` (P3-F C2). */
  onDirectHireCompleted(listener: (event: DirectHireCompletedEvent) => void): void {
    this.emitter.on(DIRECT_HIRE_COMPLETED, listener);
  }

  /**
   * Emit a `MasteryThresholdCrossedEvent` (`MasteryAccumulatorService.applyDelta`, P3-F C2). ADDITIVE —
   * new C2 event. Fires EXACTLY ONCE per genuine threshold crossing (either direction).
   */
  emitMasteryThresholdCrossed(event: MasteryThresholdCrossedEvent): void {
    this.dispatch(MASTERY_THRESHOLD_CROSSED, event);
  }

  /** Subscribe to `MasteryThresholdCrossedEvent`s. Consumers: NONE this lot (additive seam — the
   *  org-overview projection/BO dashboard subscribe later). */
  onMasteryThresholdCrossed(listener: (event: MasteryThresholdCrossedEvent) => void): void {
    this.emitter.on(MASTERY_THRESHOLD_CROSSED, listener);
  }

  /**
   * Emit a `GraduationCommittedEvent` (`GraduationService.executeGraduation`, P3-F C5). ADDITIVE — new
   * C5 event. Fires POST-COMMIT, exactly once per successful graduation (never on a validation refusal,
   * never on a lost concurrency race, never on an induced/genuine mid-tx failure — the governor's own
   * compensation path never reaches this emit).
   */
  emitGraduationCommitted(event: GraduationCommittedEvent): void {
    this.dispatch(GRADUATION_COMMITTED, event);
  }

  /** Subscribe to `GraduationCommittedEvent`s. Consumers: NONE this lot (additive seam —
   *  `PlayerProficiencySeeder` subscribes at C7, design §4). */
  onGraduationCommitted(listener: (event: GraduationCommittedEvent) => void): void {
    this.emitter.on(GRADUATION_COMMITTED, listener);
  }

  /**
   * Emit a `RecallDebtRecoveredEvent` (`RecallDebtSessionSubscriber`, P3-F C7). ADDITIVE — new C7 event.
   * Fires the instant a per-session recovery decrement brings a (player, category) row to exactly 0.
   */
  emitRecallDebtRecovered(event: RecallDebtRecoveredEvent): void {
    this.dispatch(RECALL_DEBT_RECOVERED, event);
  }

  /** Subscribe to `RecallDebtRecoveredEvent`s. Consumers: NONE this lot (additive seam —
   *  `DegradedCategoryPressureProducer` subscribes at C9, design §4). */
  onRecallDebtRecovered(listener: (event: RecallDebtRecoveredEvent) => void): void {
    this.emitter.on(RECALL_DEBT_RECOVERED, listener);
  }

  /**
   * Emit a `RecallInitiatedEvent` (`PromotionLockService.requestRecall`, P3-F C8). ADDITIVE — new C8
   * event. Fires POST-COMMIT, exactly once per successful recall (never on a lost race, a validation
   * refusal, or an induced/genuine post-flip failure).
   */
  emitRecallInitiated(event: RecallInitiatedEvent): void {
    this.dispatch(RECALL_INITIATED, event);
  }

  /** Subscribe to `RecallInitiatedEvent`s. Consumers: NONE this lot (additive seam — the org-overview
   *  projection/BO dashboard subscribe later). */
  onRecallInitiated(listener: (event: RecallInitiatedEvent) => void): void {
    this.emitter.on(RECALL_INITIATED, listener);
  }

  /**
   * Emit an `UnmanagedWindowClosedEvent` (`PromotionLockTickService.runTick`, P3-F C8; ALSO
   * `MetaProgressionAdminController#forceCloseWindow`, C10 — design §12's own "emits the SAME event"
   * mandate). ADDITIVE — new C8 event. Fires ONCE per `promotion_locks` row an HOURLY tick (or a GM
   * force-close) call ACTUALLY closed — an idempotent re-run / a race loser emits nothing (both callers'
   * own atomic `WHERE unmanaged_window_state='ACTIVE'` guard — see `PromotionLocksRepository.
   * closeExpiredWindows`/`forceCloseLock`'s own headers).
   */
  emitUnmanagedWindowClosed(event: UnmanagedWindowClosedEvent): void {
    this.dispatch(UNMANAGED_WINDOW_CLOSED, event);
  }

  /** Subscribe to `UnmanagedWindowClosedEvent`s. Consumers: `PromotionLockTickService` (C10 — a REAL
   *  in-memory test-probe capture, `getClosedWindowEvents`/`clearClosedWindowEvents`, subscribed once at
   *  boot; captures BOTH emitters above in true arrival order — the C10 concurrency-race falsifiable's own
   *  observation surface). Production-side: the successor-SUSPENDED overlay still lifts derivationally (no
   *  consumer required for correctness there). */
  onUnmanagedWindowClosed(listener: (event: UnmanagedWindowClosedEvent) => void): void {
    this.emitter.on(UNMANAGED_WINDOW_CLOSED, listener);
  }

  /**
   * Emit an `AccordDegradationEvent` (`PromotionLockService.requestRecall`'s own `applyReversalDamage`
   * step, P3-F C8). ADDITIVE — new C8 event. Fires on EVERY recall (never skipped, design §9.3's own
   * "honest-inert, never skipped" contract) — `applied` distinguishes a genuine REAL 04c ring write from
   * the theoretical inert fallback.
   */
  emitAccordDegradation(event: AccordDegradationEvent): void {
    this.dispatch(ACCORD_DEGRADATION, event);
  }

  /** Subscribe to `AccordDegradationEvent`s. Consumers: NONE this lot (additive seam — trace/telemetry,
   *  BO forensics later). */
  onAccordDegradation(listener: (event: AccordDegradationEvent) => void): void {
    this.emitter.on(ACCORD_DEGRADATION, listener);
  }

  /**
   * Emit a `CapabilityHorizonSurfacedEvent` (`HorizonCardSurfacingService.processSessionOpened`, P3-G
   * C3). ADDITIVE — new C3 event. Fires POST-COMMIT, exactly once per (player, capability) INSERT-if-
   * absent that actually landed a NEW row (a race loser never emits — the R10 unique index is the proof).
   */
  emitCapabilityHorizonSurfaced(event: CapabilityHorizonSurfacedEvent): void {
    this.dispatch(CAPABILITY_HORIZON_SURFACED, event);
  }

  /** Subscribe to `CapabilityHorizonSurfacedEvent`s. Consumers: NONE this lot (additive seam —
   *  BO/telemetry subscribe later). */
  onCapabilityHorizonSurfaced(listener: (event: CapabilityHorizonSurfacedEvent) => void): void {
    this.emitter.on(CAPABILITY_HORIZON_SURFACED, listener);
  }

  /**
   * Emit a `CapabilityAdoptedEvent` (`AdoptionService`, P3-G C5 — NOT YET BUILT). ADDITIVE — the type/
   * dispatch machinery lands at C4 so `BudgetRecomputeService`'s subscription is real and wired now;
   * nothing in production calls this method until C5 lands the adoption verb (dormant-by-construction,
   * plan C4: "wired here, dormant until C5").
   */
  emitCapabilityAdopted(event: CapabilityAdoptedEvent): void {
    this.dispatch(CAPABILITY_ADOPTED, event);
  }

  /** Subscribe to `CapabilityAdoptedEvent`s. Consumers: `BudgetRecomputeService` (P3-G C4, dormant — no
   *  real emitter yet); `VocabTierAdvancementService` (C6) + `IsostaticDebtService.applyUpgrade` (C7)
   *  subscribe later, same event (D13). */
  onCapabilityAdopted(listener: (event: CapabilityAdoptedEvent) => void): void {
    this.emitter.on(CAPABILITY_ADOPTED, listener);
  }

  /**
   * Emit a `VocabTierAdvancedEvent` (`VocabTierAdvancementService.handleCapabilityAdopted`, P3-G C6).
   * ADDITIVE — new C6 event. Fires ONLY on an actual `rule_vocabulary_tier` write (the monotone
   * WHERE-guard's `RETURNING` non-empty) — a replay or an out-of-order tier never reaches this emit.
   */
  emitVocabTierAdvanced(event: VocabTierAdvancedEvent): void {
    this.dispatch(VOCAB_TIER_ADVANCED, event);
  }

  /** Subscribe to `VocabTierAdvancedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry
   *  subscribe later). */
  onVocabTierAdvanced(listener: (event: VocabTierAdvancedEvent) => void): void {
    this.emitter.on(VOCAB_TIER_ADVANCED, listener);
  }

  /**
   * Emit a `CapabilityDebtClearedEvent` (`IsostaticDebtService.applyActiveDecay`, P3-G C7). ADDITIVE —
   * new C7 event. Fires ONLY when a floor-guarded decrement's `RETURNING` shows a row that crossed
   * pre>0 to post=0 THIS call (a row already at 0 never matches the decrement's own WHERE, so a re-fire
   * never re-emits).
   */
  emitCapabilityDebtCleared(event: CapabilityDebtClearedEvent): void {
    this.dispatch(CAPABILITY_DEBT_CLEARED, event);
  }

  /** Subscribe to `CapabilityDebtClearedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry
   *  subscribe later). */
  onCapabilityDebtCleared(listener: (event: CapabilityDebtClearedEvent) => void): void {
    this.emitter.on(CAPABILITY_DEBT_CLEARED, listener);
  }

  /**
   * Emit a `CycleExecutedOnPlanEvent` (`ExecutionPlanEvaluatorService.runTick`, P3-H C3). ADDITIVE — new
   * C3 event. Fires ONLY after a slot's guarded `EXECUTED_ON_PLAN` transition actually landed (a lost-race
   * duplicate tick never reaches this emit).
   */
  emitCycleExecutedOnPlan(event: CycleExecutedOnPlanEvent): void {
    this.dispatch(CYCLE_EXECUTED_ON_PLAN, event);
  }

  /** Subscribe to `CycleExecutedOnPlanEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry
   *  subscribe later). */
  onCycleExecutedOnPlan(listener: (event: CycleExecutedOnPlanEvent) => void): void {
    this.emitter.on(CYCLE_EXECUTED_ON_PLAN, listener);
  }

  /**
   * Emit a `PlanAbortedEvent` (`ExecutionPlanEvaluatorService.runTick`, P3-H C3). ADDITIVE — new C3 event.
   * Fires ONLY after the plan's guarded `ABORTED` transition actually landed.
   */
  emitPlanAborted(event: PlanAbortedEvent): void {
    this.dispatch(PLAN_ABORTED, event);
  }

  /** Subscribe to `PlanAbortedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry subscribe
   *  later). */
  onPlanAborted(listener: (event: PlanAbortedEvent) => void): void {
    this.emitter.on(PLAN_ABORTED, listener);
  }

  /**
   * Emit a `PlanAdaptedEvent` (`AdaptationResolverService.resolve`, P3-H C4). ADDITIVE — new C4 event.
   * Fires ONLY after the plan's guarded `ADAPTED` transition actually landed.
   */
  emitPlanAdapted(event: PlanAdaptedEvent): void {
    this.dispatch(PLAN_ADAPTED, event);
  }

  /** Subscribe to `PlanAdaptedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry subscribe
   *  later). */
  onPlanAdapted(listener: (event: PlanAdaptedEvent) => void): void {
    this.emitter.on(PLAN_ADAPTED, listener);
  }

  /**
   * Emit a `HorizonTierAdvancedEvent` (`HorizonTierAdvancementService.advance`, P3-H C4). ADDITIVE — new
   * C4 event. Fires ONLY after the monotone WHERE-guarded `decision_horizon_tier` UPDATE actually landed
   * a row (a replay / out-of-order / lost-race call never reaches this emit).
   */
  emitHorizonTierAdvanced(event: HorizonTierAdvancedEvent): void {
    this.dispatch(HORIZON_TIER_ADVANCED, event);
  }

  /** Subscribe to `HorizonTierAdvancedEvent`s. Consumers: `BenchmarkQuotaService.onHorizonAdvanced` (P3-H
   *  C7, D12 — WIRED, see that file's own `onApplicationBootstrap`). */
  onHorizonTierAdvanced(listener: (event: HorizonTierAdvancedEvent) => void): void {
    this.emitter.on(HORIZON_TIER_ADVANCED, listener);
  }

  /**
   * Emit a `PressureTierUnlockedEvent` (`PressureTierService.onGraduation`, P3-H C5). ADDITIVE — new C5
   * event. Fires ONLY after the guarded `pressure_tier` UPDATE actually landed an advance THIS call (a
   * graduation that merely incremented the count without crossing the unlock threshold never reaches this
   * emit).
   */
  emitPressureTierUnlocked(event: PressureTierUnlockedEvent): void {
    this.dispatch(PRESSURE_TIER_UNLOCKED, event);
  }

  /** Subscribe to `PressureTierUnlockedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry
   *  subscribe later). */
  onPressureTierUnlocked(listener: (event: PressureTierUnlockedEvent) => void): void {
    this.emitter.on(PRESSURE_TIER_UNLOCKED, listener);
  }

  /**
   * Emit a `PressureTierObservationExpiredEvent` (`PressureTierService.onSessionStart`, P3-H C5). ADDITIVE
   * — new C5 event. Fires ONLY after the guarded `tier4_observation_until_tick -> NULL` UPDATE actually
   * matched a row THIS call (D9's own "once" discipline — a session-open with no open/expired window, or a
   * window still genuinely open, never reaches this emit).
   */
  emitPressureTierObservationExpired(event: PressureTierObservationExpiredEvent): void {
    this.dispatch(PRESSURE_TIER_OBSERVATION_EXPIRED, event);
  }

  /** Subscribe to `PressureTierObservationExpiredEvent`s. Consumers: NONE this lot (additive seam —
   *  BO/telemetry subscribe later). */
  onPressureTierObservationExpired(listener: (event: PressureTierObservationExpiredEvent) => void): void {
    this.emitter.on(PRESSURE_TIER_OBSERVATION_EXPIRED, listener);
  }

  /**
   * Emit a `BaselineAutoUpdatedEvent` (`BenchmarkDriftService.runTick`, P3-H C6). ADDITIVE — new C6 event.
   * Fires ONLY after `PlayerMetricBenchmarksRepository#accumulateAndMaybeAutoUpdate`'s own guarded UPDATE
   * actually performed a crossing THIS call (a normal accumulate-without-crossing, or an idempotency-guard-
   * blocked same-game-day repeat, never reaches this emit). BO-ONLY BY DESIGN — never surfaced to any
   * player-facing projection (design §9.2's own "never surfaced player").
   */
  emitBaselineAutoUpdated(event: BaselineAutoUpdatedEvent): void {
    this.dispatch(BASELINE_AUTO_UPDATED, event);
  }

  /** Subscribe to `BaselineAutoUpdatedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry
   *  subscribe later; ★ NEVER a player-facing subscriber — see this event's own header). */
  onBaselineAutoUpdated(listener: (event: BaselineAutoUpdatedEvent) => void): void {
    this.emitter.on(BASELINE_AUTO_UPDATED, listener);
  }

  /**
   * Emit a `LaggingIndicatorRevealedEvent` (`BenchmarkDriftService.reAnchor`, P3-H C7). ADDITIVE — new C7
   * event. Fires ONLY on the ABOVE_ACTUAL branch of the old-vs-new baseline compare (never BELOW_ACTUAL/
   * AT_ACTUAL — see this event's own header).
   */
  emitLaggingIndicatorRevealed(event: LaggingIndicatorRevealedEvent): void {
    this.dispatch(LAGGING_INDICATOR_REVEALED, event);
  }

  /** Subscribe to `LaggingIndicatorRevealedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry
   *  subscribe later). */
  onLaggingIndicatorRevealed(listener: (event: LaggingIndicatorRevealedEvent) => void): void {
    this.emitter.on(LAGGING_INDICATOR_REVEALED, listener);
  }

  /**
   * Emit a `ReAnchorExecutedEvent` (`BenchmarkDriftService.reAnchor`, P3-H C7). ADDITIVE — new C7 event.
   * Fires ONLY after the guarded quota decrement landed AND every requested metric was snapshotted (a
   * quota-exhausted or metrics-count-exceeded refusal never reaches this emit).
   */
  emitReAnchorExecuted(event: ReAnchorExecutedEvent): void {
    this.dispatch(REANCHOR_EXECUTED, event);
  }

  /** Subscribe to `ReAnchorExecutedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry subscribe
   *  later). */
  onReAnchorExecuted(listener: (event: ReAnchorExecutedEvent) => void): void {
    this.emitter.on(REANCHOR_EXECUTED, listener);
  }

  /**
   * Emit a `ReAnchorQuotaUpgradedEvent` (`BenchmarkQuotaService.onHorizonAdvanced`, P3-H C7). ADDITIVE — new
   * C7 event. Fires ONLY after the guarded `max_uses_per_week` UPDATE actually raised it THIS call (a
   * `HorizonTierAdvancedEvent` whose computed band is not genuinely higher than the current max never
   * reaches this emit — the monotone discipline).
   */
  emitReAnchorQuotaUpgraded(event: ReAnchorQuotaUpgradedEvent): void {
    this.dispatch(REANCHOR_QUOTA_UPGRADED, event);
  }

  /** Subscribe to `ReAnchorQuotaUpgradedEvent`s. Consumers: NONE this lot (additive seam — BO/telemetry
   *  subscribe later). */
  onReAnchorQuotaUpgraded(listener: (event: ReAnchorQuotaUpgradedEvent) => void): void {
    this.emitter.on(REANCHOR_QUOTA_UPGRADED, listener);
  }
}
