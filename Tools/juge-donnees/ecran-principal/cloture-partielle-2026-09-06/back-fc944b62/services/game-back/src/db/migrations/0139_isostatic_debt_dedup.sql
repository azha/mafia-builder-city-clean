-- migration 0139: isostatic_debt_dedup (P3-G C7 remediation — #25/★#6 RATIFIED 2026-07-23: user rules
-- DEDUP the compound active-decay to -2 per player action, not -4)
-- Plan: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C7
-- Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §12.2
-- Decisions: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-decisions.md §4 #25 + §6 ★#6
--            (RATIFIED 2026-07-23, user AskUserQuestion: DEDUP -> -2)
--
-- THE GAP THIS FIXES: a REAL ADD_RULE resolve fires BOTH `capability_debts` active-decay bindings from
-- ONE player action — `AddRuleHandler.apply` re-attaches an ALREADY-valid script via `LieutenantService.
-- attachScript` (wasValid=true, the realistic steady state) -> `ScriptAttachedEvent` (kind='bus_event')
-- fires, AND `ExceptionsService.resolve`'s own ADD_RULE resolve-hook sibling (kind='resolve_hook') ALSO
-- fires -- two independent -2 writes onto the SAME row from ONE resolve call, live-verified compound -4
-- (10.00 -> 6.00, C7's own ⊥ Ruling 1, IMPORTANT non-blocking at ship time). ★#6 rules this a double-
-- count of ONE player action ("un resolve ADD_RULE = 1 action joueur = -2 net"), not the design's
-- originally-assumed two-independent-signals reading -- DEDUP to -2.
--
-- THE FIX: `last_decay_binding` -- which decay-binding KIND (`CapabilityDecayBinding.kind`,
-- capability-catalogue.ts: 'bus_event' | 'resolve_hook') stamped THIS row's `last_decay_tick` last.
-- `CapabilityDebtsRepository#applyActiveDecay`'s WHERE guard is symmetric + NULL-safe (`IS [NOT]
-- DISTINCT FROM`, mirrors `applyUpgrade`'s own event-keyed guard idiom, 0137): a write is skipped when
-- `last_decay_tick` already equals THIS tick AND `last_decay_binding` is a DIFFERENT kind -- i.e. the
-- OTHER binding already decremented this exact row at this exact tick, from the SAME compound player
-- action. Race-order-independent (whichever of the two writes lands first on the row claims the tick,
-- the second is a no-op) -- see that method's own header for the full contract, including why the
-- SAME-kind case (two GENUINELY INDEPENDENT `ScriptAttachedEvent`s, the Concurrence falsifiable) is
-- NEVER blocked (-4 legitimately, ★#6 explicitly keeps this case untouched). Single atomic UPDATE
-- statement, no read-then-write (mirrors the C7 floor-guarded single-statement discipline 0137's own
-- header already documents).

--> statement-breakpoint

ALTER TABLE "capability_debts"
  ADD COLUMN IF NOT EXISTS "last_decay_binding" varchar(16);

--> statement-breakpoint

-- Closed value set (D1-lot-wide convention, mirrors `decay_path`/0137's own `capability_debts_decay_
-- path_chk`) -- NULL before any decay has ever fired (mirrors `last_decay_tick`'s own NULL-until-first-
-- decay posture), else exactly the 2 LIVE `CapabilityDecayBinding.kind` values.
ALTER TABLE "capability_debts"
  ADD CONSTRAINT "capability_debts_last_decay_binding_chk"
  CHECK ("last_decay_binding" IS NULL OR "last_decay_binding" IN ('bus_event', 'resolve_hook'));

-- No GRANT needed -- `capability_debts` already carries `GRANT UPDATE TO app_rw` from mig 0137 (a
-- table-level GRANT with no column list covers columns added later, the SAME 0126/0129/0132 precedent).
