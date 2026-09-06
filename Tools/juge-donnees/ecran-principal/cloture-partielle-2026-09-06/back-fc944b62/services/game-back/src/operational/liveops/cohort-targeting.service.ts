// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C0 (cohort-key decision-record)
//             + C2 (evaluateCohortTargeting predicate engine + cohortKeyFor — REAL implementation)
//             + C6 (the `aggression` dimension — E-LO-06 real targeting)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.3-3.4
//             Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §4
//             — 04e-B C0 — 2026-07-06
//             — 04e-B C2 — 2026-07-06 (real `evaluateCohortTargeting`/`cohortKeyFor` + registered as a
//             provider in LiveOpsModule)
//             — 04e-B C6 — 2026-07-06 (the `aggression` dimension is now REAL — a single batched SQL
//             sub-query over `live_ops_aggression_ledger`, GROUP BY/HAVING count >=
//             `countFloorForBucket(filter.aggression)`; see `aggression-score-bucket.service.ts`'s
//             header for the bucket-floor resolution reasoning, D6)
//
// `CohortTargetingService` — resolves a static `CohortTargetingFilter` predicate (live-ops.types.ts,
// C1) to a concrete `PlayerId[]` via a SINGLE batched SQL query (F4 — no per-player polling loop,
// design §3.3 / `liveops_event_catalogue.md:346`), and computes the D1 deterministic cohort-key hash
// (`cohortKeyFor`, design §3.4) an activation stores on `live_ops_event_active.cohort_key` (C2,
// migration 0114).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// DECISION RECORD — cohort-key convention (resolves C3-M3 — honest, PARTIAL scope)
// (verbatim-adapted from design §3.4 / decisions §4 — the two companion docs are the source of truth;
// this header is the code-site anchor, not a fork of the decision)
// ════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `cohortKeyFor(eventId, filter)` = a deterministic hash (`cyrb53`, via `common/seeded-rng.ts`) of the
// CANONICAL SERIALIZATION of the resolved predicate: the tuple `{ eventId, tier, region[],
// activityWindow, aggressionBucket }` with keys sorted and absent fields omitted deterministically
// (`canonicalizeCohortPredicate` below). Identical predicate ⇒ identical `cohort_key` (asserted by
// `liveops_targeting.spec.ts`'s C2 determinism assertion + the C10 sweep). Stored on
// `live_ops_event_active.cohort_key` (C2, migration 0114).
//
// WHAT THIS RESOLVES: C3-M3 (`docs_int/tech_debt_inventory.md §3.4`) asks 04e-B to reconcile the
// `EffectScopeContext.cohortId` placeholder name (`config/effect-overlay-store.ts:74-77`) with a real
// cohort-key convention "before the first real consumer." This decision settles the NAMING/CONVENTION
// question: the reserved `cohortId` field / COHORT `scope_ref`, whenever first consumed, carries THIS
// predicate-hash — not an arbitrary string, not a re-derivation of TD-102's `cohort_overlay_hint`
// (a different concept, avoided by construction).
//
// WHAT THIS DOES NOT RESOLVE (stated honestly, not papered over): D1 rules that 04e-B's first REAL
// per-player consumer of the A1 engine applies the PLAYER scope (`evaluateCohortTargeting` resolves the
// predicate to a `PlayerId[]` at activation → PLAYER-scoped `effect_modifier` rows, `scope_ref =
// player_id`) — NOT the COHORT scope. So `effect_modifier.ts`'s schema comment ("COHORT … built here;
// consumed live by 04e-B") is only PARTIALLY honored by this lot: 04e-B settles the COHORT
// key-convention (this file) and consumes PLAYER live (C2/C4), but the first COHORT-scoped `applyEvent`
// remains UNEXERCISED — routed forward as **TD-178** (`docs_int/tech_debt_inventory.md`) / 04e-C. C10
// reconciled the C3-M3 tech-debt entry (`docs_int/tech_debt_inventory.md §3.4`) to read "naming/convention
// resolved; COHORT-apply deferred (→ TD-178)," not "closed."
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════
//
// SCOPE HONESTY (C2, updated C6): of `CohortTargetingFilter`'s 4 composite dimensions (`tier`,
// `region`, `recentActivity`, `aggression`), C2 wired the 2 LIVE dims the launch catalogue needed at
// the time — `tier` (player.tier) and `region` (player.region_id, 04d-C substrate). `recentActivity`
// STILL has no launch event consumer (live-ops.types.ts's own header note) — `evaluateCohortTargeting`
// still THROWS for it (anti-fig-leaf: never silently ignore an unresolvable targeting constraint).
// `aggression` (E-LO-06's targeting predicate) is NOW REAL as of C6 — resolved via a single batched SQL
// sub-query over `live_ops_aggression_ledger` (migration 0116), combined with `tier`/`region` in the
// SAME query (F4 — still no per-player polling loop).

