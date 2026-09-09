// IMPLEMENTS: docs/tech/04_city_simulation/system_11_deal_lek.md
//             §Invariants canoniques (Inv 1 lek = spatial attractor, sparse storage bounded by lek_tile_count;
//                                     Inv 2 score = delayed signal decaying weekly; Inv 3 control = tribute
//                                     extraction; Inv 4 contest = standoff; Inv 5 lek death = 4 weeks no deals →
//                                     DEAD; Inv 6 control_state enum never raw float; Inv 7 presence_bucket
//                                     qualitative)
//             §États LekScore (the struct — the persisted subset + the DERIVED fields) + §Sparse storage
//             §Update tick (Tick 2 Hz — Phase A inflow from System 1 + Phase B score accumulation; Tick
//                           hebdomadaire — Phase A decay + Phase B lek death + Phase C re-rank) + §enums
//             -- session:2026-06-03 (Phase 1 Task 12) --
//
// `DealLekService` — System 11 (Deal Lek). The DUAL-cadence, sparse, event-subscriber persisted system: it
// accumulates per-tile `lek_score` from FlowCellCongestedEvent (System 1) every 2 Hz tick (forming leks lazily on
// congested block-tiles) and decays/re-ranks/kills leks every in-game WEEK. It OWNS the migrated `deal_leks` table
// (PK player_id, tile_id — Inv 1 SPARSE: only tiles with score>0 exist as rows, bounded by lek_tile_count=600 —
// never a pre-seeded 600-row grid). It copies the buffer-bloat / inspection persisted-system template (repository +
// projection + controller + tunables) with the System-11-specific shape: TWO cadence slots (TWO_HZ/2 — the score
// accumulation, after System 1 Flow Cells at TWO_HZ/1; WEEKLY/1 — the decay/death/re-rank, before System 10 Buffer
// Bloat at WEEKLY/2) PLUS a FlowCellCongestedEvent SUBSCRIBER (the organic Flow→Lek driver) and a
// CohesionStateChangedEvent SUBSCRIBER (the System 5 → System 11 decay-rate modifier).
//
// THE Flow→Lek CHAIN (the ORGANIC Phase-1 driver — Inv 1 + cross_system_interactions System 1 → System 11):
//   - SUBSCRIBE to FlowCellCongestedEvent on the bus. A block-tile crossing INTO CONGESTED/SATURATED is a customer-
//     flow surge — System 11 records a PENDING formation for that (player, tile): +1 deal proxy + a day-phase-weighted
//     score accrual. The accrual is BUFFERED per-player in memory (keyed by playerId — the T10/T11 lesson, NOT
//     entity-keyed) and FLUSHED to the deal_leks rows by the 2 Hz tick (a SINGLE batched form-or-bump per tick — not
//     per-event round-trips). A NEW tile forms a lek (lazy-create) only while the player's active-lek count is under
//     the lek_tile_count bound (Inv 1); a tile that already has a lek is always bumped (never grows the row count).
//
// THE 2 Hz TICK (system_11 §Update tick 2 Hz — registered at TWO_HZ/2 = DEAL_LEK slot): drain the buffered
//   formations for the player and FORM/BUMP the deal_leks rows in ONE batched statement (Inv 1 sparse lazy-create,
//   bounded). Day-phase modifier: the accrual weight is the day-phase ActivityMultiplierBucket (DUSK peak → HIGH,
//   NIGHT off-peak → LOW; derived from the in-game minute — no separate DayPhaseTransitionEvent producer Phase 1, so
//   the phase is computed from gameMinute, documented). Phase C (contest pressure from assigned presence) is DEFERRED
//   (presence assignment is a P2 player action — no Phase-1 producer; the persisted contest_pressure stays at its
//   organic value, used by the projection for the CONTROLLED/CONTESTED mapping).
//
// THE WEEKLY TICK (system_11 §Update tick hebdomadaire — registered at WEEKLY/1 = DEAL_LEK slot):
//   - Phase A — DECAY (Inv 2): new_score = round((1 - lek_decay_rate_per_week) × score + deals_this_week). The score
//     decays even without exogenous decay; a busy lek (deals_this_week > 0) sustains its score, a quiet one erodes.
//     If the district is THAWED (CohesionStateChangedEvent received — System 5 → System 11), the effective decay is
//     AGGRAVATED (×1.5 — cohesion erosion accelerates lek disappearance; the factor is internal, never exposed).
//   - Phase B — LEK DEATH (Inv 5): if deals_this_week == 0, increment weeks_without_deals; at >= 4 → control_state =
//     DEAD + emit LekDeathEvent (the tile keeps its historical score — does NOT reset to 0 — but stops attracting).
//     If deals_this_week > 0, reset weeks_without_deals = 0. Always reset deals_this_week = 0 after the decay used it.
//   - Phase C — RE-RANK (leks_per_district): per district, sort by score desc, mark the top-N as active (the
//     demoted tiles keep their score but are no longer top-N — a soft transition; the row is NOT deleted, so the
//     sparse set stays stable). The re-rank does not change the persisted columns (it is a presentation/attraction
//     marker — the active flag is DERIVED at projection time from the per-district rank, see the projection service).
//   - Phase D — CONTEST RESOLUTION (the control-flip) is DEFERRED: a flip needs sustained presence (P2 player
//     action — no Phase-1 producer). The organic contest_pressure (from the seeded/flow state) drives the
//     CONTROLLED/CONTESTED projection mapping but no flip occurs day-1 (documented — the task's honest deferral).
//
// IN-MEMORY STATE KEYED BY PLAYERID (the T10/T11 review lesson — NOT entity-keyed): the per-player working state (the
// buffered Flow→Lek formations + the per-district THAWED decay-modifier flags + the per-tile weeks_without_deals
// counter — none of which are deal_leks columns) is keyed BY playerId. The weeks_without_deals counter is REBUILT
// from the current lek set each weekly tick (a removed/absent lek leaves no stale entry — only tiles that still exist
// carry forward). The buffered formations are DRAINED (cleared) each 2 Hz tick.
//
// DETERMINISM (NO RNG): the score accrual (a fixed day-phase weight × the congested-event count), the decay
// (round((1 - rate) × score + deals)), and the death detection are FIXED functions of the persisted ints + the
// gameMinute + the tunables. Two players with identical seeds + identical advances land on identical persisted ints
// + bands (the E2E determinism assertion). The Flow→Lek formations are deterministic because System 1's flow sim is
// deterministic (no RNG) — identically-advanced players congest identical tiles.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import {
  CityEventBus,
  type FlowCellCongestedEvent,
  type CohesionStateChangedEvent,
} from '../events/city-event-bus';
// W3.U2 C2 (D8 v3 MINOR W7) — the shared quarter-of-day-index function `dayPhaseBucket` below is built
// on. Extracted here so the district-interior `day_phase` resolver can share the SAME formula instead of
// recopying the boundaries (déférence mutuelle). `citySimTunables` is no longer read directly in this
// file — the shared function reads it.
import { quarterIndexForGameMinute } from '../day-phase-quarter';
import { dealLekTunables } from './deal-lek-tunables';
import {
  DealLekRepository,
  LEK_SCORE_MAX,
  type DealLekRow,
  type LekFormation,
  type WeeklyMutation,
} from './deal-lek.repository';

