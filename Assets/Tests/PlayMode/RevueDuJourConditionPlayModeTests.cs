using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-8 — la phrase de v4-3 : le sujet (`subject_name_i18n`, S5-a) et la condition (`deviation_condition`, S5-b),
    // forme A du back (04f35021). Mots : atelier 10-mots-revue-etats-v4-3.md §3 (8a1ea438).
    //   R9      chaque valeur du DOMAINE (12, deviation-condition.ts) rend une phrase non vide, sans accolade
    //   R9bis   les 4 conditions de production : la phrase de l'atelier, AVEC le sujet, en gras et insécable
    //   R9ter   baseline / unrecorded ⇒ le repli générique ; Lek, précurseurs, réserve ⇒ la phrase de leur générateur
    //   R9quater sur la carte : sans sujet, ou sujet non servi ⇒ la phrase de v4-0 (jamais une clé nue) ;
    //           sujet servi ⇒ la phrase de v4-3, avec le nom résolu par le catalogue et ses paramètres
    [Category("EcranRevue")]
    public class RevueDuJourConditionPlayModeTests
    {
        private const string P = "core_loops.flag_discipline.routine.";
        private const string Coursiers = P + "courier_scheduling.descriptor";
        private const string Facade = P + "front_shop_reconciliation.descriptor";
        private const string Lek = P + "lek_rotation.descriptor";

        [TearDown]
        public void TearDown() => I18nCatalog.Oublier();

        [Test]
        public void R9_ChaqueValeurDuDomaine_RendUnePhrase()
        {
            Assert.AreEqual(12, DailyReviewScreenController.DomaineConditions.Length, "deviation-condition.ts : 12 valeurs");
            foreach (string c in DailyReviewScreenController.DomaineConditions)
            {
                var (titre, motif) = DailyReviewScreenController.PhraseDeCondition(c, Coursiers, "n° 7");
                Assert.IsFalse(string.IsNullOrWhiteSpace(titre), $"{c} : titre vide");
                Assert.IsFalse(titre.Contains("{") || motif.Contains("{"), $"{c} : un placeholder non substitué");
                StringAssert.StartsWith("— ", motif, $"{c} : le motif porte son tiret");
            }
        }

        [Test]
        public void R9bis_LesQuatreConditionsDeProduction_PortentLeSujet()
        {
            string s = "Quai-Nord → Verrier";
            string gras = "<nobr><b>" + s + "</b></nobr>";
            Assert.AreEqual(("J’ai réacheminé la tournée " + gras, "— l’ancien trajet ne passait plus : saturé, ou coupé."),
                DailyReviewScreenController.PhraseDeCondition("route_saturated_or_severed", Coursiers, s));
            Assert.AreEqual(("J’ai replanifié la tournée " + gras, "— le trajet fait plus de détours que d’habitude."),
                DailyReviewScreenController.PhraseDeCondition("route_meandering", Coursiers, s));
            string f = "Laverie du Quai — Sarnes, îlot 12";
            string grasF = "<nobr><b>" + f + "</b></nobr>";
            Assert.AreEqual(("J’ai rapproché les comptes de " + grasF, "— la façade est épinglée pour un contrôle."),
                DailyReviewScreenController.PhraseDeCondition("audit_pinned", Facade, f));
            Assert.AreEqual(("J’ai rapproché les comptes de " + grasF,
                             "— il passe plus d’argent par la caisse que la façade ne peut en justifier."),
                DailyReviewScreenController.PhraseDeCondition("buffer_loaded", Facade, f));
        }

        [Test]
        public void R9ter_LesReplis()
        {
            var generique = DailyReviewScreenController.PhraseDe(null);
            Assert.AreEqual(generique, DailyReviewScreenController.PhraseDeCondition("baseline", Coursiers, "n° 7"));
            Assert.AreEqual(generique, DailyReviewScreenController.PhraseDeCondition("unrecorded", Facade, "X"));
            var lek = DailyReviewScreenController.PhraseDe(Lek);
            foreach (string c in new[] { "dealer_compromised", "lek_rhythm_off" })
                Assert.AreEqual(lek, DailyReviewScreenController.PhraseDeCondition(c, Lek, "îlot 14"),
                    $"{c} : aucune phrase d'atelier encore ⇒ celle du générateur");
            Assert.AreEqual(generique, DailyReviewScreenController.PhraseDeCondition("valeur_inconnue", null, "X"),
                "hors domaine et sans générateur ⇒ le repli générique");
        }

        [Test]
        public void R9quater_SurLaCarte_LeSujetDoitEtreServiPourChangerLaPhrase()
        {
            var v40 = DailyReviewScreenController.PhraseDe(Coursiers);
            var sansSujet = new FlagCardDto
            {
                descriptor = new FlagDescriptorDto { key = Coursiers },
                subject_name_i18n = new SujetRefDto(),   // ce que JsonUtility rend quand le champ manque
                deviation_condition = "",
            };
            Assert.AreEqual(v40, DailyReviewScreenController.PhraseDuBillet(sansSujet), "pile sans S5 : la phrase de v4-0");

            var sujetNonServi = new FlagCardDto
            {
                descriptor = new FlagDescriptorDto { key = Coursiers },
                subject_name_i18n = new SujetRefDto
                {
                    key = "game.fiction.route.named",
                    @params = new SujetParamsDto { depart = "Quai-Nord", arrivee = "Verrier" },
                },
                deviation_condition = "route_saturated_or_severed",
            };
            Assert.AreEqual(v40, DailyReviewScreenController.PhraseDuBillet(sujetNonServi),
                "clé du sujet absente du catalogue ⇒ v4-0, jamais « la tournée game.fiction.route.named »");

            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "game.fiction.route.named", "{depart} → {arrivee}" },
            });
            var (titre, motif) = DailyReviewScreenController.PhraseDuBillet(sujetNonServi);
            Assert.AreEqual("J’ai réacheminé la tournée <nobr><b>Quai-Nord → Verrier</b></nobr>", titre,
                "le nom du sujet, résolu avec SES paramètres (params déclarés : forme G fermée)");
            Assert.AreEqual("— l’ancien trajet ne passait plus : saturé, ou coupé.", motif);
        }
    }
}
