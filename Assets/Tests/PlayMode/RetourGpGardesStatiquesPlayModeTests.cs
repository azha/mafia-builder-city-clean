using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // Revue ⊥ du lot (11/11), BLOCKING 1 et MAJOR 1 : deux gardes STATIQUES sur la configuration d'un bouton du guichet, avec leurs contrôles positifs.
    //   - `Retour.NouveauBouton` pose `Transition.None` (le retour d'appui EST le retour : jamais la teinte `ColorTint` d'Unity en plus, design §1.6) ;
    //     un `AddComponent<Button>` nu (transition par défaut) est ROUGE « GP-COLORTINT » ;
    //   - le `targetGraphic` vit dans le sous-arbre du bouton ; un `targetGraphic` extérieur est ROUGE « GP-TARGETGRAPHIC ».
    // MONTAGE SYNTHÉTIQUE (jamais compté dans N ni dans l'inventaire).
    [Category("RetourAppui")]
    public class RetourGpGardesStatiquesPlayModeTests
    {
        private GameObject racine;
        private Canvas canvas;
        private Regie regie;

        [SetUp]
        public void Monter()
        {
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();
            racine = new GameObject("GardesStatiquesCanvas", typeof(RectTransform), typeof(Canvas));
            canvas = racine.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        }

        [TearDown]
        public void Demonter()
        {
            if (racine != null) Object.DestroyImmediate(racine);
            racine = null;
            RegieMouvement.Oublier();
        }

        private RectTransform Peint(string nom, Transform parent, Vector2 centre, Vector2 taille, Color couleur)
        {
            var go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = taille;
            rt.anchoredPosition = centre;
            go.AddComponent<Image>().color = couleur;
            return rt;
        }

        [Test]
        public void NouveauBouton_PoseTransitionNone()
        {
            RectTransform rt = Peint("Bouton", racine.transform, Vector2.zero, new Vector2(100f, 60f), Color.white);
            Button b = Retour.NouveauBouton(rt.gameObject);
            Assert.AreEqual(Selectable.Transition.None, b.transition, "le guichet pose Transition.None : pas de ColorTint en plus du retour d'appui");
        }

        [Test]
        public void Statique_BoutonDuGuichet_ProprePropreSousArbre_EstVert()
        {
            RectTransform rt = Peint("Bouton", racine.transform, Vector2.zero, new Vector2(100f, 60f), Color.white);
            Button b = Retour.NouveauBouton(rt.gameObject);
            b.targetGraphic = rt.GetComponent<Image>();
            Assert.IsNull(GardesStatiquesGp.Statique("E", "Bouton", b));
        }

        [Test]
        public void ControlePositif_ButtonNuAvecColorTint_EstRouge()
        {
            RectTransform rt = Peint("Nu", racine.transform, Vector2.zero, new Vector2(100f, 60f), Color.white);
            Button b = rt.gameObject.AddComponent<Button>();   // transition par défaut : ColorTint
            Assert.AreEqual(Selectable.Transition.ColorTint, b.transition, "précondition : un Button nu garde ColorTint");
            StringAssert.StartsWith("GP-COLORTINT", GardesStatiquesGp.Statique("E", "Nu", b));
        }

        [Test]
        public void ControlePositif_TargetGraphicHorsDuSousArbre_EstRouge()
        {
            RectTransform voisin = Peint("Voisin", racine.transform, new Vector2(300f, 0f), new Vector2(100f, 60f), Color.red);
            RectTransform rt = Peint("Bouton", racine.transform, Vector2.zero, new Vector2(100f, 60f), Color.white);
            Button b = Retour.NouveauBouton(rt.gameObject);
            b.targetGraphic = voisin.GetComponent<Image>();   // hors du sous-arbre du bouton
            string v = GardesStatiquesGp.Statique("E", "Bouton", b);
            StringAssert.StartsWith("GP-TARGETGRAPHIC", v);
            StringAssert.Contains("Voisin", v);
        }

        [Test]
        public void Relever_UnButtonNuAvecColorTint_EstRouge_PressableOuNon()
        {
            RectTransform rt = Peint("Nu", racine.transform, Vector2.zero, new Vector2(100f, 60f), Color.white);
            Button b = rt.gameObject.AddComponent<Button>();
            b.interactable = false;   // non pressable : la garde statique juge quand même
            List<LigneGp> lignes = RetourGpReleve.Relever("Gardes", "colortint", racine, canvas, regie, RetourReleveHelper.Largeur, RetourReleveHelper.Hauteur);
            Assert.AreEqual(1, lignes.Count);
            Assert.IsFalse(lignes[0].Pressable);
            StringAssert.StartsWith("GP-COLORTINT", lignes[0].Verdict);
        }
    }
}
