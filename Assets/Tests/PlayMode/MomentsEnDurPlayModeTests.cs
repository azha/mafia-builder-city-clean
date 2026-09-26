using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Tests
{
    // CLASSE « MOMENT EN DUR » (f2 26/09 ; T18 sur ⑨, « CE MATIN » figé en plein jour sur ㊳ et ⑯ — relevé f1 §K.6). Un en-tête qui dit
    // l'heure présente se lit par day_phase SERVI (PhaseDeSession, publié par le shell à l'ouverture), mots des tables 77 et 78.
    //   M1  Moment.Dire : la phase servie choisit la clé et son repli ; absente ou hors domaine ⇒ « inconnu » — jamais un « ce matin » fixe
    //   M2  les 5 en-têtes suivent la phase (⑨/⑯ exceptions.moment, ㊳ titre et vide, ⑤ sabot) : DAWN ≠ DUSK
    //   M3  garde de CLASSE : aucun littéral « ce matin / ce soir / cette nuit / à l'aube » (ni clé dérivée ce_soir…) dans Assets/Scripts
    //       hors exceptions EXACTES nommées — la seule : la fraîcheur de la table 49. (B) réécrits par la table 80 (aucun geste n'attend
    //       le soir, mesure back) ; une clé GARDÉE (« conflit.bloc.ce_soir ») n'est pas un texte montré
    [Category("I18n")]
    public class MomentsEnDurPlayModeTests
    {
        [TearDown] public void Nettoyer() { PhaseDeSession.Oublier(); I18nCatalog.Oublier(); }

        private static readonly Dictionary<string, string> Replis = new Dictionary<string, string>
            { { "DAWN", "le matin" }, { "DAY", "le jour" }, { "DUSK", "le soir" }, { "NIGHT", "la nuit" } };

        [Test]
        public void M1_LaPhaseServie_ChoisitLeMot()
        {
            Assert.AreEqual("le matin", Moment.Dire("x.moment", "DAWN", Replis, "?"));
            Assert.AreEqual("le soir", Moment.Dire("x.moment", "DUSK", Replis, "?"));
            Assert.AreEqual("?", Moment.Dire("x.moment", null, Replis, "?"), "non servie : inconnu");
            Assert.AreEqual("?", Moment.Dire("x.moment", "NOON", Replis, "?"), "hors domaine : inconnu, jamais un moment inventé");
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "x.moment.dusk", "ce soir servi" } });
            Assert.AreEqual("ce soir servi", Moment.Dire("x.moment", "DUSK", Replis, "?"), "la valeur servie de la clé par phase");
        }

        [Test]
        public void M2_LesEnTetes_SuiventLaPhase()
        {
            PhaseDeSession.Publier("DAWN");
            string matin = MafiaCleanCity.Shell.DecisionDetailScreenController.PhraseDuSabot();
            PhaseDeSession.Publier("DUSK");
            string soir = MafiaCleanCity.Shell.DecisionDetailScreenController.PhraseDuSabot();
            Assert.AreEqual("Rien ne se détache du sabot ce matin.", matin);
            Assert.AreEqual("Rien ne se détache du sabot ce soir.", soir, "au soir, jamais « ce matin »");
            PhaseDeSession.Publier(null);
            Assert.AreEqual("Rien ne se détache du sabot pour l’instant.", MafiaCleanCity.Shell.DecisionDetailScreenController.PhraseDuSabot());
        }

        // ── M3 : la garde de CLASSE ─────────────────────────────────────────────────────────────────────────────────────────────
        private static readonly Regex MotDuMoment = new Regex(@"\b(ce soir|ce matin|cette nuit|à l['’]aube|ce_soir|ce_matin|cette_nuit|la nuit|à la nuit|la_nuit)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex Litteral = new Regex("\"(?:\\\\.|[^\"\\\\])*\"", RegexOptions.Compiled);
        private static readonly Regex DansUneTableDePhase = new Regex(@"\{ ""(DAWN|DAY|DUSK|NIGHT)"",", RegexOptions.Compiled);

        /// <summary>Exceptions EXACTES (fichier → nombre de littéraux), chacune avec sa raison.</summary>
        private static readonly Dictionary<string, int> Exceptions = new Dictionary<string, int>
        {
            // (B) retirées (table 80 @20ceeca0) : aucun geste n'attend le soir (mesure back -51) — les « ce soir » sont réécrits
            { "JournalScreenController.cs", 1 },       // la fraîcheur « ce matin » (table 49, recency_band = fresh : un temps RELATIF, f2)
            { "ConflitScreenController.cs", 1 },       // :1038 « … le gros bras qui part la nuit » : VRAI, le coup se résout à minuit (f2)
        };

        /// <summary>Un littéral qui n'est qu'une CLÉ i18n (« conflit.bloc.ce_soir ») : un nom GARDÉ dont la valeur servie a été réécrite
        /// (table 80) — pas un texte montré.</summary>
        private static readonly Regex CleSeule = new Regex(@"^""[a-z0-9_]+(\.[a-z0-9_]+)+""$", RegexOptions.Compiled);

        private static int Sites(string source) =>
            source.Split('\n').Where(l => !l.TrimStart().StartsWith("//") && !l.TrimStart().StartsWith("*") && !DansUneTableDePhase.IsMatch(l))
                .Sum(l => Litteral.Matches(l).Cast<Match>().Count(m => MotDuMoment.IsMatch(m.Value) && !CleSeule.IsMatch(m.Value)));

        [Test]
        public void M3_AucunMomentEnDur_HorsExceptionsNommees()
        {
            Assert.AreEqual(1, Sites("            plaqueSurtitre.text = Lib(\"Ce soir, au Verge d’Or\");"), "contrôle positif : T18 d'avant est VU");
            Assert.AreEqual(0, Sites("                { \"DUSK\", \"Ce soir, au Verge d’Or\" },"), "un mot de table de phase n'est pas un moment en dur");
            Assert.AreEqual(0, Sites("                Libelle.Gabarit(\"conflit.bloc.ce_soir\", \"En cours\"),"), "une clé gardée n'est pas un texte montré");
            Assert.AreEqual(1, Sites("                Libelle.Gabarit(\"conflit.bloc.ce_soir\", \"Ce soir\"),"), "… mais son repli, si");
            // f2 (26/09) : la forme DÉRIVÉE « la nuit / à la nuit » — contrôle positif sur ㉘:707
            Assert.AreEqual(1, Sites("                replique = \"Il est parti à la nuit. Ça serpente, mais c'est la seule qui évite le pont du Threnny.\";"),
                "contrôle positif : « à la nuit » est VU");

            string racine = Path.Combine(Application.dataPath, "Scripts");
            var ecarts = new List<string>();
            int lus = 0;
            foreach (string f in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                lus++;
                int n = Sites(File.ReadAllText(f));
                string nom = Path.GetFileName(f);
                int permis = Exceptions.TryGetValue(nom, out int p) ? p : 0;
                if (n != permis) ecarts.Add($"{nom} : {n} moment(s) en dur, {permis} permis");
            }
            Assert.Greater(lus, 100, "le balayage lit réellement l'arbre des scripts");
            Assert.IsEmpty(ecarts, "un en-tête qui dit l'heure lit day_phase SERVI (Moment.Dire) — ou une exception NOMMÉE :\n" + string.Join("\n", ecarts));
        }
    }
}
