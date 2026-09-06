// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C1 (NEW A2 tunables, registry-first)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Political events catalogue
//             (the 5 NEW `[PROV-Y26Q2]` rows added in the SAME commit, "Note 04e-A2 C1" — R2.3 registry-FIRST).
//             Rulings: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §4.1 (E-POL-11
//             federal magnitude, RULED ×0.5) + §4.2 (E-POL-12 district-trigger window, RULED cohesion-floor +
//             sub-ruling heat-ceiling = bucket-rank constant, NOT a scalar) + §4.4 (E-POL-10 counter-play cost,
//             RULED honest-scaffolding) + §2.5 (E-POL-09 scandal-noise threshold).
//             — 04e-A2 C1 — 2026-07-05
//
// `political.tunables.ts` — the small set of NEW `[PROV-Y26Q2]` A2-specific tunable getters (plan C1: "ADD only
// the NEW A2 getters ... mirror the existing registry pattern (registry-first, mirrored getter+clamp, capped)").
// This is DISTINCT from `operational/effect_engine/effect-engine.tunables.ts`'s `politicalEventsTunables` (the 34
// ALREADY-registered A1-C1 `political_events.*` getters) — A2 REUSES those, never re-registers them (R2.3); this
// file adds ONLY the 5 genuinely-new keys the A2 plan's C1 section explicitly names:
//   1. `epol11_federal_raid_temperature_multiplier` — E-POL-11 federal-param magnitude (§4.1, RULED ×0.5).
//   2. `epol12_district_cohesion_floor` — E-POL-12 district-trigger cohesion floor (§4.2, RULED).
//   3. `epol12_district_sustain_window_days` — E-POL-12 district-trigger sustained-window length (§4.2).
//   4. `epol09_scandal_noise_threshold` — E-POL-09 scandal-noise accumulator trigger threshold (§2.5/plan C3).
//   5. `counter_play_politician_cost` — E-POL-10 honest-scaffolding BASE cost lever (§4.4, RULED).
//
// PLUS one NON-tunable code constant (decisions §4.2 sub-ruling, RULED 2026-07-05): `EPOL12_DISTRICT_HEAT_CEILING_
// BUCKET`. The E-POL-12 trigger's "heat ≤ ceiling" half is explicitly RULED to compare the EXISTING per-district
// `HeatBucket` rank (COLD < WARM < HOT < BURNING, `citysim/events/city-event-bus.ts:483`), NOT a new `[0,1]` raw
// scalar — "do NOT add a [0,1] scalar tunable for it" (the ruling, verbatim). It is therefore a FIXED code
// constant, not a `TunablesStore`-resolved / DB-overridable registry key (R2.2: the existing HeatBucket band is
// the ONLY heat signal that ever escapes the engine; minting a second raw threshold would create a second source
// of truth). It is exported here (not inline in the catalogue) so C3's real trigger evaluator has one place to
// import it from, exactly like a registry getter would be — the difference is it is NOT resolved via
// `TunablesStore` and carries NO CAPS/clamp entry.
//
// R2.3 (NO inline numeric balance/config): every default below is verbatim from gdd/14 §Political events
// catalogue's "Note 04e-A2 C1" addendum (the single source of truth). If a registry value changes, update gdd/14
// + this file in the SAME commit (R9.3).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore } from '../../config/effect-overlay-store';
import type { HeatBucket } from '../../citysim/events/city-event-bus';

/** Min/max clamp range per key (mirrors `POLITICAL_EVENTS_TUNABLE_CAPS`'s shape, effect-engine.tunables.ts). */
export interface PoliticalTunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `POLITICAL_TUNABLE_CAPS` — the per-key allowed range for DB overrides, verbatim from the gdd/14 Range column
 * (the 5 NEW A2 keys only — the 34 A1 keys' caps live in `POLITICAL_EVENTS_TUNABLE_CAPS`, effect-engine.tunables.ts,
 * untouched by this file, R2.3 "no re-registration" invariant).
 */
