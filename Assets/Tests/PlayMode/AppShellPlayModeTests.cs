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
        }

        // C1-F1 (atteignabilité) — les 5 onglets activés successivement dans le MÊME test montent
        // chacun le type attendu ; le 5e (More) est asserté PAR SA VALEUR (OnEmptyMoreDestination),
        // jamais par l'absence d'un composant monté (sinon un shell qui ne monte JAMAIS rien passerait).
        [UnityTest]
        public IEnumerator C1F1_EachOfThe5Tabs_MountsExpectedType_FifthIsNamedEmptyState()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null; // Start()/BuildLayout + the initial Home activation

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
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null; // Home activates + BuildLayout defers one more frame
            yield return null; // DashboardController.Start()/BuildLayout actually runs here

            // The Canvas root NEVER gains a 4th child: only the shell's own 3 slots
            // (ContentSlot, TopBarSlot, TabBarRoot) live there — a tenant that stretched a fullscreen
            // backdrop AT THE CANVAS ROOT (the pre-shell behaviour, BLOCKING-3) would show up here.
            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "the Canvas root holds EXACTLY the 3 shell slots — no tenant UI escaped to its root");
            Assert.Greater(shell.ContentSlot.childCount, 0,
                "the Home tenant (DashboardController) DID build something, confined INSIDE ContentSlot");

            // Second tab change — proves it's not a one-shot fluke, and that unmount/remount actually
            // swaps content rather than accumulating it forever inside ContentSlot.
            shell.ActivateTab(AppShell.Tab.City);
            yield return null;
            yield return null;
            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "STILL exactly 3 Canvas children after a SECOND tenant — confinement holds across swaps");
            Assert.Greater(shell.ContentSlot.childCount, 0,
                "the City tenant also built something confined inside ContentSlot");

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
    }
}
