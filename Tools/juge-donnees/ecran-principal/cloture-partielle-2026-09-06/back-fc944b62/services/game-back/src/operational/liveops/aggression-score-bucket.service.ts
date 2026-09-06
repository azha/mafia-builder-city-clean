// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C6 (AggressionScoreBucket
//             composite, D6) + E-LO-06 targeting
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.6
//             (live_ops_aggression_ledger) + §3.8 (AggressionScoreBucket enum)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md :108-117
//             ("Trigger = bucket ≥ aggressive AND 4+ violent ops in 7 days. Internal scalar count,
//             exposed only as bucket.")
//             Pattern: mirrors citysim/heat/heat-tunables.ts's `heatBucketRankOf`/`heatBucketNameOf`
//             split (a raw float -> qualitative band mapping, R2.2) + political-trigger-evaluators.ts's
//             `BPD_AGGREGATE_TRIGGER_REF`/`resolveBpdAggregateTriggerRank` (a registered composite
//             STRING tunable resolved via a LOCAL [PROV-Y26Q2] ref map, not re-derived inline).
//             — 04e-B C6 — 2026-07-06
//
// `AggressionScoreBucketService` — the D6 composite: `AggressionScoreBucket`
// (`peaceful|active|aggressive|violent_spree`) derived from a windowed COUNT over
// `live_ops_aggression_ledger` (migration 0116). R2.2 (LOAD-BEARING — this composite is the WHOLE
// reason C6 exists, catalogue.md:117 "aggression score used as scalar trigger filter" is the FORBIDDEN
// pattern this composite migrates away from): the raw windowed count is INTERNAL ONLY
// (`countViolentOpsInWindow`) — ONLY the bucket enum (`bucketForCount`/`getBucketForPlayer`) may ever
// reach a controller response, and even then ONLY the gated `_test/liveops/aggression-bucket` probe
// does so today (no player/BO surface exists yet — C8/C9 land later).
//
// BUCKET-FLOOR RESOLUTION (the interpretive call this chunk makes, stated explicitly for the reviewer):
// canon's single sentence ("Trigger = bucket >= aggressive AND 4+ violent ops in 7 days") reads as ONE
// clarification, not two independently-configurable numbers that happen to share a default. So the
// `aggressive` bucket floor is DEFINED as a SCALE of the ALREADY-REGISTERED
// `liveOpsTunables.elo06AggressionThresholdViolentOpsCount` (R2.3 REUSE — never a second, independently
// re-derived "4+" magic number) — by default (scale=1) the `aggressive` floor IS EXACTLY that getter's
// value (4), which is what makes "bucket >= aggressive" and "4+ violent ops" the SAME condition by
// construction, not a redundant AND. The registered composite string
// `liveOpsTunables.aggressionScoreBucketThresholds` (C1, default 'composite:scaled') supplies the SCALE
// factor via `AGGRESSION_SCORE_BUCKET_SCALE_REF` below — so BOTH registered tunables independently move
// the effective floor when flipped (the C6 test floor's falsifiable requirement), without inventing a
// SECOND unrelated numeric key for the same canon concept.
//
// Determinism: NO Math.random(). The windowed count's "now" boundary is `LiveOpsClockPort.now()`
// (DD-B3) — never an inline `Date.now()`/`new Date()`.

import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { liveOpsAggressionLedger } from '../../db/schema/live_ops_aggression_ledger';
import { LIVE_OPS_CLOCK, type LiveOpsClockPort } from './live-ops-clock.port';
import { liveOpsTunables } from './live-ops.tunables';
import type { AggressionScoreBucket } from './live-ops.types';

// Real-time-day -> millisecond conversion — mirrors live-ops-cadence-controller.ts's own
// MS_PER_REAL_DAY constant (each file defines it locally; this codebase's established convention for
// this trivial, file-local structural constant — see live-ops-event.service.ts / unconformity.service.ts).
const MS_PER_REAL_DAY = 24 * 60 * 60 * 1000;

/**
 * `AGGRESSION_SCORE_BUCKET_SCALE_REF` — resolves the ALREADY-REGISTERED composite string
 * `liveOpsTunables.aggressionScoreBucketThresholds` (C1, default `'composite:scaled'`) to a SCALE
 * factor applied to the ALREADY-REGISTERED `liveOpsTunables.elo06AggressionThresholdViolentOpsCount`
 * (REUSE, R2.3 — see the file header's "BUCKET-FLOOR RESOLUTION" note for the full reasoning). Mirrors
 * `BPD_AGGREGATE_TRIGGER_REF` (`political-trigger-evaluators.ts`) — a LOCAL `[PROV-Y26Q2]` ref map,
 * NOT a new registry key (the composite key itself is already registered; this only decomposes it).
 *
 * `'composite:scaled'` (default): `aggressive` floor = `1 x` the base count (so it EQUALS
 * `elo06AggressionThresholdViolentOpsCount`, default 4 — canon's "4+ violent ops" verbatim);
 * `violent_spree` floor = `2x` that same base (default 8 — "scaled" headroom, matching the SAME
 * tunable's own registered range ceiling, gdd/14 `2..8` — not a fabricated new number).
 * `'composite:strict'` `[PROV-Y26Q2 headroom]`: a stricter escalation (`aggressive` = `1.5x`,
 * `violent_spree` = `3x`) — an unrecognized override string falls back to `'composite:scaled'` (a
 * safe, documented default — never silently 0/always-true), mirroring `BPD_AGGREGATE_TRIGGER_REF`'s
 * own fallback-to-`HOT` precedent.
 */
