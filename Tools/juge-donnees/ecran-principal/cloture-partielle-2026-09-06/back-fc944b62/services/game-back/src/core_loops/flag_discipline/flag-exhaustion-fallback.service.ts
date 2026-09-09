// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C4 (NIGHTLY tick step 4 —
//             the exhaustion fallback: tokens=0 AND score ≥ urgency threshold → REAL spine exception
//             card, existing EffectTypes only, payload-tagged `source: 'FLAG_TOKEN_EXHAUSTION'`, dedup
//             interaction asserted both-ways).
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §1 D9 + §12
//             hazard 4 (dedup swallowing) + §9 (the BO `token-exhaustion-events` projection reads this
//             tag back later, C7 — no new table).
//             Decisions: §1.9 D9 (spine REUSE, zero union edits) + §12 hazard 4 (both directions
//             asserted, not bypassed).
//             Canon: docs/tech/05_player_core_loops/flag_discipline.md:94 — "Exception payload: 'Lt.
//             Yuri has urgent concern but exhausted credibility tokens. Concern: [description].'"
//             (rendered verbatim into `event_descriptor` — the existing `exception_queue` schema has NO
//             separate params column for this text field, unlike `routine_items.descriptor`/`flagged_
//             items.flag_reason`'s own `{key, params}` jsonb shape — every existing producer in `src/
//             exceptions/` already hardcodes its own fully-rendered English sentence the SAME way, D3
//             wall: this file touches ZERO existing `src/exceptions/` files).
//             — P3-B C4 — 2026-07-11
//
// `FlagExhaustionFallbackService` — turns a qualifying `ExhaustionFallbackCandidate` (D9, surfaced by
// `RoutineItemGenerationService.runGeneration`) into a REAL `exception_queue` card via the EXISTING
// `ExceptionsRepository.insert` seam (D3 wall: zero new EffectType, zero producer edits — this is a NEW
// caller of an EXISTING, unmodified method). Dedup (hazard 4, decisions §12): a lieutenant with ANY
// pending card (this fallback's own prior card, OR an unrelated producer's) suppresses a second — spine
// canon posture, accepted and asserted BOTH ways by the E2E floor (a fallback fires when clear; a
// fallback is silently deduped when a card is already pending). Cap-refusal (`insert` → `null`, D5):
// handled honestly — logged, never thrown, never retried; STRUCTURALLY this can never actually fire for
// a lieutenant-scoped card here (the dedup gate above already requires ZERO pending cards to reach
// `insert`, while the cap only refuses at >=20 pending — dedup always wins first for this scope), but the
// null-check stays as defense-in-depth against that invariant ever loosening.

import { Injectable, Logger } from '@nestjs/common';

import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { FlagDisciplineRepository } from './flag-discipline.repository';
import type { ExhaustionFallbackCandidate } from './routine-item-generation.service';
import type { RoutineGeneratorEnumTs } from '../../db/schema/flag_discipline';

/** The payload tag C7's BO `GET /v1/admin/flag-discipline/token-exhaustion-events` (D14 §9) queries
 *  fallback cards by — NOT part of the shared `CandidateActionView` type (jsonb columns are untyped at
 *  the DB layer; extra keys on a locally-typed object round-trip transparently, the SAME structural
 *  freedom `hasPendingForBuilding`'s `elem->'effect'->>'target_building_id'` jsonb-element inspection
 *  already relies on, `exceptions.repository.ts:241`). Query idiom for C7: `candidate_actions -> 0 ->>
 *  'source' = 'FLAG_TOKEN_EXHAUSTION'` (or scan every element the same way). */
export const FLAG_TOKEN_EXHAUSTION_SOURCE = 'FLAG_TOKEN_EXHAUSTION';

/** A fallback card's own candidate action — `CandidateActionView` + the source tag above. Locally typed
 *  HERE (not added to the shared `exceptions.projection.service.ts` interface) — zero touch to that
 *  file at all. */
interface TaggedCandidateActionView extends CandidateActionView {
  readonly source: typeof FLAG_TOKEN_EXHAUSTION_SOURCE;
}

/** The 2 candidate actions (D9: "existing EffectTypes only — ONE_TIME acknowledge + ESCALATE", the
 *  10-member union byte-untouched). Both actions stamp `effect` explicitly (unlike the heat-pressure
 *  card, which omits it) — dispatch itself works purely via the `method` the resolve caller supplies
 *  (`ExceptionsService.resolve`), but stamping `effect` documents the resolution intent on the payload
 *  itself, matching the raid/equipment-failure cards' own discipline for anything beyond the legacy
 *  Phase-14 pair. */
