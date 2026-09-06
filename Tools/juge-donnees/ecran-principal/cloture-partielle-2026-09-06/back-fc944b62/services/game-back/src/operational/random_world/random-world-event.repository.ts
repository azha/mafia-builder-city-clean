// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (generator repository)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.2 (generator
//             phases) + §4.1 (random_world_event_active) + §4.3 (random_world_daily_run)
//             Pattern: mirrors `ambient-micro-event.repository.ts` (per-couple advisory-claim shape) +
//             `political-event.repository.ts`'s `claimGameDay` (watermark claim shape) — this table's
//             claim is a THIRD shape (S10 note): the claim IS the row itself (PK `game_day`, `INSERT ...
//             ON CONFLICT DO NOTHING`), no watermark column, no advisory lock needed (a single-row
//             INSERT is already atomic under Postgres' own PK uniqueness).
//             — 04g-B C2 — 2026-07-15
//             — 04g-B C5 — 2026-07-15 (BO reads: `readLatestDailyRun`/`listDailyRuns`/`listRecentCascades`
//               — `listAllActiveEvents`/`findById` were already C2-additive, design §6.2)
//
// `RandomWorldEventRepository` — the persisted access layer over the 3 migration-0128 tables (C1
// schema). Thin `*.repository.ts` owning the raw Drizzle reads/writes (template template mirrors
// `ambient-micro-event.repository.ts`/`constant-hum.repository.ts`).
//
// `claimDay` — phase 0 (design §3.2): `INSERT INTO random_world_daily_run (game_day) VALUES (...) ON
// CONFLICT DO NOTHING`. Unlike the political watermark claim (`claimGameDay`, which enforces strict
// day-over-day monotonicity), this claim has NO ordering requirement — each `game_day` is claimed
// independently, so a test (or a save that skips ahead) may call `runDailyTick` for an arbitrary
// `game_day` without needing to simulate every day in between (`contamination(d)`/`m(w)` are PURE
// functions of `d`/`w` alone, never of tick-call history — design §3.4).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, gte, inArray, isNotNull, lte, notInArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks, districts, thrennyEdges } from '../../db/schema/world_geography';
import { citySimClock } from '../../db/schema/city_sim_clock';
import {
  randomWorldEventActive,
  randomWorldDailyRun,
  couplingDiscoveryCascade,
  type RandomWorldEventActiveRow,
  type RandomWorldDailyRunRow,
  type CouplingDiscoveryCascadeRow,
} from '../../db/schema/random_world';
import { neverResolvingRandomWorldTemplateIds, type RandomWorldTemplateId } from './random-world-template-registry';
import type { DistrictBankRow, ThrennyEdgeRow } from './district-adjacency';

/** One block's LOCAL grid coordinates for a district (design §3.5.1 ScarPolygon input — S12,
 *  intra-district only, mirrors `scar-polygon.ts`'s `ScarBlockPoint`). */
export interface DistrictBlockPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

/** Fields accepted by `insertEvent` — mirrors `random_world_event_active`'s writable columns
 *  (excludes `id`/`created_at`, DB-generated; excludes `status`, always `'active'` at insert — no
 *  template in this design activates directly into `resolved`). */
export interface NewRandomWorldEventInput {
  readonly templateId: RandomWorldTemplateId;
  readonly districtId: number;
  readonly startedAtGameDay: number;
  readonly expiresAtGameDay: number | null;
  /** The `recovery_curve_position` to persist at insert time — explicit (never the bare schema
   *  default '0') so phase 2's very next same-or-later tick compares against the TRUE initial
   *  position (e.g. `contamination(0) === 1.0` for a fresh hailstorm) rather than a stale '0' that
   *  would force a spurious "changed" reapply on the first post-activation tick. */
  readonly initialCurvePosition: number;
  readonly parentEventId?: string | null;
  readonly payload?: Record<string, unknown>;
}

