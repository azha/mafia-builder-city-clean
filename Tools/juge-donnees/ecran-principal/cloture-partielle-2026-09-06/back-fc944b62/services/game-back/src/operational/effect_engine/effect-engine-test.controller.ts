// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C0 (boot probe) + C1 (tunables probe) + C2 (schema probe)
//             docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C0 (★ F2-RACE guard probes, A2-D1/A2-D2)
//             Pattern: R-EC-2 test-only controller (meta-market-test.controller.ts, ia-test.controller.ts)
//             — 04e-A1 C0 — 2026-07-04
//             — 04e-A1 C1 — 2026-07-04 (read-tunables + probe-clamp routes added)
//             — 04e-A1 C2 — 2026-07-04 (seed-active-event + seed-modifier schema-persistence probe routes added)
//             — 04e-A2 C0 — 2026-07-05 (reload-race/begin + reload-race/complete + reload-now probe routes added)
//
// `EffectEngineTestController` — TEST-ONLY probe routes for `EffectEngineModule`.
// Mounted ONLY when NODE_ENV !== 'production' (R-EC-2, `testControllersEnabled()` gate).
//
// C0 routes:
//   GET /v1/_test/effect-engine/ping
//     → { ok: true } — proves EffectEngineModule is in the DI graph.
//
// C1 routes (tunables — plan C1 / design §12):
//   GET /v1/_test/effect-engine/read-tunables
//     Returns all 41 C1 tunable getter values as a plain object (34 `political_events.*` + 7 substrate BASE
//     keys spread across their own per-domain files: 2 unconformity, 2 police_memory, 2 specialized_lab,
//     1 inspection). Used by effect_engine_tunables_bootstrap.spec.ts to assert value-sensitive defaults.
//     Anti-fabrication: reads REAL getter output via the live server — not hardcoded echoes.
//
//   POST /v1/_test/effect-engine/probe-clamp
//     Body: { key: string, value: number }
//     Returns: { clamped: number }
//     Applies clampPoliticalEventsToRange(key, value) — political_events.* keys only (the substrate BASE keys
//     inline-clamp inside their own getter; their clamp is proven via a DB-override-then-read round-trip in the
//     spec, not this probe route — see the spec's substrate clamp test).
//
// C2 routes (schema persistence probe — migration 0106, mirrors meta-market-test.controller.ts C2 pattern):
//   POST /v1/_test/effect-engine/seed-active-event
//     Body: { eventId: string, category: string, activatedAtGameDay: number, expiresAtGameDay?: number|null }
//     Inserts one political_event_active row (GLOBAL city-wide ledger) and reads it back.
//     → the inserted row (id, event_id, category, activated_at_game_day, expires_at_game_day)
//
//   POST /v1/_test/effect-engine/seed-modifier
//     Body: { activeEventId: string, scopeType: string, scopeRef?: string|null, tunableKey: string,
//             op: string, magnitude: number|string, appliedAtGameDay: number, expiresAtGameDay?: number|null }
//     Inserts one effect_modifier row (FK -> political_event_active) and reads it back.
//     → the inserted row (magnitude as a STRING — Drizzle numeric() string-mode round-trip, no float drift)
//
// C3 routes (overlay compose probe — plan C3 / design §2.2):
//   POST /v1/_test/effect-engine/apply-modifiers
//     Body: { key: string, base: number, districtId?: string, playerId?: string, cohortId?: string }
//     Returns: { result: number } — EffectOverlayStore.applyModifiers(key, base, scope) called directly
//     against the REAL module-level singleton (its in-memory snapshot, refreshed via its own dedicated
//     `pg LISTEN effect_modifiers_changed` client — this route does NOT trigger a reload itself; a spec
//     seeds rows via seed-active-event/seed-modifier above then issues a real
//     `SELECT pg_notify('effect_modifiers_changed', '')` via psql to prove the LISTEN wiring, THEN calls
//     this route to observe the composed result).
//
// C4 routes (apply/revert engine + crash-recovery — plan C4 / design §2.3):
//   POST /v1/_test/effect-engine/apply-event
//     Body: { activeEventId: string, modifiers: EffectModifierInputBody[] }
//     Calls the REAL EffectModifierService.applyEvent(activeEventId, modifiers) — a single
//     SERIALIZABLE transaction, INSERT one effect_modifier row per entry, then pg_notify. All-or-
//     nothing: if the DB rejects any modifier (e.g. an invalid scopeType/op enum literal deliberately
//     sent by the all-or-nothing test), the WHOLE call throws (-> 500) and ZERO rows persist for that
//     event (proven by the spec re-querying the row count via psql).
//     → 201 { applied: number } on success.
//
//   POST /v1/_test/effect-engine/revert-event
//     Body: { activeEventId: string }
//     Calls EffectModifierService.revertEvent(activeEventId) → { deletedCount: number }.
//
//   POST /v1/_test/effect-engine/revert-expired
//     Body: { currentGameDay: number }
//     Calls EffectModifierService.revertExpired(currentGameDay) → { deletedCount: number }.
//
//   POST /v1/_test/effect-engine/drop-overlay-snapshot
//     No body. Calls EffectOverlayStore.dropSnapshotForTest() — clears the store's in-memory
//     snapshot WITHOUT touching the DB or the LISTEN client (simulates the "crash" half of the
//     crash-recovery proof: a subsequent apply-modifiers call must fall through to `base`).
//     → { ok: true }.
//
//   POST /v1/_test/effect-engine/reinit-overlay
//     No body. Calls EffectOverlayStore.init() again — the SAME entrypoint main.ts calls at real
//     boot (simulates the "reboot" half: reconnect the LISTEN client + full reload from the
//     persisted effect_modifier rows, no bespoke test-only reload path).
//     → { ok: true }.
//
// C5 route (live-lever overlay wiring probe — plan C5 / design §2.2 "the 9 lever getters"):
//   GET /v1/_test/effect-engine/read-levers?districtId=<string>&playerId=<string>
//     Returns the CURRENT resolved value of all 9 wired lever getters, calling the REAL production
//     getters (not a re-implementation) — the 6 GLOBAL body-wraps take no scope; the 3 DISTRICT/
//     PLAYER-scoped levers (cohesionRecoveryRatePerDay, raidTargetTemperature, the 2 MIS levers) are
//     resolved via their scoped variant using the REQUIRED districtId/playerId query params (mirrors
//     what the real per-district/per-player consumer threads). Used by
//     live_lever_overlay_wiring.spec.ts to prove: (a) empty overlay → every getter returns its exact
//     base; (b) a modifier on ONE key shifts ONLY that key; (c) a DISTRICT modifier on
//     cohesion_recovery_rate_per_day shifts district A and not district B (call twice with
//     districtId=A then districtId=B).
//
// C6 (★ Substrate 1 — audit-pin half-life, plan C6 / design §4.1): NO NEW ROUTE. The substrate is fully
// observable through ALREADY-existing surfaces: `read-tunables` above now returns LIVE overlay-composed
// `pinHalfLifeDays`/`auditPinEmergenceRate` (the getters became overlay-aware at C6, no controller change
// needed), the generic C4 `apply-event`/`revert-event` routes apply the E-POL-09-shaped synthetic modifiers
// through the REAL `EffectModifierService`, and the REAL nightly tick is driven via the existing
// `/v1/_test/citysim/advance` harness — the substrate's own persisted state
// (`buildings.audit_pin_expires_at`/`audit_pin_activated_at`) is read directly via psql in
// `substrate_audit_pin_half_life.spec.ts` (mirrors `unconformity.spec.ts`'s own DB_STATE pattern, charte 27).
//
// C7 (★ Substrate 2 — federal investigator, plan C7 / design §4.2): the SPAWN/DESPAWN reconciliation
// itself gets NO new route — mirrors C6 exactly: the two federal BASE tunables (already read-tunables-
// visible since C1) became overlay-aware IN PLACE (police-memory-tunables.ts), the REAL nightly tick is
// driven via the existing `/v1/_test/citysim/advance` harness, and `federal_investigators` is read
// directly via psql in `substrate_federal_investigator.spec.ts`. ONE NEW ROUTE is added below —
// `attempt-clerk-mutation` — the honest-scaffolding REJECTION probe (design §9 item 3): the general
// corrupt-clerk mutation contest is itself inert (⚠️ CORRIGÉ 2026-08-08 : le « no live caller » qui
// justifiait cette phrase est FAUX depuis 04f-B — `clerk` a un appelant de production,
// recruitment-quest.service.ts:336. Ce qui reste vrai ici est l'inertie du CONTEST de mutation, pas
// celle du type), so this calls the REAL
// `attemptCorruptClerkMutation` guard directly (a pure function, no DI needed — mirrors this
// controller's existing plain-import pattern for the tunables files above).
//
// C8 (★ Substrate 3 — Stack zoning gate, plan C8 / design §4.3): NO NEW ROUTE. Unlike C6/C7 (whose substrate
// state is only reachable via the NIGHTLY tick), C8's gate lives on an ALREADY-PUBLIC player endpoint —
// `POST /v1/operational/building/:id/upgrade-tier` (SpecializedLabService.upgradeTier,
// real-estate.controller.ts) — so the live-fire proof drives the REAL production route directly (422 when
// gated, 2xx when relaxed), never a test-only re-implementation. The substrate is otherwise observable through
// ALREADY-existing surfaces: `read-tunables` above returns the LIVE overlay-composed `stackZoningGatedLotCount`
// (overlay-aware as of C8, no controller change needed) and the FIXED `stackZoningGateTargetTier`; the generic
// C4 `apply-event`/`revert-event` routes apply the E-POL-07-shaped synthetic SET modifier through the REAL
// `EffectModifierService`; `blocks.stack_zoning_rank` (migration 0109) is read directly via psql in
// `substrate_stack_lot.spec.ts` (mirrors the C6/C7 DB_STATE pattern, charte 27).
//
// C9 (★ Substrate 4 — checkpoint inspection-density, plan C9 / design §4.4): NO NEW ROUTE. Mirrors C6/C8:
// the substrate is REAL-tick-driven (`InspectionQueueService.runDispatchTick`, TWELVE_H) — the live-fire
// proof drives it via the EXISTING `/v1/_test/citysim/advance` harness and reads the PERSISTED
// `inspection_queues` DB state directly via psql (`substrate_checkpoint_density.spec.ts`, mirrors the C6
// DB_STATE pattern). The generic C4 `apply-event`/`revert-event` routes apply the E-POL-08-shaped
// synthetic DISTRICT MULTIPLY modifier (on `checkpoint_inspection_density_default`, scope_ref = a
// river-crossing district id) through the REAL `EffectModifierService`. The ONLY controller change is
// below: `read-levers` gains 2 fields (`checkpointInspectionDensity`/`checkpointInspectionDensityRatio`)
// so the overlay-compose math itself (not just its tick-level consequence) is independently, precisely
// observable — calling the REAL `inspectionTunables.checkpointInspectionDensityFor`/`checkpointDensityRatioFor`
// getters (C9), never a re-implementation.
//
// C10 substrate probes (if any) will be added here as each chunk adds services. No route is ever removed.
//
// 04g-B C3 (★ S7 wire probe): NO NEW ROUTE. `read-levers` gains 2 fields —
// `contestThresholdPresence` (the plain, unscoped `dealLekTunables` getter — proves it stays
// byte-unchanged) and `contestThresholdPresenceForDistrict` (the NEW `dealLekTunables.
// contestThresholdPresenceFor(districtId)` scoped variant `deal-lek.projection.service.ts`'s
// `controlState` now calls) — calling the REAL production getters, never a re-implementation. Zero-
// regression (AC3) is asserted by comparing BOTH fields against the SAME base value when no overlay row
// exists on `T.city.contest_threshold_presence`.
//
// 04g-B C1 (★ DD-RW1 random-world sibling probes, design §3.3): 4 NEW routes for the 3rd
// EffectModifierService sibling family — `random-world-event-generator.service.ts` (C2) does not exist
// yet, so this chunk's E2E floor exercises `applyRandomWorldEvent`/`revertRandomWorldEvent`/
// `reapplyRandomWorldEvent` DIRECTLY through this test-probe controller (the EXACT same pattern the C4
// `apply-event`/`revert-event` routes established for the political siblings — never a re-implementation).
//
//   POST /v1/_test/effect-engine/seed-random-world-event-active
//     Body: { templateId: string, districtId: number, startedAtGameDay: number, expiresAtGameDay?: number|null, status?: string }
//     Inserts one random_world_event_active row (migration 0128) and reads it back — the FK target the
//     3 sibling routes below need. Mirrors seed-active-event (C2 pattern above).
//     → the inserted row.
//
//   POST /v1/_test/effect-engine/apply-random-world-event
//     Body: { randomWorldEventActiveId: string, modifiers: EffectModifierInputBody[] }
//     Calls the REAL EffectModifierService.applyRandomWorldEvent(randomWorldEventActiveId, modifiers).
//     Same all-or-nothing proof shape as apply-event: a deliberately invalid modifier forces a genuine
//     Postgres rejection mid-batch, proving the WHOLE batch rolls back — ZERO rows persist.
//     → 201 { applied: number } on success.
//
//   POST /v1/_test/effect-engine/revert-random-world-event
//     Body: { randomWorldEventActiveId: string }
//     Calls EffectModifierService.revertRandomWorldEvent(randomWorldEventActiveId) → { deletedCount }.
//
//   POST /v1/_test/effect-engine/reapply-random-world-event
//     Body: { randomWorldEventActiveId: string, modifiers: EffectModifierInputBody[] }
//     Calls EffectModifierService.reapplyRandomWorldEvent(randomWorldEventActiveId, modifiers) — the
//     NEW single-tx DELETE-then-INSERT shape (D3) → { deletedCount: number, appliedCount: number }.
//
// 04e-A2 C0 (★ F2-RACE guard probes, A2-D1/A2-D2): 3 NEW routes on `config/effect-overlay-store.ts`'s
// additive robustness fix (byte-identical for the empty-overlay / single-reload-in-flight path — see
// that file's C0 doc comment).
//
//   POST /v1/_test/effect-engine/reload-race/begin
//     No body. Calls the REAL `EffectOverlayStore.beginReloadForTest()` — captures a monotonic token
//     exactly like a real `reload()` would, without touching the DB.
//     → { token: number }
//
//   POST /v1/_test/effect-engine/reload-race/complete
//     Body: { token: number, rows: Array<{ id, active_event_id, scope_type, scope_ref, tunable_key,
//             op, magnitude, applied_at_game_day, expires_at_game_day }> }
//     Calls the REAL `EffectOverlayStore.applyReloadRowsForTest(token, rows)` — runs the EXACT SAME
//     swap-decision logic the real `reload()` uses. A spec drives two `begin`+`complete` pairs to
//     prove the guard deterministically: begin() token1 → begin() token2 (token2 > token1) →
//     complete(token2, rowsB) (swaps, since token2 is current) → complete(token1, rowsA) (a STALE
//     token, since reloadSeq has moved past it) → asserts `swapped: false` AND that `apply-modifiers`
//     still reflects rowsB, never rowsA. No wall-clock dependency.
//     → { swapped: boolean }
//
//   POST /v1/_test/effect-engine/reload-now
//     No body. Calls the REAL, public, awaited `EffectOverlayStore.reloadNow()` — forces a full reload
//     against the store's current LISTEN client and resolves once it lands. Used to prove same-tick
//     visibility after N rapid real `apply-event`/`revert-event` cycles (above) without polling.
//     → { ok: true }

