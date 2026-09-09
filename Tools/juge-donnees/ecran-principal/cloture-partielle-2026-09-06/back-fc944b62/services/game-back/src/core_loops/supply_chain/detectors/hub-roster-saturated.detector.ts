// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (detector #2 —
//             HUB_ROSTER_SATURATED)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 ("in-transit
//             count ≥ `effectiveCap()` (hub-roster.service.ts:17-18/:78)") + §6.3 ("action_ref pointing to
//             the TRUE action surface (hub upgrade / storage / the condition itself)" — hub upgrade is
//             literally named, confirming the hub BUILDING is the node this detector anchors on).
//             Substrate (verified C0 §8 / decisions §0 row 11): `DistributionRepository.
//             getOwnedOperationalHub` + `countInTransitShifts` + `HubRosterService.effectiveCap`
//             (`distribution.repository.ts` / `hub-roster.service.ts`).
//             — P3-C C5 — 2026-07-12
//
// `HubRosterSaturatedDetector` — the player's BEST operational distribution_hub's building_id is the
// blocked node when their CURRENT in-transit courier_shift count is at/over the roster cap the hub's
// hub_tier grants (`HubRosterService.effectiveCap`, the EXACT same read `DistributionService.dispatch`
// makes before refusing 409 OVER_CAPACITY — D3-class wall: this detector calls the SAME pure derivation +
// the SAME two read-only repository methods dispatch already uses, no new query shape, no write).
//
// NO-HUB JUDGMENT CALL (flagged for reviewer): a player with NO operational distribution_hub is ALSO
// capped (at the low `noHubCap()`, default 2) — but there is no BUILDING that anchors that cap (dispatch
// is not gated to any one origin building without a hub; the concept of "add capacity here" — design
// §6.3's own action_ref wording — has no addressable `here` without a hub to upgrade). This detector
// therefore organically no-ops for a hub-less player: the design's §6.3 action surface ("hub upgrade") is
// the ONLY remediation this signal names, and it requires a hub building to exist in the first place.

import { Injectable } from '@nestjs/common';

import { DistributionRepository } from '../../../operational/distribution/distribution.repository';
import { HubRosterService } from '../../../operational/distribution/hub-roster.service';
import type { BlockedNode, BlockedOutputDetector } from '../blocked-output-detector';

@Injectable()
export class HubRosterSaturatedDetector implements BlockedOutputDetector {
  readonly source = 'HUB_ROSTER_SATURATED' as const;

  constructor(
    private readonly distributionRepo: DistributionRepository,
    private readonly hubRoster: HubRosterService,
  ) {}

  async detect(playerId: string): Promise<BlockedNode[]> {
    const hub = await this.distributionRepo.getOwnedOperationalHub(playerId);
    if (!hub) return []; // no-hub judgment call (see header) — organic no-op, no building to anchor on.

    const cap = this.hubRoster.effectiveCap(hub.hubTier);
    const inTransit = await this.distributionRepo.countInTransitShifts(playerId);
    if (inTransit >= cap) {
      return [{ buildingId: hub.buildingId, source: this.source }];
    }
    return [];
  }
}