@Injectable()
export class RandomWorldEventRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── phase 0: claim ─────────────────────────────

  /** The per-game_day claim IS the row (see file header). Returns `claimed: false` iff a row for this
   *  `game_day` already existed (a 2nd/later firing for the same day — a pure no-op, design AC1). */
  async claimDay(gameDay: number): Promise<{ claimed: boolean }> {
    const inserted = await this.db
      .insert(randomWorldDailyRun)
      .values({ game_day: gameDay })
      .onConflictDoNothing({ target: randomWorldDailyRun.game_day })
      .returning({ game_day: randomWorldDailyRun.game_day });
    return { claimed: inserted.length > 0 };
  }

  /** Read-back the daily_run row as-is (test/BO diagnostic — no claim). */
  async readDailyRun(gameDay: number): Promise<RandomWorldDailyRunRow | undefined> {
    const rows = await this.db.select().from(randomWorldDailyRun).where(eq(randomWorldDailyRun.game_day, gameDay)).limit(1);
    return rows[0];
  }

  /**
   * C5 — the MOST RECENT `random_world_daily_run` row ever claimed (this table has NO watermark column
   * distinct from the claim itself, file header) — `RandomWorldAdminController.forceTemplate`'s own
   * "today" (design §6.2/D16), mirroring `PoliticalEventRepository.readCalendarState().
   * lastEvaluatedGameDay`'s "never client-supplied, read the real watermark" discipline: an admin cannot
   * backdate/future-date a forced activation. `undefined` (⇒ the controller falls back to `gameDay: 0`)
   * on a fresh DB with zero claims yet.
   */
  async readLatestDailyRun(): Promise<RandomWorldDailyRunRow | undefined> {
    const rows = await this.db.select().from(randomWorldDailyRun).orderBy(desc(randomWorldDailyRun.game_day)).limit(1);
    return rows[0];
  }

  /** C5 — BO `GET /v1/admin/random-world/daily-runs?fromGameDay=` data source: every `random_world_
   *  daily_run` row with `game_day >= fromGameDay` (default 0 — all rows), ascending, capped at `limit`
   *  (observability batch, design §6.2 "claims + counts"). */
  async listDailyRuns(fromGameDay: number, limit: number): Promise<RandomWorldDailyRunRow[]> {
    return this.db
      .select()
      .from(randomWorldDailyRun)
      .where(gte(randomWorldDailyRun.game_day, fromGameDay))
      .orderBy(randomWorldDailyRun.game_day)
      .limit(limit);
  }

  /**
   * Phase 5: update the diagnostic counters on the (already-claimed) daily_run row. 04g-B C3 extends
   * this with 2 NEW fields (`gatedCascadeAttempts`, `saturatedDistrictIds` — design §3.2 phase 5 "le
   * jsonb qui donne le sustained 2-jours de la paire P1 au tick suivant" / E2E-RW-02's counter). Does
   * NOT touch `quorum_adoption` (C4 scope — the column keeps its existing value, an ordinary partial
   * UPDATE, never a regression).
   */
  async finalizeDailyRun(
    gameDay: number,
    counters: {
      evaluatedTemplateCount: number;
      activationCount: number;
      gatedCascadeAttempts: number;
      saturatedDistrictIds: readonly number[];
      /** C4 addition — the rolling per-district adoption vector for `quorum_on_stadler_row` (design
       *  §3.5.6/D10), computed by `applyQuorumAdoptionAndFlips` in phase 2 and persisted HERE (phase 5,
       *  the SAME "compute early, write once at close" shape `saturatedDistrictIds` already established
       *  in C3) so tomorrow's tick reads it back as "yesterday's" state. Keyed by district id (number),
       *  JSON-serialized as string keys (jsonb object) — read back via `Number(key)`. Optional: omitted
       *  ⇒ the column keeps its prior value (an ordinary partial UPDATE, never a regression — mirrors
       *  this method's own C3 doc comment for `quorum_adoption`'s C2-era untouched state). */
      quorumAdoption?: Readonly<Record<number, number>>;
    },
  ): Promise<void> {
    await this.db
      .update(randomWorldDailyRun)
      .set({
        evaluated_template_count: counters.evaluatedTemplateCount,
        activation_count: counters.activationCount,
        gated_cascade_attempts: counters.gatedCascadeAttempts,
        saturated_district_ids: counters.saturatedDistrictIds,
        ...(counters.quorumAdoption !== undefined ? { quorum_adoption: counters.quorumAdoption } : {}),
      })
      .where(eq(randomWorldDailyRun.game_day, gameDay));
  }

  // ───────────────────────────── phase 1: resolve-expired ─────────────────────────────

  /** Every `active` event whose hard `expires_at_game_day` has passed (generic, template-agnostic —
   *  design §3.2 phase 1's own "defense in depth" framing). */
  async findActiveEventsPastExpiry(gameDay: number): Promise<RandomWorldEventActiveRow[]> {
    return this.db
      .select()
      .from(randomWorldEventActive)
      .where(
        and(
          eq(randomWorldEventActive.status, 'active'),
          isNotNull(randomWorldEventActive.expires_at_game_day),
          lte(randomWorldEventActive.expires_at_game_day, gameDay),
        ),
      );
  }

  /**
   * Mark `resolved` AND stamp `payload.resolvedAtGameDay = resolvedAtGameDay` in the SAME statement
   * (04g-B C4 — additive to the C2 signature: every call site now threads its own `gameDay`, already in
   * scope at each of the 3 call sites: phase 1's generic sweep, hailstorm's curve close-out, and C4's
   * NEW hollow/apparent_recovery close-outs). WHY a payload field, not a new column: `apparent_recovery`'s
   * successor eligibility window (design AC4, "éligible dès R+7, plus après R+21") needs a well-defined
   * "R" = the PARENT's resolution day, but no `resolved_at_game_day` schema column exists (mig 0128 is
   * C1-owned and out of C4's scope) — `payload` is ALREADY the design's own documented home for
   * "tirages seedés matérialisés" / per-template state (design §4.1), so a generic (template-agnostic)
   * resolution-day stamp fits the SAME spirit without a migration. Raw `jsonb_set` in ONE UPDATE (mirrors
   * `markSidewaysSecondaryApplied`'s own raw-execute idiom — Drizzle's `.set({col: sql\`...\`})` can
   * mishandle a jsonb function call on the column itself, the `leading-digit-audit.service.ts:171-176`
   * precedent this file's C3 code already cites).
   */
  async markResolved(eventId: string, resolvedAtGameDay: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE random_world_event_active
      SET status = 'resolved',
          payload = jsonb_set(payload, '{resolvedAtGameDay}', to_jsonb(${resolvedAtGameDay}::int))
      WHERE id = ${eventId}::uuid
    `);
  }

  /** C4 — stamp `payload.forkOutcome = 'reweave'|'drift'` on a `hollow_at_the_corner` event at closure
   *  (design §3.5.4, AC2's own diagnostic/test read-back). Raw `jsonb_set`, same idiom as `markResolved`
   *  above — called BEFORE `markResolved` so both writes are independent, narrow, auditable statements
   *  rather than one combined mega-UPDATE (mirrors this file's existing per-concern statement shape). */
  async recordHollowForkOutcome(eventId: string, outcome: 'reweave' | 'drift'): Promise<void> {
    await this.db.execute(sql`
      UPDATE random_world_event_active
      SET payload = jsonb_set(payload, '{forkOutcome}', to_jsonb(${outcome}::text))
      WHERE id = ${eventId}::uuid
    `);
  }

  // ───────────────────────────── phase 2: recovery curve ─────────────────────────────

  /** Every `active` event of a given template (the curve-bearing set — C2: `halgren_tannery_hailstorm`
   *  only; `permanent_residue` carries no curve, design §3.4). */
  async findActiveEventsByTemplate(templateId: RandomWorldTemplateId): Promise<RandomWorldEventActiveRow[]> {
    return this.db
      .select()
      .from(randomWorldEventActive)
      .where(and(eq(randomWorldEventActive.status, 'active'), eq(randomWorldEventActive.template_id, templateId)));
  }

  async updateCurvePosition(eventId: string, position: number): Promise<void> {
    await this.db
      .update(randomWorldEventActive)
      .set({ recovery_curve_position: String(position) })
      .where(eq(randomWorldEventActive.id, eventId));
  }

  // ───────────────────────────── phase 3: activation gates (D6) ─────────────────────────────

  /** D6 cooldown gate: any `random_world_event_active` row in `districtId` (any template, any status
   *  — the gate is about pacing NEW incidents, not about the old one's lifecycle) whose
   *  `started_at_game_day` is within the rolling `cooldownDays` window BLOCKS a new activation.
   *  `gameDay - startedAtGameDay < cooldownDays` ⟺ `startedAtGameDay > gameDay - cooldownDays`. */
  async hasRecentActivationInDistrict(districtId: number, gameDay: number, cooldownDays: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: randomWorldEventActive.id })
      .from(randomWorldEventActive)
      .where(
        and(
          eq(randomWorldEventActive.district_id, districtId),
          gt(randomWorldEventActive.started_at_game_day, gameDay - cooldownDays),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * Occupation du cap de concurrence D6 — compte les événements `active` **capables de libérer leur
   * slot**, et EXCLUT ceux marqués `neverResolves` au registre (aujourd'hui `permanent_residue` seul).
   *
   * ─── TD-255 (W0.2, 2026-08-07) : ce n'était PAS une fragilité de suite partagée, mais un DÉFAUT DE
   * PRODUCTION à mort annoncée. ───
   *
   * L'ancienne version comptait tout `status = 'active'`, tous templates confondus. Or
   * `permanent_residue` est inséré avec `expires_at_game_day = NULL` et le commentaire du générateur
   * dit lui-même « JAMAIS résolution (design §3.5.2) » ; le balayage d'expiration dur (`:154-164`)
   * exige `isNotNull(expires_at_game_day)` et **saute donc ces lignes par construction** ; et aucun
   * chemin ne les passe à `resolved`. Elles restent `active` pour toujours.
   *
   * Conséquence, avec un cap dont la plage de registre est **2..14** : chaque résidu confisque
   * définitivement un slot. Au N-ième, `isConcurrentCapGated()` renvoie `true` de façon permanente et
   * **5 des 6 templates live cessent définitivement d'être générés** dans ce monde. (Pas les 6 :
   * `activateQuorum` n'est pas soumis au gate — précision du gate ⊥, qui a corrigé ma formulation
   * initiale « plus aucun événement ». Catastrophique quand même.) Ce n'est pas une gêne de test :
   * c'est la mort datée de la feature pour tout monde qui vit assez longtemps.
   *
   * ★ Le canon tranche dans le sens de ce correctif, deux fois :
   *  - Le cap est défini comme une **garde de COÛT**, pas un plafond de population :
   *    « garde F4 phase 2 (borne le reapply quotidien) » (design §3.7, gdd/14). Or un résidu coûte
   *    **zéro reapply** — aucune phase de tick ne lit jamais ses lignes. L'ancien comptage le facturait
   *    donc pour un travail qu'il ne cause pas : il était déjà faux sur les termes mêmes du canon.
   *  - L'alternative « faire expirer les résidus » est **explicitement écartée** par le canon
   *    (`2026-07-15-04g-B-random-world-decisions.md:136-138` : un decay de scars contredirait
   *    l'inversion clé). Le remède qu'il prescrit à la place — ajuster le cooldown — est
   *    **mathématiquement incapable** d'empêcher la panne : un limiteur de débit ne stoppe pas un
   *    compteur monotone de croiser un plafond fixe, il n'en change que la constante de temps.
   *
   * ⚠️ Le discriminant est le FLAG `neverResolves` du registre, pas l'expiration NULL : trois autres
   * templates state-driven ont aussi `expires_at_game_day = NULL` — `hollow_at_the_corner`,
   * `apparent_recovery`, `quorum_on_stadler_row` — et eux **SE RÉSOLVENT**. Exclure sur
   * `expires_at_game_day IS NULL` les sortirait à tort du cap.
   *
   * ─── TD-351 (2026-08-08) : la précision « `activateQuorum` n'est pas soumis au gate » ci-dessus décrit
   * un état qui n'est PLUS le cas — ce fichier reste inchangé (cette méthode n'a jamais été le défaut :
   * elle compte correctement TOUT `active` sauf `neverResolves` ; `activateQuorum` ne l'APPELAIT
   * simplement jamais). Le correctif est côté appelant : `random-world-event-generator.service.ts`
   * (`applyQuorumAdoptionAndFlips` Step D) appelle désormais `isConcurrentCapGated()` avant chaque
   * activation de flip, le même défaut jumeau que TD-255 mais côté site d'appel plutôt que côté compte. ───
   */
  async countConcurrencyCapOccupancy(): Promise<number> {
    // Dérivé du registre, jamais redéclaré en dur : poser `neverResolves: true` sur un futur template
    // suffit à l'exclure, sans toucher ce fichier (R2.3, même esprit que le compte du registre).
    const neverResolving = neverResolvingRandomWorldTemplateIds();
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(randomWorldEventActive)
      .where(
        and(
          eq(randomWorldEventActive.status, 'active'),
          notInArray(randomWorldEventActive.template_id, [...neverResolving]),
        ),
      );
    return rows[0]?.n ?? 0;
  }

  /** Insert one NEW event (activation OR successor) and read it back. */
  async insertEvent(input: NewRandomWorldEventInput): Promise<RandomWorldEventActiveRow> {
    const inserted = await this.db
      .insert(randomWorldEventActive)
      .values({
        template_id: input.templateId,
        district_id: input.districtId,
        started_at_game_day: input.startedAtGameDay,
        expires_at_game_day: input.expiresAtGameDay,
        recovery_curve_position: String(input.initialCurvePosition),
        parent_event_id: input.parentEventId ?? null,
        payload: input.payload ?? {},
      })
      .returning();
    return inserted[0]!;
  }

  // ───────────────────────────── permanent_residue successor eligibility ─────────────────────────────

  /** Every `resolved` `halgren_tannery_hailstorm` event that has NO existing `permanent_residue`
   *  successor yet (`parent_event_id` chain, design §3.5.2). Ordered by `id` for deterministic
   *  per-run iteration (never DB-plan-dependent ordering). */
  async findResolvedHailstormParentsNeedingSuccessor(): Promise<RandomWorldEventActiveRow[]> {
    const successorParentIds = this.db
      .select({ parent_id: randomWorldEventActive.parent_event_id })
      .from(randomWorldEventActive)
      .where(and(eq(randomWorldEventActive.template_id, 'permanent_residue'), isNotNull(randomWorldEventActive.parent_event_id)));

    return this.db
      .select()
      .from(randomWorldEventActive)
      .where(
        and(
          eq(randomWorldEventActive.template_id, 'halgren_tannery_hailstorm'),
          eq(randomWorldEventActive.status, 'resolved'),
          notInArray(randomWorldEventActive.id, successorParentIds),
        ),
      )
      .orderBy(randomWorldEventActive.id);
  }

  // ───────────────────────────── C4: apparent_recovery successor eligibility (§3.5.3) ─────────────────

  /**
   * Every `resolved` cohesion-dropping parent (`hollow_at_the_corner` OR `halgren_tannery_hailstorm`,
   * design §3.5.3's own 2-source list) whose `payload.resolvedAtGameDay` (see `markResolved` above) falls
   * in the INCLUSIVE window `[gameDay - windowEndDays, gameDay - windowStartDays]` — i.e. "éligible dès
   * R+7 (windowStartDays), plus après R+21 (windowEndDays)" (design AC4) — AND has NO existing
   * `apparent_recovery` successor yet (mirrors `findResolvedHailstormParentsNeedingSuccessor`'s own
   * `notInArray` shape). A parent that resolved WITHOUT the generic sweep ever stamping
   * `resolvedAtGameDay` (structurally impossible post-C4 — every `markResolved` call site now stamps it)
   * is excluded by the `payload ? 'resolvedAtGameDay'` guard, never crashes on a missing key. Ordered by
   * `id` for deterministic per-run iteration (mirrors the C2 precedent).
   */
  async findApparentRecoveryEligibleParents(
    gameDay: number,
    windowStartDays: number,
    windowEndDays: number,
  ): Promise<RandomWorldEventActiveRow[]> {
    const result = await this.db.execute(sql`
      SELECT p.* FROM random_world_event_active p
      WHERE p.template_id IN ('hollow_at_the_corner', 'halgren_tannery_hailstorm')
        AND p.status = 'resolved'
        AND p.payload ? 'resolvedAtGameDay'
        AND (p.payload->>'resolvedAtGameDay')::int BETWEEN (${gameDay}::int - ${windowEndDays}::int) AND (${gameDay}::int - ${windowStartDays}::int)
        AND NOT EXISTS (
          SELECT 1 FROM random_world_event_active s
          WHERE s.template_id = 'apparent_recovery' AND s.parent_event_id = p.id
        )
      ORDER BY p.id
    `);
    const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
    return (rows as Record<string, unknown>[]).map((r) => this.rowToRandomWorldEventActive(r));
  }

  /** Defensive raw-row → `RandomWorldEventActiveRow` mapper for the raw-SQL reads above (Drizzle's typed
   *  `select()` builder can't express the `payload->>'x' BETWEEN`/`NOT EXISTS` shape cleanly — same
   *  raw-execute posture as `markSidewaysSecondaryApplied`/`hasPendingForBuilding`'s own precedent). */
  private rowToRandomWorldEventActive(r: Record<string, unknown>): RandomWorldEventActiveRow {
    return r as unknown as RandomWorldEventActiveRow;
  }

  // ───────────────────────────── C4: hollow funeral attendance (§3.5.4, S18 D8 fallback) ───────────────

  /**
   * The funeral-attendance claim (design §3.5.4/AC3): ONE atomic conditional UPDATE — appends `playerId`
   * to `payload.funeralAttendedBy` IFF the event is a currently-`active` `hollow_at_the_corner` row AND
   * `playerId` is not ALREADY in that array (`@>` jsonb-containment guard). Never a read-then-write (the
   * SAME "single conditional UPDATE, never TOCTOU" discipline as
   * `AmbientMicroEventRepository.claimAttend` — file header there). 0 rows affected ⇒ the caller does a
   * SEPARATE read-only follow-up (below) to pick the friendlier error code — the atomicity of "did the
   * attendance happen" is already fully decided by this ONE statement, race-free for N concurrent
   * DIFFERENT players attending the SAME event.
   */
  async claimFuneralAttendance(eventId: string, playerId: string): Promise<{ ok: boolean }> {
    const result = await this.db.execute(sql`
      UPDATE random_world_event_active
      SET payload = jsonb_set(
        payload,
        '{funeralAttendedBy}',
        COALESCE(payload->'funeralAttendedBy', '[]'::jsonb) || to_jsonb(${playerId}::text)
      )
      WHERE id = ${eventId}::uuid
        AND template_id = 'hollow_at_the_corner'
        AND status = 'active'
        AND NOT (COALESCE(payload->'funeralAttendedBy', '[]'::jsonb) @> to_jsonb(${playerId}::text))
      RETURNING id
    `);
    const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
    return { ok: Array.isArray(rows) && rows.length > 0 };
  }

  /**
   * Read-only follow-up (called ONLY on the `claimFuneralAttendance` failure path, never speculatively —
   * mirrors `AmbientMicroEventRepository.claimAttend`'s own "cheap follow-up read ONLY to pick the
   * friendlier error code" comment): classifies WHY the claim failed.
   */
  async classifyFuneralAttendanceFailure(
    eventId: string,
    playerId: string,
  ): Promise<'not_found' | 'wrong_template' | 'not_active' | 'already_attended'> {
    const row = await this.findById(eventId);
    if (!row) return 'not_found';
    if (row.template_id !== 'hollow_at_the_corner') return 'wrong_template';
    if (row.status !== 'active') return 'not_active';
    const payload = (row.payload ?? {}) as { funeralAttendedBy?: string[] };
    const already = (payload.funeralAttendedBy ?? []).includes(playerId);
    return already ? 'already_attended' : 'not_active'; // defensive fallback — should be unreachable given the 2 branches above.
  }

  // ───────────────────────────── district / block reads (S12) ─────────────────────────────

  /** All canonical district ids (mirrors `AmbientMicroEventRepository.listAllDistrictIds`). */
  async listAllDistrictIds(): Promise<number[]> {
    const rows = await this.db.select({ id: districts.id }).from(districts).orderBy(districts.id);
    return rows.map((r) => r.id);
  }

  /** Every block in ONE district, LOCAL coordinates (ScarPolygon BFS input, S12 — intra-district
   *  only, C0 STOP §3 / design §3.7). */
  async listBlocksForDistrict(districtId: number): Promise<DistrictBlockPoint[]> {
    const rows = await this.db
      .select({ id: blocks.id, coordinates: blocks.coordinates })
      .from(blocks)
      .where(eq(blocks.district_id, districtId))
      .orderBy(blocks.id);
    return rows.map((r) => {
      const c = r.coordinates as { x: number; y: number };
      return { id: r.id, x: Number(c.x), y: Number(c.y) };
    });
  }

  // ───────────────────────────── player projection (R2.2, §6.1) ─────────────────────────────

  /** `playerId`'s current in-game clock reading (`city_sim_clock.game_minute`) — mirrors
   *  `AmbientMicroEventRepository.getCurrentGameMinute` (per-substrate local copy, same convention as
   *  `random-world-clock.ts`'s own `deriveGameDay`). Returns 0 if the player has no clock row yet. */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db.select({ game_minute: citySimClock.game_minute }).from(citySimClock).where(eq(citySimClock.player_id, playerId)).limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /** The districts where `playerId` owns ≥1 building (mirrors `AmbientMicroEventRepository.
   *  listPlayerDistrictIds`'s buildings→blocks→districts idiom). */
  async listPlayerDistrictIds(playerId: string): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ district_id: blocks.district_id })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(building.player_id, playerId), eq(building.ownership, 'player')))
      .orderBy(blocks.district_id);
    return rows.map((r) => Number(r.district_id));
  }

  /** `active` events in the given districts (the player feed's building-gate — C2 AC9). Empty
   *  `districtIds` short-circuits to an empty list (a player with zero owned buildings sees nothing). */
  async listActiveEventsForDistricts(districtIds: readonly number[]): Promise<RandomWorldEventActiveRow[]> {
    if (districtIds.length === 0) return [];
    return this.db
      .select()
      .from(randomWorldEventActive)
      .where(and(eq(randomWorldEventActive.status, 'active'), inArray(randomWorldEventActive.district_id, districtIds as number[])));
  }

  // ───────────────────────────── BO diagnostic (C5 forward-seam; harmless here) ─────────────────────

  /** Every `active` event, unfiltered by district — the BO diagnostic stream's data source (C5 wires
   *  the controller; the read method lands here so it lives beside its sibling reads). */
  async listAllActiveEvents(): Promise<RandomWorldEventActiveRow[]> {
    return this.db.select().from(randomWorldEventActive).where(eq(randomWorldEventActive.status, 'active'));
  }

  /** Read-back a single event by id (test probes / projection detail). */
  async findById(eventId: string): Promise<RandomWorldEventActiveRow | undefined> {
    const rows = await this.db.select().from(randomWorldEventActive).where(eq(randomWorldEventActive.id, eventId)).limit(1);
    return rows[0];
  }

  // ───────────────────────────── C3: district adjacency seed (D11 rev, §3.7) ─────────────────────────

  /** Every district's `bank_side` — the OQ-G1 same-bank chain input for `district-adjacency.ts`'s pure
   *  `buildDistrictAdjacencyGraph`. Ordered by `id` (the seeded chain order is already deterministic). */
  async listDistrictBankSides(): Promise<DistrictBankRow[]> {
    const rows = await this.db.select({ id: districts.id, bank_side: districts.bank_side }).from(districts).orderBy(districts.id);
    return rows.map((r) => ({ id: r.id, bankSide: r.bank_side }));
  }

  /** Every `threnny_edges` row (north_district_id, south_district_id) — the OTHER `district-adjacency.ts`
   *  input. No ordering requirement (the pure builder treats the set as unordered edges). */
  async listThrennyEdgesRaw(): Promise<ThrennyEdgeRow[]> {
    const rows = await this.db
      .select({ north: thrennyEdges.north_district_id, south: thrennyEdges.south_district_id })
      .from(thrennyEdges);
    return rows.map((r) => ({ northDistrictId: r.north, southDistrictId: r.south }));
  }

  // ───────────────────────────── C3: sideways_failure secondary + card fan-out (§3.6) ────────────────

  /** Every `active` `sideways_failure` event whose delayed secondary is DUE today
   *  (`payload.secondaryFiresAtGameDay === gameDay`) AND not yet applied
   *  (`payload.secondaryApplied` missing/false — the AC9 idempotence guard: a crash-replay of the SAME
   *  `gameDay` finds nothing left to do the second time). Ordered by `id` for deterministic iteration. */
  async findActiveSidewaysEventsDueForSecondary(gameDay: number): Promise<RandomWorldEventActiveRow[]> {
    return this.db
      .select()
      .from(randomWorldEventActive)
      .where(
        and(
          eq(randomWorldEventActive.template_id, 'sideways_failure'),
          eq(randomWorldEventActive.status, 'active'),
          sql`(${randomWorldEventActive.payload}->>'secondaryFiresAtGameDay')::int = ${gameDay}`,
          sql`coalesce((${randomWorldEventActive.payload}->>'secondaryApplied')::boolean, false) = false`,
        ),
      )
      .orderBy(randomWorldEventActive.id);
  }

  /** Mark `payload.secondaryApplied = true` on one event (the AC9 idempotence payload guard). Raw
   *  `jsonb_set` via `db.execute` — Drizzle's `.set({col: sql\`...\`})` can mishandle a jsonb FUNCTION
   *  call on the column itself (the `leading-digit-audit.service.ts:171-176` precedent), so this mirrors
   *  that file's raw-`execute` idiom rather than risking the same "scalar" bug. */
  async markSidewaysSecondaryApplied(eventId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE random_world_event_active
      SET payload = jsonb_set(payload, '{secondaryApplied}', 'true'::jsonb)
      WHERE id = ${eventId}::uuid
    `);
  }

  /** Every player owning ≥1 building in `districtId`, DISTINCT (the card/cascade fan-out set — design
   *  §3.6 "pour chaque joueur avec ≥ 1 building en X ou Y"). Mirrors
   *  `off-hours-drift.repository.ts`'s `listPlayersWithBuildingInDistrict` (district → players,
   *  intentionally duplicated per-file — the established per-repository self-containment convention). */
  async listPlayersWithBuildingInDistrict(districtId: number): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ player_id: building.player_id })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(blocks.district_id, districtId), eq(building.ownership, 'player')));
    return rows.map((r) => r.player_id);
  }

  // ───────────────────────────── C3: coupling_discovery_cascade (§3.6, §4.2) ─────────────────────────

  /** Count of `playerId`'s cascade rows discovered STRICTLY AFTER `sinceGameDayExclusive` — the 30-day
   *  rolling cap denominator (design §3.6: "discovered_at_game_day > game_day − 30"). Generic across ALL
   *  pairs (the cap is per-player, not per-pair — E2E-RW-02's own seeded-3-distinct-pairs shape). */
  async countCascadesForPlayerSince(playerId: string, sinceGameDayExclusive: number): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(couplingDiscoveryCascade)
      .where(
        and(
          eq(couplingDiscoveryCascade.player_id, playerId),
          gt(couplingDiscoveryCascade.discovered_at_game_day, sinceGameDayExclusive),
        ),
      );
    return rows[0]?.n ?? 0;
  }

  /** Whether `playerId` has ALREADY discovered `pairKey` (the UNIQUE(player_id, pair_key) exposure —
   *  design §4.2 "can later be forgotten: never"). A `true` here means the SAME pair strikes again for
   *  this player produce ZERO new row and ZERO card (AC6/AC9 idempotence). */
  async hasCascadeForPlayerAndPair(playerId: string, pairKey: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: couplingDiscoveryCascade.id })
      .from(couplingDiscoveryCascade)
      .where(and(eq(couplingDiscoveryCascade.player_id, playerId), eq(couplingDiscoveryCascade.pair_key, pairKey)))
      .limit(1);
    return rows.length > 0;
  }

  /** Insert one `coupling_discovery_cascade` row (the exposure — design §4.2). Returns the new row id. */
  async insertCascade(input: {
    playerId: string;
    pairKey: string;
    sourceEventId: string;
    discoveredAtGameDay: number;
  }): Promise<string> {
    const inserted = await this.db
      .insert(couplingDiscoveryCascade)
      .values({
        player_id: input.playerId,
        pair_key: input.pairKey,
        source_event_id: input.sourceEventId,
        discovered_at_game_day: input.discoveredAtGameDay,
      })
      .returning({ id: couplingDiscoveryCascade.id });
    return inserted[0]!.id;
  }

  /** `playerId`'s full cascade history, newest first — the `GET /v1/random-world/known-couplings`
   *  data source (§6.1). */
  async listCascadesForPlayer(playerId: string): Promise<CouplingDiscoveryCascadeRow[]> {
    return this.db
      .select()
      .from(couplingDiscoveryCascade)
      .where(eq(couplingDiscoveryCascade.player_id, playerId))
      .orderBy(desc(couplingDiscoveryCascade.discovered_at_game_day));
  }

  /** C5 — every `coupling_discovery_cascade` row CITY-WIDE (cross-player, unlike `listCascadesForPlayer`
   *  above), newest first, capped at `limit` — the BO `GET /v1/admin/random-world/coupling-discoveries-
   *  fired` "cascades" half (design §6.2; the "gated counts" half comes from `listDailyRuns`'s own
   *  `gated_cascade_attempts` column, E2E-RW-02). */
  async listRecentCascades(limit: number): Promise<CouplingDiscoveryCascadeRow[]> {
    return this.db
      .select()
      .from(couplingDiscoveryCascade)
      .orderBy(desc(couplingDiscoveryCascade.discovered_at_game_day))
      .limit(limit);
  }
}
