// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C6 ("`MetricKindEnum` LIVE/
//             RESERVED (design D10/§9.1 — SAFEHOUSE LIVE ... COURIER LIVE derived ... REVENUE RESERVED;
//             boot strict-check — R3)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §9.1 (the closed
//             `MetricKindEnum` registry, ★H-3 RATIFIED 2-LIVE + 1-RESERVED) + D10 (SAFEHOUSE via
//             `erlang-stash.repository.ts` + `loadBucket`; COURIER derived `completed/(completed+caught)`
//             over `courier_shift`; REVENUE — no `route` revenue column).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §5/R3 (★ DEFINITIVE — the
//             seam table's own SAFEHOUSE citation names the WRONG method: `listAllSafehouses` [`:170`] is
//             player-UNSCOPED; the CORRECT per-player read is `listSafehouses(playerId)` [`:115`]. Courier
//             window left OPEN — "genuinely open, not a drift, C6's own call" — resolved below as ALL-TIME,
//             see `COURIER_DELIVERY_RATE`'s own reader for the disclosed reasoning).
//             Pattern (closed map keyed by an enum, a bundled read-context — never a per-call DI resolve —
//             a boot strict-check taking the emitted set as a PARAMETER): `constraint-evaluators.ts` (C3 —
//             the DeviationEvaluator's own sibling registry, the SAME closed-world discipline this file
//             mirrors for the OTHER closed registry this lot introduces).
//             — P3-H C6 — 2026-07-24
//
// `metric-sources.ts` — the closed `MetricKind` registry (design §9.1): 2 LIVE members (each reads a REAL
// surface, READ-ONLY, "no copy" indirection — the `MetricValueRef` contract, R3) + 1 RESERVED member (held,
// never read — `validateMetricRegistryStrictMode` refuses any set naming it, mirroring `constraint-
// evaluators.ts#validateConstraintRegistryStrictMode` verbatim). `readLiveMetricValue` is the ONLY place
// this lot ever reads a live metric snapshot — `BenchmarkDriftService` calls it once per LIVE metric per
// tick, always against the CURRENT real state (never a cached/copied value — R3's "no copy" indirection).

import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../db';
import { courierShift } from '../db/schema/operational_chain';
import type { ErlangStashRepository } from '../citysim/erlang_stash/erlang-stash.repository';

/** `metric_kind` pgEnum domain (design §3/§9.1 — mig 0141, C1 schema). */
export type MetricKind = 'SAFEHOUSE_UTILIZATION' | 'COURIER_DELIVERY_RATE' | 'REVENUE_PER_ROUTE';

/** The 2-LIVE subset (★H-3 RATIFIED 2026-07-24 — 2 LIVE + 1 RESERVED, decisions §6/D10). */
export type LiveMetricKind = 'SAFEHOUSE_UTILIZATION' | 'COURIER_DELIVERY_RATE';

/** The LIVE subset (design §9.1) — `validateMetricRegistryStrictMode` refuses any emitted metric kind
 *  outside this set (the closed-world rule, mirrors `LIVE_CONSTRAINT_TYPES`). */
export const LIVE_METRIC_KINDS: ReadonlySet<MetricKind> = new Set(['SAFEHOUSE_UTILIZATION', 'COURIER_DELIVERY_RATE']);

/** The ordered LIVE list `BenchmarkDriftService.runTick` iterates — the SINGLE source of truth for "which
 *  metrics get a baseline row/drift tick": the service can never accidentally iterate `REVENUE_PER_ROUTE`
 *  because this literal array is the only iteration surface it has (closed-by-construction, not merely
 *  closed-by-check). */
export const LIVE_METRIC_KINDS_LIST: readonly LiveMetricKind[] = ['SAFEHOUSE_UTILIZATION', 'COURIER_DELIVERY_RATE'];

/**
 * The closed-world boot check (design §9.1: "Boot strict-check: LIVE ⇒ a `MetricValueRef` read surface
 * present; RESERVED ⇒ no read, never surfaced" — mirrors `validateConstraintRegistryStrictMode` verbatim,
 * "takes the catalogue as a PARAMETER, never a hardcoded read", so the SAME real validator can be exercised
 * against a test-only, deliberately-broken clone without ever mutating production code). Throws on the
 * FIRST RESERVED member found. `VerticalHorizonModule.onApplicationBootstrap` calls this unconditionally
 * against `LIVE_METRIC_KINDS_LIST` (trivially passes today — the real protection is against FUTURE drift:
 * a later edit that adds `REVENUE_PER_ROUTE` to that list without also promoting it here fails NestJS boot
 * loudly, the SAME "loud misconfiguration" convention every sibling closed-world check in this codebase
 * uses).
 */
export function validateMetricRegistryStrictMode(emittedTypes: readonly MetricKind[]): void {
  for (const type of emittedTypes) {
    if (!LIVE_METRIC_KINDS.has(type)) {
      throw new Error(
        `[metric-sources] "${type}" is RESERVED (no real substrate on this base) — it must never be read ` +
          '(closed-world strict check, design §9.1, ★H-3 2-LIVE + 1-RESERVED).',
      );
    }
  }
}

/**
 * Everything a metric reader needs, bundled once per `BenchmarkDriftService.runTick` call (mirrors
 * `ConstraintEvalContext`'s own "bundle the repos, never a per-clause DI resolve" shape).
 */
