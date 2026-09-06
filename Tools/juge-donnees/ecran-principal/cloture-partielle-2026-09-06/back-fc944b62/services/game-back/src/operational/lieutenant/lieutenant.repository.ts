// IMPLEMENTS: docs/tech/09_data_model/schema_lieutenant.md §2/§3/§4 (lieutenant + behavior_script — the 1:1
//             behavior_script_id FK direction; the 4 NEW slice-1 delegation columns granted_role / mode /
//             assigned_building_id / delegation_paused + the 2 NEW behavior_script columns source / valid — T0,
//             migration 0026) +
//             docs/tech/09_data_model/schema_city_state.md §2 (buildings — ownership) +
//             docs/tech/09_data_model/schema_operational_chain.md §2 (building_operational_state — the OPERATIONAL gate) +
//             docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §4-T4/§5 (recruit INSERTs an
//             empty behavior_script FIRST, then the lieutenant pointing at it via behavior_script_id, in ONE tx)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 4, lieutenant entity) --
//
// `LieutenantRepository` — the persisted access layer for the Phase-6 slice-1 lieutenant entity (recruit / attach /
// validate-read). Copies the persisted-system repository template (MoneyHoldingRepository / ProductionRepository): a thin
// `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service holding the
// per-action validation + the DSL-pipeline logic.
//
// R9.3: 09 is the source of truth for `lieutenant` + `behavior_script` (the delegation/DSL subset — T0, migration 0026) +
// `building` (Phase-1) + `building_operational_state` (operational chain). This file IMPORTS the existing schema and NEVER
// re-declares it. The runtime role app_rw has SELECT/INSERT/UPDATE on lieutenant + behavior_script (0013) — this
// repository uses exactly those. NO schema change (T0 owns the schema).
//
// THE OWNED-OPERATIONAL-BUILDING GATE (REUSE — the SAME join ProductionRepository.getOwnedOperationalBuilding /
// PrecursorsRepository use): the recruit's assigned building must be the player's OWN, ownership='player', and
// conversion_stage='operational'. We mirror that read here (rather than inject ProductionRepository across modules — the
// money_holding precedent likewise owns its own building joins) so the lieutenant module owns its reads. The returned
// operational_type lets the service reject a wrong-type host (a non-COOK-host building → 409).
//
// THE ATOMIC RECRUIT (one tx — a lieutenant is never created without its 1:1 behavior_script, and vice-versa): INSERT an
// empty behavior_script (the schema DEFAULTs — rules '{"rules":[]}', source '', valid false) → INSERT the lieutenant
// pointing at it via behavior_script_id (the 1:1 FK direction; behavior_script has NO lieutenant_id). All values are
// PARAMETERIZED bind params (no string interpolation). NO RNG (deterministic).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { behaviorScript, lieutenant } from '../../db/schema/lieutenant';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import { playerProgressionState } from '../../db/schema/player_progression_state';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { buildingOperationalState, dealer, moneyHolding, precursorStock, productStorage } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';
import { launderingNode, safehouse, tailRiskEstimate } from '../../db/schema/pipeline_and_laundering';
import { dwellTimeTunables } from '../../citysim/dwell_time/dwell-time-tunables';
import { player } from '../../db/schema/player';
import type { CompiledScript } from '../../dsl/ir';
import { nomPourLieutenant, PLACEHOLDER_NOM_LIEUTENANT } from './lieutenant-name-pool';
import type {
  GrantedRoleEnum,
  LieutenantModeEnum,
  LieutenantSourceEnum,
  LoyaltySeedBucketEnum,
  PrimaryOrUnderstudyEnum,
} from '../../db/schema/lieutenant';

/** ★ W1.1-a C4 (design §0.11, IM-1) — the Drizzle transaction-callback client type, extracted via
 *  `Parameters<...>` off the REAL `DrizzleClient['transaction']` signature (never guessed) — the SAME
 *  house idiom `core_loops/demolition/friction-budget.repository.ts:86`'s `FrictionTx` /
 *  `onboarding/onboarding-grant.repository.ts:36`'s `OnboardingGrantTx` already name. Lets `recruit`
 *  either open its OWN transaction (the 3 pre-existing callers, `executor` omitted — byte-identical)
 *  OR run INSIDE an ALREADY-OPEN transaction (the welcome-grant roster, C4 — the whole grant commits
 *  or rolls back as ONE unit, D1.1 pt 2). */
export type LieutenantTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/** A player-owned operational building's gate row — the recruit assigned-building validation input (or null = not owned
 *  / not converted / not operational → 404). `operational_type` lets the service reject a non-COOK-host type (→ 409). */
export interface OwnedOperationalBuilding {
  building_id: string;
  /** The operational type (lab/stash/front_shop/… — only a COOK-host type, slice 1 a `lab`, accepts a COOK lieutenant). */
  operational_type: string;
}

/** A player-owned lieutenant's REASSIGN row (Phase-11 A4 — the move+reset-tenure ownership gate; or null = not owned →
 *  404). Three fields the reassign service needs: `role_id` (→ the archetype, via archetypeForRoleId, to
 *  resolve the binding whose validateAssignment gates the new building) + `tenure_score` (the BO-only streak read BEFORE
 *  the reset, to size the OLD-bucket settling window — the canon: you forfeit the accumulated tenure AND pay a settling
 *  cost sized to what you had) + `tenure_reset_at_tick` (the Phase-13 cooldown clock — added by T1, see interface below).
 *  [lot-7 M-P13-2 2026-06-12] docstring updated: originally said "EXACTLY the two fields" before Phase-13 T1 added tenure_reset_at_tick.
 *  NO behavior_script join (the reassign path neither reads nor revises the script — kept
 *  deliberately leaner than `getOwnedLieutenant`, which now carries the attach-path behavior_script.valid join A4 does not
 *  need). Player-scoped so another player's lieutenant is invisible (404, never a cross-player leak / mutation). */
export interface OwnedLieutenantForReassign {
  lieutenant_id: string;
  /** The persisted 14-role id — the service derives the archetype from it (archetypeForRoleId) to pick the binding. */
  role_id: number;
  /** lieutenant.tenure_score — the BO-only uninterrupted-occupancy streak, read BEFORE the reset to size the OLD-bucket
   *  settling window (bucketForStreak → reassignment_disruption → disruptionTicks). */
  tenure_score: number;
  /** lieutenant.tenure_reset_at_tick — the tick of the LAST reassign (NULL if never reassigned). The cooldown clock:
   *  reassign is refused while now < tenure_reset_at_tick + decision_cooldown (Phase-13). BO-only. */
  tenure_reset_at_tick: number | null;
  /** lieutenant.assigned_building_id — the PRIOR building, read BEFORE the move (P3-D C6, design §9.2/§3.4
   *  ChangeType.LIEUTENANT_REASSIGNED "ancien + nouveau building"). `null` if the lieutenant was never
   *  assigned (a defensive edge the schema itself allows) — the annealing subscriber then has no OLD
   *  subgraph to anneal. */
  assigned_building_id: string | null;
}

/** A player-owned lieutenant's attach/validate row (or null = not owned → 404). Carries the 1:1 behavior_script_id the
 *  attach UPDATE targets, plus the JOINED behavior_script.valid (the PRIOR validity — the attach flow reads it BEFORE the
 *  updateBehaviorScript flips it true, to decide whether THIS attach is a genuine RE-script (valid→valid revision → open
 *  a tenure-scaled settling window, Phase-11 A3) or the FIRST authoring (false→true → no window — no-regression)) and the
 *  lieutenant.tenure_score (the uninterrupted-occupancy STREAK the settling window scales by, via bucketForStreak). The
 *  validate flow ignores both new fields (it never re-scripts / never opens a window). */
export interface OwnedLieutenant {
  lieutenant_id: string;
  behavior_script_id: string;
  /** behavior_script.valid BEFORE this attach — true = the attached script already compiled (a genuine revision). */
  valid: boolean;
  /** lieutenant.tenure_score — the BO-only uninterrupted-occupancy streak (Phase-11), input to bucketForStreak. */
  tenure_score: number;
  /** lieutenant.assigned_building_id (P3-D C6, design §9.2 ChangeType.MAJOR_SCRIPT_EDIT — "building
   *  d'affectation du lieutenant"). `null` if unassigned — the annealing subscriber then has nothing to
   *  anneal for a re-script on this lieutenant. */
  assigned_building_id: string | null;
  /** lieutenant.role_id (P3-F C5 — `GraduationService.executeGraduation` derives the candidate's
   *  `LieutenantArchetype` via `archetypeForRoleId` for the seed-mapper's vocabulary wall; design §8.2
   *  step 1 REUSES this SAME ownership query rather than a parallel one — an additive column, zero
   *  behavior change for the 3 pre-existing callers, which never read this field). */
  role_id: number;
}

/**
 * A player-owned lieutenant's PROJECTION row (T7 — the GET /v1/lieutenants/:id band source; or null = not owned → the
 * controller throws 404). Exactly the fields the band projection derives from, nothing more (NO tenure/extinction/etc. —
 * those never reach the player surface). `role_id` → the archetype band (via archetypeForRoleId — never surfaced raw);
 * `granted_role`/`mode` → the closed-domain enums (OK to surface); `delegation_paused`/`assigned_building_id` → the
 * op_state_band (the bool never surfaced raw); `source` → the player-authored DSL (the ONE allowed readable); `rules` →
 * the rule-count band (the count never surfaced raw). A READ — no state change. NB the projection NEVER returns
 * `rules` to the client — it is read here only to COUNT (the count → a band); the raw IR stays server-side.
 */
