using System.Collections.Generic;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;

/// <summary>TD-615 — donner au client de VRAIES fontes grasses.
///
/// ⛔ CE QUE CETTE DETTE DIT, ET POURQUOI ELLE NE SE CORRIGE PAS ÉCRAN PAR ÉCRAN.
/// Le code de production porte **70 demandes de graisse** (64 `FontStyles.Bold` + 6 `&lt;b&gt;`)
/// réparties dans **17 fichiers**. Or `Assets/Fonts/` ne contenait que deux TTF, **Regular tous
/// les deux**, et les atlas SDF avaient une table de graisse VIDE : TextMeshPro simulait donc la
/// graisse en DILATANT le contour (`boldStyle: 0.75`). Un gras simulé ressemble à du gras, ne lève
/// aucune erreur, et ne se trahit qu'en comparant le remplissage à une référence.
/// TROIS juges ⊥ indépendants l'ont signé, même signe : ㊵ F12 (4 runs à 700 rendus en graisse
/// normale, remplissage −21 à −37 %), ⑯ F5 (titre de plaque en régulier), ㊲ F14 (tout ce qui est
/// gras perd 20-33 % de fût pendant que le courant ne bouge pas).
/// ⇒ *Un écart systématique et de même signe sur des mesures indépendantes n'est pas N erreurs,
///   c'est une erreur de MODÈLE* — et le modèle était « le client sait rendre du gras ».
///
/// ⛔⛔ CE QU'ON NE FAIT PAS, et l'entrée de dette l'interdit explicitement : **relever
/// `boldStyle`**. Ça épaissit le trait sans donner les FORMES d'une vraie Bold (une Bold n'est pas
/// une Regular grossie : ses contre-poinçons, ses chasses et ses jonctions sont redessinés), et ça
/// rendrait verte une garde sur un défaut intact.
///
/// ⛔⛔ ET LE PIÈGE PAYÉ LA MÊME NUIT PAR UNE SESSION VOISINE : un asset Bold peut EXISTER et ne
/// servir AUCUN glyphe — atlas non persisté, donc vide au chargement. D'où l'atlas **STATIQUE** :
/// les glyphes sont cuits ici, dans l'asset, et voyagent avec lui. L'oracle ne regarde pas si
/// l'asset existe, il regarde de QUEL asset vient chaque glyphe d'un texte gras RENDU.
/// </summary>
public static class MafiaFontesGrasses
{
    /// <summary>Les caractères à cuire dans l'atlas statique.
    /// ⚠️ Pas « l'ASCII » : ce client parle FRANÇAIS et affiche de la monnaie, des puces et des
    /// tirets typographiques. Un atlas statique amputé rend un carré vide, en silence — le même
    /// mode d'échec que le gras simulé, une couche plus bas.</summary>
    private const string Jeu =
        " !\"#$%&'()*+,-./0123456789:;<=>?@" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`" +
        "abcdefghijklmnopqrstuvwxyz{|}~" +
        "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ" +
        "àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ" +
        "ŒœŸ€£¥°±×÷·•–—―‐‑«»‹›„“”‘’‚…†‡‰≤≥≠≈∞µ§¶©®™" +
        "ÅÉÈÊÎÔÛÙÜÇ";

    [MenuItem("Mafia/TD-615 — générer les fontes grasses")]
    public static void Generer()
    {
        int total = 0;
        total += Construire("Assets/Fonts/DejaVuSans-Bold.ttf", "Assets/Fonts/DejaVuSans-Bold SDF.asset",
                            "Assets/Fonts/DejaVuSans SDF.asset");
        total += Construire("Assets/Fonts/DejaVuSerif-Bold.ttf", "Assets/Fonts/DejaVuSerif-Bold SDF.asset",
                            "Assets/Fonts/DejaVuSerif SDF.asset");
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log($"[TD-615] terminé — {total} glyphes cuits dans les deux atlas statiques.");
    }

    private static int Construire(string cheminTtf, string cheminAsset, string cheminRegular)
    {
        Font source = AssetDatabase.LoadAssetAtPath<Font>(cheminTtf);
        if (source == null) { Debug.LogError($"[TD-615] TTF introuvable : {cheminTtf}"); return 0; }

        // Créé en DYNAMIQUE pour que `TryAddCharacters` puisse cuire les glyphes, puis basculé en
        // STATIQUE : c'est cette bascule qui fige l'atlas dans l'asset. Créé directement en
        // statique, il resterait vide — le piège de l'asset « v1 » qui ne servait aucun glyphe.
        TMP_FontAsset gras = TMP_FontAsset.CreateFontAsset(
            source, 90, 9, GlyphRenderMode.SDFAA, 1024, 1024, AtlasPopulationMode.Dynamic, true);
        if (gras == null) { Debug.LogError($"[TD-615] création échouée : {cheminTtf}"); return 0; }

        string manquants;
        bool ok = gras.TryAddCharacters(Jeu, out manquants);
        int cuits = gras.characterTable != null ? gras.characterTable.Count : 0;
        if (!ok || !string.IsNullOrEmpty(manquants))
            Debug.LogWarning($"[TD-615] {cheminTtf} : {(manquants == null ? 0 : manquants.Length)} " +
                             $"caractères ABSENTS de la fonte — « {manquants} ». Ils rendraient un " +
                             "carré vide, en silence — le même mode d'échec que le gras simulé.");
        gras.atlasPopulationMode = AtlasPopulationMode.Static;

        AssetDatabase.CreateAsset(gras, cheminAsset);
        if (gras.atlasTextures != null)
            foreach (Texture2D t in gras.atlasTextures)
                if (t != null) { t.name = System.IO.Path.GetFileNameWithoutExtension(cheminAsset) + " Atlas";
                                 AssetDatabase.AddObjectToAsset(t, gras); }
        if (gras.material != null)
        {
            gras.material.name = System.IO.Path.GetFileNameWithoutExtension(cheminAsset) + " Material";
            AssetDatabase.AddObjectToAsset(gras.material, gras);
        }
        EditorUtility.SetDirty(gras);

        // ── LA TABLE DE GRAISSE DU REGULAR — sans elle, l'asset gras existe et personne ne le
        //    demande : `FontStyles.Bold` continue de dilater le Regular.
        TMP_FontAsset regulier = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(cheminRegular);
        if (regulier == null) { Debug.LogError($"[TD-615] Regular introuvable : {cheminRegular}"); return cuits; }
        // ⚠️ Le SETTER de `fontWeightTable` est `internal` : on ne peut pas remplacer le tableau,
        // seulement muter l'élément que le getter rend — il rend le champ lui-même, initialisé à
        // dix entrées. C'est suffisant, et ça évite d'écrire un tableau qui remplacerait des poids
        // qu'on n'a pas regardés.
        TMP_FontWeightPair[] table = regulier.fontWeightTable;
        if (table == null || table.Length < 8)
        {
            Debug.LogError($"[TD-615] {cheminRegular} : table de graisse inattendue " +
                           $"({(table == null ? "nulle" : table.Length.ToString())} entrées).");
            return cuits;
        }
        table[7].regularTypeface = gras;      // index 7 = poids 700, le « bold » de TMP
        EditorUtility.SetDirty(regulier);

        Debug.Log($"[TD-615] {cheminAsset} : {cuits} glyphes cuits, atlas STATIQUE, " +
                  $"branché sur {cheminRegular} au poids 700.");
        return cuits;
    }
}
