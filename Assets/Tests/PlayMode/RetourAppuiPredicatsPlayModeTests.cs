using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R4 (design retour d'appui v5, §3.1-§3.4) — les prédicats et la décision de `Retour.cs`, SANS scène lourde : un `Canvas` nu, des
    // `Image`/`Text` réels, la régie réelle de `RegieMouvement.PourTest()` (no-mock). Ce ne sont PAS les gardes d'effet (GE1-GE4, GP : E-R6,
    // qui rendent et comptent des pixels) : ici, l'arithmétique du majorant, le classement 1-4 et le scan GS1 (fonction pure, avec son
    // contrôle positif). Catégorie « RetourAppui », celle du lot (inscrite au filtre de MafiaCI).
    [Category("RetourAppui")]
    public class RetourAppuiPredicatsPlayModeTests
    {
        private GameObject racine;
        private Canvas canvas;

        [SetUp]
        public void Monter()
        {
            RegieMouvement.Oublier();
            racine = new GameObject("RetourCanvas", typeof(RectTransform), typeof(Canvas));
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

        private static RectTransform Rect(string nom, Transform parent, float largeur, float hauteur)
        {
            var go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(largeur, hauteur);
            return rt;
        }

        private static Image Peinte(RectTransform rt, Color c)
        {
            Image im = rt.gameObject.AddComponent<Image>();
            im.color = c;
            return im;
        }

        private static Text Etiquette(RectTransform rt, string texte, Color c)
        {
            Text t = rt.gameObject.AddComponent<Text>();
            t.text = texte;
            t.color = c;
            return t;
        }

        private static PointerEventData Doigt() => new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };

        // ------------------------------------------------------------------------------ GS1 : le scan de source (fonction pure)
        /// <summary>GS1 sur l'ARBRE RÉEL (E-R5, design §4) : 0 création de `Button` dans `Assets/Scripts` hors du guichet. Deux gardes de vacuité :
        /// le nombre de fichiers lus (un dossier vide serait vert) et le guichet lui-même, que le scan DOIT voir quand on le range sous un autre
        /// chemin (sans quoi un scan aveugle rendrait 0 partout).</summary>
        [Test]
        public void Gs1_ArbreReel_AucunButtonCreeHorsDuGuichet()
        {
            string dossier = System.IO.Path.Combine(Application.dataPath, "Scripts");
            string[] fichiers = System.IO.Directory.GetFiles(dossier, "*.cs", System.IO.SearchOption.AllDirectories);
            Assert.Greater(fichiers.Length, 200, "anti-vacuité : trop peu de sources lues dans " + dossier + " (" + fichiers.Length + ")");

            var rouges = new System.Collections.Generic.List<string>();
            string guichet = null;
            foreach (string f in fichiers)
            {
                string chemin = "Assets/Scripts/" + f.Substring(dossier.Length).TrimStart('/', '\\').Replace('\\', '/');
                string contenu = System.IO.File.ReadAllText(f);
                rouges.AddRange(Retour.ScanCreationsDeBouton(chemin, contenu));
                if (chemin == "Assets/Scripts/ShellContracts/Retour.cs") guichet = contenu;
            }
            Assert.IsNotNull(guichet, "anti-vacuité : ShellContracts/Retour.cs n'a pas été lu");
            Assert.GreaterOrEqual(Retour.ScanCreationsDeBouton("Assets/Scripts/Shell/Ailleurs.cs", guichet).Count, 1,
                "contrôle positif : le guichet rangé ailleurs DOIT rougir — sinon le scan est aveugle");
            Assert.AreEqual(0, rouges.Count, string.Join("\n", rouges));
        }

        [Test]
        public void Gs1_UnButtonCreeAilleurs_RougitAvecLeMessageExige()
        {
            string source = "class X\n{\n    void F(GameObject g) { var b = g.AddComponent<Button>(); }\n}\n";
            var res = Retour.ScanCreationsDeBouton("Assets/Scripts/Shell/X.cs", source);
            Assert.AreEqual(1, res.Count, "contrôle positif : le motif doit rougir");
            Assert.AreEqual("GS1 : Assets/Scripts/Shell/X.cs:3 crée un Button hors Retour.NouveauBouton", res[0]);
        }

        [Test]
        public void Gs1_RetourCs_EstExempte()
        {
            string source = "var b = hote.AddComponent<Button>();\n";
            Assert.AreEqual(1, Retour.ScanCreationsDeBouton("Assets/Scripts/Shell/X.cs", source).Count, "le même contenu rougit ailleurs");
            Assert.AreEqual(0, Retour.ScanCreationsDeBouton("Assets/Scripts/ShellContracts/Retour.cs", source).Count);
        }

        [Test]
        public void Gs1_CommentairesEtChaines_NeCreentRien_EtLesLignesRestentJustes()
        {
            string source = string.Join("\n", new[]
            {
                "using X;",                                   // 1
                "// g.AddComponent<Button>() en commentaire", // 2
                "/* g.AddComponent<Button>()",                // 3
                "   sur deux lignes */",                      // 4
                "string s = \"g.AddComponent<Button>()\";",   // 5
                "string v = @\"g.AddComponent<Button>()",     // 6
                "\";",                                        // 7
                "var b = g.AddComponent<Button>();",          // 8
                "",
            });
            var res = Retour.ScanCreationsDeBouton("a.cs", source);
            Assert.AreEqual(1, res.Count, string.Join(" | ", res));
            Assert.AreEqual("GS1 : a.cs:8 crée un Button hors Retour.NouveauBouton", res[0]);
        }

        [Test]
        public void Gs1_LeNomQualifie_EtLEspace_SontVus_UnAutreTypeNon()
        {
            Assert.AreEqual(1, Retour.ScanCreationsDeBouton("a.cs", "g.AddComponent< UnityEngine.UI.Button >();").Count);
            Assert.AreEqual(0, Retour.ScanCreationsDeBouton("a.cs", "g.AddComponent<LongPressButton>();").Count, "LongPressButton n'est pas un Button");
            Assert.AreEqual(0, Retour.ScanCreationsDeBouton("a.cs", string.Empty).Count);
            Assert.AreEqual(0, Retour.ScanCreationsDeBouton("a.cs", null).Count);
        }

        // ------------------------------------------------------------------------------ G10 : aucun Update
        [Test]
        public void RetourAppui_NAPasDeUpdate()
        {
            const BindingFlags tous = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;
            foreach (string nom in new[] { "Update", "LateUpdate", "FixedUpdate" })
                Assert.IsNull(typeof(RetourAppui).GetMethod(nom, tous), "G10 (liste fermée) : RetourAppui ne porte pas de " + nom);
        }

        // ------------------------------------------------------------------------------ RendSurface : le plancher à deux facteurs
        [Test]
        public void RendSurface_ImageBlancheOpaque_Vrai_NoirEtTransparente_Faux()
        {
            RectTransform r = Rect("S", racine.transform, 40, 20);
            Image im = Peinte(r, Color.white);
            Assert.IsTrue(Retour.RendSurface(im), "blanc opaque : 0,15 de magnitude");
            im.color = Color.black;
            Assert.IsFalse(Retour.RendSurface(im), "noir : × 0,85 n'écarte rien");
            im.color = new Color(1f, 1f, 1f, 0f);
            Assert.IsFalse(Retour.RendSurface(im), "alpha 0 : rien à assombrir");
            im.color = Color.white;
            im.enabled = false;
            Assert.IsFalse(Retour.RendSurface(im), "désactivée");
            Assert.IsFalse(Retour.RendSurface(null));
        }

        [Test]
        public void RendSurface_AlphaCumuleDuGroupe_PorteLaMagnitude()
        {
            RectTransform parent = Rect("P", racine.transform, 60, 30);
            CanvasGroup cg = parent.gameObject.AddComponent<CanvasGroup>();
            Image im = Peinte(Rect("S", parent, 40, 20), Color.white);
            cg.alpha = 0.039f;
            Assert.IsFalse(Retour.RendSurface(im), "§3.2 : 0,15 × 0,851 × 0,039 ≈ 0,005 < 3/255 ⇒ ce n'est pas une surface");
            cg.alpha = 1f;
            Assert.IsTrue(Retour.RendSurface(im));
            // `ignoreParentGroups` : le groupe de l'enfant coupe la chaîne
            CanvasGroup propre = im.gameObject.AddComponent<CanvasGroup>();
            propre.ignoreParentGroups = true;
            cg.alpha = 0.039f;
            Assert.IsTrue(Retour.RendSurface(im), "le groupe qui ignore ses parents s'arrête là");
        }

        [Test]
        public void RendSurface_PlancherDEtendue_EnPixelsDEcran()
        {
            Image petite = Peinte(Rect("Petite", racine.transform, 3, 3), Color.white);
            Assert.IsFalse(Retour.RendSurface(petite), "9 px < 12 : magnitude suffisante, étendue non");
            Image juste = Peinte(Rect("Juste", racine.transform, 4, 3), Color.white);
            Assert.IsTrue(Retour.RendSurface(juste), "12 px = le plancher");
            canvas.scaleFactor = 2f;
            Assert.IsTrue(Retour.RendSurface(petite), "3 × 3 unités à scaleFactor 2 = 36 px d'écran");
        }

        [Test]
        public void RendSurface_MasqueInvisible_EtTexte_Faux()
        {
            RectTransform r = Rect("M", racine.transform, 40, 20);
            Image im = Peinte(r, Color.white);
            Mask m = r.gameObject.AddComponent<Mask>();
            m.showMaskGraphic = false;
            Assert.IsFalse(Retour.RendSurface(im), "un Mask à showMaskGraphic=false ne peint pas");
            m.showMaskGraphic = true;
            Assert.IsTrue(Retour.RendSurface(im));
            Text t = Etiquette(Rect("T", racine.transform, 40, 20), "OK", Color.white);
            Assert.IsFalse(Retour.RendSurface(t), "un texte n'est jamais une surface (cas 3)");
        }

        // ------------------------------------------------------------------------------ Peint
        [Test]
        public void Peint_TexteNonVide_Vrai_VideOuTransparent_Faux()
        {
            RectTransform r = Rect("B", racine.transform, 40, 20);
            Text t = Etiquette(Rect("T", r, 30, 10), "OK", Color.white);
            Assert.IsTrue(Retour.Peint(r), "un texte blanc sous le bouton peint");
            t.text = "  ";
            Assert.IsFalse(Retour.Peint(r), "texte vide : rien à voiler");
            t.text = "OK";
            t.color = new Color(1f, 1f, 1f, 0f);
            Assert.IsFalse(Retour.Peint(r), "texte transparent");
            Assert.IsFalse(Retour.Peint(null));
        }

        [Test]
        public void Peint_PlancherDEtendue_SurLeRectDeLaCible()
        {
            RectTransform r = Rect("B", racine.transform, 3, 3);
            Etiquette(r, "OK", Color.white);
            Assert.IsFalse(Retour.Peint(r), "9 px < 12");
            r.sizeDelta = new Vector2(4, 3);
            Assert.IsTrue(Retour.Peint(r));
        }

        // ------------------------------------------------------------------------------ Decider : les quatre cas
        [Test]
        public void Decider_Cas1_LaSurfaceNommeeRend()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, new Color(1f, 1f, 1f, 0f));                       // targetGraphic à alpha 0 (zone nue)
            Image plaque = Peinte(Rect("Plaque", b, 40, 20), Color.white);
            Button bouton = Retour.NouveauBouton(b.gameObject, plaque);
            DecisionRetour d = Retour.Decider(bouton, plaque);
            Assert.AreEqual(CasRetour.Surface, d.Cas);
            Assert.AreSame(plaque, d.Melange);
            Assert.IsFalse(d.SousPlancher);
        }

        [Test]
        public void Decider_Cas2_LeTargetGraphicRend()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Image im = Peinte(b, Color.white);
            Button bouton = Retour.NouveauBouton(b.gameObject);
            DecisionRetour d = Retour.Decider(bouton, null);
            Assert.AreEqual(CasRetour.GraphicDuBouton, d.Cas);
            Assert.AreSame(im, d.Melange);
        }

        [Test]
        public void Decider_Cas3_MatiereSousLePlancher_BasculeSurLeVoile()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, new Color(1f, 1f, 1f, 0f));                       // un Melange que personne ne verrait
            Etiquette(Rect("T", b, 30, 10), "OK", Color.white);          // mais de l'encre sous le bouton
            Button bouton = Retour.NouveauBouton(b.gameObject);
            DecisionRetour d = Retour.Decider(bouton, null);
            Assert.AreEqual(CasRetour.VoileDuBouton, d.Cas);
            Assert.AreSame(b, d.CibleVoile);
            Assert.IsTrue(d.SousPlancher, "marche 2 : la matière candidate était sous le plancher");
        }

        [Test]
        public void Decider_Cas3_BoutonSurUnTexte_PasDeBascule()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Etiquette(b, "OK", Color.white);
            Button bouton = Retour.NouveauBouton(b.gameObject);
            DecisionRetour d = Retour.Decider(bouton, null);
            Assert.AreEqual(CasRetour.VoileDuBouton, d.Cas, "§3.3 : un Button posé sur un TMP_Text ⇒ cas 3");
            Assert.IsFalse(d.SousPlancher, "aucune matière Melange n'existait : ce n'est pas une bascule");
        }

        [Test]
        public void Decider_Cas4_LeParentPeint_SiSonAireTient()
        {
            RectTransform q = Rect("Q", racine.transform, 50, 30);
            Peinte(q, Color.white);
            RectTransform b = Rect("B", q, 40, 20);
            Button bouton = Retour.NouveauBouton(b.gameObject);
            DecisionRetour d = Retour.Decider(bouton, null);
            Assert.AreEqual(CasRetour.VoileDuParent, d.Cas, "1500 ≤ 2 × 800");
            Assert.AreSame(q, d.CibleVoile);

            q.sizeDelta = new Vector2(100, 30);
            Assert.AreEqual(CasRetour.Aucun, Retour.Decider(bouton, null).Cas, "3000 > 2 × 800 : le parent est trop grand pour être « le bouton »");
        }

        [Test]
        public void Decider_RienNePeint_EstUnRouge_PasUneIssue()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, new Color(1f, 1f, 1f, 0f));
            Button bouton = Retour.NouveauBouton(b.gameObject);
            Assert.AreEqual(CasRetour.Aucun, Retour.Decider(bouton, null).Cas);
        }

        // ------------------------------------------------------------------------------ le guichet et le composant
        [Test]
        public void NouveauBouton_PoseExactementUnRetourAppui_EtMemoriseLaSurface()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, Color.white);
            Image plaque = Peinte(Rect("Plaque", b, 40, 20), Color.white);
            Button bouton = Retour.NouveauBouton(b.gameObject, plaque);
            Assert.IsNotNull(bouton);
            Assert.AreEqual(1, b.GetComponents<RetourAppui>().Length);
            Assert.AreSame(plaque, b.GetComponent<RetourAppui>().Surface);
        }

        [Test]
        public void NouveauBouton_SurfaceHorsDuSousArbre_EstUnRouge_EtNEstPasRetenue()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Image dehors = Peinte(Rect("Dehors", racine.transform, 40, 20), Color.white);
            LogAssert.Expect(LogType.Error, new Regex(@"surface hors du sous-arbre"));
            Retour.NouveauBouton(b.gameObject, dehors);
            Assert.IsNull(b.GetComponent<RetourAppui>().Surface);
        }

        [Test]
        public void PointerDown_Cas2_Attache_PointerUp_Detache()
        {
            Regie regie = RegieMouvement.PourTest();
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, Color.white);
            Retour.NouveauBouton(b.gameObject);
            RetourAppui ra = b.GetComponent<RetourAppui>();

            ra.OnPointerDown(Doigt());
            Assert.AreEqual(CasRetour.GraphicDuBouton, ra.Cas);
            Assert.IsFalse(ra.Handle.EstNul, "un handle non nul");
            Assert.AreEqual(1, regie.PistesVivantes);
            Assert.IsTrue(regie.Inspecter(0, out Entree e, out RectTransform cible));
            Assert.AreEqual(CatalogueHud.IdRetourAppui, e.Id);
            Assert.AreSame(b, cible);

            ra.OnPointerUp(Doigt());
            Assert.IsTrue(ra.Handle.EstNul);
            Assert.AreEqual(0, regie.PistesVivantes, "le relâchement est la restitution de Detacher");
        }

        [Test]
        public void PointerDown_DeuxFois_UnDoigtUnHandle()
        {
            Regie regie = RegieMouvement.PourTest();
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, Color.white);
            Retour.NouveauBouton(b.gameObject);
            RetourAppui ra = b.GetComponent<RetourAppui>();
            ra.OnPointerDown(Doigt());
            ra.OnPointerDown(Doigt());
            Assert.AreEqual(1, regie.PistesVivantes, "le handle précédent est détaché avant d'en attacher un autre");
            Assert.AreEqual(0, regie.Refus, "et la reprise n'est pas un refus (G12)");
            ra.OnPointerExit(Doigt());
            Assert.AreEqual(0, regie.PistesVivantes, "PointerExit emprunte le chemin du relâchement");
        }

        [Test]
        public void PointerDown_Cas3_PoseLeVoile()
        {
            Regie regie = RegieMouvement.PourTest();
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Etiquette(b, "OK", Color.white);
            Retour.NouveauBouton(b.gameObject);
            RetourAppui ra = b.GetComponent<RetourAppui>();
            ra.OnPointerDown(Doigt());
            Assert.AreEqual(CasRetour.VoileDuBouton, ra.Cas);
            Assert.IsTrue(regie.Inspecter(0, out Entree e, out _));
            Assert.AreEqual(CatalogueHud.IdRetourAppuiVoile, e.Id);
            Assert.AreEqual(0, regie.BasculesVoile, "un cas 3 n'est pas la bascule du plafond");
            ra.OnPointerUp(Doigt());
            Assert.AreEqual(0, regie.PistesVivantes);
        }

        [Test]
        public void PointerDown_BoutonNonInteractable_OuSansRegie_NAttacheRien()
        {
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, Color.white);
            Button bouton = Retour.NouveauBouton(b.gameObject);
            RetourAppui ra = b.GetComponent<RetourAppui>();

            ra.OnPointerDown(Doigt());   // hôte nu : pas de régie publiée
            Assert.IsTrue(ra.Handle.EstNul);
            Assert.AreEqual(CasRetour.Aucun, ra.Cas);

            Regie regie = RegieMouvement.PourTest();
            bouton.interactable = false;
            ra.OnPointerDown(Doigt());
            Assert.IsTrue(ra.Handle.EstNul, "non pressable : jamais jugé, jamais attaché");
            Assert.AreEqual(0, regie.PistesVivantes);
        }

        [Test]
        public void PointerDown_RienNePeint_LeveUnAvertissement_EtNAttachePas()
        {
            Regie regie = RegieMouvement.PourTest();
            RectTransform b = Rect("B", racine.transform, 40, 20);
            Peinte(b, new Color(1f, 1f, 1f, 0f));
            Retour.NouveauBouton(b.gameObject);
            RetourAppui ra = b.GetComponent<RetourAppui>();
            LogAssert.Expect(LogType.Warning, new Regex(@"aucun retour d'appui possible"));
            ra.OnPointerDown(Doigt());
            Assert.AreEqual(CasRetour.Aucun, ra.Cas);
            Assert.IsTrue(ra.Handle.EstNul);
            Assert.AreEqual(0, regie.PistesVivantes);
        }
    }
}
