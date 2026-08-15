using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C9 (design §3 C9, §3-bis) — clôture : la falsifiable DU DÉCOUPAGE. Le total n'est pas
    // inventé : c'est l'ensemble FERMÉ des clés que `SessionOpenDto` déclare (design §3-bis, W3.U1
    // C2 GREW it 11 -> 12 avec `opened_game_day`). L'oracle compte les clés de l'INTERFACE (par
    // réflexion, jamais un motif texte — la faute n°3 du design), celles référencées par les
    // chunks, celles déclarées NON consommées, et asserte 11 + 1 = 12.
    [Category("W3U1")]
    public class W3U1ClosurePlayModeTests
    {
        // Table recopiée VERBATIM de design §3-bis (le tableau "clé du payload | chunk qui la
        // consomme") — W3.U1 C2 y ajoute `opened_game_day` (D3, Q2 = OUI, tranché par le contrôleur).
        private static readonly Dictionary<string, string> ConsumedByChunk = new Dictionary<string, string>
        {
            { "session_id", "C3" },
            { "hl_card", "C4" },
            { "queue", "C5" },
            { "backlog_badge", "C2" },
            { "queue_pressure_band", "C7" },
            { "structural_budget", "C4" },
            { "flag_review", "C8 (+ C7 pour l'ouverture auto)" },
            { "friction_glance", "C6" },
            { "compression_glance", "C6 (vital) + C7 (bandeau)" },
            { "onboarding", "C7" },
            { "opened_game_day", "C2 (D3/§3-bis — la 12e clé)" },
        };

        // La SEULE clé explicitement classée NON consommée par ce lot (design §3-bis).
        private const string DeclaredNonConsumed = "settling_glance";

        [Test]
        public void C9F2_ClosedKeySet_10ConsumedPlus1ClassifiedPlus1TwelfthKey_Equals12()
        {
            // Côté contrat : TOUTES les clés de premier niveau de SessionOpenDto — reflection sur
            // le TYPE (jamais un motif texte, jamais recopiées à la main — la même discipline que
            // C3-F2, qui protège CE total contre une divergence silencieuse).
            FieldInfo[] fields = typeof(SessionOpenDto).GetFields(
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);
            var interfaceKeys = new HashSet<string>();
            foreach (FieldInfo f in fields) interfaceKeys.Add(f.Name);

            Assert.AreEqual(12, interfaceKeys.Count, "SessionOpenDto declares EXACTLY 12 top-level keys");

            // Chaque clé consommée doit exister dans l'interface — un chunk qui prétend consommer
            // une clé qui n'existe pas plus/qui a été renommée doit faire rougir CE test.
            foreach (string consumedKey in ConsumedByChunk.Keys)
            {
                Assert.IsTrue(interfaceKeys.Contains(consumedKey),
                    $"'{consumedKey}' (déclarée consommée par {ConsumedByChunk[consumedKey]}) doit exister dans SessionOpenDto");
            }
            Assert.IsTrue(interfaceKeys.Contains(DeclaredNonConsumed),
                $"'{DeclaredNonConsumed}' (déclarée NON consommée) doit exister dans SessionOpenDto");

            // La somme de contrôle : 10 clés consommées de l'ensemble ORIGINAL (11) + 1 déclarée non
            // consommée (settling_glance) + 1 NOUVELLE clé (opened_game_day, elle-même consommée) = 12.
            int consumedFromOriginal11 = 0;
            foreach (string k in ConsumedByChunk.Keys)
                if (k != "opened_game_day") consumedFromOriginal11++;
            Assert.AreEqual(10, consumedFromOriginal11, "10 des 11 clés ORIGINALES sont consommées");
            Assert.AreEqual(1, interfaceKeys.Contains(DeclaredNonConsumed) ? 1 : 0, "settling_glance reste l'UNIQUE non-consommée");
            Assert.IsTrue(ConsumedByChunk.ContainsKey("opened_game_day"), "opened_game_day (12e clé) EST consommée — par C2");

            int total = consumedFromOriginal11 + 1 /* settling_glance */ + 1 /* opened_game_day */;
            Assert.AreEqual(12, total, "10 + 1 + 1 = 12 — la somme de contrôle du découpage, Q2 = OUI");
            Assert.AreEqual(interfaceKeys.Count, total,
                "la somme de contrôle ÉGALE le compte RÉEL de champs de l'interface — c'est CE dispositif " +
                "qui voit l'apparition d'une clé (le détecteur d'horloge, design §3-bis) : si une 13e clé " +
                "apparaissait sans être classée ici, ce test rougirait AVANT toute autre falsifiable.");

            // Chaque clé classée est unique à SA classification (jamais consommée ET déclarée non-consommée).
            Assert.IsFalse(ConsumedByChunk.ContainsKey(DeclaredNonConsumed),
                "settling_glance ne peut pas être À LA FOIS consommée et déclarée non-consommée");
        }

        // Le détecteur d'horloge (design §3-bis, BLOCKING-1) : si Q2 avait été refusée, la somme
        // resterait 10+1=11 et l'apparition ULTÉRIEURE de la clé casserait l'égalité. Documenté ici
        // (jamais exécuté sous cette polarité — Q2 EST OUI dans ce lot) pour que le prochain lecteur
        // sache que le MÊME dispositif couvre les deux branches, sans re-décrire le raisonnement.
        [Test]
        public void ClockKeyDetector_BothBranchesOfQ2AreCoveredByTheSameMechanism_DocumentedNotExecuted()
        {
            Assert.Pass(
                "Q2 = OUI (tranché par le contrôleur) : la somme de contrôle ci-dessus est 12, et " +
                "`opened_game_day` est classée CONSOMMÉE par C2. Si une future régression retirait la " +
                "clé du DTO serveur sans mettre à jour SessionOpenDto/ConsumedByChunk, C3-F2 (parité de " +
                "forme, 12 champs) rougirait EN PREMIER — c'est le MÊME dispositif que design §3-bis " +
                "prescrit, appliqué ici au lieu d'être re-décrit.");
        }
    }
}
