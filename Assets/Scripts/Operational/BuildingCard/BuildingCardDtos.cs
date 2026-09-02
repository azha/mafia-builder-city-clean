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
    /// <summary>Les paramètres du nom sont DÉCLARÉS un par un, pas génériques : `JsonUtility`
    /// ne lit pas un objet à clés arbitraires. Les quatre ci-dessous sont ceux que le serveur
    /// envoie aujourd'hui (mesuré) ; un cinquième apparaîtrait silencieusement comme `{nom}`
    /// dans le texte rendu, ce qui est le comportement voulu : visible, jamais deviné.</summary>
    [Serializable]
    public class BuildingNameI18nDto
    {
        public string key;
        public BuildingNameParamsDto @params;
    }

    /// <summary>Les paramètres du nom, sous LES NOMS QUE LE BUNDLE RÉCLAME.
    ///
    /// ⛔ MESURÉ le 2026-09-02, à l'image puis sur cinq routes : ces champs s'appelaient
    /// `type` et `rank`, et le serveur ne les émet plus sous ces noms-là. La fiche affichait
    /// donc, littéralement, `{enseigne} — La Lisière, îlot 1501, n° {rang}` — `district` et
    /// `block` substitués, les deux autres laissés en accolades à l'écran.
    /// ★ La décision produit ratifiée le 2026-09-02 a changé les deux À LA FOIS : l'enseigne a
    ///   remplacé le type (les bâtiments portent des enseignes inventées depuis P4), et le rang
    ///   n'est plus émis QUE s'il désambiguïse. Ce n'était pas un détail de nommage.
    ///
    /// ⚠️ `rang` EST ABSENT QUAND IL VAUT 1 — et c'est le SERVEUR qui choisit alors l'autre clé
    /// (`game.fiction.building.name`, sans le segment `, n° {rang}`). Ne complétez JAMAIS un
    /// paramètre manquant côté client : un client qui envoie toujours quatre paramètres écrirait
    /// `n° 1` sur tous les bâtiments uniques, que la clé servie ne demande même pas.
    /// ⇒ On passe les paramètres TELS QU'ON LES REÇOIT. Le champ vide reste vide.</summary>
    [Serializable]
    public class BuildingNameParamsDto
    {
        public string enseigne;
        public string district;
        public string block;
        public string rang;
    }

    [Serializable]
    public class BuildingCardDto
    {
        public string building;          // uuid identity

        /// <summary>Le NOM du bâtiment, en clé i18n + paramètres — projeté depuis toujours et
        /// jamais lu par cet écran. Mesuré le 2026-09-02 :
        /// `{"key":"game.fiction.building.name.rang","params":{"enseigne":…,"district":"La Lisière",
        ///   "block":"1501","rang":…}}` — et `game.fiction.building.name` SANS `rang` au rang 1.
        /// ⚠️ Le bundle porte ces deux clés depuis le 2026-09-02 (386 clés servies). Il n'en a
        /// longtemps porté aucune, et l'écran affichait alors la clé nue : c'est CETTE clé nue,
        /// laissée visible au lieu d'être maquillée, qui a rendu le désaccord de noms lisible
        /// à l'image et permis de le trancher en cinq minutes.</summary>
        public BuildingNameI18nDto name_i18n;
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

        // ----- Phase-2c vector #2c (Ash — T5) lab-tier surface (present on EVERY building-card response) -----
        // The specialized_lab lab-tier band: NONE (any non-specialized_lab building) | BASIC (tier 1) | REFINED (tier 2)
        // | MASTER (tier 3). The raw lab_tier int NEVER escapes (R2.2 — captured verbatim via curl, OPERATIONAL_CONTRACTS.md
        // §16). A higher band → a purer Ash batch. The upgrade-tier button gates on this (BASIC/REFINED → upgradable).
        public string lab_tier_band;     // NONE | BASIC | REFINED | MASTER (NONE for non-specialized_lab)

        // ----- Phase-4 vector #4 (distribution_hub — T6) hub-dispatch surface (present on EVERY building-card response) -----
        // Captured verbatim via curl against the live stack (OPERATIONAL_CONTRACTS.md §18). Every leaf is a closed band
        // STRING or a categorical-label array — NEVER a raw scalar (no hub_tier int / shift count / cap number / vehicle
        // speed; R2.2). NONE / foot-only is the neutral convention for a NON-distribution_hub building card (the SAME
        // convention lab_tier_band uses), so a non-hub card is byte-identical to the pre-T6 shape but for the new keys.
        public string hub_tier_band;     // NONE | SMALL | MEDIUM | LARGE | MAJOR | MAX (NONE for non-distribution_hub)
        public string roster_band;       // NONE | OPEN | BUSY | FULL (NONE for non-distribution_hub; FULL ⇒ dispatch 409 OVER_CAPACITY)
        public string[] available_vehicles; // unlocked vehicle labels: ["FOOT"] (no operational hub) | ["FOOT","BIKE","CAR"] (hub owned)

        // ----- Phase-5 vector #5a (money_holding — T6) clean-cash holding surface (present on EVERY building-card response) -----
        // Captured verbatim via curl against the live stack (OPERATIONAL_CONTRACTS.md §19). Every leaf is a CLOSED band STRING
        // — NEVER a raw scalar (no held_cents / money_holding_tier int / yield rate / tick / forfeiture_scheduled_at_tick;
        // R2.2). NONE is the neutral convention for a NON-money_holding building card (the SAME convention hub_tier_band /
        // lab_tier_band use), so a non-money_holding card is byte-identical to the pre-T6 shape but for these new keys.
        public string money_holding_tier_band; // NONE | SMALL | MEDIUM | LARGE | MAJOR | MAX (NONE for non-money_holding) — the tier lever as a band
        public string held_band;          // NONE | LOW | MODERATE | HIGH | MASSIVE — the EFFECTIVE held clean-cash magnitude (never raw cents)
        public string capacity_band;       // NONE | OPEN | BUSY | FULL — the held-vs-capacity fill (FULL ⇒ a further deposit 409s OVER_CAPACITY)
        public string yield_band;          // NONE | IDLE | EARNING — IDLE (nothing held) / EARNING (passive yield accrues); never the raw rate
        public string forfeiture_band;      // NONE | PENDING | IMMINENT — the audit-forfeiture telegraph (PENDING/IMMINENT ⇒ withdraw or diversify)

        // ----- 04f-A C2 (D1/D14) maintenance-lapse surface (present on EVERY building-card response) -----
        // W3.U2 C7 (D7, C7-F2) — the server has sent these 3 keys since 04f-A (real-estate.projection.
        // service.ts:225-242) but this DTO never declared them: JsonUtility drops an undeclared key
        // SILENTLY (no error), which is exactly how the hole survived. Captured verbatim from the
        // server's own doc comments — R2.2 still holds: days_until_maintenance_due is the ONE numeric
        // maintenance signal the server exposes (the raw output multiplier / failure probability / heat
        // additive never escape).
        public string lapse_phase_bucket;      // WITHIN_WINDOW | SOFT | HARD | CRITICAL — WITHIN_WINDOW for a not-yet-operational building
        public int days_until_maintenance_due; // SIGNED days until due (negative = overdue); 0 for a not-yet-operational building
        public bool maintenance_in_progress;   // whether a scheduled-maintenance job is CURRENTLY armed; false for a not-yet-operational building
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

        // ----- Phase-2c vector #2c (Ash — T9) batch purity surface (on the storage projection of a cook building) -----
        // The qualitative PURITY band of an Ash batch: CUT | STANDARD | PURE | CRYSTALLINE | null. The FORMAL projection of
        // the batch's deterministic purity_score (stamped at cook completion). The raw purity_score NEVER escapes (R2.2 —
        // captured verbatim via curl, OPERATIONAL_CONTRACTS.md §16). null for a NON-Ash substance (Brindle/Crick/Hush carry
        // no purity grade) AND for an Ash specialized_lab with no completed cook yet. A purer batch sells at a higher margin.
        public string purity_band;         // CUT | STANDARD | PURE | CRYSTALLINE | null (null for non-Ash / no batch yet)
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

    // =========================================================================
    // Phase-2c vector #2c (Ash luxury channel) — captured verbatim via curl against the live stack
    // (Tools/OPERATIONAL_CONTRACTS.md §16). Every leaf is a band STRING / a BOOLEAN / a uuid — NEVER a raw scalar
    // (no purity_score / cents / multiplier / tick; R2.2). DTOs are NOT re-declared elsewhere (CS0101 dup-DTO lesson).
    // =========================================================================

    // POST /v1/operational/building/:id/upgrade-tier  → { upgraded: true } (200). Empty body (the id is the path param).
    // Debits the wallet by the grounded tier-upgrade cost (raw cents NEVER forwarded — R2.2; the player surface is the
    // qualitative lab_tier_band on the next card load). 409 at cap / insufficient funds / non-specialized_lab.
    [Serializable] public class UpgradeTierResultDto { public bool upgraded; }
    [Serializable] public class UpgradeTierEnvelope { public UpgradeTierResultPayload payload; }
    [Serializable] public class UpgradeTierResultPayload { public UpgradeTierResultDto data; }

    // POST /v1/operational/lab/:id/cook  { substance: "ash", refining_passes: <int 0..max> } → { cook_session_id } (201).
    // The Ash cook-start body: the substance + the time↔purity refining-passes lever (more passes = longer cook = higher
    // purity). The legacy Brindle cook (empty body) keeps using the existing CookRequest path; this is the Ash overload.
    [Serializable]
    public class AshCookRequestDto
    {
        public string substance;     // "ash"
        public int refining_passes;  // 0..max — the time↔purity lever (the server validates > max → 422)
    }

    // POST /v1/operational/appointment  { glass_venue_building_id } → { appointment_id } (201). Book an Ash appointment at a
    // player-owned Glass-district venue (the ONLY Ash sale path — no lek/dealer selling). 404 not-owned / 422 not-a-glass.
    [Serializable] public class BookAppointmentRequestDto { public string glass_venue_building_id; }
    [Serializable] public class BookAppointmentResultDto { public string appointment_id; }
    [Serializable] public class BookAppointmentEnvelope { public BookAppointmentResultPayload payload; }
    [Serializable] public class BookAppointmentResultPayload { public BookAppointmentResultDto data; }

    // POST /v1/operational/appointment/:id/honor  {} → { honored: true } (200). Honor a SCHEDULED appointment (sells the
    // Ash present at the venue at the luxury margin × purity multiplier → HONORED). 409 if EXPIRED / HONORED / no Ash.
    [Serializable] public class HonorAppointmentResultDto { public bool honored; }
    [Serializable] public class HonorAppointmentEnvelope { public HonorAppointmentResultPayload payload; }
    [Serializable] public class HonorAppointmentResultPayload { public HonorAppointmentResultDto data; }

    // GET /v1/operational/appointment/:id → the qualitative appointment projection (R2.2 — never the raw booked/expires
    // ticks or grams/cents). status: SCHEDULED | HONORED | EXPIRED ; payout_band: PENDING (scheduled) | NONE (expired) |
    // MODEST | FAIR | STRONG | PREMIUM (an honored sale's realized purity-premium tier). Captured verbatim (§16).
    [Serializable]
    public class AppointmentDto
    {
        public string appointment_id;  // uuid identity
        public string status;          // SCHEDULED | HONORED | EXPIRED
        public string payout_band;     // PENDING | NONE | MODEST | FAIR | STRONG | PREMIUM (never raw cents)
    }
    [Serializable] public class AppointmentEnvelope { public AppointmentPayload payload; }
    [Serializable] public class AppointmentPayload { public AppointmentDto data; }

    // =========================================================================
    // Phase-3 vector #3 (grow_house cultivation) — captured verbatim via curl against the live stack
    // (Tools/OPERATIONAL_CONTRACTS.md §17). Every leaf is a band STRING / a BOOLEAN / a uuid — NEVER a raw scalar
    // (no tend_count / grams / tick / heat / stage int; R2.2). DTOs are NOT re-declared elsewhere (CS0101 dup-DTO lesson).
    // =========================================================================

    // POST /v1/operational/grow-house/:id/plant  { precursor_type } → { grow_session_id } (201). Plant a GROWABLE
    // plant-derived precursor (verdant_root_extract | lull_resin | glass_lily) in a player-owned grow_house. Debits a
    // cheap seed cost server-side (raw cents NEVER forwarded — R2.2; the make-vs-buy saving). 404 not-owned / 409
    // WRONG_TYPE (not a grow_house) / 409 ALREADY_GROWING / 422 non-growable precursor.
    [Serializable] public class PlantRequestDto { public string precursor_type; } // verdant_root_extract | lull_resin | glass_lily
    [Serializable] public class PlantResultDto { public string grow_session_id; }
    [Serializable] public class PlantEnvelope { public PlantResultPayload payload; }
    [Serializable] public class PlantResultPayload { public PlantResultDto data; }

    // POST /v1/operational/grow-session/:id/tend  {} → { tended: true } (200). Tend a player-owned in-progress
    // grow_session (husbandry lever B — one tend bankable per stage, server-authoritative). The raw tend_count NEVER
    // forwarded (R2.2 — the player surface is the husbandry_band). 404 not-the-player's / 409 completed / 409 ALREADY_TENDED.
    [Serializable] public class TendResultDto { public bool tended; }
    [Serializable] public class TendEnvelope { public TendResultPayload payload; }
    [Serializable] public class TendResultPayload { public TendResultDto data; }

    // GET /v1/operational/grow-session/:id → the qualitative grow projection (R2.2 — never raw tend_count / stage clock /
    // harvest grams / heat). grow_stage_band: EARLY | MID | LATE | DONE ; husbandry_band: WITHERED | ON_TRACK | THRIVING ;
    // tend_due: a boolean (whether the CURRENT stage is still un-tended → a tend action is available now). Captured
    // verbatim via curl against the live stack (§17). The building's raid-risk band is REUSED from the building card
    // (GET /v1/operational/building/:id → raid_risk) — not re-derived here.
    [Serializable]
    public class GrowSessionDto
    {
        public string grow_session;     // uuid identity
        public string grow_stage_band;  // EARLY | MID | LATE | DONE (never the raw stage clock / count)
        public string husbandry_band;   // WITHERED | ON_TRACK | THRIVING (the tend trajectory; never tend_count)
        public bool tend_due;           // is the current stage un-tended (a tend action is available now) — a flag, never a count
    }
    [Serializable] public class GrowSessionEnvelope { public GrowSessionPayload payload; }
    [Serializable] public class GrowSessionPayload { public GrowSessionDto data; }

    // =========================================================================
    // Phase-4 vector #4 (distribution_hub courier-dispatch logistics) — captured verbatim via curl against the live stack
    // (Tools/OPERATIONAL_CONTRACTS.md §18). Every leaf is a band STRING / a BOOLEAN / a uuid / a categorical vehicle label
    // — NEVER a raw scalar (no hub_tier int / cap / shift count / vehicle speed / cents; R2.2). DTOs are NOT re-declared
    // elsewhere (CS0101 dup-DTO lesson — the hub bands live on BuildingCardDto above; these are the ACTION shapes).
    // =========================================================================

    // POST /v1/operational/building/:id/upgrade-hub-tier  → { upgraded: true } (200). Empty body (the id is the path param).
    // The BYTE-MIRROR of upgrade-tier (the specialized_lab lab-tier action) for a distribution_hub: debits the wallet by
    // the grounded hub-upgrade cost (raw cents NEVER forwarded — R2.2; the player surface is the qualitative hub_tier_band
    // on the next card load). 200 { upgraded: true }. At cap (MAX) / insufficient funds / non-distribution_hub → 409.
    [Serializable] public class UpgradeHubTierResultDto { public bool upgraded; }
    [Serializable] public class UpgradeHubTierEnvelope { public UpgradeHubTierResultPayload payload; }
    [Serializable] public class UpgradeHubTierResultPayload { public UpgradeHubTierResultDto data; }

    // POST /v1/operational/distribution/dispatch  { from_building_id, to_building_id, cargo_grams, vehicle_type? } →
    //   201 { courier_id, route_id, shift_id }. Dispatch a courier carrying the source building's product to a destination.
    // The vehicle_type (foot/bike/car) is SERVER-AUTHORITATIVELY gated: foot is always allowed; bike/car require an
    // OPERATIONAL distribution_hub (else 422 VALIDATION_FAILED — "vehicle not unlocked"). A roster at the concurrency cap →
    // 409 RESOURCE_STATE_CONFLICT (OVER_CAPACITY). Insufficient source product / same building → 409; bad building → 404.
    [Serializable]
    public class DispatchRequestDto
    {
        public string from_building_id;
        public string to_building_id;
        public int cargo_grams;
        public string vehicle_type;   // foot | bike | car (bike/car require an operational hub; the server validates → 422)
    }
    [Serializable] public class DispatchResultDto { public string courier_id; public string route_id; public string shift_id; }
    [Serializable] public class DispatchEnvelope { public DispatchResultPayload payload; }
    [Serializable] public class DispatchResultPayload { public DispatchResultDto data; }

    // =========================================================================
    // Phase-5 vector #5a (money_holding — clean-cash holding vault) — captured verbatim via curl against the live stack
    // (Tools/OPERATIONAL_CONTRACTS.md §19). Every leaf is a band STRING / a BOOLEAN — NEVER a raw scalar (no held_cents /
    // money_holding_tier int / yield rate / tick / forfeiture_scheduled_at_tick; R2.2). The money_holding bands live on
    // BuildingCardDto above; these are the ACTION shapes. DTOs are NOT re-declared elsewhere (CS0101 dup-DTO lesson).
    // =========================================================================

    // POST /v1/operational/building/:id/upgrade-money-holding-tier  → { upgraded: true } (200). Empty body (the id is the
    // path param). The BYTE-MIRROR of upgrade-hub-tier / upgrade-tier for a money_holding: debits the wallet by the
    // grounded money-holding-tier-upgrade cost (raw cents NEVER forwarded — R2.2; the player surface is the qualitative
    // money_holding_tier_band on the next card load). 200 { upgraded: true }. At cap (MAX) / insufficient funds /
    // non-money_holding / not-owned → 409 (WRONG_TYPE / AT_CAP / INSUFFICIENT_FUNDS) or 404 (well-formed errors).
    [Serializable] public class UpgradeMoneyHoldingTierResultDto { public bool upgraded; }
    [Serializable] public class UpgradeMoneyHoldingTierEnvelope { public UpgradeMoneyHoldingTierResultPayload payload; }
    [Serializable] public class UpgradeMoneyHoldingTierResultPayload { public UpgradeMoneyHoldingTierResultDto data; }

    // POST /v1/operational/building/:id/deposit-cash  { amount_cents } → { deposited: true } (200). Move clean cash from
    // the player's wallet into the money_holding pool. SERVER-AUTHORITATIVE: the server enforces the tier capacity
    // (held + amount > capacity → 409 OVER_CAPACITY, nothing moved) + sufficient funds (409 INSUFFICIENT_FUNDS); a
    // non-positive / non-integer amount → 422 VALIDATION_FAILED. The raw new balances are NOT forwarded (R2.2).
    [Serializable] public class TransferCashRequestDto { public int amount_cents; } // shared by deposit + withdraw (same body shape).
    [Serializable] public class DepositCashResultDto { public bool deposited; }
    [Serializable] public class DepositCashEnvelope { public DepositCashResultPayload payload; }
    [Serializable] public class DepositCashResultPayload { public DepositCashResultDto data; }

    // POST /v1/operational/building/:id/withdraw-cash  { amount_cents } → { withdrawn: true } (200). Move clean cash from
    // the money_holding pool back into the player's wallet. SERVER-AUTHORITATIVE: held < amount → 409 INSUFFICIENT_HELD
    // (nothing moved); a non-positive / non-integer amount → 422. The raw new balances are NOT forwarded (R2.2).
    [Serializable] public class WithdrawCashResultDto { public bool withdrawn; }
    [Serializable] public class WithdrawCashEnvelope { public WithdrawCashResultPayload payload; }
    [Serializable] public class WithdrawCashResultPayload { public WithdrawCashResultDto data; }

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
