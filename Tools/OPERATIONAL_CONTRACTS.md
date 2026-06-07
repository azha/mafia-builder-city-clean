# Phase-2 Operational API — LIVE projection & action contracts

Authoritative contract for the Unity operational-screen DTOs (building card / laundering pipeline /
dashboard). Every JSON block below is the **EXACT live response** captured by `curl` against the running
dev stack (project `mafia-clean-city`, via Traefik at `http://localhost`) after `Tools/seed_operational_demo.mjs`
stood the operational demo player up in a rich operational state. Shapes were captured, NOT guessed (the T14 lesson).

- **Auth**: every operational endpoint requires a PLAYER `Bearer` (obtain via `POST /auth/v1/signin
  {identifier,password}` → `payload.data.access_token`). Unauthenticated → `401`.
- **Envelope**: every success response is `{ response_meta, payload: { data: {…} } }`. Errors are
  `{ response_meta, payload: { error: {…} } }` (see the 404 example at the end).
- **R2.2 (information asymmetry)**: every projection leaf is a **qualitative band string**, a **boolean**, or a
  **uuid identity string** — NEVER a raw scalar (no cents / grams / ticks / heat float / purity). Unity DTOs should
  model the bands as enums.
- Captured against the operational demo player `operational_demo@example.test` (distinct from the City Map
  seeder's `citymap_demo`), operational buildings in **district 16 (Verge)**. The seeded
  entity UUIDs change on every re-run (the seeder resets + re-creates) — discover them from the seeder's printed
  output or the list endpoints (`/v1/operational/couriers`, `/v1/operational/dealers`), never hard-code them.

All endpoints are under the `/v1` major version. `<id>` / `<uuid>` are path/query params.

---

## 1. Building card — `GET /v1/operational/building/:id`

The Building Card surface. The shape is **identical for all 5 operational building types** — only
`operational_type` differs. Captured live for each type:

**lab** (Phase-2b — the building card now carries the raid/repair/risk surface too: see §13 for the captured
raid sequence + the DAMAGED / REPAIRING shapes):
```json
{
    "response_meta": {
        "request_id_echo": "061058ed-f287-4a26-be16-490d0152a710",
        "server_processed_at": "2026-06-04T00:23:11.143Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "building": "74f255d3-a555-414d-a34d-0663867b3fc8",
            "setup_state": "OPERATIONAL",
            "cover_band": "WEAK",
            "operational": true,
            "operational_type": "lab",
            "structural_state": "OPERATIONAL",
            "recently_raided": false,
            "seized_amount": "NONE",
            "repair_cost": "NONE",
            "raid_risk": "ELEVATED"
        }
    }
}
```

> The `data` shape above is the **EXACT live healthy-lab response** captured 2026-06-04 (a seeded operational
> lab fresh out of `seed_operational_demo.mjs`; `raid_risk=ELEVATED` because the cook left a MICRO heat injection
> → the lab sits in the WARM heat bucket). The four non-raid bands (`structural_state` / `recently_raided` /
> `seized_amount` / `repair_cost`) + the derived `raid_risk` are present on **every** building-card response
> regardless of type. The other four operational types return the SAME envelope; only `operational_type` differs.

**Fields / bands** (from `real-estate.projection.service.ts`):
- `building`: uuid string (identity).
- `setup_state`: `NOT_CONVERTED` \| `IN_SETUP` \| `OPERATIONAL`.
- `cover_band`: `NONE` \| `WEAK` \| `STANDARD` \| `STRONG`.
- `operational`: boolean (`setup_state === OPERATIONAL` — the function-enable flag the UI gates on).
- `operational_type`: closed enum string — one of `front_shop` \| `cash_safehouse` \| `stash` \| `lab` \|
  `grow_house` \| `refinery` \| `press_house` \| `distribution_hub` \| `office` \| `dealer_spot_front` \|
  `money_holding` (M1 uses the 5 shown above). `""` (empty) when not converted.
- `structural_state` *(Phase-2b)*: `OPERATIONAL` \| `DAMAGED` \| `REPAIRING` — the qualitative
  building_operational_state.structural_state band (the load-bearing "has this building been raided / is it under
  repair" signal). `OPERATIONAL` when no operational row / never raided.
- `recently_raided` *(Phase-2b)*: boolean — whether a `building_raid` row exists for this building (raided ≥ once).
  A flag, never a count.
- `seized_amount` *(Phase-2b)*: `NONE` \| `LOW` \| `MODERATE` \| `HIGH` — the band of the most-recent raid's
  grams_seized (R2.2 — NEVER the raw grams). `NONE` when never raided. (Cutpoints: `LOW` < 100 g, `MODERATE`
  100–399 g, `HIGH` ≥ 400 g — anchored on the 200 g Tier-1 cook.)
- `repair_cost` *(Phase-2b T3)*: `NONE` \| `MINOR` \| `MODERATE` \| `MAJOR` — the band of the cash cost to repair
  this building (R2.2 — NEVER cents). `NONE` unless the building is `DAMAGED` (no repair to pay for otherwise — so
  a `REPAIRING` building reports `NONE`). At the shipped tunables (0.3 × $15k = $4.5k) a DAMAGED M1 building is
  `MINOR`. (Cutpoints: `MINOR` < $10k, `MODERATE` $10k–$50k, `MAJOR` ≥ $50k.)
- `raid_risk` *(Phase-2b T4)*: `LOW` \| `ELEVATED` \| `HIGH` \| `IMMINENT` — the derived TELEGRAPH band (a PURE
  read-time projection from the building's CURRENT heat bucket + audit-pin presence; R2.2 — never the raw heat
  float / pin timestamp). Mapping: heat COLD→LOW / WARM→ELEVATED / HOT→HIGH / BURNING→IMMINENT, an active audit
  pin floors it at HIGH, combined by taking the HIGHER band (a pinned BURNING building is `IMMINENT`).

---

## 2. Precursors (lab) — `GET /v1/operational/precursors?building_id=<uuid>`

```json
{
    "response_meta": {
        "request_id_echo": "8ced3d97-3962-436c-9b83-76f012d25d16",
        "server_processed_at": "2026-06-04T00:23:11.258Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "building": "61ae7ebc-53ea-473c-8d1f-a07e148efe08",
            "precursor_type": "PYRALIN",
            "stock_band": "NONE",
            "has_pending_order": false,
            "has_arrived_order": true
        }
    }
}
```

> In this seeded snapshot the Pyralin order has already arrived AND the stock was consumed by the cook, so
> `stock_band=NONE`, `has_pending_order=false`, `has_arrived_order=true`. The UI must handle every combination
> (e.g. right after ordering: `has_pending_order=true`, `stock_band=NONE`; after arrival before a cook:
> `has_pending_order=false`, `has_arrived_order=true`, `stock_band` ≥ `LOW`).

**Fields / bands** (from `precursors.projection.service.ts`):
- `building`: uuid string.
- `precursor_type`: closed enum string — `PYRALIN` in M1.
- `stock_band`: `NONE` \| `LOW` \| `MEDIUM` \| `HIGH` (cut-points: 0→NONE, 1–10→LOW, 11–50→MEDIUM, >50→HIGH).
- `has_pending_order`: boolean (any order still in transit).
- `has_arrived_order`: boolean (any order delivered).

---

## 3. Lab cook — `GET /v1/operational/lab/:id`

```json
{
    "response_meta": {
        "request_id_echo": "055216a3-3c11-4245-a67f-7099c919f779",
        "server_processed_at": "2026-06-04T00:23:11.279Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "building": "61ae7ebc-53ea-473c-8d1f-a07e148efe08",
            "cook_stage_band": "DONE"
        }
    }
}
```

**Fields / bands** (from `production.projection.service.ts`):
- `building`: uuid string.
- `cook_stage_band`: `IDLE` \| `EARLY` \| `MID` \| `LATE` \| `DONE`
  (mapping: no/aborted cook→IDLE, stage_1→EARLY, stage_2(+intermediate)→MID, stage_3/stage_4→LATE, completed→DONE).

---

## 4. Product storage — `GET /v1/operational/storage/:id`

> **M1 scope note**: the storage projection is gated on the player's **operational LAB only**
> (`getOwnedOperationalLab`). For the LAB it returns the product band; for any other building (e.g. the
> dealer-spot) it returns **404 RESOURCE_NOT_FOUND** even though product physically sits there in the DB.
> The dealer-spot's product is surfaced through the dealer/selling projections, not this storage endpoint.

**Lab (200 g → MEDIUM band)** — live:
```json
{
    "response_meta": {
        "request_id_echo": "b1b6d2d8-5e64-40d1-8412-322c45a0aa9f",
        "server_processed_at": "2026-06-04T00:23:11.302Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "building": "61ae7ebc-53ea-473c-8d1f-a07e148efe08",
            "substance_type": "BRINDLE",
            "product_band": "MEDIUM"
        }
    }
}
```

**Fields / bands** (from `production.projection.service.ts`):
- `building`: uuid string.
- `substance_type`: closed enum string — `BRINDLE` in M1.
- `product_band`: `NONE` \| `LOW` \| `MEDIUM` \| `HIGH` (cut-points: 0→NONE, 1–100 g→LOW, 101–500 g→MEDIUM, >500 g→HIGH).

---

## 5. Couriers — `GET /v1/operational/couriers`

```json
{
    "response_meta": {
        "request_id_echo": "34c32887-7061-47e7-9cc2-a63e37d5b76b",
        "server_processed_at": "2026-06-04T00:23:11.344Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "couriers": [
                {
                    "courier": "00e1a6e1-1c22-42c8-8ce3-cd2d7db9b6f0",
                    "vehicle_type": "FOOT",
                    "transit_band": "ARRIVED"
                }
            ]
        }
    }
}
```

**Fields / bands** (from `distribution.projection.service.ts`) — `data.couriers` is an array of:
- `courier`: uuid string.
- `vehicle_type`: closed enum string — `FOOT` in M1.
- `transit_band`: `IDLE` \| `IN_TRANSIT` \| `ARRIVED`
  (in_transit→IN_TRANSIT, at_destination/completed-shift→ARRIVED, idle/returning→IDLE).

Empty list `{ "couriers": [] }` when the player has no couriers.

---

## 6. Dealer (single) — `GET /v1/operational/dealer/:id`

```json
{
    "response_meta": {
        "request_id_echo": "3e1ee48e-97cc-421a-94b8-29426864ffc9",
        "server_processed_at": "2026-06-04T00:23:11.366Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "dealer": "82f45b05-ae3c-41d6-b5f4-568f8c377335",
            "activity_band": "WORKING",
            "cash_band": "MODERATE"
        }
    }
}
```

## 6b. Dealers (list) — `GET /v1/operational/dealers`

```json
{
    "response_meta": {
        "request_id_echo": "e67ae651-c1a7-49fa-86c1-a74b94174aaf",
        "server_processed_at": "2026-06-04T00:23:11.387Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "dealers": [
                {
                    "dealer": "82f45b05-ae3c-41d6-b5f4-568f8c377335",
                    "activity_band": "WORKING",
                    "cash_band": "MODERATE"
                }
            ]
        }
    }
}
```

**Fields / bands** (from `selling.projection.service.ts`) — each dealer entry:
- `dealer`: uuid string.
- `activity_band`: `WORKING` \| `IDLE` \| `ABSENT` \| `COMPROMISED` (M1 produces WORKING / IDLE).
- `cash_band`: `NONE` \| `LOW` \| `MODERATE` \| `HIGH` \| `FULL` (the "dispatch a runner" float pressure;
  cut-points anchored to `deal_grams_per_tick × deal_value_cents_per_gram` = 12500 cents/tick:
  0→NONE, <25000→LOW, <100000→MODERATE, <250000→HIGH, ≥250000→FULL).

`GET /v1/operational/dealers` returns `{ dealers: [...] }` (empty list when none). The single-dealer GET is the
same entry shape; a dealer not owned by the player → 404.

> The **safehouse occupation band** (the runner-deposit target) is NOT an operational endpoint — it is read
> through the existing Phase-1 System-9 surface `GET /v1/city/district/:id/stash` (each entry carries a
> `load_bucket` ∈ `LOW`/`NOMINAL`/`HIGH`/`FULL` and the structural `slot_count`). The operational dealer
> projection deliberately does not duplicate it.

---

## 7. Laundering node — `GET /v1/operational/laundering/:nodeId`

```json
{
    "response_meta": {
        "request_id_echo": "ebef6b1b-b41e-4cc8-8f70-df3d1e3b0ea5",
        "server_processed_at": "2026-06-04T00:23:11.409Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "node": "ed3bf3f6-41bf-4cbd-b782-261df8c66006",
            "cleanliness_band": "DIRTY",
            "deviation_active": false
        }
    }
}
```

**Fields / bands** (from `laundering.projection.service.ts`):
- `node`: uuid string (the Stage-1 laundering node identity — returned by the inject action).
- `cleanliness_band`: `DIRTY` \| `PARTIAL` \| `MOSTLY_CLEAN` \| `CLEAN` (System 8's CleanlinessBucket — the
  pipeline cleanliness bar; in this snapshot a freshly-injected, not-yet-cleaned node → `DIRTY`; a released node
  → `CLEAN`).
- `deviation_active`: boolean (the host front-shop's `AUDIT_PIN_ACTIVE` — the deviation/audit badge; an inject
  over the legit baseline (250000 cents) feeds System 7's nightly tick → pin → `true`).

A node not owned by the player → 404.

---

## 7b. Laundering pipeline overview — `GET /v1/operational/laundering/:nodeId/pipeline`

The Phase-2b MULTI-NODE overview (screen_6 pipeline view). Given ANY node of a chain, it returns the WHOLE
chain — the ordered stages head→tail (Stage1→2→3→4), each with its qualitative cleanliness band + a terminal
flag + a `has_cash` presence flag. The cleanliness band is **stage_index-derived** (the canonical per-stage
progression 0.40/0.60/0.80/1.00 mapped through System 8's CleanlinessBucket), so it RISES per stage — distinct
from §7's single-node `cleanliness_band`, which is the live `cleanliness_at_output` float of THAT node (these two
projections of the head node can differ: a freshly-injected head is `DIRTY` in §7 but `PARTIAL` here).

Captured live (the seeded 4-stage chain, head = the front-shop Stage-1 node with buffered cash):
```json
{
    "response_meta": {
        "request_id_echo": "f22eefd3-9350-4661-98dd-d94305ec2274",
        "server_processed_at": "2026-06-04T03:02:17.640Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "stages": [
                { "node": "e9bc075b-b34a-4377-a13a-39c3e9cc259d", "cleanliness_band": "PARTIAL",      "terminal": false, "has_cash": true  },
                { "node": "1f423931-6cf6-4ca9-b060-191e4cbfb52e", "cleanliness_band": "MOSTLY_CLEAN", "terminal": false, "has_cash": false },
                { "node": "ebba6102-bcdd-4b8d-bcef-a55be581e530", "cleanliness_band": "MOSTLY_CLEAN", "terminal": false, "has_cash": false },
                { "node": "69924194-11ba-4e8d-91e6-0f52c80ad6f3", "cleanliness_band": "CLEAN",        "terminal": true,  "has_cash": false }
            ]
        }
    }
}
```

**Fields / bands** (from `laundering.projection.service.ts` — `LaunderingPipelineProjection`):
- `stages`: the ordered chain head→tail (by `stage_index`). Chain LENGTH = `stages.length` (a structural ordinal
  derived client-side — NOT surfaced as a raw number field, so the whole payload stays strings + booleans; R2.2).
- `stages[].node`: uuid string (the stage node identity).
- `stages[].cleanliness_band`: `DIRTY` \| `PARTIAL` \| `MOSTLY_CLEAN` \| `CLEAN` (rises per stage — Stage1 `PARTIAL`
  /0.40 → Stage4 `CLEAN`/1.00; the stage_index-derived pipeline cleanliness, never the raw float).
- `stages[].terminal`: boolean — `true` for the chain's TERMINAL/release stage (the node with no outgoing edge —
  the one that credits the wallet). Exactly one stage is terminal in a linear chain.
- `stages[].has_cash`: boolean — whether cash is buffered AT this stage (a presence flag only; never the raw cents).

A node not owned by the player → 404. Querying from a mid-chain node returns the SAME whole-chain payload (the
recursive walk reaches both the head and the tail).

---

## 8. Action endpoints (request shapes)

All actions require a PLAYER `Bearer` and an `Idempotency-Key` header. Bodies are JSON. Responses are the
success envelope wrapping the `data` shown.

| Action | Method + path | Request body | Success `data` | Code |
|---|---|---|---|---|
| **Purchase** building | `POST /v1/operational/building/purchase` | `{ "block_id": <int>, "building_type_target": "lab"\|"stash"\|"front_shop"\|"cash_safehouse"\|"dealer_spot_front" }` | `{ "building_id": "<uuid>" }` | 201 |
| **Convert** building | `POST /v1/operational/building/:id/convert` | `{ "operational_type": "<m1 type>", "cover_quality": "weak"\|"standard"\|"strong" }` | `{ "converted": true }` | 200 |
| **Order** precursors | `POST /v1/operational/precursors/order` | `{ "building_id": "<uuid>", "precursor_type": "PYRALIN", "quantity_units": <int> }` | `{ "order_id": "<uuid>" }` | 201 |
| **Cook** (start) | `POST /v1/operational/lab/:id/cook` | `{}` (empty — the lab id is the path param) | `{ "cook_session_id": "<uuid>" }` | 201 |
| **Dispatch** courier | `POST /v1/operational/distribution/dispatch` | `{ "from_building_id": "<uuid>", "to_building_id": "<uuid>", "cargo_grams": <int> }` | `{ "courier_id": "<uuid>", "route_id": "<uuid>", "shift_id": "<uuid>" }` | 201 |
| **Assign** dealer | `POST /v1/operational/dealer/assign` | `{ "dealer_spot_id": "<uuid>", "lek_tile_id": <int> }` | `{ "dealer_id": "<uuid>" }` | 201 |
| **Collect** (runner) | `POST /v1/operational/dealer/:id/collect` | `{ "safehouse_id": "<uuid>" }` | `{ "dealer_id": "<uuid>", "safehouse_id": "<uuid>" }` | 200 |
| **Inject** (launder) | `POST /v1/operational/laundering/inject` | `{ "front_shop_id": "<uuid>", "safehouse_id": "<uuid>", "amount_cents": <int> }` | `{ "front_shop_id": "<uuid>", "safehouse_id": "<uuid>", "node_id": "<uuid>", "deviation": <bool> }` | 200 |
| **Add stage** (pipeline) | `POST /v1/operational/laundering/stage` | `{ "from_node_id": "<uuid>", "building_id": "<uuid>" }` | `{ "from_node_id": "<uuid>", "node_id": "<uuid>", "building_id": "<uuid>", "stage_index": <int> }` | 201 |

Notes:
- The mutating actions return **ids / a flag only** — never the raw cents debited (R2.2; the wallet balance is
  surfaced by the existing economy projection, not these).
- `purchase` / `convert` debit the wallet (`economy_states.cash_cents`); insufficient cash → `409`. A non-free
  block → `409`. A bad type / amount → `422`. A building not owned / not operational → `404`.
- `inject.deviation` is `true` when `amount_cents` exceeds the front-shop legit baseline (250000 cents) — that
  also flips the node projection's `deviation_active` after System 7's nightly tick.
- The cleaned cash reaches the wallet asynchronously on the `LAUNDER_OUTPUT` tick (`wallet += amount × (1 −
  dwell_tax_rate)`, `dwell_tax_rate = 0.10`), once System 8 cleans the node to the clean band — not synchronously
  in the inject response.
- `addStage` appends ONE downstream stage onto the pipeline TAIL (the linear-chain invariant). `from_node_id` not
  the player's / `building_id` not a player-owned OPERATIONAL building → `404`. `from_node_id` is NOT the tail
  (already has a downstream stage) → `409`. The `building_id` already hosts a laundering node → `409` (one node per
  building). The new node becomes the new TERMINAL/release node until a further stage is appended.

---

## 9. Error envelope (example) — `GET /v1/operational/storage/:dealerSpotId` → 404

The non-success envelope shape (status mirrors `http_status`):
```json
{
    "response_meta": {
        "request_id_echo": "d8a4540f-0272-4778-b5ef-5af6e5d2b748",
        "server_processed_at": "2026-06-04T00:26:05.401Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "error": {
            "code": "RESOURCE_NOT_FOUND",
            "http_status": 404,
            "user_facing_i18n_key": "error.resource.not_found",
            "payload_vars": null,
            "details": null,
            "message": "No such operational building for this player: 32daf382-b89f-4022-b136-77e205bb8ea0.",
            "trace": {
                "request_id_echo": "d8a4540f-0272-4778-b5ef-5af6e5d2b748",
                "correlation_id": null,
                "trace_id": null,
                "server_emitted_at": "2026-06-04T00:26:05.401Z"
            },
            "retryable_class": "NEVER",
            "retry_after_s": null
        }
    }
}
```

---

## 10. Band enum summary (for the Unity DTO enums)

| Projection | Field | Enum values |
|---|---|---|
| building card | `setup_state` | `NOT_CONVERTED`, `IN_SETUP`, `OPERATIONAL` |
| building card | `cover_band` | `NONE`, `WEAK`, `STANDARD`, `STRONG` |
| building card | `operational_type` | `front_shop`, `cash_safehouse`, `stash`, `lab`, `grow_house`, `refinery`, `press_house`, `distribution_hub`, `office`, `dealer_spot_front`, `money_holding` |
| building card *(Phase-2b)* | `structural_state` | `OPERATIONAL`, `DAMAGED`, `REPAIRING` |
| building card *(Phase-2b)* | `recently_raided` | boolean |
| building card *(Phase-2b)* | `seized_amount` | `NONE`, `LOW`, `MODERATE`, `HIGH` |
| building card *(Phase-2b T3)* | `repair_cost` | `NONE`, `MINOR`, `MODERATE`, `MAJOR` |
| building card *(Phase-2b T4)* | `raid_risk` | `LOW`, `ELEVATED`, `HIGH`, `IMMINENT` |
| precursors | `stock_band` | `NONE`, `LOW`, `MEDIUM`, `HIGH` |
| precursors | `precursor_type` | `PYRALIN` (M1) |
| lab cook | `cook_stage_band` | `IDLE`, `EARLY`, `MID`, `LATE`, `DONE` |
| storage | `product_band` | `NONE`, `LOW`, `MEDIUM`, `HIGH` |
| storage | `substance_type` | `BRINDLE`, `CRICK` (Phase-2b vector #2) |
| storage *(Phase-2b T5 cold-chain)* | `temperature_status` | `OPTIMAL_COLD`, `MODERATE`, `HOT`, `null` (non-cold-chain → null) |
| storage *(Phase-2b T5 cold-chain)* | `degrading` | boolean |
| couriers | `transit_band` | `IDLE`, `IN_TRANSIT`, `ARRIVED` |
| couriers | `vehicle_type` | `FOOT`, `BIKE`, `CAR`, `REFRIGERATED_VAN` |
| couriers *(Phase-2b T5 cold-chain)* | `temperature_status` | `OPTIMAL_COLD`, `MODERATE`, `HOT`, `null` (non-cold-chain / not in transit → null) |
| couriers *(Phase-2b T5 cold-chain)* | `degrading` | boolean |
| dealer | `activity_band` | `WORKING`, `IDLE`, `ABSENT`, `COMPROMISED` |
| dealer | `cash_band` | `NONE`, `LOW`, `MODERATE`, `HIGH`, `FULL` |
| laundering node | `cleanliness_band` | `DIRTY`, `PARTIAL`, `MOSTLY_CLEAN`, `CLEAN` |
| laundering node | `deviation_active` | boolean |
| (Phase-1 System-9 stash) | `load_bucket` | `LOW`, `NOMINAL`, `HIGH`, `FULL` — via `GET /v1/city/district/:id/stash` |
| wallet | `wallet_band` | `BROKE`, `LOW`, `MODERATE`, `HIGH`, `FLUSH` — via `GET /v1/economy/wallet` |

---

## 11. Wallet band — `GET /v1/economy/wallet`

The "encaisser" payoff of the M1 loop — the headline element of the **Home Dashboard** (screen_1).
JWT-gated (Bearer). The economy projection surfaces the player's cash as a **qualitative band only**
— never the raw `cash_cents` (R2.2; the cents live in `economy_states.cash_cents` server-side).

Captured live (demo player in the seeded terminal state — laundering has credited clean cash, so the
band is non-`BROKE`):
```json
{
    "response_meta": {
        "request_id_echo": "5ecae0e8-37a5-474f-9460-22a07d9eb500",
        "server_processed_at": "2026-06-04T01:06:14.854Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": {
        "data": {
            "wallet_band": "FLUSH"
        }
    }
}
```

**Fields / bands** (from the economy wallet projection):
- `wallet_band`: `BROKE` \| `LOW` \| `MODERATE` \| `HIGH` \| `FLUSH` (a closed qualitative band over the
  player's `cash_cents`; ascending — `BROKE` = empty, `FLUSH` = the richest band).

**Auth behaviour:**
- No `Bearer` → `401` (`{ payload: { error: { … } } }`).
- A valid `Bearer` but no player row for the account → `404 RESOURCE_NOT_FOUND` (same error envelope as §9).

---

## 12. Player identity — `GET /v1/me`

The projected player (for an optional dashboard header). JWT-gated (Bearer). Captured live:
```json
{
    "response_meta": { "...": "..." },
    "payload": {
        "data": {
            "account_id": "019e9044-9415-71c6-a391-909668014443",
            "handle": "operational_demo",
            "email": "operational_demo@example.test",
            "lifecycle_state": "ACTIVE",
            "locale": "en"
        }
    }
}
```

**Fields** — `data`:
- `account_id`: uuid string (the account identity).
- `handle`: string (the player's display handle / callsign).
- `email`: string.
- `lifecycle_state`: `ACTIVE` \| … (account lifecycle).
- `locale`: ICU locale string (`en`, …). No cash / no scalar (R2.2).

---

## 13. Raid / repair — the DAMAGED building-card surface + `POST /v1/operational/building/:id/repair` (Phase-2b)

The Phase-2b raid consequence loop (vector #1) adds a raid/repair/risk surface to the **same** building-card
projection (§1) — `structural_state`, `recently_raided`, `seized_amount`, `repair_cost`, `raid_risk`. Plus a
PLAYER-FACING recovery action: **repair** a DAMAGED building. Every JSON below is the **EXACT live response**
captured by `curl` 2026-06-04 against the running dev stack after a TEST-HOOK raid drove a seeded operational lab
DAMAGED (shapes captured, NOT guessed). The repair endpoint is JWT-gated + idempotent (the same convention as the
other mutating action endpoints, §8).

> **RE-VERIFIED 2026-06-04 (T7 Step 0)** against the live stack after a fresh `seed_operational_demo.mjs` run: the
> DAMAGED card (`structural_state=DAMAGED`, `recently_raided=true`, `seized_amount=MODERATE`, `repair_cost=MINOR`,
> `raid_risk=HIGH` — the audit pin floored it), `POST …/repair` → **200 `{ "repairing": true }`**, the post-repair
> card (`structural_state=REPAIRING`, `repair_cost=NONE`, `raid_risk=HIGH`, `recently_raided=true`,
> `seized_amount=MODERATE`), and a second repair on the REPAIRING building → **409 `RESOURCE_STATE_CONFLICT`**. All
> shapes match the captures below verbatim — the `RepairResultDto { bool repairing }` parse is correct as shipped.

### 13a. How to PRODUCE a DAMAGED building (the seeder / curl recipe — no-auth, non-prod test hooks)

A raid is normally produced by System 4's 12h precinct review, which is not deterministically reachable through the
advance harness. Use the production-gated `/v1/_test/*` raid hook (the same category as `advance`/`heat-inject` —
no auth, NODE_ENV != 'production', `Idempotency-Key` required):

1. **Raid** the block a product-holding operational building sits on (the lab/dealer-spot hold product):
   `POST /v1/_test/citysim/raid?player_id=<uuid>&block_id=<int>&district_id=<int>` (Idempotency-Key). This EMITS a
   canonical `RaidPlannedEvent` (the same event System 4 emits). `block_id` = `SELECT block_id FROM buildings WHERE
   building_id='<lab>'` (the seeder places each building on a distinct free district-16 block). Response:
   `{ "emitted": true, "playerId": "<uuid>", "targetBlockId": <int>, "districtId": <int> }`.
2. **Advance 1 tick** so the buffered raid flushes on the MINUTE/13 `RAID_EXECUTION` tick:
   `POST /v1/_test/citysim/advance?ticks=1&player_id=<uuid>` (Idempotency-Key). The raid then seizes the
   product_storage of EVERY product-holding operational building on that block → those buildings flip
   `structural_state='damaged'` + a `building_raid` row is inserted (grams_seized = the seized grams).

To drive `raid_risk` UP deterministically (it derives from heat bucket + audit pin):
- **HIGH**: seed an active audit pin — `UPDATE buildings SET audit_pin_expires_at = now() + interval '1 day' WHERE
  building_id='<id>';` (System 7 pin floors the band at HIGH).
- **IMMINENT**: also drive heat to the BURNING bucket — `UPDATE buildings SET heat = 0.95 WHERE building_id='<id>';`
  (or fire `POST /v1/_test/citysim/heat-inject?...&magnitude=MEDIUM` repeatedly + advance to flush onto
  buildings.heat). All four `raid_risk` bands were confirmed reachable: COLD→`LOW`, WARM→`ELEVATED` (the seeded
  default after the cook), audit-pin→`HIGH`, BURNING+pin→`IMMINENT`.

### 13b. Building card — DAMAGED (captured live)

After step 2 the lab card reads (lab had 200 g cooked − 60 g ferried = 140 g → seized → `MODERATE` band; the
shipped repair cost 0.3 × $15k = $4.5k → `MINOR` band):
```json
{
    "building": "74f255d3-a555-414d-a34d-0663867b3fc8",
    "setup_state": "OPERATIONAL",
    "cover_band": "WEAK",
    "operational": true,
    "operational_type": "lab",
    "structural_state": "DAMAGED",
    "recently_raided": true,
    "seized_amount": "MODERATE",
    "repair_cost": "MINOR",
    "raid_risk": "ELEVATED"
}
```

### 13c. Repair — `POST /v1/operational/building/:id/repair`

| Action | Method + path | Request body | Success `data` | Code |
|---|---|---|---|---|
| **Repair** building | `POST /v1/operational/building/:id/repair` | `{}` (empty — the building id is the path param) | `{ "repairing": true }` | 200 |

Captured live (a JWT Bearer + an `Idempotency-Key` header; the lab was DAMAGED, wallet FLUSH so the cash debit
succeeds):
```json
{
    "response_meta": {
        "request_id_echo": "1bc07086-7c80-4e10-956b-14a8c74e1857",
        "server_processed_at": "2026-06-04T13:02:22.670Z",
        "api_version": 1,
        "correlation_id_echo": null
    },
    "payload": { "data": { "repairing": true } }
}
```

Notes:
- 200 (not 201 — a state mutation on an existing building, not a creation). DEBITS `economy_states.cash_cents` by
  the grounded repair cost (the raw post-debit cents are NOT forwarded — R2.2; the ack is just `{ repairing: true }`).
- Requires a PLAYER `Bearer` (no token → `401`) + an `Idempotency-Key` (a retried repair replays — no double-debit).
- A building that is not the player's / not converted → `404`. **Not DAMAGED** (already OPERATIONAL or REPAIRING) →
  `409 RESOURCE_STATE_CONFLICT`. Insufficient cash → `409`.
- Atomically transitions `structural_state` → `'repairing'`; the `OPERATIONAL_REPAIR` tick later flips it back to
  `'operational'`.

### 13d. Building card — REPAIRING (immediately after a successful repair, captured live)

The same building card right after the repair call returns:
```json
{
    "building": "74f255d3-a555-414d-a34d-0663867b3fc8",
    "setup_state": "OPERATIONAL",
    "cover_band": "WEAK",
    "operational": true,
    "operational_type": "lab",
    "structural_state": "REPAIRING",
    "recently_raided": true,
    "seized_amount": "MODERATE",
    "repair_cost": "NONE",
    "raid_risk": "ELEVATED"
}
```

> `structural_state` is now `REPAIRING`; `repair_cost` drops to `NONE` (no fresh repair to pay for — the repair is
> already underway). `recently_raided` stays `true` + `seized_amount` keeps the historical seizure band (the raid
> ledger is not erased by the repair). A second repair on a REPAIRING building → `409 RESOURCE_STATE_CONFLICT`
> ("building … is not DAMAGED (structural_state='repairing') — only a damaged building can be repaired.").

### 13e. Affordability (client-side gate — qualitative only, R2.2)

The building-card projection does NOT carry the player's cash. The Repair button's "can I afford this?" gate is a
**qualitative band comparison** between `repair_cost` (this card) and `wallet_band` (§11, `GET /v1/economy/wallet`):
the client maps each `repair_cost` band to the minimum `wallet_band` that can pay for it and disables Repair when
the wallet sits below that floor. No raw cents are ever compared client-side (R2.2). A definitive affordability
verdict still lives server-side (an unaffordable repair → `409` even if the client allowed it).

---

## 14. Cold chain (Crick) — `GET /v1/operational/storage/:id` + `GET /v1/operational/couriers` (Phase-2b vector #2 T5)

The Phase-2b vector #2 (substances / **Crick**) adds a **cold chain**: a qualitative `temperature_status` band
(`OPTIMAL_COLD` \| `MODERATE` \| `HOT` — R2.2, NEVER a raw °C) + a `degrading` boolean, surfaced on **two EXISTING**
projections — there is **NO** `/v1/operational/crick/...` endpoint (do not invent one). Every JSON below is the
**EXACT live response** captured by `curl` 2026-06-05 against the running dev stack after standing up a Crick
refinery + 200 g Crick + a Crick courier (shapes captured, NOT guessed — the T14 lesson).

### 14a. Storage — `GET /v1/operational/storage/:id`

Scope: **only COOK buildings** (a `lab` → BRINDLE, a `refinery` → CRICK). A non-cook building (stash, dealer-spot,
front-shop, safehouse) → **`404 RESOURCE_NOT_FOUND`** (out of scope — the storage projection is cook-only).

**refinery holding 200 g Crick** (cold-by-nature — `temperature_status=OPTIMAL_COLD`, `degrading=false`):
```json
{
    "response_meta": { "request_id_echo": "dfbf2bc3-c6e7-4332-8053-6fe0efa66586", "server_processed_at": "2026-06-05T05:17:20.300Z", "api_version": 1, "correlation_id_echo": null },
    "payload": {
        "data": {
            "building": "1a4c2e54-fc9e-4429-aa74-54494eb32aa3",
            "substance_type": "CRICK",
            "product_band": "MEDIUM",
            "temperature_status": "OPTIMAL_COLD",
            "degrading": false
        }
    }
}
```

**lab holding Brindle** (no cold chain — `temperature_status=null`, `degrading=false`):
```json
{
    "payload": {
        "data": {
            "building": "22d8f060-02a1-4ff6-a5c7-c08a2a672690",
            "substance_type": "BRINDLE",
            "product_band": "NONE",
            "temperature_status": null,
            "degrading": false
        }
    }
}
```

**Fields / bands** — `data`:
- `building`: uuid string (identity).
- `substance_type`: `BRINDLE` (lab) \| `CRICK` (refinery) — the substance the cook building produces.
- `product_band`: `NONE` \| `LOW` \| `MEDIUM` \| `HIGH` — the stored-grams band (R2.2 — never raw grams; 200 g → `MEDIUM`).
- `temperature_status` *(cold-chain T5)*: `OPTIMAL_COLD` \| `MODERATE` \| `HOT` \| `null`. `null` when the substance
  has **no cold chain** (Brindle always; a refinery is cold-by-nature so Crick reads `OPTIMAL_COLD`). NEVER a raw °C.
- `degrading` *(cold-chain T5)*: boolean — whether the held product is actively losing grams to a warm chain (a
  refinery's cold Crick → `false`). A flag, never a rate.

### 14b. Couriers — `GET /v1/operational/couriers` (cold-chain fields added)

The couriers list (§5) now carries `temperature_status` + `degrading` per courier. An **IN_TRANSIT Crick** cargo on
a warm vehicle reads `HOT` + `degrading=true`; on a `REFRIGERATED_VAN` it reads `OPTIMAL_COLD` + `degrading=false`;
a non-cold-chain cargo or a courier **not in transit** (ARRIVED / IDLE) reads `null` + `false`.

```json
{
    "payload": {
        "data": {
            "couriers": [
                { "courier": "a75a85c8-0566-4fc3-b94d-940d16c2b886", "vehicle_type": "FOOT",            "transit_band": "IN_TRANSIT", "temperature_status": "HOT",         "degrading": true  },
                { "courier": "d04e57da-3110-440f-a49b-c3a9d493b6f9", "vehicle_type": "FOOT",            "transit_band": "ARRIVED",    "temperature_status": null,          "degrading": false }
            ]
        }
    }
}
```

The SAME IN_TRANSIT Crick courier after `UPDATE courier SET vehicle_type='refrigerated_van'` (vehicle enum:
`foot` \| `bike` \| `car` \| `refrigerated_van`):
```json
{ "courier": "a75a85c8-0566-4fc3-b94d-940d16c2b886", "vehicle_type": "REFRIGERATED_VAN", "transit_band": "IN_TRANSIT", "temperature_status": "OPTIMAL_COLD", "degrading": false }
```

**Fields / bands** — each `data.couriers[]` entry:
- `courier`: uuid string. `vehicle_type`: `FOOT` \| `BIKE` \| `CAR` \| `REFRIGERATED_VAN`. `transit_band`: `IDLE` \|
  `IN_TRANSIT` \| `ARRIVED` (§5).
- `temperature_status` *(cold-chain T5)*: `OPTIMAL_COLD` \| `MODERATE` \| `HOT` \| `null` — `null` for a
  non-cold-chain cargo or a courier not in transit. A `REFRIGERATED_VAN` keeps a Crick cargo `OPTIMAL_COLD`; a
  `FOOT`/`BIKE`/`CAR` carrying Crick in transit reads `HOT`. NEVER a raw °C.
- `degrading` *(cold-chain T5)*: boolean — `true` when an in-transit cold-chain cargo is on a warm vehicle.

### 14c. How to PRODUCE a Crick cold-chain refinery (the seeder / curl recipe)

Mirrors the Brindle lab flow (§8) but on a `refinery`, with the Crick precursor + a Crick-tagged cook:
1. **Purchase** a building targeting a refinery: `POST /v1/operational/building/purchase
   { block_id, building_type_target: "refinery" }` → `{ building_id }` (201).
2. **Convert** to a refinery: `POST /v1/operational/building/:id/convert
   { operational_type: "refinery", cover_quality: "weak", cold_storage_capable: false }` → `{ converted: true }`
   (200). A refinery is **cold-by-nature** regardless of the `cold_storage_capable` flag. SQL-fast-forward the setup
   (`UPDATE building_operational_state SET setup_remaining_ticks=1 …` → advance 1) → operational.
3. **Order** the Crick precursor: `POST /v1/operational/precursors/order
   { building_id, precursor_type: "VERDANT_ROOT_EXTRACT", quantity_units: 2 }` → `{ order_id }` (201). (The exact
   uppercase value the API accepts is `VERDANT_ROOT_EXTRACT` — the Crick analogue of Brindle's `PYRALIN`.)
   SQL-fast-forward the arrival (`UPDATE precursor_order SET arrives_at_tick=<clock+1> …` → advance 1).
4. **Cook** Crick: `POST /v1/operational/lab/:id/cook { substance: "crick" }` → `{ cook_session_id }` (201). NOTE:
   the cook endpoint is `/lab/:id/cook` even for a refinery; omitting `substance` defaults to brindle. Crick is a
   **single-stage** cook (`cook_session.current_stage='stage_1'` is the only/final stage; the `cook_session`
   building column is `lab_building_id`). SQL-fast-forward the completion
   (`UPDATE cook_session SET current_stage='stage_1', stage_started_at_tick=0 WHERE cook_session_id=… ` → advance 1)
   → the MINUTE/8 cook-advance tick completes it → 200 g Crick in the refinery `product_storage`
   (`substance_type='crick'`) → storage reads `product_band=MEDIUM, temperature_status=OPTIMAL_COLD, degrading=false`.

To produce an IN_TRANSIT Crick courier: dispatch from the refinery
(`POST /v1/operational/distribution/dispatch { from_building_id: <refinery>, to_building_id: <other>, cargo_grams }`)
— the courier stays `IN_TRANSIT` until its `courier_shift` is fast-forwarded (`UPDATE courier_shift SET
started_at_tick=0 …` → advance 1 ARRIVES it). While IN_TRANSIT on a FOOT courier the cargo reads `HOT` / `degrading`.

---

## 16. Ash luxury channel — specialized_lab tier + refining + purity + appointment (Phase-2c vector #2c T12)

The Phase-2c vector #2c (substances / **Ash**) adds a **luxury channel** that is mechanically distinct from
Brindle/Crick/Hush: the player builds/owns a **`specialized_lab`** (a `lab_tier` 1..3 lever, upgraded via an
endpoint), cooks Ash 3-stage with **refining passes** (more passes = longer cook = higher purity), the batch carries
a deterministic **purity** surfaced as a qualitative band, and Ash sells **only** through an **appointment** at a
Glass-district venue (book → SCHEDULED → honor → HONORED, or it EXPIRES) — there is **no lek/dealer-spot selling for
Ash**. Every JSON below is the **EXACT live response** captured by `curl` 2026-06-06 against the running dev stack
after standing up a specialized_lab (Tier-2) + a 200 g Ash batch at CRYSTALLINE purity + a booked appointment
(shapes captured, NOT guessed — the T14 lesson). All surfaces are qualitative **bands** (R2.2 — never the raw
`purity_score` / cents / multiplier / tick).

### 16a. Building card — `GET /v1/operational/building/:id` (the `lab_tier_band` field added)

The building-card projection (§1) now carries **`lab_tier_band`** on **every** response — `NONE` for any
non-specialized_lab building; `BASIC` / `REFINED` / `MASTER` for a specialized_lab at tier 1 / 2 / 3.

**specialized_lab at Tier-1** (fresh build → `lab_tier_band=BASIC`):
```json
{
    "building": "f7cc748d-f34d-4796-9965-a07c21eef2ef",
    "setup_state": "OPERATIONAL",
    "cover_band": "WEAK",
    "operational": true,
    "operational_type": "specialized_lab",
    "cold_storage_capable": false,
    "structural_state": "OPERATIONAL",
    "recently_raided": false,
    "seized_amount": "NONE",
    "repair_cost": "NONE",
    "lab_tier_band": "BASIC",
    "raid_risk": "LOW"
}
```

The SAME lab after one `POST …/upgrade-tier` (→ Tier-2 → `lab_tier_band=REFINED`):
```json
{
    "building": "f7cc748d-f34d-4796-9965-a07c21eef2ef",
    "operational_type": "specialized_lab",
    "lab_tier_band": "REFINED",
    "raid_risk": "LOW"
}
```

**Fields / bands** — added by Phase-2c:
- `lab_tier_band` *(Ash T5)*: `NONE` \| `BASIC` \| `REFINED` \| `MASTER` — the specialized_lab's `lab_tier` (1/2/3) as a
  closed band (R2.2 — NEVER the raw tier int). `NONE` for any non-specialized_lab building (no tier lever). A higher
  band → a purer Ash batch. The Building Card's Upgrade-tier button gates on this (BASIC/REFINED → upgradable; MASTER →
  capped, no button).

### 16b. Upgrade lab tier — `POST /v1/operational/building/:id/upgrade-tier`

| Action | Method + path | Request body | Success `data` | Code |
|---|---|---|---|---|
| **Upgrade lab tier** | `POST /v1/operational/building/:id/upgrade-tier` | `{}` (empty — the building id is the path param) | `{ "upgraded": true }` | 200 |

Captured live (a JWT Bearer + an `Idempotency-Key`; the lab was Tier-1, wallet FLUSH so the cash debit succeeds):
```json
{ "payload": { "data": { "upgraded": true } } }
```

Notes:
- 200 (a state mutation on the existing building, not a creation). DEBITS `economy_states.cash_cents` by the grounded
  upgrade cost (the raw post-debit cents are NOT forwarded — R2.2; the ack is just `{ upgraded: true }`; the player
  surface is the next card's `lab_tier_band`).
- Requires a PLAYER `Bearer` (no token → `401`) + an `Idempotency-Key` (a retried upgrade does not double-debit).
- A building that is not the player's / not converted → `404`. **Not a specialized_lab** → `409` (WRONG_TYPE).
  **Already at `specialized_lab.max_tier`** (Tier-3 / MASTER) → `409` (AT_CAP). Insufficient cash → `409`.
- Affordability gate (client-side, qualitative — R2.2): the Building Card maps the upgrade to a minimum `wallet_band`
  (≥ `MODERATE`) and disables Upgrade below that floor; the definitive verdict still lives server-side (`409`).

### 16c. Ash cook with refining passes — `POST /v1/operational/lab/:id/cook`

The cook endpoint (§8) accepts an Ash overload body `{ substance: "ash", refining_passes: <int 0..max> }` (the path is
`/lab/:id/cook` even for a specialized_lab — the building id selects the type; omitting `substance` defaults to brindle).
`refining_passes` is the time↔purity lever (more passes lengthen the 3-stage Ash cook AND raise the batch purity).

| Action | Method + path | Request body | Success `data` | Code |
|---|---|---|---|---|
| **Cook Ash** | `POST /v1/operational/lab/:id/cook` | `{ "substance": "ash", "refining_passes": <int 0..max> }` | `{ "cook_session_id": "<uuid>" }` | 201 |

Notes:
- The Ash precursor is `glass_lily` (the Crick/Brindle analogue): `POST /v1/operational/precursors/order
  { building_id, precursor_type: "GLASS_LILY", quantity_units: 2 }` → `{ order_id }` (201).
- Ash is a **3-stage** cook (`cook_session.current_stage` walks `stage_1 → stage_2 → stage_3` then completes; the cook
  building column is `lab_building_id`). Each refining pass lengthens **stage_1**. `refining_passes` &gt; the substance's
  max → `422`; a non-zero `refining_passes` on a non-Ash substance → `422`.
- SQL-fast-forward the completion: `UPDATE cook_session SET current_stage='stage_3', stage_started_at_tick=-100000
  WHERE cook_session_id=…` → **advance 8 ticks** (the per-stage duration is 3000 ticks, so a deep-past stage clock +
  enough ticks to land on a `MINUTE/8` cook-advance boundary completes it; a single +1 can miss the cadence) → 200 g
  Ash in the specialized_lab `product_storage` (`substance_type='ash'`) + the purity stamp on a `batch_purity` row.

### 16d. Product storage — `GET /v1/operational/storage/:id` (the `purity_band` field added)

The storage projection (§4 / §14) now carries **`purity_band`** for an Ash batch — `CUT` \| `STANDARD` \| `PURE` \|
`CRYSTALLINE`, or `null` for a non-Ash substance / an Ash lab with no completed cook yet.

**specialized_lab holding 200 g Ash at CRYSTALLINE purity** (Tier-2 base + 2 refining passes → score 75 → CRYSTALLINE):
```json
{
    "building": "f7cc748d-f34d-4796-9965-a07c21eef2ef",
    "substance_type": "ASH",
    "product_band": "MEDIUM",
    "temperature_status": null,
    "degrading": false,
    "purity_band": "CRYSTALLINE"
}
```

**Fields / bands** — added by Phase-2c:
- `substance_type`: `ASH` for a specialized_lab (joins `BRINDLE` / `CRICK` from §14).
- `purity_band` *(Ash T9)*: `CUT` \| `STANDARD` \| `PURE` \| `CRYSTALLINE` \| `null`. The FORMAL projection of the batch's
  deterministic `purity_score` stamped at cook completion (R2.2 — the raw score NEVER escapes). `null` for a non-Ash
  substance (Brindle/Crick/Hush carry no purity grade) AND for an Ash lab with no completed cook. A purer batch sells at
  a higher honor margin. Ascending grade: CUT &lt; STANDARD &lt; PURE &lt; CRYSTALLINE.
- `temperature_status` is `null` for a specialized_lab (Ash has no cold chain).

### 16e. Appointment — book / honor / projection

The ONLY Ash sale path (Ash never lek/dealer-sells — the luxuryChannel trait). Book at a player-owned **Glass-district**
venue → SCHEDULED; honor (with Ash physically at the venue) → HONORED at the luxury margin × the batch's purity
multiplier; an un-honored booking EXPIRES after the window.

| Action | Method + path | Request body | Success `data` | Code |
|---|---|---|---|---|
| **Book appointment** | `POST /v1/operational/appointment` | `{ "glass_venue_building_id": "<uuid>" }` | `{ "appointment_id": "<uuid>" }` | 201 |
| **Honor appointment** | `POST /v1/operational/appointment/:id/honor` | `{}` (empty — the appointment id is the path param) | `{ "honored": true }` | 200 |
| **Appointment projection** | `GET /v1/operational/appointment/:id` | — | `{ appointment_id, status, payout_band }` | 200 |

**Book** (201) → `{ "payload": { "data": { "appointment_id": "a9a08f56-72f7-464f-a045-e2e251d1c4b7" } } }`.

**Appointment projection — SCHEDULED** (right after booking, captured live):
```json
{ "payload": { "data": { "appointment_id": "a9a08f56-72f7-464f-a045-e2e251d1c4b7", "status": "SCHEDULED", "payout_band": "PENDING" } } }
```

**Honor** (200) → `{ "payload": { "data": { "honored": true } } }`.

**Appointment projection — HONORED** (after honoring a CRYSTALLINE batch → PREMIUM payout, captured live):
```json
{ "payload": { "data": { "appointment_id": "a9a08f56-72f7-464f-a045-e2e251d1c4b7", "status": "HONORED", "payout_band": "PREMIUM" } } }
```

**Appointment projection — EXPIRED** (a SCHEDULED booking swept past its window, captured live):
```json
{ "payload": { "data": { "appointment_id": "47d506e4-9ede-4f80-a76f-90a39fb3878c", "status": "EXPIRED", "payout_band": "NONE" } } }
```

**Fields / bands** — `data`:
- `appointment_id`: uuid string (identity — returned by the book action).
- `status`: `SCHEDULED` \| `HONORED` \| `EXPIRED` (R2.2 — the up-cased state machine; never the raw booked/expires ticks).
- `payout_band` *(Ash T9)*: `PENDING` (a SCHEDULED appointment — not sold yet) \| `NONE` (EXPIRED — lost, no sale) \|
  `MODEST` \| `FAIR` \| `STRONG` \| `PREMIUM` (an HONORED sale's realized purity-premium tier, ascending — CUT 1.0×→
  MODEST, STANDARD 1.5×→FAIR, PURE 2.5×→STRONG, CRYSTALLINE 4.0×→PREMIUM). R2.2 — NEVER the raw `payout_cents`.

Notes / errors (the existing operational conventions):
- **Book**: not the player's building → `404`; owned but NOT a Glass-district venue → `422` (the Glass attribute is
  `buildings.block_id → blocks.district_id → districts.profile = 'glass'`); a missing `glass_venue_building_id` → `422`.
- **Honor**: not the player's / non-existent appointment → `404`; not SCHEDULED (already HONORED, or EXPIRED) → `409`;
  SCHEDULED but NO Ash at the venue → `409` (distribute Ash there first). A second honor on an HONORED appointment →
  `409` (double-honor rejected — exactly one honor wins). Confirmed live: a double-honor returns `409
  RESOURCE_STATE_CONFLICT`; an honor after expiry returns `409`.
- **Projection**: no `Bearer` → `401`; an appointment that is not the player's / does not exist → `404`. Confirmed live.
- **Expiry recipe** (no-auth test hook, like `advance`): book → `UPDATE ash_appointment SET expires_at_tick=0 WHERE
  id='<id>'` → advance ≥ 1 tick so the `APPOINTMENT_EXPIRE` tick (MINUTE/17) sweeps the SCHEDULED booking to EXPIRED.

### 16f. How to PRODUCE the Ash luxury demo state (the seeder recipe — `Tools/seed_operational_demo.mjs §6c`)

Mirrors the Brindle/Crick cook flow but on a `specialized_lab` placed in a **GLASS** district (so the same building is a
valid appointment venue + holds the cooked Ash):
1. **Acquire + convert** a `specialized_lab` on a free GLASS-district block → SQL-fast-forward setup → operational
   (Tier-1, `lab_tier_band=BASIC`).
2. **Upgrade-tier** once (REST) → Tier-2 (`lab_tier_band=REFINED`).
3. **Order** `GLASS_LILY` (REST) → SQL-fast-forward arrival (MINUTE/7).
4. **Cook** `{ substance: "ash", refining_passes: 2 }` (REST) → SQL-fast-forward stage_3 to completion (deep-past stage
   clock + advance 8) → 200 g Ash + `batch_purity` score 75 → `purity_band=CRYSTALLINE`.
5. **Book** an appointment at this (Glass) venue (REST) → SCHEDULED (left un-honored so the UI's Honor affordance is
   demonstrable). The seeder prints `specialized_lab` + `ash_appointment_id` in its JSON block.

## 17. Grow house cultivation — `plant` + `tend` + grow projection (Phase-3 vector #3 T10)

A `grow_house` is the in-house cultivation building (a `building_operational_type`, buildable **only in Spine/Verge
districts** — district 16 is **Verge**). It grows a **GROWABLE plant-derived precursor** (`verdant_root_extract` |
`lull_resin` | `glass_lily`) over a 3-stage cycle, harvesting into `precursor_stock`. An active grow makes the building
**HOT** (GROW_HEAT) → its **raid-risk band climbs** (the existing vector-#1 surface, §1/§13 `raid_risk`); a raid
DAMAGED-pauses + seizes the crop (the §13 raid surface). The make-vs-buy lever: grow is **cheap-but-slow-and-hot** vs
ordering precursors **fast-but-dear**. All shapes below are **captured verbatim via curl** against the live local stack.

All endpoints need a PLAYER Bearer (`POST /auth/v1/signin { identifier, password }` → `payload.data.access_token`); the
mutations need a UUID-v4 `Idempotency-Key`. **R2.2: every surface is a qualitative BAND / a boolean / a uuid — never a
raw `tend_count` / grams / tick / heat / stage int.**

### 17a. Plant — `POST /v1/operational/grow-house/:id/plant`

Request body: `{ "precursor_type": "verdant_root_extract" }` (∈ `verdant_root_extract | lull_resin | glass_lily`).

```json
// 201 Created
{ "payload": { "data": { "grow_session_id": "eceb0403-23eb-4812-837e-53243f33b819" } } }
```

Errors: `404 RESOURCE_NOT_FOUND` (not a player-owned operational building), `409 RESOURCE_STATE_CONFLICT`
(WRONG_TYPE — not a grow_house / ALREADY_GROWING — one active grow per building / INSUFFICIENT_FUNDS), `422
VALIDATION_FAILED` (a non-growable precursor — captured live):

```json
// 422 — POST .../plant { precursor_type: "pyralin" }
{ "payload": { "error": { "code": "VALIDATION_FAILED", "http_status": 422,
  "message": "precursor_type must be a GROWABLE plant-derived precursor (VERDANT_ROOT_EXTRACT | LULL_RESIN | GLASS_LILY), got \"pyralin\"." } } }
```

### 17b. Tend — `POST /v1/operational/grow-session/:id/tend`

Empty body `{}`. Tends the in-progress grow (husbandry lever B — one tend bankable per stage, server-authoritative).

```json
// 200 OK
{ "payload": { "data": { "tended": true } } }
```

Errors: `404 RESOURCE_NOT_FOUND` (not the player's grow), `409 RESOURCE_STATE_CONFLICT` — a completed grow, or the
current stage is **already tended** (captured live):

```json
// 409 — a second tend on an already-tended stage
{ "payload": { "error": { "code": "RESOURCE_STATE_CONFLICT", "http_status": 409,
  "message": "grow_session <id> is already tended in its current stage (one tend per stage)." } } }
```

The raw `tend_count` is **never** in any response (R2.2 — the player surface is the `husbandry_band` on the projection).

### 17c. Grow projection — `GET /v1/operational/grow-session/:id`

The qualitative grow surface (R2.2 — bands + a flag + the uuid identity only):

```json
// 200 OK — a fresh stage_1 plant
{ "payload": { "data": { "grow_session": "<uuid>", "grow_stage_band": "EARLY", "husbandry_band": "WITHERED", "tend_due": true } } }
// 200 OK — after one GROW_ADVANCE (stage_2) + tend_count=2 on a fresh stage (the seeded demo state)
{ "payload": { "data": { "grow_session": "<uuid>", "grow_stage_band": "MID", "husbandry_band": "ON_TRACK", "tend_due": true } } }
// 200 OK — after tending the current stage (tend_count 2→3 → BUMPER tier)
{ "payload": { "data": { "grow_session": "<uuid>", "grow_stage_band": "MID", "husbandry_band": "THRIVING", "tend_due": false } } }
```

- `grow_stage_band`: **EARLY** (stage_1) | **MID** (stage_2) | **LATE** (stage_3) | **DONE** (completed — awaiting harvest).
- `husbandry_band`: **WITHERED** (tend_count ≤ 1) | **ON_TRACK** (=2) | **THRIVING** (=stage_count, every stage tended)
  — the tend trajectory banded from the SAME `GrowYieldService` cut-points the harvest uses (raw `tend_count` never escapes).
- `tend_due`: a boolean — the CURRENT stage is still un-tended (a tend action is available now). `GROW_ADVANCE` clears it
  on each new stage; tending the stage flips it false; a completed grow → false.

Error: `404 RESOURCE_NOT_FOUND` (`No such grow_session for this player: <id>.`) — a foreign/nonexistent grow is invisible.

### 17d. The building's raid-risk (REUSE — §1/§13) — `GET /v1/operational/building/:id`

The grow_house carries the SAME building-card shape (§1); an **idle** grow_house reads `raid_risk: "LOW"`, an **active**
grow climbs it (GROW_HEAT) — the seeded demo (active grow + the operational loop's accumulated city heat) reads e.g.:

```json
// 200 OK — the grow_house card while a grow is active
{ "payload": { "data": { "building": "<uuid>", "operational_type": "grow_house", "setup_state": "OPERATIONAL",
  "cover_band": "WEAK", "structural_state": "OPERATIONAL", "recently_raided": false, "seized_amount": "NONE",
  "repair_cost": "NONE", "raid_risk": "IMMINENT" } } }
```

The grow UI reads `raid_risk` off THIS card (not re-derived). A raid that DAMAGED-pauses + seizes the crop surfaces via
the §13 raid fields (`structural_state: DAMAGED`, `recently_raided: true`, `seized_amount` band, the Repair affordance).

### 17e. How to PRODUCE the grow demo state (the seeder recipe — `Tools/seed_operational_demo.mjs §6d`)

A grow_house in district 16 (**Verge**) holding an active grow at **MID / ON_TRACK / tend_due** (Tend button enabled):
1. **Acquire + convert** a `grow_house` on a free district-16 block → SQL-fast-forward setup → operational.
2. **Plant** `verdant_root_extract` (REST) → a stage_1 grow_session.
3. SQL-fast-forward the stage clock into the deep past (`stage_started_at_tick = clock − grow.stage_duration_ticks − 1`)
   + advance 1 → `GROW_ADVANCE` (MINUTE/18) flips stage_1 → stage_2 (EARLY → MID), clears `tended_in_stage`, emits
   GROW_HEAT (raid_risk climbs).
4. SQL-set `tend_count=2, tended_in_stage=NULL` → `husbandry_band=ON_TRACK` + `tend_due=true` on the fresh MID stage.
The seeder prints `grow_house` + `grow_session_id` in its JSON block.

## 18. Distribution hub — `hub_tier_band` + `roster_band` + `available_vehicles` + `upgrade-hub-tier` + vehicle dispatch (Phase-4 vector #4)

The `distribution_hub` is a LOGISTICS building (no production chain): it scales the player's courier roster cap (the
`hub_tier` lever) and unlocks wheeled dispatch vehicles (bike/car). It is buildable ONLY in a **tidewater** or **stack**
district (the GDD-canon hub districts — a convert outside them is refused). The Building-Card hub surface reads three
NEW projection leaves on the SAME `GET /v1/operational/building/:id` response, plus two action endpoints. Every leaf is
a closed band STRING / a categorical vehicle-label array / a uuid — **NEVER** a raw scalar (no `hub_tier` int / in-transit
shift count / cap number / vehicle speed / cents; R2.2). **All JSON below was captured VERBATIM via curl against the live
dockerized stack** (the merged distribution_hub backend, migration 0024) — not guessed.

### 18a. `GET /v1/operational/building/:id` — the hub-card projection (the THREE new leaves)

On EVERY building-card response there are now three additional keys: `hub_tier_band`, `roster_band`, `available_vehicles`.
For a **non**-distribution_hub building they are the neutral default (`NONE` / `NONE` / `["FOOT"]` — the SAME convention
`lab_tier_band` uses), so a non-hub card is byte-identical to the pre-T6 shape but for the keys.

```json
// 200 OK — a Tier-2 distribution_hub with 2 shipments in transit (the seeder's demo hub)
{ "payload": { "data": {
  "building": "<uuid>", "setup_state": "OPERATIONAL", "cover_band": "WEAK", "operational": true,
  "operational_type": "distribution_hub", "cold_storage_capable": false,
  "structural_state": "OPERATIONAL", "recently_raided": false, "seized_amount": "NONE", "repair_cost": "NONE",
  "lab_tier_band": "NONE",
  "hub_tier_band": "MEDIUM", "roster_band": "BUSY", "available_vehicles": ["FOOT", "BIKE", "CAR"],
  "raid_risk": "LOW" } } }
```

```json
// 200 OK — the SAME hub at Tier-1 (the build default, before the upgrade-hub-tier) — hub_tier_band SMALL, roster OPEN
{ "payload": { "data": { "building": "<uuid>", "operational_type": "distribution_hub", "setup_state": "OPERATIONAL",
  "hub_tier_band": "SMALL", "roster_band": "OPEN", "available_vehicles": ["FOOT", "BIKE", "CAR"], "raid_risk": "LOW" } } }
```

```json
// 200 OK — a NON-distribution_hub building (e.g. a lab): the neutral hub default (NONE / NONE / foot-only)
{ "payload": { "data": { "building": "<uuid>", "operational_type": "lab",
  "hub_tier_band": "NONE", "roster_band": "NONE", "available_vehicles": ["FOOT"] } } }
```

```json
// 200 OK — a distribution_hub building that is NOT OPERATIONAL (still in setup): hub_tier_band reflects the PERSISTED
// tier (MEDIUM) but available_vehicles is FOOT-ONLY (the wheeled modes are unlocked by an OPERATIONAL hub, not just an
// owned one) and roster_band reflects the player's whole-roster occupancy (BUSY here from other in-transit shipments).
{ "payload": { "data": { "building": "<uuid>", "operational_type": "distribution_hub", "setup_state": "IN_SETUP",
  "operational": false, "hub_tier_band": "MEDIUM", "roster_band": "BUSY", "available_vehicles": ["FOOT"] } } }
```

**Band domains** (the Unity DTO enums):
- `hub_tier_band`: `NONE | SMALL | MEDIUM | LARGE | MAJOR | MAX` — the hub's standing (tier 1→SMALL, 2→MEDIUM, 3→LARGE,
  4→MAJOR, ≥5→MAX, capped at `distribution.hub_max_tier` 5). A higher band → a larger concurrent-courier roster cap.
- `roster_band`: `NONE | OPEN | BUSY | FULL` — the player's concurrent-shipment occupancy (OPEN = idle / dispatch freely;
  BUSY = some out, capacity remains; FULL = at the cap → a further dispatch is refused 409 OVER_CAPACITY). NONE on a non-hub card.
- `available_vehicles`: a categorical label array — `["FOOT"]` (no operational hub) or `["FOOT","BIKE","CAR"]` (an
  operational hub unlocks the wheeled modes). Mode NAMES, never speeds.

### 18b. `POST /v1/operational/building/:id/upgrade-hub-tier` — raise the hub tier by one (the byte-mirror of upgrade-tier)

Empty body (the id is the path param); requires a PLAYER Bearer + a UUID-v4 Idempotency-Key. Debits the wallet by the
grounded hub-upgrade cost (raw cents NEVER forwarded — R2.2; the player surface is the qualitative `hub_tier_band` on the
next card load). 200 `{ upgraded: true }`. At cap (MAX) / insufficient funds / non-distribution_hub → 409.

```json
// 200 OK
{ "payload": { "data": { "upgraded": true } } }
```

### 18c. `POST /v1/operational/distribution/dispatch` — dispatch a courier with a chosen vehicle (the vehicle gate)

Body `{ from_building_id, to_building_id, cargo_grams, vehicle_type? }` (vehicle_type defaults to `foot`); requires a
PLAYER Bearer + a UUID-v4 Idempotency-Key. 201 `{ courier_id, route_id, shift_id }`. The vehicle is SERVER-AUTHORITATIVELY
gated: `foot` is always allowed; `bike`/`car` require an OPERATIONAL distribution_hub → else **422 VALIDATION_FAILED**
("vehicle not unlocked"). A roster at the concurrency cap → **409 RESOURCE_STATE_CONFLICT** (OVER_CAPACITY). Insufficient
source product / same building → 409; a building not the player's / not operational → 404.

```json
// 201 — dispatched with vehicle_type=bike (the player owns an operational hub → bike is unlocked)
{ "payload": { "data": { "courier_id": "<uuid>", "route_id": "<uuid>", "shift_id": "<uuid>" } } }
```

```json
// 422 — vehicle_type=bike with NO operational distribution_hub (bike/car not unlocked → only foot is allowed)
{ "payload": { "error": {
  "code": "VALIDATION_FAILED", "http_status": 422, "user_facing_i18n_key": "error.validation.failed",
  "message": "dispatch refused: vehicle \"bike\" not unlocked (allowed: foot — a distribution_hub unlocks bike/car)." } } }
```

```json
// 409 — the source building holds no product for the requested cargo (or the roster is at the cap → OVER_CAPACITY)
{ "payload": { "error": {
  "code": "RESOURCE_STATE_CONFLICT", "http_status": 409, "user_facing_i18n_key": "error.resource.state_conflict",
  "message": "Insufficient product at the source building to dispatch 10 g." } } }
```

The in-transit courier surfaces on `GET /v1/operational/couriers` with its `vehicle_type` (uppercase — `FOOT`/`BIKE`/`CAR`)
+ a `transit_band` (`IDLE | IN_TRANSIT | ARRIVED`) — the qualitative bands only (§5). The raw cap / in-transit count never
escape: the player reads the hub card's `roster_band` instead.

### 18d. How to PRODUCE the hub demo state (the seeder recipe — `Tools/seed_operational_demo.mjs §6e`)

A distribution_hub in a **tidewater** district at **Tier-2 (MEDIUM)** with a **BUSY** roster + bike/car unlocked:
1. **Acquire + convert** a `distribution_hub` on a free tidewater/stack block → SQL-fast-forward setup → operational (Tier-1 SMALL).
2. **upgrade-hub-tier** once (REST) → Tier-2 (`hub_tier_band` SMALL → MEDIUM).
3. **dispatch** 2 shipments FROM the Crick refinery (it holds 200 g) with `vehicle_type=bike` (a hub-unlocked vehicle),
   then SQL-pin each `courier_shift.started_at_tick` into the FUTURE (`clock + 1_000_000`) so the `COURIER_TRANSIT` tick
   (MINUTE/9) never arrives them through the later seeder advances → the roster stays genuinely in-transit (`roster_band` BUSY).
The seeder prints `distribution_hub` + `hub_dispatch_from` (the refinery — a valid dispatch source) + `hub_dispatch_to`
(the dealer-spot — a valid destination) in its JSON block.

## 19. Money holding — `money_holding_tier_band` + `held_band` + `capacity_band` + `yield_band` + `forfeiture_band` + `upgrade-money-holding-tier` + deposit/withdraw (Phase-5 vector #5a)

The `money_holding` is a CLEAN-CASH HOLDING vault (no production chain): it stores laundered cash, scales its deposit
capacity with the `money_holding_tier` lever, accrues a light passive yield on the hold, and — once the hold is very large —
attracts a value-driven AUDIT-FORFEITURE (telegraphed so the player can react). It is buildable ONLY in a **glass** district
(the GDD-canon high-value district — the SAME restriction the Ash specialized_lab carries; a convert outside it is refused).
The Building-Card vault surface reads FIVE NEW projection leaves on the SAME `GET /v1/operational/building/:id` response,
plus three action endpoints. Every leaf is a closed band STRING — **NEVER** a raw scalar (no `held_cents` / `money_holding_tier`
int / yield rate / tick / `forfeiture_scheduled_at_tick`; R2.2). **All JSON below was captured VERBATIM via curl against the
live dockerized stack** (the merged money_holding backend T0-T7, migration 0025) — not guessed.

### 19a. `GET /v1/operational/building/:id` — the vault-card projection (the FIVE new leaves)

On EVERY building-card response there are now five additional keys: `money_holding_tier_band`, `held_band`, `capacity_band`,
`yield_band`, `forfeiture_band`. For a **non**-money_holding building they are the neutral default (all `NONE` — the SAME
convention `hub_tier_band` / `lab_tier_band` use), so a non-vault card is byte-identical to the pre-T6 shape but for the keys.

```json
// 200 OK — a Tier-2 money_holding holding $50k with an armed forfeiture (the seeder's demo vault)
{ "payload": { "data": {
  "building": "<uuid>", "setup_state": "OPERATIONAL", "cover_band": "WEAK", "operational": true,
  "operational_type": "money_holding", "cold_storage_capable": false,
  "structural_state": "OPERATIONAL", "recently_raided": false, "seized_amount": "NONE", "repair_cost": "NONE",
  "lab_tier_band": "NONE", "hub_tier_band": "NONE", "roster_band": "NONE", "available_vehicles": ["FOOT"],
  "money_holding_tier_band": "MEDIUM", "held_band": "MODERATE", "capacity_band": "BUSY",
  "yield_band": "EARNING", "forfeiture_band": "PENDING", "raid_risk": "LOW" } } }
```

```json
// 200 OK — the SAME vault fresh (Tier-1 SMALL, held 0, no forfeiture armed) — before the upgrade + deposit
{ "payload": { "data": { "building": "<uuid>", "operational_type": "money_holding", "setup_state": "OPERATIONAL",
  "money_holding_tier_band": "SMALL", "held_band": "NONE", "capacity_band": "OPEN",
  "yield_band": "IDLE", "forfeiture_band": "NONE", "raid_risk": "LOW" } } }
```

```json
// 200 OK — the demo vault with the forfeiture deadline NEAR/AT now (forfeiture_band IMMINENT — react NOW)
{ "payload": { "data": { "building": "<uuid>", "operational_type": "money_holding",
  "money_holding_tier_band": "MEDIUM", "held_band": "MODERATE", "capacity_band": "BUSY",
  "yield_band": "EARNING", "forfeiture_band": "IMMINENT" } } }
```

```json
// 200 OK — a NON-money_holding building (e.g. a lab): the neutral vault default (all NONE)
{ "payload": { "data": { "building": "<uuid>", "operational_type": "lab",
  "money_holding_tier_band": "NONE", "held_band": "NONE", "capacity_band": "NONE",
  "yield_band": "NONE", "forfeiture_band": "NONE" } } }
```

**Band domains** (the Unity DTO enums):
- `money_holding_tier_band`: `NONE | SMALL | MEDIUM | LARGE | MAJOR | MAX` — the vault's standing (tier 1→SMALL, 2→MEDIUM,
  3→LARGE, 4→MAJOR, ≥5→MAX, capped at `money_holding.max_tier` 5). A higher band → a larger deposit capacity.
- `held_band`: `NONE | LOW | MODERATE | HIGH | MASSIVE` — the EFFECTIVE held clean cash (held + the live-accrued yield),
  anchored on the M1 $ scale (LOW < $10k, MODERATE $10k–$100k, HIGH $100k–$1M, MASSIVE ≥ $1M). NONE = an empty vault.
- `capacity_band`: `NONE | OPEN | BUSY | FULL` — the held-vs-capacity fill (OPEN = empty; BUSY = room remains; FULL = at the
  cap → a further deposit is refused 409 OVER_CAPACITY). The byte-mirror of the hub `roster_band` semantics. NONE on a non-vault card.
- `yield_band`: `NONE | IDLE | EARNING` — IDLE (nothing held → no yield) / EARNING (the passive yield accrues each tick). NONE on a non-vault card.
- `forfeiture_band`: `NONE | PENDING | IMMINENT` — the audit-forfeiture telegraph (NONE = none armed; PENDING = armed, the
  deadline is comfortably ahead; IMMINENT = the deadline is near/at/past — react NOW). Never the raw scheduled tick.

### 19b. `POST /v1/operational/building/:id/upgrade-money-holding-tier` — raise the vault tier by one (the byte-mirror of upgrade-hub-tier)

Empty body (the id is the path param); requires a PLAYER Bearer + a UUID-v4 Idempotency-Key. Debits the wallet by the
grounded upgrade cost (raw cents NEVER forwarded — R2.2; the player surface is the qualitative `money_holding_tier_band` on
the next card load). 200 `{ upgraded: true }`. At cap (MAX) → 409 (AT_CAP); insufficient funds → 409 (INSUFFICIENT_FUNDS);
non-money_holding → 409 (WRONG_TYPE); not the player's / not converted → 404.

```json
// 200 OK
{ "payload": { "data": { "upgraded": true } } }
```

### 19c. `POST /v1/operational/building/:id/deposit-cash` — move clean cash wallet → the vault (server-authoritative capacity guard)

Body `{ amount_cents }` (a positive integer of cents); requires a PLAYER Bearer + a UUID-v4 Idempotency-Key. SERVER-AUTHORITATIVE:
the server debits the wallet (insufficient → **409 INSUFFICIENT_FUNDS**, nothing moved) and credits the held under the tier
capacity guard (held + amount > capacity → **409 OVER_CAPACITY**, the whole tx rolls back). A non-positive / non-integer amount →
**422 VALIDATION_FAILED**. 200 `{ deposited: true }` — the raw new balances are NOT forwarded (R2.2). The UI passes the
player-entered amount and reflects the verdict; it does NOT pre-decide.

```json
// 200 OK — a deposit within the tier capacity
{ "payload": { "data": { "deposited": true } } }
```

```json
// 409 — a deposit that would exceed the tier capacity (OVER_CAPACITY — nothing moved)
{ "payload": { "error": {
  "code": "RESOURCE_STATE_CONFLICT", "http_status": 409, "user_facing_i18n_key": "error.resource.state_conflict",
  "message": "deposit would exceed the money_holding capacity for building <uuid> (OVER_CAPACITY) — nothing was moved." } } }
```

```json
// 422 — a non-positive amount
{ "payload": { "error": {
  "code": "VALIDATION_FAILED", "http_status": 422, "user_facing_i18n_key": "error.validation.failed",
  "message": "amount_cents must be a positive integer (cents), got 0." } } }
```

### 19d. `POST /v1/operational/building/:id/withdraw-cash` — move clean cash from the vault → the wallet (server-authoritative held guard)

Body `{ amount_cents }` (positive integer of cents); requires a PLAYER Bearer + a UUID-v4 Idempotency-Key. SERVER-AUTHORITATIVE:
the server debits the held (held < amount → **409 INSUFFICIENT_HELD**, nothing moved) and credits the wallet. A non-positive
amount → **422**. 200 `{ withdrawn: true }` — the raw new balances are NOT forwarded (R2.2). Withdrawing is the player's
primary forfeiture-avoidance lever (drop the held band below the audit threshold before the seizure fires).

```json
// 200 OK — a withdraw within the held balance
{ "payload": { "data": { "withdrawn": true } } }
```

```json
// 409 — a withdraw beyond the held balance (INSUFFICIENT_HELD — nothing moved)
{ "payload": { "error": {
  "code": "RESOURCE_STATE_CONFLICT", "http_status": 409, "user_facing_i18n_key": "error.resource.state_conflict",
  "message": "Insufficient held cash in the money_holding to cover the withdrawal (INSUFFICIENT_HELD) — nothing was moved." } } }
```

### 19e. How to PRODUCE the vault demo state (the seeder recipe — `Tools/seed_operational_demo.mjs §6f + §13c`)

A money_holding in a **glass** district at **Tier-2 (MEDIUM)** holding **$50k (MODERATE)** below the **$5M Tier-2 cap (BUSY)**,
**EARNING** passive yield, with a **PENDING** forfeiture armed:
1. **Acquire + convert** a `money_holding` on a free glass block → SQL-fast-forward setup → operational (Tier-1 SMALL, held 0).
2. **upgrade-money-holding-tier** once (REST) → Tier-2 (`money_holding_tier_band` SMALL → MEDIUM).
3. **deposit-cash** $50k (REST) → `held_band` MODERATE / `capacity_band` BUSY / `yield_band` EARNING.
4. **(§13c — the LAST mutation, no advance after)** SQL-pin `money_holding.forfeiture_scheduled_at_tick = clock + a far lead`
   → `forfeiture_band` PENDING. This MUST be last: the `MONEY_HOLDING_AUDIT` tick (MINUTE/19) CANCELS an armed forfeiture
   whenever the effective held is below the $20M threshold (and the $50k demo hold is far below it), so any advance after the
   pin would wipe it — the SAME no-advance-after constraint the DIRTY laundering node (§10b/§13b) carries.
The seeder prints `money_holding` in its JSON block (the vault id the T9 test loads).
