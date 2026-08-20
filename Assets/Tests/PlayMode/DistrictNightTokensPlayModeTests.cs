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
            Assert.Greater(s, 0.20f,
                "engagement 2 : le fond de nuit doit être un bleu-pétrole saturé, jamais un gris " +
                $"(seuil 0.20 — revue ⊥ 2026-08-20 : « > 0 » laissait passer un gris à +0,005 de bleu). " +
                $"Mesuré : h={h:F3} s={s:F3} v={v:F3}");
        }

        [Test]
        public void C5F3bis_OutOfDistrictMuted_CoversTheRoot_MustAlsoBeSaturatedNightBlue()
        {
            // Revue ⊥ 2026-08-20 : la garde d'origine surveillait nightBackground (~3,6 % de l'écran)
            // pendant que nightOutOfDistrictMuted peignait 100 % de la racine en gris (s=0,056).
            // « La garde vérifiait la mauvaise propriété » — celle-ci vise le token qui COUVRE.
            Color.RGBToHSV(DesignTokens.Current.nightOutOfDistrictMuted, out float h, out float s, out float v);
            Assert.Greater(s, 0.20f,
                $"le token qui couvre la racine entière doit être un bleu nuit saturé. Mesuré : h={h:F3} s={s:F3} v={v:F3}");
        }

        [Test]
        public void C5F3_AntiVacuite_PureGrayWouldFailTheSameProbe()
        {
            // Contrôle positif de l'assertion ci-dessus (le socle : un zéro doit se prouver capable
            // de rendre non-zéro) — un GRIS PUR n'a par définition aucune teinte : ce fixture DOIT
            // échouer le même test que celui qui protège nightBackground, sinon la sonde ne
            // distinguerait pas un vrai bleu-pétrole d'un gris déguisé.
            // revue ⊥ r2 (MINOR 7) : la fixture doit échouer LE SEUIL RÉEL (0.20), pas seulement
            // s==0 — un gris à s=0.15 doit être rejeté par la sonde que ce contrôle certifie.
            Color grisDeguise = new Color(0.10f, 0.107f, 0.112f, 1f); // s ≈ 0.107 — sous le seuil
            Color.RGBToHSV(grisDeguise, out _, out float s, out _);
            Assert.Less(s, 0.20f,
                "contrôle positif cassé : cette fixture est censée être SOUS le seuil 0.20 que C5F3 applique.");
            Assert.Greater(s, 0f,
                "contrôle positif dégénéré : la fixture doit être un gris DÉGUISÉ (s>0), pas un gris pur — " +
                "c'est précisément la classe que l'ancien contrôle (s==0) ne couvrait pas.");
        }

        // revue ⊥ r2 (point 5) — la falsifiable que DEUX revues manuelles ont dû remplacer : le
        // contraste des éléments non textuels du diorama, en RATIO WCAG mesuré, jamais à l'œil.
        private static float Lum(Color c)
        {
            System.Func<float, float> lin = (u) => u <= 0.03928f ? u / 12.92f : Mathf.Pow((u + 0.055f) / 1.055f, 2.4f);
            return 0.2126f * lin(c.r) + 0.7152f * lin(c.g) + 0.0722f * lin(c.b);
        }
        private static float Ratio(Color a, Color b)
        {
            float la = Lum(a), lb = Lum(b);
            return (Mathf.Max(la, lb) + 0.05f) / (Mathf.Min(la, lb) + 0.05f);
        }

        [Test]
        public void R2F1_LieutenantMarker_WCAG3vs_SocleAndAllFloorBuckets()
        {
            var t = DesignTokens.Current;
            Color b0 = t.nightBackground;
            Color b1 = t.nightFloorAlt; // r3 : le bucket 1 est un token propre désormais
            Color b2 = t.nightBase;
            foreach (var (nom, fond) in new (string, Color)[] { ("socle", t.nightSocle), ("sol_b0", b0), ("sol_b1", b1), ("sol_b2", b2) })
                Assert.GreaterOrEqual(Ratio(t.nightLieutenantMarker, fond), 3f,
                    $"marqueur lieutenant vs {nom} : ratio WCAG < 3:1 — invisible (mesuré 1,055:1 aux rounds 1-2, deux revues à la main).");
        }

        [Test]
        public void R2F2_Socle_DistinctFromEveryFloorBucket()
        {
            var t = DesignTokens.Current;
            Color b1 = t.nightFloorAlt;
            foreach (var (nom, sol) in new (string, Color)[] { ("b0", t.nightBackground), ("b1", b1), ("b2", t.nightBase) })
                Assert.GreaterOrEqual(Ratio(t.nightSocle, sol), 1.3f,
                    $"socle vs sol {nom} : ratio < 1,3:1 — le socle disparaît dans le sol (mesuré 1,000:1 au r2 quand nightBase servait aux deux).");
        }

        // revue ⊥ r3 (IMPORTANT 5) — les paires manquantes portaient 97,48 % des pixels.
        [Test]
        public void R3F1_FloorPlanesAndBackdrop_SeparateLikeTheTarget()
        {
            var t = DesignTokens.Current;
            var plans = new (string, Color)[] {
                ("fond", t.nightOutOfDistrictMuted), ("b0", t.nightBackground),
                ("b1", t.nightFloorAlt), ("b2", t.nightBase) };
            for (int i = 0; i < plans.Length; i++)
                for (int j = i + 1; j < plans.Length; j++)
                {
                    if (plans[i].Item1 == "fond" && plans[j].Item1 == "b0") continue; // le hors-district PEUT
                    // rester proche de l'asphalte (même famille) — les PLANS DE SOL, eux, doivent s'étager.
                    Assert.GreaterOrEqual(Ratio(plans[i].Item2, plans[j].Item2), 1.3f,
                        $"{plans[i].Item1} ↔ {plans[j].Item1} : < 1,3:1 (cible mesurée : 1,6-2,1 entre plans de sol).");
                }
        }

        // revue ⊥ r3 (BLOCKING 1) — l'axe que TROIS tours de gardes n'ont jamais regardé : la VALEUR.
        // La saturation convergeait pendant que la luminance dérivait. Borne absolue, des deux côtés.
        [Test]
        public void R3F2_CoveringTokens_ValueStaysInTargetBand()
        {
            var t = DesignTokens.Current;
            foreach (var (nom, c) in new (string, Color)[] {
                ("nightBackground", t.nightBackground), ("nightOutOfDistrictMuted", t.nightOutOfDistrictMuted),
                ("nightBase", t.nightBase), ("nightFloorAlt", t.nightFloorAlt) })
            {
                Color.RGBToHSV(c, out _, out _, out float v);
                Assert.That(v, Is.InRange(0.18f, 0.45f),
                    $"{nom} : V={v:F3} hors de la bande cible [0,18 ; 0,45] (asphalte de l'art target : 0,38-0,47 ; " +
                    "tiers sombre ~0,21). Sous 0,18 l'écran est une cave, au-dessus de 0,45 c'est un after-work.");
            }
        }
    }
}
