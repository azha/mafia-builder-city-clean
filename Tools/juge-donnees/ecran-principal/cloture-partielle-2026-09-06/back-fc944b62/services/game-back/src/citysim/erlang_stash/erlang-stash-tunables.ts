// IMPLEMENTS: docs/tech/04_city_simulation/system_9_erlang_stash.md §Tunables
//             (gdd/14 §City — Erlang Stash, lines 167–169 — REUSE 3 keys; + gdd/14 §Operational chain — stash
//              line 3237 — stash.blocking_alert_threshold, backported ch16 A1). The keys this system's OWN logic
//              actually CONSUMES are EXISTING registry keys (R2.3 — ZERO genuinely-NEW).
//             -- session:2026-06-03 (Phase 1 Task 10) --
//
// System 9 (Erlang Stash Capacity) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md`. They are surfaced here as env-overridable fallbacks so
// this file stays a faithful MIRROR of the single source of truth (the registry). If the registry values change,
// update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (only mirror what the day-1 logic consumes — the dwell-time/unconformity precedent): the
// resolved `erlangStashTunables` object surfaces the keys System 9's MINUTE tick / projection CONSUMES at runtime:
//   - `stash.blocking_alert_threshold` (gdd/14 §Operational chain — stash, L3237, default 0.25, range 0.05..0.80)
//     — the blocking_probability threshold beyond which a safehouse emits StashHighBlockingAlertEvent + surfaces
//     the SATURATED blocking band (Inv 3 §Update tick Phase C step 3). CONSUMED day-1 to gate the alert + the
//     district-summary alert flag. This is the ONE float scalar (ops-policy continuous probability — R2.2
//     inapplicable, per the gdd/14 backport note: "Scalaire légitime (probabilité float continu, ops-policy)").
//   - `raid_drain_order_default` (gdd/14 §City — Erlang Stash, L169, default top-down, enum top/random/bottom) —
//     the default raid drain order (Inv 6). CONSUMED as the fallback when a safehouse row carries no explicit
//     raid_drain_policy override (the schema column is NOT NULL, so day-1 every row has one; this default is the
//     deterministic drainOrder() fallback + the documented policy the seed/build flow stamps). The drain LOGIC is
//     exercised on a raid (raids = P2); the ordering is implemented deterministically here (drainOrder helper).
//
// DEFERRED — `slot_count_C` (gdd/14 L167, default 4, range 1..12) and `slot_capacity_S_cents` (gdd/14 L168,
// default 10000, range 1000..100000) are NOT resolved here as consumed CONSTANTS. System 9's MINUTE tick reads
// the PER-SAFEHOUSE persisted `slot_count` (= C, the Erlang-B parameter) and `slot_capacity_cents` (= S) FROM THE
// ROW (safehouses.slot_count / .slot_capacity_cents — schema_pipeline_and_laundering §2) — they are per-safehouse
// state set at BUILD time (a P2 player operation), not a global constant the tick injects. So slot_count_C /
// slot_capacity_S_cents are the DEFAULTS the BUILD flow stamps onto a new safehouse row (a P2 producer), NOT a
// value this system's day-1 logic consumes as a constant. Mirroring them as resolved constants here would be
// silently-dead config (the honest-tunables discipline — the dwell-time pipeline_depth_stages precedent). The
// E2E seeds rows with explicit per-row slot_count / arrival_rate to exercise the Erlang-B knee; the registry
// values are the schema-validated bounds (slot_count ∈ 1..12 per L167; CHECK slot_count > 0 in migration 0006).
//
// μ DERIVATION (the A = λ/μ traffic-intensity derivation, documented + deterministic): A = arrival_rate / μ where
// μ = the per-slot NORMALIZED service rate = 1.0 (spec §Update tick chaque minute Phase A: "μ = service_rate …
// Valeur typique : 1.0 si on normalise les slots comme unités de service"). So A = arrival_rate (offered traffic
// in erlangs) — a FIXED function of the row's arrival_rate, no invented tunable. NORMALIZED_SERVICE_RATE is the
// documented modelling constant (1.0 — the queueing-theory normalization, not a balance value; it is the unit
// definition of "one slot = one server serving at unit rate", the M/M/c → Erlang-B premise).
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069) is the canonical district set the
// controller validates against (1..18). Surfaced here because the controller CONSUMES it for the per-district
// stash projection endpoint's district validation (one place per system — the dwell-time/inspection precedent).

import { TunablesStore } from '../../config/tunables-store';

/**
 * The per-slot NORMALIZED service rate μ for the A = λ/μ traffic-intensity derivation (spec §Update tick: "Valeur
 * typique : 1.0 si on normalise les slots comme unités de service"). This is a MODELLING NORMALIZATION (the unit
 * definition of an M/M/c server serving at unit rate — the Erlang-B premise), NOT a balance value: it is fixed at
 * 1.0 so A = arrival_rate (offered traffic in erlangs). Documented here, not env-overridable (it defines the unit).
 */
export const NORMALIZED_SERVICE_RATE = 1.0;

/**
 * Resolved System 9 Erlang Stash tunables. The consumed keys are REUSE from gdd/14:
 * stash.blocking_alert_threshold (gates the high-blocking alert + the district summary flag); raid_drain_order_default
 * (the deterministic drainOrder() fallback policy). The district count is the controller's 1..N validation bound.
 * slot_count_C / slot_capacity_S_cents are DELIBERATELY NOT resolved (read per-safehouse from the row — they are
 * BUILD-time per-safehouse state, a P2 flow; see the header). μ is the NORMALIZED_SERVICE_RATE modelling constant.
 */
export const erlangStashTunables = {
  /** stash.blocking_alert_threshold — blocking_probability beyond which StashHighBlockingAlert fires (Inv 3 Phase C). (DB-override > env > default — Phase-23). */
  get blockingAlertThreshold(): number { return TunablesStore.resolveFloat('stash.blocking_alert_threshold', 'STASH_BLOCKING_ALERT_THRESHOLD', 0.25); },
  /** raid_drain_order_default — default raid drain order (Inv 6 — the deterministic drainOrder() fallback policy). (DB-override > env > default — Phase-23). */
  get raidDrainOrderDefault(): string { return TunablesStore.resolveString('T.city.raid_drain_order_default', 'RAID_DRAIN_ORDER_DEFAULT', 'top-down'); },
  /** city.district_count — the canonical district set the controller validates against (1..N). (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },
};
