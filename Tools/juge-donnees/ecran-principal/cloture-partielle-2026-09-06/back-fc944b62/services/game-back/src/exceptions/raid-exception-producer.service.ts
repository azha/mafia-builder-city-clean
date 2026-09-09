// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T5 / §5 (the raid-response Exception
//             producer — subscribe BuildingRaidedEvent → resolve the delegated lieutenant for the damaged building →
//             coverage-gate on building_damaged → dedup → insert the lieutenant-centered card). Mirrors the Phase-14
//             ExceptionProducerService (onModuleInit subscribe + the .catch-contained async; the bus isolates listeners).
//             One-way: exceptions → bus / lieutenant. The coverage gate is what closes the ADD_RULE loop.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus, type BuildingRaidedEvent } from '../citysim/events/city-event-bus';
import type { CompiledScript } from '../dsl/ir';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { ExceptionsRepository } from './exceptions.repository';
import type { CandidateActionView } from './exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from './method-by-action-id';

/** Subscribes to BuildingRaidedEvent and raises a lieutenant-centered raid-response card (Phase-16). */
@Injectable()
export class RaidExceptionProducerService implements OnModuleInit {
  private readonly logger = new Logger(RaidExceptionProducerService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: ExceptionsRepository,
    private readonly lieutenantRepo: LieutenantRepository,
  ) {}

  onModuleInit(): void {
    this.bus.onBuildingRaided((e) => {
      // The bus delivers synchronously + isolates listeners; the producer's own async work is .catch-contained so a
      // transient DB fault can never bubble as an unhandled rejection (logged; the queue stays consistent).
      this.handle(e).catch((err) =>
        this.logger.error(
          `raid exception producer failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
  }

  /** Resolve the delegated lieutenant for the damaged building → coverage-gate → dedup → insert. */
  private async handle(e: BuildingRaidedEvent): Promise<void> {
    const lt = await this.lieutenantRepo.findDelegatedByAssignedBuilding(e.playerId, e.buildingId);
    if (!lt) return; // no delegated lieutenant guards this building → not lieutenant-centered → no card.
    if (scriptCoversBuildingDamaged(lt.rules)) return; // the script already handles a raid → auto-handled (the closed loop).
    if (await this.repo.hasPendingForLieutenant(e.playerId, lt.lieutenant_id)) return; // dedup (one pending card per lieutenant).

    const actions = synthesizeRaidActions(e.buildingId);
    await this.repo.insert({
      player_id: e.playerId,
      lieutenant_id: lt.lieutenant_id,
      event_descriptor: 'Your building was raided — the lieutenant needs orders.',
      candidate_actions: actions,
      suggested_action: actions[0], // repair = the safe default.
      confidence: 0.9,
      severity: 90,
      priority: 90,
      resolution_status: 'pending',
    });
  }
}

/** True iff the compiled script has a rule whose trigger reads the `building_damaged` STATE (a raid is already covered) —
 *  the analog of Phase-14's scriptCoversHeat. Once ADD_RULE teaches such a rule, this holds → no new card (the closed loop). */
function scriptCoversBuildingDamaged(ir: CompiledScript): boolean {
  return ir.rules.some((r) => r.trigger.kind === 'STATE' && r.trigger.field === 'building_damaged');
}

/** The six candidate actions for a raided building (the raid effects pin target_building_id; the ADD_RULE rule carries its
 *  `;` terminator — the Phase-14 bug lesson; EXECUTE_DEFAULT is the SECURITY-meaningful auto-repair). */
function synthesizeRaidActions(buildingId: string): CandidateActionView[] {
  return [
    {
      id: 'repair',
      label: 'Repair the building',
      label_i18n: { key: 'exception.raid.repair.label', params: {} }, // TD-455
      projected_consequence: 'Pay to restore the building to operational over time.',
      projected_consequence_i18n: { key: 'exception.raid.repair.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'REPAIR', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.repair, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'bribe',
      label: 'Bribe an official (risky)',
      label_i18n: { key: 'exception.raid.bribe.label', params: {} }, // TD-455
      projected_consequence: 'Pay to make the raid disappear — it may work, or backfire and raise heat.',
      projected_consequence_i18n: { key: 'exception.raid.bribe.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'BRIBE', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.bribe, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'lay_low',
      label: 'Lay low (risky)',
      label_i18n: { key: 'exception.raid.lay_low.label', params: {} }, // TD-455
      projected_consequence: 'Go quiet to shed heat — how much is uncertain; the building stays damaged.',
      projected_consequence_i18n: { key: 'exception.raid.lay_low.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'LAY_LOW', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.lay_low, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'add_rule',
      label: 'Teach: auto-handle a raided building',
      label_i18n: { key: 'exception.raid.add_rule.label', params: {} }, // TD-455
      projected_consequence: 'The lieutenant handles a raided building on its own from now on.',
      projected_consequence_i18n: { key: 'exception.raid.add_rule.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: 'WHEN STATE(building_damaged,==,true) THEN EXECUTE_DEFAULT @100;',
      effect: { type: 'ADD_RULE' },
      method: METHOD_BY_ACTION_ID.add_rule, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'acknowledge',
      label: 'Acknowledge',
      label_i18n: { key: 'exception.raid.acknowledge.label', params: {} }, // TD-455
      projected_consequence: 'Dismiss this card; take no action.',
      projected_consequence_i18n: { key: 'exception.raid.acknowledge.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'escalate',
      label: 'Escalate',
      label_i18n: { key: 'exception.raid.escalate.label', params: {} }, // TD-455
      projected_consequence: 'Archive this card for later review.',
      projected_consequence_i18n: { key: 'exception.raid.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
    },
  ];
}
