using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer) + WorldApiClient/DistrictHeatDto (heat) + CityMapController (nav)

namespace MafiaCleanCity.Operational
{
    // Drives the Home Dashboard screen (screen_1) — the cold-open landing screen and the
    // "encaisser" payoff of the M1 loop. It:
    //   1. signs in (POST /auth/v1/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
    //   2. fetches the HEADLINE wallet band  GET /v1/economy/wallet  (BROKE | LOW | MODERATE |
    //      HIGH | FLUSH) — the qualitative cash band, the loop's payoff;
    //   3. fetches the CITYWIDE heat band  GET /v1/city/district/:id/heat  (REUSE
    //      CityMap.WorldApiClient + DistrictHeatDto — the same client the City Map consumes)
    //      and renders citywide_bucket (COLD | WARM | HOT | BURNING) + the escalated flag;
    //   4. derives a minimal ALERTS line strictly from the projections it already fetched
    //      (heat escalating / citywide heat hot+ ) — it NEVER fabricates an alert from data it
    //      does not hold;
    //   5. offers NAV affordances (City Map / Building Card / Pipeline) — each nav button opens
    //      the target controller (they all self-build their Canvas in the same project).
    //
    // R2.2 / P5: every projection leaf the player sees is a qualitative band STRING or a
    // BOOLEAN — this screen renders exactly those; it NEVER shows a raw scalar (cents / heat
    // float / ticks). a11y F2: every status line carries a text label AND a shape glyph (not
    // colour alone), mirroring the Building Card / Laundering band rows + the CityMap heat badge.
    //
    // The whole UI is built programmatically from a single Canvas (mirrors
    // BuildingCardController / LaunderingController / CityMapController) so a scene needs almost
    // no manual wiring.
    //
    // M1 scope note (honest deferral): the full screen_1 design (the HighestLeverageCard +
    // [Consider]/[Commit]/[Skip], the top-3 ExceptionQueuePanel with inline actions, the
    // 4-bar OrgVitalsPanel heat/cohesion/friction/stress, the ContextualBanner Compression-Week,
    // the ShortcutBar, the rich KPI tiles + decision feed) is intentionally NOT built here —
    // those depend on the core_loops.* endpoints (one_decision / exception_queue) that are not
    // part of the M1 backend. This controller renders the M1-live surface faithfully — the
    // wallet band headline, the citywide heat band + escalation, a heat-derived alerts line,
    // and the cross-screen nav — and defers the rest.
    public class DashboardController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        [Header("Citywide heat probe")]
        [Tooltip("Any district id 1..18 returns the same citywide_bucket; we probe the operational district (16 Verge).")]
        [SerializeField] private int heatProbeDistrictId = 16;

        // ---- Public state (test hooks) ---------------------------------------
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool DashboardLoaded { get; private set; }
        public string WalletError { get; private set; }
        public string HeatError { get; private set; }
        public WalletDto CurrentWallet { get; private set; }
        public DistrictHeatDto CurrentHeat { get; private set; }
        public MeDto CurrentMe { get; private set; }

        /// <summary>The full set of text shown to the player (labels + values) — used by the
        /// E2E to prove no raw scalar leaks client-side.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        /// <summary>The most-recently opened nav target (test hook). NONE until a nav button fires.</summary>
        public NavTarget LastNavTarget { get; private set; } = NavTarget.None;
        /// <summary>The GameObject of the controller the last nav button opened (test hook for "clicking opens the target").</summary>
        public GameObject LastNavGameObject { get; private set; }

        public enum NavTarget { None, CityMap, BuildingCard, Pipeline }

        private readonly List<string> renderedTexts = new List<string>();

        private Font font;
        private Text walletGlyphText;
        private Text walletBandText;
        private Text walletCaptionText;
        private Text headerText;
        private RectTransform statusRows;
        private Text alertsText;
        private RectTransform navBar;

        private AuthClient auth;
        private DashboardClient client;
        private WorldApiClient world; // REUSE — citywide heat (GET /v1/city/district/:id/heat)

