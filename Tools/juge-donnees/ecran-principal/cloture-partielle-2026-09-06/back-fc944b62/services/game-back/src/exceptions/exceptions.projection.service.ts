// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-14-exception-queue-design.md §Projection (R2.2)
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to the client)
//             docs/tech/09_data_model/schema_queues_exceptions_cuestack.md §8 (the confidence/priority/severity BO
//             scalars are bucketed to qualitative bands — the raw scalars NEVER escape to the client)
//             -- session:2026-06-09 (Phase-14 T2 — R2.2 card projection) --
//
// `ExceptionsProjectionService` — the player-facing projection for an exception card. Maps the RAW persisted BO
// scalars (confidence [0..1] float, priority int, severity int) → closed qualitative BAND labels. The three raw
// scalars are the ONLY numbers on an ExceptionQueueRow that must not escape; this service is the ONLY mapper (R2.2).
//
// THE BANDS (closed qualitative domains — the only exception signals exposed):
//   confidence_band : tentative | likely | confident           (from the [0..1] float — ConfidenceBucket canon)
//   priority_band   : silent | watching | urgent | critical    (from the priority int 0..100 — PriorityBucket canon)
//   severity_band   : MILD | MODERATE | SEVERE                 (from the severity int 0..100 — SeverityEnum canon REUSE 08)
//
// CUT-POINTS [PROV-Y26Q2] — aligned to T.db.queues_exceptions_cuestack.{priority,severity,confidence}_bucket_thresholds
//   defaults (ch09 §12). Hot-reload wiring deferred (lot-3 — hardcoded defaults, tunable read TBD):
//   confidence: tentative < 0.4 ; likely [0.4 .. 0.7) ; confident ≥ 0.7.
//   priority  : silent < 20     ; watching [20 .. 50)  ; urgent [50 .. 80) ; critical ≥ 80.
//   severity  : MILD < 30       ; MODERATE [30 .. 70)  ; SEVERE ≥ 70.
//
// R2.2 RAW-LEAK GUARANTEE: ExceptionCardProjection contains ONLY band labels + text fields + the jsonb round-trip
// of CandidateActionView (which is player-facing text/DSL, not a raw BO scalar). The E2E no-leak scanner validates.

import { Injectable } from '@nestjs/common';

import type { ExceptionQueueRow } from '../db/schema/queues_exceptions_cuestack';
import type { I18nRef } from '../common/i18n-ref';
import { withMethod } from './method-by-action-id';

/** The closed set of resolution effect types — the dispatch key the ExceptionEffectRegistry maps to a handler (Phase-16
 *  extends the Phase-14 trio with the raid effects; 04f-A C5 ADDITIVELY extends it with the 4 equipment-failure repair
 *  options — REPAIR_IMMEDIATE/REPAIR_SLOW/DEFER_REPAIR/DEMOLISH_REPLACE, design §6). */
/**
 * Le domaine FERMÉ des méthodes de résolution, sous forme de VALEUR — `EffectType` en dérive, donc il
 * n'existe qu'UN producteur : ajouter un membre ici l'ajoute au type, et l'oublier ici le rend
 * inconnu au type. TD-451 : le contrôleur en a besoin à l'exécution (une union TS ne survit pas à la
 * compilation, et une liste réécrite à la main dériverait du type au premier ajout).
 */
export const RESOLVE_METHODS = [
  'ONE_TIME',
  'ESCALATE',
  'ADD_RULE',
  'REPAIR',
  'BRIBE',
  'LAY_LOW',
  'REPAIR_IMMEDIATE',
  'REPAIR_SLOW',
  'DEFER_REPAIR',
  'DEMOLISH_REPLACE',
] as const;

export type EffectType = (typeof RESOLVE_METHODS)[number];

/** A candidate action's resolution descriptor. ONE_TIME/ESCALATE/ADD_RULE carry only the type (ADD_RULE's rule text stays
 *  in the existing add_rule_dsl field). The raid effects + the 04f-A C5 equipment-failure repair effects pin the target
 *  building (an opaque handle — player-safe, like lieutenant_id). NO raw probability/cost/heat here — those are tunables
 *  the handler reads (R2.3). */
