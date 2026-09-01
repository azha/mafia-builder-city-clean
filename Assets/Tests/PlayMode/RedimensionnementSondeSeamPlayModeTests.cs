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

            // Sentinelle : la valeur statique AVANT tout montage. Si elle ne bouge pas, rien n'a
            // été publié et toute lecture ultérieure est celle d'un test voisin.
            float avantTop = ShellChrome.TopInsetPx, avantBottom = ShellChrome.BottomInsetPx;

            BootShell();

            // Attente BORNÉE d'une publication réelle. Une frame ne suffit pas : la republication
            // des insets suit l'acquisition de session, qui est asynchrone.
            const int framesMax = 240;
            int frames = 0;
            while (frames < framesMax
                   && Mathf.Approximately(ShellChrome.TopInsetPx, avantTop)
                   && Mathf.Approximately(ShellChrome.BottomInsetPx, avantBottom))
            {
                frames++;
                yield return null;
            }

            Debug.Log($"[㉕] montage notch={notchPx} gestes={gestureBarPx} : publication après " +
                      $"{frames} frame(s) — avant=({avantTop:F3},{avantBottom:F3}) " +
                      $"après=({ShellChrome.TopInsetPx:F3},{ShellChrome.BottomInsetPx:F3})");

            Assert.Less(frames, framesMax,
                $"AUCUNE publication d'insets en {framesMax} frames sous ce provider : la sonde n'a " +
                "pas observé son propre montage. Ce n'est PAS « le seam ne suffit pas » — c'est une " +
                "mesure qui n'a pas eu lieu, et la distinguer des deux est tout l'objet de cette garde.");

            rendu(ShellChrome.TopInsetPx, ShellChrome.BottomInsetPx);
            TearDown();
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
