// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C2 (friction engine
//             — per-node accrual formula, verbatim)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §4.2
//             (`friction_load(node) = base_per_node × (1 + age_decay_factor × age_ticks) × (1 +
//             connection_count × per_connection_modifier)`) + §13.1 ("Aucune colonne friction_load
//             stockée : pure function (node, tunables, tick courant)").
//             Decisions: D4 (friction_load/efficiency_penalty_multiplier DÉRIVÉS, jamais stockés — précédent
//             P3-C D4 / 04f-A) ; D20 (age exprimé en JOURS in-game, floor((now-acquired_at_tick)/1440)).
//             Pattern: `sinuosity-stress-bucket.ts` (the PURE, no-DB, getter-backed derivation shape) +
//             `flag-convergence.service.ts#evaluateConvergence` (a pure formula reused BOTH by the real
//             service AND independently by the E2E spec, to prevent formula drift).
//             — P3-E C2 — 2026-07-17
//
// `frictionLoadForNode`/`ageDaysFromAcquiredAtTick` — the design §4.2 accrual formula, verbatim, as a
// PURE function (no DB, no Nest DI). `FrictionBudgetRepository.computeAggregate` calls this ONCE per
// perimeter node (§4.1) to reduce to the `friction_budget_state.friction_budget_total` cache (C2); no
// other copy of this arithmetic exists anywhere (SQL or TS) — reused verbatim wherever a per-node
// friction_load is needed (this chunk's tick; a future C8 BO per-node panel) to avoid formula drift
// (the `evaluateConvergence` precedent this header cites).

/**
 * `age_ticks` in the canon formula, realized in JOURS in-game (D20 — the loop's own tick is its daily
 * N/31, canon "daily-tick"). `gameMinuteNow` is the current clock tick (game-minutes); `acquiredAtTick`
 * is the node's `buildings.acquired_at_tick` anchor (game-minutes, stamped at purchase or lazy-stamped
 * — NEVER null by the time this is called, the N/31 tick's own step 0 guarantees it). `floor` — a
 * node acquired THIS SAME tick (age 0 days) never yields a negative/fractional age.
 */
export function ageDaysFromAcquiredAtTick(gameMinuteNow: number, acquiredAtTick: number): number {
  return Math.floor((gameMinuteNow - acquiredAtTick) / 1440);
}

/**
 * P3-E C5 — the inverse unit conversion `ageDaysFromAcquiredAtTick` already establishes (in-game DAYS →
 * game-minute ticks, the SAME 1440 = 24×60 constant, verbatim — NOT re-derived from
 * `citySimTunables.inGameDayLengthMinutes`, so this stays byte-consistent with the age formula above
 * rather than risking 2 divergent day-length sources for the SAME loop's own tick unit). Used by
 * `replacement_option.expires_at_tick = created_at_tick + gameDaysToTicks(demolitionReplacementOption
 * ExpiryGameDays)` (design §7/★#5 — 7 in-game days default).
 */
export function gameDaysToTicks(gameDays: number): number {
  return gameDays * 1440;
}

/**
 * `friction_load(node) = base_per_node × (1 + age_decay_factor × age_ticks) × (1 + connection_count ×
 * per_connection_modifier)` (design §4.2, verbatim). Every factor is getter-resolved by the CALLER
 * (`coreLoopsTunables.demolitionBaseFrictionPerNode`/`demolitionAgeDecayFactorPerTick`/
 * `demolitionPerConnectionFrictionModifier`) — never inlined here (R2.3).
 */
export function frictionLoadForNode(
  baseFrictionPerNode: number,
  ageDecayFactorPerTick: number,
  ageDays: number,
  connectionCount: number,
  perConnectionFrictionModifier: number,
): number {
  return (
    baseFrictionPerNode *
    (1 + ageDecayFactorPerTick * ageDays) *
    (1 + connectionCount * perConnectionFrictionModifier)
  );
}
