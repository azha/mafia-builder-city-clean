// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task C-cas
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9.1
//             Canon: docs/tech/04b_combat_and_conflict/mechanics_interlock.md §9.1 (C-cas)
//             — Combat & Escalation B C-cas — 2026-06-25 —
//
// `ConflictOrchestratorService` — orchestrates the §9.1 5-layer atomic cascade.
//
// The 5-layer SERIALIZABLE cascade (§9.1):
//   Layer 0 (dedup):     INSERT assault_cascade_dedup — if already present → no-op.
//   Layer 1 (heat):      Emitted AFTER the tx commits (event bus is in-memory; not inside the tx).
//   Layer 2 (sandpile):  Upsert escalation_global_state.system_criticality += sensitivity ref (0.1).
//   Layer 3 (maladaptive): Upsert escalation_pair_state.conflict_memory_depth += 1 (cap 10).
//   Layer 4 (adaptive skin): Upsert rival_attack_pattern_resistance for the patternHash.
//   Layer 5 (C stub):    recordCommitmentContradiction → 'none' (C forward slot, no DB write).
//
// Atomicity invariant:
//   ALL layers 0+2+3+4 run in a SINGLE db.transaction at SERIALIZABLE isolation.
//   The FIRST statement inside the tx is `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`.
//   On ANY failure inside the tx → Drizzle rolls back → NONE of the writes persist.
//
// Idempotency: the dedup check (Layer 0) is the FIRST write inside the tx. If the dedup row
//   already exists, the cascade exits immediately as a no-op. The assaultEventId is the dedup key.
//
// Budget timeout: `cascadeAtomicTransactionTimeoutMs` (getter-sourced, default 5000ms).
//   Promise.race between the tx and a timeout — if the tx stalls, the timeout rejects.
//
// DEAD_HAND_TICK: registered at HOURLY/3 (the free slot after RIVAL_SATURATION_TICK/HOURLY/2).
//   Guard: `gameMinute % 480 === 0` (every 8 × 60 min = 480 game-minutes = 8 in-game hours).
//   L1 empty-state skip: no dead_hand_cache_state rows → ZERO writes.
//   Per-rival try/catch. Deterministic game-time modulo. NO Math.random(). NO Date.now().
//   Canon: retaliation_mechanics.md:76 (cache_refresh_ticks=8, HOURLY cadence).
//
// `recordCommitmentContradiction` (Layer 5 C forward slot):
//   Stub returning { burnTrustImpactBucket: 'none' }. Wires to CredibilityAccumulator at C.
//
// Determinism: NO Math.random(). NO Date.now(). game-time only via assaultEventId + gameMinute.
// ADDITIVE: only writes to new table (assault_cascade_dedup) + existing escalation tables.

import { Injectable, Logger, Inject, OnApplicationBootstrap, forwardRef } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { CityEventBus } from '../../../citysim/events/city-event-bus';
import { CitySimSchedulerService } from '../../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../../citysim/scheduler/city_sim_system';
import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import { DeadHandCacheService } from './dead-hand-cache.service';
import type { RivalKey } from '../rival/rival-ai.types';
// C5 DD-CREDIBILITY: inject CredibilityAccumulatorService for §9.1 cascade layer-5.
// The forward slot (recordCommitmentContradiction) now calls the accumulator (a contradiction
// = a Burn-Notice trust damage; the returned burnTrustImpactBucket reflects the band shift).
// forwardRef: avoids the boot-time DiplomacyModule ↔ CombatModule circular dep.
import { CredibilityAccumulatorService } from '../diplomacy/credibility-accumulator.service';

// Named ref constants for inline writes (anti-bare-float discipline — these mirror the getters)
const SANDPILE_SENSITIVITY_STANDARD_REF = 0.1;  // composite:STANDARD ref delta per cascade
const MALADAPTIVE_DEPTH_INCREMENT = 1;           // one depth per cascade (capped at DEPTH_MAX)
const DEPTH_MAX = 10;                            // maladaptive depth cap (canon §4.2)
const ADAPTIVE_SKIN_ADAPTATION_RATE_STANDARD_REF = 0.10; // composite:STANDARD adaptation rate

// Dead-hand tick modulo: every 8 in-game hours (8 × 60 min/hour = 480 game-minutes)
const DEAD_HAND_TICK_MODULO = 480;

/**
 * Input to the 5-layer §9.1 cascade.
 * All fields are caller-supplied — no Date.now() or Math.random() anywhere.
 */