/** The closed day-phase activity-multiplier domain (system_11 §enum ActivityMultiplierBucket). Internal. */
type ActivityMultiplierBucket = 'LOW' | 'MEDIUM' | 'HIGH';

/** The score-accrual weight per ActivityMultiplierBucket (system_11 §Update tick 2 Hz Phase B step 2). Internal. */
const ACTIVITY_WEIGHT: Record<ActivityMultiplierBucket, number> = { LOW: 0.5, MEDIUM: 1.0, HIGH: 2.0 };

/** Lek dies after this many consecutive weeks with no deals (Inv 5). */
const WEEKS_WITHOUT_DEALS_TO_DIE = 4;

/** The aggravated-decay multiplier for a THAWED district (system_11 §Update tick cohesion modifier — internal). */
const THAWED_DECAY_AGGRAVATION = 1.5;

/** The base lek-score accrual per congested-tile event (the customer-flow surge proxy — internal, day-phase weighted). */
const BASE_SCORE_ACCRUAL_PER_CONGESTION = 4;

/**
 * The buffered per-player working state (the parts NOT persisted on deal_leks). Keyed BY PLAYERID at the top level
 * (the T10/T11 lesson — never entity-keyed). `formations` buffers the Flow→Lek surges between 2 Hz ticks (drained
 * each tick). `thawedDistricts` holds the districts currently THAWED (System 5 → aggravated decay). `weeksWithoutDeals`
 * is the per-tile lek-death counter (rebuilt from the current lek set each weekly tick — no stale entries).
 */
