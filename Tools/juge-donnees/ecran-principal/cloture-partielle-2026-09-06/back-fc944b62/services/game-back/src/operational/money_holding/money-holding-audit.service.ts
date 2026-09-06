// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4-T5b/§7 (the value-driven, telegraphed
//             AUDIT-FORFEITURE — DISTINCT from the heat-driven street raid T5a: value-driven, a warning window, a bigger
//             legal bite forfeiture_seize_pct=0.5 > the raid's 0.4, NO structural damage; its OWN slow tick
//             MONEY_HOLDING_AUDIT — the vector's ONE new tick) + §6 (tick ordering: a SLOW scan on TWELVE_H/5, after the
//             12-h precinct-review band (PATROL_DOCTRINE/1 … POLICE_MEMORY/4); the audit-forfeiture is a slow telegraphed
//             legal process — minute granularity is unnecessary, and a 12-h cadence keeps the per-player scan OFF the
//             tick-heavy minute band (a 43,200-tick citysim advance fires it ~60×, not 43,200×, so the tick-heavy DECAY /
//             patrol-review E2E stay well under the per-test cap); set-based; deterministic; no RNG) +
//             docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (the CitySimSystem hook contract —
//             an operational tick-hook plugs into the SAME scheduler at a declared (cadence, order) slot) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.13 (money_holding — R9.3 READ + mutate held_cents /
//             forfeiture_scheduled_at_tick / last_yield_tick; the table + the column T0 landed, migration 0025) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — money_holding (Phase-5 vector #5a T0:
//             money_holding.forfeiture_threshold_cents / forfeiture_warning_ticks / forfeiture_seize_pct — R2.3, REUSE)
//             -- session:2026-06-07 (Phase 5 vector #5a — money_holding — Task 5b) --
//
// `MoneyHoldingAuditService` — the MONEY_HOLDING_AUDIT tick (Phase-5 vector #5a T5b — the value-driven, telegraphed
// audit-forfeiture). It is an operational-chain tick-hook (NOT one of the 11 city-sim systems) registered on the EXISTING
// CitySimScheduler at {TWELVE_H, order 5 = MONEY_HOLDING_AUDIT} — after the 12-h precinct-review band (PATROL_DOCTRINE/1 …
// POLICE_MEMORY/4). It runs on the SLOW 12-h band (NOT the per-minute band) because the audit-forfeiture is a slow,
// telegraphed legal process that does NOT need minute (or even 30-min) granularity, and keeping a per-player scan off the
// tick-heavy minute band is the perf discipline: a 43,200-tick citysim advance fires it ~60×, not 43,200× (the per-minute
// version timed out the tick-heavy DECAY / patrol-review E2E; even 30-min was insufficient — the 12-h band is comfortably
// under the per-test cap). It mirrors the GrowAdvanceService / RaidExecutionService registration shape EXACTLY
// (OnApplicationBootstrap → registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder there. This
// is THE vector's ONE NEW TICK (T4 yield = lazy / no-tick; T5a street raid = the reused RAID_EXECUTION/13).
//
// DISTINCT FROM THE STREET RAID (T5a): the street raid is HEAT-driven (planned by System 4 on a block), SUDDEN (no
// warning), takes a MODERATE band (raid_seize_pct 0.4), and DAMAGEs the building + writes a building_raid row. THIS
// forfeiture is VALUE-driven (a hold over forfeiture_threshold_cents attracts it), TELEGRAPHED (a forfeiture_warning_ticks
// window the player can react inside — withdraw / diversify), takes a BIGGER LEGAL bite (forfeiture_seize_pct 0.5 > 0.4),
// and does NOT touch structural_state (no DAMAGED) and writes NO building_raid row — a legal forfeiture, not a raid.
//
// THE LIFECYCLE (per player, each TWELVE_H tick; set-based, deterministic, NO RNG): batch-read the player's money_holdings,
// compute each holding's EFFECTIVE held = held_cents + the LIVE-ACCRUED yield (read-only — the pure accruedYieldCents,
// NOT a persisted settle here; the settle only happens at EXECUTE, the write-amplification discipline), then classify:
//   - SCHEDULE: effectiveHeld ≥ forfeiture_threshold_cents AND forfeiture_scheduled_at_tick IS NULL → arm the telegraph
//     (forfeiture_scheduled_at_tick = now + forfeiture_warning_ticks).
//   - CANCEL: forfeiture_scheduled_at_tick IS NOT NULL AND effectiveHeld < forfeiture_threshold_cents → NULL the schedule
//     (the player reduced the hold / it dropped — they reacted; the telegraph disarms).
//   - EXECUTE: forfeiture_scheduled_at_tick IS NOT NULL AND now ≥ forfeiture_scheduled_at_tick AND still effectiveHeld ≥
//     threshold → in one tx: SETTLE yield (realize accrued into held, capped, re-anchor — REUSE the T4 settle), then SEIZE
//     forfeiture_seize_pct of the post-settle held (the exact BigInt split), NULL the schedule. NO structural change.
// WRITE-AMPLIFICATION: only WRITE on a TRANSITION (schedule/cancel/execute). The steady state (held < threshold AND no
// schedule, OR scheduled-and-still-pending-but-not-yet-due) writes nothing — the batch read is the only steady-state cost.
// The SCHEDULE/CANCEL transitions are applied as ONE set-based UPDATE each (batched building-id lists); the EXECUTE rows
// are applied one tx per holding (rare; each forfeiture is an independent settle-then-seize).
//
// DETERMINISM (NO RNG): which holdings schedule/cancel/execute is a FIXED function of the persisted held_cents +
// last_yield_tick + forfeiture_scheduled_at_tick + the player's current tick + the grounded forfeiture tunables (R2.3 —
// read from the registry/env, never inline). Organically a no-op (no money_holding, or every hold below the threshold with
// no schedule armed — the common case). Brindle/Crick/Hush/Ash/grow have no money_holding row → never touched. R9.3: reads
// + mutates ONLY the persisted money_holding row — ZERO schema change (T0 landed the table + the forfeiture column).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { MoneyHoldingRepository, type MoneyHoldingAuditRow } from './money-holding.repository';
import { accruedYieldCents, capacityCentsForTier, moneyHoldingTunables } from './money-holding-tunables';

