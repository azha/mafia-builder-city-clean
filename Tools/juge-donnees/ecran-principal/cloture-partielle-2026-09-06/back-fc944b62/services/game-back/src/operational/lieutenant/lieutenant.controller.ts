// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §4-T4 (the player-facing
//             HTTP contracts the future Unity rule-editor consumes: POST /v1/lieutenants [recruit], POST
//             /v1/lieutenants/:id/behavior-script [attach DSL source → parse+compile+validate+store], POST
//             /v1/lieutenants/:id/behavior-script/validate [dry-run]) +
//             18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) + P5/R2.2
//             (the responses are ids / booleans — no raw scalars)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 4, lieutenant entity) --
//
// `LieutenantController` — the PLAYER-FACING lieutenant recruit / attach-script / validate / read API (T4 + T7).
// Mirrors MoneyHoldingController's / RealEstateController's auth + resolvePlayerId pattern exactly.
//   - POST /v1/lieutenants { archetype, assigned_building_id } → recruit a lieutenant of a SUPPORTED archetype
//     (all 6 — COOK/SECURITY/BOOKKEEPER/LOGISTICS/LAUNDERING/DISTRIBUTION — via the binding registry; a garbage/unknown
//     archetype → 422) on a player-owned operational building (the binding's per-archetype assignment gate validates ownership/type — e.g. a
//     COOK requires a `lab`). 201 (a resource creation — the BYTE-MIRROR of POST /v1/operational/building/purchase, 201).
//   - POST /v1/lieutenants/:id/behavior-script { source } → parse+compile the DSL and store source + IR + valid (200; a
//     mutation on the existing 1:1 behavior_script row, not a creation). 422 + diagnostics in `details` on invalid DSL.
//   - POST /v1/lieutenants/:id/behavior-script/validate { source } → the SAME parse+compile, NO store (dry-run). 200
//     { valid: true } on success, else 422 + diagnostics.
//   - GET /v1/lieutenants/:id → the qualitative band projection (T7; R2.2 inverted — archetype/granted_role/mode +
//     op_state_band/rule_count_band bands + the player-authored script_source; NO raw scalars). Not owned → 404.
//
// PLAYER RESOLUTION (the SAME identity bridge as MoneyHoldingController / GET /v1/me): the JwtAuthGuard verifies the
// bearer JWT and attaches req.account (account_id, kind — from verified claims, never the body, R-ID-3). The lieutenant
// entity is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account link.
//
// The mutating POSTs return plain `data` (ids / booleans — R2.2, no raw scalars); the global EnvelopeInterceptor wraps it
// in a success ResponseEnvelope. They are subject to the existing IdempotencyInterceptor (a retried recruit/attach with
// the same Idempotency-Key replays the memorized response — no double-recruit / double-store).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, enumField, optionalUuidField, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { LieutenantService } from './lieutenant.service';
import { LieutenantRepository } from './lieutenant.repository';
import { archetypeForRoleId } from './lieutenant-archetype';
import {
  AutonomyCeilingService,
  type AutonomyDecisionKind,
} from './autonomy/autonomy-ceiling.service';
import {
  SignalDriftService,
  type SignalDriftDecisionKind,
} from './signal-drift/signal-drift.service';
import { CUE_KINDS, type CueKind } from './signal-drift/signal-drift-cues';
import {
  StandingOrderService,
  type StandingOrderDecisionKind,
} from './standing-order/standing-order.service';
import { lapseActionPg, type LapseActionEnum } from '../../db/schema/lieutenant';
import {
  LieutenantProjectionService,
  type LieutenantBands,
  type RosterRow,
} from './lieutenant.projection.service';
import { StructuralDecisionGovernorService } from '../../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../../progression/loop10/structural-decision-catalogue';
// P3-F C6 — CategoryDelegationGuard (LIEUTENANT_HIRING's recruit/reassign guard sites, C0-reanchor §7).
// One-line seam. NOTE: attachScript is NOT a guard site (it is BEHAVIOR_SCRIPT_REPLACE, a different
// structural type — the catalogue's own guardSites list for LIEUTENANT_HIRING names ONLY recruit/reassign/
// quest-hire).
import { CategoryDelegationGuard } from '../../meta_progression/category-delegation-guard.service';
import { TaskCategoryKey } from '../../meta_progression/task-category-catalogue';

/** POST /v1/lieutenants body — the archetype to recruit + the building to assign it to (+ the optional dispatch target
 *  building, used by the LOGISTICS archetype as its dispatch DESTINATION; null/absent for COOK/SECURITY/BOOKKEEPER). */
interface RecruitBody {
  archetype?: unknown;
  assigned_building_id?: unknown;
  target_building_id?: unknown;
}

