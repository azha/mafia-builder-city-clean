// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C4 (the maintenance verb
//             orchestration: mode validation, wallet debit + atomic claim + compensating refund I9,
//             STRUCTURAL_REINFORCE governed via `governor.commit(MYCELIAL_STRUCTURAL_REINFORCE)`, the
//             P2 chain reveal `next_stressed_leg`)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.4 (3 modes,
//             verbatim table) + §5.5 (chain reveal) + §15 (I3/I4/I9).
//             Decisions: §1.4 D4 (multiplier derived, never stored) + governor D8 (ONE seam, cap-by-
//             getter, atomic reserve-before-mutate, compensating decrement on a thrown mutateFn).
//             Pattern: `lieutenant.controller.ts#recruit`'s own `governor.commit(type, ctx, () =>
//             site.mutation())` call shape, REUSED verbatim for the ONE structural mode.
//             — P3-C C4 — 2026-07-12
//
// `LegMaintenanceService.maintain` — the 3-mode verb (design §5.4 table):
//
//   | mode                  | duration (game-min)                          | cost getter                             | completion effect |
//   |-----------------------|-----------------------------------------------|------------------------------------------|--------------------|
//   | quick_patch           | mycelialQuickPatchDurationTicks (2)            | mycelialQuickPatchCostCents              | MINUTE/27 advance: debt_load = LEAST(debt_load, residual) |
//   | structural_reinforce  | mycelialStructuralReinforceDurationTicks (6)   | mycelialStructuralReinforceCostCents     | MINUTE/27 advance: debt_load = 0 — STRUCTURAL, governor-wrapped |
//   | reroute_bypass        | none (a STATE, not a duration)                 | mycelialBypassSetupCostCents             | immediate: bypassed=true (dispatch on the pair 409s LEG_RESTING); exit is decay-driven (leg.repository.ts) |
//
// SEQUENCE (design §5.4: "débit d'abord, claim ensuite, refund compensatoire sur échec de claim — même
// forme que governor :104-114"): `runMutation` below is the ONE debit→claim→(refund-on-claim-failure)
// closure, called EITHER directly (quick_patch / reroute_bypass) OR as the `mutateFn` argument to
// `StructuralDecisionGovernorService.commit` (structural_reinforce ONLY — the ONE STRUCTURAL mode,
// code 10 `MYCELIAL_STRUCTURAL_REINFORCE`). For the governed path, the governor's OWN atomic reserve
// runs BEFORE `runMutation` — a session-capped-out 2nd `structural_reinforce` never even attempts a
// debit (409 STRUCTURAL_CAP_EXHAUSTED, I4); if `runMutation` itself throws (insufficient cash, or a lost
// I3 claim race — the wallet was ALREADY refunded by `runMutation`'s own catch by the time this
// propagates), the governor's `commit` catches it, issues ITS OWN compensating decrement
// (`compensateStructuralSlot`), and re-throws the SAME error — two independent compensations (wallet +
// structural slot) layered cleanly, neither aware of the other's bookkeeping.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { enumField } from '../../common/param-pipes';
import { RaidExceptionRepository } from '../../exceptions/raid-exception.repository';
import { StructuralDecisionGovernorService } from '../../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../../progression/loop10/structural-decision-catalogue';
import { LegRepository } from './leg.repository';
import { LegMaintenanceRepository, type ClaimedLeg } from './leg-maintenance.repository';
import { mycelialMaintenanceMode, type MycelialMaintenanceModeEnumTs } from '../../db/schema/supply_chain_loops';
import { coreLoopsTunables } from '../core-loops-tunables';

/** Per-mode { cost, completion tick } — design §5.4's table, resolved from the C1 tunable getters (R2.3
 *  — no inline numeric balance). `completesAtTick: null` for `reroute_bypass` (a STATE, not a timed job —
 *  the migration 0125 3-way CHECK's own carve-out; design §5.4 "durée : état, pas durée"). */
function resolveModeParams(
  mode: MycelialMaintenanceModeEnumTs,
  gameMinute: number,
): { costCents: number; completesAtTick: number | null } {
  switch (mode) {
    case 'quick_patch':
      return {
        costCents: coreLoopsTunables.mycelialQuickPatchCostCents,
        completesAtTick: gameMinute + coreLoopsTunables.mycelialQuickPatchDurationTicks,
      };
    case 'structural_reinforce':
      return {
        costCents: coreLoopsTunables.mycelialStructuralReinforceCostCents,
        completesAtTick: gameMinute + coreLoopsTunables.mycelialStructuralReinforceDurationTicks,
      };
    case 'reroute_bypass':
      return { costCents: coreLoopsTunables.mycelialBypassSetupCostCents, completesAtTick: null };
  }
}

/** The R2.2 chain-reveal projection (design §5.5: "R2.2: bands/ids only") — `findNextStressedLeg` only
 *  ever returns a leg with `debt_load > stressThreshold` (by its own WHERE clause), so the ONLY
 *  distinction left to make here is whether it is AT the debt cap ("fractured") or merely over the
 *  stress threshold ("stressed") — never the raw `debt_load` itself. This is a LOCAL, minimal bucket
 *  (not the full `DebtBucket` player-projection wall, `fresh|accruing|stressed|fractured` — that 4-value
 *  enum + its leak-scan is C9's job, plan §C9); this preview never needs `fresh`/`accruing` since a
 *  fresh/accruing leg can never satisfy `findNextStressedLeg`'s own `debt_load > stressThreshold` filter. */
