using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using UnityEngine.TestTools.Constraints;
using Is = UnityEngine.TestTools.Constraints.Is;

namespace MafiaCleanCity.Mouvements.Tests
{
    // CLIENT-3 / E1 (design-couche-mouvement.md v4.3 §1, §2, §7, §9) — les courbes : aisance, évaluation d'un canal, oracle CSS.
    //   Aisance_*   §2  la `cubic-bezier` par image clé, 6 itérations de Newton, sans allocation
    //   Courbe_*    §2  images clés, aisance PAR image clé, itérations, `Alterne`, phase négative
    //   Oracle_*    §7  large en valeur (±0,15), strict en signe et en ordre (X7) — contre `oracle-css-hud.json`
    //   Tremble_*   §2  le repère CSS → Unity : `0 → −4° → 0`
    //   Migration_* §9  le catalogue du HUD recouvre les bornes que les anciennes méthodes épinglaient
    [Category("Mouvement")]
    public class MouvementsCourbesPlayModeTests
    {
        // ---- les 17 points de l'oracle (p = k/16), copiés de `oracle-css-hud.json` (Chromium, `getKeyframes()[i].easing`)
        private static readonly float[] OraclePoulsOpacity =
            { 1f, 0.9247f, 0.7753f, 0.6451f, 0.5587f, 0.5042f, 0.4717f, 0.455f, 0.45f, 0.5253f, 0.6747f, 0.8049f, 0.8913f, 0.9458f, 0.9783f, 0.995f, 1f };
        private static readonly float[] OracleTrembleRotCss =
            { 52f, 52.5475f, 53.634f, 54.5813f, 55.2096f, 55.6055f, 55.8419f, 55.9639f, 56f, 55.4525f, 54.366f, 53.4187f, 52.7904f, 52.3945f, 52.1581f, 52.0361f, 52f };
        private static readonly float[] OracleGyroHue =
            { 0f, -19.1644f, -57.1915f, -90.345f, -112.336f, -126.191f, -134.464f, -138.736f, -140f, -120.836f, -82.8085f, -49.655f, -27.6635f, -13.8085f, -5.5357f, -1.2643f, 0f };

        private static float EnPhase(Entree e, float phase) => Courbes.EvaluerCanal(e.Mouvement.Canaux[0], phase);

        // ------------------------------------------------------------------------------------------ aisance

        [Test]
        public void Aisance_Bornes_0Vaut0_1Vaut1_PourToutesLesAisances()
        {
            // §2 — une aisance est une bijection de [0,1] : 0 → 0 et 1 → 1 exactement, hors bornes écrêté
            Aisance[] toutes = { Aisance.Lineaire, Aisance.Ease, Aisance.EaseIn, Aisance.EaseOut, Aisance.EaseInOut, Aisance.Bezier(0.2f, -0.5f, 0.8f, 1.5f), default };
            foreach (Aisance a in toutes)
            {
                Assert.AreEqual(0f, a.Evaluer(0f), 0f);
                Assert.AreEqual(1f, a.Evaluer(1f), 0f);
                Assert.AreEqual(0f, a.Evaluer(-0.3f), 0f, "avant le départ");
                Assert.AreEqual(1f, a.Evaluer(1.7f), 0f, "après l'arrivée");
            }
        }

        [Test]
        public void Aisance_Monotone_PourLesCinqPresets()
        {
            // §2 — Lineaire/Ease/EaseIn/EaseOut/EaseInOut ne reculent jamais
            Aisance[] presets = { Aisance.Lineaire, Aisance.Ease, Aisance.EaseIn, Aisance.EaseOut, Aisance.EaseInOut };
            foreach (Aisance a in presets)
            {
                float prec = 0f;
                for (int i = 1; i <= 1000; i++)
                {
                    float v = a.Evaluer(i / 1000f);
                    Assert.GreaterOrEqual(v, prec - 1e-5f, $"recul à x = {i / 1000f}");
                    prec = v;
                }
            }
            // contrôle négatif : une bézier à dépassement n'est PAS monotone en valeur (le test sait voir un recul)
            Aisance rebond = Aisance.Bezier(0.3f, 1.8f, 0.7f, -0.8f);
            bool recule = false;
            float p = 0f;
            for (int i = 1; i <= 1000 && !recule; i++) { float v = rebond.Evaluer(i / 1000f); recule = v < p - 1e-4f; p = v; }
            Assert.IsTrue(recule, "la sonde de monotonie doit rougir sur une courbe qui rebondit");
        }

