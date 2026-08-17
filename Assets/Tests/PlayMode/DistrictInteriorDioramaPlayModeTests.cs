using System;
using System.Collections;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs, DioramaArtPhase
using MafiaCleanCity.Shell;    // AppShell, SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // W3.U2 C8 (design §3 C8, D8 — U-9/U-15) — l'écran. Confinement (C8-F1), la grille = les blocs
    // reçus + jointure bâtiment->cellule (C8-F2), la garde R2.2 dimensionnée (C8-F3), le J0 tient à 40
    // cellules dont 36 muettes (C8-F4), et le mapping EXPLICITE day_phase -> repli déclaré / art de nuit
    // (C8-F5). C8-F5 (et, pour éviter de dépendre du quart RÉEL du J0 — DAWN, horloge à 0, D8 §1.6 —
    // C8-F2/F4 aussi) nourrissent l'écran avec le payload RÉEL du starter kit, `day_phase` réécrit
    // côté test : forme du design lui-même pour C8-F5 (« nourrie par des payloads fabriqués par le
    // test... démontre que l'écran réagit, pas que le back en produit »).
    [Category("W3U2")]
    public class DistrictInteriorDioramaPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int VergeADistrictId = 16; // onboarding-grant.service.ts:112 — starter kit
        private static int callsignSeq;

        private GameObject shellGo;
        private AppShell shell;
        private GameObject bareHostGo;

        [TearDown]
        public void TearDown()
        {
            // Mirrors AppShellPlayModeTests — a Canvas built by BuildRoot()/AppShell.BuildLayout is an
            // INDEPENDENT root object, not a child of the host GameObjects below; destroying only the
            // hosts would leak it into the next test in the SAME PlayMode domain.
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
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
            LogAssert.ignoreFailingMessages = false; // never leak into a LATER, unrelated test
        }

        private static DistrictInteriorDto MinimalNightDto() => new DistrictInteriorDto
        {
            district = "district-1",
            district_id = 1,
            profile = "lattice",
            name_canonical = "Test",
            bank_side = "north",
            grid = new DistrictInteriorGridDto { width = 1, height = 1 },
            blocks = new DistrictInteriorBlockDto[0],
            buildings = new DistrictInteriorBuildingDto[0],
            day_phase = "NIGHT",
        };

        private static IEnumerator SignUpAndOpenSession(string tag, Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign(tag, ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-c8-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-c8", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        /// <summary>Signs up a FRESH account (own precondition, no shared state — charter 27) and
        /// fetches the REAL district-interior payload for the starter kit's district.</summary>
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

        // ── C8-F1 — confinement ─────────────────────────────────────────

        [UnityTest]
        public IEnumerator C8F1_ScreenRoot_MountsInContentSlot_NeverAtCanvasRoot()
        {
            // AppShell's own Home tenant (DashboardController) fires its own demo-auth attempt against
            // a stack with no seeded demo account — expected, orthogonal noise (byte-identical rationale
            // to AppShellPlayModeTests.ExpectTenantOwnDemoAuthNoise).
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null; // Start()/BuildLayout + Home activation
            yield return null; // Home tenant's own Start()/BuildLayout actually runs

            // The diorama isn't one of AppShell's 5 registered tabs (§3.0 — C8 delivers U-9/U-15, not
            // shell wiring) — mount it manually, replicating EXACTLY AppShell.MountTenant<T>'s own
            // sequence (host parented under ContentSlot, THEN SetMountParent, same frame).
            GameObject dioramaHost = new GameObject("Tenant_DistrictInteriorScreenController");
            dioramaHost.transform.SetParent(shell.ContentSlot, false);
            var diorama = dioramaHost.AddComponent<DistrictInteriorScreenController>();
            diorama.SetMountParent(shell.ContentSlot);
            yield return null;

            diorama.Render(MinimalNightDto()); // Render() builds the root lazily (any day_phase does)

            Assert.AreEqual(3, shell.ShellCanvas.transform.childCount,
                "the Canvas root holds EXACTLY the 3 shell slots — the diorama's UI did not escape to its root");

            Transform dioramaRoot = shell.ContentSlot.Find("DistrictInteriorRoot");
            Assert.IsNotNull(dioramaRoot,
                "the diorama's OWN named root ('DistrictInteriorRoot') exists as a DIRECT child of ContentSlot");
            Assert.AreEqual(shell.ContentSlot, dioramaRoot.parent, "the diorama's effective parent IS ContentSlot");
            Assert.AreNotEqual(shell.ShellCanvas.transform, dioramaRoot.parent, "and NOT the Canvas root");
        }

        // ── C8-F2 / C8-F4 — la grille = les blocs reçus, jointure par cellule, le J0 tient ──

        [UnityTest]
        public IEnumerator C8F2_C8F4_GridEqualsBlocks_EachBuildingOnOwnCell_J0Renders40CellsWith36Muted()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("c8a", d => dto = d);
            Assert.AreEqual(4, dto.buildings.Length, "starter kit J0 — scénario dimensionné");
            Assert.AreEqual(40, dto.blocks.Length, "district 16 (verge-a) — 30 + (16*7 mod 51) = 40, scénario dimensionné");
            dto.day_phase = "NIGHT"; // le quart RÉEL au J0 est DAWN (D8, horloge à 0) — forcé pour exercer le palier héros

            bareHostGo = new GameObject("DistrictInteriorDiorama_C8F2");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Assert.AreEqual(DioramaArtPhase.NightHero, diorama.LastArtPhase);
            Assert.AreEqual(dto.blocks.Length, diorama.RenderedCellCount, "C8-F2 — unité = le bloc, des deux côtés");
            Assert.AreEqual(dto.buildings.Length, diorama.RenderedBuildingCount, "C8-F2 — chaque bâtiment rendu");
            Assert.AreEqual(40, diorama.RenderedCellCount, "C8-F4 — l'écran tient au J0 : 40 cellules");
            Assert.AreEqual(36, diorama.RenderedCellCount - diorama.RenderedBuildingCount, "C8-F4 — 36 en silhouette sourde");

            Transform gridArea = diorama.ScreenRoot.Find("GridArea");
            Assert.IsNotNull(gridArea);
            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Assert.IsNotNull(block, $"building {building.building} references a real block (D2)");
                Transform cell = gridArea.Find($"Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"cell at ({block.x},{block.y}) exists for building {building.building}");
                Assert.IsNotNull(cell.Find("BuildingSprite"),
                    "a built cell carries its building sprite — chaque bâtiment se pose sur SA cellule (C8-F2)");
                Assert.IsNotNull(cell.Find("Socle"), "a built cell carries its socle");
            }
        }

        // ── C8-F3 — garde R2.2, scénario dimensionné (l'écran rend BIEN du texte) ──

        [UnityTest]
        public IEnumerator C8F3_NoRenderedTextIsABareNumber_ScreenActuallyRendersText()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("c8b", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictInteriorDiorama_C8F3");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Assert.Greater(diorama.RenderedTexts.Count, 0, "anti-vacuité — l'écran rend BIEN du texte (C8-F3)");
            foreach (string t in diorama.RenderedTexts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }
        }

        // ── C8-F5 — le mapping EXPLICITE day_phase -> repli déclaré / art de nuit ──

        [UnityTest]
        public IEnumerator C8F5_ThreeNonHeroPhases_MapToDeclaredFallback_NightMapsToHeroArt()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("c8c", d => dto = d);

            bareHostGo = new GameObject("DistrictInteriorDiorama_C8F5");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();

            foreach (string phase in new[] { "DAWN", "DAY", "DUSK" })
            {
                dto.day_phase = phase;
                diorama.Render(dto);
                Assert.AreEqual(DioramaArtPhase.NonHeroFallback, diorama.LastArtPhase, $"{phase} maps to the declared fallback");
                Assert.IsNotNull(diorama.ScreenRoot.Find("DayPhaseFallbackPanel"), $"{phase} renders the NAMED fallback panel");
                Assert.IsNull(diorama.ScreenRoot.Find("GridArea"), $"{phase} does NOT render the night grid");
                Assert.AreEqual(0, diorama.RenderedCellCount, $"{phase} — no cells rendered (fallback, not the diorama)");
            }

            dto.day_phase = "NIGHT";
            diorama.Render(dto);
            Assert.AreEqual(DioramaArtPhase.NightHero, diorama.LastArtPhase, "NIGHT maps to the hero art");
            Assert.IsNotNull(diorama.ScreenRoot.Find("GridArea"), "NIGHT renders the night grid");
            Assert.IsNull(diorama.ScreenRoot.Find("DayPhaseFallbackPanel"), "NIGHT does not render the fallback panel");
            Assert.Greater(diorama.RenderedCellCount, 0, "NIGHT actually renders cells");
        }
    }
}
