// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (HL provider #3 —
//             ESCALATION_BACKLOG_REVIEW)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 ("≥
//             `hl_escalation_backlog_min` escalated cards pending review (impact moderate, urgency ∝
//             count band)").
//             Substrate (REUSE, D3 additive-only — no `src/exceptions/` edit here, only a SELECT):
//             `exception_queue.resolution_status='escalated'` (`queues_exceptions_cuestack.ts:28-33` —
//             the D6 EscalationLog-projection substrate, `escalate.handler.ts` → `markResolved
//             ('escalated', ...)`).
//             — P3-A C6 — 2026-07-10
//
// `EscalationBacklogHlCardProvider` — ONE aggregate candidate when the player's escalated-card count
// reaches `core_loops.hl_escalation_backlog_min` (C1, default 3):
//   impact  = 0.5 (FIXED — a design-§8 concretization of "impact moderate" (a qualitative gesture, not a
//     canon-verbatim number), not a derived ratio — mirrors `SeveredRouteHlCardProvider`'s FIXED
//     "urgency high" constant).
//   urgency = clamp((count − min) / min, 0, 1) — "count band" expressed as a ratio of HOW FAR PAST the
//     already-registered `hlEscalationBacklogMin` getter the count sits (self-normalizing off the ONE
//     existing tunable — no NEW magic number needed for this provider, unlike the other 2 [PROV-Y26Q2]
//     horizon additions this chunk registers).
// Deterministic (D13): no Math.random, no Date.now — one query, a pure ratio against a registered getter.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { exceptionQueueRow } from '../../../db/schema/queues_exceptions_cuestack';
import { coreLoopsTunables } from '../../../core_loops/core-loops-tunables';
import { clamp01, HL_CARD_PROVIDER_CATALOGUE, HlCardProviderType, type HlCardCandidate, type HlCardProvider } from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.key === HlCardProviderType.ESCALATION_BACKLOG_REVIEW)!.code;

/** "impact moderate" — a design-§8 concretization (qualitative constant), not a derived ratio. */
const FIXED_IMPACT_MODERATE = 0.5;

@Injectable()
export class EscalationBacklogHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.ESCALATION_BACKLOG_REVIEW;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const rows = await this.db
      .select({ id: exceptionQueueRow.exception_id })
      .from(exceptionQueueRow)
      .where(and(eq(exceptionQueueRow.player_id, playerId), eq(exceptionQueueRow.resolution_status, 'escalated')));

    const count = rows.length;
    const min = coreLoopsTunables.hlEscalationBacklogMin;
    if (count < min) return [];

    return [
      {
        providerType: this.providerType,
        decisionTypeCode: CATALOGUE_CODE,
        impact: FIXED_IMPACT_MODERATE,
        urgency: clamp01((count - min) / min),
        targetRef: { entity: 'exception_queue', escalated_count: count },
        options: [
          { label: 'hl.option.escalation_backlog.review_now' },
          { label: 'hl.option.escalation_backlog.leave_pending' },
        ],
      },
    ];
  }
}
