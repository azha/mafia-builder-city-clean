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

    // GABARIT EXIGEANT (f2 26/09, table 64) — opt-in par site : une valeur servie qui ne porte pas le trou requis compte comme NON
    // servie (repli COMPTÉ) ; avec le trou, la valeur servie. Sites : ㉚ Nestor, ㉝ demolition.dit.*. (La carte préparée et ㉕ en sont sortis : D37, E3.)
    [Category("I18n")]
    public class GabaritExigeantTests
    {
        [TearDown] public void Nettoyer() { I18nCatalog.Oublier(); Libelle.RemettreLesCompteurs(); }

        private const string Repli = "{nom}\u00A0: «\u00A0L’étagère est vide.\u00A0»";
        private static Dictionary<string, string> Nom(string n) => new Dictionary<string, string> { { "nom", n } };

        [Test]
        public void E1_ServieSansLeTrou_LeRepliNomme_Compte()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "appro.bloc.x", "Nestor\u00A0: «\u00A0L’étagère est vide.\u00A0»" } });
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("Lt. Vesk\u00A0: «\u00A0L’étagère est vide.\u00A0»", Libelle.GabaritExigeant("appro.bloc.x", Repli, Nom("Lt. Vesk"), "nom"),
                "valeur servie sans {nom} ⇒ le repli de la 64, avec le vrai nom");
            CollectionAssert.Contains(Libelle.ClesEnRepli, "appro.bloc.x", "compte comme NON servie");
            Assert.AreEqual("Nestor\u00A0: «\u00A0L’étagère est vide.\u00A0»", Libelle.Gabarit("appro.bloc.x", Repli, Nom("Lt. Vesk")),
                "témoin : le Gabarit ordinaire rend la valeur servie (le défaut que l'exigeant corrige)");
        }

        [Test]
        public void E2_ServieAvecLeTrou_LaValeurServie()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "appro.bloc.x", "{nom} dit : l’étagère est vide." } });
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("Lt. Vesk dit : l’étagère est vide.", Libelle.GabaritExigeant("appro.bloc.x", Repli, Nom("Lt. Vesk"), "nom"));
            CollectionAssert.DoesNotContain(Libelle.ClesEnRepli, "appro.bloc.x");
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "appro.bloc.y", "{nom, select, other {Lui}} parle." } });
            Assert.AreEqual("Lui parle.", Libelle.GabaritExigeant("appro.bloc.y", Repli, Nom("Lt. Vesk"), "nom"), "un argument ICU porte le trou");
        }

        [Test]
        public void E3_LaCartePreparee_NOuvreJamaisSurUnNom()
        {
            // T1 (atelier D37, table 64 @8d9b9e3a) : l'opt-in exigeant est RETIRÉ de ce site ; garde : le rendu ne commence JAMAIS par
            // le nom du lieutenant (ni figé « Lt. Hara — », ni le sien « Lt. Tull — » : l'en-tête de la bulle le nomme déjà)
            const string D37 = "Cuisson du soir bloquée : plus de Pyralin au labo. Il en faut avant de rallumer.";
            var carte = new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto
            {
                event_descriptor_i18n = new MafiaCleanCity.Operational.Exceptions.I18nRefDto { key = "onboarding.preseed_exception.card" },
                lieutenant = new MafiaCleanCity.Operational.Exceptions.ExceptionLieutenantDto { id = "lt", name = "Lt. Tull" },
                lieutenant_id = "lt",
            };
            foreach (string servie in new[] { "Lt. Hara — cuisson du soir bloquée : plus de solvant.", "{nom} — cuisson du soir bloquée.", D37, null })
            {
                if (servie == null) I18nCatalog.Oublier();
                else I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "onboarding.preseed_exception.card", servie } });
                string t = MafiaCleanCity.Operational.Exceptions.ExceptionBandes.TexteServeur(carte);
                Assert.IsFalse(t.StartsWith("Lt. Tull") || t.StartsWith("Lt. Hara") || t.StartsWith("{nom}"),
                    $"servie « {servie} » ⇒ « {t} » ouvre sur un nom");
                Assert.AreEqual(D37, t, $"servie « {servie} »");
            }
        }

        [Test]
        public void E4_LePont_NeTouchePasUneAutreCle()
        {
            // portée du pont TD-763 : les deux clés T1 SEULEMENT (f2) — ailleurs, une réplique qui ouvre sur un nom passe telle quelle
            Assert.IsTrue(NomsFiges.EstPerime("onboarding.preseed_exception.card", "Lt. Hara — cuisson."));
            Assert.IsTrue(NomsFiges.EstPerime("tutorial.exception_card.onboarding_preseed", "Lt. Skeld — cuisson."));
            Assert.IsFalse(NomsFiges.EstPerime("appro.bloc.autre", "Lt. Hara — cuisson."), "autre clé : jamais");
            Assert.IsFalse(NomsFiges.EstPerime("onboarding.preseed_exception.card", "Cuisson du soir bloquée."), "D37 : pas périmée");
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
