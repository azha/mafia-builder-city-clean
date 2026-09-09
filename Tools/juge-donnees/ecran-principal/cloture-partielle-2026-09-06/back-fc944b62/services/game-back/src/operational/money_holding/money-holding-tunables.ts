// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — money_holding (clean-cash
//             holding) (Phase-5 vector #5a T0) — the `money_holding.max_tier` + `money_holding.upgrade_cost_ratio.<targetTier>`
//             + `money_holding.capacity_cents_tier_{1..5}` registry keys (NEW Phase-5 vector #5a T0) +
//             docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4/§7 (money_holding tier + upgrade
//             action + deposit/withdraw capacity, R2.3) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention — ratio × the STANDARD-
//             cover reference conversion cost, the SAME convention real_estate.acquisition_cost_ratio /
//             operational.repair.cost_ratio / specialized_lab.upgrade_cost_ratio / distribution.hub_upgrade_cost_ratio
//             REUSE)
//             -- session:2026-06-07 (Phase 5 vector #5a — money_holding — Task 2) --
//
// Money-holding TIER tunables (Phase-5 vector #5a — clean-cash holding vault) — the `money_holding.*` keys THIS slice's
// MoneyHoldingService CONSUMES: the TIER CAP (`max_tier` — the upgrade-money-holding-tier action refuses once
// money_holding_tier reaches it) + the per-target-tier UPGRADE COST RATIO (the cash cost of raising a money_holding's
// money_holding_tier by one, as a ratio of the M1 conversion-cost reference, T2) + the per-tier DEPOSIT CAPACITY
// (`capacity_cents_tier_{1..5}` — the cap on held_cents the deposit guard enforces, T3). T2 = a player
// UPGRADE-MONEY-HOLDING-TIER action raises a MONEY_HOLDING's money_holding_tier by one (cash debit, capped): debit
// economy_states atomically guarded `WHERE cash >= cost` → money_holding_tier++. T3 = the DEPOSIT / WITHDRAW actions
// move clean cash between the wallet (economy_states.cash_cents) and the holding (money_holding.held_cents), atomic +
// guarded; the deposit refuses (409 OVER_CAPACITY) when held_cents + amount would exceed capacityCentsForTier(tier).
// The yield rate / forfeiture knobs are NOT resolved here yet (T4/T5b own them). This is the BYTE-MIRROR of hub-tunables
// (the distribution_hub hub-tier upgrade, Phase-4 vector #4 T2).
//
// THE COST IS KEYED BY THE TARGET TIER (the tier the upgrade MOVES TO): upgrading money_holding_tier 1→2 costs
// `money_holding.upgrade_cost_ratio.2`; 2→3 costs `.3`; 3→4 costs `.4`; 4→5 costs `.5` (a strictly-increasing curve —
// gdd/14: .2=1.0 → $15000, .3=2.0 → $30000, .4=3.5 → $52500, .5=5.0 → $75000, the SAME curve as distribution.hub_*).
// There is no `.1` (tier 1 is the build default, never "upgraded to"). The cap is `max_tier` (5) — at money_holding_tier
// == max_tier the action 409s (nothing left to upgrade to, no cost). R2.3: the raw cents stay internal — the player
// surface is the qualitative money_holding_tier band on the projection (R2.2 — the band lands in T6).
//
// THE YIELD RATE (T4 — lazy-accrual): `money_holding.yield_rate_per_tick` (gdd/14 — default 0.00001/tick ≈ +1.44%/game-day)
// is the light passive rate held clean cash earns, accrued LAZILY (no tick) — realized into held_cents on the next
// mutation (deposit/withdraw/seizure) by MoneyHoldingService.settleYield. accrued_cents =
// floor(held_cents × rate × max(0, currentTick − last_yield_tick)). To keep the accrual a DETERMINISTIC integer-cents
// value with NO floating drift on the bigint held_cents, the float rate is decomposed (from its DECIMAL STRING form, NOT
// a float multiply) into an exact integer fraction numerator/denominator (0.00001 → 1/100000), so the accrual is pure
// BigInt math: (held × numerator × elapsed) / denominator, where the trailing integer division floors (both operands
// non-negative). R2.2: the rate is NEVER surfaced raw — the player sees only the qualitative yield_band (T6).
//
// R2.3 (NO inline numeric balance/config): the consumed registry keys are referenced from gdd/14 §Operational chain —
// money_holding (Phase-5 vector #5a T0 — cited per key, with the upstream design-spec source). They are surfaced as
// env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth. If the registry values
// change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code). All values are `[PROV-Y26Q2]`
// (provisional, calibrate downstream).

