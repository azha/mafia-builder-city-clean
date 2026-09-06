using System.Collections;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;

namespace MafiaCleanCity.Tests
{
    /// <summary>TD-615 — la falsifiable du gras RÉEL. Elle mesure QUELLE FONTE a servi au rendu.
    ///
    /// ⛔ « L'asset Bold existe » et « l'entrée 700 est peuplée » ne prouvent ni l'un ni l'autre
    /// que TMP s'en sert AU RENDU. Il fallait donc une grandeur lue APRÈS la mise en forme.
    ///
    /// ⛔⛔ ET LA GRANDEUR ÉVIDENTE EST LA MAUVAISE. Compter l'encre et exiger « le gras en a plus
    /// que le régulier » serait VERT sur le défaut qu'on vient de réparer : un gras SIMULÉ
    /// (`boldStyle = 0.75`) épaissit lui aussi le trait, donc il produit lui aussi plus d'encre.
    /// Tout seuil de ratio est satisfait par les DEUX mondes — c'est la garde qui certifie le
    /// défaut. La propriété qui les SÉPARE n'est pas la quantité d'encre : c'est l'identité de la
    /// fonte qui a fourni les glyphes, et TMP l'expose par caractère (`characterInfo[i].fontAsset`).
    /// ⇒ On asserte CELLE-LÀ, et le ratio d'encre n'est qu'IMPRIMÉ, pour la lecture humaine.</summary>
    [Category("PoliceGras")]
    public class BoldFontPlayModeTests
    {
        private const string CheminAtlas = "Assets/Fonts/DejaVuSans SDF.asset";

        [UnityTest]
        public IEnumerator TD615_LeGrasEstServiParUneVraieFonteBold_PasParLaSimulation()
        {
            TMP_FontAsset regulier = ChargerAtlas();
            Assert.IsNotNull(regulier, $"atlas introuvable : {CheminAtlas}");

            // 1) la table de graisse porte une fonte à l'entrée 700 (100..900 par pas de 100)
            Assert.IsNotNull(regulier.fontWeightTable, "table de graisse absente");
            Assert.Greater(regulier.fontWeightTable.Length, 7, "table de graisse trop courte");
            TMP_FontAsset bold = regulier.fontWeightTable[7].regularTypeface;
            Assert.IsNotNull(bold,
                "⛔ entrée 700 VIDE : TMP SIMULERAIT le gras au lieu de le dessiner. C'est TD-615, " +
                "et ce test existe pour qu'il ne revienne pas en silence.");
            Assert.AreNotSame(regulier, bold,
                "⛔ l'entrée 700 pointe l'atlas RÉGULIER — ce n'est pas une Bold, c'est un alias.");

            // 2) et surtout : au RENDU, ce sont les glyphes de CETTE fonte qui servent.
            var racine = new GameObject("SondeGras", typeof(Canvas));
            racine.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var tmp = new GameObject("t").AddComponent<TextMeshProUGUI>();
            tmp.transform.SetParent(racine.transform, false);
            tmp.font = regulier;
            tmp.fontSize = 72;
            tmp.rectTransform.sizeDelta = new Vector2(900, 160);

            (int visibles, TMP_FontAsset servante, float encre) Mesurer(FontStyles style)
            {
                tmp.fontStyle = style;
                tmp.text = "LA FILIERE";           // ASCII : aucun glyphe ne peut manquer d'une des deux faces
                tmp.ForceMeshUpdate();
                var info = tmp.textInfo;
                int vis = 0; float aire = 0f; TMP_FontAsset f = null;
                for (int i = 0; i < info.characterCount; i++)
                {
                    var ci = info.characterInfo[i];
                    if (!ci.isVisible) continue;
                    vis++;
                    f = f ?? ci.fontAsset;
                    aire += Mathf.Abs((ci.topRight.x - ci.bottomLeft.x) * (ci.topRight.y - ci.bottomLeft.y));
                }
                return (vis, f, aire);
            }

            var g = Mesurer(FontStyles.Bold);
            var r = Mesurer(FontStyles.Normal);
            yield return null;

            // Plancher anti-vacuité AVANT toute comparaison : un texte non rendu rend 0 visible,
            // et 0 == 0 satisferait n'importe quelle égalité de fonte.
            Assert.Greater(g.visibles, 4, $"⛔ rendu GRAS quasi vide ({g.visibles} glyphes visibles) — mesure sans valeur");
            Assert.Greater(r.visibles, 4, $"⛔ rendu RÉGULIER quasi vide ({r.visibles} glyphes visibles) — mesure sans valeur");

            Assert.AreSame(bold, g.servante,
                $"⛔ le texte GRAS a été servi par « {(g.servante == null ? "null" : g.servante.name)} » " +
                $"et non par « {bold.name} » : TMP simule encore.");
            Assert.AreSame(regulier, r.servante,
                $"⛔ le texte RÉGULIER a été servi par « {(r.servante == null ? "null" : r.servante.name)} » " +
                $"au lieu de l'atlas régulier — la table de graisse déborde sur le poids 400.");

            Debug.Log($"[TD615] gras servi par « {g.servante.name} » ({g.visibles} glyphes, aire {g.encre:F0}) · " +
                      $"régulier par « {r.servante.name} » ({r.visibles} glyphes, aire {r.encre:F0}) · " +
                      $"ratio d'aire {(r.encre <= 0 ? 0 : g.encre / r.encre):F4} — IMPRIMÉ, jamais asserté : " +
                      "un gras simulé franchirait n'importe quel seuil de ratio.");
            Object.DestroyImmediate(racine);
        }

        private static TMP_FontAsset ChargerAtlas()
        {
#if UNITY_EDITOR
            return UnityEditor.AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(CheminAtlas);
#else
            return null;
#endif
        }
    }
}
