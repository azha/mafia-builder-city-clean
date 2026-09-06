// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C2 (Engine schema)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §2 (thick effect engine)
//                     + §11 (data model) + §15 (glossary)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md :26,304
//             docs/tech/09_data_model/schema_effect_modifier.md (R9.3 backport — same-commit)
//             — 04e-A1 C2 — 2026-07-04
//             — 04e-B C2 — 2026-07-06 (DD-B2: additive dual-FK generalization, migration 0114 — see
//             §DD-B2 note below the TABLES header)
//             — 04g-B C1 — 2026-07-15 (DD-RW1: additive TRIPLE-FK generalization, migration 0128 —
//             ADDS a 3rd sibling parent column `random_world_event_active_id` + swaps the
//             exactly-one-parent CHECK to 3-arg `num_nonnulls` — mirrors DD-B2 EXACTLY, see the note
//             immediately below the §DD-B2 note. Docs: docs/superpowers/specs/2026-07-15-04g-B-
//             random-world-design.md §3.3/§4.4.)
//
// TABLES (2 NEW — migration 0106):
//
//   political_event_active — city-global active-event lifecycle ledger (design §5.2 — the whole
//     city shares ONE active-event set; there is no per-player row here).
//     PK: id (uuid). event_id: soft ref (text) to the hard-coded `PoliticalEvent` static catalogue
//       entry (design §3 — "each event = a hard-coded PoliticalEvent static-config entry"; A2 owns
//       the static TS config, there is no DB-side PoliticalEvent table to FK to).
//     category: mirrors the static entry's category at activation time (avoids a join-back to the
//       static config for BO/queries).
//     expires_at_game_day: nullable — NULL = "permanent-until-election" (design §3: E-POL-04/-07/-10/-12
//       revert only at the next election or never), NOT a crash-leftover.
//
//   effect_modifier — the revert-guaranteed scoped overlay row (the engine's persisted core state,
//     design §2.2/§2.3). This table IS the overlay: `EffectOverlayStore` (C3) snapshots the active
//     rows into memory; `applyEvent` (C4) INSERTs a batch transactionally (SERIALIZABLE); `revertEvent`
//     / `revertExpired` (C4) DELETE the rows — the DELETE IS the revert (no floating baseline to
//     restore, no recompute from a remembered "before" value).
//     PK: id (uuid). FK: active_event_id → political_event_active(id) ON DELETE CASCADE.
//     scope_type/scope_ref: the D2 scope axis. scope_ref is a POLYMORPHIC text ref (district id /
//       player id / cohort key) — deliberately NOT a DB FK (design §11: "effect_modifier.scope_ref is
//       a polymorphic text ref ... documented in persistence_rules.md" — no single parent table a
//       polymorphic column could point to).
//     magnitude: numeric (Drizzle string-mode — arbitrary precision, no float rounding drift across
//       apply/revert/compose, design §2.3 determinism). The compose operand (ADD delta / MULTIPLY
//       factor / SET target value).
//     expires_at_game_day: nullable — same "permanent" semantics as political_event_active. NOT NULL
//       is the authoritative revert boundary `revertExpired`'s NIGHTLY sweep consumes (C4) — the
//       crash-safety invariant: a crash mid-event can never leave a permanent shift because this
//       persisted column, never a floating baseline, is authoritative (design §2.3).
//     INDEX (tunable_key, scope_type): EffectOverlayStore's per-key snapshot rebuild query (C3, boot +
//       `effect_modifiers_changed` reload).
//     INDEX (active_event_id): revertEvent's DELETE-by-event (C4).
//     INDEX (expires_at_game_day): revertExpired's NIGHTLY DELETE-by-expiry scan (C4).
//
// §DD-B2 (04e-B C2, migration 0114 — ADDITIVE generalization of `effect_modifier`'s parentage):
//   04e-B's live-ops engine needs its own grouped-revert parent ledger (`live_ops_event_active`,
//   `live_ops_event_active.ts`) instead of `political_event_active`. Rather than repoint the SAME
//   `active_event_id` column at two different parent tables (impossible — a single FK column can
//   only reference one table) or rename to a generic `event_active` (a bigger A2-touching refactor,
//   routed as a future consolidation TD — TD-179, `docs_int/tech_debt_inventory.md` — decisions doc
//   §2.1), migration 0114 ADDS a SECOND, SIBLING
//   nullable parent column instead:
//     - `active_event_id`      : RELAXED to nullable (was NOT NULL). Every EXISTING row keeps this set
//       — the A2 political apply/revert path (`EffectModifierService.applyEvent`/`revertEvent`) is
//       BYTE-UNCHANGED, still always sets it, cascade unchanged.
//     - `live_ops_active_event_id` (NEW): nullable FK → `live_ops_event_active(id)` ON DELETE CASCADE.
//       Set ONLY by the NEW sibling methods `EffectModifierService.applyLiveOpsEvent`/
//       `revertLiveOpsEvent` (04e-B C2) — `applyEvent`/`revertEvent`/`revertExpired` (A1/A2) are not
//       touched by even one line.
//     - CHECK `num_nonnulls(active_event_id, live_ops_active_event_id) = 1` — exactly one parent is
//       ever set. Every pre-existing row (active_event_id set, live_ops_active_event_id NULL) already
//       satisfies this, so the migration's `ADD CONSTRAINT` validates cleanly with zero data changes.
//   Why this is zero-regression on the READ hot path: `EffectOverlayStore.reload()`/`applyModifiers`
//   (`config/effect-overlay-store.ts:164-166,242-251,281`) SELECT `scope_type`/`scope_ref`/
//   `tunable_key`/`op`/`magnitude` only — they never reference EITHER parent-FK column. The
//   byte-identical-when-empty overlay-compose contract is untouched by this migration.
//
// ENUMS (3 NEW — migration 0106):
//   effect_scope             — GLOBAL | DISTRICT | PLAYER | COHORT (design §2.4/§11/§15 — the D2 scope
//                               axis; PLAYER built here, consumed live by 04e-B; COHORT built here,
//                               RESERVED but UNEXERCISED — 04e-C C6 ratified D4: PLAYER-scope stays the
//                               live per-player consumer, the first COHORT-scoped applyEvent is
//                               TD-178, `docs_int/tech_debt_inventory.md`).
//   effect_modifier_op       — ADD | MULTIPLY | SET (design §2.4 — fixed compose order in
//                               EffectOverlayStore.applyModifiers, C3: all MULTIPLY folded, then all
//                               ADD, then any SET).
//   political_event_category — ELECTORAL | BUDGET | ORDINANCE | SCANDAL | CRACKDOWN | REFORM (canon
//                               political_event_catalogue.md:26 invariant #1 + glossary :304 — the 6
//                               canonical categories, exact PascalCase-enum spelling).
//
// R9.3: this file matches migration 0106 byte-for-meaning (0114 additively generalizes it — see
//       §DD-B2 note above; 0128 additively generalizes it a 3rd time — see the DD-RW1 header note).
//       ch09 mirror: docs/tech/09_data_model/schema_effect_modifier.md (created same-commit 0106;
//       UPDATED same-commit as 0114 for DD-B2; UPDATED same-commit as 0128 for DD-RW1).
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: ADDITIVE only — migration 0106 modified no existing tables/columns; migration 0114
// (DD-B2) is ALSO additive-only on this shared table (relax-to-nullable + 1 new nullable FK column +
// 1 CHECK + 1 index — no existing row's value changes, no existing column removed/renamed); migration
// 0128 (DD-RW1) is ALSO additive-only (1 new nullable FK column + 1 CHECK swap 2-arg→3-arg + 1 index —
// same zero-data-change proof shape, no existing column removed/renamed).
// No player_id FK anywhere in this file: scope_ref is the polymorphic carrier for a player-scoped
// modifier (design §11); the global R9.3 "FK player_id ... ON DELETE CASCADE" convention does not
// apply here — neither table has a per-player row shape.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  integer,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// 04e-B C2 (DD-B2, migration 0114) — the live-ops parent ledger this file's `effect_modifier`
// generalizes toward (additive dual-FK). One-directional import only (this file →
// live_ops_event_active.ts) to avoid a circular module dependency — see live_ops_event_active.ts's
// own header note on why the reverse `many(effectModifier)` relation is deliberately NOT declared
// there.
import { liveOpsEventActive } from './live_ops_event_active';
// 04g-B C1 (DD-RW1, migration 0128) — the random-world parent ledger this file's `effect_modifier`
// generalizes toward a 3rd time (additive triple-FK). SAME one-directional-import discipline as the
// live-ops import above (this file → random_world.ts only) — random_world.ts does NOT import this
// file back, for the same TDZ/circular-module reason documented in live_ops_event_active.ts's header.
import { randomWorldEventActive } from './random_world';

