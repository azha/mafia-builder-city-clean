using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup)
using MafiaCleanCity.Tests;   // SeederSupport.RunDevPsql
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C4 (design §3 C4) — HighestLeverageCard + Commit/Skip.
    [Category("W3U1")]
    public class HighestLeverageCardControllerPlayModeTests
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
            string callsign = SeederSupport.SafeCallsign("c4", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u1-c4-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            onTokenAndCallsign(token, callsign);
        }

        private static void SeedSeveredRoute(string playerId)
        {
            string origin = SeederSupport.RunDevPsql(
                $"INSERT INTO \"buildings\" (\"player_id\",\"block_id\",\"building_type\",\"ownership\",\"structural_state\") " +
                $"VALUES ('{playerId}', 411, 1, 'player', 'operational') RETURNING building_id;");
            string dest = SeederSupport.RunDevPsql(
                $"INSERT INTO \"buildings\" (\"player_id\",\"block_id\",\"building_type\",\"ownership\",\"structural_state\") " +
                $"VALUES ('{playerId}', 412, 1, 'player', 'operational') RETURNING building_id;");
            SeederSupport.RunDevPsql(
                $"INSERT INTO \"route\" (\"player_id\",\"origin_building_id\",\"destination_building_id\",\"state\") " +
                $"VALUES ('{playerId}', '{origin}', '{dest}', 'severed');");
        }

        private HighestLeverageCardController NewBareController()
        {
            hostGo = new GameObject("HlCard");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<HighestLeverageCardController>();
        }

        // C4-F2 — carte nulle ⇒ l'écran rend l'état vide canonique, asserté PAR SA VALEUR (état
        // nommé), jamais par l'absence d'un objet.
        [Test]
        public void C4F2_NullCard_RendersNamedEmptyState_NotObjectAbsence()
        {
            var ctrl = NewBareController();
            ctrl.SetPayload("dummy-token", null, new StructuralBudgetDto { used = 0, cap_reached = false });
            Assert.AreEqual(HighestLeverageCardController.CardState.NoCard, ctrl.RenderedState,
                "a null card renders the NAMED NoCard state — a value, not merely 'nothing was set'");
            Assert.IsTrue(ctrl.RenderedTexts.Count > 0, "the empty state itself carries rendered text (not a blank screen)");
        }

        // C4-F3 — cap atteint ⇒ Commit refusé (côté client, ZÉRO requête tentée) et l'état
        // correspondant est porté. Scénario : les DEUX polarités du cap, sur le MÊME contrôleur.
        // Testé au niveau de la logique de décision cliente (DTOs synthétiques, contrôlés) — produire
        // une VRAIE carte STRUCTURELLE côté serveur exigerait de reproduire la sélection de provider
        // du gouverneur, hors périmètre de ce lot (voir implementation-notes.md § Deviations).
        [Test]
        public void C4F3_CapReached_RefusesCommit_BothPolarities_ClientSideZeroRequests()
        {
            var ctrl = NewBareController();
            var structuralCard = new HlCardDto
            {
                card_id = "synthetic-structural-card",
                decision_type_key = "SYNTHETIC_STRUCTURAL",
                impact_bucket = "major",
                urgency_bucket = "pressing",
                options = new DecisionOptionDto[0],
                structural = true,
            };

            // Polarity 1 — cap REACHED: Commit is refused, RenderedState says so BY VALUE.
            ctrl.SetPayload("dummy-token", structuralCard, new StructuralBudgetDto { used = 1, cap_reached = true });
            Assert.AreEqual(HighestLeverageCardController.CardState.CapBlocked, ctrl.RenderedState);
            // ⚠️ FRANÇAIS depuis la conversion i18n du 2026-09-03. Cette assertion épinglait un
            // libellé ANGLAIS sur un écran français — elle certifiait le défaut qu'elle croisait.
            // Le repli passé à `Libelle` est français ; tant que la clé manque au bundle, c'est ce
            // texte-là que le joueur voit, et donc celui qu'il faut épingler.
            Assert.IsTrue(ctrl.RenderedTexts.Contains("Limite de structure atteinte"));

            // Polarity 2 — cap NOT reached: the SAME structural card is Available.
            ctrl.SetPayload("dummy-token", structuralCard, new StructuralBudgetDto { used = 0, cap_reached = false });
            Assert.AreEqual(HighestLeverageCardController.CardState.Available, ctrl.RenderedState);
        }

        // Canon (global_conventions_core.md:129-138) — l'alternative typed-confirm est OBLIGATOIRE
        // (F2, accessibilité), pas un bonus. Un mot-clé FAUX ou vide n'émet AUCUNE requête (même
        // discipline "un tap simple ne confirme jamais" appliquée à la saisie) ; le mot-clé EXACT
        // (insensible à la casse) route vers LE MÊME RequestCommit() que le long-press — un seul
        // comportement, deux déclencheurs, jamais deux chemins de requête qui pourraient diverger.
        [UnityTest]
        public IEnumerator TypedConfirm_WrongKeywordEmitsZero_CorrectKeywordRoutesToTheSameRequestCommit()
        {
            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            SeedSeveredRoute(playerId);

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u1-c4-typed", dto => payload = dto, (c, m) => Assert.Fail($"{c}: {m}"));
            Assert.IsNotNull(payload?.hl_card);

            var ctrl = NewBareController();
            ctrl.SetPayload(token, payload.hl_card, payload.structural_budget);

            Assert.AreEqual(0, ctrl.CommitRequestCount);
            yield return ctrl.RequestCommitViaTypedConfirm("");
            Assert.AreEqual(0, ctrl.CommitRequestCount, "an EMPTY keyword emits zero requests");
            yield return ctrl.RequestCommitViaTypedConfirm("nope");
            Assert.AreEqual(0, ctrl.CommitRequestCount, "a WRONG keyword emits zero requests");

            yield return ctrl.RequestCommitViaTypedConfirm("commit"); // case-insensitive
            Assert.AreEqual(1, ctrl.CommitRequestCount, "the CORRECT keyword routes to RequestCommit() — exactly one request");
            Assert.IsNull(ctrl.LastCommitError, $"commit errored: {ctrl.LastCommitError}");
            Assert.AreEqual(true, ctrl.LastCommitCommitted, "committed through the SAME payload.data path as the long-press trigger");
        }

        // C4-F1 (à travers l'enveloppe aussi, via C4-F4) — un tap simple n'émet AUCUNE requête ;
        // l'appui long complet en émet EXACTEMENT une. On COMPTE les requêtes, les deux gestes dans
        // le même test. C4-F4 — Commit et Skip émettent de VRAIES requêtes lues via payload.data.
        [UnityTest]
        public IEnumerator C4F1_C4F4_TapEmitsZero_LongPressEmitsExactlyOne_ThroughEnvelope_CommitAndSkip()
        {
            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            Assert.IsTrue(SeederSupport.IsUuid(playerId), $"resolved a real player_id: '{playerId}'");
            SeedSeveredRoute(playerId); // -> a REAL, non-structural hl_card (SEVERED_ROUTE_REBUILD, advisory)

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u1-c4", dto => payload = dto, (c, m) => Assert.Fail($"{c}: {m}"));
            Assert.IsNotNull(payload?.hl_card, "a real, non-null hl_card via the severed-route seed");
            Assert.IsFalse(payload.hl_card.structural, "sanity: SEVERED_ROUTE_REBUILD is advisory (design §1.3.e row 6) — cap does not gate it");

            var ctrl = NewBareController();
            ctrl.SetPayload(token, payload.hl_card, payload.structural_budget);
            Assert.AreEqual(HighestLeverageCardController.CardState.Available, ctrl.RenderedState);

            // ---- Skip: a plain tap — a REAL request, exactly one, response through payload.data. ----
            Assert.AreEqual(0, ctrl.SkipRequestCount);
            yield return ctrl.RequestSkip();
            Assert.AreEqual(1, ctrl.SkipRequestCount, "Skip emitted EXACTLY one request");
            Assert.IsNull(ctrl.LastSkipError, $"skip errored: {ctrl.LastSkipError}");
            Assert.AreEqual(true, ctrl.LastSkipSkipped, "skip response.data.skipped read through payload.data");

            // ---- Commit, on a FRESH card (the one just skipped is now terminal) — re-seed. ----
            SeedSeveredRoute(playerId);
            payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u1-c4-2", dto => payload = dto, (c, m) => Assert.Fail($"{c}: {m}"));
            Assert.IsNotNull(payload?.hl_card, "a second real hl_card after re-seeding");
            ctrl.SetPayload(token, payload.hl_card, payload.structural_budget);

            // A SHORT TAP must emit ZERO requests (the long-press gate is not merely decorative).
            Assert.AreEqual(0, ctrl.CommitRequestCount);
            ctrl.CommitButton.SimulateShortTap();
            yield return null;
            Assert.AreEqual(0, ctrl.CommitRequestCount, "a short tap NEVER emits a commit request");

            // A COMPLETED long press emits EXACTLY one — a REAL request, through payload.data.
            // SimulateCompletedLongPress fires OnLongPressCompleted synchronously, whose listener
            // does `StartCoroutine(RequestCommit())` — Unity runs a started coroutine SYNCHRONOUSLY
            // up to its first `yield`, so CommitRequestCount++ (before RequestCommit's own `yield
            // return client.Commit(...)`) is already visible right after this call. The REAL HTTP
            // round-trip inside client.Commit is NOT synchronous though — wait for it explicitly
            // (a couple of frames is not enough for an actual network round-trip in batchmode).
            ctrl.CommitButton.SimulateCompletedLongPress();
            Assert.AreEqual(1, ctrl.CommitRequestCount, "a completed long press emits EXACTLY one commit request (synchronous up to the first yield)");
            float waited = 0f;
            while (ctrl.LastCommitCommitted == null && ctrl.LastCommitError == null && waited < 10f)
            {
                yield return null;
                waited += Time.unscaledDeltaTime;
            }
            Assert.IsNull(ctrl.LastCommitError, $"commit errored: {ctrl.LastCommitError}");
            Assert.AreEqual(true, ctrl.LastCommitCommitted, "commit response.data.committed read through payload.data");

            // Firing the SAME completed gesture again must NOT double-count (LongPressButton fires once per press).
            ctrl.CommitButton.SimulateShortTap(); // a distinct, later gesture — still zero-effect (already committed/terminal card)
            yield return null;
            Assert.AreEqual(1, ctrl.CommitRequestCount, "a later short tap still emits nothing");
        }
    }
}
