// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C8 (D5 — thin ops-BO, 5 endpoints
//             `requireStaffRole`, F3-deferred markers, audit)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md §Glossary
//             ("every event activates exclusively via the BO force-trigger", live-ops.types.ts:22) + % allowed-mention: false-positive substring match ("exclusively", adverb, not "exclusive" cosmetic/FOMO framing)
//             docs/tech/12_backoffice_admin/liveops_events_and_push.md §BO (pins the engine contract,
//             `cohort-preview` + `<EventComposer>` = 04e-C, NOT this chunk).
//             Pattern: services/game-back/src/operational/political/political-admin.controller.ts (C9 —
//             the closest sibling: `requireStaffRole`, `f3_deferred` markers, the raw-active-listing
//             GET-with-JOIN shape) + services/game-back/src/operational/meta_market/meta-market-admin.
//             controller.ts (C8 — the PUT-tunables upsert shape).
//             — 04e-B C8 — 2026-07-06
//
// `LiveOpsAdminController` — BO production routes for the 10-event live-ops catalogue (G8, D5).
//
// Routes (5 endpoints — plan §C8 literal path shape, PATH PARAMS not body, unlike the political/
// meta-market siblings' body-only actions):
//   GET  /v1/admin/liveops/active                       — role gm    — RAW currently-ACTIVE ledger + modifier rows (P5 BO inversion)
//   GET  /v1/admin/liveops/cadence-status                — role gm    — active/high-impact counts vs caps (LiveOpsCadenceController.getCadenceStatus, C8 NEW)
//   POST /v1/admin/liveops/:eventId/force-activate        — role admin — F3 DEFERRED (TD) — drives the REAL LiveOpsEventService.activateLiveOpsEvent
//   POST /v1/admin/liveops/:activeId/deactivate-early     — role admin — F3 DEFERRED (TD) — drives the REAL LiveOpsEventService.deactivateLiveOpsEvent
//   PUT  /v1/admin/tunables/liveops                       — role admin — F3 DEFERRED (TD)
//
// P5 BO INVERSION (R2.2): the player-facing live-ops surface (C9, NOT built by this chunk) will NEVER
//   return a raw effect magnitude, `started_at`/`ends_at` (no countdown, canon `liveops_event_catalogue. % allowed-mention: design comment (R2.2/P5 "no countdown" rule statement, not a countdown implementation)
//   md:181,340`), or a raw cohort_key — qualitative bands + effect direction ONLY. This controller is the
//   P5-inverted sibling: gm/admin staff see the REAL persisted `live_ops_event_active`/`effect_modifier`
//   rows (raw magnitude, raw timestamps, raw cohort_key) — an ops calibration/incident-response surface,
//   never forwarded to players.
//
// F3 two-person-rule: DEFERRED (TD-107 — this route is not wired to the ch17 `TwoPersonApproval` workflow). Same precedent as
//   `PoliticalAdminController` / `MetaMarketAdminController` / `IAAdminController` / `LegalAdminController`.
//   The 3 action endpoints are gated by `requireStaffRole('admin')` ONLY until F3 lands — each response
//   carries `f3_deferred: true`.
//
// ★ 04e-C C4 (D2, decisions §4) — the composer's `schedule`/`deactivate-early`/`push/send` ALSO carry an
//   INFORMATIONAL `two_person_required` marker: `computeTwoPersonRequired` re-uses `CohortTargetingService.
//   evaluateCohortTargeting` (the SAME path `cohortPreview` below calls — never re-derived) and compares
//   the resolved affected-count against the REUSE tunable `T.bo.twoperson.mass_cohort_threshold`
//   (`live-ops.tunables.ts`, `liveOpsBoTwoPersonTunables.massCohortThreshold` — this chunk's own NEW
//   getter, 0 code readers before it). This is PURELY ADVISORY — the mutation executes under `admin`
//   alone REGARDLESS of the flag (there is no `TwoPersonApprovalRequest` workflow to route to; ch17
//   TD-107). The prior WIP's "compute-then-execute-anyway-while-annotating" shape was dishonest only in
//   that it never SAID it was advisory; this marker's honesty comes from never claiming otherwise.
//
// RBAC honesty (D2, decisions §4): the fine `staff.simulation.event_spawn` / `district_nudge` permission
//   catalogue (`liveops_events_and_push.md §4`) is NOT implemented in this stack — `@RequirePermission`
//   (ch17) does not exist. Every endpoint below keeps the coarse `requireStaffRole` gate; the fine RBAC
//   is a TD (ch17 backport), NOT invented here.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification, `auth/staff-role.guard.ts`). A
//   `x-staff-role: gm` header WITHOUT a valid bearer token → 401. A valid PLAYER (or wrong-role STAFF)
//   token → 403.
//
// ★ AUDIT (D5, 04e-B C8's own addition, EXTENDED 04e-C C2/C3 — see `db/admin-audit-log.service.ts`'s
//   header for the "first consumer of ch09 admin_audit_log" honesty note): every MUTATION endpoint in
//   this file writes ONE `admin_audit_log` row (`AdminAuditLogService.emit`) — the acting staff
//   account_id (from the VERIFIED JWT, `req.account.account_id` — never client-supplied), the action
//   type, the targeted entity, and a before/after snapshot. The GET endpoints (`getActive`,
//   `getCadenceStatus`, `cohortPreview` — a POST but read-only, `getUpcoming`) are read-only diagnostics
//   and do NOT audit (mirrors every sibling BO controller: only mutations are audited).
//
// NO COMPOSER/COHORT-PREVIEW HERE (D5/§8 A→B→C boundary): the `cohort-preview` count endpoint and the
//   `<EventComposer>` multi-step wizard belong to 04e-C — `docs/tech/12_backoffice_admin/
//   liveops_events_and_push.md:6` pins this engine + the 10-event catalogue as REUSE for that chunk,
//   never redefined here.
//
// ★ 04e-C ADDITIONS (C2/C3, DD-C6 Option A — the composer's game-back-DIRECT surface, bo-front reaches
//   these endpoints DIRECTLY with the staff's dual GAME_BACK token, no bo-back hop):
//   POST /v1/admin/liveops/cohort-preview                — role gm    — C2, read-only estimated-affected count
//   POST /v1/admin/liveops/schedule                       — role admin — C2, SCHEDULED row + targeting_filter + audit
//   GET  /v1/admin/liveops/upcoming                       — role gm    — C2, read-only SCHEDULED listing
//   POST /v1/admin/liveops/push/send                      — role gm    — C2 (shape) / ★ C3 (audit added — see below)
//   ★ C3 AUDIT UPDATE (this chunk): `sendPush` was the ONE mutation endpoint in this controller with NO
//   `admin_audit_log` emit (an audit found this, not a fig-leaf claim) — it now writes one `CREATE
//   push_campaign` row, matching every other mutation below. Every mutation endpoint in this file now
//   audits: `scheduleEvent` (CREATE, since C2), `sendPush` (CREATE, ★ C3 NEW), `forceActivate` (CREATE),
//   `deactivateEarly` (UPDATE), `patchLiveOpsTunable` (UPDATE) — 5 mutations, 5 audited paths, 0 gaps.
//   `getActive`/`getCadenceStatus`/`cohortPreview`/`getUpcoming` stay read-only diagnostics (no audit).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in LiveOpsModule.controllers (alongside conditional LiveOpsTestController).
//
// ★ 04g-D C4b — 2026-07-17 (plan §0.9/design §3.6-B allowlist): ONE of the 5 allowlisted 04e files — 3
// gates (`cohortPreview`/`scheduleEvent`/`forceActivate`, each an `X_EVENT_BY_ID.has()` boolean check) +
// 2 resolver swaps (`scheduleEvent`'s own event lookup, `deactivateEarly`'s stop-filter fallback) now
// route through `isResolvableLiveOpsEventId`/`resolveLiveOpsEventById`
// (`live-ops-mounted-event.store.ts`) — a MOUNTED reskin's `event_id` is now accepted at every gate a
// static catalogue id already was. BYTE-IDENTICAL for the 10 static ids (catalogue-first, same Map
// consulted first); `LIVE_OPS_EVENT_BY_ID`/`getLiveOpsEventById`/`live-ops-event-catalogue.ts` are NOT
// imported here anymore — the store re-exports the SAME catalogue-first resolution.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { liveOpsEventActive } from '../../db/schema/live_ops_event_active';
import { effectModifier } from '../../db/schema/effect_modifier';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole, assertMinRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { LIVE_OPS_TUNABLE_CAPS, clampLiveOpsTunableToRange, liveOpsBoTwoPersonTunables } from './live-ops.tunables';
import { resolveLiveOpsEventById, isResolvableLiveOpsEventId } from './live-ops-mounted-event.store';
import { LiveOpsEventService, type ActivateLiveOpsEventResult, type DeactivateLiveOpsEventResult } from './live-ops-event.service';
import { LiveOpsCadenceController } from './live-ops-cadence-controller';
import { CohortTargetingService } from './cohort-targeting.service';
import { LiveOpsNotificationService } from './live-ops-notification.service';
import { assertLiveOpsBrandGateClean } from './live-ops-brand-gate';
import type { CohortTargetingFilter, NotifiableEvent, PushConsentClass } from './live-ops.types';

