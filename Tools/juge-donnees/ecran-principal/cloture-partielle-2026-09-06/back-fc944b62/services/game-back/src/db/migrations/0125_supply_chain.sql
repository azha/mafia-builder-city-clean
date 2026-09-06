-- migration 0125: supply_chain (P3-C C1 — Supply-Chain Loops data model, ch05 Loops 3-5:
-- Backpressure Trace / Sinuosity Debt / Mycelial Ledger)
-- Plan: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md C1
-- Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §10 (data model, verbatim) +
--         §7.1 (route additive columns) + §15 (I1/I2/I5 DB-enforced invariants)
-- Decisions: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-decisions.md §1.1 D1 (ONE migration,
--         tables NEW in schema_core_loops.md §10 — RULING P3-A #6 applied) + §1.2 D2 (leg = logical
--         edge, UNIQUE DB-enforced) + §1.7 D7 (backpressure 1-1 table, soft-ref arrow) + §6 RULING
--         (sub-décision #4 ratifiée: leg identity = (player, origin, dest))
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md §10 (NEW tables) +
--       schema_operational_chain.md §7.22 (route additive columns, pointer cross-ref) — same commit.
--
-- ★ idx final, reconciled at integration (04f-B merged first with its own 0124). This file was
-- authored as 0124-provisional: `_journal.json` head on this base (verified fresh at C0,
-- `feat/p3-C-supply-chain` @ `eb1ee294`) was idx 123 — this migration took the actual next-free idx
-- 0124 at authoring time (NOT the design/plan/decisions docs' own "0130 provisional" placeholder —
-- that number reserved buffer room against 04f-B that turned out unnecessary once re-checked against
-- the live journal, C0 §8.1/§8.4(d)). `feat/04f-B-recruitment` merged into `main` first (integration
-- `26ccbcdf` + merge `f2e0caa5`) and kept its own 0124 (`0124_recruitment_quests`, renumbered there
-- from its own pre-integration `0120`); this migration renumbered mechanically to 0125 (next free) at
-- the post-04f-B-merge integration — this file's name, `_journal.json`'s entry, and every tripwire
-- asserting through this idx (`supply_chain_schema_migration.spec.ts`) were reconciled in the SAME
-- integration commit, zero content change beyond the idx/name — the SAME renumber-at-rebase
-- discipline already used repeatedly (0119→0120/0121/0122, 04f-A/P3-A; 0122-provisional→0123, P3-B).
-- The design/plan/decisions docs' own "0130 provisional" citations are left as-authored; a reconcile
-- pointer lives in `2026-07-12-p3-C-supply-chain-decisions.md §9`.
--
-- PART 1 — 1 NEW pgEnum (design §10.1):
--   mycelial_maintenance_mode (3 LIVE members — the Loop 5 maintenance verb's 3 canon modes, D-register
--     §1.4 D4/§5.4). Must match verbatim the TS union `MycelialMaintenanceModeEnumTs`
--     (db/schema/supply_chain_loops.ts, this same commit).
--
-- PART 2 — 2 NEW tables (design §10.1/§10.2):
--   supply_chain_legs — the Loop 5 per-LEG debt ledger (D2: leg = the logical edge (player, origin,
--     dest), NOT route, NOT block — sub-décision #4 RATIFIED). Leg identity is DB-enforced FROM THE
--     START (I1, design §15): `UNIQUE (player_id, origin_building_id, destination_building_id)` — the
--     C2 upsert (`ON CONFLICT`) is the SOLE arbiter of identity, never a SELECT-then-INSERT race. I2
--     (`debt_load ∈ [0, cap]`) splits the floor into a DB CHECK (`>= 0`, hard, no tension with any
--     tunable) and the ceiling into an application-layer `LEAST()` clamp against the hot-reloadable
--     `core_loops.mycelial_debt_cap` getter (NOT a DB CHECK — the SAME deliberate asymmetry P3-B's own
--     `lieutenant_flag_state.credibility_tokens` shipped, mig 0123, decisions §1.3 there: a DB constant
--     would either block legitimate tunable raises or admit stale caps). `stress_streak` gets its own
--     non-negative-counter CHECK (plan §C1 floor: "CHECKs per design ... non-negative counters").
--     `maintenance_mode`/`maintenance_completes_at_tick` pair per design §10.1's own exact-form
--     instruction ("(maintenance_mode IS NULL) = (maintenance_completes_at_tick IS NULL) sauf bypass")
--     — REROUTE_BYPASS is a STATE, not a timed job (design §5.4: "durée : état, pas durée" — exit is
--     `debt_load <= bypass_resume_threshold`, never a deadline), so the 3-way CHECK below carves that
--     mode out of the NULL-pairing rule explicitly, rather than smuggling a fake deadline into the
--     column just to satisfy a 2-way pairing.
--   supply_node_pressure — the Loop 3 per-NODE backpressure ledger (D7: a separate 1-1 table, PK
--     `(player_id, building_id)` — the `corridor_debt` shape, mig 0076 — NOT an ALTER of
--     `building_operational_state`, zero collision surface with the in-flight 04f-B lot which owns
--     that table's maintenance/decay columns). `backpressure_index` gets BOTH bounds as a DB CHECK
--     (design §10.2 "CHECK (0 ≤ … ≤ 1)" — unlike `debt_load`, canon gives backpressure a hard ceiling
--     of 1.0 with no tunable-raise tension, so both floor and ceiling are DB-enforced here, I5).
--     `arrow_to_building_id` is a SOFT-REF (no FK) — mirrors `corridor_debt.block_id`'s own soft-ref
--     convention (mig 0076, schema_operational_chain.md §7.17.2): the pointed-to building is always a
--     REAL FK'd building elsewhere (via the leg it arrived through), so a second FK here would be
--     redundant DDL, not additional safety.
--
-- PART 3 — 3 ADDITIVE columns on `route` (design §7.1, D-register D1):
--   patch_count / last_rebuilt_at_tick / rebuild_completes_at_tick — the Loop 4 sinuosity-patch/rebuild
--   surface C7 will consume (patch sweep + the 3 rebuild modes' downtime-armed claim, mirrors 04f-A's
--   own `maintenance_completes_at_day` downtime-armed shape, mig 0119). DEFAULT-safe for every existing
--   row (`patch_count` 0, the other 2 NULL) — zero-regression (no existing route dispatch/replan path
--   reads these columns until C7 wires them). `patch_count` gets the SAME non-negative-counter CHECK
--   convention as `supply_chain_legs.stress_streak` above.
--
-- GRANTs mirror the 0114/0117 pattern (app_rw least-privilege runtime role — SELECT/INSERT/UPDATE/
-- DELETE) on the 2 NEW tables. No GRANT needed for the 3 `route` columns — `route` already carries its
-- runtime GRANT from an earlier migration (table-level GRANT UPDATE covers columns added later, same
-- reasoning 04f-A's own mig 0119 §7.21.9 documents for `building_operational_state`).

--> statement-breakpoint

-- mycelial_maintenance_mode — the Loop 5 maintenance-verb's 3 canon modes (design §5.4, D-register D4).
-- Must match db/schema/supply_chain_loops.ts's `mycelialMaintenanceMode` pgEnum verbatim.
CREATE TYPE "mycelial_maintenance_mode" AS ENUM (
  'quick_patch',
  'structural_reinforce',
  'reroute_bypass'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "supply_chain_legs" (
  "leg_id"                         uuid                          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                      uuid                          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "origin_building_id"             uuid                          NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "destination_building_id"        uuid                          NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "debt_load"                      real                          NOT NULL DEFAULT 0,
  "stress_streak"                  smallint                      NOT NULL DEFAULT 0,
  "last_throughput_tick"           bigint,
  "last_decay_eval_tick"           bigint,
  "maintenance_mode"               mycelial_maintenance_mode,
  "maintenance_completes_at_tick"  bigint,
  "bypassed"                       boolean                       NOT NULL DEFAULT false,
  "created_at"                     timestamptz                   NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- Leg identity, DB-enforced FROM THE START (I1, design §10.1/§15): the C2 upsert's ON CONFLICT arbiter.
ALTER TABLE "supply_chain_legs"
  ADD CONSTRAINT "supply_chain_legs_identity_unique"
  UNIQUE ("player_id", "origin_building_id", "destination_building_id");

--> statement-breakpoint

-- I2 floor half (the ceiling is the app-layer LEAST(cap) clamp against the hot-reloadable
-- core_loops.mycelial_debt_cap getter — NOT a DB CHECK, same deliberate asymmetry as mig 0123's
-- lieutenant_flag_state.credibility_tokens).
ALTER TABLE "supply_chain_legs"
  ADD CONSTRAINT "supply_chain_legs_debt_load_chk"
  CHECK ("debt_load" >= 0);

--> statement-breakpoint

-- Non-negative counter (plan §C1 floor).
ALTER TABLE "supply_chain_legs"
  ADD CONSTRAINT "supply_chain_legs_stress_streak_chk"
  CHECK ("stress_streak" >= 0);

--> statement-breakpoint

-- (maintenance_mode IS NULL) = (maintenance_completes_at_tick IS NULL), EXCEPT reroute_bypass (a STATE,
-- not a timed job — design §5.4/§10.1's own exact-form instruction).
ALTER TABLE "supply_chain_legs"
  ADD CONSTRAINT "supply_chain_legs_maintenance_pairing_chk"
  CHECK (
    ("maintenance_mode" IS NULL AND "maintenance_completes_at_tick" IS NULL)
    OR ("maintenance_mode" = 'reroute_bypass' AND "maintenance_completes_at_tick" IS NULL)
    OR ("maintenance_mode" IN ('quick_patch', 'structural_reinforce') AND "maintenance_completes_at_tick" IS NOT NULL)
  );

--> statement-breakpoint

-- (player_id): the per-player leg listing / decay-sweep scan (mirrors corridor_debt_player_idx, mig 0076).
CREATE INDEX "supply_chain_legs_player_idx"
  ON "supply_chain_legs" ("player_id");

--> statement-breakpoint

-- Partial index on maintenance_mode IS NOT NULL — the MYCELIAL_MAINTENANCE_ADVANCE (MINUTE/27 prov.)
-- job-completion scan (design §11), organic no-op for players with no in-flight maintenance job.
CREATE INDEX "supply_chain_legs_maintenance_pending_idx"
  ON "supply_chain_legs" ("maintenance_completes_at_tick")
  WHERE "maintenance_mode" IS NOT NULL;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "supply_node_pressure" (
  "player_id"               uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"             uuid          NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "backpressure_index"      real          NOT NULL DEFAULT 0,
  "is_blocked_output"       boolean       NOT NULL DEFAULT false,
  "blocked_sources"         jsonb         NOT NULL DEFAULT '[]'::jsonb,
  "arrow_to_building_id"    uuid,
  "source_distance_hops"    smallint,
  "last_propagation_tick"   bigint,
  PRIMARY KEY ("player_id", "building_id")
);

--> statement-breakpoint

-- I5 (design §15): backpressure_index ∈ [0,1] — BOTH bounds DB-enforced (canon gives a hard ceiling
-- with no tunable-raise tension, unlike mycelial's debt_load — see the file header note).
ALTER TABLE "supply_node_pressure"
  ADD CONSTRAINT "supply_node_pressure_backpressure_index_chk"
  CHECK ("backpressure_index" >= 0 AND "backpressure_index" <= 1);

--> statement-breakpoint

-- Partial index on is_blocked_output — the BACKPRESSURE_UPDATE (MINUTE/26 prov.) per-tick scan (design
-- §6.2/§11): organic no-op for players with no blocked output this tick.
CREATE INDEX "supply_node_pressure_blocked_idx"
  ON "supply_node_pressure" ("player_id")
  WHERE "is_blocked_output" = true;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "supply_chain_legs" TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON "supply_node_pressure" TO app_rw;

--> statement-breakpoint

-- route — 3 ADDITIVE columns (design §7.1, D1). DEFAULT-safe for every existing row (patch_count 0, the
-- other 2 NULL) — zero-regression (C7 is the first consumer). No GRANT needed — route already carries
-- its runtime GRANT from an earlier migration (table-level GRANT UPDATE covers columns added later).
ALTER TABLE "route"
  ADD COLUMN IF NOT EXISTS "patch_count"                 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_rebuilt_at_tick"         bigint,
  ADD COLUMN IF NOT EXISTS "rebuild_completes_at_tick"    bigint;

--> statement-breakpoint

-- Non-negative counter (plan §C1 floor — same convention as supply_chain_legs.stress_streak above).
ALTER TABLE "route"
  ADD CONSTRAINT "route_patch_count_chk"
  CHECK ("patch_count" >= 0);
