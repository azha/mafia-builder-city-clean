// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4-T6 (the money_holding building-card
//             band projection — qualitative bands only, R2.2) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.13 (money_holding — held_cents / money_holding_tier /
//             last_yield_tick / forfeiture_scheduled_at_tick surface; T0, migration 0025 — READ-ONLY here) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to the client)
//             -- session:2026-06-07 (Phase 5 vector #5a — money_holding — Task 6) --
//
// `MoneyHoldingProjectionService` — the player-facing BAND projection for a money_holding Building Card (Phase-5 vector
// #5a T6). The DIRECT sibling of DistributionProjectionService.hubDispatchBands (the distribution_hub T6 cross-module
// band method): the RealEstateProjection.projectBuilding building-card assembly calls THIS for a money_holding card, the
// SAME one-way RealEstate→{Distribution|MoneyHolding} import shape (MoneyHoldingModule imports Auth/Db/Scheduler — NOT
// real_estate — so RealEstate→MoneyHolding introduces no cycle). It maps the RAW persisted money_holding fields (held_cents,
// money_holding_tier, last_yield_tick, forfeiture_scheduled_at_tick) → FIVE qualitative bands and NEVER forwards a raw
// scalar — no cents, no tier int, no yield rate, no tick, no forfeiture_scheduled_at_tick. R2.2.
//
// THE BANDS (all closed qualitative domains — the only money_holding signal exposed):
//   - money_holding_tier_band: NONE (non-money_holding) | SMALL | MEDIUM | LARGE | MAJOR | MAX — the money_holding_tier
//     lever (1..max_tier) as a band (the BYTE-MIRROR of hub_tier_band / lab_tier_band; NEVER the raw int).
//   - held_band: NONE (held == 0) | LOW | MODERATE | HIGH | MASSIVE — the magnitude of the EFFECTIVE held clean cash
//     (held_cents + the LIVE-accrued yield, read-only), anchored on the M1 $ scale like the repair/seized bands (NEVER
//     the raw cents).
//   - capacity_band: OPEN (held == 0) | BUSY (0 < held < capacity) | FULL (held >= capacity) — the held vs the
//     tier-capacity fill, the BYTE-MIRROR of the distribution_hub roster_band semantics (NEVER the raw held/cap).
//   - yield_band: IDLE (held == 0 — nothing is earning) | EARNING (held > 0 — the passive yield accrues). A simple
//     boolean-shaped band (NEVER the raw rate / accrued cents).
//   - forfeiture_band: NONE (no forfeiture armed) | PENDING (armed, the deadline is still comfortably ahead) | IMMINENT
//     (armed, the deadline is near/at/past now) — telegraphs the audit so the player can react (withdraw / diversify).
//     NEVER the raw forfeiture_scheduled_at_tick / the current tick.
//
// The EFFECTIVE held = held_cents + accruedYieldCents(held_cents, last_yield_tick, currentTick) — the SAME pure,
// deterministic, float-free accrual the service/repository/audit-tick share (relocated to money-holding-tunables.ts at
// T5b). It is read-ONLY here (NO settle, NO write) so the band reflects what a deposit/withdraw WOULD realize, with no
// state change on a mere card read. R2.3: the capacity is capacityCentsForTier(tier) (the gdd/14 registry, REUSE); the
// band CUT-POINTS (the $ anchors / the IMMINENT tick threshold) are PRESENTATION-ONLY bucketing of already-derived
// figures (like the seized/repair/roster band cut-points in the building-card projection) — NOT balance tunables, so no
// gdd/14 edit is needed.
//
// R2.2 RAW-LEAK GUARANTEE: every field this service returns is a closed-domain string — NEVER held_cents, the tier int,
// the yield rate, the tick clock, or the forfeiture_scheduled_at_tick. The building-card no-leak E2E scans the payload
// recursively and rejects any unexpected raw scalar.

import { Injectable } from '@nestjs/common';

import { MoneyHoldingRepository } from './money-holding.repository';
import { accruedYieldCents, capacityCentsForTier } from './money-holding-tunables';

/** The qualitative money_holding_tier band (the money_holding_tier lever as a band; NONE for a non-money_holding). */
export type MoneyHoldingTierBand = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'MAJOR' | 'MAX';

