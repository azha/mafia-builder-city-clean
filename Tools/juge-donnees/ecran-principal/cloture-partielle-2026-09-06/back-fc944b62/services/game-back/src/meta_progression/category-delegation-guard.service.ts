// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C6 ("Surface retirement
//             guard + successor projection" — `CategoryDelegationGuard` (`assertNotDelegated(playerId,
//             category)` — one-line seam) retrofitted on the C0-enumerated guard sites of the 4 LIVE
//             categories; 409 `CATEGORY_DELEGATED` body (i18n key + lieutenant ref + successor pointer —
//             state description, the P3-A D12 brand wall: no countdown)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md D6/§8.3 ("a
//             per-site check (one-line seam, the P3-A retrofit pattern): assertNotDelegated(playerId,
//             CATEGORY) → 409 CATEGORY_DELEGATED with the lieutenant ref + successor pointer (state
//             description; i18n key)... Window-ACTIVE state (post-recall) does NOT trip the guard (state
//             is back to SELF...)").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §5.4/§7 (the per-category
//             guard-site tables — ROUTE_ASSIGNMENT/LIEUTENANT_HIRING/SUPPLY_SOURCING have real dedicated
//             endpoints; HEAT_MANAGEMENT is PROJECTION-ONLY, no dedicated hard-mutation endpoint exists on
//             this base — C6 confirms that reading here, never retrofits a guard onto the generic tactical
//             exceptions-resolve path).
//             Pattern (the "P3-A retrofit precedent"): `structural-decision-governor.service.ts#commit`'s
//             own atomic-check-then-throw shape (design §6 of the P3-A design: "the wrap is mechanical...
//             the governor adds cap/counter/audit around it" — here, ONE read + a conditional throw, no
//             logic at the call site itself, mirrors `LIEUTENANT_ASSIGNED`'s own guard-then-throw shape at
//             `decommission.service.ts`).
//             — P3-F C6 — 2026-07-19
//
// `CategoryDelegationGuard` — the ONE-LINE seam every guard site calls: `assertNotDelegated(playerId,
// TaskCategoryKey.X)`. Reads the (player, category) `mastery_score` row; a `delegation_state` other than
// `SELF` (i.e. `DELEGATED`, or the dormant `RETIRED` — never produced by this lot, but a future-proof
// refusal is strictly safer than a narrower `=== 'DELEGATED'` check) throws `CATEGORY_DELEGATED` (409) with
// the lieutenant ref + the successor key — a pure STATE description (D12: no countdown, no window-end tick,
// no ETA). No row (the overwhelming common, pre-graduation case) defaults to `SELF` — the SAME `?? 'SELF'`
// convention `GraduationService.validateGraduationEligible`/`MetaProgressionProjectionService.projectRow`
// already use — so the guard is a genuine zero-cost no-op (one extra indexed read, no extra WRITE, no
// response-shape change) until the FIRST graduation ever commits for that (player, category) (design §17
// zero-regression contract).
//
// Window-ACTIVE (post-recall) note: recall (C8) flips `delegation_state` back to `SELF` — this guard reads
// that SAME column, so an ACTIVE unmanaged window is AUTOMATICALLY transparent to it (design §8.3: "the
// player CAN act, at degraded quality") with NO extra branch here — the guard's only input is the column
// C5/C8 already own.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { MasteryScoreRepository } from './mastery-score.repository';
import {
  TaskCategoryKey,
  taskCategoryCatalogueEntryFor,
  taskCategoryCatalogueEntryForCode,
} from './task-category-catalogue';

@Injectable()
export class CategoryDelegationGuard {
  constructor(private readonly masteryScoreRepo: MasteryScoreRepository) {}

  /**
   * Throws `ApiError('CATEGORY_DELEGATED')` iff the requesting player's `(playerId, categoryKey)`
   * `mastery_score` row is NOT `SELF`-managed. A silent resolve (no throw) is the overwhelming common case
   * — every guarded site calls this ONE line before its existing mutation, unchanged otherwise (the
   * one-line retrofit seam).
   */
  async assertNotDelegated(playerId: string, categoryKey: TaskCategoryKey): Promise<void> {
    const entry = taskCategoryCatalogueEntryFor(categoryKey);
    const row = await this.masteryScoreRepo.getRow(playerId, entry.code);
    const delegationState = row?.delegation_state ?? 'SELF';
    if (delegationState === 'SELF') {
      return;
    }

    const successorKey = entry.successorCode !== null ? taskCategoryCatalogueEntryForCode(entry.successorCode).key : null;
    throw new ApiError('CATEGORY_DELEGATED', {
      message: `category ${categoryKey} (code ${entry.code}) is ${delegationState} for this player — the direct surface is retired (design D6).`,
      payloadVars: {
        category_id: entry.code,
        category_key: categoryKey,
        delegated_lieutenant_ref: row?.delegated_to_lieutenant_id ?? null,
        successor_key: successorKey,
      },
    });
  }
}
