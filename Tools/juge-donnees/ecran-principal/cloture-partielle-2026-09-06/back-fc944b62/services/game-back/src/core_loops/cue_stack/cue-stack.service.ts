// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C2 (`CueStackService` —
//             compose/reorder/commit validation + orchestration + `GET current` buckets-only projection)
//             + §C8 ("projections joueur finales (stacks : statuts qualitatifs + EstimatedTimeBucket +
//             PrerequisiteSatisfactionBucket + DependencyConflictBucket) ... le C3 reviewer's MANDATORY
//             note: SlotOutcome.detail raw scalars ... MUST strip/bucket them from the player DTO").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §4.2 (slot shape) +
//             §4.3 (the 3 verbs) + §5.1 (compose-time target validation) + §6.1 (acyclic intra-stack
//             dependencies) + §15.1 (buckets-only payload, NEVER a raw scalar/cursor index/spine scalar) +
//             §16 (R2.2/P5 wall — the full forbidden-key list).
//             Decisions: §1.2 D2 (compose/reorder full-replace semantics).
//             — P3-D C2 — 2026-07-14 / C8 — 2026-07-15
//
// `CueStackService` — owns compose/reorder/commit VALIDATION (this file) atop `CueStackRepository`'s
// 0-TOCTOU persistence (that file). `GET current`'s response is buckets-only (plan §C2/§C8): NO
// `estimated_execution_time_minutes` (bucketed — `EstimatedTimeBucket`, C8), NO `executing_slot_index`/
// `executing_slot_started_minute`/`last_executed_game_minute`/`session_ref` (server-only bookkeeping,
// design §16/§4.1 — NEVER surfaced), NO raw spine scalar.
//
// ★ C8 — the FULL bucket projection lands here: `EstimatedTimeBucket` (`estimated-time-bucket.ts`, derived
// from the SAME per-type base duration C3's tick uses, `slot-duration.ts`) + `PrerequisiteSatisfactionBucket`/
// `DependencyConflictBucket` (`slot-dependency-bucket.ts`, one shared per-slot dependency classification).
// ★ C8 — the C3 reviewer's own MANDATORY note: `SlotOutcome.detail` (the executors' raw per-firing scalars —
// `cargoGrams`/`courierId`/`shiftId`/`questId`/`questType`/`emergency`/`costBand`/`resolvedCount`/
// `failedCount`/`totalCandidates`/`disruptedBy`/`buildingId`/`unsatisfiedDependencies`/`error`, each
// executor's OWN heterogeneous shape) rode `GET current`'s `outcome` field VERBATIM before this chunk — now
// STRIPPED to `{status}` only (the qualitative outcome KIND — e.g. `'dispatched'`/`'noop_empty_source'`/
// `'failed_collision'` — is itself a closed, descriptive vocabulary, never a raw scalar; `detail` is BO-only,
// unchanged in the DB column, exposed verbatim via the C8 admin surface instead, `cue-annealing-admin.
// controller.ts`).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { uuidField } from '../../common/param-pipes';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { SessionService } from '../../session/session.service';
import { coreLoopsTunables } from '../core-loops-tunables';
import { CueStackRepository } from './cue-stack.repository';
import { isKnownSlotType, isReservedSlotType, EXPECTED_TARGET_KIND, type LiveSlotType } from './slot-type.catalogue';
import type { CueStackSlot, SlotOutcome, TargetRef } from './slot-type-executor.interface';
// P3-D C7 — I7 (design §10.2) — the band derivation for the 409 `SETTLING_COMPOUND_REQUIRED` body (bands
// ONLY, never the raw `settlingEndsAt` the repository returns — R2.2/P5).
import { deriveSettlingBandBucket } from '../annealing/settling-band-bucket';
// P3-D C8 — the 3 player-facing bucket derivations (design §15.1).
import { durationMinutesFor } from './slot-duration';
import { deriveEstimatedTimeBucket, type EstimatedTimeBucket } from './estimated-time-bucket';
import {
  deriveDependencyBuckets,
  type DependencyConflictBucket,
  type DependencyLookupEntry,
  type PrerequisiteSatisfactionBucket,
} from './slot-dependency-bucket';

/** The raw, UNVALIDATED wire shape a compose/reorder request body carries per slot — everything is
 *  `unknown`-adjacent (`string`) until `validateAndNormalizeSlots` proves it. */
export interface RawSlotInput {
  slot_id?: unknown;
  slot_type?: unknown;
  target_ref?: unknown;
  dependencies?: unknown;
  drag_order?: unknown;
}

/** ONE slot's buckets-only player projection (design §15.1, C8) — `outcome` is `{status}` ONLY (C8's OWN
 *  `SlotOutcome.detail` strip, see file header); the 3 buckets are DERIVED, never a raw minute/graph/index. */
