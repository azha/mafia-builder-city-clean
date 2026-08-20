using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T3 — screen_5a (Exception Detail) REDUCED surface: full descriptor + bands, candidate
    // actions as tap buttons (suggested highlighted), the "Add as rule" toggle (canon 5a) with the DSL preview,
    // a separate Escalate button, the qualitative outcome after resolve, Back. Honest deferral: rich confirmations /
    // reduced-motion / telemetry / full A11y pass (screen_5a canon) land with the canon completion (spec §8).
    // -- session:2026-06-10 (Phase-20 T3) --
    //
    // METHOD DERIVATION (action-bound — mirrors the backend's consistency guard; the UI never invents a method):
    //   candidate.effect.type non-empty → method = effect.type (raid REPAIR/BRIBE/LAY_LOW)
    //   else addAsRule && add_rule_dsl non-empty → ADD_RULE
    //   else → ONE_TIME
    // Escalate is its own affordance → ESCALATE with chosen_action_id = suggested_action.id.
    public class ExceptionDetailController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        // ---- Public state (PlayMode test hooks) ----
        public ExceptionCardDto CurrentCard { get; private set; }
        public string LastOutcome { get; private set; }
        public string LastError { get; private set; }
        public bool AddAsRule { get; private set; }
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        private string token;
        private string baseUrl = "http://localhost";
        private Action onBack;
        private ExceptionsClient client;

        private readonly List<string> renderedTexts = new List<string>();
        private TMP_FontAsset font;
        private RectTransform body;
        private bool initialized;
        private bool resolving;
        private GameObject backdropGo;
        private GameObject sheetGo;

        // House teardown pattern (BuildingCardController precedent): a destroyed flag set in OnDestroy +
        // Unity fake-null. OnDestroy also tears down the screen's canvas children — BuildLayout parents the
        // backdrop/sheet to the SHARED canvas (not the host), so destroying the host alone would orphan an
        // opaque, raycast-eating overlay on top of the queue (the review C1 finding).
        private bool destroyed;
        private void OnDestroy()
        {
            destroyed = true;
            if (backdropGo != null) Destroy(backdropGo);
            if (sheetGo != null) Destroy(sheetGo);
        }
        private bool Destroyed => destroyed || this == null;

        // Slate palette (mirrors DashboardController).
        private static Color SurfaceBg => DesignTokens.Current.surfaceBase;
        private static Color CardBg => DesignTokens.Current.surfaceCard;
        private static Color RowBg => DesignTokens.Current.surfaceRow;
        private static Color TextPrimary => DesignTokens.Current.onSurfacePrimary;
        private static Color TextSecondary => DesignTokens.Current.onSurfaceSecondary;
        private static Color AccentMild => DesignTokens.Current.accentSuccess;
        private static Color AccentModerate => DesignTokens.Current.accentWarning;
        private static Color AccentSevere => DesignTokens.Current.accentDanger;
        private static Color CtaColor => DesignTokens.Current.accentGold;

        /// <summary>Wire the card + bearer + back-callback. Safe before Start() (the queue calls this in the same
        /// frame as AddComponent); Start() then builds the layout from the injected card.</summary>
        public void Init(ExceptionCardDto card, string bearer, string url, Action onBack)
        {
            CurrentCard = card;
            token = bearer;
            if (!string.IsNullOrEmpty(url)) baseUrl = url;
            this.onBack = onBack;
            EnsureInitialized();
            Render();
        }

        private void Start() { EnsureInitialized(); Render(); }

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = DesignTokens.Current.primaryFont;
            client = new ExceptionsClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        /// <summary>The action-bound method derivation (public static — unit-asserted by the PlayMode test).</summary>
        public static string MethodFor(CandidateActionDto a, bool addAsRule)
        {
            if (a != null && a.effect != null && !string.IsNullOrEmpty(a.effect.type)) return a.effect.type;
            if (addAsRule && a != null && !string.IsNullOrEmpty(a.add_rule_dsl)) return "ADD_RULE";
            return "ONE_TIME";
        }

        /// <summary>Toggle "Add as rule" (canon 5a) — re-renders so teachable candidates show/hide their DSL preview.</summary>
        public void SetAddAsRule(bool on)
        {
            AddAsRule = on;
            if (!Destroyed && initialized) Render();
        }

        /// <summary>Resolve via ONE candidate (method derived). Public coroutine — the PlayMode test drives it.</summary>
        public IEnumerator ResolveWith(CandidateActionDto candidate)
        {
            yield return DoResolve(MethodFor(candidate, AddAsRule), candidate != null ? candidate.id : "");
        }

        /// <summary>Escalate the card (ESCALATE; chosen_action_id = the suggested action's id).</summary>
        public IEnumerator Escalate()
        {
            string suggestedId = CurrentCard != null && CurrentCard.suggested_action != null ? CurrentCard.suggested_action.id : "";
            yield return DoResolve("ESCALATE", suggestedId);
        }

        private IEnumerator DoResolve(string method, string chosenActionId)
        {
            if (CurrentCard == null || resolving) yield break;
            resolving = true;
            LastError = null;
            ResolveResponse res = null;
            yield return client.Resolve(CurrentCard.exception_id, method, chosenActionId, token,
                ok => res = ok,
                (code, msg) => LastError = msg);
            resolving = false;
            if (Destroyed) yield break;
            if (res == null)
            {
                // Readable failure (F2): 409 already-resolved / 422 bad method render as the envelope message;
                // the player goes Back (which re-fetches the queue — stale taps self-heal).
                Render();
                yield break;
            }
            LastOutcome = res.outcome;
            Render();
        }

        /// <summary>Back to the queue: destroy this host (OnDestroy tears down the backdrop/sheet) + let the
        /// queue re-fetch.</summary>
        public void Back()
        {
            Action cb = onBack;
            if (this != null) Destroy(gameObject);
            cb?.Invoke();
        }

        // ---- render ----
        private void Render()
        {
            if (Destroyed || body == null) return;
            ExceptionCardDto c = CurrentCard;
            if (c == null) return;

            ClearBody();

            // Descriptor — producer free text (an i18n key may carry digits): CHROME, component-tracked only.
            TextMeshProUGUI desc = NewText("Descriptor", body, c.event_descriptor, 16, TextAlignmentOptions.Left);
            desc.fontStyle = FontStyles.Bold;
            AddLayoutElement(desc.gameObject, minHeight: 22, flexibleHeight: 0);

            // Bands line — CLOSED labels, tracked (the scan corpus). Color TextSecondary (neutral — detail shows all bands).
            string bands = $"Severity {Cap(c.severity_band)}  •  Priority {Cap(c.priority_band)}  •  Confidence {Cap(c.confidence_band)}";
            TextMeshProUGUI bandText = NewText("Bands", body, bands, 13, TextAlignmentOptions.Left);
            bandText.color = TextSecondary;
            AddLayoutElement(bandText.gameObject, minHeight: 18, flexibleHeight: 0);
            TrackText(bandText, bands);

            // ---- Resolved state: show outcome + Back, then return. ----
            if (!string.IsNullOrEmpty(LastOutcome))
            {
                TextMeshProUGUI resolved = NewText("Resolved", body, "Resolved ✓", 16, TextAlignmentOptions.Left);
                resolved.color = AccentMild;
                resolved.fontStyle = FontStyles.Bold;
                AddLayoutElement(resolved.gameObject, minHeight: 22, flexibleHeight: 0);
                TrackText(resolved, "Resolved ✓");

                // Outcome — producer free text (enum value may carry letters but qualitative): CHROME, TextPrimary.
                TextMeshProUGUI outcomeText = NewText("Outcome", body, "Outcome: " + LastOutcome, 14, TextAlignmentOptions.Left);
                outcomeText.color = TextPrimary;
                AddLayoutElement(outcomeText.gameObject, minHeight: 20, flexibleHeight: 0);
                // chrome — NOT tracked

                AddButton("Back", Back);
                return;
            }

            // ---- Error line (if present — producer text, chrome). ----
            if (!string.IsNullOrEmpty(LastError))
            {
                TextMeshProUGUI errText = NewText("Error", body, LastError, 13, TextAlignmentOptions.Left);
                errText.color = AccentSevere;
                AddLayoutElement(errText.gameObject, minHeight: 18, flexibleHeight: 0);
                // chrome — NOT tracked
            }

            // ---- "Add as rule" toggle — only when ≥1 candidate has non-empty add_rule_dsl. ----
            bool anyTeachable = false;
            if (c.candidate_actions != null)
                foreach (CandidateActionDto ca in c.candidate_actions)
                    if (ca != null && !string.IsNullOrEmpty(ca.add_rule_dsl)) { anyTeachable = true; break; }

            if (anyTeachable)
            {
                string toggleLabel = AddAsRule ? "Add as rule: ON" : "Add as rule: OFF";
                AddButton(toggleLabel, () => SetAddAsRule(!AddAsRule));
            }

            // ---- Per-candidate blocks. ----
            string suggestedId = c.suggested_action != null ? c.suggested_action.id : "";
            if (c.candidate_actions != null)
            {
                foreach (CandidateActionDto ca in c.candidate_actions)
                {
                    if (ca == null) continue;
                    bool isTeachable = !string.IsNullOrEmpty(ca.add_rule_dsl);
                    bool isSuggested = !string.IsNullOrEmpty(suggestedId) && ca.id == suggestedId;

                    GameObject block = NewUI("Candidate_" + ca.id, body);
                    block.AddComponent<Image>().color = RowBg;
                    VerticalLayoutGroup v = block.AddComponent<VerticalLayoutGroup>();
                    v.padding = new RectOffset(8, 8, 6, 6);
                    v.spacing = 2;
                    v.childControlWidth = true; v.childControlHeight = true;
                    v.childForceExpandWidth = true; v.childForceExpandHeight = false;
                    AddLayoutElement(block, flexibleHeight: 0);

                    // Label — producer free text (chrome); bold when suggested.
                    TextMeshProUGUI labelText = NewText("Label", block.transform, ca.label, 15, TextAlignmentOptions.Left);
                    if (isSuggested) labelText.fontStyle = FontStyles.Bold;
                    AddLayoutElement(labelText.gameObject, minHeight: 20, flexibleHeight: 0);
                    // chrome — NOT tracked

                    // "★ Suggested" marker — CLOSED label, tracked.
                    if (isSuggested)
                    {
                        TextMeshProUGUI sugMarker = NewText("Suggested", block.transform, "★ Suggested", 13, TextAlignmentOptions.Left);
                        sugMarker.color = CtaColor;
                        AddLayoutElement(sugMarker.gameObject, minHeight: 18, flexibleHeight: 0);
                        TrackText(sugMarker, "★ Suggested");
                    }

                    // Projected consequence — producer free text (chrome).
                    if (!string.IsNullOrEmpty(ca.projected_consequence))
                    {
                        TextMeshProUGUI conseq = NewText("Consequence", block.transform, ca.projected_consequence, 13, TextAlignmentOptions.Left);
                        conseq.color = TextSecondary;
                        AddLayoutElement(conseq.gameObject, minHeight: 18, flexibleHeight: 0);
                        // chrome — NOT tracked
                    }

                    // DSL preview — producer free text (chrome), shown only when AddAsRule && teachable.
                    if (AddAsRule && isTeachable)
                    {
                        TextMeshProUGUI dslText = NewText("DSL", block.transform, "Teaches: " + ca.add_rule_dsl, 12, TextAlignmentOptions.Left);
                        dslText.color = AccentMild;
                        AddLayoutElement(dslText.gameObject, minHeight: 16, flexibleHeight: 0);
                        // chrome — NOT tracked
                    }

                    // Resolve button — "Resolve: " + label is chrome (label is producer text).
                    CandidateActionDto captured = ca;
                    AddButtonTo(block.transform, "Resolve: " + ca.label, () => StartCoroutine(ResolveWith(captured)), track: false); // producer text in the caption — chrome (R2.2)
                }
            }

            // ---- Escalate + Back affordances. ----
            AddButton("Escalate", () => StartCoroutine(Escalate()));
            AddButton("Back", Back);
        }

        private void AddButton(string label, UnityEngine.Events.UnityAction onClick) => AddButtonTo(body, label, onClick, track: true);

        private void AddButtonTo(Transform parent, string label, UnityEngine.Events.UnityAction onClick, bool track = true)
        {
            GameObject btn = NewUI("Btn_" + label.Replace(" ", "").Replace(":", ""), parent);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.surfaceRaised;
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0); // ≥44dp tap target (F2)
            TextMeshProUGUI t = NewText("Label", btn.transform, label, 14, TextAlignmentOptions.Center);
            t.color = CtaColor;
            Stretch((RectTransform)t.transform, new Vector2(10, 2), new Vector2(-10, -2));
            if (track) TrackText(t, label);
        }

        private static string Cap(string b) =>
            string.IsNullOrEmpty(b) ? "Unknown" : char.ToUpperInvariant(b[0]) + b.Substring(1).ToLowerInvariant();

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
            backdropGo = NewUI("ExceptionDetailBackdrop", root);
            Stretch((RectTransform)backdropGo.transform, Vector2.zero, Vector2.zero);
            backdropGo.AddComponent<Image>().color = SurfaceBg;

            // The detail card, anchored top-centre.
            sheetGo = NewUI("ExceptionDetailSheet", root);
            GameObject card = sheetGo;
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
            TextMeshProUGUI headerText = NewText("Header", card.transform, "EXCEPTION", 24, TextAlignmentOptions.Left);
            headerText.fontStyle = FontStyles.Bold;
            AddLayoutElement(headerText.gameObject, minHeight: 32, flexibleHeight: 0);
            TrackText(headerText, "EXCEPTION");

            // Body rows area.
            GameObject bodyGo = NewUI("BodyArea", card.transform);
            VerticalLayoutGroup bvlg = bodyGo.AddComponent<VerticalLayoutGroup>();
            bvlg.spacing = 8;
            bvlg.childControlWidth = true;
            bvlg.childControlHeight = true;
            bvlg.childForceExpandWidth = true;
            bvlg.childForceExpandHeight = false;
            body = (RectTransform)bodyGo.transform;
            AddLayoutElement(bodyGo, flexibleHeight: 1);
        }

        // ---- body helpers ----
        private void ClearBody()
        {
            renderedTexts.Clear();
            if (body != null)
                for (int i = body.childCount - 1; i >= 0; i--)
                    UnityEngine.Object.Destroy(body.GetChild(i).gameObject);
            // Re-track the static header "EXCEPTION" (it lives outside body but is part of the corpus).
            renderedTexts.Add("EXCEPTION");
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
