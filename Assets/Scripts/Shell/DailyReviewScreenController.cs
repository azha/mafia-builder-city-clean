using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C8 (design §3 C8, D6) — `DailyReviewScreen`. Zones B et C entières sur leurs 4 routes
    // réelles ; Zone A réduite (D6 — les tendances de cycle sont MORTES, forme A, non simulées).
    // Ouverture automatique pilotée par le booléen `flag_review.auto_open` DÉJÀ CALCULÉ côté serveur
    // (clé de `session/open`, via C3) — ce contrôleur ne recalcule PAS la règle "première session du
    // jour", il se contente de la LIRE (design : "le client ne recalcule pas la règle").
    public class DailyReviewScreenController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks ------------------------------------------------------
        public bool IsOpen { get; private set; }
        public bool RenderedEmptyState { get; private set; }
        public int RenderedCardCount { get; private set; }
        public int ValidateRequestCount { get; private set; }
        public int DismissRequestCount { get; private set; }
        public int BatchConfirmRequestCount { get; private set; }
        public string LastValidateError { get; private set; }
        public string LastDismissError { get; private set; }
        public string LastBatchConfirmError { get; private set; }
        public int? LastBatchConfirmedCount { get; private set; }
        public FlagReviewResponseDto LastLoadedReview { get; private set; }

        public LongPressButton BatchConfirmButton { get; private set; }

        private RectTransform rowsRoot;
        private TextMeshProUGUI emptyStateText;
        private DailyReviewClient client;
        private string token;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new DailyReviewClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        /// <summary>Design C8-F3 — the screen opens WHEN the server boolean is true, and stays
        /// closed when false. A value read, never re-derived client-side.</summary>
        public void ApplyAutoOpen(bool serverAutoOpen)
        {
            EnsureInitialized();
            IsOpen = serverAutoOpen;
        }

        public IEnumerator LoadReview(string bearerToken)
        {
            EnsureInitialized();
            token = bearerToken;
            yield return client.GetFlagReview(token, dto => LastLoadedReview = dto, (c, m) => { });
            if (LastLoadedReview != null) Render(LastLoadedReview.cards);
        }

        public IEnumerator ValidateFlag(string flagId)
        {
            EnsureInitialized();
            ValidateRequestCount++;
            LastValidateError = null;
            yield return client.Validate(token, flagId, dto => { }, (c, m) => LastValidateError = $"{c}: {m}");
        }

        public IEnumerator DismissFlag(string flagId)
        {
            EnsureInitialized();
            DismissRequestCount++;
            LastDismissError = null;
            yield return client.Dismiss(token, flagId, dto => { }, (c, m) => LastDismissError = $"{c}: {m}");
        }

        /// <summary>Wired to `BatchConfirmButton.OnLongPressCompleted` — design C8-F2: batch confirm
        /// REQUIRES the long press, a tap emits nothing (the button's OWN gesture gate already
        /// filters that; this method fires only on a genuine completion).</summary>
        public IEnumerator RequestBatchConfirm()
        {
            EnsureInitialized();
            BatchConfirmRequestCount++;
            LastBatchConfirmError = null;
            yield return client.BatchConfirm(token,
                dto => LastBatchConfirmedCount = dto.batch_confirmed_count,
                (c, m) => LastBatchConfirmError = $"{c}: {m}");
        }

        // --------------------------------------------------------------- render

        private void Render(FlagCardDto[] cards)
        {
            for (int i = rowsRoot.childCount - 1; i >= 0; i--) UnityEngine.Object.Destroy(rowsRoot.GetChild(i).gameObject);

            if (cards == null || cards.Length == 0)
            {
                RenderedEmptyState = true;
                RenderedCardCount = 0;
                emptyStateText.gameObject.SetActive(true);
                emptyStateText.text = "No flags to review today";
                return;
            }

            RenderedEmptyState = false;
            emptyStateText.gameObject.SetActive(false);
            RenderedCardCount = cards.Length;
            foreach (FlagCardDto card in cards) AddRow(card);
        }

        private void AddRow(FlagCardDto card)
        {
            GameObject row = new GameObject("FlagRow_" + card.flag_id, typeof(RectTransform));
            row.transform.SetParent(rowsRoot, false);
            row.AddComponent<Image>().color = DesignTokens.Current.surfaceRow;
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 6;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            LayoutElement rowLe = row.AddComponent<LayoutElement>();
            rowLe.minHeight = 32;

            GameObject validateGo = new GameObject("Validate", typeof(RectTransform));
            validateGo.transform.SetParent(row.transform, false);
            Image vImg = validateGo.AddComponent<Image>();
            vImg.color = DesignTokens.Current.accentSuccess;
            Button vBtn = validateGo.AddComponent<Button>();
            vBtn.targetGraphic = vImg;
            vBtn.onClick.AddListener(() => StartCoroutine(ValidateFlag(card.flag_id)));

            GameObject dismissGo = new GameObject("Dismiss", typeof(RectTransform));
            dismissGo.transform.SetParent(row.transform, false);
            Image dImg = dismissGo.AddComponent<Image>();
            dImg.color = DesignTokens.Current.accentDanger;
            Button dBtn = dismissGo.AddComponent<Button>();
            dBtn.targetGraphic = dImg;
            dBtn.onClick.AddListener(() => StartCoroutine(DismissFlag(card.flag_id)));
        }

        // --------------------------------------------------------------- UI build

        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 4;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            GameObject rowsGo = new GameObject("FlagRows", typeof(RectTransform));
            rowsGo.transform.SetParent(transform, false);
            VerticalLayoutGroup rvlg = rowsGo.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 4;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            rowsRoot = (RectTransform)rowsGo.transform;

            GameObject emptyGo = new GameObject("EmptyState", typeof(RectTransform));
            emptyGo.transform.SetParent(transform, false);
            emptyStateText = emptyGo.AddComponent<TextMeshProUGUI>();
            emptyStateText.font = DesignTokens.Current.primaryFont;
            emptyStateText.fontSize = 14;
            emptyStateText.color = DesignTokens.Current.onSurfacePrimary;
            emptyStateText.gameObject.SetActive(false);

            GameObject batchGo = new GameObject("BatchConfirmButton", typeof(RectTransform));
            batchGo.transform.SetParent(transform, false);
            Image batchImg = batchGo.AddComponent<Image>();
            batchImg.color = DesignTokens.Current.accentGold;
            BatchConfirmButton = batchGo.AddComponent<LongPressButton>();
            BatchConfirmButton.OnLongPressCompleted += () => StartCoroutine(RequestBatchConfirm());
            LayoutElement batchLe = batchGo.AddComponent<LayoutElement>();
            batchLe.minHeight = 40;
            TextMeshProUGUI batchLabel = new GameObject("Label", typeof(RectTransform)).AddComponent<TextMeshProUGUI>();
            batchLabel.transform.SetParent(batchGo.transform, false);
            RectTransform batchLabelRt = (RectTransform)batchLabel.transform;
            batchLabelRt.anchorMin = Vector2.zero; batchLabelRt.anchorMax = Vector2.one;
            batchLabelRt.offsetMin = new Vector2(6, 2); batchLabelRt.offsetMax = new Vector2(-6, -2);
            batchLabel.font = DesignTokens.Current.primaryFont;
            batchLabel.text = "Confirm all (hold)";
            batchLabel.fontSize = 14;
            batchLabel.color = DesignTokens.Current.surfaceBase;
            batchLabel.alignment = TextAlignmentOptions.Center;
        }
    }
}
