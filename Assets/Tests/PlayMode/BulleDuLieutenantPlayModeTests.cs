using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ② bulle du lieutenant (B1, cadres 39-44 ; 2026-09-23) — la jointure lieutenant → bâtiment, sans réseau :
    //   B1  le lieutenant de CE bâtiment : le premier de ses `lieutenant_ids` (ordre servi) présent au roster ; un id inconnu est sauté ;
    //       les lieutenants d'un AUTRE bâtiment ne parlent pas ici
    //   B2  la bulle : l'archétype servi en tête, UNE fois, SANS article et SANS nom (les noms attendent l'user) ; puis les répliques
    //   B3  sans lieutenant : AUCUNE réplique ni en-tête — les blocs (le refus dit, où reprendre la main) restent
    [Category("FicheBatiment")]
    public class BulleDuLieutenantPlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [SetUp] public void SansCatalogue() { I18nCatalog.Oublier(); Libelle.RemettreLesCompteurs(); }

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
            I18nCatalog.Oublier();
        }

        private static LieutenantRowDto Lt(string id, string archetype) => new LieutenantRowDto { lieutenant_id = id, name = "Lt. " + id, archetype = archetype };

        private Transform Rendre(LieutenantRowDto lieutenant)
        {
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : aucun ne fuit
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.RendrePourTest(new BuildingCardDto
            {
                building = "b-lab", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = "lab",
                structural_state = "OPERATIONAL", seized_amount = "NONE", repair_cost = "NONE", raid_risk = "LOW", lab_tier_band = "NONE",
            }, lab: new LabCookDto { building = "b-lab", cook_stage_band = "MID" },
               precursors: new GetOperationalPrecursorsResponseDto { building = "b-lab", stock_band = "LOW", precursor_type = "PYRALIN" },
               lieutenant: lieutenant);
            return host.transform;
        }

        private static string[] Textes(Transform r, string nom) =>
            r.GetComponentsInChildren<TextMeshProUGUI>(true).Where(t => t.name == nom).Select(t => t.text).ToArray();

        [Test]
        public void B1_LeLieutenantDeCeBatiment_PremierIdServiPresentAuRoster()
        {
            var mes = new[]
            {
                new BatimentPossedeDto { building = "b-autre", lieutenant_ids = new[] { "lt-a" } },
                new BatimentPossedeDto { building = "b-lab", lieutenant_ids = new[] { "lt-fantome", "lt-b", "lt-c" } },
            };
            var roster = new[] { Lt("lt-c", "SECURITY"), Lt("lt-a", "LOGISTICS"), Lt("lt-b", "COOK") };
            Assert.AreEqual("lt-b", BuildingCardController.LieutenantDuBatiment(mes, "b-lab", roster)?.lieutenant_id,
                "l'ordre SERVI des lieutenant_ids, pas celui du roster ; l'id sans ligne au roster est sauté");
            Assert.AreEqual("lt-a", BuildingCardController.LieutenantDuBatiment(mes, "b-autre", roster)?.lieutenant_id);
            Assert.IsNull(BuildingCardController.LieutenantDuBatiment(mes, "b-inconnu", roster), "un bâtiment absent : personne");
            Assert.IsNull(BuildingCardController.LieutenantDuBatiment(
                new[] { new BatimentPossedeDto { building = "b-lab", lieutenant_ids = new string[0] } }, "b-lab", roster), "aucun lieutenant");
            Assert.IsNull(BuildingCardController.LieutenantDuBatiment(null, "b-lab", roster), "me/buildings non lu");
            Assert.IsNull(BuildingCardController.LieutenantDuBatiment(mes, "b-lab", null), "roster non lu");
        }

        [Test]
        public void B2_LaBulle_LArchetypeEnTeteUneFois_SansNom()
        {
            Transform r = Rendre(Lt("lt-b", "COOK"));
            CollectionAssert.AreEqual(new[] { "Cuisinier" }, Textes(r, "Locuteur"), "l'archétype servi, une fois, sans article (D13)");
            Assert.AreEqual(2, Textes(r, "Replique").Length, "en cuisson : les deux répliques du cadre 41");
            Transform locuteur = r.GetComponentsInChildren<Transform>(true).First(t => t.name == "Locuteur");
            Transform premiere = r.GetComponentsInChildren<Transform>(true).First(t => t.name == "Replique");
            Assert.Less(locuteur.GetSiblingIndex(), premiere.GetSiblingIndex(), "l'en-tête AVANT la réplique");
            Assert.IsFalse(r.GetComponentsInChildren<TextMeshProUGUI>(true).Any(t => t.text.Contains("Lt. ")),
                "aucun nom : ils attendent la décision de l'user (Nestor / Hara)");
            Assert.IsTrue(Libelle.ClesEnRepli.Contains("famille.archetype.cuisinier"), "le mot servi de la Famille, pas un mot du client");
        }

        [Test]
        public void B3_SansLieutenant_AucuneReplique_LesBlocsRestent()
        {
            Transform r = Rendre(null);
            Assert.IsEmpty(Textes(r, "Locuteur"));
            Assert.IsEmpty(Textes(r, "Replique"), "personne pour parler : pas de réplique");
            CollectionAssert.AreEqual(new[] { "Rien à faire ici.", "Repassez quand ce sera tiré" }, Textes(r, "Bloc"),
                "le refus reste dit, lui : il n'est la voix de personne");
        }

        [Test]
        public void B4_LesRepliquesPartagentUneBulle_LesConstatsRestentDehors()
        {
            Transform r = Rendre(Lt("lt-b", "COOK"));
            Transform bulle = r.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "BulleLieutenant");
            Assert.IsNotNull(bulle, "le lieutenant parle dans un composant visuel dédié");
            Assert.AreEqual(bulle, r.GetComponentsInChildren<Transform>(true).First(t => t.name == "Locuteur").parent);
            Assert.IsTrue(r.GetComponentsInChildren<Transform>(true).Where(t => t.name == "Replique").All(t => t.parent == bulle),
                "toutes les phrases du même locuteur restent dans la même bulle");
            Assert.IsTrue(r.GetComponentsInChildren<Transform>(true).Where(t => t.name == "Bloc").All(t => t.parent != bulle),
                "les constats du système ne sont pas attribués au lieutenant");
            Assert.IsNotNull(bulle.GetComponent<UnityEngine.UI.Image>(), "la bulle a un fond, pas seulement un nom dans l'arbre");
            Assert.IsNotNull(bulle.GetComponent<UnityEngine.UI.VerticalLayoutGroup>());

            Transform pupitre = r.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "PupitreLaboratoire");
            Assert.IsNotNull(pupitre, "un état de cuisson connu ouvre la composition du laboratoire");
            Assert.IsNotNull(pupitre.Find("AppareilLaboratoire"));
            Assert.AreEqual(pupitre, r.GetComponentsInChildren<Transform>(true).First(t => t.name == "Row_le_feu").parent);
            Assert.AreEqual(pupitre, r.GetComponentsInChildren<Transform>(true).First(t => t.name == "Row_l_etagere").parent);
            Assert.IsFalse(r.GetComponentsInChildren<Transform>(true).Any(t => t.name == "Row_mise_en_place"),
                "le pupitre actif ne répète pas la fiche technique générique");
            CollectionAssert.Contains(Textes(r, "Section"), "LE PUPITRE");
            Assert.IsFalse(r.GetComponentsInChildren<Transform>(true).Any(t => t.name == "Action_ouvrir"),
                "ouvrir/conversion ne parasite pas le geste appelé par la cuisson");
        }
    }
}
