// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C1 (types)
//             File Structure §: `legal.types.ts` — TypeScript types for the LawyerModule.
//             — 04d-A C1 — 2026-06-30
//
// TypeScript domain types for the Lawyer & Legal System (04d-A, G5).
//
// Closed-domain enum literals (mirroring the pgEnums in db/schema/legal.ts):
//   LawyerTier        — 'public_defender' | 'boutique' | 'corruption_pipeline'
//   ChargeSeverity    — 'misdemeanor' | 'felony_low' | 'felony_high' | 'major_crime'
//   CaseStatus        — 'active' | 'plea_down' | 'acquitted' | 'convicted' | 'dismissed'
//   DefendantType     — 'courier' | 'lieutenant' | 'dealer' (dealer = reserved-inert, RATIFIÉ #5)
//
// Projection bands (R2.2/P5 wall — the only representations the client ever sees):
//   LeakBandBucket    — 'silent' | 'low' | 'significant' | 'full_dump'
//   BurnRiskBucket    — 'none' | 'elevated' | 'critical' (composite, decision #6)
//
// Knowledge-set types (for knowledge_set_ref / items_leaked jsonb):
//   KnowledgeItem     — { id, type, label, importance }
//   KnowledgeSet      — { items: KnowledgeItem[] }
//
// Bus events (declared in C3, emitted C7/C8):
//   CaseResolvedEvent  — qualitative only (no raw info_leak_total)
//   LawyerBurnedEvent  — qualitative only (the IA-B §13 flip entry-point)
//
// Projection output (C9 LegalProjectionService.toLegalPanel):
//   LegalPanelView    — activeCases + lawyerRoster (no hidden scalars)
//
// TD-556 (maillon 2, chantier "les maillons back des écrans neufs", 2026-09-03) — ADDITIVE:
//   LawyerRosterView.lawyerLabelI18n — `lawyerLabel` is server-rendered English prose ("Boutique
//   Counsel"), a direct violation of F1/R-EH-2 ("le back ÉMET des CLÉS, il ne code jamais en dur un
//   libellé joueur") — same family as TD-452. `lawyerLabel` STAYS (additive-only, TD-556's own
//   ratified brief overrides the tech-debt entry's "remplace").

import type { I18nRef } from '../../common/i18n-ref';

// ===== Closed-domain enum literals =====

/** Tier of defense lawyer (mirrors pgEnum `lawyer_tier`). */
export type LawyerTier = 'public_defender' | 'boutique' | 'corruption_pipeline';

/** Severity of the criminal charge (mirrors pgEnum `charge_severity`). */
export type ChargeSeverity = 'misdemeanor' | 'felony_low' | 'felony_high' | 'major_crime';

/** Lifecycle state of a legal case (mirrors pgEnum `case_status`). */
export type CaseStatus = 'active' | 'plea_down' | 'acquitted' | 'convicted' | 'dismissed';

/** Category of person being defended (mirrors pgEnum `defendant_type`). dealer = reserved-inert (RATIFIÉ #5). */
export type DefendantType = 'courier' | 'lieutenant' | 'dealer';

// ===== Projection bands (R2.2/P5 wall) =====

/**
 * `LeakBandBucket` — qualitative band derived from `info_leak_total` (C9 LegalProjectionService).
 *
 * Cuts are `[PROV-Y26Q2]` registry getters (C2). Never the raw float.
 * Client sees only this band in the Legal panel (activeCases[].leak).
 *
 * - `silent`      : info_leak_total < cut_silent (very few items leaked)
 * - `low`         : cut_silent ≤ info_leak_total < cut_low
 * - `significant` : cut_low ≤ info_leak_total < cut_significant
 * - `full_dump`   : info_leak_total ≥ cut_significant (most knowledge revealed)
 */
export type LeakBandBucket = 'silent' | 'low' | 'significant' | 'full_dump';

