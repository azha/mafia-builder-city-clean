using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer)
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational.Autonomy
{
    // IMPLEMENTS: spec §4-T4 — screen_7 (Autonomy Inbox, c7 reduced) REDUCED surface: the pending report list with
    // per-issue option blocks + Choose A/B buttons, decided state, outcome display, EmptyState. One-way screen (no
    // Back). Honest deferral (M1 Dashboard precedent): budget-band gauge, SendDecision controls, sort/filter, Loading-
    // Partial-Offline-Error rich states are NOT built in this slice — land with canon completion (spec §8).
    // -- session:2026-06-10 (Phase-21 T4) --
    //
    // Scan discipline: every TrackText'ed string is digit-free (closed labels + static captions only).
    // Producer text (lieutenant ids, age counts, label_key, refused_action, outcome, errors) = CHROME (component-
    // tracked only — an i18n key or id may carry digits).
    public class AutonomyInboxController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
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
        public bool ReportsLoaded { get; private set; }
        public string ReportsError { get; private set; }
        public AutonomyReportDto[] Reports { get; private set; } = Array.Empty<AutonomyReportDto>();
        public string LastOutcome { get; private set; }
        public string LastError { get; private set; }
        /// <summary>Closed-label + static-caption strings shown to the player — the no-raw-scalar scan corpus.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        private readonly List<string> renderedTexts = new List<string>();
        private TMP_FontAsset font;
        private TextMeshProUGUI headerText;
        private RectTransform rowsArea;
        private AuthClient auth;
        private AutonomyClient client;
        private bool initialized;
        private bool resolving;

        // House teardown flag (BuildingCardController precedent) — covers coroutines resumed by an external
        // PlayMode runner after an inter-fixture teardown.
        private bool destroyed;
        private void OnDestroy() { destroyed = true; }
        private bool Destroyed => destroyed || this == null;

        // Slate palette (mirrors DashboardController).
        private static Color SurfaceBg => DesignTokens.Current.surfaceBase;
        private static Color CardBg => DesignTokens.Current.surfaceCard;
        private static Color RowBg => DesignTokens.Current.surfaceRow;
        private static Color TextPrimary => DesignTokens.Current.onSurfacePrimary;
        private static Color TextSecondary => DesignTokens.Current.onSurfaceSecondary;
        private static Color AccentMild => DesignTokens.Current.accentSuccess;
        private static Color AccentSevere => DesignTokens.Current.accentDanger;
        private static Color CtaColor => DesignTokens.Current.accentGold;

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = DesignTokens.Current.primaryFont;
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new AutonomyClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        private IEnumerator Boot()
        {
            yield return SignIn();
            if (!IsAuthenticated) yield break;
            yield return LoadReports();
        }

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
                Debug.LogError($"[AutonomyInbox] auth failed: {AuthError}");
                yield break;
            }
            Token = token;
            IsAuthenticated = true;
        }

        /// <summary>IShellTenant token injection (B1, hud-session-arbitrages-design.md §1.2) — set
        /// directly by the shell BEFORE Start() runs (synchronous MountTenant<T> window). Mirrors
        /// DashboardController.SetToken; SignIn()'s own `if (IsAuthenticated) yield break;` guard
        /// then no-ops without further changes.</summary>
        public void SetToken(string token)
        {
            Token = token;
            IsAuthenticated = !string.IsNullOrEmpty(token);
        }

        /// <summary>Fetch pending autonomy reports + render the rows (EmptyState when none). Re-entrancy is SERIALIZED
        /// (the DashboardController.LoadDashboard precedent): a Boot() self-load racing a test-driven load on the
        /// shared Reports/ReportsError fields is the documented intermittent-flake shape — a second caller WAITS for
        /// the in-flight load instead of clobbering it.</summary>
        private bool isLoading;
        public IEnumerator LoadReports()
        {
            EnsureInitialized();
            if (isLoading)
            {
                while (isLoading && this != null) yield return null;
                yield break;
            }
            isLoading = true;
            ReportsLoaded = false;
            ReportsError = null;
            AutonomyReportDto[] reports = null;
            yield return client.GetReports(Token,
                r => reports = r,
                (code, msg) => ReportsError = $"{code}: {msg}");
            if (Destroyed) { isLoading = false; yield break; }
            if (reports == null)
            {
                Debug.LogError($"[AutonomyInbox] load failed: {ReportsError}");
                RenderError();
                isLoading = false;
                yield break;
            }
            Reports = reports;
            ReportsLoaded = true;
            Render();
            isLoading = false;
        }

        /// <summary>Resolve one issue (chosen = "A" or "B"). Serialized via the resolving guard (one at a time).
        /// On ok: LastOutcome set + re-render via LoadReports (decided state). On err: LastError set + Render().</summary>
        public IEnumerator Resolve(AutonomyReportDto report, AutonomyIssueDto issue, string chosen)
        {
            if (resolving) yield break;
            resolving = true;
            LastError = null;
            ResolveIssueResponse dto = null;
            string err = null;
            yield return client.ResolveIssue(report.report_id, issue.issue_id, chosen, Token,
                r => dto = r,
                (code, msg) => err = $"{code}: {msg}");
            if (Destroyed) { resolving = false; yield break; }
            if (err != null)
            {
                LastError = err;
                Render();
                resolving = false;
                yield break;
            }
            LastOutcome = dto != null ? dto.outcome : "";
            resolving = false;
            yield return LoadReports();
        }

        // ---- render ----
        private void Render()
        {
            ClearRows();
            headerText.text = "RAPPORTS D'AUTONOMIE";
            TrackText(headerText, headerText.text);

            // Outcome line (CHROME — outcome is producer text, may carry any characters).
            if (!string.IsNullOrEmpty(LastOutcome))
            {
                TextMeshProUGUI outcomeLine = NewText("Outcome", rowsArea, "Issue : " + LastOutcome, 13, TextAlignmentOptions.Left);
                outcomeLine.color = AccentMild;
                AddLayoutElement(outcomeLine.gameObject, minHeight: 20, flexibleHeight: 0);
                // CHROME: not TrackText'd — outcome is producer free text
            }

            // Error line (CHROME — error message is runtime text, may carry digits/codes).
            if (!string.IsNullOrEmpty(LastError))
            {
                TextMeshProUGUI errLine = NewText("Error", rowsArea, LastError, 13, TextAlignmentOptions.Left);
                errLine.color = AccentSevere;
                AddLayoutElement(errLine.gameObject, minHeight: 20, flexibleHeight: 0);
                // CHROME: not TrackText'd — error carries status codes
            }

            if (Reports.Length == 0)
            {
                TextMeshProUGUI empty = NewText("Empty", rowsArea, "Aucun rapport d'autonomie en attente", 14, TextAlignmentOptions.Left);
                empty.color = TextSecondary;
                AddLayoutElement(empty.gameObject, minHeight: 24, flexibleHeight: 0);
                TrackText(empty, empty.text);
                return;
            }

            foreach (AutonomyReportDto report in Reports)
                AddReportCard(report);
        }

        private void RenderError()
        {
            ClearRows();
            headerText.text = "RAPPORTS D'AUTONOMIE";
            TextMeshProUGUI err = NewText("Error", rowsArea, "Boîte d'autonomie indisponible — vérifier la pile", 14, TextAlignmentOptions.Left);
            err.color = AccentSevere;
            AddLayoutElement(err.gameObject, minHeight: 24, flexibleHeight: 0);
            TrackText(headerText, headerText.text);
            // CHROME: error text not TrackText'd (carries variable content)
        }

        // One report card: header line (chrome) + per-issue blocks.
        private void AddReportCard(AutonomyReportDto report)
        {
            GameObject card = NewUI("Report_" + report.report_id, rowsArea);
            card.AddComponent<Image>().color = RowBg;
            VerticalLayoutGroup v = card.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(10, 10, 8, 8);
            v.spacing = 6;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(card, flexibleHeight: 0);

            // Report header line — CHROME (ids + digit count).
            // "Lt <id>  •  Oldest: <n> cycles" — all CHROME: ids and counts carry digits.
            string header = "Lt " + report.lieutenant_id + "  •  Oldest: " + report.backlog_age_cycles + " cycles";
            TextMeshProUGUI headerLine = NewText("ReportHeader", card.transform, header, 14, TextAlignmentOptions.Left);
            headerLine.fontStyle = FontStyles.Bold;
            headerLine.color = TextPrimary;
            AddLayoutElement(headerLine.gameObject, minHeight: 22, flexibleHeight: 0);
            // CHROME: not TrackText'd — ids and counts carry digits

            if (report.issues == null) return;
            foreach (AutonomyIssueDto issue in report.issues)
                AddIssueBlock(card.transform, report, issue);
        }

        // One issue block inside a report card.
        private void AddIssueBlock(Transform parent, AutonomyReportDto report, AutonomyIssueDto issue)
        {
            GameObject block = NewUI("Issue_" + issue.issue_id, parent);
            block.AddComponent<Image>().color = DesignTokens.Current.autonomyBlockBg;
            VerticalLayoutGroup v = block.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(8, 8, 6, 6);
            v.spacing = 4;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(block, flexibleHeight: 0);

            // refused_action — CHROME bold (producer free text, may carry digits/ids).
            TextMeshProUGUI refused = NewText("RefusedAction", block.transform, issue.refused_action, 13, TextAlignmentOptions.Left);
            refused.fontStyle = FontStyles.Bold;
            refused.color = TextPrimary;
            AddLayoutElement(refused.gameObject, minHeight: 18, flexibleHeight: 0);
            // CHROME: not TrackText'd

            if (!string.IsNullOrEmpty(issue.decided))
            {
                // Already decided — show closed label (TRACKED, digit-free).
                TextMeshProUGUI decided = NewText("Decided", block.transform, "✓ Décidé", 13, TextAlignmentOptions.Left);
                decided.color = AccentMild;
                AddLayoutElement(decided.gameObject, minHeight: 18, flexibleHeight: 0);
                TrackText(decided, decided.text);
                return; // no buttons for decided issues
            }

            // Option A sub-block.
            if (issue.option_a != null)
                AddOptionBlock(block.transform, report, issue, issue.option_a, "A");

            // Option B sub-block.
            if (issue.option_b != null)
                AddOptionBlock(block.transform, report, issue, issue.option_b, "B");
        }

        // One option sub-block: label_key (CHROME) + outcome label (TRACKED) + Choose button (TRACKED).
        private void AddOptionBlock(Transform parent, AutonomyReportDto report, AutonomyIssueDto issue,
            AutonomyOptionDto option, string choice)
        {
            GameObject optBlock = NewUI("Option_" + choice, parent);
            VerticalLayoutGroup v = optBlock.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(4, 4, 2, 2);
            v.spacing = 2;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(optBlock, flexibleHeight: 0);

            // label_key — CHROME (producer text, may carry digits/i18n keys).
            TextMeshProUGUI labelText = NewText("LabelKey_" + choice, optBlock.transform, option.label_key, 12, TextAlignmentOptions.Left);
            labelText.color = TextSecondary;
            AddLayoutElement(labelText.gameObject, minHeight: 16, flexibleHeight: 0);
            // CHROME: not TrackText'd

            // Outcome label — TRACKED (closed switch, digit-free).
            string outcomeLabel = OutcomeLabel(option.projected_outcome);
            TextMeshProUGUI outcomeText = NewText("Outcome_" + choice, optBlock.transform, outcomeLabel, 12, TextAlignmentOptions.Left);
            outcomeText.color = TextSecondary;
            AddLayoutElement(outcomeText.gameObject, minHeight: 16, flexibleHeight: 0);
            TrackText(outcomeText, outcomeLabel);

            // Choose button (44dp, TRACKED caption, digit-free).
            string caption = "Choose " + choice; // "Choose A" or "Choose B" — digit-free
            GameObject btn = NewUI("Btn_" + choice, optBlock.transform);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.surfaceRaised;
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            string capturedChoice = choice;
            AutonomyReportDto capturedReport = report;
            AutonomyIssueDto capturedIssue = issue;
            b.onClick.AddListener(() => StartCoroutine(Resolve(capturedReport, capturedIssue, capturedChoice)));
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0);
            TextMeshProUGUI bt = NewText("BtnLabel_" + choice, btn.transform, caption, 13, TextAlignmentOptions.Center);
            bt.color = CtaColor;
            Stretch((RectTransform)bt.transform, new Vector2(10, 2), new Vector2(-10, -2));
            TrackText(bt, caption);
        }

        // Closed outcome band → a11y-safe shape+text label (digit-free — TRACKED).
        private static string OutcomeLabel(string b)
        {
            switch (b) {
                case "MINIMAL": return MafiaCleanCity.I18n.Libelle.De("autonomie", "etat", "[~] Minimal");
                case "TRADEOFF": return MafiaCleanCity.I18n.Libelle.De("autonomie", "etat", "[<>] Tradeoff");
                case "ELEVATED_EXPOSURE": return MafiaCleanCity.I18n.Libelle.De("autonomie", "etat", "[!] Elevated exposure");
                case "OPPORTUNITY_COST": return MafiaCleanCity.I18n.Libelle.De("autonomie", "etat", "[$] Opportunity cost");
                default: return MafiaCleanCity.I18n.Libelle.De("autonomie", "etat", "[?] Unknown");
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

            // Full-screen ardoise backdrop.
            GameObject backdrop = NewUI("AutonomyInboxBackdrop", root);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = SurfaceBg;

            // The inbox card, anchored top-centre.
            GameObject card = NewUI("AutonomyInboxSheet", root);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 1f);
            cardRt.anchorMax = new Vector2(0.5f, 1f);
            cardRt.pivot = new Vector2(0.5f, 1f);
            cardRt.sizeDelta = new Vector2(600, 640);
            cardRt.anchoredPosition = new Vector2(0, -28);
            card.AddComponent<Image>().color = CardBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(20, 20, 18, 18);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            // Header — TRACKED ("RAPPORTS D'AUTONOMIE" is digit-free).
            headerText = NewText("Header", card.transform, "RAPPORTS D'AUTONOMIE", 24, TextAlignmentOptions.Left);
            headerText.fontStyle = FontStyles.Bold;
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
                    UnityEngine.Object.Destroy(rowsArea.GetChild(i).gameObject);
        }

        // --------------------------------------------------------------- helpers (verbatim DashboardController)

        private void TrackText(TextMeshProUGUI comp, string text)
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