export type ExceptionEffect =
  | { type: 'ONE_TIME' }
  | { type: 'ESCALATE' }
  | { type: 'ADD_RULE' }
  | { type: 'REPAIR'; target_building_id: string }
  | { type: 'BRIBE'; target_building_id: string }
  | { type: 'LAY_LOW'; target_building_id: string }
  | { type: 'REPAIR_IMMEDIATE'; target_building_id: string }
  | { type: 'REPAIR_SLOW'; target_building_id: string }
  | { type: 'DEFER_REPAIR'; target_building_id: string }
  | { type: 'DEMOLISH_REPLACE'; target_building_id: string };

/** Confidence bucket — the [0..1] float as the canonical ConfidenceBucket (R2.2 — the raw float never escapes).
 *  REUSE exception_queue_spine.md §Glossary R6.1 + schema_queues_exceptions_cuestack.md §8.1 (T.confidence_bucket_thresholds). */
export type ConfidenceBucket = 'tentative' | 'likely' | 'confident';
/** Priority bucket — the BO int as a closed label (R2.2 — the raw int never escapes).
 *  REUSE exception_queue_spine.md §Glossary R6.1 + schema_queues_exceptions_cuestack.md §8.1 (T.priority_bucket_thresholds). */
export type PriorityBucket = 'silent' | 'watching' | 'urgent' | 'critical';
/** Severity enum — the BO int as a closed UPPERCASE label (R2.2 — the raw int never escapes).
 *  REUSE 08/global_conventions_core.md §Glossary SeverityEnum + schema_queues_exceptions_cuestack.md §8.1 (T.severity_bucket_thresholds). */
export type SeverityEnum = 'MILD' | 'MODERATE' | 'SEVERE';

/**
 * One candidate action the player can pick (the label + consequence are i18n-ready text; add_rule_dsl is the
 * player-readable DSL rule the lieutenant will learn if the player resolves via ADD_RULE with this candidate, or null
 * when the action is ONE_TIME/ESCALATE-only and cannot be taught as a script rule).
 */
export interface CandidateActionView {
  id: string;
  label: string;
  projected_consequence: string;
  /** The DSL rule ADD_RULE appends if this action is chosen, or null (not addable as a rule — ONE_TIME/ESCALATE only). */
  add_rule_dsl: string | null;
  /** The server-side resolution descriptor (Phase-16 — the registry dispatch params + the action-bound consistency
   *  guard). OPTIONAL: Phase-14 cards omit it (they dispatch purely on `method`); only the raid card stamps it. */
  effect?: ExceptionEffect;
  /** Lot 0 §1 D4 — the closed `EffectType` this candidate resolves to (`METHOD_BY_ACTION_ID`,
   *  `method-by-action-id.ts`, C2). Stamped at every one of the 53 producer sites (22 ids — the design's own
   *  M8 sweep pinned 21/52, undercounted by one const-indirected id, see `method-by-action-id.ts`'s own
   *  Deviation note) via `METHOD_BY_ACTION_ID.<id>`, NEVER a per-site literal; `projectCard` below back-fills
   *  it (via `withMethod`) for any row persisted before this field existed. REQUIRED (C2 removed the `?`
   *  C0 posed transitionally — contrôle positif `tsc`: removing a single site's stamp is a compile error). */
  method: EffectType;
  /** Lot 0 §1 D2 — the `label`'s i18n-safe sibling (frère `_i18n`). `?` TRANSITORY (C0 only): C4 removes
   *  the `?` once every producer stamps it. Nothing reads this field between C0 and C4. */
  label_i18n?: I18nRef;
  /** Lot 0 §1 D2 — the `projected_consequence`'s i18n-safe sibling (frère `_i18n`). `?` TRANSITORY (C0
   *  only): C4 removes the `?` once every producer stamps it. Nothing reads this field between C0 and C4. */
  projected_consequence_i18n?: I18nRef;
}

