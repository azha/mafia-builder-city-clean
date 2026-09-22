using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-6 — le registre, contre la CSS (`.registre`, `::before`, `.pt`) et les findings du juge ⊥ r1 :
    //   R6     F11 posé de travers (+0,4° z = rotate(-.4deg)) · F8 la tranche : 6px à gauche, toute la hauteur, rayée
    //          · F9 la pastille : trois disques 16/14/10, du dessous au dessus
    //   R6bis  les rayures se RÉPÈTENT : l'UV suit la hauteur (4 périodes pour 48px), la première bande part du haut
    // F10 (hauteur du registre −12,6 %) n'est PAS gardé ici : la CSS (padding 8/10) est déjà reprise, et l'écart
    // mesuré tient aux hauteurs de ligne des deux textes. Il ne se tranche qu'à la capture.
    [Category("EcranRevue")]
    public class RevueDuJourRegistrePlayModeTests
    {
        private const float K = 1280f / 300f;
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        [Test]
        public void R6_LeRegistreEstUnCahierPoseDeTravers_AvecSaTrancheEtSaPastilleCerclee()
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            var ecran = hostGo.AddComponent<DailyReviewScreenController>();
            RectTransform reg = ecran.Registre;
            Assert.IsNotNull(reg);

            Assert.AreEqual(0.4f, reg.localEulerAngles.z, 1e-3f, "F11 : rotate(-.4deg) ⇒ +0,4° en z");

            Transform tranche = reg.Find("Tranche");
            Assert.IsNotNull(tranche, "F8 : le dos du livre");
            var trt = (RectTransform)tranche;
            Assert.AreEqual(0f, trt.anchorMin.x, 1e-4f);
            Assert.AreEqual(0f, trt.anchorMax.x, 1e-4f, "collée au bord gauche");
            Assert.AreEqual(0f, trt.anchorMin.y, 1e-4f);
            Assert.AreEqual(1f, trt.anchorMax.y, 1e-4f, "toute la hauteur");
            Assert.AreEqual(6f * K, trt.offsetMax.x - trt.offsetMin.x, 1e-3f, "6px CSS");
            Assert.IsNotNull(tranche.GetComponent<RayuresVerticales>(), "des rayures, pas un aplat");
            Assert.IsNotNull(tranche.GetComponent<RawImage>().texture);

            Transform pastille = reg.Find("Pastille");
            Assert.IsNotNull(pastille);
            string[] ordre = { "Filet", "Lisere", "Point" };
            float[] diametres = { 16f, 14f, 10f };
            for (int i = 0; i < 3; i++)
            {
                Transform d = pastille.Find(ordre[i]);
                Assert.IsNotNull(d, $"F9 : {ordre[i]}");
                Assert.AreEqual(i, d.GetSiblingIndex(), $"{ordre[i]} dessiné au rang {i} (le plus grand dessous)");
                Assert.AreEqual(diametres[i] * K, ((RectTransform)d).sizeDelta.x, 1e-3f, $"{ordre[i]} : Ø {diametres[i]}px CSS");
            }
        }

        [Test]
        public void R6bis_LesRayuresSeRepetent_ElleNeSEtirentPas()
        {
            Rect uv = RayuresVerticales.UvPour(48f * K, 12f * K);
            Assert.AreEqual(4f, uv.height, 1e-4f, "48px pour une période de 12 : quatre paires de bandes");
            Assert.AreEqual(1f, uv.y + uv.height, 1e-4f, "l'origine est en HAUT : la première bande part du bord haut");
            Assert.AreEqual(2f, RayuresVerticales.UvPour(24f * K, 12f * K).height, 1e-4f, "moitié moins haut, moitié moins de bandes");
            Assert.AreEqual(0f, RayuresVerticales.UvPour(0f, 12f * K).height, 1e-4f);
        }
    }
}
