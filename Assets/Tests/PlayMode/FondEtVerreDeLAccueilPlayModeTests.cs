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
            Assert.AreEqual(252f / 255f, t.a, 1e-6f, "R4 : l'alpha du PLANCHER (252/255, exactement représentable) — le diorama se mélange au gris du plancher");
        }

        [Test]
        public void V2_LeModele_TeinterLeLineaire_RendUnPeuPlusSombreQueLeCss_JamaisPlusClair()
        {
            // Créneaux du 07/10 : le modèle sRGB (`Mathf.GammaToLinearSpace`, la vraie courbe) rend un pixel à 100 → 37,3 là où `brightness(.42)` rend 42, et à 60 → 19 au lieu de 25 :
            // PLUS SOMBRE que la maquette, dans tout l'intervalle. C'est ce que la mesure des planches a trouvé (décor à 0,74-0,99 de la référence, −9 % d'écran, bouton or 1er sur 1144) —
            // le diorama est un peu SOMBRE, jamais plus clair. Une teinte plus haute (≈ 0,46) le rapprocherait : décision du juge ⊥ r4, pas d'ici. Ce test pin le SENS et la fourchette.
            foreach (int src in new[] { 60, 100, 150, 200, 240 })
            {
                float linSrc = Mathf.GammaToLinearSpace(src / 255f);
                float linTeinte = Mathf.GammaToLinearSpace(DashboardController.EclaircissementDuFond);
                float rendu = Mathf.LinearToGammaSpace(linSrc * linTeinte) * 255f;
                float css = 0.42f * src;
                Assert.LessOrEqual(rendu, css + 0.5f, $"un pixel sRGB à {src} rend {rendu:0.#} : jamais plus clair que la maquette ({css:0.#})");
                Assert.GreaterOrEqual(rendu, 0.70f * css, $"un pixel sRGB à {src} rend {rendu:0.#} : pas plus de 30 % sous la maquette ({css:0.#})");
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
        public void V8_LeRythmeVertical_G9_AllongeLePanneau_SansDepasserLaBande()
        {
            Assert.AreEqual(47, LaSuitePanelController.RembourrageHaut, "haut → « LA SUITE » : 37 → 43 px");
            Assert.AreEqual(40, LaSuitePanelController.EspaceEntreLignes, "corps → titre suivant : 72 → 93 px (+12 u sur chaque gouttière)");
            Assert.AreEqual(20, LaSuitePanelController.EspaceTitreCorps, "titre → corps : 20 → 30 px");
            Assert.AreEqual(12, LaSuitePanelController.SurplusPremiereLigne);
            // le gain total visé : +7 (haut) + 5 gouttières × 12 + 12 (1ᵉʳ titre) + 3 rangées × 12 (titre → corps) = 115 u, mesuré < la marge de la bande (375 u à 1920, 712 u à 2400)
            int gain = (LaSuitePanelController.RembourrageHaut - 40) + 5 * (LaSuitePanelController.EspaceEntreLignes - 28) + LaSuitePanelController.SurplusPremiereLigne
                       + 3 * (LaSuitePanelController.EspaceTitreCorps - 8);
            Assert.AreEqual(115, gain);
            Assert.Less(gain, 375, "l'allongement tient dans la plus petite marge mesurée : Ajuster ne réduit pas le bloc, les marges restent exactes");
        }

        [Test]
        public void V9_R4_LePlancher_RendCinqSurCinqCentCinquanteCinq_AuNoir_SansToucherLesHautesLumieres()
        {
            float a = DashboardController.AlphaDuFond;
            Assert.AreEqual(252, Mathf.RoundToInt(a * 255f), "représentable EXACTEMENT sur 8 bits");
            Color p = DashboardController.CouleurDuPlancher;
            Assert.AreEqual(p.r, p.g); Assert.AreEqual(p.g, p.b, "un gris");
            // un pixel NOIR de la ville : rend (1 − a)·lin(gris) = lin(5/255)  ⇒ 5/255 en sRGB
            float noir = (1f - a) * Mathf.GammaToLinearSpace(p.r);
            Assert.AreEqual(5f, Mathf.LinearToGammaSpace(noir) * 255f, 0.6f, "un pixel noir de la ville rend 5/255 : le plancher du juge ⊥ r4");
            // une haute lumière (la ville teintée à 200 → ≈ 84) ne bouge presque pas : < 1 niveau sRGB de perte de gain... et le plancher y ajoute < 4
            float lin = a * Mathf.GammaToLinearSpace(0.42f * 200f / 255f) + (1f - a) * Mathf.GammaToLinearSpace(p.r);
            float sans = Mathf.GammaToLinearSpace(0.42f * 200f / 255f);
            Assert.AreEqual(Mathf.LinearToGammaSpace(sans) * 255f, Mathf.LinearToGammaSpace(lin) * 255f, 3f, "le gain des hautes lumières est tel quel (≤ 3/255)");
            Assert.AreNotEqual(0.46f, DashboardController.EclaircissementDuFond, "R4 : on ne monte PAS la teinte à 0,46 (28 % de l'écart seulement)");
        }

        [Test]
        public void V10_R1_R2_R3_R5_LesConstantesDuR4()
        {
            Assert.AreEqual(110f, LaSuitePanelController.HauteurDuGeste, "R1 : hauteur FIXE des trois boutons (92 px)");
            Assert.AreEqual(38f, LaSuitePanelController.TaillePhrase, "R2 : sous-ligne 30 → 38");
            Assert.AreEqual(33f, LaSuitePanelController.TailleDuMot, "R2 : libellé de bouton 28 → 33");
            Assert.AreEqual(40f, ExceptionQueuePanelController.TailleDuQui, "R2 : « Lt. … attend vos ordres » 34 → 40");
            Assert.AreEqual(36f, ExceptionQueuePanelController.TailleDuTrancher, "R2 : TRANCHER 30 → 36");
            Assert.AreEqual((58, 62), (LaSuitePanelController.RembourrageGauche, LaSuitePanelController.RembourrageDroite), "R10 : marges intérieures 47/48 → 49/53 px");
            Color32 haut = LaSuitePanelController.VerreHaut, bas = LaSuitePanelController.VerreBas;
            Assert.AreEqual(Trio(DesignTokens.Current.hudBarGlassBottom), Trio(haut), "R5 : le verre éclairé du haut — `#0d131f` à 1/255 du jeton (garde Palette)");
            Assert.AreEqual(Trio(DesignTokens.Current.lieutenantGlassBottom), Trio(bas));
            Assert.AreEqual(1f, LaSuitePanelController.VerreHaut.a, "le verre de LA SUITE est opaque : le jeton prête sa teinte, pas son alpha");
            Assert.Greater(LuminanceRelative(haut), LuminanceRelative(bas), "plus clair en haut qu'en bas (−26 % dans la référence)");
            // R3 : le filet est un plateau (30 % → 70 %) avec rampes jusqu'à 0
            Assert.AreEqual(0f, LaSuitePanelController.AlphaCssDuFilet(0f), 1e-6f);
            Assert.AreEqual(1f, LaSuitePanelController.AlphaCssDuFilet(0.30f), 1e-6f);
            Assert.AreEqual(1f, LaSuitePanelController.AlphaCssDuFilet(0.50f), 1e-6f);
            Assert.AreEqual(1f, LaSuitePanelController.AlphaCssDuFilet(0.70f), 1e-6f);
            Assert.AreEqual(0f, LaSuitePanelController.AlphaCssDuFilet(1f), 1e-6f);
            Assert.AreEqual(0.5f, LaSuitePanelController.AlphaCssDuFilet(0.15f), 1e-6f, "rampe linéaire");
            Assert.AreEqual(55f, LaSuitePanelController.RetraitDuFilet, "14 CSS px × 3,6 = 46 px = 55 u de chaque côté");
        }

        /// <summary>F4 (juge r6, 08/10) — l'étiquette de gravité de la ligne de file : le corps de `.plus` (même 7,6 px nominal que `.qui small`, jamais en dessous), l'interlettrage 0,14 em en
        /// centièmes d'em TMP, et ce que ça rend : l'em en px (0,84375 px/u) et l'encre de « MODÉRÉE » dans les 3 % de ce que Chromium rend de la maquette (27,36 px d'em, 157 px d'encre). Pure.</summary>
        [Test]
        public void V10b_F4_LaGravite_PrendLeCorpsDePlus_EtLInterlettrageDeLaMaquette()
        {
            Assert.AreEqual(32f, ExceptionQueuePanelController.TailleDeLaGravite, "F4 : 22 → 32 u");
            Assert.AreEqual(14f, ExceptionQueuePanelController.InterlettrageDeLaGravite, "F4 : 0,14 em = 14 centièmes d'em TMP");
            Assert.GreaterOrEqual(ExceptionQueuePanelController.TailleDeLaGravite, ExceptionQueuePanelController.TailleDuPlusieurs, "la gravité ne passe pas sous « Plusieurs attendent encore »");
            const float pxParU = 1080f / 1280f, emMaquettePx = 7.6f * 3.6f;
            float em = ExceptionQueuePanelController.TailleDeLaGravite * pxParU;
            Assert.AreEqual(emMaquettePx, em, emMaquettePx * 0.03f, "l'em rendu : 27,0 px contre 27,36 en maquette");
            Assert.AreEqual(0.14f, ExceptionQueuePanelController.InterlettrageDeLaGravite / 100f, 1e-6f, "0,14 em de la maquette");
            // l'encre de « MODÉRÉE » (7 lettres, 6 interstices) : 134 px sans interlettrage à 27,36 px d'em (Chromium), plus 6 interstices
            float encre = 134f * em / emMaquettePx + 6f * ExceptionQueuePanelController.InterlettrageDeLaGravite / 100f * em;
            Assert.AreEqual(157f, encre, 157f * 0.03f, "encre de MODÉRÉE : 157 px dans Chromium");
        }

        /// <summary>Le mot, mesuré avec la VRAIE police du client (TMP), comme le fait le code de production. Pure côté réseau.</summary>
        private static float Mesure(string mot, float taille)
        {
            var go = new GameObject("MesureDuMot", typeof(RectTransform));
            try
            {
                var t = go.AddComponent<TMPro.TextMeshProUGUI>();
                t.font = DesignTokens.Current.primaryFont;
                t.fontSize = taille;
                t.fontStyle = TMPro.FontStyles.Bold;
                t.characterSpacing = 10;
                t.enableWordWrapping = false;
                return t.GetPreferredValues(mot).x;
            }
            finally { Object.DestroyImmediate(go); }
        }

        [Test]
        public void V11_R5_LesMots_TiennentDansLeurBoite_MesuresAvecLaVraiePolice()
        {
            float trancher = Mesure("TRANCHER", ExceptionQueuePanelController.TailleDuTrancher);
            Assert.Greater(trancher, 0f, "anti-vacuité : la police a mesuré quelque chose");
            Assert.GreaterOrEqual(ExceptionQueuePanelController.LargeurDuTrancher(trancher), trancher + ExceptionQueuePanelController.MargeDuMot, "la boîte de TRANCHER contient son mot mesuré, plus sa marge");
            Assert.GreaterOrEqual(ExceptionQueuePanelController.LargeurDuTrancher(0f), 220f, "jamais moins que les 220 u d'avant");
            Debug.Log($"[V11-MESURE] TRANCHER à {ExceptionQueuePanelController.TailleDuTrancher} u : {trancher:0.#} u ; boîte {ExceptionQueuePanelController.LargeurDuTrancher(trancher):0.#} u (l'ancienne : 220)");
            foreach (string mot in new[] { "COMMANDER", "VOIR LA VENTE", "BLANCHIR" })
            {
                float w = Mesure(mot, LaSuitePanelController.TailleDuMot);
                float bouton = LaSuitePanelController.LargeurDuGeste(w);
                Assert.GreaterOrEqual(bouton, w + 2f * LaSuitePanelController.RembourrageDuGeste, $"{mot} : le bouton ({bouton:0.#} u) contient son libellé ({w:0.#} u) et ses deux rembourrages");
            }
        }

        [Test]
        public void V7_LeRayonDuBouton_EtLeLisere()
        {
            Assert.AreEqual(38, LaSuitePanelController.RayonGeste, "R9 (r4) : 34 → 38 u : or et fantômes restaient 4-5 px sous la maquette (20-21 px)");
            Assert.AreEqual(3.6f, LaSuitePanelController.EpaisseurDuLisere, "3 px dans la référence (2 px en jeu)");
        }
    }
}
