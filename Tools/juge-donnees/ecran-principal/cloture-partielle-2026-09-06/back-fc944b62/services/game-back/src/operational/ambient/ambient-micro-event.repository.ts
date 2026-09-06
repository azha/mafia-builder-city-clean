// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C2 (ambient-micro-event
//             repository — decay sweep + Poisson-seeded generation + attend claim + feed reads)
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.2 (stream) +
//             §3.3 (attend) + §8 (idempotence/crash-safety)
//             R9.3: docs/tech/09_data_model/schema_ambient_world.md — this READS the schema and
//             INSERT/UPDATEs ambient_micro_event; it NEVER redefines the table.
//             Seam: services/game-back/src/db/schema/city_state.ts (buildings.player_id/block_id) +
//             world_geography.ts (blocks.district_id → districts.id) — the SAME buildings→blocks→
//             districts idiom `ash-appointment.repository.ts`'s `validateGlassVenue` uses (owned-building
//             district resolution).
//             — 04g-A C2 — 2026-07-13
//
// `AmbientMicroEventRepository` — the persisted access layer over `ambient_micro_event`. Copies the
// persisted-projection repository template (`constant-hum.repository.ts` / `heat.repository.ts`): a thin
// `*.repository.ts` owning the raw Drizzle reads/writes.
//
// `generateForDistrict` — the per-(game_day, district) atomic generation claim (design §8: "génération
// idempotente par (game_day, district) — si des rows existent déjà pour ce couple, skip"). Mirrors
// `CohesionPermafrostRepository.seedDistricts`'s race-safe idiom: a `pg_advisory_xact_lock` scoped to the
// (game_day, district) key SERIALIZES concurrent claims for the SAME couple across DB sessions, and the
// existence check runs INSIDE that same locked transaction — so two players' NIGHTLY firings landing on
// the SAME (game_day, district) never both insert (the second sees the first's committed rows and skips).
// The K/kinds/hours to insert are computed by the CALLER (`ambient-micro-event.service.ts`'s
// `generateDistrictDraw`, a pure function of the seed) — this repository only owns the claim + the write.
//
// `claimAttend` — the TOCTOU-safe attend claim (design §3.3: "conflit concurrent : UPDATE conditionnel
// WHERE status='live', perdant → 409"). A single conditional `UPDATE ... WHERE id=? AND status='live' AND
// expires_at_game_minute > ?` — never a read-then-write. Exactly one of two concurrent callers for the
// SAME event id affects a row; the loser's WHERE clause matches nothing (0 rows), and the caller maps that
// to a 404 (never existed) or 409 (already attended / expired) via a cheap follow-up read that does NOT
// affect the atomicity already decided by the UPDATE.
//
// `sweepExpired` — ONE set-based UPDATE (design §3.2: "events live dont l'expiry est passée → expired").
// The ROW *IS* the residue (D9) — this call touches ONLY `ambient_micro_event.status`, nothing else (no
// cohesion / heat / any other table — the C2 AC4 "0 state mutation" proof).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks, districts } from '../../db/schema/world_geography';
import { citySimClock } from '../../db/schema/city_sim_clock';
import {
  ambientChannel,
  ambientMicroEvent,
  ambientMicroEventKind,
  type AmbientMicroEventRow,
} from '../../db/schema/ambient_world';

/** The 6-member `ambient_micro_event_kind` domain, TS-narrowed from the pgEnum (single source of truth —
 *  never a hand-duplicated string union). */
export type AmbientMicroEventKindValue = (typeof ambientMicroEventKind.enumValues)[number];
/** The 3-member `ambient_channel` domain, TS-narrowed from the pgEnum. */
export type AmbientChannelValue = (typeof ambientChannel.enumValues)[number];

/** One micro-event row to insert — computed by the service's pure `generateDistrictDraw` (the seeded
 *  count → kinds → hours sequence, design §3.2). */
export interface NewAmbientMicroEventRow {
  readonly game_day: number;
  readonly district_id: number;
  readonly hour_of_week: number;
  readonly kind: AmbientMicroEventKindValue;
  readonly channel: AmbientChannelValue;
  readonly expires_at_game_minute: number;
}

