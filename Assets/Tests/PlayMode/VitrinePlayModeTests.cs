using System.Collections;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Economy.Shop;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㉓ LA VITRINE — les cinq A et trois B du juge groupé du 07/10 (`Tools/juge-visuel/compte/r-groupe-2026-10-07/rapport.md`), décisions de f2 du 08/10 (une seule monnaie, les Marks : la maquette re-rendue,
    // atelier 7159e54 ; « bande basse sans voix », TD-823). HORS RÉSEAU : le catalogue est FABRIQUÉ (les neuf SKU du canon, `iap_catalogue.md` §2.1).
    //   V1  les DESSINS, purs : un motif par article (kind, identifiant), la pile par rang (1/3/5/8 épaisseurs, pas 5,5/5,5/5,0/4,2), le chiffre de la clé
    //   V2  GARDE DE SOURCE : le contrôleur passe par la pile (EnteteDEcran.PoserLaPile), les dessins (VitrinePictogrammes.Dessiner), la bande de voix (PiedDEcran.BandeDeVoix), le défilement indiqué ;
    //       plus de disque unique (A3) ni AUCUN bouton (la carte est l'article) ; l'alternative typed-confirm du canon est ouverte par l'appui court
    //   V3  EFFET, sur un catalogue fabriqué (solde 100, une possession) : A1 deux cartes par rangée, chacune moins large que la moitié de l'écran et de même largeur ; A2 une plaque teintée (≠ fond de page) ;
    //       A3 des dessins qui DIFFÈRENT (la pile de 3 500 plus haute que celle de 100 ; la clé porte son chiffre ; la plaque porte ses couleurs) ; A4 la bande basse en PIED, sans voix ; B1 les deux intitulés ;
    //       B2 le médaillon de bonus hors mise en page ; B3 le comptoir : enseigne et solde dans la MÊME ligne, l'enseigne à gauche ; l'article possédé : ACQUIS et plus de prix ; l'article hors d'atteinte :
    //       sa raison en rouge et pas de geste ; l'article à portée : la carte est le geste, un APPUI LONG (décision de f2, 08/10) — un appui court n'achète rien, la vitre qui glisse lâche l'appui ;
    //       l'alternative par SAISIE (canon global_conventions_core.md:135, f2 08/10) : absente au repos, ouverte par l'appui court, seul le mot-clé achète ;
    //       la bande basse SANS cadre rond de portrait (décision de f2, 08/10)
    [Category("Vitrine")]
    public class VitrinePlayModeTests
    {
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private static (int, int, int) Trio(Color c) { Color32 k = c; return (k.r, k.g, k.b); }
        private static string Source(params string[] chemin) => File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", Path.Combine(chemin)));

        [Test]
        public void V1_LesDessins_UnMotifParArticle_LaPileParRang_LeChiffreDeLaCle()
        {
            Assert.AreEqual(VitrinePictogrammes.Motif.Pieces, VitrinePictogrammes.MotifDe("MARKS_PACK", "marks_pack_small"));
            Assert.AreEqual(VitrinePictogrammes.Motif.Enveloppe, VitrinePictogrammes.MotifDe("SUPPORT", "support_pack"));
            Assert.AreEqual(VitrinePictogrammes.Motif.Cle, VitrinePictogrammes.MotifDe("SAVE_SLOT", "save_slot_2"));
            Assert.AreEqual(VitrinePictogrammes.Motif.Tableau, VitrinePictogrammes.MotifDe("COSMETIC", "cosm_dashboard_theme_1"));
            Assert.AreEqual(VitrinePictogrammes.Motif.Couleurs, VitrinePictogrammes.MotifDe("COSMETIC", "cosm_callsign_color"));
            Assert.AreEqual(VitrinePictogrammes.Motif.Couleurs, VitrinePictogrammes.MotifDe("COSMETIC", null), "un identifiant absent ne jette pas");
            CollectionAssert.AreEqual(new[] { 1, 3, 5, 8, 8 }, new[] { 0, 1, 2, 3, 7 }.Select(VitrinePictogrammes.EpaisseursDeLaPile).ToArray(), "les tranches des quatre SVG du cadre 99");
            CollectionAssert.AreEqual(new[] { 5.5f, 5.5f, 5.0f, 4.2f }, new[] { 0, 1, 2, 3 }.Select(VitrinePictogrammes.PasDeLaPile).ToArray());
            Assert.AreEqual("2", VitrinePictogrammes.ChiffreDe("save_slot_2"));
            Assert.AreEqual("12", VitrinePictogrammes.ChiffreDe("save_slot_12"));
            Assert.AreEqual("", VitrinePictogrammes.ChiffreDe("support_pack"), "aucun chiffre servi : rien d'inventé");
            Assert.AreEqual("", VitrinePictogrammes.ChiffreDe(null));
        }

        [Test]
        public void V2_Garde_LeControleurPasseParLesGabarits_PlusDeDisqueUniqueNiDeBoutonAcheter()
        {
            string s = Source("Economy", "Shop", "ShopScreenController.cs");
            StringAssert.Contains("EnteteDEcran.PoserLaPile(gameObject, (int)ShellChrome.TopInsetPx, (int)ShellChrome.BottomInsetPx)", s, "la racine est la pile du gabarit");
            StringAssert.Contains("VitrinePictogrammes.Dessiner(art.transform, VitrinePictogrammes.MotifDe(s.kind, s.sku_id)", s, "A3 : un dessin par article");
            StringAssert.Contains("PiedDEcran.BandeDeVoix(transform, Px, Socle, Rebord)", s, "A4 : la bande basse `.voix`, par le gabarit");
            StringAssert.Contains("ListeDefilante.Indiquer(defil, VitreBas)", s, "cause 7 : le défilement est indiqué");
            StringAssert.Contains("Lib(\"Les extras — payés en Marks\")", s, "B1 : l'intitulé qui dit par quoi on paie");
            StringAssert.Contains("Lib(\"Les Marks — payés au magasin\")", s);
            StringAssert.DoesNotContain("RadialDisc((int)Px(11f)", s, "A3 : plus le même disque pour tous les produits");
            // « ACHETER » est désormais le MOT-CLÉ de la saisie (canon typed-confirm, f2 08/10), pas un bouton : la garde devient structurelle.
            StringAssert.DoesNotContain("AddComponent<Button>", s, "la maquette ne dessine aucun bouton : la carte est l'article");
            StringAssert.Contains("appui.OnShortTap += () => OuvrirLaSaisie(carte, skuId)", s, "canon : l'alternative typed-confirm, ouverte par un appui court");
            StringAssert.Contains("art.AddComponent<LongPressButton>()", s, "décision de f2 (08/10) : l'achat se prend d'un appui LONG");
            StringAssert.DoesNotContain("art.AddComponent<Button>()", s, "plus d'achat en un seul appui");
            StringAssert.DoesNotContain("\"Portrait\"", s, "décision de f2 (08/10) : pas de cadre rond vide");
            string p = Source("ShellContracts", "PiedDEcran.cs");
            StringAssert.Contains("public static GameObject BandeDeVoix(Transform parent, System.Func<float, float> px, Color plaque, Color filet)", p);
        }

        private GameObject canvasGo;

        private static SkuDto Sku(string id, string kind, int prixMarks = 0, int donne = 0, int bonus = 0, string produit = null) =>
            new SkuDto { sku_id = id, display_name = id, kind = kind, price_marks = prixMarks, marks_granted = donne, bonus_pct = bonus, price_store_product_id = produit };

        /// <summary>Les neuf SKU du canon, dans l'ordre servi (`IAP_SKU_CATALOGUE`) : les liasses d'abord — l'écran les RANGE (extras, puis caisse).</summary>
        private static SkuDto[] CatalogueFabrique() => new[]
        {
            Sku("marks_pack_small", "MARKS_PACK", donne: 100, produit: "marks_100"),
            Sku("marks_pack_med", "MARKS_PACK", donne: 600, bonus: 20, produit: "marks_600"),
            Sku("marks_pack_large", "MARKS_PACK", donne: 1400, bonus: 40, produit: "marks_1400"),
            Sku("marks_pack_xl", "MARKS_PACK", donne: 3500, bonus: 75, produit: "marks_3500"),
            Sku("cosm_callsign_color", "COSMETIC", prixMarks: 50),
            Sku("cosm_dashboard_theme_1", "COSMETIC", prixMarks: 80),
            Sku("save_slot_2", "SAVE_SLOT", prixMarks: 100),
            Sku("save_slot_3", "SAVE_SLOT", prixMarks: 200),
            Sku("support_pack", "SUPPORT", donne: 500, produit: "support"),
        };

        [UnityTest]
        public IEnumerator V3_LEffet_SurUnCatalogueFabrique()
        {
            canvasGo = new GameObject("CanvasVitrine", typeof(RectTransform), typeof(Canvas));
            canvasGo.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var hote = new GameObject("Vitrine", typeof(RectTransform));
            hote.transform.SetParent(canvasGo.transform, false);
            RectTransform hrt = (RectTransform)hote.transform;
            hrt.anchorMin = hrt.anchorMax = new Vector2(0.5f, 0.5f);
            hrt.sizeDelta = new Vector2(1280f, 2560f);   // 300 px CSS = 1280 u : l'échelle du contrôleur
            ShopScreenController ecran = hote.AddComponent<ShopScreenController>();
            try
            {
                yield return null;
                ecran.RendrePourTest(CatalogueFabrique(), 100, new[] { "cosm_callsign_color" });
                yield return null; yield return null;
                Canvas.ForceUpdateCanvases();
                LayoutRebuilder.ForceRebuildLayoutImmediate(hrt);
                yield return null;
                Canvas.ForceUpdateCanvases();

                // B3 — le comptoir : premier élément de la pile, enseigne à gauche et solde à droite dans la même ligne
                Transform comptoir = hote.transform.Find("Comptoir");
                Assert.IsNotNull(comptoir, "le comptoir existe");
                Assert.AreEqual(0, comptoir.GetSiblingIndex(), "en tête de la pile");
                RectTransform titre = (RectTransform)comptoir.Find("Titre"), solde = (RectTransform)comptoir.Find("Solde");
                Assert.AreEqual("LA VITRINE", titre.GetComponent<TextMeshProUGUI>().text);
                Assert.AreEqual(DesignTokens.Current.hudSerifFont, titre.GetComponent<TextMeshProUGUI>().font, "l'enseigne en serif");
                Assert.Greater(solde.position.x, titre.position.x, "le solde à DROITE de l'enseigne");
                Assert.AreEqual(titre.position.y, solde.position.y, 1280f / 300f * 6f, "sur la MÊME ligne (± 6 px CSS)");
                Assert.Greater(titre.rect.width, solde.rect.width, "l'enseigne pousse la pastille au bord : la pastille épouse son montant");
                Assert.AreEqual("100 Marks", solde.Find("Montant").GetComponent<TextMeshProUGUI>().text);
                Assert.IsNotNull(solde.Find("Jeton"), "la pièce dessinée dans la pastille");
                Assert.IsNotNull(comptoir.Find("Filet"), "le filet de laiton");

                // A4 — la bande basse en pied, sans voix
                Transform bas = hote.transform.Find("Bas");
                Assert.IsNotNull(bas, "la bande basse existe");
                Assert.AreEqual(hote.transform.childCount - 1, bas.GetSiblingIndex(), "en PIED de la pile");
                Assert.AreEqual(Trio(DesignTokens.Current.nightSocle), Trio(bas.GetComponent<Image>().color), "la plaque `.voix` (#12100e, par le jeton nightSocle)");
                Assert.IsNotNull(bas.Find("Filet"));
                Assert.IsNull(bas.Find("Portrait"), "PAS de cadre rond vide (décision de f2, 08/10 : il reviendra avec TD-823)");
                Transform voix = bas.Find("Voix");
                Assert.IsNotNull(voix);
                Assert.AreEqual(0, voix.GetComponentsInChildren<TextMeshProUGUI>(false).Count(t => t.gameObject.activeInHierarchy && !string.IsNullOrEmpty(t.text) && t.name != "Note"),
                                "SANS voix : aucun nom, aucune réplique posés à la place de TD-823");
                Assert.IsFalse(voix.Find("Terminal").gameObject.activeSelf, "la note de l'état terminal ne se montre qu'à zéro Mark");

                // B1 — les deux intitulés, dans l'ordre de la maquette (les extras ouvrent l'écran)
                Transform etageres = hote.transform.Find("Defilement/Etageres");
                Assert.IsNotNull(etageres);
                string[] intitules = etageres.GetComponentsInChildren<TextMeshProUGUI>(true).Where(t => t.name == "Titre").Select(t => t.text).ToArray();
                CollectionAssert.AreEqual(new[] { "Les extras — payés en Marks", "Les Marks — payés au magasin" }, intitules, "B1 : la règle de paiement est écrite, extras d'abord");

                // A1 — la grille : deux cartes par rangée, chacune moins large que la moitié de l'écran, de même largeur ; cinq rangées (2 + 2 + le soutien)
                HorizontalLayoutGroup[] rangees = etageres.GetComponentsInChildren<HorizontalLayoutGroup>(true).Where(h => h.name == "Rangee").ToArray();
                Assert.AreEqual(5, rangees.Length, "4 extras → 2 rangées, 4 liasses → 2 rangées, le soutien → 1 planche large");
                RectTransform premiere = (RectTransform)rangees[0].transform;
                var cartes = Enumerable.Range(0, premiere.childCount).Select(i => (RectTransform)premiere.GetChild(i)).Where(c => c.name.StartsWith("Sku_")).ToArray();
                Assert.AreEqual(2, cartes.Length, "deux cartes dans la première rangée");
                Assert.Less(cartes[0].rect.width, 0.5f * hrt.rect.width, "A1 : la carte tient dans une colonne (le juge mesurait 93,5 % de la largeur)");
                Assert.Greater(cartes[0].rect.width, 0.4f * hrt.rect.width, "et pas moins qu'une demi-largeur moins les marges (44,8 % dans la maquette)");
                Assert.AreEqual(cartes[0].rect.width, cartes[1].rect.width, 1f, "les deux colonnes sont égales");
                Assert.AreEqual(cartes[0].rect.height, cartes[1].rect.height, 1f, "une rangée a UNE hauteur (grille CSS)");
                RectTransform large = (RectTransform)rangees[4].transform;
                Assert.AreEqual(1, Enumerable.Range(0, large.childCount).Count(i => large.GetChild(i).name.StartsWith("Sku_")), "le soutien seul sur sa planche large");

                // A2 — la carte est une plaque teintée, pas le fond de page
                Image plaque = cartes[0].GetComponent<Image>();
                Assert.IsNotNull(plaque.sprite, "un fond arrondi, pas un filet");
                Assert.AreNotEqual(Trio(DesignTokens.Current.surfaceBase), Trio(plaque.color), "A2 : la médiane intérieure n'est plus celle du fond de page");
                Assert.AreNotEqual((13, 13, 13), Trio(plaque.color));
                Assert.IsNotNull(cartes[0].Find("Bord"), "le bord fin de la plaque");

                // A3 — des dessins qui diffèrent
                Transform petite = etageres.Find("Etagere/Planche/Rangee/Sku_marks_pack_small") ?? Trouver(etageres, "Sku_marks_pack_small");
                Transform grosse = Trouver(etageres, "Sku_marks_pack_xl");
                int facesPetite = petite.Find("Dessin").GetComponentsInChildren<Image>(true).Count(i => i.name.StartsWith("Face"));
                int facesGrosse = grosse.Find("Dessin").GetComponentsInChildren<Image>(true).Count(i => i.name.StartsWith("Face"));
                Assert.AreEqual(2, facesPetite, "100 Marks : une pièce (deux faces)");
                Assert.AreEqual(9, facesGrosse, "3 500 Marks : huit épaisseurs (neuf faces)");
                Transform cle = Trouver(etageres, "Sku_save_slot_2");
                Assert.AreEqual("2", cle.Find("Dessin/Chiffre").GetComponent<TextMeshProUGUI>().text, "la clé porte le chiffre de l'identifiant servi");
                Assert.IsNotNull(Trouver(etageres, "Sku_cosm_callsign_color").Find("Dessin/Rouge"), "la plaque aux couleurs");
                Assert.IsNotNull(Trouver(etageres, "Sku_cosm_dashboard_theme_1").Find("Dessin/Halo"), "le tableau de bord au sodium");
                Assert.IsNotNull(Trouver(etageres, "Sku_support_pack").Find("Dessin/Sceau"), "l'enveloppe scellée");

                // B2 — le médaillon de bonus, collé dans l'angle, hors mise en page
                Transform medaillon = Trouver(etageres, "Sku_marks_pack_med").Find("Bonus");
                Assert.IsNotNull(medaillon, "B2 : le médaillon de la liasse de 600");
                Assert.IsTrue(medaillon.GetComponent<LayoutElement>().ignoreLayout, "hors du flux : une étiquette collée dans l'angle");
                Assert.AreEqual(Trio(DesignTokens.Current.hudMoneyUnderlineGold), Trio(medaillon.GetComponent<Image>().color), "plaque OR");
                StringAssert.Contains("20", medaillon.GetComponentInChildren<TextMeshProUGUI>().text);
                Assert.IsNull(petite.Find("Bonus"), "la liasse de base n'a pas de bonus");

                // les états : possédé, hors d'atteinte, à portée, derrière la vitre
                Transform possede = Trouver(etageres, "Sku_cosm_callsign_color");
                Assert.IsNotNull(possede.Find("Acquis"), "ACQUIS en étiquette d'angle");
                Assert.IsNull(possede.Find("Etiquette"), "plus d'étiquette de prix sur un article possédé (cadre 100)");
                Assert.AreEqual(0.62f, possede.GetComponent<CanvasGroup>().alpha, 0.001f, "`.art.pris`");
                Assert.IsNull(possede.GetComponent<LongPressButton>(), "rien à acheter");
                Transform hors = Trouver(etageres, "Sku_save_slot_3");
                Assert.IsNotNull(hors.Find("Etiquette"));
                Assert.AreEqual("pas assez de Marks", hors.Find("Manque").GetComponent<TextMeshProUGUI>().text, "la raison, celle que le back sert (table 69)");
                Assert.IsNull(hors.GetComponent<LongPressButton>(), "hors d'atteinte : aucun geste");
                Transform aPortee = Trouver(etageres, "Sku_cosm_dashboard_theme_1");
                LongPressButton appui = aPortee.GetComponent<LongPressButton>();
                Assert.IsNotNull(appui, "à portée : la carte est le geste — un APPUI LONG (décision de f2, 08/10)");
                Assert.IsNull(aPortee.GetComponent<Button>(), "plus d'achat en un seul appui");
                Assert.AreEqual(UiTimingTunables.DestructiveLongpressMs, appui.RequiredHoldMs, "le geste maison des actions irréversibles : 1 000 ms");
                Assert.IsNull(aPortee.Find("Saisie"), "au repos, aucun élément neuf : la saisie n'est pas visible");
                appui.SimulateShortTap();
                Assert.AreEqual(0, ecran.AchatsDemandes, "un appui COURT n'achète rien");
                // ㉓ canon (global_conventions_core.md:135, f2 08/10) : l'appui court OUVRE l'alternative typed-confirm, dans la carte
                Transform saisie = aPortee.Find("Saisie");
                Assert.IsNotNull(saisie, "l'appui court ouvre la saisie dans la carte");
                Assert.IsNotNull(saisie.GetComponent<TMP_InputField>(), "une saisie, pas un bouton");
                Assert.AreEqual((Color32)new Color32(0xef, 0xe6, 0xd4, 255), (Color32)saisie.GetComponent<Image>().color, "au style de l'étiquette de prix : le papier");
                Assert.IsNotNull(saisie.GetComponent<CanvasRenderer>(), "la plaque porte son CanvasRenderer");
                StringAssert.Contains("ACHETER", saisie.Find("Zone/Invite").GetComponent<TextMeshProUGUI>().text, "l'invite nomme le mot-clé");
                Assert.IsFalse(ecran.ConfirmerParSaisie("cosm_dashboard_theme_1", "acheté"), "un autre mot n'achète rien");
                Assert.IsFalse(ecran.ConfirmerParSaisie("cosm_dashboard_theme_1", ""), "une saisie vide n'achète rien");
                Assert.AreEqual(0, ecran.AchatsDemandes);
                appui.OnPointerDown(null);
                Assert.IsTrue(appui.IsPressing, "contrôle positif : l'appui est en cours");
                hote.transform.Find("Defilement").GetComponent<ScrollRect>().onValueChanged.Invoke(Vector2.zero);
                Assert.IsFalse(appui.IsPressing, "la vitre qui glisse LÂCHE l'appui : un glissement lent n'achète pas");
                appui.SimulateCompletedLongPress();
                Assert.AreEqual(1, ecran.AchatsDemandes, "un appui LONG abouti demande l'achat, une fois");
                Assert.IsTrue(ecran.ConfirmerParSaisie("cosm_dashboard_theme_1", " acheter "), "le mot-clé (casse et blancs ignorés) demande l'achat");
                Assert.AreEqual(2, ecran.AchatsDemandes, "la saisie passe par le MÊME chemin que l'appui long");
                Assert.IsNull(aPortee.Find("Manque"));
                Assert.AreEqual("80 Marks", aPortee.Find("Etiquette/Montant").GetComponent<TextMeshProUGUI>().text);
                Assert.AreEqual("DERRIÈRE LA VITRE", petite.Find("Etiquette/Montant").GetComponent<TextMeshProUGUI>().text, "argent réel : derrière la vitre");
                Assert.AreEqual("Bientôt", petite.Find("Note").GetComponent<TextMeshProUGUI>().text);
                Assert.IsNull(petite.GetComponent<LongPressButton>());
                Assert.AreEqual(1, ecran.RendusEffectues, "le prédicat de capture a monté une fois");
            }
            finally
            {
                Object.DestroyImmediate(canvasGo);
            }
        }

        private static Transform Trouver(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true)) if (t.name == nom) return t;
            Assert.Fail("introuvable : " + nom);
            return null;
        }
    }
}
