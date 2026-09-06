// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7 (raid/repair surface — building_raid +
//             building_operational_state.structural_state, T0) + §2/§3 (product_storage / building_operational_state) +
//             docs/tech/09_data_model/schema_city_state.md §2 (the EXISTING migrated `buildings` table — block_id) +
//             docs/tech/09_data_model/schema_world_geography.md §2 (blocks.district_id) +
//             docs/tech/04_city_simulation/system_4_patrol_doctrine.md §RaidPlan (block-level raid targeting)
//             -- session:2026-06-04 (Phase 2b Task 1) --
//
// `RaidRepository` — the persisted access layer for the Phase-2b raid execution slice (police-risk vector #1). Copies
// the persisted-system repository template (HeatRepository / RealEstateRepository): a thin `*.repository.ts` owning the
// raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service holding the per-flush logic.
//
// R9.3: 09 is the source of truth for `buildings` (Phase 1), `building_operational_state` + `product_storage` +
// `building_raid` (operational chain — T0/§7), `blocks` (world geography). This file IMPORTS the existing schema and
// NEVER re-declares it. The runtime role app_rw has UPDATE on product_storage + building_operational_state (0017) and
// SELECT/INSERT/UPDATE on building_raid (0018) — this repository uses exactly those.
//
// SET-BASED WRITES (the determinism template the persisted systems copy): the seizure resolves ALL the player's
// product-holding operational buildings on the raided block in ONE query, then applies the WHOLE seizure batch in a
// SINGLE transaction with set-based `UPDATE ... WHERE building_id = ANY(...)` (product_storage zeroing +
// building_operational_state → 'damaged') + ONE multi-row INSERT into building_raid — NEVER a per-row await loop. All
// values are PARAMETERIZED bind params (no string interpolation). NO RNG (deterministic).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import {
  buildingOperationalState,
  buildingRaid,
  cookSession,
  growSession,
  moneyHolding,
  productStorage,
} from '../../db/schema/operational_chain';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { FUNCTIONAL_COOK_STAGES } from '../production/production.repository';
import { accruedYieldCents, capacityCentsForTier, moneyHoldingRaidSeizeCents } from '../money_holding/money-holding-tunables';

/**
 * The PRODUCT-HOLDER operational types a raid can seize from (system_4_patrol_doctrine.md §RaidPlan — the precinct
 * targets a block; only the player's product-HOLDING buildings on it lose stock). M1 product-holders = LAB (the cook
 * destination) + STASH (the storage building). front_shop / cash_safehouse / dealer_spot_front etc. hold no product
 * to seize this slice (deferred — cash seizure / personnel arrest are out of scope, design §3).
 *
 * SPECIALIZED_LAB (Phase-2b vector #2c / Ash, T4) is the Ash analog of LAB — it hosts the Ash cook + holds the produced
 * Ash batch, so it is a product-holder a raid can seize from / DAMAGE exactly like LAB. Adding it here is what lets a
 * raid interrupt an Ash cook (the cook-adherence lever — Ash purity §4-T4: "a SPECIALIZED_LAB mid-cook goes DAMAGED").
 * This is ADDITIVE — LAB/STASH targeting is byte-identical (the predicate only widens the type set).
 *
 * GROW_HOUSE (Phase-3 vector #3 / grow_house, T6) is the cultivation building — it hosts an in-progress grow_session (the
 * crop) the way a LAB hosts a cook. It is a product-holder a raid can DAMAGE exactly like LAB (the make-vs-buy A stakes —
 * "cheaper-but-hot": an active grow climbs the building's raid-risk band, and a raid pauses + SEIZES the crop). Adding it
 * here is what makes a grow_house raidable at all (grow design §4-T6: "a grow_house on a raided block flips DAMAGED").
 * This is ADDITIVE — LAB/STASH/SPECIALIZED_LAB targeting is byte-identical (the predicate only widens the type set). The
 * grow_house's crop lives in grow_session (NOT product_storage), so step 1's product_storage seize is a no-op for it; the
 * crop seizure is the dedicated grow_session DELETE in step 2c below (the analog of Ash T4's step 2b cook side-effect).
 */
