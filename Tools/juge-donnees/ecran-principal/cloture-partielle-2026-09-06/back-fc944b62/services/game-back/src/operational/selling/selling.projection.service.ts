// IMPLEMENTS: docs/tech/04a_operational_systems/selling_dealers_leks.md §Pillar checklist (R4.3 — "aucun scalar …
//             customer_loyalty_avg_bucket / dealer_reputation_bucket tous composites ; arrest_record_count interne") +
//             §Implications par couche / Unity ("Dealer-spot UI : … state badge … deals_per_hour qualitatif" +
//             "Dealer float warning : badge orange si dealer.float ≥ soft_cap" — the float is surfaced as a BAND,
//             never the raw cents) + §How a deal works (the cash float dealer.float_cents — internal) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client) +
//             docs/tech/04_city_simulation/system_9_erlang_stash.md §Inv 5 (StashLoadBucket — the safehouse
//             occupation band the runner-deposit target reuses)
//             -- session:2026-06-03 (Phase 2 Task 5) --
//
// `SellingProjectionService` — the player-facing projection for the player's dealers (the Selling surface). Maps the
// RAW persisted dealer fields (dealer.current_state + dealer.float_cents) → a QUALITATIVE activity BAND + a cash BAND.
// It NEVER forwards a raw scalar — no float cents, no covered tile id, no grams. R2.2.
//
// THE BANDS (closed qualitative domains — the only dealer signals exposed):
//   - activity_band: WORKING (selling at a covered lek) | IDLE (assigned but not actively selling) | ABSENT |
//     COMPROMISED. Derived from the dealer_state enum by a fixed mapping (a PRESENTATION bucketing). M1 produces
//     WORKING / IDLE (the bust/compromise mechanic is DEFERRED — ABSENT/COMPROMISED fall to the default IDLE band
//     unless the raw state is exactly those values).
//   - cash_band: NONE (float = 0) | LOW | MODERATE | HIGH | FULL — the qualitative cash-float pressure (the "Dispatch
//     runner now" signal; selling_dealers_leks.md §Dealer float warning). NEVER the raw cents (R2.2).
//
// The safehouse OCCUPATION band (the runner-deposit target) REUSES System 9's StashLoadBucket — exposed via the
// district-stash projection (GET /v1/city/district/:id/stash, ErlangStashProjectionService). T5 does NOT duplicate that
// projection; the runner-deposit target occupation is read through System 9's existing surface (see the controller /
// the E2E asserts the safehouse band via the System 9 projection).
//
// R2.2 RAW-LEAK GUARANTEE: each dealer payload contains ONLY closed-domain strings + the dealer uuid identity — NEVER
// the float cents, the covered tile id, or grams. The E2E scans the payload recursively and rejects any raw scalar.

import { Injectable } from '@nestjs/common';

import { SellingRepository } from './selling.repository';
import { sellingTunables } from './selling-tunables';
import { substanceDescriptor } from '../substance/substance-config';
import { HushAddictionService, type HushLoyaltyStatus } from '../hush/hush-addiction.service';
import { HushAddictionRepository } from '../hush/hush-addiction.repository';
import { dealerNameRef } from '../../common/fiction-names'; // P4 item 7
import type { I18nRef } from '../../common/i18n-ref';

/** The qualitative dealer activity band (the only dealer-state signal exposed — never the raw enum nor the float). */
export type DealerActivityBand = 'WORKING' | 'IDLE' | 'ABSENT' | 'COMPROMISED';

/** The qualitative cash-float band (the "dispatch runner" pressure — never the raw cents; R2.2). */
export type DealerCashBand = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'FULL';

