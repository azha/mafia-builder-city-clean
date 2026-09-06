-- D1b C4: lot_handling_vector + district_wear_mark_demographics — Wear-Mark Premium (§2.3).
-- R9.3: Drizzle schema (market_wear_mark.ts) + ch09 mirror (schema_market_wear_mark.md)
--       backported in the SAME commit.
--
-- lot_handling_vector: REUSE 04a chunk 7 preview hook (product_storage.md §59-60).
--   Materialization of the named preview hook as a SIDE TABLE keyed on (player_id, storage_id).
--   6 fields (8-bit each): hop_count, transit_days, repackaging_count, courier_diversity,
--   origin_age_days, wear_flag_mask + pristine_flag (real, 0..1).
--   PK: (player_id, storage_id). FK: player_id → player(player_id) ON DELETE CASCADE.
--   storage_id = soft-ref to product_storage.storage_id (no FK — avoids cascade complexity).
--   R2.2: raw vector fields are server-side ONLY (NEVER forwarded to client).
--
-- district_wear_mark_demographics: cautious_share + pristine_share per district_id.
--   World-gen seeded by WearMarkPremiumService. Glass-tier districts: pristine_share > 0.5.
--   PK: district_id. FK: district_id → districts(id) ON DELETE CASCADE.
--   CHECK: cautious_share + pristine_share ≈ 1.0 (±0.01 float tolerance).
--
-- NEW tunable (registry-add, R9.3-additive):
--   market.wear_w1 / market.wear_w2 / market.wear_w3 — sigmoid weights (equal-weight default = 1/3 each).
--     [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: calibration deferred to C9.
--   market.wear_decay_per_repackaging — pristine_flag decay per repackaging event (default 0.40).
--     [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: anchored to market_mechanics.md:151 (0.40, range 0.20..0.70).
--
-- DD8 (RESOLVED): NO purity tunable added here (purity enters price via Lane/Composition Telegraph).

CREATE TABLE IF NOT EXISTS lot_handling_vector (
  player_id           uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  storage_id          uuid        NOT NULL,
  -- 6-byte handling state (market_mechanics.md:121-126):
  hop_count           smallint    NOT NULL DEFAULT 0
    CONSTRAINT lot_handling_vector_hop_count_chk CHECK (hop_count >= 0 AND hop_count <= 255),
  transit_days        smallint    NOT NULL DEFAULT 0
    CONSTRAINT lot_handling_vector_transit_days_chk CHECK (transit_days >= 0 AND transit_days <= 255),
  repackaging_count   smallint    NOT NULL DEFAULT 0
    CONSTRAINT lot_handling_vector_repackaging_count_chk CHECK (repackaging_count >= 0 AND repackaging_count <= 255),
  courier_diversity   smallint    NOT NULL DEFAULT 0,
  origin_age_days     smallint    NOT NULL DEFAULT 0,
  wear_flag_mask      smallint    NOT NULL DEFAULT 0,
  -- pristine_flag (real 0..1): decays per repackaging; used in S-formula (market_mechanics.md:133).
  -- [PROPOSED DEFAULT — tunable][PROV-Y26Q2]: decay = wear_decay_per_repackaging = 0.40.
  pristine_flag       real        NOT NULL DEFAULT 1.0
    CONSTRAINT lot_handling_vector_pristine_flag_chk CHECK (pristine_flag >= 0 AND pristine_flag <= 1),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, storage_id)
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS district_wear_mark_demographics (
  district_id         integer     NOT NULL PRIMARY KEY
    REFERENCES districts(id) ON DELETE CASCADE,
  -- cautious_share + pristine_share = 1.0 (sum check ±0.01 float tolerance).
  cautious_share      real        NOT NULL DEFAULT 0.75
    CONSTRAINT district_wear_mark_demographics_cautious_share_range_chk CHECK (cautious_share >= 0 AND cautious_share <= 1),
  pristine_share      real        NOT NULL DEFAULT 0.25
    CONSTRAINT district_wear_mark_demographics_pristine_share_range_chk CHECK (pristine_share >= 0 AND pristine_share <= 1),
  CONSTRAINT district_wear_mark_demographics_shares_sum_chk
    CHECK (cautious_share + pristine_share > 0.99 AND cautious_share + pristine_share < 1.01),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- Grant UPDATE on both tables (lot mutation + demographics re-seeding).
GRANT UPDATE ON lot_handling_vector TO app_rw;
GRANT UPDATE ON district_wear_mark_demographics TO app_rw;
