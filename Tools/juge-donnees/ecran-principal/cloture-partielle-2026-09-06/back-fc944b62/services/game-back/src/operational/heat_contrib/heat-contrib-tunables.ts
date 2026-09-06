// IMPLEMENTS: docs/tech/04a_operational_systems/production_brindle.md §Heat shadow (the heat-per-cook composite —
//             "low (+0.02 heat)") + docs/tech/04a_operational_systems/product_storage.md §Storage heat — taux per
//             substance (storage_heat_brindle_per_kgday = 0.001 baseline) + docs/tech/04a_operational_systems/
//             selling_dealers_leks.md §How a deal works (`+heat_per_deal_bucket`, Brindle standard) +
//             docs/tech/04_city_simulation/heat_propagation.md §Consommation des HeatInjectionEvents (the qualitative
//             MICRO|LOW|LOW_MEDIUM|MEDIUM magnitude bands the seam carries) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — heat (the NEW M1 magnitude-band
//             groundings this file authors)
//             -- session:2026-06-04 (Phase 2 Task 7) --
//
// Operational-heat contribution tunables — the qualitative HeatInjectionEvent magnitude BANDS the three M1 operational
// sources (a completed cook, a per-tick storage hold, a per-tick deal) ADD onto the System-Heat seam. The
// HeatInjectionEvent carries a CLOSED qualitative band (MICRO|LOW|LOW_MEDIUM|MEDIUM — heat_propagation.md §Event
// consumers), NEVER a raw cash/gram/kg scalar (R2.2). So the M1 grounding of each ungrounded heat composite
// (`heat-per-cook` / storage-heat-per-kg-day / `heat_per_deal_bucket`) is a CHOICE OF BAND, not a numeric value — the
// band IS the closed-domain enum the Heat service maps to its internal delta. This keeps the contribution R2.2-clean:
// no scalar is invented or surfaced; the operational source merely names which qualitative exposure band it produces.
//
// R2.3 — the three magnitude bands + the one storage min-grams gate are the genuinely-NEW M1 tunables of T7. They are
// authored here AND in gdd/14 §Operational chain — heat in the SAME commit (R9.3 propagation: gdd/14 ↔ code). All
// `[PROV-Y26Q2]`, FLAG VETO (the qualitative band choice + the storage gate are provisional M1 calibration; the fuller
// composite heat models — per-stage signature × tier modifier × ventilation for cook; fill-ratio × age curve for
// storage; per-substance per-deal band for selling — are DEFERRED). NO raw heat scalar is authored (the deltas the
// bands map to live in heat-propagation.service.ts INJECTION_DELTA — System Heat owns them, R9.3 "consume, don't
// reimplement").
//
// GROUNDING (why each band):
//   - COOK   → MICRO. production_brindle.md §Heat shadow + GDD §5 "low (+0.02 heat)" per cook event. The Heat engine's
//              MICRO delta = 0.02 (heat-propagation.service.ts INJECTION_DELTA.MICRO) — an exact match for the cited
//              "+0.02 heat". A single completed cook = a faint, brief signature.
//   - STORAGE→ MICRO. product_storage.md §Storage heat: storage_heat_brindle_per_kgday = 0.001 (baseline, the slowest
//              passive accumulation; daily-tick diégétique). On the per-MINUTE qualitative seam the slowest baseline
//              rate maps to the faintest band (MICRO) — a building merely HOLDING product radiates a low background
//              exposure. The per-substance multipliers (Crick 2× / Hush 0.5× / Ash 5×) + the fill-ratio/age curve are
//              DEFERRED (M1 = Brindle only).
//   - DEAL   → LOW. selling_dealers_leks.md §How a deal works `+heat_per_deal_bucket` (Brindle standard). The Heat
//              catalogue (heat_propagation.md §Event consumers) maps "a slow/moderate lek deal" → LOW. A street deal is
//              a more visible exposure than a faint cook/storage signature, but below a buffer overflow (LOW_MEDIUM).

import type { HeatInjectionMagnitude } from '../../citysim/events/city-event-bus';
import { TunablesStore } from '../../config/tunables-store';

/** The closed magnitude-band domain (mirror of HeatInjectionMagnitude — heat_propagation.md §Event consumers). */
const VALID_MAGNITUDES: ReadonlySet<string> = new Set(['MICRO', 'LOW', 'LOW_MEDIUM', 'MEDIUM']);

/**
 * Resolved operational-heat contribution tunables — the qualitative magnitude bands (+ the storage min-grams gate)
 * the three M1 sources emit on the HeatInjectionEvent seam. DB-override > env > default (Phase-23). All
 * `[PROV-Y26Q2]`, FLAG VETO.
 */
