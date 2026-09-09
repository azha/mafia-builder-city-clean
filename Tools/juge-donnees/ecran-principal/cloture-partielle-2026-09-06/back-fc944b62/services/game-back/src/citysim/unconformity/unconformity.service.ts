// IMPLEMENTS: docs/tech/04_city_simulation/system_7_unconformity_ledgers.md
//             §Invariants canoniques (Inv 1 deviation_score opaque — never raw sigma; Inv 2 cadence DAILY not
//                                     30m/6h; Inv 3 per-building two-tier compression-by-promotion; Inv 4
//                                     audit_pin_state composite {pinned_at,pinned_until,suppression_active}; Inv 6
//                                     mismatch_score = read accessor exposed to System 6; Inv 7 suppression =
//                                     consequence of pin, not of deviation)
//             §États UnconformityLedger + §Compression par promotion (two-tier block-aggregate vs promoted)
//             §Update tick DAILY (Phase A ring buffer; Phase B deviation z-score; Phase C bucket map; Phase D
//                                 pin activation/expiry; Phase E output to consumers)
//             -- session:2026-06-03 (Phase 1 Task 8) --
//
// `UnconformityLedgerService` — System 7 (Unconformity Ledgers). The PERSISTED-projection NIGHTLY system: it
// owns a TWO-TIER in-memory model + persists the AUDIT PIN onto the migrated `buildings.audit_pin_expires_at`.
// It copies the CohesionPermafrost/Inspection persisted-system template (repository + projection + controller +
// tunables) with the System-7-specific shape: a SINGLE NIGHTLY cadence pass (registered at NIGHTLY/2 =
// UNCONFORMITY_LEDGERS slot, runs after System 5 cohesion at NIGHTLY/1) over the player's PROMOTED buildings.
//
// TWO TIERS (system_7 §Compression par promotion, Inv 3 — per-building NOT per-district):
//   - BLOCK-AGGREGATE tier (default, all non-promoted buildings): a `block_revenue_aggregate` uint32 per block
//     (~972 blocks ≈ 3.9 KB), in-memory NON-persisted. NO individual ledger, NO audit-pin possible at block
//     level. Modelled as the per-player blockAggregate Map; it is the in-memory budget the spec sizes (it is NOT
//     fed by a Phase-1 producer — revenue is P2 — so it stays at 0, but the structure exists, sized, honest).
//   - PROMOTED-BUILDING tier: a per-building `UnconformityLedger` (~50 B) — a deviation ring buffer over
//     rolling_window_days, the deviation z-score, and the audit_pin_state composite {pinned_at, pinned_until,
//     suppression_active} (Inv 4). The AUDIT PIN's PERSISTED projection is buildings.audit_pin_expires_at (set
//     when pinned, null when not). A building is "promoted" (Phase-1 sense) when it carries a transaction_profile
//     (the jsonb "only if promoted" column) + is operational — the repository's listPromoted filter.
//
// THE NIGHTLY TICK (system_7 §Update tick — registered at NIGHTLY/2): for each PROMOTED building:
//   - Phase A — RING BUFFER: read the building's transaction_profile (the 24-time-slot revenue profile + the
//     latest sample) and refresh the in-memory ledger's revenue ring buffer (rolling_window_days deep).
//   - Phase B — DEVIATION SIGMA: compute the z-score of the latest sample against the ring buffer mean/stddev
//     (chi-squared-like / z-score over rolling_window_days). The raw z-score is INTERNAL (Inv 1 — never exposed).
//   - Phase C — BUCKET MAP (R2.2): map z → current_deviation_sigma_bucket relative to deviation_threshold_sigma:
//     NOMINAL < 0.5×; LOW 0.5–1.0×; HIGH 1.0–1.5×; CRITICAL > 1.5× (system_7 §enum). NEVER the raw sigma float.
//   - Phase D — AUDIT PIN (two-tier activation gate, system_7 §enum L84/85 + §Tick nouvel opérateur L178 +
//     §Edge cases L276):
//       · CRITICAL_DEVIATION (z > 1.5× threshold) → "Pin immédiat sans condition de persistance" — pins on the
//         FIRST tick it appears, unconditionally (even during the onboarding window).
//       · HIGH_DEVIATION (z 1.0–1.5× threshold) → "pin activé si persistant sur rolling_window_days" — does NOT
//         pin immediately; it pins ONLY once the building has been in HIGH for rolling_window_days CONSECUTIVE
//         nightly ticks (the per-building consecutive_high_ticks counter — reset to 0 the moment the bucket drops
//         below HIGH). A single HIGH tick, or HIGH interrupted by a NOMINAL/LOW tick, never pins.
//       · ONBOARDING DAMPENING (§Tick nouvel opérateur / §Edge cases): during a freshly-onboarded building's
//         FIRST rolling_window_days of ledger life (the per-building tick_age counter), HIGH is IGNORED for
//         pinning — only CRITICAL can pin a newly-onboarded building ("First-month-of-operation deviations are
//         noisier, and Audit Pins are less likely to fire."). After the onboarding window HIGH becomes eligible,
//         subject to the consecutive-persistence gate above.
//     On a pin: set audit_pin_state = {pinned_at: now, pinned_until: now + audit_pin_duration_days,
//     suppression_active: true} (Inv 4 composite) → persist buildings.audit_pin_expires_at = pinned_until. If a
//     pin is already active and now >= pinned_until → LAPSE it (clear to null, suppression_active=false). A
//     NOMINAL/LOW (or onboarding/non-persistent HIGH) building with no active pin stays unpinned. Emit
//     UnconformityAuditPinEvent on a NEW activation (+ AuditPinObservationHint).
//
// RING-BUFFER FILL SEMANTICS (honest, documented — load-bearing for the onboarding gate): Phase A rewrites the
// WHOLE ring buffer from the building's transaction_profile each tick (`revenue_samples = profile.slice(...)`) —
// the buffer is SEEDED-FULL from the profile, NOT filled one-sample-per-tick. So `sample_count` is effectively
// min(profile.length, rolling_window_days) and is full from the FIRST tick — it cannot honestly distinguish a
// freshly-onboarded building from an aged one. Therefore the onboarding window is tracked by an EXPLICIT
// per-building `tick_age` counter (the number of nightly ticks this ledger has been processed), NOT by
// sample_count: tick_age <= rolling_window_days ⇒ still onboarding (HIGH ignored, only CRITICAL pins). This
// makes the spec's "first rolling_window_days of operation" semantics honest given the seeded-full buffer.
//
// PERSISTENCE / ONBOARDING COUNTERS (in-memory, per-building — Inv 3 per-building ledger): consecutive_high_ticks
// + tick_age live in the same in-memory UnconformityLedger (keyed playerId → buildingId), persisting ACROSS ticks
// within a process run. A process RESTART resets them (the ledger Map is rebuilt empty) — the same acceptable
// in-memory-state tradeoff as the deviation ring buffer / mismatch_score cache (the PERSISTED projection is the
// audit_pin_expires_at timestamp; the counters are server-truth working state). Documented like cohesion-thaw.
//
// INV 1 / R2.2 — the raw deviation z-score / sigma is NEVER exposed: the engine computes it internally and maps
// it to a closed DeviationSigmaBucket. The badge the player sees is AUDIT_PIN_ACTIVE (binary) + the bucket. The
// mismatch_score accessor (Inv 6) returns the BUCKET, never the float.
//
// INV 4 — audit_pin_state COMPOSITE (not a bool): the in-memory ledger holds {pinned_at, pinned_until,
// suppression_active}. The PERSISTED projection of it is the single buildings.audit_pin_expires_at timestamp
// (= pinned_until); the {pinned_at, suppression_active} parts stay in-memory (server truth, BO-only).
//
// INV 7 — SUPPRESSION = CONSEQUENCE OF PIN: suppression_active is set true ONLY when the pin activates (never on
// deviation alone). The decoy_revenue_suppression_multiplier MAGNITUDE is the tunable; the financial APPLICATION
// (multiplying declared revenue) is a P2 finance operation (BuildingFinanceService — not built Phase 1), so the
// FLAG is modelled here and the mutation is DEFERRED (honest — the suppression flag is set, the money is not yet
// touched). Documented in the tunables header.
//
// DEFERRED INPUTS (honest, documented — like cohesion-thaw):
//   - REVENUE / TRANSACTION_PROFILE as ORGANIC inputs: buildings are P2 operational entities the player
//     acquires/promotes; revenue + the transaction_profile are P2 operations with no Phase-1 producer. So
//     organically listPromoted() returns [] and System 7 has nothing to score. The mechanic is implemented
//     STRUCTURALLY; the E2E SEEDS promoted buildings with a transaction_profile to exercise the deterministic
//     deviation → audit-pin path (the same shape T6 used to seed a near-threshold cohesion district).
//   - The per-building PROMOTION TRIGGER (player operates it / MIS targets it / System 3 observes it) is P2 —
//     here "promoted" = carries a transaction_profile (the schema's "only if promoted" jsonb). When P2 lands the
//     acquire/promote flow, it sets the transaction_profile and this system scores it with zero changes.
//   - G31 DECLARATION-LEDGER AMPLIFICATION (Inv 5, system_7 §Update tick Phase C): System 3's declaration_ledger
//     was DEFERRED in T4 (no column; depends on unbuilt 04c). With no producer, the amplification has no input —
//     so the 3 unconformity.declaration_ledger.* tunables are NOT mirrored (honest tunables) and the
//     declaration_ledger_weight_acc accumulator is NOT modelled. The deviation → pin path stands alone day-1.
//
// DETERMINISM (NO RNG): the deviation z-score + bucket map + pin activation are FIXED functions of the building's
// transaction_profile. Two players with identical seeded buildings + identical advances land on identical pins
// (the E2E determinism assertion). audit_pin_expires_at uses wall-clock now() + duration (the persisted expiry is
// a real timestamptz, as the schema models it) — the determinism assertion compares the BOOLEAN pin-active
// signature (both players pin the same buildings), not the exact millisecond.
//
// 04e-A1 C6 (2026-07-04, plan C6 / design §4.1 — ★ Substrate 1: audit-pin half-life) — LANDS on Phase D:
//   - HALF-LIFE DECAY (SUPERSEDES the old fixed `auditPinDurationDays` basis, unconformity-tunables.ts note):
//     a pin's expiry is now `audit_pin_activated_at + pinHalfLifeDays` (migration 0107's NEW persisted
//     `buildings.audit_pin_activated_at` anchor), where `pinHalfLifeDays` (overlay-aware) is READ FRESH on
//     EVERY nightly tick — not baked in once at activation. So a HOLD tick (an already-pinned building that
//     is not re-eligible this pass) RECOMPUTES its expiry from the SAME activation anchor + the CURRENT
//     half-life, meaning a half-life modifier applied mid-life genuinely shrinks (or, on revert, restores)
//     an ALREADY-active pin — not just a freshly-activated one (design §4.1 "genuinely shortens ACTIVE
//     pins' effective life"). If the recompute lands at/before `now` (the shrunk life has fully elapsed),
//     the pin lapses THIS tick rather than persisting an already-past expiry.
//   - EMERGENCE GATE (SUPERSEDES raw `rollingWindowDays` as the onboarding + HIGH-persistence window basis):
//     `emergenceGateWindow()` scales `rollingWindowDays` by the CURRENT (overlay-aware) `auditPinEmergenceRate`
//     relative to its registered baseline (`AUDIT_PIN_EMERGENCE_RATE_BASELINE`, unconformity-tunables.ts). At
//     the baseline rate the window equals `rollingWindowDays` EXACTLY — byte-identical to the pre-C6 model
//     (every existing unconformity.spec.ts assertion is unaffected, zero-regression contract). A raised rate
//     (E-POL-09 ×1.4) SHRINKS the window, so HIGH buildings clear onboarding + reach the persistence count
//     sooner — "more pins over a fixed window" (the C6 live-fire proof). CRITICAL is untouched (it already
//     bypasses both onboarding and the persistence count unconditionally).
//   - DETERMINISM PRESERVED: both derivations are pure functions of `(persisted rows, current tunables/overlay
//     snapshot, now)` — no NEW `Math.random`/`Date.now()` beyond the pin-expiry wall-clock arithmetic the
//     pre-C6 model already used.
//   - SCOPE (C6 is the SUBSTRATE only): this chunk proves the model via a SYNTHETIC E-POL-09-shaped modifier
//     applied through the REAL `EffectModifierService.applyEvent` (anti-fig-leaf). Wiring the actual E-POL-09
//     political event to fire these modifiers is A2 (out of scope here, plan §A1/A2 split).

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { blocks as blocksTable } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import { CityEventBus, type DeviationSigmaBucket } from '../events/city-event-bus';
import { citySimTunables } from '../citysim-tunables';
import { unconformityTunables, AUDIT_PIN_EMERGENCE_RATE_BASELINE } from './unconformity-tunables';
import {
  UnconformityLedgerRepository,
  type AuditPinMutation,
  type PromotedBuildingState,
} from './unconformity.repository';
// 04f-A C6 (D6) — the SAME game-day derivation + pure D1 phase-derivation the maintenance phase tick /
// equipment-failure roll / real-estate projection all REUSE (never re-implemented here).
import { deriveGameDay } from '../../operational/political/political-trigger-evaluators';
import { MaintenancePhaseService, type LapsePhase } from '../../operational/maintenance/maintenance-phase.service';
import { maintenanceTunables } from '../../operational/maintenance/maintenance-tunables';

