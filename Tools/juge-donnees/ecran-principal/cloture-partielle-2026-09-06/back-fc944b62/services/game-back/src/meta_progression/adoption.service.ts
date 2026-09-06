// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C5 ("AdoptionService per
//             design §9: governor-routed, the #27 compensation shape (validate incl. predicates
//             re-derived + affordability re-derived + regressed-card 422 → atomic card claim winner
//             gate → capability_adoptions INSERT → compensation revert on post-gate failure) →
//             post-commit CapabilityAdoptedEvent; the C4 recompute subscriber goes live on the event
//             (no-op-by-value for vocab tiers — asserted, wired)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §9 (Adoption, D7)
//             + §0(c) ("Adoption is a GATE on free_units, never a spend").
//             Decisions: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-decisions.md #21
//             (regressed-card refusal, 422 PREDICATES_NO_LONGER_MET) + §4 #27 (winner-gate-first
//             compensation shape, MANDATORY, the P3-F precedent) + ★#2 (adoption is STRUCTURAL,
//             governor code 16).
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §10 (R12 — governor
//             `commit<T>` signature + the code-15 TASK_RECALL append template, mirrored exactly at
//             code 16).
//             Pattern (validate-then-mutate, winner-gate-first, compensate-on-failure, post-commit
//             event — THE reference implementation this chunk mirrors): `graduation.service.ts`
//             (`executeGraduation` — winner gate FIRST, a try/catch around every step after it,
//             compensation on ANY thrown failure, post-commit emit only on full success).
//             — P3-G C5 — 2026-07-20
//
// `AdoptionService.executeAdoption` — the `POST /v1/meta/horizon/adopt` `mutateFn`
// `HorizonAdoptionController#adopt` wraps in `governor.commit(playerId, CAPABILITY_ADOPT, ctx, mutateFn)`.
//
// Step order (design §9, the #27 shape — winner-gate-first, NOT validate→write→claim):
//   1. VALIDATE (server-re-derived, NEVER trusts the client): card exists + owned (404 otherwise);
//      predicates re-derived TRUE via the REAL C2 evaluator (422 `PREDICATES_NO_LONGER_MET` otherwise —
//      this IS the "regressed card" refusal, decisions #21: the card's OWN persisted `predicate_
//      regressed` flag is NEVER consulted here, only a FRESH re-evaluation, since that flag can itself be
//      stale between the last session-open and THIS adopt call); affordability re-derived TRUE via the
//      REAL C4 projection (422 `VALIDATION_FAILED` otherwise — design names no dedicated code for this
//      half, unlike the predicate refusal).
//   2. THE WINNER GATE — `PossibilityHorizonCardsRepository.claimForAdoption`, ONE atomic
//      SELECT-FOR-UPDATE+conditional-UPDATE transaction (see that method's own header for why this needs
//      the row-lock shape rather than `flipToDelegated`'s bare-WHERE — the 3-way prior-status
//      preservation the compensation step needs). `claimed:false` → 409 `RESOURCE_STATE_CONFLICT`
//      (already adopted, already dismissed, or a genuine race loss) WITHOUT ever reaching step 3.
//   3. `capability_adoptions` INSERT (append-only, `free_units_at_adoption` = the SAME value validated in
//      step 1 — never re-read here: design §0(c) "adoption is a gate, never a spend" means free_units
//      cannot have moved between validate and here on ANY success path — nothing this service does
//      touches the budget before this INSERT commits).
//   4. Any THROWN failure after the winner gate → `revertClaim` (compensating the card back to its EXACT
//      pre-claim status) + rethrow (the governor's OWN `compensateStructuralSlot` fires on top, wrapping
//      this whole call — see `structural-decision-governor.service.ts`).
//   5. Post-commit, full success ONLY: `CapabilityAdoptedEvent` (lights up the ALREADY-DORMANT C4
//      recompute subscriber — zero module edit, `budget-recompute.service.ts`'s own header). Vocab-tier
//      capabilities are a genuine no-op-by-value on `used` (D2's cost model sums ONLY over the
//      TaskCategory delegation states, never CapabilityCatalogue entries) — the recompute still fires
//      (wired, observable via the persisted column), it just recomputes the SAME truth.
//
// Hard-crash residual (the SAME class as P3-F #27's own accepted residual, design §9's own note): between
// the card claim COMMITTING and the adoptions INSERT COMMITTING, a process death can leave an `adopted`
// card with no adoption row — no THROWN failure path leaves this state (compensation covers every catch),
// only a genuine process crash mid-transaction-boundary; accepted, BO-visible (the forensic signature).

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApiError } from '../protocol/api-error';
import { CityEventBus, type CapabilityAdoptedEvent } from '../citysim/events/city-event-bus';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { capabilityCatalogueEntryForCode, type CapabilityCatalogueEntry, type CapabilityKey } from './capability-catalogue';
import { HorizonPredicateEvaluatorService } from './horizon-predicate-evaluator.service';
import { BudgetRecomputeService } from './budget-recompute.service';
import { PossibilityHorizonCardsRepository } from './possibility-horizon-cards.repository';
import { CapabilityAdoptionsRepository } from './capability-adoptions.repository';
import { AdoptionFaultInjector } from './adoption-fault-injector';

