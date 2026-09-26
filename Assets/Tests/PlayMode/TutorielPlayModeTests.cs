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
    //   U2  `next_tutorial_id` null ≠ « fini » : un éligible NON VU se montre (C10, 26/09) ; « tout vu » SEULEMENT si plus rien
    //       n'est éligible ; « rien de nouveau pour aujourd’hui » quand tous les éligibles sont vus
    //   U4  ㉕ (§G, 26/09) : un tutoriel NOMMÉ (`tutorial.exception_card.*`) sans nom servi ne se lit pas — la tête seule, ni son
    //       texte, ni « Compris », ni « rien de nouveau » ; avec le nom servi, le texte le porte
    //   U5  TD-761 fermée : `onboarding_preseed_params.nom` (forme G, présence lue dans le corps brut) remplit {nom} ; `{}` ⇒ rien
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
                { { id, "La file est vide. Rien n’attend votre décision : la ville tourne sans vous." } });
            Assert.AreEqual("La file est vide. Rien n’attend votre décision : la ville tourne sans vous.",
                TutorialScreenController.TexteDuTutoriel(id), "la clé servie EST l'identifiant");
            TutorialScreenController e = Ecran(new TutorielData
                { next_tutorial_id = id, eligible_tutorial_ids = new[] { id }, shown_tutorial_ids = new string[0] });
            string[] t = Textes(e);
            CollectionAssert.Contains(t, "La file est vide. Rien n’attend votre décision : la ville tourne sans vous.");
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
            // C10 (26/09) — `next` null, UN éligible jamais vu : « Rien de nouveau » serait faux à vie. L'écran montre l'éligible non vu,
            // par son TEXTE servi (un tutoriel NON nommé ; le preseed, nommé, est U4).
            const string preseed = "tutorial.exception_card.onboarding_preseed";
            const string carte = "tutorial.city_map_heat_intro";
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { carte, "La carte montre la chaleur par îlot." } });
            TutorialScreenController e = Ecran(new TutorielData
            {
                next_tutorial_id = "", eligible_tutorial_ids = new[] { carte }, shown_tutorial_ids = new string[0],
            });
            string[] t = Textes(e);
            Assert.IsFalse(t.Contains("Vous avez tout vu."), "le joueur neuf ne lit pas « tout vu » avant d'avoir rien vu");
            Assert.IsFalse(t.Contains("Rien de nouveau pour aujourd’hui."), "C10 : ni « rien de nouveau » — un éligible l'attend");
            CollectionAssert.Contains(t, "La carte montre la chaleur par îlot.", "l'éligible non vu, par son texte servi");
            CollectionAssert.Contains(t, "Une première leçon vous attend.", "table 63 v2 : le joueur neuf lit la tête de sa première leçon");
            Assert.IsFalse(t.Any(x => x.Contains(carte)), "jamais l'identifiant");
            Assert.AreEqual(preseed, TutorialScreenController.PremierEligibleNonVu(new[] { preseed }, new string[0]));

            // tous les éligibles déjà vus (le plafond d'un par session) : alors seulement, « rien de nouveau pour aujourd’hui »
            Assert.IsNull(TutorialScreenController.PremierEligibleNonVu(new[] { preseed }, new[] { preseed }));
            string[] vus = Textes(Ecran(new TutorielData
            {
                next_tutorial_id = "", eligible_tutorial_ids = new[] { preseed }, shown_tutorial_ids = new[] { preseed },
            }));
            CollectionAssert.Contains(vus, "Rien de nouveau pour aujourd’hui.");
        }

        [Test]
        public void U4_UnTutorielNomme_SansNomServi_NeSeLitPas()
        {
            // la VALEUR servie mesurée (string_table.ts, fr) : un nom écrit dans le texte, qui n'est pas le lieutenant du joueur
            const string preseed = "tutorial.exception_card.onboarding_preseed";
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { preseed, "Lt. Hara — cuisson du soir bloquée : plus de solvant." },
                { "tutorial.exception_card.gabarit_test", "{nom} — cuisson du soir bloquée." },
            });
            Assert.IsTrue(TutorialScreenController.EstNomme(preseed));
            Assert.IsFalse(TutorialScreenController.EstNomme("tutorial.city_map_heat_intro"));
            Assert.IsNull(TutorialScreenController.TexteDuTutoriel(preseed), "nommé, nom non servi : rien");
            Assert.AreEqual("Lt. Vesk — cuisson du soir bloquée.",
                TutorialScreenController.TexteDuTutoriel("tutorial.exception_card.gabarit_test", "Lt. Vesk"), "nom servi : le texte le porte");
            // EXIGEANT (table 64) : nom servi, mais la valeur servie écrit « Lt. Hara » en dur ⇒ le repli nommé de la 64
            Assert.AreEqual("Lt. Vesk \u2014 cuisson du soir bloquée\u00A0: plus de solvant. Commander maintenant (coût) ou attendre demain (rendement).",
                TutorialScreenController.TexteDuTutoriel(preseed, "Lt. Vesk"), "valeur sans {nom} ⇒ repli de la 64 avec le vrai nom");

            foreach (string next in new[] { "", preseed })   // l'éligible (C10) ET le `next` servi : même règle
            {
                string[] t = Textes(Ecran(new TutorielData
                {
                    next_tutorial_id = next, eligible_tutorial_ids = new[] { preseed }, shown_tutorial_ids = new string[0],
                }));
                Assert.IsFalse(t.Any(x => x.Contains("Hara")), $"next « {next} » : rien de nommé — " + string.Join(" | ", t));
                CollectionAssert.Contains(t, "Une première leçon vous attend.", "une leçon attend : la tête le dit");
                Assert.IsFalse(t.Contains("Rien de nouveau pour aujourd’hui.") || t.Contains("Vous avez tout vu."), "ni fini ni rien de nouveau");
                Assert.IsFalse(t.Contains("Compris"), "on ne marque pas vu ce qu'on n'a pas montré");
            }
        }

        [Test]
        public void U5_LeNomServi_ParOnboardingPreseedParams()
        {
            // TD-761 fermée : lot i18n du back cc46166d, `onboarding_preseed_params` = { nom } si le préparé est éligible, sinon {}
            const string preseed = "tutorial.exception_card.onboarding_preseed";
            TutorielData lu = TutorialClient.Lire(@"{""payload"":{""data"":{""tutorials_opt_out"":false,""shown_tutorial_ids"":[],"
                + @"""eligible_tutorial_ids"":[""tutorial.exception_card.onboarding_preseed""],""next_tutorial_id"":null,"
                + @"""onboarding_preseed_params"":{""nom"":""Lt. Vesk""}}}}");
            Assert.IsTrue(lu.ParamsDuPreseedServis, "forme G : le champ est dans le corps");
            Assert.AreEqual("Lt. Vesk", TutorialScreenController.NomServi(lu, preseed));
            Assert.IsNull(TutorialScreenController.NomServi(lu, "tutorial.city_map_heat_intro"), "le nom ne vaut que pour le préparé");
            TutorielData ancien = TutorialClient.Lire(@"{""payload"":{""data"":{""eligible_tutorial_ids"":[],""shown_tutorial_ids"":[]}}}");
            Assert.IsFalse(ancien.ParamsDuPreseedServis, "back antérieur : absent");
            Assert.IsNull(TutorialScreenController.NomServi(ancien, preseed));

            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { preseed, "{nom} — cuisson du soir bloquée." } });
            string[] t = Textes(Ecran(lu));
            CollectionAssert.Contains(t, "Lt. Vesk — cuisson du soir bloquée.", "le nom servi remplit {nom} : " + string.Join(" | ", t));
            CollectionAssert.Contains(t, "Compris", "montrée, elle se marque vue");
            Assert.IsFalse(t.Any(x => x.Contains("{nom}")), "jamais l'accolade");

            lu.onboarding_preseed_params = new TutorielParamsDto();   // {} : le préparé n'a pas de nom servi
            string[] sans = Textes(Ecran(lu));
            Assert.IsFalse(sans.Any(x => x.Contains("cuisson") || x.Contains("{nom}")), "sans nom : rien de nommé");
            CollectionAssert.Contains(sans, "Une première leçon vous attend.");
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
