// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T7 (AshAppointmentService + controller
//             — POST /v1/operational/appointment; the luxury-channel booking gate) + §6 (the appointment state machine
//             book → SCHEDULED → expire) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.10.6 (ash_appointment — T0, NO schema change)
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 7) --
//
// `AshAppointmentService` — the player-triggered BOOK action of the Ash luxury channel (T7). Ash sells through a luxury
// channel: the player BOOKS an appointment at a Glass-district venue, then later HONORS it to sell (honor = T8, NOT
// here). T7 owns the booking + the expiry lifecycle (book → SCHEDULED → swept to EXPIRED by the APPOINTMENT_EXPIRE tick
// if not honored before the window). There is NO lek/dealer-spot selling for Ash (the luxuryChannel trait — T8).
//
// THE ACTION (AshAppointmentService.book(playerId, glassVenueBuildingId)):
//   1) VALIDATE THE VENUE (the booking gate, AshAppointmentRepository.validateGlassVenue): the venue must be the player's
//      OWNED building (404 RESOURCE_NOT_FOUND if not owned / not the player's — a cross-player building is invisible) AND
//      located in the Glass district (422 VALIDATION_FAILED if owned but NOT a Glass venue). The Glass attribute is
//      grounded against the REAL geography model: buildings.block_id → blocks.district_id → districts.profile = 'glass'
//      (districts.profile is the clean district attribute; the Glass-tier districts glass-1/2/3 carry profile 'glass').
//   2) BOOK (insertScheduled): read the player's current tick (city_sim_clock.game_minute), insert an ash_appointment
//      SCHEDULED with booked_at_tick = currentTick + expires_at_tick = currentTick + appointment_window_ticks (R2.3 —
//      the window is the gdd/14 ash.appointment_window_ticks tunable, NOT inline). Returns { appointment_id }.
//
// THE EXPIRY (not an action — the APPOINTMENT_EXPIRE tick, AshAppointmentAdvanceService @ MINUTE/17): a SCHEDULED
// booking left un-honored past its window is flipped to EXPIRED by the set-based sweep. The service owns the BOOK +
// the honor (T8) + the FORMAL T9 projection read (the qualitative status band + the qualitative payout_band — R2.2).
//
// IDEMPOTENCY: the mutating POST is subject to the existing IdempotencyInterceptor (REUSE — a retried book with the same
// Idempotency-Key replays the memorized response, NO re-execution → no double-booking). This service does not
// re-implement idempotency; the interceptor wraps the handler exactly as it wraps the upgrade-tier / order / convert POSTs.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { AshAppointmentRepository } from './ash-appointment.repository';
import { ashAppointmentTunables } from './ash-appointment-tunables';
import { AshPurityService } from './ash-purity.service';
import { substanceDescriptor } from '../substance/substance-config';
import { sellingTunables } from '../selling/selling-tunables';
import { HeatContribService } from '../heat_contrib/heat-contrib.service';

/** The qualitative appointment-status projection band (R2.2 — never the raw booked/expires ticks or grams/cents). */
export type AppointmentStatusBand = 'SCHEDULED' | 'HONORED' | 'EXPIRED';

/**
 * The qualitative appointment PAYOUT band (T9 — the value the sale realized, as a CLOSED band; R2.2 — NEVER the raw
 * payout_cents). Ascending in realized value:
 *   - PENDING  : the sale has NOT been realized yet (a SCHEDULED appointment — no value to band).
 *   - NONE     : the appointment was lost (EXPIRED — it will never sell → no value).
 *   - MODEST | FAIR | STRONG | PREMIUM : the realized value tier of an HONORED sale, derived from the realized PURITY
 *     premium (the honor's payout multiplier — CUT 1.0 → MODEST, STANDARD 1.5 → FAIR, PURE 2.5 → STRONG, CRYSTALLINE
 *     4.0 → PREMIUM). It tells the player "how lucrative was this sale" WITHOUT ever exposing the cents (a purer batch
 *     honored ⇒ a higher payout band).
 */
