using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ㉕ — SONDE RÉDUITE DU SEAM (lot « redimensionnement », design §5).
    //
    // CE QU'ELLE DÉCIDE, et rien d'autre : ce que le chunk R4 doit couvrir CÔTÉ ZONE SÛRE. Le §5
    // pose que `AppShell.SafeAreaProvider` permet d'obtenir des valeurs de zone sûre DISTINCTES aux
    // deux points de mesure **sans toucher la production**. Si c'est vrai, R4 n'a pas à traiter la
    // zone sûre ; si c'est faux, il le doit.
    //
    // ⛔ POURQUOI ELLE EST MESURABLE ALORS QUE ⑤ ⑮ ㉙ NE LE SONT PAS (mesuré 2026-09-01).
    //    `AppShell.SafeAreaInsetsLocal()` recalcule `scaleFactor = Screen.width / 1280` au lieu de
    //    lire le canvas. Sous la seule voie de rendu multi-résolution du dépôt (caméra →
    //    RenderTexture), le canvas suit la texture cible et `Screen.width` reste celui du Game
    //    View : toute VALEUR ABSOLUE d'inset y serait hybride. **Cette sonde-ci mesure une
    //    DIFFÉRENCE entre deux valeurs de provider, et le facteur fautif est COMMUN aux deux
    //    termes, donc il se simplifie.** Une grandeur fausse partagée par les deux membres d'une
    //    différence ne fausse pas la différence — elle fausse toute valeur absolue.
    //
    // ⚠️ ET CET ARGUMENT NE COUVRE QUE LE FACTEUR MULTIPLICATIF — la revue ⊥ l'a relevé et elle a
    //    raison. `topPx = Mathf.Max(0f, screenH - safeArea.yMax)` fait entrer `screenH`
    //    ADDITIVEMENT, et les deux insets traversent une SATURATION. Deux providers dont les deux
    //    `screenH - yMax` seraient négatifs rendraient (0, 0) des DEUX côtés : distinction
    //    détruite, et la sonde verte pour la mauvaise raison. *Un plancher est une hypothèse sur le
    //    SIGNE et le DOMAINE de ce qui le traverse.* ⇒ La non-saturation est ASSERTÉE, pas supposée.
    [Category("Charpente")]
    public class RedimensionnementSondeSeamPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            // Reset OBLIGATOIRE : un provider forcé fuit vers le test suivant, sans rapport.
            AppShell.SafeAreaProvider = () => Screen.safeArea;
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false;
        }

        private AppShell BootShell()
        {
            LogAssert.ignoreFailingMessages = true; // le shell tente sa propre auth : bruit attendu
            shellGo = new GameObject("ShellSondeSeam");
            shell = shellGo.AddComponent<AppShell>();
            return shell;
        }

        /// Un point de mesure : monte le shell sous un provider donné et rend les insets publiés.
        ///
        /// ⛔⛔ CE QUE LA v1 DE CETTE SONDE MESURAIT — RIEN, ET ELLE RENDAIT UN ROUGE CRÉDIBLE
        ///    (mesuré au premier run réel, 2026-09-01). Elle posait le provider, montait le shell,
        ///    attendait UNE frame et lisait `ShellChrome.TopInsetPx`. Les deux points ont rendu
        ///    **exactement** `top=274,970 · bottom=294,433` — et l'arithmétique réfute les deux :
        ///    à `Screen=640×480` le point A impose un `topSafe` local de 120 et le point B de 280.
        ///    **274,970 est la valeur à `topSafe = 0`**, c'est-à-dire celle du provider PAR DÉFAUT.
        ///    ⇒ Deux causes, toutes deux fatales : `PublierInsetsDuChrome()` s'exécute APRÈS
        ///      l'acquisition asynchrone de session du shell — bien au-delà d'une frame — et
        ///      `ShellChrome.TopInsetPx` est **statique**, donc il portait la valeur laissée par
        ///      l'un des 260 autres tests du même processus.
        ///    ⇒ La sonde n'a jamais observé son propre provider. Elle a conclu « le seam ne
        ///      produit pas d'inset distinct » sur **deux lectures d'une valeur étrangère
        ///      identique à elle-même**. *Une égalité parfaite est la signature d'une
        ///      dégénérescence, pas un résultat.*
        ///    ⇒ RÉPARATION : ne jamais asserter une DIFFÉRENCE avant d'avoir prouvé qu'une MESURE
        ///      a eu lieu. On épingle la valeur AVANT le montage, on attend qu'elle CHANGE, et
        ///      l'absence de changement est un échec NOMMÉ — distinct de « pas distinct ».
        private IEnumerator MesurerInsets(float notchPx, float gestureBarPx,
                                          System.Action<float, float> rendu)
        {
            float screenW = Screen.width, screenH = Screen.height;
            AppShell.SafeAreaProvider = () => new Rect(0f, gestureBarPx, screenW,
                                                       screenH - notchPx - gestureBarPx);

            AppShell inst = BootShell();

            // ⛔⛔ ON NE LIT PLUS LE STATIQUE — r2 a prouvé qu'il ne bouge JAMAIS sous un montage nu
            //    (240 frames, zéro delta) : `PublierInsetsDuChrome()` vit sur des chemins de
            //    session/reconstruction (`AppShell.cs:552`, `:1373`) qu'une sonde ne déclenche pas,
            //    et `ShellChrome.*InsetPx` est STATIQUE, donc pollué par les 260 autres tests.
            //    ⇒ On lit la grandeur d'INSTANCE que le seul test du dépôt exerçant ce seam lit
            //      déjà (`ChromeSafeAreaPlayModeTests`) : la position ancrée des deux barres. Elle
            //      appartient au shell qu'on vient de monter ⇒ **structurellement** immunisée
            //      contre la pollution, et peuplée une frame après le montage.
            //    ★ Ce dispositif existait dans le dépôt avant que j'écrive le mien. Deuxième fois
            //      ce soir : *avant d'écrire un instrument, chercher qui exerce déjà la couture.*
            yield return null; // BuildLayout() est synchrone dans Start() — une frame suffit ICI

            Assert.IsNotNull(inst.TopBarSlot, "TopBarSlot absent : le shell n'a pas construit son layout");
            Assert.IsNotNull(inst.TabBarRoot, "TabBarRoot absent : le shell n'a pas construit son layout");
            Assert.IsNotNull(inst.ShellCanvas, "aucun canvas : rien n'a été monté, la lecture serait vide");

            // Convention de signe lue sur le test existant : la barre du haut descend (y négatif),
            // celle du bas monte (y positif). L'inset est donc la valeur absolue de chacune.
            float top = -inst.TopBarSlot.anchoredPosition.y;
            float bottom = inst.TabBarRoot.anchoredPosition.y;

            Debug.Log($"[㉕] notch={notchPx} gestes={gestureBarPx} -> topLocal={top:F3} bottomLocal={bottom:F3} " +
                      $"(Screen={Screen.width}x{Screen.height}, canvas.scaleFactor={inst.ShellCanvas.scaleFactor:F4})");

            rendu(top, bottom);

            // ⛔ `Object.Destroy` est DIFFÉRÉ à la fin de frame. Sans cette frame, le montage
            //    SUIVANT trouve le canvas du précédent via `FindFirstObjectByType<Canvas>()`, s'y
            //    lie, puis le voit disparaître ⇒ `MissingReferenceException` au point B (mesuré au
            //    run r3 : le point A avait rendu sa mesure, le point B est mort sur l'objet détruit
            //    du point A). *Une destruction demandée n'est pas une destruction faite.*
            TearDown();
            yield return null;
        }

        [UnityTest]
        public IEnumerator Sonde_DeuxProviders_RendentDesInsetsDISTINCTS_SansToucherLaProduction()
        {
            float topA = 0f, bottomA = 0f, topB = 0f, bottomB = 0f;

            yield return MesurerInsets(60f, 40f, (t, b) => { topA = t; bottomA = b; });
            yield return MesurerInsets(140f, 90f, (t, b) => { topB = t; bottomB = b; });

            Debug.Log($"[㉕] point A (notch 60, gestes 40) -> top={topA:F3} bottom={bottomA:F3}");
            Debug.Log($"[㉕] point B (notch 140, gestes 90) -> top={topB:F3} bottom={bottomB:F3}");
            Debug.Log($"[㉕] Screen={Screen.width}x{Screen.height}");

            // ── GARDE ANTI-SATURATION, exigée AVANT la distinction ────────────────────────────
            // Le monde dégénéré à tuer nommément : les deux points saturent le `Mathf.Max(0f, …)`
            // et rendent (0,0) des deux côtés. La distinction serait alors fausse pour une raison
            // SANS RAPPORT avec le seam. Ce n'est pas un seuil choisi : zéro est exactement la
            // valeur que la saturation produit.
            Assert.Greater(topA, 0f, "point A saturé en haut — la sonde ne mesure plus le seam");
            Assert.Greater(topB, 0f, "point B saturé en haut — la sonde ne mesure plus le seam");
            Assert.Greater(bottomA, 0f, "point A saturé en bas");
            Assert.Greater(bottomB, 0f, "point B saturé en bas");

            // ── CE QUE ㉕ DÉCIDE ──────────────────────────────────────────────────────────────
            Assert.AreNotEqual(topA, topB,
                "le seam ne produit PAS d'inset haut distinct ⇒ R4 DOIT couvrir la zone sûre");
            Assert.AreNotEqual(bottomA, bottomB,
                "le seam ne produit PAS d'inset bas distinct ⇒ R4 DOIT couvrir la zone sûre");

            // ── ET LA DIFFÉRENCE EST-ELLE CELLE QU'ON ATTEND ? ────────────────────────────────
            // Le facteur est commun aux deux points, donc le RAPPORT des écarts est indépendant de
            // lui : (140-60)/(90-40) = 80/50 = 1,6 quel que soit `Screen.width`. C'est la propriété
            // qui survit à la voie RenderTexture, et l'asserter la rend opposable.
            float ecartTop = topB - topA, ecartBottom = bottomB - bottomA;
            Assert.Greater(ecartBottom, 0.0001f, "écart bas nul — rapport indéfini");
            Assert.AreEqual(80f / 50f, ecartTop / ecartBottom, 0.01f,
                "le rapport des écarts doit être invariant au facteur d'échelle — s'il ne l'est " +
                "pas, la conversion ne se simplifie PAS et l'argument de survie de ㉕ tombe");

            Debug.Log($"[㉕] VERDICT : le seam SUFFIT — écarts top={ecartTop:F3} bottom={ecartBottom:F3}, " +
                      $"rapport={ecartTop / ecartBottom:F4} (attendu 1,6000). " +
                      "R4 n'a PAS à couvrir la zone sûre ; son objet reste le facteur d'échelle.");
        }
    }
}