import { groundedConversionCostCents } from '../real_estate/conversion-tunables';
import { TunablesStore } from '../../config/tunables-store';

/** An exact non-negative rational as integer numerator/denominator (so a small fractional rate is pure BigInt math). */
export interface RateFraction {
  numerator: bigint;
  denominator: bigint;
}

/**
 * Decompose a NON-NEGATIVE DECIMAL STRING (e.g. "0.00001", "0.0144", "5", "1e-5") into an EXACT integer fraction
 * numerator/denominator — WITHOUT a float multiply (so a small rate like 0.00001 never loses precision). "0.00001" →
 * { numerator: 1n, denominator: 100000n }; "5" → { 5n, 1n }; "0.25" → { 25n, 100n }. The denominator is a power of ten =
 * 10^(decimal places); the numerator is the digits with the point removed. Scientific notation (1e-5) is normalized via
 * Number first (rare — the registry uses plain decimals; this is a defensive parse of an env override). A non-finite /
 * negative / unparseable value throws (a loud config gap, never a silent wrong rate). The fraction is used as
 * accrued = (held × numerator × elapsed) / denominator with the trailing BigInt division flooring (all operands ≥ 0).
 */
export function decimalStringToFraction(raw: string): RateFraction {
  const s = raw.trim();
  // Plain (non-exponent) decimal — the registry form. Parse the string DIRECTLY (no float) so we keep every digit.
  const plain = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (plain) {
    const intPart = plain[1];
    const fracPart = plain[2] ?? '';
    // numerator = the digits with the decimal point removed; denominator = 10^(number of fractional digits).
    const numerator = BigInt(intPart + fracPart);
    const denominator = 10n ** BigInt(fracPart.length);
    return { numerator, denominator };
  }
  // Defensive fallback for an exponent form (e.g. an env override "1e-5"): normalize via Number, then re-decompose its
  // fixed-point expansion. The registry value is always plain decimal, so this path is env-only.
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`money_holding.yield_rate_per_tick must be a non-negative decimal, got ${JSON.stringify(raw)}.`);
  }
  // toFixed(20) gives a fixed-point expansion; strip trailing zeros, then recurse through the plain-decimal branch.
  const fixed = n.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
  return decimalStringToFraction(fixed);
}


/**
 * PURE lazy-accrual: the yield (in cents) a money_holding has accrued on its current `heldCents` between `lastYieldTick`
 * and `currentTick`, at money_holding.yield_rate_per_tick (decomposed into an exact integer fraction; R2.3, no inline
 * rate). accrued = floor(heldCents × rate × max(0, currentTick − lastYieldTick)). DETERMINISTIC and FLOAT-FREE: the rate
 * is an integer numerator/denominator (e.g. 0.00001 → 1/100000), so the whole computation is BigInt arithmetic —
 * `(heldCents × numerator × elapsed) / denominator` — where the trailing BigInt division floors (every operand is ≥ 0).
 * Guarded ≥ 0: a zero/negative elapsed (currentTick ≤ lastYieldTick, e.g. a clock that has not moved) or a zero held →
 * 0n; the result is never negative (held never shrinks from accrual). No RNG. Same inputs → same output, always.
 *
 * LIVES HERE (money-holding-tunables.ts), not on the service: it has ZERO deps beyond `moneyHoldingTunables`, and BOTH
 * the service (MoneyHoldingService.accruedYieldCents delegate) AND the repository (the in-tx settle step) AND the audit
 * tick (the live-threshold read-only accrual, T5b) need it — relocating the pure math here breaks the benign repo↔service
 * import cycle (the T4-review fast-follow) and gives a SINGLE code-owned source of accrual truth.
 */
export function accruedYieldCents(heldCents: bigint, lastYieldTick: number, currentTick: number): bigint {
  const elapsed = currentTick - lastYieldTick;
  if (heldCents <= 0n || elapsed <= 0) return 0n; // nothing held, or the clock has not advanced past the anchor → no yield.
  const { numerator, denominator } = moneyHoldingTunables.yieldRatePerTick;
  // BigInt math only — multiply first (held × numerator × elapsed), then a single flooring integer division by the
  // denominator. No float ever touches the bigint cents, so the accrual is an exact, drift-free integer of cents.
  return (heldCents * numerator * BigInt(elapsed)) / denominator;
}

