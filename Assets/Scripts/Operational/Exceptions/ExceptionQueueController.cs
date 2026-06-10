using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer)

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T2 — screen_5 (Exception Queue, full view) REDUCED surface: the pending list with the 3
    // band labels + a lieutenant badge, EmptyState, tap row → ExceptionDetailController (OpenNav idiom). Honest
    // deferral (the M1 Dashboard precedent): sort / filters / swipe actions / batch resolve / Loading-Partial-
    // Offline-Error rich states (docs/tech/08_ui_screens/screen_5_exception_queue.md) are NOT built in this slice —
    // they need no new endpoint and land with the canon completion (spec §8). -- session:2026-06-10 (Phase-20 T2) --
    //
    // R2.2: the rows render the 3 CLOSED band labels (tracked in the scan corpus) + producer free text
    // (event_descriptor — chrome, component-tracked only: an i18n key may carry digits).
    public class ExceptionQueueController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        // ---- Public state (PlayMode test hooks) ----
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool QueueLoaded { get; private set; }
        public string QueueError { get; private set; }
        public ExceptionCardDto[] Cards { get; private set; } = Array.Empty<ExceptionCardDto>();
        /// <summary>Band/label strings shown to the player — the no-raw-scalar scan corpus.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        public GameObject LastNavGameObject { get; private set; }
        public ExceptionDetailController LastDetail { get; private set; }

        private readonly List<string> renderedTexts = new List<string>();
        private Font font;
        private Text headerText;
        private RectTransform rowsArea;
        private AuthClient auth;
        private ExceptionsClient client;
        private bool initialized;
        private bool Destroyed => this == null;

        // Slate palette (mirrors DashboardController).
        private static readonly Color SurfaceBg = new Color(0.051f, 0.059f, 0.063f);
        private static readonly Color CardBg = new Color(0.086f, 0.098f, 0.106f);
        private static readonly Color RowBg = new Color(0.137f, 0.165f, 0.176f);
        private static readonly Color TextPrimary = new Color(0.933f, 0.945f, 0.949f);
        private static readonly Color TextSecondary = new Color(0.541f, 0.592f, 0.612f);
        private static readonly Color AccentMild = new Color(0.263f, 0.878f, 0.753f);
        private static readonly Color AccentModerate = new Color(1f, 0.62f, 0.239f);
        private static readonly Color AccentSevere = new Color(1f, 0.353f, 0.302f);
        private static readonly Color CtaColor = new Color(1f, 0.824f, 0.247f);

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new ExceptionsClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        private IEnumerator Boot()
        {
            yield return SignIn();
            if (!IsAuthenticated) yield break;
            yield return LoadQueue();
        }

        public IEnumerator SignIn()
        {
            EnsureInitialized();
            if (IsAuthenticated) yield break;
            string token = null, err = null;
            yield return auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);
            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[ExceptionQueue] auth failed: {AuthError}");
                yield break;
            }
            Token = token;
            IsAuthenticated = true;
        }

        /// <summary>Fetch the pending queue + render the rows (EmptyState when none). Re-entrancy is SERIALIZED
        /// (the DashboardController.LoadDashboard precedent): a Boot() self-load racing a test-driven load on the
        /// shared Cards/QueueError fields is the documented intermittent-flake shape — a second caller WAITS for the
        /// in-flight load instead of clobbering it.</summary>
        private bool isLoading;
        public IEnumerator LoadQueue()
        {
            EnsureInitialized();
            if (isLoading)
            {
                while (isLoading && this != null) yield return null;
                yield break;
            }
            isLoading = true;
            QueueLoaded = false;
            QueueError = null;
            ExceptionCardDto[] cards = null;
            yield return client.GetQueue(Token,
                c => cards = c,
                (code, msg) => QueueError = $"{code}: {msg}");
            if (Destroyed) { isLoading = false; yield break; }
            if (cards == null)
            {
                Debug.LogError($"[ExceptionQueue] load failed: {QueueError}");
                RenderError();
                isLoading = false;
                yield break;
            }
            Cards = cards;
            QueueLoaded = true;
            Render();
            isLoading = false;
        }

        /// <summary>Open one card's detail (OpenNav idiom: host GameObject + AddComponent + Init). The card travels
        /// in memory (the projection is self-contained); on Back the queue re-fetches (server = source of truth).</summary>
        public void OpenDetail(ExceptionCardDto card)
        {
            if (card == null) return;
            LastNavGameObject = new GameObject("Nav_ExceptionDetail");
            ExceptionDetailController detail = LastNavGameObject.AddComponent<ExceptionDetailController>();
            detail.Init(card, Token, baseUrl, onBack: () => { if (!Destroyed) StartCoroutine(LoadQueue()); });
            LastDetail = detail;
        }

        // ---- render ----
        private void Render()
        {
            ClearRows();
            headerText.text = "EXCEPTIONS";
            TrackText(headerText, headerText.text);

            if (Cards.Length == 0)
            {
                Text empty = NewText("Empty", rowsArea, "No exceptions waiting", 14, TextAnchor.MiddleLeft);
                empty.color = TextSecondary;
                AddLayoutElement(empty.gameObject, minHeight: 24, flexibleHeight: 0);
                TrackText(empty, empty.text);
                return;
            }

            foreach (ExceptionCardDto card in Cards)
                AddCardRow(card);
        }

        private void RenderError()
        {
            ClearRows();
            headerText.text = "EXCEPTIONS";
            Text err = NewText("Error", rowsArea, "Queue unavailable — check the stack", 14, TextAnchor.MiddleLeft);
            err.color = AccentSevere;
            AddLayoutElement(err.gameObject, minHeight: 24, flexibleHeight: 0);
            TrackText(headerText, headerText.text);
            TrackText(err, err.text);
        }

        // One queue row: severity glyph + descriptor (chrome) + the 3 bands + lieutenant badge + Open button.
        private void AddCardRow(ExceptionCardDto card)
        {
            GameObject row = NewUI("Card_" + card.exception_id, rowsArea);
            row.AddComponent<Image>().color = RowBg;
            VerticalLayoutGroup v = row.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(10, 10, 6, 6);
            v.spacing = 3;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(row, flexibleHeight: 0);

            // Descriptor — producer free text (an i18n key may carry digits): CHROME, component-tracked only.
            Text desc = NewText("Descriptor", row.transform, card.event_descriptor, 15, TextAnchor.MiddleLeft);
            desc.fontStyle = FontStyle.Bold;
            AddLayoutElement(desc.gameObject, minHeight: 20, flexibleHeight: 0);

            // Bands line — CLOSED labels, tracked (the scan corpus).
            string bound = string.IsNullOrEmpty(card.lieutenant_id) ? "" : "  •  Lieutenant-bound";
            string bands = $"{SeverityGlyph(card.severity_band)} Severity {Cap(card.severity_band)}  •  " +
                           $"Priority {Cap(card.priority_band)}  •  Confidence {Cap(card.confidence_band)}{bound}";
            Text bandText = NewText("Bands", row.transform, bands, 13, TextAnchor.MiddleLeft);
            bandText.color = SeverityAccent(card.severity_band);
            AddLayoutElement(bandText.gameObject, minHeight: 18, flexibleHeight: 0);
            TrackText(bandText, bands);

            // Open affordance (≥44dp tap target, F2).
            GameObject btn = NewUI("Open", row.transform);
            Image img = btn.AddComponent<Image>();
            img.color = new Color(0.16f, 0.18f, 0.22f);
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(() => OpenDetail(card));
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0);
            Text bt = NewText("Label", btn.transform, "Open", 14, TextAnchor.MiddleCenter);
            bt.color = CtaColor;
            Stretch((RectTransform)bt.transform, new Vector2(10, 2), new Vector2(-10, -2));
            TrackText(bt, "Open");
        }

        // ---- band → glyph/accent (a11y F2: shape + label, never colour alone) ----
        private static string SeverityGlyph(string b)
        {
            switch (b) { case "HIGH": return "[!!!]"; case "MEDIUM": return "[!!.]"; case "LOW": return "[!..]"; default: return "[?]"; }
        }
        private static Color SeverityAccent(string b)
        {
            switch (b) { case "HIGH": return AccentSevere; case "MEDIUM": return AccentModerate; case "LOW": return AccentMild; default: return TextSecondary; }
        }
        private static string Cap(string b) =>
            string.IsNullOrEmpty(b) ? "Unknown" : char.ToUpperInvariant(b[0]) + b.Substring(1).ToLowerInvariant();

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

            // Full-screen ardoise backdrop.
            GameObject backdrop = NewUI("ExceptionQueueBackdrop", canvas.transform);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = SurfaceBg;

            // The queue card, anchored top-centre.
            GameObject card = NewUI("ExceptionQueueSheet", canvas.transform);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 1f);
            cardRt.anchorMax = new Vector2(0.5f, 1f);
            cardRt.pivot = new Vector2(0.5f, 1f);
            cardRt.sizeDelta = new Vector2(560, 600);
            cardRt.anchoredPosition = new Vector2(0, -28);
            card.AddComponent<Image>().color = CardBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(20, 20, 18, 18);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            // Header.
            headerText = NewText("Header", card.transform, "EXCEPTIONS", 24, TextAnchor.MiddleLeft);
            headerText.fontStyle = FontStyle.Bold;
            AddLayoutElement(headerText.gameObject, minHeight: 32, flexibleHeight: 0);

            // Rows area.
            GameObject rows = NewUI("RowsArea", card.transform);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 8;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            rowsArea = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 1);
        }

        // ---- row helpers ----
        private void ClearRows()
        {
            renderedTexts.Clear();
            if (rowsArea != null)
                for (int i = rowsArea.childCount - 1; i >= 0; i--)
                    Object.Destroy(rowsArea.GetChild(i).gameObject);
        }

        // --------------------------------------------------------------- helpers (verbatim DashboardController)

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
