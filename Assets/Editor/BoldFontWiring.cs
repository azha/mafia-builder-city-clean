using System;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;
using TMPro;

/// <summary>TD-615 — câble une VRAIE fonte Bold dans la table de graisse des deux atlas.
/// <code>run-unity-check.sh -executeMethod BoldFontWiring.Wire</code>
///
/// ⛔ POURQUOI CE LOT EXISTE. `Assets/Fonts/` ne portait que `DejaVuSans.ttf` et
/// `DejaVuSerif.ttf`, toutes deux en Regular. Les 103 demandes de gras du client
/// (93 `FontStyles.Bold` + 10 `&lt;b&gt;`, 23 fichiers) étaient donc rendues par la
/// SIMULATION LOGICIELLE de TMP — `boldStyle = 0.75`, qui épaissit le trait du
/// Regular sans jamais donner les FORMES d'une Bold dessinée.
///
/// ⛔⛔ ET C'EST LA CLASSE DE DÉFAUT LA PLUS DIFFICILE À VOIR : un gras simulé
/// ressemble à du gras. Il n'échoue pas, ne lève rien, ne rougit nulle part — il
/// ne se trahit qu'en comparant à une référence. Deux juges visuels l'ont mesuré
/// indépendamment sur deux écrans (même signe, −21 % à −37 % de remplissage) et
/// l'ont classé comme deux défauts d'écran ; c'était un seul défaut de POLICE.
///
/// ⛔ CE QU'IL NE FAUT SURTOUT PAS FAIRE : relever `boldStyle`. Ça épaissit
/// davantage le même Regular — les mesures de remplissage remonteraient, les juges
/// passeraient au vert, et le défaut serait INTACT. *Une garde qu'on satisfait en
/// changeant la grandeur mesurée plutôt que la chose mesurée certifie le défaut.*
/// `boldStyle` reste donc à sa valeur ; c'est le CONSOMMATEUR qui change : dès
/// qu'un `regularTypeface` existe à l'entrée 700, TMP prend la fonte au lieu de simuler.
///
/// Réglages recopiés de l'asset Regular correspondant (lus, pas supposés) : population
/// DYNAMIQUE, atlas 1024x1024, padding 9, render mode 4165 (SDFAA), multi-atlas activé.
/// Un atlas Bold créé avec d'autres réglages donnerait un gras au rendu différent.</summary>
public static class BoldFontWiring
{
    private const int BoldIndex = 7;   // table de graisse TMP : 100..900 par pas de 100 ⇒ index 7 = 700 = Bold

    public static void Wire()
    {
        int cables = 0, echecs = 0;
        cables += WireOne("Assets/Fonts/DejaVuSans SDF.asset",  "Assets/Fonts/DejaVuSans-Bold.ttf",  ref echecs);
        cables += WireOne("Assets/Fonts/DejaVuSerif SDF.asset", "Assets/Fonts/DejaVuSerif-Bold.ttf", ref echecs);

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log($"[BoldFontWiring] TERMINÉ — {cables} câblage(s), {echecs} échec(s)");
        EditorApplication.Exit(echecs > 0 || cables != 2 ? 1 : 0);
    }