@Injectable()
export class MoneyHoldingAuditService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MoneyHoldingAuditService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: MoneyHoldingRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'MoneyHoldingAuditService registered at TWELVE_H/5 (MONEY_HOLDING_AUDIT) — the money_holding vector\'s ONE NEW ' +
        'TICK. Every 12 in-game hours (a SLOW scan — the audit-forfeiture is a slow, telegraphed legal process, NOT a ' +
        'per-minute one; this slow cadence keeps the per-player scan off the tick-heavy minute band so the tick-heavy ' +
        'citysim E2E stay under the per-test cap) it batch-reads the player\'s money_holdings, computes the EFFECTIVE ' +
        'held (held_cents + live-accrued yield, read-only), and runs the value-driven, TELEGRAPHED audit-forfeiture ' +
        'lifecycle set-based: SCHEDULE (effectiveHeld ≥ forfeiture_threshold_cents, none armed → arm ' +
        'forfeiture_scheduled_at_tick = now + forfeiture_warning_ticks), CANCEL (armed but dropped below threshold → ' +
        'NULL — the player reacted), EXECUTE (armed, now ≥ scheduled_at_tick, still ≥ threshold → settle yield then ' +
        'seize forfeiture_seize_pct 0.5 — the BIGGER legal bite vs the street raid\'s 0.4 — NULL the schedule; NO ' +
        'DAMAGED, NO building_raid). DISTINCT from the heat-driven street raid (T5a). Write-amplification: writes only ' +
        'on a transition. Runs AFTER the 12-h precinct-review band. Deterministic (NO RNG). Organically a no-op (no ' +
        'money_holding / all below threshold).',
    );
  }

  /** Register the TWELVE_H/5 = MONEY_HOLDING_AUDIT slot (the SAME registerSystem path the grow hook uses at MINUTE/18). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.MONEY_HOLDING_AUDIT,
      cadence: Cadence.TWELVE_H,
      order: 5,
      run: (ctx) => this.runAuditTick(ctx),
    });
  }

  // ───────────────────────────── the registered TWELVE_H/5 tick (audit-forfeiture lifecycle) ─────────────────────────

  /**
   * {TWELVE_H, order 5} — the per-player audit-forfeiture lifecycle, evaluated every 12 in-game hours (a SLOW scan: the
   * audit-forfeiture is a slow, telegraphed legal process and does NOT need minute granularity — keeping a per-player
   * scan OFF the tick-heavy minute band is also the perf discipline). ctx.gameMinute is the in-game minute AT this 12-h
   * boundary (the same `now` the threshold/deadline math uses + the EXECUTE settle re-anchors against). Set-based,
   * deterministic (NO RNG). Organically a no-op (no money_holding, or every hold below threshold with none armed).
   *
   * The EFFECTIVE held for the threshold test is held_cents + the LIVE-ACCRUED yield (read-only — the pure
   * accruedYieldCents; NOT a persisted settle, the write-amplification discipline). So a hold whose persisted held is
   * just below the threshold but whose accrued yield pushes it over IS correctly scheduled — and the settle that realizes
   * that yield only happens at EXECUTE (then partly seized).
   */
  private async runAuditTick(ctx: CitySimTickContext): Promise<void> {
    const holdings = await this.repo.listMoneyHoldingsForAudit(ctx.playerId);
    if (holdings.length === 0) return; // no money_holding → clean no-op (the common case).

    const now = ctx.gameMinute;
    const threshold = BigInt(moneyHoldingTunables.forfeitureThresholdCents);

    const toSchedule: string[] = [];
    const toCancel: string[] = [];
    const toExecute: MoneyHoldingAuditRow[] = [];

    for (const h of holdings) {
      // EFFECTIVE held = persisted held + live-accrued yield (read-only — NOT settled here). max(0, now − anchor) is
      // guarded inside accruedYieldCents (0n when the clock has not advanced past the anchor or held ≤ 0).
      const effectiveHeld = h.held_cents + accruedYieldCents(h.held_cents, h.last_yield_tick, now);
      const overThreshold = effectiveHeld >= threshold;
      const scheduled = h.forfeiture_scheduled_at_tick !== null;

      if (overThreshold && !scheduled) {
        // SCHEDULE — over the threshold and no telegraph armed yet → arm it (now + warning window).
        toSchedule.push(h.building_id);
      } else if (scheduled && !overThreshold) {
        // CANCEL — a telegraph is armed but the hold dropped back below the threshold → disarm (the player reacted).
        toCancel.push(h.building_id);
      } else if (scheduled && overThreshold && now >= (h.forfeiture_scheduled_at_tick as number)) {
        // EXECUTE — armed, the warning window has elapsed, and the hold is STILL over the threshold → the legal bite.
        toExecute.push(h);
      }
      // else: STEADY STATE (below threshold + none armed, OR armed + over + still inside the window) → NO write.
    }

    // SCHEDULE — ONE set-based UPDATE arming the telegraph (forfeiture_scheduled_at_tick = now + warning) on the un-armed,
    // over-threshold set. The deadline is computed here (R2.3 — forfeiture_warning_ticks from the registry/env, not inline).
    if (toSchedule.length > 0) {
      const scheduledAtTick = now + moneyHoldingTunables.forfeitureWarningTicks;
      await this.repo.scheduleForfeiture(ctx.playerId, toSchedule, scheduledAtTick);
    }

    // CANCEL — ONE set-based UPDATE disarming the telegraph (NULL the schedule) on the armed-but-now-below set.
    if (toCancel.length > 0) {
      await this.repo.cancelForfeiture(ctx.playerId, toCancel);
    }

    // EXECUTE — one tx per holding (rare): settle yield first (REUSE T4's settle, capped at the tier capacity), then seize
    // forfeiture_seize_pct of the post-settle held, NULL the schedule. NO structural_state change, NO building_raid row.
    let executed = 0;
    for (const h of toExecute) {
      const capacityCents = capacityCentsForTier(h.money_holding_tier);
      await this.repo.executeForfeiture({
        playerId: ctx.playerId,
        buildingId: h.building_id,
        capacityCents,
        currentTick: now,
      });
      executed += 1;
    }

    if (toSchedule.length > 0 || toCancel.length > 0 || executed > 0) {
      this.logger.log(
        `MONEY_HOLDING_AUDIT: player=${ctx.playerId} tick=${now} → scheduled=${toSchedule.length} ` +
          `cancelled=${toCancel.length} executed=${executed} (forfeiture_seize_pct ${moneyHoldingTunables.forfeitureSeizePct.numerator}/` +
          `${moneyHoldingTunables.forfeitureSeizePct.denominator}; the bigger legal bite, NO damage).`,
      );
    }
  }
}
