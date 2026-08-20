using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs, BuildingSpriteSlots
using MafiaCleanCity.Shell;    // AppShell (unused directly), SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // nav-hud-design-v1.md, chunk 1 (§2 : remplissage ambiant parcellaire) — amb-F1..amb-F8 (§2.7,
    // mondes dégénérés §8). Payload RÉEL, patron DistrictInteriorDioramaPlayModeTests.cs:67-97
    // (SignUpAndOpenSession + FetchInterior), `day_phase` forcé "NIGHT" comme :143 — le quart réel
    // du J0 est DAWN (horloge à 0), donc chaque test le réécrit pour exercer le palier héros où
    // l'ambiant se construit (§2.5 : l'ambiant n'apparaît qu'à NIGHT).
    [Category("W3U2")]
    public class DistrictAmbientFillPlayModeTests
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
            yield return auth.SignUp(callsign, "w3u2-amb-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-amb", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        /// <summary>Own precondition, no shared state (charter 27) — a FRESH account per test.</summary>
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

        // ── helpers partagés — indépendants du contrôleur (oracles de test) ──────────────

        /// <summary>§2.1 Décision A — REUSE littéral de la partition retenue par le design
        /// (streetEveryX/Y résolus depuis le MÊME AmbientSet que le contrôleur). Un axe à 0 est
        /// désactivé, jamais un modulo par zéro.</summary>
        private static bool IsStreetCell(int x, int y, BuildingSpriteSlots.AmbientSet set)
        {
            if (set == null) return false;
            return (set.streetEveryX > 0 && x % set.streetEveryX == 0)
                || (set.streetEveryY > 0 && y % set.streetEveryY == 0);
        }

        private static List<Transform> AmbientChildren(Transform cell)
        {
            var list = new List<Transform>();
            for (int i = 0; i < cell.childCount; i++)
            {
                Transform child = cell.GetChild(i);
                if (child.name.StartsWith("Ambient_", StringComparison.Ordinal)) list.Add(child);
            }
            return list;
        }

        /// <summary>Toutes les façades ambiantes rendues sur la grille, quel que soit leur parcelle.</summary>
        private static List<Transform> AllAmbientFacades(Transform gridArea, DistrictInteriorDto dto)
        {
            var result = new List<Transform>();
            foreach (DistrictInteriorBlockDto b in dto.blocks)
            {
                Transform cell = gridArea.Find($"Cell_{b.x}_{b.y}");
                if (cell == null) continue;
                result.AddRange(AmbientChildren(cell));
            }
            return result;
        }

        // ── amb-F1 — déterminisme ET variété ─────────────────────────────────────────────
        // Monde dégénéré tué : "tous les blocs, le même template" satisfait le déterminisme seul
        // ⇒ tué par ≥4 templates DISTINCTS observés sur la grille (§8).

        [UnityTest]
        public IEnumerator AmbF1_TwoRendersSameParcelSequence_AtLeastFourDistinctTemplates()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ambf1", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictAmbient_F1");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();

            diorama.Render(dto);
            yield return null; // laisse ClearContent (Destroy différé) purger avant le second Render
            Transform gridArea1 = diorama.ScreenRoot.Find("GridArea");
            var pass1 = new Dictionary<string, List<string>>();
            foreach (DistrictInteriorBlockDto b in dto.blocks)
            {
                Transform cell = gridArea1.Find($"Cell_{b.x}_{b.y}");
                if (cell == null) continue;
                pass1[$"{b.x}_{b.y}"] = AmbientChildren(cell)
                    .Select(t => t.GetComponent<Image>()?.sprite?.name).ToList();
            }

            diorama.Render(dto);
            yield return null;
            Transform gridArea2 = diorama.ScreenRoot.Find("GridArea");
            var pass2 = new Dictionary<string, List<string>>();
            foreach (DistrictInteriorBlockDto b in dto.blocks)
            {
                Transform cell = gridArea2.Find($"Cell_{b.x}_{b.y}");
                if (cell == null) continue;
                pass2[$"{b.x}_{b.y}"] = AmbientChildren(cell)
                    .Select(t => t.GetComponent<Image>()?.sprite?.name).ToList();
            }

            Assert.AreEqual(pass1.Count, pass2.Count, "même nombre de parcelles observées entre les deux renders");
            foreach (string key in pass1.Keys)
            {
                CollectionAssert.AreEqual(pass1[key], pass2[key],
                    $"amb-F1 — parcelle {key} : même SUITE de templates entre deux Render() du MÊME payload");
            }

            int distinctTemplates = pass1.Values.SelectMany(l => l).Where(n => n != null).Distinct().Count();
            Assert.GreaterOrEqual(distinctTemplates, 4,
                "amb-F1 — anti-vacuité : ≥4 templates DISTINCTS sur la grille (pas 'un seul template partout')");
        }

        // ── amb-F2 — priorité du joueur ───────────────────────────────────────────────────
        // Monde dégénéré tué : zéro ambiant partout satisfait "aucun ambiant sur une cellule
        // possédée" ⇒ tué par le plancher ≥90 façades (§8).

        [UnityTest]
        public IEnumerator AmbF2_OwnedCellsCarryNoAmbient_TotalFacadesAtLeast90()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ambf2", d => dto = d);
            Assert.AreEqual(4, dto.buildings.Length, "starter kit J0 — scénario dimensionné");
            Assert.AreEqual(40, dto.blocks.Length, "district 16 (verge-a) — scénario dimensionné");
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictAmbient_F2");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Transform gridArea = diorama.ScreenRoot.Find("GridArea");
            Assert.IsNotNull(gridArea);

            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Assert.IsNotNull(block, $"building {building.building} references a real block (D2)");
                Transform cell = gridArea.Find($"Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"cell at ({block.x},{block.y}) exists for building {building.building}");
                Assert.IsNotNull(cell.Find("BuildingSprite"), "possédée — porte son BuildingSprite");
                Assert.AreEqual(0, AmbientChildren(cell).Count,
                    "amb-F2 — Décision D : un bloc possédé ne reçoit JAMAIS d'ambiant, quelle que soit sa classe");
            }

            int totalAmbient = AllAmbientFacades(gridArea, dto).Count;
            Assert.GreaterOrEqual(totalAmbient, 90,
                $"amb-F2 — anti-vacuité : plancher ≥90 façades (au pire des 12 cellules-rue admises par amb-F6, " +
                $"40-12-4 possédées = 24 parcelles libres × 4 = 96 ; observé {totalAmbient})");
        }

        // ── amb-F3 — ambiant inerte ────────────────────────────────────────────────────────
        // Monde dégénéré tué : tous compteurs à zéro des deux côtés satisfait "inerte" par le vide
        // ⇒ tué par RenderedBuildingCount==4 ET RenderedCellCount==40 dans la MÊME assertion (§8).

        [UnityTest]
        public IEnumerator AmbF3_AmbientCarriesNoStateMarker_RenderCountersStable_SceneDimensioned()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ambf3", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictAmbient_F3");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();

            diorama.Render(dto);
            Transform gridArea = diorama.ScreenRoot.Find("GridArea");
            List<Transform> facades = AllAmbientFacades(gridArea, dto);
            Assert.Greater(facades.Count, 0, "anti-vacuité — il y a bien des façades à examiner");
            foreach (Transform facade in facades)
            {
                Assert.IsNull(facade.GetComponent<Button>(),
                    $"amb-F3 — {facade.name} ne porte AUCUN Button");
                Assert.AreEqual(0, facade.childCount,
                    $"amb-F3 — {facade.name} n'a aucun enfant (donc ni Socle, ni *Ov, ni LieutenantMarker)");
            }

            int b1 = diorama.RenderedBuildingCount, w1 = diorama.RenderedWindowLightCount,
                n1 = diorama.RenderedNeonGlowCount, s1 = diorama.RenderedSmokeCount,
                m1 = diorama.RenderedMaintenanceFlickerCount, l1 = diorama.RenderedLieutenantMarkerCount,
                a1 = diorama.ActiveAmbientLoopCount;

            yield return null;
            diorama.Render(dto); // même payload — les 7 compteurs de rendu doivent être STABLES

            Assert.AreEqual(b1, diorama.RenderedBuildingCount, "RenderedBuildingCount inchangé à payload égal");
            Assert.AreEqual(w1, diorama.RenderedWindowLightCount, "RenderedWindowLightCount inchangé à payload égal");
            Assert.AreEqual(n1, diorama.RenderedNeonGlowCount, "RenderedNeonGlowCount inchangé à payload égal");
            Assert.AreEqual(s1, diorama.RenderedSmokeCount, "RenderedSmokeCount inchangé à payload égal");
            Assert.AreEqual(m1, diorama.RenderedMaintenanceFlickerCount, "RenderedMaintenanceFlickerCount inchangé à payload égal");
            Assert.AreEqual(l1, diorama.RenderedLieutenantMarkerCount, "RenderedLieutenantMarkerCount inchangé à payload égal");
            Assert.AreEqual(a1, diorama.ActiveAmbientLoopCount, "ActiveAmbientLoopCount inchangé à payload égal");

            Assert.IsTrue(diorama.RenderedBuildingCount == 4 && diorama.RenderedCellCount == 40,
                "amb-F3 — scénario dimensionné : RenderedBuildingCount==4 ET RenderedCellCount==40 dans LA MÊME assertion");
        }

        // ── amb-F4 — clôture de la table ───────────────────────────────────────────────────
        // Monde dégénéré tué : une table vide rendrait l'inclusion triviale ⇒ tué par "ensemble
        // déclaré non vide" (§8).

        [UnityTest]
        public IEnumerator AmbF4_AmbientSpritesAreDeclaredInResolvedTable_TableNonEmpty()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ambf4", d => dto = d);
            dto.day_phase = "NIGHT";

            BuildingSpriteSlots.AmbientSet set = BuildingSpriteSlots.Current.ResolveAmbient(dto.profile);
            Assert.IsNotNull(set, "amb-F4 — ResolveAmbient ne rend jamais null (repli déclaré)");
            Assert.IsNotNull(set.templates, "amb-F4 — la table de templates existe");
            Assert.Greater(set.templates.Length, 0, "amb-F4 — anti-vacuité : l'ensemble déclaré est NON VIDE");

            var declaredSprites = new HashSet<Sprite>(set.templates.Select(t => t.nuit));

            bareHostGo = new GameObject("DistrictAmbient_F4");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);
            Transform gridArea = diorama.ScreenRoot.Find("GridArea");
            List<Transform> facades = AllAmbientFacades(gridArea, dto);
            Assert.Greater(facades.Count, 0, "anti-vacuité — il y a bien des façades à examiner");
            foreach (Transform facade in facades)
            {
                Sprite sp = facade.GetComponent<Image>()?.sprite;
                Assert.IsNotNull(sp, $"{facade.name} porte un sprite");
                Assert.IsTrue(declaredSprites.Contains(sp),
                    $"amb-F4 — {facade.name} porte '{sp.name}', INCLUS dans ResolveAmbient(profile).templates");
            }
        }

        // ── amb-F5 — recouvrement réel ─────────────────────────────────────────────────────
        // Monde dégénéré tué : (a) toutes les façades au même point ⇒ tué par positions ancrées
        // DISTINCTES ; (b) sprites minuscules ⇒ tué par largeur moyenne ≥0,45×CellSize (§8).

        [UnityTest]
        public IEnumerator AmbF5_FacadesOverlapSomewhere_DistinctPositions_AverageWidthFloor()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ambf5", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictAmbient_F5");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Transform gridArea = diorama.ScreenRoot.Find("GridArea");
            RectTransform gridRt = (RectTransform)gridArea;
            float cellSize = gridRt.sizeDelta.x / Mathf.Max(1, dto.grid.width);

            List<Transform> facades = AllAmbientFacades(gridArea, dto);
            Assert.Greater(facades.Count, 1, "anti-vacuité — au moins deux façades pour parler de paires");

            var bounds = facades.Select(f => RectTransformUtility.CalculateRelativeRectTransformBounds(
                gridRt, (RectTransform)f)).ToList();

            int intersectingPairs = 0;
            for (int i = 0; i < bounds.Count; i++)
                for (int j = i + 1; j < bounds.Count; j++)
                    if (bounds[i].Intersects(bounds[j])) intersectingPairs++;
            Assert.Greater(intersectingPairs, 0,
                "amb-F5 — au moins UNE paire de façades dont les rects monde s'intersectent");

            var positions = facades.Select(f => f.position).Distinct().Count();
            Assert.AreEqual(facades.Count, positions,
                "amb-F5 — positions ancrées DISTINCTES == nombre de façades (aucune paire au même point)");

            float avgWidth = facades.Select(f => ((RectTransform)f).rect.width).Average();
            Assert.GreaterOrEqual(avgWidth, 0.45f * cellSize,
                $"amb-F5 — largeur moyenne ≥ 0,45×CellSize (observé {avgWidth:F2}px, CellSize {cellSize:F2}px, " +
                $"seuil {0.45f * cellSize:F2}px)");
        }

        // ── amb-F6 — parcellaire réel ──────────────────────────────────────────────────────
        // Monde dégénéré tué : partition "tout ou rien" ⇒ tué par 4 ≤ cellules-rue ≤ 12 (§2.7/§8 —
        // la borne haute est celle qui entre dans l'arithmétique de §2.6).

        [UnityTest]
        public IEnumerator AmbF6_StreetCellsCarryNoAmbient_StreetCountWithinDesignBounds()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ambf6", d => dto = d);
            dto.day_phase = "NIGHT";

            BuildingSpriteSlots.AmbientSet set = BuildingSpriteSlots.Current.ResolveAmbient(dto.profile);
            Assert.IsNotNull(set);

            var ownedBlockIds = new HashSet<int>(dto.buildings.Select(b => b.block_id));
            int streetCount = dto.blocks.Count(b => IsStreetCell(b.x, b.y, set));
            Assert.GreaterOrEqual(streetCount, 4, "amb-F6 — plancher de la partition (§2.7)");
            Assert.LessOrEqual(streetCount, 12,
                "amb-F6 — borne haute : celle qui entre dans l'arithmétique de platitude de §2.6");

            bareHostGo = new GameObject("DistrictAmbient_F6");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);
            Transform gridArea = diorama.ScreenRoot.Find("GridArea");

            int checkedStreetCells = 0;
            foreach (DistrictInteriorBlockDto b in dto.blocks)
            {
                if (!IsStreetCell(b.x, b.y, set) || ownedBlockIds.Contains(b.block_id)) continue;
                Transform cell = gridArea.Find($"Cell_{b.x}_{b.y}");
                Assert.IsNotNull(cell, $"cellule-rue ({b.x},{b.y}) existe");
                Assert.AreEqual(0, AmbientChildren(cell).Count,
                    $"amb-F6 — cellule-rue NON possédée ({b.x},{b.y}) ne porte AUCUN Ambient_*");
                checkedStreetCells++;
            }
            Assert.Greater(checkedStreetCells, 0, "anti-vacuité — au moins une cellule-rue non possédée a été vérifiée");
        }

        // ── amb-F7 — les axes scellés tiennent (§8 : détecteur DÉJÀ LIVRÉ, réutilisé ici) ──

        [Test]
        public void AmbF7_SealedTokenCountUnchanged()
        {
            Assert.AreEqual(51, MafiaCleanCity.Theme.Tests.CanonPaletteComparator.ExpectedTokenCount,
                "amb-F7 — le chunk 1 n'ajoute AUCUNE teinte : les 51 clés de DesignTokens restent fermées");
        }

        // ── amb-F8 (NEUVE) — l'ENTRÉE de la cible de platitude ─────────────────────────────
        // Monde dégénéré tué : des façades nombreuses mais TRANSPARENTES rendraient amb-F2 vraie
        // (le compte d'objets) ⇒ tué en mesurant l'aire OPAQUE, pas le compte (§8).
        //
        // Table de référence : fraction de pixels opaques (alpha ≥ 128, §1.0/§8-bis) mesurée
        // OFFLINE par PIL sur les 9 PNG du mélange `verge`, à l'identique de la méthodologie de
        // §1.2 (COMPTÉ, corroboré : mes valeurs tombent à ±0,006 des colonnes "aire opaque /
        // cellule" du design — ex. epicerie 0,0934 vs 0,094 ; hotel 0,2421 vs 0,244). Ce n'est PAS
        // un nom de fichier sprite en production (C6-F3 ne porte que sur BuildingSpriteSlots.cs /
        // DistrictInteriorScreenController.cs) — c'est un oracle de TEST, indexé par le nom du
        // Sprite réellement rendu (`Image.sprite.name`), la seule façon d'obtenir une aire opaque
        // sans lire les pixels au runtime (les textures sont `isReadable: 0`, mesuré dans les
        // .meta — Texture2D.GetPixels() y échouerait).
        private static readonly Dictionary<string, float> OpaqueFractionAlpha128 = new Dictionary<string, float>
        {
            { "residentiel2_nuit", 0.9286f },
            { "residentiel3_nuit", 0.9696f },
            { "residentiel4_nuit", 0.9731f },
            { "residentiel5_nuit", 0.9738f },
            { "epicerie_nuit", 0.8858f },
            { "barbier_nuit", 0.9255f },
            { "laverie_nuit", 0.8387f },
            { "diner_nuit", 0.7876f },
            { "hotel_nuit", 1.0000f },
        };

        [UnityTest]
        public IEnumerator AmbF8_OpaqueAreaPerParcelMeetsPlatitudeEntryFloor()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ambf8", d => dto = d);
            dto.day_phase = "NIGHT";

            BuildingSpriteSlots.AmbientSet set = BuildingSpriteSlots.Current.ResolveAmbient(dto.profile);
            Assert.IsNotNull(set);
            var ownedBlockIds = new HashSet<int>(dto.buildings.Select(b => b.block_id));

            bareHostGo = new GameObject("DistrictAmbient_F8");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Transform gridArea = diorama.ScreenRoot.Find("GridArea");
            RectTransform gridRt = (RectTransform)gridArea;
            float cellSize = gridRt.sizeDelta.x / Mathf.Max(1, dto.grid.width);
            float cellArea = cellSize * cellSize;

            double totalOpaqueCellules = 0;
            int parcelCount = 0;
            foreach (DistrictInteriorBlockDto b in dto.blocks)
            {
                if (ownedBlockIds.Contains(b.block_id) || IsStreetCell(b.x, b.y, set)) continue;
                parcelCount++;
                Transform cell = gridArea.Find($"Cell_{b.x}_{b.y}");
                if (cell == null) continue;
                foreach (Transform facade in AmbientChildren(cell))
                {
                    Sprite sp = facade.GetComponent<Image>()?.sprite;
                    if (sp == null || !OpaqueFractionAlpha128.TryGetValue(sp.name, out float frac)) continue;
                    var rt = (RectTransform)facade;
                    float bboxArea = rt.rect.width * rt.rect.height;
                    totalOpaqueCellules += (bboxArea * frac) / cellArea;
                }
            }
            Assert.Greater(parcelCount, 0, "anti-vacuité — au moins une cellule-parcelle ambiante mesurée");

            double avgOpaquePerParcel = totalOpaqueCellules / parcelCount;
            Assert.GreaterOrEqual(avgOpaquePerParcel, 0.25,
                $"amb-F8 — l'aire opaque des Ambient_*, rapportée au nombre de cellules-parcelle, est ≥0,25 " +
                $"cellule (observé {avgOpaquePerParcel:F4} sur {parcelCount} parcelles ambiantes ; " +
                $"NON rebaté pour recouvrement pairwise — borne supérieure honnête sur une aire dont le rabais " +
                $"réel est lui-même DÉDUIT par le design, §2.3)");
        }
    }
}
