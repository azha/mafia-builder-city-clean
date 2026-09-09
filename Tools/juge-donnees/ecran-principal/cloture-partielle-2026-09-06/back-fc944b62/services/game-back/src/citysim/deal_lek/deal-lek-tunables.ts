// IMPLEMENTS: docs/tech/04_city_simulation/system_11_deal_lek.md §Tunables — REUSE
//             (gdd/14 §City — Deal Lek, lines 184–187 — 4 keys + lek_tile_count L3331 — the keys this system's
//             OWN logic actually CONSUMES are EXISTING registry keys — R2.3, ZERO genuinely-NEW).
//             -- session:2026-06-03 (Phase 1 Task 12) --
//
// System 11 (Deal Lek) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Deal Lek` (L184–187) + `lek_tile_count` (L3331).
// They are surfaced here as env-overridable fallbacks so this file stays a faithful MIRROR of the single source
// of truth (the registry). If the registry values change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (only mirror what the day-1 logic consumes — the buffer-bloat / erlang-stash precedent): the
// resolved `dealLekTunables` object surfaces the keys System 11's tick + projection CONSUME at runtime:
//   §City — Deal Lek (gdd/14 L184–187):
//     - `lek_decay_rate_per_week` (L184, 0.05, range 0.01..0.2) — the fraction of score lost per week with no
//       deals (Inv 2 — the weekly decay: new_score = (1 - rate)×score + new_deals_this_week). CONSUMED by the
//       WEEKLY tick.
//     - `leks_per_district` (L185, 3, range 1..6) — the number of top-N active leks per district (the WEEKLY
//       re-rank marks the top-N tiles by score as active). CONSUMED by the WEEKLY re-rank.
//     - `contest_threshold_presence` (L187, 0.6, range 0.3..0.9) — the normalized (0..1) contest_pressure
//       threshold above which control_state → CONTESTED (Inv 6). CONSUMED by the control-state mapping (the
//       persisted contest_pressure int 0..100 is compared against threshold × 100).
//   §lek_tile_count (gdd/14 L3331, 600, range 300..600):
//     - the GLOBAL bound on the number of active leks (Inv 1 — sparse storage: only tiles with score>0 exist as
//       deal_lek rows, capped at this bound; never pre-seeded). CONSUMED by the 2 Hz lazy-create (a new lek is
//       formed only while the player's active-lek count is below this bound).
//
// DEFERRED (NOT mirrored — no day-1 consumer, resolved-when-consumed — the buffer-bloat tail-panel precedent):
//   - `tribute_rate_per_deal` (0.08, gdd/14 L186) — the fraction of a deal reverted to controller_org_id as
//     tribute. The TRIBUTE-EXTRACTION economy is player-deal/operations driven (P2); no Phase-1 deal-amount
//     producer exists, so a tribute rate would be resolved-but-unused config (no consumer). Deferred WITH the
//     player-deal economy — the lek_score accumulation in Phase 1 comes from FlowCellCongested (organic), not
//     priced deals. Documented in the service header.
//   - the 04a `selling.lek_*_threshold_weeks_bucket` composites — 04a/P2 OPERATIONAL (the selling-action surface),
//     NOT a Phase-1 city-sim driver. NOT mirrored (no day-1 consumer) — the task explicitly excludes them.
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069) is the canonical district set the
// controller validates against (1..18). Surfaced here because the controller CONSUMES it for the per-district
// lek projection endpoint's district validation (one place per system — the buffer-bloat / erlang-stash precedent).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore, type EffectScopeContext } from '../../config/effect-overlay-store';

/**
 * Resolved System 11 Deal Lek tunables. The consumed keys are REUSE from gdd/14 §City — Deal Lek
 * (lek_decay_rate_per_week → the WEEKLY decay; leks_per_district → the WEEKLY re-rank; contest_threshold_presence
 * → the CONTESTED control-state mapping) + lek_tile_count (the sparse active-lek bound). The district count is the
 * controller's 1..N validation bound. ZERO genuinely-NEW tunables (R2.3); tribute_rate_per_deal + the 04a
 * selling.lek_* composites are DEFERRED (no Phase-1 consumer — see the file header).
 *
 * 04g-B C3 (S7 wire, design §3.6/§3.7 "the lek lever" — C0-tranché, `2026-07-15-04g-B-C0-reanchor.md`
 * §2): `contestThresholdPresence` below stays PLAIN/UNCHANGED (byte-identical for any un-scoped caller —
 * `dealLekTunables.contestThresholdPresence`, `DealLekService.contestThresholdPresence` passthrough,
 * `deal-lek.service.ts:423-424`, are ALL untouched). The NEW `contestThresholdPresenceFor(districtId)`
 * scoped variant below is what `deal-lek.projection.service.ts`'s `controlState` calls instead (threaded
 * from `projectDistrict`'s own `districtId` local, 2-level thread per the C0 ruling) — mirrors
 * `cohesionTunables.cohesionRecoveryRatePerDayFor` EXACTLY (same overlay-compose shape, same
 * zero-regression contract: an empty overlay snapshot returns `base` UNCHANGED,
 * `effect-overlay-store.ts:23-25`).
 */
export const dealLekTunables = {
  /** lek_decay_rate_per_week — fraction of score lost per week with no deals (Inv 2 weekly decay). (DB-override > env > default — Phase-23). */
  get lekDecayRatePerWeek(): number { return TunablesStore.resolveFloat('T.city.lek_decay_rate_per_week', 'LEK_DECAY_RATE_PER_WEEK', 0.05); },
  /** leks_per_district — top-N active leks per district (the WEEKLY re-rank bound). (DB-override > env > default — Phase-23). */
  get leksPerDistrict(): number { return TunablesStore.resolveInt('T.city.leks_per_district', 'LEKS_PER_DISTRICT', 3); },
  /** contest_threshold_presence — normalized contest_pressure threshold for CONTESTED (Inv 6). (DB-override > env > default — Phase-23). */
  get contestThresholdPresence(): number { return TunablesStore.resolveFloat('T.city.contest_threshold_presence', 'CONTEST_THRESHOLD_PRESENCE', 0.6); },
  /**
   * contest_threshold_presence — DISTRICT-scoped variant (04g-B C3, S7 wire, design §3.6 "le lever NEW
   * que ce lot ROUTE"). Additive overlay read: composes any GLOBAL or DISTRICT `effect_modifier` row on
   * this key on top of the SAME base as the plain getter above, then returns it — empty overlay → base
   * byte-identical (zero-regression contract). `deal-lek.projection.service.ts`'s `controlState` threads
   * its own per-lek `districtId` (from `projectDistrict`) here so a DISTRICT modifier (the sideways
   * secondary shift, C3) shifts the CONTESTED threshold ONLY in its own district.
   */
  contestThresholdPresenceFor(districtId: number): number {
    const base = TunablesStore.resolveFloat('T.city.contest_threshold_presence', 'CONTEST_THRESHOLD_PRESENCE', 0.6);
    const scope: EffectScopeContext = { districtId: String(districtId) };
    return EffectOverlayStore.applyModifiers('T.city.contest_threshold_presence', base, scope);
  },
  /** lek_tile_count — the GLOBAL active-lek bound (Inv 1 sparse storage; the 2 Hz lazy-create cap). (DB-override > env > default — Phase-23). */
  get lekTileCount(): number { return TunablesStore.resolveInt('lek_tile_count', 'LEK_TILE_COUNT', 600); },
  /** city.district_count — the canonical district set the controller validates against (1..N). (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },
};
