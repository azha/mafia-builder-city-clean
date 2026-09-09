-- Insurance C1: insurance_contract — per-contract active coverage state.
-- R9.3: Drizzle schema (insurance.ts) + ch09 mirror (schema_insurance.md) backported same-commit.
--
-- insurance_contract: one row per coverage contract (PROPERTY|STASH_LOSS|COURIER_ARREST|FENCE_DEFAULT).
--   type: coverage_type enum (which of the 4 coverage kinds).
--   asset_ref: nullable uuid soft-ref to the insured asset (no DB FK — asset entity is coverage-type-specific).
--   insured_value_cents: bigint — declared insured value at issuance (DD-P5: clear to player).
--   premium_cents: bigint — computed premium charged at issuance (default 0, finalized by computePremium C3).
--   walk_id: nullable uuid soft-ref to the walk that generated this contract (no DB FK — avoids circular dep).
--   counterparty_id: nullable uuid of the underwriter counterparty (linked to restraint_dispute_ring for DD-WARY C5).
--   status: contract_status (ACTIVE|LAPSED|FRAUDED, default ACTIVE).
--   issued_tick: bigint (in-game tick at issuance; default 0 for seed rows).
--   PK: id (uuid, gen_random_uuid()).
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
--
-- DD-P5: insured_value_cents + premium_cents are CLEAR transaction values (not hidden risk scalars).
-- Zero-regression (§0.2): does not modify any existing table or column.
-- Depends on: coverage_type enum (created in 0059). contract_status enum created here.

CREATE TYPE "contract_status" AS ENUM (
  'ACTIVE',
  'LAPSED',
  'FRAUDED'
);

--> statement-breakpoint

CREATE TABLE insurance_contract (
  id                    uuid            NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id             uuid            NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  type                  coverage_type   NOT NULL,
  asset_ref             uuid,
  insured_value_cents   bigint          NOT NULL,
  premium_cents         bigint          NOT NULL DEFAULT 0,
  walk_id               uuid,
  counterparty_id       uuid,
  status                contract_status NOT NULL DEFAULT 'ACTIVE',
  issued_tick           bigint          NOT NULL DEFAULT 0,
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX insurance_contract_player_idx
  ON insurance_contract (player_id);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON insurance_contract TO app_rw;
