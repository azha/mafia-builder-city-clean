// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C0 (LiveOpsModule DI shell)
//             + C4 (★ activateLiveOpsEvent/deactivateLiveOpsEvent lifecycle)
//             + C5 (★ enforceCadenceLimits REAL — replaces the C4 stub call site)
//             + C7 (★ sendNotifications REAL — replaces the C4 sendNotificationsStub call site, D4/DD-B5)
//             + docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C4b (★ 2 resolver swaps —
//             `getLiveOpsEventById` → `resolveLiveOpsEventById`, design §3.6-B DD-RSK1)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §2 (architecture) + §3.2
//             (live_ops_event_active shape) + §5 (real-time scheduling) + §10 (error handling/degradation)
//             Architecture mirror: services/game-back/src/operational/political/political-event.service.ts (C0 DI-anchor-stub form)
//             + political-event-lifecycle.service.ts (activate/deactivate shared-call shape)
//             — 04e-B C0 — 2026-07-06
//             — 04e-B C4 — 2026-07-06 (activateLiveOpsEvent/deactivateLiveOpsEvent + C5/C7 stubs)
//             — 04e-B C5 — 2026-07-06 (★ enforceCadenceLimitsStub call site REPLACED by the real
//             `LiveOpsCadenceController.enforceCadenceLimits` — see live-ops-cadence-controller.ts)
//             — 04e-B C5/DD-B4 fix — 2026-07-06 (★ deactivateLiveOpsEvent's parent-row op changed from
//             DELETE to a terminal `status='ENDED'` UPDATE — decisions.md §2.3, migration 0115)
//             — 04e-B C7 — 2026-07-06 (★ sendNotificationsStub call site REPLACED by the real
//             `LiveOpsNotificationService.sendNotifications` — see live-ops-notification.service.ts +
//             decisions.md §2.4 DD-B5)
//             — 04g-D C4b — 2026-07-17 (★ ONE of the 5 allowlisted 04e files, plan §0.9/design §8: BOTH
//             `getLiveOpsEventById` call-sites below — `activateLiveOpsEvent`'s and
//             `activateScheduledLiveOpsEvent`'s, the LATTER being the exact site of the C0 §4.2 eternal-
//             `SCHEDULED` trap — now resolve through `resolveLiveOpsEventById` (catalogue-FIRST, then the
//             mounted-reskin store, `live-ops-mounted-event.store.ts`). BYTE-IDENTICAL for the 10 static
//             catalogue ids (same Map consulted first); a genuinely unknown id still throws the SAME
//             `Error`, still caught by the scheduler's own untouched per-row try/catch — the regression
//             stays closed. `getLiveOpsEventById`/`live-ops-event-catalogue.ts` are NOT edited.)
//
// `LiveOpsEventService` — C0 = EMPTY SCAFFOLD (DI-anchor stub only). C4 builds the REAL lifecycle; C5
// (this chunk) wires the REAL cadence gate into it:
//
//   activateLiveOpsEvent(eventId, filterOverride?) — plan §C4/§C5 order:
//     enforceCadenceLimits (★ C5 REAL — LiveOpsCadenceController.enforceCadenceLimits: max 3 simultaneous /
//       max 1 high-impact per real week / no chains — throws ApiError('RESOURCE_STATE_CONFLICT'|
//       'VALIDATION_FAILED') on rejection, BEFORE any read/write below, so a rejected activation inserts NO
//       live_ops_event_active row and applies NO effect_modifier — zero side effects)
//       -> evaluateCohortTargeting (C2, CohortTargetingService)
//       -> cohortKeyFor (C2)
//       -> INSERT live_ops_event_active (started_at/ends_at from LiveOpsClockPort.now(); ends_at =
//          started_at + durationRealDaysGetter() real days; NULL for E-LO-09 ONLY)
//       -> build the PLAYER-scoped EffectModifierInput[] (event.effects × the resolved PlayerId[];
//          GLOBAL effects get exactly ONE row, scope_ref=null — mirrors the C2/C3 activate-cohort test
//          hook's own established scope-branching)
//       -> EffectModifierService.applyLiveOpsEvent(liveOpsActiveId, modifiers) (DD-B2, C2 — skipped
//          entirely when modifiers is empty: E-LO-09 and every TD'd event's effects[] is [], honest —
//          never an empty no-op transaction)
//       -> await EffectOverlayStore.reloadNow() (same-tick visibility)
//       -> sendNotifications (C7 STUB — see below, currently sends NOTHING)
//
//   deactivateLiveOpsEvent(activeId) — the revert: EffectModifierService.revertLiveOpsEvent (DELETE every
//     effect_modifier row whose live_ops_active_event_id matches, SERIALIZABLE, C2 — already proven end-
//     to-end by the C2/C3 deactivate-cohort test hook) + ★ (DD-B4, C5-fix) TRANSITION the
//     live_ops_event_active parent row's status to 'ENDED' (NOT a DELETE anymore — the schema's own C2
//     header used to commit "revert = DELETE the row (row-present-means-active)"; DD-B4 supersedes that:
//     the row is RETAINED as a terminal activation-history record, mirroring political_event_active's own
//     permanent-ledger posture more closely than the old row-present-means-active contract) + await
//     EffectOverlayStore.reloadNow() (same-tick visibility, matching activate's own explicit call — never
//     rely solely on the async pg-LISTEN round-trip for a same-process E2E assertion). The children are
//     ALWAYS deleted before the parent transitions, so the parent never orphans a still-applied modifier
//     (revert-guarantee unchanged — decisions.md §2.3).
//
// C7 (★ REAL, this chunk): `sendNotificationsStub` is GONE — the call site now invokes the real
// `LiveOpsNotificationService.sendNotifications(event, targetedPlayerIds)` (live-ops-notification.service.ts,
// D4/DD-B5): per recipient, writes ONE `live_ops_notification` intent row IFF consent-class allows
// (SERVICE always; MARKETING iff the fail-closed `MarketingConsentPort` seam resolves opted-in) AND the
// per-player daily cap (`T.bo.push.daily_cap_per_player`) AND the per-(player, event) cooldown
// (`liveops.notification_cooldown_hours`) both allow it. E-LO-09 (`noticeCopy === null`) short-circuits
// to zero rows. Device push TRANSPORT stays TD (TD-177, docs_int/tech_debt_inventory.md — no FCM/APNs day-1) — the ledger + gate are the proven
// deliverable.
//
// C5 (★ REAL): `enforceCadenceLimitsStub` is GONE — the call site now invokes the real
// `LiveOpsCadenceController.enforceCadenceLimits(event)` (live-ops-cadence-controller.ts), injected below.
//
// Zero-regression invariant: purely ADDITIVE — no existing table, service, tick, or path is touched; the
// A1/A2 apply/revert methods (`applyEvent`/`revertEvent`/`revertExpired`) are byte-unchanged.
//
// Determinism: NO `Math.random()`, NO inline `Date.now()`/`new Date()` — `started_at`/`ends_at` are
// derived ENTIRELY from the injected `LiveOpsClockPort.now()` + the registered `durationRealDaysGetter()`.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { EffectOverlayStore } from '../../config/effect-overlay-store';
import { liveOpsEventActive } from '../../db/schema/live_ops_event_active';
import { EffectModifierService } from '../effect_engine/effect-modifier.service';
import type { EffectModifierInput } from '../effect_engine/effect-engine.types';
import { CohortTargetingService } from './cohort-targeting.service';
import { LiveOpsCadenceController } from './live-ops-cadence-controller';
import { LIVE_OPS_CLOCK, type LiveOpsClockPort } from './live-ops-clock.port';
import { LiveOpsNotificationService } from './live-ops-notification.service';
import { resolveLiveOpsEventById, type ResolvedLiveOpsEvent } from './live-ops-mounted-event.store';
import type { CohortTargetingFilter } from './live-ops.types';

