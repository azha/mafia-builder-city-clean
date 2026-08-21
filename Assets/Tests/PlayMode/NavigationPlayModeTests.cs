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
            // hud-session-arbitrages-design.md §1.3 (B1) — « NavigationPlayModeTests.cs:25,59,122
            // reste vert en posant l'identité du shell sur le compte citymap via le champ sérialisé ».
            // Sous B1 le shell signe UNE fois pour Home ET pour la City tab qu'il monte ensuite — ces
            // falsifiables ont besoin du compte citymap_demo (seedé ci-dessus), pas du défaut Home
            // (operational_demo). Même fenêtre synchrone que `SetToken`/`SetMountParent` : appelé
            // AVANT le premier `yield return null` ci-dessous, donc AVANT que `Start()` (différé
            // d'une frame) ne lise ces champs.
            s.SetIdentity("citymap_demo@example.test", "citymap-demo-pw");
            LogAssert.ignoreFailingMessages = true; // Home's own DashboardController demo-auth noise (byte-identical rationale to AppShellPlayModeTests)

            // MESURÉ (course trouvée en lot W3U2, invisible en fichier isolé) : `AppShell.Start()`
            // lance `AcquireSessionThenActivateHome` (signin+session/open+TopBar.Load) en tâche de
            // fond, qui se termine par SON PROPRE `ActivateTab(Tab.Home)`. Un unique
            // `yield return null;` ne garantit pas que cette séquence est terminée ; sous contention
            // (lot complet), elle peut encore être en vol quand ce test bascule manuellement vers
            // City — son `ActivateTab(Home)` tardif ÉCRASE alors tout ce que le test a construit
            // depuis (CityTabDistrictId remis à -1, l'écran district démonté — reproduit :
            // `MissingReferenceException` sur des objets que le test croyait encore vivants). Fix :
            // attendre `TopBar.Loaded` — `ActivateTab(Home)` s'exécute SYNCHRONE juste après, dans
            // la MÊME passe de coroutine, donc le voir vrai garantit que le montage interne de Home
            // est déjà réglé avant toute bascule manuelle.
            float bootElapsed = 0f;
            while ((s.TopBar == null || !s.TopBar.Loaded) && bootElapsed < 15f) { bootElapsed += Time.deltaTime; yield return null; }
            Assert.IsTrue(s.TopBar != null && s.TopBar.Loaded, "acquisition de session propre du shell terminée avant toute bascule manuelle");

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

        // AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — sous B1, un `CityMapController` monté
        // APRÈS que le shell a acquis SA PROPRE session reçoit un jeton INJECTÉ, synchrone, avant
        // même que `Start()` ne tourne : `IsAuthenticated` peut donc être déjà VRAI dès le premier
        // frame, effaçant la fenêtre "avant authentification" que ce test observait (mesuré : en
        // lot, `interactable` était déjà `True` au moment prévu pour `False` — pas une course sur UN
        // jeton, une DISPARITION structurelle de la fenêtre, conséquence directe de l'injection).
        // Pour observer le repli AUTHENTIQUE (« rien reçu ⇒ le locataire signe lui-même »,
        // `IShellTenant.cs`), ce test pose une identité de shell délibérément INVALIDE : le signin du
        // shell échoue vite (pas de round-trip session/open), `Token` reste vide, `MountTenant<T>`
        // n'injecte donc RIEN — CityMapController retombe sur SON PROPRE signin démo, le MÊME
        // MÉCANISME avant/après que ce test a toujours testé. ⚠️ Précision de STATUT (verdict ⊥,
        // MINORS) — le mécanisme est inchangé, mais son ATTEIGNABILITÉ ne l'est pas : avant B1,
        // c'était le chemin NOMINAL (CityMapController signait TOUJOURS lui-même) ; sous B1, ce
        // n'est plus atteignable QUE par le repli — le chemin DÉGRADÉ, exercé ici en le provoquant
        // délibérément (identité invalide). Un joueur réel, sur une stack où le shell signe
        // normalement, ne traverse plus jamais cette fenêtre.
        [UnityTest]
        public IEnumerator NavF3_EnterButton_ExistsDisabledWithoutToken_EnabledAfterRealAuth_SameInstance()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity("nav-f3-deliberately-invalid@example.test", "not-a-real-password");
            LogAssert.ignoreFailingMessages = true; // le signin (délibérément raté) du shell loggue une Error attendue

            // MESURÉ (course trouvée en lot, invisible seule) : même un signin DESTINÉ À ÉCHOUER
            // exige un aller-retour réseau RÉEL (>1 frame) — un unique `yield return null;` ne
            // suffit pas, le test bascule alors vers City AVANT que la branche d'échec d'
            // `AcquireSessionThenActivateHome` n'ait elle-même appelé `ActivateTab(Home)`, qui
            // arrive ENSUITE et écrase le montage manuel (repro : `cityMap` == null en lot). Fix :
            // attendre `CurrentTab == Home`, signal robuste aux DEUX branches (succès ET échec) —
            // plus précis que `TopBar.Loaded` (vrai seulement en cas de succès).
            float bootElapsed = 0f;
            while (shell.CurrentTab != AppShell.Tab.Home && bootElapsed < 15f) { bootElapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Home, shell.CurrentTab, "acquisition (même ratée) du shell résolue avant toute bascule manuelle");

            shell.ActivateTab(AppShell.Tab.City);
            yield return null;
            yield return null;

            var cityMap = shell.MountedTenantGameObject.GetComponent<CityMapController>();
            Assert.IsNotNull(cityMap);
            Assert.IsFalse(cityMap.IsAuthenticated,
                "prémisse : le shell n'a RIEN injecté (son propre signin a échoué) — CityMap doit démarrer NON authentifié");

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

        // ── nav-F4 — non-occlusion — AMENDÉE par le pivot fond pré-rendu ────────────────────────
        // (Tools/pivot-fond-prerendu-design.md, §2.1 F-cadre, §12, gate ⊥ APPROVED 2026-08-20).
        // District 16 (verge-a) — la propriété TITRE survit intacte (inchangée). La propriété
        // GRILLE-vs-TABBAR (confinement + largeur ≥60%) ne survit PAS littéralement : le pivot
        // remplace la grille CONFINÉE (dimensionnée pour tenir dans ContentSlot, §3.4 de l'ancien
        // design nav-hud) par un fond PIXEL-PERFECT en résolution NATIVE (§2.1 F-cadre : « il n'y a
        // pas de rescale (ruling)... le fond est ancré au centre »). Un fond natif 1080×1920 dépasse
        // largement le viewport de test 1100×577 et chevauche donc TopBarSlot/TabBarRoot en bornes
        // BRUTES — attendu et BÉNIN : la non-occlusion VISUELLE reste garantie par l'ORDRE DE
        // FRATRIE du shell (AppShell.cs:29-33, C1-F2 : « ContentSlot [sous les barres] PUIS
        // TopBarSlot PUIS TabBarRoot... un locataire qui étire un fond plein écran DANS ContentSlot
        // reste donc toujours SOUS les deux barres »), pas par le confinement de ses BORNES. Une
        // intersection de bornes n'est donc plus un signal valide pour le FOND lui-même —
        // F-cadre (sonde ⊥ Tools/resemblance-probe.py, §8) est l'instrument que le design désigne
        // pour cette propriété au moment de la capture. Voir implementation-notes.md § Deviations.

        [UnityTest]
        public IEnumerator NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();

            DistrictInteriorScreenController entered = null;
            yield return EnterDistrictViaRealFlow(shell, 16, s => entered = s);

            Transform titleT = entered.ScreenRoot.Find("DistrictTitle");
            Transform sceneT = entered.ScreenRoot.Find("DistrictScene");
            Assert.IsNotNull(titleT);
            Assert.IsNotNull(sceneT, "pp-F5 — le conteneur fond+bâtiments existe");
            Transform fondT = sceneT.Find("DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "district 16 (verge-a) a un fond réel en vague 1");

            Transform canvasRoot = shell.ShellCanvas.transform;
            Bounds titleB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, (RectTransform)titleT);
            Bounds topBarB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, shell.TopBarSlot);

            // AMENDÉ NOMMÉMENT (2026-08-21, frontière avec le lot manomètre — Shell/TopBarController.cs)
            // — MESURÉ (diagnostic Debug.Log en construisant ce correctif) : `topBarB`, calculé via
            // `RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, shell.
            // TopBarSlot)`, N'EST PAS borné à `TopBarSlot.rect` seul — cette surcharge AGRÈGE
            // récursivement les RectTransforms de TOUS LES DESCENDANTS (donc `Manometre`, qui pend
            // sous `TopBarSlot` par construction, doctrine — voir `ManometreVerticalOffsetPx`).
            // `topBarB` inclut donc DÉJÀ le débordement réel du médaillon — la 1ʳᵉ version de cet
            // amendement l'étendait UNE SECONDE FOIS (double-compte), ce qui faisait rougir la
            // sonde même après le correctif d'`AppShell.EnterDistrict`. La régression réelle que ce
            // test capturait à l'origine n'était donc pas "topBarB ignore le médaillon" mais
            // "`safeInsetTop` (passé par `EnterDistrict`) ne réservait que 56px NOMINAUX alors que
            // `topBarB` — donc le chrome RÉEL — en occupe `56 + EffectiveBottomOverhangPx`" :
            // `EnterDistrict` réserve désormais la portée EFFECTIVE, donc `topBarB` SEUL (déjà
            // inclusif) redevient la bonne borne à comparer.
            float overhang = shell.TopBar.EffectiveBottomOverhangPx;
            // anti-vacuité (demandée par le contrôleur) : le débordement DOIT être mesuré
            // STRICTEMENT positif — un médaillon recentré par erreur (régression du lot manomètre)
            // ramènerait ce nombre à ~0, et cette assertion perdrait sa raison d'être (topBarB
            // n'aurait alors plus rien d'effectif à prouver au-delà du nominal).
            Assert.Greater(overhang, 4f,
                "anti-vacuité : EffectiveBottomOverhangPx doit être mesuré STRICTEMENT positif (le " +
                "médaillon doit réellement pendre sous la barre, doctrine) — sinon cette assertion " +
                "serait vraie par dégénérescence, pas par une vraie marge réservée");

            Assert.IsFalse(titleB.Intersects(topBarB),
                "nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà " +
                $"inclusives du débordement du médaillon, {overhang:F1}px mesurés) — un titre qui ne " +
                "réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous");

            // Propriété positive qui remplace le confinement retiré : le fond est bien en
            // résolution NATIVE (pas un vestige du confinement de l'ancienne grille).
            //
            // AMENDÉ NOMMÉMENT (2026-08-21, frontière district — même resolution que nav-district-F1,
            // DistrictMapNavigationPlayModeTests.cs) — MESURÉ (Debug.Log injecté puis retiré) : à la
            // résolution de test ACTUELLE (Screen=1080×2400, scaleFactor=0,84375 — Screen.width/1280,
            // AppShell.cs:399), fondHeight=2275,6 < contentHeight=2844,4. La comparaison "fond >
            // ContentSlot" supposait implicitement un device MOINS haut que le fond (portrait proche
            // de 9:16, comme 1080×1920) — vrai à l'ancienne résolution de test, FAUX à 1080×2400 (un
            // aspect ratio 20:9 plus haut, JUSTEMENT le cas que JUGE-D2/DistrictSceneBackdrop couvre,
            // voir DistrictInteriorScreenController.cs:64-82). "dépasse ContentSlot" n'est donc PAS un
            // invariant de "résolution native, aucun rescale" — c'est une COÏNCIDENCE d'aspect ratio.
            // ⇒ Propriété robuste, indépendante du device : le rect du fond doit égaler EXACTEMENT
            // texture/scaleFactor (la définition même de pp-F1 — DistrictInteriorScreenController.cs:97,
            // "sizeDelta = texture/scaleFactor... §2.1 : rect × scaleFactor == tex"), pas une inégalité
            // contre un ContentSlot dont la taille dépend du device. Testé ICI (chemin in-shell, via
            // AppShell) — REUSE de la même formule, pas une nouvelle règle : la falsifiable pp-F1
            // "bare host" existe déjà côté DistrictBackgroundPlayModeTests.cs, celle-ci couvre le
            // chemin de montage RÉEL (nav-F4 exerce shell.EnterDistrict, pas RenderFresh).
            Image fondImg = fondT.GetComponent<Image>();
            Assert.IsNotNull(fondImg?.sprite?.texture, "district 16 — le fond porte un Image avec une texture réelle (pp-F1)");
            Texture2D fondTex = fondImg.sprite.texture;
            Canvas fondCanvas = fondT.GetComponentInParent<Canvas>();
            float fondScaleFactor = (fondCanvas != null && fondCanvas.scaleFactor > 0f) ? fondCanvas.scaleFactor : 1f;
            float expectedFondHeight = fondTex.height / fondScaleFactor;
            float expectedFondWidth = fondTex.width / fondScaleFactor;
            float fondHeight = ((RectTransform)fondT).rect.height;
            float fondWidth = ((RectTransform)fondT).rect.width;
            Assert.AreEqual(expectedFondHeight, fondHeight, 0.05f,
                $"nav-F4 (amendée) — hauteur du fond ({fondHeight:F1}) == texture/scaleFactor ({expectedFondHeight:F1}) : " +
                "résolution NATIVE, pas de rescale, INDÉPENDAMMENT de ContentSlot/du device");
            Assert.AreEqual(expectedFondWidth, fondWidth, 0.05f,
                $"nav-F4 (amendée) — largeur du fond ({fondWidth:F1}) == texture/scaleFactor ({expectedFondWidth:F1}) : idem sur X");
        }

        // ── nav-F4 étendue au district 3 (Tools/pivot-fond-prerendu-design.md §12) — le geste du
        // ⊥, retenu par le design : « la falsifiable est écrite maintenant, elle échoue maintenant
        // [ou pas], et elle porte son mode d'emploi de péremption ». MESURÉ ici (pas supposé) : le
        // pivot P3 supprime l'ancrage vertical `0,46` qui causait le chevauchement mesuré par
        // l'ancien design nav-hud (grille 10×6 du district 3 contre TabBarRoot, ci-dessus, texte
        // original conservé) — il n'y a plus de grille, donc plus d'ancrage 0,46 à ce mécanisme.
        // District 3 (profil "tidewater") n'a de toute façon AUCUN fond en vague 1 (§6 : verge-a
        // seul a une scène). ⇒ **VERTE, et je le dis** : le repli déclaré
        // (DistrictBackgroundPlaceholder) reste CONFINÉ à ContentSlot (Stretch), contrairement au
        // fond natif de district 16 ci-dessus — voir DistrictInteriorScreenController.RenderNightDiorama.

        [UnityTest]
        public IEnumerator NavF4_District3_NoBackgroundYet_PlaceholderStaysConfined_Green()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();

            DistrictInteriorScreenController entered = null;
            yield return EnterDistrictViaRealFlow(shell, 3, s => entered = s);

            Transform sceneT = entered.ScreenRoot.Find("DistrictScene");
            Assert.IsNotNull(sceneT, "pp-F5 — le conteneur existe même sans fond réel");
            Transform placeholderT = sceneT.Find("DistrictBackgroundPlaceholder");
            Assert.IsNotNull(placeholderT, "district 3 (profil tidewater) n'a AUCUN fond en vague 1 — repli déclaré attendu");
            Assert.IsNull(sceneT.Find("DistrictBackgroundImage"), "anti-vacuité — ce n'est PAS le chemin fond réel");

            Transform canvasRoot = shell.ShellCanvas.transform;
            Bounds placeholderB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, (RectTransform)placeholderT);
            Bounds topBarB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, shell.TopBarSlot);
            Bounds tabBarB = RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot, shell.TabBarRoot);

            Assert.IsFalse(placeholderB.Intersects(topBarB),
                "nav-F4/district 3 — GREEN : le repli confiné ne chevauche PAS TopBarSlot (plus d'ancrage 0,46, §12)");
            Assert.IsFalse(placeholderB.Intersects(tabBarB),
                "nav-F4/district 3 — GREEN : le repli confiné ne chevauche PAS TabBarRoot");
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

            // AMENDÉ NOMMÉMENT (2026-08-21, frontière avec le lot manomètre — Shell/TopBarController.cs)
            // — `insetTop` visait `TopBarSlot.rect.height` (56px NOMINAUX) seul ; `AppShell.
            // EnterDistrict` réserve désormais la portée EFFECTIVE (`+TopBar.EffectiveBottomOverhangPx`,
            // MESURÉE en live — le médaillon pend sous la barre par construction, doctrine). Le
            // "56px" du nom de ce test devient un CAS PARTICULIER (le nominal), pas l'écart total —
            // `insetTop` et le delta suivent la MÊME formule que `AppShell.EnterDistrict` calcule
            // réellement, sinon ce test prouverait une propriété que le shell ne garantit plus.
            float overhang = shell.TopBar.EffectiveBottomOverhangPx;
            Assert.Greater(overhang, 4f,
                "anti-vacuité : EffectiveBottomOverhangPx doit être mesuré STRICTEMENT positif — sinon " +
                "l'écart attendu retomberait au nominal 56px par dégénérescence, pas par mesure");
            float insetTop = shell.TopBarSlot.rect.height + overhang;
            Assert.Greater(insetTop, 0f,
                "nav-F5 — insetTop > 0 ASSERTÉ D'ABORD : sinon un écart nul rendrait l'assertion suivante vraie sans rien prouver");

            float shellTitleY = ((RectTransform)entered.ScreenRoot.Find("DistrictTitle")).anchoredPosition.y;
            Assert.AreEqual(-(8f + insetTop), shellTitleY, 0.01f, "dans le shell : anchoredPosition.y == -(8+insetTop)");

            float delta = shellTitleY - bareTitleY;
            Assert.AreEqual(-insetTop, delta, 0.01f,
                $"nav-F5 — écart attendu : {insetTop:F1}px (TopBarSlot.rect.height {shell.TopBarSlot.rect.height} " +
                $"+ débordement médaillon {overhang:F1})");
        }
    }
}
