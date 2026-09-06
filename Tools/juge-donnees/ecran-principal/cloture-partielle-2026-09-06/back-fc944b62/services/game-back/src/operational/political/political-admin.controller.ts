// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C9 (BO — 5 endpoints
//             `requireStaffRole`, F3-deferred markers)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md §BO
//             Pattern: services/game-back/src/operational/meta_market/meta-market-admin.controller.ts
//             (the 3-GET-2-action 5-endpoint shape, F3-deferred markers) +
//             services/game-back/src/operational/internal_affairs/ia-admin.controller.ts (raw-DB-query BO reads).
//             TD-163 resolution: services/game-back/src/operational/political/political-event-lifecycle.service.ts
//             (`abortPermanentEvent` — the SAME ledger-stamp primitive `revertPermanentUntilElection`, C6, uses).
//             — 04e-A2 C9 — 2026-07-06
//
// `PoliticalAdminController` — BO production routes for the political event catalogue (G7).
//
// Routes (5 endpoints):
//   GET  /v1/admin/political-events/active         — role gm    — RAW currently-active ledger + modifier rows (P5 BO inversion)
//   GET  /v1/admin/political-events/forecast       — role gm    — next 90 in-game days' calendar-driven due dates + RAW effect magnitudes
//   POST /v1/admin/political-events/force-activate — role admin — F3 DEFERRED (TD)
//   POST /v1/admin/political-events/abort-active   — role admin — F3 DEFERRED (TD); TD-163 ledger-stamp (PERMANENT only)
//   PUT  /v1/admin/tunables/political_events        — role admin — F3 DEFERRED (TD)
//
// P5 BO INVERSION (R2.2): the player-facing calendar (`political.controller.ts`, C8) NEVER returns a raw
//   effect magnitude, an `expires_at_game_day`/`activated_at_game_day` timestamp, or a counter-play cost —
//   qualitative bands + direction ONLY. This controller is the P5-inverted sibling: gm/admin staff see the
//   REAL persisted `effect_modifier`/`political_event_active` rows (raw magnitude, raw timestamps) and the
//   REAL registered-getter magnitude a forecasted event WOULD apply if it fired today. Ops calibration
//   surface, never forwarded to players.
//
// F3 two-person-rule: DEFERRED (TD). Same precedent as MetaMarketAdminController / IAAdminController /
//   LegalAdminController. The 3 action endpoints are gated by `requireStaffRole('admin')` only until F3
//   (ch17 TwoPersonApproval) is implemented — each response carries `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via
//   `extractAccountFromAuthHeader` (server-side HS256 verification, `auth/staff-role.guard.ts`). A
//   `x-staff-role: gm` header WITHOUT a valid bearer token → 401. A valid PLAYER (or wrong-role STAFF)
//   token → 403.
//
// TD-163 (abort-active): `abort-active` is scoped to PERMANENT events ONLY (E-POL-04/E-POL-07, design
//   §3/L2 — "reverts only via explicit BO abort", the ONLY category canon/design ever describes an
//   explicit-BO-abort lifecycle for). It calls `PoliticalEventLifecycleService.abortPermanentEvent`
//   (revertEvent + `markEventActiveExpired` ledger stamp) — NEVER the bare `deactivate` (which deletes the
//   `effect_modifier` rows but leaves `political_event_active.expires_at_game_day` NULL forever, so
//   `countCurrentlyActive`/`isEventCurrentlyActive`/`findLiveActiveEventId` would keep counting the
//   already-dead activation toward `overlap_max_active` — the exact gap C6 fixed for E-POL-10/E-POL-12's
//   own election-boundary revert, flagged forward as TD-163 for this BO path). A TIMED event (still has a
//   real future expiry) is REJECTED (422) — it already reverts on schedule via `revertExpired`; this
//   endpoint does not (yet) support an early-abort of a timed event (out of the plan's TD-163 scope).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on).
// Registered in PoliticalModule.controllers (alongside conditional PoliticalEventTestController).

