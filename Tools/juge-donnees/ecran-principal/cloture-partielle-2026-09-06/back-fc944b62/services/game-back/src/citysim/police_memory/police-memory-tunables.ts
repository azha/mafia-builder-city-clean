// IMPLEMENTS: docs/tech/04_city_simulation/system_3_police_memory.md §Tunables — REUSE
//             (gdd/14 §City — Asymmetric Police Memory + §City — Patrol Doctrine; NO NEW tunables — the
//             System 3 CORE is REUSE-only. The G31 declaration-ledger NEW keys are DEFERRED — see header.)
//             -- session:2026-06-02 (Phase 1 Task 4) --
//
// System 3 (Asymmetric Police Memory) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Asymmetric Police Memory` (lines 89–92) and
// `§City — Patrol Doctrine` (lines 113–114). They are surfaced here as env-overridable fallbacks so this file
// stays a faithful MIRROR of the single source of truth (the registry). If the registry values change, update
// this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (no resolved-but-unused config — the flow-cells/sparse-citizens precedent): this mirror
// surfaces ONLY the keys System 3's day-1 logic consumes:
//   §City — Asymmetric Police Memory (gdd/14 L89–92):
//     - `suspicion_map_resolution` (L89, 32x32) — the tile grid edge (32) → 32×32 = 1024-byte bytea map.
//     - `memory_decay_per_tile_per_day` (L90, 0.04) — the daily-decay rate applied to non-bumped tiles
//       (Tick 2 decay pass; half-life ~17 in-game days).
//     - `raid_target_temperature` (L91, 0.7) — softmax sampling temperature over top_5_buildings (Tick 3
//       raid-target selection). 0 = greedy (top-1), 2 = quasi-random. The COMPUTATION temperature uses the
//       full 0..2.0 tunable range; the PERSISTED `precinct_memory.raid_temperature` column is a SEPARATE
//       field bounded by its DB CHECK [0..1] (0005_city_state.sql) — the service clamps writes to that column.
//     - `intel_price_multiplier` (L92, 1.0) — scanner intel cost lever. The scanner PURCHASE flow (BO ops
//       `/admin/bpd/*` + the player intel buy) lands with the BO surface; day-1 it is surfaced because the
//       projection's "is intel affordable" framing reads it AND `last_intel_purchased_at` is a core column.
//       Marked DEFERRED-CONSUMER below to keep this honest (read, not yet a live purchase path).
//   §City — Patrol Doctrine (gdd/14 L113–114) — CONSUMED by System 3's DAY-1 precinct review (Tick 3 step 4):
//     - `raid_prob_per_cluster` (L114, 0.15) — probability the review decides a RAID on the selected target.
//     - `undercover_dispatch_prob` (L113, 0.30) — probability the review decides an UNDERCOVER dispatch.
//   These two are CANONICALLY Patrol Doctrine (System 4) keys; System 3's spec §Tick 3 step 4 references them
//   for the raid/undercover decision, and since System 4 (T6) does not exist yet, System 3's day-1 review tick
//   IS the consumer (the RaidPlannedEvent/UndercoverDispatchedEvent stand-in producer — see the service header
//   + the event-bus reconciliation note). When System 4 lands it OWNS these; the mirror moves there then.
//
// REUSE — the precinct COUNT (`bpd.precinct_count` = 6, gdd/14 L1078) and the 12h review cadence
// (`precinct_review_tick_hours` = 12, gdd/14 L110) are NOT re-mirrored here:
//   - `bpd.precinct_count` is surfaced via `BPD_PRECINCT_COUNT` env / the `precinctCount` field below (the
//     row cardinality 6 the lazy seed creates) — it is a CONSUMED count, so it IS mirrored (one place).
//   - `precinct_review_tick_hours` is owned by the SCHEDULER (citysim-tunables.ts `precinctReviewTickHours`
//     → the TWELVE_H cadence width). System 3's TWELVE_H registration IS the consumption of that cadence —
//     re-mirroring it here would be a duplicate source-of-truth (the flow-cells/sparse-citizens precedent).
//
// G31 DECLARATION_LEDGER TUNABLES (NOT mirrored here — consumed in reputation-tunables.ts, D2 R3b):
//   - G31 declaration_ledger.* (entry_retention_days / max_entries_per_building / write_hook_throttle_per_minute
//     / half_life_boss_mirror_days / weight_vs_patrol) — activated in D2 R3b. The `precinct_memory` table
//     has the `declaration_ledger` nullable JSONB column since R3a (migration 0052). The tunables are
//     mirrored in `reputation-tunables.ts` (the reputation module owns G31 key resolution — R9.3 sourcing
//     decision: the keys are namespaced under `declaration_ledger.*` alongside the reputation registry).
//     They are NOT duplicated here (R9.3: one mirror per key). See reputation-tunables.ts for the getters.
//   - The 04d legal/forensic emitters (plea_record / forensic_byproduct / lifestyle_audit / pact_dossier)
//     are still DEFERRED; when they land they will subscribe to the SAME write hook in police_memory.service.
//   - clerk_mutation_success_rate / clerk_discovery_risk_per_use — the clerk-corruption ClerkState depth is
//     deferred (no lieutenant/clerk entity in Phase 1; corruption_clerk_id stays NULL). Re-added with the
//     clerk recruitment path (Task 6+).
//
// BOOT-FROZEN (P23-T8): `SUSPICION_MAP_BYTES` (the derived bytea column width) is captured at module-load
// time. This is INTENTIONAL — see the JSDoc on SUSPICION_MAP_BYTES below for the full rationale (schema
// migration required to change the resolution; process-restart is the correct gate).
//
// 04e-A1 C1 (registry-first, [PROV-Y26Q2]) — 2 NEW substrate-2 BASE tunables (plan
// docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C1 / design §4.2, gdd/14 §City — Asymmetric
// Police Memory): `police_memory.federal_suspicion_decay_per_tile_per_day` +
// `police_memory.federal_raid_target_temperature`. E-POL-11 spawns a FEDERAL investigator (a NEW
// `investigator_type` enum `local|federal`, built C7 — migration 0108, not here) with DISTINCT suspicion
// parameters from the local model above (`memoryDecayPerTilePerDay` / `raidTargetTemperature`). C1 ships the
// registry row + the mirrored getter only — the enum/spawn/rejection logic lands at C7. Inline-clamped (no
// CAPS-map in this file — this file has no BO admin PUT endpoint).
//
// 04e-A1 C7 (2026-07-04, plan C7 / design §4.2) — ★ Substrate 2: federal investigator LANDS
// (`federal_investigators` table, migration 0108; `PoliceMemoryService.runFederalInvestigatorReconcile`,
// NIGHTLY/20): the two substrate-2 BASE tunables above are now OVERLAY-AWARE (the C6 GLOBAL body-wrap
// pattern — `EffectOverlayStore.applyModifiers(key, base)`, no scope argument, mirrors `pinHalfLifeDays`/
// `auditPinEmergenceRate` — E-POL-11 is a GLOBAL-scope lever, design §3 lever table "Scope: G"). Empty
// overlay → base byte-identical (zero-regression contract). `isFederalInvestigatorSignalActive()`
// (exported below) is the SPAWN SIGNAL the C7 reconcile tick reads fresh every NIGHTLY pass: true iff a
// GLOBAL `effect_modifier` currently shifts EITHER federal key away from its own base — applied via the
// REAL `EffectModifierService.applyEvent` at C7's live-fire; wired to the real E-POL-11 political event
// at A2 (double-proof precedent, C6).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore, type EffectScopeContext } from '../../config/effect-overlay-store';

