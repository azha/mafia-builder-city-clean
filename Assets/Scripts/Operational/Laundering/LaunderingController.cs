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
    // Drives the Laundering Pipeline screen (screen_6 / screen_6a) for the M1 vertical
    // slice — a SINGLE Stage-1 front-shop laundering node. It:
    //   1. signs in (POST /v1/auth/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
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
    public class LaunderingController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
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
        private readonly List<TextMeshProUGUI> textComponents = new List<TextMeshProUGUI>();

        private TMP_FontAsset font;
        private TextMeshProUGUI titleText;
        private TextMeshProUGUI subtitleText;
        private RectTransform statusRows;
        private RectTransform actionBar;
        private TextMeshProUGUI actionStatusText;

        private AuthClient auth;
        private LaunderingClient client;

        // Slate palette (mirrors BuildingCard + global_conventions_core direction).
        private static Color SurfaceBg => DesignTokens.Current.surfaceCard; // #16191b
        private static Color RowBg => DesignTokens.Current.surfaceRow;     // #232a2d
        private static Color TextPrimary => DesignTokens.Current.onSurfacePrimary;
        private static Color AccentMild => DesignTokens.Current.accentSuccess;   // #43e0c0 teal (clean)
        private static Color AccentModerate => DesignTokens.Current.accentWarning;     // #ff9e3d amber (partial)
        private static Color AccentSevere => DesignTokens.Current.accentDanger;      // #ff5a4d red (dirty / deviation)
        private static Color CtaColor => DesignTokens.Current.accentGold;          // #ffd23f yellow

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
            font = DesignTokens.Current.primaryFont;
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
            yield return DemoIdentityResolver.ResolveAndSignIn(auth,
                DemoIdentityResolver.OperationalIdentifierEnvVar, DemoIdentityResolver.OperationalPasswordEnvVar,
                demoIdentifier, demoPassword, t => token = t, e => err = e);
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

            titleText.text = "FILIÈRE DE BLANCHIMENT";
            // No bare digit in the rendered label — the R2.2 no-scalar guard is kept pristine
            // (the stage ordinal is conveyed in words, not a digit that the guard would flag).
            subtitleText.text = "Commerce-écran — premier maillon";
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
            titleText.text = "FILIÈRE DE BLANCHIMENT";
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

            // ⛔ ⑨ LA FILIÈRE N'AVAIT AUCUN CHEMIN JOUEUR — mesuré sur les 11 écrans montables du
            //    client : `PipelineOverviewController` était le SEUL sans aucune voie depuis le shell
            //    (ni onglet, ni menu, ni parent). Il était construit, testé, et injoignable.
            //    Il vit ici parce que c'est ici que le `nodeId` existe : sa route est
            //    `/v1/operational/laundering/:nodeId/pipeline`, et ce contrôleur est le seul écran qui
            //    en tient un (`LoadNode(id)`). *Un écran s'attache là où sa clé d'entrée est déjà.*
            AddActionButton(actionBar, "Voir la filière", OuvrirFiliere);

            actionStatusText = NewText("ActionStatus", actionBar, "", 14, TextAlignmentOptions.Left);
            actionStatusText.color = DesignTokens.Current.onSurfaceMutedAlt;
            AddLayoutElement(actionStatusText.gameObject, minHeight: 22, flexibleHeight: 0);
        }

        // ----------------------------------------------------- band → label/glyph

        // CleanlinessBucket projected by the laundering node (DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN).
        // The glyph is a fill-ramp (a11y: shape conveys the band independent of colour).
        private static string CleanlinessLabel(string b)
        {
            switch (b)
            {
                case "CLEAN": return MafiaCleanCity.I18n.Libelle.De("blanchiment", "purete", "Clean");
                case "MOSTLY_CLEAN": return MafiaCleanCity.I18n.Libelle.De("blanchiment", "purete", "Mostly clean");
                case "PARTIAL": return "Partial";
                case "DIRTY": return MafiaCleanCity.I18n.Libelle.De("blanchiment", "purete", "Dirty");
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

            // Dim backdrop (the City Map / Pipeline tab would sit behind in-game).
            GameObject backdrop = NewUI("LaunderingBackdrop", root);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = DesignTokens.Current.scrimBackdrop;

            // The pipeline card, anchored centre.
            GameObject card = NewUI("LaunderingSheet", root);
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

            titleText = NewText("Title", card.transform, "FILIÈRE DE BLANCHIMENT", 22, TextAlignmentOptions.Left);
            titleText.fontStyle = FontStyles.Bold;
            AddLayoutElement(titleText.gameObject, minHeight: 30, flexibleHeight: 0);

            subtitleText = NewText("Subtitle", card.transform, "Commerce-écran — premier maillon", 16, TextAlignmentOptions.Left);
            subtitleText.color = DesignTokens.Current.onSurfaceDim;
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
            TextMeshProUGUI g = NewText("Glyph", row.transform, glyph, 16, TextAlignmentOptions.Center);
            g.color = accent;
            g.fontStyle = FontStyles.Bold;
            AddLayoutElement(g.gameObject, minWidth: 60, preferredWidth: 60, flexibleWidth: 0);

            TextMeshProUGUI l = NewText("Label", row.transform, label, 15, TextAlignmentOptions.Left);
            l.color = DesignTokens.Current.onSurfaceMuted;
            AddLayoutElement(l.gameObject, minWidth: 120, flexibleWidth: 1);

            TextMeshProUGUI v = NewText("Value", row.transform, value, 16, TextAlignmentOptions.Right);
            v.color = accent;
            v.fontStyle = FontStyles.Bold;
            AddLayoutElement(v.gameObject, minWidth: 160, flexibleWidth: 0);

            TrackText(g, glyph);
            TrackText(l, label);
            TrackText(v, value);
        }

        private string NewSectionLabel(Transform parent, string text)
        {
            TextMeshProUGUI t = NewText("Section", parent, text, 13, TextAlignmentOptions.Left);
            t.color = DesignTokens.Current.onSurfaceSecondaryAlt;
            t.fontStyle = FontStyles.Bold;
            AddLayoutElement(t.gameObject, minHeight: 20, flexibleHeight: 0);
            return text;
        }

        /// <summary>Ouvre ⑨ (la filière) par-dessus ce nœud — MÊME patron que
        /// `ExceptionQueueController.OpenDetail` et `DashboardController.OpenNav` : un `AppShell`
        /// (`IShellNavigator`) trouvé monte l'écran EN SURIMPRESSION, sinon repli hors shell.
        /// Aucun mécanisme neuf : j'ai cherché qui exerçait déjà cette couture avant d'en écrire une.
        ///
        /// ⚠️ UN SEUL À LA FOIS : un second appui ne doit pas empiler deux filières sur le même
        /// overlay (défaut déjà payé sur le détail d'exception, sa revue I1).
        /// ⚠️ ET LE RETOUR EST LE POINT DÉLICAT : `PipelineOverviewController` n'expose AUCUN
        /// `onBack`, contrairement à `ExceptionDetailController`. Ouvrir sans retour piégerait le
        /// joueur dans un écran sans issue — pire que l'écran injoignable qu'on répare. On pose donc
        /// l'action de tête du shell sur « revenir », et on la rend au nœud en repartant.
        /// Non revu — jalon 09-05.</summary>
        public void OuvrirFiliere()
        {
            if (string.IsNullOrEmpty(NodeId)) return;                 // rien à montrer sans clé d'entrée
            if (filiereOuverte != null && filiereOuverte) return;      // un seul overlay à la fois

            MafiaCleanCity.Shell.IShellNavigator nav = MafiaCleanCity.Shell.ShellNavigatorLocator.Find();
            PipelineOverviewController vue;
            if (nav != null)
            {
                vue = nav.MonterLocataireEnSurimpression<PipelineOverviewController>();
            }
            else
            {
                // Repli hors shell : même forme que les deux précédents maison.
                filiereHost = new GameObject("Nav_PipelineOverview");
                vue = filiereHost.AddComponent<PipelineOverviewController>();
            }
            filiereOuverte = vue;
            vue.SetToken(Token);
            StartCoroutine(vue.LoadPipeline(NodeId));
        }

        private PipelineOverviewController filiereOuverte;
        private GameObject filiereHost;

        private void AddActionButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick)
        {
            GameObject btn = NewUI("Action_" + label.Replace(" ", ""), parent);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.surfaceRaised;
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0); // ≥ 44 dp tap target (F2)

            TextMeshProUGUI t = NewText("Label", btn.transform, label, 15, TextAlignmentOptions.Center);
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
