// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C2 (Schema — live_ops_event_active
//             + effect_modifier DD-B2 generalization)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.2 (live_ops_event_active
//             shape) + §3.8 (NEW enums)
//             Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §2.1 (DD-B2 reasoning)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md §Glossary
//             (LiveOpsEventActive "per active event × per player" — reconciled below)
//             docs/tech/09_data_model/schema_live_ops_event_active.md (R9.3 backport — same-commit)
//             — 04e-B C2 — 2026-07-06
//             — 04e-B C5/DD-B4 fix — 2026-07-06 (★ migration 0115 — `ENDED` terminal status added to
//             `live_ops_active_status`; see decisions.md §2.3)
//             — 04e-C C1 — 2026-07-09 (★ migration 0118 — additive `targeting_filter jsonb` column)
//             — 04e-C C3 — 2026-07-09 (★ DD-C3 cadence-at-schedule invariant documented below — no
//             schema/migration change, a `status`/`high_impact` READ-semantics clarification only)
//
// ★ DD-C3 (04e-C C3, decisions.md §2.3 "Cadence-at-schedule reconcile") — CADENCE IS ENFORCED AT
// ACTIVATION, NOT AT SCHEDULE. `LiveOpsAdminController.scheduleEvent` (04e-C C2) INSERTs a `SCHEDULED`
// row directly — it does NOT call `LiveOpsCadenceController.enforceCadenceLimits` (only
// `LiveOpsEventService.activateLiveOpsEvent`/`activateScheduledLiveOpsEvent` do, live-ops-event.service.ts
// — the cadence gate runs exactly ONCE, at the SCHEDULED→ACTIVE transition, whichever path drives it: the
// real-clock scheduler sweep OR a direct force-activate). Consequently `live-ops-cadence-controller.ts`'s
// rule (b) high-impact-per-week count filters `ne(status, 'SCHEDULED')` — a `SCHEDULED` row does NOT
// count against the weekly high-impact cap until it ACTIVATES; a rejected scheduled-activation attempt
// leaves the row STUCK in `SCHEDULED` forever (the scheduler sweep's own per-row try/catch — see
// live-ops-scheduler.service.ts — swallows the `ApiError` and logs a warning; the row is never silently
// force-activated). This is a DELIBERATE, DOCUMENTED deviation from the original ★ DD-B4 framing
// (decisions.md §2.3, 04e-B) which stated rule (b) counts high-impact rows "REGARDLESS of status" — DD-B4
// reasoned that a FUTURE `SCHEDULED` row's `started_at` bound (`started_at ≤ now`) would naturally exclude
// it from the window before 04e-C's composer could even schedule an event with an imminent/past
// `started_at`; DD-C3 (04e-C) makes the exclusion EXPLICIT (`ne(status,'SCHEDULED')`) rather than relying
// on that bound alone, so a composer-scheduled high-impact event never reserves its cadence slot
// prematurely — the informational cadence warning the composer surfaces at SCHEDULE time (`liveops_events_
// and_push.md §2.2` "avertissement visuel si cadence dépassée") is advisory only, never a hard block at
// schedule-time. `ACTIVE`/`ENDED` rows are UNAFFECTED (DD-B4's "regardless of status" framing still holds
// for those two) — this refines DD-B4 for the THIRD status value (`SCHEDULED`) DD-B4 could not have
// anticipated (04e-B shipped before 04e-C's `schedule` endpoint existed). Falsifiable:
// `liveops_composer_page2.spec.ts`'s C3 cadence-at-schedule suite proves both SCHEDULE calls for 2
// high-impact events in the same real week succeed (SCHEDULED, no premature rejection) and the 2ND
// ACTIVATION attempt is REJECTED (409 RESOURCE_STATE_CONFLICT) once both would otherwise count in-window.
//
// TABLE (1 NEW — migration 0114; ENDED enum member added — migration 0115, DD-B4):
//
//   live_ops_event_active — the live-ops activation LEDGER: ONE ROW PER ACTIVATION (design §3.2,
//     mirrors A2's political_event_active "one row per activation", NOT one row per targeted
//     player). `event_id` is a soft-ref (text) to the hard-coded LiveOpsEvent static catalogue entry
//     (live-ops-event-catalogue.ts, C1) — no DB-side LiveOpsEvent table to FK to (same posture as
//     political_event_active/PoliticalEvent). `category` mirrors the static entry's category at
//     activation (avoids a join-back). `cohort_key` is the D1 deterministic predicate hash
//     (cohortKeyFor, cohort-targeting.service.ts — cyrb53 canonical-serialization, design §3.4).
//     `high_impact` mirrors the static entry (cadence rule reads this without the catalogue, C5).
//     `started_at`/`ends_at` are REAL-CLOCK timestamps (LiveOpsClockPort, DD-B3) — NOT game-day
//     integers like political_event_active's activated_at_game_day/expires_at_game_day. `ends_at`
//     is nullable: NULL ONLY for E-LO-09 (threshold-exit lifecycle: stress_accumulator ≥
//     exit_threshold reconciles it, not a clock, design §3.2/§5). `status` is SCHEDULED|ACTIVE|ENDED
//     (★ DD-B4, migration 0115) — the row is present with a status: ACTIVE=live, ENDED=terminal
//     activation-history record; revert TRANSITIONS the row to ENDED (its `effect_modifier` children
//     are still DELETEd first — the revert-guarantee is unchanged, only the parent row now persists
//     as durable history instead of being deleted). This fixes the C5 cadence rule (b)'s
//     high-impact-per-week cap, which must count a fired-then-reverted high-impact event for the rest
//     of its trailing real week (decisions.md §2.3) — see cadence-controller.ts for the counting
//     semantics (rule (a) counts status='ACTIVE' only; rule (b) counts all statuses in-window).
//
// CANON-WORDING RECONCILIATION (honest, design §3.2): canon glossary names LiveOpsEventActive
// "per active event × per player" (liveops_event_catalogue.md:197). This table is ONE ROW PER
// ACTIVATION — the per-player dimension is realized as the set of PLAYER-scoped `effect_modifier`
// rows (scope_ref = player_id) the SAME activation writes (C2/C4) — the engine's overlay rows ARE
// the per-player active record. This also reconciles liveops_events_and_push.md §3.2's "membership
// cohorte = pas de table 09" — no per-player membership row is persisted here.
//
// ENUMS (2 NEW — migration 0114; `live_ops_active_status` gains 1 member — migration 0115):
//   live_ops_event_category — the canon 7-member enum (CITYWIDE|RIVAL_ACTION|MARKET_SHIFT|
//     GLASS_EVENT|COMPRESSION_PREP|SALTLINE_WINDFALL|AUDIT_OPPORTUNITY, liveops_event_catalogue.md
//     §Glossary). MUST match live-ops.types.ts's `LiveOpsEventCategory` TS union verbatim (that union
//     predates this pgEnum by one chunk, C1 — this enum is its first DB-side materialization).
//   live_ops_active_status — SCHEDULED|ACTIVE|ENDED (design §3.2; ENDED added by DD-B4, migration
//     0115 — a terminal-history status, NOT a scheduled-future/live status).
//
// R9.3: this file matches migration 0114 + 0115 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_live_ops_event_active.md (updated same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: this file is a NEW table — the effect_modifier generalization (DD-B2) lives in
// effect_modifier.ts (same migration 0114, additive-only touch there too).
// No player_id FK on this table (design §3.2 canon-wording reconciliation above) — the per-player
// dimension is carried entirely by effect_modifier's PLAYER-scoped rows, which DO carry the player id
// (as scope_ref, polymorphic text — the same convention A1 already established, effect_modifier.ts).
//
// One-directional relation (deliberate, avoids a cross-file import cycle): `effect_modifier.ts`
// imports THIS file to declare its `liveOpsActiveEvent: one(liveOpsEventActive, ...)` relation; this
// file does NOT import `effect_modifier.ts` back to add the reverse `many(effectModifier)` side. No
// consumer in this codebase uses Drizzle's relational query API (`db.query.<table>.findMany({with})`)
// on either table today (grepped, confirmed) — `effectModifierRelations`/`politicalEventActiveRelations`
// exist for typing completeness only — so the missing reverse side has zero functional effect. Adding
// it would require this file to import `effect_modifier.ts`, which already imports THIS file — a
// genuine circular module dependency that TS/ESM module-init ordering can make unreliable (the
// `pgTable`-produced consts could be read before their binding is initialized). Not worth the risk for
// an unused typing convenience.

