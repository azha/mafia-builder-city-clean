using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
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
                Transform cell = scene.Find($"DistrictCells/Cell_{block.x}_{block.y}");
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
                // ⚠️ AMENDÉE 2026-08-22 — le chemin est passé par `DistrictCells` (les cellules ne sont
                //    plus enfants directs de la scène). Un `IsNull` sur un chemin FAUX est vrai pour
                //    TOUS les blocs : cette assertion serait devenue tautologique sans qu'aucun
                //    compteur ne le dise. Le garde anti-vacuité qui la suit compte des itérations,
                //    pas des recherches — il ne l'aurait pas rattrapée.
                Assert.IsNull(scene.Find($"DistrictCells/Cell_{b.x}_{b.y}"),
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

        // ── C8-F5 — le mapping EXPLICITE day_phase -> art héros, POUR LES 4 QUARTS (JUGE-D1) ──
        // AMENDÉ (P4 puis JUGE-D1, audit visuel 2026-08-21, Défaut 1 — LE PLUS GRAVE : DAWN+DUSK =
        // 50% du temps de jeu SANS AUCUN ART, `day-phase-quarter.ts` découpe le jour en 4 quarts
        // ÉGAUX). Les 4 quarts rendent DÉSORMAIS tous un fond héros réel — DAWN/DUSK en PIS-ALLER
        // sur le fond du quart voisin (DAWN→jour, DUSK→nuit ; implementation-notes.md § Deviations,
        // dette 2 rendus dédiés × N profils).
        // Monde dégénéré tué (JUGE §Falsifiable Défaut 1) : un test qui ne vérifierait qu'UN palier,
        // ou qui passerait parce que LE REPLI EXISTE (un fallback rendu vaudrait comme "ça marche"),
        // ne prouverait rien — la boucle ci-dessous couvre les 4 quarts, CHACUN avec sa PROPRE
        // assertion sur le SPRITE de fond réellement monté (pas seulement "une DistrictScene
        // existe") : un bug qui rendrait toujours le fond NUIT, quel que soit le quart, resterait
        // invisible à une assertion plus faible — celle-ci le tue.

        [UnityTest]
        public IEnumerator C8F5_AllFourDayPhases_RenderRealHeroArt_DawnDuskBorrowNeighborBackground()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("c8c", d => dto = d);

            bareHostGo = new GameObject("DistrictInteriorDiorama_C8F5");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();

            DistrictBackgroundSlots bgSlots = DistrictBackgroundSlots.Current;
            Assert.IsNotNull(bgSlots, "l'asset DistrictBackgroundSlots doit être chargé");
            Sprite jourFond = bgSlots.Resolve("verge", "jour")?.fond;
            Sprite nuitFond = bgSlots.Resolve("verge", "nuit")?.fond;
            Assert.IsNotNull(jourFond, "anti-vacuité — le fond JOUR existe (sinon la comparaison ci-dessous est vide)");
            Assert.IsNotNull(nuitFond, "anti-vacuité — le fond NUIT existe");

            // (phase, palier attendu, fond attendu — le PIS-ALLER de DAWN/DUSK emprunte le fond du
            // quart voisin qu'il précède chronologiquement, JUGE-D1)
            var cases = new (string phase, DioramaArtPhase expectedArtPhase, Sprite expectedFond)[]
            {
                ("NIGHT", DioramaArtPhase.NightHero, nuitFond),
                ("DAY",   DioramaArtPhase.DayHero,   jourFond),
                ("DUSK",  DioramaArtPhase.NightHero, nuitFond), // pis-aller : pas de fond DUSK dédié
                ("DAWN",  DioramaArtPhase.DayHero,   jourFond), // pis-aller : pas de fond DAWN dédié
            };

            foreach (var c in cases)
            {
                dto.day_phase = c.phase;
                diorama.Render(dto);
                // Même correctif de placement que l'historique C8-F5 (mécanisme mesuré : un rendu
                // héros qui en remplace un autre laisse l'ancienne scène vivante jusqu'à la fin de
                // frame, Destroy() différé) — un yield avant CHAQUE assertion, pas seulement entre
                // repli et héros.
                yield return null;

                Assert.AreEqual(c.expectedArtPhase, diorama.LastArtPhase, $"{c.phase} — palier d'art attendu");
                Assert.IsNull(diorama.ScreenRoot.Find("DayPhaseFallbackPanel"),
                    $"{c.phase} — NE rend PAS le repli (JUGE-D1 : les 4 quarts nommés sont tous des paliers héros)");
                Transform sceneT = diorama.ScreenRoot.Find("DistrictScene");
                Assert.IsNotNull(sceneT, $"{c.phase} — rend une DistrictScene (fond+bâtiments), pas un repli");
                Assert.Greater(diorama.RenderedBuildingCount, 0, $"{c.phase} — anti-vacuité : les bâtiments du starter kit sont bien rendus");
                // AMENDÉ NOMMÉMENT 2026-08-21 (2 → 3) : `DistrictSceneBackdrop` a été SORTI de
                // `DistrictScene` pour devenir enfant de la racine. Raison mesurée : enfant de la
                // scène, il subissait la transformation du pan/zoom et s'en allait avec elle —
                // 160 px découverts à 1200×1600 après un pan extrême, alors qu'il existe
                // précisément pour interdire les bandes nues. La propriété assertée ici ne change
                // pas (la racine ne porte QUE des nœuds nommés, aucun nœud parasite) : seul le
                // compte bouge, et il est ré-énuméré ci-dessous pour que le test dise QUELS nœuds
                // il attend plutôt qu'un nombre nu.
                // RE-AMENDÉ 2026-08-25 — ET LA FORME CHANGE, PAS SEULEMENT LE NOMBRE. C'est la
                // DEUXIÈME fois que ce compte bouge pour une raison parfaitement légitime (2 → 3
                // quand le backdrop est sorti de la scène mobile, 3 → 4 avec la fiche bâtiment).
                // Un compte nu ne dit pas ce qu'il compte : il rougit aussi fort pour un nœud
                // parasite que pour un nœud voulu, et il oblige à relever la constante sans
                // réfléchir — au bout de deux fois, la garde ne surveille plus rien.
                //   ⇒ La propriété réellement voulue n'a JAMAIS été « il y en a N » : c'est
                //     « la racine ne porte QUE des nœuds NOMMÉS, aucun parasite ». On l'asserte
                //     donc directement, par ÉGALITÉ D'ENSEMBLES sur les noms — jamais un `contains`
                //     (qui resterait vert avec un intrus en plus), jamais un compte (qui reste vert
                //     si un nœud attendu disparaît pendant qu'un intrus apparaît).
                var attendus = new System.Collections.Generic.SortedSet<string>
                    { "DistrictSceneBackdrop", "DistrictTitle", "DistrictScene", "FicheBatiment" };
                var trouves = new System.Collections.Generic.SortedSet<string>();
                for (int i = 0; i < diorama.ScreenRoot.childCount; i++)
                    trouves.Add(diorama.ScreenRoot.GetChild(i).name);
                Assert.AreEqual(string.Join(" · ", attendus), string.Join(" · ", trouves),
                    $"{c.phase} — la racine ne porte QUE ses nœuds nommés (pp-F5). Un nom EN TROP " +
                    "est un nœud parasite ; un nom MANQUANT est une partie de l'écran qui a disparu " +
                    "— et un compte nu ne savait distinguer ni l'un ni l'autre.");

                Transform fondT = sceneT.Find("DistrictBackgroundImage");
                Assert.IsNotNull(fondT, $"{c.phase} — un fond réel est rendu (jamais de bare band ni de vide)");
                Image fondImg = fondT.GetComponent<Image>();
                Assert.AreSame(c.expectedFond, fondImg.sprite,
                    $"{c.phase} — le SPRITE de fond réellement monté est celui attendu (tue le monde dégénéré " +
                    "\"toujours le même fond quel que soit le quart\" — une assertion plus faible ne l'aurait pas vu)");
            }
        }

        // ── C8-F5bis — le repli déclaré survit pour un `day_phase` VRAIMENT inconnu (JUGE-D1 : ce
        // n'est plus DAWN/DUSK qui l'atteint — voir C8-F5 ci-dessus — mais le mécanisme de repli
        // lui-même doit rester vivant pour la 5e valeur / donnée de fil malformée que ResolveArtPhase
        // nomme explicitement Unknown, sans quoi le retrait de NonHeroFallback de l'enum aurait
        // silencieusement supprimé un état de sécurité au lieu de le rescoper). ──

        [UnityTest]
        public IEnumerator C8F5bis_UnknownDayPhase_StillMapsToDeclaredFallback()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("c8cbis", d => dto = d);
            dto.day_phase = "ECLIPSE"; // 5e valeur — jamais un des 4 quarts nommés

            bareHostGo = new GameObject("DistrictInteriorDiorama_C8F5bis");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Assert.AreEqual(DioramaArtPhase.Unknown, diorama.LastArtPhase,
                "day_phase inconnu — palier Unknown, jamais avalé par l'un des 4 quarts nommés");
            Assert.IsNotNull(diorama.ScreenRoot.Find("DayPhaseFallbackPanel"), "day_phase inconnu — rend bien le repli déclaré");
            Assert.IsNull(diorama.ScreenRoot.Find("DistrictScene"), "day_phase inconnu — ne rend PAS de scène héros");
            Assert.AreEqual(0, diorama.RenderedBuildingCount, "day_phase inconnu — aucun bâtiment (repli, pas la diorama)");
        }
    }
}
