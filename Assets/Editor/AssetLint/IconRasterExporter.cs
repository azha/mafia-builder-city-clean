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
                    var outPath = OuVaCeRaster(outputAbs, $"{baseName}_{size}.png");
                    File.WriteAllBytes(outPath, png);
                    exported++;
                }
            }

            AssetDatabase.Refresh(); // déclenche l'import -> W4P4aArtImportPostprocessor (textureType: 8)

            // ⛔ CONTRÔLE APRÈS COUP, pas seulement avant : deux rasters de même nom sous
            //    `Assets/Art/Icons/` veulent dire que le montage est défait. Le dire ici plutôt
            //    que de le laisser découvrir à l'écran.
            var doublons = Directory.GetFiles(outputAbs, "*.png", SearchOption.AllDirectories)
                .GroupBy(Path.GetFileName).Where(g => g.Count() > 1).ToArray();
            foreach (var d in doublons)
                Debug.LogError($"IconRasterExporter: ⛔ '{d.Key}' existe en {d.Count()} exemplaires — " +
                               $"[{string.Join(" | ", d)}]. Le jeu n'en charge qu'un ; les autres sont " +
                               "des copies périmées qui ressemblent trait pour trait à l'original.");

            int montes = Directory.GetFiles(outputAbs, "*.png", SearchOption.AllDirectories)
                .Count(f => f.Replace('\\', '/').Contains("/Resources/"));
            Debug.Log($"IconRasterExporter: {svgFiles.Length} SVG -> {exported} rasters PNG écrits sous " +
                      $"{OutputDir} · {montes} réécrits à leur emplacement MONTÉ (sous un dossier " +
                      $"Resources) · {doublons.Length} doublon(s) de nom");
        }

        /// <summary>Où écrire un raster : LÀ OÙ IL VIT DÉJÀ, et seulement à défaut dans le dossier
        /// par défaut.
        ///
        /// ⛔⛔ CE QUE CETTE MÉTHODE EMPÊCHE, ET ÇA SERAIT ARRIVÉ AU PROCHAIN EXPORT. Le
        /// 2026-09-07, les rasters 48 px de la famille `icon_building_*` ont été DÉPLACÉS sous
        /// `Assets/Art/Icons/Resources/BuildingIcons/` — c'est ce déplacement qui les fait entrer
        /// dans le build et qui a sorti onze glyphes de la forme A (produits, conformes, zéro
        /// consommateur). Un export écrivant en dur dans `OutputDir` aurait RECRÉÉ
        /// `Assets/Art/Icons/icon_building_lab_48.png` à côté du fichier monté, sans rien dire :
        /// deux fichiers du même nom, deux GUID, et le glyphe RÉELLEMENT affiché — celui du
        /// dossier `Resources` — figé sur l'ancien dessin pour toujours.
        /// ⇒ *Un pipeline qui recrée un fichier à l'endroit d'où on l'a sorti défait le montage
        /// en silence, et le défaut ne se voit qu'à l'écran, des semaines plus tard.*
        ///
        /// ⚠️ Et c'est une PROPRIÉTÉ, pas une liste : aucune table de familles montées à tenir à
        /// jour. Le prochain qui montera une autre famille n'aura rien à éditer ici — une liste
        /// qu'il faut penser à mettre à jour est un dispositif qui vieillit, celui-ci ne vieillit
        /// pas. La recherche est bornée à `OutputDir` et à ses sous-dossiers : on réécrit le
        /// fichier de la famille d'icônes, jamais un homonyme ailleurs dans le projet.
        ///
        /// ⛔ AMBIGUÏTÉ = ERREUR, jamais un choix silencieux. Deux fichiers du même nom sous
        /// `Assets/Art/Icons/` signifient qu'un doublon existe DÉJÀ ; en choisir un au hasard
        /// écrirait dans celui que personne ne lit. On refuse et on nomme les deux.</summary>
        private static string OuVaCeRaster(string outputAbs, string fileName)
        {
            var existants = Directory.GetFiles(outputAbs, fileName, SearchOption.AllDirectories);
            if (existants.Length == 1) return existants[0];
            if (existants.Length > 1)
                throw new InvalidOperationException(
                    $"IconRasterExporter: '{fileName}' existe en {existants.Length} exemplaires sous " +
                    $"{OutputDir} — [{string.Join(" | ", existants)}]. Un raster monté a été dupliqué : " +
                    "en réécrire un au hasard laisserait l'autre périmé, et c'est peut-être celui que " +
                    "le jeu charge. Supprimer le doublon AVANT de réexporter.");
            return Path.Combine(outputAbs, fileName);   // fichier neuf : dossier par défaut
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