// ===== pgEnums (3 closed-domain enum types for the effect engine) =====

/**
 * `effect_scope` — the D2 scope axis for a modifier (design §2.4, §11, §15).
 *
 * - `GLOBAL`   : citywide — always matches (no `scope_ref` needed).
 * - `DISTRICT` : matches when the consumer's `districtId` equals `scope_ref` (E-POL-12, checkpoint
 *                density substrate).
 * - `PLAYER`   : matches when the consumer's `playerId` equals `scope_ref` (built here; consumed
 *                live by 04e-B — the real per-player consumer for cohort-targeted live-ops events,
 *                `CohortTargetingService.evaluateCohortTargeting` resolves a predicate to
 *                `PlayerId[]`, applied PLAYER-scoped).
 * - `COHORT`   : would match a player cohort key (built here; RESERVED but UNEXERCISED — no
 *                consumer ever writes or matches a `scope_type='COHORT'` row today. 04e-B settled
 *                the cohort-KEY convention (`cohortKeyFor`, `cohort-targeting.service.ts`) but
 *                applies PLAYER-scope, not COHORT-scope. 04e-C's Event Composer (C6, D4 — decisions
 *                `2026-07-09-04e-C-composer-decisions.md` §5/§8#1) ratified keeping PLAYER-scope for
 *                launch; the first COHORT-scoped `applyEvent` is TD-178
 *                (`docs_int/tech_debt_inventory.md`).
 *
 * Design §2.2: "GLOBAL always matches; DISTRICT matches when scope.districtId equals the modifier's
 * scope_ref; PLAYER/COHORT matches when scope.playerId / cohort matches." (COHORT's matcher exists in
 * that design intent but has no real caller yet — see TD-178.)
 */
