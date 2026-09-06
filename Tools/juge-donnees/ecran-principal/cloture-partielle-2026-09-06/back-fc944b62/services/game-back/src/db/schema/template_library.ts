// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (mig 0131 + schema)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §4 (data model)
//             R9.3: docs/tech/09_data_model/schema_template_library.md (created same-commit)
//             — 04g-D C1 — 2026-07-17
//
// TABLE (1 NEW — migration 0131) + 2 pgEnums:
//
//   event_reskin — the authored content-drop ARTIFACT (gdd/15:1919 `EventReskin` — entity REUSE, never
//     re-coined). This is the ONLY new persistence this lot needs (design §4 — the rest of the meta-layer
//     is static compiled TS + derived read-time logic, same posture as the 04e catalogues this lot
//     imports). `template_home_category`/`host_category` are DENORMALIZED for BO query convenience
//     (source of truth = the compiled TemplateLibraryService aggregation, boot-verified for consistency).
//
// ★ MOUNT-AGNOSTIC (C0 re-anchor §4 finding, decisions D1): this table carries NO mount-target FK column
//   of any kind (no `mounted_event_id`, no live-ops event FK) — only `mount_ref` (jsonb, NULL until a
//   FUTURE UPDATE populates it once the C4 mount adapter lands). The mount mechanism itself (whether a
//   reskin's `eventId` can even reach a real live-ops row) is under reconciliation between D1 and the
//   `POST admin/liveops/schedule` payload's actual closed-catalogue shape — this schema does not pre-judge
//   that outcome. If a future chunk needs a stronger mount reference, it lands as an ADDITIVE migration.
//
// ENUMS (2 NEW — migration 0131):
//   template_category — the 6-member canon category domain (gdd/15:1820 verbatim: POLITICAL | NEWS_BEAT |
//     RANDOM_WORLD | RECRUITMENT_QUEST | ACHIEVEMENT_STRUCTURE | LIVE_OPS). Mirrors `template-category.ts`'s
//     TS `TemplateCategory` enum — SAME 6 members, SAME order.
//   event_reskin_status — committed | mounted | rejected (design §4.1, D10 — no 'draft': the 7-step wizard
//     is stateless client-side until commit; a row only ever appears already resolved to committed or
//     rejected at INSERT time, and MAY transition to 'mounted' later via UPDATE, C4).
//
// R9.3: this file matches migration 0131 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_template_library.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults anywhere in this file.
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0131.
// FK convention: NO FK to a "templates" table — the 60-template library is compiled TS (design §3.2), same
//   soft-ref-text-column posture as `random_world_event_active.template_id` / `news_beat.template_id` /
//   `political_event_active.event_id`. `created_by` is a soft-ref uuid (JWT-derived staff account id,
//   never client-supplied) — mirrors `anti_cheat.staff_id`'s own "soft-ref uuid, no FK" convention.
// No barrel export: this file is intentionally NOT re-exported from `db/schema/index.ts` — mirrors
//   `random_world.ts`/`news_beat.ts`'s own documented precedent: no consumer in this codebase uses
//   Drizzle's relational query API (`db.query.<table>.findMany({with})`) on this table; plain
//   `.select()`/`.insert()`/`.update()` query-builder calls import the table object directly.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// ===== Enums PG natifs (2 NEW — migration 0131) =====

/** The 6 canon categories (gdd/15:1820 verbatim, design §3.1). Mirrors `TemplateCategory`
 *  (`operational/template_library/template-category.ts`) member-for-member. */
export const templateCategory = pgEnum('template_category', [
  'POLITICAL',
  'NEWS_BEAT',
  'RANDOM_WORLD',
  'RECRUITMENT_QUEST',
  'ACHIEVEMENT_STRUCTURE',
  'LIVE_OPS',
]);

/** committed → mounted | rejected (design §4.1, D10 — no 'draft'). */
export const eventReskinStatus = pgEnum('event_reskin_status', ['committed', 'mounted', 'rejected']);

// ===== Table: event_reskin — the authored content-drop artifact (migration 0131, design §4.1) =====
export const eventReskin = pgTable(
  'event_reskin',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** New authored id — format `E-<HOST>-NN` or `FLOW-*` (validator rule 4, C3). Unique vs the static
     *  04e catalogues + every other `event_reskin` row (enforced here at the DB level; the catalogue-vs
     *  side of the uniqueness check is applicative, C3). */
    event_id: text('event_id').notNull().unique(),
    /** Soft-ref to one of the 60 static library ids — NO DB FK (the library is compiled TS, design §3.2).
     *  Applicative CHECK (`unknown_template`/`template_is_trash`/`template_is_substrate`) lives in
     *  `EventReskinValidator` (C3), never a DB CHECK (the 60-entry domain is TS, not enumerable in SQL
     *  without duplicating it — R2.3 anti-duplication). */
    template_id: text('template_id').notNull(),
    /** DENORMALIZED for BO querying (design §4.1) — source of truth is the compiled library aggregation
     *  (`TemplateLibraryService`, boot-verified for consistency at every boot). */
    template_home_category: templateCategory('template_home_category').notNull(),
    /** The category the staff author is targeting for mount (may differ from `template_home_category` —
     *  a cross-category authoring choice is legal, the SAME mechanism the canon cross-cat launch events
     *  already use, design §3.3). */
    host_category: templateCategory('host_category').notNull(),
    /** The full authored `ReskinSpec` payload (tunables, crossRefs, copy) — the audit-trail record
     *  (design §4.1 "payload d'audit canon"). */
    reskin_spec: jsonb('reskin_spec').notNull(),
    /** committed | mounted | rejected — set at INSERT time (committed or rejected, D10), MAY transition
     *  committed → mounted via UPDATE later (C4). */
    status: eventReskinStatus('status').notNull(),
    /** e.g. `anti_fomo_rejected:last chance`, `missing_cross_ref` — NULL unless `status = 'rejected'`. */
    rejection_reason: text('rejection_reason'),
    /** e.g. `{ liveOpsEventId }` — posed at mount time (C4). NULL until then. ★ This is the ONLY
     *  mount-related column on this table (jsonb, opaque) — see file header "MOUNT-AGNOSTIC". */
    mount_ref: jsonb('mount_ref'),
    /** JWT-derived staff account id — NEVER client-supplied. Soft-ref uuid, no FK (mirrors
     *  `anti_cheat.staff_id`'s own convention). */
    created_by: uuid('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // BO reskins-by-status listing (GET template-library/reskins?status=, C4) + the AntiFOMO boot scan's
    // "committed|mounted" filter (C3).
    index('event_reskin_status_idx').on(t.status),
    // Per-template BO lookup + the EventReskinValidator's event_id_taken cross-check scoped view (C3).
    index('event_reskin_template_id_idx').on(t.template_id),
  ],
);

export type EventReskinRow = typeof eventReskin.$inferSelect;
export type EventReskinInsert = typeof eventReskin.$inferInsert;
