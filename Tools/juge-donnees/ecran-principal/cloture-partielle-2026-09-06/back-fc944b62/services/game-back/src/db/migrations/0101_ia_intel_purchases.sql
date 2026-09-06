-- migration 0101: ia_intel_purchases table (04d-B C1 — IA Intel Purchase History)
-- Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md §State (:63-71)
-- R9.3: backported to docs/tech/09_data_model/schema_internal_affairs.md same-commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: ADDITIVE only. No existing tables modified.
-- FK: player_id → player(player_id) ON DELETE CASCADE.
-- FK: target_id → internal_affairs_targets(target_id) ON DELETE CASCADE.
-- INDEX (player_id): per-player purchase history. INDEX (target_id): target-scoped reads.
-- cost_cents: bigint (cash-clear DD-P5 — transaction values visible to player).
-- revealed_band: the suspicion band revealed at purchase (P5-projected, clear to player).

--> statement-breakpoint

-- ia_intel_purchases: per-player intel purchase history (canon :63-71).
-- One row per intel purchase (op Fixer action — player pays to learn target suspicion band).
-- cost_cents: bigint (cash-clear, exposed to player — unlike suspicion_level which is SERVER-ONLY).
-- revealed_band: the ia_suspicion_band value explicitly revealed at purchase (clear to player).
-- FK: player_id → player ON DELETE CASCADE (player deleted → purchases cascade-deleted).
-- FK: target_id → internal_affairs_targets ON DELETE CASCADE (target removed → purchases cascade-deleted).
CREATE TABLE IF NOT EXISTS "ia_intel_purchases" (
  "purchase_id"   uuid              NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"     uuid              NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "target_id"     uuid              NOT NULL
    REFERENCES "internal_affairs_targets"("target_id") ON DELETE CASCADE,
  "purchased_at"  timestamptz       NOT NULL DEFAULT now(),
  "revealed_band" ia_suspicion_band NOT NULL,
  "cost_cents"    bigint            NOT NULL DEFAULT 0
);

--> statement-breakpoint

CREATE INDEX "ia_intel_purchases_player_idx"
  ON "ia_intel_purchases" ("player_id");

--> statement-breakpoint

CREATE INDEX "ia_intel_purchases_target_idx"
  ON "ia_intel_purchases" ("target_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "ia_intel_purchases" TO app_rw;
