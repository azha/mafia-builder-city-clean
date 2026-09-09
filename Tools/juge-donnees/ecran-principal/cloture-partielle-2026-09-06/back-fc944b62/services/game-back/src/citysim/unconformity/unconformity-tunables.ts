// IMPLEMENTS: docs/tech/04_city_simulation/system_7_unconformity_ledgers.md §Tunables — REUSE
//             (gdd/14 §City — Unconformity Ledgers, lines 145–148; NO NEW tunables — the 4 keys this system's
//             OWN logic actually CONSUMES are EXISTING registry keys owned by System 7).
//             -- session:2026-06-03 (Phase 1 Task 8) --
//
// System 7 (Unconformity Ledgers) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Unconformity Ledgers` (lines 145–148). They are
// surfaced here as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth
// (the registry). If the registry values change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (no resolved-but-unused config — the cohesion/inspection precedent): the resolved
// `unconformityTunables` object surfaces ONLY the 4 keys System 7's day-1 logic CONSUMES at runtime, ALL from
// §City — Unconformity Ledgers (gdd/14 L145–148):
//   - `deviation_threshold_sigma` (L145, 1.8) — the sigma threshold the deviation z-score is compared against to
//     map a building into NOMINAL/LOW/HIGH/CRITICAL deviation buckets (Phase C) + activate the audit pin (Phase D).
//   - `rolling_window_days` (L146, 7) — the rolling-window length for the deviation computation. It also sizes the
//     in-memory ring buffer of revenue samples (system_7 §États UnconformityLedger revenue_samples[rolling_window_days]).
//   - `audit_pin_duration_days` (L147, 5) — how long an activated audit pin stays active. The persisted projection
//     of the pin is `buildings.audit_pin_expires_at = now() + audit_pin_duration_days` (the timestamptz expiry).
//   - `decoy_revenue_suppression_multiplier` (L148, 0.85) — multiplier applied to declared revenue when the pin's
//     suppression is active (Inv 7). DEFERRED INPUT (documented below): revenue suppression acts on the building's
//     declared revenue, which is a P2 finance operation (BuildingFinanceService is not built Phase 1). The tunable
//     is mirrored here because the audit_pin_state.suppression_active flag IS modelled in-memory (Inv 4/7) and the
//     multiplier is the canonical magnitude the suppression would apply; the revenue MUTATION it drives lands with
//     the P2 finance system. HONEST: the suppression FLAG is set; the financial application is deferred.
//
// DEFERRED — the 3 `unconformity.declaration_ledger.*` keys (gdd/14 L149–151) are NOT mirrored here. They drive
// the G31 declaration-ledger amplification (system_7 §Update tick Phase C / Inv 5), whose PRODUCER is System 3's
// `declaration_ledger` — DEFERRED in T4 (no migrated column; depends on the unbuilt 04c declaration ledger). With
// no producer, the amplification has no input to consume, so surfacing the 3 keys would be silently-dead config
// (a false expectation). They stay in the registry (the consumer lands when System 3's declaration_ledger does);
// mirroring them now would violate the honest-tunables discipline (the cohesion/inspection precedent: only mirror
// what the day-1 logic consumes). The amplification is documented as deferred in the service header.
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069 / `T.db.city_state.district_count` L2103)
// is the canonical district set the controller validates against (1..18). Surfaced here because the controller
// CONSUMES it for the projection endpoint's district validation (one place per system — the cohesion/inspection
// precedent).
//
// 04e-A1 C1 (registry-first, [PROV-Y26Q2]) — 2 NEW substrate-1 BASE tunables (plan
// docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C1 / design §4.1, gdd/14 §City — Unconformity
// Ledgers): `forensic.audit_pin_half_life_days` + `forensic.audit_pin_emergence_rate`. These are the BASE values
// the C6 half-life decay + emergence-rate model reads THROUGH the `EffectOverlayStore` overlay — E-POL-09's
// `epol09_audit_pin_half_life_multiplier` (×0.6) and `epol09_audit_pin_emergence_multiplier` (×1.4),
// effect-engine.tunables.ts, are the MULTIPLY modifiers applied on top of these BASE keys (landed C6, see below).
// Caps clamp inline (Math.max/min — the `misLeakPriorityBoostRank` precedent below), consistent with this file
// NOT using a separate CAPS-map (no BO admin PUT endpoint here yet).
//
// 04e-A1 C6 (2026-07-04, plan C6 / design §4.1) — the half-life + emergence-gate model LANDS
// (unconformity.service.ts Phase D, migration 0107 `buildings.audit_pin_activated_at`):
//   - `pinHalfLifeDays` + `auditPinEmergenceRate` below are now OVERLAY-AWARE (the C5 GLOBAL body-wrap
//     pattern — `EffectOverlayStore.applyModifiers(key, base)`, applied AFTER the existing inline clamp so a
//     political-event modifier can push the composed value outside the admin-tunable [1,14]/[0.01,1.0] range on
//     purpose — that IS the point of a temporary regime shift). Empty overlay → base byte-identical (zero-
//     regression contract, C3/C5 precedent) — every existing unconformity.spec.ts assertion is unaffected.
//   - SUPERSESSION (this file's own C1 note above, "C6 decides how the two models coexist/supersede"):
//     `auditPinDurationDays` (below) is no longer consumed by the nightly tick — the half-life model
//     (`pinHalfLifeDays`, recomputed EVERY tick from the persisted `audit_pin_activated_at` anchor) replaces
//     it as the pin's effective-life basis. The getter is KEPT (registered, mirrored, not deleted) per the
//     project's `overlap_max_active` precedent (04e-A1 C1) rather than left silently dead — annotated
//     SUPERSEDED at its own doc-comment below. At the registered baseline (pinHalfLifeDays default 5 ==
//     auditPinDurationDays default 5) the two models produce an IDENTICAL newly-activated expiry, so this
//     supersession is itself byte-identical for any caller that never applies an overlay.
//   - `AUDIT_PIN_EMERGENCE_RATE_BASELINE` (exported below) is the "1×" normalization point
//     `UnconformityLedgerService.emergenceGateWindow()` divides by to derive the onboarding + HIGH-persistence
//     gate window from the CURRENT (overlay-aware) emergence rate. It mirrors the registered default (0.1) —
//     at that default the gate window equals `rollingWindowDays` exactly (unchanged from the pre-C6 model); a
//     raised rate (E-POL-09 ×1.4) shrinks the window so HIGH buildings clear onboarding + reach persistence
//     sooner ("more pins over a fixed window" — the C6 test floor's falsifiable emergence proof).