        // Slate palette (mirrors BuildingCard / Laundering / global_conventions_core direction).
        private static readonly Color SurfaceBg = new Color(0.051f, 0.059f, 0.063f);   // #0d0f10 (screen_1 ardoise)
        private static readonly Color CardBg = new Color(0.086f, 0.098f, 0.106f);      // #16191b
        private static readonly Color RowBg = new Color(0.137f, 0.165f, 0.176f);       // #232a2d
        private static readonly Color TextPrimary = new Color(0.933f, 0.945f, 0.949f); // #eef1f2
        private static readonly Color TextSecondary = new Color(0.541f, 0.592f, 0.612f); // #8a979c
        private static readonly Color AccentMild = new Color(0.263f, 0.878f, 0.753f);   // #43e0c0 teal
        private static readonly Color AccentModerate = new Color(1f, 0.62f, 0.239f);    // #ff9e3d amber
        private static readonly Color AccentSevere = new Color(1f, 0.353f, 0.302f);     // #ff5a4d red
        private static readonly Color CtaColor = new Color(1f, 0.824f, 0.247f);         // #ffd23f yellow

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        // Lazily build clients + the UI so the controller is safe to drive (SignIn / Load) before
        // Start() has run — e.g. an E2E that calls SignIn() in the same frame as AddComponent.
        // Idempotent.
        private bool initialized;
        // Guards LoadDashboard re-entrancy (the self-started Boot() load racing an external test-driven load —
        // see the note in LoadDashboard). Cleared at every LoadDashboard exit.
        private bool isLoading;
        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new DashboardClient { BaseUrl = baseUrl };
            world = new WorldApiClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        private IEnumerator Boot()
        {
            yield return SignIn();
            if (!IsAuthenticated) yield break;
            yield return LoadDashboard();
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
                Debug.LogError($"[Dashboard] auth failed: {AuthError}");
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

        /// <summary>Fetch + render the dashboard: wallet band (headline), citywide heat band +
        /// escalation, the optional /v1/me header, then the derived alerts line.</summary>
        public IEnumerator LoadDashboard()
        {
            EnsureInitialized();

            // Re-entrancy guard. Start() fires StartCoroutine(Boot()) which ALSO calls LoadDashboard(),
            // so the controller can be loading itself at the same time an external caller (a PlayMode E2E
            // that drives `yield return controller.LoadDashboard()` on its OWN runner object) drives a load.
            // Both share the mutable projection fields (CurrentWallet / WalletError / …): if the self-Boot
            // load resets CurrentWallet=null + WalletError=null between the external load's GET completing
            // (CurrentWallet set) and its null-check, the external load spuriously sees CurrentWallet==null
            // with an empty WalletError → "[Dashboard] wallet load failed: " (an intermittent ~1/3 flake).
            // Serialize the two: if a load is already in flight, WAIT for it to finish (so this call still
            // returns with a completed, consistent load — DashboardLoaded set — rather than clobbering it),
            // then return without re-fetching. Never no-op immediately (that could leave the caller asserting
            // DashboardLoaded before the in-flight load set it).
            if (isLoading)
            {
                while (isLoading && this != null) yield return null;
                yield break;
            }
            isLoading = true;

            DashboardLoaded = false;
            WalletError = null;
            HeatError = null;
            CurrentWallet = null;
            CurrentHeat = null;

            // 1) headline wallet band.
            yield return client.GetWallet(Token,
                dto => CurrentWallet = dto,
                (code, msg) => WalletError = $"{code}: {msg}");

            // 2) optional /v1/me header (best-effort — a header miss never fails the dashboard).
            yield return client.GetMe(Token,
                dto => CurrentMe = dto,
                (code, msg) => { /* header is optional; ignore */ });

            // 3) citywide heat band + escalation (REUSE WorldApiClient — same client the City Map uses).
            yield return world.GetDistrictHeat(heatProbeDistrictId, Token,
                heat => CurrentHeat = heat,
                err => HeatError = err);

            // The GETs above are network round-trips; the controller's GameObject may have been torn down
            // by an inter-fixture teardown while we awaited them. Bail before touching any UI (Unity's
            // overloaded == reports a destroyed MonoBehaviour as null) — a continuation that wakes up on a
            // dead object must no-op, not dereference a destroyed serialized Text → NullReferenceException.
            if (this == null) { isLoading = false; yield break; }

            if (CurrentWallet == null)
            {
                Debug.LogError($"[Dashboard] wallet load failed: {WalletError}");
                RenderError();
                isLoading = false;
                yield break;
            }

            DashboardLoaded = true;
            Render();
            isLoading = false;
        }

        // ----------------------------------------------------------- nav API

        /// <summary>Open the City Map screen (REUSE CityMapController — it self-builds its Canvas).</summary>
        public void OpenCityMap() => OpenNav(NavTarget.CityMap);
        /// <summary>Open the Building Card screen (REUSE BuildingCardController).</summary>
        public void OpenBuildingCard() => OpenNav(NavTarget.BuildingCard);
        /// <summary>Open the Laundering Pipeline screen (REUSE LaunderingController).</summary>
        public void OpenPipeline() => OpenNav(NavTarget.Pipeline);

        // Open the target controller. Each target is a MonoBehaviour in this project that builds
        // its own Canvas on Start(); a nav button creates a host GameObject + adds the component.
        // We record the target + its GameObject as test hooks (proving the affordance is wired).
        private void OpenNav(NavTarget target)
        {
            LastNavTarget = target;
            GameObject host = new GameObject($"Nav_{target}");
            switch (target)
            {
                case NavTarget.CityMap: host.AddComponent<CityMapController>(); break;
                case NavTarget.BuildingCard: host.AddComponent<BuildingCardController>(); break;
                case NavTarget.Pipeline: host.AddComponent<LaunderingController>(); break;
            }
            LastNavGameObject = host;
        }

        // --------------------------------------------------------------- render

        private void Render()
        {
            ClearRows();

            // Optional header: handle (callsign) — identity only, never cash (R2.2).
            headerText.text = CurrentMe != null && !string.IsNullOrEmpty(CurrentMe.handle)
                ? $"Boss {CurrentMe.handle}"
                : "Boss";
            TrackText(headerText, headerText.text);

            // ---- HEADLINE: the wallet band (the "encaisser" payoff). Large glyph + band label
            //      + a caption — text+icon, never colour-only (F2). NEVER a raw cents figure (R2.2).
            string band = CurrentWallet.wallet_band;
            Color wAccent = WalletAccent(band);
            walletGlyphText.text = WalletGlyph(band);
            walletGlyphText.color = wAccent;
            walletBandText.text = WalletLabel(band);
            walletBandText.color = wAccent;
            walletCaptionText.text = "Wallet";
            TrackText(walletGlyphText, walletGlyphText.text);
            TrackText(walletBandText, walletBandText.text);
            TrackText(walletCaptionText, walletCaptionText.text);

            // ---- Citywide heat band + escalation flag (REUSE the heat projection).
            if (CurrentHeat != null)
            {
                AddStatusRow("Citywide heat", HeatLabel(CurrentHeat.citywide_bucket),
                    HeatGlyph(CurrentHeat.citywide_bucket), HeatAccent(CurrentHeat.citywide_bucket));
                AddStatusRow("Escalation", CurrentHeat.escalated ? "Escalating" : "Steady",
                    CurrentHeat.escalated ? "[!]" : "[=]",
                    CurrentHeat.escalated ? AccentSevere : AccentMild);
            }
            else
            {
                // Heat is JWT-gated + tick-gated; if it isn't available, say so honestly (no fabrication).
                AddStatusRow("Citywide heat", "Unavailable", "[?]", TextSecondary);
            }

            // ---- Minimal alerts line — derived STRICTLY from the projections we fetched. No fabrication.
            BuildAlerts();

            // ---- Nav affordances.
            BuildNav();
        }

        private void RenderError()
        {
            ClearRows();
            headerText.text = "Boss";
            walletGlyphText.text = "[?]";
            walletGlyphText.color = TextSecondary;
            walletBandText.text = "Wallet unavailable";
            walletBandText.color = TextSecondary;
            walletCaptionText.text = "Check the seeder + stack.";
            TrackText(headerText, headerText.text);
            TrackText(walletGlyphText, walletGlyphText.text);
            TrackText(walletBandText, walletBandText.text);
            TrackText(walletCaptionText, walletCaptionText.text);
            BuildNav();
        }

        // Build a minimal alerts line strictly from the heat projection we already hold.
        // Honest deferral: the full screen_1 ExceptionQueue (audit pins per front-shop, lieutenant
        // suggestions, seam disputes) needs the core_loops.* endpoints — not part of M1. We surface
        // only what the live heat projection exposes: escalation + a hot/burning citywide band.
        private void BuildAlerts()
        {
            var notes = new List<string>();
            if (CurrentHeat != null)
            {
                if (CurrentHeat.escalated) notes.Add("Heat escalating citywide");
                string cb = CurrentHeat.citywide_bucket;
                if (cb == "BURNING") notes.Add("Citywide heat BURNING");
                else if (cb == "HOT") notes.Add("Citywide heat HOT");
            }

            string line = notes.Count > 0 ? string.Join("  •  ", notes) : "No active alerts";
            Color accent = notes.Count > 0 ? AccentSevere : AccentMild;
            string glyph = notes.Count > 0 ? "[!]" : "[ok]";

            string label = NewSectionLabel(statusRows, "ALERTS");
            TrackText(null, label);
            AddStatusRow("Alerts", line, glyph, accent);
        }

        private void BuildNav()
        {
            for (int i = navBar.childCount - 1; i >= 0; i--)
                Object.Destroy(navBar.GetChild(i).gameObject);

            string label = NewSectionLabel(navBar, "GO TO");
            TrackText(null, label);

            AddNavButton(navBar, "City Map", OpenCityMap);
            AddNavButton(navBar, "Building Card", OpenBuildingCard);
            AddNavButton(navBar, "Pipeline", OpenPipeline);
        }

        // ----------------------------------------------------- band → label/glyph

        // Wallet band (BROKE | LOW | MODERATE | HIGH | FLUSH). The glyph is a coin-stack ramp
        // (a11y: shape conveys the band independent of colour).
        private static string WalletLabel(string b)
        {
            switch (b)
            {
                case "FLUSH": return "Flush";
                case "HIGH": return "High";
                case "MODERATE": return "Moderate";
                case "LOW": return "Low";
                case "BROKE": return "Broke";
                default: return b;
            }
        }
        private static string WalletGlyph(string b)
        {
            switch (b)
            {
                case "FLUSH": return "[$$$$]";
                case "HIGH": return "[$$$.]";
                case "MODERATE": return "[$$..]";
                case "LOW": return "[$...]";
                case "BROKE": return "[....]";
                default: return "[????]";
            }
        }
        private static Color WalletAccent(string b)
        {
            switch (b)
            {
                case "FLUSH": return AccentMild;
                case "HIGH": return AccentMild;
                case "MODERATE": return AccentModerate;
                case "LOW": return AccentModerate;
                case "BROKE": return AccentSevere;
                default: return TextSecondary;
            }
        }

        // Citywide heat band (COLD | WARM | HOT | BURNING). The glyph is a fill-ramp.
        private static string HeatLabel(string b)
        {
            switch (b)
            {
                case "COLD": return "Cold";
                case "WARM": return "Warm";
                case "HOT": return "Hot";
                case "BURNING": return "Burning";
                default: return string.IsNullOrEmpty(b) ? "Unknown" : b;
            }
        }
        private static string HeatGlyph(string b)
        {
            switch (b)
            {
                case "COLD": return "[#...]";
                case "WARM": return "[##..]";
                case "HOT": return "[###.]";
                case "BURNING": return "[####]";
                default: return "[....]";
            }
        }
        private static Color HeatAccent(string b)
        {
            switch (b)
            {
                case "COLD": return AccentMild;
                case "WARM": return AccentModerate;
                case "HOT": return AccentSevere;
                case "BURNING": return AccentSevere;
                default: return TextSecondary;
            }
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

            // Full-screen ardoise backdrop (screen_1 is the cold-open landing screen).
            GameObject backdrop = NewUI("DashboardBackdrop", canvas.transform);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = SurfaceBg;

            // The dashboard card, anchored top-centre (portrait landing column).
            GameObject card = NewUI("DashboardSheet", canvas.transform);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 1f);
            cardRt.anchorMax = new Vector2(0.5f, 1f);
            cardRt.pivot = new Vector2(0.5f, 1f);
            cardRt.sizeDelta = new Vector2(560, 560);
            cardRt.anchoredPosition = new Vector2(0, -28);
            card.AddComponent<Image>().color = CardBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(20, 20, 18, 18);
            vlg.spacing = 12;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            // Header (handle / callsign — identity only).
            headerText = NewText("Header", card.transform, "Boss", 16, TextAnchor.MiddleLeft);
            headerText.color = TextSecondary;
            AddLayoutElement(headerText.gameObject, minHeight: 22, flexibleHeight: 0);

            Text title = NewText("Title", card.transform, "HOME", 24, TextAnchor.MiddleLeft);
            title.fontStyle = FontStyle.Bold;
            AddLayoutElement(title.gameObject, minHeight: 32, flexibleHeight: 0);
            TrackText(title, title.text);

            // ---- HEADLINE wallet block: a big glyph + band label, with a caption beneath.
            GameObject walletBlock = NewUI("WalletHeadline", card.transform);
            walletBlock.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup whlg = walletBlock.AddComponent<HorizontalLayoutGroup>();
            whlg.padding = new RectOffset(16, 16, 12, 12);
            whlg.spacing = 14;
            whlg.childAlignment = TextAnchor.MiddleLeft;
            whlg.childControlWidth = true;
            whlg.childControlHeight = true;
            whlg.childForceExpandWidth = false;
            whlg.childForceExpandHeight = true;
            AddLayoutElement(walletBlock, minHeight: 78, flexibleHeight: 0);

            walletGlyphText = NewText("WalletGlyph", walletBlock.transform, "[....]", 30, TextAnchor.MiddleCenter);
            walletGlyphText.fontStyle = FontStyle.Bold;
            AddLayoutElement(walletGlyphText.gameObject, minWidth: 150, preferredWidth: 150, flexibleWidth: 0);

            GameObject walletText = NewUI("WalletText", walletBlock.transform);
            VerticalLayoutGroup wtv = walletText.AddComponent<VerticalLayoutGroup>();
            wtv.spacing = 2;
            wtv.childControlWidth = true;
            wtv.childControlHeight = true;
            wtv.childForceExpandWidth = true;
            wtv.childForceExpandHeight = false;
            AddLayoutElement(walletText, flexibleWidth: 1);

            walletCaptionText = NewText("WalletCaption", walletText.transform, "Wallet", 14, TextAnchor.LowerLeft);
            walletCaptionText.color = TextSecondary;
            AddLayoutElement(walletCaptionText.gameObject, minHeight: 18, flexibleHeight: 0);

            walletBandText = NewText("WalletBand", walletText.transform, "—", 30, TextAnchor.UpperLeft);
            walletBandText.fontStyle = FontStyle.Bold;
            AddLayoutElement(walletBandText.gameObject, minHeight: 40, flexibleHeight: 0);

            // Status rows (citywide heat + escalation + alerts) live here.
            GameObject rows = NewUI("StatusRows", card.transform);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 6;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            statusRows = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 0);

