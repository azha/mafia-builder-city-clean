// IMPLEMENTS: docs/tech/09_data_model/schema_lieutenant.md§2 -- session:2026-06-02 --
import {
  pgTable, pgEnum, uuid, varchar, integer, smallint, real, doublePrecision,
  bigint, timestamp, jsonb, boolean, text, index, uniqueIndex, primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';    // REUSE Task 3 §2
import { building } from './city_state';  // FK assigned_building_id → buildings (Phase-6 slice-1 — mirror operational_chain.ts import)

// ===== Enums Postgres natifs (chunk 2 §2.3 conventions enum natif PG) =====
// Membres GDD L120-131 verbatim.

// GDD L120 `source enum('saltline', 'defector', 'civilian')` — recrutement origine.
export const lieutenantSourcePg = pgEnum('lieutenant_source', ['saltline', 'defector', 'civilian']);

// GDD L125 `primary_or_understudy enum('primary', 'understudy')` — rôle de promotion.
export const primaryOrUnderstudyPg = pgEnum('primary_or_understudy', ['primary', 'understudy']);

// GDD L128 `extinction_state enum('STABLE', 'BURST', 'FADING', 'RESOLVED')` — REUSE 07 `extinction_window.md §ExtinctionPhaseComposite`.
export const extinctionStatePg = pgEnum('extinction_state', ['STABLE', 'BURST', 'FADING', 'RESOLVED']);

// GDD L139 `last_modified_by enum('player', 'admin', 'system')` — audit attribution behavior_script.
export const lastModifiedByPg = pgEnum('last_modified_by', ['player', 'admin', 'system']);

// GDD L143 `cue_type enum('DIRECT_ORDER', 'TERRITORY_STATE', 'RESOURCE_AVAILABILITY', 'TIME_SLOT', 'PEER_BEHAVIOR')` —
// REUSE 07 `signal_drift.md §CueKindEnum` (note REUSE-renamed signal_drift.md L56 : `LieutenantCueRegistry` GDD L143 est composite legacy →
// runtime composite renommé `CueReliabilityRegistry` ; côté DB ce chunk conserve les noms GDD verbatim R2.1).
// Nom enum PG `cue_type` GDD-verbatim ; PascalCase TS = `LtCueTypeEnum` (préfixe `Lt` anti-collision avec `CueKindEnum` runtime 07).
export const cueTypePg = pgEnum('cue_type', ['DIRECT_ORDER', 'TERRITORY_STATE', 'RESOURCE_AVAILABILITY', 'TIME_SLOT', 'PEER_BEHAVIOR']);

// GDD L171 `lapse_action enum('REVERT_DEFAULT', 'HOLD_LAST', 'ESCALATE_TO_PLAYER')` — REUSE 07 `standing_order_expiry.md §LapseActionComposite`.
export const lapseActionPg = pgEnum('lapse_action', ['REVERT_DEFAULT', 'HOLD_LAST', 'ESCALATE_TO_PLAYER']);

// GDD L185 `category enum('SUPPLY', 'FINANCIAL', 'PERSONNEL', 'OPERATIONS')` — catégories de veto sur veto_assignments.
export const vetoCategoryPg = pgEnum('veto_category', ['SUPPLY', 'FINANCIAL', 'PERSONNEL', 'OPERATIONS']);

// ===== NEW enums (Phase-6 vector #6 slice-1 — delegation/DSL) — migration 0026, propagés 09 §2/§4.1 =====
// granted_role — REUSE 07 `lieutenant_definition.md §Composite Lieutenant / GrantedRole`. Slice-1 utilise 'executor' ;
// 'advisory' = défaut sûr (rétro-fill inerte) ; 'delegated_owner'/'cohort_overseer' déclarés mais DÉFÉRÉS.
export const grantedRolePg = pgEnum('granted_role', ['advisory', 'executor', 'delegated_owner', 'cohort_overseer']);

// lieutenant_mode — REUSE 07 `lieutenant_definition.md §Composite Lieutenant / TaskedVsDelegated`. Slice-1 utilise
// 'delegated' (le tick LIEUTENANT_TICK évalue son script) ; 'tasked' = défaut sûr (rétro-fill inerte, DÉFÉRÉ).
export const lieutenantModePg = pgEnum('lieutenant_mode', ['tasked', 'delegated']);

// ===== NEW enum (04f-B C1 — Lieutenant Recruitment Quests, G11, migration 0124, D5/D6) =====
// loyalty_seed_bucket — the R2.2 composite replacing the canon GDD §2.8 scalar
// `civilian_loyalty_starting_value: 0.85` (D6 — 'seeded' is the migrated default, never a float key).
// Declared HERE (not in db/schema/recruitment.ts) to avoid a circular schema-file import: recruitment.ts
// imports lieutenantSourcePg FROM this file (REUSE, quest_type/pool) — this file cannot also import a
// table FROM recruitment.ts without a cycle, so the enum + the 2 ADD COLUMNs below stay local (see
// migrations/0124_recruitment_quests.sql's own header note for the full reasoning).
export const loyaltySeedBucketPg = pgEnum('loyalty_seed_bucket', ['seeded', 'tested', 'tempered', 'fractured']);

// ===== Table 1 : behavior_script (1-1 cible de lieutenant.behavior_script_id) =====
// GDD L135-140. Ordre de création DDL §7 = behavior_script AVANT lieutenant (FK forward).
export const behaviorScript = pgTable(
  'behavior_script',
  {
    // PK propre GDD L136. UUIDv7 généré côté serveur (REUSE Task 3 §2 pattern UUIDv7).
    script_id:         uuid('script_id').primaryKey().default(sql`uuidv7()`),
    // jsonb DSL — typed AST per `behavior_script_dsl.md §Composites BehaviorScript / Rule`. La structure est `{ rules: Rule[] }`.
    rules:             jsonb('rules').notNull().default(sql`'{"rules":[]}'::jsonb`),
    // GDD L138 timestamp de modification.
    last_modified_at:  timestamp('last_modified_at', { withTimezone: true }).notNull().defaultNow(),
    // GDD L139 attribution audit.
    last_modified_by:  lastModifiedByPg('last_modified_by').notNull().default('system'),

    // NEW (Phase-6 slice-1, migration 0026, propagé 09 §4.2) — la table 09 canonique ne stocke QUE le `rules` jsonb
    // (l'AST/IR compilé) ; slice-1 conserve la SOURCE DSL que le joueur a écrite pour le round-trip lecture + recompile.
    source:            text('source').notNull().default(''),
    // NEW (Phase-6 slice-1, migration 0026, propagé 09 §4.2) — résultat de compilation ; le tick ne lit que valid=true.
    valid:             boolean('valid').notNull().default(false),
  },
);

// ===== Table 2 : lieutenant (racine FK→player + FK→behavior_script) =====
// GDD L117-133. C'est l'entité 1-N enfant de player la plus volumineuse du chapitre 09.
export const lieutenant = pgTable(
  'lieutenant',
  {
    // PK propre GDD L118. UUIDv7.
    lieutenant_id: uuid('lieutenant_id').primaryKey().default(sql`uuidv7()`),

    // FK 1-N vers player. ON DELETE RESTRICT — OVERRIDE Task 3 §5.2 canon CASCADE (cf. §1 décision tranchée).
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'restrict' }),

    // GDD L119-120 name + name_locale (i18n note GDD L117 « locale-appropriate pool at creation » + L118 « non-destructive if player changes locale later »).
    // REUSE `19_i18n_strategy/dynamic_content_i18n.md §Génération unique` — le name est une donnée, pas un dictionnaire i18n ; name_locale traque la pool source.
    // Discipline applicative : `LieutenantService.create()` 04a pioche dans la pool selon player.locale courant ; jamais re-pioche au changement de locale (REUSE Task 3 §11 NestJS-game `PlayerService.updateLocale()` non-destructive).
    name:                 varchar('name', { length: 64 }).notNull(),
    name_locale:          varchar('name_locale', { length: 8 }).notNull(),

    // GDD L121 role_id int — FK logique vers une table de rôles canoniques 04a (`LieutenantRoleType` enum 14 valeurs ;
    // GDD route int car la projection 14 → 6 archétypes vit côté runtime via `LieutenantArchetype` REUSE 07).
    // Day-1 : pas de `.references()` Drizzle (la table `lieutenant_role` n'existe pas — c'est un enum applicatif côté 04a — GAP §16 si une table de rôles est introduite ultérieurement).
    role_id:              integer('role_id').notNull(),

    // GDD L122 source — recrutement origine.
    source:               lieutenantSourcePg('source').notNull(),

    // GDD L123 tenure_score int default 0 — ancienneté technique. BO-only scalaire (§8 projection → `TenureBucket`).
    // PHASE-11 REVIVAL (vector tenure inertia, Idea #38 — migration 0028) : ce scalaire est sémantiquement REVÉCU comme
    // le COMPTEUR DE STREAK ININTERROMPU (uninterrupted-occupancy streak) qui pilote la dérivation de bucket
    // (`bucketForStreak` REUSE `tenure-inertia.ts §TenureInertiaBucketComposite`). Toujours BO-only, toujours `integer`
    // notNull default 0 (type INCHANGÉ) ; 0028 ajoute seulement un CHECK (tenure_score >= 0). Le bucket est DÉRIVÉ du
    // streak, JAMAIS persisté (canon Invariant 4 — aucun scalaire/bucket exposé surface joueur ; projection = task A5).
    tenure_score:         integer('tenure_score').notNull().default(0),

    // GDD L124 recruited_at timestamp — sortie de l'état CANDIDATE (LifecycleState REUSE 07).
    recruited_at:         timestamp('recruited_at', { withTimezone: true }).notNull().defaultNow(),

    // GDD L125 succession_horizon float default 1.0 — probability successeur ready. BO-only scalaire (§8 projection → `SuccessionHorizonBucket`).
    // `real` PG = 4-byte float (suffit pour 0.0–1.0). Si précision étendue future requise → migration PALIMPSEST §3.2 vers `doublePrecision`.
    succession_horizon:   real('succession_horizon').notNull().default(1.0),

    // GDD L126 primary_or_understudy enum.
    primary_or_understudy: primaryOrUnderstudyPg('primary_or_understudy').notNull().default('primary'),

    // GDD L127 primary_for_role_id int null — si understudy, pointe vers le rôle qu'il backuppe.
    primary_for_role_id:   integer('primary_for_role_id'),

    // GDD L128 understudy_sync_pct int default 0 — % de sync de l'understudy avec son primary. BO-only scalaire (§8 projection → `UnderstudySyncBucket`).
    understudy_sync_pct:   integer('understudy_sync_pct').notNull().default(0),

    // GDD L129 extinction_state enum — REUSE 07 ExtinctionPhaseComposite.
    extinction_state:      extinctionStatePg('extinction_state').notNull().default('STABLE'),

    // GDD L130 burst_magnitude int default 0 — magnitude de la BURST en cours. BO-only scalaire (cf. §8 — qualitatif via extinction_state).
    burst_magnitude:       integer('burst_magnitude').notNull().default(0),

    // GDD L131 behavior_script_id uuid references behavior_scripts — FK 1-1 vers behavior_script.
    // ON DELETE RESTRICT côté FK PG (cf. §3 DDL — supprimer le behavior_script tant qu'un lieutenant le référence est RESTRICTé ; en pratique behavior_script est créé AVEC le lieutenant et ne disparait jamais sans le lieutenant).
    behavior_script_id:    uuid('behavior_script_id').notNull().references(() => behaviorScript.script_id, { onDelete: 'restrict' }),

    // ===== NEW colonnes (Phase-6 vector #6 slice-1 — delegation/operational state) — migration 0026, propagées 09 §4.1 =====
    // granted_role : niveau de délégation accordé. Défaut 'advisory' = inerte (rétro-fill des lieutenants pré-0026). REUSE 07 GrantedRole.
    granted_role:          grantedRolePg('granted_role').notNull().default('advisory'),
    // mode : tasked vs delegated. Défaut 'tasked' = inerte ; le tick ne sélectionne que mode='delegated'. REUSE 07 TaskedVsDelegated.
    mode:                  lieutenantModePg('mode').notNull().default('tasked'),
    // assigned_building_id : le bâtiment opérationnel délégué (NULL si non-délégué). FK → buildings(building_id) (NO ACTION par défaut PG).
    assigned_building_id:  uuid('assigned_building_id').references(() => building.building_id),
    // delegation_paused : l'état PAUSE_OPS. Défaut false ; posé true par le tick quand le script résout PAUSE_OPS, reclear à la reprise.
    delegation_paused:     boolean('delegation_paused').notNull().default(false),
    // ===== NEW colonne (Phase-7 vector #7 lieutenant archetypes — LOGISTICS dispatch destination, migration 0027) =====
    // target_building_id : le bâtiment DESTINATION du dispatch que l'archétype LOGISTICS sert (NULL si non-LOGISTICS).
    // FK → buildings(building_id) (NO ACTION par défaut PG — même shape que assigned_building_id 0026). COOK/SECURITY/BOOKKEEPER la laissent NULL.
    target_building_id:    uuid('target_building_id').references(() => building.building_id),
    // ===== NEW colonnes (Phase-11 vector tenure inertia — Idea #38, migration 0028) — BO-only, metadata-only ADD =====
    // tenure_reset_at_tick : l'ORIGINE du streak courant (tick du dernier reset de tenure_score), en espace
    //   city_sim_clock.game_minute (mode 'number' — calque tous les *_at_tick de operational_chain.ts). NULL = jamais
    //   reset (streak depuis le recrutement). Audit/observabilité BO-only — JAMAIS projeté surface joueur (Invariant 4).
    tenure_reset_at_tick:  bigint('tenure_reset_at_tick', { mode: 'number' }),
    // settling_until_tick : la fin de la fenêtre de DISRUPTION (settling window) ouverte par une réassignation, en
    //   espace city_sim_clock.game_minute. NULL = pas de disruption en cours. Armé par le tick/reassign (task A2/A4) à
    //   currentTick + disruptionTicks(bucket) ; BO-only, JAMAIS projeté surface joueur (Invariant 4).
    settling_until_tick:   bigint('settling_until_tick', { mode: 'number' }),

    // ===== NEW colonnes (04f-B C1 — Lieutenant Recruitment Quests, G11, migration 0124, D5) =====
    // loyalty_seed_bucket : LIFETIME state ("persists for the character's lifetime", canon §2.2 invariant
    //   6) — NULLable, NULL = classic/pre-04f-B recruit (honest, NO invented backfill). Written ONCE at
    //   quest hire (C3's finalizeHire); future systems (tenure/betrayal, TD) move it. R2.2-clean by
    //   construction — the composite IS the player-facing surface (no raw scalar loyalty anywhere).
    loyalty_seed_bucket:   loyaltySeedBucketPg('loyalty_seed_bucket'),
    // recruitment_quest_id : the lineage pointer ("why is this lieutenant the way they are" — quest-
    //   history viewer TD + BO). NULLable, LOGICAL pointer only (deliberately NO `.references()` — see the
    //   enum declaration comment above for the circular-import reasoning + migrations/
    //   0124_recruitment_quests.sql's header). Written ONCE at quest hire; NULL for classic recruits.
    recruitment_quest_id:  uuid('recruitment_quest_id'),
  },
  (table) => ({
    // Indexes (cf. §6).
    player_id_idx:           index('lieutenant_player_id_idx').on(table.player_id),
    role_id_idx:             index('lieutenant_role_id_idx').on(table.role_id),
    behavior_script_id_uq:   uniqueIndex('lieutenant_behavior_script_id_uq').on(table.behavior_script_id),  // 1-1 strict
    extinction_state_idx:    index('lieutenant_extinction_state_idx').on(table.extinction_state),
    primary_for_role_id_idx: index('lieutenant_primary_for_role_id_idx').on(table.primary_for_role_id),
    // NEW (Phase-6 slice-1, migration 0026) — le tick LIEUTENANT_TICK (T6) sélectionne les délégués par bâtiment assigné.
    assigned_building_idx:   index('lieutenant_assigned_building_idx').on(table.assigned_building_id),
  }),
);

