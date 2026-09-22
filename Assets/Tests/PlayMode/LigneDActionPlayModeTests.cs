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
        public void Succes_LeTexteDeSucces()
        {
            var o = new ActionOutcome { Ok = true, HttpStatus = 200, Message = "ok" };
            Assert.AreEqual("Réparation lancée", BuildingCardController.LigneDAction(o, "Réparation lancée", "Impossible de réparer"));
        }
    }
}
