using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInteriorDto, DemoIdentityResolver
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport

namespace MafiaCleanCity.CityMap.Tests
{
    // Surcharge d'identité de démo par éditeur (ruling user 2026-08-30 : « oui, livre-le »).
    //
    // ⛔⛔ NON EXÉCUTÉ — CONTRAINTE MACHINE (2026-08-30) : un gate E2E à 5 shards tournait ET
    // l'éditeur de l'user était ouvert sur ce dossier (verrou de projet) au moment où ce fichier a
    // été écrit. Le contrôleur a explicitement demandé qu'AUCUN run, d'aucune sorte, ne soit lancé
    // pendant cette session — cette falsifiable est donc ÉCRITE et NON LANCÉE. La vérification est
    // une SECONDE PHASE, déclenchée par le contrôleur quand la machine sera libre. Rien n'a été
    // affirmé "vert" ici — seule la LECTURE du code réel (game-back, cité ligne par ligne ci-dessous)
    // a servi à dériver les préconditions (montant du kit de départ, prix d'acquisition, forme du
    // corps de requête) — jamais une supposition.
    //
    // RONDE 2 (revue ⊥, 2026-08-30, NOT_APPROVED 2 BLOCKING/3 IMPORTANT/7 MINOR) — MÊME CONTRAINTE
    // MACHINE, re-vérifiée : toujours aucun run possible, toujours ÉCRIT et NON LANCÉ. Ajoute
    // `SameAccount_SecondStructuralDecisionInSameSession_Gets409` (I1) : sans elle,
    // `TwoDistinctAccounts_EachOneStructuralDecision_NeitherGets409` est vrai PAR ARITHMÉTIQUE (deux
    // comptes, une décision chacune, plafond 1 — `AreNotEqual(409, …)` ne peut pas rougir), y
    // compris dans le monde où le plafond ne s'arme jamais. Corrige aussi 3 ancres décalées d'un
    // cran (m2/m3) et un chemin de fichier incomplet (m4) — voir chaque site cité.
    //
    // CE QUE CE TEST PROUVE : l'incident du 2026-08-21 (59/59 → 0/59) venait de deux éditeurs
    // PARTAGEANT un compte, donc partageant une `gameplay_sessions` active, donc partageant le
    // plafond "1 décision structurelle par session" du gouverneur
    // (StructuralDecisionGovernorService.commit, services/game-back/src/progression/loop10/
    // structural-decision-governor.service.ts:86 : `enforcementGate = activeSession !== null ||
    // …` — revue ⊥ m2, ancre corrigée). Avec DEUX COMPTES DISTINCTS (ce que `DemoIdentityResolver`
    // permet à deux éditeurs
    // d'obtenir via des variables d'environnement différentes), chaque compte a sa PROPRE
    // `gameplay_sessions` et son PROPRE compteur `structural_decisions_this_session` — le plafond de
    // l'un ne peut structurellement pas affecter l'autre. Ce test le vérifie EN VRAI, contre le back
    // réel (charter 27, no-mock-DB) : deux comptes frais, chacun ouvre une session ACTIVE (condition
    // EXACTE qui active le plafond — sans elle la mutation serait session-less et ne prouverait
    // rien, D9), chacun tente UNE décision structurelle (BUILDING_ACQUISITION,
    // `POST /v1/operational/building/purchase` — real-estate.controller.ts:89-105), et AUCUN des
    // deux ne doit recevoir 409.
    //
    // Fixture : rétablit son PROPRE régime (`session/close` juste après le sign-in, AVANT
    // `session/open`) — jamais supposer le régime hérité d'un test antérieur du MÊME assembly
    // PlayMode. C'est EXACTEMENT le correctif déjà en place dans
    // Tools/seed_operational_demo.mjs:369-389 (même endpoint player-facing réel, pas un raccourci
    // `_test`, pas un bypass SQL) — root-cause historique de l'incident : une `gameplay_sessions`
    // row laissée active par un test EARLIER (ex. HudPlayModeTests) faisait 409 le test suivant sur
    // le compte PARTAGÉ. Ici les comptes sont frais (jamais de session antérieure possible) — l'appel
    // est fait quand même, pour que ce test reste correct le jour où il serait réutilisé sur un
    // compte PERSISTANT (le résolveur n'exige pas un compte frais).
    //
    // Préconditions dérivées PAR LECTURE du code back (jamais supposées) :
    //   - kit de départ : $10,000 (WELCOME_GRANT_CASH_CENTS = 1_000_000n, auth.service.ts:150),
    //     accordé à un compte FRAIS via signup, ZÉRO debit (le kit de 4 bâtiments est gratuit — D6,
    //     onboarding-grant.service.ts:323-324 : "no economy_states reference anywhere" — revue ⊥ m3,
    //     décalage d'un cran corrigé).
    //   - prix d'acquisition d'un type NON-lab/NON-refinery (multiplicateur 1.0,
    //     operational/real_estate/conversion-tunables.ts:299-306) : round(0.5 × 15000$ × 100) =
    //     750,000 cents = $7,500 (operational/real_estate/conversion-tunables.ts:87-91
    //     base_cost_standard_min=15000 ; :195 acquisition_cost_ratio défaut 0.5 ; :335
    //     acquisitionPriceCents — revue ⊥ m4, répertoire ajouté). $10,000 > $7,500 → l'achat doit
    //     réussir.
    //   - "dealer_spot_front" est un type M1 valide (liste exacte de l'erreur de validation,
    //     real-estate.service.ts:242, revue ⊥ m3) et N'EST PAS l'un des 4 types déjà accordés
    //     gratuitement (lab/stash/front_shop/cash_safehouse, onboarding-grant.service.ts:121-124) —
    //     un choix qui évite toute ambiguïté sur "type déjà possédé".
    //   - un bloc LIBRE se calcule PAR JOUEUR (real-estate.repository.ts:151-171,
    //     isBlockFreeForPlayer : `eq(building.player_id, playerId)` — la géographie `blocks` est
    //     globale au district, mais la propriété est scopée par joueur) : le district 16 (Verge-A,
    //     onboarding-grant.service.ts:112, précédent :
    //     DistrictSocleFootprintPlayModeTests.VergeADistrictId) a plus de blocs que les 4 déjà
    //     occupés par CE joueur — le premier `blocks[].block_id` absent de `buildings[].block_id` de
    //     CE joueur est donc libre POUR LUI, quels que soient les autres joueurs du même district
    //     (district-interior.repository.ts:119-140 : `listPlayerBuildings` est scopé `player_id`).
    [Category("DemoIdentity")]
    public class DemoIdentityTwoAccountsPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int VergeADistrictId = 16; // onboarding-grant.service.ts:112 — starter kit, profile "verge"
        private const string PurchaseBuildingTypeTarget = "dealer_spot_front"; // M1 valide, PAS un des 4 du kit
        private static int callsignSeq;

