// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C2 (compose validation —
//             "the executors' interface contract" the compose verb validates targets THROUGH) + §C3
//             ("SlotTypeExecutorRegistry (fermé, dup-throw boot)" — the CLOSED registry class itself).
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §4.2 (the slot shape
//             persisted in `slots` jsonb) + §5.1 (the `SlotTypeExecutor` interface, verbatim below) + §5.2
//             (`execute`'s firing-time contract — the tick, C3 only).
//
// ★ C2/C3 SPLIT (surfaced per the coder task's own note — design §5 spans two chunks):
//   - §5.1's `validateTarget(playerId, targetRef): Promise<boolean>` is called "au compose" — compose is
//     THIS chunk's own verb (§4.3). C2 THEREFORE needs the INTERFACE below to exist and needs REAL
//     target-existence validation to run at compose time (design: "target_ref existant et actionnable").
//   - §5.1's CLOSED "`SlotTypeExecutorRegistry` (fermé, dup-throw boot)" — the registry CLASS that owns
//     the 4 LIVE executors wired to their REAL verbs (`DistributionService.dispatch`,
//     `MaintenanceService.scheduleMaintenance`, `RecruitmentQuestService.startQuest`,
//     `ExceptionsService.resolve`) + the sequential tick/firing machinery (§5.2) — is explicitly plan
//     §C3's OWN heading ("C3 — Executor registry + tick d'exécution séquentiel"). Building that closed,
//     dup-throw-boot, DI-wired registry now would preempt C3's own scope.
//   - RESOLUTION (this chunk): the interface is defined HERE (the shared contract). `CueStackRepository`
//     (this module) implements the 4 LIVE types' `validateTarget` for REAL (genuine DB existence +
//     ownership checks — no fig-leaf) via its OWN methods (`routeExistsForPlayer`/
//     `operationalBuildingExistsForPlayer`/`buildingHasPendingExceptionBatch`/
//     `availableCandidateExistsForPlayer`, `cue-stack.repository.ts`), WITHOUT wrapping them in a
//     `SlotTypeExecutor`-shaped object or a closed registry yet (`execute()` has no meaning before C3's
//     tick exists — there is nothing to fire). [C3 ⊥ fix: this comment previously pointed at a
//     `slot-target-validation.service.ts` file that was never actually created — the C2 landed shape
//     above is the real one, corrected here.] C3 LIFTS this validation body verbatim into its own 4
//     `SlotTypeExecutor`-conforming classes (wired to the real verbs, closed dup-throw registry,
//     `slot-type-executor.registry.ts`) — each executor's `validateTarget` DELEGATES to the SAME
//     `CueStackRepository` method `CueStackService.validateTargetExists` already calls, so compose-time
//     and firing-time target validation share ONE implementation (never two).

/** The closed 7-member `SlotType` domain (design §5.1) — ZERO pgEnum (D1): the domain is fenced by this
 *  TS union + the runtime catalogue (`slot-type.catalogue.ts`), not a DB enum (ch09's own
 *  "event_descriptor non-contraint" precedent). 4 LIVE + 3 RESERVED-INERT. */
export type SlotType =
  | 'DISTRIBUTION_RUN'
  | 'MAINTENANCE_BATCH'
  | 'RECRUITMENT_STEP'
  | 'EXCEPTION_BATCH_RESOLUTION'
  | 'STASH_CONSOLIDATION'
  | 'INSPECTION_RESPONSE'
  | 'LAUNDERING_INJECTION';

/** A slot's target reference (design §4.2) — `kind` discriminates which entity `id` points at
 *  (building|route|candidate — the "batch" kind is a building scope, per `EXCEPTION_BATCH_RESOLUTION`'s
 *  own reuse of `hasPendingForBuilding`'s building-scoped shape, decisions §0 row 6). */
export interface TargetRef {
  readonly kind: string;
  readonly id: string;
}

/** A slot's qualitative execution status (design §4.2) — lives IN the `slots` jsonb, never a DB column
 *  (DD-SLOT-JSONB). `'pending'` is the ONLY status a slot can carry before C3's tick ever runs. */
export type CueStackSlotStatus =
  | 'pending'
  | 'executing'
  | 'done'
  | 'failed_collision'
  | 'failed_disrupted'
  | 'failed_executor';

/** One slot, exactly the design §4.2 shape (the jsonb array element). `outcome` is always `null` until
 *  C3's tick fires a slot for the first time — C2 never sets it to anything else. */
export interface CueStackSlot {
  readonly slot_id: string;
  readonly slot_type: SlotType;
  readonly target_ref: TargetRef;
  readonly dependencies: readonly string[];
  readonly drag_order: number;
  readonly status: CueStackSlotStatus;
  readonly outcome: Record<string, unknown> | null;
}

/** The firing-time outcome shape (design §5.2/§5.1's own `execute` return) — BO-readable, never
 *  interpreted by C2 (no `execute()` is ever called this chunk). Minimal placeholder; C3 owns refining it. */
export interface SlotOutcome {
  readonly status: string;
  readonly detail?: Record<string, unknown>;
}

/** The firing-time execution context (design §5.2) — the tick's own gameMinute + whatever else C3's
 *  sequential executor needs. Minimal placeholder; C3 owns refining it (never consumed in C2). */
export interface SlotExecutionContext {
  readonly gameMinute: number;
}

/**
 * `SlotTypeExecutor` (design §5.1, VERBATIM shape) — one executor per LIVE `SlotType`. `validateTarget`
 * is THIS chunk's own concern (called at compose, §4.3); `execute` is C3's (called at firing, §5.2) — see
 * the file header's C2/C3 split note. No `SlotTypeExecutorRegistry` (the closed, dup-throw-boot class) is
 * built in this chunk — that is plan §C3's own heading.
 */
export interface SlotTypeExecutor {
  readonly slotType: SlotType;
  validateTarget(playerId: string, targetRef: TargetRef): Promise<boolean>;
  execute(playerId: string, slot: CueStackSlot, ctx: SlotExecutionContext): Promise<SlotOutcome>;
}
