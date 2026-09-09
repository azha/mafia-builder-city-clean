// IMPLEMENTS: docs/tech/04a_operational_systems/production_brindle.md §Pillar-check P5
//             ("le joueur voit des paliers qualitatifs … jamais des valeurs numériques continues. Le purity_grade
//             final est un palier qualitatif … Le true heat state interne du LAB est projeté en bucket qualitatif") +
//             §Implications par couche / Unity (the 4-stage cook UI is qualitative stage badges) +
//             docs/tech/04a_operational_systems/production_secondaries.md §Crick (the refinery single-stage refine) +
//             docs/tech/04a_operational_systems/product_storage.md §Invariant 7 (quantity_grams / purity affichés en
//             buckets qualitatifs côté joueur — R2.2 + P5) + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md
//             (R2.2 — no raw scalar to client) + docs/tech/09_data_model/schema_operational_chain.md §8 (P5 projection)
//             -- session:2026-06-04 (Phase 2b vector #2 — substances/Crick — Task 3) --
//
// `ProductionProjectionService` — the player-facing projections for a cook BUILDING's cook (a lab → Brindle, a
// refinery → Crick) + a building's product (the Production surface). Maps the RAW persisted fields
// (cook_session.current_stage + cook_session.substance_type + product_storage.quantity_grams) → QUALITATIVE payloads:
// a cook-stage BAND + the qualitative substance label + a product BAND. It NEVER forwards a raw scalar — no
// quantity_grams (the product mass), no purity float, no stage clock (started/stage_started_at_tick), no tier, and
// (crucially for Crick's 1-of-1 stage) no raw stage count. R2.2.
//
// THE BANDS (closed qualitative domains — the only cook/product signal exposed):
//   - cook_stage_band: IDLE (no cook in progress / never cooked) | EARLY (stage_1) | MID (stage_2 + the
//     stage_2_intermediate sub-state) | LATE (stage_3, stage_4) | DONE (completed). The aborted terminal maps to IDLE
//     (no active cook). Derived from the 7-member cook_stage enum by a FIXED mapping (a PRESENTATION bucketing — like
//     T1's setup-state band; NOT a sim tunable, only the closed-domain band label is exposed). A Crick cook's single
//     functional stage (stage_1) maps to EARLY while in progress and DONE on completion — a closed band, NOT "stage 1
//     of 1" (no raw count leaks; the player sees the same qualitative cook-progress vocabulary as Brindle).
//   - product_band: NONE (no product) | LOW | MEDIUM | HIGH. Derived from product_storage.quantity_grams by fixed
//     bucket cut-points (a PRESENTATION bucketing — like T2's stock band; never the raw grams).
//   - substance_type: the qualitative substance label (a closed enum domain — 'BRINDLE' for a lab, 'CRICK' for a
//     refinery), registry-resolved from the building's operational type (substanceForBuildingType), never hardcoded.
//
// THE BATCH PURITY BAND (Phase-2c vector #2c — Ash; T9): the storage projection of an Ash batch ALSO surfaces a
// qualitative purity_band (CUT/STANDARD/PURE/CRYSTALLINE) — the FORMAL projection of the batch's stamped purity_score
// (T6), mapped via AshPurityService.purityBand. null for a non-luxury substance (no purity grade) and for an Ash
// building with no completed cook yet. The raw purity_score is the INPUT but NEVER escapes — only the closed band.
//
// R2.2 RAW-LEAK GUARANTEE: the payloads contain ONLY closed-domain strings + booleans (+ explicit null) + the building
// uuid identity — NEVER quantity_grams, any purity SCORE/float, the stage clock ticks, a tier, or a raw stage count. The
// E2E scans the payload recursively and rejects any unexpected raw scalar.

import { Injectable } from '@nestjs/common';

import { ProductionRepository } from './production.repository';
import {
  isLuxurySubstance,
  substanceForBuildingType,
  type ConfiguredSubstanceType,
} from '../substance/substance-config';
import { ColdChainService, type TemperatureStatus } from '../coldchain/cold-chain.service';
import { ColdChainRepository } from '../coldchain/cold-chain.repository';
import { AshPurityService, type AshPurityBand } from '../ash/ash-purity.service';

/** The qualitative cook-stage band (the only cook-progress signal exposed — never the raw stage clock). */
export type CookStageBand = 'IDLE' | 'EARLY' | 'MID' | 'LATE' | 'DONE';

/** The qualitative product band (the only product signal exposed — never the raw quantity_grams). */
export type ProductBand = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

/** The PLAYER-FACING per-building cook projection (qualitative band + substance only — R2.2). Serves a lab (Brindle)
 *  and a refinery (Crick) alike — the substance is registry-resolved from the building's operational type. */
export interface LabCookProjection {
  /** The cook building identity (a uuid string — echoed for the client's Lab/Refinery surface; NOT a sim scalar). */
  building: string;
  /** The qualitative substance produced here (a closed enum domain — 'BRINDLE' lab / 'CRICK' refinery). */
  substance_type: string;
  /** The qualitative cook-stage band (IDLE / EARLY / MID / LATE / DONE — never the raw stage clock / count; R2.2). */
  cook_stage_band: CookStageBand;
}

