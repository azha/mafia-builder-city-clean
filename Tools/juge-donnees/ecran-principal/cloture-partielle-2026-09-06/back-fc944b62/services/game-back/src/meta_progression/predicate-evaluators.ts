// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C2 ("predicate-evaluators.ts:
//             closed PredicateTypeEnum, 6 LIVE + 2 RESERVED types — design §7.1, R3/R4 surfaces").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md D4/§7 ("Predicate
//             engine = closed PredicateTypeEnum, AND-strict, conservative-false, evaluated per-session...
//             all reads through existing repositories (no new query surfaces beyond simple counts)... a
//             RESERVED type wired to a LIVE capability = boot failure (closed-world strict check)").
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §5 (R3 — gameplay_
//             sessions shape + countHandledExceptions CONFIRMED, "zero new query surface needed for
//             these two predicate types") + §12 (R4 — SCRIPTED_LIEUTENANTS_MIN GAP, closed here via the
//             NEW `LieutenantRepository.countScriptedByPlayer`, additive, well-precedented join).
//             #28 wall (lot-wide): a predicate reading delegation state reads `mastery_score.
//             delegation_state` (READ-ONLY) — never `player_proficiency` per-cycle counters.
//             Pattern (closed map keyed by an enum, defensive default on the unreachable branch):
//             `graduation-seed-mapper.ts`'s `RESOLVED_METHOD_DISPOSITION`. Pattern (iterate the 4 LIVE
//             `TASK_CATEGORY_CATALOGUE` rows + `MasteryScoreRepository.getRow`, one query per category,
//             no lazy row creation — REUSE, zero new query surface): `meta-progression.projection.
//             service.ts#taskCategoryProjection`/`#projectRow`. Pattern (a direct DB "simple count",
//             bypassing a repository that has no matching method): `meta-progression-admin.controller.
//             ts#getMasteryDistribution`'s own per-LIVE-category raw `db.select(...).from(masteryScore)`.
//             — P3-G C2 — 2026-07-20
//
// `predicate-evaluators.ts` — the closed `PredicateType` registry (design D4/§7.1): 6 LIVE types (each
// reads a REAL surface, REUSE-first — zero new query surface for 5 of the 6; the 6th, SCRIPTED_
// LIEUTENANTS_MIN, closes the ONE real R4 gap via a single additive repository method) + 2 RESERVED types
// (held, never evaluated — the catalogue's own boot strict-check refuses a LIVE capability that ever
// wires one, `capability-catalogue.ts#validateCapabilityCatalogueStrictMode`). AND-strict conjunction and
// conservative-false-on-missing-state (§7.2) both fall out of ordinary REUSE arithmetic below — every
// LIVE evaluator reads through a method that already defaults a missing row to its honest zero-state
// (`ProgressionRepository.getProgression` → tier 1; `MasteryScoreRepository.getRow` → null → filtered
// out; a zero-row COUNT → 0) — never a try/catch swallow, never a bespoke "missing" branch.

import { and, eq, isNotNull, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../db';
import { gameplaySessionRow } from '../db/schema/sessions_and_audit';
import { ProgressionRepository } from '../progression/progression.repository';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { MasteryScoreRepository } from './mastery-score.repository';
import { TASK_CATEGORY_CATALOGUE } from './task-category-catalogue';
import { deriveMasteryBucket } from './mastery-bucket';
import { metaProgressionTunables } from './meta-progression-tunables';

/**
 * The closed predicate-type registry (design D4/§7.1) — 6 LIVE + 2 RESERVED. A RESERVED type is HELD
 * (never removed — canon's two GDD examples name a real future substrate, decisions §4) but its
 * evaluator THROWS if ever invoked (see `reservedThrows` below): the catalogue's own boot strict-check
 * refuses any LIVE capability that wires a RESERVED type, so a production invocation of a RESERVED
 * evaluator should be UNREACHABLE — the throw is defensive, not a live code path.
 */
export enum PredicateType {
  // ── 6 LIVE ──────────────────────────────────────────────────────────────────────────────────────
  CURRENT_VOCAB_TIER_IS = 'CURRENT_VOCAB_TIER_IS',
  DELEGATED_CATEGORIES_MIN = 'DELEGATED_CATEGORIES_MIN',
  SCRIPTED_LIEUTENANTS_MIN = 'SCRIPTED_LIEUTENANTS_MIN',
  EXCEPTIONS_HANDLED_MIN = 'EXCEPTIONS_HANDLED_MIN',
  SESSIONS_CLOSED_MIN = 'SESSIONS_CLOSED_MIN',
  MASTERY_ELIGIBLE_MIN = 'MASTERY_ELIGIBLE_MIN',
  // ── 2 RESERVED (no real substrate on this base — design §7.1) ──────────────────────────────────────
  VACANCY_EVENT_RESOLVED_RECENT = 'VACANCY_EVENT_RESOLVED_RECENT',
  BRANCH_DIVERGENCE_LOW = 'BRANCH_DIVERGENCE_LOW',
}

/** The LIVE subset — `capability-catalogue.ts`'s own boot strict-check consults this to refuse a LIVE
 *  capability that wires a RESERVED type (§7.2's closed-world rule). */
export const LIVE_PREDICATE_TYPES: ReadonlySet<PredicateType> = new Set([
  PredicateType.CURRENT_VOCAB_TIER_IS,
  PredicateType.DELEGATED_CATEGORIES_MIN,
  PredicateType.SCRIPTED_LIEUTENANTS_MIN,
  PredicateType.EXCEPTIONS_HANDLED_MIN,
  PredicateType.SESSIONS_CLOSED_MIN,
  PredicateType.MASTERY_ELIGIBLE_MIN,
]);

/** One clause of a capability's predicate AND-set (design §7.1 table). `threshold` is the per-clause
 *  int argument (a tier number for `CURRENT_VOCAB_TIER_IS`, a MIN count for the `*_MIN` types). */
export interface PredicateClause {
  readonly type: PredicateType;
  readonly threshold: number;
}

/**
 * Everything a predicate evaluator needs to read, bundled once per `evaluateForPlayer` call (§7.1: "all
 * reads through existing repositories"). `db` is carried ONLY for `SESSIONS_CLOSED_MIN`'s own simple
 * count (C0-reanchor R3: no new `SessionRepository` method needed — `gameplay_sessions`' shape is
 * already confirmed AS-IS; `BudgetsHorizonModule` does not import `SessionModule` at all, R7's own
 * confirmed import set never names it) — a raw count query here, mirroring `meta-progression-admin.
 * controller.ts`'s own direct-DB "simple count" idiom.
 */
export interface PredicateEvalContext {
  readonly playerId: string;
  readonly db: DrizzleClient;
  readonly progressionRepo: ProgressionRepository;
  readonly masteryScoreRepo: MasteryScoreRepository;
  readonly lieutenantRepo: LieutenantRepository;
}

/** `SESSIONS_CLOSED_MIN`'s own read (design §7.1: "count of closed gameplay_sessions rows"; C0-reanchor
 *  R3: "a session is CLOSED iff ended_at IS NOT NULL"). A player with zero session rows → 0 → false,
 *  never a throw. */
async function countClosedSessions(ctx: PredicateEvalContext): Promise<number> {
  const rows = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(gameplaySessionRow)
    .where(and(eq(gameplaySessionRow.player_id, ctx.playerId), isNotNull(gameplaySessionRow.ended_at)));
  return Number(rows[0]?.n ?? 0);
}

/**
 * `DELEGATED_CATEGORIES_MIN`'s own read (design §7.1: "count mastery_score rows delegation_state=
 * 'DELEGATED'... the honest transposition of canon SCRIPTED_LIEUTENANTS_LOCKED — divergence #15"): the
 * #28-wall REUSE of `MasteryScoreRepository.getRow` (READ-ONLY, `mastery_score.delegation_state` —
 * NEVER `player_proficiency`) over the 4 LIVE `TASK_CATEGORY_CATALOGUE` rows, mirroring
 * `MetaProgressionProjectionService.taskCategoryProjection`'s own established "iterate the 4 LIVE
 * categories + getRow, one query per category, no lazy row creation" idiom verbatim — zero new query
 * surface (a player with no mastery_score row for a category simply does not count toward DELEGATED).
 */
async function countDelegatedCategories(ctx: PredicateEvalContext): Promise<number> {
  const liveCategories = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
  const rows = await Promise.all(liveCategories.map((c) => ctx.masteryScoreRepo.getRow(ctx.playerId, c.code)));
  return rows.filter((r) => r?.delegation_state === 'DELEGATED').length;
}

/**
 * `MASTERY_ELIGIBLE_MIN`'s own read (design §7.1: "count mastery_score rows SELF with mastery_score >=
 * meta.mastery_retirement_threshold getter — the P3-F derived-ELIGIBLE rule REUSE, never a stored
 * flag"): the SAME 4-category `getRow` loop as `countDelegatedCategories`, filtered on
 * `delegation_state === 'SELF'` (a missing row defaults to SELF/0 — `MetaProgressionProjectionService.
 * projectRow`'s OWN zero-state convention) and `deriveMasteryBucket(rawScore, threshold) === 'ELIGIBLE'`
 * (the REAL ELIGIBLE-first derivation, never a re-derived `raw >= threshold` inline check).
 */
async function countEligibleCategories(ctx: PredicateEvalContext): Promise<number> {
  const threshold = metaProgressionTunables.masteryRetirementThreshold;
  const liveCategories = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
  const rows = await Promise.all(liveCategories.map((c) => ctx.masteryScoreRepo.getRow(ctx.playerId, c.code)));
  return rows.filter((r) => {
    const delegationState = r?.delegation_state ?? 'SELF';
    const rawScore = r?.mastery_score ?? 0;
    return delegationState === 'SELF' && deriveMasteryBucket(rawScore, threshold) === 'ELIGIBLE';
  }).length;
}

type PredicateEvaluatorFn = (ctx: PredicateEvalContext, threshold: number) => Promise<boolean>;

/** A RESERVED type's evaluator — never a real code path (the catalogue's own boot strict-check refuses
 *  any LIVE capability that wires a RESERVED type — §7.2's closed-world rule). Throws loudly if ever
 *  reached rather than silently returning a value for a predicate with no real substrate. */
function reservedThrows(type: PredicateType): PredicateEvaluatorFn {
  return () =>
    Promise.reject(
      new Error(
        `[predicate-evaluators] "${type}" is RESERVED (no real substrate on this base) — it must never be ` +
          'evaluated. Reaching this throw means a LIVE capability wired a RESERVED predicate type, which ' +
          'the catalogue boot strict-check (validateCapabilityCatalogueStrictMode) should have refused.',
      ),
    );
}

const PREDICATE_EVALUATORS: Readonly<Record<PredicateType, PredicateEvaluatorFn>> = {
  [PredicateType.CURRENT_VOCAB_TIER_IS]: async (ctx, threshold) => {
    const { rule_vocabulary_tier } = await ctx.progressionRepo.getProgression(ctx.playerId);
    return rule_vocabulary_tier === threshold;
  },
  [PredicateType.EXCEPTIONS_HANDLED_MIN]: async (ctx, threshold) => {
    const handled = await ctx.progressionRepo.countHandledExceptions(ctx.playerId);
    return handled >= threshold;
  },
  [PredicateType.SESSIONS_CLOSED_MIN]: async (ctx, threshold) => {
    const closed = await countClosedSessions(ctx);
    return closed >= threshold;
  },
  [PredicateType.SCRIPTED_LIEUTENANTS_MIN]: async (ctx, threshold) => {
    const scripted = await ctx.lieutenantRepo.countScriptedByPlayer(ctx.playerId);
    return scripted >= threshold;
  },
  [PredicateType.DELEGATED_CATEGORIES_MIN]: async (ctx, threshold) => {
    const delegated = await countDelegatedCategories(ctx);
    return delegated >= threshold;
  },
  [PredicateType.MASTERY_ELIGIBLE_MIN]: async (ctx, threshold) => {
    const eligible = await countEligibleCategories(ctx);
    return eligible >= threshold;
  },
  [PredicateType.VACANCY_EVENT_RESOLVED_RECENT]: reservedThrows(PredicateType.VACANCY_EVENT_RESOLVED_RECENT),
  [PredicateType.BRANCH_DIVERGENCE_LOW]: reservedThrows(PredicateType.BRANCH_DIVERGENCE_LOW),
};

/**
 * Evaluate ONE predicate clause — the closed-map dispatch (mirrors `graduation-seed-mapper.ts`'s own
 * `RESOLVED_METHOD_DISPOSITION` closed-map idiom, here `async` since every LIVE branch reads the DB).
 * Deterministic + idempotent for unchanged state (no RNG, no write) — `HorizonPredicateEvaluatorService`
 * relies on this for the C2 determinism falsifiable.
 */
export function evaluatePredicateClause(ctx: PredicateEvalContext, clause: PredicateClause): Promise<boolean> {
  return PREDICATE_EVALUATORS[clause.type](ctx, clause.threshold);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// P3-G C9 — additive-only (plan §0.5): the `visible_predicates` "most-recently-true" selection rule
// (design §8.1/§13; canon `possibility_horizon.md:130` — "sélection côté serveur, critère : clause la
// plus récemment devenue vraie"). ZERO per-clause timestamp substrate exists anywhere in this lot's
// schema — divergence #14 explicitly REJECTS a full predicate-evaluation append-log ("a full eval log
// writes every session for every player forever... TD if ops wants the history"), and C9 carries no new
// migration (récap allocations table). Freshness is therefore DERIVED AT READ TIME from already-
// available state — the SAME "derive don't store" philosophy `penalty-bucket.ts`/D12 already establishes
// for the debt-bucket projection ("a stored bucket is a cache of a pure function of one column;
// derivation removes the invalidation class").
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * `getPredicateActualValue` — the RAW underlying count/tier a clause compares its `threshold` against
 * (never exposed to the player — §13's own ALLOWED_KEYS wall forbids every raw predicate number; this
 * is an INTERNAL freshness-ranking input only, consumed by `predicateFreshnessMargin` below). Reuses the
 * EXACT SAME per-type reads `PREDICATE_EVALUATORS` already performs (`countClosedSessions`/
 * `countDelegatedCategories`/`countEligibleCategories`, `ctx.progressionRepo.*`, `ctx.lieutenantRepo.*`)
 * — a second, independent query surface would risk drifting from the authoritative satisfied-boolean
 * comparison this file's own dispatch already owns; this function only ever ADDS a raw-number read
 * alongside it, never REPLACES `evaluatePredicateClause` as the source of truth for "is this clause true".
 */
const PREDICATE_ACTUAL_VALUE_READERS: Readonly<Record<PredicateType, (ctx: PredicateEvalContext) => Promise<number>>> = {
  [PredicateType.CURRENT_VOCAB_TIER_IS]: async (ctx) => (await ctx.progressionRepo.getProgression(ctx.playerId)).rule_vocabulary_tier,
  [PredicateType.EXCEPTIONS_HANDLED_MIN]: async (ctx) => ctx.progressionRepo.countHandledExceptions(ctx.playerId),
  [PredicateType.SESSIONS_CLOSED_MIN]: async (ctx) => countClosedSessions(ctx),
  [PredicateType.SCRIPTED_LIEUTENANTS_MIN]: async (ctx) => ctx.lieutenantRepo.countScriptedByPlayer(ctx.playerId),
  [PredicateType.DELEGATED_CATEGORIES_MIN]: async (ctx) => countDelegatedCategories(ctx),
  [PredicateType.MASTERY_ELIGIBLE_MIN]: async (ctx) => countEligibleCategories(ctx),
  [PredicateType.VACANCY_EVENT_RESOLVED_RECENT]: () =>
    Promise.reject(new Error('[predicate-evaluators] getPredicateActualValue: VACANCY_EVENT_RESOLVED_RECENT is RESERVED — unreachable.')),
  [PredicateType.BRANCH_DIVERGENCE_LOW]: () =>
    Promise.reject(new Error('[predicate-evaluators] getPredicateActualValue: BRANCH_DIVERGENCE_LOW is RESERVED — unreachable.')),
};

export function getPredicateActualValue(ctx: PredicateEvalContext, clause: PredicateClause): Promise<number> {
  return PREDICATE_ACTUAL_VALUE_READERS[clause.type](ctx);
}

/**
 * `predicateFreshnessMargin` — smaller = ranked EARLIER (shown first) by `selectVisiblePredicates`
 * (`horizon-feed.service.ts`), which sorts ascending by this value.
 *
 * ⚠ HONEST CORRECTION (P3-G C10 fix-in-passing, ⊥ C9 IMPORTANT — comment-only, ZERO logic change; the
 * selection behavior below is unchanged and stays ⊥-approved as shipped). The header this replaced
 * over-claimed the margin as "a genuine, derived-not-stored recency proxy" where "margin 0 = crossed THIS
 * instant". That is NOT what `actual − threshold` measures: it is an OVERSHOOT-MAGNITUDE proxy, not a
 * time-since-crossing proxy, and the two coincide only when every `*_MIN` clause accrues at the SAME rate.
 * They do not: `SESSIONS_CLOSED_MIN` grows at most once per session while `EXCEPTIONS_HANDLED_MIN` can grow
 * several times in ONE session, so two clauses can tie on raw margin while one crossed its threshold
 * sessions ago and the other crossed it minutes ago — a smaller margin is NOT reliably "more recent" across
 * clauses of different rates, it can misorder them. This is COSMETIC (the field is a "why this is relevant"
 * hint list, `meta.visible_predicates_shown` capped at ≤3 entries — nothing gates on the ORDER, only on
 * `satisfied`), so it ships ACCEPTED-AS-IS (register: decisions §4 **#26**, "#14-adjacent" — canon
 * `possibility_horizon.md:130` names crossing-recency as the selection criterion, this is the honestly-
 * disclosed forced approximation of it): a true recency ordering needs a per-clause crossing timestamp,
 * which the design deliberately does NOT persist (the BO `predicate-evaluation-log` append store, decisions
 * §4 **#14**, was evaluated and REJECTED — "a full eval log writes every session for every player forever";
 * TD if ops ever wants the real history). For a `*_MIN` clause: `margin = actual − threshold` (0 at the
 * clause's own threshold, growing with however far past it the counter currently sits — an ordering by
 * "how much slack this clause has", not "how long ago it crossed").
 *
 * `CURRENT_VOCAB_TIER_IS` is structurally different — an EQUALITY gate, not an accumulating count: on
 * every LIVE capability (design §6 table) it is declared FIRST and is the entry condition into the
 * "opportunity window" the OTHER two clauses then accumulate progress inside (e.g. VOCAB_TIER_3:
 * `CURRENT_VOCAB_TIER_IS(2)` gates, then `EXCEPTIONS_HANDLED_MIN(15)`/`SESSIONS_CLOSED_MIN(5)` accrue
 * WHILE tier 2 holds). It is ranked LAST via `+Infinity`, never via a literal margin (an equality
 * predicate's "how far past" is not a meaningful quantity: `actual === threshold` always, trivially 0,
 * which would WRONGLY tie it with a just-crossed counter).
 */
export function predicateFreshnessMargin(type: PredicateType, actual: number, threshold: number): number {
  if (type === PredicateType.CURRENT_VOCAB_TIER_IS) return Number.POSITIVE_INFINITY;
  return actual - threshold;
}
