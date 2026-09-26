using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ①-0 (2026-09-23, écart ① `e2bd7681` §0.2) — la fiche opérationnelle (`BuildingCardController`) était une ROUTE MORTE :
    // son seul chemin (Accueil → « La fiche ») la montait SANS bâtiment, et AMÉLIORER, sur la fiche de ①, y renvoyait.
    //   D0     AMÉLIORER n'est montré que pour les 3 types dont la fiche opérationnelle porte un bouton de palier
    //   D1     sur la fiche de ①, AMÉLIORER transmet le bâtiment AFFICHÉ (couture d'ouvreur) ; absent sur un autre type
    //   D2     l'ouverture monte l'écran AVEC son bâtiment : `BuildingId` posé avant `Start`, et la requête ÉMISE nomme ce
    //          bâtiment ; un id vide ne monte rien
    //   D3     garde de source : `BuildingCardController` ne se monte QUE par `OuvertureFicheOperationnelle` (avec son bâtiment) —
    //          le bouton « La fiche » de l'Accueil, qui la montait vide, est retiré (ruling A du 25/08) ; contrôle positif sur une
    //          source fabriquée
    //   D4     B1 (passe UX 2026-09-24) — la TÊTE de la fiche ouvre ② pour TOUT bâtiment affiché, types du kit d'un joueur neuf
    //          compris (le labo y trouve sa cuisson) ; fiche fermée, rien ne part
    [Category("EcranDistrict")]
    public class DistrictFicheOperationnellePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private sealed class OuvreurFactice : IOuvreurDeFicheOperationnelle
        {
            public readonly List<string> Demandes = new List<string>();
            public bool OuvrirFicheOperationnelle(string buildingId) { Demandes.Add(buildingId); return true; }
        }

        private sealed class NavFactice : IShellNavigator
        {
            public int Appels;
            public readonly List<GameObject> Montes;
            public NavFactice(List<GameObject> montes) { Montes = montes; }
            public T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant
            {
                Appels++;
                var go = new GameObject("Nav_" + typeof(T).Name);
                Montes.Add(go);
                return go.AddComponent<T>();
            }
        }

        private static DistrictInteriorBuildingDto Batiment(string id, int bloc, string type) => new DistrictInteriorBuildingDto
        {
            building = id, block_id = bloc, operational_type = type, conversion_band = "OPERATIONAL", shell_state = "STANDING",
            condition_band = "SOUND", revenue_band = "IDLE", revenue_chain = "UNWIRED", activity_band = "IDLE",
            lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false, lieutenant_ids = new string[0],
        };

        private static DistrictInteriorDto District(params DistrictInteriorBuildingDto[] batiments)
        {
            var blocs = new DistrictInteriorBlockDto[batiments.Length];
            for (int i = 0; i < batiments.Length; i++) blocs[i] = new DistrictInteriorBlockDto { block_id = i, x = i, y = 0 };
            return new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice", name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = batiments.Length, height = 1 },
                blocks = blocs, buildings = batiments, day_phase = "NIGHT",
            };
        }

        [Test]
        public void D0_AmeliorerSeulementSurLesTypesAPalier()
        {
            foreach (string t in new[] { "specialized_lab", "distribution_hub", "money_holding" })
                Assert.IsTrue(DistrictInteriorScreenController.AmeliorableDepuisLaFiche(t), t);
            foreach (string t in new[] { "lab", "refinery", "press_house", "front_shop", "dealer_spot_front", "cash_safehouse",
                                         "stash", "grow_house", "office", null, "" })
                Assert.IsFalse(DistrictInteriorScreenController.AmeliorableDepuisLaFiche(t), t ?? "null");
        }

        [Test]
        public void D1_SurLaFiche_AmeliorerTransmetLeBatimentAffiche()
        {
            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();
            var hub = Batiment("b-hub", 0, "distribution_hub");
            var shop = Batiment("b-shop", 1, "front_shop");
            ecran.Render(District(hub, shop));
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            var ouvreur = new OuvreurFactice();
            ecran.OuvreurPourTest = ouvreur;

            ecran.OuvrirFiche(shop);
            Assert.IsFalse(ecran.FicheAmeliorerMontre, "un commerce-écran n'a pas de palier : AMÉLIORER absent");

            ecran.OuvrirFiche(hub);
            Assert.IsTrue(ecran.FicheAmeliorerMontre, "un relais a son palier : AMÉLIORER montré");
            Button ameliorer = ecran.ScreenRoot.GetComponentsInChildren<Button>(true).First(b => b.gameObject.name == "Btn_AMÉLIORER");
            ameliorer.onClick.Invoke();
            CollectionAssert.AreEqual(new[] { "b-hub" }, ouvreur.Demandes, "le bâtiment AFFICHÉ, pas un autre");
            Assert.AreEqual("b-hub", ecran.DerniereFicheOperationnelleDemandee);
        }

        [Test]
        public void D4_LaTeteDeLaFiche_OuvreLaFicheOperationnelle_DeToutBatiment()
        {
            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();
            // Le kit de départ d'un joueur neuf (corps/006 de la passe UX), plus un type à palier en témoin.
            var kit = new[]
            {
                Batiment("b-lab", 0, "lab"), Batiment("b-stash", 1, "stash"), Batiment("b-shop", 2, "front_shop"),
                Batiment("b-safe", 3, "cash_safehouse"), Batiment("b-hub", 4, "distribution_hub"),
            };
            ecran.Render(District(kit));
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            var ouvreur = new OuvreurFactice();
            ecran.OuvreurPourTest = ouvreur;

            ecran.OuvrirFicheOperationnelle();
            Assert.AreEqual(0, ouvreur.Demandes.Count, "fiche fermée : la tête ne transmet rien");

            Button tete = ecran.ScreenRoot.GetComponentsInChildren<Button>(true).Single(b => b.gameObject.name == "Tete_OuvrirFiche");
            foreach (var b in kit)
            {
                ecran.OuvrirFiche(b);
                tete.onClick.Invoke();
                Assert.AreEqual(b.building, ecran.DerniereFicheOperationnelleDemandee, b.operational_type);
            }
            CollectionAssert.AreEqual(kit.Select(b => b.building).ToArray(), ouvreur.Demandes,
                "chaque toucher transmet le bâtiment AFFICHÉ — le labo du kit compris, que AMÉLIORER n'atteint pas");
        }

        [UnityTest]
        public IEnumerator D2_LOuverture_ChargeLeBonBatiment_EtJamaisSansBatiment()
        {
            var nav = new NavFactice(montes);
            Assert.IsNull(OuvertureFicheOperationnelle.Ouvrir(nav, null));
            Assert.IsNull(OuvertureFicheOperationnelle.Ouvrir(nav, ""));
            Assert.AreEqual(0, nav.Appels, "un id vide ne monte RIEN");

            LogAssert.ignoreFailingMessages = true;   // le port fermé fait échouer la requête : c'est la requête ÉMISE qu'on lit
            BuildingCardController fiche = OuvertureFicheOperationnelle.Ouvrir(nav, "b-42");
            Assert.IsNotNull(fiche);
            Assert.AreEqual(1, nav.Appels);
            Assert.AreEqual("b-42", fiche.BuildingId, "posé AVANT le Start de l'écran");
            fiche.SetBaseUrl("http://127.0.0.1:9");   // même fenêtre synchrone que le shell (jeton, parent)
            fiche.SetToken("t");

            for (int i = 0; i < 120 && fiche.DerniereUrlDemandee == null; i++) yield return null;
            Assert.AreEqual("http://127.0.0.1:9/v1/operational/building/b-42", fiche.DerniereUrlDemandee,
                "la requête émise nomme le bâtiment transmis");
        }

        private static readonly Regex Montage = new Regex(
            @"(?:MonterLocataireEnSurimpression|AddComponent)\s*<\s*(?:[\w\.]*\.)?BuildingCardController\s*>", RegexOptions.Compiled);

        private static List<string> Montages(string source, string nom)
        {
            var res = new List<string>();
            string[] lignes = source.Split('\n');
            for (int i = 0; i < lignes.Length; i++)
            {
                string t = lignes[i].TrimStart();
                if (t.StartsWith("//") || t.StartsWith("*")) continue;
                if (Montage.IsMatch(lignes[i])) res.Add(nom);
            }
            return res;
        }

        [Test]
        public void D3_LaFicheOperationnelle_NeSeMontePlusQueParSonGeste()
        {
            const string fabrique =
                "var c = nav.MonterLocataireEnSurimpression<BuildingCardController>();\n" +
                "host.AddComponent<MafiaCleanCity.Operational.BuildingCardController>();\n" +
                "// nav.MonterLocataireEnSurimpression<BuildingCardController>() en commentaire ne compte pas\n";
            Assert.AreEqual(2, Montages(fabrique, "fabrique").Count, "contrôle positif : les deux formes de montage sont VUES");

            var sites = new List<string>();
            foreach (string f in Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories))
                sites.AddRange(Montages(File.ReadAllText(f), Path.GetFileName(f)));
            sites.Sort(System.StringComparer.Ordinal);
            // OuvertureFicheOperationnelle : le SEUL geste, et il monte AVEC le bâtiment. Le bouton « La fiche » de l'Accueil
            // (DashboardController ×2) est retiré le 23/09 (ruling A du 25/08, « un bouton qui ment est pire qu'un bouton absent »).
            CollectionAssert.AreEqual(
                new[] { "OuvertureFicheOperationnelle.cs" }, sites,
                "un NOUVEAU chemin monte la fiche opérationnelle : qu'il passe par OuvertureFicheOperationnelle (avec son bâtiment)");
        }
    }
}
