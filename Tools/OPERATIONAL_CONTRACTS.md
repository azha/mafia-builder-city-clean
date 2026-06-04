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

**lab**
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
            "building": "61ae7ebc-53ea-473c-8d1f-a07e148efe08",
            "setup_state": "OPERATIONAL",
            "cover_band": "WEAK",
            "operational": true,
            "operational_type": "lab"
        }
    }
}
```

The other four types (same envelope; only the `data` differs):
```json
{ "building": "4a065799-24f7-4bdc-867d-2a4772ca95f2", "setup_state": "OPERATIONAL", "cover_band": "WEAK", "operational": true, "operational_type": "stash" }
{ "building": "32daf382-b89f-4022-b136-77e205bb8ea0", "setup_state": "OPERATIONAL", "cover_band": "WEAK", "operational": true, "operational_type": "dealer_spot_front" }
{ "building": "de8637d1-f0e6-4cc0-808b-831307ca657b", "setup_state": "OPERATIONAL", "cover_band": "WEAK", "operational": true, "operational_type": "front_shop" }
{ "building": "64ca2812-eb6e-4c72-8e42-b753144c12a7", "setup_state": "OPERATIONAL", "cover_band": "WEAK", "operational": true, "operational_type": "cash_safehouse" }
```

**Fields / bands** (from `real-estate.projection.service.ts`):
- `building`: uuid string (identity).
- `setup_state`: `NOT_CONVERTED` \| `IN_SETUP` \| `OPERATIONAL`.
- `cover_band`: `NONE` \| `WEAK` \| `STANDARD` \| `STRONG`.
- `operational`: boolean (`setup_state === OPERATIONAL` — the function-enable flag the UI gates on).
- `operational_type`: closed enum string — one of `front_shop` \| `cash_safehouse` \| `stash` \| `lab` \|
  `grow_house` \| `refinery` \| `press_house` \| `distribution_hub` \| `office` \| `dealer_spot_front` \|
  `money_holding` (M1 uses the 5 shown above). `""` (empty) when not converted.

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
