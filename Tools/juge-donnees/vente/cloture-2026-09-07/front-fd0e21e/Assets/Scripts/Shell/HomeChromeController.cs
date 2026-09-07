using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions; // REUSE ExceptionQueueController — cible du raccourci Lib("chrome", "Les exceptions") (item 0.5 §2)
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C7 (design §3 C7) — `ContextualBanner`, `ShortcutBar`, et les 5 états canoniques
    // (`global_conventions_core.md:106-116`, recopiés verbatim : LoadingState / EmptyState /
    // ErrorState / PartialState / OfflineState). AUCUNE route consommée en propre — ce chunk rend
    // des clés que C3 a déjà obtenues (design §3.0, "l'exception défendue").
    //
    // ITEM 0.5 §2 (Tools/charpente-item05-design.md, (b)) — CORRIGÉ : le second raccourci
    // (`Shortcut_Second`, libellé Lib("chrome", "Les exceptions")) ne portait AUCUN `onClick` — un bouton branché sur
    // rien, invisible à la seule question "quelle route sert sa donnée" (défaut joueur, pas un
    // détail). REUSE de `IShellNavigator` (même mécanisme que `DashboardController.OpenExceptions`) :
    // `ExceptionQueueController` est déjà un `IShellTenant` monté par CE mécanisme ailleurs, donc
    // aucun mécanisme neuf. Le PREMIER raccourci (`Shortcut_DailyReview`) reste au clic-compteur
    // SEUL, DÉLIBÉRÉMENT : `DailyReviewScreenController` n'est PAS ENCORE un `IShellTenant`
    // (`MonterLocataireEnSurimpression<T>` exige `where T : IShellTenant`) — la conversion est
    // l'item 0.5 §3 (C4a), qui vient APRÈS ce chunk dans l'ordre du design (C2 → C4a → C3). Câbler
    // ce raccourci identiquement à celui-ci fait partie de C4a, pas de C2 — consigné en Deviation.
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
        // m5 (revue ⊥ item05-C2, mineur — détecteur de péremption) : miroir de `LastOpenedExceptions`
        // ci-dessous, TOUJOURS null aujourd'hui — `ClickDailyReviewShortcut` ne fait qu'incrémenter
        // un compteur (Deviation 1, `DailyReviewScreenController` n'est pas encore `IShellTenant`,
        // C4a). Épingle la VALEUR, pas l'absence : le jour où C4a câble ce raccourci comme
        // `ClickExceptionsShortcut` (posant ce champ), une assertion `IsNull` sur ce champ ROUGIRA —
        // le `toBe(404)` dans le bon sens (socle : « un différé consigné qui n'est jamais repris
        // n'est plus un différé, c'est un trou »).
        public GameObject LastOpenedDailyReview { get; private set; }
        // ITEM 0.5 §2 — le raccourci Lib("chrome", "Les exceptions"), désormais câblé (voir le commentaire d'en-tête).
        public int ExceptionsShortcutClicks { get; private set; }
        public GameObject LastOpenedExceptions { get; private set; }

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

        /// <summary>ITEM 0.5 §2 — REUSE `IShellNavigator` (même mécanisme que
        /// `DashboardController.OpenExceptions`) : monte `ExceptionQueueController` en
        /// surimpression, PAR LE SHELL qui a monté ce panneau. Hors shell (tout test qui construit
        /// ce contrôleur seul, `NewBareChrome()`) : aucun `IShellNavigator` trouvé ⇒ no-op, le clic
        /// est comptabilisé quand même (même repli que `IShellTenant`/`IShellSessionSink` : un test
        /// qui monte ce composant seul ne doit jamais planter sur l'absence du shell).</summary>
        public void ClickExceptionsShortcut()
        {
            ExceptionsShortcutClicks++;
            IShellNavigator nav = ShellNavigatorLocator.Find();
            if (nav != null)
                LastOpenedExceptions = nav.MonterLocataireEnSurimpression<ExceptionQueueController>().gameObject;
        }

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
            drLabel.text = Lib("chrome", "La revue du jour");
            drLabel.fontSize = 13;
            drLabel.color = DesignTokens.Current.onSurfacePrimary;

            GameObject secondGo = new GameObject("Shortcut_Second", typeof(RectTransform));
            secondGo.transform.SetParent(shortcuts.transform, false);
            Image secImg = secondGo.AddComponent<Image>();
            secImg.color = DesignTokens.Current.surfaceRow;
            shortcutSecond = secondGo.AddComponent<Button>();
            shortcutSecond.targetGraphic = secImg;
            shortcutSecond.onClick.AddListener(ClickExceptionsShortcut);
            TextMeshProUGUI secLabel = new GameObject("Label", typeof(RectTransform)).AddComponent<TextMeshProUGUI>();
            secLabel.transform.SetParent(secondGo.transform, false);
            secLabel.font = DesignTokens.Current.primaryFont;
            secLabel.text = Lib("chrome", "Les exceptions");
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

        /// <summary>Item 0.6 — le littéral d'écran passe par une CLÉ. Le repli passé à `Libelle`
        /// est FRANÇAIS : `Libelle.De` rend le littéral quand la clé manque au bundle, donc un
        /// repli anglais resterait anglais à l'écran À TRAVERS la conversion (mesuré par le
        /// chantier B : 81 replis sur 107 étaient anglais après une première passe — « converti
        /// sans traduire »). Convertir sans traduire ne change rien pour le joueur.</summary>
        private static string Lib(string role, string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("accueil", role, litteral);

    }
}
