// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C3 ("Player projection +
//             R2.2 wall (mastery surfaces)" — `GET /v1/meta/task-categories` per design §11: bucket
//             derivation ELIGIBLE-first, `progress_band` coarse thirds; R2.2 — player-facing payload NEVER
//             exposes raw internals).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §11 (the
//             org-overview contract, VERBATIM field list) + §0(a) (buckets) + §6 (the 4 LIVE categories +
//             their successors) + §9/§10 (successor SUSPENDED overlay / recovery / fallback quality —
//             fields whose real writer chunks (C5/C7/C8) have not landed yet, see below).
//             Pattern (band projection, "never lazy-seed" reads): `LieutenantProjectionService.
//             lieutenantBands` (the DIRECT sibling — maps raw persisted fields to a closed-domain band
//             surface, never forwards a raw scalar) + `rosterRows` (the list-projection shape: iterate a
//             closed set, map each to its band row, ONE query per data source, no lazy row creation).
//             — P3-F C3 — 2026-07-18
//
// `MetaProgressionProjectionService` — the player-facing "org overview" projection (R2.2 inverted): maps
// the 4 LIVE `TASK_CATEGORY_CATALOGUE` rows to their `TaskCategoryProjectionRow` (design §11), reading
// `mastery_score` (ACTIVE since C2) + `promotion_locks` / `player_proficiency` / `graduation_events`
// (schema-live since C1, but with NO production writer until C5/C7/C8 — see each repo method's own header).
// A pure read — NEVER lazy-seeds any row (mirrors the lieutenant projection's autonomy/signal-drift/
// standing-order "never lazy-seed" discipline): a player with zero `mastery_score` rows still projects all
// 4 LIVE categories at their honest zero-state defaults (NASCENT / LOW / SELF / no successor / not
// recovering / no fallback / no scar) — the catalogue, not the player's row history, is what is closed and
// enumerable.
//
// R2.2 SURFACE (design §11's own forbidden list — the ALLOWED_KEYS leak-scan spec is this service's wall):
// NEVER `mastery_score` raw, NEVER `player_proficiency` raw, NEVER `recall_debt_total`, NEVER `effective_
// proficiency`, NEVER `window_start_tick`/`window_end_tick` raw, NEVER a multiplier/tunable value, NEVER an
// `impact` float. Every field this service returns is either a closed-domain string (`mastery_bucket`,
// `progress_band`, `delegation_state`, `fallback_quality_bucket`), an opaque id reference
// (`delegated_lieutenant_ref`, mirrors `RosterRow.lieutenant_id`'s own "an id is a handle, not a leak"
// precedent — TD-530 (2026-09-03) added `category_id` to this SAME class: an opaque catalogue CODE, not
// a raw score/debt/tick, already classed off the §11 forbidden list by `r22_leak_sweep.spec.ts`'s own
// graduation/recall-response sweep), or a closed-domain boolean (`recovery`, `successor.suspended`,
// `recall_scar` — the SAME class of intentional closed-domain bool `LieutenantBands.standing_order.
// promotion_suggested` already establishes: a yes/no FLAG, never a raw counter/tick/score).

import { Injectable } from '@nestjs/common';

import { TASK_CATEGORY_CATALOGUE, taskCategoryCatalogueEntryForCode } from './task-category-catalogue';
import { metaProgressionTunables } from './meta-progression-tunables';
import { deriveMasteryBucket, progressBandForMasteryBucket, type MasteryBucket, type ProgressBand } from './mastery-bucket';
import { MasteryScoreRepository } from './mastery-score.repository';
import { PromotionLocksRepository } from './promotion-locks.repository';
import { PlayerProficiencyRepository } from './player-proficiency.repository';
import { GraduationEventsRepository } from './graduation-events.repository';

/** The `successor` sub-object (design §11) — `substrate` is ALWAYS `'PENDING'` today: every catalogued
 *  `successorCode` is a RESERVED row (design §15, P3-G..K unlock their verbs) — no successor domain has any
 *  OTHER substrate state to be in yet. Present ONLY on a non-SELF row (§ below). */
export interface TaskCategorySuccessorProjection {
  readonly key: string;
  readonly substrate: 'PENDING';
  readonly suspended: boolean;
}