import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Inject, Post, Query } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  effectModifier,
  politicalEventActive,
  effectScope,
  effectModifierOp,
  politicalEventCategory,
  type EffectModifierRow,
} from '../../db/schema/effect_modifier';
import { federalInvestigator } from '../../db/schema/city_state';
import { randomWorldEventActive, randomWorldEventStatus } from '../../db/schema/random_world';
import { EffectModifierService } from './effect-modifier.service';
import type { EffectModifierInput } from './effect-engine.types';
import { EffectOverlayStore, type EffectScopeContext } from '../../config/effect-overlay-store';
import { politicalEventsTunables, clampPoliticalEventsToRange } from './effect-engine.tunables';
import { unconformityTunables } from '../../citysim/unconformity/unconformity-tunables';
import { policeMemoryTunables } from '../../citysim/police_memory/police-memory-tunables';
import { attemptCorruptClerkMutation } from '../../citysim/police_memory/federal-investigator.guard';
import { specializedLabTunables } from '../real_estate/specialized-lab-tunables';
import { inspectionTunables } from '../../citysim/inspection/inspection-tunables';
import { cohesionTunables } from '../../citysim/cohesion/cohesion-tunables';
import { patrolTunables } from '../../citysim/patrol/patrol-tunables';
import { iaTunables } from '../internal_affairs/ia.tunables';
import { lawyerTunables } from '../legal/lawyer.tunables';
import { launderingTunables } from '../laundering/laundering-tunables';
import { marketTunables } from '../market/market-tunables';
import { dealLekTunables } from '../../citysim/deal_lek/deal-lek-tunables';

