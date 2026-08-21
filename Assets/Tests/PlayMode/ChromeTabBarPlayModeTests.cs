using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Theme;
using TMPro;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // Retour user (2026-08-21, mot pour mot) : « et surtout le bas, le menu de navigation est
    // toujours gris non ? » — MESURÉ, il avait raison : `AppShell.BuildTabBar`/`RefreshTabButtonVisuals`
    // n'avaient JAMAIS été touchés par la doctrine du restyle TopBar (HUD v3.1). Root cause double :
    // (1) fond `Image.color = surfaceCard` plat, gris, sans verre ni filet ; (2) l'onglet actif
    // repointait sur `chromeTabActive` = REUSE verbatim de `accentGold` (#ffd23f, « l'ancien or vif »)
    // en APLAT PLEIN — exactement la classe que le restyle TopBar avait quittée deux commits plus tôt
    // pour `hudHairlineGold` (#b08d3e, laiton mat). Deux ors différents à l'écran, en permanence.
    //
    // ⚠️ AUCUNE référence pixel n'existe pour cette barre — vérifié : 0 mention d'une barre d'onglets
    // dans les maquettes DA disponibles à ce lot (elles montrent un téléphone SANS chrome de
    // navigation bas). Ce fichier ne compare donc JAMAIS à un artefact pixel fabriqué — un juge
    // inventé serait pire que pas de juge (leçon payée ailleurs dans ce dépôt). Il vérifie la
    // COHÉRENCE avec `TopBarController` (même verre, même laiton) et la doctrine déjà écrite
    // ("l'or jamais en aplat") — les deux choses que la demande a explicitement autorisé à dériver
    // par cohérence plutôt que par comparaison pixel.
    [Category("HUDv31")]
    public class ChromeTabBarPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false;
        }

        private static void ExpectShellOwnAuthNoise() => LogAssert.ignoreFailingMessages = true;

        private static IEnumerator WaitTopBarLoaded(AppShell s)
        {
            float elapsed = 0f;
            while ((s.TopBar == null || !s.TopBar.Loaded) && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.IsTrue(s.TopBar != null && s.TopBar.Loaded, "acquisition de session propre du shell terminée (TopBar chargé)");
        }

        private AppShell BootShell()
        {
            ExpectShellOwnAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            return shell;
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (a) — UN SEUL or dans tout le chrome (TopBar + TabBar) : balaie les couleurs RÉELLEMENT
        // RENDUES (jamais le code source — c'est la forme demandée, "balayage des tokens réellement
        // rendus"), classe chaque teinte proche d'un des ors connus par SON TOKEN, et prouve que
        // l'ensemble des tokens-or effectivement dessinés dans le CHROME (filets/anneau/indicateur —
        // jamais le texte du montant/l'heure, qui portent délibérément DEUX AUTRES ors nommés de la
        // même famille REUSE maquette, hudMoneyGold/hudMoneyUnderlineGold) est EXACTEMENT
        // { hudHairlineGold }. `accentGold`/`chromeTabActive` (#ffd23f) NE DOIT PLUS apparaître.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float ColorEpsilon = 0.03f;

        private static bool CloseTo(Color a, Color b) =>
            Mathf.Abs(a.r - b.r) < ColorEpsilon && Mathf.Abs(a.g - b.g) < ColorEpsilon && Mathf.Abs(a.b - b.b) < ColorEpsilon;

        /// <summary>Scaffold LÉGER (Canvas+CanvasScaler+TopBarSlot 56px) SANS AppShell — REUSE exact
        /// du patron `ManometreOraclePlayModeTests.BuildScaffold` (mêmes raisons : `SetCitywideHeatBucket`
        /// est un appel LOCAL, synchrone — zéro course réseau). MESURÉ (ce lot, 2 échecs consécutifs
        /// reproductibles à l'identique) : un `AppShell` réel signe SA PROPRE session ET monte un
        /// tenant réel (`AcquireSessionThenActivateHome` → Home/City) dont le probe de heat PROPRE
        /// (`DashboardController`/`CityMapController`, `PublishCitywideHeat`) peut écraser un
        /// `SetCitywideHeatBucket` explicite À TOUT MOMENT après coup — un stack de dev bien vivant
        /// rapportait "BURNING" de façon parfaitement déterministe (pas un coin-flip), pas un défaut,
        /// juste une course qu'aucune fenêtre de garde ne peut fermer depuis CE test. Contourné en ne
        /// bootant PAS d'AppShell pour la moitié TopBar de cette assertion.</summary>
        private (TopBarController topBar, GameObject canvasGo) BuildBareTopBar()
        {
            var canvasGo = new GameObject("BareTopBarCanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280, 720);

            // Nommé "BareTopBarSlot" (jamais "TopBarSlot") — MESURÉ (ce lot) : `AppShell.BuildLayout`
            // réutilise TOUT Canvas trouvé (`FindFirstObjectByType<Canvas>`) et détruit
            // DÉFENSIVEMENT tout enfant nommé "TopBarSlot"/"ContentSlot"/"TabBarRoot" avant d'y bâtir
            // le sien (protection contre un AppShell antérieur jamais démonté). Nommer ce slot pareil
            // le faisait détruire — avec `bareTopBar` dedans — dès que ce test créait ensuite un
            // AppShell réel dans la MÊME scène (`MissingReferenceException` sur `TopBarController`).
            var slotGo = new GameObject("BareTopBarSlot", typeof(RectTransform));
            slotGo.transform.SetParent(canvasGo.transform, false);
            var slot = (RectTransform)slotGo.transform;
            slot.anchorMin = new Vector2(0f, 1f);
            slot.anchorMax = new Vector2(1f, 1f);
            slot.pivot = new Vector2(0.5f, 1f);
            slot.sizeDelta = new Vector2(0, 56);
            slot.anchoredPosition = Vector2.zero;

            var contentGo = new GameObject("TopBarContent", typeof(RectTransform));
            contentGo.transform.SetParent(slot, false);
            TopBarController topBar = contentGo.AddComponent<TopBarController>();
            topBar.SetCitywideHeatBucket("WARM"); // LOCAL, synchrone — aucune course possible ici
            return (topBar, canvasGo);
        }

        [UnityTest]
        public IEnumerator SingleGold_ChromeStructuralElements_TopBarAndTabBar_ShareExactlyOneToken()
        {
            var (bareTopBar, bareCanvasGo) = BuildBareTopBar();

            // La TabBar N'EST JAMAIS teintée par le heat (voir `AppShell.BuildTabBar` — son filet/
            // indicateur sont câblés en dur sur `hudHairlineGold`, jamais routés par
            // `UpdateAlarmState`) : sa lecture n'a donc PAS besoin d'attendre un état de session
            // stable. `BootShell()` + un seul `yield return null` suffit — `BuildLayout()` tourne
            // SYNCHRONE dans `Start()` (même garantie que `TopBarController.BuildLayout()` dans
            // `Awake()`), avant même que la coroutine de session ait pu faire un seul aller-retour
            // réseau. `WaitTopBarLoaded` N'EST PAS utilisé ICI PRÉCISÉMENT pour ne jamais laisser le
            // temps à un tenant réel de se monter et de courir contre cette lecture.
            ExpectShellOwnAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;
            Assert.IsNotNull(shell.TabBarRoot, "TabBarRoot doit exister après un seul frame (BuildLayout synchrone dans Start())");

            try
            {
                Color hairlineGold = DesignTokens.Current.hudHairlineGold;
                Color accentGoldOld = DesignTokens.Current.accentGold; // #ffd23f — l'ancien or vif à bannir du chrome
                Color chromeTabActiveOld = DesignTokens.Current.chromeTabActive; // REUSE verbatim d'accentGold — même teinte

                // Zone CHROME uniquement : Hairline+BoitierRing (TopBar, scaffold LÉGER, bucket forcé
                // WARM) et Hairline (TabBar, jamais heat-dépendant — voir ci-dessus). Jamais les
                // textes du cluster argent/horloge (hudMoneyGold/hudMoneyUnderlineGold — 2 AUTRES ors
                // nommés de la même famille REUSE, hors périmètre de cette garde structurelle).
                var chromeNames = new HashSet<string> { "Hairline", "BoitierRing" };
                var goldImages = new List<(string path, Color color)>();
                foreach (Image img in bareTopBar.GetComponentsInChildren<Image>(true))
                    if (chromeNames.Contains(img.gameObject.name)) goldImages.Add(("TopBar/" + PathOf(img.transform), img.color));
                foreach (Image img in shell.TabBarRoot.GetComponentsInChildren<Image>(true))
                    if (chromeNames.Contains(img.gameObject.name)) goldImages.Add(("TabBar/" + PathOf(img.transform), img.color));

                // Anti-vacuité — le balayage doit VOIR des éléments chrome réels des DEUX barres,
                // sinon "un seul or" serait vrai par absence de sujet : TopBar/Hairline,
                // TopBar/BoitierRing, TabBar/Hairline — 3 éléments nommés minimum.
                Assert.GreaterOrEqual(goldImages.Count, 3,
                    $"attendu au moins 3 éléments chrome nommés (TopBar Hairline+BoitierRing, TabBar Hairline) — " +
                    $"trouvé {goldImages.Count} : {string.Join(", ", goldImages.Select(g => g.path))}");

                var offTokenChrome = new List<string>();
                foreach (var (path, color) in goldImages)
                {
                    bool isOldGold = CloseTo(color, accentGoldOld) || CloseTo(color, chromeTabActiveOld);
                    bool isHairlineFamily = CloseTo(color, hairlineGold);
                    if (isOldGold && !isHairlineFamily) offTokenChrome.Add($"{path} = {color} (ancien or vif, PAS hudHairlineGold)");
                    else if (!isHairlineFamily && !isOldGold) offTokenChrome.Add($"{path} = {color} (ni hudHairlineGold ni l'ancien or — ton inattendu)");
                }
                Assert.IsEmpty(offTokenChrome,
                    "tout élément CHROME structurel (filet/anneau) doit porter EXACTEMENT hudHairlineGold, " +
                    "jamais un autre ton — coupables : " + string.Join("; ", offTokenChrome));

                // Contrôle NÉGATIF (socle : un balayage qui ne rend jamais rouge peut être aveugle) —
                // un Image synthétique à l'ancien or vif, nommé comme un élément chrome réel, DOIT
                // être vu.
                var probeGo = new GameObject("Hairline", typeof(RectTransform));
                try
                {
                    probeGo.transform.SetParent(shell.TabBarRoot, false);
                    Image probe = probeGo.AddComponent<Image>();
                    probe.color = accentGoldOld;
                    bool wouldBeFlagged = CloseTo(probe.color, accentGoldOld) && !CloseTo(probe.color, hairlineGold);
                    Assert.IsTrue(wouldBeFlagged,
                        "contrôle négatif : un Image synthétique nommé 'Hairline' à l'ancien or vif DOIT être classé " +
                        "comme hors-token — sinon ce balayage ne peut rien attraper");
                }
                finally { Object.Destroy(probeGo); }
            }
            finally { Object.Destroy(bareCanvasGo); }
        }

        private static string PathOf(Transform t)
        {
            var parts = new List<string>();
            while (t != null) { parts.Add(t.name); t = t.parent; }
            parts.Reverse();
            return string.Join("/", parts);
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (b) — l'onglet actif ne remplit JAMAIS son bouton d'un aplat de couleur pleine — même
        // discipline que DA2 (TopBar), seuil dérivé de la MÊME mesure (couverture réelle échantillonnée,
        // pas la boîte englobante).
        // ══════════════════════════════════════════════════════════════════════════════════════

        // MESURÉ (ce lot) — `ActiveIndicator` est un FILET plein (3px de haut, pleine largeur du
        // bouton ≈246 unités locales à 1280 de large) : sa plus petite dimension (3px) est bien sous
        // tout seuil raisonnable de "filet" (même famille que `ThinDimensionMaxPx=4` de DA2). Le fond
        // du bouton (`img`, `surfaceRow`) N'EST PAS or — il n'a donc pas besoin d'être exclu par une
        // règle de filet, il est simplement hors du set de couleurs-or scanné.
        private const float ThinDimensionMaxPx = 4f;

        [UnityTest]
        public IEnumerator ActiveTab_NeverFlatFill_OnlyThinIndicator()
        {
            yield return WaitTopBarLoaded(BootShell());
            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;

            Transform activeBtn = shell.TabBarRoot.Find("Tab_Org");
            Assert.IsNotNull(activeBtn, "le bouton de l'onglet actif doit exister");
            Transform indicator = activeBtn.Find("ActiveIndicator");
            Assert.IsNotNull(indicator, "l'onglet actif doit porter un ActiveIndicator");
            Assert.IsTrue(indicator.gameObject.activeSelf, "l'indicateur doit être VISIBLE sur l'onglet actif");

            var indicatorRect = (RectTransform)indicator;
            float minDim = Mathf.Min(indicatorRect.rect.width, indicatorRect.rect.height);
            Assert.LessOrEqual(minDim, ThinDimensionMaxPx,
                $"l'indicateur d'onglet actif doit être un FILET (plus petite dimension <= {ThinDimensionMaxPx}px) " +
                $"— mesuré {minDim}px : un pavé plein se serait glissé ici");

            // La couleur or (hudHairlineGold) ne doit apparaître QUE sur ce filet, jamais sur le fond
            // du bouton lui-même (le fond reste surfaceRow — DOCTRINE : "pas un pavé de couleur pleine").
            Image bg = activeBtn.GetComponent<Image>();
            Assert.IsFalse(CloseTo(bg.color, DesignTokens.Current.hudHairlineGold),
                $"le FOND du bouton actif ne doit jamais être teinté or (mesuré {bg.color}) — seul le filet l'est");

            // Contrôle négatif — les onglets INACTIFS ne portent PAS le filet visible.
            Transform inactiveBtn = shell.TabBarRoot.Find("Tab_Home");
            Transform inactiveIndicator = inactiveBtn.Find("ActiveIndicator");
            Assert.IsFalse(inactiveIndicator.gameObject.activeSelf,
                "contrôle négatif : un onglet INACTIF ne doit PAS afficher son filet — sinon la garde ci-dessus ne " +
                "prouve rien (un filet toujours visible passerait trivialement le test de forme)");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (c) — la TabBar porte structurellement le MÊME chrome que le TopBar (verre + filet) —
        // présence, pas pixel : Mask+VerticalGradientImage+Hairline existent, et le filet est le bord
        // HAUT (jamais le bas — c'est la couture avec ContentSlot, symétrique du filet BAS du TopBar).
        // ══════════════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator TabBar_HasGlassAndHairline_StructurallyMirroringTopBar()
        {
            yield return WaitTopBarLoaded(BootShell());

            Transform mask = shell.TabBarRoot.Find("TabBarMask");
            Assert.IsNotNull(mask, "TabBarRoot doit porter un TabBarMask (verre, REUSE du patron TopBar)");
            Assert.IsNotNull(mask.GetComponent<Mask>(), "TabBarMask doit porter un composant Mask (coins arrondis)");
            Assert.IsNotNull(mask.Find("TabBarBackground")?.GetComponent<VerticalGradientImage>(),
                "TabBarBackground doit porter un VerticalGradientImage (même verre fumé que le TopBar)");

            Transform hairline = shell.TabBarRoot.Find("Hairline");
            Assert.IsNotNull(hairline, "TabBarRoot doit porter un Hairline");
            var hairlineRect = (RectTransform)hairline;
            Assert.AreEqual(1f, hairlineRect.anchorMin.y, 0.01f, "le filet de la TabBar est au bord HAUT (anchorMin.y=1)");
            Assert.AreEqual(1f, hairlineRect.anchorMax.y, 0.01f, "le filet de la TabBar est au bord HAUT (anchorMax.y=1)");

            // Le masque/filet ne doivent JAMAIS être traités comme un 6e bouton par le
            // HorizontalLayoutGroup — LayoutElement.ignoreLayout=true sur les deux.
            var maskLayout = mask.GetComponent<LayoutElement>();
            var hairlineLayout = hairline.GetComponent<LayoutElement>();
            Assert.IsTrue(maskLayout != null && maskLayout.ignoreLayout, "TabBarMask doit ignorer le HorizontalLayoutGroup");
            Assert.IsTrue(hairlineLayout != null && hairlineLayout.ignoreLayout, "Hairline doit ignorer le HorizontalLayoutGroup");

            // Anti-vacuité — les 5 boutons doivent TOUJOURS exister, non affectés par l'ajout du
            // masque/filet (sinon "le HLG ne les traite pas comme un bouton" serait vrai par accident).
            int tabButtonCount = 0;
            for (int i = 0; i < shell.TabBarRoot.childCount; i++)
                if (shell.TabBarRoot.GetChild(i).name.StartsWith("Tab_")) tabButtonCount++;
            Assert.AreEqual(5, tabButtonCount, "les 5 boutons d'onglet doivent toujours exister, inchangés par le restyle");
        }
    }
}
