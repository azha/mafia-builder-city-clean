using System.Collections;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Theme.Tests
{
    /// <summary>TD-615 — LE GRAS EST-IL RÉEL ? Et la seule question qui le dise.
    ///
    /// ⛔ CE QUE CETTE GARDE NE DEMANDE PAS : « existe-t-il un asset gras ? ». Une session voisine
    /// a payé exactement ça la même nuit — un asset Bold PRÉSENT dans le projet, référencé, et qui
    /// ne servait AUCUN glyphe parce que son atlas n'était pas persisté. *Une garde sur la
    /// PRÉSENCE d'un dispositif n'est pas une garde sur son EFFET*, et c'est la même famille que le
    /// halo de titre dont les trois paramètres étaient vrais pendant qu'il ne produisait aucun
    /// pixel.
    /// ⇒ La question qui discrimine : **de quel asset vient CHAQUE GLYPHE d'un texte gras RENDU ?**
    ///   TextMeshPro écrit la réponse dans `characterInfo[i].fontAsset` après composition. Si le
    ///   gras est simulé, elle rend l'asset Regular — la même que sans `Bold`. Si la table de
    ///   graisse est branchée et l'atlas peuplé, elle rend l'asset Bold.
    /// ⚠️ Et le CONTRÔLE qui rend l'assertion probante est dans le test : le MÊME texte, SANS
    ///   `FontStyles.Bold`, doit rendre l'asset Regular. Sans lui, une garde qui verrait « asset
    ///   Bold » partout — par exemple si la police assignée était déjà la Bold — passerait pour une
    ///   preuve alors qu'elle ne mesurerait rien.</summary>
    [Category("Graisses")]
    public class GraissesReellesPlayModeTests
    {
        private GameObject canvasGo;

        [TearDown]
        public void Apres() { if (canvasGo != null) Object.DestroyImmediate(canvasGo); }

        [UnityTest]
        public IEnumerator TD615_UnTexteGras_TireSesGlyphesDeLaFonteGrasse()
        {
            canvasGo = new GameObject("CanvasGraisses", typeof(Canvas));
            canvasGo.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;

            foreach (var cas in new[]
            {
                new { nom = "sans-sérif", police = DesignTokens.Current.primaryFont },
                new { nom = "sérif",      police = DesignTokens.Current.hudSerifFont },
            })
            {
                Assert.IsNotNull(cas.police, $"la fonte {cas.nom} doit être chargée");
                TMP_FontAsset attenduGras = cas.police.fontWeightTable != null
                                            && cas.police.fontWeightTable.Length > 7
                    ? cas.police.fontWeightTable[7].regularTypeface
                    : null;
                Assert.IsNotNull(attenduGras,
                    $"[{cas.nom}] la table de graisse ne porte AUCUNE fonte au poids 700 : les " +
                    "demandes de gras seront simulées par dilatation du contour, ce qui ressemble à " +
                    "du gras et n'en est pas (TD-615)");

                var go = new GameObject($"Texte_{cas.nom}", typeof(RectTransform));
                go.transform.SetParent(canvasGo.transform, false);
                var t = go.AddComponent<TextMeshProUGUI>();
                t.font = cas.police;
                t.fontSize = 40;
                t.text = "ABÉGÎOÙ 0123";

                // (1) LE CONTRÔLE, D'ABORD : sans `Bold`, les glyphes viennent du Regular.
                t.fontStyle = FontStyles.Normal;
                t.ForceMeshUpdate();
                yield return null;
                int normalDepuisRegular = CompterDepuis(t, cas.police);
                int normalTotal = CompterVisibles(t);

                // (2) LA MESURE : avec `Bold`, ils doivent venir de la fonte GRASSE.
                t.fontStyle = FontStyles.Bold;
                t.ForceMeshUpdate();
                yield return null;
                int grasDepuisGras = CompterDepuis(t, attenduGras);
                int grasTotal = CompterVisibles(t);

                Debug.Log($"[TD-615] {cas.nom} · normal : {normalDepuisRegular}/{normalTotal} glyphes " +
                          $"depuis « {cas.police.name} » · gras : {grasDepuisGras}/{grasTotal} depuis " +
                          $"« {attenduGras.name} »");

                Assert.Greater(normalTotal, 5,
                    $"[{cas.nom}] anti-vacuité : le texte témoin doit composer des glyphes");
                Assert.AreEqual(normalTotal, normalDepuisRegular,
                    $"[{cas.nom}] CONTRÔLE : sans `Bold`, les glyphes devraient tous venir du " +
                    "Regular — s'ils viennent d'ailleurs, la mesure qui suit ne discrimine rien");
                Assert.AreEqual(grasTotal, grasDepuisGras,
                    $"[{cas.nom}] {grasTotal - grasDepuisGras} glyphes sur {grasTotal} d'un texte " +
                    $"GRAS ne viennent pas de « {attenduGras.name} » : le gras est encore SIMULÉ " +
                    "par dilatation, ou l'atlas de la fonte grasse est vide (TD-615)");

                Object.DestroyImmediate(go);
            }
        }

        private static int CompterVisibles(TMP_Text t)
        {
            int n = 0;
            for (int i = 0; i < t.textInfo.characterCount; i++)
                if (t.textInfo.characterInfo[i].isVisible) n++;
            return n;
        }

        private static int CompterDepuis(TMP_Text t, TMP_FontAsset attendu)
        {
            int n = 0;
            for (int i = 0; i < t.textInfo.characterCount; i++)
            {
                var c = t.textInfo.characterInfo[i];
                if (c.isVisible && c.fontAsset == attendu) n++;
            }
            return n;
        }
    }
}
