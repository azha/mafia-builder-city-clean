using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C7 (design §3 C7) — `ContextualBanner`, `ShortcutBar`, et les 5 états canoniques
    // (`global_conventions_core.md:106-116`, recopiés verbatim : LoadingState / EmptyState /
    // ErrorState / PartialState / OfflineState). AUCUNE route consommée en propre — ce chunk rend
    // des clés que C3 a déjà obtenues (design §3.0, "l'exception défendue").
    public class HomeChromeController : MonoBehaviour
    {
        // Les 5 états UI systématiques (canon, VERBATIM les noms de la table §States).
        public enum HomeState { LoadingState, EmptyState, ErrorState, PartialState, OfflineState }

        // ---- test hooks ------------------------------------------------------
        public HomeState CurrentState { get; private set; } = HomeState.LoadingState;
        public bool BannerActive { get; private set; }
        public string BannerWeekStateRendered { get; private set; }
        public string PressureBandRendered { get; private set; }

        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private TextMeshProUGUI bannerText;
        private TextMeshProUGUI stateText;
        private TextMeshProUGUI pressureText;
        private Button shortcutDailyReview;
        private Button shortcutSecond;
        private bool initialized;

        public int DailyReviewShortcutClicks { get; private set; }

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            BuildLayout();
        }

        /// <summary>Drive the generic 5-state machine (canon: "applicable à TOUT écran") from the
        /// circumstances a real screen actually observes. Exactly ONE state is derived per call —
        /// a value, always, never an implicit "nothing happened".</summary>
        public void SetLoadCircumstances(bool isLoading, bool hasError, bool isOffline, bool hasAnyData, bool hasAllExpectedData)
        {
            EnsureInitialized();
            if (isOffline) CurrentState = HomeState.OfflineState;
            else if (hasError) CurrentState = HomeState.ErrorState;
            else if (isLoading) CurrentState = HomeState.LoadingState;
            else if (!hasAnyData) CurrentState = HomeState.EmptyState;
            else if (!hasAllExpectedData) CurrentState = HomeState.PartialState;
            else CurrentState = HomeState.LoadingState; // fully loaded, non-empty, non-partial — the
                                                         // canon names 5 states, not a 6th "content" state;
                                                         // a caller past this point renders the real screen.
            RenderState();
        }

        /// <summary>Bandeau conditionnel (design C7-F1) — piloté par `compression_glance`. Actif si
        /// forcé OU en semaine de compression active ; l'état "pas de bandeau" est nommé, jamais
        /// l'absence du composant.</summary>
        public void SetCompressionGlance(CompressionGlanceDto glance)
        {
            EnsureInitialized();
            bool active = glance != null && (glance.forced || (glance.week_state != null && glance.week_state != "none"));
            BannerActive = active;
            BannerWeekStateRendered = active ? glance.week_state : null;
            RenderBanner();
        }

        /// <summary>`queue_pressure_band` rendu comme signal de pression (design C7-F3) — la valeur
        /// suit LES TROIS bandes.</summary>
        public void SetPressureBand(string band)
        {
            EnsureInitialized();
            PressureBandRendered = band;
            RenderPressure();
        }

        public void ClickDailyReviewShortcut() => DailyReviewShortcutClicks++;

        // --------------------------------------------------------------- render

        private void RenderState()
        {
            stateText.text = $"[{CurrentState}]";
            RebuildTracked();
        }

        private void RenderBanner()
        {
            bannerText.text = BannerActive ? $"Compression week: {BannerWeekStateRendered}" : "No banner";
            RebuildTracked();
        }

        private void RenderPressure()
        {
            pressureText.text = $"Pressure: {PressureLabel(PressureBandRendered)}";
            RebuildTracked();
        }

        private static string PressureLabel(string b) =>
            b == "normal" ? "Normal" : b == "warning" ? "Warning" : b == "saturated" ? "Saturated" : "Unknown";

        private void RebuildTracked()
        {
            renderedTexts.Clear();
            if (!string.IsNullOrEmpty(stateText.text)) renderedTexts.Add(stateText.text);
            if (!string.IsNullOrEmpty(bannerText.text)) renderedTexts.Add(bannerText.text);
            if (!string.IsNullOrEmpty(pressureText.text)) renderedTexts.Add(pressureText.text);
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

            stateText = NewText();
            bannerText = NewText();
            pressureText = NewText();

            GameObject shortcuts = new GameObject("ShortcutBar", typeof(RectTransform));
            shortcuts.transform.SetParent(transform, false);
            HorizontalLayoutGroup shlg = shortcuts.AddComponent<HorizontalLayoutGroup>();
            shlg.spacing = 8;
            shlg.childControlWidth = true;
            shlg.childControlHeight = true;
            LayoutElement shLe = shortcuts.AddComponent<LayoutElement>();
            shLe.minHeight = 36;

            GameObject dailyReviewGo = new GameObject("Shortcut_DailyReview", typeof(RectTransform));
            dailyReviewGo.transform.SetParent(shortcuts.transform, false);
            Image drImg = dailyReviewGo.AddComponent<Image>();
            drImg.color = DesignTokens.Current.surfaceRow;
            shortcutDailyReview = dailyReviewGo.AddComponent<Button>();
            shortcutDailyReview.targetGraphic = drImg;
            shortcutDailyReview.onClick.AddListener(ClickDailyReviewShortcut);
            TextMeshProUGUI drLabel = new GameObject("Label", typeof(RectTransform)).AddComponent<TextMeshProUGUI>();
            drLabel.transform.SetParent(dailyReviewGo.transform, false);
            drLabel.font = DesignTokens.Current.primaryFont;
            drLabel.text = "Daily Review";
            drLabel.fontSize = 13;
            drLabel.color = DesignTokens.Current.onSurfacePrimary;

            GameObject secondGo = new GameObject("Shortcut_Second", typeof(RectTransform));
            secondGo.transform.SetParent(shortcuts.transform, false);
            Image secImg = secondGo.AddComponent<Image>();
            secImg.color = DesignTokens.Current.surfaceRow;
            shortcutSecond = secondGo.AddComponent<Button>();
            shortcutSecond.targetGraphic = secImg;
            TextMeshProUGUI secLabel = new GameObject("Label", typeof(RectTransform)).AddComponent<TextMeshProUGUI>();
            secLabel.transform.SetParent(secondGo.transform, false);
            secLabel.font = DesignTokens.Current.primaryFont;
            secLabel.text = "Exceptions";
            secLabel.fontSize = 13;
            secLabel.color = DesignTokens.Current.onSurfacePrimary;
        }

        private TextMeshProUGUI NewText()
        {
            GameObject go = new GameObject("Text", typeof(RectTransform));
            go.transform.SetParent(transform, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.fontSize = 14;
            t.color = DesignTokens.Current.onSurfacePrimary;
            t.raycastTarget = false;
            return t;
        }
    }
}
