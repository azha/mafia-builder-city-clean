// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 ("SlotTypeExecutorRegistry
//             (fermé, dup-throw boot)" — the CLOSED registry class itself, this chunk's own heading).
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.1 (the 4 LIVE
//             `SlotType` members, each wired to its REAL verb — the table verbatim).
//             Pattern: `progression/loop10/hl-card-provider.registry.ts` (`HlCardProviderRegistry`) /
//             `exceptions/effects/exception-effect-registry.service.ts` (`ExceptionEffectRegistry`) —
//             Map<key, X>, built ONCE from a `useFactory` provider list, duplicate-key throws at boot.
//             — P3-D C3 — 2026-07-14
//
// `SlotTypeExecutorRegistry` — the closed set of the 4 v1 LIVE `SlotTypeExecutor`s (design §5.1 table:
// `DISTRIBUTION_RUN`/`MAINTENANCE_BATCH`/`RECRUITMENT_STEP`/`EXCEPTION_BATCH_RESOLUTION`), built ONCE from
// `CueStackModule`'s own `useFactory` provider list (mirrors `HlCardProviderRegistry`/
// `ExceptionEffectRegistry` EXACTLY). A duplicate `slotType` throws at boot (the SAME loud-misconfiguration
// convention).
//
// The 3 RESERVED-INERT `SlotType` members (`STASH_CONSOLIDATION`/`INSPECTION_RESPONSE`/
// `LAUNDERING_INJECTION`, `slot-type.catalogue.ts`) have NO entry here at all — `isKnownSlotType`/
// `isReservedSlotType` already fence them OUT at compose time (422 `SLOT_TYPE_RESERVED`), so a reserved
// type can NEVER be persisted into a committed stack's `slots` — there is nothing for this registry to
// ever be asked to fire for one. `require()`'s "unknown slotType" branch below is therefore a defensive,
// never-reachable-in-practice internal invariant (never player-facing — the tick is a background system,
// not an HTTP request), NOT a second "reserved executor" concept.

import type { LiveSlotType } from './slot-type.catalogue';
import type { SlotTypeExecutor } from './slot-type-executor.interface';

export class SlotTypeExecutorRegistry {
  private readonly byType = new Map<LiveSlotType, SlotTypeExecutor>();

  constructor(executors: SlotTypeExecutor[]) {
    for (const e of executors) {
      const type = e.slotType as LiveSlotType;
      if (this.byType.has(type)) {
        throw new Error(
          `SlotTypeExecutorRegistry: duplicate executor for slot_type '${type}' — register each exactly ` +
            'once in the CueStackModule useFactory executor list.',
        );
      }
      this.byType.set(type, e);
    }
  }

  /** Resolve the executor for a LIVE slot_type. Throws (internal invariant — never reachable via a
   *  committed stack, see file header) if none is registered. */
  require(slotType: LiveSlotType): SlotTypeExecutor {
    const executor = this.byType.get(slotType);
    if (!executor) {
      throw new Error(
        `SlotTypeExecutorRegistry: no executor registered for slot_type '${slotType}' (expected one of ` +
          `${this.supported().join(' | ')}) — this should be unreachable (compose already refuses any ` +
          'slot_type outside the 4 LIVE members).',
      );
    }
    return executor;
  }

  /** The registered slot types (deterministic insertion order). */
  supported(): LiveSlotType[] {
    return [...this.byType.keys()];
  }
}