export interface CueStackSlotView {
  readonly slot_id: string;
  readonly slot_type: string;
  readonly target_ref: TargetRef;
  readonly dependencies: readonly string[];
  readonly drag_order: number;
  readonly status: string;
  readonly outcome: { status: string } | null;
  readonly estimated_time_bucket: EstimatedTimeBucket;
  readonly prerequisite_satisfaction_bucket: PrerequisiteSatisfactionBucket;
  readonly dependency_conflict_bucket: DependencyConflictBucket;
}

/** The buckets-only projection this chunk's `GET current` / compose / reorder response returns
 *  (design §15.1 — never a raw scalar/cursor/session_ref). */
export interface CueStackView {
  readonly cue_stack_id: string | null;
  readonly state: string | null;
  readonly committed_at: string | null;
  readonly slots: readonly CueStackSlotView[];
}

@Injectable()
export class CueStackService {
  constructor(
    private readonly repo: CueStackRepository,
    private readonly bus: CityEventBus,
    private readonly sessions: SessionService,
  ) {}

  /**
   * compose (design §4.3, D2) — validate the FULL 4-8 slot array, then ONE atomic UPSERT (I1 the
   * arbiter). 409 `CUE_STACK_ALREADY_ACTIVE` if the player's ONE non-terminal stack is already
   * committed/executing (compose is only ever available while pending-or-absent).
   */
  async compose(playerId: string, rawSlots: unknown): Promise<CueStackView> {
    const slots = await this.validateAndNormalizeSlots(playerId, rawSlots);
    const row = await this.repo.composeUpsert(playerId, JSON.stringify(slots));
    if (!row) {
      throw new ApiError('CUE_STACK_ALREADY_ACTIVE', {
        message: 'player already has a committed/executing cue stack — compose is unavailable until it resolves.',
      });
    }
    return this.toView(row);
  }

