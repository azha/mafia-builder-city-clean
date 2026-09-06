// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7.9.2 (hush_addiction — player_id /
//             dealer_spot_building_id composite PK / loyalty_score / last_hush_deal_tick / withdrawn — T0; R9.3 READ +
//             mutate, never redefined) +
//             docs/tech/04a_operational_systems/production_secondaries.md §Hush — addiction-loyalty (the per-spot
//             loyalty bucket that accumulates on a deal, decays when un-served, and collapses after the dry window) +
//             docs/superpowers/specs/2026-06-05-phase-02b-hush-addiction-design.md §3 (the decay + withdrawal clauses)
//             -- session:2026-06-05 (Phase 2b vector #2b — substances/Hush — Task 5) --
//
// `HushAddictionRepository` — the persisted access layer for the Hush addiction-loyalty slice. Copies the persisted-
// system repository template (ColdChainRepository / SellingRepository): a thin `*.repository.ts` owning the raw
// Drizzle reads/writes with EXPLICIT column lists + set-based guarded UPDATEs (NO RNG, NO per-row await loop).
//
// R9.3: 09 is the source of truth for `hush_addiction` (the composite-PK loyalty table — T0, migration 0021). This
// file IMPORTS the existing schema and NEVER re-declares it. NO schema change (T0 landed the table + the app_rw grant).
//
// ── THE ACCUMULATION (accumulateOnDeal) — a LAZY UPSERT keyed on the composite PK (player_id, dealer_spot_building_id):
//    one `INSERT … ON CONFLICT … DO UPDATE` over a VALUES list of ALL the spots that sold this tick handles BOTH the
//    first-deal INSERT (loyalty_score = increment, last_hush_deal_tick = tick, withdrawn = false) AND the repeat-deal
//    UPDATE (loyalty_score += increment, last_hush_deal_tick = tick, withdrawn = false) in ONE set-based statement. A
//    sold spot's row is lazy-created on its first deal; a repeat deal climbs it +increment. withdrawn is reset to false
//    on EVERY deal (a fresh deal re-engages a withdrawn spot). Deterministic, set-based, parameterized binds.
//
// ── THE DECAY + WITHDRAWAL (decayAndWithdraw) — the HUSH_ADDICTION tick (MINUTE/16). The spec's two clauses (decay
//    drifts un-served spots toward NEW; withdrawal is the sharp DEPENDENT-collapse after the dry window) DO NOT compose
//    if decay applied to ALL rows: with decay=1/tick and dependent=10, a DEPENDENT spot would decay out of DEPENDENT in
//    10 dry ticks, so withdrawal (which requires score ≥ dependent AND dry ≥ withdrawalPeriodTicks) could never fire.
//    The canon-matching reconciliation (addiction = "sticky demand" that HOLDS until a sharp collapse) is DISJOINT
//    conditions (design §3 decay/withdrawal bullets):
//      • DECAY UPDATE — applies ONLY to SUB-DEPENDENT un-served rows (loyalty_score < dependentScore AND
//        last_hush_deal_tick < currentTick): loyalty_score = greatest(loyalty_score − decayPerTick, 0). A NEW/
//        ESTABLISHED spot that stops selling drifts down toward 0.
//      • WITHDRAWAL UPDATE — applies ONLY to DEPENDENT rows gone dry past the window (loyalty_score ≥ dependentScore
//        AND last_hush_deal_tick IS NOT NULL AND currentTick − last_hush_deal_tick ≥ withdrawalPeriodTicks):
//        loyalty_score = greatest(establishedScore − 1, 0), withdrawn = true. A DEPENDENT spot is STICKY — it does NOT
//        gradually decay; it HOLDS at its score until starved for the window, then COLLAPSES one full band below
//        ESTABLISHED. After withdrawal the row has score = establishedScore − 1 (< dependent) so subsequent ticks can
//        decay it further.
//    The two WHERE clauses are DISJOINT (`< dependentScore` vs `>= dependentScore`), so order is irrelevant + both are
//    observable. A row that sold THIS tick has last_hush_deal_tick = currentTick, so `last_hush_deal_tick < currentTick`
//    excludes it from decay (a served spot never decays). Deterministic, set-based, GUARDED ≥ 0, NO RNG. Organically a
//    no-op (no Hush addiction row — the common case: no Hush, or no DEPENDENT/un-served spot).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { hushAddiction } from '../../db/schema/operational_chain';

