-- migration 0100: ia_investigations table (04d-B C1 — IA Investigation Lifecycle)
-- Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md §State (:53-62)
-- R9.3: backported to docs/tech/09_data_model/schema_internal_affairs.md same-commit.
-- R2.2/P5: detection_events SERVER-ONLY — never forwarded raw to client.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: ADDITIVE only. No existing tables modified.
-- FK: target_id → internal_affairs_targets(target_id) ON DELETE CASCADE.
-- INDEX (target_id): cascade lookups + closeInvestigation target fetch.
-- INDEX (status): active sweep (openInvestigation guard + NIGHTLY scan).

--> statement-breakpoint

-- ia_investigations: investigation lifecycle (canon :53-62).
-- One row per opened investigation. status: active → completed_discovered | completed_clear | aborted.
-- closes_at: set at creation (opened_at + investigation_duration_days, default 21 days [PROV-Y26Q2]).
-- detection_events: SERVER-ONLY JSONB list of detection events. Never forwarded raw.
-- FK: target_id → internal_affairs_targets ON DELETE CASCADE.
CREATE TABLE IF NOT EXISTS "ia_investigations" (
  "investigation_id" uuid                    NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_id"        uuid                    NOT NULL
    REFERENCES "internal_affairs_targets"("target_id") ON DELETE CASCADE,
  "opened_at"        timestamptz             NOT NULL DEFAULT now(),
  "closes_at"        timestamptz             NOT NULL,
  "status"           ia_investigation_status NOT NULL DEFAULT 'active',
  "detection_events" jsonb                   NOT NULL DEFAULT '[]'::jsonb
);

--> statement-breakpoint

CREATE INDEX "ia_investigations_target_idx"
  ON "ia_investigations" ("target_id");

--> statement-breakpoint

CREATE INDEX "ia_investigations_status_idx"
  ON "ia_investigations" ("status");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "ia_investigations" TO app_rw;
