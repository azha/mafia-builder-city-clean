// IMPLEMENTS: docs/tech/04_city_simulation/system_6_inspection_queue.md §Tunables
//             (REUSE — gdd/14 §City — Inspection Queue L133–139 + §MIS L1088; NO genuinely-new keys —
//              cascade_depth_max / cascade_propagation_delay_ticks were backported to gdd/14 in ch16, so
//              they are REUSE not NEW).
//             TD-012 (lot-5 L5-T6l): false_report_base_cost (L136) + flood_backlash_threshold (L137) are NOW
//             consumed by the FalseReportLedger FILE action + flood backlash mechanic (both previously deferred).
//             -- session:2026-06-03 (Phase 1 Task 7); updated 2026-06-14 (TD-012 lot-5) --
//
// System 6 (Inspection Cascade Queue / MIS) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md`. They are surfaced here as env-overridable fallbacks
// so this file stays a faithful MIRROR of the single source of truth (the registry). If the registry values
// change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (no resolved-but-unused config — the cohesion/patrol precedent): the resolved
// `inspectionTunables` object surfaces ONLY the keys System 6's day-1 logic CONSUMES at runtime:
//   §City — Inspection Queue (gdd/14 L133–139):
//     - `inspection_queue_cap` (L133, 32) — per-district queue capacity. Overflow → drop low-severity-first (Inv 3).
//     - `inspection_processing_per_day` (L134, 4) — inspections dispatched per in-game day (4 cycles of 6h; the
//       12h dispatch tick consumes floor(rate/2) per cycle — Phase B).
//     - `false_report_base_cost` (L136, $50) — NOW CONSUMED by TD-012 FILE action (cost charged per submission;
//       the economy CHARGE is accepted day-1 as a ledger fee; the actual currency deduction is economy P2 future).
//     - `flood_backlash_threshold` (L137, 8 false:genuine/30d) — NOW CONSUMED by TD-012 flood detection. The
//       integer part (8) is the false:genuine ratio threshold; the window is 30 in-game days (1440×30 ticks).
//     - `inspection.cascade_depth_max` (L138, 3) — max cascade amplification depth per district on a THAW (Inv 7).
//     - `inspection.cascade_propagation_delay_ticks` (L139, 24) — delay in ticks between the CohesionStateChanged
//       THAWED reception and the cascade-entry generation (cascade propagation delay).
//   §MIS (gdd/14 L1088):
//     - `mis.priority_decay_per_day` (L1088, 0.1) — per-day priority decay for non-dispatched entries
//       (CRITICAL→HIGH→MEDIUM→LOW; Phase C accumulator, /4 per 6h cycle — the 12h tick fires twice/day so it
//       accrues priority_decay_per_day/2 per dispatch tick).
//
// DEFERRED (NOT mirrored — no day-1 consumer, resolved-when-consumed — the cohesion crime-magnitude precedent):
//   - `informant_fee_to_read_queue` ($200, gdd/14 L135) — the informant-fee PAYMENT is player economy (P2) NOT
//     built Phase 1. The qualitative READ projection (what the fee unlocks) IS built, but the CHARGE that gates
//     it is deferred → mirroring the fee amount now would be resolved-but-unused config (no consumer).
//   - `mis.inspector_pool_size` (12, gdd/14 L1087) — the inspector-pool simultaneous-dispatch capacity. Day-1
//     the dispatch rate is driven by `inspection_processing_per_day` + budget_modifier (DispatcherRegime); the
//     pool-size gate would be a finer cap that nothing consumes yet → deferred (no resolved-but-unused config).
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069 / `T.db.city_state.district_count`) is
// the inspection_queues row cardinality the lazy seed creates (18 rows/player — Inv 1: per-district, never
// global). Surfaced here because System 6's seed CONSUMES it (one place per system — the System 3/4/5 precedent).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore, type EffectScopeContext } from '../../config/effect-overlay-store';

/**
 * Resolved System 6 Inspection Cascade Queue tunables. All consumed keys are REUSE from gdd/14 AND consumed by
 * the 12h dispatch tick / cascade handler day-1. The informant-fee / false-report / flood-backlash /
 * inspector-pool keys are DEFERRED with their mechanics (see the file header) — NOT surfaced here.
 * Precedence: DB-override > env > default (Phase-23 TunablesStore).
 *
 * 04e-A1 C5 (plan C5 / design §6.1 MIS mapping, RULED §6.1): `inspectionQueueCap` and `priorityDecayPerDay` are
 * the LIVE "MIS processing/density" levers every canon E-POL-01/02/03/05/08/09/12 effect maps onto — NEVER the
 * dead `inspectionProcessingPerDay` getter below (no in-src consumer, anti-fig-leaf). Both plain getters stay
 * UNCHANGED (byte-identical for any un-scoped caller); the NEW `...For(scope)` scoped variants are what
 * `inspection.service.ts:620,669,767,778` call instead, threading the district this dispatch-tick iteration is
 * on (G/D — a GLOBAL modifier matches at every district; a DISTRICT modifier matches only its own).
 */