/**
 * Resolved money-holding tier tunables. All keys are gdd/14 §Operational chain — money_holding (Phase-5 vector #5a T0;
 * the cap → the at-cap 409; the per-target-tier ratio → the guarded debit amount). R2.3 — NOT inline. The cost ratios
 * are keyed by the TARGET tier (the tier the upgrade moves TO): index 2 = the 1→2 cost, …, index 5 = the 4→5 cost.
 * DB-override > env > default (Phase-23).
 */
export const moneyHoldingTunables = {
  /**
   * money_holding.max_tier — the money_holding_tier cap. Default 5. Range 1..5. Env override: MONEY_HOLDING_MAX_TIER
   * (test-only). At money_holding_tier == this, the upgrade-money-holding-tier action refuses (409).
   * Consumed by MoneyHoldingService.upgradeMoneyHoldingTier() (the at-cap guard). (DB-override > env > default — Phase-23).
   */
  get maxTier(): number {
    return TunablesStore.resolveInt('money_holding.max_tier', 'MONEY_HOLDING_MAX_TIER', 5);
  },
  /**
   * money_holding.upgrade_cost_ratio.<targetTier> — the upgrade cost ratio keyed by the target tier. .2 = the 1→2 cost
   * ratio (default 1.0 → $15000), .3 = the 2→3 cost ratio (default 2.0 → $30000), .4 = the 3→4 (default 3.5 → $52500),
   * .5 = the 4→5 (default 5.0 → $75000). Env overrides: MONEY_HOLDING_UPGRADE_COST_RATIO_{2,3,4,5} (test-only). Consumed
   * by moneyHoldingUpgradeCostCents() (the guarded debit amount). (DB-override > env > default — Phase-23).
   */
  upgradeCostRatioByTargetTier: {
    get 2(): number { return TunablesStore.resolveFloat('money_holding.upgrade_cost_ratio.2', 'MONEY_HOLDING_UPGRADE_COST_RATIO_2', 1.0); },
    get 3(): number { return TunablesStore.resolveFloat('money_holding.upgrade_cost_ratio.3', 'MONEY_HOLDING_UPGRADE_COST_RATIO_3', 2.0); },
    get 4(): number { return TunablesStore.resolveFloat('money_holding.upgrade_cost_ratio.4', 'MONEY_HOLDING_UPGRADE_COST_RATIO_4', 3.5); },
    get 5(): number { return TunablesStore.resolveFloat('money_holding.upgrade_cost_ratio.5', 'MONEY_HOLDING_UPGRADE_COST_RATIO_5', 5.0); },
  } as Record<number, number>,
  /**
   * money_holding.capacity_cents_tier_{1..5} — the DEPOSIT CAPACITY (cap on held_cents, in cents) keyed by the CURRENT
   * money_holding_tier (NOT a target — the deposit guard reads the building's live tier). Default very_high, rising
   * $1M (tier 1) → $50M (tier 5). Env overrides: MONEY_HOLDING_CAPACITY_CENTS_TIER_{1,2,3,4,5} (test-only — lets the E2E
   * reach OVER_CAPACITY cheaply). Consumed by capacityCentsForTier() (the deposit OVER_CAPACITY guard, T3). Resolved as
   * `number` — every default ($50M = 5e9 cents) is well within Number.MAX_SAFE_INTEGER (2^53), and capacityCentsForTier
   * converts to bigint for the SQL guard. (DB-override > env > default — Phase-23).
   */
  capacityCentsByTier: {
    get 1(): number { return TunablesStore.resolveInt('money_holding.capacity_cents_tier_1', 'MONEY_HOLDING_CAPACITY_CENTS_TIER_1', 100000000); },
    get 2(): number { return TunablesStore.resolveInt('money_holding.capacity_cents_tier_2', 'MONEY_HOLDING_CAPACITY_CENTS_TIER_2', 500000000); },
    get 3(): number { return TunablesStore.resolveInt('money_holding.capacity_cents_tier_3', 'MONEY_HOLDING_CAPACITY_CENTS_TIER_3', 1200000000); },
    get 4(): number { return TunablesStore.resolveInt('money_holding.capacity_cents_tier_4', 'MONEY_HOLDING_CAPACITY_CENTS_TIER_4', 2500000000); },
    get 5(): number { return TunablesStore.resolveInt('money_holding.capacity_cents_tier_5', 'MONEY_HOLDING_CAPACITY_CENTS_TIER_5', 5000000000); },
  } as Record<number, number>,
  /**
   * money_holding.yield_rate_per_tick — the light passive yield the held clean cash earns per tick, accrued LAZILY (T4 —
   * realized into held_cents on the next mutation, no tick). Default 0.00001/tick (≈ +1.44%/game-day). Range 0..0.001.
   * Env override: MONEY_HOLDING_YIELD_RATE_PER_TICK (test-only). DECOMPOSED into an EXACT integer fraction
   * (numerator/denominator) from the decimal STRING via resolveString (no float multiply), so accruedYieldCents is pure
   * BigInt math — a deterministic integer with NO floating drift on the bigint cents.
   * Consumed by MoneyHoldingService.accruedYieldCents(). (DB-override > env > default — Phase-23).
   */
  get yieldRatePerTick(): RateFraction {
    // defensive: a malformed DB override must degrade to the gdd/14 default, never throw in the hot path (review #2).
    try { return decimalStringToFraction(TunablesStore.resolveString('money_holding.yield_rate_per_tick', 'MONEY_HOLDING_YIELD_RATE_PER_TICK', '0.00001')); }
    catch { return decimalStringToFraction('0.00001'); }
  },
  /**
   * money_holding.raid_seize_pct — the fraction of held_cents the heat-driven STREET RAID seizes (T5a). Default 0.4
   * (a MODERATE band, strictly < the forfeiture_seize_pct 0.5). Range 0..1. Env override: MONEY_HOLDING_RAID_SEIZE_PCT
   * (test-only). DECOMPOSED into an EXACT integer fraction from the decimal STRING via resolveString (no float multiply),
   * so the seize is pure BigInt math — drift-free on the bigint held_cents.
   * Consumed by MoneyHoldingRepository.executeMoneyHoldingRaid. (DB-override > env > default — Phase-23).
   */
  get raidSeizePct(): RateFraction {
    // defensive: a malformed DB override must degrade to the gdd/14 default, never throw in the hot path (review #2).
    try { return decimalStringToFraction(TunablesStore.resolveString('money_holding.raid_seize_pct', 'MONEY_HOLDING_RAID_SEIZE_PCT', '0.4')); }
    catch { return decimalStringToFraction('0.4'); }
  },
  /**
   * money_holding.forfeiture_threshold_cents — the hold VALUE (cents) at/above which the value-driven audit-forfeiture
   * is scheduled (T5b). Default $20M (2e9 cents). Range 100000000..50000000000. Env override:
   * MONEY_HOLDING_FORFEITURE_THRESHOLD_CENTS (test-only). Resolved as `number`; the audit tick converts to bigint for
   * the SQL. Consumed by MoneyHoldingAuditService (the schedule/cancel decision). (DB-override > env > default — Phase-23).
   */
  get forfeitureThresholdCents(): number {
    return TunablesStore.resolveInt('money_holding.forfeiture_threshold_cents', 'MONEY_HOLDING_FORFEITURE_THRESHOLD_CENTS', 2000000000);
  },
  /**
   * money_holding.forfeiture_warning_ticks — the telegraph window (game-minute ticks) between SCHEDULE and EXECUTE.
   * Default 1440 (1 game-day). Range 60..43200. Env override: MONEY_HOLDING_FORFEITURE_WARNING_TICKS (test-only).
   * Consumed by MoneyHoldingAuditService (the schedule arming). (DB-override > env > default — Phase-23).
   */
  get forfeitureWarningTicks(): number {
    return TunablesStore.resolveInt('money_holding.forfeiture_warning_ticks', 'MONEY_HOLDING_FORFEITURE_WARNING_TICKS', 1440);
  },
  /**
   * money_holding.forfeiture_seize_pct — the fraction of held_cents the audit-forfeiture seizes at EXECUTE (the LEGAL
   * bite, NO structural damage). Default 0.5 (a BIGGER bite than raid_seize_pct 0.4 — design invariant
   * forfeiture_seize_pct > raid_seize_pct). Range 0..1. Env override: MONEY_HOLDING_FORFEITURE_SEIZE_PCT (test-only).
   * DECOMPOSED into an EXACT integer fraction from the decimal STRING via resolveString (no float multiply), so the seize
   * is pure BigInt math — drift-free on the bigint held_cents.
   * Consumed by MoneyHoldingRepository.executeForfeiture. (DB-override > env > default — Phase-23).
   */
  get forfeitureSeizePct(): RateFraction {
    // defensive: a malformed DB override must degrade to the gdd/14 default, never throw in the hot path (review #2).
    try { return decimalStringToFraction(TunablesStore.resolveString('money_holding.forfeiture_seize_pct', 'MONEY_HOLDING_FORFEITURE_SEIZE_PCT', '0.5')); }
    catch { return decimalStringToFraction('0.5'); }
  },
};

