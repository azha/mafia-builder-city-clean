using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-2 — le décor du bar (juge r1 B1 BLOQUANT : 57 % du rect libre en noir pur). Gardes de STRUCTURE et de SOURCE :
    //   R11     MONTÉ : `Resources/Scenes/sprite_environment_bar_nuit` se charge (1080×1350) et la scène de ⑨ porte CETTE
    //           texture ; le décor est le premier enfant de la racine, hors mise en page, scène sous le zinc
    //   R11bis  le zinc suit la file : 66 % quand on attend, 52 % quand personne (`.zinc.haut` / `.zinc.haut.vide`)
    //   R11ter  la découpe « cover » du bar ENTIER en portrait 1080×2400 : une bande de 607,5 px au centre, toute la
    //           hauteur — la fenêtre annoncée par l'atelier (« 607 px de large dans la source »)
    [Category("EcranFile")]
    public class ExceptionsDecorPlayModeTests
    {
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static ExceptionCardDto Carte(string id) => new ExceptionCardDto
        {
            exception_id = id, severity_band = "SEVERE", priority_band = "critical", confidence_band = "likely",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private void NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);
        }

        [Test]
        public void R11_LeBarEstMonteEtPoseSousLeComptoir()
        {
            Sprite sp = Resources.Load<Sprite>(ExceptionQueueController.CheminBar);
            Assert.IsNotNull(sp, $"`Resources/{ExceptionQueueController.CheminBar}` doit se charger (asset importé)");
            Assert.AreEqual(1080, sp.texture.width);
            Assert.AreEqual(1350, sp.texture.height);

            NouvelEcran(Carte("a"), Carte("b"));
            DecorAuComptoir decor = ecran.Decor;
            Assert.IsNotNull(decor);
            Assert.AreSame(sp.texture, decor.Scene.texture, "la scène de ⑨ porte CE fond");
            Assert.AreEqual(0, decor.transform.GetSiblingIndex(), "premier enfant de la racine : dessiné sous le comptoir");
            LayoutElement le = decor.GetComponent<LayoutElement>();
            Assert.IsTrue(le != null && le.ignoreLayout);
            Assert.Less(decor.Scene.transform.GetSiblingIndex(), decor.Zinc.GetSiblingIndex(), "la scène sous le zinc");
        }

        [Test]
        public void R11bis_LeZincSuitLaFile()
        {
            NouvelEcran(Carte("a"));
            Assert.AreEqual(ExceptionQueueController.ZincFile, ecran.Decor.Zinc.anchorMax.y, 1e-4f, "`.zinc.haut{height:66%}`");
            ecran.RendrePourTest(new ExceptionCardDto[0]);
            Assert.AreEqual(ExceptionQueueController.ZincVide, ecran.Decor.Zinc.anchorMax.y, 1e-4f, "`.zinc.haut.vide{height:52%}`");
        }

        [Test]
        public void R11ter_LaDecoupeCover_DuBarEntier()
        {
            Rect uv = DecorAuComptoir.UvCouverture(1080f, 2400f, ExceptionQueueController.ParametresFile());
            Assert.AreEqual(607.5f / 1080f, uv.width, 1e-4f, "1350 × 0,45 = 607,5 px de source visibles en largeur");
            Assert.AreEqual((1080f - 607.5f) / 2f / 1080f, uv.x, 1e-4f, "centrés");
            Assert.AreEqual(0f, uv.y, 1e-4f);
            Assert.AreEqual(1f, uv.height, 1e-4f, "toute la hauteur du bar");
        }
    }
}
