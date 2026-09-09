-- migration 0107: ALTER buildings ADD audit_pin_activated_at (04e-A1 C6 — ★ Substrate 1: audit-pin half-life)
-- Plan: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C6
-- Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §4.1 (audit-pin half-life)
-- R9.3: backported to docs/tech/09_data_model/schema_city_state.md §4.5 (same-commit).
-- Zero-regression: ADDITIVE only. No existing column/table modified. NULL default — every pre-C6 row
-- (and every non-pinned building) reads NULL, identical to "never pinned" today.
--
-- WHY: the C6 half-life decay model (unconformity-tunables.ts pinHalfLifeDays, overlay-aware) recomputes
-- a building's audit_pin_expires_at EVERY nightly tick from ITS OWN activation timestamp, so a half-life
-- modifier applied mid-life genuinely shrinks/restores an ALREADY-active pin (not just a freshly-activated
-- one). That activation timestamp must be PERSISTED (not in-memory-only) so the recompute survives a
-- process restart — the same "persisted projection is authoritative" discipline audit_pin_expires_at
-- itself already follows (system_7_unconformity_ledgers.md Inv 4).

--> statement-breakpoint

ALTER TABLE "buildings"
  ADD COLUMN IF NOT EXISTS "audit_pin_activated_at" timestamptz;

--> statement-breakpoint

-- No GRANT needed: buildings already has GRANT SELECT/INSERT/UPDATE/DELETE TO app_rw (migration 0005).
-- No new index: audit_pin_activated_at is read only via the SAME per-building row already fetched by
-- UnconformityLedgerRepository.listPromoted (point reads keyed off building_id, never swept alone).
