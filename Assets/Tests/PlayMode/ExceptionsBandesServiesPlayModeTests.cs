using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Exceptions;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-5 — les bandes par `Libelle.ParValeur` (clé = valeur servie), replis = les mots de l'atelier (11-… §3.2).
    //   R14     la population ENTIÈRE des trois domaines (3 + 4 + 3), lue sur `ExceptionBandes.Domaine*` et non recopiée :
    //           sans catalogue, chaque valeur rend le mot de l'atelier à majuscule initiale — non vide, jamais l'enum brut,
    //           jamais `—` ; « Silencieuse » n'existe plus, « Likely » non plus
    //   R14bis  une clé SERVIE l'emporte sur le repli, et reçoit la même majuscule initiale
    //   R14ter  le domaine reste fermé : une clé servie pour une valeur hors domaine ne la rouvre pas
    // Rangée sous EcranFile : les comptes d'EcranExceptions (CLIENT-1) ne bougent pas.
    [Category("EcranFile")]
    public class ExceptionsBandesServiesPlayModeTests
    {
        [TearDown]
        public void TearDown() => I18nCatalog.Oublier();

        private static readonly Dictionary<string, string> Attendus = new Dictionary<string, string>
        {
            { "gravite:SEVERE", "Grave" }, { "gravite:MODERATE", "Modérée" }, { "gravite:MILD", "Légère" },
            { "priorite:critical", "Critique" }, { "priorite:urgent", "Urgente" },
            { "priorite:watching", "À surveiller" }, { "priorite:silent", "Sans urgence" },
            { "confiance:confident", "Il est sûr" }, { "confiance:likely", "Il le croit" }, { "confiance:tentative", "Il hésite" },
        };

        [Test]
        public void R14_LesDixValeurs_RendentLeMotDeLAtelier()
        {
            int vues = 0;
            foreach (string v in ExceptionBandes.DomaineGravite) { Verifier("gravite:" + v, v, ExceptionBandes.Gravite(v)); vues++; }
            foreach (string v in ExceptionBandes.DomainePriorite) { Verifier("priorite:" + v, v, ExceptionBandes.Priorite(v)); vues++; }
            foreach (string v in ExceptionBandes.DomaineConfiance) { Verifier("confiance:" + v, v, ExceptionBandes.Confiance(v)); vues++; }
            Assert.AreEqual(Attendus.Count, vues, "chaque valeur de chaque domaine a son mot, et aucun mot n'est orphelin");
            Assert.AreEqual("Il le croit", ExceptionBandes.Confiance("LIKELY"), "insensible à la casse, comme les deux autres");
        }

        private static void Verifier(string id, string brut, string rendu)
        {
            Assert.IsFalse(string.IsNullOrWhiteSpace(rendu), $"{id} : vide");
            Assert.AreNotEqual(ExceptionBandes.Inconnue, rendu, $"{id} : non couvert");
            Assert.IsFalse(string.Equals(brut, rendu, System.StringComparison.OrdinalIgnoreCase), $"{id} : l'enum brut à l'écran");
            Assert.IsTrue(Attendus.TryGetValue(id, out string attendu), $"{id} : valeur de domaine sans mot attendu");
            Assert.AreEqual(attendu, rendu, id);
        }

        [Test]
        public void R14bis_LaCleServieLEmporte_AvecSaMajuscule()
        {
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
            {
                { "exceptions.gravite.severe", "severe" },
                { "exceptions.priorite.watching", "to watch" },
                { "exception_detail.confiance.tentative", "they’re unsure" },
            });
            Assert.AreEqual("Severe", ExceptionBandes.Gravite("SEVERE"), "la clé dérivée de la VALEUR servie");
            Assert.AreEqual("To watch", ExceptionBandes.Priorite("watching"));
            Assert.AreEqual("They’re unsure", ExceptionBandes.Confiance("tentative"));
            Assert.AreEqual("Modérée", ExceptionBandes.Gravite("MODERATE"), "clé absente ⇒ le repli de l'atelier");
            Assert.AreEqual("Severe · To watch", ExceptionBandes.Ligne("SEVERE", "watching"));
        }

        [Test]
        public void R14ter_LeDomaineResteFerme()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "exceptions.gravite.high", "haute" }, { "exception_detail.confiance.sure", "certain" },
            });
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Gravite("HIGH"), "l'ancien domaine ne revient pas par une clé");
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Confiance("sure"));
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Confiance(null));
        }
    }
}