/**
 * The qualitative MARGIN band — the dealer's street margin tier as a closed domain (never the raw multiplier nor the
 * cents/gram; R2.2). A 4-tier LADDER from the substance descriptor's marginMultiplierVsBrindle by a FIXED bucketing
 * (the raw 1.5× / 3× / 3750 / 7500 NEVER leak):
 *   - STANDARD     = the Brindle 1× baseline (multiplier ≤ 1).
 *   - ELEVATED     = an intermediate-margin substance (1× < multiplier ≤ 2× — Hush 1.5×).
 *   - PREMIUM      = a high-margin substance (2× < multiplier ≤ 4× — Crick 3×).
 *   - HIGH_PREMIUM = an even higher tier (multiplier > 4× — none ships this slice; Ash 20× would land here).
 * The cut at 2.0 cleanly separates Hush (1.5× → ELEVATED) from Crick (3× → PREMIUM); Brindle (1× → STANDARD) and Crick
 * (PREMIUM) are UNCHANGED by the ELEVATED insert (no-regression). The boundaries are PRESENTATION buckets (like the
 * existing cash-band cuts), NOT sim tunables — no gdd/14 row.
 */
export type DealerMarginBand = 'STANDARD' | 'ELEVATED' | 'PREMIUM' | 'HIGH_PREMIUM';

/** The qualitative substance label — the closed substance enum domain (an EN label; not a sim scalar). */
export type DealerSubstanceLabel = 'BRINDLE' | 'CRICK' | 'HUSH' | 'ASH';

/** The PLAYER-FACING per-dealer projection (qualitative bands only — R2.2). */
export interface DealerProjection {
  /** The dealer identity (a uuid string — echoed for the client's Dealers panel; NOT a sim scalar). */
  dealer: string;
  /** P4 item 7 (TD-485) — le nom de fiction : un PRÉNOM seul, jamais « Lt. ». Avant ce lot, ㉟ n'avait
   *  qu'un uuid à afficher — `dealerNameRef` existait avec ZÉRO consommateur. */
  name_i18n: I18nRef;
  /** The qualitative activity band (WORKING / IDLE / ABSENT / COMPROMISED — never the raw enum nuance; R2.2). */
  activity_band: DealerActivityBand;
  /** The qualitative cash-float band (NONE / LOW / MODERATE / HIGH / FULL — never the raw float cents; R2.2). */
  cash_band: DealerCashBand;
  /** The substance the dealer sells (a closed enum label — BRINDLE / CRICK / …; never a raw value). */
  substance: DealerSubstanceLabel;
  /** The qualitative margin tier (STANDARD / ELEVATED / PREMIUM / HIGH_PREMIUM — never the raw multiplier nor cents/gram;
   * R2.2). Hush 1.5× → ELEVATED, Crick 3× → PREMIUM, Brindle 1× → STANDARD. */
  margin_band: DealerMarginBand;
  /**
   * The qualitative ADDICTION-LOYALTY status of a Hush (addiction=true) dealer-spot (Phase-2b vector #2b T5): LOW
   * (NEW) / STABLE (ESTABLISHED) / HIGH (DEPENDENT) — derived from the hush_addiction row's loyalty_score by
   * HushAddictionService (R2.2 — NEVER the raw score / cut-points / last-deal tick). `null` for a non-Hush dealer
   * (Brindle/Crick — addiction=false, no addiction row). A Hush spot with no row yet (never sold) → LOW.
   */
  addiction_loyalty_status: HushLoyaltyStatus | null;
  /**
   * Whether a Hush dealer-spot is currently WITHDRAWN (a DEPENDENT spot starved past the dry window — its loyalty
   * collapsed + the selling boost lost; Phase-2b vector #2b T5). `false` for a non-Hush dealer / a Hush spot with no
   * row yet. A plain boolean (R2.2 — never the raw last-deal tick / window).
   */
  withdrawn: boolean;
}

@Injectable()
export class SellingProjectionService {
  constructor(
    private readonly repo: SellingRepository,
    private readonly hushAddiction: HushAddictionService,
    private readonly hushAddictionRepo: HushAddictionRepository,
  ) {}

