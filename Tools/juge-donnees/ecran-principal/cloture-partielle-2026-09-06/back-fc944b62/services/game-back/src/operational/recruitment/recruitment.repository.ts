// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C2 (Quest machine + Saltline
//             pool — the persisted access layer)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §4 (the quest state
//             machine) + §5 (the Saltline pool)
//             Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md DD-R2 (step
//             tables are code-owned, not DB tables) / DD-R3 (`expected_outcome` = the C3 mapper's leg,
//             untouched here)
//             Pattern: services/game-back/src/operational/enforcement/repair.repository.ts
//             (`getCurrentTick` — the citySimClock read convention this file's `getCurrentGameMinute`
//             mirrors verbatim) + services/game-back/src/operational/maintenance/maintenance.repository.ts
//             (`debitAndArmRepair`/guarded-UPDATE-then-INSERT tx shape `startQuestAtomic` mirrors) +
//             services/game-back/src/operational/lieutenant/lieutenant.repository.ts (`countByPlayer` — the
//             roster-cap pre-check query `countLieutenants` mirrors verbatim)
//             — 04f-B C2 — 2026-07-11
//
// `RecruitmentRepository` — the persisted access layer for the 04f-B quest machine (C2: `startQuest` /
// `advanceStep` / `abandon` + the Saltline candidate surface). NO schema change (C1 landed
// `recruitment_candidates` + `recruitment_quests`, mig 0124).
//
// GUARDED-UPDATE INSTEAD OF CATCHING A RAW UNIQUE-VIOLATION (the partial-unique proof, plan §C2): rather
// than relying on Postgres to reject a 2nd INSERT against `recruitment_quests_one_active_per_candidate_uq`
// and catching a driver-specific 23505 error (no precedent for that in this codebase — every other guarded
// mutation uses a `WHERE <status>` guard + `RETURNING` row-count check instead), `startQuestAtomic` first
// performs a GUARDED UPDATE of `recruitment_candidates.status` (`'available' -> 'in_quest'`, WHERE
// status='available') INSIDE the same transaction. Postgres's row-level lock on that UPDATE makes two
// concurrent `startQuest` calls on the SAME candidate serialize: only one observes `status='available'` and
// wins; the other sees 0 rows affected and the transaction throws a typed conflict BEFORE any
// `recruitment_quests` INSERT is attempted. This produces the exact "2nd active quest on the same candidate
// -> 409" behavior the C1 partial-unique index also independently guarantees (belt-and-braces: the DB index
// is the last-resort integrity guarantee if this guard is ever bypassed by a bug; C1's own
// `recruitment_schema_tunables.spec.ts` already proves the index bites at the raw-SQL level).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNotNull, lt, not, or, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { citySimTunables } from '../../citysim/citysim-tunables';
// REUSE the SAME game-day derivation every other 04f/political/grow consumer uses (maintenance.repository.ts
// precedent) — a recruitment-owned re-derivation would risk drifting from the shared convention.
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { lieutenant } from '../../db/schema/lieutenant';
// C5 (D9) — the guarded vetting-cost debit (mirrors `LieutenantRepository.recruit`'s own guarded hire-debit
// convention, `lieutenant.repository.ts:717-728`): a plain `UPDATE ... WHERE cash_cents >= cost` INSIDE
// `advanceQuestAtomic`'s transaction — insufficient balance throws (rolls back the WHOLE advance, no
// partial step/debit).
import { economyState } from '../../db/schema/player_economy_state';
// C4 (D8) — REUSE: a DIRECT read of `rival_state.regime` (design §9 seam 9, "REUSE — read"). Mirrors the
// `lieutenant` table import above (a sibling-module table read directly, no cross-module DI/import of
// RivalAiModule needed for a plain SELECT — the MaintenanceRepository/GrowRepository precedent this
// file's own header already cites for `countLieutenants`).
import { rivalState } from '../../db/schema/conflict_rival';
// C4 (D7) — REUSE: a DIRECT read of the LIVE `rich_citizens` columns (design §9 seam 4, read-only —
// citizens are NEVER mutated by recruitment).
import { richCitizenRow, type RichCitizenRow } from '../../db/schema/sparse_citizens';
import {
  recruitmentCandidates,
  recruitmentQuests,
  type RecruitmentCandidateInsert,
  type RecruitmentCandidateRow,
  type RecruitmentQuestRow,
} from '../../db/schema/recruitment';

