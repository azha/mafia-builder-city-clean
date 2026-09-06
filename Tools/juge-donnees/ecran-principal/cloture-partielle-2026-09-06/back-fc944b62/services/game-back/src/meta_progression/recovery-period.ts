// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 ("realization §10.3
//             ... recovery == base + floor(debt/10)×scaling, debt reset 0 (#20)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §10.3
//             ("`recovery_period_remaining = base + floor(debt / 10) × scaling` (canon formula verbatim,
//             `recall_debt.md §Transform 4`)").
//             Pattern: `mastery-bucket.ts`/`recall-debt-signal.ts` (pure, registry-free — getters resolved
//             at the call site, R2.3).
//             — P3-F C8 — 2026-07-19
//
// `recoveryPeriodRemainingSessions` — the canon `recall_debt.md §Transform 4` formula, verbatim:
// `base + floor(debt / 10) × scaling`. `recovery_period_remaining` is a `smallint` column (mig 0135) —
// `scaling` is registered as a FLOAT tunable (`meta.recovery_period_scaling_per_debt`, 0.5..2), so the
// product can be fractional; rounded to the nearest whole session (never floored/ceiled — the falsifiable
// "debt 20, base 2, scaling 1 -> recovery 4" holds exactly at the default integer-valued scaling; a
// fractional scaling override rounds to the nearest whole session count, the same "nearest" convention
// `realDaysToTicks` uses for its own real->tick rounding).
export function recoveryPeriodRemainingSessions(debt: number, base: number, scalingPerTenDebt: number): number {
  return Math.round(base + Math.floor(debt / 10) * scalingPerTenDebt);
}
