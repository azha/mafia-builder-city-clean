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

        // ⛔⛔ RÉÉCRITE LE 2026-08-21 — CETTE GARDE A LAISSÉ PASSER UNE AIGUILLE INVERSÉE, ET SON
        // COMMENTAIRE D'ORIGINE NOMMAIT EXACTEMENT CE DÉFAUT.
        //
        // Elle disait ceci, et c'était déjà un durcissement : « l'ancienne version assertait 4
        // valeurs distinctes, ce qu'une aiguille INVERSÉE (BURNING à gauche, COLD à droite)
        // satisferait tout autant qu'une aiguille correcte. La propriété est l'ORDRE. » Le monde
        // dégénéré était donc nommé, et le durcissement l'a quand même manqué — parce que
        // « strictement croissant » est une propriété de la SUITE DE NOMBRES, et l'inversion est une
        // propriété de l'ÉCRAN. `-60 < -20 < 20 < 60` est strictement croissant ; c'était la valeur
        // livrée ; et elle mettait COLD à DROITE, dans l'arc rouge.
        //
        // ⇒ Cette version ne regarde plus les nombres : elle applique la rotation à un
        // RectTransform aux dimensions EXACTES de production et mesure où le BOUT atterrit. Aucune
        // convention de signe ne peut plus la satisfaire par accident, parce qu'elle ne lit plus le
        // signe. C'est la troisième fois aujourd'hui qu'une garde de FORME est remplacée par une
        // garde d'EFFET pour la même raison.
        [Test]
        public void HudF2_BoutDeLAiguille_VaDeGaucheADroite_QuandLaChaleurMonte_MesureALEcran()
        {
            var ranks = new[]
            {
                HeatBucketResolver.Rank.Cold, HeatBucketResolver.Rank.Warm,
                HeatBucketResolver.Rank.Hot, HeatBucketResolver.Rank.Burning,
            };

            var canvasGo = new GameObject("HudF2_Canvas", typeof(Canvas));
            canvasGo.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var needleGo = new GameObject("HudF2_Needle", typeof(RectTransform));
            needleGo.transform.SetParent(canvasGo.transform, false);
            var rt = (RectTransform)needleGo.transform;
            // REUSE des dimensions de PRODUCTION (TopBarController.cs:837-840). Les recopier ailleurs
            // ferait de ce test une mesure d'une aiguille imaginaire.
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0f);
            rt.sizeDelta = new Vector2(1.5f, 13f);
            rt.anchoredPosition = new Vector2(0f, 5f);

            var xs = new float[ranks.Length];
            var coins = new Vector3[4];
            try
            {
                for (int i = 0; i < ranks.Length; i++)
                {
                    rt.localEulerAngles = new Vector3(0f, 0f, HeatBucketResolver.NeedleAngleDegrees(ranks[i]));
                    Canvas.ForceUpdateCanvases();
                    rt.GetWorldCorners(coins);
                    Vector3 bout = (coins[1] + coins[2]) * 0.5f;   // milieu du bord HAUT = le bout
                    xs[i] = bout.x - rt.position.x;                 // écart signé au pivot
                }
            }
            finally { Object.DestroyImmediate(canvasGo); }

            // Anti-vacuité D'ABORD : une aiguille de longueur nulle, ou une rotation jamais
            // appliquée, donnerait quatre écarts nuls — et toutes les comparaisons ci-dessous
            // seraient satisfaites « à vide » par des égalités. On exige donc une amplitude RÉELLE.
            float amplitude = Mathf.Max(Mathf.Abs(xs[0]), Mathf.Abs(xs[3]));
            Assert.Greater(amplitude, 2f,
                $"anti-vacuité — le bout doit VRAIMENT se déplacer (amplitude mesurée {amplitude:F2}px). " +
                "Sans ça, quatre zéros satisferaient l'ordre sans qu'aucune aiguille ne bouge.");

            Assert.Less(xs[0], 0f, $"COLD doit pointer à GAUCHE du pivot (écart mesuré {xs[0]:F2}px) — " +
                "c'est le côté où `TopBarController` peint l'arc froid");
            Assert.Greater(xs[3], 0f, $"BURNING doit pointer à DROITE (écart mesuré {xs[3]:F2}px) — " +
                "le côté de `ArcHot` (`Origin180.Right`, couverture mesurée ≈[7°,91°])");
            Assert.Less(xs[0], xs[1], $"COLD ({xs[0]:F2}) plus à gauche que WARM ({xs[1]:F2})");
            Assert.Less(xs[1], xs[2], $"WARM ({xs[1]:F2}) plus à gauche que HOT ({xs[2]:F2})");
            Assert.Less(xs[2], xs[3], $"HOT ({xs[2]:F2}) plus à gauche que BURNING ({xs[3]:F2})");
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
            // AMENDÉ NOMMÉMENT (2026-08-21) — la liste attendue était celle des valeurs BRUTES du
            // back. Le bandeau les affichait telles quelles (le joueur lisait « DAWN » à côté de
            // « JOUR 1 ») ; elles passent désormais par `DayPhaseResolver.Label`. La liste est
            // DÉRIVÉE du résolveur au lieu d'être recopiée : recopier quatre libellés ici les ferait
            // vieillir seuls le jour où le résolveur change, et le test épinglerait une mise en forme
            // que plus personne n'applique.
            string[] libellesAttendus = System.Array.ConvertAll(
                DayPhaseResolver.CanonicalPhases, DayPhaseResolver.Label);
            Assert.Contains(shell.TopBar.DayPhaseText, libellesAttendus,
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
        // ⚠️ PRÉCISION (verdict ⊥) — `HeatAccent` ET le manomètre consomment TOUS DEUX
        // `HeatBucketResolver.SeverityColor` désormais (§2.4 : un seul résolveur) : l'égalité
        // SURFACE-CONTRE-SURFACE ci-dessus est donc un témoin FAIBLE — les deux surfaces
        // partagent la MÊME source, un bug DANS `SeverityColor` lui-même les ferait dériver
        // ENSEMBLE, identiquement, et cette égalité resterait VERTE. **L'assertion PORTEUSE est
        // l'égalité aux 3 hex canon** — le SEUL oracle réellement INDÉPENDANT des deux surfaces (il
        // vient de `global_conventions_core.md`, pas du code). Le dire ici évite de croire qu'on
        // tient deux témoins quand on en tient un (le hex canon) plus un étalon partagé.
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

                // (verdict ⊥ HUD v3.1, geste 3) — CityMapController est le SEUL locataire dont le
                // repli ressusciterait la course à 2 comptes AU NIVEAU TENANT (son propre signin
                // démo, citymap_demo, si jamais il n'était PAS injecté) — ni hud-F1 (Dashboard) ni
                // le reste de CE test (qui ne lit que le TopBar) ne le verraient. Vérifié à CHAQUE
                // palier City : le jeton du locataire monté == EXACTEMENT celui du shell.
                if (alternation[i] == AppShell.Tab.City)
                {
                    var cityMapTenant = shell.MountedTenantGameObject != null
                        ? shell.MountedTenantGameObject.GetComponent<CityMapController>() : null;
                    Assert.IsNotNull(cityMapTenant, $"palier {i} : City doit monter CityMapController");
                    Assert.AreEqual(shell.Token, cityMapTenant.Token,
                        $"palier {i} : CityMapController doit porter EXACTEMENT le jeton du shell — " +
                        "injecté, jamais re-signé avec citymap_demo (le repli ressusciterait la course à 2 comptes)");
                }
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

        // ── F2 (IMPORTANT) — aucune correspondance bucket→apparence DÉTECTABLE hors du résolveur ──

        // (hud-session-arbitrages-design.md §3, F2) — REUSE du patron
        // `ChromeTabAccentAllowlistPlayModeTests` (égalité d'ENSEMBLES contre une allowlist MESURÉE,
        // jamais un `contains`). DEUX motifs, PAS un seul (IMPORTANT-2, verdict ⊥) : le premier
        // (accès direct aux 3 tokens de sévérité) a un ANGLE MORT mesuré — 8 des 12 fichiers de son
        // allowlist définissent des ALIAS locaux (`private static Color AccentMild =>
        // DesignTokens.Current.accentSuccess;`) ; une correspondance bucket→apparence DIVERGENTE
        // écrite VIA l'alias (`b == "HOT" ? AccentSevere : AccentMild`) ajoute ZÉRO occurrence du
        // premier motif — total inchangé, ensemble inchangé, F2 resterait VERTE à travers la classe
        // exacte qu'elle existe pour attraper. Le second motif (littéraux de bucket "COLD"/"WARM"/
        // "HOT"/"BURNING") ferme cet angle mort : une correspondance ALIASÉE référence toujours AU
        // MOINS un littéral de bucket, même quand elle ne touche aucun token `DesignTokens` en
        // clair. Portée EXPLICITE de la revendication (le commentaire du chunk précédent
        // sur-affirmait) : ces DEUX motifs ne voient PAS une correspondance qui n'utiliserait NI
        // l'un NI l'autre (un hex en dur, une 3e indirection) — ce n'est PAS une preuve universelle,
        // c'est une preuve bornée aux DEUX formes mesurées ici, comme
        // `Scan_DetectsAllThreeSyntacticForms` l'est aux 3 formes qu'IL mesure.

        // ── motif 1 — accès direct aux tokens de sévérité ──────────────────────────────────
        private static readonly string[] SeverityTokenAccesses =
        {
            "DesignTokens.Current.accentSuccess",
            "DesignTokens.Current.accentWarning",
            "DesignTokens.Current.accentDanger",
        };

        private static int CountLiteralOccurrences(string text, string[] literals)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            int count = 0;
            foreach (string lit in literals)
            {
                int idx = 0;
                while ((idx = text.IndexOf(lit, idx, System.StringComparison.Ordinal)) != -1)
                {
                    count++;
                    idx += lit.Length;
                }
            }
            return count;
        }

        private static (int total, HashSet<string> files) ScanLiteralOccurrences(string rootDirectory, string[] literals)
        {
            int total = 0;
            var files = new HashSet<string>();
            foreach (string path in Directory.GetFiles(rootDirectory, "*.cs", SearchOption.AllDirectories))
            {
                int hits = CountLiteralOccurrences(File.ReadAllText(path), literals);
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

        // ── motif 2 — littéraux de bucket (ferme l'angle mort du motif 1, IMPORTANT-2) ──────
        private static readonly string[] BucketLiterals = { "\"COLD\"", "\"WARM\"", "\"HOT\"", "\"BURNING\"" };

        // Allowlist MESURÉE (script Python indépendant, même méthode que ci-dessus) — 4 fichiers,
        // 24 occurrences. `BuildingCardController.cs` (2 occurrences, "HOT" seulement) est un FAUX
        // POSITIF DOCUMENTÉ : sa bande `temperature_status` (Crick cold-chain, OPTIMAL_COLD|
        // MODERATE|HOT, `TemperatureLabel`/`TemperatureGlyph`/`TemperatureAccent`) est un domaine
        // ENTIÈREMENT DIFFÉRENT qui partage par coïncidence le mot anglais "HOT" — vérifié : ce
        // fichier a ZÉRO occurrence de "COLD"/"WARM"/"BURNING" (les 3 littéraux les moins ambigus).
        // Laissé SUR l'allowlist plutôt que le motif rétréci à 3 littéraux : le total exact reste le
        // détecteur, et une VRAIE correspondance HeatBucket ajoutée dans ce fichier ferait quand
        // même diverger le compte.
        private static readonly HashSet<string> ExpectedBucketLiteralFiles = new HashSet<string>
        {
            "CityMap/WorldDtos.cs",
            "Operational/BuildingCard/BuildingCardController.cs", // faux positif documenté — temperature_status, pas HeatBucket
            "Operational/Dashboard/DashboardController.cs",
            "ShellContracts/HeatBucketResolver.cs",
        };
        private const int ExpectedBucketLiteralTotal = 24;

        [Test]
        public void F2_SeverityTokenAccesses_EqualMeasuredAllowlist_TopBarControllerExcluded()
        {
            Assert.IsNotEmpty(ExpectedSeverityTokenFiles);
            string scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(scriptsRoot), $"Assets/Scripts introuvable à {scriptsRoot}");

            (int total, HashSet<string> files) = ScanLiteralOccurrences(scriptsRoot, SeverityTokenAccesses);

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
                "passe par HeatBucketResolver.SeverityColor.");
        }

        [Test]
        public void F2_BucketLiteralOccurrences_EqualMeasuredAllowlist()
        {
            Assert.IsNotEmpty(ExpectedBucketLiteralFiles);
            string scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(scriptsRoot), $"Assets/Scripts introuvable à {scriptsRoot}");

            (int total, HashSet<string> files) = ScanLiteralOccurrences(scriptsRoot, BucketLiterals);

            Assert.AreEqual(ExpectedBucketLiteralTotal, total,
                $"attendu {ExpectedBucketLiteralTotal} littéraux de bucket, trouvé {total} — un " +
                "littéral a été ajouté ou retiré (possiblement une correspondance bucket→apparence " +
                "ALIASÉE, IMPORTANT-2) sans mettre à jour l'allowlist déclarée ci-dessus.");
            CollectionAssert.AreEquivalent(ExpectedBucketLiteralFiles, files,
                "l'ENSEMBLE des fichiers portant un littéral de bucket a divergé de l'allowlist mesurée.");
        }

        // Contrôle positif (IMPORTANT-2, verdict ⊥) — le motif 2 doit attraper la forme ALIASÉE que
        // le motif 1 rate structurellement : une correspondance bucket→couleur écrite via un alias
        // local (`AccentSevere`/`AccentMild`), jamais un accès direct à `DesignTokens.Current.*`.
        // Mêmes fixtures dans l'esprit que `Scan_DetectsAllThreeSyntacticForms` : prouver que
        // l'INSTRUMENT peut voir la forme qu'on lui demande de traquer, avant de lui faire confiance
        // sur le vrai arbre source.
        [TestCase("b == \"HOT\" ? AccentSevere : AccentMild", 1, TestName = "Forme aliasée — ternaire sur alias")]
        [TestCase("case \"BURNING\": return AccentSevere;", 1, TestName = "Forme aliasée — switch sur alias")]
        [TestCase("private static readonly Color AccentMild = DesignTokens.Current.accentSuccess;", 0,
            TestName = "Définition d'alias SEULE (aucun littéral de bucket) — 0 attendu, ce n'est pas une correspondance")]
        public void Scan_DetectsAliasedBucketColorMapping_ViaBucketLiteralMotif(string sourceLine, int expectedHits)
        {
            int hits = CountLiteralOccurrences(sourceLine, BucketLiterals);
            Assert.AreEqual(expectedHits, hits,
                $"la forme '{sourceLine}' aurait dû compter {expectedHits} littéral(aux) de bucket, " +
                $"obtenu {hits} — le motif 2 doit voir une correspondance ALIASÉE que le motif 1 (accès " +
                "direct aux tokens) rate structurellement.");
        }

        // ── hud-F2c — la phase du jour ne fuit pas son enum de base ────────────────────────────────
        // Événement à faire rougir : quelqu'un remet la valeur brute dans le bandeau (ou ajoute un
        // 5ᵉ quart sans lui donner de libellé). Côté C# la valeur arrive en `string` : il n'y a pas
        // d'enum à rendre exhaustif, donc le compilateur ne verra jamais rien — le détecteur DOIT
        // être un test qui ÉNUMÈRE les quarts canoniques.
        //
        // Monde dégénéré tué explicitement : un résolveur qui rendrait son entrée telle quelle
        // passerait n'importe quelle assertion « le libellé n'est pas vide ». On exige donc que
        // CHAQUE quart canonique soit rendu DIFFÉREMMENT de sa forme brute.
        [Test]
        public void HudF2c_LibelleDeQuartDuJour_JamaisLaValeurBrute_PourChaqueQuartCanonique()
        {
            Assert.AreEqual(4, DayPhaseResolver.CanonicalPhases.Length,
                "anti-vacuité — la boucle suivante ne prouve rien sur un jeu vide ; si le back gagne " +
                "un 5ᵉ quart, ce compte doit être amendé NOMMÉMENT et le libellé ajouté avec lui");

            foreach (string brut in DayPhaseResolver.CanonicalPhases)
            {
                string libelle = DayPhaseResolver.Label(brut);
                Assert.AreNotEqual(brut, libelle,
                    $"« {brut} » est rendu tel quel — c'est la valeur d'enum de la base qui arrive " +
                    "à l'écran, à côté d'un « JOUR 1 » déjà mis en forme");
                Assert.IsNotEmpty(libelle, $"« {brut} » n'a pas de libellé");
                StringAssert.AreEqualIgnoringCase(brut, libelle,
                    $"le libellé de « {brut} » doit rester LE MÊME MOT — ce résolveur met en forme, " +
                    "il ne traduit pas (la langue de l'interface est un arbitrage produit ouvert)");
            }

            // Une valeur inconnue passe TELLE QUELLE, délibérément : voir passer un quart inattendu
            // est un signal, le voir disparaître derrière un « — » n'en est pas un.
            Assert.AreEqual("MIDNIGHT_SUN", DayPhaseResolver.Label("MIDNIGHT_SUN"),
                "un quart inconnu reste visible plutôt que masqué");
            Assert.AreEqual("—", DayPhaseResolver.Label(null),
                "hors district : l'état NOMMÉ « — », jamais la dernière valeur d'un district quitté");
        }
    }
}
