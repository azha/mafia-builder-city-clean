using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // CLASSES C-a (bandeau de titre) et C-b (police et échelle des titres) du juge groupé du 07/10 (décision de f2 : on suit la maquette) — `EnteteDEcran`. HORS RÉSEAU.
    //   E1  les palettes (plaque, filet) lues par le juge ; l'échelle unique (12,5 px CSS) ; l'encre `#f0dfc4`
    //   E2  GARDE DE CLASSE : ㉚ ㉘ ㉛ construisent leur bandeau par `EnteteDEcran.Construire`, ㉞ l'habille par `Habiller` ; plus aucun titre posé à la main à 17-18 px CSS en sans-serif
    //   E3  EFFET (㉛) : le premier élément de la pile est la plaque pleine largeur + son filet ; le titre est en DejaVu Serif crème à l'échelle de la maquette ; le bandeau ne défile pas
    [Category("EnteteDEcran")]
    public class EnteteDEcranPlayModeTests
    {
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private static (int, int, int) Trio(Color c) { Color32 k = c; return (k.r, k.g, k.b); }

        [Test]
        public void E1_LesPalettes_LEchelle_LEncre_SontCellesDeLaMaquette()
        {
            Assert.AreEqual(12.5f, EnteteDEcran.TitreCss, "capitale de 33 px sur 1080 = corps de 45,3 px = 12,5 px CSS");
            Assert.AreEqual((0xf0, 0xdf, 0xc4), Trio(EnteteDEcran.TitreEncre));
            Assert.AreEqual(((0x1e, 0x1b, 0x16), (0x3a, 0x35, 0x2c)), ((Trio(EnteteDEcran.Appro.Plaque)), Trio(EnteteDEcran.Appro.Filet)), "㉚ `.entete`");
            Assert.AreEqual(((0x20, 0x18, 0x0f), (0x3d, 0x30, 0x24)), ((Trio(EnteteDEcran.Distribution.Plaque)), Trio(EnteteDEcran.Distribution.Filet)), "㉘ `.entete`");
            Assert.AreEqual(((0x1a, 0x1f, 0x26), (0x33, 0x3c, 0x46)), ((Trio(EnteteDEcran.Loi.Plaque)), Trio(EnteteDEcran.Loi.Filet)), "㉛ `.pl-tete`");
            Assert.AreEqual(((0x1f, 0x1c, 0x17), (0x3b, 0x35, 0x2c)), ((Trio(EnteteDEcran.Carnet.Plaque)), Trio(EnteteDEcran.Carnet.Filet)), "㉞ `.cn-tete`");
        }

        [Test]
        public void E2_Garde_LesQuatreEcrans_ParLeGabarit_PlusDeTitreAMain()
        {
            string o = Path.Combine(Application.dataPath, "Scripts", "Operational");
            string appro = File.ReadAllText(Path.Combine(o, "ChaineDAppro", "ChaineDApproScreenController.cs"));
            string distrib = File.ReadAllText(Path.Combine(o, "Distribution", "DistributionScreenController.cs"));
            string loi = File.ReadAllText(Path.Combine(o, "Loi", "LoiScreenController.cs"));
            string carnet = File.ReadAllText(Path.Combine(o, "Carnet", "CarnetScreenController.cs"));
            StringAssert.Contains("EnteteDEcran.Construire(racine.transform, EnteteDEcran.Appro", appro);
            StringAssert.Contains("EnteteDEcran.Construire(racine.transform, EnteteDEcran.Distribution", distrib);
            StringAssert.Contains("EnteteDEcran.Construire(racine.transform, EnteteDEcran.Loi", loi);
            StringAssert.Contains("EnteteDEcran.Habiller(ens, EnteteDEcran.Carnet", carnet);
            StringAssert.Contains("Px(EnteteDEcran.TitreCss)", carnet, "㉞ : l'échelle UNIQUE du titre");
            foreach ((string nom, string src) in new[] { ("Appro", appro), ("Distribution", distrib), ("Loi", loi) })
            {
                StringAssert.DoesNotContain("NouveauTexteFiche(corpsGo.transform, \"Titre\"", src, nom + " : le titre est celui du bandeau, plus un texte posé à la main dans le corps");
                StringAssert.DoesNotContain("NouveauTexteFiche(contenuGo.transform, \"Titre\"", src, nom);
            }
        }

        [UnityTest]
        public IEnumerator E3_LEffet_Loi_LePremierElementEstLaPlaquePleineLargeur_TitreSerifALEchelle()
        {
            var host = new GameObject("LoiEntete", typeof(RectTransform));
            LoiScreenController ecran = host.AddComponent<LoiScreenController>();
            try
            {
                yield return null;
                ecran.RendrePourTest(new GetLegalResponseDto { lawyerRoster = new LawyerDto[0], activeCases = new LegalCaseDto[0] });
                yield return null; yield return null;
                Transform racine = GameObject.Find("LoiRoot").transform;
                Transform entete = racine.Find("Entete");
                Assert.IsNotNull(entete, "le bandeau existe");
                // F10 (juge d'ensemble r1, 08/10) : « premier » = premier élément de la PILE, mais dessiné APRÈS `Decor` — placé avant, il passait sous le support opaque (0 pixel de titre sur ㉚ ㉛ ㉘)
                Transform decor = racine.Find("Decor");
                Assert.IsNotNull(decor, "le décor est posé");
                Assert.Greater(entete.GetSiblingIndex(), decor.GetSiblingIndex(), "le bandeau est dessiné PAR-DESSUS le décor, jamais dessous");
                for (int i = 0; i < entete.GetSiblingIndex(); i++)
                {
                    LayoutElement le = racine.GetChild(i).GetComponent<LayoutElement>();
                    Assert.IsTrue(!racine.GetChild(i).gameObject.activeSelf || (le != null && le.ignoreLayout), $"{racine.GetChild(i).name} précède le bandeau et entre dans la pile : le bandeau n'est plus le premier élément de la pile");
                }
                Assert.AreEqual(entete, racine.GetChild(entete.GetSiblingIndex()), "(le bandeau ne défile pas : il est hors du corps défilant)");
                Assert.AreEqual(((0x1a, 0x1f, 0x26)), Trio(entete.GetComponent<Image>().color), "plaque `.pl-tete`");
                Transform filet = entete.Find("Filet");
                Assert.IsNotNull(filet); Assert.AreEqual((0x33, 0x3c, 0x46), Trio(filet.GetComponent<Image>().color));
                TextMeshProUGUI titre = entete.Find("Titre").GetComponent<TextMeshProUGUI>();
                Assert.AreEqual(DesignTokens.Current.hudSerifFont, titre.font, "DejaVu Serif, plus le sans-serif blanc");
                Assert.AreEqual((0xf0, 0xdf, 0xc4), Trio(titre.color));
                Assert.IsFalse(string.IsNullOrEmpty(titre.text), "le titre est écrit par le contrôleur dans le bandeau");
                Assert.IsNull(racine.Find("Corps").GetComponentInChildren<ScrollRect>().content.Find("Titre"), "plus de titre dans le corps défilant (B1 : le fragment de titre coupé)");
                RectTransform rt = (RectTransform)entete;
                Assert.Greater(rt.rect.width, 0f);
                Assert.AreEqual(((RectTransform)racine).rect.width, rt.rect.width, 1f, "pleine largeur");
            }
            finally
            {
                GameObject r = GameObject.Find("LoiRoot");
                if (r != null) Object.DestroyImmediate(r);
                Object.DestroyImmediate(host);
            }
        }
    }
}
