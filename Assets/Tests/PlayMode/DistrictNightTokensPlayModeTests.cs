using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Theme.Tests
{
    // W3.U2/C5 (design §3 C5-F3, U-2 — docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md
    // C5) — engagement 2 : le fond du diorama nocturne est un bleu-pétrole DÉSATURÉ, jamais un GRIS
    // pur. C'est une contrainte vérifiable (mesurée en HSV), donc une falsifiable — l'écrire sans la
    // vérifier serait une prose (le design le dit verbatim).
    //
    // C5-F1 (parité code↔asset, R2.3) N'A PAS de test dédié ici : sa cible déclarée est le gate déjà
    // existant, `DesignTokensParityPlayModeTests.C0F1_FieldCount_MatchesAssetTokenKeyCount_SameUnit`
    // — générique sur TOUT champ public déclaré, il couvre les 8 tokens neufs de ce chunk (Night +
    // chromeTabActive) sans modification. Vérifié statiquement à l'écriture (indépendant de la
    // reflection Unity, non exécutable en mode léger) : DesignTokens.cs déclare 49 champs publics
    // d'instance, DesignTokens.asset en sérialise 49 (compte identique, un par un) — evidence dans
    // le commit qui porte ce chunk.
    [Category("W3U2")]
    public class DistrictNightTokensPlayModeTests
    {
        [Test]
        public void C5F3_NightBackground_HasNonZeroSaturation_NeverGray()
        {
            Color.RGBToHSV(DesignTokens.Current.nightBackground, out float h, out float s, out float v);
            Assert.Greater(s, 0f,
                "engagement 2 : le fond de nuit doit être un bleu-pétrole DÉSATURÉ, jamais un gris " +
                $"pur (saturation nulle en HSV interdite). Mesuré : h={h:F3} s={s:F3} v={v:F3}");
        }

        [Test]
        public void C5F3_AntiVacuite_PureGrayWouldFailTheSameProbe()
        {
            // Contrôle positif de l'assertion ci-dessus (le socle : un zéro doit se prouver capable
            // de rendre non-zéro) — un GRIS PUR n'a par définition aucune teinte : ce fixture DOIT
            // échouer le même test que celui qui protège nightBackground, sinon la sonde ne
            // distinguerait pas un vrai bleu-pétrole d'un gris déguisé.
            Color pureGray = new Color(0.1f, 0.1f, 0.1f, 1f);
            Color.RGBToHSV(pureGray, out _, out float s, out _);
            Assert.AreEqual(0f, s,
                "contrôle positif cassé : un gris pur (r=g=b) devrait mesurer une saturation nulle.");
        }
    }
}