/** Real-time-day → millisecond conversion (mirrors `citysim/unconformity/unconformity.service.ts`'s own
 *  `MS_PER_DAY` precedent) — `durationRealDaysGetter()` returns REAL days, never in-game days. */
const MS_PER_REAL_DAY = 24 * 60 * 60 * 1000;

/** The result of one `activateLiveOpsEvent` call. */
export interface ActivateLiveOpsEventResult {
  readonly liveOpsActiveId: string;
  readonly cohortKey: string;
  readonly targetedPlayerIds: readonly string[];
  readonly appliedModifiers: number;
}

/** The result of one `deactivateLiveOpsEvent` call. */
export interface DeactivateLiveOpsEventResult {
  readonly liveOpsActiveId: string;
  readonly revertedModifiers: number;
  /**
   * ★ DD-B4 (C5-fix, migration 0115) — renamed from `deletedActiveRow`: the parent
   * `live_ops_event_active` row is no longer DELETEd on revert, it TRANSITIONS to `status='ENDED'`.
   * `true` iff this call actually performed that ACTIVE→ENDED transition (the row existed and was still
   * ACTIVE); `false` on a no-op re-revert (row already ENDED, or the id never existed) — idempotent,
   * mirrors the old `deletedActiveRow` semantics ("did THIS call change something") without implying
   * deletion. No spec reads this field name today (grepped, confirmed) — a pure rename/repurpose.
   */
  readonly endedActiveRow: boolean;
}

