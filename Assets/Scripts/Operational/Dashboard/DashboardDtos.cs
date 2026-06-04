using System;
using UnityEngine;

namespace MafiaCleanCity.Operational
{
    // ---------------------------------------------------------------------
    // Wire DTOs for the Phase-2 Home Dashboard surface (screen_1). Field names
    // are snake_case to match JsonUtility. Every shape was captured verbatim
    // from the live dev stack (Tools/OPERATIONAL_CONTRACTS.md §11 wallet + §12
    // /v1/me) — no guessing (the T14 lesson).
    //
    // R2.2 (information asymmetry): the wallet projection returns ONLY a
    // qualitative band STRING — NEVER the raw cash_cents. The /v1/me projection
    // returns identity STRINGS only (handle / locale / lifecycle) — no cash, no
    // scalar. These DTOs model exactly those; nothing numeric leaks.
    //
    // The citywide heat band (COLD/WARM/HOT/BURNING) + the escalated flag are
    // NOT re-declared here — they REUSE the existing CityMap.DistrictHeatDto /
    // HeatEnvelope (WorldDtos.cs), the same shape the City Map already consumes
    // for GET /v1/city/district/:id/heat.
    // ---------------------------------------------------------------------

    // GET /v1/economy/wallet  →  { wallet_band }
    [Serializable]
    public class WalletDto
    {
        public string wallet_band; // BROKE | LOW | MODERATE | HIGH | FLUSH (ascending qualitative cash band)
    }

    [Serializable] public class WalletEnvelope { public WalletPayload payload; }
    [Serializable] public class WalletPayload { public WalletDto data; }

    // GET /v1/me  →  { account_id, handle, email, lifecycle_state, locale }
    // Optional dashboard header. No cash / no scalar (R2.2).
    [Serializable]
    public class MeDto
    {
        public string account_id;     // uuid identity
        public string handle;         // display handle / callsign
        public string email;
        public string lifecycle_state; // ACTIVE | ...
        public string locale;         // ICU locale string (en, ...)
    }

    [Serializable] public class MeEnvelope { public MePayload payload; }
    [Serializable] public class MePayload { public MeDto data; }
}
