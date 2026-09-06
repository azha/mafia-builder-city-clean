// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1 (mig 0130 + schema)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §4 (data model)
//             R9.3: docs/tech/09_data_model/schema_news_beat.md (created same-commit)
//             — 04g-C C1 — 2026-07-16
//
// TABLES (3 NEW — migration 0130) + 2 pgEnums:
//
//   news_thread — the multi-publication state shared by the 4 multi-day mechanics (design §3.4): the
//     cooper_affair frame lifecycle, the slow_page series, the hindsight retrospective arc, the
//     three_outlet_storm salience race. Declared BEFORE `news_beat` so the latter's `thread_id` can FK
//     it. `payload` carries the per-template typed state (frame_id/reframe_resistance/half_life for
//     cooper; arc index for sourceless; salience vector + FrameLock for storm; installments + schedule
//     for slow_page; RetrospectiveArc for hindsight) — TS-side shapes, mirrors ScarPolygon-in-payload
//     (04g-B). `source_fodder_ref` is the triggering fodder citation for the 2 fodder-reactive templates
//     (hindsight, three_outlet_storm); NULL for the 2 keystones (cooper triggers off ambient residue,
//     never a single fodder row; sourceless triggers off ZERO fodder by definition).
//
//   news_beat — the published journal entries (design §4.1). City-global: the Brennar Daily is the SAME
//     journal for every player (decisions D14 — contrast `random_world_event_active`'s per-player
//     building scoping). `template_id` NULL = digest beat, template-less (decisions D4 — the daily
//     plancher's ~5 beats/day narrate a cited fodder row directly, never a fabricated heavy-mechanic
//     label). `fodder_refs = []` is LEGAL for `cooper_affair` + `slow_page` + `sourceless_beat` (★ C7
//     amendment, ⊥ review I-1/I-B — the ORIGINAL C1 wording here said "ONLY sourceless_beat", which was
//     STALE by C5/C6: ⊥-verified against the shipped triggers that cooper_affair's ambient-residue-vs-hum
//     trigger and slow_page's aggregate hum-driven interest signal are BOTH producer-legitimate
//     zero-citation paths — neither has a single discrete fodder row to cite, and forcing a fabricated
//     citation there would itself be the fig-leaf D6 forbids). `sourceless_beat` is distinguished from
//     these by `source_attribution.sourceless === true`, NEVER by an empty `fodder_refs` (no longer a
//     unique tell now that 3 templates legitimately share the empty shape) — every OTHER live template
//     MUST still cite ≥1 real fodder row (invariant tested, C2+).
//     ONE-SHOT once inserted — a beat row is never mutated after publish (a newspaper page is not
//     rewritten); see the "no GRANT UPDATE" note on this table below.
//
//   news_daily_run — the daily-tick claim + diagnostics + rolling state ledger (design §4.3, mirrors
//     `random_world_daily_run`'s own S6/S10 idempotency shape, migration 0128). PK `game_day` — the claim
//     IS the row (`INSERT … ON CONFLICT DO NOTHING`, C2 phase 0). `fodder_counts`/`journalist_interest`
//     are ROLLING per-run/per-district vectors the NEXT day's tick reads back (design §3.2 phase 1/
//     §3.5.6, decisions D9 — no dedicated float table for a vector this small, same reasoning as
//     `random_world_daily_run.quorum_adoption`).
//
// ENUMS (2 NEW — migration 0130):
//   news_beat_category — the 5-member canon category domain (design §4.1, news_beat_templates.md :296).
//     `sports` has no fodder producer day-1 (design §3.3/§11.8) — an honest unused member, not a
//     fabricated one.
//   news_thread_status — open | concluded (design §3.4). `outcome` (news_thread.outcome, plain text)
//     carries the closed TS union of terminal reasons (saturated|half_life_expired|frame_locked|
//     contested_persistent|series_completed|displaced) — NOT its own pgEnum, mirrors how per-template
//     outcome shapes live in `random_world_event_active.payload` without a dedicated enum per outcome.
//
// R9.3: this file matches migration 0130 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_news_beat.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults anywhere in this file.
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0130. This lot has NO
//   effect_modifier parenty (contrast 04g-B's DD-RW1 3rd sibling) — news-beats create zero world-state
//   day-1 (design §3.8, decisions D1, reporting-only).
// FK convention: both `district_id` columns → `districts(id)` ON DELETE RESTRICT (NOT CASCADE — districts
//   are GLOBAL static rows, effectively never deleted; RESTRICT is deliberate, same posture as
//   `random_world_event_active.district_id`, migration 0128 — an accidental district delete must never
//   silently cascade-delete a live news thread/beat). `news_beat.thread_id` → `news_thread(id)` ON DELETE
//   SET NULL (a thread deletion — never expected in practice, append-only journal — degrades a beat to a
//   one-shot rather than orphaning the whole row).
// Divergence entity canon assumed (design §4.1, decisions D13): `photo_id` is OMITTED from `news_beat` —
//   no photo pipeline exists day-1 and `photo_desk_mismatch` stays registry-only (anti-dead-column,
//   precedent 04g-A §4 "never a dead column"). See docs/tech/09_data_model/schema_news_beat.md §4.
// No barrel export: this file is intentionally NOT re-exported from `db/schema/index.ts` (the aggregated
//   barrel drizzle(pool, { schema }) consumes) — mirrors `random_world.ts`/`ambient_world.ts`'s own
//   documented precedent: no consumer in this codebase uses Drizzle's relational query API
//   (`db.query.<table>.findMany({with})`) on these tables; plain `.select()`/`.insert()` query-builder
//   calls import the table object directly and need no barrel membership.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { districts } from './world_geography';