/** The PLAYER-FACING per-building product projection (qualitative band + substance only — R2.2). */
export interface ProductStorageProjection {
  /** The building identity (a uuid string — echoed for the client's Storage surface; NOT a sim scalar). */
  building: string;
  /** The qualitative substance (a closed enum domain — 'BRINDLE' lab / 'CRICK' refinery). */
  substance_type: string;
  /** The qualitative product band (NONE / LOW / MEDIUM / HIGH — never the raw quantity_grams; R2.2). */
  product_band: ProductBand;
  /**
   * Phase-2b vector #2 — the cold-chain temperature_status BAND for a COLD-CHAIN substance (Crick): OPTIMAL_COLD (a
   * cold_storage_capable building — preserved) | MODERATE (an ambient/non-cold building — degrading). A closed band
   * (R2.2 — never a raw °C). NULL for a non-cold-chain substance (Brindle has no cold chain). Optional in the payload:
   * present (string|null) for the cold-chain surface; the recursive no-leak scan tolerates null.
   */
  temperature_status: TemperatureStatus | null;
  /**
   * Phase-2b vector #2 — whether the cold-chain product is actively DEGRADING (a boolean band, R2.2): true for a warm
   * Crick holding (MODERATE — losing grams each COLD_CHAIN tick), false for OPTIMAL_COLD (preserved) and for a
   * non-cold-chain substance (Brindle never degrades). NEVER the raw rate.
   */
  degrading: boolean;
  /**
   * Phase-2c vector #2c (Ash — T9) — the qualitative PURITY band of an Ash batch (CUT | STANDARD | PURE | CRYSTALLINE).
   * The FORMAL projection of the batch's deterministic purity_score (stamped at cook completion, T6) — derived via
   * AshPurityService.purityBand. R2.2: the raw purity_score never escapes; the player sees ONLY the band. NULL for a
   * NON-luxuryChannel substance (Brindle/Crick/Hush have no purity grade) AND for an Ash building with no completed cook
   * yet (no batch_purity row). It tells the player their Ash batch's quality grade without ever reading the raw score.
   */
  purity_band: AshPurityBand | null;
}

// Product band cut-points (grams). A PRESENTATION bucketing of the raw quantity_grams into the qualitative band domain
// — the player only ever sees the BAND, never the grams (R2.2). These are not sim-balance tunables (no timing/cost/
// drop-rate/threshold is exposed); they are the closed-domain band boundaries, analogous to T2's stock band. A single
// cook yields 200 g (Brindle Tier-1 output / Crick yield_grams both = 200), so one cook lands MEDIUM (substance-agnostic).
const PRODUCT_BAND_LOW_MAX = 100; // 1..100 g → LOW (less than one cook)
const PRODUCT_BAND_MEDIUM_MAX = 500; // 101..500 g → MEDIUM (~1 cook); > 500 → HIGH (multiple cooks)

@Injectable()
export class ProductionProjectionService {
  constructor(
    private readonly repo: ProductionRepository,
    private readonly coldChain: ColdChainService,
    private readonly coldChainRepo: ColdChainRepository,
    // Phase-2c vector #2c (Ash — T9): the pure purity-band mapper (AshPurityService.purityBand) the storage projection
    // injects to surface an Ash batch's qualitative purity_band from its stamped score (the score never escapes; R2.2).
    private readonly ashPurity: AshPurityService,
  ) {}

  /**
   * Project a player's cook BUILDING (a lab → Brindle, a refinery → Crick) → a fully-qualitative payload. Resolves the
   * substance from the building's OPERATIONAL TYPE (substanceForBuildingType — registry-driven), reads the latest cook
   * session's raw stage (mapped to a BAND — the raw stage clock / count is NEVER forwarded; R2.2). Returns null when
   * the building is not the player's OPERATIONAL cook building (the controller maps that to a 404): a non-owned /
   * non-operational building, or an operational building whose type hosts no shipped substance (a generic stash).
   */
  async projectLab(playerId: string, buildingId: string): Promise<LabCookProjection | null> {
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, buildingId);
    if (!owned) return null;
    const substance = substanceForBuildingType(owned.operational_type);
    if (substance === null) return null; // operational, but not a cook building (no shipped substance) → no surface.