/** The qualitative held-magnitude band (the EFFECTIVE held clean cash as a band — NEVER raw cents; R2.2). */
export type HeldBand = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'MASSIVE';

/** The qualitative capacity fill band (held vs the tier capacity — mirror the roster_band semantics; NEVER raw). */
export type CapacityBand = 'NONE' | 'OPEN' | 'BUSY' | 'FULL';

/** The qualitative yield band (IDLE when nothing is held / EARNING when the passive yield accrues; NEVER the rate). */
export type YieldBand = 'NONE' | 'IDLE' | 'EARNING';

/** The qualitative forfeiture telegraph band (NONE / PENDING / IMMINENT — NEVER the raw scheduled tick; R2.2). */
export type ForfeitureBand = 'NONE' | 'PENDING' | 'IMMINENT';

/**
 * The player-facing money_holding bands for a money_holding Building Card (Phase-5 vector #5a T6; R2.2 — closed-domain
 * labels only). The DIRECT sibling of HubDispatchBands. Assembled into the BuildingOperationalProjection by the
 * building-card projection for a money_holding card; a non-money_holding card surfaces the neutral NONE defaults
 * (NEUTRAL_MONEY_HOLDING_BANDS) without ever reading a money_holding row.
 */
export interface MoneyHoldingBands {
  /** The money_holding_tier lever as a band (NONE / SMALL / MEDIUM / LARGE / MAJOR / MAX — never the raw int; R2.2). */
  money_holding_tier_band: MoneyHoldingTierBand;
  /** The EFFECTIVE held-magnitude band (NONE / LOW / MODERATE / HIGH / MASSIVE — never the raw cents; R2.2). */
  held_band: HeldBand;
  /** The held-vs-capacity fill band (OPEN / BUSY / FULL — never the raw held/cap; R2.2). */
  capacity_band: CapacityBand;
  /** The yield band (IDLE / EARNING — never the raw rate / accrued cents; R2.2). */
  yield_band: YieldBand;
  /** The forfeiture telegraph band (NONE / PENDING / IMMINENT — never the raw scheduled tick; R2.2). */
  forfeiture_band: ForfeitureBand;
}

/**
 * The NEUTRAL money_holding bands for a NON-money_holding building card — all NONE (the SAME neutral convention
 * hub_tier_band / roster_band use for a non-hub card). Surfaced WITHOUT a money_holding read (the bands are meaningful
 * only on a money_holding card). `yield_band` is NONE (not IDLE) on a non-money_holding: there is no holding to be idle.
 */
export const NEUTRAL_MONEY_HOLDING_BANDS: MoneyHoldingBands = {
  money_holding_tier_band: 'NONE',
  held_band: 'NONE',
  capacity_band: 'NONE',
  yield_band: 'NONE',
  forfeiture_band: 'NONE',
};

/**
 * The held-magnitude band cut-points (cents of the EFFECTIVE held clean cash). A CLOSED qualitative mapping (R2.2 — the
 * raw cents never escape; the player sees the band). Anchored on the M1 $ scale (the SAME scale the wallet / repair
 * bands use): LOW < $10k (a small stash), MODERATE $10k–$100k (a meaningful hold), HIGH $100k–$1M (a serious vault),
 * MASSIVE ≥ $1M (a concentration that the audit-forfeiture eyes — the prod forfeiture threshold is $20M, well into the
 * MASSIVE band). NONE = an empty holding (held == 0). Presentation-only (NOT a balance tunable — they bucket the
 * already-derived effective held). Expressed in cents (the held_cents domain).
 */
const HELD_BAND_LOW_FLOOR_CENTS = 0n; // > 0 (any held) is at least LOW; the NONE case is held == 0 (handled first).
const HELD_BAND_MODERATE_FLOOR_CENTS = 10_000n * 100n; // $10k.
const HELD_BAND_HIGH_FLOOR_CENTS = 100_000n * 100n; // $100k.
const HELD_BAND_MASSIVE_FLOOR_CENTS = 1_000_000n * 100n; // $1M.

