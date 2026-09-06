// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C3
//             (random-world-exception-producer.service.ts, S14)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.6 (Coupling —
//             the Exception card) + §6.1 (D15 — the ONE active-outbound surface of the whole lot)
//             S14 pattern (VERBATIM, follow exactly): services/game-back/src/exceptions/
//             heat-pressure-exception-producer.service.ts:19-41 (OnModuleInit + CityEventBus subscribe +
//             `.catch`-contained async + `ExceptionsRepository.hasPendingPlayerLevelCard` dedup) —
//             mirrors the 04g-A C3 twin `ambient-drift-exception-producer.service.ts` exactly.
//             — 04g-B C3 — 2026-07-15
//
// `RandomWorldExceptionProducerService` — subscribes to `CouplingDiscoveryExposedEvent`
// (`city-event-bus.ts`, emitted per-ADMITTED-player by `RandomWorldCouplingService.applyCouplingDiscovery`)
// and raises a player-level, non-teachable, non-modal Exception card — the SAME shape as
// `AmbientDriftExceptionProducerService` (`lieutenant_id: null`, 2 informational candidate actions).
//
// DEDUP (S14, design §3.6 "dedup S14 : pas de 2ᵉ card pending"): `hasPendingPlayerLevelCard(playerId)` —
// a SECOND admitted cascade for the SAME player (a DIFFERENT pair, since the SAME pair can never
// re-admit — UNIQUE(player_id, pair_key), `RandomWorldCouplingService`'s own "already exposed" gate)
// collapses to at most ONE pending player-level card, exactly mirroring the 04g-A precedent.
//
// COPY = I18N KEY (design §3.6/§6.1 verbatim: "copy i18n key `random_world.coupling_discovery.card`" —
// the SAME "back stores/forwards a dotted key, client resolves it" convention
// `AmbientDriftExceptionProducerService`/`AmbientProjectionService.descriptor_i18n_key` already
// established (TD-216 precedent) — never hardcoded English prose.
//
// NO NOTIFICATION PUSH (design D15 — "AUCUN push"; the whole lot's ONE active-outbound surface is this
// non-modal card): this file NEVER imports/calls `LiveOpsNotificationService`/`sendNotifications` — the
// ONLY mutation this service performs is the single `ExceptionsRepository.insert` call below.
//
// R2.2 (the "backward-pointing causal note" canon, CATALOGUE_REPORT.md :556): the card names the
// coupling's EXISTENCE (the pair) — it NEVER carries the raw probability/condition/magnitude that
// triggered it (those never even reach this file — `CouplingDiscoveryExposedEvent` carries only
// `playerId`/`pairKey`/`cascadeId`/`gameDay`, no numeric leaf).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CityEventBus, type CouplingDiscoveryExposedEvent } from '../../citysim/events/city-event-bus';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';

/** The i18n key design §3.6/§6.1 mandates verbatim — the card's `event_descriptor` payload. */
export const COUPLING_DISCOVERY_CARD_I18N_KEY = 'random_world.coupling_discovery.card';

@Injectable()
export class RandomWorldExceptionProducerService implements OnModuleInit {
  private readonly logger = new Logger(RandomWorldExceptionProducerService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: ExceptionsRepository,
  ) {}

  onModuleInit(): void {
    this.bus.onCouplingDiscoveryExposed((e) => {
      this.handle(e).catch((err) =>
        this.logger.error(
          `random-world coupling-discovery exception producer failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
  }

  private async handle(e: CouplingDiscoveryExposedEvent): Promise<void> {
    if (await this.repo.hasPendingPlayerLevelCard(e.playerId)) return; // S14 dedup — at most 1 pending player-level card.
    const actions: CandidateActionView[] = [
      {
        id: 'acknowledge',
        label: 'Acknowledge the coupling',
        label_i18n: { key: 'exception.random_world.acknowledge.label', params: {} }, // TD-455
        projected_consequence: 'You note the causal link; no automatic action is taken.',
        projected_consequence_i18n: { key: 'exception.random_world.acknowledge.projected_consequence', params: {} }, // TD-455
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      },
      {
        id: 'escalate',
        label: 'Escalate for review',
        label_i18n: { key: 'exception.random_world.escalate.label', params: {} }, // TD-455
        projected_consequence: 'The card is archived for later review.',
        projected_consequence_i18n: { key: 'exception.random_world.escalate.projected_consequence', params: {} }, // TD-455
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      },
    ];
    await this.repo.insert({
      player_id: e.playerId,
      lieutenant_id: null,
      event_descriptor: COUPLING_DISCOVERY_CARD_I18N_KEY,
      candidate_actions: actions,
      suggested_action: actions[0],
      confidence: 0.8,
      severity: 50,
      priority: 50,
      resolution_status: 'pending',
    });
  }
}
