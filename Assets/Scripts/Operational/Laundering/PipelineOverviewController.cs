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
    // Drives the Pipeline OVERVIEW screen (screen_6 — the MULTI-NODE laundering chain) for the
    // Phase-2b vertical slice. Where the T11 LaunderingController renders a SINGLE Stage-1 node, this
    // controller renders the ORDERED multi-stage chain (Stage1 → 2 → 3 → 4): one pipeline-node card per
    // stage, each with its qualitative CLEANLINESS BAND (rising along the chain
    // PARTIAL → MOSTLY_CLEAN → … → CLEAN), a TERMINAL marker on the release stage, and a "buffered cash"
    // presence chip — exactly the fields GET /v1/operational/laundering/:nodeId/pipeline returns. It:
    //   1. signs in (POST /v1/auth/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
    //   2. fetches GET /v1/operational/laundering/:nodeId/pipeline (the chain overview, given ANY node of
    //      the chain — the backend's recursive walk returns the whole head→tail chain) and renders the
    //      ordered stages as SemanticBar rows.
    //
    // R2.2 / P5: the projection only ever returns, per stage, a band STRING + two BOOLEANS + a uuid id —
    // this screen renders exactly those; it NEVER fabricates a raw scalar (buffered cents / dwell ticks /
    // cleanliness float / a stage-count integer). a11y F2: every status line carries a text label AND a
    // shape glyph (not colour alone), mirroring the T11 Laundering band rows + the Building Card rows +
    // the global_conventions_core SemanticBar convention (colour+text+shape). Stage ordinals are conveyed
    // in WORDS ("Stage one", "first"…), never a bare digit the no-scalar guard would flag.
    //
    // The whole UI is built programmatically from a single Canvas (mirrors LaunderingController /
    // BuildingCardController / CityMapController) so a scene needs almost no manual wiring.
    //
    // M1b scope note (honest deferral): the full screen_6 design (the Speed/Volume/Exposure
    // Throughput-Trilemma triangle widget, the per-node Heat/Dwell/Erlang block-probability badges, the
    // routing-weight editable edges, the Buffer-Bloat tail-risk histogram panel, and the parallel /
    // multi-pipeline list with horizontal scroll) is intentionally NOT built here — those projections are
    // NOT part of the Phase-2b pipeline endpoint, which returns ONLY the ordered stages + per-stage
    // cleanliness band + terminal flag + has_cash flag. The M1b core IS the multi-node chain with rising
    // cleanliness bands + the terminal release stage; this controller renders that faithfully and defers
    // the rest (the same honest-deferral posture as the T11 LaunderingController).
    public class PipelineOverviewController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        [Header("Target pipeline (any node of the chain)")]
        [Tooltip("A laundering node uuid in the chain to load (typically the head Stage-1 node). Set before Start (or call LoadPipeline).")]
        [SerializeField] private string nodeId = "";

        // ---- Public state (test hooks) ---------------------------------------
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool PipelineLoaded { get; private set; }
        public string PipelineError { get; private set; }
        public LaunderingPipelineDto CurrentPipeline { get; private set; }
        /// <summary>The number of stages in the loaded chain (a STRUCTURAL ordinal derived client-side from
        /// stages.Length — NOT a server scalar; used by the E2E to assert the multi-node chain rendered).</summary>
        public int StageCount => CurrentPipeline?.stages?.Length ?? 0;
        /// <summary>The full set of text shown to the player (labels + values) — used by the
        /// E2E to prove no raw scalar leaks client-side.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        public string NodeId { get => nodeId; set => nodeId = value; }

        private readonly List<string> renderedTexts = new List<string>();

        private TMP_FontAsset font;
        private TextMeshProUGUI titleText;
        private TextMeshProUGUI subtitleText;
        private RectTransform stageRows;

        private AuthClient auth;
        private LaunderingClient client;

        // Slate palette (mirrors LaunderingController + global_conventions_core direction).
        private static readonly Color SurfaceBg = DesignTokens.Current.surfaceCard; // #16191b
        private static readonly Color RowBg = DesignTokens.Current.surfaceRow;     // #232a2d
        private static readonly Color TextPrimary = DesignTokens.Current.onSurfacePrimary;
        private static readonly Color AccentMild = DesignTokens.Current.accentSuccess;   // #43e0c0 teal (clean)
        private static readonly Color AccentModerate = DesignTokens.Current.accentWarning;     // #ff9e3d amber (partial)
        private static readonly Color AccentSevere = DesignTokens.Current.accentDanger;      // #ff5a4d red (dirty)
        private static readonly Color TerminalColor = DesignTokens.Current.accentGold;     // #ffd23f yellow (release stage)

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        // Lazily build clients + the UI so the controller is safe to drive (SignIn / LoadPipeline)
        // before Start() has run — e.g. an E2E that calls SignIn() in the same frame as AddComponent.
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
            if (!string.IsNullOrEmpty(nodeId)) yield return LoadPipeline(nodeId);
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
                Debug.LogError($"[Pipeline] auth failed: {AuthError}");
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

        /// <summary>Fetch + render the pipeline overview for a node id (any node of the chain).</summary>
        public IEnumerator LoadPipeline(string id)
        {
            EnsureInitialized();
            nodeId = id;
            PipelineLoaded = false;
            PipelineError = null;
            CurrentPipeline = null;

            yield return client.GetLaunderingPipeline(id, Token,
                dto => CurrentPipeline = dto,
                (code, msg) => PipelineError = $"{code}: {msg}");

            if (CurrentPipeline == null || CurrentPipeline.stages == null)
            {
                Debug.LogError($"[Pipeline] load failed: {PipelineError}");
                RenderError();
                yield break;
            }

            PipelineLoaded = true;
            Render(CurrentPipeline);
        }

        // --------------------------------------------------------------- render

        private void Render(LaunderingPipelineDto pipeline)
        {
            ClearRows();

            titleText.text = "LAUNDERING PIPELINE";
            // The chain length is conveyed in words (never a digit) so the R2.2 no-scalar guard stays pristine.
            subtitleText.text = "Cash cleanliness rises stage by stage";
            TrackText(titleText.text);
            TrackText(subtitleText.text);

            // One pipeline-node card per stage, in chain order (head → tail). The cleanliness band rises
            // along the chain; the terminal stage is the release node that credits the wallet.
            LaunderingStageDto[] stages = pipeline.stages;
            for (int i = 0; i < stages.Length; i++)
            {
                LaunderingStageDto s = stages[i];
                bool isLast = i == stages.Length - 1;
                AddStageRow(i, stages.Length, s, isLast);
            }
        }

        private void RenderError()
        {
            ClearRows();
            titleText.text = "LAUNDERING PIPELINE";
            subtitleText.text = "Failed to load the pipeline. Check the seeder + stack.";
            TrackText(titleText.text);
            TrackText(subtitleText.text);
        }

        // A pipeline-node card for one stage: a stage label (worded ordinal), the cleanliness band
        // (glyph + label + colour — SemanticBar a11y F2), a terminal/release marker on the last stage,
        // and a "buffered cash" presence chip when the stage holds cash.
        private void AddStageRow(int index, int total, LaunderingStageDto stage, bool isLast)
        {
            GameObject card = NewUI("Stage_" + StageOrdinalWord(index), stageRows);
            card.AddComponent<Image>().color = RowBg;
            VerticalLayoutGroup cvlg = card.AddComponent<VerticalLayoutGroup>();
            cvlg.padding = new RectOffset(10, 10, 6, 6);
            cvlg.spacing = 3;
            cvlg.childControlWidth = true;
            cvlg.childControlHeight = true;
            cvlg.childForceExpandWidth = true;
            cvlg.childForceExpandHeight = false;
            AddLayoutElement(card, minHeight: 46, flexibleHeight: 0);

            // Header line: the stage label (worded ordinal) + the terminal/release marker.
            string header = StageLabel(index, total) + (stage.terminal ? "  •  Release (terminal)" : "");
            TextMeshProUGUI head = NewText("Header", card.transform, header, 14, TextAlignmentOptions.Left);
            head.color = stage.terminal ? TerminalColor : DesignTokens.Current.onSurfaceMuted;
            head.fontStyle = FontStyles.Bold;
            AddLayoutElement(head.gameObject, minHeight: 20, flexibleHeight: 0);
            TrackText(header);

            // SemanticBar line: glyph (shape) + cleanliness band label + a buffered-cash chip.
            GameObject row = NewUI("Band", card.transform);
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 10;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 22, flexibleHeight: 0);

            Color accent = CleanlinessAccent(stage.cleanliness_band);

            // Glyph (shape — a11y: colour is never the sole differentiator).
            TextMeshProUGUI g = NewText("Glyph", row.transform, CleanlinessGlyph(stage.cleanliness_band), 15, TextAlignmentOptions.Center);
            g.color = accent;
            g.fontStyle = FontStyles.Bold;
            AddLayoutElement(g.gameObject, minWidth: 58, preferredWidth: 58, flexibleWidth: 0);
            TrackText(CleanlinessGlyph(stage.cleanliness_band));

            TextMeshProUGUI band = NewText("BandValue", row.transform, CleanlinessLabel(stage.cleanliness_band), 15, TextAlignmentOptions.Left);
            band.color = accent;
            band.fontStyle = FontStyles.Bold;
            AddLayoutElement(band.gameObject, minWidth: 130, flexibleWidth: 1);
            TrackText(CleanlinessLabel(stage.cleanliness_band));

            // Buffered-cash presence chip (a boolean — never the cents). Only shown when cash is present.
            string chip = stage.has_cash ? "Cash buffered" : "Empty";
            TextMeshProUGUI c = NewText("Cash", row.transform, chip, 13, TextAlignmentOptions.Right);
            c.color = stage.has_cash ? AccentModerate : DesignTokens.Current.onSurfaceSecondaryAlt;
            AddLayoutElement(c.gameObject, minWidth: 110, flexibleWidth: 0);
            TrackText(chip);
        }

        // ----------------------------------------------------- band → label/glyph

        // CleanlinessBucket projected per stage (DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN).
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

        // The stage ordinal as WORDS (never a digit — the no-scalar guard stays pristine). The head is
        // "Stage one — front shop"; downstream stages are "Stage two/three/…". Beyond the worded range the
        // label degrades to "Stage" alone (still digit-free) — the M1b chain is short (≤ a handful).
        private static readonly string[] OrdinalWords =
            { "one", "two", "three", "four", "five", "six", "seven", "eight" };
        private static string StageOrdinalWord(int index) =>
            index >= 0 && index < OrdinalWords.Length ? OrdinalWords[index] : "next";
        private string StageLabel(int index, int total)
        {
            string ordinal = StageOrdinalWord(index);
            if (index == 0) return $"Stage {ordinal} — front shop";
            return $"Stage {ordinal} — mid-tier";
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

            // Dim backdrop (the Pipeline tab would sit behind in-game).
            GameObject backdrop = NewUI("PipelineBackdrop", canvas.transform);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = DesignTokens.Current.scrimBackdrop;

            // The pipeline overview card, anchored centre.
            GameObject card = NewUI("PipelineSheet", canvas.transform);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 0.5f);
            cardRt.anchorMax = new Vector2(0.5f, 0.5f);
            cardRt.pivot = new Vector2(0.5f, 0.5f);
            cardRt.sizeDelta = new Vector2(560, 460);
            cardRt.anchoredPosition = Vector2.zero;
            card.AddComponent<Image>().color = SurfaceBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(18, 18, 16, 16);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            titleText = NewText("Title", card.transform, "LAUNDERING PIPELINE", 22, TextAlignmentOptions.Left);
            titleText.fontStyle = FontStyles.Bold;
            AddLayoutElement(titleText.gameObject, minHeight: 30, flexibleHeight: 0);

            subtitleText = NewText("Subtitle", card.transform, "Cash cleanliness rises stage by stage", 16, TextAlignmentOptions.Left);
            subtitleText.color = DesignTokens.Current.onSurfaceDim;
            AddLayoutElement(subtitleText.gameObject, minHeight: 24, flexibleHeight: 0);

            GameObject rows = NewUI("StageRows", card.transform);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 8;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            stageRows = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 1);
        }

        // --------------------------------------------------------------- helpers

        private void ClearRows()
        {
            renderedTexts.Clear();
            if (stageRows != null)
                for (int i = stageRows.childCount - 1; i >= 0; i--)
                    Object.Destroy(stageRows.GetChild(i).gameObject);
        }

        private void TrackText(string text)
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