/**
 * The player-facing exception card (R2.2 — bands + text only, never the raw confidence/priority/severity scalars).
 * The candidate_actions/suggested_action are a transparent round-trip of the producer's CandidateActionView objects
 * stored in the jsonb columns (the producer controls their shape; the projection service casts and forwards them).
 *
 * Field keys `priority_band` / `severity_band` / `confidence_band` are the API surface (Q5-inchangées — lot-3).
 * The VALUE domains have been aligned to canon (lot-3 TD-072):
 *   priority_band  → PriorityBucket  (silent|watching|urgent|critical)
 *   severity_band  → SeverityEnum    (MILD|MODERATE|SEVERE)
 *   confidence_band→ ConfidenceBucket (tentative|likely|confident)
 */
export interface ExceptionCardProjection {
  exception_id: string;
  lieutenant_id: string | null;
  /**
   * C3 (D7, L0.5) — the named sibling of `lieutenant_id` above (additive — `lieutenant_id` stays,
   * unrenamed): `{id, name}`, the SAME shape `flag-discipline.service.ts:77` already establishes for a
   * player-facing lieutenant reference (REUSE, not reinvented). `null` for a player-level/citywide card
   * (`lieutenant_id === null`). The CALLER (`projectCard`'s 3 call sites) resolves `name` via
   * `LieutenantRepository.namesByIds` BEFORE calling `projectCard` and refuses the whole request
   * (`ApiError('RESOURCE_NOT_FOUND')`) if a referenced id comes back unresolved (D7: "un id étranger
   * devient une absence détectable et refusée") — by the time `projectCard` runs, every non-null
   * `lieutenant_id` it sees is GUARANTEED present in `names`.
   */
  lieutenant: { id: string; name: string } | null;
  event_descriptor: string;
  /** TD-452 — the `event_descriptor`'s i18n-safe sibling (frère `_i18n`, Lot 0 §1 D2, migration 0150,
   *  `queues_exceptions_cuestack.ts`'s `event_descriptor_i18n` column). A straight passe-plat of the
   *  persisted column: `null` for every row a producer has not yet stamped (the prose `event_descriptor`
   *  above is untouched either way — additive only, F1/R-EH-2 does not retro-fit legacy rows). */
  event_descriptor_i18n: I18nRef | null;
  candidate_actions: CandidateActionView[];
  /** `null` when the row's persisted `suggested_action` carries no `id` (D4, r1-C2/MAJOR-2 — a
   *  degenerate placeholder is NEVER fabricated a `method`; the DB column itself stays
   *  `NOT NULL DEFAULT '{}'`, `queues_exceptions_cuestack.ts:58`, so the empty-object shape is what
   *  production actually writes today, e.g. the REQUEST_PLAYER_INPUT sink
   *  `lieutenant-tick.service.ts:384` — TD-398). */
  suggested_action: CandidateActionView | null;
  confidence_band: ConfidenceBucket;
  priority_band: PriorityBucket;
  severity_band: SeverityEnum;
  resolution_status: 'pending' | 'resolved' | 'escalated' | 'aged_out';
  /**
   * P3-A C4 (design §5 "Confidence threshold") — present ONLY when the card's raw confidence is BELOW
   * `core_loops.exception_suggested_action_confidence_threshold` (a getter-resolved boundary, R2.3): the
   * canon "Below threshold → Escalate suggested" signal. ABSENT (never `null` — the key itself is
   * omitted, JSON.stringify drops `undefined`) at/above the threshold — R2.2: a qualitative sentinel,
   * never the raw confidence float. Composed by `ExceptionsService.listQueue` (the caller resolves the
   * threshold getter and the raw `row.confidence`; this stays a pure derived field like the bands above).
   */
  suggested_disposition?: 'ESCALATE';
  /**
   * P3-A C4 (design §5 "Script-complexity warning") — present ONLY on ADD_RULE-capable cards owned by a
   * lieutenant (a candidate or suggested action carries a non-null `add_rule_dsl`): the lieutenant's
   * compiled rule count vs `core_loops.exception_max_rules_per_lieutenant` (a getter-resolved boundary),
   * banded (R2.2 — the raw count NEVER escapes). **Warning only — NEVER blocks ADD_RULE** (composed by
   * `ExceptionsService.listQueue`, which reads the count via the existing `LieutenantRepository`
   * REUSE — no new query shape).
   */
  script_complexity_band?: ScriptComplexityBand;
}

