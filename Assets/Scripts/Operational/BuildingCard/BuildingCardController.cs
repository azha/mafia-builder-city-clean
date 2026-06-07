using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer)

namespace MafiaCleanCity.Operational
{
    // Drives the Building Card screen (screen_2a) for a single operational building:
    //   1. signs in (POST /auth/v1/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
    //   2. fetches GET /v1/operational/building/:id (the Building Card projection) and
    //      renders the qualitative operational state — setup_state band, cover_band,
    //      operational flag, operational_type;
    //   3. offers the per-building-type actions the M1 loop exposes:
    //        lab        → Order Pyralin + Start Cook
    //        front_shop → Inject (launder)
    //        (any)      → a Convert affordance.
    //
    // R2.2 / P5: the projection only ever returns band STRINGS / BOOLEANS / uuid ids —
    // this screen renders exactly those; it NEVER fabricates a raw scalar (cents/grams/
    // ticks/heat). a11y F2: every status line carries a text label AND a shape glyph
    // (not colour alone), mirroring the CityMap heat badge convention.
    //
    // The whole UI is built programmatically from a single Canvas (mirrors
    // CityMap.CityMapController) so a scene needs almost no manual wiring.
    //
    // M1 scope note (honest deferral): the full screen_2a design (heat row, maintenance
    // LapsePhaseBucket, cohesion-neighbour, UnconformityLedger sparkline, demolish
    // long-press) is intentionally NOT built here — those projections are not part of the
    // M1 operational building-card endpoint, which returns only the four operational
    // fields above. This controller renders the M1-live surface faithfully and defers the
    // rest.
    public class BuildingCardController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        [Header("Target building")]
        [Tooltip("Operational building uuid to load. Set before Start (or call LoadBuilding).")]
        [SerializeField] private string buildingId = "";

        // ---- Public state (test hooks) ---------------------------------------
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool CardLoaded { get; private set; }
        public string CardError { get; private set; }
        public BuildingCardDto CurrentCard { get; private set; }
        public ActionOutcome LastActionOutcome { get; private set; }

        // ---- Phase-2b vector #2 (Crick) cold-chain test hooks --------------
        /// <summary>The cook-building storage + cold-chain projection (GET /v1/operational/storage/:id). Null for a
        /// non-cook building (the storage endpoint 404s → no cold-chain surface). A lab returns BRINDLE with a null
        /// temperature_status (no cold chain); a refinery returns CRICK with a temperature_status band.</summary>
        public StorageDto CurrentStorage { get; private set; }
        /// <summary>True when the cold-chain status row is currently shown (the storage projection carries a
        /// non-empty temperature_status — a cold-chain substance like Crick in a refinery).</summary>
        public bool ColdChainShown { get; private set; }

        // ---- Phase-2b raid/repair test hooks -------------------------------
        /// <summary>The player's qualitative wallet band (GET /v1/economy/wallet) used ONLY to gate Repair
        /// affordability (repair_cost band vs this band — never raw cents; R2.2). Null until first loaded.</summary>
        public string WalletBand { get; private set; }
        /// <summary>True when the Repair button is currently shown (structural_state==DAMAGED).</summary>
        public bool RepairButtonShown { get; private set; }
        /// <summary>True when the shown Repair button is INTERACTABLE (DAMAGED + wallet can afford the cost band).</summary>
        public bool RepairButtonAffordable { get; private set; }
        /// <summary>The full set of text shown to the player (labels + values) — used by the
        /// E2E to prove no raw scalar leaks client-side.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        // ---- Phase-2c vector #2c (Ash luxury channel) test hooks --------------
        /// <summary>True when the Ash lab-tier row is shown (a specialized_lab — lab_tier_band != NONE).</summary>
        public bool LabTierShown { get; private set; }
        /// <summary>True when the Ash purity-band row is shown (the storage projection carries a non-empty purity_band —
        /// an Ash specialized_lab with a completed batch).</summary>
        public bool PurityBandShown { get; private set; }
        /// <summary>True when the Upgrade-tier button is shown (a specialized_lab below MASTER).</summary>
        public bool UpgradeTierButtonShown { get; private set; }
        /// <summary>True when the shown Upgrade-tier button is INTERACTABLE (wallet band can afford the upgrade cost band).</summary>
        public bool UpgradeTierButtonAffordable { get; private set; }
        /// <summary>The qualitative appointment projection currently loaded for this building's Glass venue (GET
        /// /v1/operational/appointment/:id). Null until an appointment is booked + refreshed. status + payout_band only.</summary>
        public AppointmentDto CurrentAppointment { get; private set; }
        /// <summary>The appointment id the appointment panel tracks (set on a successful Book, or by a test before Refresh).</summary>
        public string AppointmentId { get; set; }
        /// <summary>The refining-passes value the cook-start selector currently holds (0..max — the time↔purity lever).</summary>
        public int RefiningPasses { get; private set; }

        // ---- Phase-3 vector #3 (grow_house cultivation) test hooks --------------
        /// <summary>The qualitative grow projection currently loaded for this grow_house's active grow_session (GET
        /// /v1/operational/grow-session/:id). Null until a grow is planted + refreshed. grow_stage_band + husbandry_band +
        /// tend_due only (never raw tend_count/stage clock/grams; R2.2).</summary>
        public GrowSessionDto CurrentGrow { get; private set; }
        /// <summary>The grow_session id the grow surface tracks (set on a successful Plant, or by a test before Refresh).</summary>
        public string GrowSessionId { get; set; }
        /// <summary>The growable precursor the plant selector currently holds (verdant_root_extract | lull_resin | glass_lily).</summary>
        public string SelectedPrecursor { get; private set; } = "verdant_root_extract";
        /// <summary>True when the grow-stage band row is shown (an active grow on this grow_house).</summary>
        public bool GrowStageShown { get; private set; }
        /// <summary>True when the husbandry-band row is shown (an active grow on this grow_house).</summary>
        public bool HusbandryShown { get; private set; }
        /// <summary>True when the Tend button is shown (an active grow that is not DONE).</summary>
        public bool TendButtonShown { get; private set; }
        /// <summary>True when the shown Tend button is INTERACTABLE (server-authoritative tend_due gate — the current
        /// stage is still un-tended). When tend_due is false (already tended this stage), the button is shown but disabled.</summary>
        public bool TendButtonEnabled { get; private set; }
        /// <summary>True when the plant selector is shown (an idle grow_house with no active grow yet).</summary>
        public bool PlantSelectorShown { get; private set; }

        // ---- Phase-4 vector #4 (distribution_hub courier-dispatch logistics) test hooks --------------
        /// <summary>True when the hub-tier band row is shown (a distribution_hub — hub_tier_band != NONE).</summary>
        public bool HubTierShown { get; private set; }
        /// <summary>True when the roster-occupancy band row is shown (a distribution_hub — roster_band != NONE).</summary>
        public bool RosterShown { get; private set; }
        /// <summary>True when the unlocked-vehicles row is shown (a distribution_hub card).</summary>
        public bool VehiclesShown { get; private set; }
        /// <summary>True when the Upgrade-hub-tier button is shown (a distribution_hub below MAX).</summary>
        public bool UpgradeHubTierButtonShown { get; private set; }
        /// <summary>True when the shown Upgrade-hub-tier button is INTERACTABLE (wallet band can afford the upgrade band).</summary>
        public bool UpgradeHubTierButtonAffordable { get; private set; }
        /// <summary>True when the dispatch vehicle selector is shown (a distribution_hub card — the foot/bike/car picker).</summary>
        public bool VehicleSelectorShown { get; private set; }
        /// <summary>The vehicle the dispatch selector currently holds (FOOT | BIKE | CAR — the chosen vehicle_type, uppercase).
        /// SERVER-AUTHORITATIVE: only a vehicle present in the card's available_vehicles is selectable; the cycle skips a
        /// locked one. A dispatch with a non-unlocked vehicle is rejected 422 even if the client bypassed the gate.</summary>
        public string SelectedVehicle { get; private set; } = "FOOT";
        /// <summary>The dispatch source + destination building ids a test wires before calling Dispatch() (the card's own
        /// building is the natural source on a hub demo; the test sets them explicitly so the dispatch is deterministic).</summary>
        public string DispatchFromBuildingId { get; set; }
        public string DispatchToBuildingId { get; set; }

        public string BuildingId { get => buildingId; set => buildingId = value; }

        /// <summary>
        /// Override the backend base URL (test convenience). The SerializeField defaults to the VPS
        /// (https://cleancity.erutheone.eu); a PlayMode E2E that drives the LOCAL dockerized stack sets this to
        /// http://localhost BEFORE SignIn so the auth + projection + action clients all target the local stack.
        /// Re-points the already-built clients too (idempotent; safe before or after EnsureInitialized).
        /// </summary>
        public void SetBaseUrl(string url)
        {
            baseUrl = url;
            if (auth != null) auth.BaseUrl = url;
            if (client != null) client.BaseUrl = url;
        }

        private readonly List<string> renderedTexts = new List<string>();
        private readonly List<Text> textComponents = new List<Text>();

        private Font font;
        private RectTransform cardContent;
        private Text titleText;
        private Text typeText;
        private RectTransform statusRows;
        private RectTransform actionBar;
        private Text actionStatusText;
        private Button repairButton; // Phase-2b: the Repair affordance (only built when DAMAGED).

        private AuthClient auth;
        private BuildingCardClient client;

        // Slate palette (mirrors CityMap + global_conventions_core direction).
        private static readonly Color SurfaceBg = new Color(0.086f, 0.098f, 0.106f); // #16191b
        private static readonly Color RowBg = new Color(0.137f, 0.165f, 0.176f);     // #232a2d
        private static readonly Color TextPrimary = new Color(0.933f, 0.945f, 0.949f);
        private static readonly Color AccentMild = new Color(0.263f, 0.878f, 0.753f);   // #43e0c0 cyan
        private static readonly Color AccentModerate = new Color(1f, 0.62f, 0.239f);     // #ff9e3d amber
        private static readonly Color AccentSevere = new Color(1f, 0.353f, 0.302f);      // #ff5a4d red
        private static readonly Color CtaColor = new Color(1f, 0.824f, 0.247f);          // #ffd23f yellow
        // Phase-2c: the 4th purity-band accent (the AccentMild/Moderate/Severe palette extended to 4 bands for the
        // ascending CUT < STANDARD < PURE < CRYSTALLINE grade). CRYSTALLINE = a bright violet-white "premium" hue,
        // visibly distinct from the cyan AccentMild so the top grade reads as exceptional. a11y: never colour-only —
        // every purity row also carries a distinct shape glyph + a worded label (F2).
        private static readonly Color AccentPremium = new Color(0.78f, 0.7f, 1f);        // #c7b3ff bright violet-white

