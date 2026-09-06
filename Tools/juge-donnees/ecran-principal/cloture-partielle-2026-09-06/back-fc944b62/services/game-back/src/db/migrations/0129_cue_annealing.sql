-- migration 0129: cue_annealing (P3-D C1 — Cue Stack & Annealing data model, ch05 Loops 6-7)
-- Plan: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md C1
-- Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §13 (data model, verbatim) +
--         §4.1 (cue_stacks ALTER) + §8/§9.1 (named_sequences/annealing_state) + §16 (R2.2 murs, forward)
-- Decisions: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-decisions.md §1.1 D1 (ONE migration,
--         tables NEW in schema_core_loops.md §11 — RULING P3-A #6 applied, ZERO pgEnum NEW) + §1.8 D8
--         (annealing = building dimension only, coexist-disjoint with Phase-11 lieutenant settling) +
--         §1.7 D7 (NamedSequence = snapshot template, cap 5 DB-atomic I4) + §6 RULING (★#1 = (a)
--         coexist-disjoint, #2-#10 défauts ratifiés)
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md §11 (NEW tables) +
--       schema_queues_exceptions_cuestack.md (§ additif "Activation P3-D", ALTER cue_stacks — the
--       table's own owner doc, one home per table) — same commit.
--
-- ★ idx: authored against THIS branch's own journal head (126, 127 entries, `_journal.json` re-read
-- fresh at C0/C1) at the then-next-free idx 0127, NOT the design/plan/decisions docs' own "0130
-- provisional" placeholder. RENUMBERED TWICE, once per integration, per the "whoever merges second
-- renumbers" protocol: 0127→0128 at the 04g-A integration (main merge `414753c2` brought
-- `0127_ambient_world`), then 0128→0129 at the 04g-B integration (main merge `d013f742` brought
-- `0128_random_world`) — filename + `_journal.json` idx 129 + the schema tripwire's own idx
-- assertions reconciled MECHANICALLY at each integration (the SAME renumber-at-rebase discipline used
-- repeatedly: 0119→0120/0121/0122 04f-A/P3-A; 0122-provisional→0123 P3-B; 0124-provisional→0125 P3-C). The design/plan/decisions docs' own "0130
-- provisional" citations are left as-authored; the reconciliation pointer lives in this lot's own
-- decisions doc (C9 closeout addendum).
--
-- PART 1 — ZERO NEW pgEnum (D1, design §13.2): cue slot statuses live IN the `slots` jsonb (no column);
--   `annealing_state.initiating_change` is a jsonb ChangeRef — both domains are fenced by their CLOSED
--   runtime registries (`SlotTypeExecutorRegistry` C3 / `InitiatingChangeRegistry` C6), not by a pgEnum —
--   the SAME "event_descriptor non-contraint" precedent ch09 established (schema_queues_exceptions_
--   cuestack.md §Hors périmètre).
--
-- PART 2 — 2 NEW tables (design §13.2):
--   named_sequences — the Loop 6 "one-tap auto-queue" snapshot template (D7): `slots_template` is a
--     jsonb snapshot of a FULL stack (types + targets + dependencies + order, NO statuses) — CHECK
--     `jsonb_array_length BETWEEN 4 AND 8` mirrors `cs_slots_length_chk`'s own upper/lower bound
--     (mig 0007) since a template IS a valid compose-able stack. `UNIQUE (player_id, name)` — a second
--     save under the same name is a 409, never a silent overwrite (D7). Cap 5 (I4) is NOT expressible as
--     a CHECK (a per-player row-count cap) — the C5 `INSERT … SELECT … WHERE count(*) < cap RETURNING`
--     is the SOLE arbiter, tested concurrent at that chunk; this migration ships ZERO cap enforcement of
--     its own (by design — the cap is atomic-insert-arbitrated, not schema-arbitrated).
--   annealing_state — the Loop 7 per-(player, building) settling ledger (D8 — BUILDING dimension ONLY,
--     coexist-disjoint with the PRE-EXISTING Phase-11 `lieutenant.settling_until_tick`, decisions §6.1
--     ★#1 RULED (a): zero column/assertion touched on `lieutenant`). PK composite `(player_id,
--     building_id)` — the `supply_node_pressure` shape (mig 0125) — ONE living row per node, re-initiated
--     by UPSERT (DD-ANNEAL-SINGLETON, decisions §2), never a growing event table (history is the bounded
--     `compounding_history` jsonb, F4 memory budget). `throughput_multiplier` gets BOTH bounds as a DB
--     CHECK (design §9.1 verbatim `> 0 AND <= 1`) — unlike `supply_chain_legs.debt_load`'s floor-only
--     asymmetry (mig 0125), canon gives this a hard [interior, 1] range with no tunable-raise tension (the
--     multiplier only ever SHRINKS toward 0 via compounding, never needs a raised ceiling). `settled` is
--     the derived-never-stored-elsewhere state flag the sweep (C6, `ANNEALING_SETTLE_SWEEP` MINUTE/30
--     provisional) flips exactly-once (I6) via `WHERE settled=false AND settling_ends_at <= now()
--     RETURNING` — "settling" itself is NEVER a stored boolean read by the app (`NOT settled AND
--     settling_ends_at > now()`, design §9.1, P1 state-not-timer strict) — `settled` here is the sweep's
--     OWN bookkeeping flag (has-this-row-been-swept), not the derived predicate the app queries.
--
-- PART 3 — 4 ADDITIVE columns on `cue_stacks` (design §4.1) + partial UNIQUE index I1:
--   `cue_stacks` is the DORMANT table ch09 Task 9 posed (mig 0007) — ZERO consumer until this lot
--   (decisions §0 row 1). The 2 EXISTING CHECKs (`cs_state_committed_at_chk`, `cs_slots_length_chk`,
--   mig 0007) are CONSERVED VERBATIM — this migration does not touch them (re-tested by the C1 floor,
--   both directions). 4 NEW server-only bookkeeping columns, all nullable (a fresh/pending stack has none
--   of them set): `session_ref` (soft-ref `gameplay_sessions`, NO FK — the `highest_leverage_cards.
--   session_ref` precedent, `core_loops.ts:46` — a stack legitimately outlives the session that committed
--   it), `executing_slot_index` (the sequential cursor, D-register DD-EXEC-SEQ — bounded CHECK `>= 0 AND
--   < 8`, the SAME bounded-index convention `buyer_roster_entry.slot_index_chk` established, mirrors the
--   `cs_slots_length_chk` upper bound of 8 slots), `executing_slot_started_minute` / `last_executed_game_
--   minute` (bigint game-minute markers, NO CHECK — mirrors `supply_chain_legs.last_throughput_tick`'s own
--   unconstrained-tick convention, mig 0125: a marker, not a counter). **I1** (design §4.1, invariant
--   table row I1): `CREATE UNIQUE INDEX … ON cue_stacks(player_id) WHERE state IN ('pending','committed',
--   'executing')` — DB-ENFORCES "at most ONE non-terminal stack per player" FROM THE START (the
--   `highest_leverage_cards_non_terminal_idx` precedent, mig 0122 — a partial UNIQUE index, not an
--   app-checked read-then-write); `resolved` (the ONE terminal state) is excluded, so a player may freely
--   have many resolved (historical) stacks alongside at most one live one.
--
-- GRANTs mirror the 0114/0117 pattern (app_rw least-privilege runtime role — SELECT/INSERT/UPDATE/
-- DELETE) on the 2 NEW tables. No GRANT needed for `cue_stacks`'s 4 new columns — `cue_stacks` already
-- carries `GRANT UPDATE, DELETE TO app_rw` from mig 0013 (a table-level GRANT with no column list covers
-- columns added later, the SAME reasoning `supply_chain_legs`'s own mig 0125 header documents for
-- `route`).

--> statement-breakpoint

-- ===== named_sequences (design §8/§13.2 — Loop 6 saved-template snapshot, D7) =====
CREATE TABLE IF NOT EXISTS "named_sequences" (
  "sequence_id"     uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"       uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "name"            text        NOT NULL,
  "slots_template"  jsonb       NOT NULL,
  "created_at"      timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- A template IS a valid compose-able stack — same 4..8 bound as cs_slots_length_chk (mig 0007), minus
-- the "0 OR" branch (a saved template is never empty; save-from-pending/committed always has 4-8 slots).
ALTER TABLE "named_sequences"
  ADD CONSTRAINT "named_sequences_slots_template_length_chk"
  CHECK (jsonb_array_length("slots_template") BETWEEN 4 AND 8);

--> statement-breakpoint

-- A second save under the same name is a 409 (D7), never a silent overwrite. Cap 5 (I4) is NOT a CHECK —
-- the C5 atomic-insert-with-count-guard is the sole arbiter (not expressible as a per-row constraint).
ALTER TABLE "named_sequences"
  ADD CONSTRAINT "named_sequences_player_name_unique"
  UNIQUE ("player_id", "name");

--> statement-breakpoint

CREATE INDEX "named_sequences_player_idx"
  ON "named_sequences" ("player_id");

--> statement-breakpoint

-- ===== annealing_state (design §9.1/§13.2 — Loop 7 per-(player,building) settling ledger, D8 ★#1(a)) =====
CREATE TABLE IF NOT EXISTS "annealing_state" (
  "player_id"                 uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"               uuid        NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "initiating_change"         jsonb       NOT NULL,
  "settling_started_at"       timestamptz NOT NULL,
  "settling_ends_at"          timestamptz NOT NULL,
  "changes_during_settling"   smallint    NOT NULL DEFAULT 0,
  "throughput_multiplier"     real        NOT NULL DEFAULT 0.9,
  "compounding_history"       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  "settled"                   boolean     NOT NULL DEFAULT false,
  "last_sweep_at"             timestamptz,
  PRIMARY KEY ("player_id", "building_id")
);

--> statement-breakpoint

-- Design §9.1 verbatim: BOTH bounds DB-enforced (unlike supply_chain_legs.debt_load's floor-only
-- asymmetry, mig 0125) — the multiplier only ever shrinks via compounding, no tunable-raise tension.
ALTER TABLE "annealing_state"
  ADD CONSTRAINT "annealing_state_throughput_multiplier_chk"
  CHECK ("throughput_multiplier" > 0 AND "throughput_multiplier" <= 1);

--> statement-breakpoint

-- Non-negative counter (the established convention — supply_chain_legs.stress_streak / route.patch_count,
-- mig 0125): the compounding count only ever increments (I5, UPSERT arithmetic in SQL).
ALTER TABLE "annealing_state"
  ADD CONSTRAINT "annealing_state_changes_during_settling_chk"
  CHECK ("changes_during_settling" >= 0);

--> statement-breakpoint

-- The sweep's own per-tick scan (ANNEALING_SETTLE_SWEEP, MINUTE/30 provisional, C6): organic no-op for
-- players with no live settling row (mirrors supply_node_pressure_blocked_idx / supply_chain_legs_
-- maintenance_pending_idx, mig 0125).
CREATE INDEX "annealing_state_unsettled_idx"
  ON "annealing_state" ("settling_ends_at")
  WHERE "settled" = false;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "named_sequences" TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON "annealing_state" TO app_rw;

--> statement-breakpoint

-- ===== cue_stacks — 4 ADDITIVE bookkeeping columns + partial UNIQUE index I1 (design §4.1) =====
-- The 2 EXISTING CHECKs (cs_state_committed_at_chk / cs_slots_length_chk, mig 0007) are NOT touched —
-- conserved verbatim, re-tested by the C1 floor (both directions).
ALTER TABLE "cue_stacks"
  ADD COLUMN IF NOT EXISTS "session_ref"                     uuid,
  ADD COLUMN IF NOT EXISTS "executing_slot_index"            smallint,
  ADD COLUMN IF NOT EXISTS "executing_slot_started_minute"   bigint,
  ADD COLUMN IF NOT EXISTS "last_executed_game_minute"       bigint;

--> statement-breakpoint

-- Bounded index CHECK (the buyer_roster_entry.slot_index_chk convention) — mirrors cs_slots_length_chk's
-- own upper bound of 8 slots (the cursor can never point past the last possible slot).
ALTER TABLE "cue_stacks"
  ADD CONSTRAINT "cs_executing_slot_index_chk"
  CHECK ("executing_slot_index" IS NULL OR ("executing_slot_index" >= 0 AND "executing_slot_index" < 8));

--> statement-breakpoint

-- I1 (design §4.1, invariant table row I1): at most ONE non-terminal stack per player, DB-ENFORCED FROM
-- THE START (the highest_leverage_cards_non_terminal_idx precedent, mig 0122) — 'resolved' (the ONE
-- terminal state) is excluded, so a player may accumulate many resolved (historical) stacks.
CREATE UNIQUE INDEX "cue_stacks_non_terminal_idx"
  ON "cue_stacks" ("player_id")
  WHERE "state" IN ('pending', 'committed', 'executing');
