using System.Collections.Generic;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Mouvements.Tests;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R6 (design retour d'appui v5, §4) — les gardes d'EFFET sur des MONTAGES SYNTHÉTIQUES : un `Canvas` nu, des `Image` réels, la régie réelle de
    // `RegieMouvement.PourTest()` (no-mock). On RENDU (`RetourReleveHelper`) et on COMPTE les pixels : une garde sur les paramètres d'un effet n'est pas
    // une garde sur son effet. Chaque garde porte son CONTRÔLE POSITIF — une version fautive qui doit rougir, avec le message exigé du tableau §4.
    // Ce ne sont PAS les gardes de population (GP : elles mesurent les écrans réels) ; ces montages ne sont JAMAIS comptés dans N ni dans l'inventaire.
    //   GS0_*  structurelle uGUI        GS2_*  composant        GE1_*  effet du mélange        GE2_*  effet du voile        GE4_*  sous ContentSizeFitter
    // Les tests rendent par `RenderTexture` : ils exigent un périphérique graphique (le helper lève sous `-nographics`, il ne passe pas au vert).
    [Category("RetourAppui")]
    public class RetourEffetPlayModeTests
    {
        private const string NomRacine = "RetourEffetCanvas";
        private const int L = RetourReleveHelper.Largeur, H = RetourReleveHelper.Hauteur;
        private const int SurfaceLargeur = 100, SurfaceHauteur = 60;
        private static readonly Color Surface = new Color(0.8f, 0.8f, 0.8f, 1f);
        /// <summary>`CouleurB = Cible × 1,00` : un réglage VALIDE et non nul qui ne produit aucun pixel (le contrôle positif de GE1).</summary>
        private const float FacteurSansEffet = 1.00f;
        // le rouge d'un pixel « de matière » / « de fond » : très loin l'un de l'autre, quel que soit l'espace colorimétrique du projet
        private const int RougeMatiereMini = 150, RougeFondMaxi = 60;

        /// <summary>Un `Graphic` qui n'est PAS un `MaskableGraphic` (forme de A10).</summary>
        private sealed class GraphicNu : Graphic { }

        private GameObject racine;
        private Canvas canvas;
        private Regie regie;

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
        private static RectTransform Rect(string nom, Transform parent, float largeur, float hauteur, float y = 0f)
        {
            var go = new GameObject(nom, typeof(RectTransform));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(largeur, hauteur);
            rt.anchoredPosition = new Vector2(0f, y);
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

        /// <summary>Un `Button` passé par le guichet, sans teinte de transition (la teinte de `Selectable` polluerait la mesure : la production
        /// de ces boutons pose `Transition.None`).</summary>
        private static Button Bouton(RectTransform rt, Graphic surface = null)
        {
            Button b = Retour.NouveauBouton(rt.gameObject, surface);
            b.transition = Selectable.Transition.None;
            return b;
        }

        /// <summary>Cas 2 : le bouton porte lui-même sa matière claire.</summary>
        private Button BoutonCas2(string nom)
        {
            RectTransform rt = Rect(nom, racine.transform, SurfaceLargeur, SurfaceHauteur);
            Peinte(rt, Surface);
            return Bouton(rt);
        }

        private MesureAppui Mesurer(Button b, RectTransform zone)
        {
            return RetourReleveHelper.MesurerAppui(canvas, L, H, zone, regie,
                () => RetourReleveHelper.Appuyer(b.gameObject), () => RetourReleveHelper.Relacher(b.gameObject));
        }

        private static int RougeAuCentre(Color32[] photo, RectInt z)
        {
            return photo[(z.yMin + z.height / 2) * L + z.xMin + z.width / 2].r;
        }

        private static List<string> Fratrie(Transform t)
        {
            var res = new List<string>();
            foreach (Transform x in t.GetComponentsInChildren<Transform>(true)) res.Add(RetourReleveHelper.Chemin(x) + "#" + x.GetSiblingIndex());
            return res;
        }

        // ------------------------------------------------------------------------------ le rendu lui-même
        [Test]
        public void RectPixels_RectConnu_EpouseLaSurfaceRendue()
        {
            // la méthode de zone est EXACTE sur un rect connu : 100 × 60 au centre d'un canvas 270 × 480 (scaleFactor 1) ⇒ x ∈ [85, 185[, y ∈ [210, 270[.
            // Et la photo le confirme aux quatre bords : matière à l'intérieur, fond à un pixel de là.
            Image s = Peinte(Rect("Surface", racine.transform, SurfaceLargeur, SurfaceHauteur), Surface);
            RectInt z = RetourReleveHelper.RectPixels(s.rectTransform, canvas, L, H);
            Assert.AreEqual(new RectInt((L - SurfaceLargeur) / 2, (H - SurfaceHauteur) / 2, SurfaceLargeur, SurfaceHauteur), z);

            Color32[] photo = RetourReleveHelper.Photographier(canvas, L, H);
            int ym = z.yMin + z.height / 2, xm = z.xMin + z.width / 2;
            Assert.GreaterOrEqual(photo[ym * L + z.xMin].r, RougeMatiereMini, "premier pixel de la zone, à gauche : matière");
            Assert.LessOrEqual(photo[ym * L + z.xMin - 1].r, RougeFondMaxi, "un pixel avant la zone, à gauche : fond");
            Assert.GreaterOrEqual(photo[ym * L + z.xMax - 1].r, RougeMatiereMini, "dernier pixel de la zone, à droite : matière");
            Assert.LessOrEqual(photo[ym * L + z.xMax].r, RougeFondMaxi, "un pixel après la zone, à droite : fond");
            Assert.GreaterOrEqual(photo[z.yMin * L + xm].r, RougeMatiereMini, "premier pixel de la zone, en bas : matière");
            Assert.LessOrEqual(photo[(z.yMin - 1) * L + xm].r, RougeFondMaxi, "un pixel avant la zone, en bas : fond");
            Assert.GreaterOrEqual(photo[(z.yMax - 1) * L + xm].r, RougeMatiereMini, "dernier pixel de la zone, en haut : matière");
            Assert.LessOrEqual(photo[z.yMax * L + xm].r, RougeFondMaxi, "un pixel après la zone, en haut : fond");
        }

        [Test]
        public void Photographier_RestaureLeCanvas()
        {
            Assert.AreEqual(RenderMode.ScreenSpaceOverlay, canvas.renderMode, "précondition");
            float plan = canvas.planeDistance;
            RetourReleveHelper.Photographier(canvas, L, H);
            Assert.AreEqual(RenderMode.ScreenSpaceOverlay, canvas.renderMode);
            Assert.IsNull(canvas.worldCamera);
            Assert.AreEqual(plan, canvas.planeDistance);
        }

        [Test]
        public void CompterEcart_DeuxPhotosIdentiques_Zero_EtUnEcartDeTroisOctetsCompte()
        {
            var a = new Color32[L * H];
            var b = new Color32[L * H];
            var zone = new RectInt(10, 10, 4, 3);
            Assert.AreEqual(0, RetourReleveHelper.CompterEcart(a, b, L, zone));
            b[10 * L + 10] = new Color32((byte)RetourReleveHelper.SeuilOctets, 0, 0, 255);                    // pile au seuil : compté
            b[10 * L + 11] = new Color32(0, 0, (byte)(RetourReleveHelper.SeuilOctets - 1), 255);          // un octet de moins : non compté
            b[0] = new Color32(255, 255, 255, 255);                                                       // hors zone : non compté
            Assert.AreEqual(1, RetourReleveHelper.CompterEcart(a, b, L, zone));
            Assert.AreEqual(2, RetourReleveHelper.CompterEcart(a, b, L, zone, RetourReleveHelper.SeuilResiduOctets));
        }

        // ------------------------------------------------------------------------------ GS0
        [Test]
        public void GS0_SurfaceNormale_Vert()
        {
            Image s = Peinte(Rect("Surface", racine.transform, SurfaceLargeur, SurfaceHauteur), Surface);
            Assert.IsNull(RetourReleveHelper.JugerGS0(s, RetourReleveHelper.Chemin(s.transform)));
        }

        [Test]
        public void GS0_ControlePositif_SansCanvasRenderer_RougitAvecLeMessageExige()
        {
            // la faute : une cible montée à l'exécution sans son CanvasRenderer ne dessine rien, la console est muette. Un `Graphic` ne s'arrache pas
            // son renderer dans l'éditeur (« depends on it », erreur journalisée) : le contrôle porte donc sur un GameObject SANS renderer, jugé par
            // la même fonction (qui lit `GetComponent<CanvasRenderer>()` de la cible, quelle qu'elle soit).
            var go = new GameObject("SansRenderer", typeof(RectTransform));
            go.transform.SetParent(racine.transform, false);
            Component g = go.AddComponent<CanvasGroup>();
            Assert.IsNull(go.GetComponent<CanvasRenderer>(), "précondition : pas de renderer");

            string chemin = RetourReleveHelper.Chemin(go.transform);
            Assert.AreEqual("GS0 : " + chemin + " — surface sans CanvasRenderer : rien ne sera dessiné", RetourReleveHelper.JugerGS0(g, chemin));
            Assert.IsNull(go.GetComponent<CanvasRenderer>(), "le relevé ne répare rien : il n'a pas posé le renderer qui manquait");
        }

        private Image SousUnMask(string nom)
        {
            RectTransform masque = Rect("Masque", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Peinte(masque, Color.white);
            masque.gameObject.AddComponent<Mask>();
            return Peinte(Rect(nom, masque, SurfaceLargeur, SurfaceHauteur), Surface);
        }

        [Test]
        public void GS0_SurfaceMaskableSousUnMask_Vert()
        {
            Image s = SousUnMask("Maskable");
            Assert.IsTrue(s.maskable, "précondition");
            Assert.IsNull(RetourReleveHelper.JugerGS0(s, RetourReleveHelper.Chemin(s.transform)));
        }

        [Test]
        public void GS0_ControlePositif_SurfaceNonMaskableSousUnMask_Rougit()
        {
            Image s = SousUnMask("NonMaskable");
            s.maskable = false;
            string verdict = RetourReleveHelper.JugerGS0(s, RetourReleveHelper.Chemin(s.transform));
            Assert.IsNotNull(verdict);
            StringAssert.StartsWith("GS0 : " + RetourReleveHelper.Chemin(s.transform) + " — ", verdict);
            StringAssert.Contains("non maskable", verdict);
        }

        [Test]
        public void GS0_ControlePositif_GraphicQuiNEstPasUnMaskableGraphicSousUnMask_Rougit()
        {
            RectTransform masque = Rect("Masque", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Peinte(masque, Color.white);
            masque.gameObject.AddComponent<Mask>();
            // le renderer est posé À LA MAIN : seule la maskabilité doit être en cause ici
            var go = new GameObject("GraphicNu", typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(masque, false);
            Graphic g = go.AddComponent<GraphicNu>();
            string verdict = RetourReleveHelper.JugerGS0(g, RetourReleveHelper.Chemin(go.transform));
            Assert.IsNotNull(verdict);
            StringAssert.StartsWith("GS0 : " + RetourReleveHelper.Chemin(go.transform) + " — ", verdict);
            StringAssert.Contains("non maskable", verdict);
        }

        [Test]
        public void GS0_OrdreDeFratrie_Cas1_InchangeParUnAppuiReel()
        {
            RectTransform avant = Rect("Avant", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Peinte(avant, Surface);
            RectTransform hote = Rect("Hote", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Peinte(Rect("Fond", hote, SurfaceLargeur, SurfaceHauteur), Surface);
            Image plaque = Peinte(Rect("Plaque", hote, SurfaceLargeur, SurfaceHauteur), Surface);
            Peinte(Rect("Dessus", hote, SurfaceLargeur, SurfaceHauteur), Surface);
            Rect("Apres", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Button b = Bouton(hote, plaque);

            List<string> avantAppui = Fratrie(racine.transform);
            RetourReleveHelper.Appuyer(b.gameObject);
            RetourAppui ra = b.GetComponent<RetourAppui>();
            Assert.AreEqual(CasRetour.Surface, ra.Cas, "précondition : c'est bien le cas 1");
            Assert.IsFalse(ra.Handle.EstNul, "précondition : l'appui est attaché");
            CollectionAssert.AreEqual(avantAppui, Fratrie(racine.transform), "sous le doigt");
            RetourReleveHelper.Relacher(b.gameObject);
            CollectionAssert.AreEqual(avantAppui, Fratrie(racine.transform), "après le relâchement");
        }

        [Test]
        public void GS0_OrdreDeFratrie_Cas3_InchangeParUnAppuiReel()
        {
            RectTransform avant = Rect("Avant", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Peinte(avant, Surface);
            RectTransform hote = Rect("Hote", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Peinte(Rect("Matiere", hote, SurfaceLargeur, SurfaceHauteur), Surface);
            Rect("Apres", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Button b = Bouton(hote);

            List<string> avantAppui = Fratrie(racine.transform);
            RetourReleveHelper.Appuyer(b.gameObject);
            RetourAppui ra = b.GetComponent<RetourAppui>();
            Assert.AreEqual(CasRetour.VoileDuBouton, ra.Cas, "précondition : c'est bien le cas 3");
            Assert.IsFalse(ra.Handle.EstNul, "précondition : l'appui est attaché");
            CollectionAssert.AreEqual(avantAppui, Fratrie(racine.transform), "sous le doigt");
            RetourReleveHelper.Relacher(b.gameObject);
            CollectionAssert.AreEqual(avantAppui, Fratrie(racine.transform), "après le relâchement");
        }

        // ------------------------------------------------------------------------------ GS2
        [Test]
        public void GS2_EcranDeTroisBoutons_PassesParLeGuichet_Vide()
        {
            for (int i = 0; i < 3; i++) Bouton(Rect("Bouton" + i, racine.transform, SurfaceLargeur, SurfaceHauteur));
            Assert.AreEqual(3, racine.GetComponentsInChildren<Button>(true).Length, "précondition : trois boutons");
            Assert.IsEmpty(RetourReleveHelper.ReleverGS2(racine));
        }

        [Test]
        public void GS2_ControlePositif_ButtonMonteParAddComponentDirect_RougitAvecLeMessageExige()
        {
            // le montage de TEST crée le Button hors du guichet (GS1 ne scanne que Assets/Scripts) : la garde de composant doit le nommer
            Bouton(Rect("Bon", racine.transform, SurfaceLargeur, SurfaceHauteur));
            RectTransform nu = Rect("BoutonNu", racine.transform, SurfaceLargeur, SurfaceHauteur);
            nu.gameObject.AddComponent<Button>();

            List<string> rouges = RetourReleveHelper.ReleverGS2(racine);
            Assert.AreEqual(1, rouges.Count, string.Join(" | ", rouges));
            Assert.AreEqual("GS2 : " + NomRacine + "/BoutonNu porte 0 RetourAppui, attendu 1", rouges[0]);
        }

        [Test]
        public void GS2_DeuxRetourAppui_MessageExige()
        {
            // le cas « 2 » n'est PAS constructible : `RetourAppui` est [DisallowMultipleComponent], Unity refuse le second `AddComponent`. La garde
            // reste un juge pur, et son message est épinglé ici.
            Assert.AreEqual("GS2 : A/B porte 2 RetourAppui, attendu 1", RetourReleveHelper.JugerGS2("A/B", 2));
            Assert.IsNull(RetourReleveHelper.JugerGS2("A/B", 1));
        }

        [Test]
        public void GS2_BoutonInactifOuNonInteractable_GardeSonComposant_EstCompteEtVert()
        {
            Button inactif = Bouton(Rect("Inactif", racine.transform, SurfaceLargeur, SurfaceHauteur));
            inactif.gameObject.SetActive(false);
            Button fige = Bouton(Rect("NonInteractable", racine.transform, SurfaceLargeur, SurfaceHauteur));
            fige.interactable = false;
            Assert.IsEmpty(RetourReleveHelper.ReleverGS2(racine));
        }

        [Test]
        public void GS2_ControlePositif_BoutonInactifSansComposant_EstQuandMemeReleve()
        {
            // un bouton inactif n'échappe pas au relevé (`GetComponentsInChildren<Button>(true)`) : sans lui, la garde serait verte pour les états cachés
            RectTransform nu = Rect("InactifNu", racine.transform, SurfaceLargeur, SurfaceHauteur);
            nu.gameObject.AddComponent<Button>();
            nu.gameObject.SetActive(false);
            Assert.AreEqual(new[] { "GS2 : " + NomRacine + "/InactifNu porte 0 RetourAppui, attendu 1" }, RetourReleveHelper.ReleverGS2(racine).ToArray());
        }

        // ------------------------------------------------------------------------------ GE1
        [Test]
        public void GE1_Cas2_EffetAuDessusDuPlancher()
        {
            Button b = BoutonCas2("BoutonCas2");
            var cible = (RectTransform)b.transform;
            MesureAppui m = Mesurer(b, cible);
            Assert.AreEqual(CasRetour.GraphicDuBouton, b.GetComponent<RetourAppui>().Cas, "précondition : c'est bien le cas 2");
            Assert.IsNull(RetourReleveHelper.JugerGE1(RetourReleveHelper.Chemin(b.transform), m.Effet));
            Assert.GreaterOrEqual(m.Effet, Retour.PlancherPixels);
        }

        [Test]
        public void GE1_Cas2_ApresLeRelachement_AucunPixelResiduel()
        {
            Button b = BoutonCas2("BoutonCas2");
            MesureAppui m = Mesurer(b, (RectTransform)b.transform);
            Assert.GreaterOrEqual(m.Effet, Retour.PlancherPixels, "précondition : l'effet a eu lieu (sinon « aucun résidu » serait vide)");
            Assert.AreEqual(0, m.Residus, "retour aux pixels du repos : la restitution de Detacher est immédiate");
        }

        [Test]
        public void GE1_Cas1_SurfaceNommee_EffetAuDessusDuPlancher()
        {
            RectTransform hote = Rect("Hote", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Image plaque = Peinte(Rect("Plaque", hote, SurfaceLargeur, SurfaceHauteur), Surface);
            Button b = Bouton(hote, plaque);
            MesureAppui m = Mesurer(b, plaque.rectTransform);
            Assert.AreEqual(CasRetour.Surface, b.GetComponent<RetourAppui>().Cas, "précondition : c'est bien le cas 1");
            Assert.IsNull(RetourReleveHelper.JugerGE1(RetourReleveHelper.Chemin(plaque.transform), m.Effet));
            Assert.AreEqual(0, m.Residus);
        }

        [Test]
        public void GE1_ControlePositif_CouleurBEgaleCible_AucunPixel_RougitAvecLeMessageExige()
        {
            // le MÊME montage de mesure, sans toucher au code livré : on attache par la régie une entrée dont `CouleurB = Cible × 1,00`. Le réglage
            // est valide et non nul (un Melange 0 → 1), il ne produit AUCUN pixel : seule la mesure de pixels le voit.
            Image s = Peinte(Rect("Surface", racine.transform, SurfaceLargeur, SurfaceHauteur), Surface);
            const string id = "t.melange.ge1.sans-effet";
            var def = new MouvementDefini(id, Genre.Alerte, RetourReleveHelper.DureeAppuiS,
                new[] { new Canal(Propriete.Melange, Mode.Absolu, new[] { AidesMouvement.K(0f, 0f), AidesMouvement.K(1f, 1f) }) },
                Iteration.Fois(1), couleurA: CouleurSpec.Cible, couleurB: CouleurSpec.CibleFois(FacteurSansEffet));
            Entree e = AidesMouvement.Faire(id, def);
            regie.Admettre(e);

            Handle h = Handle.Nul;
            MesureAppui m = RetourReleveHelper.MesurerAppui(canvas, L, H, s.rectTransform, regie,
                () => h = regie.Attacher(e, s.rectTransform, Reglage.Defaut), () => regie.Detacher(h));

            Assert.IsFalse(h.EstNul, "précondition : l'entrée est attachée, le réglage est valide");
            Assert.GreaterOrEqual(RougeAuCentre(m.Repos, m.Zone), RougeMatiereMini, "précondition : la matière est rendue (sinon « 0 pixel » serait vide)");
            Assert.Less(m.Effet, Retour.PlancherPixels);
            string chemin = RetourReleveHelper.Chemin(s.transform);
            // le texte est celui du tableau §4, écrit en toutes lettres : un oracle indépendant du juge
            Assert.AreEqual("GE1 : " + chemin + " — " + m.Effet + " pixels franchissent 3/255, attendu ≥ 12 : réglage valide, effet nul",
                RetourReleveHelper.JugerGE1(chemin, m.Effet));
        }

        [Test]
        public void GE1_Juge_LePlancherPile_EstVert_UnDeMoinsEstRouge()
        {
            Assert.IsNull(RetourReleveHelper.JugerGE1("X", Retour.PlancherPixels));
            Assert.IsNotNull(RetourReleveHelper.JugerGE1("X", Retour.PlancherPixels - 1));
        }

        // ------------------------------------------------------------------------------ GE2
        [Test]
        public void GE2_Cas3_VoileSurLeBouton_EffetAuDessusDuPlancher()
        {
            RectTransform hote = Rect("Hote", racine.transform, SurfaceLargeur, SurfaceHauteur);
            Etirer(Peinte(Rect("Matiere", hote, SurfaceLargeur, SurfaceHauteur), Surface).rectTransform);
            Button b = Bouton(hote);
            MesureAppui m = Mesurer(b, hote);
            Assert.AreEqual(CasRetour.VoileDuBouton, b.GetComponent<RetourAppui>().Cas, "précondition : c'est bien le cas 3");
            Assert.IsNull(RetourReleveHelper.JugerGE2(RetourReleveHelper.Chemin(hote), m.Effet, hote.name));
            Assert.GreaterOrEqual(m.Effet, Retour.PlancherPixels);
            Assert.AreEqual(0, m.Residus, "retour aux pixels du repos");
        }

        /// <summary>Cas 4 : le parent direct `q` peint, le bouton `b` ne peint rien ; l'encre de `q` est dans son rect mais HORS de celui de `b`
        /// (q 100 × 50, aire 5 000 ≤ 2 × 3 000 ; `b` en haut sur 30 px, l'encre en bas sur 20 px, bord à bord).</summary>
        private Button MontageCas4(out RectTransform q, out RectTransform rectBouton)
        {
            q = Rect("Parent", racine.transform, SurfaceLargeur, 50f);
            rectBouton = Rect("Bouton", q, SurfaceLargeur, 30f, 10f);
            Peinte(Rect("Encre", q, SurfaceLargeur, 20f, -15f), Surface);
            return Bouton(rectBouton);
        }

        [Test]
        public void GE2_Cas4_EncreHorsDuRectDuBouton_MesureSurLeRectDeQ_Vert()
        {
            Button b = MontageCas4(out RectTransform q, out RectTransform rb);
            MesureAppui m = Mesurer(b, q);
            RetourAppui ra = b.GetComponent<RetourAppui>();
            Assert.AreEqual(CasRetour.VoileDuParent, ra.Cas, "précondition : c'est bien le cas 4");
            Assert.IsNull(RetourReleveHelper.JugerGE2(RetourReleveHelper.Chemin(rb), m.Effet, q.name),
                "le voile est posé sur q : l'effet se mesure sur le rect de q (B2 du design)");
            Assert.GreaterOrEqual(m.Effet, Retour.PlancherPixels);
        }

        [Test]
        public void GE2_Cas4_MesureSurLeRectDuBouton_SeraitRougeSurUnVoileQuiMarche()
        {
            // B2 : « le rect du bouton » rendrait la garde ROUGE sur un voile qui marche dès que l'encre de q tombe hors du rect de b. Ce test
            // l'épingle : mêmes rendus, deux zones ; sur celle du bouton, 0 pixel.
            Button b = MontageCas4(out RectTransform q, out RectTransform rb);
            MesureAppui m = Mesurer(b, q);
            Assert.GreaterOrEqual(m.Effet, Retour.PlancherPixels, "précondition : le voile marche sur q");
            RectInt zoneBouton = RetourReleveHelper.RectPixels(rb, canvas, L, H);
            int surLeBouton = RetourReleveHelper.CompterEcart(m.Repos, m.SousLeDoigt, L, zoneBouton);
            Assert.AreEqual(0, surLeBouton, "aucune encre dans le rect du bouton");
            Assert.IsNotNull(RetourReleveHelper.JugerGE2("X", surLeBouton, rb.name));
        }

        [Test]
        public void GE2_ControlePositif_VoileSurUnSousArbreSansEncre_RougitAvecLeMessageExige()
        {
            // c'est l'ancien « cas 5 » devenu rouge : un voile posé sur un sous-arbre qui ne peint RIEN. Le témoin, lui, peint (anti-vacuité : le
            // rendu fonctionne dans ce run, le zéro est celui du voile).
            RectTransform vide = Rect("SousArbreVide", racine.transform, SurfaceLargeur, SurfaceHauteur, 100f);
            Image temoin = Peinte(Rect("Temoin", racine.transform, SurfaceLargeur, SurfaceHauteur, -100f), Surface);

            Handle h = Handle.Nul;
            float alphaSousLeDoigt = 1f;
            MesureAppui m = RetourReleveHelper.MesurerAppui(canvas, L, H, vide, regie,
                () => h = regie.AttacherVoileDAppui(vide),
                () => { alphaSousLeDoigt = vide.GetComponent<CanvasGroup>().alpha; regie.Detacher(h); });

            Assert.IsFalse(h.EstNul, "précondition : le handle est non nul (c'est le piège : attaché, et rien à voir)");
            Assert.Less(alphaSousLeDoigt, 1f, "précondition : le voile a bien été écrit sur le CanvasGroup");
            RectInt zoneTemoin = RetourReleveHelper.RectPixels(temoin.rectTransform, canvas, L, H);
            Assert.GreaterOrEqual(RougeAuCentre(m.Repos, zoneTemoin), RougeMatiereMini, "précondition : le rendu fonctionne (le témoin est rendu)");
            Assert.AreEqual(0, m.Effet);
            string chemin = RetourReleveHelper.Chemin(vide);
            Assert.AreEqual("GE2 : " + chemin + " — voile sans encre sur SousArbreVide : 0 pixel", RetourReleveHelper.JugerGE2(chemin, m.Effet, vide.name));
        }

        // ------------------------------------------------------------------------------ GE4
        // ⛔ Ce montage est SYNTHÉTIQUE et n'est JAMAIS compté : ni dans N, ni dans l'inventaire, ni dans GS2 / GP. Il ne sert qu'à prouver que
        // la garde PEUT rougir (le bouton de ㉜ ne peut pas la porter : cas 1-2 impossibles, design §4 et §5 B2).
        private Button BoutonSousContentSizeFitter(out RectTransform rb)
        {
            RectTransform ajuste = Rect("Ajuste", racine.transform, SurfaceLargeur + 40f, SurfaceHauteur + 40f);
            ajuste.gameObject.AddComponent<ContentSizeFitter>();   // Unconstrained : G11 lit sa PRÉSENCE, la géométrie ne bouge pas
            rb = Rect("Bouton", ajuste, SurfaceLargeur, SurfaceHauteur);
            Peinte(rb, Surface);                                    // OPAQUE (alpha 1), sur le GameObject du Button
            return Bouton(rb);
        }

        [Test]
        public void GE4_SousContentSizeFitter_Cas2_HandleNonNul_RefusInchange_GE1Vert()
        {
            Button b = BoutonSousContentSizeFitter(out RectTransform rb);
            Assert.AreEqual(CasRetour.GraphicDuBouton, Retour.Decider(b, null).Cas, "cas 2");
            RetourAppui ra = b.GetComponent<RetourAppui>();
            int refusAvant = regie.Refus;
            bool handleNul = true;
            MesureAppui m = RetourReleveHelper.MesurerAppui(canvas, L, H, rb, regie,
                () => { RetourReleveHelper.Appuyer(b.gameObject); handleNul = ra.Handle.EstNul; },
                () => RetourReleveHelper.Relacher(b.gameObject));

            Assert.IsNull(RetourReleveHelper.JugerGE4(handleNul, "ne doit pas être lu"), "retour d'appui = Melange seul : aucune Echelle, G11 ne refuse rien");
            Assert.IsFalse(handleNul);
            Assert.AreEqual(refusAvant, regie.Refus);
            Assert.IsNull(RetourReleveHelper.JugerGE1(RetourReleveHelper.Chemin(rb), m.Effet));
        }

        [Test]
        public void GE4_ControlePositif_EchelleSousContentSizeFitter_G11Refuse_HandleNul_RougitAvecLeMessageExige()
        {
            // rendre à un retour un canal `Echelle` : G11 (`Gardes.cs`) refuse l'entrée ENTIÈRE sous un ContentSizeFitter ancêtre. L'`Id` est celui d'une
            // entrée synthétique de genre Retour (jamais `retour.appui` : G14 refuserait pour une AUTRE raison et le contrôle serait vide).
            BoutonSousContentSizeFitter(out RectTransform rb);
            const string id = "t.retour.echelle.ge4";
            Entree e = AidesMouvement.Faire(id, AidesMouvement.Constant(id, Genre.Retour, Propriete.Echelle, Mode.Multiplicatif, 0.95f));
            regie.Admettre(e);
            string raison = Gardes.G11(rb, e.Mouvement.Canaux[0]);
            Assert.IsNotNull(raison, "précondition : G11 refuse une Echelle sous un ContentSizeFitter ancêtre");
            int refusAvant = regie.Refus;

            LogAssert.Expect(LogType.Warning, new Regex(@"refus de t\.retour\.echelle\.ge4 : G11 : une Echelle"));
            Handle h = regie.Attacher(e, rb, Reglage.Defaut);

            Assert.IsTrue(h.EstNul);
            Assert.AreEqual(refusAvant + 1, regie.Refus);
            Assert.AreEqual("GE4 : handle nul sous un ContentSizeFitter ancêtre — " + raison, RetourReleveHelper.JugerGE4(h.EstNul, raison));
        }
    }
}
