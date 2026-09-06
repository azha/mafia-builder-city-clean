-- 0003_player_economy_state.sql — schema_player_economy_state.md §3/§7. PALIMPSEST §3.2.

-- Enum natif `iap_platform`
CREATE TYPE "iap_platform" AS ENUM ('apple', 'google', 'web');
--> statement-breakpoint

-- Table `economy_states` (1-1 strict player)
CREATE TABLE "economy_states" (
  "player_id"                uuid PRIMARY KEY REFERENCES "player"("player_id") ON DELETE CASCADE,
  "cash_cents"               bigint NOT NULL DEFAULT 0,
  "marks"                    integer NOT NULL DEFAULT 0,
  "reputation_legacy"        integer NOT NULL DEFAULT 0,
  "lifetime_iap_value_cents" bigint NOT NULL DEFAULT 0,
  "last_iap_at"              timestamptz
);
--> statement-breakpoint
CREATE INDEX "economy_states_last_iap_at_idx" ON "economy_states" ("last_iap_at");
--> statement-breakpoint

-- Table `iap_transactions` (1-N from player)
CREATE TABLE "iap_transactions" (
  "txn_id"           uuid PRIMARY KEY,
  "player_id"        uuid NOT NULL REFERENCES "player"("player_id") ON DELETE RESTRICT,
  "sku"              varchar(64) NOT NULL,
  "amount_cents"     bigint NOT NULL,
  "currency_code"    varchar(8) NOT NULL,
  "platform"         iap_platform NOT NULL,
  "platform_receipt" text NOT NULL,
  "purchased_at"     timestamptz NOT NULL,
  "refunded_at"      timestamptz,
  "refund_reason"    text
);
--> statement-breakpoint
CREATE        INDEX "iap_transactions_player_id_idx"        ON "iap_transactions" ("player_id");
--> statement-breakpoint
CREATE        INDEX "iap_transactions_purchased_at_idx"     ON "iap_transactions" ("purchased_at");
--> statement-breakpoint
CREATE        INDEX "iap_transactions_sku_idx"              ON "iap_transactions" ("sku");
--> statement-breakpoint
CREATE UNIQUE INDEX "iap_transactions_platform_receipt_uq"  ON "iap_transactions" ("platform", "platform_receipt");
