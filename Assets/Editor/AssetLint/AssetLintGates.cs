using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEngine;

namespace MafiaCleanCity.AssetLint
{
    /// <summary>Résultat d'une gate : vert (Passed) ou liste d'erreurs classées.</summary>
    public class GateResult
    {
        public bool Passed => Errors.Count == 0;
        public List<string> Errors = new List<string>();
        public static GateResult Ok() => new GateResult();
        public static GateResult Fail(params string[] errors) => new GateResult { Errors = errors.ToList() };
    }

    /// <summary>
    /// W3.U-DA/C2 — G2-G5 du QA gate exécutable (§4.3 du design). G1 (pointeur LFS) est un
    /// contrôle GIT, pas Unity — cf `Tools/lfs-pointer-check.sh`, exécuté par chunk sur les
    /// binaires réellement committés (C4/C5), jamais en note.
    /// </summary>
    public static class AssetLintGates
    {
        // ── G2 : .meta textureType: 8 ───────────────────────────────────────────────────────
        // Regex ANCRÉE sur la ligne exacte — jamais `filterMode` (défaut Unity, tautologique,
        // cf §4.3 tableau G2 du design).
        private static readonly Regex TextureType8Pattern = new Regex(@"^\s*textureType:\s*8\s*$", RegexOptions.Multiline);

        public static GateResult G2_MetaTextureType8(string metaFileText)
        {
            if (metaFileText == null) return GateResult.Fail("G2: .meta introuvable/vide");
            return TextureType8Pattern.IsMatch(metaFileText)
                ? GateResult.Ok()
                : GateResult.Fail("G2: 'textureType: 8' absent du .meta — le postprocesseur n'a pas forcé Sprite, ou le fichier a été altéré.");
        }

        // ── G3 : nommage canonique (le motif du CANON, le plus strict — cf §1.7 du design) ──
        // ^icon_[a-z0-9_]+_(16|24|32|48)\.png$ — appliqué en -E explicite (ancré début/fin).
        public static readonly Regex CanonIconNamePattern = new Regex(@"^icon_[a-z0-9_]+_(16|24|32|48)\.png$");

        public static GateResult G3_CanonicalNaming(string fileName)
        {
            return CanonIconNamePattern.IsMatch(fileName)
                ? GateResult.Ok()
                : GateResult.Fail($"G3: '{fileName}' ne matche pas le motif canonique ^icon_[a-z0-9_]+_(16|24|32|48)\\.png$");
        }

        // ── G4 : palette_compliance — APPARTENANCE, sur des PIXELS rendus (jamais un littéral) ─
        // T.asset.qa.auto_check_threshold_palette_deviation : namespace `qa`, D-3 du design
        // (10 namespaces T.asset.* sans définition). Ce chunk (C2) EST le premier consommateur
        // d'une clé de ce namespace -> événement de réouverture nommé par D-3 lui-même. Valeur
        // posée ici, MÊME PATRON que forbidden_color_tolerance_pct en C0 (scalaire "à poser",
        // révisable au premier faux positif) : ajoutée à gdd/14 dans CE commit (C2), pas
        // rétroactivement dans C0 (dont la portée déclarée excluait explicitement `qa`).
        public const float PaletteDeviationTolerancePct = 2.0f; // T.asset.qa.auto_check_threshold_palette_deviation

        public static GateResult G4_PaletteCompliance(List<SvgRasterizer.Sample> renderedPixels, IReadOnlyList<Color> palette)
        {
            if (renderedPixels == null || renderedPixels.Count == 0)
                return GateResult.Fail("G4: 0 pixel rendu — SVG vide ou rasterisation ratée (anti-vacuité).");

            var errors = new List<string>();
            float toleranceDistance = (PaletteDeviationTolerancePct / 100f) * Mathf.Sqrt(3f); // distance RGB max = sqrt(3)

            foreach (var sample in renderedPixels)
            {
                float best = float.MaxValue;
                foreach (var p in palette)
                {
                    float d = Vector4Distance(sample.Color, p);
                    if (d < best) best = d;
                }
                if (best > toleranceDistance)
                {
                    errors.Add($"G4: pixel ({sample.X:F1},{sample.Y:F1}) couleur={ColorHex(sample.Color)} hors palette (distance min={best:F4} > tol={toleranceDistance:F4})");
                }
            }
            return errors.Count == 0 ? GateResult.Ok() : new GateResult { Errors = errors };
        }

        // ── G5 : forbidden (raster) — EXCLUSION, sur des pixels quantifiés ──────────────────
        // T.asset.palette.forbidden_color_tolerance_pct — posé en C0.
        public const float ForbiddenColorTolerancePct = 0.5f;

        public static GateResult G5_ForbiddenColors(IReadOnlyList<Color> pixels)
        {
            if (pixels == null || pixels.Count == 0)
                return GateResult.Fail("G5: 0 pixel — anti-vacuité (un asset vide ne peut pas passer G5 par défaut).");

            int forbiddenCount = 0;
            var hits = new List<string>();
            foreach (var px in pixels)
            {
                if (px.a <= 0.001f) continue; // pixel transparent : hors périmètre du lint de couleur
                var kind = ForbiddenPredicates.Classify(px);
                if (kind.HasValue)
                {
                    forbiddenCount++;
                    hits.Add($"{ColorHex(px)} -> {kind.Value}");
                }
            }
            float pct = 100f * forbiddenCount / pixels.Count;
            if (pct > ForbiddenColorTolerancePct)
            {
                return GateResult.Fail($"G5: {forbiddenCount}/{pixels.Count} pixels ({pct:F2}%) interdits > tolérance {ForbiddenColorTolerancePct}% :\n" + string.Join("\n", hits.Distinct().Take(10)));
            }
            return GateResult.Ok();
        }

        // ── utilitaires ──────────────────────────────────────────────────────────────────────

        public static List<Color> LoadPngPixels(string absolutePath)
        {
            var bytes = File.ReadAllBytes(absolutePath);
            var tex = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            tex.LoadImage(bytes);
            var pixels = tex.GetPixels().ToList();
            UnityEngine.Object.DestroyImmediate(tex);
            return pixels;
        }

        private static float Vector4Distance(Color a, Color b)
        {
            float dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
            return Mathf.Sqrt(dr * dr + dg * dg + db * db);
        }

        public static string ColorHex(Color c)
        {
            int r = Mathf.Clamp(Mathf.FloorToInt(c.r * 255f + 0.5f), 0, 255);
            int g = Mathf.Clamp(Mathf.FloorToInt(c.g * 255f + 0.5f), 0, 255);
            int b = Mathf.Clamp(Mathf.FloorToInt(c.b * 255f + 0.5f), 0, 255);
            return $"#{r:x2}{g:x2}{b:x2}";
        }
    }
}
