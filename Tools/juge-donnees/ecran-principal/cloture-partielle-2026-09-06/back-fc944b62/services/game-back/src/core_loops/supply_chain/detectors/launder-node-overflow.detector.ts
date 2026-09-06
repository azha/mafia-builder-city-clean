// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (detector #3 —
//             LAUNDER_NODE_OVERFLOW)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 ("`overflow_
//             active` buffer-bloat / OVER_CAPACITY money-holding (buffer-bloat.projection.service.ts:21-34
//             ; money-holding.service.ts:138-153)").
//             Substrate (verified C0 §8 / decisions §0 row 11): `BufferBloatService.overflowedThisPeriodFor`
//             (System 10, in-memory per-period flag) + `MoneyHoldingRepository.listMoneyHoldingsForAudit`
//             + `accruedYieldCents`/`capacityCentsForTier` (the SAME pure formula
//             `MoneyHoldingProjectionService.capacityBand` uses to derive its player-facing `FULL` band).
//             — P3-C C5 — 2026-07-12
//
// `LaunderNodeOverflowDetector` — ONE combined signal over TWO substrates (both are "this node's clean-
// cash output is currently backed up"):
//   (1) a `laundering_nodes` row that overflowed THIS reset period (System 10's own `overflowedThisPeriod`
//       in-memory flag — the SAME accessor the player-facing projection reads, D3-class wall: no write).
//   (2) a `money_holding` whose EFFECTIVE held cash (held_cents + the lazy-accrued yield, computed
//       READ-ONLY here — never settled/persisted by this detector) is AT OR OVER its tier capacity (the
//       SAME `capacityCentsForTier`/`accruedYieldCents` pure math `MoneyHoldingProjectionService.
//       capacityBand` uses to derive `FULL` — "a further deposit would 409 OVER_CAPACITY", the money-
//       holding.service.ts:138-153 anchor's own live guard, read here as a STATE check rather than
//       intercepting the write path itself).
// Both point at a real building_id; a building present in BOTH lists is de-duplicated by the registry's
// own `detectAll` fold (a Set per building), not here.

import { Injectable } from '@nestjs/common';

import { BufferBloatService } from '../../../citysim/buffer_bloat/buffer-bloat.service';
import { BufferBloatRepository } from '../../../citysim/buffer_bloat/buffer-bloat.repository';
import { MoneyHoldingRepository } from '../../../operational/money_holding/money-holding.repository';
import { accruedYieldCents, capacityCentsForTier } from '../../../operational/money_holding/money-holding-tunables';
import { LegRepository } from '../leg.repository';
import type { BlockedNode, BlockedOutputDetector } from '../blocked-output-detector';

@Injectable()
export class LaunderNodeOverflowDetector implements BlockedOutputDetector {
  readonly source = 'LAUNDER_NODE_OVERFLOW' as const;

  constructor(
    private readonly bufferBloat: BufferBloatService,
    private readonly bufferBloatRepo: BufferBloatRepository,
    private readonly moneyHoldingRepo: MoneyHoldingRepository,
    // Same-module REUSE — `getCurrentGameMinute` (design §5.4's own read) is the ONE tick-clock read this
    // detector needs for the money_holding lazy-yield settle-free computation; no new clock accessor.
    private readonly legRepo: LegRepository,
  ) {}

  async detect(playerId: string): Promise<BlockedNode[]> {
    const blocked: BlockedNode[] = [];

    // ── Sub-signal 1: buffer-bloat overflow (System 10's own in-memory per-period flag) ──────────────
    const bufferNodes = await this.bufferBloatRepo.listNodes(playerId);
    for (const n of bufferNodes) {
      if (this.bufferBloat.overflowedThisPeriodFor(playerId, n.node_id)) {
        blocked.push({ buildingId: n.building_id, source: this.source });
      }
    }

    // ── Sub-signal 2: money-holding at/over tier capacity (read-only — no settle, no write) ───────────
    const holdings = await this.moneyHoldingRepo.listMoneyHoldingsForAudit(playerId);
    if (holdings.length > 0) {
      const currentTick = await this.legRepo.getCurrentGameMinute(playerId);
      for (const h of holdings) {
        const capacity = capacityCentsForTier(h.money_holding_tier);
        const accrued = accruedYieldCents(h.held_cents, h.last_yield_tick, currentTick);
        const effectiveHeld = h.held_cents + accrued;
        if (effectiveHeld >= capacity) {
          blocked.push({ buildingId: h.building_id, source: this.source });
        }
      }
    }

    return blocked;
  }
}
