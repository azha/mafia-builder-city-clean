// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C0 (boot probe) + C1 (catalogue read-back
//             probe) + C2 (schema + targeting + PLAYER-scope wiring probes) + C3 (lever/substrate audit probes)
//             + C6 (AggressionScoreBucket read-back probe) + C7 (MarketingConsentPort test seam, DD-B5)
//             Pattern: R-EC-2 test-only controller (mirrors political-event-test.controller.ts's C0/C1 form)
//             — 04e-B C0 — 2026-07-06
//             — 04e-B C1 — 2026-07-06 (catalogue + valid-tunable-keys + read-tunables probe routes added)
//             — 04e-B C2 — 2026-07-06 (seed-player/delete-player + evaluate-cohort + activate-cohort probe
//             routes added — the first real per-player A1 consumer wiring, DD-B2/D1)
//             — 04e-B C3 — 2026-07-06 (lever-audit read-back + deactivate-cohort revert probe routes added)
//             — 04e-B C4 — 2026-07-06 (activate/deactivate REAL lifecycle + scheduler-sweep + boot-reconcile
//             + clock set-now/advance/reset probe routes added)
//             — 04e-B C6 — 2026-07-06 (aggression-bucket read-back probe added — mirrors
//             political-event-test.controller.ts's own `evaluate-federal-task-force` read-back convention;
//             the E-LO-06 targeting predicate itself is proven via the ALREADY-EXISTING C2 `evaluate-cohort`
//             route, no new route needed for that half)
//             — 04e-B C7 — 2026-07-06 (consent/set-opted-in + consent/set-failing + consent/reset probe
//             routes added — DD-B5 §2.4, the EXACT `_test/liveops/clock/*` token-override-proof pattern
//             applied to the `MarketingConsentPort` seam)
//             — 04e-C C1 — 2026-07-09 (read-tunables extended with the 2 NEW `T.bo.liveops.*` composer
//             getters, `liveOpsBoComposerTunables.{eventDurationCapDays,estimatedAffectedRefreshSec}` —
//             R2.3/R9.3 reconcile of the WIP-landed mig 0118, plan §C1)
//             — 04e-C C3 — 2026-07-09 (★ `activate-scheduled` route ADDED — the un-swallowed direct call
//             to `activateScheduledLiveOpsEvent` the DD-C3 cadence-at-schedule falsifiable proof needs;
//             see its own doc comment below for the "why not just use run-scheduler-sweep" rationale)
//
// `LiveOpsTestController` — TEST-ONLY probe routes for `LiveOpsModule`.
// Mounted ONLY when NODE_ENV !== 'production' (R-EC-2, `testControllersEnabled()` gate).
//
// C0 routes:
//   GET /v1/_test/liveops/ping
//     → { ok: true } — proves LiveOpsModule is in the DI graph.
//   (URL segment "liveops", no hyphen — matches the design doc's own route convention,
//   `GET /v1/admin/liveops/active` etc., design §"Admin API".)
//
// C1 routes (10-event static catalogue read-back — plan C1, mirrors political-event-test.controller.ts's own
// C1 catalogue/valid-tunable-keys/read-new-tunables trio):
//   GET /v1/_test/liveops/catalogue
//     Returns the REAL `LIVE_OPS_EVENT_CATALOGUE` (live-ops-event-catalogue.ts) as a JSON-safe view: every
//     `magnitudeGetter`/`durationRealDaysGetter` is CALLED (not echoed as a function reference) — anti-
//     fabrication: reads REAL getter output. Used by `liveops_catalogue.spec.ts` to assert all 10 entries
//     present, valid category/template_id/consent_class, and (cross-referenced against `valid-tunable-keys`
//     below) that every effect's `tunableKey` resolves to a real registered key.
//
//   GET /v1/_test/liveops/valid-tunable-keys
//     Returns `LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS` (live-ops.tunables.ts) as a plain string array — the CLOSED
//     set of every REUSE A1 substrate key a catalogue effect may target. The spec asserts every `catalogue`
//     effect's `tunableKey` is a member — the anti-fig-leaf resolve-check (falsifiable: a fabricated/dangling
//     key would NOT be a member and would fail the spec's assertion, even though the entry compiles fine).
//
//   GET /v1/_test/liveops/read-tunables
//     Returns all 29 NEW `liveOpsTunables.*` getter values (live-ops.tunables.ts) PLUS (★ C7) the REUSE
//     `liveOpsBoPushTunables.pushDailyCapPerPlayer` getter, as a plain object. Used by
//     `liveops_catalogue.spec.ts` to assert value-sensitive defaults (not a `>0` truthiness check) AND to prove
//     a DB-override flip reflects through the REAL getter (mirrors `political_catalogue.spec.ts`'s C1-6
//     pattern) — anti-fabrication: reads REAL getter output, not a hardcoded echo.
//
// C2 routes (schema + targeting + PLAYER-scope wiring probe — migration 0114, design §3.2-§3.5):
//   POST /v1/_test/liveops/seed-player
//     Body: { tier?: number, regionId?: string }
//     Creates a test account + player with the given tier/region_id (defaults: tier=1, regionId=null) —
//     mirrors meta-market-test.controller.ts's seed-player but exposes tier/regionId directly so a spec
//     can seed players that DO/DO-NOT match a given CohortTargetingFilter.
//     → { playerId: string }
//
//   POST /v1/_test/liveops/delete-player
//     Body: { playerId: string }
//     Deletes the test player + account (cascade). Test cleanup.
//     → { deleted: true }
//
//   POST /v1/_test/liveops/evaluate-cohort
//     Body: { eventId: string, filter?: CohortTargetingFilter }
//     Calls the REAL `CohortTargetingService.evaluateCohortTargeting` + `cohortKeyFor` directly (no
//     schema write) — the standalone targeting-predicate proof `liveops_targeting.spec.ts` drives.
//     → { playerIds: string[], cohortKey: string }
//
//   POST /v1/_test/liveops/activate-cohort
//     Body: { eventId: string, category: string, filter?: CohortTargetingFilter, tunableKey: string,
//             op: string, magnitude: number|string, highImpact?: boolean, startedAt?: string (ISO),
//             endsAt?: string|null (ISO) }
//     The PLAYER-scope wiring test-hook (plan C2): resolves the cohort → INSERTs one
//     `live_ops_event_active` row → calls the REAL `EffectModifierService.applyLiveOpsEvent` with one
//     PLAYER-scoped modifier PER targeted player (`scope_ref = player_id`). Proves the DD-B2 dual-FK path
//     end-to-end. `appliedAtGameDay` is stamped as a fixed sentinel (0) — this shared column is write-only
//     (never read by any consumer, grepped) and live-ops has no single meaningful in-game-day axis (each
//     player runs their own city-sim clock); `expiresAtGameDay` is always `null` (live-ops revert is
//     real-clock/CASCADE-driven, never the game-day `revertExpired` NIGHTLY sweep — effect-modifier.service.ts's
//     own C2 header note).
//     → { liveOpsActiveId: string, cohortKey: string, targetedPlayerIds: string[], applied: number }
//
// Overlay-shift observability: after activate-cohort, a spec calls the SHARED
// `POST /v1/_test/effect-engine/apply-modifiers` (EffectEngineTestController) with the targeted
// `tunableKey`/base/`playerId` to read the composed value through the REAL `EffectOverlayStore`, and
// `POST /v1/_test/effect-engine/reload-now` for same-tick visibility — no new route duplicated here. The
// SHARED `GET /v1/_test/effect-engine/read-levers?districtId=&playerId=` calls the REAL production getters
// directly (the exact code path InspectionService/LaunderingService/CohesionService/PoliceMemoryService call
// at runtime) — this is what `liveops_lever_audit.spec.ts` uses to prove a WIRED event's effect is genuinely
// observable through its real consumer, not just the raw overlay probe.
//
// C3 routes (lever/substrate audit — plan C3, D2):
//   GET /v1/_test/liveops/lever-audit
//     Returns the REAL `LIVE_OPS_LEVER_AUDIT` + `LIVE_OPS_EVENT_VERDICT` (live-ops-lever-audit.ts) — the
//     committed, falsifiable C3 audit verdict table `liveops_lever_audit.spec.ts` asserts against directly.
//
//   POST /v1/_test/liveops/deactivate-cohort
//     Body: { liveOpsActiveId: string }
//     The revert half of the C2 `activate-cohort` test hook (C4's real `deactivateLiveOpsEvent` does not
//     exist yet — this chunk needs ONLY the revert-guarantee proof, not the full lifecycle service). Calls
//     the REAL `EffectModifierService.revertLiveOpsEvent(liveOpsActiveId)` — DELETE every `effect_modifier`
//     row whose `live_ops_active_event_id` matches (SERIALIZABLE) + notify — mirrors
//     `EffectEngineTestController`'s own `revert-event` probe, adapted for the live-ops sibling method (DD-B2).
//     → { deletedCount: number }
//
// C4 routes (REAL lifecycle + real-clock reconciler + the LIVE_OPS_CLOCK token-override proof):
//   POST /v1/_test/liveops/activate
//     Body: { eventId: string, filter?: CohortTargetingFilter }
//     Calls the REAL `LiveOpsEventService.activateLiveOpsEvent(eventId, filter)` — the full lifecycle
//     (cadence stub → targeting → INSERT live_ops_event_active → applyLiveOpsEvent → reloadNow →
//     notifications stub). → ActivateLiveOpsEventResult.
//
//   POST /v1/_test/liveops/deactivate
//     Body: { liveOpsActiveId: string }
//     Calls the REAL `LiveOpsEventService.deactivateLiveOpsEvent(liveOpsActiveId)`. → DeactivateLiveOpsEventResult.
//
//   POST /v1/_test/liveops/run-scheduler-sweep
//     Calls the REAL `LiveOpsSchedulerService.sweepExpiredEvents()` directly — the SAME method the
//     registered MINUTE/24 system and the boot reconciler both call — no bespoke test-only reimplementation.
//     → LiveOpsSweepResult.
//
//   POST /v1/_test/liveops/run-boot-reconcile
//     Calls the REAL `LiveOpsSchedulerService.onApplicationBootstrap()` again — re-invokes the ACTUAL
//     bootstrap hook (idempotent `registerSystem` + an immediate sweep), proving the crash-recovery path
//     genuinely runs, not a re-implementation of it (mirrors `EffectOverlayStore.init()`'s own
//     "no bespoke test-only reload path" precedent). → { ok: true }.
//
//   POST /v1/_test/liveops/clock/set-now — Body: { isoString: string }
//   POST /v1/_test/liveops/clock/advance-ms — Body: { ms: number }
//   POST /v1/_test/liveops/clock/reset
//     Mutate/restore the SAME `FakeLiveOpsClock` singleton instance `LIVE_OPS_CLOCK` resolves to in every
//     non-production environment (live-ops.module.ts, `useExisting`) — the token-override proof C0's own
//     review flagged (live-ops-clock.port.ts's own header comment has the full rationale). → { ok: true, now }.
//
// C6 routes (AggressionScoreBucket composite read-back — plan C6, D6):
//   GET /v1/_test/liveops/aggression-bucket?playerId=
//     Calls the REAL `AggressionScoreBucketService.countViolentOpsInWindow` + `getBucketForPlayer`
//     directly. Returns { violentOpsCount: number, bucket: AggressionScoreBucket }. R2.2: this raw-count
//     field is a TEST-ONLY diagnostic read-back (mirrors political-event-test.controller.ts's own
//     `rival-elimination-count` precedent) — never a player/BO-facing surface (none exists yet, C8/C9).
//     The E-LO-06 TARGETING predicate itself (bucket >= aggressive) is proven via the ALREADY-EXISTING C2
//     `POST /v1/_test/liveops/evaluate-cohort` route (`{ eventId: 'E-LO-06', filter: { aggression:
//     'aggressive' } }`) — no duplicate route needed.
//
// C7 routes (MarketingConsentPort test seam — DD-B5 §2.4, the EXACT `_test/liveops/clock/*` pattern):
//   POST /v1/_test/liveops/consent/set-opted-in — Body: { playerId: string }
//     Marks the given player genuinely opted-in on the SAME `FakeMarketingConsent` singleton
//     `MARKETING_CONSENT` resolves to in this environment. The load-bearing "MARKETING is real" proof —
//     `liveops_notifications.spec.ts` uses this to show a genuinely-opted-in player DOES receive a
//     MARKETING-class notification while a default (never-opted-in) player does NOT.
//
//   POST /v1/_test/liveops/consent/set-failing — Body: { failing: boolean }
//     Forces every subsequent `isMarketingOptedIn` call on the SAME singleton to REJECT — proves
//     DD-B5's "fail-closed on READ FAILURE" (distinct from "no consent on record") deterministically.
//
//   POST /v1/_test/liveops/consent/reset
//     Restores fail-closed-default behavior (empty opted-in set, not failing) — test cleanup, mirrors
//     `_test/liveops/clock/reset` so no opted-in state/forced failure leaks into a later spec sharing
//     the same E2E stack.

