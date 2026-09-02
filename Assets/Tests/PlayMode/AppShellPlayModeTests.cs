using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational; // DashboardController + LaunderingController
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Tests; // ProductionClickSupport (round 4, BLOQUANT)
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
        // TopBar.Load) en tâche de fond, terminée par SON PROPRE `ActivateTab(Tab.Empire)` (items
        // 0.2/0.3, ruling 2026-08-25 — Empire fusionne l'ancien Home et l'ancien City ; le nom de la
        // coroutine ne change pas, désigné par le design). Un unique `yield return null;` (patron
        // pré-B1) ne garantit plus que ce montage a eu lieu — MESURÉ : en lot (contention réseau),
        // `MountedTenantType` était encore `null` au moment prévu pour `CityMapController`.
        // `CurrentTab == Empire` est le signal robuste (vrai sur SES DEUX branches, succès et
        // repli-échec) — voir NavigationPlayModeTests.NavF3 pour le cas où la branche échoue
        // délibérément.
        private static IEnumerator WaitForEmpireMounted(AppShell s)
        {
            float elapsed = 0f;
            while (s.CurrentTab != AppShell.Tab.Empire && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, s.CurrentTab, "acquisition de session propre du shell résolue (Empire monté)");
        }

        // C1-F1 (atteignabilité) — AMENDÉ (items 0.2/0.3, ruling 2026-08-25) : le dock ratifié
        // compte désormais 4 onglets (Home et City ont fusionné en Empire), activés successivement
        // dans le MÊME test, chacun montant le type attendu ; le 4e (More) est asserté PAR SA VALEUR
        // (OnEmptyMoreDestination), jamais par l'absence d'un composant monté (sinon un shell qui ne
        // monte JAMAIS rien passerait). ⛔ Ce test asserte le MÉCANISME (le shell monte bien un
        // locataire par onglet) — c'est le FAIT « quel onglet démarre, et ce qu'il monte » que le
        // ruling remplace : Empire mounts CityMapController, plus DashboardController (débranché,
        // item 0.5) — jamais silencieusement, le test se met à jour au lieu de se relâcher.
        [UnityTest]
        public IEnumerator C1F1_EachOfThe4Tabs_MountsExpectedType_FourthIsNamedEmptyState()
        {
            ExpectTenantOwnDemoAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return WaitForEmpireMounted(shell);

            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType, "Empire mounts CityMapController (Empire IS the map)");
            Assert.IsFalse(shell.OnEmptyMoreDestination, "Empire is not the empty destination");

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
            // ⚠️ MISE À JOUR 2026-09-02 : `Tab.More` N'EST PLUS la destination vide — il monte ㊲
            // (La réputation), premier écran du programme atteignable par un chemin joueur.
            // L'assertion précédente affirmait l'inverse ; la laisser aurait produit un test rouge
            // qui décrit fidèlement un monde qui n'existe plus, et le réflexe aurait été de le
            // neutraliser plutôt que de le relire.
            // ★ Un test qui contredit un changement VOULU n'est pas un obstacle à contourner :
            //   c'est l'endroit exact où la nouvelle vérité doit être réécrite.
            Assert.IsFalse(shell.OnEmptyMoreDestination,
                "More monte désormais ㊲ — plus aucune destination n'est vide, et on l'affirme PAR "
                + "VALEUR, jamais par la présence d'un composant monté");
            // ⚠️ 2026-09-02 — `Tab.More` ouvre le MENU des destinations (ruling « Plus → les succès
            // → l'horizon » : Plus DÉCRIT un menu). ㊲ n'y a pas d'exception : un onglet qui serait
            // « ㊲ + une liste » serait un menu qui ment sur son premier élément. ㊲ reste joignable
            // en une entrée, et la garde observe toujours ce que l'onglet monte — c'est la PROPRIÉTÉ
            // qui a changé, pas la rigueur.
            Assert.IsNull(shell.MountedTenantType,
                "l'onglet More ouvre un menu : aucun locataire ne doit être monté directement");
            Assert.Greater(shell.MenuPlusEntrees, 0,
                "le menu doit porter au moins une entrée — un menu vide passerait toute garde qui se " +
                "contente de vérifier son existence");
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
            yield return WaitForEmpireMounted(shell);
            yield return null; // CityMapController.Start()/BuildLayout actually runs here (Empire IS the map, items 0.2/0.3)

            // The Canvas root NEVER gains a 4th child: only the shell's own 3 slots
            // (ContentSlot, TopBarSlot, TabBarRoot) live there — a tenant that stretched a fullscreen
            // backdrop AT THE CANVAS ROOT (the pre-shell behaviour, BLOCKING-3) would show up here.
            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "the Canvas root holds EXACTLY the 3 shell slots — no tenant UI escaped to its root");

            // ⚠️ Revue ⊥ IMPORTANT-1 : `ContentSlot.childCount > 0` était vraie PAR CONSTRUCTION —
            // `AppShell.MountTenant<T>()` y parente lui-même le host du locataire (`AppShell.cs`,
            // `host.transform.SetParent(ContentSlot, false)`) AVANT que le locataire ne construise
            // quoi que ce soit. Un `CityMapController.BuildLayout()` qui ne produirait plus rien
            // laissait ce test entièrement vert. Correctif : asserter le PARENT EFFECTIF d'un objet
            // NOMMÉ que le locataire construit lui-même — c'est la « cible » littérale du design
            // (§3 C1-F2 : « cible : le parent effectif du locataire »), et ça échoue réellement si
            // `mountParent` est nul (le locataire découvre alors le Canvas et y construit son
            // "CityMapRoot" directement, jamais sous ContentSlot).
            Transform cityMapRoot = shell.ContentSlot.Find("CityMapRoot");
            Assert.IsNotNull(cityMapRoot,
                "the Empire tenant's OWN named object ('CityMapRoot', CityMapController.BuildLayout) exists as a DIRECT child of ContentSlot");
            Assert.AreEqual(shell.ContentSlot, cityMapRoot.parent,
                "the tenant's effective parent IS ContentSlot — not merely 'ContentSlot has some child' (which the host itself would already satisfy)");
            Assert.AreNotEqual(shell.ShellCanvas.transform, cityMapRoot.parent,
                "and NOT the Canvas root — the exact degenerate case an unset mountParent would produce");

            // Second tab change — proves it's not a one-shot fluke, and that unmount/remount actually
            // swaps content rather than accumulating it forever inside ContentSlot. Org (not Empire
            // again — items 0.2/0.3 collapsed the former Home<->City pair into one tab) mounts
            // LieutenantScreenController, whose own BuildLayout builds a "LieutenantBackdrop".
            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;
            yield return null;
            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "STILL exactly 3 Canvas children after a SECOND tenant — confinement holds across swaps");
            Transform lieutenantBackdrop = shell.ContentSlot.Find("LieutenantBackdrop");
            Assert.IsNotNull(lieutenantBackdrop,
                "the Org tenant's OWN named object ('LieutenantBackdrop', LieutenantScreenController.BuildLayout) exists as a DIRECT child of ContentSlot");
            Assert.AreEqual(shell.ContentSlot, lieutenantBackdrop.parent, "the Org tenant's effective parent IS ContentSlot");
            Assert.AreNotEqual(shell.ShellCanvas.transform, lieutenantBackdrop.parent, "and NOT the Canvas root");
            Assert.IsNull(shell.ContentSlot.Find("CityMapRoot"),
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
        // (la TabBar est cliquable dès `Start()`) ne doit PAS être ramené de force sur Empire quand
        // cette acquisition se termine, son locataire détruit. Fermé par le sentinel `(Tab)(-1)` de
        // `CurrentTab` : `ActivateTab(Tab.Empire)` (les DEUX branches, succès et échec) ne s'exécute
        // que si RIEN n'a encore été activé.
        // ⛔ CETTE GARDE NE DOIT PAS SE PERDRE EN CHANGEANT L'ONGLET PAR DÉFAUT (items 0.2/0.3,
        // Tools/charpente-item0-2-3-design.md §2/C-b) — d'où le choix d'`Org` ci-dessous, PAS
        // `Empire` : Empire est désormais l'onglet que le boot activerait de toute façon, donc
        // l'utiliser comme « onglet déjà touché » ne prouverait plus rien (aucune différence
        // observable entre « le joueur a navigué » et « le boot n'a encore rien fait »). Le
        // MÉCANISME testé (le sentinel) est inchangé ; seul le FAIT (quel onglet illustre « le
        // joueur a déjà navigué ailleurs ») change.
        //
        // Reproduction DÉTERMINISTE (pas dépendante du minutage réseau réel) : `ActivateTab(Org)`
        // appelé AVANT même que `Start()` ne tourne (fenêtre synchrone même-frame que
        // `AddComponent<AppShell>()`) pose `CurrentTab=Org` avant que l'acquisition asynchrone
        // n'ait la moindre chance de démarrer — exactement la condition que le sentinel doit
        // respecter, quel que soit le moment RÉEL où le joueur aurait tapé pendant la fenêtre réseau.
        [UnityTest]
        public IEnumerator LateEmpireActivation_DoesNotOverride_PlayerNavigationDuringAcquisition()
        {
            ExpectTenantOwnDemoAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.ActivateTab(AppShell.Tab.Org); // AVANT Start() — le joueur "a déjà touché Famille (Org)"
            Assert.AreEqual(AppShell.Tab.Org, shell.CurrentTab, "prémisse : Org est bien actif avant toute acquisition");

            // Laisse l'acquisition de session du shell (Start() -> AcquireSessionThenActivateHome)
            // tourner à son terme (signin démo -> échec ou succès -> ActivateTab(Empire) SEULEMENT si
            // le sentinel le permet).
            float elapsed = 0f;
            while (elapsed < 15f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }

            Assert.AreEqual(AppShell.Tab.Org, shell.CurrentTab,
                "le montage tardif d'Empire NE DOIT PAS écraser la navigation du joueur — la course fermée en production, pas seulement en test");
            Assert.AreEqual(typeof(LieutenantScreenController), shell.MountedTenantType,
                "le locataire Org doit rester monté — un ActivateTab(Empire) forcé l'aurait détruit");
        }

        // Défaut MESURÉ (Tools/district-v2-reimport-implementation-notes.md § FILE D'ATTENTE,
        // défaut 1, 2026-08-21) — un PREMIER AppShell dont le host n'est JAMAIS détruit (exactement
        // le piège que le commentaire de TearDown ci-dessus nomme : « the NEXT test's AppShell would
        // then find and reuse it, silently DOUBLING its slot count ») reste VIVANT, avec SON PROPRE
        // CityMapController monté et sa liste de districts active. Un SECOND AppShell, créé ensuite,
        // retrouve LE MÊME Canvas via `FindFirstObjectByType<Canvas>()` (`BuildLayout` ne crée un
        // Canvas QUE s'il n'en trouve aucun) et empilait — AVANT correctif — ses propres
        // ContentSlot/TopBarSlot/TabBarRoot en SIBLING des anciens, jamais nettoyés : `UnmountCurrentTenant`
        // ne connaît que SA PROPRE instance de `ContentSlot`. Mesuré à la capture : le fond du
        // district (centré, 1080px dans un viewport 1280px — marges de 100px de chaque côté) ne
        // peint rien dans ces marges, où l'ANCIEN CityMapController (rendu, sibling d'ordre
        // inférieur mais jamais occlus dans cette zone) restait visible.
        //
        // Garde STRUCTURELLE, deux formes ensemble (socle : « une garde qui compterait seulement les
        // enfants directs du Canvas passerait alors qu'un objet fuit deux niveaux plus bas ») :
        //  (a) Canvas.childCount reste EXACTEMENT 3 — un doublon de slot serait un 4e enfant DIRECT ;
        //  (b) balayage PAR TYPE DE COMPOSANT, insensible à la profondeur de nichage —
        //      DistrictCellView (marqueur exclusif de la liste CityMapController, `BuildCell`) ne
        //      doit exister NULLE PART dans la scène une fois qu'on a quitté City pour un district
        //      — (b) seule aurait vu le défaut même si l'objet fuyant avait été niché encore plus
        //      profond que le cas mesuré ici (Canvas/ContentSlot-orphelin/CityMapRoot/Banks/.../DistrictCell).
        //
        // CONTRÔLE POSITIF (rouge AVANT le correctif de `AppShell.BuildLayout`, mesuré) :
        // Canvas.childCount == 6 (3 slots × 2 shells) et DistrictCellView.Length == 24 (le corpus
        // seedé par CityMapSeeder) — voir implementation-notes.md § Deviations pour la commande et
        // la sortie collées de cette mesure AVANT correctif.
        [UnityTest]
        public IEnumerator StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas()
        {
            ExpectTenantOwnDemoAuthNoise();

            // RONDE 3 (revue ⊥ r2, classe B) — les DEUX SetIdentity ci-dessous posaient le littéral
            // "citymap_demo@example.test" EN DUR : depuis B2 (ronde 2), `SetIdentity` marque
            // `identityExplicitlySet = true`, qui désactive la surcharge d'environnement pour le
            // shell — un littéral en dur ÉPINGLE donc ce test au compte PARTAGÉ citymap_demo, sans
            // qu'aucune variable ne puisse l'en décaler. Résolu UNE fois pour les deux shells (A et B
            // veulent délibérément le MÊME compte — c'est le scénario du test, deux shells sur un
            // Canvas partagé) via la paire d'environnement CITYMAP ; le littéral ne reste qu'un
            // fallback.
            (string citymapIdentifier, string citymapPassword) = DemoIdentityResolver.Resolve(
                DemoIdentityResolver.CityMapIdentifierEnvVar, DemoIdentityResolver.CityMapPasswordEnvVar,
                "citymap_demo@example.test", "citymap-demo-pw");

            // ---- shell A : jamais détruit — l'abandon EST le scénario testé (repro d'un
            // teardown de test/capture incomplet, cf. commentaire de TearDown ci-dessus). ----
            GameObject shellAGo = new GameObject("AppShell_A_abandoned");
            AppShell shellA = shellAGo.AddComponent<AppShell>();
            shellA.SetIdentity(citymapIdentifier, citymapPassword);
            yield return WaitForEmpireMounted(shellA);
            shellA.ActivateTab(AppShell.Tab.Empire); // re-tap (idempotent-ish remount, items 0.2/0.3 — Empire IS the old City)
            yield return null;
            yield return null;
            Assert.AreEqual(typeof(CityMapController), shellA.MountedTenantType, "prémisse : A a bien monté CityMapController");
            var cityMapA = shellA.MountedTenantGameObject.GetComponent<CityMapController>();
            float authElapsedA = 0f;
            while (!cityMapA.IsAuthenticated && cityMapA.AuthError == null && authElapsedA < 25f) { authElapsedA += Time.deltaTime; yield return null; }
            yield return null; // laisser Populate() construire la liste

            Assert.Greater(Object.FindObjectsByType<DistrictCellView>(FindObjectsInactive.Include, FindObjectsSortMode.None).Length, 0,
                "prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B");

            // ---- shell B : le VRAI flux joueur, Empire (la carte) -> district (via `shell`/
            // `shellGo`, trackés par le TearDown de la fixture — A est nettoyé explicitement en fin
            // de test). ----
            shellGo = new GameObject("AppShell_B");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(citymapIdentifier, citymapPassword);
            yield return WaitForEmpireMounted(shell);
            shell.ActivateTab(AppShell.Tab.Empire); // re-tap (idempotent-ish remount, items 0.2/0.3)
            yield return null;
            yield return null;
            var cityMapB = shell.MountedTenantGameObject.GetComponent<CityMapController>();
            Assert.IsNotNull(cityMapB, "B a bien monté un CityMapController");
            float authElapsedB = 0f;
            while (!cityMapB.IsAuthenticated && cityMapB.AuthError == null && authElapsedB < 25f) { authElapsedB += Time.deltaTime; yield return null; }

            const int districtId = 16;
            cityMapB.SelectDistrict(districtId);
            yield return null;
            Transform enterBtnT = shell.ContentSlot.Find("DetailPanel")?.Find("Footer")?.Find("EnterButton");
            Assert.IsNotNull(enterBtnT, "'Entrer' existe");
            Button enterBtn = enterBtnT.GetComponent<Button>();
            float interactElapsed = 0f;
            while (!enterBtn.interactable && interactElapsed < 10f) { interactElapsed += Time.deltaTime; yield return null; }
            Assert.IsTrue(enterBtn.interactable, "'Entrer' interactable");
            // round 4 (revue ⊥, BLOQUANT) — `onClick.Invoke()` court-circuite les gardes
            // IsActive()/IsInteractable() de Button.Press() ; ce helper passe par l'EventSystem.
            ProductionClickSupport.Click(enterBtn); // le VRAI chemin de clic

            float enterElapsed = 0f;
            DistrictInteriorScreenController screen = null;
            while (enterElapsed < 20f)
            {
                if (shell.MountedTenantType == typeof(DistrictInteriorScreenController))
                {
                    screen = shell.MountedTenantGameObject.GetComponent<DistrictInteriorScreenController>();
                    if (screen != null && screen.LastFetchSucceeded) break;
                }
                enterElapsed += Time.deltaTime;
                yield return null;
            }
            Assert.IsNotNull(screen, "B a atteint le district via le VRAI chemin de clic");
            yield return null;
            yield return null; // laisser les Destroy() différés se traiter réellement (nav-F2)

            // ---- la garde ----
            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "le Canvas ne porte JAMAIS plus de 3 enfants — un slot dupliqué d'un shell abandonné serait un 4e (ou plus)");
            Assert.AreEqual(0, Object.FindObjectsByType<DistrictCellView>(FindObjectsInactive.Include, FindObjectsSortMode.None).Length,
                "AUCUN DistrictCellView (marqueur exclusif de la liste CityMapController) ne survit nulle part dans la " +
                "scène une fois qu'on a quitté City pour un district — même niché sous un ContentSlot orphelin, " +
                "invisible à un comptage des seuls enfants DIRECTS du Canvas");

            // Nettoyage de A (B est nettoyé par le TearDown de la fixture via shell/shellGo — le
            // Canvas, partagé par construction si le défaut n'est pas corrigé OU réutilisé même
            // après correctif, n'est détruit qu'UNE fois).
            if (shellA.ShellCanvas != null && shellA.ShellCanvas.gameObject != shell.ShellCanvas.gameObject)
                Object.Destroy(shellA.ShellCanvas.gameObject);
            Object.Destroy(shellAGo);
        }
    }
}
