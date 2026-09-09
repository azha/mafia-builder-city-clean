// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (compute-at-open +
//             supersede/skip-carry + commit/skip endpoints)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8
//             (HighestLeverageCard lifecycle) + §1 D11.
//             Decisions: §1.11 D11 (persisted + provider registry + deterministic scoring) + §1.2 D2
//             ("decisions_made = resolve + governor + HL commit/skip").
//             — P3-A C6 — 2026-07-10
//
// `HlCardService` — the D11 orchestration:
//
//   `computeAndPersist(playerId, sessionId)` — called by `SessionService.open()` on the FRESH-open path
//   ONLY (a still-fresh idempotent-return open does NOT recompute — no new decision cycle has started).
//   Queries every registered provider, ranks with the PRODUCTION scorer (`hl-card-scorer.ts` — the SAME
//   function `hl_card.spec.ts` direct-imports), then:
//     - no candidates at all + no carried card → no-op (empty state, "no phantom row").
//     - no candidates at all + a carried card exists → the underlying issue is gone → `superseded`.
//     - a carried card exists AND the winner's IDENTITY (decisionTypeCode + targetRef) is UNCHANGED →
//       reactivate the SAME row (skip-carry, "same priority" — the impact/urgency/options are refreshed
//       to the freshly recomputed values, but `card_id` never changes).
//     - otherwise → supersede the old carried card (if any) + insert the new winner as `active`.
//
//   `commit(playerId, cardId)` — `POST /v1/session/hl-card/:id/commit`. Looks up the catalogue-
//   structural classification (`catalogueStructuralEntryFor`, `hl-card-types.ts`): a structural card
//   routes its `markCommitted` mutation THROUGH `StructuralDecisionGovernorService.commit` (consumes
//   the Loop 10 per-session budget, can 409 STRUCTURAL_CAP_EXHAUSTED, `gameplay_sessions.
//   {structural_commits,decisions_made}` +1 via the governor's OWN post-mutation write); an ADVISORY
//   card (every real v1 provider output) just marks committed + increments `decisions_made` directly
//   (D2's OWN "HL commit" counter site — no budget, no governor call, no 409 ever possible).
//
//   `skip(playerId, cardId)` — `POST /v1/session/hl-card/:id/skip`. NEVER touches the governor (skip is
//   never structural); marks `skipped` + increments `decisions_made` (D2's "HL skip" counter site).
//
// Ownership + status guards (mirrors the exceptions resolve / autonomy-report resolve 404/409
// convention): not found or not owned → 404 RESOURCE_NOT_FOUND; wrong status (already
// committed/superseded, or skip attempted on a non-`active` card) → 409 RESOURCE_STATE_CONFLICT.
//
// ★ MINOR-2 fold (C6-fix): `computeAndPersist` consumes `HlCardFaultInjector` before EACH provider
// call (TEST-ONLY, always a no-op unless a spec explicitly arms it) — the falsifiable proof that a
// provider failure degrades gracefully rather than corrupting the whole compute. The OUTER
// try/catch belt lives in `session.service.ts#open` (belt-and-braces, MINOR-2's other half); this
// method itself does NOT swallow errors — a thrown provider error propagates up to that caller.

import { Inject, Injectable, forwardRef } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { SessionService } from '../../session/session.service';
import { StructuralDecisionGovernorService } from './structural-decision-governor.service';
import { HlCardProviderRegistry } from './hl-card-provider.registry';
import { HlCardRepository } from './hl-card.repository';
import { HlCardFaultInjector } from './hl-card-fault-injector';
import { pickTopHlCandidate, rankHlCandidates, scoreHlCandidate } from './hl-card-scorer';
import { catalogueStructuralEntryFor, type HlCardCandidate, type HlCardProviderType, type DecisionOption } from './hl-card-types';
import {
  projectHlCard,
  decisionTypeLabelFor,
  type HighestLeverageCardProjection,
  type DecisionTypeCatalogueProvenance,
} from './hl-card-projection';
import type { HighestLeverageCardRow } from '../../db/schema/core_loops';

/**
 * ★ C8 BO diagnostic (design §10 "hl-card diagnostic ... full provider candidate list with raw scores"
 * — the P5 inversion, asserted present HERE and absent client-side). ONE ranked candidate — raw
 * impact/urgency/score, NEVER surfaced past this diagnostic (R2.2's mirror image: `projectHlCard`
 * above stays the ONLY player-facing mapper; this is the BO-only sibling).
 */