export interface AdoptionResult {
  readonly adopted: true;
  readonly card_id: string;
  readonly capability_id: number;
  readonly capability_key: CapabilityKey;
}

@Injectable()
export class AdoptionService {
  private readonly logger = new Logger(AdoptionService.name);

  // In-memory probe: every `CapabilityAdoptedEvent` fired this process (test-only — mirrors
  // `HorizonCardSurfacingService.surfacedEvents`'s own "no raw-bus-tap-in-tests" posture). Lets the
  // concurrency floor assert "no double event" directly, never used on any production path.
  private adoptedEvents: CapabilityAdoptedEvent[] = [];

  constructor(
    private readonly cardsRepo: PossibilityHorizonCardsRepository,
    private readonly adoptionsRepo: CapabilityAdoptionsRepository,
    private readonly evaluator: HorizonPredicateEvaluatorService,
    private readonly budgetRecompute: BudgetRecomputeService,
    private readonly lieutenantRepo: LieutenantRepository,
    private readonly faultInjector: AdoptionFaultInjector,
    private readonly bus: CityEventBus,
  ) {}

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `CapabilityAdoptedEvent` fired this process (test-probe — never used in production paths). */
  getAdoptedEvents(): readonly CapabilityAdoptedEvent[] {
    return this.adoptedEvents;
  }

  /** Clear the in-memory adopted-event probe (called by the test reset route). */
  clearAdoptedEvents(): void {
    this.adoptedEvents = [];
  }