/**
 * `QueuePressureBand` — P3-A C3 (D5, design §5): `normal | warning | saturated`, derived from the
 * player's PENDING count for a given (player, lieutenant) scope vs the cap/warn thresholds (bands
 * only — R2.2; the raw pending count never escapes to the client, BO sees raw counts).
 */
export type QueuePressureBand = 'normal' | 'warning' | 'saturated';

/**
 * `queuePressureBand` — PURE (no DB/IO), mirrors `projectCard`'s discipline. `pendingCount` is the
 * SAME count the cap guard reads (`ExceptionsRepository.countPendingForLieutenant`); `capThreshold` /
 * `warnThreshold` come from `coreLoopsTunables.exceptionQueueCapPerLieutenant` /
 * `.exceptionQueueWarnThresholdPerLieutenant` (R2.3 — no inline numbers here, the caller supplies the
 * getter-resolved thresholds). `saturated` at/above the cap; `warning` at/above the warn boundary;
 * `normal` otherwise.
 */
export function queuePressureBand(pendingCount: number, capThreshold: number, warnThreshold: number): QueuePressureBand {
  if (pendingCount >= capThreshold) return 'saturated';
  if (pendingCount >= warnThreshold) return 'warning';
  return 'normal';
}

/**
 * `backlogBadge` — PURE. `totalPendingCount` = the player's TOTAL pending count across every
 * lieutenant + the player-level (null-lieutenant) scope (canon "home screen" backlog signal — distinct
 * from the PER-lieutenant `queuePressureBand` above, design §5 "Backlog badge" paragraph). `threshold`
 * = `coreLoopsTunables.exceptionBacklogBadgeThreshold` (R2.3 — getter-resolved, not inline). Strictly
 * GREATER THAN the threshold (canon `exception_backlog_badge_threshold`, design §5 verbatim) — soft
 * pressure only, never a hard timer (D12).
 */
export function backlogBadge(totalPendingCount: number, threshold: number): boolean {
  return totalPendingCount > threshold;
}

/**
 * `ScriptComplexityBand` — P3-A C4 (design §5 "Script-complexity warning"): `ok | approaching | at_max`,
 * derived from a lieutenant's compiled rule count vs `core_loops.exception_max_rules_per_lieutenant`
 * (R2.2 — the raw count never escapes to the client). **Warning only — NEVER blocks ADD_RULE** (canon:
 * telegraph, Pillar 4; a hard block here would be a silent canon edit).
 */
export type ScriptComplexityBand = 'ok' | 'approaching' | 'at_max';

/**
 * `scriptComplexityBand` — PURE (no DB/IO), mirrors `queuePressureBand`'s discipline. `ruleCount` is the
 * lieutenant's compiled rule count (`behavior_script.rules.length`, read by the caller via the existing
 * `LieutenantRepository`); `maxRules` is `coreLoopsTunables.exceptionMaxRulesPerLieutenant` (R2.3 — no
 * inline numbers here). `at_max` at/above the cap; `approaching` at exactly one below it; `ok` otherwise.
 */
export function scriptComplexityBand(ruleCount: number, maxRules: number): ScriptComplexityBand {
  if (ruleCount >= maxRules) return 'at_max';
  if (ruleCount >= maxRules - 1) return 'approaching';
  return 'ok';
}

/**
 * `suggestedDisposition` — PURE. Below `threshold` (`core_loops.exception_suggested_action_confidence_threshold`,
 * R2.3 — the caller resolves the getter, never inlined here) → `'ESCALATE'` (canon "Below threshold →
 * Escalate suggested", design §5 "Confidence threshold"); at/above → `undefined` (the field is OMITTED
 * from the card projection — R2.2, never a raw confidence echo). Strictly LESS THAN (exclusive boundary:
 * a card AT the threshold is still the suggested action's own call, not an escalation override).
 */
