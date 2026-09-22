using NUnit.Framework;
using UnityEngine;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-1 — le tampon « CONFIRMER LA ROUTINE » sur une journée où personne n'est au comptoir.
    //
    // Cadre v4-1, ratifié par l'user : `cards: []` et le tampon est POSÉ, avec son compte et la
    // phrase « appui long — rien d’autre ne vous attend ». Le client le retirait par une garde
    // `cards.Length > 0` plus stricte que le produit (juge-visuel r1 2026-09-06, F2 BLOQUANT).
    // Le back accepte ce lot à zéro carte : `flag-discipline.repository.ts:669-676`.
    //
    // Les corps sont posés par `AppliquerRevue`, le MÊME chemin que `LoadReview` : la garde exerce
    // ce que le joueur voit, sans consommer la pile dev.
    //   R1    file vide + feu vert du back   ⇒ tampon présent, compte en entier, phrase de v4-1
    //   R1bis file vide + pas de feu vert    ⇒ tampon absent (l'objet n'est pas sur le zinc)
    //   R1ter trois cartes + feu vert        ⇒ tampon présent, la phrase change de branche
    // R1bis est la moitié qui mord : sans elle, un tampon TOUJOURS posé passerait R1.
    [Category("EcranRevue")]
    public class RevueDuJourTamponPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private DailyReviewScreenController NouvelEcran()
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<DailyReviewScreenController>();
        }

        private static FlagReviewResponseDto Revue(int cartes, int enAttente, bool feuVert)
        {
            var liste = new FlagCardDto[cartes];
            for (int i = 0; i < cartes; i++)
                liste[i] = new FlagCardDto { flag_id = "f" + i, flagged_game_day = 11, trust_budget_bucket = "standard" };
            return new FlagReviewResponseDto
            {
                cards = liste,
                routine_pending_count = enAttente,
                batch_confirm_available = feuVert,
            };
        }

        [Test]
        public void R1_FileVide_FeuVert_LeTamponEstPoseAvecLaPhraseDeV41()
        {
            var ecran = NouvelEcran();
            ecran.AppliquerRevue(Revue(0, 9, true));

            Assert.IsTrue(ecran.RenderedEmptyState, "précondition : la file est bien vide");
            Assert.IsTrue(ecran.TamponPresent, "v4-1 : le tampon est sur le zinc même sans signalement");
            StringAssert.EndsWith("9", ecran.TamponLibelleTexte, "le compte en entier (JD-E3), celui du registre");
            Assert.AreEqual("appui long — rien d’autre ne vous attend", ecran.TamponSousTexte,
                "mot pour mot le cadre v4-1, apostrophe typographique comprise");
        }

        [Test]
        public void R1bis_FileVide_SansFeuVert_PasDeTampon()
        {
            var ecran = NouvelEcran();
            ecran.AppliquerRevue(Revue(0, 0, false));

            Assert.IsTrue(ecran.RenderedEmptyState);
            Assert.IsFalse(ecran.TamponPresent, "`batch_confirm_available: false` : rien à clore, pas de tampon");
        }

        [Test]
        public void R1ter_TroisCartes_FeuVert_LeTamponResteEtLaPhraseChangeDeBranche()
        {
            var ecran = NouvelEcran();
            ecran.AppliquerRevue(Revue(3, 17, true));

            Assert.AreEqual(3, ecran.RenderedCardCount);
            Assert.IsTrue(ecran.TamponPresent);
            StringAssert.EndsWith("17", ecran.TamponLibelleTexte);
            StringAssert.Contains("les 3 signalements restent à votre main", ecran.TamponSousTexte);
        }
    }
}
