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

    // GET /v1/economy/wallet  →  { player_id, cash_cents, wallet_band }
    // W3.U1 C2 (design §1.3.f) — `cash_cents` ADDED. The server ALREADY sent it (`WalletProjection`,
    // `economy.projection.service.ts:56-63` — fixed on `main` by `263175e7`, canon §8.1/§8.2: a
    // concrete monetary balance is player-facing, R2.2 forbids SOCIAL-JUDGMENT scalars, not this);
    // this DTO simply hadn't declared the field. With JsonUtility an undeclared field is silently
    // DROPPED, not an error — the same family as an optional marker turning a compile error into
    // silence (CLAUDE.md). `cash_cents` is a BigInt-serialized STRING (never a JSON number — values
    // beyond Number.MAX_SAFE_INTEGER would truncate) — kept as `string` here for the same reason.
    [Serializable]
    public class WalletDto
    {
        public string player_id;
        public string cash_cents;  // BigInt-serialized cents, JSON-safe string — never parse via float/double.
        public string wallet_band; // BROKE | LOW | MODERATE | HIGH | FLUSH (SUPPLEMENTARY band, not a substitute for cash_cents)
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
