using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer)
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational
{
    // Drives the Building Card screen (screen_2a) for a single operational building:
    //   1. signs in (POST /v1/auth/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
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
    public class BuildingCardController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
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

        // ---- ② lot 1 (2026-09-23) : le PUPITRE du labo, trois échelles de crans -------------------------------------
        /// <summary>La cuisson du bâtiment (GET /v1/operational/lab/:id). Null hors pupitre, ou sur erreur : pas de ligne « le feu ».</summary>
        public LabCookDto CurrentLab { get; private set; }
        /// <summary>② lot 2 — le geste que le pupitre a posé au dernier rendu (`Aucun` hors pupitre).</summary>
        public GesteDuPupitre GesteDuPupitreAffiche { get; private set; }
        /// <summary>Le stock de précurseur du bâtiment (GET /v1/operational/precursors?building_id — le DTO de la chaîne d'appro,
        /// RÉUTILISÉ). Null hors pupitre, ou sur erreur : pas de ligne « l'étagère ».</summary>
        public GetOperationalPrecursorsResponseDto CurrentPrecursors { get; private set; }
        /// <summary>② lot 3 — l'état de délégation des charges (GET /v1/meta/task-categories, le DTO de la Délégation RÉUTILISÉ). Null
        /// hors pupitre ou sur erreur : l'approvisionnement est alors lu comme tenu par le joueur (le 409 CATEGORY_DELEGATED dirait le
        /// reste, en mots, par `LigneDAction`).</summary>
        public GetMetaTaskCategoriesResponseDto CurrentTaskCategories { get; private set; }
        /// <summary>② bulle (B1) — le lieutenant qui parle au pupitre : le premier des `lieutenant_ids` de CE bâtiment (GET
        /// /v1/me/buildings) présent au roster (GET /v1/lieutenants, `archetype`). Null : pas de lieutenant, ou non lu — et alors
        /// AUCUNE réplique n'est posée (une réplique sans locuteur est une voix de nulle part).</summary>
        public LieutenantRowDto CurrentLieutenant { get; private set; }

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

        // ---- Phase-5 vector #5a (money_holding clean-cash vault) test hooks --------------
        /// <summary>True when the money_holding-tier band row is shown (a money_holding — money_holding_tier_band != NONE).</summary>
        public bool MoneyHoldingTierShown { get; private set; }
        /// <summary>True when the held-magnitude band row is shown (a money_holding card).</summary>
        public bool HeldBandShown { get; private set; }
        /// <summary>True when the capacity-fill band row is shown (a money_holding card).</summary>
        public bool CapacityBandShown { get; private set; }
        /// <summary>True when the yield band row is shown (a money_holding card).</summary>
        public bool YieldBandShown { get; private set; }
        /// <summary>True when the forfeiture telegraph WARNING alert is shown (forfeiture_band PENDING or IMMINENT — the
        /// "your holding is under audit — withdraw or diversify" warning so the player can react before the seizure).</summary>
        public bool ForfeitureWarningShown { get; private set; }
        /// <summary>True when the Upgrade-money-holding-tier button is shown (a money_holding below MAX).</summary>
        public bool UpgradeMoneyHoldingTierButtonShown { get; private set; }
        /// <summary>True when the shown Upgrade-money-holding-tier button is INTERACTABLE (wallet band affords the band).</summary>
        public bool UpgradeMoneyHoldingTierButtonAffordable { get; private set; }
        /// <summary>True when the deposit-cash action is shown (a money_holding card).</summary>
        public bool DepositActionShown { get; private set; }
        /// <summary>True when the withdraw-cash action is shown (a money_holding card).</summary>
        public bool WithdrawActionShown { get; private set; }
        /// <summary>The clean-cash transfer amount (in cents) the deposit/withdraw actions currently hold (the player-entered
        /// amount). SERVER-AUTHORITATIVE: the server enforces capacity/funds and returns 409 — the UI passes this through and
        /// reflects the verdict, it does NOT pre-decide. Worded into an M1 $-band label client-side (no raw cents rendered; R2.2).</summary>
        public int TransferAmountCents { get; private set; } = 1_000_000; // default $10k (a MODERATE-band deposit).

        public string BuildingId { get => buildingId; set => buildingId = value; }
        /// <summary>①-0 — la dernière fiche DEMANDÉE au back (`GET /v1/operational/building/:id`), null avant tout chargement.</summary>
        public string DerniereUrlDemandee => client != null ? client.DerniereUrlDemandee : null;

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
            if (appro != null) appro.BaseUrl = url;
            if (delegation != null) delegation.BaseUrl = url;
        }

        private readonly List<string> renderedTexts = new List<string>();
        private readonly List<TextMeshProUGUI> textComponents = new List<TextMeshProUGUI>();

        private TMP_FontAsset font;
        private RectTransform cardContent;
        private TextMeshProUGUI titleText;
        private TextMeshProUGUI typeText;
        private RectTransform statusRows;
        private RectTransform actionBar;
        private TextMeshProUGUI actionStatusText;
        private Button repairButton; // Phase-2b: the Repair affordance (only built when DAMAGED).

        private AuthClient auth;
        private BuildingCardClient client;
        private ChaineDApproClient appro;   // ② lot 1 : la route des précurseurs a UN client, celui de la chaîne d'appro
        private DelegationClient delegation;   // ② lot 3 : les charges déléguées ont UN client, celui de la Délégation

        // Slate palette (mirrors CityMap + global_conventions_core direction).
        private static Color SurfaceBg => DesignTokens.Current.surfaceCard; // #16191b
        private static Color RowBg => DesignTokens.Current.surfaceRow;     // #232a2d
        private static Color TextPrimary => DesignTokens.Current.onSurfacePrimary;
        private static Color AccentMild => DesignTokens.Current.accentSuccess;   // #43e0c0 cyan
        private static Color AccentModerate => DesignTokens.Current.accentWarning;     // #ff9e3d amber
        private static Color AccentSevere => DesignTokens.Current.accentDanger;      // #ff5a4d red
        private static Color CtaColor => DesignTokens.Current.accentGold;          // #ffd23f yellow
        // Phase-2c: the 4th purity-band accent (the AccentMild/Moderate/Severe palette extended to 4 bands for the
        // ascending CUT < STANDARD < PURE < CRYSTALLINE grade). CRYSTALLINE = a bright violet-white "premium" hue,
        // visibly distinct from the cyan AccentMild so the top grade reads as exceptional. a11y: never colour-only —
        // every purity row also carries a distinct shape glyph + a worded label (F2).
        private static Color AccentPremium => DesignTokens.Current.accentPremium;        // #c7b3ff bright violet-white

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
            font = DesignTokens.Current.primaryFont;
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new BuildingCardClient { BaseUrl = baseUrl };
            appro = new ChaineDApproClient { BaseUrl = baseUrl };
            delegation = new DelegationClient { BaseUrl = baseUrl };
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
            yield return DemoIdentityResolver.ResolveAndSignIn(auth,
                DemoIdentityResolver.OperationalIdentifierEnvVar, DemoIdentityResolver.OperationalPasswordEnvVar,
                demoIdentifier, demoPassword, t => token = t, e => err = e);
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

            // ② lot 1 : le pupitre du labo lit deux routes de plus — la cuisson et l'étagère. Seulement pour un type à pupitre
            // (tranché (a) du 23/09) : pour les autres, les deux routes répondraient 404 et on ne les appelle pas.
            yield return RefreshPupitre(id, CurrentCard.operational_type);

            // ② (f2 26/09) : une façade lit la planque la plus chargée de SON quartier — le geste « Blanchir » n'existe que si elle
            // tient de quoi blanchir. Pour les autres types, rien n'est lu.
            if (CurrentCard != null && CurrentCard.operational_type == "front_shop") yield return RefreshPlanqueDuQuartier(id);
            if (Destroyed) yield break;

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

        /// <summary>⛔ Réservé aux tests (② lot 1) : rend la fiche depuis des données DONNÉES, sans réseau — même `Render` que le
        /// chargement, mêmes hooks. Les données absentes (null) le sont comme après une erreur de route.</summary>
        public void RendrePourTest(BuildingCardDto card, StorageDto storage = null, LabCookDto lab = null,
                                   GetOperationalPrecursorsResponseDto precursors = null, GrowSessionDto grow = null,
                                   GetMetaTaskCategoriesResponseDto charges = null, AppointmentDto rendezVous = null,
                                   LieutenantRowDto lieutenant = null)
        {
            EnsureInitialized();
            CurrentLieutenant = lieutenant;
            CurrentTaskCategories = charges;
            CurrentAppointment = rendezVous;
            CurrentCard = card;
            CurrentStorage = storage;
            CurrentLab = lab;
            CurrentPrecursors = precursors;
            CurrentGrow = grow;
            CardLoaded = true;
            Render(card);
        }

        /// <summary>② lot 1 — la cuisson (`lab/:id`) et l'étagère (`precursors?building_id`) d'un bâtiment à pupitre. Une erreur laisse
        /// la donnée à null : la ligne correspondante n'est pas dessinée, plutôt que d'afficher un cran qu'on n'a pas reçu.</summary>
        public IEnumerator RefreshPupitre(string id, string operationalType)
        {
            CurrentLab = null;
            CurrentPrecursors = null;
            CurrentTaskCategories = null;
            CurrentLieutenant = null;
            if (!APupitre(operationalType)) yield break;
            LabCookDto lab = null;
            yield return client.GetLab(id, Token, l => lab = l, (code, msg) => lab = null);
            CurrentLab = lab;
            GetOperationalPrecursorsResponseDto pre = null;
            yield return appro.GetOperationalPrecursors(Token, id, p => pre = p, (code, msg) => pre = null);
            CurrentPrecursors = pre;
            GetMetaTaskCategoriesResponseDto charges = null;
            yield return delegation.GetMetaTaskCategories(Token, c => charges = c, refus => charges = null);
            CurrentTaskCategories = charges;
            // ② bulle : la jointure lieutenant → bâtiment, faite ICI (mesure du back 23/09 : `me/buildings` sert `lieutenant_ids`,
            // `/v1/lieutenants` sert l'archétype) — deux routes déjà déclarées, clients RÉUTILISÉS.
            MafiaCleanCity.Shell.BatimentPossedeDto[] mes = null;
            yield return new MafiaCleanCity.Shell.MesBatimentsClient { BaseUrl = client.BaseUrl }.Lire(Token, b => mes = b, (code, msg) => mes = null);
            GetLieutenantsResponseDto roster = null;
            if (mes != null) yield return delegation.GetLieutenants(Token, r => roster = r, refus => roster = null);
            CurrentLieutenant = LieutenantDuBatiment(mes, id, roster?.lieutenants);
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
        /// <summary>② lot 2 — commande le précurseur SERVI de ce bâtiment (`CurrentPrecursors.precursor_type`), jamais un type écrit
        /// en dur. Sans précurseur servi, rien ne part.</summary>
        public IEnumerator OrderPrecursor(string precursorType, int quantityUnits = 10)
        {
            if (string.IsNullOrEmpty(precursorType)) yield break;
            yield return RunAction(c => client.OrderPrecursors(buildingId, precursorType, quantityUnits, Token, c),
                "Précurseur commandé", "Impossible de commander");
        }

        /// <summary>Lab action: start a Brindle cook.</summary>
        public IEnumerator StartCook()
        {
            yield return RunAction(c => client.StartCook(buildingId, Token, c),
                "Cuisson lancée", "Impossible de lancer la cuisson");
        }

        /// <summary>Front-shop action: inject dirty cash to launder (front-shop = this building).</summary>
        public IEnumerator Inject(string safehouseId, int amountCents)
        {
            yield return RunAction(c => client.Inject(buildingId, safehouseId, amountCents, Token, c),
                "Argent injecté", "Impossible d'injecter");
        }

        /// <summary>② « Faire sortir la marchandise » ⇒ ㉘ Distribution, en surimpression (IShellNavigator). Compteur : crochet de test.</summary>
        public int OuverturesDeLaDistribution { get; private set; }

        public void OuvrirLaDistribution()
        {
            OuverturesDeLaDistribution++;
            MafiaCleanCity.Shell.ShellNavigatorLocator.Find()?.MonterLocataireEnSurimpression<DistributionScreenController>();
        }

        /// <summary>② (f2 26/09) — la planque la plus chargée du quartier de CETTE façade (me/buildings → district_id → district/:id/stash →
        /// FiliereScreenController.PlusChargee, la règle ChargeDePlanque.Rang de ㊵ et de l'Accueil). Null si rien n'est servi.</summary>
        public MafiaCleanCity.CityMap.SafehouseDto PlanqueDuQuartier { get; private set; }

        private IEnumerator RefreshPlanqueDuQuartier(string id)
        {
            PlanqueDuQuartier = null;
            MafiaCleanCity.Shell.BatimentPossedeDto[] possedes = null;
            yield return new MafiaCleanCity.Shell.MesBatimentsClient { BaseUrl = client.BaseUrl }.Lire(Token, b => possedes = b, (c, m) => { });
            int quartier = 0;
            if (possedes != null) foreach (var b in possedes) if (b != null && b.building == id) { quartier = b.district_id; break; }
            if (quartier <= 0) yield break;
            MafiaCleanCity.CityMap.StashDto stash = null;
            yield return new MafiaCleanCity.CityMap.CityProjectionsClient { BaseUrl = client.BaseUrl }.Stash(quartier, Token, x => stash = x, _ => { });
            PlanqueDuQuartier = FiliereScreenController.PlusChargee(stash?.safehouses);
        }

        /// <summary>② (f2 26/09) : le geste « Blanchir » de la façade — offert par la MÊME règle que ㊵ (GesteBlanchirOffert : la planque
        /// tient de quoi blanchir, la façade et la planque sont connues), sinon ABSENT. Pur.</summary>
        public static bool BlanchirOffertSurLaFiche(string buildingId, MafiaCleanCity.CityMap.SafehouseDto planque) =>
            FiliereScreenController.GesteBlanchirOffert(planque?.load_bucket, buildingId, planque?.safehouse_id);

        /// <summary>Le type que « Ouvrir » envoie à `POST …/:id/convert`, ou NULL (geste retiré). Pur.
        /// · lot back achat-ouvrable SERVI (`TypesOuvrablesServis`) : le type ACHETÉ (`purchased_type`) s'il est dans
        ///   `convertible_types` — liste vide (déjà converti) ou type hors liste (ex. un relais hors du port / des cheminées) ⇒ null.
        ///   Décidé (reco, 26/09) : jamais un AUTRE type de la liste choisi par le client — le joueur a acheté un usage.
        /// · back antérieur : `operational_type` s'il n'est pas vide (comportement d'avant) ; vide ⇒ null, jamais "".</summary>
        public static string TypeAOuvrir(BuildingCardDto card)
        {
            if (card == null) return null;
            if (card.TypesOuvrablesServis)
            {
                if (card.convertible_types == null || string.IsNullOrEmpty(card.purchased_type)) return null;
                foreach (string t in card.convertible_types) if (t == card.purchased_type) return t;
                return null;
            }
            return string.IsNullOrEmpty(card.operational_type) ? null : card.operational_type;
        }

        /// <summary>Convert affordance: convert this building to an M1 operational type.</summary>
        public IEnumerator Convert(string operationalType, string coverQuality = "weak")
        {
            yield return RunAction(c => client.Convert(buildingId, operationalType, coverQuality, Token, c),
                "Ouverture demandée", "Impossible d'ouvrir");
        }

        /// <summary>Phase-2b recovery action: repair a DAMAGED building (empty body; id is the path param).
        /// On success the backend flips structural_state → REPAIRING; we re-load the card so it reflects that.</summary>
        public IEnumerator Repair()
        {
            yield return RunAction(c => client.Repair(buildingId, Token, c),
                "Réparation lancée", "Impossible de réparer");
            // Refresh the card so it reflects REPAIRING (+ the wallet band debited). Only if the building id
            // is intact (it always is here). The reload re-renders → the Repair button drops away (now REPAIRING).
            yield return LoadBuilding(buildingId);
        }

        // --------------------------------------------- Ash luxury channel actions (Phase-2c vector #2c)

        /// <summary>Set the refining-passes value the next Ash cook-start will use (the time↔purity lever; 0..max). Clamped
        /// at 0 client-side; the server enforces the real ceiling (passes &gt; max → 422). Test/UI convenience.</summary>
        public void SetRefiningPasses(int passes)
        {
            RefiningPasses = passes < 0 ? 0 : passes > MaxRefiningPassesUi ? MaxRefiningPassesUi : passes;   // ② lot 2 : borné au domaine 0..3
            // Re-render the actions so the cook-start label reflects the chosen passes (only if the card is loaded).
            if (CardLoaded && CurrentCard != null) BuildActions(CurrentCard);
        }

        /// <summary>specialized_lab action: upgrade the lab tier by one (cash-gated server-side). On success the card is
        /// reloaded so the lab_tier_band reflects the new tier (BASIC → REFINED → MASTER).</summary>
        public IEnumerator UpgradeTier()
        {
            yield return RunAction(c => client.UpgradeTier(buildingId, Token, c),
                "Labo agrandi", "Impossible d'agrandir");
            // Reload so the card reflects the new lab_tier_band (+ the wallet band debited).
            yield return LoadBuilding(buildingId);
        }

        /// <summary>specialized_lab action: start an Ash cook with the chosen refining passes (the time↔purity lever).</summary>
        public IEnumerator StartCookAsh()
        {
            yield return RunAction(c => client.StartCookAsh(buildingId, RefiningPasses, Token, c),
                "Cuisson d'ash lancée", "Impossible de lancer la cuisson");
        }

        /// <summary>Appointment action: book an Ash appointment at a Glass venue (the ONLY Ash sale path). On success the
        /// appointment id is tracked + its projection refreshed → the appointment panel appears (SCHEDULED).</summary>
        public IEnumerator BookAppointment(string glassVenueBuildingId)
        {
            yield return RunAction(c => client.BookAppointment(glassVenueBuildingId, Token, c),
                "Rendez-vous réservé", "Impossible de réserver");
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
                "Rendez-vous honoré", "Impossible d'honorer le rendez-vous");
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
                "Planté", "Impossible de planter");
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
                "Culture soignée", "Impossible de soigner la culture");
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
                "Relais agrandi", "Impossible d'agrandir");
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
                "Coursier parti", "Impossible d'envoyer le coursier");
            // Reload so the roster_band reflects the new in-transit shipment (OPEN → BUSY → FULL).
            yield return LoadBuilding(buildingId);
        }

        // --------------------------------------------- money_holding clean-cash vault actions (Phase-5 vector #5a)

        /// <summary>Set the clean-cash transfer amount (in cents) the next deposit/withdraw will move (the player-entered
        /// amount). Clamped at 0 client-side; the server is the final authority (a non-positive amount → 422; over capacity /
        /// insufficient → 409). Re-renders the actions so the worded $-band amount updates (only if the card is loaded).</summary>
        public void SetTransferAmount(int amountCents)
        {
            TransferAmountCents = amountCents < 0 ? 0 : amountCents;
            if (CardLoaded && CurrentCard != null) BuildActions(CurrentCard);
        }

        /// <summary>money_holding action: upgrade the money-holding tier by one (cash-gated server-side). The byte-mirror of
        /// the specialized_lab / distribution_hub upgrade. On success the card is reloaded so the money_holding_tier_band
        /// reflects the new tier (SMALL → MEDIUM → … → MAX).</summary>
        public IEnumerator UpgradeMoneyHoldingTier()
        {
            yield return RunAction(c => client.UpgradeMoneyHoldingTier(buildingId, Token, c),
                "Banque agrandie", "Impossible d'agrandir");
            // Reload so the card reflects the new money_holding_tier_band (+ the wallet band debited).
            yield return LoadBuilding(buildingId);
        }

        /// <summary>money_holding action: deposit the chosen clean-cash amount (the TransferAmountCents) from the wallet into
        /// the holding pool. SERVER-AUTHORITATIVE: the server enforces the tier capacity (409 OVER_CAPACITY) + sufficient
        /// funds (409 INSUFFICIENT_FUNDS); a non-positive amount → 422 — the UI reflects the verdict, it does NOT pre-decide.
        /// On success the card is reloaded so the held_band / capacity_band / yield_band reflect the new hold.</summary>
        public IEnumerator DepositCash()
        {
            yield return RunAction(c => client.DepositCash(buildingId, TransferAmountCents, Token, c),
                "Argent déposé", "Impossible de déposer");
            // Reload so the held / capacity / yield bands reflect the new hold (NONE → LOW/MODERATE…; OPEN → BUSY → FULL).
            yield return LoadBuilding(buildingId);
        }

        /// <summary>money_holding action: withdraw the chosen clean-cash amount (the TransferAmountCents) from the holding
        /// pool back into the wallet. SERVER-AUTHORITATIVE: held &lt; amount → 409 INSUFFICIENT_HELD; a non-positive amount →
        /// 422 — the UI reflects the verdict. On success the card is reloaded so the held / capacity / yield bands reflect it
        /// (the player's primary forfeiture-avoidance lever — withdraw to drop the held band below the audit threshold).</summary>
        public IEnumerator WithdrawCash()
        {
            yield return RunAction(c => client.WithdrawCash(buildingId, TransferAmountCents, Token, c),
                "Argent retiré", "Impossible de retirer");
            // Reload so the held / capacity / yield / forfeiture bands reflect the drained hold.
            yield return LoadBuilding(buildingId);
        }

        /// <summary>⛔ ATELIER ④ c2-bis (2026-09-22) — CE QUI SUIT LE TIRET. Avant : le `message` de
        /// DÉVELOPPEUR de l'enveloppe d'erreur (anglais), ou « request failed (N) … » — la classe que ① a
        /// close (« la raison nommait un verbe HTTP »). Désormais : « {échec} — {texte de la clé
        /// user_facing_i18n_key} » quand le bundle la connaît, sinon « {échec}. » seul. Jamais le message,
        /// jamais un code. Pure : testée avec un catalogue chargé pour le test (`LigneDActionTests`, I18n).</summary>
        public static string LigneDAction(ActionOutcome outcome, string succes, string echec)
        {
            if (outcome != null && outcome.Ok) return succes;
            // par `Libelle` (2026-09-23) : une clé servie mais absente du bundle retombe sur « {échec}. » — ce repli est désormais
            // COMPTÉ (garde « zéro repli »). Même rendu qu'avant ; clé vide ⇒ ni lecture ni compte.
            // lot des refus (26/09) : les trous de la phrase servie viennent de `payload_vars`, déjà RÉSOLUS en mots (`*_key` → `<racine>`)
            // clé GÉNÉRIQUE (couche protocole, `RefusServi.EstGenerique`) ⇒ l'échec seul (f2 26/09, suivi ⊥ UX §I) : T3 disait
            // « Impossible de lancer la cuisson — Une partie de ce que vous avez saisi… », une phrase qui n'en dit pas plus que l'échec
            string cle = MafiaCleanCity.I18n.RefusServi.EstGenerique(outcome?.CleI18n) ? null : outcome?.CleI18n;
            string raison = MafiaCleanCity.I18n.Libelle.Gabarit(cle, null, outcome?.Variables);
            return raison != null ? $"{echec} — {raison}" : $"{echec}.";
        }

        private IEnumerator RunAction(System.Func<System.Action<ActionOutcome>, IEnumerator> call,
            string okPrefix, string errPrefix)
        {
            ActionOutcome outcome = null;
            yield return call(o => outcome = o);
            LastActionOutcome = outcome;

            // The action POST is a network round-trip; bail if the controller was torn down meanwhile,
            // before touching actionStatusText (a destroyed serialized TextMeshProUGUI → NullReferenceException).
            if (Destroyed) yield break;

            string line = LigneDAction(outcome, okPrefix, errPrefix);
            if (actionStatusText != null) actionStatusText.text = line;
            TrackText(actionStatusText, line);
        }

        // --------------------------------------------------------------- render

        private void Render(BuildingCardDto card)
        {
            // Belt-and-braces: every async resume point above already guards, but Render dereferences the
            // serialized UI TextMeshProUGUI fields directly, so it self-guards too — a continuation that somehow reaches
            // here on a destroyed controller (or before BuildLayout ran) no-ops rather than NREs. The guard
            // only fires on a genuinely destroyed object / un-built layout, never silently in the live app.
            if (Destroyed || titleText == null || typeText == null || card == null) return;

            ClearRows();

            titleText.text = NomDuBatiment(card);
            typeText.text = $"Type: {TypeLabel(card.operational_type)}";
            TrackText(titleText, titleText.text);
            TrackText(typeText, typeText.text);

            bool ecrinAshActif = card.operational_type == "specialized_lab"
                && CurrentAppointment != null && !string.IsNullOrEmpty(CurrentAppointment.status);
            bool pupitreActif = !ecrinAshActif && APupitre(card.operational_type) && CurrentLab != null;

            // Status rows — each line: glyph (shape) + label + qualitative band value.
            // F2: shape glyph is present alongside colour (colour is never the sole carrier).
            if (!ecrinAshActif && !pupitreActif)
            {
                AddStatusRow("mise_en_place", "Mise en place", SetupLabel(card.setup_state), SetupAccent(card.setup_state));
                AddStatusRow("en_service", "En service", card.operational ? "oui" : "non", card.operational ? AccentMild : AccentSevere);
                AddStatusRow("couverture", "Couverture", CoverLabel(card.cover_band), CoverAccent(card.cover_band));

            // ⛔ L'ENTRETIEN — donnée REÇUE et JETÉE jusqu'ici. `lapse_phase_bucket` et
            // `days_until_maintenance_due` sont dans le DTO depuis qu'il existe, et aucune ligne
            // ne les affichait : le corps les portait, l'écran les ignorait.
            // ★ C'est le défaut « disponible, et dessiné nulle part » que le juge données traque —
            //   le même qu'il a trouvé sur ㊲, où trois résolveurs avaient zéro appelant.
            //
            // ⚠️ Et c'est le SEUL chiffre que cette fiche a le droit de montrer. La projection
            // le dit d'elle-même : « le SEUL signal numérique de maintenance exposé ». Les deux
            // autres nombres que la maquette dessine (montant à collecter, pourcentage de heat)
            // sont bucketés puis JETÉS par le back, avec la consigne écrite « jamais les valeurs
            // brutes » — les afficher reviendrait à les inventer.
                AddStatusRow("entretien", "Entretien", EcheanceLabel(card.lapse_phase_bucket, card.days_until_maintenance_due), LapseAccent(card.lapse_phase_bucket));

            // ----- Phase-2b raid / repair / risk surface (a11y F2: glyph + text, never colour-only; R2.2: bands only) -----
                AddStatusRow("structure", "Structure", StructuralLabel(card.structural_state), StructuralAccent(card.structural_state));
            // Raid-risk band gauge (LOW → IMMINENT) — a filled-bar glyph + worded band label.
                AddStatusRow("risque_de_descente", "Risque de descente", RaidRiskLabel(card.raid_risk), RaidRiskAccent(card.raid_risk));

            // La SAISIE — seulement quand le bâtiment a subi une descente. La quantité saisie est une bande (jamais des grammes ; R2.2).
            // ② lot 6 (2026-09-23, écart ② `c4520078`, cadre 47 F3 « STOCK SAISI ») : la ligne est `building.row.saisie` suivie du mot
            // servi `building.seized_amount.*` (table 37 : « Saisie · {une petite prise …} »). Elle était « Alerte » avec un préfixe
            // « Descente — saisi : » écrit en dur, hors de toute clé. Une descente qui n'a RIEN pris dit « rien », en ambre : la descente
            // a eu lieu, la marchandise est restée (choix du client, déclaré).
                if (card.recently_raided)
                    AddStatusRow("stock_saisi", "Saisie", SeizedLabel(card.seized_amount),
                        card.seized_amount == "NONE" ? AccentModerate : AccentSevere);
            }

            // ----- ② lot 1 (2026-09-23) : LE PUPITRE — trois échelles de crans, « le feu » sur 5, « l'étagère » sur 4, « les caisses »
            // sur 4 ; le premier cran est TOUJOURS allumé (écart ② `c4520078`, cadres 39-44, bloc B2). Le pupitre suit le TYPE (tranché (a)
            // du 23/09) : `lab` et `specialized_lab`. Chaque échelle porte son MOT à côté des crans (la couleur n'est jamais seule). Une
            // échelle dont la donnée n'est pas arrivée n'est pas dessinée : un cran allumé affirmerait un état qu'on n'a pas reçu.
            if (!ecrinAshActif && APupitre(card.operational_type))
            {
                Transform parentPupitre = pupitreActif ? AddPupitreLaboratoire() : statusRows;
                if (CurrentLab != null)
                    AddEchelle("le_feu", "le feu", CransDuFeu(CurrentLab.cook_stage_band), CransFeu,
                        CookStageLabel(CurrentLab.cook_stage_band), CookStageAccent(CurrentLab.cook_stage_band), parentPupitre);
                if (CurrentPrecursors != null)
                    AddEchelle("l_etagere", "l’étagère", CransDuStock(CurrentPrecursors.stock_band), CransStock,
                        StockLabel(CurrentPrecursors.stock_band), EtagereAccent(CurrentPrecursors.stock_band), parentPupitre);
                // ⚠️ `product_band` ARRIVAIT déjà (RefreshStorage) et n'était jamais lu (écart ② cadre 39 B2).
                if (CurrentStorage != null)
                    AddEchelle("les_caisses", "les caisses", CransDuStock(CurrentStorage.product_band), CransStock,
                        StockLabel(CurrentStorage.product_band), CaissesAccent(CurrentStorage.product_band), parentPupitre);
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
                AddStatusRow("substance", "Substance", SubstanceLabel(storage.substance_type), AccentMild);
                // Temperature band row — the qualitative cold-chain status (OPTIMAL_COLD / MODERATE / HOT).
                AddStatusRow("temperature", "Température", TemperatureLabel(storage.temperature_status), TemperatureAccent(storage.temperature_status));
                // Degrading indicator row — Stable vs Degrading (a boolean, never a raw rate).
                AddStatusRow("chaine_du_froid", "Chaîne du froid", storage.degrading ? "se dégrade" : "stable", storage.degrading ? AccentSevere : AccentMild);
            }

            // ----- Phase-2c vector #2c (Ash luxury channel) surface — ONLY for a specialized_lab (substance=ASH). The
            // lab-tier row reads the building-card lab_tier_band (BASIC / REFINED / MASTER); the purity row reads the
            // storage projection's purity_band (CUT / STANDARD / PURE / CRYSTALLINE) when a batch has been cooked. R2.2:
            // bands/labels/glyphs only (never a raw tier int / purity score); F2: every row carries a shape glyph. -----
            LabTierShown = false;
            PurityBandShown = false;
            if (card.operational_type == "specialized_lab")
            {
                bool rendezVousAsh = CurrentAppointment != null && !string.IsNullOrEmpty(CurrentAppointment.status);
                Transform parentAsh = statusRows;
                if (rendezVousAsh)
                {
                    parentAsh = AddEcrinAsh();
                    (string titre, string phrase) = TitresDuRendezVous(CurrentAppointment.status);
                    if (titre != null)
                    {
                        AddLigneDEtat("TitreDuRendezVous", titre, 24, TextPrimary, FontStyles.Bold, parentAsh);
                        AddLigneDEtat("PhraseDuRendezVous", phrase, 14, DesignTokens.Current.onSurfaceSecondaryAlt, FontStyles.Normal, parentAsh);
                    }
                    AddVitrineAsh(parentAsh, CurrentStorage?.purity_band);
                }

                // Substance row — surfaces which substance this luxury lab produces (Ash). The specialized_lab is the Ash
                // host (no cold-chain block runs for it — temperature_status is null), so the Ash surface shows its own
                // substance row from the storage projection (substance_type=ASH). Defaults to "Ash" if storage is absent.
                StorageDto labStorage = CurrentStorage;
                string labSubstance = (labStorage != null && !string.IsNullOrEmpty(labStorage.substance_type))
                    ? labStorage.substance_type
                    : "ASH";
                AddStatusRow("substance", "Substance", SubstanceLabel(labSubstance), AccentMild, parent: parentAsh);

                // Lab-tier band row — the specialized_lab's standing (a higher band → purer Ash). Always shown for a
                // specialized_lab (lab_tier_band is BASIC/REFINED/MASTER; NONE would only be a non-specialized_lab).
                if (!string.IsNullOrEmpty(card.lab_tier_band) && card.lab_tier_band != "NONE")
                {
                    LabTierShown = true;
                    // ② lot 5 : « L’atelier » l'emporte sur « Taille du labo » (D14, tranché par f2) — la VALEUR change, la CLÉ reste
                    // `building.row.taille_du_labo` : elle est donc nommée, pas dérivée du mot (le mot neuf dériverait `l_atelier`).
                    AddStatusRow("taille_du_labo", "L’atelier", LabTierLabel(card.lab_tier_band), LabTierAccent(card.lab_tier_band),
                        cleDuLibelle: "building.row.taille_du_labo", parent: parentAsh);
                }

                // Purity-band row — the cooked Ash batch's quality grade (from the storage projection). Shown only when a
                // batch exists (purity_band non-empty); an empty specialized_lab (no completed cook yet) shows no row.
                StorageDto st = CurrentStorage;
                if (st != null && !string.IsNullOrEmpty(st.purity_band))
                {
                    PurityBandShown = true;
                    AddStatusRow("purete", "Pureté", PurityLabel(st.purity_band), PurityAccent(st.purity_band), parent: parentAsh);
                }

                if (rendezVousAsh)
                    AddBilletRendezVous(parentAsh, CurrentAppointment);
            }

            // Appointment panel — the luxury-channel sale lifecycle (book → SCHEDULED → honor → HONORED, or EXPIRED). Shown
            // only when an appointment is currently tracked for this building (CurrentAppointment loaded). R2.2: the status
            // band + the payout band only (never raw ticks/cents); F2: a distinct glyph per status alongside colour.
            if (CurrentAppointment != null && !string.IsNullOrEmpty(CurrentAppointment.status))
            {
                // L'écrin Ash spécialisé porte déjà son billet illustré. La branche générique reste pour une projection
                // future qui suivrait un rendez-vous depuis un autre type de bâtiment.
                if (card.operational_type != "specialized_lab")
                {
                    (string titre, string phrase) = TitresDuRendezVous(CurrentAppointment.status);
                    if (titre != null)
                    {
                        AddLigneDEtat("TitreDuRendezVous", titre, 16, TextPrimary, FontStyles.Bold);
                        AddLigneDEtat("PhraseDuRendezVous", phrase, 13, DesignTokens.Current.onSurfaceSecondaryAlt, FontStyles.Normal);
                    }
                    AddStatusRow("rendez_vous", "Rendez-vous", AppointmentStatusLabel(CurrentAppointment.status), AppointmentStatusAccent(CurrentAppointment.status));
                    AddEchelle("gain", "Gain", PastillesDuGain(CurrentAppointment.payout_band), PastillesGain,
                        PayoutLabel(CurrentAppointment.payout_band), PayoutAccent(CurrentAppointment.payout_band));
                }
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
                // ⛔ PLUS DE RANGÉE « CULTURE » (② lot 4, 2026-09-23 — écart ② `c4520078`, cadre 36, verdict FAUX) : elle lisait
                // `SelectedPrecursor`, une valeur LOCALE (le sélecteur de plantation, `verdant_root_extract` par défaut), et affirmait
                // une culture que rien ne sert — la projection de la pousse n'a pas de `precursor_type` (grow.projection.service.ts:52-61 ;
                // manque du back n°4, forme F). Tant qu'elle n'est pas servie, la culture n'est PAS affichée : rien plutôt qu'un faux.
                // Grow-stage band row — the qualitative growth phase (EARLY → DONE) with a rising filled-bar glyph.
                GrowStageShown = true;
                AddStatusRow("pousse", "Pousse", GrowStageLabel(CurrentGrow.grow_stage_band), GrowStageAccent(CurrentGrow.grow_stage_band));
                // Husbandry band row — the qualitative tend trajectory (WITHERED → THRIVING) — the husbandry payoff signal.
                HusbandryShown = true;
                AddStatusRow("soin", "Soin", HusbandryLabel(CurrentGrow.husbandry_band), HusbandryAccent(CurrentGrow.husbandry_band));
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
                    AddStatusRow("taille_du_relais", "Taille du relais", HubTierLabel(card.hub_tier_band), HubTierAccent(card.hub_tier_band));
                }
                // Roster-occupancy band row — how much of the player's concurrent-shipment capacity is in use (OPEN / BUSY /
                // FULL — never the raw count/cap). FULL telegraphs that a further dispatch is refused (409 OVER_CAPACITY).
                if (!string.IsNullOrEmpty(card.roster_band) && card.roster_band != "NONE")
                {
                    RosterShown = true;
                    AddStatusRow("equipe", "Équipe", RosterLabel(card.roster_band), RosterAccent(card.roster_band));
                }
                // Unlocked-vehicles row — the categorical vehicle modes the hub unlocks (FOOT always; +BIKE/CAR on an
                // operational hub). A worded list (never speeds; R2.2). The "[~]" glyph reads as "fleet/modes available".
                VehiclesShown = true;
                AddStatusRow("vehicules", "Véhicules", AvailableVehiclesLabel(card.available_vehicles), AccentMild);
            }

            // ----- Phase-5 vector #5a (money_holding clean-cash vault) surface — ONLY for a money_holding. The tier row reads
            // money_holding_tier_band (SMALL → MAX — the deposit-capacity lever); the held row reads held_band (NONE → MASSIVE
            // — the EFFECTIVE clean-cash magnitude); the capacity row reads capacity_band (OPEN / BUSY / FULL — the held-vs-cap
            // fill; FULL ⇒ a further deposit is refused 409); the yield row reads yield_band (IDLE / EARNING — the passive
            // accrual). R2.2: bands / glyphs only (NEVER raw held_cents / tier int / yield rate / tick / forfeiture tick); F2:
            // every row carries a shape glyph. The forfeiture WARNING alert (PENDING / IMMINENT) is rendered just below.
            MoneyHoldingTierShown = false;
            HeldBandShown = false;
            CapacityBandShown = false;
            YieldBandShown = false;
            ForfeitureWarningShown = false;
            if (card.operational_type == "money_holding")
            {
                // Money-holding-tier band row — the vault's STANDING (a higher band → a larger deposit capacity). Always shown
                // for a money_holding (money_holding_tier_band is SMALL..MAX; NONE would only be a non-money_holding).
                if (!string.IsNullOrEmpty(card.money_holding_tier_band) && card.money_holding_tier_band != "NONE")
                {
                    MoneyHoldingTierShown = true;
                    AddStatusRow("taille_de_la_banque", "Taille de la banque", MoneyHoldingTierLabel(card.money_holding_tier_band), MoneyHoldingTierAccent(card.money_holding_tier_band));
                }
                // Held-magnitude band row — how much clean cash is held (NONE → MASSIVE; never raw cents). A higher hold earns
                // more passive yield but draws the audit-forfeiture eye (the MASSIVE band is the forfeiture-threshold territory).
                if (!string.IsNullOrEmpty(card.held_band))
                {
                    HeldBandShown = true;
                    AddStatusRow("en_depot", "En dépôt", HeldLabel(card.held_band), HeldAccent(card.held_band));
                }
                // Capacity-fill band row — how full the vault is (OPEN / BUSY / FULL — never the raw held/cap). FULL telegraphs
                // that a further deposit is refused (409 OVER_CAPACITY) — upgrade the tier or withdraw to make room.
                if (!string.IsNullOrEmpty(card.capacity_band) && card.capacity_band != "NONE")
                {
                    CapacityBandShown = true;
                    AddStatusRow("capacite", "Capacité", CapacityLabel(card.capacity_band), CapacityAccent(card.capacity_band));
                }
                // Yield band row — IDLE (nothing held) / EARNING (the passive yield accrues each tick; never the raw rate).
                if (!string.IsNullOrEmpty(card.yield_band) && card.yield_band != "NONE")
                {
                    YieldBandShown = true;
                    AddStatusRow("rendement", "Rendement", YieldLabel(card.yield_band), YieldAccent(card.yield_band));
                }
                // Forfeiture WARNING alert — telegraphed so the player can react BEFORE the seizure. PENDING (the audit is armed,
                // the deadline is comfortably ahead) / IMMINENT (the deadline is near/at — react NOW). A distinct warning glyph
                // carries the alert alongside colour (F2). NONE shows no row. The forfeiture tick / threshold never leak (R2.2).
                if (card.forfeiture_band == "PENDING" || card.forfeiture_band == "IMMINENT")
                {
                    ForfeitureWarningShown = true;
                    bool imminent = card.forfeiture_band == "IMMINENT";
                    string warn = imminent
                        ? "Audit imminent — retirez ou répartissez maintenant"
                        : "Audit en vue — retirez ou répartissez pour réagir";
                    AddStatusRow("saisie", "Saisie", warn,
                        imminent ? AccentSevere : AccentModerate);
                }
            }

            BuildActions(card);
        }

        private void RenderError()
        {
            ClearRows();
            titleText.text = "BÂTIMENT OPÉRATIONNEL";
            typeText.text = "La fiche du bâtiment n'a pas répondu.";
            TrackText(titleText, titleText.text);
            TrackText(typeText, typeText.text);
        }

        // Build the per-type action affordances the M1 loop exposes.
        private void BuildActions(BuildingCardDto card)
        {
            for (int i = actionBar.childCount - 1; i >= 0; i--)
                Object.Destroy(actionBar.GetChild(i).gameObject);

            bool pupitreFocal = APupitre(card.operational_type) && CurrentLab != null
                && (CurrentAppointment == null || string.IsNullOrEmpty(CurrentAppointment.status));
            // Correctifs du 24/09 : AUCUN en-tête au-dessus des gestes. « LE PUPITRE » n'avait aucune source ; « ACTIONS » non plus :
            // l'atelier a vérifié les 146 cadres de la série 6, aucun ne porte ce mot (ordre de l'orchestrateur : retiré).

            // Phase-2b: the Repair affordance — visible ONLY when the building is DAMAGED. It shows the repair
            // COST band (qualitative — never cents) and is DISABLED when the wallet band can't afford that cost
            // band (a qualitative band comparison; R2.2). The definitive verdict still lives server-side (409).
            repairButton = null;
            RepairButtonShown = false;
            RepairButtonAffordable = false;
            GesteDuPupitreAffiche = GesteDuPupitre.Aucun;   // ② lot 2 : posé seulement par le pupitre (lab, specialized_lab)
            // Phase-3 vector #3: reset the grow_house affordance flags (set only in the grow_house case below).
            PlantSelectorShown = false;
            TendButtonShown = false;
            TendButtonEnabled = false;
            // Phase-5 vector #5a: reset the money_holding affordance flags (set only in the money_holding case below).
            DepositActionShown = false;
            WithdrawActionShown = false;

            // L'écrin est un moment de vente, pas le pupitre du labo : on ne mélange pas agrandissement, cuisson et
            // conversion avec le geste du rendez-vous. La fiche technique ordinaire revient dès qu'aucun rendez-vous
            // n'est suivi. SCHEDULED porte son unique geste vivant ; HONORED / EXPIRED sont des états de lecture.
            if (card.operational_type == "specialized_lab"
                && CurrentAppointment != null && !string.IsNullOrEmpty(CurrentAppointment.status))
            {
                if (CurrentAppointment.status == "SCHEDULED")
                    AddActionButton(actionBar, "honorer_le_rendez_vous", "Honorer le rendez-vous", () => StartCoroutine(HonorAppointment()));
                actionStatusText = NewText("ActionStatus", actionBar, "", 14, TextAlignmentOptions.Left);
                actionStatusText.color = DesignTokens.Current.onSurfaceMutedAlt;
                AddLayoutElement(actionStatusText.gameObject, minHeight: 10, flexibleHeight: 0);
                return;
            }

            if (card.structural_state == "DAMAGED")
            {
                RepairButtonShown = true;
                bool affordable = CanAfford(card.repair_cost, WalletBand);
                RepairButtonAffordable = affordable;
                string cout = RepairCostLabel(card.repair_cost);
                string repairLabel = cout == null ? "Réparer" : $"Réparer · {cout}";   // atelier c1 : « Réparer · gros frais … »
                repairButton = AddActionButton(actionBar, "reparer", repairLabel, () => StartCoroutine(Repair()));
                SetButtonInteractable(repairButton, affordable);
                if (!affordable)
                {
                    // F2: a readable reason, never a raw number, beside the disabled button.
                    string reason = "Réparer — pas assez d'argent";
                    TextMeshProUGUI hint = NewText("RepairHint", actionBar, reason, 13, TextAlignmentOptions.Left);
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
                Button upgradeBtn = AddActionButton(actionBar, "agrandir_le_labo", "Agrandir le labo", () => StartCoroutine(UpgradeTier()));
                SetButtonInteractable(upgradeBtn, affordable);
                if (!affordable)
                {
                    string reason = "Agrandir le labo — pas assez d'argent";
                    TextMeshProUGUI hint = NewText("UpgradeHint", actionBar, reason, 13, TextAlignmentOptions.Left);
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
                Button upgradeBtn = AddActionButton(actionBar, "agrandir_le_relais", "Agrandir le relais", () => StartCoroutine(UpgradeHubTier()));
                SetButtonInteractable(upgradeBtn, affordable);
                if (!affordable)
                {
                    string reason = "Agrandir le relais — pas assez d'argent";
                    TextMeshProUGUI hint = NewText("HubUpgradeHint", actionBar, reason, 13, TextAlignmentOptions.Left);
                    hint.color = AccentSevere;
                    AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                    TrackText(hint, reason);
                }
            }

            // Phase-5 vector #5a: the money_holding Upgrade-money-holding-tier affordance — the SIBLING of the hub / lab
            // upgrade buttons, calling upgrade-money-holding-tier instead. Visible when the vault is below MAX
            // (SMALL/MEDIUM/LARGE/MAJOR). DISABLED when the wallet band can't afford the upgrade (a qualitative band-vs-band
            // comparison; R2.2 — NEVER cents). The definitive verdict still lives server-side (409). MAX (capped) shows no
            // button. Only rendered for a money_holding.
            UpgradeMoneyHoldingTierButtonShown = false;
            UpgradeMoneyHoldingTierButtonAffordable = false;
            if (card.operational_type == "money_holding" &&
                (card.money_holding_tier_band == "SMALL" || card.money_holding_tier_band == "MEDIUM" ||
                 card.money_holding_tier_band == "LARGE" || card.money_holding_tier_band == "MAJOR"))
            {
                UpgradeMoneyHoldingTierButtonShown = true;
                bool affordable = CanAffordUpgrade(WalletBand);
                UpgradeMoneyHoldingTierButtonAffordable = affordable;
                Button upgradeBtn = AddActionButton(actionBar, "agrandir_la_banque", "Agrandir la banque", () => StartCoroutine(UpgradeMoneyHoldingTier()));
                SetButtonInteractable(upgradeBtn, affordable);
                if (!affordable)
                {
                    string reason = "Agrandir la banque — pas assez d'argent";
                    TextMeshProUGUI hint = NewText("MoneyHoldingUpgradeHint", actionBar, reason, 13, TextAlignmentOptions.Left);
                    hint.color = AccentSevere;
                    AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                    TrackText(hint, reason);
                }
            }

            switch (card.operational_type)
            {
                case "lab":
                    AddGesteDuPupitre(card);
                    break;
                case "specialized_lab":
                    AddGesteDuPupitre(card);
                    // Honor affordance — only when a SCHEDULED appointment is tracked for this lab (the Ash sale path).
                    if (CurrentAppointment != null && CurrentAppointment.status == "SCHEDULED")
                        AddActionButton(actionBar, "honorer_le_rendez_vous", "Honorer le rendez-vous", () => StartCoroutine(HonorAppointment()));
                    break;
                case "front_shop":
                    // ⛔ ② (f2 26/09) : « Injecter » avait un geste VIDE — un bouton qui ne faisait rien. « Blanchir » vise la planque la plus
                    // chargée du quartier (même règle et même montant que ① et ㊵) ; sans planque qui tienne de quoi blanchir, PAS de bouton.
                    if (BlanchirOffertSurLaFiche(buildingId, PlanqueDuQuartier))
                    {
                        string planqueVisee = PlanqueDuQuartier.safehouse_id;
                        AddActionButton(actionBar, "blanchir", Cle("action", "Blanchir"),
                            () => StartCoroutine(Inject(planqueVisee, MafiaCleanCity.CityMap.DistrictInteriorScreenController.FicheBlanchimentMontantCents)));
                    }
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
                        Button tendBtn = AddActionButton(actionBar, "soigner_la_culture", "Soigner la culture", () => StartCoroutine(Tend()));
                        SetButtonInteractable(tendBtn, tendDue);
                        if (!tendDue)
                        {
                            // F2: a readable reason beside the disabled button (this stage is already tended).
                            string reason = "Soigner la culture — déjà fait à ce stade";
                            TextMeshProUGUI hint = NewText("TendHint", actionBar, reason, 13, TextAlignmentOptions.Left);
                            hint.color = DesignTokens.Current.onSurfaceSecondaryAlt;
                            AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                            TrackText(hint, reason);
                        }
                    }
                    else
                    {
                        // Idle grow_house (no active grow) → the plant selector + Plant button.
                        PlantSelectorShown = true;
                        AddPlantSelector(actionBar);
                        AddActionButton(actionBar, "planter", "Planter", () => StartCoroutine(Plant()));
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
                    Button dispatchBtn = AddActionButton(actionBar, "envoyer_un_coursier", "Envoyer un coursier", () => StartCoroutine(Dispatch()));
                    SetButtonInteractable(dispatchBtn, dispatchReady);
                    if (!dispatchReady)
                    {
                        string reason = "Envoyer un coursier — choisissez d'où ça part et où ça va";
                        TextMeshProUGUI hint = NewText("DispatchHint", actionBar, reason, 13, TextAlignmentOptions.Left);
                        hint.color = DesignTokens.Current.onSurfaceSecondaryAlt;
                        AddLayoutElement(hint.gameObject, minHeight: 18, flexibleHeight: 0);
                        TrackText(hint, reason);
                    }
                    break;
                case "money_holding":
                    // Phase-5 vector #5a: the clean-cash vault affordances — a player-entered transfer-amount selector (worded
                    // into an M1 $-band, no raw cents) + the Deposit + Withdraw buttons. SERVER-AUTHORITATIVE: the amount goes
                    // to the server which enforces the tier capacity (deposit 409 OVER_CAPACITY) / sufficient funds (deposit
                    // 409 INSUFFICIENT_FUNDS) / sufficient held (withdraw 409 INSUFFICIENT_HELD) / a positive amount (422) —
                    // the UI does NOT pre-decide; it surfaces the server verdict (F2: a readable message, never a raw code).
                    DepositActionShown = true;
                    WithdrawActionShown = true;
                    AddTransferAmountSelector(actionBar);
                    AddActionButton(actionBar, "deposer", "Déposer", () => StartCoroutine(DepositCash()));
                    AddActionButton(actionBar, "retirer", "Retirer", () => StartCoroutine(WithdrawCash()));
                    break;
                case "stash":
                case "cash_safehouse":
                case "dealer_spot_front":
                    // No M1 player-triggered action on these surfaces beyond convert; keep the affordance honest.
                    break;
            }

            // Hors des compositions focales, une ouverture/conversion reste disponible. Dans le pupitre actif, ce bouton
            // sans rapport avec l'état de cuisson brouillait le seul geste appelé par les bandes servies.
            // « Ouvrir » ne part JAMAIS avec "" (f2 26/09 ; B3-d du suivi ⊥ UX : 422 sur un bâtiment acheté) : `TypeAOuvrir`, sinon
            // le geste est retiré, sans phrase neuve.
            string typeAOuvrir = TypeAOuvrir(card);
            if (!pupitreFocal && typeAOuvrir != null)
                AddActionButton(actionBar, "ouvrir", "Ouvrir", () => StartCoroutine(Convert(typeAOuvrir)));

            actionStatusText = NewText("ActionStatus", actionBar, "", 14, TextAlignmentOptions.Left);
            actionStatusText.color = DesignTokens.Current.onSurfaceMutedAlt;
            AddLayoutElement(actionStatusText.gameObject, minHeight: 22, flexibleHeight: 0);
        }

        // ----------------------------------------------------- band → label/glyph

        public static string TypeLabel(string t)
        {
            switch (t)
            {
                case "lab": return Bande("type", "lab", "Labo");
                case "stash": return Bande("type", "stash", "Réserve");
                case "front_shop": return Bande("type", "front_shop", "Commerce-écran");
                case "cash_safehouse": return Bande("type", "cash_safehouse", "Planque");
                case "dealer_spot_front": return Bande("type", "dealer_spot_front", "Coin de vente");
                case "specialized_lab": return Bande("type", "specialized_lab", "Labo spécialisé");
                case "refinery": return Bande("type", "refinery", "Raffinerie");
                case "grow_house": return Bande("type", "grow_house", "Serre");
                case "distribution_hub": return Bande("type", "distribution_hub", "Relais");
                case "money_holding": return Bande("type", "money_holding", "Banque");
                // 23/09 — les deux types que la couverture de domaine a trouvés sans mot (le back les sert : `operational_chain.ts:26-30`) ;
                // mots de l'atelier 22 (§7.1 B), clés `building.type.press_house` / `.office` SERVIES.
                case "press_house": return Bande("type", "press_house", "Imprimerie");
                case "office": return Bande("type", "office", "Agence");
                case "": case null: return "Pas encore ouvert";   // aucune valeur servie ⇒ aucune clé ; famille « Ouvrir » (orchestration 22/09)
                default: return MafiaCleanCity.I18n.Repli.Type(t);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }

        public static string SetupLabel(string s)
        {
            switch (s)
            {
                case "OPERATIONAL": return Cle("setup", "Operational");
                case "IN_SETUP": return Cle("setup", "In setup");
                case "NOT_CONVERTED": return Cle("setup", "Not converted");
                default: return MafiaCleanCity.I18n.Repli.Etat(s);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color SetupAccent(string s) =>
            s == "OPERATIONAL" ? AccentMild : s == "IN_SETUP" ? AccentModerate : AccentSevere;

        public static string CoverLabel(string b)
        {
            switch (b)
            {
                case "STRONG": return Cle("cover", "Strong");
                case "STANDARD": return Cle("cover", "Standard");
                case "WEAK": return Cle("cover", "Weak");
                case "NONE": return Cle("cover", "None");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color CoverAccent(string b) =>
            b == "STRONG" ? AccentMild : b == "STANDARD" ? AccentMild : b == "WEAK" ? AccentModerate : AccentSevere;

        // ----- Phase-2b: structural_state (OPERATIONAL | DAMAGED | REPAIRING) -----
        public static string StructuralLabel(string s)
        {
            switch (s)
            {
                case "OPERATIONAL": return Cle("structural", "Intact");
                case "DAMAGED": return Cle("structural", "Damaged");
                case "REPAIRING": return Cle("structural", "Repairing");
                case "FAILED": return Cle("structural", "Failed");   // atelier 29 (7746e0bb), servi : « Hors service »
                default: return MafiaCleanCity.I18n.Repli.Etat(s);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color StructuralAccent(string s) =>
            s == "OPERATIONAL" ? AccentMild : s == "REPAIRING" ? AccentModerate : AccentSevere;

        // ----- Phase-2b: raid_risk band gauge (LOW | ELEVATED | HIGH | IMMINENT) -----
        public static string RaidRiskLabel(string b)
        {
            switch (b)
            {
                case "LOW": return Cle("raid_risk", "Low");
                case "ELEVATED": return Cle("raid_risk", "Elevated");
                case "HIGH": return Cle("raid_risk", "High");
                case "IMMINENT": return Cle("raid_risk", "Imminent");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color RaidRiskAccent(string b) =>
            b == "LOW" ? AccentMild : b == "ELEVATED" ? AccentModerate : AccentSevere;

        // ----- Phase-2b: seized_amount band (NONE | LOW | MODERATE | HIGH) — for the raid notification -----
        public static string SeizedLabel(string b)
        {
            switch (b)
            {
                case "HIGH": return Bande("seized_amount", "HIGH", "une grosse prise");
                case "MODERATE": return Bande("seized_amount", "MODERATE", "une prise moyenne");
                case "LOW": return Bande("seized_amount", "LOW", "une petite prise");
                case "NONE": return Bande("seized_amount", "NONE", "rien");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }

        // ----- Phase-2b: repair_cost band (NONE | MINOR | MODERATE | MAJOR) — shown on the Repair button -----
        private static string RepairCostLabel(string b)
        {
            switch (b)
            {
                case "MAJOR": return Bande("repair_cost", "MAJOR", "gros frais");
                case "MODERATE": return Bande("repair_cost", "MODERATE", "frais moyens");
                case "MINOR": return Bande("repair_cost", "MINOR", "petits frais");
                case "NONE": return Bande("repair_cost", "NONE", "sans frais");
                default: return null;   // bande inconnue : le bouton dit « Réparer » seul (atelier c1)
            }
        }

        // ----- Phase-2b vector #2 (Crick) cold-chain: substance_type label (BRINDLE | CRICK | …) -----
        public static string SubstanceLabel(string s)
        {
            switch (s)
            {
                case "BRINDLE": return Cle("substance", "Brindle");
                case "CRICK": return Cle("substance", "Crick");
                case "HUSH": return Cle("substance", "Hush");
                case "ASH": return Cle("substance", "Ash");
                case "": case null: return Cle("substance", "—");
                default: return MafiaCleanCity.I18n.Repli.Type(s);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }

        // ----- Phase-2b vector #2 (Crick) cold-chain: temperature_status band (OPTIMAL_COLD | MODERATE | HOT) -----
        // R2.2: a qualitative band label, NEVER a raw °C. OPTIMAL_COLD=good (mild), MODERATE=amber, HOT=severe.
        public static string TemperatureLabel(string b)
        {
            switch (b)
            {
                case "OPTIMAL_COLD": return Cle("temperature", "Optimal (cold)");
                case "MODERATE": return Cle("temperature", "Warming");
                case "HOT": return Cle("temperature", "Hot");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color TemperatureAccent(string b) =>
            b == "OPTIMAL_COLD" ? AccentMild : b == "MODERATE" ? AccentModerate : AccentSevere;

        // ----- Phase-2c vector #2c (Ash — T5): lab_tier_band (BASIC | REFINED | MASTER) — the specialized_lab standing -----
        public static string LabTierLabel(string b)
        {
            switch (b)
            {
                // ② lot 5 : replis = les mots D14 servis (ST `building.lab_tier.*`, table 37 : « s'accorde à l'atelier ») — « Simple /
                // Affiné / Maître » étaient périmés (écart ② cadres 92-94).
                case "BASIC": return Bande("lab_tier", "BASIC", "de base");
                case "REFINED": return Bande("lab_tier", "REFINED", "amélioré");
                case "MASTER": return Bande("lab_tier", "MASTER", "au meilleur niveau");
                case "NONE": return Bande("lab_tier", "NONE", "Pas de labo");   // atelier 29 (7746e0bb), servi (NONE = la bande ne s'applique pas à ce bâtiment)
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        // BASIC = amber (the entry tier, room to grow), REFINED = cyan (a solid lab), MASTER = premium violet (the top tier).
        private static Color LabTierAccent(string b) =>
            b == "MASTER" ? AccentPremium : b == "REFINED" ? AccentMild : AccentModerate;

        // ----- Phase-2c vector #2c (Ash — T9): purity_band (CUT | STANDARD | PURE | CRYSTALLINE) — the batch grade -----
        // R2.2: a qualitative band label, NEVER the raw purity_score. Ascending grade: CUT < STANDARD < PURE < CRYSTALLINE.
        public static string PurityLabel(string b)
        {
            switch (b)
            {
                case "CUT": return Bande("purity", "CUT", "Coupée");
                case "STANDARD": return Bande("purity", "STANDARD", "Courante");
                case "PURE": return Bande("purity", "PURE", "Pure");
                case "CRYSTALLINE": return Bande("purity", "CRYSTALLINE", "Cristalline");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
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
        public static string AppointmentStatusLabel(string s)
        {
            switch (s)
            {
                case "SCHEDULED": return Bande("appointment", "SCHEDULED", "Réservé");
                case "HONORED": return Bande("appointment", "HONORED", "Honoré");
                case "EXPIRED": return Bande("appointment", "EXPIRED", "Passé");
                default: return MafiaCleanCity.I18n.Repli.Etat(s);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        // SCHEDULED = amber (pending/awaiting), HONORED = cyan (a completed sale), EXPIRED = severe (lost).
        private static Color AppointmentStatusAccent(string s) =>
            s == "HONORED" ? AccentMild : s == "SCHEDULED" ? AccentModerate : AccentSevere;

        // ----- Phase-2c vector #2c (Ash — T9): payout_band (PENDING | NONE | MODEST | FAIR | STRONG | PREMIUM) -----
        // R2.2: the realized-value tier as a band, NEVER the raw payout cents. PENDING (scheduled, not yet sold), NONE
        // (expired, lost), then the ascending honored tiers MODEST < FAIR < STRONG < PREMIUM (the realized purity premium).
        public static string PayoutLabel(string b)
        {
            switch (b)
            {
                case "PENDING": return Bande("payout", "PENDING", "En attente");
                case "NONE": return Bande("payout", "NONE", "Perdu");
                case "MODEST": return Bande("payout", "MODEST", "Modeste");
                case "FAIR": return Bande("payout", "FAIR", "Correct");
                case "STRONG": return Bande("payout", "STRONG", "Fort");
                case "PREMIUM": return Bande("payout", "PREMIUM", "Exceptionnel");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        // ----- ② lot 5 (2026-09-23) : l'écrin d'Ash (cadres 92-94) -----
        public const int PastillesGain = 5;

        /// <summary>Les pastilles allumées du GAIN, sur 5 (tranché (e) : 6 valeurs servies, 5 pastilles ; « si la 6ᵉ est NONE ou absente,
        /// 5 pastilles plus rien »). Lecture retenue, déclarée : les 5 pastilles portent les 5 valeurs d'une vente JOUÉE, NONE (perdue)
        /// → 1 … PREMIUM → 5, premier cran allumé comme au pupitre — c'est ce que dessinent les cadres 94 (passé, 1/5) et 93 (honoré,
        /// cristalline, 5/5) ; la 6ᵉ, PENDING, n'a pas encore de valeur (« absente ») : 5 pastilles, RIEN d'allumé. Le 4/5 du cadre 92
        /// (réservé) est un exemple de maquette (point 19). Six valeurs, six comptes distincts ; hors domaine : rien d'allumé, le mot
        /// du repli dit le reste.</summary>
        public static int PastillesDuGain(string b)
        {
            switch (b)
            {
                case "NONE": return 1;
                case "MODEST": return 2;
                case "FAIR": return 3;
                case "STRONG": return 4;
                case "PREMIUM": return 5;
                default: return 0;   // PENDING (pas encore vendu), et le hors-domaine
            }
        }

        /// <summary>Le titre et la phrase de l'écrin selon le statut servi (bloc E1 ; clés servies de la table 37). Hors domaine :
        /// (null, null) — pas de titre plutôt qu'un titre faux.</summary>
        public static (string titre, string phrase) TitresDuRendezVous(string status)
        {
            switch (status)
            {
                case "SCHEDULED": return (Cle("bloc", "Un rendez-vous est pris"), Cle("bloc", "Un client du district du Verre vous attend."));
                case "HONORED": return (Cle("bloc", "Le rendez-vous est honoré"), Cle("bloc", "La marchandise est partie, le client a payé."));
                case "EXPIRED": return (Cle("bloc", "Le rendez-vous est passé"), Cle("bloc", "Personne n’y est allé. Il faudra en reprendre un."));
                default: return (null, null);
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
        public static string GrowStageLabel(string b)
        {
            switch (b)
            {
                // ② lot 4 : les replis recopiés À L'OCTET des mots D14 servis (ST `building.grow_stage.*`) — « Début / Milieu / Fin /
                // À récolter » étaient périmés (écart ② cadre 36) : sans catalogue, l'écran disait autre chose que le jeu.
                case "EARLY": return Bande("grow_stage", "EARLY", "Bouture");
                case "MID": return Bande("grow_stage", "MID", "Croissance");
                case "LATE": return Bande("grow_stage", "LATE", "Floraison");
                case "DONE": return Bande("grow_stage", "DONE", "Récolte");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        // EARLY/MID = amber (still growing), LATE = cyan (nearly there), DONE = premium violet (a finished crop).
        private static Color GrowStageAccent(string b) =>
            b == "DONE" ? AccentPremium : b == "LATE" ? AccentMild : AccentModerate;

        // ----- ② lot 1 (2026-09-23) : le pupitre du labo — les mots de ses trois échelles (atelier 37, `6c5de8d5`, servis) -----
        /// <summary>Les types qui ont un pupitre (tranché (a) du 23/09) : le `lab` (Brindle) et le `specialized_lab` (Ash). ⚠️ La
        /// raffinerie a aussi une cuisson servie par `lab/:id`, mais aucune maquette ne lui dessine de pupitre.</summary>
        public static bool APupitre(string operationalType) => operationalType == "lab" || operationalType == "specialized_lab";

        public const int CransFeu = 5;     // le domaine de `cook_stage_band` : IDLE, EARLY, MID, LATE, DONE (production.projection.service.ts:53)
        public const int CransStock = 4;   // le domaine de `stock_band` et de `product_band` : NONE, LOW, MEDIUM, HIGH (:56 ; precursors :36)

        /// <summary>« le feu » : cook_stage_band ⇒ son mot (famille `building.cook_stage.*`).</summary>
        public static string CookStageLabel(string b)
        {
            switch (b)
            {
                case "IDLE": return Bande("cook_stage", "IDLE", "Éteint");
                case "EARLY": return Bande("cook_stage", "EARLY", "Début");
                case "MID": return Bande("cook_stage", "MID", "Montée");
                case "LATE": return Bande("cook_stage", "LATE", "Affinage");
                case "DONE": return Bande("cook_stage", "DONE", "Prêt");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }

        /// <summary>« l'étagère » ET « les caisses » : les deux bandes ont le MÊME domaine (NONE à HIGH) et la table 37 leur donne la MÊME
        /// famille de mots, `building.stock.*` (le fourneau lit `product_band` sous « Stock · Faible », cadre 45).</summary>
        public static string StockLabel(string b)
        {
            switch (b)
            {
                case "NONE": return Bande("stock", "NONE", "Vide");
                case "LOW": return Bande("stock", "LOW", "Faible");
                case "MEDIUM": return Bande("stock", "MEDIUM", "Moyen");
                case "HIGH": return Bande("stock", "HIGH", "Haut");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);
            }
        }

        /// <summary>Les crans allumés de « le feu », sur 5. Le premier est TOUJOURS allumé (cadre 39 : un labo éteint montre 1/5) ; une
        /// valeur hors domaine n'allume que lui — le mot du repli dit le reste.</summary>
        public static int CransDuFeu(string b)
        {
            switch (b)
            {
                case "EARLY": return 2;
                case "MID": return 3;
                case "LATE": return 4;
                case "DONE": return 5;
                default: return 1;   // IDLE, et le hors-domaine
            }
        }

        /// <summary>Les crans allumés de « l'étagère » ou « les caisses », sur 4 ; le premier toujours allumé (cadre 39 : vide = 1/4).</summary>
        public static int CransDuStock(string b)
        {
            switch (b)
            {
                case "LOW": return 2;
                case "MEDIUM": return 3;
                case "HIGH": return 4;
                default: return 1;   // NONE, et le hors-domaine
            }
        }

        // Le feu : éteint = neutre, en cours = ambre, prêt = cyan. L'étagère : vide = rouge (on ne rallume pas sans), peu = ambre.
        // Les caisses : vides = neutre, pleines = cyan. ⚠️ Choix du client, déclarés : la table 37 donne les mots, pas les couleurs.
        private static Color CookStageAccent(string b) =>
            b == "DONE" ? AccentMild : b == "EARLY" || b == "MID" || b == "LATE" ? AccentModerate : DesignTokens.Current.onSurfaceMuted;
        private static Color EtagereAccent(string b) =>
            b == "NONE" ? AccentSevere : b == "LOW" ? AccentModerate : b == "MEDIUM" || b == "HIGH" ? AccentMild : DesignTokens.Current.onSurfaceMuted;
        private static Color CaissesAccent(string b) =>
            b == "LOW" || b == "MEDIUM" || b == "HIGH" ? AccentMild : DesignTokens.Current.onSurfaceMuted;

        // ----- ② lot 2 (2026-09-23) : UN geste selon l'état du pupitre (écart ② `c4520078`, cadres 39, 40, 41, 43) -----
        public enum GesteDuPupitre { Aucun, Commander, Allumer, EnCuisson, FaireSortir, ApprovisionnementDelegue }

        /// <summary>Le geste que l'état appelle — un seul à la fois. La cuisson prime : une cuve qui tourne n'appelle ni commande ni
        /// allumage (le 409 « une cuve à la fois » est DIT avant, pas codé). À IDLE, l'étagère décide : vide ⇒ commander, sinon allumer.
        /// ⚠️ Étagère non lue (route en erreur) à IDLE ⇒ « Allumer » : le serveur tranche (422 sans précurseur), le client ne devine pas
        /// un vide. Cuisson non lue ou hors domaine ⇒ AUCUN geste : on ne propose pas d'agir sur un état qu'on ne connaît pas.
        /// ② lot 3 : `approvisionnementDelegue` — la charge SUPPLY_SOURCING n'est plus tenue par le joueur ; la commande lui est alors
        /// refusée (`assertNotDelegated(SUPPLY_SOURCING)`, precursors.controller.ts:73) : le geste « Commander » devient l'état délégué
        /// (cadre 44). Les autres gestes ne dépendent pas de cette charge : allumer ou sortir restent au joueur.</summary>
        public static GesteDuPupitre GesteSelonLEtat(string cookStageBand, string stockBand, bool approvisionnementDelegue = false)
        {
            switch (cookStageBand)
            {
                case "EARLY": case "MID": case "LATE": return GesteDuPupitre.EnCuisson;
                case "DONE": return GesteDuPupitre.FaireSortir;
                case "IDLE":
                    if (stockBand != "NONE") return GesteDuPupitre.Allumer;
                    return approvisionnementDelegue ? GesteDuPupitre.ApprovisionnementDelegue : GesteDuPupitre.Commander;
                default: return GesteDuPupitre.Aucun;
            }
        }

        /// <summary>② bulle — le lieutenant de CE bâtiment : le premier de ses `lieutenant_ids`, dans l'ordre servi, présent au roster.
        /// Un id sans ligne au roster est sauté (jamais un UUID à l'écran) ; aucun ⇒ null.</summary>
        public static LieutenantRowDto LieutenantDuBatiment(MafiaCleanCity.Shell.BatimentPossedeDto[] mesBatiments, string buildingId, LieutenantRowDto[] roster)
        {
            if (mesBatiments == null || roster == null || string.IsNullOrEmpty(buildingId)) return null;
            foreach (MafiaCleanCity.Shell.BatimentPossedeDto b in mesBatiments)
            {
                if (b == null || b.building != buildingId || b.lieutenant_ids == null) continue;
                foreach (string lid in b.lieutenant_ids)
                    foreach (LieutenantRowDto l in roster)
                        if (l != null && !string.IsNullOrEmpty(lid) && l.lieutenant_id == lid) return l;
                return null;
            }
            return null;
        }

        /// <summary>② lot 3 — la charge SUPPLY_SOURCING est-elle retirée au joueur ? Le garde serveur refuse dès que `delegation_state`
        /// n'est pas `SELF` (category-delegation-guard.service.ts:59-64 : DELEGATED ET RETIRED). Charges non lues, ou catégorie
        /// absente ⇒ false : on ne dit pas « délégué » sans l'avoir lu.</summary>
        public static bool ApprovisionnementDelegue(GetMetaTaskCategoriesResponseDto charges)
        {
            if (charges?.task_categories == null) return false;
            foreach (TaskCategoryRowDto c in charges.task_categories)
                if (c != null && c.category_key == "SUPPLY_SOURCING")
                    return !string.IsNullOrEmpty(c.delegation_state) && c.delegation_state != "SELF";
            return false;
        }

        /// <summary>Le geste « Commander » : une FAMILLE indexée par le précurseur SERVI, `building.commande.<precursor_type>` (décision
        /// de l'orchestrateur du 23/09, table 54 de l'atelier à venir), par `ParValeur` — plus la clé dérivée `commander_du_<x>`, et
        /// JAMAIS « Commander » + un nom (D12 : une composition casse l'article et la langue). Les replis sont des phrases ENTIÈRES, une
        /// par valeur, comptées tant que la famille n'est pas servie ; seule PYRALIN reprend un mot déjà servi (« Commander du Pyralin »,
        /// `building.action.commander_du_pyralin`) — les cinq autres sont PROPOSÉES, à l'atelier de trancher.</summary>
        public static string CommanderLabel(string precursorType)
        {
            switch (precursorType)
            {
                case "PYRALIN": return Bande("commande", "PYRALIN", "Commander du Pyralin");
                case "THALMITE": return Bande("commande", "THALMITE", "Commander de la Thalmite");
                case "GARNET_SALT": return Bande("commande", "GARNET_SALT", "Commander du sel de grenat");
                case "VERDANT_ROOT_EXTRACT": return Bande("commande", "VERDANT_ROOT_EXTRACT", "Commander de la racine verdoyante");
                case "LULL_RESIN": return Bande("commande", "LULL_RESIN", "Commander de la résine de lull");
                case "GLASS_LILY": return Bande("commande", "GLASS_LILY", "Commander du lys de verre");
                default: return MafiaCleanCity.I18n.Repli.Type(precursorType);
            }
        }

        /// <summary>Le nombre de passes CHOISI par le joueur (0..3 — R2.2 le PERMET : c'est son réglage, pas une donnée cachée), dit par
        /// la clé ICU servie `building.bloc.passes_compte` (« pas du tout » / « 1 passe » / « 3 passes »). Le repli est le MÊME motif,
        /// formaté par le même moteur ICU. Hors 0..`MaxRefiningPassesUi` : le mot de la famille, jamais un cran faux affirmé.</summary>
        public static string RefiningPassesLabel(int passes)
        {
            if (passes < 0 || passes > MaxRefiningPassesUi) return MafiaCleanCity.I18n.Repli.EtatInconnu;
            var p = new Dictionary<string, string> { ["passes"] = passes.ToString(System.Globalization.CultureInfo.InvariantCulture) };
            return MafiaCleanCity.I18n.Libelle.Gabarit("building.bloc.passes_compte",
                MafiaCleanCity.I18n.IcuFormat.Formater("{passes, plural, =0 {pas du tout} one {# passe} other {# passes}}", p), p);
        }

        // ----- Phase-3 vector #3 (grow_house — T7): husbandry_band (WITHERED | ON_TRACK | THRIVING) — the tend trajectory -----
        // R2.2: the husbandry payoff trajectory as a band, NEVER the raw tend_count. WITHERED (neglected — low yield) <
        // ON_TRACK (partial husbandry — middling) < THRIVING (full husbandry — top yield). Reuses the AccentMild/Moderate/
        // Severe/Premium palette: WITHERED = severe, ON_TRACK = amber, THRIVING = premium violet (the best trajectory).
        public static string HusbandryLabel(string b)
        {
            switch (b)
            {
                // ② lot 4 : replis = mots D14 servis (ST `building.husbandry.*`). « À soigner » est le MOT de WITHERED (tranché (c) du
                // 23/09) ; `tend_due` pilote le GESTE (Soigner actif ou grisé, BuildActions), pas ce mot — les deux coexistent.
                case "WITHERED": return Bande("husbandry", "WITHERED", "À soigner");
                case "ON_TRACK": return Bande("husbandry", "ON_TRACK", "Correcte");
                case "THRIVING": return Bande("husbandry", "THRIVING", "Vigoureuse");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
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
        public static string GrowablePrecursorLabel(string p)
        {
            switch (p)
            {
                case "verdant_root_extract": return Bande("precursor", "verdant_root_extract", "Racine verdoyante");
                case "lull_resin": return Bande("precursor", "lull_resin", "Résine de lull");
                case "glass_lily": return Bande("precursor", "glass_lily", "Lys de verre");
                default: return MafiaCleanCity.I18n.Repli.Type(p);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }

        // ----- Phase-4 vector #4 (distribution_hub): hub_tier_band (SMALL | MEDIUM | LARGE | MAJOR | MAX) — the hub standing -----
        // R2.2: a qualitative band label, NEVER the raw hub_tier int. Ascending roster-cap lever: SMALL < MEDIUM < LARGE <
        // MAJOR < MAX (the cap at distribution.hub_max_tier 5). A higher band → a larger concurrent-courier roster cap.
        public static string HubTierLabel(string b)
        {
            switch (b)
            {
                case "SMALL": return Bande("hub_tier", "SMALL", "Petit");
                case "MEDIUM": return Bande("hub_tier", "MEDIUM", "Moyen");
                case "LARGE": return Bande("hub_tier", "LARGE", "Grand");
                case "MAJOR": return Bande("hub_tier", "MAJOR", "Majeur");
                case "MAX": return Bande("hub_tier", "MAX", "Maximal");
                case "NONE": return Bande("hub_tier", "NONE", "Pas de relais");   // atelier 29 (7746e0bb), servi
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        // SMALL/MEDIUM = amber (room to grow), LARGE/MAJOR = cyan (a solid hub), MAX = premium violet (the top tier, capped).
        private static Color HubTierAccent(string b) =>
            b == "MAX" ? AccentPremium : (b == "LARGE" || b == "MAJOR") ? AccentMild : AccentModerate;

        // ----- Phase-4 vector #4 (distribution_hub): roster_band (OPEN | BUSY | FULL) — the courier-roster occupancy -----
        // R2.2: the player's concurrent-shipment occupancy as a band, NEVER the raw in-transit count / cap. OPEN (idle —
        // dispatch freely) → BUSY (some shipments out, capacity remains) → FULL (at the cap — a further dispatch is refused
        // 409 OVER_CAPACITY). OPEN = cyan (good), BUSY = amber (filling), FULL = severe (no headroom).
        public static string RosterLabel(string b)
        {
            switch (b)
            {
                case "OPEN": return Bande("roster", "OPEN", "Ouverte");
                case "BUSY": return Bande("roster", "BUSY", "Occupée");
                case "FULL": return Bande("roster", "FULL", "Pleine");
                case "NONE": return Bande("roster", "NONE", "Pas d’équipe");   // atelier 29 (7746e0bb), servi
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color RosterAccent(string b) =>
            b == "OPEN" ? AccentMild : b == "BUSY" ? AccentModerate : AccentSevere;

        // ----- Phase-4 vector #4 (distribution_hub): the vehicle modes (FOOT | BIKE | CAR) the player can dispatch with -----
        // The unlocked vehicle SET (available_vehicles) worded as a comma list — categorical labels, NEVER speeds (R2.2).
        // A hub unlocks bike/car; a no-operational-hub set is foot-only.
        private static readonly string[] AllVehicles = { "FOOT", "BIKE", "CAR" };
        public static string VehicleLabel(string v)
        {
            switch (v)
            {
                case "FOOT": return Bande("vehicle", "FOOT", "À pied");
                case "BIKE": return Bande("vehicle", "BIKE", "Vélo");
                case "CAR": return Bande("vehicle", "CAR", "Voiture");
                default: return MafiaCleanCity.I18n.Repli.Type(v);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static string AvailableVehiclesLabel(string[] vehicles)
        {
            if (vehicles == null || vehicles.Length == 0) return "Foot";
            var parts = new List<string>(vehicles.Length);
            foreach (string v in vehicles) parts.Add(VehicleLabel(v));
            return string.Join(", ", parts);
        }

        // ----- Phase-5 vector #5a (money_holding): money_holding_tier_band (SMALL | MEDIUM | LARGE | MAJOR | MAX) — the vault standing -----
        // R2.2: a qualitative band label, NEVER the raw money_holding_tier int. Ascending deposit-capacity lever: SMALL <
        // MEDIUM < LARGE < MAJOR < MAX (the cap at money_holding.max_tier 5). A higher band → a larger held-cash capacity.
        public static string MoneyHoldingTierLabel(string b)
        {
            switch (b)
            {
                case "SMALL": return Bande("money_holding_tier", "SMALL", "Petit");
                case "MEDIUM": return Bande("money_holding_tier", "MEDIUM", "Moyen");
                case "LARGE": return Bande("money_holding_tier", "LARGE", "Grand");
                case "MAJOR": return Bande("money_holding_tier", "MAJOR", "Majeur");
                case "MAX": return Bande("money_holding_tier", "MAX", "Maximal");
                case "NONE": return Bande("money_holding_tier", "NONE", "Pas de banque");   // atelier 29 (7746e0bb), servi
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        // SMALL/MEDIUM = amber (room to grow), LARGE/MAJOR = cyan (a serious vault), MAX = premium violet (the top tier, capped).
        private static Color MoneyHoldingTierAccent(string b) =>
            b == "MAX" ? AccentPremium : (b == "LARGE" || b == "MAJOR") ? AccentMild : AccentModerate;

        // ----- Phase-5 vector #5a (money_holding): held_band (NONE | LOW | MODERATE | HIGH | MASSIVE) — the clean-cash magnitude -----
        // R2.2: the EFFECTIVE held clean cash as a band, NEVER the raw held_cents. A higher hold earns more passive yield but
        // draws the audit-forfeiture eye (MASSIVE is the forfeiture-threshold territory). NONE = an empty vault.
        public static string HeldLabel(string b)
        {
            switch (b)
            {
                case "NONE": return Bande("held", "NONE", "Vide");
                case "LOW": return Bande("held", "LOW", "Peu");
                case "MODERATE": return Bande("held", "MODERATE", "Moyen");
                case "HIGH": return Bande("held", "HIGH", "Beaucoup");
                case "MASSIVE": return Bande("held", "MASSIVE", "Énorme");
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        // NONE/LOW = cyan (safe), MODERATE/HIGH = amber (building up), MASSIVE = severe (forfeiture-threshold territory).
        private static Color HeldAccent(string b) =>
            b == "MASSIVE" ? AccentSevere : (b == "MODERATE" || b == "HIGH") ? AccentModerate : AccentMild;

        // ----- Phase-5 vector #5a (money_holding): capacity_band (OPEN | BUSY | FULL) — the held-vs-capacity fill -----
        // R2.2: the fill as a band, NEVER the raw held/cap. OPEN (empty — deposit freely) → BUSY (some held, room remains) →
        // FULL (at the cap — a further deposit is refused 409 OVER_CAPACITY). The BYTE-MIRROR of the distribution_hub roster_band.
        public static string CapacityLabel(string b)
        {
            switch (b)
            {
                case "OPEN": return Bande("capacity", "OPEN", "Ouverte");
                case "BUSY": return Bande("capacity", "BUSY", "Occupée");
                case "FULL": return Bande("capacity", "FULL", "Pleine");
                case "NONE": return Bande("capacity", "NONE", "Pas de banque");   // atelier 29 (7746e0bb), servi
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color CapacityAccent(string b) =>
            b == "OPEN" ? AccentMild : b == "BUSY" ? AccentModerate : AccentSevere;

        // ----- Phase-5 vector #5a (money_holding): yield_band (IDLE | EARNING) — the passive-yield state -----
        // R2.2: the yield as a boolean-shaped band, NEVER the raw rate / accrued cents. IDLE (nothing held → no yield) /
        // EARNING (the holding accrues a light passive yield each tick, realized on the next deposit/withdraw).
        public static string YieldLabel(string b)
        {
            switch (b)
            {
                case "IDLE": return Bande("yield", "IDLE", "rien ne rentre");
                case "EARNING": return Bande("yield", "EARNING", "ça rapporte");
                case "NONE": return Bande("yield", "NONE", "Pas de banque");   // atelier 29 (7746e0bb), servi
                default: return MafiaCleanCity.I18n.Repli.Etat(b);   // hors domaine : le mot de la famille, jamais la valeur brute (atelier 28)
            }
        }
        private static Color YieldAccent(string b) => b == "EARNING" ? AccentMild : DesignTokens.Current.onSurfaceSecondaryAlt;

        // ----- Phase-5 vector #5a (money_holding): the player-entered transfer amount worded into a qualitative size band -----
        // R2.2: the deposit/withdraw amount is WORDED as a qualitative SIZE band (Pocket / Small / Medium / Large) rather than
        // a raw cents/digit, so the selector reads as a qualitative choice + keeps the no-raw-scalar guard simple (no bare
        // number — not even a "$10k" digit — leaks to the player). The server is the final authority (it enforces capacity/
        // funds on the ACTUAL cents passed in the request body). The cents VALUE travels in the body (never rendered); only
        // the band word is shown. The four steps ($1k / $10k / $100k / $1M) anchor on the SAME M1 $ scale the held bands use.
        public static readonly int[] TransferAmountStepsCents = { 100_000, 1_000_000, 10_000_000, 100_000_000 }; // $1k / $10k / $100k / $1M.
        public static string TransferAmountLabel(int cents)
        {
            switch (cents)
            {
                case 100_000: return "Pocket";    // $1k
                case 1_000_000: return "Small";   // $10k
                case 10_000_000: return "Medium"; // $100k
                case 100_000_000: return "Large"; // $1M
                // ⛔ PLUS « Small » : un montant hors des quatre paliers se disait « Small », c'est-à-dire un palier FAUX affirmé
                // (règle f2 du 23/09, atelier 28). Il se dit « état inconnu » ; la couverture des quatre paliers est testée.
                default: return MafiaCleanCity.I18n.Repli.EtatInconnu;
            }
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

        // W3.U1 C1 (design D2) — optional parent-of-mount the AppShell renseigne BEFORE Start() runs.
        // See DashboardController.mountParent for the full rationale (byte-identical mechanism here).
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

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
            Transform root = mountParent != null ? mountParent : canvas.transform; // W3.U1 D2

            // Dim backdrop (the City Map would sit behind in-game).
            GameObject backdrop = NewUI("BuildingCardBackdrop", root);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = DesignTokens.Current.scrimBackdrop;

            // The bottom-sheet card, anchored bottom-centre.
            GameObject card = NewUI("BuildingCardSheet", root);
            RectTransform cardRt = (RectTransform)card.transform;
            // ⛔ LARGEUR : la fiche s'ÉTIRE, elle n'a pas de largeur fixe.
            // Elle valait `520` en unités de canvas, soit 40,6 % de la largeur — mesuré sur la
            // capture 1080×2400, puis comparé au rendu RATIFIÉ par l'user
            // (`Tools/juge-visuel/ecran-principal/ecran-canon.png`, 1176×2091) où le panneau bas
            // occupe **93,6 %** de la largeur, marges de 3,2 % de chaque côté.
            // ⚠️ Une largeur fixe en unités de canvas n'est une proportion sur AUCUNE résolution
            // en particulier : elle en vise une, muettement, et se décale sur toutes les autres.
            // ★ Le défaut ne s'est vu que sur une capture. Aucune garde structurelle ne le voyait :
            //   la carte existait, ses rangées étaient bonnes, ses valeurs justes — elle était
            //   simplement deux fois trop étroite, et rien dans l'arbre ne le dit.
            const float MargeCoteUnites = 41f;   // 3,2 % de 1280 unités, la marge du canon
            cardRt.anchorMin = new Vector2(0f, 0f);
            cardRt.anchorMax = new Vector2(1f, 0f);
            cardRt.pivot = new Vector2(0.5f, 0f);
            cardRt.sizeDelta = new Vector2(-2f * MargeCoteUnites, 760f);
            // ⛔ LE DOCK MANGE SA PART. Mesuré sous chrome le 2026-09-02 : la fiche démarrait à
            // 24 unités du bas quand le dock en occupe 294 — elle passait dessous, et aucune
            // capture hors shell ne pouvait le montrer (il n'y a pas de dock dans une image sans
            // dock). Même défaut que ⑨, trouvé le même jour, par la même garde.
            // ★ Ici la garde a précédé l'image : je l'ai écrite AVANT de regarder la capture, en
            //   pariant que le défaut serait le même. Il l'était — et c'est l'assertion qui l'a
            //   dit, pas mon œil. Une classe de défaut qu'on vient de corriger ailleurs se
            //   cherche, elle ne s'attend pas.
            // Hors shell l'inset vaut 0 : la fiche retombe sur son comportement d'avant.
            cardRt.anchoredPosition = new Vector2(0f, 24f + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx);
            card.AddComponent<Image>().color = SurfaceBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(18, 18, 16, 16);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            // ⛔ La hauteur ÉPOUSE le contenu — elle ne le devine pas. La valeur fixe de 760
            // unités laissait, sur le compte de démo, une bande morte sous les actions : le canon
            // (`ecran-canon.png`) montre un panneau qui s'arrête à sa dernière action.
            // ⚠️ Et une hauteur fixe est fausse dans les DEUX sens : elle laisse du vide quand
            // l'immeuble a peu de rangées, et elle rogne quand il en a beaucoup (les rangées
            // raid/risque et Ash n'apparaissent que sur certains bâtiments). Le vide se voit ;
            // la coupe ne se voit que sur le bâtiment qui la déclenche, et ce n'est pas celui
            // qu'on capture.
            var ajusteur = card.AddComponent<ContentSizeFitter>();
            ajusteur.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            ajusteur.horizontalFit = ContentSizeFitter.FitMode.Unconstrained;

            cardContent = cardRt;

            // ⛔ CENTRÉS — le canon en fait une PLAQUE, pas une ligne de texte. Mesuré par un juge
            //    ⊥ : le titre du jeu occupe **98,5 %** de la largeur utile (3,0 CSS de marge à
            //    gauche, 1,9 à droite) là où la référence lui en donne **42,7 %**, centré, avec
            //    95 CSS de marge de chaque côté. La boîte reste pleine largeur — c'est le TEXTE
            //    qui se centre, donc la plaque garde sa largeur naturelle quel que soit le nom, et
            //    un nom long ne se retrouve pas décalé à gauche de son propre bloc.
            //    ⚠️ Le sous-titre suit : il est la seconde ligne de la même plaque, et les laisser
            //      désalignés produirait un bloc en escalier que ni la référence ni le jeu n'ont.
            titleText = NewText("Title", card.transform, "BÂTIMENT OPÉRATIONNEL", 22, TextAlignmentOptions.Center);
            titleText.fontStyle = FontStyles.Bold;
            AddLayoutElement(titleText.gameObject, minHeight: 30, flexibleHeight: 0);

            typeText = NewText("Type", card.transform, "Type : —", 16, TextAlignmentOptions.Center);
            typeText.color = DesignTokens.Current.onSurfaceDim;
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

        /// <summary>L'échéance d'entretien, en clair. Le nombre est SIGNÉ — négatif = en retard —
        /// et un « -3 jours » ne se lit pas ; on dit « en retard de 3 jours ».
        /// ⚠️ Zéro jour sur un bâtiment pas encore opérationnel ne veut pas dire « dû aujourd'hui » :
        /// la projection le documente comme une valeur de remplissage pour ce cas. On s'appuie donc
        /// sur la BANDE pour décider quoi dire, jamais sur le nombre seul.</summary>
        private static string EcheanceLabel(string bucket, int jours)
        {
            if (string.IsNullOrEmpty(bucket) || bucket == "WITHIN_WINDOW")
                return jours > 0 ? $"Dans {jours} j" : "À jour";
            if (jours < 0) return $"En retard de {-jours} j";
            return jours == 0 ? "Dû aujourd'hui" : $"Dans {jours} j";
        }

        private static Color LapseAccent(string bucket)
        {
            switch (bucket)
            {
                case "CRITICAL": return AccentSevere;
                case "HARD":     return AccentModerate;
                case "SOFT":     return AccentMild;
                default:          return AccentMild;   // « dans la fenêtre » : pas une alerte
            }
        }

        /// <summary>Le nom du bâtiment, résolu par le catalogue i18n — ou LA CLÉ, visible.
        ///
        /// ⛔ Mesuré le 2026-09-02 : la fiche projette `name_i18n` depuis toujours
        /// (`{key:"game.fiction.building.name", params:{type,district,block,rank}}`) et cet écran
        /// ne l'a jamais lu — il affichait « BÂTIMENT OPÉRATIONNEL », un libellé de CATÉGORIE là
        /// où le serveur donnait un NOM.
        /// ⚠️ Le bundle a longtemps servi 67 clés dont aucune de celles-ci, et le titre affichait
        /// alors la clé nue. Depuis le 2026-09-02 il en sert 386, celle-ci comprise.
        /// ★ C'était laid et c'était le point : un nom fabriqué aurait été plus joli et aurait
        ///   fait croire au lecteur que le jeu nomme ses bâtiments. La clé nue a fait DEUX fois
        ///   son travail — elle a fait écrire les textes (« BÂTIMENT OPÉRATIONNEL » ne l'avait pas
        ///   fait en plusieurs mois), puis elle a montré à l'image que le client et le bundle ne
        ///   s'accordaient pas sur les noms des paramètres. Un maquillage aurait caché les deux.
        /// Le repli sur le libellé de catégorie ne subsiste que si le serveur n'envoie AUCUNE
        /// clé — là, il n'y a rien à montrer, pas même un trou.</summary>
        private static string NomDuBatiment(BuildingCardDto card)
        {
            if (card == null || card.name_i18n == null || string.IsNullOrEmpty(card.name_i18n.key))
                return "BÂTIMENT OPÉRATIONNEL";

            var p = new Dictionary<string, string>();
            BuildingNameParamsDto pr = card.name_i18n.@params;
            if (pr != null)
            {
                // ⛔ Les noms sont ceux du BUNDLE, pas ceux d'une charge utile d'hier — voir
                // BuildingNameParamsDto. Et le test `IsNullOrEmpty` n'est pas une précaution
                // décorative : `rang` est absent au rang 1, et la clé servie alors NE LE DEMANDE
                // PAS. Un `p["rang"] = "1"` de complaisance écrirait un rang que personne n'a
                // demandé — on passe ce qu'on reçoit, rien de plus.
                if (!string.IsNullOrEmpty(pr.enseigne)) p["enseigne"] = pr.enseigne;
                if (!string.IsNullOrEmpty(pr.district)) p["district"] = pr.district;
                if (!string.IsNullOrEmpty(pr.block))    p["block"] = pr.block;
                if (!string.IsNullOrEmpty(pr.rang))     p["rang"] = pr.rang;
            }
            return MafiaCleanCity.I18n.I18nCatalog.Traduire(card.name_i18n.key, p);
        }

        /// <summary>Le passage par clé vit dans `MafiaCleanCity.I18n.Libelle` — partagé par
        /// les neuf écrans à convertir, pas recopié dans chacun. Voir ce fichier pour le contrat
        /// (repli byte-identique) et pour ce qui n'a PAS le droit d'y passer (valeurs calculées).</summary>
        /// <summary>Lot E (2026-09-22) — une BANDE servie : la clé est `building.<famille>.<valeur servie>`
        /// (`Libelle.ParValeur`), la forme posée par le back dans `string_table.ts` ; le repli est le texte
        /// français de l'atelier (égal au fr du back, vérifié par `Tools/juge-donnees/i18n/cles-bandes.py`),
        /// affiché tant que la clé n'est pas servie. Jamais la clé tirée du mot anglais.</summary>
        private static string Bande(string famille, string valeurServie, string repli) =>
            MafiaCleanCity.I18n.Libelle.ParValeur("building", famille, valeurServie, repli);

        /// <summary>TD-612 (24/09) : la TEINTE d'un jeton, avec l'opacité du site. Les quatre fonds opaques du pupitre et de l'écrin
        /// recopiaient la teinte de jetons translucides (mapDialogBg α 0,98, hudBarGlassTop α 0,91) : on suit la palette pour la
        /// teinte, et l'alpha reste un choix de composition du site (règle de la garde : l'alpha n'entre pas dans la distance).</summary>
        private static Color Opaque(Color jeton) => new Color(jeton.r, jeton.g, jeton.b, 1f);

        internal static string Cle(string role, string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("building", role, litteral);

        /// <summary>Les candidats au titre de glyphe le plus large — le vocabulaire complet
        /// plafonne à 7 caractères, et ces deux-là portent les caractères les plus gras.
        /// ⚠️ Ce n'est PAS la liste des glyphes : c'est la liste de ceux qui peuvent gagner la
        /// mesure. Un glyphe plus long ajouté ailleurs doit venir ici, sinon il sera coupé —
        /// c'est le seul endroit du fichier qui doit bouger dans ce cas.</summary>

        private GameObject AddStatusRow(string idStable, string label, string value, Color accent,
                                        string cleDuLibelle = null, Transform parent = null)
        {
            if (parent == null) parent = statusRows;
            GameObject row = NewUI("Row_" + idStable, parent);
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

            // ⛔ PLUS DE COLONNE DE GLYPHE (23/09, décision f2) : les « [##.] », « [o..] », « [C] »… n'existent dans AUCUNE maquette, et leur
            // raison écrite — a11y C5-F1, « la couleur n'est jamais seule à porter l'information » — est satisfaite par la VALEUR : elle porte
            // un MOT, dans la même couleur. Garde : `GlyphesPlayModeTests` (toute valeur en couleur porte un mot ; plus aucun glyphe).

            // `cleDuLibelle` (② lot 5) : une clé NOMMÉE quand le mot a changé et que la clé reste (D14 : « L’atelier » sous
            // `building.row.taille_du_labo`) ; sinon la clé se dérive du libellé, comme partout.
            string libelle = cleDuLibelle != null ? MafiaCleanCity.I18n.Libelle.Gabarit(cleDuLibelle, label) : Cle("row", label);
            TextMeshProUGUI l = NewText("Label", row.transform, libelle, 15, TextAlignmentOptions.Left);
            l.color = DesignTokens.Current.onSurfaceMuted;
            AddLayoutElement(l.gameObject, minWidth: 120, flexibleWidth: 1);

            TextMeshProUGUI v = NewText("Value", row.transform, value, 16, TextAlignmentOptions.Right);
            v.color = accent;
            v.fontStyle = FontStyles.Bold;
            AddLayoutElement(v.gameObject, minWidth: 140, flexibleWidth: 0);
            TrackText(l, libelle);
            TrackText(v, value);
            return row;
        }

        /// <summary>② lot 5 — une ligne de texte dans la zone d'état (titre et phrase de l'écrin).</summary>
        private void AddLigneDEtat(string nom, string texte, int taille, Color couleur, FontStyles style, Transform parent = null)
        {
            if (parent == null) parent = statusRows;
            TextMeshProUGUI t = NewText(nom, parent, texte, taille, TextAlignmentOptions.Left);
            t.color = couleur;
            t.fontStyle = style;
            t.textWrappingMode = TextWrappingModes.Normal;
            t.overflowMode = TextOverflowModes.Overflow;
            AddLayoutElement(t.gameObject, minHeight: taille + 6, flexibleHeight: 0);
            TrackText(t, texte);
        }

        /// <summary>② lot 1 — une échelle du pupitre : le libellé, `total` crans dont `allumes` en couleur, puis le MOT dans la même
        /// couleur (G2 : la valeur en couleur porte un mot). Les crans s'appellent `CranAllume` / `CranEteint` : la garde les compte.</summary>
        private GameObject AddEchelle(string idStable, string label, int allumes, int total, string value, Color accent,
                                      Transform parent = null)
        {
            if (parent == null) parent = statusRows;
            GameObject row = NewUI("Row_" + idStable, parent);
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

            string libelle = Cle("row", label);
            TextMeshProUGUI l = NewText("Label", row.transform, libelle, 15, TextAlignmentOptions.Left);
            l.color = DesignTokens.Current.onSurfaceMuted;
            AddLayoutElement(l.gameObject, minWidth: 120, flexibleWidth: 1);

            GameObject crans = NewUI("Crans", row.transform);
            HorizontalLayoutGroup ch = crans.AddComponent<HorizontalLayoutGroup>();
            ch.spacing = 4;
            ch.childAlignment = TextAnchor.MiddleCenter;
            ch.childControlWidth = true;
            ch.childControlHeight = true;
            ch.childForceExpandWidth = false;
            ch.childForceExpandHeight = false;
            for (int i = 0; i < total; i++)
            {
                bool allume = i < allumes;
                GameObject cran = NewUI(allume ? "CranAllume" : "CranEteint", crans.transform);
                Image img = cran.AddComponent<Image>();
                img.color = allume ? accent : DesignTokens.Current.surfaceRaised;
                img.raycastTarget = false;
                AddLayoutElement(cran, minWidth: 14, preferredWidth: 14, minHeight: 10, preferredHeight: 10);
            }

            TextMeshProUGUI v = NewText("Value", row.transform, value, 16, TextAlignmentOptions.Right);
            v.color = accent;
            v.fontStyle = FontStyles.Bold;
            AddLayoutElement(v.gameObject, minWidth: 140, flexibleWidth: 0);
            TrackText(l, libelle);
            TrackText(v, value);
            return row;
        }

        /// <summary>② pupitre — composition dédiée quand l'état de cuisson est connu. Elle remplace les six lignes
        /// génériques dans ce moment précis, sans les supprimer de la fiche ordinaire.</summary>
        private Transform AddPupitreLaboratoire()
        {
            GameObject pupitre = NewUI("PupitreLaboratoire", statusRows);
            pupitre.AddComponent<Image>().color = Opaque(DesignTokens.Current.mapDialogBg);   // TD-612 : (17,22,29) était à 2,45 de ce jeton
            var disposition = pupitre.AddComponent<VerticalLayoutGroup>();
            disposition.padding = new RectOffset(14, 14, 14, 14);
            disposition.spacing = 8;
            disposition.childControlWidth = true;
            disposition.childControlHeight = true;
            disposition.childForceExpandWidth = true;
            disposition.childForceExpandHeight = false;
            var ajusteur = pupitre.AddComponent<ContentSizeFitter>();
            ajusteur.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            ajusteur.horizontalFit = ContentSizeFitter.FitMode.Unconstrained;
            AddLayoutElement(pupitre, flexibleHeight: 0);
            AddAppareilLaboratoire(pupitre.transform);
            return pupitre.transform;
        }

        /// <summary>Silhouette du fourneau en primitives UI. Elle situe le pupitre sans prétendre illustrer une mesure :
        /// les trois bandes servies restent les seules porteuses d'état.</summary>
        private static void AddAppareilLaboratoire(Transform parent)
        {
            GameObject scene = NewUI("AppareilLaboratoire", parent);
            scene.AddComponent<Image>().color = Opaque(DesignTokens.Current.hudBarGlassTop);   // TD-612 : (13,18,24) était à 3,74
            AddLayoutElement(scene, minHeight: 180, preferredHeight: 180, flexibleHeight: 0);

            void Rectangle(string nom, Vector2 taille, Vector2 position, Color couleur, float angle = 0f)
            {
                GameObject go = NewUI(nom, scene.transform);
                RectTransform rt = (RectTransform)go.transform;
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
                rt.sizeDelta = taille;
                rt.anchoredPosition = position;
                rt.localRotation = Quaternion.Euler(0, 0, angle);
                go.AddComponent<Image>().color = couleur;
            }

            Color verre = new Color(0.77f, 0.88f, 0.93f, 0.88f);
            Color acier = new Color32(82, 96, 108, 255);
            Color liquide = new Color(0.78f, 0.55f, 0.20f, 0.92f);
            Rectangle("EtagereHaute", new Vector2(430, 7), new Vector2(0, 66), acier);
            Rectangle("EtagereBasse", new Vector2(430, 9), new Vector2(0, -70), acier);
            Rectangle("Ballon", new Vector2(105, 105), new Vector2(-92, -10), new Color(verre.r, verre.g, verre.b, 0.22f));
            Rectangle("ColBallon", new Vector2(28, 72), new Vector2(-92, 52), verre);
            Rectangle("LiquideBallon", new Vector2(88, 28), new Vector2(-92, -40), liquide);
            Rectangle("Condenseur", new Vector2(145, 26), new Vector2(12, 24), verre, -22f);
            Rectangle("TubeInterieur", new Vector2(124, 7), new Vector2(12, 24), new Color(0.35f, 0.85f, 0.88f, 0.9f), -22f);
            Rectangle("Fiole", new Vector2(72, 92), new Vector2(112, -22), new Color(verre.r, verre.g, verre.b, 0.30f));
            Rectangle("ColFiole", new Vector2(32, 42), new Vector2(112, 42), verre);
            Rectangle("LiquideFiole", new Vector2(58, 18), new Vector2(112, -48), liquide);
            Rectangle("Thermometre", new Vector2(12, 92), new Vector2(-145, 20), verre);
            Rectangle("Mercure", new Vector2(5, 58), new Vector2(-145, 5), AccentSevere);
        }

        /// <summary>② écrin Ash — groupe visuel autonome : la composition suit les cadres 92–94 sans transformer
        /// une donnée absente en fiction. Le lieu du rendez-vous n'est pas servi, donc aucun nom de salon n'est inventé.</summary>
        private Transform AddEcrinAsh()
        {
            GameObject ecrin = NewUI("EcrinAsh", statusRows);
            ecrin.AddComponent<Image>().color = Opaque(DesignTokens.Current.mapDialogBg);   // TD-612 : (17,19,25) était à 3,32
            var disposition = ecrin.AddComponent<VerticalLayoutGroup>();
            disposition.padding = new RectOffset(16, 16, 16, 16);
            disposition.spacing = 8;
            disposition.childControlWidth = true;
            disposition.childControlHeight = true;
            disposition.childForceExpandWidth = true;
            disposition.childForceExpandHeight = false;
            var ajusteur = ecrin.AddComponent<ContentSizeFitter>();
            ajusteur.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            ajusteur.horizontalFit = ContentSizeFitter.FitMode.Unconstrained;
            AddLayoutElement(ecrin, flexibleHeight: 0);
            return ecrin.transform;
        }

        /// <summary>Vitrine dessinée en primitives UI : socle, cloche et éclats d'Ash. C'est une ambiance, jamais une
        /// jauge supplémentaire ; la pureté reste dite par son mot dans la ligne dédiée.</summary>
        private static void AddVitrineAsh(Transform parent, string purityBand)
        {
            GameObject vitrine = NewUI("VitrineAsh", parent);
            vitrine.AddComponent<Image>().color = Opaque(DesignTokens.Current.hudGaugeFaceOuter);   // TD-612 : (13,16,22) était à 3,61
            AddLayoutElement(vitrine, minHeight: 150, preferredHeight: 150, flexibleHeight: 0);

            GameObject halo = NewUI("Halo", vitrine.transform);
            RectTransform haloRt = (RectTransform)halo.transform;
            haloRt.anchorMin = haloRt.anchorMax = new Vector2(0.5f, 0.5f);
            haloRt.sizeDelta = new Vector2(300, 112);
            haloRt.anchoredPosition = new Vector2(0, 8);
            halo.AddComponent<Image>().color = new Color(0.84f, 0.68f, 0.34f, 0.07f);

            GameObject cloche = NewUI("Cloche", vitrine.transform);
            RectTransform clocheRt = (RectTransform)cloche.transform;
            clocheRt.anchorMin = clocheRt.anchorMax = new Vector2(0.5f, 0.5f);
            clocheRt.sizeDelta = new Vector2(250, 104);
            clocheRt.anchoredPosition = new Vector2(0, 5);
            cloche.AddComponent<Image>().color = new Color(0.78f, 0.88f, 0.94f, 0.10f);

            Color cristal = purityBand == "CRYSTALLINE"
                ? new Color(0.82f, 0.87f, 0.96f, 0.92f)
                : new Color(0.68f, 0.73f, 0.82f, 0.82f);
            float[] angles = { -34f, -19f, -7f, 8f, 22f, 36f };
            float[] hauteurs = { 48f, 68f, 88f, 76f, 61f, 44f };
            for (int i = 0; i < angles.Length; i++)
            {
                GameObject eclat = NewUI("Cristal", vitrine.transform);
                RectTransform rt = (RectTransform)eclat.transform;
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
                rt.sizeDelta = new Vector2(20, hauteurs[i]);
                rt.anchoredPosition = new Vector2((i - 2.5f) * 24f, -8f + hauteurs[i] * 0.20f);
                rt.localRotation = Quaternion.Euler(0, 0, angles[i]);
                eclat.AddComponent<Image>().color = cristal;
            }

            GameObject socle = NewUI("Socle", vitrine.transform);
            RectTransform socleRt = (RectTransform)socle.transform;
            socleRt.anchorMin = socleRt.anchorMax = new Vector2(0.5f, 0.5f);
            socleRt.sizeDelta = new Vector2(286, 10);
            socleRt.anchoredPosition = new Vector2(0, -55);
            socle.AddComponent<Image>().color = new Color32(190, 143, 48, 255);
        }

        /// <summary>Le billet rassemble le tampon et le gain sur papier clair, comme les cadres 92–94. Les deux lignes
        /// gardent leurs noms stables afin que l'accessibilité et les tests fonctionnels lisent exactement la même UI.</summary>
        private void AddBilletRendezVous(Transform parent, AppointmentDto rendezVous)
        {
            GameObject billet = NewUI("BilletRendezVous", parent);
            billet.AddComponent<Image>().color = new Color32(231, 222, 198, 255);
            var disposition = billet.AddComponent<VerticalLayoutGroup>();
            disposition.padding = new RectOffset(14, 14, 12, 12);
            disposition.spacing = 6;
            disposition.childControlWidth = true;
            disposition.childControlHeight = true;
            disposition.childForceExpandWidth = true;
            disposition.childForceExpandHeight = false;
            AddLayoutElement(billet, minHeight: 118, flexibleHeight: 0);

            // Correctif du 24/09 : le surtitre était le LITTÉRAL « RENDEZ-VOUS · DISTRICT DU VERRE », hors Libelle. La table 37 le
            // définit comme « la ligne servie (`building.row.rendez_vous`) + le nom de fiction SERVI du district ». La route
            // du rendez-vous (`AppointmentDto` : appointment_id, status, payout_band) ne sert AUCUN nom de district : on
            // rend donc la ligne servie seule, jamais un nom deviné (dette : le nom servi du lieu de vente). Capitales :
            // TYPOGRAPHIQUES, parce que la maquette ② (cadres 92-94) écrit ce surtitre en capitales.
            TextMeshProUGUI surtitre = NewText("BilletTitre", billet.transform,
                MafiaCleanCity.I18n.Libelle.Gabarit("building.row.rendez_vous", "Rendez-vous"), 11, TextAlignmentOptions.Left);
            surtitre.fontStyle |= FontStyles.UpperCase;
            surtitre.color = new Color32(75, 69, 58, 255);
            surtitre.fontStyle |= FontStyles.Bold;
            surtitre.characterSpacing = 5f;
            AddLayoutElement(surtitre.gameObject, minHeight: 18, flexibleHeight: 0);
            TrackText(surtitre, surtitre.text);

            GameObject tampon = AddStatusRow("rendez_vous", "Rendez-vous", AppointmentStatusLabel(rendezVous.status),
                AppointmentStatusAccent(rendezVous.status), parent: billet.transform);
            GameObject gain = AddEchelle("gain", "Gain", PastillesDuGain(rendezVous.payout_band), PastillesGain,
                PayoutLabel(rendezVous.payout_band), PayoutAccent(rendezVous.payout_band), billet.transform);
            StyliserLigneDuBillet(tampon);
            StyliserLigneDuBillet(gain);
        }

        private static void StyliserLigneDuBillet(GameObject row)
        {
            Image fond = row.GetComponent<Image>();
            if (fond != null) fond.color = new Color(0, 0, 0, 0.035f);
            TextMeshProUGUI label = row.transform.Find("Label")?.GetComponent<TextMeshProUGUI>();
            if (label != null) label.color = new Color32(92, 84, 70, 255);
        }

        private string NewSectionLabel(Transform parent, string text)
        {
            TextMeshProUGUI t = NewText("Section", parent, text, 13, TextAlignmentOptions.Left);
            t.color = DesignTokens.Current.onSurfaceSecondaryAlt;
            t.fontStyle = FontStyles.Bold;
            AddLayoutElement(t.gameObject, minHeight: 20, flexibleHeight: 0);
            return text;
        }

        private Button AddActionButton(Transform parent, string idStable, string label, UnityEngine.Events.UnityAction onClick)
        {
            GameObject btn = NewUI("Action_" + idStable, parent);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.surfaceRaised;
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 34, flexibleHeight: 0);

            TextMeshProUGUI t = NewText("Label", btn.transform, label, 15, TextAlignmentOptions.Center);
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
        public const int MaxRefiningPassesUi = 3; // mirrors the server's production.ash.max_refining_passes default (3).

        /// <summary>② lot 2 — le sélecteur « Passes » du cadre 40 (tranché (e) : 4 crans = le domaine 0..3) : le libellé servi
        /// `building.row.passes`, 4 crans dont `passes + 1` allumés (le premier toujours, comme les échelles du pupitre), le compte dit
        /// par `building.bloc.passes_compte`, et « − » / « + ». Remplace « PASSES DE RAFFINAGE » et « - Refine » / « + Refine » (anglais,
        /// FAUX à l'écart) et les mots « None / Light / Standard / Deep ». `specialized_lab` seulement (tranché (a) : un `lab` Brindle
        /// n'a pas de passes — le serveur refuse tout `refining_passes` non nul, 422).</summary>
        private void AddRefiningPassesSelector(Transform parent)
        {
            GameObject row = NewUI("Row_passes", parent);
            row.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(10, 10, 4, 4);
            hlg.spacing = 8;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 32, flexibleHeight: 0);

            string libelle = Cle("row", "Passes");
            TextMeshProUGUI l = NewText("Label", row.transform, libelle, 15, TextAlignmentOptions.Left);
            l.color = DesignTokens.Current.onSurfaceMuted;
            AddLayoutElement(l.gameObject, minWidth: 80, flexibleWidth: 1);
            TrackText(l, libelle);

            Button minus = AddActionButton(row.transform, "passes_moins", "−", () => SetRefiningPasses(RefiningPasses - 1));
            SetButtonInteractable(minus, RefiningPasses > 0);

            GameObject crans = NewUI("Crans", row.transform);
            HorizontalLayoutGroup ch = crans.AddComponent<HorizontalLayoutGroup>();
            ch.spacing = 4;
            ch.childAlignment = TextAnchor.MiddleCenter;
            ch.childControlWidth = true;
            ch.childControlHeight = true;
            ch.childForceExpandWidth = false;
            ch.childForceExpandHeight = false;
            for (int i = 0; i <= MaxRefiningPassesUi; i++)
            {
                bool allume = i <= RefiningPasses;
                GameObject cran = NewUI(allume ? "CranAllume" : "CranEteint", crans.transform);
                Image img = cran.AddComponent<Image>();
                img.color = allume ? AccentMild : DesignTokens.Current.surfaceRaised;
                img.raycastTarget = false;
                AddLayoutElement(cran, minWidth: 14, preferredWidth: 14, minHeight: 10, preferredHeight: 10);
            }

            Button plus = AddActionButton(row.transform, "passes_plus", "+", () => SetRefiningPasses(RefiningPasses + 1));
            SetButtonInteractable(plus, RefiningPasses < MaxRefiningPassesUi);

            string compte = RefiningPassesLabel(RefiningPasses);
            TextMeshProUGUI v = NewText("Value", row.transform, compte, 15, TextAlignmentOptions.Right);
            v.color = AccentMild;
            v.fontStyle = FontStyles.Bold;
            AddLayoutElement(v.gameObject, minWidth: 90, flexibleWidth: 0);
            TrackText(v, compte);
        }

        /// <summary>② lot 2 — UN geste selon l'état (`GesteSelonLEtat`), tous ses mots par les clés servies de la table 37 :
        ///   Commander  « Commander du {précurseur} » + « il en faut avant de rallumer » (cadre 39) ;
        ///   Allumer    (Ash) la réplique « L'étagère est refaite… » et « Passes », puis « Allumer le feu » (+ « ça consomme un lot de lys de
        ///              verre », Ash seulement : la phrase nomme SON précurseur) (cadre 40) ;
        ///   EnCuisson  AUCUN bouton : « Rien à faire ici. », « Repassez quand ce sera tiré », et la réplique « Ça monte… — et ne me lancez
        ///              pas une deuxième cuve… » : le refus 409 DIT avant, pas un bouton qui échoue (cadre 41) ;
        ///   FaireSortir « Faire sortir la marchandise » GRISÉ + « vers les coursiers » + la réplique « C'est tiré… » (cadre 43) — le geste
        ///              attend sa destination et sa quantité (manque du back n°5) : dessiné, pas vivant.
        /// Les répliques passent par la BULLE du lieutenant (B1, `AddReplique`) : l'archétype servi en tête, SANS article (D13) et sans
        /// nom (les noms attendent la décision de l'user) ; sans lieutenant, aucune réplique. La réplique du cadre 39 (« Nestor : … »,
        /// appro.bloc.nestor_…) attend la décision de l'user sur Nestor.</summary>
        private void AddGesteDuPupitre(BuildingCardDto card)
        {
            bool ash = card.operational_type == "specialized_lab";
            locuteurPose = false;
            bulleLieutenant = null;
            GesteDuPupitre geste = GesteSelonLEtat(CurrentLab?.cook_stage_band, CurrentPrecursors?.stock_band,
                ApprovisionnementDelegue(CurrentTaskCategories));
            GesteDuPupitreAffiche = geste;
            switch (geste)
            {
                case GesteDuPupitre.Commander:
                {
                    string precurseur = CurrentPrecursors.precursor_type;
                    AddActionButton(actionBar, "commander", CommanderLabel(precurseur), () => StartCoroutine(OrderPrecursor(precurseur)));
                    AddLigneDuGeste("Bloc", Cle("bloc", "il en faut avant de rallumer"));
                    break;
                }
                case GesteDuPupitre.ApprovisionnementDelegue:
                    // ② lot 3 (cadre 44) : AUCUN bouton — la commande est au lieutenant ; le joueur sait où reprendre la main. La ligne
                    // « l'approvisionnement · J11 » de la maquette attend la bulle du lieutenant (et « J11 » n'est porté par aucun champ).
                    AddReplique(Cle("replique",
                        "«\u00A0L’approvisionnement, c’est moi maintenant — vous me l’avez confié. Je commande quand il faut.\u00A0»"));
                    AddLigneDuGeste("Bloc", Cle("bloc", "Vous ne passez plus les commandes vous-même."));
                    AddLigneDuGeste("Bloc", Cle("bloc", "Reprendre la main se fait depuis la Famille, pas depuis le labo."));
                    break;
                case GesteDuPupitre.Allumer:
                    if (ash)
                    {
                        AddReplique(Cle("replique", "«\u00A0L’étagère est refaite. Dites-moi combien de passes, et j’allume.\u00A0»"));
                        AddRefiningPassesSelector(actionBar);
                    }
                    AddActionButton(actionBar, "allumer_le_feu", Cle("action", "Allumer le feu"),
                        () => StartCoroutine(ash ? StartCookAsh() : StartCook()));
                    if (ash) AddLigneDuGeste("Bloc", Cle("bloc", "ça consomme un lot de lys de verre"));
                    break;
                case GesteDuPupitre.EnCuisson:
                    AddReplique(Cle("replique", "«\u00A0Ça monte comme il faut. Si j’ouvre maintenant, je perds tout.\u00A0»"));
                    AddReplique(Cle("replique", "— et ne me lancez pas une deuxième cuve tant que celle-là tourne."));
                    AddLigneDuGeste("Bloc", Cle("bloc", "Rien à faire ici."));
                    AddLigneDuGeste("Bloc", Cle("bloc", "Repassez quand ce sera tiré"));
                    break;
                case GesteDuPupitre.FaireSortir:
                {
                    AddReplique(Cle("replique",
                        "«\u00A0C’est tiré. Ça ne peut pas dormir ici — chaque nuit que ça reste, c’est une nuit de trop.\u00A0»"));
                    // ② (f2 26/09) : le bouton était posé ÉTEINT avec un geste vide. Câblé en NAVIGATION vers ㉘ Distribution — l'écran des
                    // coursiers, qui porte l'envoi — par le navigateur du shell (même chemin que la Famille vers ㉚).
                    AddActionButton(actionBar, "faire_sortir_la_marchandise", Cle("action", "Faire sortir la marchandise"), OuvrirLaDistribution);
                    AddLigneDuGeste("Bloc", Cle("bloc", "vers les coursiers"));
                    break;
                }
            }
        }

        private bool locuteurPose;
        private Transform bulleLieutenant;

        /// <summary>② bulle — une réplique du lieutenant : l'archétype du locuteur en tête (une fois par rendu), puis la réplique. Sans
        /// lieutenant connu, RIEN : on ne fait pas parler quelqu'un qui n'est pas là.</summary>
        private void AddReplique(string texte)
        {
            if (CurrentLieutenant == null) return;
            if (!locuteurPose)
            {
                locuteurPose = true;
                GameObject bulle = NewUI("BulleLieutenant", actionBar);
                bulle.AddComponent<Image>().color = new Color32(22, 28, 36, 255);
                var disposition = bulle.AddComponent<VerticalLayoutGroup>();
                disposition.padding = new RectOffset(14, 14, 12, 12);
                disposition.spacing = 7;
                disposition.childControlWidth = true;
                disposition.childControlHeight = true;
                disposition.childForceExpandWidth = true;
                disposition.childForceExpandHeight = false;
                var ajusteur = bulle.AddComponent<ContentSizeFitter>();
                ajusteur.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
                ajusteur.horizontalFit = ContentSizeFitter.FitMode.Unconstrained;
                AddLayoutElement(bulle, flexibleHeight: 0);
                bulleLieutenant = bulle.transform;

                GameObject entete = NewUI("EnTeteLieutenant", bulleLieutenant);
                var ligne = entete.AddComponent<HorizontalLayoutGroup>();
                ligne.spacing = 9;
                ligne.childAlignment = TextAnchor.MiddleLeft;
                ligne.childControlWidth = true;
                ligne.childControlHeight = true;
                ligne.childForceExpandWidth = false;
                ligne.childForceExpandHeight = false;
                AddLayoutElement(entete, minHeight: 30, flexibleHeight: 0);

                Sprite dessinArchetype = MafiaCleanCity.Operational.Lieutenant.ArchetypeIcons.Pour(CurrentLieutenant.archetype);
                if (dessinArchetype != null)
                {
                    GameObject glyphe = NewUI("GlyphArchetype", entete.transform);
                    Image image = glyphe.AddComponent<Image>();
                    image.sprite = dessinArchetype;
                    image.preserveAspect = true;
                    image.color = new Color32(218, 183, 112, 255);
                    image.raycastTarget = false;
                    AddLayoutElement(glyphe, minWidth: 26, preferredWidth: 26, minHeight: 26, preferredHeight: 26, flexibleWidth: 0);
                }

                TextMeshProUGUI qui = NewText("Locuteur", entete.transform,
                    FamilleLabels.Archetype(CurrentLieutenant.archetype), 13, TextAlignmentOptions.Left);
                qui.color = new Color32(218, 183, 112, 255);
                qui.fontStyle = FontStyles.Bold;
                qui.characterSpacing = 4f;
                AddLayoutElement(qui.gameObject, minHeight: 26, flexibleHeight: 0, flexibleWidth: 1);
                TrackText(qui, qui.text);
            }
            AddLigneDuGeste("Replique", texte, bulleLieutenant);
        }

        /// <summary>Une ligne de texte du geste (bloc ou réplique) sous la barre d'actions.</summary>
        private void AddLigneDuGeste(string nom, string texte, Transform parent = null)
        {
            if (parent == null) parent = actionBar;
            TextMeshProUGUI t = NewText(nom, parent, texte, 13, TextAlignmentOptions.Left);
            t.color = DesignTokens.Current.onSurfaceSecondaryAlt;
            if (nom == "Replique")
            {
                t.fontStyle = FontStyles.Italic;
                t.textWrappingMode = TextWrappingModes.Normal;
                t.overflowMode = TextOverflowModes.Overflow;
            }
            AddLayoutElement(t.gameObject, minHeight: nom == "Replique" ? 34 : 18, flexibleHeight: 0);
            TrackText(t, texte);
        }


        // Phase-3 vector #3: the plant selector (choose which growable precursor to cultivate). Three controls on one row:
        //   [< Crop] [<worded crop>] [Crop >]
        // The crop is WORDED (Verdant root / Lull resin / Glass lily) — never a raw id leaks to the player; the selector
        // reads as a qualitative choice. The server enforces the GROWABLE set (a non-growable precursor → 422). Shown only
        // on an idle grow_house (no active grow). More-vs-buy: planting is cheap-but-slow-and-hot vs ordering precursors.
        private void AddPlantSelector(Transform parent)
        {
            string label = NewSectionLabel(parent, "PLANTER — choisir une culture");
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

            AddActionButton(row.transform, "culture_precedente", "‹", () => CyclePrecursor(-1));

            string cropWord = GrowablePrecursorLabel(SelectedPrecursor);
            TextMeshProUGUI cropText = NewText("PlantSelectorValue", row.transform, cropWord, 15, TextAlignmentOptions.Center);
            cropText.color = AccentMild;
            cropText.fontStyle = FontStyles.Bold;
            AddLayoutElement(cropText.gameObject, minWidth: 130, flexibleWidth: 0);
            TrackText(cropText, cropWord);

            AddActionButton(row.transform, "culture_suivante", "›", () => CyclePrecursor(1));
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

            string label = NewSectionLabel(parent, "ENVOYER UN VÉHICULE (soumis au relais)");
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
            Button prev = AddActionButton(row.transform, "vehicule_precedent", "< Vehicle", () => CycleVehicle(-1, unlocked));
            SetButtonInteractable(prev, multi);

            string vehicleWord = VehicleLabel(SelectedVehicle);
            TextMeshProUGUI vehText = NewText("VehicleSelectorValue", row.transform, vehicleWord, 15, TextAlignmentOptions.Center);
            vehText.color = AccentMild;
            vehText.fontStyle = FontStyles.Bold;
            AddLayoutElement(vehText.gameObject, minWidth: 110, flexibleWidth: 0);
            TrackText(vehText, vehicleWord);

            Button next = AddActionButton(row.transform, "vehicule_suivant", "Vehicle >", () => CycleVehicle(1, unlocked));
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

        // Phase-5 vector #5a: the deposit/withdraw amount selector (choose how much clean cash to move). Three controls on
        // one row:  [- Amount] [<worded size band>] [+ Amount]
        // The amount is WORDED as a qualitative SIZE band (Pocket / Small / Medium / Large) — never a raw cents/digit leaks
        // to the player (R2.2). The cents VALUE (TransferAmountCents) travels only in the deposit/withdraw request body. The
        // server is the final authority: the chosen amount may exceed the capacity (deposit 409) or the held (withdraw 409)
        // — the UI does NOT pre-decide; it surfaces the server verdict on the action.
        private void AddTransferAmountSelector(Transform parent)
        {
            string label = NewSectionLabel(parent, "MONTANT DU TRANSFERT — la banque a le dernier mot");
            TrackText(null, label);

            GameObject row = NewUI("TransferAmountRow", parent);
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 8;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = true;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 32, flexibleHeight: 0);

            int idx = System.Array.IndexOf(TransferAmountStepsCents, TransferAmountCents);
            if (idx < 0) idx = 1; // default → "Small" ($10k) if the current value is off-grid (defensive).

            Button minus = AddActionButton(row.transform, "montant_moins", "- Amount", () => CycleTransferAmount(-1));
            SetButtonInteractable(minus, idx > 0);

            string amountWord = TransferAmountLabel(TransferAmountCents);
            TextMeshProUGUI amountText = NewText("TransferAmountValue", row.transform, amountWord, 15, TextAlignmentOptions.Center);
            amountText.color = AccentMild;
            amountText.fontStyle = FontStyles.Bold;
            AddLayoutElement(amountText.gameObject, minWidth: 110, flexibleWidth: 0);
            TrackText(amountText, amountWord);

            Button plus = AddActionButton(row.transform, "montant_plus", "+ Amount", () => CycleTransferAmount(1));
            SetButtonInteractable(plus, idx < TransferAmountStepsCents.Length - 1);
        }

        // Step the selected transfer amount up/down through the four worded size steps (clamped at the ends — no wrap, so the
        // worded extremes read honestly). Re-renders the actions via SetTransferAmount so the worded value updates.
        private void CycleTransferAmount(int delta)
        {
            int idx = System.Array.IndexOf(TransferAmountStepsCents, TransferAmountCents);
            if (idx < 0) idx = 1;
            int next = idx + delta;
            if (next < 0) next = 0;
            if (next > TransferAmountStepsCents.Length - 1) next = TransferAmountStepsCents.Length - 1;
            SetTransferAmount(TransferAmountStepsCents[next]);
        }

        // Disable/enable a button + dim its label so the unaffordable state is visible (and a11y: the disabled
        // state is conveyed by the dimmed label text + the separate reason line, not colour alone — F2).
        private static void SetButtonInteractable(Button button, bool interactable)
        {
            if (button == null) return;
            button.interactable = interactable;
            TextMeshProUGUI label = button.GetComponentInChildren<TextMeshProUGUI>();
            if (label != null && !interactable)
                label.color = DesignTokens.Current.buildingCardHintDim; // dimmed → "can't do this now"
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

        private void TrackText(TextMeshProUGUI comp, string text)
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

        private TextMeshProUGUI NewText(string name, Transform parent, string value, int size, TextAlignmentOptions anchor)
        {
            GameObject go = NewUI(name, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = TextPrimary;
            t.textWrappingMode = TextWrappingModes.NoWrap;
            t.overflowMode = TextOverflowModes.Truncate;
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
