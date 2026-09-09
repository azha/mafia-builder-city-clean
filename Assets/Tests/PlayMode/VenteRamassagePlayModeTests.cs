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

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>Parcours réel du seul geste de ㉟ : le seeder laisse un dealer avec une caisse
    /// MODERATE et une planque possédée ; l'écran découvre cette planque sans id injecté, le clic
    /// RAMASSER poste son identifiant, puis la relecture doit montrer la caisse vide.</summary>
    [Category("VenteRamassage")]
    public class VenteRamassagePlayModeTests
    {
        private static string email;
        private static string password;
        private static string dealerId;
        private static string safehouseId;
        private GameObject host;

        [OneTimeSetUp]
        public void SemerPrecondition()
        {
            string json = SeederSupport.RunSeeder(
                SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            email = SeederSupport.ExtractString(json, "email");
            password = SeederSupport.ExtractString(json, "password");
            dealerId = SeederSupport.ExtractString(json, "dealer_id");
            safehouseId = SeederSupport.ExtractString(json, "safehouse_id");

            Assert.IsNotEmpty(email, "le seeder a rendu l'identité du joueur");
            Assert.IsNotEmpty(password, "le seeder a rendu son mot de passe");
            Assert.IsTrue(SeederSupport.IsUuid(dealerId), $"dealer_id attendu, reçu '{dealerId}'");
            Assert.IsTrue(SeederSupport.IsUuid(safehouseId), $"safehouse_id attendu, reçu '{safehouseId}'");
        }

        [TearDown]
        public void Nettoyer()
        {
            if (host != null) Object.Destroy(host);
        }

        [UnityTest]
        public IEnumerator Ramasser_DecouvreLaPlanque_PosteLeBonCorps_EtVideLaCaisse()
        {
            var auth = new AuthClient { BaseUrl = "http://localhost" };
            string token = null;
            string authError = null;
            yield return auth.SignIn(email, password, t => token = t, e => authError = e);
            Assert.IsNull(authError, $"connexion du joueur seedé : {authError}");
            Assert.IsNotEmpty(token, "la connexion a rendu un bearer");

            host = new GameObject("VenteRamassageHost", typeof(RectTransform));
            SellingScreenController screen = host.AddComponent<SellingScreenController>();
            screen.SetBaseUrl("http://localhost");
            screen.SetToken(token);

            float deadline = Time.realtimeSinceStartup + 45f;
            while (screen.RendusEffectues == 0 && Time.realtimeSinceStartup < deadline)
                yield return null;

            Assert.Greater(screen.RendusEffectues, 0, "l'écran n'a pas fini son chargement");
            Assert.IsNull(screen.DerniereErreur, $"chargement de ㉟ : {screen.DerniereErreur}");
            Assert.IsTrue(screen.RecherchePlanqueTerminee, "la découverte de planque a abouti");
            Assert.AreEqual(safehouseId, screen.SafehouseId,
                "l'écran a découvert la planque seedée par les routes joueur, sans id injecté");

            DealerDto dealerAvant = screen.Dealers?.FirstOrDefault(d => d.dealer == dealerId);
            Assert.IsNotNull(dealerAvant, "le dealer seedé figure dans la liste joueur");
            Assert.AreNotEqual("NONE", dealerAvant.cash_band,
                "précondition discriminante : la caisse doit contenir quelque chose avant le clic");

            Button ramasser = screen.GetComponentsInChildren<Button>(true)
                .FirstOrDefault(b => b.gameObject.name == "Ramasser"
                                  && b.GetComponentInParent<RectTransform>() != null
                                  && b.transform.parent != null
                                  && b.transform.parent.name == "Dealer_" + dealerId);
            Assert.IsNotNull(ramasser, "la rangée du dealer porte un vrai Button RAMASSER");
            Assert.IsTrue(ramasser.interactable, "RAMASSER est actif quand caisse + planque existent");

            int rendusAvant = screen.RendusEffectues;
            ramasser.onClick.Invoke();
            while (screen.CollectTentatives == 0 && Time.realtimeSinceStartup < deadline)
                yield return null;
            while (screen.CollectReussites == 0 && screen.DerniereErreur == null
                   && Time.realtimeSinceStartup < deadline)
                yield return null;
            while (screen.RendusEffectues == rendusAvant && Time.realtimeSinceStartup < deadline)
                yield return null;

            Assert.AreEqual(1, screen.CollectTentatives, "un clic produit une seule tentative");
            Assert.AreEqual(1, screen.CollectReussites,
                $"la collecte réelle doit réussir (erreur: {screen.DerniereErreur})");
            Assert.Greater(screen.RendusEffectues, rendusAvant,
                "la mutation réussie relit et redessine les bandes");
            DealerDto dealerApres = screen.Dealers?.FirstOrDefault(d => d.dealer == dealerId);
            Assert.IsNotNull(dealerApres, "le dealer existe toujours après collecte");
            Assert.AreEqual("NONE", dealerApres.cash_band,
                "la réponse relue prouve que la caisse a réellement été vidée");
        }
    }
}
