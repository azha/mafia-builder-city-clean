-- migration 0142: ownership_immutability (W6a C2 — authz remediation, geste C: immuabilité de propriété)
-- Design: docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md D3 (§D3.a/b/c/d) + §1 P-C +
-- §3 C2. Ruling (controller, D6-Q3(a), 2026-08-08): form (ii) — a BEFORE UPDATE trigger, NOT the FK-
-- composite form (i) — on all 4 tables, uniform, independent of historical referential integrity, no new
-- FK posed where none existed (a new FK would retroactively validate every existing row — D3.d's
-- unresolved reconciliation risk). The FK-composite hardening (i) remains a later option once D3.d's
-- reconciliation is measured (`lifestyle_audit_state` is the only one of the 4 where (i) is structurally
-- possible today — its existing FK to `lieutenant` is untouched by this migration).
--
-- WHAT THIS CLOSES (D3.a): the mandate's original prescription — a `UNIQUE (front_id, player_id)`
-- composite index — does NOT close the reattribution vector. A unique index constrains ROW MULTIPLICITY;
-- the vector here is COLUMN MUTABILITY (`UPDATE ledger_entry_ring SET player_id = $attacker WHERE
-- front_id = $victimsFront` collides with nothing — there is exactly one row, no index blocks it). This
-- migration makes `player_id` immutable post-INSERT on the 4 tables named by D3.c:
--   ledger_entry_ring.front_id               (PK, forensic.ts:108) — no FK to a parent
--   forensic_soft_flag_ring.front_id         (PK, forensic.ts:203) — idem, sibling ring
--   workshop_stoichiometry_state.workshop_id (PK, forensic.ts:260) — idem
--   lifestyle_audit_state.lieutenant_id      (PK, forensic.ts:498) — FK → lieutenant(lieutenant_id)
--
-- CONCURRENCY / LAYERING (mirrors 0136's own posture, :6-13): the app-layer guard — the
-- `ON CONFLICT (<pk>) DO UPDATE SET … WHERE <table>.player_id = $playerId` predicate applied in the SAME
-- commit to `leading-digit-audit.service.ts#recordSoftFlag` and
-- `standing-gap-heat.service.ts#populateLifestyleState` — is belt-and-suspenders, NOT the primary
-- guarantee: it is a per-call-site convention, easy to omit at the NEXT write site. THIS migration makes
-- ownership immutability a DB-ENFORCED constraint, uninstallable by a careless future writer, per the
-- task's own "DB-enforced, not app-checked" mandate (D3.c).
--
-- FORM: a single trigger function (`forbid_ownership_reassignment`), reused verbatim by 4
-- `BEFORE UPDATE … FOR EACH ROW` triggers (one per table — Postgres triggers are not inherited/shared
-- across tables). Fires ONLY when `NEW.player_id IS DISTINCT FROM OLD.player_id` — an UPDATE that
-- touches every OTHER column, or that writes the SAME player_id it already had (the common "UPSERT
-- re-stamps its own owner" idiom — e.g. `effluent-stoichiometry.service.ts#recordWorkshopThroughput`'s
-- own ON CONFLICT, which never sets player_id at all), is untouched. This is a pure ownership-mutation
-- guard, not a write-freeze.
--
-- ERROR MAPPING (D2 + C2 §3): the violation must surface as 404 RESOURCE_NOT_FOUND, never a 5xx — the
-- SAME existence-masking convention the app-layer 0-affected-rows branch already uses for the identical
-- case. Custom SQLSTATE 'OW001' (5-char, uppercase alnum; does not collide with any Postgres-reserved
-- error class — see https://www.postgresql.org/docs/current/errcodes-appendix.html) lets the app layer
-- distinguish THIS violation from any other DB error at the same call site — extends the
-- `isUniqueViolation` (SQLSTATE 23505) idiom already established by `standing-order.service.ts` /
-- `flag-discipline.service.ts` / `degraded-category-pressure-producer.service.ts` ("each
-- service/repository keeps its own copy", never a shared extraction — the SAME posture followed here as
-- `isOwnershipImmutableViolation`, copied verbatim into `leading-digit-audit.service.ts`,
-- `standing-gap-heat.service.ts` and `forensic-test.controller.ts`).
--
-- WHY THIS TRIGGER CANNOT FIRE ON THE TWO PATCHED PRODUCTION WRITE SITES (post-fix, same commit): both
-- `recordSoftFlag` and `populateLifestyleState` now (a) never include `player_id` in the UPDATE branch's
-- SET at all (only the INSERT branch writes it, once, on row creation) and (b) gate the UPDATE branch
-- itself on `WHERE <table>.player_id = $playerId`, so a front/lieutenant owned by someone else yields 0
-- affected rows — the UPDATE is never attempted, so BEFORE UPDATE never even fires for that row. The
-- trigger is therefore pure defense-in-depth for these two sites, and the PRIMARY guard for every write
-- site that doesn't yet know about this constraint.
--
-- ★ KNOWN INTERACTION WITH THE TEST HARNESS (disclosed, coder-flagged — see the C2 commit's
-- implementation-notes.md §Deviations "C2 — trigger vs. shared-sentinel test fixtures" for the full
-- inventory). Several EXISTING TEST-ONLY seed routes (`forensic-test.controller.ts`
-- seed-ledger-ring / seed-ring-digits / seed-soft-flag-ring / push-queue-entry / seed-effluent-state,
-- `forensic.repository.ts#seedEffluentState`) intentionally REASSIGN `player_id` on a shared
-- deterministic sentinel PK (`TEST_FRONT_ID` / `TEST_WORKSHOP_ID` / `TEST_WORKSHOP_ID_2`) across
-- different E2E spec runs, each run seeding a FRESH player onto the SAME sentinel row — an established,
-- pre-existing idiom ("mirrors seed-ledger-ring UPSERT pattern for 2× back-to-back isolation") predating
-- this migration. This trigger, applied literally and uniformly (per the controller's D6-Q3(a) ruling),
-- blocks that reassignment exactly as it blocks the attack it exists to close — the DB cannot
-- distinguish "attacker reassigns a victim's row" from "test harness re-seeds a sentinel row for a new
-- run": both are, structurally, `UPDATE … SET player_id = <different value>`. Same-commit fix: every
-- identified reassign-on-conflict test seed site is converted from UPSERT-reassign to
-- DELETE-then-INSERT (never executes the UPDATE branch at all, so the trigger never sees it) — zero
-- change to any spec's observable behavior or assertions. `lifestyle_audit_state` needed NO such
-- conversion: every existing caller always creates a FRESH `lieutenant_id` (never reuses a shared
-- sentinel PK), so no pre-existing write site ever hits this table's conflict branch at all.
--
-- R9.3: same-commit addendum to `docs/tech/09_data_model/schema_forensic.md` §3d (index/constraints) +
-- README migration-journal row + `db/schema/forensic.ts` comment annotations (Drizzle 0.36.4 has no
-- first-class trigger DSL — confirmed by `tunable_overrides.ts`, which carries no mirror of its own
-- 0033 NOTIFY trigger either; this migration file is the source of truth for the trigger DDL itself,
-- mirrored in prose in schema_forensic.md and as comments on the 4 tables' `player_id` columns).

--> statement-breakpoint

CREATE OR REPLACE FUNCTION forbid_ownership_reassignment() RETURNS trigger AS $$
BEGIN
  IF NEW.player_id IS DISTINCT FROM OLD.player_id THEN
    RAISE EXCEPTION 'W6a C2 ownership-immutability: player_id on table % cannot be reassigned (old=%, attempted new=%)',
      TG_TABLE_NAME, OLD.player_id, NEW.player_id
      USING ERRCODE = 'OW001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

DROP TRIGGER IF EXISTS ledger_entry_ring_ownership_immutable ON ledger_entry_ring;
--> statement-breakpoint
CREATE TRIGGER ledger_entry_ring_ownership_immutable
  BEFORE UPDATE ON ledger_entry_ring
  FOR EACH ROW EXECUTE FUNCTION forbid_ownership_reassignment();

--> statement-breakpoint

DROP TRIGGER IF EXISTS forensic_soft_flag_ring_ownership_immutable ON forensic_soft_flag_ring;
--> statement-breakpoint
CREATE TRIGGER forensic_soft_flag_ring_ownership_immutable
  BEFORE UPDATE ON forensic_soft_flag_ring
  FOR EACH ROW EXECUTE FUNCTION forbid_ownership_reassignment();

--> statement-breakpoint

DROP TRIGGER IF EXISTS workshop_stoichiometry_state_ownership_immutable ON workshop_stoichiometry_state;
--> statement-breakpoint
CREATE TRIGGER workshop_stoichiometry_state_ownership_immutable
  BEFORE UPDATE ON workshop_stoichiometry_state
  FOR EACH ROW EXECUTE FUNCTION forbid_ownership_reassignment();

--> statement-breakpoint

DROP TRIGGER IF EXISTS lifestyle_audit_state_ownership_immutable ON lifestyle_audit_state;
--> statement-breakpoint
CREATE TRIGGER lifestyle_audit_state_ownership_immutable
  BEFORE UPDATE ON lifestyle_audit_state
  FOR EACH ROW EXECUTE FUNCTION forbid_ownership_reassignment();
