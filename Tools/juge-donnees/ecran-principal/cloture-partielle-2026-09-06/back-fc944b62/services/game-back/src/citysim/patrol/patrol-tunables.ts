// IMPLEMENTS: docs/tech/04_city_simulation/system_4_patrol_doctrine.md §Tunables — REUSE
//             (gdd/14 §City — Patrol Doctrine, lines 110–115; NO NEW tunables — all 6 keys this system
//             consumes are EXISTING registry keys owned by System 4 / Patrol Doctrine).
//             -- session:2026-06-02 (Phase 1 Task 5) --
//
// System 4 (Delayed-Response Patrol Doctrine) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Patrol Doctrine` (lines 110–115). They are
// surfaced here as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of
// truth (the registry). If the registry values change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (no resolved-but-unused config — the flow-cells/sparse-citizens/police-memory precedent):
// this mirror surfaces ONLY the 6 keys System 4's day-1 logic consumes:
//   §City — Patrol Doctrine (gdd/14 L110–115):
//     - `precinct_review_tick_hours` (L110, 12) — the 12h review cadence. OWNED by the SCHEDULER
//       (citysim-tunables.ts `precinctReviewTickHours` → the TWELVE_H cadence width). System 4's TWELVE_H
//       registration IS the consumption of that cadence — so it is NOT re-mirrored here (re-mirroring would
//       be a duplicate source-of-truth, the established precedent). Listed in the header for completeness.
//     - `cluster_correlation_threshold` (L111, 4) — minimum cluster size to qualify an action (Tick 2 phase B).
//     - `observation_queue_size` (L112, 256) — ring-buffer cap per precinct (overflow = drop low-sev first).
//     - `undercover_dispatch_prob` (L113, 0.30) — probability the review decides an UNDERCOVER dispatch.
//     - `raid_prob_per_cluster` (L114, 0.15) — probability the review decides a RAID.
//     - `patrol.cluster_aging_decay_per_day` (L115, 0.10) — daily decay of orphan (sub-threshold) clusters
//       (Tick 2 phase D) — prevents indefinite zombie-cluster accumulation.
//
// REUSE — the precinct COUNT (`bpd.precinct_count` = 6, gdd/14 L1078) is the patrol_observation_queues row
// cardinality the lazy seed creates. It is surfaced here (the same count System 3 mirrors) because System 4's
// seed CONSUMES it (one place per system — the precedent: System 3 mirrors its own precinctCount).
//
// raid_target_temperature (gdd/14 L91, §City — Asymmetric Police Memory) is NOT re-mirrored here: it is a
// System 3 key. System 4's softmax raid-target selection READS System 3's getTopTargets() output (which is
// already shaped by System 3's temperature) — Inv 6 read-only coupling. System 4 does not own the temperature.

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore } from '../../config/effect-overlay-store';

/**
 * Resolved System 4 Patrol Doctrine tunables. All 6 are REUSE from gdd/14 §City — Patrol Doctrine AND
 * consumed by the service day-1 (no resolved-but-unused config). precinct_review_tick_hours is the SCHEDULER's
 * TWELVE_H cadence width (consumed via the registration, not re-mirrored here — see the file header).
 * Precedence: DB-override > env > default (Phase-23 TunablesStore).
 *
 * 04e-A1 C5: `clusterCorrelationThreshold` (E-POL-02 GLOBAL lever) is body-wrapped with
 * `EffectOverlayStore.applyModifiers` — no signature change, zero call-site churn, empty overlay → base
 * byte-identical (design §2.2).
 */
export const patrolTunables = {
  /** cluster_correlation_threshold — minimum cluster size to qualify an action (Tick 2 phase B). (DB-override > env > default — Phase-23). */
  get clusterCorrelationThreshold(): number {
    const base = TunablesStore.resolveInt('T.city.cluster_correlation_threshold', 'CLUSTER_CORRELATION_THRESHOLD', 4);
    return EffectOverlayStore.applyModifiers('T.city.cluster_correlation_threshold', base);
  },
  /** observation_queue_size — ring-buffer cap per precinct (overflow = drop lowest-severity first, then FIFO). (DB-override > env > default — Phase-23). */
  get observationQueueSize(): number { return TunablesStore.resolveInt('T.city.observation_queue_size', 'OBSERVATION_QUEUE_SIZE', 256); },
  /** undercover_dispatch_prob — probability the review decides an UNDERCOVER dispatch per qualifying cluster. (DB-override > env > default — Phase-23). */
  get undercoverDispatchProb(): number { return TunablesStore.resolveFloat('T.city.undercover_dispatch_prob', 'UNDERCOVER_DISPATCH_PROB', 0.3); },
  /** raid_prob_per_cluster — probability the review decides a RAID per qualifying cluster. (DB-override > env > default — Phase-23). */
  get raidProbPerCluster(): number { return TunablesStore.resolveFloat('T.city.raid_prob_per_cluster', 'RAID_PROB_PER_CLUSTER', 0.15); },
  /** patrol.cluster_aging_decay_per_day — daily decay of orphan sub-threshold clusters (Tick 2 phase D). (DB-override > env > default — Phase-23). */
  get clusterAgingDecayPerDay(): number { return TunablesStore.resolveFloat('T.patrol.cluster_aging_decay_per_day', 'PATROL_CLUSTER_AGING_DECAY_PER_DAY', 0.1); },
  /** bpd.precinct_count — the number of patrol_observation_queues rows the lazy seed creates per player. (DB-override > env > default — Phase-23). */
  get precinctCount(): number { return TunablesStore.resolveInt('T.bpd.precinct_count', 'BPD_PRECINCT_COUNT', 6); },
};
