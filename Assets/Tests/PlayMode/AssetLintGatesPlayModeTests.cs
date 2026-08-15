using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.AssetLint;
using MafiaCleanCity.Theme.Tests;

namespace MafiaCleanCity.AssetLint.Tests
{
    /// <summary>
    /// W3.U-DA/C2 — G2-G5 du QA gate exécutable, chacune prouvée par fixture EMPOISONNÉE (jamais
    /// committée — générée à la volée dans le test, cf §4.3/C2 du design) qui la fait rougir, et
    /// son retrait qui la rend verte. G1 (pointeur LFS) est prouvé séparément par
    /// `Tools/lfs-pointer-check.sh` (mécanisme git, pas Unity — cf commit C2).
    /// </summary>
    [Category("W3UDA")]
    public class AssetLintGatesPlayModeTests
    {
        // ── G2 : textureType: 8 ──────────────────────────────────────────────────────────────

        [Test]
        public void G2_Passes_OnConformantMeta()
        {
            var meta = "fileFormatVersion: 2\nguid: abc123\nTextureImporter:\n  textureType: 8\n  spriteImportMode: 1\n";
            Assert.IsTrue(AssetLintGates.G2_MetaTextureType8(meta).Passed);
        }

        [Test]
        public void G2_Red_OnPoisonedMeta_WrongTextureType()
        {
            // empoisonné : textureType: 0 (Default) au lieu de 8 (Sprite) — jamais committé,
            // fabriqué en mémoire pour ce test uniquement.
            var poisoned = "fileFormatVersion: 2\nguid: abc123\nTextureImporter:\n  textureType: 0\n  spriteImportMode: 1\n";
            Assert.IsFalse(AssetLintGates.G2_MetaTextureType8(poisoned).Passed, "G2 aurait dû rougir sur textureType: 0.");
        }

        [Test]
        public void G2_Red_OnPoisonedMeta_FilterModeIsNotTextureType()
        {
            // piège nommé par le design : filterMode n'est JAMAIS le signal — un .meta qui porte
            // filterMode mais PAS textureType: 8 doit rester rouge (tautologie évitée).
            var poisoned = "fileFormatVersion: 2\nTextureImporter:\n  filterMode: 0\n  textureType: 3\n";
            Assert.IsFalse(AssetLintGates.G2_MetaTextureType8(poisoned).Passed);
        }

        // ── G3 : nommage canonique ────────────────────────────────────────────────────────────

        [TestCase("icon_status_alert_16.png", true)]
        [TestCase("icon_status_alert_24.png", true)]
        [TestCase("icon_status_alert_32.png", true)]
        [TestCase("icon_status_alert_48.png", true)]
        [TestCase("icon_building_type_narco_lab_16.png", true)]
        [TestCase("Icon_Status_Alert_16.png", false)] // casse — le canon est [a-z0-9_] strict
        [TestCase("icon_status_alert_20.png", false)]  // taille hors {16,24,32,48}
        [TestCase("icon_status_alert.png", false)]     // pas de suffixe de taille
        [TestCase("status_alert_16.png", false)]       // pas de préfixe icon_
        [TestCase("icon_status_alert_16.svg", false)]  // pas .png (G3 vise le raster)
        public void G3_CanonicalNaming(string fileName, bool expectedPass)
        {
            Assert.AreEqual(expectedPass, AssetLintGates.G3_CanonicalNaming(fileName).Passed, $"G3 pour '{fileName}'");
        }

        // ── G4 : palette_compliance — un pixel rendu à la fois, dans les 6 tournures + opacité ─

        private static List<Color> LoadCanonPalette()
        {
            var extract = CanonPaletteComparator.LoadExtractFromDisk();
            return extract.tokens.Select(t => new Color(t.r, t.g, t.b, t.a)).ToList();
        }

        private const string AccentSuccessHex = "#43e0c0"; // dans la palette (accentSuccess)
        private const string OffPaletteBeigeHex = "#d2b48c"; // HORS palette, ET hors les 4 interdits — le cas exact du design (§4.3 : "doit échouer G4, passe G5")

        private static GateResult RunG4(string svg)
        {
            var samples = SvgRasterizer.Rasterize(svg, gridSize: 16);
            return AssetLintGates.G4_PaletteCompliance(samples, LoadCanonPalette());
        }

        [Test]
        public void G4_Tourn1_FillAttribute_Conforme()
        {
            var svg = $"<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='{AccentSuccessHex}'/></svg>";
            Assert.IsTrue(RunG4(svg).Passed);
        }

