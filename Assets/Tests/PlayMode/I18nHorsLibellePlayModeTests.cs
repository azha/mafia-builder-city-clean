using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Exceptions;

namespace MafiaCleanCity.Operational.Tests
{
    // LE REPLI D'UNE CLÉ DU CLIENT SE COMPTE, TOUJOURS (2026-09-23 — trou trouvé par la garde « zéro repli » de CLIENT-1 en mergeant
    // ⑨-6e : quatre sites lisaient `I18nCatalog` sans `Libelle`, leur repli n'était jamais compté).
    //   L1     `Libelle.Gabarit` : clé non servie ⇒ repli rempli ET `ClesEnRepli` la contient ; clé servie ⇒ la valeur, absente
    //   L1bis  les QUATRE sites passent par lui : `KickerApres` (ExceptionBandes.Gabarit), `LigneAmbiance` (CompteEnLettres),
    //          `TexteEscalader`, `LigneDAction` — chacun inscrit sa clé en repli, rendu inchangé
    //   L2     garde de CLASSE : hors de `Assets/Scripts/I18n/`, `I18nCatalog.Connait/Traduire` ne se lit qu'avec une RÉFÉRENCE
    //          SERVIE (`….key`, `…_key`) — jamais un littéral, jamais une variable locale ; contrôle positif sur une source fabriquée
    [Category("EcranFile")]
    public class I18nHorsLibellePlayModeTests
    {
        [SetUp]
        public void SetUp()
        {
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

        [Test]
        public void L1_LeRepliDuGabarit_EstCompte()
        {
            Assert.AreEqual("repli A", Libelle.Gabarit("test.gabarit.absente", "repli {x}", new Dictionary<string, string> { { "x", "A" } }));
            CollectionAssert.Contains(Libelle.ClesEnRepli, "test.gabarit.absente", "clé non servie ⇒ comptée");
            Assert.AreEqual(1, Libelle.NbReplis);

            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "test.gabarit.servie", "servie {x}" } });
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("servie B", Libelle.Gabarit("test.gabarit.servie", "repli {x}", new Dictionary<string, string> { { "x", "B" } }));
            CollectionAssert.DoesNotContain(Libelle.ClesEnRepli, "test.gabarit.servie", "clé servie ⇒ absente");
            Assert.AreEqual(0, Libelle.NbReplis);

            Assert.IsNull(Libelle.Gabarit("test.gabarit.absente", null), "repli null ⇒ null : l'appelant compose");
            Libelle.RemettreLesCompteurs();
            Assert.IsNull(Libelle.Gabarit(null, null), "clé vide ⇒ ni lecture…");
            Assert.AreEqual(0, Libelle.NbAppels, "… ni compte");
        }

        [Test]
        public void L1bis_LesQuatreSites_ComptentLeurRepli()
        {
            var kane = new ExceptionCardDto { lieutenant_id = "lt", lieutenant = new ExceptionLieutenantDto { id = "lt", name = "Lt. Kane" } };
            Assert.AreEqual("Lt. Kane retourne au travail", ExceptionQueueController.KickerApres(kane));
            CollectionAssert.Contains(Libelle.ClesEnRepli, "exceptions.bloc.nom_retourne_au_travail");

            Assert.AreEqual("Deux attendent vos ordres — la file est calme", ExceptionQueueController.LigneAmbiance(2));
            CollectionAssert.Contains(Libelle.ClesEnRepli, "exceptions.file.ambiance");

            Assert.AreEqual("Escalader", ExceptionDetailController.TexteEscalader());
            CollectionAssert.Contains(Libelle.ClesEnRepli, "exception_detail.bloc.escalate");

            Assert.AreEqual("Échec.", BuildingCardController.LigneDAction(
                new ActionOutcome { Ok = false, CleI18n = "error.test.absente" }, "Fait.", "Échec"));
            CollectionAssert.Contains(Libelle.ClesEnRepli, "error.test.absente", "une clé servie absente du bundle : repli compté");
        }

        // ── L2 : la garde de classe ──────────────────────────────────────────────────────────────────────────────────────────

        private static readonly Regex Appel =
            new Regex(@"I18nCatalog\s*\.\s*(?:Connait|Traduire)\s*\(\s*([^,\)]*)", RegexOptions.Compiled);
        private static readonly Regex ReferenceServie =
            new Regex(@"^[\w\.\?\[\]]*\.(?:\w*_)?key$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        /// <summary>Les lectures du catalogue dont la clé n'est PAS une référence servie (`….key`) : littéral, variable locale…</summary>
        private static List<string> Violations(string source, string nom)
        {
            var res = new List<string>();
            string[] lignes = source.Split('\n');
            for (int i = 0; i < lignes.Length; i++)
            {
                string t = lignes[i].TrimStart();
                if (t.StartsWith("//") || t.StartsWith("*")) continue;
                foreach (Match m in Appel.Matches(lignes[i]))
                {
                    string arg = m.Groups[1].Value.Trim();
                    if (!ReferenceServie.IsMatch(arg)) res.Add($"{nom}:{i + 1}  I18nCatalog(…{arg}…)");
                }
            }
            return res;
        }

        [Test]
        public void L2_AucuneCleDuClient_HorsDeLibelle()
        {
            // contrôle positif : la forme d'avant (un littéral, une constante locale) est vue ; une référence servie ne l'est pas
            const string avant =
                "const string cle = \"exception_detail.bloc.escalate\";\n" +
                "return I18nCatalog.Connait(cle) ? I18nCatalog.Traduire(cle) : \"Escalader\";\n" +
                "if (MafiaCleanCity.I18n.I18nCatalog.Connait(\"exceptions.file.ambiance\")) { }\n" +
                "/// I18nCatalog.Traduire(cle) dans un commentaire ne compte pas\n";
            Assert.AreEqual(3, Violations(avant, "fabrique").Count, "contrôle positif : la classe d'avant est VUE");
            const string servi =
                "return MafiaCleanCity.I18n.I18nCatalog.Traduire(a.label_i18n.key);\n" +
                "I18nCatalog.Connait(option.label_key) ? I18nCatalog.Traduire(option.label_key, p) : x;\n";
            Assert.AreEqual(0, Violations(servi, "fabrique").Count, "une référence servie n'est pas une clé du client");

            string racine = Path.Combine(Application.dataPath, "Scripts");
            var toutes = new List<string>();
            int lus = 0;
            foreach (string f in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                string rel = f.Replace('\\', '/');
                if (rel.Contains("/Scripts/I18n/")) continue;   // `Libelle` et le catalogue lui-même
                lus++;
                toutes.AddRange(Violations(File.ReadAllText(f), rel.Substring(rel.IndexOf("Assets/"))));
            }
            Assert.Greater(lus, 100, "le balayage lit réellement l'arbre des scripts");
            Assert.IsEmpty(toutes, "une clé du CLIENT se lit par `Libelle` (son repli se compte) :\n" + string.Join("\n", toutes));
        }
    }
}