export interface LieutenantProjectionRow {
  role_id: number;
  granted_role: GrantedRoleEnum;
  mode: LieutenantModeEnum;
  delegation_paused: boolean;
  assigned_building_id: string | null;
  /** C3 (D7, L0.5) — `lieutenant.name` (a REAL varchar(64) column, never derived — unlike a building's
   *  `name_i18n`). The `lieutenants/:id` name (D7's own C3 falsifiable: `carte.lieutenant.name ==
   *  lieutenants/:id .name` — the SAME lieutenant must name identically wherever it is served). */
  name: string;
  /** The player-authored DSL source (behavior_script.source — round-tripped to the player; the one readable field). */
  source: string;
  /** The compiled IR (behavior_script.rules — read ONLY to derive the rule-count band; never surfaced to the client). */
  rules: CompiledScript;
  /** lieutenant.tenure_score — the BO-only uninterrupted-occupancy streak (Phase-11). A band INPUT ONLY (→ the
   *  tenure_bucket band + the 3 effect bands via bucketForStreak/effectsForBucket); the raw int NEVER surfaced (R2.2). */
  tenure_score: number;
  /** lieutenant.settling_until_tick — the BO-only settling-window end in game_minute space (Phase-11; NULL = no window).
   *  A band INPUT ONLY (→ the SETTLING op_state_band when > now); the raw tick NEVER surfaced (R2.2). */
  settling_until_tick: number | null;
  /** lieutenant.tenure_reset_at_tick — the tick of the LAST reassign (NULL = never reassigned; Phase-13). A band INPUT
   *  ONLY (→ the reassign_availability band when now < tenure_reset_at_tick + decision_cooldown); the raw tick NEVER
   *  surfaced (R2.2). */
  tenure_reset_at_tick: number | null;
}

/**
 * One ROSTER row (Phase-10 A1 — the GET /v1/lieutenants list source): exactly the fields LieutenantProjectionService.
 * rosterRows bands away, nothing more (the SAME band-input subset LieutenantProjectionRow carries, MINUS granted_role /
 * mode / source — the roster list surfaces only the 4 band fields { lieutenant_id, archetype, op_state_band,
 * rule_count_band }, so it needs neither the enum domains nor the authored script source). `role_id` → the archetype band
 * (via archetypeForRoleId — never surfaced raw); `delegation_paused`/`assigned_building_id` → the op_state_band (the bool
 * never surfaced raw); `rules` → the rule-count band (the count never surfaced raw). A READ — no state change. NB the
 * roster NEVER returns role_id / the building id / the raw count to the client (R2.2) — they are inputs to the bands only.
 */
export interface LieutenantRosterRow {
  lieutenant_id: string;
  /** C3 (D7, L0.5) — `lieutenant.name` (a REAL varchar(64) column). D7's registry: `RosterRow (name)`. */
  name: string;
  role_id: number;
  delegation_paused: boolean;
  assigned_building_id: string | null;
  /** The compiled IR (behavior_script.rules — read ONLY to derive the rule-count band; never surfaced to the client). */
  rules: CompiledScript;
  /** lieutenant.tenure_score — the BO-only uninterrupted-occupancy streak (Phase-11). A band INPUT ONLY (→ the
   *  roster's tenure_bucket band via bucketForStreak); the raw int NEVER surfaced (R2.2). */
  tenure_score: number;
  /** lieutenant.settling_until_tick — the BO-only settling-window end (Phase-11; NULL = no window). A band INPUT ONLY
   *  (→ the SETTLING op_state_band when > now); the raw tick NEVER surfaced (R2.2). */
  settling_until_tick: number | null;
}

/**
 * One DELEGATED, valid-script lieutenant the LIEUTENANT_TICK (T6) drives for a player — exactly the fields the tick
 * needs, nothing more (the tick never reads tenure/extinction/etc.). `rules` is the stored compiled IR (the
 * behavior_script.rules jsonb, the `{ rules: Rule[] }` CompiledScript the executor T3 consumes). `delegation_paused` is
 * the LAST resolution's PAUSE state (the tick writes it only on a transition). `assigned_building_id` may be null
 * defensively (the binding guards it → an empty snapshot / benign no-op); a delegated COOK lieutenant always has one.
 */
export interface DelegatedLieutenant {
  lieutenant_id: string;
  assigned_building_id: string | null;
  /** The LOGISTICS dispatch DESTINATION (T0's column; null for COOK/SECURITY/BOOKKEEPER) — passed to the binding. */
  target_building_id: string | null;
  /** The persisted 14-role id — the tick derives `role_archetype` from it (archetypeForRoleId) to pick the binding. */
  role_id: number;
  delegation_paused: boolean;
  /** The uninterrupted-occupancy STREAK counter (Phase-11 tenure inertia — BO-only). The tick increments it by +1 each
   *  minute a delegated lieutenant is NEITHER settling NOR paused; the bucket is DERIVED from it (bucketForStreak), never
   *  stored. Carried here only so a later derivation/projection can read the freshest streak; the tick itself increments
   *  atomically (incrementTenureScore) so it reads this only as a debug/observability snapshot. */
  tenure_score: number;
  /** The end of the active settling (disruption) window, in city_sim_clock.game_minute space (Phase-11 — BO-only). NULL =
   *  no disruption in progress. While `settling_until_tick > now` the delegation is SUSPENDED (no accrual, no script eval);
   *  once `<= now` the tick clears it (delegation resumes). Armed by the reassign task (A4); A2 only honors + clears it. */
  settling_until_tick: number | null;
  /** The compiled IR stored in behavior_script.rules (a valid script — the select filters behavior_script.valid=true). */
  rules: CompiledScript;
}