import { Body, Controller, Get, HttpCode, Inject, Post, Put, UseGuards } from '@nestjs/common';
import { eq, gt, isNull, or, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { politicalEventActive, effectModifier } from '../../db/schema/effect_modifier';
import { EffectOverlayStore } from '../../config/effect-overlay-store';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { politicalEventsTunables, POLITICAL_EVENTS_TUNABLE_CAPS } from '../effect_engine/effect-engine.tunables';
import { POLITICAL_TUNABLE_CAPS } from './political.tunables';
import { computeNextCalendarDueDays } from './political-trigger-evaluators';
import { POLITICAL_EVENT_BY_ID, getPoliticalEventById } from './political-event-catalogue';
import { PoliticalEventRepository } from './political-event.repository';
import { PoliticalEventLifecycleService } from './political-event-lifecycle.service';

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceActivateBody {
  eventId: string;
  scopeRef?: string | null;
}

interface AbortActiveBody {
  eventId: string;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Forecast window (BO — not a canon/registry magnitude, an ops query-shape constant; mirrors
// RECENTLY_ENDED_WINDOW_DAYS's own class of literal, political-event-read.service.ts's header note) ────

const FORECAST_WINDOW_DAYS = 90;

// ─── Merged tunable caps (33 A1 `politicalEventsTunables.*` keys + 5 NEW A2 `politicalTunables.*` keys) ─
//
// Two DIFFERENT registries (effect-engine.tunables.ts's 34-key A1 registry — MINUS the 1 non-numeric
// composite key, so 33 numeric — + political.tunables.ts's 5 NEW A2 keys) share the SAME
// `political_events.*` dotted namespace but live in 2 separate files (R2.3: A2 REUSES the A1 registry,
// never re-registers). The BO tunables-PATCH surface edits EITHER set through ONE endpoint — merged here
// (not via either module's OWN clamp function, which only knows its OWN half of the namespace and would
// silently no-op on a key from the OTHER half — a merged local map + clamp avoids that cross-module gap).

const POLITICAL_ADMIN_TUNABLE_CAPS: Record<string, { min: number; max: number }> = {
  ...POLITICAL_EVENTS_TUNABLE_CAPS,
  ...POLITICAL_TUNABLE_CAPS,
};

function clampPoliticalAdminTunable(key: string, value: number): number {
  const range = POLITICAL_ADMIN_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `PoliticalAdminController` — production BO routes for the political event catalogue (G7, 04e-A2 C9).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/political-events/active`, `/v1/admin/political-events/forecast`,
 * `/v1/admin/political-events/force-activate`, `/v1/admin/political-events/abort-active`,
 * `/v1/admin/tunables/political_events`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on.
 * Registered in PoliticalModule.controllers (alongside conditional PoliticalEventTestController).
 */
@Controller('admin')
export class PoliticalAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: PoliticalEventRepository,
    private readonly lifecycle: PoliticalEventLifecycleService,
  ) {}

  // ─── GET /admin/political-events/active — RAW active ledger + modifier rows (role `gm`) ───────────

  /**
   * `GET /v1/admin/political-events/active`
   *
   * P5 BO INVERSION: returns every `political_event_active` row CURRENTLY ACTIVE (the SAME
   * active-interval filter `PoliticalEventRepository.countCurrentlyActive` uses —
   * `expires_at_game_day IS NULL OR > gameDay`) WITH the raw ledger timestamps
   * (`activatedAtGameDay`/`expiresAtGameDay`, NEVER surfaced to players, R2.2) AND every REAL persisted
   * `effect_modifier` row it applied (raw `tunableKey`/`op`/`magnitude`/`scopeType`/`scopeRef` — the
   * ACTUAL value applied at activation time, not a re-derived current-registry preview).
   *
   * Returns: { gameDay: number, active: Array<{ activeEventId, eventId, category, activatedAtGameDay,
   *   expiresAtGameDay, isPermanent, modifiers: Array<{ tunableKey, op, magnitude, scopeType, scopeRef }> }> }
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('political-events/active')
  @UseGuards(requireStaffRole('gm'))
  async getActive() {
    const calendarState = await this.repo.readCalendarState();
    const gameDay = calendarState.lastEvaluatedGameDay ?? 0;

    const rows = await this.db
      .select({
        activeEventId: politicalEventActive.id,
        eventId: politicalEventActive.event_id,
        category: politicalEventActive.category,
        activatedAtGameDay: politicalEventActive.activated_at_game_day,
        expiresAtGameDay: politicalEventActive.expires_at_game_day,
        modifierTunableKey: effectModifier.tunable_key,
        modifierOp: effectModifier.op,
        modifierMagnitude: effectModifier.magnitude,
        modifierScopeType: effectModifier.scope_type,
        modifierScopeRef: effectModifier.scope_ref,
      })
      .from(politicalEventActive)
      .leftJoin(effectModifier, eq(effectModifier.active_event_id, politicalEventActive.id))
      .where(
        or(
          isNull(politicalEventActive.expires_at_game_day),
          gt(politicalEventActive.expires_at_game_day, gameDay),
        ),
      );

    // Group the flat JOIN rows by activeEventId (a variable number of effect_modifier rows per activation).
    const byActiveEventId = new Map<string, {
      activeEventId: string;
      eventId: string;
      category: string;
      activatedAtGameDay: number;
      expiresAtGameDay: number | null;
      isPermanent: boolean;
      modifiers: Array<{ tunableKey: string; op: string; magnitude: string; scopeType: string; scopeRef: string | null }>;
    }>();

    for (const row of rows) {
      let entry = byActiveEventId.get(row.activeEventId);
      if (!entry) {
        entry = {
          activeEventId: row.activeEventId,
          eventId: row.eventId,
          category: row.category,
          activatedAtGameDay: row.activatedAtGameDay,
          expiresAtGameDay: row.expiresAtGameDay,
          isPermanent: row.expiresAtGameDay === null,
          modifiers: [],
        };
        byActiveEventId.set(row.activeEventId, entry);
      }
      // LEFT JOIN with no modifier rows (should not happen in practice — applyEvent is atomic with
      // insertActiveEvent — but defensive against a partial/corrupt state) yields NULL modifier columns.
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

    return { gameDay, active: Array.from(byActiveEventId.values()) };
  }

  // ─── GET /admin/political-events/forecast — next 90 days RAW forecast (role `gm`) ─────────────────

  /**
   * `GET /v1/admin/political-events/forecast`
   *
   * The next `FORECAST_WINDOW_DAYS` (90) in-game days' worth of CALENDAR-driven due dates (E-POL-01
   * electoral, E-POL-02/03 budget — the ONLY 3 events canon gives a deterministically computable "next
   * date" for, `political-trigger-evaluators.ts computeNextCalendarDueDays`'s own header note; the other 9
   * state-driven/random events have no fabricatable forecast date, honest omission, mirrors C8's player
   * `upcoming` bucket). P5 BO INVERSION: unlike the player calendar's qualitative-direction-only `upcoming`
   * entries, this returns the RAW effect magnitude each forecasted event's REAL registered getter would
   * apply if it fired TODAY (an ops calibration preview, not a per-activation persisted value — contrast
   * with `getActive` above, which returns the ACTUAL applied value of a currently-live activation).
   *
   * Returns: { gameDay: number, windowDays: number, forecast: Array<{ eventId, name, category,
   *   scheduledGameDay, daysUntil, effects: Array<{ tunableKey, op, magnitude, scope }> }> }
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('political-events/forecast')
  @UseGuards(requireStaffRole('gm'))
  async getForecast() {
    const calendarState = await this.repo.readCalendarState();
    const gameDay = calendarState.lastEvaluatedGameDay ?? 0;

    const activeRows = await this.repo.listCurrentlyActive(gameDay);
    const activeEventIds = new Set(activeRows.map((row) => row.eventId));

    const dueDays = computeNextCalendarDueDays(gameDay, activeEventIds, {
      monthMinutes: politicalEventsTunables.monthMinutes,
      inGameDayLengthMinutes: citySimTunables.inGameDayLengthMinutes,
      electoralCycleInGameMonths: politicalEventsTunables.electoralCycleInGameMonths,
      budgetCycleInGameMonths: politicalEventsTunables.budgetCycleInGameMonths,
    });

    const windowEnd = gameDay + FORECAST_WINDOW_DAYS;
    const forecast = dueDays
      .filter((entry) => entry.scheduledGameDay <= windowEnd)
      .map((entry) => {
        const event = getPoliticalEventById(entry.eventId);
        return {
          eventId: event.eventId,
          name: event.name,
          category: event.category,
          scheduledGameDay: entry.scheduledGameDay,
          daysUntil: entry.scheduledGameDay - gameDay,
          effects: event.effects.map((effect) => ({
            tunableKey: effect.tunableKey,
            op: effect.op,
            magnitude: effect.magnitudeGetter(),
            scope: effect.scope,
          })),
        };
      });

    return { gameDay, windowDays: FORECAST_WINDOW_DAYS, forecast };
  }

  // ─── 3 action endpoints (role `admin`, F3 DEFERRED) ───────────────────────
  //
  // SAME-CALL overlay visibility (TD-339 resolution, debt lot fix/td339-admin-overlay-reload): `lifecycle.
  // activate`/`abortPermanentEvent` themselves never call `EffectOverlayStore.reloadNow()` — by design, the
  // CALLER owns that (`political-event-lifecycle.service.ts`'s own header doc: "this service does NOT
  // itself call reloadNow(); the CALLER does"). The production calendar-tick caller
  // (`PoliticalCalendarTickService`) honors this contract by batching a whole tick's writes THEN awaiting
  // `reloadNow()` ONCE (`political-calendar-tick.service.ts:471`); the test-only probe pair
  // (`PoliticalEventTestController.forceActivate`/`forceDeactivate`) was aligned to the SAME contract by
  // `fix/server-transport-and-overlay-race` (`political-event-test.controller.ts:519,542`). THIS
  // controller's two action endpoints below are EACH a standalone single-write caller exactly like that
  // test-only pair, and were the ONE caller left NOT honoring the contract — a real production gap, since
  // these are role-gated BO mutation routes, not test probes (flagged as TD-339 at that lot, closed here).
  // Fixed by awaiting `reloadNow()` after each lifecycle call, before responding — so a BO operator's very
  // next read (of a live lever, e.g. via any production getter `EffectOverlayStore.applyModifiers` wraps)
  // already reflects the shift, never racing the async pg_notify -> LISTEN -> reload round-trip
  // (`effect-overlay-store.ts:127`, the fire-and-forget notification handler). Proven with the same
  // injected-3s-delay falsifiability technique as the original diagnosis — see this lot's own commit
  // message for the before/after values.

  /**
   * `POST /v1/admin/political-events/force-activate`
   *
   * Live-ops action: force-activate a catalogue event TODAY (the REAL `political_calendar_state.
   * last_evaluated_game_day`, never a client-supplied day — a BO caller cannot backdate/future-date an
   * activation). Calls the REAL `PoliticalEventLifecycleService.activate` — the SAME production lifecycle
   * every trigger source (the calendar tick, C4/C5/C6) uses, never a re-implementation — then awaits
   * `EffectOverlayStore.reloadNow()` (same-call overlay visibility, TD-339, see the section doc above) so
   * a caller's very next read already observes the shift.
   *
   * Body: { eventId: string, scopeRef?: string | null } — scopeRef required for a DISTRICT-scoped event
   *   (E-POL-05/08/12), ignored (forced null) for a GLOBAL-scoped event (mirrors `activate`'s own contract).
   * Returns: { activeEventId, eventId, gameDay, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward, same
   * precedent as MetaMarketAdminController.forcePurge / IAAdminController.forceDiscovery).
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('political-events/force-activate')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async forceActivate(@Body() body: ForceActivateBody) {
    const { eventId, scopeRef } = body ?? {};
    if (!eventId || !POLITICAL_EVENT_BY_ID.has(eventId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown political event id: ${JSON.stringify(eventId)}. Must be one of E-POL-01..12.`,
      });
    }

    const calendarState = await this.repo.readCalendarState();
    const gameDay = calendarState.lastEvaluatedGameDay ?? 0;

    const event = getPoliticalEventById(eventId);
    const activeEventId = await this.lifecycle.activate(event, gameDay, scopeRef ?? null);
    await EffectOverlayStore.reloadNow();

    // F3 DEFERRED marker — same precedent as MetaMarketAdminController.forcePurge.
    return { activeEventId, eventId, gameDay, f3_deferred: true };
  }

  /**
   * `POST /v1/admin/political-events/abort-active`
   *
   * Live-ops action: explicitly abort a currently-active PERMANENT event (E-POL-04/E-POL-07, design
   * §3/L2 — the ONLY category canon ever describes an "explicit BO abort" lifecycle for). **TD-163
   * resolution**: calls `PoliticalEventLifecycleService.abortPermanentEvent` — the SAME ledger-stamp
   * primitive (`revertEvent` + `markEventActiveExpired`) `revertPermanentUntilElection` (C6) uses for
   * E-POL-10/E-POL-12's own election-boundary revert — NEVER the bare `deactivate` (which would leave the
   * aborted activation's `political_event_active` row counting toward `overlap_max_active` forever, since
   * its `expires_at_game_day` would stay NULL). Frees the cap slot from TODAY forward.
   *
   * A TIMED event (has a real, already-set future expiry — it will revert on schedule via
   * `EffectModifierService.revertExpired`) is REJECTED (422) — this endpoint's scope is the 2 canonical
   * PERMANENT events only, not a general early-abort tool for any timed event (out of the plan's TD-163
   * scope). An eventId not currently active → 404.
   *
   * Body: { eventId: string } — must be 'E-POL-04' or 'E-POL-07' (or any other event id — validated
   *   generically: unknown id → 422, a TIMED id → 422, a PERMANENT id with no live activation → 404).
   * Returns: { eventId, activeEventId, deletedCount, gameDay, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   * Awaits `EffectOverlayStore.reloadNow()` after the revert, before responding (same-call overlay
   * visibility, TD-339, see the section doc above) — the SYMMETRIC half of `force-activate`'s own fix.
   */
  @Post('political-events/abort-active')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async abortActive(@Body() body: AbortActiveBody) {
    const { eventId } = body ?? {};
    if (!eventId || !POLITICAL_EVENT_BY_ID.has(eventId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown political event id: ${JSON.stringify(eventId)}. Must be one of E-POL-01..12.`,
      });
    }

    const event = getPoliticalEventById(eventId);
    if (event.durationDaysGetter !== null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `'${eventId}' is a TIMED event (reverts on schedule via revertExpired) — ` +
          `abort-active only supports PERMANENT events (E-POL-04/E-POL-07, design §3/L2).`,
      });
    }

    const calendarState = await this.repo.readCalendarState();
    const gameDay = calendarState.lastEvaluatedGameDay ?? 0;

    const activeEventId = await this.repo.findLiveActiveEventId(eventId, gameDay);
    if (!activeEventId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `'${eventId}' is not currently active.` });
    }

    // TD-163: the ledger-stamp path (revertEvent + markEventActiveExpired), NEVER bare deactivate.
    const deletedCount = await this.lifecycle.abortPermanentEvent(activeEventId, gameDay);
    await EffectOverlayStore.reloadNow();

    // F3 DEFERRED marker — same precedent as MetaMarketAdminController.forcePurge.
    return { eventId, activeEventId, deletedCount, gameDay, f3_deferred: true };
  }

  /**
   * `PUT /v1/admin/tunables/political_events`
   *
   * Live-ops tunable edit: upserts a `political_events.*` tunable override into the `tunable_overrides`
   * table. The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: the 33 numeric A1 keys (`POLITICAL_EVENTS_TUNABLE_CAPS`, effect-engine.tunables.ts) +
   *   the 5 NEW A2 keys (`POLITICAL_TUNABLE_CAPS`, political.tunables.ts) — merged, `POLITICAL_ADMIN_
   *   TUNABLE_CAPS` above. The 1 composite string key (`epol11_bpd_memory_aggregate_trigger`) has no
   *   numeric range and is NOT supported here (same precedent as MetaMarketAdminController's string-key
   *   exclusion).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * Validation: unknown key → 422/VALIDATION_FAILED. Clamping: applied per the merged caps min/max range.
   *
   * REUSE pattern: MetaMarketAdminController.patchMetaMarketTunable / IAAdminController.patchIATunable.
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/political_events')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD carry-forward).
  @UseGuards(requireStaffRole('admin'))
  async patchPoliticalEventsTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body ?? {};
    const range = POLITICAL_ADMIN_TUNABLE_CAPS[key];
    if (!range) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown political_events tunable key: '${key}'.`,
      });
    }

    // Apply BO cap (merged clamp — no inline literals, R2.3).
    const clampedValue = clampPoliticalAdminTunable(key, Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'political-admin-c9',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'political-admin-c9',
        },
      });

    // F3 DEFERRED marker — same precedent as MetaMarketAdminController.patchMetaMarketTunable.
    return { key, clampedValue, f3_deferred: true };
  }
}
