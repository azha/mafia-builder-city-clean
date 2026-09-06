// IMPLEMENTS: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §6 (Defer — DEFER_REPAIR: NO
//             debit; the building STAYS 'failed'; markResolved('resolved', {…'DEFERRED'}). Re-surfacing = D4
//             periodic re-emission, dedup-gated — the honest wrinkle: the spine has no native scheduled-
//             resurface mechanism, so `maintenance-phase-tick.service.ts` step 5 re-emits a NEW card on a later
//             NIGHTLY tick as long as the building is still 'failed' and no card is currently pending).
//             — 04f-A C5 — 2026-07-10

import { Injectable } from '@nestjs/common';

import { ExceptionsRepository } from '../exceptions.repository';
import { EquipmentFailureExceptionRepository } from '../equipment-failure-exception.repository';
import { requireEffect, type ExceptionEffectHandler, type ResolveContext } from './exception-effect';

/** DEFER_REPAIR — zero debit, zero building-state write (the building stays `'failed'` — halted). The log row
 *  is stamped `repair_mode='defer'` (the resolution CHOICE is recorded; the underlying failure is NOT). The
 *  card resolves `'resolved'`; the D4 re-emission sweep (design §4 step 5) raises a fresh card on the next
 *  NIGHTLY tick since the building remains in the 'failed' candidate set and no card is pending anymore. */
@Injectable()
export class DeferRepairHandler implements ExceptionEffectHandler {
  readonly effectType = 'DEFER_REPAIR' as const;
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly failureRepo: EquipmentFailureExceptionRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    const eff = requireEffect(ctx, 'DEFER_REPAIR');

    const estimate = await this.failureRepo.getLatestFailureEstimate(eff.target_building_id);
    if (estimate) {
      await this.failureRepo.stampDeferred(estimate.failureId);
    }

    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'DEFER_REPAIR',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'DEFERRED';
  }
}
