-- migration 0148: marks_ledger (W1.3 C2 — the append-only invariant ledger backing
-- economy_states.marks; design §3-C2)
-- Design: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §3-C2 (the invariant:
--         "jamais de mutation de economy_states.marks sans entrée de ledger dans la même
--         transaction", screen_c2_iap_shop.md:247).
-- Canon: docs/tech/08c_remaining_screens/screen_c2_iap_shop.md:247 (MarksLedger shape).
-- R9.3: docs/tech/09_data_model/schema_iap_monetization.md §2 (same commit).
--
-- Every future mutation of `marks` (item-purchase debit C3, receipt-validate credit C4, BO
-- subvention C5, refund reversal C6) writes exactly ONE row here in the SAME transaction as the
-- balance UPDATE — this migration's welcome-grant backfill (below) closes the ONE gap that would
-- otherwise exist: `economy_states` rows created by W1.1-a's signup (between that lot's merge and
-- this one) have `marks=50` with ZERO ledger entry. Without the backfill, `SUM(delta_marks) ==
-- marks` is false for every such row — not a gate risk (each E2E shard starts from a fresh DB), but
-- a REAL invariant violation for any player who signed up before this migration ran.
--
-- player_id: 1-N tightly-coupled entity (schema_player.md §5.2 category) — ON DELETE CASCADE, same
-- policy as PlayerProgressionState's own per-player children.
--
-- GRANT: SELECT + INSERT only. REVOKE UPDATE, DELETE explicit — append-only is a SECURITY property
-- (mirrors 0146_tutorial_state.sql's own justification: must not depend on the migrator's role).

--> statement-breakpoint

CREATE TABLE "marks_ledger" (
  "ledger_id"     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"     uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "delta_marks"   integer       NOT NULL,
  "reason_sku"    varchar(64)   NOT NULL,
  "receipt_hash"  text,
  "created_at"    timestamptz   NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX "marks_ledger_player_id_idx" ON "marks_ledger" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT ON "marks_ledger" TO app_rw;

--> statement-breakpoint

REVOKE UPDATE, DELETE ON "marks_ledger" FROM app_rw;

--> statement-breakpoint

-- Backfill (§ header note above): every economy_states row already carrying marks=50 (the W1.1-a
-- welcome grant, WELCOME_GRANT_MARKS — auth.service.ts) but with NO marks_ledger row yet, gets ONE
-- retroactive entry so the invariant holds for pre-existing players too, not just new signups from
-- this migration forward. reason_sku='welcome_grant' matches the label the (from-now-on) inline
-- signup insert uses (auth.service.ts, same commit). Scoped to marks=50 (the WELCOME_GRANT_MARKS
-- constant, not a tunable — auth.service.ts:150) so a row a BO subvention already touched (a future
-- possibility once C5 ships) is never double-counted; this migration runs BEFORE C5 exists, so no
-- such row can exist yet — the WHERE clause is a defensive, not a load-bearing, guard.
INSERT INTO "marks_ledger" ("player_id", "delta_marks", "reason_sku", "created_at")
SELECT "player_id", 50, 'welcome_grant', now()
FROM "economy_states"
WHERE "marks" = 50
  AND NOT EXISTS (
    SELECT 1 FROM "marks_ledger" WHERE "marks_ledger"."player_id" = "economy_states"."player_id"
  );