        // True once this controller / its GameObject has been destroyed. An async load coroutine (a
        // UnityWebRequest round-trip) can be driven by an OUTSIDE pump (the PlayMode test runner runs
        // `yield return controller.LoadBuilding(...)` on ITS OWN runner object — not on this controller),
        // so destroying this controller's GameObject between fixtures does NOT stop that in-flight
        // coroutine: it will resume after the round-trip and reach Render(), dereferencing serialized
        // UI components (typeText, …) that Unity already tore down → NullReferenceException. Every async
        // resume point that precedes a UI mutation checks this (or `this == null`, Unity's overloaded
        // equality that reports a destroyed MonoBehaviour as null) and no-ops, so a continuation that
        // wakes up on a dead object exits cleanly instead of crashing. This is a teardown/cancellation
        // guard, NOT a render skip in the live app: it only triggers on a genuinely destroyed object.
        private bool destroyed;
        private bool Destroyed => destroyed || this == null;

        private void OnDestroy()
        {
            destroyed = true;
        }

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        // Lazily build clients + the UI so the controller is safe to drive (SignIn /
        // LoadBuilding) before Start() has run — e.g. an E2E that calls SignIn() in the
        // same frame as AddComponent. Idempotent.
        private bool initialized;
        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new BuildingCardClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        private IEnumerator Boot()
        {
            yield return SignIn();
            if (!IsAuthenticated) yield break;
            if (!string.IsNullOrEmpty(buildingId)) yield return LoadBuilding(buildingId);
        }

