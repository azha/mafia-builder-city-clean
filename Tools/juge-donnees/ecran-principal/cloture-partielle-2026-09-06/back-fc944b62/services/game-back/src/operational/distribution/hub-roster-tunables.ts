// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — distribution (Phase-4 vector
//             #4) — the `distribution.distribution_hub_max_roster_tier_{1..5}` per-tier roster caps + the
//             `distribution.no_hub_concurrent_cap` (the no-hub absolute concurrency cap) registry keys (all REUSE; the
//             tier_1/tier_5 are canon REUSE-backport, tier_2..4 + no_hub_concurrent_cap are NEW `[PROV-Y26Q2]`, ALL
//             already present in gdd/14 — this file MIRRORS them, NEVER edits gdd/14) +
//             docs/superpowers/specs/2026-06-07-phase-04-distribution-hub-design.md §4/§7 (lever A — the courier roster
//             concurrency cap scaled by hub_tier; the no-hub reduced cap) +
//             docs/tech/04a_operational_systems/distribution_couriers_runners.md §Tunables NOUVEAUX l.269-271 (GDD §9
//             "Tier-1 hub holds 5 … Tier-5 holds 30" — the upstream canon source the tier_1/tier_5 backport mirrors)
//             -- session:2026-06-07 (Phase 4 vector #4 — distribution_hub — Task 3) --
//
// Distribution-hub ROSTER-CAP tunables (Phase-4 vector #4 — courier dispatch hub, lever A) — the `distribution.*` keys
// THIS slice's HubRosterService (T3) CONSUMES: the per-tier ROSTER CAP (`distribution_hub_max_roster_tier_<tier>` — the
// max concurrent in-transit shipments a player with an operational distribution_hub of that hub_tier may have) + the
// NO-HUB CAP (`no_hub_concurrent_cap` — the absolute concurrency cap for a player with NO operational distribution_hub).
//
// LEVER A (the concurrency cap): a distribution_hub raises the player's courier roster cap from the meagre no-hub cap
// (2) up to a tier-scaled cap (Tier-1=5 … Tier-5=30, a linear 5→30 interpolation already materialized as per-tier keys
// in gdd/14: round(5 + (30-5)×(t-1)/4) = 5, 11, 18, 24, 30). HubRosterService.rosterCap(hubTier) reads the per-tier key;
// noHubCap() reads no_hub_concurrent_cap; effectiveCap() picks rosterCap(maxHubTier) when the player owns an operational
// hub, else noHubCap(). The actual 409 OVER_CAPACITY GATE (count in-transit courier_shifts vs the effective cap) is the
// DISPATCH path's job (T4, the RISK task) — T3 only ships the PURE cap-derivation + its registry grounding.
//
// THE BALANCE INVARIANT the no-regression depends on: noHubCap (2) < rosterCap(1) (5) — a distribution_hub must STRICTLY
// raise the cap (otherwise the lever is inert), AND the no-hub cap must stay ≥ the max concurrent any existing spec
// dispatches (every existing dispatch path — distribution/selling/Crick/Hush/Ash — dispatches ONE shipment at a time, so
// a single dispatch stays under the no-hub cap of 2 → no-regression). The shipped values (2 < 5 ≤ 11 ≤ 18 ≤ 24 ≤ 30)
// satisfy both by construction; the per-tier curve is monotone non-decreasing. (gdd/14 itself documents these `<`/`≥`
// constraints per key — this file is the faithful code mirror.)
//
// R2.3 (NO inline numeric balance/config): every DEFAULT below is the gdd/14 §Operational chain — distribution registry
// value (cited per key, with the upstream design-spec / 04a source). They are surfaced as env-overridable fallbacks so
// this file stays a faithful MIRROR of the single source of truth. If the registry values change, update this map in the
// SAME commit (R9.3 propagation: gdd/14 ↔ code). All values are `[PROV-Y26Q2]` (provisional, calibrate downstream).
// MIRRORS the env-fallback style of distribution-tunables.ts + real_estate/hub-tunables.ts (an intTunable resolver + a
// DEFAULTS map with per-key gdd citations). NO gdd/14 EDIT — all keys already exist (all REUSE).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/** The valid hub_tier range — the per-tier roster keys exist only for tiers 1..5 (aligned on distribution.hub_max_tier=5,
 *  materialized by the DB CHECK bos_hub_tier_chk hub_tier <= 5). rosterCap() clamps an out-of-range tier into this band. */
export const HUB_ROSTER_MIN_TIER = 1;
export const HUB_ROSTER_MAX_TIER = 5;

/**
 * Resolved distribution-hub roster-cap tunables. All keys are gdd/14 §Operational chain — distribution (Phase-4 vector
 * #4). R2.3 — NOT inline. The per-tier roster cap is keyed by the hub_tier (1..5); the no-hub cap is the single
 * `no_hub_concurrent_cap`. Env overrides (test-only): DISTRIBUTION_HUB_MAX_ROSTER_TIER_{1..5} +
 * DISTRIBUTION_NO_HUB_CONCURRENT_CAP. Consumed by HubRosterService (T3) — the PURE cap derivation.
 * DB-override > env > default (Phase-23).
 */
export const hubRosterTunables = {
  /**
   * distribution.distribution_hub_max_roster_tier_<tier> — the per-tier roster cap (max concurrent in-transit shipments
   * for an operational distribution_hub of that hub_tier). Indexed by hub_tier: 1 → 5, 2 → 11, 3 → 18, 4 → 24, 5 → 30
   * (a monotone non-decreasing linear 5→30 curve). Env overrides: DISTRIBUTION_HUB_MAX_ROSTER_TIER_{1..5} (test-only).
   * Consumed by HubRosterService.rosterCap(hubTier). (DB-override > env > default — Phase-23).
   */
  rosterCapByTier: {
    get 1(): number {
      return TunablesStore.resolveInt(
        'distribution.distribution_hub_max_roster_tier_1',
        'DISTRIBUTION_HUB_MAX_ROSTER_TIER_1',
        5,
      );
    },
    get 2(): number {
      return TunablesStore.resolveInt(
        'distribution.distribution_hub_max_roster_tier_2',
        'DISTRIBUTION_HUB_MAX_ROSTER_TIER_2',
        11,
      );
    },
    get 3(): number {
      return TunablesStore.resolveInt(
        'distribution.distribution_hub_max_roster_tier_3',
        'DISTRIBUTION_HUB_MAX_ROSTER_TIER_3',
        18,
      );
    },
    get 4(): number {
      return TunablesStore.resolveInt(
        'distribution.distribution_hub_max_roster_tier_4',
        'DISTRIBUTION_HUB_MAX_ROSTER_TIER_4',
        24,
      );
    },
    get 5(): number {
      return TunablesStore.resolveInt(
        'distribution.distribution_hub_max_roster_tier_5',
        'DISTRIBUTION_HUB_MAX_ROSTER_TIER_5',
        30,
      );
    },
  } as Record<number, number>,
  /**
   * distribution.no_hub_concurrent_cap — the absolute concurrency cap for a player with NO operational distribution_hub.
   * Default 2 (strictly < rosterCap(1)=5 — the lever-A discrimination invariant). Env override:
   * DISTRIBUTION_NO_HUB_CONCURRENT_CAP (test-only). Consumed by HubRosterService.noHubCap().
   * (DB-override > env > default — Phase-23).
   */
  get noHubConcurrentCap(): number {
    return TunablesStore.resolveInt(
      'distribution.no_hub_concurrent_cap',
      'DISTRIBUTION_NO_HUB_CONCURRENT_CAP',
      2,
    );
  },
};