const FEDERAL_SUSPICION_DECAY_KEY = 'police_memory.federal_suspicion_decay_per_tile_per_day';
const FEDERAL_RAID_TEMPERATURE_KEY = 'police_memory.federal_raid_target_temperature';

/** The federal decay BASE (clamped, PRE-overlay) — shared by the getter below and the C7 signal check. */
function federalSuspicionDecayBase(): number {
  const v = TunablesStore.resolveFloat(FEDERAL_SUSPICION_DECAY_KEY, 'POLICE_MEMORY_FEDERAL_SUSPICION_DECAY_PER_TILE_PER_DAY', 0.02);
  return Math.max(0.005, Math.min(0.1, v));
}

/** The federal raid-temperature BASE (clamped, PRE-overlay) — shared by the getter below and the C7 signal check. */
function federalRaidTemperatureBase(): number {
  const v = TunablesStore.resolveFloat(FEDERAL_RAID_TEMPERATURE_KEY, 'POLICE_MEMORY_FEDERAL_RAID_TARGET_TEMPERATURE', 0.3);
  return Math.max(0, Math.min(2.0, v));
}

/**
 * Resolved System 3 Police Memory tunables. All are REUSE from gdd/14 AND consumed by the service day-1 (the
 * raid/undercover probabilities are the Patrol Doctrine keys System 3's day-1 review consumes; the G31 /
 * clerk keys are DEFERRED with their mechanics — see the file header).
 * Precedence: DB-override > env > default (Phase-23 TunablesStore).
 *
 * 04e-A1 C5 (plan C5 / design §2.2): `raidTargetTemperature` is the C4 3-scope live-fire lever
 * (`effect_engine_apply_revert.spec.ts` proved GLOBAL/DISTRICT/PLAYER all compose on this exact key). The
 * plain getter below stays UNCHANGED (byte-identical for any un-scoped caller); the NEW
 * `raidTargetTemperatureFor(scope)` scoped variant is what `police_memory.service.ts:635,690` calls instead,
 * threading `ctx.playerId` (PLAYER scope — the only axis naturally available at that per-player precinct-review
 * call site; a precinct spans 3 districts (`ceil(district/3)`, :70 below) so there is no single district to
 * thread there — GLOBAL modifiers still match regardless of the scope passed, matching the lever table's "G"
 * production scope).
 */
