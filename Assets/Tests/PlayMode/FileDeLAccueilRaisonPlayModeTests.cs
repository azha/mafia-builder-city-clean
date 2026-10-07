using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using TMPro;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ④ Accueil — les DEUX lignes de la file ajoutées au cadre 4 (atelier master 0dd516e ; décision de f2 07/10, « passé à côté » du juge de données). HORS RÉSEAU.
    //   R1  la RAISON : réplique de lieutenant entre « … » ; la ville sans guillemets ; absente ⇒ rien d'inventé ; un identifiant (sans espace) ⇒ rien
    //   R2  « Plusieurs attendent encore » : 1 carte ⇒ pas de ligne ; 2 ⇒ la ligne ; 0 ⇒ rien
    //   R3  EFFET : la ligne de l'Accueil porte la raison et le pluriel dans le bloc `.qui` (couleurs de la maquette), sans eux quand ils manquent
    [Category("FileDeLAccueilRaison")]
    public class FileDeLAccueilRaisonPlayModeTests
    {
        [SetUp] public void SetUp() { MafiaCleanCity.I18n.I18nCatalog.Oublier(); }
        [TearDown] public void TearDown() { MafiaCleanCity.I18n.I18nCatalog.Oublier(); }

        private static ExceptionCardDto Carte(string id, string lieutenant, string descripteur) =>
            new ExceptionCardDto { exception_id = id, lieutenant_id = lieutenant, event_descriptor = descripteur, severity_band = "MODERATE" };

        [Test]
        public void R1_LaRaison_Replique_GuillemetsDeLieutenant_RienDInvente()
        {
            Assert.AreEqual("« L’étagère est vide. Sans pyralin, je ne rallume pas. »",
                ExceptionQueuePanelController.RaisonDeLaCarte(Carte("a", "lt-1", "L’étagère est vide. Sans pyralin, je ne rallume pas.")), "un lieutenant parle entre « »");
            Assert.AreEqual("Il fait chaud en ville",
                ExceptionQueuePanelController.RaisonDeLaCarte(Carte("b", "", "Il fait chaud en ville")), "la ville ne parle pas entre guillemets");
            Assert.IsNull(ExceptionQueuePanelController.RaisonDeLaCarte(Carte("c", "lt-1", "")), "texte absent ⇒ aucune ligne");
            Assert.IsNull(ExceptionQueuePanelController.RaisonDeLaCarte(Carte("d", "lt-1", null)));
            Assert.IsNull(ExceptionQueuePanelController.RaisonDeLaCarte(Carte("e", "lt-1", "exc_demo_teach_heat")), "un identifiant n'est pas une phrase : jamais montré sur l'Accueil");
            Assert.IsNull(ExceptionQueuePanelController.RaisonDeLaCarte(null));
        }

        [Test]
        public void R2_PlusieursAttendentEncore_UnMotPasUnChiffre_SeulementSiPlusieursCartes()
        {
            Assert.IsNull(ExceptionQueuePanelController.LignePlusieurs(0));
            Assert.IsNull(ExceptionQueuePanelController.LignePlusieurs(1), "une seule carte : pas de ligne de pluriel");
            Assert.AreEqual("Plusieurs attendent encore", ExceptionQueuePanelController.LignePlusieurs(2));
            Assert.AreEqual("Plusieurs attendent encore", ExceptionQueuePanelController.LignePlusieurs(6), "jamais un chiffre : le back ne sert aucun compte");
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new System.Collections.Generic.Dictionary<string, string> { { "accueil.file.plusieurs_attendent_encore", "§Plusieurs" } });
            Assert.AreEqual("§Plusieurs", ExceptionQueuePanelController.LignePlusieurs(3), "la clé SERVIE gagne sur le repli");
        }

        private GameObject hote;

        private ExceptionQueuePanelController Monter(params ExceptionCardDto[] cartes)
        {
            hote = new GameObject("FileAccueil", typeof(RectTransform));
            var panneau = hote.AddComponent<ExceptionQueuePanelController>();
            panneau.PoserEnLigneDeLAccueil();
            panneau.SetQueue("jeton", cartes);
            return panneau;
        }

        [UnityTest]
        public IEnumerator R3_LEffet_LaLigneDeLAccueil_PorteLaRaisonEtLePluriel_AuxCouleursDeLaMaquette()
        {
            try
            {
                ExceptionQueuePanelController p = Monter(Carte("a", "lt-1", "Sans pyralin, je ne rallume pas."), Carte("b", "", "Autre chose se prépare en ville"));
                yield return null;
                Assert.AreEqual("« Sans pyralin, je ne rallume pas. »", p.RaisonRendue);
                Assert.AreEqual("Plusieurs attendent encore", p.PlusieursRendu);
                Transform raison = FindDeep(hote.transform, "Raison"), plus = FindDeep(hote.transform, "Plusieurs");
                Assert.IsNotNull(raison, "la raison est posée dans le bloc `.qui`");
                Assert.IsNotNull(plus, "la ligne de pluriel est posée");
                Color32 cr = raison.GetComponent<TextMeshProUGUI>().color, cp = plus.GetComponent<TextMeshProUGUI>().color;
                Assert.AreEqual((0xb9, 0xad, 0x92), ((int)cr.r, (int)cr.g, (int)cr.b), "`.rep` : #b9ad92");
                Assert.AreEqual((0x8c, 0x82, 0x72), ((int)cp.r, (int)cp.g, (int)cp.b), "`.plus` : #8c8272");
                Assert.AreEqual(raison.parent, plus.parent, "dans le MÊME bloc `.qui`");
                Assert.Less(raison.GetSiblingIndex(), plus.GetSiblingIndex(), "ordre : nom + gravité, la raison, puis le pluriel");
                Object.DestroyImmediate(hote);

                ExceptionQueuePanelController seule = Monter(Carte("c", "", ""));
                yield return null;
                Assert.IsNull(seule.RaisonRendue, "réplique absente ⇒ rien d'inventé");
                Assert.IsNull(seule.PlusieursRendu, "une seule carte ⇒ pas de ligne de pluriel");
                Assert.IsNull(FindDeep(hote.transform, "Raison")); Assert.IsNull(FindDeep(hote.transform, "Plusieurs"));
            }
            finally { if (hote != null) Object.DestroyImmediate(hote); }
        }

        private static Transform FindDeep(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true)) if (t.name == nom) return t;
            return null;
        }
    }
}
