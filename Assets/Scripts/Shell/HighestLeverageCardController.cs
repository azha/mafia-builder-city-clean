using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C4 (design §3 C4) — `HighestLeverageCard` + Commit/Skip. Rend `hl_card` (titre par clé
    // de catalogue, deux buckets, drapeau structurel) et le budget structurel. Confirmation
    // destructive OBLIGATOIRE sur Commit (le canon en fait la seule action destructive de Home,
    // global_conventions_core.md:129-138) : appui long (`LongPressButton`, REUSE) OU saisie d'un
    // mot-clé (`TypedConfirmKeyword`) — l'alternative typed-confirm est OBLIGATOIRE pour
    // l'accessibilité (F2, "utilisateurs sans accès haptique"), jamais un pur bonus. Skip est un tap
    // simple (non destructif, "carry semantics", design §8) — jamais gardé par une confirmation.
    public class HighestLeverageCardController : MonoBehaviour
    {
        public enum CardState { NoCard, Available, CapBlocked }

        // canon: "l'utilisateur tape un mot-clé de confirmation" (localisé F1 — EN MVP, D4 différé).
        public const string TypedConfirmKeyword = "COMMIT";

        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks ----------------------------------------------------
        public CardState RenderedState { get; private set; } = CardState.NoCard;
        public HlCardDto CurrentCard { get; private set; }
        public bool CapReached { get; private set; }
        public int CommitRequestCount { get; private set; }
        public int SkipRequestCount { get; private set; }
        public bool? LastCommitCommitted { get; private set; }
        public bool? LastSkipSkipped { get; private set; }
        public string LastCommitError { get; private set; }
        public string LastSkipError { get; private set; }

        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        public LongPressButton CommitButton { get; private set; }
        private TMP_InputField typedConfirmInput;
        private Button typedConfirmButton;
        private Button skipButton;
        private TextMeshProUGUI titleText;
        private TextMeshProUGUI impactText;
        private TextMeshProUGUI urgencyText;
        private TextMeshProUGUI stateText;

        private HlCardClient client;
        private string token;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new HlCardClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        /// <summary>Feed this widget the `hl_card` + `structural_budget` slice of a `session/open`
        /// payload (design: "il alimente C4… en données") — and the Bearer to use for Commit/Skip.</summary>
        public void SetPayload(string bearerToken, HlCardDto card, StructuralBudgetDto budget)
        {
            EnsureInitialized();
            token = bearerToken;
            CurrentCard = card;
            CapReached = budget != null && budget.cap_reached;

            if (card == null || string.IsNullOrEmpty(card.card_id))
            {
                RenderedState = CardState.NoCard;
            }
            else if (card.structural && CapReached)
            {
                RenderedState = CardState.CapBlocked;
            }
            else
            {
                RenderedState = CardState.Available;
            }
            Render();
        }

        /// <summary>Wired to `CommitButton.OnLongPressCompleted` — design C4-F1: a short tap NEVER
        /// reaches this (the gesture layer already filtered it out); this method itself refuses to
        /// emit anything while `CapBlocked` (design C4-F3 — client-side refusal, never even attempted
        /// against the server, which would ALSO 409 STRUCTURAL_CAP_EXHAUSTED).</summary>
        public IEnumerator RequestCommit()
        {
            EnsureInitialized();
            if (RenderedState != CardState.Available || CurrentCard == null) yield break; // CapBlocked/NoCard -> refused, zero requests
            CommitRequestCount++;
            LastCommitError = null;
            yield return client.Commit(token, CurrentCard.card_id,
                dto => LastCommitCommitted = dto.committed,
                (code, msg) => LastCommitError = $"{code}: {msg}");
        }

        /// <summary>The accessible ALTERNATIVE to the long press (canon: "alternative typed-confirm
        /// obligatoire — utilisateurs sans accès haptique", F2). A tap on the confirm button ALONE
        /// never commits — the typed text must match `TypedConfirmKeyword` (case-insensitive; the
        /// SAME "no bare tap confirms a destructive action" rule the canon states for BOTH paths).
        /// Routes through the SAME `RequestCommit()` — one behaviour, two triggers, never two
        /// divergent request paths that could drift apart.</summary>
        public IEnumerator RequestCommitViaTypedConfirm(string typedText)
        {
            if (!string.Equals((typedText ?? "").Trim(), TypedConfirmKeyword, StringComparison.OrdinalIgnoreCase))
                yield break; // wrong/empty keyword -> refused, zero requests (mirrors the CapBlocked refusal)
            yield return RequestCommit();
        }

        /// <summary>Wired to the Skip button's normal click — Skip is NOT destructive (design §8
        /// "carry semantics"), no long-press gate.</summary>
        public IEnumerator RequestSkip()
        {
            EnsureInitialized();
            if (CurrentCard == null) yield break;
            SkipRequestCount++;
            LastSkipError = null;
            yield return client.Skip(token, CurrentCard.card_id,
                dto => LastSkipSkipped = dto.skipped,
                (code, msg) => LastSkipError = $"{code}: {msg}");
        }

        // --------------------------------------------------------------- render

        private void Render()
        {
            renderedTexts.Clear();
            switch (RenderedState)
            {
                case CardState.NoCard:
                    titleText.text = "No decision waiting";
                    impactText.text = "";
                    urgencyText.text = "";
                    stateText.text = "All clear";
                    Track(titleText.text);
                    Track(stateText.text);
                    break;
                case CardState.CapBlocked:
                    titleText.text = CurrentCard.decision_type_key;
                    impactText.text = ImpactLabel(CurrentCard.impact_bucket);
                    urgencyText.text = UrgencyLabel(CurrentCard.urgency_bucket);
                    stateText.text = "Structural cap reached";
                    Track(titleText.text);
                    Track(impactText.text);
                    Track(urgencyText.text);
                    Track(stateText.text);
                    break;
                case CardState.Available:
                    titleText.text = CurrentCard.decision_type_key;
                    impactText.text = ImpactLabel(CurrentCard.impact_bucket);
                    urgencyText.text = UrgencyLabel(CurrentCard.urgency_bucket);
                    stateText.text = "Ready";
                    Track(titleText.text);
                    Track(impactText.text);
                    Track(urgencyText.text);
                    Track(stateText.text);
                    break;
            }
        }

        private void Track(string t)
        {
            if (!string.IsNullOrEmpty(t)) renderedTexts.Add(t);
        }

        private static string ImpactLabel(string b) =>
            b == "minor" ? "Minor" : b == "moderate" ? "Moderate" : b == "major" ? "Major" : (string.IsNullOrEmpty(b) ? "Unknown" : b);
        private static string UrgencyLabel(string b) =>
            b == "low" ? "Low" : b == "elevated" ? "Elevated" : b == "pressing" ? "Pressing" : (string.IsNullOrEmpty(b) ? "Unknown" : b);

        // --------------------------------------------------------------- UI build

        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(12, 12, 10, 10);
            vlg.spacing = 6;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            titleText = NewText("Title", 18, FontStyles.Bold);
            impactText = NewText("Impact", 14, FontStyles.Normal);
            urgencyText = NewText("Urgency", 14, FontStyles.Normal);
            stateText = NewText("State", 14, FontStyles.Italic);

            GameObject actions = new GameObject("Actions", typeof(RectTransform));
            actions.transform.SetParent(transform, false);
            HorizontalLayoutGroup ahlg = actions.AddComponent<HorizontalLayoutGroup>();
            ahlg.spacing = 8;
            ahlg.childControlWidth = true;
            ahlg.childControlHeight = true;
            ahlg.childForceExpandWidth = true;
            ahlg.childForceExpandHeight = true;
            LayoutElement actionsLe = actions.AddComponent<LayoutElement>();
            actionsLe.minHeight = 44;

            GameObject commitGo = new GameObject("CommitButton", typeof(RectTransform));
            commitGo.transform.SetParent(actions.transform, false);
            commitGo.AddComponent<Image>().color = DesignTokens.Current.accentGold;
            CommitButton = commitGo.AddComponent<LongPressButton>();
            CommitButton.OnLongPressCompleted += () => StartCoroutine(RequestCommit());
            TextMeshProUGUI commitLabel = NewChildText(commitGo.transform, "Commit (hold)", 15);
            commitLabel.color = DesignTokens.Current.surfaceBase;

            GameObject skipGo = new GameObject("SkipButton", typeof(RectTransform));
            skipGo.transform.SetParent(actions.transform, false);
            Image skipImg = skipGo.AddComponent<Image>();
            skipImg.color = DesignTokens.Current.surfaceRow;
            skipButton = skipGo.AddComponent<Button>();
            skipButton.targetGraphic = skipImg;
            skipButton.onClick.AddListener(() => StartCoroutine(RequestSkip()));
            TextMeshProUGUI skipLabel = NewChildText(skipGo.transform, "Skip", 15);
            skipLabel.color = DesignTokens.Current.onSurfacePrimary;

            // Accessible typed-confirm ALTERNATIVE to the long press (canon:129-138, F2 — obligatoire,
            // pas un bonus). A row: [type "COMMIT"] [Confirm].
            GameObject typedRow = new GameObject("TypedConfirmRow", typeof(RectTransform));
            typedRow.transform.SetParent(transform, false);
            HorizontalLayoutGroup trhlg = typedRow.AddComponent<HorizontalLayoutGroup>();
            trhlg.spacing = 6;
            trhlg.childControlWidth = true;
            trhlg.childControlHeight = true;
            trhlg.childForceExpandWidth = true;
            trhlg.childForceExpandHeight = true;
            LayoutElement typedRowLe = typedRow.AddComponent<LayoutElement>();
            typedRowLe.minHeight = 32;

            GameObject inputGo = new GameObject("TypedConfirmInput", typeof(RectTransform));
            inputGo.transform.SetParent(typedRow.transform, false);
            inputGo.AddComponent<Image>().color = DesignTokens.Current.surfaceRow;
            typedConfirmInput = inputGo.AddComponent<TMP_InputField>();
            GameObject inputTextGo = new GameObject("Text", typeof(RectTransform));
            inputTextGo.transform.SetParent(inputGo.transform, false);
            RectTransform inputTextRt = (RectTransform)inputTextGo.transform;
            inputTextRt.anchorMin = Vector2.zero; inputTextRt.anchorMax = Vector2.one;
            inputTextRt.offsetMin = new Vector2(6, 2); inputTextRt.offsetMax = new Vector2(-6, -2);
            TextMeshProUGUI inputText = inputTextGo.AddComponent<TextMeshProUGUI>();
            inputText.font = DesignTokens.Current.primaryFont;
            inputText.fontSize = 14;
            inputText.color = DesignTokens.Current.onSurfacePrimary;
            typedConfirmInput.textComponent = inputText;

            GameObject typedConfirmGo = new GameObject("TypedConfirmButton", typeof(RectTransform));
            typedConfirmGo.transform.SetParent(typedRow.transform, false);
            Image typedConfirmImg = typedConfirmGo.AddComponent<Image>();
            typedConfirmImg.color = DesignTokens.Current.surfaceRaised;
            typedConfirmButton = typedConfirmGo.AddComponent<Button>();
            typedConfirmButton.targetGraphic = typedConfirmImg;
            typedConfirmButton.onClick.AddListener(() => StartCoroutine(RequestCommitViaTypedConfirm(typedConfirmInput.text)));
            TextMeshProUGUI typedConfirmLabel = NewChildText(typedConfirmGo.transform, $"Type \"{TypedConfirmKeyword}\"", 13);
            typedConfirmLabel.color = DesignTokens.Current.onSurfacePrimary;
        }

        private TextMeshProUGUI NewText(string name, int size, FontStyles style)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(transform, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.fontSize = size;
            t.fontStyle = style;
            t.color = DesignTokens.Current.onSurfacePrimary;
            t.raycastTarget = false;
            return t;
        }

        private TextMeshProUGUI NewChildText(Transform parent, string value, int size)
        {
            GameObject go = new GameObject("Label", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(6, 4);
            rt.offsetMax = new Vector2(-6, -4);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = value;
            t.fontSize = size;
            t.alignment = TextAlignmentOptions.Center;
            t.raycastTarget = false;
            return t;
        }
    }
}
