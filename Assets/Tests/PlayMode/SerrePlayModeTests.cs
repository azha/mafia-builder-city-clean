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
    // ② lot 4 (2026-09-23, écart ② `c4520078`, cadres 36-38) — LA SERRE, sans réseau :
    //   S1  plus de rangée « Culture » : elle affirmait la sélection LOCALE comme culture plantée, et la pousse ne sert pas son précurseur
    //       (manque du back n°4) — rien plutôt qu'un faux, même quand le sélecteur a une valeur
    //   S2  « À soigner » est le MOT de WITHERED ; `tend_due` pilote le GESTE (tranché (c)) : les deux coexistent, l'un ne remplace pas
    //       l'autre — WITHERED sans `tend_due` garde son mot et grise le geste, `tend_due` sur une pousse correcte active le geste
    //   S3  sans catalogue, les replis sont les mots D14 SERVIS (Bouture / Croissance / Floraison / Récolte ; À soigner / Correcte /
    //       Vigoureuse) — plus les mots périmés (« Début / Milieu / Fin / À récolter », « Flétrie / En bonne voie / Florissante »)
    [Category("FicheBatiment")]
    public class SerrePlayModeTests
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

        private static readonly BuildingCardDto Serre = new BuildingCardDto
        {
            building = "b-serre", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = "grow_house",
            structural_state = "OPERATIONAL", seized_amount = "NONE", repair_cost = "NONE", raid_risk = "ELEVATED", lab_tier_band = "NONE",
        };

        private static GrowSessionDto Pousse(string stade, string soin, bool due) =>
            new GrowSessionDto { grow_session = "g-1", grow_stage_band = stade, husbandry_band = soin, tend_due = due };

        private (BuildingCardController fiche, Transform racine) Rendre(GrowSessionDto pousse)
        {
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : aucun ne fuit
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.RendrePourTest(Serre, grow: pousse);
            return (fiche, host.transform);
        }

        private static string Valeur(Transform racine, string id)
        {
            Transform ligne = racine.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Row_" + id);
            return ligne == null ? null : ligne.Find("Value").GetComponent<TextMeshProUGUI>().text;
        }

        [Test]
        public void S1_PlusDeRangeeCulture_LaCultureNEstPasServie()
        {
            var (fiche, r) = Rendre(Pousse("MID", "ON_TRACK", true));
            Assert.IsNotNull(fiche.SelectedPrecursor, "anti-vacuité : le sélecteur a bien une valeur locale, celle qu'on affichait");
            Assert.IsNotNull(Valeur(r, "pousse"), "contrôle positif : la pousse servie est dessinée");
            Assert.IsNull(Valeur(r, "culture"), "aucune rangée « Culture » : la sélection locale n'est pas une culture plantée");
            Assert.IsFalse(fiche.RenderedTexts.Contains(BuildingCardController.GrowablePrecursorLabel(fiche.SelectedPrecursor)),
                "le nom du précurseur sélectionné n'est affiché nulle part sur une serre qui pousse");
        }

        [Test]
        public void S2_ASoigner_EstLeMotDeWithered_TendDuePiloteLeGeste()
        {
            var (fanee, rf) = Rendre(Pousse("MID", "WITHERED", false));
            Assert.AreEqual("À soigner", Valeur(rf, "soin"), "WITHERED dit « À soigner », même soignée à ce stade");
            Assert.IsTrue(fanee.TendButtonShown);
            Assert.IsFalse(fanee.TendButtonEnabled, "pas de `tend_due` : le geste est grisé, le mot reste");

            var (due, rd) = Rendre(Pousse("MID", "ON_TRACK", true));
            Assert.AreEqual("Correcte", Valeur(rd, "soin"), "`tend_due` ne change pas le mot de la bande");
            Assert.IsTrue(due.TendButtonEnabled, "`tend_due` active le geste");
        }

        [Test]
        public void S3_LesReplisSontLesMotsD14Servis()
        {
            CollectionAssert.AreEqual(new[] { "Bouture", "Croissance", "Floraison", "Récolte" },
                new[] { "EARLY", "MID", "LATE", "DONE" }.Select(BuildingCardController.GrowStageLabel).ToArray());
            CollectionAssert.AreEqual(new[] { "À soigner", "Correcte", "Vigoureuse" },
                new[] { "WITHERED", "ON_TRACK", "THRIVING" }.Select(BuildingCardController.HusbandryLabel).ToArray());
        }
    }
}
