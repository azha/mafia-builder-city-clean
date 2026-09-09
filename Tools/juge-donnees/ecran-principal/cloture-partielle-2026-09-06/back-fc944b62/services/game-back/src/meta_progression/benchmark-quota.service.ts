// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C7 ("`BenchmarkQuotaService`:
//             ... weekly reset elapsed-at-read (`week_reset_at` — no cron, D11); quota upgrade
//             `onHorizonAdvanced` (← `HorizonTierAdvancedEvent` from C4 — the intra-lot coupling, D12/
//             hazard 5)").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §9.3 (the quota
//             gate + single-statement decrement) + §9.4 (weekly reset elapsed-at-read + the quota-upgrade
//             coupling).
//             ★ hazard-5 (binding, plan C7 verbatim): "the quota upgrade rides `HorizonTierAdvancedEvent`
//             (the DECISION-HORIZON tier from C4), NOT the pressure tier (C5)." This file subscribes ONLY to
//             `HorizonTierAdvancedEvent` and reads ONLY its `newTier` field — `pressure_tier`/
//             `PressureTierUnlockedEvent`/`PressureTierService` are never imported, never read, anywhere in
//             this file (grep-zero, disclosed here for the reviewer ⊥).
//             Pattern (bus subscribe + a public core method BOTH the real subscriber AND the E2E floor call
//             directly, Lesson #3): `pressure-tier.service.ts#onGraduation`/`onApplicationBootstrap` (the
//             EXACT triad this file's `onHorizonAdvanced` + `handleHorizonTierAdvanced` + bootstrap
//             subscribe mirrors).
//             — P3-H C7 — 2026-07-24
//
// `BenchmarkQuotaService` — the design §9.3/§9.4 quota primitives + the D12 intra-lot coupling:
//   - `claimReAnchorUse(playerId, gameMinute)` — the design §9.3 gate: lazy `initQuota` -> elapsed-at-read
//     `resetIfElapsed` -> the single-statement guarded `claimUse` decrement. Called by `BenchmarkDriftService.
//     reAnchor` BEFORE any metric is touched (a failed claim never reaches a metric snapshot — the
//     concurrency falsifiable's own "no double snapshot").
//   - `getProjection(playerId)` — `GET /v1/meta/benchmark`'s `{quota_remaining, quota_max}` fields (design
//     §10) — a READ (elapsed-at-read reset still runs — design §9.4's own "on ANY quota read" — but no
//     decrement).
//   - `onHorizonAdvanced(playerId, newTier, gameMinute)` — the D12 coupling: raises `max_uses_per_week` to
//     the tier band (monotone) + `ReAnchorQuotaUpgradedEvent`. Subscribed to the REAL `HorizonTierAdvancedEvent`
//     bus event at bootstrap (★ hazard-5 — see this file's own header banner).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus, type HorizonTierAdvancedEvent, type ReAnchorQuotaUpgradedEvent } from '../citysim/events/city-event-bus';
import { metaProgressionTunables, META_PROGRESSION_TUNABLE_CAPS } from './meta-progression-tunables';
import { PlayerReanchorQuotasRepository, type ClaimUseResult } from './player-reanchor-quotas.repository';

/** `GET /v1/meta/benchmark`'s quota fields (design §9.4/§10) — `{quota_remaining, quota_max}` ONLY, NEVER
 *  `week_reset_at` (canon's own Forbidden(P1): "aucun countdown visible ... jamais 'reste Nh avant reset'"). */
export interface ReanchorQuotaProjection {
  readonly usesRemaining: number;
  readonly maxUsesPerWeek: number;
}

/**
 * design §9.4/D12 — the tier -> band INVARIANT (design §12's own classification: "Invariant rows (constants,
 * not knobs): ... the reanchor tier bands" — deliberately NOT a new `_t2`/`_t3` tunable family, unlike
 * `cycles_per_horizon_tier`'s own explicit triplet). Derived from the SAME `meta.reanchor_uses_per_week`
 * tunable's CURRENT resolved value (T1's own base) so a DB/env override on that ONE key still moves EVERY
 * band (the falsifiable's own "flip `reanchor_uses_per_week` -> the band moves") — never a second,
 * fabricated key. Canon's own indicative numbers (`benchmark_drift.md` §Re-anchor action: T2 mid≈2, T3
 * high≈3) are exactly `base+1`/`base+2` at the tunable's own default (1) — generalized here as `base +
 * (tier-1)`, clamped to the registered range ceiling (`META_PROGRESSION_TUNABLE_CAPS['meta.reanchor_uses_
 * per_week'].max` = 3) so an already-raised base can never overshoot the domain. T1 returns the base value
 * itself (no upgrade — `HorizonTierAdvancedEvent` never fires for tier=1, the DHL ladder's own floor).
 * ★ DISCLOSED CODER CHOICE — design/canon name the AXIS + the indicative T2/T3 numbers but not a formula;
 * this is the simplest reading that is BOTH genuinely value-sensitive on the ONE registered key AND matches
 * canon's own indicative numbers exactly at the tunable's default.
 */
