// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C6 ("BackpressureException
//             Producer (entrée critical, dedup hasPendingForBuilding REUSE, cap-refuse hérité)")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.2 ("Franchissement
//             ENTRANT de critical → BackpressureExceptionProducer") + §9 (3 producers table — trigger/
//             dedup/actions: "entrée en bucket critical", dedup `hasPendingForBuilding`, ONE_TIME
//             (acknowledge & trace) + ESCALATE) + D3 (zero `src/exceptions/` edits).
//             Decisions: §1.3 D3 (3 producers = NEW callers of the EXISTING `insert`, zero EffectType) +
//             DD-P2 (no new event bus — called IN-LINE by the tick that holds the transition).
//             Pattern: `equipment-failure-card.service.ts#raiseCardIfAbsent` — the ONE sibling producer
//             that ALREADY dedups via the REAL `hasPendingForBuilding` (exceptions.repository.ts:241, the
//             pinned line design §9/plan §C6 name), reused HERE VERBATIM (not replicated — unlike
//             `MycelialStressExceptionProducer`, which had to build its own `hasPendingForLeg` sibling
//             query because a leg is not a building and `hasPendingForBuilding` has no leg-scoped variant).
//             That query inspects `candidate_actions[].effect->>'target_building_id'` — so THIS producer's
//             own candidate actions carry `target_building_id` inside `effect` even though `ONE_TIME`/
//             `ESCALATE` are declared WITHOUT that field in `exceptions.projection.service.ts`'s
//             `ExceptionEffect` union (D3 forbids widening that union to add it). `BackpressureCandidate
//             ActionView` below narrows `effect` to a LOCAL, structurally-compatible shape (extra property
//             beyond the union member's own `{ type: 'ONE_TIME' }` — TS structural typing accepts a value
//             with MORE fields than a target type requires; this is NOT a fresh-object-literal excess-
//             property error because the value flows through this named interface, not a literal assigned
//             directly to `ExceptionEffect`) — the SAME "locally-typed extension, never touching
//             `exceptions.projection.service.ts`" shape `MycelialStressExceptionProducer`'s own
//             `TaggedCandidateActionView` establishes for `leg_id`, one property name over.
//             — P3-C C6 — 2026-07-12
//
// ★ C9 ⊥ FOLD (2026-07-13, BLOCKING fix): a top-level `source: 'BACKPRESSURE_CRITICAL'` tag was ADDED to
//   `actions[0]` below — mirrors `MYCELIAL_PERSISTENT_STRESS_SOURCE`/`ROUTE_COLLAPSE_SOURCE`'s own sibling
//   tag shape (`mycelial-stress-exception-producer.service.ts` / `route-collapse-exception-producer.
//   service.ts`). Root cause: `supply-chain-admin.controller.ts`'s `GET .../critical-events` originally
//   classified a card as `backpressure_critical` by the ABSENCE of a `source` tag PLUS the PRESENCE of
//   `effect.target_building_id` — a fallback that over-matched ANY OTHER game-wide producer's building-
//   targeted card with no source tag of its own (e.g. `raid-exception-producer.service.ts`'s REPAIR/BRIBE/
//   LAY_LOW actions ALSO carry `effect.target_building_id`, zero `source`). This tag closes that hole: the
//   critical-events query now matches on the 3 EXPLICIT source tags ONLY (no fallback), so a foreign card
//   with no `BACKPRESSURE_CRITICAL`/`MYCELIAL_PERSISTENT_STRESS`/`ROUTE_COLLAPSE` tag can never appear
//   there, game-wide-safe (not merely "verified against the 3 producer files this chunk added" — the
//   over-scoped claim the pre-fix comment made). `hasPendingForBuilding`'s OWN dedup scan is UNAFFECTED —
//   it only reads `effect.target_building_id`, never `source` — so this is a strictly additive sibling
//   field, not a semantic change to this producer's dedup/insert behavior.
//
// `BackpressureExceptionProducer` — raises the Loop 3 "critical backpressure" card for ONE building whose
// `backpressure_index` bucket is `critical` THIS tick (design §6.2's "Franchissement ENTRANT" — realized,
// per the established codebase convention, as "fires every tick the building reads critical; the
// `hasPendingForBuilding` dedup is what actually collapses repeats into a single pending card" — the SAME
// `FlagExhaustionFallbackService`-derived "fires every qualifying occurrence, dedup collapses it" shape
// `MycelialStressExceptionProducer`'s own header documents for its sibling C4 producer. Practically: the
// FIRST tick a building reads critical raises a card (nothing was pending); every SUBSEQUENT tick it is
// STILL critical, the SAME pending card blocks a second insert (`hasPendingForBuilding` -> true ->
// `deduped`) — "once per crossing" in effect. If the player resolves that card (POST /v1/exceptions/:id/
// resolve, the existing generic verb — ONE_TIME/ESCALATE effects are ALREADY wired in the effect
// registry, D3) while the building is still critical, or after it relieves and later re-crosses into
// critical, `hasPendingForBuilding` now returns false and a NEW, distinct card is correctly raised — the
// plan's own "re-entrée après relief → nouvelle card OK" falsifiable.).
//
// ★ JUDGMENT CALL (flagged for reviewer): the design names the trigger as a bucket-CROSSING ("Franchissement
// ENTRANT") rather than "currently critical, dedup collapses" — this file implements the latter (matching
// the established sibling convention exactly) because it makes "relief then re-cross → NEW card" correct
// WITHOUT needing to snapshot a per-building pre-tick bucket inside `BackpressureUpdateService` (no prior-
// state plumbing exists there today — `accrueSources`/`applyPropagation` return only POST-write values).
// The two readings are observationally identical as long as the FIRST card raised for a crossing stays
// pending for the whole critical episode (the common case); they diverge only if the player resolves the
// card WHILE the building is still critical, in which case this implementation raises a fresh card the
// very next tick rather than waiting for an actual relief-then-recross — the SAME divergence
// `MycelialDecayTickService`'s header already documents and accepts for the C4 sibling.

