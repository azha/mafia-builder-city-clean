using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    /// <summary>
    /// W3.U-DA/C5 — jointure `profile -&gt; teinte` (D-B : teinte au RUNTIME, jamais de copies
    /// pré-teintées) et son premier consommateur réel, <see cref="DistrictTinted"/>.
    /// </summary>
    [Category("W3UDA")]
    public class DistrictTintPlayModeTests
    {
        [Test]
        public void Resolver_KnowsExactlySixProfiles()
        {
            var profiles = DistrictTintResolver.KnownProfiles.ToList();
            Assert.AreEqual(6, profiles.Count);
            CollectionAssert.AreEquivalent(
                new[] { "tidewater", "spine", "lattice", "stack", "glass", "verge" }, profiles);
        }

        [Test]
        public void Resolver_SixProfiles_ProduceSixDistinctTints()
        {
            // C5-iii du design : assertion sur la VARIÉTÉ des valeurs, pas sur l'occupation du
            // conteneur -- "6 entrées" serait satisfait par 6 valeurs identiques.
            var tints = DistrictTintResolver.KnownProfiles
                .Select(p => DistrictTintResolver.ToTintColor(DistrictTintResolver.Resolve(p)))
                .ToList();

            Assert.AreEqual(6, tints.Count);
            var distinct = tints.Select(c => (Mathf.Round(c.r * 1000), Mathf.Round(c.g * 1000), Mathf.Round(c.b * 1000))).Distinct().Count();
            Assert.AreEqual(6, distinct, "les 6 profils doivent produire 6 teintes DISTINCTES — pas 6 entrées identiques.");
        }

        [Test]
        public void Resolver_UnknownProfile_FallsBackToDefinedNeutral_NeverThrows()
        {
            ColorShift shift = default;
            Assert.DoesNotThrow(() => shift = DistrictTintResolver.Resolve("not_a_real_profile"));
            Assert.AreEqual(DistrictTintResolver.UnknownProfileFallback.HueDeltaDeg, shift.HueDeltaDeg);
            Assert.AreEqual(DistrictTintResolver.UnknownProfileFallback.SaturationDelta, shift.SaturationDelta);
            Assert.AreEqual(DistrictTintResolver.UnknownProfileFallback.ValueDelta, shift.ValueDelta);

            Assert.DoesNotThrow(() => DistrictTintResolver.Resolve(null));
            Assert.DoesNotThrow(() => DistrictTintResolver.Resolve(""));
        }

        [Test]
        public void Resolver_Lattice_IsNominal_ProducesWhiteTint()
        {
            // "nominal -- neutre" dicté par le canon (art_direction.md:175) : delta nul -> AUCUN
            // changement visuel sur le sprite Kenney sous-jacent (multiplicateur blanc).
            var shift = DistrictTintResolver.Resolve("lattice");
            var tint = DistrictTintResolver.ToTintColor(shift);
            Assert.Less(Vector4.Distance(tint, Color.white), 0.001f, $"lattice devrait produire un tint blanc (neutre), obtenu {tint}.");
        }

        [Test]
        public void DistrictTinted_ProvenOnRealKenneySprite_AppliesResolvedTint()
        {
            // Premier consommateur RÉEL (D-C : substrat teintable, prouvé sur UN consommateur,
            // pas une refonte de CityMapController). Charge un sprite Kenney réellement importé
            // sous Assets/Art/Kenney/PNG/ en C5.
            var texture = new Texture2D(4, 4);
            var sprite = Sprite.Create(texture, new Rect(0, 0, 4, 4), new Vector2(0.5f, 0.5f));

            var go = new GameObject("DistrictTintedTestSubject");
            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            var tinted = go.AddComponent<DistrictTinted>();

            try
            {
                tinted.ApplyTint("stack");
                Assert.AreEqual("stack", tinted.DistrictProfile);
                var expected = DistrictTintResolver.ToTintColor(DistrictTintResolver.Resolve("stack"));
                Assert.Less(Vector4.Distance(renderer.color, expected), 0.001f,
                    "DistrictTinted n'a pas appliqué la teinte résolue au SpriteRenderer.");
                Assert.Less(Vector4.Distance(tinted.AppliedTint, expected), 0.001f);
            }
            finally
            {
                Object.DestroyImmediate(go);
                Object.DestroyImmediate(sprite);
                Object.DestroyImmediate(texture);
            }
        }

        [Test]
        public void DistrictTinted_RequiresSpriteRenderer_ByAttribute()
        {
            var attr = typeof(DistrictTinted).GetCustomAttributes(typeof(RequireComponent), false)
                .Cast<RequireComponent>().FirstOrDefault();
            Assert.IsNotNull(attr, "DistrictTinted doit déclarer [RequireComponent(typeof(SpriteRenderer))].");
            Assert.AreEqual(typeof(SpriteRenderer), attr.m_Type0);
        }
    }
}