/** One projected row of `GET /v1/meta/task-categories` (design §11 field list, verbatim). Optional fields
 *  are OMITTED (not `null`) when not applicable — the wire JSON drops an `undefined` TS field, so the
 *  ALLOWED_KEYS leak-scan sees exactly the design's `field?` contract per row shape. */
export interface TaskCategoryProjectionRow {
  readonly category_key: string;
  // TD-530 (maillon 1, chantier "les maillons back des écrans neufs", 2026-09-03) — ADDITIF. `POST
  // /v1/meta/graduation` (:129), `POST /v1/meta/recall` (:166) et `GET /v1/meta/recall-preview/
  // :categoryId` (`@Param('categoryId', IntParam)`) exigent tous les trois le CODE numérique de la
  // catégorie (`TASK_CATEGORY_CATALOGUE.code`) — jamais `category_key` — et cette projection ne le
  // servait pas : un client qui ne lit QUE `GET /v1/meta/task-categories` ne pouvait nommer aucune de
  // ces trois routes. `category_id` est un id/code opaque (mirror `delegated_lieutenant_ref`/
  // `RosterRow.lieutenant_id` — "an id is a handle, not a leak"), PAS un raw score/debt/tick — déjà
  // classé hors de la liste interdite §11 par `r22_leak_sweep.spec.ts`'s own graduation/recall-response
  // sweep ("category_id is an opaque catalogue code — NOT on the §11 forbidden list").
  readonly category_id: number;
  readonly mastery_bucket: MasteryBucket;
  readonly progress_band: ProgressBand;
  readonly delegation_state: string;
  readonly delegated_lieutenant_ref?: string;
  readonly successor?: TaskCategorySuccessorProjection;
  readonly recovery: boolean;
  readonly fallback_quality_bucket?: string;
  readonly recall_scar: boolean;
}

/** P3-F C6 (design D6: "delegated categories drop out of the actionable list into a `delegated` section")
 *  — an ADDITIVE derived summary, one row per category whose `delegation_state !== 'SELF'`. This is NEVER a
 *  removal from `task_categories` (C3's own already-⊥-approved contract keeps EVERY LIVE category there
 *  ALWAYS, byte-shape untouched — `task_category_projection.spec.ts` test (5) asserts a DELEGATED row
 *  stays in `task_categories`): `delegated` is a NEW top-level SIBLING field alongside it, mirroring the
 *  established additive-sibling-field precedent (`exceptions.controller.ts#queue`'s own `queue_pressure_
 *  band`/`backlog_badge` riding alongside the byte-untouched `exceptions` array). A non-delegated player
 *  sees `delegated: []` (zero-regression by data, design §17). Reuses fields `projectRow` already computed
 *  — zero extra DB reads. */
export interface DelegatedCategorySummary {
  readonly category_key: string;
  readonly delegated_lieutenant_ref: string;
  readonly successor?: TaskCategorySuccessorProjection;
}

/** Pure derivation over an already-projected row set (see `DelegatedCategorySummary`'s own header). The
 *  non-null assertion on `delegated_lieutenant_ref` is safe BY CONSTRUCTION: `projectRow` below only
 *  leaves it `undefined` when `delegationState === 'SELF'` — the exact rows this filter excludes. */
export function deriveDelegatedSummaries(rows: readonly TaskCategoryProjectionRow[]): DelegatedCategorySummary[] {
  return rows
    .filter((row) => row.delegation_state !== 'SELF')
    .map((row) => ({
      category_key: row.category_key,
      delegated_lieutenant_ref: row.delegated_lieutenant_ref!,
      successor: row.successor,
    }));
}

@Injectable()
export class MetaProgressionProjectionService {
  constructor(
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly promotionLocksRepo: PromotionLocksRepository,
    private readonly playerProficiencyRepo: PlayerProficiencyRepository,
    private readonly graduationEventsRepo: GraduationEventsRepository,
  ) {}

