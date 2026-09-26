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
    //   A4  G4 (suivi ⊥ UX §I, 26/09) : avec une carte, AUCUNE surface tactile (la surface B6 posée sur la racine de la carte) ne
    //       recouvre un geste de la tête — mesuré au RAYCAST au centre de chaque geste montré ; « La carte » de l'ancienne feuille n'est
    //       plus sur l'Accueil (feuille éteinte, dbf8e71b) : le chevauchement déduit par la passe n'a plus d'objet
    //   A5  suivi ⊥ UX §I (26/09) : pas de carte à fort levier mais une file ⇒ la FILE SEULE, en haut, sans « Rien à signaler » qui la
    //       démente ; sa ligne porte « trancher » ; garde géométrique (départ en haut, écarts ≤ 5 %) aussi en A1/A2
    //   A3  G1 (suivi ⊥ UX §I, 26/09) : l'Accueil rouvert RELIT la tête et la file (session/open recalcule hl_card) — une carte
    //       RÉGLÉE depuis le lancement ne revient pas « en attente » ; la réponse périmée du lancement n'est jamais remontrée
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
            VerifierGeometrie(quand, (RectTransform)tete.transform, (RectTransform)file.transform);

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

        private sealed class TransportTemoin : ITransportDeSession
        {
            public int Ouvertures;
            public SessionOpenDto Reponse;
            public IEnumerator Fermer(string jeton, System.Action<long, string> echec) { yield break; }
            public IEnumerator Ouvrir(string jeton, System.Action<SessionOpenDto> ok, System.Action<long, string> echec)
            {
                Ouvertures++;
                ok(Reponse);
                yield break;
            }
        }

        private static void Poser<T>(object cible, string propriete, T valeur) =>
            typeof(AppShell).GetField($"<{propriete}>k__BackingField", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)
                .SetValue(cible, valeur);

        private static SessionOpenDto AvecCarte(string id) => new SessionOpenDto
        {
            session_id = "s", hl_card = id == null ? null : new HlCardDto { card_id = id, decision_type_key = "AUTONOMY_REPORTS_PENDING",
                                                                               impact_bucket = "moderate", urgency_bucket = "low" },
            queue = new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto[0],
        };

        private IEnumerator RouvrirParEmpire()
        {
            if (shell.SurimpressionOuverte) Assert.AreEqual("surimpression", shell.Depiler());
            yield return null;
            ProductionClickSupport.Click(shell.TabBarRoot.Find("Tab_Empire").GetComponent<UnityEngine.UI.Button>());
            yield return AttendreLAccueil();
        }

        private HighestLeverageCardController Tete() =>
            shell.ContentSlot.GetComponentsInChildren<HighestLeverageCardController>(false).LastOrDefault();

        [UnityTest]
        public IEnumerator A3_RouvertParEmpire_LaTeteEstRelue_JamaisLaReponseDuLancement()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("AppShell_AccueilRelu");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            // Le monde du LANCEMENT : une carte « c-perime » en attente (la réponse gardée), un jeton de session.
            Poser(shell, "Token", "jeton-de-test");
            Poser(shell, "LastSessionOpen", AvecCarte("c-perime"));
            var transport = new TransportTemoin { Reponse = AvecCarte("c-frais") };
            shell.TransportDeSessionPourTest = transport;

            // A3 (1) — la carte a CHANGÉ depuis le lancement : l'Accueil rouvert montre la FRAÎCHE, jamais la périmée.
            yield return RouvrirParEmpire();
            Assert.AreEqual(1, transport.Ouvertures, "la réouverture RELIT la session (une fois)");
            Assert.IsTrue(shell.AccueilRelu);
            Assert.AreEqual("c-frais", Tete().CurrentCard?.card_id, "la tête montre la carte RELUE, pas celle du lancement (« c-perime »)");

            // A3 (2) — la carte a été RÉGLÉE depuis : l'Accueil rouvert ne la remontre pas « en attente ».
            transport.Reponse = AvecCarte(null);
            yield return RouvrirParEmpire();
            Assert.AreEqual(2, transport.Ouvertures);
            Assert.AreEqual(HighestLeverageCardController.CardState.NoCard, Tete().RenderedState,
                "la carte réglée ne revient pas « en attente » (la réponse du lancement n'est jamais remontrée)");
        }

        /// <summary>Garde GÉOMÉTRIQUE (suivi ⊥ UX §I, 26/09 : « ~55 % de vide ») — dans le repère de `ContentSlot` : la première bande
        /// part du HAUT de la zone sûre (à 1 % près), et deux bandes consécutives ne laissent pas plus de 5 % de la zone entre elles.</summary>
        private void VerifierGeometrie(string quand, params RectTransform[] bandesDeHautEnBas)
        {
            Canvas.ForceUpdateCanvases();
            float haut = shell.ContentSlot.rect.yMax - ShellChrome.TopInsetPx, bas = shell.ContentSlot.rect.yMin + ShellChrome.BottomInsetPx;
            float zone = haut - bas;
            Assert.Greater(zone, 1f, $"{quand} : précondition, une zone sûre mesurable");
            var c = new Vector3[4];
            var bornes = bandesDeHautEnBas.Select(rt =>
            {
                rt.GetWorldCorners(c);
                float y0 = shell.ContentSlot.InverseTransformPoint(c[0]).y, y1 = shell.ContentSlot.InverseTransformPoint(c[1]).y;
                return (bas: Mathf.Min(y0, y1), haut: Mathf.Max(y0, y1));
            }).ToList();
            Assert.LessOrEqual(Mathf.Abs(bornes[0].haut - haut), 0.01f * zone,
                $"{quand} : la première bande part du haut de la zone sûre (bande {bornes[0].haut:F0}, zone {haut:F0})");
            for (int i = 1; i < bornes.Count; i++)
            {
                float ecart = bornes[i - 1].bas - bornes[i].haut;
                Assert.LessOrEqual(ecart, 0.05f * zone, $"{quand} : écart de {ecart / zone:P0} entre deux bandes (≤ 5 % de la zone sûre)");
            }
        }

        [UnityTest]
        public IEnumerator A5_SansCarteAvecUneFile_LaFileSeuleEnHaut_SansDementi()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("AppShell_FileSeule");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            Poser(shell, "Token", "jeton-de-test");
            SessionOpenDto reponse = AvecCarte(null);
            reponse.queue = new[] { new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto { exception_id = "e-1", severity_band = "MODERATE" } };
            shell.TransportDeSessionPourTest = new TransportTemoin { Reponse = reponse };
            yield return RouvrirParEmpire();

            Assert.AreEqual(0, shell.ContentSlot.GetComponentsInChildren<HighestLeverageCardController>(false).Length,
                "pas de carte à fort levier, une file : la tête vide n'est PAS montée (elle dirait « Rien à signaler » contre la file)");
            ExceptionQueuePanelController file = shell.ContentSlot.GetComponentsInChildren<ExceptionQueuePanelController>(false).LastOrDefault();
            Assert.IsNotNull(file, "la file est montée");
            Assert.AreEqual(1, file.RenderedCardCount, "précondition : la file porte la carte servie");
            VerifierGeometrie("file seule", (RectTransform)file.transform);
            var textes = shell.ContentSlot.GetComponentsInChildren<TMPro.TextMeshProUGUI>(false).Select(t => t.text).ToList();
            Assert.IsFalse(textes.Any(t => t.Contains("Aucune décision en attente") || t.Contains("Rien à signaler")),
                "aucune affirmation contraire à la file (« Rien à signaler », « Aucune décision en attente »)");
            Assert.IsNotNull(file.transform.GetComponentsInChildren<Transform>(false).FirstOrDefault(t => t.name == "Trancher"),
                "la ligne porte son geste « trancher » (plus d'aplat « Resolve » muet)");
        }

        /// <summary>A6 (créneau du 26/09, planche P1) — la ligne de file garde sa hauteur de conception, ancrée en haut de la file, AVEC
        /// et SANS carte de tête : l'unique ligne ne s'étire plus sur la bande (« file seule »).</summary>
        [UnityTest]
        public IEnumerator A6_LaLigneDeFile_GardeSaHauteur_AvecEtSansCarteDeTete()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("AppShell_LigneDeFile");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            Poser(shell, "Token", "jeton-de-test");
            var file = new[] { new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto { exception_id = "e-1", severity_band = "MODERATE" } };
            var transport = new TransportTemoin();
            shell.TransportDeSessionPourTest = transport;

            float Hauteur(string cas)
            {
                Canvas.ForceUpdateCanvases();
                Transform ligne = shell.ContentSlot.GetComponentsInChildren<Transform>(false).LastOrDefault(t => t.name == "Row_e-1");
                Assert.IsNotNull(ligne, $"{cas} : la ligne de la carte est rendue");
                return ((RectTransform)ligne).rect.height;
            }

            SessionOpenDto avecCarte = AvecCarte("c-tete"); avecCarte.queue = file;
            transport.Reponse = avecCarte;
            yield return RouvrirParEmpire();
            yield return null;
            float hAvec = Hauteur("avec carte de tête");

            SessionOpenDto sansCarte = AvecCarte(null); sansCarte.queue = file;
            transport.Reponse = sansCarte;
            yield return RouvrirParEmpire();
            yield return null;
            float hSans = Hauteur("file seule");

            Assert.AreEqual(ExceptionQueuePanelController.HauteurLigne, hAvec, 0.5f, "avec carte de tête : la hauteur de conception");
            Assert.AreEqual(hAvec, hSans, 0.5f, $"la ligne a la MÊME hauteur avec et sans carte de tête ({hAvec:F1} contre {hSans:F1}) — jamais étirée");
        }

        [UnityTest]
        public IEnumerator A4_AvecUneCarte_AucuneSurfaceNeRecouvreUnGesteDeLaTete()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("AppShell_AccueilGestes");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            Poser(shell, "Token", "jeton-de-test");
            shell.TransportDeSessionPourTest = new TransportTemoin { Reponse = AvecCarte("c-gestes") };
            yield return RouvrirParEmpire();
            Assert.AreEqual(HighestLeverageCardController.CardState.Available, Tete().RenderedState, "précondition : une carte est montrée");
            Assert.IsNotNull(Tete().SurfaceButton, "précondition : la surface B6 existe (sinon la garde ne défend rien)");

            // A4 — avec une carte : chaque geste montré reçoit son toucher (la surface B6 posée sur la racine de la carte ne le couvre pas).
            Assert.IsNull(shell.ContentSlot.GetComponentsInChildren<Transform>(false).FirstOrDefault(t => t.name == "Nav_CityMap"),
                "« La carte » de l'ancienne feuille n'est plus visible sur l'Accueil (G4 : plus rien à recouvrir)");
            var gestes = Tete().GetComponentsInChildren<Transform>(false)
                .Where(t => t.name == "CommitButton" || t.name == "SkipButton" || t.name == "LireButton" || t.name == "TypedConfirmButton").ToList();
            Assert.IsNotEmpty(gestes, "anti-vacuité : avec une carte, la tête montre des gestes");
            foreach (Transform g in gestes)
            {
                var rt = (RectTransform)g;
                Vector2 centre = RectTransformUtility.WorldToScreenPoint(null, rt.TransformPoint(rt.rect.center));
                var touches = new List<UnityEngine.EventSystems.RaycastResult>();
                UnityEngine.EventSystems.EventSystem.current.RaycastAll(
                    new UnityEngine.EventSystems.PointerEventData(UnityEngine.EventSystems.EventSystem.current) { position = centre }, touches);
                Assert.IsTrue(touches.Count > 0 && (touches[0].gameObject == g.gameObject || touches[0].gameObject.transform.IsChildOf(g)),
                    $"le geste « {g.name} » est RECOUVERT au toucher — premier touché : « {(touches.Count > 0 ? touches[0].gameObject.name : "rien")} »");
            }

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
