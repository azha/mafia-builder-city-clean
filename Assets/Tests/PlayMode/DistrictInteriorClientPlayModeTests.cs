using System;
using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport

namespace MafiaCleanCity.CityMap.Tests
{
    // W3.U2 C7 (design §3 C7, D1/D2, U-7) — C7-F1 : le CLIENT (CityProjectionsClient.Interior) parse
    // une vraie réponse de GET /v1/city/district/:id/interior, corps de succès EXIGÉ (une requête
    // indépendante sert de ground truth), et rend la grille + les bâtiments — scénario dimensionné
    // sur les 4 bâtiments du starter kit J0 (onboarding-grant.service.ts, VERGE_A_DISTRICT_ID=16),
    // avec la jointure building.block_id ⊆ blocks[].block_id vérifiée.
    [Category("W3U2")]
    public class DistrictInteriorClientPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int VergeADistrictId = 16; // onboarding-grant.service.ts:112 — les 4 bâtiments starter-kit
        private static int callsignSeq;

        private static IEnumerator SignUpAndOpenSession(Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("c7c", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-c7c-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-c7c", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        [UnityTest]
        public IEnumerator C7F1_RealResponse_SuccessBodyRequired_GridAndBuildingsMatchGroundTruth()
        {
            string token = null;
            yield return SignUpAndOpenSession(t => token = t);

            // Ground truth — an INDEPENDENT raw GET on the SAME route (never routed through the
            // client under test — mirrors OrgVitalsPanelControllerPlayModeTests.C6F3's pattern).
            DistrictInteriorDto live = null;
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + $"/v1/city/district/{VergeADistrictId}/interior"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"ground-truth interior GET failed: {req.error}");
                live = JsonUtility.FromJson<DistrictInteriorEnvelope>(req.downloadHandler.text)?.payload?.data;
            }
            Assert.IsNotNull(live, "ground-truth interior parsed through payload.data");
            Assert.AreEqual(4, live.buildings?.Length ?? -1, "J0 starter kit grants exactly 4 buildings — scénario dimensionné");

            // The client under test.
            var client = new CityProjectionsClient { BaseUrl = BaseUrl };
            DistrictInteriorDto viaClient = null;
            long errCode = -1;
            yield return client.Interior(VergeADistrictId, token, dto => viaClient = dto, code => errCode = code);

            Assert.AreEqual(-1, errCode, $"the client's interior fetch must succeed (2xx), got code {errCode}");
            Assert.IsNotNull(viaClient, "the client parses through payload.data");
            Assert.AreEqual(live.buildings.Length, viaClient.buildings.Length, "rend les bâtiments — même compte que le ground truth");
            Assert.AreEqual(live.blocks.Length, viaClient.blocks.Length, "rend la grille — même compte de blocs que le ground truth");
            Assert.Greater(viaClient.grid.width, 0, "grid.width dérivé des blocs réels (D2)");
            Assert.Greater(viaClient.grid.height, 0, "grid.height dérivé des blocs réels (D2)");

            // Jointure — chaque building.block_id référence un blocks[].block_id réel.
            var blockIds = viaClient.blocks.Select(b => b.block_id).ToHashSet();
            foreach (var b in viaClient.buildings)
            {
                Assert.IsTrue(blockIds.Contains(b.block_id),
                    $"building {b.building} references block_id {b.block_id} absent from blocks[]");
            }
        }
    }
}