export function suggestedDisposition(confidence: number, threshold: number): 'ESCALATE' | undefined {
  return confidence < threshold ? 'ESCALATE' : undefined;
}

@Injectable()
export class ExceptionsProjectionService {
  /**
   * Project one raw row to its band-only card. Pure — no DB/IO. The candidate_actions/suggested_action jsonb columns
   * are passed through as CandidateActionView VERBATIM (the producer stores them in that exact shape — a transparent
   * round-trip, this service's own file-header guarantee). The raw confidence, priority, and severity scalars are
   * consumed here and NEVER forwarded (R2.2).
   *
   * A producer-internal `source` tag (heat-pressure/backpressure/mycelial-stress/flag-exhaustion/route-collapse/
   * cue-cascade/degraded-category-pressure — every producer that stamps one) is NOT stripped here. `projectCard` is
   * the SHARED projection BOTH `ExceptionsService.listQueue`/`.listEscalations` (the direct `GET /v1/exceptions/
   * queue`/`GET /v1/exceptions/escalations`) AND `SessionOpenSequenceService.buildQueueView` (the session-open glance)
   * call — stripping here would strip on BOTH surfaces, breaking the ⊥-approved, merged-on-main "honest D9-wall
   * boundary" contract (P3-B C6, `flag_review_surface.spec.ts` test 10, REUSE precedent for every OTHER producer's
   * tag): the direct GET KEEPS the tag (no clean seam exists inside `src/exceptions/` to remove it — documented, not
   * silently inconsistent); the session-open queue view relocates it OUT via `SessionOpenSequenceService.
   * stripInternalSourceTag` (`session-open-sequence.service.ts`), a seam OUTSIDE this module. A P3-F C2 fix
   * (`5fc7ed61`) briefly added a `stripSource` strip HERE to silence the NEW `HEAT_PRESSURE` tag leaking through
   * `exception_queue.spec.ts`'s own no-leak scan (a citywide heat-pressure card's `source` reaching an allow-list
   * that had never needed to carry `source` before) — that fix was too broad (it stripped the tag on the direct GET
   * too, regressing the P3-B C6 contract for every OTHER producer). Reverted at the P3-F merge-gate (root-cause +
   * fix): the leak-scan allow-lists now classify `source` as the ratified, R2.2-compliant categorization key it is
   * (a BO-diagnostic label, never a raw scalar) — see `exception_queue.spec.ts`/`funnel_progression.spec.ts`'s own
   * `ALLOWED_CARD_KEYS`.
   *
   * The R6 resolve-hook (`MasteryAccumulatorService.onExceptionResolved`, via `ExceptionsService.resolve`) never
   * needed this projection anyway — it reads `row.candidate_actions` straight off the DB row, bypassing
   * `projectCard` entirely.
   */
  /**
   * C3 (D7, L0.5) — `names` is the {lieutenant_id → name} map the CALLER resolved (and size-checked)
   * BEFORE this call, via `LieutenantRepository.namesByIds` (player-scoped). Kept a PARAMETER, not a
   * repository call inside this PURE service (the file's own header: "Pure — no DB/IO" — this call is
   * batched ONCE per listing by the caller, never once per card).
   */
  projectCard(row: ExceptionQueueRow, names: ReadonlyMap<string, string>): ExceptionCardProjection {
    // Lot 0 §1 D4 (C2, r1-C2/MAJOR-1+MAJOR-2) — NEVER fabricate a `method`. The previous placeholder
    // (`row.suggested_action ?? { id: '', ..., method: 'ONE_TIME' }`) analyzed a branch the schema makes
    // UNREACHABLE (`suggested_action jsonb NOT NULL DEFAULT '{}'`, `queues_exceptions_cuestack.ts:58` — a
    // real row is never `null`/`undefined` here, at worst `{}`, which is truthy) while leaving the branch
    // production ACTUALLY writes unanalyzed: `lieutenant-tick.service.ts:384` (the REQUEST_PLAYER_INPUT
    // sink, TD-031) inserts `suggested_action: {}` — no `id`, no `label`, no `add_rule_dsl`. `withMethod`
    // cannot derive a real method for a candidate that was never offered, so a `suggested_action` with no
    // `id` is projected `null` (TD-398: the écrivain should eventually write a real SQL `null` once the
    // column is widened — out of L0.2's additive scope; `projection_unit.spec.ts` proves both the CURRENT
    // `{}` shape and a FUTURE literal `null` already project identically, so that migration would need no
    // change here).
    const rawSuggested = row.suggested_action as CandidateActionView | Record<string, never> | null | undefined;
    const suggestedAction =
      rawSuggested && (rawSuggested as CandidateActionView).id ? withMethod(rawSuggested as CandidateActionView) : null;
    return {
      exception_id: row.exception_id,
      lieutenant_id: row.lieutenant_id,
      // C3 (D7) — `names.get(...)!` is safe: the caller guaranteed every non-null `lieutenant_id` it
      // could ever pass here is already IN `names` (size-checked before this call — see the interface's
      // own comment above).
      lieutenant: row.lieutenant_id !== null ? { id: row.lieutenant_id, name: names.get(row.lieutenant_id)! } : null,
      event_descriptor: row.event_descriptor,
      // TD-452 — passe-plat de la colonne (`null` si le producteur ne l'a pas stampée).
      event_descriptor_i18n: row.event_descriptor_i18n ?? null,
      // `withMethod` back-fills `method` from `METHOD_BY_ACTION_ID` by `id`, the SAME path whether the row
      // predates this field (legacy) or was stamped fresh by its producer (même chemin legacy/frais): it
      // prefers an already-present value, deriving only when absent.
      candidate_actions: ((row.candidate_actions as CandidateActionView[]) ?? []).map(withMethod),
      suggested_action: suggestedAction,
      confidence_band: this.confidenceBand(row.confidence),
      priority_band: this.priorityBand(row.priority),
      severity_band: this.severityBand(row.severity),
      resolution_status: row.resolution_status,
    };
  }

