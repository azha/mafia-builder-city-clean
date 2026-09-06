// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Economy & Monetization — IAP
//             catalogue (T.econ.iap.*) + §Economy & Monetization — currencies (T.econ.marks.*) +
//             §UI — IAP Shop (T.ui.iap.* — the 2 launch-set enforcement prices) + §Economy &
//             Monetization — refund policy (T.econ.refund.*, added C6).
//             Design: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §1.9 (B2 — which
//             tunable is the ENFORCEMENT source per SKU) + §3-C1/C6.
// -- W1.3-C1 -- 2026-08-13 -- (C1: the 8 T.econ.iap.* + T.econ.marks.save_slot_price + the 2
//    launch-set T.ui.iap.cost_* — the enforcement prices §1.9 puts in scope)
// -- W1.3-C6 -- 2026-08-13 -- (C6 EXTENDS this SAME file with T.econ.refund.window_days —
//    mirrors live-ops.tunables.ts's own incremental-growth convention. Not present in the C1
//    commit — added by C6, see that commit's diff. `T.econ.refund.no_questions` was ALSO added
//    by C6 but wired backwards — review ⊥ B3 removed the getter, see the standalone comment
//    below for why it correctly has none.)
//
// R2.3 (no inline numeric config on a debit path): every getter here is a LIVE resolve
// (TunablesStore.resolve*) — never memoized — so a BO tunable edit (`PUT /admin/tunables/T.*`)
// takes effect on the NEXT read, no redeploy. Key strings are the LITERAL gdd/14 `T.` dotted path
// (mirrors `live-ops.tunables.ts`'s `T.bo.twoperson.mass_cohort_threshold` precedent) — the canon
// says these are edited "via PUT /admin/tunables/T.ui.iap.*" by their own dotted name, so the
// registry key IS that name, not a shortened alias.
//
// OUT OF SCOPE (design §1.9 — genuinely display-only, W3.U10): T.ui.iap.catalogue_cache_ttl_s,
// purchase_confirm_longpress_ms, item_detail_sheet_anim_ms, marks_readout_flash_ms, the 2
// post-launch cost_* (theme_river/callsign_font — no SKU to enforce, §2.2), T.ui.profile.save_slot_*
// (UI mirrors of save_slot_price/save_slot_3's own catalogue field). None are read here.

import { TunablesStore } from '../../config/tunables-store';

export const iapTunables = {
  // ── T.econ.iap.* — pack content (Marks credited) + tier bonus (gdd/14 §Economy & Monetization —
  //    IAP catalogue) — used_by iap-sku-catalogue.ts's resolveMarksGranted, C4 purchase/validate. ──
  get marksPackSmallMarks(): number {
    return TunablesStore.resolveInt('T.econ.iap.marks_pack_small_marks', 'ECON_IAP_MARKS_PACK_SMALL_MARKS', 100);
  },
  get marksPackMedMarks(): number {
    return TunablesStore.resolveInt('T.econ.iap.marks_pack_med_marks', 'ECON_IAP_MARKS_PACK_MED_MARKS', 600);
  },
  get marksPackLargeMarks(): number {
    return TunablesStore.resolveInt('T.econ.iap.marks_pack_large_marks', 'ECON_IAP_MARKS_PACK_LARGE_MARKS', 1400);
  },
  get marksPackXlMarks(): number {
    return TunablesStore.resolveInt('T.econ.iap.marks_pack_xl_marks', 'ECON_IAP_MARKS_PACK_XL_MARKS', 3500);
  },
  get tierBonusPctMed(): number {
    return TunablesStore.resolveInt('T.econ.iap.tier_bonus_pct_med', 'ECON_IAP_TIER_BONUS_PCT_MED', 20);
  },
  get tierBonusPctLarge(): number {
    return TunablesStore.resolveInt('T.econ.iap.tier_bonus_pct_large', 'ECON_IAP_TIER_BONUS_PCT_LARGE', 40);
  },
  get tierBonusPctXl(): number {
    return TunablesStore.resolveInt('T.econ.iap.tier_bonus_pct_xl', 'ECON_IAP_TIER_BONUS_PCT_XL', 75);
  },
  get supportPackMarks(): number {
    return TunablesStore.resolveInt('T.econ.iap.support_pack_marks', 'ECON_IAP_SUPPORT_PACK_MARKS', 500);
  },

  // ── T.econ.marks.save_slot_price — the ENFORCEMENT source for save_slot_2 (§1.9/B2; the UI mirror
  //    T.ui.profile.save_slot_2_cost_marks is display-only, never read server-side). ──
  get saveSlotPrice(): number {
    return TunablesStore.resolveInt('T.econ.marks.save_slot_price', 'ECON_MARKS_SAVE_SLOT_PRICE', 100);
  },

  // ── T.ui.iap.cost_* — the 2 LAUNCH-set cosmetics' enforcement price (§1.9/B2: `used_by:
  //    IapService`, a BACK-end service despite the `T.ui.*` namespace — iap_catalogue.md:362-363
  //    confirms `IapService` is not the UI). The 2 post-launch cost_* (theme_river/callsign_font)
  //    are deliberately NOT here (§2.2 — no launch SKU consumes them). ──
  get costCallsignColorMarks(): number {
    return TunablesStore.resolveInt('T.ui.iap.cost_callsign_color_marks', 'UI_IAP_COST_CALLSIGN_COLOR_MARKS', 50);
  },
  get costThemeSodiumMarks(): number {
    return TunablesStore.resolveInt('T.ui.iap.cost_theme_sodium_marks', 'UI_IAP_COST_THEME_SODIUM_MARKS', 80);
  },

  // ── T.econ.refund.window_days — the Support refund policy window (C6, refund_policy.md §6) —
  //    used_by iap-economy-admin.controller.ts's refund route: gates eligibility (409 past the
  //    window — a REAL consumer, not just a range statement). ──
  get refundWindowDays(): number {
    return TunablesStore.resolveInt('T.econ.refund.window_days', 'ECON_REFUND_WINDOW_DAYS', 30);
  },

  // T.econ.refund.no_questions — CORRECTLY WITHOUT A GETTER HERE (review ⊥ B3, 2026-08-13,
  // FIXED). It governs whether a PLAYER must additionally justify a refund request beyond the
  // operator's own audit reason (refund_policy.md:123, gdd/14:3281 — "no questions asked OF THE
  // PLAYER, beyond a free-text reason for audit"); this lot has NO player-facing refund-request
  // route (refunds are BO-initiated only via POST /admin/iap-transactions/:txn_id/refund), so
  // there is no code here for it to gate. An earlier version wired it backwards to the OPERATOR
  // reason instead (requiring it only when false — the inverse of what canon says), which is a
  // worse defect than leaving it unconsumed: `iap-economy-admin.controller.ts`'s refund route now
  // requires the operator `reason_text` UNCONDITIONALLY, which is what canon actually mandates
  // regardless of this tunable's value. Same posture as the 2 post-launch `T.ui.iap.cost_*`
  // above: correctly consumer-less, documented rather than wired to the wrong thing.
};
