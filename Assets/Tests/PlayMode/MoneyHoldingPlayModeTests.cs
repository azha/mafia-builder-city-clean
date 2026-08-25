using System.Collections;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests; // REUSE SeederSupport (node-resolve + child-Process + stdout-marker parse).
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // E2E (charter 27: NO MOCK) for the Phase-5 vector #5a (money_holding — clean-cash holding vault) building-card surface
    // (T9 Stage B). Drives the real BuildingCardController against the LOCAL dockerized stack (Traefik @ http://localhost —
    // the money_holding backend lives on the local game-back; the controller's SerializeField defaults to the VPS, so this
    // fixture overrides it with SetBaseUrl("http://localhost")):
    //   1. runs Tools/seed_operational_demo.mjs and parses its stdout JSON to DISCOVER the demo creds + the `money_holding`
    //      (Tier-2 MEDIUM vault, MODERATE held, BUSY capacity, EARNING yield, PENDING forfeiture) — the id changes every run;
    //   2. points the controller at http://localhost, then signs in via its AuthClient → Bearer;
    //   3. loads the money_holding card and asserts the vault surface renders money_holding_tier_band=MEDIUM + held_band=
    //      MODERATE + capacity_band=BUSY + yield_band=EARNING + the forfeiture WARNING (PENDING) + the Upgrade-holding-tier
    //      affordance (Tier-2 < MAX → upgradable) + the deposit/withdraw actions;
    //   4. exercises a deposit + a withdraw (SERVER-AUTHORITATIVE: the amount goes to the server, which enforces capacity /
    //      funds and returns 409 — the UI reflects the verdict) and asserts the capacity band reflects the changed hold;
    //   5. asserts a deposit BEYOND the tier capacity is REFUSED server-side (409 OVER_CAPACITY — the UI does not pre-decide);
    //   6. asserts NO raw scalar leaks client-side (only qualitative bands / categorical labels / glyphs / booleans — R2.2).
    //
    // ORDER-INDEPENDENT: this fixture self-seeds its precondition in OneTimeSetUp (the operational seeder re-creates the
    // money_holding + a fresh MODERATE hold + an armed forfeiture on every run), so the seed→use is atomic per fixture and a
    // sibling op fixture's re-seed can't invalidate the id this fixture loads.
    public class MoneyHoldingPlayModeTests
    {
        private const string LocalStack = "http://localhost";

        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see OneTimeSeed).
        private static string moneyHoldingId; // the Tier-2 MEDIUM vault (MODERATE held, BUSY, EARNING, PENDING forfeiture)
        private static string nonVaultId;     // a NON-money_holding control building (the Crick refinery — never a vault)

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            moneyHoldingId = SeederSupport.ExtractString(json, "money_holding");
            nonVaultId = SeederSupport.ExtractString(json, "refinery"); // a NON-money_holding operational building (control).
            Assert.IsTrue(SeederSupport.IsUuid(moneyHoldingId), $"discovered money_holding uuid (got '{moneyHoldingId}')");
            Assert.IsTrue(SeederSupport.IsUuid(nonVaultId), $"discovered non-vault control uuid (got '{nonVaultId}')");
            Debug.Log($"[MoneyHoldingE2E] seeded — vault(MEDIUM/MODERATE/BUSY/EARNING/PENDING)={moneyHoldingId} control={nonVaultId}");
        }

        // Per-test fresh precondition (charter 27): the deposit/withdraw tests MUTATE the shared vault's held balance, so
        // each test re-NORMALIZES the vault row to the seeded baseline (Tier-2 / $50k held / a far-ahead PENDING forfeiture)
        // before it runs — a FAST single-statement SQL reset (no ~40s full re-seed), so the fixture is ORDER-INDEPENDENT (a
        // sibling's deposits can't bleed into the next test's baseline assertions). The forfeiture deadline is re-armed at
        // the LIVE clock + a far lead so it reads PENDING (not IMMINENT, and never fires). R2.2 is unaffected — this only
        // restores raw DB state the seeder itself sets; the player surface is the band projection.
        [SetUp]
        public void NormalizeVault()
        {
            if (!SeederSupport.IsUuid(moneyHoldingId)) return; // OneTimeSetUp not run / failed — let the test assert it.
            // Restore the seeded baseline in ONE statement: tier 2, held $50k (5_000_000 cents), last_yield_tick = the live
            // clock (so no stale accrual bumps the held band), and forfeiture armed at clock + a far lead (→ PENDING).
            SeederSupport.RunDevPsql(
                "UPDATE money_holding SET money_holding_tier=2, held_cents=5000000, " +
                "last_yield_tick=(SELECT game_minute FROM city_sim_clock c WHERE c.player_id=money_holding.player_id), " +
                "forfeiture_scheduled_at_tick=(SELECT game_minute + 100000 FROM city_sim_clock c WHERE c.player_id=money_holding.player_id) " +
                $"WHERE building_id='{moneyHoldingId}';");
        }

        // ------------------------------------------------------------ helpers --

        private BuildingCardController NewLocalController()
        {
            controllerGo = new GameObject("BuildingCardController");
            var controller = controllerGo.AddComponent<BuildingCardController>();
            // The money_holding backend is on the LOCAL stack — override the VPS default BEFORE SignIn.
            controller.SetBaseUrl(LocalStack);
            controller.BuildingId = ""; // we drive the load manually after sign-in.
            return controller;
        }

        private static IEnumerator SignInController(BuildingCardController controller)
        {
            float elapsed = 0f;
            yield return controller.SignIn();
            while (!controller.IsAuthenticated && controller.AuthError == null && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.IsNull(controller.AuthError, $"sign-in errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in (Bearer acquired)");
        }

        private static void AssertNoRawScalar(System.Collections.Generic.IReadOnlyList<string> texts)
        {
            foreach (string t in texts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }
        }

        // ------------------------------------------------------------ tests --

        // The money_holding card renders the vault surface: money_holding_tier_band=MEDIUM, held_band=MODERATE, capacity_band=
        // BUSY, yield_band=EARNING, the forfeiture WARNING (PENDING), and the Upgrade-holding-tier affordance (the seeded
        // wallet is FLUSH → affordable). R2.2: bands + categorical labels only — no raw held cents / tier int / yield rate / tick.
        [UnityTest]
        public IEnumerator MoneyHoldingCard_RendersVaultSurface_TierHeldCapacityYield_AndForfeitureWarning()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(moneyHoldingId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "money_holding building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(moneyHoldingId, card.building, "card is for the seeded money_holding");
            Assert.AreEqual("money_holding", card.operational_type, "operational_type is money_holding");
            // The bands reflect the seeded Tier-2 / $50k hold / armed forfeiture.
            Assert.AreEqual("MEDIUM", card.money_holding_tier_band, "seeded money_holding is Tier-2 → MEDIUM band");
            Assert.AreEqual("MODERATE", card.held_band, "seeded vault holds $50k → MODERATE held band");
            Assert.AreEqual("BUSY", card.capacity_band, "seeded vault is below the Tier-2 cap → BUSY capacity band");
            Assert.AreEqual("EARNING", card.yield_band, "a non-empty vault accrues passive yield → EARNING band");
            Assert.AreEqual("PENDING", card.forfeiture_band, "an armed forfeiture with a far deadline → PENDING band");

            // The vault surface rows are shown and reflect the bands.
            Assert.IsTrue(controller.MoneyHoldingTierShown, "the holding-tier row is shown on a money_holding");
            Assert.IsTrue(controller.HeldBandShown, "the held row is shown on a money_holding");
            Assert.IsTrue(controller.CapacityBandShown, "the capacity row is shown on a money_holding");
            Assert.IsTrue(controller.YieldBandShown, "the yield row is shown on a money_holding");
            Assert.IsTrue(controller.ForfeitureWarningShown, "the forfeiture WARNING is shown on a PENDING vault");

            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Holding tier"), "holding-tier row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Medium"), "holding-tier band value 'Medium' rendered");
            Assert.IsTrue(texts.Any(t => t == "Held"), "held row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Moderate"), "held band value 'Moderate' rendered");
            Assert.IsTrue(texts.Any(t => t == "Capacity"), "capacity row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Busy"), "capacity band value 'Busy' rendered");
            Assert.IsTrue(texts.Any(t => t == "Yield"), "yield row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Earning"), "yield band value 'Earning' rendered");
            // The forfeiture warning telegraphs the audit so the player can react (withdraw or diversify).
            Assert.IsTrue(texts.Any(t => t.Contains("under audit") || t.Contains("Under audit")),
                "the forfeiture warning telegraphs the audit");
            Assert.IsTrue(texts.Any(t => t.Contains("withdraw or diversify")),
                "the forfeiture warning tells the player how to react");

            // The Upgrade-holding-tier affordance is present on a sub-MAX vault (MEDIUM → can upgrade); the seeded wallet is
            // FLUSH → it is interactable. The gate is a band-vs-band comparison (R2.2 — never cents).
            Assert.IsTrue(controller.UpgradeMoneyHoldingTierButtonShown, "Upgrade-holding-tier button shown on a sub-MAX vault");
            Assert.AreEqual("FLUSH", controller.WalletBand, "seeded wallet band is FLUSH");
            Assert.IsTrue(controller.UpgradeMoneyHoldingTierButtonAffordable, "Upgrade affordable with a FLUSH wallet");
            Assert.IsTrue(texts.Any(t => t == "Upgrade holding tier"), "Upgrade-holding-tier button label rendered");

            // The deposit + withdraw actions + the amount selector are shown (the server-authoritative transfer affordances).
            Assert.IsTrue(controller.DepositActionShown, "the deposit-cash action is shown on a vault card");
            Assert.IsTrue(controller.WithdrawActionShown, "the withdraw-cash action is shown on a vault card");
            Assert.IsTrue(texts.Any(t => t == "Deposit cash"), "deposit button label rendered");
            Assert.IsTrue(texts.Any(t => t == "Withdraw cash"), "withdraw button label rendered");
            Assert.IsTrue(texts.Any(t => t.StartsWith("MONTANT DU TRANSFERT")), "transfer-amount selector section rendered");

            // R2.2: no raw scalar leaks client-side (no held cents / tier int / yield rate / tick / forfeiture tick).
            AssertNoRawScalar(texts);

            Debug.Log($"[MoneyHoldingE2E] vault card — tier={card.money_holding_tier_band} held={card.held_band} cap={card.capacity_band} yield={card.yield_band} forfeiture={card.forfeiture_band}");
        }

        // The deposit/withdraw transfers are SERVER-AUTHORITATIVE: the player-entered amount goes to the server, which moves
        // the cash and the reloaded card's bands reflect the new hold. A deposit raises the held magnitude (still BUSY below
        // the cap); a subsequent withdraw lowers it. The UI never pre-decides — it surfaces the server verdict.
        [UnityTest]
        public IEnumerator DepositThenWithdraw_AreServerAuthoritative_AndBandsReflectTheHold()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(moneyHoldingId);
            Assert.IsTrue(controller.CardLoaded, $"money_holding card loaded (err={controller.CardError})");
            Assert.AreEqual("MODERATE", controller.CurrentCard.held_band, "vault starts at the seeded MODERATE hold");

            // Deposit a 'Medium' ($100k) amount → succeeds 200; the reloaded card stays BUSY (still below the $5M Tier-2 cap)
            // and the held magnitude rises toward HIGH territory ($50k + $100k = $150k → HIGH band).
            controller.SetTransferAmount(10_000_000); // $100k.
            yield return controller.DepositCash();
            ActionOutcome deposit = controller.LastActionOutcome;
            Assert.IsNotNull(deposit, "deposit produced an outcome");
            StringAssert.Contains("/deposit-cash", deposit.Endpoint, "deposit hit the deposit-cash endpoint");
            Assert.IsTrue(deposit.Ok,
                $"a deposit within the tier capacity should succeed (2xx). Got http={deposit.HttpStatus} msg={deposit.Message}");
            Assert.IsTrue(controller.CardLoaded, "card reloaded after the deposit");
            Assert.AreEqual("HIGH", controller.CurrentCard.held_band, "after a $100k deposit the held band rises to HIGH ($150k)");
            Assert.AreEqual("BUSY", controller.CurrentCard.capacity_band, "still below the Tier-2 cap → BUSY");
            Assert.AreEqual("EARNING", controller.CurrentCard.yield_band, "a non-empty vault keeps EARNING");

            // Withdraw the same 'Medium' ($100k) amount → succeeds 200; the held band drops back to MODERATE ($50k).
            controller.SetTransferAmount(10_000_000); // $100k.
            yield return controller.WithdrawCash();
            ActionOutcome withdraw = controller.LastActionOutcome;
            Assert.IsNotNull(withdraw, "withdraw produced an outcome");
            StringAssert.Contains("/withdraw-cash", withdraw.Endpoint, "withdraw hit the withdraw-cash endpoint");
            Assert.IsTrue(withdraw.Ok,
                $"a withdraw within the held balance should succeed (2xx). Got http={withdraw.HttpStatus} msg={withdraw.Message}");
            Assert.AreEqual("MODERATE", controller.CurrentCard.held_band, "after withdrawing the deposit the held band returns to MODERATE");

            AssertNoRawScalar(controller.RenderedTexts);
            Debug.Log($"[MoneyHoldingE2E] deposit→withdraw — depositOk={deposit.Ok} withdrawOk={withdraw.Ok} held={controller.CurrentCard.held_band}");
        }

        // The capacity guard is SERVER-AUTHORITATIVE: a deposit that would EXCEED the tier capacity is refused server-side
        // (409 OVER_CAPACITY) — the UI passes the amount through and reflects the verdict (a readable message), it does NOT
        // pre-decide. The $1M 'Large' amount, deposited repeatedly, eventually crosses the $5M Tier-2 cap → 409.
        [UnityTest]
        public IEnumerator DepositBeyondCapacity_IsRefusedServerSide_409()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(moneyHoldingId);
            Assert.IsTrue(controller.CardLoaded, $"money_holding card loaded (err={controller.CardError})");

            // Fill toward the Tier-2 $5M cap with $1M ('Large') deposits, then prove one is REFUSED server-side (the seeded
            // hold is $50k; 5× $1M = $5.05M > the $5M cap → the crossing deposit 409s OVER_CAPACITY). The UI never pre-decides.
            controller.SetTransferAmount(100_000_000); // $1M ('Large').
            bool sawOverCapacity = false;
            ActionOutcome last = null;
            for (int i = 0; i < 6 && !sawOverCapacity; i++)
            {
                yield return controller.DepositCash();
                last = controller.LastActionOutcome;
                Assert.IsNotNull(last, "deposit produced an outcome");
                StringAssert.Contains("/deposit-cash", last.Endpoint, "deposit hit the deposit-cash endpoint");
                if (!last.Ok)
                {
                    // The server refused — a 409 OVER_CAPACITY (the capacity guard), surfaced as a readable message (F2).
                    Assert.AreEqual(409, last.HttpStatus, $"a capacity-exceeding deposit is refused 409 (got {last.HttpStatus}: {last.Message})");
                    StringAssert.Contains("capacity", last.Message.ToLowerInvariant(),
                        "the readable refusal explains the capacity (server-authoritative verdict, not a raw code)");
                    sawOverCapacity = true;
                }
            }
            Assert.IsTrue(sawOverCapacity, "a deposit beyond the tier capacity was refused server-side (409 OVER_CAPACITY)");

            // R2.2: even the refusal message carries no raw scalar in the RENDERED card texts.
            AssertNoRawScalar(controller.RenderedTexts);
            Debug.Log($"[MoneyHoldingE2E] over-capacity — refused http={last.HttpStatus} msg={last.Message}");
        }

        // A focused guard: the vault surface is money_holding-scoped. A NON-money_holding card surfaces the neutral defaults
        // (money_holding_tier_band NONE, held/capacity/yield/forfeiture NONE) — the vault surface rows + affordances do NOT
        // render on it, proving the surface is type-scoped (the SAME neutral convention the hub/lab surfaces use).
        [UnityTest]
        public IEnumerator NonVaultCard_HasNeutralDefault_NoVaultRows()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            // The refinery is a NON-money_holding operational building. Its card carries the neutral money_holding default and
            // renders NO vault surface rows.
            yield return controller.LoadBuilding(nonVaultId);
            Assert.IsTrue(controller.CardLoaded, $"non-vault (refinery) card loaded (err={controller.CardError})");

            BuildingCardDto card = controller.CurrentCard;
            Assert.AreNotEqual("money_holding", card.operational_type, "the control building is NOT a money_holding");
            Assert.AreEqual("NONE", card.money_holding_tier_band, "a non-vault card carries the neutral money_holding_tier_band NONE");
            Assert.AreEqual("NONE", card.held_band, "a non-vault card carries the neutral held_band NONE");
            Assert.AreEqual("NONE", card.capacity_band, "a non-vault card carries the neutral capacity_band NONE");
            Assert.AreEqual("NONE", card.yield_band, "a non-vault card carries the neutral yield_band NONE");
            Assert.AreEqual("NONE", card.forfeiture_band, "a non-vault card carries the neutral forfeiture_band NONE");

            // The vault surface rows + affordances are NOT shown on a non-vault card.
            Assert.IsFalse(controller.MoneyHoldingTierShown, "no holding-tier row on a non-vault card");
            Assert.IsFalse(controller.HeldBandShown, "no held row on a non-vault card");
            Assert.IsFalse(controller.CapacityBandShown, "no capacity row on a non-vault card");
            Assert.IsFalse(controller.YieldBandShown, "no yield row on a non-vault card");
            Assert.IsFalse(controller.ForfeitureWarningShown, "no forfeiture warning on a non-vault card");
            Assert.IsFalse(controller.UpgradeMoneyHoldingTierButtonShown, "no Upgrade-holding-tier button on a non-vault card");
            Assert.IsFalse(controller.DepositActionShown, "no deposit action on a non-vault card");
            Assert.IsFalse(controller.WithdrawActionShown, "no withdraw action on a non-vault card");

            // R2.2: no raw scalar leaks client-side on the non-vault card either.
            AssertNoRawScalar(controller.RenderedTexts);
            Debug.Log($"[MoneyHoldingE2E] non-vault control — type={card.operational_type} tier={card.money_holding_tier_band} held={card.held_band} forfeiture={card.forfeiture_band}");
        }

        // Screenshot of the money_holding card showing the clean-cash vault surface. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureMoneyHoldingScreenshot()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(moneyHoldingId);
            Assert.IsTrue(controller.CardLoaded, $"money_holding card loaded (err={controller.CardError})");
            Assert.IsTrue(controller.MoneyHoldingTierShown, "holding-tier row shown for the screenshot");
            Assert.IsTrue(controller.ForfeitureWarningShown, "forfeiture warning shown for the screenshot");
            for (int i = 0; i < 3; i++) yield return null;
            yield return CaptureTo("money_holding_card.png");
        }

        private static IEnumerator CaptureTo(string fileName)
        {
            string dir = Path.Combine(Application.dataPath, "Screenshots");
            Directory.CreateDirectory(dir);
            string path = Path.Combine(dir, fileName);
            if (File.Exists(path)) File.Delete(path);

            ScreenCapture.CaptureScreenshot(path);
            float waited = 0f;
            while (!File.Exists(path) && waited < 10f) { waited += Time.deltaTime; yield return null; }
            yield return null;
            Assert.IsTrue(File.Exists(path), $"screenshot written to {path}");
            Debug.Log($"[MoneyHoldingE2E] screenshot → {path}");
        }
    }
}
