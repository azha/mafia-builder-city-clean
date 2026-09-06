// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2/§3 (dealer / product_storage / courier /
//             building_operational_state — T0; R9.3 — READ, never redefine) +
//             docs/tech/09_data_model/schema_city_state.md §2 (deal_leks — System 11, lek presence/score READ;
//             buildings — ownership + block_id) +
//             docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (safehouses — System 9 Erlang slot model,
//             current_fill per-slot percent + slot_capacity_cents; CONSUMED, never recomputed) +
//             docs/tech/04a_operational_systems/selling_dealers_leks.md §How a deal works (cash → dealer.float_cents)
//             + §Lek control vs dealer assignment (the dealer covers a lek tile; "Runners pickup dealer float")
//             -- session:2026-06-03 (Phase 2 Task 5) --
//
// `SellingRepository` — the persisted access layer for the M1 dealer-at-lek selling slice. Copies the persisted-system
// repository template (DistributionRepository / ProductionRepository): a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with thin services that hold the per-action / per-tick logic.
//
// R9.3: 09 is the source of truth for `dealer` / `product_storage` / `courier` / `building_operational_state` (T0),
// `buildings` (Phase-1 — ownership + block_id), `deal_leks` (Phase-1 — System 11), `safehouses` (Phase-1 — System 9),
// and `city_sim_clock` (Phase-1). This file IMPORTS the existing schema and NEVER re-declares it. The runtime role
// app_rw has SELECT broadly (0013) + UPDATE on dealer / product_storage / courier / safehouses (0013/0017) — this
// repository uses exactly those.
//
// COUPLING DISCIPLINE (the load-bearing constraint of T5):
//   - System 11 (Deal Lek) is CONSUMED by READING the persisted `deal_leks` row for the dealer's covered tile (a SELECT
//     JOIN on (player_id, tile_id) — the dealer's `coverage_lek_tile_id`). The lek's PRESENCE (a row exists) gates the
//     sell; the lek_score is READ (never recomputed — the formation/decay/score math lives in DealLekService).
//   - System 9 (Erlang Stash) is CONSUMED by reading + filling the `safehouses` slot model (current_fill per-slot
//     percent, slot_capacity_cents). The runner deposit FILLS slots per the existing model; it does NOT recompute the
//     Erlang-B blocking probability (the SellingService asks ErlangStashService whether the safehouse is full / what
//     its occupation band is — see selling.service.ts; this repo only persists the post-deposit current_fill).
//
// BATCHED WRITES (the determinism template): the scheduler-facing DEALER_SELL tick reads ALL sellable dealers for a
// player in ONE query (dealer ⋈ deal_leks ⋈ product_storage) and applies the whole sell batch with a SINGLE set-based
// `UPDATE ... FROM (VALUES …)` per mutated table — NEVER a per-row await loop. All values are PARAMETERIZED bind
// params. NO RNG.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { dealLek } from '../../db/schema/city_state';
import { safehouse } from '../../db/schema/pipeline_and_laundering';
import { blocks } from '../../db/schema/world_geography';
import {
  buildingOperationalState,
  dealer,
  productStorage,
} from '../../db/schema/operational_chain';

/** A dealer that is ELIGIBLE to sell this tick: WORKING, at a lek-present dealer-spot, with product available. */
export interface SellableDealer {
  dealer_id: string;
  /** The dealer-spot building whose product_storage the dealer sells from (selling_dealers_leks.md §Dealer state). */
  home_building_id: string;
  /** The covered lek tile (deal_leks.tile_id — the lek presence gate; System 11 READ). */
  coverage_lek_tile_id: number;
  /** The substance the dealer-spot sells (the substance its product_storage holds — T4 substance-generic). */
  substance_type: string;
  /** The grams of THAT substance available at the dealer-spot product_storage (the sell ceiling — min(rate, this)). */
  available_grams: number;
  /**
   * The district the dealer-spot's block belongs to (buildings→blocks→districts join).
   * Added by D1b C6 to route the sell through LaneCollapsePricingService.processDealAttempt
   * (the lane is keyed by district_id × substance_type — the clearing price is district-scoped).
   */
  district_id: number;
  /**
   * The dealer-spot building's current heat (real column buildings.heat, [0..∞)).
   * Added by Drift C6 for DealAcceptedEvent.heatLevel (marginal-deal drift detection).
   * Carries 0 when the building has no heat (freshly created or heat decayed to 0).
   */
  building_heat: number;
}

