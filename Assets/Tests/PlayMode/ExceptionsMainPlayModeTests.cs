using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑩-1 — sa main, plein écran au comptoir (cadre 15). Gardes de STRUCTURE et de PARCOURS :
    //   R18     le châssis : le bar de ⑨ au zinc de 15 % sous la main, ni feuille `CardBg` ni en-tête « SA MAIN » (D01, D02)
    //   R18bis  la carte SE FERME sur une résolution réussie (D10) : la file reçoit (carte, issue, action), `onBack` n'est pas
    //           rappelé, un `Back()` ultérieur ne rappelle rien ; un échec garde la main ouverte avec son erreur
    //   R18ter  de ⑩ à ⑨ : la résolution dans la main montre l'APRÈS dans la file (cachet, carte partie) — coutures, aucune requête
    [Category("EcranFile")]
    public class ExceptionsMainPlayModeTests
    {
        private GameObject hostGo, detailGo;
        private ExceptionQueueController ecran;
        private ExceptionDetailController detail;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (ecran != null && ecran.LastNavGameObject != null) Object.DestroyImmediate(ecran.LastNavGameObject);
            if (ecran != null && ecran.Decor != null) Object.DestroyImmediate(ecran.Decor.transform.parent.gameObject);
            if (detailGo != null) Object.DestroyImmediate(detailGo);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null; detail = null; detailGo = null;
        }

        private static CandidateActionDto Reparer() => new CandidateActionDto
        {
            id = "repair", label = "Repair", method = "REPAIR",
            effect = new ExceptionEffectDto { type = "REPAIR", target_building_id = "b-1" },
        };

        private static ExceptionCardDto Kane() => new ExceptionCardDto
        {
            exception_id = "k", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "They turned the building over last night.",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "confident",
            candidate_actions = new[] { Reparer() }, suggested_action = Reparer(),
        };

        private static ExceptionCardDto Autre(string id) => new ExceptionCardDto
        {
            exception_id = id, lieutenant_id = "", lieutenant = new ExceptionLieutenantDto(),
            severity_band = "MODERATE", priority_band = "urgent", confidence_band = "likely",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private int retours;

        private void NouvelleMain(ExceptionCardDto carte)
        {
            detailGo = new GameObject("Nav_ExceptionDetail");
            detail = detailGo.AddComponent<ExceptionDetailController>();
            retours = 0;
            detail.Init(carte, "t", null, onBack: () => retours++);
        }

        [Test]
        public void R18_LeChassis_LeBarAuZincDeQuinze_NiFeuilleNiEnTete()
        {
            NouvelleMain(Kane());
            Assert.IsNotNull(detail.Decor, "le décor de ⑩ (D01)");
            Assert.AreEqual(ExceptionDetailController.ZincMain, detail.Decor.Zinc.anchorMax.y, 1e-4f, "`.zinc.main-de-cartes{height:15%}`");
            Assert.AreEqual(0.15f, ExceptionDetailController.ZincMain, 1e-6f);
            Assert.AreEqual(ExceptionQueueController.CheminBar, ExceptionDetailController.ParametresMain().CheminScene, "le bar de ⑨");
            Transform fond = detail.Decor.transform.parent;
            Assert.AreEqual("ExceptionDetailBackdrop", fond.name);
            Assert.AreEqual(0, detail.Decor.transform.GetSiblingIndex(), "le décor sous tout");
            Assert.IsTrue(fond.GetComponent<Image>().raycastTarget, "rien ne traverse jusqu'à la file");
            Assert.AreEqual(0f, fond.GetComponent<Image>().color.a, 1e-6f, "attrape-gestes transparent : le bar se voit");

            Transform feuille = detail.FeuillePourTest.transform;
            Assert.AreEqual("ExceptionDetailSheet", feuille.name, "le nom que lisent la capture et la garde des insets");
            Assert.AreSame(fond.parent, feuille.parent, "fond et feuille frères, sous la même racine");
            Assert.IsNull(feuille.GetComponent<Image>(), "plus de feuille `CardBg` (D01)");
            Assert.IsNull(feuille.Find("Header"), "plus d'en-tête « SA MAIN » (D02)");
            CollectionAssert.DoesNotContain(detail.RenderedTexts, "SA MAIN");
            Assert.AreEqual(TextAnchor.LowerCenter, feuille.GetComponent<VerticalLayoutGroup>().childAlignment, "collée en bas, comme le comptoir");
        }

        [UnityTest]
        public IEnumerator R18bis_LaCarteSeFerme_SurUneResolutionReussie()
        {
            NouvelleMain(Kane());
            ExceptionCardDto recue = null; string issue = null; CandidateActionDto envoyee = null;
            detail.SurResolution = (c, o, a) => { recue = c; issue = o; envoyee = a; };

            detail.ClientPourTest.SubstitutResolvePourTest = r => null;   // un échec d'abord
            yield return detail.ResolveWith(Reparer());
            Assert.IsNotNull(detail.LastError, "l'échec se dit");
            Assert.IsFalse(detail.Ferme, "un échec garde la main ouverte");
            Assert.IsNull(issue);

            detail.ClientPourTest.SubstitutResolvePourTest = r => new ResolveResponse { resolved = true, outcome = "REPAIRING" };
            yield return detail.ResolveWith(Reparer());
            Assert.IsTrue(detail.Ferme, "D10 : la main se referme");
            Assert.AreEqual("k", recue.exception_id);
            Assert.AreEqual("REPAIRING", issue);
            Assert.AreEqual("repair", envoyee.id, "l'action ENVOYÉE, pour l'après de la file");
            Assert.AreEqual(0, retours, "la file est rappelée par l'issue, pas par `onBack` — une seule fois");
            yield return null;
            Assert.IsTrue(detail == null, "l'hôte est détruit");
            detail.Back();
            Assert.AreEqual(0, retours, "un `Back()` après la fermeture ne rappelle rien");
            detailGo = null;
        }

        [UnityTest]
        public IEnumerator R18ter_DeLaMainALaFile_LApres()
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(new[] { Kane(), Autre("v"), Autre("m") });
            ecran.ClientPourTest.SubstitutFilePourTest = () => new[] { Autre("v"), Autre("m") };
            ecran.ClientPourTest.SubstitutEscalationsPourTest = () => 0;

            ecran.OpenDetail(ecran.Cards[0]);
            ExceptionDetailController main = ecran.LastDetail;
            Assert.IsNotNull(main);
            main.ClientPourTest.SubstitutResolvePourTest = r => new ResolveResponse { resolved = true, outcome = "REPAIRING" };
            yield return main.ResolveWith(Reparer());

            // `ApresPresent` est vrai dès que la file RETIENT la tranchée, avant que le rechargement ne la redessine : on attend
            // le cachet lui-même (rouge du créneau de 01:2x, 23/09 : cachet vide à la première frame).
            for (int i = 0; i < 30 && string.IsNullOrEmpty(ecran.ApresCachet); i++) yield return null;
            Assert.IsTrue(ecran.ApresPresent, "⑨ montre l'après de la résolution faite dans ⑩");
            Assert.AreEqual("EN RÉPARATION", ecran.ApresCachet);
            Assert.IsNotNull(ecran.PartiPourTest);
            Assert.AreEqual(2, ecran.Cards.Length, "la file rechargée");
        }
    }
}
