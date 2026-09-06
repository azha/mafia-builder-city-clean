-- migration 0140: isostatic_debt_passive_baseline (P3-G C8 — passive decay tick, ISOSTATIC_DEBT_TICK
-- HOURLY/8)
-- Plan: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C8
-- Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §12.3 (passive decay — elapsed-
--         game-hours x |meta.passive_decay_rate|, set-based over the partial index, floor 0, decay_path
--         PASSIVE/MIXED bookkeeping)
--
-- ★ WHY A NEW COLUMN, NOT A REUSE OF `last_decay_tick` (found by this chunk's own TDD, not a C0/design
-- reserve — routed to ⊥ review, not silently absorbed): the C7 IsostaticDebtService header (`last_decay_
-- tick feeds C8's future elapsed-hours passive-decay derivation, (nowGameMinute - last_decay_tick) / 60`)
-- was written BEFORE mig 0139's #25/★#6 dedup remediation landed. That remediation turned `last_decay_
-- tick` + `last_decay_binding` into an ACTIVE-decay-EXCLUSIVE dedup pair (`CapabilityDebtsRepository#
-- applyActiveDecay`'s own WHERE arm: skip a decrement iff `last_decay_tick IS NOT DISTINCT FROM :tick AND
-- last_decay_binding IS DISTINCT FROM :bindingKind`). Had the passive tick ALSO stamped `last_decay_tick`
-- (even without touching `last_decay_binding`), a genuinely-concurrent active-decay write racing the SAME
-- row at the SAME tick would find `last_decay_tick` already equal to `:tick` (the passive write's own
-- stamp) with a `last_decay_binding` that is NOT the active write's `bindingKind` (NULL or stale) -> the
-- active decay's OWN guard would spuriously SKIP it -- the passive tick would silently swallow an
-- unrelated player's active decrement. This directly contradicts the C8 plan's own Concurrence falsifiable
-- ("tick racing an active-decay event on the SAME row -> BOTH apply, floor holds, final exact") and the
-- explicit dispatch instruction that passive decay "should NOT be deduped against the active bindings".
--
-- THE FIX: `last_passive_tick` -- a column EXCLUSIVE to the passive writer, never read nor written by
-- `applyActiveDecay`/`applyUpgrade`. `capability_debts_active_idx`'s `capacity_debts.applyPassiveDecayBatch`
-- (capability-debts.repository.ts) derives elapsed-game-hours as `(now_tick - COALESCE(last_passive_tick,
-- last_upgrade_tick)) / 60` (R9 — plain ratio, the ambient-clock 60-min/hour structural constant, never a
-- second real-time ratio) -- `last_upgrade_tick` (always non-NULL once a debt row exists, `applyUpgrade`'s
-- own INSERT) is the correct FIRST-window baseline (the debt starts accruing at the moment of the
-- adoption), then re-anchors to `last_passive_tick` on every subsequent passive application. `last_decay_
-- tick`/`last_decay_binding` (the C7 active-decay dedup pair) are left COMPLETELY UNTOUCHED by this
-- writer -- zero interference in either direction, by construction, not by convention.
--
-- Not a CHECK-constrained closed value (unlike `last_decay_binding`) -- `last_passive_tick` is a plain
-- elapsed-hours watermark, the SAME shape as `last_decay_tick`/`last_upgrade_tick` (bigint, NULL until
-- first write).

--> statement-breakpoint

ALTER TABLE "capability_debts"
  ADD COLUMN IF NOT EXISTS "last_passive_tick" bigint;

-- No GRANT needed -- `capability_debts` already carries `GRANT UPDATE TO app_rw` from mig 0137 (a
-- table-level GRANT with no column list covers columns added later, the SAME 0126/0129/0132/0139
-- precedent).