/**
 * The grounded UPGRADE-MONEY-HOLDING-TIER DEBIT amount in CENTS for moving a money_holding's money_holding_tier UP to
 * `targetTier` (the wallet-affecting step of the upgrade action). M1 grounding (the SAME money convention as
 * repairCostCents / upgradeCostCents / hubUpgradeCostCents / real_estate.acquisitionPriceCents): cost =
 * money_holding.upgrade_cost_ratio.<targetTier> × the STANDARD-cover REFERENCE conversion cost. The reference is the
 * BASE STANDARD-cover cost with NO per-type multiplier — we pass 'stash' (multiplier 1.0) so the reference =
 * conversion.base_cost_standard_min ($15000), exactly as gdd/14 documents (`ratio × conversion.base_cost_standard_min`).
 * (Passing 'money_holding' would still be ×1.0 — no per-type multiplier — but we mirror the specialized_lab / repair /
 * distribution_hub convention of forcing 'stash' so the reference is unambiguously the multiplier-free base.) cost_cents
 * = round(ratio × reference_cents). DETERMINISTIC (the reference cost × a fixed ratio, no RNG). Returns a bigint (cents)
 * for the economy_states.cash_cents bigint column. R2.3 — the only values are the gdd/14 ratio + the REUSED conversion
 * reference (no inline literal).
 *
 * `targetTier` MUST be a key of upgradeCostRatioByTargetTier (2..5 at the shipped max_tier 5). The caller (the service)
 * only ever computes this for currentTier+1 after validating currentTier < max_tier, so the target is always a mapped
 * key. If a future max_tier > 5 references an unmapped target, this throws (a loud config gap, never a silent 0).
 */