export type AppointmentPayoutBand = 'PENDING' | 'NONE' | 'MODEST' | 'FAIR' | 'STRONG' | 'PREMIUM';

/** The formal T9 appointment projection — the qualitative status band + the qualitative payout band (R2.2 band-only). */
export interface AppointmentProjection {
  appointment_id: string;
  /** The qualitative status band (SCHEDULED | HONORED | EXPIRED) — the raw enum mapped up-cased; no raw ticks. */
  status: AppointmentStatusBand;
  /**
   * The qualitative payout band (T9 — PENDING / NONE / MODEST / FAIR / STRONG / PREMIUM). The value the sale realized as
   * a CLOSED band — NEVER the raw payout_cents (R2.2). PENDING for a SCHEDULED appointment (not yet sold); NONE for an
   * EXPIRED one (lost — no sale); MODEST/FAIR/STRONG/PREMIUM for an HONORED one, reflecting the realized purity premium.
   */
  payout_band: AppointmentPayoutBand;
}

/** Map the raw ash_appointment_status enum → the up-cased projection band (R2.2). */
function statusBand(raw: 'scheduled' | 'honored' | 'expired'): AppointmentStatusBand {
  switch (raw) {
    case 'scheduled':
      return 'SCHEDULED';
    case 'honored':
      return 'HONORED';
    case 'expired':
      return 'EXPIRED';
  }
}

/**
 * The realized-multiplier → payout band cut-points (T9). The honor sale prices at `grams × base × margin × multiplier`
 * where the multiplier is the purity payout multiplier (CUT 1.0 / STANDARD 1.5 / PURE 2.5 / CRYSTALLINE 4.0 — gdd/14
 * purity.payout_multiplier). The projection RECOVERS the realized multiplier from the recorded honor figures (payout_cents
 * / (grams_sold × base × margin)) — an INTERNAL computation — and buckets it against MIDPOINT cut-points between the four
 * multipliers (1.25 / 2.0 / 3.25), so a small rounding residue from the honor `Math.round` lands in the right band. These
 * are presentation-only cut-points (they bucket an already-realized multiplier — NOT a balance tunable), keeping the
 * payout_band a faithful band of the realized purity premium without ever reading the raw cents.
 */
const PAYOUT_BAND_FAIR_FLOOR_MULTIPLIER = 1.25; // ≥ here (and < STRONG) → FAIR (the STANDARD 1.5 premium).
const PAYOUT_BAND_STRONG_FLOOR_MULTIPLIER = 2.0; // ≥ here (and < PREMIUM) → STRONG (the PURE 2.5 premium).
const PAYOUT_BAND_PREMIUM_FLOOR_MULTIPLIER = 3.25; // ≥ here → PREMIUM (the CRYSTALLINE 4.0 premium).

@Injectable()
export class AshAppointmentService {
  private readonly logger = new Logger(AshAppointmentService.name);

  constructor(
    private readonly repo: AshAppointmentRepository,
    private readonly purity: AshPurityService,
    private readonly heatContrib: HeatContribService,
  ) {}

