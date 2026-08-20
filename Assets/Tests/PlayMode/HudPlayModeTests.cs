using System.Collections;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup -> Bearer) + WalletEnvelope + HeatEnvelope/DistrictHeatDto
using MafiaCleanCity.Operational; // DashboardController — reflection target of hud-F6
using MafiaCleanCity.Tests; // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // nav-hud-design-v1.md, chunk 5 (§6 : HUD v3.1) — hud-F1..F6 (§6.5, mondes dégénérés §8).
    // hud-F4 est un REUSE explicite du design — voir `SessionClientPlayModeTests.C3F3_...` (`:243`) :
    // elle compare DÉJÀ le compte de clés du CORPS BRUT au compte de champs du DTO client, donc elle
    // rougit d'elle-même le jour où le back ajoute `day_phase` comme 13e clé — aucun nouveau test
    // n'est écrit ici pour hud-F4 (le dupliquer serait le "trou masqué" que le socle interdit dans
    // l'autre sens : un SECOND test qui prétendrait couvrir la même propriété sans rien prouver de
    // plus).
    [Category("W3U2")]
    public class HudPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;

        private GameObject shellGo;
        private AppShell shell;

        [OneTimeSetUp]
        public void SeedCityMapDemo()
        {
            // Nécessaire SEULEMENT à hud-F5 (doit ENTRER un vrai district) — payé une fois pour toute
            // la fixture, REUSE exact de NavigationPlayModeTests.cs (même précédent, même seeder).
            SeederSupport.RunSeeder(SeederSupport.CityMapSeeder, SeederSupport.CityMapMarker);
        }

        [TearDown]
        public void TearDown()
        {
            // Mirrors AppShellPlayModeTests/NavigationPlayModeTests : AppShell découvre/crée SON
            // PROPRE Canvas (jamais parenté sous shellGo) — le détruire seul le ferait fuiter dans le
            // test SUIVANT de la même session PlayMode.
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false; // ne jamais fuiter dans un test LATER, sans rapport
        }

        private static IEnumerator SignUp(System.Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("hud", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-hud-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            Assert.IsFalse(string.IsNullOrEmpty(token), "signup returned a token");
            onToken(token);
        }

        // Mounting Home (DashboardController) triggers ITS OWN demo-account sign-in
        // (operational_demo@example.test) — sur une stack SANS ce seeder (aucun test de ce fichier
        // ne le lance), ce sign-in échoue proprement et loggue une Error — MESURÉ précédent EXACT
        // (`AppShellPlayModeTests.cs` : "[Lieutenant] auth failed … 401"). §6.1 place l'appel à
        // `AdoptToken` APRÈS le guard `if (!IsAuthenticated) yield break;` — Dashboard n'appelle donc
        // JAMAIS `AdoptToken` ici, zéro contamination du jeton que CE test adopte lui-même.
        private static void ExpectHomeOwnDemoAuthNoise() => LogAssert.ignoreFailingMessages = true;

        // ── hud-F1 — le maillon existe ──────────────────────────────────────────────────────

        // Après `AdoptToken(jeton réel)`, TopBar.Loaded + cash != "—" ; wallet.cash_cents vérifié
        // D'ABORD par une requête INDÉPENDANTE (patron TopBarControllerPlayModeTests.cs:124-134).
        [UnityTest]
        public IEnumerator HudF1_AfterAdoptTokenRealToken_TopBarLoaded_CashPopulated_VerifiedIndependently()
        {
            shellGo = new GameObject("HudF1Shell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null; // Start()/BuildLayout + Home activation (DashboardController MOUNTED,
                                // its OWN Start()/Boot() still one frame away — see below)

            // MESURÉ (pas supposé) : sur CETTE stack, le compte démo de Dashboard
            // (operational_demo@example.test) est DÉJÀ authentifiable — contrairement au précédent
            // d'AppShellPlayModeTests (401 mesuré là-bas). Laissé courir, Boot() publierait SON
            // PROPRE jeton via AdoptToken — un jeton DIFFÉRENT du mien, donc PAS bloqué par
            // l'idempotence (§6.1 : idempotent sur le MÊME jeton seulement) — et une course sur
            // LEQUEL des deux TopBar.Load gagne rendrait ce test spécifique (sensible au CASH EXACT)
            // non déterministe. Fermé en basculant vers `More` (ne monte rien) AVANT que
            // DashboardController.Start() n'ait la moindre chance de tourner (différé d'une frame,
            // comme pour Home lui-même) — ceci DÉTRUIT l'instance avant tout Boot()/SignIn().
            // hud-F5 (plus bas) laisse volontiers Dashboard courir — SES assertions ne portent pas
            // sur une valeur sensible à CETTE course.
            shell.ActivateTab(AppShell.Tab.More);

            string token = null;
            yield return SignUp(t => token = t);

            // Ground truth AVANT AdoptToken — une lecture RAW indépendante, comparée au DTO que le
            // TopBar produira lui-même (jamais l'un contre lui-même).
            WalletDto liveWallet = null;
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/economy/wallet"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"live wallet GET failed: {req.error}");
                liveWallet = JsonUtility.FromJson<WalletEnvelope>(req.downloadHandler.text)?.payload?.data;
            }
            Assert.IsNotNull(liveWallet, "ground-truth wallet parsed");
            Assert.IsFalse(string.IsNullOrEmpty(liveWallet.cash_cents), "ground-truth cash_cents present");

            shell.AdoptToken(token);

            float elapsed = 0f;
            while (!shell.TopBar.Loaded && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.IsTrue(shell.TopBar.Loaded, $"le maillon doit charger le TopBar (meErr={shell.TopBar.MeError} walletErr={shell.TopBar.WalletError})");

            Assert.AreNotEqual("—", shell.TopBar.RenderedCashText, "le maillon existe : le cash n'est plus le placeholder à vide");
            Assert.AreEqual(liveWallet.cash_cents, shell.TopBar.CurrentWallet.cash_cents,
                "le TopBar (via AdoptToken -> session/open -> Load) porte le MÊME cash que la lecture indépendante");
        }

        // ── hud-F2 — l'aiguille discrimine (fonction PURE, hors réseau) ────────────────────

        [Test]
        public void HudF2_NeedleAngleResolver_FourDistinctAngles_PureFunction_NoNetwork()
        {
            float[] angles =
            {
                HeatBucketResolver.NeedleAngleDegrees("COLD"),
                HeatBucketResolver.NeedleAngleDegrees("WARM"),
                HeatBucketResolver.NeedleAngleDegrees("HOT"),
                HeatBucketResolver.NeedleAngleDegrees("BURNING"),
            };
            Assert.AreEqual(4, angles.Distinct().Count(),
                $"les 4 arrêts d'aiguille doivent être DISTINCTS — obtenu : [{string.Join(", ", angles)}]");
        }

        // ── hud-F3 — vraie réponse (corps de succès EXIGÉ, jamais une enveloppe d'erreur) ──

        [UnityTest]
        public IEnumerator HudF3_HeatRoute_RealSuccessBody_CitywideBucketIsOneOfFour()
        {
            string token = null;
            yield return SignUp(t => token = t);

            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/city/district/16/heat"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"heat GET failed: {req.error}");
                Assert.AreEqual(200, req.responseCode,
                    "corps de succès EXIGÉ — une enveloppe d'erreur (ex. RESOURCE_NOT_FOUND) satisferait " +
                    "trivialement toute assertion d'ABSENCE (CLAUDE.md — piège mesuré 2026-08-15)");

                DistrictHeatDto heat = JsonUtility.FromJson<HeatEnvelope>(req.downloadHandler.text)?.payload?.data;
                Assert.IsNotNull(heat, "payload.data doit être parsé — pas seulement un 200 nu");
                Assert.Contains(heat.citywide_bucket, new[] { "COLD", "WARM", "HOT", "BURNING" },
                    $"citywide_bucket doit être L'UN des 4 membres du domaine fermé, obtenu '{heat.citywide_bucket}'");
            }
        }

        // ── hud-F5 — état nommé hors district ET CityTabDistrictId == -1, MÊME assertion ──

        [UnityTest]
        public IEnumerator HudF5_OutsideDistrict_NamedStateAndDistrictIdMinusOne_SameAssertion()
        {
            ExpectHomeOwnDemoAuthNoise();
            shellGo = new GameObject("HudF5Shell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null; // Start()/BuildLayout + Home activation

            shell.ActivateTab(AppShell.Tab.City);
            yield return null;
            yield return null;
            var cityMap = shell.MountedTenantGameObject.GetComponent<CityMapController>();
            Assert.IsNotNull(cityMap, "City tab mounted a CityMapController");

            float elapsed = 0f;
            while (!cityMap.IsAuthenticated && cityMap.AuthError == null && elapsed < 25f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(cityMap.IsAuthenticated, $"CityMap demo signed in (authErr={cityMap.AuthError})");

            // EnterDistrict est la MÊME méthode de production que le bouton « Entrer » appelle
            // (via l'event CityMapController.OnEnterDistrict, §3.3) — l'appeler directement n'est
            // PAS un raccourci `_test` (aucune route de contournement serveur), juste l'appel direct
            // de la méthode publique de production, sans passer par le clic — nav-F1..F5 (chunk 2)
            // couvrent déjà le clic lui-même ; hud-F5 n'a besoin que d'un VRAI état "en district".
            shell.EnterDistrict(16); // verge-a — précédent maison doublement attesté (§6.2)

            elapsed = 0f;
            DistrictInteriorScreenController screen = null;
            while (elapsed < 20f)
            {
                if (shell.MountedTenantType == typeof(DistrictInteriorScreenController))
                {
                    screen = shell.MountedTenantGameObject.GetComponent<DistrictInteriorScreenController>();
                    if (screen != null && screen.LastFetchSucceeded) break;
                }
                elapsed += Time.deltaTime;
                yield return null;
            }
            Assert.IsNotNull(screen, "EnterDistrict a monté un DistrictInteriorScreenController");
            Assert.IsTrue(screen.LastFetchSucceeded, "la récupération du district a réussi");

            // Prémisse (CLAUDE.md — « vérifier la prémisse de l'épingle ») : EN district, day_phase
            // porte une VRAIE valeur AVANT qu'on sorte — sinon "—" hors district serait vrai pour la
            // MAUVAISE raison (un mécanisme qui n'aurait jamais rien poussé du tout).
            Assert.Contains(shell.TopBar.DayPhaseText, new[] { "DAWN", "DAY", "DUSK", "NIGHT" },
                $"prémisse : EN district, day_phase doit porter une vraie valeur — obtenu '{shell.TopBar.DayPhaseText}'");
            Assert.AreNotEqual(-1, shell.CityTabDistrictId, "prémisse : EN district, CityTabDistrictId != -1");

            shell.ExitToCityMap();
            yield return null;

            Assert.AreEqual("—", shell.TopBar.DayPhaseText, "hors district : état NOMMÉ, jamais la dernière valeur d'un district quitté");
            Assert.AreEqual(-1, shell.CityTabDistrictId, "hors district : CityTabDistrictId == -1 — MÊME assertion que day_phase ci-dessus");
        }

        // ── hud-F6 — pas de dérive entre les 2 surfaces (angle HUD vs glyphe Dashboard) ────

        // Invoque le VRAI `DashboardController.HeatGlyph` (private static — réflexion, PAS un appel
        // au résolveur partagé en double : on vérifie que les DEUX SURFACES DE SORTIE (l'angle du
        // HUD, le glyphe de Dashboard) désignent le MÊME rang, chacune dérivée INDÉPENDAMMENT de sa
        // propre représentation — un détecteur de dérive réel, pas un test tautologique qui
        // appellerait deux fois la même fonction).
        [Test]
        public void HudF6_NoDrift_HudAngleRankMatchesDashboardGlyphRank_AllFourBuckets()
        {
            MethodInfo heatGlyphMethod = typeof(DashboardController).GetMethod("HeatGlyph",
                BindingFlags.NonPublic | BindingFlags.Static);
            Assert.IsNotNull(heatGlyphMethod, "DashboardController.HeatGlyph (private static) doit exister");

            string[] buckets = { "COLD", "WARM", "HOT", "BURNING" };
            foreach (string bucket in buckets)
            {
                int hudRank = (int)HeatBucketResolver.ResolveRank(bucket);

                string glyph = (string)heatGlyphMethod.Invoke(null, new object[] { bucket });
                Assert.IsFalse(string.IsNullOrEmpty(glyph), $"HeatGlyph({bucket}) ne doit pas être vide");
                int glyphRank = glyph.Count(c => c == '#') - 1; // [#...]=1 rempli->rang0 … [####]=4->rang3

                Assert.AreEqual(hudRank, glyphRank,
                    $"{bucket} : rang du HUD ({hudRank}) != rang du glyphe Dashboard ({glyphRank}, glyphe='{glyph}') — " +
                    "les deux surfaces ont dérivé l'une de l'autre");
            }
        }
    }
}
