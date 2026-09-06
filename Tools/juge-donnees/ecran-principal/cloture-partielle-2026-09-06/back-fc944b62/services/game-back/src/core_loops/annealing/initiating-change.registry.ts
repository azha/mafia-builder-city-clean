// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 ("InitiatingChangeRegistry
//             (fermé, dup-throw boot)" — the CLOSED registry class itself, this chunk's own heading).
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §9.2 (the 6 LIVE
//             `ChangeType` members — P3-D's original 5 + P3-E C4's `BUILDING_DECOMMISSION` flip, see
//             `initiating-change.catalogue.ts`'s own header).
//             Pattern: `core_loops/cue_stack/slot-type-executor.registry.ts` (`SlotTypeExecutorRegistry`) /
//             `progression/loop10/hl-card-provider.registry.ts` (`HlCardProviderRegistry`) — Map<key, X>,
//             built ONCE from a `useFactory` descriptor list, duplicate-key throws at boot.
//             — P3-D C6 — 2026-07-14
//
// `InitiatingChangeRegistry` — the closed set of the 6 v1 LIVE `ChangeType`s (design §9.2 + P3-E C4's
// `BUILDING_DECOMMISSION` flip), built ONCE from `AnnealingModule`'s own `useFactory` descriptor list
// (mirrors `SlotTypeExecutorRegistry` structurally). A
// duplicate `changeType` throws at boot (the SAME loud-misconfiguration convention). UNLIKE
// `SlotTypeExecutorRegistry` (whose 4 members each carry a DISTINCT `execute()` implementation),
// EVERY `ChangeType` here feeds the IDENTICAL `AnnealingService.initiateOrCompound` algorithm (design
// §9.3 — the arithmetic never branches on `changeType`) — so a "descriptor" here carries no behavior, only
// its own identity. `require()` is therefore a DEFENSIVE, never-reachable-in-practice internal invariant
// (every real caller is one of the 6 subscribers in `annealing-initiation-subscriber.service.ts`, each
// passing its OWN literal `ChangeType` member) — the SAME "never reachable via a real caller" precedent
// `SlotTypeExecutorRegistry.require`'s own header already documents for its analogous branch.
//
// The 2 RESERVED-INERT members (`initiating-change.catalogue.ts`) have NO entry here at all — there is no
// subscriber that could ever construct a call for either (both CONFIRMED ABSENT on this base, C0 re-anchor
// §8.4-2) — nothing for this registry to ever be asked to validate for one.

import type { LiveChangeType } from './initiating-change.catalogue';

export interface InitiatingChangeDescriptor {
  readonly changeType: LiveChangeType;
}

export class InitiatingChangeRegistry {
  private readonly known = new Set<LiveChangeType>();

  constructor(descriptors: InitiatingChangeDescriptor[]) {
    for (const d of descriptors) {
      if (this.known.has(d.changeType)) {
        throw new Error(
          `InitiatingChangeRegistry: duplicate descriptor for change_type '${d.changeType}' — register each ` +
            'exactly once in the AnnealingModule useFactory descriptor list.',
        );
      }
      this.known.add(d.changeType);
    }
  }

  /** Validate a `changeType` is one of the 6 LIVE members. Throws (internal invariant — never reachable via
   *  a real subscriber, see file header) if not. Returns the SAME value (a narrowing convenience for callers). */
  require(changeType: LiveChangeType): LiveChangeType {
    if (!this.known.has(changeType)) {
      throw new Error(
        `InitiatingChangeRegistry: '${changeType}' is not a registered LIVE change_type (expected one of ` +
          `${this.supported().join(' | ')}) — this should be unreachable (every real subscriber passes one ` +
          'of the 6 LIVE members).',
      );
    }
    return changeType;
  }

  /** The registered change types (deterministic insertion order). */
  supported(): LiveChangeType[] {
    return [...this.known];
  }
}
