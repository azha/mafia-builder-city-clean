// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Phase-2b vector #2c (Ash) T0 — the
//             `ash.appointment_window_ticks` registry key (added Phase-2c T0) +
//             docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T7 (appointment booking + expiry) + §7
//             (config & tunables, R2.3 — `ash.appointment_window_ticks`)
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 7) --
//
// Ash APPOINTMENT tunables (Phase-2c vector #2c — Ash luxury channel) — the single `ash.*` key THIS slice CONSUMES: the
// APPOINTMENT WINDOW (`ash.appointment_window_ticks` — the number of in-game MINUTE ticks between a booking's
// `booked_at_tick` and its `expires_at_tick`). T7 = the player BOOKS an appointment at a Glass venue (the booking lands
// SCHEDULED with `expires_at_tick = booked_at_tick + window`); a SCHEDULED booking left un-honored PAST that window is
// flipped to EXPIRED by the APPOINTMENT_EXPIRE tick (MINUTE/17). honor itself is T8 — this slice owns only book + expiry.
//
// R2.3 (NO inline numeric balance/config): the consumed registry key is referenced from gdd/14 §Phase-2b vector #2c
// (Ash) T0. It is surfaced as env-overridable fallback so this file stays a faithful MIRROR of the single source of
// truth. If the registry value changes, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// TEST-ONLY FAST KNOB: the prod default (120 = 2h in-game ≈ 4 real min) is too slow to OBSERVE an expiry in an E2E, so
// the value is honored from the env var `ASH_APPOINTMENT_WINDOW_TICKS` (UNSET in prod/dev → the prod default 120 is
// byte-for-byte unchanged). The E2E stack sets it small (so a booking expires in a handful of advance ticks) via
// _fast_tunables.ts — exactly like SUBSTANCE_HUSH_WITHDRAWAL_PERIOD_TICKS / SUBSTANCE_ASH_COOK_STAGE_DURATION_TICKS.
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved Ash appointment tunables. The key is gdd/14 §Phase-2b vector #2c (Ash) T0 (the booking → expiry window). R2.3
 * — NOT inline. Env override: ASH_APPOINTMENT_WINDOW_TICKS (test-only; the registry reads this same env var so server ==
 * spec by construction). `appointmentWindowTicks` is clamped ≥ 1 at the consumption sites so a degenerate 0/negative
 * override can never make `expires_at_tick == booked_at_tick` (which would expire a booking the SAME tick it is made).
 * DB-override > env > default (Phase-23).
 */
export const ashAppointmentTunables = {
  /**
   * ash.appointment_window_ticks — the booking → expiry window in MINUTE ticks. Default 120. Env override:
   * ASH_APPOINTMENT_WINDOW_TICKS (test-only). Consumed by AshAppointmentService.book (expires_at_tick = booked_at_tick +
   * this) + AshAppointmentAdvanceService (the MINUTE/17 sweep — a SCHEDULED booking whose expires_at_tick < currentTick
   * flips EXPIRED). `[PROV-Y26Q2]`. (DB-override > env > default — Phase-23).
   */
  get appointmentWindowTicks(): number {
    return TunablesStore.resolveInt('ash.appointment_window_ticks', 'ASH_APPOINTMENT_WINDOW_TICKS', 120);
  },
};
