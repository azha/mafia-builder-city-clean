// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C9 (P5 wall)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md
//               §Projection (R2.2) :220-228, §LeakBandBucket :130,282
//             Pattern: PoliceMemoryProjectionService (police_memory.projection.service.ts)
//             — 04d-A C9 — 2026-06-30
//
// `LegalProjectionService` — the R2.2/P5 wall for the Lawyer & Legal System.
//
// THE ONLY path from case/lawyer state to the player. Strips all hidden scalars:
//   info_leak_rate   → NOT exposed (server-only, R2.2/P5)
//   info_leak_total  → LeakBandBucket ('silent'|'low'|'significant'|'full_dump')
//   burn_risk_score  → NOT exposed in player panel (qualitative Exception only)
//   BurnRiskBucket   → BO/contract band (C10 admin endpoint), NOT in toLegalPanel client payload
//
// toLegalPanel(playerId): LegalPanelView exposes ONLY:
//   activeCases[] — defendantLabel + chargeSeverity (clear charge fact) + daysRemaining
//                   (clear time fact) + leak (LeakBandBucket — banded hidden-state)
//   lawyerRoster[]— lawyerLabel + lawyerLabelI18n (TD-556, ADDITIVE) + tier + retainer +
//                   activeCaseCount (NO burn_risk_score)
//
// R2.2 grep-zero proof (legal_p5_wall.spec.ts):
//   The JSON of toLegalPanel output must NOT contain the strings:
//     'info_leak_rate', 'info_leak_total', 'burn_risk_score'
//   Verified by legal_p5_wall.spec.ts C9-grep-zero test.
//
// Falsifiability (legal_p5_wall.spec.ts):
//   Two cases with info_leak_total straddling a cut-point → different LeakBandBuckets.
//   Two lawyers with sub-threshold burn_risk_score → no burn warning in player panel.
//
// Pure helpers (deterministic, no I/O):
//   deriveLeakBand(infoLeakTotal, tunables): LeakBandBucket
//   deriveBurnRiskBucket(burnRiskScore, tunables): BurnRiskBucket
//
// C10 note: deriveBurnRiskBucket is exported for the admin BO endpoint (C10) and the
//   §13 contract surface for 04d-B (getBurnRiskBand). It is NOT in the player-facing panel.

import { Injectable } from '@nestjs/common';

import type { LegalPanelView, ActiveCaseView, LawyerRosterView, LeakBandBucket, BurnRiskBucket, LawyerTier } from './legal.types';
import type { LawyerRow, LegalCaseRow } from '../../db/schema/legal';
import { LegalCaseRepository } from './legal-case.repository';
import { LawyerTunables } from './lawyer.tunables';
import type { I18nRef } from '../../common/i18n-ref';

// ── Pure projection helpers (no I/O, no side-effects) ───────────────────────────────────────────

