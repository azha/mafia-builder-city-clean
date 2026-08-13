using NUnit.Framework;
using UnityEngine;
using TMPro;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Theme.Tests
{
    // W4.P4a/C6 — preuve du plancher F1 : la fonte partagée rend du non-Latin SANS tomber sur
    // le glyphe manquant (.notdef). §1.4b du design : les 9 écrans résolvaient leur fonte via
    // une ressource système raster intégrée, Latin-only — le plancher était à zéro. DejaVu
    // Sans (primaryFont) couvre Cyrillic/Greek/Armenian nativement.
    [Category("W4P4a")]
    public class NonLatinFontCoveragePlayModeTests
    {
        // Chaîne russe ("Bonjour le monde") — script non-Latin représentatif d'une locale i18n
        // réelle (F1, REUSE ch19 unicode coverage).
        private const string CyrillicSample = "Привет, мир";

        [Test]
        public void PrimaryFont_CoversCyrillicSample_NoMissingGlyph()
        {
            var font = DesignTokens.Current.primaryFont;
            Assert.IsNotNull(font, "DesignTokens.Current.primaryFont est null — le seam C3 ne livre pas la fonte.");

            foreach (char c in CyrillicSample)
            {
                if (char.IsWhiteSpace(c) || c == ',') continue; // ponctuation/espace : jamais résolus en .notdef, pas informatif
                bool covered = font.HasCharacter(c, tryAddCharacter: true);
                Assert.IsTrue(covered, $"Caractère U+{(int)c:X4} ('{c}') absent de la fonte primaire — rendrait .notdef.");
            }
        }

        [Test]
        public void PrimaryFont_ActuallyRenders_NonLatinString_NoMissingGlyphInMesh()
        {
            // Pas seulement "la fonte CONTIENT le glyphe" (test ci-dessus) : que le composant
            // qui REND réellement le texte ne produise aucun caractère manquant une fois le
            // maillage généré — épingle la valeur produite, pas seulement la donnée source.
            var canvasGo = new GameObject("C6_NonLatinProbeCanvas", typeof(UnityEngine.Canvas));
            GameObject go = null;
            try
            {
                go = new GameObject("C6_NonLatinProbe", typeof(RectTransform));
                go.transform.SetParent(canvasGo.transform, false);
                // Un RectTransform à taille nulle laisse le layout TMP calculer 0 caractère
                // visible (tout wrap/overflow immédiatement) — sans rapport avec la couverture
                // de glyphe qu'on teste ici. Une taille explicite écarte ce faux négatif.
                ((RectTransform)go.transform).sizeDelta = new Vector2(400, 100);

                var tmp = go.AddComponent<TextMeshProUGUI>();
                tmp.font = DesignTokens.Current.primaryFont;
                tmp.text = CyrillicSample;
                tmp.ForceMeshUpdate();

                var info = tmp.textInfo;
                Assert.Greater(info.characterCount, 0, "Aucun caractère rendu — le texte n'a pas été traité.");

                int missing = 0;
                for (int i = 0; i < info.characterCount; i++)
                {
                    var ch = info.characterInfo[i];
                    if (!ch.isVisible) continue;
                    if (ch.textElement == null || ch.textElement.glyphIndex == 0) missing++; // index 0 = .notdef dans TMP
                }
                Assert.AreEqual(0, missing, $"{missing} caractère(s) rendu(s) en .notdef sur '{CyrillicSample}'.");
            }
            finally
            {
                if (go != null) Object.DestroyImmediate(go);
                Object.DestroyImmediate(canvasGo);
            }
        }

        [Test]
        public void ControlePositif_CjkCharacter_IsNotCoveredByDejaVuSans()
        {
            // Contrôle positif ANTI-VACUITÉ (obligatoire — §C6 du design) : ce test PROUVE que
            // HasCharacter peut rendre FAUX, donc que les deux tests ci-dessus rougiraient
            // vraiment sur une fonte sans couverture — pas seulement "toujours vert par
            // construction". DejaVu Sans ne couvre PAS le CJK (Han) — mesuré, pas supposé.
            var font = DesignTokens.Current.primaryFont;
            Assert.IsNotNull(font);
            const char han = '漢'; // U+6F22, script Han — hors couverture DejaVu Sans
            bool covered = font.HasCharacter(han, tryAddCharacter: true);
            Assert.IsFalse(covered,
                "U+6F22 ('漢') est couvert par la fonte primaire — le contrôle positif ne prouve plus rien : " +
                "choisir un autre caractère hors couverture avant de faire confiance aux deux tests précédents.");
        }
    }
}
