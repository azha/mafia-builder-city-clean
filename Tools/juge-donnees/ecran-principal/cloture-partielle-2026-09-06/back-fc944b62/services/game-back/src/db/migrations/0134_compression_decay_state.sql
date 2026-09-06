-- migration 0134: compression_decay_state (P3-E C6 — Compression Week stress accumulator, ch05 Loop 9)
-- Plan: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md C6 (org_stress accumulator +
--         W/14 quiet-decay + warning/defer state machine)
-- Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.1 (increment formula,
--         gel pendant 'active') + §8.3 (decay "quiet week" W/14) + §9.2 (none->warning + deferral I6).
-- Decisions: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-decisions.md D5/D6 (subscriber
--         session-close, gel 'active') ; schema_player_progression_state.md §"Activation P3-E" DD-E-schema
--         (design §13.3) — ZERO migration/colonne sur "player_progression_state" (the 2 EXISTING CHECKs,
--         mig 0002, suffisent verbatim ; org_stress ceiling 100 = discipline applicative, PAS un CHECK NEW,
--         precedent mastery_score §4.2). The W/14 tick's OWN idempotency watermark therefore needs a home
--         OTHER than that table (mirrors FLAG_WEEKLY_RESET_TICK's `lieutenant_flag_state.last_weekly_
--         reset_epoch` living on ITS OWN domain table, never bolted onto a shared/foundational row) — this
--         migration adds ONE small NEW 1-1 per-player table for exactly that, the SAME "1-1 cache, PK =
--         FK player_id" shape `friction_budget_state` (mig 0132) already establishes for a sibling loop.
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md §14 (NEW table) + same commit.
--
-- ★ idx: next-free after this branch's own mig 0133 (compression_week, C1, same session) — re-verified
-- against `_journal.json` at C6 dispatch (head 132, nothing claims 133 on this base). RENUMBERED at the
-- 04g-D integration (main merge `0d1b1353` brought `0131_template_library` first, shifting this
-- branch's own migrations up by one): 0133→0134 — filename + `_journal.json` idx 134 reconciled
-- MECHANICALLY at integration.
--
-- "compression_decay_state" (design §8.3, C6): the ONE column this table exists for —
--   `last_quiet_decay_week_epoch` — is the exact-once guard `COMPRESSION_QUIET_DECAY_TICK` (WEEKLY/14)
--   needs so a repeat call at the SAME week-epoch is a 0-write (a "subtract N" operation is NOT naturally
--   idempotent under a value-changed guard alone — unlike a boolean flip, decaying twice at the same
--   epoch would silently double the decay without a stored watermark). Mirrors `lieutenant_flag_state.
--   last_weekly_reset_epoch` (mig 0123, P3-B) byte-for-byte: NOT NULL DEFAULT 0, guarded via
--   `WHERE last_quiet_decay_week_epoch < $epoch` in the SAME UPDATE statement that applies the decay
--   (guard-and-claim, un-raceable, D3 precedent). PK = FK `player_id` (1-1 per-player cache, ZERO
--   secondary index needed — the SAME `friction_budget_state`/`player_progression_state` shape).
--
-- ZERO pgEnum NEW (D1, P3-D/P3-E precedent reconduced — this table has no enum-shaped column at all).

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "compression_decay_state" (
  "player_id"                      uuid          NOT NULL PRIMARY KEY REFERENCES "player"("player_id") ON DELETE CASCADE,
  "last_quiet_decay_week_epoch"    integer       NOT NULL DEFAULT 0
);

--> statement-breakpoint

-- Non-negative epoch (mirrors lieutenant_flag_state's own implicit epoch-never-negative convention —
-- Math.floor(game_day / 7) can never yield a negative value for a non-negative game_day).
ALTER TABLE "compression_decay_state"
  ADD CONSTRAINT "compression_decay_state_epoch_chk"
  CHECK ("last_quiet_decay_week_epoch" >= 0);

--> statement-breakpoint

GRANT UPDATE ON "compression_decay_state" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)
