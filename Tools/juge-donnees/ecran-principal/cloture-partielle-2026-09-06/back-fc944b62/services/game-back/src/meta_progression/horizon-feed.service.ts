// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C3 ("`HorizonFeedService`
//             transitions: GET marks `unseen→seen`; `POST defer`; `POST dismiss` → 409 `CAPABILITY_NOT_
//             DISMISSIBLE` on the v1 set (D8 — all 4 LIVE are non-dismissible; the enum/plumbing exists
//             for future dismissible capabilities)... `GET /v1/meta/horizon-feed` per §8.1 incl.
//             `affordable` stub-false with a LOUD TODO closed in C4.").
//             ★ C4 CLOSURE (2026-07-20, plan C4 "the C3 `affordable` field wired REAL"): the STUB below is
//             now the REAL `free_units >= freeUnitsRequired` check, `free_units` read ONCE per `getFeed`
//             call via `BudgetRecomputeService.getProjection` (design §10.1/§10.2 — the SAME shared
//             `computeUsed` the recompute write path uses, so the feed's affordability read is never a
//             second, independent cost model).
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §8.1-§8.3 (feed
//             read/defer/dismiss) + D8 (dismiss self-brick guard) + D15 (R2.2 — `adoption_cost` is the ONE
//             canon-sanctioned numeric beyond free/cap themselves).
//             ★ LOUD SCOPE NOTE (design §8.1 vs `meta-progression-tunables.ts`'s own C1 doc comment,
//             `:301` "`meta.visible_predicates_shown`... used_by (C9+): the horizon feed card projection"):
//             `visible_predicates` is EXPLICITLY assigned to C9 at C1 (already ⊥-approved), and plan C9's
//             own "But." names "horizon feed card contract (4 canon fields + visible_predicates capped...)"
//             as its OWN deliverable. This chunk's GET therefore ships every §8.1 field EXCEPT
//             `visible_predicates` (never a placeholder array invented ahead of its real consumer/getter-
//             wiring chunk — the SAME "never a fig-leaf" discipline the catalogue's own boot-check
//             enforces) — flagged here, not silently dropped, for the reviewer to confirm against C9's
//             own scope.
//             Pattern (existence-read informs the error class, 404 vs 409): `promotion-lock.service.ts
//             #previewRecall`. Pattern (i18n key derived mechanically from a closed domain key, the SAME
//             `error.<family>.<short_label>` grammar `api-error.ts`'s own header documents): NEW here —
//             no per-entity i18n-key convention existed yet in this codebase before this chunk (every
//             prior player projection sends the raw closed-domain key alone, e.g. `TaskCategoryProjectionRow.
//             category_key`, and lets the client index its OWN static i18n table by it) — `capability.
//             <lowercased_key>.{name,desc}` is the SAME grammar, extended to the ONE place design §8.1
//             explicitly asks for dedicated i18n keys.
//             — P3-G C3 — 2026-07-20
//   C9 (2026-07-23) CLOSES the ★ LOUD SCOPE NOTE above: `visible_predicates` now SHIPS — design §8.1/§13,
//             plan C9 "But." ("horizon feed card contract... visible_predicates capped by `meta.visible_
//             predicates_shown`, selection rule = most-recently-true"). Selection rule + the "no per-clause
//             timestamp substrate exists" account: `predicate-evaluators.ts#predicateFreshnessMargin`'s own
//             header (additive C9 export, consumed ONLY here). `visible_predicates` entries carry `predicate_
//             type` (the closed `PredicateType` enum — an opaque catalogue-domain code, the SAME "an id/code
//             is a handle, not a leak" class `category_id`/`lieutenant_id`/`capability_id` already establish,
//             r22_leak_sweep.spec.ts's own precedent) + `desc_i18n_key` (the SAME `capability.<key>.{name,
//             desc}` grammar this file already owns, extended one level: `capability.<key>.predicate.
//             <lowercased_type>`) — NEVER a raw `threshold`/`actual` number (§13 ALLOWED_KEYS: the ONLY
//             player-facing numerics this whole lot sanctions are `free_units`/`cap`/`adoption_cost`
//             ("requires N"); canon's own `PredicateClause` composite, `possibility_horizon.md:83-88`, has
//             no inline number either — `threshold_ref` is a CONFIG REFERENCE, never a literal). Only clauses
//             CURRENTLY `satisfied:true` are ever candidates (a regressed clause is excluded, never shown as
//             true — `selectVisiblePredicates` below filters before ranking, so a `predicate_regressed` card
//             naturally shows FEWER than `shown` entries when fewer than `shown` clauses still hold).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { capabilityCatalogueEntryForCode, type CapabilityCatalogueEntry, type CapabilityKey } from './capability-catalogue';
import { PossibilityHorizonCardsRepository } from './possibility-horizon-cards.repository';
import { BudgetRecomputeService } from './budget-recompute.service';
import { HorizonPredicateEvaluatorService, type PredicateClauseWithActual } from './horizon-predicate-evaluator.service';
import { predicateFreshnessMargin, type PredicateType } from './predicate-evaluators';
import { metaProgressionTunables } from './meta-progression-tunables';
import type { PossibilityCardViewStatusEnum } from '../db/schema/progression_structural';

/** One `visible_predicates` entry (design §8.1/§13, C9) — `predicate_type` is an opaque closed-domain
 *  code (the SAME "id/code is a handle, not a leak" class `capability_key`/`capability_id` already are —
 *  see file header), `desc_i18n_key` the mechanically-derived key (Unity/i18n-table TD ships the STRING,
 *  §17 ★#5). NEVER a raw `threshold`/`actual` number — §13's own ALLOWED_KEYS wall. */
export interface VisiblePredicateView {
  readonly predicate_type: PredicateType;
  readonly desc_i18n_key: string;
}

/** One projected feed card (design §8.1 field list) — `card_id`/`view_status` are the obvious load-
 *  bearing fields the prose doesn't spell out but every `defer`/`dismiss` path-param call needs (the
 *  SAME "obviously necessary, not itself a leak" posture `TaskCategoryProjectionRow`'s own unlisted
 *  scalars carry). `affordable` is REAL as of C4 (see `projectCard` below); `visible_predicates` is REAL
 *  as of C9 (file header). */
export interface HorizonFeedCardView {
  readonly card_id: string;
  readonly capability_key: CapabilityKey;
  readonly name_i18n_key: string;
  readonly desc_i18n_key: string;
  readonly view_status: PossibilityCardViewStatusEnum;
  readonly adoption_cost: number;
  readonly affordable: boolean;
  readonly predicate_regressed: boolean;
  readonly visible_predicates: readonly VisiblePredicateView[];
}

/** `capability.<lowercased_key>.{name,desc}` — mechanically derived from the closed `CapabilityKey`
 *  (never free text, never invented content — the actual translated STRINGS are Unity/i18n-table TD,
 *  ★#5/§17, this lot ships the KEY CONTRACT only). */
function capabilityI18nKeys(key: CapabilityKey): { name: string; desc: string } {
  const lower = key.toLowerCase();
  return { name: `capability.${lower}.name`, desc: `capability.${lower}.desc` };
}

/** `capability.<lowercased_capability_key>.predicate.<lowercased_predicate_type>` — the SAME mechanical
 *  grammar `capabilityI18nKeys` establishes, one level deeper (C9, design §8.1's `visible_predicates`
 *  per-clause i18n key; canon `PredicateClause.description_i18n_key`, `possibility_horizon.md:87`). Ships
 *  the KEY CONTRACT only — the translated STRING is Unity/i18n-table TD (★#5/§17), mirrors
 *  `capabilityI18nKeys`'s own file-header note verbatim. */
function predicateDescI18nKey(capabilityKey: CapabilityKey, predicateType: PredicateType): string {
  return `capability.${capabilityKey.toLowerCase()}.predicate.${predicateType.toLowerCase()}`;
}

/**
 * `selectVisiblePredicates` (C9, design §8.1/§13) — the `meta.visible_predicates_shown`-capped clause
 * selection (see `predicate-evaluators.ts#predicateFreshnessMargin`'s own header for the full "overshoot-
 * magnitude proxy, not a true recency proxy — COSMETIC, accepted-as-is, decisions §4 #26" account,
 * corrected P3-G C10 fix-in-passing ⊥ C9 IMPORTANT). Only CURRENTLY `satisfied:true` clauses are candidates (a regressed
 * clause is excluded — never rendered as a "why this is relevant" reason once it no longer holds); ranked
 * ascending by margin (smaller = less overshoot past its own threshold — a `+Infinity` sentinel for the
 * `CURRENT_VOCAB_TIER_IS` gate clause always sorts it last; this is NOT a true most-recently-true ordering
 * across clauses of different accrual rates, see the header cited above — the field is a "why this is
 * relevant" hint list, nothing gates on the exact order, only on `satisfied`); `Array.prototype.sort` is a
 * STABLE sort (ES2019+ — the runtime this repo targets), so two clauses tied on margin fall back to
 * catalogue declaration order for free, no manual tie-break index needed. `shown=0` (the `.slice(0, 0)`
 * empty-array path) is canon's own "mystery mode" (§13); `shown=3` ≡ "all" (every LIVE capability carries
 * exactly 3 clauses, design §6 table).
 */
function selectVisiblePredicates(
  clauses: readonly PredicateClauseWithActual[],
  shown: number,
  capabilityKey: CapabilityKey,
): VisiblePredicateView[] {
  const ranked = clauses
    .filter((c) => c.satisfied)
    .map((c) => ({ clause: c, margin: predicateFreshnessMargin(c.type, c.actual, c.threshold) }))
    .sort((a, b) => a.margin - b.margin);
  return ranked.slice(0, shown).map(({ clause }) => ({
    predicate_type: clause.type,
    desc_i18n_key: predicateDescI18nKey(capabilityKey, clause.type),
  }));
}

@Injectable()
export class HorizonFeedService {
  constructor(
    private readonly cardsRepo: PossibilityHorizonCardsRepository,
    private readonly budgetRecompute: BudgetRecomputeService,
    private readonly predicateEvaluator: HorizonPredicateEvaluatorService,
  ) {}

  /**
   * `GET /v1/meta/horizon-feed` (design §8.1). Reading marks `unseen -> seen` FIRST (set-based UPDATE),
   * THEN the projection reads the non-terminal set — so the response `view_status` is always POST-
   * transition (a card that was `unseen` on entry is already `seen` in the returned payload). `free_units`
   * is read ONCE per call (`BudgetRecomputeService.getProjection` — the SAME shared `computeUsed` the
   * recompute write path uses, design §10.1) and threaded into every card's `affordable` derivation — a
   * single budget read serves the WHOLE feed, never one read per card. `visible_predicates` (C9) is a
   * PER-CARD fresh re-evaluation (`HorizonPredicateEvaluatorService.evaluateCapabilityWithActuals` — never
   * the frozen `surfaced_predicate_snapshot`, that file's own header) — parallelized across cards via
   * `Promise.all`, skipped entirely when `meta.visible_predicates_shown === 0` (the mystery-mode fast
   * path: no clause evaluation needed to know the answer is always `[]`).
   */
  async getFeed(playerId: string): Promise<HorizonFeedCardView[]> {
    await this.cardsRepo.markUnseenAsSeen(playerId);
    const [rows, { free_units }] = await Promise.all([
      this.cardsRepo.listNonTerminalForPlayer(playerId),
      this.budgetRecompute.getProjection(playerId),
    ]);
    const shown = metaProgressionTunables.visiblePredicatesShown;
    return Promise.all(
      rows.map(async (row) => {
        const entry = capabilityCatalogueEntryForCode(row.capability_id);
        const clauses = shown > 0 ? await this.predicateEvaluator.evaluateCapabilityWithActuals(playerId, entry) : [];
        const visiblePredicates = shown > 0 ? selectVisiblePredicates(clauses, shown, entry.key) : [];
        return projectCard(row, free_units, visiblePredicates, entry);
      }),
    );
  }

  /** `POST /v1/meta/horizon-feed/:cardId/defer` (design §8.2). */
  async defer(playerId: string, cardId: string): Promise<{ card_id: string; view_status: 'deferred' }> {
    const updated = await this.cardsRepo.deferCard(playerId, cardId);
    if (updated) {
      return { card_id: updated.card_id, view_status: 'deferred' };
    }
    const existing = await this.cardsRepo.findOwnedCard(playerId, cardId);
    if (!existing) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No horizon card ${cardId} for this player.` });
    }
    throw new ApiError('RESOURCE_STATE_CONFLICT', {
      message: `Horizon card ${cardId} is '${existing.view_status}' — not deferrable from this status.`,
      payloadVars: { card_id: cardId, view_status: existing.view_status },
    });
  }

  /** `POST /v1/meta/horizon-feed/:cardId/dismiss` (design §8.3/D8 — the self-brick guard). */
  async dismiss(playerId: string, cardId: string): Promise<{ card_id: string; view_status: 'dismissed' }> {
    const existing = await this.cardsRepo.findOwnedCard(playerId, cardId);
    if (!existing) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No horizon card ${cardId} for this player.` });
    }

    const entry = capabilityCatalogueEntryForCode(existing.capability_id);
    if (!entry.dismissible) {
      throw new ApiError('CAPABILITY_NOT_DISMISSIBLE', {
        message: `Capability ${entry.key} is not dismissible (D8 — the v1 self-brick guard).`,
        payloadVars: { card_id: cardId, capability_key: entry.key },
      });
    }

    const updated = await this.cardsRepo.dismissCard(playerId, cardId);
    if (!updated) {
      // A concurrent racer changed the card's status between the ownership read above and this attempt
      // (e.g. it just got adopted/deferred/dismissed by another request) — the SAME "guarded UPDATE
      // matched 0 rows" 409 class `defer` uses.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `Horizon card ${cardId} is no longer in a dismissible status.`,
        payloadVars: { card_id: cardId },
      });
    }
    return { card_id: updated.card_id, view_status: 'dismissed' };
  }
}

