// IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md C15
// Shared constants for the Insurance module.

/**
 * SYNTHETIC_UNDERWRITER_ID — the fixed UUID used as the almanac_entry.underwriter_id
 * when no real NPC underwriter exists (standard issuance without a walk-backed counterparty,
 * or fraud-only paths).
 *
 * This mirrors the fraud-detection.service.ts fallback (which was private — C15 centralizes it).
 * It is NOT a real DB FK — the underwriter_id column has no FK constraint (by design, Tranche B).
 *
 * C15 UPSERT fix: captureBaselineFingerprint now INSERTs-if-absent / UPDATEs-if-present using
 * this ID when counterpartyId is null, ensuring the almanac baseline is always persisted at
 * issuance. The lapse-stamp (renewal.service.ts) and the inherit-check
 * (captureBaselineFingerprint C12 path) are aligned to the same ID.
 *
 * NOTE: almanac_entry has NO unique constraint on (underwriter_id, player_id) — only a plain
 * INDEX on player_id. We therefore cannot use Drizzle onConflictDoUpdate. The fix uses a
 * SELECT-then-INSERT-if-absent / UPDATE-if-present pattern (see coverage-induced-drift.service.ts
 * Step 8). The SELECT is keyed on (underwriter_id = SYNTHETIC_UNDERWRITER_ID, player_id).
 */
export const SYNTHETIC_UNDERWRITER_ID = '00000000-0000-0000-0000-000000000001';