/**
 * `BurnRiskBucket` — composite band derived from `burn_risk_score` (C9/C10 BO).
 *
 * Decision #6 (RATIFIÉ 2026-06-30): `burn_risk_score` is NEVER a client scalar.
 * The registry models this as a composite; the projection emits a band.
 * BO sees the band for ops visibility; the player sees only the qualitative Exception
 * ("your Tier-3 lawyer has been acting nervous") when approaching 'critical'.
 *
 * - `none`     : burn_risk_score < tier3_burn_elevated_threshold
 * - `elevated` : tier3_burn_elevated_threshold ≤ score < tier3_burn_threshold
 * - `critical` : score ≥ tier3_burn_threshold (LawyerBurnedEvent imminent / already fired)
 */
export type BurnRiskBucket = 'none' | 'elevated' | 'critical';

// ===== Knowledge-set types =====

/** A single item of knowledge held by a defendant (courier/lieutenant). */
export interface KnowledgeItem {
  /** Unique id within the knowledge set (uuid string). */
  id: string;
  /** Category of knowledge (e.g. 'stash_location', 'lieutenant_identity', 'route_segment'). */
  type: string;
  /** Human-readable label (BO display / future Exception UI). */
  label: string;
  /** Importance weight [0..1] — higher importance items drive larger conviction final-dump. */
  importance: number;
}

/**
 * `KnowledgeSet` — the lazy-computed knowledge of a defendant at case creation (C3 createCase).
 *
 * Persisted as `legal_cases.knowledge_set_ref` (jsonb). Immutable after createCase.
 * Composed from courier/lieutenant role+tenure at the moment of arrest.
 * Items from this set are drawn per-tick by tickLeakAccumulation (C6) and appended to
 * `items_leaked` (jsonb) — each item id added once (no duplicates).
 */
export interface KnowledgeSet {
  items: KnowledgeItem[];
}

// ===== Bus events (declared C3, emitted C7/C8, consumed BPD/Exception) =====

/**
 * `CaseResolvedEvent` — emitted by `LegalCaseService.resolveCase` (C7 NIGHTLY sweep).
 *
 * Qualitative only — NO raw `info_leak_total` (R2.2/P5 invariant).
 * Outcome 'convicted' triggers the conviction final-dump `appendDeclarationEntry` (C7).
 * Consumed by: BPD (conviction → final declaration), the Exception spine (player notification).
 *
 * Canon: plan §Events "CaseResolvedEvent { type:'case_resolved'; playerId; caseId;
 *   defendantType: DefendantType; outcome: 'acquitted'|'plea_down'|'convicted'|'dismissed'; gameMinute }".
 */
export interface CaseResolvedEvent {
  type: 'case_resolved';
  playerId: string;
  caseId: string;
  defendantType: DefendantType;
  outcome: 'acquitted' | 'plea_down' | 'convicted' | 'dismissed';
  gameMinute: number;
}

/**
 * `LawyerBurnedEvent` — emitted by `LawyerService.evaluateBurnRisk` (C8 NIGHTLY) when
 * `burn_risk_score > tier3_burn_threshold`.
 *
 * Qualitative only — NO raw `burn_risk_score` (R2.2/P5 invariant, decision #6).
 * Triggers: cancel pending Tier-3 cases → auto-switch to Tier-1; urgent player Exception.
 * This is the IA-B (04d-B) §13 entry-point: B fires on a forward-cascade discovery of a
 * `lawyer` target and uses `LawyerBurnedEvent` as the flip signal (§13 contract).
 *
 * Canon: plan §Events "LawyerBurnedEvent { type:'lawyer_burned'; playerId; lawyerId; gameMinute }".
 */
export interface LawyerBurnedEvent {
  type: 'lawyer_burned';
  playerId: string;
  lawyerId: string;
  gameMinute: number;
}

// ===== Projection output (C9 LegalProjectionService.toLegalPanel) =====

