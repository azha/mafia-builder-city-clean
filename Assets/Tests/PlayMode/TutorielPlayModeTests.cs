using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Onboarding;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㉕ LA PREMIÈRE FOIS (23/09, atelier 33 `ecrans-brennar-25-tutoriel.html`) — trois défauts mesurés par l'atelier :
    //   U1  le TEXTE servi du tutoriel, jamais son identifiant (D10-h close, back 4a922bc9 : `next_tutorial_id` EST la clé)
    //   U2  `next_tutorial_id` null ≠ « fini » : « tout vu » SEULEMENT si plus rien n'est éligible, sinon « rien de nouveau pour
    //       aujourd’hui » (au plus un tutoriel par session ; rien avant la première décision)
    //   U3  la bascule « On vous explique encore » dans le sens du JOUEUR, test de VALEUR sur les DEUX états : allumée ⇔ opt-out faux,
    //       et le toucher envoie l'opt-out inverse
    [Category("Tutoriel")]
    public class TutorielPlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private TutorialScreenController Ecran(TutorielData e)
        {
            var go = new GameObject("Tutoriel", typeof(RectTransform));
            montes.Add(go);
            var ecran = go.AddComponent<TutorialScreenController>();
            ecran.RendrePourTest(e);
            return ecran;
        }

        private static string[] Textes(Component c) =>
            c.GetComponentsInChildren<TextMeshProUGUI>(true).Select(t => t.text).ToArray();

        [Test]
        public void U1_LeTexteServi_JamaisLIdentifiant()
        {
            const string id = "tutorial.queue_runs_dry";
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
                { { id, "La file est vide. Rien n’attend votre décision : la ville tourne sans vous." } });
            Assert.AreEqual("La file est vide. Rien n’attend votre décision : la ville tourne sans vous.",
                TutorialScreenController.TexteDuTutoriel(id), "la clé servie EST l'identifiant");
            TutorialScreenController e = Ecran(new TutorielData
                { next_tutorial_id = id, eligible_tutorial_ids = new[] { id }, shown_tutorial_ids = new string[0] });
            string[] t = Textes(e);
            CollectionAssert.Contains(t, "La file est vide. Rien n’attend votre décision : la ville tourne sans vous.");
            Assert.IsFalse(t.Any(x => x.Contains(id)), "l'IDENTIFIANT n'atteint jamais l'écran : " + string.Join(" · ", t));
            Assert.IsFalse(t.Any(x => x.Contains("pas encore écrit")), "plus de note « texte pas encore écrit » (D10-h close)");
            I18nCatalog.Oublier();
            Assert.AreEqual("—", TutorialScreenController.TexteDuTutoriel(id), "clé non servie : un tiret, jamais l'identifiant");
            Assert.AreEqual("—", TutorialScreenController.TexteDuTutoriel(null));
        }

        [Test]
        public void U2_NullNeVeutPasDireFini()
        {
            Assert.AreEqual("Vous avez tout vu.", TutorialScreenController.PhraseSansSuivant(new string[0]),
                "plus rien d'éligible : tout vu");
            Assert.AreEqual("Rien de nouveau pour aujourd’hui.",
                TutorialScreenController.PhraseSansSuivant(new[] { "tutorial.exception_card.onboarding_preseed" }),
                "1ʳᵉ session avant la première décision, ou plafond d'un par session : rien de nouveau POUR AUJOURD’HUI");
            TutorialScreenController e = Ecran(new TutorielData
            {
                next_tutorial_id = "", eligible_tutorial_ids = new[] { "tutorial.exception_card.onboarding_preseed" },
                shown_tutorial_ids = new string[0],
            });
            string[] t = Textes(e);
            Assert.IsFalse(t.Contains("Vous avez tout vu."), "le joueur neuf ne lit pas « tout vu » avant d'avoir rien vu");
            CollectionAssert.Contains(t, "Rien de nouveau pour aujourd’hui.");
        }

        [Test]
        public void U3_LaBascule_DansLeSensDuJoueur_LesDeuxEtats()
        {
            Assert.IsTrue(MafiaCleanCity.Shell.BasculeTutoriels.Allumee(false), "opt-out FAUX ⇒ on vous explique encore : allumée");
            Assert.IsFalse(MafiaCleanCity.Shell.BasculeTutoriels.Allumee(true), "opt-out VRAI ⇒ éteinte");
            Assert.IsTrue(MafiaCleanCity.Shell.BasculeTutoriels.OptOutPour(false), "l'éteindre ⇒ tutorials_opt_out = true");
            Assert.IsFalse(MafiaCleanCity.Shell.BasculeTutoriels.OptOutPour(true), "l'allumer ⇒ tutorials_opt_out = false");

            foreach (bool optOut in new[] { false, true })
            {
                TutorialScreenController e = Ecran(new TutorielData
                {
                    tutorials_opt_out = optOut, next_tutorial_id = "", eligible_tutorial_ids = new string[0],
                    shown_tutorial_ids = new string[0],
                });
                Assert.AreEqual(!optOut, e.BasculeAffichee, $"opt-out {optOut} : la bascule affichée est {!optOut}");
                CollectionAssert.Contains(Textes(e), "On vous explique encore", "le libellé RATIFIÉ, dans les deux états");
                Transform ligne = e.GetComponentsInChildren<Transform>(true).First(x => x.name == "Bascule");
                ligne.GetComponent<Button>().onClick.Invoke();
                Assert.AreEqual(!optOut, e.DernierRefusDemande,
                    $"opt-out {optOut} : toucher la bascule envoie tutorials_opt_out = {!optOut} (l'état inverse)");
            }
        }
    }
}
