-- migration 0147: iap_sku_override (W1.3 C1 — the catalogue's ONLY persisted half, A1 option (C))
-- Design: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §5-A1 (the (C) reco: SKU
--         DEFINITIONS stay code-owned + boot-asserted, iap-sku-catalogue.ts; ONLY the BO
--         enabled/disabled toggle is persisted) + §3-C1 (B3 correction — the route that WRITES
--         `enabled` ships in the SAME chunk as this table, never a table nobody can write).
-- Canon: docs/tech/09_data_model/schema_iap_monetization.md §1 (NEW file, same commit).
--
-- Why (C) and not a full `iap_catalogue` table: 9/9 other catalogues in this codebase are
-- TypeScript modules with ZERO pgTable (design §5-A1 — disclosure/tutorial-id/task-category/
-- capability/structural-decision/initiating-change/slot-type/live-ops-event/political-event). The
-- closest precedent for "a BO-editable catalogue" (`template_library.ts`) keeps DEFINITIONS in code
-- (60 templates, boot assertions that THROW) and persists only the composed INSTANCES. This table is
-- the SAME split: what a table adds over pure code is (a) toggle without a deploy and (b) add-SKU
-- without a deploy — (b) stays a deploy (a NEW SKU needs code review for real money, design §5-A1),
-- (a) is what this table buys.
--
-- sku_id: NOT a foreign key — the 9-member set is closed in code (iap-sku-catalogue.ts, boot
-- assertion THROWS on bootstrap if it drifts from the canon 9). A row here for an unknown sku_id is
-- inert (the catalogue service only ever looks UP by a code-owned sku_id, never enumerates this
-- table's own key set).
--
-- No row for a SKU ⇒ enabled (the column DEFAULT true IS the untouched state).
--
-- GRANT: SELECT + INSERT + UPDATE (the PATCH route upserts — `ON CONFLICT (sku_id) DO UPDATE`).
-- No DELETE (a SKU is never un-toggled by removing its override row — re-enabling writes
-- enabled=true, same as any other toggle).
--
-- Zero-regression: ADDITIVE only — one NEW table, no existing table/column touched.

--> statement-breakpoint

CREATE TABLE "iap_sku_override" (
  "sku_id"     varchar(64)   PRIMARY KEY,
  "enabled"    boolean       NOT NULL DEFAULT true,
  "updated_by" uuid,
  "updated_at" timestamptz   NOT NULL DEFAULT now()
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON "iap_sku_override" TO app_rw;
