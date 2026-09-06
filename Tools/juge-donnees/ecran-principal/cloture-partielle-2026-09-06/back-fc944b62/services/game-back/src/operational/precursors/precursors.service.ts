// IMPLEMENTS: docs/tech/04a_operational_systems/precursors_supply_chain.md §Canal légitime — Pyralin
//             (PrecursorService.placeOrder for the LEGITIMATE channel — Pyralin) + §Dynamique de prix (the price
//             is grounded as a ratio, the fluctuating market_state model DEFERRED) + §Cross-cutting (the building
//             must be OPERATIONAL before storing precursors) + docs/tech/09_data_model/schema_operational_chain.md
//             §2/§3 (precursor_order — R9.3)
//             -- session:2026-06-03 (Phase 2 Task 2) --
//
// `PrecursorService` (Step 1 — the player-triggered ORDER action of the M1 Pyralin sourcing slice). It owns the
// action LOGIC; the repository owns the raw reads/writes (the persisted-system service/repository split).
//
// ── Step 1 — ORDER (legitimate channel, precursors_supply_chain.md §Canal légitime — sourcing):
//    order(playerId, buildingId, precursorType, qty) DEBITS economy_states.cash_cents by the GROUNDED order cost for
//    THAT precursor (qty × precursors.<type>_unit_price_ratio × conversion.base_cost_standard_min × 100 — see
//    precursorOrderCostCents) and creates a precursor_order (status='pending', ordered_at_tick = the player's current
//    in-game tick, arrives_at_tick = ordered + the DETERMINISTIC lead time in ticks). The ACCEPTED precursor type is
//    REGISTRY-DRIVEN — a precursor consumed by some shipped substance (Pyralin = Brindle, Verdant root extract =
//    Crick; substance-config.ts), never hardcoded pyralin. The debit + the order insert are ATOMIC + guarded
//    (insufficient cash → no debit, no order → 409). The gray Thalmite / restricted Garnet salt channels, the markups,
//    degradation, price-disruption events, and the anomalous-volume MIS flag are ALL DEFERRED — YAGNI.
//
//    The stock is incremented LATER, on ARRIVAL (the PRECURSOR_ARRIVAL MINUTE tick — PrecursorArrivalService, already
//    precursor-agnostic), not at order time: an order ARRIVES after the lead time, exactly the §Canal légitime "Lead
//    time 2–4 in-game days" semantics. The building must be the player's OWN building AND OPERATIONAL (the
//    precursor-storage gate, §Cross-cutting). The lead time is the SAME deterministic value for every precursor this
//    slice (no per-precursor lead-time tunable — `[PROV]`/YAGNI).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { operationalDayLengthMinutes } from '../real_estate/conversion-tunables';
import { isConfiguredPrecursor } from '../substance/substance-config';
import { PrecursorsRepository } from './precursors.repository';
import {
  pyralinLeadTimeTicks,
  type M1PrecursorType,
} from './precursor-tunables';
import { PrecursorMarketStateService } from './precursor-market.service';

@Injectable()
export class PrecursorService {
  private readonly logger = new Logger(PrecursorService.name);

  constructor(
    private readonly repo: PrecursorsRepository,
    // B3: injected for the post-debit demand hook (recordOrderDemand is called AFTER debitAndCreateOrder succeeds).
    private readonly precursorMarket: PrecursorMarketStateService,
  ) {}