        [Test]
        public void Aisance_Ease_ValeurMesureeDansChromium()
        {
            // §1/§2 — `ease` = cubic-bezier(.25,.1,.25,1). Le pouls CSS tombe de 1 à 0,45 : à p = 0,125 du cycle (le quart du
            // premier demi-cycle) Chromium rend 0,7753, soit un PROGRÈS de (1 − 0,7753)/0,55 = 0,4085. L'ancien `SmoothStep`
            // rendait 0,914 : c'est l'écart que le design §1 chiffre (« 0,914 pour 0,775 »).
            Assert.AreEqual(0.4085f, Aisance.Ease.Evaluer(0.25f), 1e-3f, "progrès de `ease` à x = 0,25");
            float pouls = EnPhase(CatalogueHud.Pouls, 0.125f);
            Assert.AreEqual(0.7753f, pouls, 2e-3f, "le pouls du catalogue à p = 0,125, valeur de l'oracle");
            Assert.Greater(Mathf.Abs(pouls - 0.914f), 0.1f, "et ce n'est PAS l'ancien SmoothStep (0,914)");
        }

        [Test]
        public void Aisance_Newton6_AssezPrecis_ContreUneBissection()
        {
            // §2 — « résolue par 6 itérations de Newton » : l'erreur reste sous 1e-4 sur les cinq presets et une bézier libre
            Aisance[] cas = { Aisance.Ease, Aisance.EaseIn, Aisance.EaseOut, Aisance.EaseInOut, Aisance.Bezier(0.1f, 0.9f, 0.9f, 0.1f) };
            foreach (Aisance a in cas)
                for (int i = 1; i < 200; i++)
                {
                    float x = i / 200f;
                    Assert.AreEqual(BissectionY(a, x), a.Evaluer(x), 1e-4f, $"({a.X1},{a.Y1},{a.X2},{a.Y2}) à x = {x}");
                }
        }

        private static float BissectionY(Aisance a, float x)
        {
            float lo = 0f, hi = 1f;
            for (int i = 0; i < 60; i++)
            {
                float m = (lo + hi) * 0.5f;
                float xm = 3f * (1f - m) * (1f - m) * m * a.X1 + 3f * (1f - m) * m * m * a.X2 + m * m * m;
                if (xm < x) lo = m; else hi = m;
            }
            float t = (lo + hi) * 0.5f;
            return 3f * (1f - t) * (1f - t) * t * a.Y1 + 3f * (1f - t) * t * t * a.Y2 + t * t * t;
        }

        [Test]
        public void Aisance_Defaut_EstLaLigneDroite()
        {
            // §2 — `default(Aisance)` (quatre zéros) est linéaire : une image clé sans aisance déclarée ne déforme rien
            Assert.AreEqual(0.3f, default(Aisance).Evaluer(0.3f), 1e-6f);
            Assert.IsTrue(Aisance.Lineaire.EstLineaire);
            Assert.IsFalse(Aisance.Ease.EstLineaire);
        }

        [Test]
        public void Aisance_Bezier_RefuseUnXHorsDeZeroUn()
        {
            // §2 — comme en CSS, x1/x2 ∈ [0,1] ; y libre
            Assert.Throws<System.ArgumentOutOfRangeException>(() => Aisance.Bezier(1.2f, 0f, 0.5f, 1f));
            Assert.Throws<System.ArgumentOutOfRangeException>(() => Aisance.Bezier(0.2f, 0f, -0.1f, 1f));
            Assert.DoesNotThrow(() => Aisance.Bezier(0.2f, -2f, 0.8f, 3f));
        }

        [Test]
        public void Aisance_Evaluer_NAllouePas()
        {
            // §2/§4 (X3) — l'évaluation d'une courbe ne produit aucun octet
            float somme = 0f;
            Aisance.Ease.Evaluer(0.4f); Courbes.EvaluerCanal(CatalogueHud.Pouls.Mouvement.Canaux[0], 0.3f);   // échauffement
            Assert.That(() =>
            {
                for (int i = 0; i < 500; i++)
                {
                    somme += Aisance.Ease.Evaluer(i / 500f);
                    somme += Courbes.EvaluerCanal(CatalogueHud.Pouls.Mouvement.Canaux[0], i / 500f);
                }
            }, Is.Not.AllocatingGCMemory());
            Assert.Greater(somme, 0f);
        }