export interface HlCardDiagnosticCandidate {
  /** 1-based rank in the deterministic scorer's own order (`rankHlCandidates`, D13 — stable, no rng). */
  readonly rank: number;
  readonly providerType: HlCardProviderType;
  readonly decisionTypeCode: number;
  readonly decisionTypeKey: string;
  readonly decisionTypeCatalogue: DecisionTypeCatalogueProvenance;
  readonly impact: number;
  readonly urgency: number;
  readonly score: number;
  readonly targetRef: Record<string, unknown>;
  readonly options: readonly DecisionOption[];
}

/** The currently CARRIED card, RAW (BO-only — mirrors `HighestLeverageCardRow`'s own raw columns, never the bucket projection). */
export interface HlCardDiagnosticCarried {
  readonly cardId: string;
  readonly decisionTypeCode: number;
  readonly decisionTypeKey: string;
  readonly decisionTypeCatalogue: DecisionTypeCatalogueProvenance;
  readonly impactInternal: number;
  readonly urgencyInternal: number;
  readonly targetRef: Record<string, unknown>;
  readonly options: readonly DecisionOption[];
  readonly status: string;
  readonly surfacedAt: Date;
  readonly resolvedAt: Date | null;
}

export interface HlCardDiagnostic {
  readonly carried: HlCardDiagnosticCarried | null;
  readonly candidates: HlCardDiagnosticCandidate[];
}

@Injectable()
export class HlCardService {
  constructor(
    private readonly registry: HlCardProviderRegistry,
    private readonly repo: HlCardRepository,
    private readonly governor: StructuralDecisionGovernorService,
    private readonly faultInjector: HlCardFaultInjector,
    @Inject(forwardRef(() => SessionService)) private readonly sessions: SessionService,
  ) {}

  /** Compute-at-open (design §8). Called from `SessionService.open()`'s FRESH-open path only. */
  async computeAndPersist(playerId: string, sessionId: string): Promise<void> {
    const candidates: HlCardCandidate[] = [];
    for (const provider of this.registry.all()) {
      // MINOR-2 fold — TEST-ONLY fault injection (no-op unless a spec armed this exact provider via
      // `POST /v1/_test/core-loops/arm-hl-provider-failure`): proves `open()` degrades gracefully
      // instead of 500ing when a provider query throws.
      if (this.faultInjector.consumeIfArmed(provider.providerType)) {
        throw new Error(`[TEST-ONLY fault injection] ${provider.providerType} forced failure`);
      }
      candidates.push(...(await provider.getCandidates(playerId)));
    }
    const winner = pickTopHlCandidate(candidates);
    const carried = await this.repo.findCarried(playerId);

    if (!winner) {
      if (carried) await this.repo.markSuperseded(carried.card_id);
      return;
    }

    const sameIdentity =
      carried !== null &&
      carried.decision_type === winner.decisionTypeCode &&
      JSON.stringify(carried.target_ref) === JSON.stringify(winner.targetRef);

    if (sameIdentity) {
      await this.repo.reactivateCarried((carried as HighestLeverageCardRow).card_id, sessionId, winner);
      return;
    }

    if (carried) await this.repo.markSuperseded(carried.card_id);
    await this.repo.insertActive(playerId, sessionId, winner);
  }

  /**
   * P3-A C7 (design §9) — the session-open sequence's read of the player's currently CARRIED card
   * (active or skipped — the SAME top-1 model `findCarried` already reads for the compute-at-open
   * carry/supersede check above), R2.2-projected (bucket-only — the raw `impact_internal`/
   * `urgency_internal` floats never escape past `projectHlCard`). `null` when nothing is carried
   * (design §8's own empty state — "No structural decision required this session" — the payload
   * honestly carries `hl_card: null`, not a fabricated placeholder card).
   */
  async getCurrentCardProjection(playerId: string): Promise<HighestLeverageCardProjection | null> {
    const carried = await this.repo.findCarried(playerId);
    return carried ? projectHlCard(carried) : null;
  }