/** POST /v1/lieutenants/:id/behavior-script[/validate] body — the player-authored DSL source. */
interface BehaviorScriptBody {
  source?: unknown;
}

/** POST /v1/lieutenants/:id/autonomy/decision body (Phase-19 L1a T7) — the AutonomyDecision kind the player applies. */
interface AutonomyDecisionBody {
  kind?: unknown;
}

/** The 3 supported AutonomyDecision kinds (Phase-19 L1a T7). Anything else → 422 VALIDATION_FAILED. */
const AUTONOMY_DECISION_KINDS: readonly AutonomyDecisionKind[] = ['reset_budget', 'raise_ceiling', 'override_one_shot'];

/** POST /v1/lieutenants/:id/signal-drift/decision body (Phase-22 L2a T5) — the SignalDriftDecision kind + the target cue
 *  (required+validated for the cue-specific disrupt_cue; ignored for the non-cue-specific kinds). */
interface SignalDriftDecisionBody {
  kind?: unknown;
  target_cue?: unknown;
}

/** The 3 supported SignalDriftDecision kinds (Phase-22 L2a T5). Anything else → 422 VALIDATION_FAILED. */
const SIGNAL_DRIFT_DECISION_KINDS: readonly SignalDriftDecisionKind[] = [
  'disrupt_cue',
  'reinforce_direct_order',
  'reset_observation_window',
];

/** POST /v1/lieutenants/:id/standing-order body (Phase-25 L3 T2) — the player-authored DSL `rule_source` (compiled to a
 *  single IR rule) + the `lapse_action` (what happens when the order expires). `duration_class` is ignored in M2 (always
 *  the standard TTL — spec §3.1). */
interface StandingOrderBody {
  rule_source?: unknown;
  lapse_action?: unknown;
}

/** POST /v1/lieutenants/:id/standing-order/decision body (Phase-25 L3 T4) — the StandingOrderDecision kind the player applies. */
interface StandingOrderDecisionBody {
  kind?: unknown;
}

/** The 3 supported StandingOrderDecision kinds (Phase-25 L3 T4). Anything else → 422 VALIDATION_FAILED. */
const STANDING_ORDER_DECISION_KINDS: readonly StandingOrderDecisionKind[] = [
  'RENEW',
  'REVOKE',
  'PROMOTE_TO_DEFAULT',
];

/** POST /v1/lieutenants/:id/reassign body (Phase-11 A4) — the NEW building to move the lieutenant to (+ the optional
 *  dispatch target, normalized to null when absent, same as recruit; required for LOGISTICS/LAUNDERING/DISTRIBUTION via
 *  their binding's gate). The move resets tenure to FRESH + opens an OLD-bucket settling window. */