export interface AssaultCascadeInput {
  /** Unique per-assault identifier — the dedup key. varchar(64) max. */
  readonly assaultEventId: string;
  /** The player's UUID. */
  readonly playerId: string;
  /** The rival being attacked. */
  readonly rivalKey: RivalKey;
  /** Deterministic attack-pattern key (B/C-supplied, varchar(64)). */
  readonly patternHash: string;
  /** In-game minute of the assault (NOT Date.now()). */
  readonly gameMinute: number;
  /**
   * Test-only: when set, throw AFTER writing this layer inside the tx to force a rollback.
   * Used by the E2E atomicity test (b) to verify no half-applied state.
   */
  readonly failAtLayer?: number;
}

/** Qualitative result of the 5-layer cascade (P5/R2.2 — no raw scalars). */
export interface CascadeResult {
  /** Whether the heat layer propagated (Layer 1). */
  readonly heat_propagated: boolean;
  /** Qualitative sandpile delta (Layer 2 — 'elevated' | 'stable'). R2.2: never the raw delta. */
  readonly sandpile_delta_bucket: string;
  /** Maladaptive depth increment (Layer 3 — 0 on dedup no-op). */
  readonly maladaptive_depth_increment: number;
  /** Whether the Adaptive Skin pattern was logged (Layer 4). */
  readonly adaptive_skin_pattern_logged: boolean;
  /** Burn-trust impact (Layer 5 — C forward slot, 'none' in B). */
  readonly burn_trust_impact_bucket: string;
}

