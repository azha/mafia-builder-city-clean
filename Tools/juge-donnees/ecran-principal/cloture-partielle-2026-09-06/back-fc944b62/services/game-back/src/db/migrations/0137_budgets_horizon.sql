-- migration 0137: budgets_horizon (P3-G C1 — Budgets & Horizon data model, ch06 successor lot)
-- Plan: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C1
-- Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §3 (data model, verbatim)
-- Decisions: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-decisions.md DD-G3 (ONE migration,
--         2 NEW tables + horizon-table extension) + DD-G4 (the extension rides the dormant window).
-- C0 re-anchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §1 (journal head 136 confirmed,
--         this branch takes idx 137, zero drift) + §3 R1 (enum ALTER mechanics, DEFINITIVE) + §9 R10
--         (unique pair index, DEFINITIVE).
--
-- ★ LOUD DIVERGENCE FROM DD-G3 (found by the C1 floor's own TDD red, not a C0/design reserve — routed to
-- ⊥ review, not silently absorbed): DD-G3 mandates "ONE provisional migration 0137". This chunk in fact
-- ships as **0137 + 0138** (immediate sibling, SAME commit, SAME C1 chunk) — a hard PostgreSQL
-- transactional restriction, empirically confirmed against this exact stack (`ALTER TYPE ... ADD VALUE`
-- inside a transaction makes the new label UNUSABLE — including inside a CHECK constraint DEFINITION,
-- not just DML — until that transaction COMMITs; this repo's migration runner is one-tx-per-file, so the
-- ADD VALUE and any CHECK referencing the new label CANNOT share a file). The pre-existing
-- `phc_view_status_adopted_at_chk` (mig 0008, ch09 Task 10) is a CLOSED enumeration over the ORIGINAL 4
-- `view_status` values — R1's enum ADD VALUE alone makes `'dismissed'` a LIVE label but leaves it
-- structurally UNWRITABLE (neither CHECK disjunct matches any row with `view_status='dismissed'`),
-- defeating the plan's own C1 falsifiable text ("a card can be set view_status='dismissed'"). Design §3's
-- own `dismissed_at` column semantics ("write-once at dismiss") fully determine the ONLY correct fix — no
-- design CHOICE is being made here, purely a mechanical PG necessity: extend the CHECK with a 3rd
-- disjunct, in `0138_possibility_horizon_dismissed_check.sql`'s OWN transaction (this file's ADD VALUE
-- commits first). See that file's own header for the extended CHECK.
--
-- Three surfaces, mig 0137 (DD-G3 — the DD-F4 argument verbatim, all consumed across C2-C10):
--
-- (1) "capability_adoptions" (design §3, NEW TABLE) — at most ONE adoption per capability per player
--   (permanent v1 — no suspension columns until ★#3's DEFERRED engine exists; adding them later is
--   additive, decisions §6 ★#3). PK composite `(player_id, capability_id)` — the SAME "at-most-one" shape
--   `mastery_score`/`player_proficiency` (mig 0135) already establish for their own per-(player,category)
--   ledgers. Append-only applicative discipline (INSERT-only repository, C5's `AdoptionService` — the
--   DB-level REVOKE trigger is a deferred TD, mirrors mig 0135's own `graduation_events` posture).
--
-- (2) "capability_debts" (design §3, NEW TABLE) — PK composite `(player_id, capability_id)`, the SAME
--   shape. `structural_debt numeric(8,2) CHECK (>= 0)` is the canon floor as a CHECK — belt-and-suspenders
--   alongside the C7/C8 floor-guarded single-statement decrements (design §12.1/§12.3). `decay_path`
--   mirrors the `mastery_score.delegation_state`/`promotion_locks.unmanaged_window_state` convention
--   (varchar+CHECK, never a native pgEnum for a closed-but-small value set, D1-lot-wide precedent
--   reconduced from P3-B/P3-C/P3-D/P3-E/P3-F). Partial index `capability_debts_active_idx` on
--   `(player_id) WHERE structural_debt > 0` is the C8 `ISOSTATIC_DEBT_TICK` (HOURLY/8) set-based decay
--   scan's own query shape (canon F4 index transposed, the `promotion_locks_window_state_end_idx`-
--   adjacent precedent).
--
-- (3) "possibility_horizon_cards" EXTENSION (design §3, DORMANT-window ride — DD-G4) — the table has
--   ZERO rows and ZERO runtime consumers on this base (C0 re-anchor §2 row 2, re-confirmed this session):
--     (a) pgEnum `possibility_card_view_status` gains member `'dismissed'` — R1-DEFINITIVE: plain
--         `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, mirroring `0115_liveops_active_status_ended.sql`
--         byte-for-byte (3 prior in-repo precedents on this exact PG16/one-tx-per-file runner: 0019/0115/
--         0119). The ONE restriction PG imposes — the added value cannot be USED (DML/default/comparison)
--         in the SAME transaction as the ADD — is honored by construction: this migration does ONLY the
--         ADD, zero DML anywhere in this file references `'dismissed'`.
--     (b) NEW columns: `predicate_regressed` (D6 regression overlay, orthogonal to `view_status` — a
--         DEFERRED card can regress, design §7.3), `dismissed_at` (write-once at dismiss, D8 — data-inert
--         v1, the vocab-tier capabilities are `dismissible:false`), `surfaced_predicate_snapshot` (the
--         canon `CapabilityHorizonSurfacedEvent.predicate_snapshot`, persisted for the BO "why did this
--         surface" diagnostic — divergence #14).
--     (c) R10-DEFINITIVE unique-pair index: `possibility_horizon_cards_player_capability_idx` (mig-0007
--         plain, non-unique — confirmed by direct read, C0 re-anchor §9) is 100% SUBSUMED by a NEW
--         UNIQUE index on the SAME `(player_id, capability_id)` pair — SAME columns, no additional
--         ordering the plain index offered. Mirrors the `gameplay_sessions_active_partial_idx` →
--         `gameplay_sessions_active_unique_idx` precedent EXACTLY (mig 0121 — "a unique b-tree index
--         serves every read the plain one did ... keeping both would be pure write-amplification with
--         zero read benefit"): DROPPED + REPLACED in this same migration, not kept alongside. This is the
--         race-freedom guarantee C3's INSERT-if-absent surfacing needs (design §7.3) — a second concurrent
--         surfacing attempt for the SAME (player, capability) now fails with a unique-violation (23505)
--         instead of silently creating a duplicate card.
--
-- ZERO other pgEnum NEW (D1-lot-wide convention, P3-B/P3-C/P3-D/P3-E/P3-F precedent reconduced) —
-- `decay_path` is varchar+CHECK, mirrors `mastery_score.delegation_state`/`promotion_locks.
-- unmanaged_window_state` exactly.
--
-- GRANTs mirror the mig 0135/0136 pattern (app_rw least-privilege runtime role — UPDATE explicit;
-- SELECT + INSERT auto-granted via mig 0013's ALTER DEFAULT PRIVILEGES) for the 2 NEW tables. The
-- `possibility_horizon_cards` extension needs no new GRANT (the table's own GRANTs predate this lot,
-- ch09 Task 10 — adding columns/an index does not change the existing privilege set).
--
-- R9.3: same-commit — docs/tech/09_data_model/schema_core_loops.md §16 (NEW tables, fixed sub-structure)
-- + schema_player_progression_state.md (budget-columns activation note) + schema_progression_structural.md
-- (horizon-table extension + activation note) + README journal row. gdd/14 §Meta normalized (§15). gdd/15
-- NEW terms (§18).

--> statement-breakpoint

-- ===== capability_adoptions (design §3 — at most ONE adoption per capability per player, permanent v1) =====
CREATE TABLE IF NOT EXISTS "capability_adoptions" (
  "player_id"                uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "capability_id"             integer       NOT NULL,
  "adopted_at"                timestamptz   NOT NULL DEFAULT now(),
  "card_id"                   uuid,
  "free_units_at_adoption"    smallint      NOT NULL,
  "game_tick"                 bigint        NOT NULL,
  PRIMARY KEY ("player_id", "capability_id")
);

--> statement-breakpoint

-- The player's own adoption-history read pattern (design §11 forensics — "the last N adoptions, newest
-- first" BO surface + the C4 recompute/C9 projection's own per-player scan).
CREATE INDEX "capability_adoptions_player_adopted_idx"
  ON "capability_adoptions" ("player_id", "adopted_at" DESC);

--> statement-breakpoint

GRANT UPDATE ON "capability_adoptions" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== capability_debts (design §3/§12 — Isostatic Debt, PK composite mirrors mastery_score's own shape) =====
CREATE TABLE IF NOT EXISTS "capability_debts" (
  "player_id"          uuid           NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "capability_id"       integer        NOT NULL,
  "capacity"            smallint       NOT NULL DEFAULT 0,
  "structural_debt"     numeric(8,2)   NOT NULL DEFAULT 0,
  "last_upgrade_tick"    bigint,
  "last_decay_tick"      bigint,
  "decay_path"          varchar(8)     NOT NULL DEFAULT 'NONE',
  PRIMARY KEY ("player_id", "capability_id")
);

--> statement-breakpoint

-- The canon floor as a CHECK — belt-and-suspenders alongside the C7/C8 floor-guarded single-statement
-- decrements (design §12.1/§12.3, "never below zero" applicative discipline).
ALTER TABLE "capability_debts"
  ADD CONSTRAINT "capability_debts_structural_debt_chk"
  CHECK ("structural_debt" >= 0);

--> statement-breakpoint

-- Canon DebtDecayModeEnum realized as varchar+CHECK (BO audit field) — mirrors mastery_score.
-- delegation_state / promotion_locks.unmanaged_window_state (D1-lot-wide convention).
ALTER TABLE "capability_debts"
  ADD CONSTRAINT "capability_debts_decay_path_chk"
  CHECK ("decay_path" IN ('ACTIVE', 'PASSIVE', 'MIXED', 'NONE'));

--> statement-breakpoint

-- The C8 ISOSTATIC_DEBT_TICK (HOURLY/8) set-based decay scan's own query shape (canon F4 index
-- transposed) — "every row with outstanding debt", never a full-table scan.
CREATE INDEX "capability_debts_active_idx"
  ON "capability_debts" ("player_id")
  WHERE "structural_debt" > 0;

--> statement-breakpoint

GRANT UPDATE ON "capability_debts" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== possibility_horizon_cards EXTENSION (design §3, DD-G4 — rides the dormant window) =====

-- R1-DEFINITIVE (C0 re-anchor §3): plain ADD VALUE, mirrors 0115_liveops_active_status_ended.sql. ZERO
-- DML in this file references 'dismissed' (the ONE restriction PG imposes on ADD VALUE in-tx).
ALTER TYPE "possibility_card_view_status" ADD VALUE IF NOT EXISTS 'dismissed';

--> statement-breakpoint

-- D6 regression overlay — orthogonal to view_status (a DEFERRED card can regress, design §7.3).
ALTER TABLE "possibility_horizon_cards"
  ADD COLUMN "predicate_regressed" boolean NOT NULL DEFAULT false;

--> statement-breakpoint

-- D8 — write-once at dismiss (data-inert v1, the vocab-tier capabilities are dismissible:false).
ALTER TABLE "possibility_horizon_cards"
  ADD COLUMN "dismissed_at" timestamptz;

--> statement-breakpoint

-- The canon CapabilityHorizonSurfacedEvent.predicate_snapshot, persisted for the BO "why did this
-- surface" diagnostic (divergence #14 — the cheap read half of canon's full predicate-evaluation-log).
ALTER TABLE "possibility_horizon_cards"
  ADD COLUMN "surfaced_predicate_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb;

--> statement-breakpoint

-- ★ The CHECK-constraint fix this column needs (`phc_view_status_adopted_at_chk`, mig 0008, is a CLOSED
-- enumeration over the ORIGINAL 4 view_status values — it structurally REJECTS every 'dismissed' row
-- regardless of dismissed_at) is NOT here — see 0138_possibility_horizon_dismissed_check.sql's own header
-- for why it MUST be a separate migration (a hard PG transactional restriction, empirically confirmed,
-- not a design choice — DD-G3's "ONE migration" framing could not anticipate this).

--> statement-breakpoint

-- R10-DEFINITIVE (C0 re-anchor §9): the plain non-unique index this UNIQUE index subsumes (mig 0007) —
-- SAME columns, zero remaining read use case once the unique index exists (mirrors mig 0121's own
-- gameplay_sessions_active_partial_idx -> _unique_idx subsumption, verbatim reasoning).
DROP INDEX IF EXISTS "possibility_horizon_cards_player_capability_idx";

--> statement-breakpoint

-- The C3 INSERT-if-absent surfacing's own race-freedom guarantee (design §7.3) — a second concurrent
-- surfacing attempt for the SAME (player, capability) now fails with a unique-violation (23505) instead
-- of silently creating a duplicate card.
CREATE UNIQUE INDEX "possibility_horizon_cards_player_capability_unique_idx"
  ON "possibility_horizon_cards" ("player_id", "capability_id");
