// IMPLEMENTS: docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 8 (C8)
//             insurance_mechanics.md §4.1 (:46-56 — FENCE_DEFAULT coverage type)
//             DD-PRODUCERS-MINIMAL (design §4): minimal deterministic fence-default producer
//             — Insurance C8 — 2026-06-17
//
// `FenceDefaultService` — the INSURANCE fence-default NIGHTLY tick (System 12 minimal).
//
// Registered at Cadence.NIGHTLY / order 8 (the next FREE NIGHTLY slot after
// INSURANCE_WALK_OBSERVATION/7) by InsuranceModule.onApplicationBootstrap().
//
// BEHAVIOUR (one call per in-game night per player):
//   1. Read `fence_default_exposure_threshold` from insuranceTunables.
//      Le défaut livré est POSITIF (0.80, voir le getter) : ce tick n'est PAS inerte. Il ne sort
//      immédiatement que si un déploiement pose explicitement une valeur <= 0.
//   2. Query all `laundering_nodes` rows WHERE player_id = ctx.playerId.
//      If none: RETURN (organic no-op).
//   3. Retain only nodes whose `buffer_load > threshold` (above-threshold cohort).
//      `buffer_load` is on `laundering_nodes` (substrate correction — NOT `tail_risk_estimates`).
//      If empty: RETURN (threshold not crossed).
//   4. Deterministic selection (C4 — NO Math.random()):
//      For each above-threshold node, compute
//        nodeRegionInt = parseInt(node.node_id.replace(/-/g,'').slice(0, 8), 16) % 1_000_000
//        seed          = MarketRngService.seedFromDay(dayId, nodeRegionInt)
//      Select the node with the HIGHEST seed value (tie-break: lexicographic node_id — stable).
//      dayId = Math.floor(ctx.gameMinute / 1440)
//      The region→int mapping mirrors C7 (stable: derived only from the node_id UUID's first 8 hex
//      chars, a stable identifier for the laundering location). Same day + same node = same seed.
//   5. Emit `FenceDefaultedEvent` on the CityEventBus (C9 FENCE_DEFAULT claim seam), carrying:
//        - playerId: ctx.playerId
//        - launderingNodeId: selected.node_id
//        - throughputInPerHour: selected.throughput_in_per_hour  (for the C9 payout)
//        - gameMinute: ctx.gameMinute
//   6. Store in-memory `lastDefaultedEvent` (test probe — cleared by test route on reset).
//
// ZERO-REGRESSION: threshold <= 0 → RETURN immediately (nothing touched) — reachable only under an
//   explicit override, NOT the delivered default (0.80).
//   Production nodes default buffer_load=0.0 → always below any positive threshold, so the real
//   ZERO-REGRESSION guarantee at the shipped default comes from THIS invariant, not from the threshold.
//   The laundering hot-path (LaunderingService, LaunderingOutputService, pipeline ticks) is UNCHANGED.
//
// DETERMINISM (C4): same (dayId, node_id, buffer_load, threshold) → same node defaulted.
//   NO Math.random(). Only seedFromDay (the SHA-256 PRNG from MarketRngService — D1b canon).
//
// SUBSTRATE CORRECTION: `buffer_load` is read from `laundering_nodes` (plan §C8 anchor:
//   pipeline_and_laundering.ts:24 — `buffer_load: real [0..1] BO-only`).
//   `tail_risk_estimates.current_occupancy` is NOT used for the threshold check (design §2.3:
//   the fence-default condition is anchored on the [0..1] buffer_load scale).
//
// R2.2 / P5: FenceDefaultedEvent carries ONLY qualitative identity (playerId, launderingNodeId,
//   throughputInPerHour, gameMinute). The raw buffer_load float is NEVER emitted on the bus.
//
// Migration: NO new migration for C8 (uses existing laundering_nodes columns — substrate correction
//   means we read buffer_load from the existing column, NOT adding a new column).

import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Inject } from '@nestjs/common';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { launderingNode } from '../../db/schema/pipeline_and_laundering';
import { CityEventBus, type FenceDefaultedEvent } from '../../citysim/events/city-event-bus';
import { MarketRngService } from '../market/market-rng.service';
import { insuranceTunables } from './insurance-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

@Injectable()
export class FenceDefaultService {
  private readonly logger = new Logger(FenceDefaultService.name);