// TD-556 (maillon 2, chantier "les maillons back des écrans neufs", 2026-09-03) — `lawyerLabelI18n`'s
// resolver. Keyed by `tier` (the closed 3-member `lawyerTier` pgEnum, `db/schema/legal.ts:69`), NEVER
// by the free-text `lawyers.name` column (see `LawyerRosterView.lawyerLabelI18n`'s own header for why
// that's safe in production). `Readonly<Record<LawyerTier, I18nRef>>` — mirrors `RIVAL_DISPLAY_NAME`'s
// resolveur-exhaustif shape (`common/fiction-names.ts`, TD-553): TS enforces all 3 members present at
// this declaration, so a 4th `lawyer_tier` pgEnum value added upstream is a COMPILE error here, never a
// silent gap.
//
// ⚠️ FR VALUES ARE ENGLISH, consciously, pending a ratified translation: unlike TD-553's 4 rival names
// (sourced from BOTH the ㉙ maquette the user ratified AND GDD canon), this repo carries ZERO existing
// French rendering for these 3 tier labels anywhere — no maquette (écran ㉛ is `[~]` maquetté, front.md,
// not yet ratified), no canon FR text, no prior back-owned string. Inventing one here would be the EXACT
// trap TD-556's own brief names for the CLIENT side ("traduire côté client inventerait une chaîne que
// personne n'a ratifiée") — the same risk applies one layer down if the BACK invents the French wording
// instead. EN==FR byte-identical is the established passe-plat for this (`game.fiction.route.named`'s
// own precedent, `common/fiction-names.ts` header: "the same passe-plat family as game.i18n.legacy.text:
// an identifier-style label, not prose to translate") — this closes the ARCHITECTURAL violation (a raw
// literal → a resolvable key) without inventing unratified player-facing prose. Re-visit once ㉛'s
// maquette is ratified with real FR tier labels (implementation-notes.md §Deviations).
const LAWYER_TIER_NAME_REF: Readonly<Record<LawyerTier, I18nRef>> = {
  public_defender: { key: 'game.legal.lawyer_tier.public_defender', params: {} },
  boutique: { key: 'game.legal.lawyer_tier.boutique', params: {} },
  corruption_pipeline: { key: 'game.legal.lawyer_tier.corruption_pipeline', params: {} },
};

/** `lawyerLabelI18n` — see `LawyerRosterView.lawyerLabelI18n`'s own header + `LAWYER_TIER_NAME_REF`
 *  above. NEVER throws (mirrors `rivalNameRef`/`buildingTypeFromRawInt`'s "never crash the whole
 *  response on a lookup miss" posture) — `tier` reaches this function through the SAME NOT-NULL pgEnum
 *  column Drizzle already narrows to `LawyerTier`, so a miss is structurally unreachable for a
 *  type-checked caller, but the lookup stays defensive anyway. */
function lawyerTierNameRef(tier: LawyerTier): I18nRef {
  return LAWYER_TIER_NAME_REF[tier] ?? { key: `game.legal.lawyer_tier.unknown_${tier}`, params: {} };
}

// ── Pure projection helpers (no I/O, no side-effects) ───────────────────────────────────────────

/**
 * `deriveLeakBand` — maps `info_leak_total` (SERVER-ONLY scalar) → `LeakBandBucket` (player-safe).
 *
 * Cut-points are [PROV-Y26Q2] registry getters from LawyerTunables:
 *   info_leak_total <  leakBandCutSilent                          → 'silent'
 *   leakBandCutSilent  ≤ info_leak_total < leakBandCutLow        → 'low'
 *   leakBandCutLow     ≤ info_leak_total < leakBandCutSignificant → 'significant'
 *   info_leak_total >= leakBandCutSignificant                     → 'full_dump'
 *
 * Pure function: same (infoLeakTotal, tunables) → same band. No RNG, no Date.now().
 * R2.2/P5: the raw `infoLeakTotal` float never escapes this function to the client.
 */
export function deriveLeakBand(
  infoLeakTotal: number,
  tunables: Pick<LawyerTunables, 'leakBandCutSilent' | 'leakBandCutLow' | 'leakBandCutSignificant'>,
): LeakBandBucket {
  if (infoLeakTotal < tunables.leakBandCutSilent) return 'silent';
  if (infoLeakTotal < tunables.leakBandCutLow) return 'low';
  if (infoLeakTotal < tunables.leakBandCutSignificant) return 'significant';
  return 'full_dump';
}

/**
 * `deriveBurnRiskBucket` — maps `burn_risk_score` (SERVER-ONLY scalar) → `BurnRiskBucket`.
 *
 * Composite decision #6 (RATIFIÉ 2026-06-30): the raw float is never returned to a client
 * endpoint. The band is exposed to BO (C10 admin) and used as the §13 contract surface for B.
 *
 *   burn_risk_score <  tier3BurnElevatedThreshold → 'none'
 *   tier3BurnElevatedThreshold ≤ score < tier3BurnThreshold → 'elevated'
 *   score >= tier3BurnThreshold → 'critical' (LawyerBurnedEvent fired / imminent)
 *
 * Pure function: same (burnRiskScore, tunables) → same bucket. No RNG, no Date.now().
 * R2.2/P5: the raw `burnRiskScore` float never escapes this function to the client.
 */
