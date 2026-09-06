// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7.13 (money_holding — money_holding_tier / held_cents /
//             last_yield_tick surface, the money_holding table, Phase-5 vector #5a T0, migration 0025) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the guarded debit,
//             the SAME atomic-guarded pattern RealEstateRepository.debitAndCreateOperationalState /
//             RepairRepository.debitAndArmRepair / SpecializedLabRepository.debitAndUpgradeTier /
//             HubRepository.debitAndUpgradeHubTier use) +
//             docs/tech/09_data_model/schema_city_state.md (city_sim_clock.game_minute — the current-tick read, the
//             SAME read DistributionRepository.getCurrentTick does) +
//             docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4/§7 (money_holding tier + upgrade action
//             + T3 deposit/withdraw wallet↔held transfers + per-tier deposit capacity)
//             -- session:2026-06-07 (Phase 5 vector #5a — money_holding — Tasks 2/3) --
//
// `MoneyHoldingRepository` — the persisted access layer for the Phase-5 UPGRADE-MONEY-HOLDING-TIER slice (clean-cash
// holding vault). The BYTE-MIRROR of HubRepository (swapping hub_tier→money_holding_tier, 'distribution_hub'→
// 'money_holding'), with ONE structural difference: the tier lives on the dedicated `money_holding` table (NOT on
// building_operational_state — that table carries hub_tier/lab_tier, but money_holding's tier is the money_holding.
// money_holding_tier column, T0/migration 0025). So getUpgradeTargetState LEFT-JOINs money_holding onto the operational
// row (ownership + operational_type from building_operational_state; money_holding_tier from money_holding), and the
// tier-raise UPDATEs the money_holding table. Copies the persisted-system repository template (RepairRepository /
// HubRepository): a thin `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a
// thin service holding the per-action validation + cost logic.
//
// R9.3: 09 is the source of truth for `money_holding` (operational chain — §7.13, the money_holding_tier column T0,
// migration 0025) + `building_operational_state` (operational chain) + `economy_states` (Phase-1). This file IMPORTS the
// existing schema and NEVER re-declares it. The runtime role app_rw has UPDATE on money_holding (0025) +
// economy_states (0013) — this repository uses exactly those. NO schema change (T0 landed money_holding).
//
// THE GUARDED-DEBIT DISCIPLINE (REUSE — the SAME atomic pattern the real-estate / repair / specialized-lab / hub debits
// use): the upgrade debit is a `cash_cents >= cost` predicate IN the UPDATE so an insufficient balance NEVER goes
// negative — the UPDATE affects 0 rows, the WHOLE upgrade transaction rolls back (no state change), and the caller
// rejects (409). The debit + the money_holding_tier increment run in ONE transaction (an upgrade never debits cash
// without raising the tier, and vice-versa). All values are PARAMETERIZED bind params (no string interpolation). NO RNG
// (deterministic).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState, moneyHolding } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { accruedYieldCents, moneyHoldingForfeitureSeizeCents } from './money-holding-tunables';

/** A Drizzle transaction handle (the `tx` arg of db.transaction) — the type the in-tx settle step operates on. */
type Tx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/**
 * Sentinel thrown to roll the deposit tx back when the held credit would exceed the tier capacity (the OVER_CAPACITY
 * case). The service catches THIS specific type and maps it to 409 OVER_CAPACITY — distinguishing a clean
 * capacity-rejection (no state change, expected) from a genuine DB failure (which propagates as a 500). Carries the
 * buildingId for the log/message only (no raw cents — R2.2).
 */
export class MoneyHoldingOverCapacityError extends Error {
  constructor(public readonly buildingId: string) {
    super(`deposit would exceed the money_holding capacity for building ${buildingId}`);
    this.name = 'MoneyHoldingOverCapacityError';
  }
}

/** A player-owned building's upgrade-relevant operational state (the upgrade-money-holding-tier action validation input). */
export interface MoneyHoldingUpgradeTargetState {
  building_id: string;
  /** The operational type (front_shop/stash/lab/distribution_hub/money_holding/… — only 'money_holding' is tier-upgradable). */
  operational_type: string;
  /**
   * The current money_holding_tier (money_holding.money_holding_tier; default 1 at build — the lever the action raises).
   * NULL when the building has no money_holding row (i.e. a non-money_holding building); the service rejects those with
   * a WRONG_TYPE 409 BEFORE ever reading this, so a null only ever pairs with operational_type ≠ 'money_holding'.
   */
  money_holding_tier: number | null;
}

