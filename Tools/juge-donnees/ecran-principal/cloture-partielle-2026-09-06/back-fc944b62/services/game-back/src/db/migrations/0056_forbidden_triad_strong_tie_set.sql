-- D2 R8a: forbidden_triad_pair_state — additive ALTER for strong-tie set storage.
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       updated in the SAME commit.
--
-- Adds `strong_tie_members` (JSONB, nullable) to forbidden_triad_pair_state.
--   This column is the per-player ordered strong-tie membership set, stored on a canonical
--   sentinel row with pair_key = player_id (the player's own UUID as the sentinel key).
--
-- strong_tie_members: JSONB array of { contact_id: string, joined_at: number (epoch ms) }
--   ordered by joined_at ASC (oldest first). Max N_strong entries (default 12 — registry-governed).
--   The sentinel row's triadic_state/anomaly_pressure_bucket/last_event_tick are IGNORED (0/NULL).
--   Only the `strong_tie_members` column is meaningful on the sentinel row.
--   On non-sentinel rows (pair-state rows), this column is NULL.
--
-- NULL until ForbiddenTriadDetectionService.updateStrongTieMembership() first runs for the player.
-- R2.2: strong_tie_members is server-only (never forwarded to client).

ALTER TABLE forbidden_triad_pair_state
  ADD COLUMN IF NOT EXISTS strong_tie_members jsonb;

--> statement-breakpoint

GRANT UPDATE ON forbidden_triad_pair_state TO app_rw;
GRANT DELETE ON forbidden_triad_pair_state TO app_rw;
