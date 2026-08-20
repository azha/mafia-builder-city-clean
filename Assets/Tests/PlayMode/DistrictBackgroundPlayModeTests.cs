using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs, DistrictBackground*
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // Pivot « fond pré-rendu » (Tools/pivot-fond-prerendu-design.md, §8/§11 P3, gate ⊥ APPROVED
    // 2026-08-20) — les falsifiables NEUVES du chunk P3 : pp-F1 (résolution native du fond),
    // pp-F2/F-calage (calage bâtiment↔JSON), pp-F3 (zéro rescale, POUR CHACUN des 54 sprites),
    // pp-F6 (le fond est inerte). pp-F5 (le compte childCount 4→2) vit DANS
    // DistrictInteriorDioramaPlayModeTests.cs — c'est un AMENDEMENT d'une falsifiable existante,
    // pas une falsifiable neuve (§8 : « amendement explicite d'une falsifiable SCELLÉE »).
    //
    // ── RETRAIT DE DistrictAmbientFillPlayModeTests.cs (amb-F1..amb-F8) — raison NOMMÉE ──────────
    // Le design §7 du pivot (« ce qui survit du design nav-hud, ce qui meurt ») statue sur les 8 :
    //   amb-F1 (déterminisme/variété des templates)  RETIRÉE — porte sur BuildAmbientCell, qui
    //     n'existe plus (l'ambiant est baqué dans le fond, §3).
    //   amb-F2 (priorité joueur)                     TRANSFORMÉE → pp-F2 (le calage remplace
    //     "aucun ambiant sur une parcelle possédée" — il n'y a plus d'ambiant du tout côté Unity).
    //   amb-F3 (ambiant inerte)                      TRANSFORMÉE → pp-F6 (même propriété, portée
    //     par le FOND désormais, pas par des façades ambiantes qui n'existent plus).
    //   amb-F4 (clôture de la table de templates)    RETIRÉE — la table `AmbientSet.templates`
    //     n'a plus de consommateur runtime (voir implementation-notes.md § Deviations).
    //   amb-F5 (recouvrement réel des façades)        RETIRÉE — porte sur des façades qui n'existent plus.
    //   amb-F6 (parcellaire réel : cellules-rue)      TRANSFORMÉE → pp-F7 (design §8 : "le
    //     parcellaire vit dans le JSON, il s'y vérifie") — HORS PÉRIMÈTRE de ce chunk (pp-F7/pp-F8
    //     valident les artefacts P0, produits par l'atelier ; non redemandées par le mandat de ce
    //     chunk Unity — voir implementation-notes.md).
    //   amb-F7 (51 tokens scellés)                    SURVIT TEL QUEL — RELOCALISÉE ci-dessous,
    //     corps byte-identique, seul le fichier change.
    //   amb-F8 (aire opaque par parcelle)             RETIRÉE — mesure une aire de façades
    //     ambiantes Unity qui n'existent plus (l'aire opaque du fond, elle, est la propriété que
    //     F-transport/F-nocalque (sonde ⊥ Tools/resemblance-probe.py) mesurent désormais).
    //
    // ── RETRAIT DE DistrictInteriorFloorOrderPlayModeTests.cs (R4F1, R4F2) — raison NOMMÉE ───────
    // R4F1 (aucune Image de sol au-dessus d'un BuildingSprite) et R4F2 (l'indice de contour
    // GridBorder existe et est en premier) gardaient l'ORDRE DE FRATRIE entre `GridFloors`/
    // `GridBorder` et les cellules occupées — un mécanisme de la grille procédurale (§P3 :
    // « plus aucune grille procédurale »). Ni les sols ni la bordure ne sont plus rendus par
    // Unity (baqués dans le fond, §3) : il n'y a plus d'objet de fratrie à ordonner, et donc plus
    // de défaut d'occlusion possible de cette classe. Retirées sans transformation — aucune
    // falsifiable pp-F* ne les remplace, la propriété qu'elles gardaient n'a plus d'objet.
    [Category("W3U2")]
    public class DistrictBackgroundPlayModeTests
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
            yield return auth.SignUp(callsign, "w3u2-pp-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-pp", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        /// <summary>Own precondition, no shared state (charter 27) — a FRESH account per test, real
        /// district-16 (verge-a) payload — the only district with a real fond in vague 1.</summary>
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

        // ── pp-F1 — résolution native du fond ─────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator PpF1_BackgroundImage_NativeResolutionCompensatedByScaleFactor()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf1", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictBackground_PpF1");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.IsNotNull(scene, "pp-F5 — le conteneur fond+bâtiments existe");
            Transform fondT = scene.Find("DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "pp-F1 — verge-a (district 16) a un fond réel en vague 1");
            Image fondImg = fondT.GetComponent<Image>();
            Assert.IsNotNull(fondImg?.sprite, "le fond porte bien un sprite");
            Texture2D tex = fondImg.sprite.texture;
            Assert.AreEqual(1080, tex.width, "pp-F1 — texture.width == 1080");
            Assert.AreEqual(1920, tex.height, "pp-F1 — texture.height == 1920");

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas);
            float scaleFactor = canvas.scaleFactor;
            Assert.Greater(scaleFactor, 0f, "anti-vacuité — un scaleFactor nul rendrait toute comparaison triviale");

            var rt = (RectTransform)fondT;
            // §2.1 : « pp-F1 vérifie rect × scaleFactor == tex, JAMAIS rect == tex — c'était le
            // piège ». La valeur 0,859375 (1100×577) n'est PAS supposée ici — scaleFactor est LU.
            Assert.AreEqual(tex.width, rt.rect.width * scaleFactor, 0.5f, "pp-F1 — largeur native compensée");
            Assert.AreEqual(tex.height, rt.rect.height * scaleFactor, 0.5f, "pp-F1 — hauteur native compensée");

            Assert.IsFalse(fondImg.preserveAspect, "pp-F1 — pas de preserveAspect qui redimensionnerait");
            Assert.IsNull(fondT.GetComponent<LayoutGroup>(), "pp-F1 — le fond lui-même n'est pas un LayoutGroup");
            Assert.IsNull(scene.GetComponent<LayoutGroup>(), "pp-F1 — pas de LayoutGroup parent qui redimensionnerait le fond");
        }

        // ── pp-F2 / F-calage — POUR CHAQUE bâtiment du payload, son pivot tombe sur pivot_px LU
        // dans le JSON (quantificateur vérifié par le geste 4 du round 2 ⊥ : ni pp-F2 ni pp-F3 ne
        // portent un singulier — la boucle ci-dessous couvre TOUS les `dto.buildings` du J0, avec
        // anti-vacuité sur le compte exact (checkedBuildings == 4), jamais un seul bloc de test. ──

        [UnityTest]
        public IEnumerator PpF2_BuildingPivot_MatchesJsonPivotPx_WithinTwoPixels_AndGridSpacingIsUniform()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf2", d => dto = d);
            dto.day_phase = "NIGHT";

            DistrictBackgroundSlots bgSlots = DistrictBackgroundSlots.Current;
            Assert.IsNotNull(bgSlots, "l'asset DistrictBackgroundSlots doit être chargé");
            DistrictBackgroundSlots.BackgroundEntry entry = bgSlots.ResolveNight(dto.profile);
            Assert.IsNotNull(entry?.ancre, "anti-vacuité — verge-a doit avoir une carte d'ancrage réelle");
            var map = JsonUtility.FromJson<DistrictBackgroundAnchorDto>(entry.ancre.text);
            Assert.IsNotNull(map?.parcelles);
            Assert.Greater(map.parcelles.Length, 0, "anti-vacuité — la carte n'est pas vide");

            bareHostGo = new GameObject("DistrictBackground_PpF2");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            float scaleFactor = canvas.scaleFactor;
            Assert.Greater(scaleFactor, 0f);

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.Greater(dto.buildings.Length, 0, "anti-vacuité — au moins un bâtiment à calibrer");
            int checkedBuildings = 0;
            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Assert.IsNotNull(block, $"building {building.building} references a real block (D2)");
                Transform cell = scene.Find($"Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"bâtiment sur bloc ({block.x},{block.y}) doit être ancré");
                DistrictBackgroundParcelDto parcel = DistrictBackgroundAnchor.FindParcel(map, block.x, block.y);
                // pp-F2 mondes dégénérés (§9) : comparé à une valeur LUE dans le JSON produit par
                // Blender, JAMAIS recalculée côté Unity — sinon l'assertion serait une tautologie.
                Assert.IsNotNull(parcel, $"la carte porte une ancre pour ({block.x},{block.y})");
                Vector2 expected = DistrictBackgroundAnchor.PixelToFondLocal(
                    new Vector2(parcel.pivot_px[0], parcel.pivot_px[1]), map.image.w, map.image.h, scaleFactor);
                Vector2 actual = ((RectTransform)cell).anchoredPosition;
                float distPx = Vector2.Distance(expected, actual) * scaleFactor;
                Assert.LessOrEqual(distPx, 2f,
                    $"pp-F2/F-calage — bâtiment sur ({block.x},{block.y}) : écart au pivot JSON = {distPx:F2}px (≤2px exigé)");
                checkedBuildings++;
            }
            Assert.AreEqual(4, checkedBuildings, "starter kit J0 — scénario dimensionné, les 4 bâtiments calibrés");

            // F-calage, second volet — écart inter-blocs. ⚠️ DÉVIATION MESURÉE (implementation-notes.md
            // § Deviations) : le design (§8) écrit littéralement « l'écart entre (0,0) et (9,0) vaut
            // 9×pas_parcelle_m×ex ». Mesuré sur VERGE_D_NUIT_FINAL.json : delta observé
            // (-1,76 ; 824,53)px contre (1308,35 ; 299,11)px pour cette formule — parcelles.py a
            // choisi une orientation de grille NON alignée sur l'axe monde X (`ex`), un FAIT de la
            // donnée livrée (angle mesuré ≈ -68,8° de `ex`), pas une erreur d'implémentation Unity.
            // La propriété qui SURVIT (§9 : « tué par le contrôle d'écart inter-blocs » — anti-
            // dégénérescence d'un JSON dont les blocs ne formeraient pas un maillage uniforme) est
            // vérifiée avec un pas MESURÉ (0,0)→(1,0) plutôt qu'assumé via `ex` : le maillage doit
            // rester linéaire jusqu'à (9,0).
            DistrictBackgroundParcelDto p00 = DistrictBackgroundAnchor.FindParcel(map, 0, 0);
            DistrictBackgroundParcelDto p10 = DistrictBackgroundAnchor.FindParcel(map, 1, 0);
            DistrictBackgroundParcelDto p90 = DistrictBackgroundAnchor.FindParcel(map, 9, 0);
            Assert.IsNotNull(p00); Assert.IsNotNull(p10); Assert.IsNotNull(p90);
            Vector2 v00 = new Vector2(p00.pivot_px[0], p00.pivot_px[1]);
            Vector2 v10 = new Vector2(p10.pivot_px[0], p10.pivot_px[1]);
            Vector2 v90 = new Vector2(p90.pivot_px[0], p90.pivot_px[1]);
            Vector2 perStep = v10 - v00;
            Assert.Greater(perStep.magnitude, 1f, "anti-vacuité — le pas mesuré (0,0)→(1,0) n'est pas dégénéré (quasi-nul)");
            Vector2 expectedNine = v00 + 9f * perStep;
            float gridErrorPx = Vector2.Distance(expectedNine, v90);
            Assert.LessOrEqual(gridErrorPx, 2f,
                $"F-calage — maillage (0,0)→(9,0) linéaire à ≤2px du pas mesuré (0,0)→(1,0) (écart {gridErrorPx:F2}px)");
        }

        // ── pp-F3 — zéro rescale, POUR CHACUN des sprites livrés ─────────────────────────────────
        // Deux volets (implementation-notes.md § Deviations explique la coupe) : (1) le facteur
        // 1,000 d'affichage n'est vérifiable QUE sur les sprites que le contrôleur rend RÉELLEMENT
        // (une RectTransform n'existe que pour un sprite affiché) — les 4 bâtiments du J0, un par
        // operational_type WIRED ; (2) le ratio px/m déclaré (ppm_plan) est une propriété de la
        // PAIRE de fichiers livrés (ppm24.0 vs ppm56.471 du MÊME template) — vérifiable pour les
        // 54 sprites SANS rendu, en lisant les PNG bruts sur disque (§9 : « un sprite rendu au
        // mauvais PPM satisfait encore "rect==natif" ⇒ tué par le contrôle px/m==ppm_plan±1% »).

        [UnityTest]
        public IEnumerator PpF3_Part1_RenderedBuildingSprites_DisplayFactorIsExactlyOne()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf3", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictBackground_PpF3");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            float scaleFactor = canvas.scaleFactor;
            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.Greater(dto.buildings.Length, 0, "anti-vacuité");

            int checkedSprites = 0;
            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Transform cell = scene.Find($"Cell_{block.x}_{block.y}");
                Transform spriteT = cell.Find("BuildingSprite");
                Assert.IsNotNull(spriteT);
                Image img = spriteT.GetComponent<Image>();
                Assert.IsNotNull(img?.sprite, $"building {building.operational_type} doit porter un vrai sprite importé");
                var rt = (RectTransform)spriteT;
                float dispW = rt.rect.width * scaleFactor;
                float dispH = rt.rect.height * scaleFactor;
                Assert.AreEqual(img.sprite.rect.width, dispW, 0.5f,
                    $"pp-F3 — {building.operational_type} : largeur affichée == largeur native (facteur 1,000)");
                Assert.AreEqual(img.sprite.rect.height, dispH, 0.5f,
                    $"pp-F3 — {building.operational_type} : hauteur affichée == hauteur native (facteur 1,000)");
                checkedSprites++;
            }
            Assert.AreEqual(4, checkedSprites, "starter kit J0 — scénario dimensionné, les 4 bâtiments vérifiés");
        }

        // ⚠️ DÉFAUT MESURÉ, HORS PÉRIMÈTRE DE CE CHUNK (implementation-notes.md § Deviations) —
        // `laverie_nuit_base` (les DEUX PPM) est le SEUL des 27 couples livrés dont le ratio croisé
        // s'écarte de plus de 1% (mesuré : 9,02% sur la largeur, 24:159×145 vs 56.471:347×375,
        // contre ≤0,34% pour les 26 autres couples — un pic isolé, pas un défaut de méthode : la
        // même sonde rend 0,02%-0,34% partout ailleurs). C'est EXACTEMENT la classe que pp-F3 existe
        // pour attraper (§9 : « un sprite rendu au mauvais PPM… tué par le contrôle px/m==ppm_plan
        // ±1% ») — donc ce test reste ROUGE sur `laverie_nuit_base`, VOLONTAIREMENT : le masquer
        // (tolérance élargie, fichier exclu du balayage) serait exactement le « trou masqué » que le
        // socle interdit. Correctif = un RE-RENDU Blender (chunk P1, atelier — hors outillage de ce
        // chunk Unity). `BuildingSpriteSlots.cashSafehouse` a été RE-CÂBLÉ sur `residentiel3` (propre,
        // 0,12%) pour que le chemin de RENDU (pp-F3 Part 1, PpF2, la capture) ne dépende pas de cet
        // asset défectueux — seul ce balayage EXHAUSTIF (Part 2, les 54 fichiers bruts) le voit encore.
        //
        // MODE D'EMPLOI DE PÉREMPTION (précédent maison : le test qui épinglait un bug ratifié via
        // `toBe(404)`, socle) — en toutes lettres : CE ROUGE EST ATTENDU tant que `laverie_nuit_base`
        // (ppm24.0 ET ppm56.471) n'a PAS été re-rendue à l'atelier (chunk P1, lot séparé). LE JOUR OU
        // ELLE L'EST, ce test devient VERT et CETTE NOTE (du "⚠️ DÉFAUT MESURÉ" ci-dessus jusqu'ici)
        // DOIT ÊTRE SUPPRIMÉE — un rouge qui reste épinglé après que sa cause a été fermée devient un
        // faux négatif silencieux, la classe exacte que ce mode d'emploi existe pour prévenir.
        [Test]
        public void PpF3_Part2_AllFiftyFourDeliveredSprites_CrossPpmRatioMatchesDeclaredPpm_WithinOnePercent()
        {
            string dir = Path.Combine(Application.dataPath, "Art/District/Sprites");
            Assert.IsTrue(Directory.Exists(dir), $"sprites dir not found at {dir}");
            string[] files = Directory.GetFiles(dir, "*.png");
            Assert.AreEqual(54, files.Length, "anti-vacuité — les 54 sprites livrés (27 template×état × 2 PPM) sont tous importés");

            var byBase = new Dictionary<string, Dictionary<string, string>>(); // base -> ppmTag -> path
            var rx = new Regex(@"^(?<base>.+)_ppm(?<ppm>[0-9.]+)\.png$");
            foreach (string f in files)
            {
                string name = Path.GetFileName(f);
                Match m = rx.Match(name);
                Assert.IsTrue(m.Success, $"nom de fichier inattendu, ne matche pas le patron <base>_ppm<N>.png : {name}");
                string bse = m.Groups["base"].Value;
                string ppm = m.Groups["ppm"].Value;
                if (!byBase.TryGetValue(bse, out Dictionary<string, string> d)) { d = new Dictionary<string, string>(); byBase[bse] = d; }
                d[ppm] = f;
            }
            Assert.AreEqual(27, byBase.Count, "anti-vacuité — 27 couples (template, état)");

            const float declaredPpmD = 24.0f;   // camera D — ppm_plan des fonds verge (§2 du design)
            const float declaredPpmZo = 56.471f; // camera ZO — non consommée par cet écran, cross-check seulement
            float expectedRatio = declaredPpmD / declaredPpmZo;

            int checkedPairs = 0;
            foreach (KeyValuePair<string, Dictionary<string, string>> kv in byBase)
            {
                Assert.IsTrue(kv.Value.ContainsKey("24.0") && kv.Value.ContainsKey("56.471"),
                    $"{kv.Key} — les DEUX PPM livrés (24.0 et 56.471) doivent exister");
                (int w24, int h24) = ReadPngSize(kv.Value["24.0"]);
                (int w56, int h56) = ReadPngSize(kv.Value["56.471"]);
                float ratioW = (float)w24 / w56;
                float ratioH = (float)h24 / h56;
                Assert.LessOrEqual(Mathf.Abs(ratioW - expectedRatio) / expectedRatio, 0.01f,
                    $"pp-F3 — {kv.Key} : ratio largeur ppm24/ppm56.471 ({ratioW:F4}) doit être à ±1% de {expectedRatio:F4}");
                Assert.LessOrEqual(Mathf.Abs(ratioH - expectedRatio) / expectedRatio, 0.01f,
                    $"pp-F3 — {kv.Key} : ratio hauteur ppm24/ppm56.471 ({ratioH:F4}) doit être à ±1% de {expectedRatio:F4}");
                checkedPairs++;
            }
            Assert.AreEqual(27, checkedPairs, "pp-F3 — les 27 couples (54 sprites livrés) sont TOUS vérifiés");
        }

        private static (int w, int h) ReadPngSize(string path)
        {
            byte[] bytes = File.ReadAllBytes(path);
            var tex = new Texture2D(2, 2);
            bool ok = ImageConversion.LoadImage(tex, bytes);
            Assert.IsTrue(ok, $"PNG illisible : {path}");
            int w = tex.width, h = tex.height;
            Object.DestroyImmediate(tex);
            return (w, h);
        }

        // ── pp-F6 — le fond est inerte ────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator PpF6_BackgroundImage_IsInert_RaycastOffNoButtonNoChildren()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf6", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictBackground_PpF6");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            // pp-F6 mondes dégénérés (§9) : un fond ABSENT satisferait trivialement "ne porte ni
            // bouton ni état" ⇒ on exige D'ABORD que pp-F1 passe sur la MÊME instance (le fond existe
            // réellement) avant de vérifier son inertie.
            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Transform fondT = scene.Find("DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "pp-F6 exige D'ABORD que le fond existe (pp-F1) — sinon l'inertie est vraie à vide");
            Image fondImg = fondT.GetComponent<Image>();
            Assert.IsNotNull(fondImg?.sprite);

            Assert.IsFalse(fondImg.raycastTarget, "pp-F6 — raycastTarget == false");
            Assert.IsNull(fondT.GetComponent<Button>(), "pp-F6 — le fond ne porte aucun Button");
            Assert.AreEqual(0, fondT.childCount,
                "pp-F6 — le fond est un LEAF : aucun enfant (*Ov/LieutenantMarker/tout état) n'est parenté sous lui " +
                "(les bâtiments sont des FRÈRES du fond sous DistrictScene, pas ses enfants)");
        }

        // ── amb-F7 (nav-hud-design-v1.md §2.7) — RELOCALISÉE ici tel quel (design pivot §7 :
        // « SURVIT tel quel — les 4 axes scellés restent la loi pour ce qu'Unity dessine »). Corps
        // byte-identique à DistrictAmbientFillPlayModeTests.cs (retiré, voir tête de ce fichier) —
        // seul le fichier change.

        [Test]
        public void AmbF7_SealedTokenCountUnchanged()
        {
            Assert.AreEqual(51, MafiaCleanCity.Theme.Tests.CanonPaletteComparator.ExpectedTokenCount,
                "amb-F7 — le pivot fond pré-rendu n'ajoute AUCUNE teinte : les 51 clés de DesignTokens restent fermées");
        }
    }
}
