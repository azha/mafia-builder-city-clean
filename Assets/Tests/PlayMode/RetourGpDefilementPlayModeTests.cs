using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R6 (design retour d'appui v5, §4) — le relevé GP FAIT DÉFILER (ruling f2 11/11). Au run 8, ~30 boutons de l'écran Lieutenant (une feuille
    // qui défile) étaient rouges « hors cadre (zone 1000x0) » : leur rect sortait de l'image, le contenu étant plus haut que la fenêtre.
    // MONTAGE SYNTHÉTIQUE (jamais compté dans N ni dans l'inventaire) : un `Canvas` nu, un viewport à `RectMask2D` qui remplit le canvas, un content
    // de 4 100 u (une cale transparente de 4 000 u, puis TOUT EN BAS un bouton blanc). Régie réelle de `RegieMouvement.PourTest()` (no-mock).
    //   - avec `ScrollRect` : le bouton est hors de l'image AVANT (précondition : sans elle le test ne prouve rien), dedans APRÈS, vert, ≥ plancher ;
    //   - sans `ScrollRect` : le MÊME montage reste rouge « hors cadre » (le défilement n'est pas un passe-droit).
    // Rendu par `RenderTexture` : un périphérique graphique est exigé (le helper lève sous `-nographics`).
    [Category("RetourAppui")]
    public class RetourGpDefilementPlayModeTests
    {
        private const string NomRacine = "RetourDefilementCanvas";
        private const int L = RetourReleveHelper.Largeur, H = RetourReleveHelper.Hauteur;
        private const float CaleHauteur = 4000f, BoutonLargeur = 100f, BoutonHauteur = 60f, BoutonAuDessusDuBas = 20f;

        private GameObject racine;
        private Canvas canvas;
        private Regie regie;
        private RectTransform bouton;
        private ScrollRect defile;

        [SetUp]
        public void Monter()
        {
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();
            racine = new GameObject(NomRacine, typeof(RectTransform), typeof(Canvas));
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

        // ------------------------------------------------------------------------------ le montage
        private static RectTransform Enfant(string nom, Transform parent)
        {
            var go = new GameObject(nom, typeof(RectTransform));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            return rt;
        }

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
        }

        private static Image Peinte(RectTransform rt, Color c)
        {
            if (rt.GetComponent<CanvasRenderer>() == null) rt.gameObject.AddComponent<CanvasRenderer>();
            Image im = rt.gameObject.AddComponent<Image>();
            im.color = c;
            return im;
        }

        /// <summary>Le viewport à `RectMask2D` qui remplit le canvas, le content en haut (pivot haut, 4 100 u), la cale transparente, le bouton blanc
        /// en bas. `avecScrollRect` : le `ScrollRect` vertical posé sur le conteneur, au sommet ; sinon le conteneur n'est qu'un `RectTransform`.</summary>
        private void MonterLaFeuille(bool avecScrollRect)
        {
            RectTransform conteneur = Enfant("Feuille", racine.transform);
            Etirer(conteneur);
            RectTransform viewport = Enfant("Viewport", conteneur);
            Etirer(viewport);
            viewport.gameObject.AddComponent<RectMask2D>();
            RectTransform content = Enfant("Content", viewport);
            content.anchorMin = new Vector2(0f, 1f); content.anchorMax = new Vector2(1f, 1f); content.pivot = new Vector2(0.5f, 1f);
            content.sizeDelta = new Vector2(0f, CaleHauteur + BoutonHauteur + BoutonAuDessusDuBas);
            content.anchoredPosition = Vector2.zero;

            RectTransform cale = Enfant("Cale", content);
            cale.anchorMin = new Vector2(0f, 1f); cale.anchorMax = new Vector2(1f, 1f); cale.pivot = new Vector2(0.5f, 1f);
            cale.sizeDelta = new Vector2(0f, CaleHauteur);
            cale.anchoredPosition = Vector2.zero;
            Peinte(cale, new Color(0f, 0f, 0f, 0f));

            bouton = Enfant("Bouton", content);
            bouton.anchorMin = bouton.anchorMax = new Vector2(0.5f, 0f);
            bouton.pivot = new Vector2(0.5f, 0f);
            bouton.sizeDelta = new Vector2(BoutonLargeur, BoutonHauteur);
            bouton.anchoredPosition = new Vector2(0f, BoutonAuDessusDuBas);
            Peinte(bouton, Color.white);
            Button b = Retour.NouveauBouton(bouton.gameObject);
            b.transition = Selectable.Transition.None;   // la teinte de `Selectable` polluerait la mesure (la production pose `Transition.None`)

            if (avecScrollRect)
            {
                defile = conteneur.gameObject.AddComponent<ScrollRect>();
                defile.viewport = viewport;
                defile.content = content;
                defile.horizontal = false;
                defile.vertical = true;
                defile.verticalNormalizedPosition = 1f;   // au sommet
            }
        }

        private RectInt ZoneDuBouton()
        {
            return RetourReleveHelper.RectPixels(bouton, canvas, L, H);
        }

        private List<LigneGp> Relever()
        {
            return RetourGpReleve.Relever("Defilement", "synthetique", racine, canvas, regie, L, H);
        }

        // ------------------------------------------------------------------------------ le contrôle positif
        [Test]
        public void Relever_BoutonEnBasDeLaFeuilleQuiDefile_EstAmeneDansLeCadre_EtVert()
        {
            MonterLaFeuille(avecScrollRect: true);

            // (a) la PRÉCONDITION, avant tout défilement : le bouton est hors de l'image (sans elle, ce test ne prouverait rien)
            RectInt avant = ZoneDuBouton();
            Assert.AreEqual(0, avant.height, "précondition : hors de l'image au sommet de la feuille (zone " + avant.width + "x" + avant.height + ")");
            Assert.AreEqual(1f, defile.verticalNormalizedPosition, 1e-4f, "précondition : le ScrollRect est au sommet");

            // (b) le relevé
            List<LigneGp> lignes = Relever();

            // (c) le verdict, le plancher, la position du rect APRÈS le relevé
            Assert.AreEqual(1, lignes.Count);
            LigneGp l = lignes[0];
            Assert.IsTrue(l.Pressable, "précondition : le bouton est pressable (sinon il ne serait ni défilé ni jugé)");
            Assert.IsNull(l.Verdict, l.Verdict);
            Assert.GreaterOrEqual(l.Pixels, Retour.PlancherPixels);
            Assert.Less(defile.verticalNormalizedPosition, 1f, "le relevé a fait défiler");
            RectInt apres = ZoneDuBouton();
            Assert.Greater(apres.width, 0);
            Assert.Greater(apres.height, 0);
            Assert.AreEqual((int)BoutonLargeur, apres.width, "entièrement dans l'image (largeur)");
            Assert.AreEqual((int)BoutonHauteur, apres.height, "entièrement dans l'image (hauteur)");
        }

        [Test]
        public void Relever_BoutonDejaVisible_NeProvoquePasDeDefilement()
        {
            // la cale est ramenée à rien : le content tient dans la fenêtre, le bouton est visible d'emblée
            MonterLaFeuille(avecScrollRect: true);
            ((RectTransform)bouton.parent).sizeDelta = new Vector2(0f, 200f);
            Canvas.ForceUpdateCanvases();
            Assert.Greater(ZoneDuBouton().height, 0, "précondition : le bouton est déjà dans l'image");
            Vector2 position = ((RectTransform)bouton.parent).anchoredPosition;

            List<LigneGp> lignes = Relever();

            Assert.IsNull(lignes[0].Verdict, lignes[0].Verdict);
            Assert.AreEqual(position, ((RectTransform)bouton.parent).anchoredPosition, "aucun défilement : le content n'a pas bougé");
        }

        // ------------------------------------------------------------------------------ le défilement n'est pas un passe-droit
        [Test]
        public void Relever_MemeMontageSansScrollRect_RestePasRougeHorsCadre()
        {
            MonterLaFeuille(avecScrollRect: false);
            Assert.AreEqual(0, ZoneDuBouton().height, "précondition : hors de l'image");

            List<LigneGp> lignes = Relever();

            Assert.AreEqual(1, lignes.Count);
            Assert.IsTrue(lignes[0].Pressable);
            Assert.IsNotNull(lignes[0].Verdict, "un bouton hors de l'image qu'aucun ScrollRect ne peut amener reste rouge");
            StringAssert.Contains("hors cadre", lignes[0].Verdict);
            Assert.AreEqual(0, ZoneDuBouton().height, "rien n'a bougé : toujours hors de l'image");
        }
    }
}
