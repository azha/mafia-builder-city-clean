-- Migration: 0092_assault_cascade_dedup
-- 04b-B C-cas — NEW: assault_cascade_dedup (§9.1 idempotency dedup table)
--
-- assault_cascade_dedup: one row per processed assault_event_id.
--   Inserted as the FIRST write inside the SERIALIZABLE tx.
--   If a row already exists for an assault_event_id → the cascade tx detects it and exits
--   as a no-op (idempotent re-run safe, the §9.1 "DEDUP first" contract).
--
--   assault_event_id      varchar(64) PRIMARY KEY — the unique assault event identifier.
--   processed_at_minute   bigint NOT NULL — in-game minute of first processing (game-time, NOT Date.now()).
--
-- Soft-ref discipline: no FK to combat_event (assault events are ephemeral identifiers — the
--   dedup table is the SSOT for processed-ness, not a replica of the event log).
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_combat.md same-commit.
-- Anti-fabrication: no Math.random().
-- Zero-regression: ADDITIVE only — no existing table touched.

CREATE TABLE IF NOT EXISTS "assault_cascade_dedup" (
  "assault_event_id"    varchar(64)   NOT NULL,
  "processed_at_minute" bigint        NOT NULL,
  PRIMARY KEY ("assault_event_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "assault_cascade_dedup" TO app_rw;
