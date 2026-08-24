using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs, BuildingSpriteSlots
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // JUGE-D4 (audit visuel du district, 2026-08-21, Défaut 4) — mesuré : des "plaques translucides"
    // flottaient sur du pavé vide dans `nav_district_autoframed_starterkit.png` (4,89% du viewport,
    // delta 3-12 vs le fond, bords francs, alignées écran — donc pas des parcelles isométriques).
    //
    // Root cause, isolée par mesure directe (hiérarchie live via execute_code, PAS supposée) : le
    // Socle (ombre de contact, DistrictInteriorScreenController.BuildBuildingCell) était sizé/centré
    // sur `cellW` — la largeur DU FICHIER (sprite.rect.width) — alors que le contenu OPAQUE de
    // plusieurs sprites livrés ne couvre ni toute cette largeur (annexe "BUREAU" détachée sur
    // usine/lab : contenu à 72,2% de la largeur, décentré de -75px) ni la bande basse où le Socle vit
    // (residentiel3/cash_safehouse : 0 pixel opaque dans les 20% du bas — marge basse mesurée à
    // 151px/29,5%, supérieure aux 20% que Socle occupe). Le Socle débordait donc dans le vide, où
    // rien ne le recouvre — une plaque semi-transparente flottante, screen-aligned (les RectTransform
    // sont TOUJOURS axis-aligned, quel que soit le rendu isométrique qu'ils portent).
    //
    // Instrument de la mesure (committé, jamais un chiffre sans script — socle du dépôt) :
    // Tools/juge_d4_socle_footprint_measure.py — alpha>=128, bande basse 20% du sprite APRÈS
    // décalage de la marge basse mesurée (le repère que le Socle occupera réellement une fois
    // corrigé, pas la bande basse brute du fichier).
    //
    // Correctif : BuildingSpriteSlots.FootprintOverride (4 champs mesurés, R2.3 — donnée dans
    // l'asset, jamais une constante C#) + BuildBuildingCell consomme `ResolveFootprint()` pour
    // dimensionner/positionner le Socle sur le CONTENU réel, pas le FICHIER.
    [Category("JUGE")]
    public class DistrictSocleFootprintPlayModeTests
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
            yield return auth.SignUp(callsign, "juge-d4-socle-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-juge-d4", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        /// <summary>Own precondition, no shared state (charter 27) — a FRESH account per test, real
        /// district-16 (verge-a) starter kit payload — the ONE fixture that reproduces the ghost
        /// rectangles measured in `nav_district_autoframed_starterkit.png`.</summary>
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

        // ── JUGE-D4-F1 — pour CHACUN des 4 types mesurés du starter kit, le Socle rendu reflète
        // EXACTEMENT le footprint MESURÉ (anti-tautologie : la géométrie ATTENDUE est recalculée
        // ici indépendamment de BuildBuildingCell, à partir des MÊMES données d'asset que le
        // contrôleur lit — pas une relecture du résultat interne du composant). Scénario dimensionné
        // (le mandat du starter kit porte exactement lab+stash+front_shop+cash_safehouse, D6) :
        // anti-vacuité sur le compte de types couverts.

        [UnityTest]
        public IEnumerator JugeD4F1_SocleGeometry_MatchesMeasuredFootprint_ForEachStarterKitType()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("d4f1", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictSocle_D4F1");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            float scaleFactor = canvas.scaleFactor;
            Assert.Greater(scaleFactor, 0f, "anti-vacuité — un scaleFactor nul rendrait toute comparaison triviale");

            BuildingSpriteSlots slots = BuildingSpriteSlots.Current;
            Assert.IsNotNull(slots, "l'asset BuildingSpriteSlots doit être chargé");

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.IsNotNull(scene);

            int checkedTypes = 0;
            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                BuildingSpriteSlots.FootprintOverride fp = slots.ResolveFootprint(building.operational_type);
                if (fp.widthPx <= 0f) continue; // type non mesuré (aucun du starter kit J0 — anti-vacuité ci-dessous le garantit)
                checkedTypes++;

                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Assert.IsNotNull(block, $"{building.operational_type} — le bâtiment doit avoir un bloc");
                Transform cell = scene.Find($"DistrictCells/Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"{building.operational_type} — la cellule doit exister");
                Transform socleT = cell.Find("Socle");
                Assert.IsNotNull(socleT, $"{building.operational_type} — le Socle doit exister");
                var socleRt = (RectTransform)socleT;

                float expectedW = (fp.widthPx / scaleFactor) * 0.7f;
                Vector2 expectedAnchoredPos = new Vector2(fp.centerOffsetPx / scaleFactor, fp.bottomMarginPx / scaleFactor);

                Assert.AreEqual(expectedW, socleRt.sizeDelta.x, 0.05f,
                    $"{building.operational_type} — largeur du Socle == 70% du FOOTPRINT mesuré (recalculée indépendamment), pas 70% de cellW");
                Assert.AreEqual(expectedAnchoredPos.x, socleRt.anchoredPosition.x, 0.05f,
                    $"{building.operational_type} — Socle recentré sur le contenu opaque mesuré (offsetX)");
                Assert.AreEqual(expectedAnchoredPos.y, socleRt.anchoredPosition.y, 0.05f,
                    $"{building.operational_type} — Socle remonté au-dessus de la marge basse vide mesurée");
            }
            Assert.AreEqual(4, checkedTypes,
                "scénario dimensionné — les 4 types du starter kit J0 (D6) sont TOUS mesurés (lab/stash/front_shop/cash_safehouse) ; " +
                "un compte inférieur signalerait un footprint non câblé, pas une propriété de ce test");
        }

        // ── JUGE-D4-F2 — anti-dégénérescence : le correctif change RÉELLEMENT la géométrie, pour le
        // cas le plus sévère mesuré (lab/usine, footprint à 72,2% de cellW, décentré de -75px). Sans
        // cette garde, un `ResolveFootprint` qui renverrait toujours 0 (repli historique silencieux)
        // rendrait F1 vide de sens : il comparerait le code à lui-même via des valeurs jamais
        // exercées. Ici, le Socle rendu doit être MESURABLEMENT plus étroit et décalé que ce que
        // l'ANCIENNE formule (cellW*0.7, centrée) aurait produit — recalculée indépendamment,
        // JAMAIS en relisant le composant.

        [UnityTest]
        public IEnumerator JugeD4F2_LabSocle_MeasurablyNarrowerAndOffset_ThanTheOldCellWidthFormula()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("d4f2", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictSocle_D4F2");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            float scaleFactor = canvas.scaleFactor;

            BuildingSpriteSlots slots = BuildingSpriteSlots.Current;
            Sprite labSprite = slots.Resolve("lab");
            Assert.IsNotNull(labSprite, "anti-vacuité — le sprite lab doit être chargé");
            float cellW = labSprite.rect.width / scaleFactor;
            float oldSocleW = cellW * 0.7f; // formule HISTORIQUE (avant JUGE-D4), recalculée ici

            DistrictInteriorBuildingDto labBuilding = Array.Find(dto.buildings, b => b.operational_type == "lab");
            Assert.IsNotNull(labBuilding, "anti-vacuité — le starter kit J0 porte un lab");
            DistrictInteriorBlockDto labBlock = Array.Find(dto.blocks, b => b.block_id == labBuilding.block_id);

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Transform cell = scene.Find($"DistrictCells/Cell_{labBlock.x}_{labBlock.y}");
            var socleRt = (RectTransform)cell.Find("Socle");

            Assert.Less(socleRt.sizeDelta.x, oldSocleW - 20f,
                $"lab — le Socle CORRIGÉ (footprint mesuré, 523px/712) doit être MESURABLEMENT plus étroit que " +
                $"l'ancienne formule cellW*0.7 ({oldSocleW:F1}px) — sinon le correctif n'a rien changé");
            Assert.AreNotEqual(0f, socleRt.anchoredPosition.x,
                "lab — le Socle CORRIGÉ est décalé horizontalement (contenu décentré de -75px) — " +
                "l'ancienne formule le laissait toujours à (0,0)");
            Assert.AreNotEqual(0f, socleRt.anchoredPosition.y,
                "lab — le Socle CORRIGÉ est remonté au-dessus de la marge basse mesurée (14px) — " +
                "l'ancienne formule l'ancrait toujours au tout bas du fichier (y=0)");
        }
    }
}