export const RAID_PRODUCT_HOLDER_TYPES = ['lab', 'stash', 'specialized_lab', 'grow_house'] as const;

/** A building the raid resolved as a seizure target (the host block's product-holder, operational). */
export interface RaidTargetBuilding {
  building_id: string;
  /** The grams currently stored at this building across all substances (the pre-seizure total — BO-only). */
  total_grams: number;
}

/** The result of executing a raid on the resolved buildings (one record per raided building — the BO-only ledger). */
export interface RaidedBuilding {
  building_id: string;
  grams_seized: number;
}

/**
 * A money_holding the raid resolved as a CASH-seizure target (Phase-5 vector #5a T5a — the heat-driven street raid on a
 * clean-cash vault). The money_holding holds NO product (its money lives in money_holding.held_cents, not
 * product_storage), so it is resolved on a SEPARATE path from the product-holders and seized via a dedicated cash UPDATE
 * — the product raid path stays byte-identical. Carries the pre-seize held_cents (BO-only — feeds the exact seize split)
 * + the money_holding_tier (resolved for parity with the other money_holding reads; not used by the seize math itself).
 */
export interface RaidMoneyHoldingTarget {
  building_id: string;
  /** The pre-seize held_cents pool (bigint mode — the figure the raid_seize_pct band is taken from). BO-only (R2.2). */
  held_cents: bigint;
  /** The money_holding_tier (BO-only — used by capacityCentsForTier to clamp the post-settle held). */
  money_holding_tier: number;
  /**
   * The lazy-accrual anchor tick at resolve time (city_sim_clock.game_minute). Used by the settle-first step
   * (lot-4 TD-035): `accruedYieldCents(held_cents, last_yield_tick, raidedAtTick)` computes the un-realized yield
   * to realize BEFORE the seize, per `2026-06-07-phase-05-money-holding-design.md §T5a settle-first canon`.
   */
  last_yield_tick: number;
}

/** The result of seizing cash from a raided money_holding (one record per money_holding — the BO-only seizure ledger). */
export interface RaidedMoneyHolding {
  building_id: string;
  /** The cents seized this raid (held − survivor — for the building_raid row / logging; never surfaced raw, R2.2). */
  seized_cents: bigint;
}

