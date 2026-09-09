// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Composite LieutenantArchetype (the 6
//             canonical archetypes — the binding self-declares which one it serves) +
//             docs/superpowers/specs/2026-06-08-phase-07-lieutenant-archetypes-design.md §Architecture (the
//             ArchetypeBinding interface + the DI registry the tick + recruit dispatch through, generalizing the Phase-6
//             COOK hardcode)
//             -- session:2026-06-08 (Phase 7 vector #7 lieutenant archetypes — Task 1, the binding seam generalization) --
//
// The `ArchetypeBinding` CONTRACT — the per-archetype adapter seam the lieutenant delegation tick + recruit dispatch
// through. Phase-6 hardcoded the COOK binding into the tick + the recruit; Phase-7 GENERALIZES that seam: every archetype
// (COOK, SECURITY, BOOKKEEPER, LOGISTICS — all 4 shipped) ships an `ArchetypeBinding` implementation, and the tick + recruit
// resolve the right binding by `role_archetype` through the `BindingRegistry` (assembled from all binding services by a
// `useFactory` provider in `lieutenant.module.ts`). The DSL engine (`src/dsl/`) stays archetype-agnostic; the binding is the
// ONLY archetype-specific code (the SAME boundary `cook-binding.ts` established — this file just lifts its shape to an interface).
//
// THE THREE METHODS every binding implements:
//   - `buildSnapshot(playerId, lt)` — resolve THIS archetype's signals from real game state into the `SignalSnapshot` the
//     executor reads (the binding↔executor contract; absent-not-undefined per signals.ts).
//   - `applyExecuteDefault(playerId, lt)` — map the archetype's resolved `EXECUTE_DEFAULT` token to its real action (the
//     COOK restart / the SECURITY repair / the BOOKKEEPER deposit / the LOGISTICS dispatch). Benign expected 409s are a
//     caught logged no-op inside the binding; a genuine fault propagates to the tick's per-lieutenant try/catch.
//   - `validateAssignment(playerId, assignedBuildingId, targetBuildingId)` — the RECRUIT-time assignment gate for THIS
//     archetype (a COOK assigns to a lab; a BOOKKEEPER to a money_holding; a LOGISTICS requires a target; …). Throws an
//     `ApiError` (404 not-owned / 409 wrong-type / 422 missing-required) on an invalid assignment for the archetype.
//
// WIRING (lieutenant.module.ts): each binding is a normal `@Injectable()` provider; the `BindingRegistry` is assembled by a
// `useFactory` that injects every binding service and passes them as an `ArchetypeBinding[]`. (NestJS 10.4.x has NO
// multi-provider support — a `multi: true` token is silently ignored — so the array is assembled explicitly by that
// factory; adding an archetype is one line in its `inject` list.)

import type { SignalSnapshot } from '../../dsl/signals';
import type { LieutenantArchetype } from './lieutenant-archetype';
import type { EffectType } from '../../exceptions/exceptions.projection.service';
import type { I18nRef } from '../../common/i18n-ref';

/** One candidate action on a salient card (the same shape exceptions' CandidateActionView uses, defined
 *  HERE — rather than imported from `exceptions.projection.service.ts` — so the binding→bus payload does
 *  not depend AT EXECUTION on the `exceptions/` module (r2/m6 — the first draft of this sentence claimed
 *  this as a present-tense property of the file, contradicted by the very next sentence; TYPE-ONLY
 *  imports below DO create a compile-time dependency, `import type` just erases it before runtime); the
 *  exceptions producer casts it. `effect` is omitted (these are the legacy ADD_RULE/ONE_TIME methods, no
 *  descriptor needed). ⚠️ r1 m3 — this interface is no longer standalone: Lot 0 C0 (D2/D4) adds
 *  `method`/`label_i18n`/`projected_consequence_i18n`, TYPE-ONLY imports from
 *  `exceptions.projection.service.ts` and `common/i18n-ref.ts` below (no RUNTIME coupling — `import type`
 *  is erased — but the shape itself is no longer self-contained the way this comment used to claim). */