    const latest = await this.repo.getLatestCookState(playerId, buildingId);
    return {
      building: buildingId,
      // The latest cook's substance is authoritative when one exists; else the building type's registry substance.
      substance_type: this.substanceLabel((latest?.substance_type as ConfiguredSubstanceType | undefined) ?? substance),
      cook_stage_band: this.cookStageBand(latest?.current_stage ?? null),
    };
  }

  /**
   * Project a player's product for a cook building → a fully-qualitative payload. Resolves the substance from the
   * building's OPERATIONAL TYPE (registry-driven — Brindle lab / Crick refinery), reads the raw product grams for THAT
   * substance (mapped to a BAND — the raw grams are NEVER forwarded; R2.2). Returns null when the building is not the
   * player's OPERATIONAL cook building (the controller maps that to a 404). A cook yields into the building's own
   * storage, so the storage projection is keyed on the same operational-cook-building gate as the cook.
   */
  async projectStorage(playerId: string, buildingId: string): Promise<ProductStorageProjection | null> {
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, buildingId);
    if (!owned) return null;
    const substance = substanceForBuildingType(owned.operational_type);
    if (substance === null) return null; // operational, but not a cook building (no shipped substance) → no surface.

    const grams = await this.repo.getProductQuantityGrams(playerId, buildingId, substance);

    // Cold-chain (Phase-2b vector #2): for a COLD-CHAIN substance (Crick), derive the temperature_status BAND from the
    // building's cold_storage_capable flag (a refinery / cold-opted stash → OPTIMAL_COLD; an ambient building →
    // MODERATE) + the degrading flag. For a NON-cold-chain substance (Brindle) the derivation returns null → no band,
    // degrading=false (Brindle has no cold chain — behavior-preserving). R2.2: a closed band, never a raw °C/rate.
    const coldCapable = (await this.coldChainRepo.getBuildingColdStorageCapable(playerId, buildingId)) ?? false;
    const temperatureStatus = this.coldChain.holdingTemperatureStatus(substance, coldCapable);

    // Phase-2c vector #2c (Ash — T9): the batch purity band. ONLY a luxuryChannel substance (Ash) carries a purity grade
    // — for a NON-luxury substance (Brindle/Crick/Hush) there is no batch_purity row, so purity_band is null (the read is
    // SKIPPED entirely, behavior-preserving). For an Ash batch, read the stamped purity_score (T6) and map it to the
    // closed band via AshPurityService.purityBand; null when no completed Ash cook has stamped a batch yet. R2.2: the raw
    // score is the INPUT but never escapes — only the band.
    const purityBand = await this.batchPurityBand(playerId, buildingId, substance);

    return {
      building: buildingId,
      substance_type: this.substanceLabel(substance),
      product_band: this.productBand(grams),
      temperature_status: temperatureStatus,
      degrading: this.coldChain.isDegrading(temperatureStatus),
      purity_band: purityBand,
    };
  }

  /**
   * The qualitative purity band of a cook building's batch (Phase-2c vector #2c — Ash; T9; R2.2 — the raw purity_score
   * never escapes). ONLY a luxuryChannel substance (Ash) has a purity grade: for any non-luxury substance the method
   * returns null WITHOUT a DB read (behavior-preserving — Brindle/Crick/Hush have no batch_purity). For an Ash building,
   * read the most-recently-stamped batch's purity_score (T6) and map it to the closed band via AshPurityService.
   * purityBand; null when no completed Ash cook has stamped a batch yet (no band to surface).
   */
  private async batchPurityBand(
    playerId: string,
    buildingId: string,
    substance: ConfiguredSubstanceType,
  ): Promise<AshPurityBand | null> {
    if (!isLuxurySubstance(substance)) return null; // no purity grade on a non-luxury substance — skip the read.
    const score = await this.repo.getBatchPurityScore(playerId, buildingId, substance);
    if (score === null) return null; // no completed Ash cook has stamped a batch_purity row yet → no band.
    return this.ashPurity.purityBand(score);
  }

  /**
   * Map the 7-member cook_stage enum → the qualitative cook-stage band (R2.2). null / aborted → IDLE; stage_1 → EARLY;
   * stage_2 + stage_2_intermediate → MID; stage_3 / stage_4 → LATE; completed → DONE. The player sees the BAND, never
   * the raw stage clock.
   */
  private cookStageBand(currentStage: string | null): CookStageBand {
    switch (currentStage) {
      case 'stage_1':
        return 'EARLY';
      case 'stage_2':
      case 'stage_2_intermediate':
        return 'MID';
      case 'stage_3':
      case 'stage_4':
        return 'LATE';
      case 'completed':
        return 'DONE';
      // null (never cooked) / 'aborted' / anything unexpected → no active cook → IDLE.
      default:
        return 'IDLE';
    }
  }

  /**
   * Map the raw quantity_grams → the qualitative product band (R2.2). 0 → NONE; 1..LOW_MAX → LOW; ..MEDIUM_MAX →
   * MEDIUM; above → HIGH. The player sees the BAND, never the grams.
   */
  private productBand(quantityGrams: number): ProductBand {
    if (quantityGrams <= 0) return 'NONE';
    if (quantityGrams <= PRODUCT_BAND_LOW_MAX) return 'LOW';
    if (quantityGrams <= PRODUCT_BAND_MEDIUM_MAX) return 'MEDIUM';
    return 'HIGH';
  }

  /** The qualitative substance label exposed to the player — the canonical UPPERCASE EN enum value (BRINDLE / CRICK).
   *  A closed enum domain (not a sim scalar); mirrors the precursors projection's UPPERCASE precursor surface. */
  private substanceLabel(substance: ConfiguredSubstanceType): string {
    return substance.toUpperCase();
  }
}
