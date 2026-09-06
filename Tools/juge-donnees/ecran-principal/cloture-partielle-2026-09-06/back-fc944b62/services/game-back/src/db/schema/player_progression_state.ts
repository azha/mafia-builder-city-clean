// IMPLEMENTS: docs/tech/09_data_model/schema_player_progression_state.md§2 -- session:2026-06-02 --
//             P3-H C1 (mig 0141, 2026-07-24) — EXTENDED with the Pressure Inverse columns (design §3
//             divergence #1): `pressure_tier`/`graduation_count_since_last_pressure_unlock`/
//             `tier4_observation_until_tick`. See "Pressure columns (P3-H C1)" block below + the
//             migration's own header for the full account.
//             W1.1-a C1 (mig 0143, 2026-08-09) — EXTENDED with the onboarding funnel-state columns
//             (design D2/D3): `onboarding_funnel_step`/`first_decision_at`/`welcome_grant_claimed_at`.
//             See "Onboarding funnel-state columns (W1.1-a C1)" block below + the migration header.
//             W1.1-b C1 (mig 0146, 2026-08-09) — EXTENDED with `tutorials_opt_out` (design D4): the
//             tutorial-overlay-system opt-out flag. See "Onboarding funnel-state columns" block below.
import { pgTable, uuid, integer, timestamp, smallint, varchar, boolean, primaryKey, index, jsonb, check, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';  // Task 3 — convention canonique FK player_id REUSE §5.1

// W1.1-a C1 (mig 0143) — 8-member funnel-step domain (design D3, `day_1_funnel.md:264` — the 7 canon
// steps + the canon's own "optional" EXPLORE, INCLUDED here as a deliberate choice: a pgEnum only
// grows via migration, omitting a canon-named value now costs a whole extra migration later, design
// Deviation §9-3). 5 of 8 are server-observable (LAUNCH/HOME_FIRST/FIRST_COMMIT/SECOND_DECISION/
// QUIET_STATE); WELCOME/EXCEPTION_DETAIL/EXPLORE are client-only and get NO server writer, ever.
export const onboardingFunnelStep = pgEnum('onboarding_funnel_step', [
  'LAUNCH',
  'WELCOME',
  'HOME_FIRST',
  'EXCEPTION_DETAIL',
  'FIRST_COMMIT',
  'SECOND_DECISION',
  'QUIET_STATE',
  'EXPLORE',
]);

// W1.1-a C6 — the literal-union extraction, the SAME `(typeof pgEnumVar.enumValues)[number]` house
// idiom `PrimaryOrUnderstudyEnum` already names (`lieutenant.ts:376`) — never guessed/re-declared.
export type OnboardingFunnelStep = (typeof onboardingFunnelStep.enumValues)[number];

// ===== Table 1 : player_progression_state =====
// 1-1 strict avec Player (GDD L63-76). PK = FK player_id (calque chunk 2 §4.1).
export const playerProgressionState = pgTable(
  'player_progression_state',
  {
    // PK = FK strict 1-1 (REUSE convention canonique Task 3 §5.1 — `player_id` snake_case singular,
    // CASCADE per Task 3 §5.2 ligne 1-1 strict). Aucun index secondaire nécessaire — la PK B-tree
    // sert tous les access patterns (lookups par player_id sont les seuls de cette table).
    player_id: uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),

    // Colonnes GDD L66-73 verbatim (calque type-par-type avec ajustements documentés §3).
    complexity_budget_cap:              integer('complexity_budget_cap').notNull().default(100),                  // GDD L66
    complexity_budget_used:             integer('complexity_budget_used').notNull().default(0),                   // GDD L67
    decision_horizon_tier:              smallint('decision_horizon_tier').notNull().default(1),                   // GDD L68 — 1..3 (HorizonTierEnum REUSE 06) — ACTIVATED P3-H (first writer HorizonTierAdvancementService, C4), zero schema change
    rule_vocabulary_tier:               smallint('rule_vocabulary_tier').notNull().default(1),                    // GDD L69 — 1..6 (VocabTier REUSE 06)
    structural_decisions_this_session:  integer('structural_decisions_this_session').notNull().default(0),        // GDD L70
    last_session_id:                    uuid('last_session_id'),                                                  // GDD L71 — nullable, FK Task 12 future
    org_stress:                         integer('org_stress').notNull().default(0),                               // GDD L72
    compression_week_state:             varchar('compression_week_state', { length: 16 }).notNull().default('none'), // GDD L73 — enum simulé varchar day-1, CHECK constraint §3
    // PHASE-17 — the set of DSL signals the player has TAUGHT via an ADD_RULE resolution (distinct-count half of the
    // Tier 1→2 dual gate). Append-if-new by ProgressionService. Migration 0030.
    taught_signals: jsonb('taught_signals').$type<string[]>().notNull().default([]),

    // ── Pressure columns (P3-H C1, mig 0141, design §3 divergence #1) ──────────────────────────────
    // Columns, NOT a `player_pressure_tiers` table (R6 DEFINITIVE, C0 re-anchor §8 — mirrors the
    // P3-G budget-column precedent + every sibling pps tier column's own smallint+CHECK convention,
    // atomic single-row read alongside decision_horizon_tier/structural_decisions_this_session).
    pressure_tier:                             smallint('pressure_tier').notNull().default(1),                      // design §3/§8 — 1..4 (PressureTierEnum), CHECK below. First writer: PressureTierService.onGraduation (C5)
    graduation_count_since_last_pressure_unlock: smallint('graduation_count_since_last_pressure_unlock').notNull().default(0), // design §3/§8.1 — CHECK >= 0 below, reset to 0 on each tier unlock
    tier4_observation_until_tick:                  timestamp('tier4_observation_until_tick', { withTimezone: true }), // design §3/D9, R9 DEFINITIVE (C0 re-anchor §11) — REAL wall-clock stamp despite the "_tick" suffix; NULL unless a T4 observation window is open

    // ── Onboarding funnel-state columns (W1.1-a C1, mig 0143, design D2) ────────────────────────────
    // PERSISTENCE ONLY this chunk — zero writer lands here. `exceptions_resolved_session` (canon
    // composite `OnboardingFunnelState`) is REUSE `gameplay_session.exceptions_resolved`
    // (`sessions_and_audit.ts:45`, design §0.10) — NOT a column on this table. `onboarding_started_at`
    // is REUSE `player.created_at` (`player.ts:36`) — also not a column here (design §0.10).
    onboarding_funnel_step:    onboardingFunnelStep('onboarding_funnel_step').notNull().default('LAUNCH'), // design D2/D3 — first writer: C6's HOME_FIRST/FIRST_COMMIT/SECOND_DECISION/QUIET_STATE UPDATEs (not this chunk)
    first_decision_at:         timestamp('first_decision_at', { withTimezone: true }),                     // design D2/D3 — stamped ONCE, guard `IS NULL` (I6); first writer: C6 (not this chunk)
    welcome_grant_claimed_at:  timestamp('welcome_grant_claimed_at', { withTimezone: true }),               // design D1.1 pt 1 — the at-most-once grant claim; first writer: C3's OnboardingGrantService (not this chunk)

    // ── Tutorial-overlay opt-out (W1.1-b C1, mig 0146, design D4) ───────────────────────────────
    // Lives here, NOT on a `SettingsPayload` table (design D4 — that payload/screen has zero code,
    // §0.3): a future `SettingsPayload` (ch08) will READ/WRITE this column, never redeclare it
    // (R9.3). Already UPDATE-granted (0013:64) — no GRANT needed for this column, unlike
    // `tutorial_state` (append-only, explicit REVOKE, same migration).
    tutorials_opt_out:         boolean('tutorials_opt_out').notNull().default(false),                      // design D4 — read by OnboardingOverlayResolver.resolveEligibleOverlays (W1.1-b C5, LIVE — onboarding-overlay.resolver.ts:76); first writer: TutorialOptOutService.setOptOut (W1.1-b C4, LIVE — tutorial-opt-out.service.ts)
  },
  (table) => ({
    pressure_tier_chk: check('pps_pressure_tier_chk', sql`${table.pressure_tier} BETWEEN 1 AND 4`),
    graduation_count_since_last_pressure_unlock_chk: check(
      'pps_graduation_count_since_last_pressure_unlock_chk',
      sql`${table.graduation_count_since_last_pressure_unlock} >= 0`,
    ),
  }),
);

