using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Tests;               // ProductionClickSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // « REVENIR » EN SÉRIE 6 (passe UX du 2026-09-24, ARBITRAGES-user-2026-09-07 §C.14) — la flèche du bandeau est RETIRÉE ; on
    // revient par deux gestes sans chrome : (1) toucher l'onglet ACTIF du dock ramène à sa racine ; (2) le retour du système
    // (`AppShell.Depiler`, Android/`Escape`) dépile un niveau par appui. G2 : la fiche d'un bâtiment se referme en re-touchant le
    // bâtiment ou en touchant le sol.
    //   R1  depuis CHAQUE écran que le shell monte (les onglets de l'enum, chaque entrée RÉELLE du menu Plus, le district, sa fiche,
    //       une surimpression sur chacun, deux surimpressions empilées), des appuis successifs de retour mènent à la CARTE, dans
    //       l'ordre attendu ; et le toucher de l'Empire y mène en un geste. Aucun état ne rend la flèche.
    //   R2  toucher l'onglet actif, surimpression ouverte, ramène à la racine de CET onglet (pas à la carte)
    //   R3  garde de source : aucun `SetLeadingAction(…BackToMap…)` dans le code de production (contrôle positif fabriqué)
    //   G3  le « ‹ » de l'en-tête Famille fait le retour du shell (`IRetourDuShell`) ; hors shell, rien ; l'en-tête l'appelle (source)
    //   G2  sur un district rendu : re-toucher le bâtiment ouvert referme (un autre bascule) ; toucher le sol referme ; toucher la
    //       fiche ne referme pas (les deux sens de `EstLeSol`)
    // R1-R3 sont SYNCHRONES (`[Test]`, une frame) : aucun `Start()` ne tourne, donc aucun locataire ne signe ni ne charge ; le seul
    // chemin qui part sur le réseau (l'intérieur du district, lancé par `EnterDistrict`) vise un port FERMÉ (`AdresseDuBack`).
    // ⚠️ Ce que R1 ne voit pas : un QUATRIÈME chemin de montage de racine (hors `ActivateTab`, `EnterDistrict`, le menu Plus) — il
    //    passerait par `ConstruireLocataire` sans poser la racine ; la population est celle des trois chemins d'aujourd'hui.
    [Category("RetourSerie6")]
    public class RetourSerie6PlayModeTests
    {
        private const string PortFerme = "http://127.0.0.1:9";

        private GameObject shellGo, hote;
        private AppShell shell;
        private HashSet<GameObject> racinesAvant;

        [SetUp]
        public void SetUp()
        {
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            AdresseDuBack.PoserPourTest(PortFerme);
        }

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            if (hote != null) Object.DestroyImmediate(hote);
            shell = null; shellGo = null; hote = null;
            if (racinesAvant != null)
                foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                    Object.DestroyImmediate(g);   // le Canvas du district nu, l'EventSystem du shell
            racinesAvant = null;
            AdresseDuBack.Oublier();
            EtatPublieParLeShell.RendrePourTest();
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
        }

        // ── fabriques ──────────────────────────────────────────────────────────────────────────────────────────────────

        private static DistrictInteriorBuildingDto Batiment(string id, int bloc) => new DistrictInteriorBuildingDto
        {
            building = id, block_id = bloc, operational_type = "front_shop", conversion_band = "OPERATIONAL", shell_state = "STANDING",
            condition_band = "SOUND", revenue_band = "IDLE", revenue_chain = "UNWIRED", activity_band = "IDLE",
            lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false, lieutenant_ids = new string[0],
        };

        /// <summary>Un district au profil `verge` : il a un FOND, donc une navigation (`DistrictMapNavigation`) — sans elle, aucun
        /// toucher du sol n'est signalé.</summary>
        private static DistrictInteriorDto Verge(params DistrictInteriorBuildingDto[] batiments)
        {
            var blocs = new DistrictInteriorBlockDto[batiments.Length];
            for (int i = 0; i < batiments.Length; i++) blocs[i] = new DistrictInteriorBlockDto { block_id = i, x = i, y = 0 };
            return new DistrictInteriorDto
            {
                district = "district-16", district_id = 16, profile = "verge", name = "La Lisière", name_canonical = "Test",
                bank_side = "north", grid = new DistrictInteriorGridDto { width = batiments.Length, height = 1 },
                blocks = blocs, buildings = batiments, day_phase = "NIGHT",
            };
        }

        private AppShell NouveauShell()
        {
            shellGo = new GameObject("AppShell_RetourSerie6");
            shell = shellGo.AddComponent<AppShell>();
            return shell;
        }

        private DistrictInteriorScreenController DistrictMonte() =>
            shell.MountedTenantType == typeof(DistrictInteriorScreenController) && shell.MountedTenantGameObject != null
                ? shell.MountedTenantGameObject.GetComponent<DistrictInteriorScreenController>() : null;

        /// <summary>Le menu Plus le plus RÉCENT : les montages précédents attendent leur `Destroy` différé (même frame).</summary>
        private Transform MenuCourant()
        {
            for (int i = shell.ContentSlot.childCount - 1; i >= 0; i--)
                if (shell.ContentSlot.GetChild(i).name == "MenuPlus") return shell.ContentSlot.GetChild(i);
            return null;
        }

        private Button EntreeDuMenu(int rang)
        {
            Transform contenu = MenuCourant()?.Find("MenuPlus_Contenu");
            Assert.IsNotNull(contenu, "le menu Plus n'est pas monté");
            return contenu.GetChild(rang).GetComponent<Button>();
        }

        private Button BoutonDOnglet(AppShell.Tab onglet)
        {
            Transform t = shell.TabBarRoot.Find("Tab_" + onglet);
            Assert.IsNotNull(t, $"Tab_{onglet} introuvable dans le dock");
            return t.GetComponent<Button>();
        }

        private void OuvrirLaFicheDuDistrict()
        {
            DistrictInteriorScreenController d = DistrictMonte();
            Assert.IsNotNull(d, "précondition : le district est monté");
            DistrictInteriorDto dto = Verge(Batiment("b-r1", 0));
            d.Render(dto);
            d.OuvrirFiche(dto.buildings[0]);
            Assert.IsTrue(d.FicheOuverte, "précondition : la fiche est ouverte");
        }

        private bool SurLaCarte =>
            shell.MountedTenantType == typeof(CityMapController) && shell.CityTabDistrictId == -1
            && !shell.SurimpressionOuverte && shell.CurrentTab == AppShell.Tab.Empire;

        private string Etat() =>
            $"onglet={shell.CurrentTab} locataire={shell.MountedTenantType?.Name ?? "∅"} district={shell.CityTabDistrictId} " +
            $"surimpression={shell.SurimpressionOuverte}";

        /// <summary>La population des états montés par le shell, chacun avec la suite de retours attendue jusqu'à la carte.</summary>
        private List<(string nom, Action arriver, string[] retours)> Etats()
        {
            var etats = new List<(string, Action, string[])>();
            foreach (AppShell.Tab onglet in Enum.GetValues(typeof(AppShell.Tab)))
            {
                AppShell.Tab o = onglet;
                bool empire = o == AppShell.Tab.Empire;
                etats.Add(($"onglet {o}", () => shell.ActivateTab(o), empire ? new[] { "racine" } : new[] { "onglet", "racine" }));
                etats.Add(($"onglet {o} + surimpression", () => { shell.ActivateTab(o); shell.MonterLocataireEnSurimpression<DailyReviewScreenController>(); },
                           empire ? new[] { "surimpression", "racine" } : new[] { "surimpression", "onglet", "racine" }));
            }
            etats.Add(("Accueil sur l'Empire", () => { shell.ActivateTab(AppShell.Tab.Empire); shell.MonterLocataireEnSurimpression<DashboardController>(); },
                       new[] { "surimpression", "racine" }));
            etats.Add(("Famille + deux surimpressions empilées", () =>
            {
                shell.ActivateTab(AppShell.Tab.Org);
                shell.MonterLocataireEnSurimpression<DailyReviewScreenController>();
                shell.MonterLocataireEnSurimpression<DashboardController>();
            }, new[] { "surimpression", "onglet", "racine" }));
            etats.Add(("district", () => shell.EnterDistrict(16), new[] { "district", "racine" }));
            etats.Add(("district + fiche", () => { shell.EnterDistrict(16); OuvrirLaFicheDuDistrict(); }, new[] { "fiche", "district", "racine" }));
            etats.Add(("district + surimpression", () => { shell.EnterDistrict(16); shell.MonterLocataireEnSurimpression<DailyReviewScreenController>(); },
                       new[] { "surimpression", "district", "racine" }));

            shell.ActivateTab(AppShell.Tab.More);
            int entrees = shell.MenuPlusEntrees;
            Assert.Greater(entrees, 0, "anti-vacuité : le menu Plus porte des entrées");
            for (int i = 0; i < entrees; i++)
            {
                int rang = i;
                string nom = MenuCourant().Find("MenuPlus_Contenu").GetChild(rang).name;
                Action arriver = () =>
                {
                    shell.ActivateTab(AppShell.Tab.More);
                    ProductionClickSupport.Click(EntreeDuMenu(rang));
                    Assert.IsNotNull(shell.MountedTenantType, $"{nom} : l'entrée n'a monté aucun écran");
                };
                etats.Add((nom, arriver, new[] { "entree", "onglet", "racine" }));
                etats.Add(($"{nom} + surimpression", () => { arriver(); shell.MonterLocataireEnSurimpression<DailyReviewScreenController>(); },
                           new[] { "surimpression", "entree", "onglet", "racine" }));
            }
            return etats;
        }

        // ── R1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────

        [Test]
        public void R1_DepuisChaqueEcranMonte_LeRetourEtLEmpireMenentALaCarte()
        {
            NouveauShell();
            List<(string nom, Action arriver, string[] retours)> etats = Etats();
            Assert.Greater(etats.Count, 20, "anti-vacuité : la population couvre les onglets, le district et le menu Plus");

            var ecarts = new List<string>();
            foreach ((string nom, Action arriver, string[] attendus) in etats)
            {
                // (2) le retour du système, appui par appui
                arriver();
                if (shell.TopBar.CurrentLeadingAction != TopBarController.LeadingAction.None)
                    ecarts.Add($"{nom} : la flèche est posée ({shell.TopBar.CurrentLeadingAction}) — §C.14 la retire");
                var retours = new List<string>();
                for (int appui = 0; appui < 8; appui++)
                {
                    string r = shell.Depiler();
                    retours.Add(r);
                    if (r == "racine") break;
                }
                if (!retours.SequenceEqual(attendus))
                    ecarts.Add($"{nom} : retours [{string.Join(", ", retours)}], attendus [{string.Join(", ", attendus)}]");
                if (!SurLaCarte) ecarts.Add($"{nom} : après les retours, pas sur la carte ({Etat()})");

                // (1) le dock : l'Empire, en un geste de production
                arriver();
                ProductionClickSupport.Click(BoutonDOnglet(AppShell.Tab.Empire));
                if (!SurLaCarte) ecarts.Add($"{nom} : le toucher de l'Empire ne mène pas à la carte ({Etat()})");
            }
            Assert.IsEmpty(ecarts, $"{ecarts.Count} état(s) sur {etats.Count} sans chemin vers la carte :\n" + string.Join("\n", ecarts));
        }

        // ── R2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────

        [Test]
        public void R2_ToucherLOngletActif_SurimpressionOuverte_RameneASaRacine()
        {
            NouveauShell();
            foreach (AppShell.Tab onglet in Enum.GetValues(typeof(AppShell.Tab)))
            {
                shell.ActivateTab(onglet);
                Type racine = shell.MountedTenantType;
                shell.MonterLocataireEnSurimpression<DailyReviewScreenController>();
                Assert.IsTrue(shell.SurimpressionOuverte, $"{onglet} : précondition, une surimpression est ouverte");
                ProductionClickSupport.Click(BoutonDOnglet(onglet));
                Assert.AreEqual(onglet, shell.CurrentTab, $"{onglet} : on reste sur l'onglet touché");
                Assert.AreEqual(racine, shell.MountedTenantType, $"{onglet} : sa racine est remontée");
                Assert.IsFalse(shell.SurimpressionOuverte, $"{onglet} : la surimpression est démontée");
                if (onglet == AppShell.Tab.More) Assert.Greater(shell.MenuPlusEntrees, 0, "la racine de Plus est le menu");
            }
        }

        // ── R3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────

        private static readonly Regex FlechePosee = new Regex(
            @"SetLeadingAction\s*\(\s*(?:[\w\.]*\.)?LeadingAction\.BackToMap", RegexOptions.Compiled);

        private static int FlechesPosees(string source)
        {
            int n = 0;
            foreach (string ligne in source.Split('\n'))
            {
                int commentaire = ligne.IndexOf("//", StringComparison.Ordinal);
                if (FlechePosee.IsMatch(commentaire >= 0 ? ligne.Substring(0, commentaire) : ligne)) n++;
            }
            return n;
        }

        [Test]
        public void R3_AucunCodeNePoseLaFlecheDuBandeau()
        {
            const string fabrique =
                "TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, ExitToCityMap);\n" +
                "  bar.SetLeadingAction( LeadingAction.BackToMap , null);\n" +
                "// TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, ExitToCityMap); en commentaire ne compte pas\n" +
                "TopBar.SetLeadingAction(TopBarController.LeadingAction.None, null);\n";
            Assert.AreEqual(2, FlechesPosees(fabrique), "contrôle positif : les deux formes sont VUES, le commentaire et None non");

            var sites = new List<string>();
            foreach (string f in Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories))
                if (FlechesPosees(File.ReadAllText(f)) > 0) sites.Add(Path.GetFileName(f));
            CollectionAssert.IsEmpty(sites,
                "§C.14 (ARBITRAGES-user-2026-09-07, « pas de domicile en série 6 ») : la flèche du bandeau est retirée ; on revient par " +
                "l'onglet actif ou par le retour du système (AppShell.Depiler). Sites : " + string.Join(", ", sites));
        }

        // ── G3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────

        private class FauxRetour : MonoBehaviour, IRetourDuShell
        {
            public int Appels;
            public string Depiler() { Appels++; return "onglet"; }
        }

        [Test]
        public void G3_LeChevronDeLaFamille_FaitLeRetourDuShell_EtRienHorsShell()
        {
            if (EventSystem.current == null) new GameObject("EventSystem_G3", typeof(EventSystem));   // rendu au TearDown (racine neuve)
            hote = new GameObject("Retour_G3", typeof(RectTransform));
            var retourGo = new GameObject("Retour", typeof(RectTransform));
            retourGo.transform.SetParent(hote.transform, false);
            Image disque = retourGo.AddComponent<Image>();
            disque.raycastTarget = false;   // l'état de l'en-tête AVANT le branchement : un disque décoratif
            Button b = MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController.BrancherRetourDuShell(retourGo, disque);
            Assert.IsTrue(disque.raycastTarget, "le disque reçoit le toucher");
            Assert.AreEqual(Selectable.Transition.None, b.transition, "aucun changement visuel");

            // contrôle négatif : aucun IRetourDuShell vivant ⇒ le toucher ne fait rien (et ne lève rien)
            ProductionClickSupport.Click(b);

            FauxRetour faux = hote.AddComponent<FauxRetour>();
            ProductionClickSupport.Click(b);
            Assert.AreEqual(1, faux.Appels, "le « ‹ » fait UN retour du shell par toucher");
        }

        [Test]
        public void G3_LEnTeteDeLaFamille_BrancheSonChevron()
        {
            string source = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", "Operational", "Lieutenant", "LieutenantScreenController.cs"));
            string sansCommentaires = Regex.Replace(source, @"//[^\n]*", "");
            int debut = sansCommentaires.IndexOf("private void BuildFamilyHeader(", StringComparison.Ordinal);
            Assert.GreaterOrEqual(debut, 0, "BuildFamilyHeader introuvable : l'en-tête Famille a changé de forme, relire G3");
            int fin = sansCommentaires.IndexOf("\n        private ", debut + 1, StringComparison.Ordinal);
            string corps = fin > debut ? sansCommentaires.Substring(debut, fin - debut) : sansCommentaires.Substring(debut);
            Assert.AreEqual(1, Regex.Matches(corps, @"BrancherRetourDuShell\s*\(").Count,
                "l'en-tête Famille doit brancher son « ‹ » sur le retour du shell (sinon il redevient décoratif)");
        }

        // ── G2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────

        private static List<RaycastResult> Touches(Vector2 p)
        {
            var res = new List<RaycastResult>();
            EventSystem.current.RaycastAll(new PointerEventData(EventSystem.current) { position = p }, res);
            return res;
        }

        private static (float bas, float haut) BandeVerticale(RectTransform rt)
        {
            var coins = new Vector3[4];
            rt.GetWorldCorners(coins);
            return (RectTransformUtility.WorldToScreenPoint(null, coins[0]).y, RectTransformUtility.WorldToScreenPoint(null, coins[1]).y);
        }

        private static Vector2 Centre(RectTransform rt) => RectTransformUtility.WorldToScreenPoint(null, rt.TransformPoint(rt.rect.center));

        [UnityTest]
        public IEnumerator G2_LaFicheSeFerme_ParLeBatimentRetouche_OuParLeSol_JamaisParLaFiche()
        {
            if (EventSystem.current == null) new GameObject("EventSystem_G2", typeof(EventSystem));   // rendu au TearDown (racine neuve)
            hote = new GameObject("District_G2", typeof(RectTransform));
            var ecran = hote.AddComponent<DistrictInteriorScreenController>();
            DistrictInteriorDto dto = Verge(Batiment("b-g2-a", 0), Batiment("b-g2-b", 1));
            ecran.Render(dto);
            yield return null;
            yield return null;   // la profondeur des graphiques (lue par le raycast) se pose au premier rendu du canvas

            Assert.IsNotNull(ecran.MapNavigation, "anti-vacuité : le profil verge a un fond, donc une navigation qui signale le sol");
            var fiche = (RectTransform)ecran.ScreenRoot.Find("FicheBatiment");
            Assert.IsNotNull(fiche, "la fiche est construite avec la racine");
            Button[] cellules = ecran.MapNavigation.GetComponentsInChildren<Button>(true);
            Assert.AreEqual(dto.buildings.Length, cellules.Length, "un bouton par bâtiment sous la scène");

            // (a) le bâtiment : ouvrir, basculer sur un autre, re-toucher celui-ci referme
            ProductionClickSupport.Click(cellules[0]);
            Assert.IsTrue(ecran.FicheOuverte, "(a) toucher un bâtiment ouvre sa fiche");
            string premier = ecran.FicheBuildingId;
            ProductionClickSupport.Click(cellules[1]);
            Assert.IsTrue(ecran.FicheOuverte, "(a) toucher un AUTRE bâtiment garde la fiche ouverte");
            Assert.AreNotEqual(premier, ecran.FicheBuildingId, "(a) … et y bascule");
            ProductionClickSupport.Click(cellules[1]);
            Assert.IsFalse(ecran.FicheOuverte, "(a) re-toucher le bâtiment ouvert referme sa fiche");
            Assert.IsNull(ecran.BatimentSelectionne, "(a) … et retire l'anneau de sélection");

            // (b) le sol : un point entre le haut de la fiche et le bas du titre, hors de tout Selectable (la règle du pan)
            ProductionClickSupport.Click(cellules[0]);
            yield return null;
            yield return null;
            (float _, float hautFiche) = BandeVerticale(fiche);
            var titre = ecran.ScreenRoot.Find("DistrictTitle") as RectTransform;
            float basTitre = titre != null ? BandeVerticale(titre).bas : Screen.height;
            Assert.Greater(basTitre - hautFiche, 8f, $"précondition : une bande de sol visible (fiche jusqu'à {hautFiche}, titre dès {basTitre})");
            Vector2? sol = null;
            foreach (float fx in new[] { 0.5f, 0.25f, 0.75f, 0.1f, 0.9f })
            {
                var p = new Vector2(Screen.width * fx, (hautFiche + basTitre) * 0.5f);
                if (!Touches(p).Any(t => t.gameObject.GetComponentInParent<Selectable>() != null)) { sol = p; break; }
            }
            Assert.IsTrue(sol.HasValue, "précondition : un point de sol hors de tout bâtiment");
            ecran.MapNavigation.SignalerToucheSol(sol.Value);
            Assert.IsFalse(ecran.FicheOuverte, $"(b) toucher le sol ({sol.Value}) referme la fiche");

            // l'autre sens : un toucher sur la fiche (son fond n'est pas un Selectable : le pan s'y arme, le tap est signalé)
            ProductionClickSupport.Click(cellules[0]);
            yield return null;
            yield return null;
            Vector2 surLaFiche = Centre(fiche);
            List<RaycastResult> touches = Touches(surLaFiche);
            Assert.IsTrue(touches.Count > 0 && touches[0].gameObject.transform.IsChildOf(fiche),
                $"précondition : la fiche est touchable en son centre (premier touché : {(touches.Count > 0 ? touches[0].gameObject.name : "rien")})");
            ecran.MapNavigation.SignalerToucheSol(surLaFiche);
            Assert.IsTrue(ecran.FicheOuverte, "un toucher sur la fiche ne la referme pas");
        }
    }
}
