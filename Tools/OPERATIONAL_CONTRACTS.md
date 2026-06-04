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
| storage | `substance_type` | `BRINDLE` (M1) |
| couriers | `transit_band` | `IDLE`, `IN_TRANSIT`, `ARRIVED` |
| couriers | `vehicle_type` | `FOOT` (M1) |
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
