using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-5 — qui parle : chaque billet porte le buste des lieutenants (`ui_element_buste_lieutenant`), le même que
    // ⑥ et ①, dans un médaillon carré arrondi masqué (`.billet .medl`). Avant : un disque procédural sans aucun
    // buste. Arbitrage : un seul buste pour tout lieutenant ; le Don garde le sien (atelier 09-…, d2bf698b).
    //   R5     chaque billet a un buste, et c'est CE sprite (chargé par son chemin Resources), blanc, masqué
    //   R5bis  trois lieutenants différents ⇒ le même buste ; jamais celui du Don
    [Category("EcranRevue")]
    public class RevueDuJourBustePlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private DailyReviewScreenController NouvelEcran(int cartes)
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            var ecran = hostGo.AddComponent<DailyReviewScreenController>();
            var liste = new FlagCardDto[cartes];
            for (int i = 0; i < cartes; i++)
                liste[i] = new FlagCardDto
                {
                    flag_id = "f" + i, flagged_game_day = 11, trust_budget_bucket = "high",
                    lieutenant = new LieutenantRefDto { id = "lt-" + i, name = "Lt. " + i },
                };
            ecran.AppliquerRevue(new FlagReviewResponseDto
            {
                cards = liste, routine_pending_count = 17, batch_confirm_available = true,
            });
            return ecran;
        }

        [Test]
        public void R5_ChaqueBillet_PorteLeBusteDesLieutenants()
        {
            Sprite attendu = Resources.Load<Sprite>(DailyReviewScreenController.BusteLieutenant);
            Assert.IsNotNull(attendu, $"`Resources/{DailyReviewScreenController.BusteLieutenant}` se charge");

            var ecran = NouvelEcran(1);
            Image buste = ecran.BilletBuste("f0");
            Assert.IsNotNull(buste, "le billet porte un buste (avant ⑯-5 : un disque sans silhouette)");
            Assert.AreSame(attendu, buste.sprite, "le buste des lieutenants, pas un autre dessin");
            Assert.AreEqual(Color.white, buste.color, "`#cfc4a6` est cuit dans le PNG : aucune teinte en plus");
            Mask masque = buste.transform.parent.GetComponent<Mask>();
            Assert.IsNotNull(masque, "`.medl{overflow:hidden}` : le médaillon masque ses épaules");
        }

        [Test]
        public void R5bis_TroisLieutenants_UnSeulBuste_JamaisCeluiDuDon()
        {
            Sprite don = Resources.Load<Sprite>("Lieutenant/ui_element_buste_don");
            var ecran = NouvelEcran(3);
            Sprite premier = ecran.BilletBuste("f0").sprite;
            for (int i = 0; i < 3; i++)
            {
                Sprite s = ecran.BilletBuste("f" + i).sprite;
                Assert.AreSame(premier, s, $"billet f{i} : même buste pour tout lieutenant");
                Assert.AreNotSame(don, s, $"billet f{i} : la silhouette du Don est réservée au joueur");
            }
        }
    }
}
