// IMPLEMENTS: docs/tech/04a_operational_systems/selling_dealers_leks.md §NestJS — backend jeu (SellingService —
//             assignDealer "Met dealer en current_state = WORKING") + §How a deal works (cash → dealer.float_cents) +
//             §Lek control vs dealer assignment ("Runners pickup dealer float" → safehouse deposit) +
//             docs/tech/04_city_simulation/system_9_erlang_stash.md §États Safehouse (the Erlang slot model the
//             runner deposit CONSUMES — slot_capacity_cents per slot, current_fill per-slot percent) +
//             docs/tech/09_data_model/schema_operational_chain.md §2/§3 (dealer / product_storage — R9.3)
//             -- session:2026-06-03 (Phase 2 Task 5) --
//
// `SellingService` — the player-triggered ACTIONS of the M1 dealer-at-lek selling slice (the tick-driven sell itself
// is the DEALER_SELL tick-hook, SellingSellService). It owns the action LOGIC; the repository owns the raw reads/
// writes (the persisted-system service/repository split).
//
// ── assignDealer(playerId, dealerSpotId, lekTileId): create a WORKING dealer at a player-owned OPERATIONAL dealer-spot
//    covering a lek tile (selling_dealers_leks.md §NestJS — "Met dealer en current_state = WORKING"). M1 keeps this
//    minimal — a single Brindle-specialized dealer per call; the substance × dealer-spot-type validation, recruitment,
//    loyalty/fatigue, and the dealer coordinator behavior script are DEFERRED (YAGNI). The dealer then sells per the
//    DEALER_SELL tick (it must cover a lek that is PRESENT to actually sell — the tick gates on lek presence).
//
// ── collect(playerId, dealerId, safehouseId): the RUNNER PICKUP — ferry the dealer's whole cash float into a
//    player-owned safehouse (selling_dealers_leks.md §Lek control vs dealer assignment "Runners pickup dealer float";
//    §Implications — runner → safehouse deposit). The Erlang slot model (System 9) is CONSUMED: the deposit FILLS the
//    safehouse slots per the existing per-slot model (current_fill percent + slot_capacity_cents), and is REFUSED if
//    the whole float does not FIT in the remaining headroom (the EXACT cents headroom check in fillSlots — the single
//    authoritative saturation guard; NOT a loadBucket BAND pre-check, which is only an approximate occupancy signal).
//    M1 does NOT recompute the Erlang-B blocking probability — it fills the raw slot model the schema owns. A collect
//    with nothing to ferry (float = 0) → 409. (current_fill is per-slot PERCENT, not cents — System 9's unit; the
//    percent round-trip is lossy off whole-percent boundaries — see fillSlots for the unit rationale + T6 forward-note.)

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { ErlangStashService } from '../../citysim/erlang_stash/erlang-stash.service';
import { SellingRepository, type SafehouseSlotRow } from './selling.repository';

/** The outcome of a runner collect — the deposited amount is internal (never surfaced raw); ids are echoed. */
export interface CollectResult {
  dealerId: string;
  safehouseId: string;
}

@Injectable()
export class SellingService {
  private readonly logger = new Logger(SellingService.name);

  constructor(
    private readonly repo: SellingRepository,
    // System 9 (Erlang Stash) — CONSUMED for the occupation/blocking read (never reimplemented). Its module exports
    // ErlangStashService; SellingModule imports ErlangStashModule for this read-only coupling.
    private readonly erlang: ErlangStashService,
  ) {}