        [Test]
        public void G4_Tourn1_FillAttribute_Empoisonne()
        {
            var svg = $"<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='{OffPaletteBeigeHex}'/></svg>";
            Assert.IsFalse(RunG4(svg).Passed, "tournure 1 (fill=) : un beige hors palette aurait dû faire rougir G4.");
        }

        [Test]
        public void G4_Tourn2_StyleAttribute_Conforme()
        {
            var svg = $"<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' style='fill:{AccentSuccessHex}'/></svg>";
            Assert.IsTrue(RunG4(svg).Passed);
        }

        [Test]
        public void G4_Tourn2_StyleAttribute_Empoisonne()
        {
            var svg = $"<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' style='fill:{OffPaletteBeigeHex}'/></svg>";
            Assert.IsFalse(RunG4(svg).Passed, "tournure 2 (style=\"fill:\") non détectée.");
        }

        [Test]
        public void G4_Tourn3_StyleBlockClass_Conforme()
        {
            var svg = $"<svg viewBox='0 0 24 24'><style>.p {{ fill: {AccentSuccessHex}; }}</style><rect x='4' y='4' width='16' height='16' class='p'/></svg>";
            Assert.IsTrue(RunG4(svg).Passed);
        }

        [Test]
        public void G4_Tourn3_StyleBlockClass_Empoisonne()
        {
            var svg = $"<svg viewBox='0 0 24 24'><style>.p {{ fill: {OffPaletteBeigeHex}; }}</style><rect x='4' y='4' width='16' height='16' class='p'/></svg>";
            Assert.IsFalse(RunG4(svg).Passed, "tournure 3 (<style> + classe) non détectée.");
        }

        [Test]
        public void G4_Tourn4_ShortHex_Conforme()
        {
            // #fff -> #ffffff est dans la palette ? Non — on prend un cas réellement dans la
            // palette et exprimable en hex court : onSurfacePrimary #eef1f2 n'est pas court.
            // On teste donc la CORRECTION du parsing (#000 -> #000000, présent nulle part dans
            // la palette) via l'assertion négative, et on prouve le positif avec un token qui a
            // une forme courte valide : aucun des 40 n'a de forme #rgb exacte -- donc le test
            // positif de cette tournure se fait sur la PROPRIÉTÉ DE PARSING (hex court résolu à
            // la bonne valeur RGB), vérifiée indépendamment ci-dessous, et le test G4 lui-même
            // se limite au négatif (le cas qui compte pour la lint : un hex court doit être VU).
            var svg = "<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='#000'/></svg>";
            var samples = SvgRasterizer.Rasterize(svg, gridSize: 4);
            Assert.IsTrue(samples.Count > 0 && samples.All(s => AssetLintGates.ColorHex(s.Color) == "#000000"),
                "le hex court #000 n'a pas été résolu en #000000 — la tournure 4 échapperait au rendu.");
        }

        [Test]
        public void G4_Tourn4_ShortHex_Empoisonne()
        {
            // #d2b -> #dd22bb, hors palette et hors les 4 interdits (vérifié : h proche du rose
            // mais S/V insuffisants pour neon_pink -- pas le point ici, seul G4 est testé).
            var svg = "<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='#d2b'/></svg>";
            Assert.IsFalse(RunG4(svg).Passed, "tournure 4 (hex court empoisonné #d2b) non détectée.");
        }

        [Test]
        public void G4_Tourn5_RgbFunctional_Conforme()
        {
            // accentSuccess (0.263,0.878,0.753) -> rgb(67,224,192) sous arrondi demi-haut.
            var svg = "<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='rgb(67,224,192)'/></svg>";
            Assert.IsTrue(RunG4(svg).Passed);
        }

        [Test]
        public void G4_Tourn5_RgbFunctional_Empoisonne()
        {
            var svg = "<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='rgb(210,180,140)'/></svg>"; // beige
            Assert.IsFalse(RunG4(svg).Passed, "tournure 5 (rgb()) empoisonnée non détectée.");
        }

        [Test]
        public void G4_Tourn6_NamedColor_Empoisonne()
        {
            // "gold" (#ffd700) n'est PAS accentGold (#ffd23f) — hors palette d'un cheveu, mais
            // hors palette quand même : preuve que le nom CSS est résolu, pas juste "reconnu".
            var svg = "<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='gold'/></svg>";
            Assert.IsFalse(RunG4(svg).Passed, "tournure 6 (nom CSS 'gold') : devrait être hors palette (accentGold a une valeur DIFFÉRENTE).");
        }