// ===== Enums PG natifs (2 NEW — migration 0130) =====

/** The 5 canon categories (design §4.1, news_beat_templates.md :296). `sports` is canon-complete but
 *  unused day-1 (no producer, design §11.8) — never fabricated fodder to fill it. */
export const newsBeatCategory = pgEnum('news_beat_category', [
  'national',
  'brennar_local',
  'business',
  'arts',
  'sports',
]);

/** open → concluded (design §3.4). Terminal `outcome` reasons live in `news_thread.outcome` (text, closed
 *  TS union), not a 2nd pgEnum. */
export const newsThreadStatus = pgEnum('news_thread_status', ['open', 'concluded']);

// ===== Table 1: news_thread — the multi-publication state (migration 0130, design §4.2) =====
export const newsThread = pgTable(
  'news_thread',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Soft-ref (text) to the static `NewsBeatTemplateRegistry` entry — one of the 4 multi-publication
     *  LIVE templates: 'cooper_affair' | 'sourceless_beat' | 'slow_page' | 'hindsight' |
     *  'three_outlet_storm'. No DB FK — same posture as `random_world_event_active.template_id`. */
    template_id: text('template_id').notNull(),
    /** The authoring journalist (soft-ref to the static `press-registry.ts` registry) — the "framing
     *  track record" query-derived subject (design §3.6). NULL never expected for a live thread in
     *  practice, but nullable defensively (no journalist-registry DB FK exists to enforce it). */
    journalist_key: text('journalist_key'),
    /** The geographic subject (claimed_subject for sourceless_beat incl., design §3.5.2). NULL = no
     *  district-anchored subject (e.g. a citywide sourceless claim). RESTRICT — see file header. */
    district_id: integer('district_id').references(() => districts.id, { onDelete: 'restrict' }),
    status: newsThreadStatus('status').notNull().default('open'),
    /** Closed TS union once `status = 'concluded'`: 'saturated' | 'half_life_expired' | 'frame_locked' |
     *  'contested_persistent' | 'series_completed' | 'displaced' (design §3.4). NULL while `open`. */
    outcome: text('outcome'),
    opened_at_game_day: integer('opened_at_game_day').notNull(),
    /** Per-template typed state (TS side): frame_id/reframe_resistance/half_life (cooper), arc index
     *  (sourceless), salience vector + FrameLock (storm), installments + publication schedule (slow_page),
     *  RetrospectiveArc (hindsight) — materialized seeded draws included (design §3.4). */
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    /** The triggering fodder citation `{sourceKind, refId}` (design §3.3) for hindsight/three_outlet_storm.
     *  NULL for cooper_affair (ambient-residue trigger, no single fodder row) and sourceless_beat (ZERO
     *  fodder by definition). */
    source_fodder_ref: jsonb('source_fodder_ref'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The phase-2 advance scan (open threads due for a publication/decay step, C2+).
    index('news_thread_status_idx').on(t.status),
    // The per-template duplicate-inhibition gate (matrice :254, C2+ phase 4).
    index('news_thread_template_status_idx').on(t.template_id, t.status),
    // The query-derived journalist track record (design §3.6, <NewsBeatsDashboard> Scénario 2).
    index('news_thread_journalist_opened_idx').on(t.journalist_key, t.opened_at_game_day),
    // At most ONE retrospective arc per resolved fodder event (design §4.2/§3.5.3 — "a 2nd run does NOT
    // create a 2nd arc"). Partial (scoped to template_id='hindsight') — mirrors
    // `coupling_discovery_cascade`'s own narrower-than-table-wide UNIQUE (migration 0128).
    uniqueIndex('news_thread_hindsight_source_fodder_ref_unique')
      .on(sql`(${t.source_fodder_ref} ->> 'refId')`)
      .where(sql`${t.template_id} = 'hindsight'`),
  ],
);

export const newsThreadRelations = relations(newsThread, ({ one }) => ({
  district: one(districts, { fields: [newsThread.district_id], references: [districts.id] }),
}));

export type NewsThreadRow = typeof newsThread.$inferSelect;
export type NewsThreadInsert = typeof newsThread.$inferInsert;