/** One active-case entry in the Legal panel (player-facing; no hidden scalars). */
export interface ActiveCaseView {
  /** Unique case id (for client-side keying; not used to query server state). */
  caseId: string;
  /** Clear defendant label (e.g. "Courier #3", "Lt. Chen") — legitimate display fact. */
  defendantLabel: string;
  /**
   * charge_severity — CLEAR (a charge is a legitimate public fact; the player chose LAWYER_UP
   * knowing they had a courier caught, so the charge category is not hidden).
   */
  chargeSeverity: ChargeSeverity;
  /**
   * daysRemaining — derived from ticks_remaining (clear time fact, not a hidden scalar).
   * Rendered "Xd remaining" in the Legal panel.
   */
  daysRemaining: number;
  /**
   * leak — LeakBandBucket derived from info_leak_total (R2.2/P5: never the raw float).
   * 'silent' | 'low' | 'significant' | 'full_dump'.
   */
  leak: LeakBandBucket;
}

/** One lawyer entry in the Legal panel roster (player-facing; no burn_risk_score). */
export interface LawyerRosterView {
  /**
   * lawyerId — the lawyers.lawyer_id UUID (W6.3 C0 additive). Same class of opacity as
   * ActiveCaseView.caseId (:141, already client-facing): a UUID is an identity token, not a
   * hidden scalar. Without it, a client that reads only this panel cannot NAME a lawyer to call
   * `reassignCase` / `setRetainer` (both REQUIRE a lawyerId) — W6.3 §1.2 "insufficient projection".
   */
  lawyerId: string;
  /** Display label (lawyer name). Server-rendered English prose (pre-existing, F1/R-EH-2 violation —
   *  see `lawyerLabelI18n` below, the ADDITIVE fix). STAYS untouched (additive-only). */
  lawyerLabel: string;
  /**
   * TD-556 (2026-09-03) — `lawyerLabel`'s i18n-safe sibling (mirrors the `name_i18n` pattern
   * `buildingNameRef` established, `common/fiction-names.ts`): a resolvable key + params, the SAME
   * `I18nRef` shape every other producer of player-facing text in this codebase uses (D1). Derived
   * PURELY from `tier` (the closed 3-member `LawyerTier` pgEnum this row already carries, below) —
   * NEVER from the free-text `lawyerLabel`/`lawyers.name` column, which `HireOpts.name` lets a caller
   * override (measured: the ONLY production caller, `LegalController.hire`, never passes `opts.name` —
   * `lawyer.service.ts:140`'s tier-keyed default is the SAME text `lawyerLabel` always carries in
   * production; the test-only seam `legal-test.controller.ts:547` doesn't pass a name either). See
   * `lawyerTierNameRef` in `legal-projection.service.ts` for the resolver + its own header on why the
   * FR values are English pending a ratified translation (no maquette/canon FR text exists yet for
   * these 3 tier labels — unlike the 4 rival names TD-553 sourced).
   */
  lawyerLabelI18n: I18nRef;
  /** Tier — clear (player chose to hire this tier). */
  tier: LawyerTier;
  /** retainer — whether a monthly retainer is active. */
  retainer: boolean;
  /** activeCaseCount — number of active cases assigned to this lawyer. */
  activeCaseCount: number;
  // NO burn_risk_score (R2.2/P5 — the raw float is server-only; qualitative Exception sent separately).
}

/**
 * `LegalPanelView` — the player-facing Legal panel projection (C9 LegalProjectionService.toLegalPanel).
 *
 * ALL hidden scalars are stripped (R2.2/P5 invariant):
 *   - info_leak_rate / info_leak_total → LeakBandBucket only
 *   - burn_risk_score → NOT exposed (qualitative Exception only)
 * The projection carries ONLY clear facts (charge + time) and banded hidden-state.
 */
export interface LegalPanelView {
  activeCases: ActiveCaseView[];
  lawyerRoster: LawyerRosterView[];
}
