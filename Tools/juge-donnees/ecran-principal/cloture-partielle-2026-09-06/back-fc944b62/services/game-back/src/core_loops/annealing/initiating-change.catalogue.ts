// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 ("InitiatingChangeRegistry
//             (fermé, dup-throw — 5 LIVE selon ruling ★#1 ... ; 2 réservés inertes)")
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §9.2 (the 5 LIVE +
//             2 RESERVED-INERT `ChangeType` members, verbatim table) + §13.2 (D1 — ZERO pgEnum, the
//             `initiating_change` domain is fenced by a runtime catalogue, not a DB enum).
//             P3-E C4 flip: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §3.2
//             (BUILDING_DECOMMISSION — the decommission verb's OWN annealing trigger on every
//             route-adjacent neighbor; R15 froze this flip's exact target array at C0).
//             — P3-D C6 — 2026-07-14 / P3-E C4 (BUILDING_DECOMMISSION flip) — 2026-07-17
//
// The closed 7-member `ChangeType` catalogue — a "fichier pur" (no DI, no DB — the SAME `slot-type.
// catalogue.ts` convention this codebase already uses for a closed static domain, C2). `InitiatingChange
// Registry` (`initiating-change.registry.ts`, the closed dup-throw-BOOT class) is built FROM
// `LIVE_CHANGE_TYPES` below in `AnnealingModule`'s own `useFactory` — this file only fences the domain.
//
// P3-E C4 flips `BUILDING_DECOMMISSION` RESERVED→LIVE (moved into `LIVE_CHANGE_TYPES` below): the
// decommission verb (`DecommissionRepository.decommissionOwnedNode`) is now the live verb this member
// was reserved for (design §3.2 — "P3-D a posé le membre RESERVED-INERT en anticipant EXACTEMENT ce
// verbe"). `SUBSTANCE_UNLOCK` (design §9.2) stays the ONLY RESERVED-INERT member — no verb on this base
// emits it (decisions §0 row 16, C0 re-anchor §8.4-2). It exists in the domain purely as
// documentation-as-code (TD nominatif, plan §20) — never constructed into an
// `AnnealingService.initiateOrCompound` call.

/** The 6 LIVE members (design §9.2 table + P3-E C4's own §3.2 flip) — each wired to a REAL verb's
 *  ADDITIVE one-line bus emit (decisions §0 row 15/12 anchors, C0 re-anchor §8.4-1 for `attachScript`'s
 *  exact site; P3-E C4 R15 for `BUILDING_DECOMMISSION`'s own flip-target confirmation). */
export const LIVE_CHANGE_TYPES = [
  'ROUTE_CREATED',
  'ROUTE_REBUILT',
  'LIEUTENANT_REASSIGNED',
  'NEW_HIRE',
  'MAJOR_SCRIPT_EDIT',
  'BUILDING_DECOMMISSION',
] as const;

export type LiveChangeType = (typeof LIVE_CHANGE_TYPES)[number];

/** The 1 RESERVED-INERT member (design §9.2) — present in the domain, never fired (no live verb
 *  identified on this base — decisions §0 row 16 `SUBSTANCE_UNLOCK` absence, C0 re-anchor §8.4-2). TD
 *  nominatif at closeout (plan §20). */
export const RESERVED_CHANGE_TYPES = ['SUBSTANCE_UNLOCK'] as const;

export type ReservedChangeType = (typeof RESERVED_CHANGE_TYPES)[number];

export type ChangeType = LiveChangeType | ReservedChangeType;

export const ALL_CHANGE_TYPES = [...LIVE_CHANGE_TYPES, ...RESERVED_CHANGE_TYPES] as const satisfies readonly ChangeType[];

/** Is `value` one of the 7 known catalogue members at all (LIVE or RESERVED)? */
export function isKnownChangeType(value: string): value is ChangeType {
  return (ALL_CHANGE_TYPES as readonly string[]).includes(value);
}

/** Is `value` one of the 2 RESERVED-INERT members? Callers MUST have already confirmed `isKnownChangeType`. */
export function isReservedChangeType(value: ChangeType): boolean {
  return (RESERVED_CHANGE_TYPES as readonly string[]).includes(value);
}

/**
 * `ChangeRef` (design §9.1 verbatim, glossary R6.1 — PascalCase composite "Reference to initiating
 * change") — the `initiating_change` jsonb payload shape (`{change_type, ref}`, snake_case KEYS matching
 * the design text literally). `ref` is the causing entity's id (route_id / lieutenant_id — never null for
 * any of the 5 LIVE members).
 */
export interface ChangeRef {
  readonly change_type: LiveChangeType;
  readonly ref: string;
}