// Local type aliases for enum casts in C2 seed routes (not re-exported — controller-only, mirrors
// meta-market-test.controller.ts's SubstanceEnumVal/DistrictProfileEnumVal pattern).
type EffectScopeEnumVal = (typeof effectScope.enumValues)[number];
type EffectModifierOpEnumVal = (typeof effectModifierOp.enumValues)[number];
type PoliticalEventCategoryEnumVal = (typeof politicalEventCategory.enumValues)[number];
type RandomWorldEventStatusEnumVal = (typeof randomWorldEventStatus.enumValues)[number];

/**
 * Test-only probe controller for `EffectEngineModule`.
 *
 * All routes live under the `/v1/_test/effect-engine/` prefix.
 * Mounted conditionally by `EffectEngineModule` (only when `testControllersEnabled()`).
 *
 * @see testControllersEnabled (../../protocol/test-routes-gate)
 */
@Controller()
export class EffectEngineTestController {
  constructor(
    // C0: DI anchor stub (will have active callers at C4+).
    private readonly effectModifierService: EffectModifierService,
    // C2: direct DB access for the schema-persistence seed routes (mirrors meta-market-test.controller.ts).
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  // ── C0 ──────────────────────────────────────────────────────────────────────────────────────

  /** C0 connectivity probe: returns { ok: true } if EffectEngineModule is in the DI graph. */
  @Get('_test/effect-engine/ping')
  ping(): { ok: true } {
    return this.effectModifierService.ping();
  }

  // ── C1 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/effect-engine/read-tunables
   *
   * Returns all C1 tunable getter values as a plain object (41 keys total). Used by
   * `effect_engine_tunables_bootstrap.spec.ts` to assert value-sensitive defaults + prove DB-override flips
   * reflect through the real getters (not hardcoded echoes).
   *
   * 34 `political_events.*` keys (effect-engine.tunables.ts) + 7 substrate BASE keys:
   *   unconformity: pinHalfLifeDays, auditPinEmergenceRate
   *   police_memory: federalSuspicionDecayPerTilePerDay, federalRaidTargetTemperature
   *   specialized_lab: stackZoningGatedLotCount, stackZoningGateTargetTier
   *   inspection: checkpointInspectionDensityDefault
   */
  @Get('_test/effect-engine/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      // ── 34 political_events.* keys (effect-engine.tunables.ts) ─────────────────────────────
      electoralCycleInGameMonths:          politicalEventsTunables.electoralCycleInGameMonths,
      epol01ElectoralDurationDays:         politicalEventsTunables.epol01ElectoralDurationDays,
      epol01BpdRaidTargetTemperatureShift: politicalEventsTunables.epol01BpdRaidTargetTemperatureShift,
      epol01MisProcessingMultiplier:       politicalEventsTunables.epol01MisProcessingMultiplier,
      epol01CohesionMarginalShift:         politicalEventsTunables.epol01CohesionMarginalShift,
      epol02BudgetIncreaseDurationDays:    politicalEventsTunables.epol02BudgetIncreaseDurationDays,
      epol02BpdBudgetMultiplier:           politicalEventsTunables.epol02BpdBudgetMultiplier,
      epol02PatrolClusterThreshold:        politicalEventsTunables.epol02PatrolClusterThreshold,
      epol03BudgetCutDurationDays:         politicalEventsTunables.epol03BudgetCutDurationDays,
      epol03MisProcessingMultiplier:       politicalEventsTunables.epol03MisProcessingMultiplier,
      epol03BpdReviewTickMultiplier:       politicalEventsTunables.epol03BpdReviewTickMultiplier,
      epol04MarketCLoShift:                politicalEventsTunables.epol04MarketCLoShift,
      epol05LobbyingDurationDays:          politicalEventsTunables.epol05LobbyingDurationDays,
      epol05MisTargetPlayerMultiplier:     politicalEventsTunables.epol05MisTargetPlayerMultiplier,
      epol06AntiCorruptionDurationDays:    politicalEventsTunables.epol06AntiCorruptionDurationDays,
      epol06IaThresholdShift:              politicalEventsTunables.epol06IaThresholdShift,
      epol07StackUtilizationThresholdPct:  politicalEventsTunables.epol07StackUtilizationThresholdPct,
      epol07StackUtilizationWindowDays:    politicalEventsTunables.epol07StackUtilizationWindowDays,
      epol08RiverfrontCrackdownDurationDays: politicalEventsTunables.epol08RiverfrontCrackdownDurationDays,
      epol08InspectionDensityMultiplier:   politicalEventsTunables.epol08InspectionDensityMultiplier,
      epol09ScandalDurationDays:           politicalEventsTunables.epol09ScandalDurationDays,
      epol09AuditPinHalfLifeMultiplier:    politicalEventsTunables.epol09AuditPinHalfLifeMultiplier,
      epol09AuditPinEmergenceMultiplier:   politicalEventsTunables.epol09AuditPinEmergenceMultiplier,
      epol10CounterPlayCostMultiplier:     politicalEventsTunables.epol10CounterPlayCostMultiplier,
      epol10LawyerTier3CostMultiplier:     politicalEventsTunables.epol10LawyerTier3CostMultiplier,
      epol11FederalTaskForceDurationDays:  politicalEventsTunables.epol11FederalTaskForceDurationDays,
      epol11BpdMemoryAggregateTrigger:     politicalEventsTunables.epol11BpdMemoryAggregateTrigger,
      epol12MisInspectionMultiplier:       politicalEventsTunables.epol12MisInspectionMultiplier,
      epol12CohesionRecoveryMultiplier:    politicalEventsTunables.epol12CohesionRecoveryMultiplier,
      oppositionVictoryProbabilityBase:    politicalEventsTunables.oppositionVictoryProbabilityBase,
      budgetCycleInGameMonths:             politicalEventsTunables.budgetCycleInGameMonths,
      scandalRandomWeightPerEventNoise:    politicalEventsTunables.scandalRandomWeightPerEventNoise,
      overlapMaxActive:                    politicalEventsTunables.overlapMaxActive,
      monthMinutes:                        politicalEventsTunables.monthMinutes,
      // ── 7 substrate BASE keys (per-domain files) ───────────────────────────────────────────
      pinHalfLifeDays:                     unconformityTunables.pinHalfLifeDays,
      auditPinEmergenceRate:               unconformityTunables.auditPinEmergenceRate,
      federalSuspicionDecayPerTilePerDay:  policeMemoryTunables.federalSuspicionDecayPerTilePerDay,
      federalRaidTargetTemperature:        policeMemoryTunables.federalRaidTargetTemperature,
      stackZoningGatedLotCount:            specializedLabTunables.stackZoningGatedLotCount,
      stackZoningGateTargetTier:           specializedLabTunables.stackZoningGateTargetTier,
      checkpointInspectionDensityDefault:  inspectionTunables.checkpointInspectionDensityDefault,
    };
  }

