// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C5 ("`PressureTierService.
//             onGraduation` (<- `GraduationCommittedEvent`, D8 ratchet: guarded increment ... at
//             `pressure_tier_unlock_graduation_count` -> `pressure_tier`+1 + `PressureTierUnlockedEvent` +
//             count reset; reaching T4 -> stamp `tier4_observation_until_tick`)" + "`PressureTierService.
//             onSessionStart` (<- `SessionOpenedEvent`, D9: budget-reset projection + lazy T4-observation-
//             expiry ... emit `PressureTierObservationExpiredEvent` once + clear)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §8.1 (the ratchet)
//             + D9 (elapsed-real-time-at-read, lazy emit) + §8.2 (★H-1 RATIFIED Option B — the cap
//             reconciliation, realized here via `pressure-cap-cache.ts`'s write-through seam).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §7/R5 (the getter
//             modulation needs zero DI wiring) + §11/R9 (elapsed real-time = plain wall-clock arithmetic on
//             the `timestamptz` columns, no helper).
//             Pattern (bus subscribe + per-listener isolation, a public core method BOTH the real
//             subscriber AND the E2E floor can call directly, Lesson #3 — zero live-vs-test divergence):
//             `player-proficiency-seeder.service.ts` (`onApplicationBootstrap` + `bus.onXxx((e) =>
//             this.handleXxx(e).catch(...))`) / `degraded-category-pressure-producer.service.ts` (the SAME
//             `processSessionOpened(playerId, sessionId, gameMinute)` public-method shape for a
//             `SessionOpenedEvent` subscriber). Pattern (atomic crossing-detection via `RETURNING`, never a
//             separate before/after read): `capability-debts.repository.ts#applyUpgrade`/`ActiveDecayRow`
//             (a POST-write value crossing a fixed boundary IS the signal) — realized in
//             `ProgressionRepository.recordGraduationAndMaybeAdvancePressureTier`'s own header.
//             C9 ADDS (design §11 — the BO surface): `forceSetTier` (the admin `pressure-tier/force-set`
//             override — the ★H-1 value-sensitivity proof through the REAL BO surface) + the
//             `tier4ObservationUntilStamp` hoist (fix-in-passing, zero behavior change — `onGraduation` now
//             calls the SAME shared private helper `forceSetTier` uses).
//             — P3-H C5 — 2026-07-24 / C9 — 2026-07-25
//
// `PressureTierService` — the ★H-1 cap-reconciliation's TWO writers (design §8): `onGraduation` (the
// graduation ratchet, D8) and `onSessionStart` (the T4-observation lazy-expiry, D9). BOTH writers
// immediately write-through to `pressureCapCache` (`core_loops/pressure-cap-cache.ts`) after their OWN DB
// write lands — the synchronous seam `structuralCapForPlayer` reads (that file's own header carries the
// full "why a cache, not a DB read" account). Also owns the `GET /v1/meta/pressure` read projection
// (`getProjection`) — a plain async READ, no cache dependency of its own for `decisions_remaining` (it
// calls the SAME canonical getter, DD-H2 "single reader-of-truth") and a FRESH DB read for `observation_
// remaining_h` (display-only diagnostic accuracy, independent of cache staleness).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import {
  CityEventBus,
  type GraduationCommittedEvent,
  type SessionOpenedEvent,
  type PressureTierUnlockedEvent,
  type PressureTierObservationExpiredEvent,
} from '../citysim/events/city-event-bus';
import { coreLoopsTunables } from '../core_loops/core-loops-tunables';
import { pressureCapCache } from '../core_loops/pressure-cap-cache';
import { ProgressionRepository } from '../progression/progression.repository';
import { metaProgressionTunables } from './meta-progression-tunables';

/** `GET /v1/meta/pressure`'s response shape (design §10 — the `DecisionLoadTierComposite` contract:
 *  `{pressure_tier, decisions_remaining, decisions_this_session_display, observation_remaining_h?}`).
 *  `observation_remaining_h` is OMITTED entirely (never `0`) when no window is open — the canon-sanctioned
 *  numeric-exception convention this lot's other projections follow (design §10's own ALLOWED_KEYS list). */
export interface PressureProjection {
  readonly pressure_tier: number;
  readonly decisions_remaining: number;
  readonly decisions_this_session_display: number;
  readonly observation_remaining_h?: number;
}

/** `meta.decisions_per_session_display_t{1-4}` — the D7/divergence #3 DISPLAY cadence getter for the
 *  player's CURRENT `pressure_tier` (never the enforced axis — see this file's own `getProjection`). */
function displayCadenceForTier(tier: number): number {
  switch (tier) {
    case 1: return metaProgressionTunables.decisionsPerSessionDisplayT1;
    case 2: return metaProgressionTunables.decisionsPerSessionDisplayT2;
    case 3: return metaProgressionTunables.decisionsPerSessionDisplayT3;
    default: return metaProgressionTunables.decisionsPerSessionDisplayT4; // tier 4 (the domain ceiling, R6 1..4).
  }
}