interface ReassignBody {
  assigned_building_id?: unknown;
  target_building_id?: unknown;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class LieutenantController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly lieutenant: LieutenantService,
    private readonly projection: LieutenantProjectionService,
    // PHASE-19 L1a T7 — the lieutenant repository (the player-scoped ownership read + the current tick) + the autonomy
    // ceiling gate (applyDecision). The decision endpoint resolves the OWNED lieutenant (404 otherwise), derives its
    // archetype from role_id, reads the player's current tick, and applies the decision through the SAME gate the tick uses.
    private readonly repo: LieutenantRepository,
    private readonly autonomy: AutonomyCeilingService,
    // PHASE-22 L2a T5 — the signal-drift measurement service (applyDecision). The signal-drift decision endpoint resolves the
    // OWNED lieutenant (404 otherwise), derives its archetype from role_id, reads the player's current tick, and applies the
    // decision through the SAME service the tick's observeOutcome shares (the cooldown + the RESETTING phase live there).
    private readonly signalDrift: SignalDriftService,
    // PHASE-25 L3 T2 — the standing-order service (issue). The standing-order endpoint resolves the OWNED lieutenant (404
    // otherwise), validates the lapse_action (422), reads the player's current tick (getCurrentGameMinute — the SAME clock
    // the tick + expiry live in), and issues the order through the SAME service the tick's getActiveRule/evaluate share.
    private readonly standingOrder: StandingOrderService,
    // LOT-5 TD-051 — the city event bus (the shared seam for emitting SignalDriftDecisionEmittedEvent after a successful
    // applyDecision — the BO decision-audit trace, Invariant 7). CityEventBus is provided + exported by SchedulerModule
    // (already imported by LieutenantModule), so no new module import is needed. One-way coupling: the controller imports
    // the BUS, never a consumer module (the same loosely-coupled seam every CityEvent producer uses).
    private readonly bus: CityEventBus,
    // P3-A C5 (D7/D8) — the Loop 10 governor: recruit / reassign / attachScript(wholesale) /
    // autonomyDecision(raise_ceiling) are 4 of the 6 LIVE structural sites.
    private readonly governor: StructuralDecisionGovernorService,
    // P3-F C6 — the LIEUTENANT_HIRING retirement guard (design D6/§8.3).
    private readonly delegationGuard: CategoryDelegationGuard,
  ) {}

  /**
   * `POST /v1/lieutenants` — recruit a lieutenant of a SUPPORTED archetype on a player-owned building (granted_role=
   * executor, mode=delegated). Body: { archetype, assigned_building_id, target_building_id? }. An unsupported archetype
   * (not registered in this build) → 422; building not owned/operational → 404; wrong building type for the archetype →
   * 409; roster cap reached → 409. The optional `target_building_id` is the LOGISTICS dispatch destination (null/absent
   * for COOK/SECURITY/BOOKKEEPER — they ignore it). Returns { lieutenant_id }. 201 (a resource creation). Requires a
   * PLAYER JWT (no token → 401). Idempotency-Key supported (the global interceptor).
   */
  // P3-A C5 (D7/D8) — Loop 10 STRUCTURAL site #3 (LIEUTENANT_RECRUIT). Minimal wrap — the SAME
  // LieutenantService.recruit call, byte-identical response.
  @Post('lieutenants')
  @HttpCode(201) // a resource creation (the BYTE-MIRROR of building/purchase → 201).
  @UseGuards(JwtAuthGuard)
  async recruit(
    @Body() body: RecruitBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ lieutenant_id: string; recruit_poll?: { consistency_bucket: 'neutral' | 'low'; house_norm_flag_count: number; gate_ran: true } }> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['archetype', 'assigned_building_id', 'target_building_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    await this.delegationGuard.assertNotDelegated(playerId, TaskCategoryKey.LIEUTENANT_HIRING);
    // L0.3 (D5) — archetype: LIBRE (allowlist (1)) — no FK/pgEnum backs it
    // (lieutenant-archetype.ts:78), validated against the in-process binding registry (already 422s,
    // never 500 — masked assigned_building_id/target_building_id in the M31 sweep since it runs
    // FIRST). assigned_building_id/target_building_id: uuid (target_building_id optional — the
    // LOGISTICS dispatch destination, null/absent for COOK/SECURITY/BOOKKEEPER).
    const archetype = body.archetype as string;
    const assignedBuildingId = uuidField(body as unknown as Record<string, unknown>, 'assigned_building_id');
    const targetBuildingId = optionalUuidField(body as unknown as Record<string, unknown>, 'target_building_id') ?? null;
    return this.governor.commit(
      playerId,
      StructuralDecisionType.LIEUTENANT_RECRUIT,
      {
        before: { entity: 'lieutenant', archetype, assigned_building_id: assignedBuildingId },
        after: (r: { lieutenant_id: string }) => ({ entity: 'lieutenant', id: r.lieutenant_id, archetype }),
      },
      () => this.lieutenant.recruit(playerId, archetype, assignedBuildingId, targetBuildingId),
    );
  }

  /**
   * `POST /v1/lieutenants/:id/behavior-script` — attach a player-authored DSL `source` to a player-owned lieutenant:
   * parse + compile the DSL and store source + the compiled IR + valid=true. Body: { source }. Not owned → 404; an
   * invalid DSL (syntax error / Tier ≥ 2 / unsupported primitive / over the rule cap / out-of-bounds priority) → 422
   * VALIDATION_FAILED with the diagnostics in `details` (NO store — the script stays valid=false). Returns
   * { attached: true }. 200 (a mutation on the existing 1:1 behavior_script row). Requires a PLAYER JWT (no token → 401).
   * Idempotency-Key supported.
   */
  // P3-A C5 (D7/D8) — Loop 10 STRUCTURAL site #5 (BEHAVIOR_SCRIPT_REPLACE): the WHOLESALE replace call
  // site ONLY. The tactical single-rule ADD_RULE-via-exception-resolve path
  // (exceptions/effects/add-rule.handler.ts) calls the SAME `LieutenantService.attachScript` directly,
  // bypassing THIS controller — it is deliberately NOT guarded (canon classifies exception verdicts
  // tactical; D3 additive-only wall also forbids touching that handler). Minimal wrap — the SAME
  // LieutenantService.attachScript call, byte-identical response.
  @Post('lieutenants/:id/behavior-script')
  @HttpCode(200) // a mutation on the existing behavior_script row (not a creation) → 200.
  @UseGuards(JwtAuthGuard)
  async attachScript(
    @Param('id', UuidParam) id: string,
    @Body() body: BehaviorScriptBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ attached: true }> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['source']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.governor.commit(
      playerId,
      StructuralDecisionType.BEHAVIOR_SCRIPT_REPLACE,
      {
        before: { entity: 'lieutenant', id },
        after: { entity: 'lieutenant', id, action: 'wholesale_replace' },
      },
      () => this.lieutenant.attachScript(playerId, id, body.source),
    );
  }

  /**
   * `POST /v1/lieutenants/:id/reassign` — move a player-owned lieutenant to a NEW building, RESET its tenure to FRESH, and
   * open an OLD-bucket-scaled settling window (Phase-11 A4). Body: { assigned_building_id, target_building_id? }. The
   * new building is gated by the SAME per-archetype assignment gate recruit uses (via the binding's validateAssignment):
   * not owned / not operational → 404; wrong building type for the archetype → 409; a required dispatch target missing
   * (LOGISTICS/LAUNDERING/DISTRIBUTION) → 422. Not the player's lieutenant → 404. The canon: the move FORFEITS the
   * accumulated tenure (tenure_score → 0, the bucket derives to FRESH) AND pays a settling cost SIZED TO THE OLD bucket
   * (computed before the reset). The optional `target_building_id` is normalized to null when absent (same as recruit —
   * COOK/SECURITY/BOOKKEEPER ignore it; the dispatch archetypes require it via their gate). Returns the freshly-projected
   * `LieutenantBands` (mirror GET /:id — the band surface; tenure_score / settling are BO-only and never leak; the tenure
   * BANDS themselves are A5). 200 (a mutation on the existing lieutenant row). Requires a PLAYER JWT (no token → 401).
   * Idempotency-Key supported (the global interceptor).
   */
  // P3-A C5 (D7/D8) — Loop 10 STRUCTURAL site #4 (LIEUTENANT_ROLE_REASSIGN). Minimal wrap — the SAME
  // LieutenantService.reassign call (only), the post-move bands re-read stays OUTSIDE the governor seam
  // (a read, not part of the mutation).
  @Post('lieutenants/:id/reassign')
  @HttpCode(200) // a mutation on the existing lieutenant row (a move + reset, not a creation) → 200.
  @UseGuards(JwtAuthGuard)
  async reassign(
    @Param('id', UuidParam) id: string,
    @Body() body: ReassignBody,
    @Req() req: RequestWithAccount,
  ): Promise<LieutenantBands> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['assigned_building_id', 'target_building_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    await this.delegationGuard.assertNotDelegated(playerId, TaskCategoryKey.LIEUTENANT_HIRING);
    // L0.3 (D5) — assigned_building_id: uuid (measured 500 pre-C1, one of the 8 "non confondus").
    // target_building_id: uuid, optional (normalized to null when absent, mirrors recruit).
    const assignedBuildingId = uuidField(body as unknown as Record<string, unknown>, 'assigned_building_id');
    const targetBuildingId = optionalUuidField(body as unknown as Record<string, unknown>, 'target_building_id') ?? null;
    await this.governor.commit(
      playerId,
      StructuralDecisionType.LIEUTENANT_ROLE_REASSIGN,
      {
        before: { entity: 'lieutenant', id },
        after: { entity: 'lieutenant', id, assigned_building_id: assignedBuildingId },
      },
      () => this.lieutenant.reassign(playerId, id, assignedBuildingId, targetBuildingId),
    );
    // Return the freshly-projected bands (mirror lieutenantById — null → 404 defensively; the move resolved the owned row,
    // so this re-read of the SAME player-owned lieutenant returns its post-move bands).
    const bands = await this.projection.lieutenantBands(playerId, id);
    if (!bands) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such lieutenant for this player: ${id}.` });
    }
    return bands;
  }

  /**
   * `POST /v1/lieutenants/:id/behavior-script/validate` — DRY-RUN: the SAME parse+compile as attach, but NO store. Body:
   * { source }. Not owned → 404; an invalid DSL → 422 + diagnostics (identical verdicts to attach, never persisted).
   * Returns { valid: true } on success. 200. Requires a PLAYER JWT (no token → 401).
   */
  @Post('lieutenants/:id/behavior-script/validate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async validateScript(
    @Param('id', UuidParam) id: string,
    @Body() body: BehaviorScriptBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ valid: true }> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['source']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.lieutenant.validateScript(playerId, id, body.source);
  }

  /**
   * `GET /v1/lieutenants` — the requesting player's lieutenant ROSTER as band-only rows (Phase-10 A1; R2.2 inverted). The
   * LIST sibling of GET /v1/lieutenants/:id: returns `{ lieutenants: RosterRow[] }` where each row is { lieutenant_id (the
   * owned-resource handle the client passes back to GET /:id), archetype, op_state_band, rule_count_band } — band-only, NO
   * raw role_id / building id / rules count (the SAME R2.2 guarantee the detail GET gives, per row). Player-scoped (only
   * the requesting player's lieutenants; never a cross-player row). A player with no lieutenant → { lieutenants: [] }.
   * RESPONSE SHAPE (for the Unity client): `payload.data = { lieutenants: RosterRow[] }` (a NAMED object field under the
   * envelope's `data`, not a bare array — so the response is extensible and parses uniformly with the detail GET's object
   * `data`). Requires a PLAYER JWT (no token → 401). REGISTERED BEFORE GET /:id so the static `lieutenants` path is matched
   * for the list (never shadowed by the `:id` param route — the E2E asserts it returns the list, not a 404).
   */
  @Get('lieutenants')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: RequestWithAccount): Promise<{ lieutenants: RosterRow[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const lieutenants = await this.projection.rosterRows(playerId);
    return { lieutenants };
  }

  /**
   * `GET /v1/lieutenants/:id` — the requesting player's qualitative lieutenant projection (T7; R2.2 inverted): the
   * archetype band + granted_role + mode + op_state_band (PAUSED/ACTIVE/IDLE) + rule_count_band (NONE/FEW/MANY) + the
   * player-authored script_source (the ONE allowed readable field; spec §7). NEVER the raw role_id / tenure_score /
   * succession_horizon / delegation_paused bool / raw rules count / tick (R2.2). The player can read only their OWN
   * lieutenant: a lieutenant that is not the player's / does not exist → 404 RESOURCE_NOT_FOUND (the projection returns
   * null; consistent with the attach/validate ownership guard + the real_estate GET precedent). Requires a PLAYER JWT
   * (no token → 401).
   */
  @Get('lieutenants/:id')
  @UseGuards(JwtAuthGuard)
  async lieutenantById(
    @Param('id', UuidParam) id: string,
    @Req() req: RequestWithAccount,
  ): Promise<LieutenantBands> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const bands = await this.projection.lieutenantBands(playerId, id);
    if (!bands) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such lieutenant for this player: ${id}.` });
    }
    return bands;
  }

  /**
   * `POST /v1/lieutenants/:id/autonomy/decision` — apply a player AutonomyDecision to an OWNED lieutenant's autonomy budget
   * (Phase-19 L1a T7). Body: { kind } ∈ { reset_budget | raise_ceiling | override_one_shot }. The player may decide ONLY on
   * their OWN lieutenant: a lieutenant that is not the player's / does not exist → 404 RESOURCE_NOT_FOUND (the ownership
   * read returns null). An unknown/garbage `kind` → 422 VALIDATION_FAILED. A same-kind decision before the cooldown elapses
   * → 409 RESOURCE_STATE_CONFLICT (the service). The archetype is derived from the persisted role_id (archetypeForRoleId —
   * the SAME map the tick + projection use). The current tick is the player's city_sim_clock.game_minute (getCurrentGameMinute
   * — the SAME clock the LIEUTENANT_TICK / the settling/cooldown windows live in). Returns { applied: true }. 200 (a mutation
   * on the existing budget — not a creation). Requires a PLAYER JWT (no token → 401). Idempotency-Key supported.
   */
  @Post('lieutenants/:id/autonomy/decision')
  @HttpCode(200) // a mutation on the existing autonomy budget (a decision applied, not a creation) → 200.
  @UseGuards(JwtAuthGuard)
  async autonomyDecision(
    @Param('id', UuidParam) id: string,
    @Body() body: AutonomyDecisionBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ applied: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // TD-451 — MESURÉ EN PRODUCTION le 2026-09-02 : cette route rendait **200** sur un corps portant
    // `{kind:'reset_budget', choix:'x'}` — le champ inconnu était ignoré et la décision appliquée. Elle
    // avait échappé au lot précédent parce que son fichier porte déjà 5 helpers de validation : le
    // COMPTE de helpers ne dit rien de la couverture d'UNE route. Mesuré : le client n'envoie que
    // `kind`, et 4 sites de spec de même.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['kind']);
    // Validate the decision kind BEFORE any ownership read (a garbage kind is a 422 regardless of ownership).
    const kind = body?.kind;
    // L0.3 (D5) — kind: LIBRE (allowlist (1)) — a dispatch value, never persisted (0 hits for its 3
    // literals across db/schema/**/*.ts) — already correctly 422s.
    if (typeof kind !== 'string' || !AUTONOMY_DECISION_KINDS.includes(kind as AutonomyDecisionKind)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown autonomy decision kind '${String(kind)}' — expected one of ${AUTONOMY_DECISION_KINDS.join(', ')}.`,
        details: { param: 'kind' },
      });
    }
    // OWNERSHIP: resolve the player-owned lieutenant (role_id → archetype). Not the player's / non-existent → null → 404.
    // (Reuses the SAME player-scoped ownership read the reassign action uses — it carries the role_id we need.)
    const owned = await this.repo.getOwnedLieutenantForReassign(playerId, id);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such lieutenant for this player: ${id}.` });
    }
    const archetype = archetypeForRoleId(owned.role_id);
    if (archetype === null) {
      // Defensive: a recruited lieutenant always has a derivable archetype (recruit grounds role_id via roleIdForArchetype).
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Lieutenant ${id} has no derivable archetype (role_id ${owned.role_id}).` });
    }
    // The current tick — the player's city_sim_clock.game_minute (the SAME monotonic minute the tick + the cooldown live in).
    const now = await this.repo.getCurrentGameMinute(playerId);
    // P3-A C5 (D7/D8) — Loop 10 STRUCTURAL site #6 (AUTONOMY_TIER_CHANGE): ONLY `raise_ceiling` (a
    // permanent cap lift) is structural. `reset_budget` (top-up) and `override_one_shot` (one-shot
    // bypass) stay TACTICAL — called directly, unguarded, exactly as before this chunk.
    if (kind === 'raise_ceiling') {
      await this.governor.commit(
        playerId,
        StructuralDecisionType.AUTONOMY_TIER_CHANGE,
        {
          before: { entity: 'lieutenant', id, kind },
          after: { entity: 'lieutenant', id, kind },
        },
        () => this.autonomy.applyDecision(id, archetype, kind as AutonomyDecisionKind, now),
      );
    } else {
      await this.autonomy.applyDecision(id, archetype, kind as AutonomyDecisionKind, now);
    }
    return { applied: true };
  }

  /**
   * `POST /v1/lieutenants/:id/signal-drift/decision` — apply a player SignalDriftDecision to an OWNED lieutenant's
   * cue-reliability registry (Phase-22 L2a T5). Body: { kind, target_cue } where kind ∈ { disrupt_cue |
   * reinforce_direct_order | reset_observation_window }. The player may decide ONLY on their OWN lieutenant: a lieutenant
   * that is not the player's / does not exist → 404 RESOURCE_NOT_FOUND (the ownership read returns null). An unknown/garbage
   * `kind` → 422; an out-of-domain `target_cue` (not a CueKind) for the cue-specific `disrupt_cue` → 422. A same-(kind,
   * target_cue) decision before the cooldown elapses → 409 RESOURCE_STATE_CONFLICT (the service). The archetype is derived
   * from the persisted role_id (archetypeForRoleId — the SAME map the tick + projection use); the current tick is the
   * player's city_sim_clock.game_minute (getCurrentGameMinute — the SAME clock observeOutcome / the cooldown live in).
   * Mirrors the autonomy-decision endpoint EXACTLY (validate kind 422 → resolve target_cue → ownership 404 → service 409).
   * TARGET_CUE RULE: `disrupt_cue` REQUIRES a valid CueKind `target_cue` (else 422 — it contaminates a specific cue). The
   * non-cue-specific kinds (reinforce_direct_order / reset_observation_window) IGNORE `target_cue`; absent/garbage is fine
   * (the service keys their cooldown per-kind, not per-cue) — but if a `target_cue` IS present it must still be a valid
   * CueKind (else 422), so a malformed request is rejected uniformly. Returns { applied: true }. 200 (a mutation on the
   * existing registry — not a creation). Requires a PLAYER JWT (no token → 401). Idempotency-Key supported.
   */
  @Post('lieutenants/:id/signal-drift/decision')
  @HttpCode(200) // a mutation on the existing signal-drift registry (a decision applied, not a creation) → 200.
  @UseGuards(JwtAuthGuard)
  async signalDriftDecision(
    @Param('id', UuidParam) id: string,
    @Body() body: SignalDriftDecisionBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ applied: true }> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['kind', 'target_cue']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // Validate the decision kind BEFORE any ownership read (a garbage kind is a 422 regardless of ownership — mirror L1a).
    const kind = body?.kind;
    // L0.3 (D5) — kind: LIBRE (allowlist (1)), same reasoning as autonomyDecision's own kind above.
    if (typeof kind !== 'string' || !SIGNAL_DRIFT_DECISION_KINDS.includes(kind as SignalDriftDecisionKind)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown signal-drift decision kind '${String(kind)}' — expected one of ${SIGNAL_DRIFT_DECISION_KINDS.join(', ')}.`,
        details: { param: 'kind' },
      });
    }
    // Resolve + validate target_cue. disrupt_cue REQUIRES a valid CueKind; the non-cue kinds ignore it (default DIRECT_ORDER
    // for the service signature) but reject a PRESENT-but-malformed value uniformly (a bad target_cue is always a 422).
    const rawCue = body?.target_cue;
    const cueProvided = rawCue !== undefined && rawCue !== null && rawCue !== '';
    const cueValid = typeof rawCue === 'string' && (CUE_KINDS as readonly string[]).includes(rawCue);
    // L0.3 (D5) — target_cue: enum-shaped (validated against the canonical `CUE_KINDS` array,
    // signal-drift-cues.ts:21), kept as this inline check rather than `enumField` — its legal
    // domain is REQUEST-CONDITIONAL (required for disrupt_cue, optional-but-still-validated for the
    // other 2 kinds), a shape `enumField`'s single-required signature does not fit; DF-11 is
    // honored (CUE_KINDS is the canonical source, never hand-copied).
    if (kind === 'disrupt_cue') {
      if (!cueValid) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `Invalid target_cue '${String(rawCue)}' for disrupt_cue — expected one of ${CUE_KINDS.join(', ')}.`,
          details: { param: 'target_cue' },
        });
      }
    } else if (cueProvided && !cueValid) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Invalid target_cue '${String(rawCue)}' — expected one of ${CUE_KINDS.join(', ')}.`,
        details: { param: 'target_cue' },
      });
    }
    const targetCue: CueKind = cueValid ? (rawCue as CueKind) : 'DIRECT_ORDER';
    // OWNERSHIP: resolve the player-owned lieutenant (role_id → archetype). Not the player's / non-existent → null → 404.
    // (Reuses the SAME player-scoped ownership read the autonomy decision + reassign actions use — it carries the role_id.)
    const owned = await this.repo.getOwnedLieutenantForReassign(playerId, id);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such lieutenant for this player: ${id}.` });
    }
    const archetype = archetypeForRoleId(owned.role_id);
    if (archetype === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Lieutenant ${id} has no derivable archetype (role_id ${owned.role_id}).` });
    }
    // The current tick — the player's city_sim_clock.game_minute (the SAME monotonic minute observeOutcome + the cooldown live in).
    const now = await this.repo.getCurrentGameMinute(playerId);
    await this.signalDrift.applyDecision(id, archetype, kind as SignalDriftDecisionKind, targetCue, now);

    // LOT-5 TD-051 — DECISION AUDIT EVENT: emit the decoupled SignalDriftDecisionEmittedEvent on successful applyDecision
    // (Invariant 7 — "chaque SignalDriftDecision génère un event composite persistant"). No subscriber at this slice.
    this.bus.emitSignalDriftDecisionEmitted({
      type: 'signal_drift_decision_emitted',
      playerId,
      lieutenantId: id,
      kind: kind as string,
      targetCueKind: targetCue,
      gameMinute: now,
    });

    return { applied: true };
  }

  /**
   * `POST /v1/lieutenants/:id/standing-order` — issue a standing order to an OWNED lieutenant (Phase-25 L3 T2). Body:
   * { rule_source, lapse_action } where lapse_action ∈ { REVERT_DEFAULT | HOLD_LAST | ESCALATE_TO_PLAYER }. The player may
   * order ONLY their OWN lieutenant: a lieutenant that is not the player's / does not exist → 404 RESOURCE_NOT_FOUND (the
   * ownership read returns null). An unknown/garbage `lapse_action` → 422 VALIDATION_FAILED; a rule_source that does not
   * compile to EXACTLY one valid rule → 422 (the service, with the compiler diagnostics in `details`). A lieutenant that
   * ALREADY has an active order → 409 RESOURCE_STATE_CONFLICT (the Single-active invariant — RENEW instead). The current
   * tick is the player's city_sim_clock.game_minute (getCurrentGameMinute — the SAME clock the LIEUTENANT_TICK + the order
   * expiry live in), driving `expires_at = now + durationStandardTicks`. Mirrors the autonomy/signal-drift decision
   * endpoints (validate the closed-domain field 422 → ownership 404 → service). `duration_class` is IGNORED in M2 (always
   * the standard TTL, spec §3.1). Returns { issued: true, order_id }. 200 (the order is created in the standing_order row,
   * but the player-facing contract mirrors the sibling decision endpoints' 200 mutation shape). Requires a PLAYER JWT (no
   * token → 401). Idempotency-Key supported (the global interceptor).
   */
  @Post('lieutenants/:id/standing-order')
  @HttpCode(200) // mirror the sibling decision endpoints (a mutation on the lieutenant's delegation surface) → 200.
  @UseGuards(JwtAuthGuard)
  async standingOrderIssue(
    @Param('id', UuidParam) id: string,
    @Body() body: StandingOrderBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ issued: true; order_id: string }> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['lapse_action', 'rule_source']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — lapse_action: enum, `lapseActionPg.enumValues` (DF-11) — replaces the
    // hand-mirrored `LAPSE_ACTIONS` array, same 3-member domain (`db/schema/lieutenant.ts:32`),
    // persisted on the `standing_order` row. Validated BEFORE any ownership read (a garbage value is
    // a 422 regardless of ownership — mirror L1a/L2a).
    const lapseAction = enumField(lapseActionPg.enumValues, body as unknown as Record<string, unknown>, 'lapse_action') as LapseActionEnum;
    // OWNERSHIP: resolve the player-owned lieutenant. Not the player's / non-existent → null → 404. (Reuses the SAME
    // player-scoped ownership read the autonomy/signal-drift decisions use.)
    const owned = await this.repo.getOwnedLieutenantForReassign(playerId, id);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such lieutenant for this player: ${id}.` });
    }
    // The current tick — the player's city_sim_clock.game_minute (the SAME monotonic minute the tick + the expiry live in).
    const now = await this.repo.getCurrentGameMinute(playerId);
    const { order_id } = await this.standingOrder.issue(id, body.rule_source, lapseAction as LapseActionEnum, now);
    return { issued: true, order_id };
  }

  /**
   * `POST /v1/lieutenants/:id/standing-order/decision` — apply a player StandingOrderDecision to an OWNED lieutenant's
   * current standing order (Phase-25 L3 T4). Body: { kind } ∈ { RENEW | REVOKE | PROMOTE_TO_DEFAULT }. The player may decide
   * ONLY on their OWN lieutenant: a lieutenant that is not the player's / does not exist → 404 RESOURCE_NOT_FOUND (the
   * ownership read returns null). An unknown/garbage `kind` → 422 VALIDATION_FAILED. A same-kind decision before the per-kind
   * cooldown elapses → 409 RESOURCE_STATE_CONFLICT (the service); a decision with NO current order → 409 (the service); a
   * PROMOTE_TO_DEFAULT on an order not flagged for promotion → 409 (the service). The current tick is the player's
   * city_sim_clock.game_minute (getCurrentGameMinute — the SAME clock the LIEUTENANT_TICK + the order expiry + the cooldown
   * live in). Mirrors the autonomy/signal-drift decision endpoints EXACTLY (validate the closed-domain kind 422 → ownership
   * 404 → service). Returns { applied: true }. 200 (a mutation on the existing order — not a creation). Requires a PLAYER
   * JWT (no token → 401). Idempotency-Key supported (the global interceptor).
   */
  @Post('lieutenants/:id/standing-order/decision')
  @HttpCode(200) // a mutation on the existing standing order (a decision applied, not a creation) → 200.
  @UseGuards(JwtAuthGuard)
  async standingOrderDecision(
    @Param('id', UuidParam) id: string,
    @Body() body: StandingOrderDecisionBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ applied: true }> {
    // TD-451 (chantier P5, lot 2 « les lieutenants et la pile du jour ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 210 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['kind']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // Validate the decision kind BEFORE any ownership read (a garbage kind is a 422 regardless of ownership — mirror L1a/L2a).
    const kind = body?.kind;
    // L0.3 (D5) — kind: LIBRE (allowlist (1)), same reasoning as the sibling decision endpoints' own kind.
    if (typeof kind !== 'string' || !STANDING_ORDER_DECISION_KINDS.includes(kind as StandingOrderDecisionKind)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown standing-order decision kind '${String(kind)}' — expected one of ${STANDING_ORDER_DECISION_KINDS.join(', ')}.`,
        details: { param: 'kind' },
      });
    }
    // OWNERSHIP: resolve the player-owned lieutenant. Not the player's / non-existent → null → 404. (Reuses the SAME
    // player-scoped ownership read the autonomy/signal-drift decisions + the standing-order issue use.)
    const owned = await this.repo.getOwnedLieutenantForReassign(playerId, id);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such lieutenant for this player: ${id}.` });
    }
    // The current tick — the player's city_sim_clock.game_minute (the SAME monotonic minute the tick + the expiry + the
    // cooldown live in). applyDecision needs no archetype (the order's rule is self-describing — unlike signal-drift).
    const now = await this.repo.getCurrentGameMinute(playerId);
    await this.standingOrder.applyDecision(id, kind as StandingOrderDecisionKind, now);
    return { applied: true };
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). 404 if none. */
  private async resolvePlayerId(accountId: string): Promise<string> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const playerId = rows[0]?.player_id;
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return playerId;
  }
}
