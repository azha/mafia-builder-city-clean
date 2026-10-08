using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Tests.PlayMode
{
    /// <summary>Les PRIMITIVES du décor de scène (`Tools/decor-de-scene-2026-10-07/DESIGN.md`, §3.3 et §6 « Primitives ») :
    /// un test de PIXELS par primitive, jamais un test de paramètres — on lit la texture produite et on la compare à ce
    /// que le CSS prescrit, calculé ICI avec un oracle indépendant (interpolation linéaire entre arrêts opaques).
    ///
    /// Les cas sont ceux que le design nomme : `DegradeLineaire` 178°/158°/90° à 3 arrêts ; `DegradeRadial` opaque à 3
    /// arrêts, foyer et rayon (⑤ : `90% 60% at 50% 30%`) ; `RayonCoinLePlusLoin` 298×504,05 → 454,0 et 298×400 → 382,0
    /// (cx 0,30 ; cy 0,20) et r ≥ la distance aux 4 coins ; `DegradeRadialCercle` 128×128, r = 1 au bord, t &gt; 1 =
    /// dernier arrêt ; `RoundedRectMask` à 4 rayons (⑤ : 26/26/0/0) SANS casser la surcharge à un rayon ; les tuiles
    /// `Points` (⑭ : pas 26, r 1,4 → 1,9) et `Rayures`. Et la clé de cache dérivée du contenu (revue ⊥ n°1, m1).
    ///
    /// ⚠️ Couleurs de test : des constantes NOMMÉES (`Color.red`…), jamais un littéral — la garde TD-612 balaie tout `.cs`.</summary>
    [Category("DecorDeScene")]
    public class DecorDeScenePrimitivesPlayModeTests
    {
        private static readonly Color A = Color.red, B = Color.green, C = Color.blue;

        /// <summary>Un arrêt EXACT (coin, foyer) : l'arrondi d'un canal 8 bits, rien de plus.</summary>
        private const float TolExacte = 2.5f / 255f;
        /// <summary>Un point INTÉRIEUR du dégradé : le centre du pixel lu n'est pas exactement sur la position visée,
        /// la pente du dégradé (≤ 1/0,4 par unité de t) fait le reste.</summary>
        private const float TolInterieure = 7f / 255f;

        private static (float pos, Color c)[] Trois(float milieu) => new[] { (0f, A), (milieu, B), (1f, C) };

        /// <summary>L'ORACLE : la couleur CSS à la position t d'un dégradé A → B (en `milieu`) → C, arrêts opaques.
        /// Écrit à part de `ProceduralUI.EchantillonDeDegrade`, exprès.</summary>
        private static Color Css(float t, float milieu)
        {
            if (t <= 0f) return A;
            if (t >= 1f) return C;
            return t <= milieu ? Color.Lerp(A, B, t / milieu) : Color.Lerp(B, C, (t - milieu) / (1f - milieu));
        }

        private static float Ecart(Color a, Color b) =>
            Mathf.Max(Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Abs(a.g - b.g)), Mathf.Max(Mathf.Abs(a.b - b.b), Mathf.Abs(a.a - b.a)));

        private static void Proche(Color attendu, Color vu, float tol, string ou) =>
            Assert.LessOrEqual(Ecart(attendu, vu), tol, $"{ou} : attendu {attendu}, vu {vu}");

        /// <summary>Le pixel dont le centre est le plus proche de (u, v) en fractions de la texture — v = 0 en BAS
        /// (convention Unity).</summary>
        private static Color Px(Sprite s, float u, float v)
        {
            Texture2D t = s.texture;
            int x = Mathf.Clamp(Mathf.FloorToInt(u * t.width), 0, t.width - 1);
            int y = Mathf.Clamp(Mathf.FloorToInt(v * t.height), 0, t.height - 1);
            return t.GetPixel(x, y);
        }

        // ───────────────────────────────────────────── DegradeLineaire ─────────────────────────────────────────────

        [Test]
        public void P1a_DegradeLineaire_180_TroisArrets_HautBasEtArretDuMilieu()
        {
            Sprite s = ProceduralUI.DegradeLineaire(180f, Trois(0.54f), 300f, 583f);
            Assert.AreEqual(128, s.texture.width, "texture à la largeur demandée");
            Assert.AreEqual(Mathf.RoundToInt(128f * 583f / 300f), s.texture.height, "texture à l'ASPECT de la boîte 300×583");
            Proche(A, Px(s, 0.5f, 0.999f), TolExacte, "180° : le haut est le premier arrêt");
            Proche(C, Px(s, 0.5f, 0.001f), TolExacte, "180° : le bas est le dernier arrêt");
            // L'arrêt du milieu à 54 % DEPUIS LE HAUT : v de texture = 1 − 0,54.
            Proche(B, Px(s, 0.5f, 1f - 0.54f), TolInterieure, "180° : B à 54 % depuis le haut");
            // Et à mi-chemin du premier segment, l'oracle CSS.
            Proche(Css(0.27f, 0.54f), Px(s, 0.5f, 1f - 0.27f), TolInterieure, "180° : t = 0,27 = A→B à mi-course");
            Proche(Px(s, 0.02f, 0.3f), Px(s, 0.98f, 0.3f), TolExacte, "180° : aucune composante horizontale");
        }

        [Test]
        public void P1b_DegradeLineaire_178_CoinsEtOblique()
        {
            Sprite s = ProceduralUI.DegradeLineaire(178f, Trois(0.54f), 300f, 583f);
            // CSS 178° : la direction descend en penchant vers la DROITE (sin 178° > 0) ⇒ départ au coin haut-GAUCHE,
            // arrivée au coin bas-DROIT.
            Proche(A, Px(s, 0.001f, 0.999f), TolExacte, "178° : coin haut-gauche = premier arrêt");
            Proche(C, Px(s, 0.999f, 0.001f), TolExacte, "178° : coin bas-droit = dernier arrêt");
            // L'oblique : à mi-hauteur, le bord gauche est MOINS avancé sur la ligne que le bord droit — il porte plus de A.
            Color gauche = Px(s, 0.01f, 0.5f), droite = Px(s, 0.99f, 0.5f);
            Assert.Greater(gauche.r, droite.r + 4f / 255f, "178° : à mi-hauteur le bord gauche est plus proche du départ (plus de A) que le bord droit");
            // Et ce n'est PAS un 180° : l'écart gauche/droite mesuré est celui de la projection de la largeur sur l'axe.
            float longueur = ProceduralUI.LongueurLigneDeDegrade(178f, 300f, 583f);
            float deltaT = 300f * Mathf.Sin(178f * Mathf.Deg2Rad) / longueur;    // ≈ 0,0177
            float deltaRougeAttendu = deltaT / 0.54f;                               // dans le segment A→B
            Assert.AreEqual(deltaRougeAttendu, gauche.r - droite.r, 3f / 255f + 0.02f * deltaRougeAttendu, "178° : l'oblique a l'amplitude du CSS");
        }

        [Test]
        public void P1c_DegradeLineaire_158_OrdreDesQuatreCoins()
        {
            Sprite s = ProceduralUI.DegradeLineaire(158f, Trois(0.54f), 300f, 583f);
            Proche(A, Px(s, 0.001f, 0.999f), TolExacte, "158° : coin haut-gauche = départ");
            Proche(C, Px(s, 0.999f, 0.001f), TolExacte, "158° : coin bas-droit = arrivée");
            // Les deux autres coins, calculés par la définition CSS : t(haut-droit) ≈ 0,17 (dans A→B : rouge dominant),
            // t(bas-gauche) ≈ 0,83 (dans B→C : bleu dominant). Une implémentation au signe inversé les ÉCHANGE.
            float longueur = ProceduralUI.LongueurLigneDeDegrade(158f, 300f, 583f);
            float sin = Mathf.Sin(158f * Mathf.Deg2Rad), cos = Mathf.Cos(158f * Mathf.Deg2Rad);
            float tHautDroit = (150f * sin + 291.5f * cos) / longueur + 0.5f;
            float tBasGauche = (-150f * sin - 291.5f * cos) / longueur + 0.5f;
            Assert.Less(tHautDroit, 0.3f, "prémisse du test : haut-droit tôt sur la ligne");
            Assert.Greater(tBasGauche, 0.7f, "prémisse du test : bas-gauche tard sur la ligne");
            Proche(Css(tHautDroit, 0.54f), Px(s, 0.999f, 0.999f), TolInterieure, "158° : coin haut-droit");
            Proche(Css(tBasGauche, 0.54f), Px(s, 0.001f, 0.001f), TolInterieure, "158° : coin bas-gauche");
            Color hd = Px(s, 0.999f, 0.999f), bg = Px(s, 0.001f, 0.001f);
            Assert.Greater(hd.r, 0.5f, "158° : le coin haut-droit est encore rouge");
            Assert.Greater(bg.b, 0.5f, "158° : le coin bas-gauche est déjà bleu");
        }

        [Test]
        public void P1d_DegradeLineaire_90_GaucheDroite()
        {
            Sprite s = ProceduralUI.DegradeLineaire(90f, Trois(0.5f), 300f, 583f);
            Proche(A, Px(s, 0.001f, 0.5f), TolExacte, "90° : la gauche est le premier arrêt");
            Proche(C, Px(s, 0.999f, 0.5f), TolExacte, "90° : la droite est le dernier arrêt");
            Proche(B, Px(s, 0.5f, 0.5f), TolInterieure, "90° : B au milieu");
            Proche(Px(s, 0.3f, 0.02f), Px(s, 0.3f, 0.98f), TolExacte, "90° : aucune composante verticale");
        }

        [Test]
        public void P1e_EchantillonDeDegrade_BordDur_EtPremultiplie()
        {
            // ⑱ : deux arrêts à la MÊME position = un bord dur.
            var dur = new[] { (0f, A), (0.18f, B), (0.18f, C), (1f, C) };
            Proche(Color.Lerp(A, B, 0.5f), ProceduralUI.EchantillonDeDegrade(dur, 0.09f), 1e-4f, "avant le bord : A→B");
            Proche(C, ProceduralUI.EchantillonDeDegrade(dur, 0.1801f), 1e-4f, "juste après le bord : C, d'un coup");
            Proche(C, ProceduralUI.EchantillonDeDegrade(dur, 1.7f), 1e-4f, "t > 1 : dernier arrêt");
            Proche(A, ProceduralUI.EchantillonDeDegrade(dur, -0.2f), 1e-4f, "t < 0 : premier arrêt");
            // ⑭ : `#4a5057 → transparent` garde sa TEINTE en s'éteignant (prémultiplié), au lieu de virer au noir.
            Color transparent = Color.clear;
            var fondu = new[] { (0f, A), (1f, transparent) };
            Color mi = ProceduralUI.EchantillonDeDegrade(fondu, 0.5f);
            Assert.AreEqual(0.5f, mi.a, 1e-4f, "l'alpha s'éteint linéairement");
            Assert.AreEqual(1f, mi.r, 1e-4f, "la teinte reste celle de l'arrêt opaque (prémultiplié) — pas un rouge assombri");
        }

        // ───────────────────────────────────────────── DegradeRadial ─────────────────────────────────────────────

        [Test]
        public void P2_DegradeRadial_Opaque3Arrets_FoyerConventionY_EtRayon()
        {
            // ⑤ : `radial-gradient(90% 60% at 50% 30%, A, B 60%, C)` — cy = 0,30 DEPUIS LE HAUT.
            Sprite s = ProceduralUI.DegradeRadial(0.5f, 0.3f, 0.9f, 0.6f, Trois(0.6f));
            Assert.AreEqual(128, s.texture.width);
            Assert.AreEqual(128, s.texture.height);
            Proche(A, Px(s, 0.5f, 1f - 0.3f), 4f / 255f, "le FOYER est à 30 % depuis le haut (v de texture 0,70)");
            Assert.Greater(Ecart(A, Px(s, 0.5f, 0.3f)), 0.3f, "le point symétrique (30 % depuis le BAS) n'est PAS le foyer : convention Y de CSS");
            // Sur l'axe vertical, sous le foyer : v_css = 0,30 + 0,6·ry = 0,66 ⇒ t = 0,6 ⇒ B.
            Proche(B, Px(s, 0.5f, 1f - 0.66f), TolInterieure, "t = 0,6 sur l'axe vertical (ry = 0,6 de la hauteur)");
            // Sur l'axe horizontal : u = 0,5 + 0,3·rx = 0,77 ⇒ t = 0,3 ⇒ mi-course A→B.
            Proche(Css(0.3f, 0.6f), Px(s, 0.77f, 1f - 0.3f), TolInterieure, "t = 0,3 sur l'axe horizontal (rx = 0,9 de la largeur)");
            // Les coins du BAS sont hors de l'ellipse (t ≈ 1,29 > 1) : dernier arrêt, exactement. (Les coins du HAUT, eux, sont
            // DEDANS — t ≈ 0,75 : rx = 0,9 de la largeur ; la première version de ce test les croyait dehors, le créneau l'a réfuté.)
            Proche(C, Px(s, 0.001f, 0.001f), TolExacte, "coin bas-gauche hors de l'ellipse = C");
            Proche(C, Px(s, 0.999f, 0.001f), TolExacte, "coin bas-droit hors de l'ellipse = C");
            Proche(Css(0.745f, 0.6f), Px(s, 0.999f, 0.999f), TolInterieure, "coin haut-droit DANS l'ellipse : t ≈ 0,745");
        }

        // ───────────────────────────────────────── RayonCoinLePlusLoin ─────────────────────────────────────────

        [Test]
        public void P3_RayonCoinLePlusLoin_Mesures_454_382_Et4Coins()
        {
            // `mesurer-cercle.cjs` : corkboard 298×504,05 → 454,0 px ; cadres 33-35 298×400 → 382,0 px (cx 0,30 ; cy 0,20).
            Assert.AreEqual(454.0f, ProceduralUI.RayonCoinLePlusLoin(298f, 504.05f, 0.30f, 0.20f), 0.05f, "cadre 31");
            Assert.AreEqual(382.0f, ProceduralUI.RayonCoinLePlusLoin(298f, 400f, 0.30f, 0.20f), 0.05f, "cadres 33-35");
            Assert.AreNotEqual(ProceduralUI.RayonCoinLePlusLoin(298f, 504.05f, 0.30f, 0.20f),
                               ProceduralUI.RayonCoinLePlusLoin(298f, 400f, 0.30f, 0.20f), "le rayon DÉPEND du rect : pas une constante");
            foreach (var (w, h, cx, cy) in new[] { (298f, 504.05f, 0.30f, 0.20f), (300f, 583f, 0.5f, 0.5f), (540f, 960f, 0f, 1f), (100f, 10f, 0.9f, 0.1f) })
            {
                float r = ProceduralUI.RayonCoinLePlusLoin(w, h, cx, cy);
                float fx = cx * w, fy = cy * h, max = 0f;
                foreach (var (px, py) in new[] { (0f, 0f), (w, 0f), (0f, h), (w, h) })
                    max = Mathf.Max(max, Mathf.Sqrt((px - fx) * (px - fx) + (py - fy) * (py - fy)));
                Assert.AreEqual(max, r, 1e-3f, $"{w}×{h} @ ({cx},{cy}) : r = la distance au coin le plus loin, ≥ aux 4");
            }
        }

        // ───────────────────────────────────────── DegradeRadialCercle ─────────────────────────────────────────

        [Test]
        public void P4_DegradeRadialCercle_128_RayonUnAuBord_CoinAuDernierArret()
        {
            Sprite s = ProceduralUI.DegradeRadialCercle(Trois(0.6f));
            Texture2D t = s.texture;
            Assert.AreEqual(128, t.width);
            Assert.AreEqual(128, t.height);
            // Le pixel (64, 64) a son centre à 0,5·√2 px du centre de la texture : t = 0,011, pas 0 (réfuté au créneau à 4/255).
            Proche(Css(0.5f * Mathf.Sqrt(2f) / 64f, 0.6f), t.GetPixel(64, 64), TolExacte, "le centre : premier arrêt, à t ≈ 0,011");
            // r = 1 au MILIEU du bord : le pixel (127, 64) a son centre à 63,5 px du centre pour un demi-côté de 64.
            Proche(Css(63.5f / 64f, 0.6f), t.GetPixel(127, 64), TolInterieure, "milieu du bord droit : t ≈ 0,99");
            Proche(Css(63.5f / 64f, 0.6f), t.GetPixel(64, 0), TolInterieure, "milieu du bord bas : même t (un CERCLE, pas une ellipse)");
            Proche(C, t.GetPixel(0, 0), TolExacte, "coin : t = √2 > 1 ⇒ dernier arrêt");
            Proche(C, t.GetPixel(127, 127), TolExacte, "coin opposé : idem");
            // t = 0,6 sur l'axe : x = 64 + 0,6·64 = 102,4 ⇒ pixel 102 (centre 102,5 ⇒ t = 0,6016).
            Proche(B, t.GetPixel(102, 64), TolInterieure, "t = 0,6 ⇒ B");
            Proche(t.GetPixel(102, 64), t.GetPixel(64, 102), TolExacte, "isotrope : même t à même distance");
        }

        // ──────────────────────────────────────────── RoundedRectMask ────────────────────────────────────────────

        [Test]
        public void P5_RoundedRectMask_QuatreRayons_26_26_0_0_EtSurchargeIntacte()
        {
            Sprite m = ProceduralUI.RoundedRectMask(26, 26, 0, 0);
            Texture2D t = m.texture;
            int d = t.width;
            Assert.AreEqual(26 * 2 + 3, d, "même taille de texture que la surcharge à un rayon (2r + 3)");
            Assert.AreEqual(new Vector4(26, 26, 26, 26), m.border, "bordure 9-slice = le plus grand rayon");
            // Le HAUT de la texture (y = d − 1) est le haut de l'écran : les deux coins hauts sont arrondis, les bas carrés.
            Assert.Less(t.GetPixel(0, d - 1).a, 0.05f, "coin haut-gauche : évidé");
            Assert.Less(t.GetPixel(d - 1, d - 1).a, 0.05f, "coin haut-droit : évidé");
            Assert.Greater(t.GetPixel(0, 0).a, 0.95f, "coin bas-gauche : CARRÉ (rayon 0)");
            Assert.Greater(t.GetPixel(d - 1, 0).a, 0.95f, "coin bas-droit : CARRÉ (rayon 0)");
            Assert.Greater(t.GetPixel(d / 2, d / 2).a, 0.95f, "centre plein");
            // Le quart de cercle est bien là : en descendant la diagonale depuis le coin haut-gauche, l'alpha passe de 0 à 1 par une
            // RAMPE (au moins un pixel strictement entre les deux), et jamais ne redescend. (La v1 visait un pixel calculé avec un
            // centre de courbure décalé d'un texel : réfuté au créneau.)
            int rampe = 0; float avant = -1f;
            for (int k = 0; k < 26; k++)
            {
                float a = t.GetPixel(k, d - 1 - k).a;
                if (a > 0.05f && a < 0.95f) rampe++;
                Assert.GreaterOrEqual(a, avant - 1e-4f, $"diagonale : l'alpha ne redescend pas (k = {k})");
                avant = a;
            }
            Assert.GreaterOrEqual(rampe, 1, "diagonale du coin : la rampe anti-crénelée du rayon");
            Assert.Greater(avant, 0.95f, "au bout de la diagonale, plein");

            // ⚠️ La surcharge EXISTANTE ne bouge pas : `RoundedRectMask(26)` arrondit ses QUATRE coins, et les quatre rayons
            // égaux reproduisent sa texture pixel pour pixel.
            Sprite ancien = ProceduralUI.RoundedRectMask(26);
            Assert.Less(ancien.texture.GetPixel(0, 0).a, 0.05f, "RoundedRectMask(int) : coin bas-gauche arrondi — comme avant");
            Sprite egaux = ProceduralUI.RoundedRectMask(26, 26, 26, 26);
            Assert.AreEqual(ancien.texture.width, egaux.texture.width);
            Color[] pa = ancien.texture.GetPixels(), pe = egaux.texture.GetPixels();
            int differents = 0;
            for (int i = 0; i < pa.Length; i++) if (Mathf.Abs(pa[i].a - pe[i].a) > 1e-4f) differents++;
            Assert.AreEqual(0, differents, "quatre rayons égaux = la surcharge à un rayon, pixel pour pixel");
        }

        // ───────────────────────────────────────────────── Tuiles ─────────────────────────────────────────────────

        [Test]
        public void P6_TuilePoints_Pas26_Rayons_BordDoux_Decalage_Enroulement()
        {
            // ⑭ : `radial-gradient(circle, #4a5057 1.4px, transparent 1.9px)` en `background-size: 26px 26px`.
            Sprite s = ProceduralUI.TuilePoints(26f, 1.4f, 1.9f, A, Vector2.zero, 4);
            Texture2D t = s.texture;
            Assert.AreEqual(104, t.width, "26 px CSS × 4 de sur-échantillonnage");
            Assert.AreEqual(TextureWrapMode.Repeat, t.wrapMode);
            Color centre = t.GetPixel(52, 52);
            Assert.AreEqual(1f, centre.a, 1e-3f, "le centre du point est plein");
            Proche(A, centre, 1e-3f, "et de la teinte");
            Assert.AreEqual(0f, t.GetPixel(60, 52).a, 1e-3f, "à 8,5 px (> r2 = 7,6) : transparent");
            float doux = t.GetPixel(58, 52).a;   // 6,5 px : entre r1 (5,6) et r2 (7,6) ⇒ (7,6 − 6,5)/2 = 0,55
            Assert.AreEqual(0.55f, doux, 0.03f, "bord DOUX : plein → transparent, linéaire entre r1 et r2");
            Assert.AreEqual(0f, t.GetPixel(0, 0).a, 1e-3f, "le coin de la tuile est vide (le point est au centre)");
            int pleins = 0;
            foreach (Color c in t.GetPixels()) if (c.a > 0.5f) pleins++;
            float aireAttendue = Mathf.PI * 6.6f * 6.6f;   // rayon à mi-alpha ≈ (r1 + r2)/2 en px de texture
            Assert.AreEqual(aireAttendue, pleins, aireAttendue * 0.15f, "UN point par tuile, de l'aire attendue");

            // Décalage CSS (4, 6) : 4 vers la droite, 6 vers le BAS ⇒ en texture (y monte) : (+16, −24).
            Sprite sd = ProceduralUI.TuilePoints(26f, 1.4f, 1.9f, A, new Vector2(4f, 6f), 4);
            Assert.AreEqual(1f, sd.texture.GetPixel(68, 28).a, 1e-3f, "le point a suivi le décalage");
            Assert.AreEqual(0f, sd.texture.GetPixel(52, 52).a, 1e-3f, "et n'est plus au centre");
            // Enroulement : un décalage de 13 (une demi-tuile) met le point sur le BORD, qui rentre par l'autre côté.
            Sprite se = ProceduralUI.TuilePoints(26f, 1.4f, 1.9f, A, new Vector2(13f, 0f), 4);
            Assert.AreEqual(1f, se.texture.GetPixel(0, 52).a, 1e-3f, "bord gauche : plein");
            Assert.AreEqual(1f, se.texture.GetPixel(103, 52).a, 1e-3f, "bord droit : plein — la tuile reste périodique");
        }

        [Test]
        public void P7_TuileRayures_90_0_45_PasEtEpaisseur()
        {
            // `repeating-linear-gradient(90deg, A 0 2px, transparent 2px 8px)` : des rayures VERTICALES de 2 px tous les 8 px.
            Sprite s = ProceduralUI.TuileRayures(90f, 8f, 2f, A, 4);
            Texture2D t = s.texture;
            Assert.AreEqual(32, t.width, "8 px CSS × 4");
            for (int x = 0; x < 32; x++)
            {
                float attendu = x < 8 ? 1f : 0f;   // x < 2 px CSS ⇔ x + 0,5 < 8 px de texture
                Assert.AreEqual(attendu, t.GetPixel(x, 5).a, 1e-3f, $"90° : colonne {x}");
                Assert.AreEqual(t.GetPixel(x, 5).a, t.GetPixel(x, 27).a, 1e-3f, $"90° : colonne {x} constante en y");
            }
            // 0° : les mêmes rayures, HORIZONTALES.
            Texture2D t0 = ProceduralUI.TuileRayures(0f, 8f, 2f, A, 4).texture;
            for (int y = 0; y < 32; y++)
                Assert.AreEqual(y < 8 ? 1f : 0f, t0.GetPixel(5, y).a, 1e-3f, $"0° : ligne {y}");
            // 45° : tuile de côté pas·√2 ; l'alpha ne dépend que de x + y ; remplissage = e/pas = 25 %.
            Texture2D t45 = ProceduralUI.TuileRayures(45f, 8f, 2f, A, 4).texture;
            Assert.AreEqual(Mathf.RoundToInt(8f * Mathf.Sqrt(2f) * 4f), t45.width, "45° : côté pas·√2 pour rester périodique");
            Assert.AreEqual(t45.GetPixel(10, 20).a, t45.GetPixel(20, 10).a, 1e-3f, "45° : symétrie x ↔ y");
            foreach (Texture2D tx in new[] { t, t0, t45 })
            {
                int pleins = 0; Color[] px = tx.GetPixels();
                foreach (Color c in px) if (c.a > 0.5f) pleins++;
                Assert.AreEqual(0.25f, pleins / (float)px.Length, 0.05f, $"{tx.width} px : remplissage = épaisseur / pas");
            }
        }

        // ──────────────────────────────────────────────── Cache ────────────────────────────────────────────────

        [Test]
        public void P8_Cache_CleDeriveeDuContenu()
        {
            Sprite a = ProceduralUI.DegradeLineaire(178f, Trois(0.54f), 300f, 583f);
            Sprite b = ProceduralUI.DegradeLineaire(178f, Trois(0.54f), 300f, 583f);
            Sprite c = ProceduralUI.DegradeLineaire(178f, Trois(0.55f), 300f, 583f);
            Sprite d = ProceduralUI.DegradeLineaire(178f, Trois(0.54f), 298f, 504f);
            Assert.AreSame(a, b, "même spec ⇒ même sprite");
            Assert.AreNotSame(a, c, "un arrêt déplacé d'un centième ⇒ un autre sprite");
            Assert.AreNotSame(a, d, "une autre boîte ⇒ un autre sprite (l'aspect change l'angle)");
            Assert.AreSame(ProceduralUI.DegradeRadialCercle(Trois(0.6f)), ProceduralUI.DegradeRadialCercle(Trois(0.6f)));
            Assert.AreNotSame(ProceduralUI.DegradeRadialCercle(Trois(0.6f)), ProceduralUI.DegradeRadialCercle(Trois(0.61f)));
            Assert.AreSame(ProceduralUI.RoundedRectMask(26, 26, 0, 0), ProceduralUI.RoundedRectMask(26, 26, 0, 0));
            Assert.AreNotSame(ProceduralUI.RoundedRectMask(26, 26, 0, 0), ProceduralUI.RoundedRectMask(26, 26, 26, 26));
            Assert.AreNotSame(ProceduralUI.TuilePoints(26f, 1.4f, 1.9f, A, Vector2.zero), ProceduralUI.TuilePoints(26f, 1.4f, 1.9f, B, Vector2.zero));
        }
    }
}
