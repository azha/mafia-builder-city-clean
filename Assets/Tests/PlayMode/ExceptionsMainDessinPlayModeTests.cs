using System.Collections.Generic;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑩-1c — les cartes au dessin du cadre 15 (écart D05 : glyphes et coins arrondis manquaient). Garde de STRUCTURE :
    //   R20  l'éventail porté par la FACE (le créneau reste à la mise en page) : ♠ risquée tournée à −5° CSS (z > 0 en Unity) et
    //        descendue, ♦ suggérée droite et LEVÉE, ♣ apprendre à +5° (z < 0) et descendue ; face masquée (coins de 9), bord et
    //        filet intérieur ; encre bordeaux sur la claire, braise sur les sombres ; les cartes du talon déplié sans glyphe
    [Category("EcranFile")]
    public class ExceptionsMainDessinPlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static CandidateActionDto A(string id, string method, string dsl = null) =>
            new CandidateActionDto { id = id, label = id, method = method, add_rule_dsl = dsl };

        private static ExceptionCardDto Raid() => new ExceptionCardDto
        {
            exception_id = "raid", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "They turned the building over last night.",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "confident",
            candidate_actions = new[]
            {
                A("bribe", "BRIBE"), A("repair", "REPAIR"), A("teach", "ONE_TIME", "WHEN raid THEN repair"), A("lay_low", "LAY_LOW"),
            },
            suggested_action = A("repair", "REPAIR"),
        };

        private static Transform Face(ExceptionDetailController d, string id)
        {
            foreach (var c in d.CartesPourTest)
                if (!c.Escalade && c.Action != null && c.Action.id == id) return c.Bouton.transform.Find("Face");
            return null;
        }

        [Test]
        public void R20_LEventail_LesGlyphes_LesCoins()
        {
            var go = new GameObject("Nav_ExceptionDetail");
            montes.Add(go);
            var d = go.AddComponent<ExceptionDetailController>();
            d.Init(Raid(), "t", null, onBack: () => { });

            Transform risquee = Face(d, "bribe"), suggeree = Face(d, "repair"), apprendre = Face(d, "teach");
            Assert.IsNotNull(risquee); Assert.IsNotNull(suggeree); Assert.IsNotNull(apprendre);

            Assert.AreEqual("♠", risquee.Find("Glyphe").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("♦", suggeree.Find("Glyphe").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("♣", apprendre.Find("Glyphe").GetComponent<TextMeshProUGUI>().text);

            Assert.Greater(Mathf.DeltaAngle(0f, risquee.localEulerAngles.z), 0f, "`rotate(-5deg)` : à gauche, z > 0 en Unity");
            Assert.AreEqual(0f, Mathf.DeltaAngle(0f, suggeree.localEulerAngles.z), 1e-3f, "la suggérée est droite");
            Assert.Less(Mathf.DeltaAngle(0f, apprendre.localEulerAngles.z), 0f, "`rotate(5deg)` : à droite, z < 0");
            Assert.Greater(((RectTransform)suggeree).anchoredPosition.y, 0f, "`translateY(-8px)` : levée");
            Assert.Less(((RectTransform)risquee).anchoredPosition.y, 0f, "`translateY(6px)` : descendue");
            Assert.Less(((RectTransform)apprendre).anchoredPosition.y, 0f);

            foreach (Transform f in new[] { risquee, suggeree, apprendre })
            {
                Assert.IsNotNull(f.GetComponent<Mask>(), $"{f.parent.name} : coins arrondis (masque)");
                Assert.IsNotNull(f.Find("Bord"));
                Assert.IsNotNull(f.Find("FiletInterieur"));
                Assert.IsTrue(f.Find("Glyphe").GetComponent<LayoutElement>().ignoreLayout, "`.s{position:absolute}`");
            }
            Color braise = MafiaCleanCity.Theme.DesignTokens.Current.hudGaugeArcHot;
            Assert.AreEqual(braise, risquee.Find("Role").GetComponent<TextMeshProUGUI>().color, "`.carte.sombre .l{color:var(--braise)}`");
            Color bordeaux; ColorUtility.TryParseHtmlString("#93402c", out bordeaux);
            Assert.AreEqual(bordeaux, suggeree.Find("Role").GetComponent<TextMeshProUGUI>().color, "`.carte .l{color:#93402c}`");

            Assert.IsNotNull(d.TalonPourTest);
            d.TalonPourTest.onClick.Invoke();
            Transform auTalon = Face(d, "lay_low");
            Assert.IsNotNull(auTalon, "`lay_low` au talon déplié");
            Assert.IsNull(auTalon.Find("Glyphe"), "le talon déplié ne porte pas de glyphe (la maquette n'en dessine pas)");
            Assert.AreEqual(0f, Mathf.DeltaAngle(0f, auTalon.localEulerAngles.z), 1e-3f, "ni tournée");
        }
    }
}
