// IMPLEMENTS: docs/tech/09_data_model/schema_player_economy_state.md §8.1 (l.624 — cash_cents: string, BigInt
//             sérialisé string pour JSON-safe; REUSE convention chunk 2 §2.3) + §8.2 (l.639 — the
//             PlayerEconomySelfProjection composite: { player_id, cash_cents: string, marks: number }) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — monetary balance IS exposable;
//             §8.1 l.652: "cash_cents exposable parce que solde monétaire diégétique factuel … ce que R2.2 interdit
//             ce sont les scalaires de jugement social de l'avatar, pas les soldes monétaires concrets") +
//             src/operational/selling/selling.projection.service.ts DealerCashBand (the precedent 5-band cash
//             projection — the wallet_band is a supplementary DERIVED label, not a substitute for the canon string)
//             -- session:2026-06-04 (economy wallet-band projection) --
//             -- lot-4 P2x/TD-089 fix: surface cash_cents:string per §8.2 canon (2026-06-13) --
//
// `EconomyProjectionService` — the player-facing projection for the player's clean cash (the wallet surface; the
// "encaisser" payoff of the whole M1 operational loop, shown on the dashboard screen_1).
//
// THE CANON §8.2 SHAPE (PlayerEconomySelfProjection — the FULL canon composite; NOT what this
// file's own WalletProjection interface below actually returns, see the note at the end):
//   { player_id: string; cash_cents: string; wallet_band: WalletBand; marks: number }
//   - cash_cents: the BigInt-serialized raw cents as a JSON-safe string (BigInt#toString() — NEVER Number(bigint);
//     §8.2 l.639 + the lot-0 bigint string convention from chunk 2 §2.3). Player-facing (§8.1 l.624/652: monetary
//     balance is exposable — NOT a social-judgment scalar, NOT prohibited by R2.2).
//   - wallet_band: a SUPPLEMENTARY qualitative derived label (BROKE/LOW/MODERATE/HIGH/FLUSH — the band is NOT a
//     substitute for cash_cents; §8.2 puts cash_cents first; the band stays for UX convenience).
//   - marks: the premium-currency balance (§8.2 l.639 — player-facing; P2-clean: cosmetic/QoL only).
//   - player_id: echoed in the response (§8.2 l.638).
//   NOTE (W1.3-C6, corrected): `marks` is part of the CANON shape above but is NOT returned by
//   THIS file's WalletProjection (only player_id/cash_cents/wallet_band, see the interface below) —
//   the player's Marks balance is served by `GET /v1/me/iap/balance` instead (`economy/iap/
//   iap.controller.ts`). Scoped to cash_cents per design. This is a deliberate, tracked gap
//   (TD-377, `docs_int/tech_debt_inventory.md`) — not the "will be added later" note this
//   comment previously carried, which never became true.
//
// R2.2 CLARIFICATION: the original header misapplied R2.2 to prohibit cash_cents. The correct reading (§8.1 l.652)
// is: R2.2 forbids SOCIAL-JUDGMENT scalars (reputation/standing/HP-bar) — NOT monetary balances. A concrete wallet
// balance (cash_cents) is explicitly PERMITTED. The commit 5997d81 ("R2.2 forbids ever sending raw cents") cited
// §8.2 to argue the OPPOSITE of what §8.2 actually says. This file now conforms to §8.1/§8.2.
//
// JSON-SAFE BIGINT: cash_cents is serialized as a string (BigInt#toString()). The no-leak guard in the E2E checks
// that no JSON NUMBER appears (typeof !== 'number') — a bigint that somehow serialized as a JS number would truncate
// for values > Number.MAX_SAFE_INTEGER. The string form is exact. NEVER use Number(bigint) or +bigint here.

import { Injectable } from '@nestjs/common';

import { EconomyRepository } from './economy.repository';

/** The qualitative clean-cash band (a SUPPLEMENTARY derived label — not a substitute for cash_cents; §8.2). */
export type WalletBand = 'BROKE' | 'LOW' | 'MODERATE' | 'HIGH' | 'FLUSH';

/**
 * The PLAYER-FACING wallet projection (§8.2 PlayerEconomySelfProjection). Conforms to canon §8.1/§8.2:
 *   - cash_cents: the raw balance as a BigInt-serialized JSON-safe string (§8.1 l.624 + §8.2 l.639). The
 *     player is entitled to know their exact monetary balance (§8.2 l.652 — not a social-judgment scalar).
 *   - wallet_band: a SUPPLEMENTARY qualitative derived label (not a substitute for cash_cents — §8.2 is clear
 *     that cash_cents is the canonical field; wallet_band is additive UI convenience).
 *   - player_id: the player's id (§8.2 l.638 — echoed in the response).
 */
