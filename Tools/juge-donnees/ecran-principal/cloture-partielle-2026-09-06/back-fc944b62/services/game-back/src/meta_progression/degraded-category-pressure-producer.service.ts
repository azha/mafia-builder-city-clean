// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C9
//             (`DegradedCategoryPressureProducer` — "the ONE new additive producer (design D11/§10.4): on
//             `SessionOpenedEvent`, for recovering OR window-ACTIVE (player × category) rows, derive ≤
//             quota cards from the category's REAL current state (C0-finalized signal bindings), existing
//             EffectTypes, per-(player, category) dedup").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §10.4 ("Recovery
//             + degraded-emission behavior (D11)").
//             C0-reanchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §7 (ROUTE_ASSIGNMENT — the
//             ONLY LIVE category with a real, queryable "currently degraded" state on this base — a
//             `route.state='severed'` row, the SAME substrate `SeveredRouteHlCardProvider`/
//             `RouteCollapseExceptionProducer` already read) + R6/R7 (dedup surface — a NEW additive
//             mechanism, jsonb-keyed, never a `src/exceptions/` edit).
//             Pattern (REUSE verbatim — the P3-E new-producer precedent, seam §2 row 6): `friction-
//             threshold-exception-producer.service.ts` / `compression-residue-exception-producer.service.ts`
//             — a NEW producer file, duplicate-provided `ExceptionsRepository`, calling the EXISTING,
//             unmodified `insert()`; `compression-session-opened-subscriber.service.ts` — the
//             `SessionOpenedEvent` subscription shape (`OnApplicationBootstrap` + a PUBLIC method the bus
//             handler AND the test route both call, Lesson #3).
//             — P3-F C9 — 2026-07-19
//
// `DegradedCategoryPressureProducer` — on a REAL `SessionOpenedEvent`, for every (player × category) row
// currently RECOVERING (`player_proficiency.recovery_period_remaining > 0`) OR under an ACTIVE unmanaged
// window (`promotion_locks.unmanaged_window_state='ACTIVE'`), derives up to the category's per-session
// quota (`meta.recovery_pressure_cards_per_session` / `meta.unmanaged_window_pressure_cards_per_session` —
// the MAX of the two when a category is BOTH recovering and window-active, a ceiling never a target) of
// Exception cards FROM THE CATEGORY'S REAL CURRENT STATE — never a fabricated card (design §10.4: "a
// category whose real state offers no candidate emits NOTHING").
//
// ★ SCOPE (LOUD divergence, coder discretion within the plan's own envelope — flagged for the reviewer):
// this chunk wires the eligibility loop for ALL 4 LIVE categories (ROUTE_ASSIGNMENT/LIEUTENANT_HIRING/
// SUPPLY_SOURCING/HEAT_MANAGEMENT — `CATEGORY_STATE_PROVIDERS` below is keyed by ALL of them structurally)
// but ships a REAL current-state candidate provider for `ROUTE_ASSIGNMENT` ONLY (`route.state='severed'`,
// C0-reanchor §7 confirmed binding — the literal fixture the plan's OWN C9 falsifiable names: "a genuinely
// severed route on the player"). `LIEUTENANT_HIRING`/`SUPPLY_SOURCING`/`HEAT_MANAGEMENT` have NO registered
// provider — they honestly resolve ZERO candidates (never fabricated), mirroring this SAME lot's own
// established incremental-binding-closure convention (C0-reanchor §5.2/§5.3/§5.4 — SUPPLY_SOURCING's +1
// emitter, LIEUTENANT_HIRING's 2 signal gaps, and HEAT_MANAGEMENT's guard shape were ALL left open gaps
// closed at LATER chunks, never invented here). Design §10.4's OWN prose gives 3 illustrative examples
// ("a currently-severed route, the current heat pressure band, current stash blocking") but the plan's C9
// falsifiable list is entirely ROUTE_ASSIGNMENT-scoped; wiring HEAT_MANAGEMENT/SUPPLY_SOURCING's real-state
// reads would additionally require importing `HeatModule`/`ErlangStashModule` cross-domain — a heavier
// coupling this chunk's OWN proof obligations do not require. TD-routable at C11 if broader coverage is
// wanted.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { exceptionQueueRow } from '../db/schema/queues_exceptions_cuestack';
import { route } from '../db/schema/operational_chain';
import { CityEventBus, type SessionOpenedEvent } from '../citysim/events/city-event-bus';
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import type { CandidateActionView } from '../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../exceptions/method-by-action-id';
import { PlayerProficiencyRepository } from './player-proficiency.repository';
import { PromotionLocksRepository } from './promotion-locks.repository';
import { metaProgressionTunables } from './meta-progression-tunables';
import { TaskCategoryKey, taskCategoryCatalogueEntryFor } from './task-category-catalogue';

