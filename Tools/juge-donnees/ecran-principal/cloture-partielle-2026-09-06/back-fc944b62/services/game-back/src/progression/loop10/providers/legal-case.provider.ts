// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (HL provider #5 —
//             LEGAL_CASE_DECISION)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 ("legal cases
//             awaiting a player choice (04d-A LIVE; impact ∝ charge severity)").
//             Substrate (verified this chunk): `legal_cases` (`legal.ts:261-...` — 04d-A, migration
//             0097). "Awaiting a player choice" = `status='active'` (the ONLY status where the player
//             can still act — `acceptPleaDeal`, `legal-case.service.ts:509` — plea_down/acquitted/
//             convicted/dismissed are all terminal).
//             — P3-A C6 — 2026-07-10
//
// `LegalCaseHlCardProvider` — ONE candidate PER active case (unlike the aggregate providers above:
// design's "impact ∝ charge severity" is a PER-CASE attribute, and canon's "cases" is plural — each
// case is independently actionable, matching the autonomy-reports A/B-per-issue precedent's granularity
// more than the count-based aggregates):
//   impact  = the charge's ordinal severity mapped to [0,1] (misdemeanor=0.25, felony_low=0.5,
//     felony_high=0.75, major_crime=1.0 — a CLOSED 4-rung categorical mapping, not a tunable balance
//     value — mirrors `info-leak.service.ts`'s OWN parallel 0-100 BPD-severity ordinal scale, kept
//     LOCAL here rather than importing that private, differently-scaled module constant).
//   urgency = 1 − (ticks_remaining / case_duration_ticks) — how close the case is to the NIGHTLY
//     auto-resolution sweep (canon `resolveCase`), i.e. how little time is left for the player to act;
//     self-normalizing off the case's OWN persisted duration (no external tunable needed).
// Deterministic (D13): no Math.random, no Date.now — one query, pure per-row math.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { legalCase } from '../../../db/schema/legal';
import { clamp01, HL_CARD_PROVIDER_CATALOGUE, HlCardProviderType, type HlCardCandidate, type HlCardProvider } from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.key === HlCardProviderType.LEGAL_CASE_DECISION)!.code;

/** Charge-severity → normalized [0,1] impact (a closed 4-rung ordinal mapping, not a balance tunable —
 *  file header). Unknown severity (defensive — the enum is closed) falls back to the mid-rung. */
const CHARGE_SEVERITY_IMPACT: Record<string, number> = {
  misdemeanor: 0.25,
  felony_low: 0.5,
  felony_high: 0.75,
  major_crime: 1.0,
};

@Injectable()
export class LegalCaseHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.LEGAL_CASE_DECISION;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const rows = await this.db
      .select({
        caseId: legalCase.case_id,
        chargeSeverity: legalCase.charge_severity,
        ticksRemaining: legalCase.ticks_remaining,
        caseDurationTicks: legalCase.case_duration_ticks,
      })
      .from(legalCase)
      .where(and(eq(legalCase.player_id, playerId), eq(legalCase.status, 'active')));

    return rows.map((r) => ({
      providerType: this.providerType,
      decisionTypeCode: CATALOGUE_CODE,
      impact: CHARGE_SEVERITY_IMPACT[r.chargeSeverity] ?? 0.5,
      urgency: clamp01(r.caseDurationTicks > 0 ? 1 - r.ticksRemaining / r.caseDurationTicks : 0.5),
      targetRef: { entity: 'legal_case', case_id: r.caseId },
      options: [
        { label: 'hl.option.legal_case.accept_plea_deal' },
        { label: 'hl.option.legal_case.let_ride' },
      ],
    }));
  }
}
