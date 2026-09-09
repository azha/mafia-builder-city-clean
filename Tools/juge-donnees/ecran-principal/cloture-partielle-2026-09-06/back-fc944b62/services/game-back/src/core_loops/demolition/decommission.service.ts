// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C4 (endpoint flow —
//             confirm guard 422 + the tx + post-commit event emission)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §6.1 (flow
//             step 2 — "la confirmation est portée par le client ... l'API exige le flag explicite, 422
//             sinon") + §6.3 (post-commit: émission `NodeDecommissionedEvent`, voisins embarqués, D16) +
//             §5.1 (penalty transition events — REUSED from the SAME tick's own emission logic).
//             Decisions: D16 (émission POST-commit, voisins embarqués).
//             Pattern: `RealEstateService.purchase` (validation runs INSIDE the governor-wrapped
//             mutateFn — a thrown `ApiError` there triggers the governor's OWN compensating slot
//             decrement, `structural-decision-governor.service.ts`'s own documented behavior — no
//             special-casing needed here for the confirm guard).
//             — P3-E C4 — 2026-07-17
//
// `DecommissionService.decommission` — the ONE method `DecommissionController` wraps in
// `governor.commit` (StructuralDecisionType.NODE_DECOMMISSION). Confirm guard FIRST (422, zero DB touch)
// — then the tx (`DecommissionRepository.decommissionOwnedNode`) — then, POST-COMMIT: the SAME
// `FrictionBudgetTickService.emitPenaltyTransitionEvents` the scheduled tick calls (design §6.3(f)'s own
// "pas d'attente du tick" — the decommission's own synchronous re-eval is announced exactly like a
// scheduled tick's would be, zero duplicated event logic) THEN `NodeDecommissionedEvent` (D16 — voisins
// embarqués, the annealing subscriber's own trigger).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { coreLoopsTunables } from '../core-loops-tunables';
import { DecommissionRepository } from './decommission.repository';
import { FrictionBudgetTickService } from './friction-budget-tick.service';

export interface DecommissionServiceResult {
  readonly buildingId: string;
  readonly freedBlockId: number;
  readonly neighborCount: number;
}

@Injectable()
export class DecommissionService {
  constructor(
    private readonly repo: DecommissionRepository,
    private readonly frictionTick: FrictionBudgetTickService,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * `confirm` MUST be explicitly `true` (design §6.1 step 2 — the client-side confirm dialog is
   * deferred, Unity différé; the API itself is the confirm/cancel gate). A missing/false flag → 422,
   * BEFORE any repository call (zero DB touch — the governor's compensating decrement still fires
   * correctly since this throws from INSIDE the governor-wrapped mutateFn, see file header).
   */
  async decommission(playerId: string, buildingId: string, confirm: boolean): Promise<DecommissionServiceResult> {
    if (confirm !== true) {
      throw new ApiError('DEMOLITION_CONFIRM_REQUIRED', {
        message: 'decommission requires an explicit {confirm: true} — resend with the flag to proceed.',
      });
    }

    const result = await this.repo.decommissionOwnedNode({
      playerId,
      buildingId,
      costFraction: coreLoopsTunables.demolitionDecommissionCostFractionOfSetup,
      formula: this.frictionTick.resolveFrictionFormulaTunables(),
      // P3-E C5 (design §7/★#5, additive) — resolved HERE (R2.3: the SERVICE layer resolves tunables, the
      // REPOSITORY takes plain numbers), consumed only by the additive replacement-options step.
      replacementOptionsCount: coreLoopsTunables.demolitionReplacementOptionsCount,
      replacementOptionExpiryGameDays: coreLoopsTunables.demolitionReplacementOptionExpiryGameDays,
    });

    // Post-commit (design §6.3 end / §5.1): the SAME event-emission the scheduled tick uses, for the
    // decommission's OWN in-tx penalty transition (if any — removing a node usually reverts, but is not
    // guaranteed to, see that method's own header).
    await this.frictionTick.emitPenaltyTransitionEvents(playerId, result.gameMinute, result.frictionResult);

    // D16 — NodeDecommissionedEvent POST-commit, neighbors EMBEDDED (computed inside the now-committed
    // tx, BEFORE routes were severed) — triggers the BUILDING_DECOMMISSION annealing subscriber.
    this.bus.emitNodeDecommissioned({
      type: 'node_decommissioned',
      playerId,
      buildingId,
      freedBlockId: result.freedBlockId,
      neighborBuildingIds: result.neighborBuildingIds,
      gameMinute: result.gameMinute,
    });

    return {
      buildingId,
      freedBlockId: result.freedBlockId,
      neighborCount: result.neighborBuildingIds.length,
    };
  }
}
