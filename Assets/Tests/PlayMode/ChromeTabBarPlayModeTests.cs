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
        /// tenant réel (`AcquireSessionThenActivateHome` → Empire/CityMapController, items 0.2/0.3)
        /// dont le probe de heat PROPRE (`CityMapController`, `PublishCitywideHeat`) peut écraser un
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

                // Zone CHROME uniquement : Hairline + BoitierRing (TopBar, scaffold LÉGER, bucket
                // forcé WARM) et ActiveIndicator (le dock). Jamais les textes du cluster
                // argent/horloge (hudMoneyGold/hudMoneyUnderlineGold — 2 AUTRES ors nommés de la
                // même famille REUSE, hors périmètre de cette garde structurelle).
                //
                // ⚠️ `Hairline` A DISPARU DU DOCK, et ce n'est pas une perte pour cette garde : le
                // dock n'est plus une barre (ruling user + canon `hud-brennar.html` l.107-108, les
                // ronds FLOTTENT sur un dégradé). Son élément d'or structurel est désormais le
                // TIRET d'actif — `.pointe` du canon, 14×2 de laiton sous le rond. La garde suit
                // donc l'objet qui porte l'or, pas le nom qu'il portait.
                var chromeNames = new HashSet<string> { "Hairline", "BoitierRing", "ActiveIndicator" };
                var goldImages = new List<(string path, Color color)>();
                foreach (Image img in bareTopBar.GetComponentsInChildren<Image>(true))
                    if (chromeNames.Contains(img.gameObject.name)) goldImages.Add(("TopBar/" + PathOf(img.transform), img.color));
                foreach (Image img in shell.TabBarRoot.GetComponentsInChildren<Image>(true))
                    if (chromeNames.Contains(img.gameObject.name)) goldImages.Add(("TabBar/" + PathOf(img.transform), img.color));

                // Anti-vacuité — le balayage doit VOIR des éléments chrome réels des DEUX barres,
                // sinon "un seul or" serait vrai par absence de sujet : TopBar/Hairline,
                // TopBar/BoitierRing, TabBar/Hairline — 3 éléments nommés minimum.
                // Anti-vacuité — le balayage doit VOIR des éléments chrome réels des DEUX barres.
                // Le dock en porte QUATRE (un tiret par bulle, un seul visible à la fois — la garde
                // les scanne inactifs compris, ce qui est voulu : leur COULEUR doit être juste même
                // masquée, sinon le défaut apparaîtrait au premier changement d'onglet).
                Assert.GreaterOrEqual(goldImages.Count, 3,
                    $"attendu au moins 3 éléments chrome nommés (TopBar Hairline + BoitierRing, " +
                    $"les tirets d'actif du dock) — trouvé {goldImages.Count} : " +
                    $"{string.Join(", ", goldImages.Select(g => g.path))}");

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

            // ⛔ CE SEUIL ÉTAIT UN NOMBRE ABSOLU DANS UN MONDE QUI A CHANGÉ D'ÉCHELLE, et il a
            // rougi sur un tiret PARFAITEMENT CONFORME : 2 px CSS du canon rendus à 6,12 px depuis
            // que le dock est à la taille de la maquette. Le relever à 7 aurait été le pire des
            // trois gestes possibles — la garde ne protégerait alors plus de rien à la prochaine
            // résolution, et elle rougirait à nouveau au prochain changement d'échelle.
            //   ⇒ La propriété voulue n'a jamais été « ≤ 4 px » : c'est « c'est un FILET, pas un
            //     pavé ». Un filet se reconnaît à son ÉLANCEMENT et à sa petitesse RELATIVE au rond
            //     qu'il souligne — deux grandeurs SANS UNITÉ, donc vraies à toute résolution.
            //     Le canon donne `.pointe{width:14px;height:2px}` sur un `.rond` de 46 :
            //     élancement 7,0 et épaisseur 4,3 % du rond.
            var indicatorRect = (RectTransform)indicator;
            float minDim = Mathf.Min(indicatorRect.rect.width, indicatorRect.rect.height);
            float maxDim = Mathf.Max(indicatorRect.rect.width, indicatorRect.rect.height);
            Assert.Greater(minDim, 0f, "anti-vacuité — un indicateur de dimension nulle satisferait " +
                "trivialement tout plafond d'épaisseur, et ne se verrait pas non plus");

            float elancement = maxDim / minDim;
            Assert.GreaterOrEqual(elancement, 4f,
                $"l'indicateur doit être un FILET, pas un pavé : élancement mesuré {elancement:F2} " +
                $"({maxDim:F1} × {minDim:F1}) — le canon donne 14×2, soit 7,0");

            Transform rond = activeBtn.Find("Rond");
            Assert.IsNotNull(rond, "le rond de la bulle doit exister — c'est le témoin d'échelle du filet");
            float cote = ((RectTransform)rond).rect.height;
            Assert.Greater(cote, 0f, "anti-vacuité — un rond de côté nul rendrait le rapport infini");
            float partDuRond = minDim / cote;
            Assert.LessOrEqual(partDuRond, 0.12f,
                $"l'épaisseur du filet doit rester une FRACTION du rond qu'il souligne : mesuré " +
                $"{partDuRond * 100f:F1} % ({minDim:F1} sur {cote:F1}) — le canon donne 2/46 = 4,3 %");

            // La couleur or (hudHairlineGold) ne doit apparaître QUE sur ce filet, jamais sur le fond
            // du bouton lui-même (le fond reste surfaceRow — DOCTRINE : "pas un pavé de couleur pleine").
            Image bg = activeBtn.GetComponent<Image>();
            Assert.IsFalse(CloseTo(bg.color, DesignTokens.Current.hudHairlineGold),
                $"le FOND du bouton actif ne doit jamais être teinté or (mesuré {bg.color}) — seul le filet l'est");

            // Contrôle négatif — les onglets INACTIFS ne portent PAS le filet visible. `Tab_Empire`
            // (items 0.2/0.3 — fusion de l'ancien `Tab_Home`) est l'onglet par défaut au boot, donc
            // le premier inactif dès qu'on bascule sur Org.
            Transform inactiveBtn = shell.TabBarRoot.Find("Tab_Empire");
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

            // ⚠️⚠️ CETTE GARDE A CHANGÉ DE SUJET, SUR RULING USER (2026-08-25) : « tu vois bien que
            // ce sont des BULLES et pas une barre ». Elle exigeait un verre à coins arrondis et un
            // filet laiton, « par symétrie avec le bandeau haut » — une doctrine que NOUS avions
            // écrite en croyant que la maquette n'avait aucune barre d'onglets. Elle en a une, et
            // le canon (`hud-brennar.html` l.107-108) lui donne pour tout fond
            // `linear-gradient(180deg, transparent, #070b12d8 40%)` : les ronds FLOTTENT.
            //
            // ⇒ Le socle est explicite sur ce cas : une garde qu'on ne peut satisfaire qu'en
            // rétablissant le défaut ne s'assouplit pas, elle se REMPLACE par la propriété que le
            // NOUVEAU dispositif garantit. Ici : le dock ne laisse RIEN voir du décor sous lui
            // jusqu'au bord de l'écran — c'est ce que l'assise garantissait, et c'est la seule
            // propriété qui comptait vraiment (un juge avait mesuré un liseré teal fuyant sur les
            // 6 dernières lignes, dont la couleur changeait selon l'art derrière).
            Transform fondu = shell.TabBarRoot.Find("DockFondu");
            Assert.IsNotNull(fondu, "le dock doit porter son DockFondu (le dégradé du canon)");
            var fonduRect = (RectTransform)fondu;
            Assert.IsNotNull(fondu.GetComponent<UnityEngine.UI.Image>(), "DockFondu doit peindre");
            Assert.LessOrEqual(fonduRect.offsetMin.y, 0f,
                $"le dégradé du dock doit descendre JUSQU'AU BORD BAS (offsetMin.y = {fonduRect.offsetMin.y:F1}) — " +
                "s'il s'arrête avant, il rouvre l'interstice par lequel le décor du district fuyait.");
            Assert.AreEqual(0f, fonduRect.offsetMax.y, 0.01f, "et il part du haut du dock");

            // ⛔ ET CE QUI NE DOIT PLUS EXISTER — sinon on aurait ajouté le dégradé SANS retirer la
            // barre, et l'écran porterait les deux.
            Assert.IsNull(shell.TabBarRoot.Find("TabBarAssise"), "plus d'assise opaque : ce sont des bulles");
            Assert.IsNull(shell.TabBarRoot.Find("TabBarMask"), "plus de verre à coins arrondis");
            Assert.IsNull(shell.TabBarRoot.Find("Hairline"), "plus de filet laiton sur le dock");

            // Le dégradé ne doit JAMAIS être traité comme une bulle de plus par le
            // HorizontalLayoutGroup — `LayoutElement.ignoreLayout`.
            var fonduLayout = fondu.GetComponent<LayoutElement>();
            Assert.IsTrue(fonduLayout != null && fonduLayout.ignoreLayout,
                "DockFondu doit ignorer le HorizontalLayoutGroup, sinon il compte comme une bulle");

            // ⛔ ANTI-VACUITÉ — QUATRE bulles, ni plus ni moins. Canon §6 : « 4 ronds gravés, sans
            // la Carte ». Sans ce compte, retirer le dégradé de la mesure ci-dessus serait vrai
            // par accident sur un dock vide.
            int tabButtonCount = 0;
            for (int i = 0; i < shell.TabBarRoot.childCount; i++)
                if (shell.TabBarRoot.GetChild(i).name.StartsWith("Tab_")) tabButtonCount++;
            Assert.AreEqual(4, tabButtonCount,
                "le dock porte QUATRE bulles (canon §6 : la Carte en sort, on est déjà dessus)");

            // Et chaque bulle porte son ROND — sans lui, « 4 bulles » serait vrai pour 4 libellés nus.
            for (int i = 0; i < shell.TabBarRoot.childCount; i++)
            {
                Transform b = shell.TabBarRoot.GetChild(i);
                if (!b.name.StartsWith("Tab_")) continue;
                Assert.IsNotNull(b.Find("Rond"), $"{b.name} doit porter son Rond (la bulle du canon)");
            }
        }
    }
}