  /** In-memory probe: the last FenceDefaultedEvent fired (test-only). Cleared on reset. */
  private lastDefaultedEvent: FenceDefaultedEvent | null = null;

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bus: CityEventBus,
    private readonly rng: MarketRngService,
  ) {}

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Return the last FenceDefaultedEvent fired (test-probe — never used in production paths). */
  getLastDefaultedEvent(): FenceDefaultedEvent | null {
    return this.lastDefaultedEvent;
  }

  /** Clear the in-memory last-event probe (called by the test reset route). */
  clearLastDefaultedEvent(): void {
    this.lastDefaultedEvent = null;
  }

  // ────────────────────────────────── the registered NIGHTLY/8 tick ─────────────────────────────

  /**
   * {NIGHTLY, order 8} — probe `laundering_nodes.buffer_load`; for nodes above the exposure
   * threshold, deterministically select one via `seedFromDay` and emit `FenceDefaultedEvent`.
   *
   * Organic no-op (the common case):
   *   • threshold <= 0 → immediate RETURN — only under an explicit override, NOT the shipped
   *     default (0.80). The real zero-regression path at the shipped default is buffer_load=0.0.
   *   • No laundering nodes for the player → RETURN.
   *   • No node with buffer_load > threshold → RETURN.
   *
   * C4 determinism: dayId = Math.floor(ctx.gameMinute / 1440); NO Math.random().
   * Substrate correction: buffer_load is on laundering_nodes (NOT tail_risk_estimates).
   *
   * @param thresholdOverride — TEST-ONLY. When > 0, overrides the insuranceTunables registry
   *   value for this call. Allows E2E tests to exercise the fence-default path without setting
   *   an env var. The production scheduler never passes this parameter (undefined = use registry).
   */
  async runNightlyTick(ctx: CitySimTickContext, thresholdOverride?: number): Promise<void> {
    const threshold =
      thresholdOverride !== undefined && thresholdOverride > 0
        ? thresholdOverride
        : insuranceTunables.fenceDefaultExposureThreshold;

    // Sentinel check: threshold <= 0 means the producer is DISABLED (zero-regression).
    if (threshold <= 0) return;

    // Query all laundering nodes for this player.
    // Substrate correction: buffer_load is on laundering_nodes (column :24 in pipeline_and_laundering.ts).
    const nodes = await this.db
      .select({
        node_id:                 launderingNode.node_id,
        buffer_load:             launderingNode.buffer_load,
        throughput_in_per_hour:  launderingNode.throughput_in_per_hour,
      })
      .from(launderingNode)
      .where(eq(launderingNode.player_id, ctx.playerId));

    if (nodes.length === 0) return; // organic no-op

    // Filter to nodes above the exposure threshold.
    const aboveThreshold = nodes.filter((n) => n.buffer_load > threshold);
    if (aboveThreshold.length === 0) return; // organic no-op — none above threshold

    // Deterministic selection (C4 — NO Math.random()):
    //   dayId derived from gameMinute (1440 minutes per in-game day).
    //   nodeRegionInt derived from the first 8 hex chars of node_id (stable — same node → same int).
    //   Select the node whose (dayId, nodeRegionInt) seed is the HIGHEST.
    //   Tie-break: lexicographic node_id (stable when seeds collide — deterministic order).
    //   Mirrors the C7 region→int mapping exactly (same pattern, same stability guarantee).
    const dayId = Math.floor(ctx.gameMinute / 1440);

    let selected = aboveThreshold[0]!;
    let highestSeed = this.seedForNode(dayId, selected.node_id);

    for (let i = 1; i < aboveThreshold.length; i++) {
      const candidate = aboveThreshold[i]!;
      const candidateSeed = this.seedForNode(dayId, candidate.node_id);
      if (
        candidateSeed > highestSeed ||
        (candidateSeed === highestSeed && candidate.node_id > selected.node_id)
      ) {
        selected = candidate;
        highestSeed = candidateSeed;
      }
    }

    // Emit FenceDefaultedEvent (C9 FENCE_DEFAULT claim seam).
    // NOTE: unlike C7, the fence-default does NOT mutate laundering_nodes.
    // The "default" is an event-only signal (the node stays above threshold until the player
    // reduces buffer_load — the producer will continue firing each night if the node stays elevated).
    // This is intentional: the FENCE_DEFAULT coverage compensates for the ongoing throughput loss,
    // not a one-time status flip. C9 consumes the event to create a claim per firing.
    const event: FenceDefaultedEvent = {
      type: 'fence_defaulted',
      playerId: ctx.playerId,
      launderingNodeId: selected.node_id,
      throughputInPerHour: selected.throughput_in_per_hour,
      gameMinute: ctx.gameMinute,
    };

    this.lastDefaultedEvent = event; // in-memory test probe
    this.bus.emitFenceDefaulted(event);

    this.logger.log(
      `FenceDefaultService NIGHTLY/8: player=${ctx.playerId} node=${selected.node_id} ` +
        `buffer_load=${selected.buffer_load} throughput=${selected.throughput_in_per_hour} ` +
        `threshold=${threshold} day=${dayId} → FenceDefaultedEvent emitted.`,
    );
  }

  // ─────────────────────────────────────── private helpers ─────────────────────────────────────

  /**
   * Derive a deterministic seed for a (dayId, nodeId) pair.
   *
   * nodeRegionInt = parseInt(nodeId.replace(/-/g,'').slice(0, 8), 16) % 1_000_000
   *
   * The node_id is a UUID (hyphenated hex). Taking the first 8 hex chars (= 32 bits) and
   * taking modulo 1_000_000 yields a stable integer in [0, 999_999] for each node.
   * This mirrors the C7 "courier_region → int" mapping (plan §C8 canon anchor).
   * The mapping is pure (no DB read — derived in memory from the already-fetched node_id).
   *
   * NO Math.random(). Only MarketRngService.seedFromDay (the SHA-256 PRNG from D1b — C4).
   */
  private seedForNode(dayId: number, nodeId: string): number {
    const nodeRegionInt = parseInt(nodeId.replace(/-/g, '').slice(0, 8), 16) % 1_000_000;
    return this.rng.seedFromDay(dayId, nodeRegionInt);
  }
}