/**
 * The forfeiture IMMINENT cut-point (in game-minute ticks of remaining lead = forfeiture_scheduled_at_tick − currentTick).
 * A CLOSED qualitative mapping (R2.2 — the raw scheduled tick / current tick never escape; the player sees the band). A
 * forfeiture is IMMINENT once its deadline is within THIS many ticks of now (or already at/past it — a non-positive
 * remaining), else PENDING (the deadline is comfortably ahead — the player still has room to react). Presentation-only
 * (NOT a balance tunable — the actual telegraph WINDOW is money_holding.forfeiture_warning_ticks in gdd/14; this is just
 * how the card SPLITS that window into "react now" vs "noted"). Chosen small (≤ the test-shrunk warning window of 4) so
 * the PENDING→IMMINENT transition is observable as the deadline approaches.
 */
const FORFEITURE_IMMINENT_REMAINING_TICKS = 2;

@Injectable()
export class MoneyHoldingProjectionService {
  constructor(private readonly repo: MoneyHoldingRepository) {}

  /**
   * Project a player-owned money_holding's bands for its Building Card (Phase-5 vector #5a T6; R2.2 — qualitative bands
   * only). Reads the money_holding row (held_cents / money_holding_tier / last_yield_tick / forfeiture_scheduled_at_tick)
   * + the player's current tick, then PERSISTS the lazy-accrued yield (TD-036 lot-5 settle-at-read: spec §4-T4 says "at
   * read/deposit/withdraw, accrued = … credited to held_cents"). The settle is delegated to
   * {@link MoneyHoldingRepository.settleYieldForProjection} which wraps the SAME private settleYield the
   * deposit/withdraw paths use — REUSE of the shared single source of accrual truth, not a second formula. Idempotency-
   * safe: when the clock has not advanced past last_yield_tick the accrued is 0n → the UPDATE is a no-op. The bands are
   * then computed from the POST-SETTLE effective held (= min(held + accrued, capacity) — the capped realized value, the
   * SAME figure the deposit WOULD realize on the next mutation). Returns the neutral NONE bands when the money_holding
   * row is absent (the defensive case — the caller only invokes this for a money_holding card, and a money_holding
   * always has its 1-1 row).
   *
   * Called by RealEstateProjectionService.projectBuilding for a money_holding building card (a non-money_holding card
   * surfaces NEUTRAL_MONEY_HOLDING_BANDS at the assembly site WITHOUT this read — no needless round-trip).
   */
  async moneyHoldingBands(playerId: string, buildingId: string): Promise<MoneyHoldingBands> {
    const row = await this.repo.getProjectionRow(playerId, buildingId);
    if (!row) return NEUTRAL_MONEY_HOLDING_BANDS; // defensive — a money_holding always has its 1-1 row (T1).

    const currentTick = await this.repo.getCurrentTick(playerId);
    const capacityCents = capacityCentsForTier(row.money_holding_tier); // gdd/14 registry (REUSE; R2.3).

    // TD-036 (lot-5): PERSIST the lazy-accrued yield at the projection-read realization point (spec §4-T4: "at
    // read/deposit/withdraw"). The settle is atomic (its own short tx, FOR UPDATE row-lock) and idempotency-safe
    // (elapsed == 0 when last_yield_tick == currentTick → accrued == 0n → no-op UPDATE). REUSES settleYield via the
    // repository's public settleYieldForProjection — the SAME pure accruedYieldCents, no formula duplication.
    await this.repo.settleYieldForProjection(playerId, buildingId, capacityCents, currentTick);

    // The EFFECTIVE held for bands = min(held + accrued, capacity) — the post-settle clamped value, computed here in
    // parallel with the now-persisted value (same pure accruedYieldCents, deterministic). The raw cents are the band
    // INPUT only (R2.2 — the bands are the only surface, never raw cents).
    const accrued = accruedYieldCents(row.held_cents, row.last_yield_tick, currentTick);
    const settled = row.held_cents + accrued;
    const effectiveHeld = settled > capacityCents ? capacityCents : settled;

    return {
      money_holding_tier_band: this.tierBand(row.money_holding_tier),
      held_band: this.heldBand(effectiveHeld),
      capacity_band: this.capacityBand(effectiveHeld, capacityCents),
      yield_band: this.yieldBand(effectiveHeld),
      forfeiture_band: this.forfeitureBand(row.forfeiture_scheduled_at_tick, currentTick),
    };
  }

