using UnityEditor;
using UnityEngine;
using System.Text.RegularExpressions;

// W4.P4a/C7 — discipline d'import scopée par répertoire (précédent qui marche, §1.6a du
// design : Assets/Editor/KenneySpriteImporter.cs dans l'autre arbre Unity, référencé — pas
// copié). Force textureType = Sprite pour tout ce qui entre sous Assets/Art/ ; la regex de nom
// canonique (import_settings.md invariant 1) est un AVERTISSEMENT journalisé, PAS un échec dur
// — mesuré (§1.9 du design) : la regex canonique rejette 100% des 135 noms réels du corpus de
// référence. Un échec dur aurait bloqué tout artiste day-1.
public class W4P4aArtImportPostprocessor : AssetPostprocessor
{
    private const string ScopedPrefix = "Assets/Art/";

    // import_settings.md — motifs canoniques (sprite_character/environment/fx, ui_element, icon).
    private static readonly Regex[] CanonicalNamePatterns =
    {
        new Regex(@"^sprite_character_.+$", RegexOptions.IgnoreCase),
        new Regex(@"^sprite_environment_.+$", RegexOptions.IgnoreCase),
        new Regex(@"^sprite_fx_.+$", RegexOptions.IgnoreCase),
        new Regex(@"^ui_element_.+$", RegexOptions.IgnoreCase),
        new Regex(@"^icon_.+$", RegexOptions.IgnoreCase),
    };

    void OnPreprocessTexture()
    {
        if (!assetPath.StartsWith(ScopedPrefix)) return;

        var ti = (TextureImporter)assetImporter;
        ti.textureType = TextureImporterType.Sprite;
        ti.spriteImportMode = SpriteImportMode.Single;

        string fileName = System.IO.Path.GetFileNameWithoutExtension(assetPath);
        bool matchesCanon = false;
        foreach (var re in CanonicalNamePatterns)
        {
            if (re.IsMatch(fileName)) { matchesCanon = true; break; }
        }
        if (!matchesCanon)
        {
            // Avertissement journalisé, pas un rejet — §1.9 du design : appliquer le rejet dur
            // à la lettre du canon aurait ORPHELINISÉ 135/135 PNG du corpus de référence
            // mesuré. La discipline se pose ici comme contrat pour les assets À VENIR.
            Debug.LogWarning($"W4P4aArtImportPostprocessor: '{fileName}' ({assetPath}) ne matche aucun motif " +
                              "canonique (sprite_character_*/sprite_environment_*/sprite_fx_*/ui_element_*/icon_*) " +
                              "— import_settings.md invariant 1. Importé quand même (avertissement, pas un échec).");
        }
    }
}
