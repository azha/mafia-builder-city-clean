// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C7 ("HL provider 108
//             `CUE_CASCADE_FALLOUT`, severed-route aggregate template, codes 101-107 untouched, dup-throw").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §11 ("+1 provider
//             advisory code 108 `CUE_CASCADE_FALLOUT` (forme aggregate-1-candidat, le calque exact
//             `SeveredRouteHlCardProvider` :38-64) : ≥1 carte cascade PENDING → la carte HL 'fallout à
//             traiter' au session-open — la réalisation du canon 'next session opens with these as primary
//             cards' (GDD L253)."). Decisions §6.4 RULING #4(a).
//             Substrate: `cue-cascade-exception-producer.service.ts` — the `CUE_CASCADE` source tag every
//             cascade card's candidate actions carry (`CUE_CASCADE_SOURCE`, that file's own export).
//             — P3-D C7 — 2026-07-15
//
// `CueCascadeFalloutHlCardProvider` — ONE aggregate candidate when the player has ≥1 PENDING exception
// card tagged `CUE_CASCADE` (a cue-stack `failed_collision`/`failed_disrupted` slot's own mini-Exception,
// `cue-cascade-exception-producer.service.ts`):
//   impact  = cascadeCount / totalPendingCount (ratio proxy — mirrors `SeveredRouteHlCardProvider`'s OWN
//     severedCount/totalRouteCount "no new magic number" precedent, applied here to the player's OWN
//     pending-exception backlog: what share of "things to decide right now" is cue-stack fallout).
//   urgency = 0.9 (FIXED — mirrors the SAME "urgency high" constant every sibling v1 provider uses; the
//     canon's OWN framing — "primary cards" at session-open — is already the strongest possible urgency
//     signal this provider type carries, no new formula invented).
// Deterministic (D13): no Math.random, no Date.now — two counts, a pure ratio.

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { exceptionQueueRow } from '../../../db/schema/queues_exceptions_cuestack';
import { clamp01, HL_CARD_PROVIDER_CATALOGUE, HlCardProviderType, type HlCardCandidate, type HlCardProvider } from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.key === HlCardProviderType.CUE_CASCADE_FALLOUT)!.code;

/** "primary cards" (GDD L253) — mirrors every OTHER v1 provider's own fixed "urgency high" constant. */
const FIXED_URGENCY_HIGH = 0.9;

/** The jsonb `source` tag every cue-cascade card's candidate actions carry (`cue-cascade-exception-
 *  producer.service.ts#CUE_CASCADE_SOURCE`, MUST match verbatim — deliberately NOT imported from that
 *  file: it lives in `core_loops/cue_stack/`, a module tree `Loop10Module` never otherwise touches, and
 *  this codebase's own convention is to duplicate a trivial constant rather than open a new cross-module
 *  file import for it, mirroring `rowsOf()`'s own copied-per-file precedent). */
const CUE_CASCADE_SOURCE_TAG = 'CUE_CASCADE';

/** Defensive dual-shape read for a raw `db.execute` result (the `exceptions.repository.ts#
 *  hasPendingForBuilding`/`cue-cascade-exception-producer.service.ts` idiom, copied verbatim — no shared
 *  extraction across repositories/providers, this codebase's own convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class CueCascadeFalloutHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.CUE_CASCADE_FALLOUT;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const totalRows = await this.db
      .select({ exception_id: exceptionQueueRow.exception_id })
      .from(exceptionQueueRow)
      .where(sql`${exceptionQueueRow.player_id} = ${playerId}::uuid AND ${exceptionQueueRow.resolution_status} = 'pending'`);
    const total = totalRows.length;
    if (total === 0) return [];

    const cascadeResult = await this.db.execute(sql`
      SELECT DISTINCT exception_id
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'source' = ${CUE_CASCADE_SOURCE_TAG}
    `);
    const cascadeIds = rowsOf(cascadeResult).map((r) => String(r['exception_id']));
    if (cascadeIds.length === 0) return [];

    return [
      {
        providerType: this.providerType,
        decisionTypeCode: CATALOGUE_CODE,
        impact: clamp01(cascadeIds.length / total),
        urgency: FIXED_URGENCY_HIGH,
        targetRef: { entity: 'exception_queue', exception_ids: [...cascadeIds].sort() },
        options: [
          { label: 'hl.option.cue_cascade_fallout.review_now' },
          { label: 'hl.option.cue_cascade_fallout.leave_pending' },
        ],
      },
    ];
  }
}
