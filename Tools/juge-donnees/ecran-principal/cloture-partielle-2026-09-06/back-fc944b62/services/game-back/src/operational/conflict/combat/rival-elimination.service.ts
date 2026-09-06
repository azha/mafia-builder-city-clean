// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task C-cas
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9.2
//             Canon: docs/tech/04b_combat_and_conflict/mechanics_interlock.md §9.2 (C-cas elimination)
//             — Combat & Escalation B C-cas — 2026-06-25 —
//
// `RivalEliminationService` — orchestrates the §9.2 4-penalty atomic elimination.
//
// The 4-penalty SERIALIZABLE elimination (§9.2):
//   Penalty 1 (familiarity reset):  UPDATE deescalation_pair_state SET familiarity_index=0,
//                                   vacuum_volatility += penalty for the eliminated rival.
//   Penalty 2 (removeTopEnforcer):  UPDATE rival_pair_pressure SET top_enforcer_active=false
//                                   WHERE player_id=playerId AND rival_a_key=rivalKey.
//   Penalty 3 (maladaptive peak):   UPDATE escalation_pair_state SET conflict_memory_depth=10
//                                   (DEPTH_MAX) for ALL surviving rivals (rival_key != rivalKey).
//   Penalty 4 (adaptive leakage):  UPSERT rival_attack_pattern_resistance for surviving rivals
//                                   with resistance at HIGH ref (0.60) — all patterns.
//
// Atomicity invariant:
//   ALL 4 penalties run in a SINGLE db.transaction at SERIALIZABLE isolation.
//   The FIRST statement inside the tx is `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`.
//   On ANY failure → Drizzle rolls back → NONE of the penalties persist.
//
// Emits: `RivalEliminatedEvent` on bus AFTER the tx commits.
//
// test-only `failAtLayer` parameter: when set, throw AFTER writing that penalty inside the tx
//   to verify the entire tx rolls back (E2E atomicity test (b)).
//
// Determinism: NO Math.random(). NO Date.now(). game-time only.
// ADDITIVE: only writes to existing escalation + de-escalation + rival tables.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { sql, ne, eq, and } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { CityEventBus } from '../../../citysim/events/city-event-bus';
import { CombatTunables } from './combat-tunables';
import type { RivalKey } from '../rival/rival-ai.types';

// Named ref constants (anti-bare-float discipline — mirror getter defaults)
const DEPTH_MAX = 10;                             // DEPTH_MAX for maladaptive depth (canon §4.2)
const ELIMINATION_LEAKAGE_HIGH_REF = 0.60;        // composite:HIGH resistance ref on leakage
// Vacuum volatility raise baseline penalty on elimination (composite:HIGH ref §5.1 :61)
const VACUUM_VOLATILITY_ELIMINATION_PENALTY_REF = 0.30; // composite:HIGH ref

/** All valid rival keys — used to determine surviving rivals. */
const ALL_RIVAL_KEYS: readonly RivalKey[] = ['coil', 'tarcum', 'iron_throat', 'saltline'];

/** Qualitative result of the 4-penalty elimination (P5/R2.2 — no raw scalars). */
export interface EliminationResult {
  /** True when the elimination was applied (or re-applied idempotently). */
  readonly eliminated: boolean;
  /** Qualitative compounding penalty bucket (R2.2 — never the raw multiplier). */
  readonly compounding_penalty_bucket: string;
}

/** Input for the §9.2 elimination cascade. */
export interface EliminationInput {
  readonly playerId: string;
  readonly rivalKey: RivalKey;
  readonly gameMinute: number;
  /**
   * Test-only: when set, throw AFTER writing this penalty inside the tx to force a rollback.
   * Used by the E2E atomicity test (b) to verify no half-applied state.
   */
  readonly failAtLayer?: number;
}

@Injectable()
export class RivalEliminationService {
  private readonly logger = new Logger(RivalEliminationService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: CombatTunables,
    private readonly eventBus: CityEventBus,
  ) {}

