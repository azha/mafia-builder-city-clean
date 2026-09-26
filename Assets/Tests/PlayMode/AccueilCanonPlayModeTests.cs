using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Tests;               // ProductionClickSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // L'ACCUEIL ④ CANON — UNE SEULE MISE EN PAGE (passe UX du 26/09, rapport §G P1 : « l'écran d'ouverture est illisible : deux mises
    // en page superposées », la minute 0 du joueur). Le shell montait le tableau de bord (sa feuille « ACCUEIL · Portefeuille · Chaleur ·
    // Alertes ») PUIS quatre panneaux par-dessus (tête, file, vitaux, chrome). Canon `ecrans-brennar-accueil.html`, cadres 0-2 : une zone
    // de tête et la ligne de file.
    //   A0  contrôle POSITIF du prédicat « texte de développeur » : les textes relevés sur la planche du §G sont VUS, ceux du canon non
    //   A1  au LANCEMENT (vrai shell, branche d'échec de l'acquisition : port fermé, hors réseau) : EXACTEMENT la tête et la file ; ni
    //       vitaux ni chrome ; la feuille éteinte ; les deux bandes disjointes ; sans carte, aucun geste ; aucun texte de développeur
    //   A2  rouvert par G1 (Empire sur la carte) : la MÊME mise en page — les trois sites passent par `AppShell.MonterLAccueil`
    [Category("AccueilCanon")]
    public class AccueilCanonPlayModeTests
    {
        /// <summary>Un texte qui trahit l'atelier : entre crochets, un nom de type, un code SCREAMING_SNAKE, ou un mot anglais du prototype
        /// (relevés sur la planche du §G). Partagé avec la garde C2 de la Charpente (le même prédicat sur le monde seedé).</summary>
        internal static bool TexteDeDeveloppeur(string t)
        {
            if (string.IsNullOrEmpty(t)) return false;
            if (Regex.IsMatch(t, @"\[[^\]]*\]")) return true;                       // [LoadingState]
            if (Regex.IsMatch(t, @"\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b")) return true;     // AUTONOMY_REPORTS_PENDING
            return Regex.IsMatch(t, @"\b(Skip|COMMIT|Type|Loading|Friction|Tension|Cohesion|Heat|Unavailable|Light|Calm|Commit|Confirm)\b");
        }

        private GameObject shellGo;
        private AppShell shell;
        private HashSet<GameObject> racinesAvant;

        [SetUp]
        public void SetUp()
        {
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            AdresseDuBack.PoserPourTest("http://127.0.0.1:9");   // port FERMÉ : l'acquisition échoue vite, la branche d'échec monte l'Accueil
        }

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            if (racinesAvant != null)
                foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                    Object.DestroyImmediate(g);
            racinesAvant = null;
            AdresseDuBack.Oublier();
            EtatPublieParLeShell.RendrePourTest();
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            LogAssert.ignoreFailingMessages = false;
        }

        [Test]
        public void A0_LePredicat_VoitLesTextesDuParagrapheG_EtPasCeuxDuCanon()
        {
            foreach (string fautif in new[] { "[LoadingState]", "Skip", "Type \"COMMIT\"", "Friction: Light", "Tension: Calm",
                                              "AUTONOMY_REPORTS_PENDING", "Tamponner — appui long [x]" })
                Assert.IsTrue(TexteDeDeveloppeur(fautif), fautif);
            foreach (string juste in new[] { "Rien à signaler", "Aucune décision en attente", "Lt. Quist attend vos ordres", "trancher",
                                             "Prendre acte", "Pas maintenant", "Personne ne fait la queue — la routine tient" })
                Assert.IsFalse(TexteDeDeveloppeur(juste), juste);
        }

        private IEnumerator AttendreLAccueil()
        {
            float t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 15f
                   && (shell.ContentSlot == null || shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(false) == null))
                yield return null;
            yield return null;
            yield return null;   // deux frames de plus : un panneau de TROP monté après les attendus serait vu
            Canvas.ForceUpdateCanvases();
        }

        private static (float bas, float haut) Bande(RectTransform rt)
        {
            var c = new Vector3[4];
            rt.GetWorldCorners(c);
            return (c[0].y, c[1].y);
        }

        private void VerifierUneSeuleMiseEnPage(string quand)
        {
            HighestLeverageCardController tete = shell.ContentSlot.GetComponentsInChildren<HighestLeverageCardController>(false).LastOrDefault();
            ExceptionQueuePanelController file = shell.ContentSlot.GetComponentsInChildren<ExceptionQueuePanelController>(false).LastOrDefault();
            Assert.IsNotNull(tete, $"{quand} : la zone de tête est montée");
            Assert.IsNotNull(file, $"{quand} : la ligne de file est montée");
            Assert.AreEqual(1, shell.ContentSlot.GetComponentsInChildren<HighestLeverageCardController>(false).Length, $"{quand} : UNE zone de tête");
            Assert.AreEqual(1, shell.ContentSlot.GetComponentsInChildren<ExceptionQueuePanelController>(false).Length, $"{quand} : UNE file");
            Assert.IsNull(shell.ContentSlot.GetComponentInChildren<OrgVitalsPanelController>(true), $"{quand} : les vitaux ne sont PAS sur l'Accueil");
            Assert.IsNull(shell.ContentSlot.GetComponentInChildren<HomeChromeController>(true), $"{quand} : le chrome n'est PAS sur l'Accueil");

            DashboardController accueil = shell.ContentSlot.GetComponentsInChildren<DashboardController>(true).LastOrDefault();
            Assert.IsNotNull(accueil, $"{quand} : le fond de l'Accueil (DashboardController) est monté");
            Assert.IsTrue(accueil.FeuilleMasquee, $"{quand} : la feuille du tableau de bord est déclarée éteinte");
            foreach (Transform t in shell.ContentSlot.GetComponentsInChildren<Transform>(true).Where(x => x.name == "DashboardSheet"))
                Assert.IsFalse(t.gameObject.activeInHierarchy, $"{quand} : la feuille « ACCUEIL · Portefeuille · Chaleur · Alertes » n'est pas visible");

            (float basTete, float _) = Bande((RectTransform)tete.transform);
            (float _, float hautFile) = Bande((RectTransform)file.transform);
            Assert.Greater(basTete, hautFile, $"{quand} : les bandes de la tête et de la file sont DISJOINTES (tête dès {basTete}, file jusqu'à {hautFile})");

            Assert.AreEqual(HighestLeverageCardController.CardState.NoCard, tete.RenderedState, $"{quand} : précondition, pas de carte (hors réseau)");
            foreach (string geste in new[] { "CommitButton", "SkipButton", "TypedConfirmRow" })
                foreach (Transform t in tete.GetComponentsInChildren<Transform>(true).Where(x => x.name == geste))
                    Assert.IsFalse(t.gameObject.activeInHierarchy, $"{quand} : sans carte, « {geste} » n'est pas montré (des gestes sur rien)");

            var textes = new List<string>();
            foreach (Component hote in new Component[] { tete, file })
                textes.AddRange(hote.GetComponentsInChildren<TMPro.TextMeshProUGUI>(false).Select(x => x.text).Where(x => !string.IsNullOrEmpty(x)));
            Assert.IsNotEmpty(textes, $"{quand} : anti-vacuité, l'Accueil rend des textes");
            var fautifs = textes.Where(TexteDeDeveloppeur).ToList();
            Assert.IsEmpty(fautifs, $"{quand} : texte de développeur ou anglais : [" + string.Join(" | ", fautifs) + "] — vus : [" + string.Join(" | ", textes) + "]");
        }

        [UnityTest]
        public IEnumerator A1_AuLancement_UneSeuleMiseEnPage_EtAucunTexteDeDeveloppeur()
        {
            LogAssert.ignoreFailingMessages = true;   // l'acquisition vers un port fermé journalise son échec : attendu, hors mesure
            shellGo = new GameObject("AppShell_AccueilCanon");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            Assert.IsTrue(string.IsNullOrEmpty(shell.Token), "précondition : branche d'ÉCHEC de l'acquisition (hors réseau)");
            VerifierUneSeuleMiseEnPage("au lancement");

            // A2 — refermé par le retour, rouvert par G1 : la même mise en page.
            Assert.AreEqual("surimpression", shell.Depiler(), "le retour referme l'Accueil");
            yield return null;
            Transform empire = shell.TabBarRoot.Find("Tab_Empire");
            ProductionClickSupport.Click(empire.GetComponent<UnityEngine.UI.Button>());
            yield return AttendreLAccueil();
            VerifierUneSeuleMiseEnPage("rouvert par Empire (G1)");
        }
    }
}