function bandedMaxUsesForTier(tier: number): number {
  const base = metaProgressionTunables.reanchorUsesPerWeek;
  if (tier <= 1) return base;
  const rangeMax = META_PROGRESSION_TUNABLE_CAPS['meta.reanchor_uses_per_week']!.max;
  return Math.min(rangeMax, base + (tier - 1));
}

@Injectable()
export class BenchmarkQuotaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BenchmarkQuotaService.name);

  /** In-memory test-probe array (never used in production paths) — mirrors `PressureTierService`'s own
   *  `unlockedEvents` shape: pushed IN-LINE right where THIS method calls `bus.emit...`. */
  private upgradedEvents: ReAnchorQuotaUpgradedEvent[] = [];

  constructor(
    private readonly repo: PlayerReanchorQuotasRepository,
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    // ★ hazard-5: subscribes ONLY to HorizonTierAdvancedEvent (the DECISION-HORIZON axis, C4) — NEVER
    // PressureTierUnlockedEvent/PressureTierObservationExpiredEvent (the SEPARATE pressure axis, C5).
    this.bus.onHorizonTierAdvanced((event: HorizonTierAdvancedEvent) => {
      this.handleHorizonTierAdvanced(event).catch((err) =>
        this.logger.error(`horizon_tier_advanced re-anchor quota upgrade failed (contained): ${errMsg(err)}`),
      );
    });
  }

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `ReAnchorQuotaUpgradedEvent` fired this process (test-probe — never used in production paths). */
  getUpgradedEvents(): readonly ReAnchorQuotaUpgradedEvent[] {
    return this.upgradedEvents;
  }

  /** Clear the in-memory upgraded-event probe (called by the test reset route). */
  clearUpgradedEvents(): void {
    this.upgradedEvents = [];
  }

  // ── the D12 quota upgrade (← HorizonTierAdvancedEvent) ──────────────────────────────────────────

  /**
   * `PressureTierService.onGraduation`'s own "public core method, real subscriber AND the E2E floor both
   * call" shape (Lesson #3). `initQuota` first — a player who advances tier BEFORE ever touching benchmark/
   * reanchor has no `player_reanchor_quotas` row yet. `bandedMaxUsesForTier(newTier)` computes the target
   * band; `raiseMaxUsesOnHorizonAdvanced`'s own monotone WHERE decides whether this is a genuine raise (see
   * that method's own header) — only THEN does the event fire.
   */
  async onHorizonAdvanced(playerId: string, newTier: number, gameMinute: number): Promise<void> {
    await this.repo.initQuota(playerId, metaProgressionTunables.reanchorUsesPerWeek);
    const newMax = bandedMaxUsesForTier(newTier);
    const result = await this.repo.raiseMaxUsesOnHorizonAdvanced(playerId, newMax, newTier);
    if (!result.raised) return;

    const event: ReAnchorQuotaUpgradedEvent = {
      type: 'reanchor_quota_upgraded',
      playerId,
      newMaxUsesPerWeek: result.maxUsesPerWeek,
      horizonTier: newTier,
      gameMinute,
    };
    this.bus.emitReAnchorQuotaUpgraded(event);
    this.upgradedEvents.push(event);
    this.logger.log(`REANCHOR_QUOTA_UPGRADED: player=${playerId} horizon_tier=${newTier} max_uses_per_week=${result.maxUsesPerWeek}`);
  }

  private async handleHorizonTierAdvanced(event: HorizonTierAdvancedEvent): Promise<void> {
    await this.onHorizonAdvanced(event.playerId, event.newTier, event.gameMinute);
  }

  // ── the design §9.3 quota gate (called by BenchmarkDriftService.reAnchor) ──────────────────────

  /**
   * design §9.3 — `initQuota` (lazy first-touch) -> `resetIfElapsed` (D11 elapsed-at-read, ALWAYS attempted
   * first so the decrement below always targets the CURRENT week's quota) -> `claimUse` (the single-statement
   * guarded decrement). The caller (`BenchmarkDriftService.reAnchor`) MUST check `.claimed` BEFORE touching
   * any `player_metric_benchmarks` row — a failed claim (already 0) never snapshots anything (the
   * concurrency falsifiable's own "loser 409, no double snapshot").
   */
  async claimReAnchorUse(playerId: string, gameMinute: number): Promise<ClaimUseResult> {
    await this.repo.initQuota(playerId, metaProgressionTunables.reanchorUsesPerWeek);
    await this.repo.resetIfElapsed(playerId, new Date());
    return this.repo.claimUse(playerId, gameMinute);
  }

  /**
   * `GET /v1/meta/benchmark`'s quota fields (design §9.4/§10). A READ — `resetIfElapsed` still runs (design
   * §9.4's own "on ANY quota read ... past `week_reset_at`" — a GET is a genuine read), but NO decrement.
   */
  async getProjection(playerId: string): Promise<ReanchorQuotaProjection> {
    await this.repo.initQuota(playerId, metaProgressionTunables.reanchorUsesPerWeek);
    const reset = await this.repo.resetIfElapsed(playerId, new Date());
    if (reset) return { usesRemaining: reset.usesRemaining, maxUsesPerWeek: reset.maxUsesPerWeek };
    const row = await this.repo.readRaw(playerId);
    return { usesRemaining: row?.usesRemaining ?? 0, maxUsesPerWeek: row?.maxUsesPerWeek ?? 0 };
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