/** Candidate statuses that count as "already outstanding" for the C4 dedup gates (D7/D8) — a candidate
 *  mid-quest (`in_quest`) still occupies its rival/citizen slot just as much as a browsable `available`
 *  one; only terminal statuses (`hired`/`expired`/`declined`) free the slot for a fresh surfacing. */
const NON_TERMINAL_CANDIDATE_STATUSES = ['available', 'in_quest'] as const;

/** C7 — the shipped `rival_key` pgEnum domain (mirrors `RivalAdminController`'s own local `ALL_RIVAL_KEYS`
 *  const, `rival-admin.controller.ts` — no shared constants module exists to import this from; every
 *  BO-adjacent consumer of this closed 4-member domain declares it locally). Used ONLY by `rivalExists`'s
 *  runtime validation below (a `force-defector-trigger` request for a garbage `rival_key` must 404, never
 *  reach the DB with a type-widened string). */
const RIVAL_KEY_DOMAIN = ['coil', 'tarcum', 'iron_throat', 'saltline'] as const;
type RivalKeyDomain = (typeof RIVAL_KEY_DOMAIN)[number];
function isRivalKeyDomain(v: string): v is RivalKeyDomain {
  return (RIVAL_KEY_DOMAIN as readonly string[]).includes(v);
}

/** One decision-log entry (design §3/§4 — the append-only `decisions_made` shape). Additional fields beyond
 *  the base 4 (e.g. `revealed_axis` on a `trial_task` entry) are allowed — the base 4 are the contract. */
export interface RecruitmentDecisionEntry {
  step: number;
  decision_type: string;
  decision_value: unknown;
  at_game_minute: number;
  [extra: string]: unknown;
}

