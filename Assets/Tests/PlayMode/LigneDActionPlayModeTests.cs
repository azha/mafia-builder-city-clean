using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Operational.Tests
{
    // Atelier ④ annexe c2-bis (2026-09-22) : après le tiret d'un échec de la fiche, le TEXTE de la clé
    // `user_facing_i18n_key` quand le bundle la connaît ; sinon l'échec seul. Jamais le `message` de
    // développeur de l'enveloppe, jamais un code HTTP. Tests PURS : le catalogue est chargé pour le test.
    [Category("I18n")]
    public class LigneDActionTests
    {
        private const string Cle = "error.compression.budget_exhausted";
        private const string Texte = "Il n'y a plus de place pour ceci aujourd'hui. Reprenez demain.";

        [TearDown] public void Nettoyer() => I18nCatalog.Oublier();

        [Test]
        public void CleConnue_LeTexteFrancaisSuitLeTiret()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { Cle, Texte } });
            var o = new ActionOutcome { Ok = false, HttpStatus = 409, Message = "Budget exhausted for today", CleI18n = Cle };
            Assert.AreEqual("Impossible de réparer — " + Texte,
                BuildingCardController.LigneDAction(o, "Réparation lancée", "Impossible de réparer"));
        }

        [Test]
        public void CleInconnue_LEchecSeul_EtAucunMotDuMessageDeDeveloppeur()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "error.autre", "autre" } });
            var o = new ActionOutcome { Ok = false, HttpStatus = 409, Message = "Structural state must be DAMAGED", CleI18n = "error.inconnue.de.ce.bundle" };
            string ligne = BuildingCardController.LigneDAction(o, "Réparation lancée", "Impossible de réparer");
            Assert.AreEqual("Impossible de réparer.", ligne);
            StringAssert.DoesNotContain("Structural", ligne, "le message de développeur ne sort jamais");
        }

        [Test]
        public void SansCle_NiMessageNiCode()
        {
            var o = new ActionOutcome { Ok = false, HttpStatus = 500, Message = "request failed (500) Internal Server Error", CleI18n = null };
            string ligne = BuildingCardController.LigneDAction(o, "Réparation lancée", "Impossible de réparer");
            Assert.AreEqual("Impossible de réparer.", ligne);
            StringAssert.DoesNotContain("500", ligne, "un code HTTP ne sort jamais");
        }

        [Test]
        public void CleGenerique_LEchecSeul()
        {
            // T3 (suivi ⊥ UX §I, f2 26/09) : le 422 de StartCook sert error.validation.failed, présente au bundle
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
                { { "error.validation.failed", "Une partie de ce que vous avez saisi n’est pas acceptée." } });
            var o = new ActionOutcome { Ok = false, HttpStatus = 422, Message = "validation failed", CleI18n = "error.validation.failed" };
            Assert.AreEqual("Impossible de lancer la cuisson.",
                BuildingCardController.LigneDAction(o, "Cuisson lancée", "Impossible de lancer la cuisson"));
        }

        [Test]
        public void Succes_LeTexteDeSucces()
        {
            var o = new ActionOutcome { Ok = true, HttpStatus = 200, Message = "ok" };
            Assert.AreEqual("Réparation lancée", BuildingCardController.LigneDAction(o, "Réparation lancée", "Impossible de réparer"));
        }
    }

    // Lot E (2026-09-22) : la clé d'une bande se dérive de la VALEUR SERVIE, jamais du mot ; le repli
    // français s'affiche tant qu'elle n'est pas servie, et il se compte.
    [Category("I18n")]
    public class LibelleParValeurTests
    {
        [TearDown] public void Nettoyer() { I18nCatalog.Oublier(); Libelle.RemettreLesCompteurs(); }

        [Test]
        public void LaCleVientDeLaValeurServie_QuelleQueSoitSaCasse()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "building.type.distribution_hub", "Relais" } });
            Assert.AreEqual("Relais", Libelle.ParValeur("building", "type", "distribution_hub", "repli"));
            Assert.AreEqual("Relais", Libelle.ParValeur("building", "type", "DISTRIBUTION_HUB", "repli"),
                "la casse de la valeur servie ne décide pas : la clé est le slug, en minuscules");
        }

        [Test]
        public void CleNonServie_LeRepliFrancais_EtIlSeCompte()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>());
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("gros frais", Libelle.ParValeur("building", "repair_cost", "MAJOR", "gros frais"));
            Assert.AreEqual(1, Libelle.NbReplis, "un repli invisible ne se trouve pas en regardant : il se compte");
            Assert.AreEqual("building.repair_cost.major", Libelle.DernierRepli, "la clé est celle de la valeur, pas du mot « gros frais »");
        }

        [Test]
        public void ValeurVide_LeRepliSansDemanderDeCle()
        {
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("Pas encore ouvert", Libelle.ParValeur("building", "type", null, "Pas encore ouvert"));
            Assert.AreEqual(0, Libelle.NbAppels, "aucune valeur servie ⇒ aucune clé demandée");
        }
    }
}
