using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational; // DashboardController + LaunderingController
using MafiaCleanCity.Operational.Lieutenant;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C1 (design §3 C1) — le shell est LE PATRON des 11 lots d'écrans suivants. Aucune route
    // consommée : ces falsifiables sont structurelles (agencement, montage/démontage), jamais
    // réseau — c'est pourquoi elles n'ont pas besoin de la stack dev, contrairement à C2-C8.
    [Category("W3U1")]
    public class AppShellPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        // AppShell mirrors the 9 screen controllers' OWN Canvas discovery: `FindFirstObjectByType
        // <Canvas>()`, creating a fresh independent root GameObject only if none exists — it is NEVER
        // parented under the shell's own host. Destroying `shellGo` alone therefore leaves the Canvas
        // (and its 3 shell slots) alive across tests in the SAME PlayMode domain — the NEXT test's
        // `AppShell` would then find and reuse it, silently DOUBLING its slot count. Explicit cleanup.
        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false; // never leak into a LATER, unrelated test
        }

        // Mounting REAL screen controllers (DashboardController, CityMapController,
        // LieutenantScreenController, LaunderingController) as shell tenants triggers THEIR OWN
        // internal demo-account sign-in (Start()/Boot(), pre-existing behaviour, orthogonal to
        // shell mounting). On a stack with no seeded demo accounts for THEIR hard-coded identifiers,
        // that sign-in genuinely fails and each controller logs its own `Debug.LogError("[X] auth
        // failed: …")` — Unity's LogAssert treats ANY unexpected Error log as a test failure by
        // default. MEASURED, reproduced twice: `[Lieutenant] auth failed … 401`. C1-F1/C1-F2 assert
        // ONLY mounting/confinement (never auth success) — this noise is expected and orthogonal,
        // not silently swallowing a real product defect (nothing here asserts on auth state).
        private static void ExpectTenantOwnDemoAuthNoise()
        {
            LogAssert.ignoreFailingMessages = true;
        }

        // AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — `Start()` lance désormais
        // `AcquireSessionThenActivateHome` (le shell signe SA PROPRE session : signin+session/open+
        // TopBar.Load) en tâche de fond, terminée par SON PROPRE `ActivateTab(Tab.Home)`. Un unique
        // `yield return null;` (patron pré-B1) ne garantit plus que ce montage a eu lieu — MESURÉ :
        // en lot (contention réseau), `MountedTenantType` était encore `null` au moment prévu pour
        // `DashboardController`. `CurrentTab == Home` est le signal robuste (vrai sur SES DEUX
        // branches, succès et repli-échec) — voir NavigationPlayModeTests.NavF3 pour le cas où la
        // branche échoue délibérément.
        private static IEnumerator WaitForHomeMounted(AppShell s)
        {
            float elapsed = 0f;
            while (s.CurrentTab != AppShell.Tab.Home && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Home, s.CurrentTab, "acquisition de session propre du shell résolue (Home monté)");
        }

        // C1-F1 (atteignabilité) — les 5 onglets activés successivement dans le MÊME test montent
        // chacun le type attendu ; le 5e (More) est asserté PAR SA VALEUR (OnEmptyMoreDestination),
        // jamais par l'absence d'un composant monté (sinon un shell qui ne monte JAMAIS rien passerait).
        [UnityTest]
        public IEnumerator C1F1_EachOfThe5Tabs_MountsExpectedType_FifthIsNamedEmptyState()
        {
            ExpectTenantOwnDemoAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return WaitForHomeMounted(shell);

            Assert.AreEqual(typeof(DashboardController), shell.MountedTenantType, "Home mounts DashboardController");
            Assert.IsFalse(shell.OnEmptyMoreDestination, "Home is not the empty destination");

            shell.ActivateTab(AppShell.Tab.City);
            yield return null;
            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType, "City mounts CityMapController");
            Assert.IsFalse(shell.OnEmptyMoreDestination);

            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;
            Assert.AreEqual(typeof(LieutenantScreenController), shell.MountedTenantType, "Org mounts LieutenantScreenController");
            Assert.IsFalse(shell.OnEmptyMoreDestination);

            shell.ActivateTab(AppShell.Tab.Pipeline);
            yield return null;
            Assert.AreEqual(typeof(LaunderingController), shell.MountedTenantType, "Pipeline mounts LaunderingController");
            Assert.IsFalse(shell.OnEmptyMoreDestination);

            shell.ActivateTab(AppShell.Tab.More);
            yield return null;
            Assert.IsTrue(shell.OnEmptyMoreDestination,
                "More is the EMPTY destination — asserted BY VALUE, not by component absence");
            Assert.IsNull(shell.MountedTenantType, "More mounts nothing (consistent WITH the named state, not a substitute for it)");
        }

        // C1-F2 (NON-OCCLUSION — remplace l'assertion d'identité de la v1) — le locataire monte DANS
        // ContentSlot, JAMAIS à la racine du Canvas ; les deux barres restent atteignables au-dessus
        // de lui. Scénario : au moins DEUX changements d'onglet, chacun avec un locataire qui étire
        // un fond plein écran — dimensionné sur le défaut réel (les 9 contrôleurs font exactement ça).
        [UnityTest]
        public IEnumerator C1F2_TenantMountsInContentSlot_NeverAtCanvasRoot_BarsStayAboveIt()
        {
            ExpectTenantOwnDemoAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return WaitForHomeMounted(shell);
            yield return null; // DashboardController.Start()/BuildLayout actually runs here

            // The Canvas root NEVER gains a 4th child: only the shell's own 3 slots
            // (ContentSlot, TopBarSlot, TabBarRoot) live there — a tenant that stretched a fullscreen
            // backdrop AT THE CANVAS ROOT (the pre-shell behaviour, BLOCKING-3) would show up here.
            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "the Canvas root holds EXACTLY the 3 shell slots — no tenant UI escaped to its root");

            // ⚠️ Revue ⊥ IMPORTANT-1 : `ContentSlot.childCount > 0` était vraie PAR CONSTRUCTION —
            // `AppShell.MountTenant<T>()` y parente lui-même le host du locataire (`AppShell.cs`,
            // `host.transform.SetParent(ContentSlot, false)`) AVANT que le locataire ne construise
            // quoi que ce soit. Un `DashboardController.BuildLayout()` qui ne produirait plus rien
            // laissait ce test entièrement vert. Correctif : asserter le PARENT EFFECTIF d'un objet
            // NOMMÉ que le locataire construit lui-même — c'est la « cible » littérale du design
            // (§3 C1-F2 : « cible : le parent effectif du locataire »), et ça échoue réellement si
            // `mountParent` est nul (le locataire découvre alors le Canvas et y construit son
            // "DashboardBackdrop" directement, jamais sous ContentSlot).
            Transform dashboardBackdrop = shell.ContentSlot.Find("DashboardBackdrop");
            Assert.IsNotNull(dashboardBackdrop,
                "the Home tenant's OWN named object ('DashboardBackdrop', DashboardController.BuildLayout) exists as a DIRECT child of ContentSlot");
            Assert.AreEqual(shell.ContentSlot, dashboardBackdrop.parent,
                "the tenant's effective parent IS ContentSlot — not merely 'ContentSlot has some child' (which the host itself would already satisfy)");
            Assert.AreNotEqual(shell.ShellCanvas.transform, dashboardBackdrop.parent,
                "and NOT the Canvas root — the exact degenerate case an unset mountParent would produce");

            // Second tab change — proves it's not a one-shot fluke, and that unmount/remount actually
            // swaps content rather than accumulating it forever inside ContentSlot.
            shell.ActivateTab(AppShell.Tab.City);
            yield return null;
            yield return null;
            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "STILL exactly 3 Canvas children after a SECOND tenant — confinement holds across swaps");
            Transform cityMapRoot = shell.ContentSlot.Find("CityMapRoot");
            Assert.IsNotNull(cityMapRoot,
                "the City tenant's OWN named object ('CityMapRoot', CityMapController.BuildLayout) exists as a DIRECT child of ContentSlot");
            Assert.AreEqual(shell.ContentSlot, cityMapRoot.parent, "the City tenant's effective parent IS ContentSlot");
            Assert.AreNotEqual(shell.ShellCanvas.transform, cityMapRoot.parent, "and NOT the Canvas root");
            Assert.IsNull(shell.ContentSlot.Find("DashboardBackdrop"),
                "the FIRST tenant's object is genuinely gone — unmount/remount swaps, it doesn't accumulate");

            // Non-occlusion via SIBLING ORDER (design C1-F2 explicitly sanctions "ordre de frères OU
            // test de raycast" — sibling order is deterministic under batchmode, unlike a real
            // pointer raycast). Later sibling index == rendered ON TOP in ScreenSpaceOverlay uGUI.
            int contentIndex = shell.ContentSlot.GetSiblingIndex();
            int topBarIndex = shell.TopBarSlot.GetSiblingIndex();
            int tabBarIndex = shell.TabBarRoot.GetSiblingIndex();
            Assert.Less(contentIndex, topBarIndex, "TopBarSlot renders ABOVE ContentSlot (later sibling index)");
            Assert.Less(contentIndex, tabBarIndex, "TabBarRoot renders ABOVE ContentSlot (later sibling index)");

            // The two bars are still alive, still direct Canvas children — the tenant's fullscreen
            // backdrop (a CHILD of ContentSlot) cannot have destroyed or reparented them.
            Assert.AreEqual(shell.ShellCanvas.transform, shell.TopBarSlot.parent, "TopBarSlot still parented under the Canvas");
            Assert.AreEqual(shell.ShellCanvas.transform, shell.TabBarRoot.parent, "TabBarRoot still parented under the Canvas");
        }

        // IMPORTANT-1 (verdict ⊥ HUD v3.1, hud-session-arbitrages-design.md §1.2/B1) — un joueur qui
        // touche un AUTRE onglet pendant les 2-4 allers-retours réseau d'`AcquireSessionThenActivateHome`
        // (la TabBar est cliquable dès `Start()`) ne doit PAS être ramené de force sur Home quand
        // cette acquisition se termine, son locataire détruit. Fermé par le sentinel `(Tab)(-1)` de
        // `CurrentTab` : `ActivateTab(Tab.Home)` (les DEUX branches, succès et échec) ne s'exécute
        // que si RIEN n'a encore été activé.
        //
        // Reproduction DÉTERMINISTE (pas dépendante du minutage réseau réel) : `ActivateTab(City)`
        // appelé AVANT même que `Start()` ne tourne (fenêtre synchrone même-frame que
        // `AddComponent<AppShell>()`) pose `CurrentTab=City` avant que l'acquisition asynchrone
        // n'ait la moindre chance de démarrer — exactement la condition que le sentinel doit
        // respecter, quel que soit le moment RÉEL où le joueur aurait tapé pendant la fenêtre réseau.
        [UnityTest]
        public IEnumerator LateHomeActivation_DoesNotOverride_PlayerNavigationDuringAcquisition()
        {
            ExpectTenantOwnDemoAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.ActivateTab(AppShell.Tab.City); // AVANT Start() — le joueur "a déjà touché City"
            Assert.AreEqual(AppShell.Tab.City, shell.CurrentTab, "prémisse : City est bien actif avant toute acquisition");

            // Laisse l'acquisition de session du shell (Start() -> AcquireSessionThenActivateHome)
            // tourner à son terme (signin démo -> échec ou succès -> ActivateTab(Home) SEULEMENT si
            // le sentinel le permet).
            float elapsed = 0f;
            while (elapsed < 15f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }

            Assert.AreEqual(AppShell.Tab.City, shell.CurrentTab,
                "le montage tardif de Home NE DOIT PAS écraser la navigation du joueur — la course fermée en production, pas seulement en test");
            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType,
                "le locataire City doit rester monté — un ActivateTab(Home) forcé l'aurait détruit");
        }
    }
}