  /**
   * POST /v1/_test/effect-engine/probe-clamp
   *
   * Body: { key: string, value: number } → { clamped: number }
   * Applies `clampPoliticalEventsToRange(key, value)` — political_events.* keys only (mirrors
   * meta-market-test.controller.ts's probe-clamp route). FALSIFIABLE: an out-of-range value returns clamped,
   * never the raw input.
   */
  @Post('_test/effect-engine/probe-clamp')
  probeClamp(@Body() body: { key: string; value: number }): { clamped: number } {
    return { clamped: clampPoliticalEventsToRange(body.key, body.value) };
  }

  // ── C2 — Schema persistence probe (migration 0106) ─────────────────────────────────────────

  /**
   * POST /v1/_test/effect-engine/seed-active-event
   *
   * C2 schema probe: insert one political_event_active row and read it back.
   *
   * Proves: migration 0106 applied (table exists), political_event_category enum accepted,
   * event_id soft-ref text column (no DB FK to a static catalogue — design §3/§11).
   *
   * Body: {
   *   eventId: string,             — soft ref to the static PoliticalEvent catalogue (e.g. 'E-POL-01')
   *   category: string,            — political_event_category enum value (e.g. 'ELECTORAL')
   *   activatedAtGameDay: number,
   *   expiresAtGameDay?: number,   — omit/null for "permanent-until-election" (design §3)
   * }
   * @returns the inserted row (id, event_id, category, activated_at_game_day, expires_at_game_day)
   */
  @Post('_test/effect-engine/seed-active-event')
  @HttpCode(201)
  async seedActiveEvent(@Body() body: {
    eventId?: string;
    category?: string;
    activatedAtGameDay?: number;
    expiresAtGameDay?: number | null;
  }): Promise<Record<string, unknown>> {
    const { eventId, category, activatedAtGameDay, expiresAtGameDay } = body ?? {};

    if (!eventId || !category || activatedAtGameDay === undefined) {
      throw new HttpException(
        'eventId, category, activatedAtGameDay required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inserted = await this.db
      .insert(politicalEventActive)
      .values({
        event_id: eventId,
        category: category as PoliticalEventCategoryEnumVal,
        activated_at_game_day: activatedAtGameDay,
        expires_at_game_day: expiresAtGameDay ?? null,
      })
      .returning();

    const row = inserted[0] as Record<string, unknown> | undefined;
    if (!row) {
      throw new HttpException(
        'political_event_active row not found after insert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return row;
  }

  /**
   * POST /v1/_test/effect-engine/seed-modifier
   *
   * C2 schema probe: insert one effect_modifier row (FK to an existing political_event_active row)
   * and read it back.
   *
   * Proves: migration 0106 applied (table + FK + indexes exist), effect_scope + effect_modifier_op
   * enums accepted, `magnitude` numeric round-trips as a STRING (Drizzle `numeric()` string-mode —
   * no float precision drift across apply/revert/compose, design §2.3 determinism), `scope_ref` is a
   * plain nullable text column (polymorphic — no DB FK, design §11).
   *
   * Body: {
   *   activeEventId: string,        — FK to an existing political_event_active.id (seed-active-event first)
   *   scopeType: string,            — effect_scope enum value ('GLOBAL' | 'DISTRICT' | 'PLAYER' | 'COHORT')
   *   scopeRef?: string | null,     — polymorphic ref (district id / player id / cohort key); null for GLOBAL
   *   tunableKey: string,
   *   op: string,                   — effect_modifier_op enum value ('ADD' | 'MULTIPLY' | 'SET')
   *   magnitude: number | string,   — the compose operand
   *   appliedAtGameDay: number,
   *   expiresAtGameDay?: number | null,
   * }
   * @returns the inserted row (magnitude as string — numeric string-mode, no JSON precision loss)
   */
  @Post('_test/effect-engine/seed-modifier')
  @HttpCode(201)
  async seedModifier(@Body() body: {
    activeEventId?: string;
    scopeType?: string;
    scopeRef?: string | null;
    tunableKey?: string;
    op?: string;
    magnitude?: number | string;
    appliedAtGameDay?: number;
    expiresAtGameDay?: number | null;
  }): Promise<Record<string, unknown>> {
    const {
      activeEventId, scopeType, scopeRef, tunableKey, op, magnitude, appliedAtGameDay, expiresAtGameDay,
    } = body ?? {};

    if (
      !activeEventId || !scopeType || !tunableKey || !op
      || magnitude === undefined || appliedAtGameDay === undefined
    ) {
      throw new HttpException(
        'activeEventId, scopeType, tunableKey, op, magnitude, appliedAtGameDay required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inserted = await this.db
      .insert(effectModifier)
      .values({
        active_event_id: activeEventId,
        scope_type: scopeType as EffectScopeEnumVal,
        scope_ref: scopeRef ?? null,
        tunable_key: tunableKey,
        op: op as EffectModifierOpEnumVal,
        magnitude: String(magnitude),
        applied_at_game_day: appliedAtGameDay,
        expires_at_game_day: expiresAtGameDay ?? null,
      })
      .returning();

    const row = inserted[0] as Record<string, unknown> | undefined;
    if (!row) {
      throw new HttpException(
        'effect_modifier row not found after insert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return row;
  }

  // ── C3 — Overlay compose probe ──────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/effect-engine/apply-modifiers
   *
   * C3 compose probe: calls the REAL `EffectOverlayStore.applyModifiers(key, base, scope)` singleton
   * directly (not a mock/re-implementation) — the same synchronous entry point C5 will wrap the 9 lever
   * getters with. Proves compose order (MULTIPLY-fold → ADD → SET), scope-match (GLOBAL/DISTRICT/
   * PLAYER/COHORT), tie-break by `id` ascending, and the empty/no-match → `base` byte-identical
   * contract (design §2.2).
   *
   * This route reads the store's CURRENT in-memory snapshot only — it does not force a reload. A spec
   * seeds rows via seed-active-event/seed-modifier, issues a real `SELECT pg_notify('effect_modifiers_
   * changed', '')` (proving the dedicated LISTEN client — not this route — picks up the change), then
   * polls this route until the composed result reflects the seeded rows.
   *
   * Body: {
   *   key: string,                — tunable_key to resolve
   *   base: number,                — the base value the getter would otherwise return
   *   districtId?: string,         — EffectScopeContext.districtId
   *   playerId?: string,           — EffectScopeContext.playerId
   *   cohortId?: string,           — EffectScopeContext.cohortId
   * }
   * @returns { result: number } — the composed value (byte-identical to `base` when empty/no-match)
   */
  @Post('_test/effect-engine/apply-modifiers')
  applyModifiers(@Body() body: {
    key?: string;
    base?: number;
    districtId?: string;
    playerId?: string;
    cohortId?: string;
  }): { result: number } {
    const { key, base, districtId, playerId, cohortId } = body ?? {};

    if (!key || base === undefined) {
      throw new HttpException('key, base required', HttpStatus.BAD_REQUEST);
    }

    const scope: EffectScopeContext | undefined =
      districtId !== undefined || playerId !== undefined || cohortId !== undefined
        ? { districtId, playerId, cohortId }
        : undefined;

    return { result: EffectOverlayStore.applyModifiers(key, base, scope) };
  }

  // ── C4 — Apply/revert engine + crash-recovery probes ────────────────────────────────────────

  /**
   * POST /v1/_test/effect-engine/apply-event
   *
   * C4 probe: calls the REAL `EffectModifierService.applyEvent(activeEventId, modifiers)` — a single
   * SERIALIZABLE transaction, INSERT one `effect_modifier` row per entry, then `pg_notify`.
   *
   * All-or-nothing proof: the `modifiers` entries are passed through with a permissive runtime cast
   * (mirrors the C2 `seed-modifier` route's `op as EffectModifierOpEnumVal` pattern) — a spec can
   * deliberately send an invalid `scopeType`/`op` string for one entry in a multi-entry batch to force
   * a genuine Postgres "invalid input value for enum" error mid-transaction, proving the WHOLE batch
   * (including any entries that would otherwise have inserted successfully) rolls back.
   *
   * Body: { activeEventId: string, modifiers: Array<{ scopeType, scopeRef?, tunableKey, op, magnitude, appliedAtGameDay, expiresAtGameDay? }> }
   * @returns 201 { applied: number } on success. On a forced constraint violation, the underlying
   *   error propagates (Nest's default exception filter → 500) — the spec asserts a non-2xx status
   *   AND a zero row count for `activeEventId`, never a partial set.
   */
  // TD-342 (W0.2, 2026-08-07) — `reload?: boolean`, DÉFAUT `false`, sur les 3 routes de ce bloc.
  //
  // Le registre de dette proposait d'ajouter un `await EffectOverlayStore.reloadNow()` INCONDITIONNEL,
  // « même classe que TD-339 ». Cette branche est DISQUALIFIÉE, et le motif vaut d'être lu avant de
  // toucher à ces routes : `effect_overlay_reload_race.spec.ts` RACE-2 (:22-26, :259-288) fabrique
  // délibérément des reloads en vol périmés en tirant N cycles apply+revert SANS attente, puis exige
  // qu'UN SEUL `reload-now` awaité recolle à la vérité DB sans aucun poll. Si ces routes rechargeaient
  // d'elles-mêmes, cette condition NE POURRAIT PLUS EXISTER : le test resterait vert en n'éprouvant
  // plus rien — une TAUTOLOGIE, le mode d'échec que ce dépôt a déjà documenté deux fois.
  //
  // La différence avec TD-339 est de NATURE, pas de périmètre : là-bas un opérateur humain lisait
  // derrière une route de PRODUCTION et la fraîcheur était le contrat. Ici, le contrat « le CALLER
  // possède reloadNow() » (`political-event-lifecycle.service.ts` header) est précisément ce qui rend
  // la course TESTABLE.
  //
  // D'où l'opt-in : la spec de course garde le comportement brut (elle n'envoie pas `reload`), et les
  // specs qui compensaient par un poll peuvent l'activer et supprimer leur boucle — `live_lever_overlay_
  // wiring.spec.ts` polle aujourd'hui jusqu'à 60 s (:101-103, :241), et 1 seule des 13 specs
  // `effect_engine` appelle `reload-now` explicitement.
  @Post('_test/effect-engine/apply-event')
  @HttpCode(201)
  async applyEvent(@Body() body: {
    activeEventId?: string;
    modifiers?: Array<{
      scopeType?: string;
      scopeRef?: string | null;
      tunableKey?: string;
      op?: string;
      magnitude?: number | string;
      appliedAtGameDay?: number;
      expiresAtGameDay?: number | null;
    }>;
    /** TD-342 opt-in : si `true`, attend `EffectOverlayStore.reloadNow()` avant de répondre. Défaut `false`. */
    reload?: boolean;
  }): Promise<{ applied: number }> {
    const { activeEventId, modifiers } = body ?? {};

    if (!activeEventId || !modifiers || modifiers.length === 0) {
      throw new HttpException('activeEventId, modifiers (non-empty) required', HttpStatus.BAD_REQUEST);
    }

    const inputs: EffectModifierInput[] = modifiers.map((m) => {
      if (!m.scopeType || !m.tunableKey || !m.op || m.magnitude === undefined || m.appliedAtGameDay === undefined) {
        throw new HttpException(
          'each modifier requires scopeType, tunableKey, op, magnitude, appliedAtGameDay',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        scopeType: m.scopeType as EffectScopeEnumVal,
        scopeRef: m.scopeRef ?? null,
        tunableKey: m.tunableKey,
        op: m.op as EffectModifierOpEnumVal,
        magnitude: m.magnitude,
        appliedAtGameDay: m.appliedAtGameDay,
        expiresAtGameDay: m.expiresAtGameDay ?? null,
      };
    });

    const applied = await this.effectModifierService.applyEvent(activeEventId, inputs);
    // TD-342 opt-in (défaut false — voir le bloc doc au-dessus de la route).
    if (body?.reload === true) await EffectOverlayStore.reloadNow();
    return { applied };
  }

  /**
   * POST /v1/_test/effect-engine/revert-event
   *
   * C4 probe: calls the REAL `EffectModifierService.revertEvent(activeEventId)` — DELETE every
   * `effect_modifier` row for that event (SERIALIZABLE) + notify.
   *
   * Body: { activeEventId: string }
   * @returns { deletedCount: number }
   */
  @Post('_test/effect-engine/revert-event')
  async revertEvent(@Body() body: { activeEventId?: string; reload?: boolean }): Promise<{ deletedCount: number }> {
    const { activeEventId } = body ?? {};
    if (!activeEventId) {
      throw new HttpException('activeEventId required', HttpStatus.BAD_REQUEST);
    }
    const deletedCount = await this.effectModifierService.revertEvent(activeEventId);
    // TD-342 opt-in (défaut false — voir le bloc doc sur `apply-event`).
    if (body?.reload === true) await EffectOverlayStore.reloadNow();
    return { deletedCount };
  }

  /**
   * POST /v1/_test/effect-engine/revert-expired
   *
   * C4 probe: calls the REAL `EffectModifierService.revertExpired(currentGameDay)` — DELETE every
   * `effect_modifier` row whose `expires_at_game_day` IS NOT NULL and `<= currentGameDay`
   * (SERIALIZABLE) + notify. Pure function of `(persisted rows, currentGameDay)`.
   *
   * Body: { currentGameDay: number }
   * @returns { deletedCount: number }
   */
  @Post('_test/effect-engine/revert-expired')
  async revertExpired(@Body() body: { currentGameDay?: number; reload?: boolean }): Promise<{ deletedCount: number }> {
    const { currentGameDay } = body ?? {};
    if (currentGameDay === undefined) {
      throw new HttpException('currentGameDay required', HttpStatus.BAD_REQUEST);
    }
    const deletedCount = await this.effectModifierService.revertExpired(currentGameDay);
    // TD-342 opt-in (défaut false — voir le bloc doc sur `apply-event`).
    if (body?.reload === true) await EffectOverlayStore.reloadNow();
    return { deletedCount };
  }

  /**
   * POST /v1/_test/effect-engine/drop-overlay-snapshot
   *
   * C4 crash-recovery probe (step 1/2 — "the crash"): calls the REAL
   * `EffectOverlayStore.dropSnapshotForTest()` — clears the store's in-memory snapshot to an empty
   * Map, WITHOUT touching the DB or the LISTEN client. A subsequent `apply-modifiers` call must fall
   * through to `base` for any key that had a modifier, proving the drop actually happened (not a
   * no-op) rather than merely asserting recovery without ever observing the intermediate loss.
   *
   * No body.
   * @returns { ok: true }
   */
  @Post('_test/effect-engine/drop-overlay-snapshot')
  dropOverlaySnapshot(): { ok: true } {
    EffectOverlayStore.dropSnapshotForTest();
    return { ok: true };
  }

  /**
   * POST /v1/_test/effect-engine/reinit-overlay
   *
   * C4 crash-recovery probe (step 2/2 — "the reboot"): calls the REAL `EffectOverlayStore.init()`
   * again — the SAME entrypoint `main.ts` invokes at real process boot (`main.ts:67`). Reconnects the
   * dedicated `pg LISTEN effect_modifiers_changed` client and performs a full reload from the
   * persisted `effect_modifier` rows — no bespoke test-only reload path, so this proves the REAL boot
   * recovery code, not a re-implementation of it.
   *
   * No body.
   * @returns { ok: true }
   */
  @Post('_test/effect-engine/reinit-overlay')
  async reinitOverlay(): Promise<{ ok: true }> {
    await EffectOverlayStore.init();
    return { ok: true };
  }

  // ── C5 — Live-lever overlay wiring probe ────────────────────────────────────────────────────

  /**
   * GET /v1/_test/effect-engine/read-levers?districtId=X&playerId=Y
   *
   * C5 live-lever probe (plan C5 / design §2.2, "the 9 lever getters"): calls the REAL production
   * getters directly (not a mock, not a re-implementation) and returns their currently-resolved
   * value. Anti-fabrication: this is the exact code path `police_memory.service.ts`,
   * `cohesion.service.ts`, `ia-investigation.service.ts`, `lawyer.service.ts`,
   * `laundering.service.ts`, `lane-collapse-pricing.service.ts`, `patrol.service.ts`, and
   * `inspection.service.ts` call at runtime.
   *
   * The 6 GLOBAL levers (body-wrapped, no scope) always resolve GLOBAL-only. The 3 DISTRICT/PLAYER
   * levers resolve via their scoped variant using `districtId`/`playerId` (REQUIRED — production
   * always threads a real one; the test always supplies both so a single call reads all 9).
   *
   * @returns the 9 wired lever values (10 raw fields — MIS cap + MIS decay are 2 physical getters
   *   behind the single "MIS (live)" lever-table row, §6.1).
   */
  @Get('_test/effect-engine/read-levers')
  readLevers(
    @Query('districtId') districtId?: string,
    @Query('playerId') playerId?: string,
  ): Record<string, unknown> {
    if (!districtId || !playerId) {
      throw new HttpException('districtId, playerId query params required', HttpStatus.BAD_REQUEST);
    }
    const scope: EffectScopeContext = { districtId, playerId };
    return {
      // ── GLOBAL levers (body-wrap — plan C5 item 1) ────────────────────────────────────────
      cohesionMarginalThreshold:              cohesionTunables.permanentMarginalThreshold,
      iaOpenInvestigationThreshold:            iaTunables.openInvestigationThreshold,
      lawyerTier3CorruptionBaseCostCents:      lawyerTunables.tier3CorruptionLawyerBaseCostCents,
      launderingFrontShopLegitBaselineCents:   launderingTunables.frontShopLegitBaselineCents,
      marketLaneCLo:                           marketTunables.laneCLo,
      patrolClusterCorrelationThreshold:       patrolTunables.clusterCorrelationThreshold,
      // ── DISTRICT/PLAYER-scoped levers (plan C5 item 2) ────────────────────────────────────
      cohesionRecoveryRatePerDay:              cohesionTunables.cohesionRecoveryRatePerDayFor(Number(districtId)),
      raidTargetTemperature:                   policeMemoryTunables.raidTargetTemperatureFor(scope),
      // ── MIS (live) — §6.1 mapping, 2 physical getters behind the one lever-table row ──────
      misInspectionQueueCap:                   inspectionTunables.inspectionQueueCapFor(scope),
      misPriorityDecayPerDay:                  inspectionTunables.priorityDecayPerDayFor(scope),
      // ── C9 checkpoint inspection-density (★ Substrate 4, design §4.4) ─────────────────────
      // Raw overlay-compose math (independent of the tick-level DB consequence proven in
      // substrate_checkpoint_density.spec.ts) — ratio=1 at base (byte-identical), 1.6 under the
      // DISTRICT-scoped E-POL-08-shaped modifier. `districtId` need not be a river-crossing district
      // for this route (it echoes the raw getter regardless); `InspectionQueueService` is the one that
      // gates consumption to river-crossing districts only (`isRiverCrossingDistrict`).
      checkpointInspectionDensity:             inspectionTunables.checkpointInspectionDensityFor(scope),
      checkpointInspectionDensityRatio:        inspectionTunables.checkpointDensityRatioFor(scope),
      // ── 04g-B C3 (S7 wire, design §3.6/§3.7 "the lek lever") ───────────────────────────────
      // The plain (unscoped) getter — proves it stays BYTE-UNCHANGED regardless of any DISTRICT
      // overlay row on the key (zero-regression, AC3) — alongside the NEW scoped variant.
      contestThresholdPresence:                dealLekTunables.contestThresholdPresence,
      contestThresholdPresenceForDistrict:      dealLekTunables.contestThresholdPresenceFor(Number(districtId)),
    };
  }

  // ── C7 — ★ Substrate 2: federal investigator honest-scaffolding rejection probe ─────────────

  /**
   * POST /v1/_test/effect-engine/federal-investigator/attempt-clerk-mutation
   *
   * C7 probe (plan C7 / design §4.2 + §9 item 3, HONESTY — locked): calls the REAL
   * `attemptCorruptClerkMutation` guard (federal-investigator.guard.ts) — NOT a re-implementation, NOT
   * the general corrupt-clerk live contest (that path is itself inert today, no live caller —
   * ia-target.service.ts:28,34,258 — and building a live contest is explicitly out of scope, plan
   * §Deferred). This proves the STRUCTURAL property: given an investigator's `corruption_exempt` flag,
   * is a corrupt-clerk mutation attempt against its suspicion structure accepted or rejected?
   *
   * Body: { playerId?: string, corruptionExempt?: boolean }
   *   - `playerId` supplied: reads the REAL `federal_investigators` row for that player (404 if none —
   *     spawn one first via the real NIGHTLY reconciliation, `substrate_federal_investigator.spec.ts`'s
   *     own spawn proof) and gates on its PERSISTED `corruption_exempt` (always true for a federal row).
   *   - `corruptionExempt` supplied instead (no `playerId`): the COUNTER-PROOF branch — simulates what
   *     the LOCAL `precinct_memory` model's own (still separately inert) mutation path would decide if
   *     it were gated by this SAME guard with `corruption_exempt=false`. Proves the guard is a real
   *     gate, not a fig-leaf that rejects unconditionally regardless of the flag.
   *
   * @returns { accepted: boolean, reason: string, corruptionExempt: boolean }
   */
  @Post('_test/effect-engine/federal-investigator/attempt-clerk-mutation')
  async attemptClerkMutation(@Body() body: {
    playerId?: string;
    corruptionExempt?: boolean;
  }): Promise<{ accepted: boolean; reason: string; corruptionExempt: boolean }> {
    const { playerId, corruptionExempt } = body ?? {};

    let exempt: boolean;
    if (playerId) {
      const rows = await this.db
        .select({ corruption_exempt: federalInvestigator.corruption_exempt })
        .from(federalInvestigator)
        .where(eq(federalInvestigator.player_id, playerId))
        .limit(1);
      const row = rows[0];
      if (!row) {
        throw new HttpException(
          `no federal_investigators row for player ${playerId} — spawn one first (apply-event + advance)`,
          HttpStatus.NOT_FOUND,
        );
      }
      exempt = row.corruption_exempt;
    } else if (corruptionExempt !== undefined) {
      exempt = corruptionExempt;
    } else {
      throw new HttpException('playerId or corruptionExempt required', HttpStatus.BAD_REQUEST);
    }

    const result = attemptCorruptClerkMutation({ corruptionExempt: exempt });
    return { ...result, corruptionExempt: exempt };
  }

  // ── 04e-A2 C0 — ★ F2-RACE guard probes (A2-D1/A2-D2) ────────────────────────────────────────

  /**
   * POST /v1/_test/effect-engine/reload-race/begin
   *
   * C0 probe (04e-A2 plan C0 / decisions §2.1): calls the REAL, module-level
   * `EffectOverlayStore.beginReloadForTest()` — captures a monotonic reload token exactly like a real
   * `reload()` would, WITHOUT touching the DB. Combined with `reload-race/complete` below, a spec
   * drives the F2-RACE guard deterministically (no query-timing dependency).
   *
   * No body.
   * @returns { token: number }
   */
  @Post('_test/effect-engine/reload-race/begin')
  reloadRaceBegin(): { token: number } {
    return { token: EffectOverlayStore.beginReloadForTest() };
  }

  /**
   * POST /v1/_test/effect-engine/reload-race/complete
   *
   * C0 probe (04e-A2 plan C0 / decisions §2.1): calls the REAL
   * `EffectOverlayStore.applyReloadRowsForTest(token, rows)` — the EXACT SAME swap-decision logic the
   * real `reload()` uses (never a re-implementation). A spec proves the guard by: `begin()` → token1,
   * `begin()` → token2 (token2 > token1), `complete(token2, rowsB)` (swaps — token2 is current),
   * `complete(token1, rowsA)` (a STALE token since `reloadSeq` has moved past it — MUST return
   * `swapped: false` and leave the snapshot unchanged, still reflecting rowsB via `apply-modifiers`).
   *
   * Body: { token: number, rows: Array<{ id, active_event_id, scope_type, scope_ref, tunable_key, op,
   *         magnitude, applied_at_game_day, expires_at_game_day }> }
   * @returns { swapped: boolean } — `false` iff the token was stale (a newer reload had already started).
   */
  @Post('_test/effect-engine/reload-race/complete')
  reloadRaceComplete(@Body() body: {
    token?: number;
    rows?: Array<Record<string, unknown>>;
  }): { swapped: boolean } {
    const { token, rows } = body ?? {};
    if (token === undefined || !rows) {
      throw new HttpException('token, rows required', HttpStatus.BAD_REQUEST);
    }
    const swapped = EffectOverlayStore.applyReloadRowsForTest(
      token,
      rows as unknown as EffectModifierRow[],
    );
    return { swapped };
  }

  /**
   * POST /v1/_test/effect-engine/reload-now
   *
   * C0 probe (04e-A2 plan C0 / decisions §3, A2-D2 same-tick visibility): calls the REAL, public,
   * awaited `EffectOverlayStore.reloadNow()` — forces a full reload against the store's current LISTEN
   * client and resolves once it lands. Used to prove same-tick visibility after N rapid REAL
   * `apply-event`/`revert-event` cycles (the C4 routes above) without polling — one awaited call, then
   * the resolved snapshot is read via `apply-modifiers`/`read-levers`.
   *
   * No body.
   * @returns { ok: true }
   */
  @Post('_test/effect-engine/reload-now')
  async reloadNow(): Promise<{ ok: true }> {
    await EffectOverlayStore.reloadNow();
    return { ok: true };
  }

  // ── 04g-B C1 — ★ DD-RW1 random-world sibling probes ─────────────────────────────────────────

  /**
   * POST /v1/_test/effect-engine/seed-random-world-event-active
   *
   * C1 schema probe (migration 0128): insert one `random_world_event_active` row and read it back.
   * Proves: migration 0128 applied (table exists), `random_world_event_status` enum accepted,
   * `template_id` soft-ref text column (no DB FK, design §4.1) — the FK target the 3 sibling probes
   * below need.
   *
   * Body: {
   *   templateId: string, districtId: number, startedAtGameDay: number,
   *   expiresAtGameDay?: number | null, status?: string,   // default 'active'
   * }
   * @returns the inserted row.
   */
  @Post('_test/effect-engine/seed-random-world-event-active')
  @HttpCode(201)
  async seedRandomWorldEventActive(@Body() body: {
    templateId?: string;
    districtId?: number;
    startedAtGameDay?: number;
    expiresAtGameDay?: number | null;
    status?: string;
  }): Promise<Record<string, unknown>> {
    const { templateId, districtId, startedAtGameDay, expiresAtGameDay, status } = body ?? {};

    if (!templateId || districtId === undefined || startedAtGameDay === undefined) {
      throw new HttpException(
        'templateId, districtId, startedAtGameDay required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inserted = await this.db
      .insert(randomWorldEventActive)
      .values({
        template_id: templateId,
        district_id: districtId,
        started_at_game_day: startedAtGameDay,
        expires_at_game_day: expiresAtGameDay ?? null,
        status: (status as RandomWorldEventStatusEnumVal) ?? 'active',
      })
      .returning();

    const row = inserted[0] as Record<string, unknown> | undefined;
    if (!row) {
      throw new HttpException(
        'random_world_event_active row not found after insert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return row;
  }

  /**
   * POST /v1/_test/effect-engine/apply-random-world-event
   *
   * C1 probe (DD-RW1): calls the REAL `EffectModifierService.applyRandomWorldEvent(
   * randomWorldEventActiveId, modifiers)` — a single SERIALIZABLE transaction, INSERT one
   * `effect_modifier` row per entry (setting `random_world_event_active_id`), then `pg_notify`.
   * All-or-nothing proof: same shape as `apply-event` above — a deliberately invalid `scopeType`/`op`
   * for one entry forces a genuine Postgres enum-literal rejection mid-batch, proving the WHOLE batch
   * rolls back (the spec re-queries the row count via psql).
   *
   * Body: { randomWorldEventActiveId: string, modifiers: Array<{ scopeType, scopeRef?, tunableKey, op, magnitude, appliedAtGameDay, expiresAtGameDay? }> }
   * @returns 201 { applied: number } on success.
   */
  @Post('_test/effect-engine/apply-random-world-event')
  @HttpCode(201)
  async applyRandomWorldEvent(@Body() body: {
    randomWorldEventActiveId?: string;
    modifiers?: Array<{
      scopeType?: string;
      scopeRef?: string | null;
      tunableKey?: string;
      op?: string;
      magnitude?: number | string;
      appliedAtGameDay?: number;
      expiresAtGameDay?: number | null;
    }>;
  }): Promise<{ applied: number }> {
    const { randomWorldEventActiveId, modifiers } = body ?? {};

    if (!randomWorldEventActiveId || !modifiers || modifiers.length === 0) {
      throw new HttpException(
        'randomWorldEventActiveId, modifiers (non-empty) required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inputs: EffectModifierInput[] = modifiers.map((m) => {
      if (!m.scopeType || !m.tunableKey || !m.op || m.magnitude === undefined || m.appliedAtGameDay === undefined) {
        throw new HttpException(
          'each modifier requires scopeType, tunableKey, op, magnitude, appliedAtGameDay',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        scopeType: m.scopeType as EffectScopeEnumVal,
        scopeRef: m.scopeRef ?? null,
        tunableKey: m.tunableKey,
        op: m.op as EffectModifierOpEnumVal,
        magnitude: m.magnitude,
        appliedAtGameDay: m.appliedAtGameDay,
        expiresAtGameDay: m.expiresAtGameDay ?? null,
      };
    });

    const applied = await this.effectModifierService.applyRandomWorldEvent(randomWorldEventActiveId, inputs);
    return { applied };
  }

  /**
   * POST /v1/_test/effect-engine/revert-random-world-event
   *
   * C1 probe (DD-RW1): calls the REAL
   * `EffectModifierService.revertRandomWorldEvent(randomWorldEventActiveId)` → { deletedCount }.
   *
   * Body: { randomWorldEventActiveId: string }
   */
  @Post('_test/effect-engine/revert-random-world-event')
  async revertRandomWorldEvent(@Body() body: { randomWorldEventActiveId?: string }): Promise<{ deletedCount: number }> {
    const { randomWorldEventActiveId } = body ?? {};
    if (!randomWorldEventActiveId) {
      throw new HttpException('randomWorldEventActiveId required', HttpStatus.BAD_REQUEST);
    }
    const deletedCount = await this.effectModifierService.revertRandomWorldEvent(randomWorldEventActiveId);
    return { deletedCount };
  }

  /**
   * POST /v1/_test/effect-engine/reapply-random-world-event
   *
   * C1 probe (DD-RW1, design D3): calls the REAL
   * `EffectModifierService.reapplyRandomWorldEvent(randomWorldEventActiveId, modifiers)` — the NEW
   * single-transaction DELETE-then-INSERT shape (the `RecoveryCurve` day-over-day vehicle).
   *
   * Body: { randomWorldEventActiveId: string, modifiers: Array<{ scopeType, scopeRef?, tunableKey, op, magnitude, appliedAtGameDay, expiresAtGameDay? }> }
   * @returns { deletedCount: number, appliedCount: number }
   */
  @Post('_test/effect-engine/reapply-random-world-event')
  async reapplyRandomWorldEvent(@Body() body: {
    randomWorldEventActiveId?: string;
    modifiers?: Array<{
      scopeType?: string;
      scopeRef?: string | null;
      tunableKey?: string;
      op?: string;
      magnitude?: number | string;
      appliedAtGameDay?: number;
      expiresAtGameDay?: number | null;
    }>;
  }): Promise<{ deletedCount: number; appliedCount: number }> {
    const { randomWorldEventActiveId, modifiers } = body ?? {};

    if (!randomWorldEventActiveId || !modifiers || modifiers.length === 0) {
      throw new HttpException(
        'randomWorldEventActiveId, modifiers (non-empty) required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inputs: EffectModifierInput[] = modifiers.map((m) => {
      if (!m.scopeType || !m.tunableKey || !m.op || m.magnitude === undefined || m.appliedAtGameDay === undefined) {
        throw new HttpException(
          'each modifier requires scopeType, tunableKey, op, magnitude, appliedAtGameDay',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        scopeType: m.scopeType as EffectScopeEnumVal,
        scopeRef: m.scopeRef ?? null,
        tunableKey: m.tunableKey,
        op: m.op as EffectModifierOpEnumVal,
        magnitude: m.magnitude,
        appliedAtGameDay: m.appliedAtGameDay,
        expiresAtGameDay: m.expiresAtGameDay ?? null,
      };
    });

    return this.effectModifierService.reapplyRandomWorldEvent(randomWorldEventActiveId, inputs);
  }
}
