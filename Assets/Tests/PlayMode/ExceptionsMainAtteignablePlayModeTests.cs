using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑩-1b — D09 (décision de l'orchestrateur, 23/09) : « aucune route joueur ne doit devenir inatteignable ». Gardes de
    // PARCOURS, comptées sur les requêtes ÉMISES par la couture de résolution (aucune requête réseau) :
    //   R19     la carte de chaleur (corps réel : acknowledge / escalate ESCALATE / lay_low) : ses TROIS issues servies
    //           partent, avec leur `method` servi — `lay_low` par le talon déplié ; pas de carte « Escalader » en double
    //   R19bis  une carte SANS issue ESCALATE (le raid démo : fix_quiet / pay_off / lay_low) : ses trois issues partent, ET la
    //           carte « Escalader » du talon envoie ESCALATE avec l'id suggéré
    //   R19ter  plus de bouton « Escalate » ; « Retour » hors shell seulement
    [Category("EcranFile")]
    public class ExceptionsMainAtteignablePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static CandidateActionDto A(string id, string method) => new CandidateActionDto { id = id, label = id, method = method };

        private static ExceptionCardDto Chaleur() => new ExceptionCardDto
        {
            exception_id = "heat", lieutenant_id = "", lieutenant = new ExceptionLieutenantDto(),
            event_descriptor = "Citywide heat is high — your operations are under pressure.",
            severity_band = "SEVERE", priority_band = "urgent", confidence_band = "confident",
            candidate_actions = new[] { A("acknowledge", "ONE_TIME"), A("escalate", "ESCALATE"), A("lay_low", "LAY_LOW") },
            suggested_action = A("acknowledge", "ONE_TIME"),
        };

        private static ExceptionCardDto Raid() => new ExceptionCardDto
        {
            exception_id = "raid", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "exc_demo_raid_style",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "likely",
            candidate_actions = new[] { A("fix_quiet", "ONE_TIME"), A("pay_off", "ONE_TIME"), A("lay_low", "LAY_LOW") },
            suggested_action = A("fix_quiet", "ONE_TIME"),
        };

        private ExceptionDetailController Main(ExceptionCardDto carte, Transform montage = null)
        {
            var go = new GameObject("Nav_ExceptionDetail");
            montes.Add(go);
            var d = go.AddComponent<ExceptionDetailController>();
            if (montage != null) d.SetMountParent(montage);   // AVANT `Init` : `BuildLayout` le lit
            d.Init(carte, "t", null, onBack: () => { });
            return d;
        }

        private static ExceptionDetailController.CarteTouchable Trouver(ExceptionDetailController d, string id, bool escalade)
        {
            foreach (var c in d.CartesPourTest)
                if (c.Escalade == escalade && c.Action != null && c.Action.id == id) return c;
            return null;
        }

        /// <summary>Choisir une carte (en dépliant le talon s'il le faut), taper le tampon, et rendre la requête ÉMISE.</summary>
        private IEnumerator Envoyer(ExceptionCardDto carte, string id, bool escalade, List<ResolveRequest> emises)
        {
            ExceptionDetailController d = Main(carte);
            d.ClientPourTest.SubstitutResolvePourTest = r =>
            {
                emises.Add(JsonUtility.FromJson<ResolveRequest>(r.Corps));
                return new ResolveResponse { resolved = true, outcome = "RESOLVED" };
            };
            var cible = Trouver(d, id, escalade);
            if (cible == null && d.TalonPourTest != null)
            {
                d.TalonPourTest.onClick.Invoke();
                cible = Trouver(d, id, escalade);
            }
            Assert.IsNotNull(cible, $"« {id} »{(escalade ? " (Escalader)" : "")} doit être une carte touchable de la main");
            cible.Bouton.onClick.Invoke();
            Assert.AreEqual(escalade ? "ESCALADER" : id, d.SelectionId, "le tampon dit le choix");
            Assert.IsNotNull(d.TamponAppuiPourTest, "le tampon résout à l'appui long (⑩-1e)");
            d.TamponAppuiPourTest.SimulateCompletedLongPress();
            for (int i = 0; i < 3; i++) yield return null;
        }

        private static string[] Paires(List<ResolveRequest> emises)
        {
            var l = new List<string>();
            foreach (ResolveRequest r in emises) l.Add(r.method + ":" + r.chosen_action_id);
            l.Sort(System.StringComparer.Ordinal);
            return l.ToArray();
        }

        [UnityTest]
        public IEnumerator R19_LaCarteDeChaleur_SesTroisIssuesPartent()
        {
            var emises = new List<ResolveRequest>();
            foreach (CandidateActionDto a in Chaleur().candidate_actions)
                yield return Envoyer(Chaleur(), a.id, false, emises);
            CollectionAssert.AreEqual(new[] { "ESCALATE:escalate", "LAY_LOW:lay_low", "ONE_TIME:acknowledge" }, Paires(emises),
                "chaque issue servie part, avec son `method` servi (D4)");

            ExceptionDetailController d = Main(Chaleur());
            Assert.IsNotNull(d.TalonPourTest, "`lay_low` est au talon");
            d.TalonPourTest.onClick.Invoke();
            Assert.IsTrue(d.TalonDeplie);
            foreach (var c in d.CartesPourTest)
                Assert.IsFalse(c.Escalade, "l'escalade est SERVIE : pas de carte « Escalader » en double");
        }

        [UnityTest]
        public IEnumerator R19bis_SansIssueEscalate_LaCarteEscaladerDuTalon()
        {
            var emises = new List<ResolveRequest>();
            foreach (CandidateActionDto a in Raid().candidate_actions)
                yield return Envoyer(Raid(), a.id, false, emises);
            yield return Envoyer(Raid(), "fix_quiet", true, emises);
            CollectionAssert.AreEqual(
                new[] { "ESCALATE:fix_quiet", "LAY_LOW:lay_low", "ONE_TIME:fix_quiet", "ONE_TIME:pay_off" }, Paires(emises),
                "les trois issues servies, plus ESCALATE avec l'id suggéré (comme l'ancien bouton)");
        }

        [Test]
        public void R19ter_PlusDeBoutonEscalate_RetourHorsShellSeulement()
        {
            ExceptionDetailController seul = Main(Raid());
            Transform feuille = seul.FeuillePourTest.transform;
            Assert.IsNull(Chercher(feuille, "Btn_escalate"), "D09 : l'escalade est une carte, plus un bouton");
            Assert.IsNotNull(Chercher(feuille, "Btn_back"), "hors shell, « Retour » reste : sinon la main n'a pas de sortie");

            var slot = new GameObject("SlotShell", typeof(RectTransform));
            montes.Add(slot);
            ExceptionDetailController sousShell = Main(Raid(), slot.transform);
            Assert.IsNull(Chercher(sousShell.FeuillePourTest.transform, "Btn_back"), "sous shell, le retour est le geste du shell");
            Assert.IsNull(Chercher(sousShell.FeuillePourTest.transform, "Btn_escalate"));
        }

        private static Transform Chercher(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }
    }
}