const AGGRESSION_SCORE_BUCKET_SCALE_REF: Readonly<
  Record<string, { readonly aggressiveScale: number; readonly violentSpreeScale: number }>
> = {
  'composite:scaled': { aggressiveScale: 1,   violentSpreeScale: 2 },
  'composite:strict':  { aggressiveScale: 1.5, violentSpreeScale: 3 }, // [PROV-Y26Q2] headroom
};

/** Resolve the current `{ active, aggressive, violentSpree }` count floors from the two registered
 *  tunables (fresh read every call, R2.3 — never cached/hardcoded). `active`'s floor (1) is a
 *  structural literal (any op at all — mirrors E-POL-07's own "literal target-0, not a balance dial"
 *  precedent), not a registry tunable. */
function resolveBucketFloors(): { readonly active: number; readonly aggressive: number; readonly violentSpree: number } {
  const base = liveOpsTunables.elo06AggressionThresholdViolentOpsCount;
  const scaleTag = liveOpsTunables.aggressionScoreBucketThresholds;
  const scaleRef = AGGRESSION_SCORE_BUCKET_SCALE_REF[scaleTag] ?? AGGRESSION_SCORE_BUCKET_SCALE_REF['composite:scaled']!;
  return {
    active: 1,
    aggressive: Math.ceil(base * scaleRef.aggressiveScale),
    violentSpree: Math.ceil(base * scaleRef.violentSpreeScale),
  };
}

/**
 * Pure: map a raw windowed violent-ops COUNT to its `AggressionScoreBucket` (R2.2 — the raw count is
 * INTERNAL only; this bucket NAME is the only thing ever allowed to escape to a controller response).
 * Mirrors `heatBucketNameOf` (`citysim/heat/heat-tunables.ts`).
 */
export function bucketForCount(violentOpsCount: number): AggressionScoreBucket {
  const floors = resolveBucketFloors();
  if (violentOpsCount >= floors.violentSpree) return 'violent_spree';
  if (violentOpsCount >= floors.aggressive) return 'aggressive';
  if (violentOpsCount >= floors.active) return 'active';
  return 'peaceful';
}

/**
 * Pure: the minimum windowed count required to REACH a given bucket (the inverse of `bucketForCount`)
 * — consumed by `cohort-targeting.service.ts`'s `evaluateCohortTargeting` to resolve
 * `CohortTargetingFilter.aggression` (E-LO-06's "bucket >= aggressive" targeting dimension) inside its
 * single batched SQL query.
 */
export function countFloorForBucket(bucket: AggressionScoreBucket): number {
  if (bucket === 'peaceful') return 0;
  const floors = resolveBucketFloors();
  if (bucket === 'active') return floors.active;
  if (bucket === 'aggressive') return floors.aggressive;
  return floors.violentSpree; // 'violent_spree'
}

@Injectable()
export class AggressionScoreBucketService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // DD-B3: the injectable real-time seam — the window boundary is derived from this, NEVER Date.now().
    @Inject(LIVE_OPS_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {}

  /**
   * The INTERNAL windowed violent-ops count for one player (R2.2 — NEVER exposed raw on a
   * player/BO-facing surface; today the ONLY caller outside this service is the gated
   * `_test/liveops/aggression-bucket` probe, C6). Windowed over
   * `liveops.elo06_aggression_threshold_window_days` (default 7) trailing REAL days from
   * `LiveOpsClockPort.now()` (DD-B3 — never an inline `Date.now()`).
   */
  async countViolentOpsInWindow(playerId: string): Promise<number> {
    const windowDays = liveOpsTunables.elo06AggressionThresholdWindowDays;
    const windowStart = new Date(this.clock.now().getTime() - windowDays * MS_PER_REAL_DAY);

    const [row] = await this.db
      .select({ violentOpsCount: count() })
      .from(liveOpsAggressionLedger)
      .where(and(
        eq(liveOpsAggressionLedger.player_id, playerId),
        gte(liveOpsAggressionLedger.occurred_at, windowStart),
      ));
    return Number(row?.violentOpsCount ?? 0);
  }

  /** The D6 composite for one player — the ONLY thing R2.2 permits a future player/BO surface to read. */
  async getBucketForPlayer(playerId: string): Promise<AggressionScoreBucket> {
    const violentOpsCount = await this.countViolentOpsInWindow(playerId);
    return bucketForCount(violentOpsCount);
  }
}