import { TunablesStore } from '../../config/tunables-store';
import { EffectOverlayStore } from '../../config/effect-overlay-store';

/**
 * 04e-A1 C6 — the "1×" baseline `forensic.audit_pin_emergence_rate` normalizes against (mirrors the
 * registered default, gdd/14 §City — Unconformity Ledgers). `UnconformityLedgerService.emergenceGateWindow()`
 * divides the CURRENT (overlay-aware) rate by this constant to derive a `rateFactor`; at the baseline rate
 * `rateFactor === 1` and the emergence gate window equals `rollingWindowDays` exactly (byte-identical to the
 * pre-C6 model). Exported (not inlined in the service) so both this file's own doc-comments and the service
 * cite the SAME single source.
 */
export const AUDIT_PIN_EMERGENCE_RATE_BASELINE = 0.1;

/**
 * Resolved System 7 Unconformity Ledgers tunables. The 4 consumed keys are REUSE from gdd/14 §City — Unconformity
 * Ledgers AND consumed by the nightly tick day-1 (deviation_threshold_sigma drives the bucket map + pin activation;
 * rolling_window_days sizes the deviation window + ring buffer; audit_pin_duration_days sets the persisted expiry;
 * decoy_revenue_suppression_multiplier is the suppression magnitude the in-memory suppression flag carries — the
 * financial application is the P2 deferral, see the file header). The district count is the controller's 1..N
 * validation bound. The 3 declaration_ledger.* G31 keys are DELIBERATELY NOT resolved (no producer — see header).
 * Precedence: DB-override > env > default (Phase-23 TunablesStore).
 */