  /**
   * Step 1 — ORDER (legitimate channel, precursors_supply_chain.md §Canal légitime — sourcing). Place a precursor
   * order for a player-owned OPERATIONAL building. The accepted precursor type is REGISTRY-DRIVEN (substance-config.ts):
   * a precursor consumed by some shipped substance (Pyralin = Brindle, Verdant root extract = Crick, Lull resin =
   * Hush, Glass lily = Ash) — never a hardcoded pyralin literal. DEBITS economy_states.cash_cents by the grounded order cost for THAT precursor (qty ×
   * the per-precursor grounded unit price — see precursorOrderCostCents) and creates a precursor_order
   * (status='pending', ordered_at_tick = the player's current in-game tick, arrives_at_tick = ordered + the
   * deterministic lead time in ticks). The debit + the order insert are ATOMIC (one DB transaction) and guarded: an
   * insufficient balance refuses the WHOLE order (no debit, no order, the wallet never goes negative). The stock
   * increments LATER on arrival (the PRECURSOR_ARRIVAL tick — already precursor-agnostic). Returns the new order_id.
   *
   * LEAD TIME (M1 model — `[PROV]`): the SAME deterministic lead time (the RANGE-MIN Pyralin lead, pyralinLeadTimeTicks)
   * is reused for every precursor this slice — no per-precursor lead-time tunable exists for verdant_root_extract
   * (none in gdd/14), so inventing one would be a fabricated value (R2.3). A per-precursor lead time lands if/when the
   * design specifies one (YAGNI).
   *
   * Validation: precursorType ∈ the registry-derived accepted set (a configured substance's precursor); qty a positive
   * integer; the building must be the player's OWN building AND OPERATIONAL (the precursor-storage gate); the player
   * must have a wallet with enough cash. A non-accepted type / bad qty → 422; an unknown/non-operational building →
   * 404; no wallet → 404; insufficient cash → 409.
   */
  async order(
    playerId: string,
    buildingId: string,
    precursorType: string,
    quantityUnits: number,
  ): Promise<{ orderId: string }> {
    const normalizedType = precursorType.toLowerCase();
    if (!isConfiguredPrecursor(normalizedType)) {
      // L0.3 (D5) — enum, CASE-INSENSITIVE (kept as `isConfiguredPrecursor`, never `enumField`'s
      // case-sensitive `.includes` — see precursors.controller.ts's own note at its call site).
      throw new ApiError('VALIDATION_FAILED', {
        message: `precursorType must be a configured precursor (PYRALIN | VERDANT_ROOT_EXTRACT | LULL_RESIN | GLASS_LILY | THALMITE | GARNET_SALT), got "${precursorType}".`,
        details: { param: 'precursor_type' },
      });
    }
    if (!Number.isInteger(quantityUnits) || quantityUnits < 1) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `quantityUnits must be a positive integer (got "${quantityUnits}").`,
        details: { param: 'quantity_units' },
      });
    }

    const owned = await this.repo.getOwnedOperationalBuilding(playerId, buildingId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned OPERATIONAL building for this player (precursor storage requires an operational building).`,
      });
    }

    const type = normalizedType as M1PrecursorType;
    // B6: route the order cost through the state-aware realised cost (trend × scarcity over the fixed ratio).
    // The fixed ratio (precursorUnitPriceCents) is the SEED/FALLBACK: STABLE + no-scarcity → identity ($150/unit).
    // The realised cost is computed BEFORE the atomic debit (the debit/guard block below is OTHERWISE UNCHANGED).
    // DD-P5: the cash paid at order confirmation is a clear transaction value (consistent with D1/D1b/slice).
    // [See PrecursorMarketStateService.realisedOrderCostCents for the DD-P5 flag + maximalist fallback note.]
    const costCents = await this.precursorMarket.realisedOrderCostCents(type, quantityUnits);

    const wallet = await this.repo.getWalletCents(playerId);
    if (wallet === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No economy wallet for this player.' });
    }

    const orderedAtTick = await this.repo.getCurrentTick(playerId);
    // M1 lead time `[PROV]`: the SAME deterministic lead time is reused for every precursor (no per-precursor lead-time
    // tunable exists for verdant_root_extract — inventing one would fabricate a value, R2.3). YAGNI.
    const leadTicks = pyralinLeadTimeTicks(operationalDayLengthMinutes(citySimTunables.inGameDayLengthMinutes));
    const arrivesAtTick = orderedAtTick + leadTicks;

    const orderId = await this.repo.debitAndCreateOrder({
      playerId,
      buildingId,
      precursorType: type,
      quantityUnits,
      costCents,
      orderedAtTick,
      arrivesAtTick,
    });
    if (orderId === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative).
      // B3: demand is NOT recorded for refused orders — the hook is post-debit only.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the precursor order cost.',
      });
    }

    // B3: record the demand signal AFTER the atomic debit succeeds (post-debit hook — DD-T endogenous).
    // Only reached if the order was accepted (orderId !== null) — refused/failed orders are skipped.
    // Fire-and-forget: demand recording is non-transactional and best-effort (does not gate the order response).
    // Error isolation: a failure here NEVER reverses the order (the order is already committed).
    void this.precursorMarket.recordOrderDemand(type, quantityUnits).catch((err: unknown) => {
      this.logger.warn(
        `recordOrderDemand: non-fatal error recording demand for type=${type} qty=${quantityUnits}: ${String(err)}`,
      );
    });

    this.logger.log(
      `order: player=${playerId} building=${buildingId} type=${type} qty=${quantityUnits} ` +
        `→ order=${orderId} (ordered@${orderedAtTick}, arrives@${arrivesAtTick}, +${leadTicks} ticks)`,
    );
    return { orderId };
  }
}
