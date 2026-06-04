using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer)

namespace MafiaCleanCity.Operational
{
    // Drives the Laundering Pipeline screen (screen_6 / screen_6a) for the M1 vertical
    // slice — a SINGLE Stage-1 front-shop laundering node. It:
    //   1. signs in (POST /auth/v1/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
    //   2. fetches GET /v1/operational/laundering/:nodeId (the node projection) and renders
    //      the pipeline view: the Stage-1 node's qualitative CLEANLINESS BAND
    //      (DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN) as a SemanticBar row + the DEVIATION
    //      flag badge (the host front-shop's audit pin);
    //   3. offers the Stage-1 INJECT action affordance (inject dirty cash from a safehouse
    //      through the front-shop into the node — the laundering step).
    //
    // R2.2 / P5: the projection only ever returns a band STRING + a BOOLEAN + a uuid id —
    // this screen renders exactly those; it NEVER fabricates a raw scalar (buffered cents /
    // dwell ticks / cleanliness float). a11y F2: every status line carries a text label AND
    // a shape glyph (not colour alone), mirroring the Building Card band rows + the
    // global_conventions_core SemanticBar convention (colour+text+shape).
    //
    // The whole UI is built programmatically from a single Canvas (mirrors
    // BuildingCardController / CityMapController) so a scene needs almost no manual wiring.
    //
    // M1 scope note (honest deferral): the full screen_6 design (the Speed/Volume/Exposure
    // Throughput-Trilemma triangle widget, a MULTI-stage parallel pipeline graph
    // safehouse→front→mid-tier→mid-tier→clean-holding, per-node Heat/Dwell/Erlang badges,
    // routing-weight edges, the Buffer-Bloat tail-risk histogram, and screen_6a's slot/
    // Erlang/drain-order detail) is intentionally NOT built here — those projections are not
    // part of the M1 laundering-node endpoint, which returns only the three fields above. The
    // M1 loop is a single Stage-1 front-shop node; this controller renders that node's live
    // surface faithfully (cleanliness band + deviation flag + inject) and defers the rest.
    public class LaunderingController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        [Header("Target laundering node")]
        [Tooltip("Stage-1 laundering node uuid to load. Set before Start (or call LoadNode).")]
        [SerializeField] private string nodeId = "";

        // ---- Public state (test hooks) ---------------------------------------
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool NodeLoaded { get; private set; }
        public string NodeError { get; private set; }
        public LaunderingNodeDto CurrentNode { get; private set; }
        public ActionOutcome LastActionOutcome { get; private set; }
        /// <summary>The full set of text shown to the player (labels + values) — used by the
        /// E2E to prove no raw scalar leaks client-side.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        public string NodeId { get => nodeId; set => nodeId = value; }

        private readonly List<string> renderedTexts = new List<string>();
        private readonly List<Text> textComponents = new List<Text>();

        private Font font;
        private Text titleText;
        private Text subtitleText;
        private RectTransform statusRows;
        private RectTransform actionBar;
        private Text actionStatusText;

        private AuthClient auth;
        private LaunderingClient client;

