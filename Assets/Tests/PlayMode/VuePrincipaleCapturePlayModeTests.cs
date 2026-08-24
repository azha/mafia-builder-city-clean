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

        // ── Capture de la CARTE DE VILLE (l'écran des 18 districts) ───────────────────────────────
        // L'user parle de « l'interface avec la ville », et la carte en fait partie autant que
        // l'intérieur d'un district. La seule capture que le dépôt en portait datait de « JOUR 4 » —
        // une mesure DATÉE, sur laquelle je refuse de conclure. Celle-ci est prise sur le chemin de
        // production, au même compte frais, et s'arrête AVANT d'entrer dans un district.
        // Mêmes gardes anti-mensonge que la capture précédente : sans elles, un écran vide passerait
        // pour une réussite.
        [UnityTest]
        public IEnumerator Capture_CarteDeVille_SousChromeV31()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("carte", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "carte-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-carte", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir");

            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("CarteDeVilleShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, "carte-capture-pw");
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");

            shell.ActivateTab(AppShell.Tab.City);
            var carte = Object.FindFirstObjectByType<CityMapController>();
            t0 = Time.realtimeSinceStartup;
            while (carte == null && Time.realtimeSinceStartup - t0 < 20f)
            {
                yield return null;
                carte = Object.FindFirstObjectByType<CityMapController>();
            }
            Assert.IsNotNull(carte, "l'écran carte doit être monté");

            // MESURÉ (ma première version l'ignorait et la garde anti-mensonge l'a attrapée : « 1
            // noeud ») : monter le contrôleur ne charge RIEN. La carte expose `IsLoaded` et se
            // remplit par sa propre requête — on attend donc l'ÉTAT, jamais un nombre de frames.
            float tAttente = Time.realtimeSinceStartup;
            while (!carte.IsLoaded && Time.realtimeSinceStartup - tAttente < 30f) yield return null;
            Assert.IsTrue(carte.IsLoaded,
                "la carte doit avoir chargé ses districts — sans ça la capture montre un écran vide");
            for (int i = 0; i < 30; i++) yield return null;

            // Anti-mensonge : la carte ne vaut que si elle a VRAIMENT reçu ses districts.
            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister sur la capture");

            // ⚠️ MA SONDE ÉTAIT FAUSSE et elle a rendu « 1 noeud » deux fois : la carte ne construit
            // PAS sous son propre transform, elle monte un `CityMapRoot` dans le slot de contenu du
            // shell (`CityMapController.cs:232,251`) — exactement comme l'écran district. Compter
            // les enfants du contrôleur, c'était compter le contrôleur.
            // ★ La garde a quand même fait son travail : elle a refusé de produire une image tant que
            // je ne savais pas ce que je mesurais. Une sonde fausse qui aurait rendu « beaucoup »
            // m'aurait laissé publier une capture sans savoir ce qu'elle montre.
            Transform racineCarte = shell.ContentSlot.Find("CityMapRoot");
            Assert.IsNotNull(racineCarte,
                "la carte monte son `CityMapRoot` dans le slot de contenu du shell");
            int noeuds = racineCarte.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 20,
                $"la carte doit avoir construit son contenu (mesuré {noeuds} noeuds) — une carte vide " +
                "produirait une image qui ment sur l'état de l'écran");

            ScreenCapture.CaptureScreenshot("Assets/Screenshots/carte_de_ville_hud.png");
            for (int i = 0; i < 12; i++) yield return null;
            Debug.Log($"[CAPTURE] carte de ville — noeuds={noeuds} ecran={Screen.width}x{Screen.height}");
        }

        // ── Capture de NUIT ───────────────────────────────────────────────────────────────────────
        // Le quart du jour d'un fetch RÉEL dépend de `city_sim_clock.game_minute`, seedé au signup
        // depuis `city_epoch` : il n'est PAS déterministe d'une exécution à l'autre. Forcer NIGHT
        // après le fetch est le MÊME geste que font déjà C8F5 et C10F1 pour la même raison — isoler
        // la propriété qu'on regarde. Ici on ne teste rien : on veut simplement pouvoir REGARDER
        // l'écran dans son éclairage de nuit, que personne n'avait encore vu en jeu.
        [UnityTest]
        public IEnumerator Capture_VuePrincipale_Nuit()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("nuit", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "nuit-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-nuit", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir — il octroie le kit de départ");

            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("VueNuitShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, "nuit-capture-pw");
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

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
            Assert.IsNotNull(district.LastFetch, "le payload district doit être arrivé");

            district.LastFetch.day_phase = "NIGHT";
            district.Render(district.LastFetch);
            for (int i = 0; i < 20; i++) yield return null;

            // Anti-mensonge : sans ces deux faits, l'image ne montrerait pas ce qu'elle prétend.
            int batiments = district.LastFetch.buildings == null ? 0 : district.LastFetch.buildings.Length;
            Assert.Greater(batiments, 0, "le kit de départ doit porter des bâtiments");
            Transform fondT = district.ScreenRoot.Find("DistrictScene/DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "un fond de NUIT doit être monté — sinon la capture n'est pas de nuit");

            ScreenCapture.CaptureScreenshot("Assets/Screenshots/vue_principale_nuit.png");
            for (int i = 0; i < 12; i++) yield return null;
            Debug.Log($"[CAPTURE] vue de nuit — batiments={batiments} ecran={Screen.width}x{Screen.height}");
        }
    }
}