/** A per-dealer sell mutation the batched tick applies (decrement storage + increment float, both guarded amounts). */
export interface DealerSellMutation {
  dealer_id: string;
  home_building_id: string;
  /** The substance sold off the dealer-spot product_storage (the decrement targets THIS substance — T4). */
  substance_type: string;
  /** Grams to sell this tick = min(rate, available_grams) — never oversell the dealer-spot stock. */
  grams_sold: number;
  /** Cents to add to dealer.float_cents = grams_sold × the per-substance deal value (deterministic). */
  float_delta_cents: number;
}

/** The minimal dealer row the projection reads (its qualitative activity-state + cash-band inputs). */
export interface DealerStateRow {
  dealer_id: string;
  current_state: string;
  float_cents: number;
  coverage_lek_tile_id: number;
  /** The substance the dealer sells — the substance its dealer-spot product_storage holds, else its specialization
   * (T4 substance-generic — drives the projection's substance label + qualitative margin band; never a raw value). */
  substance_type: string;
  /** The dealer-spot building (dealer.home_building_id) — the hush_addiction composite-PK key the projection uses to
   * look up a Hush spot's addiction loyalty band + withdrawn (Phase-2b vector #2b T5; never surfaced raw). */
  home_building_id: string;
}

/** A safehouse the collect deposits into (the Erlang slot model — current_fill per-slot percent + capacity). */
export interface SafehouseSlotRow {
  safehouse_id: string;
  slot_count: number;
  slot_capacity_cents: number;
  current_fill: number[];
}

/** Coerce a jsonb value into a number[] of per-slot percents (defensive — the column is a free-form jsonb array). */
function toFillArray(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  });
}

