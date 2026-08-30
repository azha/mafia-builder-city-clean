using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Tests; // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // MANDAT MESURE (pas correctif) — item 0.5, après le correctif B2 (revue ⊥ item05-C2, commit
    // 51680b3) : les 4 panneaux de l'Accueil sont désormais bornés dans [BottomInsetPx, hauteur −
    // TopInsetPx] (`AppShell.NouveauPanneauAccueil`). Ce correctif est vérifié par CALCUL
    // (`CharpenteAccueilPanneauxPlayModeTests.C2_...B2`, qui lit les 4 coins RÉELS du RectTransform
    // du panneau LUI-MÊME) — mais TOUJOURS à la résolution de la scène de démarrage du build
    // (640×480 en batchmode, jamais un téléphone réel), et JAMAIS PHOTOGRAPHIÉ. Son auteur a
    // consigné, honnêtement, un doute non résolu : « HighestLeverageCardController déborde
    // PROBABLEMENT de sa bande à 25 % — à confirmer ».
    //
    // Deux questions, tranchées ici PAR L'IMAGE et par la géométrie RÉELLE lue sur l'instance
    // vivante au moment de la capture (jamais recalculée à la main depuis les constantes) :
    //   1. les 4 panneaux sont-ils recouverts par TopBarSlot/TabBarRoot (le bandeau, le dock) ?
    //   2. le CONTENU (les `Graphic` descendants — texte, boutons) de chaque panneau déborde-t-il
    //      de SA PROPRE bande (son propre RectTransform), à la baisse (vers le panneau du dessous)
    //      ou à la hausse ?
    // Aucune maquette ratifiée n'existe pour cet écran ④ (front.md) — ce n'est donc PAS un
    // juge-visuel (rien à comparer) : une mesure de bords.
    //
    // Patron de scène : IDENTIQUE à `CharpenteAccueilPanneauxPlayModeTests` (scène de démarrage du
    // build, chargée par SON INDEX — pas un AppShell fabriqué à la main comme dans
    // `VuePrincipaleCapturePlayModeTests` — c'est le chemin qu'un joueur emprunte réellement) et à
    // SON compte SEEDÉ (`operational_demo@example.test`, MÊME identité que le défaut compilé
    // d'`AppShell.demoIdentifier` — voir son commentaire) : un MONDE RÉEL (carte de décision +
    // file d'exceptions non vides) plutôt qu'un compte frais vidé de contenu, parce que le risque
    // mesuré ici (débordement de CONTENU) est SOUS-ESTIMÉ par un panneau vide. DUPLIQUÉ plutôt que
    // factorisé — consigne déjà établie par ce lot (`CharpenteOuvertureSessionOverlayPlayModeTests.
    // cs:35-37`, recitée par le fichier frère).
    //
    // Capture : MÊME patron que `VuePrincipaleCapturePlayModeTests.CapturerA` (canvas basculé en
    // `ScreenSpaceCamera` sur une caméra visant une `RenderTexture` de la taille cible — c'est ce
    // qui contourne `-screen-width` IGNORÉ en batchmode, `Screen.width` restant bloqué à 640) —
    // jamais réinventé, mais SANS l'appel `DistrictInteriorScreenController.RebatirPourResolution
    // Courante()` (hors sujet ici — aucun district n'est entré par ce test) et AVEC un contrôle
    // explicite, AVANT de faire confiance à quoi que ce soit : `RebatirChromePourResolutionCourante()`
    // est-il TOUJOURS le no-op géométrique que son propre docstring promet (round 15) ? Si NON,
    // cette capture (et par ricochet celles de `VuePrincipaleCapturePlayModeTests`, qui appelle la
    // MÊME méthode) mesurerait un monde fictif.
    //
    // ⛔⛔ AMENDÉ (C3, Tools/charpente-item05-C3-implementation-notes.md) — LE PARAGRAPHE CI-DESSUS
    // ÉTAIT EXACT JUSQU'À CE CHUNK ET NE L'EST PLUS SUR UN POINT : « SANS l'appel … Courante() »
    // ne visait que le district (« hors sujet ici »), mais ce fichier n'avait effectivement AUCUN
    // équivalent pour les 4 panneaux de l'Accueil — c'est le confound que documente le § « CONTRÔLE
    // DU CONFOUND » plus bas (« rien ne rejoue NouveauPanneauAccueil après la bascule … contrairement
    // au district, qui a SA PROPRE méthode dédiée »). `MesurerEtCapturer` appelle désormais AUSSI
    // `AppShell.RebatirPanneauxAccueilPourResolutionCourante()`, juste après
    // `RebatirChromePourResolutionCourante()` (dont elle dépend — voir l'ordre d'appel imposé par
    // le docstring de la méthode) : le trou est FERMÉ, pas seulement documenté.
    [Category("Charpente")]
    public class AccueilPanneauxGeometriePhotoPlayModeTests
    {
        private const string OperationalEmail = "operational_demo@example.test";
        private const string OperationalPassword = "operational-demo-pw";

        private Scene sceneDeDemarrage;

        [OneTimeSetUp]
        public void SeedOperationalDemo()
        {
            SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
        }

        // Même garde de co-tenance que les 3 autres fixtures Charpente — un Canvas/AppShell résiduel
        // d'un test antérieur du MÊME domaine PlayMode ferait bâtir la barre du shell de CETTE scène
        // dans la scène du voisin.
        [UnitySetUp]
        public IEnumerator SetUp()
        {
            int shellsTues = 0, canvasTues = 0, locatairesTues = 0;
            foreach (AppShell reste in Object.FindObjectsByType<AppShell>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (reste.ShellCanvas != null) { Object.DestroyImmediate(reste.ShellCanvas.gameObject); canvasTues++; }
                Object.DestroyImmediate(reste.gameObject);
                shellsTues++;
            }
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                Object.DestroyImmediate(reste.gameObject);
                canvasTues++;
            }
            foreach (MonoBehaviour comportement in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (comportement != null && comportement is IShellTenant)
                {
                    Object.DestroyImmediate(comportement.gameObject);
                    locatairesTues++;
                }
            }
            Debug.Log($"[Charpente] SetUp (photo géométrie Accueil) — régime déclaré : {shellsTues} AppShell, " +
                      $"{canvasTues} Canvas et {locatairesTues} IShellTenant résiduels détruits avant le chargement.");
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            LogAssert.ignoreFailingMessages = false;
            if (sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded)
            {
                AsyncOperation dechargement = SceneManager.UnloadSceneAsync(sceneDeDemarrage);
                while (dechargement != null && !dechargement.isDone) yield return null;
            }
            sceneDeDemarrage = default;
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                Object.Destroy(reste.gameObject);
            yield return null;
        }

        private static AppShell SondeShellDansLaScene(Scene scene)
        {
            if (!scene.IsValid() || !scene.isLoaded) return null;
            foreach (GameObject racine in scene.GetRootGameObjects())
            {
                AppShell trouve = racine.GetComponentInChildren<AppShell>(true);
                if (trouve != null) return trouve;
            }
            return null;
        }

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            LogAssert.ignoreFailingMessages = true;

            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1,
                "Build Settings vides : aucune scène de démarrage ⇒ un build ne montrerait AUCUN écran.");
            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            Assert.IsNotEmpty(chemin, "la scène d'index de build 0 n'a pas de chemin");

            AsyncOperation chargement = SceneManager.LoadSceneAsync(0, LoadSceneMode.Additive);
            Assert.IsNotNull(chargement, "LoadSceneAsync(0) a refusé l'index de build 0");
            while (!chargement.isDone) yield return null;

            sceneDeDemarrage = SceneManager.GetSceneByBuildIndex(0);
            Assert.IsTrue(sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded,
                "la scène d'index de build 0 n'est pas chargée");
            Assert.AreEqual(chemin, sceneDeDemarrage.path,
                "la scène chargée n'est pas celle de l'index de build 0");

            yield return null; // Start() d'AppShell : EnsureInitialized() y bâtit tout le chrome, synchrone.
        }

        private static IEnumerator WaitForEmpireMounted(AppShell shell)
        {
            float elapsed = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                "acquisition de session propre du shell résolue (Empire monté) — précondition avant de mesurer l'Accueil");
        }

        // ── Petit rectangle en PIXELS D'ÉCRAN (le repère de la capture RÉELLE, origine bas-gauche —
        //    MÊME convention que `ReadPixels`/`Camera.WorldToScreenPoint`, aucune conversion requise
        //    entre les deux). ──
        private struct RectPx
        {
            public float xMin, yMin, xMax, yMax;
            public float Width => xMax - xMin;
            public float Height => yMax - yMin;
            public float Area => Mathf.Max(0f, Width) * Mathf.Max(0f, Height);
            public override string ToString() =>
                $"[{xMin:F1},{yMin:F1} .. {xMax:F1},{yMax:F1}] ({Width:F1}×{Height:F1})";
        }

        /// <summary>Projette les 4 coins RÉELS du RectTransform (`GetWorldCorners`, jamais recalculé
        /// à la main) à travers LA MÊME caméra que celle qui a produit la capture — la boîte
        /// englobante en pixels d'écran EST ce que la photo montre, par construction.</summary>
        private static RectPx ScreenAabb(RectTransform rt, Camera cam)
        {
            var corners = new Vector3[4];
            rt.GetWorldCorners(corners);
            float xMin = float.MaxValue, yMin = float.MaxValue, xMax = float.MinValue, yMax = float.MinValue;
            foreach (Vector3 world in corners)
            {
                Vector3 sp = cam.WorldToScreenPoint(world);
                xMin = Mathf.Min(xMin, sp.x); xMax = Mathf.Max(xMax, sp.x);
                yMin = Mathf.Min(yMin, sp.y); yMax = Mathf.Max(yMax, sp.y);
            }
            return new RectPx { xMin = xMin, yMin = yMin, xMax = xMax, yMax = yMax };
        }

        private static RectPx UnionAabb(IEnumerable<RectPx> rects)
        {
            float xMin = float.MaxValue, yMin = float.MaxValue, xMax = float.MinValue, yMax = float.MinValue;
            bool any = false;
            foreach (RectPx r in rects)
            {
                any = true;
                xMin = Mathf.Min(xMin, r.xMin); xMax = Mathf.Max(xMax, r.xMax);
                yMin = Mathf.Min(yMin, r.yMin); yMax = Mathf.Max(yMax, r.yMax);
            }
            return any ? new RectPx { xMin = xMin, yMin = yMin, xMax = xMax, yMax = yMax }
                       : new RectPx { xMin = 0, yMin = 0, xMax = 0, yMax = 0 };
        }

        private static float OverlapAreaPx(RectPx a, RectPx b)
        {
            float ox = Mathf.Max(0f, Mathf.Min(a.xMax, b.xMax) - Mathf.Max(a.xMin, b.xMin));
            float oy = Mathf.Max(0f, Mathf.Min(a.yMax, b.yMax) - Mathf.Max(a.yMin, b.yMin));
            return ox * oy;
        }

        [UnityTest]
        public IEnumerator MesureGeometrie_AccueilPanneaux_1080x1920_et_1080x2400_SEEDE_OperationalDemo()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);

            HighestLeverageCardController hlCard = null;
            ExceptionQueuePanelController exceptions = null;
            OrgVitalsPanelController orgVitals = null;
            HomeChromeController homeChrome = null;
            float ecouleMontage = 0f;
            while (ecouleMontage < 10f &&
                   (hlCard == null || exceptions == null || orgVitals == null || homeChrome == null))
            {
                hlCard = shell.ContentSlot.GetComponentInChildren<HighestLeverageCardController>(false);
                exceptions = shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(false);
                orgVitals = shell.ContentSlot.GetComponentInChildren<OrgVitalsPanelController>(false);
                homeChrome = shell.ContentSlot.GetComponentInChildren<HomeChromeController>(false);
                ecouleMontage += Time.deltaTime;
                yield return null;
            }
            // Anti-mensonge : sans les 4, toute mesure qui suit porterait sur un sous-ensemble et
            // le rapporterait comme complet.
            Assert.IsNotNull(hlCard, "HighestLeverageCardController doit être monté avant de le mesurer");
            Assert.IsNotNull(exceptions, "ExceptionQueuePanelController doit être monté avant de le mesurer");
            Assert.IsNotNull(orgVitals, "OrgVitalsPanelController doit être monté avant de le mesurer");
            Assert.IsNotNull(homeChrome, "HomeChromeController doit être monté avant de le mesurer");

            // Diagnostic (pas une assertion) : ContentSlot AVANT tout basculement de résolution —
            // c'est CETTE valeur (et celle de `ShellChrome.Top/BottomInsetPx`, dérivées de
            // TopBarSlot/TabBarRoot au même instant) qui a servi à calculer les 4 bandes fixes des
            // panneaux (`AppShell.NouveauPanneauAccueil`, appelé UNE fois, jamais rejoué par
            // `RebatirChromePourResolutionCourante`). Si `ContentSlot.rect.height` change de valeur
            // une fois basculé sur la cible de capture (ci-dessous), les 4 bandes — offsets FIXES
            // en unités de canvas — resteraient calculées pour CETTE hauteur-ci, pas celle du
            // téléphone visé : c'est exactement la classe de défaut que
            // `DistrictInteriorScreenController.RebatirPourResolutionCourante()` existe pour
            // fermer, et rien d'équivalent n'existe pour ces 4 panneaux.
            Debug.Log($"[GEOM diag] AVANT bascule — ContentSlot.rect={shell.ContentSlot.rect} " +
                      $"ShellChrome.Top={ShellChrome.TopInsetPx:F1} ShellChrome.Bottom={ShellChrome.BottomInsetPx:F1} " +
                      $"Screen={Screen.width}x{Screen.height} canvas.scaleFactor={shell.ShellCanvas.scaleFactor:F4}");

            // ⚠️ Les violations sont COLLECTÉES, jamais assertées panneau par panneau : un `Assert`
            // qui rougit au 1er panneau de la 1ère résolution ferait avorter la coroutine AVANT même
            // d'avoir capturé la 2ème résolution — exactement l'inverse de ce que ce mandat demande
            // (« colle la table COMPLÈTE, 4 panneaux × 2 résolutions »). La mesure d'abord, PARTOUT ;
            // le verdict ENSUITE, une seule fois, sur tout ce qui a été mesuré.
            var constats = new List<string>();

            yield return MesurerEtCapturer(shell, hlCard, exceptions, orgVitals, homeChrome,
                1080, 1920, "Assets/Screenshots/accueil_panneaux_geometrie_1080x1920.png", constats);
            yield return MesurerEtCapturer(shell, hlCard, exceptions, orgVitals, homeChrome,
                1080, 2400, "Assets/Screenshots/accueil_panneaux_geometrie_1080x2400.png", constats);

            Debug.Log("[Charpente] MESURE géométrique + photographique des 4 panneaux de l'Accueil " +
                      "terminée — voir les lignes [GEOM]/[NO-OP]/[CAPTURE] ci-dessus pour la table complète. " +
                      $"{constats.Count} constat(s) hors tolérance.");

            // Verdict UNIQUE, à la fin, sur l'ensemble des deux résolutions — jamais un `Assert` par
            // panneau (voir commentaire ci-dessus). Si ceci rougit, c'est une MESURE confirmée, pas
            // une régression de ce test : le correctif appartient à un autre round, avec sa revue ⊥
            // (ne pas assouplir ce seuil pour faire passer la couleur au vert).
            Assert.IsEmpty(constats,
                $"{constats.Count} écart(s) hors tolérance sur les 4 panneaux × 2 résolutions :\n" +
                string.Join("\n", constats));
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // CONTRÔLE DU CONFOUND — le test ci-dessus mesure des panneaux dont la BANDE a été calculée
        // avec `ContentSlot.rect.height` = celui du canvas AU MOMENT DU MONTAGE (`MonterPanneaux
        // Accueil`, appelé pendant l'acquisition de session, AVANT tout basculement vers la cible
        // de capture) — mesuré : 960 unités de canvas (Screen=640×480, le défaut batchmode). La
        // photo, elle, est prise APRÈS bascule vers 1080×1920/2400 (2275,56/2844,44 unités). RIEN ne
        // rejoue `NouveauPanneauAccueil` après la bascule — contrairement au district, qui a SA
        // PROPRE méthode dédiée (`DistrictInteriorScreenController.RebatirPourResolutionCourante`).
        // La bande mesurée là-bas est donc celle d'un canvas 960 unités, jamais celle d'un téléphone
        // 1080×1920 réel — un confound de méthode, pas nécessairement un défaut de production.
        //
        // ⇒ Ce test répond à la question que ce confound laisse ouverte, en éliminant la variable :
        // AUCUN appareil réel ne démarre à 640×480 puis se redimensionne — un joueur voit SA
        // résolution DÈS LA PREMIÈRE frame. `AppShell.BuildLayout()` RÉUTILISE un Canvas déjà
        // présent dans la scène (`FindFirstObjectByType<Canvas>()`, voir son propre commentaire) —
        // on en pose donc un, DÉJÀ en `ScreenSpaceCamera` sur une caméra visant une RenderTexture
        // 1080×1920, AVANT d'instancier l'AppShell : son tout premier calcul de `ContentSlot.rect.
        // height` voit alors directement la valeur d'un téléphone réel, sans transition.
        //
        // Si le débordement de contenu (HighestLeverageCard, ExceptionQueue) PERSISTE ici, c'est un
        // vrai défaut de dimensionnement (le contenu ne tient pas dans SA bande, quelle que soit la
        // résolution). S'il DISPARAÎT, le test précédent mesurait un artefact de méthode (bande
        // jamais reconstruite après un redimensionnement que la production ne fait jamais subir).
        //
        // ⛔⛔ AMENDÉ (C3) — « RIEN ne rejoue `NouveauPanneauAccueil` après la bascule » (plus haut
        // dans ce paragraphe) décrivait le test ci-dessus AVANT `AppShell.RebatirPanneauxAccueil
        // PourResolutionCourante()` : `MesurerEtCapturer` le rejoue désormais, donc le confound
        // qu'énumère ce paragraphe est fermé au lieu de courir. Ce test-CI reste néanmoins la bonne
        // expérience à une seule variable (il ne dépend d'AUCUN rebuild pour être correct — le
        // montage est natif dès la frame 1) : les DEUX tests doivent maintenant converger vers 0,00 %
        // de débordement ; s'ils divergent, c'est que le hook C3 ne ferme pas la cause qu'il prétend
        // fermer, et ça se lit ici avant même d'ouvrir les logs de l'autre.
        [UnityTest]
        public IEnumerator MesureGeometrie_AccueilPanneaux_MontageNatif1080x1920_SEEDE_OperationalDemo()
        {
            const int Largeur = 1080, Hauteur = 1920;
            const string Chemin = "Assets/Screenshots/accueil_panneaux_geometrie_1080x1920_montage_natif.png";

            GameObject canvasGo = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = canvasGo.GetComponent<Canvas>();
            CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f); // REUSE — AppShell.BuildLayout() pose la même valeur

            var rt = new RenderTexture(Largeur, Hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("MontageNatifCam");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            GameObject shellGo = new GameObject("AccueilNatifShell");
            AppShell shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(OperationalEmail, OperationalPassword);
            yield return null; // Start() construit le chrome DANS ce canvas déjà à la bonne taille

            Assert.AreSame(canvas, shell.ShellCanvas,
                "AppShell doit avoir RÉUTILISÉ le Canvas pré-posé (FindFirstObjectByType), pas en avoir créé " +
                "un autre — sinon cette expérience ne contrôle rien.");

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            yield return WaitForEmpireMounted(shell);

            HighestLeverageCardController hlCard = null;
            ExceptionQueuePanelController exceptions = null;
            OrgVitalsPanelController orgVitals = null;
            HomeChromeController homeChrome = null;
            float ecouleMontage = 0f;
            while (ecouleMontage < 10f &&
                   (hlCard == null || exceptions == null || orgVitals == null || homeChrome == null))
            {
                hlCard = shell.ContentSlot.GetComponentInChildren<HighestLeverageCardController>(false);
                exceptions = shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(false);
                orgVitals = shell.ContentSlot.GetComponentInChildren<OrgVitalsPanelController>(false);
                homeChrome = shell.ContentSlot.GetComponentInChildren<HomeChromeController>(false);
                ecouleMontage += Time.deltaTime;
                yield return null;
            }
            Assert.IsNotNull(hlCard, "HighestLeverageCardController doit être monté avant de le mesurer");
            Assert.IsNotNull(exceptions, "ExceptionQueuePanelController doit être monté avant de le mesurer");
            Assert.IsNotNull(orgVitals, "OrgVitalsPanelController doit être monté avant de le mesurer");
            Assert.IsNotNull(homeChrome, "HomeChromeController doit être monté avant de le mesurer");

            Canvas.ForceUpdateCanvases();
            yield return null;
            Debug.Log($"[GEOM diag NATIF {Largeur}x{Hauteur}] ContentSlot.rect={shell.ContentSlot.rect} " +
                      $"canvas.scaleFactor={canvas.scaleFactor:F4} ShellChrome.Top={ShellChrome.TopInsetPx:F1} " +
                      $"ShellChrome.Bottom={ShellChrome.BottomInsetPx:F1}");

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(Largeur, Hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, Largeur, Hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(Chemin, tex.EncodeToPNG());
            int clairs = 0;
            foreach (Color c in tex.GetPixels()) if (c.r + c.g + c.b > 0.15f) clairs++;
            Debug.Log($"[CAPTURE] {Chemin} {Largeur}x{Hauteur} — {clairs} pixels non noirs sur {Largeur * Hauteur}");
            Assert.Greater(clairs, Largeur * Hauteur / 20, $"{Chemin} est quasi NOIRE ({clairs} pixels).");

            RectPx topBarRect = ScreenAabb(shell.TopBarSlot, cam);
            RectPx tabBarRect = ScreenAabb(shell.TabBarRoot, cam);
            Debug.Log($"[GEOM NATIF {Largeur}x{Hauteur}] TopBarSlot={topBarRect} TabBarRoot={tabBarRect} " +
                      $"ContentSlot.rect={shell.ContentSlot.rect}");

            var panneaux = new (string nom, RectTransform rt)[]
            {
                (nameof(HighestLeverageCardController), (RectTransform)hlCard.transform),
                (nameof(ExceptionQueuePanelController), (RectTransform)exceptions.transform),
                (nameof(OrgVitalsPanelController), (RectTransform)orgVitals.transform),
                (nameof(HomeChromeController), (RectTransform)homeChrome.transform),
            };
            foreach ((string nom, RectTransform panelRt) in panneaux)
            {
                RectPx panelRect = ScreenAabb(panelRt, cam);
                float overlapTop = OverlapAreaPx(panelRect, topBarRect);
                float overlapBar = OverlapAreaPx(panelRect, tabBarRect);
                float area = Mathf.Max(1f, panelRect.Area);
                Graphic[] graphics = panelRt.GetComponentsInChildren<Graphic>(false);
                RectPx contenu = graphics.Length > 0
                    ? UnionAabb(graphics.Select(g => ScreenAabb(g.rectTransform, cam)))
                    : panelRect;
                float debordHautPx = contenu.yMax - panelRect.yMax;
                float debordBasPx = panelRect.yMin - contenu.yMin;
                float hauteurBande = Mathf.Max(1f, panelRect.Height);
                Debug.Log($"[GEOM NATIF {Largeur}x{Hauteur}] {nom} rect={panelRect} " +
                          $"recouvrementTopBar={overlapTop:F1}px² ({overlapTop / area * 100f:F2}%) " +
                          $"recouvrementTabBar={overlapBar:F1}px² ({overlapBar / area * 100f:F2}%) " +
                          $"contenu={contenu} nGraphics={graphics.Length} " +
                          $"debordHaut={debordHautPx:F1}px ({debordHautPx / hauteurBande * 100f:F2}%) " +
                          $"debordBas={debordBasPx:F1}px ({debordBasPx / hauteurBande * 100f:F2}%)");
            }

            Object.DestroyImmediate(tex);
            Object.Destroy(shellGo);
            Object.Destroy(canvasGo);
            Object.Destroy(camGo);
            rt.Release();
            Object.DestroyImmediate(rt);
        }

        /// <summary>Rend le shell hors écran à `largeur`×`hauteur` (patron `VuePrincipaleCapturePlayModeTests.
        /// CapturerA`, sans le geste spécifique au district) et MESURE, sur l'instance VIVANTE au
        /// moment de la capture : le recouvrement de chaque panneau par TopBarSlot/TabBarRoot, et le
        /// débordement de son propre contenu (`Graphic` descendants) hors de sa propre bande. Vérifie
        /// D'ABORD que `RebatirChromePourResolutionCourante()` — appelé ici comme dans `CapturerA` —
        /// est bien le no-op géométrique que son docstring promet, sur CETTE bascule de résolution
        /// précise : sinon toute mesure qui suit daterait d'un monde que la photo ne montre pas.</summary>
        private IEnumerator MesurerEtCapturer(AppShell shell,
            HighestLeverageCardController hlCard, ExceptionQueuePanelController exceptions,
            OrgVitalsPanelController orgVitals, HomeChromeController homeChrome,
            int largeur, int hauteur, string chemin, List<string> constats)
        {
            Canvas canvas = shell.ShellCanvas;
            Assert.IsNotNull(canvas, "le shell doit avoir un canvas pour être rendu hors écran");
            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("MesureGeometrieCam");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;
            Canvas.ForceUpdateCanvases();
            yield return null;

            Debug.Log($"[GEOM diag {largeur}x{hauteur}] APRÈS bascule ScreenSpaceCamera, AVANT RebatirChrome — " +
                      $"ContentSlot.rect={shell.ContentSlot.rect} canvas.scaleFactor={canvas.scaleFactor:F4}");

            // ── Contrôle : RebatirChromePourResolutionCourante() est-il un no-op géométrique ICI ? ──
            RectPx topBarAvant = ScreenAabb(shell.TopBarSlot, cam);
            RectPx tabBarAvant = ScreenAabb(shell.TabBarRoot, cam);

            shell.RebatirChromePourResolutionCourante();
            Canvas.ForceUpdateCanvases();
            yield return null;

            RectPx topBarApres = ScreenAabb(shell.TopBarSlot, cam);
            RectPx tabBarApres = ScreenAabb(shell.TabBarRoot, cam);
            Debug.Log($"[GEOM diag {largeur}x{hauteur}] APRÈS RebatirChrome — " +
                      $"ContentSlot.rect={shell.ContentSlot.rect} canvas.scaleFactor={canvas.scaleFactor:F4}");

            const float EpsilonNoOpPx = 0.75f; // arrondi/anti-crénelage — pas une marge de confort
            bool topBarNoOp = RectsEqual(topBarAvant, topBarApres, EpsilonNoOpPx);
            bool tabBarNoOp = RectsEqual(tabBarAvant, tabBarApres, EpsilonNoOpPx);
            Debug.Log($"[NO-OP {largeur}x{hauteur}] TopBarSlot avant={topBarAvant} après={topBarApres} noOp={topBarNoOp} — " +
                      $"TabBarRoot avant={tabBarAvant} après={tabBarApres} noOp={tabBarNoOp}");
            Assert.IsTrue(topBarNoOp,
                $"RebatirChromePourResolutionCourante() a CHANGÉ TopBarSlot à {largeur}x{hauteur} " +
                $"({topBarAvant} -> {topBarApres}) : son docstring (round 15) promet un no-op géométrique — " +
                "si ceci rougit, la capture qui suit (et celles de VuePrincipaleCapturePlayModeTests, qui " +
                "appelle la MÊME méthode) mesure un monde que le docstring ne décrit plus.");
            Assert.IsTrue(tabBarNoOp,
                $"idem pour TabBarRoot à {largeur}x{hauteur} ({tabBarAvant} -> {tabBarApres}).");

            // ── C3 (Tools/charpente-item05-C3-implementation-notes.md) — LA CAUSE, pas un
            // ajustement de seuil. Le patron `CapturerA` (dont ce helper est une copie assumée,
            // voir le commentaire de classe) rejoue déjà `RebatirPourResolutionCourante()` pour le
            // district ; il n'existait rien d'équivalent pour les 4 panneaux de l'Accueil avant ce
            // chunk — c'est EXACTEMENT le confound que ce fichier documentait. Après
            // `RebatirChromePourResolutionCourante()` (qui vient de republier
            // `ShellChrome.Top/BottomInsetPx`, dont dépend la géométrie des panneaux — voir l'ordre
            // d'appel imposé par son propre docstring), on recuit leur bande pour la résolution
            // ACTUELLE. Sans destruction en jeu (contrairement au district) : un seul
            // `ForceUpdateCanvases` + une frame suffisent pour que les LayoutGroups internes
            // se recalent. No-op si l'onglet monté n'est pas l'Accueil (liste vide).
            shell.RebatirPanneauxAccueilPourResolutionCourante();
            Canvas.ForceUpdateCanvases();
            yield return null;

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // ⛔ ANTI-MENSONGE : une cible noire produirait un PNG parfaitement valide et vide.
            int clairs = 0;
            foreach (Color c in tex.GetPixels()) if (c.r + c.g + c.b > 0.15f) clairs++;
            Debug.Log($"[CAPTURE] {chemin} {largeur}x{hauteur} — {clairs} pixels non noirs sur {largeur * hauteur}");
            Assert.Greater(clairs, largeur * hauteur / 20,
                $"{chemin} est quasi NOIRE ({clairs} pixels) : le shell n'a pas été rendu dans la cible.");

            // ── Rects RÉELS (mêmes coordonnées que la photo) des 2 barres et des 4 panneaux ──
            RectPx topBarRect = ScreenAabb(shell.TopBarSlot, cam);
            RectPx tabBarRect = ScreenAabb(shell.TabBarRoot, cam);
            Debug.Log($"[GEOM {largeur}x{hauteur}] TopBarSlot={topBarRect} TabBarRoot={tabBarRect} " +
                      $"ContentSlot.rect={shell.ContentSlot.rect} canvas.scaleFactor={canvas.scaleFactor:F4}");

            var panneaux = new (string nom, RectTransform rt)[]
            {
                (nameof(HighestLeverageCardController), (RectTransform)hlCard.transform),
                (nameof(ExceptionQueuePanelController), (RectTransform)exceptions.transform),
                (nameof(OrgVitalsPanelController), (RectTransform)orgVitals.transform),
                (nameof(HomeChromeController), (RectTransform)homeChrome.transform),
            };

            // Tolérance pour l'anti-crénelage/arrondi de bord — pas une marge de confort sur le
            // FOND du défaut. Un recouvrement/débordement RÉEL, à ces résolutions, se mesure en
            // dizaines à centaines de pixels (voir B2 : 51,8 %/29,8 % AVANT correctif) — cette
            // tolérance ne peut masquer que du bruit de rastérisation, jamais une vraie régression.
            const float TolerancePct = 1.0f;
            const float ToleranceDebordPx = 2.0f;

            foreach ((string nom, RectTransform panelRt) in panneaux)
            {
                RectPx panelRect = ScreenAabb(panelRt, cam);
                float overlapTop = OverlapAreaPx(panelRect, topBarRect);
                float overlapBar = OverlapAreaPx(panelRect, tabBarRect);
                float area = Mathf.Max(1f, panelRect.Area);
                float pctTop = overlapTop / area * 100f;
                float pctBar = overlapBar / area * 100f;

                Graphic[] graphics = panelRt.GetComponentsInChildren<Graphic>(false);
                RectPx contenu = graphics.Length > 0
                    ? UnionAabb(graphics.Select(g => ScreenAabb(g.rectTransform, cam)))
                    : panelRect;
                float debordHautPx = contenu.yMax - panelRect.yMax;   // >0 : le contenu dépasse EN HAUT de sa bande
                float debordBasPx = panelRect.yMin - contenu.yMin;    // >0 : le contenu dépasse EN BAS de sa bande
                float hauteurBande = Mathf.Max(1f, panelRect.Height);

                Debug.Log($"[GEOM {largeur}x{hauteur}] {nom} rect={panelRect} " +
                          $"recouvrementTopBar={overlapTop:F1}px² ({pctTop:F2}%) " +
                          $"recouvrementTabBar={overlapBar:F1}px² ({pctBar:F2}%) " +
                          $"contenu={contenu} nGraphics={graphics.Length} " +
                          $"debordHaut={debordHautPx:F1}px ({debordHautPx / hauteurBande * 100f:F2}%) " +
                          $"debordBas={debordBasPx:F1}px ({debordBasPx / hauteurBande * 100f:F2}%)");

                // ⚠️ COLLECTÉ, jamais asserté ici — voir le commentaire au site d'appel : un
                // `Assert` qui rougit sur le 1er panneau ferait avorter la coroutine avant même
                // d'avoir mesuré les 3 autres, ni la 2ème résolution.
                if (pctTop > TolerancePct)
                    constats.Add($"{nom} à {largeur}x{hauteur} : {pctTop:F2}% de sa surface est recouverte par " +
                        $"TopBarSlot (rect panneau {panelRect}, rect bandeau {topBarRect}) — le bandeau le masque.");
                if (pctBar > TolerancePct)
                    constats.Add($"{nom} à {largeur}x{hauteur} : {pctBar:F2}% de sa surface est recouverte par " +
                        $"TabBarRoot (rect panneau {panelRect}, rect dock {tabBarRect}) — le dock le masque.");
                if (debordHautPx > ToleranceDebordPx)
                    constats.Add($"{nom} à {largeur}x{hauteur} : son CONTENU déborde de {debordHautPx:F1}px " +
                        $"AU-DESSUS de sa propre bande ({panelRect}) — contenu mesuré {contenu}.");
                if (debordBasPx > ToleranceDebordPx)
                    constats.Add($"{nom} à {largeur}x{hauteur} : son CONTENU déborde de {debordBasPx:F1}px " +
                        $"SOUS sa propre bande ({panelRect}) — contenu mesuré {contenu}. Si ceci porte sur " +
                        "HighestLeverageCardController, c'est le doute consigné par l'auteur de B2 (« déborde " +
                        "probablement de sa bande à 25% ») qui vient d'être CONFIRMÉ par la photo — le " +
                        "correctif appartient à un autre round, avec sa revue ⊥ (ne pas assouplir la " +
                        "tolérance ci-dessus pour faire passer la couleur au vert).");
            }

            Object.DestroyImmediate(tex);
            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.DestroyImmediate(camGo);
            rt.Release();
            Object.DestroyImmediate(rt);
            Canvas.ForceUpdateCanvases();
            yield return null;
        }

        private static bool RectsEqual(RectPx a, RectPx b, float epsilonPx) =>
            Mathf.Abs(a.xMin - b.xMin) < epsilonPx && Mathf.Abs(a.xMax - b.xMax) < epsilonPx &&
            Mathf.Abs(a.yMin - b.yMin) < epsilonPx && Mathf.Abs(a.yMax - b.yMax) < epsilonPx;
    }
}
