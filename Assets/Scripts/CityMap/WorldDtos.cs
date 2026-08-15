using System;
using System.Collections.Generic;
using UnityEngine;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.CityMap
{
    // ---------------------------------------------------------------------
    // Wire DTOs for GET /v1/world/districts.
    //
    // The backend wraps every 2xx body in a ResponseEnvelope:
    //   { response_meta: {...}, payload: { data: { districts: [...] } } }
    // Field names below are snake_case ON PURPOSE so Unity's JsonUtility maps
    // them directly to the JSON keys. Do not "C#-ify" them.
    // ---------------------------------------------------------------------

    [Serializable]
    public class DistrictDto
    {
        public int id;
        public string profile;          // glass | lattice | spine | stack | tidewater | verge
        public string index;            // string in the contract (e.g. "1")
        public string name_canonical;   // e.g. "Tidewater-1"
        public int block_count;
        public string bank_side;        // north | south
        public string control_state;    // UNCONTESTED | CONTESTED | PLAYER_HELD | RIVAL_HELD
    }

    [Serializable]
    public class DistrictsData
    {
        public List<DistrictDto> districts;
    }

    [Serializable]
    public class DistrictsPayload
    {
        public DistrictsData data;
    }

    [Serializable]
    public class DistrictsEnvelope
    {
        public DistrictsPayload payload;
    }

    // ---------------------------------------------------------------------
    // Domain enums + presentation mapping. Kept here so both the view and the
    // PlayMode tests share one source of truth for parsing + colours.
    // ---------------------------------------------------------------------

    public enum ControlState
    {
        Unknown = 0,
        Uncontested,
        Contested,
        PlayerHeld,
        RivalHeld,
    }

    public enum BankSide
    {
        Unknown = 0,
        North,
        South,
    }

    // Heat overlay band (System Heat projection — GET /v1/city/district/:id/heat).
    // Server thresholds: COLD <0.2, WARM 0.2–0.5, HOT 0.5–0.8, BURNING ≥0.8.
    public enum HeatBucket
    {
        Unknown = 0,
        Cold,
        Warm,
        Hot,
        Burning,
    }

    // ---- Auth (POST /v1/auth/signin) -----------------------------------

    [Serializable]
    public class SigninRequestDto
    {
        public string identifier; // player email OR callsign
        public string password;
    }

    [Serializable]
    public class SigninDataDto
    {
        public string access_token;
        public string token_type;   // "Bearer"
        public string account_kind; // "PLAYER" | "STAFF" | "SERVICE"
        public string session_id;
        public int expires_in_s;
    }

    [Serializable]
    public class SigninPayload
    {
        public SigninDataDto data;
    }

    [Serializable]
    public class SigninEnvelope
    {
        public SigninPayload payload;
    }

    // ---- Auth (POST /v1/auth/signup) — W3.U1 C2/C3: a real, disposable player, no dependency on
    // the heavy operational seeder (Tools/seed_operational_demo.mjs), which the district/refinery
    // assumption it hard-codes can leave transiently broken — signup only needs callsign+password,
    // and returns the SAME SigninResult shape as /v1/auth/signin (REUSE SigninDataDto/Payload/Envelope
    // below, never a re-declared duplicate). ------------------------------
    [Serializable]
    public class SignupRequestDto
    {
        public string callsign;
        public string password;
    }

    // ---- Heat projection (GET /v1/city/district/:id/heat) --------------

    [Serializable]
    public class BuildingHeatDto
    {
        public string building;    // uuid
        public string heat_bucket; // COLD | WARM | HOT | BURNING
    }

    [Serializable]
    public class DistrictHeatDto
    {
        public string district;         // "district-N"
        public string district_bucket;  // peak band for the district
        public string citywide_bucket;  // peak band across the player's districts
        public bool escalated;          // a building crossed the escalation threshold last tick
        public List<BuildingHeatDto> buildings;
    }

    [Serializable]
    public class HeatPayload
    {
        public DistrictHeatDto data;
    }

    [Serializable]
    public class HeatEnvelope
    {
        public HeatPayload payload;
    }

    public static class CityMapEnums
    {
        public static ControlState ParseControlState(string raw)
        {
            switch (raw)
            {
                case "UNCONTESTED": return ControlState.Uncontested;
                case "CONTESTED": return ControlState.Contested;
                case "PLAYER_HELD": return ControlState.PlayerHeld;
                case "RIVAL_HELD": return ControlState.RivalHeld;
                default: return ControlState.Unknown;
            }
        }

        public static BankSide ParseBankSide(string raw)
        {
            switch (raw)
            {
                case "north": return BankSide.North;
                case "south": return BankSide.South;
                default: return BankSide.Unknown;
            }
        }

        // Qualitative palette for the control-state overlay. These are the only
        // colours the City Map uses to encode who holds a district.
        public static Color ColorFor(ControlState state)
        {
            switch (state)
            {
                case ControlState.Uncontested: return DesignTokens.Current.controlUncontested; // neutral grey
                case ControlState.Contested: return DesignTokens.Current.controlContested;   // amber
                case ControlState.PlayerHeld: return DesignTokens.Current.controlPlayerHeld;  // green
                case ControlState.RivalHeld: return DesignTokens.Current.controlRivalHeld;   // red
                default: return DesignTokens.Current.controlUnknown;                       // unknown / dark
            }
        }

        public static HeatBucket ParseHeatBucket(string raw)
        {
            switch (raw)
            {
                case "COLD": return HeatBucket.Cold;
                case "WARM": return HeatBucket.Warm;
                case "HOT": return HeatBucket.Hot;
                case "BURNING": return HeatBucket.Burning;
                default: return HeatBucket.Unknown;
            }
        }

        // Short human label for the heat badge (text + colour, never colour alone — F2 a11y).
        public static string HeatLabel(HeatBucket bucket)
        {
            switch (bucket)
            {
                case HeatBucket.Cold: return "COLD";
                case HeatBucket.Warm: return "WARM";
                case HeatBucket.Hot: return "HOT";
                case HeatBucket.Burning: return "BURNING";
                default: return "—";
            }
        }

        // Heat overlay palette (cool blue → red).
        public static Color HeatColorFor(HeatBucket bucket)
        {
            switch (bucket)
            {
                case HeatBucket.Cold: return DesignTokens.Current.heatCold;    // cool blue
                case HeatBucket.Warm: return DesignTokens.Current.heatWarm;    // yellow
                case HeatBucket.Hot: return DesignTokens.Current.heatHot;     // orange
                case HeatBucket.Burning: return DesignTokens.Current.heatBurning; // red
                default: return DesignTokens.Current.heatUnknown;                 // unknown
            }
        }

        // Pick black or white text for legibility on a given background (luminance-based).
        // Fixes low-contrast cases like white-on-yellow (WARM).
        public static Color ReadableTextColor(Color bg)
        {
            float luminance = 0.299f * bg.r + 0.587f * bg.g + 0.114f * bg.b;
            return luminance > 0.6f ? DesignTokens.Current.readableTextDark : Color.white;
        }
    }
}
