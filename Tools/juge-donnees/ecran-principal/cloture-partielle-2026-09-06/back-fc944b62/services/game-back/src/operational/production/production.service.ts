// IMPLEMENTS: docs/tech/04a_operational_systems/production_brindle.md §NestJS — backend jeu
//             (ProductionBrindleService.startCook — "valide LAB OPERATIONAL + précurseurs stockés … Crée une
//             CookSession") + §Invariant 5 (LAB must be OPERATIONAL) + §Stage 1 (Pyralin consumed per batch) +
//             §Cross-cutting (consumer of precursors — "vérifie le stock disponible … INSUFFICIENT_PRECURSOR") +
//             docs/tech/04a_operational_systems/production_secondaries.md §Crick (the refinery 1-stage refine) +
//             §Hush (the press_house 2-stage tablet press) +
//             docs/tech/09_data_model/schema_operational_chain.md §2/§3 (cook_session / precursor_stock — R9.3)
//             -- session:2026-06-05 (Phase 2b vector #2b — substances/Hush — Task 3) --
//
// `ProductionService` (Step 1 — the player-triggered START-COOK action). It owns the action LOGIC; the repository
// owns the raw reads/writes (the persisted-system service/repository split). startCook is SUBSTANCE-GENERIC: the
// substance descriptor (substance-config.ts) drives the host building type, the consumed precursor type + units,
// and (downstream, on the COOK_ADVANCE tick) the stage clock + yield — so Brindle (lab, pyralin, 4×30, 200 g),
// Crick (refinery, verdant_root_extract, 1×180, 200 g), and Hush (press_house, lull_resin, 2×75, 200 g) all flow
// through ONE code path. The Brindle descriptor equals the M1 constants by construction (substance-tunables.ts
// re-reads the same env vars), so Brindle is unchanged.
//
// ── Step 1 — START COOK (production_brindle.md §NestJS — startCook + §Invariant 5):
//    startCook(playerId, buildingId, substanceType, refiningPasses) resolves the substance descriptor (an unconfigured/
//    unknown substance — garbage → 422; Brindle/Crick/Hush/Ash all ship). The building must be the player's OWN building
//    AND OPERATIONAL (conversion_stage='operational'); its operational_type must MATCH the descriptor's buildingType
//    (lab↔brindle, refinery↔crick, press_house↔hush, specialized_lab↔ash; otherwise 409). `refiningPasses` (Ash only,
//    default 0 — the time↔purity lever) is validated (non-negative integer ≤ the substance's max; non-zero on a
//    non-refining substance → 422) and recorded on the cook (Ash lengthens its cook by refiningPasses × the per-pass
//    duration; T6 reads the count for purity). It CONSUMES the per-batch precursor the descriptor names (guarded
//    decrement on precursor_stock.quantity_units) and creates a cook_session (substance_type, current_stage='stage_1',
//    refining_passes, started/stage anchored at the player's current in-game tick). The consume + the cook insert are
//    ATOMIC + guarded (insufficient precursor → no decrement, no cook → 409).
//
//    The cook then advances stage-by-stage on the COOK_ADVANCE tick (ProductionCookAdvanceService) and yields the
//    finished substance into product_storage on completion.
//
// PRODUCT DESTINATION (the "linked stash"): the cook yields into product_storage keyed by building_id. cook_session
// keys ONLY the cook's building (no stash FK / no per-cook destination column), and product_storage.building_id is
// "STASH ou LAB" (09 §53 + product_storage.md §7 Inv 1: a lab has 1-batch in-building storage). The cleanest link the
// schema supports is therefore the cook BUILDING's OWN product_storage — the building holds the precursors it consumes
// and the batch it produces. Routing the batch onward to a dedicated STASH (a courier transfer — T4 distribution) is
// the documented downstream step, not a startCook parameter. No new schema column (R9.3).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { ProductionRepository } from './production.repository';
import {
  isConfiguredSubstance,
  substanceDescriptor,
  type ConfiguredSubstanceType,
} from '../substance/substance-config';
import { productionTunables } from './production-tunables';

@Injectable()
export class ProductionService {
  private readonly logger = new Logger(ProductionService.name);

  constructor(private readonly repo: ProductionRepository) {}