// Relations 1-N côté lieutenant → player (calque chunk 2 §4.2 closure `}));`).
export const lieutenantRelations = relations(lieutenant, ({ one, many }) => ({
  player: one(player, {
    fields: [lieutenant.player_id],
    references: [player.player_id],
  }),
  // 1-1 vers behavior_script (REUSE chunk 2 §4.1).
  behaviorScript: one(behaviorScript, {
    fields: [lieutenant.behavior_script_id],
    references: [behaviorScript.script_id],
  }),
  // 1-N vers sub-entities (forward-refs vers les tables déclarées ci-dessous).
  cueRegistry:            many(lieutenantCueRegistry),
  taskExposure:           many(lieutenantTaskExposure),
  standingOrders:         many(standingOrder),
  jurisdictionBoundaries: many(jurisdictionBoundary),
  // Back-ref obligatoire Drizzle pour FK `veto_assignment.lieutenant_id` ON DELETE CASCADE (cf. §5.3).
  // Note : `veto_assignment` est une table de jonction N-M `player × category × lieutenant` —
  // la `many()` côté lieutenant matérialise les vetos qu'un lieutenant porte (utilisé par
  // `LieutenantService.retire()` 04a pour cleanup pré-retire + endpoint `/admin/lieutenants/:id/veto-assignments` §9).
  vetoAssignments:        many(vetoAssignment),
}));

