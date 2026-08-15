using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup)
using MafiaCleanCity.Tests;   // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C8 (design §3 C8, D6) — `DailyReviewScreen`.
    [Category("W3U1")]
    public class DailyReviewScreenControllerPlayModeTests
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
            string callsign = SeederSupport.SafeCallsign("c8", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u1-c8-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            onTokenAndCallsign(token, callsign);
        }

        // Mirrors `flag_tick_daily.spec.ts`'s OWN seedLieutenant/seedRoutineItem/seedFlaggedItem
        // verbatim (same columns, same values) — the established back-E2E precedent for a real,
        // deterministic PENDING flag, ported to Unity via SeederSupport.RunDevPsql.
        private static string SeedPendingFlag(string playerId)
        {
            string scriptId = SeederSupport.RunDevPsql("INSERT INTO \"behavior_script\" DEFAULT VALUES RETURNING script_id;");
            string lieutenantId = SeederSupport.RunDevPsql(
                $"INSERT INTO \"lieutenant\" (\"player_id\",\"name\",\"name_locale\",\"role_id\",\"source\",\"behavior_script_id\") " +
                $"VALUES ('{playerId}','LT w3u1','en',6,'civilian','{scriptId}') RETURNING lieutenant_id;");
            string routineItemId = SeederSupport.RunDevPsql(
                $"INSERT INTO \"routine_items\" (\"player_id\",\"game_day\",\"generator\",\"dedup_key\",\"responsible_role_id\",\"lieutenant_id\",\"status\") " +
                $"VALUES ('{playerId}', 1, 'COURIER_SCHEDULING', 'w3u1-c8-{System.Guid.NewGuid():N}', 6, '{lieutenantId}', 'flagged') " +
                $"RETURNING routine_item_id;");
            string flagId = SeederSupport.RunDevPsql(
                $"INSERT INTO \"flagged_items\" (\"player_id\",\"lieutenant_id\",\"routine_item_id\",\"routine_item_descriptor\",\"flag_reason\"," +
                $"\"deviation_score_internal\",\"emitted_tick\",\"game_day\",\"flagged_at\",\"resolution\") " +
                $"VALUES ('{playerId}', '{lieutenantId}', '{routineItemId}', '{{}}'::jsonb, '{{}}'::jsonb, 0.9, 0, 1, now(), 'pending') " +
                $"RETURNING flag_id;");
            return flagId;
        }

        private DailyReviewScreenController NewBareScreen()
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<DailyReviewScreenController>();
        }

        // C8-F3 (ouverture auto) — l'écran s'ouvre QUAND le booléen serveur est vrai et PAS quand il
        // est faux. Scénario : les deux polarités.
        [Test]
        public void C8F3_AutoOpen_FollowsServerBoolean_BothPolarities()
        {
            var screen = NewBareScreen();
            screen.ApplyAutoOpen(true);
            Assert.IsTrue(screen.IsOpen);
            screen.ApplyAutoOpen(false);
            Assert.IsFalse(screen.IsOpen);
        }

        // C8-F4 — liste vide ⇒ état vide canonique PAR SA VALEUR.
        [UnityTest]
        public IEnumerator C8F4_EmptyList_RendersNamedEmptyState()
        {
            string token = null;
            yield return SignUp((t, c) => token = t);
            var screen = NewBareScreen();
            yield return screen.LoadReview(token); // a fresh player: no flags seeded
            Assert.IsTrue(screen.RenderedEmptyState);
            Assert.AreEqual(0, screen.RenderedCardCount);
        }

        // C8-F5 (à travers l'enveloppe) — au moins une VRAIE requête sur GET /v1/flag-review.
        [UnityTest]
        public IEnumerator C8F5_LoadReview_RealRequest_ThroughEnvelope()
        {
            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            SeedPendingFlag(playerId);

            var screen = NewBareScreen();
            yield return screen.LoadReview(token);
            Assert.IsNotNull(screen.LastLoadedReview, "flag-review parsed through payload.data");
            Assert.AreEqual(1, screen.RenderedCardCount, "the seeded pending flag is rendered");
            Assert.IsFalse(screen.RenderedEmptyState);
        }

        // C8-F1 — valider et écarter émettent chacun EXACTEMENT une requête sur LA ROUTE
        // CORRESPONDANTE ; on distingue les deux routes. Scénario : les deux actions dans le MÊME
        // test — sinon un câblage croisé passe.
        [UnityTest]
        public IEnumerator C8F1_ValidateAndDismiss_ExactlyOneRequestEach_DistinctRoutes()
        {
            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            string flagIdA = SeedPendingFlag(playerId);
            string flagIdB = SeedPendingFlag(playerId);

            var screen = NewBareScreen();
            yield return screen.LoadReview(token); // binds the Bearer the verdict routes below use
            Assert.AreEqual(0, screen.ValidateRequestCount);
            Assert.AreEqual(0, screen.DismissRequestCount);

            yield return screen.ValidateFlag(flagIdA);
            Assert.AreEqual(1, screen.ValidateRequestCount, "validate emitted EXACTLY one request");
            Assert.AreEqual(0, screen.DismissRequestCount, "dismiss was NOT touched by validate — distinct routes");
            Assert.IsNull(screen.LastValidateError, $"validate errored: {screen.LastValidateError}");

            yield return screen.DismissFlag(flagIdB);
            Assert.AreEqual(1, screen.DismissRequestCount, "dismiss emitted EXACTLY one request");
            Assert.AreEqual(1, screen.ValidateRequestCount, "validate count UNCHANGED by dismiss — distinct routes");
            Assert.IsNull(screen.LastDismissError, $"dismiss errored: {screen.LastDismissError}");
        }

        // C8-F2 — la confirmation groupée EXIGE l'appui long ; un tap simple n'émet rien.
        [UnityTest]
        public IEnumerator C8F2_BatchConfirm_RequiresLongPress_TapEmitsNothing()
        {
            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");

            var screen = NewBareScreen();
            // Bind the token the button's coroutine will use (LoadReview also does this; a bare
            // player with zero flags is fine — batch-confirm's own contract allows 0 confirmed).
            yield return screen.LoadReview(token);

            Assert.AreEqual(0, screen.BatchConfirmRequestCount);
            screen.BatchConfirmButton.SimulateShortTap();
            yield return null;
            Assert.AreEqual(0, screen.BatchConfirmRequestCount, "a short tap NEVER emits a batch-confirm request");

            screen.BatchConfirmButton.SimulateCompletedLongPress();
            Assert.AreEqual(1, screen.BatchConfirmRequestCount, "a completed long press emits EXACTLY one request");
            float waited = 0f;
            while (screen.LastBatchConfirmedCount == null && screen.LastBatchConfirmError == null && waited < 10f)
            {
                yield return null;
                waited += Time.unscaledDeltaTime;
            }
            Assert.IsNull(screen.LastBatchConfirmError, $"batch-confirm errored: {screen.LastBatchConfirmError}");
            Assert.IsNotNull(screen.LastBatchConfirmedCount, "batch_confirmed_count read through payload.data");
        }
    }
}
