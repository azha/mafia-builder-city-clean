using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.CoreLoops.Compression;

namespace MafiaCleanCity.CityMap.Tests
{
    // CAUSE 4 (CLIENT-3, 07/10 : « anglais / texte technique à l'écran » — ⑮ ⑭ ㉔ ⑨ ㉓) : le résolveur commun `MotsDesEnumeres` et sa garde de classe. HORS RÉSEAU.
    //   M1  les mots de l'atelier sortent PAR LA VALEUR SERVIE ; le bundle servi GAGNE ; hors domaine = le mot de la famille (atelier 28), jamais l'enum dé-sluggé ; absent = « — »
    //   M2  un mot que l'atelier n'a pas écrit se dit « — » ET se NOMME dans MotsManquants (⑮ entier, ⑭ compression_active / active / 4 genres / 3 paliers)
    //   M3  la ligne de pression de ⑭ : « TENSION CALME · AUCUNE SEMAINE » (le canon), plus « Calm · None »
    //   M4  GARDE DE CLASSE : plus aucune fonction `Lisible(` (dé-slug) dans les contrôleurs hors l'exception nommée ; plus aucun libellé anglais de la liste noire ; ㉔ en dette DATÉE
    [Category("MotsDesEnumeres")]
    public class MotsDesEnumeresPlayModeTests
    {
        [SetUp] public void SetUp() { MotsDesEnumeres.OublierLesManquants(); I18nCatalog.Oublier(); }
        [TearDown] public void TearDown() { I18nCatalog.Oublier(); MotsDesEnumeres.OublierLesManquants(); }