export const behaviorScriptRelations = relations(behaviorScript, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [behaviorScript.script_id],
    references: [lieutenant.behavior_script_id],
  }),
}));

// ===== Table 3 : lieutenant_cue_registry (1-N — PK composite) =====
// GDD L142-147. REUSE 07 `signal_drift.md §CueReliabilityRegistry` (composite renommé runtime ; DB nom GDD-verbatim).
export const lieutenantCueRegistry = pgTable(
  'lieutenant_cue_registry',
  {
    lieutenant_id:     uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    cue_type:          cueTypePg('cue_type').notNull(),
    // GDD L145 reliability_score float — BO-only scalaire (§8 projection → `CueReliabilityBucket`).
    reliability_score: real('reliability_score').notNull().default(0.5),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.lieutenant_id, table.cue_type] }),
  }),
);

export const lieutenantCueRegistryRelations = relations(lieutenantCueRegistry, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [lieutenantCueRegistry.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Table 4 : lieutenant_task_exposure (1-N — PK composite) =====
// GDD L149-156. REUSE 07 `threshold_shaping.md §ExposureTierComposite / AversionCooldown`.
export const lieutenantTaskExposure = pgTable(
  'lieutenant_task_exposure',
  {
    lieutenant_id:             uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    task_category_id:          integer('task_category_id').notNull(),
    // GDD L152 exposure_tier int default 0 [0..5] — BO-only ordinal (§8 projection → `ExposureTierBucket`).
    exposure_tier:             smallint('exposure_tier').notNull().default(0),
    // GDD L153 aversion_flag bool default false.
    aversion_flag:             boolean('aversion_flag').notNull().default(false),
    // GDD L154 aversion_cooldown_expires timestamp.
    aversion_cooldown_expires: timestamp('aversion_cooldown_expires', { withTimezone: true }),
    // GDD L155 rehab_tolerance float default 0.3 — BO-only scalaire (§8 projection → `RehabProgressBucket`).
    rehab_tolerance:           real('rehab_tolerance').notNull().default(0.3),
    // GDD L156 rehab_progress float default 0.0 — BO-only scalaire.
    rehab_progress:            real('rehab_progress').notNull().default(0.0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.lieutenant_id, table.task_category_id] }),
  }),
);

