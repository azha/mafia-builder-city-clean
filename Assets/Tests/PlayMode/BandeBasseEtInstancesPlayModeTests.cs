using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // CLASSE C-c (bande basse) et INSTANCES A du juge groupé du 07/10 (décisions de f2). HORS RÉSEAU.
    //   B1  ㉚ Appro : le pied est la BANDE BASSE (`PiedDEcran.Bande`) ancrée en pied ; le rouge des valeurs sur le papier est `#a8402f` (≥ 4,5:1), plus `#ff5a4d` (2,34:1)
    //   B2  ㉘ Distribution : les jetons d'action (« Acheter un relais », « Acheter un vélo ») sont à la forme `.geste`
    //   B3  ㉞ Carnet : la bande basse porte « LANCER LA SOIRÉE » ÉTEINT (`.mort`, non interactif) ; les rangs sont des PASTILLES ; chaque ligne a sa réglure
    [Category("BandeBasse")]
    public class BandeBasseEtInstancesPlayModeTests
    {
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private static float Lum(Color c)
        {
            float L(float v) => v <= 0.03928f ? v / 12.92f : Mathf.Pow((v + 0.055f) / 1.055f, 2.4f);
            return 0.2126f * L(c.r) + 0.7152f * L(c.g) + 0.0722f * L(c.b);
        }
        private static float Contraste(Color a, Color b) { float x = Lum(a) + 0.05f, y = Lum(b) + 0.05f; return x > y ? x / y : y / x; }
        private static string Source(params string[] chemin) => File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", Path.Combine(chemin)));

        [Test]
        public void B1_Appro_LePiedEstLaBandeBasse_LeRougeDuBonEstLisible()
        {
            Color32 r = MafiaCleanCity.Operational.ChaineDApproScreenController.RougeDuBon;
            Assert.AreEqual((0xa8, 0x40, 0x2f), ((int)r.r, (int)r.g, (int)r.b), "`.bon .l b.rouge` : #a8402f");
            Color papier = new Color32(0xe5, 0xe0, 0xd0, 255);   // le papier mesuré par le juge (#e5e0d0)
            Assert.GreaterOrEqual(Contraste(r, papier), 4.5f, "lisible sur le papier (4,96:1 mesuré par le juge sur la maquette)");
            Assert.Less(Contraste(new Color32(0xff, 0x5a, 0x4d, 255), papier), 3f, "contrôle négatif : l'ancien rouge (#ff5a4d) est sous le plancher de 3:1 (2,34:1 mesuré) — c'est le défaut A2");
            string s = Source("Operational", "ChaineDAppro", "ChaineDApproScreenController.cs");
            StringAssert.Contains("PiedDEcran.Bande(racine.transform, Px)", s, "le pied est la bande basse, ancrée en pied de la pile");
            StringAssert.DoesNotContain("GameObject piedGo = NouveauUI(\"Pied\", corpsGo.transform)", s, "plus de pied qui flotte dans la colonne");
        }

        [Test]
        public void B2_Distribution_LesJetonsDActionSontLeGesteMaison()
        {
            string s = Source("Operational", "Distribution", "DistributionScreenController.cs");
            StringAssert.Contains("Gestifier(boutonAchat, hba, libAchat)", s);
            StringAssert.Contains("Gestifier(bouton, h, lib)", s);
            StringAssert.Contains("PiedDEcran.StylerLeBouton(bouton, libelle, PiedDEcran.Forme.Geste)", s, "forme `.geste` : bord #5a4a2a, fond #241c11, libellé #d9ab4e");
        }

        [Test]
        public void B4_Inspection_LeRegistreDeDispatchSurPapier_SansIllustration_DeposerEnPlaqueCreme()
        {
            string s = Source("CitySim", "Inspection", "InspectionScreenController.cs");
            StringAssert.Contains("Bloc(\"Papier\", transform", s, "A1 : le registre est une feuille de papier pleine largeur");
            StringAssert.Contains("BPD · REGISTRE DE DISPATCH", s, "l'en-tête de listing du cadre 32");
            StringAssert.Contains("Perforations(feuille.transform, true)", s); StringAssert.Contains("Perforations(feuille.transform, false)", s);
            StringAssert.DoesNotContain("EtatsVidesIllustres.Monter(", s, "A2 : aucune illustration photographique dans les cadres 31-35");
            StringAssert.Contains("fondBouton.color = PiedDEcran.PlaqueCreme;", s, "A3 : DÉPOSER, la plaque crème au double filet rouge — plus d'aplat olive");
            Assert.AreEqual((216, 202, 167), ((int)((Color32)PiedDEcran.PlaqueCreme).r, (int)((Color32)PiedDEcran.PlaqueCreme).g, (int)((Color32)PiedDEcran.PlaqueCreme).b));
            // les mots du cadre 32, par la valeur servie
            Assert.AreEqual("vide", MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.ChargeDeLaFile, "EMPTY"));
            Assert.AreEqual("légère", MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.ChargeDeLaFile, "LIGHT"));
            Assert.AreEqual("nominal", MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.Regime, "NOMINAL"));
            Assert.AreEqual("arriéré", MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.Regime, "BACKLOGGED"));
            MafiaCleanCity.I18n.MotsDesEnumeres.OublierLesManquants();
        }

        private GameObject hote;

        [UnityTest]
        public IEnumerator B3_Carnet_BandeBasse_GesteEteint_Pastilles_Reglure()
        {
            hote = new GameObject("CarnetBande", typeof(RectTransform));
            var carnet = hote.AddComponent<CarnetScreenController>();
            try
            {
                yield return null;
                carnet.RendrePourTest(new CarnetCourantDto { slots = new CueSlotDto[0] });
                yield return null; yield return null;
                Assert.IsNotNull(carnet.GesteDuPied, "la bande basse porte son geste");
                Assert.IsFalse(carnet.GesteDuPied.interactable, "ÉTEINT : aucune route n'active « lancer la soirée » (sans mentir)");
                Color32 fond = carnet.GesteDuPied.GetComponent<Image>().color;
                Assert.AreEqual((0x1c, 0x14, 0x14), ((int)fond.r, (int)fond.g, (int)fond.b), "`.mort` : fond #1c1414");
                Transform bas = carnet.GesteDuPied.transform.parent;
                Assert.AreEqual("Bas", bas.name);
                Assert.IsNotNull(bas.Find("Filet"), "le filet haut de 2 px");
                int pastilles = 0, regles = 0;
                foreach (Transform t in GameObject.Find("CarnetRoot").GetComponentsInChildren<Transform>(true)) { if (t.name == "Pastille") pastilles++; if (t.name == "Regle") regles++; }
                Assert.AreEqual(8, pastilles, "huit rangs, huit pastilles (A2 : 8 sur 8 absentes)");
                Assert.AreEqual(8, regles, "huit lignes, huit filets de réglure (A1)");
            }
            finally
            {
                GameObject r = GameObject.Find("CarnetRoot");
                if (r != null) Object.DestroyImmediate(r);
                Object.DestroyImmediate(hote);
            }
        }
    }
}
