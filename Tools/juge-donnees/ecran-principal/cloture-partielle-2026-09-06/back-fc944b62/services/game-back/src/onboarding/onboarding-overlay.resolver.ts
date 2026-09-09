// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 chunk C5 (D2/D3/D8/D9).
//             Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §11 NestJS —
//             backend jeu (:208 — "le serveur … évalue les triggers" ; :333 — but NOT
//             `TutorialOverlayService`, see that file's own header for the class-separation this
//             respects). §0.6 (3 trigger classes) + §0.7 (`:208`/`:333` read together = a PLACEMENT
//             constraint, not a prohibition).
//             — W1.1-b C5 — 2026-08-09 —
//
// `OnboardingOverlayResolver` — a class DISTINCT from `TutorialOverlayService` (design "LA FRONTIÈRE DE
// CLASSES"): the service persists and lit ("n'évalue rien", `:333`, respected to the letter); THIS class
// composes — it reads `TutorialOverlayService.getTutorialState()` (the persisted half: opt-out +
// already-shown ids) AND the upstream substrate for each catalogued `TutorialId`'s trigger, and derives
// the ELIGIBLE set. It is an APPELANT of the service, never a method on it (design D2 closure).
//
// Éligible = *dans le catalogue fermé* ∧ *déclencheur satisfait* ∧ *pas dans `shown_tutorial_ids`* ∧
// *`opt_out = false`* — the exact conjunction of `screen_c8:208`. `resolveEligibleOverlays` short-
// circuits the WHOLE set to `[]` the moment opt-out is true (design falsifiable 5 — opt-out is a
// PLAYER-level predicate that dominates every trigger, never evaluated per-id).
//
// `triggerSatisfied` is EXHAUSTIVE over `TutorialId` WITHOUT a `default` case (D3 + its precondition
// I2, mirrors `tutorial-id-catalogue.ts`'s own `satisfies Record<TutorialId,…>` guard AND the house
// `progressBandForMasteryBucket`-style exhaustive-switch-no-default idiom, `meta_progression/mastery-
// bucket.ts:67-77`) — any additional `TutorialId` union member with no matching `case` here is a
// TypeScript compile error, never a silently-`undefined` eligibility. `TUTORIAL_ID_CATALOGUE[id].eligible`
// is consulted FIRST for every id (C3's own documented intent for that field, `tutorial-id-catalogue.ts`'s
// header: "NOT consumed by [C3] … it exists so the non-eligibility motif is written in code NOW") — an
// id catalogued `eligible: false` (`tutorial.vacancy`, `tutorial.audit_pin_intro`) never reaches its own
// `case` branch's real logic; its motif is `TUTORIAL_ID_CATALOGUE[id].ineligibleReason`, already written
// at C3/C1.
//
// D8-1 (design §1) — NO snapshot, ANYWHERE in this class: every call to `resolveEligibleOverlays` reads
// live state (the persisted composite + the upstream substrates below) — nothing is cached at signup
// or at construction. A resolved exception, a fresh graduation, or a funnel-step advance are ALL visible
// on the very NEXT call, without any session re-open (the pilot/city-global epoch keeps advancing
// underneath a player's open session, design §0.5 — a frozen-at-signup set would go stale mid-session).
//
// D9 (design §1) — this class is NEVER injected into `SessionModule`/`session-open-sequence.service.ts`.
// Served EXCLUSIVELY by `TutorialOverlayController#getState` (`GET /v1/ui/tutorial-state`), hors chemin
// critique cold-open. `session.module.ts` does not know this class exists — see that file's own header.
//
// W1.1-c C1 (docs/superpowers/specs/2026-08-09-w1.1c-disclosure-design.md §4 chunk C1, §0.2/§5) — the
// SIX new branches read a per-player SESSION ORDINAL (`COUNT(gameplay_sessions)`, never a calendar
// day — the city-global epoch keeps advancing under an idle player, design §0.3/D1). ⛔ Read ONCE per
// `resolveEligibleOverlays` call, BEFORE the loop, and PASSED IN to every `triggerSatisfied` call —
// NEVER re-queried per ordinal-gated branch (design §5 "N+1 sériel": 4 branches gated on the ordinal
// would otherwise mean 4 redundant `COUNT`s on the SAME request). The ordinal itself is NEVER exposed
// (R2.2 — it is a server ordering input, not player-facing data; the client observes it only through
// WHICH id is proposed).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { exceptionQueueRow } from '../db/schema/queues_exceptions_cuestack';
import { graduationEvent } from '../db/schema/delegation_ratchet';
import { compressionEvent } from '../db/schema/demolition_compression';
import { gameplaySessionRow } from '../db/schema/sessions_and_audit';
import { flaggedItemRow } from '../db/schema/flag_discipline';
import { TutorialOverlayService } from './tutorial-overlay.service';
import { OnboardingFunnelRepository } from './onboarding-funnel.repository';
import { ONBOARDING_PRESEED_SOURCE } from './onboarding-grant.service';
import { TUTORIAL_ID_CATALOGUE, type TutorialId } from './tutorial-id-catalogue';
import { onboardingTunables } from './onboarding-tunables';
// W1.1-c C1 (design §4 C1, rank 5/D6) — REUSE, never a duplicated formula: the SAME 4-LIVE-category
// `deriveMasteryBucket` conjunction `predicate-evaluators.ts#countEligibleCategories` (:131-140)
// already runs for `MASTERY_ELIGIBLE_MIN`. That function is module-private there and its caller needs
// the FULL `PredicateEvalContext` bundle (progressionRepo/lieutenantRepo this class has no reason to
// hold) — so this file re-derives the SAME conjunction locally rather than construct that bundle just
// to borrow one line. `deriveMasteryBucket` itself (the anti-duplication-checked import, design §4 C5)
// and `TASK_CATEGORY_CATALOGUE`/`metaProgressionTunables.masteryRetirementThreshold` ARE reused, never
// re-typed.
import { MasteryScoreRepository } from '../meta_progression/mastery-score.repository';
import { TASK_CATEGORY_CATALOGUE } from '../meta_progression/task-category-catalogue';
import { deriveMasteryBucket } from '../meta_progression/mastery-bucket';
import { metaProgressionTunables } from '../meta_progression/meta-progression-tunables';

