using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup)
using MafiaCleanCity.Operational.Exceptions; // ExceptionCardDto
using MafiaCleanCity.Tests; // SeederSupport.RunDevPsql
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C5 (design §3 C5) — `ExceptionQueuePanel` : top-N + actions inline.
    [Category("W3U1")]
    public class ExceptionQueuePanelControllerPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private static IEnumerator SignUp(System.Action<string, string> onTokenAndCallsign)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("c5", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u1-c5-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            onTokenAndCallsign(token, callsign);
        }

        private static IEnumerator SeedPendingExceptionForPlayer(string playerId, string severityLabel, System.Action<string> onExceptionId)
        {
            int severity = severityLabel == "HIGH" ? 90 : severityLabel == "LOW" ? 10 : 50;
            string body = $"{{\"playerId\":\"{playerId}\",\"severity\":{severity},\"eventDescriptor\":\"card.test.w3u1_c5\"}}";
            using (var req = new UnityWebRequest(BaseUrl + "/v1/_test/core-loops/seed-pending-exception", UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.timeout = 10;
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"seed-pending-exception failed: {req.error}");
                var m = System.Text.RegularExpressions.Regex.Match(req.downloadHandler.text, "\"exceptionId\"\\s*:\\s*\"([^\"]+)\"");
                onExceptionId(m.Success ? m.Groups[1].Value : null);
            }
        }

        private ExceptionQueuePanelController NewBarePanel()
        {
            hostGo = new GameObject("ExceptionQueuePanel");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<ExceptionQueuePanelController>();
        }

        private static ExceptionCardDto SyntheticCard(string id, string severityBand)
        {
            return new ExceptionCardDto
            {
                exception_id = id,
                lieutenant_id = "",
                event_descriptor = "card.test.synthetic",
                candidate_actions = new CandidateActionDto[0],
                suggested_action = new CandidateActionDto { id = "ack", label = "Acknowledge", projected_consequence = "", add_rule_dsl = "" },
                confidence_band = "LIKELY",
                priority_band = "MEDIUM",
                severity_band = severityBand,
                resolution_status = "pending",
            };
        }

        // C5-F1 — chaque carte porte la VALEUR de son bucket de sévérité, doublée d'un LABEL
        // textuel (couleur jamais seul différenciateur). Scénario : au moins deux sévérités
        // distinctes dans la MÊME liste.
        [Test]
        public void C5F1_SeverityValueAndLabel_TwoDistinctSeveritiesInSameList()
        {
            var panel = NewBarePanel();
            panel.SetQueue("dummy-token", new[] { SyntheticCard("a", "HIGH"), SyntheticCard("b", "LOW") });

            // ⛔ CES TROIS ASSERTIONS ÉTAIENT NUES, et leur rouge l'a prouvé : dans le run complet
            //    du 2026-09-07, ce test est tombé sur « Expected: True / But was: False » — SANS
            //    un mot. Un balayage des 46 rouges par leur MESSAGE l'a classé « non classable » :
            //    impossible de savoir ce qu'il cherchait, donc impossible de décider s'il accusait
            //    le code ou son propre monde.
            //    ⇒ *Un rouge qui ne dit pas ce qu'il cherchait est un rouge qu'on ne peut pas
            //      classer* — et une assertion booléenne nue est une garde qui refuse de coopérer
            //      avec celui qui la lira. Les assertions ne changent PAS : seul leur message naît.
            string vus = panel.RenderedSeverityLabels.Count == 0
                ? "(aucun)"
                : string.Join(" | ", panel.RenderedSeverityLabels);
            Assert.AreEqual(2, panel.RenderedSeverityLabels.Count,
                $"deux cartes de sévérités DISTINCTES (HIGH, LOW) ont été posées : le panneau doit "
              + $"rendre deux libellés de sévérité, un par carte — rendus : [{vus}]");
            Assert.IsTrue(panel.RenderedSeverityLabels.Contains("High"),
                $"la carte de sévérité HIGH doit porter le libellé « High » — la couleur n'est "
              + $"jamais seule différenciatrice (C5-F1) — rendus : [{vus}]");
            Assert.IsTrue(panel.RenderedSeverityLabels.Contains("Low"),
                $"la carte de sévérité LOW doit porter le libellé « Low » — rendus : [{vus}]");
            Assert.AreNotEqual(panel.RenderedSeverityLabels[0], panel.RenderedSeverityLabels[1],
                "two DISTINCT severities produce two DISTINCT labels (a constant label would pass a single-severity check)");
        }

        // C5-F2 (R2.3 — sensibilité au tunable) — le nombre de cartes rendues ÉGALE la longueur du
        // tableau reçu. Scénario : DEUX longueurs différentes dans 1..5 — dimensionné : une seule
        // longueur laisserait passer un rendu figé à 3 (le défaut du tunable, la dégénérescence la
        // plus probable).
        [Test]
        public void C5F2_RenderedCount_EqualsArrayLength_TwoDifferentLengths()
        {
            var panel = NewBarePanel();

            panel.SetQueue("dummy-token", new[] { SyntheticCard("a", "HIGH") }); // length 1
            Assert.AreEqual(1, panel.RenderedCardCount);

            panel.SetQueue("dummy-token", new[]
            {
                SyntheticCard("a", "HIGH"), SyntheticCard("b", "MEDIUM"), SyntheticCard("c", "LOW"),
                SyntheticCard("d", "HIGH"), SyntheticCard("e", "LOW"),
            }); // length 5 — NOT the tunable's default (3), the tempting degenerate fixed value
            Assert.AreEqual(5, panel.RenderedCardCount,
                "a render fixed at 3 (the DEFAULT, the most tempting degeneracy) would fail THIS length");
        }

        // C5-F3 — liste vide ⇒ état vide canonique rendu PAR SA VALEUR.
        [Test]
        public void C5F3_EmptyList_RendersNamedEmptyState()
        {
            var panel = NewBarePanel();
            panel.SetQueue("dummy-token", new ExceptionCardDto[0]);
            Assert.IsTrue(panel.RenderedEmptyState);
            Assert.AreEqual(0, panel.RenderedCardCount);
        }

        // C5-F4 (à travers l'enveloppe — LES DEUX routes) — l'action inline émet une VRAIE requête
        // sur POST /v1/exceptions/:id/resolve, ET le lien "voir toutes" en émet une sur
        // GET /v1/exceptions/queue, toutes deux lues via payload.data.
        [UnityTest]
        public IEnumerator C5F4_BothRoutes_RealRequests_ThroughEnvelope()
        {
            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            Assert.IsTrue(SeederSupport.IsUuid(playerId), $"resolved a real player_id: '{playerId}'");

            string exceptionId = null;
            yield return SeedPendingExceptionForPlayer(playerId, "HIGH", id => exceptionId = id);
            Assert.IsFalse(string.IsNullOrEmpty(exceptionId), "seeded a real pending exception");

            var panel = NewBarePanel();
            panel.SetQueue(token, new[] { SyntheticCard(exceptionId, "HIGH") }); // the REAL id, so Resolve targets a real row

            // ---- inline resolve: a REAL request. ----
            Assert.AreEqual(0, panel.ResolveRequestCount);
            yield return panel.ResolveInline(exceptionId, "ONE_TIME", "ack");
            Assert.AreEqual(1, panel.ResolveRequestCount, "inline resolve emitted EXACTLY one request");
            Assert.IsNull(panel.LastResolveError, $"resolve errored: {panel.LastResolveError}");

            // ---- "view all": a REAL request on the DISTINCT queue route, read through payload.data. ----
            Assert.AreEqual(0, panel.ViewAllRequestCount);
            yield return panel.ViewAll();
            Assert.AreEqual(1, panel.ViewAllRequestCount, "'view all' emitted EXACTLY one request");
            Assert.IsNull(panel.LastViewAllError, $"view-all errored: {panel.LastViewAllError}");
            Assert.IsNotNull(panel.LastViewAllResult, "GET /v1/exceptions/queue parsed through payload.data");
            // The just-resolved card is no longer pending — an INDEPENDENT ground-truth cross-check
            // that 'view all' really hit the LIVE route (not a stub echoing what SetQueue was given).
            Assert.IsFalse(panel.LastViewAllResult.Any(c => c.exception_id == exceptionId),
                "the resolved card is ABSENT from the live queue — proves 'view all' read REAL server state");
        }
    }
}
