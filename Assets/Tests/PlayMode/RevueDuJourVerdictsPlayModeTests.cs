using NUnit.Framework;
using UnityEngine;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-3 — cadre v4-2 « après vos verdicts ». Les réponses du back étaient JETÉES : `validate` /
    // `dismiss` rendent `{resolved, verdict, token_returned}`, `batch-confirm` rend
    // `batch_confirmed_count` (`flag-discipline.service.ts:65-69, :311`), et rien ne changeait à
    // l'écran. Les corps sont posés par `AppliquerVerdict` / `AppliquerLotSigne`, le MÊME chemin que
    // les rappels du client : ces gardes exercent ce que le joueur voit, sans pile dev.
    //   R3      rendu    ⇒ billet atténué, « RENDU · il garde sa confiance », geste consommé ;
    //                      le billet VOISIN reste intact (la moitié qui mord un verdict appliqué à tous)
    //   R3bis   perdu    ⇒ « ✕ · PERDU · remise dans 2 jours » au jour 12 (le cadre v4-2)
    //   R3ter   la remise, table pure : 12→2, 13→demain, 14→7, inconnu→la phrase sans chiffre
    //   R3quater un re-rendu (le roster qui arrive) NE DÉFAIT PAS un verdict
    //   R3quint le lot   ⇒ « 17 ROUTINES SIGNÉES », cachet, geste consommé ; un lot de 0 ne signe rien
    //   R3sext  le papier du tampon est PLEIN (il était un simple trait teint, l'intérieur transparent)
    [Category("EcranRevue")]
    public class RevueDuJourVerdictsPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private DailyReviewScreenController NouvelEcran(int cartes, int enAttente = 17)
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            var ecran = hostGo.AddComponent<DailyReviewScreenController>();
            var liste = new FlagCardDto[cartes];
            for (int i = 0; i < cartes; i++)
                liste[i] = new FlagCardDto { flag_id = "f" + i, flagged_game_day = 11, trust_budget_bucket = "standard" };
            ecran.AppliquerRevue(new FlagReviewResponseDto
            {
                cards = liste, routine_pending_count = enAttente, batch_confirm_available = enAttente > 0,
            });
            return ecran;
        }

        private static FlagVerdictResponseDto Verdict(bool rendu) => new FlagVerdictResponseDto
        {
            resolved = true, verdict = rendu ? "validated" : "dismissed", token_returned = rendu,
        };

        [Test]
        public void R3_Rendu_LeBilletResteAttenueEtLeVoisinEstIntact()
        {
            var ecran = NouvelEcran(3);
            Assert.IsTrue(ecran.BilletGesteActif("f0"), "précondition : le geste est offert");
            Assert.AreEqual("RENDRE", ecran.BilletVerbe("f0"));

            ecran.AppliquerVerdict("f0", Verdict(rendu: true));

            Assert.AreEqual(3, ecran.RenderedCardCount, "le billet tranché RESTE sur le zinc");
            Assert.AreEqual(0.72f, ecran.BilletBulleAlpha("f0"), 1e-4f, "`.billet.fait .bulle { opacity:.72 }`");
            Assert.AreEqual("RENDU", ecran.BilletVerbe("f0"));
            Assert.AreEqual("il garde sa confiance", ecran.BilletSous("f0"));
            Assert.IsFalse(ecran.BilletGesteActif("f0"), "un second appel rendrait 409 : le geste est consommé");

            Assert.AreEqual(1f, ecran.BilletBulleAlpha("f1"), 1e-4f, "le voisin n'est pas tranché");
            Assert.AreEqual("RENDRE", ecran.BilletVerbe("f1"));
            Assert.IsTrue(ecran.BilletGesteActif("f1"));
        }

        [Test]
        public void R3bis_Perdu_AuJour12_RemiseDans2Jours()
        {
            var ecran = NouvelEcran(3);
            ecran.PoserJourCourant(12);

            ecran.AppliquerVerdict("f2", Verdict(rendu: false));

            Assert.AreEqual("✕", ecran.BilletCoche("f2"));
            Assert.AreEqual("PERDU", ecran.BilletVerbe("f2"));
            Assert.AreEqual("remise dans 2 jours", ecran.BilletSous("f2"), "le cadre v4-2, jour 12");
            Assert.IsFalse(ecran.BilletGesteActif("f2"));
        }

        [Test]
        public void R3ter_LaRemise_SeptMoinsLeJourModuloSept()
        {
            Assert.AreEqual("remise dans 2 jours", DailyReviewScreenController.TexteRemise(12));
            Assert.AreEqual("remise demain", DailyReviewScreenController.TexteRemise(13));
            Assert.AreEqual("remise dans 7 jours", DailyReviewScreenController.TexteRemise(14),
                "jour 14 ouvre une époque : la remise suivante est dans une semaine pleine");
            Assert.AreEqual("jusqu’à la remise hebdomadaire", DailyReviewScreenController.TexteRemise(null),
                "jour inconnu : pas de chiffre inventé");
        }

        [Test]
        public void R3quater_UnReRendu_NeDefaitPasUnVerdict()
        {
            var ecran = NouvelEcran(2);
            ecran.AppliquerVerdict("f1", Verdict(rendu: true));

            ecran.AppliquerRevue(ecran.LastLoadedReview); // ce que fait `LoadRoster` quand le roster arrive

            Assert.AreEqual("RENDU", ecran.BilletVerbe("f1"), "le verdict survit au re-rendu");
            Assert.IsFalse(ecran.BilletGesteActif("f1"));
            Assert.AreEqual("RENDRE", ecran.BilletVerbe("f0"));
        }

        [Test]
        public void R3quint_LeLot_SigneLeRegistre_EtUnLotDeZeroNeSigneRien()
        {
            var ecran = NouvelEcran(3);
            ecran.AppliquerLotSigne(0);
            Assert.IsFalse(ecran.TamponSigne, "un second appel idempotent (0) n'affirme aucun geste");
            Assert.IsTrue(ecran.TamponGesteActif);

            ecran.AppliquerLotSigne(17);

            Assert.IsTrue(ecran.TamponSigne, "le cachet « SIGNÉ » est posé");
            Assert.AreEqual("17 ROUTINES SIGNÉES", ecran.TamponLibelleTexte);
            Assert.AreEqual("d’un seul appui — le registre est clos pour aujourd’hui", ecran.TamponSousTexte);
            Assert.IsFalse(ecran.TamponGesteActif, "le registre est clos : le tampon ne se repose pas");
        }

        [Test]
        public void R3sext_LePapierDuTamponEstPlein()
        {
            var ecran = NouvelEcran(0, enAttente: 9);
            Texture2D tex = ecran.TamponFond.sprite.texture;
            Color centre = tex.GetPixel(tex.width / 2, tex.height / 2);
            Assert.Greater(centre.a, 0.99f,
                "le fond du tampon est une SURFACE : un contour laisse le centre transparent");
        }
    }
}
