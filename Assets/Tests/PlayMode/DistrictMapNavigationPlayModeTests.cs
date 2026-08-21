using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs, DistrictMapNavigation
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // nav-district (pan+zoom) — pièce manquante mesurée : le fond fait 1080×1920, la fenêtre n'en
    // montre que 720px de haut sans AUCUN mécanisme de défilement, et les 4 bâtiments du starter kit
    // tombent hors de cette bande (Tools/district-v2-reimport-implementation-notes.md §6, Défaut 2 —
    // preuve : Assets/Screenshots/district_v2_starter_kit_4buildings.png). Ce fichier porte les
    // falsifiables demandées : (a) pan borné, (b) bit-exactité à l'échelle de référence encore
    // vraie (condition nécessaire — la preuve SUFFISANTE est une capture + sonde, voir
    // Tools/district-v2-navigation-implementation-notes.md), (c) un bâtiment suit EXACTEMENT le
    // fond (mesuré, plusieurs échelles/positions), (d) aucune perspective (prouvé sur la matrice).
    // Plus : cadrage initial (barycentre), palier de zoom borné, filtrage POINT/BILINEAR par palier,
    // le titre jamais recouvert (régression du "Ver" tronqué mesuré sur la capture), et la
    // régression de l'artefact fond→§6 (labOv.fen/stashOv.fen recâblés sur un legacy pré-P3).
    //
    // Patron "bare" REUSE tel quel (DistrictBackgroundPlayModeTests.cs, même assembly, même
    // rationale : "own precondition, no shared state — charter 27, a FRESH account per test").
    [Category("W3U2")]
    public class DistrictMapNavigationPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int VergeADistrictId = 16; // onboarding-grant.service.ts:112 — starter kit, profile "verge"
        private static int callsignSeq;

        private GameObject bareHostGo;

        [TearDown]
        public void TearDown()
        {
            if (bareHostGo != null)
            {
                var diorama = bareHostGo.GetComponent<DistrictInteriorScreenController>();
                if (diorama != null && diorama.ScreenRoot != null)
                {
                    Canvas c = diorama.ScreenRoot.GetComponentInParent<Canvas>();
                    if (c != null) Object.Destroy(c.gameObject); // a bare (no-shell) diorama builds its OWN Canvas
                }
                Object.Destroy(bareHostGo);
            }
        }

        private static IEnumerator SignUpAndOpenSession(string tag, Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign(tag, ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "nav-district-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-nav-district", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        /// <summary>Own precondition, no shared state (charter 27) — a FRESH account per test, real
        /// district-16 (verge-a) payload — the only district with a real fond in vague 1, and the
        /// one whose starter kit motivates this whole chunk.</summary>
        private static IEnumerator FetchInterior(string tag, Action<DistrictInteriorDto> onDto)
        {
            string token = null;
            yield return SignUpAndOpenSession(tag, t => token = t);
            var client = new CityProjectionsClient { BaseUrl = BaseUrl };
            DistrictInteriorDto dto = null;
            long errCode = -1;
            yield return client.Interior(VergeADistrictId, token, d => dto = d, code => errCode = code);
            Assert.AreEqual(-1, errCode, $"interior fetch must succeed, got code {errCode}");
            Assert.IsNotNull(dto, "parsed via payload.data");
            onDto(dto);
        }

        private DistrictInteriorScreenController RenderFresh(string hostName, DistrictInteriorDto dto)
        {
            bareHostGo = new GameObject(hostName);
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            dto.day_phase = "NIGHT";
            diorama.Render(dto);
            return diorama;
        }

        // Réimplémentations INDÉPENDANTES de l'arithmétique de bornage (DistrictMapNavigation.
        // ClampAxis) — comparer PanPosition à une valeur RECALCULÉE ici, jamais au résultat interne
        // du composant lui-même (sinon la falsifiable ne peut jamais rougir sur son propre défaut).
        private static float ClampAxisExpected(float pos, float contentSize, float viewportSize)
        {
            float contentHalf = contentSize * 0.5f, viewportHalf = viewportSize * 0.5f;
            if (contentHalf >= viewportHalf) return Mathf.Clamp(pos, viewportHalf - contentHalf, contentHalf - viewportHalf);
            return 0f;
        }

        private static float UpperBoundExpected(float contentSize, float viewportSize) =>
            ClampAxisExpected(float.MaxValue, contentSize, viewportSize);

        // ── nav-district-F1 (livrable 5a) — pan borné, jamais de vide ───────────────────────────
        // Monde dégénéré tué (§5a du mandat, nommé) : un delta qui ne bouge pas assez n'atteint
        // jamais la borne et ne prouve rien sur ELLE ⇒ delta ÉNORME (1 000 000 px), garantit la
        // saturation réelle, dans les DEUX sens.

        [UnityTest]
        public IEnumerator NavD1_PanBy_ExtremeDelta_ClampsToIndependentlyComputedBound_BothDirections()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd1", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D1", dto);

            DistrictMapNavigation nav = diorama.MapNavigation;
            Assert.IsNotNull(nav, "verge-a (district 16) a un fond réel — la navigation doit être attachée");
            Assert.IsTrue(nav.HasFond);

            RectTransform rootRt = (RectTransform)diorama.ScreenRoot;
            RectTransform fondRt = (RectTransform)diorama.ScreenRoot.Find("DistrictScene/DistrictBackgroundImage");

            nav.PanBy(new Vector2(1_000_000f, 1_000_000f));
            float expUpperX = UpperBoundExpected(fondRt.rect.width * nav.CurrentScale, rootRt.rect.width);
            float expUpperY = UpperBoundExpected(fondRt.rect.height * nav.CurrentScale, rootRt.rect.height);
            Assert.AreEqual(expUpperX, nav.PanPosition.x, 0.05f, "nav-district-F1 — borne haute X (recalculée indépendamment)");
            Assert.AreEqual(expUpperY, nav.PanPosition.y, 0.05f, "nav-district-F1 — borne haute Y (recalculée indépendamment)");

            // Preuve géométrique directe, PAS seulement la valeur interne : sur l'axe Y (fond 1920px
            // natif, systématiquement plus grand que le viewport ici — contrairement à X où le fond
            // 1080px peut être plus ÉTROIT qu'un viewport de référence 1280px, cas préexistant/hors
            // scope, §Deviations), le fond doit couvrir le viewport ENTIER, sans aucun vide.
            Vector3[] fc = new Vector3[4]; fondRt.GetWorldCorners(fc);
            Vector3[] vc = new Vector3[4]; rootRt.GetWorldCorners(vc);
            Assert.LessOrEqual(fc[0].y, vc[0].y + 0.5f, "nav-district-F1 — aucun vide en BAS (fond couvre le viewport)");
            Assert.GreaterOrEqual(fc[2].y, vc[2].y - 0.5f, "nav-district-F1 — aucun vide en HAUT");

            nav.PanBy(new Vector2(-2_000_000f, -2_000_000f));
            float expLowerX = -expUpperX, expLowerY = -expUpperY;
            Assert.AreEqual(expLowerX, nav.PanPosition.x, 0.05f, "nav-district-F1 — borne basse X, symétrique");
            Assert.AreEqual(expLowerY, nav.PanPosition.y, 0.05f, "nav-district-F1 — borne basse Y, symétrique");
            fondRt.GetWorldCorners(fc); rootRt.GetWorldCorners(vc);
            Assert.LessOrEqual(fc[0].y, vc[0].y + 0.5f, "nav-district-F1 — aucun vide en BAS, l'autre extrémité");
            Assert.GreaterOrEqual(fc[2].y, vc[2].y - 0.5f, "nav-district-F1 — aucun vide en HAUT, l'autre extrémité");
        }

        // ── nav-district-F2 (livrable 5b) — bit-exactité à l'échelle de référence ENCORE vraie ──
        // Condition NÉCESSAIRE vérifiable en C# (le re-snap au pixel écran entier tourne bien après
        // un pan) — la preuve SUFFISANTE (0 pixel de différence) est une capture + sonde, rejouée
        // manuellement et consignée dans Tools/district-v2-navigation-implementation-notes.md (pas
        // un C# UnityTest : aucun run PlayMode ne peut invoquer resemblance-probe.py).

        [UnityTest]
        public IEnumerator NavD2_PanAtReferenceScale_ResnapsToIntegerScreenPixel()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd2", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D2", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;
            Assert.AreEqual(1f, nav.CurrentScale, "prémisse — cette falsifiable porte SEULEMENT sur l'échelle de référence");

            RectTransform sceneRt = (RectTransform)diorama.ScreenRoot.Find("DistrictScene");
            // Delta délibérément NON entier en pixels écran — exactement le cas que SnapToScreenPixel
            // existe pour corriger (round 4, ⊥ pivot-fond-prerendu). Sans le re-snap après pan, la
            // phase sous-pixel réapparaîtrait — c'est CE mécanisme que cette falsifiable épingle.
            nav.PanBy(new Vector2(37.3f, -12.7f));

            Vector3 worldPos = sceneRt.position;
            Assert.AreEqual(Mathf.Round(worldPos.x), worldPos.x, 0.001f,
                "nav-district-F2 — position ÉCRAN de DistrictScene reste un pixel ENTIER après pan à l'échelle de référence");
            Assert.AreEqual(Mathf.Round(worldPos.y), worldPos.y, 0.001f, "nav-district-F2 — idem sur Y");
        }

        // ── nav-district-F3 (livrable 5c) — un bâtiment suit EXACTEMENT le fond ─────────────────
        // Mesuré, PAS supposé, à PLUSIEURS échelles et positions (le mandat le demande explicitement).
        // Le vecteur écran fond→bâtiment est invariant par PAN (même parent transformé, la
        // translation s'annule dans la différence) et scale EXACTEMENT par le facteur de zoom —
        // c'est CE double fait qui est mesuré ici, pas supposé de la structure du code.

        [UnityTest]
        public IEnumerator NavD3_BuildingFollowsFond_AcrossScaleAndPan_Measured()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd3", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D3", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            RectTransform fondRt = (RectTransform)scene.Find("DistrictBackgroundImage");
            // Cell_3_0 == cash_safehouse (starter kit J0, block x=3 y=0, précédent maison mesuré —
            // Tools/pivot-fond-prerendu-p3-implementation-notes.md § ROUND 6).
            RectTransform cellRt = (RectTransform)scene.Find("Cell_3_0");
            Assert.IsNotNull(cellRt, "anti-vacuité — le starter kit J0 porte bien cash_safehouse sur (3,0)");

            Vector2 VectorFondToCell()
            {
                Vector3[] fc = new Vector3[4]; fondRt.GetWorldCorners(fc);
                Vector3[] cc = new Vector3[4]; cellRt.GetWorldCorners(cc);
                return (Vector2)cc[0] - (Vector2)fc[0]; // bottom-left → bottom-left, écran
            }

            Vector2 v1 = VectorFondToCell(); // échelle ×1, position par défaut

            nav.PanBy(new Vector2(-41f, 23f)); // position B, MÊME échelle
            Vector2 vPanned = VectorFondToCell();
            Assert.Less(Vector2.Distance(v1, vPanned), 0.6f,
                "nav-district-F3 — à échelle IDENTIQUE, un pan ne change PAS le vecteur fond→bâtiment (fond et bâtiment bougent ENSEMBLE)");

            nav.ZoomTo(1, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)); // ×2
            Vector2 v2 = VectorFondToCell();
            Assert.AreEqual(v1.x * 2f, v2.x, 1.5f, "nav-district-F3 — ×2 : le vecteur fond→bâtiment scale EXACTEMENT ×2");
            Assert.AreEqual(v1.y * 2f, v2.y, 1.5f, "nav-district-F3 — ×2, idem sur Y");

            nav.PanBy(new Vector2(19f, -33f)); // position C, MÊME échelle ×2
            Vector2 v2Panned = VectorFondToCell();
            Assert.Less(Vector2.Distance(v2, v2Panned), 0.6f,
                "nav-district-F3 — re-pan à ×2 : le vecteur ne bouge toujours pas");

            nav.ZoomTo(2, new Vector2(Screen.width * 0.3f, Screen.height * 0.7f)); // ×3, focus différent
            Vector2 v3 = VectorFondToCell();
            Assert.AreEqual(v1.x * 3f, v3.x, 2f, "nav-district-F3 — ×3 : le vecteur fond→bâtiment scale EXACTEMENT ×3");
            Assert.AreEqual(v1.y * 3f, v3.y, 2f, "nav-district-F3 — ×3, idem sur Y");
        }

        // ── nav-district-F4 (livrable 5d) — aucune perspective, PROUVÉ sur la matrice ───────────
        // RULING USER : le zoom ne change JAMAIS la perspective. Vérifié sur la TRANSFORMATION
        // elle-même (rotation, échelle anisotrope, profondeur), jamais sur une impression visuelle.

        [UnityTest]
        public IEnumerator NavD4_NoPerspective_TransformIsAlwaysASimilarity_ProvedOnTheMatrix()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd4", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D4", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;
            RectTransform sceneRt = (RectTransform)diorama.ScreenRoot.Find("DistrictScene");

            for (int i = 0; i < DistrictMapNavigation.ZoomLevels.Length; i++)
            {
                nav.ZoomTo(i, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f));
                nav.PanBy(new Vector2(11f, -7f));

                Assert.AreEqual(Quaternion.identity, sceneRt.localRotation,
                    $"nav-district-F4 (palier {i}) — AUCUNE rotation (le ruling user : jamais de changement de perspective)");
                Assert.AreEqual(sceneRt.localScale.x, sceneRt.localScale.y, 0.0001f,
                    $"nav-district-F4 (palier {i}) — échelle UNIFORME x==y, jamais un étirement anisotrope (pas de shear)");
                Assert.AreEqual(1f, sceneRt.localScale.z, 0.0001f,
                    $"nav-district-F4 (palier {i}) — z inchangé, aucune profondeur/caméra 3D touchée");
                Assert.AreEqual(DistrictMapNavigation.ZoomLevels[i], sceneRt.localScale.x, 0.0001f,
                    $"nav-district-F4 (palier {i}) — l'échelle appliquée EST le palier demandé, rien d'autre ne la module");
            }
        }

        // ── nav-district-F5 — cadrage initial : barycentre des bâtiments du joueur ──────────────

        [UnityTest]
        public IEnumerator NavD5_InitialFraming_CentersOnBuildingBarycenter_MeasuredAgainstJson()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd5", d => dto = d);
            Assert.Greater(dto.buildings.Length, 0, "anti-vacuité — le starter kit J0 a des bâtiments (sinon nav-district-F6 s'applique)");
            var diorama = RenderFresh("DistrictMapNav_D5", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Vector2 sum = Vector2.zero;
            int n = 0;
            foreach (DistrictInteriorBuildingDto b in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, bl => bl.block_id == b.block_id);
                Transform cell = scene.Find($"Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"bâtiment sur ({block.x},{block.y}) doit être ancré");
                sum += ((RectTransform)cell.transform).anchoredPosition;
                n++;
            }
            Assert.AreEqual(4, n, "starter kit J0 — scénario dimensionné, les 4 bâtiments comptés");
            Vector2 expectedFocus = sum / n;

            RectTransform rootRt = (RectTransform)diorama.ScreenRoot;
            RectTransform fondRt = (RectTransform)scene.Find("DistrictBackgroundImage");
            Vector2 desired = -expectedFocus; // scale==1 au cadrage initial
            float expX = ClampAxisExpected(desired.x, fondRt.rect.width, rootRt.rect.width);
            float expY = ClampAxisExpected(desired.y, fondRt.rect.height, rootRt.rect.height);

            Assert.AreEqual(expX, nav.PanPosition.x, 0.6f, "nav-district-F5 — cadrage initial X == barycentre (borné), recalculé indépendamment");
            Assert.AreEqual(expY, nav.PanPosition.y, 0.6f, "nav-district-F5 — cadrage initial Y == barycentre (borné)");
        }

        // ── nav-district-F6 — monde dégénéré : AUCUN bâtiment ⇒ cadrage par défaut documenté ────
        // Tué : un cadrage qui "centrerait sur rien" ne doit pas planter ni dériver — repli
        // byte-identique au centre du fond (0,0 local), jamais un cadrage inventé sans donnée.

        [UnityTest]
        public IEnumerator NavD6_NoBuildings_DefaultsToFondCenter_DegenerateWorld()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd6", d => dto = d);
            dto.buildings = new DistrictInteriorBuildingDto[0]; // monde dégénéré délibéré
            var diorama = RenderFresh("DistrictMapNav_D6", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;

            Assert.IsNotNull(nav, "un fond réel existe même sans bâtiment (profil verge, district 16)");
            Assert.AreEqual(Vector2.zero, nav.PanPosition,
                "nav-district-F6 — sans bâtiment, le cadrage retombe sur le centre du fond (0,0), comportement historique inchangé");
        }

        // ── nav-district-F7 — filtrage POINT/BILINEAR par palier (mesuré, Tools/district-v2-…) ──

        [UnityTest]
        public IEnumerator NavD7_FilterMode_BilinearAtReference_PointWhenZoomed_SwitchesBothWays()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd7", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D7", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;
            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Image fondImg = scene.Find("DistrictBackgroundImage").GetComponent<Image>();

            Assert.AreEqual(FilterMode.Bilinear, fondImg.sprite.texture.filterMode,
                "nav-district-F7 — à ×1 (référence), le fond reste BILINEAR (réglage d'import déjà certifié bit-exact)");

            nav.ZoomTo(1, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)); // ×2
            Assert.AreEqual(FilterMode.Point, fondImg.sprite.texture.filterMode,
                "nav-district-F7 — ×2 : POINT mesuré meilleur que BILINEAR à échelle entière (§Zoom)");

            nav.ZoomTo(0, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)); // retour ×1
            Assert.AreEqual(FilterMode.Bilinear, fondImg.sprite.texture.filterMode,
                "nav-district-F7 — retour à ×1 : BILINEAR à nouveau, jamais bloqué sur POINT par une visite précédente");
        }

        // ── nav-district-F8 — le titre n'est JAMAIS recouvert (régression du "Ver" tronqué) ─────
        // Mesuré sur Assets/Screenshots/district_v2_starter_kit_4buildings.png (démo AVANT ce lot) :
        // un pan manuel faisait recouvrir DistrictTitle par le fond, tronquant "Verge" en "Ver" —
        // DistrictScene rendait APRÈS (donc AU-DESSUS de) DistrictTitle. Corrigé (SetAsLastSibling).

        [UnityTest]
        public IEnumerator NavD8_Title_AlwaysRendersOnTopOfScene_EvenAfterExtremePan()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd8", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D8", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;

            Transform titleT = diorama.ScreenRoot.Find("DistrictTitle");
            Transform sceneT = diorama.ScreenRoot.Find("DistrictScene");
            Assert.Greater(titleT.GetSiblingIndex(), sceneT.GetSiblingIndex(),
                "nav-district-F8 — DistrictTitle est le DERNIER sibling de root (rendu au-dessus de DistrictScene)");

            nav.PanBy(new Vector2(-1_000_000f, -1_000_000f)); // pan extrême — pourrait pousser le fond sous le titre
            Assert.Greater(titleT.GetSiblingIndex(), sceneT.GetSiblingIndex(),
                "nav-district-F8 — reste vrai APRÈS un pan extrême (ce n'est pas un ordre de construction figé au premier Render)");
        }

        // ── nav-district-F9 — bornes du palier de zoom (monde dégénéré : demander hors plage) ───

        [UnityTest]
        public IEnumerator NavD9_ZoomTo_OutOfRangeIndex_ClampsToValidRange()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd9", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D9", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;

            nav.ZoomTo(999, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f));
            Assert.AreEqual(DistrictMapNavigation.ZoomLevels.Length - 1, nav.ZoomIndex, "nav-district-F9 — sature au palier maximum (×3)");

            nav.ZoomTo(-999, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f));
            Assert.AreEqual(0, nav.ZoomIndex, "nav-district-F9 — sature au palier minimum (×1)");
        }

        // ── nav-district-F10 — RÉGRESSION de l'artefact fond→§6, DEUX ÉTAPES ────────────────────
        // Étape 1 (fond→§6, mesurée) : `labOv.fen`/`stashOv.fen` pointaient sur
        // `Assets/Art/Sprites/Batiments/{usine,entrepot}_nuit_ov_actif.png` — des fichiers LEGACY
        // pré-P3 (dupliqués intégralement, pas un calque "fenêtres") jamais mis à jour au réimport
        // P3. Rendu en ADDITIF plein-cellule par-dessus le bâtiment VOISIN, c'était LE bâtiment "en
        // double / semi-transparent, on y lit une enseigne" de la capture — fermé en nullant les
        // deux champs (contrat "calque absent ⇒ repli", déjà le cas pour 5 des 7 slots).
        // Étape 2 (décision assumée après mesure demandée par le contrôleur) : nuller a démasqué un
        // second défaut, latent depuis avant ce lot — le repli générique de `BuildWindowLight`
        // (rectangle plein `nightWindowLit`) viole la doctrine ratifiée (l'or jamais en aplat) et
        // double une information déjà portée par l'art de base (bake déjà l'éclairage pour ces DEUX
        // gabarits précisément, aucun état "fenêtres" n'existe dans ce qu'a livré l'atelier). ⇒
        // `lab`/`stash` sont désormais EXEMPTÉS du repli : aucun objet "WindowLight" n'est créé pour
        // eux — le FAIT (compteur) reste vrai, sa REPRÉSENTATION disparaît.

        [UnityTest]
        public IEnumerator NavD10_LabAndStash_ExemptedFromWindowLightFallback_NoObjectEver()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd10", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D10", dto);

            // Anti-vacuité (le mandat le nomme explicitement) : le payload J0 rend bien 4 bâtiments,
            // dont lab ET stash — un monde où RIEN n'est rendu satisferait "aucun WindowLight" à vide.
            Assert.AreEqual(4, diorama.RenderedBuildingCount, "anti-vacuité — les 4 bâtiments J0 sont rendus");

            DistrictInteriorBlockDto labBlock = null, stashBlock = null, cashSafehouseBlock = null;
            foreach (DistrictInteriorBuildingDto b in dto.buildings)
            {
                DistrictInteriorBlockDto blk = Array.Find(dto.blocks, bl => bl.block_id == b.block_id);
                if (b.operational_type == "lab") labBlock = blk;
                if (b.operational_type == "stash") stashBlock = blk;
                if (b.operational_type == "cash_safehouse") cashSafehouseBlock = blk;
            }
            Assert.IsNotNull(labBlock, "anti-vacuité — le starter kit J0 porte un lab");
            Assert.IsNotNull(stashBlock, "anti-vacuité — le starter kit J0 porte un stash");
            Assert.IsNotNull(cashSafehouseBlock, "anti-vacuité — le starter kit J0 porte un cash_safehouse (contrôle positif)");

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            foreach ((string name, DistrictInteriorBlockDto block) in new[] { ("lab", labBlock), ("stash", stashBlock) })
            {
                Transform cell = scene.Find($"Cell_{block.x}_{block.y}");
                Assert.IsNull(cell.Find("WindowLight"),
                    $"nav-district-F10 — {name} : AUCUN objet WindowLight, ni sprite ni repli rectangle — " +
                    "exempté (art de base déjà éclairé, aucun état fenêtres livré par l'atelier)");
            }

            // Contrôle positif — SANS lui, "aucun WindowLight" pourrait n'être vrai que parce que le
            // mécanisme entier est cassé pour TOUT le monde. cash_safehouse a un VRAI calque `fen`
            // (residentiel3_nuit_fen_ppm24.0, non exempté) : son WindowLight doit exister normalement.
            Transform cashCell = scene.Find($"Cell_{cashSafehouseBlock.x}_{cashSafehouseBlock.y}");
            Transform cashWindowLight = cashCell.Find("WindowLight");
            Assert.IsNotNull(cashWindowLight, "nav-district-F10 — contrôle positif : cash_safehouse (calque réel, non exempté) porte bien un WindowLight");
            Image cashImg = cashWindowLight.GetComponent<Image>();
            Assert.IsNotNull(cashImg.sprite, "nav-district-F10 — contrôle positif : cash_safehouse utilise un VRAI sprite, pas le repli");

            // Le FAIT (binding 1+2) reste compté même sans objet — C9-F2 (DistrictInteriorLighting…)
            // mesure cette égalité ailleurs ; ici on prouve juste qu'exempter la REPRÉSENTATION
            // n'a pas aussi supprimé le compteur (qui resterait alors faux pour C9-F2/C9F1).
            Assert.AreEqual(4, diorama.RenderedWindowLightCount,
                "nav-district-F10 — les 4 bâtiments J0 sont condition_band SOUND : le COMPTE reste 4 même si 2 n'ont aucun objet visuel");
        }
    }
}
