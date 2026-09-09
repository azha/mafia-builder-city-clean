// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-04-distribution-hub-design.md §4/§7 (lever A — the courier roster
//             concurrency cap scaled by hub_tier; the no-hub reduced cap) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — distribution (Phase-4 vector #4
//             — the `distribution_hub_max_roster_tier_{1..5}` per-tier caps + `no_hub_concurrent_cap`, via
//             hub-roster-tunables.ts) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.12 (building_operational_state.hub_tier — the lever
//             this derivation reads; the DB CHECK bos_hub_tier_chk constrains hub_tier to 1..5)
//             -- session:2026-06-07 (Phase 4 vector #4 — distribution_hub — Task 3) --
//
// `HubRosterService` — the PURE roster-cap DERIVATION of the distribution_hub courier vector (lever A — T3). Deterministic
// (NO RNG, NO DB inside these methods): every method takes primitives and returns a number. The DB read ("does the player
// own an operational distribution_hub + its best hub_tier") is the DistributionRepository's job
// (getOwnedOperationalHub → { buildingId, hubTier } | null; the dispatch passes hub?.hubTier ?? null here) — this service
// is the pure derivation that maps that read's result to a concurrency cap.
//
// LEVER A (the concurrency cap): a distribution_hub raises the player's courier roster cap from the meagre no-hub cap (2)
// up to a tier-scaled cap (Tier-1=5 … Tier-5=30). The DISPATCH path (T4, the RISK task) consumes effectiveCap() to gate a
// new shipment (count in-transit courier_shifts vs the cap → 409 OVER_CAPACITY at/over the cap). T3 ships ONLY the pure
// derivation; the gate + the E2E proof land in T4 (this slice is E2E-only — there is NO standalone unit test, the
// observable caps are asserted through the T4 dispatch E2E).
//
// THE BALANCE INVARIANT the no-regression depends on: noHubCap() (2) < rosterCap(1) (5). A distribution_hub must STRICTLY
// raise the cap (otherwise lever A is inert), and the no-hub cap must stay ≥ the max concurrent any existing spec
// dispatches (every existing dispatch path dispatches ONE shipment at a time → a single dispatch stays under the no-hub
// cap of 2 → no-regression). The shipped registry values (2 < 5 ≤ 11 ≤ 18 ≤ 24 ≤ 30) satisfy this by construction; no
// runtime assert is needed (it is a property of the gdd/14-grounded values, which gdd/14 itself constrains per key).

import { Injectable } from '@nestjs/common';

import { hubRosterTunables, HUB_ROSTER_MIN_TIER, HUB_ROSTER_MAX_TIER } from './hub-roster-tunables';

@Injectable()
export class HubRosterService {
  /**
   * The per-tier ROSTER CAP — the max concurrent in-transit shipments for an operational distribution_hub of `hubTier`
   * (lever A). PURE: reads only the gdd/14-grounded per-tier tunable (distribution.distribution_hub_max_roster_tier_<tier>),
   * no DB, no RNG. Monotone non-decreasing by construction (5 ≤ 11 ≤ 18 ≤ 24 ≤ 30).
   *
   * DEFENSIVE CLAMP (the chosen out-of-range policy): a hub_tier is sourced from building_operational_state.hub_tier,
   * which the DB CHECK bos_hub_tier_chk already constrains to 1..5 — so an out-of-range value is never expected in
   * practice. Rather than throw on the player-action hot path (the dispatch gate calls this every dispatch), we CLAMP an
   * out-of-range tier to the nearest valid tier (< 1 → tier 1's cap; > 5 → tier 5's cap). This is the defensive-but-quiet
   * choice (a stray tier never blocks a player's dispatch with a 500). It differs from hub-tunables' hubUpgradeCostCents,
   * which THROWS on an unmapped TARGET tier — but that target is a freshly-computed currentTier+1 (a genuine config gap if
   * unmapped, worth a loud failure), whereas this reads a DB-persisted, CHECK-constrained value (a defensive clamp is the
   * right floor/ceiling). The clamped tier is ALWAYS a mapped key (1..5), so the inner lookup never misses; the throw
   * below is an unreachable belt-and-braces guard against a future tunable-map gap (a loud config error, never silent 0).
   */
  rosterCap(hubTier: number): number {
    // Clamp into the valid 1..5 band (the DB CHECK already guarantees this for a persisted hub_tier; defensive only).
    const clampedTier = Math.min(HUB_ROSTER_MAX_TIER, Math.max(HUB_ROSTER_MIN_TIER, Math.trunc(hubTier)));
    const cap = hubRosterTunables.rosterCapByTier[clampedTier];
    if (cap === undefined) {
      // Unreachable for a clamped 1..5 tier (the map ships keys 1..5). A loud config gap, never a silent 0.
      throw new Error(
        `No distribution.distribution_hub_max_roster_tier for hub_tier ${clampedTier} (gdd/14 §Operational chain — ` +
          `distribution defines tier_1..5; a higher hub_max_tier needs the matching roster-cap key added).`,
      );
    }
    return cap;
  }

  /**
   * The NO-HUB concurrency cap — the absolute max concurrent in-transit shipments for a player with NO operational
   * distribution_hub (distribution.no_hub_concurrent_cap, default 2). PURE: reads only the tunable, no DB, no RNG. By the
   * shipped values this is strictly < rosterCap(1) (2 < 5) — the lever-A discrimination invariant.
   */
  noHubCap(): number {
    return hubRosterTunables.noHubConcurrentCap;
  }

  /**
   * The EFFECTIVE concurrency cap for a player given the MAX hub_tier over their operational distribution_hubs (the
   * DistributionRepository.getOwnedOperationalHub read's hub?.hubTier ?? null): `null` (no operational distribution_hub) → noHubCap();
   * else rosterCap(maxOperationalHubTier). PURE: no DB, no RNG — it composes noHubCap()/rosterCap() on the read's result.
   * The dispatch gate (T4) compares the count of in-transit courier_shifts against THIS value.
   */
  effectiveCap(maxOperationalHubTier: number | null): number {
    if (maxOperationalHubTier === null) return this.noHubCap();
    return this.rosterCap(maxOperationalHubTier);
  }
}
