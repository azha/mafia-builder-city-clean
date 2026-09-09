using System.Collections;
using System.Linq;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational.Selling;
using MafiaCleanCity.Tests;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    /// <summary>Preuve sans mock du geste COLLECTER porté par la fiche canonique du district.</summary>
    [Category("FicheCollecte")]
    public class FicheCollectePlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int DistrictId = 16;
        private static string email, password, dealerId, dealerSpotId, safehouseId;
        private GameObject host;

        [OneTimeSetUp]
        public void SemerLePointDeVente()
        {
            string json = SeederSupport.RunSeeder(
                SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            email = SeederSupport.ExtractString(json, "email");
            password = SeederSupport.ExtractString(json, "password");
            dealerId = SeederSupport.ExtractString(json, "dealer_id");
            dealerSpotId = SeederSupport.ExtractString(json, "dealer_spot");
            safehouseId = SeederSupport.ExtractString(json, "safehouse_id");
            Assert.IsTrue(SeederSupport.IsUuid(dealerId), "le seeder rend le dealer");
            Assert.IsTrue(SeederSupport.IsUuid(dealerSpotId), "le seeder rend son point de vente");
            Assert.IsTrue(SeederSupport.IsUuid(safehouseId), "le seeder rend la planque");
        }

        [TearDown]
        public void Nettoyer()
        {
            if (host != null) Object.Destroy(host);
        }

        [UnityTest]
        public IEnumerator Collecter_DepuisLaFicheCanonique_JointLeDealer_EtVideSaCaisse()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null;
            string authError = null;
            yield return auth.SignIn(email, password, t => token = t, e => authError = e);
            Assert.IsNull(authError, $"connexion du joueur seedé : {authError}");
            Assert.IsNotEmpty(token, "la connexion rend un bearer");

            var selling = new SellingClient { BaseUrl = BaseUrl };
            DealerDto dealerAvant = null;
            string lectureError = null;
            yield return selling.GetDealer(dealerId, token, d => dealerAvant = d,
                (_, message) => lectureError = message);
            Assert.IsNull(lectureError, $"lecture de la caisse avant collecte : {lectureError}");
            Assert.IsNotNull(dealerAvant, "le dealer seedé est lisible");
            Assert.AreNotEqual("NONE", dealerAvant.cash_band,
                "précondition discriminante : le seeder laisse une caisse à collecter");

            host = new GameObject("FicheCollecteHost", typeof(RectTransform));
            var screen = host.AddComponent<DistrictInteriorScreenController>();
            yield return screen.SetSession(token, DistrictId);
            Assert.IsTrue(screen.LastFetchSucceeded, $"projection district (HTTP {screen.LastErrorCode})");
            DistrictInteriorBuildingDto pointDeVente = screen.LastFetch.buildings
                .FirstOrDefault(b => b != null && b.building == dealerSpotId
                                  && b.operational_type == "dealer_spot_front");
            Assert.IsNotNull(pointDeVente, "le point de vente seedé est servi dans le district");

            screen.Render(screen.LastFetch);
            screen.OuvrirFiche(pointDeVente);
            Button collecter = screen.ScreenRoot.GetComponentsInChildren<Button>(true)
                .FirstOrDefault(b => b.gameObject.name == "Btn_COLLECTER");
            Assert.IsNotNull(collecter, "la fiche canonique porte un vrai Button COLLECTER");
            RectTransform rt = (RectTransform)collecter.transform;
            Vector2 positionAvant = rt.anchoredPosition;
            Vector2 tailleAvant = rt.sizeDelta;

            collecter.onClick.Invoke();
            float deadline = Time.realtimeSinceStartup + 30f;
            while (screen.FicheCollecteTentatives == 0 && Time.realtimeSinceStartup < deadline)
                yield return null;
            while (screen.DerniereCollecte == null && Time.realtimeSinceStartup < deadline)
                yield return null;

            Assert.AreEqual(1, screen.FicheCollecteTentatives, "un clic produit une tentative");
            Assert.AreEqual(dealerId, screen.FicheDealerId,
                "la fiche joint le bâtiment au dealer servi, sans id codé en dur");
            Assert.AreEqual(safehouseId, screen.FicheSafehouseId,
                "la fiche découvre la planque par les projections joueur");
            Assert.IsNotNull(screen.DerniereCollecte, "l'endpoint a répondu");
            Assert.IsTrue(screen.DerniereCollecte.Ok,
                $"la collecte réelle réussit (HTTP {screen.DerniereCollecte.HttpStatus}: {screen.DerniereCollecte.Message})");
            Assert.AreEqual(safehouseId, screen.DerniereCollecte.SafehouseId,
                "la réponse confirme la planque réellement créditée");
            Assert.AreEqual(1, screen.FicheCollecteReussites, "le succès est observé par la fiche");

            DealerDto dealerApres = null;
            lectureError = null;
            yield return selling.GetDealer(dealerId, token, d => dealerApres = d,
                (_, message) => lectureError = message);
            Assert.IsNull(lectureError, $"relecture de la caisse : {lectureError}");
            Assert.IsNotNull(dealerApres, "le dealer existe toujours après collecte");
            Assert.AreEqual("NONE", dealerApres.cash_band,
                "la relecture indépendante prouve que la caisse a été vidée");

            Assert.AreEqual(positionAvant, rt.anchoredPosition, "COLLECTER ne déplace pas le CTA");
            Assert.AreEqual(tailleAvant, rt.sizeDelta, "COLLECTER ne redimensionne pas le CTA");
        }
    }
}
