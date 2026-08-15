using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using System.Linq;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C7 (design §3 C7) — ContextualBanner, ShortcutBar, et les 5 états. Aucune route
    // consommée en propre (design §3.0, "l'exception défendue") — falsifiables structurelles pures.
    [Category("W3U1")]
    public class HomeChromeControllerPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private HomeChromeController NewBareChrome()
        {
            hostGo = new GameObject("HomeChrome");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<HomeChromeController>();
        }

        // C7-F1 (bandeau) — rendu AVEC LA VALEUR de l'état de semaine quand actif, état nommé "pas
        // de bandeau" sinon. Scénario : les DEUX polarités — un test qui ne voit que le cas actif
        // serait satisfait par un bandeau permanent.
        [Test]
        public void C7F1_Banner_ActiveWithValue_InactiveNamedState_BothPolarities()
        {
            var chrome = NewBareChrome();

            chrome.SetCompressionGlance(new CompressionGlanceDto { stress_bucket = "mounting", week_state = "active", forced = true });
            Assert.IsTrue(chrome.BannerActive);
            Assert.AreEqual("active", chrome.BannerWeekStateRendered);
            Assert.IsTrue(chrome.RenderedTexts.Any(t => t.Contains("active")));

            chrome.SetCompressionGlance(new CompressionGlanceDto { stress_bucket = "calm", week_state = "none", forced = false });
            Assert.IsFalse(chrome.BannerActive);
            Assert.IsTrue(chrome.RenderedTexts.Any(t => t == "No banner"),
                "the INACTIVE state is a NAMED value ('No banner'), never merely 'nothing rendered'");
        }

        // C7-F2 (les 5 états) — chacun atteint et asserté PAR SA VALEUR. Cible : compte d'états
        // distincts observés = 5.
        [Test]
        public void C7F2_All5CanonicalStates_ReachedAndAssertedByValue()
        {
            var chrome = NewBareChrome();
            var observed = new HashSet<HomeChromeController.HomeState>();

            chrome.SetLoadCircumstances(isLoading: true, hasError: false, isOffline: false, hasAnyData: false, hasAllExpectedData: false);
            Assert.AreEqual(HomeChromeController.HomeState.LoadingState, chrome.CurrentState);
            observed.Add(chrome.CurrentState);

            chrome.SetLoadCircumstances(isLoading: false, hasError: false, isOffline: false, hasAnyData: false, hasAllExpectedData: false);
            Assert.AreEqual(HomeChromeController.HomeState.EmptyState, chrome.CurrentState);
            observed.Add(chrome.CurrentState);

            chrome.SetLoadCircumstances(isLoading: false, hasError: true, isOffline: false, hasAnyData: false, hasAllExpectedData: false);
            Assert.AreEqual(HomeChromeController.HomeState.ErrorState, chrome.CurrentState);
            observed.Add(chrome.CurrentState);

            chrome.SetLoadCircumstances(isLoading: false, hasError: false, isOffline: false, hasAnyData: true, hasAllExpectedData: false);
            Assert.AreEqual(HomeChromeController.HomeState.PartialState, chrome.CurrentState);
            observed.Add(chrome.CurrentState);

            chrome.SetLoadCircumstances(isLoading: false, hasError: false, isOffline: true, hasAnyData: true, hasAllExpectedData: true);
            Assert.AreEqual(HomeChromeController.HomeState.OfflineState, chrome.CurrentState);
            observed.Add(chrome.CurrentState);

            Assert.AreEqual(5, observed.Count, "exactly 5 DISTINCT states were reached — the canon's full closed set");
        }

        // C7-F3 (pression) — la valeur rendue suit les TROIS valeurs de la bande. Scénario : les 3.
        [Test]
        public void C7F3_PressureBand_FollowsAllThreeValues()
        {
            var chrome = NewBareChrome();

            chrome.SetPressureBand("normal");
            Assert.AreEqual("normal", chrome.PressureBandRendered);
            Assert.IsTrue(chrome.RenderedTexts.Any(t => t.Contains("Normal")));

            chrome.SetPressureBand("warning");
            Assert.AreEqual("warning", chrome.PressureBandRendered);
            Assert.IsTrue(chrome.RenderedTexts.Any(t => t.Contains("Warning")));

            chrome.SetPressureBand("saturated");
            Assert.AreEqual("saturated", chrome.PressureBandRendered);
            Assert.IsTrue(chrome.RenderedTexts.Any(t => t.Contains("Saturated")));
        }

        // The shortcut that opens Daily Review is wired (design: "deux raccourcis dont l'un ouvre
        // Daily Review") — the CLICK HOOK fires; C8 (DailyReviewScreen) is the actual navigation target.
        [Test]
        public void DailyReviewShortcut_ClickFires()
        {
            var chrome = NewBareChrome();
            Assert.AreEqual(0, chrome.DailyReviewShortcutClicks);
            chrome.ClickDailyReviewShortcut();
            Assert.AreEqual(1, chrome.DailyReviewShortcutClicks);
        }
    }
}
