-- migration 0097: lawyers + legal_cases tables + 4 enums (04d-A C1 — Lawyer & Legal System G5)
-- Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §State (:69-100)
-- REUSE: player FK pattern (false_report_ledger.ts:20 — player CASCADE).
-- R9.3: backported to docs/tech/09_data_model/schema_lawyer.md + schema_legal_case.md same-commit.
-- R2.2/P5: burn_risk_score, info_leak_rate, info_leak_total SERVER-ONLY — never forwarded raw to client.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: ADDITIVE only. No existing tables modified.
-- dealer = reserved-inert (RATIFIÉ 2026-06-30 #5): declared, no live trigger (TD).

--> statement-breakpoint

-- lawyer_tier: the 3-tier defense model (canon :37-65).
-- public_defender (Tier-1, auto-assigned GRATUIT) | boutique (Tier-2) | corruption_pipeline (Tier-3).
CREATE TYPE "lawyer_tier" AS ENUM (
  'public_defender',
  'boutique',
  'corruption_pipeline'
);

--> statement-breakpoint

-- charge_severity: severity of the criminal charge (canon :83).
-- Courier derivation: cargo + reputation_at_catch [PROV-Y26Q2] (RATIFIÉ 2026-06-30 #3).
-- misdemeanor | felony_low — dismissable by Tier-3. felony_high | major_crime — not dismissable.
CREATE TYPE "charge_severity" AS ENUM (
  'misdemeanor',
  'felony_low',
  'felony_high',
  'major_crime'
);

--> statement-breakpoint

-- case_status: lifecycle of a legal case (canon :104-119 case timeline).
-- active → plea_down | acquitted | convicted | dismissed.
CREATE TYPE "case_status" AS ENUM (
  'active',
  'plea_down',
  'acquitted',
  'convicted',
  'dismissed'
);

--> statement-breakpoint

-- defendant_type: the category of person being defended (canon :85).
-- courier | lieutenant — have live caught paths. dealer — RESERVED-INERT (RATIFIÉ #5, TD).
CREATE TYPE "defendant_type" AS ENUM (
  'courier',
  'lieutenant',
  'dealer'
);

--> statement-breakpoint

-- lawyers: per-player lawyer roster (canon :69-81).
-- One row per hired lawyer (0..N per player). Tier-1 auto-assigned at LAWYER_UP.
-- burn_risk_score: SERVER-ONLY (R2.2/P5). Tier-3 IA-suspicion accumulator.
-- sessions_active: count of active cases assigned to this lawyer.
-- created_via_quest_id: nullable uuid — recruitment quest (Tier-2/3 only; Unity deferred TD).
-- FK: player_id → player(player_id) ON DELETE CASCADE.
CREATE TABLE IF NOT EXISTS "lawyers" (
  "lawyer_id"                  uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                  uuid        NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "tier"                       lawyer_tier NOT NULL,
  "name"                       varchar(64) NOT NULL,
  "retainer_active"            boolean     NOT NULL DEFAULT false,
  "retainer_monthly_cost_cents" integer,
  "burn_risk_score"            real        NOT NULL DEFAULT 0.0,
  "sessions_active"            integer     NOT NULL DEFAULT 0,
  "hired_at"                   timestamptz NOT NULL DEFAULT now(),
  "created_via_quest_id"       uuid
);

--> statement-breakpoint

CREATE INDEX "lawyers_player_idx"
  ON "lawyers" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON "lawyers" TO app_rw;

--> statement-breakpoint

-- legal_cases: per-player case lifecycle (canon :83-100).
-- One row per active legal case (LAWYER_UP path: C4 re-wire; lieutenant: C3 BuildingRaidedEvent; MIS: C3 tail_subpoena).
-- info_leak_rate / info_leak_total: SERVER-ONLY (R2.2/P5). Projected via LeakBandBucket (C9).
-- knowledge_set_ref / items_leaked: jsonb — lazy-computed at createCase (C3); items_leaked grows per C6 tick.
-- FK: player_id → player(player_id) ON DELETE CASCADE.
-- FK: lawyer_id → lawyers(lawyer_id) — nullable (set at createCase; may be upgraded via C5 reassignCase).
-- INDEX: (player_id, status) — active-case sweep (LEGAL_LEAK_TICK L1 skip) + BO endpoint.
CREATE TABLE IF NOT EXISTS "legal_cases" (
  "case_id"             uuid            NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"           uuid            NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "defendant_id"        uuid            NOT NULL,
  "defendant_type"      defendant_type  NOT NULL,
  "lawyer_id"           uuid
    REFERENCES "lawyers"("lawyer_id"),
  "charge_severity"     charge_severity NOT NULL,
  "info_leak_rate"      real            NOT NULL DEFAULT 0.0,
  "info_leak_total"     real            NOT NULL DEFAULT 0.0,
  "case_duration_ticks" integer         NOT NULL DEFAULT 0,
  "ticks_remaining"     integer         NOT NULL DEFAULT 0,
  "status"              case_status     NOT NULL DEFAULT 'active',
  "knowledge_set_ref"   jsonb,
  "items_leaked"        jsonb           NOT NULL DEFAULT '[]',
  "started_at"          timestamptz     NOT NULL DEFAULT now(),
  "resolved_at"         timestamptz
);

--> statement-breakpoint

CREATE INDEX "legal_cases_player_status_idx"
  ON "legal_cases" ("player_id", "status");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON "legal_cases" TO app_rw;
