-- migration 0117: live_ops_notification (04e-B C7 — sendNotifications intent-ledger + cap/cooldown +
-- fail-closed consent seam, G8)
-- Plan: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C7 (renumbered 0116 -> 0117 by DD-B4 §5
--         — DD-B4's C5-fix took 0115, C6 took 0116)
-- Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.7 (live_ops_notification) + §3.8
--         (NEW enums — PushConsentClass)
-- Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §2.4 (DD-B5 — the fail-CLOSED
--         marketing-consent seam realizing D4; DD-B5 adds NO consent-STORE schema — the consent store
--         itself is deferred to TD-087) + §3 (per-event push-consent classification, RULED)
-- Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md (push notices per event)
-- R9.3: backported to docs/tech/09_data_model/schema_live_ops_notification.md (NEW) — same commit.
-- Zero-regression: ADDITIVE only. No existing table/column modified.
--
-- live_ops_notification: the cap/cooldown/consent ENFORCEMENT LEDGER (D4/DD-B5) —
-- LiveOpsNotificationService.sendNotifications writes ONE intent row per recipient IFF consent-class
-- allows (SERVICE always; MARKETING iff the fail-closed MarketingConsentPort seam resolves opted-in,
-- decisions.md §2.4) AND the per-player daily cap (T.bo.push.daily_cap_per_player, BO-owned REUSE, C7
-- is the first code reader) is not reached AND the per-(player, cooldown_key) cooldown
-- (liveops.notification_cooldown_hours, REUSE) has elapsed. Device push TRANSPORT is TD (no FCM/APNs
-- day-1) -- this ledger + gate are the proven deliverable, never a fabricated send. A SUPPRESSED
-- candidate writes NOTHING -- row-presence IS "this was actually sent".
--
-- push_consent_class: NEW 2-member enum (SERVICE|MARKETING, D4/decisions §3) -- the first DB-side
-- materialization of live-ops.types.ts's PushConsentClass TS union (posed C1). Must match verbatim.
--
-- created_at: timestamptz, written from LiveOpsClockPort.now() (DD-B3/DD-B5 -- never Date.now() inline
-- in production mechanic code) -- the cap/cooldown windows are computed against it, so it must be the
-- SAME injectable real-clock instant every other live-ops real-time mechanic uses (E2E determinism).
--
-- cooldown_key: text -- the coder's minimal HOW realization (decisions §2.4 specifies the mechanic, not
-- this column's concrete value) = event_id (per-(player, event) cooldown scope; see
-- live-ops-notification.service.ts's own header note for the full reasoning).

--> statement-breakpoint

-- push_consent_class: D4 (decisions §3) -- SERVICE (operational-pressure, always sendable subject to
-- cap+cooldown) | MARKETING (beneficial windfall/opportunity inducement, Art.6(1)(a) consent-gated).
-- Must match live-ops.types.ts's PushConsentClass TS union (posed C1) verbatim.
CREATE TYPE "push_consent_class" AS ENUM (
  'SERVICE',
  'MARKETING'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "live_ops_notification" (
  "id"            uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"     uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "event_id"      text        NOT NULL,
  "consent_class" push_consent_class NOT NULL,
  "cooldown_key"  text        NOT NULL,
  "created_at"    timestamptz NOT NULL
);

--> statement-breakpoint

-- INDEX (player_id, created_at): the DAILY-CAP hot path -- "how many rows for THIS player in the
-- trailing rolling 24h window" (LiveOpsNotificationService's own rolling-window convention, mirrors
-- LiveOpsCadenceController's rolling-7-real-day-week precedent for its own rule (b)).
CREATE INDEX "live_ops_notification_player_created_idx"
  ON "live_ops_notification" ("player_id", "created_at");

--> statement-breakpoint

-- INDEX (player_id, cooldown_key, created_at): the COOLDOWN hot path -- "the LAST row for THIS
-- (player, cooldown_key) pair".
CREATE INDEX "live_ops_notification_player_cooldown_key_created_idx"
  ON "live_ops_notification" ("player_id", "cooldown_key", "created_at");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "live_ops_notification" TO app_rw;
