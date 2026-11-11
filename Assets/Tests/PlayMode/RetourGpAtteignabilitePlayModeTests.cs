using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R6 (design retour d'appui v5, §4) — l'ATTEIGNABILITÉ (ruling f2 11/11) : un bouton actif dont le CENTRE est recouvert par un `Graphic`
    // étranger à raycastTarget, dessiné AU-DESSUS, est un défaut (rouge nommé « GP-RECOUVERT », jamais neutre). Cas mesuré : le `HeatToggle` du pied
    // de la carte, sous la plaque de la file de l'Accueil (run 12, photo de repos).
    // MONTAGE SYNTHÉTIQUE (jamais compté dans N ni dans l'inventaire) : un `Canvas` nu, un bouton blanc de 100 × 60 au centre, un couvreur.
    //   - couvreur plus tard dans la hiérarchie, raycastTarget, sur le centre ⇒ recouvert (contrôle positif) ;
    //   - couvreur plus tôt (dessous) ⇒ atteignable ; couvreur sans raycastTarget ⇒ atteignable ; groupe qui ne bloque pas ⇒ atteignable ;
    //     couvreur qui ne touche pas le centre ⇒ atteignable ;
    //   - par `Relever` : le verdict est rouge et porte le nom du couvreur.
    [Category("RetourAppui")]
    public class RetourGpAtteignabilitePlayModeTests
    {
        private GameObject racine;
        private Canvas canvas;
        private Regie regie;

        [SetUp]
        public void Monter()
        {
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();
            racine = new GameObject("AtteignabiliteCanvas", typeof(RectTransform), typeof(Canvas));
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

        private RectTransform Peint(string nom, Vector2 centre, Vector2 taille, Color couleur, bool raycast = true)
        {
            var go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            var rt = (RectTransform)go.transform;
            rt.SetParent(racine.transform, false);
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = taille;
            rt.anchoredPosition = centre;
            Image im = go.AddComponent<Image>();
            im.color = couleur;
            im.raycastTarget = raycast;
            return rt;
        }

        private Button Bouton()
        {
            RectTransform rt = Peint("Bouton", Vector2.zero, new Vector2(100f, 60f), Color.white);
            Button b = Retour.NouveauBouton(rt.gameObject);
            b.targetGraphic = rt.GetComponent<Image>();
            return b;
        }

        [Test]
        public void CouvreurPlusTard_RaycastTarget_SurLeCentre_EstRecouvert()
        {
            Button b = Bouton();
            Peint("Plaque", Vector2.zero, new Vector2(300f, 200f), new Color(0f, 0f, 0f, 1f));
            StringAssert.StartsWith("AtteignabiliteCanvas/Plaque", Atteignabilite.QuiRecouvreLeCentre(b));
        }

        [Test]
        public void CouvreurPlusTot_EstDessous_BoutonAtteignable()
        {
            Peint("Plaque", Vector2.zero, new Vector2(300f, 200f), Color.black);
            Button b = Bouton();   // créé APRÈS : dessiné au-dessus
            Assert.IsNull(Atteignabilite.QuiRecouvreLeCentre(b));
        }

        [Test]
        public void CouvreurSansRaycastTarget_BoutonAtteignable()
        {
            Button b = Bouton();
            Peint("Decor", Vector2.zero, new Vector2(300f, 200f), Color.black, raycast: false);
            Assert.IsNull(Atteignabilite.QuiRecouvreLeCentre(b));
        }

        [Test]
        public void CouvreurDansUnGroupeQuiNeBloquePas_BoutonAtteignable()
        {
            Button b = Bouton();
            RectTransform plaque = Peint("Plaque", Vector2.zero, new Vector2(300f, 200f), Color.black);
            plaque.gameObject.AddComponent<CanvasGroup>().blocksRaycasts = false;
            Assert.IsNull(Atteignabilite.QuiRecouvreLeCentre(b));
        }

        [Test]
        public void CouvreurQuiNeToucheQueLeBord_BoutonAtteignable()
        {
            Button b = Bouton();
            Peint("Plaque", new Vector2(120f, 0f), new Vector2(100f, 60f), Color.black);   // à droite : le centre du bouton reste libre
            Assert.IsNull(Atteignabilite.QuiRecouvreLeCentre(b));
        }

        [Test]
        public void SonPropreSousArbre_NeLeRecouvrePas()
        {
            Button b = Bouton();
            var go = new GameObject("Etiquette", typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(b.transform, false);
            go.AddComponent<Image>().raycastTarget = true;
            ((RectTransform)go.transform).sizeDelta = new Vector2(100f, 60f);
            Assert.IsNull(Atteignabilite.QuiRecouvreLeCentre(b));
        }

        [Test]
        public void Relever_UnBoutonRecouvert_EstRouge_EtNommeSonCouvreur()
        {
            Button b = Bouton();
            Peint("Plaque", Vector2.zero, new Vector2(300f, 200f), new Color(0.2f, 0.2f, 0.3f, 1f));
            List<LigneGp> lignes = RetourGpReleve.Relever("Atteignabilite", "recouvert", racine, canvas, regie,
                                                         RetourReleveHelper.Largeur, RetourReleveHelper.Hauteur);
            Assert.AreEqual(1, lignes.Count, "un seul bouton monté");
            Assert.IsTrue(lignes[0].Pressable, "précondition : le bouton est pressable");
            StringAssert.StartsWith("AtteignabiliteCanvas/Plaque", lignes[0].Recouvert);
            StringAssert.StartsWith("GP-RECOUVERT", lignes[0].Verdict, "un bouton recouvert est ROUGE, jamais neutre");
            StringAssert.Contains("Plaque", lignes[0].Verdict);
        }
    }
}
