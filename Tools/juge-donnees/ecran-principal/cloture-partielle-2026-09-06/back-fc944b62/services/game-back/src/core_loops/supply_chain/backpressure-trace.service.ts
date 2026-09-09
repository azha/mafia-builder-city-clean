// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C6 ("endpoints trace
//             hop-par-hop (§6.3 — jamais le chemin complet), resolve ADD_CAPACITY|FIX_DOWNSTREAM
//             (acquittement honnête + action_ref + next_warmest ≤3 buckets)")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.3 (the trace verb,
//             verbatim endpoint/response shapes) + §13 (R2.2/P5 murs — buckets/ids only, no raw scalar).
//             Pattern: `LegMaintenanceService`'s own "one service, JS-shaped result, controller maps to
//             the wire response" split + the C5 ⊥ MINOR-2 finding ("any `blocked_sources` consumer must
//             gate on `is_blocked_output`" — `applyRelief` clears `is_blocked_output`/`arrow_to_building_
//             id` immediately but leaves `blocked_sources` stale) — EVERY method below reads
//             `isBlockedOutput` to decide "is this genuinely a source right now", and reads
//             `blockedSources` ONLY after that gate has already confirmed the row is fresh this tick
//             (`resolve`'s `action_ref` build, the ONE place this file touches `blockedSources` at all).
//             — P3-C C6 — 2026-07-12
//
// `BackpressureTraceService` — Loop 3's player-facing diagnostic surface (design §6.3), hop-by-hop by
// construction: the server knows the WHOLE upstream chain (the `arrow_to_building_id` links written by
// `BackpressureUpdateService`'s BFS, C5) but never reveals more than ONE hop per call (no panopticon-dump,
// canon backpressure_trace.md:91) — three methods:
//
//   `getBackpressureView`  — GET  .../backpressure  → `{ bucket, has_arrow }` (never the raw index).
//   `traceStep`            — POST .../trace-step    → `{ next_node_ref, next_bucket, at_source }`. Reads
//     the QUERIED building's own row: if it is ITSELF a genuine source (`isBlockedOutput`) the trace ends
//     HERE (`at_source: true`, `next_node_ref: null`, `next_bucket` = its OWN bucket — the degenerate
//     "you started already at the source" case); otherwise, if it has an arrow, ONE more hop is revealed —
//     `next_node_ref` = the arrow target, `next_bucket` = THAT node's bucket (a second, targeted
//     single-row read, still only ONE hop's worth of information), and `at_source` reports whether THAT
//     revealed neighbor is ITSELF the source (`isBlockedOutput`, the SAME MINOR-2 gate, read off the
//     SAME single-row read that already fetched `next_bucket` — no extra query). A node with neither
//     (never touched, or already relieved) has nothing to trace from (`at_source: false`, `next_node_ref:
//     null`). Walking `next_node_ref` back into a subsequent `traceStep` call is how a client follows the
//     chain hop-by-hop — starting 3 hops from the source, 3 successive calls (each landing on the NEXT
//     node in the chain) end with the 3rd call's `at_source: true` (that call's OWN revealed neighbor —
//     one hop away from where the walk started that call — IS the source).
//   `resolve`              — POST .../resolve {mode} → `{ action_ref, next_warmest_cluster }`. Design
//     §6.3's own "À la source" — only meaningful once the trace has actually reached a genuine source
//     (`isBlockedOutput`, the SAME MINOR-2 gate); a call on a non-source building 409s `TRACE_NOT_AT_
//     SOURCE`. State-not-theatre (design §6.3/D14): this method NEVER writes `backpressure_index`/
//     `is_blocked_output`/`arrow_to_building_id` — the pressure only ever moves via the REAL
//     `BACKPRESSURE_UPDATE` tick (accrual/propagation/relief). "Enregistre la décision de trace (BO
//     analytics)" is realized here as a structured log line — no dedicated trace-decision TABLE was
//     authored at C1 (design §10 lists only `supply_chain_legs`/`supply_node_pressure`/the 3 route
//     columns), so a durable store for C9's own `GET /admin/players/:id/trace-history` BO endpoint is an
//     honest gap, flagged for C9/C10 TD-routing (decisions §5's own "closeout-only" TD convention) rather
//     than inventing a NEW migration outside this chunk's declared scope.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { SupplyNodePressureRepository } from './supply-node-pressure.repository';
import { backpressureBucket, type BackpressureBucket } from './backpressure-bucket';
import { coreLoopsTunables } from '../core-loops-tunables';

/** design §6.3 — "les ≤3 nodes les plus chauds restants" — a fixed structural response-shape cap, NOT a
 *  registered tunable (design §12's tunables catalogue enumerates no key for this; it is a response-shape
 *  constant like `oneDecisionQueueDepthVisible`'s OWN "top-3" canon wording, but unlike that getter this
 *  one has no canon numeric row to register against — mirrors the `FIXED_URGENCY_HIGH`-class literal
 *  convention HL card providers already use for design-mandated, non-tunable constants). */
const NEXT_WARMEST_CLUSTER_LIMIT = 3;

/** The 2 trace-resolve modes design §6.3 names verbatim. */
const RESOLVE_MODES = ['ADD_CAPACITY', 'FIX_DOWNSTREAM'] as const;
type ResolveMode = (typeof RESOLVE_MODES)[number];

function isValidResolveMode(mode: string): mode is ResolveMode {
  return (RESOLVE_MODES as readonly string[]).includes(mode);
}

export interface BackpressureView {
  readonly bucket: BackpressureBucket;
  readonly hasArrow: boolean;
}

export interface TraceStepView {
  readonly nextNodeRef: string | null;
  readonly nextBucket: BackpressureBucket;
  readonly atSource: boolean;
}