import { Inject, Injectable } from '@nestjs/common';
import { and, gte, inArray, sql, type SQL } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { player } from '../../db/schema/player';
import { region } from '../../db/schema/region';
import { liveOpsAggressionLedger } from '../../db/schema/live_ops_aggression_ledger';
import { cyrb53 } from '../../common/seeded-rng';
import { LIVE_OPS_CLOCK, type LiveOpsClockPort } from './live-ops-clock.port';
import { liveOpsTunables } from './live-ops.tunables';
import { countFloorForBucket } from './aggression-score-bucket.service';
import type { CohortTargetingFilter } from './live-ops.types';

// Real-time-day -> millisecond conversion — mirrors live-ops-cadence-controller.ts's own
// MS_PER_REAL_DAY constant (each file defines it locally, this codebase's established convention).
const MS_PER_REAL_DAY = 24 * 60 * 60 * 1000;

/**
 * Canonically serialize `{ eventId, ...filter }` into a stable string: top-level keys sorted
 * alphabetically, absent fields omitted, `region[]` sorted (order-independence — two filters that
 * differ only in region-array ORDER must still hash identically). Pure/sync — no I/O, no
 * `Math.random`/`Date.now` (determinism, design §3.4/§5).
 */
export function canonicalizeCohortPredicate(eventId: string, filter: CohortTargetingFilter): string {
  const parts: Record<string, unknown> = { eventId };
  if (filter.tier !== undefined) parts['tier'] = { minTier: filter.tier.minTier };
  if (filter.region !== undefined) parts['region'] = [...filter.region].sort();
  if (filter.recentActivity !== undefined) parts['recentActivity'] = { withinDays: filter.recentActivity.withinDays };
  if (filter.aggression !== undefined) parts['aggression'] = filter.aggression;

  return Object.keys(parts)
    .sort()
    .map((key) => `${key}:${JSON.stringify(parts[key])}`)
    .join('|');
}

