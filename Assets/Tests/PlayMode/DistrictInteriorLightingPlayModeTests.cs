using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // W3.U2 C9 (design §3 C9, §1.5 — U-10 : les 5 bindings lumineux). Engagement 3 : "chaque source de
    // lumière est un fait du back" — aucune n'est décorative. Les 5 bindings, dans l'ORDRE de §1.5 :
    //   1 fenêtres ambre = possédé · 2 fenêtres éteintes = raid/saisie · 3 néon = ça rapporte ·
    //   4 fumée = op active · 5 enseigne qui grésille = maintenance en retard.
    // C9-F1/F2 nourrissent le composant avec des payloads FABRIQUÉS/RÉ-ÉCRITS — même forme que C8-F5,
    // le design le dit lui-même : ça prouve que l'ÉCRAN réagit, pas que le back produit les 5 polarités
    // en production (c'est C3-F7/C3-F8 qui portent cette seconde propriété, côté back — §1.5, différé
    // non mesuré). C9-F3 utilise le VRAI payload J0 pour son zéro, puis le RÉ-ÉCRIT pour sa garde de
    // capacité (le socle : un zéro sans garde ne prouve que l'impuissance de la sonde).
    [Category("W3U2")]
    public class DistrictInteriorLightingPlayModeTests
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
            LogAssert.ignoreFailingMessages = false;
        }

        // ── fabrication de payloads (C9-F1/F2 — mêmes champs que le DTO réel de C7, valeurs choisies
        // par le test, jamais lues d'un fetch) ──────────────────────────────────────────────────────

        private static DistrictInteriorBuildingDto MakeBuilding(
            string conditionBand = "SOUND",
            string revenueChain = "UNWIRED",
            string revenueBand = "IDLE",
            string activityBand = "IDLE",
            string lapsePhaseBucket = "WITHIN_WINDOW",
            bool maintenanceInProgress = false) => new DistrictInteriorBuildingDto
        {
            building = "11111111-1111-1111-1111-111111111111",
            block_id = 0,
            operational_type = "lab",
            conversion_band = "OPERATIONAL",
            shell_state = "STANDING", // invariant en production aujourd'hui (D2 v2 MINOR R9) — hors scope de C9
            condition_band = conditionBand,
            revenue_band = revenueBand,
            revenue_chain = revenueChain,
            activity_band = activityBand,
            lapse_phase_bucket = lapsePhaseBucket,
            maintenance_in_progress = maintenanceInProgress,
        };

        private static DistrictInteriorDto WrapSingle(DistrictInteriorBuildingDto building) => new DistrictInteriorDto
        {
            district = "district-1",
            district_id = 1,
            profile = "lattice",
            name_canonical = "Test",
            bank_side = "north",
            grid = new DistrictInteriorGridDto { width = 1, height = 1 },
            blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } },
            buildings = new[] { building },
            day_phase = "NIGHT",
        };

        private static DistrictInteriorDto EmptyDto() => new DistrictInteriorDto
        {
            district = "district-1",
            district_id = 1,
            profile = "lattice",
            name_canonical = "Test",
            bank_side = "north",
            grid = new DistrictInteriorGridDto { width = 1, height = 1 },
            blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } },
            buildings = new DistrictInteriorBuildingDto[0],
            day_phase = "NIGHT",
        };

        // ── chemin de production (charter 27 — REUSE du patron C8, self-contained à ce fichier) ────

        private static IEnumerator SignUpAndOpenSession(string tag, Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign(tag, ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-c9-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-c9", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        /// <summary>Signs up a FRESH account (own precondition, charter 27) and fetches the REAL
        /// district-interior payload for the starter kit's district.</summary>
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

        // ── C9-F1 — chaque lumière suit sa donnée, dans les DEUX polarités, unité = le binding ─────

        [UnityTest]
        public IEnumerator C9F1_EachOfThe5BindingsReactsToItsOwnFieldInBothPolarities()
        {
            bareHostGo = new GameObject("DistrictInteriorDiorama_C9F1");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();

            // binding 1 (§1.5 ligne 1, "possédé") — le champ est la PRÉSENCE de l'entrée elle-même :
            // deux payloads qui ne diffèrent QUE sur "y a-t-il un bâtiment à ce bloc" suffisent, sans
            // toucher aucune autre bande.
            diorama.Render(WrapSingle(MakeBuilding()));
            Assert.AreEqual(1, diorama.RenderedWindowLightCount, "binding 1 — polarité PRÉSENT : la fenêtre s'allume");
            diorama.Render(EmptyDto());
            Assert.AreEqual(0, diorama.RenderedWindowLightCount, "binding 1 — polarité ABSENT : aucune fenêtre");

            // binding 2 (§1.5 ligne 2, "raid/saisie") — condition_band seul varie.
            diorama.Render(WrapSingle(MakeBuilding(conditionBand: "SOUND")));
            Assert.AreEqual(1, diorama.RenderedWindowLightCount, "binding 2 — SOUND : la fenêtre reste allumée");
            diorama.Render(WrapSingle(MakeBuilding(conditionBand: "DAMAGED")));
            Assert.AreEqual(0, diorama.RenderedWindowLightCount, "binding 2 — DAMAGED (raid) : la fenêtre s'éteint");

            // binding 3 (§1.5 ligne 3, D3 — "ça rapporte") — revenue_band seul varie, revenue_chain
            // reste WIRED constant.
            diorama.Render(WrapSingle(MakeBuilding(revenueChain: "WIRED", revenueBand: "IDLE")));
            Assert.AreEqual(0, diorama.RenderedNeonGlowCount, "binding 3 — IDLE : enseigne présente mais sombre, pas de lumière (D3)");
            diorama.Render(WrapSingle(MakeBuilding(revenueChain: "WIRED", revenueBand: "EARNING")));
            Assert.AreEqual(1, diorama.RenderedNeonGlowCount, "binding 3 — EARNING : le néon s'allume");

            // binding 4 (§1.5 ligne 4, "op active") — activity_band seul varie.
            diorama.Render(WrapSingle(MakeBuilding(activityBand: "IDLE")));
            Assert.AreEqual(0, diorama.RenderedSmokeCount, "binding 4 — IDLE : pas de fumée");
            diorama.Render(WrapSingle(MakeBuilding(activityBand: "ACTIVE")));
            Assert.AreEqual(1, diorama.RenderedSmokeCount, "binding 4 — ACTIVE : la fumée apparaît");

            // binding 5 (§1.5 ligne 5, "maintenance en retard") — lapse_phase_bucket seul varie,
            // maintenance_in_progress reste false constant.
            diorama.Render(WrapSingle(MakeBuilding(lapsePhaseBucket: "WITHIN_WINDOW")));
            Assert.AreEqual(0, diorama.RenderedMaintenanceFlickerCount, "binding 5 — WITHIN_WINDOW : pas de grésillement");
            diorama.Render(WrapSingle(MakeBuilding(lapsePhaseBucket: "SOFT")));
            Assert.AreEqual(1, diorama.RenderedMaintenanceFlickerCount, "binding 5 — SOFT (en retard) : l'enseigne grésille");

            yield return null;
        }

        // ── C9-F1 (complément, § Deviations) — maintenance_in_progress a un consommateur réel : il
        // SUPPRIME le grésillement même quand lapse_phase_bucket est en retard.

        [UnityTest]
        public IEnumerator C9F1Bis_MaintenanceInProgress_SuppressesTheFlickerEvenWhenOverdue()
        {
            bareHostGo = new GameObject("DistrictInteriorDiorama_C9F1Bis");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();

            diorama.Render(WrapSingle(MakeBuilding(lapsePhaseBucket: "CRITICAL", maintenanceInProgress: false)));
            Assert.AreEqual(1, diorama.RenderedMaintenanceFlickerCount, "en retard, personne ne répare : ça grésille");
            diorama.Render(WrapSingle(MakeBuilding(lapsePhaseBucket: "CRITICAL", maintenanceInProgress: true)));
            Assert.AreEqual(0, diorama.RenderedMaintenanceFlickerCount, "en retard MAIS réparation en cours : le champ a un effet réel");

            yield return null;
        }

        // ── C9-F2 — aucune lumière décorative : source rendue == fait reçu, appariés par building_id ─

        [UnityTest]
        public IEnumerator C9F2_RenderedLightSourceCountEqualsFactCount_PairedByBuildingId()
        {
            DistrictInteriorBuildingDto[] buildings =
            {
                MakeBuilding(conditionBand: "SOUND", revenueChain: "WIRED", revenueBand: "EARNING",
                    activityBand: "ACTIVE", lapsePhaseBucket: "CRITICAL", maintenanceInProgress: false),
                MakeBuilding(conditionBand: "DAMAGED", revenueChain: "UNWIRED", revenueBand: "IDLE",
                    activityBand: "IDLE", lapsePhaseBucket: "WITHIN_WINDOW", maintenanceInProgress: false),
                MakeBuilding(conditionBand: "SOUND", revenueChain: "WIRED", revenueBand: "IDLE",
                    activityBand: "IDLE", lapsePhaseBucket: "SOFT", maintenanceInProgress: true),
            };
            for (int i = 0; i < buildings.Length; i++)
            {
                buildings[i].building = $"building-{i}";
                buildings[i].block_id = i;
            }

            var dto = new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice",
                name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = 3, height = 1 },
                blocks = new[]
                {
                    new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 },
                    new DistrictInteriorBlockDto { block_id = 1, x = 1, y = 0 },
                    new DistrictInteriorBlockDto { block_id = 2, x = 2, y = 0 },
                },
                buildings = buildings,
                day_phase = "NIGHT",
            };

            // les FAITS, comptés indépendamment du contrôleur — appariés par building_id (une entrée
            // contribue 0 ou 1 fait par binding, jamais un total d'espèce différente).
            int expectedWindowLights = 0, expectedNeonGlows = 0, expectedSmokes = 0, expectedFlickers = 0;
            foreach (DistrictInteriorBuildingDto b in buildings)
            {
                if (b.condition_band == "SOUND") expectedWindowLights++;
                if (b.revenue_band == "EARNING") expectedNeonGlows++;
                if (b.activity_band == "ACTIVE") expectedSmokes++;
                if (b.lapse_phase_bucket != "WITHIN_WINDOW" && !b.maintenance_in_progress) expectedFlickers++;
            }

            bareHostGo = new GameObject("DistrictInteriorDiorama_C9F2");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Assert.AreEqual(expectedWindowLights, diorama.RenderedWindowLightCount, "binding 1/2 — égalité, pas >=");
            Assert.AreEqual(expectedNeonGlows, diorama.RenderedNeonGlowCount, "binding 3 — égalité stricte (engagement 3)");
            Assert.AreEqual(expectedSmokes, diorama.RenderedSmokeCount, "binding 4 — égalité stricte");
            Assert.AreEqual(expectedFlickers, diorama.RenderedMaintenanceFlickerCount, "binding 5 — égalité stricte");

            // anti-vacuité : le scénario est dimensionné — au moins une lumière rendue ET au moins une
            // fenêtre éteinte dans le même lot (sinon l'égalité serait vraie sur un compte de 0 ou N partout).
            Assert.Greater(expectedWindowLights + expectedNeonGlows + expectedSmokes + expectedFlickers, 0,
                "scénario dimensionné — au moins une lumière attendue");
            Assert.Less(expectedWindowLights, buildings.Length, "scénario dimensionné — au moins une fenêtre éteinte");

            yield return null;
        }

        // ── C9-F3 — le J0 n'allume rien de faux, avec garde de capacité obligatoire ─────────────────

        [UnityTest]
        public IEnumerator C9F3_J0RendersZeroNeonZeroSmoke_AndTheSameProbeFindsSomeOnADimensionedPayload()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("c9a", d => dto = d);
            Assert.AreEqual(4, dto.buildings.Length, "starter kit J0 — scénario dimensionné (prémisse §3)");

            bareHostGo = new GameObject("DistrictInteriorDiorama_C9F3");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Assert.AreEqual(0, diorama.RenderedNeonGlowCount,
                "J0 — aucune chaîne de revenu vivante (§1.5 lignes 3/3b : aucun front_shop/cash_safehouse ne peut rapporter, TD-358)");
            Assert.AreEqual(0, diorama.RenderedSmokeCount, "J0 — aucune opération en cours au J0");

            // ⚠️ Garde de capacité OBLIGATOIRE (socle : un zéro sans garde ne prouve que l'impuissance
            // de la sonde) — LA MÊME sonde doit trouver quelque chose sur un payload dimensionné.
            dto.buildings[0].revenue_chain = "WIRED";
            dto.buildings[0].revenue_band = "EARNING";
            dto.buildings[1].activity_band = "ACTIVE";
            diorama.Render(dto);

            Assert.Greater(diorama.RenderedNeonGlowCount, 0, "garde de capacité — la sonde néon TROUVE sur un payload dimensionné");
            Assert.Greater(diorama.RenderedSmokeCount, 0, "garde de capacité — la sonde fumée TROUVE sur un payload dimensionné");
        }
    }
}
