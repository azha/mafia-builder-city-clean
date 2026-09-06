-- migration 0098: ALTER caught_exception ADD legal_case_id (04d-A C1 — additive nullable FK)
-- Canon: plan §Data model "ALTER (additive) caught_exception ADD legal_case_id uuid NULL REFERENCES legal_cases(case_id)"
-- R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md §7.15 (same-commit).
-- Retro-compat contract (RATIFIÉ 2026-06-30 #2):
--   - enum caughtExceptionStatus UNCHANGED (pending|lawyered|abandoned|silenced). No new member.
--   - legal_case_id is NULL for ABANDON/VIOLENT_SILENCE resolutions + all pre-04d-A rows.
--   - 'lawyered' status deepens meaning to "a LegalCase was opened" via this additive nullable FK.
--   - The LAWYER_UP re-wire (C4) stamps legal_case_id when resolveCaughtException opens a LegalCase.
-- Zero-regression: ADDITIVE only. No existing columns modified. The ALTER is purely additive (NULL default).

--> statement-breakpoint

-- ALTER caught_exception: add legal_case_id nullable FK → legal_cases(case_id).
-- NULL for ABANDON/VIOLENT_SILENCE + all pre-04d-A rows (retro-compat).
-- Soft link: NULL-able, no ON DELETE constraint (case deletion is rare; pre-A rows stay NULL-linked).
ALTER TABLE "caught_exception"
  ADD COLUMN IF NOT EXISTS "legal_case_id" uuid
    REFERENCES "legal_cases"("case_id");

--> statement-breakpoint

-- No GRANT needed: caught_exception already has GRANT SELECT, INSERT, UPDATE, DELETE TO app_rw (mig 0074).
-- No new index: queries on legal_case_id use the legal_cases PK lookup (point lookups, not sweeps).
