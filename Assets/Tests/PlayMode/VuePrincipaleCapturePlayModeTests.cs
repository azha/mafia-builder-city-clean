using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Capture.Tests
{
    // Capture de LIVRAISON, demandée par l'user : la vue principale telle qu'il la verra —
    // le district avec SES bâtiments (compte frais ⇒ kit de départ J0) SOUS le chrome v3.1
    // (barre haute laiton + manomètre centré, barre d'onglets en verre).
    // ⚠️ Ce n'est PAS une falsifiable : elle n'asserte que ce qui rendrait la capture MENSONGÈRE
    // (shell monté, district entré, bâtiments réellement rendus). Le pilotage manuel de l'éditeur
    // s'étant révélé peu fiable (une commande sur deux sans réponse), tout est scripté ici.
    [Category("Capture")]
    public class VuePrincipaleCapturePlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int seq;
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            LogAssert.ignoreFailingMessages = false;
        }

        [UnityTest]
        public IEnumerator Capture_VuePrincipale_DistrictAvecBatiments_SousChromeV31()
        {
            // 1. compte FRAIS : session/open octroie le kit de départ (4 bâtiments J0).
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("vue", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "vue-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-vue", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir — c'est lui qui octroie le kit de départ");

            // 2. le shell REEL, avec cette identité (fenêtre synchrone avant Start()).
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("VuePrincipaleShell");
            shell = shellGo.AddComponent<AppShell>();
            // MESURÉ : AuthClient.SignUp n'envoie QUE { callsign, password } — l'identifiant de
            // connexion est donc le PSEUDONYME, jamais un e-mail dérivé (mon premier jet supposait
            // "callsign@example.test" et le shell n'a jamais pu se connecter).
            shell.SetIdentity(callsign, "vue-capture-pw");
            yield return null;

            // 3. attendre que l'acquisition asynchrone du shell soit terminée (sinon son
            //    ActivateTab(Home) tardif écraserait le district — course mesurée au lot HUD).
            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            // 4. entrer dans le district par le vrai chemin.
            shell.EnterDistrict(16);
            var district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            t0 = Time.realtimeSinceStartup;
            while (district == null && Time.realtimeSinceStartup - t0 < 20f)
            {
                yield return null;
                district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            }
            Assert.IsNotNull(district, "l'écran district doit être monté");

            t0 = Time.realtimeSinceStartup;
            while (district.LastFetch == null && district.LastErrorCode == 0
                   && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsNotNull(district.LastFetch,
                $"le payload district doit être arrivé (code d'erreur observé = {district.LastErrorCode})");
            for (int i = 0; i < 20; i++) yield return null;

            // 5. anti-mensonge : la capture ne vaut que si des bâtiments sont VRAIMENT rendus
            //    et si le chrome est là (une capture d'écran vide passerait sinon).
            int batiments = district.LastFetch.buildings == null ? 0 : district.LastFetch.buildings.Length;
            Assert.Greater(batiments, 0, "le kit de départ doit porter des bâtiments — sinon la capture ne montre rien");
            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister sur la capture");
            Assert.AreEqual(16, shell.CityTabDistrictId, "on doit être DANS le district au moment de la capture");

            ScreenCapture.CaptureScreenshot("Assets/Screenshots/vue_principale_batiments_hud.png");
            for (int i = 0; i < 12; i++) yield return null;
            Debug.Log($"[CAPTURE] vue principale — batiments={batiments} district={shell.CityTabDistrictId} " +
                      $"ecran={Screen.width}x{Screen.height}");
        }
    }
}
