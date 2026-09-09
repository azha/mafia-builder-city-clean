-- 0001_player.sql — schema_player.md §3/§7.2 (table player + indexes). PALIMPSEST §3.2.
-- DDL contract : schema_player.md §3. uuidv7() est fourni par 0000_init.sql (RECONCILE pg_uuidv7 absent).
-- FK auth account_id : DEFERRED (commentée) — la table `account` est owned par chapitre 17 (Task 6 auth),
-- pas encore matérialisée. Le UNIQUE INDEX local garantit la 1-1 strict en attendant.

CREATE TABLE "player" (
  "player_id"          uuid PRIMARY KEY DEFAULT uuidv7(),
  "account_id"         uuid NOT NULL,
  "callsign"           varchar(24),
  "email"              varchar(255),
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "last_seen_at"       timestamptz,
  "region"             varchar(8),
  "locale"             varchar(8),
  "tier"               integer NOT NULL DEFAULT 1,
  "active_branches"    integer NOT NULL DEFAULT 1,
  "save_state_version" integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX "player_callsign_uq"         ON "player" ("callsign");
--> statement-breakpoint
CREATE UNIQUE INDEX "player_email_uq"            ON "player" ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "player_account_id_uq"       ON "player" ("account_id");
--> statement-breakpoint
CREATE        INDEX "player_callsign_search_idx" ON "player" ("callsign");
--> statement-breakpoint
CREATE        INDEX "player_last_seen_at_idx"    ON "player" ("last_seen_at");
--> statement-breakpoint
-- FK auth — DEFERRED (schema_player.md §7.2/§7.3) : la contrainte référant `account` est posée par une
-- migration ultérieure quand le chapitre 17 matérialisera `account` (ordre de merge cross-chapitre).
-- ALTER TABLE "player" ADD CONSTRAINT "player_account_fk"
--     FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE RESTRICT;