export const lieutenantTaskExposureRelations = relations(lieutenantTaskExposure, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [lieutenantTaskExposure.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Table 5 : standing_order (1-N) =====
// GDD L165-174. REUSE 07 `standing_order_expiry.md §StandingOrderState`.
export const standingOrder = pgTable(
  'standing_order',
  {
    // GDD L166 PK propre.
    order_id:         uuid('order_id').primaryKey().default(sql`uuidv7()`),
    lieutenant_id:    uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    // GDD L168 instruction_type int — mapping applicatif vers `OrderKindComposite` REUSE 07 (`LOGISTICS | FINANCIAL | SECURITY | LAUNDERING | PRODUCT`).
    // Persisté int côté DB (GDD-verbatim R2.1) ; mapping enum-to-int géré par `StandingOrderService` REUSE 07.
    instruction_type: integer('instruction_type').notNull(),
    // GDD L169 target_entity_id uuid — FK logique polymorphe (peut pointer node / territory / role_archetype / task_category / peer_lieutenant
    // selon `OrderTargetKindComposite` REUSE 07 §Composite OrderTargetRef). Pas de `.references()` Drizzle day-1 (polymorphisme).
    target_entity_id: uuid('target_entity_id').notNull(),
    issued_at:        timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expires_at:       timestamp('expires_at', { withTimezone: true }).notNull(),
    // GDD L172 lapse_action enum REUSE 07 LapseActionComposite.
    lapse_action:     lapseActionPg('lapse_action').notNull().default('REVERT_DEFAULT'),
    // GDD L173 lapse_count int default 0 — compteur de lapse pour pattern flag (REUSE 07 `standing_order_expiry.md §Pattern flag`).
    lapse_count:      integer('lapse_count').notNull().default(0),

    // ===== NEW colonnes (Phase-25 L3 — Standing Order Expiry runtime, migration 0034) — propagées 09 §4.1 =====
    // rule : the COMPILED DSL rule (jsonb IR) this order injects at the executor tick — the `{ trigger, action, priority }`
    //   shape `behavior_script.rules[]` carries (REUSE the Phase-6 slice-1 IR). The injection re-stamps it to the reserved
    //   STANDING_ORDER_PRIORITY at runtime; `behavior_script.rules` is NEVER mutated (the override is a runtime injection,
    //   not a script edit). Defaults to an EMPTY '{}' (no rule) — the rule is set when an order is emitted (T2). NEW. (§4.1)
    rule:             jsonb('rule').notNull().default(sql`'{}'::jsonb`),
    // signature : the deterministic signature of `rule` (text) — the stable key the lapse-pattern counter + the
    //   promotion-suggestion track keys on (signatureFor(rule), pure/deterministic). Defaults to '' (no rule yet). NEW. (§4.1)
    signature:        text('signature').notNull().default(''),
    // status : the order lifecycle state (text, DEFAULT 'active'). One of active|lapsed|revoked|promoted|renewed — single
    //   active order per lieutenant (emitting while one is active → 409, RENEW instead). Mutated by evaluate/decision
    //   (T3/T4). NEW — the canonical lieutenant schema (GDD L165-174) modelled lapse_count but not the lifecycle status. (§4.1)
    status:           text('status').notNull().default('active'),
  },
  (table) => ({
    lieutenant_id_idx:   index('standing_order_lieutenant_id_idx').on(table.lieutenant_id),
    expires_at_idx:      index('standing_order_expires_at_idx').on(table.expires_at),
  }),
);

export const standingOrderRelations = relations(standingOrder, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [standingOrder.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Table 6 : jurisdiction_boundary (1-N — PK composite) =====
// GDD L176-180. REUSE 07 `jurisdiction_seam.md §JurisdictionSeamState`.
export const jurisdictionBoundary = pgTable(
  'jurisdiction_boundary',
  {
    lieutenant_id:  uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    shared_edge_id: integer('shared_edge_id').notNull(),
    // GDD L179 entries jsonb — array of {timestamp, event_type, severity}, cap 20.
    entries:        jsonb('entries').notNull().default(sql`'[]'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.lieutenant_id, table.shared_edge_id] }),
  }),
);

export const jurisdictionBoundaryRelations = relations(jurisdictionBoundary, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [jurisdictionBoundary.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Table 7 : veto_assignment (N-M — PK composite triple) =====
// GDD L182-186. REUSE 07 `veto_topology.md §VetoTopologyState`.
// FK player_id ON DELETE RESTRICT (cohérence §1 décision Lieutenant override) — un veto est un contrat actif sur l'org.
// FK lieutenant_id ON DELETE CASCADE — le veto disparait avec le lieutenant retiré.
export const vetoAssignment = pgTable(
  'veto_assignment',
  {
    player_id:     uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'restrict' }),
    category:      vetoCategoryPg('category').notNull(),
    lieutenant_id: uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.category, table.lieutenant_id] }),
    lieutenant_id_idx: index('veto_assignment_lieutenant_id_idx').on(table.lieutenant_id),
  }),
);

export const vetoAssignmentRelations = relations(vetoAssignment, ({ one }) => ({
  player: one(player, {
    fields: [vetoAssignment.player_id],
    references: [player.player_id],
  }),
  lieutenant: one(lieutenant, {
    fields: [vetoAssignment.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Types Drizzle inférés =====
export type LieutenantRow                = typeof lieutenant.$inferSelect;
export type LieutenantInsert             = typeof lieutenant.$inferInsert;
export type BehaviorScriptRow            = typeof behaviorScript.$inferSelect;
export type BehaviorScriptInsert         = typeof behaviorScript.$inferInsert;
export type LieutenantCueRegistryRow     = typeof lieutenantCueRegistry.$inferSelect;
export type LieutenantTaskExposureRow    = typeof lieutenantTaskExposure.$inferSelect;
export type StandingOrderRow             = typeof standingOrder.$inferSelect;
export type JurisdictionBoundaryRow      = typeof jurisdictionBoundary.$inferSelect;
export type VetoAssignmentRow            = typeof vetoAssignment.$inferSelect;

// ===== TS enum mirrors (PascalCase canoniques côté services NestJS — Drizzle infère depuis pgEnum) =====
export type LieutenantSourceEnum         = (typeof lieutenantSourcePg.enumValues)[number];
export type PrimaryOrUnderstudyEnum      = (typeof primaryOrUnderstudyPg.enumValues)[number];
export type ExtinctionStateEnum          = (typeof extinctionStatePg.enumValues)[number];
export type LastModifiedByEnum           = (typeof lastModifiedByPg.enumValues)[number];
export type LtCueTypeEnum                = (typeof cueTypePg.enumValues)[number];
export type LapseActionEnum              = (typeof lapseActionPg.enumValues)[number];  // alias TS — `LapseActionComposite` REUSE 07 reste le terme canonique runtime
export type VetoCategoryEnum             = (typeof vetoCategoryPg.enumValues)[number];
// NEW (Phase-6 slice-1) — REUSE 07 `lieutenant_definition.md §Composite Lieutenant`.
export type GrantedRoleEnum              = (typeof grantedRolePg.enumValues)[number];
export type LieutenantModeEnum           = (typeof lieutenantModePg.enumValues)[number];
// NEW (04f-B C1 — Lieutenant Recruitment Quests, G11, migration 0124, D5/D6).
export type LoyaltySeedBucketEnum        = (typeof loyaltySeedBucketPg.enumValues)[number];
