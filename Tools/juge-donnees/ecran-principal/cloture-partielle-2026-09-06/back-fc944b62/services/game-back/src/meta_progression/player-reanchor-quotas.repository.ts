// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1 (`VerticalHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-H1) + C7
//             ("`BenchmarkQuotaService` ... weekly reset elapsed-at-read (`week_reset_at` — no cron, D11);
//             quota upgrade `onHorizonAdvanced` (← `HorizonTierAdvancedEvent` from C4 ..., D12/hazard 5)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §3 (`player_
//             reanchor_quotas` — one row per player, weekly re-anchor quota, D11) + §9.3 (the quota gate +
//             single-statement decrement) + §9.4 (weekly reset + quota upgrade rides `HorizonTierAdvancedEvent`,
//             D12 — the intra-lot coupling).
//             Pattern (single-statement guarded decrement, `.returning()` decides success — NEVER a
//             read-then-write): `horizon-tier-advancement.repository.ts#advanceTier` (the monotone WHERE
//             double-wall, the exact shape `claimUse`/`raiseMaxUsesOnHorizonAdvanced` below transplant).
//             Pattern (elapsed-at-read, guarded UPDATE, no `@Cron`): `progression.repository.ts
//             #clearExpiredObservationWindow` (C5's T4-observation-expiry — the SAME "now derives in the
//             CALLER, threaded down as a parameter" shape `resetIfElapsed` below mirrors).
//             -- P3-H C1 -- 2026-07-24 (scaffold) / C7 -- 2026-07-24 (initQuota/claimUse/resetIfElapsed/
//             raiseMaxUsesOnHorizonAdvanced/readRaw)
//
// `PlayerReanchorQuotasRepository` — the REAL first writer of `player_reanchor_quotas` (mig 0141, C1
// scaffold). Every method here is a SINGLE guarded statement (0.4 atomic-first) — no method reads a row and
// then decides what to write in a SEPARATE round-trip:
//   - `initQuota` — lazy first-touch `INSERT ... ON CONFLICT (player_id) DO NOTHING` (mirrors `ensureBaseline`
//     /`ensureRow`'s own "lazy create, never a fabricated pre-existing row" convention).
//   - `claimUse` — the design §9.3 quota gate ITSELF: `UPDATE ... SET uses_remaining_this_week -= 1 WHERE
//     uses_remaining_this_week > 0 RETURNING ...` — zero rows returned IS the "quota exhausted" signal (the
//     concurrency falsifiable's own "single-statement decrement, loser 409, no double snapshot": a losing
//     concurrent caller's `.returning()` is empty, so it NEVER proceeds to snapshot any metric).
//   - `resetIfElapsed` — design §9.4/D11 elapsed-at-read: `WHERE week_reset_at <= :now` guards a reset that
//     also CATCHES UP any number of missed weeks in ONE statement (`GREATEST(1, CEIL(elapsed/7d))` — a
//     player returning after N idle weeks reads the CORRECT `max_uses_per_week` on their VERY NEXT read,
//     never needing N separate "tick" calls to converge — the literal "no cron" reading of D11).
//   - `raiseMaxUsesOnHorizonAdvanced` — design §9.4/D12: `WHERE max_uses_per_week < :newMax` — a monotone
//     raise, never a regression (mirrors `HorizonTierAdvancementRepository.advanceTier`'s own `= targetTier
//     - 1` monotone wall).
//   - `readRaw` — a plain SELECT (the `_test/vertical-horizon/reanchor-quota-raw` probe's own read, and the
//     `claimUse`/`raiseMaxUsesOnHorizonAdvanced` refusal-path's own "report the CURRENT state" fallback).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lt, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerReanchorQuota } from '../db/schema/vertical_horizon';

/** One `player_reanchor_quotas` row, JS-typed. */
export interface ReanchorQuotaRow {
  readonly usesRemaining: number;
  readonly maxUsesPerWeek: number;
  readonly weekResetAt: Date;
  readonly lastExecutedTick: number | null;
  readonly horizonTierAtUpgrade: number | null;
}

/** `claimUse`'s result — `claimed=false` means the guarded decrement's WHERE matched ZERO rows (the quota
 *  was genuinely 0 — see this file's own header for the concurrency proof). */