import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Inject, Post, Query } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { liveOpsEventActive, liveOpsEventCategory } from '../../db/schema/live_ops_event_active';
import { effectScope, effectModifierOp } from '../../db/schema/effect_modifier';
import { EffectModifierService } from '../effect_engine/effect-modifier.service';
import type { EffectModifierInput } from '../effect_engine/effect-engine.types';
import {
  LiveOpsEventService,
  type ActivateLiveOpsEventResult,
  type DeactivateLiveOpsEventResult,
} from './live-ops-event.service';
import { LiveOpsSchedulerService, type LiveOpsSweepResult } from './live-ops-scheduler.service';
import { FakeLiveOpsClock } from './live-ops-clock.port';
import { FakeMarketingConsent } from './marketing-consent.port';
import { CohortTargetingService } from './cohort-targeting.service';
import { LIVE_OPS_EVENT_CATALOGUE, LIVE_OPS_EVENT_IDS } from './live-ops-event-catalogue';
import { liveOpsTunables, liveOpsBoPushTunables, liveOpsBoComposerTunables, liveOpsBoTwoPersonTunables, LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS } from './live-ops.tunables';
import { LIVE_OPS_LEVER_AUDIT, LIVE_OPS_EVENT_VERDICT } from './live-ops-lever-audit';
import { AggressionScoreBucketService } from './aggression-score-bucket.service';
import type { CohortTargetingFilter, AggressionScoreBucket } from './live-ops.types';