@Injectable()
export class LiveOpsEventService {
  constructor(
    // applyLiveOpsEvent/revertLiveOpsEvent through the REAL, already-built A1 engine (no
    // re-implementation) — PLAYER-scope this time (D1), the first real per-player consumer.
    private readonly effectModifierService: EffectModifierService,
    // C2: evaluateCohortTargeting/cohortKeyFor (the predicate-cohort targeting engine).
    private readonly cohortTargetingService: CohortTargetingService,
    // C5: the REAL anti-FOMO cadence gate (max 3 simultaneous / max 1 high-impact per real week / no % allowed-mention: design comment naming the invariant, not narrative usage
    // chains) — replaces the C4 enforceCadenceLimitsStub call site.
    private readonly cadenceController: LiveOpsCadenceController,
    // DI anchor for the scheduler module graph (C4's LiveOpsSchedulerService is a SEPARATE consumer of
    // this same SchedulerModule DI graph — see live-ops.module.ts's own C4 correction note).
    private readonly scheduler: CitySimSchedulerService,
    // C7: the REAL sendNotifications gate (cap/cooldown/per-event consent-class, D4/DD-B5) — replaces
    // the C4 sendNotificationsStub call site.
    private readonly notificationService: LiveOpsNotificationService,
    // C2/C6/C7: live_ops_event_active / live_ops_aggression_ledger / live_ops_notification
    // repository reads/writes.
    @Inject(DB) private readonly db: DrizzleClient,
    // DD-B3: the injectable real-time seam — started_at/ends_at are derived from this, NEVER Date.now().
    @Inject(LIVE_OPS_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {}

  /** C0 boot-probe placeholder — proves the service constructed successfully (DI graph resolved). */
  ping(): { ok: true } {
    void this.scheduler;
    return { ok: true };
  }

  /**
   * `activateLiveOpsEvent` — the real lifecycle (plan §C4). `filterOverride` lets a caller (the C8 BO
   * force-trigger, or this chunk's test-only route) supply a live operator-chosen targeting filter
   * instead of the static catalogue's own `event.targeting` (the catalogue's own comment on E-LO-01/04:
   * "the specific region is an operator choice at BO force-trigger time, not a value baked into the
   * static catalogue").
   */
  async activateLiveOpsEvent(
    eventId: string,
    filterOverride?: CohortTargetingFilter,
  ): Promise<ActivateLiveOpsEventResult> {
    // ★ C4b — catalogue-first, then the mounted-reskin store (design §3.6-B DD-RSK1); still throws
    // loudly on a fabricated/typo'd id, byte-identical to the pre-C4b `getLiveOpsEventById` call for the
    // 10 static catalogue ids.
    const event: ResolvedLiveOpsEvent = resolveLiveOpsEventById(eventId);

    // ★ C5 REAL — the anti-FOMO cadence gate. Throws ApiError on rejection, BEFORE any read/write below % allowed-mention: design comment naming the invariant, not narrative usage
    // (targeting/INSERT/apply/reloadNow) — a rejected activation has ZERO side effects.
    await this.cadenceController.enforceCadenceLimits(event);

    const filter = filterOverride ?? event.targeting;
    const targetedPlayerIds = await this.cohortTargetingService.evaluateCohortTargeting(eventId, filter);
    const cohortKey = this.cohortTargetingService.cohortKeyFor(eventId, filter);

    const startedAt = this.clock.now();
    const endsAt = event.durationRealDaysGetter
      ? new Date(startedAt.getTime() + event.durationRealDaysGetter() * MS_PER_REAL_DAY)
      : null; // NULL for E-LO-09 ONLY (threshold-exit lifecycle, design §3.2/§5).

    const inserted = await this.db
      .insert(liveOpsEventActive)
      .values({
        event_id: eventId,
        category: event.category,
        cohort_key: cohortKey,
        high_impact: event.highImpact,
        started_at: startedAt,
        ends_at: endsAt,
        status: 'ACTIVE',
      })
      .returning({ id: liveOpsEventActive.id });
    const liveOpsActiveId = inserted[0]?.id;
    if (!liveOpsActiveId) {
      throw new Error(`activateLiveOpsEvent: live_ops_event_active row not found after insert (eventId=${eventId})`);
    }

    // PLAYER-scoped modifiers (D1) — GLOBAL effects (E-LO-02/07/E-LO-01's 2nd effect, ★ C3-corrected)
    // get exactly ONE row (scope_ref=null, matches unconditionally); every other scope gets one row PER
    // targeted player (scope_ref=playerId) — mirrors the C2/C3 activate-cohort test hook's own
    // established scope-branching verbatim. expiresAtGameDay is ALWAYS null (live-ops revert is
    // real-clock/CASCADE-driven, never the game-day revertExpired NIGHTLY sweep — effect-modifier.
    // service.ts's own C2 header note); appliedAtGameDay is a fixed sentinel (0, write-only/never-
    // queried column, live-ops has no single meaningful in-game-day axis).
    const modifiers: EffectModifierInput[] = event.effects.flatMap((effect): EffectModifierInput[] =>
      effect.scope === 'GLOBAL'
        ? [{
            scopeType: 'GLOBAL',
            scopeRef: null,
            tunableKey: effect.tunableKey,
            op: effect.op,
            magnitude: effect.magnitudeGetter(),
            appliedAtGameDay: 0,
            expiresAtGameDay: null,
          }]
        : targetedPlayerIds.map((playerId): EffectModifierInput => ({
            scopeType: effect.scope,
            scopeRef: playerId,
            tunableKey: effect.tunableKey,
            op: effect.op,
            magnitude: effect.magnitudeGetter(),
            appliedAtGameDay: 0,
            expiresAtGameDay: null,
          })),
    );

    // Honest, not fig-leafed: E-LO-09 (surface-only, canon "no state change") and every C3-TD'd event's
    // effects[] is [] — SKIP the apply entirely rather than calling applyLiveOpsEvent with an empty
    // batch (no spurious transaction/notify for an activation that genuinely applies zero levers).
    const appliedModifiers = modifiers.length > 0
      ? await this.effectModifierService.applyLiveOpsEvent(liveOpsActiveId, modifiers)
      : 0;

    await EffectOverlayStore.reloadNow(); // same-tick visibility (design §5/§C4).

    // ★ C7 REAL — see file header. Per recipient, writes ONE live_ops_notification intent row IFF
    // consent-class allows (SERVICE always; MARKETING iff the fail-closed MarketingConsentPort seam
    // resolves opted-in) AND the daily cap AND the cooldown both allow it. E-LO-09 (noticeCopy===null)
    // short-circuits to zero rows inside sendNotifications itself.
    await this.notificationService.sendNotifications(event, targetedPlayerIds);

    return { liveOpsActiveId, cohortKey, targetedPlayerIds, appliedModifiers };
  }

  /**
   * `activateScheduledLiveOpsEvent` — transitions a scheduled event (status='SCHEDULED') to active.
   * Runs the cadence checks and applies effects / sends notifications.
   */
  async activateScheduledLiveOpsEvent(activeId: string): Promise<ActivateLiveOpsEventResult> {
    const activeRow = await this.db
      .select()
      .from(liveOpsEventActive)
      .where(eq(liveOpsEventActive.id, activeId))
      .limit(1);

    if (activeRow.length === 0) {
      throw new Error(`activateScheduledLiveOpsEvent: scheduled event not found (activeId=${activeId})`);
    }

    const row = activeRow[0]!;
    if (row.status !== 'SCHEDULED') {
      throw new Error(`activateScheduledLiveOpsEvent: event is not in SCHEDULED status (activeId=${activeId}, status=${row.status})`);
    }

    // ★ C4b — THE site of the C0 §4.2 eternal-`SCHEDULED` trap (design §3.6-B DD-RSK1's own naming): a
    // mounted reskin's `event_id` now resolves here too (catalogue-first, then the store); a genuinely
    // unresolvable id still throws the SAME `Error`, still caught by `LiveOpsSchedulerService`'s own
    // untouched per-row try/catch (`live-ops-scheduler.service.ts:162-167`) — regression-tested,
    // `liveops_mounted_activation.spec.ts`.
    const event: ResolvedLiveOpsEvent = resolveLiveOpsEventById(row.event_id);

    // Enforce cadence limits
    await this.cadenceController.enforceCadenceLimits(event);

    // Resolve targeting
    const filter = row.targeting_filter ?? event.targeting;
    const targetedPlayerIds = await this.cohortTargetingService.evaluateCohortTargeting(row.event_id, filter);
    const cohortKey = this.cohortTargetingService.cohortKeyFor(row.event_id, filter);

    const startedAt = this.clock.now();
    const endsAt = event.durationRealDaysGetter
      ? new Date(startedAt.getTime() + event.durationRealDaysGetter() * MS_PER_REAL_DAY)
      : null;

    // Transition status to ACTIVE
    const updated = await this.db
      .update(liveOpsEventActive)
      .set({
        status: 'ACTIVE',
        started_at: startedAt,
        ends_at: endsAt,
        cohort_key: cohortKey,
      })
      .where(and(eq(liveOpsEventActive.id, activeId), eq(liveOpsEventActive.status, 'SCHEDULED')))
      .returning({ id: liveOpsEventActive.id });

    if (updated.length === 0) {
      throw new Error(`activateScheduledLiveOpsEvent: failed to update status to ACTIVE (activeId=${activeId})`);
    }

    // Build and apply modifiers
    const modifiers: EffectModifierInput[] = event.effects.flatMap((effect): EffectModifierInput[] =>
      effect.scope === 'GLOBAL'
        ? [{
            scopeType: 'GLOBAL',
            scopeRef: null,
            tunableKey: effect.tunableKey,
            op: effect.op,
            magnitude: effect.magnitudeGetter(),
            appliedAtGameDay: 0,
            expiresAtGameDay: null,
          }]
        : targetedPlayerIds.map((playerId): EffectModifierInput => ({
            scopeType: effect.scope,
            scopeRef: playerId,
            tunableKey: effect.tunableKey,
            op: effect.op,
            magnitude: effect.magnitudeGetter(),
            appliedAtGameDay: 0,
            expiresAtGameDay: null,
          })),
    );

    const appliedModifiers = modifiers.length > 0
      ? await this.effectModifierService.applyLiveOpsEvent(activeId, modifiers)
      : 0;

    await EffectOverlayStore.reloadNow();

    // Send notifications
    await this.notificationService.sendNotifications(event, targetedPlayerIds);

    return { liveOpsActiveId: activeId, cohortKey, targetedPlayerIds, appliedModifiers };
  }

  /**
   * `deactivateLiveOpsEvent` — the revert (plan §C4; ★ DD-B4/C5-fix, decisions.md §2.3):
   * `revertLiveOpsEvent` (DELETE every `effect_modifier` row for this activation, SERIALIZABLE, C2) +
   * TRANSITION the `live_ops_event_active` parent row's `status` to `'ENDED'` — NOT a DELETE anymore.
   * The row is RETAINED as a durable activation-history record (the schema's old "row present = active"
   * contract is superseded by DD-B4's "row present with a terminal status" contract) so the C5 cadence
   * rule (b) "max 1 high-impact per real week" still counts a fired-then-reverted high-impact activation
   * for the rest of its trailing real week (a DELETEd row used to silently drop out of that count).
   * The children are ALWAYS deleted BEFORE the parent transitions, so the parent transition never leaves
   * an orphaned still-applied modifier (revert-guarantee unchanged). The `UPDATE … WHERE status='ACTIVE'`
   * predicate (not just `WHERE id=$1`) makes the transition idempotent AND atomic under concurrent
   * MINUTE-firing double-sweeps: reverting an already-ENDED (or non-existent) id updates zero rows on
   * both sides (harmless no-op), matching `revertEvent`/`revertLiveOpsEvent`'s own established
   * idempotence — `endedActiveRow` reflects whether THIS call performed the ACTIVE→ENDED transition.
   */
  async deactivateLiveOpsEvent(activeId: string): Promise<DeactivateLiveOpsEventResult> {
    const revertedModifiers = await this.effectModifierService.revertLiveOpsEvent(activeId);

    const endedRows = await this.db
      .update(liveOpsEventActive)
      .set({ status: 'ENDED' })
      .where(and(eq(liveOpsEventActive.id, activeId), eq(liveOpsEventActive.status, 'ACTIVE')))
      .returning({ id: liveOpsEventActive.id });

    await EffectOverlayStore.reloadNow(); // same-tick visibility (mirrors activateLiveOpsEvent's own call).

    return {
      liveOpsActiveId: activeId,
      revertedModifiers,
      endedActiveRow: endedRows.length > 0,
    };
  }
}
