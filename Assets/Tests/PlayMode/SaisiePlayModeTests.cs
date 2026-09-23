using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ② lot 6 (2026-09-23, écart ② `c4520078`, cadre 47 F3 « STOCK SAISI ») — LA SAISIE, sans réseau :
    //   Z1  un bâtiment qui a subi une descente montre UNE ligne « Saisie » dont la valeur est le MOT de la bande servie — plus de
    //       rangée « Alerte », plus de préfixe « Descente — saisi : » écrit en dur ; un bâtiment sain n'en montre aucune
    //   Z2  le libellé et le mot viennent des clés servies `building.row.saisie` et `building.seized_amount.*`
    [Category("FicheBatiment")]
    public class SaisiePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [SetUp] public void SansCatalogue() => I18nCatalog.Oublier();

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
            I18nCatalog.Oublier();
        }

        private static BuildingCardDto Carte(bool descente, string saisi) => new BuildingCardDto
        {
            building = "b-lab", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = "stash",
            structural_state = descente ? "DAMAGED" : "OPERATIONAL", recently_raided = descente, seized_amount = saisi,
            repair_cost = descente ? "MINOR" : "NONE", raid_risk = "HIGH", lab_tier_band = "NONE",
        };

        private (BuildingCardController fiche, Transform racine) Rendre(BuildingCardDto carte)
        {
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : aucun ne fuit
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.RendrePourTest(carte);
            return (fiche, host.transform);
        }

        private static Transform Ligne(Transform racine, string id) =>
            racine.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Row_" + id);

        [Test]
        public void Z1_LaSaisie_UneLigne_LeMotDeLaBande_SansPrefixeEnDur()
        {
            var (fiche, r) = Rendre(Carte(true, "LOW"));
            Transform l = Ligne(r, "stock_saisi");
            Assert.IsNotNull(l, "une descente : la ligne de la saisie");
            Assert.AreEqual("Saisie", l.Find("Label").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("une petite prise", l.Find("Value").GetComponent<TextMeshProUGUI>().text, "la valeur est le mot de la bande, seul");
            Assert.IsNull(Ligne(r, "alerte"), "plus de rangée « Alerte »");
            Assert.IsFalse(fiche.RenderedTexts.Any(t => t != null && t.Contains("Descente —")), "plus de préfixe écrit en dur");

            var (_, rien) = Rendre(Carte(true, "NONE"));
            Assert.AreEqual("rien", Ligne(rien, "stock_saisi").Find("Value").GetComponent<TextMeshProUGUI>().text,
                "une descente qui n'a rien pris le dit");

            var (_, sain) = Rendre(Carte(false, "NONE"));
            Assert.IsNull(Ligne(sain, "stock_saisi"), "pas de descente : pas de ligne de saisie");
        }

        [Test]
        public void Z2_LeLibelleEtLeMot_VenantDesClesServies()
        {
            Libelle.RemettreLesCompteurs();
            Rendre(Carte(true, "HIGH"));
            Assert.IsTrue(Libelle.ClesEnRepli.Contains("building.row.saisie"), "sans catalogue, la clé du libellé est DEMANDÉE");
            Assert.IsTrue(Libelle.ClesEnRepli.Contains("building.seized_amount.high"), "et celle du mot, dérivée de la valeur servie");

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
            {
                ["building.row.saisie"] = "Seizure", ["building.seized_amount.high"] = "a heavy haul",
            });
            var (_, r) = Rendre(Carte(true, "HIGH"));
            Transform l = Ligne(r, "stock_saisi");
            Assert.AreEqual("Seizure", l.Find("Label").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("a heavy haul", l.Find("Value").GetComponent<TextMeshProUGUI>().text);
        }
    }
}