        /// <summary>Sign in and acquire a Bearer (REUSE AuthClient). Idempotent.</summary>
        public IEnumerator SignIn()
        {
            EnsureInitialized();
            if (IsAuthenticated) yield break;
            string token = null, err = null;
            yield return auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);
            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[BuildingCard] auth failed: {AuthError}");
                yield break;
            }
            Token = token;
            IsAuthenticated = true;
        }

        /// <summary>Set the player Bearer directly (test convenience when already signed in elsewhere).</summary>
        public void SetToken(string token)
        {
            Token = token;
            IsAuthenticated = !string.IsNullOrEmpty(token);
        }

        /// <summary>Fetch + render the Building Card projection for a building id.</summary>
        public IEnumerator LoadBuilding(string id)
        {
            EnsureInitialized();
            buildingId = id;
            CardLoaded = false;
            CardError = null;
            CurrentCard = null;

            yield return client.GetBuildingCard(id, Token,
                dto => CurrentCard = dto,
                (code, msg) => CardError = $"{code}: {msg}");

            // The GET above is a network round-trip; this controller's GameObject may have been
            // destroyed by an inter-fixture teardown while we awaited it. Bail before touching any UI.
            if (Destroyed) yield break;

            if (CurrentCard == null)
            {
                Debug.LogError($"[BuildingCard] load failed: {CardError}");
                RenderError();
                yield break;
            }

            // Phase-2b: read the wallet band (affordability gate for the Repair button). A read failure
            // leaves WalletBand null → the gate is CONSERVATIVE (Repair disabled). Only needed when DAMAGED,
            // but we always refresh it so the card is consistent. Never compares raw cents (R2.2).
            yield return RefreshWalletBand();

            // Phase-2b vector #2 (Crick): also fetch the cook-building storage + cold-chain projection. The storage
            // endpoint is COOK-ONLY (a lab → BRINDLE, a refinery → CRICK); a non-cook building 404s → CurrentStorage
            // stays null → no cold-chain row is rendered (a non-cook card is unaffected). A Brindle lab returns a null
            // temperature_status (no cold chain) → still no cold-chain row. Only a cold-chain substance (Crick in a
            // refinery, temperature_status != null) renders the cold-chain status row. Never blocks the card load.
            yield return RefreshStorage(id);

            // Phase-3 vector #3 (grow_house): also fetch the active grow's qualitative projection (grow_stage_band +
            // husbandry_band + tend_due) when a grow_session is tracked for this grow_house (set on Plant or by a test).
            // A non-grow_house card, or a grow_house with no tracked grow, leaves CurrentGrow null → no grow rows render.
            // The grow projection is grow_session-scoped; the building's raid-risk band is read off THIS card (raid_risk).
            yield return RefreshGrow();

            // RefreshWalletBand + RefreshStorage + RefreshGrow are further network round-trips; re-check the guard
            // before rendering so a teardown that landed mid-load no-ops instead of hitting dead UI.
            if (Destroyed) yield break;

            CardLoaded = true;
            Render(CurrentCard);
        }

        /// <summary>Fetch the cook-building storage + cold-chain projection (REUSE the storage endpoint). A 404 (a
        /// non-cook building) or any error leaves CurrentStorage null → no cold-chain row (the card is unaffected).</summary>
        public IEnumerator RefreshStorage(string id)
        {
            StorageDto storage = null;
            yield return client.GetStorage(id, Token, s => storage = s, (code, msg) => storage = null);
            CurrentStorage = storage;
        }

        /// <summary>Fetch the qualitative wallet band (REUSE the economy projection). Conservative on failure.</summary>
        public IEnumerator RefreshWalletBand()
        {
            string band = null;
            yield return client.GetWalletBand(Token, b => band = b, (code, msg) => band = null);
            WalletBand = band;
        }

        // ----------------------------------------------------------- actions API

        /// <summary>Lab action: order Pyralin precursors (the lab's first step). Genuinely 2xx-able.</summary>
        public IEnumerator OrderPyralin(int quantityUnits = 10)
        {
            yield return RunAction(c => client.OrderPrecursors(buildingId, quantityUnits, Token, c),
                "Ordered Pyralin", "Order failed");
        }

        /// <summary>Lab action: start a Brindle cook.</summary>
        public IEnumerator StartCook()
        {
            yield return RunAction(c => client.StartCook(buildingId, Token, c),
                "Cook started", "Cook unavailable");
        }

        /// <summary>Front-shop action: inject dirty cash to launder (front-shop = this building).</summary>
        public IEnumerator Inject(string safehouseId, int amountCents)
        {
            yield return RunAction(c => client.Inject(buildingId, safehouseId, amountCents, Token, c),
                "Cash injected", "Inject unavailable");
        }

        /// <summary>Convert affordance: convert this building to an M1 operational type.</summary>
        public IEnumerator Convert(string operationalType, string coverQuality = "weak")
        {
            yield return RunAction(c => client.Convert(buildingId, operationalType, coverQuality, Token, c),
                "Conversion requested", "Convert unavailable");
        }

        /// <summary>Phase-2b recovery action: repair a DAMAGED building (empty body; id is the path param).
        /// On success the backend flips structural_state → REPAIRING; we re-load the card so it reflects that.</summary>
        public IEnumerator Repair()
        {
            yield return RunAction(c => client.Repair(buildingId, Token, c),
                "Repair underway", "Repair unavailable");
            // Refresh the card so it reflects REPAIRING (+ the wallet band debited). Only if the building id
            // is intact (it always is here). The reload re-renders → the Repair button drops away (now REPAIRING).
            yield return LoadBuilding(buildingId);
        }

        // --------------------------------------------- Ash luxury channel actions (Phase-2c vector #2c)

        /// <summary>Set the refining-passes value the next Ash cook-start will use (the time↔purity lever; 0..max). Clamped
        /// at 0 client-side; the server enforces the real ceiling (passes &gt; max → 422). Test/UI convenience.</summary>
        public void SetRefiningPasses(int passes)
        {
            RefiningPasses = passes < 0 ? 0 : passes;
            // Re-render the actions so the cook-start label reflects the chosen passes (only if the card is loaded).
            if (CardLoaded && CurrentCard != null) BuildActions(CurrentCard);
        }

        /// <summary>specialized_lab action: upgrade the lab tier by one (cash-gated server-side). On success the card is
        /// reloaded so the lab_tier_band reflects the new tier (BASIC → REFINED → MASTER).</summary>
        public IEnumerator UpgradeTier()
        {
            yield return RunAction(c => client.UpgradeTier(buildingId, Token, c),
                "Lab tier upgraded", "Upgrade unavailable");
            // Reload so the card reflects the new lab_tier_band (+ the wallet band debited).
            yield return LoadBuilding(buildingId);
        }

        /// <summary>specialized_lab action: start an Ash cook with the chosen refining passes (the time↔purity lever).</summary>
        public IEnumerator StartCookAsh()
        {
            yield return RunAction(c => client.StartCookAsh(buildingId, RefiningPasses, Token, c),
                "Ash cook started", "Cook unavailable");
        }

        /// <summary>Appointment action: book an Ash appointment at a Glass venue (the ONLY Ash sale path). On success the
        /// appointment id is tracked + its projection refreshed → the appointment panel appears (SCHEDULED).</summary>
        public IEnumerator BookAppointment(string glassVenueBuildingId)
        {
            yield return RunAction(c => client.BookAppointment(glassVenueBuildingId, Token, c),
                "Appointment booked", "Booking unavailable");
            if (LastActionOutcome != null && LastActionOutcome.Ok && !string.IsNullOrEmpty(LastActionOutcome.ResultId))
            {
                AppointmentId = LastActionOutcome.ResultId;
                yield return RefreshAppointment();
                if (Destroyed) yield break; // torn down during the refresh round-trip → don't render dead UI.
                if (CardLoaded && CurrentCard != null) Render(CurrentCard); // re-render to show the new panel.
            }
        }

        /// <summary>Appointment action: honor the tracked SCHEDULED appointment (sells the Ash at the venue → HONORED). On
        /// success the appointment projection is refreshed → the panel reflects HONORED + the realized payout band.</summary>
        public IEnumerator HonorAppointment()
        {
            if (string.IsNullOrEmpty(AppointmentId)) yield break;
            yield return RunAction(c => client.HonorAppointment(AppointmentId, Token, c),
                "Appointment honored", "Honor unavailable");
            yield return RefreshAppointment();
            if (Destroyed) yield break; // torn down during the refresh round-trip → don't render dead UI.
            if (CardLoaded && CurrentCard != null) Render(CurrentCard); // re-render to show HONORED + the payout band.
        }

        /// <summary>Fetch the tracked appointment's qualitative projection (status + payout band). Leaves CurrentAppointment
        /// null on failure (a read error keeps the panel honest — no stale band shown).</summary>
        public IEnumerator RefreshAppointment()
        {
            if (string.IsNullOrEmpty(AppointmentId)) { CurrentAppointment = null; yield break; }
            AppointmentDto appt = null;
            yield return client.GetAppointment(AppointmentId, Token, a => appt = a, (code, msg) => appt = null);
            CurrentAppointment = appt;
        }

        // --------------------------------------------- grow_house cultivation actions (Phase-3 vector #3)

        /// <summary>Set the growable precursor the next Plant will use (verdant_root_extract | lull_resin | glass_lily).
        /// Re-renders the actions so the plant selector reflects the choice (only if the card is loaded). UI convenience —
        /// the server enforces the GROWABLE set (a non-growable precursor → 422).</summary>
        public void SetSelectedPrecursor(string precursor)
        {
            if (!string.IsNullOrEmpty(precursor)) SelectedPrecursor = precursor;
            if (CardLoaded && CurrentCard != null) BuildActions(CurrentCard);
        }

        /// <summary>grow_house action: plant the selected growable precursor (the cultivation PLANT action — debits a
        /// cheap seed cost server-side). On success the new grow_session id is tracked + its projection refreshed → the
        /// grow surface appears (EARLY, WITHERED, tend_due) and the card re-renders.</summary>
        public IEnumerator Plant()
        {
            yield return RunAction(c => client.Plant(buildingId, SelectedPrecursor, Token, c),
                "Planted", "Plant unavailable");
            // The Post parser returns the new grow_session_id (the uuid) as ResultId on success → track it so the
            // grow surface (the grow_session-scoped projection) loads on the re-render below.
            if (LastActionOutcome != null && LastActionOutcome.Ok && !string.IsNullOrEmpty(LastActionOutcome.ResultId))
                GrowSessionId = LastActionOutcome.ResultId;
            // Re-load the card so the grow surface (the projection-derived bands) is fetched + rendered.
            yield return LoadBuilding(buildingId);
        }

        /// <summary>grow_house action: tend the tracked in-progress grow_session (husbandry lever B — one tend per stage,
        /// server-authoritative). On success the husbandry_band trajectory rises + tend_due flips false; the card is
        /// re-loaded so the projection-derived bands reflect it.</summary>
        public IEnumerator Tend()
        {
            if (string.IsNullOrEmpty(GrowSessionId)) yield break;
            yield return RunAction(c => client.Tend(GrowSessionId, Token, c),
                "Tended", "Tend unavailable");
            // Re-load the card so the grow surface reflects the new husbandry_band + tend_due (server-authoritative).
            yield return LoadBuilding(buildingId);
        }

        /// <summary>Fetch the tracked grow_session's qualitative projection (grow_stage_band + husbandry_band + tend_due).
        /// Leaves CurrentGrow null on failure / when no grow is tracked (the surface stays honest — no stale band).</summary>
        public IEnumerator RefreshGrow()
        {
            if (string.IsNullOrEmpty(GrowSessionId)) { CurrentGrow = null; yield break; }
            GrowSessionDto grow = null;
            yield return client.GetGrowSession(GrowSessionId, Token, g => grow = g, (code, msg) => grow = null);
            CurrentGrow = grow;
        }

        // --------------------------------------------- distribution_hub logistics actions (Phase-4 vector #4)

        /// <summary>Set the vehicle the next Dispatch will use (FOOT | BIKE | CAR — uppercase). SERVER-AUTHORITATIVE: only a
        /// vehicle present in the loaded card's available_vehicles is accepted; a locked vehicle is ignored (the gate is
        /// mirrored client-side, but the definitive verdict is the server's 422). Re-renders the actions so the selector
        /// reflects the choice (only if the card is loaded). UI/test convenience.</summary>
        public void SetSelectedVehicle(string vehicle)
        {
            if (string.IsNullOrEmpty(vehicle)) return;
            string v = vehicle.ToUpperInvariant();
            // Only accept an UNLOCKED vehicle (server-authoritative mirror — the card's available_vehicles set).
            if (CurrentCard != null && CurrentCard.available_vehicles != null
                && System.Array.IndexOf(CurrentCard.available_vehicles, v) < 0) return;
            SelectedVehicle = v;
            if (CardLoaded && CurrentCard != null) BuildActions(CurrentCard);
        }

        /// <summary>distribution_hub action: upgrade the hub tier by one (cash-gated server-side). The byte-mirror of the
        /// specialized_lab UpgradeTier. On success the card is reloaded so the hub_tier_band reflects the new tier
        /// (SMALL → MEDIUM → … → MAX).</summary>
        public IEnumerator UpgradeHubTier()
        {
            yield return RunAction(c => client.UpgradeHubTier(buildingId, Token, c),
                "Hub tier upgraded", "Upgrade unavailable");
            // Reload so the card reflects the new hub_tier_band (+ the wallet band debited).
            yield return LoadBuilding(buildingId);
        }

        /// <summary>distribution_hub action: dispatch a courier with the chosen vehicle (the SelectedVehicle — foot/bike/car).
        /// The vehicle is SERVER-AUTHORITATIVELY gated (bike/car need an operational hub → 422 if not unlocked); a roster at
        /// the cap → 409 OVER_CAPACITY. The source/destination are the wired DispatchFrom/ToBuildingId. On success the card
        /// is reloaded so the roster_band reflects the new in-transit shipment.</summary>
        public IEnumerator Dispatch(int cargoGrams = 10)
        {
            string vehicle = (SelectedVehicle ?? "FOOT").ToLowerInvariant(); // the wire wants lowercase foot/bike/car.
            yield return RunAction(
                c => client.Dispatch(DispatchFromBuildingId, DispatchToBuildingId, cargoGrams, vehicle, Token, c),
                "Courier dispatched", "Dispatch unavailable");
            // Reload so the roster_band reflects the new in-transit shipment (OPEN → BUSY → FULL).
            yield return LoadBuilding(buildingId);
        }

        private IEnumerator RunAction(System.Func<System.Action<ActionOutcome>, IEnumerator> call,
            string okPrefix, string errPrefix)
        {
            ActionOutcome outcome = null;
            yield return call(o => outcome = o);
            LastActionOutcome = outcome;

            // The action POST is a network round-trip; bail if the controller was torn down meanwhile,
            // before touching actionStatusText (a destroyed serialized Text → NullReferenceException).
            if (Destroyed) yield break;

            // F2: surface a human message, never a raw HTTP code, to the player.
            string line = outcome.Ok
                ? (string.IsNullOrEmpty(outcome.ResultId) ? okPrefix : $"{okPrefix}")
                : $"{errPrefix} — {outcome.Message}";
            if (actionStatusText != null) actionStatusText.text = line;
            TrackText(actionStatusText, line);
        }

        // --------------------------------------------------------------- render

        private void Render(BuildingCardDto card)
        {
            // Belt-and-braces: every async resume point above already guards, but Render dereferences the
            // serialized UI Text fields directly, so it self-guards too — a continuation that somehow reaches
            // here on a destroyed controller (or before BuildLayout ran) no-ops rather than NREs. The guard
            // only fires on a genuinely destroyed object / un-built layout, never silently in the live app.
            if (Destroyed || titleText == null || typeText == null || card == null) return;

            ClearRows();

            titleText.text = "OPERATIONAL BUILDING";
            typeText.text = $"Type: {TypeLabel(card.operational_type)}";
            TrackText(titleText, titleText.text);
            TrackText(typeText, typeText.text);

            // Status rows — each line: glyph (shape) + label + qualitative band value.
            // F2: shape glyph is present alongside colour (colour is never the sole carrier).
            AddStatusRow("Setup", SetupLabel(card.setup_state), SetupGlyph(card.setup_state), SetupAccent(card.setup_state));
            AddStatusRow("Operational", card.operational ? "Yes" : "No",
                card.operational ? "[#]" : "[ ]", card.operational ? AccentMild : AccentSevere);
            AddStatusRow("Cover", CoverLabel(card.cover_band), CoverGlyph(card.cover_band), CoverAccent(card.cover_band));

            // ----- Phase-2b raid / repair / risk surface (a11y F2: glyph + text, never colour-only; R2.2: bands only) -----
            AddStatusRow("Structure", StructuralLabel(card.structural_state),
                StructuralGlyph(card.structural_state), StructuralAccent(card.structural_state));
            // Raid-risk band gauge (LOW → IMMINENT) — a filled-bar glyph + worded band label.
            AddStatusRow("Raid risk", RaidRiskLabel(card.raid_risk),
                RaidRiskGlyph(card.raid_risk), RaidRiskAccent(card.raid_risk));

            // Raid notification/flag — shown only when this building was recently raided. The seized amount is a
            // qualitative band (NEVER raw grams; R2.2). A warning glyph carries the alert alongside colour (F2).
            if (card.recently_raided)
            {
                string notif = $"Raided — seized {SeizedLabel(card.seized_amount)}";
                AddStatusRow("Alert", notif, "[!]", AccentSevere);
            }

            // ----- Phase-2b vector #2 (Crick) cold-chain surface — ONLY when the storage projection carries a
            // cold-chain temperature_status (a refinery holding Crick). A non-cook building (no storage / 404) or a
            // Brindle lab (temperature_status null) renders NO cold-chain rows. R2.2: bands/labels/glyphs/booleans only
            // (never a raw °C / grams / rate); F2: every row carries a shape glyph alongside colour. -----
            ColdChainShown = false;
            StorageDto storage = CurrentStorage;
            if (storage != null && !string.IsNullOrEmpty(storage.temperature_status))
            {
                ColdChainShown = true;
                // Substance row — surfaces which substance this cold chain protects (Crick).
                AddStatusRow("Substance", SubstanceLabel(storage.substance_type), "[*]", AccentMild);
                // Temperature band row — the qualitative cold-chain status (OPTIMAL_COLD / MODERATE / HOT).
                AddStatusRow("Temperature", TemperatureLabel(storage.temperature_status),
                    TemperatureGlyph(storage.temperature_status), TemperatureAccent(storage.temperature_status));
                // Degrading indicator row — Stable vs Degrading (a boolean, never a raw rate).
                AddStatusRow("Cold chain", storage.degrading ? "Degrading" : "Stable",
                    storage.degrading ? "[v]" : "[=]", storage.degrading ? AccentSevere : AccentMild);
            }

            // ----- Phase-2c vector #2c (Ash luxury channel) surface — ONLY for a specialized_lab (substance=ASH). The
            // lab-tier row reads the building-card lab_tier_band (BASIC / REFINED / MASTER); the purity row reads the
            // storage projection's purity_band (CUT / STANDARD / PURE / CRYSTALLINE) when a batch has been cooked. R2.2:
            // bands/labels/glyphs only (never a raw tier int / purity score); F2: every row carries a shape glyph. -----
            LabTierShown = false;
            PurityBandShown = false;
            if (card.operational_type == "specialized_lab")
            {
                // Substance row — surfaces which substance this luxury lab produces (Ash). The specialized_lab is the Ash
                // host (no cold-chain block runs for it — temperature_status is null), so the Ash surface shows its own
                // substance row from the storage projection (substance_type=ASH). Defaults to "Ash" if storage is absent.
                StorageDto labStorage = CurrentStorage;
                string labSubstance = (labStorage != null && !string.IsNullOrEmpty(labStorage.substance_type))
                    ? labStorage.substance_type
                    : "ASH";
                AddStatusRow("Substance", SubstanceLabel(labSubstance), "[*]", AccentMild);

                // Lab-tier band row — the specialized_lab's standing (a higher band → purer Ash). Always shown for a
                // specialized_lab (lab_tier_band is BASIC/REFINED/MASTER; NONE would only be a non-specialized_lab).
                if (!string.IsNullOrEmpty(card.lab_tier_band) && card.lab_tier_band != "NONE")
                {
                    LabTierShown = true;
                    AddStatusRow("Lab tier", LabTierLabel(card.lab_tier_band),
                        LabTierGlyph(card.lab_tier_band), LabTierAccent(card.lab_tier_band));
                }

                // Purity-band row — the cooked Ash batch's quality grade (from the storage projection). Shown only when a
                // batch exists (purity_band non-empty); an empty specialized_lab (no completed cook yet) shows no row.
                StorageDto st = CurrentStorage;
                if (st != null && !string.IsNullOrEmpty(st.purity_band))
                {
                    PurityBandShown = true;
                    AddStatusRow("Purity", PurityLabel(st.purity_band),
                        PurityGlyph(st.purity_band), PurityAccent(st.purity_band));
                }
            }

            // Appointment panel — the luxury-channel sale lifecycle (book → SCHEDULED → honor → HONORED, or EXPIRED). Shown
            // only when an appointment is currently tracked for this building (CurrentAppointment loaded). R2.2: the status
            // band + the payout band only (never raw ticks/cents); F2: a distinct glyph per status alongside colour.
            if (CurrentAppointment != null && !string.IsNullOrEmpty(CurrentAppointment.status))
            {
                AddStatusRow("Appointment", AppointmentStatusLabel(CurrentAppointment.status),
                    AppointmentStatusGlyph(CurrentAppointment.status), AppointmentStatusAccent(CurrentAppointment.status));
                AddStatusRow("Payout", PayoutLabel(CurrentAppointment.payout_band),
                    PayoutGlyph(CurrentAppointment.payout_band), PayoutAccent(CurrentAppointment.payout_band));
            }

            // ----- Phase-3 vector #3 (grow_house cultivation) surface — ONLY for a grow_house with an active grow tracked.
            // The grow-stage row reads grow_stage_band (EARLY / MID / LATE / DONE); the husbandry row reads husbandry_band
            // (WITHERED / ON_TRACK / THRIVING — the AccentMild/Moderate/Severe/Premium palette reused). The crop's substance
            // (the planted precursor) is surfaced too. R2.2: bands/labels/glyphs only (never tend_count / grams / stage int /
            // heat); F2: every row carries a shape glyph. The raid-risk band is ALREADY rendered above (REUSE — an active
            // grow makes the grow_house hot → its raid_risk climbs); a raid that seized the crop shows via the Alert row
            // above (recently_raided + seized_amount band). The grow surface is grow_session-scoped (CurrentGrow). -----
            GrowStageShown = false;
            HusbandryShown = false;
            if (card.operational_type == "grow_house" && CurrentGrow != null
                && !string.IsNullOrEmpty(CurrentGrow.grow_stage_band))
            {
                // Crop row — surfaces which growable precursor this grow_house is cultivating (the planted substance).
                AddStatusRow("Crop", GrowablePrecursorLabel(SelectedPrecursor), "[*]", AccentMild);
                // Grow-stage band row — the qualitative growth phase (EARLY → DONE) with a rising filled-bar glyph.
                GrowStageShown = true;
                AddStatusRow("Grow stage", GrowStageLabel(CurrentGrow.grow_stage_band),
                    GrowStageGlyph(CurrentGrow.grow_stage_band), GrowStageAccent(CurrentGrow.grow_stage_band));
                // Husbandry band row — the qualitative tend trajectory (WITHERED → THRIVING) — the husbandry payoff signal.
                HusbandryShown = true;
                AddStatusRow("Husbandry", HusbandryLabel(CurrentGrow.husbandry_band),
                    HusbandryGlyph(CurrentGrow.husbandry_band), HusbandryAccent(CurrentGrow.husbandry_band));
            }

            // ----- Phase-4 vector #4 (distribution_hub courier-dispatch logistics) surface — ONLY for a distribution_hub.
            // The hub-tier row reads hub_tier_band (SMALL → MAX — the roster-cap lever); the roster row reads roster_band
            // (OPEN / BUSY / FULL — the player's concurrent-shipment occupancy; FULL ⇒ a further dispatch is refused); the
            // vehicles row surfaces available_vehicles (the unlocked vehicle modes — FOOT always, +BIKE/CAR when the hub is
            // operational). R2.2: bands / categorical vehicle labels / glyphs only (NEVER a raw hub_tier int / shift count /
            // cap / vehicle speed); F2: every row carries a shape glyph. The raid-risk band is ALREADY rendered above (REUSE).
            HubTierShown = false;
            RosterShown = false;
            VehiclesShown = false;
            if (card.operational_type == "distribution_hub")
            {
                // Hub-tier band row — the hub's STANDING (a higher band → a larger courier roster cap). Always shown for a
                // distribution_hub (hub_tier_band is SMALL..MAX; NONE would only be a non-distribution_hub).
                if (!string.IsNullOrEmpty(card.hub_tier_band) && card.hub_tier_band != "NONE")
                {
                    HubTierShown = true;
                    AddStatusRow("Hub tier", HubTierLabel(card.hub_tier_band),
                        HubTierGlyph(card.hub_tier_band), HubTierAccent(card.hub_tier_band));
                }
                // Roster-occupancy band row — how much of the player's concurrent-shipment capacity is in use (OPEN / BUSY /
                // FULL — never the raw count/cap). FULL telegraphs that a further dispatch is refused (409 OVER_CAPACITY).
                if (!string.IsNullOrEmpty(card.roster_band) && card.roster_band != "NONE")
                {
                    RosterShown = true;
                    AddStatusRow("Roster", RosterLabel(card.roster_band),
                        RosterGlyph(card.roster_band), RosterAccent(card.roster_band));
                }
                // Unlocked-vehicles row — the categorical vehicle modes the hub unlocks (FOOT always; +BIKE/CAR on an
                // operational hub). A worded list (never speeds; R2.2). The "[~]" glyph reads as "fleet/modes available".
                VehiclesShown = true;
                AddStatusRow("Vehicles", AvailableVehiclesLabel(card.available_vehicles), "[~]", AccentMild);
            }

            BuildActions(card);
        }

        private void RenderError()
        {
            ClearRows();
            titleText.text = "OPERATIONAL BUILDING";
            typeText.text = "Failed to load building. Check the seeder + stack.";
            TrackText(titleText, titleText.text);
            TrackText(typeText, typeText.text);
        }

        // Build the per-type action affordances the M1 loop exposes.
        private void BuildActions(BuildingCardDto card)
        {
            for (int i = actionBar.childCount - 1; i >= 0; i--)
                Object.Destroy(actionBar.GetChild(i).gameObject);

            string label = NewSectionLabel(actionBar, "ACTIONS");
            TrackText(null, label);

            // Phase-2b: the Repair affordance — visible ONLY when the building is DAMAGED. It shows the repair
            // COST band (qualitative — never cents) and is DISABLED when the wallet band can't afford that cost
            // band (a qualitative band comparison; R2.2). The definitive verdict still lives server-side (409).
            repairButton = null;
            RepairButtonShown = false;
            RepairButtonAffordable = false;
            // Phase-3 vector #3: reset the grow_house affordance flags (set only in the grow_house case below).
            PlantSelectorShown = false;
            TendButtonShown = false;
            TendButtonEnabled = false;
            if (card.structural_state == "DAMAGED")
            {
                RepairButtonShown = true;
                bool affordable = CanAfford(card.repair_cost, WalletBand);
                RepairButtonAffordable = affordable;
                string repairLabel = $"Repair ({RepairCostLabel(card.repair_cost)})";
                repairButton = AddActionButton(actionBar, repairLabel, () => StartCoroutine(Repair()));
                SetButtonInteractable(repairButton, affordable);
                if (!affordable)
                {
                    // F2: a readable reason, never a raw number, beside the disabled button.
                    string reason = "Repair (insufficient cash)";
                    Text hint = NewText("RepairHint", actionBar, reason, 13, TextAnchor.MiddleLeft);
                    hint.color = AccentSevere;
                    AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                    TrackText(hint, reason);
                }
            }

            // Phase-2c: the specialized_lab Upgrade-tier affordance — visible when the lab is below MASTER (BASIC / REFINED).
            // It shows the tier band and is DISABLED when the wallet band can't afford the upgrade (a qualitative band
            // comparison; R2.2 — never cents). The definitive verdict still lives server-side (409). MASTER (capped) shows
            // no button. Only rendered for a specialized_lab.
            UpgradeTierButtonShown = false;
            UpgradeTierButtonAffordable = false;
            if (card.operational_type == "specialized_lab" &&
                (card.lab_tier_band == "BASIC" || card.lab_tier_band == "REFINED"))
            {
                UpgradeTierButtonShown = true;
                bool affordable = CanAffordUpgrade(WalletBand);
                UpgradeTierButtonAffordable = affordable;
                Button upgradeBtn = AddActionButton(actionBar, "Upgrade lab tier", () => StartCoroutine(UpgradeTier()));
                SetButtonInteractable(upgradeBtn, affordable);
                if (!affordable)
                {
                    string reason = "Upgrade lab tier (insufficient cash)";
                    Text hint = NewText("UpgradeHint", actionBar, reason, 13, TextAnchor.MiddleLeft);
                    hint.color = AccentSevere;
                    AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                    TrackText(hint, reason);
                }
            }

            // Phase-4 vector #4: the distribution_hub Upgrade-hub-tier affordance — the SIBLING of the Ash upgrade-tier
            // button, calling upgrade-hub-tier instead. Visible when the hub is below MAX (SMALL/MEDIUM/LARGE/MAJOR). It is
            // DISABLED when the wallet band can't afford the upgrade (a qualitative band-vs-band comparison; R2.2 — NEVER
            // cents). The definitive verdict still lives server-side (409). MAX (capped) shows no button. Only rendered for
            // a distribution_hub.
            UpgradeHubTierButtonShown = false;
            UpgradeHubTierButtonAffordable = false;
            if (card.operational_type == "distribution_hub" &&
                (card.hub_tier_band == "SMALL" || card.hub_tier_band == "MEDIUM" ||
                 card.hub_tier_band == "LARGE" || card.hub_tier_band == "MAJOR"))
            {
                UpgradeHubTierButtonShown = true;
                bool affordable = CanAffordUpgrade(WalletBand);
                UpgradeHubTierButtonAffordable = affordable;
                Button upgradeBtn = AddActionButton(actionBar, "Upgrade hub tier", () => StartCoroutine(UpgradeHubTier()));
                SetButtonInteractable(upgradeBtn, affordable);
                if (!affordable)
                {
                    string reason = "Upgrade hub tier (insufficient cash)";
                    Text hint = NewText("HubUpgradeHint", actionBar, reason, 13, TextAnchor.MiddleLeft);
                    hint.color = AccentSevere;
                    AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                    TrackText(hint, reason);
                }
            }

            switch (card.operational_type)
            {
                case "lab":
                    AddActionButton(actionBar, "Order Pyralin", () => StartCoroutine(OrderPyralin()));
                    AddActionButton(actionBar, "Start Cook", () => StartCoroutine(StartCook()));
                    break;
                case "specialized_lab":
                    // Ash cook — the refining-passes selector (the time↔purity lever) + the Start Ash Cook button. The
                    // selector worded count (no raw number leaks — it's a deliberate label "+N passes" inside our own UI,
                    // but to keep the no-raw-scalar guard simple we word the passes count rather than print a bare digit).
                    AddRefiningPassesSelector(actionBar);
                    AddActionButton(actionBar, "Start Ash Cook", () => StartCoroutine(StartCookAsh()));
                    // Honor affordance — only when a SCHEDULED appointment is tracked for this lab (the Ash sale path).
                    if (CurrentAppointment != null && CurrentAppointment.status == "SCHEDULED")
                        AddActionButton(actionBar, "Honor appointment", () => StartCoroutine(HonorAppointment()));
                    break;
                case "front_shop":
                    // Inject needs a safehouse target — wired by the caller/test via Inject(safehouseId, amount).
                    AddActionButton(actionBar, "Inject (launder)", () => { /* needs safehouse target; driven via Inject() */ });
                    break;
                case "grow_house":
                    // Phase-3 vector #3: the cultivation affordances.
                    //   - NO active grow tracked → the PLANT selector (choose a growable precursor) + the Plant button.
                    //   - An active grow that is NOT DONE → the Tend button, INTERACTABLE only when tend_due (the current
                    //     stage is still un-tended). The gate is SERVER-AUTHORITATIVE: tend_due comes from the projection;
                    //     a tend on an already-tended stage is rejected 409 even if the client allowed it.
                    PlantSelectorShown = false;
                    TendButtonShown = false;
                    TendButtonEnabled = false;
                    bool hasActiveGrow = CurrentGrow != null && !string.IsNullOrEmpty(CurrentGrow.grow_stage_band)
                        && CurrentGrow.grow_stage_band != "DONE";
                    if (hasActiveGrow)
                    {
                        TendButtonShown = true;
                        bool tendDue = CurrentGrow.tend_due;
                        TendButtonEnabled = tendDue;
                        Button tendBtn = AddActionButton(actionBar, "Tend crop", () => StartCoroutine(Tend()));
                        SetButtonInteractable(tendBtn, tendDue);
                        if (!tendDue)
                        {
                            // F2: a readable reason beside the disabled button (this stage is already tended).
                            string reason = "Tend crop (already tended this stage)";
                            Text hint = NewText("TendHint", actionBar, reason, 13, TextAnchor.MiddleLeft);
                            hint.color = new Color(0.55f, 0.59f, 0.63f);
                            AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                            TrackText(hint, reason);
                        }
                    }
                    else
                    {
                        // Idle grow_house (no active grow) → the plant selector + Plant button.
                        PlantSelectorShown = true;
                        AddPlantSelector(actionBar);
                        AddActionButton(actionBar, "Plant", () => StartCoroutine(Plant()));
                    }
                    break;
                case "distribution_hub":
                    // Phase-4 vector #4: the courier-dispatch affordances — the vehicle selector (foot/bike/car, gated by
                    // the SERVER's available_vehicles set — a locked vehicle is non-selectable) + the Dispatch button. The
                    // Dispatch button is DISABLED when the source/destination aren't wired yet (a test/UI sets them); the
                    // server is the final authority (a not-unlocked vehicle → 422, a full roster → 409 OVER_CAPACITY).
                    AddVehicleSelector(actionBar, card);
                    bool dispatchReady = !string.IsNullOrEmpty(DispatchFromBuildingId)
                        && !string.IsNullOrEmpty(DispatchToBuildingId);
                    Button dispatchBtn = AddActionButton(actionBar, "Dispatch courier", () => StartCoroutine(Dispatch()));
                    SetButtonInteractable(dispatchBtn, dispatchReady);
                    if (!dispatchReady)
                    {
                        string reason = "Dispatch courier (choose a source + destination)";
                        Text hint = NewText("DispatchHint", actionBar, reason, 13, TextAnchor.MiddleLeft);
                        hint.color = new Color(0.55f, 0.59f, 0.63f);
                        AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                        TrackText(hint, reason);
                    }
                    break;
                case "stash":
                case "cash_safehouse":
                case "dealer_spot_front":
                    // No M1 player-triggered action on these surfaces beyond convert; keep the affordance honest.
                    break;
            }

            // A Convert affordance is always offered (no-op if already operational — backend 409s cleanly).
            AddActionButton(actionBar, "Convert", () => StartCoroutine(Convert(card.operational_type)));

            actionStatusText = NewText("ActionStatus", actionBar, "", 14, TextAnchor.MiddleLeft);
            actionStatusText.color = new Color(0.7f, 0.74f, 0.78f);
            AddLayoutElement(actionStatusText.gameObject, minHeight: 22, flexibleHeight: 0);
        }

        // ----------------------------------------------------- band → label/glyph

        private static string TypeLabel(string t)
        {
            switch (t)
            {
                case "lab": return "Lab";
                case "stash": return "Stash";
                case "front_shop": return "Front shop";
                case "cash_safehouse": return "Cash safehouse";
                case "dealer_spot_front": return "Dealer-spot front";
                case "specialized_lab": return "Specialized lab";
                case "refinery": return "Refinery";
                case "grow_house": return "Grow house";
                case "": case null: return "Not converted";
                default: return t;
            }
        }

        private static string SetupLabel(string s)
        {
            switch (s)
            {
                case "OPERATIONAL": return "Operational";
                case "IN_SETUP": return "In setup";
                case "NOT_CONVERTED": return "Not converted";
                default: return s;
            }
        }
        private static string SetupGlyph(string s) =>
            s == "OPERATIONAL" ? "[#]" : s == "IN_SETUP" ? "[~]" : "[ ]";
        private static Color SetupAccent(string s) =>
            s == "OPERATIONAL" ? AccentMild : s == "IN_SETUP" ? AccentModerate : AccentSevere;

        private static string CoverLabel(string b)
        {
            switch (b)
            {
                case "STRONG": return "Strong";
                case "STANDARD": return "Standard";
                case "WEAK": return "Weak";
                case "NONE": return "None";
                default: return b;
            }
        }
        private static string CoverGlyph(string b)
        {
            switch (b)
            {
                case "STRONG": return "[###]";
                case "STANDARD": return "[##.]";
                case "WEAK": return "[#..]";
                default: return "[...]";
            }
        }
        private static Color CoverAccent(string b) =>
            b == "STRONG" ? AccentMild : b == "STANDARD" ? AccentMild : b == "WEAK" ? AccentModerate : AccentSevere;

        // ----- Phase-2b: structural_state (OPERATIONAL | DAMAGED | REPAIRING) -----
        private static string StructuralLabel(string s)
        {
            switch (s)
            {
                case "OPERATIONAL": return "Intact";
                case "DAMAGED": return "Damaged";
                case "REPAIRING": return "Repairing";
                default: return s;
            }
        }
        // Distinct shape per state (a11y F2 — shape carries the meaning alongside colour).
        private static string StructuralGlyph(string s) =>
            s == "OPERATIONAL" ? "[#]" : s == "REPAIRING" ? "[~]" : "[x]";
        private static Color StructuralAccent(string s) =>
            s == "OPERATIONAL" ? AccentMild : s == "REPAIRING" ? AccentModerate : AccentSevere;

        // ----- Phase-2b: raid_risk band gauge (LOW | ELEVATED | HIGH | IMMINENT) -----
        private static string RaidRiskLabel(string b)
        {
            switch (b)
            {
                case "LOW": return "Low";
                case "ELEVATED": return "Elevated";
                case "HIGH": return "High";
                case "IMMINENT": return "Imminent";
                default: return b;
            }
        }
        // A 4-segment filled-bar gauge (shape encodes the level — a11y F2, mirrors the cover/cleanliness gauges).
        private static string RaidRiskGlyph(string b)
        {
            switch (b)
            {
                case "LOW": return "[#...]";
                case "ELEVATED": return "[##..]";
                case "HIGH": return "[###.]";
                case "IMMINENT": return "[####]";
                default: return "[....]";
            }
        }
        private static Color RaidRiskAccent(string b) =>
            b == "LOW" ? AccentMild : b == "ELEVATED" ? AccentModerate : AccentSevere;

        // ----- Phase-2b: seized_amount band (NONE | LOW | MODERATE | HIGH) — for the raid notification -----
        private static string SeizedLabel(string b)
        {
            switch (b)
            {
                case "HIGH": return "a heavy haul";
                case "MODERATE": return "a moderate haul";
                case "LOW": return "a light haul";
                case "NONE": return "nothing";
                default: return b;
            }
        }

        // ----- Phase-2b: repair_cost band (NONE | MINOR | MODERATE | MAJOR) — shown on the Repair button -----
        private static string RepairCostLabel(string b)
        {
            switch (b)
            {
                case "MAJOR": return "major cost";
                case "MODERATE": return "moderate cost";
                case "MINOR": return "minor cost";
                case "NONE": return "no cost";
                default: return b;
            }
        }

        // ----- Phase-2b vector #2 (Crick) cold-chain: substance_type label (BRINDLE | CRICK | …) -----
        private static string SubstanceLabel(string s)
        {
            switch (s)
            {
                case "BRINDLE": return "Brindle";
                case "CRICK": return "Crick";
                case "HUSH": return "Hush";
                case "ASH": return "Ash";
                case "": case null: return "—";
                default: return s;
            }
        }

        // ----- Phase-2b vector #2 (Crick) cold-chain: temperature_status band (OPTIMAL_COLD | MODERATE | HOT) -----
        // R2.2: a qualitative band label, NEVER a raw °C. OPTIMAL_COLD=good (mild), MODERATE=amber, HOT=severe.
        private static string TemperatureLabel(string b)
        {
            switch (b)
            {
                case "OPTIMAL_COLD": return "Optimal (cold)";
                case "MODERATE": return "Warming";
                case "HOT": return "Hot";
                default: return b;
            }
        }
        // Distinct shape per band (a11y F2 — shape carries the meaning alongside colour; mirrors the cover/risk gauges).
        private static string TemperatureGlyph(string b)
        {
            switch (b)
            {
                case "OPTIMAL_COLD": return "[*]";  // a snowflake-ish mark — cold/good
                case "MODERATE": return "[~]";       // wavy — warming
                case "HOT": return "[!]";            // alert — hot/at risk
                default: return "[?]";
            }
        }
        private static Color TemperatureAccent(string b) =>
            b == "OPTIMAL_COLD" ? AccentMild : b == "MODERATE" ? AccentModerate : AccentSevere;

        // ----- Phase-2c vector #2c (Ash — T5): lab_tier_band (BASIC | REFINED | MASTER) — the specialized_lab standing -----
        private static string LabTierLabel(string b)
        {
            switch (b)
            {
                case "BASIC": return "Basic";
                case "REFINED": return "Refined";
                case "MASTER": return "Master";
                default: return b;
            }
        }
        // A rising filled-pip gauge (shape carries the tier alongside colour — a11y F2, mirrors the cover/risk gauges).
        private static string LabTierGlyph(string b)
        {
            switch (b)
            {
                case "BASIC": return "[#..]";
                case "REFINED": return "[##.]";
                case "MASTER": return "[###]";
                default: return "[...]";
            }
        }
        // BASIC = amber (the entry tier, room to grow), REFINED = cyan (a solid lab), MASTER = premium violet (the top tier).
        private static Color LabTierAccent(string b) =>
            b == "MASTER" ? AccentPremium : b == "REFINED" ? AccentMild : AccentModerate;

        // ----- Phase-2c vector #2c (Ash — T9): purity_band (CUT | STANDARD | PURE | CRYSTALLINE) — the batch grade -----
        // R2.2: a qualitative band label, NEVER the raw purity_score. Ascending grade: CUT < STANDARD < PURE < CRYSTALLINE.
        private static string PurityLabel(string b)
        {
            switch (b)
            {
                case "CUT": return "Cut";
                case "STANDARD": return "Standard";
                case "PURE": return "Pure";
                case "CRYSTALLINE": return "Crystalline";
                default: return b;
            }
        }
        // A 4-segment crystal-fill gauge (shape encodes the grade — a11y F2: shape carries the level alongside colour).
        private static string PurityGlyph(string b)
        {
            switch (b)
            {
                case "CUT": return "[*...]";
                case "STANDARD": return "[**..]";
                case "PURE": return "[***.]";
                case "CRYSTALLINE": return "[****]";
                default: return "[....]";
            }
        }
        // The 4-band palette: CUT = severe (cut/low), STANDARD = amber, PURE = cyan, CRYSTALLINE = premium violet (the best).
        private static Color PurityAccent(string b)
        {
            switch (b)
            {
                case "CRYSTALLINE": return AccentPremium;
                case "PURE": return AccentMild;
                case "STANDARD": return AccentModerate;
                default: return AccentSevere; // CUT (the lowest grade)
            }
        }

        // ----- Phase-2c vector #2c (Ash — T7/T8): appointment status (SCHEDULED | HONORED | EXPIRED) -----
        private static string AppointmentStatusLabel(string s)
        {
            switch (s)
            {
                case "SCHEDULED": return "Scheduled";
                case "HONORED": return "Honored";
                case "EXPIRED": return "Expired";
                default: return s;
            }
        }
        // Distinct shape per status (a11y F2 — shape carries the meaning alongside colour).
        private static string AppointmentStatusGlyph(string s) =>
            s == "HONORED" ? "[#]" : s == "SCHEDULED" ? "[~]" : "[x]";
        // SCHEDULED = amber (pending/awaiting), HONORED = cyan (a completed sale), EXPIRED = severe (lost).
        private static Color AppointmentStatusAccent(string s) =>
            s == "HONORED" ? AccentMild : s == "SCHEDULED" ? AccentModerate : AccentSevere;

        // ----- Phase-2c vector #2c (Ash — T9): payout_band (PENDING | NONE | MODEST | FAIR | STRONG | PREMIUM) -----
        // R2.2: the realized-value tier as a band, NEVER the raw payout cents. PENDING (scheduled, not yet sold), NONE
        // (expired, lost), then the ascending honored tiers MODEST < FAIR < STRONG < PREMIUM (the realized purity premium).
        private static string PayoutLabel(string b)
        {
            switch (b)
            {
                case "PENDING": return "Pending";
                case "NONE": return "Lost";
                case "MODEST": return "Modest";
                case "FAIR": return "Fair";
                case "STRONG": return "Strong";
                case "PREMIUM": return "Premium";
                default: return b;
            }
        }
        private static string PayoutGlyph(string b)
        {
            switch (b)
            {
                case "PENDING": return "[~]";
                case "NONE": return "[ ]";
                case "MODEST": return "[$...]";
                case "FAIR": return "[$$..]";
                case "STRONG": return "[$$$.]";
                case "PREMIUM": return "[$$$$]";
                default: return "[?]";
            }
        }
        private static Color PayoutAccent(string b)
        {
            switch (b)
            {
                case "PREMIUM": return AccentPremium;
                case "STRONG": return AccentMild;
                case "FAIR": return AccentMild;
                case "MODEST": return AccentModerate;
                case "PENDING": return AccentModerate;
                default: return AccentSevere; // NONE (lost)
            }
        }

        // ----- Phase-3 vector #3 (grow_house — T7): grow_stage_band (EARLY | MID | LATE | DONE) — the growth phase -----
        // R2.2: a qualitative band label, NEVER the raw stage clock / "stage N of 3" count. Ascending: EARLY < MID < LATE,
        // then DONE (the grow is complete, awaiting harvest).
        private static string GrowStageLabel(string b)
        {
            switch (b)
            {
                case "EARLY": return "Early";
                case "MID": return "Mid";
                case "LATE": return "Late";
                case "DONE": return "Ready to harvest";
                default: return b;
            }
        }
        // A 3-segment rising filled-bar gauge → a full bar at DONE (shape encodes the phase — a11y F2, mirrors the cover/risk gauges).
        private static string GrowStageGlyph(string b)
        {
            switch (b)
            {
                case "EARLY": return "[#..]";
                case "MID": return "[##.]";
                case "LATE": return "[###]";
                case "DONE": return "[***]";
                default: return "[...]";
            }
        }
        // EARLY/MID = amber (still growing), LATE = cyan (nearly there), DONE = premium violet (a finished crop).
        private static Color GrowStageAccent(string b) =>
            b == "DONE" ? AccentPremium : b == "LATE" ? AccentMild : AccentModerate;

        // ----- Phase-3 vector #3 (grow_house — T7): husbandry_band (WITHERED | ON_TRACK | THRIVING) — the tend trajectory -----
        // R2.2: the husbandry payoff trajectory as a band, NEVER the raw tend_count. WITHERED (neglected — low yield) <
        // ON_TRACK (partial husbandry — middling) < THRIVING (full husbandry — top yield). Reuses the AccentMild/Moderate/
        // Severe/Premium palette: WITHERED = severe, ON_TRACK = amber, THRIVING = premium violet (the best trajectory).
        private static string HusbandryLabel(string b)
        {
            switch (b)
            {
                case "WITHERED": return "Withered";
                case "ON_TRACK": return "On track";
                case "THRIVING": return "Thriving";
                default: return b;
            }
        }
        // A 3-segment fill gauge (shape encodes the trajectory — a11y F2: shape carries the level alongside colour).
        private static string HusbandryGlyph(string b)
        {
            switch (b)
            {
                case "WITHERED": return "[v..]";
                case "ON_TRACK": return "[^^.]";
                case "THRIVING": return "[^^^]";
                default: return "[...]";
            }
        }
        private static Color HusbandryAccent(string b)
        {
            switch (b)
            {
                case "THRIVING": return AccentPremium;
                case "ON_TRACK": return AccentModerate;
                default: return AccentSevere; // WITHERED (the neglected trajectory)
            }
        }

        // ----- Phase-3 vector #3 (grow_house — T2): the GROWABLE plant-derived precursor the plant selector cycles -----
        // The server-enforced GROWABLE set (a non-growable precursor → 422): verdant_root_extract | lull_resin | glass_lily.
        private static readonly string[] GrowablePrecursors = { "verdant_root_extract", "lull_resin", "glass_lily" };
        private static string GrowablePrecursorLabel(string p)
        {
            switch (p)
            {
                case "verdant_root_extract": return "Verdant root";
                case "lull_resin": return "Lull resin";
                case "glass_lily": return "Glass lily";
                default: return p;
            }
        }

        // ----- Phase-4 vector #4 (distribution_hub): hub_tier_band (SMALL | MEDIUM | LARGE | MAJOR | MAX) — the hub standing -----
        // R2.2: a qualitative band label, NEVER the raw hub_tier int. Ascending roster-cap lever: SMALL < MEDIUM < LARGE <
        // MAJOR < MAX (the cap at distribution.hub_max_tier 5). A higher band → a larger concurrent-courier roster cap.
        private static string HubTierLabel(string b)
        {
            switch (b)
            {
                case "SMALL": return "Small";
                case "MEDIUM": return "Medium";
                case "LARGE": return "Large";
                case "MAJOR": return "Major";
                case "MAX": return "Max";
                default: return b;
            }
        }
        // A 5-segment rising filled-bar gauge (shape encodes the tier alongside colour — a11y F2, mirrors the lab-tier/risk gauges).
        private static string HubTierGlyph(string b)
        {
            switch (b)
            {
                case "SMALL": return "[#....]";
                case "MEDIUM": return "[##...]";
                case "LARGE": return "[###..]";
                case "MAJOR": return "[####.]";
                case "MAX": return "[#####]";
                default: return "[.....]";
            }
        }
        // SMALL/MEDIUM = amber (room to grow), LARGE/MAJOR = cyan (a solid hub), MAX = premium violet (the top tier, capped).
        private static Color HubTierAccent(string b) =>
            b == "MAX" ? AccentPremium : (b == "LARGE" || b == "MAJOR") ? AccentMild : AccentModerate;

        // ----- Phase-4 vector #4 (distribution_hub): roster_band (OPEN | BUSY | FULL) — the courier-roster occupancy -----
        // R2.2: the player's concurrent-shipment occupancy as a band, NEVER the raw in-transit count / cap. OPEN (idle —
        // dispatch freely) → BUSY (some shipments out, capacity remains) → FULL (at the cap — a further dispatch is refused
        // 409 OVER_CAPACITY). OPEN = cyan (good), BUSY = amber (filling), FULL = severe (no headroom).
        private static string RosterLabel(string b)
        {
            switch (b)
            {
                case "OPEN": return "Open";
                case "BUSY": return "Busy";
                case "FULL": return "Full";
                default: return b;
            }
        }
        // Distinct shape per band (a11y F2 — shape carries the meaning alongside colour).
        private static string RosterGlyph(string b)
        {
            switch (b)
            {
                case "OPEN": return "[o..]";   // open slots
                case "BUSY": return "[oo.]";   // filling
                case "FULL": return "[ooo]";   // at the cap
                default: return "[...]";
            }
        }
        private static Color RosterAccent(string b) =>
            b == "OPEN" ? AccentMild : b == "BUSY" ? AccentModerate : AccentSevere;

        // ----- Phase-4 vector #4 (distribution_hub): the vehicle modes (FOOT | BIKE | CAR) the player can dispatch with -----
        // The unlocked vehicle SET (available_vehicles) worded as a comma list — categorical labels, NEVER speeds (R2.2).
        // A hub unlocks bike/car; a no-operational-hub set is foot-only.
        private static readonly string[] AllVehicles = { "FOOT", "BIKE", "CAR" };
        private static string VehicleLabel(string v)
        {
            switch (v)
            {
                case "FOOT": return "Foot";
                case "BIKE": return "Bike";
                case "CAR": return "Car";
                default: return v;
            }
        }
        private static string AvailableVehiclesLabel(string[] vehicles)
        {
            if (vehicles == null || vehicles.Length == 0) return "Foot";
            var parts = new List<string>(vehicles.Length);
            foreach (string v in vehicles) parts.Add(VehicleLabel(v));
            return string.Join(", ", parts);
        }

        // The minimum wallet band that can afford each lab-tier upgrade cost band. The upgrade cost is a server-grounded
        // value (R2.3); the client gates qualitatively (band-vs-band, NEVER cents — R2.2). The definitive verdict still
        // lives server-side (an unaffordable upgrade → 409 even if the client allowed it). The upgrade is a meaningful cash
        // commitment, so require at least a MODERATE wallet (conservative — a wallet read failure leaves it disabled).
        private static bool CanAffordUpgrade(string walletBand)
        {
            int walletRank = System.Array.IndexOf(WalletOrder, walletBand);
            int floorRank = System.Array.IndexOf(WalletOrder, "MODERATE");
            if (walletRank < 0 || floorRank < 0) return false; // unknown/unloaded wallet → conservative (disabled).
            return walletRank >= floorRank;
        }

        // Qualitative affordability gate: map each repair_cost band to the MINIMUM wallet_band that can pay
        // for it, then check the wallet sits at/above that floor. NEVER compares raw cents (R2.2). A null/unknown
        // wallet band is treated as unaffordable (conservative — a wallet read failure leaves Repair disabled).
        // wallet_band ascending: BROKE < LOW < MODERATE < HIGH < FLUSH (Tools/OPERATIONAL_CONTRACTS.md §11).
        private static readonly string[] WalletOrder = { "BROKE", "LOW", "MODERATE", "HIGH", "FLUSH" };
        private static bool CanAfford(string repairCostBand, string walletBand)
        {
            // The minimum wallet band that can pay each repair-cost band (conservative qualitative mapping).
            string floor;
            switch (repairCostBand)
            {
                case "NONE": return true;                  // nothing to pay (e.g. already REPAIRING).
                case "MINOR": floor = "LOW"; break;        // a MINOR repair needs at least a LOW wallet.
                case "MODERATE": floor = "MODERATE"; break;
                case "MAJOR": floor = "HIGH"; break;       // a MAJOR repair needs a HIGH+ wallet.
                default: floor = "HIGH"; break;            // unknown cost → require a high wallet (conservative).
            }
            int walletRank = System.Array.IndexOf(WalletOrder, walletBand);
            int floorRank = System.Array.IndexOf(WalletOrder, floor);
            if (walletRank < 0 || floorRank < 0) return false; // unknown/unloaded wallet → conservative (disabled).
            return walletRank >= floorRank;
        }

        // --------------------------------------------------------------- UI build

        private void BuildLayout()
        {
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                GameObject canvasGo = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = canvasGo.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
                scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1280, 720);
            }

            // Dim backdrop (the City Map would sit behind in-game).
            GameObject backdrop = NewUI("BuildingCardBackdrop", canvas.transform);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = new Color(0.05f, 0.05f, 0.06f, 0.85f);

            // The bottom-sheet card, anchored bottom-centre.
            GameObject card = NewUI("BuildingCardSheet", canvas.transform);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 0f);
            cardRt.anchorMax = new Vector2(0.5f, 0f);
            cardRt.pivot = new Vector2(0.5f, 0f);
            cardRt.sizeDelta = new Vector2(520, 760); // taller to fit the Phase-2b raid/risk rows + Phase-2c Ash lab-tier /
                                                      // purity / appointment rows + the Upgrade + refining-passes + honor affordances.
            cardRt.anchoredPosition = new Vector2(0, 24);
            card.AddComponent<Image>().color = SurfaceBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(18, 18, 16, 16);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            cardContent = cardRt;

            titleText = NewText("Title", card.transform, "OPERATIONAL BUILDING", 22, TextAnchor.MiddleLeft);
            titleText.fontStyle = FontStyle.Bold;
            AddLayoutElement(titleText.gameObject, minHeight: 30, flexibleHeight: 0);

            typeText = NewText("Type", card.transform, "Type: —", 16, TextAnchor.MiddleLeft);
            typeText.color = new Color(0.75f, 0.79f, 0.83f);
            AddLayoutElement(typeText.gameObject, minHeight: 24, flexibleHeight: 0);

            GameObject rows = NewUI("StatusRows", card.transform);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 6;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            statusRows = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 0);

            GameObject actions = NewUI("ActionBar", card.transform);
            VerticalLayoutGroup avlg = actions.AddComponent<VerticalLayoutGroup>();
            avlg.spacing = 6;
            avlg.childControlWidth = true;
            avlg.childControlHeight = true;
            avlg.childForceExpandWidth = true;
            avlg.childForceExpandHeight = false;
            actionBar = (RectTransform)actions.transform;
            AddLayoutElement(actions, flexibleHeight: 1);
        }

        private void AddStatusRow(string label, string value, string glyph, Color accent)
        {
            GameObject row = NewUI("Row_" + label, statusRows);
            row.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(10, 10, 6, 6);
            hlg.spacing = 10;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 30, flexibleHeight: 0);

            // Glyph (shape — a11y: colour is never the sole differentiator).
            Text g = NewText("Glyph", row.transform, glyph, 16, TextAnchor.MiddleCenter);
            g.color = accent;
            g.fontStyle = FontStyle.Bold;
            AddLayoutElement(g.gameObject, minWidth: 46, preferredWidth: 46, flexibleWidth: 0);

            Text l = NewText("Label", row.transform, label, 15, TextAnchor.MiddleLeft);
            l.color = new Color(0.72f, 0.76f, 0.80f);
            AddLayoutElement(l.gameObject, minWidth: 120, flexibleWidth: 1);

            Text v = NewText("Value", row.transform, value, 16, TextAnchor.MiddleRight);
            v.color = accent;
            v.fontStyle = FontStyle.Bold;
            AddLayoutElement(v.gameObject, minWidth: 140, flexibleWidth: 0);

            TrackText(g, glyph);
            TrackText(l, label);
            TrackText(v, value);
        }

        private string NewSectionLabel(Transform parent, string text)
        {
            Text t = NewText("Section", parent, text, 13, TextAnchor.MiddleLeft);
            t.color = new Color(0.55f, 0.59f, 0.63f);
            t.fontStyle = FontStyle.Bold;
            AddLayoutElement(t.gameObject, minHeight: 20, flexibleHeight: 0);
            return text;
        }

        private Button AddActionButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick)
        {
            GameObject btn = NewUI("Action_" + label.Replace(" ", "").Replace("(", "").Replace(")", ""), parent);
            Image img = btn.AddComponent<Image>();
            img.color = new Color(0.16f, 0.18f, 0.22f);
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 34, flexibleHeight: 0);

            Text t = NewText("Label", btn.transform, label, 15, TextAnchor.MiddleCenter);
            t.color = CtaColor;
            Stretch((RectTransform)t.transform, new Vector2(8, 2), new Vector2(-8, -2));
            TrackText(t, label);
            return b;
        }

        // Phase-2c: the refining-passes selector (the Ash time↔purity lever, 0..max). Three controls on one row:
        //   [- Refine] [<worded passes>] [+ Refine]
        // The chosen passes count is WORDED (None / Light / Standard / Deep) rather than printed as a bare digit, so the
        // selector reads as a qualitative choice + keeps the no-raw-scalar guard simple (R2.2 — the UI shows no bare
        // numbers anywhere). The server enforces the real max (passes > max → 422); the client clamps only at 0 and at the
        // max-words ceiling. More passes = a longer cook = a higher purity band.
        private const int MaxRefiningPassesUi = 3; // mirrors the server's production.ash.max_refining_passes default (3).
        private void AddRefiningPassesSelector(Transform parent)
        {
            string label = NewSectionLabel(parent, "REFINING PASSES (time ↔ purity)");
            TrackText(null, label);

            GameObject row = NewUI("RefiningPassesRow", parent);
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 8;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = true;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 32, flexibleHeight: 0);

            Button minus = AddActionButton(row.transform, "- Refine",
                () => SetRefiningPasses(RefiningPasses - 1));
            SetButtonInteractable(minus, RefiningPasses > 0);

            string passesWord = RefiningPassesLabel(RefiningPasses);
            Text passesText = NewText("RefiningPassesValue", row.transform, passesWord, 15, TextAnchor.MiddleCenter);
            passesText.color = AccentMild;
            passesText.fontStyle = FontStyle.Bold;
            AddLayoutElement(passesText.gameObject, minWidth: 110, flexibleWidth: 0);
            TrackText(passesText, passesWord);

            Button plus = AddActionButton(row.transform, "+ Refine",
                () => SetRefiningPasses(RefiningPasses + 1));
            SetButtonInteractable(plus, RefiningPasses < MaxRefiningPassesUi);
        }

        // Word the refining-passes count (the time↔purity lever) as a qualitative choice — None / Light / Standard / Deep —
        // so the selector shows no bare digit (R2.2 keeps the no-raw-scalar guard simple). More = a longer cook, purer Ash.
        private static string RefiningPassesLabel(int passes)
        {
            switch (passes)
            {
                case 0: return "None";
                case 1: return "Light";
                case 2: return "Standard";
                default: return "Deep"; // 3+ (clamped at the UI max)
            }
        }

        // Phase-3 vector #3: the plant selector (choose which growable precursor to cultivate). Three controls on one row:
        //   [< Crop] [<worded crop>] [Crop >]
        // The crop is WORDED (Verdant root / Lull resin / Glass lily) — never a raw id leaks to the player; the selector
        // reads as a qualitative choice. The server enforces the GROWABLE set (a non-growable precursor → 422). Shown only
        // on an idle grow_house (no active grow). More-vs-buy: planting is cheap-but-slow-and-hot vs ordering precursors.
        private void AddPlantSelector(Transform parent)
        {
            string label = NewSectionLabel(parent, "PLANT — choose a crop");
            TrackText(null, label);

            GameObject row = NewUI("PlantSelectorRow", parent);
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 8;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = true;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 32, flexibleHeight: 0);

            AddActionButton(row.transform, "< Crop", () => CyclePrecursor(-1));

            string cropWord = GrowablePrecursorLabel(SelectedPrecursor);
            Text cropText = NewText("PlantSelectorValue", row.transform, cropWord, 15, TextAnchor.MiddleCenter);
            cropText.color = AccentMild;
            cropText.fontStyle = FontStyle.Bold;
            AddLayoutElement(cropText.gameObject, minWidth: 130, flexibleWidth: 0);
            TrackText(cropText, cropWord);

            AddActionButton(row.transform, "Crop >", () => CyclePrecursor(1));
        }

        // Cycle the selected growable precursor (wraps around the 3-member GROWABLE set). Re-renders the actions via
        // SetSelectedPrecursor so the worded crop value updates.
        private void CyclePrecursor(int delta)
        {
            int idx = System.Array.IndexOf(GrowablePrecursors, SelectedPrecursor);
            if (idx < 0) idx = 0;
            int n = GrowablePrecursors.Length;
            int next = ((idx + delta) % n + n) % n;
            SetSelectedPrecursor(GrowablePrecursors[next]);
        }

        // Phase-4 vector #4: the dispatch vehicle selector (choose foot/bike/car). Three controls on one row:
        //   [< Vehicle] [<worded vehicle>] [Vehicle >]
        // SERVER-AUTHORITATIVE: the selector cycles ONLY through the card's available_vehicles set — a LOCKED vehicle
        // (bike/car without an operational hub) is never reachable; the worded value never shows a locked mode. The
        // server is the final authority (a not-unlocked vehicle → 422). The vehicle is WORDED (Foot / Bike / Car) — no
        // raw speed leaks (R2.2). If only FOOT is unlocked, the cycle is a no-op (a single-member set).
        private void AddVehicleSelector(Transform parent, BuildingCardDto card)
        {
            VehicleSelectorShown = true;
            // Pin the selection to an unlocked vehicle (defensive — if the previously-selected vehicle is no longer
            // unlocked, e.g. the hub went non-operational, snap back to FOOT which is always available).
            string[] unlocked = (card.available_vehicles != null && card.available_vehicles.Length > 0)
                ? card.available_vehicles
                : new[] { "FOOT" };
            if (System.Array.IndexOf(unlocked, SelectedVehicle) < 0) SelectedVehicle = unlocked[0];

            string label = NewSectionLabel(parent, "DISPATCH VEHICLE (hub-gated)");
            TrackText(null, label);

            GameObject row = NewUI("VehicleSelectorRow", parent);
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 8;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = true;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 32, flexibleHeight: 0);

            // The cycle is enabled only when more than one vehicle is unlocked (a single-member foot-only set is fixed).
            bool multi = unlocked.Length > 1;
            Button prev = AddActionButton(row.transform, "< Vehicle", () => CycleVehicle(-1, unlocked));
            SetButtonInteractable(prev, multi);

            string vehicleWord = VehicleLabel(SelectedVehicle);
            Text vehText = NewText("VehicleSelectorValue", row.transform, vehicleWord, 15, TextAnchor.MiddleCenter);
            vehText.color = AccentMild;
            vehText.fontStyle = FontStyle.Bold;
            AddLayoutElement(vehText.gameObject, minWidth: 110, flexibleWidth: 0);
            TrackText(vehText, vehicleWord);

            Button next = AddActionButton(row.transform, "Vehicle >", () => CycleVehicle(1, unlocked));
            SetButtonInteractable(next, multi);
        }

        // Cycle the selected vehicle within the UNLOCKED set (server-authoritative — a locked vehicle is never reachable).
        // Re-renders the actions via SetSelectedVehicle so the worded vehicle value updates.
        private void CycleVehicle(int delta, string[] unlocked)
        {
            if (unlocked == null || unlocked.Length == 0) return;
            int idx = System.Array.IndexOf(unlocked, SelectedVehicle);
            if (idx < 0) idx = 0;
            int n = unlocked.Length;
            int nextIdx = ((idx + delta) % n + n) % n;
            SetSelectedVehicle(unlocked[nextIdx]);
        }

        // Disable/enable a button + dim its label so the unaffordable state is visible (and a11y: the disabled
        // state is conveyed by the dimmed label text + the separate reason line, not colour alone — F2).
        private static void SetButtonInteractable(Button button, bool interactable)
        {
            if (button == null) return;
            button.interactable = interactable;
            Text label = button.GetComponentInChildren<Text>();
            if (label != null && !interactable)
                label.color = new Color(0.45f, 0.47f, 0.50f); // dimmed → "can't do this now"
        }

        // --------------------------------------------------------------- helpers

        private void ClearRows()
        {
            renderedTexts.Clear();
            textComponents.Clear();
            if (statusRows != null)
                for (int i = statusRows.childCount - 1; i >= 0; i--)
                    Object.Destroy(statusRows.GetChild(i).gameObject);
        }

        private void TrackText(Text comp, string text)
        {
            if (comp != null) textComponents.Add(comp);
            if (!string.IsNullOrEmpty(text)) renderedTexts.Add(text);
        }

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>();
            }
        }

        private static GameObject NewUI(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private Text NewText(string name, Transform parent, string value, int size, TextAnchor anchor)
        {
            GameObject go = NewUI(name, parent);
            Text t = go.AddComponent<Text>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = TextPrimary;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Truncate;
            t.raycastTarget = false;
            return t;
        }

        private static void Stretch(RectTransform rt, Vector2 offMin, Vector2 offMax)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = offMin;
            rt.offsetMax = offMax;
        }

        private static void AddLayoutElement(GameObject go, float minHeight = -1, float preferredHeight = -1,
            float flexibleHeight = -1, float flexibleWidth = -1, float minWidth = -1, float preferredWidth = -1)
        {
            LayoutElement le = go.AddComponent<LayoutElement>();
            if (minHeight >= 0) le.minHeight = minHeight;
            if (preferredHeight >= 0) le.preferredHeight = preferredHeight;
            if (flexibleHeight >= 0) le.flexibleHeight = flexibleHeight;
            if (flexibleWidth >= 0) le.flexibleWidth = flexibleWidth;
            if (minWidth >= 0) le.minWidth = minWidth;
            if (preferredWidth >= 0) le.preferredWidth = preferredWidth;
        }
    }
}
