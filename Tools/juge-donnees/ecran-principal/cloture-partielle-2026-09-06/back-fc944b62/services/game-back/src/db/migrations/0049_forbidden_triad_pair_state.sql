-- D2 R1: forbidden_triad_pair_state — per strong-tied pair (§3.5 Forbidden-Triad Detection).
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       backported in the SAME commit.
--
-- forbidden_triad_pair_state: triadic state per strong-tied pair (max 66 pairs per player).
--   Canon :196-199: per pair 4 B — triadic_state (1B) + anomaly_pressure_bucket (1B) + last_event_tick (2B).
--   DD-BYTES: realised as normalized PG columns (integer triadic_state, smallint anomaly, integer tick).
--   triadic_state: 0=UNMET, 1=MET_ONCE, 2=BONDED, 3=COLLABORATING (:197).
--   anomaly_pressure_bucket: composite accumulator (smallint sufficient for weekly delta :201-204).
--   Max 66 pairs per player (N_strong=12 cap quadratic bound :194) — enforced at service layer (R8a).
--   PK composite: (player_id, pair_key) — pair_key = uuid combining the two contact IDs.
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
--   R2.2: anomaly_pressure_bucket is server-side only — player sees dashed lines thickening (:208).

CREATE TABLE IF NOT EXISTS forbidden_triad_pair_state (
  player_id               uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  pair_key                uuid        NOT NULL,
  triadic_state           integer     NOT NULL DEFAULT 0,
  anomaly_pressure_bucket smallint    NOT NULL DEFAULT 0,
  last_event_tick         integer     NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, pair_key)
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS forbidden_triad_pair_state_player_idx
  ON forbidden_triad_pair_state (player_id);

--> statement-breakpoint

GRANT UPDATE ON forbidden_triad_pair_state TO app_rw;