export interface ClaimUseResult {
  readonly claimed: boolean;
  readonly usesRemaining: number;
  readonly maxUsesPerWeek: number;
}

/** `resetIfElapsed`'s result — `null` means the guard did not match (no week has elapsed yet, or the row is
 *  missing — `initQuota` is always called first by every REAL caller, so the latter is unreachable there). */
export interface ResetResult {
  readonly usesRemaining: number;
  readonly maxUsesPerWeek: number;
}

/** `raiseMaxUsesOnHorizonAdvanced`'s result — `raised=false` means the monotone WHERE did not match (the
 *  computed band was not genuinely higher than the current max — never a regression, never an error). */
export interface RaiseMaxUsesResult {
  readonly raised: boolean;
  readonly maxUsesPerWeek: number;
}

@Injectable()
export class PlayerReanchorQuotasRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Lazy first-touch INSERT (design §9.4 — a player who has never re-anchored, and never advanced tier,
   * has NO row yet). `uses_remaining_this_week = max_uses_per_week = defaultMaxUses` (the T1 base —
   * `meta.reanchor_uses_per_week`, canon "Tier T1 (défaut): {{tunable}} usage/semaine"). `week_reset_at =
   * now() + 7 days` (the FIRST reset horizon, real wall-clock — R9). `ON CONFLICT (player_id) DO NOTHING` —
   * idempotent, safe to call on every quota touch (mirrors `ensureBaseline`'s own "lazy create, called every
   * time, a no-op past the first" convention).
   */
  async initQuota(playerId: string, defaultMaxUses: number): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO player_reanchor_quotas (player_id, uses_remaining_this_week, max_uses_per_week, week_reset_at)
      VALUES (${playerId}::uuid, ${defaultMaxUses}::smallint, ${defaultMaxUses}::smallint, now() + interval '7 days')
      ON CONFLICT (player_id) DO NOTHING
    `);
  }

  /**
   * design §9.3 — THE quota gate: a single guarded `UPDATE ... SET uses_remaining_this_week -= 1 WHERE
   * player_id = :p AND uses_remaining_this_week > 0 RETURNING ...`. Also stamps `last_executed_tick =
   * gameMinute` (design §3 — "null si jamais utilisé"; ONLY stamped on a genuine claim, never on a refusal).
   * `claimed=false` when the WHERE matches zero rows — the SAME "no read-then-write" idiom `HorizonTier
   * AdvancementRepository.advanceTier` establishes; the caller (`BenchmarkQuotaService.claimReAnchorUse`)
   * reads this BEFORE any metric is touched — a losing concurrent caller never reaches a snapshot write.
   */
  async claimUse(playerId: string, gameMinute: number): Promise<ClaimUseResult> {
    const updated = await this.db
      .update(playerReanchorQuota)
      .set({
        uses_remaining_this_week: sql`${playerReanchorQuota.uses_remaining_this_week} - 1`,
        last_executed_tick: gameMinute,
      })
      .where(and(eq(playerReanchorQuota.player_id, playerId), gt(playerReanchorQuota.uses_remaining_this_week, 0)))
      .returning({
        uses_remaining_this_week: playerReanchorQuota.uses_remaining_this_week,
        max_uses_per_week: playerReanchorQuota.max_uses_per_week,
      });
    if (updated.length === 0) {
      const row = await this.readRaw(playerId);
      return { claimed: false, usesRemaining: row?.usesRemaining ?? 0, maxUsesPerWeek: row?.maxUsesPerWeek ?? 0 };
    }
    return { claimed: true, usesRemaining: updated[0]!.uses_remaining_this_week, maxUsesPerWeek: updated[0]!.max_uses_per_week };
  }

  /**
   * design §9.4/D11 — elapsed-at-read weekly reset, NO `@Cron`: `WHERE week_reset_at <= :now` guards a
   * single UPDATE that resets `uses_remaining_this_week -> max_uses_per_week` AND advances `week_reset_at`
   * by `GREATEST(1, CEIL((now - week_reset_at) / 7 days))` whole weeks — a player returning after ANY number
   * of idle weeks converges to a FUTURE `week_reset_at` in this ONE call (never needing repeated "catch-up"
   * reads, the literal reading of "elapsed-at-read (no tick)"). Returns `null` when no reset was due (the
   * common case — most calls are a no-op, matching `clearExpiredObservationWindow`'s own "only THEN emits"
   * discipline this file's header cites). `now` is threaded from the CALLER (`BenchmarkQuotaService`
   * computes it once, mirrors `PressureTierService.onSessionStart`'s own "now derives WITHIN the SERVICE
   * method, never inside the repository" shape).
   */
  async resetIfElapsed(playerId: string, now: Date): Promise<ResetResult | null> {
    const result = await this.db.execute(sql`
      UPDATE player_reanchor_quotas
      SET
        uses_remaining_this_week = max_uses_per_week,
        week_reset_at = week_reset_at + (interval '7 days' *
          GREATEST(1, CEIL(EXTRACT(EPOCH FROM (${now}::timestamptz - week_reset_at)) / 604800.0)))
      WHERE player_id = ${playerId}::uuid AND week_reset_at <= ${now}::timestamptz
      RETURNING uses_remaining_this_week, max_uses_per_week
    `);
    const row = rowsOf(result)[0];
    if (!row) return null;
    return { usesRemaining: Number(row.uses_remaining_this_week), maxUsesPerWeek: Number(row.max_uses_per_week) };
  }

  /**
   * design §9.4/D12 — the intra-lot coupling's own write: a MONOTONE raise (`WHERE max_uses_per_week <
   * :newMax`), mirrors `HorizonTierAdvancementRepository.advanceTier`'s own guarded-WHERE wall. Also stamps
   * `horizon_tier_at_upgrade = tier` (design §3 — "REUSE decision_horizon_lock.md — tier qui a déclenché le
   * dernier upgrade"). `raised=false` when the computed band is NOT genuinely higher than the current max
   * (e.g. a prior larger override already in place, or a replayed/duplicate event) — never an error, never a
   * regression, mirrors the tier-advance replay's own "the caller's intent is already satisfied" posture.
   */
  async raiseMaxUsesOnHorizonAdvanced(playerId: string, newMax: number, tier: number): Promise<RaiseMaxUsesResult> {
    const updated = await this.db
      .update(playerReanchorQuota)
      .set({ max_uses_per_week: newMax, horizon_tier_at_upgrade: tier })
      .where(and(eq(playerReanchorQuota.player_id, playerId), lt(playerReanchorQuota.max_uses_per_week, newMax)))
      .returning({ max_uses_per_week: playerReanchorQuota.max_uses_per_week });
    if (updated.length === 0) {
      const row = await this.readRaw(playerId);
      return { raised: false, maxUsesPerWeek: row?.maxUsesPerWeek ?? newMax };
    }
    return { raised: true, maxUsesPerWeek: updated[0]!.max_uses_per_week };
  }

  /**
   * A plain SELECT — the `_test/vertical-horizon/reanchor-quota-raw` probe's own read (never bucketed —
   * there is no bucket for a quota, unlike `player_metric_benchmarks`'s `DriftBucketEnum`), and the
   * refusal-path fallback for `claimUse`/`raiseMaxUsesOnHorizonAdvanced` above. `null` when the player has no
   * row yet (a caller that never went through `initQuota` — every REAL production path does).
   */
  async readRaw(playerId: string): Promise<ReanchorQuotaRow | null> {
    const rows = await this.db
      .select({
        uses_remaining_this_week: playerReanchorQuota.uses_remaining_this_week,
        max_uses_per_week: playerReanchorQuota.max_uses_per_week,
        week_reset_at: playerReanchorQuota.week_reset_at,
        last_executed_tick: playerReanchorQuota.last_executed_tick,
        horizon_tier_at_upgrade: playerReanchorQuota.horizon_tier_at_upgrade,
      })
      .from(playerReanchorQuota)
      .where(eq(playerReanchorQuota.player_id, playerId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      usesRemaining: row.uses_remaining_this_week,
      maxUsesPerWeek: row.max_uses_per_week,
      weekResetAt: row.week_reset_at,
      lastExecutedTick: row.last_executed_tick,
      horizonTierAtUpgrade: row.horizon_tier_at_upgrade,
    };
  }
}

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own established idiom — mirrors
 *  `player-metric-benchmarks.repository.ts#rowsOf`, never a shared cross-repository extraction). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}