// Local type aliases for enum casts in C2 routes (controller-only, mirrors
// effect-engine-test.controller.ts's EffectScopeEnumVal/PoliticalEventCategoryEnumVal pattern).
type EffectScopeEnumVal = (typeof effectScope.enumValues)[number];
type EffectModifierOpEnumVal = (typeof effectModifierOp.enumValues)[number];
type LiveOpsEventCategoryEnumVal = (typeof liveOpsEventCategory.enumValues)[number];

// Counter for unique C2 test callsigns (module-level, monotonically increasing — mirrors
// meta-market-test.controller.ts's nextRegionTestCallsign, kept short for player.callsign varchar(24)).
let _liveOpsTestCallsignCounter = 0;
function nextLiveOpsTestCallsign(): string {
  return `lop${Date.now().toString(36).slice(-8)}${(++_liveOpsTestCallsignCounter).toString(36)}`;
}

/**
 * Test-only probe controller for `LiveOpsModule`.
 *
 * All routes live under the `/v1/_test/liveops/` prefix.
 * Mounted conditionally by `LiveOpsModule` (only when `testControllersEnabled()`).
 *
 * @see testControllersEnabled (../../protocol/test-routes-gate)
 */
@Controller()
export class LiveOpsTestController {
  constructor(
    // C0 stub, C4 REAL: activateLiveOpsEvent/deactivateLiveOpsEvent lifecycle.
    private readonly liveOpsEventService: LiveOpsEventService,
    // C2: real per-player targeting + the DD-B2 live-ops apply/revert path.
    private readonly cohortTargetingService: CohortTargetingService,
    private readonly effectModifierService: EffectModifierService,
    // C4: the real-clock reconciler (sweepExpiredEvents) + boot reconciler (onApplicationBootstrap).
    private readonly liveOpsSchedulerService: LiveOpsSchedulerService,
    // C4: the SAME FakeLiveOpsClock singleton LIVE_OPS_CLOCK resolves to in this environment
    // (live-ops.module.ts's `useExisting` binding) — mutated ONLY from these gated test routes.
    private readonly fakeClock: FakeLiveOpsClock,
    // C6: the D6 AggressionScoreBucket composite read-back (windowed count + derived bucket).
    private readonly aggressionScoreBucketService: AggressionScoreBucketService,
    // C7: the SAME FakeMarketingConsent singleton MARKETING_CONSENT resolves to in this environment
    // (live-ops.module.ts's `useExisting` binding) — mutated ONLY from these gated test routes.
    private readonly fakeMarketingConsent: FakeMarketingConsent,
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  // ── C0 ──────────────────────────────────────────────────────────────────────────────────────

  /** C0 connectivity probe: returns { ok: true } if LiveOpsModule is in the DI graph. */
  @Get('_test/liveops/ping')
  ping(): { ok: true } {
    return this.liveOpsEventService.ping();
  }

  // ── C1 — 10-event static catalogue read-back ───────────────────────────────────────────────────

  /**
   * GET /v1/_test/liveops/catalogue
   *
   * Returns all 10 `LiveOpsEvent` entries, JSON-safe (every getter CALLED, not echoed). See file header.
   */
  @Get('_test/liveops/catalogue')
  catalogue(): ReadonlyArray<Record<string, unknown>> {
    return LIVE_OPS_EVENT_CATALOGUE.map((event) => ({
      eventId: event.eventId,
      name: event.name,
      category: event.category,
      templateId: event.templateId,
      targeting: event.targeting,
      isFixedDuration: event.durationRealDaysGetter !== null,
      durationRealDays: event.durationRealDaysGetter ? event.durationRealDaysGetter() : null,
      effects: event.effects.map((effect) => ({
        tunableKey: effect.tunableKey,
        op: effect.op,
        magnitude: effect.magnitudeGetter(),
        scope: effect.scope,
      })),
      highImpact: event.highImpact,
      pushConsentClass: event.pushConsentClass,
      noticeCopy: event.noticeCopy,
      counterPlayHintKey: event.counterPlayHintKey,
    }));
  }

  /** All 10 canonical event ids (catalogue order) — cheap coverage probe alongside `catalogue()`. */
  @Get('_test/liveops/event-ids')
  eventIds(): readonly string[] {
    return LIVE_OPS_EVENT_IDS;
  }

  /**
   * GET /v1/_test/liveops/valid-tunable-keys
   *
   * Returns the closed set of real registered tunable keys a catalogue effect may target. See file header.
   */
  @Get('_test/liveops/valid-tunable-keys')
  validTunableKeys(): readonly string[] {
    return Array.from(LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS);
  }

  /**
   * GET /v1/_test/liveops/read-tunables
   *
   * Returns all 29 NEW `liveOpsTunables.*` getter values, PLUS (★ C7) the REUSE `T.bo.push.*` getter
   * `liveOpsBoPushTunables.pushDailyCapPerPlayer`, PLUS (★ 04e-C C1) the REUSE `T.bo.liveops.*` getters
   * `liveOpsBoComposerTunables.{eventDurationCapDays,estimatedAffectedRefreshSec}`, PLUS (★ 04e-C C4)
   * the REUSE `T.bo.twoperson.*` getter `liveOpsBoTwoPersonTunables.massCohortThreshold` — a
   * side-effect-free poll target for `liveops_notifications.spec.ts`'s cap value-sensitivity proof,
   * `liveops_composer_tunables.spec.ts`'s (04e-C C1) value-sensitivity proof, and
   * `liveops_composer_page2.spec.ts`'s (04e-C C4) two-person threshold-flip proof (mirrors this route's
   * own established "poll read-tunables until the override propagates, THEN perform the one
   * assertion-bearing action" pattern, e.g. `liveops_cadence.spec.ts`'s C5-3a/C5-3c).
   */
  @Get('_test/liveops/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      maxActiveSimultaneous: liveOpsTunables.maxActiveSimultaneous,
      maxHighImpactPerWeek: liveOpsTunables.maxHighImpactPerWeek,
      notificationCooldownHours: liveOpsTunables.notificationCooldownHours,
      compressionPrepThreshold: liveOpsTunables.compressionPrepThreshold,
      compressionPrepExitThreshold: liveOpsTunables.compressionPrepExitThreshold,
      elo01CrackdownDurationRealDays: liveOpsTunables.elo01CrackdownDurationRealDays,
      elo01CrackdownBpdMultiplier: liveOpsTunables.elo01CrackdownBpdMultiplier,
      elo01CrackdownMisMultiplier: liveOpsTunables.elo01CrackdownMisMultiplier,
      elo02DockStrikeDurationRealDays: liveOpsTunables.elo02DockStrikeDurationRealDays,
      elo02DockStrikeBaselineMultiplier: liveOpsTunables.elo02DockStrikeBaselineMultiplier,
      elo03CoilCampaignDurationRealDays: liveOpsTunables.elo03CoilCampaignDurationRealDays,
      elo03CoilLekContestRateMultiplier: liveOpsTunables.elo03CoilLekContestRateMultiplier,
      elo03CoilRegimePressureMultiplier: liveOpsTunables.elo03CoilRegimePressureMultiplier,
      elo04MarketAnomalyDurationRealDays: liveOpsTunables.elo04MarketAnomalyDurationRealDays,
      elo04SubstanceDemandShiftMultiplier: liveOpsTunables.elo04SubstanceDemandShiftMultiplier,
      elo05GlassInvestorDayDurationRealDays: liveOpsTunables.elo05GlassInvestorDayDurationRealDays,
      elo05GlassLaunderingYieldMultiplier: liveOpsTunables.elo05GlassLaunderingYieldMultiplier,
      elo05GlassAuditPinHalfLifeMultiplier: liveOpsTunables.elo05GlassAuditPinHalfLifeMultiplier,
      elo06RivalCounterOpDurationRealDays: liveOpsTunables.elo06RivalCounterOpDurationRealDays,
      elo06RetaliationAggressivenessMultiplier: liveOpsTunables.elo06RetaliationAggressivenessMultiplier,
      elo06AggressionThresholdViolentOpsCount: liveOpsTunables.elo06AggressionThresholdViolentOpsCount,
      elo06AggressionThresholdWindowDays: liveOpsTunables.elo06AggressionThresholdWindowDays,
      elo07CohesionThawDurationRealDays: liveOpsTunables.elo07CohesionThawDurationRealDays,
      elo07CohesionRecoveryMultiplier: liveOpsTunables.elo07CohesionRecoveryMultiplier,
      elo08SaltlineSurplusDurationRealDays: liveOpsTunables.elo08SaltlineSurplusDurationRealDays,
      elo08SaltlinePoolMultiplier: liveOpsTunables.elo08SaltlinePoolMultiplier,
      elo08SaltlineRecruitmentCostMultiplier: liveOpsTunables.elo08SaltlineRecruitmentCostMultiplier,
      elo10StructuralAuditDurationRealDays: liveOpsTunables.elo10StructuralAuditDurationRealDays,
      aggressionScoreBucketThresholds: liveOpsTunables.aggressionScoreBucketThresholds,
      pushDailyCapPerPlayer: liveOpsBoPushTunables.pushDailyCapPerPlayer,
      eventDurationCapDays: liveOpsBoComposerTunables.eventDurationCapDays,
      estimatedAffectedRefreshSec: liveOpsBoComposerTunables.estimatedAffectedRefreshSec,
      massCohortThreshold: liveOpsBoTwoPersonTunables.massCohortThreshold,
    };
  }

