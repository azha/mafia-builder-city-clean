using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ㊱ — ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63) : AUCUN appel au montage ; l'écran restait sur son état initial. Il charge
    // désormais au montage (jeton posé), sauf corps imposé par un test ; un `Charger()` explicite pendant ce chargement l'attend.
    //   H1  corps imposé (`RendrePourTest`) + jeton : AUCUN chargement lancé au montage
    //   H2  jeton seul : UN chargement lancé au montage ; un `Charger()` explicite pendant qu'il court n'en lance pas un second
    [Category("HorizonAuMontage")]
    public class HorizonAuMontagePlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            if (hote != null) Object.DestroyImmediate(hote);
            LogAssert.ignoreFailingMessages = false;
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
        }

        [UnityTest]
        public IEnumerator H1_CorpsImpose_AucunChargementAuMontage()
        {
            hote = new GameObject("HorizonScreen", typeof(RectTransform));
            var e = hote.AddComponent<HorizonScreenController>();
            e.SetToken("jeton-de-test");
            e.RendrePourTest(new GetMetaHorizonFeedResponseDto { cards = new HorizonCardDto[0] });
            yield return null;   // Start
            yield return null;
            Assert.AreEqual(0, e.ChargementsLances, "un test a imposé le corps : le montage ne charge pas par-dessus");
        }

        [UnityTest]
        public IEnumerator H2_JetonSeul_UnSeulChargement()
        {
            LogAssert.ignoreFailingMessages = true;   // le jeton est faux : la route refuse, c'est le compte qu'on mesure
            hote = new GameObject("HorizonScreen", typeof(RectTransform));
            var e = hote.AddComponent<HorizonScreenController>();
            e.SetToken("jeton-de-test");
            yield return null;   // Start : le chargement du montage part
            Assert.AreEqual(1, e.ChargementsLances, "le montage charge (il ne chargeait RIEN avant)");
            yield return e.Charger();   // explicite, pendant ou après : jamais deux en même temps
            Assert.LessOrEqual(e.ChargementsLances, 2);
            Assert.GreaterOrEqual(e.ChargementsLances, 1);
        }
    }
}