/** Milliseconds in one in-game-equivalent "day" for the wall-clock audit_pin_expires_at offset. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The audit_pin_state COMPOSITE (Inv 4 — not a bool). In-memory per promoted building. The PERSISTED projection
 * of it is the single buildings.audit_pin_expires_at (= pinned_until); pinned_at + suppression_active stay
 * in-memory (server truth, BO-only). 04e-A1 C6 (migration 0107): pinned_at is ALSO persisted separately as
 * buildings.audit_pin_activated_at — the half-life recompute's anchor (Inv 4's own in-memory pinned_at would
 * NOT survive a process restart; the persisted anchor does, so the recompute stays crash-safe).
 */
interface AuditPinState {
  /** Wall-clock activation time (0 / null-equivalent = no pin). */
  pinned_at: number | null;
  /** Wall-clock expiry (the persisted projection — buildings.audit_pin_expires_at). null = no pin. */
  pinned_until: number | null;
  /** Whether decoy_revenue_suppression_multiplier applies (Inv 7 — true ONLY while a pin is active). */
  suppression_active: boolean;
}

/**
 * The per-promoted-building in-memory UnconformityLedger (system_7 §États — the promoted tier). Holds the
 * deviation ring buffer (revenue samples over rolling_window_days), the latest computed deviation bucket, and
 * the audit_pin_state composite. ~50 B per promoted building (the spec's promoted-tier RAM budget).
 */
