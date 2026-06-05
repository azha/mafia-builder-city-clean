using System;
using UnityEngine;

namespace MafiaCleanCity.Operational
{
    // ---------------------------------------------------------------------
    // Wire DTOs for the Phase-2 operational Building Card surface and its
    // per-type action endpoints. Field names are snake_case to match
    // JsonUtility. Every shape was captured verbatim from the live dev stack
    // (Tools/OPERATIONAL_CONTRACTS.md §1 + §8) — no guessing (the T14 lesson).
    //
    // R2.2 (information asymmetry): every projection leaf the player sees is a
    // qualitative band STRING, a BOOLEAN, or a uuid identity STRING — NEVER a
    // raw scalar (no cents / grams / ticks / heat float / purity). These DTOs
    // model only those band strings + booleans + ids; nothing numeric leaks.
    // ---------------------------------------------------------------------

    // GET /v1/operational/building/:id
    //   { building, setup_state, cover_band, operational, operational_type,
    //     structural_state, recently_raided, seized_amount, repair_cost, raid_risk }   (Phase-2b raid surface)
    // Captured verbatim from the live stack — see Tools/OPERATIONAL_CONTRACTS.md §1 + §13 (the DAMAGED / REPAIRING
    // shapes + the repair endpoint). Every Phase-2b leaf is a qualitative band STRING or a BOOLEAN (R2.2 — no raw
    // grams/cents/heat/ticks leaks).
    [Serializable]
    public class BuildingCardDto
    {
        public string building;          // uuid identity
        public string setup_state;       // NOT_CONVERTED | IN_SETUP | OPERATIONAL
        public string cover_band;        // NONE | WEAK | STANDARD | STRONG
        public bool operational;         // setup_state == OPERATIONAL (function-enable gate)
        public string operational_type;  // front_shop | cash_safehouse | stash | lab | dealer_spot_front | ... ("" when not converted)

        // ----- Phase-2b raid / repair / risk surface (present on EVERY building-card response) -----
        public string structural_state;  // OPERATIONAL | DAMAGED | REPAIRING — the raid/repair band (DAMAGED gates Repair)
        public bool recently_raided;     // a building_raid row exists (raided ≥ once) — a flag, never a count
        public string seized_amount;     // NONE | LOW | MODERATE | HIGH — the latest raid's seizure band (never raw grams)
        public string repair_cost;       // NONE | MINOR | MODERATE | MAJOR — the repair cash cost band (NONE unless DAMAGED)
        public string raid_risk;         // LOW | ELEVATED | HIGH | IMMINENT — the telegraphed raid-risk band (heat+pin)
    }

    // GET /v1/operational/storage/:id  (COOK buildings only — a lab → BRINDLE, a refinery → CRICK; a non-cook
    //   building → 404). Phase-2b vector #2 (Crick) cold-chain surface:
    //   { building, substance_type, product_band, temperature_status, degrading }
    // Captured verbatim from the live stack — see Tools/OPERATIONAL_CONTRACTS.md §14 (the refinery OPTIMAL_COLD
    // shape + the lab Brindle temperature_status:null shape). Every leaf is a qualitative band STRING, a BOOLEAN,
    // or a uuid — temperature_status is NEVER a raw °C, product_band NEVER raw grams (R2.2).
    [Serializable]
    public class StorageDto
    {
        public string building;            // uuid identity
        public string substance_type;      // BRINDLE (lab) | CRICK (refinery) — the substance the cook building holds
        public string product_band;        // NONE | LOW | MEDIUM | HIGH — the stored-grams band (never raw grams)
        public string temperature_status;  // OPTIMAL_COLD | MODERATE | HOT | null (null when no cold chain — Brindle)
        public bool degrading;             // true when the held product is actively degrading on a warm chain (a flag)
    }

    [Serializable] public class StorageEnvelope { public StoragePayload payload; }
    [Serializable] public class StoragePayload { public StorageDto data; }

