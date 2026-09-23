using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.I18nTests
{
    /// <summary>Un chargement EN VOL : demandé à sa création (le contexte courant est capturé À LA DEMANDE, comme dans
    /// `I18nCatalog.Amorcer`), il n'arrive que `frames` images plus tard — donc pendant la classe suivante.</summary>
    public class ChargeurDeCatalogueEnVol : MonoBehaviour
    {
        public string demande;
        public int frames = 30;
        private IEnumerator Start()
        {
            for (int i = 0; i < frames; i++) yield return null;
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "sonde.en.vol", "vol" } }, demande);
            Destroy(gameObject);
        }
    }

    /// <summary>⛔ CONTRÔLE POSITIF DE L'ATTRIBUTION (TD-576, 2026-09-23) — HORS GATE (catégorie `SondeFuiteCatalogue`), avec
    /// sa sœur B ci-dessous. A DEMANDE un chargement qui arrive pendant B ; B sort catalogue chargé. Lancées seules, la
    /// ligne de sortie doit porter les DEUX noms : « chargé pendant …SondeFuiteCatalogueA…, survivant à la sortie de
    /// …SondeFuiteCatalogueB… ». Sans cette sonde, une garde qui accuserait B (la victime) serait indiscernable d'une
    /// garde juste. L'ordre A → B est celui de NUnit (noms complets, ordre alphabétique).</summary>
    [Category("SondeFuiteCatalogue")]
    public class SondeFuiteCatalogueA_DemandeUnChargementEnVolPlayModeTests
    {
        [UnityTest]
        public IEnumerator DemandeUnChargementQuiArriveraPendantLaClasseSuivante()
        {
            I18nCatalog.Oublier();
            var go = new GameObject("ChargeurDeCatalogueEnVol");
            var chargeur = go.AddComponent<ChargeurDeCatalogueEnVol>();
            chargeur.demande = I18nCatalog.ContexteCourant;
            chargeur.frames = 30;
            Assert.IsNotNull(chargeur.demande, "le lanceur doit poser le contexte courant — sinon l'attribution n'a rien à lire");
            yield return null;
            Assert.IsFalse(I18nCatalog.Charge, "le chargement doit être EN VOL à la sortie de A — sinon la sonde ne teste rien");
        }
    }

    [Category("SondeFuiteCatalogue")]
    public class SondeFuiteCatalogueB_SortAvecLeChargementDeAPlayModeTests
    {
        [UnityTest]
        public IEnumerator AttendLeChargementDeA_EtSortAvec()
        {
            int n = 0;
            while (!I18nCatalog.Charge && n++ < 300) yield return null;
            Assert.IsTrue(I18nCatalog.Charge, "le chargement demandé par A n'est jamais arrivé");
            StringAssert.Contains("SondeFuiteCatalogueA", I18nCatalog.DemandePendant,
                "le catalogue doit être attribué à A, qui l'a DEMANDÉ — pas à B, pendant qui il est arrivé");
            StringAssert.Contains("SondeFuiteCatalogueB", I18nCatalog.ArrivePendant, "arrivé pendant B");
        }
    }
}