  // ─────────────────────────────── BAND HELPERS ───────────────────────────────
  // Cut-points are PROVISIONAL [PROV-Y26Q2] — aligned to canon defaults (ch09 §12):
  //   T.db.queues_exceptions_cuestack.{confidence,priority,severity}_bucket_thresholds
  // Hot-reload tunable-read wiring is DEFERRED (post-lot-3). Hardcoded defaults == canon defaults.
  // Mirrors the shape of EconomyProjectionService.walletBand (a private named helper per dimension).

  /** confidence [0..1] → ConfidenceBucket. tentative < 0.4 ; likely [0.4 .. 0.7) ; confident ≥ 0.7.
   *  Aligned to T.db.queues_exceptions_cuestack.confidence_bucket_thresholds default {tentative:0.0, likely:0.4, confident:0.7}. */
  private confidenceBand(c: number): ConfidenceBucket {
    if (c >= 0.7) return 'confident';
    if (c >= 0.4) return 'likely';
    return 'tentative';
  }

  /** priority int → PriorityBucket. silent<20 ; watching[20,50) ; urgent[50,80) ; critical≥80.
   *  Aligned to T.db.queues_exceptions_cuestack.priority_bucket_thresholds default {silent:0, watching:20, urgent:50, critical:80}. */
  private priorityBand(p: number): PriorityBucket {
    if (p >= 80) return 'critical';
    if (p >= 50) return 'urgent';
    if (p >= 20) return 'watching';
    return 'silent';
  }

  /** severity int → SeverityEnum. MILD<30 ; MODERATE[30,70) ; SEVERE≥70.
   *  Aligned to T.db.queues_exceptions_cuestack.severity_bucket_thresholds default {MILD:0, MODERATE:30, SEVERE:70}. */
  private severityBand(s: number): SeverityEnum {
    if (s >= 70) return 'SEVERE';
    if (s >= 30) return 'MODERATE';
    return 'MILD';
  }
}