  // ── C2 — schema + targeting + PLAYER-scope wiring probes ───────────────────────────────────────

  /**
   * POST /v1/_test/liveops/seed-player
   *
   * Creates a test account + player with the given `tier`/`regionId` (defaults: tier=1,
   * regionId=null) — mirrors `meta-market-test.controller.ts`'s `seed-player` but exposes
   * tier/regionId directly so a spec can seed players that DO/DO-NOT match a given
   * `CohortTargetingFilter` (`liveops_targeting.spec.ts`).
   */
  @Post('_test/liveops/seed-player')
  @HttpCode(201)
  async seedPlayer(@Body() body: { tier?: number; regionId?: string }): Promise<{ playerId: string }> {
    const { tier, regionId } = body ?? {};

    const accountRows = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const accountId = accountRows[0]!.account_id;

    const callsign = nextLiveOpsTestCallsign();
    const playerRows = await this.db
      .insert(player)
      .values({
        account_id: accountId,
        callsign,
        email: `${callsign}@lop-test.invalid`,
        locale: 'en',
        tier: tier ?? 1,
        region_id: regionId ?? null,
      })
      .returning({ player_id: player.player_id });

    return { playerId: playerRows[0]!.player_id };
  }

  /**
   * POST /v1/_test/liveops/delete-player
   *
   * Deletes the test player + account (cascade). Test cleanup.
   */
  @Post('_test/liveops/delete-player')
  @HttpCode(200)
  async deletePlayer(@Body() body: { playerId?: string }): Promise<{ deleted: true }> {
    const { playerId } = body ?? {};
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select({ account_id: player.account_id })
      .from(player)
      .where(eq(player.player_id, playerId));
    const accountId = rows[0]?.account_id;

    await this.db.delete(player).where(eq(player.player_id, playerId));
    if (accountId) {
      await this.db.delete(account).where(eq(account.account_id, accountId));
    }
    return { deleted: true };
  }

