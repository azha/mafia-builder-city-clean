-- Migration: 0093_combat_event_created_at_minute
-- 04b-B closeout — ADD created_at_minute to combat_event for stable insertion-order sort.
--
-- Problem: combat_event.id is uuid v4 (random) — ordering by id is NOT insertion-order-stable.
-- Solution: add created_at_minute bigint NOT NULL DEFAULT 0. Set by all INSERT callers.
-- P6: the column carries game-minute (not wall-clock). Server-only; never forwarded.
-- Zero-regression: ADDITIVE. Existing rows default to 0 (epoch equivalent).
-- R9.3: ch09 backport in schema_conflict_combat.md same-commit.
-- GRANT: table-level grant from 0086 already covers new columns — no GRANT needed here.

ALTER TABLE "combat_event"
  ADD COLUMN IF NOT EXISTS "created_at_minute" bigint NOT NULL DEFAULT 0;