        // ------------------------------------------------------------------------------------------ courbes

        [Test]
        public void Courbe_AisanceParImageCle_CelleDuSegmentQuiPart()
        {
            // §2 — l'aisance de l'image clé i régit le segment qui PART de i (jamais `easing` de l'effet)
            var canal = new Canal(Propriete.Alpha, Mode.Absolu, new[]
            {
                AidesMouvement.K(0f, 0f, Aisance.Lineaire), AidesMouvement.K(0.5f, 1f, Aisance.EaseIn), AidesMouvement.K(1f, 0f, Aisance.Lineaire),
            });
            Assert.AreEqual(0.5f, Courbes.EvaluerCanal(canal, 0.25f), 1e-4f, "segment 0 : linéaire");
            float attendu = 1f + (0f - 1f) * Aisance.EaseIn.Evaluer(0.5f);
            Assert.AreEqual(attendu, Courbes.EvaluerCanal(canal, 0.75f), 1e-4f, "segment 1 : ease-in, pas linéaire");
            Assert.Greater(Mathf.Abs(Courbes.EvaluerCanal(canal, 0.75f) - 0.5f), 0.05f);
            Assert.AreEqual(0f, Courbes.EvaluerCanal(canal, 1f), 1e-6f);
        }

        [Test]
        public void Courbe_Iterations_FoisN_Fini_EtPhaseDeFin()
        {
            // §2 — `Fois n` : fini à n périodes, phase de fin 1 ; `Infini` ne finit jamais
            MouvementDefini m = AidesMouvement.Rampe("r", Genre.Transition, Propriete.Alpha, Mode.Absolu, 0f, 1f, 0.2f, Iteration.Fois(2));
            Courbes.Phase(m, 0.2f, 0.39f, out bool fini);
            Assert.IsFalse(fini, "0,39 s < 2 × 0,2 s");
            float p = Courbes.Phase(m, 0.2f, 0.4f, out fini);
            Assert.IsTrue(fini);
            Assert.AreEqual(1f, p);
            MouvementDefini inf = AidesMouvement.Rampe("i", Genre.Alerte, Propriete.Alpha, Mode.Absolu, 0f, 1f, 0.2f, Iteration.InfiniFois);
            Courbes.Phase(inf, 0.2f, 1e6f, out fini);
            Assert.IsFalse(fini);
        }

        [Test]
        public void Courbe_Alterne_LesCyclesImpairsSeJouentAEnvers()
        {
            // §2 — `Alterne`
            MouvementDefini m = new MouvementDefini("a", Genre.Ambiance, 1f,
                new[] { new Canal(Propriete.Alpha, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }) },
                Iteration.InfiniFois, alterne: true, poseDeReposS: 0.5f);
            Assert.AreEqual(0.25f, Courbes.Phase(m, 1f, 0.25f, out _), 1e-5f, "cycle 0 : à l'endroit");
            Assert.AreEqual(0.75f, Courbes.Phase(m, 1f, 1.25f, out _), 1e-5f, "cycle 1 : à l'envers (1 − 0,25)");
            Assert.AreEqual(0.25f, Courbes.Phase(m, 1f, 2.25f, out _), 1e-5f, "cycle 2 : à l'endroit");
            // contrôle négatif : sans `Alterne`, le cycle 1 ne s'inverse pas
            MouvementDefini sans = new MouvementDefini("s", Genre.Ambiance, 1f, m.Canaux, Iteration.InfiniFois, alterne: false, poseDeReposS: 0.5f);
            Assert.AreEqual(0.25f, Courbes.Phase(sans, 1f, 1.25f, out _), 1e-5f);
        }

        [Test]
        public void Courbe_AvantLeDepart_TientLaPremiereImageCle()
        {
            // §2 — `PhaseS` positive = retard (`animation-delay`) : la première image clé est tenue (fill backwards)
            MouvementDefini m = AidesMouvement.Rampe("r", Genre.Transition, Propriete.Alpha, Mode.Absolu, 0.3f, 1f, 1f, Iteration.Fois(1));
            float p = Courbes.Phase(m, 1f, -0.5f, out bool fini);
            Assert.AreEqual(0f, p);
            Assert.IsFalse(fini);
            Assert.AreEqual(0.3f, Courbes.EvaluerCanal(m.Canaux[0], p), 1e-6f);
        }

