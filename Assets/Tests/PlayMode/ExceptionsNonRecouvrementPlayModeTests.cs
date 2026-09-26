using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨/⑩ — GARDE GÉOMÉTRIQUE DE NON-RECOUVREMENT (§G de la passe UX, planches A1/A2 de 1fba6954 ; f2 26/09). Hors réseau.
    //   N1  ⑨ avec la réplique SERVIE longue (T1, 4 lignes) : aucun texte du comptoir n'en recouvre un autre, aucun n'est tronqué
    //       (cause mesurée : comptoir de hauteur figée ⇒ enfants comprimés sous leur taille)
    //   N2  ⑩ : dans une bulle étirée, les pastilles gardent LEUR hauteur (cause : childForceExpandHeight par défaut ⇒ flexibles)
    [Category("EcranFile")]
    public class ExceptionsNonRecouvrementPlayModeTests
    {
        private GameObject hostGo, canvasGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            if (ecran != null && ecran.LastNavGameObject != null) Object.DestroyImmediate(ecran.LastNavGameObject);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            if (canvasGo != null) Object.DestroyImmediate(canvasGo);
            var c = Object.FindFirstObjectByType<Canvas>();
            if (c != null) Object.DestroyImmediate(c.gameObject);
        }

        private const string T1 = "Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement).";

        private static ExceptionCardDto CartePreparee() => new ExceptionCardDto
        {
            exception_id = "ee5e4798-a892-441a-9066-44574ed4bd6a",
            lieutenant_id = "lt-tull",
            lieutenant = new ExceptionLieutenantDto { id = "lt-tull", name = "Lt. Tull" },
            event_descriptor = T1,
            candidate_actions = new[] { new CandidateActionDto { id = "ack", label = "Prendre acte de l'état du labo", method = "ACKNOWLEDGE", effect = new ExceptionEffectDto() } },
            suggested_action = new CandidateActionDto { id = "ack", label = "Prendre acte de l'état du labo", method = "ACKNOWLEDGE", effect = new ExceptionEffectDto() },
            confidence_band = "confident", priority_band = "watch", severity_band = "LOW", resolution_status = "pending",
        };

        private static void MiseEnPage(Transform racine)
        {
            Canvas.ForceUpdateCanvases();
            foreach (var g in racine.GetComponentsInChildren<LayoutGroup>(true).Reverse())
                LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)g.transform);
            foreach (var f in racine.GetComponentsInChildren<ContentSizeFitter>(true))
                LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)f.transform);
            Canvas.ForceUpdateCanvases();
        }

        /// <summary>Le rectangle MONDE du texte RENDU (ses glyphes), pas de son rect.</summary>
        private static Rect RectDuTexte(TextMeshProUGUI t)
        {
            t.ForceMeshUpdate();
            Bounds b = t.textBounds;
            Vector3 a = t.rectTransform.TransformPoint(b.min), z = t.rectTransform.TransformPoint(b.max);
            return Rect.MinMaxRect(Mathf.Min(a.x, z.x), Mathf.Min(a.y, z.y), Mathf.Max(a.x, z.x), Mathf.Max(a.y, z.y));
        }

        [UnityTest]
        public IEnumerator N1_LaFile_AucunTexteNEnRecouvreUnAutre()
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(new[] { CartePreparee() });   // même frame : pas de Boot réseau
            ecran.ClientPourTest.SubstitutFilePourTest = () => new[] { CartePreparee() };   // un rechargement rend la même carte
            yield return null;
            // ⛔ LE COMPTOIR DE CET ÉCRAN-CI — mesuré au créneau du 26/09 : `FindFirstObjectByType<Canvas>()` rendait le Canvas d'un test
            //    PRÉCÉDENT de la catégorie (deux attendants « La ville »), et la garde mesurait le comptoir d'un autre.
            Assert.IsNotNull(ecran.ParlePourTest, "⑨ n'a pas de rangée .parle");
            Transform comptoir = ecran.ParlePourTest.transform.parent;
            Assert.AreEqual("Comptoir", comptoir.name);
            MiseEnPage(comptoir);

            var textes = comptoir.GetComponentsInChildren<TextMeshProUGUI>(false)
                .Where(t => t.isActiveAndEnabled && !string.IsNullOrWhiteSpace(t.text)).ToList();
            Assert.Greater(textes.Count, 5, "le comptoir n'a pas rendu ce qu'on croit mesurer : " + string.Join(" | ", textes.Select(t => t.name)));
            Assert.IsTrue(textes.Any(t => t.text.Contains("solvant")), $"la réplique longue n'est pas rendue — {ecran.Cards.Length} carte(s) ; "
                + "textes : " + string.Join(" | ", textes.Select(t => t.name + "=" + t.text)));
            var tronques = textes.Where(t => { t.ForceMeshUpdate(); return t.isTextTruncated; }).Select(t => t.name).ToList();
            Assert.IsEmpty(tronques, "texte tronqué : " + string.Join(", ", tronques));

            var rects = textes.Select(t => (t, r: RectDuTexte(t))).Where(x => x.r.width > 0.5f && x.r.height > 0.5f).ToList();
            var recouvrements = new List<string>();
            const float tolerance = 1f;
            for (int i = 0; i < rects.Count; i++)
                for (int j = i + 1; j < rects.Count; j++)
                {
                    Rect a = rects[i].r, b = rects[j].r;
                    float dx = Mathf.Min(a.xMax, b.xMax) - Mathf.Max(a.xMin, b.xMin);
                    float dy = Mathf.Min(a.yMax, b.yMax) - Mathf.Max(a.yMin, b.yMin);
                    if (dx > tolerance && dy > tolerance)
                        recouvrements.Add($"« {rects[i].t.name}:{rects[i].t.text} » ∩ « {rects[j].t.name}:{rects[j].t.text} » ({dx:0}×{dy:0})");
                }
            Assert.IsEmpty(recouvrements, "textes qui se recouvrent :\n" + string.Join("\n", recouvrements));
        }

        [UnityTest]
        public IEnumerator N2_LesPastilles_GardentLeurHauteur_DansUneBulleEtiree()
        {
            canvasGo = new GameObject("Canvas", typeof(RectTransform), typeof(Canvas));
            var parent = (RectTransform)new GameObject("Corps", typeof(RectTransform)).transform;
            parent.SetParent(canvasGo.transform, false);
            parent.sizeDelta = new Vector2(600f, 900f);   // une bulle étirée, comme ⑩
            var parleur = new ParleurAuComptoir(v => v, v => Mathf.RoundToInt(v), (t, s) => { });
            RectTransform rangee = parleur.ConstruireRangee(parent, 10f);
            rangee.anchorMin = Vector2.zero; rangee.anchorMax = Vector2.one; rangee.offsetMin = rangee.offsetMax = Vector2.zero;
            parleur.Construire(rangee, CartePreparee(), "cuisinier", "« Patron — cuisson du soir bloquée. »", "LÉGÈRE", "À SURVEILLER", "IL EST SÛR");
            yield return null;
            MiseEnPage(parent);
            foreach (string nom in new[] { "Gravite", "Priorite", "Confiance" })
            {
                var p = (RectTransform)parent.GetComponentsInChildren<Transform>(true).First(x => x.name == nom);
                float voulu = LayoutUtility.GetPreferredHeight(p);
                Assert.LessOrEqual(p.rect.height, voulu + 1f, $"{nom} : {p.rect.height:0} pour {voulu:0} voulus — étirée");
            }
        }
    }
}
