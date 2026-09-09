// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C7 (sendNotifications + cap/cooldown
//             + per-event consent gate, D4)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.7 (live_ops_notification
//             shape) + §3.8 (NEW enums — PushConsentClass)
//             Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §2.4 (DD-B5 — the
//             fail-closed marketing-consent SEAM realizing D4; this migration adds NO consent-STORE
//             schema — DD-B5 explicitly "adds no migration and no schema change" beyond this ledger,
//             already planned at plan `:295`) + §3 (per-event push-consent classification, RULED)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md (push notices,
//             per-event copy)
//             docs/tech/09_data_model/schema_live_ops_notification.md (R9.3 backport — same-commit)
//             — 04e-B C7 — 2026-07-06
//
// TABLE (1 NEW — migration 0117):
//
//   live_ops_notification — the cap/cooldown/consent ENFORCEMENT LEDGER (D4/DD-B5).
//     `LiveOpsNotificationService.sendNotifications` writes ONE intent row per recipient IFF: (a)
//     consent-class allows (SERVICE always; MARKETING iff the fail-closed `MarketingConsentPort` seam
//     resolves opted-in, DD-B5 §2.4) AND (b) the per-player daily cap
//     (`T.bo.push.daily_cap_per_player`, BO-owned REUSE) is not yet reached AND (c) the
//     per-(player, cooldown_key) cooldown (`liveops.notification_cooldown_hours`, REUSE) has elapsed.
//     Device push TRANSPORT is TD (no FCM/APNs day-1) — this ledger + gate are the proven deliverable;
//     never a fabricated send.
//
//     PK: id (uuid). FK: player_id -> player(player_id) ON DELETE CASCADE (R9.3 convention).
//     event_id: text soft-ref to the static LiveOpsEvent catalogue entry (live-ops-event-catalogue.ts,
//       C1) — same soft-ref convention as `live_ops_event_active.event_id` (no DB-side LiveOpsEvent
//       table to FK to).
//     consent_class: the NEW `push_consent_class` pgEnum (SERVICE|MARKETING, D4/decisions §3) — the
//       first DB-side materialization of `live-ops.types.ts`'s `PushConsentClass` TS union (posed C1),
//       mirroring how `LiveOpsEventCategory` went from a C1 TS union to a C2 pgEnum.
//     cooldown_key: text — the coder's minimal HOW realization (decisions §2.4 specifies the cap/
//       cooldown/consent MECHANICS, not this column's concrete value) = `event.eventId`
//       (per-(player, event) cooldown scope — see `live-ops-notification.service.ts`'s own header note
//       for the full reasoning; no broader push-channel/template-family grouping is specified anywhere
//       in plan/design/decisions).
//     created_at: timestamptz — written from the injected `LiveOpsClockPort.now()` (DD-B3/DD-B5, NEVER
//       an inline `Date.now()`/`new Date()` in production mechanic code) — the cap/cooldown windows are
//       computed against it, so it must be the SAME injectable/mockable real-clock instant every other
//       live-ops real-time mechanic uses (E2E determinism), mirroring
//       `live_ops_aggression_ledger.occurred_at`'s own real-clock convention (migration 0116).
//
// R2.2: no raw scalar is persisted here that isn't already the whole point of this ledger (an intent
// row IS the observable unit — there is no hidden internal count this table exists to hide, unlike
// `live_ops_aggression_ledger`'s windowed violent-ops count).
//
// R9.3: this file matches migration 0117 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_live_ops_notification.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults. `created_at` is always the
//   caller's (`LiveOpsNotificationService.sendNotifications`'s) explicit `LiveOpsClockPort.now()` value
//   — never a DB-side `defaultNow()` (mirrors `live_ops_aggression_ledger.occurred_at`'s own precedent).
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0117.

import { pgTable, pgEnum, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { player } from './player';

/**
 * `push_consent_class` — SERVICE (operational-pressure state change, contract/legitimate-interest,
 * always sendable subject to cap+cooldown) | MARKETING (beneficial windfall/opportunity inducement,
 * Art.6(1)(a) consent-gated, DD-B5 fail-closed seam). Must match `live-ops.types.ts`'s
 * `PushConsentClass` TS union (posed C1) verbatim — first DB-side materialization at C7.
 */
export const pushConsentClass = pgEnum('push_consent_class', ['SERVICE', 'MARKETING']);

/**
 * `live_ops_notification` — one row per SENT notification intent (migration 0117). A SUPPRESSED
 * candidate (consent/cap/cooldown rejected it) writes NOTHING — this table is append-only and
 * row-presence IS "this was actually sent" (mirrors `effect_modifier`'s own "the row IS the effect"
 * posture, not a status-flagged candidate table).
 */
export const liveOpsNotification = pgTable(
  'live_ops_notification',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    player_id:     uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    /** event_id — soft ref (text) to the static LiveOpsEvent catalogue entry (e.g. 'E-LO-01'). No DB
     *  FK: the catalogue is a hard-coded TS static config (design §3.1), same posture as
     *  `live_ops_event_active.event_id`. */
    event_id:      text('event_id').notNull(),
    /** consent_class — mirrors the catalogue entry's `pushConsentClass` at send time (D4/decisions §3). */
    consent_class: pushConsentClass('consent_class').notNull(),
    /** cooldown_key — the per-(player, X) cooldown scope; C7 realizes X = event_id (see file header). */
    cooldown_key:  text('cooldown_key').notNull(),
    /** created_at — the REAL instant this intent was sent (`LiveOpsClockPort.now()`, DD-B3/DD-B5 —
     *  NEVER an inline `Date.now()`). NO default — every INSERT explicitly supplies it. */
    created_at:    timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    /** The DAILY-CAP hot path: "how many rows for THIS player in the trailing rolling-24h window"
     *  (`LiveOpsNotificationService`'s own rolling-window convention — mirrors
     *  `LiveOpsCadenceController`'s rolling-7-real-day-week precedent for its own rule (b)). */
    player_created_idx: index('live_ops_notification_player_created_idx').on(t.player_id, t.created_at),
    /** The COOLDOWN hot path: "the LAST row for THIS (player, cooldown_key) pair". */
    player_cooldown_key_created_idx: index('live_ops_notification_player_cooldown_key_created_idx')
      .on(t.player_id, t.cooldown_key, t.created_at),
  }),
);

export type LiveOpsNotificationRow    = typeof liveOpsNotification.$inferSelect;
export type LiveOpsNotificationInsert = typeof liveOpsNotification.$inferInsert;
