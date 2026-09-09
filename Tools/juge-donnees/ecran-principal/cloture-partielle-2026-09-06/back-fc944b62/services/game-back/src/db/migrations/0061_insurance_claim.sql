-- Insurance C1: insurance_claim — per-claim filed claim state.
-- R9.3: Drizzle schema (insurance.ts) + ch09 mirror (schema_insurance.md) backported same-commit.
--
-- insurance_claim: one row per filed claim on an insurance contract.
--   contract_id: uuid soft-ref to the insurance_contract (no DB FK — service-level check).
--   claim_basis: claim_basis enum (the §1.4 menu of loss reasons).
--   loss_event_ref: nullable uuid soft-ref to the triggering event (building_raid/courier_shift/etc.).
--   claimed_cents: bigint — player-declared loss amount.
--   payout_cents: bigint — actual payout computed by ClaimsService.computePayout() (default 0 until PAID).
--   status: claim_status (FILED|PAID|DENIED_FRAUD, default FILED).
--   filed_tick: bigint (in-game tick at claim filing; default 0 for seed rows).
--   PK: id (uuid, gen_random_uuid()).
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
--
-- DD-P5: payout_cents is CLEAR cash (the player is credited this amount when status → PAID).
-- Zero-regression (§0.2): does not modify any existing table or column.
-- Depends on: coverage_type (0059), contract_status (0060). New enums: claim_status, claim_basis.

CREATE TYPE "claim_status" AS ENUM (
  'FILED',
  'PAID',
  'DENIED_FRAUD'
);

--> statement-breakpoint

CREATE TYPE "claim_basis" AS ENUM (
  'DEALER_TURNOVER',
  'HEAT_RAID',
  'COURIER_BETRAYAL',
  'STORAGE_OVERFLOW',
  'FENCE_FLIGHT'
);

--> statement-breakpoint

CREATE TABLE insurance_claim (
  id               uuid         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid         NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  contract_id      uuid         NOT NULL,
  claim_basis      claim_basis  NOT NULL,
  loss_event_ref   uuid,
  claimed_cents    bigint       NOT NULL,
  payout_cents     bigint       NOT NULL DEFAULT 0,
  status           claim_status NOT NULL DEFAULT 'FILED',
  filed_tick       bigint       NOT NULL DEFAULT 0,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX insurance_claim_player_idx
  ON insurance_claim (player_id);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON insurance_claim TO app_rw;
