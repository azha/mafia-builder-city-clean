using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using UnityEngine.TestTools.Constraints;
using Is = UnityEngine.TestTools.Constraints.Is;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Mouvements.Tests
{
    // CLIENT-3 / E1 (design-couche-mouvement.md v4.3 §3, §4, §5) — la régie, sur une vraie régie et un vrai arbre d'uGUI.
    //   Quotas_*  §4  48 pistes : 16 Alerte/Retour/Transition, 32 Ambiance
    //   Tick_*    §3  idempotence ; ordre ; cible détruite
    //   Compo*    §3  base ⊕ pistes (Additif +, Multiplicatif ×, Absolu remplace)
    //   G12_*     §3 + dette 4  deux Absolu refusés SAUF le remplacement d'une Transitionner en vol
    //   Resti*    §3 + §16  `Detacher` restitue (CouleurA = Cible : chaque bouton à SA couleur)
    //   Rebaser_*, Detection_*  §3  base = propriété du propriétaire ; epsilons ; DeltaAngle
    //   HorsChamp_*  §3/§4/§6.4  30 s MESURÉES SUR L'HORLOGE DE LA RÉGIE
    //   Cadence_*, Delestage_*  §4
    //   Gel_*     §5  mouvement réduit
    [Category("Mouvement")]
    public class MouvementsRegiePlayModeTests
    {
        private readonly List<Object> montes = new List<Object>();
        private Regie regie;
        private HorlogeFigee horloge;

        [SetUp]
        public void SetUp()
        {
            regie = RegieMouvement.PourTest();
            horloge = (HorlogeFigee)regie.Horloge;
        }

        [TearDown]
        public void TearDown()
        {
            RegieMouvement.Oublier();
            AidesMouvement.Oublier(montes);
        }

        private Entree Admise(Entree e)
        {
            regie.Admettre(e);
            return e;
        }

        private RectTransform Rect(string nom = "cible") => AidesMouvement.Rect(montes, nom);
        private Image Img(string nom, Color c) => AidesMouvement.Img(montes, nom, c);

        private Entree Constante(string id, Genre g, Propriete p, Mode m, float v) =>
            Admise(AidesMouvement.Faire(id, AidesMouvement.Constant(id, g, p, m, v)));

        // ------------------------------------------------------------------------------------------ quotas (§4)

        private Entree MelangeDe(string id, Genre g)
        {
            var def = new MouvementDefini(id, g, 1f,
                new[] { new Canal(Propriete.Melange, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(0.5f, 1f), AidesMouvement.K(1f, 0f) }) },
                Iteration.InfiniFois, poseDeReposS: 0.5f, couleurA: CouleurSpec.Cible, couleurB: CouleurSpec.CibleFois(0.85f));
            return Admise(AidesMouvement.Faire(id, def));
        }

        [Test]
        public void E0_Quota_9eMelangeRefuse_EtCompte()
        {
            // E0 (créneau du 08/10, décision f2) — « au plus 8 pistes Melange vivantes à la fois ; refus COMPTÉ au-delà ».
            // Mesuré au spike : Graphic.color reconstruit les lots, ≈ 100 × le coût d'un CanvasGroup.alpha.
            Entree m = MelangeDe("t.melange", Genre.Alerte);
            for (int i = 0; i < MouvementTunables.PistesMelangeMax; i++)
                Assert.IsFalse(regie.Attacher(m, Img("m" + i, Color.white).rectTransform, Reglage.Defaut).EstNul, "Melange n° " + (i + 1));
            Assert.AreEqual(8, regie.PistesMelange);
            Assert.IsTrue(regie.Attacher(m, Img("m9", Color.white).rectTransform, Reglage.Defaut).EstNul, "la 9e piste Melange est refusée");
            Assert.AreEqual(1, regie.RefusMelange, "…comptée dans RefusMelange");
            Assert.AreEqual(1, regie.Refus, "…et dans Refus");
            // contrôle : une piste ALPHA reste acceptée (le quota Melange ne mange pas le quota Alerte)
            Entree a = Constante("t.alpha", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.9f);
            Assert.IsFalse(regie.Attacher(a, Rect("a1"), Reglage.Defaut).EstNul, "un Alpha passe encore");
        }

        [Test]
        public void E0_MelangeSurAmbiance_Refuse()
        {
            // E0 (décision f2, 08/10) — « Melange interdit aux Ambiance » : la matière qui vit toute seule passe par l'Alpha.
            Entree amb = MelangeDe("t.melange.amb", Genre.Ambiance);
            Assert.IsTrue(regie.Attacher(amb, Img("amb", Color.white).rectTransform, Reglage.Defaut).EstNul);
            Assert.AreEqual(1, regie.RefusMelange);
            Assert.AreEqual(0, regie.PistesMelange);
            // contrôle négatif : la même entrée en Alerte est acceptée
            Entree ale = MelangeDe("t.melange.ale", Genre.Alerte);
            Assert.IsFalse(regie.Attacher(ale, Img("ale", Color.white).rectTransform, Reglage.Defaut).EstNul);
            Assert.AreEqual(1, regie.PistesMelange);
        }

        [Test]
        public void Quotas_33eAmbianceRefusee_AlerteEncoreAcceptee()
        {
            // §4 — « 48 pistes, quota réservé : 16 Alerte/Retour/Transition, 32 Ambiance ; refus compté et journalisé »
            Entree lampe = Admise(AidesMouvement.Faire("t.lampe", AidesMouvement.Lampe("lampe")));
            Entree alerte = Constante("t.alerte", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.9f);

            for (int i = 0; i < 32; i++)
                Assert.IsFalse(regie.Attacher(lampe, Rect("a" + i), Reglage.Defaut).EstNul, "Ambiance n° " + (i + 1));
            Assert.AreEqual(32, regie.PistesVivantes);

            Assert.IsTrue(regie.Attacher(lampe, Rect("a33"), Reglage.Defaut).EstNul, "la 33e Ambiance est refusée");
            Assert.AreEqual(1, regie.Refus, "…et comptée");
            Assert.AreEqual(32, regie.PistesVivantes);

            Assert.IsFalse(regie.Attacher(alerte, Rect("al1"), Reglage.Defaut).EstNul, "une Alerte est encore acceptée : son quota est réservé");
            for (int i = 2; i <= 16; i++)
                Assert.IsFalse(regie.Attacher(alerte, Rect("al" + i), Reglage.Defaut).EstNul, "Alerte n° " + i);
            Assert.AreEqual(48, regie.PistesVivantes, "32 + 16 : le plafond");
            Assert.IsTrue(regie.Attacher(alerte, Rect("al17"), Reglage.Defaut).EstNul, "la 17e Alerte/Retour/Transition est refusée");
            Assert.AreEqual(2, regie.Refus);
        }

        [Test]
        public void Quotas_LeDetacherRendLEmplacement()
        {
            // §4 — un emplacement libéré est réutilisable (le plafond est sur les pistes VIVANTES)
            Entree lampe = Admise(AidesMouvement.Faire("t.lampe", AidesMouvement.Lampe("lampe")));
            var h = new Handle[32];
            for (int i = 0; i < 32; i++) h[i] = regie.Attacher(lampe, Rect("a" + i), Reglage.Defaut);
            Assert.IsTrue(regie.Attacher(lampe, Rect("trop"), Reglage.Defaut).EstNul);
            regie.Detacher(h[7]);
            Assert.AreEqual(31, regie.PistesVivantes);
            Assert.IsFalse(regie.Attacher(lampe, Rect("repris"), Reglage.Defaut).EstNul);
        }

        [Test]
        public void Hote_SansHote_EstRefuse_EtCompte()
        {
            // §3 — une entrée `SansHote:<raison>` existe au catalogue mais n'a pas d'hôte : jamais attachée, comptée
            Entree sans = Admise(AidesMouvement.Faire("t.sanshote", AidesMouvement.Lampe("l"), hote: "SansHote:cadran absent"));
            Assert.IsTrue(regie.Attacher(sans, Rect(), Reglage.Defaut).EstNul);
            Assert.AreEqual(1, regie.Refus);
            Assert.AreEqual(0, regie.PistesVivantes);
        }

        [Test]
        public void Attacher_HorsCatalogue_Leve()
        {
            // §3 — « lève si e hors catalogue » (G1)
            Entree inconnue = AidesMouvement.Faire("t.inconnue", AidesMouvement.Lampe("l"));
            Assert.Throws<ArgumentException>(() => regie.Attacher(inconnue, Rect(), Reglage.Defaut));
            Assert.Throws<ArgumentException>(() => regie.Transitionner(inconnue, Rect(), 0f, 1f));
            // une AUTRE instance de même Id n'est pas l'entrée admise
            Admise(inconnue);
            Entree sosie = AidesMouvement.Faire("t.inconnue", AidesMouvement.Lampe("l"));
            Assert.Throws<ArgumentException>(() => regie.Attacher(sosie, Rect(), Reglage.Defaut));
            // contrôle positif
            Assert.IsFalse(regie.Attacher(inconnue, Rect(), Reglage.Defaut).EstNul);
            // les entrées du HUD sont admises d'office
            Assert.IsFalse(regie.Attacher(CatalogueHud.Tremble, Rect(), Reglage.Defaut).EstNul);
        }

        [Test]
        public void Transitionner_ExigeUnSeulCanalAbsolu()
        {
            // §3 — `Transitionner` passe d'une valeur à une autre sur UN canal : un mouvement additif ou multi-canal n'en est pas un
            Entree additive = Constante("t.add", Genre.Transition, Propriete.TranslationX, Mode.Additif, 3f);
            Assert.Throws<ArgumentException>(() => regie.Transitionner(additive, Rect(), 0f, 1f));
            var deux = new MouvementDefini("deux", Genre.Transition, 0.2f,
                new[]
                {
                    new Canal(Propriete.Alpha, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }),
                    new Canal(Propriete.Rotation, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }),
                }, Iteration.Fois(1));
            Entree multi = Admise(AidesMouvement.Faire("t.deux", deux));
            Assert.Throws<ArgumentException>(() => regie.Transitionner(multi, Rect(), 0f, 1f));
        }

        // ------------------------------------------------------------------------------------------ Tick (§3)

        [Test]
        public void Tick_Idempotent_PourUnMemeT_AucunDeltaDouble()
        {
            // §3 — « Tick idempotent : deux appels au même t (planche + Update) n'ajoutent pas deux deltas »
            Entree scie = Admise(AidesMouvement.Faire("t.scie",
                AidesMouvement.Rampe("scie", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 0f, 10f, 1f, Iteration.InfiniFois, 0.5f)));
            RectTransform c = Rect();
            regie.Attacher(scie, c, Reglage.Defaut);
            regie.Tick(0f);
            regie.Tick(0.5f);
            Assert.AreEqual(5f, c.anchoredPosition.x, 1e-3f);
            int evals = regie.Evaluations, ecr = regie.Ecritures;
            regie.Tick(0.5f);
            regie.Tick(0.5f);
            Assert.AreEqual(5f, c.anchoredPosition.x, 1e-3f, "le même t rappelé n'ajoute rien");
            Assert.AreEqual(evals, regie.Evaluations);
            Assert.AreEqual(ecr, regie.Ecritures);
            // contrôle négatif : un t DIFFÉRENT avance bien (l'idempotence n'est pas « Tick ne fait plus rien »)
            regie.Tick(0.75f);
            Assert.AreEqual(7.5f, c.anchoredPosition.x, 1e-3f);
        }

        [Test]
        public void Tick_DeuxPistesAdditivesSurLeMemeCouple_SAdditionnentUneFoisParTick()
        {
            // §3 — idempotence avec composition : planche + Update au même t, deux pistes, un seul total
            Entree scie = Admise(AidesMouvement.Faire("t.scie",
                AidesMouvement.Rampe("scie", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 0f, 10f, 1f, Iteration.InfiniFois, 0.5f)));
            Entree scie2 = Admise(AidesMouvement.Faire("t.scie2",
                AidesMouvement.Rampe("scie2", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 0f, 10f, 1f, Iteration.InfiniFois, 0.5f)));
            RectTransform c = Rect();
            regie.Attacher(scie, c, Reglage.Defaut);
            regie.Attacher(scie2, c, Reglage.Defaut);
            regie.Tick(0f);
            regie.Tick(0.5f);
            regie.Tick(0.5f);
            Assert.AreEqual(10f, c.anchoredPosition.x, 1e-3f, "5 + 5, pas 20");
        }

        [Test]
        public void Tick_CibleDetruite_PisteLiberee_SansException()
        {
            // §3 ordre (1) — « cible nulle ⇒ libérée »
            Entree e = Constante("t.c", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.5f);
            RectTransform c = Rect();
            regie.Attacher(e, c, Reglage.Defaut);
            regie.Attacher(e, Rect("autre"), Reglage.Defaut);
            Assert.AreEqual(2, regie.PistesVivantes);
            Object.DestroyImmediate(c.gameObject);
            Assert.DoesNotThrow(() => regie.Tick(0f));
            Assert.AreEqual(1, regie.PistesVivantes);
        }

        [Test]
        public void Tick_NAllouePas_EnRegime()
        {
            // §4 + X3 — « 0 octet alloué par Tick » : le chrome en descente (pouls ×2, tremble, gyrophare), une transition d'aiguille
            // en vol et cinq ambiances. `Is.Not.AllocatingGCMemory()` du test-framework 1.6.0 (aucun précédent dans le dépôt : un outil).
            Entree lampe = Admise(AidesMouvement.Faire("t.lampe", AidesMouvement.Lampe("lampe")));
            regie.Attacher(CatalogueHud.Pouls, Rect("cerclage"), Reglage.Defaut);
            regie.Attacher(CatalogueHud.Pouls, Rect("filet"), Reglage.Defaut);
            regie.Attacher(CatalogueHud.Tremble, Rect("aiguille"), Reglage.Defaut);
            Image gyro = Img("gyro", Couleurs.Rvb(0xff5a3c));
            regie.Attacher(CatalogueHud.Gyrophare, (RectTransform)gyro.transform, Reglage.Defaut);
            regie.Transitionner(CatalogueHud.AiguilleBalayage, Rect("aiguille2"), -42f, 52f);
            for (int i = 0; i < 5; i++) regie.Attacher(lampe, Rect("lampe" + i), Reglage.AvecPhase(-i * 0.7f));
            Assert.AreEqual(10, regie.PistesVivantes);

            for (int k = 0; k < 60; k++) regie.Tick(k * 0.0167f);   // échauffement : JIT, premières écritures

            float t0 = 2f;
            Assert.That(() =>
            {
                for (int k = 0; k < 120; k++) regie.Tick(t0 + k * 0.0167f);
            }, Is.Not.AllocatingGCMemory());
            Assert.Greater(regie.Ecritures, 10, "et la mesure a porté sur des ticks qui ÉCRIVENT");
        }

        // ------------------------------------------------------------------------------------------ composition (§3)

        [Test]
        public void Composition_Base_Additif_Multiplicatif()
        {
            // §3 — valeur = base ⊕ pistes : Additif s'additionnent, Multiplicatif se multiplient, la base est celle du PROPRIÉTAIRE
            RectTransform c = Rect();
            c.anchoredPosition = new Vector2(10f, 0f);
            var cg = c.gameObject.AddComponent<CanvasGroup>();
            cg.alpha = 0.5f;
            regie.Attacher(Constante("t.add3", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 3f), c, Reglage.Defaut);
            regie.Attacher(Constante("t.add4", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 4f), c, Reglage.Defaut);
            regie.Attacher(Constante("t.mul1", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.5f), c, Reglage.Defaut);
            regie.Attacher(Constante("t.mul2", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.5f), c, Reglage.Defaut);
            regie.Tick(0f);
            Assert.AreEqual(17f, c.anchoredPosition.x, 1e-3f, "10 + 3 + 4");
            Assert.AreEqual(0.125f, cg.alpha, 1e-3f, "0,5 × 0,5 × 0,5 — le CanvasGroup préexistant est RÉUTILISÉ");
            Assert.AreEqual(1, c.GetComponents<CanvasGroup>().Length, "jamais un second CanvasGroup");
        }

        [Test]
        public void Composition_UnAbsolu_RemplaceLaBase_LeTrembleSePoseDessus()
        {
            // §3/§9 — le balayage d'aiguille (Rotation Absolu, Transitionner) fournit la base ; le tremblement Additif se pose dessus
            RectTransform aiguille = Rect("aiguille");
            aiguille.localEulerAngles = new Vector3(0f, 0f, -42f);
            regie.Transitionner(CatalogueHud.AiguilleBalayage, aiguille, -42f, 52f);
            regie.Attacher(CatalogueHud.Tremble, aiguille, Reglage.Defaut);
            regie.Tick(0f);
            regie.Tick(0.35f);
            float balayage = -42f + 94f * Aisance.Ease.Evaluer(0.5f);
            Assert.AreEqual(balayage - 4f, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 0.05f, "balayage à mi-course, tremblement à −4°");
            regie.Tick(0.7f);
            Assert.AreEqual(52f, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 0.05f, "fin du balayage : la bande 52°, le tremblement revenu à 0");
        }

        // ------------------------------------------------------------------------------------------ G12 et remplacement (§3, dette 4)

        [Test]
        public void G12_DeuxAbsolu_SurLeMemeCouple_SontRefuses_QuandLOccupantVientDUnAttacher()
        {
            // §3 — « deux Absolu refusés (G12) » ; dette 4 : un occupant issu d'ATTACHER fait REFUSER un second Absolu
            Entree a1 = Constante("t.abs1", Genre.Alerte, Propriete.Rotation, Mode.Absolu, 10f);
            Entree a2 = Constante("t.abs2", Genre.Alerte, Propriete.Rotation, Mode.Absolu, 20f);
            RectTransform c = Rect();
            Handle h1 = regie.Attacher(a1, c, Reglage.Defaut);
            Assert.IsFalse(h1.EstNul);
            Assert.IsTrue(regie.Attacher(a2, c, Reglage.Defaut).EstNul, "second Absolu sur le même couple : refusé");
            Assert.AreEqual(1, regie.Refus);
            Assert.AreEqual(1, regie.PistesVivantes);
            Assert.IsTrue(regie.EstVivant(h1), "l'occupant n'est pas touché");
            // contrôle négatif : une AUTRE cible, ou une AUTRE propriété, ne sont pas en conflit
            Assert.IsFalse(regie.Attacher(a2, Rect("autre"), Reglage.Defaut).EstNul);
            Entree sur = Constante("t.abs3", Genre.Alerte, Propriete.Alpha, Mode.Absolu, 0.5f);
            Assert.IsFalse(regie.Attacher(sur, c, Reglage.Defaut).EstNul);
        }

        [Test]
        public void G12_UneTransitionnerEnVol_EstRemplacee_ParUneAutreTransitionnerOuUnAttacherAbsolu()
        {
            // §3 « Interruptibilité » + dette 4 — un occupant issu de TRANSITIONNER est REMPLACÉ (la dernière gagne), pas un conflit
            Entree t1 = Admise(AidesMouvement.Faire("t.tr1", AidesMouvement.Rampe("tr", Genre.Transition, Propriete.Rotation, Mode.Absolu, 0f, 1f, 0.7f, Iteration.Fois(1))));
            Entree abs = Constante("t.abs", Genre.Alerte, Propriete.Rotation, Mode.Absolu, 33f);
            RectTransform c = Rect();

            Handle h1 = regie.Transitionner(t1, c, 0f, 10f);
            Handle h2 = regie.Transitionner(t1, c, 10f, 20f);
            Assert.IsFalse(h2.EstNul);
            Assert.IsFalse(regie.EstVivant(h1), "la première transition est remplacée");
            Assert.IsTrue(regie.EstVivant(h2));
            Assert.AreEqual(1, regie.PistesVivantes);
            Assert.AreEqual(0, regie.Refus, "un remplacement n'est pas un refus");

            Handle h3 = regie.Attacher(abs, c, Reglage.Defaut);
            Assert.IsFalse(h3.EstNul, "un Attacher Absolu remplace aussi une transition en vol");
            Assert.IsFalse(regie.EstVivant(h2));
            Assert.AreEqual(1, regie.PistesVivantes);

            // dette 4, l'autre sens : l'occupant est maintenant un Attacher ⇒ une Transitionner est REFUSÉE
            Assert.IsTrue(regie.Transitionner(t1, c, 0f, 1f).EstNul, "un occupant issu d'Attacher n'est pas remplaçable");
            Assert.AreEqual(1, regie.Refus);
            Assert.IsTrue(regie.EstVivant(h3));
        }

        [Test]
        public void G12_LeRemplacement_NAppellePasLeQuandFiniDeLaPisteRemplacee()
        {
            // §3 — remplacer = annuler : l'ancien `quandFini` ne part pas
            Entree t1 = Admise(AidesMouvement.Faire("t.tr1", AidesMouvement.Rampe("tr", Genre.Transition, Propriete.Alpha, Mode.Absolu, 0f, 1f, 0.2f, Iteration.Fois(1))));
            RectTransform c = Rect();
            int premier = 0, second = 0;
            regie.Transitionner(t1, c, 1f, 0f, h => premier++);
            regie.Tick(0f);
            regie.Transitionner(t1, c, 0.5f, 1f, h => second++);
            regie.Tick(0.1f);
            regie.Tick(0.4f);
            Assert.AreEqual(0, premier);
            Assert.AreEqual(1, second);
        }

        // ------------------------------------------------------------------------------------------ restitution (§3, §16)

        [Test]
        public void Restitution_CouleurACible_ChaqueBoutonRetrouveLaSienne()
        {
            // §16 + §3 — `CouleurA = Cible` : `Detacher` restitue la couleur DE LA CIBLE. Deux boutons de couleurs différentes.
            var appui = Admise(AidesMouvement.Faire("t.appui", new MouvementDefini("appui", Genre.Retour, 0.09f,
                new[] { new Canal(Propriete.Melange, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }) },
                Iteration.Fois(1), couleurA: CouleurSpec.Cible, couleurB: CouleurSpec.CibleFois(0.5f))));
            var c1 = new Color(0.8f, 0.2f, 0.2f, 0.9f);
            var c2 = new Color(0.2f, 0.6f, 0.9f, 1f);
            Image b1 = Img("b1", c1), b2 = Img("b2", c2);
            Handle h1 = regie.Attacher(appui, (RectTransform)b1.transform, Reglage.Defaut);
            Handle h2 = regie.Attacher(appui, (RectTransform)b2.transform, Reglage.Defaut);
            regie.Tick(0f);
            regie.Tick(0.09f);
            Assert.AreEqual(0.4f, b1.color.r, 1e-3f, "× 0,5 par canal RGB");
            Assert.AreEqual(0.3f, b2.color.g, 1e-3f);
            Assert.AreEqual(0.9f, b1.color.a, 1e-6f, "l'alpha du Graphic n'est jamais touché");

            regie.Detacher(h1);
            regie.Detacher(h2);
            Assert.AreEqual(c1, b1.color, "restitué à SA couleur, alpha compris");
            Assert.AreEqual(c2, b2.color);
            Assert.AreEqual(0, regie.PistesVivantes);
        }

        [Test]
        public void Restitution_CouleurANommee_RepeintTousLesBoutonsDeLaMemeCouleur_LeDefautQueCibleCorrige()
        {
            // §16 (contrôle négatif) — avec une `CouleurA` STATIQUE, `Detacher` repeint les deux boutons de la même couleur :
            // c'est le défaut qui a fait ajouter `Cible`. Ce test montre que la restitution distingue bien les deux cas.
            var appui = Admise(AidesMouvement.Faire("t.appui.nommee", new MouvementDefini("appui", Genre.Retour, 0.09f,
                new[] { new Canal(Propriete.Melange, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }) },
                Iteration.Fois(1), couleurA: CouleurSpec.Nommee("gris", new Color(0.5f, 0.5f, 0.5f)), couleurB: CouleurSpec.Nommee("noir", Color.black))));
            Image b1 = Img("b1", new Color(0.8f, 0.2f, 0.2f)), b2 = Img("b2", new Color(0.2f, 0.6f, 0.9f));
            Handle h1 = regie.Attacher(appui, (RectTransform)b1.transform, Reglage.Defaut);
            Handle h2 = regie.Attacher(appui, (RectTransform)b2.transform, Reglage.Defaut);
            regie.Tick(0f);
            regie.Detacher(h1);
            regie.Detacher(h2);
            Assert.AreEqual(b1.color, b2.color, "même couleur restituée aux deux : la couleur nommée");
            Assert.AreEqual(0.5f, b1.color.r, 1e-4f);
        }

        [Test]
        public void Restitution_Alpha_CanvasGroupPose_Vers1_Preexistant_VersLaValeurDAvant()
        {
            // §3 — « CanvasGroup posé par la régie → 1 (ou la valeur d'avant s'il préexistait) »
            Entree demi = Constante("t.demi", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.3f);
            RectTransform nu = Rect("nu");
            Handle hn = regie.Attacher(demi, nu, Reglage.Defaut);
            regie.Tick(0f);
            var posé = nu.GetComponent<CanvasGroup>();
            Assert.IsNotNull(posé, "la régie pose le CanvasGroup sur la cible elle-même");
            Assert.AreEqual(0.3f, posé.alpha, 1e-3f);
            regie.Detacher(hn);
            Assert.AreEqual(1f, posé.alpha, 1e-6f, "posé par la régie ⇒ 1");

            RectTransform avec = Rect("avec");
            var cg = avec.gameObject.AddComponent<CanvasGroup>();
            cg.alpha = 0.7f;
            Handle ha = regie.Attacher(demi, avec, Reglage.Defaut);
            regie.Tick(1f);
            Assert.AreEqual(0.21f, cg.alpha, 1e-3f);
            regie.Detacher(ha);
            Assert.AreEqual(0.7f, cg.alpha, 1e-6f, "préexistant ⇒ la valeur d'avant");
        }

        [Test]
        public void Restitution_Transforms_Eclat_Hue_Remplissage()
        {
            // §3 — transform → base ; Eclat → 0 ; Hue → CouleurA ; Remplissage → base
            RectTransform t = Rect("t");
            t.anchoredPosition = new Vector2(4f, 6f);
            t.localEulerAngles = new Vector3(0f, 0f, 15f);
            t.localScale = new Vector3(2f, 3f, 1f);
            Handle hx = regie.Attacher(Constante("t.x", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 9f), t, Reglage.Defaut);
            Handle hy = regie.Attacher(Constante("t.y", Genre.Alerte, Propriete.TranslationY, Mode.Additif, -9f), t, Reglage.Defaut);
            Handle hr = regie.Attacher(Constante("t.r", Genre.Alerte, Propriete.Rotation, Mode.Additif, 30f), t, Reglage.Defaut);
            Handle he = regie.Attacher(Constante("t.e", Genre.Alerte, Propriete.Echelle, Mode.Multiplicatif, 0.5f), t, Reglage.Defaut);
            regie.Tick(0f);
            Assert.AreEqual(13f, t.anchoredPosition.x, 1e-3f);
            Assert.AreEqual(-3f, t.anchoredPosition.y, 1e-3f);
            Assert.AreEqual(45f, Mathf.DeltaAngle(0f, t.localEulerAngles.z), 0.02f);
            Assert.AreEqual(1f, t.localScale.x, 1e-3f);
            Assert.AreEqual(1.5f, t.localScale.y, 1e-3f, "Echelle uniforme : chaque axe × 0,5 de SA base");
            regie.Detacher(hx); regie.Detacher(hy); regie.Detacher(hr); regie.Detacher(he);
            Assert.AreEqual(new Vector2(4f, 6f), t.anchoredPosition);
            Assert.AreEqual(15f, Mathf.DeltaAngle(0f, t.localEulerAngles.z), 0.02f);
            Assert.AreEqual(new Vector3(2f, 3f, 1f), t.localScale);

            // Eclat : calque enfant nommé `Eclat`
            RectTransform pere = Rect("pere");
            Image eclat = AidesMouvement.Img(montes, "Eclat", new Color(1f, 1f, 1f, 0f), pere);
            Entree lumiere = Admise(AidesMouvement.Faire("t.eclat", AidesMouvement.Rampe("e", Genre.Transition, Propriete.Eclat, Mode.Absolu, 0f, 0.6f, 1f, Iteration.Fois(1))));
            Handle hl = regie.Attacher(lumiere, pere, Reglage.Defaut);
            regie.Tick(2f); regie.Tick(3f);
            Assert.AreEqual(0.6f, eclat.color.a, 1e-3f);
            regie.Detacher(hl);
            Assert.AreEqual(0f, eclat.color.a, 1e-6f, "Eclat → 0");
            // sans calque `Eclat`, l'entrée est refusée (rien d'invisible n'est attaché)
            Assert.IsTrue(regie.Attacher(lumiere, Rect("sans-calque"), Reglage.Defaut).EstNul);

            // Hue : CouleurA, alpha préservé
            Image gyro = Img("gyro", new Color(1f, 0.35f, 0.24f, 0.73f));
            Handle hg = regie.Attacher(CatalogueHud.Gyrophare, (RectTransform)gyro.transform, Reglage.Defaut);
            regie.Tick(10f); regie.Tick(10.45f);
            Color32 bleu = gyro.color;
            Assert.That(Mathf.Abs(bleu.r - 62) <= 1 && Mathf.Abs(bleu.g - 128) <= 1 && Mathf.Abs(bleu.b - 255) <= 1, $"hue −140° = #3e80ff ; {bleu}");
            Assert.AreEqual(0.73f, gyro.color.a, 1e-6f, "Hue n'écrit que le RGB");
            regie.Detacher(hg);
            Color32 rendu = gyro.color;
            Assert.That(rendu.r == 0xff && rendu.g == 0x5a && rendu.b == 0x3c, $"restitué à CouleurA (#ff5a3c) ; {rendu}");
            Assert.AreEqual(0.73f, gyro.color.a, 1e-6f);

            // Remplissage : base
            Image arc = Img("arc", Color.white);
            arc.fillAmount = 0.1f;
            Entree appui = Admise(AidesMouvement.Faire("t.arc", AidesMouvement.Rampe("arc", Genre.Retour, Propriete.Remplissage, Mode.Absolu, 0f, 1f, 1f, Iteration.Fois(1))));
            Handle ha = regie.Attacher(appui, (RectTransform)arc.transform, Reglage.Defaut);
            regie.Tick(20f); regie.Tick(20.5f);
            Assert.AreEqual(0.5f, arc.fillAmount, 1e-3f);
            regie.Detacher(ha);
            Assert.AreEqual(0.1f, arc.fillAmount, 1e-6f);
        }

        [Test]
        public void Restitution_UnHandlePerime_NeDetachePasLaPisteDUnAutre()
        {
            // §3 — l'emplacement est recyclé : le jeton porte une génération
            Entree e = Constante("t.c", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.5f);
            Handle ancien = regie.Attacher(e, Rect("un"), Reglage.Defaut);
            regie.Detacher(ancien);
            Handle neuf = regie.Attacher(e, Rect("deux"), Reglage.Defaut);
            regie.Detacher(ancien);
            Assert.IsTrue(regie.EstVivant(neuf), "le Detacher tardif n'a rien emporté");
            regie.Detacher(Handle.Nul);
            Assert.AreEqual(1, regie.PistesVivantes);
        }

        [Test]
        public void DetacherSous_LibereToutLeSousArbre_PasLeReste()
        {
            // §3 — `DetacherSous(racine)` : un écran qui se démonte rend ses pistes
            Entree e = Constante("t.c", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.5f);
            RectTransform ecran = Rect("ecran");
            RectTransform a = AidesMouvement.Rect(montes, "a", ecran), b = AidesMouvement.Rect(montes, "b", a), dehors = Rect("dehors");
            regie.Attacher(e, a, Reglage.Defaut);
            regie.Attacher(e, b, Reglage.Defaut);
            regie.Attacher(e, dehors, Reglage.Defaut);
            regie.Tick(0f);
            regie.DetacherSous(ecran);
            Assert.AreEqual(1, regie.PistesVivantes);
            Assert.AreEqual(1f, a.GetComponent<CanvasGroup>().alpha, 1e-6f, "restitué");
        }

        // ------------------------------------------------------------------------------------------ Rebaser et détection (§3)

        [Test]
        public void Rebaser_Explicite_LaBaseDevientLaValeurDuProprietaire()
        {
            // §3 mécanisme 1 — le propriétaire écrit une propriété animée, puis appelle `Rebaser`
            RectTransform c = Rect();
            c.anchoredPosition = new Vector2(10f, 0f);
            regie.Attacher(Constante("t.add3", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 3f), c, Reglage.Defaut);
            regie.Tick(0f);
            Assert.AreEqual(13f, c.anchoredPosition.x, 1e-3f);
            c.anchoredPosition = new Vector2(100f, 0f);
            regie.Rebaser(c, Propriete.TranslationX);
            regie.Tick(1f);
            Assert.AreEqual(103f, c.anchoredPosition.x, 1e-3f, "base 100 + 3");
        }

        [Test]
        public void Detection_UnProprietaireOublie_EstRattrape_ParLesEpsilons()
        {
            // §3 mécanisme 2 — sans Rebaser, l'écart > epsilon de la propriété (translation 0,05 px) fait relire la base
            RectTransform c = Rect();
            regie.Attacher(Constante("t.add3", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 3f), c, Reglage.Defaut);
            regie.Tick(0f);
            Assert.AreEqual(3f, c.anchoredPosition.x, 1e-3f);
            c.anchoredPosition = new Vector2(50f, 0f);            // le propriétaire réécrit, sans Rebaser
            regie.Tick(1f);
            Assert.AreEqual(53f, c.anchoredPosition.x, 1e-3f, "détecté : base 50 + 3");
            // contrôle négatif : un écart SOUS l'epsilon n'est pas une réécriture, et la régie n'écrit pas non plus
            int ecritures = regie.Ecritures;
            c.anchoredPosition = new Vector2(53.01f, 0f);
            regie.Tick(2f);
            Assert.AreEqual(53.01f, c.anchoredPosition.x, 1e-4f, "écriture seulement au-delà de l'epsilon");
            Assert.AreEqual(ecritures, regie.Ecritures);
        }

        [Test]
        public void Detection_Rotation_BandeNegative_ParDeltaAngle()
        {
            // §3 — `localEulerAngles` est normalisé dans [0,360) alors que les bandes sont négatives (−42°) : comparaison par
            // `Mathf.DeltaAngle`, jamais en brut
            RectTransform aiguille = Rect("aiguille");
            aiguille.localEulerAngles = new Vector3(0f, 0f, -42f);
            Assert.Greater(aiguille.localEulerAngles.z, 300f, "(le piège : Unity relit 318°)");
            Handle h = regie.Attacher(CatalogueHud.Tremble, aiguille, Reglage.Defaut);
            regie.Tick(0f);
            regie.Tick(0.07f);
            Assert.AreEqual(-46f, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 0.02f, "−42 + (−4)");

            aiguille.localEulerAngles = new Vector3(0f, 0f, -10f);     // le propriétaire change de bande, sans Rebaser
            regie.Tick(0.14f);
            Assert.AreEqual(-10f, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 0.02f, "détecté : base −10, tremblement revenu à 0");

            // CONTRÔLE NÉGATIF — les écritures de la régie ne sont jamais prises pour celles du propriétaire (pas de cliquet) :
            // 300 ticks de tremblement, puis `Detacher` rend la base d'AVANT, pas une base ratchetée
            aiguille.localEulerAngles = new Vector3(0f, 0f, -42f);
            regie.Rebaser(aiguille, Propriete.Rotation);
            for (int k = 1; k <= 300; k++) regie.Tick(1f + k * 0.0173f);
            regie.Detacher(h);
            Assert.AreEqual(-42f, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 0.011f);
        }

        // ------------------------------------------------------------------------------------------ fin d'animation (§3)

        [Test]
        public void QuandFini_UneSeuleFois_ApresLEcriture_EtLaPisteTientSaValeurFinale()
        {
            // §3 « Fin d'animation » — `quandFini` appelé UNE fois, après l'écriture de la dernière image ; la piste tient `vers`
            // jusqu'au `Detacher` (le bandeau : fondu → `Effacer` détache)
            Entree sortie = CatalogueHud.BandeauSortie;
            RectTransform bandeau = Rect("bandeau");
            var cg = bandeau.gameObject.AddComponent<CanvasGroup>();
            int appels = 0;
            float alphaAuRappel = -1f;
            Action<Handle> fini = h => { appels++; alphaAuRappel = cg.alpha; regie.Detacher(h); };
            Handle hb = regie.Transitionner(sortie, bandeau, 1f, 0f, fini);
            regie.Tick(0f);
            regie.Tick(0.2f);
            Assert.AreEqual(0.5f, cg.alpha, 1e-3f, "fondu linéaire à mi-course");
            Assert.AreEqual(0, appels);
            regie.Tick(0.4f);
            Assert.AreEqual(1, appels);
            Assert.AreEqual(0f, alphaAuRappel, 1e-4f, "la dernière image (0) est ÉCRITE avant le rappel");
            Assert.IsFalse(regie.EstVivant(hb), "le rappel a détaché");
            Assert.AreEqual(1f, cg.alpha, 1e-6f, "…et Detacher a restitué");
            regie.Tick(0.5f); regie.Tick(0.6f);
            Assert.AreEqual(1, appels, "jamais deux fois");

            // sans Detacher : la piste TIENT la valeur finale
            int n = 0;
            RectTransform b2 = Rect("bandeau2");
            Handle h2 = regie.Transitionner(sortie, b2, 1f, 0f, h => n++);
            regie.Tick(1f); regie.Tick(1.4f); regie.Tick(2f);
            Assert.AreEqual(1, n);
            Assert.IsTrue(regie.EstVivant(h2));
            Assert.AreEqual(0f, b2.GetComponent<CanvasGroup>().alpha, 1e-4f);
        }

        [Test]
        public void Fin_PisteQuiRejointLaBase_EstLiberee_SinonElleTient()
        {
            // §3/§4 (relecture d'E1, CLIENT-3) — une piste finie dont la valeur finale égale la base du propriétaire est
            // LIBÉRÉE : sinon 16 transitions d'écran jamais détachées rempliraient le quota non-Ambiance. Contrôles négatifs :
            // une transition vers une valeur que le propriétaire n'a PAS posée TIENT ; un Attacher qui finit hors identité TIENT.
            Entree fondu = Admise(AidesMouvement.Faire("t.fondu", AidesMouvement.Rampe("t.fondu", Genre.Transition,
                Propriete.Alpha, Mode.Multiplicatif, 0f, 1f, 0.2f, Iteration.Fois(1))));
            RectTransform a = Rect("a");
            Handle ha = regie.Attacher(fondu, a, Reglage.Defaut);
            regie.Tick(0f); regie.Tick(0.1f); regie.Tick(0.3f);
            Assert.IsFalse(regie.EstVivant(ha), "fondu 0 → 1 fini : l'identité est rejointe, la piste est libérée");
            Assert.AreEqual(0, regie.PistesVivantes);

            // Transitionner vers la valeur que le propriétaire a POSÉE (file.part : alpha 0,28 posé par le code) ⇒ libérée
            RectTransform b = Rect("b");
            var cg = b.gameObject.AddComponent<CanvasGroup>();
            cg.alpha = 0.28f;                                   // le propriétaire pose l'état d'arrivée…
            Handle hb = regie.Transitionner(CatalogueHud.BandeauSortie, b, 1f, 0.28f);   // …la piste part de l'ancien
            regie.Tick(1f); regie.Tick(1.2f); regie.Tick(1.5f);
            Assert.IsFalse(regie.EstVivant(hb), "arrivée = base du propriétaire : libérée");
            Assert.AreEqual(0.28f, cg.alpha, 1e-4f, "la restitution n'a rien changé");

            // contrôle négatif 1 : vers une valeur que le propriétaire n'a pas posée ⇒ la piste TIENT
            RectTransform c = Rect("c");
            Handle hc = regie.Transitionner(CatalogueHud.BandeauSortie, c, 1f, 0f);
            regie.Tick(2f); regie.Tick(2.5f); regie.Tick(3f);
            Assert.IsTrue(regie.EstVivant(hc), "0 ≠ base 1 du CanvasGroup posé par la régie : elle tient");

            // contrôle négatif 2 : un Attacher qui finit HORS identité tient aussi
            Entree reste = Admise(AidesMouvement.Faire("t.reste", AidesMouvement.Rampe("t.reste", Genre.Transition,
                Propriete.Alpha, Mode.Multiplicatif, 1f, 0.5f, 0.2f, Iteration.Fois(1))));
            RectTransform d = Rect("d");
            Handle hd = regie.Attacher(reste, d, Reglage.Defaut);
            regie.Tick(3f); regie.Tick(3.1f); regie.Tick(3.4f);
            Assert.IsTrue(regie.EstVivant(hd), "fin à 0,5 ≠ identité : elle tient");
        }

        [Test]
        public void Reglage_KDureeEtKAmp_SAppliquentParInstance()
        {
            // §2 — `Reglage` par instance : KDuree × période, KAmp × écart à l'identité
            Entree tr = Admise(AidesMouvement.Faire("t.tr",
                AidesMouvement.Rampe("tr", Genre.Alerte, Propriete.Rotation, Mode.Additif, 0f, 8f, 1f, Iteration.InfiniFois, 0.5f)));
            RectTransform normal = Rect("n"), lent = Rect("l"), doux = Rect("d");
            regie.Attacher(tr, normal, Reglage.Defaut);
            regie.Attacher(tr, lent, new Reglage(0f, 1f, 2f, 1f, 0f, 0f));
            regie.Attacher(tr, doux, new Reglage(0f, 0.5f, 1f, 1f, 0f, 0f));
            regie.Tick(0f);
            regie.Tick(0.5f);
            Assert.AreEqual(4f, Mathf.DeltaAngle(0f, normal.localEulerAngles.z), 0.02f);
            Assert.AreEqual(2f, Mathf.DeltaAngle(0f, lent.localEulerAngles.z), 0.02f, "période doublée : moitié du chemin");
            Assert.AreEqual(2f, Mathf.DeltaAngle(0f, doux.localEulerAngles.z), 0.02f, "amplitude à 50 %");
        }

        // ------------------------------------------------------------------------------------------ hors champ (§3, §4, §6.4)

        [Test]
        public void HorsChamp_30sMesureesSurLHorlogeDeLaRegie_RienNEstLibereeSousFigee()
        {
            // §3 + §6.4 — 30 s MESURÉES SUR `IHorloge` de la régie : sous `Figee`, une planche qui rend des images pendant 60 s de
            // temps réel ne libère rien ; la libération n'a lieu que quand l'horloge de la régie franchit 30 s
            Entree e = Constante("t.c", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.5f);
            RectTransform c = Rect();
            Handle h = regie.Attacher(e, c, Reglage.Defaut);
            horloge.Temps = 100f;
            regie.Tick(100f);
            c.gameObject.SetActive(false);
            regie.Tick(101f);                       // première image vue inactive : le chronomètre part à 100 (horloge : 100)
            Assert.IsTrue(regie.EstVivant(h));

            horloge.Temps = 129.9f;
            regie.Tick(129.9f);
            Assert.IsTrue(regie.EstVivant(h), "29,9 s : l'emplacement est conservé");

            // CONTRÔLE NÉGATIF — l'horloge est FIGÉE, le `t` des Tick (la planche) avance de 500 s : rien n'est libéré
            for (int k = 0; k < 50; k++) regie.Tick(200f + k * 10f);
            Assert.IsTrue(regie.EstVivant(h), "la durée est celle de l'horloge de la régie, pas celle des Tick");
            Assert.AreEqual(1, regie.PistesVivantes);

            horloge.Temps = 130.5f;
            regie.Tick(1000f);
            Assert.IsFalse(regie.EstVivant(h), "plus de 30 s d'horloge de régie : libérée");
            Assert.AreEqual(0, regie.PistesVivantes);
        }

        [Test]
        public void HorsChamp_UneCibleRevenueAvant30s_RepartDeZero()
        {
            // §3 — le chronomètre se remet à zéro au retour dans le champ
            Entree e = Constante("t.c", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.5f);
            RectTransform c = Rect();
            Handle h = regie.Attacher(e, c, Reglage.Defaut);
            horloge.Temps = 0f;
            c.gameObject.SetActive(false);
            regie.Tick(0f);
            horloge.Temps = 20f; c.gameObject.SetActive(true); regie.Tick(20f);
            horloge.Temps = 21f; c.gameObject.SetActive(false); regie.Tick(21f);
            horloge.Temps = 49f; regie.Tick(49f);                      // 28 s depuis la nouvelle absence (et 49 s depuis la première)
            Assert.IsTrue(regie.EstVivant(h));
            horloge.Temps = 51.5f; regie.Tick(51.5f);
            Assert.IsFalse(regie.EstVivant(h));
        }

        [Test]
        public void HorsChamp_UneCibleInactive_NEstNiEvalueeNiEcrite()
        {
            // §3 ordre (4) — « visibilité » : non évaluée tant qu'inactive, et le temps ne coule pas pour elle
            Entree rampe = Admise(AidesMouvement.Faire("t.rampe",
                AidesMouvement.Rampe("r", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 0f, 10f, 1f, Iteration.InfiniFois, 0.5f)));
            RectTransform c = Rect();
            regie.Attacher(rampe, c, Reglage.Defaut);
            regie.Tick(0f);
            regie.Tick(0.25f);
            Assert.AreEqual(2.5f, c.anchoredPosition.x, 1e-3f);
            c.gameObject.SetActive(false);
            int evals = regie.Evaluations;
            regie.Tick(0.5f); regie.Tick(5f);
            Assert.AreEqual(evals, regie.Evaluations, "pas évaluée");
            c.gameObject.SetActive(true);
            regie.Tick(5.25f);
            regie.Tick(5.5f);
            Assert.AreEqual(5f, c.anchoredPosition.x, 1e-3f, "0,25 s de vie avant + 0,25 s après : l'absence n'a pas compté");
        }

        // ------------------------------------------------------------------------------------------ cadence et délestage (§4)

        [Test]
        public void Cadence_Ambiance_30Hz_Alerte_AChaqueImage()
        {
            // §4 — « cadence : Ambiance ≤ 30 Hz » (dt injectés, 60 Hz pendant 1 s)
            Entree lampe = Admise(AidesMouvement.Faire("t.lampe", AidesMouvement.Lampe("lampe")));
            regie.Attacher(lampe, Rect("amb"), Reglage.Defaut);
            for (int k = 0; k <= 60; k++) regie.Tick(k / 60f);
            Assert.That(regie.Evaluations, Is.InRange(30, 31), "une Ambiance évaluée 30 fois par seconde au plus");

            // contrôle négatif : une Alerte, aux mêmes dt, est évaluée à CHAQUE image
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();
            Entree alerte = Constante("t.alerte", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.9f);
            regie.Attacher(alerte, Rect("al"), Reglage.Defaut);
            for (int k = 0; k <= 60; k++) regie.Tick(k / 60f);
            Assert.AreEqual(61, regie.Evaluations);
        }

        private float Avancer(float t, float dt, int n)
        {
            for (int k = 0; k < n; k++) { t += dt; regie.Tick(t); }
            return t;
        }

        [Test]
        public void Delestage_RelatifALaCadenceMesuree_FigeLesAmbiances_PasLesAlertes_PuisRevient()
        {
            // §4 — « médiane de dt sur 120 images = cible ; EMA(0,2) > 2,5 × cible pendant 1 s ⇒ Ambiance figée à PoseDeReposS ;
            // retour sous 1,25 × pendant 2 s »
            Entree rampeAmb = Admise(AidesMouvement.Faire("t.rampeamb",
                AidesMouvement.Rampe("ramp", Genre.Ambiance, Propriete.Alpha, Mode.Multiplicatif, 0.5f, 1f, 10f, Iteration.InfiniFois, 0f)));
            Entree rampe = Admise(AidesMouvement.Faire("t.rampe",
                AidesMouvement.Rampe("r", Genre.Alerte, Propriete.TranslationX, Mode.Additif, 0f, 100f, 10f, Iteration.InfiniFois, 0.5f)));
            RectTransform amb = Rect("amb"), ale = Rect("ale");
            regie.Attacher(rampeAmb, amb, Reglage.Defaut);
            regie.Attacher(rampe, ale, Reglage.Defaut);

            float t = Avancer(0f, 1f / 60f, 130);                     // 130 images à 60 Hz : la cible est apprise
            Assert.AreEqual(EtatDelestage.Normal, regie.Delestage);
            Assert.Greater(amb.GetComponent<CanvasGroup>().alpha, 0.55f, "en régime, la rampe monte au-dessus de sa pose (0,5)");

            t = Avancer(t, 0.05f, 60);                                // 3 × la cible, soutenu
            Assert.AreEqual(EtatDelestage.Fige, regie.Delestage);
            float xAle = ale.anchoredPosition.x;
            t = Avancer(t, 0.05f, 10);
            Assert.AreEqual(0.5f, amb.GetComponent<CanvasGroup>().alpha, 2e-3f, "l'Ambiance est figée à sa pose (PoseDeReposS = 0)");
            Assert.AreNotEqual(xAle, ale.anchoredPosition.x, "l'Alerte, elle, vit toujours");

            t = Avancer(t, 1f / 60f, 240);                            // retour au calme : sous 1,25 × cible pendant 2 s
            Assert.AreEqual(EtatDelestage.Normal, regie.Delestage);
            float avant = amb.GetComponent<CanvasGroup>().alpha;
            Avancer(t, 1f / 60f, 60);
            Assert.Greater(amb.GetComponent<CanvasGroup>().alpha, avant, "…et l'Ambiance repart");
        }

        [Test]
        public void Delestage_UnePointeIsolee_NeDelestePas_ControleNegatif()
        {
            // §4 (contrôle négatif) — une image de 0,4 s isolée ne fait pas délester ; une cadence stable non plus
            Entree lampe = Admise(AidesMouvement.Faire("t.lampe", AidesMouvement.Lampe("lampe")));
            regie.Attacher(lampe, Rect("amb"), Reglage.Defaut);
            float t = Avancer(0f, 1f / 60f, 200);
            t = Avancer(t, 0.4f, 1);
            for (int k = 0; k < 100; k++)
            {
                t = Avancer(t, 1f / 60f, 1);
                Assert.AreEqual(EtatDelestage.Normal, regie.Delestage, "image " + k + " après la pointe");
            }
            Avancer(t, 1f / 60f, 600);
            Assert.AreEqual(EtatDelestage.Normal, regie.Delestage);
        }

        [Test]
        public void Delestage_DemiCadence_ParDessus1_5Fois_PendantUneSeconde()
        {
            // §4 — « EMA(0,2) de dt > 1,5 × cible pendant 1 s ⇒ Ambiance à demi-cadence »
            Entree lampe = Admise(AidesMouvement.Faire("t.lampe", AidesMouvement.Lampe("lampe")));
            regie.Attacher(lampe, Rect("amb"), Reglage.Defaut);
            float t = Avancer(0f, 0.01f, 130);                        // cible : 100 Hz
            Assert.AreEqual(EtatDelestage.Normal, regie.Delestage);
            t = Avancer(t, 0.02f, 80);                                // 2 × la cible : au-dessus de 1,5, sous 2,5
            Assert.AreEqual(EtatDelestage.DemiCadence, regie.Delestage);
            int avant = regie.Evaluations;
            Avancer(t, 0.02f, 100);                                   // 2 s à 50 Hz de dt
            int evals = regie.Evaluations - avant;
            Assert.LessOrEqual(evals, 30, "demi-cadence (15 Hz) : ≤ 30 évaluations en 2 s, contre 50 à 30 Hz");
            Assert.Greater(evals, 15);
        }

        // ------------------------------------------------------------------------------------------ G8 consommé (§4)

        [Test]
        public void G8_UneEntreeBloquanteAuDelaDeAnimMaxBlockMs_EstRefusee()
        {
            // §4/§10 — `UiTimingTunables.AnimMaxBlockMs` est CONSOMMÉ par `Attacher`
            float limiteS = UiTimingTunables.AnimMaxBlockMs / 1000f;
            Entree trop = Admise(AidesMouvement.Faire("t.trop", AidesMouvement.Rampe("trop", Genre.Transition, Propriete.Alpha, Mode.Multiplicatif, 0f, 1f, limiteS + 0.001f, Iteration.Fois(1)), bloquante: true));
            Entree juste = Admise(AidesMouvement.Faire("t.juste", AidesMouvement.Rampe("juste", Genre.Transition, Propriete.Alpha, Mode.Multiplicatif, 0f, 1f, limiteS, Iteration.Fois(1)), bloquante: true));
            Entree longue = Admise(AidesMouvement.Faire("t.longue", AidesMouvement.Rampe("longue", Genre.Transition, Propriete.Alpha, Mode.Multiplicatif, 0f, 1f, 0.7f, Iteration.Fois(1)), bloquante: false));
            Assert.IsTrue(regie.Attacher(trop, Rect("a"), Reglage.Defaut).EstNul, "bloquante ET 251 ms : refusée");
            Assert.IsFalse(regie.Attacher(juste, Rect("b"), Reglage.Defaut).EstNul, "bloquante à 250 ms pile : admise");
            Assert.IsFalse(regie.Attacher(longue, Rect("c"), Reglage.Defaut).EstNul, "non bloquante : peut durer davantage (balayage 700 ms)");
            Assert.AreEqual(1, regie.Refus);
            Assert.AreEqual(250, UiTimingTunables.AnimMaxBlockMs, "la valeur du canon, lue et non recopiée");
        }

        // ------------------------------------------------------------------------------------------ registre (§3)

        [Test]
        public void Registre_HoteNu_HandleNulCompte_PuisPourTestPublieUneRegie()
        {
            // §3 « Accès à la régie » — un hôte nu obtient `Courante == null` et un handle nul COMPTÉ ; `PourTest()` crée et publie
            RegieMouvement.Oublier();
            Assert.IsNull(RegieMouvement.Courante);
            Entree e = CatalogueHud.Tremble;
            RectTransform c = Rect();
            Assert.IsTrue(RegieMouvement.Attacher(e, c, Reglage.Defaut).EstNul);
            Assert.IsTrue(RegieMouvement.Transitionner(CatalogueHud.AiguilleBalayage, c, 0f, 1f).EstNul);
            Assert.AreEqual(2, RegieMouvement.SansRegie);
            Assert.DoesNotThrow(() => RegieMouvement.Detacher(Handle.Nul));
            Assert.DoesNotThrow(() => RegieMouvement.DetacherSous(c));

            Regie r = RegieMouvement.PourTest();
            Assert.AreSame(r, RegieMouvement.Courante);
            Assert.IsFalse(RegieMouvement.Attacher(e, c, Reglage.Defaut).EstNul, "avec une régie, un vrai handle");
            Assert.AreEqual(1, r.PistesVivantes);
            Assert.AreEqual(RegieMouvement.SansRegie, r.SansRegie, "le compteur est lisible depuis la régie");
            regie = r;
        }

        [Test]
        public void Registre_LaPolitiqueSePoseSurLaRegieCourante()
        {
            // §5 — « Sources (PlayerPrefs, Android) = E2 : expose seulement un setter »
            RegieMouvement.PoserPolitique(PolitiqueMouvement.Reduit);
            Assert.AreEqual(PolitiqueMouvement.Reduit, regie.Politique);
            Regie autre = RegieMouvement.PourTest();
            Assert.AreEqual(PolitiqueMouvement.Plein, autre.Politique, "PourTest repart de Plein");
            regie = autre;
        }

        [Test]
        public void Couples_16PistesATroisCanaux_TiennentDansLesCouplesPreallouees()
        {
            // §4 — 48 pistes × canaux : les couples préalloués suffisent au pire cas du catalogue (3 canaux)
            var trois = new MouvementDefini("trois", Genre.Transition, 0.15f,
                new[]
                {
                    new Canal(Propriete.TranslationY, Mode.Additif, new[] { AidesMouvement.K(0f, 10f), AidesMouvement.K(1f, 0f) }),
                    new Canal(Propriete.Rotation, Mode.Additif, new[] { AidesMouvement.K(0f, 4f), AidesMouvement.K(1f, 0f) }),
                    new Canal(Propriete.Alpha, Mode.Multiplicatif, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }),
                }, Iteration.Fois(1));
            Entree main = Admise(AidesMouvement.Faire("t.main", trois));
            for (int i = 0; i < 16; i++) Assert.IsFalse(regie.Attacher(main, Rect("m" + i), Reglage.AvecPhase(i * 0.045f)).EstNul);
            Assert.DoesNotThrow(() => { regie.Tick(0f); regie.Tick(0.05f); regie.Tick(1f); });
            Assert.AreEqual(0, regie.Refus);
        }

        [Test]
        public void Parametre_LePuitsRecoitLeCanalEtLaValeur_ViaUnFauxImplementeur()
        {
            // §2 — `Parametre` : `IParametreAnime.PoserParametre(canal, v)`, un seul point d'extension, testable avec un faux
            var cible = AidesMouvement.Rect(montes, "ficelle");
            var faux = cible.gameObject.AddComponent<FauxParametre>();
            Entree tendue = Admise(AidesMouvement.Faire("t.ficelle", new MouvementDefini("ficelle", Genre.Transition, 0.24f,
                new[] { new Canal(Propriete.Parametre, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }, index: 2) },
                Iteration.Fois(1))));
            Handle h = regie.Transitionner(tendue, cible, 0.1f, 0.9f);
            regie.Tick(0f);
            regie.Tick(0.12f);
            Assert.AreEqual(2, faux.DernierCanal);
            Assert.AreEqual(0.5f, faux.DerniereValeur, 1e-3f);
            regie.Detacher(h);
            Assert.AreEqual(0f, faux.DerniereValeur, 1e-6f, "restitué à la base du puits");
            // une cible SANS puits est refusée
            Assert.IsTrue(regie.Transitionner(tendue, Rect("sans-puits"), 0f, 1f).EstNul);
        }

        private class FauxParametre : MonoBehaviour, IParametreAnime
        {
            public int DernierCanal = -1;
            public float DerniereValeur = float.NaN;
            public void PoserParametre(int canal, float v)
            {
                DernierCanal = canal;
                DerniereValeur = v;
            }
        }

        // ------------------------------------------------------------------------------------------ le HUD de bout en bout (§9)

        [Test]
        public void Hud_PoulsSurLeCerclageEtLeFilet_UnSeulMouvementDeuxPistes()
        {
            // §9 — un mouvement, deux cibles : le pouls du cerclage et du filet (Alpha Multiplicatif sur un CanvasGroup posé)
            RectTransform cerclage = Rect("BoitierRing"), filet = Rect("hairline");
            regie.Attacher(CatalogueHud.Pouls, cerclage, Reglage.Defaut);
            regie.Attacher(CatalogueHud.Pouls, filet, Reglage.Defaut);
            regie.Tick(0f);
            Assert.AreEqual(1f, cerclage.GetComponent<CanvasGroup>().alpha, 1e-3f);
            regie.Tick(0.55f);
            Assert.AreEqual(0.45f, cerclage.GetComponent<CanvasGroup>().alpha, 1e-3f);
            Assert.AreEqual(0.45f, filet.GetComponent<CanvasGroup>().alpha, 1e-3f);
        }

        // ------------------------------------------------------------------------------------------ mouvement réduit (§5)

        [Test]
        public void Gel_Reduit_EvalueALaPose_SansPhaseS()
        {
            // §5 + §0.4 du catalogue — « le gel évalue le mouvement à PoseDeReposS SANS PhaseS »
            Entree lampe = Admise(AidesMouvement.Faire("t.lampe", AidesMouvement.Lampe("lampe")));
            RectTransform c = Rect();
            regie.Attacher(lampe, c, Reglage.AvecPhase(-2.3f));     // 2,3 s d'avance = mi-période = la crête, 1,0
            regie.Tick(0f);
            var cg = c.GetComponent<CanvasGroup>();
            Assert.AreEqual(1f, cg.alpha, 5e-3f, "Plein : la phase de la piste (crête)");

            regie.Politique = PolitiqueMouvement.Reduit;
            regie.Tick(0.1f);
            Assert.AreEqual(0.82f, cg.alpha, 2e-3f, "Reduit : la pose (le creux), PAS la phase de la piste");

            // l'âge n'a pas avancé pendant le gel ; Plein reprend là où la piste en était
            regie.Politique = PolitiqueMouvement.Plein;
            regie.Tick(0.2f);
            Assert.Greater(cg.alpha, 0.95f);
        }

        [Test]
        public void Gel_Reduit_TouteAlerteEstFigee_YCompris_Aucun_GeleTout()
        {
            // §5 — « Reduit : tout est figé à PoseDeReposS, y compris Alerte » ; `Aucun` : tests et contrôle négatif
            RectTransform c = Rect("cerclage");
            regie.Attacher(CatalogueHud.Pouls, c, Reglage.Defaut);
            regie.Politique = PolitiqueMouvement.Reduit;
            regie.Tick(0f); regie.Tick(0.2f); regie.Tick(0.4f);
            Assert.AreEqual(0.72f, c.GetComponent<CanvasGroup>().alpha, 2e-3f, "figé à la pose : α 0,72, en alerte sans être éteint (décision f2, dette 17)");
            regie.Politique = PolitiqueMouvement.Plein;
            regie.Tick(0.8f);
            Assert.Greater(Mathf.Abs(c.GetComponent<CanvasGroup>().alpha - 0.45f), 0.01f, "contrôle négatif : en Plein il bat");
        }

        [Test]
        public void Gel_Reduit_UneTransitionSauteASaFin_EtRappelleQuandFini()
        {
            // §5 + §I.4 du catalogue — « une Transition sous Reduit saute à sa fin » ; le rappel part (le bandeau doit s'effacer)
            RectTransform b = Rect("bandeau");
            int n = 0;
            regie.Politique = PolitiqueMouvement.Reduit;
            regie.Transitionner(CatalogueHud.BandeauSortie, b, 1f, 0f, h => n++);
            regie.Tick(0f);
            Assert.AreEqual(0f, b.GetComponent<CanvasGroup>().alpha, 1e-4f, "d'emblée à `vers`");
            Assert.AreEqual(1, n);
            regie.Tick(0.1f);
            Assert.AreEqual(1, n);
        }

        [Test]
        public void Gel_Reduit_RetourGardeLeMelange_SansEchelle()
        {
            // §5 (i) — « Retour garde le mélange de couleur à l'appui … sans échelle »
            Entree appui = Admise(AidesMouvement.Faire("t.appui", new MouvementDefini("appui", Genre.Retour, 0.09f,
                new[]
                {
                    new Canal(Propriete.Echelle, Mode.Multiplicatif, new[] { AidesMouvement.K(0f, 1f), AidesMouvement.K(1f, 0.97f) }),
                    new Canal(Propriete.Melange, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }),
                }, Iteration.Fois(1), couleurA: CouleurSpec.Cible, couleurB: CouleurSpec.CibleFois(0.5f))));
            Image plein = Img("plein", new Color(0.8f, 0.8f, 0.8f)), reduit = Img("reduit", new Color(0.8f, 0.8f, 0.8f));
            regie.Attacher(appui, (RectTransform)plein.transform, Reglage.Defaut);
            regie.Tick(0f); regie.Tick(0.09f);
            Assert.AreEqual(0.97f, plein.rectTransform.localScale.x, 1e-3f, "Plein : l'échelle de l'appui");
            Assert.AreEqual(0.4f, plein.color.r, 1e-3f);

            regie.Politique = PolitiqueMouvement.Reduit;
            regie.Attacher(appui, (RectTransform)reduit.transform, Reglage.Defaut);
            regie.Tick(1f); regie.Tick(1.09f);
            Assert.AreEqual(1f, reduit.rectTransform.localScale.x, 1e-4f, "Reduit : pas d'échelle");
            Assert.AreEqual(0.4f, reduit.color.r, 1e-3f, "Reduit : le mélange est gardé");
        }

        [Test]
        public void Gel_Reduit_LeVoileAlphaEstGarde_LeMarqueurAvecPoseEstFige()
        {
            // §5 (i) + §17 — le VOILE `Alpha` d'un bouton sans Graphic qui rende est gardé sous Reduit ; l'`Alpha` d'un autre Retour
            // qui déclare une pose (`carnet.en-main`) est figé
            Entree voile = Admise(AidesMouvement.Faire("t.voile",
                AidesMouvement.Rampe("voile", Genre.Retour, Propriete.Alpha, Mode.Multiplicatif, 1f, 0.8f, 0.09f, Iteration.Fois(1))));
            Entree enMain = Admise(AidesMouvement.Faire("t.enmain",
                AidesMouvement.Rampe("enmain", Genre.Retour, Propriete.Alpha, Mode.Multiplicatif, 0f, 1f, 0.5f, Iteration.Fois(1), poseDeReposS: 0f)));
            RectTransform v = Rect("voile"), m = Rect("marque");
            regie.Politique = PolitiqueMouvement.Reduit;
            regie.Attacher(voile, v, Reglage.Defaut);
            regie.Attacher(enMain, m, Reglage.Defaut);
            regie.Tick(0f); regie.Tick(0.09f);
            Assert.AreEqual(0.8f, v.GetComponent<CanvasGroup>().alpha, 2e-3f, "le voile joue");
            Assert.AreEqual(0f, m.GetComponent<CanvasGroup>().alpha, 1e-3f, "le marqueur est figé à sa pose (α 0)");
        }

        [Test]
        public void Gel_Reduit_UneEntreeFonctionnelleNeSeGelePas_Aucun_LaGele()
        {
            // §5 (ii) — « une entrée Fonctionnelle (l'arc de 1 000 ms de l'appui long) ne se gèle pas » ; `Aucun` gèle même elle
            var arc = new MouvementDefini("arc", Genre.Retour, 1f,
                new[] { new Canal(Propriete.Remplissage, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }) },
                Iteration.Fois(1), fonctionnelle: true);
            Entree appuiLong = Admise(AidesMouvement.Faire("t.arc", arc));
            Image a = Img("arc", Color.white);
            regie.Politique = PolitiqueMouvement.Reduit;
            Handle h = regie.Attacher(appuiLong, (RectTransform)a.transform, Reglage.Defaut);
            regie.Tick(0f); regie.Tick(0.5f);
            Assert.AreEqual(0.5f, a.fillAmount, 1e-3f, "Reduit : la progression fonctionnelle court");
            regie.Detacher(h);

            regie.Politique = PolitiqueMouvement.Aucun;
            Image b = Img("arc2", Color.white);
            regie.Attacher(appuiLong, (RectTransform)b.transform, Reglage.Defaut);
            regie.Tick(1f); regie.Tick(1.5f);
            Assert.AreEqual(0f, b.fillAmount, 1e-6f, "Aucun : rien ne bouge, exceptions comprises");
        }
    }
}