export interface WalletProjection {
  /** The player's id (§8.2 l.638). */
  player_id: string;
  /** The exact clean-cash balance as a BigInt-serialized JSON-safe string (§8.1 l.624 + §8.2 l.639). */
  cash_cents: string;
  /** The SUPPLEMENTARY qualitative clean-cash band (BROKE / LOW / MODERATE / HIGH / FLUSH — derived from cash_cents). */
  wallet_band: WalletBand;
}

// ─────────────────────────────── WALLET BAND CUT-POINTS (cents) ───────────────────────────────
// A PRESENTATION bucketing of the raw cash_cents into the qualitative band domain. ⚠️ CORRIGÉ 2026-08-15 :
// une clause ici affirmait que le band remplaçait le solde côté joueur — c'était l'inverse du canon §8.1
// (l.624 : cash_cents EST dans le composite joueur, en chaîne BigInt-safe) et de l'interface ci-dessus.
// Le band est SUPPLÉMENTAIRE au solde exposé, jamais son substitut. Un design W3.U1 a failli construire
// le TopBar sans solde sur la foi de cette ligne. These are NOT sim-balance tunables (no timing/cost/drop-rate/threshold is exposed);
// they are the closed-domain band boundaries, analogous to SellingProjectionService.cashBand.
//
// The cut-points are ANCHORED to the M1 chain's $ scale (the "encaisser" payoff the player works toward):
//   - the chain's HIGH-VALUE threshold is $500k ;
//   - conversion costs span $5k (a stash/weak) … $200k (a high-cover lab) ;
//   - a Brindle deal is worth $25/g and the wallet is fed by the laundering output (clean cash).
// So the bands track "can I afford the next step of the chain?":
//   - BROKE   : $0                         — no cash (cash_cents <= 0).
//   - LOW     : up to $5,000               — can't yet afford even the cheapest conversion ($5k floor).
//   - MODERATE: up to $50,000              — can fund a cheap acquisition + a low-cover conversion / a few orders.
//   - HIGH    : up to $500,000             — comfortably mid-chain (up to the chain's high-value threshold).
//   - FLUSH   : above $500,000             — flush; past the $500k high-value threshold (a fully-laundered war chest).
// Expressed in cents (the column unit). Using bigint literals so the comparison stays in the cash_cents domain.
const LOW_MAX_CENTS = 5_000n * 100n; //        $5,000   →   500_000 cents : LOW       up to this.
const MODERATE_MAX_CENTS = 50_000n * 100n; //  $50,000  → 5_000_000 cents : MODERATE  up to this.
const HIGH_MAX_CENTS = 500_000n * 100n; //     $500,000 → 50_000_000 cents : HIGH     up to this; above → FLUSH.

@Injectable()
export class EconomyProjectionService {
  constructor(private readonly repo: EconomyRepository) {}

  /**
   * Project a player's wallet → the canon §8.2 PlayerEconomySelfProjection shape. Reads the raw cash_cents from the
   * repository, serializes it as a BigInt string (JSON-safe, exact — NEVER Number(bigint)), and derives the
   * supplementary wallet_band. Returns null when the player has no economy_states row (the controller maps that to
   * a 404). Conforms to §8.1 l.624 (cash_cents: string) + §8.2 l.639 (full composite) + §8.2 l.652 (R2.2 exempts
   * monetary balances — cash_cents is player-facing).
   */
  async projectWallet(playerId: string): Promise<WalletProjection | null> {
    // W1.3-C2 (design §4-D2): getWalletAndMarks is the SAME resolver /v1/me/iap/balance reads —
    // `.marks` is read here and DELIBERATELY discarded (never assigned into WalletProjection, never
    // returned). §5-A2: the wallet endpoint stays cash-only; TD-NEW (C6) tracks the conformance gap.
    const row = await this.repo.getWalletAndMarks(playerId);
    if (row === null) return null;
    const cents = row.cash_cents;
    // BigInt#toString() — the only safe serialization for a bigint to a JSON string. NEVER Number(bigint) (truncates
    // for values > 2^53 = 9_007_199_254_740_992 cents = ~$90 trillion; the cents domain is well within bigint range
    // but safe integers plateau far below the game's max wallet balance). The JSON serializer sees a plain string —
    // no JSON-number truncation risk (the lot-0 bigint string convention, chunk 2 §2.3).
    return {
      player_id: playerId,
      cash_cents: cents.toString(),
      wallet_band: this.walletBand(cents),
    };
  }

  /**
   * Map the raw cash_cents → the qualitative wallet band (R2.2). <= 0 → BROKE; then the fixed cut-points above. The
   * band shown alongside the exposed balance (canon §8.1 — supplementary, never a substitute). Pure function of the cents (no RNG, no side effect).
   */
  private walletBand(cashCents: bigint): WalletBand {
    if (cashCents <= 0n) return 'BROKE';
    if (cashCents <= LOW_MAX_CENTS) return 'LOW';
    if (cashCents <= MODERATE_MAX_CENTS) return 'MODERATE';
    if (cashCents <= HIGH_MAX_CENTS) return 'HIGH';
    return 'FLUSH';
  }
}
