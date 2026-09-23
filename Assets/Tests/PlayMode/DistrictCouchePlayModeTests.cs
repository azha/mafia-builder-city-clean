using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ①-5 (2026-09-23, écart ① `e2bd7681` §5 ; r9 B1, B3, M6) — la couche du district :
    //   L1  une ancre partagée a UN libellé, qui nomme chaque type une fois (jamais un chiffre)
    //   L2  à l'écran : un seul `TypeLabel` pour les deux cellules d'un bloc partagé, centré sur l'ANCRE ; le bloc seul garde le sien
    //   L3  le corps du libellé est 9 px de MAQUETTE (`EchelleMaquette`), pas 9 unités de canvas ; une ligne par mot, jamais coupée
    //   L4  la fiche ouverte dit de quel bâtiment elle parle : un anneau sur SA cellule, un seul, retiré à la fermeture
    [Category("EcranDistrict")]
    public class DistrictCouchePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static DistrictInteriorBuildingDto Batiment(string id, int bloc, string type) => new DistrictInteriorBuildingDto
        {
            building = id, block_id = bloc, operational_type = type, conversion_band = "OPERATIONAL", shell_state = "STANDING",
            condition_band = "SOUND", revenue_band = "IDLE", revenue_chain = "WIRED", activity_band = "IDLE",
            harvest_band = "NOTHING", lapse_phase_bucket = "WITHIN_WINDOW", lieutenant_ids = new string[0],
        };

        private DistrictInteriorScreenController Rendre(params DistrictInteriorBuildingDto[] batiments)
        {
            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();
            ecran.Render(new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice", name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = 2, height = 1 },
                blocks = new[]
                {
                    new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 },
                    new DistrictInteriorBlockDto { block_id = 1, x = 1, y = 0 },
                },
                buildings = batiments, day_phase = "NIGHT",
            });
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            return ecran;
        }

        private static RectTransform[] CellulesDuBloc(DistrictInteriorScreenController e, int x, int y) =>
            e.ScreenRoot.GetComponentsInChildren<RectTransform>(true)
                .Where(r => r.name == $"Cell_{x}_{y}" || r.name.StartsWith($"Cell_{x}_{y}_")).ToArray();

        [Test]
        public void L1_UneAncre_UnLibelle_ChaqueTypeUneFois()
        {
            CollectionAssert.AreEqual(new[] { "Commerce-écran", "Labo" },
                DistrictInteriorScreenController.LibellesDeLAncre(new[] { "front_shop", "lab" }, "lab", 2));
            CollectionAssert.AreEqual(new[] { "Labo" },
                DistrictInteriorScreenController.LibellesDeLAncre(new[] { "lab", "lab" }, "lab", 2),
                "deux Labos sous une ancre : « Labo », jamais « Labo ×2 » (R2.2)");
            CollectionAssert.AreEqual(new[] { "Planque" },
                DistrictInteriorScreenController.LibellesDeLAncre(null, "cash_safehouse", 1), "une ancre seule : son mot");
        }

        [Test]
        public void L2_UnSeulLibelle_PourLesDeuxCellulesDUnBlocPartage_CentreSurLAncre()
        {
            DistrictInteriorScreenController e = Rendre(
                Batiment("b-a", 0, "front_shop"), Batiment("b-b", 0, "lab"), Batiment("b-c", 1, "cash_safehouse"));

            RectTransform[] partage = CellulesDuBloc(e, 0, 0);
            Assert.AreEqual(2, partage.Length, "anti-vacuité : deux cellules sous l'ancre (0,0)");
            TextMeshProUGUI[] libelles = partage.Select(c => c.Find("TypeLabel")).Where(t => t != null)
                .Select(t => t.GetComponent<TextMeshProUGUI>()).ToArray();
            Assert.AreEqual(1, libelles.Length, "r9 B1 : un libellé par ancre, plus deux mots au même centre");
            Assert.AreEqual("Commerce-écran\nLabo", libelles[0].text, "chaque type nommé une fois, un par ligne");
            Assert.IsNull(libelles[0].transform.parent.Find("TypeIcon"), "plusieurs types : aucun glyphe ne les dirait tous");

            // Centré sur l'ANCRE. ⚠️ Pas la moyenne des deux cellules : chaque cellule s'étale sur SA largeur (un front_shop et un lab n'ont
            // pas le même sprite) — mesuré au créneau du 23/09 (moyenne 45, libellé à 0,17). L'ancre se reconstruit depuis la cellule de
            // rang 0 et son propre étalement (échelle 1 : pas de Canvas dans ce test).
            var lrt = (RectTransform)libelles[0].transform;
            var rang0 = (RectTransform)lrt.parent;
            float ancre = rang0.anchoredPosition.x
                          - DistrictBackgroundAnchor.EtalementDansParcelle(null, 0, 2, rang0.sizeDelta.x);
            float centre = ((RectTransform)lrt.parent).anchoredPosition.x + lrt.anchoredPosition.x;
            Assert.AreEqual(ancre, centre, 1f, "le libellé est sur l'ancre, pas sur une des deux cellules étalées");

            RectTransform[] seul = CellulesDuBloc(e, 1, 0);
            Assert.AreEqual(1, seul.Length);
            Assert.AreEqual("Planque", seul[0].Find("TypeLabel").GetComponent<TextMeshProUGUI>().text, "le bloc seul garde le sien");
        }

        [Test]
        public void L3_LeCorps_EnPxDeMaquette_UneLigneParMot()
        {
            DistrictInteriorScreenController e = Rendre(Batiment("b-a", 0, "front_shop"));
            TextMeshProUGUI l = CellulesDuBloc(e, 0, 0)[0].Find("TypeLabel").GetComponent<TextMeshProUGUI>();
            Assert.AreEqual(EchelleMaquette.Px(9f, (RectTransform)e.ScreenRoot), l.fontSize, 1e-3f,
                "r9 B3 : 9 px de maquette, par la même échelle que la fiche");
            Assert.IsFalse(l.enableWordWrapping, "« Commerce-écran » ne se coupe pas");
            Assert.GreaterOrEqual(l.rectTransform.sizeDelta.x + 1e-3f, l.GetPreferredValues(l.text).x,
                "la boîte suit l'encre : rien ne déborde en silence de ce que les gardes géométriques lisent");
        }

        [Test]
        public void L4_LaFicheDitDeQuelBatimentElleParle()
        {
            DistrictInteriorBuildingDto a = Batiment("b-a", 0, "front_shop"), c = Batiment("b-c", 1, "cash_safehouse");
            DistrictInteriorScreenController e = Rendre(a, c);
            RectTransform cellA = CellulesDuBloc(e, 0, 0)[0], cellC = CellulesDuBloc(e, 1, 0)[0];
            Assert.IsNull(e.BatimentSelectionne);

            e.OuvrirFiche(a);
            Assert.AreEqual("b-a", e.BatimentSelectionne);
            Transform anneau = cellA.Find("Selection");
            Assert.IsNotNull(anneau, "r9 M6 : un retour de sélection sur la cellule du bâtiment de la fiche");
            Assert.IsNotNull(anneau.GetComponent<Image>().sprite);
            Assert.IsFalse(anneau.GetComponent<Image>().raycastTarget, "il ne vole pas le toucher de la cellule");
            Assert.IsNull(cellC.Find("Selection"));

            e.OuvrirFiche(c);
            Assert.AreEqual("b-c", e.BatimentSelectionne);
            Assert.IsNull(cellA.Find("Selection"), "UN seul bâtiment sélectionné");
            Assert.IsNotNull(cellC.Find("Selection"));

            e.FermerFiche();
            Assert.IsNull(e.BatimentSelectionne);
            Assert.IsNull(cellC.Find("Selection"), "fiche fermée : plus de sélection");
        }
    }
}
