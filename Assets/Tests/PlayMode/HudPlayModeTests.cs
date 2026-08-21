using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup -> Bearer) + WalletEnvelope + HeatEnvelope/DistrictHeatDto
using MafiaCleanCity.Operational; // DashboardController — reflection target of hud-F6, MeEnvelope/MeDto
using MafiaCleanCity.Tests; // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // nav-hud-design-v1.md §6 (chunk 5, HUD v3.1) + hud-session-arbitrages-design.md (B1/B2, gate ⊥
    // sur 65ecc28) — hud-F1..F7 (mondes dégénérés §8 / arbitrages §1.4, §2.5), M1/M2 (gestes courts
    // §3). hud-F4 reste un REUSE explicite — voir `SessionClientPlayModeTests.C3F3_...` (`:243`) :
    // elle compare DÉJÀ le compte de clés du CORPS BRUT au compte de champs du DTO client, donc elle
    // rougit d'elle-même le jour où le back ajoute `day_phase` comme 13e clé — aucun nouveau test
    // n'est écrit ici pour hud-F4.
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
            // Nécessaire à hud-F5 (doit ENTRER un vrai district) et hud-F7 (2e compte démo) — payé
            // une fois pour toute la fixture, REUSE exact de NavigationPlayModeTests.cs.
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

        private static IEnumerator SignIn(string identifier, string password, System.Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, err = null;
            yield return auth.SignIn(identifier, password, t => token = t, e => err = e);
            Assert.IsNull(err, $"signin indépendant pour {identifier} a échoué : {err}");
            Assert.IsFalse(string.IsNullOrEmpty(token), $"signin pour {identifier} a rendu un jeton vide");
            onToken(token);
        }

        private static IEnumerator ReadWalletIndependently(string token, System.Action<WalletDto> onWallet)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/economy/wallet"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"live wallet GET failed: {req.error}");
                WalletDto wallet = JsonUtility.FromJson<WalletEnvelope>(req.downloadHandler.text)?.payload?.data;
                Assert.IsNotNull(wallet, "ground-truth wallet parsed");
                Assert.IsFalse(string.IsNullOrEmpty(wallet.cash_cents), "ground-truth cash_cents present");
                onWallet(wallet);
            }
        }

        private static IEnumerator ReadCallsignIndependently(string identifier, string password, System.Action<string> onCallsign)
        {
            string token = null;
            yield return SignIn(identifier, password, t => token = t);
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/me"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"GET /v1/me a échoué pour {identifier}: {req.error}");
                MeDto me = JsonUtility.FromJson<MeEnvelope>(req.downloadHandler.text)?.payload?.data;
                Assert.IsNotNull(me, $"/v1/me n'a pas parsé pour {identifier}");
                Assert.IsFalse(string.IsNullOrEmpty(me.handle), $"callsign vide pour {identifier}");
                onCallsign(me.handle);
            }
        }

        // Mounting Home (DashboardController) sans jeton injecté déclenche SON PROPRE signin démo —
        // sur une stack sans le seeder (aucun test de ce fichier ne lance celui de Dashboard), ce
        // signin échouerait proprement et loggerait une Error (précédent AppShellPlayModeTests).
        // Sous B1 (§1.2), le shell signe LUI-MÊME et injecte AVANT le montage : ce garde n'est
        // normalement plus nécessaire (mesuré : operational_demo est authentifiable sur cette stack)
        // — conservé en défense (harmless si inutile) contre une variabilité d'environnement.
        private static void ExpectHomeOwnDemoAuthNoise() => LogAssert.ignoreFailingMessages = true;

        private static void AssertColorApproximatelyEqual(Color a, Color b, string context)
        {
            const float eps = 0.01f;
            Assert.Less(Mathf.Abs(a.r - b.r), eps, $"{context} — R diverge ({a.r:F4} vs {b.r:F4})");
            Assert.Less(Mathf.Abs(a.g - b.g), eps, $"{context} — G diverge ({a.g:F4} vs {b.g:F4})");
            Assert.Less(Mathf.Abs(a.b - b.b), eps, $"{context} — B diverge ({a.b:F4} vs {b.b:F4})");
        }

        private static string ColorKey(Color c) =>
            $"{Mathf.Round(c.r * 1000)}_{Mathf.Round(c.g * 1000)}_{Mathf.Round(c.b * 1000)}";

        // ── hud-F1 — le maillon existe (B1 : le shell signe lui-même) ──────────────────────

        // AMENDÉ (hud-session-arbitrages-design.md §1.3) : « HudPlayModeTests.cs:93 — l'isolation
        // par ActivateTab(More) DEVIENT INUTILE ⇒ à retirer, son commentaire dit qu'elle n'existe
        // que pour cette course » — la course meurt avec `AdoptToken` (§1.2). Identité = un signup
        // FRAIS et jetable (patron déjà établi, TopBarControllerPlayModeTests.cs), posée via
        // `SetIdentity` AVANT `Start()` (même fenêtre synchrone que `SetToken`/`SetMountParent`).
        [UnityTest]
        public IEnumerator HudF1_ShellOwnSessionAcquisition_TopBarLoaded_CashPopulated_VerifiedIndependently_TenantReceivesInjectedToken()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("hudf1", ref callsignSeq);
            const string password = "w3u2-hud-pw";
            string signupToken = null, err = null;
            yield return auth.SignUp(callsign, password, t => signupToken = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            WalletDto liveWallet = null;
            yield return ReadWalletIndependently(signupToken, w => liveWallet = w);

            shellGo = new GameObject("HudF1Shell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, password); // AVANT Start() — Start() n'a pas encore lu ces champs

            float elapsed = 0f;
            while ((shell.TopBar == null || !shell.TopBar.Loaded) && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.IsNotNull(shell.TopBar);
            Assert.IsTrue(shell.TopBar.Loaded,
                $"le shell doit charger son propre TopBar (meErr={shell.TopBar.MeError} walletErr={shell.TopBar.WalletError})");

            Assert.AreNotEqual("—", shell.TopBar.RenderedCashText, "le maillon existe : le cash n'est plus le placeholder à vide");
            Assert.AreEqual(liveWallet.cash_cents, shell.TopBar.CurrentWallet.cash_cents,
                "le TopBar (via le signin propre du shell -> session/open -> Load) porte le MÊME cash que la lecture indépendante");

            // Le locataire monté (Home/DashboardController) a REÇU ce jeton par injection — il n'a
            // pas signé lui-même (repli non emprunté ici, puisque le shell EN avait un).
            var dashboard = shell.MountedTenantGameObject != null
                ? shell.MountedTenantGameObject.GetComponent<DashboardController>() : null;
            Assert.IsNotNull(dashboard, "Home doit monter DashboardController");
            Assert.AreEqual(shell.Token, dashboard.Token,
                "le locataire monté porte EXACTEMENT le jeton du shell — injecté, jamais re-signé");
        }

        // ── hud-F2 — l'aiguille discrimine, STRICTEMENT (M1) ────────────────────────────

        // M1 (hud-session-arbitrages-design.md §3) — l'ancienne version assertait "4 valeurs
        // distinctes", ce qu'une aiguille INVERSÉE (BURNING à gauche, COLD à droite) satisferait
        // tout autant qu'une aiguille correcte. La propriété est l'ORDRE, en prose dans
        // `HeatBucketResolver.cs` : « COLD à gauche, BURNING à droite » — suite STRICTEMENT
        // croissante des 4 valeurs RÉELLES. Monde dégénéré : une suite croissante par PALIERS
        // CONSTANTS satisferait un simple `<=`, d'où le strict (`Assert.Less`).
        [Test]
        public void HudF2_NeedleAngleResolver_StrictlyIncreasing_ColdToBurning_PureFunction_NoNetwork()
        {
            float cold = HeatBucketResolver.NeedleAngleDegrees(HeatBucketResolver.Rank.Cold);
            float warm = HeatBucketResolver.NeedleAngleDegrees(HeatBucketResolver.Rank.Warm);
            float hot = HeatBucketResolver.NeedleAngleDegrees(HeatBucketResolver.Rank.Hot);
            float burning = HeatBucketResolver.NeedleAngleDegrees(HeatBucketResolver.Rank.Burning);

            Assert.Less(cold, warm, $"COLD ({cold}) < WARM ({warm}) — croissance STRICTE, pas seulement distinction");
            Assert.Less(warm, hot, $"WARM ({warm}) < HOT ({hot})");
            Assert.Less(hot, burning, $"HOT ({hot}) < BURNING ({burning})");
        }

        // ── M2 — le détecteur est un TEST, pas le compilateur ───────────────────────────

        // (hud-session-arbitrages-design.md §3) — la « forme exhaustive sans default » n'existe pas
        // pour un `switch` STATEMENT en C# (CS0161 sans default, dans une méthode qui retourne) ; le
        // repli explicite `case Rank.Unknown` + `default: throw` est la forme correcte, et SON
        // détecteur énumère `Enum.GetValues(typeof(Rank))` — tester 4 chaînes écrites à la main
        // laisserait `Unknown` (et tout membre futur) hors champ.
        [Test]
        public void M2_NeedleAngleDegrees_DistinctAngle_ForEveryRankMember_EnumEnumerated()
        {
            var allRanks = (HeatBucketResolver.Rank[])System.Enum.GetValues(typeof(HeatBucketResolver.Rank));
            Assert.GreaterOrEqual(allRanks.Length, 5, "anti-vacuité — au moins les 4 buckets réels + Unknown");

            float[] angles = allRanks.Select(r => HeatBucketResolver.NeedleAngleDegrees(r)).ToArray();
            Assert.AreEqual(allRanks.Length, angles.Distinct().Count(),
                "chaque membre de Rank (Unknown compris) doit avoir un angle DISTINCT — obtenu : " +
                string.Join(", ", allRanks.Select((r, i) => $"{r}={angles[i]}")));
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

            // MESURÉ (course trouvée en lot, invisible seule) : `AcquireSessionThenActivateHome`
            // (signin+session/open+TopBar.Load) tourne en tâche de fond depuis Start() et se
            // termine par SON PROPRE `ActivateTab(Tab.Home)`. Un unique `yield return null;` ne
            // garantit PAS que cette séquence est terminée — sous contention réseau (lot de tests),
            // elle peut encore être en vol quand ce test bascule manuellement vers City puis
            // EnterDistrict ; son `ActivateTab(Home)` tardif ÉCRASE alors tout (CityTabDistrictId
            // remis à -1, le district démonté) — reproduit : rouge en lot, vert seul, exactement la
            // signature d'une course. Fix : attendre `TopBar.Loaded` (même patron que hud-F1/F7) —
            // `ActivateTab(Home)` s'exécute SYNCHRONE juste après, dans la MÊME passe de coroutine,
            // donc le voir vrai garantit que le montage de Home interne au shell est déjà réglé.
            float bootElapsed = 0f;
            while ((shell.TopBar == null || !shell.TopBar.Loaded) && bootElapsed < 15f) { bootElapsed += Time.deltaTime; yield return null; }
            Assert.IsNotNull(shell.TopBar);
            Assert.IsTrue(shell.TopBar.Loaded, "acquisition de session propre du shell terminée avant toute bascule manuelle");

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
            Assert.IsTrue(cityMap.IsAuthenticated, $"CityMap authenticated — injecté par le shell ou signé lui-même (authErr={cityMap.AuthError})");

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

        // ── hud-F6 refondue — 2 surfaces réellement indépendantes + hex canon + monotonie NON stricte ──

        // (hud-session-arbitrages-design.md §2.5) — Surface 1 : `DashboardController.HeatAccent`
        // (private static, réflexion sur la VRAIE méthode de production). Surface 2 : la bande
        // PEINTE du manomètre TopBar (`BuildManometre`, 3 zones Mild/Moderate/Severe dans CET
        // ordre). Les deux DOIVENT être égales entre elles ET aux 3 hex canon EXACTS
        // (`global_conventions_core.md:50-52`), plus la monotonie NON STRICTE
        // Severity(COLD) ≤ WARM ≤ HOT ≤ BURNING (le collapse 4→3 EST canon, §2.1).
        [UnityTest]
        public IEnumerator HudF6_NoDrift_DashboardAccentAndTopBarZoneColor_EqualEachOtherAndCanonHex_NonStrictMonotonicity()
        {
            MethodInfo heatAccentMethod = typeof(DashboardController).GetMethod("HeatAccent",
                BindingFlags.NonPublic | BindingFlags.Static);
            Assert.IsNotNull(heatAccentMethod, "DashboardController.HeatAccent (private static) doit exister");

            var hostGo = new GameObject("HudF6_TopBar");
            hostGo.AddComponent<RectTransform>();
            var topBar = hostGo.AddComponent<TopBarController>(); // Awake() -> EnsureInitialized() synchrone (pas de yield requis)
            Transform zoneRow = topBar.transform.Find("Manometre/ZoneRow");
            Assert.IsNotNull(zoneRow, "ZoneRow doit exister sous Manometre");
            Assert.AreEqual(3, zoneRow.childCount, "3 zones peintes — Mild/Moderate/Severe, exactement (canon §2.1)");
            var zoneColorsBySeverity = new Color[3];
            for (int i = 0; i < 3; i++)
            {
                Image img = zoneRow.GetChild(i).GetComponent<Image>();
                Assert.IsNotNull(img, $"Zone[{i}] doit porter une Image");
                zoneColorsBySeverity[i] = img.color;
            }

            // Les 3 hex canon EXACTS (global_conventions_core.md:50-52).
            var canonBySeverity = new[]
            {
                new Color(0.263f, 0.878f, 0.753f), // Mild    #43e0c0
                new Color(1f, 0.62f, 0.239f),      // Moderate #ff9e3d
                new Color(1f, 0.353f, 0.302f),     // Severe   #ff5a4d
            };

            string[] buckets = { "COLD", "WARM", "HOT", "BURNING" };
            var distinctColors = new HashSet<string>();
            HeatBucketResolver.Severity? prevSeverity = null;
            foreach (string bucket in buckets)
            {
                HeatBucketResolver.Severity severity = HeatBucketResolver.SeverityFor(bucket);
                var dashboardColor = (Color)heatAccentMethod.Invoke(null, new object[] { bucket });
                Color topBarColor = zoneColorsBySeverity[(int)severity];
                Color canonColor = canonBySeverity[(int)severity];

                AssertColorApproximatelyEqual(dashboardColor, topBarColor, $"{bucket} — Dashboard vs TopBar");
                AssertColorApproximatelyEqual(dashboardColor, canonColor, $"{bucket} — Dashboard vs hex canon");
                AssertColorApproximatelyEqual(topBarColor, canonColor, $"{bucket} — TopBar vs hex canon");

                distinctColors.Add(ColorKey(dashboardColor));

                if (prevSeverity.HasValue)
                {
                    Assert.LessOrEqual((int)prevSeverity.Value, (int)severity,
                        $"monotonie NON stricte violée à {bucket} : {prevSeverity} -> {severity}");
                }
                prevSeverity = severity;
            }

            // Monde dégénéré (§2.5) : les 4 buckets rendraient la même couleur ⇒ monotonie non stricte
            // trivialement vraie — tué en exigeant EXACTEMENT 3 couleurs distinctes ET
            // Severity(BURNING) > Severity(COLD) en STRICT.
            Assert.AreEqual(3, distinctColors.Count,
                "exactement 3 couleurs distinctes doivent apparaître (le collapse 4→3 est canon, PAS 4→1)");
            Assert.Greater((int)HeatBucketResolver.SeverityFor("BURNING"), (int)HeatBucketResolver.SeverityFor("COLD"),
                "BURNING doit être STRICTEMENT plus sévère que COLD (sinon la monotonie non stricte serait vide de sens)");

            Object.Destroy(hostGo);
            yield break;
        }

        // ── hud-F7 (NEUVE, B1) — même joueur à travers N alternances ────────────────────

        // (hud-session-arbitrages-design.md §1.4) — N'asserte PAS sur le cash seul (deux comptes
        // peuvent avoir le même solde, aveugle à la course) : asserte sur le CALLSIGN, unique par
        // compte (SIGNUP_CALLSIGN_TAKEN côté back). (1)+(2) garde de dimensionnement — lue AVANT
        // toute alternance. (3) 3 alternances Home<->City avec quiescence. (4) à CHAQUE palier :
        // Loaded + cash != "—" + callsign == 1er palier. (5) cash comparé au wallet indépendant
        // POUR ce callsign.
        [UnityTest]
        public IEnumerator HudF7_SameCallsign_AcrossThreeHomeCityAlternations_NeverTheOtherDemoAccount()
        {
            string operationalCallsign = null, citymapCallsign = null;
            yield return ReadCallsignIndependently("operational_demo@example.test", "operational-demo-pw", c => operationalCallsign = c);
            yield return ReadCallsignIndependently("citymap_demo@example.test", "citymap-demo-pw", c => citymapCallsign = c);
            Assert.AreNotEqual(operationalCallsign, citymapCallsign,
                "garde de dimensionnement (lue AVANT toute alternance) : les 2 comptes démo doivent " +
                "avoir des callsigns DIFFÉRENTS, sinon le monde ne peut pas discriminer la course qu'il " +
                "est censé détecter");

            ExpectHomeOwnDemoAuthNoise();
            shellGo = new GameObject("HudF7Shell");
            shell = shellGo.AddComponent<AppShell>();
            // Identité par défaut d'AppShell = operational_demo (aucun SetIdentity ici).

            string firstCallsign = null;
            var alternation = new[]
            {
                AppShell.Tab.Home, AppShell.Tab.City, AppShell.Tab.Home,
                AppShell.Tab.City, AppShell.Tab.Home, AppShell.Tab.City,
            };
            for (int i = 0; i < alternation.Length; i++)
            {
                if (i == 0)
                {
                    // Premier palier — laisse le flux réel (Start() -> acquisition -> ActivateTab(Home)) tourner.
                    float elapsed = 0f;
                    while ((shell.TopBar == null || !shell.TopBar.Loaded) && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
                }
                else
                {
                    shell.ActivateTab(alternation[i]);
                    yield return null;
                    yield return null;
                    yield return null; // quiescence — laisse le (dé)montage du locataire se stabiliser
                }

                Assert.IsTrue(shell.TopBar.Loaded, $"palier {i} ({alternation[i]}) : TopBar.Loaded");
                Assert.AreNotEqual("—", shell.TopBar.RenderedCashText, $"palier {i} : cash != placeholder à vide");
                Assert.IsNotNull(shell.TopBar.CurrentMe, $"palier {i} : CurrentMe doit être parsé");

                if (i == 0) firstCallsign = shell.TopBar.CurrentMe.handle;
                Assert.AreEqual(firstCallsign, shell.TopBar.CurrentMe.handle,
                    $"palier {i} : le callsign doit rester CELUI DU PREMIER palier — un callsign " +
                    "différent prouverait qu'un AUTRE compte a pris la main (la course que B1 ferme)");
            }

            Assert.AreEqual(operationalCallsign, firstCallsign,
                "l'identité PAR DÉFAUT du shell (Home, operational_demo) doit être celle observée au 1er palier");

            string finalToken = null;
            yield return SignIn("operational_demo@example.test", "operational-demo-pw", t => finalToken = t);
            WalletDto liveWallet = null;
            yield return ReadWalletIndependently(finalToken, w => liveWallet = w);
            Assert.AreEqual(liveWallet.cash_cents, shell.TopBar.CurrentWallet.cash_cents,
                "le cash du TopBar (dernier palier) == le wallet lu indépendamment POUR ce callsign-là");
        }

        // ── F2 (IMPORTANT) — aucune correspondance bucket→apparence hors du résolveur ──────

        // (hud-session-arbitrages-design.md §3, F2) — REUSE du patron
        // `ChromeTabAccentAllowlistPlayModeTests` (égalité d'ENSEMBLES contre une allowlist MESURÉE,
        // jamais un `contains`). Le motif porte sur l'ACCÈS aux 3 tokens de sévérité — leur usage
        // LÉGITIME hors heat (bandes wallet, etc.) reste sur l'allowlist ; la régression que CE
        // chunk fermait (TopBarController.cs accédait ces tokens DIRECTEMENT pour peindre le
        // manomètre) se voit à SA DISPARITION de l'ensemble — vérifiée explicitement ci-dessous,
        // pas seulement par l'égalité globale.
        private static readonly string[] SeverityTokenAccesses =
        {
            "DesignTokens.Current.accentSuccess",
            "DesignTokens.Current.accentWarning",
            "DesignTokens.Current.accentDanger",
        };

        private static int CountSeverityTokenAccesses(string text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            int count = 0;
            foreach (string token in SeverityTokenAccesses)
            {
                int idx = 0;
                while ((idx = text.IndexOf(token, idx, System.StringComparison.Ordinal)) != -1)
                {
                    count++;
                    idx += token.Length;
                }
            }
            return count;
        }

        private static (int total, HashSet<string> files) ScanSeverityTokenAccesses(string rootDirectory)
        {
            int total = 0;
            var files = new HashSet<string>();
            foreach (string path in Directory.GetFiles(rootDirectory, "*.cs", SearchOption.AllDirectories))
            {
                int hits = CountSeverityTokenAccesses(File.ReadAllText(path));
                if (hits <= 0) continue;
                total += hits;
                string rel = path.Substring(rootDirectory.Length)
                    .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    .Replace('\\', '/');
                files.Add(rel);
            }
            return (total, files);
        }

        // Allowlist MESURÉE (pas devinée) après le fix B2/F2 — 12 fichiers, 32 occurrences (script
        // Python indépendant sur Assets/Scripts, re-vérifiable via la même commande).
        private static readonly HashSet<string> ExpectedSeverityTokenFiles = new HashSet<string>
        {
            "CityMap/DistrictInteriorScreenController.cs",
            "Operational/Autonomy/AutonomyInboxController.cs",
            "Operational/BuildingCard/BuildingCardController.cs",
            "Operational/Dashboard/DashboardController.cs",
            "Operational/Exceptions/ExceptionDetailController.cs",
            "Operational/Exceptions/ExceptionQueueController.cs",
            "Operational/Laundering/LaunderingController.cs",
            "Operational/Laundering/PipelineOverviewController.cs",
            "Operational/Lieutenant/LieutenantScreenController.cs",
            "Shell/DailyReviewScreenController.cs",
            "Shell/ExceptionQueuePanelController.cs",
            "ShellContracts/HeatBucketResolver.cs",
        };
        private const int ExpectedSeverityTokenTotal = 32;

        [Test]
        public void F2_SeverityTokenAccesses_EqualMeasuredAllowlist_TopBarControllerExcluded()
        {
            Assert.IsNotEmpty(ExpectedSeverityTokenFiles);
            string scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(scriptsRoot), $"Assets/Scripts introuvable à {scriptsRoot}");

            (int total, HashSet<string> files) = ScanSeverityTokenAccesses(scriptsRoot);

            Assert.AreEqual(ExpectedSeverityTokenTotal, total,
                $"attendu {ExpectedSeverityTokenTotal} accès aux 3 tokens de sévérité, trouvé {total} — " +
                "un accès a été ajouté ou retiré sans mettre à jour l'allowlist déclarée ci-dessus.");
            CollectionAssert.AreEquivalent(ExpectedSeverityTokenFiles, files,
                "l'ENSEMBLE des fichiers accédant aux tokens de sévérité a divergé de l'allowlist mesurée.");

            // LA régression que ce chunk ferme, épinglée explicitement (pas seulement l'égalité
            // globale ci-dessus) : TopBarController peignait le manomètre en accédant ces tokens
            // DIRECTEMENT (positionnel + commentaires) — il passe désormais PAR `HeatBucketResolver`.
            Assert.IsFalse(files.Contains("Shell/TopBarController.cs"),
                "TopBarController.cs ne doit PLUS accéder ces tokens directement — le manomètre " +
                "passe par HeatBucketResolver.SeverityColor (F2/B2 : aucune correspondance " +
                "bucket→apparence hors du résolveur).");
        }
    }
}
