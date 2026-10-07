using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㊵ — ÉTAT VIDE FAUX (passe UX 2026-09-26) : « Obtenir une planque » à un joueur qui EN A une (le kit la donne). La planque servie
    // (district/:id/stash) se nomme par l'enseigne que `me/buildings` sert pour son bâtiment. Hors réseau.
    //   V1  l'enseigne servie du bâtiment de la planque ; bâtiment ou enseigne absents ⇒ null (on n'en invente pas)
    //   V2  le mot de la table 63 porte l'enseigne en paramètre (repli à l'octet)
    //   V4-V6 ㊵ (f2 26/09) : la planque la plus chargée (règle unique avec l'Accueil), le geste BLANCHIR suit la charge SERVIE, la tête ne
    //       dit jamais « vide » quand la planque tient de quoi blanchir
    //   (V3, l'étiquette « MAILLON MANQUANT », est RETIRÉE le 08/10 avec les maillons eux-mêmes : A2 du juge groupé du 07/10 — la
    //    chaîne vide se dit dans sa boîte, en une phrase centrée, cadres 140-141 ; voir FiliereOrdreEtEcartPlayModeTests)
    [Category("PlanqueVide")]
    public class PlanqueVidePlayModeTests
    {
        [TearDown] public void Oublier() => I18nCatalog.Oublier();

        private static BatimentPossedeDto B(string id, string enseigne) => new BatimentPossedeDto
        {
            building = id, name_i18n = new NomDeBatimentI18nDto { key = "game.fiction.building.name", @params = new NomDeBatimentParamsDto { enseigne = enseigne } },
        };

        [Test]
        public void V1_LEnseigneServie_DuBatimentDeLaPlanque()
        {
            var kit = new[] { B("lab", "Atelier Vesk"), B("depot", "Dépôt Oster") };
            Assert.AreEqual("Dépôt Oster", FiliereScreenController.EnseigneDe(kit, "depot"));
            Assert.IsNull(FiliereScreenController.EnseigneDe(kit, "inconnu"));
            Assert.IsNull(FiliereScreenController.EnseigneDe(new[] { B("depot", "  ") }, "depot"), "enseigne vide : rien");
            Assert.IsNull(FiliereScreenController.EnseigneDe(null, "depot"));
        }

        [Test]
        public void V2_LeMotDeLaTable63_PorteLEnseigne()
        {
            I18nCatalog.Oublier();   // clé non servie : le REPLI, paramètre rempli
            string t = Libelle.Gabarit("filiere.vide.votre_planque_enseigne_est_vide", "Votre planque, {enseigne}, est vide.",
                new Dictionary<string, string> { { "enseigne", "Dépôt Oster" } });
            Assert.AreEqual("Votre planque, Dépôt Oster, est vide.", t);
        }

    
        // ── ㊵ planque non vide + BLANCHIR (f2 26/09, relevé f1 §K.5) ──────────────────────────────────────────────────────────────
        private static MafiaCleanCity.CityMap.SafehouseDto P(string id, string charge) =>
            new MafiaCleanCity.CityMap.SafehouseDto { safehouse_id = id, building_id = "b-" + id, load_bucket = charge };

        [Test]
        public void V4_LaPlanqueLaPlusChargee_LaRegleDeLAccueil()
        {
            Assert.AreEqual("h", FiliereScreenController.PlusChargee(new[] { P("v", "EMPTY"), P("h", "HIGH"), P("n", "NOMINAL") }).safehouse_id);
            Assert.AreEqual("a", FiliereScreenController.PlusChargee(new[] { P("a", "NOMINAL"), P("b", "NOMINAL") }).safehouse_id, "à rang égal : la première");
            Assert.IsNull(FiliereScreenController.PlusChargee(new MafiaCleanCity.CityMap.SafehouseDto[0]));
            // le domaine de la charge (StashLoadBucket), et hors domaine ⇒ -1. À la fusion, LaSuite.RangDeCharge (CLIENT-1) DÉLÈGUE à
            // ChargeDePlanque.Rang : une seule règle pour l'Accueil et ㊵.
            CollectionAssert.AreEqual(new[] { 0, 1, 2, 3, 4, -1, -1 },
                new[] { "EMPTY", "LOW", "NOMINAL", "HIGH", "FULL", "INCONNU", null }.Select(MafiaCleanCity.Shell.ChargeDePlanque.Rang).ToArray());
        }

        [Test]
        public void V5_LeGesteBlanchir_SuitLaChargeServie()
        {
            Assert.IsTrue(FiliereScreenController.GesteBlanchirOffert("NOMINAL", "facade", "planque"), "l'amorce du kit : le geste est là");
            Assert.IsTrue(FiliereScreenController.GesteBlanchirOffert("FULL", "facade", "planque"));
            Assert.IsFalse(FiliereScreenController.GesteBlanchirOffert("EMPTY", "facade", "planque"), "vide : absent");
            Assert.IsFalse(FiliereScreenController.GesteBlanchirOffert("INCONNU", "facade", "planque"), "hors domaine : on ne promet rien");
            Assert.IsFalse(FiliereScreenController.GesteBlanchirOffert("NOMINAL", null, "planque"), "sans façade : absent");
        }

        [Test]
        public void V6_LaTete_NeDitJamaisVide_QuandLaPlanqueTientDeQuoiBlanchir()
        {
            I18nCatalog.Oublier();
            Assert.AreEqual("Votre planque, Dépôt Oster, tient de quoi blanchir.", FiliereScreenController.TeteDeLaPlanque("NOMINAL", "Dépôt Oster"));
            Assert.AreEqual("Votre planque tient de quoi blanchir.", FiliereScreenController.TeteDeLaPlanque("LOW", null));
            Assert.AreEqual("À blanchir : la planque est pleine.", FiliereScreenController.TeteDeLaPlanque("FULL", "Dépôt Oster"));
            Assert.AreEqual("Votre planque, Dépôt Oster, est vide.", FiliereScreenController.TeteDeLaPlanque("EMPTY", "Dépôt Oster"));
            foreach (string c in new[] { "LOW", "NOMINAL", "HIGH", "FULL" })
                StringAssert.DoesNotContain("vide", FiliereScreenController.TeteDeLaPlanque(c, "Dépôt Oster"), $"« {c} » : jamais « vide »");
        }
}
}