/** The jsonb `source` tag this producer's candidate actions carry (mirrors `HEAT_PRESSURE_SOURCE`/
 *  `FRICTION_THRESHOLD_SOURCE`) — a BO-diagnostic marker. Rides the "honest D9-wall boundary" every OTHER
 *  producer's `source` tag rides (P3-B C6, `flag_review_surface.spec.ts` test 10): the direct `GET
 *  /v1/exceptions/queue` KEEPS it (`ExceptionsProjectionService#projectCard` is a transparent round-trip,
 *  no strip); the session-open queue view relocates it OUT via `SessionOpenSequenceService.
 *  stripInternalSourceTag`. NOT stripped by a (removed) `ExceptionsProjectionService#stripSource` — that
 *  strip briefly existed (P3-F C2, `5fc7ed61`) and was reverted at the P3-F merge-gate for regressing the
 *  direct-GET side of the P3-B C6 contract; see `projectCard`'s own header for the full account. */
export const DEGRADED_CATEGORY_PRESSURE_SOURCE = 'DEGRADED_CATEGORY_PRESSURE';

/** A degraded-category-pressure card's own candidate action — `CandidateActionView` + the source tag +
 *  `pressure_key` (mirrors `CompressionResidueExceptionProducer`'s `problem_key` sibling field): the
 *  per-(category, item) dedup key (`"<categoryCode>:<itemRef>"`) BOTH the app-level pre-check AND the
 *  migration-0136 DB-enforced partial unique index read from `candidate_actions[0]`. */
interface DegradedCategoryPressureCandidateActionView extends CandidateActionView {
  readonly source: typeof DEGRADED_CATEGORY_PRESSURE_SOURCE;
  readonly pressure_key: string;
}

/** ONE real-state candidate — an item (e.g. a route id) whose CURRENT state genuinely warrants a pressure
 *  card for this category. `description` is player-facing text embedding the item's identity (design
 *  §10.4's own "e.g. a currently-severed route" framing — the card REFERENCES the real state, never an
 *  invented one). */
interface CategoryStateCandidate {
  readonly itemRef: string;
  readonly description: string;
}

/** Defensive dual-shape read for a raw `db.execute` result (the `exceptions.repository.ts#hasPendingFor
 *  Building` idiom, copied verbatim — no shared extraction across repositories/producers). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** True iff a thrown DB error is a Postgres unique_violation (SQLSTATE 23505) — mirrors `standing-order.
 *  service.ts`/`flag-discipline.service.ts`'s OWN `isUniqueViolation` helper (never a shared extraction —
 *  this codebase's own "each producer/service redefines it locally" convention). Maps a genuine concurrent
 *  race loss (migration 0136's partial unique index) into the SAME honest 'deduped' outcome the app-level
 *  pre-check below already returns for the sequential case. */
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === '23505' || err?.cause?.code === '23505';
}

function buildActions(pressureKey: string, itemDescription: string): DegradedCategoryPressureCandidateActionView[] {
  return [
    {
      id: 'acknowledge',
      label: 'Acknowledge the degraded coverage',
      label_i18n: { key: 'exception.degraded_category_pressure.acknowledge.label', params: {} }, // TD-455
      projected_consequence: `${itemDescription} You note the gap while this area operates below full capability.`,
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      source: DEGRADED_CATEGORY_PRESSURE_SOURCE,
      pressure_key: pressureKey,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.degraded_category_pressure.escalate.label', params: {} }, // TD-455
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.degraded_category_pressure.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: DEGRADED_CATEGORY_PRESSURE_SOURCE,
      pressure_key: pressureKey,
    },
  ];
}

