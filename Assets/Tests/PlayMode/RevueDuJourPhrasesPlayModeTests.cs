using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-4 — la phrase du lieutenant, indexée sur `descriptor.key` (atelier 08-revue-du-jour-phrases-et-decor.md,
    // b95dd8c7). Deux des cinq phrases (precursor_order, stash_reorder) ne peuvent PAS s'afficher aujourd'hui :
    // aucun archétype ne tient les rôles 2 ni 9, le signalement est sauté (routine-item-generation.service.ts:117).
    // Aucune capture ne peut les montrer ⇒ leur preuve est un test de la TABLE.
    //   R4      les 5 générateurs : titre non vide, sans accolade, motif qui commence par « — », titres distincts, aucun = repli
    //   R4bis   clé inconnue, absente, vide, ou motif générique du seam ⇒ le repli
    //   R4ter   les 3 phrases RATIFIÉES de v4-0, verbatim
    //   R4quater sur un billet : la phrase rendue porte le titre puis le motif en italique, et plus le découpage technique
    [Category("EcranRevue")]
    public class RevueDuJourPhrasesPlayModeTests
    {
        private const string P = "core_loops.flag_discipline.routine.";
        private static readonly string[] Generateurs =
            { "courier_scheduling", "lek_rotation", "front_shop_reconciliation", "precursor_order", "stash_reorder" };

        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        [Test]
        public void R4_ChaqueGenerateur_ASaPhrase()
        {
            var repli = DailyReviewScreenController.PhraseDe(null);
            var titres = new HashSet<string>();
            foreach (string g in Generateurs)
            {
                var (titre, motif) = DailyReviewScreenController.PhraseDe(P + g + ".descriptor");
                Assert.IsFalse(string.IsNullOrWhiteSpace(titre), $"{g} : titre vide");
                Assert.IsFalse(titre.Contains("{") || motif.Contains("{"), $"{g} : une accolade = un paramètre non résolu");
                StringAssert.StartsWith("— ", motif, $"{g} : le motif porte son tiret cadratin (c'est lui qui est en italique)");
                Assert.AreNotEqual(repli.titre, titre, $"{g} ne doit pas tomber dans le repli");
                Assert.IsTrue(titres.Add(titre), $"{g} : même titre qu'un autre générateur");
            }
        }

        [Test]
        public void R4bis_UneCleInconnue_DonneLeRepli()
        {
            var repli = DailyReviewScreenController.PhraseDe(null);
            Assert.AreEqual("J’ai suivi la routine", repli.titre);
            Assert.AreEqual("— quelque chose s’écartait de l’habitude.", repli.motif);
            foreach (string cle in new[] { "", P + "generateur_futur.descriptor",
                                           "core_loops.flag_discipline.reason.deviation_detected", P + "courier_scheduling" })
                Assert.AreEqual(repli, DailyReviewScreenController.PhraseDe(cle), $"`{cle}` n'est pas une clé de générateur connue");
        }

        [Test]
        public void R4ter_LesTroisPhrasesRatifiees_Verbatim()
        {
            Assert.AreEqual(("J’ai replanifié la tournée des coursiers", "— l’horaire habituel n’a pas été tenu."),
                DailyReviewScreenController.PhraseDe(P + "courier_scheduling.descriptor"));
            Assert.AreEqual(("J’ai fait tourner le coin de vente", "— le Lek tournait hors du rythme convenu."),
                DailyReviewScreenController.PhraseDe(P + "lek_rotation.descriptor"));
            Assert.AreEqual(("J’ai rapproché les comptes de la façade", "— la caisse déclarée s’écarte de l’habitude."),
                DailyReviewScreenController.PhraseDe(P + "front_shop_reconciliation.descriptor"));
        }

        [Test]
        public void R4quater_SurUnBillet_LaPhraseEstCelleDuGenerateur()
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            var ecran = hostGo.AddComponent<DailyReviewScreenController>();
            ecran.AppliquerRevue(new FlagReviewResponseDto
            {
                cards = new[]
                {
                    new FlagCardDto
                    {
                        flag_id = "f0", flagged_game_day = 11, trust_budget_bucket = "low",
                        descriptor = new FlagDescriptorDto { key = P + "front_shop_reconciliation.descriptor" },
                        // le motif générique du seam : la phrase ne doit PAS en dépendre
                        flag_reason = new FlagDescriptorDto { key = "core_loops.flag_discipline.reason.deviation_detected" },
                    },
                },
                routine_pending_count = 17, batch_confirm_available = true,
            });

            string rendu = ecran.DernierePhrase;
            StringAssert.StartsWith("J’ai rapproché les comptes de la façade<i>", rendu);
            StringAssert.Contains("— la caisse déclarée s’écarte de l’habitude.</color></i>", rendu);
            StringAssert.DoesNotContain("Front shop", rendu, "le découpage de la clé technique a disparu");
            StringAssert.DoesNotContain("Deviation", rendu, "le motif générique du seam n'est pas lu");
        }
    }
}
