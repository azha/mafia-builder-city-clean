-- migration 0149: iap_entitlement (W1.3 C3 — which COSMETIC/SAVE_SLOT SKUs a player owns)
-- Design: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §3-C3 — PK composite
--         (player_id, sku_id) so re-acquisition is impossible BY CONSTRAINT, not an `if`.
-- R9.3: docs/tech/09_data_model/schema_iap_monetization.md §3 (same commit).
--
-- player_id: 1-N tightly-coupled entity (schema_player.md §5.2) — ON DELETE CASCADE.
-- sku_id: NOT a foreign key — same closed code-owned set as iap_sku_override.sku_id
-- (iap-sku-catalogue.ts, boot-asserted).
-- source_txn_id: reserved for a future direct-grant-via-real-money-purchase path — never written
-- by this lot's 6 chunks; nullable, ON DELETE SET NULL against the day-0 iap_transactions table
-- (migration 0003 — already exists, no ordering hazard).
--
-- GRANT: SELECT + INSERT only. REVOKE UPDATE, DELETE explicit — same append-only-is-a-security-
-- property reasoning as marks_ledger (0148): this lot's refund flow (C6) never revokes an
-- entitlement (only real-money SKUs are refundable, and they never grant one).

--> statement-breakpoint

CREATE TABLE "iap_entitlement" (
  "player_id"      uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "sku_id"         varchar(64)   NOT NULL,
  "granted_at"     timestamptz   NOT NULL DEFAULT now(),
  "source_txn_id"  uuid          REFERENCES "iap_transactions"("txn_id") ON DELETE SET NULL,
  PRIMARY KEY ("player_id", "sku_id")
);

--> statement-breakpoint

GRANT SELECT, INSERT ON "iap_entitlement" TO app_rw;

--> statement-breakpoint

REVOKE UPDATE, DELETE ON "iap_entitlement" FROM app_rw;
