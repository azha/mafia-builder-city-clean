using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.CityMap.Tests
{
    // CAUSE 3 (CLIENT-3, 07/10 : « pied d'écran / geste principal absent ou de mauvaise forme » — ㊳ B4, ㊵ F3, ㉛ B1, ㉚ M4, ㉘ M2, ⑤ F5) : `PiedDEcran`, les DEUX grammaires de la maquette. HORS RÉSEAU.
    //   P1  les couleurs sont celles de la maquette (`.cta6`, `.geste`, leurs états) et AUCUN fond de bouton n'est l'or plein
    //   P2  l'EFFET : un bouton construit prend le fond, le cerne (quatre filets) et le libellé de sa forme ; l'éteint change les trois ; un second appel ne double rien
    //   P4  ㉛ Loi B1 : le geste du pied est offert tant qu'aucun avocat n'est retenu (pure) ; la bande basse porte la plaque #141a21 et le geste `.geste`, SANS voix ; le corps défile (cause 7)
    //   P3  GARDE : ㉚ Appro et ㉘ Distribution n'ont plus d'aplat or sur leur bouton (forme `.geste`), ㊵ Filière porte la forme `.cta6`, chacun appelle `PiedDEcran.StylerLeBouton`
    [Category("PiedDEcran")]
    public class PiedDEcranPlayModeTests
    {
        // TD-576 : P4b monte ㉛ (qui amorce le catalogue i18n) — rendu à chaque test, la garde de sortie de MafiaCI nomme toute classe qui le laisserait chargé
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private static (int, int, int) Trio(Color c) { Color32 k = c; return (k.r, k.g, k.b); }

        [Test]
        public void P1_LesCouleurs_SontCellesDeLaMaquette_AucunFondDeBoutonN_EstL_OrPlein()
        {
            var (f, c, l) = PiedDEcran.Couleurs(PiedDEcran.Forme.Geste, PiedDEcran.Etat.Allume);
            Assert.AreEqual((0x24, 0x1c, 0x11), Trio(f), ".geste : background #241c11");
            Assert.AreEqual((0x5a, 0x4a, 0x2a), Trio(c), ".geste : border #5a4a2a");
            Assert.AreEqual((0xd9, 0xab, 0x4e), Trio(l), ".geste : color #d9ab4e");
            var (fm, cm, lm) = PiedDEcran.Couleurs(PiedDEcran.Forme.Geste, PiedDEcran.Etat.Mort);
            Assert.AreEqual((0x1c, 0x14, 0x14), Trio(fm)); Assert.AreEqual((0x4a, 0x3a, 0x3a), Trio(cm)); Assert.AreEqual((0x98, 0x79, 0x79), Trio(lm), ".geste.mort");
            var (fr, cr, lr) = PiedDEcran.Couleurs(PiedDEcran.Forme.Geste, PiedDEcran.Etat.Rouge);
            Assert.AreEqual((0x24, 0x12, 0x14), Trio(fr)); Assert.AreEqual((0x5c, 0x2a, 0x2a), Trio(cr)); Assert.AreEqual((0xd9, 0x7a, 0x6a), Trio(lr), ".geste.rouge");
            var (cf, cc, cl) = PiedDEcran.Couleurs(PiedDEcran.Forme.Cta6, PiedDEcran.Etat.Allume);
            Assert.AreEqual(Trio(DesignTokens.Current.surfaceCard), Trio(cf), ".cta6 : #16191b");
            Assert.AreEqual(Trio(DesignTokens.Current.hudHairlineGold), Trio(cc), ".cta6 : border #b08d3e (--laiton)");
            Assert.AreEqual(Trio(DesignTokens.Current.hudMoneyGold), Trio(cl), ".cta6 : color #f2c96b (--or-vif)");
            var (ef, ec, el) = PiedDEcran.Couleurs(PiedDEcran.Forme.Cta6, PiedDEcran.Etat.Eteint);
            Assert.AreEqual(Trio(DesignTokens.Current.lieutenantMedallionOuter), Trio(ef), ".cta6.eteint : `#111823` à 3/255 du jeton — le jeton (garde Palette)"); Assert.AreEqual((0x2a, 0x36, 0x48), Trio(ec)); Assert.AreEqual((0x7a, 0x83, 0x8d), Trio(el), ".cta6.eteint");
            Assert.AreEqual((0x9a, 0x8a, 0x6a), Trio(PiedDEcran.Legende(PiedDEcran.Etat.Allume)), "la légende small du geste");
            Assert.AreEqual((0x14, 0x1a, 0x21), Trio(PiedDEcran.PlaqueDuBas), "la plaque .bas");
            foreach (PiedDEcran.Forme forme in new[] { PiedDEcran.Forme.Cta6, PiedDEcran.Forme.Geste })
                foreach (PiedDEcran.Etat etat in new[] { PiedDEcran.Etat.Allume, PiedDEcran.Etat.Eteint, PiedDEcran.Etat.Mort, PiedDEcran.Etat.Rouge })
                    Assert.IsFalse(PiedDEcran.EstUnAplatOr(PiedDEcran.Couleurs(forme, etat).fond), $"{forme}/{etat} : le FOND d'un bouton de pied n'est jamais l'or plein");
            Assert.IsTrue(PiedDEcran.EstUnAplatOr(DesignTokens.Current.ficheCtaOrBas), "contrôle positif : l'or plein de la pilule de LA SUITE EST vu comme un aplat or");
            // (l'ambre d'un LIBELLÉ a la teinte de l'or : `EstUnAplatOr` juge une teinte, c'est l'USAGE — un fond — que la garde P3 vérifie dans le code)
        }

        [Test]
        public void P2_L_Effet_FondCerneLibelle_EteintChangeLesTrois_RienNeSeDouble()
        {
            var go = new GameObject("Bouton", typeof(RectTransform));
            try
            {
                Image fond = go.AddComponent<Image>(); fond.color = DesignTokens.Current.ficheCtaOrBas;   // l'ancien aplat or
                var lib = new GameObject("Libelle", typeof(RectTransform)); lib.transform.SetParent(go.transform, false);
                var t = lib.AddComponent<TMPro.TextMeshProUGUI>(); t.color = Color.black;
                PiedDEcran.StylerLeBouton(go, t, PiedDEcran.Forme.Geste);
                Assert.AreEqual((0x24, 0x1c, 0x11), Trio(fond.color), "l'ancien aplat or est remplacé par le fond sombre");
                Assert.AreEqual((0xd9, 0xab, 0x4e), Trio(t.color), "l'encre sombre devient le libellé ambre");
                Transform cerne = go.transform.Find("Cerne");
                Assert.IsNotNull(cerne, "le cerne existe");
                Assert.AreEqual(4, cerne.childCount, "quatre filets");
                Assert.IsTrue(cerne.GetComponentsInChildren<Image>().Where(i => i.transform != cerne).All(i => Trio(i.color) == (0x5a, 0x4a, 0x2a)), "de la couleur du cerne");
                Assert.IsFalse(cerne.GetComponent<LayoutElement>().layoutPriority < 0 || !cerne.GetComponent<LayoutElement>().ignoreLayout, "hors mise en page : la taille du bouton ne change pas");
                PiedDEcran.StylerLeBouton(go, t, PiedDEcran.Forme.Geste, PiedDEcran.Etat.Mort);
                Assert.AreEqual(1, go.transform.Cast<Transform>().Count(c => c.name == "Cerne"), "un second appel ne double pas le cerne");
                Assert.AreEqual((0x1c, 0x14, 0x14), Trio(fond.color), "mort : fond");
                Assert.AreEqual((0x98, 0x79, 0x79), Trio(t.color), "mort : libellé");
                Assert.IsTrue(cerne.GetComponentsInChildren<Image>().Where(i => i.transform != cerne).All(i => Trio(i.color) == (0x4a, 0x3a, 0x3a)), "mort : cerne");
            }
            finally { Object.DestroyImmediate(go); }
        }

        [Test]
        public void P3_Garde_Appro_Distribution_Filiere_PortentLaFormeDeLeurCadre()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts", "Operational");
            string appro = File.ReadAllText(Path.Combine(racine, "ChaineDAppro", "ChaineDApproScreenController.cs"));
            string distrib = File.ReadAllText(Path.Combine(racine, "Distribution", "DistributionScreenController.cs"));
            string filiere = File.ReadAllText(Path.Combine(racine, "Filiere", "FiliereScreenController.cs"));
            StringAssert.Contains("PiedDEcran.StylerLeBouton(bouton, libBouton, PiedDEcran.Forme.Geste)", appro, "㉚ : la forme `.geste` de `.appr6`");
            StringAssert.Contains("PiedDEcran.StylerLeBouton(bouton, libBouton, PiedDEcran.Forme.Geste)", distrib, "㉘ : la forme `.geste` de `.lieg6`");
            StringAssert.Contains("PiedDEcran.StylerLeBouton(bouton, libelleBlanchir)", filiere, "㊵ : la forme `.cta6` (Cta6 par défaut)");
            // le fond d'or de construction est REPEINT par le Styler (l'EFFET est prouvé par P2) : l'appel doit venir APRÈS la pose de l'or, jamais avant
            Assert.Greater(appro.IndexOf("PiedDEcran.StylerLeBouton(bouton, libBouton, PiedDEcran.Forme.Geste)"), appro.IndexOf("fond.color = Or;"), "㉚ : le Styler repeint APRÈS la pose du fond (plus de « gros bouton jaune »)");
            Assert.Greater(distrib.IndexOf("PiedDEcran.StylerLeBouton(bouton, libBouton, PiedDEcran.Forme.Geste)"), distrib.IndexOf("AjouterFond(bouton, Or);"), "㉘ : le Styler repeint APRÈS le pavé or");
            string journal = File.ReadAllText(Path.Combine(racine, "Journal", "JournalScreenController.cs"));
            StringAssert.Contains("PiedDEcran.StylerLeBouton(bouton, lib, PiedDEcran.Forme.Cta6, PiedDEcran.Etat.Eteint)", journal, "㊳ : le pied `.cta6` ÉTEINT (aucune route « assister » : TD-848)");
            StringAssert.Contains("b.interactable = false;", journal, "㊳ : le bouton éteint n'est pas cliquable — il ne ment pas");
            StringAssert.Contains("PiedDEcran.Legende(", distrib, "㉘ : la légende est DANS le bouton, à droite (`.geste small`)");
        }

        [Test]
        public void P4a_LeGesteDuPied_EstOffertTantQuAucunAvocatNEstRetenu()
        {
            Assert.IsTrue(LoiScreenController.GesteDeBasOffert(null));
            Assert.IsTrue(LoiScreenController.GesteDeBasOffert(new LawyerDto[0]));
            Assert.IsTrue(LoiScreenController.GesteDeBasOffert(new[] { new LawyerDto { lawyerId = "a", retainer = false } }), "un avocat libéré n'est pas un avocat retenu");
            Assert.IsFalse(LoiScreenController.GesteDeBasOffert(new[] { new LawyerDto { lawyerId = "a", retainer = false }, new LawyerDto { lawyerId = "b", retainer = true } }));
        }

        [UnityEngine.TestTools.UnityTest]
        public System.Collections.IEnumerator P4b_LaBandeBasse_PlaqueFiletGeste_SansVoix_EtLeCorpsDefile()
        {
            var host = new GameObject("LoiPied", typeof(RectTransform));
            LoiScreenController ecran = host.AddComponent<LoiScreenController>();
            try
            {
                yield return null;
                ecran.RendrePourTest(new GetLegalResponseDto { lawyerRoster = new LawyerDto[0], activeCases = new LegalCaseDto[0] });
                yield return null; yield return null;
                GameObject racine = GameObject.Find("LoiRoot");
                Assert.IsNotNull(racine);
                Transform bas = racine.transform.Find("Bas");
                Assert.IsNotNull(bas, "la bande basse existe");
                Assert.AreEqual((0x14, 0x1a, 0x21), Trio(bas.GetComponent<Image>().color), "plaque `.bas` #141a21");
                Assert.IsNotNull(bas.Find("Filet"), "le filet haut de 2 px");
                Assert.IsNotNull(ecran.BoutonDuPied, "aucun avocat retenu : le geste est offert");
                Assert.AreEqual((0x24, 0x1c, 0x11), Trio(ecran.BoutonDuPied.GetComponent<Image>().color), "forme `.geste` : fond #241c11 (pas l'or plein)");
                Assert.IsNotNull(ecran.BoutonDuPied.transform.Find("Cerne"), "le cerne #5a4a2a");
                Assert.IsFalse(PiedDEcran.EstUnAplatOr(ecran.BoutonDuPied.GetComponent<Image>().color));
                Assert.IsNull(bas.Find("Voix"), "SANS la voix du lieutenant : aucune donnée servie (TD-848)");
                Assert.IsNotNull(racine.transform.Find("Corps").GetComponent<ScrollRect>(), "le corps est une liste défilante (cause 7)");
                ecran.AllerAuRecrutement();   // ne lève rien, tout tienne ou non
                // un avocat retenu : le pied n'a plus de geste
                ecran.RendrePourTest(new GetLegalResponseDto { lawyerRoster = new[] { new LawyerDto { lawyerId = "x", lawyerLabel = "Maître", tier = "boutique", retainer = true } }, activeCases = new LegalCaseDto[0] });
                yield return null; yield return null;
                Assert.IsNull(ecran.BoutonDuPied, "un avocat est retenu : plus de geste « lui trouver un avocat »");
            }
            finally
            {
                GameObject r = GameObject.Find("LoiRoot");
                if (r != null) Object.DestroyImmediate(r);
                Object.DestroyImmediate(host);
            }
        }

        private static float Lum(Color c)
        {
            float L(float v) => v <= 0.03928f ? v / 12.92f : Mathf.Pow((v + 0.055f) / 1.055f, 2.4f);
            return 0.2126f * L(c.r) + 0.7152f * L(c.g) + 0.0722f * L(c.b);
        }
        private static float Contraste(Color a, Color b)
        {
            float x = Lum(a) + 0.05f, y = Lum(b) + 0.05f;
            return x > y ? x / y : y / x;
        }

        [Test]
        public void P5_Cinq_LaPlaqueLaiton_SerieSix_Matiere_Encre_EtContraste()
        {
            // ⑤ F4 : la matière de la carte REF (219,206,171). ⑤ F7 (juge d'ensemble r2, 08/10) : le geste principal est la `.plaque-laiton` de la SÉRIE 6
            // (`linear-gradient(180deg,#e8c87a,#b08d3e 55%,#8a6a22)`, encre `#3a2a0a`), plus la plaque crème de la série 4 (216,202,167) — qui reste celle de ⑮ DÉPOSER.
            Assert.AreEqual((219, 206, 171), Trio(DecisionDetailScreenController.MatiereDeLaCarte));
            Assert.AreEqual((216, 202, 167), Trio(PiedDEcran.PlaqueCreme), "la plaque crème reste celle de ⑮ DÉPOSER");
            var arrets = DecisionDetailScreenController.DegradeDeLaPlaque();
            Assert.AreEqual(3, arrets.Length, "trois paliers");
            Assert.AreEqual(new[] { 0f, 0.55f, 1f }, arrets.Select(x => x.pos).ToArray(), "0 % / 55 % / 100 %");
            Assert.AreEqual((0xe8, 0xc8, 0x7a), Trio(arrets[0].c)); Assert.AreEqual((0xb0, 0x8d, 0x3e), Trio(arrets[1].c)); Assert.AreEqual((0x8a, 0x6a, 0x22), Trio(arrets[2].c));
            Color encre = DecisionDetailScreenController.EncreDeLaPlaque;
            Assert.AreEqual((0x3a, 0x2a, 0x0a), Trio(encre), "`color:#3a2a0a`");
            // CONTRASTE MESURÉ de l'encre : sur le palier médian #b08d3e (le remplissage médian lu, (173,138,60) à ±3) 4,44:1 — SOUS la cible de 4,5 de 0,06, c'est la maquette ; sur le
            // palier sombre #8a6a22 2,75:1. Le libellé, lui, se tient dans la moitié HAUTE de la plaque (≈ 35 % de la hauteur), où le fond est plus clair.
            Assert.GreaterOrEqual(Contraste(encre, arrets[1].c), 4.4f, "encre #3a2a0a sur #b08d3e : 4,44:1 mesuré (cible 4,5 : manquée de 0,06 par la maquette elle-même)");
            Assert.Less(Contraste(encre, arrets[1].c), 4.5f, "épingle la mesure : si la maquette change, ce test le dit");
            Color fondDuLibelle = ProceduralUI.EchantillonDeDegrade(arrets, 0.35f);
            Assert.GreaterOrEqual(Contraste(encre, fondDuLibelle), 4.5f, "le libellé « LES LIRE MAINTENANT » (≈ 35 % de la hauteur) tient la cible de 4,5:1");
            Assert.Less(Contraste(encre, arrets[2].c), 3f, "contrôle négatif : sur le palier sombre le même encre est sous 3:1 — le test discrimine");
            // la sous-ligne : `#3a2a0acc` = l'encre à 80 %, rendue en couleur OPAQUE mélangée en sRGB sur le dégradé à sa hauteur (79,59,19) — l'opacité CSS recopiée sur du texte serait pâlie par le linéaire
            Color sous = DecisionDetailScreenController.EncreDeLaSousLigne();
            Assert.AreEqual(1f, sous.a, "opaque : aucune opacité à convertir");
            Color32 k = sous;
            Assert.That(new[] { (int)k.r, (int)k.g, (int)k.b }, Is.EqualTo(new[] { 79, 59, 19 }).Within(1), $"la sous-ligne : encre à 80 % sur le dégradé à 70 % (vu {k.r},{k.g},{k.b})");
            Assert.GreaterOrEqual(Contraste(sous, ProceduralUI.EchantillonDeDegrade(arrets, 0.7f)), 2.8f, "contraste de la sous-ligne (8 CSS, 80 %) mesuré à 2,92:1 — c'est la maquette");
            // la source : le bord est POSÉ par `Filets` (recette PlaqueLaiton), la crème et le cerne rouge du tampon ont disparu
            string src = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", "Shell", "DecisionDetailScreenController.cs"));
            StringAssert.Contains("fond.color = MatiereDeLaCarte;", src, "la carte a sa matière (surface pleine)");
            StringAssert.DoesNotContain("RoundedRectOutline((int)Px(14f), Px(1.5f), bordCarte)", src, "plus de carte réduite à un contour sans matière");
            int d = src.IndexOf("tampon = Bloc(\"Tampon\"", System.StringComparison.Ordinal), f = src.IndexOf("BoutonLire = tampon.AddComponent<LongPressButton>();", System.StringComparison.Ordinal);
            Assert.That(d, Is.GreaterThan(0)); Assert.That(f, Is.GreaterThan(d));
            string bloc = src.Substring(d, f - d);
            StringAssert.Contains("Filets.Poser((RectTransform)tampon.transform, DecorsDeScene.Filets.DecisionDetail.PlaqueLaiton)", bloc, "le bord 1 px #6b4a12 est posé par Filets");
            StringAssert.DoesNotContain("Rouge", bloc, "plus d'encre brique sur le geste principal");
            StringAssert.DoesNotContain("Cerner(", bloc, "plus de cerne rouge à la main sur le tampon");
            StringAssert.DoesNotContain("PlaqueCreme", bloc, "plus de plaque crème sur le tampon");
        }
    }
}
