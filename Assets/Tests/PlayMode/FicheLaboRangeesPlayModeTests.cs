using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Operational.Tests
{
    // ② LA FICHE D'UN LABO : RANGÉES D'ÉTAT OU PUPITRE (26/09) — `BuildingCardPlayModeTests.LoadsLabCard` rougissait au run de CLIENT-2 :
    // il attendait les rangées « Mise en place / En service / Couverture » alors que, depuis 4ab3abcf (23/09, « Mettre en scène le pupitre
    // du laboratoire »), un labo dont la route `lab` répond montre le PUPITRE À LA PLACE. Tranché sur la maquette ratifiée : les cadres
    // 45-47 (le fourneau) montrent le pupitre SANS ces rangées ⇒ le code a raison, l'attente était périmée. La donnée ne fait que choisir
    // la branche ; les deux branches sont donc épinglées ICI, hors réseau (`RendrePourTest`), et la jambe réseau n'asserte plus que la donnée.
    //   L1  labo SANS réponse de la route `lab` : les rangées d'état, et pas de pupitre
    //   L2  labo servi : le pupitre, et AUCUNE des rangées qu'il remplace
    [Category("FicheLabo")]
    public class FicheLaboRangeesPlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
        }

        private BuildingCardController Fiche(LabCookDto lab)
        {
            var host = new GameObject("FicheLabo", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : aucun ne fuit
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.RendrePourTest(new BuildingCardDto
            {
                building = "b-lab", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = "lab",
                structural_state = "OPERATIONAL", seized_amount = "NONE", repair_cost = "NONE", raid_risk = "LOW", lab_tier_band = "NONE",
            }, lab: lab);
            return fiche;
        }

        private static bool Pupitre(BuildingCardController f) =>
            f.transform.GetComponentsInChildren<Transform>(true).Any(t => t.name == "PupitreLaboratoire" && t.gameObject.activeInHierarchy);

        [Test]
        public void L1_SansRouteLab_LesRangeesDEtat()
        {
            BuildingCardController f = Fiche(lab: null);
            var textes = f.RenderedTexts;
            Assert.IsTrue(textes.Any(t => t == BuildingCardController.SetupLabel("OPERATIONAL")), "« Mise en place » rendue");
            Assert.IsTrue(textes.Any(t => t == "oui"), "« En service » rendu « oui »");
            Assert.IsTrue(textes.Any(t => t == BuildingCardController.CoverLabel("WEAK")), "« Couverture » rendue");
            Assert.IsFalse(Pupitre(f), "pas de pupitre sans la route lab");
        }

        [Test]
        public void L2_LaboServi_LePupitreRemplaceLesRangees()
        {
            BuildingCardController f = Fiche(new LabCookDto { building = "b-lab", cook_stage_band = "MID" });
            Assert.IsTrue(Pupitre(f), "le pupitre du labo est monté (maquette ②, cadres 45-47)");
            var textes = f.RenderedTexts;
            Assert.IsFalse(textes.Any(t => t == BuildingCardController.SetupLabel("OPERATIONAL")), "« Mise en place » remplacée par le pupitre");
            Assert.IsFalse(textes.Any(t => t == BuildingCardController.CoverLabel("WEAK")), "« Couverture » remplacée par le pupitre");
        }
    }
}
