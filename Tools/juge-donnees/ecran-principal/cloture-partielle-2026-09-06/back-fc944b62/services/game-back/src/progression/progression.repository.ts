// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-17-exception-funnel-progression-design.md §4-T4 (the progression
//             persistence — reads/writes player_progression_state, counts exception_queue by table). R9.3: imports the
//             EXISTING schema, never re-declares. One-way: progression reads exception_queue directly (no exceptions-repo
//             import) so exceptions → progression stays acyclic. app_rw has SELECT/INSERT/UPDATE on both tables.
//             P3-H C9 ADDS (design §11 — BO surface): `forceSetPressureTier` (the admin `pressure-tier/
//             force-set` override, unconditional write, ★H-1 value-sensitivity proof surface).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { exceptionQueueRow } from '../db/schema/queues_exceptions_cuestack';
import { citySimClock } from '../db/schema/city_sim_clock';

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own established idiom — never
 *  a shared extraction across repositories, see `capability-debts.repository.ts#rowsOf` / `script-
 *  stability-counters.repository.ts#rowsOf`; each repository keeps its OWN local copy). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class ProgressionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Guarantee a progression row at defaults (tier 1, taught_signals []). Idempotent — the upsert no-ops on conflict. */
  async ensureRow(playerId: string): Promise<void> {
    await this.db
      .insert(playerProgressionState)
      .values({ player_id: playerId })
      .onConflictDoNothing({ target: playerProgressionState.player_id });
  }

  /** Read the player's tier + taught-signal set (call ensureRow first — always returns a row after that). */
  async getProgression(playerId: string): Promise<{ rule_vocabulary_tier: number; taught_signals: string[] }> {
    const rows = await this.db
      .select({
        rule_vocabulary_tier: playerProgressionState.rule_vocabulary_tier,
        taught_signals: playerProgressionState.taught_signals,
      })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    const r = rows[0];
    return {
      rule_vocabulary_tier: r?.rule_vocabulary_tier ?? 1,
      taught_signals: (r?.taught_signals as string[]) ?? [],
    };
  }

  /** Overwrite the taught-signal set (the service computes the append-if-new set). */
  async setTaughtSignals(playerId: string, signals: string[]): Promise<void> {
    await this.db
      .update(playerProgressionState)
      .set({ taught_signals: signals })
      .where(eq(playerProgressionState.player_id, playerId));
  }

  /** Raise the tier MONOTONICALLY (never lowers; the guard means a concurrent raise is idempotent). */
  async setVocabularyTier(playerId: string, tier: number): Promise<void> {
    await this.db
      .update(playerProgressionState)
      .set({ rule_vocabulary_tier: tier })
      .where(and(eq(playerProgressionState.player_id, playerId), sql`${playerProgressionState.rule_vocabulary_tier} < ${tier}`));
  }

  /**
   * P3-A C5 (D10) — read-only diagnostic for the player's CURRENT `structural_decisions_this_session`
   * counter. ★ C5-fix (⊥ IMPORTANT-1): the governor's own cap ENFORCEMENT no longer calls this — a
   * separate read-then-later-write was the TOCTOU race the fix closed; `StructuralDecisionGovernor
   * Repository.reserveStructuralSlot` now does the read-check-and-claim as ONE atomic UPDATE. This
   * getter remains for non-enforcement callers (BO diagnostics, C8; test assertions). Returns 0 for a
   * player with no progression row yet (a sessionless-only player who has never opened a session — the
   * default column value is 0 anyway, so this fallback is byte-identical to a real row's default).
   */
  async getStructuralDecisionsThisSession(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: playerProgressionState.structural_decisions_this_session })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    return rows[0]?.n ?? 0;
  }

  /**
   * P3-H C2 (ADDITIVE — `docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md` C2, "Activate
   * `decision_horizon_tier` (first reader)"; design D1). The player's CURRENT `decision_horizon_tier`
   * (1..3, `pps_decision_horizon_tier_chk`) — the DORMANT column P3-H C1 confirmed still has zero runtime
   * consumers. `ExecutionPlanService.createPlan` reads this to derive `cycles_ahead(tier)` +
   * `available_modes(tier)` (design §6.1). Mirrors `getStructuralDecisionsThisSession`'s own fallback
   * shape verbatim: a player with no progression row yet reads the column's own DB default (1) — no
   * lazy-insert on a read path. The REAL first WRITER stays `HorizonTierAdvancementService` (C4, D6) —
   * this getter never mutates.
   */
  async getDecisionHorizonTier(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ tier: playerProgressionState.decision_horizon_tier })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    return rows[0]?.tier ?? 1;
  }

  /** Count the player's HANDLED exceptions (resolved or escalated — both stamp resolved_at). */
  async countHandledExceptions(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(exceptionQueueRow)
      .where(and(eq(exceptionQueueRow.player_id, playerId), isNotNull(exceptionQueueRow.resolved_at)));
    return rows[0]?.n ?? 0;
  }

  // ── P3-H C5 (design §3/§8, D7/D8/D9) — the pressure columns, SAME table, SAME "extend the owning
  //    repository" convention `getDecisionHorizonTier` (C2) already established for this table. ────────

  /**
   * The player's CURRENT in-game tick (`city_sim_clock.game_minute`) — a per-repository LOCAL copy of the
   * established `getCurrentGameMinute` convention (this codebase deliberately never shares this read
   * across repositories — see `horizon-tier-advancement.repository.ts`'s own header for the full
   * precedent list). Returns 0 when the player has no clock row yet. A READ — no state change. Feeds the
   * `gameMinute` field on `PressureTierUnlockedEvent`/`PressureTierObservationExpiredEvent`.
   */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * `PressureTierService`'s own read-only diagnostic (`GET /v1/meta/pressure`'s projection, and
   * `onSessionStart`'s defensive cache resync — `pressure-tier.service.ts`'s own header). A player with no
   * `player_progression_state` row yet reads the column defaults (tier 1, count 0, no observation) — the
   * SAME "missing row = schema default" convention `getDecisionHorizonTier`/`getStructuralDecisionsThis
   * Session` above already establish. A READ — no state change, never lazily inserts a row.
   */
  async getPressureState(
    playerId: string,
  ): Promise<{ pressureTier: number; graduationCount: number; tier4ObservationUntilTick: Date | null }> {
    const rows = await this.db
      .select({
        pressure_tier: playerProgressionState.pressure_tier,
        graduation_count: playerProgressionState.graduation_count_since_last_pressure_unlock,
        tier4_observation_until_tick: playerProgressionState.tier4_observation_until_tick,
      })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    const r = rows[0];
    return {
      pressureTier: r?.pressure_tier ?? 1,
      graduationCount: r?.graduation_count ?? 0,
      tier4ObservationUntilTick: r?.tier4_observation_until_tick ?? null,
    };
  }

  /**
   * P3-H C5 (design §8.1/D8) — the graduation ratchet's ONE atomic statement: guarded-increment `graduation_
   * count_since_last_pressure_unlock`; when the incremented count reaches `unlockThreshold` AND `pressure_
   * tier < 4`, advance the tier by exactly 1, reset the count to 0, and (ONLY when the new tier is exactly
   * 4) stamp `tier4_observation_until_tick = observationUntilIfT4`. A single `UPDATE ... CASE WHEN` — every
   * branch reads the SAME pre-image row (PG's own single-statement snapshot semantics), so two concurrent
   * calls on the SAME player serialize at the row level (the C5 Concurrence proof: "double graduation
   * events -> single tier advance"), never a lost update. `unlocked` is derived from the POST-write count:
   * the increment branch NEVER naturally lands back at 0 (a plain `+1` on a `>= 0` counter can only reach 0
   * via the explicit reset arm — the CHECK `graduation_count_since_last_pressure_unlock >= 0`, mig 0141,
   * makes -1 impossible), so `graduationCount === 0` after this call reliably signals "THIS call performed
   * the unlock/reset arm" without a separate old-vs-new read. The row MUST already exist (caller calls
   * `ensureRow` first, the SAME `structural-decision-governor.service.ts:96`/`horizon-tier-advancement.
   * service.ts:113` precedent every other `player_progression_state` writer follows) — a missing row is a
   * bare zero-match UPDATE, `RETURNING` empty, defensively read back as the schema defaults.
   */
  async recordGraduationAndMaybeAdvancePressureTier(
    playerId: string,
    unlockThreshold: number,
    observationUntilIfT4: Date,
  ): Promise<{ pressureTier: number; graduationCount: number; tier4ObservationUntilTick: Date | null; unlocked: boolean }> {
    const result = await this.db.execute(sql`
      UPDATE player_progression_state
      SET
        graduation_count_since_last_pressure_unlock = CASE
          WHEN graduation_count_since_last_pressure_unlock + 1 >= ${unlockThreshold}::smallint AND pressure_tier < 4
            THEN 0
          ELSE graduation_count_since_last_pressure_unlock + 1
        END,
        pressure_tier = CASE
          WHEN graduation_count_since_last_pressure_unlock + 1 >= ${unlockThreshold}::smallint AND pressure_tier < 4
            THEN pressure_tier + 1
          ELSE pressure_tier
        END,
        tier4_observation_until_tick = CASE
          WHEN graduation_count_since_last_pressure_unlock + 1 >= ${unlockThreshold}::smallint AND pressure_tier < 4
               AND pressure_tier + 1 = 4
            THEN ${observationUntilIfT4}::timestamptz
          ELSE tier4_observation_until_tick
        END
      WHERE player_id = ${playerId}::uuid
      RETURNING pressure_tier, graduation_count_since_last_pressure_unlock, tier4_observation_until_tick
    `);
    const row = rowsOf(result)[0];
    if (!row) {
      // Defensive no-op (missing row, see this method's own header) — reads back as schema defaults.
      return { pressureTier: 1, graduationCount: 0, tier4ObservationUntilTick: null, unlocked: false };
    }
    const graduationCount = Number(row.graduation_count_since_last_pressure_unlock);
    return {
      pressureTier: Number(row.pressure_tier),
      graduationCount,
      tier4ObservationUntilTick: row.tier4_observation_until_tick ? new Date(row.tier4_observation_until_tick as string) : null,
      unlocked: graduationCount === 0,
    };
  }

  /**
   * P3-H C5 (design D9) — the T4 observation window's lazy-expiry clear: `WHERE tier4_observation_until_
   * tick IS NOT NULL AND tier4_observation_until_tick <= :now`, a plain guarded UPDATE (never an upsert —
   * mirrors `script-stability-counters.repository.ts#resetOnAbort`'s own "TRUE zero-write when already
   * inapplicable" idiom). Returns `{cleared:false}` for BOTH "no window at all" AND "a window still
   * genuinely open" (the caller, `PressureTierService.onSessionStart`, treats both identically — no event,
   * a defensive cache resync only); `{cleared:true, pressureTier}` ONLY when THIS call's guard matched a
   * row (D9's own "once" discipline — a LATER session-open for the same already-cleared window finds
   * `tier4_observation_until_tick IS NULL`, the guard no longer matches, zero-write, zero second event).
   */
  async clearExpiredObservationWindow(playerId: string, now: Date): Promise<{ cleared: boolean; pressureTier: number }> {
    const rows = await this.db
      .update(playerProgressionState)
      .set({ tier4_observation_until_tick: null })
      .where(
        and(
          eq(playerProgressionState.player_id, playerId),
          isNotNull(playerProgressionState.tier4_observation_until_tick),
          lte(playerProgressionState.tier4_observation_until_tick, now),
        ),
      )
      .returning({ pressure_tier: playerProgressionState.pressure_tier });
    if (rows.length === 0) return { cleared: false, pressureTier: 0 };
    return { cleared: true, pressureTier: rows[0]!.pressure_tier };
  }

  /**
   * P3-H C9 (design §11 — `POST /v1/admin/meta/pressure-tier/force-set`, the ★H-1 value-sensitivity proof
   * surface through the REAL BO surface). An UNCONDITIONAL admin override — a compensation/debug tool,
   * never gated by the graduation ratchet (§8.1 above is the ORGANIC path; this is its admin-override
   * sibling, mirrors `ComplexityBudgetRepository.setCap`'s own "the column IS the cap" unconditional-write
   * posture, P3-G C10). Sets `pressure_tier` to the requested value (1..4, validated by the CALLER —
   * `PressureTierService.forceSetTier`) AND `tier4_observation_until_tick` TOGETHER: `structuralCapForPlayer`
   * (C5, DD-H2) reads ONLY the observation window, never `pressure_tier` directly (design §8.2) — force-
   * setting the tier WITHOUT ALSO staging the window would be a dishonest no-op for the exact proof this
   * endpoint exists to demonstrate ("force T4 -> the getter returns 0"). Force-setting to a NON-4 tier
   * clears any pre-existing window (`observationUntil=null` — an inconsistent "tier says 1 but the cap
   * still reads 0" state is never left observable). `graduation_count_since_last_pressure_unlock` is
   * DELIBERATELY untouched — a SEPARATE axis this override does not own (the ratchet, §8.1, stays the ONE
   * writer for that column). ONE unconditional UPDATE (0.4 atomic-first — never a read-then-write);
   * `ensureRow` first (the SAME "guarantee a row before the single-statement UPDATE" precedent
   * `HorizonTierAdvancementService.advance`/`BudgetRecomputeService.recompute` establish).
   */
  async forceSetPressureTier(
    playerId: string,
    tier: number,
    observationUntil: Date | null,
  ): Promise<{ pressureTier: number; tier4ObservationUntilTick: Date | null }> {
    await this.ensureRow(playerId);
    const rows = await this.db
      .update(playerProgressionState)
      .set({ pressure_tier: tier, tier4_observation_until_tick: observationUntil })
      .where(eq(playerProgressionState.player_id, playerId))
      .returning({
        pressure_tier: playerProgressionState.pressure_tier,
        tier4_observation_until_tick: playerProgressionState.tier4_observation_until_tick,
      });
    const row = rows[0]!;
    return { pressureTier: row.pressure_tier, tier4ObservationUntilTick: row.tier4_observation_until_tick };
  }
}