import { pgTable, pgEnum, uuid, text, boolean, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import type { CohortTargetingFilter } from '../../operational/liveops/live-ops.types';

/**
 * `live_ops_event_category` — the canon 7-member enum (liveops_event_catalogue.md §Glossary;
 * live-ops.types.ts `LiveOpsEventCategory` TS union, C1). First DB-side materialization at C2.
 */
export const liveOpsEventCategory = pgEnum('live_ops_event_category', [
  'CITYWIDE',
  'RIVAL_ACTION',
  'MARKET_SHIFT',
  'GLASS_EVENT',
  'COMPRESSION_PREP',
  'SALTLINE_WINDFALL',
  'AUDIT_OPPORTUNITY',
]);

/**
 * `live_ops_active_status` — SCHEDULED|ACTIVE|ENDED (design §3.2; `ENDED` added by ★ DD-B4, migration
 * 0115). SCHEDULED = a scheduled-future activation; ACTIVE = currently live; ENDED = terminal —
 * revert TRANSITIONS the row to ENDED instead of DELETEing it (row present with a terminal status,
 * NOT row-absent — this table is now a durable activation-HISTORY ledger, unlike
 * `political_event_active`'s own row-present-means-active-only posture). The `effect_modifier`
 * children are still DELETEd on revert (revert-guarantee unchanged); only the PARENT row persists.
 * Rationale (decisions.md §2.3): the C5 cadence rule (b) "max 1 high-impact per real week" must count
 * a fired-then-reverted high-impact event for the rest of its trailing week — a DELETEd row silently
 * dropped out of that count, bypassing the cap once the event's (shorter-than-a-week) duration
 * elapsed. Rule (a) "max N simultaneous" is unaffected — it filters `status='ACTIVE'` and naturally
 * excludes ENDED rows.
 */
export const liveOpsActiveStatus = pgEnum('live_ops_active_status', ['SCHEDULED', 'ACTIVE', 'ENDED']);

// ===== live_ops_event_active — the activation ledger (migration 0114; ENDED status — migration 0115) =====
export const liveOpsEventActive = pgTable(
  'live_ops_event_active',
  {
    /** PK: uuid generated at activation. */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * event_id — soft ref (text) to the static LiveOpsEvent catalogue entry (e.g. 'E-LO-01'). No DB
     * FK: the catalogue is a hard-coded TS static config (design §3.1), not a DB table.
     */
    event_id: text('event_id').notNull(),

    /** category — mirrors the static catalogue entry's category at activation time. */
    category: liveOpsEventCategory('category').notNull(),

    /**
     * cohort_key — the D1 deterministic predicate hash (`cohortKeyFor`, design §3.4, cyrb53
     * canonical-serialization). Identical predicate ⇒ identical cohort_key (asserted by the
     * determinism E2E, `liveops_targeting.spec.ts` C2 + the C10 sweep).
     */
    cohort_key: text('cohort_key').notNull(),

    /**
     * high_impact — mirrors the static entry (cadence rule reads this directly, C5, without
     * needing the static catalogue).
     */
    high_impact: boolean('high_impact').notNull(),

    /**
     * started_at — real-clock activation instant (`LiveOpsClockPort`, DD-B3 — never an inline
     * `Date.now()` in production mechanic code; C4's `activateLiveOpsEvent` is the first writer).
     */
    started_at: timestamp('started_at', { withTimezone: true }).notNull(),

    /**
     * ends_at — nullable. NULL ONLY for E-LO-09 (threshold-exit; `stress_accumulator ≥
     * exit_threshold` reconciles it, not a clock, design §3.2/§5). Non-null = the authoritative
     * revert boundary the C4 `LiveOpsSchedulerService` reconciler sweeps (DD-B3).
     */
    ends_at: timestamp('ends_at', { withTimezone: true }),

    /** status — SCHEDULED|ACTIVE|ENDED (ENDED = DD-B4 terminal-history status, migration 0115). */
    status: liveOpsActiveStatus('status').notNull(),

    /** Custom targeting filter override. Nullable. */
    targeting_filter: jsonb('targeting_filter').$type<CohortTargetingFilter>(),
  },
  (t) => ({
    /**
     * (status, ends_at) index — anticipates the C4 `LiveOpsSchedulerService` real-clock
     * reconciler's sweep query (`WHERE status='ACTIVE' AND ends_at <= clock.now()`) — added at
     * table-creation time, mirrors A1's own precedent of indexing
     * `effect_modifier.expires_at_game_day` ahead of its C4 `revertExpired` consumer in the SAME
     * migration the table was created (`effect_modifier.ts`).
     */
    status_ends_at_idx: index('live_ops_event_active_status_ends_at_idx').on(t.status, t.ends_at),
  }),
);

export type LiveOpsEventActiveRow = typeof liveOpsEventActive.$inferSelect;
export type LiveOpsEventActiveInsert = typeof liveOpsEventActive.$inferInsert;