function projectCard(
  row: {
    card_id: string;
    capability_id: number;
    view_status: PossibilityCardViewStatusEnum;
    predicate_regressed: boolean;
  },
  freeUnits: number,
  visiblePredicates: readonly VisiblePredicateView[],
  entry: CapabilityCatalogueEntry,
): HorizonFeedCardView {
  const i18n = capabilityI18nKeys(entry.key);
  const required = entry.freeUnitsRequired ?? 0; // LIVE rows always carry a non-null freeUnitsRequired (D3 boot strict-check).
  return {
    card_id: row.card_id,
    capability_key: entry.key,
    name_i18n_key: i18n.name,
    desc_i18n_key: i18n.desc,
    view_status: row.view_status,
    adoption_cost: required,
    // C4 CLOSURE: the REAL complexity-budget affordability check (design §9's own adoption gate
    // arithmetic, `free_units >= freeUnitsRequired`) — `>=` matches the adoption service's OWN
    // affordability re-derivation (design §9 step 1), never a strict `>` (a card costing EXACTLY the
    // player's current `free_units` — e.g. VOCAB_TIER_3 at 60 for a fresh player — is affordable).
    affordable: freeUnits >= required,
    predicate_regressed: row.predicate_regressed,
    // C9 CLOSURE — see file header + `selectVisiblePredicates`'s own header for the full selection-rule
    // account.
    visible_predicates: visiblePredicates,
  };
}