export function deriveBurnRiskBucket(
  burnRiskScore: number,
  tunables: Pick<LawyerTunables, 'tier3BurnElevatedThreshold' | 'tier3BurnThreshold'>,
): BurnRiskBucket {
  if (burnRiskScore >= tunables.tier3BurnThreshold) return 'critical';
  if (burnRiskScore >= tunables.tier3BurnElevatedThreshold) return 'elevated';
  return 'none';
}

// ── LegalProjectionService ────────────────────────────────────────────────────────────────────────

/** Ticks per in-game day (NIGHTLY = 1440 MINUTE ticks per day). */
const TICKS_PER_DAY = 1440;

@Injectable()
export class LegalProjectionService {
  constructor(
    private readonly repo: LegalCaseRepository,
    private readonly tunables: LawyerTunables,
  ) {}

  /**
   * `toLegalPanel` — the sole player-facing Legal panel view (R2.2/P5 wall).
   *
   * Returns a `LegalPanelView` containing ONLY clear facts and banded hidden-state:
   *   activeCases[] — active cases with defendant label, charge (clear), days remaining (clear),
   *                   and `LeakBandBucket` (banded info_leak_total — never the raw float).
   *   lawyerRoster[]— all lawyers for the player with tier/retainer/activeCaseCount.
   *                   NO `burn_risk_score` in the roster (R2.2). The burn warning is a
   *                   separate qualitative Exception ("lawyer acting nervous"), not a panel field.
   *
   * Hidden scalars that MUST NOT appear in this response (grep-zero invariant):
   *   - info_leak_rate
   *   - info_leak_total
   *   - burn_risk_score
   *
   * @param playerId — the player whose legal panel is being projected.
   */
  async toLegalPanel(playerId: string): Promise<LegalPanelView> {
    // Fetch active cases and all lawyers for the player concurrently.
    const [activeCases, allLawyers] = await Promise.all([
      this.repo.listActiveCasesForPlayer(playerId),
      this.repo.listAllLawyersForPlayer(playerId),
    ]);

    // Build activeCaseCount per lawyerId from active cases only.
    const caseCountByLawyerId = new Map<string, number>();
    for (const c of activeCases) {
      if (c.lawyer_id) {
        caseCountByLawyerId.set(c.lawyer_id, (caseCountByLawyerId.get(c.lawyer_id) ?? 0) + 1);
      }
    }

    // Project active cases — strip server-only scalars, band info_leak_total.
    const projectedCases: ActiveCaseView[] = activeCases.map((c) =>
      this.projectCase(c),
    );

    // Project lawyer roster — strip burn_risk_score, attach activeCaseCount.
    const projectedRoster: LawyerRosterView[] = allLawyers.map((l) =>
      this.projectLawyer(l, caseCountByLawyerId.get(l.lawyer_id) ?? 0),
    );

    return {
      activeCases: projectedCases,
      lawyerRoster: projectedRoster,
    };
  }

  // ── §13 contract surface for 04d-B ───────────────────────────────────────────────────────────

  /**
   * `getBurnRiskBand` — §13 contract surface for 04d-B (IA module).
   *
   * Returns the `BurnRiskBucket` for a specific lawyer by reading `burn_risk_score`
   * from the DB and mapping via `deriveBurnRiskBucket`. B's Internal Affairs module
   * calls this to check a lawyer target's burn risk during IA suspicion accumulation.
   *
   * R2.2/P5: the raw `burn_risk_score` float is never returned to the caller — only the band.
   *
   * @param lawyerId — the UUID of the lawyer to check.
   * @returns `BurnRiskBucket` ('none'|'elevated'|'critical'), or 'none' if not found.
   */
  async getBurnRiskBand(lawyerId: string): Promise<BurnRiskBucket> {
    const lawyerRow = await this.repo.findLawyerById(lawyerId);
    if (!lawyerRow) return 'none';
    return deriveBurnRiskBucket(lawyerRow.burn_risk_score ?? 0, this.tunables);
  }