  /**
   * Step 1 — START COOK (production_brindle.md §NestJS — startCook ; production_secondaries.md §Crick). Start a cook of
   * `substanceType` on a player-owned OPERATIONAL building of the substance's host type. The substance descriptor
   * (substance-config.ts) drives everything: the required building type (lab↔brindle, refinery↔crick), the consumed
   * precursor type, and the per-batch units. Requires the building to hold ≥ 1 batch of that precursor; CONSUMES it
   * (guarded decrement) and creates a cook_session (substance_type, current_stage='stage_1', anchored at the player's
   * current in-game tick). The consume + the cook insert are ATOMIC (one DB transaction) and guarded: insufficient
   * precursor refuses the WHOLE cook (no decrement, no cook, the stock never goes negative). The cook then advances on
   * the COOK_ADVANCE tick and yields into product_storage on completion. Returns the new cook_session_id.
   *
   * Validation: `substanceType` must be a SHIPPED substance (Brindle / Crick / Hush / Ash — unknown → 422); the building
   * must be the player's OWN OPERATIONAL building (unknown/non-operational → 404) of the substance's host type
   * (wrong operational_type, e.g. startCook('crick') on a lab → 409); a cook must not already be in progress on that
   * building (one cook per building → 409); the building's precursor stock must cover one batch (insufficient → 409).
   *
   * REFINING PASSES (Ash, T3 — the time↔purity lever): `refiningPasses` (default 0) is the number of extra refining
   * passes the player chooses at cook start — each adds `descriptor.refiningPassDurationTicks` to the total cook (so the
   * cook finishes later; T6 reads the recorded count for purity). It is validated here: it must be a non-negative integer
   * (negative → 422) and ≤ the substance's `maxRefiningPasses` (> max → 422). Substances that do NOT support refining
   * passes (Brindle/Crick/Hush — no `maxRefiningPasses`) accept ONLY 0 (a non-zero request → 422). The count is persisted
   * on the new cook row's `refining_passes` column (0 for non-Ash cooks → those rows stay byte-identical).
   *
   * DELEGATED YIELD MULTIPLIER (Phase-11b C1 — the COOK tenure efficiency-bonus carrot): `opts.delegatedYieldPermille`
   * (optional; default undefined → no bonus) is a captured yield multiplier in permille (×1000) the COOK delegation
   * binding computes from the lieutenant's tenure streak AT START and stamps onto the cook row's
   * `delegated_yield_permille` column. A player-MANUAL cook (the cook endpoint, refinery, etc.) calls startCook WITHOUT
   * opts → the column is NULL → byte-identical insert (C2, a later task, reads NULL as ×1; a delegated COOK's permille is
   * applied at COOK_ADVANCE completion). startCook only CAPTURES it here; it never applies it (no yield change in C1).
   */
  async startCook(
    playerId: string,
    buildingId: string,
    substanceType: string,
    refiningPasses = 0,
    opts?: { delegatedYieldPermille?: number | null },
  ): Promise<{ cookSessionId: string }> {
    const normalizedSubstance = substanceType.toLowerCase();
    const descriptor = substanceDescriptor(normalizedSubstance);
    if (descriptor === null || !isConfiguredSubstance(normalizedSubstance)) {
      // An unconfigured / unknown substance (garbage) — the registry has no cook for it. Brindle/Crick/Hush/Ash all ship
      // a descriptor, so only unknown strings 422 here.
      throw new ApiError('VALIDATION_FAILED', {
        message: `substance must be a shipped substance (BRINDLE | CRICK | HUSH | ASH), got "${substanceType}".`,
      });
    }
    const substance: ConfiguredSubstanceType = normalizedSubstance;

    // Refining passes (Ash time↔purity lever). The cap is the substance's `maxRefiningPasses` (Ash only); substances that
    // do not support passes accept ONLY 0. A negative / non-integer / over-cap request is rejected BEFORE any DB work
    // (no precursor consumed, no cook created).
    const maxRefiningPasses = descriptor.maxRefiningPasses ?? 0;
    if (!Number.isInteger(refiningPasses) || refiningPasses < 0) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `refining_passes must be a non-negative integer, got "${refiningPasses}".`,
      });
    }
    if (refiningPasses > maxRefiningPasses) {
      throw new ApiError('VALIDATION_FAILED', {
        message:
          maxRefiningPasses === 0
            ? `${substance} does not support refining passes (refining_passes must be 0, got ${refiningPasses}).`
            : `refining_passes must be at most ${maxRefiningPasses} for ${substance}, got ${refiningPasses}.`,
      });
    }

    const owned = await this.repo.getOwnedOperationalBuilding(playerId, buildingId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned OPERATIONAL building for this player (a cook requires an operational building).`,
      });
    }
    if (owned.operational_type !== descriptor.buildingType) {
      // The building is operational, but its type does not host this substance (e.g. a 'crick' cook on a lab) → 409.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is a '${owned.operational_type}', but ${substance} is produced in a '${descriptor.buildingType}'.`,
      });
    }

    // D1 C6: guard on equipment_tier upgrade window — if the building is offline for a tier upgrade, reject startCook.
    // The building stays conversion_stage='operational' during the upgrade window (windowed upgrade design); this guard
    // is the explicit check. Error code RESOURCE_STATE_CONFLICT (the existing cook-blocked error family), reason
    // LAB_OFFLINE_UPGRADE distinguishable in the message. Mirrors the existing hasCookInProgress guard pattern.
    if (owned.equipment_tier_upgrade_remaining_ticks > 0) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${buildingId} is offline for equipment-tier upgrade ` +
          `(equipment_tier_upgrade_remaining_ticks=${owned.equipment_tier_upgrade_remaining_ticks}) — LAB_OFFLINE_UPGRADE.`,
      });
    }

    if (await this.repo.hasCookInProgress(playerId, buildingId)) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} already has a cook in progress (one cook per building).`,
      });
    }

    // D1 C4 — SECONDARY PRECURSOR UPFRONT VALIDATION (Brindle only — production_brindle.md §Stage 2/§Stage 3 +
    // precursors_supply_chain.md §156 "cook blocked if stock insufficient"). Validate ALL 3 precursors BEFORE any
    // DB write (fail-fast: you can't start a cook you can't finish). Thalmite (Stage 2) and Garnet salt (Stage 3)
    // are secondary inputs not carried by the substance descriptor (the descriptor only holds the primary precursor);
    // their required amounts come from the production tunables (D1 C3 batch tunables).
    if (substance === 'brindle') {
      const thalmiteRequired = productionTunables.thalmiteUnitsPerBatch;
      const thalmiteAvailable = await this.repo.getPrecursorStock(playerId, buildingId, 'thalmite');
      if (thalmiteAvailable < thalmiteRequired) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `Insufficient thalmite stock to start a ${substance} cook (requires ${thalmiteRequired} units in the building ` +
            `for Stage 2 — INSUFFICIENT_PRECURSOR_THALMITE).`,
        });
      }
      const garnetRequired = productionTunables.garnetSaltUnitsPerBatch;
      const garnetAvailable = await this.repo.getPrecursorStock(playerId, buildingId, 'garnet_salt');
      if (garnetAvailable < garnetRequired) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `Insufficient garnet_salt stock to start a ${substance} cook (requires ${garnetRequired} units in the building ` +
            `for Stage 3 — INSUFFICIENT_PRECURSOR_GARNET_SALT).`,
        });
      }
    }

    const batchUnits = descriptor.precursorUnitsPerBatch;
    const startedAtTick = await this.repo.getCurrentTick(playerId);

    const cookSessionId = await this.repo.consumePrecursorAndCreateCook({
      playerId,
      buildingId,
      substanceType: substance,
      precursorType: descriptor.precursorType,
      batchUnits,
      startedAtTick,
      refiningPasses,
      // Phase-11b C1: the captured tenure yield multiplier (permille) for a DELEGATED COOK. Manual cooks omit opts →
      // null → byte-identical insert. CAPTURE-only; C2 applies it at completion.
      delegatedYieldPermille: opts?.delegatedYieldPermille ?? null,
    });
    if (cookSessionId === null) {
      // The guarded precursor decrement affected 0 rows → insufficient stock (the stock would have gone negative).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `Insufficient ${descriptor.precursorType} stock to start a ${substance} cook (requires ${batchUnits} units in the building).`,
      });
    }

    this.logger.log(
      `startCook: player=${playerId} building=${buildingId} substance=${substance} → cook=${cookSessionId} ` +
        `(consumed ${batchUnits} ${descriptor.precursorType} units, stage_1 @${startedAtTick}, refining_passes=${refiningPasses})`,
    );
    return { cookSessionId };
  }

  /**
   * Whether a cook is in progress on the player's building — a thin public delegate to the (module-private) repository
   * read. Exposed at the SERVICE boundary so a sibling operational module (the COOK delegation binding, T5) can resolve
   * the `cook_idle` signal WITHOUT injecting `ProductionRepository` (which the module does not export) or duplicating the
   * cook-session SQL (the DRY-correct path — one definition of "cook in progress", no drift). A READ — no state change.
   */
  async hasCookInProgress(playerId: string, buildingId: string): Promise<boolean> {
    return this.repo.hasCookInProgress(playerId, buildingId);
  }
}