@Injectable()
export class RaidRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Resolve the player's RAID-TARGET buildings on a block (system_4_patrol_doctrine.md §RaidPlan — block-level
   * targeting): the player's `building_operational_state` rows whose host `building` is on `targetBlockId` AND whose
   * `operational_type` is a product-holder (lab/stash) AND whose `structural_state = 'operational'` (an already-DAMAGED/
   * repairing building is not re-raided). Each carries the building's CURRENT total stored grams (summed across
   * substances) — the pre-seizure figure used to compute grams_seized. Returns [] when the block has no such building
   * (the DRY RAID case — the precinct's lossy belief targeted a block with nothing to seize → the service no-ops).
   *
   * Batched read (the Phase-1 determinism discipline: one query, no per-row round-trips). Ordered by building_id for
   * deterministic batching.
   */
  async resolveTargetsOnBlock(playerId: string, targetBlockId: number): Promise<RaidTargetBuilding[]> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        // The building's CURRENT total stored grams across all substances (0 when no product_storage row). The raw
        // grams stay BO-only — the projection forwards only a band (R2.2); this internal figure feeds grams_seized.
        total_grams: sql<number>`COALESCE((
          SELECT SUM(ps.quantity_grams)::int
          FROM ${productStorage} AS ps
          WHERE ps.building_id = ${buildingOperationalState.building_id}
        ), 0)`,
      })
      .from(buildingOperationalState)
      .innerJoin(building, eq(building.building_id, buildingOperationalState.building_id))
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          eq(building.block_id, targetBlockId),
          inArray(buildingOperationalState.operational_type, [...RAID_PRODUCT_HOLDER_TYPES]),
          eq(buildingOperationalState.structural_state, 'operational'),
        ),
      )
      .orderBy(buildingOperationalState.building_id);
    return rows.map((r) => ({ building_id: r.building_id, total_grams: r.total_grams ?? 0 }));
  }

  /**
   * Resolve the player's MONEY_HOLDING raid targets on a block (Phase-5 vector #5a T5a — the heat-driven street raid on a
   * clean-cash vault). A money_holding holds NO product (its cash lives in money_holding.held_cents, not product_storage),
   * so adding it to the product-holder resolve would make the product-seize a meaningless no-op AND risk perturbing the
   * byte-identical product path — instead the raid resolves money_holdings on this SEPARATE path: the player's
   * `building_operational_state` rows whose host `building` is on `targetBlockId` AND operational_type = 'money_holding'
   * AND structural_state = 'operational' (an already-DAMAGED/repairing vault is not re-raided), JOINed to the
   * money_holding table for the pre-seize held_cents + money_holding_tier. Returns [] when the block has no such vault
   * (the money_holding leg of a dry raid — the service no-ops it independently of the product leg). Batched read (one
   * query, no per-row round-trips). Ordered by building_id for deterministic batching. BO-only inputs (R2.2).
   */
  async resolveMoneyHoldingTargetsOnBlock(
    playerId: string,
    targetBlockId: number,
  ): Promise<RaidMoneyHoldingTarget[]> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        held_cents: moneyHolding.held_cents,
        money_holding_tier: moneyHolding.money_holding_tier,
        // lot-4 TD-035: needed for the settle-first step in executeMoneyHoldingRaid.
        last_yield_tick: moneyHolding.last_yield_tick,
      })
      .from(buildingOperationalState)
      .innerJoin(building, eq(building.building_id, buildingOperationalState.building_id))
      .innerJoin(
        moneyHolding,
        and(
          eq(moneyHolding.building_id, buildingOperationalState.building_id),
          eq(moneyHolding.player_id, buildingOperationalState.player_id),
        ),
      )
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          eq(building.block_id, targetBlockId),
          eq(buildingOperationalState.operational_type, 'money_holding'),
          eq(buildingOperationalState.structural_state, 'operational'),
        ),
      )
      .orderBy(buildingOperationalState.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      held_cents: r.held_cents,
      money_holding_tier: r.money_holding_tier,
      last_yield_tick: r.last_yield_tick,
    }));
  }

  /**
   * EXECUTE the raid on the resolved buildings in ONE transaction (set-based — no per-row loop): for the building set,
   *   1) SEIZE product: `UPDATE product_storage SET quantity_grams = round(quantity_grams × (1 - seizureFraction))`
   *      WHERE building_id = ANY(set) — the surviving stock (0 at the default fraction 1.0). updated_at bumped.
   *   2) DAMAGED: `UPDATE building_operational_state SET structural_state = 'damaged'` WHERE building_id = ANY(set) AND
   *      structural_state = 'operational' (the targets were resolved as operational; the predicate is belt-and-braces),
   *      RETURNING the building_ids that ACTUALLY flipped (an already-damaged building is excluded — once-per-entry).
   *   2b) COOK ADHERENCE (Ash, T4): for the buildings that JUST flipped operational→damaged, increment
   *      `damaged_pauses_during_cook` on any IN-PROGRESS cook there (set-based, +1 per DAMAGED entry — never per tick).
   *      Substance-agnostic counter (read only by Ash purity, T6); behavior-preserving — the cook FREEZE itself is the
   *      pre-existing COOK_ADVANCE gate, untouched.
   *   2c) GROW SEIZE (grow_house, T6): for the buildings that JUST flipped operational→damaged, DELETE any IN-PROGRESS
   *      grow_session there (set-based, once per DAMAGED entry — the crop is SEIZED/lost; the make-vs-buy A consequence).
   *      A lab/stash/specialized_lab hosts no grow_session → the DELETE matches zero rows there (byte-identical raid).
   *   3) LEDGER: INSERT one `building_raid` row per raided building (grams_seized = the grams removed for THAT building,
   *      status 'executed', raided_at_tick = the current tick passed in, district_id/target_block_id from the event).
   * grams_seized per building = total_grams − round(total_grams × (1 - seizureFraction)) (the exact removed amount; at
   * the default fraction 1.0 = total_grams). Deterministic (NO RNG — a fixed function of the persisted grams + the
   * tunable). The building set is ASSUMED non-empty (the service skips the call when resolveTargetsOnBlock is empty —
   * the dry-raid no-op).
   */
  async executeRaid(params: {
    playerId: string;
    districtId: number;
    targetBlockId: number;
    raidedAtTick: number;
    seizureFraction: number;
    targets: RaidTargetBuilding[];
  }): Promise<RaidedBuilding[]> {
    const { playerId, districtId, targetBlockId, raidedAtTick, seizureFraction, targets } = params;
    const buildingIds = targets.map((t) => t.building_id);
    // Per-building grams removed = total − round(total × (1 - fraction)) (computed here so the ledger records the EXACT
    // amount removed per building).
    // TODO(T3): unify grams_seized with the per-row SQL round() when seizure_fraction < 1 — this JS sum-round vs the per-row SQL round can diverge by up to (substance_rows − 1) g at a fractional seizure. Inert at the shipped fraction 1.0.
    const raided: RaidedBuilding[] = targets.map((t) => ({
      building_id: t.building_id,
      grams_seized: t.total_grams - Math.round(t.total_grams * (1 - seizureFraction)),
    }));

    await this.db.transaction(async (tx) => {
      // 1) SEIZE — set-based zeroing/reduction of the raided buildings' product_storage (every substance row).
      await tx
        .update(productStorage)
        .set({
          quantity_grams: sql`round(${productStorage.quantity_grams} * (1 - ${seizureFraction}))`,
          updated_at: sql`now()`,
        })
        .where(inArray(productStorage.building_id, buildingIds));

      // 2) DAMAGED — set-based structural-state transition (operations pause; the tick-services gate on operational, T2).
      //    RETURNING the flipped building_ids = the buildings that ACTUALLY transitioned operational→damaged THIS raid
      //    (the `structural_state='operational'` predicate means an ALREADY-damaged building is NOT in this set — the
      //    once-per-DAMAGED-ENTRY guarantee the cook-adherence counter below relies on).
      const damaged = await tx
        .update(buildingOperationalState)
        .set({ structural_state: 'damaged' })
        .where(
          and(
            inArray(buildingOperationalState.building_id, buildingIds),
            eq(buildingOperationalState.structural_state, 'operational'),
          ),
        )
        .returning({ building_id: buildingOperationalState.building_id });

      // 2b) COOK ADHERENCE (Phase-2b vector #2c / Ash, T4) — increment damaged_pauses_during_cook ONCE per DAMAGED entry
      //     for any IN-PROGRESS cook on a building that JUST transitioned operational→damaged. SET-BASED, idempotent per
      //     transition: scoped to `damaged` (the buildings that actually flipped this tick — so a re-raid of an already-
      //     DAMAGED building does NOT re-increment) AND to cooks in a functional stage (a completed/aborted cook is not a
      //     mid-cook). SUBSTANCE-AGNOSTIC (any substance's cook is counted) but only Ash's purity READS the counter (T6)
      //     — behavior-PRESERVING: this only ADDS a count; the DAMAGED-pause itself (the cook freeze) is unchanged (the
      //     COOK_ADVANCE gate, listInProgressCooks, already excludes damaged labs — untouched here).
      const damagedBuildingIds = damaged.map((d) => d.building_id);
      if (damagedBuildingIds.length > 0) {
        await tx
          .update(cookSession)
          .set({ damaged_pauses_during_cook: sql`${cookSession.damaged_pauses_during_cook} + 1` })
          .where(
            and(
              inArray(cookSession.lab_building_id, damagedBuildingIds),
              inArray(cookSession.current_stage, FUNCTIONAL_COOK_STAGES),
            ),
          );

        // 2c) GROW SEIZE (Phase-3 vector #3 / grow_house, T6) — the make-vs-buy A consequence: a raid SEIZES the in-progress
        //     crop. SET-BASED DELETE of any IN-PROGRESS grow_session (current_stage <> 'completed') on a grow_house that
        //     JUST transitioned operational→damaged (scoped to `damaged` — the buildings that actually flipped this raid,
        //     so a re-raid of an already-DAMAGED grow_house seizes nothing the first raid already took; once-per-DAMAGED-
        //     entry, the SAME guard the cook-adherence counter relies on). The crop is LOST — the GROW_ADVANCE advance does
        //     not resume a seized grow (the row is gone), and the building is free to re-plant after repair. MIRRORS the
        //     Ash-T4 "side-effect on the RETURNING flipped buildings" shape (a set-based write keyed on `damagedBuildingIds`).
        //     Behavior-PRESERVING for lab/stash/specialized_lab raids: those buildings host NO grow_session, so this DELETE
        //     matches zero rows for them (byte-identical raid). Inside the SAME raid transaction (no new tick — piggybacks
        //     the canonical DAMAGED transition).
        await tx
          .delete(growSession)
          .where(
            and(
              inArray(growSession.building_id, damagedBuildingIds),
              sql`${growSession.current_stage} <> 'completed'`,
            ),
          );
      }

      // 3) LEDGER — one building_raid row per raided building (the BO-only seizure ledger; status 'executed').
      await tx.insert(buildingRaid).values(
        raided.map((r) => ({
          player_id: playerId,
          building_id: r.building_id,
          district_id: districtId,
          target_block_id: targetBlockId,
          raided_at_tick: raidedAtTick,
          grams_seized: r.grams_seized,
          status: 'executed' as const,
        })),
      );
    });

    return raided;
  }

  /**
   * EXECUTE the STREET RAID on the resolved money_holding targets in ONE transaction (set-based — no per-row loop;
   * Phase-5 vector #5a T5a). The PARALLEL, INDEPENDENT analog of executeRaid for clean-cash vaults — invoked on the SAME
   * RAID_EXECUTION tick (NO new tick) so a raided block hits its product-holders (executeRaid) AND its money_holdings
   * (this) independently. The product path is untouched (this never reads/writes product_storage / cook_session /
   * grow_session). For the money_holding set, in ONE tx:
   *   0) SETTLE YIELD FIRST (lot-4 TD-035 — canon: 2026-06-07-phase-05-money-holding-design.md §T5a settle-first):
   *      BEFORE computing the seize split, realize the un-realized pre-raid yield into held_cents for each target:
   *        post_settle_held = min(held + accruedYieldCents(held, last_yield_tick, raidedAtTick), capacityCentsForTier(tier))
   *      The accrual is computed in TS using the PURE `accruedYieldCents` (the shared single source of accrual truth —
   *      same BigInt math the deposit/withdraw settle uses; no service cycle — a pure function with zero deps). The seize
   *      percentage then applies to the post-settle held, so the player's just-accrued yield is REALIZED rather than
   *      forfeited with the seizure. The re-anchor `last_yield_tick = raidedAtTick` is now CORRECT (the yield WAS settled,
   *      not skipped). RE-VERIFICATION NOTE: the pre-TD-035 forfeit was defensible (a DAMAGED vault cannot deposit/withdraw,
   *      so the accrual was unrealizable between the raid and repair — see prior comment), but the phase-05 design DID
   *      mandate settle-first (`§T5a "settle yield first"`) and the user-acted arbitration ("raid P5 settle-first (canon)")
   *      overrides the local rationale. Net delta: canonical conformance + a fair seizure base — accrued yield is
   *      attributed, then partly seized, per canon.
   *   1) SEIZE CASH: `UPDATE money_holding SET held_cents = <survivor>, last_yield_tick = raidedAtTick WHERE building_id =
   *      ANY(set)`. The survivor = post_settle_held − floor(post_settle_held × raid_seize_pct) per target (exact BigInt
   *      math — moneyHoldingRaidSeizeCents; the pct is the gdd/14 tunable, R2.3, no float). Each target gets its OWN
   *      survivor (computed in TS on the post-settle held_cents), so the UPDATE is a per-target VALUES-join — but applied
   *      as ONE set-based statement (a CASE/VALUES mapping), never a per-row await loop. last_yield_tick is stamped to
   *      raidedAtTick (the yield was just settled — re-anchor from the raid tick is the correct new anchor).
   *   2) DAMAGED: `UPDATE building_operational_state SET structural_state='damaged' WHERE building_id = ANY(set) AND
   *      structural_state='operational'` — the EXACT existing path executeRaid uses (the targets were resolved
   *      operational; the predicate is belt-and-braces + makes a re-raid of an already-damaged vault a no-op). The
   *      repair action (OperationalRepairService, type-agnostic) restores it to operational — the seized cash is NOT
   *      restored (the seizure is permanent; repair only un-DAMAGEs the building).
   *   3) LEDGER: INSERT one `building_raid` row per money_holding (grams_seized = 0 — a money_holding holds no product;
   *      the cash seizure is the held_cents drop + the DAMAGED state + this row; the seized cents go to the log, never a
   *      ledger column — R2.2 keeps the held figure BO-only). status 'executed', raided_at_tick = raidedAtTick.
   * The set is ASSUMED non-empty (the service skips the call when resolveMoneyHoldingTargetsOnBlock is empty — the
   * money_holding leg of the dry-raid no-op). DETERMINISTIC (a fixed function of the persisted held_cents + the tunable,
   * NO RNG). Returns one RaidedMoneyHolding per vault (the seized cents — for logging; never surfaced raw).
   */
  async executeMoneyHoldingRaid(params: {
    playerId: string;
    districtId: number;
    targetBlockId: number;
    raidedAtTick: number;
    targets: RaidMoneyHoldingTarget[];
  }): Promise<RaidedMoneyHolding[]> {
    const { playerId, districtId, targetBlockId, raidedAtTick, targets } = params;
    // lot-4 TD-035 SETTLE-FIRST: compute the post-settle held for each target BEFORE the seize split. The accrual is
    // pure BigInt math (accruedYieldCents — the shared single source of accrual truth; same function the deposit/withdraw
    // settle uses, no service cycle). The capacity clamp mirrors the deposit/withdraw settle semantics exactly: overflow
    // yield is LOST (never auto-withdrawn, never exceeds capacity) — byte-identical to MoneyHoldingRepository.settleYield.
    // The seize then applies to this post-settle figure, so the player's un-realized yield is REALIZED not FORFEITED.
    const seized = targets.map((t) => {
      const capacityCents = capacityCentsForTier(t.money_holding_tier);
      const accrued = accruedYieldCents(t.held_cents, t.last_yield_tick, raidedAtTick);
      const postSettleHeld = t.held_cents + accrued > capacityCents ? capacityCents : t.held_cents + accrued;
      const { seizedCents, survivorCents } = moneyHoldingRaidSeizeCents(postSettleHeld);
      return { building_id: t.building_id, seized_cents: seizedCents, survivor_cents: survivorCents };
    });
    const buildingIds = seized.map((s) => s.building_id);

    await this.db.transaction(async (tx) => {
      // 1) SEIZE CASH — set-based per-target survivor write. A single UPDATE with a CASE over building_id maps each vault
      //    to its own survivor (so distinct post-settle held_cents seize correctly in ONE statement, no per-row loop).
      //    last_yield_tick is stamped to raidedAtTick (lot-4 TD-035: the yield WAS settled above → re-anchor is correct,
      //    not a forfeit). The CASE is built from the (building_id → survivor) pairs; the trailing ELSE keeps any
      //    non-targeted row unchanged defensively (the WHERE already scopes to buildingIds, so every row matches a WHEN).
      const whenClauses = seized.map(
        (s) => sql`WHEN ${moneyHolding.building_id} = ${s.building_id} THEN ${s.survivor_cents}::bigint`,
      );
      const survivorExpr = sql`CASE ${sql.join(whenClauses, sql` `)} ELSE ${moneyHolding.held_cents} END`;
      await tx
        .update(moneyHolding)
        .set({ held_cents: survivorExpr, last_yield_tick: raidedAtTick })
        .where(and(eq(moneyHolding.player_id, playerId), inArray(moneyHolding.building_id, buildingIds)));

      // 2) DAMAGED — the EXACT existing structural-state transition path (operations pause; repair restores — T2/§7).
      await tx
        .update(buildingOperationalState)
        .set({ structural_state: 'damaged' })
        .where(
          and(
            inArray(buildingOperationalState.building_id, buildingIds),
            eq(buildingOperationalState.structural_state, 'operational'),
          ),
        );

      // 3) LEDGER — one building_raid row per money_holding (grams_seized = 0; the seized cents are
      //    recorded in `seized_cents` (the cash leg ledger column, populated by InsuranceClaimsService
      //    for cash-vault STASH_LOSS payout basis — R2.2: BO-only, never surfaced raw).
      await tx.insert(buildingRaid).values(
        seized.map((s) => ({
          player_id: playerId,
          building_id: s.building_id,
          district_id: districtId,
          target_block_id: targetBlockId,
          raided_at_tick: raidedAtTick,
          grams_seized: 0,
          seized_cents: Number(s.seized_cents),
          status: 'executed' as const,
        })),
      );
    });

    return seized.map((s) => ({ building_id: s.building_id, seized_cents: s.seized_cents }));
  }

  // ───────────────────────────── projection read (the building-card raid surface) ─────────────────────────────

  /**
   * The most-recent building_raid row for a player-owned building (or null) — the projection read for the recent-raid
   * flag + the seized-amount band. Returns the raw grams_seized (the projection buckets it into a band — NEVER forwards
   * the raw figure; R2.2) + raided_at_tick (the projection's recency window compares it to the current tick — NEVER
   * forwarded raw; R2.2 — consumed only by the recently_raided boolean). Ordered by raided_at_tick DESC so the latest
   * raid wins. BO-only inputs.
   */
  async getLatestRaidForBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<{ grams_seized: number; status: string; raided_at_tick: number } | null> {
    const rows = await this.db
      .select({
        grams_seized: buildingRaid.grams_seized,
        status: buildingRaid.status,
        raided_at_tick: buildingRaid.raided_at_tick,
      })
      .from(buildingRaid)
      .where(and(eq(buildingRaid.player_id, playerId), eq(buildingRaid.building_id, buildingId)))
      .orderBy(sql`${buildingRaid.raided_at_tick} DESC, ${buildingRaid.raid_id} DESC`)
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute) — used by the projection to compute the
   * recently_raided recency window (`currentTick - latestRaid.raided_at_tick <= window`). Returns 0 when the player
   * has no clock row yet (the deterministic advance harness lazy-creates it on first advance). NOT a write — the clock
   * row is owned by the scheduler. REUSES the canonical pattern (ProductionRepository / GrowRepository / etc.).
   */
  async getCurrentTick(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }
}
