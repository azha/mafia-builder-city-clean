using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace MafiaCleanCity.AssetLint
{
    /// <summary>
    /// W3.U-DA/C3 — exporte les rasters `16/24/32/48` de chaque `icon_&lt;nom&gt;.svg` sous
    /// `Assets/Art/Icons/Source/` vers `Assets/Art/Icons/icon_&lt;nom&gt;_&lt;taille&gt;.png`
    /// (motif canonique `import_settings.md:103`, G3). C'est le mécanisme réel derrière "rasters
    /// dérivés à l'import" (§4.1 du design) : `com.unity.vectorgraphics` n'est PAS installé dans
    /// ce projet (mesuré, `Packages/manifest.json`) — ajouter un package est un changement de
    /// surface que ce lot évite (option conservatrice) ; <see cref="SvgRasterizer.RasterizeToTexture"/>
    /// (déjà prouvé par G4 en C2) fait le travail directement, sans dépendance nouvelle.
    /// </summary>
    public static class IconRasterExporter
    {
        private static readonly int[] Sizes = { 16, 24, 32, 48 };
        private const string SourceDir = "Assets/Art/Icons/Source";
        private const string OutputDir = "Assets/Art/Icons";

        [MenuItem("MafiaCleanCity/W3.U-DA/Export Icon Rasters")]
        public static void ExportAll()
        {
            var projectRoot = Directory.GetParent(Application.dataPath).FullName;
            var sourceAbs = Path.Combine(projectRoot, SourceDir);
            var outputAbs = Path.Combine(projectRoot, OutputDir);
            Directory.CreateDirectory(outputAbs);

            if (!Directory.Exists(sourceAbs))
            {
                Debug.LogError($"IconRasterExporter: dossier source introuvable : {sourceAbs}");
                return;
            }

            var svgFiles = Directory.GetFiles(sourceAbs, "*.svg").OrderBy(f => f).ToArray();
            int exported = 0;
            foreach (var svgPath in svgFiles)
            {
                var baseName = Path.GetFileNameWithoutExtension(svgPath); // "icon_<nom>"
                var svgText = File.ReadAllText(svgPath);
                foreach (var size in Sizes)
                {
                    Texture2D tex;
                    try
                    {
                        tex = SvgRasterizer.RasterizeToTexture(svgText, size);
                    }
                    catch (Exception e)
                    {
                        Debug.LogError($"IconRasterExporter: échec rasterisation '{svgPath}' @ {size}px — {e.Message}");
                        continue;
                    }
                    var png = tex.EncodeToPNG();
                    UnityEngine.Object.DestroyImmediate(tex);
                    var outPath = Path.Combine(outputAbs, $"{baseName}_{size}.png");
                    File.WriteAllBytes(outPath, png);
                    exported++;
                }
            }

            AssetDatabase.Refresh(); // déclenche l'import -> W4P4aArtImportPostprocessor (textureType: 8)
            Debug.Log($"IconRasterExporter: {svgFiles.Length} SVG -> {exported} rasters PNG écrits sous {OutputDir}");
        }

        /// <summary>Point d'entrée batchmode (-executeMethod), quitte le process avec le code réel.</summary>
        public static void ExportAllAndExit()
        {
            try
            {
                ExportAll();
                EditorApplication.Exit(0);
            }
            catch (Exception e)
            {
                Debug.LogError($"IconRasterExporter.ExportAllAndExit: {e}");
                EditorApplication.Exit(1);
            }
        }
    }
}