    private static int WireOne(string regularAssetPath, string boldTtfPath, ref int echecs)
    {
        var regular = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(regularAssetPath);
        if (regular == null)
        {
            Debug.LogError($"[BoldFontWiring] ⛔ atlas Regular introuvable : {regularAssetPath}");
            echecs++; return 0;
        }
        var boldFont = AssetDatabase.LoadAssetAtPath<Font>(boldTtfPath);
        if (boldFont == null)
        {
            Debug.LogError($"[BoldFontWiring] ⛔ TTF Bold non importée : {boldTtfPath}");
            echecs++; return 0;
        }

        // ⚠️ Les réglages viennent de l'asset Regular LU, jamais de constantes écrites ici :
        //    un atlas Bold généré à d'autres réglages rendrait un gras différent du régulier.
        string boldAssetPath = Path.ChangeExtension(boldTtfPath, null) + " SDF.asset";
        var bold = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(boldAssetPath);
        if (bold == null)
        {
            bold = TMP_FontAsset.CreateFontAsset(
                boldFont,
                90,                              // samplingPointSize — défaut TMP, l'atlas est dynamique
                regular.atlasPadding,
                (GlyphRenderMode)regular.atlasRenderMode,
                regular.atlasWidth,
                regular.atlasHeight,
                AtlasPopulationMode.Dynamic,
                true);
            bold.name = Path.GetFileNameWithoutExtension(boldAssetPath);
            AssetDatabase.CreateAsset(bold, boldAssetPath);

            // ⛔⛔ CE BLOC EST LE CORRECTIF D'UN DÉFAUT QUE MA PROPRE FALSIFIABLE A TROUVÉ.
            //    `CreateFontAsset` rend un objet complet EN MÉMOIRE, mais sa texture d'atlas et
            //    son matériau sont des objets NON PERSISTÉS : sans les rattacher explicitement à
            //    l'asset, ils disparaissent au rechargement et l'atlas Bold devient un asset
            //    PRÉSENT, RÉFÉRENCÉ, et incapable de servir un seul glyphe —
            //    `UnassignedReferenceException: m_AtlasTextures ... has not been assigned`.
            //    C'est exactement « un asset peut être présent, de la bonne taille, et ne porter
            //    aucun dessin », appliqué à une police. Rien ne l'aurait signalé : le câblage se
            //    relisait comme juste, l'entrée 700 était peuplée, et le gras serait resté simulé.
            if (bold.atlasTextures != null && bold.atlasTextures.Length > 0 && bold.atlasTextures[0] != null)
            {
                bold.atlasTextures[0].name = bold.name + " Atlas";
                AssetDatabase.AddObjectToAsset(bold.atlasTextures[0], bold);
            }
            var shader = Shader.Find("TextMeshPro/Distance Field");
            if (shader != null)
            {
                var mat = new Material(shader) { name = bold.name + " Material" };
                mat.SetTexture(ShaderUtilities.ID_MainTex, bold.atlasTexture);
                mat.SetFloat(ShaderUtilities.ID_TextureWidth, bold.atlasWidth);
                mat.SetFloat(ShaderUtilities.ID_TextureHeight, bold.atlasHeight);
                mat.SetFloat(ShaderUtilities.ID_GradientScale, bold.atlasPadding + 1);
                bold.material = mat;
                AssetDatabase.AddObjectToAsset(mat, bold);
            }
            EditorUtility.SetDirty(bold);
            Debug.Log($"[BoldFontWiring] créé {boldAssetPath} — padding={regular.atlasPadding} " +
                      $"renderMode={regular.atlasRenderMode} atlas={regular.atlasWidth}x{regular.atlasHeight} (recopiés de {regular.name})");
        }
        else Debug.Log($"[BoldFontWiring] {boldAssetPath} existait déjà — réutilisé");

        var table = regular.fontWeightTable;
        if (table == null || table.Length <= BoldIndex)
        {
            Debug.LogError($"[BoldFontWiring] ⛔ table de graisse absente ou trop courte sur {regular.name}");
            echecs++; return 0;
        }
        var avant = table[BoldIndex].regularTypeface;
        table[BoldIndex].regularTypeface = bold;
        EditorUtility.SetDirty(regular);

        // ⛔ Le contrôle se lit sur l'EFFET (la valeur relue après écriture), jamais sur
        //    « la ligne a été exécutée ». Un tableau de struct mal manipulé se réassigne
        //    dans une COPIE et laisse l'original intact, sans erreur.
        var apres = regular.fontWeightTable[BoldIndex].regularTypeface;
        if (apres != bold)
        {
            Debug.LogError($"[BoldFontWiring] ⛔ ÉCRITURE PERDUE sur {regular.name} : " +
                           $"relu={(apres == null ? "null" : apres.name)} au lieu de {bold.name} " +
                           "— le tableau a été modifié dans une copie.");
            echecs++; return 0;
        }
        Debug.Log($"[BoldFontWiring] {regular.name} · entrée 700 : " +
                  $"{(avant == null ? "VIDE" : avant.name)} -> {apres.name} · boldStyle INCHANGÉ = {regular.boldStyle}");
        return 1;
    }
}
