using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-7 — le décor du Verge d'Or (juge ⊥ r1 F1 BLOQUANT : 92,3 % de noir pur là où la maquette a le bar).
    // Gardes STRUCTURELLES et de SOURCE, aucune sur les pixels : elles tiennent à toute résolution.
    //   R7      le décor est SOUS le comptoir (premier enfant, hors mise en page) : scène, dégradé, zinc
    //   R7bis   le zinc suit l'état : 64 % avec des billets (`.zinc.revue`), 66 % et tabourets sur v4-1 (`.zinc.haut`)
    //   R7ter   la découpe « cover » de la boîte de v4-0, en portrait 1080×2400 : la fenêtre x 670,5–1129,5 de
    //           la source, toute la hauteur de la boîte — la fenêtre que l'atelier a simulée (x 671–1130) ;
    //           et en paysage : toute la largeur, posée à 22 % en hauteur
    //   R7quater MONTÉ : le fond se charge par son chemin `Resources` et la scène le porte, en 1728×1080.
    //           Rouge tant que l'asset n'est pas importé : c'est la preuve qu'il a un consommateur joignable.
    [Category("EcranRevue")]
    public class RevueDuJourDecorPlayModeTests
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
                liste[i] = new FlagCardDto { flag_id = "f" + i, flagged_game_day = 11, trust_budget_bucket = "high" };
            ecran.AppliquerRevue(new FlagReviewResponseDto
            {
                cards = liste, routine_pending_count = 9, batch_confirm_available = true,
            });
            return ecran;
        }

        [Test]
        public void R7_LeDecorEstSousLeComptoir()
        {
            var ecran = NouvelEcran(3);
            RevueDuJourDecor decor = ecran.Decor;
            Assert.IsNotNull(decor, "le décor est posé");
            Assert.AreSame(ecran.transform, decor.transform.parent);
            Assert.AreEqual(0, decor.transform.GetSiblingIndex(), "premier enfant = dessiné SOUS tout le comptoir");
            LayoutElement le = decor.GetComponent<LayoutElement>();
            Assert.IsTrue(le != null && le.ignoreLayout, "hors de la mise en page du comptoir");
            Assert.IsNotNull(decor.Scene, "la scène");
            Assert.IsNotNull(decor.transform.Find("Degrade"), "le dégradé");
            Assert.IsNotNull(decor.Zinc, "le zinc");
            Assert.Less(decor.Scene.transform.GetSiblingIndex(), decor.Zinc.GetSiblingIndex(), "la scène sous le zinc");
        }

        [Test]
        public void R7bis_LeZincSuitLEtat_EtLesTabouretsNeViennentQueSurV41()
        {
            var ecran = NouvelEcran(3);
            Assert.AreEqual(0.64f, ecran.Decor.Zinc.anchorMax.y, 1e-4f, "`.zinc.revue{height:64%}`");
            Assert.IsFalse(ecran.TabouretsPresents, "des billets : pas de tabourets vides");

            ecran.AppliquerRevue(new FlagReviewResponseDto
            {
                cards = new FlagCardDto[0], routine_pending_count = 9, batch_confirm_available = true,
            });
            Assert.AreEqual(0.66f, ecran.Decor.Zinc.anchorMax.y, 1e-4f, "`.zinc.haut{height:66%}`");
            Assert.IsTrue(ecran.Decor.Vide);
            Assert.IsTrue(ecran.TabouretsPresents, "v4-1 : trois tabourets vides au comptoir");
        }

        [Test]
        public void R7ter_LaDecoupeCover_EstLaFenetreDeLAtelier()
        {
            Rect portrait = RevueDuJourDecor.UvCouverture(1080f, 2400f);
            Assert.AreEqual(670.5f / 1728f, portrait.x, 1e-4f, "bord gauche de la fenêtre : x 670,5 de la source");
            Assert.AreEqual(459f / 1728f, portrait.width, 1e-4f, "largeur visible : 1020 × 0,45 = 459 px de source");
            Assert.AreEqual(0f, portrait.y, 1e-4f, "le bas de la boîte est le bas de la source (y 1080)");
            Assert.AreEqual(1020f / 1080f, portrait.height, 1e-4f, "toute la hauteur de la boîte");

            Rect paysage = RevueDuJourDecor.UvCouverture(2000f, 1000f);
            Assert.AreEqual(300f / 1728f, paysage.x, 1e-4f, "toute la largeur de la boîte");
            Assert.AreEqual(1200f / 1728f, paysage.width, 1e-4f);
            float y0 = 60f + (1020f - 600f) * 0.22f;
            Assert.AreEqual(1f - (y0 + 600f) / 1080f, paysage.y, 1e-4f, "`background-position` y 22 %");
        }

        [Test]
        public void R7quater_LeFondEstMonte_SonCheminResourcesSeCharge()
        {
            Sprite sp = Resources.Load<Sprite>(RevueDuJourDecor.CheminScene);
            Assert.IsNotNull(sp, $"`Resources/{RevueDuJourDecor.CheminScene}` doit se charger (asset importé)");
            Assert.AreEqual(1728, sp.texture.width);
            Assert.AreEqual(1080, sp.texture.height);

            var ecran = NouvelEcran(1);
            Assert.AreSame(sp.texture, ecran.Decor.Scene.texture, "la scène de l'écran porte CE fond");
        }
    }
}
