-- 0034_standing_order_runtime.sql — schema_lieutenant.md §5 (standing_order ALTER: rule/signature/status) + §19
--   (standing_order_state, Phase-25 L3 Standing Order Expiry, Idea #14). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 25 / L3 Standing Order Expiry backend (docs/superpowers/specs/2026-06-11-phase-25-standing-order-expiry-design.md
--             §3.1) / Task 1. R9.3: this matches src/db/schema/lieutenant.ts (the ALTERed standingOrder) +
--             src/db/schema/standing_order_state.ts byte-for-byte. ONLY ADDS — no existing table/column/enum is redefined
--             or dropped: 3 NEW columns on the EXISTING "standing_order" (rule/signature/status, ALL with a DEFAULT →
--             metadata-only ADD COLUMN in PG >= 11, no table rewrite, safe on a populated table) + 1 NEW table
--             standing_order_state, a 1-1 CHILD of "lieutenant" (PK = FK lieutenant_id, ON DELETE CASCADE — the
--             lapse-pattern ledger dies with its lieutenant). The 7 canonical lieutenant tables (0004) + their later ADDs
--             (0026/0027/0028) + autonomy_ceiling_state (0031) + signal_drift_state (0032) are UNCHANGED except the
--             standing_order ADD COLUMN (git diff = empty except this column-add + new table). The new table is created
--             AFTER "lieutenant" (FK ordering) — it is the third 1-1 child of lieutenant (after autonomy_ceiling_state +
--             signal_drift_state).
--             ADD COLUMN with a DEFAULT = metadata-only in PG >= 11 (no table rewrite): any already-emitted standing_order
--             retro-fills (rule='{}'::jsonb, signature='', status='active') → byte-identical behavior for an order that
--             pre-dates this migration (same forward-only ADD-COLUMN spirit as the lieutenant 0026 ADDs).
--             NB R9.3: canon 09 sketches the GDD L165-174 standing_order with lapse_count but no compiled-rule/lifecycle-
--             status surface; L3 materializes the runtime rule injection (rule/signature) + the lifecycle (status) + a
--             1-1 jsonb standing_order_state lapse ledger (coherent with autonomy_ceiling_state / signal_drift_state) —
--             flagged for the 09 backport reconcile.
-- COLUMNS — standing_order (BO-only runtime injection surface; the player surface only ever sees the derived freshness
--   bands (R2.2 / P4-P5), never the raw rule/signature):
--   rule       : the COMPILED DSL rule (jsonb IR — { trigger, action, priority }) this order injects at the executor tick.
--                The injection re-stamps it to the reserved STANDING_ORDER_PRIORITY at runtime; behavior_script.rules is
--                NEVER mutated (a runtime injection, not a script edit). DEFAULT '{}' — set when an order is emitted (T2).
--   signature  : the deterministic signature of `rule` (text, signatureFor(rule) — pure/deterministic). The stable key the
--                consecutive-lapse counter + the promotion-suggestion track key on. DEFAULT '' (no rule yet).
--   status     : the order lifecycle state (text, DEFAULT 'active'). One of active|lapsed|revoked|promoted|renewed —
--                single active order per lieutenant (emit while active → 409, RENEW instead). Mutated by evaluate/decision.
-- COLUMNS — standing_order_state (BO-only — the lapse-pattern counters inside `pattern` are a PRIVATE measurement ledger;
--   the player surface only ever sees the derived freshness band, never the raw per-signature consecutive_lapse_count):
--   lieutenant_id       : PK = FK lieutenant(lieutenant_id) ON DELETE CASCADE (the ledger dies with its lieutenant).
--   pattern             : the lapse-pattern registry (jsonb) — { "<signature>": { consecutive_lapse_count, promotion_suggested } }.
--                         Defaults to an EMPTY '{}' — the service LAZILY seeds on the first lapse/evaluate, then writes it
--                         back; a lieutenant whose order never lapses keeps the empty '{}' (no eager seed at emit).
--   last_decision_ticks : the per-kind cooldown ledger (jsonb, nullable) — { "<kind>": tick }. NULL until the first
--                         RENEW/REVOKE/PROMOTE decision; the decision cooldown reads it to 409 a too-soon re-decision.
--   created_at / updated_at : timestamptz NOT NULL DEFAULT now() (mirror signal_drift_state / autonomy_ceiling_state).
-- INDEX: NONE. standing_order_state is read + written per-lieutenant by the PK lieutenant_id (the tick/decision has
--        already resolved the player-owned lieutenant); no read filters BY any other column, so no secondary index is
--        warranted day-1 (calque schema_lieutenant.md §6 + autonomy_ceiling_state 0031 + signal_drift_state 0032 — the
--        1-1-by-PK tables add no secondary index).
-- GRANT: app_rw needs UPDATE + DELETE on the NEW standing_order_state table — UPDATE for the read-modify-write pattern
--        writes (lapse-count accrual / decision-cooldown stamp), DELETE for the GDPR/retire cleanup (the CASCADE from
--        "lieutenant" covers the normal path, but an explicit DELETE is granted for completeness). SELECT + INSERT come
--        from the table-wide GRANT TO app_rw (0013 §"Read+append everywhere" — covers tables created later via ALTER
--        DEFAULT PRIVILEGES), so only the mutating UPDATE/DELETE are granted here.
--        NO re-GRANT on "standing_order": the EXISTING table is ALREADY listed in the 0013 GRANT UPDATE, DELETE ... TO
--        app_rw block (0013 line 72) — its 3 NEW columns are SELECT/INSERT/UPDATE/DELETE-able by app_rw with no re-GRANT
--        (a table-level GRANT with no column list covers columns ADDED later). Re-granting would be a redundant double-grant.
ALTER TABLE "standing_order"
  ADD COLUMN "rule" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "signature" text NOT NULL DEFAULT '',
  ADD COLUMN "status" text NOT NULL DEFAULT 'active';
--> statement-breakpoint
CREATE TABLE "standing_order_state" (
  "lieutenant_id"       uuid         PRIMARY KEY REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "pattern"             jsonb        NOT NULL DEFAULT '{}'::jsonb,
  "last_decision_ticks" jsonb,
  "created_at"          timestamptz  NOT NULL DEFAULT now(),
  "updated_at"          timestamptz  NOT NULL DEFAULT now()
);
--> statement-breakpoint
GRANT UPDATE, DELETE ON "standing_order_state" TO app_rw;