function buildFallbackActions(): TaggedCandidateActionView[] {
  return [
    {
      id: 'acknowledge',
      label: 'Acknowledge the exhaustion',
      label_i18n: { key: 'exception.flag_exhaustion.acknowledge.label', params: {} }, // TD-455
      projected_consequence: 'You note the lieutenant is out of tokens for this concern; no automatic action is taken.',
      projected_consequence_i18n: { key: 'exception.flag_exhaustion.acknowledge.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      source: FLAG_TOKEN_EXHAUSTION_SOURCE,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.flag_exhaustion.escalate.label', params: {} }, // TD-455
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.flag_exhaustion.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: FLAG_TOKEN_EXHAUSTION_SOURCE,
    },
  ];
}

/** Generator code → a deterministic, zero-invented-content human phrase (just a formatting transform of
 *  the existing closed enum — never new authored copy). i18n-proper rendering is forward TD (design §13
 *  "i18n F1 forward note") — this is the v1 honest placeholder, matching every OTHER exception producer's
 *  own hardcoded-English convention (`heat-pressure-exception-producer.service.ts`, `equipment-failure-
 *  card.service.ts` — neither renders an i18n key today either). */
function humanizeGenerator(generator: RoutineGeneratorEnumTs): string {
  return generator.toLowerCase().replace(/_/g, ' ');
}

export type FlagExhaustionFallbackOutcome = 'raised' | 'deduped' | 'cap_refused';

@Injectable()
export class FlagExhaustionFallbackService {
  private readonly logger = new Logger(FlagExhaustionFallbackService.name);

  constructor(
    private readonly exceptions: ExceptionsRepository,
    private readonly flagRepo: FlagDisciplineRepository,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * Raise the fallback card for ONE qualifying candidate, or report why not (D9 + hazard 4). Dedup-gated
   * via the EXISTING `hasPendingForLieutenant` (no new dedup helper needed — the design's own D9 seam
   * table names this exact method); cap-refusal handled honestly (see file header — structurally
   * unreachable for this lieutenant-scoped call site, but never assumed).
   */
  async raiseIfClear(
    playerId: string,
    candidate: ExhaustionFallbackCandidate,
    gameMinute: number,
  ): Promise<FlagExhaustionFallbackOutcome> {
    if (await this.exceptions.hasPendingForLieutenant(playerId, candidate.lieutenantId)) {
      // Hazard 4 (decisions §12, design §12): an unrelated (or a PRIOR fallback's own) pending card
      // suppresses this one — the spine's own 1-pending-per-lieutenant invariant, accepted, not bypassed.
      return 'deduped';
    }

    const lieutenantName = (await this.flagRepo.getLieutenantName(candidate.lieutenantId)) ?? 'the lieutenant';
    const concern = humanizeGenerator(candidate.generator);
    const actions = buildFallbackActions();

    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: candidate.lieutenantId,
      // Canon-verbatim template (flag_discipline.md:94), rendered with the real lieutenant name + a
      // deterministic humanized concern label (see file header for why this is a rendered sentence, not
      // a jsonb {key,params} pair — the existing `event_descriptor` column is plain text).
      event_descriptor: `Lt. ${lieutenantName} has urgent concern but exhausted credibility tokens. Concern: ${concern}.`,
      candidate_actions: actions,
      suggested_action: actions[0],
      // BO-only scalars (R2.2) — fixed literals, mirroring the heat-pressure (0.9/70/70) and equipment-
      // failure (0.9/85/85) producers' OWN hardcoded-severity convention (neither is a tunable — these
      // are per-producer disposition constants, not a live-ops balance knob). A token-exhaustion fallback
      // is deterministically "genuinely urgent" by construction (it already cleared BOTH the flag AND the
      // urgency thresholds) — scored alongside equipment-failure's own urgency tier.
      confidence: 0.9,
      severity: 80,
      priority: 80,
      resolution_status: 'pending',
    });

    if (!exceptionId) {
      // D5 cap-guard refusal — see file header: structurally unreachable here (dedup above already
      // requires zero pending cards, while the cap only refuses at >=20), but handled honestly regardless
      // of whether that invariant ever loosens. Never thrown, never retried.
      this.logger.warn(
        `raiseIfClear: cap-refused (D5) for player=${playerId} lieutenant=${candidate.lieutenantId} — ` +
          'unexpected given the dedup pre-check above; no card inserted, no event emitted.',
      );
      return 'cap_refused';
    }

    this.bus.emitFlagTokenExhaustion({
      type: 'flag_token_exhaustion',
      playerId,
      lieutenantId: candidate.lieutenantId,
      routineItemId: candidate.routineItemId,
      exceptionId,
      gameMinute,
    });
    return 'raised';
  }
}