export function moneyHoldingUpgradeCostCents(targetTier: number): bigint {
  const ratio = moneyHoldingTunables.upgradeCostRatioByTargetTier[targetTier];
  if (ratio === undefined) {
    throw new Error(
      `No money_holding.upgrade_cost_ratio for target tier ${targetTier} (gdd/14 §Operational chain — money_holding ` +
        `(Phase-5 vector #5a T0) only defines .2..5 at max_tier 5 — a higher max_tier needs the matching ratio key added).`,
    );
  }
  // 'stash' carries NO per-type cost multiplier (only LAB/REFINERY do), so groundedConversionCostCents('stash',
  // 'standard') = conversion.base_cost_standard_min × 1.0 × 100 = the exact $15000 STANDARD-cover reference gdd/14 names
  // for the upgrade-cost ratio — the SAME reference repairCostCents() / upgradeCostCents() / hubUpgradeCostCents() use.
  const referenceCostCents = groundedConversionCostCents('stash', 'standard');
  const priceCents = Math.round(ratio * Number(referenceCostCents));
  return BigInt(priceCents);
}

/**
 * The exact STREET-RAID cash seizure on a money_holding's `heldCents` (T5a) — the deterministic, FLOAT-FREE split of the
 * pre-raid held into { seizedCents, survivorCents } at money_holding.raid_seize_pct. The pct is an exact integer
 * fraction (numerator/denominator — e.g. 0.4 → 2/5), so the seize is pure BigInt math with NO float ever touching the
 * bigint held_cents:
 *   seized   = floor(held × numerator / denominator)   (the band the raid takes)
 *   survivor = held − seized                            (what remains in the hold)
 * Computing survivor as `held − seized` (rather than rounding `held × (1 − pct)` independently) guarantees
 * `seized + survivor === held` EXACTLY — no double-rounding drift, the holding is conserved to the cent. A zero/negative
 * held → both 0n (guarded). DETERMINISTIC (a fixed function of held + the tunable, no RNG). Used by
 * MoneyHoldingRepository.executeMoneyHoldingRaid: survivor is the new held_cents, seized feeds the building_raid /
 * logging. R2.3 — the pct is the gdd/14 tunable (not inline).
 */
