using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
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

        // ── C8-F2 / C8-F4 — AMENDÉES par le pivot fond pré-rendu (Tools/pivot-fond-prerendu-design.md
        // §P3/§3, gate ⊥ APPROVED 2026-08-20) — raison NOMMÉE : la grille procédurale et la
        // "silhouette sourde" des blocs vides n'existent plus. Le sol/les rues/l'ambiant sont
        // désormais BAQUÉS dans le fond pré-rendu (§3 du design : "Unity dessine par-dessus, et RIEN
        // D'AUTRE") — il n'y a donc plus AUCUN objet Unity pour les 36 blocs non possédés du J0.
        // `RenderedCellCount` (unité=le bloc, 40 cellules dont 36 muettes) est RETIRÉE de
        // DistrictInteriorScreenController — voir implementation-notes.md § Deviations. Ce qui
        // SURVIT, inchangé dans sa FORME : chaque bâtiment est rendu sur SA cellule (ancrée par nom
        // `Cell_x_y`, avec BuildingSprite + Socle) — vérifié via `RenderedBuildingCount`. Ce qui est
        // NEUF : l'absence positive d'objet pour tout bloc non possédé (C8-F4 amendée).

        [UnityTest]
        public IEnumerator C8F2_EachBuildingAnchoredOnOwnBlock_J0Renders4Buildings_NoEmptyBlockObjects()
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
            Assert.AreEqual(dto.buildings.Length, diorama.RenderedBuildingCount, "C8-F2 — chaque bâtiment rendu, un par un");

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.IsNotNull(scene, "le conteneur fond+bâtiments existe (pp-F5)");
            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Assert.IsNotNull(block, $"building {building.building} references a real block (D2)");
                Transform cell = scene.Find($"Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"cell at ({block.x},{block.y}) exists for building {building.building}");
                Assert.IsNotNull(cell.Find("BuildingSprite"),
                    "a built cell carries its building sprite — chaque bâtiment se pose sur SA cellule (C8-F2)");
                Assert.IsNotNull(cell.Find("Socle"), "a built cell carries its socle");
            }

            // C8-F4 (amendée) — "36 en silhouette sourde" n'a plus d'objet à compter (§3 : plus de
            // rendu Unity pour un bloc non possédé, baqué dans le fond). La propriété qui survit :
            // AUCUN Cell_x_y n'existe pour un bloc SANS bâtiment — vérifié positivement sur les 36
            // blocs non possédés du J0 (anti-vacuité : le compte doit être exactement 36, pas 0).
            var ownedBlockIds = new HashSet<int>(dto.buildings.Select(b => b.block_id));
            int uncheckedEmpty = 0;
            foreach (DistrictInteriorBlockDto b in dto.blocks)
            {
                if (ownedBlockIds.Contains(b.block_id)) continue;
                Assert.IsNull(scene.Find($"Cell_{b.x}_{b.y}"),
                    $"C8-F4 (amendée) — le bloc non possédé ({b.x},{b.y}) n'a AUCUN objet Unity (silhouette baquée dans le fond)");
                uncheckedEmpty++;
            }
            Assert.AreEqual(36, uncheckedEmpty, "C8-F4 (amendée) — 36 blocs non possédés au J0, tous sans objet Unity");
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
                // AMENDÉ (pivot fond pré-rendu, pp-F5) — "GridArea" → "DistrictScene" : même rôle
                // structurel (le conteneur qui porte le fond + tous les bâtiments), plus de grille.
                Assert.IsNull(diorama.ScreenRoot.Find("DistrictScene"), $"{phase} does NOT render the night scene");
                Assert.AreEqual(0, diorama.RenderedBuildingCount, $"{phase} — no buildings rendered (fallback, not the diorama)");

                // Yield de fin d'itération — laisse le temps au `ClearContent` de l'itération SUIVANTE
                // (celle qui vient de tourner juste au-dessus, dont le Destroy() est différé) de
                // purger CE panneau AVANT que l'itération suivante n'en reconstruise un. Suffisant pour
                // les transitions DAWN→DAY et DAY→DUSK (vérifié : ces itérations ne rougissaient pas).
                yield return null;
            }

            dto.day_phase = "NIGHT";
            diorama.Render(dto);

            // ⚠️ CORRECTIF DE PLACEMENT (mesuré : "Expected 4, But was 5" persistait après le yield de
            // fin de boucle ci-dessus). Ce yield de boucle nettoie les panneaux DAWN et DAY (détruits
            // pendant les ClearContent() de DAY et DUSK, chacun suivi d'un yield) — mais PAS le panneau
            // DUSK (P3) : son propre Destroy() n'est appelé QUE pendant le ClearContent() de CE render
            // NIGHT, juste au-dessus, et aucun yield ne suivait ce render avant l'assertion. root avait
            // donc 4 (NIGHT) + 1 (P3, encore vivant) = 5 enfants. Le repli n'est PAS créé "même en
            // phase héros" (le if/else de Render() est strictement exclusif, vérifié dans le corps) —
            // c'est le REPLI DE L'ITÉRATION PRÉCÉDENTE qui survit faute d'une frame après CE render-ci.
            yield return null;

            Assert.AreEqual(DioramaArtPhase.NightHero, diorama.LastArtPhase, "NIGHT maps to the hero art");
            Assert.IsNotNull(diorama.ScreenRoot.Find("DistrictScene"), "NIGHT renders the night scene (fond+bâtiments)");
            Assert.Greater(diorama.RenderedBuildingCount, 0, "NIGHT actually renders buildings");
            // Socle : une épingle d'ABSENCE (`Assert.IsNull(Find("DayPhaseFallbackPanel"))`) reste
            // fragile même une fois la staleness ci-dessus corrigée — elle peut rougir pour n'importe
            // quelle raison sans rapport avec ce qu'elle prétend prouver. Remplacée par une VALEUR
            // PRÉSENTE : `RenderNightDiorama` construit EXACTEMENT 2 enfants directs de `root`
            // (DistrictTitle, DistrictScene — vérifié dans le corps de la méthode) ; `RenderNonHeroFallback`
            // n'en construit qu'1 (DayPhaseFallbackPanel). Le compte prouve POSITIVEMENT la composition
            // exacte de NIGHT, ce qui implique l'absence de tout panneau de repli sans jamais chercher
            // son absence directement.
            //
            // ⚠️ AMENDEMENT NOMMÉ (pivot fond pré-rendu, Tools/pivot-fond-prerendu-design.md, pp-F5,
            // §8, gate ⊥ APPROVED 2026-08-20) — 4 → 2. `OutOfDistrictBackdrop` et `Haze` sont
            // RETIRÉS : le fond pré-rendu porte déjà sa ville au loin (`map_district.py:34-36`) et sa
            // brume (`:26`) — les deux calques Unity coûtaient 1,16 à 1,70 de MAE uniforme
            // (F-nocalque) sans plus avoir d'objet à représenter (prédiction ⊥ P2). `GridArea`
            // devient `DistrictScene` (même rôle structurel — voir DistrictInteriorScreenController.cs).
            // Forme de compte POSITIF conservée à l'identique (jamais une recherche d'absence).
            Assert.AreEqual(2, diorama.ScreenRoot.childCount,
                "NIGHT construit EXACTEMENT ses 2 nœuds nommés (titre/scène) — aucun calque hors-district/brume résiduel (pp-F5)");
        }
    }
}