        [Test]
        public void G4_Tourn7_FillOpacity_Empoisonne()
        {
            // le PIÈGE nommé §4.3 cas 7 : littéral EN palette, pixel rendu HORS palette une fois
            // composé à opacité < 1 sur fond blanc.
            var svg = $"<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='{AccentSuccessHex}' fill-opacity='0.5'/></svg>";
            Assert.IsFalse(RunG4(svg).Passed, "cas 7 (fill-opacity) : le littéral est en palette mais le pixel rendu doit être détecté hors palette.");
        }

        [Test]
        public void G4_Tourn7_FullOpacity_ResteConforme()
        {
            // contrôle négatif du cas 7 : opacity=1 (défaut) ne doit PAS faire rougir un token conforme.
            var svg = $"<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='{AccentSuccessHex}' fill-opacity='1'/></svg>";
            Assert.IsTrue(RunG4(svg).Passed);
        }

        [Test]
        public void G4_AntiVacuite_SvgVide()
        {
            var svg = "<svg viewBox='0 0 24 24'></svg>";
            var result = RunG4(svg);
            Assert.IsFalse(result.Passed, "un SVG vide (0 pixel rendu) ne doit PAS passer G4 par défaut — anti-vacuité.");
        }

        // ── G5 : forbidden (raster) — exclusion, prouvée sur les 4 prédicats ────────────────────

        [Test]
        public void G5_Passes_OnCleanPixelSet()
        {
            var pixels = new List<Color> { new Color(67 / 255f, 224 / 255f, 192 / 255f), new Color(0.5f, 0.5f, 0.5f) };
            Assert.IsTrue(AssetLintGates.G5_ForbiddenColors(pixels).Passed);
        }

        [Test]
        public void G5_Red_OnPoisonedFixture_GoldSaturated()
        {
            // fixture empoisonnée à l'or saturé (#ffd23f, accentGold lui-même) — exigé par le
            // design ("fixture délibérément empoisonnée à l'or saturé ⇒ doit rougir", C4 falsifiable iii).
            var pixels = Enumerable.Repeat(new Color(1f, 0.824f, 0.247f), 100).ToList(); // #ffd23f x100, 100% forbidden
            var result = AssetLintGates.G5_ForbiddenColors(pixels);
            Assert.IsFalse(result.Passed, "G5 aurait dû rougir sur une fixture 100% or saturé.");
        }

        [Test]
        public void G5_Red_OnPoisonedFixture_AboveTolerance()
        {
            // 1 pixel interdit sur 100 = 1% > tolérance 0.5% -> doit rougir.
            var pixels = new List<Color>();
            pixels.Add(new Color(1f, 0.824f, 0.247f)); // interdit
            for (int i = 0; i < 99; i++) pixels.Add(new Color(0.5f, 0.5f, 0.5f)); // propre
            Assert.IsFalse(AssetLintGates.G5_ForbiddenColors(pixels).Passed, "1/100 (1%) > tolérance 0.5% doit rougir.");
        }

        [Test]
        public void G5_Green_BelowTolerance_SinglePixelAntiAliasingArtifact()
        {
            // 1 pixel interdit sur 1000 = 0.1% <= tolérance 0.5% -> doit passer (artefact isolé toléré).
            var pixels = new List<Color> { new Color(1f, 0.824f, 0.247f) };
            for (int i = 0; i < 999; i++) pixels.Add(new Color(0.5f, 0.5f, 0.5f));
            Assert.IsTrue(AssetLintGates.G5_ForbiddenColors(pixels).Passed);
        }

        [Test]
        public void G5_AntiVacuite_EmptyPixelSet()
        {
            Assert.IsFalse(AssetLintGates.G5_ForbiddenColors(new List<Color>()).Passed, "un jeu de pixels vide ne doit pas passer G5 par défaut.");
        }

        [Test]
        public void G5_G4_DistinctPredicate_BeigeExample()
        {
            // le contrôle croisé exigé par le design (§4.3) : le MÊME beige hors-palette PASSE
            // G5 (il n'est aucun des 4 interdits) et ÉCHOUE G4 (il n'appartient à aucune ColorRamp).
            var beige = new Color(0xd2 / 255f, 0xb4 / 255f, 0x8c / 255f);
            Assert.IsTrue(AssetLintGates.G5_ForbiddenColors(new List<Color> { beige }).Passed, "le beige doit PASSER G5.");

            var svg = $"<svg viewBox='0 0 24 24'><rect x='4' y='4' width='16' height='16' fill='{OffPaletteBeigeHex}'/></svg>";
            Assert.IsFalse(RunG4(svg).Passed, "le même beige doit ÉCHOUER G4.");
        }
    }
}