// Relations Drizzle 1-1 côté enfant (calque chunk 2 §4.1 — closure `}));` canonique).
export const playerProgressionStateRelations = relations(playerProgressionState, ({ one, many }) => ({
  player: one(player, {
    fields: [playerProgressionState.player_id],
    references: [player.player_id],
  }),
  // 1-N vers mastery_score (junction par task_category).
  masteryScores: many(masteryScore),
}));

// ===== Table 2 : mastery_score (junction) =====
// GDD L78-86 — junction (player_id, category_id) → 1 row per (player × task_category).
// REUSE 06_meta_progression/graduated_retirement_pivot.md §Composites — table `task_categories`
// est la même conceptuellement ; ce chunk 09 la nomme `mastery_score` per GDD L78 « table mastery_scores ».
// Le 06 utilise le nom `task_categories` côté repository (`TaskCategoryRepository`) — alignement
// terminologique tranché ICI en faveur de la nomenclature GDD `mastery_score` (table singulier-snake_case
// convention chunk 2 §2.3). Le service NestJS 06 (`MasteryAccumulatorService`/`TaskCategoryRepository`)
// pointera vers ce schema 09 lors de son implémentation effective.
export const masteryScore = pgTable(
  'mastery_score',
  {
    player_id:                  uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    category_id:                integer('category_id').notNull(),                                                 // GDD L80 — int (FK logique vers TaskCategoryEnum REUSE 06, pas une table)
    mastery_score:              smallint('mastery_score').notNull().default(0),                                   // GDD L81 — [0..100], smallint suffit + CHECK §3
    delegation_state:           varchar('delegation_state', { length: 16 }).notNull().default('SELF'),            // GDD L82 — enum simulé varchar, CHECK §3 — collision DelegationStateEnum 06 voir §4
    delegated_to_lieutenant_id: uuid('delegated_to_lieutenant_id'),                                               // GDD L83 — FK Task 6 future (lieutenant)
    graduated_at:               timestamp('graduated_at', { withTimezone: true }),                                // GDD L84 — null si pas encore graduée
  },
  (table) => ({
    // PK composite GDD L85.
    pk: primaryKey({ columns: [table.player_id, table.category_id] }),
    // Index secondaire REUSE recommandation 06/graduated_retirement_pivot.md §Implications par couche L289
    // — `(player_id, delegation_state)` hot paths `findByPlayer(ELIGIBLE)` et `mastery-distribution`.
    player_delegation_idx: index('mastery_score_player_delegation_idx').on(table.player_id, table.delegation_state),
  }),
);

export const masteryScoreRelations = relations(masteryScore, ({ one }) => ({
  player: one(player, {
    fields: [masteryScore.player_id],
    references: [player.player_id],
  }),
  // Relation vers progression_state via player_id partagé (sémantique : « la mastery d'un player est
  // un attribut de sa progression »). Drizzle n'a pas besoin de cette relation explicite — l'accès se
  // fait via player.progressionState.masteryScores (chemin canonique).
}));

// ===== Types inférés Drizzle =====
export type PlayerProgressionStateRow = typeof playerProgressionState.$inferSelect;
export type PlayerProgressionStateInsert = typeof playerProgressionState.$inferInsert;
export type MasteryScoreRow = typeof masteryScore.$inferSelect;
export type MasteryScoreInsert = typeof masteryScore.$inferInsert;