  /**
   * Project ALL of a player's dealers → fully-qualitative payloads (R2.2). Reads each dealer's raw state + float from
   * the repository (the raw float is the INPUT but is mapped to a BAND — the raw cents are NEVER forwarded; R2.2). For
   * the Hush (addiction=true) dealers, the per-spot addiction loyalty (LOW/STABLE/HIGH band + withdrawn) is read from
   * the hush_addiction rows in ONE batched query (no per-dealer round-trip); a Hush spot with no row yet → LOW +
   * withdrawn=false. Non-Hush dealers (Brindle/Crick) surface addiction_loyalty_status=null + withdrawn=false (no
   * addiction read). Returns [] when the player has no dealers.
   */
  async listDealers(playerId: string): Promise<DealerProjection[]> {
    const rows = await this.repo.listDealerStates(playerId);

    // BATCH the hush_addiction read for ALL the player's dealer-spots in ONE query (R2.2 — the raw score is the INPUT,
    // mapped to a band; never forwarded). A hush_addiction row is lazy-created ONLY by a Hush deal, so its EXISTENCE is
    // the robust signal that the spot is a Hush dealer-spot — EVEN when the spot is currently dry (0 stock), in which
    // case listDealerStates' stock-derived substance falls back to the dealer's specialization (brindle) and would
    // otherwise lose the Hush identity. So a dealer is Hush-addiction-relevant when its currently-derived substance is
    // addiction (descriptor.addiction===true) OR its spot has a hush_addiction row. A Hush spot with no row yet → LOW +
    // withdrawn=false (the lazy row lands on the first deal). A genuinely non-Hush dealer (never sold Hush, no row) →
    // null + false (no addiction surface).
    const allSpotIds = [...new Set(rows.map((r) => r.home_building_id))];
    const loyaltyBySpot = new Map<string, { score: number; withdrawn: boolean }>();
    if (allSpotIds.length > 0) {
      for (const row of await this.hushAddictionRepo.getLoyaltyScores(playerId, allSpotIds)) {
        loyaltyBySpot.set(row.dealer_spot_building_id, { score: row.loyalty_score, withdrawn: row.withdrawn });
      }
    }

    // P4 item 7 — l'unicité se calcule à POPULATION donnée : on nomme dans l'ordre des rangées et on
    // accumule, exactement comme le roster des lieutenants. Deux dealers d'un même joueur ne peuvent
    // donc pas porter le même prénom.
    const prenomsPris = new Set<string>();
    return rows.map((r) => {
      const loyalty = loyaltyBySpot.get(r.home_building_id);
      // Hush-addiction-relevant = current substance is addiction OR a hush_addiction row exists (a dry, formerly-Hush
      // spot keeps its addiction surface — that is precisely the withdrawn case).
      const isHush = substanceDescriptor(r.substance_type)?.addiction === true || loyalty !== undefined;
      return {
        dealer: r.dealer_id,
        name_i18n: (() => {
          const ref = dealerNameRef({ dealer_id: r.dealer_id, dejaPris: prenomsPris });
          prenomsPris.add(String(ref.params.prenom));
          return ref;
        })(),
        activity_band: this.activityBand(r.current_state),
        cash_band: this.cashBand(r.float_cents),
        substance: this.substanceLabel(r.substance_type),
        margin_band: this.marginBand(r.substance_type),
        // R2.2: a Hush spot surfaces the qualitative loyalty band (score 0 → LOW when no row yet); a non-Hush dealer
        // surfaces null. The raw score / cut-points / last-deal tick NEVER leave HushAddictionService.
        addiction_loyalty_status: isHush ? this.hushAddiction.loyaltyStatus(loyalty?.score ?? 0) : null,
        withdrawn: isHush ? (loyalty?.withdrawn ?? false) : false,
      };
    });
  }