        [Test]
        public void CouleurSpec_Resoudre_CibleEtCibleFois_BorneA01()
        {
            // §16 — `Cible` = le RGB lu à l'attachement ; `Cible × k` par canal, borné à [0,1] ; l'alpha n'y est jamais
            var cible = new Color(0.8f, 0.4f, 0.1f, 0.3f);
            Assert.AreEqual(new Color(0.8f, 0.4f, 0.1f, 1f), CouleurSpec.Cible.Resoudre(cible));
            Color sombre = CouleurSpec.CibleFois(0.5f).Resoudre(cible);
            Assert.AreEqual(0.4f, sombre.r, 1e-6f);
            Assert.AreEqual(0.05f, sombre.b, 1e-6f);
            Color clair = CouleurSpec.CibleFois(2f).Resoudre(cible);
            Assert.AreEqual(1f, clair.r, 1e-6f, "borné à 1");
            Assert.AreEqual(0.8f, clair.g, 1e-6f);
            Assert.AreEqual(1f, clair.a, "l'alpha du Graphic n'est jamais porté par la spec");
            // contrôle négatif : une couleur NOMMÉE ignore la cible (c'est ce qui repeignait les 67 boutons de la même couleur)
            Color nommee = CouleurSpec.Nommee("gris", new Color(0.5f, 0.5f, 0.5f)).Resoudre(cible);
            Assert.AreEqual(0.5f, nommee.r, 1e-6f);
        }

        [Test]
        public void Couleurs_HueRotate_EstLaMatriceCss_EtLeGyrophareEnPartage()
        {
            // §1 — `HueRotate` descend dans `Couleurs` : même matrice que `Gyrophare.HueRotate` (migration de l'appelant = E2)
            Color rouge = Couleurs.Rvb(0xff5a3c);
            Color32 bleu = Couleurs.HueRotate(rouge, -140f);
            Assert.That(Mathf.Abs(bleu.r - 62) <= 1 && Mathf.Abs(bleu.g - 128) <= 1 && Mathf.Abs(bleu.b - 255) <= 1,
                $"`hue-rotate(-140deg)` de #ff5a3c = #3e80ff ; rendu {bleu}");
            for (float deg = -180f; deg <= 180f; deg += 20f)
                Assert.AreEqual((Color32)Gyrophare.HueRotate(rouge, deg), (Color32)Couleurs.HueRotate(rouge, deg), $"à {deg}°");
            Assert.AreEqual(0.4f, Couleurs.HueRotate(new Color(0.1f, 0.2f, 0.3f, 0.4f), 33f).a, 1e-6f, "l'alpha passe");
        }

        // ------------------------------------------------------------------------------------------ oracle (X7)

        /// <summary>X7 (§7) : valeur normalisée à ±0,15 de l'étendue de l'oracle, SIGNE DE LA DÉRIVÉE identique à chaque pas
        /// (donc signe et ordre des extrema), période à ±10 %. Rend le premier écart, ou null.</summary>
        private static string ConformeALOracle(Entree e, float[] oracleUnity, float dureeCssS)
        {
            float mini = float.MaxValue, maxi = float.MinValue;
            foreach (float v in oracleUnity) { mini = Mathf.Min(mini, v); maxi = Mathf.Max(maxi, v); }
            float etendue = Mathf.Max(maxi - mini, 1e-6f);
            if (Mathf.Abs(e.Mouvement.PeriodeS - dureeCssS) > 0.1f * dureeCssS) return "période " + e.Mouvement.PeriodeS + " s ≠ " + dureeCssS + " s ±10 %";
            int n = oracleUnity.Length - 1;
            float precCat = EnPhase(e, 0f), precOr = oracleUnity[0];
            for (int k = 1; k <= n; k++)
            {
                float cat = EnPhase(e, k / (float)n), ora = oracleUnity[k];
                if (Mathf.Abs(cat - ora) > 0.15f * etendue) return $"p = {k}/{n} : {cat} vs oracle {ora} (> 0,15 × {etendue})";
                int sCat = Signe(cat - precCat), sOr = Signe(ora - precOr);
                if (sCat != sOr) return $"p = {k}/{n} : signe de la dérivée {sCat} vs oracle {sOr}";
                precCat = cat; precOr = ora;
            }
            return null;
        }