        [Test]
        public void M1_LesMotsDeLAtelier_ParLaValeurServie_LeBundleGagne_HorsDomaineEstLeMotDeLaFamille()
        {
            Assert.AreEqual("Calme", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, "calm"));
            Assert.AreEqual("Montante", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, "mounting"));
            Assert.AreEqual("Écrasante", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, "crushing"));
            Assert.AreEqual("aucune semaine", MotsDesEnumeres.Dire(MotsDesEnumeres.Semaine, "none"));
            Assert.AreEqual("la semaine s’annonce", MotsDesEnumeres.Dire(MotsDesEnumeres.Semaine, "warning"));
            Assert.AreEqual("Un nœud de la chaîne sature", MotsDesEnumeres.Dire(MotsDesEnumeres.GenreDeProbleme, "backpressure_node"));
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "compression.tension.calm", "§Tranquille" }, { "inspection.charge.heavy", "§Lourde" } });
            Assert.AreEqual("§Tranquille", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, "calm"), "le bundle servi gagne sur le repli de l'atelier");
            Assert.AreEqual("§Lourde", MotsDesEnumeres.Dire(MotsDesEnumeres.ChargeDeLaFile, "HEAVY"), "une clé servie sans repli d'atelier est lue quand même (la clé se dérive de la valeur : `heavy`)");
            Assert.AreEqual("état inconnu", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, "tout_neuf"), "une bande hors domaine : « état inconnu » (atelier 28)");
            Assert.AreEqual("type inconnu", MotsDesEnumeres.Dire(MotsDesEnumeres.GenreDeProbleme, "tout_neuf"), "une sorte hors domaine : « type inconnu »");
            Assert.AreEqual("—", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, null));
            Assert.AreEqual("—", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, ""));
        }

        [Test]
        public void M2_UnMotQueLAtelierN_ApasEcrit_SeDitTiret_EtSeNomme()
        {
            Assert.AreEqual("—", MotsDesEnumeres.Dire(MotsDesEnumeres.ChargeDeLaFile, "MODERATE"));
            Assert.AreEqual("—", MotsDesEnumeres.Dire(MotsDesEnumeres.Regime, "BACKLOGGED"));
            Assert.AreEqual("—", MotsDesEnumeres.Dire(MotsDesEnumeres.Tension, "compression_active"));
            Assert.AreEqual("—", MotsDesEnumeres.Dire(MotsDesEnumeres.Palier, "critical"));
            CollectionAssert.AreEquivalent(new[] { "inspection.charge.MODERATE", "inspection.regime.BACKLOGGED", "compression.tension.compression_active", "compression.palier.critical" },
                MotsDesEnumeres.MotsManquants.ToArray(), "chaque valeur sans mot est NOMMÉE, une fois");
            // la table elle-même : tout mot présent est du français (aucune des valeurs anglaises du domaine ne sert de mot), et les valeurs sans mot sont celles qu'on a déclarées
            var sansMot = new List<string>();
            foreach (MotsDesEnumeres.Domaine d in MotsDesEnumeres.Tous)
                foreach (var kv in d.Mots)
                {
                    if (kv.Value == null) { sansMot.Add(d.Nom + "." + d.Role + "." + kv.Key); continue; }
                    Assert.AreNotEqual(kv.Key.Replace('_', ' '), kv.Value.ToLowerInvariant(), d.Nom + "." + d.Role + "." + kv.Key + " : un mot qui n'est que l'enum dé-sluggé n'est pas un mot");
                }
            Assert.AreEqual(18, sansMot.Count, "18 mots attendus de l'atelier : ⑮ 9 (5 charges + 4 régimes) ; ⑭ 9 (compression_active, active, 4 genres, 3 paliers) — si ce nombre baisse, l'atelier a écrit des mots : mettre à jour la dette");
        }

        [Test]
        public void M3_LaLigneDePression_DuCanon()
        {
            Assert.AreEqual("TENSION CALME · AUCUNE SEMAINE", CompressionScreenController.LignePression("calm", "none"));
            Assert.AreEqual("TENSION MONTANTE · LA SEMAINE S’ANNONCE", CompressionScreenController.LignePression("mounting", "warning"));
            StringAssert.DoesNotContain("Calm", CompressionScreenController.LignePression("calm", "none"));
            Assert.AreEqual("TENSION — · —", CompressionScreenController.LignePression("compression_active", "active"), "deux mots attendus de l'atelier : « — », jamais « Compression active · Active »");
            CollectionAssert.Contains(MotsDesEnumeres.MotsManquants.ToArray(), "compression.semaine.active");
        }

        private static string RacineScripts => Path.Combine(Application.dataPath, "Scripts");

        [Test]
        public void M4_Garde_PlusDeLisibleHorsLException_PlusDeLibelleAnglaisDeLaListeNoire()
        {
            var fautifs = new List<string>();
            foreach (string f in Directory.GetFiles(RacineScripts, "*.cs", SearchOption.AllDirectories))
            {
                string nom = Path.GetFileName(f);
                string code = string.Join("\n", File.ReadAllLines(f).Select(l => { int c = l.IndexOf("//"); return c >= 0 ? l.Substring(0, c) : l; }));   // le code, sans ses commentaires
                // (a) une fonction de dé-slug `Lisible(` — seule exception : LibellesDecision (domaine OUVERT `decision.type.*`, servi par le back ; le test de ⑤ exige « jamais la clé machine »)
                if (nom != "LibellesDecision.cs" && Regex.IsMatch(code, @"(?<![A-Za-z.])Lisible\s*\(")) fautifs.Add(nom + " : définit ou appelle `Lisible(` (dé-slug)");
                // (b) la liste noire : un libellé AFFICHÉ en anglais (chaîne littérale entière), hors ㉔ (dette DATÉE, M4b)
                if (nom == "AutonomyInboxController.cs") continue;
                foreach (Match m in Regex.Matches(code, "\"(Moderate|Backlogged|Saturated|Nominal|Calm|Mounting|Crushing|Minor|Critical|Heavy|Surge|Warning|Oldest|Choose)\""))
                    fautifs.Add(nom + " : libellé anglais " + m.Value);
            }
            CollectionAssert.IsEmpty(fautifs, "cause 4 : l'énuméré se dit par `MotsDesEnumeres` (mot de l'atelier, « — » sinon) :\n" + string.Join("\n", fautifs));
        }

        [Test]
        public void M4b_DetteDatee_AutonomyInbox_LesLitterauxAnglaisRestentDeclares()
        {
            // ㉔ (CLIENT-3 : « Lt <id> • Oldest: n cycles », « Issue : », « Choose A ») : les MOTS attendent les templates de l'atelier. TD datée 07/10. Si ce test rougit, un littéral a été
            // remplacé : RETIRER la ligne correspondante de `dettes-client1.md` et de ce test.
            string src = File.ReadAllText(Path.Combine(RacineScripts, "Operational", "Autonomy", "AutonomyInboxController.cs"));
            foreach (string litteral in new[] { "\"Issue : \"", "Oldest: ", "\"Choose \"" })
                StringAssert.Contains(litteral, src, "㉔ : dette datée 07/10 — littéral encore posé, à remplacer par les templates de l'atelier");
        }
    }
}
