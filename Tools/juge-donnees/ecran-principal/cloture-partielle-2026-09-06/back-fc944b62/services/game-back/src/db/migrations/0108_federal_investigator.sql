-- migration 0108: investigator_type enum + federal_investigators table (04e-A1 C7 — ★ Substrate 2: federal investigator)
-- Plan: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C7
-- Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §4.2 (federal investigator)
--         + §9 item 3 (E-POL-11 honest-scaffolding immunity — RULED, locked)
-- R9.3: backported to docs/tech/09_data_model/schema_city_state.md §4.10 same-commit.
-- Zero-regression: ADDITIVE only. No existing table/column modified. `precinct_memory` (the LOCAL
-- investigator model, System 3) is untouched — this migration builds a SEPARATE structure for the
-- FEDERAL type.
--
-- WHY: E-POL-11 ("Federal task force") spawns a federal investigator (design §4.2) with DISTINCT
-- suspicion parameters from the local precinct_memory model (federal is slower-decay/more-surgical —
-- police-memory-tunables.ts federalSuspicionDecayPerTilePerDay/federalRaidTargetTemperature, C1) AND
-- structurally `corruption_exempt`. The corrupt-clerk mutation path is itself INERT today
-- (ia-target.service.ts:28,34,258 — no live caller); C7 builds a targeted rejection guard
-- (federal-investigator.guard.ts's attemptCorruptClerkMutation) proving the flag's effect, not a live
-- corruption-vs-investigator contest (deferred, plan §Deferred).

--> statement-breakpoint

-- investigator_type: local (the EXISTING precinct_memory model, System 3 — not retrofitted with this
-- column) | federal (this table's rows, C7).
CREATE TYPE "investigator_type" AS ENUM (
  'local',
  'federal'
);

--> statement-breakpoint

-- federal_investigators: 1-1 CHILD of player (PK = player_id, mirrors false_report_ledger_summary's
-- convention) — at most ONE federal investigator active per player at a time. Spawned/maintained by
-- PoliceMemoryService.runFederalInvestigatorReconcile (NIGHTLY/20, C7) reading the E-POL-11 GLOBAL
-- effect-modifier signal through the overlay (design §2.2); despawned (row deleted) when the signal
-- reverts to inactive. Never a mock — C7's own substrate_federal_investigator.spec.ts live-fires the
-- spawn/despawn via the REAL EffectModifierService.applyEvent/revertEvent.
CREATE TABLE IF NOT EXISTS "federal_investigators" (
  "player_id"                uuid NOT NULL PRIMARY KEY
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "investigator_type"        investigator_type NOT NULL DEFAULT 'federal',
  "suspicion_decay_per_day"  real NOT NULL,
  "raid_temperature"         real NOT NULL,
  "corruption_exempt"        boolean NOT NULL DEFAULT true,
  "spawned_at"               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "fi_suspicion_decay_chk" CHECK ("suspicion_decay_per_day" BETWEEN 0 AND 1),
  CONSTRAINT "fi_raid_temperature_chk" CHECK ("raid_temperature" BETWEEN 0 AND 2.0)
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "federal_investigators" TO app_rw;
