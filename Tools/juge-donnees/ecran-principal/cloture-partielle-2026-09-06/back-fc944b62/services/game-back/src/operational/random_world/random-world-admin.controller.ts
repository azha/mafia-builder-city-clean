// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C5 (AC1/AC2 — 4 BO endpoints)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §6.2 (BO surfaces)
//             Decisions: docs/superpowers/specs/2026-07-15-04g-B-random-world-decisions.md D14
//             (registry-only → 422 refusal) + D16 (force-template: role admin, real code-path, F3
//             residual JOIN TD-107)
//             Pattern: services/game-back/src/operational/political/political-admin.controller.ts
//             (`requireStaffRole` role-split GET/POST shape, F3-deferred marker, real-watermark
//             gameDay — never client-supplied) + services/game-back/src/operational/ambient/
//             ambient-admin.controller.ts (raw ops-diagnostic payloads, P5 BO inversion posture).
//             — 04g-B C5 — 2026-07-15
//
// `RandomWorldAdminController` — 4 ops-diagnostic/action endpoints for the RANDOM-WORLD runtime (G24,
// role `gm` ≡ `ops` for the 3 GETs, role `admin` for the 1 POST):
//
//   GET  /v1/admin/random-world/active                       — role gm    — RAW active-event payloads (diagnostic)
//   GET  /v1/admin/random-world/coupling-discoveries-fired    — role gm    — cascades + gated counts (E2E-RW-02)
//   GET  /v1/admin/random-world/daily-runs?fromGameDay=       — role gm    — claims + counts (batch observability)
//   POST /v1/admin/random-world/force-template                — role admin — SAME code-path as the tick, F3 DEFERRED
//
// P5 BO INVERSION (R2.2 does NOT apply here): every GET below returns RAW persisted rows — full jsonb
// `payload`, raw `recovery_curve_position`, raw `game_day` timestamps — an ops-diagnostic surface never
// forwarded to a player (the player surface is `RandomWorldProjectionService`/`RandomWorldController`,
// band-projected, §6.1). Mirrors `AmbientAdminController`'s own "ops sees raw, player never does" posture.
//
// D14 (registry-only refusal) + the FORCEABLE-set restriction (see `RandomWorldEventGeneratorService.
// forceActivate`'s own doc comment for the full reasoning): `force-template` validates the templateId
// against the SAME 14-entry static registry every other caller routes through
// (`RANDOM_WORLD_TEMPLATE_REGISTRY`) BEFORE ever touching the generator service — an unknown id, a
// `registry_only` id, or a `live` id outside the 2-template forceable set (`halgren_tannery_hailstorm`/
// `hollow_at_the_corner`) is REJECTED 422 with an explicit reason, never a silent no-op or a fabricated
// event. A request that clears all 3 checks calls `RandomWorldEventGeneratorService.forceActivate` — the
// EXACT same private activation method (`activateHailstorm`/`activateHollow`) the real NIGHTLY/28 tick's
// own phase-3 trigger calls — never a direct `repo.insertEvent` from this controller (anti-fig-leaf,
// C5 AC2's own falsifiable guarantee: the event AND its effect_modifier rows exist, identical shape to
// the tick's own C2 AC2 flow).
//
// F3 two-person-rule: DEFERRED (TD-107 JOIN, item 28 — same precedent as every other `force-*`/`tunables/*`
// admin action in this codebase). `force-template`'s response carries `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token server-side
// (`auth/staff-role.guard.ts`) — a player token or a `gm` token on the `admin`-only force-template route
// → 403 (AUTHZ_PERMISSION_DENIED); no token → 401.
//
// NOT test-gated — real production BO routes, always registered (mirrors `AmbientAdminController`'s own
// "NOT conditional on NODE_ENV" posture).

import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../auth/staff-role.guard';
import { ApiError } from '../../protocol/api-error';
import { RANDOM_WORLD_TEMPLATE_REGISTRY } from './random-world-template-registry';
import {
  RandomWorldEventGeneratorService,
  isForceableRandomWorldTemplateId,
} from './random-world-event-generator.service';
import { RandomWorldEventRepository } from './random-world-event.repository';
import type { RandomWorldEventActiveRow, RandomWorldDailyRunRow, CouplingDiscoveryCascadeRow } from '../../db/schema/random_world';