  // ── the mutateFn ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/meta/horizon/adopt`'s `mutateFn` (design §9). `cardId` is player-owned, resolved to its
   * `capability_id` at validate — NEVER trusts a client-supplied capability id.
   */
  async executeAdoption(playerId: string, cardId: string): Promise<AdoptionResult> {
    const { entry, freeUnits } = await this.validateAdoptionEligible(playerId, cardId);

    // ★ THE WINNER GATE (see file header). A concurrent SAME-card adoption that already won, or a card
    // that has since been dismissed, leaves this a genuine 409 — NO adoptions INSERT, NO event, ever
    // runs for the loser.
    const claim = await this.cardsRepo.claimForAdoption(playerId, cardId);
    if (!claim.claimed) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `Horizon card ${cardId} is no longer adoptable (already adopted/dismissed, or a concurrent adoption won the race).`,
        payloadVars: { card_id: cardId },
      });
    }

    // ★ Fault-injector hook (post-claim — the request GENUINELY won the race above). Armed → substitute
    // an unowned UUID for JUST the INSERT's player_id (see AdoptionFaultInjector's own header). Unarmed
    // (the overwhelming common case) → a pure no-op, effective player id === playerId.
    const effectivePlayerIdForInsert = this.faultInjector.consumeIfArmed(playerId) ? randomUUID() : playerId;

    try {
      const gameTick = await this.lieutenantRepo.getCurrentGameMinute(playerId);
      await this.adoptionsRepo.insert({
        playerId: effectivePlayerIdForInsert,
        capabilityId: entry.code,
        cardId,
        freeUnitsAtAdoption: freeUnits,
        gameTick,
      });
    } catch (err) {
      // ★ Compensation (mirrors the governor's OWN compensateStructuralSlot): a failure AFTER the
      // winner gate must leave the card net-UNTOUCHED (back to its exact pre-claim status), never a
      // half-adopted row.
      await this.cardsRepo.revertClaim(playerId, cardId, claim.priorStatus);
      throw err;
    }

    const event: CapabilityAdoptedEvent = {
      type: 'capability_adopted',
      playerId,
      capabilityId: entry.code,
      cardId,
      freeUnitsAtAdoption: freeUnits,
      gameMinute: 0, // player-triggered HTTP — no scheduler ctx (the SAME convention every other governed site's emit uses).
    };
    this.bus.emitCapabilityAdopted(event);
    this.adoptedEvents.push(event);

    this.logger.log(
      `capability_adopted COMMITTED: player=${playerId} capability=${entry.code} card=${cardId} free_units_at_adoption=${freeUnits}`,
    );

    return { adopted: true, card_id: cardId, capability_id: entry.code, capability_key: entry.key };
  }

  /**
   * Design §9 step 1 — re-validate EVERYTHING server-side: card ownership, predicates re-derived TRUE
   * (decisions #21 — the regressed-card refusal), affordability re-derived TRUE. Returns the catalogue
   * entry + the `free_units` value observed AT THIS INSTANT (the design §3 snapshot for the adoptions
   * row — never re-read after this point on the success path, design §0(c) "a gate, never a spend").
   */
  private async validateAdoptionEligible(
    playerId: string,
    cardId: string,
  ): Promise<{ entry: CapabilityCatalogueEntry; freeUnits: number }> {
    const card = await this.cardsRepo.findOwnedCard(playerId, cardId);
    if (!card) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No horizon card ${cardId} for this player.` });
    }
    const entry = capabilityCatalogueEntryForCode(card.capability_id);

    // Predicates RE-DERIVED (never the card's own possibly-stale `predicate_regressed` flag) — the
    // evaluator iterates every LIVE entry; a card only ever exists for a LIVE capability (C3's own
    // surfacing invariant), so `evaluation` is always found in practice — the `!evaluation` branch is
    // defensive-only, never a real code path.
    const evaluations = await this.evaluator.evaluateForPlayer(playerId);
    const evaluation = evaluations.find((e) => e.capabilityCode === entry.code);
    if (!evaluation || !evaluation.allSatisfied) {
      throw new ApiError('PREDICATES_NO_LONGER_MET', {
        message: `Capability ${entry.key} no longer satisfies its predicates (decisions #21 — the org context that made it adoptable has since collapsed).`,
        payloadVars: { card_id: cardId, capability_key: entry.key },
      });
    }

    // Affordability RE-DERIVED (the SAME shared computeUsed the C4 projection uses — never a second cost
    // model). `>=` matches the horizon-feed `affordable` field's own parity (design §9 step 1's own
    // arithmetic — a card costing EXACTLY the player's current free_units is affordable).
    const { free_units: freeUnits } = await this.budgetRecompute.getProjection(playerId);
    const required = entry.freeUnitsRequired!; // LIVE rows always carry a non-null cost (D3 boot strict-check).
    if (freeUnits < required) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Capability ${entry.key} requires ${required} free units; player has ${freeUnits}.`,
        payloadVars: { card_id: cardId, capability_key: entry.key, required, free_units: freeUnits },
      });
    }

    return { entry, freeUnits };
  }
}
