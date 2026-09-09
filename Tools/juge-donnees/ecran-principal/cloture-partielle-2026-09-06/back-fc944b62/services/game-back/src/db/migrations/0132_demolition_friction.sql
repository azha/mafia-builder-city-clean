-- migration 0132: demolition_friction (P3-E C1 — Demolition Mandate data model, ch05 Loop 8)
-- Plan: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md C1
-- Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §13.1 (data model,
--         verbatim) + §4.1 (node-set perimeter reconciliation) + §4.2 (acquired_at_tick resolution) +
--         §4.3 (agrégat + seuil + état persisté) + §7 (replacement options)
-- Decisions: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-decisions.md D1 (ZERO pgEnum
--         NEW) + D19/#17 (éligibilité décommission élargie) + D20/#19 (acquired_at_tick stamp/lazy-stamp)
--         + #15 (friction_org_size ≠ org_size canon) + #18 (périmètre != 'demolished')
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md §12 (NEW tables) + same commit.
--
-- ★ idx: authored against THIS branch's own journal head (130 entries, `_journal.json` re-read fresh at
-- C0/C1) at the then-next-free idx 0131. A parallel 04g-D session provisionally claimed 0131 on its OWN
-- branch (known collision, anticipated — decisions §7/§18), per the "whoever merges second renumbers"
-- protocol this repo has applied repeatedly. RENUMBERED at the 04g-D integration (main merge `0d1b1353`
-- brought `0131_template_library` first): 0131→0132 — filename + `_journal.json` idx 132 + the schema
-- tripwire's own idx assertions reconciled MECHANICALLY at integration.
--
-- PART 1 — ALTER "buildings" ADD "acquired_at_tick" (resolution R11/#19, design §4.2/§13.1):
--   the C0 pre-flight PROVED no existing column/table gives the age of every node in the ★#1 friction
--   perimeter — buildings has NO acquisition timestamp; building_operational_state.became_operational_at
--   is NULL through the whole setup window AND the row does not exist between purchase() and convert()
--   (a bought-not-converted building is ALREADY in-perimeter, structural_state='operational' set at
--   purchase, decisions §8.5 R11). Additive nullable bigint, stamped at purchase() (one-line edit,
--   real-estate.repository.ts, same commit) going forward; pre-existing rows stay NULL until the FIRST
--   N/31 lazy-stamp (D20, C2 — idempotent one-shot, never a fabricated age). Mirrors mig 0107's own
--   single-column ADDITIVE-only ALTER on buildings (audit_pin_activated_at) — same "ADDITIVE only, NULL
--   default = pre-migration semantics unchanged" posture. Age is read in JOURNAL-native game-minutes
--   (the same unit `city_sim_clock.game_minute` uses) — the "day" conversion (÷1440) happens in the
--   accrual FORMULA (C2), not the stored anchor.
-- PART 2 — "friction_budget_state" (design §13.1, §4.3): 1-1 per-player cache of the agrégat + the
--   efficiency-penalty transition state. `friction_org_size` (NOT `org_size` — divergence #15, ruling
--   ★#1 override: the friction node-set is ALL owned non-'demolished' nodes, a DIFFERENT count than the
--   canon-active `org_size` used elsewhere) counts the périmètre §4.1 réconcilié
--   (`ownership='player' AND structural_state != 'demolished'`). Both count/total columns are a
--   REFRESH-ONLY-BY-TICK cache (never mutated elsewhere but the N/31 tick + the synchronous re-eval
--   inside a decommission tx, C2/C4) — the accrual formula itself stays DERIVED, never stored (D4,
--   precedent P3-C/04f-A). The penalty-coherence CHECK enforces the pair
--   (efficiency_penalty_active, penalty_since_tick) can never desync (active-without-a-timestamp or
--   timestamp-without-active are both schema-impossible, not just app-discipline).
-- PART 3 — "replacement_option" (design §13.1/§7, ★#5 optionnelles): up to 2 ranked candidates per
--   decommissioned node (rank CHECK IN (1,2) — canon `demolition_replacement_options_count` default 2).
--   `freed_block_id`/`source_building_id` are SOFT-REFS (no DB FK) — the SAME convention
--   `highest_leverage_cards.session_ref` established (mig 0120): a block id is a GLOBAL soft-ref target
--   (world_geography.blocks.id, never FK'd from player-scoped rows per that table's OWN convention) and
--   source_building_id points at a row that DELIBERATELY still exists post-decommission
--   (structural_state='demolished', never deleted) but is intentionally NOT hard-FK'd (the option must
--   remain queryable/expirable independent of any future buildings-table lifecycle change). UNIQUE
--   (player_id, source_building_id, rank) — at most one rank-1 and one rank-2 option per decommissioned
--   node per player. Partial index on open (not yet closed) options — the
--   `GET /v1/friction/replacement-options` hot path (design §15).
--
-- ZERO pgEnum NEW (D1, P3-D precedent reconduced): `friction_budget_state` has no domain-enum column;
-- replacement_option's `rank` is a bounded smallint CHECK, not an enum.
--
-- GRANTs mirror the 0128/0129 pattern (app_rw least-privilege runtime role — UPDATE explicit; SELECT +
-- INSERT auto-granted via 0013's ALTER DEFAULT PRIVILEGES). No GRANT needed for the buildings ALTER —
-- buildings already carries GRANT SELECT/INSERT/UPDATE/DELETE TO app_rw (migration 0005).

--> statement-breakpoint

-- ===== PART 1: buildings.acquired_at_tick (design §4.2/§13.1, resolution R11/#19) =====
ALTER TABLE "buildings"
  ADD COLUMN IF NOT EXISTS "acquired_at_tick" bigint;

--> statement-breakpoint

-- Floor-only guard (nullable-but-bounded-when-present — the cs_executing_slot_index_chk convention,
-- mig 0129): a stamped tick is never negative. NULL (not-yet-stamped) is untouched by this CHECK.
ALTER TABLE "buildings"
  ADD CONSTRAINT "buildings_acquired_at_tick_chk"
  CHECK ("acquired_at_tick" IS NULL OR "acquired_at_tick" >= 0);

--> statement-breakpoint

-- ===== PART 2: friction_budget_state (design §13.1/§4.3 — 1-1 per-player friction cache) =====
CREATE TABLE IF NOT EXISTS "friction_budget_state" (
  "player_id"                  uuid        NOT NULL PRIMARY KEY REFERENCES "player"("player_id") ON DELETE CASCADE,
  "friction_budget_total"      numeric     NOT NULL DEFAULT 0,
  "friction_org_size"          integer     NOT NULL DEFAULT 0,
  "efficiency_penalty_active"  boolean     NOT NULL DEFAULT false,
  "penalty_since_tick"         bigint,
  "last_decommission_at_tick"  bigint,
  "last_evaluated_tick"        bigint      NOT NULL DEFAULT 0
);

--> statement-breakpoint

ALTER TABLE "friction_budget_state"
  ADD CONSTRAINT "friction_budget_state_total_chk"
  CHECK ("friction_budget_total" >= 0);

--> statement-breakpoint

ALTER TABLE "friction_budget_state"
  ADD CONSTRAINT "friction_budget_state_org_size_chk"
  CHECK ("friction_org_size" >= 0);

--> statement-breakpoint

-- Design §13.1 verbatim coherence CHECK: efficiency_penalty_active and penalty_since_tick can never
-- desync (active-without-a-timestamp or a stale timestamp on an inactive row are both schema-impossible).
ALTER TABLE "friction_budget_state"
  ADD CONSTRAINT "friction_budget_state_penalty_coherence_chk"
  CHECK (
    ("efficiency_penalty_active" = true AND "penalty_since_tick" IS NOT NULL)
    OR ("efficiency_penalty_active" = false AND "penalty_since_tick" IS NULL)
  );

--> statement-breakpoint

GRANT UPDATE ON "friction_budget_state" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== PART 3: replacement_option (design §13.1/§7 — ★#5 optionnelles, up to 2 ranked candidates) =====
CREATE TABLE IF NOT EXISTS "replacement_option" (
  "id"                        uuid          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                 uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "freed_block_id"            integer       NOT NULL,
  "source_building_id"        uuid          NOT NULL,
  "candidate_building_type"   integer       NOT NULL,
  "projected"                 jsonb         NOT NULL DEFAULT '{}'::jsonb,
  "rank"                      smallint      NOT NULL,
  "created_at_tick"           bigint        NOT NULL,
  "expires_at_tick"           bigint        NOT NULL,
  "picked_at"                 timestamptz,
  "closed_at"                 timestamptz
);

--> statement-breakpoint

ALTER TABLE "replacement_option"
  ADD CONSTRAINT "replacement_option_rank_chk"
  CHECK ("rank" IN (1, 2));

--> statement-breakpoint

-- At most one rank-1 and one rank-2 option per decommissioned node per player (design §13.1 verbatim).
ALTER TABLE "replacement_option"
  ADD CONSTRAINT "replacement_option_player_source_rank_unique"
  UNIQUE ("player_id", "source_building_id", "rank");

--> statement-breakpoint

-- Partial index — the GET /v1/friction/replacement-options hot path (design §15: "options OPEN").
CREATE INDEX "replacement_option_player_open_idx"
  ON "replacement_option" ("player_id")
  WHERE "closed_at" IS NULL;

--> statement-breakpoint

GRANT UPDATE ON "replacement_option" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)
