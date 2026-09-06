// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-17-exception-funnel-progression-design.md §4-T3 (the citywide
//             Exception producer — rides the EXISTING HeatEscalationEvent; raises a NON-lieutenant card when player heat
//             pressure reaches HOT/BURNING. The informational member of the mix — NOT teachable. Per-player dedup).
//
// NB "citywide" is the PLAYER-FACING framing (the card is player-level — lieutenant_id null). HeatEscalationEvent is
// emitted per BUILDING crossing the escalation threshold (no citywide-aggregate event exists yet), so this fires on any
// one of the player's buildings reaching HOT/BURNING; hasPendingPlayerLevelCard collapses that to AT MOST ONE pending
// player-level card at a time (the dedup makes the per-building trigger read as a single player-level pressure signal).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus, type HeatEscalationEvent } from '../citysim/events/city-event-bus';
import { ExceptionsRepository } from './exceptions.repository';
import type { CandidateActionView } from './exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from './method-by-action-id';

/** The heat buckets that warrant a citywide pressure card. */
const PRESSURE_BUCKETS = new Set(['HOT', 'BURNING']);

/** The jsonb `source` tag this producer's candidate actions carry (P3-F C2 — mirrors `BACKPRESSURE_
 *  CRITICAL_SOURCE`/`ROUTE_COLLAPSE_SOURCE`'s own established convention): a BO-diagnostic marker, never
 *  rendered to the player, that lets `MasteryAccumulatorService`'s R6 resolve-hook (C0 §6) identify a
 *  resolved card as heat-pressure-sourced WITHOUT a first-class category column (`exception_queue_row` has
 *  none — the jsonb `candidate_actions[].source` scan is the established idiom, `hasPendingForBuilding`'s
 *  own EXISTS-over-jsonb_array_elements pattern, `exceptions.repository.ts:241-249`). Added additively —
 *  this producer carried no `source` tag before P3-F C2; the tag does not change dedup/insert behavior
 *  (`hasPendingPlayerLevelCard` never reads it). */
export const HEAT_PRESSURE_SOURCE = 'HEAT_PRESSURE';

/** A heat-pressure card's own candidate action — `CandidateActionView` narrowed to ALWAYS carry the
 *  `source` tag (mirrors `BackpressureCandidateActionView`'s exact shape,
 *  `backpressure-exception-producer.service.ts`). */
interface HeatPressureCandidateActionView extends CandidateActionView {
  readonly source: typeof HEAT_PRESSURE_SOURCE;
}

@Injectable()
export class HeatPressureExceptionProducerService implements OnModuleInit {
  private readonly logger = new Logger(HeatPressureExceptionProducerService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: ExceptionsRepository,
  ) {}

  onModuleInit(): void {
    this.bus.onHeatEscalation((e) => {
      this.handle(e).catch((err) =>
        this.logger.error(
          `heat-pressure producer failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
  }

  private async handle(e: HeatEscalationEvent): Promise<void> {
    if (!PRESSURE_BUCKETS.has(String(e.bucket))) return; // only HOT/BURNING raise the pressure card.
    if (await this.repo.hasPendingPlayerLevelCard(e.playerId)) return; // dedup: one pending citywide card per player.
    const actions: HeatPressureCandidateActionView[] = [
      {
        id: 'acknowledge',
        label: 'Acknowledge the pressure',
        // TD-452 — the label's i18n-safe sibling (D2). `en` in string_table.ts is a BYTE-IDENTICAL copy
        // of the `label` literal above; the prose stays (additive only).
        label_i18n: { key: 'exception.heat_pressure.acknowledge.label', params: {} },
        projected_consequence: 'You note the heat; no automatic action is taken.',
        projected_consequence_i18n: { key: 'exception.heat_pressure.acknowledge.consequence', params: {} },
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
        source: HEAT_PRESSURE_SOURCE, // P3-F C2 — see file header.
      },
      {
        id: 'escalate',
        label: 'Escalate for review',
        label_i18n: { key: 'exception.heat_pressure.escalate.label', params: {} }, // TD-452.
        projected_consequence: 'The card is archived for later review.',
        projected_consequence_i18n: { key: 'exception.heat_pressure.escalate.consequence', params: {} },
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
        source: HEAT_PRESSURE_SOURCE,
      },
      // [lot-3 TD-074] 3rd candidate — lay low: one-shot cross-operation mitigation.
      // add_rule_dsl: null — this is informational/citywide, NOT teachable as a per-lieutenant rule (as noted in
      // the citywide design: "NOT teachable", lieutenant_id=null). The LAY_LOW effect wiring (ExceptionEffectRegistry)
      // is the existing ResolutionMethod dispatch — no new effect handler introduced here (R9.3).
      // Lot 0 §1 D4 (C2) — this CITADIN lay_low carries NO `effect` (unlike the raid card's own `lay_low`,
      // raid-exception-producer.service.ts), so choosing it 422s via `requireEffect` (LayLowHandler) — a
      // pre-existing gap, pinned not fixed (additive-only), consigned as TD S6.
      {
        id: 'lay_low',
        label: 'Lay low across all operations',
        label_i18n: { key: 'exception.heat_pressure.lay_low.label', params: {} }, // TD-452.
        projected_consequence: 'You reduce exposure across the board; a one-shot mitigation, no standing rule.',
        projected_consequence_i18n: { key: 'exception.heat_pressure.lay_low.consequence', params: {} },
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.lay_low,
        source: HEAT_PRESSURE_SOURCE,
      },
    ];
    await this.repo.insert({
      player_id: e.playerId,
      lieutenant_id: null,
      event_descriptor: 'Citywide heat is high — your operations are under pressure.',
      // TD-452 — event_descriptor's i18n-safe sibling (D2); `en` = byte-identical copy above.
      event_descriptor_i18n: { key: 'exception.heat_pressure.card.descriptor', params: {} },
      candidate_actions: actions,
      suggested_action: actions[0],
      confidence: 0.9,
      severity: 70,
      priority: 70,
      resolution_status: 'pending',
    });
  }
}
