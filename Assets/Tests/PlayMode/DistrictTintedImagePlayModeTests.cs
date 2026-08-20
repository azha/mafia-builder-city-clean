using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    /// <summary>
    /// W3.U2/C6 — C6-F1 (D4) : <see cref="DistrictTintedImage"/> produit, pour CHACUN des 6
    /// profils, EXACTEMENT la couleur que <see cref="DistrictTintResolver"/> rend (source unique
    /// de la teinte). Scénario dimensionné sur les 6 profils via <c>[TestCase]</c> — un seul profil
    /// ne distinguerait pas une consommation d'une constante recopiée. REUSE du patron de
    /// <c>DistrictTintPlayModeTests</c> (W3.U-DA/C5), appliqué au composant uGUI frère.
    /// </summary>
    [Category("W3U2")]
    public class DistrictTintedImagePlayModeTests
    {
        private static GameObject NewTintedImageObject()
        {
            var go = new GameObject("DistrictTintedImageTestSubject", typeof(RectTransform), typeof(Image));
            go.AddComponent<DistrictTintedImage>();
            return go;
        }

        [TestCase("tidewater")]
        [TestCase("verge")]
        [TestCase("stack")]
        [TestCase("lattice")]
        [TestCase("spine")]
        [TestCase("glass")]
        public void ApplyTint_SixProfiles_MatchesResolverExactly(string profile)
        {
            var go = NewTintedImageObject();
            try
            {
                var tinted = go.GetComponent<DistrictTintedImage>();
                var image = go.GetComponent<Image>();
                tinted.ApplyTint(profile);

                var expected = DistrictTintResolver.ToTintColor(DistrictTintResolver.Resolve(profile));
                Assert.AreEqual(profile, tinted.DistrictProfile);
                Assert.Less(Vector4.Distance(image.color, expected), 0.001f,
                    $"DistrictTintedImage n'a pas appliqué la teinte résolue pour '{profile}'.");
                Assert.Less(Vector4.Distance(tinted.AppliedTint, expected), 0.001f);
            }
            finally
            {
                Object.DestroyImmediate(go);
            }
        }

        [Test]
        public void ApplyTint_UnknownProfile_FallsBackToNamedNeutral_NeverThrows()
        {
            var go = NewTintedImageObject();
            try
            {
                var tinted = go.GetComponent<DistrictTintedImage>();
                var image = go.GetComponent<Image>();

                Assert.DoesNotThrow(() => tinted.ApplyTint("not_a_real_profile"));
                var expected = DistrictTintResolver.ToTintColor(DistrictTintResolver.UnknownProfileFallback);
                Assert.Less(Vector4.Distance(image.color, expected), 0.001f);

                Assert.DoesNotThrow(() => tinted.ApplyTint(null));
            }
            finally
            {
                Object.DestroyImmediate(go);
            }
        }

        [Test]
        public void RequiresImage_ByAttribute()
        {
            var attr = typeof(DistrictTintedImage).GetCustomAttributes(typeof(RequireComponent), false)
                .Cast<RequireComponent>().FirstOrDefault();
            Assert.IsNotNull(attr, "DistrictTintedImage doit déclarer [RequireComponent(typeof(Image))].");
            Assert.AreEqual(typeof(Image), attr.m_Type0);
        }
    }
}
