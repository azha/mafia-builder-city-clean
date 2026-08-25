using System.Collections;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup -> Bearer)
using MafiaCleanCity.Operational; // WalletEnvelope (envelope/payload/data)
using MafiaCleanCity.Tests; // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C2 (design §3 C2) — le TopBar. E2E (charte 27, no-mock) pour les falsifiables qui
    // franchissent la frontière HTTP (C2-F3) ; C2-F1 est un test unitaire pur (aucune route,
    // `FormatCash` est statique et indépendamment testable — design : "le scénario dimensionnant
    // n'a jamais besoin d'un solde réel de cette magnitude").
    //
    // Joueur : un signup RÉEL et jetable (`AuthClient.SignUp`), PAS le seeder opérationnel lourd
    // (`Tools/seed_operational_demo.mjs`) — mesuré, en dehors du périmètre de ce lot, en échec
    // reproductible sur une stack fraîche ("a refinery can only be converted in a Stack district
    // […] building X is in a 'verge' district", HTTP 422) : une hypothèse de placement figée dans le
    // script de seed contre la disposition réelle des districts. Le TopBar n'a besoin que d'UN
    // joueur signé, PAS de bâtiments/raffineries — un signup direct l'obtient sans dépendre d'un
    // seeder cassé pour une raison hors sujet.
    [Category("W3U1")]
    public class TopBarControllerPlayModeTests
    {
        private GameObject hostGo;
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private static IEnumerator SignIn(System.Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            // TopBar RENDERS the callsign verbatim — REUSE SeederSupport.SafeCallsign (PURELY
            // ALPHABETIC, immune to the R2.2 "no bare digit" guard this chunk's own C2-F4 checks;
            // see its header for the measured reason a digit-sandwich-between-letters ISN'T safe).
            string callsign = SeederSupport.SafeCallsign("c2", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u1-c2-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            Assert.IsFalse(string.IsNullOrEmpty(token), "signup returned a token");
            onToken(token);
        }

        private TopBarController NewBareTopBar()
        {
            hostGo = new GameObject("TopBar");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<TopBarController>();
        }

        // C2-F1 (cash) — locale-formatted, NO hard-coded currency symbol. Deux locales -> deux
        // rendus DIFFÉRENTS (dimensionné : une seule locale ne distinguerait pas un formatage réel
        // d'un "$" en dur). Le solde survit SANS PERTE au-delà du domaine des flottants sûrs
        // (2^53 = 9007199254740992, 16 chiffres) — 18 chiffres significatifs ici.
        [Test]
        public void C2F1_Cash_LocaleFormatted_NoHardcodedSymbol_SurvivesBeyondFloatSafeRange()
        {
            const string hugeCashCents = "123456789012345678"; // 18 digits > 2^53's 16
            string renderedEn = TopBarController.FormatCash(hugeCashCents, "en");
            string renderedFr = TopBarController.FormatCash(hugeCashCents, "fr");

            Assert.AreNotEqual(renderedEn, renderedFr,
                "two locales must render DIFFERENTLY — a single-locale check couldn't tell real " +
                "locale-driven formatting apart from a fixed '$' + fixed separators.");
            Assert.IsFalse(renderedEn.Contains("€"), $"en-US render must not carry the fr-FR symbol: '{renderedEn}'");
            Assert.IsFalse(renderedFr.Contains("$"), $"fr-FR render must not carry a hard-coded '$': '{renderedFr}'");

            string digitsOnly = Regex.Replace(renderedEn, @"[^\d]", "");
            Assert.AreEqual("123456789012345678", digitsOnly,
                $"the full 18 significant digits must survive without truncation: '{renderedEn}' -> '{digitsOnly}'");
        }

        [Test]
        public void C2F1_Cash_EmptyOrUnparsable_RendersPlaceholder_NeverThrows()
        {
            Assert.AreEqual("—", TopBarController.FormatCash(null, "en"));
            Assert.AreEqual("—", TopBarController.FormatCash("", "en"));
            Assert.AreEqual("—", TopBarController.FormatCash("not-a-number", "en"));
        }

        // C2-F2 (point de notification) — la VALEUR suit le booléen, les deux polarités dans le
        // même test (une assertion sur une seule polarité serait satisfaite par un point toujours
        // visible/toujours caché).
        [UnityTest]
        public IEnumerator C2F2_NotificationDot_ValueFollowsBacklogBadge_BothPolarities()
        {
            TopBarController topBar = NewBareTopBar();
            string token = null;
            yield return SignIn(t => token = t);

            yield return topBar.Load(token, backlogBadge: true, openedGameDay: 7);
            Assert.IsTrue(topBar.Loaded);
            Assert.IsTrue(topBar.NotificationActive);
            Assert.IsTrue(topBar.RenderedTexts.Any(t => t == TopBarController.LibelleNotifActive), "backlog TRUE renders the active state");
            Assert.IsFalse(topBar.RenderedTexts.Any(t => t == TopBarController.LibelleNotifCalme), "the inactive label is NOT also present");

            yield return topBar.Load(token, backlogBadge: false, openedGameDay: 7);
            Assert.IsFalse(topBar.NotificationActive);
            Assert.IsTrue(topBar.RenderedTexts.Any(t => t == TopBarController.LibelleNotifCalme), "backlog FALSE renders the inactive state");
            Assert.IsFalse(topBar.RenderedTexts.Any(t => t == TopBarController.LibelleNotifActive), "the active label is NOT also present");
        }

        // C2-F3 (à travers l'enveloppe) — le TopBar est alimenté par une VRAIE réponse de
        // GET /v1/economy/wallet, lue via payload.data — comparée à une lecture INDÉPENDANTE (ground
        // truth), pas au DTO que TopBarController vient de produire lui-même.
        [UnityTest]
        public IEnumerator C2F3_Cash_FedByRealWalletResponse_ThroughEnvelope()
        {
            TopBarController topBar = NewBareTopBar();
            string token = null;
            yield return SignIn(t => token = t);

            // Ground truth: an INDEPENDENT raw GET, parsed through the SAME envelope/payload/data shape.
            WalletDto liveWallet = null;
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/economy/wallet"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"live wallet GET failed: {req.error}");
                liveWallet = JsonUtility.FromJson<WalletEnvelope>(req.downloadHandler.text)?.payload?.data;
            }
            Assert.IsNotNull(liveWallet, "ground-truth wallet parsed");
            Assert.IsFalse(string.IsNullOrEmpty(liveWallet.cash_cents), "ground-truth cash_cents present");

            yield return topBar.Load(token, backlogBadge: false, openedGameDay: 1);
            Assert.IsTrue(topBar.Loaded, $"TopBar loaded (meErr={topBar.MeError} walletErr={topBar.WalletError})");
            Assert.IsNotNull(topBar.CurrentWallet, "TopBar parsed a wallet DTO through payload.data");
            Assert.AreEqual(liveWallet.cash_cents, topBar.CurrentWallet.cash_cents,
                "TopBar's OWN fetch matches the independently-fetched live cash_cents");
            Assert.AreEqual(liveWallet.wallet_band, topBar.CurrentWallet.wallet_band,
                "TopBar's OWN fetch matches the independently-fetched live wallet_band");

            string expectedRender = TopBarController.FormatCash(liveWallet.cash_cents, topBar.CurrentMe?.locale);
            Assert.AreEqual(expectedRender, topBar.RenderedCashText, "the rendered cash text derives from the REAL fetched value");
        }

        // C2-F4 (la garde R2.2 — IMPORTANT-5) — le solde ET le temps in-game sont des chrome
        // digit-bearing EXCLUS du corpus de scan (même mécanisme que "Tier N",
        // DashboardController.cs:340) ; callsign ET le point de notification restent SOUMIS au scan.
        // Dimensionné : au moins un élément exclu ET un élément soumis (tout exclure viderait la garde).
        [UnityTest]
        public IEnumerator C2F4_R22Guard_CashAndGameDayExcluded_CallsignAndNotificationScanned()
        {
            TopBarController topBar = NewBareTopBar();
            string token = null;
            yield return SignIn(t => token = t);

            yield return topBar.Load(token, backlogBadge: true, openedGameDay: 42);
            Assert.IsTrue(topBar.Loaded);

            // At least one EXCLUDED element: cash + game-day render bare digits, and are NOT tracked.
            Assert.IsTrue(Regex.IsMatch(topBar.RenderedCashText, @"\d"), "cash render actually carries digits (sanity)");
            Assert.IsTrue(Regex.IsMatch(topBar.RenderedGameDayText, @"(?<![A-Za-z])\d+(?![A-Za-z])"),
                $"'{topBar.RenderedGameDayText}' actually carries a bare digit (sanity — else exclusion proves nothing)");
            Assert.IsFalse(topBar.RenderedTexts.Any(t => t == topBar.RenderedCashText), "cash is EXCLUDED from the scan corpus");
            Assert.IsFalse(topBar.RenderedTexts.Any(t => t == topBar.RenderedGameDayText), "game-day is EXCLUDED from the scan corpus");

            // At least one SUBMITTED element: callsign + notification ARE tracked.
            Assert.IsTrue(topBar.RenderedTexts.Any(t => t == TopBarController.LibelleNotifActive), "notification IS submitted to the scan corpus");
            Assert.IsTrue(topBar.RenderedTexts.Count >= 2, "the corpus is NOT empty — excluding everything would be the tempting degenerate case");

            // The R2.2 guard itself (VERBATIM regex, `DashboardPlayModeTests.cs:287`) — every text
            // that DID make it into the scanned corpus must be clean (proves the corpus is genuinely
            // digit-free, not merely non-empty).
            foreach (string t in topBar.RenderedTexts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but a SCANNED TopBar text was: '{t}'");
            }
        }
    }
}
