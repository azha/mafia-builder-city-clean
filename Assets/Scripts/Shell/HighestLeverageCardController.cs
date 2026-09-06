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
        /// <summary>⑤ — le bloc de l'Accueil est un RÉSUMÉ ; l'écran de détail est un autre objet
        /// (`DecisionDetailScreenController`), et `front.md` le dit depuis le début : « ce contrôleur
        /// couvre le BLOC de screen_1, pas cet écran ». Ce bloc n'a pas à le connaître — il annonce
        /// qu'on veut l'ouvrir, et c'est le shell qui monte l'écran. *Un bloc qui monterait lui-même
        /// un écran plein cadre inverserait la responsabilité et le rendrait impossible à monter
        /// depuis ailleurs.*</summary>
        public event System.Action OnOuvrirDetail;

        /// <summary>Appelé par la surface de la carte — pas par les boutons Commit/Skip, qui
        /// tranchent depuis le résumé sans passer par le détail.</summary>
        public void DemanderDetail()
        {
            if (CurrentCard != null) OnOuvrirDetail?.Invoke();
        }

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
                    titleText.text = Lib("carte", "Aucune décision en attente");
                    impactText.text = "";
                    urgencyText.text = "";
                    stateText.text = Lib("carte", "Rien à signaler");
                    Track(titleText.text);
                    Track(stateText.text);
                    break;
                case CardState.CapBlocked:
                    titleText.text = LibellesDecision.Type(CurrentCard.decision_type_key);
                    impactText.text = ImpactLabel(CurrentCard.impact_bucket);
                    urgencyText.text = UrgencyLabel(CurrentCard.urgency_bucket);
                    stateText.text = Lib("carte", "Limite de structure atteinte");
                    Track(titleText.text);
                    Track(impactText.text);
                    Track(urgencyText.text);
                    Track(stateText.text);
                    break;
                case CardState.Available:
                    titleText.text = LibellesDecision.Type(CurrentCard.decision_type_key);
                    impactText.text = ImpactLabel(CurrentCard.impact_bucket);
                    urgencyText.text = UrgencyLabel(CurrentCard.urgency_bucket);
                    stateText.text = Lib("carte", "Prêt");
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

        // ⛔⛔ CES DEUX RÉSOLVEURS RENDAIENT L'ANGLAIS PENDANT QUE ⑤ RENDAIT LE FRANÇAIS, sur les
        //    MÊMES champs de la MÊME réponse, à quelques secondes d'écart pour le joueur : la carte
        //    de l'Accueil disait « Moderate / Low », son détail « modérée / faible ». Et le TITRE
        //    était pire — `decision_type_key` posé BRUT, donc `AUTONOMY_REPORTS_PENDING` en toutes
        //    lettres, là où ⑤ passait par un résolveur.
        //    ★★ *Deux écrans qui montrent la même donnée doivent la nommer pareil, et la seule
        //      façon de s'en assurer est qu'un seul code la nomme.* C'est exactement la forme de
        //      TD-611, sur une autre grandeur : deux producteurs, l'un branché, l'autre oublié.
        //    ⇒ Les deux méthodes sont supprimées plutôt que traduites : les garder traduites
        //      laisserait DEUX producteurs, et le prochain qui change un mot n'en changerait qu'un.
        private static string ImpactLabel(string b) => LibellesDecision.Portee(b);
        private static string UrgencyLabel(string b) => LibellesDecision.Urgence(b);

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

        /// <summary>Item 0.6 — le littéral d'écran passe par une CLÉ. Le repli passé à `Libelle`
        /// est FRANÇAIS : `Libelle.De` rend le littéral quand la clé manque au bundle, donc un
        /// repli anglais resterait anglais à l'écran À TRAVERS la conversion (mesuré par le
        /// chantier B : 81 replis sur 107 étaient anglais après une première passe — « converti
        /// sans traduire »). Convertir sans traduire ne change rien pour le joueur.</summary>
        private static string Lib(string role, string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("accueil", role, litteral);

    }
}