export interface MetricReadContext {
  readonly db: DrizzleClient;
  readonly erlangStashRepo: ErlangStashRepository;
}

type MetricReaderFn = (ctx: MetricReadContext, playerId: string) => Promise<number>;

/**
 * `SAFEHOUSE_UTILIZATION` (design §9.1/D10 — LIVE, ★H-3) — C0-reanchor §5/R3 ★ DEFINITIVE: `listSafehouses
 * (playerId)` (`erlang-stash.repository.ts:115`), NEVER `listAllSafehouses` (`:170`, player-UNSCOPED). The
 * "utilization %" is the plain average of `current_fill` (already a 0-100 per-slot percent — no separate
 * capacity/fill ratio needed, unlike the district-level `political-event.repository.ts:527` formula-shape
 * precedent C0-reanchor cited) over the ACTIVE slots (`slice(0, slot_count)`, the SAME "active set" `load
 * Bucket` uses) of EVERY safehouse this player holds — a single pooled average across all safehouses, not
 * one bucket per safehouse (this metric is a SINGLE per-player scalar, unlike the district-level projection).
 * A player with zero safehouses -> 0, a real "no track record yet" value, never fabricated. This was
 * the organic Phase-1 reality for EVERY player before LOT PLANQUE gave `safehouses` its first
 * application writer; the welcome grant now seeds one safehouse per fresh player, so this branch is
 * the genuine edge case today, not the default. Clamped to [0,100] defensively (`current_fill` can exceed 100
 * for an open-parcel slot, `loadBucket`'s own doc comment — "utilization" is a bounded percent by
 * definition). Deterministic, no RNG, no copy — a fresh read every call (R3's "no copy" indirection).
 */
async function readSafehouseUtilizationPct(ctx: MetricReadContext, playerId: string): Promise<number> {
  const safehouses = await ctx.erlangStashRepo.listSafehouses(playerId);
  const activeFills: number[] = [];
  for (const s of safehouses) {
    activeFills.push(...s.current_fill.slice(0, Math.max(0, Math.floor(s.slot_count))));
  }
  if (activeFills.length === 0) return 0;
  const avg = activeFills.reduce((acc, f) => acc + (Number.isFinite(f) ? f : 0), 0) / activeFills.length;
  return Math.max(0, Math.min(100, avg));
}

/**
 * `COURIER_DELIVERY_RATE` (design §9.1/D10 — LIVE, ★H-3) — `completed/(completed+caught) * 100` over the
 * player's `courier_shift` rows (`operational_chain.ts:51/:323`, the `courier_shift_player_status_idx`
 * composite index on `(player_id, status)` — ready-made for this exact `GROUP BY status` aggregation, C0-
 * reanchor §5/R3). `in_transit` shifts are EXCLUDED from both numerator and denominator (neither delivered
 * nor caught — an open shift carries no verdict yet, design's own literal formula names only the two
 * closed outcomes).
 *
 * ★ WINDOW (coder-disclosed, C0-reanchor §5/R3's own "genuinely open... C6's own call, not a C0 blocker" —
 * no existing precedent pins either direction, and design/§12's tunables list carries NO window-size knob):
 * realized as ALL-TIME (every `completed`/`caught` row this player has ever accrued), not a rolling
 * recent-N-days window. A windowed variant would need a NEW tunable (`§12` lists none) and a NEW date/tick
 * filter this design never names — ALL-TIME is the honest, zero-new-surface reading of "a real read, window
 * = R3" that introduces no undisclosed knob. Flagged here for the reviewer/controller, not slipped in.
 *
 * Zero finished shifts (fresh player, or every shift still `in_transit`) -> 0 (a real "no track record yet"
 * value — the SAME now-edge-case posture `readSafehouseUtilizationPct` establishes above).
 */
async function readCourierDeliveryRatePct(ctx: MetricReadContext, playerId: string): Promise<number> {
  const rows = await ctx.db
    .select({ status: courierShift.status, n: sql<number>`count(*)::int` })
    .from(courierShift)
    .where(and(eq(courierShift.player_id, playerId), sql`${courierShift.status} IN ('completed', 'caught')`))
    .groupBy(courierShift.status);

  let completed = 0;
  let caught = 0;
  for (const r of rows) {
    if (r.status === 'completed') completed = Number(r.n);
    else if (r.status === 'caught') caught = Number(r.n);
  }
  const total = completed + caught;
  if (total === 0) return 0;
  return (completed / total) * 100;
}

const METRIC_READERS: Readonly<Record<LiveMetricKind, MetricReaderFn>> = {
  SAFEHOUSE_UTILIZATION: readSafehouseUtilizationPct,
  COURIER_DELIVERY_RATE: readCourierDeliveryRatePct,
};

/**
 * Read ONE LIVE metric's CURRENT real value for a player — the `MetricValueRef` indirection itself (R3: "no
 * copy", always a fresh read against the live source). The closed-map dispatch (mirrors `constraint-
 * evaluators.ts#evaluateConstraintClause` verbatim).
 */
export function readLiveMetricValue(ctx: MetricReadContext, metricKind: LiveMetricKind, playerId: string): Promise<number> {
  return METRIC_READERS[metricKind](ctx, playerId);
}