/**
 * A player-owned building's deposit/withdraw-relevant money_holding state (the T3 deposit / withdraw validation input).
 * The deposit OVER_CAPACITY guard needs the CURRENT money_holding_tier (→ capacityCentsForTier); both actions need to
 * confirm the building is the player's money_holding first.
 */
export interface MoneyHoldingTransferTargetState {
  building_id: string;
  /** The operational type — only 'money_holding' carries a held_cents pool to deposit into / withdraw from. */
  operational_type: string;
  /** The current money_holding_tier (NULL on a non-money_holding building — the service rejects WRONG_TYPE first). */
  money_holding_tier: number | null;
}

/**
 * A player-owned money_holding's PROJECTION row (Phase-5 vector #5a — T6; the building-card band-projection input). The
 * RAW persisted fields the MoneyHoldingProjectionService maps to qualitative bands (R2.2 — NONE of these escape raw):
 * the held_cents + last_yield_tick (→ the EFFECTIVE held = held + live-accrued yield, computed read-only via the pure
 * accrual fn — the held_band / capacity_band / yield_band input), the money_holding_tier (→ the money_holding_tier_band
 * AND the capacity via capacityCentsForTier), and the forfeiture_scheduled_at_tick (→ the forfeiture_band, vs the current
 * tick). Read ONLY for a money_holding building card (a non-money_holding card surfaces the neutral NONE defaults without
 * this read — the assembly site skips it). A money_holding always has its 1-1 row, so money_holding_tier is non-null.
 */
export interface MoneyHoldingProjectionRow {
  /** The persisted held_cents pool (bigint mode — the live-accrual is added to this for the EFFECTIVE held). */
  held_cents: bigint;
  /** The yield anchor (bigint mode 'number') — the live-accrual elapsed = currentTick − this. */
  last_yield_tick: number;
  /** The current money_holding_tier (→ the money_holding_tier_band + capacityCentsForTier for the capacity_band). */
  money_holding_tier: number;
  /** The armed forfeiture deadline (game-minute tick), or NULL when no forfeiture is scheduled (→ the forfeiture_band). */
  forfeiture_scheduled_at_tick: number | null;
}

/**
 * A player's money_holding as the MONEY_HOLDING_AUDIT tick reads it (T5b — the forfeiture lifecycle input). Carries the
 * held_cents + last_yield_tick (→ the EFFECTIVE held = held + live-accrued yield, computed read-only via the pure accrual
 * fn) + the money_holding_tier (→ the settle CAP at EXECUTE) + the current forfeiture_scheduled_at_tick (NULL = no
 * forfeiture armed). All BO-only inputs (R2.2 — never surfaced raw; the forfeiture_band is T6). A money_holding always
 * has its 1-1 row, so money_holding_tier is non-null here.
 */
export interface MoneyHoldingAuditRow {
  building_id: string;
  /** The persisted held_cents pool (bigint mode — the live-accrual is added to this for the EFFECTIVE held). */
  held_cents: bigint;
  /** The yield anchor (bigint mode 'number') — the live-accrual elapsed = currentTick − this. */
  last_yield_tick: number;
  /** The current money_holding_tier (→ capacityCentsForTier for the EXECUTE settle cap). */
  money_holding_tier: number;
  /** The armed forfeiture deadline (game-minute tick), or NULL when no forfeiture is scheduled. */
  forfeiture_scheduled_at_tick: number | null;
}