export const POLITICAL_TUNABLE_CAPS: Record<string, PoliticalTunableRange> = {
  'political_events.epol11_federal_raid_temperature_multiplier': { min: 0.3,    max: 0.8    },
  'political_events.epol12_district_cohesion_floor':             { min: 0.6,    max: 0.9    },
  'political_events.epol12_district_sustain_window_days':        { min: 14,     max: 60     },
  'political_events.epol09_scandal_noise_threshold':              { min: 0.5,    max: 2.5    },
  'political_events.counter_play_politician_cost':                { min: 400000, max: 2000000 },
};

/**
 * Clamp a numeric value to the registered range for the given key (mirrors `clampPoliticalEventsToRange`).
 * Used internally by every getter below. Returns the value unchanged if no range is registered for the key.
 */
export function clampPoliticalTunableToRange(key: string, value: number): number {
  const range = POLITICAL_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for the 5 NEW A2-only `political_events.*` tunable keys (C1). */
export const politicalTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-11 — Federal task force: the federal-param modifier magnitude (§4.1, RULED ×0.5, C7-M2-coupled)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * epol11_federal_raid_temperature_multiplier — the MULTIPLY modifier applied to
   * `police_memory.federal_raid_target_temperature` (base 0.3) when E-POL-11 is active. RULED 2026-07-05 (user,
   * decisions §4.1): ×0.5 downward ("more surgical") → composed 0.3×0.5=0.15, in-bounds vs the federal
   * `raid_temperature` CHECK `[0,2.0]` (mig 0108) — the C7-M2/A2-D3 blocking constraint C5 must live-fire-prove.
   * Default 0.5, range 0.3..0.8 (kept comfortably in-bounds across the whole range from the 0.3 base).
   */
  get epol11FederalRaidTemperatureMultiplier(): number {
    return clampPoliticalTunableToRange('political_events.epol11_federal_raid_temperature_multiplier',
      TunablesStore.resolveFloat('political_events.epol11_federal_raid_temperature_multiplier', 'POLITICAL_EVENTS_EPOL11_FEDERAL_RAID_TEMPERATURE_MULTIPLIER', 0.5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-12 — District good-behavior: the redefined district-trigger window (§4.2, L1, RULED)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * epol12_district_cohesion_floor — the per-district `cohesion ≥ floor` half of the E-POL-12 sustained
   * good-behavior predicate (decisions §4.2, RULED). Default 0.75, range 0.6..0.9 — deliberately above the
   * healthy-district default (`districtCohesion.cohesion` starts at 0.7, `cohesion.repository.ts`) and the
   * thaw baseline (0.55, `cohesion_thaw_threshold_baseline`), since this is a RARE reward-tier threshold, not an
   * ordinary healthy-district reading. `[PROV-Y26Q2]` — canon gives no numeric floor (L1 redefinition away from
   * Restraint Index, which has no district axis).
   */
  get epol12DistrictCohesionFloor(): number {
    return clampPoliticalTunableToRange('political_events.epol12_district_cohesion_floor',
      TunablesStore.resolveFloat('political_events.epol12_district_cohesion_floor', 'POLITICAL_EVENTS_EPOL12_DISTRICT_COHESION_FLOOR', 0.75));
  },

  /**
   * epol12_district_sustain_window_days — the in-game-day window the cohesion-floor + heat-ceiling condition
   * must hold continuously before E-POL-12 triggers for that district (decisions §4.2). Default 30, range
   * 14..60 — consistent with sibling sustained-window/duration magnitudes (`epol07_stack_utilization_window_days`
   * 30..120, the 14-90 Crackdown durations). `[PROV-Y26Q2]` — canon gives no numeric window.
   */
  get epol12DistrictSustainWindowDays(): number {
    return clampPoliticalTunableToRange('political_events.epol12_district_sustain_window_days',
      TunablesStore.resolveInt('political_events.epol12_district_sustain_window_days', 'POLITICAL_EVENTS_EPOL12_DISTRICT_SUSTAIN_WINDOW_DAYS', 30));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-09 — City Hall scandal: the scandal-noise accumulator trigger threshold (plan C1/C3)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * epol09_scandal_noise_threshold — the `political_calendar_state.scandal_noise_accumulator` (mig 0111, A2-C2)
   * value at/above which E-POL-09 triggers. Weighted by the EXISTING `scandal_random_weight_per_event_noise`
   * (0.05/event-noise-unit, A1-C1) — at the default weight, ≈20 accumulated noise-weighted city events reach this
   * threshold, consistent with canon's "sustained ... multiple cohesion thaws + ordinance disputes" framing (not
   * a single event). Default 1.0, range 0.5..2.5. `[PROV-Y26Q2]` — canon gives no numeric threshold.
   */
  get epol09ScandalNoiseThreshold(): number {
    return clampPoliticalTunableToRange('political_events.epol09_scandal_noise_threshold',
      TunablesStore.resolveFloat('political_events.epol09_scandal_noise_threshold', 'POLITICAL_EVENTS_EPOL09_SCANDAL_NOISE_THRESHOLD', 1.0));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // E-POL-10 — Reform package: the counter-play-cost BASE lever (§4.4, honest-scaffolding, RULED)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * counter_play_politician_cost — the BASE cost (cents) of a counter-play action targeting a politician, which
   * the EXISTING `epol10_counter_play_cost_multiplier` (×0.7, A1-C1, `politicalEventsTunables`) multiplies while
   * E-POL-10 is active. Honest-scaffolding (decisions §4.4, RULED): the real player-action consumer is
   * Unity/action-lot (TD) — this chunk registers the lever so C7 can prove the composed value read-back reflects
   * ×0.7, never fabricating a live spend consumer. Default 800000 ($8k, cents) — aligned to the closest sibling
   * player-action cost lever, `internal_affairs.intel_purchase_cost_cents` ($8k, range 400000..2000000,
   * ia.tunables.ts) — a political/investigative counter-action, not a Tier-3 lawyer retainer ($40k, a different
   * order of magnitude). Range 400000..2000000 (same range as that sibling). `[PROV-Y26Q2]` — canon gives only
   * the -30% multiplier, no base $.
   *
   * OVERLAY-AWARE (C1, self-fix): this is a NEW A2 lever that IS itself an `EventEffect` target (E-POL-10's
   * honest-scaffolding multiplier, `political-event-catalogue.ts`) — unlike the other 4 NEW A2 getters above
   * (pure trigger-window/threshold inputs, never modifier TARGETS), a key that can be an effect's `tunableKey`
   * MUST compose through `EffectOverlayStore.applyModifiers` or the modifier would have literally no observable
   * effect on this getter (the exact fig-leaf anti-pattern this catalogue's own test floor grep-checks for).
   * Mirrors the `stackZoningGatedLotCount`/`tier3CorruptionLawyerBaseCostCents` pattern: inline-clamp on the
   * resolved base BEFORE the overlay composes. Empty overlay → base byte-identical (zero-regression contract).
   */
  get counterPlayPoliticianCost(): number {
    const base = clampPoliticalTunableToRange('political_events.counter_play_politician_cost',
      TunablesStore.resolveInt('political_events.counter_play_politician_cost', 'POLITICAL_EVENTS_COUNTER_PLAY_POLITICIAN_COST', 800000));
    return EffectOverlayStore.applyModifiers('political_events.counter_play_politician_cost', base);
  },
};

/**
 * `POLITICAL_VALID_EFFECT_TUNABLE_KEYS` — the CLOSED set of every tunable key an `EventEffect.tunableKey`
 * (`political-event-catalogue.ts`) is allowed to target: the 9 A1 live-lever keys (10 physical getters — MIS
 * counts as ONE logical lever behind 2 physical keys, §6.1 mapping) + the 6 physical A1 substrate BASE keys
 * (4 substrate GROUPS: audit-pin, federal, stack-zoning, checkpoint-density) + the 1 NEW A2 lever
 * (`counter_play_politician_cost`) that is itself a legitimate effect TARGET (E-POL-10's honest-scaffolding
 * multiplier). Every literal string below was independently confirmed against its owning file's
 * `TunablesStore.resolve*`/`EffectOverlayStore.applyModifiers` call (grepped verbatim, not copied from prose) —
 * see the plan's "A1-engine seams" section + `police-memory-tunables.ts`/`cohesion-tunables.ts`/`ia.tunables.ts`/
 * `lawyer.tunables.ts`/`laundering-tunables.ts`/`market-tunables.ts`/`patrol-tunables.ts`/
 * `inspection-tunables.ts`/`unconformity-tunables.ts`/`specialized-lab-tunables.ts` for each key's source line.
 *
 * This is the anti-fig-leaf resolve-check surface `political_catalogue.spec.ts` (C1 test floor) uses: every
 * catalogue effect's `tunableKey` MUST be a member of this set — a fabricated/dangling key fails the check even
 * though the entry's `magnitudeGetter` still compiles fine (the getter and the target key are independent
 * fields; TypeScript cannot catch a semantically-wrong-but-syntactically-valid target string).
 */
export const POLITICAL_VALID_EFFECT_TUNABLE_KEYS: ReadonlySet<string> = new Set<string>([
  // ── 9 A1 live-lever keys (10 physical getters, decisions §0 / A1-engine-seams) ─────────────────
  'T.city.raid_target_temperature',                          // police-memory-tunables.ts:120,127-128
  'T.city.permanent_marginal_threshold',                      // cohesion-tunables.ts:100-102
  'T.city.cohesion_recovery_rate_per_day',                    // cohesion-tunables.ts:74,82-85
  'internal_affairs.open_investigation_threshold',            // ia.tunables.ts:98-102
  'lawyer.tier3_corruption_lawyer_base_cost_cents',            // lawyer.tunables.ts:309,313
  'laundering.front_shop_legit_baseline_cents',                // laundering-tunables.ts:91-92
  'market.lane_c_lo',                                          // market-tunables.ts:76-77
  'T.city.inspection_queue_cap',                               // inspection-tunables.ts:64 (MIS logical lever, physical key 1/2)
  'T.mis.priority_decay_per_day',                              // inspection-tunables.ts:91-92 (MIS logical lever, physical key 2/2)
  'T.city.cluster_correlation_threshold',                      // patrol-tunables.ts:51-52
  // ── 4 substrate GROUPS, 6 physical BASE keys (A1 migs 0107-0110) ───────────────────────────────
  'forensic.audit_pin_half_life_days',                         // unconformity-tunables.ts:129,131
  'forensic.audit_pin_emergence_rate',                         // unconformity-tunables.ts:146,148
  'police_memory.federal_raid_target_temperature',              // police-memory-tunables.ts:85
  'police_memory.federal_suspicion_decay_per_tile_per_day',    // police-memory-tunables.ts:84
  'real_estate.stack_zoning_gated_lot_count',                  // specialized-lab-tunables.ts:85,87
  'checkpoint_inspection_density_default',                      // inspection-tunables.ts:125,138,154,157
  // ── 1 NEW A2 lever that is itself a legitimate effect TARGET (this file, above) ────────────────
  'political_events.counter_play_politician_cost',
]);

/**
 * `EPOL12_DISTRICT_HEAT_CEILING_BUCKET` — E-POL-12's "heat ≤ ceiling" half of the sustained good-behavior
 * predicate (decisions §4.2 sub-ruling, RULED 2026-07-05): compares the EXISTING per-district `HeatBucket` rank
 * (COLD < WARM < HOT < BURNING, `citysim/events/city-event-bus.ts:483`) — NOT a new `[0,1]` raw scalar. Default
 * (and only) value `WARM` (COLD or WARM qualifies as "quiet enough"; HOT/BURNING fails).
 *
 * Deliberately NOT a `politicalTunables` getter / NOT in `POLITICAL_TUNABLE_CAPS`: the ruling is explicit that
 * this must NOT become a registry-resolved scalar (R2.2 — the raw heat float never escapes; minting a second
 * "how hot is too hot" threshold alongside the canonical `HeatBucket` band floors, `heat-tunables.ts:89-91`,
 * would risk drift between two sources of truth). This is therefore a FIXED code constant — C3's real trigger
 * evaluator imports it directly, exactly as it would a getter, but it carries no DB-override/env-override path.
 */
export const EPOL12_DISTRICT_HEAT_CEILING_BUCKET: HeatBucket = 'WARM';
