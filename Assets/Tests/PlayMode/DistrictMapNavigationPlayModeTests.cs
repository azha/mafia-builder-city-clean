using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using TMPro;                   // nav-district-F12 : ShaderUtilities (mots-clés/ID de l'ombre du titre)
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs, DistrictMapNavigation
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using MafiaCleanCity.Theme;    // DesignTokens (JUGE-D2 backdrop color)
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
            RectTransform backdropRt = (RectTransform)diorama.ScreenRoot.Find("DistrictSceneBackdrop"); // hors de la scène mobile depuis 2026-08-21
            Assert.IsNotNull(backdropRt, "JUGE-D2 — le backdrop existe dès qu'il y a un fond réel, même bloc `if` que " +
                "DistrictBackgroundImage (DistrictInteriorScreenController.RenderHeroDiorama)");

            nav.PanBy(new Vector2(1_000_000f, 1_000_000f));
            float expUpperX = UpperBoundExpected(fondRt.rect.width * nav.CurrentScale, rootRt.rect.width);
            float expUpperY = UpperBoundExpected(fondRt.rect.height * nav.CurrentScale, rootRt.rect.height);
            Assert.AreEqual(expUpperX, nav.PanPosition.x, 0.05f, "nav-district-F1 — borne haute X (recalculée indépendamment)");
            Assert.AreEqual(expUpperY, nav.PanPosition.y, 0.05f, "nav-district-F1 — borne haute Y (recalculée indépendamment)");

            // AMENDÉ NOMMÉMENT (2026-08-21, JUGE-D2 — DistrictSceneBackdrop) : la preuve géométrique
            // portait sur le FOND (fc) — c'était vrai tant que l'axe Y du fond (1920px natifs)
            // dépassait TOUJOURS le viewport de test. MESURÉ (Debug.Log injecté puis retiré) : à la
            // résolution de test ACTUELLE (Screen=1080×2400, scaleFactor=1), rootRt.rect=(1080,2400)
            // dépasse désormais fondRt.rect=(1080,1920) sur Y ⇒ ClampAxis retombe sur sa clause
            // "contenu plus petit que le viewport : reste centré" (PanPosition.y==0, confirmé par
            // l'assertion expUpperY ci-dessus qui passe déjà) ⇒ le FOND seul laisse 240px de bandes
            // NUES en haut ET en bas (fc0.y=240, fc2.y=2160 contre vc0.y=0, vc2.y=2400 — mesuré).
            // Or c'est EXACTEMENT le cas que JUGE-D2 a fermé avec DistrictSceneBackdrop (voir son
            // commentaire de tête, DistrictInteriorScreenController.cs:64-82 : "à toute résolution, y
            // compris au(x) palier(s) de dézoom... qui peut laisser voir au-delà du fond sur l'axe non
            // contraignant") : le backdrop est un FRÈRE du fond sous DistrictScene, Stretch(0,0) — il
            // subit le MÊME pan/zoom, mais sa taille LOCALE est celle de DistrictScene (== rootRt, pas
            // fondRt). MESURÉ (même run) : bc0=(0,0) bc2=(1080,2400), IDENTIQUE (0 d'écart) à
            // vc0/vc2 — le backdrop couvre le viewport EXACTEMENT là où le fond ne le peut plus. La
            // propriété "aucun vide VISIBLE" reste donc vraie ; seul l'OBJET qui la porte a changé —
            // ce n'est plus une régression du pivot, c'est le mécanisme JUGE-D2 qui fait exactement
            // son travail. On garde fc/vc pour la borne PanPosition ci-dessus (toujours dérivée du
            // fond, R9.3 — un seul calcul de bornage) et on bascule la preuve géométrique sur bc.
            Vector3[] bc = new Vector3[4]; backdropRt.GetWorldCorners(bc);
            Vector3[] vc = new Vector3[4]; rootRt.GetWorldCorners(vc);
            Assert.LessOrEqual(bc[0].y, vc[0].y + 0.5f, "nav-district-F1 — aucun vide en BAS (le backdrop couvre le viewport)");
            Assert.GreaterOrEqual(bc[2].y, vc[2].y - 0.5f, "nav-district-F1 — aucun vide en HAUT (le backdrop couvre le viewport)");

            nav.PanBy(new Vector2(-2_000_000f, -2_000_000f));
            float expLowerX = -expUpperX, expLowerY = -expUpperY;
            Assert.AreEqual(expLowerX, nav.PanPosition.x, 0.05f, "nav-district-F1 — borne basse X, symétrique");
            Assert.AreEqual(expLowerY, nav.PanPosition.y, 0.05f, "nav-district-F1 — borne basse Y, symétrique");
            backdropRt.GetWorldCorners(bc); rootRt.GetWorldCorners(vc);
            Assert.LessOrEqual(bc[0].y, vc[0].y + 0.5f, "nav-district-F1 — aucun vide en BAS, l'autre extrémité (backdrop)");
            Assert.GreaterOrEqual(bc[2].y, vc[2].y - 0.5f, "nav-district-F1 — aucun vide en HAUT, l'autre extrémité (backdrop)");
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
            RectTransform cellRt = (RectTransform)scene.Find("DistrictCells/Cell_3_0");
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

            // JUGE-D3 — ZoomLevels est désormais D'INSTANCE (paliers recalculés par format,
            // §Configure) : ×2/×3 ne sont plus garantis aux index 1/2 (un palier "district entier"
            // peut désormais s'intercaler avant/entre eux) — on cherche l'index par VALEUR.
            int idx2x = System.Array.IndexOf(nav.ZoomLevels, 2f);
            int idx3x = System.Array.IndexOf(nav.ZoomLevels, 3f);
            Assert.GreaterOrEqual(idx2x, 0, "anti-vacuité — le palier ×2 existe toujours dans ZoomLevels");
            Assert.GreaterOrEqual(idx3x, 0, "anti-vacuité — le palier ×3 existe toujours dans ZoomLevels");

            nav.ZoomTo(idx2x, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)); // ×2
            Vector2 v2 = VectorFondToCell();
            Assert.AreEqual(v1.x * 2f, v2.x, 1.5f, "nav-district-F3 — ×2 : le vecteur fond→bâtiment scale EXACTEMENT ×2");
            Assert.AreEqual(v1.y * 2f, v2.y, 1.5f, "nav-district-F3 — ×2, idem sur Y");

            nav.PanBy(new Vector2(19f, -33f)); // position C, MÊME échelle ×2
            Vector2 v2Panned = VectorFondToCell();
            Assert.Less(Vector2.Distance(v2, v2Panned), 0.6f,
                "nav-district-F3 — re-pan à ×2 : le vecteur ne bouge toujours pas");

            nav.ZoomTo(idx3x, new Vector2(Screen.width * 0.3f, Screen.height * 0.7f)); // ×3, focus différent
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

            // JUGE-D3 — ZoomLevels est désormais D'INSTANCE (§Configure) : on itère `nav.ZoomLevels`,
            // pas la constante statique retirée — le nombre de paliers dépend maintenant du format.
            for (int i = 0; i < nav.ZoomLevels.Length; i++)
            {
                nav.ZoomTo(i, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f));
                nav.PanBy(new Vector2(11f, -7f));

                Assert.AreEqual(Quaternion.identity, sceneRt.localRotation,
                    $"nav-district-F4 (palier {i}) — AUCUNE rotation (le ruling user : jamais de changement de perspective)");
                Assert.AreEqual(sceneRt.localScale.x, sceneRt.localScale.y, 0.0001f,
                    $"nav-district-F4 (palier {i}) — échelle UNIFORME x==y, jamais un étirement anisotrope (pas de shear)");
                Assert.AreEqual(1f, sceneRt.localScale.z, 0.0001f,
                    $"nav-district-F4 (palier {i}) — z inchangé, aucune profondeur/caméra 3D touchée");
                Assert.AreEqual(nav.ZoomLevels[i], sceneRt.localScale.x, 0.0001f,
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
                Transform cell = scene.Find($"DistrictCells/Cell_{block.x}_{block.y}");
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

            // JUGE-D3 — ×2 n'est plus garanti à l'index 1 (ZoomLevels est D'INSTANCE) : cherché par valeur.
            int idx2xF7 = System.Array.IndexOf(nav.ZoomLevels, 2f);
            Assert.GreaterOrEqual(idx2xF7, 0, "anti-vacuité — le palier ×2 existe toujours");
            int idxRefF7 = System.Array.IndexOf(nav.ZoomLevels, 1f);
            Assert.GreaterOrEqual(idxRefF7, 0, "anti-vacuité — le palier ×1 (référence) existe toujours");

            nav.ZoomTo(idx2xF7, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)); // ×2
            Assert.AreEqual(FilterMode.Point, fondImg.sprite.texture.filterMode,
                "nav-district-F7 — ×2 : POINT mesuré meilleur que BILINEAR à échelle entière (§Zoom)");

            nav.ZoomTo(idxRefF7, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)); // retour ×1
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

            // JUGE-D3 — ZoomLevels est D'INSTANCE (§Configure) : bornes recalculées sur `nav.ZoomLevels`,
            // pas sur la constante statique retirée. L'index 0 n'est plus garanti être ×1 (un palier
            // "district entier" peut désormais s'intercaler AVANT ×1, ex. viewport 1280×720) — la
            // valeur au palier minimum est donc affirmée en PLUS de l'index (self-documenting).
            nav.ZoomTo(999, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f));
            Assert.AreEqual(nav.ZoomLevels.Length - 1, nav.ZoomIndex, "nav-district-F9 — sature au dernier index (palier maximum, ×3)");
            Assert.AreEqual(3f, nav.CurrentScale, 0.0001f, "nav-district-F9 — le palier maximum reste bien ×3");

            nav.ZoomTo(-999, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f));
            Assert.AreEqual(0, nav.ZoomIndex, "nav-district-F9 — sature au premier index (palier minimum)");
            Assert.LessOrEqual(nav.CurrentScale, 1f,
                "nav-district-F9 — le palier minimum ne dépasse jamais ×1 (soit ×1 lui-même, soit un dézoom \"district entier\" plus petit, JUGE-D3)");
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

            // ⚠️ AMENDÉ NOMMÉMENT (2026-08-22) — ce test épinglait un mécanisme QUI N'EXISTE PLUS.
            //
            // Il opposait deux représentations du binding 1 : un VRAI calque d'atelier (`fen`) contre
            // un rectangle de REPLI, et exemptait lab/stash du repli parce que leur art de base était
            // déjà éclairé. Depuis que le fond pré-rendu porte les bâtiments
            // (`DistrictInteriorScreenController.FondPorteDejaLesBatiments`), il n'y a plus de calque
            // d'atelier NI de rectangle de repli : l'état se dit par une PASTILLE sur le badge de
            // possession. L'opposition qui fondait ce test a disparu — la garder aurait été épingler
            // une distinction que plus aucun code ne fait.
            //
            // Ce qui est asserté À LA PLACE est la propriété qui, elle, survit et qui compte pour le
            // joueur : un bâtiment possédé en condition SOUND porte un signal VISIBLE, et il le porte
            // pour TOUS les types — y compris lab et stash, que l'ancien dispositif laissait
            // délibérément sans aucun objet. C'est plus fort que ce qui était asserté avant.
            foreach ((string name, DistrictInteriorBlockDto block) in
                     new[] { ("lab", labBlock), ("stash", stashBlock), ("cash_safehouse", cashSafehouseBlock) })
            {
                Transform cell = scene.Find($"DistrictCells/Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"nav-district-F10 — la cellule de {name} doit exister");
                Transform pip = cell.Find("OwnershipBadge/WindowLight");
                Assert.IsNotNull(pip,
                    $"nav-district-F10 — {name} (condition SOUND) porte sa pastille d'état sur le badge. " +
                    "L'ancien dispositif laissait lab et stash SANS aucun objet visuel : le joueur ne " +
                    "pouvait pas distinguer un bâtiment sain d'un bâtiment sur lequel rien n'était rendu.");
                Image pipImg = pip.GetComponent<Image>();
                Assert.IsNotNull(pipImg, $"nav-district-F10 — {name} : la pastille est bien dessinée");
                Assert.Greater(pipImg.color.a, 0f, $"nav-district-F10 — {name} : la pastille n'est pas transparente");
            }

            // Le FAIT (binding 1+2) reste compté même sans objet — C9-F2 (DistrictInteriorLighting…)
            // mesure cette égalité ailleurs ; ici on prouve juste qu'exempter la REPRÉSENTATION
            // n'a pas aussi supprimé le compteur (qui resterait alors faux pour C9-F2/C9F1).
            Assert.AreEqual(4, diorama.RenderedWindowLightCount,
                "nav-district-F10 — les 4 bâtiments J0 sont condition_band SOUND : le COMPTE reste 4 même si 2 n'ont aucun objet visuel");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // JUGE-D3 (audit visuel, 2026-08-21, Défaut 3 — "le joueur ne peut jamais voir son quartier
        // en entier") — {1,2,3} n'avait AUCUNE valeur ≤1, donc AUCUN dézoom ne pouvait jamais
        // montrer le fond ENTIER (mesuré : 31,25% de l'artefact visible à 1280×720). Falsifiables
        // PARAMÉTRÉES PAR LA RÉSOLUTION (JUGE §MÉTHODE, `[TestCase]`), pures — sans Canvas ni
        // Screen, elles testent directement `ComputeContainScale`/`BuildZoomLevels`, les DEUX
        // fonctions que `Configure()` appelle avec le VRAI fond et le VRAI viewport.
        //
        // Résolutions couvertes (même jeu que JUGE-D2, portrait 1080×1920/1080×2400/1440×3200 +
        // 1280×720 historique) — MESURE IMPORTANTE, à consigner : sur les 3 formats PORTRAIT réels,
        // le fond (1080×1920) tient DÉJÀ ENTIER à ×1 (viewport ≥ fond sur les DEUX axes) — le
        // Défaut 3, tel que MESURÉ (31,25%), n'existe QUE sur le format historique 1280×720
        // (landscape, non atteignable sur un appareil verrouillé portrait — ProjectSettings.asset
        // §JUGE-D2). Le correctif reste appliqué UNIFORMÉMENT (aucune branche par résolution) —
        // implementation-notes.md § Deviations en tire la conséquence produit.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private static readonly Vector2 FondNativeSize = new Vector2(1080f, 1920f); // VERGE_D_{NUIT,JOUR}_FINAL — les 2 seuls fonds livrés (vague 1)

        [TestCase(1080f, 1920f, 1f, TestName = "ContainScale_1080x1920_ExactMatch")]
        [TestCase(1080f, 2400f, 1f, TestName = "ContainScale_1080x2400_WidthBound_AlreadyFits")]
        [TestCase(1440f, 3200f, 1.3333333f, TestName = "ContainScale_1440x3200_WidthBound_AlreadyFitsAt1_ContainZoomsInFurther")]
        [TestCase(1280f, 720f, 0.375f, TestName = "ContainScale_1280x720_HeightBound_Historique_LeSeulCasOuLeDefautExiste")]
        public void JugeD3_ComputeContainScale_MatchesHandComputedValue_PerResolution(float viewportW, float viewportH, float expected)
        {
            float actual = DistrictMapNavigation.ComputeContainScale(FondNativeSize, new Vector2(viewportW, viewportH));
            Assert.AreEqual(expected, actual, 0.001f,
                $"contain-scale à {viewportW}x{viewportH} — recalculé À LA MAIN (pas relu du code)");

            // La propriété que ce palier existe pour PROUVER (JUGE Défaut 3) : à cette échelle, le
            // fond COMPLET (dimensions natives) tient dans le viewport sur LES DEUX AXES — jamais
            // coupé. Vérifiée indépendamment de la formule (multiplication directe), pas seulement
            // la valeur numérique de min().
            Vector2 fondAtContain = FondNativeSize * actual;
            Assert.LessOrEqual(fondAtContain.x, viewportW + 0.5f, "le fond à l'échelle contain ne dépasse pas la largeur du viewport");
            Assert.LessOrEqual(fondAtContain.y, viewportH + 0.5f, "le fond à l'échelle contain ne dépasse pas la hauteur du viewport");

            // Anti-dégénérescence : contain doit être le PLUS GRAND facteur qui tient encore — un
            // cran au-dessus doit déborder sur AU MOINS un axe (sinon une valeur arbitrairement
            // petite satisferait trivialement les deux Assert ci-dessus, sans être la bonne).
            Vector2 fondJustAbove = FondNativeSize * (actual + 0.02f);
            Assert.IsTrue(fondJustAbove.x > viewportW + 0.5f || fondJustAbove.y > viewportH + 0.5f,
                "contain est bien le PLUS GRAND facteur qui tient — un cran au-dessus déborde déjà sur un axe");
        }

        [TestCase(1080f, 1920f, TestName = "BuildZoomLevels_1080x1920")]
        [TestCase(1080f, 2400f, TestName = "BuildZoomLevels_1080x2400")]
        [TestCase(1440f, 3200f, TestName = "BuildZoomLevels_1440x3200")]
        [TestCase(1280f, 720f, TestName = "BuildZoomLevels_1280x720_Historique")]
        public void JugeD3_BuildZoomLevels_AlwaysIncludesAWayToSeeTheWholeDistrict_PerResolution(float viewportW, float viewportH)
        {
            Vector2 viewport = new Vector2(viewportW, viewportH);
            float[] levels = DistrictMapNavigation.BuildZoomLevels(FondNativeSize, viewport, out int refIndex);

            // Monde dégénéré tué (JUGE Défaut 3) : la propriété exigée n'est pas "un palier de plus
            // existe", c'est "AU MOINS UN palier de ce tableau montre le district ENTIER" — vérifié
            // en REJOUANT chaque palier contre le fond réel, jamais en supposant que le palier
            // AJOUTÉ est celui-là (BuildZoomLevels pourrait, par erreur, ajouter n'importe quoi).
            bool oneShowsWholeDistrict = false;
            foreach (float lvl in levels)
            {
                Vector2 fondAtLvl = FondNativeSize * lvl;
                if (fondAtLvl.x <= viewportW + 0.5f && fondAtLvl.y <= viewportH + 0.5f) { oneShowsWholeDistrict = true; break; }
            }
            Assert.IsTrue(oneShowsWholeDistrict,
                $"à {viewportW}x{viewportH} — AU MOINS un palier de [{string.Join(",", levels)}] doit montrer le district ENTIER");

            // Contrôle positif — doit rougir sur le code D'AVANT, mais SEULEMENT là où le fond ne
            // tenait pas DÉJÀ à ×1 (mesure importante, consignée en tête de section : sur les 3
            // formats portrait réels, {1,2,3} historique montrait déjà tout à ×1 — le Défaut 3 tel
            // que MESURÉ n'existe qu'à 1280×720). Un contrôle positif qui prétendrait rougir partout
            // mentirait sur sa propre portée.
            bool fondFitsNativelyAlready = FondNativeSize.x <= viewportW + 0.5f && FondNativeSize.y <= viewportH + 0.5f;
            if (!fondFitsNativelyAlready)
            {
                bool oldLevelsShowWholeDistrict = false;
                foreach (float lvl in new[] { 1f, 2f, 3f })
                {
                    Vector2 fondAtLvl = FondNativeSize * lvl;
                    if (fondAtLvl.x <= viewportW + 0.5f && fondAtLvl.y <= viewportH + 0.5f) { oldLevelsShowWholeDistrict = true; break; }
                }
                Assert.IsFalse(oldLevelsShowWholeDistrict,
                    $"contrôle positif — à {viewportW}x{viewportH}, l'ANCIEN jeu {{1,2,3}} NE POUVAIT PAS montrer le district entier " +
                    "(reproduit le Défaut 3 mesuré, 31,25% visible à 1280×720) : ce test doit rougir sur le code d'avant");
            }

            Assert.AreEqual(1f, levels[refIndex], 0.0001f, "referenceIndex doit TOUJOURS pointer vers la valeur ×1, jamais 0 en dur");
        }

        // ── JUGE-D3 live — preuve END-TO-END sur le format où le défaut est RÉELLEMENT mesuré
        // (1280×720, le format du harnais de test lui-même) : après Configure(), le palier le plus
        // bas montre VRAIMENT le fond entier dans le viewport RENDU (pas seulement la formule pure
        // ci-dessus) — ferme la boucle "la formule est juste" → "le composant l'applique".

        [UnityTest]
        public IEnumerator JugeD3_Live_LowestZoomLevel_ShowsWholeFondWithinRenderedViewport()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("juged3live", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_JugeD3Live", dto);
            DistrictMapNavigation nav = diorama.MapNavigation;

            RectTransform rootRt = (RectTransform)diorama.ScreenRoot;
            RectTransform fondRt = (RectTransform)diorama.ScreenRoot.Find("DistrictScene/DistrictBackgroundImage");

            nav.ZoomTo(0, new Vector2(Screen.width * 0.5f, Screen.height * 0.5f)); // palier le plus bas
            yield return null;

            Vector3[] fc = new Vector3[4]; fondRt.GetWorldCorners(fc);
            Vector3[] vc = new Vector3[4]; rootRt.GetWorldCorners(vc);
            Assert.GreaterOrEqual(fc[0].x, vc[0].x - 0.5f, "au palier le plus bas, le bord GAUCHE du fond reste DANS le viewport");
            Assert.LessOrEqual(fc[2].x, vc[2].x + 0.5f, "au palier le plus bas, le bord DROIT du fond reste DANS le viewport");
            Assert.GreaterOrEqual(fc[0].y, vc[0].y - 0.5f, "au palier le plus bas, le bord BAS du fond reste DANS le viewport");
            Assert.LessOrEqual(fc[2].y, vc[2].y + 0.5f, "au palier le plus bas, le bord HAUT du fond reste DANS le viewport — " +
                "le district ENTIER est visible (JUGE Défaut 3), pas seulement une bande");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // JUGE-D2 (audit visuel, 2026-08-21, Défaut 2 — "le portrait n'a jamais été exercé") —
        // garde structurelle : le backdrop posé par DistrictInteriorScreenController.RenderHeroDiorama
        // (DistrictSceneBackdrop) couvre TOUJOURS DistrictScene en entier, quel que soit le viewport
        // — jamais de bande NUE (skybox brut) visible, à AUCUNE résolution ni AUCUN palier de zoom
        // (y compris le palier "district entier" de JUGE-D3, qui peut laisser voir au-delà du fond
        // sur l'axe non contraignant).
        // ══════════════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator JugeD2_Backdrop_AlwaysCoversTheFullSceneRect_BehindTheFond()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("juged2backdrop", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_JugeD2", dto);

            // ⚠️ AMENDÉ 2026-08-21 : le backdrop vivait sous `DistrictScene` — la MÊME
            // transformation que le pan/zoom déplace. Il partait donc avec la scène et cessait
            // de couvrir (mesuré : 160 px découverts à 1200×1600 après un pan extrême), ce qui
            // est exactement ce qu'il existe pour empêcher. Il est désormais enfant de la RACINE
            // immobile. La propriété assertée ne change pas — elle devient seulement VRAIE : le
            // backdrop couvre la racine, donc le viewport, à tout pan/zoom/résolution.
            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Transform backdropT = diorama.ScreenRoot.Find("DistrictSceneBackdrop");
            Assert.IsNotNull(backdropT, "JUGE-D2 — un backdrop plein-écran existe (jamais de vide brut derrière le fond)");

            Transform fondT = scene.Find("DistrictBackgroundImage");
            Assert.Less(backdropT.GetSiblingIndex(), scene.GetSiblingIndex(),
                "JUGE-D2 — le backdrop est un sibling ANTÉRIEUR à la scène (dessiné SOUS elle, jamais par-dessus)");
            Assert.IsNotNull(fondT, "JUGE-D2 — anti-vacuité : la scène porte bien un fond réel");

            var backdropRt = (RectTransform)backdropT;
            var rootRt = (RectTransform)diorama.ScreenRoot;
            Vector3[] bc = new Vector3[4]; backdropRt.GetWorldCorners(bc);
            Vector3[] sc = new Vector3[4]; rootRt.GetWorldCorners(sc);
            Assert.AreEqual(sc[0].x, bc[0].x, 0.05f, "JUGE-D2 — le backdrop couvre EXACTEMENT la racine, bord GAUCHE");
            Assert.AreEqual(sc[0].y, bc[0].y, 0.05f, "JUGE-D2 — bord BAS");
            Assert.AreEqual(sc[2].x, bc[2].x, 0.05f, "JUGE-D2 — bord DROIT");
            Assert.AreEqual(sc[2].y, bc[2].y, 0.05f, "JUGE-D2 — bord HAUT");

            Image backdropImg = backdropT.GetComponent<Image>();
            Assert.AreEqual(DesignTokens.Current.nightOutOfDistrictMuted, backdropImg.color,
                "JUGE-D2 — couleur DÉCLARÉE (REUSE du token du repli confiné, R2.3), jamais une couleur inventée localement");
            Assert.IsFalse(backdropImg.raycastTarget, "JUGE-D2 — le backdrop est inerte, comme le fond (pp-F6)");
        }

        // ── nav-district-F12 — le titre de district : marge, fonte, lisibilité ─────────────────────
        // Événements que ces falsifiables doivent voir rougir (nommés AVANT d'être écrites, socle) :
        //  E1 « le titre repart au bord de l'écran » — la classe exacte du défaut de la capture de
        //     livraison, où le « V » de « Verge-A » était coupé (premier pixel du glyphe à x=1).
        //  E2 « le titre repasse en sans-serif » — perte de la DA de l'en-tête.
        //  E3 « l'ombre disparaît » — le glyphe retombe à 2,23:1 sur le ciel pâle.
        //  E4 « l'ombre est posée sur le matériau PARTAGÉ » — défaut À DISTANCE : tout le texte serif
        //     du HUD (argent, heure-phase, manomètre) prendrait un halo, dans un AUTRE écran.
        // Aucune de ces quatre n'est pixel : elles portent sur la FORME, donc elles restent vraies à
        // toute résolution et ne dépendent d'aucune capture datée.
        [UnityTest]
        public IEnumerator NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd12", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D12", dto);

            var titleRt = (RectTransform)diorama.ScreenRoot.Find("DistrictTitle");
            var title = titleRt.GetComponent<TextMeshProUGUI>();
            Assert.IsNotNull(title, "sanity — DistrictTitle EST le texte lui-même (aucun nœud intercalé)");

            // ── E1 · marge ────────────────────────────────────────────────────────────────────────
            // Mesurée sur le rect RENDU, pas sur le champ qu'on vient d'écrire : c'est ce qui attrape
            // une erreur d'ancre ou de pivot, qu'une relecture de `sizeDelta` laisserait passer.
            var rootRt = (RectTransform)diorama.ScreenRoot;
            Assert.Greater(rootRt.rect.width, 4f * ShellChrome.GutterX,
                "anti-vacuité : la racine doit être PLUS LARGE que les deux gouttières réunies — sinon " +
                "l'égalité suivante serait satisfaite par un rect dégénéré, pas par la marge");

            Bounds titleB = RectTransformUtility.CalculateRelativeRectTransformBounds(rootRt, titleRt);
            float bordGauche = titleB.min.x - rootRt.rect.xMin;
            float bordDroit = rootRt.rect.xMax - titleB.max.x;

            // ⚠️ AMENDÉ NOMMÉMENT (2026-08-22) — la référence n'est plus le bord de l'ÉCRAN mais le
            // bord du FOND. Raison mesurée par le juge visuel : le fond fait 1080 de large dans un
            // viewport de 1200, donc deux bandes de letterbox de 60 px, et un titre aligné sur
            // l'écran posait **65 % de son encre sur la bande** (contraste 7,31:1) et 35 % sur le
            // ciel peint (2,70:1) — une rupture de ×3 au milieu du même mot. La propriété assertée
            // est donc plus forte qu'avant : le titre ne CHEVAUCHE PAS la couture.
            // Le `Max` reproduit le garde-fou du contrôleur : à une résolution où le fond est plus
            // large que le viewport il n'y a pas de bande, et la marge redevient la gouttière seule.
            Transform fondT = diorama.ScreenRoot.Find("DistrictScene/DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "prémisse — ce district a un fond réel ; sans lui « le bord du fond » n'a pas de sens");
            float bande = Mathf.Max(0f, (rootRt.rect.width - ((RectTransform)fondT).sizeDelta.x) * 0.5f);
            Assert.Greater(bande, 0.5f,
                $"scénario dimensionné — cette résolution DOIT produire une bande de letterbox " +
                $"(mesuré {bande:F1}px), sinon l'assertion suivante ne teste pas le défaut visé");
            float margeAttendue = ShellChrome.GutterX + bande;

            Assert.AreEqual(margeAttendue, bordGauche, 0.5f,
                $"E1 — le titre s'aligne sur le bord du FOND plus la gouttière ({margeAttendue:F0}px = " +
                $"{bande:F0} de bande + {ShellChrome.GutterX} de gouttière), jamais sur le bord de l'écran : " +
                "sinon il est à cheval sur la couture du letterbox et son contraste varie de ×3 en son milieu");
            Assert.AreEqual(margeAttendue, bordDroit, 0.5f,
                "E1 — et symétriquement à droite : un titre long ne doit pas déborder de l'autre côté");

            // ── E2 · fonte ────────────────────────────────────────────────────────────────────────
            Assert.AreSame(DesignTokens.Current.hudSerifFont, title.font,
                "E2 — titre d'écran en SERIF (même famille que l'en-tête « LA FAMILLE » du corpus)");
            Assert.AreNotSame(DesignTokens.Current.primaryFont, title.font,
                "E2 — et explicitement PAS la sans-serif par défaut de NewText : c'est cette " +
                "assertion-là qui rougirait si quelqu'un retirait la ligne d'affectation");
            Assert.AreEqual(DistrictInteriorScreenController.DistrictTitleCharacterSpacing,
                title.characterSpacing, 0.01f, "E2 — « titre serif ESPACÉ » : l'interlettrage de la DA");

            // ── E3 · l'ombre existe ET fait quelque chose ─────────────────────────────────────────
            Material instance = title.fontMaterial;
            Assert.IsTrue(instance.IsKeywordEnabled(ShaderUtilities.Keyword_Underlay),
                "E3 — le halo est ACTIF sur le matériau du titre");
            Color halo = instance.GetColor(ShaderUtilities.ID_UnderlayColor);
            Assert.Greater(halo.a, 0f,
                "E3 — monde dégénéré nº1 : un halo à alpha 0 est ACTIVÉ et totalement invisible. " +
                "Le mot-clé seul ne prouve rien.");
            Assert.AreEqual(DistrictInteriorScreenController.DistrictTitleShadowAlpha, halo.a, 0.001f,
                "E3 — et c'est bien l'opacité que le code DÉCLARE (lue de la constante, jamais recopiée ici)");
            float dilate = instance.GetFloat(ShaderUtilities.ID_UnderlayDilate);
            float offX = instance.GetFloat(ShaderUtilities.ID_UnderlayOffsetX);
            float offY = instance.GetFloat(ShaderUtilities.ID_UnderlayOffsetY);
            Assert.Greater(Mathf.Abs(dilate) + Mathf.Abs(offX) + Mathf.Abs(offY), 0.05f,
                "E3 — monde dégénéré nº2 : un halo à dilate NUL et décalage NUL tombe EXACTEMENT sous " +
                "le glyphe, donc n'ajoute aucun pixel autour de lui — actif, opaque, et sans effet. " +
                "L'assertion porte sur l'étendue RÉELLE du halo, pas sur sa présence.");

            // ── E4 · et il ne contamine pas le HUD ───────────────────────────────────────────────
            // Le défaut que cette assertion attrape ne se voit PAS sur cet écran : il se verrait sur
            // l'argent du bandeau, dans un autre fichier, sans que rien ici ne bouge.
            //
            // ⚠️ Une PREMIÈRE version de ce bloc assertait aussi `AreNotSame(partage, instance)` —
            // « le titre porte bien un matériau d'instance ». Le contrôle positif D (remplacer
            // `fontMaterial` par `fontSharedMaterial` dans le contrôleur) l'a montrée TAUTOLOGIQUE :
            // elle est restée VERTE avec la faute en place, parce que `instance` est lu par LE TEST
            // via `title.fontMaterial`, qui fabrique l'instance lui-même quoi qu'ait fait le
            // contrôleur. Elle n'observait donc pas le code testé mais l'API de TMP. Retirée.
            //
            // Ce qui RESTE observe la bonne chose, et la mesure le dit : `DesignTokens.Current
            // .hudSerifFont.material` et `title.fontSharedMaterial` sont LE MÊME objet (instance id
            // 49846 pour les deux, `ReferenceEquals` == True — mesuré 2026-08-21 dans l'éditeur).
            // Asserter que l'asset de fonte est propre EST donc le détecteur de « quelqu'un a écrit
            // sur le partagé », et le contrôle D l'a prouvé en le faisant rougir (`Expected: False,
            // But was: True`).
            Material partage = DesignTokens.Current.hudSerifFont.material;
            Assert.IsFalse(partage.IsKeywordEnabled(ShaderUtilities.Keyword_Underlay),
                "E4 — le matériau PARTAGÉ de la fonte serif reste SANS halo : sinon l'argent, " +
                "l'heure-phase et la valeur du manomètre du HUD en hériteraient tous les trois");
        }

        // ── nav-district-F13 — le halo du titre PRODUIT-IL DES PIXELS ? ────────────────────────────
        // Cette falsifiable existe parce que la précédente ne suffisait PAS, et l'aveu vaut mieux que
        // le silence : F12 vérifie que le halo est activé, opaque et dilaté — trois propriétés
        // VRAIES dans une version où le halo ne produisait AUCUN pixel (dilate 0,2 ; deux captures
        // identiques à la ligne d'appel près donnaient 0,2709 et 0,2712 de luminance d'anneau). Une
        // garde sur les PARAMÈTRES d'un effet n'est pas une garde sur son EFFET, et elle est pire que
        // rien : elle certifie le défaut.
        //
        // Ici on rend le vrai matériau du titre sur le fond le PLUS DÉFAVORABLE qui existe dans l'art
        // de ce district — le ciel pâle, échantillonné à (150,164,183) sur la capture de livraison —
        // et on compte les pixels. Résolution-indépendant, aucune capture datée, aucun seuil de goût.
        [UnityTest]
        public IEnumerator NavD13_HaloDuTitre_ProduitVraimentDesPixelsSombres_SurLeCielPale()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("navd13", d => dto = d);
            var diorama = RenderFresh("DistrictMapNav_D13", dto);
            var titre = diorama.ScreenRoot.Find("DistrictTitle").GetComponent<TextMeshProUGUI>();

            // Le ciel pâle MESURÉ, pas un gris choisi : c'est le pire fond réel, donc le seul qui
            // fasse de cette assertion une preuve plutôt qu'une démonstration.
            var cielPale = new Color(150f / 255f, 164f / 255f, 183f / 255f);
            const int W = 400, H = 80;

            var rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("F13_cam");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = cielPale;
            cam.orthographic = true;

            var canGo = new GameObject("F13_canvas");
            var can = canGo.AddComponent<Canvas>();
            can.renderMode = RenderMode.ScreenSpaceCamera;
            can.worldCamera = cam;
            canGo.AddComponent<UnityEngine.UI.CanvasScaler>();

            var txtGo = new GameObject("F13_texte");
            txtGo.transform.SetParent(canGo.transform, false);
            var sonde = txtGo.AddComponent<TextMeshProUGUI>();
            sonde.font = titre.font;
            sonde.text = titre.text;
            sonde.fontSize = titre.fontSize;
            sonde.characterSpacing = titre.characterSpacing;
            sonde.color = titre.color;
            sonde.alignment = TextAlignmentOptions.Center;
            ((RectTransform)sonde.transform).sizeDelta = new Vector2(300f, 40f);
            // LE point : on copie le matériau RÉEL du titre de production. Une sonde qui se
            // re-paramétrerait elle-même prouverait que TMP sait faire un halo, pas que CE titre
            // en a un.
            sonde.fontMaterial.CopyPropertiesFromMaterial(titre.fontMaterial);
            foreach (string kw in titre.fontMaterial.shaderKeywords) sonde.fontMaterial.EnableKeyword(kw);
            sonde.ForceMeshUpdate();
            yield return null;

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(W, H, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, W, H), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;

            Func<Color, float> lum = c => 0.2126f * c.r + 0.7152f * c.g + 0.0722f * c.b;
            float lFond = lum(cielPale);
            int sombres = 0, clairs = 0;
            float minL = 1f;
            foreach (Color c in tex.GetPixels())
            {
                float l = lum(c);
                if (l < lFond - 0.10f) sombres++;
                if (l > 0.80f) clairs++;
                if (l < minL) minL = l;
            }

            Object.DestroyImmediate(tex);
            Object.DestroyImmediate(canGo);
            Object.DestroyImmediate(camGo);
            rt.Release();
            Object.DestroyImmediate(rt);

            // Anti-vacuité D'ABORD : sans glyphe rendu, « 0 pixel sombre » et « 0 pixel clair »
            // seraient tous deux vrais, et l'assertion suivante rougirait pour la mauvaise raison —
            // ou, pire, un test écrit à l'envers serait resté vert sur une sonde vide.
            Assert.Greater(clairs, 50,
                $"anti-vacuité — la sonde doit avoir RENDU du texte clair (mesuré {clairs} px). " +
                "Sans ça, le compte de pixels sombres ne parle de rien.");

            Assert.Greater(sombres, 40,
                $"F13 — le halo doit produire de VRAIS pixels plus sombres que le ciel pâle (mesuré " +
                $"{sombres} px sous {lFond - 0.10f:F3}, luminance minimale {minL:F3}). Balayage qui " +
                "fixe le seuil : dilate 0,0 → 0 px · 0,2 → 0 px · 0,4 → 94 · 0,6 → 204 · 0,8 → 299 · " +
                "1,0 → 340. Le seuil de 40 sépare donc « aucun effet » de « effet mesurable » avec " +
                "de la marge des deux côtés — il n'est pas choisi, il est lu sur la courbe.");
        }
    }
}
