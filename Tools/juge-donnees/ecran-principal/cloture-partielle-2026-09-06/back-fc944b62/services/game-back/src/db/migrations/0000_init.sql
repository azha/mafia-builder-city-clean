-- 0000_init.sql — chunk 09/drizzle_setup_and_migrations.md §3 (création schéma initial : extensions DB).
-- PALIMPSEST strict (§3.2) : forward-only, numérotation séquentielle stable, jamais rebase une fois mergée.
-- Le header `SET lock_timeout` (T.db.migration.lock_timeout_ms) est injecté PAR le MigrationRunner avant
-- chaque fichier (cf. §5.3 — Drizzle ne le pose pas automatiquement ; src/db/migration.runner.ts).

-- pgcrypto : fournit gen_random_uuid() (UUIDv4) utilisé par les tables à PK uuid `defaultRandom()`
-- (buildings, laundering_*, safehouses, tail_risk_estimates, exception_queue, cue_stacks, autonomy_reports,
--  constraint_log, possibility_horizon_cards, structural_decisions_audit, rich_citizens, gameplay_sessions,
--  admin_audit_log, cheat_flag, enforcement_action, appeal_case, telemetry_event).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint

-- uuidv7() — RECONCILE schema_player.md §7 : le §3 DDL appelle `CREATE EXTENSION pg_uuidv7` puis `DEFAULT uuidv7()`.
-- L'extension `pg_uuidv7` n'est PAS livrée par l'image stock `postgres:16` (seul `uuid-ossp` + `pgcrypto` le sont).
-- On matérialise donc la fonction `uuidv7()` en SQL pur (RFC 9562 UUID v7 : 48-bit unix-ms timestamp + version 7
-- + variant 0b10 + bits aléatoires) — strictement équivalent au contrat schema (`player_id DEFAULT uuidv7()`
-- reste valide). Quand PG18 (uuidv7() natif) ou l'image custom `pg_uuidv7` seront adoptés, cette fonction sera
-- DROP/REPLACE par une migration PALIMPSEST ultérieure (§3.2). Implémentation timestamp-ordered → insertabilité
-- B-tree + ordering temporel cohérent created_at (REUSE 18/pagination_and_streaming §Tie-breaker).
-- Layout : [unix_ts_ms : 48 bits][ver=0x7 : 4 bits][rand_a : 12 bits][var=0b10 : 2 bits][rand_b : 62 bits].
CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
DECLARE
  unix_ts_ms  bigint;
  uuid_bytes  bytea;
BEGIN
  unix_ts_ms := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  -- 16 random bytes, puis on écrase les 6 premiers par le timestamp ms big-endian,
  -- on force le nibble de version (7) et les 2 bits de variant (0b10).
  uuid_bytes := gen_random_bytes(16);
  uuid_bytes := overlay(uuid_bytes PLACING substring(int8send(unix_ts_ms) FROM 3 FOR 6) FROM 1 FOR 6);
  -- byte 6 : version 7 dans le quartet haut (0x70 | (rand & 0x0F)).
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  -- byte 8 : variant RFC 4122 (0b10xxxxxx) → (rand & 0x3F) | 0x80.
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;