  /**
   * POST /v1/_test/liveops/evaluate-cohort
   *
   * Calls the REAL `CohortTargetingService.evaluateCohortTargeting` + `cohortKeyFor` directly (no
   * schema write) — the standalone targeting-predicate proof `liveops_targeting.spec.ts` drives.
   */
  @Post('_test/liveops/evaluate-cohort')
  @HttpCode(200)
  async evaluateCohort(
    @Body() body: { eventId?: string; filter?: CohortTargetingFilter },
  ): Promise<{ playerIds: string[]; cohortKey: string }> {
    const { eventId, filter } = body ?? {};
    if (!eventId) {
      throw new HttpException('eventId required', HttpStatus.BAD_REQUEST);
    }
    const resolvedFilter = filter ?? {};

    const playerIds = await this.cohortTargetingService.evaluateCohortTargeting(eventId, resolvedFilter);
    const cohortKey = this.cohortTargetingService.cohortKeyFor(eventId, resolvedFilter);
    return { playerIds, cohortKey };
  }

  /**
   * POST /v1/_test/liveops/activate-cohort
   *
   * The PLAYER-scope wiring test-hook (plan C2, D1's first real per-player A1 consumer): resolves the
   * cohort → INSERTs one `live_ops_event_active` row → calls the REAL
   * `EffectModifierService.applyLiveOpsEvent` with one PLAYER-scoped modifier PER targeted player
   * (`scope_ref = player_id`). Proves the DD-B2 dual-FK path end-to-end.
   */
  @Post('_test/liveops/activate-cohort')
  @HttpCode(201)
  async activateCohort(@Body() body: {
    eventId?: string;
    category?: string;
    filter?: CohortTargetingFilter;
    tunableKey?: string;
    op?: string;
    magnitude?: number | string;
    highImpact?: boolean;
    startedAt?: string;
    endsAt?: string | null;
    // ★ C3 addition — scope override (default 'PLAYER', BYTE-IDENTICAL to the pre-C3 behavior for every
    // existing caller that omits it, e.g. liveops_targeting.spec.ts's own C2 assertions). 'GLOBAL' inserts
    // ONE modifier row (scope_ref = null) instead of one-per-targeted-player — needed to test-drive the C3
    // audit's GLOBAL-scoped WIRED events (E-LO-01's 2nd effect, E-LO-02, E-LO-07), which the pre-C3 hook
    // could not express (it only ever built PLAYER rows).
    scope?: 'PLAYER' | 'GLOBAL';
  }): Promise<{
    liveOpsActiveId: string;
    cohortKey: string;
    targetedPlayerIds: string[];
    applied: number;
  }> {
    const {
      eventId, category, filter, tunableKey, op, magnitude, highImpact, startedAt, endsAt, scope,
    } = body ?? {};

    if (!eventId || !category || !tunableKey || !op || magnitude === undefined) {
      throw new HttpException(
        'eventId, category, tunableKey, op, magnitude required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resolvedFilter = filter ?? {};
    const targetedPlayerIds = await this.cohortTargetingService.evaluateCohortTargeting(eventId, resolvedFilter);
    const cohortKey = this.cohortTargetingService.cohortKeyFor(eventId, resolvedFilter);

    const inserted = await this.db
      .insert(liveOpsEventActive)
      .values({
        event_id: eventId,
        category: category as LiveOpsEventCategoryEnumVal,
        cohort_key: cohortKey,
        high_impact: highImpact ?? false,
        started_at: startedAt ? new Date(startedAt) : new Date(),
        ends_at: endsAt ? new Date(endsAt) : null,
        status: 'ACTIVE',
      })
      .returning({ id: liveOpsEventActive.id });
    const liveOpsActiveId = inserted[0]?.id;
    if (!liveOpsActiveId) {
      throw new HttpException(
        'live_ops_event_active row not found after insert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // PLAYER-scope (default, unchanged since C2): one modifier per targeted player (scope_ref = player_id,
    // D1). GLOBAL (★ C3): exactly ONE modifier row, scope_ref = null (GLOBAL matches unconditionally — no
    // per-player differentiation, mirrors E-LO-07/E-LO-01-effect-2/E-LO-02's corrected catalogue scope).
    // expiresAtGameDay is ALWAYS null (live-ops revert is real-clock/CASCADE-driven, never the game-day
    // revertExpired sweep — effect-modifier.service.ts's own C2 header note). appliedAtGameDay is a fixed
    // sentinel (0) — the shared column is write-only/never-queried (grepped) and live-ops has no single
    // meaningful in-game-day axis.
    const modifiers: EffectModifierInput[] = scope === 'GLOBAL'
      ? [{
          scopeType: 'GLOBAL' as EffectScopeEnumVal,
          scopeRef: null,
          tunableKey,
          op: op as EffectModifierOpEnumVal,
          magnitude,
          appliedAtGameDay: 0,
          expiresAtGameDay: null,
        }]
      : targetedPlayerIds.map((playerId) => ({
          scopeType: 'PLAYER' as EffectScopeEnumVal,
          scopeRef: playerId,
          tunableKey,
          op: op as EffectModifierOpEnumVal,
          magnitude,
          appliedAtGameDay: 0,
          expiresAtGameDay: null,
        }));

    const applied = await this.effectModifierService.applyLiveOpsEvent(liveOpsActiveId, modifiers);

    return { liveOpsActiveId, cohortKey, targetedPlayerIds, applied };
  }

  // ── C3 — lever/substrate audit probes ──────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/liveops/lever-audit
   *
   * Returns the REAL committed `LIVE_OPS_LEVER_AUDIT` (per-sub-effect) + `LIVE_OPS_EVENT_VERDICT`
   * (per-event rollup) from `live-ops-lever-audit.ts` — the C3 audit verdict table
   * `liveops_lever_audit.spec.ts` asserts against. See file header.
   */
  @Get('_test/liveops/lever-audit')
  leverAudit(): { entries: typeof LIVE_OPS_LEVER_AUDIT; eventVerdicts: typeof LIVE_OPS_EVENT_VERDICT } {
    return { entries: LIVE_OPS_LEVER_AUDIT, eventVerdicts: LIVE_OPS_EVENT_VERDICT };
  }

  /**
   * POST /v1/_test/liveops/deactivate-cohort
   *
   * The revert half of `activate-cohort` (C4's real `deactivateLiveOpsEvent` lifecycle service does not
   * exist yet — C3 needs only the revert-guarantee proof). Calls the REAL
   * `EffectModifierService.revertLiveOpsEvent(liveOpsActiveId)` — DELETE every `effect_modifier` row whose
   * `live_ops_active_event_id` matches (SERIALIZABLE) + notify. See file header.
   */
  @Post('_test/liveops/deactivate-cohort')
  @HttpCode(200)
  async deactivateCohort(@Body() body: { liveOpsActiveId?: string }): Promise<{ deletedCount: number }> {
    const { liveOpsActiveId } = body ?? {};
    if (!liveOpsActiveId) {
      throw new HttpException('liveOpsActiveId required', HttpStatus.BAD_REQUEST);
    }
    const deletedCount = await this.effectModifierService.revertLiveOpsEvent(liveOpsActiveId);
    return { deletedCount };
  }

  // ── C4 — REAL lifecycle + real-clock reconciler + clock token-override probes ─────────────────────

  /**
   * POST /v1/_test/liveops/activate
   *
   * Calls the REAL `LiveOpsEventService.activateLiveOpsEvent(eventId, filter)` — the full lifecycle
   * (C5 cadence stub → targeting → INSERT live_ops_event_active → applyLiveOpsEvent → reloadNow → C7
   * notifications stub). See file header.
   */
  @Post('_test/liveops/activate')
  @HttpCode(201)
  async activate(
    @Body() body: { eventId?: string; filter?: CohortTargetingFilter },
  ): Promise<ActivateLiveOpsEventResult> {
    const { eventId, filter } = body ?? {};
    if (!eventId) {
      throw new HttpException('eventId required', HttpStatus.BAD_REQUEST);
    }
    return await this.liveOpsEventService.activateLiveOpsEvent(eventId, filter);
  }

  /**
   * POST /v1/_test/liveops/deactivate
   *
   * Calls the REAL `LiveOpsEventService.deactivateLiveOpsEvent(liveOpsActiveId)`. See file header.
   */
  @Post('_test/liveops/deactivate')
  @HttpCode(200)
  async deactivate(
    @Body() body: { liveOpsActiveId?: string },
  ): Promise<DeactivateLiveOpsEventResult> {
    const { liveOpsActiveId } = body ?? {};
    if (!liveOpsActiveId) {
      throw new HttpException('liveOpsActiveId required', HttpStatus.BAD_REQUEST);
    }
    return await this.liveOpsEventService.deactivateLiveOpsEvent(liveOpsActiveId);
  }

  /**
   * POST /v1/_test/liveops/activate-scheduled — ★ 04e-C C3 (DD-C3 cadence-at-schedule falsifiable proof)
   *
   * Calls the REAL `LiveOpsEventService.activateScheduledLiveOpsEvent(activeId)` DIRECTLY — the EXACT
   * SAME production method `LiveOpsSchedulerService.sweepExpiredEvents()`'s `dueScheduled` loop calls —
   * but WITHOUT that loop's own defensive per-row `try/catch` (live-ops-scheduler.service.ts:162-167,
   * which swallows a cadence-gate `ApiError` and only logs a warning, by design, so one bad row can never
   * block the sweep's other rows). That swallow makes a rejected SCHEDULED→ACTIVE transition invisible at
   * the HTTP layer through `run-scheduler-sweep` alone (the row just silently stays `SCHEDULED` forever).
   * This route calls the SAME method un-swallowed, so a cadence rejection propagates as a REAL `ApiError`
   * → HTTP 409 through the standard `GlobalExceptionFilter` conversion — mirroring `/_test/liveops/
   * activate`'s own established "direct call, let ApiError propagate" pattern for the non-scheduled path
   * (`liveops_cadence.spec.ts`'s C5 suite). Production behavior is UNCHANGED — this is an ADDITIVE,
   * gated (`testControllersEnabled()`) probe route, never called by any production code path.
   */
  @Post('_test/liveops/activate-scheduled')
  @HttpCode(200)
  async activateScheduled(
    @Body() body: { activeId?: string },
  ): Promise<ActivateLiveOpsEventResult> {
    const { activeId } = body ?? {};
    if (!activeId) {
      throw new HttpException('activeId required', HttpStatus.BAD_REQUEST);
    }
    return await this.liveOpsEventService.activateScheduledLiveOpsEvent(activeId);
  }

  /**
   * POST /v1/_test/liveops/run-scheduler-sweep
   *
   * Calls the REAL `LiveOpsSchedulerService.sweepExpiredEvents()` directly — the SAME method the
   * registered MINUTE/24 system and the boot reconciler both call. See file header.
   */
  @Post('_test/liveops/run-scheduler-sweep')
  @HttpCode(200)
  async runSchedulerSweep(): Promise<LiveOpsSweepResult> {
    return await this.liveOpsSchedulerService.sweepExpiredEvents();
  }

  /**
   * POST /v1/_test/liveops/run-boot-reconcile
   *
   * Calls the REAL `LiveOpsSchedulerService.onApplicationBootstrap()` again — re-invokes the ACTUAL
   * bootstrap hook (crash-recovery proof). See file header.
   */
  @Post('_test/liveops/run-boot-reconcile')
  @HttpCode(200)
  async runBootReconcile(): Promise<{ ok: true }> {
    await this.liveOpsSchedulerService.onApplicationBootstrap();
    return { ok: true };
  }

  /**
   * POST /v1/_test/liveops/clock/set-now — Body: { isoString: string }
   *
   * Pins the SAME `FakeLiveOpsClock` singleton `LIVE_OPS_CLOCK` resolves to (the token-override proof).
   */
  @Post('_test/liveops/clock/set-now')
  @HttpCode(200)
  setClockNow(@Body() body: { isoString?: string }): { ok: true; now: string } {
    const { isoString } = body ?? {};
    if (!isoString) {
      throw new HttpException('isoString required', HttpStatus.BAD_REQUEST);
    }
    this.fakeClock.setNow(new Date(isoString));
    return { ok: true, now: this.fakeClock.now().toISOString() };
  }

  /**
   * POST /v1/_test/liveops/clock/advance-ms — Body: { ms: number }
   *
   * Advances the SAME `FakeLiveOpsClock` singleton by `ms` milliseconds (deterministic — no wall-clock wait).
   */
  @Post('_test/liveops/clock/advance-ms')
  @HttpCode(200)
  advanceClock(@Body() body: { ms?: number }): { ok: true; now: string } {
    const { ms } = body ?? {};
    if (ms === undefined) {
      throw new HttpException('ms required', HttpStatus.BAD_REQUEST);
    }
    this.fakeClock.advanceByMs(ms);
    return { ok: true, now: this.fakeClock.now().toISOString() };
  }

  /**
   * POST /v1/_test/liveops/clock/reset
   *
   * Restores real-wall-clock behavior — test cleanup, never leaks a pinned instant into a later,
   * unrelated spec sharing the same E2E stack.
   */
  @Post('_test/liveops/clock/reset')
  @HttpCode(200)
  resetClock(): { ok: true } {
    this.fakeClock.reset();
    return { ok: true };
  }

  // ── C6 — AggressionScoreBucket composite read-back ─────────────────────────────────────────────

  /**
   * GET /v1/_test/liveops/aggression-bucket?playerId=
   *
   * Calls the REAL `AggressionScoreBucketService.countViolentOpsInWindow` + `getBucketForPlayer`
   * directly. R2.2: `violentOpsCount` is a TEST-ONLY diagnostic field (mirrors
   * political-event-test.controller.ts's own `rival-elimination-count` precedent) — never a
   * player/BO-facing surface (none exists yet, C8/C9).
   */
  @Get('_test/liveops/aggression-bucket')
  async aggressionBucket(
    @Query('playerId') playerId: string,
  ): Promise<{ violentOpsCount: number; bucket: AggressionScoreBucket }> {
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    const violentOpsCount = await this.aggressionScoreBucketService.countViolentOpsInWindow(playerId);
    const bucket = await this.aggressionScoreBucketService.getBucketForPlayer(playerId);
    return { violentOpsCount, bucket };
  }

  // ── C7 — MarketingConsentPort test seam (DD-B5 §2.4) ────────────────────────────────────────────

  /**
   * POST /v1/_test/liveops/consent/set-opted-in — Body: { playerId: string }
   *
   * Marks the given player genuinely opted-in on the SAME `FakeMarketingConsent` singleton
   * `MARKETING_CONSENT` resolves to in every non-production environment (the token-override proof,
   * mirrors `_test/liveops/clock/*`). See file header.
   */
  @Post('_test/liveops/consent/set-opted-in')
  @HttpCode(200)
  setConsentOptedIn(@Body() body: { playerId?: string }): { ok: true } {
    const { playerId } = body ?? {};
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    this.fakeMarketingConsent.setOptedIn(playerId);
    return { ok: true };
  }

  /**
   * POST /v1/_test/liveops/consent/set-failing — Body: { failing: boolean }
   *
   * Forces every subsequent `isMarketingOptedIn` call on the SAME singleton to REJECT — proves DD-B5's
   * "fail-closed on READ FAILURE" (distinct from "no consent on record") deterministically.
   */
  @Post('_test/liveops/consent/set-failing')
  @HttpCode(200)
  setConsentFailing(@Body() body: { failing?: boolean }): { ok: true } {
    const { failing } = body ?? {};
    if (failing === undefined) {
      throw new HttpException('failing required', HttpStatus.BAD_REQUEST);
    }
    this.fakeMarketingConsent.setFailing(failing);
    return { ok: true };
  }

  /**
   * POST /v1/_test/liveops/consent/reset
   *
   * Restores fail-closed-default behavior (empty opted-in set, not failing) — test cleanup, never leaks
   * opted-in state or a forced failure into a later, unrelated spec sharing the same E2E stack.
   */
  @Post('_test/liveops/consent/reset')
  @HttpCode(200)
  resetConsent(): { ok: true } {
    this.fakeMarketingConsent.reset();
    return { ok: true };
  }
}