  /** `POST /v1/session/hl-card/:id/commit` (design §8). */
  async commit(playerId: string, cardId: string): Promise<{ committed: true; structural: boolean }> {
    const card = await this.requireActionable(playerId, cardId);
    const structuralEntry = catalogueStructuralEntryFor(card.decision_type);

    if (structuralEntry) {
      await this.governor.commit(
        playerId,
        structuralEntry.key,
        {
          before: { entity: 'hl_card', id: cardId, decision_type: card.decision_type },
          after: { entity: 'hl_card', id: cardId, decision_type: card.decision_type },
        },
        () => this.repo.markCommitted(cardId),
      );
    } else {
      await this.repo.markCommitted(cardId);
      await this.sessions.recordAdvisoryDecision(playerId);
    }

    return { committed: true, structural: structuralEntry !== undefined };
  }

  /**
   * ★ C8 BO diagnostic (design §10, `GET /v1/admin/players/:id/hl-card`): queries EVERY registered
   * provider FRESH — bypassing the persisted card entirely — alongside the currently CARRIED row (if
   * any), raw. THE P5 BO INVERSION: raw impact/urgency/score are exposed HERE ONLY; the player-facing
   * session-open payload (`projectHlCard`/`getCurrentCardProjection` above) NEVER carries them (R2.2).
   *
   * Deliberately does NOT consume `HlCardFaultInjector` (unlike `computeAndPersist`) — a read-only
   * diagnostic must never silently burn a spec's one-shot armed fault (would break C6's own test
   * isolation) nor mutate any state; this never writes to `highest_leverage_cards`.
   */
  async getDiagnostic(playerId: string): Promise<HlCardDiagnostic> {
    const candidates: HlCardCandidate[] = [];
    for (const provider of this.registry.all()) {
      candidates.push(...(await provider.getCandidates(playerId)));
    }
    const ranked = rankHlCandidates(candidates);
    const carried = await this.repo.findCarried(playerId);

    return {
      carried: carried ? this.projectCarriedForDiagnostic(carried) : null,
      candidates: ranked.map((c, i) => {
        const label = decisionTypeLabelFor(c.decisionTypeCode);
        return {
          rank: i + 1,
          providerType: c.providerType,
          decisionTypeCode: c.decisionTypeCode,
          decisionTypeKey: label.key,
          decisionTypeCatalogue: label.catalogue,
          impact: c.impact,
          urgency: c.urgency,
          score: scoreHlCandidate(c),
          targetRef: c.targetRef,
          options: c.options,
        };
      }),
    };
  }

  /** RAW projection of the currently carried row for the BO diagnostic (C8) — mirrors `projectHlCard`'s shape, minus the banding. */
  private projectCarriedForDiagnostic(row: HighestLeverageCardRow): HlCardDiagnosticCarried {
    const label = decisionTypeLabelFor(row.decision_type);
    return {
      cardId: row.card_id,
      decisionTypeCode: row.decision_type,
      decisionTypeKey: label.key,
      decisionTypeCatalogue: label.catalogue,
      impactInternal: row.impact_internal,
      urgencyInternal: row.urgency_internal,
      targetRef: row.target_ref as Record<string, unknown>,
      options: (row.options as DecisionOption[]) ?? [],
      status: row.status,
      surfacedAt: row.surfaced_at,
      resolvedAt: row.resolved_at,
    };
  }

  /** `POST /v1/session/hl-card/:id/skip` (design §8 — carry semantics, `HlCardRepository#markSkipped`). */
  async skip(playerId: string, cardId: string): Promise<{ skipped: true }> {
    const card = await this.repo.findOwned(playerId, cardId);
    if (!card) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such HighestLeverageCard for this player: ${cardId}.` });
    }
    if (card.status !== 'active') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `HighestLeverageCard ${cardId} is '${card.status}', not 'active' — cannot skip.` });
    }
    await this.repo.markSkipped(cardId);
    await this.sessions.recordAdvisoryDecision(playerId);
    return { skipped: true };
  }

  /** 404 (not found/owned) / 409 (already terminal) guard shared by `commit` (active OR skipped —
   *  a carried, previously-skipped card is still directly committable, design §8's own carry semantics). */
  private async requireActionable(playerId: string, cardId: string): Promise<HighestLeverageCardRow> {
    const card = await this.repo.findOwned(playerId, cardId);
    if (!card) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such HighestLeverageCard for this player: ${cardId}.` });
    }
    if (card.status !== 'active' && card.status !== 'skipped') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `HighestLeverageCard ${cardId} is already '${card.status}'.` });
    }
    return card;
  }
}
