// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (role resolution —
//             canonical role_id → the player's holder, stable pick; none → `lieutenant_id NULL`)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §1 D6.
//             Decisions: §1.6 D6 + §8.5(b) (C0 proof: NO existing endpoint can EVER assign role_id 2/9 —
//             `roleIdForArchetype`'s closed switch never returns those ids; C3's floor relies SOLELY on
//             the honest-gap proof, no zero-change-activation bonus available).
//             — P3-B C3 — 2026-07-11
//
// `resolveRoleHolder` — the ONE shared role-resolution seam all 5 generators call (never duplicated):
// `LieutenantRepository.findRoleHolderForPlayer` (added this chunk) returns the player's `roleId`-holder,
// first-by-recruited-order (stable pick, D6), or null (no CURRENT holder — for role_id 2/9 this is
// EVERY player, C0 §8.5(b); for a LIVE role_id it is simply "not recruited yet"). Both outcomes are
// ordinary, not exceptional — the caller (a generator's `enumerate`) forwards null straight through as
// `lieutenantId: null, tenureScore: null` on its candidates (D6 — the honest coverage gap).

import type { LieutenantRepository } from '../../../operational/lieutenant/lieutenant.repository';

export interface ResolvedRoleHolder {
  readonly lieutenantId: string;
  readonly tenureScore: number;
}

export async function resolveRoleHolder(
  lieutenants: LieutenantRepository,
  playerId: string,
  roleId: number,
): Promise<ResolvedRoleHolder | null> {
  const row = await lieutenants.findRoleHolderForPlayer(playerId, roleId);
  if (!row) return null;
  return { lieutenantId: row.lieutenant_id, tenureScore: row.tenure_score };
}