/** ONE outcome this producer's per-item raise attempt reports — the SAME honest 3(+1)-outcome shape every
 *  OTHER `src/exceptions/` producer returns, widened with 'no_candidate' for a category whose real state
 *  offered fewer items than its quota (never fabricated — the anti-fig-leaf outcome). */
export type DegradedCategoryPressureOutcome = 'raised' | 'deduped' | 'cap_refused';

export interface DegradedCategoryPressureItemResult {
  readonly categoryId: number;
  readonly itemRef: string;
  readonly outcome: DegradedCategoryPressureOutcome;
}

const ROUTE_ASSIGNMENT_CODE = taskCategoryCatalogueEntryFor(TaskCategoryKey.ROUTE_ASSIGNMENT).code;

@Injectable()
export class DegradedCategoryPressureProducer implements OnApplicationBootstrap {
  private readonly logger = new Logger(DegradedCategoryPressureProducer.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // D3 wall: duplicate-provided instance (DelegationRatchetModule provides this class directly — the
    // SAME "stateless DB-only class, harmless second instance" precedent every OTHER `src/exceptions/`
    // producer outside that directory already follows, e.g. friction-threshold/compression-residue).
    private readonly exceptions: ExceptionsRepository,
    private readonly playerProficiency: PlayerProficiencyRepository,
    private readonly promotionLocks: PromotionLocksRepository,
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onSessionOpened((event: SessionOpenedEvent) => {
      this.processSessionOpened(event.playerId, event.sessionId, event.gameMinute).catch((err) =>
        this.logger.error(`session_opened degraded-category-pressure handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  /**
   * `processSessionOpened(playerId, sessionId, gameMinute)` — the SAME method BOTH the real
   * `SessionOpenedEvent` subscription AND the E2E floor's direct-invocation test route call (Lesson #3 —
   * zero live-vs-test divergence). `sessionId` is accepted for signature symmetry with the sibling C7
   * subscriber (`RecallDebtSessionSubscriber.processSessionClosed`) and future logging use; the card
   * raise itself needs no session reference (mirrors every OTHER producer's own player-scoped shape).
   */
  async processSessionOpened(playerId: string, sessionId: string, _gameMinute: number): Promise<DegradedCategoryPressureItemResult[]> {
    const recovering = await this.playerProficiency.listRecoveringForPlayer(playerId);
    const activeLocks = await this.promotionLocks.listActiveForPlayer(playerId);

    const recoveringCategories = new Set(recovering.map((r) => r.categoryId));
    const windowActiveCategories = new Set(activeLocks.map((l) => l.category_id));
    const eligibleCategories = new Set<number>([...recoveringCategories, ...windowActiveCategories]);

    const results: DegradedCategoryPressureItemResult[] = [];

    for (const categoryId of [...eligibleCategories].sort((a, b) => a - b)) {
      // Ceiling (D11), never a target — the MAX of both getters when a category is BOTH recovering AND
      // window-active (the more generous reason applies; either quota alone already excludes 0 correctly).
      const recoveryQuota = recoveringCategories.has(categoryId) ? metaProgressionTunables.recoveryPressureCardsPerSession : 0;
      const windowQuota = windowActiveCategories.has(categoryId) ? metaProgressionTunables.unmanagedWindowPressureCardsPerSession : 0;
      const quota = Math.max(recoveryQuota, windowQuota);
      if (quota <= 0) continue; // quota getter 0 -> zero cards for this category, no candidate query at all.

      const candidates = await this.candidatesForCategory(playerId, categoryId);
      const slice = candidates.slice(0, quota); // the per-state quota is a CEILING on real items, never a retry budget.

      for (const candidate of slice) {
        const outcome = await this.raiseCard(playerId, categoryId, candidate);
        results.push({ categoryId, itemRef: candidate.itemRef, outcome });
        if (outcome === 'raised') {
          this.logger.log(
            `DEGRADED_CATEGORY_PRESSURE: player=${playerId} session=${sessionId} category=${categoryId} item=${candidate.itemRef} -> raised`,
          );
        }
      }
    }

    return results;
  }

  /** Category -> real-current-state candidate query (C0-reanchor §7 confirmed bindings). See file header
   *  for the SCOPE note: ROUTE_ASSIGNMENT ONLY this chunk — every other LIVE category honestly resolves []. */
  private async candidatesForCategory(playerId: string, categoryId: number): Promise<CategoryStateCandidate[]> {
    if (categoryId === ROUTE_ASSIGNMENT_CODE) {
      return this.severedRouteCandidates(playerId);
    }
    return [];
  }

  /** ROUTE_ASSIGNMENT (C0-reanchor §7): every currently `state='severed'` route the player owns, route_id
   *  ascending (deterministic — D13, no rng). The SAME substrate `SeveredRouteHlCardProvider`/`Route
   *  CollapseExceptionProducer` already read (`route.service.ts:349`'s own winning-branch severance). */
  private async severedRouteCandidates(playerId: string): Promise<CategoryStateCandidate[]> {
    const rows = await this.db
      .select({ routeId: route.route_id })
      .from(route)
      .where(and(eq(route.player_id, playerId), eq(route.state, 'severed')))
      .orderBy(route.route_id);
    return rows.map((r) => ({
      itemRef: r.routeId,
      description: `Route assignment is running degraded — route ${r.routeId} is severed.`,
    }));
  }

  /** PER-ITEM dedup gate (R7/C0-reanchor §6) — mirrors `hasPendingForBuilding`'s jsonb EXISTS shape,
   *  reading `candidate_actions[0].pressure_key` directly (this producer ALWAYS stamps it at index 0 — no
   *  `jsonb_array_elements` scan needed, unlike the multi-action-position scans other producers use). */
  private async hasPendingForItem(playerId: string, pressureKey: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND candidate_actions -> 0 ->> 'pressure_key' = ${pressureKey}
      LIMIT 1
    `);
    return rowsOf(result).length > 0;
  }

  /**
   * Raise ONE card for ONE (category, item), or report why not (dedup/cap-refuse — the SAME honest
   * 3-outcome shape every OTHER producer returns). The app-level `hasPendingForItem` pre-check is the fast
   * path (matches the sequential "second session open with the first card still pending" falsifiable); the
   * `isUniqueViolation` catch below is the belt-and-suspenders DB-ENFORCED layer (migration 0136) a genuine
   * concurrent race needs — see that migration's own header for the full reasoning.
   */
  private async raiseCard(playerId: string, categoryId: number, candidate: CategoryStateCandidate): Promise<DegradedCategoryPressureOutcome> {
    const pressureKey = `${categoryId}:${candidate.itemRef}`;
    if (await this.hasPendingForItem(playerId, pressureKey)) {
      return 'deduped';
    }

    const actions = buildActions(pressureKey, candidate.description);
    try {
      const exceptionId = await this.exceptions.insert({
        player_id: playerId,
        lieutenant_id: null,
        event_descriptor: candidate.description,
        candidate_actions: actions,
        suggested_action: actions[0],
        confidence: 0.9,
        severity: 60,
        priority: 60,
        resolution_status: 'pending',
      });

      if (!exceptionId) {
        // D5 cap-guard refusal — handled honestly (never thrown, never retried), the SAME defense-in-depth
        // posture every sibling producer documents for its own structurally-unreachable case.
        this.logger.warn(`raiseCard: cap-refused (D5) player=${playerId} category=${categoryId} item=${candidate.itemRef} — no card inserted.`);
        return 'cap_refused';
      }
      return 'raised';
    } catch (e) {
      if (isUniqueViolation(e)) {
        // A concurrent racer won the SAME pressure_key between our pre-check and this INSERT (migration
        // 0136's partial unique index) — the DB-enforced proof, never a 5xx.
        return 'deduped';
      }
      throw e;
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
