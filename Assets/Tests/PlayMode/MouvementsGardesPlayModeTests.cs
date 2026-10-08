using System;
using System.Collections.Generic;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Mouvements.Tests
{
    // CLIENT-3 / E1 (design-couche-mouvement.md v4.3 §4, §5, §6.2, §10) — les gardes de DONNÉE, chacune avec son CONTRÔLE NÉGATIF
    // (X9 : une donnée fautive qui DOIT rougir) et un contrôle positif (le catalogue du HUD passe).
    //   Hud_*  le catalogue du HUD passe toutes les gardes
    //   G1…G13 une garde = un test positif/négatif
    //   Tunables_*  les plafonds du design, nommés une fois
    [Category("Mouvement")]
    public class MouvementsGardesPlayModeTests
    {
        private static Entree Alerte(string id, Genre g, MouvementDefini m, int pistes = 1, string[] ecrans = null, bool bloquante = false)
        {
            return new Entree(id, ecrans ?? AidesMouvement.Partout, "test", AidesMouvement.CauseDeTest, g, m, pistes, bloquante, Entree.HoteClient);
        }

        private static List<Entree> Liste(params Entree[] es) => new List<Entree>(es);

        private static bool Contient(List<string> violations, string garde, string id)
        {
            foreach (string v in violations) if (v.StartsWith(garde + " " + id, StringComparison.Ordinal)) return true;
            return false;
        }

        // ------------------------------------------------------------------------------------------ le catalogue du HUD

        [Test]
        public void Hud_LeCatalogueDuChrome_PasseToutesLesGardes()
        {
            // §10/E1 — contrôle POSITIF : G1 G3 G4 G5 G8 G12 G13 sur les sept entrées du chrome
            Assert.AreEqual(7, CatalogueHud.Entrees.Count);
            List<string> v = Gardes.Toutes(CatalogueHud.Entrees, ContexteRendu.Defaut);
            Assert.IsEmpty(v, string.Join("\n", v));
        }

        [Test]
        public void Hud_LesEntrees_ONtLesChampsDuCatalogue()
        {
            // §I.4 du catalogue — genres, modes, durées, pistes
            Assert.AreEqual(Genre.Alerte, CatalogueHud.Pouls.Genre);
            Assert.AreEqual(2, CatalogueHud.Pouls.Pistes, "cerclage + filet : un mouvement, deux cibles");
            Assert.AreEqual(1.1f, CatalogueHud.Pouls.Mouvement.PeriodeS, 1e-6f);
            Assert.AreEqual(0.14f, CatalogueHud.Tremble.Mouvement.PeriodeS, 1e-6f);
            Assert.AreEqual(0.9f, CatalogueHud.Gyrophare.Mouvement.PeriodeS, 1e-6f);
            Assert.AreEqual(Propriete.Hue, CatalogueHud.Gyrophare.Mouvement.Canaux[0].P);
            Assert.AreEqual(0.6f, CatalogueHud.FiletVirage.Mouvement.PeriodeS, 1e-6f);
            Assert.AreEqual(Propriete.Melange, CatalogueHud.AnneauVirage.Mouvement.Canaux[0].P);
            Assert.AreEqual(Genre.Transition, CatalogueHud.AnneauVirage.Genre);
            Assert.AreEqual(0.7f, CatalogueHud.AiguilleBalayage.Mouvement.PeriodeS, 1e-6f);
            Assert.AreEqual(Mode.Absolu, CatalogueHud.AiguilleBalayage.Mouvement.Canaux[0].M);
            Assert.AreEqual(Propriete.Rotation, CatalogueHud.AiguilleBalayage.Mouvement.Canaux[0].P);
            Assert.AreEqual(0.4f, CatalogueHud.BandeauSortie.Mouvement.PeriodeS, 1e-6f);
            Assert.AreEqual(Aisance.Lineaire, CatalogueHud.BandeauSortie.Mouvement.Canaux[0].Cles[0].E, "fondu LINÉAIRE");
            foreach (Entree e in CatalogueHud.Entrees)
            {
                Assert.IsFalse(e.Bloquante, e.Id + " : aucune entrée ne refuse l'entrée du joueur (X8)");
                Assert.AreEqual(Entree.HoteClient, e.Hote);
            }
        }

        [Test]
        public void Hud_Pouls_UtiliseL_Ease_DesImagesCles_PasCelleDeLEffet()
        {
            // §2 — l'aisance se lit dans `easing_cles[i].easing` (`ease` pour pouls/tremble/gyroflip), jamais dans `easing` de l'effet
            foreach (Entree e in new[] { CatalogueHud.Pouls, CatalogueHud.Tremble, CatalogueHud.Gyrophare })
                foreach (ImageCle k in e.Mouvement.Canaux[0].Cles)
                    Assert.AreEqual(Aisance.Ease, k.E, e.Id);
        }

        // ------------------------------------------------------------------------------------------ G1

        [Test]
        public void G1_CauseSourceEcransIdUnique_ControleNegatif()
        {
            // §10 G1 — chaque défaut doit être relevé, le catalogue sain ne l'est pas
            MouvementDefini m = AidesMouvement.Constant("m", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.9f);
            Entree bon = Alerte("g1.bon", Genre.Alerte, m);
            Assert.IsEmpty(Gardes.G1(Liste(bon)));

            var courte = new Entree("g1.courte", AidesMouvement.Partout, "test", "trop court", Genre.Alerte, m, 1, false, Entree.HoteClient);
            var todo = new Entree("g1.todo", AidesMouvement.Partout, "test", "TODO a decrire plus tard svp", Genre.Alerte, m, 1, false, Entree.HoteClient);
            var sansSource = new Entree("g1.src", AidesMouvement.Partout, " ", AidesMouvement.CauseDeTest, Genre.Alerte, m, 1, false, Entree.HoteClient);
            var sansEcran = new Entree("g1.ecran", new string[0], "test", AidesMouvement.CauseDeTest, Genre.Alerte, m, 1, false, Entree.HoteClient);
            var mauvaisGenre = new Entree("g1.genre", AidesMouvement.Partout, "test", AidesMouvement.CauseDeTest, Genre.Ambiance, m, 1, false, Entree.HoteClient);
            var mauvaisHote = new Entree("g1.hote", AidesMouvement.Partout, "test", AidesMouvement.CauseDeTest, Genre.Alerte, m, 1, false, "SansHote:");
            var sansPiste = new Entree("g1.piste", AidesMouvement.Partout, "test", AidesMouvement.CauseDeTest, Genre.Alerte, m, 0, false, Entree.HoteClient);
            var sansHote = new Entree("g1.sanshote", AidesMouvement.Partout, "test", AidesMouvement.CauseDeTest, Genre.Alerte, m, 1, false, "SansHote:cadran absent");

            List<string> v = Gardes.G1(Liste(courte, todo, sansSource, sansEcran, mauvaisGenre, mauvaisHote, sansPiste, sansHote, bon, bon));
            Assert.IsTrue(Contient(v, "G1", "g1.courte"), "Cause < 20 car.");
            Assert.IsTrue(Contient(v, "G1", "g1.todo"), "Cause « TODO »");
            Assert.IsTrue(Contient(v, "G1", "g1.src"), "Source vide");
            Assert.IsTrue(Contient(v, "G1", "g1.ecran"), "Ecrans vide");
            Assert.IsTrue(Contient(v, "G1", "g1.genre"), "Genre ≠ celui du mouvement");
            Assert.IsTrue(Contient(v, "G1", "g1.hote"), "SansHote sans raison");
            Assert.IsTrue(Contient(v, "G1", "g1.piste"), "Pistes < 1");
            Assert.IsTrue(Contient(v, "G1", "g1.bon"), "Id en double");
            Assert.IsFalse(Contient(v, "G1", "g1.sanshote"), "`SansHote:<raison>` est un hôte valide");
        }

        // ------------------------------------------------------------------------------------------ G3

        [Test]
        public void G3_LaPoseDonneUneValeurHorsDuRepos_ControleNegatif()
        {
            // §10 G3 + §0.4 du catalogue — « le PoseDeReposS d'une Ambiance/Alerte donne, sur chaque canal, une valeur ≠ repos »
            Assert.IsEmpty(Gardes.G3(Liste(Alerte("g3.lampe", Genre.Ambiance, AidesMouvement.Lampe("lampe")))), "lampe : le creux (0,82) n'est pas le repos (1)");

            // pose sur la CRÊTE d'une lampe (= l'identité 1) : le gel ne montrerait rien
            var crete = new MouvementDefini("crete", Genre.Ambiance, 4.6f,
                new[] { new Canal(Propriete.Alpha, Mode.Multiplicatif, new[] { AidesMouvement.K(0f, 0.82f), AidesMouvement.K(0.5f, 1f), AidesMouvement.K(1f, 0.82f) }) },
                Iteration.InfiniFois, poseDeReposS: 2.3f);
            Assert.IsTrue(Contient(Gardes.G3(Liste(Alerte("g3.crete", Genre.Ambiance, crete))), "G3", "g3.crete"), "pose = repos : rouge");

            // un canal sur deux au repos : rouge aussi (« sur CHAQUE canal »)
            var deux = new MouvementDefini("deux", Genre.Alerte, 1f,
                new[]
                {
                    new Canal(Propriete.Alpha, Mode.Multiplicatif, new[] { AidesMouvement.K(0f, 0.5f), AidesMouvement.K(1f, 0.5f) }),
                    new Canal(Propriete.Rotation, Mode.Additif, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 0f) }),
                }, Iteration.InfiniFois, poseDeReposS: 0f);
            Assert.IsTrue(Contient(Gardes.G3(Liste(Alerte("g3.deux", Genre.Alerte, deux))), "G3", "g3.deux"));

            // une Alerte/Ambiance SANS pose déclarée : rouge
            var sansPose = new MouvementDefini("sanspose", Genre.Alerte, 1f,
                new[] { new Canal(Propriete.Alpha, Mode.Multiplicatif, new[] { AidesMouvement.K(0f, 0.5f), AidesMouvement.K(1f, 1f) }) }, Iteration.InfiniFois);
            Assert.IsTrue(Contient(Gardes.G3(Liste(Alerte("g3.sans", Genre.Alerte, sansPose))), "G3", "g3.sans"));
        }

        // ------------------------------------------------------------------------------------------ G4

        [Test]
        public void G4_BudgetParEcranResolu_UneEntreeMultiEcransCompteSurChacun()
        {
            // §10 G4 + §2 — ≤ 16 pistes par écran RÉSOLU ; une entrée à plusieurs écrans compte sur chacun, `*` sur tous
            MouvementDefini m = AidesMouvement.Constant("m", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.9f);
            string[] a = { "A" }, ab = { "A", "B" }, b = { "B" };
            Assert.IsEmpty(Gardes.G4(Liste(Alerte("g4.seize", Genre.Alerte, m, 16, a))), "16 : pile le plafond");
            Assert.IsTrue(Contient(Gardes.G4(Liste(Alerte("g4.dixsept", Genre.Alerte, m, 17, a))), "G4", "écran A"), "17 : rouge");

            // 10 sur [A,B] + 7 sur [B] : B = 17 (rouge), A = 10 (vert)
            List<string> v = Gardes.G4(Liste(Alerte("g4.ab", Genre.Alerte, m, 10, ab), Alerte("g4.b", Genre.Alerte, m, 7, b)));
            Assert.IsTrue(v.Exists(x => x.StartsWith("G4 écran B")), "B porte 10 + 7");
            Assert.IsFalse(v.Exists(x => x.StartsWith("G4 écran A")), "A ne porte que 10");

            // une entrée `*` (le bandeau) pèse sur CHAQUE écran nommé : 12 + 5 = 17 sur A
            v = Gardes.G4(Liste(Alerte("g4.tous", Genre.Alerte, m, 5), Alerte("g4.a12", Genre.Alerte, m, 12, a)));
            Assert.IsTrue(v.Exists(x => x.StartsWith("G4 écran A")));
            // et un écran que personne ne nomme est résolu par `ecransExtra`
            Assert.IsTrue(Gardes.G4(Liste(Alerte("g4.tous17", Genre.Alerte, m, 17)), new[] { "Z" }).Exists(x => x.StartsWith("G4 écran Z")));
        }

        // ------------------------------------------------------------------------------------------ G5

        [Test]
        public void G5_TroisExtremaParSecondeAuPlus_ApresAlterne_ControleNegatif()
        {
            // §10 G5 + §5 — au plus 3 extrema/s (période ≥ 0,667 s pour un aller-retour) par piste d'alpha/mélange/éclat
            MouvementDefini Alpha(string id, float periode, bool alterne, params ImageCle[] cles) =>
                new MouvementDefini(id, Genre.Ambiance, periode, new[] { new Canal(Propriete.Alpha, Mode.Multiplicatif, cles) }, Iteration.InfiniFois, alterne, 0f);
            ImageCle[] va = { AidesMouvement.K(0f, 0.5f), AidesMouvement.K(0.5f, 1f), AidesMouvement.K(1f, 0.5f) };

            Assert.IsEmpty(Gardes.G5(Liste(Alerte("g5.lent", Genre.Ambiance, Alpha("lent", 1.1f, false, va)))), "1,1 s : 1,8 extrema/s");
            Assert.IsEmpty(Gardes.G5(Liste(Alerte("g5.pile", Genre.Ambiance, Alpha("pile", 0.7f, false, va)))), "0,7 s : 2,86 extrema/s");
            Assert.IsTrue(Contient(Gardes.G5(Liste(Alerte("g5.vite", Genre.Ambiance, Alpha("vite", 0.5f, false, va)))), "G5", "g5.vite"), "0,5 s : 4 extrema/s");
            Assert.IsTrue(Contient(Gardes.G5(Liste(Alerte("g5.clign", Genre.Alerte, Alpha("clign", 0.25f, false, va)))), "G5", "g5.clign"), "le flash de 250 ms de ③ : G5 gagne");

            // APRÈS Alterne : 0→1 sur 0,5 s en aller-retour = cycle de 1,0 s, 2 extrema/s ; sur 0,3 s = 0,6 s, 3,3 extrema/s
            ImageCle[] monte = { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) };
            Assert.IsEmpty(Gardes.G5(Liste(Alerte("g5.alt.ok", Genre.Ambiance, Alpha("alt", 0.5f, true, monte)))));
            Assert.IsTrue(Contient(Gardes.G5(Liste(Alerte("g5.alt.ko", Genre.Ambiance, Alpha("alt2", 0.3f, true, monte)))), "G5", "g5.alt.ko"));

            // les rotations / translations / hue ne sont pas du clignotement : le tremblement de 0,14 s passe
            Assert.IsEmpty(Gardes.G5(Liste(CatalogueHud.Tremble, CatalogueHud.Gyrophare)));
        }

        // ------------------------------------------------------------------------------------------ G8

        [Test]
        public void G8_BloquanteEtAuDelaDeAnimMaxBlockMs_Rouge_NonBloquanteLongue_Verte()
        {
            // §10 G8 — « une entrée Bloquante ET > AnimMaxBlockMs est refusée ; une entrée non bloquante peut durer davantage ;
            // les Retour d'APPUI (retour.appui) ≤ 250 ms »
            float limite = UiTimingTunables.AnimMaxBlockMs / 1000f;
            MouvementDefini Fini(string id, float dureeS, Genre g = Genre.Transition) =>
                AidesMouvement.Rampe(id, g, Propriete.Alpha, Mode.Multiplicatif, 0f, 1f, dureeS, Iteration.Fois(1));

            Assert.IsTrue(Contient(Gardes.G8(Liste(Alerte("g8.ko", Genre.Transition, Fini("a", limite + 0.01f), bloquante: true))), "G8", "g8.ko"));
            Assert.IsEmpty(Gardes.G8(Liste(Alerte("g8.pile", Genre.Transition, Fini("b", limite), bloquante: true))), "250 ms pile : admise");
            Assert.IsEmpty(Gardes.G8(Liste(Alerte("g8.long", Genre.Transition, Fini("c", 0.7f), bloquante: false))), "balayage d'aiguille 700 ms, non bloquant");
            Assert.IsEmpty(Gardes.G8(Liste(Alerte("retour.appui-long", Genre.Retour, Fini("d", 1f, Genre.Retour)))), "appui long 1 000 ms, non bloquant");

            var infini = AidesMouvement.Constant("inf", Genre.Alerte, Propriete.Alpha, Mode.Multiplicatif, 0.9f);
            Assert.IsTrue(Contient(Gardes.G8(Liste(Alerte("g8.inf", Genre.Alerte, infini, bloquante: true))), "G8", "g8.inf"), "bloquante infinie");

            // les Retour d'APPUI ≤ 250 ms, même non bloquants
            Assert.IsTrue(Contient(Gardes.G8(Liste(Alerte("retour.appui", Genre.Retour, Fini("e", 0.3f, Genre.Retour)))), "G8", "retour.appui"));
            Assert.IsEmpty(Gardes.G8(Liste(Alerte("retour.appui", Genre.Retour, Fini("f", 0.23f, Genre.Retour)))), "90 + 140 ms");
            Assert.IsTrue(Contient(Gardes.G8(Liste(Alerte("retour.appui-voile", Genre.Retour, Fini("g", 0.3f, Genre.Retour)))), "G8", "retour.appui-voile"));
        }

        [Test]
        public void G8_AucunCanalNEcritBlocksRaycastsNiInteractable()
        {
            // §10 G8 — « aucun canal n'écrit blocksRaycasts/interactable » : tient PAR CONSTRUCTION (le modèle ne les propose pas) ;
            // ce test épingle la liste fermée des propriétés pour qu'un ajout le fasse rougir
            string[] noms = Enum.GetNames(typeof(Propriete));
            Assert.AreEqual(12, noms.Length, "les 12 propriétés du design §2");
            foreach (string n in noms)
            {
                Assert.IsTrue(n.IndexOf("Raycast", StringComparison.OrdinalIgnoreCase) < 0, n);
                Assert.IsTrue(n.IndexOf("Interactable", StringComparison.OrdinalIgnoreCase) < 0, n);
            }
            CollectionAssert.AreEquivalent(new[] { "Alpha", "Melange", "Hue", "Eclat", "TranslationX", "TranslationY", "Rotation", "Echelle", "EchelleX", "EchelleY", "Remplissage", "Parametre" }, noms);
            CollectionAssert.AreEquivalent(new[] { "Additif", "Multiplicatif", "Absolu" }, Enum.GetNames(typeof(Mode)));
            CollectionAssert.AreEquivalent(new[] { "Alerte", "Ambiance", "Retour", "Transition" }, Enum.GetNames(typeof(Genre)));
        }

        // ------------------------------------------------------------------------------------------ G12

        [Test]
        public void G12_DeuxAbsolu_SurLaMemePropriete_ControleNegatif()
        {
            // §10 G12 (côté donnée) — pas deux `Absolu` à la même propriété dans un mouvement ; l'exécution (refus / remplacement) est
            // testée sur la régie
            var ko = new MouvementDefini("ko", Genre.Alerte, 1f,
                new[]
                {
                    new Canal(Propriete.Rotation, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }),
                    new Canal(Propriete.Rotation, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 2f) }),
                }, Iteration.InfiniFois, poseDeReposS: 0.5f);
            Assert.IsTrue(Contient(Gardes.G12(Liste(Alerte("g12.ko", Genre.Alerte, ko))), "G12", "g12.ko"));

            var ok = new MouvementDefini("ok", Genre.Alerte, 1f,
                new[]
                {
                    new Canal(Propriete.Rotation, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }),
                    new Canal(Propriete.Rotation, Mode.Additif, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 2f) }),
                    new Canal(Propriete.Alpha, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }),
                }, Iteration.InfiniFois, poseDeReposS: 0.5f);
            Assert.IsEmpty(Gardes.G12(Liste(Alerte("g12.ok", Genre.Alerte, ok))), "Absolu + Additif, ou deux Absolu de propriétés différentes");
        }

        // ------------------------------------------------------------------------------------------ G13

        [Test]
        public void G13_UneAmbianceInvisible_EstRefusee_SeuilsDuParagraphe6_2()
        {
            // §10 G13 + §6.2 — couleur rendue ≥ 3/255 ; déplacement ≥ 0,5 px (translation : delta ; rotation : rayon × θ ; échelle :
            // rayon × Δk) ; seules les `Ambiance` sont jugées
            ContexteRendu ctx = ContexteRendu.Defaut;     // rayon 100 px, 1 px/u, Graphic gris moyen
            MouvementDefini Un(Propriete p, Mode mode, float de, float vers, CouleurSpec a = default, CouleurSpec b = default) =>
                new MouvementDefini("g13", Genre.Ambiance, 4f, new[] { new Canal(p, mode, new[] { AidesMouvement.K(0f, de), AidesMouvement.K(0.5f, vers), AidesMouvement.K(1f, de) }) },
                    Iteration.InfiniFois, poseDeReposS: 2f, couleurA: a, couleurB: b);
            bool Rouge(MouvementDefini m) => Contient(Gardes.G13(Liste(Alerte("g13.x", Genre.Ambiance, m)), ctx), "G13", "g13.x");

            // alpha : 0,82 → 1 visible ; 0,995 → 1 (0,005 < 3/255 = 0,0118) invisible
            Assert.IsFalse(Rouge(Un(Propriete.Alpha, Mode.Multiplicatif, 0.82f, 1f)));
            Assert.IsTrue(Rouge(Un(Propriete.Alpha, Mode.Multiplicatif, 0.995f, 1f)));
            // …et sous un Graphic d'alpha 0,05, même l'amplitude 0,18 ne passe plus
            Assert.IsTrue(Contient(Gardes.G13(Liste(Alerte("g13.x", Genre.Ambiance, Un(Propriete.Alpha, Mode.Multiplicatif, 0.82f, 1f))),
                new ContexteRendu(0.05f, 100f, 1f, Color.gray)), "G13", "g13.x"));

            // mélange : Cible → Cible × 0,82 visible ; Cible → Cible × 1 invisible ; Cible × 1,35 sur un Graphic BLANC invisible (§16)
            Assert.IsFalse(Rouge(Un(Propriete.Melange, Mode.Absolu, 0f, 1f, CouleurSpec.Cible, CouleurSpec.CibleFois(0.82f))));
            Assert.IsTrue(Rouge(Un(Propriete.Melange, Mode.Absolu, 0f, 1f, CouleurSpec.Cible, CouleurSpec.CibleFois(1f))));
            Assert.IsTrue(Contient(Gardes.G13(Liste(Alerte("g13.x", Genre.Ambiance, Un(Propriete.Melange, Mode.Absolu, 0f, 1f, CouleurSpec.Cible, CouleurSpec.CibleFois(1.35f)))),
                new ContexteRendu(1f, 100f, 1f, Color.white)), "G13", "g13.x"), "k > 1 ne fait rien sur un Graphic blanc");
            Assert.IsFalse(Contient(Gardes.G13(Liste(Alerte("g13.x", Genre.Ambiance, Un(Propriete.Melange, Mode.Absolu, 0f, 1f, CouleurSpec.Cible, CouleurSpec.CibleFois(1.35f)))),
                new ContexteRendu(1f, 100f, 1f, new Color(0.5f, 0.4f, 0.3f))), "G13", "g13.x"), "…mais éclaircit un Graphic coloré");

            // translation : 0,2 u × 0,844 px/u = 0,17 px (rouge) ; 1 u (vert)
            var px = new ContexteRendu(1f, 100f, 0.844f, Color.gray);
            Assert.IsTrue(Contient(Gardes.G13(Liste(Alerte("g13.x", Genre.Ambiance, Un(Propriete.TranslationX, Mode.Additif, 0f, 0.2f))), px), "G13", "g13.x"));
            Assert.IsFalse(Contient(Gardes.G13(Liste(Alerte("g13.x", Genre.Ambiance, Un(Propriete.TranslationX, Mode.Additif, 0f, 1f))), px), "G13", "g13.x"));
            // rotation : 0,1° à 100 px = 0,17 px (rouge) ; 1° = 1,7 px (vert)
            Assert.IsTrue(Rouge(Un(Propriete.Rotation, Mode.Additif, 0f, 0.1f)));
            Assert.IsFalse(Rouge(Un(Propriete.Rotation, Mode.Additif, 0f, 1f)));
            // échelle : Δk 0,003 à 100 px = 0,3 px (rouge) ; 0,03 (vert)
            Assert.IsTrue(Rouge(Un(Propriete.Echelle, Mode.Multiplicatif, 1f, 1.003f)));
            Assert.IsFalse(Rouge(Un(Propriete.Echelle, Mode.Multiplicatif, 1f, 1.03f)));
            // hue : 0 → −140° d'un rouge : visible
            Assert.IsFalse(Rouge(Un(Propriete.Hue, Mode.Absolu, 0f, -140f, CouleurSpec.Nommee("rouge", Couleurs.Rvb(0xff5a3c)))));

            // hors périmètre : une ALERTE invisible n'est pas jugée par G13
            var invisibleAlerte = new MouvementDefini("g13a", Genre.Alerte, 4f, new[] { new Canal(Propriete.Alpha, Mode.Multiplicatif, new[] { AidesMouvement.K(0f, 0.999f), AidesMouvement.K(1f, 1f) }) },
                Iteration.InfiniFois, poseDeReposS: 0f);
            Assert.IsEmpty(Gardes.G13(Liste(Alerte("g13.alerte", Genre.Alerte, invisibleAlerte)), ctx));
        }

        // ------------------------------------------------------------------------------------------ G7

        [Test]
        public void E0_MelangeSurAmbiance_ControleNegatif()
        {
            // E0 (décision f2, 08/10) — garde de donnée : aucune Ambiance en Melange ; le HUD passe, une Ambiance Melange rougit.
            Assert.IsEmpty(Gardes.MelangeEtAmbiance(CatalogueHud.Entrees));
            var def = new MouvementDefini("x", Genre.Ambiance, 2f,
                new[] { new Canal(Propriete.Melange, Mode.Absolu, new[] { new ImageCle(0f, 0f, Aisance.Lineaire), new ImageCle(1f, 1f, Aisance.Lineaire) }) },
                Iteration.InfiniFois, poseDeReposS: 1f, couleurA: CouleurSpec.Cible, couleurB: CouleurSpec.CibleFois(0.8f));
            Assert.IsNotEmpty(Gardes.MelangeEtAmbiance(Liste(Alerte("e0.amb", Genre.Ambiance, def))));
            Assert.IsEmpty(Gardes.MelangeEtAmbiance(Liste(Alerte("e0.ale", Genre.Alerte, def))), "la même en Alerte passe");
        }

        [Test]
        public void G7_MotifsInterditsDansMouvements_ControleNegatif()
        {
            // §10 G7 — pas de réflexion, de LINQ, de TextMeshPro, ni de dépendance vers CityMap/Operational dans `Mouvements/`
            string dossier = Path.Combine(Application.dataPath, "Scripts", "ShellContracts", "Mouvements");
            Assert.IsTrue(Directory.Exists(dossier), dossier);
            string[] fichiers = Directory.GetFiles(dossier, "*.cs");
            Assert.GreaterOrEqual(fichiers.Length, 10, "le scan a bien lu les fichiers de Mouvements/");
            var v = new List<string>();
            foreach (string f in fichiers) v.AddRange(Gardes.G7(Path.GetFileName(f), File.ReadAllText(f)));
            Assert.IsEmpty(v, string.Join("\n", v));

            // contrôle négatif : chaque motif, écrit dans un texte, fait rougir (assemblés ici pour ne pas rougir CE fichier)
            foreach (string motif in Gardes.MotifsInterdits)
                Assert.IsNotEmpty(Gardes.G7("faute.cs", "using " + motif + ";"), motif);
            Assert.IsEmpty(Gardes.G7("sain.cs", "using System.Collections.Generic; using UnityEngine;"));
            // E0 (08/10) : le mécanisme ne crée jamais de Canvas ; un CanvasGroup reste permis
            Assert.IsNotEmpty(Gardes.G7("faute.cs", "go." + "AddComponent<" + "Canvas>();"), "créer un Canvas doit rougir");
            Assert.IsEmpty(Gardes.G7("sain.cs", "go.AddComponent<CanvasGroup>();"), "un CanvasGroup ne rougit pas");
        }

        // ------------------------------------------------------------------------------------------ tunables

        [Test]
        public void Tunables_LesPlafondsDuDesign_NommesUneFois()
        {
            // §4 — 48 = 16 + 32 ; 30 Hz ; 30 s ; seuils de délestage 1,5 / 2,5 / 1,25 ; fenêtre de 120 ; budget d'écran 16
            Assert.AreEqual(48, MouvementTunables.PistesMax);
            Assert.AreEqual(MouvementTunables.PistesMax, MouvementTunables.QuotaAmbiance + MouvementTunables.QuotaAlerteRetourTransition);
            Assert.AreEqual(32, MouvementTunables.QuotaAmbiance);
            Assert.AreEqual(16, MouvementTunables.QuotaAlerteRetourTransition);
            Assert.AreEqual(16, MouvementTunables.PistesParEcranMax);
            Assert.AreEqual(30f, MouvementTunables.CadenceAmbianceHz);
            Assert.AreEqual(30f, MouvementTunables.HorsChampLibereS);
            Assert.AreEqual(120, MouvementTunables.DelestageFenetreImages);
            Assert.AreEqual(0.2f, MouvementTunables.DelestageEma);
            Assert.AreEqual(1.5f, MouvementTunables.DelestageDemiSeuil);
            Assert.AreEqual(2.5f, MouvementTunables.DelestageFigeSeuil);
            Assert.AreEqual(1.25f, MouvementTunables.DelestageRetourSeuil);
            Assert.AreEqual(1f, MouvementTunables.DelestageDemiDureeS);
            Assert.AreEqual(2f, MouvementTunables.DelestageRetourDureeS);
            Assert.AreEqual(3f, MouvementTunables.ExtremaParSecondeMax);
            Assert.AreEqual(3f / 255f, MouvementTunables.SeuilCouleurRendue, 1e-6f);
            Assert.AreEqual(0.5f, MouvementTunables.SeuilDeplacementPx);
            // les epsilons du §3
            Assert.AreEqual(1f / 512f, MouvementTunables.Epsilon(Propriete.Alpha));
            Assert.AreEqual(1f / 512f, MouvementTunables.Epsilon(Propriete.Echelle));
            Assert.AreEqual(0.05f, MouvementTunables.Epsilon(Propriete.TranslationX));
            Assert.AreEqual(0.01f, MouvementTunables.Epsilon(Propriete.Rotation));
            Assert.AreEqual(1f / 512f, MouvementTunables.Epsilon(Propriete.Melange));
            Assert.AreEqual(1f / 512f, MouvementTunables.Epsilon(Propriete.Eclat));
            Assert.AreEqual(1f / 512f, MouvementTunables.Epsilon(Propriete.Remplissage));
            Assert.AreEqual(0.5f, MouvementTunables.Epsilon(Propriete.Hue));
            // la cadence du canon n'est PAS recopiée : `T.ui.anim_max_block_ms` reste lue dans `UiTimingTunables`
            Assert.AreEqual(250, UiTimingTunables.AnimMaxBlockMs);
        }
    }
}