interface UnconformityLedger {
  /** Ring buffer of revenue samples (rolling_window_days deep). The raw revenue NEVER escapes (R2.2). */
  revenue_samples: number[];
  /** The current deviation bucket (Inv 1 — the closed band; the raw z-score is never stored/exposed). */
  current_deviation_sigma_bucket: DeviationSigmaBucket;
  /** The audit-pin composite (Inv 4). */
  audit_pin_state: AuditPinState;
  /**
   * The number of nightly ticks this ledger has been processed (the building's LEDGER AGE, in nightly ticks).
   * Used for the ONBOARDING window (system_7 §Tick nouvel opérateur L178 + §Edge cases L276): while
   * tick_age <= rolling_window_days the building is still onboarding — HIGH is IGNORED for pinning, only
   * CRITICAL can pin. Tracked EXPLICITLY (not via sample_count) because Phase A seeds the ring buffer full each
   * tick (see the service header §RING-BUFFER FILL SEMANTICS). Incremented once per nightly tick.
   */
  tick_age: number;
  /**
   * The number of CONSECUTIVE nightly ticks this building has been in HIGH_DEVIATION (the HIGH persistence gate,
   * system_7 §enum L84: HIGH "pin activé si persistant sur rolling_window_days"). Incremented each tick the
   * bucket is HIGH; RESET to 0 the moment the bucket drops below HIGH (NOMINAL/LOW) or rises to CRITICAL. HIGH
   * pins only once this counter reaches rolling_window_days (and only after the onboarding window). CRITICAL is
   * immediate and does NOT consult this counter.
   */
  consecutive_high_ticks: number;
}

