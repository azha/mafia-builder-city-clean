using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Account.Settings;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Onboarding;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // L1 (design Tools/anim-l1/design-l1.md, ratifié f2 11/11) — les trois entrées de passage. Chaque garde lit l'EFFET écrit (position, `CanvasGroup.alpha` réel,
    // couleur, nombre de pistes vivantes), jamais le seul paramètre du catalogue. Horloge FIGÉE : le `Tick` est posé à la main.
    //   P1  bandeau.entree : descend de 10 unités (+ apparaît), 200 ms ; un toucher l'annule ; la sortie n'arrive jamais sur deux pistes d'`Alpha` ; sans régie, il paraît d'un coup
    //   P2  bascule.course : ⑲ ET ㉕, les deux sens ; la couleur n'arrive qu'au bout ; sans geste, pas de course ; sans régie, couleur finale aussitôt
    //   P3  shell.entree : un 2ᵉ montage d'onglet (3 chemins) fond l'écran ; le cold-open et les surimpressions ne s'animent pas ; sous Réduit jamais α < 1 ; quota refusé = comportement d'avant
    [Category("PassagesL1")]
    public class PassagesL1PlayModeTests
    {
        private readonly System.Collections.Generic.List<GameObject> montes = new System.Collections.Generic.List<GameObject>();
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null; shellGo = null;
            RegieMouvement.Oublier();
            MouvementReduit.OublierPourTest();
            I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
            LogAssert.ignoreFailingMessages = false;
        }

        private static Regie RegieFigee(out HorlogeFigee horloge)
        {
            Regie r = RegieMouvement.PourTest();
            horloge = (HorlogeFigee)r.Horloge;
            horloge.Temps = 100f;
            return r;
        }

        /// <summary>Avance l'horloge figée ET la régie au même instant (comme `Avancer` de BandeauEphemerePlayModeTests).</summary>
        private static void A(Regie r, float t)
        {
            ((HorlogeFigee)r.Horloge).Temps = t;
            r.Tick(t);
        }

        // ------------------------------------------------------------------ P1 — bandeau.entree
        private BandeauEphemere NouveauBandeau()
        {
            var racine = new GameObject("Racine", typeof(RectTransform), typeof(Canvas));
            montes.Add(racine);
            var barre = new GameObject("Barre", typeof(RectTransform));
            barre.transform.SetParent(racine.transform, false);
            ((RectTransform)barre.transform).sizeDelta = new Vector2(392f, 52f);
            return BandeauEphemere.Construire(barre.transform);
        }

        private static AnnonceDuBandeau Annonce(string chaleur) => AnnonceDuBandeau.Choisir(false, null, chaleur, null, null);

        [Test]
        public void P1a_LeBandeau_DescendDe10_EtApparait_En200ms()
        {
            Regie regie = RegieFigee(out HorlogeFigee h);
            BandeauEphemere b = NouveauBandeau();
            var rt = (RectTransform)b.transform;
            CanvasGroup g = b.GetComponent<CanvasGroup>();
            float repos = rt.anchoredPosition.y;
            Assert.IsTrue(b.Annoncer(Annonce("HOT"), null, 5f));
            Assert.IsFalse(b.EntreePourTest.EstNul, "une piste `bandeau.entree` est posée sur le bandeau");
            Assert.IsTrue(RegieMouvement.EstVivant(b.EntreePourTest));
            A(regie, 100f);   // 1ʳᵉ évaluation : âge 0
            Assert.AreEqual(repos + CatalogueHud.BandeauEntreeDecalageU, rt.anchoredPosition.y, 0.01f, "à t = 0 le bandeau est 10 unités AU-DESSUS de son repos (repère Unity : + = au-dessus)");
            Assert.AreEqual(10f, CatalogueHud.BandeauEntreeDecalageU, "le canal porte 10 unités, pas les 27,6 px écran du catalogue (la régie écrit la valeur telle quelle)");
            Assert.AreEqual(0f, g.alpha, 1e-3f, "à t = 0 le bandeau est transparent");
            A(regie, 100.1f);
            Assert.Greater(rt.anchoredPosition.y, repos + 0.5f, "mi-course : encore au-dessus du repos");
            Assert.Less(rt.anchoredPosition.y, repos + 9.5f, "mi-course : déjà descendu");
            Assert.Greater(g.alpha, 0.1f); Assert.Less(g.alpha, 0.99f);
            A(regie, 100.21f);
            Assert.AreEqual(repos, rt.anchoredPosition.y, 0.01f, "à 200 ms le bandeau est au repos");
            Assert.AreEqual(1f, g.alpha, 1e-3f);
            Assert.AreEqual(0, regie.PistesVivantes, "la piste se libère d'elle-même à la fin");
        }

        [Test]
        public void P1b_UnToucherPendantLEntree_RendLaPositionEtLOpacite()
        {
            Regie regie = RegieFigee(out HorlogeFigee h);
            BandeauEphemere b = NouveauBandeau();
            var rt = (RectTransform)b.transform;
            CanvasGroup g = b.GetComponent<CanvasGroup>();
            float repos = rt.anchoredPosition.y;
            Assert.IsTrue(b.Annoncer(Annonce("HOT"), null, 5f));
            A(regie, 100f); A(regie, 100.05f);
            Assert.Greater(Mathf.Abs(rt.anchoredPosition.y - repos), 0.5f, "CONTRÔLE : le bandeau est bien décalé avant le toucher");
            b.Toucher();
            Assert.AreEqual(repos, rt.anchoredPosition.y, 0.01f, "position restituée");
            Assert.AreEqual(1f, g.alpha, 1e-3f, "opacité restituée");
            Assert.AreEqual(0, regie.PistesVivantes);
        }

        [UnityTest]
        public IEnumerator P1c_LaSortie_ArriveSansDeuxiemePisteSurLAlpha_MemeSiLEntreeNEstPasFinie()
        {
            Regie regie = RegieFigee(out HorlogeFigee h);
            BandeauEphemere b = NouveauBandeau();
            Assert.IsTrue(b.Annoncer(Annonce("BURNING"), null, 0f));   // tenue nulle : la minuterie lance la sortie à la frame suivante
            Assert.AreEqual(1, regie.PistesVivantes, "juste après l'annonce : l'entrée seule (horloge figée : elle n'est pas finie)");
            yield return null; yield return null; yield return null; yield return null;   // la minuterie (tenue nulle) lance la sortie
            Assert.AreEqual(1, regie.PistesVivantes, "la sortie a pris la place de l'entrée : UNE piste sur l'Alpha du bandeau, jamais deux");
            Assert.IsFalse(RegieMouvement.EstVivant(b.EntreePourTest), "l'entrée est détachée avant la sortie");
        }

        [Test]
        public void P1d_SansRegie_LAnnonceParaitDUnCoup_SansException()
        {
            RegieMouvement.Oublier();
            BandeauEphemere b = NouveauBandeau();
            var rt = (RectTransform)b.transform;
            float repos = rt.anchoredPosition.y;
            Assert.IsTrue(b.Annoncer(Annonce("HOT"), null, 5f));
            Assert.IsTrue(b.EntreePourTest.EstNul, "sans régie : handle nul");
            Assert.AreEqual(repos, rt.anchoredPosition.y, 0.01f);
            Assert.AreEqual(1f, b.GetComponent<CanvasGroup>().alpha, 1e-3f);
            Assert.IsTrue(b.Visible);
        }

        // ------------------------------------------------------------------ P2 — bascule.course
        private static readonly Color Eteint = new Color(1f, 1f, 1f, 0.18f);
        private const float K = 1280f / 300f;
        private static float Dx => 10f * K;

        private static string Diag(Regie r, Handle h, RectTransform c) =>
            $"[diag vivante={RegieMouvement.EstVivant(h)} pistes={r.PistesVivantes} actif={c.gameObject.activeInHierarchy} ecrit={(RegieMouvement.ValeurEcrite(c, Propriete.TranslationX, out float v) ? v.ToString() : "aucune")} x={c.anchoredPosition.x} ancre={c.anchorMin.x} nom={c.name} parent={c.parent.name} enfants={c.parent.parent.childCount}]";

        private static RectTransform DernierCurseur(Component racine, string ligne)
        {
            Transform l = racine.GetComponentsInChildren<Transform>(true).Where(t => t.name == ligne && t != null).Last();
            return l.GetComponentsInChildren<RectTransform>(true).Where(t => t.name == "Curseur").Last();
        }

        private static Image DernierePiste(Component racine, string ligne)
        {
            Transform l = racine.GetComponentsInChildren<Transform>(true).Where(t => t.name == ligne).Last();
            return l.GetComponentsInChildren<Image>(true).Where(t => t.name == "Interrupteur").Last();
        }

        private SettingsScreenController Reglages(bool optOut)
        {
            var go = new GameObject("Reglages", typeof(RectTransform));
            montes.Add(go);
            var e = go.AddComponent<SettingsScreenController>();
            e.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = true }, new TutorielData { tutorials_opt_out = optOut });
            return e;
        }

        private static void Toucher(Component racine, string ligne) =>
            racine.GetComponentsInChildren<Transform>(true).Where(t => t.name == ligne).Last().GetComponent<Button>().onClick.Invoke();

        [UnityTest]
        public IEnumerator P2a_Reglages_LeCurseurCourt_DansLesDeuxSens_EtLaCouleurArriveAuBout()
        {
            Regie regie = RegieFigee(out HorlogeFigee h);
            Color or = MafiaCleanCity.Theme.DesignTokens.Current.hudMoneyUnderlineGold;
            float t0 = 200f;   // un instant JAMAIS tické : la régie figée a déjà tické à 100 pendant les `yield`, et `Tick` est idempotent pour un même t (la piste ne serait pas évaluée à l'âge 0)
            foreach (bool allumeeAvant in new[] { true, false })
            {
                SettingsScreenController e = Reglages(optOut: !allumeeAvant);   // allumée ⇔ opt-out faux
                yield return null;
                Toucher(e, "Bascule_Tutoriels");   // le geste : la note « en vol »
                e.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = true }, new TutorielData { tutorials_opt_out = allumeeAvant });   // l'état d'arrivée
                yield return null;
                Assert.IsFalse(e.DerniereCourseDeBascule.EstNul, $"le geste a changé l'état (allumée avant = {allumeeAvant}) : une course est lancée");
                RectTransform curseur = DernierCurseur(e, "Bascule_Tutoriels");
                Image piste = DernierePiste(e, "Bascule_Tutoriels");
                bool allumeeApres = !allumeeAvant;
                float xArr = allumeeApres ? -Dx / 10f : Dx / 10f;   // retrait Px(1) du bord ancré (−Px(1) à droite, +Px(1) à gauche)
                Color avant = allumeeAvant ? or : Eteint, apres = allumeeApres ? or : Eteint;
                A(regie, t0);
                float sens = allumeeApres ? 1f : -1f;
                Assert.AreEqual(xArr - sens * Dx, curseur.anchoredPosition.x, 0.05f, $"à t = 0 le curseur est au bout d'où il part (sens {sens}) {Diag(regie, e.DerniereCourseDeBascule, curseur)}");
                Assert.AreEqual(avant, piste.color, "pendant la course la piste garde l'ANCIENNE couleur");
                A(regie, t0 + 0.07f);
                float x = curseur.anchoredPosition.x;
                Assert.Greater(Mathf.Abs(x - xArr), 1f, "mi-course : pas encore arrivé"); Assert.Less(Mathf.Abs(x - (xArr - sens * Dx)), Dx - 1f, "mi-course : déjà parti");
                A(regie, t0 + 0.15f);
                Assert.AreEqual(xArr, curseur.anchoredPosition.x, 0.05f, "à 140 ms le curseur est à son arrivée");
                Assert.AreEqual(apres, piste.color, "la nouvelle couleur est posée à l'arrivée");
                Assert.AreEqual(0, regie.PistesVivantes, "la piste est libérée");
                t0 += 10f;
            }
        }

        [UnityTest]
        public IEnumerator P2b_SansGeste_AucuneCourse_MemeSiLEtatChange()
        {
            RegieFigee(out HorlogeFigee h);
            SettingsScreenController e = Reglages(optOut: false);
            yield return null;
            e.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = true }, new TutorielData { tutorials_opt_out = true });   // l'état change SANS toucher
            yield return null;
            Assert.IsTrue(e.DerniereCourseDeBascule.EstNul, "pas de geste ⇒ pas d'entrée (CAT:1225)");
        }

        [UnityTest]
        public IEnumerator P2c_UnGesteSansChangementDEtat_LaNoteNeSertQuUnRendu()
        {
            RegieFigee(out HorlogeFigee h);
            SettingsScreenController e = Reglages(optOut: false);
            yield return null;
            Toucher(e, "Bascule_Tutoriels");
            e.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = true }, new TutorielData { tutorials_opt_out = false });   // refusé par le back : même état
            yield return null;
            Assert.IsTrue(e.DerniereCourseDeBascule.EstNul, "état inchangé : pas de course");
            e.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = true }, new TutorielData { tutorials_opt_out = true });   // un changement ULTÉRIEUR, sans geste
            yield return null;
            Assert.IsTrue(e.DerniereCourseDeBascule.EstNul, "la note de l'ancien geste est consommée : pas de course fantôme");
        }

        [UnityTest]
        public IEnumerator P2d_Tutoriel_LeCurseurCourt_Aussi()
        {
            Regie regie = RegieFigee(out HorlogeFigee h);
            Color or = MafiaCleanCity.Theme.DesignTokens.Current.hudMoneyUnderlineGold;
            var go = new GameObject("Tutoriel", typeof(RectTransform));
            montes.Add(go);
            var e = go.AddComponent<TutorialScreenController>();
            e.RendrePourTest(new TutorielData { tutorials_opt_out = false });   // allumée
            yield return null;
            Toucher(e, "Bascule");
            e.RendrePourTest(new TutorielData { tutorials_opt_out = true });   // éteinte
            yield return null;
            Assert.IsFalse(e.DerniereCourseDeBascule.EstNul, "㉕ : le curseur court aussi");
            RectTransform curseur = DernierCurseur(e, "Bascule");
            Image piste = DernierePiste(e, "Bascule");
            float xArr = Dx / 10f;   // éteinte : ancrée à gauche, retrait +Px(1)
            A(regie, 200f);
            Assert.AreEqual(xArr + Dx, curseur.anchoredPosition.x, 0.05f, $"éteinte : le curseur part de la droite (sens −1) {Diag(regie, e.DerniereCourseDeBascule, curseur)}");
            Assert.AreEqual(or, piste.color);
            A(regie, 200.15f);
            Assert.AreEqual(xArr, curseur.anchoredPosition.x, 0.05f);
            Assert.AreEqual(Eteint, piste.color);
            Assert.AreEqual(0, regie.PistesVivantes);
        }

        [Test]
        public void P2e_SansPiste_LaCouleurFinaleEstPoseeAussitot()
        {
            RegieMouvement.Oublier();
            var racine = new GameObject("Racine", typeof(RectTransform));
            montes.Add(racine);
            var pisteGo = new GameObject("Interrupteur", typeof(RectTransform), typeof(Image));
            pisteGo.transform.SetParent(racine.transform, false);
            var curseurGo = new GameObject("Curseur", typeof(RectTransform));
            curseurGo.transform.SetParent(pisteGo.transform, false);
            Image piste = pisteGo.GetComponent<Image>();
            Handle h = CourseDeBascule.Lancer((RectTransform)curseurGo.transform, piste, true, Eteint, Color.yellow, 42f);
            Assert.IsTrue(h.EstNul, "sans régie : handle nul");
            Assert.AreEqual(Color.yellow, piste.color, "la couleur finale est posée aussitôt = le comportement d'avant");
        }

        // ------------------------------------------------------------------ P3 — shell.entree (vrai AppShell)
        private IEnumerator MonterLeShellEtAttendreEmpire()
        {
            LogAssert.ignoreFailingMessages = true;   // le bruit d'authentification propre aux locataires montés (voir AppShellPlayModeTests)
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            float elapsed = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab, "acquisition de session propre du shell résolue (Empire monté)");
            yield return null; yield return null;
        }

        private float AlphaDeContentSlot()
        {
            CanvasGroup g = shell.ContentSlot.GetComponent<CanvasGroup>();
            return g != null ? g.alpha : 1f;
        }

        [UnityTest]
        public IEnumerator P3a_ColdOpen_EtSurimpression_NeS_Animent_Pas()
        {
            yield return MonterLeShellEtAttendreEmpire();
            Assert.IsNotNull(RegieMouvement.Courante, "le shell publie sa régie");
            Regie r = shell.RegieDeMouvement;
            r.Horloge = new HorlogeFigee(100f);
            Assert.IsTrue(shell.EntreeOngletPourTest.EstNul, "le cold-open (Empire sauté, Accueil en surimpression) ne pose aucune piste `shell.entree`");
            Assert.IsFalse(RegieMouvement.ValeurEcrite(shell.ContentSlot, Propriete.Alpha, out _), "aucune piste sur l'Alpha de ContentSlot après l'acquisition");
            // une SURIMPRESSION monte par-dessus l'écran visible sans le détruire : elle ne le fait pas repartir de 0
            shell.MonterLocataireEnSurimpression<DashboardController>();
            yield return null;
            A(r, 100f);
            Assert.IsTrue(shell.EntreeOngletPourTest.EstNul, "une surimpression ne pose pas `shell.entree`");
            Assert.IsFalse(RegieMouvement.ValeurEcrite(shell.ContentSlot, Propriete.Alpha, out _));
            Assert.AreEqual(1f, AlphaDeContentSlot(), 1e-4f, "l'écran visible dessous reste à α = 1");
        }

        [UnityTest]
        public IEnumerator P3b_UnDeuxiemeMontageDOnglet_FondLEcran_160ms()
        {
            yield return MonterLeShellEtAttendreEmpire();
            Regie r = shell.RegieDeMouvement;
            var h = new HorlogeFigee(100f);
            r.Horloge = h;
            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;   // le `Start()` du locataire a bâti son UI
            Assert.IsFalse(shell.EntreeOngletPourTest.EstNul, "le 2ᵉ montage d'onglet pose `shell.entree`");
            Assert.IsTrue(RegieMouvement.EstVivant(shell.EntreeOngletPourTest));
            Assert.Greater(shell.ContentSlot.GetComponentsInChildren<Graphic>(true).Length, 0, "le locataire a de l'encre sous ContentSlot : le fondu agit sur quelque chose");
            A(r, 100f);
            Assert.AreEqual(0f, AlphaDeContentSlot(), 1e-3f, "à t = 0 le CanvasGroup réel de ContentSlot est à 0");
            A(r, 100.08f);
            Assert.Greater(AlphaDeContentSlot(), 0.1f, "à 80 ms : plus pâle que le repos, plus plein que t = 0"); Assert.Less(AlphaDeContentSlot(), 0.99f);
            A(r, 100.17f);
            Assert.AreEqual(1f, AlphaDeContentSlot(), 1e-3f, "à 160 ms l'écran est entier");
            Assert.IsFalse(RegieMouvement.EstVivant(shell.EntreeOngletPourTest), "la piste est libérée");
        }

        [UnityTest]
        public IEnumerator P3c_LeMenuPlus_EtUnDistrict_SAniment_Aussi()
        {
            yield return MonterLeShellEtAttendreEmpire();
            Regie r = shell.RegieDeMouvement;
            r.Horloge = new HorlogeFigee(100f);
            shell.ActivateTab(AppShell.Tab.More);   // MonterMenuPlus
            yield return null;
            Assert.IsFalse(shell.EntreeOngletPourTest.EstNul, "le menu Plus fond");
            A(r, 100f);
            Assert.AreEqual(0f, AlphaDeContentSlot(), 1e-3f);
            A(r, 100.2f);
            shell.EnterDistrict(16);   // un district : une racine d'onglet
            yield return null;
            Assert.IsFalse(shell.EntreeOngletPourTest.EstNul, "un district fond");
            A(r, 110f);
            Assert.AreEqual(0f, AlphaDeContentSlot(), 1e-3f);
            A(r, 110.2f);
            Assert.AreEqual(1f, AlphaDeContentSlot(), 1e-3f);
        }

        [UnityTest]
        public IEnumerator P3d_SousReduit_JamaisAlphaSousUn()
        {
            yield return MonterLeShellEtAttendreEmpire();
            Regie r = shell.RegieDeMouvement;
            var h = new HorlogeFigee(100f);
            r.Horloge = h;
            r.Politique = PolitiqueMouvement.Reduit;
            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;
            Assert.AreEqual(1f, AlphaDeContentSlot(), 1e-4f, "juste après le montage, avant tout Tick : α = 1");
            A(r, 100f);
            Assert.AreEqual(1f, AlphaDeContentSlot(), 1e-4f, "sous Réduit : durée 0, jamais α < 1");
            A(r, 100.01f);
            Assert.AreEqual(1f, AlphaDeContentSlot(), 1e-4f);
        }

        // DÉTECTEUR du refus de quota (ratifié f2 : « un refus possible sur ⑮ en alarme, avec un détecteur ») : 15 pistes non-Ambiance tenues ⇒ la 16ᵉ est refusée,
        // le montage reste ce qu'il était (α = 1), et le refus est COMPTÉ (`Regie.Refus`).
        [UnityTest]
        public IEnumerator P3e_QuotaSature_ShellEntreeEstRefusee_LEcranReste_EtLeRefusEstCompte()
        {
            yield return MonterLeShellEtAttendreEmpire();
            Regie r = shell.RegieDeMouvement;
            r.Horloge = new HorlogeFigee(100f);
            int tenues = 0;
            // on sature jusqu'au refus : le quota est un plafond de la régie, pas un nombre recopié ici
            for (int i = 0; i < 60; i++)
            {
                int refusAvant = r.Refus;
                var cible = new GameObject("Tenue" + i, typeof(RectTransform), typeof(CanvasGroup));
                montes.Add(cible);
                Handle t = RegieMouvement.Transitionner(CatalogueHud.BandeauSortie, (RectTransform)cible.transform, 1f, 0f);
                if (t.EstNul && r.Refus > refusAvant) break;
                tenues++;
            }
            Assert.Greater(tenues, 5, "des pistes non-Ambiance sont tenues avant le refus (CONTRÔLE de la préparation)");
            int refus = r.Refus;
            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;
            Assert.IsTrue(shell.EntreeOngletPourTest.EstNul, "quota plein : `shell.entree` est refusée (handle nul)");
            Assert.Greater(r.Refus, refus, "le refus de `shell.entree` est COMPTÉ : le détecteur le voit");
            A(r, 100f);
            Assert.AreEqual(1f, AlphaDeContentSlot(), 1e-4f, "refusée ⇒ l'écran paraît d'un coup, comme avant : jamais un écran bloqué à α = 0");
        }

        // G4 de ① (mesuré, revue ⊥ I2) : les transverses `"*"` pèsent sur CHAQUE écran ; ① est à 16 = le plafond (marge 0). Le test RELIT la somme, il ne la recopie pas :
        // une 17ᵉ piste transverse (ou une de plus sur ①) ferait rougir `Gardes.G4`.
        [Test]
        public void P3f_G4DeLEcranUn_EstAuPlafond_SansLeDepasser()
        {
            Assert.IsEmpty(Gardes.G4(CatalogueHud.Entrees), "G4 passe avec les trois entrées de L1");
            int sommeUn = 0;
            foreach (Entree e in CatalogueHud.Entrees) if (e.Concerne("①")) sommeUn += e.Pistes;
            Assert.AreEqual(MouvementTunables.PistesParEcranMax, sommeUn, "① est au plafond (marge 0) : toute entrée de plus sur ① ou « * » doit passer par un nouveau chiffre, pas par un oubli");
        }
        }

    /// <summary>P4 (revue ⊥ du code L1, mineur 1) — le CHEMIN RÉEL de `[PhotoSansEntree]` : un test marqué monte un vrai shell, ouvre un 2ᵉ onglet, et l'écran ne passe
    /// JAMAIS sous α = 1, sur de vrais frames, horloge RÉELLE. Contrôle : la politique de la régie du shell est `Reduit` (sans l'attribut, elle est `Plein` : P3b). Une
    /// régie remplacée par `PourTest()` entre le shell et le montage rouvrirait le fondu en silence : ce test le verrait.</summary>
    [Category("PassagesL1")]
    [MafiaCleanCity.Tests.PhotoSansEntree]
    public class PhotoSansEntreeGardePlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null; shellGo = null;
            RegieMouvement.Oublier();
            I18nCatalog.Oublier();   // la session du shell amorce le catalogue : il ne survit pas au test (garde `catalogueSurvivant` du harnais)
            LogAssert.ignoreFailingMessages = false;
        }

        [UnityTest]
        public IEnumerator P4_UnTestMarque_MonteUnShellSousReduit_LEcranNeFondJamais()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            float elapsed = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab);
            Assert.AreEqual(PolitiqueMouvement.Reduit, shell.RegieDeMouvement.Politique, "CONTRÔLE : l'attribut a bien atteint la régie DU SHELL (sans lui : Plein)");
            shell.ActivateTab(AppShell.Tab.Org);
            float fin = Time.realtimeSinceStartup + 0.4f;   // plus que les 160 ms : l'horloge est RÉELLE, rien n'est figé
            int frames = 0;
            while (Time.realtimeSinceStartup < fin)
            {
                CanvasGroup g = shell.ContentSlot.GetComponent<CanvasGroup>();
                Assert.IsTrue(g == null || g.alpha > 0.999f, $"frame {frames} : l'écran fond sous Réduit (alpha {(g != null ? g.alpha : 1f)})");
                frames++;
                yield return null;
            }
            Assert.Greater(frames, 3, "des frames ont bien été observés");
        }
    }
}