/** A per-spot loyalty read (the projection / boost input — the raw score is mapped to a BAND by HushAddictionService). */
export interface HushLoyaltyRow {
  /** The Hush dealer-spot building this loyalty row belongs to. */
  dealer_spot_building_id: string;
  /** The raw integer loyalty_score (INTERNAL — never surfaced; mapped to LOW/STABLE/HIGH by the service; R2.2). */
  loyalty_score: number;
  /** Whether the spot is currently WITHDRAWN (a DEPENDENT spot starved past the dry window — boost lost). */
  withdrawn: boolean;
}

@Injectable()
export class HushAddictionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── accumulation (the DEALER_SELL coupling) ─────────────────────────────

  /**
   * Accumulate a Hush DEAL on a set of dealer-spots that SOLD this tick — a LAZY UPSERT over a VALUES list, ONE
   * set-based statement (the determinism template; NEVER a per-row await loop). For each (player, spot):
   *   - first deal → INSERT a row (loyalty_score = increment, last_hush_deal_tick = tick, withdrawn = false).
   *   - repeat deal → ON CONFLICT (player_id, dealer_spot_building_id) DO UPDATE: loyalty_score += increment,
   *     last_hush_deal_tick = tick, withdrawn = false (a fresh deal re-engages a withdrawn spot).
   * `spotIds` are the DISTINCT dealer-spot buildings that sold (the caller de-dupes by home_building_id). No-op for an
   * empty set / a non-positive increment. All binds parameterized. NO RNG.
   */
  async accumulateOnDeal(
    playerId: string,
    spotIds: string[],
    increment: number,
    tick: number,
  ): Promise<void> {
    if (spotIds.length === 0 || increment <= 0) return; // nothing sold / knob off → clean no-op.

    // VALUES list of all sold spots (each row = (player, spot, increment, tick)). ON CONFLICT on the composite PK
    // handles BOTH new + existing spots in one set-based statement (the cleanest accumulation per the plan).
    const valueRows = spotIds.map(
      (spotId) => sql`(${playerId}::uuid, ${spotId}::uuid, ${increment}::int, ${tick}::bigint, false)`,
    );
    await this.db.execute(sql`
      INSERT INTO ${hushAddiction} (player_id, dealer_spot_building_id, loyalty_score, last_hush_deal_tick, withdrawn)
      VALUES ${sql.join(valueRows, sql`, `)}
      ON CONFLICT (player_id, dealer_spot_building_id) DO UPDATE
        SET loyalty_score = ${hushAddiction.loyalty_score} + EXCLUDED.loyalty_score,
            last_hush_deal_tick = EXCLUDED.last_hush_deal_tick,
            withdrawn = false
    `);
  }

  // ───────────────────────────── decay + withdrawal (the HUSH_ADDICTION tick) ─────────────────────────────

  /**
   * The HUSH_ADDICTION tick (MINUTE/16) for one player — TWO DISJOINT set-based UPDATEs (design §3; see the file
   * header for the full reconciliation). NEVER a per-row loop, NO RNG, GUARDED ≥ 0. Returns the (decayed, withdrawn)
   * row counts (for the tick log; 0/0 = clean no-op). The order is irrelevant (the WHERE clauses are disjoint:
   * `< dependentScore` vs `>= dependentScore`), but withdrawal runs first so a spot that collapses this tick is NOT
   * also decayed in the same tick (it lands at established−1 < dependent, decayable from the NEXT tick).
   */
  async decayAndWithdraw(
    playerId: string,
    decayPerTick: number,
    dependentScore: number,
    withdrawalPeriodTicks: number,
    currentTick: number,
    establishedScore: number,
  ): Promise<{ withdrawn: number; decayed: number }> {
    // (1) WITHDRAWAL — DEPENDENT rows (loyalty_score ≥ dependentScore) gone dry past the window collapse to
    // established−1 + withdrawn=true. A DEPENDENT spot is sticky: it HOLDS its score (never decayed) until this fires.
    const withdrawnRows = await this.db
      .update(hushAddiction)
      .set({
        loyalty_score: sql`greatest(${establishedScore} - 1, 0)`,
        withdrawn: true,
      })
      .where(
        and(
          eq(hushAddiction.player_id, playerId),
          eq(hushAddiction.withdrawn, false),
          sql`${hushAddiction.loyalty_score} >= ${dependentScore}`,
          sql`${hushAddiction.last_hush_deal_tick} is not null`,
          sql`(${currentTick} - ${hushAddiction.last_hush_deal_tick}) >= ${withdrawalPeriodTicks}`,
        ),
      )
      .returning({ id: hushAddiction.dealer_spot_building_id });

    // (2) DECAY — SUB-DEPENDENT un-served rows (loyalty_score < dependentScore AND last_hush_deal_tick < currentTick,
    // i.e. did NOT sell this tick) drift down by decayPerTick, GUARDED ≥ 0. A served spot (last_hush_deal_tick =
    // currentTick) is EXCLUDED. The explicit `last_hush_deal_tick IS NOT NULL` guard MIRRORS the withdrawal clause (1):
    // both clauses gate on a non-null deal tick, making the intent explicit (a row is decayed/withdrawn only once it has
    // a real deal tick). This is behavior-neutral for every existing row — the sole writer, accumulateOnDeal, always
    // stamps a non-null tick — but a positive-score/null-tick row is now excluded EXPLICITLY, not silently by the
    // `< currentTick` NULL-comparison. A DEPENDENT spot (≥ dependentScore) is EXCLUDED (it holds until withdrawal). The
    // `withdrawn = false` guard ALSO excludes the rows just collapsed by (1) above — withdrawal stays a SINGLE sharp
    // event this tick (no collapse-then-decay in the same tick); a freshly-withdrawn row decays only from the NEXT tick
    // (the next deal flips withdrawn back to false, or it stays parked at established−1 with withdrawn=true).
    const decayedRows = await this.db
      .update(hushAddiction)
      .set({
        loyalty_score: sql`greatest(${hushAddiction.loyalty_score} - ${decayPerTick}, 0)`,
      })
      .where(
        and(
          eq(hushAddiction.player_id, playerId),
          eq(hushAddiction.withdrawn, false),
          sql`${hushAddiction.loyalty_score} > 0`,
          sql`${hushAddiction.loyalty_score} < ${dependentScore}`,
          sql`${hushAddiction.last_hush_deal_tick} is not null`,
          sql`${hushAddiction.last_hush_deal_tick} < ${currentTick}`,
        ),
      )
      .returning({ id: hushAddiction.dealer_spot_building_id });

    return { withdrawn: withdrawnRows.length, decayed: decayedRows.length };
  }

  // ───────────────────────────── projection / boost reads ─────────────────────────────

  /**
   * Batch-read the loyalty rows for a set of the player's Hush dealer-spots in ONE query (the projection + the
   * DEALER_SELL boost input — no per-spot round-trip). Returns one row per spot that HAS a hush_addiction row; a spot
   * with NO row yet (never sold) is ABSENT from the result (the caller treats absent → score 0 → LOW, withdrawn=false).
   * Player-scoped. Returns [] for an empty spot set.
   */
  async getLoyaltyScores(playerId: string, spotIds: string[]): Promise<HushLoyaltyRow[]> {
    if (spotIds.length === 0) return [];
    const rows = await this.db
      .select({
        dealer_spot_building_id: hushAddiction.dealer_spot_building_id,
        loyalty_score: hushAddiction.loyalty_score,
        withdrawn: hushAddiction.withdrawn,
      })
      .from(hushAddiction)
      .where(
        and(
          eq(hushAddiction.player_id, playerId),
          inArray(hushAddiction.dealer_spot_building_id, spotIds),
        ),
      );
    return rows.map((r) => ({
      dealer_spot_building_id: r.dealer_spot_building_id,
      loyalty_score: Number(r.loyalty_score),
      withdrawn: r.withdrawn,
    }));
  }

  /**
   * Read ONE Hush dealer-spot's loyalty row (the single-spot projection read). Returns the row or null (no row yet —
   * never sold → the projection surfaces LOW + withdrawn=false). Player-scoped + spot-scoped (composite PK).
   */
  async getLoyaltyScore(playerId: string, spotId: string): Promise<HushLoyaltyRow | null> {
    const rows = await this.getLoyaltyScores(playerId, [spotId]);
    return rows[0] ?? null;
  }
}
