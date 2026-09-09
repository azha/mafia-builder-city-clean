-- D2 R1: hidden_curriculum_norms_vector — per-lieutenant absorbed norms (§3.4 Hidden Curriculum).
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       backported in the SAME commit.
--
-- hidden_curriculum_norms_vector: 8 norm flags + 16-event witnessed ring per lieutenant.
--   Canon :150-160: 1-B absorbed-norms vector (8 flags packed) + 4-B witnessed-event ring (16 events, 2-bit types).
--   DD-BYTES: norms_flags realised as JSONB object with 8 boolean keys (no bit-packing).
--             witnessed_event_ring realised as JSONB array of { event_type: 0-3 }.
--   Norm flags (8 flags per :151-159):
--     punctuality, silence_at_handoffs, debt_handling, escalation_reflex,
--     fairness_to_subordinates, discretion_around_civilians, restraint_with_force, ledger_hygiene.
--   PK: lieutenant_id (1-1 with lieutenant — per-lieutenant scope).
--   FK: lieutenant_id → lieutenant(lieutenant_id) ON DELETE CASCADE.
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX (for player-scoped lookups).
--   R2.2: norms_flags + witnessed_event_ring are server-side only — projected as uniform tells (:170).

CREATE TABLE IF NOT EXISTS hidden_curriculum_norms_vector (
  lieutenant_id        uuid        NOT NULL PRIMARY KEY
    REFERENCES lieutenant(lieutenant_id) ON DELETE CASCADE,
  player_id            uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  norms_flags          jsonb       NOT NULL DEFAULT
    '{"punctuality":false,"silence_at_handoffs":false,"debt_handling":false,"escalation_reflex":false,"fairness_to_subordinates":false,"discretion_around_civilians":false,"restraint_with_force":false,"ledger_hygiene":false}',
  witnessed_event_ring jsonb       NOT NULL DEFAULT '[]',
  ring_head            smallint    NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS hidden_curriculum_norms_vector_player_idx
  ON hidden_curriculum_norms_vector (player_id);

--> statement-breakpoint

GRANT UPDATE ON hidden_curriculum_norms_vector TO app_rw;