@Injectable()
export class PressureTierService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PressureTierService.name);

  /** In-memory test-probe arrays (never used in production paths) — mirrors `HorizonTierAdvancementService`'s
   *  own `advancedEvents` shape: pushed IN-LINE right where THIS class calls `bus.emit...`. */
  private unlockedEvents: PressureTierUnlockedEvent[] = [];
  private observationExpiredEvents: PressureTierObservationExpiredEvent[] = [];

  constructor(
    private readonly progressionRepo: ProgressionRepository,
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onGraduationCommitted((event: GraduationCommittedEvent) => {
      this.handleGraduationCommitted(event).catch((err) =>
        this.logger.error(`graduation_committed pressure-tier ratchet failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onSessionOpened((event: SessionOpenedEvent) => {
      this.handleSessionOpened(event).catch((err) =>
        this.logger.error(`session_opened pressure-tier observation-expiry failed (contained): ${errMsg(err)}`),
      );
    });
  }

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  getUnlockedEvents(): readonly PressureTierUnlockedEvent[] {
    return this.unlockedEvents;
  }
  getObservationExpiredEvents(): readonly PressureTierObservationExpiredEvent[] {
    return this.observationExpiredEvents;
  }
  clearProbeEvents(): void {
    this.unlockedEvents = [];
    this.observationExpiredEvents = [];
  }

  // ── the graduation ratchet (design §8.1/D8) ─────────────────────────────────────────────────────

  /**
   * `PlayerProficiencySeeder`'s own "public so the E2E floor CAN drive it directly on a known event too"
   * shape — the SAME method the REAL `GraduationCommittedEvent` subscriber calls (Lesson #3, zero
   * live-vs-test divergence); the C5 falsifiable floor exercises the REAL end-to-end P3-F graduation flow
   * (fixture-repeated per the plan's own "fixture N graduations ... via REAL P3-F graduation" wording).
   * Guarded-increments `graduation_count_since_last_pressure_unlock`; at the threshold (AND `pressure_tier
   * < 4`) advances the tier, resets the count, and — ONLY on the T3->T4 transition — stamps `tier4_
   * observation_until_tick = now + pressure_tier4_observation_phase_h` (real wall-clock arithmetic, D9/
   * C0-reanchor R9, no helper). Write-throughs `pressureCapCache` UNCONDITIONALLY after the DB write lands
   * (even on a non-unlock increment — cheap, and keeps the cache honest for the T4-already-open case where
   * a LATER graduation merely increments a now-inert count without changing the window).
   */
  async onGraduation(playerId: string, gameMinute: number): Promise<void> {
    await this.progressionRepo.ensureRow(playerId);
    const threshold = metaProgressionTunables.pressureTierUnlockGraduationCount;
    const observationUntilIfT4 = this.tier4ObservationUntilStamp();

    const result = await this.progressionRepo.recordGraduationAndMaybeAdvancePressureTier(playerId, threshold, observationUntilIfT4);
    pressureCapCache.setObservationUntil(playerId, result.tier4ObservationUntilTick);

    if (!result.unlocked) return;

    const event: PressureTierUnlockedEvent = {
      type: 'pressure_tier_unlocked',
      playerId,
      newTier: result.pressureTier,
      observationOpen: result.tier4ObservationUntilTick !== null,
      gameMinute,
    };
    this.bus.emitPressureTierUnlocked(event);
    this.unlockedEvents.push(event);
    this.logger.log(
      `PRESSURE_TIER_UNLOCKED: player=${playerId} tier=${result.pressureTier}` +
        (result.tier4ObservationUntilTick ? ` observation_until=${result.tier4ObservationUntilTick.toISOString()}` : ''),
    );
  }

  private async handleGraduationCommitted(event: GraduationCommittedEvent): Promise<void> {
    await this.onGraduation(event.playerId, event.gameMinute);
  }

  // ── the T4 observation lazy-expiry (design D9) ──────────────────────────────────────────────────

  /**
   * The SAME "public core method, real subscriber AND test floor both call" shape as `onGraduation` above.
   * `now` derives WITHIN this method (never threaded from the caller) — the real `SessionOpenedEvent`
   * subscriber and any future direct caller both get the SAME "at read time" semantics D9 specifies.
   * `clearExpiredObservationWindow`'s guarded UPDATE only matches (and only THEN emits) when a genuinely
   * open window has ACTUALLY elapsed; every other call (no window, or a window still open) falls through
   * to a defensive cache resync ONLY — keeps `pressureCapCache` honest against DB truth on every session
   * open (closes the cold-start gap `pressure-cap-cache.ts`'s own header discloses) without ever emitting a
   * second `PressureTierObservationExpiredEvent` for the same window.
   */
  async onSessionStart(playerId: string, gameMinute: number): Promise<void> {
    const now = new Date();
    const result = await this.progressionRepo.clearExpiredObservationWindow(playerId, now);
    if (result.cleared) {
      pressureCapCache.setObservationUntil(playerId, null);
      const event: PressureTierObservationExpiredEvent = {
        type: 'pressure_tier_observation_expired',
        playerId,
        pressureTier: result.pressureTier,
        gameMinute,
      };
      this.bus.emitPressureTierObservationExpired(event);
      this.observationExpiredEvents.push(event);
      this.logger.log(`PRESSURE_TIER_OBSERVATION_EXPIRED: player=${playerId} tier=${result.pressureTier}`);
      return;
    }
    const state = await this.progressionRepo.getPressureState(playerId);
    pressureCapCache.setObservationUntil(playerId, state.tier4ObservationUntilTick);
  }

  private async handleSessionOpened(event: SessionOpenedEvent): Promise<void> {
    await this.onSessionStart(event.playerId, event.gameMinute);
  }

  // ── GET /v1/meta/pressure projection (design §10 — the DecisionLoadTierComposite contract) ────────

  /**
   * `decisions_remaining` reads the SAME canonical `structuralCapForPlayer` getter the governor itself
   * enforces (DD-H2 "single reader-of-truth" — never a re-derived shadow cap) minus the player's REAL
   * `structural_decisions_this_session`, floored at 0. `decisions_this_session_display` is the CURRENT
   * tier's 12/8/4/2 DISPLAY cadence (D7/divergence #3 — non-enforced, a DIFFERENT axis from `decisions_
   * remaining`; the C5 falsifiable floor asserts these two genuinely diverge at T1, proving DISPLAY !=
   * ENFORCED). `observation_remaining_h` is a FRESH DB read (never the cache — a diagnostic GET has no
   * synchronous-call constraint, so it can afford the extra accuracy), omitted when no window is open.
   */
  async getProjection(playerId: string): Promise<PressureProjection> {
    const [state, used] = await Promise.all([
      this.progressionRepo.getPressureState(playerId),
      this.progressionRepo.getStructuralDecisionsThisSession(playerId),
    ]);
    const cap = coreLoopsTunables.structuralCapForPlayer(playerId);
    const decisionsRemaining = Math.max(0, cap - used);

    const projection: PressureProjection = {
      pressure_tier: state.pressureTier,
      decisions_remaining: decisionsRemaining,
      decisions_this_session_display: displayCadenceForTier(state.pressureTier),
    };
    if (state.tier4ObservationUntilTick && state.tier4ObservationUntilTick.getTime() > Date.now()) {
      const hoursRemaining = (state.tier4ObservationUntilTick.getTime() - Date.now()) / 3_600_000;
      return { ...projection, observation_remaining_h: Math.max(0, Math.round(hoursRemaining * 10) / 10) };
    }
    return projection;
  }

  // ── P3-H C9 (design §11) — the admin force-set override (the ★H-1 value-sensitivity proof surface) ──

  /**
   * `real wall-clock stamp for a NEW T4 observation window` — hoisted out of `onGraduation` (C9
   * fix-in-passing, zero behavior change: byte-identical formula, now shared with `forceSetTier` below
   * rather than duplicated) so BOTH the organic T3->T4 unlock AND the admin force-set stamp the window
   * IDENTICALLY (`now + pressure_tier4_observation_phase_h` hours, D9/C0-reanchor R9 — plain wall-clock
   * arithmetic, no helper).
   */
  private tier4ObservationUntilStamp(): Date {
    return new Date(Date.now() + metaProgressionTunables.pressureTier4ObservationPhaseH * 3_600_000);
  }

  /**
   * `POST /v1/admin/meta/pressure-tier/force-set` (design §11) — the admin override. See
   * `ProgressionRepository.forceSetPressureTier`'s own header for the full "why the observation window is
   * ALSO stamped at T4, and cleared otherwise" account (this method is a thin orchestration over that
   * single UPDATE). Write-throughs `pressureCapCache` UNCONDITIONALLY after the DB write lands — the SAME
   * "DB write, THEN cache write-through" ordering `onGraduation`/`onSessionStart` already establish — so
   * the VERY NEXT synchronous `structuralCapForPlayer` call, even within the SAME request/response cycle,
   * already reads the fresh value (no polling needed, unlike the organic ratchet's own async event-handler
   * path). `tier` validation (1..4, integer) is the CALLER'S contract (`VerticalHorizonAdminController`,
   * mirrors every OTHER admin body-validation-in-the-controller precedent this lot's siblings establish).
   */
  async forceSetTier(playerId: string, tier: number): Promise<{ pressureTier: number; tier4ObservationUntilTick: Date | null }> {
    const observationUntil = tier >= 4 ? this.tier4ObservationUntilStamp() : null;
    const result = await this.progressionRepo.forceSetPressureTier(playerId, tier, observationUntil);
    pressureCapCache.setObservationUntil(playerId, result.tier4ObservationUntilTick);
    return result;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