@Injectable()
export class ConflictOrchestratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConflictOrchestratorService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: CombatTunables,
    private readonly combatRepo: CombatRepository,
    private readonly deadHandCache: DeadHandCacheService,
    private readonly eventBus: CityEventBus,
    private readonly scheduler: CitySimSchedulerService,
    // C5 DD-CREDIBILITY: injected via forwardRef (DiplomacyModule ↔ CombatModule bidirectional).
    // forwardRef(() => CredibilityAccumulatorService) resolves the circular module dep at boot.
    // Verified: /health 200, no "Nest can't resolve dependencies" after forwardRef wiring.
    @Inject(forwardRef(() => CredibilityAccumulatorService))
    private readonly credibilityAccumulator: CredibilityAccumulatorService,
  ) {}

  // ─── DEAD_HAND_TICK registration ──────────────────────────────────────────────────────────────

  /**
   * Register DEAD_HAND_TICK on the shared scheduler at application boot.
   * Cadence: HOURLY / order 3 (next-free after RIVAL_SATURATION_TICK/HOURLY/2).
   * Guard: gameMinute % 480 === 0 (every 8 in-game hours — cache_refresh_ticks=8, HOURLY=60min).
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id:      CitySystemId.DEAD_HAND_TICK,
      cadence: Cadence.HOURLY,
      order:   3,
      run:     (ctx) => this.runDeadHandTick(ctx),
    });
  }

  // ─── Private scheduler entry point ────────────────────────────────────────────────────────────

  private async runDeadHandTick(ctx: CitySimTickContext): Promise<void> {
    await this.runDeadHandTickForPlayer(ctx.playerId, ctx.gameMinute);
  }

  // ─── ★ Shared per-entity method (Lesson #3) ───────────────────────────────────────────────────

  /**
   * `runDeadHandTickForPlayer` — the SAME per-entity method called by BOTH the scheduler run
   * callback AND the `drive-dead-hand-tick` _test route.
   *
   * Lesson #3: no test-only logic duplicated — same production code path drives both.
   *
   * Guard: gameMinute % 480 === 0 (every 8 in-game hours). At off-boundary minutes → NO-OP.
   *
   * L1 empty-state skip:
   *   No dead_hand_cache_state rows for this player → ZERO writes (pre-B world byte-identical).
   *
   * Per-rival try/catch: a fault on ONE rival is logged and contained; the tick continues.
   * Deterministic: game-time modulo. NO Math.random(). NO Date.now().
   */
  async runDeadHandTickForPlayer(playerId: string, gameMinute: number): Promise<void> {
    // Guard: every 8 in-game hours
    if (gameMinute % DEAD_HAND_TICK_MODULO !== 0) {
      return; // off-boundary — NO-OP
    }

    // L1 empty-state skip: read all dead_hand_cache_state rows for this player
    const gameDay = Math.floor(gameMinute / 1440); // 1440 min/day
    const rows = await this.combatRepo.readDeadHandRowsForPlayer(playerId);

    if (rows.length === 0) {
      // L1 empty-state skip — ZERO writes (byte-identical no-regression for pre-B world)
      return;
    }

    for (const row of rows) {
      const rivalKey = row.rival_key as RivalKey;
      try {
        await this.deadHandCache.refreshCache(playerId, rivalKey, gameDay);
      } catch (err) {
        this.logger.error(
          `[DeadHandTick] refreshCache failed for player=${playerId} rival=${rivalKey}: ${String(err)}`,
        );
      }
    }
  }

  // ─── §9.1 5-layer atomic cascade ──────────────────────────────────────────────────────────────

  /**
   * `recordAssaultCascade` — the §9.1 5-layer cascade, all in ONE SERIALIZABLE tx.
   *
   * DEDUP FIRST: if assault_event_id already processed → immediate no-op (idempotent re-run).
   * Budget timeout: `cascadeAtomicTransactionTimeoutMs` (getter-sourced, default 5000ms).
   *
   * Layer 0 (dedup):      INSERT into assault_cascade_dedup → first write in tx.
   * Layer 2 (sandpile):   UPSERT escalation_global_state.system_criticality += 0.1 (composite:STANDARD).
   * Layer 3 (maladaptive): UPSERT escalation_pair_state.conflict_memory_depth += 1 (cap 10).
   * Layer 4 (adaptive):   UPSERT rival_attack_pattern_resistance for patternHash.
   * Layer 5 (C stub):     No DB write — returns { burnTrustImpactBucket: 'none' }.
   *
   * Layer 1 (heat): Emitted AFTER the tx commits (event bus is in-memory — not inside the tx).
   *
   * Returns: CascadeResult (qualitative — no raw scalars, R2.2 / P5).
   * On dedup no-op: returns result with depth_increment=0, heat_propagated=false.
   */
  async recordAssaultCascade(input: AssaultCascadeInput): Promise<CascadeResult> {
    const timeoutMs = this.tunables.cascadeAtomicTransactionTimeoutMs;
    let applied = false;

    const txPromise = this.db.transaction(async (tx) => {
      // FIRST statement: SERIALIZABLE isolation
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      // DEDUP CHECK: if assault_event_id already processed → no-op
      const dedup = await tx.execute<{ assault_event_id: string }>(sql`
        SELECT assault_event_id
        FROM "assault_cascade_dedup"
        WHERE assault_event_id = ${input.assaultEventId}
        LIMIT 1
      `);
      const dedupRows = (dedup as unknown as { rows?: unknown[]; length?: number });
      const dedupCount = dedupRows.rows?.length ?? (Array.isArray(dedup) ? (dedup as unknown[]).length : 0);
      if (dedupCount > 0) {
        // Already processed — return early (no-op)
        return;
      }

      // Layer 0 (dedup INSERT): first write in tx — idempotency anchor
      await tx.execute(sql`
        INSERT INTO "assault_cascade_dedup" (assault_event_id, processed_at_minute)
        VALUES (${input.assaultEventId}, ${BigInt(input.gameMinute)})
      `);

      // Layer 2 (sandpile): bump system_criticality by STANDARD ref delta
      // Uses singleton row (id=1, default). ON CONFLICT (id) → add delta, clamp to [0, 1].
      await tx.execute(sql`
        INSERT INTO "escalation_global_state" (id, system_criticality, cascade_threshold)
        VALUES (1, ${SANDPILE_SENSITIVITY_STANDARD_REF}, 0)
        ON CONFLICT (id) DO UPDATE
          SET system_criticality = LEAST(1.0, "escalation_global_state".system_criticality + ${SANDPILE_SENSITIVITY_STANDARD_REF})
      `);

      // ★ test-only: force-fail injection after Layer 2
      if (input.failAtLayer === 2) {
        throw new Error(`[C-cas test] Forced rollback after Layer 2 (sandpile)`);
      }

      // Layer 3 (maladaptive): increment conflict_memory_depth by 1, cap at DEPTH_MAX (10)
      await tx.execute(sql`
        INSERT INTO "escalation_pair_state" (player_id, rival_key, conflict_memory_depth, resonance_factor, player_response_history)
        VALUES (${input.playerId}, ${input.rivalKey}, ${MALADAPTIVE_DEPTH_INCREMENT}, 0, '[]')
        ON CONFLICT (player_id, rival_key) DO UPDATE
          SET conflict_memory_depth = LEAST(${DEPTH_MAX}, "escalation_pair_state".conflict_memory_depth + ${MALADAPTIVE_DEPTH_INCREMENT})
      `);

      // ★ test-only: force-fail injection after Layer 3
      if (input.failAtLayer === 3) {
        throw new Error(`[C-cas test] Forced rollback after Layer 3 (maladaptive)`);
      }

      // Layer 4 (adaptive skin): upsert rival_attack_pattern_resistance for patternHash
      // Using composite:STANDARD adaptation rate ref (0.10). No per-rival getter needed here —
      // the orchestrator writes the standard rate; AdaptiveSkinService uses per-rival in its own path.
      await tx.execute(sql`
        INSERT INTO "rival_attack_pattern_resistance" (player_id, rival_key, pattern_hash, resistance, last_used_tick)
        VALUES (${input.playerId}, ${input.rivalKey}, ${input.patternHash}, ${ADAPTIVE_SKIN_ADAPTATION_RATE_STANDARD_REF}, ${BigInt(input.gameMinute)})
        ON CONFLICT (player_id, rival_key, pattern_hash) DO UPDATE
          SET resistance = "rival_attack_pattern_resistance".resistance + ${ADAPTIVE_SKIN_ADAPTATION_RATE_STANDARD_REF},
              last_used_tick = ${BigInt(input.gameMinute)}
      `);

      // ★ test-only: force-fail injection after Layer 4
      if (input.failAtLayer === 4) {
        throw new Error(`[C-cas test] Forced rollback after Layer 4 (adaptive skin)`);
      }

      applied = true;
    });

    // Budget timeout: if the tx stalls, the race rejects and Drizzle's underlying PG connection
    // will eventually clean up. The tx is already in-flight — we surface the timeout as an error.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[C-cas] Cascade tx timeout after ${timeoutMs}ms (assaultEventId=${input.assaultEventId})`)),
        timeoutMs,
      ),
    );

    await Promise.race([txPromise, timeoutPromise]);

    if (!applied) {
      // Dedup no-op: the cascade was already applied for this assaultEventId
      return {
        heat_propagated: false,
        sandpile_delta_bucket: 'stable',
        maladaptive_depth_increment: 0,
        adaptive_skin_pattern_logged: false,
        burn_trust_impact_bucket: 'none',
      };
    }

    // Layer 5 (C forward slot WIRED): call CredibilityAccumulatorService.
    // A commitment contradiction = a failed-reveal penalty on the accumulator.
    // This fires AFTER the tx (post-tx, same as Layer 1 heat) — the DB write is
    // to credibility_state which is C's own table (not inside the SERIALIZABLE cascade tx).
    // The returned bucket reflects the band shift (NOT 'none' after C5).
    const layer5 = await this.recordCommitmentContradiction(
      input.playerId,
      input.rivalKey,
      input.gameMinute,
    );

    // Layer 1 (heat): emit AFTER the tx commits — event bus is in-memory (not inside the tx)
    // The heat event signals the cascade's heat consequence (combat-level escalation heat).
    // We emit the AssaultCascadeCompletedEvent which carries heat_propagated=true.
    const cascadeResult: CascadeResult = {
      heat_propagated: true,
      sandpile_delta_bucket: 'elevated',
      maladaptive_depth_increment: MALADAPTIVE_DEPTH_INCREMENT,
      adaptive_skin_pattern_logged: true,
      burn_trust_impact_bucket: layer5.burnTrustImpactBucket,
    };

    // Emit AssaultCascadeCompletedEvent on bus (post-tx — in-memory delivery)
    this.eventBus.emitAssaultCascadeCompleted({
      type: 'assault_cascade_completed',
      playerId: input.playerId,
      rivalKey: input.rivalKey,
      assaultEventId: input.assaultEventId,
      gameMinute: input.gameMinute,
      heat_propagated: cascadeResult.heat_propagated,
      sandpile_delta_bucket: cascadeResult.sandpile_delta_bucket,
      maladaptive_depth_increment: cascadeResult.maladaptive_depth_increment,
      adaptive_skin_pattern_logged: cascadeResult.adaptive_skin_pattern_logged,
      burn_trust_impact_bucket: cascadeResult.burn_trust_impact_bucket,
    });

    this.logger.log(
      `[ConflictOrchestrator] cascade applied: player=${input.playerId} rival=${input.rivalKey} assault=${input.assaultEventId} minute=${input.gameMinute}`,
    );

    return cascadeResult;
  }

  // ─── Layer 5: C forward slot (WIRED C5) ──────────────────────────────────────────────────────

  /**
   * `recordCommitmentContradiction` — Layer 5 of the §9.1 cascade.
   * WIRED at C5: calls CredibilityAccumulatorService (a contradiction = a Burn-Notice trust damage).
   * A commitment contradiction is treated as a failed reveal penalty — the same damage
   * that a missed sealed-envelope deadline applies (`recordFailedReveal` = -0.25 getter-sourced).
   * Signature byte-stable (same as B's stub).
   * Deterministic: no draw, no RNG, no Date.now().
   *
   * @returns `{ burnTrustImpactBucket }` reflecting the band shift from the damage.
   *   If the accumulator drops a band, the bucket is the NEW (lower) band name.
   *   This is NOT 'none' after C5 — the §9.1 cascade layer-5 fires the accumulator.
   */
  async recordCommitmentContradiction(
    playerId: string,
    rivalKey: RivalKey,
    _gameMinute: number,
  ): Promise<{ burnTrustImpactBucket: string }> {
    // A contradiction is a failed-reveal penalty on the SAME accumulator.
    // This fires the CredibilityAccumulatorService (DD-CREDIBILITY single SSOT).
    const newBucket = await this.credibilityAccumulator.recordFailedReveal(playerId, rivalKey);
    return { burnTrustImpactBucket: newBucket };
  }
}