@Injectable()
export class RecruitmentRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Clock reads (REUSE — the RepairRepository.getCurrentTick / MaintenanceRepository convention)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** The player's CURRENT in-game minute (`city_sim_clock.game_minute`). 0 when the player has no clock row
   *  yet (the deterministic advance harness lazy-creates it on first advance). NOT a write. */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /** The player's CURRENT game-day + game-minute (mirrors `MaintenanceRepository.getCurrentGameDayAndMinute`
   *  — the Saltline replenish tick's `(player_id, game_day, slot)` seed input, C4-forward but generation
   *  itself lands here per plan §C2). */
  async getCurrentGameDayAndMinute(playerId: string): Promise<{ gameMinute: number; currentGameDay: number }> {
    const gameMinute = await this.getCurrentGameMinute(playerId);
    const currentGameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);
    return { gameMinute, currentGameDay };
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Roster-cap pre-check (design §4 — "roster not full (pre-check courtesy; the BINDING gate at hire is
  // authoritative)"; REUSE the EXACT LieutenantRepository.countByPlayer query — no cross-module DI import
  // needed since this is a plain read on an already-shared table, the MaintenanceRepository /
  // GrowRepository precedent of reading a sibling module's table directly)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** Count the player's current lieutenant roster (mirrors `LieutenantRepository.countByPlayer` verbatim). */
  async countLieutenants(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(lieutenant)
      .where(eq(lieutenant.player_id, playerId));
    return Number(rows[0]?.n ?? 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Candidates (C2 — the Saltline surface; defector/civilian rows are C4/C5/C6's own writers)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** Count a player's `available` candidates for a pool (the replenish-to-cap input). */
  async countAvailableCandidates(playerId: string, pool: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(recruitmentCandidates)
      .where(
        and(
          eq(recruitmentCandidates.player_id, playerId),
          eq(recruitmentCandidates.pool, pool as RecruitmentCandidateInsert['pool']),
          eq(recruitmentCandidates.status, 'available'),
        ),
      );
    return Number(rows[0]?.n ?? 0);
  }

  /** Bulk-insert freshly-generated candidates (the Saltline replenish write). Returns the inserted rows. */
  async insertCandidates(rows: RecruitmentCandidateInsert[]): Promise<RecruitmentCandidateRow[]> {
    if (rows.length === 0) return [];
    return this.db.insert(recruitmentCandidates).values(rows).returning();
  }

  /** List a player's candidates, optionally filtered by pool. Defaults to `status='available'` (the
   *  player-facing "GET candidates" contract, design §10 — a hired/expired/declined candidate is not a
   *  browsable option). */
  async listAvailableCandidates(playerId: string, pool?: string): Promise<RecruitmentCandidateRow[]> {
    const conditions = [eq(recruitmentCandidates.player_id, playerId), eq(recruitmentCandidates.status, 'available')];
    if (pool) conditions.push(eq(recruitmentCandidates.pool, pool as RecruitmentCandidateInsert['pool']));
    return this.db
      .select()
      .from(recruitmentCandidates)
      .where(and(...conditions))
      .orderBy(desc(recruitmentCandidates.surfaced_at_game_day));
  }

  /** Ownership-scoped candidate read (never leaks another player's candidate — the caller maps a miss to a
   *  clean 404, never distinguishing "does not exist" from "not yours"). */
  async getCandidateForPlayer(playerId: string, candidateId: string): Promise<RecruitmentCandidateRow | null> {
    const rows = await this.db
      .select()
      .from(recruitmentCandidates)
      .where(and(eq(recruitmentCandidates.candidate_id, candidateId), eq(recruitmentCandidates.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Quests (C2 — start / advance / abandon; `finalizeHire` is C3's own writer, not added here)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** Ownership-scoped quest read (the caller maps a miss to a clean 404 — "another player advancing the
   *  quest -> 404", plan §C2 falsifiable floor). */
  async getQuestForPlayer(playerId: string, questId: string): Promise<RecruitmentQuestRow | null> {
    const rows = await this.db
      .select()
      .from(recruitmentQuests)
      .where(and(eq(recruitmentQuests.quest_id, questId), eq(recruitmentQuests.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** List a player's quests, filtered by active (`outcome IS NULL`) or ended (`outcome IS NOT NULL`). */
  async listQuests(playerId: string, status: 'active' | 'history'): Promise<RecruitmentQuestRow[]> {
    const outcomeCond =
      status === 'active' ? sql`${recruitmentQuests.outcome} IS NULL` : sql`${recruitmentQuests.outcome} IS NOT NULL`;
    return this.db
      .select()
      .from(recruitmentQuests)
      .where(and(eq(recruitmentQuests.player_id, playerId), outcomeCond))
      .orderBy(desc(recruitmentQuests.started_at));
  }

  /**
   * ATOMIC start-quest transaction: (1) GUARDED UPDATE the candidate `available -> in_quest` (WHERE
   * status='available' — the partial-unique proof's app-level guard, see the file header); 0 rows affected
   * -> a typed conflict is thrown and the tx rolls back (no quest row, candidate untouched). (2) INSERT the
   * `recruitment_quests` row at `current_step=1`, `sessions_consumed=0`, `decisions_made=[]`, AND
   * `last_advanced_at_game_minute = gameMinuteNow` — the D2 session-gate anchor is armed AT CREATION (not
   * left NULL): the FIRST `advanceStep` call is gated exactly like every subsequent one, which is what makes
   * the plan's keystone falsifiable proof ("attempt advanceStep BEFORE the session duration elapses ->
   * REJECTED") true for the VERY FIRST advance, not just the 2nd+. (This is a deliberate, documented
   * refinement of C1's descriptive schema comment "NULL until the first advance" — C1 was a pure data-model
   * chunk that had not yet defined the consuming write-time semantics; no C1 floor assertion depended on the
   * NULL-at-creation reading, per `recruitment_schema_tunables.spec.ts`'s own column-shape-only check.)
   * Throws `{ conflict: true }` (never a raw driver error) on the guard miss — the caller maps it to 409.
   */
  async startQuestAtomic(params: {
    playerId: string;
    candidateId: string;
    questType: string;
    gameMinuteNow: number;
  }): Promise<RecruitmentQuestRow> {
    const { playerId, candidateId, questType, gameMinuteNow } = params;
    return this.db.transaction(async (tx) => {
      const guarded = await tx
        .update(recruitmentCandidates)
        .set({ status: 'in_quest' })
        .where(and(eq(recruitmentCandidates.candidate_id, candidateId), eq(recruitmentCandidates.status, 'available')))
        .returning({ candidate_id: recruitmentCandidates.candidate_id });
      if (guarded.length === 0) {
        throw new RecruitmentConflictError('candidate is not available (already in a quest, hired, or expired)');
      }
      const [quest] = await tx
        .insert(recruitmentQuests)
        .values({
          player_id: playerId,
          quest_type: questType as RecruitmentCandidateInsert['pool'],
          candidate_id: candidateId,
          current_step: 1,
          sessions_consumed: 0,
          last_advanced_at_game_minute: gameMinuteNow,
          decisions_made: [] as unknown as RecruitmentDecisionEntry[],
        })
        .returning();
      return quest;
    });
  }

  /**
   * ATOMIC advance-step: appends `decisionEntry` to `decisions_made` (jsonb `||` concatenation — never a
   * read-modify-write in JS, so two sequential advances from the SAME request race window never lose an
   * entry), increments `current_step` + `sessions_consumed` by exactly 1, and stamps
   * `last_advanced_at_game_minute = gameMinuteNow` (re-arming the gate for the NEXT advance). Guarded by
   * `current_step = expectedCurrentStep` — a stale/concurrent double-advance affects 0 rows, and the caller
   * treats that as a conflict (belt-and-braces; the service layer's own session-gate + quest-state reads
   * are the primary guard).
   *
   * `incrementVettingSessionsRun` (04f-B C5, D9 — OPTIONAL, ADDITIVE): when `true`, ALSO increments
   * `vetting_sessions_run` by 1 in the SAME update (a REAL, non-skipped defector vetting session). Absent
   * for saltline (and defector's `skip:true`/`approach`/`negotiation` steps) → the column is untouched,
   * byte-identical to before C5.
   *
   * `debit` (04f-B C5, D9 — OPTIONAL, ADDITIVE): when provided, a GUARDED DEBIT (`UPDATE economy_states SET
   * cash_cents = cash_cents - cost WHERE player_id = ? AND cash_cents >= cost`, the
   * `LieutenantRepository.recruit` guarded-debit convention, `lieutenant.repository.ts:717-728`) runs
   * INSIDE this SAME transaction, AFTER the step-guard UPDATE succeeds (0-row step guard → `null` return,
   * no debit ever attempted) — insufficient balance throws `RecruitmentConflictError`, rolling back the
   * WHOLE transaction (the step advance AND the debit both undone: "insufficient → 409 + zero state
   * change", the same contract `LieutenantRepository.recruit`'s hire debit already proves). Absent for
   * saltline (and defector's `skip:true`/`approach`/`negotiation` steps) → no debit attempted,
   * byte-identical to before C5.
   */
  async advanceQuestAtomic(params: {
    questId: string;
    expectedCurrentStep: number;
    decisionEntry: RecruitmentDecisionEntry;
    gameMinuteNow: number;
    incrementVettingSessionsRun?: boolean;
    debit?: { playerId: string; costCents: number };
  }): Promise<RecruitmentQuestRow | null> {
    const { questId, expectedCurrentStep, decisionEntry, gameMinuteNow, incrementVettingSessionsRun, debit } = params;
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(recruitmentQuests)
        .set({
          current_step: sql`${recruitmentQuests.current_step} + 1`,
          sessions_consumed: sql`${recruitmentQuests.sessions_consumed} + 1`,
          last_advanced_at_game_minute: gameMinuteNow,
          decisions_made: sql`${recruitmentQuests.decisions_made} || ${JSON.stringify([decisionEntry])}::jsonb`,
          ...(incrementVettingSessionsRun
            ? { vetting_sessions_run: sql`${recruitmentQuests.vetting_sessions_run} + 1` }
            : {}),
        })
        .where(and(eq(recruitmentQuests.quest_id, questId), eq(recruitmentQuests.current_step, expectedCurrentStep)))
        .returning();
      if (rows.length === 0) return null; // step-guard miss — no debit attempted, tx harmlessly commits a no-op.

      if (debit) {
        const debited = await tx
          .update(economyState)
          .set({ cash_cents: sql`${economyState.cash_cents} - ${debit.costCents}` })
          .where(and(eq(economyState.player_id, debit.playerId), sql`${economyState.cash_cents} >= ${debit.costCents}`))
          .returning({ cash_cents: economyState.cash_cents });
        if (debited.length === 0) {
          // Throwing rolls back the WHOLE tx — including the step-advance UPDATE above (no partial state).
          throw new RecruitmentConflictError(
            `insufficient balance for the vetting cost (${debit.costCents} cents) — no state change.`,
          );
        }
      }

      return rows[0];
    });
  }

  /**
   * ATOMIC finalize-hire (C3, D4/D5): `outcome='hired'` + `ended_at=now()` + `hire_quality_bucket` +
   * `expected_outcome` (the mapper's FINAL projection — the DD-R3 "predicted-at-last-step ≡ seeded" leg) on
   * the quest, THEN the candidate → `status='hired'`. Guarded by `outcome IS NULL` (mirrors
   * `abandonQuestAtomic` — a concurrently-ended quest affects 0 rows; the caller maps that to 409). Called
   * AFTER `LieutenantService.recruit` has ALREADY committed (a separate, prior transaction — see the C3
   * handoff report for the documented atomicity boundary: the lieutenant-creation tx and this quest-status
   * tx are sequential, not one giant cross-module transaction).
   *
   * `doubleAgent` (04f-B C5, D9 — OPTIONAL, ADDITIVE): the defector residual roll's outcome
   * (`recruitment_quests.double_agent`, the C1 server/BO-only column — the `<DefectorRiskRegistry>` BO
   * surface's future read target). Absent (saltline/civilian) → the column stays its honest NULL default,
   * byte-identical to before C5 ("NULL... n/a (saltline/civilian — stays NULL forever)", C1 schema note).
   */
  async finalizeHireAtomic(params: {
    questId: string;
    candidateId: string;
    hireQualityBucket: string;
    expectedOutcome: Record<string, unknown>;
    doubleAgent?: boolean;
  }): Promise<RecruitmentQuestRow | null> {
    const { questId, candidateId, hireQualityBucket, expectedOutcome, doubleAgent } = params;
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(recruitmentQuests)
        .set({
          outcome: 'hired',
          ended_at: sql`now()`,
          hire_quality_bucket: hireQualityBucket as RecruitmentQuestRow['hire_quality_bucket'],
          expected_outcome: expectedOutcome,
          ...(doubleAgent !== undefined ? { double_agent: doubleAgent } : {}),
        })
        .where(and(eq(recruitmentQuests.quest_id, questId), sql`${recruitmentQuests.outcome} IS NULL`))
        .returning();
      if (rows.length === 0) return null;
      await tx.update(recruitmentCandidates).set({ status: 'hired' }).where(eq(recruitmentCandidates.candidate_id, candidateId));
      return rows[0];
    });
  }

  /** ATOMIC abandon: outcome='abandoned' + ended_at=now() on the quest; the candidate reverts to
   *  'available' (C2 has no expiry concept yet — that is C4's tick; an abandoned quest's candidate is
   *  always immediately re-browsable). No-op (0 rows) if the quest is not active — the caller maps that to
   *  a 409 (already ended). */
  async abandonQuestAtomic(questId: string, candidateId: string): Promise<RecruitmentQuestRow | null> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(recruitmentQuests)
        .set({ outcome: 'abandoned', ended_at: sql`now()` })
        .where(and(eq(recruitmentQuests.quest_id, questId), sql`${recruitmentQuests.outcome} IS NULL`))
        .returning();
      if (rows.length === 0) return null;
      await tx
        .update(recruitmentCandidates)
        .set({ status: 'available' })
        .where(eq(recruitmentCandidates.candidate_id, candidateId));
      return rows[0];
    });
  }

  /**
   * ATOMIC decline (C6, the PRESSING-twice predicate — design §5 steps 2-3): outcome='declined_candidate'
   * + ended_at=now() on the quest; the candidate goes to `'declined'` — NEVER `'available'` (the design's
   * own "candidate NOT re-available" wording — mirrors `abandonQuestAtomic` exactly except the terminal
   * candidate status). No-op (0 rows) if the quest is not active (belt-and-braces — the caller already
   * holds the just-durably-written `updated` row when it checks the predicate, so this should always hit).
   */
  async declineQuestAtomic(questId: string, candidateId: string): Promise<RecruitmentQuestRow | null> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(recruitmentQuests)
        .set({ outcome: 'declined_candidate', ended_at: sql`now()` })
        .where(and(eq(recruitmentQuests.quest_id, questId), sql`${recruitmentQuests.outcome} IS NULL`))
        .returning();
      if (rows.length === 0) return null;
      await tx
        .update(recruitmentCandidates)
        .set({ status: 'declined' })
        .where(eq(recruitmentCandidates.candidate_id, candidateId));
      return rows[0];
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C6 — Civilian quest depth reads (affinity_source ownership + the initiation/demographic fit check)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** C6 — the `affinity_source` closed-list ownership check (design §5 step 1: "closed list of the
   *  player's OWN lieutenants"). Never distinguishes "no such lieutenant" from "another player's
   *  lieutenant" — both are simply `false` (never a cross-player leak, mirrors every other ownership
   *  check in this repository). */
  async playerOwnsLieutenant(playerId: string, lieutenantId: string): Promise<boolean> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(lieutenant)
      .where(and(eq(lieutenant.lieutenant_id, lieutenantId), eq(lieutenant.player_id, playerId)));
    return Number(rows[0]?.n ?? 0) > 0;
  }

  /** C6 — the civilian candidate's citizen demographic (design §5 step 3': the initiation-task/demographic
   *  fit check, `CivilianRecruitmentService.initiationMismatch`). Read-only — `rich_citizens` rows are
   *  NEVER mutated by recruitment (design §9 seam 4). `null` if the citizen row no longer exists
   *  (defensive only — every civilian candidate's `citizen_id` is set by the C4 tick). */
  async getCitizenDemographic(citizenId: string): Promise<string | null> {
    const rows = await this.db
      .select({ demographic: richCitizenRow.demographic })
      .from(richCitizenRow)
      .where(eq(richCitizenRow.citizen_id, citizenId))
      .limit(1);
    return rows[0]?.demographic ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C4 — Availability tick reads/writes (D7 civilian affinity, D8 defector regime, candidate expiry)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** D8 — the rival_key values CURRENTLY in a qualifying regime (`bleeding`|`retrench`) for this player.
   *  A DIRECT read of `rival_state.regime` (design §9 seam 9, REUSE) — no rival-engine mutation. */
  async listQualifyingDefectorRivalKeys(playerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ rival_key: rivalState.rival_key })
      .from(rivalState)
      .where(and(eq(rivalState.player_id, playerId), inArray(rivalState.regime, ['bleeding', 'retrench'])));
    return rows.map((r) => r.rival_key);
  }

  /** D8 dedup gate — `source_rival_key` values that ALREADY have a non-terminal (available|in_quest)
   *  defector candidate for this player (the "one live defector candidate per qualifying rival" guard). */
  async listActiveDefectorSourceRivalKeys(playerId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ source_rival_key: recruitmentCandidates.source_rival_key })
      .from(recruitmentCandidates)
      .where(
        and(
          eq(recruitmentCandidates.player_id, playerId),
          eq(recruitmentCandidates.pool, 'defector'),
          inArray(recruitmentCandidates.status, [...NON_TERMINAL_CANDIDATE_STATUSES]),
        ),
      );
    return new Set(rows.map((r) => r.source_rival_key).filter((k): k is string => k !== null));
  }

  /** D7 dedup gate — `citizen_id` values that ALREADY have a non-terminal (available|in_quest) civilian
   *  candidate for this player (never re-surface the same citizen while their slot is still occupied). */
  async listActiveCivilianCitizenIds(playerId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ citizen_id: recruitmentCandidates.citizen_id })
      .from(recruitmentCandidates)
      .where(
        and(
          eq(recruitmentCandidates.player_id, playerId),
          eq(recruitmentCandidates.pool, 'civilian'),
          inArray(recruitmentCandidates.status, [...NON_TERMINAL_CANDIDATE_STATUSES]),
        ),
      );
    return new Set(rows.map((r) => r.citizen_id).filter((id): id is string => id !== null));
  }

  /**
   * D7 — the LIVE `rich_citizens` predicate (design §9/§7): `alive=true` AND `satisfaction >=
   * satisfactionThreshold` AND (`loyalty_dealer_id IS NOT NULL` OR `demographic='connector'`), excluding
   * any citizen already carrying an active candidate (the dedup set from `listActiveCivilianCitizenIds`),
   * capped at `limit`. Read-only — `rich_citizens` rows are NEVER mutated by recruitment (design §9 seam 4).
   */
  async listAffinityQualifyingCitizens(
    playerId: string,
    satisfactionThreshold: number,
    excludeCitizenIds: string[],
    limit: number,
  ): Promise<RichCitizenRow[]> {
    if (limit <= 0) return [];
    const conditions = [
      eq(richCitizenRow.player_id, playerId),
      eq(richCitizenRow.alive, true),
      gte(richCitizenRow.satisfaction, satisfactionThreshold),
      or(isNotNull(richCitizenRow.loyalty_dealer_id), eq(richCitizenRow.demographic, 'connector'))!,
    ];
    if (excludeCitizenIds.length > 0) {
      conditions.push(not(inArray(richCitizenRow.citizen_id, excludeCitizenIds)));
    }
    return this.db
      .select()
      .from(richCitizenRow)
      .where(and(...conditions))
      .orderBy(richCitizenRow.citizen_id)
      .limit(limit);
  }

  /**
   * Candidate expiry (design §9 step 4): every `available` candidate for this player whose
   * `expires_at_game_day` has passed → `expired` (excluded from `GET candidates` — `listAvailableCandidates`
   * filters on `status='available'`). Idempotent: a candidate already `expired` never matches
   * `status='available'` again, so a same/later-day re-run touches 0 further rows for it.
   */
  async expireStaleCandidates(playerId: string, gameDay: number): Promise<number> {
    const rows = await this.db
      .update(recruitmentCandidates)
      .set({ status: 'expired' })
      .where(
        and(
          eq(recruitmentCandidates.player_id, playerId),
          eq(recruitmentCandidates.status, 'available'),
          isNotNull(recruitmentCandidates.expires_at_game_day),
          lt(recruitmentCandidates.expires_at_game_day, gameDay),
        ),
      )
      .returning({ candidate_id: recruitmentCandidates.candidate_id });
    return rows.length;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C7 — BO admin reads/existence-guards (recruitment-admin.controller.ts, design §11)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * C7 — does a REAL `rival_state` row exist for `(playerId, rivalKey)`? The `force-defector-trigger`
   * endpoint's "not a row poke" existence guard (design §11): the FORCE bypasses the D8
   * regime-eligibility gate (`regime ∈ {bleeding, retrench}`, `listQualifyingDefectorRivalKeys`) —
   * that is the whole point of a live-ops force — but the target rival must still be a REAL, seeded
   * `rival_state` row, never an arbitrary caller-supplied string. Runtime-validates `rivalKey` against
   * the closed `RIVAL_KEY_DOMAIN` FIRST (a garbage key can never reach the DB query).
   */
  async rivalExists(playerId: string, rivalKey: string): Promise<boolean> {
    if (!isRivalKeyDomain(rivalKey)) return false;
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(rivalState)
      .where(and(eq(rivalState.player_id, playerId), eq(rivalState.rival_key, rivalKey)));
    return Number(rows[0]?.n ?? 0) > 0;
  }

  /**
   * C7 — the `rich_citizens` row for `(playerId, citizenId)`, ownership-scoped (the `force-civilian-
   * candidate` endpoint's existence guard — the caller maps a miss to a clean 404, never distinguishing
   * "no such citizen" from "another player's citizen", mirrors `playerOwnsLieutenant`'s own posture).
   * Read-only — `rich_citizens` rows are NEVER mutated by recruitment (design §9 seam 4, unchanged here).
   */
  async getCitizenForPlayer(playerId: string, citizenId: string): Promise<RichCitizenRow | null> {
    const rows = await this.db
      .select()
      .from(richCitizenRow)
      .where(and(eq(richCitizenRow.citizen_id, citizenId), eq(richCitizenRow.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * C7 — EVERY candidate row (every status, every pool) for a player — the `GET .../candidate-pools`
   * admin read (design §11: "current availability per pool"). Unlike `listAvailableCandidates`
   * (player-facing, `status='available'` only), this surfaces the FULL lifecycle (`in_quest`/`hired`/
   * `expired`/`declined` too) for the ops diagnostic view — the controller folds this into a
   * per-pool `{ available, status_counts }` breakdown (the `getCriticalBuildings`/`phase_distribution`
   * "natural byproduct of the SAME query" precedent, `maintenance-admin.controller.ts`).
   */
  async listAllCandidatesForPlayer(playerId: string): Promise<RecruitmentCandidateRow[]> {
    return this.db
      .select()
      .from(recruitmentCandidates)
      .where(eq(recruitmentCandidates.player_id, playerId))
      .orderBy(desc(recruitmentCandidates.surfaced_at_game_day));
  }
}

/** Typed conflict thrown by `startQuestAtomic` on a guard miss — the service layer maps it to 409
 *  RESOURCE_STATE_CONFLICT (never a raw driver/transaction error reaching the controller). */
export class RecruitmentConflictError extends Error {}