export interface SalientCandidateAction {
  id: string;
  label: string;
  projected_consequence: string;
  add_rule_dsl: string | null;
  /** Lot 0 §1 D4 — the closed `EffectType` this candidate resolves to (`METHOD_BY_ACTION_ID`,
   *  `exceptions/method-by-action-id.ts`, C2). Stamped on all 16 sites across the 5 bindings via
   *  `METHOD_BY_ACTION_ID.<id>` (NEVER a per-site literal) — REQUIRED (C2 removed the transitory `?` C0
   *  posed; contrôle positif `tsc`). `ExceptionsProjectionService.projectCard`'s `withMethod` back-fills it
   *  on read for any card persisted before this field existed (same jsonb column, same table, both
   *  hierarchies). */
  method: EffectType;
  /** Lot 0 §1 D2 — the `label`'s i18n-safe sibling (frère `_i18n`). `?` TRANSITORY (C0 only): C4 removes
   *  the `?` once every binding stamps it. Nothing reads this field between C0 and C4. */
  label_i18n?: I18nRef;
  /** Lot 0 §1 D2 — the `projected_consequence`'s i18n-safe sibling (frère `_i18n`). `?` TRANSITORY (C0
   *  only): C4 removes the `?` once every binding stamps it. Nothing reads this field between C0 and C4. */
  projected_consequence_i18n?: I18nRef;
}

/** The full card content a salient signal raises (the producer inserts it verbatim). */
export interface SalientCardContent {
  event_descriptor: string;
  candidate_actions: SalientCandidateAction[];
  suggested_action: SalientCandidateAction;
  confidence: number;
  severity: number;
  priority: number;
}

/** A binding's declaration of one salient signal: how to detect it (isSalient over the snapshot), the DSL field+kind for
 *  the coverage check, and the card to raise (incl. the baked ADD_RULE rule). The tick raises a card when isSalient holds
 *  AND the script has no rule covering (kind, signal). */
export interface SalientSignalSpec {
  signal: string;
  kind: 'STATE' | 'EVENT';
  isSalient(snapshot: SignalSnapshot): boolean;
  card: SalientCardContent;
}

/**
 * The delegated-lieutenant row the tick + recruit pass to a binding — exactly the fields a binding (any archetype) may
 * consult, nothing more. The tick selects the player's delegated valid-script lieutenants (listDelegatedForPlayer) and
 * passes each as this row; recruit synthesizes the same shape for the validateAssignment call. SUPERSEDES the Phase-6
 * `CookDelegationLieutenant` (which `cook-binding.ts` now type-aliases to this — a binding reading only a subset of these
 * fields still satisfies the interface; e.g. the COOK binding reads only `assigned_building_id`).
 *
 *   - `lieutenant_id`        — for logging (a binding never re-resolves ownership by it; the tick already did).
 *   - `assigned_building_id` — the delegated building (the source/host the binding acts on); null defensively (the binding
 *                              guards a null → an empty snapshot / a benign no-op apply, never a crash).
 *   - `target_building_id`   — the LOGISTICS dispatch DESTINATION (T0's column); null for COOK/SECURITY/BOOKKEEPER.
 *   - `role_archetype`       — the archetype the tick derived from role_id (archetypeForRoleId) to pick the binding.
 *   - `delegation_paused`    — the LAST resolution's PAUSE state (the TICK applies this — the write-on-transition — not the
 *                              binding; carried here so the row is the single tick-input shape).
 *   - `tenure_score`         — the delegated lieutenant's BO-only uninterrupted-occupancy STREAK (Phase-11). The COOK
 *                              binding reads it to derive the tenure efficiency-bonus yield multiplier captured at startCook
 *                              (Phase-11b C1 — bucketForStreak → effectsForBucket → yieldMultiplier); other archetypes
 *                              ignore it. The bucket is DERIVED from this streak, never persisted (canon Invariant 4).
 *   - `rules`               — the stored compiled IR (the `{ rules: Rule[] }` CompiledScript the executor consumes); typed
 *                              `unknown` here so the interface does not depend on the DSL IR module (the tick casts it).
 */
