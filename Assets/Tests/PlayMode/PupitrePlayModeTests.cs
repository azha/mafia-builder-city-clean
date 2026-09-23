using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ② lot 1 (2026-09-23, écart ② `c4520078`, cadres 39-44 bloc B2) — LE PUPITRE du labo : trois échelles de crans, sans réseau.
    //   P1  les crans suivent la bande : « le feu » 1→5 sur IDLE→DONE, « l'étagère » et « les caisses » 1→4 sur NONE→HIGH ; le premier
    //       cran TOUJOURS allumé, une valeur hors domaine n'allume que lui
    //   P2  la fiche d'un `lab` dessine les trois échelles, chacune avec SES crans et SON mot, depuis trois routes : `lab/:id` (le feu),
    //       `precursors?building_id` (l'étagère), `storage/:id` (les caisses — `product_band` arrivait déjà, jamais lu)
    //   P3  le pupitre suit le TYPE (tranché (a)) : `specialized_lab` l'a aussi, un `front_shop` jamais ; une donnée absente (route en
    //       erreur) ne dessine PAS son échelle — un cran allumé affirmerait un état qu'on n'a pas reçu
    //   P4  les libellés prennent les clés servies de la table 37 : `building.row.le_feu`, `.l_etagere`, `.les_caisses`
    //   P5  RÉEL, LECTURE SEULE (demande de l'orchestrateur, 23/09) : sur un vrai labo du compte `operational_demo`, `LoadBuilding`
    //       remplit les trois échelles depuis `lab/:id`, `precursors?building_id` et `storage/:id`, et chaque échelle dit la VALEUR
    //       que le back sert (vérité terrain lue À PART, par une connexion et trois GET indépendants). Aucune mutation, aucune semence.
    //       + ② lots 2-3 : les charges (`meta/task-categories`) lues à part aussi, et le geste posé est celui de l'état servi.
    [Category("FicheBatiment")]
    public class PupitrePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [SetUp] public void SansCatalogue() => I18nCatalog.Oublier();   // les replis français, quel que soit le test d'avant

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
            I18nCatalog.Oublier();
        }

        private static BuildingCardDto Carte(string type) => new BuildingCardDto
        {
            building = "b-lab", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = type,
            structural_state = "OPERATIONAL", seized_amount = "NONE", repair_cost = "NONE", raid_risk = "LOW",
            lab_tier_band = type == "specialized_lab" ? "BASIC" : "NONE",
        };

        private static LabCookDto Feu(string band) => new LabCookDto { building = "b-lab", substance_type = "BRINDLE", cook_stage_band = band };
        private static GetOperationalPrecursorsResponseDto Etagere(string band) =>
            new GetOperationalPrecursorsResponseDto { building = "b-lab", precursor_type = "PYRALIN", stock_band = band };
        private static StorageDto Caisses(string band) => new StorageDto { building = "b-lab", substance_type = "BRINDLE", product_band = band };

        /// <summary>Monte la fiche SANS réseau : `RendrePourTest` rend dans la même frame, avant tout `Start` (qui se connecterait).</summary>
        private Transform Rendre(BuildingCardDto carte, StorageDto s, LabCookDto l, GetOperationalPrecursorsResponseDto p)
        {
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : `BuildLayout` n'en fabrique pas un qui fuirait
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.RendrePourTest(carte, s, l, p);
            return host.transform;
        }

        private static Transform Ligne(Transform racine, string id) =>
            racine.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Row_" + id);

        private static (int allumes, int total, string libelle, string mot) Lire(Transform ligne)
        {
            Transform crans = ligne.Find("Crans");
            int allumes = crans.Cast<Transform>().Count(c => c.name == "CranAllume");
            int total = crans.childCount;
            return (allumes, total, ligne.Find("Label").GetComponent<TextMeshProUGUI>().text,
                    ligne.Find("Value").GetComponent<TextMeshProUGUI>().text);
        }

        // ----- P5 : réel, lecture seule -----
        private const string BaseUrl = "http://localhost";
        private const string DemoEmail = "operational_demo@example.test";   // le compte SERVI, jamais le compte gelé de capture
        private const string DemoPassword = "operational-demo-pw";
        private static readonly string[] DomaineFeu = { "IDLE", "EARLY", "MID", "LATE", "DONE" };
        private static readonly string[] DomaineStock = { "NONE", "LOW", "MEDIUM", "HIGH" };

        [UnityTest]
        public IEnumerator P5_Reel_LeVraiLabo_RemplitSesTroisEchelles_AvecLaValeurServie()
        {
            // Vérité terrain INDÉPENDANTE : sa propre connexion (sans surcharge d'environnement : le compte est NOMMÉ), ses propres GET.
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = BaseUrl };
            string jeton = null, errAuth = null;
            yield return MafiaCleanCity.CityMap.DemoIdentityResolver.ResolveAndSignIn(auth,
                MafiaCleanCity.CityMap.DemoIdentityResolver.OperationalIdentifierEnvVar,
                MafiaCleanCity.CityMap.DemoIdentityResolver.OperationalPasswordEnvVar,
                DemoEmail, DemoPassword, t => jeton = t, e => errAuth = e, allowEnvironmentOverride: false);
            Assert.IsNull(errAuth, $"connexion operational_demo : {errAuth}");
            Assert.IsFalse(string.IsNullOrEmpty(jeton));

            BatimentPossedeDto[] possedes = null; string errMes = null;
            yield return new MesBatimentsClient { BaseUrl = BaseUrl }.Lire(jeton, b => possedes = b, (c, m) => errMes = $"{c}: {m}");
            Assert.IsNull(errMes, $"GET /v1/me/buildings : {errMes}");
            BatimentPossedeDto labo = possedes.FirstOrDefault(b => b != null && BuildingCardController.APupitre(b.operational_type));
            Assert.IsNotNull(labo, "PRÉCONDITION DU MONDE : operational_demo ne tient aucun lab ni specialized_lab — ce test ne sème rien, "
                + "types tenus : " + string.Join(", ", possedes.Select(b => b?.operational_type)));

            var carte = new BuildingCardClient { BaseUrl = BaseUrl };
            LabCookDto feu = null; StorageDto caisses = null; GetOperationalPrecursorsResponseDto etagere = null;
            string e1 = null, e2 = null, e3 = null;
            yield return carte.GetLab(labo.building, jeton, d => feu = d, (c, m) => e1 = $"{c}: {m}");
            yield return new ChaineDApproClient { BaseUrl = BaseUrl }.GetOperationalPrecursors(jeton, labo.building,
                d => etagere = d, (c, m) => e2 = $"{c}: {m}");
            yield return carte.GetStorage(labo.building, jeton, d => caisses = d, (c, m) => e3 = $"{c}: {m}");
            Assert.IsNull(e1, $"GET lab/{labo.building} ({labo.operational_type}) : {e1}");
            Assert.IsNull(e2, $"GET precursors?building_id={labo.building} : {e2}");
            Assert.IsNull(e3, $"GET storage/{labo.building} : {e3}");
            GetMetaTaskCategoriesResponseDto charges = null; string e4 = null;
            yield return new DelegationClient { BaseUrl = BaseUrl }.GetMetaTaskCategories(jeton, d => charges = d, refus => e4 = refus.message);
            Assert.IsNull(e4, $"GET /v1/meta/task-categories : {e4}");
            Assert.IsTrue(charges.task_categories.Any(c => c.category_key == "SUPPLY_SOURCING"),
                "② lot 3 : la charge SUPPLY_SOURCING est servie (une des 4 LIVE)");
            CollectionAssert.Contains(DomaineFeu, feu.cook_stage_band, "la forme G déclarée : cook_stage_band dans son domaine");
            CollectionAssert.Contains(DomaineStock, etagere.stock_band);
            CollectionAssert.Contains(DomaineStock, caisses.product_band);

            // L'écran, par SON chemin de chargement. Désactivé : pas de `Start` → pas de `Boot` qui signerait un autre compte en parallèle.
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.enabled = false;
            fiche.SetBaseUrl(BaseUrl);
            fiche.SetMountParent(host.transform);
            fiche.SetToken(jeton);
            yield return fiche.LoadBuilding(labo.building);
            Assert.IsTrue(fiche.CardLoaded, $"la fiche s'est chargée : {fiche.CardError}");

            Assert.AreEqual(feu.cook_stage_band, fiche.CurrentLab?.cook_stage_band, "l'écran a lu `lab/:id`");
            Assert.AreEqual(etagere.stock_band, fiche.CurrentPrecursors?.stock_band, "l'écran a lu `precursors`");
            Assert.AreEqual(caisses.product_band, fiche.CurrentStorage?.product_band);

            // ② lots 2-3 : la fiche a lu les MÊMES charges, et pose le geste que l'état servi appelle.
            bool delegue = BuildingCardController.ApprovisionnementDelegue(charges);
            Assert.AreEqual(delegue, BuildingCardController.ApprovisionnementDelegue(fiche.CurrentTaskCategories), "l'écran a lu task-categories");
            Assert.AreEqual(BuildingCardController.GesteSelonLEtat(feu.cook_stage_band, etagere.stock_band, delegue), fiche.GesteDuPupitreAffiche,
                $"le geste de l'état servi (feu {feu.cook_stage_band}, étagère {etagere.stock_band}, appro délégué : {delegue})");

            // ② bulle : la jointure lieutenant → bâtiment, faite À PART (me/buildings déjà lu ci-dessus + le roster), égale à celle de l'écran.
            GetLieutenantsResponseDto roster = null; string e5 = null;
            yield return new DelegationClient { BaseUrl = BaseUrl }.GetLieutenants(jeton, d => roster = d, refus => e5 = refus.message);
            Assert.IsNull(e5, $"GET /v1/lieutenants : {e5}");
            LieutenantRowDto attendu = BuildingCardController.LieutenantDuBatiment(possedes, labo.building, roster.lieutenants);
            Assert.AreEqual(attendu?.lieutenant_id, fiche.CurrentLieutenant?.lieutenant_id, "l'écran parle par le même lieutenant");

            Transform r = host.transform;
            Assert.AreEqual((BuildingCardController.CransDuFeu(feu.cook_stage_band), 5, "le feu",
                             BuildingCardController.CookStageLabel(feu.cook_stage_band)), Lire(Ligne(r, "le_feu")),
                $"le feu dit {feu.cook_stage_band}");
            Assert.AreEqual((BuildingCardController.CransDuStock(etagere.stock_band), 4, "l’étagère",
                             BuildingCardController.StockLabel(etagere.stock_band)), Lire(Ligne(r, "l_etagere")),
                $"l'étagère dit {etagere.stock_band}");
            Assert.AreEqual((BuildingCardController.CransDuStock(caisses.product_band), 4, "les caisses",
                             BuildingCardController.StockLabel(caisses.product_band)), Lire(Ligne(r, "les_caisses")),
                $"les caisses disent {caisses.product_band}");
        }

        [Test]
        public void P1_LesCransSuiventLaBande_LePremierToujoursAllume()
        {
            string[] feu = { "IDLE", "EARLY", "MID", "LATE", "DONE" };
            CollectionAssert.AreEqual(new[] { 1, 2, 3, 4, 5 }, feu.Select(BuildingCardController.CransDuFeu).ToArray(),
                "un cran par valeur du domaine, dans l'ordre de la cuisson");
            Assert.AreEqual(feu.Length, BuildingCardController.CransFeu, "l'échelle a autant de crans que le domaine a de valeurs");
            string[] stock = { "NONE", "LOW", "MEDIUM", "HIGH" };
            CollectionAssert.AreEqual(new[] { 1, 2, 3, 4 }, stock.Select(BuildingCardController.CransDuStock).ToArray());
            Assert.AreEqual(stock.Length, BuildingCardController.CransStock);

            foreach (string horsDomaine in new[] { null, "", "__HORS_DOMAINE__" })
            {
                Assert.AreEqual(1, BuildingCardController.CransDuFeu(horsDomaine), $"« {horsDomaine} » : le premier cran seul");
                Assert.AreEqual(1, BuildingCardController.CransDuStock(horsDomaine));
            }
        }

        [Test]
        public void P2_LeLabo_DessineSesTroisEchelles_ChacuneAvecSesCransEtSonMot()
        {
            Transform r = Rendre(Carte("lab"), Caisses("LOW"), Feu("MID"), Etagere("NONE"));

            Transform feu = Ligne(r, "le_feu"), etagere = Ligne(r, "l_etagere"), caisses = Ligne(r, "les_caisses");
            Assert.IsNotNull(feu, "« le feu » : `lab/:id` est lu");
            Assert.IsNotNull(etagere, "« l'étagère » : `precursors?building_id` est lu");
            Assert.IsNotNull(caisses, "« les caisses » : `product_band`, reçu, est enfin dessiné");

            Assert.AreEqual((3, 5, "le feu", "Montée"), Lire(feu));
            Assert.AreEqual((1, 4, "l’étagère", "Vide"), Lire(etagere), "vide : le premier cran reste allumé");
            Assert.AreEqual((2, 4, "les caisses", "Faible"), Lire(caisses));

            // L'ordre du pupitre : le feu, l'étagère, les caisses (cadre 39).
            Assert.Less(feu.GetSiblingIndex(), etagere.GetSiblingIndex());
            Assert.Less(etagere.GetSiblingIndex(), caisses.GetSiblingIndex());
        }

        [Test]
        public void P3_LePupitreSuitLeType_EtUneDonneeAbsenteNeSeDessinePas()
        {
            Transform ash = Rendre(Carte("specialized_lab"), Caisses("HIGH"), Feu("DONE"), Etagere("MEDIUM"));
            Assert.AreEqual((5, 5, "le feu", "Prêt"), Lire(Ligne(ash, "le_feu")), "le specialized_lab a le même pupitre");
            Assert.AreEqual((3, 4, "l’étagère", "Moyen"), Lire(Ligne(ash, "l_etagere")));
            Assert.AreEqual((4, 4, "les caisses", "Haut"), Lire(Ligne(ash, "les_caisses")));

            Transform commerce = Rendre(Carte("front_shop"), Caisses("HIGH"), Feu("DONE"), Etagere("MEDIUM"));
            Assert.IsNull(Ligne(commerce, "le_feu"), "un commerce n'a pas de pupitre, même si on lui passe des données");
            Assert.IsNull(Ligne(commerce, "l_etagere"));
            Assert.IsNull(Ligne(commerce, "les_caisses"));

            Transform enErreur = Rendre(Carte("lab"), null, null, Etagere("LOW"));
            Assert.IsNull(Ligne(enErreur, "le_feu"), "`lab/:id` en erreur : pas d'échelle, plutôt qu'un « éteint » inventé");
            Assert.IsNull(Ligne(enErreur, "les_caisses"), "`storage/:id` en erreur : pas d'échelle");
            Assert.AreEqual((2, 4, "l’étagère", "Faible"), Lire(Ligne(enErreur, "l_etagere")), "contrôle positif : la donnée reçue se dessine");
        }

        [Test]
        public void P4_LesLibellesPrennentLesClesServiesDeLaTable37()
        {
            Assert.AreEqual("building.row.le_feu", Libelle.CleDe("building", "row", "le feu"));
            Assert.AreEqual("building.row.l_etagere", Libelle.CleDe("building", "row", "l’étagère"));
            Assert.AreEqual("building.row.les_caisses", Libelle.CleDe("building", "row", "les caisses"));

            Libelle.RemettreLesCompteurs();
            Rendre(Carte("lab"), Caisses("NONE"), Feu("IDLE"), Etagere("NONE"));
            foreach (string cle in new[] { "building.row.le_feu", "building.row.l_etagere", "building.row.les_caisses",
                                           "building.cook_stage.idle", "building.stock.none" })
                Assert.IsTrue(Libelle.ClesEnRepli.Contains(cle), $"sans catalogue, « {cle} » est DEMANDÉE (et comptée en repli)");

            // Servies (l'anglais de la table 37) : le libellé ET le mot viennent du catalogue — la clé du mot dérive de la VALEUR servie.
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
            {
                ["building.row.le_feu"] = "the fire", ["building.cook_stage.late"] = "Refining",
                ["building.row.l_etagere"] = "the shelf", ["building.stock.high"] = "High",
            });
            Transform r = Rendre(Carte("lab"), null, Feu("LATE"), Etagere("HIGH"));
            Assert.AreEqual((4, 5, "the fire", "Refining"), Lire(Ligne(r, "le_feu")));
            Assert.AreEqual((4, 4, "the shelf", "High"), Lire(Ligne(r, "l_etagere")));
        }
    }
}
