// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T7 (APPOINTMENT_EXPIRE tick @ MINUTE/17
//             — a SCHEDULED booking past its window flips EXPIRED) + §6 (tick ordering: MINUTE/17, after
//             HUSH_ADDICTION/16; no per-player collision; set-based single UPDATE; guarded) +
//             docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (the CitySimSystem hook
//             contract — an operational tick-hook plugs into the SAME scheduler at a declared (cadence, order) slot) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.10.6 (ash_appointment — R9.3, READ + mutate)
//             -- session:2026-06-06 (Phase 2c vector #2c — substances/Ash — Task 7) --
//
// `AshAppointmentAdvanceService` — the APPOINTMENT_EXPIRE expiry tick (Phase-2c vector #2c — Ash luxury channel). It is
// an operational-chain tick-hook (NOT one of the 11 city-sim systems) registered on the EXISTING CitySimScheduler at
// {MINUTE, order 17 = APPOINTMENT_EXPIRE} (the next FREE slot after HUSH_ADDICTION/16). It mirrors
// HushAddictionAdvanceService's registration shape EXACTLY (OnApplicationBootstrap → registerCadence via the SAME
// registerSystem path), REPLACING the no-op placeholder there. This is the operational tick-hook PATTERN the cold-chain
// / hush / precursor-arrival / cook-advance hooks share.
//
// THE MINUTE/17 TICK (spec §4-T7 — a SCHEDULED Ash appointment left un-honored past its window flips to EXPIRED), per
// player, in ONE set-based UPDATE (NO per-row loop, NO RNG — the AshAppointmentRepository owns the SQL):
//   - EXPIRE STALE SCHEDULED bookings: every ash_appointment row that is still SCHEDULED (status = 'scheduled') AND gone
//     past its window (expires_at_tick < currentTick) flips to status = 'expired'. A HONORED/EXPIRED booking is never
//     touched; a SCHEDULED booking still inside its window (expires_at_tick >= currentTick) is preserved. honor (T8)
//     flips SCHEDULED → 'honored' BEFORE the window closes, so an honored booking is excluded from the sweep by the
//     status predicate.
// The WHERE predicate (status = 'scheduled' AND expires_at_tick < currentTick) is the set-based guard — the sweep is
// idempotent (a second pass re-selects 0 rows: the just-expired rows are no longer 'scheduled'). The (status,
// expires_at_tick) index (T0) serves it as a range scan.
//
// DETERMINISM (NO RNG): which bookings expire (the status + window condition) is a FIXED function of the persisted
// status / expires_at_tick + the player's current tick. Organically a no-op (no SCHEDULED booking past its window — the
// common case: no Ash appointment, or every booking still inside its window / already honored). R9.3: the expiry reads
// ONLY the persisted ash_appointment row — the window itself was stamped at BOOK time (ash.appointment_window_ticks);
// ZERO inline numeric literal here.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { AshAppointmentRepository } from './ash-appointment.repository';

@Injectable()
export class AshAppointmentAdvanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AshAppointmentAdvanceService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: AshAppointmentRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'AshAppointmentAdvanceService registered at MINUTE/17 (APPOINTMENT_EXPIRE) — each in-game minute it flips every ' +
        "of the player's SCHEDULED Ash appointments gone past its window (expires_at_tick < currentTick) to EXPIRED, " +
        'set-based (ONE UPDATE; the status + window predicate is the guard). Runs AFTER HUSH_ADDICTION/16. honor (T8) ' +
        'flips SCHEDULED → honored before the window, so an honored booking is excluded by the status predicate. ' +
        'Deterministic (NO RNG). Organically a no-op (no SCHEDULED booking past its window).',
    );
  }

  /** Register the MINUTE/17 = APPOINTMENT_EXPIRE slot (the SAME registerSystem path the hush hook uses at MINUTE/16). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.APPOINTMENT_EXPIRE,
      cadence: Cadence.MINUTE,
      order: 17,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/17 tick (Ash appointment expiry) ─────────────────────────────

  /**
   * {MINUTE, order 17} — expire the player's stale SCHEDULED Ash appointments set-based. ONE batched UPDATE (status =
   * 'expired' WHERE status = 'scheduled' AND expires_at_tick < currentTick), GUARDED by the status + window predicate.
   * Deterministic (NO RNG). Organically a no-op (no SCHEDULED booking past its window). ctx.gameMinute is the in-game
   * minute AFTER this boundary — the same tick value a booking's expires_at_tick is anchored against (booked_at_tick =
   * the clock's game_minute at book time).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const expired = await this.repo.expireScheduledOlderThan(ctx.playerId, ctx.gameMinute);
    if (expired > 0) {
      this.logger.log(
        `APPOINTMENT_EXPIRE: player=${ctx.playerId} tick=${ctx.gameMinute} → ${expired} SCHEDULED appointment(s) ` +
          'expired (past their window; flipped to EXPIRED).',
      );
    }
  }
}
