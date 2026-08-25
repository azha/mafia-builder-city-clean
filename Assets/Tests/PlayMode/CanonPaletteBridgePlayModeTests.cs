using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Theme.Tests
{
    [Serializable]
    public class CanonPaletteTokenEntry
    {
        public string name;
        public float r, g, b, a;
        public string hex;
    }

    [Serializable]
    public class CanonPaletteExtractData
    {
        public string backCommitSha;
        public string backCommitRepo;
        public string canonSection;
        public string generatedAt;
        public string roundingConvention;
        public CanonPaletteTokenEntry[] tokens;
    }

    /// <summary>
    /// W3.U-DA/C1 — pont canon (back `918bf4b2`, `gdd/14_tunable_constants.md §Asset pipeline —
    /// palette & DA`) &lt;-&gt; runtime (<see cref="DesignTokens"/>/`DesignTokens.asset`).
    ///
    /// D-D du design : après A5, la même palette existe des DEUX côtés — deux copies divergent
    /// toujours. L'événement qui doit faire rougir ce comparateur est un changement de DONNÉE
    /// (une couleur bouge d'un côté sans l'autre), jamais un changement de TYPE — donc une
    /// épingle sur la VALEUR de chaque token présent, dans les DEUX sens (pas d'orphelin canon,
    /// pas d'orphelin runtime). Toute la logique de comparaison est extraite dans
    /// <see cref="CanonPaletteComparator"/> pour pouvoir l'exercer directement contre des données
    /// SYNTHÉTIQUES corrompues (falsifiables (ii)/(iii)/(iv)) sans jamais toucher au fichier
    /// réel — la preuve par faute injectée reste dans la suite, pas dans un script jetable.
    /// </summary>
    public static class CanonPaletteComparator
    {
        // 64 -> 66 (2026-08-25) : `lieutenantMedallionInner/Outer`, le disque du médaillon de
        // l'écran « LA FAMILLE ». Il empruntait les jetons du MANOMÈTRE ; un juge visuel ⊥ a
        // mesuré le disque 32 % plus sombre et son b−r divisé par deux. Deux surfaces
        // distinctes, deux jetons — « un token par consommateur mesuré » (gdd/14).
        public const int ExpectedTokenCount = 68; // HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21) : 51 -> 61
                                                    // (tour 1, +10 tokens hud* glass/gold/gauge/text) -> 62
                                                    // (tour 2, +1 hudMoneyUnderlineGold mesuré directement sur
                                                    // le rendu pixel) — gdd/14 @8c33ea3b.
                                                    // La Famille — l'organigramme (2026-08-21) : 62 -> 64 (+2
                                                    // lieutenantGlassTop/lieutenantGlassBottom, REUSE verbatim
                                                    // de --tx-panneau, ecrans-brennar.html:163) — gdd/14 note dédiée.
                                                    // Ruling user "pixel perfect" : sceau des 51 levé nommément
                                                    // pour ce lot — root cause du round précédent (247ed3b) était
                                                    // de COMPOSER depuis les tokens existants au lieu des hex
                                                    // exacts de la maquette (voir DesignTokens.cs header HUD Bar).
                                                    // scénario dimensionné (G6) : un extrait tronqué doit rougir, pas passer à vide.
        public const float Epsilon = 0.001f;

        public static string ExtractAbsolutePath =>
            Path.Combine(Directory.GetParent(Application.dataPath).FullName,
                "Assets/Editor/CanonPaletteExtract/canon_palette_extract.json");

        public static CanonPaletteExtractData LoadExtractFromDisk()
        {
            var path = ExtractAbsolutePath;
            if (!File.Exists(path))
            {
                throw new FileNotFoundException($"Extrait canon introuvable : {path}");
            }
            var json = File.ReadAllText(path);
            var extract = JsonUtility.FromJson<CanonPaletteExtractData>(json);
            if (extract == null)
            {
                throw new InvalidDataException("JSON de l'extrait canon illisible (JsonUtility a renvoyé null).");
            }
            return extract;
        }

        private static Dictionary<string, Color> RuntimeColorFields(DesignTokens tokens)
        {
            var map = new Dictionary<string, Color>();
            foreach (var field in typeof(DesignTokens).GetFields(BindingFlags.Public | BindingFlags.Instance))
            {
                if (field.FieldType == typeof(Color))
                {
                    map[field.Name] = (Color)field.GetValue(tokens);
                }
            }
            return map;
        }

        /// <summary>
        /// Compare un extrait canon à un DesignTokens runtime. Retourne la liste des erreurs
        /// (vide = comparaison verte). Ne lève jamais — les tests décident de la sévérité.
        /// </summary>
        public static List<string> Compare(CanonPaletteExtractData extract, DesignTokens runtime)
        {
            var errors = new List<string>();

            if (extract?.tokens == null)
            {
                errors.Add("extrait canon null ou sans tokens");
                return errors;
            }

            if (extract.tokens.Length != ExpectedTokenCount)
            {
                errors.Add($"arité extrait = {extract.tokens.Length}, attendu {ExpectedTokenCount} (scénario dimensionné G6)");
            }

            var runtimeFields = RuntimeColorFields(runtime);
            var extractNames = new HashSet<string>();

            // sens 1 : chaque entrée canon a un champ runtime correspondant, ET la valeur concorde
            // (sinon : orphelin CANON — présent au canon, absent/divergent au runtime).
            foreach (var entry in extract.tokens)
            {
                if (entry == null || string.IsNullOrEmpty(entry.name))
                {
                    errors.Add("entrée extrait sans nom");
                    continue;
                }
                extractNames.Add(entry.name);

                if (!runtimeFields.TryGetValue(entry.name, out var actual))
                {
                    errors.Add($"{entry.name}: absent du runtime (orphelin CANON)");
                    continue;
                }

                var expected = new Color(entry.r, entry.g, entry.b, entry.a);
                var dist = Vector4.Distance(actual, expected);
                if (dist >= Epsilon)
                {
                    errors.Add($"{entry.name}: runtime={actual} != canon={expected} (distance={dist:F4})");
                }
            }

            // sens 2 : aucun champ Color runtime n'est absent de l'extrait canon (sinon :
            // orphelin RUNTIME — présent au runtime, jamais déclaré au canon).
            foreach (var fieldName in runtimeFields.Keys)
            {
                if (!extractNames.Contains(fieldName))
                {
                    errors.Add($"{fieldName}: absent de l'extrait canon (orphelin RUNTIME)");
                }
            }

            return errors;
        }
    }

    [Category("W3UDA")]
    public class CanonPaletteBridgePlayModeTests
    {
        [Test]
        public void Extract_LoadsFromDisk_IsDimensioned()
        {
            var extract = CanonPaletteComparator.LoadExtractFromDisk();
            Assert.IsNotNull(extract);
            Assert.IsNotNull(extract.tokens);
            Assert.AreEqual(CanonPaletteComparator.ExpectedTokenCount, extract.tokens.Length,
                $"Extrait canon tronqué ou gonflé : {extract.tokens.Length} tokens, attendu {CanonPaletteComparator.ExpectedTokenCount}.");
        }

        [Test]
        public void Comparator_Green_OnHealthyTree_BothDirections()
        {
            var extract = CanonPaletteComparator.LoadExtractFromDisk();
            var runtime = DesignTokens.Current;
            Assert.IsNotNull(runtime, "DesignTokens.Current a renvoyé null.");

            var errors = CanonPaletteComparator.Compare(extract, runtime);
            Assert.IsEmpty(errors, "Comparateur canon<->runtime en désaccord :\n" + string.Join("\n", errors));
        }

        // ── Falsifiables par faute injectée (synthétique, jamais sur le fichier réel) ──────────

        private static CanonPaletteExtractData CloneHealthyExtract()
        {
            var real = CanonPaletteComparator.LoadExtractFromDisk();
            var clone = new CanonPaletteExtractData
            {
                backCommitSha = real.backCommitSha,
                tokens = real.tokens.Select(t => new CanonPaletteTokenEntry
                {
                    name = t.name, r = t.r, g = t.g, b = t.b, a = t.a, hex = t.hex
                }).ToArray()
            };
            return clone;
        }

        [Test]
        public void Comparator_Red_OnAlteredByte()
        {
            var extract = CloneHealthyExtract();
            var runtime = DesignTokens.Current;

            // contrôle négatif d'abord : la copie non altérée doit être verte.
            Assert.IsEmpty(CanonPaletteComparator.Compare(extract, runtime), "précondition : la copie clonée doit être verte avant altération.");

            var target = extract.tokens.First(t => t.name == "accentGold");
            target.r = target.r > 0.5f ? target.r - 0.3f : target.r + 0.3f; // altère un octet significatif

            var errors = CanonPaletteComparator.Compare(extract, runtime);
            Assert.IsTrue(errors.Any(e => e.StartsWith("accentGold:")),
                "un canal altéré sur accentGold n'a PAS été détecté — le comparateur ne rougit pas sur une valeur divergente.\n" + string.Join("\n", errors));
        }

        [Test]
        public void Comparator_Red_OnOrphanCanon_EntryRemoved()
        {
            var extract = CloneHealthyExtract();
            extract.tokens = extract.tokens.Where(t => t.name != "heatBurning").ToArray();

            var runtime = DesignTokens.Current;
            var errors = CanonPaletteComparator.Compare(extract, runtime);

            Assert.IsTrue(errors.Any(e => e.Contains("heatBurning") && e.Contains("orphelin RUNTIME")),
                "retirer une entrée du canon (heatBurning) n'a PAS produit d'orphelin RUNTIME détecté.\n" + string.Join("\n", errors));
            Assert.IsTrue(errors.Any(e => e.Contains("arité extrait")),
                "retirer une entrée n'a pas fait rougir le contrôle d'arité (61 != 62).\n" + string.Join("\n", errors));
        }

        [Test]
        public void Comparator_Red_OnTruncatedExtract()
        {
            var extract = CloneHealthyExtract();
            extract.tokens = extract.tokens.Take(10).ToArray(); // extrait tronqué, N != 40

            var runtime = DesignTokens.Current;
            var errors = CanonPaletteComparator.Compare(extract, runtime);

            Assert.IsTrue(errors.Any(e => e.Contains("arité extrait = 10")),
                "un extrait tronqué à 10 entrées n'a pas fait rougir le contrôle d'arité — scénario dimensionné G6 non couvert.\n" + string.Join("\n", errors));
            // et il doit rester rouge (pas "vrai à vide") : 30 champs runtime deviennent orphelins.
            Assert.GreaterOrEqual(errors.Count(e => e.Contains("orphelin RUNTIME")), 29,
                "un extrait tronqué devrait laisser au moins 29 champs runtime orphelins (40 - 10 - marge) — la troncature doit rester détectable, pas silencieuse.");
        }
    }
}