export interface WarmestClusterEntry {
  readonly buildingId: string;
  readonly bucket: BackpressureBucket;
}

export interface ResolveView {
  readonly actionRef: string;
  readonly nextWarmestCluster: readonly WarmestClusterEntry[];
}

@Injectable()
export class BackpressureTraceService {
  private readonly logger = new Logger(BackpressureTraceService.name);

  constructor(private readonly pressureRepository: SupplyNodePressureRepository) {}

  private bucketOf(index: number): BackpressureBucket {
    return backpressureBucket(
      index,
      coreLoopsTunables.backpressureMildThreshold,
      coreLoopsTunables.backpressureWarmThreshold,
      coreLoopsTunables.backpressureCriticalThreshold,
    );
  }

  /** `GET /v1/supply-chain/nodes/:buildingId/backpressure` (design §6.3) — `{bucket, has_arrow}`, NEVER
   *  the raw `backpressure_index` (R2.2). A building with no row at all (never touched) reads as `silent`
   *  / no arrow — the SAME zero-state `readAllRaw`'s callers already treat an absent row as. */
  async getBackpressureView(playerId: string, buildingId: string): Promise<BackpressureView> {
    const row = await this.pressureRepository.findOne(playerId, buildingId);
    return {
      bucket: this.bucketOf(row?.backpressureIndex ?? 0),
      hasArrow: row?.arrowToBuildingId != null,
    };
  }

  /** `POST /v1/supply-chain/nodes/:buildingId/trace-step` (design §6.3) — reveals ONE hop. See file
   *  header for the full at_source/next_node_ref/next_bucket shape rationale. */
  async traceStep(playerId: string, buildingId: string): Promise<TraceStepView> {
    const row = await this.pressureRepository.findOne(playerId, buildingId);

    // C5 ⊥ MINOR-2 gate: `isBlockedOutput` is the ONLY reliable "genuinely a source right now" signal —
    // never `blockedSources` (stale post-relief, see file header).
    if (row?.isBlockedOutput) {
      return { nextNodeRef: null, nextBucket: this.bucketOf(row.backpressureIndex), atSource: true };
    }

    if (row?.arrowToBuildingId) {
      const next = await this.pressureRepository.findOne(playerId, row.arrowToBuildingId);
      return {
        nextNodeRef: row.arrowToBuildingId,
        nextBucket: this.bucketOf(next?.backpressureIndex ?? 0),
        // C5 ⊥ MINOR-2 gate applies to the REVEALED neighbor too — `isBlockedOutput`, never
        // `blockedSources` (the SAME single read that already fetched `next_bucket` above).
        atSource: next?.isBlockedOutput === true,
      };
    }

    // No arrow, not a source: nothing to trace from here (organic — no active backpressure signal at all,
    // whether because the building was never touched or because it has fully relieved).
    return { nextNodeRef: null, nextBucket: this.bucketOf(row?.backpressureIndex ?? 0), atSource: false };
  }

  /** `POST /v1/supply-chain/nodes/:buildingId/resolve {mode}` (design §6.3) — see file header. Throws
   *  `VALIDATION_FAILED` (422) on an unknown mode, `TRACE_NOT_AT_SOURCE` (409) when `:buildingId` is not
   *  CURRENTLY a diagnosed source (the MINOR-2-gated precondition — mirrors `at_source` above exactly). */
  async resolve(playerId: string, buildingId: string, mode: string): Promise<ResolveView> {
    if (!isValidResolveMode(mode)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `mode must be one of ADD_CAPACITY | FIX_DOWNSTREAM (got "${mode}").`,
      });
    }

    const row = await this.pressureRepository.findOne(playerId, buildingId);
    if (!row?.isBlockedOutput) {
      throw new ApiError('TRACE_NOT_AT_SOURCE', {
        message: `building ${buildingId} is not currently a diagnosed backpressure source for this player.`,
      });
    }

    // Safe to read `blockedSources` HERE — `isBlockedOutput` just confirmed this row was written THIS
    // (or a very recent) tick, not a stale post-relief leftover (the MINOR-2 gate this file guards against
    // everywhere else). Stable-sorted (D13) — a building tagged by >1 source picks a deterministic primary.
    const primarySource = [...row.blockedSources].sort()[0] ?? 'UNKNOWN_SOURCE';
    const actionRef = `${mode}:${primarySource}:${buildingId}`;

    // §6.3 "enregistre la décision de trace (BO analytics)" — an honest structured log (no dedicated
    // trace-decision table exists yet, see file header); the acknowledgement is the record, not a state
    // mutation. §6.3/D14 state-not-theatre: NOTHING in `supply_node_pressure` is written by this call — the
    // pressure only ever moves via the real `BACKPRESSURE_UPDATE` tick.
    this.logger.log(
      `resolve: player=${playerId} building=${buildingId} mode=${mode} primary_source=${primarySource} ` +
        '-> diagnostic decision recorded (backpressure_index untouched, state-not-theatre).',
    );

    const all = await this.pressureRepository.readAllRaw(playerId);
    const nextWarmestCluster: WarmestClusterEntry[] = all
      .filter((n) => n.buildingId !== buildingId)
      .map((n) => ({ buildingId: n.buildingId, index: n.backpressureIndex, bucket: this.bucketOf(n.backpressureIndex) }))
      .filter((n) => n.bucket !== 'silent')
      // Server-only ranking by the raw index (never returned) — highest pressure first, D13 stable
      // building_id tie-break.
      .sort((a, b) => (b.index !== a.index ? b.index - a.index : a.buildingId.localeCompare(b.buildingId)))
      .slice(0, NEXT_WARMEST_CLUSTER_LIMIT)
      .map((n) => ({ buildingId: n.buildingId, bucket: n.bucket }));

    return { actionRef, nextWarmestCluster };
  }
}