export type NextStressedLegBucket = 'stressed' | 'fractured';

function bucketForNextStressedLeg(debtLoad: number, debtCap: number): NextStressedLegBucket {
  return debtLoad >= debtCap ? 'fractured' : 'stressed';
}

export interface NextStressedLegView {
  readonly legId: string;
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
  readonly debtBucket: NextStressedLegBucket;
}

export interface MaintainResult {
  readonly legId: string;
  readonly mode: MycelialMaintenanceModeEnumTs;
  readonly maintenanceCompletesAtTick: number | null;
  readonly nextStressedLeg: NextStressedLegView | null;
}

@Injectable()
export class LegMaintenanceService {
  constructor(
    private readonly legRepository: LegRepository,
    private readonly legMaintenanceRepository: LegMaintenanceRepository,
    // D3 wall: a duplicate-provided instance (SupplyChainModule provides this class directly, the SAME
    // `DistributionModule`-established "avoid the ExceptionsModule cycle" reasoning). REUSE ONLY — this
    // lot never edits `raid-exception.repository.ts`.
    private readonly raidRepo: RaidExceptionRepository,
    private readonly governor: StructuralDecisionGovernorService,
  ) {}

  async maintain(playerId: string, legId: string, rawMode: string): Promise<MaintainResult> {
    // L0.3 (D5) — enum: `maintenance_mode` is a REAL persisted pgEnum column
    // (`supply_chain_loops.ts:52,70`, written at `leg-maintenance.repository.ts:97`) — DF-11:
    // `mycelialMaintenanceMode.enumValues`, never the hand-written `VALID_MODES` literal it replaces.
    const mode = enumField(mycelialMaintenanceMode.enumValues, { mode: rawMode }, 'mode') as MycelialMaintenanceModeEnumTs;

    const leg = await this.legMaintenanceRepository.findOwnedLeg(playerId, legId);
    if (!leg) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `leg ${legId} is not a player-owned supply_chain_legs row for this player.`,
      });
    }

    const gameMinute = await this.legRepository.getCurrentGameMinute(playerId);
    const { costCents, completesAtTick } = resolveModeParams(mode, gameMinute);

    // The debit→claim→(refund-on-claim-failure) sequence (design §5.4, I9) — see file header for the
    // full ordering rationale. Thrown errors propagate AS-IS to the caller (governor-wrapped or not).
    const runMutation = async (): Promise<ClaimedLeg> => {
      const debited = await this.raidRepo.debitWallet(playerId, costCents);
      if (!debited) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `insufficient cash for ${mode} maintenance (needs ${costCents} cents).`,
        });
      }
      const claimed = await this.legMaintenanceRepository.claimMaintenance(playerId, legId, mode, completesAtTick);
      if (!claimed) {
        // I9 — the claim lost the race (or the leg already carries an active job): refund BEFORE
        // throwing, so the 409 path leaves ZERO net wallet impact (the C4 concurrency floor's own
        // "2 concurrent maintains same leg -> 1 claim" assertion also checks the loser's wallet nets to
        // its pre-attempt balance).
        await this.legMaintenanceRepository.refundWallet(playerId, costCents);
        throw new ApiError('MAINTENANCE_IN_PROGRESS', {
          message: `leg ${legId} already has an active maintenance job (or is currently resting).`,
        });
      }
      return claimed;
    };

    if (mode === 'structural_reinforce') {
      // The ONE STRUCTURAL mode (design §5.4, code 10 `MYCELIAL_STRUCTURAL_REINFORCE` — catalogue
      // flipped `live:true` this chunk). `governor.commit` reserves atomically BEFORE `runMutation` ever
      // runs (I4 — a session-exhausted 2nd structural commit 409s STRUCTURAL_CAP_EXHAUSTED here WITHOUT
      // touching the wallet or the leg at all) and compensates its OWN counter (never the wallet — that
      // is `runMutation`'s own responsibility, see file header) if `runMutation` throws.
      await this.governor.commit(
        playerId,
        StructuralDecisionType.MYCELIAL_STRUCTURAL_REINFORCE,
        {
          before: { entity: 'supply_chain_leg', leg_id: legId, mode },
          after: { entity: 'supply_chain_leg', leg_id: legId, mode },
        },
        runMutation,
      );
    } else {
      await runMutation();
    }

    // P2 chain reveal (design §5.5) — the OTHER stressed leg with the highest debt_load, R2.2-projected
    // (never the raw scalar).
    const next = await this.legRepository.findNextStressedLeg(playerId, legId, coreLoopsTunables.mycelialStressThreshold);

    return {
      legId,
      mode,
      maintenanceCompletesAtTick: completesAtTick,
      nextStressedLeg: next
        ? {
            legId: next.legId,
            originBuildingId: next.originBuildingId,
            destinationBuildingId: next.destinationBuildingId,
            debtBucket: bucketForNextStressedLeg(next.debtLoad, coreLoopsTunables.mycelialDebtCap),
          }
        : null,
    };
  }
}