@Injectable()
export class CohortTargetingService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // C6: the aggression dimension's windowed-count sub-query needs the SAME real-clock boundary
    // every other live-ops real-time mechanic uses (DD-B3) — never an inline Date.now().
    @Inject(LIVE_OPS_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {}

  /**
   * `validateFilter` (04e-C C2, DD-C2 anti-fig-leaf) — pre-validates a `CohortTargetingFilter` BEFORE
   * `evaluateCohortTargeting` resolves it, so the composer's `POST /v1/admin/liveops/cohort-preview`
   * can return a clean **4xx** (`ApiError('VALIDATION_FAILED')`, `live-ops-admin.controller.ts`) instead
   * of leaking a bare 500 for the two known-unsupported inputs:
   *
   *   1. `recentActivity` — mirrors `evaluateCohortTargeting`'s own throw (`:128` below) — no launch
   *      event consumes this dimension yet.
   *   2. an unknown `region` id — `region_id` has NO TS enum (soft-ref string, `live-ops.types.ts:56-63`
   *      header note); the ONLY source of truth for validity is the `region` table itself (04d-C,
   *      `db/schema/region.ts`) — never a hardcoded region-name list. A caller who confuses a country
   *      code ('US') with a `region_id` ('us-east') previously got a SILENT zero-player count
   *      (`inArray` on a non-matching value just returns no rows) — the composer's own fig-leaf this
   *      chunk closes (decisions §2.2 DD-C2).
   *
   * Returns a list of human-readable validation problems (empty = the filter is valid — the caller may
   * proceed to `evaluateCohortTargeting`).
   */
  async validateFilter(filter: CohortTargetingFilter): Promise<string[]> {
    const problems: string[] = [];

    if (filter.recentActivity !== undefined) {
      problems.push(
        'The recentActivity targeting dimension is not resolvable — no launch event consumes it yet.',
      );
    }

    if (filter.region !== undefined && filter.region.length > 0) {
      const rows = await this.db
        .select({ region_id: region.region_id })
        .from(region)
        .where(inArray(region.region_id, filter.region as string[]));
      const validIds = new Set(rows.map((r) => r.region_id));
      const invalidIds = filter.region.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        problems.push(
          `Unknown region id(s): ${invalidIds.join(', ')}. Must be a real region_id (see the region ` +
          `table) — e.g. a country code like 'US' is NOT a valid region_id ('us-east' is).`,
        );
      }
    }

    return problems;
  }

  /**
   * Resolve a static `CohortTargetingFilter` predicate to the concrete set of targeted `PlayerId`s, as
   * a SINGLE batched SQL query over `player` (F4 — no per-player polling loop). `{}` (no dimension set)
   * resolves to EVERY player (canon "all players" targeting, E-LO-02/07/08).
   *
   * `eventId` does not itself narrow the SELECT — it participates only in `cohortKeyFor`'s canonical
   * serialization (design §3.4), so an IDENTICAL filter targeting two DIFFERENT events resolves to the
   * SAME player set but a DIFFERENT cohort key.
   *
   * `aggression` (C6, E-LO-06's targeting dimension): resolved via a correlated-free `IN (SELECT ...
   * GROUP BY ... HAVING COUNT(*) >= $requiredCount)` sub-query over `live_ops_aggression_ledger`,
   * embedded in the SAME batched query as `tier`/`region` (still ONE round-trip, F4). `requiredCount`
   * is `countFloorForBucket(filter.aggression)` (`aggression-score-bucket.service.ts`) — for
   * `'aggressive'` (E-LO-06's only consumer today) this is the `AggressionScoreBucket` composite's
   * `aggressive` floor, R2.2/D6.
   *
   * @throws if `filter.recentActivity` is set — this dimension has no launch event consumer
   *   (live-ops.types.ts CohortTargetingFilter header note). Never silently ignored (anti-fig-leaf).
   */
  async evaluateCohortTargeting(eventId: string, filter: CohortTargetingFilter): Promise<string[]> {
    void eventId;

    if (filter.recentActivity !== undefined) {
      throw new Error(
        'evaluateCohortTargeting: the recentActivity targeting dimension is not resolvable — ' +
        'no launch event uses it (live-ops.types.ts CohortTargetingFilter header note).',
      );
    }

    const conditions: SQL[] = [];
    if (filter.tier !== undefined) {
      conditions.push(gte(player.tier, filter.tier.minTier));
    }
    if (filter.region !== undefined && filter.region.length > 0) {
      conditions.push(inArray(player.region_id, filter.region as string[]));
    }
    if (filter.aggression !== undefined) {
      const windowDays = liveOpsTunables.elo06AggressionThresholdWindowDays;
      const windowStart = new Date(this.clock.now().getTime() - windowDays * MS_PER_REAL_DAY);
      const requiredCount = countFloorForBucket(filter.aggression);

      conditions.push(sql`${player.player_id} IN (
        SELECT ${liveOpsAggressionLedger.player_id}
        FROM ${liveOpsAggressionLedger}
        WHERE ${liveOpsAggressionLedger.occurred_at} >= ${windowStart}
        GROUP BY ${liveOpsAggressionLedger.player_id}
        HAVING COUNT(*) >= ${requiredCount}
      )`);
    }

    const rows = await this.db
      .select({ playerId: player.player_id })
      .from(player)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return rows.map((r) => r.playerId);
  }

  /**
   * `cohortKeyFor` — the D1 deterministic predicate hash (design §3.4). Pure/sync: canonically
   * serializes `{ eventId, ...filter }` (see `canonicalizeCohortPredicate` above), then hashes it with
   * `cyrb53` (REUSE `common/seeded-rng.ts` — no re-implemented string hashing). Identical predicate ⇒
   * identical key; base-36 encoding for a compact `text` column value.
   */
  cohortKeyFor(eventId: string, filter: CohortTargetingFilter): string {
    const canonical = canonicalizeCohortPredicate(eventId, filter);
    return cyrb53(canonical).toString(36);
  }
}
