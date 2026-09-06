// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (detector #1 —
//             STASH_ERLANG_BLOCKING)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 ("`high_blocking_
//             alert` Erlang (erlang-stash.projection.service.ts:15/:22)").
//             Substrate (verified C0 §8 / decisions §0 row 11): `ErlangStashService.listSafehouses` +
//             `blockingStateFor`/`computeBlockingState` (`erlang-stash.service.ts` — System 9, MINUTE/1).
//             — P3-C C5 — 2026-07-12
//
// `StashErlangBlockingDetector` — ONE blocked node per safehouse whose Erlang-B blocking_probability is
// currently over `stash.blocking_alert_threshold` (`alertActive`, the SAME derivation System 9's own
// player-facing projection uses — D3-class wall: this detector NEVER writes to `safehouses`, it only
// READS the row + the in-memory blocking working state System 9's MINUTE/1 tick already maintains).
//
// A safehouse's HOST BUILDING is the blocked node: the safehouse's own `output` (dirty cash moving out
// through it) is what Erlang-B blocking constrains — the building is the real, addressable node the
// player can act on (e.g. add slot capacity).
//
// PREFER-IN-MEMORY, FALL BACK TO ON-THE-FLY (the SAME resilience `ErlangStashProjectionService.
// projectDistrict` itself uses): `blockingStateFor` returns the LAST MINUTE tick's computed state; if this
// detector runs before System 9's own MINUTE/1 tick has ever fired for a fresh safehouse (impossible in
// practice — BACKPRESSURE_UPDATE is MINUTE/26, strictly AFTER MINUTE/1 in the SAME minute band's ordered
// pass), `computeBlockingState` recomputes the SAME pure function from the row. Either way: NO new state,
// NO write, a pure READ.
//
// ALL-DISTRICTS READ: `ErlangStashService` only exposes `listSafehousesForDistrict` (the player-facing
// projection's own per-district seam) — this detector needs EVERY safehouse regardless of district, so it
// injects `ErlangStashRepository.listSafehouses` directly (stateless, DB-only — the SAME duplicate-provide
// safety test `SupplyChainModule`'s header applies; `ErlangStashModule` itself is ALSO imported PROPERLY
// for `ErlangStashService`, whose in-memory blocking state must be the REAL singleton, never a shadow).

import { Injectable } from '@nestjs/common';

import { ErlangStashService } from '../../../citysim/erlang_stash/erlang-stash.service';
import { ErlangStashRepository } from '../../../citysim/erlang_stash/erlang-stash.repository';
import type { BlockedNode, BlockedOutputDetector } from '../blocked-output-detector';

@Injectable()
export class StashErlangBlockingDetector implements BlockedOutputDetector {
  readonly source = 'STASH_ERLANG_BLOCKING' as const;

  constructor(
    private readonly erlangStash: ErlangStashService,
    private readonly erlangStashRepo: ErlangStashRepository,
  ) {}

  async detect(playerId: string): Promise<BlockedNode[]> {
    const safehouses = await this.erlangStashRepo.listSafehouses(playerId);
    const blocked: BlockedNode[] = [];
    for (const s of safehouses) {
      const blockingState = this.erlangStash.blockingStateFor(s.safehouse_id) ?? this.erlangStash.computeBlockingState(s);
      if (blockingState.alertActive) {
        blocked.push({ buildingId: s.building_id, source: this.source });
      }
    }
    return blocked;
  }
}