export const policeMemoryTunables = {
  /** suspicion_map_resolution edge (32) → 32×32 = 1024-byte bytea tile grid per precinct. (DB-override > env > default — Phase-23). */
  get suspicionMapResolutionEdge(): number { return TunablesStore.resolveInt('T.city.suspicion_map_resolution', 'SUSPICION_MAP_RESOLUTION_EDGE', 32); },
  /** memory_decay_per_tile_per_day — daily decay applied to tiles not bumped in the last 24h in-game. (DB-override > env > default — Phase-23). */
  get memoryDecayPerTilePerDay(): number { return TunablesStore.resolveFloat('T.city.memory_decay_per_tile_per_day', 'MEMORY_DECAY_PER_TILE_PER_DAY', 0.04); },
  /** raid_target_temperature — softmax sampling temperature over top_5_buildings (computation uses 0..2.0). (DB-override > env > default — Phase-23). */
  get raidTargetTemperature(): number { return TunablesStore.resolveFloat('T.city.raid_target_temperature', 'RAID_TARGET_TEMPERATURE', 0.7); },
  /**
   * raid_target_temperature — scoped variant (04e-A1 C5). Additive overlay read on the SAME base as the plain
   * getter above; composes any GLOBAL/DISTRICT/PLAYER `effect_modifier` row matching `scope` — empty overlay →
   * base byte-identical (zero-regression contract).
   */
  raidTargetTemperatureFor(scope: EffectScopeContext): number {
    const base = TunablesStore.resolveFloat('T.city.raid_target_temperature', 'RAID_TARGET_TEMPERATURE', 0.7);
    return EffectOverlayStore.applyModifiers('T.city.raid_target_temperature', base, scope);
  },
  /** intel_price_multiplier — scanner intel cost lever (DEFERRED-CONSUMER — surfaced for projection framing). (DB-override > env > default — Phase-23). */
  get intelPriceMultiplier(): number { return TunablesStore.resolveFloat('T.city.intel_price_multiplier', 'INTEL_PRICE_MULTIPLIER', 1.0); },
  /** raid_prob_per_cluster — Patrol Doctrine key consumed by System 3's day-1 precinct review (raid decision). (DB-override > env > default — Phase-23). */
  get raidProbPerCluster(): number { return TunablesStore.resolveFloat('T.city.raid_prob_per_cluster', 'RAID_PROB_PER_CLUSTER', 0.15); },
  /** undercover_dispatch_prob — Patrol Doctrine key consumed by System 3's day-1 review (undercover decision). (DB-override > env > default — Phase-23). */
  get undercoverDispatchProb(): number { return TunablesStore.resolveFloat('T.city.undercover_dispatch_prob', 'UNDERCOVER_DISPATCH_PROB', 0.3); },
  /** bpd.precinct_count — the number of precinct_memory rows the lazy seed creates per player. (DB-override > env > default — Phase-23). */
  get precinctCount(): number { return TunablesStore.resolveInt('T.bpd.precinct_count', 'BPD_PRECINCT_COUNT', 6); },

  /**
   * police_memory.federal_suspicion_decay_per_tile_per_day — 04e-A1 C1 [PROV-Y26Q2] NEW substrate-2 BASE tunable
   * (design §4.2). The FEDERAL investigator's decay rate, DISTINCT from the local `memoryDecayPerTilePerDay`
   * (0.04) — federal investigation is more persistent/thorough (slower decay). Default 0.02 (half the local
   * rate), range 0.005..0.1. Consumed by C7's federal suspicion structure (`federal_investigators.suspicion_decay_per_day`,
   * snapshotted fresh every reconcile). Inline-clamped BEFORE the overlay composes (C6 precedent). OVERLAY-AWARE
   * as of C7 (GLOBAL body-wrap, no scope arg — E-POL-11 is a GLOBAL lever, design §3). Empty overlay → base
   * byte-identical.
   */
  get federalSuspicionDecayPerTilePerDay(): number {
    return EffectOverlayStore.applyModifiers(FEDERAL_SUSPICION_DECAY_KEY, federalSuspicionDecayBase());
  },
  /**
   * police_memory.federal_raid_target_temperature — 04e-A1 C1 [PROV-Y26Q2] NEW substrate-2 BASE tunable (design
   * §4.2). The FEDERAL investigator's softmax sampling temperature, DISTINCT from the local `raidTargetTemperature`
   * (0.7) — federal task-force targeting is more surgical (lower temperature = closer to greedy top-1). Default
   * 0.3, range 0..2.0 (same computation range as the local key). Consumed by C7's federal suspicion structure
   * (`federal_investigators.raid_temperature`, snapshotted fresh every reconcile). Inline-clamped BEFORE the
   * overlay composes (C6 precedent). OVERLAY-AWARE as of C7 (GLOBAL body-wrap, no scope arg). Empty overlay →
   * base byte-identical.
   */
  get federalRaidTargetTemperature(): number {
    return EffectOverlayStore.applyModifiers(FEDERAL_RAID_TEMPERATURE_KEY, federalRaidTemperatureBase());
  },
};

