using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, DistrictInteriorScreenController
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // W3.U2 C7 (design §3 C7, D9 — U-14) — C7-F3 : le diorama obtient son porteur PAR INJECTION
    // (SetSession(bearer, districtId)) — zéro appel à l'auth client depuis CE FICHIER, avec contrôle
    // positif (le même motif retrouve les 8 sites d'auto-signin connus ailleurs, D9's own measured
    // table). Plus un smoke fonctionnel : l'injection fait réellement fonctionner le fetch.
    [Category("W3U2")]
    public class DistrictInteriorScreenControllerPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int VergeADistrictId = 16;
        private static int callsignSeq;
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private DistrictInteriorScreenController NewBareDiorama()
        {
            hostGo = new GameObject("DistrictInteriorDiorama");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<DistrictInteriorScreenController>();
        }

        private static IEnumerator SignUpAndOpenSession(Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("c7d", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-c7d-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-c7d", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        // ── C7-F3 — le seam d'injection ─────────────────────────────────────────

        [Test]
        public void C7F3_NoSigninCall_InDioramaFile_PositiveControlFindsNineElsewhere()
        {
            string dioramaFile = Path.Combine(Application.dataPath, "Scripts", "CityMap", "DistrictInteriorScreenController.cs");
            Assert.IsTrue(File.Exists(dioramaFile), $"diorama file not found at {dioramaFile}");
            string dioramaContent = File.ReadAllText(dioramaFile);
            Assert.IsFalse(dioramaContent.Contains(".SignIn("),
                "le fichier du diorama appelle .SignIn(...) — D9/U-14 exige que le porteur soit INJECTÉ " +
                "via SetSession, jamais un auto-signin.");

            // Contrôle positif obligatoire (socle : « un zéro mesuré sur le mauvais chemin est le plus
            // crédible des faux ») — le MÊME motif doit retrouver les sites d'auto-signin CONNUS
            // ailleurs dans Assets/Scripts, sinon le zéro ci-dessus ne prouve que l'impuissance du motif.
            // AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — 8 -> 9 : `AppShell.cs` acquiert
            // désormais SA PROPRE session (`AcquireSessionThenActivateHome`, `auth.SignIn(...)`), un
            // 9e site LÉGITIME (le shell signe UNE fois pour toute la session — §1.2). Re-mesuré, pas
            // recopié : ce n'est pas une dérive à corriger, c'est le changement architectural que B1
            // prescrit.
            var scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            var csFiles = Directory.GetFiles(scriptsRoot, "*.cs", SearchOption.AllDirectories);
            Assert.IsTrue(csFiles.Length > 0, "anti-vacuité : 0 fichier .cs balayé sous Assets/Scripts.");
            int hits = csFiles.Count(f => File.ReadAllText(f).Contains(".SignIn("));
            Assert.AreEqual(9, hits,
                "contrôle positif : le motif '.SignIn(' doit retrouver les 9 sites d'auto-signin connus " +
                "(8 pré-B1 + AppShell.cs, B1 §1.2) ailleurs dans Assets/Scripts.");
        }

        [Test]
        public void C7F3_NoSerializedIdentifier_OnDioramaComponent()
        {
            var fields = typeof(DistrictInteriorScreenController).GetFields(
                BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            foreach (var f in fields)
            {
                string n = f.Name.ToLowerInvariant();
                Assert.IsFalse(n.Contains("password") || n.Contains("identifier") || n.Contains("callsign"),
                    $"le champ '{f.Name}' ressemble à un identifiant auto-porté — le seam doit rester " +
                    "injection-only (SetSession), jamais une créance stockée.");
            }
        }

        // ── smoke fonctionnel : l'injection marche réellement de bout en bout ──

        [UnityTest]
        public IEnumerator C7F3_SetSession_InjectedBearer_FetchesRealDataWithoutTheComponentSigningItselfIn()
        {
            string token = null;
            yield return SignUpAndOpenSession(t => token = t); // le TEST se signe — le DIORAMA jamais.

            var diorama = NewBareDiorama();
            Assert.IsNull(diorama.LastFetch, "avant SetSession, rien n'a été fetché");

            yield return diorama.SetSession(token, VergeADistrictId);

            Assert.IsTrue(diorama.LastFetchSucceeded,
                $"le fetch via le porteur injecté a échoué (code {diorama.LastErrorCode})");
            Assert.IsNotNull(diorama.LastFetch, "parsé via payload.data");
            Assert.AreEqual(4, diorama.LastFetch.buildings?.Length ?? -1, "starter kit J0 — scénario dimensionné");
        }
    }
}
