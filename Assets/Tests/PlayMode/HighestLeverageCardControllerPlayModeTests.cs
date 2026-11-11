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
        private static string BaseUrl => MafiaCleanCity.AdresseDuBack.Url;   // la source du shell (garde de classe, 26/09)
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

        // B6 (passe UX 2026-09-24) — toucher la SURFACE de la carte lève `OnOuvrirDetail` (que le shell écoute pour monter ⑤) ;
        // sans carte, rien. Aucune requête : la carte est synthétique, sans jeton.
        [Test]
        public void B6_ToucherLaSurface_DemandeLeDetail_SeulementAvecUneCarte()
        {
            var ctrl = NewBareController();
            int demandes = 0;
            ctrl.OnOuvrirDetail += () => demandes++;
            Assert.IsNotNull(ctrl.SurfaceButton, "la surface porte un bouton");

            ctrl.SetPayload(null, null, new StructuralBudgetDto { cap_reached = false });
            ctrl.SurfaceButton.onClick.Invoke();
            Assert.AreEqual(0, demandes, "sans carte, le toucher n'ouvre rien");

            ctrl.SetPayload(null, new HlCardDto { card_id = "synthetic-card", decision_type_key = "hl.test", impact_bucket = "minor",
                                                  urgency_bucket = "low", options = new DecisionOptionDto[0] },
                            new StructuralBudgetDto { cap_reached = false });
            ctrl.SurfaceButton.onClick.Invoke();
            Assert.AreEqual(1, demandes, "avec une carte, le toucher de la surface demande le détail ⑤");
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

            yield return ctrl.RequestCommitViaTypedConfirm(ctrl.MotCle.ToLowerInvariant()); // case-insensitive ; le mot-clé = le libellé du geste touché (08/10 nuit ; chunk 3 : SON option)
            Assert.AreEqual(1, ctrl.CommitRequestCount, "the CORRECT keyword routes to RequestCommit() — exactly one request");
            Assert.IsNull(ctrl.LastCommitError, $"commit errored: {ctrl.LastCommitError}");
            Assert.AreEqual(true, ctrl.LastCommitCommitted, "committed through the SAME payload.data path as the long-press trigger");
            // ⛔ GESTE MORT fermé (f2 08/10 nuit) : le commit ACCEPTÉ est annoncé au shell (qui relit l'Accueil) — une fois, aucun refus montré.
            Assert.AreEqual(1, ctrl.DecisionsTranchees, "le commit accepté lève OnDecisionTranchee (le shell relit l'Accueil)");
            Assert.IsNull(ctrl.RefusRendu, "aucun refus après un commit accepté");
            // L'APRÈS-GESTE (chunk 3) : quand le back SERT le mot (`outcome_i18n_key`), ④ lève `OnApresGeste` (le shell monte ⑤ en mode après : cadres 6-7) et n'annonce pas
            // `OnDecisionTranchee` (⑤ l'annoncera au « Retour à l'accueil ») ; tant qu'il ne le sert pas, elle remonte tout de suite.
            if (ctrl.DerniereVue != null)
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(ctrl.DerniereVue.Mot), "l'après-geste dit un mot SERVI");
                Assert.IsFalse(string.IsNullOrWhiteSpace(ctrl.DerniereVue.Action), "« Retour à l'accueil » est le geste de la ligne-or");
            }
            // …et un REFUS se dit : la même carte, déjà tranchée (terminale), rend 409 — la phrase est MONTRÉE, jamais une erreur muette.
            yield return ctrl.RequestCommitViaTypedConfirm(ctrl.MotCle);
            Assert.IsNotNull(ctrl.LastCommitError, "précondition : la carte déjà tranchée est refusée par le back (409)");
            Assert.AreEqual(1, ctrl.DecisionsTranchees, "un refus n'annonce AUCUNE décision");
            Assert.IsFalse(string.IsNullOrEmpty(ctrl.RefusRendu), "le refus a une phrase");
            CollectionAssert.Contains(ctrl.RenderedTexts, ctrl.RefusRendu, "la phrase du refus est RENDUE sur la carte");
        }

        private static string EtatDeLaRoute(string playerId) =>
            SeederSupport.RunDevPsql($"SELECT state FROM route WHERE player_id = '{playerId}';");

        /// <summary>CHUNK 3 — `chosen_option:0` AGIT VRAIMENT contre le vrai back, et l'EFFET est lu AU BACK (psql), pas seulement le 200 :
        /// la route coupée du joueur passe de `severed` à `active`. TÉMOIN : le MÊME geste avec l'option 1 (laisser) rend `noted` et la route reste `severed` — sans lui, un back qui
        /// répare toujours (ou jamais) passerait pour correct. DÉTECTEUR (f2 11/11) : sur le bundle SERVI par la pile (pas celui du design), la 2ᵉ pose de la même carte rend
        /// 409 `already_resolved` et la vue est « C’était déjà tranché » (cadre 6, pastille, pas de tampon neuf), jamais le cadre 7 ; les phrases d'après-geste servies se résolvent.</summary>
        [UnityTest]
        public IEnumerator ChosenOption0_Agit_EffetLuAuBack_Temoin_Option1_Et_DetecteurAlreadyResolved_SurLeBundleServi()
        {
            try
            {
                string tokenA = null, callsignA = null;
                yield return SignUp((t, c) => { tokenA = t; callsignA = c; });
                string playerA = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsignA}';");
                SeedSeveredRoute(playerA);
                Assert.AreEqual("severed", EtatDeLaRoute(playerA), "précondition : la route est coupée avant le geste");

                var sessionClient = new SessionClient { BaseUrl = BaseUrl };
                SessionOpenDto payloadA = null;
                yield return sessionClient.OpenSession(tokenA, "e2e-w3u1-c3-agir", dto => payloadA = dto, (c, m) => Assert.Fail($"{c}: {m}"));
                Assert.IsNotNull(payloadA?.hl_card);
                Assert.AreEqual("SEVERED_ROUTE_REBUILD", payloadA.hl_card.decision_type_key);

                var ctrl = NewBareController();
                ctrl.SetPayload(tokenA, payloadA.hl_card, payloadA.structural_budget);
                Assert.AreEqual(2, payloadA.hl_card.options.Length, "la carte réelle sert deux options");
                Assert.AreEqual(2, ctrl.LibellesDesBoutons.Count, "DEUX gestes (agir, laisser) sur une carte de décision à deux options (TD-724 livré)");
                yield return ctrl.RequestCommit(HlCardClient.OptionAgir);
                Assert.IsNull(ctrl.LastCommitError, $"commit errored: {ctrl.LastCommitError}");
                CommitResponseDto d = ctrl.DerniereReponse;
                Assert.IsNotNull(d);
                Assert.AreEqual("executed", d.outcome, "option 0 : le geste AGIT");
                Assert.AreEqual(1, d.executed_ids.Length, "une cible exécutée");
                Assert.AreEqual("hl.outcome.severed_route.executed", d.outcome_i18n_key);
                Assert.AreEqual("active", EtatDeLaRoute(playerA), "EFFET lu au back : la route a été réparée (severed → active)");

                // TÉMOIN — l'option 1 (laisser) n'agit PAS : noted, aucune cible exécutée, la route reste coupée
                string tokenB = null, callsignB = null;
                yield return SignUp((t, c) => { tokenB = t; callsignB = c; });
                string playerB = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsignB}';");
                SeedSeveredRoute(playerB);
                SessionOpenDto payloadB = null;
                yield return sessionClient.OpenSession(tokenB, "e2e-w3u1-c3-laisser", dto => payloadB = dto, (c, m) => Assert.Fail($"{c}: {m}"));
                HighestLeverageCardController ctrlB = NewBareController();
                ctrlB.SetPayload(tokenB, payloadB.hl_card, payloadB.structural_budget);
                yield return ctrlB.RequestCommit(HlCardClient.OptionLaisser);
                Assert.IsNull(ctrlB.LastCommitError, $"commit errored: {ctrlB.LastCommitError}");
                Assert.AreEqual("noted", ctrlB.DerniereReponse.outcome);
                Assert.AreEqual(0, ctrlB.DerniereReponse.executed_ids.Length);
                Assert.AreEqual("severed", EtatDeLaRoute(playerB), "témoin : l'option 1 ne touche pas la route — sinon l'effet de l'option 0 ne prouverait rien");

                // DÉTECTEUR sur le bundle SERVI par la pile
                MafiaCleanCity.I18n.I18nCatalog.Oublier();
                yield return MafiaCleanCity.I18n.I18nCatalog.Amorcer(new MafiaCleanCity.I18n.I18nClient { BaseUrl = BaseUrl }, tokenA);
                Assert.IsTrue(MafiaCleanCity.I18n.I18nCatalog.Connait("error.hl_card.already_resolved"), "le bundle SERVI porte la clé du 409 (back @35bdd6cb)");
                Assert.AreEqual("Le chantier de la route est lancé et payé. Les livraisons repassent à la fin des travaux.",
                    ApresGesteHl.Mot(d, payloadA.hl_card.target_count), "la phrase d'après-geste SERVIE se résout avec n");
                Assert.AreEqual("Rien ne bouge. On en reparlera si ça empire.", ApresGesteHl.Mot(ctrlB.DerniereReponse, payloadB.hl_card.target_count));

                ctrl.SetPayload(tokenA, payloadA.hl_card, payloadA.structural_budget);   // la MÊME carte, désormais tranchée côté back
                yield return ctrl.RequestCommit(HlCardClient.OptionAgir);
                Assert.IsNotNull(ctrl.LastCommitError, "précondition : la carte déjà tranchée est refusée (409)");
                ApresGesteHl.VueApres v = ctrl.DerniereVue;
                Assert.IsNotNull(v, "un refus dont la clé est SERVIE lève l'après-geste");
                Assert.AreEqual(ApresGesteHl.Issue.DejaTranchee, v.Issue, "409 already_resolved SERVI : « déjà tranché », jamais « La carte reste sur la table »");
                Assert.AreEqual("C’était déjà tranché", v.Grave);
                Assert.IsTrue(v.Deja); Assert.IsFalse(v.Tampon); Assert.IsNull(v.Mot);
            }
            finally { MafiaCleanCity.I18n.I18nCatalog.Oublier(); }
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
            ctrl.LaisserButton.SimulateShortTap();
            ctrl.AgirButton.SimulateShortTap();
            yield return null;
            Assert.AreEqual(0, ctrl.CommitRequestCount, "a short tap NEVER emits a commit request (ni sur LAISSER ni sur AGIR)");

            // A COMPLETED long press emits EXACTLY one — a REAL request, through payload.data.
            // SimulateCompletedLongPress fires OnLongPressCompleted synchronously, whose listener
            // does `StartCoroutine(RequestCommit())` — Unity runs a started coroutine SYNCHRONOUSLY
            // up to its first `yield`, so CommitRequestCount++ (before RequestCommit's own `yield
            // return client.Commit(...)`) is already visible right after this call. The REAL HTTP
            // round-trip inside client.Commit is NOT synchronous though — wait for it explicitly
            // (a couple of frames is not enough for an actual network round-trip in batchmode).
            ctrl.LaisserButton.SimulateCompletedLongPress();   // LAISSER (option 1) : le commit d'avant, déterministe ; AGIR dépense — jouée au créneau contre la pile
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
            ctrl.LaisserButton.SimulateShortTap(); // a distinct, later gesture — still zero-effect (already committed/terminal card)
            yield return null;
            Assert.AreEqual(1, ctrl.CommitRequestCount, "a later short tap still emits nothing");
        }
    }
}