  /**
   * Map the dealer_state enum → the qualitative activity band (R2.2). working → WORKING; absent → ABSENT; compromised
   * → COMPROMISED; idle / anything else → IDLE. The player sees the BAND, never any internal nuance.
   */
  private activityBand(currentState: string): DealerActivityBand {
    if (currentState === 'working') return 'WORKING';
    if (currentState === 'absent') return 'ABSENT';
    if (currentState === 'compromised') return 'COMPROMISED';
    return 'IDLE';
  }

  /**
   * Map the raw float cents → a qualitative cash band (R2.2 — the raw cents never escape). The bands are anchored to
   * the per-tick deal value × a small number of ticks (a presentation bucketing, NOT a sim tunable): NONE at 0; LOW up
   * to ~one tick's worth; MODERATE / HIGH rising; FULL at the soft-cap-ish ceiling (the "dispatch a runner" signal).
   * The thresholds derive from the grounded deal value so they track the chain economy without exposing a raw cap.
   */
  private cashBand(floatCents: number): DealerCashBand {
    if (floatCents <= 0) return 'NONE';
    // One "deal unit" ≈ the per-tick rate × the per-gram value (the natural granularity of accrual). The bands are
    // multiples of that unit (presentation buckets — no new sim tunable). Defensive floor of 1 to avoid /0.
    const dealUnit = Math.max(
      1,
      Math.max(1, sellingTunables.dealGramsPerTick) * Math.max(1, sellingTunables.brindleDealValueCentsPerGram),
    );
    if (floatCents < dealUnit * 2) return 'LOW'; // up to ~2 ticks of accrual.
    if (floatCents < dealUnit * 8) return 'MODERATE'; // a building stream of float.
    if (floatCents < dealUnit * 20) return 'HIGH'; // worth a runner soon.
    return 'FULL'; // a large float — dispatch a runner now (the soft-cap-ish signal).
  }

  /**
   * Map the raw substance_type enum → the closed substance LABEL (R2.2 — a presentation bucketing, the canonical EN
   * enum label). brindle → BRINDLE, crick → CRICK, etc. An unknown string falls to BRINDLE (the M1 default).
   */
  private substanceLabel(substanceType: string): DealerSubstanceLabel {
    switch (substanceType) {
      case 'crick':
        return 'CRICK';
      case 'hush':
        return 'HUSH';
      case 'ash':
        return 'ASH';
      default:
        return 'BRINDLE';
    }
  }

  /**
   * Map the substance → a qualitative MARGIN band (R2.2 — the raw multiplier / cents NEVER leak). Derived from the
   * registry descriptor's marginMultiplierVsBrindle by a FIXED 4-tier bucketing:
   *   - ≤ 1×        → STANDARD     (Brindle 1× baseline)
   *   - > 1× ≤ 2×   → ELEVATED     (Hush 1.5× — an intermediate tier between Brindle and Crick)
   *   - > 2× ≤ 4×   → PREMIUM      (Crick 3×)
   *   - > 4×        → HIGH_PREMIUM (no substance ships this tier yet — Ash 20× would land here)
   * The 2.0 cut cleanly separates Hush (1.5× → ELEVATED) from Crick (3× → PREMIUM); the ELEVATED insert does NOT move
   * Brindle out of STANDARD nor Crick out of PREMIUM (no-regression). An unconfigured/unknown substance (no descriptor
   * — Ash DEFERRED) → STANDARD (the safe default). These are PRESENTATION buckets, not sim tunables. The player sees
   * the BAND, never the multiplier.
   */
  private marginBand(substanceType: string): DealerMarginBand {
    const descriptor = substanceDescriptor(substanceType);
    const multiplier = descriptor?.marginMultiplierVsBrindle ?? 1;
    if (multiplier <= 1) return 'STANDARD';
    if (multiplier <= 2) return 'ELEVATED';
    if (multiplier <= 4) return 'PREMIUM';
    return 'HIGH_PREMIUM';
  }
}