/** The resolver's OWN return type (design D2 closure) — NEVER grafted onto `TutorialStateComposite`
 *  (`screen_c8:334`'s exact 2-field shape, untouched by this file). R2.2: a bare array of closed enum
 *  members, nothing scalar. */
export interface EligibleOverlaySet {
  readonly eligible_tutorial_ids: readonly TutorialId[];
}

@Injectable()
export class OnboardingOverlayResolver {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tutorialOverlay: TutorialOverlayService,
    private readonly funnelRepo: OnboardingFunnelRepository,
    // W1.1-c C1 — rank 5/D6's state-predicate reader (re-provided directly in OnboardingUiModule,
    // mirroring OnboardingFunnelRepository's own "@Inject(DB) only, trivially cycle-safe" convention,
    // that file's own header).
    private readonly masteryScoreRepo: MasteryScoreRepository,
  ) {}

  /**
   * The composition (design §4 C5, conjunction `screen_c8:208`). Reads the persisted composite ONCE
   * (opt-out short-circuits immediately — a player who opted out never pays for ANY trigger query, and
   * the falsifiable "opt-out ⇒ empty set" holds independently of what the queue/milestones look like);
   * otherwise walks the closed catalogue, skipping already-`shown` ids before ever touching a trigger
   * query (the PK-backed guarantee that a shown id NEVER returns, design falsifiable 2).
   */
  async resolveEligibleOverlays(playerId: string): Promise<EligibleOverlaySet> {
    const { tutorials_opt_out, shown_tutorial_ids } = await this.tutorialOverlay.getTutorialState(playerId);
    if (tutorials_opt_out) {
      return { eligible_tutorial_ids: [] };
    }

    // W1.1-c C1 — read ONCE per request, ahead of the loop (design §5 "N+1 sériel" — see file header).
    const sessionOrdinal = await this.getSessionOrdinal(playerId);

    const alreadyShown = new Set(shown_tutorial_ids);
    const eligible: TutorialId[] = [];
    for (const id of Object.keys(TUTORIAL_ID_CATALOGUE) as TutorialId[]) {
      if (alreadyShown.has(id)) continue;
      if (await this.triggerSatisfied(id, playerId, sessionOrdinal)) {
        eligible.push(id);
      }
    }
    return { eligible_tutorial_ids: eligible };
  }

  /** EXHAUSTIVE over `TutorialId`, NO `default` (D3 + I2) — see file header. `sessionOrdinal` is the
   *  caller's ONE read for this request (design §5) — a branch that needs it consumes the parameter,
   *  it never queries its own. */
  private async triggerSatisfied(id: TutorialId, playerId: string, sessionOrdinal: number): Promise<boolean> {
    if (!TUTORIAL_ID_CATALOGUE[id].eligible) {
      // Catalogued but permanently inert (`tutorial.vacancy`, `tutorial.audit_pin_intro` — no measured
      // trigger substrate / a CLOSED zero-writer proof, motif written at
      // `TUTORIAL_ID_CATALOGUE[id].ineligibleReason`, C3/C1). Never silent.
      return false;
    }
    switch (id) {
      case 'tutorial.exception_card.onboarding_preseed':
        return this.hasPreseedCard(playerId);
      case 'tutorial.graduation':
        return this.hasGraduationEvent(playerId);
      case 'tutorial.compression_week':
        return this.hasCompressionEvent(playerId);
      case 'tutorial.queue_runs_dry':
        return this.isInQuietState(playerId);
      case 'tutorial.vacancy':
        // Unreachable in practice — the `eligible === false` guard above already returned. Kept as its
        // OWN case so the switch stays exhaustive over the FULL `TutorialId` union (never a fallthrough
        // that would silently swallow a real id sharing this branch by accident).
        return false;
      // ── W1.1-c C1 — the remaining 6 `ProgressiveDisclosureSchedule` slots (design §4 C1/§0.6) ──────
      case 'tutorial.cue_stack_intro':
        // Rank 1/D2 — R-A: `sessionOrdinal` ALONE, no other conjoint (design §0.6 row 1).
        return sessionOrdinal >= onboardingTunables.cueStackIntroDay;
      case 'tutorial.daily_review_intro':
        // Rank 2/D3 — R-B: `sessionOrdinal` AND a real pending flag (design §0.6 row 2, §0.15 — the
        // welcome grant alone never satisfies the 2nd conjoint; D5 makes this SKIPPED, never blocking).
        return sessionOrdinal >= onboardingTunables.dailyReviewIntroDay && (await this.hasPendingFlaggedItem(playerId));
      case 'tutorial.city_map_heat_intro':
        // Rank 3/D4 — R-A: `sessionOrdinal` ALONE, no other conjoint (design §0.6 row 3).
        return sessionOrdinal >= onboardingTunables.cityMapHeatIntroDay;
      case 'tutorial.audit_pin_intro':
        // Rank 4/D5 — INERT (D7/D11). Unreachable in practice, exactly like `tutorial.vacancy` above:
        // the `eligible === false` guard already returned. An explicit `return false`, never a
        // fallthrough — kept as its OWN case for the SAME exhaustiveness reason `tutorial.vacancy` is.
        return false;
      case 'tutorial.graduation_eligibility_intro':
        // Rank 5/D6 — R-B, STATE-PREDICATE, NEVER the ordinal (canon: "targets, not gates" — design
        // §0.6 row 5). `sessionOrdinal` is deliberately unused on this branch.
        return this.hasEligibleGraduationCandidate(playerId);
      case 'tutorial.possibility_horizon_intro':
        // Rank 6/D7 — R-B, event-based: the EXACT SAME query `tutorial.graduation`'s own case already
        // runs (design §0.6 row 6 — "requête déjà écrite par `hasGraduationEvent`"). REUSE, never a
        // duplicated formula. `sessionOrdinal` is deliberately unused on this branch.
        return this.hasGraduationEvent(playerId);
      // ⛔ NO default — any additional `TutorialId` catalogue member with no branch here is a TS
      // compile error.
    }
  }

  /**
   * `EXCEPTION_TYPE_FIRST_SEEN` for the ONE closed-form id this class admits (design §9.2/I2 — see
   * `implementation-notes.md` for the measurement that `event_descriptor` is NOT a stable, parsable
   * category-key domain across producers, so no OTHER `exception_card.*` id is derivable). Mirrors the
   * `onboarding_preseed_unique_idx` predicate EXACTLY (`queues_exceptions_cuestack.ts:80-82`) — NO
   * `resolution_status` filter, since the index itself has none: the card's EXISTENCE (ever granted),
   * not its current resolution state, is the "type first seen" fact. `ONBOARDING_PRESEED_SOURCE`
   * (`onboarding-grant.service.ts:145`) is the SAME literal the unique index's own predicate encodes —
   * never re-typed.
   */
  private async hasPreseedCard(playerId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}
      WHERE player_id = ${playerId}::uuid
        AND (candidate_actions -> 0 ->> 'source') = ${ONBOARDING_PRESEED_SOURCE}
      LIMIT 1
    `);
    const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * `MILESTONE_FIRST_REACHED` for `tutorial.graduation` (design §0.6 — substrate MEASURED present).
   * ANY `GRADUATION`-kind row EVER, for this player — `graduation_events` is append-only (D13,
   * `delegation_ratchet.ts`'s own header), so this stays a PERMANENT "milestone reached" fact even
   * across later RECALL/re-graduation cycles on other categories. Mirrors `GraduationEventsRepository
   * .hasRecallEvent`'s exact query shape (`event_kind = 'RECALL'` there, `'GRADUATION'` here) — never a
   * duplicated formula, only the literal changes.
   */
  private async hasGraduationEvent(playerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ one: sql<number>`1` })
      .from(graduationEvent)
      .where(and(eq(graduationEvent.player_id, playerId), eq(graduationEvent.event_kind, 'GRADUATION')))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * `MILESTONE_FIRST_REACHED` for `tutorial.compression_week` (design §0.6 — substrate MEASURED
   * present). ANY `compression_events` row EVER, for this player — deliberately NOT
   * `player_progression_state.compression_week_state` (a resettable 3-value phase marker:
   * `compression-finalize.repository.ts:118` SETs it back to `'none'` when a cycle finalizes, so
   * reading it directly would make a player's SECOND compression week look like their first). The
   * per-cycle ledger row (`compression_events`, one row per fired cycle, never deleted) is the
   * permanent "has this player EVER been through a compression week" fact — the `compression-week
   * .repository.ts`'s own `applyStressIncrement` is the ONLY writer, one row per `'none'→'warning'`
   * transition.
   */
  private async hasCompressionEvent(playerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ one: sql<number>`1` })
      .from(compressionEvent)
      .where(eq(compressionEvent.player_id, playerId))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * The event-based trigger for `tutorial.queue_runs_dry` (design mandate §"un écart réel entre C3 et
   * C5" — a joueur en `QUIET_STATE` rend l'overlay éligible). A plain CURRENT-state read (not an
   * append-only ledger, unlike the two milestones above): `onboarding_funnel_step` genuinely reflects
   * "is the player in QUIET_STATE RIGHT NOW", which is exactly the trigger condition
   * (`onboarding-funnel.repository.ts:119`'s own guarded writer). Once shown, the `shown_tutorial_ids`
   * filter in `resolveEligibleOverlays` keeps it from ever re-entering the set even though the funnel
   * step itself can stay at `QUIET_STATE` indefinitely server-side (D6 — no server writer ever advances
   * PAST it, `EXPLORE` is client-only).
   */
  private async isInQuietState(playerId: string): Promise<boolean> {
    const state = await this.funnelRepo.getCurrentState(playerId);
    return state.funnelStep === 'QUIET_STATE';
  }

  /**
   * W1.1-c C1 — the per-player SESSION ORDINAL (design D1/§0.2): `COUNT(*)` over the player's own
   * `gameplay_sessions` partition, DERIVED, never stored. Monotone (a `close`+`open` pair or a
   * stale-session `open` are the ONLY two ways it advances, `session.repository.ts` — a plain re-`open`
   * within the freshness window inserts nothing). Read ONCE by the caller (`resolveEligibleOverlays`,
   * design §5) — this method itself does not cache, so calling it twice would genuinely double-query;
   * the discipline lives at the call site.
   */
  private async getSessionOrdinal(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(gameplaySessionRow)
      .where(eq(gameplaySessionRow.player_id, playerId));
    return Number(rows[0]?.n ?? 0);
  }

  /**
   * The 2nd conjoint of `tutorial.daily_review_intro` (rank 2/D3, design §0.6 row 2, R-B): ANY
   * `flagged_items` row currently `resolution='pending'` for this player — the SAME "my pending flags"
   * predicate the Daily Review surface itself reads (`flagged_items_player_resolution_idx`,
   * `flag_discipline.ts`'s own hot-path index comment). A player who never gets flagged (the welcome
   * grant's own COOK archetype, design §0.15) simply never satisfies this — the slot is SKIPPED, never
   * blocking (D5), and reclaimed at its own rank the session a real flag lands.
   */
  private async hasPendingFlaggedItem(playerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ one: sql<number>`1` })
      .from(flaggedItemRow)
      .where(and(eq(flaggedItemRow.player_id, playerId), eq(flaggedItemRow.resolution, 'pending')))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * The STATE-PREDICATE trigger for `tutorial.graduation_eligibility_intro` (rank 5/D6, design §0.6
   * row 5): ∃ a LIVE `TASK_CATEGORY_CATALOGUE` category where `delegation_state='SELF'` AND
   * `deriveMasteryBucket(rawScore, threshold) === 'ELIGIBLE'` — the SAME conjunction
   * `predicate-evaluators.ts#countEligibleCategories` (:131-140) already runs for
   * `MASTERY_ELIGIBLE_MIN`, "at least one" instead of "at least N" (file header explains why this is a
   * local re-derivation, not a cross-module call). The `?? 'SELF'` / `?? 0` line-absent convention is
   * REUSED verbatim — a missing `mastery_score` row defaults to the honest zero-state, never a filtered-
   * out gap (`MetaProgressionProjectionService.projectRow`'s own convention). `deriveMasteryBucket` is
   * IMPORTED, never re-implemented (R2.3 anti-duplication) — and no mastery threshold is ever a literal
   * here: `metaProgressionTunables.masteryRetirementThreshold` is the ONLY source.
   */
  private async hasEligibleGraduationCandidate(playerId: string): Promise<boolean> {
    const threshold = metaProgressionTunables.masteryRetirementThreshold;
    const liveCategories = TASK_CATEGORY_CATALOGUE.filter((entry) => entry.live);
    const rows = await Promise.all(liveCategories.map((category) => this.masteryScoreRepo.getRow(playerId, category.code)));
    return rows.some((row) => {
      const delegationState = row?.delegation_state ?? 'SELF';
      const rawScore = row?.mastery_score ?? 0;
      return delegationState === 'SELF' && deriveMasteryBucket(rawScore, threshold) === 'ELIGIBLE';
    });
  }
}