/**
 * `isFederalInvestigatorSignalActive` — 04e-A1 C7 (design §4.2): the SPAWN SIGNAL
 * `PoliceMemoryService.runFederalInvestigatorReconcile` (NIGHTLY/20) reads fresh every tick. True iff a
 * GLOBAL `effect_modifier` currently shifts EITHER federal BASE tunable away from its own base — i.e. a
 * political-event-shaped modifier (E-POL-11, real at A2; a SYNTHETIC one at C7's own live-fire) is
 * active. While true, the reconcile tick SPAWNS/MAINTAINS this player's `federal_investigators` row
 * (snapshotting the CURRENT overlay-composed distinct parameters); once both keys read back to base
 * (no active modifier, or `revertEvent` deleted it), this reads false and the reconcile DESPAWNS the
 * row. A pure function of `(TunablesStore base, EffectOverlayStore snapshot)` — no `Math.random`/
 * `Date.now()` (design "Determinism").
 */
export function isFederalInvestigatorSignalActive(): boolean {
  return (
    policeMemoryTunables.federalSuspicionDecayPerTilePerDay !== federalSuspicionDecayBase() ||
    policeMemoryTunables.federalRaidTargetTemperature !== federalRaidTemperatureBase()
  );
}

/**
 * suspicion_map byte length = edge² (32×32 = 1024). The persisted bytea is exactly this many bytes (DB CHECK).
 *
 * BOOT-FROZEN (P23-T8): derived from `policeMemoryTunables.suspicionMapResolutionEdge` at module-load time.
 * A DB override of `T.city.suspicion_map_resolution` will NOT be reflected until the process restarts. This is
 * STRUCTURALLY REQUIRED: the `precinct_memory.suspicion_map` bytea column has a DB CHECK enforcing exactly this
 * length; Buffer.alloc(SUSPICION_MAP_BYTES) in the lazy-seed path and offset arithmetic (`blockId %
 * SUSPICION_MAP_BYTES`) both assume the column byte-width is fixed for the lifetime of the process. Changing the
 * resolution requires a schema migration (ALTER TABLE + data migration) + rolling deploy. Process-restart is the
 * correct gate.
 */
export const SUSPICION_MAP_BYTES = policeMemoryTunables.suspicionMapResolutionEdge ** 2;