            // Nav bar (City Map / Building Card / Pipeline).
            GameObject nav = NewUI("NavBar", card.transform);
            VerticalLayoutGroup nvlg = nav.AddComponent<VerticalLayoutGroup>();
            nvlg.spacing = 6;
            nvlg.childControlWidth = true;
            nvlg.childControlHeight = true;
            nvlg.childForceExpandWidth = true;
            nvlg.childForceExpandHeight = false;
            navBar = (RectTransform)nav.transform;
            AddLayoutElement(nav, flexibleHeight: 1);
        }

        private void AddStatusRow(string label, string value, string glyph, Color accent)
        {
            GameObject row = NewUI("Row_" + label.Replace(" ", ""), statusRows);
            row.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(10, 10, 6, 6);
            hlg.spacing = 10;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 32, flexibleHeight: 0);

            // Glyph (shape — a11y: colour is never the sole differentiator).
            Text g = NewText("Glyph", row.transform, glyph, 16, TextAnchor.MiddleCenter);
            g.color = accent;
            g.fontStyle = FontStyle.Bold;
            AddLayoutElement(g.gameObject, minWidth: 60, preferredWidth: 60, flexibleWidth: 0);

            Text l = NewText("Label", row.transform, label, 15, TextAnchor.MiddleLeft);
            l.color = TextSecondary;
            AddLayoutElement(l.gameObject, minWidth: 130, flexibleWidth: 0);

            Text v = NewText("Value", row.transform, value, 16, TextAnchor.MiddleLeft);
            v.color = accent;
            v.fontStyle = FontStyle.Bold;
            AddLayoutElement(v.gameObject, minWidth: 180, flexibleWidth: 1);

            TrackText(g, glyph);
            TrackText(l, label);
            TrackText(v, value);
        }

        private string NewSectionLabel(Transform parent, string text)
        {
            Text t = NewText("Section", parent, text, 13, TextAnchor.MiddleLeft);
            t.color = new Color(0.45f, 0.49f, 0.53f);
            t.fontStyle = FontStyle.Bold;
            AddLayoutElement(t.gameObject, minHeight: 20, flexibleHeight: 0);
            return text;
        }

        private void AddNavButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick)
        {
            GameObject btn = NewUI("Nav_" + label.Replace(" ", ""), parent);
            Image img = btn.AddComponent<Image>();
            img.color = new Color(0.16f, 0.18f, 0.22f);
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0); // ≥ 44 dp tap target (F2)

            Text t = NewText("Label", btn.transform, label, 15, TextAnchor.MiddleCenter);
            t.color = CtaColor;
            Stretch((RectTransform)t.transform, new Vector2(10, 2), new Vector2(-10, -2));
            TrackText(t, label);
        }

        // --------------------------------------------------------------- helpers

        private void ClearRows()
        {
            renderedTexts.Clear();
            if (statusRows != null)
                for (int i = statusRows.childCount - 1; i >= 0; i--)
                    Object.Destroy(statusRows.GetChild(i).gameObject);
        }

        private void TrackText(Text comp, string text)
        {
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