@Injectable()
export class MoneyHoldingRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read a player-owned building's upgrade-relevant operational state (or null). Returns null when the building has no
   * building_operational_state row for THIS player (not owned / not converted) — the caller maps that to a 404. The
   * operational_type drives the money_holding validation (only a money_holding is tier-upgradable → 409 otherwise); the
   * money_holding_tier (LEFT-JOINed from the money_holding table) drives the at-cap validation (only money_holding_tier
   * < max_tier is upgradable → 409 at cap). A non-money_holding building has no money_holding row → money_holding_tier
   * comes back null, but the service short-circuits on the operational_type check first. Player-scoped so a building
   * belonging to another player is invisible (404, never a cross-player leak).
   */
  async getUpgradeTargetState(playerId: string, buildingId: string): Promise<MoneyHoldingUpgradeTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        money_holding_tier: moneyHolding.money_holding_tier,
      })
      .from(buildingOperationalState)
      .leftJoin(
        moneyHolding,
        and(
          eq(moneyHolding.building_id, buildingOperationalState.building_id),
          eq(moneyHolding.player_id, buildingOperationalState.player_id),
        ),
      )
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Read a player-owned building's deposit/withdraw-relevant money_holding state (or null when the player has no
   * building_operational_state row for this building — not owned / not converted → the caller maps to 404). LEFT-JOINs
   * the money_holding table for the CURRENT money_holding_tier (the deposit OVER_CAPACITY guard keys its capacity off
   * this). A non-money_holding building has no money_holding row → money_holding_tier comes back null, but the service
   * rejects on operational_type ≠ 'money_holding' (WRONG_TYPE 409) before ever reading it. Player-scoped — another
   * player's building is invisible (404, never a cross-player leak). The SAME shape as getUpgradeTargetState; kept a
   * separate method so the deposit/withdraw read intent is explicit (and to leave room for T4+ to widen one without the
   * other).
   */
  async getTransferTargetState(
    playerId: string,
    buildingId: string,
  ): Promise<MoneyHoldingTransferTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        money_holding_tier: moneyHolding.money_holding_tier,
      })
      .from(buildingOperationalState)
      .leftJoin(
        moneyHolding,
        and(
          eq(moneyHolding.building_id, buildingOperationalState.building_id),
          eq(moneyHolding.player_id, buildingOperationalState.player_id),
        ),
      )
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute). Returns 0 when the player has no clock row yet (the
   * deterministic advance harness lazy-creates it on first advance). Used to STAMP money_holding.last_yield_tick on each
   * deposit/withdraw mutation — the yield anchor T4 will compute lazy-accrual from (for T3 it is purely the anchor, no
   * accrual math yet). NOT a write — the clock row is owned by the scheduler. The BYTE-MIRROR of
   * DistributionRepository.getCurrentTick.
   */
  async getCurrentTick(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * Read a player-owned money_holding's PROJECTION row (Phase-5 vector #5a — T6; the building-card band-projection
   * input), or null when the player has no money_holding row for this building. Called ONLY for a building the
   * assembly site already knows is a money_holding (operational_type === 'money_holding'), so a null here is the
   * defensive case (a money_holding always has its 1-1 row, created on convert, T1) — the projection then falls to the
   * neutral NONE bands. Player-scoped (the SAME scoping the audit/transfer reads use), so another player's holding is
   * invisible. A READ — no state change (the live-accrual is computed in the service, never persisted here). The raw
   * held_cents / last_yield_tick / money_holding_tier / forfeiture_scheduled_at_tick are the band INPUTS (R2.2 — they
   * are mapped to closed bands in the service, NEVER forwarded raw).
   */
  async getProjectionRow(playerId: string, buildingId: string): Promise<MoneyHoldingProjectionRow | null> {
    const rows = await this.db
      .select({
        held_cents: moneyHolding.held_cents,
        last_yield_tick: moneyHolding.last_yield_tick,
        money_holding_tier: moneyHolding.money_holding_tier,
        forfeiture_scheduled_at_tick: moneyHolding.forfeiture_scheduled_at_tick,
      })
      .from(moneyHolding)
      .where(and(eq(moneyHolding.building_id, buildingId), eq(moneyHolding.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * TD-036 (lot-5): REALIZE the accrued lazy yield into held_cents at the PROJECTION-READ realization point (spec §4-T4:
   * "at read/deposit/withdraw, accrued = … credited to held_cents"). Wraps the private {@link settleYield} in its own
   * short auto-committed transaction so the settle is durable even when called from a read-only path (the building-card
   * GET handler). Uses `FOR UPDATE` row-locking inside the tx so a concurrent projection-read settle on the same row
   * serializes (last-writer-wins at the same tick → idempotent: both writers compute the same cappedHeld). The settle
   * cap is `capacityCentsForTier(tier)` (the tier is already known by the projection-read caller).
   *
   * IDEMPOTENCY GUARD: when `last_yield_tick == currentTick` the elapsed is 0 → `accruedYieldCents` returns 0n → the
   * UPDATE sets `held_cents = held_cents` (a no-op write) and re-stamps the anchor to the same tick it already holds —
   * double-settling on the same tick is safe. A NO-LOCK fast path could skip the UPDATE when accrued == 0n, but the
   * current shape (always UPDATE) is simpler and consistent with the deposit/withdraw settle — the write is the same
   * cheap row-touch as the deposit anchor re-stamp.
   *
   * Called by {@link MoneyHoldingProjectionService.moneyHoldingBands} BEFORE it re-reads for the bands (so the bands
   * reflect the post-settle held, the same value the deposit/withdraw WOULD realize on the next mutation). R9.3: no
   * schema change (held_cents / last_yield_tick already exist, migration 0025).
   */
  async settleYieldForProjection(
    playerId: string,
    buildingId: string,
    capacityCents: bigint,
    currentTick: number,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.settleYield(tx, playerId, buildingId, capacityCents, currentTick);
    });
  }

  /**
   * The T4 SETTLE-YIELD step — REALIZE the accrued lazy yield into held_cents, IN the current tx, BEFORE the transfer
   * delta (so the deposit/withdraw guards see the post-settle held). Reads the row's CURRENT held_cents +
   * last_yield_tick under a `FOR UPDATE` row lock (so a concurrent settle on the same money_holding serializes), computes
   * the accrued yield via the PURE accruedYieldCents (the shared single source of accrual truth — deterministic, float-
   * free BigInt math), clamps held + accrued to the tier capacity (the min computed in TS on the locked bigints), and
   * `UPDATE money_holding SET held_cents = <clamped>, last_yield_tick = currentTick`. The cap means OVERFLOW YIELD IS
   * LOST (never auto-withdrawn, never exceeds capacity). A non-existent row
   * (a non-money_holding) settles nothing — but the caller has already validated ownership + money_holding type before
   * the tx, so the row always exists here. NO RNG. The accrual math runs in TS (not SQL) so the rate stays a single
   * code-owned fraction (R2.3) and the value is byte-identical to MoneyHoldingService.accruedYieldCents.
   */
  private async settleYield(
    tx: Tx,
    playerId: string,
    buildingId: string,
    capacityCents: bigint,
    currentTick: number,
  ): Promise<void> {
    // Read the live held + anchor under a row lock so the settle (read → compute → write) is atomic against a concurrent
    // settle on the same row. last_yield_tick is `bigint` mode 'number'; held_cents is `bigint` mode 'bigint'.
    const rows = await tx
      .select({ held_cents: moneyHolding.held_cents, last_yield_tick: moneyHolding.last_yield_tick })
      .from(moneyHolding)
      .where(and(eq(moneyHolding.building_id, buildingId), eq(moneyHolding.player_id, playerId)))
      .for('update')
      .limit(1);
    const row = rows[0];
    if (!row) return; // No money_holding row (a non-money_holding) → nothing to settle. (Unreachable post-validation.)

    const accrued = accruedYieldCents(row.held_cents, row.last_yield_tick, currentTick);
    // Realize: held = min(held + accrued, capacity) — the overflow above the tier capacity is LOST (not auto-withdrawn).
    // accrued is 0n when the clock has not advanced past the anchor or held is 0 → the UPDATE then only re-stamps the
    // anchor (held unchanged, since min(held + 0, capacity) = held for any held ≤ capacity). The clamp is a plain BigInt
    // comparison on the locked values, so the cap composes with the held with no type loss.
    const settledHeld = row.held_cents + accrued;
    const cappedHeld = settledHeld > capacityCents ? capacityCents : settledHeld;
    await tx
      .update(moneyHolding)
      .set({ held_cents: cappedHeld, last_yield_tick: currentTick })
      .where(and(eq(moneyHolding.building_id, buildingId), eq(moneyHolding.player_id, playerId)));
  }

  /**
   * The ATOMIC guarded DEPOSIT (wallet → held), in ONE DB transaction (the wallet and held NEVER diverge — a rejected
   * transfer makes NO change):
   *   0) SETTLE YIELD (T4): realize the accrued lazy yield into held_cents (held = min(held + accrued, capacity)) and
   *      stamp last_yield_tick = currentTick, BEFORE the transfer delta — so the OVER_CAPACITY guard below checks the
   *      POST-settle held. Overflow yield is LOST (capped at capacity, never auto-withdrawn).
   *   1) GUARDED WALLET DEBIT (REUSE the atomic-guarded debit pattern): `UPDATE economy_states SET cash_cents =
   *      cash_cents - amount WHERE player_id = ? AND cash_cents >= amount`. Insufficient balance (or no wallet row) →
   *      0 rows → return 'INSUFFICIENT_FUNDS' (the caller rejects 409); the tx rolls back the no-op (incl. the settle).
   *   2) GUARDED HELD CREDIT (capacity guard IN the UPDATE): `UPDATE money_holding SET held_cents = held_cents + amount
   *      WHERE building_id = ? AND player_id = ? AND held_cents + amount <= capacity`. The over-capacity case → 0 rows →
   *      THROW to roll the WHOLE tx back (the debit must not land without the credit), and the caller maps the rollback
   *      to 409 OVER_CAPACITY. (last_yield_tick was already stamped to currentTick by the settle step.)
   * Returns 'OK' on success, or 'INSUFFICIENT_FUNDS' when the wallet could not cover the deposit. The OVER_CAPACITY case
   * surfaces as a thrown rollback (so we never half-apply); the service catches it and maps to 409. DETERMINISTIC (no RNG).
   */
  async depositCash(params: {
    playerId: string;
    buildingId: string;
    amountCents: bigint;
    capacityCents: bigint;
    currentTick: number;
  }): Promise<'OK' | 'INSUFFICIENT_FUNDS'> {
    const { playerId, buildingId, amountCents, capacityCents, currentTick } = params;
    return this.db.transaction(async (tx) => {
      // 0) SETTLE YIELD FIRST — realize accrued into held (capped at capacity) + re-anchor last_yield_tick = currentTick.
      await this.settleYield(tx, playerId, buildingId, capacityCents, currentTick);

      // 1) GUARDED WALLET DEBIT — only succeeds if the wallet can cover the amount (never go negative).
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${amountCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${amountCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole deposit (the tx rolls back the no-op + the settle).
        return 'INSUFFICIENT_FUNDS';
      }

      // 2) GUARDED HELD CREDIT — the capacity predicate IN the UPDATE so an over-capacity deposit credits 0 rows. Operates
      // on the POST-settle held_cents (the settle re-anchored last_yield_tick already, so no re-stamp here).
      const credited = await tx
        .update(moneyHolding)
        .set({ held_cents: sql`${moneyHolding.held_cents} + ${amountCents}` })
        .where(
          and(
            eq(moneyHolding.building_id, buildingId),
            eq(moneyHolding.player_id, playerId),
            sql`${moneyHolding.held_cents} + ${amountCents} <= ${capacityCents}`,
          ),
        )
        .returning({ held_cents: moneyHolding.held_cents });

      if (credited.length === 0) {
        // The held credit hit the capacity cap → roll the WHOLE tx back so the wallet debit does not land without the
        // held credit (a transfer never debits one side without crediting the other). The caller maps this to 409
        // OVER_CAPACITY (it already validated ownership/type, so the only way to update 0 rows here is the capacity guard).
        throw new MoneyHoldingOverCapacityError(buildingId);
      }

      return 'OK';
    });
  }

  /**
   * The ATOMIC guarded WITHDRAW (held → wallet), in ONE DB transaction (the held and wallet NEVER diverge):
   *   0) SETTLE YIELD (T4): realize the accrued lazy yield into held_cents (held = min(held + accrued, capacity)) and
   *      stamp last_yield_tick = currentTick, BEFORE the held debit — so the INSUFFICIENT_HELD guard checks the
   *      POST-settle held (the yield is available to withdraw). Overflow yield is LOST (capped, never auto-withdrawn).
   *   1) GUARDED HELD DEBIT: `UPDATE money_holding SET held_cents = held_cents - amount WHERE building_id = ? AND
   *      player_id = ? AND held_cents >= amount`. Insufficient held → 0 rows → return 'INSUFFICIENT_HELD' (the caller
   *      rejects 409); the tx rolls back the no-op (held never goes negative — CHECK mh_held_cents_nonneg_chk backstops).
   *      (last_yield_tick was already re-anchored to currentTick by the settle step.)
   *   2) WALLET CREDIT (HARDENED — T3-review fold): `UPDATE economy_states SET cash_cents = cash_cents + amount WHERE
   *      player_id = ?` with `.returning()`. The wallet row always exists for a player who owns a money_holding, BUT the
   *      credit is now SELF-ENFORCING: if it affects 0 rows (the wallet row were ever absent), we THROW to roll the WHOLE
   *      tx back — so the held debit can NEVER land without the matching wallet credit (the held cash is never silently
   *      lost). Mirrors the deposit's capacity-sentinel rollback discipline (money-moving code, cheap insurance).
   * Returns 'OK' on success, or 'INSUFFICIENT_HELD' when the holding had less than the requested amount. DETERMINISTIC.
   */
  async withdrawCash(params: {
    playerId: string;
    buildingId: string;
    amountCents: bigint;
    capacityCents: bigint;
    currentTick: number;
  }): Promise<'OK' | 'INSUFFICIENT_HELD'> {
    const { playerId, buildingId, amountCents, capacityCents, currentTick } = params;
    return this.db.transaction(async (tx) => {
      // 0) SETTLE YIELD FIRST — realize accrued into held (capped at capacity) + re-anchor last_yield_tick = currentTick,
      // so the held debit's guard (and the amount the player can take out) reflects the just-earned yield.
      await this.settleYield(tx, playerId, buildingId, capacityCents, currentTick);

      // 1) GUARDED HELD DEBIT — only succeeds if the (post-settle) holding holds at least the amount (never go negative).
      const debited = await tx
        .update(moneyHolding)
        .set({ held_cents: sql`${moneyHolding.held_cents} - ${amountCents}` })
        .where(
          and(
            eq(moneyHolding.building_id, buildingId),
            eq(moneyHolding.player_id, playerId),
            sql`${moneyHolding.held_cents} >= ${amountCents}`,
          ),
        )
        .returning({ held_cents: moneyHolding.held_cents });
      if (debited.length === 0) {
        // Insufficient held → refuse the whole withdraw (the tx rolls back the no-op + the settle).
        return 'INSUFFICIENT_HELD';
      }

      // 2) WALLET CREDIT (HARDENED) — self-enforcing: `.returning()` the credited row and roll the WHOLE tx back if it
      // affected 0 rows (a missing wallet row), so the held debit above can never land without the matching credit (the
      // held cash is never silently lost). The player's wallet row exists by construction, so this throw is dead-code
      // insurance — but money-moving code earns its symmetry with the deposit's capacity-sentinel rollback.
      const credited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} + ${amountCents}` })
        .where(eq(economyState.player_id, playerId))
        .returning({ cash_cents: economyState.cash_cents });
      if (credited.length === 0) {
        throw new Error(
          `withdraw-cash: the wallet credit affected 0 rows for player ${playerId} (no economy_states row) — rolled the ` +
            `held debit back so the withdrawn cash is not silently lost.`,
        );
      }

      return 'OK';
    });
  }

  /**
   * The ATOMIC guarded upgrade-money-holding-tier transaction (the wallet-affecting action): in ONE DB transaction —
   *   1) GUARDED DEBIT (REUSE the real-estate / repair / specialized-lab / hub atomic-guarded pattern): `UPDATE
   *      economy_states SET cash_cents = cash_cents - cost WHERE player_id = ? AND cash_cents >= cost`. Insufficient
   *      balance → 0 rows → return null (the caller rejects 409 INSUFFICIENT_FUNDS); the tx rolls back the no-op (no
   *      state change).
   *   2) RAISE THE TIER: `UPDATE money_holding SET money_holding_tier = money_holding_tier + 1 WHERE building_id = ? AND
   *      player_id = ? AND money_holding_tier = fromTier` (the fromTier predicate is belt-and-braces — the caller
   *      already validated it; it also makes a concurrent double-upgrade a no-op: a racing second call whose
   *      money_holding_tier already moved past fromTier updates 0 rows).
   * `fromTier` is the money_holding_tier the caller READ and validated < max_tier; the increment lands money_holding_tier
   * = fromTier + 1. Returns { newTier } on success, or null when the debit was refused (insufficient funds).
   * DETERMINISTIC (no RNG).
   */
  async debitAndUpgradeMoneyHoldingTier(params: {
    playerId: string;
    buildingId: string;
    fromTier: number;
    costCents: bigint;
  }): Promise<{ newTier: number } | null> {
    const { playerId, buildingId, fromTier, costCents } = params;
    return this.db.transaction(async (tx) => {
      // 1) GUARDED DEBIT — only succeeds if the wallet can cover the cost (never go negative — anti-exploit). REUSE the
      // exact atomic-guarded predicate the real-estate purchase/convert + repair + specialized-lab + hub debits use.
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole upgrade (the tx rolls back the no-op).
        return null;
      }

      // 2) RAISE THE TIER — increment money_holding_tier by one (guarded on the validated fromTier, so a concurrent
      // double-upgrade updates 0 rows — but the debit above is the real single-charge guard via idempotency).
      const raised = await tx
        .update(moneyHolding)
        .set({ money_holding_tier: sql`${moneyHolding.money_holding_tier} + 1` })
        .where(
          and(
            eq(moneyHolding.building_id, buildingId),
            eq(moneyHolding.player_id, playerId),
            eq(moneyHolding.money_holding_tier, fromTier),
          ),
        )
        .returning({ money_holding_tier: moneyHolding.money_holding_tier });

      // The tier-raise predicate failed to match (a concurrent upgrade already moved money_holding_tier past fromTier) →
      // roll the whole tx back so the debit does not land without the tier moving (an upgrade never charges without
      // upgrading).
      if (raised.length === 0) {
        throw new Error(
          'upgrade-money-holding-tier lost a concurrency race (money_holding_tier moved past the validated fromTier) — rolled back.',
        );
      }

      return { newTier: raised[0].money_holding_tier };
    });
  }

  // ───────────────────────────── T5b — audit-forfeiture lifecycle (the MONEY_HOLDING_AUDIT tick) ─────────────────────

  /**
   * Batch-read the player's money_holdings for the MONEY_HOLDING_AUDIT tick (T5b — the schedule/cancel/execute lifecycle
   * input). ONE query (the Phase-1 determinism discipline — no per-row round-trips), ordered by building_id for
   * deterministic batching. Each row carries the columns the lifecycle needs: the held_cents + last_yield_tick (→ the
   * EFFECTIVE held = held_cents + live-accrued yield, computed read-only in the service via the pure accrual fn — NOT a
   * persisted settle here, the write-amplification note) + the money_holding_tier (→ the settle CAP at EXECUTE) + the
   * current forfeiture_scheduled_at_tick (NULL = none armed). A money_holding ALWAYS exists for a money_holding building
   * (created on convert, T1). Returns [] when the player has no money_holding (the organic no-op). BO-only inputs (R2.2).
   */
  async listMoneyHoldingsForAudit(playerId: string): Promise<MoneyHoldingAuditRow[]> {
    const rows = await this.db
      .select({
        building_id: moneyHolding.building_id,
        held_cents: moneyHolding.held_cents,
        last_yield_tick: moneyHolding.last_yield_tick,
        money_holding_tier: moneyHolding.money_holding_tier,
        forfeiture_scheduled_at_tick: moneyHolding.forfeiture_scheduled_at_tick,
      })
      .from(moneyHolding)
      .where(eq(moneyHolding.player_id, playerId))
      .orderBy(moneyHolding.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      held_cents: r.held_cents,
      last_yield_tick: r.last_yield_tick,
      money_holding_tier: r.money_holding_tier,
      forfeiture_scheduled_at_tick: r.forfeiture_scheduled_at_tick,
    }));
  }

  /**
   * SCHEDULE the audit-forfeiture (T5b — the telegraph arming): set the forfeiture_scheduled_at_tick to `scheduledAtTick`
   * (= currentTick + money_holding.forfeiture_warning_ticks, computed by the service) for the player's money_holdings in
   * `buildingIds`, ONLY where it is currently NULL (belt-and-braces — the service already filtered to the un-armed set, and
   * the predicate makes a re-arm a no-op so a concurrent audit cannot push the deadline out). ONE set-based UPDATE (no
   * per-row loop). The buildingIds are ASSUMED non-empty (the service skips the call when nothing transitions to SCHEDULE).
   */
  async scheduleForfeiture(playerId: string, buildingIds: string[], scheduledAtTick: number): Promise<void> {
    await this.db
      .update(moneyHolding)
      .set({ forfeiture_scheduled_at_tick: scheduledAtTick })
      .where(
        and(
          eq(moneyHolding.player_id, playerId),
          inArray(moneyHolding.building_id, buildingIds),
          sql`${moneyHolding.forfeiture_scheduled_at_tick} IS NULL`,
        ),
      );
  }

  /**
   * CANCEL the audit-forfeiture (T5b — the player reacted: the hold dropped below the threshold): NULL the
   * forfeiture_scheduled_at_tick for the player's money_holdings in `buildingIds`, ONLY where it is currently NOT NULL
   * (belt-and-braces — the service filtered to the armed-but-now-below set). ONE set-based UPDATE (no per-row loop). The
   * buildingIds are ASSUMED non-empty (the service skips the call when nothing transitions to CANCEL). NO seizure, NO
   * structural change — purely disarming the telegraph.
   */
  async cancelForfeiture(playerId: string, buildingIds: string[]): Promise<void> {
    await this.db
      .update(moneyHolding)
      .set({ forfeiture_scheduled_at_tick: null })
      .where(
        and(
          eq(moneyHolding.player_id, playerId),
          inArray(moneyHolding.building_id, buildingIds),
          sql`${moneyHolding.forfeiture_scheduled_at_tick} IS NOT NULL`,
        ),
      );
  }

  /**
   * EXECUTE the audit-forfeiture on ONE money_holding (T5b — the bigger LEGAL bite) in ONE transaction. DISTINCT from the
   * street raid (executeMoneyHoldingRaid): NO structural_state change (no DAMAGED), NO building_raid row — a legal
   * forfeiture, not a raid. The steps (per the design):
   *   1) SETTLE YIELD FIRST — realize the accrued lazy yield into held_cents (held = min(held + accrued, capacity)) and
   *      re-anchor last_yield_tick = currentTick, REUSING the SAME private settleYield the deposit/withdraw use (so the
   *      forfeiture bites the POST-settle held — the just-earned yield is realized before the seize, then partly seized).
   *   2) RE-READ the POST-settle held under the SAME row lock (FOR UPDATE) so the seize split is computed on the realized
   *      figure (the settle clamped held + accrued at capacity), compute the exact survivor via moneyHoldingForfeitureSeizeCents
   *      (pure BigInt — forfeiture_seize_pct 0.5 → 1/2, no float), and `UPDATE money_holding SET held_cents = <survivor>,
   *      forfeiture_scheduled_at_tick = NULL` (the telegraph fired → disarm; the building stays OPERATIONAL).
   * The seized cents are BO-only (logging, never a surfaced figure — R2.2). Returns the seized cents (for the log).
   * DETERMINISTIC (a fixed function of the persisted held + the tunables, NO RNG). Called ONCE per holding the service
   * resolved as EXECUTE (a per-holding tx — each forfeiture is independent; the EXECUTE set is rare so no batch needed).
   */
  async executeForfeiture(params: {
    playerId: string;
    buildingId: string;
    capacityCents: bigint;
    currentTick: number;
  }): Promise<{ seizedCents: bigint }> {
    const { playerId, buildingId, capacityCents, currentTick } = params;
    return this.db.transaction(async (tx) => {
      // 1) SETTLE YIELD FIRST — realize accrued into held (capped at capacity) + re-anchor last_yield_tick = currentTick.
      //    REUSE the EXACT in-tx settle the deposit/withdraw use (the single source of settle truth; it row-locks the row).
      await this.settleYield(tx, playerId, buildingId, capacityCents, currentTick);

      // 2) RE-READ the post-settle held (still under the row lock the settle held), compute the exact forfeiture split,
      //    seize the survivor, and DISARM the schedule. NO structural_state change, NO building_raid row (legal, not raid).
      const rows = await tx
        .select({ held_cents: moneyHolding.held_cents })
        .from(moneyHolding)
        .where(and(eq(moneyHolding.building_id, buildingId), eq(moneyHolding.player_id, playerId)))
        .for('update')
        .limit(1);
      const row = rows[0];
      if (!row) return { seizedCents: 0n }; // No row (unreachable — the service resolved it from the same player scan).

      const { seizedCents, survivorCents } = moneyHoldingForfeitureSeizeCents(row.held_cents);
      await tx
        .update(moneyHolding)
        .set({ held_cents: survivorCents, forfeiture_scheduled_at_tick: null })
        .where(and(eq(moneyHolding.building_id, buildingId), eq(moneyHolding.player_id, playerId)));

      return { seizedCents };
    });
  }

  /**
   * Read the current `held_cents` for a player+building after a committed deposit or withdraw.
   * Used by MoneyHoldingService to build the `StashFillEvent.heldCentsAfter` value (Drift C4 — the post-commit
   * held amount for the stash-ratio computation). ONE SELECT, NOT inside a transaction — the deposit tx has already
   * committed at this point, so we read the committed value. ADDITIVE-ONLY: called only after a successful commit.
   *
   * Returns the held_cents, or `null` if the row is absent (unreachable post-deposit, but safe to handle).
   */
  async readHeldCents(playerId: string, buildingId: string): Promise<bigint | null> {
    const rows = await this.db
      .select({ held_cents: moneyHolding.held_cents })
      .from(moneyHolding)
      .where(and(eq(moneyHolding.building_id, buildingId), eq(moneyHolding.player_id, playerId)))
      .limit(1);
    return rows[0]?.held_cents ?? null;
  }
}