    // Wallet affordability for the Repair button reuses the EXISTING wallet DTOs from
    // Dashboard/DashboardDtos.cs (WalletDto/WalletEnvelope/WalletPayload, same namespace
    // MafiaCleanCity.Operational) — GET /v1/economy/wallet → { wallet_band }. Do NOT re-declare them
    // here (CS0101 duplicate). Read ONLY to gate Repair affordability qualitatively (repair_cost band
    // vs wallet band — never raw cents; R2.2).

    [Serializable] public class BuildingCardEnvelope { public BuildingCardPayload payload; }
    [Serializable] public class BuildingCardPayload { public BuildingCardDto data; }

    // ----- Action request bodies (POST; require Bearer + UUID-v4 Idempotency-Key) -----

    // POST /v1/operational/building/:id/convert  { operational_type, cover_quality }
    [Serializable]
    public class ConvertRequestDto
    {
        public string operational_type; // m1 type (lab | stash | front_shop | cash_safehouse | dealer_spot_front)
        public string cover_quality;    // weak | standard | strong
    }

    // POST /v1/operational/precursors/order  { building_id, precursor_type, quantity_units }
    [Serializable]
    public class OrderPrecursorRequestDto
    {
        public string building_id;
        public string precursor_type;   // PYRALIN in M1
        public int quantity_units;
    }

    // POST /v1/operational/laundering/inject  { front_shop_id, safehouse_id, amount_cents }
    [Serializable]
    public class InjectRequestDto
    {
        public string front_shop_id;
        public string safehouse_id;
        public int amount_cents;
    }

    // ----- Action success payloads (ids / flags only — never the raw cents/grams debited; R2.2) -----

    [Serializable] public class ConvertResultDto { public bool converted; }
    [Serializable] public class ConvertEnvelope { public ConvertResultPayload payload; }
    [Serializable] public class ConvertResultPayload { public ConvertResultDto data; }

    [Serializable] public class OrderResultDto { public string order_id; }
    [Serializable] public class OrderEnvelope { public OrderResultPayload payload; }
    [Serializable] public class OrderResultPayload { public OrderResultDto data; }

    // POST /v1/operational/lab/:id/cook  → { cook_session_id }
    [Serializable] public class CookResultDto { public string cook_session_id; }
    [Serializable] public class CookEnvelope { public CookResultPayload payload; }
    [Serializable] public class CookResultPayload { public CookResultDto data; }

    // inject → { front_shop_id, safehouse_id, node_id, deviation }
    [Serializable]
    public class InjectResultDto
    {
        public string front_shop_id;
        public string safehouse_id;
        public string node_id;
        public bool deviation;
    }
    [Serializable] public class InjectEnvelope { public InjectResultPayload payload; }
    [Serializable] public class InjectResultPayload { public InjectResultDto data; }

    // POST /v1/operational/building/:id/repair → { repairing: bool } (Phase-2b). NOTE: verify this shape
    // against the live repair response via curl before trusting it (contract-capture discipline).
    [Serializable] public class RepairResultDto { public bool repairing; }
    [Serializable] public class RepairEnvelope { public RepairResultPayload payload; }
    [Serializable] public class RepairResultPayload { public RepairResultDto data; }

    // ----- Outcome wrapper: a uniform result so the screen can render success vs a
    //       well-formed error (the error envelope is mapped to a readable message,
    //       never a raw code surfaced to the player — F2). -----
    public class ActionOutcome
    {
        public bool Ok;             // true on 2xx
        public long HttpStatus;     // the HTTP status the call returned
        public string Endpoint;     // which endpoint was hit (for the E2E wiring assertion)
        public string ResultId;     // order_id / cook_session_id / node_id when present
        public string Message;      // human-readable: success summary or mapped error message

        public override string ToString() =>
            $"ActionOutcome(ok={Ok}, http={HttpStatus}, endpoint={Endpoint}, id={ResultId}, msg={Message})";
    }
}
