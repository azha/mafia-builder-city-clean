using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // Retour user relayé par le contrôleur (2026-08-21) : « `Screen.safeArea`, ta trouvaille…
    // traite-la maintenant. » MESURÉ (même lot) : 0 occurrence de `safeArea` dans tout
    // `Assets/Scripts/` avant ce correctif — `TopBarSlot`/`TabBarRoot` étaient ancrés
    // ABSOLUMENT aux bords du canvas, sans réserver l'espace d'une encoche caméra ou d'une barre
    // de gestes système.
    //
    // MONDE DÉGÉNÉRÉ À TUER (nommé explicitement par le contrôleur) : un test qui passe
    // seulement parce que la zone sûre vaut zéro dans l'éditeur — `Screen.safeArea` en Play Mode
    // Editor est TOUJOURS le plein écran (aucune encoche à simuler). `AppShell.SafeAreaProvider`
    // est le seam qui permet de FORCER une zone sûre non nulle sans appareil physique — ce fichier
    // couvre les DEUX régimes explicitement, jamais un seul.
    [Category("HUDv31")]
    public class ChromeSafeAreaPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            // Reset OBLIGATOIRE — sinon un provider forcé fuit vers le test SUIVANT, sans rapport
            // (même piège que `LogAssert.ignoreFailingMessages`, déjà réinitialisé partout ailleurs
            // dans ce fichier de tests).
            AppShell.SafeAreaProvider = () => Screen.safeArea;
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false;
        }

        private static void ExpectShellOwnAuthNoise() => LogAssert.ignoreFailingMessages = true;

        private AppShell BootShell()
        {
            ExpectShellOwnAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            return shell;
        }

        // Anti-vacuité — le canvas doit avoir une largeur RÉELLE (même garde que DA1 côté TopBar) :
        // sinon un décalage nul serait vrai par dégénérescence (canvas jamais mis en page), pas par
        // absence réelle d'encoche.
        private static void AssertCanvasIsReal(RectTransform slot) =>
            Assert.Greater(slot.rect.width, 200f, "anti-vacuité : le slot doit avoir une largeur réelle mesurée");

        [UnityTest]
        public IEnumerator SafeArea_ZeroInset_TopBarAndTabBar_FlushToScreenEdges()
        {
            // RÉGIME 1 — le défaut de l'éditeur (aucun override) : safeArea == plein écran, 0 inset.
            // Non-régression EXPLICITE : le chrome doit rester exactement où il était avant ce
            // correctif si l'appareil n'a pas d'encoche.
            AppShell shellInstance = BootShell();
            yield return null; // BuildLayout() synchrone dans Start()

            AssertCanvasIsReal(shellInstance.TopBarSlot);
            Assert.AreEqual(0f, shellInstance.TopBarSlot.anchoredPosition.y, 0.01f,
                "sans encoche, TopBarSlot reste flush au bord haut (inset 0)");
            Assert.AreEqual(0f, shellInstance.TabBarRoot.anchoredPosition.y, 0.01f,
                "sans encoche, TabBarRoot reste flush au bord bas (inset 0)");
        }

        [UnityTest]
        public IEnumerator SafeArea_NonZeroInset_TopBarAndTabBar_ShiftByExactConvertedInset()
        {
            // RÉGIME 2 — CONTRÔLE POSITIF : force une zone sûre non nulle (encoche haute 60px écran
            // + barre de gestes basse 40px écran), AVANT que le shell ne construise son layout.
            const float notchPx = 60f;
            const float gestureBarPx = 40f;
            float screenW = Screen.width, screenH = Screen.height;
            AppShell.SafeAreaProvider = () => new Rect(0f, gestureBarPx, screenW, screenH - notchPx - gestureBarPx);

            AppShell shellInstance = BootShell();
            yield return null;

            AssertCanvasIsReal(shellInstance.TopBarSlot);

            // Conversion attendue : `matchWidthOrHeight=0` (vérifié ailleurs dans ce lot) ⇒ facteur
            // d'échelle = Screen.width / 1280. Inset LOCAL = inset ÉCRAN / facteur.
            float scaleFactor = screenW / 1280f;
            float expectedTopInsetLocal = notchPx / scaleFactor;
            float expectedBottomInsetLocal = gestureBarPx / scaleFactor;

            Assert.AreEqual(-expectedTopInsetLocal, shellInstance.TopBarSlot.anchoredPosition.y, 0.5f,
                $"TopBarSlot doit descendre EXACTEMENT de l'inset haut converti ({expectedTopInsetLocal:F2} " +
                "unités locales) — sinon la zone sûre n'est pas vraiment appliquée");
            Assert.AreEqual(expectedBottomInsetLocal, shellInstance.TabBarRoot.anchoredPosition.y, 0.5f,
                $"TabBarRoot doit monter EXACTEMENT de l'inset bas converti ({expectedBottomInsetLocal:F2} " +
                "unités locales) — sinon la zone sûre n'est pas vraiment appliquée");

            // Double témoin — coins MONDE (mêmes précautions que DA1 : un anchor correct pourrait
            // coexister avec un offset qui le contredit).
            var topCorners = new Vector3[4];
            shellInstance.TopBarSlot.GetWorldCorners(topCorners);
            Assert.LessOrEqual(topCorners[1].y, screenH - notchPx + 0.5f,
                "le bord HAUT du TopBarSlot ne doit jamais dépasser dans l'encoche simulée");

            var tabCorners = new Vector3[4];
            shellInstance.TabBarRoot.GetWorldCorners(tabCorners);
            Assert.GreaterOrEqual(tabCorners[0].y, gestureBarPx - 0.5f,
                "le bord BAS du TabBarRoot ne doit jamais empiéter sur la barre de gestes simulée");
        }

        [UnityTest]
        public IEnumerator SafeArea_ProviderReset_DoesNotLeakBetweenTests()
        {
            // Contrôle NÉGATIF du seam lui-même (socle : un mécanisme de test peut fuir en silence) —
            // si le TearDown précédent n'avait pas réinitialisé le provider, CE test verrait encore
            // l'inset forcé du test précédent alors qu'il n'en pose AUCUN.
            AppShell shellInstance = BootShell();
            yield return null;
            Assert.AreEqual(0f, shellInstance.TopBarSlot.anchoredPosition.y, 0.01f,
                "un test qui ne force RIEN doit voir le provider par défaut (0 inset) — pas une fuite " +
                "du test précédent");
        }
    }
}