/** BO diagnostic listing caps (query params NEVER unbounded — mirrors `AmbientAdminController`'s own
 *  `DETECTIONS_LIST_LIMIT`/`MICRO_EVENTS_MAX_LIMIT` idiom). */
const CASCADES_LIST_LIMIT = 100;
const DAILY_RUNS_LIST_LIMIT = 200;

interface ForceTemplateBody {
  templateId: string;
  districtId: number;
}

@Controller('admin')
export class RandomWorldAdminController {
  constructor(
    private readonly repo: RandomWorldEventRepository,
    private readonly generator: RandomWorldEventGeneratorService,
  ) {}

  // ─── GET /admin/random-world/active — RAW active-event payloads cross-city (role gm) ───────────────

  /**
   * `GET /v1/admin/random-world/active`
   *
   * Every `random_world_event_active` row CURRENTLY `active`, cross-city (no district/player filter) —
   * RAW `payload` jsonb (ScarPolygon block ids, sideways secondary state, hollow fork state, permanent-
   * residue lever draws — whatever the template stamped), raw `recovery_curve_position`, raw
   * `started_at_game_day`/`expires_at_game_day`. An ops diagnostic stream, never surfaced to a player
   * (P5 BO inversion — the player's own `GET /v1/random-world/active` is band-projected, §6.1).
   *
   * Returns: { gameDay: number, events: RandomWorldEventActiveRow[] }
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('random-world/active')
  @UseGuards(requireStaffRole('gm'))
  async active(): Promise<{ gameDay: number; events: RandomWorldEventActiveRow[] }> {
    const [events, latestRun] = await Promise.all([
      this.repo.listAllActiveEvents(),
      this.repo.readLatestDailyRun(),
    ]);
    return { gameDay: latestRun?.game_day ?? 0, events };
  }

  // ─── GET /admin/random-world/coupling-discoveries-fired — cascades + gated counts (role gm) ────────

  /**
   * `GET /v1/admin/random-world/coupling-discoveries-fired`
   *
   * The Sideways Failure coupling-discovery diagnostic (design §3.6/E2E-RW-02): the most recent
   * `coupling_discovery_cascade` rows CITY-WIDE (cross-player, ≤ {@link CASCADES_LIST_LIMIT}, newest
   * first) PLUS the per-day `gated_cascade_attempts`/`activation_count`/`evaluated_template_count`
   * counters from `random_world_daily_run` (the SAME counters E2E-RW-02's own floor asserts directly via
   * SQL at C3 — this endpoint is the BO-surfaced equivalent, no new counter invented).
   *
   * Returns: { cascades: CouplingDiscoveryCascadeRow[], dailyRuns: Array<{ gameDay, evaluatedTemplateCount,
   *   activationCount, gatedCascadeAttempts }> }
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('random-world/coupling-discoveries-fired')
  @UseGuards(requireStaffRole('gm'))
  async couplingDiscoveriesFired(): Promise<{
    cascades: CouplingDiscoveryCascadeRow[];
    dailyRuns: Array<{ gameDay: number; evaluatedTemplateCount: number; activationCount: number; gatedCascadeAttempts: number }>;
  }> {
    const [cascades, runs] = await Promise.all([
      this.repo.listRecentCascades(CASCADES_LIST_LIMIT),
      this.repo.listDailyRuns(0, DAILY_RUNS_LIST_LIMIT),
    ]);
    return {
      cascades,
      dailyRuns: runs.map((r) => ({
        gameDay: r.game_day,
        evaluatedTemplateCount: r.evaluated_template_count,
        activationCount: r.activation_count,
        gatedCascadeAttempts: r.gated_cascade_attempts,
      })),
    };
  }

  // ─── GET /admin/random-world/daily-runs?fromGameDay= — claims + counts (role gm) ───────────────────

  /**
   * `GET /v1/admin/random-world/daily-runs?fromGameDay=`
   *
   * Every `random_world_daily_run` row (the tick's own per-day claim, design §4.3) with
   * `game_day >= fromGameDay` (default 0 — every claimed day), ascending, ≤ {@link DAILY_RUNS_LIST_LIMIT}
   * — the batch-observability surface (design §6.2 "claims + counts").
   *
   * Returns: { runs: RandomWorldDailyRunRow[] }
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('random-world/daily-runs')
  @UseGuards(requireStaffRole('gm'))
  async dailyRuns(@Query('fromGameDay') fromGameDayParam: string | undefined): Promise<{ runs: RandomWorldDailyRunRow[] }> {
    const parsed = fromGameDayParam !== undefined ? Number.parseInt(fromGameDayParam, 10) : 0;
    const fromGameDay = Number.isNaN(parsed) ? 0 : parsed;
    const runs = await this.repo.listDailyRuns(fromGameDay, DAILY_RUNS_LIST_LIMIT);
    return { runs };
  }

  // ─── POST /admin/random-world/force-template — SAME code-path as the tick (role admin, F3 DEFERRED) ─

  /**
   * `POST /v1/admin/random-world/force-template`
   *
   * Force-activate a LIVE template on a given district TODAY (the REAL `random_world_daily_run`
   * watermark — see `readLatestDailyRun`'s own doc comment — never a client-supplied `gameDay`; an admin
   * cannot backdate/future-date an activation). Calls `RandomWorldEventGeneratorService.forceActivate` —
   * the SAME code-path the real tick's own phase-3 trigger uses (design AC2: the event AND its
   * `effect_modifier` rows exist, identical shape to the tick's own C2 AC2 flow — never a bypass INSERT).
   *
   * Validation (in order, each its own explicit 422 — D14, anti-fig-leaf):
   *   1. Unknown `templateId` (outside the 14-entry registry) → 422.
   *   2. `templateId` is one of the 8 `registry_only` entries → 422 (D14: "the BO cannot activate a
   *      template with no runtime" — a fabricated event would be an administrative fig-leaf).
   *   3. `templateId` is `live` but outside the 2-template forceable set (`permanent_residue`/
   *      `apparent_recovery`/`sideways_failure`/`quorum_on_stadler_row` — successor-only or state-driven,
   *      no "activate on district D" standalone semantics) → 422, explicit reason (see
   *      `RandomWorldEventGeneratorService.forceActivate`'s own doc comment for the full rationale; TD
   *      routed at this closeout).
   *
   * Body: { templateId: string, districtId: number }
   * Returns: { eventId, templateId, districtId, gameDay, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 JOIN item 28, same
   * precedent as `PoliticalAdminController.forceActivate` and every other `force-*` admin action).
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('random-world/force-template')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 JOIN item 28).
  @UseGuards(requireStaffRole('admin'))
  async forceTemplate(@Body() body: ForceTemplateBody) {
    const { templateId, districtId } = body ?? {};

    const entry = RANDOM_WORLD_TEMPLATE_REGISTRY.find((e) => e.templateId === templateId);
    if (!entry) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown RandomWorldTemplateId: ${JSON.stringify(templateId)}. Must be one of the ${RANDOM_WORLD_TEMPLATE_REGISTRY.length} registry entries.`,
      });
    }
    if (entry.runtime === 'registry_only') {
      throw new ApiError('VALIDATION_FAILED', {
        message: `'${templateId}' is registry-only (D1) — zero runtime code-path exists (${entry.registryOnlyReason ?? 'no reason recorded'}). The BO cannot force-activate a template with no runtime (D14, anti-fig-leaf).`,
      });
    }
    if (!isForceableRandomWorldTemplateId(templateId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `'${templateId}' is LIVE but not force-able via this generic (districtId-only) endpoint — it is successor-only or state-driven, with no "activate on district D" standalone semantics (see RandomWorldEventGeneratorService.forceActivate's own doc comment). Force-able LIVE templates: 'halgren_tannery_hailstorm', 'hollow_at_the_corner'.`,
      });
    }

    const latestRun = await this.repo.readLatestDailyRun();
    const gameDay = latestRun?.game_day ?? 0;

    const event = await this.generator.forceActivate(templateId, districtId, gameDay);

    // F3 DEFERRED marker — same precedent as PoliticalAdminController.forceActivate.
    return { eventId: event.id, templateId, districtId, gameDay, f3_deferred: true };
  }
}
