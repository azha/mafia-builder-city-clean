// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C3
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.4 (Exception
//             card) — "Exception card player-level non-modale via S5 pour chaque joueur ayant ≥ 1
//             building dans le district drifté ... copy i18n key ambient.off_hours_drift.card ... Dedup
//             S5 : au plus 1 card pending par joueur. AUCUNE notification push."
//             S5 pattern (VERBATIM, follow exactly): services/game-back/src/exceptions/
//             heat-pressure-exception-producer.service.ts:19-41 (OnModuleInit + CityEventBus subscribe +
//             `.catch`-contained async + `ExceptionsRepository.hasPendingPlayerLevelCard` dedup).
//             — 04g-A C3 — 2026-07-13
//
// `AmbientDriftExceptionProducerService` — subscribes to `OffHoursDriftDetectedEvent`
// (`city-event-bus.ts`, emitted per-player by `OffHoursDriftDetectorService` on a genuine district trip)
// and raises a player-level, non-teachable, non-modal Exception card — the SAME shape as
// `HeatPressureExceptionProducerService` (`lieutenant_id: null`, 2 informational candidate actions).
//
// DEDUP (S5, design §3.4 "au plus 1 card pending par joueur"): `hasPendingPlayerLevelCard(playerId)` —
// the SAME per-player-level dedup gate `HeatPressureExceptionProducerService` uses (a district could trip
// on consecutive NIGHTLY passes for the SAME set of affected players; this gate collapses that to at most
// ONE pending card per player, C3 AC4).
//
// COPY = I18N KEY, NOT LITERAL PROSE (a DELIBERATE deviation from `HeatPressureExceptionProducerService`/
// `RaidExceptionProducerService`'s own hardcoded-English convention — see TD-216, the exceptions spine's
// pre-existing "no i18n key+params support on event_descriptor" gap): design §3.4/AC1 explicitly requires
// "copy = clé i18n `ambient.off_hours_drift.card`", which THIS producer honors by storing the dotted key
// STRING itself in `event_descriptor` (the SAME "back stores/forwards a dotted key, client resolves it"
// convention `AmbientProjectionService.descriptor_i18n_key` already established for the feed — C2). The
// canon copy the key resolves to (client-side, forward TD — no Unity consumer, design §11 item 4/TD-244):
// "Your operations during off-hours show elevated heat in recent weeks" (design §3.4, F1 verbatim).
//
// NO NOTIFICATION PUSH (design §3.4/AC5 — "AUCUNE notification push (P1 — pas de route sendNotifications
// ici)"): this file NEVER imports/calls `LiveOpsNotificationService`/`sendNotifications` — the ONLY
// mutation this service performs is the single `ExceptionsRepository.insert` call below.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus, type OffHoursDriftDetectedEvent } from '../../citysim/events/city-event-bus';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';

/** The i18n key design §3.4/AC1 mandates verbatim — the card's `event_descriptor` payload. */
export const OFF_HOURS_DRIFT_CARD_I18N_KEY = 'ambient.off_hours_drift.card';

@Injectable()
export class AmbientDriftExceptionProducerService implements OnModuleInit {
  private readonly logger = new Logger(AmbientDriftExceptionProducerService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: ExceptionsRepository,
  ) {}

  onModuleInit(): void {
    this.bus.onOffHoursDriftDetected((e) => {
      this.handle(e).catch((err) =>
        this.logger.error(
          `ambient-drift exception producer failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
  }

  private async handle(e: OffHoursDriftDetectedEvent): Promise<void> {
    if (await this.repo.hasPendingPlayerLevelCard(e.playerId)) return; // S5 dedup — at most 1 pending player-level card.
    const actions: CandidateActionView[] = [
      {
        id: 'acknowledge',
        label: 'Acknowledge the pattern',
        label_i18n: { key: 'exception.ambient_drift.acknowledge.label', params: {} }, // TD-455
        projected_consequence: 'You note the off-hours pattern; no automatic action is taken.',
        projected_consequence_i18n: { key: 'exception.ambient_drift.acknowledge.projected_consequence', params: {} }, // TD-455
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      },
      {
        id: 'escalate',
        label: 'Escalate for review',
        label_i18n: { key: 'exception.ambient_drift.escalate.label', params: {} }, // TD-455
        projected_consequence: 'The card is archived for later review.',
        projected_consequence_i18n: { key: 'exception.ambient_drift.escalate.projected_consequence', params: {} }, // TD-455
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      },
    ];
    await this.repo.insert({
      player_id: e.playerId,
      lieutenant_id: null,
      event_descriptor: OFF_HOURS_DRIFT_CARD_I18N_KEY,
      candidate_actions: actions,
      suggested_action: actions[0],
      confidence: 0.8,
      severity: 50,
      priority: 50,
      resolution_status: 'pending',
    });
  }
}
