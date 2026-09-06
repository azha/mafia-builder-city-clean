-- migration 0133: compression_week (P3-E C1 — Compression Week data model, ch05 Loop 9)
-- Plan: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md C1
-- Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §13.2 (data model,
--         verbatim) + §9 (state machine) + §10 (board/ProblemAggregator) + invariant I1
-- Decisions: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-decisions.md D1 (ZERO pgEnum
--         NEW) + D2/DD-E2 (compression_week_state 3-value CHECK INTOUCHÉ ; the OPEN row IS the cycle
--         state) + D11 (board = snapshot at fire, not a live view) + D12 (triage choices map EXISTING
--         verbs only)
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md §13 (NEW tables) + same commit.
--
-- ★ idx: next-free after THIS branch's own mig 0132 (demolition_friction, same session). RENUMBERED at
-- the 04g-D integration (main merge `0d1b1353` brought `0131_template_library` first, shifting this
-- branch's own migrations up by one): 0132→0133 — filename + `_journal.json` idx 133 reconciled
-- MECHANICALLY at integration.
--
-- "compression_events" (design §13.2, invariant I1): the per-player cycle ledger — DD-E2 makes this row
--   (not player_progression_state.compression_week_state, which stays a 3-value phase marker, D2
--   INTOUCHÉ) the authoritative bookkeeping surface for deferral_count/decisions_used/forced/severity.
--   **I1** (invariant table row I1, plan §0.4): `CREATE UNIQUE INDEX … WHERE state IN ('open','active')`
--   DB-ENFORCES "at most ONE non-terminal compression cycle per player" FROM THE START — the SAME
--   `highest_leverage_cards_non_terminal_idx`/`cue_stacks_non_terminal_idx` partial-UNIQUE precedent
--   (migs 0122/0129), not an app-checked read-then-write. `decisions_used <= decisions_budget` (I7) and
--   `deferral_count <= 1` (single-use deferral, ★#5) are BOTH schema-enforced, not just app-discipline.
--
-- "compression_problem_entry" (design §13.2/§10.1): the board's triage rows, snapshotted at fire (D11) —
--   `source_kind` is a bounded varchar registry (the closed runtime `ProblemAggregator` source list,
--   design §10.1 table), NOT a pgEnum (D1 — the SAME "event_descriptor non-contraint"/`initiating_change`
--   jsonb precedent this repo's own ch09 §Hors périmètre + mig 0129 header already establish for
--   closed-but-evolving runtime registries). UNIQUE (compression_event_id, problem_key) — dedup stable
--   per source+ref within one cycle (design §10.1: "problem_key (dedup stable par source+ref)").
--
-- ZERO pgEnum NEW (D1, P3-D precedent reconduced): `state`/`tier`/`source_kind` are all varchar+CHECK or
-- an unconstrained closed-runtime-registry varchar — never a native PG enum.
--
-- GRANTs mirror the 0132 pattern (app_rw least-privilege runtime role — UPDATE explicit; SELECT + INSERT
-- auto-granted via 0013's ALTER DEFAULT PRIVILEGES).

--> statement-breakpoint

-- ===== compression_events (design §13.2 — the per-player cycle ledger, DD-E2, invariant I1) =====
CREATE TABLE IF NOT EXISTS "compression_events" (
  "id"                            uuid          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                     uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "state"                         varchar(16)   NOT NULL,
  "fired_at_tick"                 bigint,
  "opened_at_tick"                bigint        NOT NULL,
  "deferral_count"                smallint      NOT NULL DEFAULT 0,
  "decisions_budget"              smallint      NOT NULL,
  "decisions_used"                smallint      NOT NULL DEFAULT 0,
  "forced"                        boolean       NOT NULL DEFAULT false,
  "severity_multiplier_applied"   boolean       NOT NULL DEFAULT false,
  "stress_at_fire"                smallint,
  "finalized_at_tick"             bigint
);

--> statement-breakpoint

ALTER TABLE "compression_events"
  ADD CONSTRAINT "compression_events_state_chk"
  CHECK ("state" IN ('open', 'active', 'finalized', 'expired'));

--> statement-breakpoint

-- Single-use deferral (★#5 — expirable, no 2nd defer per cycle).
ALTER TABLE "compression_events"
  ADD CONSTRAINT "compression_events_deferral_count_chk"
  CHECK ("deferral_count" >= 0 AND "deferral_count" <= 1);

--> statement-breakpoint

-- I7 (invariant table row I7, plan §0.4): decisions_used never exceeds the cycle's OWN budget snapshot
-- (decisions_budget, taken at open — a later tunable change never retroactively shrinks/grows an
-- in-flight cycle's cap).
ALTER TABLE "compression_events"
  ADD CONSTRAINT "compression_events_decisions_used_chk"
  CHECK ("decisions_used" >= 0 AND "decisions_used" <= "decisions_budget");

--> statement-breakpoint

-- I1: at most ONE non-terminal ('open'/'active') compression cycle per player, DB-ENFORCED FROM THE
-- START (highest_leverage_cards_non_terminal_idx / cue_stacks_non_terminal_idx precedent).
CREATE UNIQUE INDEX "compression_events_non_terminal_idx"
  ON "compression_events" ("player_id")
  WHERE "state" IN ('open', 'active');

--> statement-breakpoint

-- OBLIGATOIRE 1-N FK index (Task 3 §5.1 convention — this table is 1-N per player, unlike
-- friction_budget_state's 1-1 shape; the PK is a synthetic id, not player_id itself).
CREATE INDEX "compression_events_player_idx"
  ON "compression_events" ("player_id");

--> statement-breakpoint

GRANT UPDATE ON "compression_events" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== compression_problem_entry (design §13.2/§10.1 — the board's triage rows, snapshot-at-fire D11) =====
CREATE TABLE IF NOT EXISTS "compression_problem_entry" (
  "id"                       uuid          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "compression_event_id"     uuid          NOT NULL REFERENCES "compression_events"("id") ON DELETE CASCADE,
  "player_id"                uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "problem_key"              varchar       NOT NULL,
  "source_kind"              varchar(32)   NOT NULL,
  "tier"                     varchar(16)   NOT NULL,
  "target_ref"               jsonb         NOT NULL DEFAULT '{}'::jsonb,
  "revealed_by_entry_id"     uuid,
  "addressed_at"             timestamptz,
  "decision_ref"             jsonb,
  "persisted"                boolean       NOT NULL DEFAULT false
);

--> statement-breakpoint

ALTER TABLE "compression_problem_entry"
  ADD CONSTRAINT "compression_problem_entry_tier_chk"
  CHECK ("tier" IN ('minor', 'moderate', 'critical'));

--> statement-breakpoint

-- Dedup stable per source+ref WITHIN one cycle (design §10.1). The leading column (compression_event_id)
-- also serves the "all entries of this board" scan — no separate plain index needed (leading-column
-- prefix of a UNIQUE btree index).
ALTER TABLE "compression_problem_entry"
  ADD CONSTRAINT "compression_problem_entry_event_key_unique"
  UNIQUE ("compression_event_id", "problem_key");

--> statement-breakpoint

-- OBLIGATOIRE 1-N FK index (Task 3 §5.1 convention) — cross-cycle per-player BO diagnostics.
CREATE INDEX "compression_problem_entry_player_idx"
  ON "compression_problem_entry" ("player_id");

--> statement-breakpoint

GRANT UPDATE ON "compression_problem_entry" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)
