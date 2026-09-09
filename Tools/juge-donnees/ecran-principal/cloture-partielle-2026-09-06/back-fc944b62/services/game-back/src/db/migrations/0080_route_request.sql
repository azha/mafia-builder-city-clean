-- Migration: 0080_route_request
-- System 9c C4 — DD-ROUTE-REQUEST
-- Enum:  route_request_status (NEW) — 3 members: pending | fulfilled | cancelled
-- Table: route_request (NEW) — the durable signal-of-record for a shipment request
--
-- route_request_status pgEnum:
--   3-member lifecycle (OQ-RR1 / DD-ROUTE-REQUEST):
--   pending:   enqueued by RouteRequestService.enqueueAndEmit; awaiting coordinator action.
--   fulfilled: flipped by CoordinatorExecutionService when the coordinator dispatched a courier.
--   cancelled: reserved for future cancellation (e.g., timeout sweep or manual cancel — not C4).
--
-- route_request table (§8.1, DD-ROUTE-REQUEST):
--   request_id:         uuid PK defaultRandom — stable identity of the request.
--   player_id:          uuid FK player CASCADE — the requesting player.
--   hub_id:             uuid NOT NULL — SOFT-REF to building.building_id (the distribution_hub
--                         that owns this request). NOT a FK — same discipline as corridor_debt.block_id
--                         (mig 0076 soft-ref pattern; hub may change without orphaning requests).
--   target_building_id: uuid nullable — SOFT-REF to the destination building (if specified by the
--                         producer). NULL = the coordinator script picks the target via route-selector.
--   cargo_hint_grams:   integer nullable — optional cargo hint from the producer.
--   status:             route_request_status NOT NULL DEFAULT 'pending' — lifecycle state.
--   created_at_tick:    bigint NOT NULL — game-minute of enqueue (ctx.gameMinute; deterministic;
--                         NEVER Date.now(); used for oldest-first drain order, OQ-T3).
--
--   PK:   request_id (uuid surrogate).
--   INDEX: (player_id, hub_id, status) — the primary read pattern (pending for a hub, oldest-first).
--   GRANT: SELECT, INSERT, UPDATE, DELETE ON route_request TO app_rw.
--
-- R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md same-commit (§7.20).
-- R2.2: the raw route_request rows are server-only (player surface is banded, C9).
-- C4 (determinism): created_at_tick = ctx.gameMinute (never Date.now() or Math.random).
-- hub_id / target_building_id are SOFT-REFS (NOT FK) — corridor_debt.block_id discipline.
-- Zero-regression: NEW table (no existing rows). ADDITIVE only.
-- Anti-fabrication: no [PROV-Y26Q2] scalar; every default is structural.

CREATE TYPE "route_request_status" AS ENUM ('pending', 'fulfilled', 'cancelled');

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "route_request" (
  "request_id"          uuid    NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"           uuid    NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "hub_id"              uuid    NOT NULL,
  "target_building_id"  uuid,
  "cargo_hint_grams"    integer,
  "status"              route_request_status NOT NULL DEFAULT 'pending',
  "created_at_tick"     bigint  NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "route_request_player_hub_status_idx"
  ON "route_request" ("player_id", "hub_id", "status");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "route_request" TO app_rw;
