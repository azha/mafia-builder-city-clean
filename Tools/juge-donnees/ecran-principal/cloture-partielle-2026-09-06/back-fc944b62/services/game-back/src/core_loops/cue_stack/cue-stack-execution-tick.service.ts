// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 (`CUE_STACK_EXECUTE`
//             M/29 provisional — promotion, sequential cursor, per-type durations, firing → executor.
//             execute → statut+outcome jsonb single-statement, SlotExecutedEvent/SlotFailedEvent, failed_
//             executor on throw with cursor-advance (D4), last slot → resolved) + §C4 (dependency-eval-at-
//             firing EXTENDED with the cascade producer call; §6.3 recovery ×1.5 + auto-ack; the "already
//             resolved out-of-band" skip branch §7's disruption service needs).
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.2 (the tick's own
//             3-step algorithm, verbatim) + §5.3 (durations, game-minutes) + §6.1 (basic dependency check)
//             + §6.2 (`failed_collision` — the slot does not fire; step 3 "cartes cascade next-session" —
//             NOW wired to `CueCascadeExceptionProducer`) + §6.3 (the ×1.5 recovery multiplier + auto-ack,
//             C4) + §7 (heat/raid disruption — a slot marked `failed_disrupted` OUT OF BAND by
//             `CueStackDisruptionService`, possibly BEFORE the cursor's own turn reaches it) + D4
//             (`failed_executor` on throw, cursor STILL advances, never a retry).
//             Pattern (registration + test-seam symmetry): `MycelialMaintenanceAdvanceService`'s own
//             `OnApplicationBootstrap` + `registerSystem` + "one public runTick both the scheduler AND
//             the `_test` route call" shape (Lesson #3).
//             — P3-D C3 — 2026-07-14 / C4 — 2026-07-14
//
// `CueStackExecutionTickService` — registers `CUE_STACK_EXECUTE` at MINUTE/29 (confirmed free, plan §18/
// C0 re-anchor). `runTick(playerId, gameMinute)` is the WHOLE algorithm, called by BOTH the scheduler AND
// the `_test` route (zero live-vs-test divergence):
//
//   1. Cheap read (`CueStackExecutionRepository.findExecutableStack`) — no committed/executing row for
//      this player → return immediately (0 writes, the falsifiable "tick sans stack" proof).
//   2. `committed` → ONE-TIME atomic promotion (`promoteToExecuting`) to `executing`, cursor at slot 0,
//      `executing_slot_started_minute=gameMinute` (a freshly-promoted stack's elapsed time is always 0 <
//      any tunable duration ≥5 — never fires in the SAME tick it was promoted, no special-case needed).
//   3. `executing` — the current slot. ★ C4: if `slot.status !== 'pending'` ALREADY (the disruption
//      service, §7, flipped it to `failed_disrupted` out of band — possibly BEFORE this cursor position
//      was ever reached), the wait/dependency/execute pipeline is SKIPPED entirely — the slot is NEVER
//      re-fired, its outcome NEVER overwritten; only the cursor advances (bookkeeping only — the
//      disruption service already emitted its own `SlotFailedEvent` + raised its own cascade card at the
//      moment of disruption). Otherwise: `elapsed = gameMinute − executing_slot_started_minute`. ★ C4 §6.3:
//      the base `durationMinutesFor(slot.slot_type)` is multiplied by `cueStackRecoveryCostMultiplier`
//      (default 1.5) IFF a PENDING cascade card exists matching THIS slot's (type, target) —
//      `CueCascadeExceptionProducer.findRecoveryMatch`, looked up fresh every tick (no caching). `elapsed <
//      requiredMinutes` → not yet due (0 additional writes). Else → attempt the I3 atomic CLAIM
//      (`claimGameMinute`, scoped to THIS exact slotIndex+gameMinute) — 0 rows → another concurrent call
//      already claimed this exact (cueStackId, slotIndex, gameMinute) triple, abort (the I3 concurrency
//      guarantee: a double tick for the same gameMinute claims exactly once — this ALSO gates the
//      already-resolved skip branch, so a double tick against an already-disrupted slot still advances
//      the cursor exactly once).
//   4. Won the claim → the BASIC dependency check (design §6.1: `unsatisfied = dependencies − {done}`).
//      Unsatisfied → `failed_collision`, the verb NEVER called — ★ C4: `CueCascadeExceptionProducer.
//      raiseIfClear` is called IN-LINE right here (a NEW `insert` caller, never a `SlotFailedEvent`
//      subscriber — DD-P3). Satisfied → consume the C3 test fault-injection seam, then
//      `SlotTypeExecutorRegistry.require(slotType).execute(...)` — the REAL production verb. A throw (real
//      OR test-injected) → `failed_executor` (D4 — never a retry; ★ C4: NO cascade card for this reason —
//      design §12's own producer table only lists `failed_collision`/`failed_disrupted` as triggers). A
//      SUCCESSFUL firing (`status='done'`) that WAS a recovery match (step 3) → ★ C4:
//      `CueCascadeExceptionProducer.autoAck` resolves the matched cascade card via the REAL
//      `ExceptionsService.resolve('ONE_TIME', ...)` verb (§6.3 — "tied to the REAL action"). The CASCADE
//      itself (dependents of a failed/disrupted slot) needs no extra machinery here — DD-CASCADE-LAZY
//      falls out for free: a dependent slot's OWN dependency check (this SAME step 4, run again at ITS
//      turn) will find its failed/disrupted predecessor never reached `done`, so it ALSO becomes
//      `failed_collision` — automatically, regardless of WHY the predecessor never reached `done`.
//   5. ONE single-statement commit (`commitFiring`) — ★ C9 hardening (C4 MINOR "clobber-window disrupt-
//      vs-fire" carried forward): a targeted `jsonb_set` on ONLY this slot's OWN index (never a
//      JS-computed full-array write) + advances the cursor (or flips `state='resolved'` on the last
//      slot) — see `cue-stack-execution.repository.ts`'s own header for the race this closes (a sibling
//      slot disrupted DURING step 4's `await` must survive this commit regardless of write order).
//   6. Emits `SlotExecutedEvent` (status='done') or `SlotFailedEvent` (`failed_collision`/
//      `failed_executor`) on the bus — EXCEPT for the already-resolved skip branch (step 3), which emits
//      NOTHING (the disruption service already emitted its own event when it happened).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { coreLoopsTunables } from '../core-loops-tunables';
import { CueCascadeExceptionProducer } from './cue-cascade-exception-producer.service';
import { CueStackExecutionRepository } from './cue-stack-execution.repository';
import { CueStackExecutorFaultInjector } from './cue-stack-executor-fault-injector';
import { SlotTypeExecutorRegistry } from './slot-type-executor.registry';
// P3-D C8 — EXTRACTED to its own file (`slot-duration.ts`) so this tick's own §6.3 recovery-multiplier
// call site and C8's player-projection `EstimatedTimeBucket` derivation (`cue-stack.service.ts#toView`)
// share ONE base-duration lookup (DRY — never two independently-maintained copies of the same switch).
import { durationMinutesFor } from './slot-duration';
import type { LiveSlotType } from './slot-type.catalogue';
import type { CueStackSlot, CueStackSlotStatus, SlotOutcome } from './slot-type-executor.interface';

/** Every reason `runTick` may return `fired: false` for — the falsifiable proof surface (plan §C3). */
export type CueStackExecutionTickNoFireReason =
  | 'no_stack'
  | 'not_yet_promoted'
  | 'not_yet_due'
  | 'already_claimed_this_minute';

export type CueStackExecutionTickResult =
  | { fired: false; reason: CueStackExecutionTickNoFireReason }
  | {
      fired: true;
      cueStackId: string;
      slotId: string;
      slotType: string;
      status: CueStackSlotStatus;
      resolved: boolean;
    };

@Injectable()
export class CueStackExecutionTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CueStackExecutionTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly execRepo: CueStackExecutionRepository,
    private readonly registry: SlotTypeExecutorRegistry,
    private readonly bus: CityEventBus,
    private readonly faultInjector: CueStackExecutorFaultInjector,
    private readonly cascadeProducer: CueCascadeExceptionProducer,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.CUE_STACK_EXECUTE,
      cadence: Cadence.MINUTE,
      order: 29,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'CueStackExecutionTickService registered CUE_STACK_EXECUTE at MINUTE/29 — next free after ' +
        'MYCELIAL_MAINTENANCE_ADVANCE/27 (28 courtesy-free). Organically a no-op for a player with no ' +
        'committed/executing cue stack.',
    );
  }

  /**
   * {MINUTE, order 29} — see file header for the whole algorithm. Public so `CueStackTestController` can
   * drive it directly for E2E (Lesson #3 — zero live-vs-test divergence).
   */
  async runTick(playerId: string, gameMinute: number): Promise<CueStackExecutionTickResult> {
    let row = await this.execRepo.findExecutableStack(playerId);
    if (!row) {
      return { fired: false, reason: 'no_stack' };
    }

    if (row.state === 'committed') {
      const promoted = await this.execRepo.promoteToExecuting(row.cue_stack_id, gameMinute);
      row = promoted ?? (await this.execRepo.findExecutableStack(playerId));
      if (!row || row.state !== 'executing') {
        return { fired: false, reason: 'not_yet_promoted' };
      }
    }

    const slots = (row.slots as unknown as CueStackSlot[]) ?? [];
    const slotIndex = row.executing_slot_index ?? 0;
    const slot = slots[slotIndex];
    if (!slot) {
      // Defensive — should be unreachable (I1 + the CHECK bound executing_slot_index < 8 <= slots.length
      // whenever state='executing'). Force-resolve rather than loop forever on a malformed cursor —
      // `slotIndex=null` touches NO slot (★ C9 signature, see `commitFiring`'s own header).
      await this.execRepo.commitFiring(row.cue_stack_id, null, null, null, true, null, null);
      return { fired: false, reason: 'not_yet_promoted' };
    }

    const startedMinute = row.executing_slot_started_minute ?? gameMinute;

    // ★ C4 (§7) — a slot ALREADY resolved out-of-band: `CueStackDisruptionService` may have flipped it to
    // `failed_disrupted` at any point while this stack was `executing`, independent of the cursor's own
    // position (heat/raid disruption is NOT gated by "is this slot's turn" — design §7 "tous les slots
    // NON-done"). Once the cursor's OWN turn reaches such a slot, the wait/dependency/execute pipeline is
    // skipped entirely below — it is NEVER re-fired, its outcome NEVER overwritten.
    const alreadyResolved = slot.status !== 'pending';

    // ★ C4 (§6.3) — the recovery multiplier: a slot (type, target) matching a PENDING cascade card is a
    // RECOVERY slot — its firing duration is ×`cueStackRecoveryCostMultiplier` (default 1.5, ruling #9(a)
    // temporal-universal realization). Looked up fresh every tick (no caching, this file's own plain-
    // recompute idiom) — moot for an already-resolved slot (it will never wait/fire again).
    let recoveryMatch: { exceptionId: string; chosenActionId: string } | null = null;
    let requiredMinutes = durationMinutesFor(slot.slot_type as LiveSlotType);
    if (!alreadyResolved) {
      recoveryMatch = await this.cascadeProducer.findRecoveryMatch(playerId, slot.slot_type, slot.target_ref);
      if (recoveryMatch) {
        requiredMinutes = requiredMinutes * coreLoopsTunables.cueStackRecoveryCostMultiplier;
      }
    }

    if (!alreadyResolved && gameMinute - startedMinute < requiredMinutes) {
      return { fired: false, reason: 'not_yet_due' };
    }

    // I3 — the atomic claim (see cue-stack-execution.repository.ts's own header for the full guarantee).
    // Gates BOTH a genuine firing attempt AND the already-resolved skip branch — a double tick against an
    // already-disrupted slot still advances the cursor EXACTLY once.
    const claimed = await this.execRepo.claimGameMinute(row.cue_stack_id, slotIndex, gameMinute);
    if (!claimed) {
      return { fired: false, reason: 'already_claimed_this_minute' };
    }

    const claimedSlots = (claimed.slots as unknown as CueStackSlot[]) ?? [];
    const claimedSlot = claimedSlots[slotIndex] ?? slot;
    const doneIds = new Set(claimedSlots.filter((s) => s.status === 'done').map((s) => s.slot_id));
    const unsatisfied = slot.dependencies.filter((depId) => !doneIds.has(depId));

    let newStatus: CueStackSlotStatus;
    let outcome: SlotOutcome;
    if (alreadyResolved) {
      // ★ C4 — bookkeeping-only: the slot's status/outcome are ALREADY final (the disruption service set
      // them) — carried through UNCHANGED, never re-fired, never re-emitted (that event already went out
      // at disruption time, and its own cascade card was already raised there too).
      newStatus = claimedSlot.status;
      outcome = (claimedSlot.outcome as unknown as SlotOutcome | null) ?? { status: newStatus };
    } else if (unsatisfied.length > 0) {
      // §6.2 step 1 — the slot does NOT fire its verb (D5) — unsatisfied dependency (`done` required,
      // regardless of WHY a predecessor never reached it — collision, disruption, or executor throw all
      // read identically here, DD-CASCADE-LAZY).
      newStatus = 'failed_collision';
      outcome = { status: 'failed_collision', detail: { unsatisfiedDependencies: unsatisfied } };
    } else {
      const faulted = this.faultInjector.consumeIfArmed(playerId);
      try {
        if (faulted) {
          throw new Error('CueStackExecutorFaultInjector: TEST-ONLY forced executor fault (armed via _test route).');
        }
        const executor = this.registry.require(slot.slot_type as LiveSlotType);
        outcome = await executor.execute(playerId, slot, { gameMinute });
        newStatus = 'done';
      } catch (err) {
        // D4 — the failure IS the outcome (crash-safe, never a retry-storm). ★ C4: no cascade card for
        // this reason — design §12's producer table triggers only on failed_collision/failed_disrupted.
        newStatus = 'failed_executor';
        outcome = { status: 'failed_executor', detail: { error: err instanceof Error ? err.message : String(err) } };
      }
    }

    const isLast = slotIndex >= claimedSlots.length - 1;
    const nextIndex = isLast ? null : slotIndex + 1;
    const nextStartedMinute = isLast ? null : gameMinute;
    // ★ C9 — targeted jsonb_set on THIS slot's own index only (never a full-array snapshot — see
    // `commitFiring`'s own header for the clobber-window this closes: a sibling slot disrupted DURING the
    // `await executor.execute(...)` above must survive this commit regardless of write order).
    await this.execRepo.commitFiring(
      row.cue_stack_id,
      slotIndex,
      JSON.stringify(newStatus),
      JSON.stringify(outcome),
      isLast,
      nextIndex,
      nextStartedMinute,
    );

    if (!alreadyResolved) {
      if (newStatus === 'done') {
        this.bus.emitSlotExecuted({
          type: 'slot_executed',
          playerId,
          cueStackId: row.cue_stack_id,
          slotId: slot.slot_id,
          slotType: slot.slot_type,
          gameMinute,
        });
        // ★ C4 (§6.3) — a SUCCESSFUL recovery firing auto-acks the matched cascade card (the REAL resolve
        // verb, D3) — a recovery slot that instead collided/threw leaves the card pending (divergence #12).
        if (recoveryMatch) {
          await this.cascadeProducer.autoAck(playerId, recoveryMatch.exceptionId, recoveryMatch.chosenActionId);
        }
      } else {
        this.bus.emitSlotFailed({
          type: 'slot_failed',
          playerId,
          cueStackId: row.cue_stack_id,
          slotId: slot.slot_id,
          slotType: slot.slot_type,
          reason: newStatus as 'failed_collision' | 'failed_executor',
          gameMinute,
        });
        // ★ C4 (§6.2/§12) — the mini-Exception cascade card, in-line (DD-P3: a NEW `insert` caller, never a
        // `SlotFailedEvent` subscriber). Only `failed_collision` — `failed_executor` is D4's own concern.
        if (newStatus === 'failed_collision') {
          await this.cascadeProducer.raiseIfClear(playerId, slot);
        }
      }
    }

    return {
      fired: true,
      cueStackId: row.cue_stack_id,
      slotId: slot.slot_id,
      slotType: slot.slot_type,
      status: newStatus,
      resolved: isLast,
    };
  }
}