  /**
   * assignDealer (selling_dealers_leks.md §NestJS — "Met dealer en current_state = WORKING"). Create a WORKING
   * Brindle dealer at the player's OPERATIONAL dealer-spot covering `lekTileId`. Validation: the dealer-spot must be
   * the player's OWN OPERATIONAL `dealer_spot_front` building (else 404); lekTileId a non-negative integer (else 422).
   * Returns the new dealer id. M1 = a single Brindle dealer; recruitment / substance×spot validation / loyalty are
   * DEFERRED.
   */
  async assignDealer(playerId: string, dealerSpotId: string, lekTileId: number): Promise<{ dealerId: string }> {
    if (!Number.isInteger(lekTileId) || lekTileId < 0) {
      // r4/BLOCKING-1 — details.param was missing.
      throw new ApiError('VALIDATION_FAILED', {
        message: `lek_tile_id must be a non-negative integer (got "${lekTileId}").`,
        details: { param: 'lek_tile_id' },
      });
    }
    const spot = await this.repo.getOwnedOperationalDealerSpot(playerId, dealerSpotId);
    if (!spot) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `dealer_spot ${dealerSpotId} is not a player-owned OPERATIONAL dealer_spot_front for this player.`,
      });
    }
    const dealerId = await this.repo.assignWorkingDealer(playerId, dealerSpotId, lekTileId);
    this.logger.log(
      `assignDealer: player=${playerId} spot=${dealerSpotId} lek_tile=${lekTileId} → dealer=${dealerId} (WORKING)`,
    );
    return { dealerId };
  }

  /**
   * collect (the RUNNER PICKUP — selling_dealers_leks.md §Lek control vs dealer assignment "Runners pickup dealer
   * float"). Ferry the dealer's WHOLE cash float into the player's safehouse, depositing into the Erlang slot model
   * (System 9 CONSUMED). Validation/guards:
   *   - dealer not the player's → 404; safehouse not the player's → 404.
   *   - dealer float = 0 (nothing to ferry) → 409.
   *   - the float does not FIT in the safehouse's remaining headroom → 409 (the EXACT cents headroom check in
   *     fillSlots is the single authoritative saturation guard; M1 does NOT recompute the Erlang-B probability and
   *     does NOT pre-check loadBucket's approximate occupancy BAND — see the comment at the headroom guard).
   *   - the float is moved WHOLE atomically (zeroed on the dealer, deposited to the safehouse in one tx); a concurrent
   *     sell that changed the float between read and write → the guarded zero refuses → 409 (retryable).
   */
  async collect(playerId: string, dealerId: string, safehouseId: string): Promise<CollectResult> {
    const dealerRow = await this.repo.getOwnedDealer(playerId, dealerId);
    if (!dealerRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `dealer ${dealerId} is not a player-owned dealer.` });
    }
    const safehouseRow = await this.repo.getOwnedSafehouse(playerId, safehouseId);
    if (!safehouseRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `safehouse ${safehouseId} is not a player-owned safehouse.`,
      });
    }

    const floatCents = dealerRow.float_cents;
    if (floatCents <= 0) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `dealer ${dealerId} has no cash float to collect.`,
      });
    }

    // CONSUME System 9: the deposit must FIT in the safehouse's slot model. The SINGLE authoritative saturation guard
    // is the EXACT headroom check inside fillSlots (used + deposit > totalCapacity → refuse) — it is computed in real
    // cents against the real per-slot capacity, so it is precise at the margin. We deliberately do NOT pre-check
    // ErlangStashService.loadBucket(...) === 'FULL' here: loadBucket returns FULL at an avg occupancy BAND (≥95%), an
    // APPROXIMATE occupancy signal — NOT an exact saturation test. A safehouse with real cents headroom but avg≥95%
    // would be spuriously refused (and with a misleading "saturated" message) by such a pre-check, contradicting the
    // exact headroom guard below. loadBucket stays correct for the PLAYER-facing occupation BAND in the projection
    // (a separate, intended use); it is just not the right refusal predicate for the collect.

    // Compute the post-deposit per-slot fill by FILLING the safehouse's existing slot model (System 9 CONSUMED — the
    // per-slot percent + slot_capacity_cents semantics). If the float exceeds the remaining headroom the deposit is
    // refused (no partial/overflow deposit in M1 — the runner needs a safehouse that can take the whole float).
    const deposit = this.fillSlots(safehouseRow, floatCents);
    if (!deposit) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `safehouse ${safehouseId} has insufficient headroom for the dealer's float — collect blocked.`,
      });
    }

    const ok = await this.repo.applyCollect(playerId, {
      dealer_id: dealerId,
      depositedCents: floatCents,
      safehouse_id: safehouseId,
      postDepositFill: deposit,
    });
    if (!ok) {
      // The float changed between the read and the guarded zero (a concurrent sell) → ask the caller to retry.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `dealer ${dealerId} float changed during collect — retry.`,
      });
    }

    this.logger.log(
      `collect: player=${playerId} dealer=${dealerId} → safehouse=${safehouseId} (float ferried, dealer float zeroed)`,
    );
    return { dealerId, safehouseId };
  }

  /**
   * Fill a safehouse's slot model with `depositCents`, returning the post-deposit per-slot percent array — OR null if
   * the deposit does not FIT in the remaining headroom (M1 requires the whole float to land; no partial deposit).
   *
   * The Erlang slot model (System 9 CONSUMED, NOT reimplemented): each of `slot_count` slots holds up to
   * `slot_capacity_cents`; current_fill[i] is slot i's percent-filled (0..100). We convert each slot's percent → cents,
   * add the deposit across slots in order (lowest index first — a deterministic fill, no RNG), and convert back to
   * percent. The Erlang-B BLOCKING probability is NOT recomputed here (that is ErlangStashService's job); this is the
   * raw slot bookkeeping the safehouse schema owns, mirroring how a deposit would top up the per-slot fill.
   *
   * ── UNIT — WHY PERCENT, NOT CENTS (R9.3 — no schema change): `safehouses.current_fill` is the jsonb array System 9
   *    OWNS, and System 9 interprets it as per-slot PERCENT (0..100), NOT cents. ErlangStashService.loadBucket() bands
   *    the AVG of current_fill[] (avg≥95 → FULL, ≥75 → HIGH, …) and treats any entry >100 as an "open parcel" →
   *    forced FULL (erlang-stash.service.ts `loadBucket`); slot_capacity_cents is never read by loadBucket OR the
   *    player-facing projection (erlang-stash.projection.service.ts → loadBucket(s.current_fill, s.slot_count)). So if
   *    we stored raw cents here (e.g. 5000) every entry would read >100 and the System-9 occupation projection would
   *    report FULL/SATURATED for ANY non-empty safehouse — breaking the consumed system. Storing cents would also
   *    require a new cents column = a schema change (forbidden by R9.3). We therefore keep PERCENT, consistent with
   *    what System 9 expects.
   *
   * ── LOSSY + CUMULATIVE ROUND-TRIP (the consequence — documented, bounded): persisting per-slot percent and
   *    reconstructing cents on the NEXT collect (Math.round((pct/100)*capacity)) is LOSSY for any per-slot cents that
   *    is NOT a clean integer-percent of slot_capacity_cents, and the rounding error ACCUMULATES across repeated
   *    collects into the same slots. No REAL cash is ever lost — the dealer ledger (dealer.float_cents) is the
   *    authoritative cash and is zeroed EXACTLY for the amount read (applyCollect's guarded zero) — but the safehouse's
   *    REPRESENTED cash (reconstructed from percent) can drift by up to ~0.5% of slot_capacity_cents per slot per
   *    round-trip. This drift is in the System-9 representation only, bounded, and never debits/credits a ledger.
   *
   * ── FORWARD-NOTE TO T6 (laundering — the capstone cash-conservation loop): T6 will read the safehouse cash as its
   *    LAUNDERING INPUT. It MUST reconstruct cash the SAME way (Σ over slots of round((pct/100)*slot_capacity_cents)) —
   *    i.e. read the safehouse cash through this percent representation, NOT assume current_fill holds cents. To make
   *    the capstone conserve cash EXACTLY, drive collects with float amounts that are exact integer-percents of
   *    slot_capacity_cents (depositCents that land each slot on a whole-percent boundary — e.g. capacity 5000 → any
   *    multiple of 50 cents per slot is a clean 1%): such deposits round-trip with ZERO drift, so deposit N cents →
   *    safehouse reads back N cents exactly (the selling.spec exercises and asserts this conservation). Amounts off a
   *    whole-percent boundary will round, so the capstone uses on-boundary amounts (the documented constraint).
   */
  private fillSlots(safehouse: SafehouseSlotRow, depositCents: number): number[] | null {
    const slotCount = Math.max(0, Math.floor(safehouse.slot_count));
    const capacity = Math.max(0, safehouse.slot_capacity_cents);
    if (slotCount === 0 || capacity === 0) return null; // a degenerate safehouse cannot take a deposit.

    // Per-slot cents from the current percent fill (clamped to [0, capacity]).
    const slotCents: number[] = [];
    for (let i = 0; i < slotCount; i += 1) {
      const pct = Math.max(0, Math.min(100, safehouse.current_fill[i] ?? 0));
      slotCents.push(Math.round((pct / 100) * capacity));
    }

    // Total remaining headroom across all slots — the deposit must fit WHOLE (M1, no partial).
    const used = slotCents.reduce((acc, c) => acc + c, 0);
    const totalCapacity = slotCount * capacity;
    if (used + depositCents > totalCapacity) return null; // not enough headroom for the whole float.

    // Fill slots lowest-index-first (deterministic) until the deposit is placed.
    let remaining = depositCents;
    for (let i = 0; i < slotCount && remaining > 0; i += 1) {
      const room = capacity - slotCents[i];
      if (room <= 0) continue;
      const put = Math.min(room, remaining);
      slotCents[i] += put;
      remaining -= put;
    }

    // Back to per-slot percent (0..100) for the jsonb current_fill column.
    return slotCents.map((c) => Math.round((c / capacity) * 100));
  }
}