export const effectScope = pgEnum('effect_scope', [
  'GLOBAL',
  'DISTRICT',
  'PLAYER',
  'COHORT',
]);

/**
 * `effect_modifier_op` — the compose operation (design §2.4, §2.2).
 *
 * Compose order (fixed, `EffectOverlayStore.applyModifiers`, C3): all `MULTIPLY` folded first, then
 * all `ADD`, then any `SET` — documented precedence; ties broken by `effect_modifier.id` ascending.
 *
 * - `ADD`      : base + magnitude.
 * - `MULTIPLY` : base × magnitude.
 * - `SET`      : replace with magnitude (last write, per the fixed compose order).
 */
export const effectModifierOp = pgEnum('effect_modifier_op', [
  'ADD',
  'MULTIPLY',
  'SET',
]);

/**
 * `political_event_category` — the 6 canonical political-event categories
 * (canon `political_event_catalogue.md:26` invariant #1, glossary `:304`).
 *
 * `ELECTORAL` (E-POL-01) | `BUDGET` (E-POL-02/03) | `ORDINANCE` (E-POL-04/07/12) | `SCANDAL` (E-POL-09) |
 * `CRACKDOWN` (E-POL-06/08/11) | `REFORM` (E-POL-10).
 */
export const politicalEventCategory = pgEnum('political_event_category', [
  'ELECTORAL',
  'BUDGET',
  'ORDINANCE',
  'SCANDAL',
  'CRACKDOWN',
  'REFORM',
]);

// ===== Table 1: political_event_active — city-global active-event lifecycle (migration 0106) =====
//
// One row per event activation (city-global — the whole city shares one active-event set, design
// §5.2). `event_id` is a soft ref (text) to the hard-coded `PoliticalEvent` static-catalogue entry
// (A2 owns the static config; there is no DB-side `PoliticalEvent` table). `category` mirrors the
// static entry's category so reads don't need the static catalogue to filter/report.
//
// FK: NONE from `event_id` (soft ref to static config). `effect_modifier.active_event_id` FKs INTO
// this table (the reverse direction), CASCADE — deleting an active-event row cleans up any leftover
// modifier rows (defensive; the normal path is `revertEvent`'s explicit DELETE before this row would
// ever be removed, design §2.3).
// R9.3: matches migration 0106 byte-for-meaning.
export const politicalEventActive = pgTable('political_event_active', {
  /** PK: uuid generated at activation. */
  id: uuid('id').primaryKey().defaultRandom(),

  /**
   * event_id — soft ref (text) to the static `PoliticalEvent` catalogue entry (e.g. 'E-POL-01').
   * No DB FK: the catalogue is a hard-coded TS static config (design §3), not a DB table.
   */
  event_id: text('event_id').notNull(),

  /**
   * category — mirrors the static catalogue entry's category at activation time.
   * Canon 6-member enum (political_event_catalogue.md:26,304).
   */
  category: politicalEventCategory('category').notNull(),

  /**
   * activated_at_game_day — the in-game day (derived from gameMinute, design §5.1) this event
   * activated. Deterministic — never `Date.now()`.
   */
  activated_at_game_day: integer('activated_at_game_day').notNull(),

  /**
   * expires_at_game_day — nullable. NULL = "permanent-until-election" (design §3: E-POL-04/-07/-10/-12
   * revert only at the next election, or never). NOT NULL = the authoritative revert boundary
   * (`revertExpired`, C4).
   */
  expires_at_game_day: integer('expires_at_game_day'),
});

