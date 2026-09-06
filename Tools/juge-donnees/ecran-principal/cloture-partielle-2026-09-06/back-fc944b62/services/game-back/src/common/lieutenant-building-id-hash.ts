// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C5 carry-forward #6
//             Extracts shared reverse-hash util anti-drift (04d-A C5 MINOR).
//             — 04d-A C5 — 2026-06-30
//
// `lieutenantBuildingIdHash` — derive a stable integer building_id from a lieutenant UUID.
//
// Previously co-implemented in two places:
//   1. StandingGapHeatService.lieutenantBuildingId (standing-gap-heat.service.ts:142)
//      — the original (forensic/tail_subpoena dispatch path).
//   2. `lieutenantBuildingIdHash` function in legal-case.repository.ts:40
//      — a mirror for the MIS reverse-hash lookup (C3 04d-A).
//
// C5 carry-forward: extracted here so both importers share the SAME function body.
// If the hash changes (e.g. to a different algorithm), ONE edit here keeps both
// callers in sync — no silent drift between forensic and legal paths.
//
// Algorithm (deterministic, no Math.random, no Date.now):
//   1. Remove dashes, take the first 8 hex chars of the UUID.
//   2. Parse as a base-16 integer (0 .. 0xFFFFFFFF).
//   3. Mask to a 31-bit positive integer (bit-AND with 0x7FFFFFFF).
//   4. Fallback 1 if somehow 0 (all-zero UUID prefix — impossible for UUID v4 in practice).
//
// Anti-fabrication: pure arithmetic, no DB lookup, fully deterministic.
// [PROV-Y26Q2]: the algorithm is canon-silent (no explicit schema FK from lieutenant
//   to building_id); ratification by reviewer ⊥ expected for the hash choice.
//
// Used by:
//   StandingGapHeatService.lieutenantBuildingId (forensic) — delegates here.
//   LegalCaseRepository.findLieutenantForMIS (legal) — delegates here.

/**
 * lieutenantBuildingIdHash — stable 31-bit positive integer derived from a lieutenant UUID.
 *
 * Used to:
 *   (a) assign a pseudo-building_id to a lieutenant in the inspection queue (forensic path);
 *   (b) reverse-lookup a lieutenant UUID from a known hash (legal case, MIS subpoena path).
 *
 * @param lieutenantId — lieutenant UUID string (e.g. '12a3bc45-6789-...').
 * @returns a non-negative 31-bit integer in [1 .. 0x7FFFFFFF].
 */
export function lieutenantBuildingIdHash(lieutenantId: string): number {
  // Take first 8 hex chars (ignore dashes) — reliable across UUID v4 format.
  const hex = lieutenantId.replace(/-/g, '').slice(0, 8);
  const raw = parseInt(hex, 16); // 0 .. 0xFFFFFFFF
  // Mask to 31-bit positive integer — never negative, never 0 (fallback 1).
  return (raw & 0x7FFFFFFF) || 1;
}
