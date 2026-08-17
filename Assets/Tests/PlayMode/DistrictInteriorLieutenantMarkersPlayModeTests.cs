using System;
using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // W3.U2 C10 (design amendé §3 C10 / §C2-bis, D10 — U-11 : lieutenants visibles à leur affectation).
    // C10-F1 (AMENDÉE en v8 — la v1 ne nommait aucune clé, ce qui a laissé passer le trou de projection
    // que W3.U2 C10 a d'abord mesuré et remonté) : le nombre de marqueurs de lieutenant rendus EST ÉGAL
    // au nombre d'entrées de la clé `lieutenant_ids` reçue PAR BÂTIMENT, appariés par bâtiment.
    // *scénario dimensionné sur le J0 : 2 lieutenants, tous deux sur le MÊME bâtiment* (prémisse §3,
    // re-mesurée par D10 : le grant appelle deux fois `recruit` avec `assignedBuildingId: labBuildingId`)
    // — un rendu « un marqueur par bâtiment » (au lieu d'un marqueur par AFFECTATION) y passerait un
    // test naïf. Les tests couvrent donc ce cas dégénéré des DEUX côtés : un payload FABRIQUÉ (la forme
    // générale, appariement par bâtiment sur plusieurs bâtiments de tailles différentes) ET le J0 RÉEL
    // (charter 27 — la production livre-t-elle vraiment 2 entrées sur le lab, comme le back le déclare).
    [Category("W3U2")]
    public class DistrictInteriorLieutenantMarkersPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int VergeADistrictId = 16; // onboarding-grant.service.ts:112 — starter kit
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
                    if (c != null) Object.Destroy(c.gameObject); // un diorama sans shell bâtit son PROPRE Canvas
                }
                Object.Destroy(bareHostGo);
            }
        }

        // ── fabrication de payloads (mêmes champs que le DTO réel de C7/C9/C10 — valeurs choisies par
        // le test, jamais lues d'un fetch) ──────────────────────────────────────────────────────────

        private static DistrictInteriorBuildingDto MakeBuilding(string buildingId, int blockId, string[] lieutenantIds) => new DistrictInteriorBuildingDto
        {
            building = buildingId,
            block_id = blockId,
            operational_type = "lab",
            conversion_band = "OPERATIONAL",
            shell_state = "STANDING",
            condition_band = "SOUND",
            revenue_band = "IDLE",
            revenue_chain = "UNWIRED",
            activity_band = "IDLE",
            lapse_phase_bucket = "WITHIN_WINDOW",
            maintenance_in_progress = false,
            lieutenant_ids = lieutenantIds,
        };

        private static DistrictInteriorDto WrapGrid(DistrictInteriorBuildingDto[] buildings)
        {
            var blocks = new DistrictInteriorBlockDto[buildings.Length];
            for (int i = 0; i < buildings.Length; i++)
                blocks[i] = new DistrictInteriorBlockDto { block_id = i, x = i, y = 0 };
            return new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice",
                name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = buildings.Length, height = 1 },
                blocks = blocks,
                buildings = buildings,
                day_phase = "NIGHT",
            };
        }

        /// <summary>Compte les marqueurs sous UNE cellule précise (identifiée par son nom `Cell_x_y`,
        /// le patron déjà établi par NewCell) — c'est ce qui vérifie l'APPARIEMENT par bâtiment, pas
        /// seulement un total global qui masquerait un lieutenant attribué à la mauvaise cellule.</summary>
        private static int MarkersUnderCell(DistrictInteriorScreenController diorama, int x, int y)
        {
            RectTransform[] all = diorama.ScreenRoot.GetComponentsInChildren<RectTransform>(true);
            RectTransform cell = null;
            foreach (RectTransform rt in all)
                if (rt.name == $"Cell_{x}_{y}") { cell = rt; break; }
            Assert.IsNotNull(cell, $"Cell_{x}_{y} doit exister dans l'arbre rendu");
            int count = 0;
            for (int i = 0; i < cell.childCount; i++)
                if (cell.GetChild(i).name.StartsWith("LieutenantMarker_")) count++;
            return count;
        }

        // ── C10-F1 (forme générale) — appariement PAR BÂTIMENT sur 3 bâtiments de tailles différentes,
        // dont le cas dégénéré (2 sur le MÊME bâtiment) ──────────────────────────────────────────────

        [UnityTest]
        public IEnumerator C10F1_MarkerCountPerBuildingEqualsLieutenantIdsLength_PairedByBuilding()
        {
            var buildings = new[]
            {
                MakeBuilding("building-0", 0, new string[0]),                                    // 0 affecté
                MakeBuilding("building-1", 1, new[] { "lt-aaa", "lt-bbb" }),                      // cas dégénéré : 2 sur 1
                MakeBuilding("building-2", 2, new[] { "lt-ccc" }),                                // 1 affecté
            };

            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F1");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(WrapGrid(buildings));

            Assert.AreEqual(0, MarkersUnderCell(diorama, 0, 0), "building-0 — 0 affectation, 0 marqueur");
            Assert.AreEqual(2, MarkersUnderCell(diorama, 1, 0), "building-1 — cas dégénéré : 2 affectations, 2 marqueurs DISTINCTS");
            Assert.AreEqual(1, MarkersUnderCell(diorama, 2, 0), "building-2 — 1 affectation, 1 marqueur");
            Assert.AreEqual(3, diorama.RenderedLieutenantMarkerCount, "total = somme des affectations (0+2+1), pas le nombre de bâtiments occupés (2)");

            // anti-vacuité : le scénario est dimensionné — au moins un bâtiment SANS lieutenant ET au
            // moins un bâtiment avec PLUSIEURS (sinon "== longueur" serait vrai aussi pour "== présence").
            Assert.Less(0, buildings.Count(b => b.lieutenant_ids.Length == 0), "scénario dimensionné — au moins un bâtiment à 0");
            Assert.Less(1, buildings.Max(b => b.lieutenant_ids.Length), "scénario dimensionné — au moins un bâtiment à >1 (le cas dégénéré)");

            yield return null;
        }

        // ── C10-F1 (polarité) — une réaffectation déplace le marqueur (miroir de C2bis-F2 côté Unity) ──

        [UnityTest]
        public IEnumerator C10F1_ReRenderWithDifferentAssignment_MarkerMovesToTheNewBuilding()
        {
            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F1_Polarity");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();

            diorama.Render(WrapGrid(new[]
            {
                MakeBuilding("building-0", 0, new[] { "lt-aaa" }),
                MakeBuilding("building-1", 1, new string[0]),
            }));
            Assert.AreEqual(1, MarkersUnderCell(diorama, 0, 0), "avant réaffectation — le marqueur est sur building-0");
            Assert.AreEqual(0, MarkersUnderCell(diorama, 1, 0), "avant réaffectation — rien sur building-1");

            // ⚠️ MESURÉ (juge réel) : `ClearContent` (`Destroy`, différé à la fin de frame — patron
            // codebase-wide, jamais `DestroyImmediate`) laisse l'ancienne `Cell_0_0` (avec son marqueur)
            // physiquement présente tant qu'aucune frame ne s'est écoulée. `MarkersUnderCell` fait une
            // VRAIE requête de hiérarchie (`GetComponentsInChildren`), pas un compteur C# — sans cette
            // frame, elle trouverait la cellule STALE en premier (toujours 1 marqueur) au lieu de la
            // neuve. Même mécanisme que C10F2c (AmbientLoops).
            yield return null;

            diorama.Render(WrapGrid(new[]
            {
                MakeBuilding("building-0", 0, new string[0]),
                MakeBuilding("building-1", 1, new[] { "lt-aaa" }),
            }));
            Assert.AreEqual(0, MarkersUnderCell(diorama, 0, 0), "après réaffectation — building-0 a PERDU son marqueur");
            Assert.AreEqual(1, MarkersUnderCell(diorama, 1, 0), "après réaffectation — building-1 a GAGNÉ le marqueur");

            yield return null;
        }

        // ── C10-F1 (le J0 RÉEL) — la production livre-t-elle vraiment 2 entrées sur le lab, comme D10
        // le déclare (charter 27 : propre précondition, compte fraîche) ─────────────────────────────

        private static IEnumerator SignUpAndOpenSession(string tag, Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign(tag, ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-c10-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-c10", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        [UnityTest]
        public IEnumerator C10F1_J0Real_LabHasExactlyTwoLieutenantMarkers_OtherThreeHaveZero()
        {
            string token = null;
            yield return SignUpAndOpenSession("c10f1", t => token = t);
            var client = new CityProjectionsClient { BaseUrl = BaseUrl };
            DistrictInteriorDto dto = null;
            long errCode = -1;
            yield return client.Interior(VergeADistrictId, token, d => dto = d, code => errCode = code);
            Assert.AreEqual(-1, errCode, $"interior fetch must succeed, got code {errCode}");
            Assert.IsNotNull(dto, "parsed via payload.data");
            Assert.AreEqual(4, dto.buildings.Length, "starter kit J0 — scénario dimensionné (prémisse §3)");

            // Précondition MESURÉE sur le fetch réel — pas supposée : le lab est le SEUL bâtiment à
            // porter des lieutenant_ids sur ce monde (D10, onboarding-grant.service.ts:362-392).
            DistrictInteriorBuildingDto lab = dto.buildings.FirstOrDefault(b => b.operational_type == "lab");
            Assert.IsNotNull(lab, "le starter kit doit contenir un lab");
            Assert.IsNotNull(lab.lieutenant_ids, "D10 — [] jamais null côté back");
            Assert.AreEqual(2, lab.lieutenant_ids.Length, "D10/prémisse §3 — le lab porte exactement 2 affectations au J0");
            int buildingsWithLieutenants = dto.buildings.Count(b => b.lieutenant_ids != null && b.lieutenant_ids.Length > 0);
            Assert.AreEqual(1, buildingsWithLieutenants, "les 3 AUTRES bâtiments du J0 portent 0 affectation");

            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F1_J0");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Assert.AreEqual(2, diorama.RenderedLieutenantMarkerCount, "l'écran rend EXACTEMENT les 2 marqueurs du lab, rien ailleurs");
            int labBlockId = lab.block_id;
            DistrictInteriorBlockDto labBlock = dto.blocks.First(b => b.block_id == labBlockId);
            Assert.AreEqual(2, MarkersUnderCell(diorama, labBlock.x, labBlock.y),
                "les 2 marqueurs sont bien sur LA cellule du lab — cas dégénéré réel (2 lieutenants, MÊME bâtiment)");
        }
    }
}