import { Injectable, Logger } from '@nestjs/common';

import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';

/** The jsonb `source` tag this producer's candidate actions carry (mirrors `MYCELIAL_PERSISTENT_STRESS_
 *  SOURCE`/`ROUTE_COLLAPSE_SOURCE`) — a BO-diagnostic marker, never rendered to the player. Added at the
 *  C9 ⊥ fold (see file header) — the SOLE discriminator `GET /admin/supply-chain/critical-events` now
 *  requires; the pre-existing `effect.target_building_id`-presence fallback is REMOVED. */
export const BACKPRESSURE_CRITICAL_SOURCE = 'BACKPRESSURE_CRITICAL';

/** A backpressure card's own candidate action — `CandidateActionView` narrowed so `effect` ALWAYS carries
 *  `target_building_id` (the field `hasPendingForBuilding`'s jsonb scan reads back), even for the ONE_TIME/
 *  ESCALATE effect types that carry no such field in the shared, D3-frozen `ExceptionEffect` union — PLUS
 *  the top-level `source` tag (C9 ⊥ fold). */
interface BackpressureCandidateActionView extends CandidateActionView {
  readonly source: typeof BACKPRESSURE_CRITICAL_SOURCE;
  readonly effect: { type: 'ONE_TIME'; target_building_id: string } | { type: 'ESCALATE'; target_building_id: string };
}

function buildBackpressureActions(buildingId: string): BackpressureCandidateActionView[] {
  return [
    {
      id: 'acknowledge_and_trace',
      label: 'Acknowledge and trace the blockage',
      // TD-453 — `en` in string_table.ts is a BYTE-IDENTICAL copy of the `label` literal above.
      label_i18n: { key: 'exception.backpressure_critical.acknowledge_and_trace.label', params: {} },
      projected_consequence: 'You note the critical backpressure; use the trace tool to walk it back to its source.',
      projected_consequence_i18n: { key: 'exception.backpressure_critical.acknowledge_and_trace.consequence', params: {} },
      add_rule_dsl: null,
      source: BACKPRESSURE_CRITICAL_SOURCE,
      effect: { type: 'ONE_TIME', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.acknowledge_and_trace, // Lot 0 §1 D4 (C2).
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.backpressure_critical.escalate.label', params: {} }, // TD-453.
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.backpressure_critical.escalate.consequence', params: {} },
      add_rule_dsl: null,
      source: BACKPRESSURE_CRITICAL_SOURCE,
      effect: { type: 'ESCALATE', target_building_id: buildingId },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
    },
  ];
}

export type BackpressureExceptionOutcome = 'raised' | 'deduped' | 'cap_refused';

@Injectable()
export class BackpressureExceptionProducer {
  private readonly logger = new Logger(BackpressureExceptionProducer.name);

  constructor(
    // D3 wall: a duplicate-provided instance (SupplyChainModule provides this class directly, the SAME
    // cycle-avoidance reasoning `MycelialStressExceptionProducer`/`DistributionModule`'s own
    // `RaidExceptionRepository` precedent documents). Stateless (DB-only ctor) — a second instance is
    // harmless.
    private readonly exceptions: ExceptionsRepository,
  ) {}

  /**
   * Raise the critical-backpressure card for ONE building, or report why not (dedup / cap-refuse — the
   * SAME honest 3-outcome shape `MycelialStressExceptionProducer.raiseIfClear`/`FlagExhaustionFallback
   * Service.raiseIfClear` both return). Player-level card (`lieutenant_id: null` — a supply-chain node
   * belongs to no lieutenant, mirrors the sibling C4/C5 framing).
   */
  async raiseIfClear(playerId: string, buildingId: string): Promise<BackpressureExceptionOutcome> {
    // REUSE, byte-verbatim call (exceptions.repository.ts:241, D3 — never replicated, never edited).
    if (await this.exceptions.hasPendingForBuilding(playerId, buildingId)) {
      return 'deduped';
    }

    const actions = buildBackpressureActions(buildingId);
    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: null,
      // Generic, qualitative — no raw backpressure_index scalar (R2.2); the building identity travels in
      // the jsonb `effect.target_building_id` tag above, BO-diagnostic only (mirrors the C4 producer).
      event_descriptor: 'One of your supply-chain nodes has hit critical backpressure and needs attention.',
      // TD-453 — event_descriptor's i18n-safe sibling (D2); `en` = byte-identical copy above.
      event_descriptor_i18n: { key: 'exception.backpressure_critical.card.descriptor', params: {} },
      candidate_actions: actions,
      suggested_action: actions[0],
      // Fixed literals (not tunables) — mirrors every OTHER exception producer's own hardcoded-severity
      // convention (heat-pressure 0.9/70/70, equipment-failure 0.9/85/85, flag-exhaustion 0.9/80/80,
      // mycelial-persistent-stress 0.9/80/80). A critical-bucket crossing is deterministically "genuinely
      // a concern" by construction (it already crossed the tunable-resolved critical threshold).
      confidence: 0.9,
      severity: 80,
      priority: 80,
      resolution_status: 'pending',
    });

    if (!exceptionId) {
      // D5 cap-guard refusal — handled honestly (never thrown, never retried), the SAME defense-in-depth
      // posture every sibling producer documents for its own structurally-unreachable case.
      this.logger.warn(
        `raiseIfClear: cap-refused (D5) for player=${playerId} building=${buildingId} — no card inserted, no event emitted.`,
      );
      return 'cap_refused';
    }
    return 'raised';
  }
}
