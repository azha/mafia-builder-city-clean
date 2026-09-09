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
    /// <summary>Preuve sans mock du geste BLANCHIR porté par la fiche canonique du district.</summary>
    [Category("FicheBlanchiment")]
    public class FicheBlanchimentPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int DistrictId = 16;
        private static string email, password, dealerId, frontShopId, safehouseId;
        private GameObject host;

        [OneTimeSetUp]
        public void SemerLaFiliere()
        {
            string json = SeederSupport.RunSeeder(
                SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            email = SeederSupport.ExtractString(json, "email");
            password = SeederSupport.ExtractString(json, "password");
            dealerId = SeederSupport.ExtractString(json, "dealer_id");
            frontShopId = SeederSupport.ExtractString(json, "front_shop");
            safehouseId = SeederSupport.ExtractString(json, "safehouse_id");
            Assert.IsTrue(SeederSupport.IsUuid(dealerId), "le seeder rend le dealer");
            Assert.IsTrue(SeederSupport.IsUuid(frontShopId), "le seeder rend le commerce de façade");
            Assert.IsTrue(SeederSupport.IsUuid(safehouseId), "le seeder rend la planque");
        }

        [TearDown]
        public void Nettoyer()
        {
            if (host != null) Object.Destroy(host);
        }

        [UnityTest]
        public IEnumerator Blanchir_DepuisLaFicheCanonique_DecouvreLaPlanque_EtPosteLeLot()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null;
            string authError = null;
            yield return auth.SignIn(email, password, t => token = t, e => authError = e);
            Assert.IsNull(authError, $"connexion du joueur seedé : {authError}");
            Assert.IsNotEmpty(token, "la connexion rend un bearer");

            // Le seeder laisse la planque vide mais une caisse dealer fraîche : le vrai geste
            // RAMASSER alimente d'abord la même planque que la fiche doit ensuite découvrir.
            var selling = new SellingClient { BaseUrl = BaseUrl };
            CollectData collected = null;
            string collectError = null;
            yield return selling.Collect(dealerId, safehouseId, token,
                c => collected = c, (_, message) => collectError = message);
            Assert.IsNull(collectError, $"précondition de collecte : {collectError}");
            Assert.IsNotNull(collected, "la planque contient le produit réel de la collecte");

            host = new GameObject("FicheBlanchimentHost", typeof(RectTransform));
            var screen = host.AddComponent<DistrictInteriorScreenController>();
            yield return screen.SetSession(token, DistrictId);
            Assert.IsTrue(screen.LastFetchSucceeded, $"projection district (HTTP {screen.LastErrorCode})");
            DistrictInteriorBuildingDto commerce = screen.LastFetch.buildings
                .FirstOrDefault(b => b != null && b.building == frontShopId && b.operational_type == "front_shop");
            Assert.IsNotNull(commerce, "le commerce seedé est servi par la projection du district");

            screen.Render(screen.LastFetch);
            screen.OuvrirFiche(commerce);
            Button blanchir = screen.ScreenRoot.GetComponentsInChildren<Button>(true)
                .FirstOrDefault(b => b.gameObject.name == "Btn_BLANCHIR");
            Assert.IsNotNull(blanchir, "la fiche canonique porte un vrai Button BLANCHIR");
            RectTransform rt = (RectTransform)blanchir.transform;
            Vector2 positionAvant = rt.anchoredPosition;
            Vector2 tailleAvant = rt.sizeDelta;

            blanchir.onClick.Invoke();
            float deadline = Time.realtimeSinceStartup + 30f;
            while (screen.FicheBlanchimentTentatives == 0 && Time.realtimeSinceStartup < deadline)
                yield return null;
            while (screen.DernierBlanchiment == null && Time.realtimeSinceStartup < deadline)
                yield return null;

            Assert.AreEqual(1, screen.FicheBlanchimentTentatives, "un clic produit une tentative");
            Assert.AreEqual(safehouseId, screen.FicheSafehouseId,
                "la fiche découvre la planque par les projections, sans id codé en dur");
            Assert.IsNotNull(screen.DernierBlanchiment, "l'endpoint a répondu");
            Assert.IsTrue(screen.DernierBlanchiment.Ok,
                $"l'injection réelle réussit (HTTP {screen.DernierBlanchiment.HttpStatus}: {screen.DernierBlanchiment.Message})");
            Assert.IsTrue(SeederSupport.IsUuid(screen.DernierBlanchiment.NodeId),
                "le serveur rend le nœud de blanchiment réellement alimenté");
            Assert.AreEqual(1, screen.FicheBlanchimentReussites, "le succès est observé par la fiche");

            // Le listener ne doit jamais modifier la maquette : position et taille restent identiques.
            Assert.AreEqual(positionAvant, rt.anchoredPosition, "BLANCHIR ne déplace pas le CTA");
            Assert.AreEqual(tailleAvant, rt.sizeDelta, "BLANCHIR ne redimensionne pas le CTA");
        }
    }
}