@Injectable()
export class UnconformityLedgerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UnconformityLedgerService.name);

  /**
   * PROMOTED tier — per-player, per-building in-memory ledgers (lazily allocated, keyed by playerId → buildingId).
   * The deviation ring buffer + bucket + audit_pin_state composite (Inv 4). ~50 B/building.
   */
  private readonly ledgers = new Map<string, Map<string, UnconformityLedger>>();

  /**
   * BLOCK-AGGREGATE tier — per-player block_revenue_aggregate (uint32 per block), the non-promoted default tier
   * (Inv 3). In-memory, NON-persisted, NO audit pin. Not fed by a Phase-1 producer (revenue is P2), so it stays
   * at 0 — but the structure exists + is sized (the spec's ~972-block × 4 B ≈ 3.9 KB budget), honest.
   */
  private readonly blockAggregate = new Map<string, Map<number, number>>();

  /**
   * mismatch_score read cache (Inv 6) — the latest deviation bucket per (player, building), the qualitative score
   * System 6 reads under the name `mismatch_score` for cascade targeting. Mirrors the ledger bucket; held
   * separately so the read accessor is O(1) without scanning the ledger map.
   */
  private readonly mismatchScore = new Map<string, Map<string, DeviationSigmaBucket>>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: UnconformityLedgerRepository,
    private readonly bus: CityEventBus,
    // 04f-A C6 (D6) — pure derivation only (no DB access of its own); REUSE, never re-implemented.
    private readonly maintenancePhase: MaintenancePhaseService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Register the single NIGHTLY cadence slot System 7 occupies (one CitySimSystem — the registry contract).
   * NIGHTLY/2 (unconformity ledgers) replaces the no-op placeholder the SCHEDULE seeded for UNCONFORMITY_LEDGERS;
   * it runs AFTER System 5 cohesion (NIGHTLY/1) per the canonical DAG (cohesion → unconformity).
   */
  private registerCadences(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.UNCONFORMITY_LEDGERS,
      cadence: Cadence.NIGHTLY,
      order: 2,
      run: (ctx) => this.runNightlyTick(ctx),
    });
  }

  /** F4 RAM budget log (system_7 §Docker RAM budget): ~3.9 KB block-aggregate + ~25.5 KB promoted ≈ 29 KB. */
  private logRamBudget(): void {
    this.logger.log(
      `Unconformity Ledgers per-player RAM budget ≈ 29 KB (block-aggregate tier ~3.9 KB = uint32 × ~972 blocks, ` +
        `NON-persisted; promoted tier ~25.5 KB = ~50 B UnconformityLedger × ~500 buildings — audit pin PERSISTED ` +
        `on buildings.audit_pin_expires_at). NIGHTLY/2 tick (Inv 2 — DAILY, not 30m/6h). CRITICAL pins ` +
        `immediately; HIGH pins only when PERSISTENT (rolling_window_days consecutive HIGH ticks) AND past the ` +
        `onboarding window (first rolling_window_days of ledger life — HIGH ignored, only CRITICAL pins). Emits ` +
        `UnconformityAuditPin + AuditPinObservationHint (emit-only day-1). Revenue/transaction_profile + the ` +
        `promotion trigger + G31 declaration-ledger amplification DEFERRED Phase 1 (no P2/04c producer — documented).`,
    );
  }

  // ───────────────────────────── the registered NIGHTLY tick ─────────────────────────────

  /**
   * {NIGHTLY, order 2} — the unconformity daily tick (system_7 §Update tick Phases A–E). For each of the player's
   * PROMOTED buildings: refresh the ring buffer (Phase A), compute the deviation z-score (Phase B), map to the
   * bucket (Phase C), activate/hold/lapse the audit pin (Phase D), emit the consumer events (Phase E). Persists
   * the whole batch of audit-pin mutations in ONE UPDATE. Deterministic (NO RNG — the deviation + bucket + pin
   * activation are fixed functions of the transaction_profile); the pin TTL/lapse timing alone uses wall-clock
   * now() (acknowledged at the §audit-pin note below — multi-day, never flakes a test). Organically a no-op
   * (buildings empty Phase 1).
   */
  private async runNightlyTick(ctx: CitySimTickContext): Promise<void> {
    const promoted = await this.repo.listPromoted(ctx.playerId);
    if (promoted.length === 0) return; // organic Phase-1 reality: no promoted buildings → nothing to score.

    const ledgerMap = this.ledgersFor(ctx.playerId);
    const scoreMap = this.scoresFor(ctx.playerId);
    const mutations: AuditPinMutation[] = [];
    // Collect cross-system emissions to fire AFTER the persist (observe → persist → notify ordering).
    const emissions: Array<() => void> = [];
    const now = Date.now();
    // 04f-A C6 (D6) — the CURRENT game-day (the SAME derivation MAINTENANCE_PHASE_TICK/EquipmentFailureService
    // use), computed ONCE for the whole tick — the per-building maintenance factor below derives the LIVE
    // lapse phase from it (never the cached `lapse_phase` column — see the header note).
    const currentGameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);

    for (const b of promoted) {
      const ledger = this.ensureLedger(ledgerMap, b.building_id);

      // ── Phase A — RING BUFFER: refresh from the transaction_profile (deterministic; no RNG). ──
      // NOTE (§RING-BUFFER FILL SEMANTICS in the header): this SEEDS the buffer full from the profile each tick —
      // it is NOT a one-sample-per-tick fill — so the onboarding window is tracked by tick_age (below), not by
      // sample_count.
      const { samples, latest } = this.readProfile(b.transaction_profile);
      ledger.revenue_samples = samples.slice(-unconformityTunables.rollingWindowDays);
      // The building's ledger age (in nightly ticks) advances by one each tick — drives the onboarding window.
      ledger.tick_age += 1;

      // ── Phase B — DEVIATION SIGMA: z-score of the latest sample vs the ring-buffer mean/stddev (INTERNAL). ──
      const z = this.deviationZScore(ledger.revenue_samples, latest);

      // ── Phase C — BUCKET MAP (R2.2 — never the raw z-score float). ──
      const bucket = this.deviationBucket(z);
      ledger.current_deviation_sigma_bucket = bucket;
      scoreMap.set(b.building_id, bucket); // Inv 6 — refresh the mismatch_score read cache.

      // CONSECUTIVE-HIGH tracking (the HIGH persistence gate, §enum L84): count consecutive HIGH ticks; reset the
      // streak the moment the bucket is NOT HIGH (NOMINAL/LOW below, or CRITICAL above — CRITICAL pins immediately
      // and does not consult the streak). This runs BEFORE the pin decision so a HIGH tick counts itself.
      if (bucket === 'HIGH_DEVIATION') {
        ledger.consecutive_high_ticks += 1;
      } else {
        ledger.consecutive_high_ticks = 0;
      }

      // ── Phase D — AUDIT PIN: activate (gated) / hold-or-decay / lapse (Inv 4 composite, Inv 7 suppression). ──
      // Activation gate (two-tier, system_7 §enum L84/85 + §Tick nouvel opérateur L178 + §Edge cases L276;
      // C6 §4.1 — the window is now the OVERLAY-AWARE emergenceGateWindow(), see helper below):
      //   · CRITICAL → "Pin immédiat sans condition de persistance" — eligible always (even during onboarding).
      //   · HIGH     → "pin activé si persistant sur rolling_window_days" — eligible ONLY when the building is
      //                PAST its onboarding window (tick_age > gateWindow) AND has been HIGH for gateWindow
      //                CONSECUTIVE ticks (consecutive_high_ticks >= gateWindow).
      //   · Onboarding (tick_age <= gateWindow): HIGH is IGNORED — only CRITICAL can pin.
      // Then four mutually-exclusive cases, in priority order:
      //   (a) ELIGIBLE to pin → ACTIVATE/RE-ARM the pin (fresh activation stamp; emit on a NEW activation).
      //   (b) not eligible + an ACTIVE (future-expiry) pin → HOLD-OR-DECAY: recompute the expiry from the
      //       PERSISTED activation anchor + the CURRENT half-life (C6 §4.1) — may shrink, grow back, or lapse
      //       THIS tick if the recompute has already elapsed.
      //   (c) not eligible + an EXPIRED (past-expiry) pin → LAPSE (clear to null).
      //   (d) not eligible + no pin → stays unpinned.
      // 04f-A C6 (D6) — the per-building HARD/CRITICAL maintenance emergence-rate factor (E-POL-09
      // transposition precedent), composed AFTER the overlay-shifted global rate inside emergenceGateWindow.
      const maintenanceFactor = this.maintenanceEmergenceFactor(b, currentGameDay);
      const gateWindow = this.emergenceGateWindow(maintenanceFactor);
      const onboarding = ledger.tick_age <= gateWindow;
      const highPersisted = ledger.consecutive_high_ticks >= gateWindow;
      const pinEligible =
        bucket === 'CRITICAL_DEVIATION' ||
        (bucket === 'HIGH_DEVIATION' && !onboarding && highPersisted);

      const expiresAt = b.audit_pin_expires_at;
      const activatedAt = b.audit_pin_activated_at;
      const pinIsActive = expiresAt !== null && expiresAt.getTime() > now;
      let newExpiry: Date | null;
      let newActivatedAt: Date | null;

      if (pinEligible) {
        // (a) ACTIVATE/RE-ARM: stamp a FRESH activation anchor + compute the half-life-driven expiry
        // (C6 §4.1 — SUPERSEDES the old fixed auditPinDurationDays basis, see the file header note).
        const pinnedAt = now;
        const pinnedUntil = pinnedAt + this.halfLifeEffectiveLifeMs();
        ledger.audit_pin_state = { pinned_at: pinnedAt, pinned_until: pinnedUntil, suppression_active: true };
        newActivatedAt = new Date(pinnedAt);
        newExpiry = new Date(pinnedUntil);
        // Emit on a NEW activation only (a building already pinned this window is not re-announced).
        if (!pinIsActive) {
          const playerId = ctx.playerId;
          const districtId = b.district_id;
          const buildingId = b.building_id;
          const gameMinute = ctx.gameMinute;
          const deviationBucket = bucket;
          emissions.push(() =>
            this.bus.emitUnconformityAuditPin({
              type: 'unconformity_audit_pin',
              playerId,
              districtId,
              buildingId,
              deviationBucket,
              gameMinute,
            }),
          );
          // §Phase E — patrol-observation hint for the pinned building (System 4 consumer, emit-only day-1).
          emissions.push(() =>
            this.bus.emitAuditPinObservationHint({
              type: 'audit_pin_observation_hint',
              playerId,
              districtId,
              buildingId,
              gameMinute,
            }),
          );
        }
      } else if (pinIsActive) {
        // (b) HOLD-OR-DECAY (C6 §4.1): the building is NOT pin-eligible this tick (dropped to NOMINAL/LOW, or
        // a HIGH that is still onboarding / not yet persistent) but carries an active pin. RECOMPUTE its
        // expiry from the PERSISTED activation anchor + the CURRENT (overlay-aware) half-life — read FRESH
        // every tick, so a half-life modifier applied MID-LIFE genuinely shrinks (or, on revert, restores) an
        // ALREADY-active pin, not just a freshly-activated one. Falls back to the prior expiresAt unchanged if
        // the anchor is unknown (a pre-C6/migrated row with no activation stamp — honest defensive fallback,
        // never hit by any pin this service itself ever activates).
        const anchorMs = activatedAt !== null ? activatedAt.getTime() : null;
        const recomputed = anchorMs !== null ? anchorMs + this.halfLifeEffectiveLifeMs() : expiresAt!.getTime();
        if (recomputed <= now) {
          // The half-life-driven recompute has decayed the pin's remaining life to zero (or past) — lapse it
          // THIS tick rather than persist an already-past expiry (Inv 4 / Inv 7).
          ledger.audit_pin_state = { pinned_at: null, pinned_until: null, suppression_active: false };
          newExpiry = null;
          newActivatedAt = null;
        } else {
          ledger.audit_pin_state = {
            pinned_at: ledger.audit_pin_state.pinned_at,
            pinned_until: recomputed,
            suppression_active: true,
          };
          newExpiry = new Date(recomputed);
          newActivatedAt = anchorMs !== null ? new Date(anchorMs) : null;
        }
      } else {
        // (c) LAPSE an expired pin OR (d) stay unpinned — both clear to null (Inv 4 / Inv 7).
        ledger.audit_pin_state = { pinned_at: null, pinned_until: null, suppression_active: false };
        newExpiry = null;
        newActivatedAt = null;
      }

      mutations.push({
        building_id: b.building_id,
        audit_pin_expires_at: newExpiry,
        audit_pin_activated_at: newActivatedAt,
      });
    }

    if (mutations.length > 0) await this.repo.applyAuditPins(ctx.playerId, mutations);
    // Notify AFTER the persist so consumers observe the committed state (ordered side-effects).
    for (const emit of emissions) emit();
  }

  // ───────────────────────────── deviation math (deterministic, INTERNAL) ─────────────────────────────

  /**
   * Parse the transaction_profile jsonb → {samples, latest}. Shape: `{ revenue_samples: number[], latest_revenue:
   * number }`. A malformed/absent profile yields an empty sample set + latest 0 → NOMINAL (no pin). The raw
   * revenue numbers stay INTERNAL (never forwarded — R2.2).
   */
  private readProfile(profile: unknown): { samples: number[]; latest: number } {
    if (profile === null || typeof profile !== 'object') return { samples: [], latest: 0 };
    const p = profile as Record<string, unknown>;
    const rawSamples = Array.isArray(p.revenue_samples) ? p.revenue_samples : [];
    const samples = rawSamples.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const latest = typeof p.latest_revenue === 'number' && Number.isFinite(p.latest_revenue) ? p.latest_revenue : 0;
    return { samples, latest };
  }

  /**
   * The deviation z-score (Phase B — chi-squared-like / z-score over the rolling window). z = |latest - mean| /
   * stddev. With < 2 samples (a new building, onboarding) there is no spread → return 0 (NOMINAL; the spec's
   * "skip — onboarding dampening" → trust the newcomer). A zero-stddev (flat profile) with latest == mean → 0; a
   * latest far from a flat-ish mean → a large z. INTERNAL — the float is never exposed (Inv 1 / R2.2).
   */
  private deviationZScore(samples: number[], latest: number): number {
    if (samples.length < 2) return 0;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / samples.length;
    const stddev = Math.sqrt(variance);
    if (stddev === 0) return latest === mean ? 0 : Number.POSITIVE_INFINITY; // a flat profile + an off sample = max deviation.
    return Math.abs(latest - mean) / stddev;
  }

  /**
   * Map a raw z-score → its closed DeviationSigmaBucket (Phase C — R2.2; the float never escapes). Thresholds
   * relative to deviation_threshold_sigma (system_7 §enum):
   *   NOMINAL  : z < 0.5 × threshold
   *   LOW      : 0.5× ≤ z < 1.0×
   *   HIGH     : 1.0× ≤ z < 1.5×
   *   CRITICAL : z ≥ 1.5×
   */
  deviationBucket(z: number): DeviationSigmaBucket {
    const t = unconformityTunables.deviationThresholdSigma;
    if (z >= 1.5 * t) return 'CRITICAL_DEVIATION';
    if (z >= 1.0 * t) return 'HIGH_DEVIATION';
    if (z >= 0.5 * t) return 'LOW_DEVIATION';
    return 'NOMINAL';
  }

  // ───────────────────────────── C6 half-life + emergence-gate model (design §4.1) ─────────────────────────────

  /**
   * The emergence-GATE window (C6 §4.1) — `rollingWindowDays` scaled by the CURRENT (overlay-aware)
   * `auditPinEmergenceRate` relative to its registered baseline (`AUDIT_PIN_EMERGENCE_RATE_BASELINE`, 0.1).
   * Drives BOTH the onboarding-dampening window (`tick_age <= gateWindow`) and the HIGH persistence-count
   * gate (`consecutive_high_ticks >= gateWindow`) — the two places system_7 gates a NEW pin's emergence.
   *
   * At the baseline rate `rateFactor === 1` and this returns `rollingWindowDays` EXACTLY — byte-identical to
   * the pre-C6 model (every existing unconformity.spec.ts assertion is unaffected). A raised rate (E-POL-09's
   * `epol09_audit_pin_emergence_multiplier` ×1.4) SHRINKS the window, so a HIGH building clears onboarding +
   * reaches persistence sooner — "more pins over a fixed window" (the C6 live-fire falsifiable proof).
   * CRITICAL is untouched (it already bypasses both gates unconditionally). Clamped to >= 1 (never a
   * zero/negative window regardless of an extreme rate).
   */
  private emergenceGateWindow(maintenanceFactor: number): number {
    const window = unconformityTunables.rollingWindowDays;
    // 04f-A C6 (D6) — compose order: the OVERLAY-shifted global rate FIRST (the existing getter — E-POL-09's
    // own ×1.4 GLOBAL multiplier already baked in via EffectOverlayStore, unconformity-tunables.ts), THEN the
    // per-building maintenance factor — BOTH apply multiplicatively onto the SAME combined rate divisor
    // (never overwritten — a raised overlay rate AND a HARD/CRITICAL maintenance factor compound).
    const rateFactor = (unconformityTunables.auditPinEmergenceRate / AUDIT_PIN_EMERGENCE_RATE_BASELINE) * maintenanceFactor;
    return Math.max(1, Math.round(window / rateFactor));
  }

  /**
   * 04f-A C6 (D6) — the per-building maintenance emergence-rate factor: a building whose LIVE-derived D1
   * lapse phase (the joined anchor pair, NEVER the cached `lapse_phase` column — design §3's own "the column
   * is never the penalty input" discipline, AND the only way to avoid a one-tick lag against the separately-
   * scheduled MAINTENANCE_PHASE_TICK/NIGHTLY-21, which runs AFTER this NIGHTLY/2 tick) is HARD or CRITICAL
   * gets ×(1 + `maintenance.audit_pin_probability_hard_pct`/100) (default ×1.12) — the E-POL-09 transposition
   * precedent (`epol09_audit_pin_emergence_multiplier` ×1.4 GLOBAL through the SAME `forensic.audit_pin_
   * emergence_rate` overlay getter — see the composition in `emergenceGateWindow` above). A promoted building
   * with no operational-chain row (never converted, or a test-seeded promoted-only row) gets factor 1
   * (untouched — the zero-regression contract). SOFT/within_window buildings also get 1 (D6 scopes HARD/
   * CRITICAL only). Pure — no DB access, no RNG.
   */
  private maintenanceEmergenceFactor(b: PromotedBuildingState, currentGameDay: number): number {
    if (b.last_maintained_at_game_day === null || b.maintenance_due_in_days === null) return 1;
    const daysOverdue = this.maintenancePhase.deriveDaysOverdue(currentGameDay, b.last_maintained_at_game_day, b.maintenance_due_in_days);
    const lapsePhase: LapsePhase = this.maintenancePhase.deriveLapsePhase(daysOverdue);
    return lapsePhase === 'hard' || lapsePhase === 'critical' ? 1 + maintenanceTunables.auditPinProbabilityHardPct / 100 : 1;
  }

  /**
   * The half-life-driven effective pin life, in milliseconds (C6 §4.1) — a single half-life span
   * (`pinHalfLifeDays`, overlay-aware, READ FRESH on every call — never cached) after which the model
   * considers the pin's signal decayed away. SUPERSEDES `unconformityTunables.auditPinDurationDays` (see the
   * file header note + the tunables-file supersession doc-comment) — the old getter stays registered/mirrored
   * (no dead-knob removal, the `overlap_max_active` precedent) but is no longer consumed here.
   */
  private halfLifeEffectiveLifeMs(): number {
    return unconformityTunables.pinHalfLifeDays * MS_PER_DAY;
  }

  // ───────────────────────────── lazy per-player in-memory tiers ─────────────────────────────

  private ledgersFor(playerId: string): Map<string, UnconformityLedger> {
    let m = this.ledgers.get(playerId);
    if (!m) {
      m = new Map<string, UnconformityLedger>();
      this.ledgers.set(playerId, m);
    }
    return m;
  }

  private scoresFor(playerId: string): Map<string, DeviationSigmaBucket> {
    let m = this.mismatchScore.get(playerId);
    if (!m) {
      m = new Map<string, DeviationSigmaBucket>();
      this.mismatchScore.set(playerId, m);
    }
    return m;
  }

  /** Lazily allocate a building's promoted-tier ledger (the in-memory UnconformityLedger). */
  private ensureLedger(ledgerMap: Map<string, UnconformityLedger>, buildingId: string): UnconformityLedger {
    let l = ledgerMap.get(buildingId);
    if (!l) {
      l = {
        revenue_samples: [],
        current_deviation_sigma_bucket: 'NOMINAL',
        audit_pin_state: { pinned_at: null, pinned_until: null, suppression_active: false },
        tick_age: 0,
        consecutive_high_ticks: 0,
      };
      ledgerMap.set(buildingId, l);
    }
    return l;
  }

  // ───────────────────────────── mismatch_score read accessor (Inv 6 — System 6) ─────────────────────────────

  /**
   * mismatch_score (Inv 6) — the qualitative deviation bucket System 6 (InspectionQueueService) reads for cascade
   * target selection. Returns the latest computed bucket for a (player, building), or NOMINAL if unknown (a
   * building System 7 has not scored). This is the READ accessor the cross_system_interactions DAG dependency
   * System 7 → System 6 routes through (System 7 produces, System 6 consumes — unidirectional).
   *
   * WIRING DECISION (honest, documented — the cohesion emit-only precedent): System 6 currently selects cascade
   * targets via a deterministic district-pool fallback (the spec's "random selection if no score" branch — see
   * inspection.service.ts generateCascadeEntries). Wiring System 6 to read THIS accessor would couple System 6
   * to a System-7 building set that is EMPTY in Phase 1 (buildings are P2), so the cascade would have no
   * mismatch_score to read organically and the fallback would still fire — the wiring would be inert day-1. So
   * the accessor is EXPOSED (the seam is real + tested via the projection) but System 6 is NOT re-wired to it
   * now (leaving the clean district-pool fallback in place); the wiring lands when P2 populates buildings. This
   * avoids inventing a premature coupling against an empty input set (the System 5 → System 3 precedent).
   */
  getMismatchScore(playerId: string, buildingId: string): DeviationSigmaBucket {
    return this.mismatchScore.get(playerId)?.get(buildingId) ?? 'NOMINAL';
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * The promoted buildings for ONE district (the projection read). Returns the raw promoted rows (building id +
   * the persisted audit pin); the projection derives AUDIT_PIN_ACTIVE + the deviation bucket from them, never
   * forwarding the raw transaction_profile / expiry timestamp (R2.2). Empty for a district with no promoted
   * buildings (the organic Phase-1 shape — the buildings table is empty).
   */
  async listPromotedForDistrict(playerId: string, districtId: number): Promise<PromotedBuildingState[]> {
    return this.repo.listPromotedForDistrict(playerId, districtId);
  }

  /**
   * The deviation bucket the projection shows for a building. Prefer the in-memory ledger's freshly-computed
   * bucket (the authoritative post-tick value); fall back to NOMINAL if the ledger has not scored it yet (e.g. a
   * building seeded but not yet ticked). This keeps the projection bucket consistent with the mismatch_score
   * accessor without re-reading the raw transaction_profile in the projection layer.
   */
  bucketForBuilding(playerId: string, buildingId: string): DeviationSigmaBucket {
    return this.ledgers.get(playerId)?.get(buildingId)?.current_deviation_sigma_bucket ?? 'NOMINAL';
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 404). */
  isValidDistrict(districtId: number): boolean {
    return (
      Number.isInteger(districtId) && districtId >= 1 && districtId <= unconformityTunables.districtCount
    );
  }

  /** Whether a district id exists in the seeded geography (a real district — the controller's existence guard). */
  async districtExists(districtId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: blocksTable.district_id })
      .from(blocksTable)
      .where(eq(blocksTable.district_id, districtId))
      .limit(1);
    return rows.length > 0;
  }
}
