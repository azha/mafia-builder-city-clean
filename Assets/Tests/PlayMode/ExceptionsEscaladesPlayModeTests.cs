using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-6 — le pied « Escalades archivées » (cadres 14 et 16 ; juge r1 M7). Gardes de SOURCE et de REQUÊTE :
    //   R16     la légende suit le `total` servi : 0 ⇒ « rien à relire », sans compte ; 3 ⇒ « à relire à tête reposée » + « 3 » ;
    //           inconnu ⇒ la légende neutre, sans compte (jamais un zéro supposé)
    //   R16bis  le rechargement de la file recharge le compte (couture : aucune requête)
    //   R16ter  la route émise ; une couture posée = aucune requête, même pour la route d'à côté
    // Rangée sous EcranFile.
    [Category("EcranFile")]
    public class ExceptionsEscaladesPlayModeTests
    {
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (ecran != null && ecran.Decor != null) Object.DestroyImmediate(ecran.Decor.transform.parent.gameObject);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static ExceptionCardDto Carte(string id) => new ExceptionCardDto
        {
            exception_id = id, severity_band = "SEVERE", priority_band = "critical", confidence_band = "likely",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private void NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);   // même frame que AddComponent : `Start` ne lancera pas `Boot` (réseau)
        }

        [Test]
        public void R16_LaLegendeSuitLeTotalServi()
        {
            NouvelEcran();
            Assert.IsNull(ecran.EscaladesTotal, "rien n'est revenu : aucun total supposé");
            Assert.AreEqual("à relire à tête reposée", ecran.LienLegende, "inconnu ⇒ la légende neutre");
            Assert.IsNull(ecran.LienCompte);

            ecran.PoserEscaladesPourTest(0);
            Assert.AreEqual("rien à relire", ecran.LienLegende, "cadre 16");
            Assert.IsNull(ecran.LienCompte, "pas de « 0 » dessiné");

            ecran.PoserEscaladesPourTest(3);
            Assert.AreEqual("à relire à tête reposée", ecran.LienLegende, "cadre 14");
            Assert.AreEqual("3", ecran.LienCompte, "`.n-or`");

            ecran.RendrePourTest(new[] { Carte("a") });
            Assert.AreEqual("3", ecran.LienCompte, "un rendu de la file garde le compte connu");
        }

        [UnityTest]
        public IEnumerator R16bis_LeRechargementDeLaFileRechargeLeCompte()
        {
            NouvelEcran();
            ExceptionsClient client = ecran.ClientPourTest;
            client.SubstitutFilePourTest = () => new[] { Carte("a"), Carte("b") };
            client.SubstitutEscalationsPourTest = () => 2;
            yield return ecran.LoadQueue();
            Assert.AreEqual(2, ecran.Cards.Length);
            Assert.AreEqual(2, ecran.EscaladesTotal);
            Assert.AreEqual("2", ecran.LienCompte);

            client.SubstitutEscalationsPourTest = () => null;   // la route échoue : le dernier compte connu reste
            yield return ecran.LoadQueue();
            Assert.AreEqual(2, ecran.EscaladesTotal);
        }

        [UnityTest]
        public IEnumerator R16ter_LaRouteEtAucuneRequeteSousCouture()
        {
            Assert.AreEqual("http://h/v1/exceptions/escalations?limit=1&offset=0", ExceptionsClient.ConstruireEscalations("http://h/"));

            var client = new ExceptionsClient { BaseUrl = "http://127.0.0.1:9" };   // un port fermé : un envoi réel échouerait en réseau
            client.SubstitutFilePourTest = () => new ExceptionCardDto[0];
            int? ok = null; string err = null;
            yield return client.GetEscalationsTotal("t", n => ok = n, (code, msg) => err = msg);
            Assert.IsNull(ok);
            Assert.AreEqual("escalations : substitué, sans total", err, "la couture de la file suffit à couper le réseau");
        }
    }
}