const MS_PER_REAL_DAY = 24 * 60 * 60 * 1000;

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceActivateBody {
  /** Operator-chosen targeting override (design §3.3 — "the specific region is an operator choice at
   *  BO force-trigger time, not a value baked into the static catalogue"). Omitted = the catalogue
   *  entry's own static `targeting` composite. */
  filter?: CohortTargetingFilter;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `LiveOpsAdminController` — production BO routes for the 10-event live-ops catalogue (G8, 04e-B C8).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/liveops/active`, `/v1/admin/liveops/cadence-status`,
 * `/v1/admin/liveops/:eventId/force-activate`, `/v1/admin/liveops/:activeId/deactivate-early`,
 * `/v1/admin/tunables/liveops`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in LiveOpsModule.controllers (alongside conditional LiveOpsTestController).
 */
@Controller('admin')
export class LiveOpsAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly liveOpsEventService: LiveOpsEventService,
    private readonly cadenceController: LiveOpsCadenceController,
    private readonly auditLog: AdminAuditLogService,
    private readonly cohortTargetingService: CohortTargetingService,
    private readonly notificationService: LiveOpsNotificationService,
  ) {}

  /**
   * ★ 04e-C C4 (D2) — the informational `two_person_required` marker. Computes the estimated-affected
   * count via the SAME `CohortTargetingService.evaluateCohortTargeting` path `cohortPreview` uses (REUSE,
   * never a re-derived count) and compares it against the REUSE tunable `T.bo.twoperson.
   * mass_cohort_threshold` (`liveOpsBoTwoPersonTunables.massCohortThreshold`). PURELY ADVISORY: the
   * caller sets this on its own response and executes REGARDLESS of the result — ch17
   * `TwoPersonApproval` exists since migration 0152, but this route is not wired to it (TD-107). If the
   * filter cannot be resolved (e.g. an operator-composed `recentActivity` dimension —
   * `evaluateCohortTargeting` throws for it), the marker defaults to `false` rather than propagating the
   * error: this computation must never block or fail a mutation it only annotates.
   */
  private async computeTwoPersonRequired(eventId: string, filter: CohortTargetingFilter): Promise<boolean> {
    try {
      const affected = await this.cohortTargetingService.evaluateCohortTargeting(eventId, filter);
      return affected.length > liveOpsBoTwoPersonTunables.massCohortThreshold;
    } catch {
      return false;
    }
  }

  // ─── GET /admin/liveops/active — RAW active ledger + modifier rows (role `gm`) ─────────────────────

  /**
   * `GET /v1/admin/liveops/active`
   *
   * P5 BO INVERSION: returns every `live_ops_event_active` row with `status='ACTIVE'` WITH the raw
   * ledger fields (`cohortKey`/`startedAt`/`endsAt`, NEVER surfaced to players, R2.2) AND every REAL
   * persisted `effect_modifier` row it applied (raw `tunableKey`/`op`/`magnitude`/`scopeType`/
   * `scopeRef` — the ACTUAL value applied at activation, not a re-derived registry preview). Mirrors
   * `PoliticalAdminController.getActive`'s shape, joined on the DD-B2 `live_ops_active_event_id` FK
   * instead of `active_event_id`.
   *
   * Returns: { active: Array<{ activeEventId, eventId, category, cohortKey, highImpact, startedAt,
   *   endsAt, status, modifiers: Array<{ tunableKey, op, magnitude, scopeType, scopeRef }> }> }
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('liveops/active')
  @UseGuards(requireStaffRole('gm'))
  async getActive() {
    const rows = await this.db
      .select({
        activeEventId: liveOpsEventActive.id,
        eventId: liveOpsEventActive.event_id,
        category: liveOpsEventActive.category,
        cohortKey: liveOpsEventActive.cohort_key,
        highImpact: liveOpsEventActive.high_impact,
        startedAt: liveOpsEventActive.started_at,
        endsAt: liveOpsEventActive.ends_at,
        status: liveOpsEventActive.status,
        modifierTunableKey: effectModifier.tunable_key,
        modifierOp: effectModifier.op,
        modifierMagnitude: effectModifier.magnitude,
        modifierScopeType: effectModifier.scope_type,
        modifierScopeRef: effectModifier.scope_ref,
      })
      .from(liveOpsEventActive)
      .leftJoin(effectModifier, eq(effectModifier.live_ops_active_event_id, liveOpsEventActive.id))
      .where(eq(liveOpsEventActive.status, 'ACTIVE'));

    // Group the flat JOIN rows by activeEventId (a variable number of effect_modifier rows per
    // activation — zero for a surface-only/TD'd event, one for a GLOBAL effect, one PER targeted
    // player for a PLAYER-scoped effect).
    const byActiveEventId = new Map<string, {
      activeEventId: string;
      eventId: string;
      category: string;
      cohortKey: string;
      highImpact: boolean;
      startedAt: Date;
      endsAt: Date | null;
      status: string;
      modifiers: Array<{ tunableKey: string; op: string; magnitude: string; scopeType: string; scopeRef: string | null }>;
    }>();

    for (const row of rows) {
      let entry = byActiveEventId.get(row.activeEventId);
      if (!entry) {
        entry = {
          activeEventId: row.activeEventId,
          eventId: row.eventId,
          category: row.category,
          cohortKey: row.cohortKey,
          highImpact: row.highImpact,
          startedAt: row.startedAt,
          endsAt: row.endsAt,
          status: row.status,
          modifiers: [],
        };
        byActiveEventId.set(row.activeEventId, entry);
      }
      // LEFT JOIN with no modifier rows (a TD'd/surface-only event applies zero modifiers, D2 — honest,
      // not a defect) yields NULL modifier columns — skip rather than push a fabricated row.
      if (row.modifierTunableKey !== null) {
        entry.modifiers.push({
          tunableKey: row.modifierTunableKey,
          op: row.modifierOp as string,
          magnitude: String(row.modifierMagnitude),
          scopeType: row.modifierScopeType as string,
          scopeRef: row.modifierScopeRef,
        });
      }
    }

    return { active: Array.from(byActiveEventId.values()) };
  }

  // ─── GET /admin/liveops/cadence-status — cadence state (role `gm`) ─────────────────────────────────

  /**
   * `GET /v1/admin/liveops/cadence-status`
   *
   * The anti-FOMO cadence state (gdd/04e §2.5): active-count vs `liveops.max_active_simultaneous` and % allowed-mention: design comment naming the invariant, not narrative usage
   * high-impact-this-trailing-real-week count vs `liveops.max_high_impact_per_week` — the SAME 2 counts
   * `LiveOpsCadenceController.enforceCadenceLimits` gates activation on (C5), read-only here via the
   * NEW `getCadenceStatus` method (C8 addition to that same controller — no duplicated counting logic).
   *
   * Returns: { activeCount, maxActiveSimultaneous, highImpactCount, maxHighImpactPerWeek }
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('liveops/cadence-status')
  @UseGuards(requireStaffRole('gm'))
  async getCadenceStatus() {
    return await this.cadenceController.getCadenceStatus();
  }

  // ─── Live-Ops Composer Page 2 endpoints ───

  /**
   * `POST /v1/admin/liveops/cohort-preview`
   * Resolves a targeting filter to count the estimated affected players.
   * Role: `gm` (read-only diagnostic).
   *
   * 04e-C C2 (DD-C2 anti-fig-leaf): validates the filter via `CohortTargetingService.validateFilter`
   * BEFORE resolving it — an unresolvable `recentActivity` dimension or an unknown `region` id (a
   * country code like 'US' confused for a `region_id`) now returns a clean 422 VALIDATION_FAILED
   * instead of a bare 500 (`recentActivity`, a `evaluateCohortTargeting` throw) or a silently-zero
   * count (`region`, a WIP-era fig-leaf — decisions §2.2).
   */
  @Post('liveops/cohort-preview')
  @HttpCode(200)
  @UseGuards(requireStaffRole('gm'))
  async cohortPreview(
    @Body() body: { eventId: string; filter: CohortTargetingFilter },
  ): Promise<{ count: number }> {
    if (body.eventId !== 'PUSH_CAMPAIGN' && !isResolvableLiveOpsEventId(body.eventId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown live-ops event id: ${JSON.stringify(body.eventId)}.`,
      });
    }
    const filter = body.filter ?? {};
    const problems = await this.cohortTargetingService.validateFilter(filter);
    if (problems.length > 0) {
      throw new ApiError('VALIDATION_FAILED', { message: problems.join(' ') });
    }
    const playerIds = await this.cohortTargetingService.evaluateCohortTargeting(body.eventId, filter);
    return { count: playerIds.length };
  }

  /**
   * `POST /v1/admin/liveops/schedule`
   * Schedules a catalogue event for a future starting timestamp.
   * Role: `admin` (requires admin authorization, audited).
   *
   * ★ 04e-C C4 (D2): the response carries an INFORMATIONAL `two_person_required` marker
   * (`computeTwoPersonRequired`) alongside `f3_deferred: true` — advisory only, never a block (TD-107).
   */
  @Post('liveops/schedule')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async scheduleEvent(
    @Body() body: { eventId: string; startedAt: string; filter?: CohortTargetingFilter },
    @Req() req: RequestWithAccount,
  ) {
    if (!isResolvableLiveOpsEventId(body.eventId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown live-ops event id: ${JSON.stringify(body.eventId)}.`,
      });
    }
    const event = resolveLiveOpsEventById(body.eventId);
    const targetTime = new Date(body.startedAt);
    if (isNaN(targetTime.getTime())) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Invalid startedAt date: ${JSON.stringify(body.startedAt)}.`,
      });
    }

    const filter = body.filter ?? event.targeting;
    const cohortKey = this.cohortTargetingService.cohortKeyFor(body.eventId, filter);
    // ★ C4 (D2) — informational only, computed BEFORE the insert but never gates it (see method doc).
    const twoPersonRequired = await this.computeTwoPersonRequired(body.eventId, filter);

    const inserted = await this.db
      .insert(liveOpsEventActive)
      .values({
        event_id: body.eventId,
        category: event.category,
        cohort_key: cohortKey,
        high_impact: event.highImpact,
        started_at: targetTime,
        ends_at: event.durationRealDaysGetter
          ? new Date(targetTime.getTime() + event.durationRealDaysGetter() * MS_PER_REAL_DAY)
          : null,
        status: 'SCHEDULED',
        targeting_filter: filter,
      })
      .returning({ id: liveOpsEventActive.id });

    const activeId = inserted[0]?.id;
    if (!activeId) {
      throw new Error(`scheduleEvent: failed to insert scheduled event row`);
    }

    // Audit CREATE
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'CREATE',
      targetEntityType: 'live_ops_event_active',
      targetEntityId: activeId,
      beforeState: {},
      afterState: {
        eventId: body.eventId,
        cohortKey,
        status: 'SCHEDULED',
        startedAt: targetTime,
      },
    });

    return { activeId, cohortKey, status: 'SCHEDULED', f3_deferred: true, two_person_required: twoPersonRequired };
  }

  /**
   * `GET /v1/admin/liveops/upcoming`
   * Lists all upcoming scheduled events.
   * Role: `gm`.
   */
  @Get('liveops/upcoming')
  @UseGuards(requireStaffRole('gm'))
  async getUpcoming() {
    const rows = await this.db
      .select({
        activeEventId: liveOpsEventActive.id,
        eventId: liveOpsEventActive.event_id,
        category: liveOpsEventActive.category,
        cohortKey: liveOpsEventActive.cohort_key,
        highImpact: liveOpsEventActive.high_impact,
        startedAt: liveOpsEventActive.started_at,
        endsAt: liveOpsEventActive.ends_at,
        status: liveOpsEventActive.status,
        targetingFilter: liveOpsEventActive.targeting_filter,
      })
      .from(liveOpsEventActive)
      .where(eq(liveOpsEventActive.status, 'SCHEDULED'))
      .orderBy(liveOpsEventActive.started_at);

    return { upcoming: rows };
  }

  /**
   * `POST /v1/admin/liveops/push/send`
   * Sends custom push notifications to targeted players.
   * Role: `gm` base (called bo-front-DIRECT, DD-C6 — no bo-back hop). ★ 04e-C C5: `forceOverride:true`
   * additionally requires `admin`/`super_admin` (`assertMinRole`, canon `liveops_events_and_push.md §4`
   * "Push cap force-override … requires admin role") — checked IN-HANDLER (a body-conditional
   * requirement the route-level `@UseGuards` decorator cannot express); the base `gm` guard is
   * UNCHANGED (would otherwise break the already-green C3 audit-verification e2e).
   *
   * ★ 04e-C C3 audit (DD-C6 game-back-side-ONLY audit): every OTHER mutation endpoint in this controller
   * (`scheduleEvent`, `forceActivate`, `deactivateEarly`, `patchLiveOpsTunable`) already writes one
   * `admin_audit_log` row via `AdminAuditLogService.emit` — `sendPush` did NOT (the ONE mutation this
   * audit found missing it). Added here: `CREATE push_campaign` (decisions §2.5 "audit send as CREATE
   * push_campaign"), the acting staff id from the VERIFIED JWT (never client-supplied). No
   * `targetEntityId` — a push send has no persisted `push_campaign` row/uuid to point at (DD-C4: no
   * server-side campaign entity exists); `afterState` carries the subject/filter/result counts instead
   * (mirrors `patchLiveOpsTunable`'s own "no uuid target" precedent below). A send REFUSED by the role
   * gate or the brand gate (below) is NOT audited — only an attempted delivery is (mirrors every other
   * mutation's "reject before any write" discipline, `live-ops-notification.service.ts`'s own header).
   *
   * ★ 04e-C C4 (D2): the response now ALSO carries `f3_deferred: true` (this endpoint was the ONE
   * mutation in this controller missing it, mirroring the C3 audit-gap precedent above) and the
   * INFORMATIONAL `two_person_required` marker — REUSES `targetedPlayerIds.length` (already computed
   * below for delivery) rather than issuing a second `evaluateCohortTargeting` query.
   *
   * ★ 04e-C C5 (DD-C5): 3 rework items —
   *   (1) **consent class** — `pushConsentClass` is an EXPLICIT per-send request field (`PushConsentClass`,
   *       `live-ops.types.ts`), defaulting to `SERVICE` when omitted (RULED: SERVICE-for-operational,
   *       decisions §2.5 / §8 #4) — REPLACES the WIP's hardcoded `'MARKETING'` (which fail-closed-
   *       suppressed every composer push in production, DD-B5). An explicit value outside the 2-member
   *       union is a 422 (never silently coerced).
   *   (2) **no unsafe type-escape cast** — REPLACES the WIP's fabricated `LiveOpsEvent` (fake `category`/
   *       `targeting`/`durationRealDaysGetter`/`effects`/`highImpact`/`counterPlayHintKey`, plus an
   *       unsafe cast on a bogus `templateId` value bypassing the anti-pattern-2 template registry) with
   *       a real, honestly-typed `NotifiableEvent` (`live-ops.types.ts`) — the minimal shape
   *       `sendNotifications` actually reads. Zero behavior change to the 10-event catalogue's own
   *       notification call sites
   *       (structural typing, `live-ops-notification.service.ts`'s own header).
   *   (3) **brand gate (D6)** — `assertLiveOpsBrandGateClean` (`live-ops-brand-gate.ts`, REUSES the SAME
   *       token list as the enforced CI `check-political-brand-gate.sh`, never a parallel gate) runs
   *       BEFORE any targeting/consent/send/audit — a hit REFUSES the send (422 `VALIDATION_FAILED`),
   *       zero delivery, zero audit row.
   *   Force-override's own cap-only-never-cooldown semantics (canon §142) require NO change here — they
   *   are the B-engine's OWN `LiveOpsNotificationService.isAllowed` gate order (REUSED verbatim): the
   *   daily-cap check is entirely skipped when `forceOverride` is set, while the cooldown check ALWAYS
   *   runs regardless. This endpoint only adds the role gate around who may set that flag.
   */
  @Post('liveops/push/send')
  @HttpCode(200)
  @UseGuards(requireStaffRole('gm'))
  async sendPush(
    @Body() body: {
      subject: string;
      body: string;
      filter: CohortTargetingFilter;
      forceOverride?: boolean;
      pushConsentClass?: PushConsentClass;
    },
    @Req() req: RequestWithAccount,
  ) {
    // ★ C5 (1 of 3) — force-override role gate, IN-HANDLER (body-conditional, see method doc). Runs
    // FIRST (role/permission checks precede content validation, mirrors every guard in this stack).
    if (body.forceOverride) {
      assertMinRole(req, 'admin');
    }

    // ★ C5 (3 of 3) — the D6 brand gate. Runs BEFORE any targeting/consent/send/audit — a refused send
    // performs NONE of those (see method doc).
    assertLiveOpsBrandGateClean(body.subject, body.body);

    // ★ C5 (1 of 3) — consent class: explicit per send, default SERVICE-for-operational (never a
    // blanket hardcode of either class, decisions §2.5). An out-of-union value is a clean 422, never
    // silently coerced.
    const pushConsentClass: PushConsentClass = body.pushConsentClass ?? 'SERVICE';
    if (pushConsentClass !== 'SERVICE' && pushConsentClass !== 'MARKETING') {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown pushConsentClass: ${JSON.stringify(body.pushConsentClass)}. Must be 'SERVICE' or 'MARKETING'.`,
      });
    }

    // ★ C5 (2 of 3) — a real, honestly-typed NotifiableEvent (`live-ops.types.ts`), no unsafe cast, no
    // fabricated catalogue fields.
    const notice: NotifiableEvent = {
      eventId: 'PUSH_CAMPAIGN',
      noticeCopy: body.body,
      pushConsentClass,
    };

    const targetedPlayerIds = await this.cohortTargetingService.evaluateCohortTargeting('PUSH_CAMPAIGN', body.filter);
    const result = await this.notificationService.sendNotifications(notice, targetedPlayerIds, body.forceOverride);

    // ★ C3 audit (game-back-side, DD-C6) — one admin_audit_log row per push send.
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'CREATE',
      targetEntityType: 'push_campaign',
      beforeState: {},
      afterState: {
        subject: body.subject,
        filter: body.filter,
        forceOverride: body.forceOverride ?? false,
        pushConsentClass,
        sentCount: result.sentCount,
        suppressedCount: result.suppressedCount,
      },
    });

    // ★ C4 (D2) — informational only; REUSES the already-resolved targetedPlayerIds (no extra query).
    const twoPersonRequired = targetedPlayerIds.length > liveOpsBoTwoPersonTunables.massCohortThreshold;

    return { ...result, f3_deferred: true, two_person_required: twoPersonRequired };
  }

  // ─── 3 action endpoints (role `admin`, F3 DEFERRED, audited) ──────────────────────────────────────

  /**
   * `POST /v1/admin/liveops/:eventId/force-activate`
   *
   * Live-ops action: force-activate a catalogue event NOW (real-clock, `LiveOpsClockPort` — never a
   * client-supplied instant). Calls the REAL `LiveOpsEventService.activateLiveOpsEvent` — the SAME
   * production lifecycle method (cadence gate → cohort targeting → INSERT `live_ops_event_active` →
   * `applyLiveOpsEvent` → `reloadNow` → `sendNotifications`), never a re-implementation. Canon: "every
   * one of the 10 events activates exclusively via the C8 thin ops-BO force-trigger endpoint" % allowed-mention: false-positive substring match ("exclusively", adverb, not "exclusive" cosmetic/FOMO framing)
   * (live-ops.types.ts:22) — this IS that endpoint, the only production trigger source for B's catalogue.
   *
   * Body: { filter?: CohortTargetingFilter } — an operator-chosen targeting override (e.g. a region
   *   restriction); omitted = the catalogue entry's own static `targeting` composite.
   * Returns: { liveOpsActiveId, cohortKey, targetedPlayerIds, appliedModifiers, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED (TD-107) — this route is not wired to the ch17 approval workflow.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('liveops/:eventId/force-activate')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceActivate(
    @Param('eventId') eventId: string,
    @Body() body: ForceActivateBody | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<ActivateLiveOpsEventResult & { f3_deferred: true }> {
    if (!isResolvableLiveOpsEventId(eventId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown live-ops event id: ${JSON.stringify(eventId)}. Must be one of the 10 E-LO-* catalogue entries or a mounted event_reskin.`,
      });
    }

    const result = await this.liveOpsEventService.activateLiveOpsEvent(eventId, body?.filter);

    // ★ D5 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'CREATE',
      targetEntityType: 'live_ops_event_active',
      targetEntityId: result.liveOpsActiveId,
      beforeState: {},
      afterState: {
        eventId,
        cohortKey: result.cohortKey,
        targetedPlayerIds: result.targetedPlayerIds,
        appliedModifiers: result.appliedModifiers,
      },
    });

    // F3 DEFERRED marker — same precedent as PoliticalAdminController.forceActivate.
    return { ...result, f3_deferred: true };
  }

  /**
   * `POST /v1/admin/liveops/:activeId/deactivate-early`
   *
   * Live-ops action: revert a currently-ACTIVE activation before its scheduled `ends_at`. Calls the
   * REAL `LiveOpsEventService.deactivateLiveOpsEvent` — the SAME production revert method the real-clock
   * scheduler reconciler uses (C4/DD-B3): `revertLiveOpsEvent` (DELETE every `effect_modifier` row,
   * SERIALIZABLE) + ★ DD-B4 TRANSITION the `live_ops_event_active` row's `status` to the terminal
   * `'ENDED'` (NOT a DELETE — the row is RETAINED as activation-history so the cadence rule (b) still
   * counts it for the rest of its trailing real week) + `reloadNow` (same-tick overlay visibility).
   *
   * An `activeId` that is not currently `ACTIVE` (already ended, or never existed) → 404 (mirrors
   * `PoliticalAdminController.abortActive`'s own "not currently active" precheck — a no-op mutation is
   * never silently accepted/audited here).
   *
   * Returns: { liveOpsActiveId, revertedModifiers, endedActiveRow, f3_deferred: true, two_person_required }
   *
   * F3 two-person-rule DEFERRED (TD-107) — this route is not wired to the ch17 approval workflow.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   *
   * ★ 04e-C C4 (D2): also carries the INFORMATIONAL `two_person_required` marker (canon §5's stop-symmetry
   * note, `[extension hors GDD]` — kept advisory here too, `computeTwoPersonRequired`). The affected-count
   * is resolved against the row's own PERSISTED `targeting_filter` (schedule always sets it); a row
   * created via `forceActivate` instead (no `targeting_filter` column write) falls back to the catalogue
   * entry's own static `targeting`, mirroring `activateScheduledLiveOpsEvent`'s identical fallback
   * (`live-ops-event.service.ts:260`).
   */
  @Post('liveops/:activeId/deactivate-early')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async deactivateEarly(
    @Param('activeId') activeId: string,
    @Req() req: RequestWithAccount,
  ): Promise<DeactivateLiveOpsEventResult & { f3_deferred: true; two_person_required: boolean }> {
    const [existing] = await this.db
      .select({
        status: liveOpsEventActive.status,
        eventId: liveOpsEventActive.event_id,
        targetingFilter: liveOpsEventActive.targeting_filter,
      })
      .from(liveOpsEventActive)
      .where(eq(liveOpsEventActive.id, activeId));
    if (!existing || existing.status !== 'ACTIVE') {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `Live-ops activation '${activeId}' is not currently ACTIVE.`,
      });
    }

    const result = await this.liveOpsEventService.deactivateLiveOpsEvent(activeId);

    // ★ D5 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'live_ops_event_active',
      targetEntityId: activeId,
      beforeState: { status: 'ACTIVE' },
      afterState: { status: 'ENDED', revertedModifiers: result.revertedModifiers },
    });

    // ★ C4 (D2) — informational only, computed AFTER the revert (never gates it — see method doc).
    // Mirrors `activateScheduledLiveOpsEvent`'s identical fallback (`live-ops-event.service.ts:260`).
    const stopFilter = existing.targetingFilter ?? resolveLiveOpsEventById(existing.eventId).targeting;
    const twoPersonRequired = await this.computeTwoPersonRequired(existing.eventId, stopFilter);

    // F3 DEFERRED marker — same precedent as PoliticalAdminController.abortActive.
    return { ...result, f3_deferred: true, two_person_required: twoPersonRequired };
  }

  /**
   * `PUT /v1/admin/tunables/liveops`
   *
   * Live-ops tunable edit: upserts a `liveops.*` tunable override into the EXISTING `tunable_overrides`
   * table (the SAME mechanism every other admin controller uses — REUSE, never a new override path).
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: `LIVE_OPS_TUNABLE_CAPS` (live-ops.tunables.ts — 28 numeric keys). The 1 composite
   * string key (`aggression_score_bucket_thresholds`) has no numeric range and is NOT supported here
   * (same precedent as `PoliticalAdminController`/`MetaMarketAdminController`'s own composite-key
   * exclusion).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * Validation: unknown key → 422/VALIDATION_FAILED. Clamping: applied per the registered min/max range.
   *
   * REUSE pattern: MetaMarketAdminController.patchMetaMarketTunable / PoliticalAdminController.
   * patchPoliticalEventsTunable.
   * F3 two-person-rule DEFERRED (TD-107) — this route is not wired to the ch17 approval workflow.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/liveops')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchLiveOpsTunable(
    @Body() body: PatchTunableBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ key: string; clampedValue: number; f3_deferred: true }> {
    const { key, value } = body ?? {};
    const range = LIVE_OPS_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown liveops tunable key: '${key}'.`,
      });
    }

    // Apply BO cap (clampLiveOpsTunableToRange from tunables file — no inline literals, R2.3).
    const clampedValue = clampLiveOpsTunableToRange(key, Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'live-ops-admin-c8',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'live-ops-admin-c8',
        },
      });

    // ★ D5 audit — one admin_audit_log row per mutation (AdminAuditLogService, REUSE ch09). No
    // `targetEntityId` (a dotted tunable key is not a uuid) — the key travels in after_state instead.
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'liveops_tunable',
      beforeState: { key },
      afterState: { key, clampedValue },
    });

    // F3 DEFERRED marker — same precedent as MetaMarketAdminController.patchMetaMarketTunable.
    return { key, clampedValue, f3_deferred: true };
  }
}