export function moneyHoldingRaidSeizeCents(heldCents: bigint): { seizedCents: bigint; survivorCents: bigint } {
  if (heldCents <= 0n) return { seizedCents: 0n, survivorCents: 0n };
  const { numerator, denominator } = moneyHoldingTunables.raidSeizePct;
  const seizedCents = (heldCents * numerator) / denominator; // BigInt division floors (all operands ≥ 0).
  return { seizedCents, survivorCents: heldCents - seizedCents };
}

/**
 * The exact AUDIT-FORFEITURE cash seizure on a money_holding's `heldCents` (T5b) — the BIGGER LEGAL BITE, the byte-mirror
 * of moneyHoldingRaidSeizeCents but reading money_holding.forfeiture_seize_pct (0.5 → 1/2) instead of raid_seize_pct (0.4
 * → 2/5). The pct is an exact integer fraction, so the seize is pure BigInt math with NO float ever touching the bigint
 * held_cents:
 *   seized   = floor(held × numerator / denominator)   (the legal bite — bigger than the street-raid band)
 *   survivor = held − seized                            (what remains in the hold)
 * Computing survivor as `held − seized` (not rounding `held × (1 − pct)` independently) guarantees
 * `seized + survivor === held` EXACTLY — no double-rounding drift, the holding is conserved to the cent. A zero/negative
 * held → both 0n (guarded). DETERMINISTIC (a fixed function of held + the tunable, NO RNG). Used by
 * MoneyHoldingRepository.executeForfeiture: survivor is the new held_cents, seized feeds the logging. R2.3 — the pct is
 * the gdd/14 tunable (not inline). DISTINCT from the street raid: NO structural_state change, NO building_raid row.
 */
export function moneyHoldingForfeitureSeizeCents(heldCents: bigint): { seizedCents: bigint; survivorCents: bigint } {
  if (heldCents <= 0n) return { seizedCents: 0n, survivorCents: 0n };
  const { numerator, denominator } = moneyHoldingTunables.forfeitureSeizePct;
  const seizedCents = (heldCents * numerator) / denominator; // BigInt division floors (all operands ≥ 0).
  return { seizedCents, survivorCents: heldCents - seizedCents };
}

/**
 * The DEPOSIT CAPACITY in CENTS for a money_holding at money_holding_tier `tier` (the cap on held_cents the deposit
 * guard enforces, T3): the deposit refuses (409 OVER_CAPACITY) when `held_cents + amount > capacityCentsForTier(tier)`.
 * Reads `money_holding.capacity_cents_tier_<tier>` (gdd/14 §Operational chain — money_holding — REUSE, env-overridable
 * MONEY_HOLDING_CAPACITY_CENTS_TIER_<tier>; R2.3 — NOT inline). Returns a bigint (cents) so it composes with the
 * held_cents bigint column in the SQL guard with NO type loss. DETERMINISTIC (a registry lookup, no RNG).
 *
 * `tier` MUST be a key of capacityCentsByTier (1..5 at the shipped max_tier 5). A money_holding's money_holding_tier is
 * DB-constrained to [1,5] (CHECK mh_tier_chk), so every live tier maps. If a future tier references an unmapped key,
 * this throws (a loud config gap, never a silent 0 capacity that would brick deposits).
 */
export function capacityCentsForTier(tier: number): bigint {
  const capacityCents = moneyHoldingTunables.capacityCentsByTier[tier];
  if (capacityCents === undefined) {
    throw new Error(
      `No money_holding.capacity_cents_tier_${tier} (gdd/14 §Operational chain — money_holding (Phase-5 vector #5a T0) ` +
        `only defines tiers 1..5 at max_tier 5 — a higher max_tier needs the matching capacity key added).`,
    );
  }
  return BigInt(capacityCents);
}
