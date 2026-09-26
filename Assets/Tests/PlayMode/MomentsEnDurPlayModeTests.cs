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
    //       hors exceptions EXACTES nommées — (B) les gestes PLANIFIÉS le soir (mesure back en attente, f2), la fraîcheur de la table 49,
    //       l'état « pas de réponse » de ㊳ (mots demandés à l'atelier)
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
        private static readonly Regex MotDuMoment = new Regex(@"\b(ce soir|ce matin|cette nuit|à l['’]aube|ce_soir|ce_matin|cette_nuit)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex Litteral = new Regex("\"(?:\\\\.|[^\"\\\\])*\"", RegexOptions.Compiled);
        private static readonly Regex DansUneTableDePhase = new Regex(@"\{ ""(DAWN|DAY|DUSK|NIGHT)"",", RegexOptions.Compiled);

        /// <summary>Exceptions EXACTES (fichier → nombre de littéraux), chacune avec sa raison.</summary>
        private static readonly Dictionary<string, int> Exceptions = new Dictionary<string, int>
        {
            { "CarnetScreenController.cs", 3 },        // (B) « les ordres de ce soir » : le cue-stack part le soir ? mesure back (f2)
            { "ConflitScreenController.cs", 5 },       // (B) le coup de ce soir, clé conflit.bloc.ce_soir + repli, réplique, « L'envoyer ce soir »
            { "DistributionScreenController.cs", 4 },  // (B) l'envoi de ce soir (titre, réplique, état, bouton)
            { "JournalScreenController.cs", 2 },       // la fraîcheur « ce matin » (table 49, f2 : reste) ; l'état « pas de réponse » (atelier)
        };

        private static int Sites(string source) =>
            source.Split('\n').Where(l => !l.TrimStart().StartsWith("//") && !l.TrimStart().StartsWith("*") && !DansUneTableDePhase.IsMatch(l))
                .Sum(l => Litteral.Matches(l).Cast<Match>().Count(m => MotDuMoment.IsMatch(m.Value)));

        [Test]
        public void M3_AucunMomentEnDur_HorsExceptionsNommees()
        {
            Assert.AreEqual(1, Sites("            plaqueSurtitre.text = Lib(\"Ce soir, au Verge d’Or\");"), "contrôle positif : T18 d'avant est VU");
            Assert.AreEqual(0, Sites("                { \"DUSK\", \"Ce soir, au Verge d’Or\" },"), "un mot de table de phase n'est pas un moment en dur");

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
