// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C7 ("`PlayerProficiencySeeder`
//             ← `GraduationCommittedEvent`: frozen copy of mastery at graduation (D8)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §4 ("
//             `PlayerProficiencySeeder` ← `GraduationEvent` (creates the frozen row)") + §10.1 ("`Graduation
//             CommittedEvent` subscriber inserts `player_proficiency` (`player_proficiency = mastery_at_
//             event`, debt 0, recovery 0). D8 transposition").
//             ⟟ RECONCILE 2026-07-19 (design §4, echoed at C0-reanchor §n/a — see graduation.service.ts's
//             own header for the full account): `GraduationCommittedEvent` is emitted AFTER the last of
//             GraduationService's 3 transactions, ONLY on full success (a compensated failure never
//             emits) — this subscriber's contract is UNCHANGED by that shape (it only ever sees a
//             genuinely committed graduation).
//             Decisions: D8 (frozen mastery copy, divergence #2 — "no system on this base produces a
//             separate proficiency stat... mastery is the ONLY real demonstrated-competence measure").
//             Pattern (bus subscribe + per-listener isolation, public core method for Lesson #3 test
//             parity): `mastery-accumulator.service.ts` (`onApplicationBootstrap` + `bus.onXxx((e) =>
//             this.handle(e).catch(...))`) / `compression-stress-subscriber.service.ts` (public
//             `updateStressAccumulator` the bus handler AND the test route both call — zero live-vs-test
//             divergence).
//             — P3-F C7 — 2026-07-19
//
// `PlayerProficiencySeeder` — the D8 freeze-at-graduation writer. ONE subscription
// (`GraduationCommittedEvent`), ONE write (`PlayerProficiencyRepository#freezeAtGraduation` — a single
// atomic upsert, see that method's own header for the re-graduation reset semantics). No consumer of
// this service exists elsewhere — `GraduationService` never calls it directly (post-commit event-driven,
// design §4's own "keeps the graduation tx lean" rationale, even though the ⟟ reconcile above clarifies
// the emit actually fires AFTER all 3 txs, not INSIDE a single tx boundary as originally phrased).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus, type GraduationCommittedEvent } from '../citysim/events/city-event-bus';
import { PlayerProficiencyRepository } from './player-proficiency.repository';

@Injectable()
export class PlayerProficiencySeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlayerProficiencySeeder.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly repo: PlayerProficiencyRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onGraduationCommitted((event: GraduationCommittedEvent) => {
      this.handleGraduationCommitted(event).catch((err) =>
        this.logger.error(`graduation_committed player-proficiency freeze failed (contained): ${errMsg(err)}`),
      );
    });
  }

  /**
   * D8 freeze (design §10.1) — public so the E2E floor CAN drive it directly on a known event too (Lesson
   * #3 shape), though the C7 falsifiable floor exercises the REAL `GraduationCommittedEvent` path end-to-
   * end (a real C5 graduation) for its own primary proof — both routes funnel through this SAME method,
   * zero live-vs-test divergence either way.
   */
  async freeze(playerId: string, categoryId: number, masteryAtEvent: number): Promise<void> {
    await this.repo.freezeAtGraduation(playerId, categoryId, masteryAtEvent);
    this.logger.log(`PLAYER_PROFICIENCY: player=${playerId} category=${categoryId} frozen=${masteryAtEvent}`);
  }

  private async handleGraduationCommitted(event: GraduationCommittedEvent): Promise<void> {
    await this.freeze(event.playerId, event.categoryId, event.masteryAtEvent);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
