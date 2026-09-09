// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 ("BlockedOutputDetectorRegistry
//             (fermé, dup-throw boot — les 6 membres live design §6.1, BUYER_LEK_COLD réservé inerte)")
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.1 (the closed
//             registry contract + the 6 LIVE members' substrate anchors) + §4 (nodes = the player's
//             operational buildings).
//             Decisions: §0 row 11 (the verified LIVE congestion signals) + §6.6 sub-décision #6 (default
//             = the 6 live members, `BUYER_LEK_COLD` reserved inert).
//             Pattern: `RoutineItemGeneratorRegistry` (P3-B `generators/routine-item-generator.ts`) —
//             design §6.1's own "Miroir structurel" citation. `BUYER_LEK_COLD`'s reserved-inert treatment
//             mirrors that SAME file's own `BUILDING_RENT` precedent (a documented, code-visible,
//             NEVER-registered member — see the registry file's header for the one difference: here the
//             reserved name is a plain TS string-literal union member, not a DB pgEnum value, so naming it
//             costs zero schema risk, unlike `BUILDING_RENT` which would have needed a 6th
//             `routine_generator` pgEnum member).
//             — P3-C C5 — 2026-07-12
//
// `BlockedOutputSource` — the closed domain of Loop 3 diagnostic tags (design §6.1's table, `blocked_
// sources` jsonb column, design §10.2). 6 LIVE members, each backed by a VERIFIED real substrate signal
// (decisions §0 row 11); `BUYER_LEK_COLD` is a 7th, DOCUMENTED name (lek dynamics are rich enough to
// eventually back a 7th detector) that NO detector ever reports and the registry NEVER admits — naming it
// here is the honest "reserved, not silently absent" gesture, never a live behavior.
export type BlockedOutputSource =
  | 'STASH_ERLANG_BLOCKING'
  | 'HUB_ROSTER_SATURATED'
  | 'LAUNDER_NODE_OVERFLOW'
  | 'DEALER_UNAVAILABLE'
  | 'ROUTE_SEVERED_DESTINATION'
  | 'LEG_STRESSED_ORIGIN'
  // Reserved, inert (design §6.1 — "réservé, jamais branché"): no detector class exists for this source,
  // the registry's closed set stays exactly 6. Never appears in a `detect()` return value.
  | 'BUYER_LEK_COLD';

/** One node (a player-owned operational building) a detector diagnoses as a blocked-output SOURCE. */
export interface BlockedNode {
  readonly buildingId: string;
  readonly source: BlockedOutputSource;
}

/**
 * The detector contract (design §6.1: `{ source: BlockedOutputSource; detect(playerId): Promise<
 * BlockedNode[]> }` verbatim). Each LIVE implementation reads ONE verified congestion signal (D3-class
 * wall — READ-ONLY over another system's substrate, zero writes, zero edits to any source system's own
 * write path) and reports every building_id currently exhibiting that signal for the player. `source` is
 * a readonly literal so a detector can only ever report ITS OWN tag (never impersonate another).
 */
export interface BlockedOutputDetector {
  readonly source: BlockedOutputSource;
  detect(playerId: string): Promise<BlockedNode[]>;
}