export interface DelegationLieutenant {
  lieutenant_id: string;
  assigned_building_id: string | null;
  target_building_id: string | null;
  role_archetype: LieutenantArchetype;
  delegation_paused: boolean;
  tenure_score: number;
  rules: unknown;
}

/**
 * The per-archetype adapter the delegation tick + recruit dispatch through (the generalization of the Phase-6 COOK
 * binding). `CookBindingService` and the T2–T4 bindings implement it; the `BindingRegistry` resolves the right one by
 * `archetype`. The engine stays archetype-agnostic — this is the ONLY archetype-specific surface.
 */
export interface ArchetypeBinding {
  /** The archetype this binding serves — its registry key (the registry throws on a duplicate at boot). */
  readonly archetype: LieutenantArchetype;

  /**
   * BUILD the per-tick signal snapshot for a delegated lieutenant of this archetype from REAL game state (the binding
   * fills the snapshot the executor reads). Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is
   * OMITTED (never set to undefined) so the executor treats it as a non-matching trigger. NO mutation — pure reads.
   */
  buildSnapshot(playerId: string, lt: DelegationLieutenant): Promise<SignalSnapshot>;

  /**
   * APPLY this archetype's `EXECUTE_DEFAULT` (map the resolved token to the archetype's real side-effect; the executor
   * never acts itself). A BENIGN expected conflict (e.g. RESOURCE_STATE_CONFLICT — already busy / nothing to do) is
   * caught + logged as a no-op INSIDE the binding; any OTHER fault PROPAGATES to the tick's per-lieutenant try/catch.
   * Returns `'TAKEN'` when the operational call succeeded (a real side-effect was committed), `'NOOP'` for every
   * early-exit path (null building, benign-409, amount≤0, etc.) — so the tick (T4 and later) can gate budget
   * decrements only on a *taken* action.
   *
   * `gameMinute` is the tick's own clock (`LieutenantTickService.applyForLieutenant`'s `now`, already MINUTE-order
   * in scope at the tick's single call site) — REQUIRED, never optional/defaulted (W6.1 C7, design §8.1 #3): a
   * default here would silently reproduce the exact bug this parameter closes. Only the MUSCLE binding consumes it
   * (threaded into `CombatService.requestAssault`'s `created_at_minute`, load-bearing for C2's resolution ORDER and
   * C4's projection `orderBy`); the other 8 archetypes declare it `_gameMinute` per the house convention
   * `validateAssignment` already sets (full arity, unused params `_`-prefixed) — never a shorter override.
   */
  applyExecuteDefault(playerId: string, lt: DelegationLieutenant, gameMinute: number): Promise<'TAKEN' | 'NOOP'>;

  /**
   * The RECRUIT-time assignment gate for this archetype: validate `assignedBuildingId` (and, where the archetype needs it,
   * `targetBuildingId`) is a valid assignment for THIS archetype. Throws an `ApiError` — 404 (not the player's / not
   * operational), 409 (wrong building type for the archetype), or 422 (a required field, e.g. LOGISTICS's target, missing)
   * — on an invalid assignment. Returns void on success (recruit then persists). NO mutation — a pure validation read.
   */
  validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    targetBuildingId: string | null,
  ): Promise<void>;

  /**
   * The archetype's SALIENT-SIGNAL manifest (Phase-17): the signals that, when present + uncovered by the lieutenant's
   * script, raise a teachable Exception card. OPTIONAL — an archetype with no salient signals omits it (the tick treats
   * absent as []). The tick reads this per delegated lieutenant, checks isSalient(snapshot) && !scriptCoversSignal(ir,
   * kind, signal), and emits the spec's card.
   */
  salientSignals?(): SalientSignalSpec[];
}
