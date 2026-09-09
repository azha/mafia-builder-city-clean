-- D1b C3: buyer_roster_entry + buyer_roster_daily_state — rolling 24-slot buyer attribution roster.
-- R9.3: Drizzle schema (market_buyer_roster_entry.ts) + ch09 mirror (schema_market_buyer_roster_entry.md)
--       backported in the SAME commit.
--
-- buyer_roster_entry: rolling 24-slot per (player_id × region_id).
--   slot_index = attributed_at_tick % market.composition_roster_slots (modular rolling UPSERT).
--   PK: (player_id, region_id, slot_index). FK: player_id → player(player_id) ON DELETE CASCADE.
--   slot_index CHECK: < 48 (full tunable range 12..48) — conservative guard, NOT hardcoded 24.
--   [DESIGN DECISION — SLOT_CHECK]: guard uses < 48 so the check does not fail if the tunable
--   composition_roster_slots is raised above 24 (range 12..48, gdd/14:923).
--
-- buyer_roster_daily_state: per-player/region daily inference result (q_inferred — server-side only, R2.2).
--   q_inferred: NEVER forwarded to client (R2.2 P5 invariant); only q_inferred_bucket exposed.
--   PK: (player_id, region_id). FK: player_id → player(player_id) ON DELETE CASCADE.

CREATE TABLE IF NOT EXISTS buyer_roster_entry (
  player_id           uuid            NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  region_id           integer         NOT NULL,
  slot_index          smallint        NOT NULL
    CONSTRAINT buyer_roster_entry_slot_index_chk CHECK (slot_index >= 0 AND slot_index < 48),
  buyer_tier          smallint        NOT NULL
    CONSTRAINT buyer_roster_entry_buyer_tier_chk CHECK (buyer_tier >= 1 AND buyer_tier <= 4),
  attributed_at_tick  integer         NOT NULL,
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, region_id, slot_index)
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS buyer_roster_daily_state (
  player_id     uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  region_id     integer     NOT NULL,
  -- q_inferred: server-side only (R2.2 P5 invariant — never forwarded to client).
  -- Neutral default 2.0 = mid-tier weighted average (before any roster data).
  q_inferred    real        NOT NULL DEFAULT 2.0,
  last_day_id   integer     NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, region_id)
);

--> statement-breakpoint

-- Grant UPDATE to app_rw (both tables are mutable: recordBuyerAttribution + daily inference tick).
GRANT UPDATE ON buyer_roster_entry TO app_rw;
GRANT UPDATE ON buyer_roster_daily_state TO app_rw;
