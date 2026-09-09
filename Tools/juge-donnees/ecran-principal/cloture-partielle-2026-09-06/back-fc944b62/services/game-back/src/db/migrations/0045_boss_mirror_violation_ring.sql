-- D2 R1: boss_mirror_violation_ring — per-lieutenant private violation ring (§3.1 Boss Mirror).
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       backported in the SAME commit.
--
-- boss_mirror_violation_ring: ring 5 slots (rule_id + severity) per lieutenant.
--   Canon :49-51: 5-slot ring-buffer of observed boss-violations (1 B per slot: rule_id 4-bit + severity 4-bit).
--   DD-BYTES: realised as JSONB ring buffer (violation_slots) + integer head pointer (ring_head). No bit-packing.
--   PK: lieutenant_id (1-1 with lieutenant — per-lieutenant scope).
--   FK: lieutenant_id → lieutenant(lieutenant_id) ON DELETE CASCADE.
--   R2.2: violation_slots is server-side only — projected as posture cues + dialogue beats (:61-63).
--
-- Dependency-neutral: no dependency on other R1 migrations (all 6 are NEW tables).

CREATE TABLE IF NOT EXISTS boss_mirror_violation_ring (
  lieutenant_id   uuid        NOT NULL PRIMARY KEY
    REFERENCES lieutenant(lieutenant_id) ON DELETE CASCADE,
  player_id       uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  violation_slots jsonb       NOT NULL DEFAULT '[]',
  ring_head       smallint    NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS boss_mirror_violation_ring_player_idx
  ON boss_mirror_violation_ring (player_id);

--> statement-breakpoint

GRANT UPDATE ON boss_mirror_violation_ring TO app_rw;