export const unconformityTunables = {
  /** deviation_threshold_sigma — the sigma threshold for the deviation bucket map + audit-pin activation (Phase C/D). (DB-override > env > default — Phase-23). */
  get deviationThresholdSigma(): number { return TunablesStore.resolveFloat('T.city.deviation_threshold_sigma', 'DEVIATION_THRESHOLD_SIGMA', 1.8); },
  /** rolling_window_days — the rolling deviation-window length + the ring-buffer size (revenue_samples). (DB-override > env > default — Phase-23). */
  get rollingWindowDays(): number { return TunablesStore.resolveInt('T.city.rolling_window_days', 'ROLLING_WINDOW_DAYS', 7); },
  /**
   * audit_pin_duration_days — **SUPERSEDED (04e-A1 C6, design §4.1)**: the nightly tick no longer consumes
   * this getter to compute a pin's expiry — `pinHalfLifeDays` below (overlay-aware, recomputed every tick
   * from the persisted `audit_pin_activated_at` anchor) replaces it as the effective-life basis. KEPT
   * registered/mirrored (not deleted) per the `political_events.overlap_max_active` precedent (C1) rather
   * than left silently dead. At the registered defaults (both 5) the two models produce an IDENTICAL
   * newly-activated expiry, so this supersession is byte-identical for any caller with no active overlay.
   * (DB-override > env > default — Phase-23).
   */
  get auditPinDurationDays(): number { return TunablesStore.resolveInt('T.city.audit_pin_duration_days', 'AUDIT_PIN_DURATION_DAYS', 5); },
  /** decoy_revenue_suppression_multiplier — multiplier on declared revenue when suppression is active (Inv 7; P2 finance application deferred). (DB-override > env > default — Phase-23). */
  get decoyRevenueSuppressionMultiplier(): number { return TunablesStore.resolveFloat('T.city.decoy_revenue_suppression_multiplier', 'DECOY_REVENUE_SUPPRESSION_MULTIPLIER', 0.85); },
  /** city.district_count — the canonical district set the controller validates against (1..N). (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },

  /**
   * forensic.audit_pin_half_life_days — 04e-A1 C1 [PROV-Y26Q2] NEW substrate-1 BASE tunable (design §4.1),
   * OVERLAY-AWARE as of C6 (design §4.1 — the half-life decay model LANDS). The nightly tick reads this
   * FRESH every pass to compute/recompute a pin's expiry (`UnconformityLedgerService` Phase D — SUPERSEDES
   * `auditPinDurationDays` above). E-POL-09's `epol09_audit_pin_half_life_multiplier` (×0.6, applied via the
   * REAL `EffectModifierService.applyEvent` at C6's live-fire; wired to the real political event at A2)
   * genuinely shortens active pins' effective life — not just newly-activated ones (the overlay composes on
   * top of THIS resolved+clamped base every call). Default 5 (mirrors `audit_pin_duration_days` — byte-
   * identical newly-activated expiry at the registered defaults), range 1..14. Inline-clamped BEFORE the
   * overlay composes (a political-event modifier MAY push the composed result outside [1,14] on purpose —
   * that is the intended temporary regime shift, C5 precedent: clamp bounds the admin-settable base, not the
   * live-fire result). Empty overlay → base byte-identical (zero-regression contract).
   */
  get pinHalfLifeDays(): number {
    const v = TunablesStore.resolveInt('forensic.audit_pin_half_life_days', 'FORENSIC_AUDIT_PIN_HALF_LIFE_DAYS', 5);
    const base = Math.max(1, Math.min(14, v));
    return EffectOverlayStore.applyModifiers('forensic.audit_pin_half_life_days', base);
  },
  /**
   * forensic.audit_pin_emergence_rate — 04e-A1 C1 [PROV-Y26Q2] NEW substrate-1 BASE tunable (design §4.1),
   * OVERLAY-AWARE as of C6 (design §4.1 — the emergence-gate model LANDS). Read FRESH every nightly tick by
   * `UnconformityLedgerService.emergenceGateWindow()`, which derives the onboarding + HIGH-persistence gate
   * window from this rate relative to `AUDIT_PIN_EMERGENCE_RATE_BASELINE` (0.1, this getter's own default —
   * so the baseline rate reproduces `rollingWindowDays` exactly, byte-identical to the pre-C6 model).
   * E-POL-09's `epol09_audit_pin_emergence_multiplier` (×1.4, applied via the REAL
   * `EffectModifierService.applyEvent` at C6's live-fire; wired to the real political event at A2) genuinely
   * SHRINKS the gate window — HIGH buildings clear onboarding + reach persistence sooner ("more pins over a
   * fixed window"). Default 0.1, range 0.01..1.0. Inline-clamped BEFORE the overlay composes (same rationale
   * as `pinHalfLifeDays` above). Empty overlay → base byte-identical.
   */
  get auditPinEmergenceRate(): number {
    const v = TunablesStore.resolveFloat('forensic.audit_pin_emergence_rate', 'FORENSIC_AUDIT_PIN_EMERGENCE_RATE', 0.1);
    const base = Math.max(0.01, Math.min(1.0, v));
    return EffectOverlayStore.applyModifiers('forensic.audit_pin_emergence_rate', base);
  },
};