        /// <summary>Crée un compte FRAIS (charter 27 — own precondition, no shared state) PUIS
        /// signe à travers `DemoIdentityResolver.ResolveAndSignIn` — le SEUL chemin de production
        /// autorisé (voir DemoIdentityResolverGuardPlayModeTests) — via une variable d'environnement
        /// FABRIQUÉE pour CE test, jamais MAFIA_DEMO_IDENTIFIER/MAFIA_CITYMAP_IDENTIFIER eux-mêmes.
        /// Le fallback passé est délibérément UNE IDENTITÉ QUI N'EXISTE PAS : si le résolveur
        /// ignorait la variable d'environnement et retombait sur le fallback (le bug que ce lot
        /// corrige), le sign-in échouerait et ce helper ferait échouer le test — ce qui fait de cet
        /// appel un contrôle POSITIF du résolveur, pas seulement un moyen d'obtenir un jeton.</summary>
        private static IEnumerator ResolveSignInFreshAccount(string tag, string envIdVar, string envPwVar,
            Action<string> onToken)
        {
            string callsign = SeederSupport.SafeCallsign(tag, ref callsignSeq);
            string password = tag + "-pw";

            var signupAuth = new AuthClient { BaseUrl = BaseUrl };
            string signupErr = null;
            yield return signupAuth.SignUp(callsign, password, t => { }, e => signupErr = e);
            Assert.IsNull(signupErr, $"[{tag}] signup errored: {signupErr}");

            Environment.SetEnvironmentVariable(envIdVar, callsign);
            Environment.SetEnvironmentVariable(envPwVar, password);
            try
            {
                var auth = new AuthClient { BaseUrl = BaseUrl };
                string token = null, err = null;
                yield return DemoIdentityResolver.ResolveAndSignIn(auth, envIdVar, envPwVar,
                    "demo-identity-resolver-fallback-should-never-be-reached@example.test",
                    "unreachable-fallback-pw",
                    t => token = t, e => err = e);
                Assert.IsNull(err,
                    $"[{tag}] resolved sign-in errored: {err} — si le résolveur était retombé sur le " +
                    "fallback (qui n'existe pas), c'est EXACTEMENT ce que cette assertion attraperait.");
                Assert.IsFalse(string.IsNullOrEmpty(token), $"[{tag}] resolved sign-in returned no token");
                onToken(token);
            }
            finally
            {
                Environment.SetEnvironmentVariable(envIdVar, null);
                Environment.SetEnvironmentVariable(envPwVar, null);
            }
        }

