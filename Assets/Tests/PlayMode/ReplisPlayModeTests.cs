using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;

namespace MafiaCleanCity.CityMap.Tests
{
    // LES REPLIS « INCONNU » (règle f2 du 23/09, mots de l'atelier 28 `26c8e265`) : un joueur ne voit JAMAIS une valeur machine brute
    // ni un littéral hors `Libelle`. Chaque résolveur reçoit un test de COUVERTURE DE DOMAINE : tout le domaine servi est mappé HORS de
    // la branche par défaut, et une valeur fabriquée y tombe bien (contrôle positif). La dérive de domaine se voit ICI, par un test —
    // jamais par l'œil du joueur.
    //   R1  les défauts qui MENTAIENT : « Small » et « Deep » (un cran faux affirmé), « do nothing » (anglais, et une action absente
    //       lue comme une action) ; les comparateurs et actions des règles
    [Category("Replis")]
    public class ReplisPlayModeTests
    {
        [TearDown] public void OublierLeCatalogue() => I18nCatalog.Oublier();

        /// <summary>La couverture d'un domaine : aucune valeur du domaine ne tombe dans le repli, et la valeur fabriquée y tombe.</summary>
        internal static void Couvre(string nom, IEnumerable<string> domaine, System.Func<string, string> resoudre, string repli,
                                    string fabriquee = "__HORS_DOMAINE__", bool sansBrut = true)
        {
            string[] d = domaine.ToArray();
            Assert.Greater(d.Length, 0, $"{nom} : anti-vacuité, le domaine est vide");
            string[] tombent = d.Where(v => resoudre(v) == repli).ToArray();
            Assert.IsEmpty(tombent, $"{nom} : valeur(s) du domaine SERVI tombée(s) dans le repli — un cran neuf non mappé : "
                                    + string.Join(", ", tombent));
            Assert.AreEqual(repli, resoudre(fabriquee), $"{nom} : contrôle positif, une valeur fabriquée tombe dans le repli");
            if (!sansBrut) return;   // un domaine dont le mot EST le symbole (les comparateurs : « > » se lit « > »)
            string[] bruts = d.Where(v => resoudre(v) == v).ToArray();
            Assert.IsEmpty(bruts, $"{nom} : valeur(s) rendue(s) BRUTE(S) : " + string.Join(", ", bruts));
        }

        [Test]
        public void R1_LesDefautsQuiMentaient()
        {
            string etat = Repli.EtatInconnu, type = Repli.TypeInconnu;
            Assert.AreEqual("état inconnu", etat);
            Assert.AreEqual("type inconnu", type);

            // Les quatre paliers du sélecteur (le domaine est CELUI DU CLIENT : `TransferAmountStepsCents`, c'est lui qui les propose).
            Couvre("TransferAmountLabel", BuildingCardController.TransferAmountStepsCents.Select(c => c.ToString()),
                v => BuildingCardController.TransferAmountLabel(int.Parse(v)), etat, "5");
            Assert.AreNotEqual("Small", BuildingCardController.TransferAmountLabel(5), "« Small » affirmait un palier faux");

            // Les passes d'affinage : 0 … `MaxRefiningPassesUi` (3, le défaut serveur `production.ash.max_refining_passes`).
            Couvre("RefiningPassesLabel", Enumerable.Range(0, BuildingCardController.MaxRefiningPassesUi + 1).Select(i => i.ToString()),
                v => BuildingCardController.RefiningPassesLabel(int.Parse(v)), etat, "4");
            Assert.AreEqual(etat, BuildingCardController.RefiningPassesLabel(-1));

            // Les comparateurs : `CompareOp` du back (`services/game-back/src/dsl/ast.ts:24` : < <= = != >= >), plus l'alias `==` que son
            // parseur accepte (`dsl/parser.service.ts:71`). ⚠️ `=` n'était PAS mappé : la forme canonique du back sortait brute.
            Couvre("ComparatorWord", new[] { "<", "<=", "=", "==", "!=", ">=", ">" }, RuleModel.ComparatorWord, type, sansBrut: false);
            Assert.AreEqual("—", RuleModel.ComparatorWord(""), "absent : un tiret");

            // Les actions : celles que l'éditeur PROPOSE (`RuleModel.Actions`), les seules qu'une règle du client peut porter.
            Couvre("ActionWord", RuleModel.Actions, RuleModel.ActionWord, type);
            Assert.AreEqual("—", RuleModel.ActionWord(null), "absente : un tiret, plus « do nothing » (une action affirmée, en anglais)");
            Assert.AreEqual("—", RuleModel.ActionWord("  "));

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
                { { "commun.repli.etat_inconnu", "unknown state" }, { "commun.repli.type_inconnu", "unknown type" } });
            Assert.AreEqual("unknown state", BuildingCardController.TransferAmountLabel(5), "la clé servie l'emporte");
            Assert.AreEqual("unknown type", RuleModel.ActionWord("FLEE"));
        }
    }
}