export type PoliticalEventActiveRow = typeof politicalEventActive.$inferSelect;
export type PoliticalEventActiveInsert = typeof politicalEventActive.$inferInsert;

// ===== Table 2: effect_modifier — the revert-guaranteed scoped overlay row (migration 0106) =====
//
// One row per (active event × effect). This table IS the persisted overlay (design §2.2/§2.3): the
// `EffectOverlayStore` (C3) snapshots it into memory; `applyEvent` (C4) INSERTs a batch
// transactionally; `revertEvent`/`revertExpired` (C4) DELETE the rows — the DELETE is the revert.
//
// FK: active_event_id → political_event_active(id) ON DELETE CASCADE.
// scope_ref: polymorphic text ref (district id / player id / cohort key) — NOT a DB FK (design §11).
// INDEX (tunable_key, scope_type): EffectOverlayStore's per-key reload query (C3).
// INDEX (active_event_id): revertEvent's DELETE-by-event (C4).
// INDEX (expires_at_game_day): revertExpired's NIGHTLY DELETE-by-expiry scan (C4).
// R9.3: matches migration 0106 byte-for-meaning.
export const effectModifier = pgTable(
  'effect_modifier',
  {
    /** PK: uuid generated at apply time (`applyEvent`, C4). */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * active_event_id — FK → political_event_active(id) ON DELETE CASCADE. NULLABLE since 04e-B C2
     * (DD-B2, migration 0114 — was NOT NULL at 0106). The political apply/revert path
     * (`EffectModifierService.applyEvent`/`revertEvent`) is BYTE-UNCHANGED: it still always sets
     * this column for every row it writes. Exactly one of `active_event_id` /
     * `live_ops_active_event_id` is ever set (`effect_modifier_exactly_one_parent_chk` below).
     */
    active_event_id: uuid('active_event_id')
      .references(() => politicalEventActive.id, { onDelete: 'cascade' }),

    /**
     * live_ops_active_event_id — NEW (04e-B C2, DD-B2, migration 0114). FK →
     * `live_ops_event_active(id)` ON DELETE CASCADE. The live-ops sibling of `active_event_id`: set
     * ONLY by `EffectModifierService.applyLiveOpsEvent`, cleared by `revertLiveOpsEvent`'s DELETE
     * (mirrors `active_event_id`'s own political-side contract exactly, one column per domain).
     */
    live_ops_active_event_id: uuid('live_ops_active_event_id')
      .references(() => liveOpsEventActive.id, { onDelete: 'cascade' }),

    /**
     * random_world_event_active_id — NEW (04g-B C1, DD-RW1, migration 0128). FK →
     * `random_world_event_active(id)` ON DELETE CASCADE. The random-world sibling of
     * `active_event_id`/`live_ops_active_event_id`: set ONLY by
     * `EffectModifierService.applyRandomWorldEvent`/`reapplyRandomWorldEvent`, cleared by
     * `revertRandomWorldEvent`'s DELETE (mirrors the other two parents' contract exactly, one column
     * per domain — DD-B2/DD-RW1 sibling discipline).
     */
    random_world_event_active_id: uuid('random_world_event_active_id')
      .references(() => randomWorldEventActive.id, { onDelete: 'cascade' }),

    /**
     * scope_type — the D2 scope axis. GLOBAL always matches; DISTRICT/PLAYER/COHORT match against
     * `scope_ref` (design §2.2).
     */
    scope_type: effectScope('scope_type').notNull(),

    /**
     * scope_ref — polymorphic text ref: district id (e.g. '7') / player id (uuid as text) / cohort
     * key. NULL when `scope_type` = GLOBAL (no ref needed). NOT a DB FK — deliberately polymorphic
     * (design §11 — no single parent table a polymorphic column could reference).
     */
    scope_ref: text('scope_ref'),

    /**
     * tunable_key — the registry key this modifier shifts (e.g.
     * 'T.city.raid_target_temperature'). Mirrors the existing `tunable_overrides.key` convention
     * (text, no length cap — registry keys are dotted paths, not bounded identifiers).
     */
    tunable_key: text('tunable_key').notNull(),

    /** op — the compose operation (ADD | MULTIPLY | SET). */
    op: effectModifierOp('op').notNull(),

    /**
     * magnitude — the compose operand. Drizzle `numeric()` string-mode (arbitrary precision, no
     * float rounding drift across apply/revert/compose — design §2.3 determinism).
     */
    magnitude: numeric('magnitude').notNull(),

    /**
     * applied_at_game_day — the in-game day this modifier was applied (deterministic, gameMinute-
     * derived — never `Date.now()`).
     */
    applied_at_game_day: integer('applied_at_game_day').notNull(),

    /**
     * expires_at_game_day — nullable. NULL = "permanent-until-election" (design §3). NOT NULL is the
     * authoritative revert boundary consumed by `revertExpired`'s NIGHTLY sweep (C4) — the
     * crash-safety invariant: a crash mid-event can never leave a permanent shift because this
     * column, not a floating baseline, is authoritative.
     */
    expires_at_game_day: integer('expires_at_game_day'),
  },
  (t) => ({
    /**
     * (tunable_key, scope_type) index — EffectOverlayStore's per-key snapshot rebuild (C3): on boot
     * and on `effect_modifiers_changed` reload, the store queries active modifiers grouped by key.
     */
    tunable_key_scope_idx: index('effect_modifier_tunable_key_scope_idx').on(
      t.tunable_key,
      t.scope_type,
    ),

    /**
     * (active_event_id) index — revertEvent's DELETE-by-event (C4).
     */
    active_event_idx: index('effect_modifier_active_event_idx').on(t.active_event_id),

    /**
     * (live_ops_active_event_id) index — NEW (04e-B C2, DD-B2, migration 0114). Mirrors
     * `active_event_idx` above: `revertLiveOpsEvent`'s DELETE-by-event.
     */
    live_ops_active_event_idx: index('effect_modifier_live_ops_active_event_idx').on(
      t.live_ops_active_event_id,
    ),

    /**
     * (random_world_event_active_id) index — NEW (04g-B C1, DD-RW1, migration 0128). Mirrors
     * `active_event_idx`/`live_ops_active_event_idx` above: `revertRandomWorldEvent`'s /
     * `reapplyRandomWorldEvent`'s DELETE-by-event.
     */
    random_world_event_active_idx: index('effect_modifier_random_world_event_idx').on(
      t.random_world_event_active_id,
    ),

    /**
     * (expires_at_game_day) index — revertExpired's NIGHTLY DELETE-by-expiry scan (C4). Rows with
     * NULL expiry (permanent) are naturally excluded by the `IS NOT NULL AND <= day` predicate.
     */
    expires_at_idx: index('effect_modifier_expires_at_idx').on(t.expires_at_game_day),

    /**
     * exactly-one-parent CHECK — SWAPPED 2-arg → 3-arg (04g-B C1, DD-RW1, migration 0128; was 2-arg
     * since 04e-B C2/DD-B2, migration 0114). Exactly one of `active_event_id` /
     * `live_ops_active_event_id` / `random_world_event_active_id` is ever non-null. Every
     * pre-DD-RW1 row (political: `active_event_id` set; live-ops: `live_ops_active_event_id` set)
     * already satisfies this unchanged — `random_world_event_active_id` is NULL on every such row.
     */
    exactly_one_parent_chk: check(
      'effect_modifier_exactly_one_parent_chk',
      sql`num_nonnulls(${t.active_event_id}, ${t.live_ops_active_event_id}, ${t.random_world_event_active_id}) = 1`,
    ),
  }),
);

export const effectModifierRelations = relations(effectModifier, ({ one }) => ({
  activeEvent: one(politicalEventActive, {
    fields: [effectModifier.active_event_id],
    references: [politicalEventActive.id],
  }),
  // NEW (04e-B C2, DD-B2) — the live-ops sibling relation. One-directional (see live_ops_event_active.ts
  // header note): `liveOpsEventActive` does not declare a reverse `many(effectModifier)` side.
  liveOpsActiveEvent: one(liveOpsEventActive, {
    fields: [effectModifier.live_ops_active_event_id],
    references: [liveOpsEventActive.id],
  }),
  // NEW (04g-B C1, DD-RW1) — the random-world sibling relation. Same one-directional discipline:
  // `randomWorldEventActive` (random_world.ts) does not declare a reverse `many(effectModifier)` side.
  randomWorldActiveEvent: one(randomWorldEventActive, {
    fields: [effectModifier.random_world_event_active_id],
    references: [randomWorldEventActive.id],
  }),
}));

export const politicalEventActiveRelations = relations(politicalEventActive, ({ many }) => ({
  modifiers: many(effectModifier),
}));

export type EffectModifierRow = typeof effectModifier.$inferSelect;
export type EffectModifierInsert = typeof effectModifier.$inferInsert;
