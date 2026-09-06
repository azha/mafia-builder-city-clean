// IMPLEMENTS: docs/tech/09_data_model/schema_lieutenant.md §20 (recruitment surface addendum) --
//             session:2026-07-11 -- 04f-B C1 (mig 0120, EARMARKED FOR RENUMBER -> 0123 at P3-A
//             integration -- see the migration file header + decisions.md §11)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §3 (data model)
//             Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md D5/D6/DD-R1
//
// `recruitment_candidates` + `recruitment_quests` -- the 04f-B (G11) quest-machine data model. `pool` /
// `quest_type` REUSE the shipped `lieutenant_source` pgEnum verbatim (DD-R1 -- no parallel
// `recruitment_pool` enum minted; identical 3-member domain `saltline|defector|civilian`).
//
// `recruitment_quests.candidate_id` is a REAL FK to `recruitment_candidates` (both tables land in this
// same file/migration -- trivial ordering, no cycle). `lieutenant.loyalty_seed_bucket` /
// `lieutenant.recruitment_quest_id` live in `./lieutenant.ts` instead of here (D5 -- loyalty seed is
// LIFETIME lieutenant state, not quest state) -- `recruitment_quest_id` is a LOGICAL pointer only (no
// `.references()`), specifically to avoid a circular schema-file import: this file imports
// `lieutenantSourcePg` FROM `./lieutenant.ts` (REUSE), so `./lieutenant.ts` cannot also import a table
// FROM this file without creating a cycle (see the migration file's own header note for the full
// reasoning + the `standing_order.target_entity_id` "no .references() Drizzle" precedent it mirrors).
import { pgTable, pgEnum, uuid, integer, bigint, jsonb, boolean, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';                 // REUSE Task 3 §5.1 — convention canonique FK player_id
import { lieutenantSourcePg } from './lieutenant';  // REUSE — quest_type/pool share the shipped 3-member enum
import { richCitizenRow } from './sparse_citizens'; // REUSE — recruitment_candidates.citizen_id (civilian pool, D7)

// ===== NEW enums (04f-B C1, mig 0120) =====

// hire_quality — the tech doc's agent-review 4 values verbatim (design §3/§7). A FROZEN projection of a
// completed quest's decisions, computed + persisted ONCE at finalizeHire (C3) — never mutated after.
export const hireQualityPg = pgEnum('hire_quality', ['WEAK', 'SOLID', 'STRONG', 'EXEMPLARY']);

// recruitment_quest_outcome — canon verbatim. NULL on recruitment_quests.outcome means the quest is
// ACTIVE (the partial-unique one-active-quest-per-candidate index keys off "outcome IS NULL").
export const recruitmentQuestOutcomePg = pgEnum('recruitment_quest_outcome', ['hired', 'declined_player', 'declined_candidate', 'abandoned']);

// ===== Table: recruitment_candidates (NEW) =====
// The candidate surface canon presumes but never declares (design §0 honesty note — canon's
// `candidate_npc_id` has no table to point at for Saltline/Defector; rich-NPCs exist only for civilians).
// `status` is plain `text` (NOT a pgEnum) — mirrors the `standing_order.status` precedent
// (schema_lieutenant.md §19.3a, migration 0034): a code-owned closed domain
// (available|in_quest|hired|expired|declined), application-enforced, not a DB CHECK.
export const recruitmentCandidates = pgTable(
  'recruitment_candidates',
  {
    candidate_id: uuid('candidate_id').primaryKey().defaultRandom(),

    // FK 1-N vers player. ON DELETE CASCADE (a player's candidate pool dies with the player — mirrors
    // equipment_failure_log/live_ops_notification's own player_id CASCADE convention, mig 0119/0117).
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    // The pool this candidate belongs to. REUSE lieutenant_source (DD-R1 — identical 3-member domain).
    pool: lieutenantSourcePg('pool').notNull(),

    // Civilian pool only (D7) — a REAL FK to the pre-existing rich_citizens pool. NULL for saltline/defector.
    citizen_id: uuid('citizen_id').references(() => richCitizenRow.citizen_id),

    // Defector pool only (D8/D10 input) — the qualifying rival's key. Plain text (no single-column PK on
    // rival_state to FK onto — the row is (player_id, rival_key) composite). NULL for saltline/civilian.
    source_rival_key: text('source_rival_key'),

    // Qualitative brief (district-familiarity band / prior-experience descriptor / ask band — NO stats,
    // D14 anosmia). NOT NULL — every candidate is surfaced WITH a profile (never a bare row).
    profile: jsonb('profile').notNull(),

    // Code-owned closed domain: 'available' | 'in_quest' | 'hired' | 'expired' | 'declined'.
    status: text('status').notNull().default('available'),

    surfaced_at_game_day: bigint('surfaced_at_game_day', { mode: 'number' }).notNull(),
    expires_at_game_day: bigint('expires_at_game_day', { mode: 'number' }),
  },
  (t) => ({
    // The player-facing "GET candidates?pool=" hot path (available candidates for a player's pool).
    player_pool_status_idx: index('recruitment_candidates_player_pool_status_idx').on(t.player_id, t.pool, t.status),
    // The C4 NIGHTLY/23 availability-tick dedup-gate hot paths (D7 "one row per citizen_id", D8 "one row
    // per qualifying rival") — registered now so C4 needs no re-index.
    citizen_id_idx: index('recruitment_candidates_citizen_id_idx').on(t.citizen_id),
    source_rival_key_idx: index('recruitment_candidates_source_rival_key_idx').on(t.source_rival_key),
  }),
);

export const recruitmentCandidatesRelations = relations(recruitmentCandidates, ({ one, many }) => ({
  player: one(player, { fields: [recruitmentCandidates.player_id], references: [player.player_id] }),
  citizen: one(richCitizenRow, { fields: [recruitmentCandidates.citizen_id], references: [richCitizenRow.citizen_id] }),
  quests: many(recruitmentQuests),
}));

// ===== Table: recruitment_quests (NEW) =====
// The canon SQL (lieutenant_recruitment_quests.md:100-115) transposed onto shipped conventions (design
// §3). `quest_type` REUSES lieutenant_source verbatim (DD-R1, same domain as `pool` above). `outcome`
// NULL = ACTIVE.
export const recruitmentQuests = pgTable(
  'recruitment_quests',
  {
    quest_id: uuid('quest_id').primaryKey().defaultRandom(),

    // FK 1-N vers player. ON DELETE CASCADE (mirrors recruitment_candidates.player_id above).
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    // REUSE lieutenant_source (DD-R1 — identical 3-member domain as recruitment_candidates.pool).
    quest_type: lieutenantSourcePg('quest_type').notNull(),

    // REAL FK — recruitment_candidates + recruitment_quests both land in THIS migration (trivial
    // ordering). ON DELETE RESTRICT: a candidate row is never deleted while a quest references it
    // (mirrors lieutenant.behavior_script_id RESTRICT, schema_lieutenant.md §5.2 — and candidate rows are
    // never deleted at all, GRANT UPDATE-only, so RESTRICT never actually fires; it documents intent).
    candidate_id: uuid('candidate_id').notNull().references(() => recruitmentCandidates.candidate_id, { onDelete: 'restrict' }),

    current_step: integer('current_step').notNull().default(1),
    sessions_consumed: integer('sessions_consumed').notNull().default(0),

    // The D2 session-gate anchor — game-minute space (city_sim_clock.game_minute convention). NULL until
    // the first advance.
    last_advanced_at_game_minute: bigint('last_advanced_at_game_minute', { mode: 'number' }),

    // Append-only decision log: [{ step, decision_type, decision_value, at_game_minute }, ...].
    decisions_made: jsonb('decisions_made').notNull().default(sql`'[]'::jsonb`),

    // The mapper's rolling projection (DD-R3 — the SAME mapper code maintains this AND the seeded script
    // at hire, one code path two call sites, so prediction never drifts from outcome).
    expected_outcome: jsonb('expected_outcome').notNull().default(sql`'{}'::jsonb`),

    // Set ONCE at finalizeHire (C3). NULL until hire.
    hire_quality_bucket: hireQualityPg('hire_quality_bucket'),

    // Defector pool only, server/BO-only (D9 — never player-projected, R2.2 leak-scan). NULL until the
    // residual roll fires at hire (defector) or n/a (saltline/civilian — stays NULL forever).
    double_agent: boolean('double_agent'),

    vetting_sessions_run: integer('vetting_sessions_run').notNull().default(0),

    started_at: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    ended_at: timestamp('ended_at', { withTimezone: true }),

    // NULL = ACTIVE (the partial-unique index below keys off this).
    outcome: recruitmentQuestOutcomePg('outcome'),
  },
  (t) => ({
    // The player-facing "GET quests?status=active|history" hot path (design §10).
    player_outcome_idx: index('recruitment_quests_player_outcome_idx').on(t.player_id, t.outcome),
    // Full per-candidate quest-history lookup (BO quest-history viewer TD, design §5).
    candidate_idx: index('recruitment_quests_candidate_idx').on(t.candidate_id),
    // The anti-double-quest guard — "a second active quest on the same candidate -> 409" (plan §C2
    // falsifiable floor). A candidate can accumulate MANY historical (ended) quest rows over time, but at
    // most ONE concurrently-active (outcome IS NULL) row.
    one_active_per_candidate_uq: uniqueIndex('recruitment_quests_one_active_per_candidate_uq')
      .on(t.candidate_id)
      .where(sql`${t.outcome} IS NULL`),
  }),
);

export const recruitmentQuestsRelations = relations(recruitmentQuests, ({ one }) => ({
  player: one(player, { fields: [recruitmentQuests.player_id], references: [player.player_id] }),
  candidate: one(recruitmentCandidates, { fields: [recruitmentQuests.candidate_id], references: [recruitmentCandidates.candidate_id] }),
}));

// ===== Types Drizzle inférés =====
export type RecruitmentCandidateRow    = typeof recruitmentCandidates.$inferSelect;
export type RecruitmentCandidateInsert = typeof recruitmentCandidates.$inferInsert;
export type RecruitmentQuestRow        = typeof recruitmentQuests.$inferSelect;
export type RecruitmentQuestInsert     = typeof recruitmentQuests.$inferInsert;

// ===== TS enum mirrors =====
export type HireQualityEnum            = (typeof hireQualityPg.enumValues)[number];
export type RecruitmentQuestOutcomeEnum = (typeof recruitmentQuestOutcomePg.enumValues)[number];