        private static int Signe(float d, float bande = 1e-3f) => d > bande ? 1 : (d < -bande ? -1 : 0);

        [Test]
        public void Oracle_Pouls_ConformeALaMaquette()
        {
            // §7 (X7) — `pouls` : opacity 1 → 0,45 → 1 sur 1,1 s
            Assert.IsNull(ConformeALOracle(CatalogueHud.Pouls, OraclePoulsOpacity, 1.1f));
        }

        [Test]
        public void Oracle_Tremble_ConformeALaMaquette_DansLeRepereUnity()
        {
            // §2 + §7 — `tremble` CSS 52° → 56° → 52°, repère Unity : Rotation = − rotation CSS (relative au repos 52°)
            float[] unity = new float[OracleTrembleRotCss.Length];
            for (int i = 0; i < unity.Length; i++) unity[i] = -(OracleTrembleRotCss[i] - OracleTrembleRotCss[0]);
            Assert.IsNull(ConformeALOracle(CatalogueHud.Tremble, unity, 0.14f));
        }

        [Test]
        public void Oracle_Gyroflip_ConformeALaMaquette()
        {
            // §7 — `gyroflip` : hue-rotate 0 → −140° → 0 sur 0,9 s (une teinte n'a pas de repère à inverser)
            Assert.IsNull(ConformeALOracle(CatalogueHud.Gyrophare, OracleGyroHue, 0.9f));
        }

        [Test]
        public void Oracle_ContreOpposes_LeComparateurSaitRougir()
        {
            // §7 (X9) — contrôle négatif de l'oracle : un tremble au SIGNE CSS (0 → +4° → 0), une période hors ±10 %, et un pouls
            // à l'ancien SmoothStep doivent chacun être refusés
            float[] unity = new float[OracleTrembleRotCss.Length];
            for (int i = 0; i < unity.Length; i++) unity[i] = -(OracleTrembleRotCss[i] - OracleTrembleRotCss[0]);

            MouvementDefini faux = new MouvementDefini("faux", Genre.Alerte, 0.14f,
                new[] { new Canal(Propriete.Rotation, Mode.Additif, new[] { AidesMouvement.K(0f, 0f, Aisance.Ease), AidesMouvement.K(0.5f, 4f, Aisance.Ease), AidesMouvement.K(1f, 0f, Aisance.Ease) }) },
                Iteration.InfiniFois, poseDeReposS: 0.07f);
            Assert.IsNotNull(ConformeALOracle(AidesMouvement.Faire("faux.signe", faux), unity, 0.14f), "le signe inversé doit rougir");

            MouvementDefini lent = new MouvementDefini("lent", Genre.Alerte, 0.2f, CatalogueHud.Tremble.Mouvement.Canaux, Iteration.InfiniFois, poseDeReposS: 0.1f);
            Assert.IsNotNull(ConformeALOracle(AidesMouvement.Faire("faux.periode", lent), unity, 0.14f), "0,2 s au lieu de 0,14 s doit rougir");

            // l'ancien pouls : SmoothStep(0,1,m) échantillonné tous les 1/16 (0,914 à p = 0,125 pour 0,775 mesuré)
            var cles = new ImageCle[17];
            for (int k = 0; k <= 16; k++)
            {
                float m = k <= 8 ? k / 8f : (16 - k) / 8f;
                cles[k] = AidesMouvement.K(k / 16f, Mathf.Lerp(1f, 0.45f, Mathf.SmoothStep(0f, 1f, m)));
            }
            MouvementDefini lisse = new MouvementDefini("lisse", Genre.Alerte, 1.1f,
                new[] { new Canal(Propriete.Alpha, Mode.Multiplicatif, cles) }, Iteration.InfiniFois, poseDeReposS: 0.55f);
            Assert.IsNotNull(ConformeALOracle(AidesMouvement.Faire("faux.smoothstep", lisse), OraclePoulsOpacity, 1.1f),
                "l'ancien SmoothStep s'écarte de 0,139 > 0,15 × 0,55 = 0,0825 : il doit rougir");
        }

