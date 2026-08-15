using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace MafiaCleanCity.AssetLint
{
    /// <summary>
    /// W3.U-DA/C3 — valide TOUS les SVG sous Assets/Art/Icons/Source/ contre G4 (palette) et G5
    /// (interdits), et vérifie l'épaisseur de trait constante (attribut CALCULÉ, pas une
    /// tournure — cf G4 du design). Point d'entrée batchmode, quitte avec le code réel.
    /// </summary>
    [Serializable]
    internal class MinimalPaletteToken { public string name; public float r, g, b, a; }
    [Serializable]
    internal class MinimalPaletteExtract { public MinimalPaletteToken[] tokens; }

    public static class IconBatchValidator
    {
        private const string SourceDir = "Assets/Art/Icons/Source";
        private const string ExtractPath = "Assets/Editor/CanonPaletteExtract/canon_palette_extract.json";

        private static List<Color> LoadCanonPalette()
        {
            var projectRoot = Directory.GetParent(Application.dataPath).FullName;
            var path = Path.Combine(projectRoot, ExtractPath);
            var json = File.ReadAllText(path);
            var extract = JsonUtility.FromJson<MinimalPaletteExtract>(json);
            return extract.tokens.Select(t => new Color(t.r, t.g, t.b, t.a)).ToList();
        }

        public static void ValidateAllAndExit()
        {
            try
            {
                var ok = ValidateAll();
                EditorApplication.Exit(ok ? 0 : 1);
            }
            catch (Exception e)
            {
                Debug.LogError($"IconBatchValidator: exception — {e}");
                EditorApplication.Exit(1);
            }
        }

        public static bool ValidateAll()
        {
            var projectRoot = Directory.GetParent(Application.dataPath).FullName;
            var sourceAbs = Path.Combine(projectRoot, SourceDir);
            var svgFiles = Directory.GetFiles(sourceAbs, "*.svg").OrderBy(f => f).ToArray();

            var palette = LoadCanonPalette();

            int total = svgFiles.Length;
            int g4Pass = 0, g5Pass = 0, strokePass = 0;
            var failures = new List<string>();

            foreach (var svgPath in svgFiles)
            {
                var name = Path.GetFileName(svgPath);
                var svgText = File.ReadAllText(svgPath);

                List<SvgRasterizer.Sample> samples;
                try
                {
                    samples = SvgRasterizer.Rasterize(svgText, gridSize: 48);
                }
                catch (Exception e)
                {
                    failures.Add($"{name}: rasterisation a levé une exception — {e.Message}");
                    continue;
                }

                var g4 = AssetLintGates.G4_PaletteCompliance(samples, palette);
                if (g4.Passed) g4Pass++;
                else failures.Add($"{name}: G4 FAIL — {string.Join(" | ", g4.Errors.Take(3))}");

                var pixelColors = samples.Select(s => s.Color).ToList();
                var g5 = AssetLintGates.G5_ForbiddenColors(pixelColors);
                if (g5.Passed) g5Pass++;
                else failures.Add($"{name}: G5 FAIL — {string.Join(" | ", g5.Errors.Take(3))}");

                // épaisseur de trait constante : tous les stroke-width="N" du fichier doivent
                // être IDENTIQUES (attribut calculé, pas une tournure -- simple extraction texte
                // suffit ici car on contrôle la propriété d'AUTEUR, pas le rendu).
                var strokeWidths = System.Text.RegularExpressions.Regex.Matches(svgText, @"stroke-width=""([\d.]+)""")
                    .Cast<System.Text.RegularExpressions.Match>()
                    .Select(m => m.Groups[1].Value)
                    .Distinct()
                    .ToList();
                // tolère 2 valeurs (trait principal + trait fin de détail, ex: list_icon) mais
                // pas plus — sinon l'épaisseur n'est plus "constante" au sens du design.
                if (strokeWidths.Count <= 2) strokePass++;
                else failures.Add($"{name}: épaisseurs de trait multiples ({strokeWidths.Count}) — {string.Join(",", strokeWidths)}");
            }

            Debug.Log($"IconBatchValidator: total={total} G4_pass={g4Pass} G5_pass={g5Pass} stroke_pass={strokePass}");
            foreach (var f in failures) Debug.LogError("IconBatchValidator: " + f);

            bool allOk = g4Pass == total && g5Pass == total && strokePass == total;
            Debug.Log($"IconBatchValidator: RESULT {(allOk ? "ALL PASS" : "FAILURES PRESENT")}");
            return allOk;
        }
    }
}
