-- D2 R1: boss_mirror_declaration_ledger — per-player PUBLIC declaration history (§3.1 Boss Mirror).
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       backported in the SAME commit.
--
-- boss_mirror_declaration_ledger: public ledger of declared/retracted rules per player.
--   Canon :65: "public ledger ≤ 8 entries per player, 16 B" — keyed per-PLAYER (DD-ENT confirmed :65).
--   declared_rules: JSONB array of active rules { rule_id, declared_at }. Max 4 (boss_mirror_max_public_rules).
--   retraction_history: JSONB array of retraction events { rule_id, retracted_at }. Server-side.
--   PK: player_id (1-1 with player — per-player public ledger, DD-ENT).
--   FK: player_id → player(player_id) ON DELETE CASCADE.
--   R2.2: declared_rules is a public observable (:65 — the rules ARE public); retraction_history
--         is server-side only (BPD prior influence :71).
--
-- DD-ENT: PK = player_id (NOT lieutenant_id) — the public ledger is per-player (:65).

CREATE TABLE IF NOT EXISTS boss_mirror_declaration_ledger (
  player_id          uuid        NOT NULL PRIMARY KEY
    REFERENCES player(player_id) ON DELETE CASCADE,
  declared_rules     jsonb       NOT NULL DEFAULT '[]',
  retraction_history jsonb       NOT NULL DEFAULT '[]',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

GRANT UPDATE ON boss_mirror_declaration_ledger TO app_rw;
