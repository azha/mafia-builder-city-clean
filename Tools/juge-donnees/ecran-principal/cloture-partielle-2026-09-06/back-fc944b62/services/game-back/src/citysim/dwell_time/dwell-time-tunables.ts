// IMPLEMENTS: docs/tech/04_city_simulation/system_8_dwell_time_tax.md §Tunables — REUSE
//             (gdd/14 §City — Throughput Trilemma, lines 157–161; NO NEW tunables — the keys this system's OWN
//             logic actually CONSUMES are EXISTING registry keys owned by System 8 + pipeline.risk_factor_normalize).
//             -- session:2026-06-03 (Phase 1 Task 9) --
//
// System 8 (Dwell-Time Tax / Throughput Trilemma) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Throughput Trilemma` (lines 157–161). They are
// surfaced here as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth
// (the registry). If the registry values change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (only mirror what the day-1 logic consumes — the unconformity/cohesion precedent): the resolved
// `dwellTimeTunables` object surfaces the keys System 8's MINUTE tick CONSUMES at runtime, ALL from §City —
// Throughput Trilemma (gdd/14 L157–161):
//   - `throughput_per_shop_per_hr` (L157, 200) — the nominal throughput per node (cash/hr). Defines the
//     ThroughputBucket thresholds (Inv 5): UNDER < 50% of this; NOMINAL 50–100%; OVER 100–150%; OVERFLOW > 150%
//     (or an overflowing buffer). The raw throughput float is NEVER exposed — only the bucket (R2.2).
//   - `dwell_time_per_node_hr` (L158, 24) — the reference dwell time (hours). Two uses: (a) the IDLE-node default
//     dwell when throughput_in_per_hour == 0 (§dwell calc guard — node at rest); (b) the cleanliness saturation
//     point: cleanliness_at_output = min(1.0, dwell_time_hours / dwell_time_per_node_hr) (Inv 6 — at this dwell
//     the money is fully laundered, cleanliness 1.0).
//   - `inventory_cap_per_node` (L160, 5000) — the $ cap of a node's buffer before overflow. RECONCILIATION (the
//     buffer_load schema-unit mismatch, documented in the service header): the migrated `laundering_nodes.buffer_load`
//     is a DB-CHECK-enforced NORMALIZED RATIO in [0..1] (migration 0006 `ln_buffer_load_chk: buffer_load BETWEEN 0
//     AND 1`), NOT the raw dollar figure the spec struct compares. So inventory_cap_per_node is the NORMALIZING
//     FACTOR (buffer_load = buffered_cash / inventory_cap_per_node); overflow fires when the RATIO reaches the cap
//     (buffer_load >= 1.0), never by comparing the ratio against $5000 directly. The $ value is mirrored because it
//     is the canonical magnitude the ratio normalizes against (and surfaces to BO as the dollar cap).
//   - `pipeline.risk_factor_normalize` (L161, 0.001) — normalizes buffer_load (in cash units) toward the
//     risk_signature / inventory_at_risk metric consumed by System 3/4/6. CONSUMED day-1 to compute the per-node
//     risk contribution + the network's exposure band; the downstream consumers (System 3/4/6) wire later (P2 —
//     no Phase-1 producer of the dirty-cash inflow that drives the magnitudes; the seam is exposed + tested).
//
// DEFERRED — `pipeline_depth_stages` (gdd/14 L159, default 3, range 1..7) is NOT resolved here. System 8's MINUTE
// tick operates per EXISTING laundering_node row (it recomputes the persisted floats); it does NOT CREATE the
// pipeline or enforce its depth — the pipeline-BUILD flow (creating nodes + wiring stages) is a P2 player operation
// with no Phase-1 producer (the laundering_nodes table is EMPTY organically; the E2E seeds nodes). So
// pipeline_depth_stages has no Phase-1 consumer in this system's day-1 logic (it would gate node CREATION, which is
// P2). Mirroring it now would be silently-dead config (the honest-tunables discipline — the unconformity
// declaration_ledger.* precedent). NOTE: the migrated `laundering_nodes.stage_index` carries its OWN DB CHECK
// (migration 0006 `ln_stage_index_chk: stage_index BETWEEN 0 AND 4`), which bounds the seeded stage positions; the
// projection echoes stage_index as a structural identity (the node's pipeline position), it is not a tunable here.
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069) is the canonical district set the
// controller validates against (1..18). Surfaced here because the controller CONSUMES it for the per-district
// projection endpoint's district validation (one place per system — the unconformity/inspection precedent).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved System 8 Dwell-Time Tax tunables. The consumed keys are REUSE from gdd/14 §City — Throughput Trilemma
 * AND consumed by the MINUTE tick day-1 (throughput_per_shop_per_hr → ThroughputBucket thresholds;
 * dwell_time_per_node_hr → idle-node default dwell + cleanliness saturation; inventory_cap_per_node → the buffer_load
 * ratio's normalizing factor; pipeline.risk_factor_normalize → the per-node risk contribution + network exposure
 * band). The district count is the controller's 1..N validation bound. pipeline_depth_stages is DELIBERATELY NOT
 * resolved (no Phase-1 consumer — it gates node CREATION, a P2 flow; see the header).
 */
export const dwellTimeTunables = {
  /** throughput_per_shop_per_hr — nominal throughput per node; defines the ThroughputBucket UNDER/NOMINAL/OVER/OVERFLOW thresholds. (DB-override > env > default — Phase-23). */
  get throughputPerShopPerHr(): number { return TunablesStore.resolveInt('T.city.throughput_per_shop_per_hr', 'THROUGHPUT_PER_SHOP_PER_HR', 200); },
  /** dwell_time_per_node_hr — reference dwell (hrs): idle-node default dwell + cleanliness saturation point (Inv 6). (DB-override > env > default — Phase-23). */
  get dwellTimePerNodeHr(): number { return TunablesStore.resolveInt('T.city.dwell_time_per_node_hr', 'DWELL_TIME_PER_NODE_HR', 24); },
  /** inventory_cap_per_node — $ cap per node; the NORMALIZING FACTOR for the buffer_load [0..1] ratio (overflow at ratio >= 1). (DB-override > env > default — Phase-23). */
  get inventoryCapPerNode(): number { return TunablesStore.resolveInt('T.city.inventory_cap_per_node', 'INVENTORY_CAP_PER_NODE', 5000); },
  /** pipeline.risk_factor_normalize — normalizes buffer_load (cash) toward risk_signature / inventory_at_risk (System 3/4/6 consumers wire later). (DB-override > env > default — Phase-23). */
  get riskFactorNormalize(): number { return TunablesStore.resolveFloat('T.pipeline.risk_factor_normalize', 'PIPELINE_RISK_FACTOR_NORMALIZE', 0.001); },
  /** city.district_count — the canonical district set the controller validates against (1..N). (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },
};
