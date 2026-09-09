// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C2 (compose validation —
//             "types du catalogue §5.1 en membre LIVE")
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.1 (the 4 LIVE +
//             3 RESERVED-INERT `SlotType` members, verbatim table) + §13.2 (D1 — ZERO pgEnum, the domain
//             is fenced by a runtime catalogue, not a DB enum).
//
// The closed 7-member `SlotType` catalogue — a "fichier pur" (no DI, no DB — the `*-bucket.ts` convention
// this codebase already uses for closed static domains, e.g. `debt-bucket.ts`/`sinuosity-stress-bucket.ts`).
// `SlotTypeExecutorRegistry` (the closed, dup-throw-BOOT registry CLASS wiring these to their real verbs)
// is plan §C3's own scope (see `slot-type-executor.interface.ts`'s header) — this file only fences the
// DOMAIN + the expected `TargetRef.kind` per LIVE member, both needed by C2's own compose validation.

import type { SlotType } from './slot-type-executor.interface';

/** The 4 v1 LIVE members (design §5.1 table) — each adossed to a verified-live verb (decisions §0 row 15).
 *  Committable at compose. */
export const LIVE_SLOT_TYPES = [
  'DISTRIBUTION_RUN',
  'MAINTENANCE_BATCH',
  'RECRUITMENT_STEP',
  'EXCEPTION_BATCH_RESOLUTION',
] as const satisfies readonly SlotType[];

export type LiveSlotType = (typeof LIVE_SLOT_TYPES)[number];

/** The 3 RESERVED-INERT members (design §5.1) — present in the domain, refused at compose with 422
 *  `SLOT_TYPE_RESERVED` (no live verb identified on this base, decisions §0 row 16 / divergences #7).
 *  TD nominatif at closeout (plan §20). */
export const RESERVED_SLOT_TYPES = [
  'STASH_CONSOLIDATION',
  'INSPECTION_RESPONSE',
  'LAUNDERING_INJECTION',
] as const satisfies readonly SlotType[];

export const ALL_SLOT_TYPES = [...LIVE_SLOT_TYPES, ...RESERVED_SLOT_TYPES] as const satisfies readonly SlotType[];

/** Is `value` one of the 7 known catalogue members at all (LIVE or RESERVED)? A slot_type outside this
 *  closed set is a malformed payload (422 `VALIDATION_FAILED`), distinct from a KNOWN-but-reserved type
 *  (422 `SLOT_TYPE_RESERVED`) — the two 422s carry different codes so a client can tell "you typo'd a
 *  slot_type" from "that slot_type exists but isn't committable yet" apart. */
export function isKnownSlotType(value: string): value is SlotType {
  return (ALL_SLOT_TYPES as readonly string[]).includes(value);
}

/** Is `value` one of the 3 RESERVED-INERT members? Callers MUST have already confirmed `isKnownSlotType`
 *  (a value outside the domain entirely is neither live nor reserved — it is simply unknown). */
export function isReservedSlotType(value: SlotType): boolean {
  return (RESERVED_SLOT_TYPES as readonly string[]).includes(value);
}

/** The `TargetRef.kind` each LIVE `SlotType` expects (design §4.2's own `target_ref` comment —
 *  `building|route|lieutenant|batch`; `EXCEPTION_BATCH_RESOLUTION`'s "batch" is realized as a
 *  building-scoped batch — decisions §0 row 6's `hasPendingForBuilding` reuse). A `target_ref.kind`
 *  mismatching this map is a malformed/mistargeted slot (422 `CUE_STACK_SLOT_TARGET_INVALID`), never a
 *  silent coercion. */
export const EXPECTED_TARGET_KIND: Readonly<Record<LiveSlotType, string>> = {
  DISTRIBUTION_RUN: 'route',
  MAINTENANCE_BATCH: 'building',
  RECRUITMENT_STEP: 'candidate',
  EXCEPTION_BATCH_RESOLUTION: 'building',
};