// ===== Table 2: news_beat — the published journal entries (migration 0130, design §4.1) =====
export const newsBeat = pgTable(
  'news_beat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Day of publication (the determinism/seed axis, design §8). */
    game_day: integer('game_day').notNull(),
    /** NULL = one-shot beat (digest / folded_page / wire_day) with no multi-publication state. */
    thread_id: uuid('thread_id').references(() => newsThread.id, { onDelete: 'set null' }),
    /** Soft-ref to the static registry. NULL = digest beat, template-less (decisions D4). */
    template_id: text('template_id'),
    /** Soft-ref to the static `press-registry.ts` outlet registry. */
    outlet_key: text('outlet_key').notNull(),
    /** NULL for wire copy (canon: wire = single unattributed source, no local byline). */
    journalist_key: text('journalist_key'),
    /** NULL = beat is `national`/citywide (no single-district subject). RESTRICT — see file header. */
    district_id: integer('district_id').references(() => districts.id, { onDelete: 'restrict' }),
    beat_category: newsBeatCategory('beat_category').notNull(),
    /** The current frame (per-template closed TS unions — design §3.5.1 cooper 4 frames / §3.5.4 storm
     *  4 frames). NULL for templates with no frame concept (digest, sourceless, hindsight, slow_page). */
    frame: text('frame'),
    headline_i18n_key: text('headline_i18n_key').notNull(),
    body_i18n_key: text('body_i18n_key').notNull(),
    /** i18n interpolation params: {district}, {subject}, {frame}, {outlet} (decisions D12). */
    params: jsonb('params').notNull().default(sql`'{}'::jsonb`),
    /** The canon composite (news_beat_templates.md :298) — JAMAIS absent, even for sourceless (which
     *  carries `{sourceless: true}` instead of an outlet/journalist chain). Grep-gate enforced (design §9
     *  check #1) + applicative CHECK at the repository layer (C2+), not a DB CHECK (jsonb shape). */
    source_attribution: jsonb('source_attribution').notNull(),
    /** ★ The falsifiable aggregation contract (design §4.1, reworded C7 — ⊥ review I-1/I-B):
     *  `[{sourceKind, refId}]`. `[]` is LEGAL for `cooper_affair`/`slow_page`/`sourceless_beat` (all 3
     *  trigger off an aggregate/ambient signal, never a single discrete fodder row — STALE prior wording
     *  said "ONLY sourceless_beat"); every OTHER live template MUST cite ≥1 real fodder row (invariant
     *  tested, C2+). `sourceless_beat` is identified by `source_attribution.sourceless === true`, NOT by
     *  this array being empty (no longer a unique tell). */
    fodder_refs: jsonb('fodder_refs').notNull().default(sql`'[]'::jsonb`),
    /** The REAL-clock axis of the persistence feed filter (decisions D5 — a query predicate on this
     *  column, never a sweep; no `expired` status exists on this table). */
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The daily-run digest scan + BO per-day listing.
    index('news_beat_game_day_idx').on(t.game_day),
    // The per-template persistence-window duplicate-inhibition gate (design §3.2 phase 4) + BO
    // template-usage aggregation.
    index('news_beat_template_created_idx').on(t.template_id, t.created_at),
    // Thread -> its beats (BO thread detail, track record roll-up).
    index('news_beat_thread_idx').on(t.thread_id),
    // Per-district BO history + the player feed's district filter (C6+).
    index('news_beat_district_game_day_idx').on(t.district_id, t.game_day),
  ],
);

export const newsBeatRelations = relations(newsBeat, ({ one }) => ({
  thread: one(newsThread, { fields: [newsBeat.thread_id], references: [newsThread.id] }),
  district: one(districts, { fields: [newsBeat.district_id], references: [districts.id] }),
}));

export type NewsBeatRow = typeof newsBeat.$inferSelect;
export type NewsBeatInsert = typeof newsBeat.$inferInsert;

// ===== Table 3: news_daily_run — claim + diagnostics + rolling state (migration 0130, design §4.3) =====
export const newsDailyRun = pgTable('news_daily_run', {
  /** PK — the claim IS the row (`INSERT … ON CONFLICT DO NOTHING`, S6 mirror, C2 phase 0). */
  game_day: integer('game_day').primaryKey(),
  /** Scénario 1 observability — the daily plancher fill count (decisions D4). */
  beats_generated_count: smallint('beats_generated_count').notNull().default(0),
  /** Per-template count of THIS run's beats (BO template-usage aggregation). */
  template_counts: jsonb('template_counts').notNull().default(sql`'{}'::jsonb`),
  /** The wire↔storm daily mutual-exclusion falsifiable flag (design §3.2.3). */
  wire_day: boolean('wire_day').notNull().default(false),
  /** Per-sourceKind fodder count THIS run observed — the low-production signal Wire Day reads back from
   *  prior runs (design §3.3/§3.5.7). */
  fodder_counts: jsonb('fodder_counts').notNull().default(sql`'{}'::jsonb`),
  /** Rolling per-district interest vector (design §3.5.6, decisions D9 — mirrors `random_world_daily_run.
   *  quorum_adoption`'s own "no dedicated float table for a vector this small" reasoning). */
  journalist_interest: jsonb('journalist_interest').notNull().default(sql`'{}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type NewsDailyRunRow = typeof newsDailyRun.$inferSelect;
export type NewsDailyRunInsert = typeof newsDailyRun.$inferInsert;
