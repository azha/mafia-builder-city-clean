using NUnit.Framework;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.CityMap.Tests
{
    // C8 (passe UX 2026-09-24) — ㉞ « Ce qui arrive » : le calendrier politique SERVI, mesuré 200 (corps/079), là où l'écran disait
    // « personne ne vous le rapporte ». Hors réseau, sur le corps mesuré.
    //   Q1  en cours d'abord, puis annoncé ; noms servis et ids gardés (clé de `ParValeur`)
    //   Q2  rien servi (null) ou listes vides : aucune ligne
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
    }
}
