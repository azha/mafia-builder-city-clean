using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Theme.Tests
{
    // W4.P4a/C3 — le seam de livraison runtime LIVRE réellement, pas seulement "le fichier
    // existe". §1.5 du design : les 9 écrans n'ont ni prefab ni scène pour un [SerializeField]
    // câblé, donc un DesignTokens.asset présent mais non chargeable au runtime (mauvais nom de
    // Resources, mauvais dossier, asset vide) laisserait un simple test de présence vert.
    [Category("W4P4a")]
    public class DesignTokensPlayModeTests
    {
        [Test]
        public void Current_LoadsViaResources_NotNull()
        {
            var tokens = DesignTokens.Current;
            Assert.IsNotNull(tokens, "DesignTokens.Current a renvoyé null — Resources.Load(\"DesignTokens\") n'a rien trouvé.");
        }

        [Test]
        public void Current_SurfaceBase_DiffersFromTypeDefault()
        {
            // Un Resources.Load qui renverrait un asset vide (jamais peuplé) laisserait chaque
            // champ Color à default(Color) == (0,0,0,0) — transparent noir. La valeur réelle
            // récoltée (#0d0f10, alpha=1) en diffère largement : ce test rougirait si le
            // chargement rendait un objet vide plutôt que l'asset réellement peuplé.
            var tokens = DesignTokens.Current;
            Assert.IsNotNull(tokens);
            Assert.AreNotEqual(default(Color), tokens.surfaceBase,
                "surfaceBase == default(Color) — l'asset chargé semble vide (jamais peuplé), pas juste présent.");
        }

        [Test]
        public void Current_AccentGold_MatchesHarvestedValue()
        {
            // Épingle une VALEUR précise (pas juste "différent de zéro") — accentGold est le CTA
            // partagé par 7 des 9 écrans (§1.3 du design : 8 occurrences de #ffd23f).
            var tokens = DesignTokens.Current;
            var expected = new Color(1f, 0.824f, 0.247f);
            Assert.Less(Vector4.Distance(tokens.accentGold, expected), 0.01f,
                $"accentGold={tokens.accentGold} loin de la valeur récoltée {expected}.");
        }
    }
}