  // ── Private projection helpers ────────────────────────────────────────────────────────────────

  /**
   * Project a single `legal_cases` row to `ActiveCaseView`.
   *
   * Strips server-only fields: `info_leak_rate`, `info_leak_total`, `info_leak_rate`,
   * `items_leaked`, `knowledge_set_ref`, `lawyer_id`, `started_at`, `resolved_at`.
   * Exposes ONLY:
   *   caseId          — identity (clear; used for client-side keying only)
   *   defendantLabel  — derived from defendant_type + defendant_id (clear display fact)
   *   chargeSeverity  — the charge category (clear: the player chose LAWYER_UP knowing the charge)
   *   daysRemaining   — ticks_remaining / TICKS_PER_DAY (clear time fact)
   *   leak            — LeakBandBucket derived from info_leak_total (banded hidden-state)
   */
  private projectCase(c: LegalCaseRow): ActiveCaseView {
    // defendantLabel: "Courier <shortId>" or "Lt. <shortId>" — qualitative display.
    // The full UUID is not returned (not useful to the player; only the type matters).
    const shortId = (c.defendant_id ?? '').slice(0, 8);
    const defendantLabel =
      c.defendant_type === 'courier'    ? `Courier ${shortId}` :
      c.defendant_type === 'lieutenant' ? `Lt. ${shortId}` :
      /* dealer (reserved-inert) */       `Defendant ${shortId}`;

    // daysRemaining: ticks_remaining / TICKS_PER_DAY, rounded up (minimum 0).
    const daysRemaining = Math.max(0, Math.ceil((c.ticks_remaining ?? 0) / TICKS_PER_DAY));

    // leak: band derived from info_leak_total — the raw float NEVER leaves this method.
    const leak = deriveLeakBand(c.info_leak_total ?? 0, this.tunables);

    return {
      caseId: c.case_id,
      defendantLabel,
      chargeSeverity: c.charge_severity,
      daysRemaining,
      leak,
    };
  }

  /**
   * Project a single `lawyers` row to `LawyerRosterView`.
   *
   * Strips server-only fields: `burn_risk_score`, `hired_at`, `created_via_quest_id`.
   * Exposes ONLY:
   *   lawyerLabel    — the lawyer name (clear display fact)
   *   lawyerLabelI18n— TD-556 (2026-09-03), ADDITIVE: the i18n-safe sibling (see its own header).
   *   tier           — the tier (clear: the player hired this tier)
   *   retainer       — whether a monthly retainer is active (clear: the player set it)
   *   activeCaseCount— count of active cases assigned to this lawyer (derived, not raw)
   *
   * R2.2/P5: `burn_risk_score` is NEVER exposed in the player panel.
   *   The burn warning reaches the player via a separate qualitative Exception card only.
   */
  private projectLawyer(l: LawyerRow, activeCaseCount: number): LawyerRosterView {
    return {
      // W6.3 C0 — additive: lawyerId is the SAME class of opacity as ActiveCaseView.caseId
      // (already client-facing, :199). Without it, reassignCase/setRetainer are un-callable
      // from a client that only reads this panel (W6.3 §1.2).
      lawyerId: l.lawyer_id,
      lawyerLabel: l.name ?? 'Unknown',
      lawyerLabelI18n: lawyerTierNameRef(l.tier),
      tier: l.tier,
      retainer: l.retainer_active ?? false,
      activeCaseCount,
    };
  }
}
