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
        /// <summary>The full set of text shown to the player (labels + values) — used by the
        /// E2E to prove no raw scalar leaks client-side.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        public string BuildingId { get => buildingId; set => buildingId = value; }

        private readonly List<string> renderedTexts = new List<string>();
        private readonly List<Text> textComponents = new List<Text>();

        private Font font;
        private RectTransform cardContent;
        private Text titleText;
        private Text typeText;
        private RectTransform statusRows;
        private RectTransform actionBar;
        private Text actionStatusText;

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

            if (CurrentCard == null)
            {
                Debug.LogError($"[BuildingCard] load failed: {CardError}");
                RenderError();
                yield break;
            }

            CardLoaded = true;
            Render(CurrentCard);
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

        private IEnumerator RunAction(System.Func<System.Action<ActionOutcome>, IEnumerator> call,
            string okPrefix, string errPrefix)
        {
            ActionOutcome outcome = null;
            yield return call(o => outcome = o);
            LastActionOutcome = outcome;

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

            switch (card.operational_type)
            {
                case "lab":
                    AddActionButton(actionBar, "Order Pyralin", () => StartCoroutine(OrderPyralin()));
                    AddActionButton(actionBar, "Start Cook", () => StartCoroutine(StartCook()));
                    break;
                case "front_shop":
                    // Inject needs a safehouse target — wired by the caller/test via Inject(safehouseId, amount).
                    AddActionButton(actionBar, "Inject (launder)", () => { /* needs safehouse target; driven via Inject() */ });
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
            cardRt.sizeDelta = new Vector2(520, 460);
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

        private void AddActionButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick)
        {
            GameObject btn = NewUI("Action_" + label.Replace(" ", ""), parent);
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