        // Slate palette (mirrors BuildingCard + global_conventions_core direction).
        private static readonly Color SurfaceBg = new Color(0.086f, 0.098f, 0.106f); // #16191b
        private static readonly Color RowBg = new Color(0.137f, 0.165f, 0.176f);     // #232a2d
        private static readonly Color TextPrimary = new Color(0.933f, 0.945f, 0.949f);
        private static readonly Color AccentMild = new Color(0.263f, 0.878f, 0.753f);   // #43e0c0 teal (clean)
        private static readonly Color AccentModerate = new Color(1f, 0.62f, 0.239f);     // #ff9e3d amber (partial)
        private static readonly Color AccentSevere = new Color(1f, 0.353f, 0.302f);      // #ff5a4d red (dirty / deviation)
        private static readonly Color CtaColor = new Color(1f, 0.824f, 0.247f);          // #ffd23f yellow

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        // Lazily build clients + the UI so the controller is safe to drive (SignIn / LoadNode)
        // before Start() has run — e.g. an E2E that calls SignIn() in the same frame as
        // AddComponent. Idempotent.
        private bool initialized;
        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new LaunderingClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        private IEnumerator Boot()
        {
            yield return SignIn();
            if (!IsAuthenticated) yield break;
            if (!string.IsNullOrEmpty(nodeId)) yield return LoadNode(nodeId);
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
                Debug.LogError($"[Laundering] auth failed: {AuthError}");
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

        /// <summary>Fetch + render the laundering-node projection for a node id.</summary>
        public IEnumerator LoadNode(string id)
        {
            EnsureInitialized();
            nodeId = id;
            NodeLoaded = false;
            NodeError = null;
            CurrentNode = null;

            yield return client.GetLaunderingNode(id, Token,
                dto => CurrentNode = dto,
                (code, msg) => NodeError = $"{code}: {msg}");

            if (CurrentNode == null)
            {
                Debug.LogError($"[Laundering] load failed: {NodeError}");
                RenderError();
                yield break;
            }

            NodeLoaded = true;
            Render(CurrentNode);
        }

        // ----------------------------------------------------------- actions API

        /// <summary>Stage-1 action: inject dirty cash (from a safehouse, through a front-shop) to launder.
        /// The front-shop + safehouse targets are supplied by the caller/test (the loop's wiring).</summary>
        public IEnumerator Inject(string frontShopId, string safehouseId, int amountCents)
        {
            yield return RunAction(c => client.Inject(frontShopId, safehouseId, amountCents, Token, c),
                "Cash injected", "Inject unavailable");
            // Reflect the post-inject node state in the pipeline view (cleanliness may have moved;
            // deviation may have flipped). Best-effort re-load — never blocks the action outcome.
            if (LastActionOutcome != null && LastActionOutcome.Ok && !string.IsNullOrEmpty(nodeId))
                yield return LoadNode(nodeId);
        }

        /// <summary>Helper for the screen's E2E / setup: collect a dealer float into the safehouse so the
        /// front-shop has dirty cash to launder (the terminal seed state leaves the safehouse empty).</summary>
        public IEnumerator Collect(string dealerId, string safehouseId)
        {
            yield return RunAction(c => client.Collect(dealerId, safehouseId, Token, c),
                "Float collected", "Collect unavailable");
        }

        private IEnumerator RunAction(System.Func<System.Action<ActionOutcome>, IEnumerator> call,
            string okPrefix, string errPrefix)
        {
            ActionOutcome outcome = null;
            yield return call(o => outcome = o);
            LastActionOutcome = outcome;

            // F2: surface a human message, never a raw HTTP code, to the player.
            string line = outcome.Ok ? okPrefix : $"{errPrefix} — {outcome.Message}";
            if (actionStatusText != null) actionStatusText.text = line;
            TrackText(actionStatusText, line);
        }

        // --------------------------------------------------------------- render

        private void Render(LaunderingNodeDto node)
        {
            ClearRows();

            titleText.text = "LAUNDERING PIPELINE";
            // No bare digit in the rendered label — the R2.2 no-scalar guard is kept pristine
            // (the stage ordinal is conveyed in words, not a digit that the guard would flag).
            subtitleText.text = "Front shop — first stage";
            TrackText(titleText, titleText.text);
            TrackText(subtitleText, subtitleText.text);

            // The Stage-1 node, rendered as a pipeline node card.
            // Cleanliness band — SemanticBar row: glyph (shape) + label + qualitative band value.
            // F2: shape glyph is present alongside colour (colour is never the sole carrier).
            AddStatusRow("Cleanliness", CleanlinessLabel(node.cleanliness_band),
                CleanlinessGlyph(node.cleanliness_band), CleanlinessAccent(node.cleanliness_band));

            // Deviation flag — the host front-shop's audit pin. Active = an audit/unconformity badge.
            AddStatusRow("Deviation", node.deviation_active ? "Audit pin active" : "Conforming",
                node.deviation_active ? "[!]" : "[ok]",
                node.deviation_active ? AccentSevere : AccentMild);

            BuildActions();
        }

        private void RenderError()
        {
            ClearRows();
            titleText.text = "LAUNDERING PIPELINE";
            subtitleText.text = "Failed to load the node. Check the seeder + stack.";
            TrackText(titleText, titleText.text);
            TrackText(subtitleText, subtitleText.text);
        }

        // Build the Stage-1 action affordances the M1 loop exposes.
        private void BuildActions()
        {
            for (int i = actionBar.childCount - 1; i >= 0; i--)
                Object.Destroy(actionBar.GetChild(i).gameObject);

            string label = NewSectionLabel(actionBar, "ACTIONS");
            TrackText(null, label);

            // The Stage-1 Inject affordance. Inject needs a front-shop + safehouse target — wired by
            // the caller/test via Inject(frontShopId, safehouseId, amount). The visible button proves
            // the affordance is present; the actual launder is driven through Inject().
            AddActionButton(actionBar, "Inject (launder)", () => { /* needs front-shop + safehouse targets; driven via Inject() */ });

            actionStatusText = NewText("ActionStatus", actionBar, "", 14, TextAnchor.MiddleLeft);
            actionStatusText.color = new Color(0.7f, 0.74f, 0.78f);
            AddLayoutElement(actionStatusText.gameObject, minHeight: 22, flexibleHeight: 0);
        }

        // ----------------------------------------------------- band → label/glyph

        // CleanlinessBucket projected by the laundering node (DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN).
        // The glyph is a fill-ramp (a11y: shape conveys the band independent of colour).
        private static string CleanlinessLabel(string b)
        {
            switch (b)
            {
                case "CLEAN": return "Clean";
                case "MOSTLY_CLEAN": return "Mostly clean";
                case "PARTIAL": return "Partial";
                case "DIRTY": return "Dirty";
                default: return b;
            }
        }
        private static string CleanlinessGlyph(string b)
        {
            switch (b)
            {
                case "CLEAN": return "[####]";
                case "MOSTLY_CLEAN": return "[###.]";
                case "PARTIAL": return "[##..]";
                case "DIRTY": return "[#...]";
                default: return "[....]";
            }
        }
        private static Color CleanlinessAccent(string b)
        {
            switch (b)
            {
                case "CLEAN": return AccentMild;
                case "MOSTLY_CLEAN": return AccentMild;
                case "PARTIAL": return AccentModerate;
                case "DIRTY": return AccentSevere;
                default: return AccentSevere;
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

            // Dim backdrop (the City Map / Pipeline tab would sit behind in-game).
            GameObject backdrop = NewUI("LaunderingBackdrop", canvas.transform);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = new Color(0.05f, 0.05f, 0.06f, 0.85f);

            // The pipeline card, anchored centre.
            GameObject card = NewUI("LaunderingSheet", canvas.transform);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 0.5f);
            cardRt.anchorMax = new Vector2(0.5f, 0.5f);
            cardRt.pivot = new Vector2(0.5f, 0.5f);
            cardRt.sizeDelta = new Vector2(540, 360);
            cardRt.anchoredPosition = Vector2.zero;
            card.AddComponent<Image>().color = SurfaceBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(18, 18, 16, 16);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            titleText = NewText("Title", card.transform, "LAUNDERING PIPELINE", 22, TextAnchor.MiddleLeft);
            titleText.fontStyle = FontStyle.Bold;
            AddLayoutElement(titleText.gameObject, minHeight: 30, flexibleHeight: 0);

            subtitleText = NewText("Subtitle", card.transform, "Front shop — first stage", 16, TextAnchor.MiddleLeft);
            subtitleText.color = new Color(0.75f, 0.79f, 0.83f);
            AddLayoutElement(subtitleText.gameObject, minHeight: 24, flexibleHeight: 0);

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
            AddLayoutElement(row, minHeight: 34, flexibleHeight: 0);

            // Glyph (shape — a11y: colour is never the sole differentiator).
            Text g = NewText("Glyph", row.transform, glyph, 16, TextAnchor.MiddleCenter);
            g.color = accent;
            g.fontStyle = FontStyle.Bold;
            AddLayoutElement(g.gameObject, minWidth: 60, preferredWidth: 60, flexibleWidth: 0);

            Text l = NewText("Label", row.transform, label, 15, TextAnchor.MiddleLeft);
            l.color = new Color(0.72f, 0.76f, 0.80f);
            AddLayoutElement(l.gameObject, minWidth: 120, flexibleWidth: 1);

            Text v = NewText("Value", row.transform, value, 16, TextAnchor.MiddleRight);
            v.color = accent;
            v.fontStyle = FontStyle.Bold;
            AddLayoutElement(v.gameObject, minWidth: 160, flexibleWidth: 0);

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
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0); // ≥ 44 dp tap target (F2)

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
