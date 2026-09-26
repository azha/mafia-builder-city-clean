using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.CityMap.Tests
{
    // C8 (passe UX 2026-09-24) — ㉞ « Ce qui arrive » : le calendrier politique SERVI, mesuré 200 (corps/079), là où l'écran disait
    // « personne ne vous le rapporte ». Hors réseau, sur le corps mesuré.
    //   Q1  en cours d'abord, puis annoncé ; noms servis et ids gardés (clé de `ParValeur`)
    //   Q2  rien servi (null) ou listes vides : aucune ligne
    //   Q3  un eventId SERVI trouve SA clé servie `political.event.<id>` — casse et tiret gardés (table 65 ; `ParValeur` la manquait)
    [Category("CeQuiArrive")]
    public class CeQuiArrivePlayModeTests
    {
        [Test]
        public void Q1_EnCoursPuisAnnonce_LeCorpsMesure()
        {
            var c = new CalendrierPolitiqueDto
            {
                politicalClimate = "silent",
                active = new[] { new EvenementPolitiqueDto { eventId = "E-POL-07", name = "Harbor crackdown" } },
                upcoming = new[]
                {
                    new EvenementPolitiqueDto { eventId = "E-POL-01", name = "Electoral campaign season", scheduledGameDay = 180 },
                    new EvenementPolitiqueDto { eventId = "E-POL-03", name = "Budget cycle: enforcement cut", scheduledGameDay = 90 },
                },
            };
            var l = CarnetScreenController.LignesCeQuiArrive(c);
            Assert.AreEqual(3, l.Count);
            Assert.AreEqual(("E-POL-07", "Harbor crackdown", true), l[0], "en cours d'abord");
            Assert.AreEqual(("E-POL-01", "Electoral campaign season", false), l[1]);
            Assert.AreEqual(("E-POL-03", "Budget cycle: enforcement cut", false), l[2]);
        }

        [Test]
        public void Q2_RienServi_AucuneLigne()
        {
            Assert.IsEmpty(CarnetScreenController.LignesCeQuiArrive(null));
            Assert.IsEmpty(CarnetScreenController.LignesCeQuiArrive(new CalendrierPolitiqueDto()));
        }
    
        [TearDown] public void Oublier() => I18nCatalog.Oublier();

        [Test]
        public void Q3_UnEventIdServi_TrouveSaCleServie()
        {
            Assert.AreEqual("political.event.E-POL-01", CarnetScreenController.CleDEvenement("E-POL-01"), "l'id TEL QU'IL EST SERVI");
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "political.event.E-POL-01", "la campagne électorale" } });
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("la campagne électorale", Libelle.Gabarit(CarnetScreenController.CleDEvenement("E-POL-01"), "Electoral campaign season"));
            Assert.AreEqual(0, Libelle.NbReplis, "la clé servie est trouvée : aucun repli");
            Assert.AreNotEqual("political.event.E-POL-01", Libelle.CleDe("political", "event", "E-POL-01"),
                "contrôle : la forme abaissée (slug) n'est PAS la clé servie — d'où la composition explicite");
        }
}
}
