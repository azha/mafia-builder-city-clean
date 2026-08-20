using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Tests; // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // nav-hud-design-v1.md, chunk 2 (§3 : navigation « Entrer » / « ← Carte ») — nav-F1..nav-F5
    // (§3.6 v2, mondes dégénérés §8). Drives the REAL shell (AppShell), the REAL CityMapController
    // demo auth (SeederSupport.CityMapSeeder — same precondition as CityMapDetailPlayModeTests),
    // and the REAL "Entrer" button click (Button.onClick.Invoke() — no mock, charter 27).
    [Category("W3U2")]
    public class NavigationPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [OneTimeSetUp]
        public void SeedCityMapDemo()
        {
            SeederSupport.RunSeeder(SeederSupport.CityMapSeeder, SeederSupport.CityMapMarker);
        }

        [TearDown]
        public void TearDown()
        {
            // Mirrors AppShellPlayModeTests: AppShell discovers/creates its OWN Canvas (never
            // parented under shellGo) — destroying only shellGo would leak it into the next test
            // in the SAME PlayMode domain.
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false;
        }

        // ── helpers ──────────────────────────────────────────────────────────────────────

        private static IEnumerator MountShellAtCityTab(AppShell s)
        {
            LogAssert.ignoreFailingMessages = true; // Home's own DashboardController demo-auth noise (byte-identical rationale to AppShellPlayModeTests)
            yield return null; // Start()/BuildLayout + Home activation
            s.ActivateTab(AppShell.Tab.City);
            yield return null; // CityMapController.Start()/BuildLayout deferred one frame
            yield return null; // ... and its own coroutines actually begin running here
        }

        private static IEnumerator WaitForAuthenticated(CityMapController cityMap, float timeoutSeconds = 25f)
        {
            float elapsed = 0f;
            while (!cityMap.IsAuthenticated && cityMap.AuthError == null && elapsed < timeoutSeconds)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(cityMap.IsAuthenticated, $"signed in (authErr={cityMap.AuthError})");
        }

        private static Transform EnterButtonTransform(AppShell s) =>
            s.ContentSlot.Find("DetailPanel")?.Find("Footer")?.Find("EnterButton");

        private static Transform LeadingButtonTransform(AppShell s) =>
            s.TopBar.transform.Find("LeadingAction");

        /// <summary>Full real flow: mount City tab, wait for demo auth, select `districtId`, wait
        /// for the (now-interactable) "Entrer" button, click it for real — the SAME path a player
        /// takes. Returns the mounted DistrictInteriorScreenController once its fetch has resolved.</summary>
        private static IEnumerator EnterDistrictViaRealFlow(AppShell s, int districtId,
            System.Action<DistrictInteriorScreenController> onEntered)
        {
            yield return MountShellAtCityTab(s);
            var cityMap = s.MountedTenantGameObject.GetComponent<CityMapController>();
            Assert.IsNotNull(cityMap, "City tab mounted a CityMapController");
            yield return WaitForAuthenticated(cityMap);

            cityMap.SelectDistrict(districtId);
            yield return null;

            Transform enterBtnT = EnterButtonTransform(s);
            Assert.IsNotNull(enterBtnT, "'Entrer' exists (persistent Footer child, §3.2)");
            Button enterBtn = enterBtnT.GetComponent<Button>();
            Assert.IsTrue(enterBtn.interactable, "authenticated + district selected ⇒ interactable (§3.2, 1st refresh point)");

            enterBtn.onClick.Invoke(); // the REAL click path, not a shortcut

            float elapsed = 0f;
            DistrictInteriorScreenController screen = null;
            while (elapsed < 20f)
            {
                if (s.MountedTenantType == typeof(DistrictInteriorScreenController))
                {
                    screen = s.MountedTenantGameObject.GetComponent<DistrictInteriorScreenController>();
                    if (screen != null && screen.LastFetchSucceeded) break;
                }
                elapsed += Time.deltaTime;
                yield return null;
            }
            Assert.IsNotNull(screen, "AppShell.EnterDistrict mounted a DistrictInteriorScreenController");
            Assert.IsTrue(screen.LastFetchSucceeded, $"interior fetch succeeded (errCode={screen.LastErrorCode})");

            // The REAL clock's day_phase at test time is whatever it is (usually not NIGHT) — force
            // it, same rationale as chunk 1 (DistrictInteriorDioramaPlayModeTests:143): this chunk's
            // falsifiables are about NAVIGATION/geometry, not about which quarter the sim is in, and
            // the night-hero grid (DistrictTitle/GridArea) only exists on that one branch.
            screen.LastFetch.day_phase = "NIGHT";
            screen.Render(screen.LastFetch); // force a deterministic render for geometry-only assertions
            yield return null;

            onEntered(screen);
        }

        // ── nav-F1 — Entrer cible le bon district ──────────────────────────────────────────
        // Monde dégénéré tué : un district par défaut (16) rendrait vrai un câblage qui ignore la
        // sélection ⇒ tué par « district de test ≠ 16 » (§8).

        [UnityTest]
        public IEnumerator NavF1_Enter_MountsDistrictScreen_ForTheSelectedDistrict_NotSixteen()
        {
            const int testDistrictId = 3; // ≠ 16 (verge-a) — le câblage ne doit PAS dépendre du starter kit
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();

            DistrictInteriorScreenController entered = null;
            yield return EnterDistrictViaRealFlow(shell, testDistrictId, s => entered = s);

            Assert.AreEqual(testDistrictId, entered.LastFetch.district_id,
                "nav-F1 — LastFetch.district_id == le district SÉLECTIONNÉ, pas un défaut");
            Assert.AreEqual(testDistrictId, shell.CityTabDistrictId, "AppShell tracks the entered district id");
            Assert.AreEqual(TopBarController.LeadingAction.BackToMap, shell.TopBar.CurrentLeadingAction,
                "§3.3 — entering a district wires the leading action to BackToMap");
        }

        // ── nav-F2 — retour DÉTRUIT l'écran ────────────────────────────────────────────────
        // Monde dégénéré tué : un écran caché satisferait « la carte est là » ⇒ tué par
        // l'assertion de DESTRUCTION (== null, pas activeSelf==false) (§8).

        [UnityTest]
        public IEnumerator NavF2_BackToMap_DestroysDistrictHost_RemountsCityMap()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();

            DistrictInteriorScreenController entered = null;
            yield return EnterDistrictViaRealFlow(shell, 3, s => entered = s);
            GameObject previousDistrictHost = entered.gameObject;

            Transform backBtnT = LeadingButtonTransform(shell);
            Assert.IsNotNull(backBtnT, "'← Carte' exists in the TopBar");
            Button backBtn = backBtnT.GetComponent<Button>();
            Assert.IsTrue(backBtnT.gameObject.activeSelf, "leading button is VISIBLE while in a district");

            backBtn.onClick.Invoke(); // the REAL click path
            yield return null;
            yield return null; // let Object.Destroy's deferred destruction actually process

            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType, "'← Carte' remounts CityMapController");
            Assert.IsTrue(previousDistrictHost == null,
                "nav-F2 — the PREVIOUS district host is Unity-DESTROYED (== null), never merely activeSelf==false");
            Assert.AreEqual(-1, shell.CityTabDistrictId, "back to the map — the named -1 state");
            Assert.AreEqual(TopBarController.LeadingAction.None, shell.TopBar.CurrentLeadingAction,
                "§3.3 — returning clears the leading action");
        }

        // ── nav-F3 — affordance gatée ───────────────────────────────────────────────────────
        // Monde dégénéré tué : « le bouton est absent » serait satisfait par un panneau qui n'en
        // construit jamais ⇒ tué en épinglant la VALEUR de interactable sur la MÊME instance (§8).

        [UnityTest]
        public IEnumerator NavF3_EnterButton_ExistsDisabledWithoutToken_EnabledAfterRealAuth_SameInstance()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return MountShellAtCityTab(shell);
            var cityMap = shell.MountedTenantGameObject.GetComponent<CityMapController>();
            Assert.IsNotNull(cityMap);

            // Fired before AuthThenHeat's own signin round-trip can possibly have completed
            // (Load() does GetDistricts() first, THEN AuthThenHeat() — at least one prior HTTP
            // hop) — select immediately, no waiting.
            cityMap.SelectDistrict(3);
            yield return null;

            Transform enterBtnT = EnterButtonTransform(shell);
            Assert.IsNotNull(enterBtnT, "nav-F3 — 'Entrer' EXISTS even sans jeton");
            Button enterBtn = enterBtnT.GetComponent<Button>();
            Assert.IsFalse(enterBtn.interactable, "nav-F3 — interactable==false BEFORE real authentication");

            yield return WaitForAuthenticated(cityMap); // real signin against the seeded demo account (charter 27, no mock)

            Transform enterBtnT2 = EnterButtonTransform(shell);
            Assert.AreSame(enterBtnT.gameObject, enterBtnT2.gameObject,
                "anti-vacuité — the SAME persistent instance, never rebuilt (§3.2 Footer)");
            Assert.IsTrue(enterBtn.interactable, "nav-F3 — interactable==true AFTER real authentication, same instance");
        }

        // ── nav-F4 — non-occlusion ──────────────────────────────────────────────────────────
        // District 16 (verge-a, 10x4 blocks) — the EXACT scenario design §3.4's own arithmetic
        // proves clear ("grille 4x118=472px centrée à 0,46x720 ... TabBar/TopBar dégagés").
        // MEASURED (not assumed) during this chunk: district 3's grid is 10x6, not 10x4 — its
        // taller grid genuinely dips into TabBarRoot's zone at THIS environment's actual canvas
        // height (671.42, from the 1100x577 game view, not the 720 reference) — a real interaction
        // between the pre-existing (pre-chunk-2) fixed 0.46 vertical anchor and grid ROW COUNT /
        // canvas ASPECT RATIO, outside this chunk's mandate (§3.4 only touches insets/titreBand).
        // Flagged, not silently patched — see Tools/nav-hud-chunk2-implementation-notes.md.

        [UnityTest]
        public IEnumerator NavF4_TitleClearsTopBar_GridClearsTabBar_GridAtLeast60PercentOfContent()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();

            DistrictInteriorScreenController entered = null;
            yield return EnterDistrictViaRealFlow(shell, 16, s => entered = s);

            Transform titleT = entered.ScreenRoot.Find("DistrictTitle");
            Transform gridT = entered.ScreenRoot.Find("GridArea");
            Assert.IsNotNull(titleT);
            Assert.IsNotNull(gridT);

            Transform canvasRoot = shell.ShellCanvas.transform;
            Bounds titleB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, (RectTransform)titleT);
            Bounds topBarB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, shell.TopBarSlot);
            Bounds gridB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, (RectTransform)gridT);
            Bounds tabBarB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, shell.TabBarRoot);

            Assert.IsFalse(titleB.Intersects(topBarB), "nav-F4 — the title does not overlap TopBarSlot");
            Assert.IsFalse(gridB.Intersects(tabBarB), "nav-F4 — the grid does not overlap TabBarRoot");

            float gridWidth = ((RectTransform)gridT).rect.width;
            float contentWidth = shell.ContentSlot.rect.width;
            Assert.GreaterOrEqual(gridWidth, 0.6f * contentWidth,
                $"nav-F4 — GridArea width ({gridWidth:F1}) >= 0.6x ContentSlot width ({contentWidth:F1})");
        }

        // ── nav-F5 (RECIBLÉE) — insets CONSOMMÉS, jamais 118-vs-110 (cette forme est FAUSSE) ──
        // Monde dégénéré tué : hors shell l'écart de titre est nul et l'assertion serait vraie
        // sans rien prouver ⇒ tué en exigeant insetTop>0 D'ABORD (§8). Écart attendu : 56px.

        [UnityTest]
        public IEnumerator NavF5_TitleOffsetConsumesInsetTop_56pxDelta_InsetAssertedPositiveFirst()
        {
            // (a) hors shell — bare host, day_phase NIGHT forcé, payload minimal FABRIQUÉ (patron
            // C8F5 : "démontre que l'écran réagit, pas que le back en produit").
            var bareGo = new GameObject("DistrictInteriorDiorama_NavF5Bare");
            var bareScreen = bareGo.AddComponent<DistrictInteriorScreenController>();
            var dto = new DistrictInteriorDto
            {
                district = "district-3", district_id = 3, profile = "lattice", name_canonical = "Test",
                bank_side = "north", grid = new DistrictInteriorGridDto { width = 1, height = 1 },
                blocks = new DistrictInteriorBlockDto[0], buildings = new DistrictInteriorBuildingDto[0],
                day_phase = "NIGHT",
            };
            bareScreen.Render(dto);
            float bareTitleY = ((RectTransform)bareScreen.ScreenRoot.Find("DistrictTitle")).anchoredPosition.y;
            Assert.AreEqual(-8f, bareTitleY, 0.01f, "hors shell : anchoredPosition.y == -8 (byte-identique à l'historique)");
            Object.Destroy(bareGo);

            // (b) dans le shell — le flux réel d'entrée en district.
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            DistrictInteriorScreenController entered = null;
            yield return EnterDistrictViaRealFlow(shell, 3, s => entered = s);

            float insetTop = shell.TopBarSlot.rect.height;
            Assert.Greater(insetTop, 0f,
                "nav-F5 — insetTop > 0 ASSERTÉ D'ABORD : sinon un écart nul rendrait l'assertion suivante vraie sans rien prouver");

            float shellTitleY = ((RectTransform)entered.ScreenRoot.Find("DistrictTitle")).anchoredPosition.y;
            Assert.AreEqual(-(8f + insetTop), shellTitleY, 0.01f, "dans le shell : anchoredPosition.y == -(8+insetTop)");

            float delta = shellTitleY - bareTitleY;
            Assert.AreEqual(-56f, delta, 0.01f, "nav-F5 — écart attendu : 56px (TopBarSlot.rect.height)");
        }
    }
}
