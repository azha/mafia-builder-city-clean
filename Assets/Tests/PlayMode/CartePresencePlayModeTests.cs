using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ③ LA PRÉSENCE DU JOUEUR (ruling user du 24/09, ARBITRAGES D21 ; maquette PROPOSÉE `ecrans-brennar-3-presence.html`, atelier
    // 8616acc ; table 58, clé `carte.presence.batiments`). HORS RÉSEAU : les districts sont posés par `MonterPourTest`, le décompte
    // par `AppliquerPresence` — aucun `Start`, aucune requête. Monde : 3 districts, 2 possédés (4 et 1 bâtiments), 1 vide.
    //   P1  le décompte : une ligne par bâtiment servi, par `district_id` (entrée nulle ignorée)
    //   P2  clé NON servie (repli ordonné) : l'état `mien` (nom en or, plus grand, sol chaud) SANS le nombre ; le vide reste au repos
    //   P3  clé servie : le nombre en mots, formaté par le catalogue (ICU one/other), sous le nom ; le badge de chaleur descend
    //   P4  retirer la présence rend le repos (couleur et corps du nom d'origine) — la pose est réversible, jamais cumulée
    [Category("CartePresence")]
    public class CartePresencePlayModeTests
    {
        private GameObject hote;
        private HashSet<GameObject> racinesAvant;

        [SetUp]
        public void SetUp()
        {
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            I18nCatalog.Oublier();
        }

        [TearDown]
        public void TearDown()
        {
            if (hote != null) Object.DestroyImmediate(hote);
            hote = null;
            foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                Object.DestroyImmediate(g);   // le Canvas créé par l'écran nu
            racinesAvant = null;
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

        private static DistrictDto District(int id, string canon, string nom) => new DistrictDto
        {
            id = id, profile = "tidewater", index = id.ToString(), name_canonical = canon, name = nom, block_count = 4,
            bank_side = "north", control_state = "UNCONTESTED",
        };

        private CityMapController Monter()
        {
            hote = new GameObject("CartePresence");
            CityMapController c = hote.AddComponent<CityMapController>();
            c.MonterPourTest(new List<DistrictDto>
            {
                District(1, "Tidewater-1", "Le Port"), District(2, "Tidewater-2", "Marne-Basse"), District(3, "Tidewater-3", "Les Friches"),
            });
            Assert.IsTrue(c.VillePeinteMontee, "précondition : la ville peinte est montée (les marqueurs portent la présence)");
            Assert.AreEqual(3, c.Cells.Count);
            return c;
        }

        private static DistrictCellView Cellule(CityMapController c, int id) => c.Cells.First(x => x.Model.id == id);

        private static readonly Dictionary<int, int> DeuxPossedesUnVide = new Dictionary<int, int> { { 1, 4 }, { 2, 1 } };

        [Test]
        public void P1_LeDecompte_UneLigneParBatiment_ParDistrict()
        {
            var b = new[]
            {
                new BatimentPossedeDto { building = "a", district_id = 1 }, new BatimentPossedeDto { building = "b", district_id = 1 },
                null, new BatimentPossedeDto { building = "c", district_id = 2 }, new BatimentPossedeDto { building = "d", district_id = 1 },
            };
            Dictionary<int, int> n = CityMapController.CompterParDistrict(b);
            CollectionAssert.AreEquivalent(new Dictionary<int, int> { { 1, 3 }, { 2, 1 } }, n);
            Assert.IsEmpty(CityMapController.CompterParDistrict(null), "rien servi ⇒ rien compté");
        }

        [Test]
        public void P2_CleNonServie_LEtatMienSansLeNombre_EtLeVideAuRepos()
        {
            CityMapController c = Monter();
            DistrictCellView vide = Cellule(c, 3);
            Color reposCouleur = vide.Label.color;
            float reposCorps = vide.Label.fontSize;

            c.AppliquerPresence(DeuxPossedesUnVide);
            Assert.IsTrue(c.PresenceChargee);
            foreach (int id in new[] { 1, 2 })
            {
                DistrictCellView m = Cellule(c, id);
                Assert.IsTrue(m.Mien, $"district {id} possédé ⇒ mien");
                Assert.AreEqual(DesignTokens.Current.hudMoneyGold, m.Label.color, $"district {id} : nom en or");
                Assert.AreEqual(reposCorps * DistrictCellView.EchelleNomMien, m.Label.fontSize, 0.01f, $"district {id} : nom plus grand");
                Assert.IsTrue(m.SolMien.gameObject.activeSelf, $"district {id} : sol chaud");
                Assert.IsFalse(m.LignePresence.gameObject.activeSelf, $"district {id} : clé non servie ⇒ PAS de nombre (repli ordonné)");
            }
            Assert.AreEqual(4, Cellule(c, 1).BatimentsPossedes);
            Assert.IsFalse(vide.Mien, "le district vide n'est pas mien");
            Assert.AreEqual(reposCouleur, vide.Label.color, "le vide garde sa couleur");
            Assert.AreEqual(reposCorps, vide.Label.fontSize, 0.01f, "le vide garde son corps");
            Assert.IsFalse(vide.SolMien.gameObject.activeSelf, "le vide n'a pas de sol chaud");
        }

        [Test]
        public void P3_CleServie_LeNombreEnMots_SousLeNom()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { CityMapController.ClePresence, "{n, plural, one {# bâtiment} other {# bâtiments}}" },
            });
            CityMapController c = Monter();
            float badgeRepos = ((RectTransform)Cellule(c, 1).HeatBadge.transform).anchoredPosition.y;

            c.AppliquerPresence(DeuxPossedesUnVide);
            DistrictCellView quatre = Cellule(c, 1), un = Cellule(c, 2), vide = Cellule(c, 3);
            Assert.IsTrue(quatre.LignePresence.gameObject.activeSelf);
            Assert.AreEqual("4 bâtiments", quatre.LignePresence.text, "ICU other, valeur servie telle quelle (capitales = style)");
            Assert.AreEqual("1 bâtiment", un.LignePresence.text, "ICU one");
            Assert.IsFalse(vide.LignePresence.gameObject.activeSelf, "aucun nombre sur le district vide");
            Assert.IsTrue((quatre.LignePresence.fontStyle & TMPro.FontStyles.UpperCase) != 0, "capitales en STYLE (`.nbq`)");
            Assert.Less(((RectTransform)quatre.HeatBadge.transform).anchoredPosition.y, badgeRepos, "le badge de chaleur descend sous la ligne");
        }

        [Test]
        public void P4_RetirerLaPresence_RendLeRepos()
        {
            CityMapController c = Monter();
            DistrictCellView d = Cellule(c, 1);
            Color reposCouleur = d.Label.color;
            float reposCorps = d.Label.fontSize;

            c.AppliquerPresence(DeuxPossedesUnVide);
            c.AppliquerPresence(DeuxPossedesUnVide);   // deux poses : le corps n'est pas agrandi deux fois
            Assert.AreEqual(reposCorps * DistrictCellView.EchelleNomMien, d.Label.fontSize, 0.01f, "pose idempotente");
            c.AppliquerPresence(new Dictionary<int, int>());
            Assert.IsFalse(d.Mien);
            Assert.AreEqual(reposCouleur, d.Label.color, "couleur de repos rendue");
            Assert.AreEqual(reposCorps, d.Label.fontSize, 0.01f, "corps de repos rendu");
            Assert.IsFalse(d.SolMien.gameObject.activeSelf);
        }
    }
}