  /**
   * Book an Ash appointment at a player-owned Glass-district venue. Validates ownership + the Glass district, then
   * inserts a SCHEDULED ash_appointment with booked_at_tick = currentTick + expires_at_tick = currentTick +
   * appointment_window_ticks.
   *
   * Errors (the existing operational conventions): not owned / not the player's building → 404 RESOURCE_NOT_FOUND;
   * owned but NOT a Glass-district venue → 422 VALIDATION_FAILED.
   *
   * Returns { appointment_id } (the raw booked/expires ticks are NOT forwarded — R2.2; the player surface is the
   * qualitative status band on the projection).
   */
  async book(playerId: string, glassVenueBuildingId: string): Promise<{ appointment_id: string }> {
    if (!glassVenueBuildingId || glassVenueBuildingId.trim() === '') {
      // A missing venue is a malformed request (well-formed JSON, business-rule break) → 422.
      throw new ApiError('VALIDATION_FAILED', { message: 'glass_venue_building_id is required to book an appointment.' });
    }

    const venue = await this.repo.validateGlassVenue(playerId, glassVenueBuildingId);
    if (!venue.owned) {
      // Not the player's building (or another player's) → invisible (404 — never a cross-player leak).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${glassVenueBuildingId} is not a player-owned building for this player.`,
      });
    }
    if (!venue.glass) {
      // Owned, but not in the Glass district → not a valid appointment venue (Ash books only at Glass venues).
      throw new ApiError('VALIDATION_FAILED', {
        message: `building ${glassVenueBuildingId} is not a Glass-district venue — an Ash appointment can only be booked at a Glass venue.`,
      });
    }

    // The booking → expiry window (R2.3 — gdd/14 ash.appointment_window_ticks; clamped ≥ 1 so a degenerate 0 override can
    // never expire a booking the SAME tick it is made).
    const windowTicks = Math.max(1, ashAppointmentTunables.appointmentWindowTicks);
    const bookedAtTick = await this.repo.getCurrentTick(playerId);
    const expiresAtTick = bookedAtTick + windowTicks;

    const appointmentId = await this.repo.insertScheduled({
      playerId,
      glassVenueBuildingId,
      bookedAtTick,
      expiresAtTick,
    });

    this.logger.log(
      `appointment booked: player=${playerId} venue=${glassVenueBuildingId} appointment=${appointmentId} ` +
        `(booked@${bookedAtTick} → expires@${expiresAtTick}, window=${windowTicks} ticks; SCHEDULED)`,
    );
    return { appointment_id: appointmentId };
  }

  /**
   * Honor an Ash appointment — the ONLY Ash sale path (T8; Ash has no dealer-spot/lek selling — the luxuryChannel
   * trait). Sells the Ash physically present at the appointment's reserved Glass venue, at the extreme luxury margin
   * scaled by the cooked batch's purity, credits the player's wallet, and flips the appointment HONORED. Atomic (one
   * tx) + idempotent (double-honor → 409; a same-Idempotency-Key replay is served by the interceptor).
   *
   * THE SALE PRICE (R2.3 — every factor is a grounded value, nothing invented):
   *   payout_cents = ash_grams × brindleDealValueCentsPerGram × descriptor.marginMultiplierVsBrindle × payoutMultiplier(band)
   *   - brindleDealValueCentsPerGram: the M1 selling base (gdd/14 selling — the SAME base DEALER_SELL uses, REUSE).
   *   - descriptor.marginMultiplierVsBrindle: the Ash registry margin (20× — "extreme margin"; gdd/14 production.ash).
   *   - payoutMultiplier(band): the purity premium (CUT 1.0 / STANDARD 1.5 / PURE 2.5 / CRYSTALLINE 4.0; gdd/14 purity).
   * The band is traced from the player's cooked batch (see AshAppointmentRepository.getVenueAshStockAndPurity — the
   * purity-at-venue mechanism). A batch with no recorded purity (no batch_purity row) defaults to the CUT floor (1.0 —
   * the base luxury margin, no premium; honest, never a fabricated band).
   *
   * Errors (the existing operational conventions): the appointment is not the player's / does not exist → 404
   * RESOURCE_NOT_FOUND; it exists but is NOT SCHEDULED (already HONORED, or EXPIRED) → 409 RESOURCE_STATE_CONFLICT; it is
   * SCHEDULED but NO Ash is at the venue → 409 RESOURCE_STATE_CONFLICT (NO_STOCK). The concurrency / double-honor guard is
   * the `status='scheduled'` predicate INSIDE the honor tx (exactly one honor wins → the loser gets 409 already-honored).
   *
   * Returns { honored: true } (the raw grams_sold / payout_cents are NOT forwarded — R2.2; the player surface is the
   * qualitative status + payout band on the projection, T9).
   */
  async honor(playerId: string, appointmentId: string): Promise<{ honored: true }> {
    // 1) RESOLVE THE APPOINTMENT (404 vs 409 disambiguation). Not the player's / non-existent → 404; exists but not
    //    SCHEDULED → 409 (already honored / expired). The honor tx re-guards status for concurrency (this is the surface
    //    error mapping, not the race guard).
    const target = await this.repo.getHonorTarget(playerId, appointmentId);
    if (!target) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such appointment for this player: ${appointmentId}.` });
    }
    if (target.status !== 'scheduled') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `appointment ${appointmentId} is ${target.status} — only a SCHEDULED appointment can be honored ` +
          `(a double-honor or an honor after expiry is rejected).`,
      });
    }

    // 2) RESOLVE THE VENUE ASH STOCK + the cooked batch's purity (the purity-at-venue mechanism — see the repo doc).
    const { ash_grams: ashGrams, purity_score: purityScore } = await this.repo.getVenueAshStockAndPurity(
      playerId,
      target.glass_venue_building_id,
    );
    if (ashGrams <= 0) {
      // SCHEDULED but no Ash delivered to the venue → nothing to sell (the player must distribute Ash there first).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `appointment ${appointmentId} has NO Ash at its venue ${target.glass_venue_building_id} to honor ` +
          `(distribute Ash to the venue before honoring).`,
      });
    }

    // 3) PRICE THE SALE (R2.3 — base × the Ash margin × the purity multiplier; nothing inline-invented).
    const descriptor = substanceDescriptor('ash');
    if (descriptor === null) {
      // Defensive — Ash ALWAYS ships a descriptor this slice (the registry is total over the enum). Never hit.
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'Ash has no shipped descriptor — cannot price the honor.' });
    }
    const baseValuePerGram = Math.max(0, sellingTunables.brindleDealValueCentsPerGram);
    // A batch with no recorded purity (no batch_purity row) → the CUT floor (multiplier 1.0; honest base luxury margin).
    const band = purityScore !== null ? this.purity.purityBand(purityScore) : 'CUT';
    const multiplier = this.purity.payoutMultiplier(band);
    const payoutCents = Math.round(ashGrams * baseValuePerGram * descriptor.marginMultiplierVsBrindle * multiplier);

    // 4) THE ATOMIC HONOR — flip SCHEDULED→HONORED (guarded — the double-honor race guard), decrement the venue Ash,
    //    credit the wallet, all in ONE tx. A null result = the guarded flip lost the race (already honored) → 409.
    const result = await this.repo.executeHonor({
      playerId,
      appointmentId,
      venueBuildingId: target.glass_venue_building_id,
      gramsSold: ashGrams,
      payoutCents,
    });
    if (!result) {
      // The guarded status flip matched 0 rows (a concurrent / replayed honor already flipped it) → 409 already-honored.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `appointment ${appointmentId} was already honored (concurrent honor) — only one honor can win.`,
      });
    }

    this.logger.log(
      `appointment honored: player=${playerId} appointment=${appointmentId} venue=${target.glass_venue_building_id} ` +
        `(band=${band}, grams=${result.grams_sold} sold; HONORED)`,
    );

    // 5) EMIT ASH DEAL HEAT (lot-4 TD-027 — production_secondaries.md:99: "precinct_alert_bucket Glass augmente d'un
    //    palier per deal"). The Ash honor is the highest-risk M1 transaction; it now emits one Glass-precinct heat
    //    injection on the venue building via the canonical HeatContribService seam (emitAshDealHeat → emitForBuildings →
    //    CityEventBus). Emitted AFTER the tx commits (the honor is already persisted → no risk of double-emit on a
    //    rollback). The current tick (the game_minute stamp for the heat event) is re-read from the repo (the SAME tick
    //    source AshAppointmentRepository.getCurrentTick uses at book time) — deterministic relative to the citysim clock.
    //    IDEMPOTENCY: the honor is single-shot (the SCHEDULED flip guards concurrency) → one honor = one emit, always.
    const gameMinute = await this.repo.getCurrentTick(playerId);
    await this.heatContrib.emitAshDealHeat(playerId, target.glass_venue_building_id, gameMinute);

    return { honored: true };
  }

  /**
   * The FORMAL T9 appointment projection — the qualitative status band + the qualitative payout band (R2.2 band-only).
   * Player-scoped (an appointment belonging to another player is invisible → null). Returns null when no such appointment
   * exists for this player. NEVER forwards the raw booked/expires ticks or the raw grams/cents (R2.2) — the honor figures
   * are read INTERNALLY only to derive the realized payout band.
   *
   * payout_band scheme: SCHEDULED → PENDING (not yet sold); EXPIRED → NONE (lost, no sale); HONORED → the realized value
   * tier (MODEST / FAIR / STRONG / PREMIUM), derived from the realized purity premium of the sale (the honor multiplier
   * recovered from the recorded figures — never the raw cents).
   */
  async projectAppointment(playerId: string, appointmentId: string): Promise<AppointmentProjection | null> {
    const row = await this.repo.getProjection(playerId, appointmentId);
    if (!row) return null;
    return {
      appointment_id: row.id,
      status: statusBand(row.status),
      payout_band: this.payoutBand(row.status, row.grams_sold, row.payout_cents),
    };
  }

  /**
   * Derive the qualitative payout band (T9) from the appointment's status + (for an HONORED one) the recorded honor
   * figures. SCHEDULED → PENDING (no realized sale yet); EXPIRED → NONE (lost — it will never sell). For an HONORED
   * appointment, RECOVER the realized purity-premium multiplier from the recorded figures —
   *   multiplier = payout_cents / (grams_sold × brindleDealValueCentsPerGram × marginMultiplierVsBrindle)
   * (the honor priced payout_cents = round(grams × base × margin × multiplier)) — an INTERNAL computation; only the
   * resulting BAND escapes (R2.2 — the raw cents/grams never leave). The multiplier is bucketed against the midpoint
   * cut-points into MODEST (CUT) / FAIR (STANDARD) / STRONG (PURE) / PREMIUM (CRYSTALLINE). A degenerate HONORED row
   * (no grams / no payout / a missing descriptor — never in practice) defaults to the MODEST floor (honest, the base
   * luxury tier; never a fabricated higher band).
   */
  private payoutBand(
    status: 'scheduled' | 'honored' | 'expired',
    gramsSold: number | null,
    payoutCents: number | null,
  ): AppointmentPayoutBand {
    if (status === 'scheduled') return 'PENDING'; // not yet realized.
    if (status === 'expired') return 'NONE'; // lost — no sale.

    // HONORED — recover the realized multiplier from the recorded figures (INTERNAL; the raw numbers never escape).
    if (gramsSold === null || gramsSold <= 0 || payoutCents === null) return 'MODEST'; // degenerate → the base floor.
    const descriptor = substanceDescriptor('ash');
    const baseValuePerGram = Math.max(0, sellingTunables.brindleDealValueCentsPerGram);
    const margin = descriptor?.marginMultiplierVsBrindle ?? 0;
    const denom = gramsSold * baseValuePerGram * margin;
    if (denom <= 0) return 'MODEST'; // no valid base/margin to recover against → the base floor (honest).
    const multiplier = payoutCents / denom;
    if (multiplier >= PAYOUT_BAND_PREMIUM_FLOOR_MULTIPLIER) return 'PREMIUM';
    if (multiplier >= PAYOUT_BAND_STRONG_FLOOR_MULTIPLIER) return 'STRONG';
    if (multiplier >= PAYOUT_BAND_FAIR_FLOOR_MULTIPLIER) return 'FAIR';
    return 'MODEST';
  }
}