  /**
   * reorder (design §4.3, D2) — the SAME full-replace validation pipeline as compose (design: "le
   * serveur revalide" — every rule compose enforces applies again), but NEVER creates a row
   * (`WHERE state='pending'` only). 409 (generic state conflict) if no pending stack exists.
   */
  async reorder(playerId: string, rawSlots: unknown): Promise<CueStackView> {
    const slots = await this.validateAndNormalizeSlots(playerId, rawSlots);
    const row = await this.repo.reorderPending(playerId, JSON.stringify(slots));
    if (!row) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'no pending cue stack to reorder (never composed, or already committed/executing/resolved).',
      });
    }
    return this.toView(row);
  }

  /**
   * commit (design §4.3 verbatim, I2 + P3-D C7 I7) — `session_ref` from `SessionService.getActiveSession`
   * (REUSE, D9 zero-regression: sessionless commit still succeeds, `session_ref` stored `null`). 409
   * (generic state conflict — I2) on re-commit or when nothing is pending. 409 `SETTLING_COMPOUND_REQUIRED`
   * (I7, design §10.2) when ≥1 targeted building is actively settling and `acknowledgeCompounding` was not
   * sent — the body carries BANDS ONLY, never the raw `settlingEndsAt` the repository returns (R2.2/P5).
   * Emits `StackCommittedEvent` on the ONE winning commit only (never on either 409 branch — the
   * RETURNING itself gates the emit, `CueStackRepository#commitWithSettlingGuard`'s own header).
   */
  async commit(playerId: string, acknowledgeCompounding: boolean): Promise<CueStackView> {
    const activeSession = await this.sessions.getActiveSession(playerId);
    const sessionRef = activeSession?.gameplay_session_id ?? null;
    const result = await this.repo.commitWithSettlingGuard(
      playerId,
      sessionRef,
      acknowledgeCompounding,
      coreLoopsTunables.annealingCompoundingMultiplier,
      coreLoopsTunables.annealingCompoundingThroughputPenalty,
    );

    if (result.kind === 'no_pending') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'no pending cue stack to commit (already committed, or never composed).',
      });
    }
    if (result.kind === 'settling_guard_required') {
      throw new ApiError('SETTLING_COMPOUND_REQUIRED', {
        message:
          'committing this stack would compound settling on ≥ 1 building already settling — resend ' +
          'with acknowledge_compounding=true to proceed (it will apply the compounding exactly once).',
        details: {
          settling: result.settling.map((s) => ({
            building_ref: { kind: 'building', id: s.buildingId },
            band: deriveSettlingBandBucket(
              (s.settlingEndsAt.getTime() - Date.now()) / 60_000,
              coreLoopsTunables.annealingBandShortUpperMinutes,
              coreLoopsTunables.annealingBandMediumUpperMinutes,
            ),
          })),
        },
      });
    }

    const { row } = result;
    const gameMinute = await this.repo.getCurrentGameMinute(playerId);
    const slots = (row.slots as unknown as CueStackSlot[]) ?? [];
    this.bus.emitStackCommitted({
      type: 'stack_committed',
      playerId,
      cueStackId: row.cue_stack_id,
      sessionRef,
      slotCount: slots.length,
      gameMinute,
    });
    return this.toView(row);
  }

  /** GET current (design §15.1) — the player's ONE non-terminal stack, buckets-only. No current stack →
   *  the null-shaped `{cue_stack_id: null, state: null, committed_at: null, slots: []}`. */
  async getCurrent(playerId: string): Promise<CueStackView> {
    const row = await this.repo.findCurrent(playerId);
    if (!row) {
      return { cue_stack_id: null, state: null, committed_at: null, slots: [] };
    }
    return this.toView(row);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Validation pipeline (design §4.3/§5.1/§6.1) — shared by compose + reorder.
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  private async validateAndNormalizeSlots(playerId: string, rawSlots: unknown): Promise<CueStackSlot[]> {
    if (!Array.isArray(rawSlots)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'slots must be an array.' });
    }
    const max = coreLoopsTunables.cueStackDepthSlotsMax;
    if (rawSlots.length < 4 || rawSlots.length > max) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `slots must contain between 4 and ${max} entries (got ${rawSlots.length}).`,
      });
    }

    const normalized: CueStackSlot[] = [];
    const seenIds = new Set<string>();
    for (const raw of rawSlots as RawSlotInput[]) {
      // L0.3 (D5) — K feuille : slot_id (slots[].slot_id), uuid. Route through the shared helper
      // (details.param + uniform 422 shape) instead of the local `requireUuid` micro-validator,
      // which threw without `details.param`.
      const slotId = uuidField({ slot_id: raw.slot_id }, 'slot_id');
      if (seenIds.has(slotId)) {
        throw new ApiError('VALIDATION_FAILED', { message: `duplicate slot_id '${slotId}' within the same stack.` });
      }
      seenIds.add(slotId);

      const slotType = String(raw.slot_type ?? '');
      if (!isKnownSlotType(slotType)) {
        throw new ApiError('VALIDATION_FAILED', { message: `unknown slot_type '${slotType}'.` });
      }
      if (isReservedSlotType(slotType)) {
        throw new ApiError('SLOT_TYPE_RESERVED', {
          message: `slot_type '${slotType}' is reserved-inert (no live verb backs it yet) — not committable.`,
        });
      }

      const targetRef = this.requireTargetRef(raw.target_ref);
      const expectedKind = EXPECTED_TARGET_KIND[slotType as LiveSlotType];
      if (targetRef.kind !== expectedKind) {
        throw new ApiError('CUE_STACK_SLOT_TARGET_INVALID', {
          message: `slot_type '${slotType}' expects target_ref.kind='${expectedKind}' (got '${targetRef.kind}').`,
        });
      }

      const dependencies = this.requireStringArray(raw.dependencies, 'dependencies');
      const dragOrder = this.requireInteger(raw.drag_order, 'drag_order');

      normalized.push({
        slot_id: slotId,
        slot_type: slotType,
        target_ref: targetRef,
        dependencies,
        drag_order: dragOrder,
        status: 'pending',
        outcome: null,
      });
    }

    // Dependencies must reference slot_ids WITHIN this same stack (design §4.3 "référençant des slot_id
    // du stack") — a dangling reference is a malformed payload, distinct from a genuine cycle.
    for (const slot of normalized) {
      for (const dep of slot.dependencies) {
        if (!seenIds.has(dep)) {
          throw new ApiError('VALIDATION_FAILED', {
            message: `slot '${slot.slot_id}' depends on '${dep}', which is not a slot_id in this stack.`,
          });
        }
      }
    }

    // Acyclic (design §6.1 evaluates dependencies AT FIRING, but the GRAPH itself must be acyclic at
    // compose/reorder time — plan §C2 falsifiable "cyclic dep → 422"). Standard 3-color DFS.
    if (this.hasCycle(normalized)) {
      throw new ApiError('CUE_STACK_DEPENDENCY_CYCLE', {
        message: 'the dependencies graph contains a cycle.',
      });
    }

    // Target existence + ownership + actionability (design §5.1 "target_ref existant et actionnable" —
    // THIS chunk's stub validator, see cue-stack.repository.ts's own header for the C2/C3 split).
    for (const slot of normalized) {
      const ok = await this.validateTargetExists(playerId, slot.slot_type as LiveSlotType, slot.target_ref);
      if (!ok) {
        throw new ApiError('CUE_STACK_SLOT_TARGET_INVALID', {
          message: `slot '${slot.slot_id}' (${slot.slot_type}) target_ref ${JSON.stringify(slot.target_ref)} does not resolve to an existing, owned, actionable entity.`,
        });
      }
    }

    return normalized;
  }

  private async validateTargetExists(playerId: string, slotType: LiveSlotType, targetRef: TargetRef): Promise<boolean> {
    switch (slotType) {
      case 'DISTRIBUTION_RUN':
        return this.repo.routeExistsForPlayer(playerId, targetRef.id);
      case 'MAINTENANCE_BATCH':
        return this.repo.operationalBuildingExistsForPlayer(playerId, targetRef.id);
      case 'EXCEPTION_BATCH_RESOLUTION':
        return this.repo.buildingHasPendingExceptionBatch(playerId, targetRef.id);
      case 'RECRUITMENT_STEP':
        return this.repo.availableCandidateExistsForPlayer(playerId, targetRef.id);
    }
  }

  private hasCycle(slots: readonly CueStackSlot[]): boolean {
    const graph = new Map(slots.map((s) => [s.slot_id, s.dependencies]));
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>(slots.map((s) => [s.slot_id, WHITE]));

    const dfs = (id: string): boolean => {
      color.set(id, GRAY);
      for (const dep of graph.get(id) ?? []) {
        const depColor = color.get(dep);
        if (depColor === GRAY) return true;
        if (depColor === WHITE && dfs(dep)) return true;
      }
      color.set(id, BLACK);
      return false;
    };

    for (const s of slots) {
      if (color.get(s.slot_id) === WHITE && dfs(s.slot_id)) return true;
    }
    return false;
  }

  private toView(row: {
    cue_stack_id: string;
    state: string;
    committed_at: Date | string | null;
    slots: unknown;
  }): CueStackView {
    const slots = (row.slots as CueStackSlot[]) ?? [];
    // C8 — the shared dependency-classification lookup (`slot-dependency-bucket.ts`), built ONCE per stack
    // (never re-queried per slot/per-dependency).
    const slotsById = new Map<string, DependencyLookupEntry>(
      slots.map((s) => [s.slot_id, { status: s.status, drag_order: s.drag_order }]),
    );
    return {
      cue_stack_id: row.cue_stack_id,
      state: row.state,
      committed_at: row.committed_at ? new Date(row.committed_at).toISOString() : null,
      slots: slots.map((s) => {
        const buckets = deriveDependencyBuckets(s, slotsById);
        const rawOutcome = s.outcome as unknown as SlotOutcome | null;
        return {
          slot_id: s.slot_id,
          slot_type: s.slot_type,
          target_ref: s.target_ref,
          dependencies: s.dependencies,
          drag_order: s.drag_order,
          status: s.status,
          // C8 — the C3 reviewer's MANDATORY strip: `detail` (the executors' raw per-firing scalars) NEVER
          // reaches the player DTO — only the qualitative `status` KIND survives (file header).
          outcome: rawOutcome ? { status: rawOutcome.status } : null,
          estimated_time_bucket: deriveEstimatedTimeBucket(durationMinutesFor(s.slot_type as LiveSlotType)),
          prerequisite_satisfaction_bucket: buckets.prerequisiteSatisfactionBucket,
          dependency_conflict_bucket: buckets.dependencyConflictBucket,
        };
      }),
    };
  }

  // ─── payload micro-validators (no shared cross-file extraction — this codebase's own convention) ───

  private requireTargetRef(value: unknown): TargetRef {
    if (typeof value !== 'object' || value === null) {
      throw new ApiError('VALIDATION_FAILED', { message: 'target_ref must be an object {kind, id}.' });
    }
    const v = value as Record<string, unknown>;
    const kind = String(v.kind ?? '');
    if (!kind) {
      throw new ApiError('VALIDATION_FAILED', { message: 'target_ref.kind is required.' });
    }
    // L0.3 (D5) — K feuille : target_ref.id (slots[].target_ref.id), uuid. Previously only checked
    // non-empty (`String(v.id ?? '')`) — a garbage id reached `validateTargetExists`'s uuid-column
    // lookup unguarded (measured 500 pre-C1, one of the 6 sondes de forme valide). Field name
    // 'target_ref.id' matches the leaf's own dotted-path identity (M31 passe 3-bis naming).
    const id = uuidField({ 'target_ref.id': v.id }, 'target_ref.id');
    return { kind, id };
  }

  private requireStringArray(value: unknown, field: string): string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
      throw new ApiError('VALIDATION_FAILED', { message: `${field} must be an array of strings.` });
    }
    return value;
  }

  private requireInteger(value: unknown, field: string): number {
    const n = Number(value);
    if (!Number.isInteger(n)) {
      throw new ApiError('VALIDATION_FAILED', { message: `${field} must be an integer (got '${String(value)}').` });
    }
    return n;
  }
}
