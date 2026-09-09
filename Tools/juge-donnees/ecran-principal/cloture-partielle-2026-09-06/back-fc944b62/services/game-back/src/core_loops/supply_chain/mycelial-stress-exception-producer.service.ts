// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C4 (`MycelialStressException
//             Producer` — streak >= 2, dedup 1-pending/leg, existing EffectTypes, producer convention)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.5 ("Exception
//             « persistent stress » : au NIGHTLY/25, un leg stressed à 2 évals NIGHTLY consécutives
//             (stress_streak persisté) → MycelialStressExceptionProducer") + §9 (3 producers table —
//             trigger/dedup/actions) + D3 (zero `src/exceptions/` edits, D9 spine REUSE reconducted from
//             P3-B's `FlagExhaustionFallbackService`).
//             Decisions: §1.3 D3 (3 producers = NEW callers of the EXISTING `insert`, zero EffectType) +
//             DD-P2 (no new event bus — the 3 producers are called IN-LINE by the paths that hold the
//             transition, never a bus subscriber).
//             Pattern: `flag-exhaustion-fallback.service.ts` (the SAME "NEW caller of an EXISTING,
//             unmodified `ExceptionsRepository.insert`, zero `src/exceptions/` edits, source tag locally
//             defined" shape) + `exceptions.repository.ts#hasPendingForBuilding`'s own jsonb
//             `candidate_actions[].effect.target_building_id` dedup-scan idiom, REPLICATED here (not
//             reused directly — a leg is not a building, `hasPendingForBuilding` has no leg-scoped
//             sibling and D3 forbids adding one to `exceptions.repository.ts` itself) tagging `leg_id`
//             instead.
//             — P3-C C4 — 2026-07-12

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';

/** The jsonb `source` tag this producer's candidate actions carry (mirrors `FLAG_TOKEN_EXHAUSTION_SOURCE`,
 *  flag-exhaustion-fallback.service.ts:46) — a BO-diagnostic marker, never rendered to the player. */
export const MYCELIAL_PERSISTENT_STRESS_SOURCE = 'MYCELIAL_PERSISTENT_STRESS';

/** A stress card's own candidate action — `CandidateActionView` + the source tag + the `leg_id` this
 *  producer's OWN dedup scan below queries back (the SAME structural freedom `hasPendingForBuilding`'s
 *  `target_building_id` jsonb-element inspection already relies on). Locally typed HERE (not added to
 *  the shared `exceptions.projection.service.ts` interface) — zero touch to that file. */
interface TaggedCandidateActionView extends CandidateActionView {
  readonly source: typeof MYCELIAL_PERSISTENT_STRESS_SOURCE;
  readonly leg_id: string;
}

function buildStressActions(legId: string): TaggedCandidateActionView[] {
  return [
    {
      id: 'acknowledge',
      label: 'Acknowledge the stress',
      label_i18n: { key: 'exception.mycelial_stress.acknowledge.label', params: {} }, // TD-455
      projected_consequence: 'You note the leg is under persistent strain; no automatic action is taken.',
      projected_consequence_i18n: { key: 'exception.mycelial_stress.acknowledge.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      source: MYCELIAL_PERSISTENT_STRESS_SOURCE,
      leg_id: legId,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.mycelial_stress.escalate.label', params: {} }, // TD-455
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.mycelial_stress.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: MYCELIAL_PERSISTENT_STRESS_SOURCE,
      leg_id: legId,
    },
  ];
}

export type MycelialStressExceptionOutcome = 'raised' | 'deduped' | 'cap_refused';

@Injectable()
export class MycelialStressExceptionProducer {
  private readonly logger = new Logger(MycelialStressExceptionProducer.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // D3 wall: a duplicate-provided instance (SupplyChainModule provides this class directly — NOT via
    // importing ExceptionsModule, the SAME "avoid the ExceptionsModule → LieutenantModule →
    // DistributionModule → SupplyChainModule cycle" reasoning `DistributionModule` documents for its own
    // duplicate-provided `RaidExceptionRepository`). Stateless (DB-only ctor) — a second instance is
    // harmless, the exact precedent `SessionModule` also follows for this SAME class.
    private readonly exceptions: ExceptionsRepository,
  ) {}

  /**
   * `hasPendingForLeg` — the per-leg dedup gate (design §9: "dedup 1-pending/leg ... même forme jsonb
   * que target_building"). Replicates `hasPendingForBuilding`'s `jsonb_array_elements` EXISTS shape
   * (exceptions.repository.ts:~241) against THIS producer's own `leg_id` tag (not `target_building_id` —
   * a leg is not a building) — never edits that file, never adds a leg-scoped sibling to it (D3).
   */
  private async hasPendingForLeg(playerId: string, legId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'leg_id' = ${legId}
      LIMIT 1
    `);
    const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Raise the persistent-stress card for ONE leg whose `stress_streak` just reached >= 2 this NIGHTLY
   * eval (design §5.5), or report why not (dedup / cap-refuse — the SAME honest 3-outcome shape
   * `FlagExhaustionFallbackService.raiseIfClear` returns). Player-level card (`lieutenant_id: null` — a
   * leg belongs to no lieutenant, mirrors `heat-pressure-exception-producer.service.ts`'s own citywide
   * framing) so a SECOND, DIFFERENT stressed leg reaching streak>=2 the SAME night still raises its OWN
   * card (the dedup key is `leg_id`, not "any player-level card" — unlike `hasPendingPlayerLevelCard`,
   * which would incorrectly collapse every leg's stress into ONE citywide slot).
   */
  async raiseIfClear(
    playerId: string,
    leg: { legId: string; originBuildingId: string; destinationBuildingId: string },
  ): Promise<MycelialStressExceptionOutcome> {
    if (await this.hasPendingForLeg(playerId, leg.legId)) {
      return 'deduped';
    }

    const actions = buildStressActions(leg.legId);
    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: null,
      // Generic, qualitative — no raw debt_load scalar (R2.2) and no raw building UUID rendered as text
      // (this backend layer has no building display-name lookup available to this producer; the
      // building identity travels in the jsonb tag above, BO-diagnostic only).
      event_descriptor: 'One of your supply routes is under persistent mycelial stress and needs maintenance.',
      candidate_actions: actions,
      suggested_action: actions[0],
      // Fixed literals (not tunables) — mirrors every OTHER exception producer's own hardcoded-severity
      // convention (heat-pressure 0.9/70/70, equipment-failure 0.9/85/85, flag-exhaustion 0.9/80/80).
      // A persistent-stress card is deterministically "genuinely a concern" by construction (it already
      // cleared the 2-consecutive-NIGHTLY-eval bar) — scored alongside the flag-exhaustion tier.
      confidence: 0.9,
      severity: 80,
      priority: 80,
      resolution_status: 'pending',
    });

    if (!exceptionId) {
      // D5 cap-guard refusal — handled honestly (never thrown, never retried), the SAME defense-in-depth
      // posture FlagExhaustionFallbackService documents for its own structurally-unreachable case.
      this.logger.warn(
        `raiseIfClear: cap-refused (D5) for player=${playerId} leg=${leg.legId} — no card inserted, no event emitted.`,
      );
      return 'cap_refused';
    }
    return 'raised';
  }
}