  /**
   * `executeElimination` — the §9.2 4-penalty cascade, all in ONE SERIALIZABLE tx.
   *
   * Penalty 1: reset familiarity_index to 0 and raise vacuum_volatility for eliminated rival.
   * Penalty 2: flip top_enforcer_active=false for eliminated rival pair pressure rows.
   * Penalty 3: set conflict_memory_depth=DEPTH_MAX (10) for all surviving rivals.
   * Penalty 4: upsert rival_attack_pattern_resistance for surviving rivals with HIGH leakage.
   *
   * Emits `RivalEliminatedEvent` on bus AFTER the tx commits.
   *
   * Returns: EliminationResult (qualitative — no raw scalars).
   */
  async executeElimination(input: EliminationInput): Promise<EliminationResult> {
    const compoundingBucket = this.tunables.eliminationCompoundingPenaltyAggregateBucket;

    await this.db.transaction(async (tx) => {
      // FIRST statement: SERIALIZABLE isolation
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      // Penalty 1: familiarity reset for eliminated rival
      // SET familiarity_index=0 AND raise vacuum_volatility += elimination penalty ref
      await tx.execute(sql`
        INSERT INTO "deescalation_pair_state" (player_id, rival_key, familiarity_index, vacuum_volatility)
        VALUES (${input.playerId}, ${input.rivalKey}, 0, ${VACUUM_VOLATILITY_ELIMINATION_PENALTY_REF})
        ON CONFLICT (player_id, rival_key) DO UPDATE
          SET familiarity_index = 0,
              vacuum_volatility = "deescalation_pair_state".vacuum_volatility + ${VACUUM_VOLATILITY_ELIMINATION_PENALTY_REF}
      `);

      // ★ test-only: force-fail injection after Penalty 1
      if (input.failAtLayer === 1) {
        throw new Error(`[C-cas test] Forced rollback after Penalty 1 (familiarity reset)`);
      }

      // Penalty 2: flip top_enforcer_active=false for all rival_pair_pressure rows where rival_a_key=rivalKey
      await tx.execute(sql`
        UPDATE "rival_pair_pressure"
        SET top_enforcer_active = false
        WHERE player_id = ${input.playerId}
          AND rival_a_key = ${input.rivalKey}
      `);

      // ★ test-only: force-fail injection after Penalty 2
      if (input.failAtLayer === 2) {
        throw new Error(`[C-cas test] Forced rollback after Penalty 2 (removeTopEnforcer)`);
      }

      // Penalty 3: maladaptive peak for ALL surviving rivals (rival_key != eliminatedKey)
      // UPSERT each surviving rival pair row at DEPTH_MAX
      const survivingRivals = ALL_RIVAL_KEYS.filter((k) => k !== input.rivalKey);
      for (const survivingKey of survivingRivals) {
        await tx.execute(sql`
          INSERT INTO "escalation_pair_state" (player_id, rival_key, conflict_memory_depth, resonance_factor, player_response_history)
          VALUES (${input.playerId}, ${survivingKey}, ${DEPTH_MAX}, 0, '[]')
          ON CONFLICT (player_id, rival_key) DO UPDATE
            SET conflict_memory_depth = ${DEPTH_MAX}
        `);
      }

      // ★ test-only: force-fail injection after Penalty 3
      if (input.failAtLayer === 3) {
        throw new Error(`[C-cas test] Forced rollback after Penalty 3 (maladaptive peak)`);
      }

      // Penalty 4: Adaptive Skin leakage for surviving rivals
      // For each surviving rival, upsert a catch-all leakage pattern with HIGH resistance ref.
      // The leakage pattern hash is a canonical "elimination leakage" marker (deterministic).
      const leakagePatternHash = `elimination_leakage:${input.rivalKey}`;
      for (const survivingKey of survivingRivals) {
        await tx.execute(sql`
          INSERT INTO "rival_attack_pattern_resistance" (player_id, rival_key, pattern_hash, resistance, last_used_tick)
          VALUES (${input.playerId}, ${survivingKey}, ${leakagePatternHash}, ${ELIMINATION_LEAKAGE_HIGH_REF}, ${BigInt(input.gameMinute)})
          ON CONFLICT (player_id, rival_key, pattern_hash) DO UPDATE
            SET resistance = GREATEST("rival_attack_pattern_resistance".resistance, ${ELIMINATION_LEAKAGE_HIGH_REF}),
                last_used_tick = ${BigInt(input.gameMinute)}
        `);
      }

      // ★ test-only: force-fail injection after Penalty 4
      if (input.failAtLayer === 4) {
        throw new Error(`[C-cas test] Forced rollback after Penalty 4 (adaptive leakage)`);
      }
    });

    // Emit RivalEliminatedEvent AFTER the tx commits (event bus is in-memory)
    this.eventBus.emitRivalEliminated({
      type: 'rival_eliminated',
      playerId: input.playerId,
      rivalKey: input.rivalKey,
      gameMinute: input.gameMinute,
      compounding_penalty_bucket: compoundingBucket,
    });

    this.logger.log(
      `[RivalElimination] elimination applied: player=${input.playerId} rival=${input.rivalKey} minute=${input.gameMinute} bucket=${compoundingBucket}`,
    );

    return {
      eliminated: true,
      compounding_penalty_bucket: compoundingBucket,
    };
  }
}