        [Test]
        public void Tremble_Signe_ZeroMoinsQuatreZero()
        {
            // §2 (BL-2 v2) + §9 — le tremblement va VERS LE CHAUD : `0 → −4° → 0` en Unity, épinglé par
            // `DistrictDescentePlayModeTests.cs:179` (`Tremblement(0.07) = −4`)
            MouvementDefini m = CatalogueHud.Tremble.Mouvement;
            Assert.AreEqual(Propriete.Rotation, m.Canaux[0].P);
            Assert.AreEqual(Mode.Additif, m.Canaux[0].M);
            Assert.AreEqual(0f, Courbes.EvaluerCanal(m.Canaux[0], 0f), 1e-4f);
            Assert.AreEqual(-4f, Courbes.EvaluerCanal(m.Canaux[0], 0.07f / 0.14f), 1e-4f, "à mi-période : −4°, jamais +4°");
            Assert.AreEqual(0f, Courbes.EvaluerCanal(m.Canaux[0], 1f), 1e-4f);
            Assert.Less(Courbes.EvaluerCanal(m.Canaux[0], 0.25f), 0f, "tout le premier quart est du côté négatif");
        }

        // ------------------------------------------------------------------------------------------ migration (§9)

        [Test]
        public void Migration_LeCatalogueRecouvreLesBornesDesAnciennesMethodes()
        {
            // §9 — les bornes que `TopBarController.Pouls/Tremblement` et `Gyrophare.TeinteA` épinglent aujourd'hui (leurs tests
            // continuent de compiler : les anciennes méthodes deviennent des enveloppes en E2). Les VALEURS intermédiaires
            // changent (SmoothStep → ease) : seules les BORNES sont comparées ici.
            Assert.AreEqual(TopBarController.Pouls(0f), EnPhase(CatalogueHud.Pouls, 0f), 1e-4f);
            Assert.AreEqual(TopBarController.Pouls(0.55f), EnPhase(CatalogueHud.Pouls, 0.5f), 1e-4f, "le creux de 0,45");
            Assert.AreEqual(TopBarController.Pouls(1.1f), EnPhase(CatalogueHud.Pouls, 1f), 1e-4f);
            Assert.AreEqual(TopBarController.Tremblement(0.07f), EnPhase(CatalogueHud.Tremble, 0.5f), 1e-4f, "même SIGNE que l'existant épinglé");
            Assert.AreEqual(TopBarController.Tremblement(0f), EnPhase(CatalogueHud.Tremble, 0f), 1e-4f);

            Color32 milieu = (Color32)Gyrophare.TeinteA(0.45f);
            Color depart = CatalogueHud.Gyrophare.Mouvement.CouleurA.Resoudre(default);
            Assert.AreEqual(milieu, (Color32)Couleurs.HueRotate(depart, EnPhase(CatalogueHud.Gyrophare, 0.5f)), "TeinteA(0,45 s) = la hue de l'image clé du milieu");
            Assert.AreEqual((Color32)Gyrophare.Teinte, (Color32)depart, "la teinte du canon, #ff5a3c");
            Assert.AreEqual((Color32)Gyrophare.TeinteA(0f), (Color32)Couleurs.HueRotate(depart, EnPhase(CatalogueHud.Gyrophare, 0f)));
        }

        [Test]
        public void Migration_LesVirages_PartentDuLaitonVersLaBraise_LesJetonsDuChrome()
        {
            // §9/E1 — une donnée `static readonly` ne lit pas l'asset de tokens : elle porte les valeurs de `hudHairlineGold`
            // (--laiton, calme) et `hudGaugeArcHot` (--braise, chaud) ; ce test les compare, à 1/255 près, aux jetons vivants
            Color calme = DesignTokens.Current.hudHairlineGold, chaud = DesignTokens.Current.hudGaugeArcHot;
            foreach (Entree e in new[] { CatalogueHud.FiletVirage, CatalogueHud.AnneauVirage })
            {
                Color a = e.Mouvement.CouleurA.Resoudre(default), b = e.Mouvement.CouleurB.Resoudre(default);
                Assert.LessOrEqual(Couleurs.EcartRvb(a, calme), 1f / 255f + 1e-4f, e.Id + " : CouleurA = laiton");
                Assert.LessOrEqual(Couleurs.EcartRvb(b, chaud), 1f / 255f + 1e-4f, e.Id + " : CouleurB = braise");
            }
            // contrôle négatif : le comparateur sait voir une dérive d'un token
            Assert.Greater(Couleurs.EcartRvb(Couleurs.Rvb(0xb08d3e), Couleurs.Rvb(0xb08d50)), 1f / 255f + 1e-4f);
        }
    }
}
