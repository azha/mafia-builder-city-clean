using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup -> Bearer, chemin de production)
using MafiaCleanCity.Tests; // SeederSupport.RunDevPsql

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C3 (design §3 C3, §1.3.b) — ferme la forme C : `POST /v1/session/open` existait, personne
    // ne l'appelait. Ces falsifiables prouvent l'appel réel, PAR LE CHEMIN DE PRODUCTION
    // (`AuthClient.SignUp` — jamais une route `_test` de bypass, qui supposerait le franchissement
    // au lieu de le prouver — le socle CLAUDE.md le nomme explicitement).
    [Category("W3U1")]
    public class SessionClientPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;

        private static IEnumerator SignUp(System.Action<string, string> onTokenAndCallsign)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("c3", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u1-c3-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            Assert.IsFalse(string.IsNullOrEmpty(token), "signup returned a token");
            onTokenAndCallsign(token, callsign);
        }

        // W3.U1 C3-F1 dimensioning (design's OWN named trap): a brand-new signup's `city_sim_clock`
        // row is ABSENT until seeded, and `opened_game_day` would derive to 0 — the EXACT language
        // default an unguarded "non-default" assertion would wrongly flag as unfilled. Pin the
        // CITY-GLOBAL epoch BEFORE signup so the NEW player's clock seeds from it (`auth.service.ts:
        // 438-442`, "city_sim_clock (W1.1-d C1.3) — seed this player's OWN in-game clock FROM the
        // city-global epoch, NOT from 0").
        private static IEnumerator PinEpoch(int gameMinute)
        {
            using (UnityWebRequest req = UnityWebRequest.PostWwwForm(
                       BaseUrl + $"/v1/_test/citysim/epoch/set?game_minute={gameMinute}", ""))
            {
                req.timeout = 10;
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result,
                    $"epoch pin failed: {req.error} ({req.downloadHandler?.text})");
            }
        }

        // Mirrors `session_lifecycle.spec.ts`'s OWN `seedSeveredRoute` verbatim (SQL, columns, values)
        // — the back's established, proven precedent for a deterministic non-null `hl_card` (the
        // SEVERED_ROUTE_REBUILD HL provider). REUSE `SeederSupport.RunDevPsql` (already exists for
        // exactly this "fast, deterministic per-test seed" need). `buildings.block_id` is a
        // SOFT-REF, PK'd on (player_id, block_id) — no global collision risk for a brand-new player.
        private static void SeedSeveredRoute(string playerId)
        {
            string origin = SeederSupport.RunDevPsql(
                $"INSERT INTO \"buildings\" (\"player_id\",\"block_id\",\"building_type\",\"ownership\",\"structural_state\") " +
                $"VALUES ('{playerId}', 401, 1, 'player', 'operational') RETURNING building_id;");
            string dest = SeederSupport.RunDevPsql(
                $"INSERT INTO \"buildings\" (\"player_id\",\"block_id\",\"building_type\",\"ownership\",\"structural_state\") " +
                $"VALUES ('{playerId}', 402, 1, 'player', 'operational') RETURNING building_id;");
            SeederSupport.RunDevPsql(
                $"INSERT INTO \"route\" (\"player_id\",\"origin_building_id\",\"destination_building_id\",\"state\") " +
                $"VALUES ('{playerId}', '{origin}', '{dest}', 'severed');");
        }

        // C3-F1 — LA falsifiable de fermeture. Vraie requête POST /v1/session/open, chemin de
        // production (signup réel), lue via payload.data, les 12 clés assertées. Dimensionnement
        // explicite : épingler l'époque AVANT le signup (12e clé non nulle) + semer une route
        // sévérée (hl_card non nul) — sans quoi la règle "non-défaut" rougirait à tort sur la 12e
        // clé (design's own named trap) ou serait invérifiable sur hl_card (nullable par nature).
        [UnityTest]
        public IEnumerator C3F1_RealSessionOpen_ThroughEnvelope_AllTwelveKeysDeserialized()
        {
            yield return PinEpoch(1500); // in_game_day_length_minutes=1440 canonical default -> day 1

            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });

            // Resolve the real player_id — the callsign we minted is unique (RUN-tick-seq'd).
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            Assert.IsTrue(SeederSupport.IsUuid(playerId), $"resolved a real player_id for '{callsign}': '{playerId}'");

            SeedSeveredRoute(playerId);

            var client = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            string err = null;
            yield return client.OpenSession(token, "e2e-w3u1-1.0.0", dto => payload = dto, (code, msg) => err = $"{code}: {msg}");

            Assert.IsNull(err, $"session/open errored: {err}");
            Assert.IsNotNull(payload, "session/open payload parsed through payload.data");

            // ---- the 12 keys, each with the MOST MEANINGFUL non-default/ground-truth check ----
            Assert.IsFalse(string.IsNullOrEmpty(payload.session_id), "session_id: non-empty (always true on success)");

            Assert.IsNotNull(payload.hl_card, "hl_card: non-null — dimensioned via the severed-route seed");
            Assert.IsFalse(string.IsNullOrEmpty(payload.hl_card.decision_type_key), "hl_card.decision_type_key populated");
            Assert.IsFalse(string.IsNullOrEmpty(payload.hl_card.card_id), "hl_card.card_id populated");

            Assert.IsNotNull(payload.queue, "queue: non-null array (JsonUtility default for a missing field is null)");
            Assert.GreaterOrEqual(payload.queue.Length, 1,
                "queue: non-empty — the W1.1-a welcome-grant preseed card fires on this player's FIRST session/open");

            // backlog_badge is the one PLAIN top-level boolean; a fresh player's true, honest value IS
            // `false` (well under the backlog threshold) — asserting it against a GROUND-TRUTH
            // expectation is a STRONGER proof of correct deserialization than forcing it non-default
            // (which would need unrelated heavy seeding, orthogonal to what this falsifiable proves).
            Assert.IsFalse(payload.backlog_badge, "backlog_badge: matches the KNOWN truth for a lightly-seeded player (false)");

            Assert.IsFalse(string.IsNullOrEmpty(payload.queue_pressure_band), "queue_pressure_band: non-empty band string");
            Assert.Contains(payload.queue_pressure_band, new[] { "normal", "warning", "saturated" });

            Assert.IsNotNull(payload.structural_budget, "structural_budget: parsed");
            // used defaults to 0 for a fresh player (honest) — cap_reached is a real, checkable boolean:
            Assert.IsFalse(payload.structural_budget.cap_reached, "cap_reached: matches ground truth (fresh player, cap not reached)");

            Assert.IsNotNull(payload.flag_review, "flag_review: parsed");
            Assert.IsFalse(payload.flag_review.auto_open, "auto_open: ground truth for a player with no flag-discipline state");

            Assert.IsNotNull(payload.settling_glance, "settling_glance: parsed");
            Assert.IsTrue(payload.settling_glance.all_clear, "all_clear: ground truth (nothing settling)");

            Assert.IsNotNull(payload.friction_glance, "friction_glance: parsed");
            Assert.IsFalse(string.IsNullOrEmpty(payload.friction_glance.friction_bucket),
                "friction_bucket: non-empty band — ALWAYS a real value, even for an untouched player (proves the sub-object was genuinely populated, not a JsonUtility default instance)");

            Assert.IsNotNull(payload.compression_glance, "compression_glance: parsed");
            Assert.IsFalse(string.IsNullOrEmpty(payload.compression_glance.stress_bucket), "stress_bucket: non-empty band");
            Assert.IsFalse(string.IsNullOrEmpty(payload.compression_glance.week_state), "week_state: non-empty enum value");

            Assert.IsNotNull(payload.onboarding, "onboarding: parsed");
            Assert.IsFalse(string.IsNullOrEmpty(payload.onboarding.funnel_step), "funnel_step: non-empty enum value");
            Assert.AreEqual("HOME_FIRST", payload.onboarding.funnel_step,
                "funnel_step: ground truth — first-ever session/open advances LAUNCH -> HOME_FIRST (W1.1-a C6)");

            // THE 12th key (design D3/§3-bis) — the one the dimensioning note is explicitly about.
            Assert.AreNotEqual(0, payload.opened_game_day,
                "opened_game_day: DISTINCT FROM ZERO — the language default AND the undimensioned value on a " +
                "non-tick base. This is the falsifiable that would catch the exact regression BLOCKING-1 named.");
            Assert.Greater(payload.opened_game_day, 0, "opened_game_day: a real, positive day count (epoch pinned to 1500 minutes)");
        }

        // C3-F2 (parité de forme) — le nombre de clés du DTO client ÉGALE celui de l'interface
        // serveur. Reflection sur le TYPE (jamais un motif texte) : un ajout côté serveur SANS ajout
        // côté client fait rougir CE test, sans jamais avoir besoin de recompter à la main.
        [Test]
        public void C3F2_ClientDtoFieldCount_EqualsServerInterfaceKeyCount_Twelve()
        {
            var fields = typeof(SessionOpenDto).GetFields(
                System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly);
            Assert.AreEqual(12, fields.Length,
                $"SessionOpenDto must declare EXACTLY the 12 keys `session-open-sequence.service.ts:229-251` " +
                $"declares (11 + opened_game_day, W3.U1 C2/D3) — found {fields.Length}: " +
                string.Join(", ", fields.Select(f => f.Name)));
        }

        // C3-F3 (l'enveloppe elle-même) — le corps réel porte 2 clés de premier niveau et les 12
        // sont au second niveau (`payload.data`). Épingle la structure qui, si elle changeait,
        // casserait silencieusement tous les écrans des 11 lots suivants.
        [UnityTest]
        public IEnumerator C3F3_Envelope_TwoTopLevelKeys_TwelveAtPayloadData()
        {
            string token = null;
            yield return SignUp((t, c) => token = t);

            using (UnityWebRequest req = new UnityWebRequest(BaseUrl + "/v1/session/open", UnityWebRequest.kHttpVerbPOST))
            {
                string body = JsonUtility.ToJson(new OpenSessionRequestDto { client_version = "e2e-w3u1-1.0.0" });
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + token);
                req.timeout = 10;
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"session/open failed: {req.error}");

                string raw = req.downloadHandler.text;
                // Top-level: EXACTLY {response_meta, payload} — a lightweight brace-count-free check
                // via the SAME JsonUtility path every client already trusts, cross-checked with a raw
                // string scan for the two known top-level key names (belt-and-braces on the literal body).
                Assert.IsTrue(raw.Contains("\"response_meta\""), "top-level key response_meta present in the RAW body");
                Assert.IsTrue(raw.Contains("\"payload\""), "top-level key payload present in the RAW body");

                var envelope = JsonUtility.FromJson<SessionOpenEnvelope>(raw);
                Assert.IsNotNull(envelope?.payload?.data, "the 12 keys live at payload.data, not the body root");

                // Prove the 12 keys are NOT at the body root: session_id must NOT be parseable as a
                // root-level field of a naive {session_id,...} shape — i.e. the envelope wrapper is
                // REQUIRED, a flat parse attempt finds nothing there.
                var flatAttempt = JsonUtility.FromJson<SessionOpenDto>(raw);
                Assert.IsTrue(string.IsNullOrEmpty(flatAttempt.session_id),
                    "a FLAT parse (ignoring the envelope) finds NO session_id — proving the 12 keys are nested under payload.data, not at the body root");
            }
        }
    }
}
