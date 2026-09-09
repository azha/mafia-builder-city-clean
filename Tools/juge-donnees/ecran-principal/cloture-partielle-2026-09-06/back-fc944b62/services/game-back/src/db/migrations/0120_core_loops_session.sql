-- migration 0120: core_loops_session (P3-A C1 — data model + tunables foundation, ch05 Session Spine +
-- Exception-Queue spine completion + Loop 10 governor + HighestLeverageCard)
-- Plan: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md C1
-- Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §3 (highest_leverage_cards shape,
--         2 indexes) + §1 D11 (HL card = persisted row + closed provider registry)
-- Decisions: docs/superpowers/specs/2026-07-10-p3-A-session-spine-decisions.md §2.1 DD-P1 (migration
--         shape: 1 CREATE TYPE + 1 CREATE TABLE + GRANTs, ONE migration) + §6 sub-decision #6 RULED
--         (ch09 home = NEW `schema_core_loops.md`, not an appended § in
--         `schema_queues_exceptions_cuestack.md`) + §1.11 D11 reasoning.
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md (NEW) — same commit.
--
-- ★ idx final, reconciled at integration (04f-A merged first with 0119): this file was authored as
-- 0119-provisional (both `feat/p3-A-player-loops` and `feat/04f-A-maintenance` independently claimed
-- "0119" against their own pre-merge head — expected, not a live collision, per the plan's
-- renumber-at-rebase discipline). `feat/04f-A-maintenance` merged into `main` first and kept its own
-- 0119 (`0119_maintenance_decay.sql`); this migration renumbered mechanically to 0120 (next free) at
-- the post-04f-A-merge integration — this file's name, `_journal.json`'s appended entry, and every
-- column-count/migration-count tripwire that hardcoded "0119" (`core_loops_schema_migration.spec.ts`)
-- were reconciled in the SAME integration commit. Zero content change beyond the idx/name.
--
-- CREATE TYPE hl_card_status + CREATE TABLE highest_leverage_cards (design §3, D11): the ONE new table
-- this lot adds. `gameplay_sessions` / `structural_decisions_audit` / `player_progression_state` /
-- `exception_queue` are all REUSE-ACTIVATED (D1/D7/D8/D10/D4 — dormant tables/columns get their first
-- real runtime writer at C2/C3/C5) — ZERO schema change to any of them in this migration. This is the
-- lot's only new persisted entity: the HighestLeverageCard provider-registry's persisted row (the
-- session-open Loop 10 card — Commit/Skip semantics, carry-at-same-priority across sessions, D11).
--
-- session_ref: soft-ref to `gameplay_sessions` (the session that surfaced this card) — deliberately
-- NO DB-side FK (design §3 verbatim: "soft-ref `gameplay_sessions`"), mirroring the ch09 soft-ref
-- convention already used for `constraint_log.knot_id` / `autonomy_reports.player_decision` /
-- `admin_audit_log.target_player_id`. A card legitimately outlives the session that surfaced it (skip
-- carries the SAME card into the player's NEXT session, D11) — a hard FK with CASCADE would destroy a
-- carried card the moment its originating `gameplay_sessions` row is ever purged/rotated, and no
-- ON DELETE SET NULL semantics were specified by the design for this column.
--
-- decision_type: integer catalogue code, aligned with `structural_decisions_audit.decision_type`
-- (`progression_structural.ts:128`, GDD-verbatim int raw catalogue) — the `StructuralDecisionType`
-- closed catalogue (D7, C5) owns the concrete int codes; this column stores the SAME domain so a
-- committed structural-typed card's governor audit row and its originating HL card agree on one int
-- vocabulary (no separate enum here — advisory/tactical card types share the column, only
-- catalogue-structural ones route through the governor at commit, D11/D8).
--
-- target_ref / options: provider-owned jsonb (compact ref / 2..4 qualitative `DecisionOption`) — NEW
-- NOT NULL + default safe-empty, mirroring `exception_queue.candidate_actions` / `.suggested_action`'s
-- own convention (09/schema_queues_exceptions_cuestack.md).
--
-- impact_internal / urgency_internal: real NOT NULL, server-only raw floats [0..1] (R2.2 BO-only —
-- provider-normalized; the client sees `ImpactEstimateBucket`/`UrgencyBucket` projections, C7 — never
-- these two raw columns).
--
-- status hl_card_status ('active'|'committed'|'skipped'|'superseded') NOT NULL DEFAULT 'active' — the
-- card lifecycle (D11): computed active → either committed (governor-routed if structural) or skipped
-- (carries) → superseded when a fresher higher-scored candidate supplants a carried card.
--
-- Indexes (design §3, 2 total): `(player_id, status)` — the session-open "find my active/carried card"
-- hot path; `(player_id, surfaced_at DESC)` — BO diagnostic history ordering (mirrors
-- `gameplay_sessions_player_started_idx`'s own recency-index shape).
--
-- GRANTs mirror the 0114/0117 pattern (app_rw least-privilege runtime role — SELECT/INSERT/UPDATE/DELETE,
-- no schema-owner privileges).

--> statement-breakpoint

-- hl_card_status: the 4-member NEW pgEnum (D11, design §3) — must match verbatim the TS union
-- `HlCardStatusEnumTs` (db/schema/core_loops.ts, this same commit).
CREATE TYPE "hl_card_status" AS ENUM (
  'active',
  'committed',
  'skipped',
  'superseded'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "highest_leverage_cards" (
  "card_id"           uuid            NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"         uuid            NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "session_ref"       uuid,
  "decision_type"     integer         NOT NULL,
  "target_ref"        jsonb           NOT NULL DEFAULT '{}'::jsonb,
  "impact_internal"   real            NOT NULL,
  "urgency_internal"  real            NOT NULL,
  "options"           jsonb           NOT NULL DEFAULT '[]'::jsonb,
  "status"            hl_card_status  NOT NULL DEFAULT 'active',
  "surfaced_at"       timestamptz     NOT NULL DEFAULT now(),
  "resolved_at"       timestamptz
);

--> statement-breakpoint

-- (player_id, status): the session-open "does this player have an active/carried card right now" probe
-- (design §3 index 1) — C6's compute-at-open + the C7 session payload aggregation.
CREATE INDEX "highest_leverage_cards_player_status_idx"
  ON "highest_leverage_cards" ("player_id", "status");

--> statement-breakpoint

-- (player_id, surfaced_at DESC): BO diagnostic history ordering (design §3 index 2) — C8's hl-card
-- diagnostic endpoint (full provider candidate list + history, §10).
CREATE INDEX "highest_leverage_cards_player_surfaced_idx"
  ON "highest_leverage_cards" ("player_id", "surfaced_at" DESC);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "highest_leverage_cards" TO app_rw;
