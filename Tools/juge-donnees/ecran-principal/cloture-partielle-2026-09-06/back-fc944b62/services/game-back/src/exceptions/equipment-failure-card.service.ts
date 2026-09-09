// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C5 (the producer's dedup-gated
//             card raise + the D4 periodic re-emission sweep — factored OUT of the OnModuleInit producer so it
//             can be safely DUPLICATE-REGISTERED in `MaintenanceModule` too, see below)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §6 (the 4-option card
//             shape) + §4 step 5 (critical/failed periodic re-emission, dedup-gated)
//             — 04f-A C5 — 2026-07-10
//
// `EquipmentFailureCardService` — the STATELESS card-raising logic BOTH the real-time producer (on a fresh
// `EquipmentFailedEvent`) and the NIGHTLY/21 tick's periodic re-emission sweep (D4) call. Split out of
// `EquipmentFailureExceptionProducerService` on PURPOSE: this class has NO `OnModuleInit` side effect (no bus
// subscription), so it is safe to DUPLICATE-REGISTER in a second module's `providers` — exactly the
// `ExceptionsRepository` precedent `lieutenant.module.ts:311-314` already established ("ExceptionsModule already
// imports LieutenantModule, so importing ExceptionsModule here would create a circular dep... injected DIRECTLY").
// The SAME shape applies here, one hop further: `ExceptionsModule` imports `LieutenantModule`, which imports
// `ProductionModule`, which imports `MaintenanceModule` — so `MaintenanceModule` importing `ExceptionsModule` (to
// reach the D4 re-emission call from `MaintenancePhaseTickService`) would close THAT cycle. `MaintenanceModule`
// therefore duplicate-registers this service (+ its own 2 DB-only dependencies) directly instead — see
// `maintenance.module.ts`'s own comment. The PRODUCER (`EquipmentFailureExceptionProducerService`, which DOES
// have an `OnModuleInit` bus subscription) stays SINGLY-registered in `ExceptionsModule` only — duplicating THAT
// one would double-subscribe the bus and could double-insert a card on a single fresh failure.

import { Injectable } from '@nestjs/common';

import { ExceptionsRepository } from './exceptions.repository';
import { EquipmentFailureExceptionRepository } from './equipment-failure-exception.repository';
import type { CandidateActionView } from './exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from './method-by-action-id';

/** The 4-option equipment-failure repair card's candidates (design §6) — REPAIR_IMMEDIATE first (the safe
 *  default, the `suggested_action`, mirrors the raid card's REPAIR-first convention), then REPAIR_SLOW (cheaper,
 *  slower), DEFER_REPAIR (no cost, stays failed, honest re-surface wrinkle), DEMOLISH_REPLACE (terminal). */
function synthesizeEquipmentFailureActions(buildingId: string): CandidateActionView[] {
  return [
    {
      id: 'repair_immediate',
      label: 'Repair immediately',
      label_i18n: { key: 'exception.equipment_failure.repair_immediate.label', params: {} }, // TD-455
      projected_consequence: 'Pay the full cost to restore the building to operational as fast as possible.',
      projected_consequence_i18n: { key: 'exception.equipment_failure.repair_immediate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'REPAIR_IMMEDIATE', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.repair_immediate, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'repair_slow',
      label: 'Repair slowly (cheaper)',
      label_i18n: { key: 'exception.equipment_failure.repair_slow.label', params: {} }, // TD-455
      projected_consequence: 'Pay a reduced cost; the building takes longer to come back online.',
      projected_consequence_i18n: { key: 'exception.equipment_failure.repair_slow.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'REPAIR_SLOW', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.repair_slow, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'defer',
      label: 'Defer repair',
      label_i18n: { key: 'exception.equipment_failure.defer.label', params: {} }, // TD-455
      projected_consequence: 'Leave the building offline for now — it will keep demanding attention until you act.',
      projected_consequence_i18n: { key: 'exception.equipment_failure.defer.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'DEFER_REPAIR', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.defer, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'demolish_replace',
      label: 'Demolish and replace',
      label_i18n: { key: 'exception.equipment_failure.demolish_replace.label', params: {} }, // TD-455
      projected_consequence: 'Tear the building down; the block becomes available to rebuild from scratch.',
      projected_consequence_i18n: { key: 'exception.equipment_failure.demolish_replace.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'DEMOLISH_REPLACE', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.demolish_replace, // Lot 0 §1 D4 (C2).
    },
  ];
}

@Injectable()
export class EquipmentFailureCardService {
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly failureRepo: EquipmentFailureExceptionRepository,
  ) {}

  /**
   * Dedup-gated card raise (design §6 / plan C5 item 1): insert the 4-option card for `(playerId, buildingId)`
   * UNLESS one is ALREADY pending for that building. Returns true iff a card was inserted. Called both by the
   * producer's `onEquipmentFailed` handler (a fresh failure) and by `reemitForFailedBuildings` (an ongoing
   * 'failed' building whose card was resolved via DEFER, or — defensively — any other gap). The SAME card shape
   * either way (a re-emitted card is indistinguishable from a fresh one — the honest "periodic Exception card"
   * canon framing, design §4 step 5).
   */
  async raiseCardIfAbsent(playerId: string, buildingId: string): Promise<boolean> {
    if (await this.repo.hasPendingForBuilding(playerId, buildingId)) return false;
    const actions = synthesizeEquipmentFailureActions(buildingId);
    await this.repo.insert({
      player_id: playerId,
      lieutenant_id: null, // building-centered, not lieutenant-centered (mirrors the citywide heat-pressure card).
      event_descriptor: 'Equipment failure — operations halted. Choose how to respond.',
      candidate_actions: actions,
      suggested_action: actions[0],
      confidence: 0.9,
      severity: 85,
      priority: 85,
      resolution_status: 'pending',
    });
    return true;
  }

  /**
   * D4 — the periodic re-emission sweep (design §4 step 5, plan C5 item 2's DEFER honesty): for EVERY building
   * currently `structural_state='failed'` for this player, dedup-gated raise a card if none is pending. The
   * spine has NO native scheduled-resurface mechanism, so this IS the re-surface mechanism, called from the
   * NIGHTLY/21 `MAINTENANCE_PHASE_TICK` (`maintenance-phase-tick.service.ts` step 5) EVERY tick — cheap (one
   * indexed SELECT) and naturally idempotent (the dedup gate is the ONLY state; no separate epoch bookkeeping
   * needed — a building whose card is still pending is skipped every time; a building repaired/demolished drops
   * out of the 'failed' set entirely). Returns the count actually re-emitted (0 in the common case — the
   * count-based idempotency-proof shape this codebase's tick services return).
   */
  async reemitForFailedBuildings(playerId: string): Promise<number> {
    const failedBuildingIds = await this.failureRepo.listFailedBuildingIds(playerId);
    if (failedBuildingIds.length === 0) return 0;
    let count = 0;
    for (const buildingId of failedBuildingIds) {
      if (await this.raiseCardIfAbsent(playerId, buildingId)) count++;
    }
    return count;
  }
}