/** The outcome of a `claimAttend` call (see file header). */
export type ClaimAttendResult =
  | { readonly ok: true; readonly districtId: number }
  | { readonly ok: false; readonly reason: 'not_found' | 'conflict' };

@Injectable()
export class AmbientMicroEventRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── NIGHTLY/27 phase 1: decay + generation ─────────────────────────────

  /** All canonical district ids (the GLOBAL static `districts` table) — the generation loop's district
   *  set (city-global, NOT gated by player buildings — design §3.2, F4 estimate "λ=1.5 × 18"). */
  async listAllDistrictIds(): Promise<number[]> {
    const rows = await this.db.select({ id: districts.id }).from(districts).orderBy(districts.id);
    return rows.map((r) => r.id);
  }

  /** Decay sweep (design §3.2, BEFORE generation): every `live` row whose expiry has passed → `expired`.
   *  ONE set-based UPDATE — touches ONLY `status` (the "routine residue" row, D9; C2 AC4's 0-side-effect
   *  proof). Returns the count of rows flipped (diagnostic). */
  async sweepExpired(nowGameMinute: number): Promise<number> {
    const rows = await this.db
      .update(ambientMicroEvent)
      .set({ status: 'expired' })
      .where(and(eq(ambientMicroEvent.status, 'live'), lte(ambientMicroEvent.expires_at_game_minute, nowGameMinute)))
      .returning({ id: ambientMicroEvent.id });
    return rows.length;
  }

  /**
   * The per-(game_day, district) atomic generation claim (see file header). `rows` is the FULL batch to
   * insert for this district THIS game_day (already computed by the pure draw — deterministic, so a
   * skipped/retried call reproduces the identical batch, never a different one). Returns the number of
   * rows actually inserted (0 iff the claim was already consumed — the idempotence proof, C2 AC3).
   */
  async generateForDistrict(gameDay: number, districtId: number, rows: readonly NewAmbientMicroEventRow[]): Promise<number> {
    if (rows.length === 0) return 0; // K=0 this district — nothing to insert, nothing to claim.
    return this.db.transaction(async (tx) => {
      // Advisory lock scoped to (game_day, district) — serializes concurrent claims for the SAME couple
      // (mirrors CohesionPermafrostRepository.seedDistricts's per-player advisory-lock idiom, here keyed
      // per (game_day, district) instead of per-player).
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`ambient-gen:${gameDay}:${districtId}`}))`);
      const existing = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(ambientMicroEvent)
        .where(and(eq(ambientMicroEvent.district_id, districtId), eq(ambientMicroEvent.game_day, gameDay)));
      if ((existing[0]?.n ?? 0) > 0) return 0; // already generated for this couple — idempotent skip.
      await tx.insert(ambientMicroEvent).values(
        rows.map((r) => ({
          game_day: r.game_day,
          district_id: r.district_id,
          hour_of_week: r.hour_of_week,
          kind: r.kind,
          channel: r.channel,
          status: 'live' as const,
          expires_at_game_minute: r.expires_at_game_minute,
        })),
      );
      return rows.length;
    });
  }

  // ───────────────────────────── attend loop ─────────────────────────────

  /** `playerId`'s current in-game clock reading (`city_sim_clock.game_minute`) — the attend action's "now"
   *  (a player HTTP action, not a tick; mirrors `ash-appointment.repository.ts`'s `getCurrentTick`).
   *  Returns 0 if the player has no clock row yet (the deterministic advance harness lazy-creates it on
   *  first advance — NOT a write here, this is READ-only). */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db.select({ game_minute: citySimClock.game_minute }).from(citySimClock).where(eq(citySimClock.player_id, playerId)).limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * The TOCTOU-safe attend claim (see file header). ONE conditional UPDATE — `status='live'` AND not yet
   * past its own expiry. Never a read-then-write: two concurrent callers for the SAME event race on this
   * SAME statement; Postgres row-level locking guarantees exactly one wins.
   */
  async claimAttend(eventId: string, playerId: string, gameDay: number, nowGameMinute: number): Promise<ClaimAttendResult> {
    const won = await this.db
      .update(ambientMicroEvent)
      .set({ status: 'attended', attended_by_player_id: playerId, attended_at_game_day: gameDay })
      .where(
        and(
          eq(ambientMicroEvent.id, eventId),
          eq(ambientMicroEvent.status, 'live'),
          gt(ambientMicroEvent.expires_at_game_minute, nowGameMinute),
        ),
      )
      .returning({ district_id: ambientMicroEvent.district_id });
    if (won.length > 0) return { ok: true, districtId: won[0]!.district_id };

    // 0 rows affected — a cheap follow-up read ONLY to pick the friendlier error code (the atomicity of
    // "did the attend happen" was already fully decided by the UPDATE above, race-free).
    const rows = await this.db.select({ id: ambientMicroEvent.id }).from(ambientMicroEvent).where(eq(ambientMicroEvent.id, eventId)).limit(1);
    return { ok: false, reason: rows.length === 0 ? 'not_found' : 'conflict' };
  }

  /** How many events `playerId` has attended on `gameDay` — the diminishing-returns tier `n` IS this
   *  count read AFTER `claimAttend` won (so it includes the just-attended row, design §3.3/D8: the
   *  n-th attend applies `residue × factor^(n-1)`). Resets naturally the next game_day (a fresh COUNT). */
  async countAttendsForDay(playerId: string, gameDay: number): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(ambientMicroEvent)
      .where(and(eq(ambientMicroEvent.attended_by_player_id, playerId), eq(ambientMicroEvent.attended_at_game_day, gameDay)));
    return rows[0]?.n ?? 0;
  }

  // ───────────────────────────── player feed (P5 — projection reads the raw rows) ─────────────────────

  /** The districts where `playerId` owns (`ownership='player'`) at least one building — the feed's
   *  building-gate (C2 AC9). Mirrors `ash-appointment.repository.ts`'s `validateGlassVenue` owned-building
   *  join idiom (buildings → blocks → districts), DISTINCT district ids. */
  async listPlayerDistrictIds(playerId: string): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ district_id: blocks.district_id })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(building.player_id, playerId), eq(building.ownership, 'player')))
      .orderBy(blocks.district_id);
    return rows.map((r) => Number(r.district_id));
  }

  /** The `live` events in the given districts, newest first, paginated. `expired`/`attended` NEVER appear
   *  (C2 AC9 — the feed's status gate). Empty `districtIds` short-circuits to an empty page (a player with
   *  zero owned buildings sees nothing — L1 natural, never a fabricated cross-district leak). */
  async listLiveEventsForDistricts(
    districtIds: readonly number[],
    limit: number,
    offset: number,
  ): Promise<{ rows: AmbientMicroEventRow[]; total: number }> {
    if (districtIds.length === 0) return { rows: [], total: 0 };
    const whereClause = and(eq(ambientMicroEvent.status, 'live'), inArray(ambientMicroEvent.district_id, districtIds as number[]));
    const totalRows = await this.db.select({ n: sql<number>`count(*)::int` }).from(ambientMicroEvent).where(whereClause);
    const rows = await this.db
      .select()
      .from(ambientMicroEvent)
      .where(whereClause)
      .orderBy(desc(ambientMicroEvent.created_at))
      .limit(limit)
      .offset(offset);
    return { rows, total: totalRows[0]?.n ?? 0 };
  }

  // ───────────────────────────── BO diagnostic (04g-A C3, S8) ─────────────────────────────

  /**
   * BO diagnostic stream (`ambient-admin.controller.ts`): every `ambient_micro_event` row, optionally
   * filtered by `gameDay`/`districtId`, newest first, capped at `limit`. Unlike `listLiveEventsForDistricts`
   * (the player feed, `live`-only + building-gated), this is UNFILTERED by status — ops sees `live` AND
   * `attended` AND `expired` rows (the full diagnostic stream).
   */
  async listForDiagnostic(
    gameDay: number | undefined,
    districtId: number | undefined,
    limit: number,
  ): Promise<AmbientMicroEventRow[]> {
    const conditions = [];
    if (gameDay !== undefined) conditions.push(eq(ambientMicroEvent.game_day, gameDay));
    if (districtId !== undefined) conditions.push(eq(ambientMicroEvent.district_id, districtId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return this.db
      .select()
      .from(ambientMicroEvent)
      .where(whereClause)
      .orderBy(desc(ambientMicroEvent.created_at))
      .limit(limit);
  }
}