  /**
   * Map a money_holding's raw money_holding_tier int → the qualitative tier band (R2.2 — the raw int NEVER escapes). The
   * BYTE-MIRROR of hubTierBand / labTierBand: 1 → SMALL, 2 → MEDIUM, 3 → LARGE, 4 → MAJOR, ≥5 → MAX (the cap at
   * money_holding.max_tier 5 — a higher tier ⇒ a larger deposit capacity, the capacityCentsForTier lever). NONE is
   * reserved for a non-money_holding card (assigned at the assembly site via NEUTRAL_MONEY_HOLDING_BANDS, never here —
   * this method only buckets a real money_holding's tier). Presentation-only (NOT a balance tunable — it buckets the
   * already-persisted money_holding_tier).
   */
  private tierBand(tier: number): MoneyHoldingTierBand {
    if (tier >= 5) return 'MAX';
    if (tier === 4) return 'MAJOR';
    if (tier === 3) return 'LARGE';
    if (tier === 2) return 'MEDIUM';
    return 'SMALL'; // tier 1 (the build default) and any defensive lower value.
  }

  /**
   * Map the EFFECTIVE held cents → the qualitative held-magnitude band (R2.2 — the raw cents NEVER escape). held == 0 →
   * NONE (an empty holding); else bucketed by the M1 $ anchors above (LOW / MODERATE / HIGH / MASSIVE). A pure BigInt
   * comparison on the effective held (no float). Presentation-only.
   */
  private heldBand(effectiveHeldCents: bigint): HeldBand {
    if (effectiveHeldCents <= HELD_BAND_LOW_FLOOR_CENTS) return 'NONE'; // held == 0 (≤ 0 defensively) → empty holding.
    if (effectiveHeldCents >= HELD_BAND_MASSIVE_FLOOR_CENTS) return 'MASSIVE';
    if (effectiveHeldCents >= HELD_BAND_HIGH_FLOOR_CENTS) return 'HIGH';
    if (effectiveHeldCents >= HELD_BAND_MODERATE_FLOOR_CENTS) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Map the EFFECTIVE held + the tier capacity → the qualitative capacity fill band (R2.2 — the raw held/cap NEVER
   * escape, only the band). The BYTE-MIRROR of the distribution_hub roster_band: OPEN when empty (held == 0); FULL at/over
   * the capacity (held >= cap — a further deposit is refused 409 OVER_CAPACITY, T3); BUSY in between (capacity remains). A
   * pure BigInt comparison. Presentation-only (NOT a balance tunable — like the roster band cut-points).
   */
  private capacityBand(effectiveHeldCents: bigint, capacityCents: bigint): CapacityBand {
    if (effectiveHeldCents <= 0n) return 'OPEN'; // empty holding → dispatch headroom is full.
    if (effectiveHeldCents >= capacityCents) return 'FULL'; // at/over the cap → a further deposit 409s OVER_CAPACITY.
    return 'BUSY';
  }

  /**
   * Map the EFFECTIVE held → the qualitative yield band (R2.2 — the raw rate / accrued cents NEVER escape). A simple
   * boolean-shaped band: IDLE when nothing is held (held == 0 → no yield accrues), EARNING when the holding is non-empty
   * (the passive yield accrues on it each tick, realized on the next mutation). Presentation-only.
   */
  private yieldBand(effectiveHeldCents: bigint): YieldBand {
    return effectiveHeldCents <= 0n ? 'IDLE' : 'EARNING';
  }

  /**
   * Map the forfeiture_scheduled_at_tick + the current tick → the qualitative forfeiture telegraph band (R2.2 — the raw
   * scheduled tick / current tick NEVER escape, only the band). NULL scheduled → NONE (no forfeiture armed). Armed →
   * IMMINENT once the deadline is within FORFEITURE_IMMINENT_REMAINING_TICKS of now (or already at/past it — a
   * non-positive remaining lead), else PENDING (the deadline is comfortably ahead — the player still has room to react).
   * Presentation-only (NOT a balance tunable — the telegraph WINDOW is the gdd/14 forfeiture_warning_ticks; this just
   * splits that window into "react now" vs "noted").
   */
  private forfeitureBand(scheduledAtTick: number | null, currentTick: number): ForfeitureBand {
    if (scheduledAtTick === null) return 'NONE'; // no forfeiture armed.
    const remaining = scheduledAtTick - currentTick;
    return remaining <= FORFEITURE_IMMINENT_REMAINING_TICKS ? 'IMMINENT' : 'PENDING';
  }
}
