using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Theme.Tests
{
    // W3.U1 C0 (design §3 C0-F1/F2, docs/superpowers/specs/2026-08-15-w3u1-shell-home-design.md) —
    // la garde de parité entre DesignTokens.cs (le contrat C#, un champ public par token) et
    // DesignTokens.asset (la donnée sérialisée réelle). §1.1 du design a d'abord mesuré une
    // "divergence" 40 vs 41 — FABRIQUÉE : `public Color` d'un côté, TOUTE clé d'asset de l'autre,
    // deux UNITÉS différentes comparées par une soustraction. Il n'y avait pas de divergence ; le
    // 41e "manquant" était `primaryFont` (TMP_FontAsset), pas une Color. Cette garde impose donc
    // UNE SEULE unité déclarée des deux côtés — "le champ sérialisé public, toutes familles de type
    // confondues, jamais « les couleurs »" — pour qu'un `coder` futur ne "répare" plus jamais un
    // dépôt sain en supprimant un champ réel.
    [Category("W3U1")]
    public class DesignTokensParityPlayModeTests
    {
        // Les clés de méta-données Unity communes à TOUT MonoBehaviour sérialisé — jamais un champ
        // DesignTokens. Recopiées verbatim de l'en-tête réel de DesignTokens.asset (lignes 5-14).
        private static readonly HashSet<string> UnityBoilerplateKeys = new HashSet<string>
        {
            "m_ObjectHideFlags", "m_CorrespondingSourceObject", "m_PrefabInstance", "m_PrefabAsset",
            "m_GameObject", "m_Enabled", "m_EditorHideFlags", "m_Script", "m_Name", "m_EditorClassIdentifier",
        };

        // Compte les clés de premier niveau (2 espaces d'indentation, "cle:") d'un .asset YAML de
        // MonoBehaviour, MOINS le bloc de méta-données Unity — TOUTES familles de type confondues
        // (Color, référence d'objet type={fileID,...}, etc.) : c'est le cran d'unité que §1.1 du
        // design impose. Un seul et même chemin de calcul sert C0-F1 (le vrai fichier) ET C0-F2 (le
        // fichier témoin) — jamais deux implémentations qui pourraient diverger entre elles.
        private static int CountAssetTokenKeys(string yamlText)
        {
            int count = 0;
            foreach (string line in yamlText.Split('\n'))
            {
                Match m = Regex.Match(line, @"^  (\w+):");
                if (!m.Success) continue;
                if (UnityBoilerplateKeys.Contains(m.Groups[1].Value)) continue;
                count++;
            }
            return count;
        }

        private static string DesignTokensAssetPath() =>
            Path.Combine(Application.dataPath, "Resources", "DesignTokens.asset");

        [Test]
        public void C0F1_FieldCount_MatchesAssetTokenKeyCount_SameUnit()
        {
            // Côté contrat : TOUT champ public d'INSTANCE DÉCLARÉ SUR DesignTokens — reflection sur
            // le TYPE, jamais un motif texte sur le fichier .cs (le motif texte est exactement ce qui
            // a fabriqué la fausse divergence en §1.1 — un `public Color` étroit qui rate un
            // TMP_FontAsset). DeclaredOnly exclut toute pollution d'un champ hérité de ScriptableObject.
            int fieldCount = typeof(DesignTokens)
                .GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Length;

            // Côté donnée : les clés réellement sérialisées dans l'asset.
            string assetPath = DesignTokensAssetPath();
            Assert.IsTrue(File.Exists(assetPath), $"DesignTokens.asset introuvable à {assetPath}");
            int assetKeyCount = CountAssetTokenKeys(File.ReadAllText(assetPath));

            Assert.AreEqual(fieldCount, assetKeyCount,
                $"DesignTokens.cs déclare {fieldCount} champ(s) public(s) d'instance, DesignTokens.asset " +
                $"en sérialise {assetKeyCount} — un ajout d'un côté sans l'autre doit rougir ICI, pas se " +
                "découvrir plus tard sur un écran qui lit un champ jamais peuplé.");
        }

        [Test]
        public void C0F2_WitnessFileWithNoExtraFields_CountsZero_NotAlwaysNonZero()
        {
            // Contrôle positif du ZÉRO (le socle : « un zéro se prouve capable de non-zéro »). Un
            // compteur qui ne rendrait JAMAIS 0 ne prouverait rien en C0F1 — il pourrait toujours
            // être un texte constant déguisé en assertion. Fichier témoin : LE MÊME bloc de
            // méta-données Unity que DesignTokens.asset (verbatim, ses lignes 1-14), SANS aucune clé
            // de token additionnelle — écrit sur disque comme un vrai fichier, puis passé au MÊME
            // compteur que C0-F1 (jamais un second chemin de calcul qui pourrait diverger).
            string witnessYaml =
                "%YAML 1.1\n" +
                "%TAG !u! tag:unity3d.com,2011:\n" +
                "--- !u!114 &11400000\n" +
                "MonoBehaviour:\n" +
                "  m_ObjectHideFlags: 0\n" +
                "  m_CorrespondingSourceObject: {fileID: 0}\n" +
                "  m_PrefabInstance: {fileID: 0}\n" +
                "  m_PrefabAsset: {fileID: 0}\n" +
                "  m_GameObject: {fileID: 0}\n" +
                "  m_Enabled: 1\n" +
                "  m_EditorHideFlags: 0\n" +
                "  m_Script: {fileID: 11500000, guid: 00000000000000000000000000000000, type: 3}\n" +
                "  m_Name: EmptyTokenWitness\n" +
                "  m_EditorClassIdentifier: \n";

            string tmpPath = Path.Combine(Path.GetTempPath(), $"w3u1_c0f2_witness_{Guid.NewGuid():N}.asset");
            try
            {
                File.WriteAllText(tmpPath, witnessYaml);
                int count = CountAssetTokenKeys(File.ReadAllText(tmpPath));
                Assert.AreEqual(0, count,
                    "le fichier témoin (méta-données Unity seules, AUCUN token) doit rendre 0 — sinon le " +
                    "compteur ne distingue pas un fichier vide d'un fichier peuplé, et C0-F1 ne prouve rien.");
            }
            finally
            {
                if (File.Exists(tmpPath)) File.Delete(tmpPath);
            }
        }
    }
}