@Injectable()
export class LieutenantRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read a player-owned building that is OPERATIONAL (conversion_stage='operational', ownership='player'), RETURNING its
   * operational_type — the recruit assigned-building gate. The BYTE-MIRROR of ProductionRepository.getOwnedOperational-
   * Building: an unknown / non-owned / non-operational building → null (→ 404); an operational building is returned with
   * its operational_type so the service rejects a non-COOK-host type (→ 409). Player-scoped so another player's building
   * is invisible (404, never a cross-player leak).
   */
  async getOwnedOperationalBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<OwnedOperationalBuilding | null> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        operational_type: buildingOperationalState.operational_type,
      })
      .from(building)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The player's locale (player.locale, varchar(8) — nullable) for the recruited lieutenant's name_locale (which pool
   * the placeholder name is drawn from; 09 i18n note "locale-appropriate pool at creation"). Falls back to 'en' when the
   * player has no locale set (or no row). Player-scoped. A READ — no state change.
   */
  async getPlayerLocale(playerId: string): Promise<string> {
    const rows = await this.db
      .select({ locale: player.locale })
      .from(player)
      .where(eq(player.player_id, playerId))
      .limit(1);
    return rows[0]?.locale ?? 'en';
  }

  /** Count a player's lieutenants — the roster-cap input (count ≥ T.lieutenant.max_count_per_player → 409). Player-scoped. */
  async countByPlayer(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(lieutenant)
      .where(eq(lieutenant.player_id, playerId));
    return Number(rows[0]?.n ?? 0);
  }

  /**
   * Read a player-owned lieutenant (+ its 1:1 behavior_script_id, the JOINED behavior_script.valid, and the
   * lieutenant.tenure_score) — the attach/validate ownership gate. ONE inner join over the 1:1 behavior_script (the SAME
   * join getProjectionRow / listDelegatedForPlayer use). `valid` is the PRIOR script validity (the attach flow reads it
   * BEFORE updateBehaviorScript flips it true, to gate the Phase-11 A3 re-script settling window — a valid→valid revision
   * opens a window, a false→true first authoring does NOT); `tenure_score` is the BO-only streak the window scales by. The
   * validate flow ignores both (it never re-scripts). Returns null when the lieutenant is not the player's (→ 404).
   * Player-scoped so another player's lieutenant is invisible (404, never a cross-player leak / mutation).
   */
  async getOwnedLieutenant(playerId: string, lieutenantId: string): Promise<OwnedLieutenant | null> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        behavior_script_id: lieutenant.behavior_script_id,
        valid: behaviorScript.valid,
        tenure_score: lieutenant.tenure_score,
        assigned_building_id: lieutenant.assigned_building_id,
        role_id: lieutenant.role_id,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(and(eq(lieutenant.lieutenant_id, lieutenantId), eq(lieutenant.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * P3-H C3 (design §7.1/D3 — the `LIEUTENANT_PRESENT` `DeviationEvaluatorService` clause's own read;
   * divergence #7, C0-reanchor §6/R4 ★ DEFINITIVE). NOT player-scoped (the caller already resolved the
   * lieutenant via the plan's own `lieutenant_id` — an internal post-ownership read, mirrors
   * `StandingOrderRepository.getByIdWithOwner`'s own "not player-scoped, the tick already resolved
   * ownership" posture). Returns `null` for a nonexistent lieutenant_id (the evaluator's own
   * conservative-DEVIATED fallback, §7.2) — this repository never throws on a missing row. A READ — no
   * state change.
   */
  async getExtinctionState(lieutenantId: string): Promise<{ recruited_at: Date; extinction_state: string } | null> {
    const rows = await this.db
      .select({ recruited_at: lieutenant.recruited_at, extinction_state: lieutenant.extinction_state })
      .from(lieutenant)
      .where(eq(lieutenant.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Read a player-owned lieutenant's REASSIGN row (Phase-11 A4 + Phase-13 cooldown — the move+reset-tenure ownership gate):
   * role_id + tenure_score + tenure_reset_at_tick from `lieutenant` (NO behavior_script join — the reassign path neither
   * reads nor revises the script, so this stays leaner than getOwnedLieutenant, which carries the attach-path
   * behavior_script.valid join A4 does not need).
   * `role_id` → the archetype (the service derives it via archetypeForRoleId to resolve the binding whose validateAssignment
   * gates the new building); `tenure_score` → the BO-only streak read BEFORE the reset to size the OLD-bucket settling
   * window; `tenure_reset_at_tick` → the last-reassign tick for the Phase-13 decision_cooldown guard (NULL = never reassigned).
   * [lot-7 M-P13-2 2026-06-12] docstring updated: originally said "EXACTLY role_id + tenure_score" before Phase-13 T1 added tenure_reset_at_tick.
   * Player-scoped so another player's lieutenant is invisible → null → the service throws 404 (the player can only
   * reassign their OWN; never a cross-player leak / mutation). Returns null when the lieutenant is not the player's (or
   * does not exist). A READ — no state change.
   */
  async getOwnedLieutenantForReassign(
    playerId: string,
    lieutenantId: string,
  ): Promise<OwnedLieutenantForReassign | null> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        role_id: lieutenant.role_id,
        tenure_score: lieutenant.tenure_score,
        tenure_reset_at_tick: lieutenant.tenure_reset_at_tick,
        assigned_building_id: lieutenant.assigned_building_id,
      })
      .from(lieutenant)
      .where(and(eq(lieutenant.lieutenant_id, lieutenantId), eq(lieutenant.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Read the player's CURRENT in-game tick (city_sim_clock.game_minute — the monotonic minute counter the citysim
   * scheduler advances, schema_city_sim_clock §2). The Phase-11 A3 re-script settling window is opened in this tick-space
   * (`settling_until_tick = now + disruptionTicks(...)`), so the attach flow reads `now` here to anchor the window the
   * tick later honors (the tick's `now` is `ctx.gameMinute`, the SAME column). Returns the absolute game_minute, or 0 when
   * the player has no clock row yet (a just-seeded player who never advanced sits at tick 0 — the clock is lazy-created at
   * 0 on the first advance). Player-scoped. A READ — no state change.
   */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * The player's unlocked DSL vocab tier (`player_progression_state.rule_vocabulary_tier`, 1..6 — VocabTier REUSE 06).
   * Drives the compiler's tier-gate at attach/validate (Phase-12 T3). A player with no progression row defaults to 1 (the
   * column default — the smallint NOT NULL DEFAULT 1 on player_progression_state). Player-scoped. A READ — no state change.
   */
  async getRuleVocabularyTier(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ tier: playerProgressionState.rule_vocabulary_tier })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    return rows[0]?.tier ?? 1;
  }

  /**
   * Read a player-owned lieutenant's PROJECTION row (T7 — the GET /v1/lieutenants/:id band source): the fields the band
   * projection derives from (role_id, granted_role, mode, delegation_paused, assigned_building_id) + the JOINED
   * behavior_script (source — the player-authored DSL; rules — the compiled IR, read only to COUNT the rules into a band).
   * ONE inner join over the 1:1 behavior_script (the BYTE-MIRROR of listDelegatedForPlayer's join). Player-scoped so
   * another player's lieutenant is invisible → null → the controller throws 404 (the player reads only their OWN; never a
   * cross-player leak). Returns null when the lieutenant is not the player's (or does not exist). A READ — no state change.
   */
  async getProjectionRow(
    playerId: string,
    lieutenantId: string,
  ): Promise<LieutenantProjectionRow | null> {
    const rows = await this.db
      .select({
        role_id: lieutenant.role_id,
        granted_role: lieutenant.granted_role,
        mode: lieutenant.mode,
        delegation_paused: lieutenant.delegation_paused,
        assigned_building_id: lieutenant.assigned_building_id,
        name: lieutenant.name, // C3 (D7)
        source: behaviorScript.source,
        rules: behaviorScript.rules,
        // NEW (Phase-11 tenure inertia) — the BO-only streak + settling-window end; band INPUTS only (→ the tenure_bucket
        // + effect bands + the SETTLING op_state_band); the raw int / tick NEVER surfaced (R2.2).
        tenure_score: lieutenant.tenure_score,
        settling_until_tick: lieutenant.settling_until_tick,
        // NEW (Phase-13 decision cooldown) — the BO-only last-reassign tick; a band INPUT only (→ the reassign_availability
        // band when now < tenure_reset_at_tick + decision_cooldown); the raw tick NEVER surfaced (R2.2).
        tenure_reset_at_tick: lieutenant.tenure_reset_at_tick,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(and(eq(lieutenant.lieutenant_id, lieutenantId), eq(lieutenant.player_id, playerId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      role_id: row.role_id,
      granted_role: row.granted_role,
      mode: row.mode,
      delegation_paused: row.delegation_paused,
      assigned_building_id: row.assigned_building_id,
      name: row.name, // C3 (D7)
      source: row.source,
      rules: row.rules as CompiledScript, // the typed jsonb (the compiler T2 IR); read only to count → a band.
      tenure_score: row.tenure_score,
      settling_until_tick: row.settling_until_tick,
      tenure_reset_at_tick: row.tenure_reset_at_tick,
    };
  }

  /**
   * Read ALL the player's lieutenant ROSTER rows — the roster-list source (Phase-10 A1 — the GET /v1/lieutenants list).
   * Exactly the fields the roster band projection (LieutenantProjectionService.rosterRows) derives from, nothing more (the
   * SAME band-input set getProjectionRow returns for ONE lieutenant — role_id → the archetype band; delegation_paused +
   * assigned_building_id → the op_state_band — both surfaced ONLY as bands, never raw; rules → the rule-count band, the
   * count never surfaced raw). ONE inner join over the 1:1 behavior_script (the BYTE-MIRROR of getProjectionRow's /
   * listDelegatedForPlayer's join). Player-scoped (WHERE player_id = …) so another player's lieutenant is invisible (never
   * a cross-player leak). Ordered by recruited_at (a stable roster order; the recruited_at timestamp itself never leaves
   * this repo — only the row ORDER does). A player with NO lieutenant → an EMPTY array. A READ — no state change.
   */
  async listForPlayer(playerId: string): Promise<LieutenantRosterRow[]> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        name: lieutenant.name, // C3 (D7)
        role_id: lieutenant.role_id,
        delegation_paused: lieutenant.delegation_paused,
        assigned_building_id: lieutenant.assigned_building_id,
        rules: behaviorScript.rules,
        // NEW (Phase-11 tenure inertia) — the BO-only streak + settling-window end; band INPUTS only (→ the roster's
        // tenure_bucket band + the SETTLING op_state_band); the raw int / tick NEVER surfaced (R2.2).
        tenure_score: lieutenant.tenure_score,
        settling_until_tick: lieutenant.settling_until_tick,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(eq(lieutenant.player_id, playerId))
      .orderBy(lieutenant.recruited_at);
    return rows.map((r) => ({
      lieutenant_id: r.lieutenant_id,
      name: r.name,
      role_id: r.role_id,
      delegation_paused: r.delegation_paused,
      assigned_building_id: r.assigned_building_id,
      rules: r.rules as CompiledScript, // the typed jsonb (the compiler T2 IR); read only to count → a band.
      tenure_score: r.tenure_score,
      settling_until_tick: r.settling_until_tick,
    }));
  }

  /**
   * C3 (D7, L0.5) — resolve a SET of the player's OWN lieutenant ids → their display `name` (READ-ONLY;
   * `lieutenant` is never ALTERed here). Player-scoped (`WHERE player_id = playerId AND lieutenant_id IN
   * (…)`, the SAME "the player can only read their own" guarantee `getProjectionRow`/`listForPlayer`
   * enforce): an id belonging to ANOTHER player (or no player at all) is simply ABSENT from the returned
   * map — never resolved, never a cross-player leak. The CALLER (`ExceptionsService`/
   * `SessionOpenSequenceService`) compares the returned map's SIZE to the distinct id set it asked for; a
   * shortfall means a foreign/nonexistent id slipped in, and the caller refuses the WHOLE request
   * (`ApiError('RESOURCE_NOT_FOUND')`, D7's own "un id étranger devient une absence détectable et
   * refusée") rather than silently omitting one card's name. Returns `new Map()` for an empty `ids` (no
   * round-trip). A READ — no state change.
   */
  async namesByIds(playerId: string, ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id, name: lieutenant.name })
      .from(lieutenant)
      .where(and(eq(lieutenant.player_id, playerId), inArray(lieutenant.lieutenant_id, ids as string[])));
    return new Map(rows.map((r) => [r.lieutenant_id, r.name]));
  }

  /**
   * Read the assigned building's current heat magnitude + its operational_type — the two reads the COOK delegation binding
   * (T5) needs for the assigned building: `heat` feeds the `events.heat` signal (a RAW read of `buildings.heat` — the
   * internal engine value, NOT a player projection, so the bare number is correct here), and `operational_type` (from
   * building_operational_state — the SAME join `getOwnedOperationalBuilding` uses) drives `substanceForBuildingType` for
   * the EXECUTE_DEFAULT startCook. ONE join over the assigned building (no second round-trip). NOT player-scoped: the
   * binding has already resolved the building via the player-owned lieutenant row, so this is an internal post-ownership
   * read. Returns null when the building (or its operational state) is absent. A READ — no state change.
   */
  async getAssignedBuildingState(
    buildingId: string,
  ): Promise<{ heat: number; operational_type: string } | null> {
    const rows = await this.db
      .select({
        heat: building.heat,
        operational_type: buildingOperationalState.operational_type,
      })
      .from(building)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(eq(building.building_id, buildingId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Read the assigned building's current structural_state (operational | damaged | repairing — building_operational_state,
   * §7.4) — the read the SECURITY delegation binding (T2) needs: `structural_state === 'damaged'` feeds the
   * `state.building_damaged` signal (a delegated SECURITY lieutenant repairs its building when it has been raided into the
   * DAMAGED state). The SAME building_operational_state row the repair action validates against; read here via the repo
   * boundary so the binding never duplicates a structural-state query. NOT player-scoped: the binding has already resolved
   * the building via the player-owned lieutenant row, so this is an internal post-ownership read (the SAME convention
   * getAssignedBuildingState uses). Returns null when the building has no operational state row (absent / not converted).
   * A READ — no state change.
   */
  async getBuildingStructuralState(buildingId: string): Promise<string | null> {
    const rows = await this.db
      .select({ structural_state: buildingOperationalState.structural_state })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.building_id, buildingId))
      .limit(1);
    return rows[0]?.structural_state ?? null;
  }

  /**
   * Read the player's wallet balance (economy_states.cash_cents) — the read the BOOKKEEPER delegation binding (T3) needs:
   * `wallet_cents` feeds the `state.wallet_cents` signal (the rule `WHEN STATE(wallet_cents,>=,<threshold>) THEN
   * EXECUTE_DEFAULT` compares it). A RAW internal engine read of the wallet — NOT a player projection, so the bare number
   * is correct here (the SAME convention getAssignedBuildingState uses for raw heat). Player-scoped (the wallet is keyed by
   * player_id). Returns the cash as a bigint (the cash_cents bigint column — parity with money_holding.held_cents so the
   * greedy-amount math is BigInt with NO precision loss), or null when the player has no economy_states row (the binding
   * then OMITS the signal, per the absence contract). A READ — no state change.
   */
  async getWalletCents(playerId: string): Promise<bigint | null> {
    const rows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    return rows[0]?.cash_cents ?? null;
  }

  /**
   * Read a money_holding's current (money_holding_tier, held_cents) for a building — the read the BOOKKEEPER delegation
   * binding (T3) needs to compute the greedy deposit amount: `amount = min(wallet − reserve, capacityCentsForTier(tier) −
   * held)`. The SAME money_holding row MoneyHoldingService.deposit guards against; read here via the repo boundary so the
   * binding never duplicates a money_holding query. NOT player-scoped: the binding has already resolved the building via
   * the player-owned lieutenant row, so this is an internal post-ownership read (the SAME convention getAssignedBuilding-
   * State / getBuildingStructuralState use). `held_cents` is a bigint (parity with the deposit math); `money_holding_tier`
   * is the int tier capacityCentsForTier reads. Returns null when the building has no money_holding row (absent / not a
   * money_holding) → the binding takes a benign no-op. A READ — no state change.
   */
  async getMoneyHoldingState(
    buildingId: string,
  ): Promise<{ money_holding_tier: number; held_cents: bigint } | null> {
    const rows = await this.db
      .select({
        money_holding_tier: moneyHolding.money_holding_tier,
        held_cents: moneyHolding.held_cents,
      })
      .from(moneyHolding)
      .where(eq(moneyHolding.building_id, buildingId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Read the TOTAL product grams a source building currently holds (SUM of product_storage.quantity_grams over ALL
   * substances at the building) — the read the LOGISTICS delegation binding (T4) needs for BOTH its signal and its cargo
   * sizing: `source_has_product` = (total > 0) feeds the `state.source_has_product` signal, and `applyExecuteDefault`
   * dispatches min(logisticsDispatchCargoGrams, total) (so it never dispatches more than the source holds — the dispatch's
   * own per-substance guard then re-validates the actual single substance it picks). The SAME product_storage table
   * DistributionService.dispatch sources from; read here via the repo boundary so the binding never duplicates a
   * product-storage query. NOT player-scoped: the binding has already resolved the building via the player-owned lieutenant
   * row, so this is an internal post-ownership read (the SAME convention getAssignedBuildingState / getMoneyHoldingState
   * use). Returns 0 when the building holds no product (no rows) — a number, never null (the binding treats 0 as "empty";
   * the COALESCE(SUM,0) is exact for the integer quantity_grams column). A READ — no state change.
   */
  async getSourceProductGrams(buildingId: string): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${productStorage.quantity_grams}), 0)::int` })
      .from(productStorage)
      .where(eq(productStorage.building_id, buildingId));
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * Read a player-owned SAFEHOUSE's id + RECONSTRUCTED held cents + TOTAL slot capacity cents BY its host building_id
   * (safehouse.building_id — the entity↔building FK) — the read the LAUNDERING delegation binding (T1) AND the DISTRIBUTION
   * delegation binding (T2) need. LAUNDERING uses { safehouse_id, held_cents }: held > 0 feeds its `safehouse_filled`
   * signal, and its inject call needs the safehouse ENTITY id (LaunderingService.inject's `safehouseId` arg resolves
   * getOwnedSafehouse by safehouse_id, NOT building_id). DISTRIBUTION (T2) additionally reads `capacity_cents` to derive
   * the safehouse FREE HEADROOM (capacity − held) for its `safehouse_headroom_cents` signal + its all-or-nothing
   * collect pre-check, and uses the SAME entity id for SellingService.collect (whose `safehouseId` arg is likewise the
   * safehouse ENTITY id). The lieutenant only stores the safehouse BUILDING id in target_building_id, so the entity id is
   * surfaced here for both bindings. The held cents are reconstructed the SAME way LaunderingService.drainSlots / the
   * selling E2E do — Σ over the System-9 percent slot array of round((per-slot-percent / 100) × slot_capacity_cents)
   * (current_fill is per-slot PERCENT, NOT cents — selling/laundering.service.ts headers); `capacity_cents` =
   * slot_count × slot_capacity_cents (the System-9 total cents capacity the collect's exact headroom guard checks against,
   * NOT a re-derived cap). Computed in SQL (jsonb_array_elements_text over current_fill) so the binding never duplicates
   * the slot-reconstruction loop. Player-scoped + keyed by the safehouse's building_id (so it doubles as the
   * safehouse-by-building OWNERSHIP gate validateAssignment uses: a building with no safehouse row for this player → null
   * → 404/no-op). The cents are NUMBER (slot_capacity_cents is `integer`; the reconstruction + the slot_count product are
   * integer cents). Returns { safehouse_id, held_cents (≥ 0), capacity_cents (≥ 0) }, or null when the building hosts no
   * safehouse for this player. A READ — no state change.
   */
  async getSafehouseForBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<{ safehouse_id: string; held_cents: number; capacity_cents: number } | null> {
    const rows = await this.db
      .select({
        safehouse_id: safehouse.safehouse_id,
        held_cents: sql<number>`COALESCE((
          SELECT SUM(round((v::numeric / 100) * ${safehouse.slot_capacity_cents}))::int
          FROM jsonb_array_elements_text(${safehouse.current_fill}) v
        ), 0)`.as('held_cents'),
        // The System-9 TOTAL cents capacity = slot_count × slot_capacity_cents (the SAME total the collect's exact
        // headroom guard checks against — fillSlots: used + deposit > slot_count × capacity → refuse). REUSE, not redefine.
        capacity_cents: sql<number>`(${safehouse.slot_count} * ${safehouse.slot_capacity_cents})`.as('capacity_cents'),
      })
      .from(safehouse)
      .where(and(eq(safehouse.player_id, playerId), eq(safehouse.building_id, buildingId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      safehouse_id: r.safehouse_id,
      held_cents: Number(r.held_cents),
      capacity_cents: Number(r.capacity_cents),
    };
  }

  /**
   * Read the DEALER hosted at a dealer-spot building (dealer.home_building_id — the dealer↔spot-building FK) for the
   * player — the read the DISTRIBUTION delegation binding (T2) needs for BOTH its `dealer_float_cents` signal AND its
   * collect call: the dealer's accumulated `float_cents` feeds the signal (the rule `WHEN STATE(dealer_float_cents,>=,
   * <threshold>) THEN EXECUTE_DEFAULT` compares it), and `applyExecuteDefault` calls SellingService.collect — whose
   * `dealerId` arg is the dealer ENTITY id (it resolves getOwnedDealer by dealer_id, NOT building_id), so the binding
   * needs the dealer entity id surfaced here (the lieutenant only stores the dealer-spot BUILDING id in
   * assigned_building_id). The SAME dealer row SellingService.collect guards against; read here via the repo boundary so
   * the binding never duplicates a dealer query. Player-scoped + keyed by the dealer's home_building_id (so it doubles as
   * the dealer-at-spot EXISTENCE gate validateAssignment uses: a building with no dealer row for this player → null → 409
   * "no dealer at this spot"). `float_cents` is the bigint column with mode:'number', so Drizzle returns a JS NUMBER
   * (exact for M1 magnitudes) — coerced via Number for safety. Returns { dealer_id, float_cents (≥ 0),
   * coverage_lek_tile_id } or null (no dealer hosts this building for this player). The `coverage_lek_tile_id` is
   * a soft-ref integer (the lek cell the dealer operates on) — surfaced here for the R6 Lek↔lieutenant perf multiplier
   * in DistributionBindingService (no FK, soft-ref only). A READ — no state change. (M1 hosts one dealer per spot —
   * LIMIT 1; the substance×spot-type / multi-dealer model is deferred, so a single dealer per home_building_id is the
   * slice invariant.)
   */
  async getDealerForSpotBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<{ dealer_id: string; float_cents: number; coverage_lek_tile_id: number } | null> {
    const rows = await this.db
      .select({
        dealer_id: dealer.dealer_id,
        float_cents: dealer.float_cents,
        coverage_lek_tile_id: dealer.coverage_lek_tile_id,
      })
      .from(dealer)
      .where(and(eq(dealer.player_id, playerId), eq(dealer.home_building_id, buildingId)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return { dealer_id: r.dealer_id, float_cents: Number(r.float_cents), coverage_lek_tile_id: r.coverage_lek_tile_id };
  }

  /**
   * Apply the Lek→lieutenant performance adjustment to a dealer's float_cents (D2 R6).
   *
   * Sets the dealer's `float_cents` to `adjustedCents` in-place, scoped by player_id.
   * Called by DistributionBindingService.applyExecuteDefault ONLY when the Lek performance
   * multiplier != 1.0 (i.e., when the tile has a Lek Memory aggregate that deviates from neutral).
   * The subsequent SellingService.collect will read the adjusted float and ferry it to the safehouse.
   *
   * R9.3 (no schema change): `float_cents` is owned by schema_operational_chain.md §2 (dealer) — this
   * method writes the SAME column the DEALER_SELL tick and SellingService.collect guard against.
   * The mutation is non-atomic with the subsequent collect (no two-phase guarantee), but in the
   * delegation tick context there is no concurrent sell for the same dealer — the pre-check and the
   * collect's own guarded zero still cover any race (a concurrent 409 surfaces as a benign no-op in
   * the binding's existing catch). A READ — no structural change.
   *
   * NOT called for the zero-regression (no-Lek / neutral) path — multiplier = 1.0 means the float is
   * untouched and the collect proceeds byte-identically to pre-R6.
   */
  async applyLekPerfAdjustment(
    playerId: string,
    dealerId: string,
    adjustedCents: number,
  ): Promise<void> {
    await this.db
      .update(dealer)
      .set({ float_cents: adjustedCents })
      .where(and(eq(dealer.player_id, playerId), eq(dealer.dealer_id, dealerId)));
  }

  /**
   * Read a player-owned front-shop's STAGE-1 laundering node occupancy + capacity (cents) BY its host building_id
   * (laundering_node.building_id, stage_index=1 — the front-shop Stage-1 node) — the read the LAUNDERING delegation binding
   * (T1) needs for its `node_has_capacity` signal AND its amount policy (the node free capacity = capacity − occupancy):
   *   - occupancy_cents = tail_risk_estimates.current_occupancy (System 10's cash field — the in-process buffered cash;
   *     LEFT JOIN → 0 when no estimate row yet). The SAME field LaunderingService.getStage1Node reads.
   *   - capacity_cents = the node CENTS cap = dwell_time inventory_cap_per_node × 100 (System 8 treats
   *     inventory_cap_per_node as DOLLARS — the SAME capacity LaunderingService.inject pins the node at; REUSE the
   *     dwell-time tunable, never a re-derived cap). A code-owned uniform per-node cap (not a stored column).
   * Player-scoped + keyed by the front-shop's building_id at stage_index=1 (so a building with no Stage-1 node → null,
   * which validateAssignment turns into the "no Stage-1 node at this building" 409). Returns { occupancy_cents,
   * capacity_cents } or null (no Stage-1 node for this player on this building). A READ — no state change.
   */
  async getStage1NodeOccupancyForBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<{ occupancy_cents: number; capacity_cents: number } | null> {
    const rows = await this.db
      .select({
        occupancy_cents: sql<number>`COALESCE(${tailRiskEstimate.current_occupancy}, 0)`.as('occupancy_cents'),
      })
      .from(launderingNode)
      .leftJoin(tailRiskEstimate, eq(tailRiskEstimate.node_id, launderingNode.node_id))
      .where(
        and(
          eq(launderingNode.player_id, playerId),
          eq(launderingNode.building_id, buildingId),
          eq(launderingNode.stage_index, 1),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    // The node CENTS capacity = inventory_cap_per_node × 100 (the SAME cap LaunderingService.inject pins on the node;
    // REUSE the dwell-time tunable — never a re-derived cap). Floored at 1 to mirror the inject's Math.max(1, …) guard.
    const capacityCents = Math.max(1, dwellTimeTunables.inventoryCapPerNode * 100);
    return { occupancy_cents: Number(r.occupancy_cents), capacity_cents: capacityCents };
  }

  /**
   * The ATOMIC RECRUIT, in ONE DB transaction (a lieutenant is never created without its 1:1 behavior_script): INSERT a
   * behavior_script → INSERT the lieutenant pointing at it via behavior_script_id (the 1:1 FK direction; behavior_script
   * has NO lieutenant_id). The canonical tenure/extinction columns are left to their 09 DEFAULTs (inert in slice 1).
   * Returns the new lieutenant_id. DETERMINISTIC (no RNG — the uuids are uuidv7 server defaults).
   *
   * `initialScript` (04f-A C7, DD8/D9 — OPTIONAL, ADDITIVE): when provided (the Facility-manager seeded default
   * script — `LieutenantService.recruit` compiles it BEFORE calling this method), the behavior_script row is
   * INSERTed with that `source`/`rules`/`valid=true`/`last_modified_by='system'` INSTEAD OF the schema DEFAULTs —
   * atomically, in the SAME transaction (never a separate post-recruit UPDATE — a lieutenant with a seeded
   * default script is never observable mid-recruit with an empty one). Every OTHER archetype omits this param →
   * the behavior_script INSERT is `.values({})` (all schema DEFAULTs — rules '{"rules":[]}', source '', valid
   * false, last_modified_by 'system') — BYTE-IDENTICAL to before C7.
   *
   * `hireCostCents` / `loyaltySeedBucket` / `recruitmentQuestId` (04f-B C3, D4/D5 — OPTIONAL, ADDITIVE): the
   * recruitment quest's negotiated one-time hire debit + the C1 lineage columns. When `hireCostCents` is
   * provided, a GUARDED DEBIT (`UPDATE economy_states SET cash_cents = cash_cents - cost WHERE player_id = ?
   * AND cash_cents >= cost`, the maintenance/repair guarded-debit convention) runs FIRST, INSIDE this SAME
   * transaction — insufficient balance → 0 rows → `RecruitHireDebitConflictError` thrown, the WHOLE tx rolls
   * back (no behavior_script, no lieutenant, wallet untouched: "insufficient cash → 409 + zero state change",
   * design §C3 floor). `loyaltySeedBucket`/`recruitmentQuestId` are set on the lieutenant INSERT ONLY when
   * provided (the C1 columns stay their honest NULL default otherwise). The classic recruit path (T4) and
   * the C7 Facility-manager path omit all three → BYTE-IDENTICAL to before C3 (no debit attempted, no
   * lineage columns touched — `.values({})`/undefined, the schema defaults).
   *
   * `primaryOrUnderstudy` / `primaryForRoleId` (W1.1-a C4, design D8 — OPTIONAL, ADDITIVE): the welcome
   * grant's 2-lieutenant roster (1 primary + 1 understudy backing the SAME role). Absent for every other
   * caller → the column keeps its schema DEFAULT (`primary_or_understudy='primary'`,
   * `primary_for_role_id=NULL`, `lieutenant.ts:118,121`) — BYTE-IDENTICAL to before C4 (a classic
   * `POST /v1/lieutenants` recruit still produces a `primary` with `primary_for_role_id IS NULL`).
   *
   * `executor` (W1.1-a C4, design §0.11 IM-1 — OPTIONAL, ADDITIVE): the house `executor?: Tx` idiom.
   * Omitted (the 3 pre-existing callers) → this method opens its OWN transaction, byte-identical to
   * before C4. Threaded (the welcome-grant roster, C4) → runs INSIDE the CALLER's already-open
   * transaction instead of opening a nested one — the grant's buildings + roster commit or roll back as
   * ONE unit (D1.1 pt 2; a repository cannot join an ALREADY-COMMITTED-BY-THE-TIME-WE-GET-HERE `signup`
   * tx, design §0.11 B1, but it CAN share the grant's OWN post-commit tx, opened by
   * `OnboardingGrantService.grantWelcomeAssets`).
   */
  async recruit(
    params: {
      playerId: string;
      roleId: number;
      source: LieutenantSourceEnum;
      name: string;
      nameLocale: string;
      grantedRole: GrantedRoleEnum;
      mode: LieutenantModeEnum;
      assignedBuildingId: string;
      /** The LOGISTICS dispatch DESTINATION (T0's column; null for COOK/SECURITY/BOOKKEEPER). */
      targetBuildingId: string | null;
      /** 04f-A C7 — the Facility-manager seeded default script (already parsed+compiled by the caller); absent for
       *  every other archetype (the empty-script default, byte-identical to pre-C7). */
      initialScript?: { source: string; rules: CompiledScript };
      /** 04f-B C3 (D4) — the negotiated one-time hire debit (cents). Absent = no debit attempted (classic recruit
       *  byte-identity). Guarded FIRST inside this tx — insufficient balance rolls back the WHOLE recruit. */
      hireCostCents?: number;
      /** 04f-B C3 (D5) — the quest-hire loyalty seed. Absent = the column keeps its NULL default (classic recruit). */
      loyaltySeedBucket?: LoyaltySeedBucketEnum;
      /** 04f-B C3 (D5) — the lineage FK (logical pointer, no `.references()`). Absent = NULL (classic recruit). */
      recruitmentQuestId?: string;
      /** W1.1-a C4 (design D8) — 'primary' | 'understudy'. Absent = the column DEFAULT ('primary'). */
      primaryOrUnderstudy?: PrimaryOrUnderstudyEnum;
      /** W1.1-a C4 (design D8) — the PRIMARY's `role_id`, set ONLY on the understudy row. Absent = NULL. */
      primaryForRoleId?: number;
    },
    executor?: LieutenantTx,
  ): Promise<{ lieutenant_id: string }> {
    const run = async (tx: LieutenantTx): Promise<{ lieutenant_id: string }> => {
      // 0) GUARDED HIRE DEBIT (04f-B C3, D4) — ONLY when a cost was negotiated. Runs BEFORE either INSERT so an
      //    insufficient balance rolls back the WHOLE tx (no partial recruit, no partial debit).
      if (params.hireCostCents !== undefined && params.hireCostCents > 0) {
        const debited = await tx
          .update(economyState)
          .set({ cash_cents: sql`${economyState.cash_cents} - ${params.hireCostCents}` })
          .where(and(eq(economyState.player_id, params.playerId), sql`${economyState.cash_cents} >= ${params.hireCostCents}`))
          .returning({ cash_cents: economyState.cash_cents });
        if (debited.length === 0) {
          throw new RecruitHireDebitConflictError(
            `insufficient balance for the negotiated hire cost (${params.hireCostCents} cents) — no state change.`,
          );
        }
      }

      // 1) INSERT the behavior_script — the schema DEFAULTs (the player attaches a real script later via attach) UNLESS
      //    `initialScript` was supplied (04f-A C7 — the Facility-manager seeded default, or 04f-B C3 — the mapper's
      //    seeded quest script, already valid+compiled either way).
      const [script] = await tx
        .insert(behaviorScript)
        .values(
          params.initialScript
            ? {
                source: params.initialScript.source,
                rules: params.initialScript.rules,
                valid: true,
                last_modified_by: 'system',
              }
            : {},
        )
        .returning({ script_id: behaviorScript.script_id });

      // 2) INSERT the lieutenant pointing at it (the 1:1 behavior_script_id FK). The delegation columns are set; the
      //    tenure/extinction columns keep their 09 DEFAULTs (inert). target_building_id is null for COOK (the column
      //    defaults null in the schema; passed explicitly so the LOGISTICS recruit sets it without a separate path).
      //    loyalty_seed_bucket / recruitment_quest_id (04f-B C3, D5) / primary_or_understudy / primary_for_role_id
      //    (W1.1-a C4, D8) are added to the values object ONLY when provided — absent for every other caller,
      //    keeping the column at its honest default.
      const [row] = await tx
        .insert(lieutenant)
        .values({
          player_id: params.playerId,
          name: params.name,
          name_locale: params.nameLocale,
          role_id: params.roleId,
          source: params.source,
          behavior_script_id: script.script_id,
          granted_role: params.grantedRole,
          mode: params.mode,
          assigned_building_id: params.assignedBuildingId,
          target_building_id: params.targetBuildingId,
          delegation_paused: false,
          ...(params.loyaltySeedBucket !== undefined ? { loyalty_seed_bucket: params.loyaltySeedBucket } : {}),
          ...(params.recruitmentQuestId !== undefined ? { recruitment_quest_id: params.recruitmentQuestId } : {}),
          ...(params.primaryOrUnderstudy !== undefined ? { primary_or_understudy: params.primaryOrUnderstudy } : {}),
          ...(params.primaryForRoleId !== undefined ? { primary_for_role_id: params.primaryForRoleId } : {}),
        })
        .returning({ lieutenant_id: lieutenant.lieutenant_id });

      // ── P4 item 1 (TD-046) — le nom de fiction, écrit DANS la même transaction ────────────────
      // ⛔ L'id ne peut pas être haché AVANT l'insert : la colonne le génère elle-même
      // (`default uuidv7()`). On insère donc, puis on nomme depuis l'id RENDU — jamais en
      // pré-générant un uuid côté applicatif, ce qui changerait la sémantique v7 des ids.
      // ⚠️ On ne renomme QUE le placeholder : un appelant qui fournit un vrai nom (les fixtures
      // en portent : « Vito Marchetti », « LT w3u1 ») garde le sien. Sans cette condition, ce lot
      // écraserait des noms que des specs existantes asserten.
      if (params.name === PLACEHOLDER_NOM_LIEUTENANT) {
        const rosterRows = await tx
          .select({ name: lieutenant.name })
          .from(lieutenant)
          .where(and(eq(lieutenant.player_id, params.playerId), ne(lieutenant.lieutenant_id, row.lieutenant_id)));
        const dejaPris = new Set(rosterRows.map((r) => r.name).filter((x): x is string => typeof x === 'string'));
        await tx
          .update(lieutenant)
          .set({ name: nomPourLieutenant(row.lieutenant_id, dejaPris) })
          .where(eq(lieutenant.lieutenant_id, row.lieutenant_id));
      }

      return { lieutenant_id: row.lieutenant_id };
    };
    return executor ? run(executor) : this.db.transaction(run);
  }

  /**
   * Read a player-owned lieutenant's CURRENT behavior_script SOURCE — the player-authored DSL text (behavior_script.source)
   * the Phase-14 Exception-Queue ADD_RULE resolution appends to before re-attaching (the chosen candidate's add_rule_dsl is
   * concatenated onto this source, then run back through LieutenantService.attachScript's parse→compile→store path). ONE
   * inner join over the 1:1 behavior_script (the BYTE-MIRROR of getOwnedLieutenant / getProjectionRow's join). Player-scoped
   * so another player's lieutenant is invisible → null (the ADD_RULE caller treats a null as "no source to append to" — it
   * starts the script from the appended rule alone; a recruited lieutenant always has a row, so null only fires for a
   * non-owned / non-existent lieutenant, which the resolve flow has already guarded via the owned-exception's lieutenant_id).
   * Returns the source string, or null when the lieutenant is not the player's (or does not exist). A READ — no state change.
   */
  async getBehaviorScriptSource(playerId: string, lieutenantId: string): Promise<string | null> {
    const rows = await this.db
      .select({ source: behaviorScript.source })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(and(eq(lieutenant.lieutenant_id, lieutenantId), eq(lieutenant.player_id, playerId)))
      .limit(1);
    return rows[0]?.source ?? null;
  }

  /**
   * Store a COMPILED behavior script onto an existing behavior_script row (the attach-script write): UPDATE the source
   * (the player-authored DSL, round-trip), the rules (the compiled IR — the `{ rules: Rule[] }` jsonb), valid=true, the
   * last_modified_at (now), and last_modified_by='player'. Keyed by the script_id (the caller resolved it from the
   * player-owned lieutenant). ONE typed UPDATE (no tx needed — a single row). PARAMETERIZED. DETERMINISTIC.
   */
  async updateBehaviorScript(
    scriptId: string,
    payload: { source: string; rules: CompiledScript; valid: boolean },
  ): Promise<void> {
    // ── DURABILITY GAP (Phase-25 L3 T4 review I1 — DOCUMENTED, not built) ──────────────────────────────────────────────
    // This UPDATE writes `rules` WHOLESALE (the recompiled IR from `source`) onto the SAME behavior_script.rules column the
    // PROMOTE append (StandingOrderRepository.appendBehaviorScriptRule) writes. PROMOTE_TO_DEFAULT appends a promoted order
    // rule to `rules` but NOT to `source` (the intended source/rules divergence, spec §3.1) — so a subsequent attachScript
    // re-attach (this write) DROPS that promoted rule (never in source → not regenerated by the recompile). The re-attach
    // failure-mode is tracked v1.x debt (re-apply promoted rules on re-attach / a source-provenance flag / a re-attach warning).
    await this.db
      .update(behaviorScript)
      .set({
        source: payload.source,
        rules: payload.rules,
        valid: payload.valid,
        last_modified_at: sql`now()`,
        last_modified_by: 'player',
      })
      .where(eq(behaviorScript.script_id, scriptId));
  }

  /**
   * Read a lieutenant's DELEGATION row — exactly the buildings the Phase-19 L1a resolve path (option-handlers) needs:
   * assigned_building_id (the COOK lab / SECURITY building / BOOKKEEPER money_holding / LOGISTICS source / LAUNDERING
   * front-shop / DISTRIBUTION dealer-spot) + target_building_id (the LOGISTICS dispatch destination / LAUNDERING + DISTRIBUTION
   * safehouse; null for COOK/SECURITY/BOOKKEEPER). NOT player-scoped: the resolve service has already resolved the
   * player-OWNED report (getOwnedReport) and reads the lieutenant_id off it, so this is an internal post-ownership read
   * (the SAME convention getAssignedBuildingState / the tick writes use). Returns the two building columns (both nullable
   * — the handlers guard a null defensively → a NOOP), or null when the lieutenant is absent (a deleted lieutenant whose
   * report lingered — the handlers then read null buildings → NOOP). A READ — no state change.
   */
  async getDelegationRow(
    lieutenantId: string,
  ): Promise<{ assigned_building_id: string | null; target_building_id: string | null } | null> {
    const rows = await this.db
      .select({
        assigned_building_id: lieutenant.assigned_building_id,
        target_building_id: lieutenant.target_building_id,
      })
      .from(lieutenant)
      .where(eq(lieutenant.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The DELEGATION-TICK read (T6 — LIEUTENANT_TICK): select the player's DELEGATED, executor-granted lieutenants whose
   * attached behavior_script is VALID, returning exactly the fields the tick drives — the lieutenant_id, the
   * assigned_building_id (the delegated building the binding resolves signals against), the current delegation_paused
   * (the last resolution's PAUSE state — the tick writes it only on a transition), and the compiled IR (behavior_script.
   * rules — the `{ rules: Rule[] }` CompiledScript the executor consumes). ONE inner join over the 1:1 behavior_script.
   * Player-scoped. A player with NO delegated valid-script lieutenant → an EMPTY array → the tick writes nothing (the
   * organic no-op / byte-identical no-regression guarantee). A READ — no state change.
   *
   * The filter is the slice-1 delegation predicate: mode='delegated' (the tick ignores 'tasked' lieutenants) AND
   * granted_role='executor' (only an executor-granted delegation drives ops) AND behavior_script.valid=true (a lieutenant
   * whose script never compiled / was never attached is skipped — its empty default script is valid=false).
   */
  async listDelegatedForPlayer(playerId: string): Promise<DelegatedLieutenant[]> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        assigned_building_id: lieutenant.assigned_building_id,
        // NEW (Phase-7) — the tick derives role_archetype from role_id (archetypeForRoleId) to pick the binding; and
        // passes target_building_id to the binding (the LOGISTICS dispatch destination; null for COOK/SECURITY/BOOKKEEPER).
        target_building_id: lieutenant.target_building_id,
        role_id: lieutenant.role_id,
        delegation_paused: lieutenant.delegation_paused,
        // NEW (Phase-11 tenure inertia) — the streak counter + the active settling-window end the tick reads to drive
        // the SETTLING gate (suspend while settling_until_tick > now) + the accrual; both BO-only (never projected).
        tenure_score: lieutenant.tenure_score,
        settling_until_tick: lieutenant.settling_until_tick,
        rules: behaviorScript.rules,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(
        and(
          eq(lieutenant.player_id, playerId),
          eq(lieutenant.mode, 'delegated'),
          eq(lieutenant.granted_role, 'executor'),
          eq(behaviorScript.valid, true),
        ),
      );
    // `rules` is the typed jsonb (the compiled IR the compiler T2 stored) — cast to the executor's CompiledScript shape
    // (a valid script always holds `{ rules: Rule[] }`; the executor is total / defensive against a malformed shape).
    return rows.map((r) => ({
      lieutenant_id: r.lieutenant_id,
      assigned_building_id: r.assigned_building_id,
      target_building_id: r.target_building_id,
      role_id: r.role_id,
      delegation_paused: r.delegation_paused,
      tenure_score: r.tenure_score,
      settling_until_tick: r.settling_until_tick,
      rules: r.rules as CompiledScript,
    }));
  }

  /**
   * The RAID-EXCEPTION producer read (Phase-16): the player's DELEGATED, executor-granted, valid-script lieutenant whose
   * assigned_building_id is `buildingId`, or null. EXACTLY listDelegatedForPlayer's join + predicate (carrying the compiled
   * `rules` IR so the producer can coverage-gate on building_damaged), narrowed by assigned_building_id + limited to one. A
   * READ — no state change. Null when no delegated lieutenant guards the building (the raid happened but is not
   * lieutenant-centered → the producer raises no card).
   */
  async findDelegatedByAssignedBuilding(playerId: string, buildingId: string): Promise<DelegatedLieutenant | null> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        assigned_building_id: lieutenant.assigned_building_id,
        target_building_id: lieutenant.target_building_id,
        role_id: lieutenant.role_id,
        delegation_paused: lieutenant.delegation_paused,
        tenure_score: lieutenant.tenure_score,
        settling_until_tick: lieutenant.settling_until_tick,
        rules: behaviorScript.rules,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(
        and(
          eq(lieutenant.player_id, playerId),
          eq(lieutenant.assigned_building_id, buildingId),
          eq(lieutenant.mode, 'delegated'),
          eq(lieutenant.granted_role, 'executor'),
          eq(behaviorScript.valid, true),
        ),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      lieutenant_id: r.lieutenant_id,
      assigned_building_id: r.assigned_building_id,
      target_building_id: r.target_building_id,
      role_id: r.role_id,
      delegation_paused: r.delegation_paused,
      tenure_score: r.tenure_score,
      settling_until_tick: r.settling_until_tick,
      rules: r.rules as CompiledScript,
    };
  }

  /**
   * The DELEGATION-TICK write (T6 — LIEUTENANT_TICK): set a lieutenant's delegation_paused (the OBSERVABLE reflection of
   * the last resolution — true when the script resolved PAUSE_OPS, false otherwise). The tick calls this ONLY on a
   * TRANSITION (newPaused !== the persisted delegation_paused — the write-amplification discipline: the steady state
   * writes nothing). ONE typed UPDATE keyed by lieutenant_id (the tick already resolved the player-owned row). NOT
   * player-scoped here — the tick selected the lieutenant via the player-scoped listDelegatedForPlayer, so this is an
   * internal post-ownership write. PARAMETERIZED. DETERMINISTIC (NO RNG).
   */
  async setDelegationPaused(lieutenantId: string, paused: boolean): Promise<void> {
    await this.db
      .update(lieutenant)
      .set({ delegation_paused: paused })
      .where(eq(lieutenant.lieutenant_id, lieutenantId));
  }

  /**
   * The TENURE-ACCRUAL write (Phase-11 A2 — LIEUTENANT_TICK): atomically increment a lieutenant's uninterrupted-occupancy
   * STREAK by +1 (`tenure_score = tenure_score + 1`). The tick calls this once per minute for a delegated lieutenant that
   * is NEITHER settling NOR paused (the active-delegation steady state — UNLIKE delegation_paused, this is NOT
   * transition-gated; an active lieutenant accrues every tick). The increment is a set-based SQL expression (read +
   * write in ONE statement) so concurrent advances never lose an increment. NOT player-scoped here — the tick selected
   * the lieutenant via the player-scoped listDelegatedForPlayer, so this is an internal post-ownership write (the SAME
   * convention setDelegationPaused uses). The streak is BO-only (the bucket is DERIVED, never persisted — canon
   * Invariant 4). PARAMETERIZED. DETERMINISTIC (NO RNG).
   */
  async incrementTenureScore(lieutenantId: string): Promise<void> {
    await this.db
      .update(lieutenant)
      .set({ tenure_score: sql`${lieutenant.tenure_score} + 1` })
      .where(eq(lieutenant.lieutenant_id, lieutenantId));
  }

  /**
   * The SETTLING-EXPIRY write (Phase-11 A2 — LIEUTENANT_TICK): clear a lieutenant's settling window
   * (`settling_until_tick = NULL`) once the disruption period has passed (the tick saw settling_until_tick <= now), so
   * the delegation resumes (the next tick accrues + evaluates the script again). The tick calls this ONLY on the
   * EXPIRY transition (settling was non-null and is now at/before the current tick); the steady state (no settling, or
   * still settling) writes nothing. NOT player-scoped here — the tick selected the lieutenant via the player-scoped
   * listDelegatedForPlayer, so this is an internal post-ownership write (the SAME convention setDelegationPaused uses).
   * BO-only. PARAMETERIZED. DETERMINISTIC (NO RNG).
   */
  async clearSettling(lieutenantId: string): Promise<void> {
    await this.db
      .update(lieutenant)
      .set({ settling_until_tick: null })
      .where(eq(lieutenant.lieutenant_id, lieutenantId));
  }

  /**
   * The SETTLING-ARM write (Phase-11 A3 — RE-script settling window): OPEN a lieutenant's settling window
   * (`settling_until_tick = tick`, the absolute game_minute end the window runs until). The attach flow calls this ONLY on
   * a successful RE-script (a valid→valid revision of an existing script — NOT the first authoring), at
   * `getCurrentGameMinute(playerId) + disruptionTicks(reassignment_disruption[bucket])`; while `settling_until_tick > now`
   * the tick SUSPENDS the delegation (A2 honors + clears it). NOT player-scoped here — the service already resolved the
   * player-owned lieutenant (getOwnedLieutenant), so this is an internal post-ownership write (the SAME convention
   * setDelegationPaused / clearSettling use). BO-only (settling_until_tick never leaves the repo/tick — no projection in
   * A3). PARAMETERIZED. DETERMINISTIC (NO RNG).
   */
  async setSettlingUntil(lieutenantId: string, tick: number): Promise<void> {
    await this.db
      .update(lieutenant)
      .set({ settling_until_tick: tick })
      .where(eq(lieutenant.lieutenant_id, lieutenantId));
  }

  /**
   * The REASSIGN write (Phase-11 A4 — move + reset tenure to FRESH + open the OLD-bucket settling window), in ONE ATOMIC
   * UPDATE: move the lieutenant to the new building(s) (`assigned_building_id` + the nullable `target_building_id`), RESET
   * the streak (`tenure_score = 0` → the bucket DERIVES to FRESH, canon Invariant 4 — no bucket is stored), stamp the
   * reset origin (`tenure_reset_at_tick = tenureResetAtTick`, the current game_minute), and ARM the settling window
   * (`settling_until_tick = settlingUntil`, the OLD-bucket-scaled disruption end). The single UPDATE makes the move +
   * reset + settling-open one indivisible step (no partial state where the lieutenant moved but the streak/window lag).
   * NOT player-scoped here — the service already resolved the player-owned lieutenant (getOwnedLieutenantForReassign), so
   * this is an internal post-ownership write (the SAME convention setDelegationPaused / setSettlingUntil / clearSettling
   * use). BO-only (tenure_score / the two tick columns never leave the repo/tick — no projection at A4). PARAMETERIZED.
   * DETERMINISTIC (NO RNG).
   */
  async reassign(
    lieutenantId: string,
    payload: {
      assignedBuildingId: string;
      targetBuildingId: string | null;
      tenureResetAtTick: number;
      settlingUntil: number;
    },
  ): Promise<void> {
    await this.db
      .update(lieutenant)
      .set({
        assigned_building_id: payload.assignedBuildingId,
        target_building_id: payload.targetBuildingId,
        tenure_score: 0, // reset → the bucket DERIVES to FRESH (canon Invariant 4 — never store a bucket).
        tenure_reset_at_tick: payload.tenureResetAtTick,
        settling_until_tick: payload.settlingUntil,
      })
      .where(eq(lieutenant.lieutenant_id, lieutenantId));
  }

  /**
   * P3-F C8 (design §9.1 step 6, "lieutenant unbinding + tenure reset via the Phase-11 path if callable") —
   * the RECALL tenure-RESET write. C0's own R2 re-anchor found `reassign()` (above) is the ONLY existing
   * reset write path, but it is COUPLED to a building move (sets `assigned_building_id`/
   * `target_building_id` unconditionally) — WRONG for recall, which does NOT move the lieutenant (the
   * lieutenant "stays on the roster", design §9.1 step 6). This is the C0-DEFINITIVE narrow additive
   * writer: the SAME `tenure_score=0` / `tenure_reset_at_tick` / `settling_until_tick` triple `reassign`
   * writes, WITHOUT touching `assigned_building_id`/`target_building_id` (a 4th single-purpose writer,
   * mirroring `setSettlingUntil`/`clearSettling`/`reassign`'s own established "one field-subset per
   * writer" shape — C0-reanchor §4). `settlingUntil` is the CALLER's choice (`PromotionLockService`
   * passes `tenureResetAtTick` itself — an immediately-expired/inert window, no disruption invented for a
   * move that never happened; recall carries no canon-named settling mechanic of its own).
   */
  async resetTenureOnly(
    lieutenantId: string,
    payload: { tenureResetAtTick: number; settlingUntil: number },
  ): Promise<void> {
    await this.db
      .update(lieutenant)
      .set({
        tenure_score: 0, // reset -> the bucket DERIVES to FRESH (canon Invariant 4 — never store a bucket).
        tenure_reset_at_tick: payload.tenureResetAtTick,
        settling_until_tick: payload.settlingUntil,
      })
      .where(eq(lieutenant.lieutenant_id, lieutenantId));
  }

  /**
   * The district of a player-owned building (building.block_id → blocks.id → blocks.district_id), or null. Used by
   * the LIEUTENANT_TICK (Phase-18 PEER_STATE SAME_ZONE) to derive the self lieutenant's district ONCE before
   * resolving any SAME_ZONE peer references. NOT player-scoped at the blocks level (blocks are world geography, not
   * player-owned); the player_id scopes the building ownership so only the player's own building is visible. Returns
   * null when the building does not exist, is not owned by this player, or its block has no associated district.
   * A READ — no state change.
   */
  async getBuildingDistrict(playerId: string, buildingId: string): Promise<number | null> {
    const rows = await this.db
      .select({ district_id: blocks.district_id })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(and(eq(building.player_id, playerId), eq(building.building_id, buildingId)))
      .limit(1);
    return rows[0]?.district_id ?? null;
  }

  /**
   * The PEER read (SAME_ZONE): the player's DELEGATED, executor-granted, valid-script lieutenant of `roleId` whose
   * assigned building is in `districtId`, EXCLUDING `excludeLieutenantId` (the self — a peer read reads ANOTHER
   * lieutenant), ordered by lieutenant_id ASC, LIMIT 1 (the deterministic "the peer"). Returns the DelegatedLieutenant
   * (the binding-row shape, carrying `rules`). Null when none — the executor then reads the leaf as false.
   *
   * Note: only DELEGATED + executor-granted + valid-script lieutenants are readable as peers (a non-delegated peer is
   * not readable in this slice — Phase-18 scope simplification).
   */
  async findPeerByRoleInDistrict(
    playerId: string,
    roleId: number,
    districtId: number,
    excludeLieutenantId: string,
  ): Promise<DelegatedLieutenant | null> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        assigned_building_id: lieutenant.assigned_building_id,
        target_building_id: lieutenant.target_building_id,
        role_id: lieutenant.role_id,
        delegation_paused: lieutenant.delegation_paused,
        tenure_score: lieutenant.tenure_score,
        settling_until_tick: lieutenant.settling_until_tick,
        rules: behaviorScript.rules,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .innerJoin(building, eq(building.building_id, lieutenant.assigned_building_id))
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .where(
        and(
          eq(lieutenant.player_id, playerId),
          eq(lieutenant.role_id, roleId),
          eq(blocks.district_id, districtId),
          ne(lieutenant.lieutenant_id, excludeLieutenantId),
          eq(lieutenant.mode, 'delegated'),
          eq(lieutenant.granted_role, 'executor'),
          eq(behaviorScript.valid, true),
        ),
      )
      .orderBy(lieutenant.lieutenant_id)
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      lieutenant_id: r.lieutenant_id,
      assigned_building_id: r.assigned_building_id,
      target_building_id: r.target_building_id,
      role_id: r.role_id,
      delegation_paused: r.delegation_paused,
      tenure_score: r.tenure_score,
      settling_until_tick: r.settling_until_tick,
      rules: r.rules as CompiledScript,
    };
  }

  /**
   * The PEER read (SAME_BUILDING): same as findPeerByRoleInDistrict but narrowed by assigned_building_id = buildingId
   * (the co-located peer), excluding the self. No district join needed — the building filter is sufficient. Ordered by
   * lieutenant_id ASC, LIMIT 1 (deterministic lowest-id "the peer"). Returns null when none (→ false at eval).
   *
   * Note: only DELEGATED + executor-granted + valid-script lieutenants are readable as peers (Phase-18 scope).
   */
  async findPeerByRoleInBuilding(
    playerId: string,
    roleId: number,
    buildingId: string,
    excludeLieutenantId: string,
  ): Promise<DelegatedLieutenant | null> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        assigned_building_id: lieutenant.assigned_building_id,
        target_building_id: lieutenant.target_building_id,
        role_id: lieutenant.role_id,
        delegation_paused: lieutenant.delegation_paused,
        tenure_score: lieutenant.tenure_score,
        settling_until_tick: lieutenant.settling_until_tick,
        rules: behaviorScript.rules,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(
        and(
          eq(lieutenant.player_id, playerId),
          eq(lieutenant.role_id, roleId),
          eq(lieutenant.assigned_building_id, buildingId),
          ne(lieutenant.lieutenant_id, excludeLieutenantId),
          eq(lieutenant.mode, 'delegated'),
          eq(lieutenant.granted_role, 'executor'),
          eq(behaviorScript.valid, true),
        ),
      )
      .orderBy(lieutenant.lieutenant_id)
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      lieutenant_id: r.lieutenant_id,
      assigned_building_id: r.assigned_building_id,
      target_building_id: r.target_building_id,
      role_id: r.role_id,
      delegation_paused: r.delegation_paused,
      tenure_score: r.tenure_score,
      settling_until_tick: r.settling_until_tick,
      rules: r.rules as CompiledScript,
    };
  }

  /**
   * Read the COOK-binding precursor + equipment + purity signals for `buildingId`. One JOIN for the per-precursor
   * stock quantities (thalmite + garnet_salt) and one read of the equipment_tier from building_operational_state,
   * plus a single existence check for below-standard brindle in product_storage.
   * All reads are internal engine reads (NOT player projections — raw values stay in this layer; the binding
   * computes the booleans). NOT player-scoped: the building is already resolved via the owned lieutenant row
   * (the same convention getAssignedBuildingState / getBuildingStructuralState use). Returns null when the
   * building has no operational state row (absent / not converted → the binding omits the signals per the
   * absence contract). A READ — no state change. (D1 C7 — operator-DSL deep-cook + escalate-quality signals.)
   */
  async getCookSignals(
    playerId: string,
    buildingId: string,
  ): Promise<{
    thalmiteQuantity: number;
    garnetSaltQuantity: number;
    equipmentTier: number;
    hasBelowStandardBrindle: boolean;
  } | null> {
    // Read equipment_tier from building_operational_state (one row per building).
    const stateRows = await this.db
      .select({ equipment_tier: buildingOperationalState.equipment_tier })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.building_id, buildingId))
      .limit(1);
    if (stateRows.length === 0) return null; // building not converted / no operational state row.
    const equipmentTier = stateRows[0].equipment_tier;

    // Read precursor stock quantities for thalmite + garnet_salt on this building.
    const stockRows = await this.db
      .select({
        precursor_type: precursorStock.precursor_type,
        quantity_units: precursorStock.quantity_units,
      })
      .from(precursorStock)
      .where(
        and(
          eq(precursorStock.player_id, playerId),
          eq(precursorStock.building_id, buildingId),
          inArray(precursorStock.precursor_type, ['thalmite', 'garnet_salt']),
        ),
      );
    let thalmiteQuantity = 0;
    let garnetSaltQuantity = 0;
    for (const row of stockRows) {
      if (row.precursor_type === 'thalmite') thalmiteQuantity = row.quantity_units;
      else if (row.precursor_type === 'garnet_salt') garnetSaltQuantity = row.quantity_units;
    }

    // Check if ANY brindle in product_storage for this player has purity_grade 'crude' or 'low' (below standard).
    const belowStandardRows = await this.db
      .select({ storage_id: productStorage.storage_id })
      .from(productStorage)
      .where(
        and(
          eq(productStorage.player_id, playerId),
          eq(productStorage.substance_type, 'brindle'),
          or(
            eq(productStorage.purity_grade, 'crude'),
            eq(productStorage.purity_grade, 'low'),
          ),
        ),
      )
      .limit(1);
    const hasBelowStandardBrindle = belowStandardRows.length > 0;

    return { thalmiteQuantity, garnetSaltQuantity, equipmentTier, hasBelowStandardBrindle };
  }

  /**
   * Check whether a building is an operational distribution_hub for any player.
   * Used by LieutenantTickService for the OQ-T1 narrow skip: a LOGISTICS lieutenant
   * assigned to a distribution_hub is coordinator/event-driven, NOT tick-driven.
   * NOT player-scoped — the tick already resolved the lieutenant via the player-scoped
   * listDelegatedForPlayer. Returns true when the building has an operational_state row
   * with operational_type='distribution_hub' (regardless of structural_state).
   * System 9c C5 — DD-COORD-PER-HUB + DD-COORD-TRIGGER.
   */
  async isDistributionHub(buildingId: string): Promise<boolean> {
    const rows = await this.db
      .select({ building_id: buildingOperationalState.building_id })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.operational_type, 'distribution_hub'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * Find an existing LOGISTICS lieutenant (role_id=6 — LOGISTICS_ROLE_ID from lieutenant-archetype.ts) in
   * delegated/executor mode assigned to the given hub, for the given player. Used by LogisticsBindingService
   * to enforce one-coordinator-per-hub (OQ-A1). Returns the lieutenant_id or null.
   * Player-scoped (WHERE player_id = …) so another player's coordinator is invisible.
   * System 9c C5 — DD-COORD-PER-HUB.
   */
  async findCoordinatorForHub(playerId: string, hubId: string): Promise<{ lieutenant_id: string } | null> {
    const rows = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id })
      .from(lieutenant)
      .where(
        and(
          eq(lieutenant.player_id, playerId),
          eq(lieutenant.role_id, 6), // LOGISTICS_ROLE_ID = 6 (Courier coordinator) from lieutenant-archetype.ts
          eq(lieutenant.assigned_building_id, hubId),
          eq(lieutenant.mode, 'delegated'),
          eq(lieutenant.granted_role, 'executor'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * P3-B C3 (ch05 Loop 2 flag discipline, D6) — the canonical `role_id` → the player's holder, STABLE
   * pick: the player's lieutenant currently holding `roleId` (04a canonical catalogue), ordered by
   * `recruited_at` ASC (first-recruited wins a tie — the same "first by recruited-order" convention
   * `listForPlayer`'s own roster ordering already establishes), `lieutenant_id` ASC as a total-order
   * tie-break (mirrors `findPeerByRoleInDistrict`'s own determinism note — recruited_at alone could tie
   * at sub-millisecond seed speed in a test). Returns `{lieutenant_id, tenure_score}` — the generator
   * registry's role-resolution seam needs `tenure_score` immediately after to derive the Phase-11
   * tenure bucket (`bucketForStreak`) for the deviation threshold (design §5). Returns null when NO
   * lieutenant currently holds this role_id for the player — an HONEST coverage gap for role_ids
   * {2, 9} (C0 §8.5(b) proved no existing endpoint can ever assign those ids: `roleIdForArchetype`'s
   * closed switch never returns 2 or 9), and also the ordinary case for a LIVE role_id with no CURRENT
   * holder (e.g. a fresh player who has not yet recruited that archetype). NOT an error path — the
   * caller (each RoutineItemGenerator) treats null as "generate with `lieutenant_id = null`, no flag
   * possible" (D6). A READ — no state change.
   */
  async findRoleHolderForPlayer(playerId: string, roleId: number): Promise<{ lieutenant_id: string; tenure_score: number } | null> {
    const rows = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id, tenure_score: lieutenant.tenure_score })
      .from(lieutenant)
      .where(and(eq(lieutenant.player_id, playerId), eq(lieutenant.role_id, roleId)))
      .orderBy(lieutenant.recruited_at, lieutenant.lieutenant_id)
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * P3-G C2 (C0-reanchor R4 — GAP, real, closed here, non-blocking): the player's count of lieutenants
   * with a VALID attached behavior script — `SCRIPTED_LIEUTENANTS_MIN`'s own read surface
   * (`predicate-evaluators.ts`, design §7.1). Mirrors the EXACT join `listDelegatedForPlayer`/
   * `findDelegatedByAssignedBuilding`/`findPeerByRoleInDistrict`/`findPeerByRoleInBuilding` already
   * establish (`lieutenant INNER JOIN behaviorScript ON script_id=behavior_script_id`,
   * `behaviorScript.valid=true`) — narrowed to a PLAIN count, DELIBERATELY WITHOUT the
   * `mode='delegated'`/`granted_role='executor'` filter those 4 precedents add (R4: "SCRIPTED_
   * LIEUTENANTS_MIN per design §7.1 does NOT need [it]" — a script can be valid and attached to a
   * lieutenant that is not currently delegated/executor-granted; the predicate counts SCRIPTING, not
   * active delegation). Player-scoped. A READ — no state change.
   */
  async countScriptedByPlayer(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(and(eq(lieutenant.player_id, playerId), eq(behaviorScript.valid, true)));
    return Number(rows[0]?.n ?? 0);
  }
}

/** 04f-B C3 (D4) — thrown by `recruit()` when the guarded hire debit is refused (insufficient balance). The
 *  WHOLE recruit transaction rolls back (no behavior_script, no lieutenant, wallet untouched). Caught by
 *  `LieutenantService.recruit` and mapped to `ApiError('RESOURCE_STATE_CONFLICT')` — never a raw driver
 *  error reaching the controller (mirrors `RecruitmentRepository.RecruitmentConflictError`'s convention). */
export class RecruitHireDebitConflictError extends Error {}