export const heatContribTunables = {
  /**
   * operational.heat.cook_completion_magnitude — the band a completed Brindle cook emits on the lab building. Grounds
   * the production_brindle.md §Heat shadow composite "heat-per-cook" (GDD §5 "low (+0.02 heat)") → MICRO (the Heat
   * engine's 0.02 delta). [PROV-Y26Q2]. (DB-override > env > default — Phase-23).
   */
  get cookCompletionMagnitude(): HeatInjectionMagnitude {
    const raw = TunablesStore.resolveString('operational.heat.cook_completion_magnitude', 'OPERATIONAL_HEAT_COOK_COMPLETION_MAGNITUDE', 'MICRO');
    const candidate = raw.trim().toUpperCase();
    return (VALID_MAGNITUDES.has(candidate) ? candidate : 'MICRO') as HeatInjectionMagnitude;
  },
  /**
   * operational.heat.storage_magnitude — the band a building HOLDING product emits per storage tick. Grounds the
   * product_storage.md §Storage heat baseline (storage_heat_brindle_per_kgday=0.001, the slowest passive rate) →
   * MICRO. [PROV-Y26Q2]. (DB-override > env > default — Phase-23).
   */
  get storageMagnitude(): HeatInjectionMagnitude {
    const raw = TunablesStore.resolveString('operational.heat.storage_magnitude', 'OPERATIONAL_HEAT_STORAGE_MAGNITUDE', 'MICRO');
    const candidate = raw.trim().toUpperCase();
    return (VALID_MAGNITUDES.has(candidate) ? candidate : 'MICRO') as HeatInjectionMagnitude;
  },
  /**
   * operational.heat.deal_magnitude — the band a dealer SELLING at a lek-present dealer-spot emits per sell tick.
   * Grounds the selling_dealers_leks.md §How a deal works `+heat_per_deal_bucket` (Brindle standard) → LOW.
   * [PROV-Y26Q2]. (DB-override > env > default — Phase-23).
   */
  get dealMagnitude(): HeatInjectionMagnitude {
    const raw = TunablesStore.resolveString('operational.heat.deal_magnitude', 'OPERATIONAL_HEAT_DEAL_MAGNITUDE', 'LOW');
    const candidate = raw.trim().toUpperCase();
    return (VALID_MAGNITUDES.has(candidate) ? candidate : 'LOW') as HeatInjectionMagnitude;
  },
  /**
   * operational.heat.storage_min_grams — the minimum stored grams (per building, per tick) below which the storage
   * tick emits NO heat. Default 1 g (any non-trivial hold radiates). [PROV-Y26Q2].
   * (DB-override > env > default — Phase-23).
   */
  get storageMinGrams(): number {
    return TunablesStore.resolveInt('operational.heat.storage_min_grams', 'OPERATIONAL_HEAT_STORAGE_MIN_GRAMS', 1);
  },
  /**
   * operational.heat.combat_magnitude — the band a combat assault via PercolationService emits on the raided
   * rival-territory building. Grounds the combat_mechanics.md §2.1 Percolation Break heat-producer (DIV-B2 C5 —
   * a combat raid is a targeted assault on a rival holding; the heat reflects the visible block-level exposure).
   * Default LOW (a combat incursion is more conspicuous than a passive storage hold, but below a buffer overflow).
   * [PROV-Y26Q2], FLAG VETO. (DB-override > env > default — Phase-23).
   */
  get combatMagnitude(): HeatInjectionMagnitude {
    const raw = TunablesStore.resolveString('operational.heat.combat_magnitude', 'OPERATIONAL_HEAT_COMBAT_MAGNITUDE', 'LOW');
    const candidate = raw.trim().toUpperCase();
    return (VALID_MAGNITUDES.has(candidate) ? candidate : 'LOW') as HeatInjectionMagnitude;
  },
  /**
   * operational.heat.ash_deal_magnitude — the band a HONORED Ash appointment emits on the Glass-venue building
   * (lot-4 TD-027 / production_secondaries.md:99: "precinct_alert_bucket Glass augmente d'un palier per deal").
   * Ash is the HIGHEST-RISK transaction (the extreme-margin luxury channel); its point-emission magnitude is LOW_MEDIUM
   * (above a street deal's LOW, reflecting the luxury-channel exposure at a Glass venue). [PROV-Y26Q2], FLAG VETO.
   * (DB-override > env > default — Phase-23).
   */
  get ashDealMagnitude(): HeatInjectionMagnitude {
    const raw = TunablesStore.resolveString('operational.heat.ash_deal_magnitude', 'OPERATIONAL_HEAT_ASH_DEAL_MAGNITUDE', 'LOW_MEDIUM');
    const candidate = raw.trim().toUpperCase();
    return (VALID_MAGNITUDES.has(candidate) ? candidate : 'LOW_MEDIUM') as HeatInjectionMagnitude;
  },
};