        /// <summary>`POST /v1/session/close` (session.controller.ts) — idempotent, `{closed:false}`
        /// si aucune session n'était active. Le MÊME endpoint player-facing que
        /// Tools/seed_operational_demo.mjs:387 appelle, jamais un raccourci `_test` ni un bypass
        /// SQL. La fixture l'appelle INCONDITIONNELLEMENT, juste après le sign-in — jamais supposer
        /// le régime hérité (voir le docstring de la classe).</summary>
        private static IEnumerator SessionClose(string tag, string token)
        {
            string url = $"{BaseUrl}/v1/session/close";
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + token);
                req.timeout = 15;
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result,
                    $"[{tag}] session/close failed (idempotent endpoint — should always 200): " +
                    $"http={req.responseCode} {req.error}");
            }
        }

        /// <summary>POST /purchase body — mirrors real-estate.controller.ts's `PurchaseBody`
        /// (block_id, building_type_target) field-for-field, REUSE of the JsonUtility idiom every
        /// client/DTO in this project shares (AuthClient.SigninRequestDto, SessionDtos.
        /// OpenSessionRequestDto) rather than a hand-built JSON string.</summary>
        [Serializable]
        private class PurchaseRequestDto
        {
            public int block_id;
            public string building_type_target;
        }

        /// <summary>`POST /v1/operational/building/purchase` — pas de client de production pour cet
        /// appel (aucun contrôleur Unity n'achète de bâtiment aujourd'hui), donc un appel brut ici,
        /// à l'identique du patron déjà établi pour un endpoint sans client
        /// (LieutenantRuleEditorPlayModeTests.Advance, l'appel `/v1/_test/citysim/advance`).
        /// `onOutcome(success, httpCode)` — httpCode reste -1 en cas de succès réseau franc (même
        /// convention que `CityProjectionsClient`'s `missing` callback ailleurs dans ce
        /// fichier).</summary>
        private static IEnumerator PurchaseBuilding(string tag, string token, int blockId,
            Action<bool, long> onOutcome)
        {
            string url = $"{BaseUrl}/v1/operational/building/purchase";
            string body = JsonUtility.ToJson(new PurchaseRequestDto
            {
                block_id = blockId,
                building_type_target = PurchaseBuildingTypeTarget,
            });
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + token);
                req.timeout = 15;
                yield return req.SendWebRequest();

                bool ok = req.result == UnityWebRequest.Result.Success;
                if (!ok)
                {
                    Debug.LogWarning($"[{tag}] purchase failed: http={req.responseCode} " +
                        $"body={req.downloadHandler?.text} {req.error}");
                }
                onOutcome(ok, ok ? -1L : req.responseCode);
            }
        }

        /// <summary>Le corps du scénario pour UN compte : fixture (session/close) → session/open
        /// (établit la session ACTIVE — la précondition EXACTE qui arme le plafond du gouverneur,
        /// D9) → découvre un bloc libre POUR CE JOUEUR dans son district de départ (Verge-A) →
        /// tente UNE décision structurelle (achat). `onOutcome` reçoit (succès, code HTTP —
        /// -1 si succès réseau franc).</summary>
        // ⛔⛔ `client_version` EST UN varchar(32) CÔTÉ BACK (sessions_and_audit.ts:47) — et le back
        //    répond 500 UNHANDLED, pas 400, quand on le dépasse. Mesuré le 2026-08-31, au tout
        //    premier run de ce lot : `"e2e-demo-identity-one-session-cap"` fait **33** caractères,
        //    un de trop, et le test échouait sur `session/open failed: 500` — un message qui ne
        //    nomme NI la colonne NI la longueur. Les 20 autres sites d'appel du dépôt tiennent tous
        //    sous 30, donc rien ne l'avait jamais révélé.
        // ⇒ La garde ci-dessous vise la PROPRIÉTÉ (toute étiquette envoyée par ce fichier tient dans
        //    la colonne), jamais l'instance corrigée — sinon la prochaine étiquette la rouvrira.
        private const int ClientVersionMaxLen = 32;   // = varchar(32), back sessions_and_audit.ts:47

        [Test]
        public void ClientVersionLabels_FitTheBackColumn_ElseSessionOpenReturns500Unhandled()
        {
            string src = System.IO.File.ReadAllText(System.IO.Path.Combine(
                UnityEngine.Application.dataPath, "Tests/PlayMode/DemoIdentityTwoAccountsPlayModeTests.cs"));
            var labels = System.Text.RegularExpressions.Regex.Matches(src, @"OpenSession\([^,]+,\s*""([^""]+)""");
            Assert.Greater(labels.Count, 0,
                "anti-vacuité : si ce motif ne trouve plus aucune étiquette, la garde ne mesure RIEN " +
                "et resterait verte quelle que soit leur longueur.");
            foreach (System.Text.RegularExpressions.Match m in labels)
            {
                string label = m.Groups[1].Value;
                Assert.LessOrEqual(label.Length, ClientVersionMaxLen,
                    $"'{label}' fait {label.Length} caractères — la colonne client_version en accepte " +
                    $"{ClientVersionMaxLen}. Le back rend 500 UNHANDLED (pas 400) au-delà.");
            }
        }

        private static IEnumerator OpenSessionThenOneStructuralDecision(string tag, string token,
            Action<bool, long> onOutcome)
        {
            yield return SessionClose(tag, token);

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto sessionDto = null;
            string sessionErr = null;
            yield return sessionClient.OpenSession(token, "e2e-demo-identity-two-accounts",
                dto => sessionDto = dto, (c, m) => sessionErr = $"{c}: {m}");
            Assert.IsNull(sessionErr, $"[{tag}] session/open failed: {sessionErr}");
            Assert.IsNotNull(sessionDto,
                $"[{tag}] session/open must succeed — it also grants the starter kit (4 buildings + " +
                "$10,000, auth.service.ts:150) that the purchase below relies on.");

            var projections = new CityProjectionsClient { BaseUrl = BaseUrl };
            DistrictInteriorDto interior = null;
            long interiorErrCode = -1;
            yield return projections.Interior(VergeADistrictId, token,
                d => interior = d, code => interiorErrCode = code);
            Assert.AreEqual(-1, interiorErrCode, $"[{tag}] district interior fetch failed, code {interiorErrCode}");
            Assert.IsNotNull(interior, $"[{tag}] interior payload was null");
            Assert.IsNotNull(interior.blocks, $"[{tag}] interior.blocks was null");
            Assert.IsNotNull(interior.buildings, $"[{tag}] interior.buildings was null");

            var occupiedByMe = new HashSet<int>(interior.buildings.Select(b => b.block_id));
            // Anti-vacuité : le district doit offrir au moins un bloc AU-DELÀ des 4 du kit de départ
            // pour CE joueur — sinon `.First()` jette bruyamment (jamais un succès silencieux à vide).
            Assert.Greater(interior.blocks.Length, occupiedByMe.Count,
                $"[{tag}] district {VergeADistrictId} n'offre aucun bloc libre au-delà du kit de " +
                "départ pour ce joueur — le scénario ne peut pas être dimensionné tel quel.");
            int freeBlockId = interior.blocks.Select(b => b.block_id).First(id => !occupiedByMe.Contains(id));

            yield return PurchaseBuilding(tag, token, freeBlockId, onOutcome);
        }

        [UnityTest]
        public IEnumerator TwoDistinctAccounts_EachOneStructuralDecision_NeitherGets409()
        {
            string tokenA = null, tokenB = null;
            yield return ResolveSignInFreshAccount("twoacta",
                "MAFIA_DEMO_IDENTITY_TEST_TWOACCT_A_ID", "MAFIA_DEMO_IDENTITY_TEST_TWOACCT_A_PW",
                t => tokenA = t);
            yield return ResolveSignInFreshAccount("twoactb",
                "MAFIA_DEMO_IDENTITY_TEST_TWOACCT_B_ID", "MAFIA_DEMO_IDENTITY_TEST_TWOACCT_B_PW",
                t => tokenB = t);

            Assert.AreNotEqual(tokenA, tokenB,
                "deux comptes DISTINCTS doivent produire deux jetons distincts — sinon ce test " +
                "reproduirait par accident l'incident qu'il est censé réfuter.");

            bool okA = false; long codeA = -2;
            yield return OpenSessionThenOneStructuralDecision("twoacta", tokenA,
                (ok, code) => { okA = ok; codeA = code; });

            bool okB = false; long codeB = -2;
            yield return OpenSessionThenOneStructuralDecision("twoactb", tokenB,
                (ok, code) => { okB = ok; codeB = code; });

            Assert.AreNotEqual(409, codeA,
                "[compte A] ne doit JAMAIS recevoir 409 STRUCTURAL_CAP_EXHAUSTED — c'est EXACTEMENT " +
                "l'incident du 2026-08-21 (deux éditeurs partageant UN compte, donc UNE session, " +
                "donc UN plafond).");
            Assert.AreNotEqual(409, codeB, "[compte B] idem.");
            Assert.IsTrue(okA,
                $"[compte A] la décision structurelle doit RÉUSSIR (code={codeA}) — un échec pour " +
                "une autre raison (fonds insuffisants, bloc invalide) ne prouverait rien du " +
                "gouverneur ; c'est pourquoi les préconditions ci-dessus sont dérivées du code réel, " +
                "pas supposées.");
            Assert.IsTrue(okB, $"[compte B] idem (code={codeB}).");
        }

        /// <summary>Revue ⊥ I1 — garde de CAPACITÉ, ajoutée en RONDE 2 : sans elle,
        /// `TwoDistinctAccounts_EachOneStructuralDecision_NeitherGets409` ci-dessus est vrai PAR
        /// ARITHMÉTIQUE (deux comptes distincts, UNE décision chacune, plafond 1 : `AreNotEqual(409,
        /// …)` ne peut structurellement pas rougir) — y compris dans le monde dégénéré où le plafond
        /// ne s'arme JAMAIS (`session/open` qui n'ouvre pas de session active, une route non
        /// enveloppée par le gouverneur). Un vert serait alors indiscernable d'un vert de
        /// non-armement. Cette garde le distingue : MÊME compte, UNE session, DEUX décisions
        /// structurelles — la première DOIT réussir, la seconde DOIT recevoir 409
        /// STRUCTURAL_CAP_EXHAUSTED (`one_decision_structural_per_session_cap`, défaut 1,
        /// `core-loops-tunables.ts:428-431` ; armé si une session active existe,
        /// `structural-decision-governor.service.ts:86` ; le compteur est remis à 0 à CHAQUE
        /// `session/open`, `session.repository.ts:183` — donc deux achats dans LA MÊME session,
        /// sans fermeture entre eux, épuisent bien le plafond).
        ///
        /// Dimensionnement — DEUX blocs libres nécessaires, pas un : Verge-A (district 16) a
        /// `block_count = 30 + ((16*7) % 51) = 40` blocs (`0016_world_geography_seed.sql` D2), dont
        /// 4 occupés par le kit de départ — 36 restent libres pour ce joueur, largement assez pour
        /// deux achats consécutifs.</summary>
        [UnityTest]
        public IEnumerator SameAccount_SecondStructuralDecisionInSameSession_Gets409()
        {
            const string tag = "onesess";
            string token = null;
            yield return ResolveSignInFreshAccount(tag,
                "MAFIA_DEMO_IDENTITY_TEST_ONESESSION_ID", "MAFIA_DEMO_IDENTITY_TEST_ONESESSION_PW",
                t => token = t);

            yield return SessionClose(tag, token);

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto sessionDto = null;
            string sessionErr = null;
            yield return sessionClient.OpenSession(token, "e2e-demo-id-one-session-cap",
                dto => sessionDto = dto, (c, m) => sessionErr = $"{c}: {m}");
            Assert.IsNull(sessionErr, $"[{tag}] session/open failed: {sessionErr}");
            Assert.IsNotNull(sessionDto,
                $"[{tag}] session/open must succeed — it also arms the structural-decision cap " +
                "this test exists to verify (D9: enforcement gate needs an ACTIVE session).");

            var projections = new CityProjectionsClient { BaseUrl = BaseUrl };
            DistrictInteriorDto interior = null;
            long interiorErrCode = -1;
            yield return projections.Interior(VergeADistrictId, token,
                d => interior = d, code => interiorErrCode = code);
            Assert.AreEqual(-1, interiorErrCode, $"[{tag}] district interior fetch failed, code {interiorErrCode}");
            Assert.IsNotNull(interior, $"[{tag}] interior payload was null");
            Assert.IsNotNull(interior.blocks, $"[{tag}] interior.blocks was null");
            Assert.IsNotNull(interior.buildings, $"[{tag}] interior.buildings was null");

            var occupiedByMe = new HashSet<int>(interior.buildings.Select(b => b.block_id));
            var freeBlocks = interior.blocks.Select(b => b.block_id)
                .Where(id => !occupiedByMe.Contains(id)).ToList();
            // Anti-vacuité DIMENSIONNÉE (I1) : il faut DEUX blocs libres, pas un — la PREMIÈRE
            // décision en consomme un et ne doit pas empêcher la SECONDE d'être TENTÉE (seulement
            // REFUSÉE par le gouverneur). Un scénario à un seul bloc libre ne pourrait jamais
            // distinguer "refusé par le gouverneur" de "refusé faute de bloc".
            Assert.GreaterOrEqual(freeBlocks.Count, 2,
                $"[{tag}] district {VergeADistrictId} n'offre pas deux blocs libres pour ce joueur " +
                "— le scénario de capacité ne peut pas être dimensionné tel quel.");

            bool okFirst = false; long codeFirst = -2;
            yield return PurchaseBuilding($"{tag}-1", token, freeBlocks[0],
                (ok, code) => { okFirst = ok; codeFirst = code; });
            Assert.IsTrue(okFirst,
                $"[{tag}] la PREMIÈRE décision structurelle de la session doit RÉUSSIR " +
                $"(code={codeFirst}) — sinon la seconde ne prouverait rien (elle pourrait échouer " +
                "pour la même raison que la première, pas pour le plafond).");

            bool okSecond = false; long codeSecond = -2;
            yield return PurchaseBuilding($"{tag}-2", token, freeBlocks[1],
                (ok, code) => { okSecond = ok; codeSecond = code; });
            Assert.IsFalse(okSecond,
                $"[{tag}] la SECONDE décision structurelle de LA MÊME session doit être REFUSÉE par " +
                $"le gouverneur (code={codeSecond}) — sans cette assertion, \"aucun 409\" resterait " +
                "vrai même dans le monde où le plafond ne s'arme jamais (revue ⊥ B2/I1).");
            Assert.AreEqual(409, codeSecond,
                "le plafond \"une décision structurelle par session\" " +
                "(structural-decision-governor.service.ts, one_decision_structural_per_session_cap) " +
                "doit renvoyer 409 STRUCTURAL_CAP_EXHAUSTED sur la seconde tentative.");
        }
    }
}