interface PlayerLekState {
  /** Buffered Flow→Lek formations since the last 2 Hz tick (tile_id → accumulated {score, deals, controller}). */
  formations: Map<number, { score: number; deals: number; controllerOrgId: number }>;
  /** Districts currently THAWED (System 5 → System 11 decay-rate modifier; cleared on a non-THAWED transition). */
  thawedDistricts: Set<number>;
  /** Per-tile consecutive-weeks-without-deals counter (Inv 5 lek death; rebuilt each weekly tick — no stale keys). */
  weeksWithoutDeals: Map<number, number>;
}

@Injectable()
export class DealLekService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DealLekService.name);

  /**
   * Per-player in-memory working state, keyed by playerId (the T10/T11 lesson — NOT keyed by tile_id at the top
   * level). Server-truth working state (rebuilt empty on restart — the buffer-bloat precedent; the PERSISTED truth is
   * deal_leks). The weeks_without_deals counter rebuilds from the persisted lek set each weekly tick.
   */
  private readonly players = new Map<string, PlayerLekState>();

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: DealLekRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: subscriptions + registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.subscribeToFlowCongestion();
    this.subscribeToCohesion();
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Subscribe to FlowCellCongestedEvent (System 1 → System 11 — the ORGANIC Flow→Lek driver, Inv 1). A block-tile
   * crossing INTO CONGESTED/SATURATED is a customer-flow surge → buffer a formation for that (player, tile). The
   * handler is synchronous (the bus emits sync) — it only updates the in-memory buffer; the actual form/bump runs at
   * the next 2 Hz tick (a batched flush, not per-event round-trips).
   */
  private subscribeToFlowCongestion(): void {
    this.bus.onFlowCellCongested((e) => this.handleFlowCongested(e));
  }

  /**
   * Subscribe to CohesionStateChangedEvent (System 5 → System 11 — the decay-rate modifier, system_11 §Update tick
   * cohesion modifier). A transition TO THAWED marks the district for AGGRAVATED weekly decay; a transition AWAY
   * from THAWED clears it (the decay returns to NORMAL). Synchronous handler — only updates the in-memory set.
   */
  private subscribeToCohesion(): void {
    this.bus.onCohesionStateChanged((e) => this.handleCohesionStateChanged(e));
  }

  /**
   * Register the TWO cadence slots System 11 occupies (the registry contract — System 11 has TWO slots per the
   * SCHEDULE): TWO_HZ/2 (DEAL_LEK — the score accumulation, after System 1 Flow Cells at TWO_HZ/1, before System 2
   * Sparse Citizens at TWO_HZ/3) and WEEKLY/1 (DEAL_LEK — the decay/death/re-rank, before System 10 Buffer Bloat at
   * WEEKLY/2). Each registration REPLACES the no-op placeholder the SCHEDULE seeded for that exact slot.
   */
  private registerCadences(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.DEAL_LEK,
      cadence: Cadence.TWO_HZ,
      order: 2,
      run: (ctx) => this.runTwoHzTick(ctx),
    });
    this.scheduler.registerSystem({
      id: CitySystemId.DEAL_LEK,
      cadence: Cadence.WEEKLY,
      order: 1,
      run: (ctx) => this.runWeeklyTick(ctx),
    });
  }

  /** F4 RAM budget log (system_11 §RAM budget): LekScore × ≤600 active leks × N players (sparse). */
  private logRamBudget(): void {
    this.logger.log(
      `Deal Lek per-player RAM budget ≈ 9.6 KB (LekScore PERSISTED on deal_leks, ~16 B × ≤${dealLekTunables.lekTileCount} ` +
        `active leks SPARSE — Inv 1; only tiles with score>0 exist, never a pre-seeded grid). TWO_HZ/2 tick (Flow→Lek ` +
        `score accumulation from FlowCellCongestedEvent — the organic Phase-1 driver) + WEEKLY/1 tick (decay Inv 2 + ` +
        `lek death Inv 5 + re-rank). SUBSCRIBES FlowCellCongestedEvent (System 1, organic driver) + ` +
        `CohesionStateChangedEvent THAWED (System 5, aggravated decay). EMITS LekDeathEvent (emit-only day-1 — Unity ` +
        `marker retirement wires T14/P2). Controller-org convention: org ${0} = player org for organic leks (rivals ` +
        `1..4 coil/tarcum/iron_throat/saltline). Player-deal tribute economy + presence-contest flip + 04a ` +
        `selling.lek_* composites DEFERRED Phase 1 (P2/operations — documented).`,
    );
  }

  // ───────────────────────────── event handlers (in-memory buffers) ─────────────────────────────

  /**
   * Handle a FlowCellCongestedEvent (the organic Flow→Lek surge — Inv 1). Only INTO-CONGESTION transitions matter (a
   * tile crossing to CONGESTED or SATURATED is a customer-flow surge that feeds the lek); a transition BACK to NORMAL
   * is not a surge. Buffer a day-phase-weighted score accrual + a deal proxy for that (player, tile). The controller
   * org for a NEWLY-formed organic lek is the PLAYER ORG (org 0 — the player-org convention; a lek formed from the
   * player's own flow sim is the player's to contest/control. Rivals 1..4 are P2/operations-driven).
   */
  handleFlowCongested(e: FlowCellCongestedEvent): void {
    // INTO-congestion only: SATURATED or CONGESTED is a surge; NORMAL is not (the customer flow ebbed).
    if (e.to !== 'CONGESTED' && e.to !== 'SATURATED') return;
    const st = this.stateFor(e.playerId);
    const weight = ACTIVITY_WEIGHT[this.dayPhaseBucket(e.gameMinute)];
    // A SATURATED surge feeds the lek more than a merely-CONGESTED one (a stronger customer-flow signal).
    const intensity = e.to === 'SATURATED' ? 2 : 1;
    const scoreDelta = Math.max(1, Math.round(BASE_SCORE_ACCRUAL_PER_CONGESTION * weight * intensity));
    const prior = st.formations.get(e.blockId);
    st.formations.set(e.blockId, {
      score: (prior?.score ?? 0) + scoreDelta,
      deals: (prior?.deals ?? 0) + intensity,
      controllerOrgId: prior?.controllerOrgId ?? this.playerOrgId(),
    });
  }

  /**
   * Handle a CohesionStateChangedEvent (System 5 → System 11 decay modifier). On a transition TO THAWED: mark the
   * district for AGGRAVATED weekly decay (the cohesion erosion accelerates lek disappearance). On a transition AWAY
   * from THAWED (STABLE/FRAGILE): clear the district's aggravated-decay flag (the decay returns to NORMAL).
   */
  handleCohesionStateChanged(e: CohesionStateChangedEvent): void {
    const st = this.stateFor(e.playerId);
    if (e.to === 'THAWED') st.thawedDistricts.add(e.districtId);
    else st.thawedDistricts.delete(e.districtId);
  }

  private stateFor(playerId: string): PlayerLekState {
    let st = this.players.get(playerId);
    if (!st) {
      st = { formations: new Map(), thawedDistricts: new Set(), weeksWithoutDeals: new Map() };
      this.players.set(playerId, st);
    }
    return st;
  }

  // ───────────────────────────── the registered 2 Hz tick (Flow→Lek accumulation) ─────────────────────────────

  /**
   * {TWO_HZ, order 2} — the lek-score accumulation tick (system_11 §Update tick 2 Hz). Drains the buffered Flow→Lek
   * formations for the player and FORMS/BUMPS the deal_leks rows in ONE batched statement (Inv 1 sparse lazy-create,
   * bounded by lek_tile_count). NEW tiles form a lek only while the active-lek count is under the bound; tiles that
   * already have a lek are always bumped. Deterministic (System 1's flow sim is RNG-free → identical congestion →
   * identical formations). Organically the formations come from System 1's congestion this tick.
   */
  private async runTwoHzTick(ctx: CitySimTickContext): Promise<void> {
    const st = this.players.get(ctx.playerId);
    if (!st || st.formations.size === 0) return; // no congestion buffered this tick → nothing to form.

    // Drain the buffer (clear it — the surges are consumed this tick; the T10/T11 "no stale state" discipline).
    const drained = st.formations;
    st.formations = new Map();

    // Split formations into BUMPS (tiles that already have a lek — always apply) and NEW tiles (bounded by
    // lek_tile_count). We need the current active-lek set + count to enforce the bound (Inv 1).
    const existing = await this.repo.listLeks(ctx.playerId);
    const existingTiles = new Set(existing.map((r) => r.tile_id));
    let activeCount = existing.length;
    const bound = dealLekTunables.lekTileCount;

    const formations: LekFormation[] = [];
    // Deterministic ordering (tile_id asc) so the bound is applied to the same tiles for identical inputs.
    const tiles = [...drained.keys()].sort((a, b) => a - b);
    for (const tile of tiles) {
      const f = drained.get(tile)!;
      if (existingTiles.has(tile)) {
        // Bump an existing lek — never grows the row count, so it always applies.
        formations.push({ tile_id: tile, score_delta: f.score, deals_delta: f.deals, controller_org_id: f.controllerOrgId });
      } else if (activeCount < bound) {
        // Form a NEW lek (lazy-create) — only while under the lek_tile_count bound (Inv 1 sparse storage).
        formations.push({ tile_id: tile, score_delta: f.score, deals_delta: f.deals, controller_org_id: f.controllerOrgId });
        activeCount += 1;
      }
      // else: the bound is reached — drop the new-tile formation this tick (the active-lek set is full).
    }

    if (formations.length > 0) await this.repo.formLeks(ctx.playerId, formations);
  }

  // ───────────────────────────── the registered WEEKLY tick (decay / death / re-rank) ─────────────────────────────

  /**
   * {WEEKLY, order 1} — the decay/death/re-rank tick (system_11 §Update tick hebdomadaire). For every active lek:
   * Phase A decay (Inv 2 — round((1 - rate) × score + deals_this_week), aggravated ×1.5 if the district is THAWED),
   * Phase B lek death (Inv 5 — weeks_without_deals >= 4 → DEAD + LekDeathEvent; the tile keeps its historical score),
   * reset deals_this_week. Phase C re-rank is a DERIVED presentation marker (computed at projection time — the row is
   * not mutated). Persists the whole batch in ONE UPDATE. Rebuilds the per-tile weeks_without_deals counter fresh
   * (the T10/T11 lesson — a removed lek leaves no stale entry). Deterministic (NO RNG).
   */
  private async runWeeklyTick(ctx: CitySimTickContext): Promise<void> {
    const leks = await this.repo.listLeks(ctx.playerId);
    if (leks.length === 0) {
      // No leks → drop any stale per-player weeks-counter (replace, not leak — the T10/T11 lesson).
      const st = this.stateFor(ctx.playerId);
      st.weeksWithoutDeals = new Map();
      return;
    }

    const st = this.stateFor(ctx.playerId);
    const priorWeeks = st.weeksWithoutDeals;
    // REBUILD the weeks-counter fresh from the current lek set (only tiles that still exist carry forward).
    const weeksWithoutDeals = new Map<number, number>();

    const mutations: WeeklyMutation[] = [];
    // Collect cross-system emissions to fire AFTER the persist (observe → persist → notify ordering).
    const emissions: Array<() => void> = [];

    for (const lek of leks) {
      // ── Phase A — DECAY (Inv 2): new_score = round((1 - effRate) × score + deals_this_week). ──
      const aggravated = st.thawedDistricts.has(lek.district_id);
      const effRate = aggravated
        ? Math.min(1, dealLekTunables.lekDecayRatePerWeek * THAWED_DECAY_AGGRAVATION)
        : dealLekTunables.lekDecayRatePerWeek;
      // Clamp to [0, LEK_SCORE_MAX] (the uint8 score ceiling — Inv 2; the continuous flow deal stream would
      // otherwise grow the score unbounded). A busy lek saturates at the cap; a quiet one decays toward 0.
      const decayed = Math.min(LEK_SCORE_MAX, Math.max(0, Math.round((1 - effRate) * lek.lek_score + lek.deals_this_week)));

      // ── Phase B — LEK DEATH (Inv 5): no deals this week → increment the weeks counter; >= 4 → DEAD + event. ──
      const priorCount = priorWeeks.get(lek.tile_id) ?? 0;
      let weeks: number;
      if (lek.deals_this_week === 0) {
        weeks = priorCount + 1;
        if (weeks >= WEEKS_WITHOUT_DEALS_TO_DIE) {
          // DEAD: the tile keeps its historical score (do NOT zero it) but stops attracting (Inv 5). Emit once,
          // on the FIRST tick it reaches death (priorCount was just below the threshold).
          if (priorCount < WEEKS_WITHOUT_DEALS_TO_DIE) {
            const playerId = ctx.playerId;
            const districtId = lek.district_id;
            const tileId = lek.tile_id;
            const lastControllerOrgId = lek.controller_org_id;
            const gameMinute = ctx.gameMinute;
            emissions.push(() =>
              this.bus.emitLekDeath({
                type: 'lek_death',
                playerId,
                districtId,
                tileId,
                lastControllerOrgId,
                gameMinute,
              }),
            );
          }
        }
      } else {
        weeks = 0; // a deal this week resets the death counter.
      }
      weeksWithoutDeals.set(lek.tile_id, weeks);

      mutations.push({
        tile_id: lek.tile_id,
        lek_score: decayed,
        deals_this_week: 0, // reset after the decay consumed it (Inv 2 — deals_this_week feeds next week from 0).
        contest_pressure: lek.contest_pressure, // unchanged (the contest-flip is DEFERRED P2 — documented).
      });
    }

    if (mutations.length > 0) await this.repo.applyWeekly(ctx.playerId, mutations);
    // REPLACE the per-player weeks-counter (never mutate-in-place — the T10/T11 lesson; rebuilt fresh above).
    st.weeksWithoutDeals = weeksWithoutDeals;
    // Notify AFTER the persist so consumers observe the committed state (ordered side-effects).
    for (const emit of emissions) emit();
  }

  /**
   * TEST-ONLY: run System 11's WEEKLY tick ONCE for a player, in isolation from the 2 Hz flow band. The
   * deterministic advance harness runs ALL cadences together, so a real WEEKLY decay/death is masked by the
   * continuous FlowCellCongested deal stream (System 1's flow sim re-congests every tile each time its population
   * re-crosses the congestion boundary — a flow-active tile never goes quiet, so it never dies and its score
   * saturates at the cap). This hook drives the IDENTICAL weekly tick the scheduler fires at WEEKLY/1 — the same
   * category of test infrastructure as the CitySimTestController.emitCohesionState hook (which exists for the same
   * reason: a real transition is not reachable through the always-on advance harness). It is production-gated the
   * same way (the test controller mounts only when NODE_ENV != 'production'). NOT a gameplay path — the live
   * weekly tick is the real one; this isolates it for the deterministic decay/death E2E.
   */
  async runWeeklyTickForTest(playerId: string, gameMinute: number): Promise<void> {
    await this.runWeeklyTick({ playerId, cadence: Cadence.WEEKLY, gameMinute });
  }

  // ───────────────────────────── day-phase modifier (derived from the in-game clock — no separate producer) ─────

  /**
   * The day-phase ActivityMultiplierBucket for an in-game minute (system_11 §enum ActivityMultiplierBucket: DUSK →
   * HIGH peak commercial; NIGHT → LOW off-peak; DAY → MEDIUM baseline; DAWN → LOW). DERIVED from the in-game minute
   * modulo the in-game day length (NO separate DayPhaseTransitionEvent producer Phase 1 — the phase is computed, not
   * received; documented). The day is split into 4 quarters: DAWN [0,6h) → LOW, DAY [6h,12h) → MEDIUM, DUSK [12h,18h)
   * → HIGH, NIGHT [18h,24h) → LOW. Deterministic (a fixed function of gameMinute).
   *
   * W3.U2 C2 (D8 v3 MINOR W7) — the quarter-index arithmetic (minute-of-day fraction of the in-game day, ×4,
   * floored) is EXTRACTED to `quarterIndexForGameMinute` (`../day-phase-quarter.ts`) — the SAME formula, now
   * shared with the district-interior `day_phase` resolver (DAWN/DAY/DUSK/NIGHT) instead of being recopied.
   * This mapping (quarter → LOW/MEDIUM/HIGH) is unchanged and stays HERE — it is this system's OWN domain,
   * not a boundary. Non-regression: for any gameMinute this returns the byte-identical bucket the inline
   * formula did before extraction (see implementation-notes.md §RUNS DIFFÉRÉS for the E2E that pins this).
   */
  private dayPhaseBucket(gameMinute: number): ActivityMultiplierBucket {
    const quarter = quarterIndexForGameMinute(gameMinute);
    if (quarter === 1) return 'MEDIUM'; // DAY (06:00–12:00) — baseline.
    if (quarter === 2) return 'HIGH'; // DUSK (12:00–18:00) — peak commercial.
    return 'LOW'; // DAWN (00:00–06:00) + NIGHT (18:00–24:00) — off-peak.
  }

  /** The player-org convention: org 0 = the player's org (a lek formed organically from the player's flow sim). */
  private playerOrgId(): number {
    return 0;
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * The active leks for ONE district (the projection read). Returns the raw deal_lek rows (lek_score /
   * contest_pressure ints); the projection derives the LekControlState / score band / presence buckets from them +
   * the per-district rank, never forwarding the raw ints (R2.2 / Inv 6). Empty for a district with no leks (the
   * organic sparse-storage shape).
   */
  async listLeksForDistrict(playerId: string, districtId: number): Promise<DealLekRow[]> {
    return this.repo.listLeksForDistrict(playerId, districtId);
  }

  /** Whether a tile is DEAD (weeks_without_deals >= 4) — the projection's DEAD control-state input (Inv 5). */
  isDead(playerId: string, tileId: number): boolean {
    return (this.players.get(playerId)?.weeksWithoutDeals.get(tileId) ?? 0) >= WEEKS_WITHOUT_DEALS_TO_DIE;
  }

  /** The contest threshold (normalized 0..1) the projection uses to map contest_pressure → CONTROLLED/CONTESTED. */
  get contestThresholdPresence(): number {
    return dealLekTunables.contestThresholdPresence;
  }

  /** 04g-B C3 (S7 wire) — the DISTRICT-scoped variant, passthrough to `dealLekTunables.contestThresholdPresenceFor`
   *  (mirrors this getter's own plain-passthrough shape). Empty overlay → byte-identical to the plain getter above. */
  contestThresholdPresenceFor(districtId: number): number {
    return dealLekTunables.contestThresholdPresenceFor(districtId);
  }

  /** The leks-per-district rank bound (the projection's active-lek marker — Phase C re-rank, DERIVED). */
  get leksPerDistrict(): number {
    return dealLekTunables.leksPerDistrict;
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 422). */
  isValidDistrict(districtId: number): boolean {
    return Number.isInteger(districtId) && districtId >= 1 && districtId <= dealLekTunables.districtCount;
  }
}
