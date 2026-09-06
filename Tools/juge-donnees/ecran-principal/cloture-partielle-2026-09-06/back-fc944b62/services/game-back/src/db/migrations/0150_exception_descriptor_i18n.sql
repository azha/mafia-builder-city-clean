-- migration 0150: exception_descriptor_i18n (Lot 0 "Les conventions" — chunk C0, D2)
-- Design: docs/superpowers/specs/2026-08-25-lot0-conventions-design.md §1 D2 — "Legacy en base" :
--         `exception_queue.event_descriptor` is a `text NOT NULL` column whose GDD contract already
--         reads "text i18n-key" (`db/schema/queues_exceptions_cuestack.ts:51` — REUSE 05 §Entity ligne
--         42), but every ROW written before this lot stores either a bare i18n key OR raw legacy prose
--         (M19b, 23 sites classified: 13 prose literal / 6 pass-through / 2 template / 2 constant) — a
--         CONTRADICTION between the schema's own comment and its pre-lot content, consigned here rather
--         than silently "fixed" by reinterpreting old rows.
--
-- `event_descriptor_i18n`: the frère `_i18n` column for `event_descriptor` (D1/D2 convention — every
-- TEXT field gets a sibling `<field>_i18n jsonb` column carrying the `I18nRef { key, params }` form).
-- NULLABLE, no default: pre-lot rows keep event_descriptor_i18n = NULL (no frère) until C4 backfills a
-- value at WRITE time (new cards) — legacy NULL rows are read via `ExceptionsProjectionService.
-- projectCard`'s comblage (design §1 D2: a bare key ⇒ `{ key, params: {} }`; free prose ⇒
-- `{ key: 'game.i18n.legacy.text', params: { text } }` — C4). C0 does NOT write to this column and does
-- NOT touch the reader (`projectCard` gains the fallback logic in C4) — this migration only opens the
-- column so C4 has somewhere to write.
--
-- Additive-only (zero-regression): one NEW nullable column on an existing table, no default needed
-- (jsonb NULL is a valid, distinct-from-'{}' absence marker — "no frère yet" is exactly what NULL means
-- here, mirroring the D2 registry's own "legacy rows have no frère" statement). No existing row's value
-- changes.
--
-- R9.3, same-commit (revue r1 B1 — the prior header cited 0146 as a DEFER-THE-BINDING precedent; it
-- is the OPPOSITE precedent, measured: 0146 bound the Drizzle field AND the ch09 paragraph in the SAME
-- commit as its own migration, `schema_player_progression_state.md:421` names the convention
-- "same-commit R9.3" in its own section title). This migration follows that convention: the Drizzle
-- field lands in `db/schema/queues_exceptions_cuestack.ts` (`event_descriptor_i18n:
-- jsonb('event_descriptor_i18n').$type<I18nRef>()`) and the ch09 activation note lands in
-- `docs/tech/09_data_model/schema_queues_exceptions_cuestack.md`, both in this SAME commit — even though
-- the column is STILL DORMANT (first real writer/reader = C4's `projectCard` comblage, unchanged from
-- the paragraph above).

--> statement-breakpoint

ALTER TABLE "exception_queue"
  ADD COLUMN "event_descriptor_i18n" jsonb;
