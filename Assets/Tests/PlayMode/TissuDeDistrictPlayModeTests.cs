using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    // Le tissu d'un quartier (atelier, 2026-09-22) : six mots servis, deux formes, un repli brut,
    // et ZÉRO littéral hors du résolveur — le dernier point est balayé dans la SOURCE des deux
    // sites, parce qu'un troisième site écrirait le mot à sa façon sans que rien ne le dise.
    [Category("W3UDA")]
    public class TissuDeDistrictPlayModeTests
    {
        /// <summary>Les 18 noms servis par `GET /v1/world/districts` le 2026-09-22 (200, 18 lignes).
        /// Le mot de tissu est À CÔTÉ du nom, jamais dessus : aucun mot ne doit être un nom.</summary>
        private static readonly string[] NomsServis =
        {
            "Les Bassins", "Quai-Nord", "Sarnes", "La Colonne", "Hautes-Marches", "Verrier",
            "Saint-Brand", "Le Treillis", "Marne-Basse", "Orsel", "Les Entrepôts", "Dépôt-Est",
            "Le Verre", "Place des Comptes", "La Chancellerie", "La Lisière", "Les Friches", "Pont-Gris",
        };

        [Test]
        public void LesSixProfilsServis_OntChacunLeurMot_DansLesDeuxFormes()
        {
            string[] servis = DistrictTintResolver.KnownProfiles.OrderBy(p => p).ToArray();
            CollectionAssert.AreEqual(TissuDeDistrict.ProfilsConnus.OrderBy(p => p).ToArray(), servis,
                "le domaine du tissu est celui de la teinte : les mêmes six codes, ni plus ni moins");
            foreach (string p in servis)
            {
                string ligne = TissuDeDistrict.EnLigne(p);
                string valeur = TissuDeDistrict.Valeur(p);
                Assert.AreNotEqual(p, ligne, $"« {p} » : la forme en ligne est restée le code brut");
                Assert.AreNotEqual(p, valeur, $"« {p} » : la valeur de ligne est restée le code brut");
                Assert.IsTrue(char.IsLower(ligne[0]), $"« {p} » : la forme en ligne commence en minuscule (« le port »), lue : « {ligne} »");
                Assert.IsTrue(char.IsUpper(valeur[0]), $"« {p} » : la valeur de ligne porte la capitale (« Port »), lue : « {valeur} »");
                Assert.IsTrue(ligne.StartsWith("le ") || ligne.StartsWith("les ") || ligne.StartsWith("l'"),
                    $"« {p} » : la forme en ligne porte l'article, lue : « {ligne} »");
            }
            Assert.AreEqual(6, servis.Select(TissuDeDistrict.EnLigne).Distinct().Count(), "six tissus, six mots en ligne distincts");
            Assert.AreEqual(6, servis.Select(TissuDeDistrict.Valeur).Distinct().Count(), "six tissus, six valeurs distinctes");
        }

        [Test]
        public void LeMotDeTissu_NEstJamaisUnNomDeQuartier()
        {
            foreach (string p in TissuDeDistrict.ProfilsConnus)
            {
                string mot = TissuDeDistrict.Valeur(p).ToLowerInvariant();
                foreach (string nom in NomsServis)
                {
                    string n = nom.ToLowerInvariant();
                    Assert.IsFalse(n == mot || n.EndsWith(" " + mot),
                        $"« {p} » → « {TissuDeDistrict.Valeur(p)} » est le nom du quartier « {nom} » : le mot doit être À CÔTÉ du nom, jamais dessus");
                }
            }
        }

        [Test]
        public void UnProfilInconnu_SeDit_TypeInconnu_EtUnProfilVide_RendLeTiret()
        {
            // ⛔ 23/09 — épingle REMPLACÉE (règle f2, atelier 28) : un profil inconnu ne se montre plus BRUT ; il se dit « type
            // inconnu » (un profil est une SORTE). Le 7ᵉ code se voit par le test de couverture de domaine, plus à l'écran.
            const string inconnu = "chrome";   // un 7ᵉ code que le back ne sert pas — contrôle négatif
            Assert.IsFalse(TissuDeDistrict.ProfilsConnus.Contains(inconnu), "le contrôle négatif doit être hors domaine");
            Assert.AreEqual(MafiaCleanCity.I18n.Repli.TypeInconnu, TissuDeDistrict.EnLigne(inconnu), "jamais la valeur brute, jamais un mot inventé");
            Assert.AreEqual(MafiaCleanCity.I18n.Repli.TypeInconnu, TissuDeDistrict.Valeur(inconnu));
            Assert.AreEqual(TissuDeDistrict.Inconnu, TissuDeDistrict.EnLigne(null));
            Assert.AreEqual(TissuDeDistrict.Inconnu, TissuDeDistrict.Valeur(""));
            Assert.AreEqual("le port", TissuDeDistrict.EnLigne("  TIDEWATER "), "la casse et les espaces du code ne décident pas");
        }

        [Test]
        public void LesDeuxSites_PassentParLeResolveur_EtAucunLitteralNeVitHorsDeLui()
        {
            string cell = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts/CityMap/DistrictCellView.cs"));
            string ctl = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts/CityMap/CityMapController.cs"));
            StringAssert.Contains("TissuDeDistrict.EnLigne(", cell, "DistrictCellView : la ligne « nom · tissu · blocs » passe par le résolveur");
            StringAssert.Contains("TissuDeDistrict.Valeur(", ctl, "CityMapController : la valeur de ligne passe par le résolveur");
            StringAssert.Contains("TissuDeDistrict.LibelleDeLigne", ctl, "CityMapController : le libellé « Tissu » vient du résolveur, pas d'un littéral");
            StringAssert.DoesNotContain("{dto.profile}", cell, "le code brut n'atteint plus le joueur en ligne");
            StringAssert.DoesNotContain("DetailRow(\"Profile\"", ctl, "le libellé anglais « Profile » a disparu du panneau");
            foreach (string mot in new[] { "le port", "l'avenue", "le damier", "les cheminées", "les tours", "les faubourgs" })
            {
                StringAssert.DoesNotContain("\"" + mot + "\"", cell, $"« {mot} » ne vit qu'à un endroit : le résolveur");
                StringAssert.DoesNotContain("\"" + mot + "\"", ctl, $"« {mot} » ne vit qu'à un endroit : le résolveur");
            }
        }
    }
}