@Injectable()
export class SellingRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── lookups (the action guards) ─────────────────────────────

  /**
   * Read a player-owned dealer-spot building that is OPERATIONAL (conversion_stage='operational', operational_type
   * 'dealer_spot_front') WITH its block_id — the dealer-assignment gate. Returns { building_id, block_id } or null
   * (not the player's / not an operational dealer-spot).
   */
  async getOwnedOperationalDealerSpot(
    playerId: string,
    buildingId: string,
  ): Promise<{ building_id: string; block_id: number } | null> {
    const rows = await this.db
      .select({ building_id: building.building_id, block_id: building.block_id })
      .from(building)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
          eq(buildingOperationalState.operational_type, 'dealer_spot_front'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** A dealer the player owns (the collect / projection identity gate). Returns null if not the player's. */
  async getOwnedDealer(playerId: string, dealerId: string): Promise<DealerStateRow | null> {
    const rows = await this.db
      .select({
        dealer_id: dealer.dealer_id,
        current_state: dealer.current_state,
        float_cents: dealer.float_cents,
        coverage_lek_tile_id: dealer.coverage_lek_tile_id,
        // The dealer's own specialization (the collect path does not need the held-substance computation — this is the
        // dealer's substance for the row's substance field; the projection path uses the richer held-substance read).
        substance_type: dealer.substance_specialization,
        home_building_id: dealer.home_building_id,
      })
      .from(dealer)
      .where(and(eq(dealer.player_id, playerId), eq(dealer.dealer_id, dealerId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return { ...r, float_cents: Number(r.float_cents) };
  }

  /**
   * Create a WORKING Brindle dealer at a dealer-spot covering a lek tile (the assignDealer action — selling_dealers_
   * leks.md §NestJS "Met dealer en current_state = WORKING"). INSERTs one dealer row (current_state='working',
   * substance_specialization='brindle' M1, float_cents=0). Returns the new dealer id. The substance×spot-type
   * validation / recruitment / loyalty are DEFERRED.
   */
  async assignWorkingDealer(playerId: string, dealerSpotId: string, lekTileId: number): Promise<string> {
    const [row] = await this.db
      .insert(dealer)
      .values({
        player_id: playerId,
        home_building_id: dealerSpotId,
        coverage_lek_tile_id: lekTileId,
        substance_specialization: 'brindle',
        current_state: 'working',
        float_cents: 0,
      })
      .returning({ dealer_id: dealer.dealer_id });
    return row.dealer_id;
  }

  // ───────────────────────────── DEALER_SELL tick (the operational tick-hook) ─────────────────────────────

  /**
   * Batch-read ALL sellable dealers for a player in ONE query — the per-tick sell input (the Phase-1 determinism
   * discipline: batched read, no per-row queries). A dealer is sellable when it is WORKING (current_state='working'),
   * its covered lek tile has a lek PRESENT (deal_leks row with lek_score > 0 for (player, coverage_lek_tile_id) —
   * System 11 READ, the lek presence gate), its dealer-spot building is OPERATIONAL (building_operational_state), and
   * the dealer-spot product_storage holds a sellable substance (available_grams > 0). Joins the dealer-spot product_storage to
   * surface the available grams (the guarded sell ceiling). Ordered by dealer_id for deterministic batching. Returns
   * [] when the player has no sellable dealer (the common case — the tick is then a no-op).
   *
   * The lek presence is READ (the persisted deal_leks row) — never recomputed. The available grams are the SUM of the
   * dealer-spot building's selected substance's product_storage (computed set-based in SQL, no per-dealer query).
   *
   * OPERATIONAL GATE (Phase-2b T2 — selling_dealers_leks.md §How a deal works: a deal needs a live operating spot): the
   * dealer-spot's structural_state must be 'operational'. A raided spot is 'damaged' (T1) → its dealers are EXCLUDED
   * here, so the DEALER_SELL (MINUTE/10) tick leaves them IDLE (no sell, no float, no heat) until repaired (T3).
   * Dealer-spots are NOT raided in this slice (T1 raids lab/stash only), so this gate rarely bites today — added for
   * consistency/future-proofing per the plan. Folded into the EXISTING building_operational_state JOIN (which already
   * checks conversion_stage='operational') — behavior-PRESERVING for operational spots (only narrows the row set).
   */
  async listSellableDealers(playerId: string): Promise<SellableDealer[]> {
    const rows = await this.db
      .select({
        dealer_id: dealer.dealer_id,
        home_building_id: dealer.home_building_id,
        coverage_lek_tile_id: dealer.coverage_lek_tile_id,
        // The substance the dealer-spot sells + its available grams (T4 substance-generic — was hardcoded 'brindle').
        // The dealer-spot holds ONE substance in M1; the lateral picks it deterministically: group the dealer-spot
        // product_storage by substance, keep substances with stock > 0, order by substance_type (deterministic, no
        // RNG — disambiguates a hypothetical multi-substance spot), take the first. Returns (substance, summed grams).
        // keep in sync with the substance-select below — both must pick the SAME substance
        substance_type: sql<string | null>`(
          select ps.substance_type from ${productStorage} ps
          where ps.player_id = ${playerId} and ps.building_id = ${dealer.home_building_id}
          group by ps.substance_type
          having sum(ps.quantity_grams) > 0
          order by ps.substance_type
          limit 1
        )`.as('substance_type'),
        available_grams: sql<number>`coalesce((
          select sum(ps.quantity_grams) from ${productStorage} ps
          where ps.player_id = ${playerId} and ps.building_id = ${dealer.home_building_id}
            -- keep in sync with the substance-select above — both must pick the SAME substance
            and ps.substance_type = (
              select ps2.substance_type from ${productStorage} ps2
              where ps2.player_id = ${playerId} and ps2.building_id = ${dealer.home_building_id}
              group by ps2.substance_type
              having sum(ps2.quantity_grams) > 0
              order by ps2.substance_type
              limit 1
            )
        ), 0)::int`.as('available_grams'),
        // D1b C6: the dealer-spot's district_id (buildings → blocks → districts join) — the LaneCollapse
        // mechanic is keyed by (district_id, substance_type). Added here so the sell tick can call
        // processDealAttempt without a separate per-dealer DB round-trip (stays batched / one query).
        district_id: blocks.district_id,
        // Drift C6: the dealer-spot building's current heat — carried in DealAcceptedEvent.heatLevel for
        // marginal-deal drift detection. The building JOIN is already present (D1b C6 above); this is
        // ADDITIVE — no new JOIN, no behavior change for existing sell logic.
        building_heat: building.heat,
      })
      .from(dealer)
      // The dealer-spot must be OPERATIONAL (the operational gate — building_operational_state).
      .innerJoin(
        buildingOperationalState,
        eq(buildingOperationalState.building_id, dealer.home_building_id),
      )
      // The covered lek must be PRESENT (System 11 READ — the lek presence gate; lek_score>0 means a live lek).
      .innerJoin(
        dealLek,
        and(eq(dealLek.player_id, dealer.player_id), eq(dealLek.tile_id, dealer.coverage_lek_tile_id)),
      )
      // D1b C6: join buildings → blocks to get the dealer-spot block's district_id.
      .innerJoin(building, eq(building.building_id, dealer.home_building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(
        and(
          eq(dealer.player_id, playerId),
          eq(dealer.current_state, 'working'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
          // Phase-2b raid gate: the dealer-spot must be structurally OPERATIONAL (not damaged/repairing).
          eq(buildingOperationalState.structural_state, 'operational'),
          sql`${dealLek.lek_score} > 0`,
        ),
      )
      .orderBy(dealer.dealer_id);

    return rows
      .map((r) => ({
        dealer_id: r.dealer_id,
        home_building_id: r.home_building_id,
        coverage_lek_tile_id: Number(r.coverage_lek_tile_id),
        substance_type: r.substance_type ?? '',
        available_grams: Number(r.available_grams),
        district_id: Number(r.district_id),
        // Drift C6: building heat for DealAcceptedEvent.heatLevel (ADDITIVE — no behavior change).
        building_heat: Number(r.building_heat ?? 0),
      }))
      // Only dealers with a substance + product available actually sell this tick (no negative / zero-volume sells).
      .filter((r) => r.substance_type !== '' && r.available_grams > 0);
  }

  /**
   * Apply a batch of per-dealer sells ATOMICALLY in ONE transaction (the persisted-system template):
   *   (a) GUARDED DECREMENT of each dealer-spot product_storage by grams_sold (a per-(player,building) UPDATE with a
   *       `quantity_grams >= grams_sold` predicate so the stock NEVER goes negative — the guard is defensive; the
   *       caller already clamps grams_sold to min(rate, available)). One set-based UPDATE ... FROM (VALUES …) keyed by
   *       building_id (the dealer-spot product_storage is one row per (building, substance) in M1).
   *   (b) INCREMENT each dealer.float_cents by float_delta_cents (one set-based UPDATE ... FROM (VALUES …) keyed by
   *       dealer_id). Both mutations are in ONE tx so a sale never debits product without crediting the float.
   * NEVER a per-row await loop (the Phase-1 determinism discipline). All values are PARAMETERIZED bind params. NO RNG.
   */
  async applySells(playerId: string, mutations: DealerSellMutation[]): Promise<void> {
    if (mutations.length === 0) return;
    await this.db.transaction(async (tx) => {
      // (a) Decrement the dealer-spot product_storage for the SOLD substance by grams_sold — guarded, set-based.
      // (T4 substance-generic — the substance was hardcoded 'brindle'; it now comes per-mutation from the sold row.)
      const storageRows = mutations.map(
        (m) => sql`(${m.home_building_id}::uuid, ${m.substance_type}::substance_type, ${m.grams_sold}::int)`,
      );
      await tx.execute(sql`
        UPDATE ${productStorage} AS ps
        SET quantity_grams = ps.quantity_grams - v.grams_sold,
            updated_at = now()
        FROM (VALUES ${sql.join(storageRows, sql`, `)}) AS v(building_id, substance_type, grams_sold)
        WHERE ps.player_id = ${playerId}::uuid
          AND ps.building_id = v.building_id
          AND ps.substance_type = v.substance_type
          AND ps.quantity_grams >= v.grams_sold
      `);

      // (b) Increment the dealer's cash float by grams_sold × the deal value — set-based.
      const floatRows = mutations.map(
        (m) => sql`(${m.dealer_id}::uuid, ${m.float_delta_cents}::bigint)`,
      );
      await tx.execute(sql`
        UPDATE ${dealer} AS d
        SET float_cents = d.float_cents + v.float_delta_cents
        FROM (VALUES ${sql.join(floatRows, sql`, `)}) AS v(dealer_id, float_delta_cents)
        WHERE d.player_id = ${playerId}::uuid AND d.dealer_id = v.dealer_id
      `);
    });
  }

  // ───────────────────────────── collect → safehouse (the runner deposit) ─────────────────────────────

  /**
   * Read a player-owned safehouse (the Erlang slot model — System 9 CONSUMED). EXPLICIT column list. Returns the slot
   * model fields (slot_count = C, slot_capacity_cents = $ per slot, current_fill = per-slot percent-filled jsonb
   * array) or null (not the player's). The blocking / occupation interpretation lives in ErlangStashService; this is
   * the raw row the SellingService asks ErlangStashService to interpret + the row the deposit fills.
   *
   * OPERATIONAL GATE (symmetry with the dealer-spot gate): the safehouse's HOST building (safehouses.building_id) must
   * be player-OWNED and OPERATIONAL — JOIN buildings (ownership='player') + building_operational_state
   * (conversion_stage='operational'), exactly like getOwnedOperationalDealerSpot. A runner cannot deposit into a
   * safehouse whose host building is still mid-conversion (the cash_safehouse building goes through the same
   * purchase→convert→operational lifecycle — the E2E stands it up operational before seeding the safehouse). This
   * matches every other building gate in the slice (player-owned AND operational), not just player_id.
   */
  async getOwnedSafehouse(playerId: string, safehouseId: string): Promise<SafehouseSlotRow | null> {
    const rows = await this.db
      .select({
        safehouse_id: safehouse.safehouse_id,
        slot_count: safehouse.slot_count,
        slot_capacity_cents: safehouse.slot_capacity_cents,
        current_fill: safehouse.current_fill,
      })
      .from(safehouse)
      // The safehouse's host building must be the player's OWN building (ownership + player_id).
      .innerJoin(building, eq(building.building_id, safehouse.building_id))
      // …and OPERATIONAL (conversion_stage='operational') — the symmetry with the dealer-spot gate.
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, safehouse.building_id))
      .where(
        and(
          eq(safehouse.player_id, playerId),
          eq(safehouse.safehouse_id, safehouseId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      safehouse_id: r.safehouse_id,
      slot_count: r.slot_count,
      slot_capacity_cents: r.slot_capacity_cents,
      current_fill: toFillArray(r.current_fill),
    };
  }

  /**
   * The ATOMIC guarded COLLECT (the runner deposit), in ONE DB transaction (selling_dealers_leks.md §Implications —
   * "Runners pickup dealer float" → safehouse deposit):
   *   (a) GUARDED ZERO of the dealer's float (a `float_cents = depositedCents` predicate so a concurrent sell that
   *       changed the float between the read and the write does NOT lose cash — the UPDATE affects 0 rows on a
   *       mismatch, the tx rolls back, the caller retries/refuses). The dealer's float is moved WHOLE (the collected
   *       amount = the float read by the service).
   *   (b) SET the safehouse current_fill to the post-deposit per-slot fill the SERVICE computed (the Erlang slot model
   *       is CONSUMED — the service fills slots using ErlangStashService's slot semantics; this repo only persists the
   *       resulting per-slot array, exactly like ErlangStashRepository.applyDrain persists the post-drain array). One
   *       typed UPDATE keyed by safehouse_id.
   * Wrapped in one tx so the float is never zeroed without the safehouse being credited (and vice-versa). Returns true
   * on success, false if the guarded float-zero affected 0 rows (a concurrent float change → caller re-reads). NO RNG.
   */
  async applyCollect(
    playerId: string,
    params: {
      dealer_id: string;
      depositedCents: number;
      safehouse_id: string;
      postDepositFill: number[];
    },
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // (a) Guarded zero of the dealer's float (only if it still equals the amount the service read — no lost cash).
      const zeroed = await tx
        .update(dealer)
        .set({ float_cents: 0 })
        .where(
          and(
            eq(dealer.player_id, playerId),
            eq(dealer.dealer_id, params.dealer_id),
            eq(dealer.float_cents, params.depositedCents),
          ),
        )
        .returning({ dealer_id: dealer.dealer_id });
      if (zeroed.length === 0) {
        // The float changed between the service read and this write → refuse this collect (the tx rolls back).
        return false;
      }

      // (b) Persist the post-deposit safehouse current_fill (the Erlang slot model — CONSUMED, computed by the service).
      await tx
        .update(safehouse)
        .set({ current_fill: params.postDepositFill })
        .where(and(eq(safehouse.player_id, playerId), eq(safehouse.safehouse_id, params.safehouse_id)));

      return true;
    });
  }

  // ───────────────────────────── projection reads (Step 3) ─────────────────────────────

  /**
   * All of the player's dealers with their qualitative-band INPUTS (current_state + float_cents + covered tile) — the
   * projection's raw input (mapped to a BAND by the projection, NEVER forwarded raw; R2.2). Ordered by dealer_id.
   * Returns [] when the player has no dealers.
   */
  async listDealerStates(playerId: string): Promise<DealerStateRow[]> {
    const rows = await this.db
      .select({
        dealer_id: dealer.dealer_id,
        current_state: dealer.current_state,
        float_cents: dealer.float_cents,
        coverage_lek_tile_id: dealer.coverage_lek_tile_id,
        // The substance the dealer sells (T4 substance-generic): the substance its dealer-spot product_storage holds
        // (deterministic — the in-stock substance, ordered by substance_type), falling back to the dealer's own
        // substance_specialization when the spot is empty. Drives the projection's substance label + margin band.
        substance_type: sql<string>`coalesce((
          select ps.substance_type from ${productStorage} ps
          where ps.player_id = ${playerId} and ps.building_id = ${dealer.home_building_id}
          group by ps.substance_type
          having sum(ps.quantity_grams) > 0
          order by ps.substance_type
          limit 1
        ), ${dealer.substance_specialization})`.as('substance_type'),
        // The dealer-spot building — the hush_addiction composite-PK key the projection looks the Hush loyalty band up
        // by (Phase-2b vector #2b T5). For a non-Hush dealer it is just carried through unused.
        home_building_id: dealer.home_building_id,
      })
      .from(dealer)
      .where(eq(dealer.player_id, playerId))
      .orderBy(dealer.dealer_id);
    return rows.map((r) => ({ ...r, float_cents: Number(r.float_cents) }));
  }
}