export const inspectionTunables = {
  /** inspection_queue_cap — per-district queue capacity; overflow drops the oldest LOW entry first (Inv 3). (DB-override > env > default — Phase-23). */
  get inspectionQueueCap(): number { return TunablesStore.resolveInt('T.city.inspection_queue_cap', 'INSPECTION_QUEUE_CAP', 32); },
  /**
   * inspection_queue_cap — scoped variant (04e-A1 C5, §6.1 live MIS-cap lever). `scope` is optional: pass
   * `{ districtId }` from a per-district call site (still matches GLOBAL rows too), or omit for a GLOBAL-only
   * resolution. Empty overlay → base byte-identical.
   */
  inspectionQueueCapFor(scope?: EffectScopeContext): number {
    const base = TunablesStore.resolveInt('T.city.inspection_queue_cap', 'INSPECTION_QUEUE_CAP', 32);
    return EffectOverlayStore.applyModifiers('T.city.inspection_queue_cap', base, scope);
  },
  /** inspection_processing_per_day — inspections dispatched per in-game day (4×6h; floor(rate/2) per 12h cycle). (DB-override > env > default — Phase-23). */
  get inspectionProcessingPerDay(): number { return TunablesStore.resolveInt('T.city.inspection_processing_per_day', 'INSPECTION_PROCESSING_PER_DAY', 4); },
  /** false_report_base_cost — cost per false-report submission ($50; gdd/14 L136). NOW CONSUMED by TD-012 FILE action. (DB-override > env > default — Phase-23). */
  get falseReportBaseCost(): number { return TunablesStore.resolveInt('T.city.false_report_base_cost', 'FALSE_REPORT_BASE_COST', 50); },
  /** flood_backlash_threshold — false:genuine ratio (integer part) over 30 days (gdd/14 L137 "8:1/30d"). Exceeding this → backlash. NOW CONSUMED by TD-012 flood detection. (DB-override > env > default — Phase-23). */
  get floodBacklashThreshold(): number { return TunablesStore.resolveInt('T.city.flood_backlash_threshold', 'FLOOD_BACKLASH_THRESHOLD', 8); },

  /** TD-517 — la LONGUEUR de la fenêtre du ledger de faux rapports, en jours RÉELS. 30 est la valeur
   *  du canon (`law_mis §173` : « ratio false:genuine sur 30 jours ») et de la migration `0036`.
   *  ⚠️ Jours RÉELS et non jours de jeu : `false_report_ledger.submitted_at` est horodaté avec
   *  `now()`, donc la fenêtre se mesure dans la même unité que la donnée. Comparer un horodatage réel
   *  à une durée de jeu serait le désaccord d'unités que ce dépôt a déjà payé ailleurs. (R2.3 —
   *  jamais inline.) */
  get floodBacklashWindowDays(): number { return TunablesStore.resolveInt('T.city.flood_backlash_window_days', 'FLOOD_BACKLASH_WINDOW_DAYS', 30); },  /** inspection.cascade_depth_max — max cascade amplification depth per district on a THAW (Inv 7 bound). (DB-override > env > default — Phase-23). */
  get cascadeDepthMax(): number { return TunablesStore.resolveInt('T.inspection.cascade_depth_max', 'INSPECTION_CASCADE_DEPTH_MAX', 3); },
  /** inspection.cascade_propagation_delay_ticks — delay (ticks) before cascade entries are generated. (DB-override > env > default — Phase-23). */
  get cascadePropagationDelayTicks(): number { return TunablesStore.resolveInt('T.inspection.cascade_propagation_delay_ticks', 'INSPECTION_CASCADE_PROPAGATION_DELAY_TICKS', 24); },
  /** mis.priority_decay_per_day — per-day priority decay for non-dispatched entries (CRITICAL→…→LOW). (DB-override > env > default — Phase-23). */
  get priorityDecayPerDay(): number { return TunablesStore.resolveFloat('T.mis.priority_decay_per_day', 'MIS_PRIORITY_DECAY_PER_DAY', 0.1); },
  /**
   * mis.priority_decay_per_day — scoped variant (04e-A1 C5, §6.1 live MIS-decay lever). `scope` optional
   * (see `inspectionQueueCapFor` above). Empty overlay → base byte-identical.
   */
  priorityDecayPerDayFor(scope?: EffectScopeContext): number {
    const base = TunablesStore.resolveFloat('T.mis.priority_decay_per_day', 'MIS_PRIORITY_DECAY_PER_DAY', 0.1);
    return EffectOverlayStore.applyModifiers('T.mis.priority_decay_per_day', base, scope);
  },
  /** city.district_count — the number of inspection_queues rows the lazy seed creates per player (Inv 1). (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },
  /**
   * reputation.mis_leak_priority_boost — priority rank for the INFORMANT entry injected
   * by a HiddenCurriculumLeakMIS event (D2 R9, reputation_mechanics.md:174/:217).
   * 0=LOW, 1=MEDIUM, 2=HIGH (default), 3=CRITICAL. Bounded applicatively to ≤2 (HIGH)
   * by this getter — keeps the inject below CRITICAL so the overflow drop-low-first
   * policy (Inv 3) preserves CRITICAL entries. Cross-dep TD-021 (full DispatcherState
   * gating deferred to R13 — the bound here is a conservative applicative cap).
   * [PROPOSED DEFAULT][PROV-Y26Q2] — canon silent on exact MIS bound.
   * (DB-override > env > default — Phase-23).
   */
  get misLeakPriorityBoostRank(): number {
    const rank = TunablesStore.resolveInt('T.reputation.mis_leak_priority_boost', 'MIS_LEAK_PRIORITY_BOOST', 2);
    // Bound: cap at 2 (HIGH) — the leaked INFORMANT must not reach CRITICAL priority,
    // which could displace every CRITICAL entry via the dispatch cycle (TD-021).
    return Math.max(0, Math.min(2, rank));
  },

  /**
   * checkpoint_inspection_density_default — 04e-A1 C1 substrate-4 BASE tunable (plan
   * docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C1 / design §4.4). This is an EXISTING
   * legacy registry key (gdd/14 §Legacy operational constants, backported ch16 — `04a/inspection_checkpoints.md:41`,
   * baseline inspection density at BRIDGE/FERRY crossings) that had NO code mirror until now. C9 builds the
   * per-(river-crossing district) `inspection_density` modifier the MIS queue reads through the overlay
   * (DISTRICT scope) — E-POL-08's `epol08_inspection_density_multiplier` (×1.6, effect-engine.tunables.ts) is the
   * MULTIPLY modifier applied on top of THIS base value. Default 0.15, range 0..1.0 (gdd/14 verbatim). No `T.`
   * prefix / no dot-namespace change — mirrors the legacy key EXACTLY as registered (the no-namespace convention
   * this specific key already uses, matching e.g. `courier_bike_cargo_g` in distribution-tunables.ts). Inline-clamped.
   */
  get checkpointInspectionDensityDefault(): number {
    const v = TunablesStore.resolveFloat('checkpoint_inspection_density_default', 'CHECKPOINT_INSPECTION_DENSITY_DEFAULT', 0.15);
    return Math.max(0, Math.min(1.0, v));
  },

  /**
   * checkpoint_inspection_density_default — DISTRICT-scoped overlay variant (04e-A1 C9, design §4.4).
   * Returns the CURRENT overlay-composed density at `scope` — the read the C9 substrate threads with a
   * river-crossing district's id (`{ districtId: String(id) }`). `epol08_inspection_density_multiplier`
   * (×1.6, `effect-engine.tunables.ts`) is applied as a DISTRICT MULTIPLY modifier on THIS key, scoped to
   * ONE river-crossing district id at a time (a GLOBAL modifier would still match every district — no
   * caller applies one for this substrate). Empty overlay → base byte-identical (0.15).
   */
  checkpointInspectionDensityFor(scope?: EffectScopeContext): number {
    const raw = TunablesStore.resolveFloat('checkpoint_inspection_density_default', 'CHECKPOINT_INSPECTION_DENSITY_DEFAULT', 0.15);
    const base = Math.max(0, Math.min(1.0, raw));
    return EffectOverlayStore.applyModifiers('checkpoint_inspection_density_default', base, scope);
  },

  /**
   * checkpoint_inspection_density RATIO — `checkpointInspectionDensityFor(scope) / checkpointInspectionDensityDefault`
   * (04e-A1 C9). This is what `InspectionQueueService.effectiveQueueCapFor` folds into the district's MIS
   * queue cap for river-crossing districts ONLY (`inspection.service.ts`): ratio=1 at base (no active
   * modifier → byte-identical cap, the zero-regression contract), ratio=1.6 when the DISTRICT-scoped
   * E-POL-08-shaped ×1.6 modifier is active at that district — "inspection intensity rises ONLY at
   * river-crossing districts" (design §4.4) without ever touching the cap at a non-crossing district
   * (which never calls this getter at all — see `InspectionQueueService.riverCrossingDistrictIds`).
   * Guarded against a degenerate base<=0 config (falls back to a neutral ratio of 1 — never divide by 0).
   */
  checkpointDensityRatioFor(scope?: EffectScopeContext): number {
    const raw = TunablesStore.resolveFloat('checkpoint_inspection_density_default', 'CHECKPOINT_INSPECTION_DENSITY_DEFAULT', 0.15);
    const base = Math.max(0, Math.min(1.0, raw));
    if (base <= 0) return 1;
    const composed = EffectOverlayStore.applyModifiers('checkpoint_inspection_density_default', base, scope);
    return composed / base;
  },
};