  /**
   * Project the requesting player's ENTIRE task-category org overview (design §11; `GET /v1/meta/
   * task-categories`). Iterates the catalogue's 4 LIVE rows in catalogue order (deterministic — RESERVED
   * rows are never player-facing, design §0: no player verb exists in a RESERVED category, so there is
   * nothing to project). A player with NO `mastery_score` row for a category still gets a full row at its
   * honest zero-state defaults (never an empty/sparse response — the catalogue is the closed, enumerable
   * set, design §6).
   */
  async taskCategoryProjection(playerId: string): Promise<TaskCategoryProjectionRow[]> {
    const liveEntries = TASK_CATEGORY_CATALOGUE.filter((e) => e.live);
    return Promise.all(liveEntries.map((entry) => this.projectRow(playerId, entry.code, entry.key, entry.successorCode)));
  }

  private async projectRow(
    playerId: string,
    categoryCode: number,
    categoryKey: string,
    successorCode: number | null,
  ): Promise<TaskCategoryProjectionRow> {
    const masteryRow = await this.masteryScoreRepo.getRow(playerId, categoryCode);
    const rawScore = masteryRow?.mastery_score ?? 0;
    const delegationState = masteryRow?.delegation_state ?? 'SELF';

    const threshold = metaProgressionTunables.masteryRetirementThreshold; // hot-reloaded getter — DB-override > env > default.
    const bucket = deriveMasteryBucket(rawScore, threshold);
    const progressBand = progressBandForMasteryBucket(bucket);

    let delegatedLieutenantRef: string | undefined;
    let successor: TaskCategorySuccessorProjection | undefined;
    // P3-F C8 addendum (design §9.1 step 5 / §9.2 — LOUD, additive widening of this already-⊥-approved C3
    // condition): a recall flips `delegation_state` back to `SELF` but KEEPS `graduated_at` (the scar —
    // "a recalled category is visibly re-graduatable-with-history"). The successor a category unlocks at
    // graduation is a PERMANENT org-state fact (§8.4: "so it EXISTS as org state") — it must stay visible
    // (and reflect its OWN `suspended` overlay while the recall's window is ACTIVE, §9.2's "successor
    // projection carries SUSPENDED") through a recall, not disappear the instant the row reverts to SELF.
    // `everGraduated` (`graduated_at !== null`) is the ADDITIVE OR-branch: the pre-existing `delegationState
    // !== 'SELF'` condition (currently-DELEGATED) is UNCHANGED and still the common path pre-C8; this only
    // WIDENS visibility to a category that has EVER graduated, never narrows it. Zero regression to C3's own
    // floor: no pre-C8 fixture can set `graduated_at` on a SELF row (only C8's `flipToSelfForRecall` does,
    // and it never nulls the column — see that method's own header).
    const everGraduated = masteryRow?.graduated_at != null;
    if (delegationState !== 'SELF' || everGraduated) {
      delegatedLieutenantRef = masteryRow?.delegated_to_lieutenant_id ?? undefined;
      if (successorCode !== null) {
        const successorEntry = taskCategoryCatalogueEntryForCode(successorCode);
        const suspended = await this.promotionLocksRepo.hasActiveSuspensionForCategory(playerId, successorCode);
        successor = { key: successorEntry.key, substrate: 'PENDING', suspended };
      }
    }

    const activeLock = await this.promotionLocksRepo.findActiveForCategory(playerId, categoryCode);
    const fallbackQualityBucket = activeLock?.fallback_quality_bucket ?? undefined;

    const proficiencyRow = await this.playerProficiencyRepo.getRow(playerId, categoryCode);
    const recovery = (proficiencyRow?.recovery_period_remaining ?? 0) > 0;

    const recallScar = await this.graduationEventsRepo.hasRecallEvent(playerId, categoryCode);

    return {
      category_key: categoryKey,
      // TD-530 — categoryCode IS the same TASK_CATEGORY_CATALOGUE.code the caller already resolved
      // (taskCategoryProjection's own `liveEntries.map((entry) => this.projectRow(playerId, entry.code, …))`,
      // never re-derived).
      category_id: categoryCode,
      mastery_bucket: bucket,
      progress_band: progressBand,
      delegation_state: delegationState,
      delegated_lieutenant_ref: delegatedLieutenantRef,
      successor,
      recovery,
      fallback_quality_bucket: fallbackQualityBucket,
      recall_scar: recallScar,
    };
  }
}
