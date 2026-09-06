// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C1 (`BudgetsHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-G1) + C5
//             (`AdoptionService.executeAdoption` — the append-only `capability_adoptions` INSERT) + C10
//             (`GET /v1/admin/meta/capability-adoptions` — "Paginated adoption log; filters
//             player/capability" — design §14).
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §3 (`capability_
//             adoptions` — at most ONE adoption per capability per player, permanent v1) + §9 (Adoption,
//             D7 — the `CAPABILITY_ADOPT` governor-routed mutateFn, step 3: the INSERT AFTER the card's
//             own winner gate has already won) + §14 (the C10 admin read).
//             Pattern (C10 `listAll` pagination shape): `meta-progression-admin.controller.ts
//             #getGraduationEvents` (P3-F C10 — `limit`/`offset`, default 20/max 100, a separate
//             `count(*)::int` for `total`).
//             -- P3-G C1 -- 2026-07-20 / C5 -- 2026-07-20 / C10 -- 2026-07-23
//
// `CapabilityAdoptionsRepository` — the ONLY write path onto `capability_adoptions` (mig 0137). C5 adds
// `insert` — the append-only row, called AFTER `PossibilityHorizonCardsRepository.claimForAdoption` has
// already won the card's own winner gate (`adoption.service.ts`'s own header carries the full step-
// ordering account). Append-only applicative discipline (D13 continuity, `graduation_events` precedent,
// mig 0135) — no update/delete method is EVER added to this class. C10 adds the FIRST read method,
// `listAll` — see its own header for why the file's earlier C1/C5 prediction of `existsFor`/`listForPlayer`
// (design §11) was stale and is corrected here rather than silently left to drift.

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { capabilityAdoption, type CapabilityAdoptionRow } from '../db/schema/budgets_horizon';

/** `insert` params — the design §3 append-only row. `freeUnitsAtAdoption` is the `free_units` value
 *  observed AT VALIDATE TIME (design §0(c): "adoption is a GATE on free_units, never a spend" — nothing
 *  this service does moves the budget, so re-reading it after the claim would be pointless, never a
 *  second source of truth). */
export interface CapabilityAdoptionInsertParams {
  readonly playerId: string;
  readonly capabilityId: number;
  readonly cardId: string;
  readonly freeUnitsAtAdoption: number;
  readonly gameTick: number;
}

@Injectable()
export class CapabilityAdoptionsRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * P3-G C5 (design §9 step 3) — the append-only INSERT. The composite PK (player_id, capability_id)
   * makes a genuine duplicate structurally unreachable on the REAL call path (the card's own R10 unique
   * index + its ONE-way `unseen|seen|deferred → adopted` transition already guarantee at most one winner
   * per (player, capability) — this INSERT is never itself a race site; `AdoptionService`'s own fault-
   * injector deliberately corrupts `playerId` here to exercise the OTHER real constraint, the `player_id`
   * FK, for the induced-failure proof).
   */
  async insert(row: CapabilityAdoptionInsertParams): Promise<void> {
    await this.db.insert(capabilityAdoption).values({
      player_id: row.playerId,
      capability_id: row.capabilityId,
      card_id: row.cardId,
      free_units_at_adoption: row.freeUnitsAtAdoption,
      game_tick: row.gameTick,
    });
  }

  // ★ CORRECTED C10 header (this file's own C1/C5 header above previously predicted "C9 adds existsFor /
  // listForPlayer (design §11)" — STALE and WRONG on both counts, caught while touching this exact file:
  // neither method landed at C9 (grep-verified before editing, never trusted from the citation alone —
  // the codebase's own established discipline, `capability-debts.repository.ts`'s C8 docstring correction
  // is the precedent for fixing a stale citation found in-passing), and design §11 is Rule Vocabulary T3-6
  // advancement, NOT adoption forensics — the real BO forensics table is §14. `listAll` below (C10) is the
  // real first consumer: `GET /v1/admin/meta/capability-adoptions` (design §14 — "Paginated adoption log;
  // filters player/capability, canon unlock-events audit"), mirrors `MetaProgressionAdminController.
  // getGraduationEvents`'s own P3-F pagination shape verbatim (`limit`/`offset`, default 20/max 100, a
  // separate `count(*)` for `total`). No `existsFor` — no real caller needs it yet (the card's own terminal
  // `view_status='adopted'` already answers "has this capability been adopted" for every EXISTING call
  // site); still not speculatively added.

  /**
   * P3-G C10 (design §14) — the paginated, filterable admin adoption log. `capability_id`/`player_id`
   * filters are independent (either, both, or neither). Newest-first (`adopted_at DESC`) — the SAME
   * "append-only audit spine, newest-first, paginated" shape `getGraduationEvents` establishes for the
   * sibling P3-F table.
   */
  async listAll(
    filters: { playerId?: string; capabilityId?: number },
    limit: number,
    offset: number,
  ): Promise<{ rows: CapabilityAdoptionRow[]; total: number }> {
    const conditions = [
      filters.playerId ? eq(capabilityAdoption.player_id, filters.playerId) : undefined,
      filters.capabilityId !== undefined ? eq(capabilityAdoption.capability_id, filters.capabilityId) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: totalRaw }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(capabilityAdoption).where(where);
    const rows = await this.db
      .select()
      .from(capabilityAdoption)
      .where(where)
      .orderBy(desc(capabilityAdoption.adopted_at))
      .limit(limit)
      .offset(offset);
    return { rows, total: Number(totalRaw) };
  }
}
