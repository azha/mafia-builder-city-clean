using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.CityMap.Tests
{
    // ④ — LE FOND ASSOMBRI ET LES QUATRE VERRES GRADUÉS (juge ⊥ r3 de ④, 07/10 : G1 BLOQUANT, G2-G5, G7, G8, G14). HORS RÉSEAU, PURS : ils pinglent les VALEURS et le modèle
    // sRGB → linéaire ; la luminance rendue par tiers de bande contre la référence se MESURE au créneau (scripts m2 / m19 / m25 du r3).
    //   V1  le diorama est teinté (0,42 ; 0,42 ; 0,42) — `filter:brightness(.42)` de la maquette
    //   V2  le modèle : teinter le LINÉAIRE par la teinte convertie rend ×0,42 sur le sRGB (±2/255) — c'est la dérivation, pas la mesure
    //   V3  le `voile-scene` : alpha CSS 0,8 en haut, 0x22 à 18 %, 0 à 40 %, 0x66 en bas, par morceaux ; converti pour le mélange linéaire (1 − (1−a)^2,2)
    //   V4  les QUATRE verres sont QUATRE valeurs (20,26,36 · 29,34,44 · 32,37,47 · 41,53,70), croissantes — plus un gris-ardoise unique (73,85,96)
    //   V5  le libellé des boutons fantômes est le crème chaud (234,224,200), à plus de 4,5:1 sur le fond du bouton
    //   V6  les trois gris de gravité sont les jetons CSS exacts (LÉGÈRE #8c8272)
    //   V7  le rayon du bouton (34 u ↔ 28,8 px) et le liseré (3 px)
    [Category("AccueilCanon")]
    public class FondEtVerreDeLAccueilPlayModeTests
    {
        /// <summary>(r, g, b) en ENTIERS : un `(int,int,int)` ne s'égale pas à un `(byte,byte,byte)` — la comparaison échouerait en silence.</summary>
        private static (int, int, int) Trio(Color32 c) => (c.r, c.g, c.b);

        private static float LuminanceRelative(Color c)
        {
            float L(float v) => v <= 0.03928f ? v / 12.92f : Mathf.Pow((v + 0.055f) / 1.055f, 2.4f);
            return 0.2126f * L(c.r) + 0.7152f * L(c.g) + 0.0722f * L(c.b);
        }

        private static float Contraste(Color a, Color b)
        {
            float la = LuminanceRelative(a), lb = LuminanceRelative(b);
            return (Mathf.Max(la, lb) + 0.05f) / (Mathf.Min(la, lb) + 0.05f);
        }

        [Test]
        public void V1_LeDiorama_EstTeinte_Brightness042()
        {
            Assert.AreEqual(0.42f, DashboardController.EclaircissementDuFond);
            Color t = DashboardController.TeinteDuFond;
            Assert.AreEqual(0.42f, t.r); Assert.AreEqual(0.42f, t.g); Assert.AreEqual(0.42f, t.b);
            Assert.AreEqual(1f, t.a, "opaque : l'assombrissement est une teinte, pas une transparence");
        }

        [Test]
        public void V2_LeModele_TeinterLeLineaire_RendX042SurLeSrgb()
        {
            foreach (int src in new[] { 60, 100, 150, 200, 240 })
            {
                float linSrc = Mathf.GammaToLinearSpace(src / 255f);
                float linTeinte = Mathf.GammaToLinearSpace(DashboardController.EclaircissementDuFond);
                float rendu = Mathf.LinearToGammaSpace(linSrc * linTeinte) * 255f;
                Assert.AreEqual(0.42f * src, rendu, 2f, $"un pixel sRGB à {src} rend {rendu:0.#} : la maquette rend {0.42f * src:0.#} (±2/255)");
            }
        }

        [Test]
        public void V3_LeVoileDeScene_AlphaCssParMorceaux_EtConversionLineaire()
        {
            Assert.AreEqual(0xcc / 255f, DashboardController.AlphaCssDuVoile(0f), 1e-4f, "#0a0f18cc en haut");
            Assert.AreEqual(0x22 / 255f, DashboardController.AlphaCssDuVoile(0.18f), 1e-4f, "#0a0f1822 à 18 %");
            Assert.AreEqual(0f, DashboardController.AlphaCssDuVoile(0.40f), 1e-4f, "#0a0f1800 à 40 %");
            Assert.AreEqual(0x66 / 255f, DashboardController.AlphaCssDuVoile(1f), 1e-4f, "#0a0f1866 en bas");
            Assert.Greater(DashboardController.AlphaCssDuVoile(0.05f), DashboardController.AlphaCssDuVoile(0.15f), "décroît du haut jusqu'à 40 %");
            Assert.Less(DashboardController.AlphaCssDuVoile(0.50f), DashboardController.AlphaCssDuVoile(0.90f), "puis remonte vers le bas");
            Assert.AreEqual(0f, DashboardController.AlphaLineaireDuVoile(0f), 1e-6f);
            Assert.AreEqual(1f, DashboardController.AlphaLineaireDuVoile(1f), 1e-6f);
            foreach (float a in new[] { 0.1f, 0.4f, 0.8f })
                Assert.AreEqual(1f - a, Mathf.Pow(1f - DashboardController.AlphaLineaireDuVoile(a), 1f / 2.2f), 1e-3f,
                    $"un noir à l'alpha {a} rend (1−a)·src en sRGB : le mélange linéaire à l'alpha converti retombe dessus");
            Assert.AreEqual(0.971f, DashboardController.AlphaLineaireDuVoile(0.8f), 0.002f, "0,8 → 0,971 : le haut est presque noir");
        }

        [Test]
        public void V4_LesQuatreVerres_SontQuatreValeurs_Croissantes()
        {
            Color32 fond = LaSuitePanelController.FondGesteSombre, sep = LaSuitePanelController.SeparateurDeRangee,
                    pan = LaSuitePanelController.BordDePlaque, file = LaSuitePanelController.BordDeLaFile;
            Assert.AreEqual((20, 26, 36), Trio(fond), "fond du bouton fantôme");
            Assert.AreEqual((29, 34, 44), Trio(sep), "séparateur de rangée");
            Assert.AreEqual((32, 37, 47), Trio(pan), "liseré du panneau");
            Assert.AreEqual((41, 53, 70), Trio(file), "liseré de la barre TRANCHER (#2a3648)");
            Color[] ordre = { fond, sep, pan, file };
            for (int i = 1; i < ordre.Length; i++)
                Assert.Greater(LuminanceRelative(ordre[i]), LuminanceRelative(ordre[i - 1]), "quatre rôles, quatre valeurs, du plus discret au plus clair");
            Assert.AreEqual(4, ordre.Select(c => (Color32)c).Distinct().Count());
            Assert.Less(LuminanceRelative(fond), LuminanceRelative(new Color32(73, 85, 96, 255)) / 3f,
                "le fond du bouton n'est plus le gris-ardoise unique (73,85,96) d'avant : plus de 3× plus sombre");
        }

        [Test]
        public void V5_LeLibelleDesBoutonsFantomes_EstLeCremeChaud_Lisible()
        {
            Color32 creme = DesignTokens.Current.hudCreme;
            Assert.AreEqual((234, 224, 200), Trio(creme), "le jeton `--creme` (#eae0c8), pas le blanc froid (238,241,242)");
            Assert.GreaterOrEqual(Contraste(creme, LaSuitePanelController.FondGesteSombre), 4.5f, "plancher de doctrine : 4,5:1 pour un petit texte");
            Assert.AreNotEqual(Trio(creme), (238, 241, 242), "le blanc froid d'avant (238,241,242) n'est plus le libellé");
        }

        [Test]
        public void V6_LesGraviteSurLAccueil_SontLesJetonsCssExacts()
        {
            Color32 legere = ExceptionQueuePanelController.GraviteSurLAccueil("MILD"), moderee = ExceptionQueuePanelController.GraviteSurLAccueil("MODERATE"),
                    grave = ExceptionQueuePanelController.GraviteSurLAccueil("SEVERE"), inconnue = ExceptionQueuePanelController.GraviteSurLAccueil("???");
            Assert.AreEqual((0x8c, 0x82, 0x72), Trio(legere), "LÉGÈRE = #8c8272 (le jeu rendait (157,149,129))");
            Assert.AreEqual((0xa3, 0x99, 0x85), Trio(moderee), "MODÉRÉE = #a39985");
            Color32 creme2 = DesignTokens.Current.hudCremeSecondary;
            Assert.AreEqual(Trio(creme2), Trio(grave), "GRAVE = --creme-2");
            Assert.AreEqual(Trio(legere), Trio(inconnue), "hors domaine : la plus éteinte");
        }

        [Test]
        public void V7_LeRayonDuBouton_EtLeLisere()
        {
            Assert.AreEqual(34, LaSuitePanelController.RayonGeste, "border-radius:8px × 3,6 = 28,8 px ↔ 34 u (323 px = 385 u)");
            Assert.AreEqual(3.6f, LaSuitePanelController.EpaisseurDuLisere, "3 px dans la référence (2 px en jeu)");
        }
    }
}
