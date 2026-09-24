using System;
using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // G4 (passe UX du 2026-09-24) — « La carte » de l'Accueil monte ③ en SURIMPRESSION ; son « Entrer » ne faisait rien : seul l'onglet
    // Empire abonnait `CityMapController.OnEnterDistrict` au shell (`AppShell.cs:269`). Désormais `DashboardController.OpenCityMap`
    // l'abonne à `IEntreeDeDistrict` (implémenté par le shell). Tout se joue dans UNE frame, avant tout `Start()` : aucun appel réseau.
    [Category("Charpente")]
    public class EntreeDeDistrictDepuisLAccueilPlayModeTests
    {
        private class FauxShell : MonoBehaviour, IShellNavigator, IEntreeDeDistrict
        {
            public readonly List<int> Entrees = new List<int>();
            public T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant
            {
                var hote = new GameObject("Hote_" + typeof(T).Name, typeof(RectTransform));
                hote.transform.SetParent(transform, false);
                return hote.AddComponent<T>();
            }
            public void EntrerDansLeDistrict(int districtId) => Entrees.Add(districtId);
        }

        /// <summary>Contrôle négatif : un navigateur SANS le contrat d'entrée — la carte n'est abonnée à rien (l'état d'avant G4).</summary>
        private class FauxNavigateurSeul : MonoBehaviour, IShellNavigator
        {
            public T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant
            {
                var hote = new GameObject("Hote_" + typeof(T).Name, typeof(RectTransform));
                hote.transform.SetParent(transform, false);
                return hote.AddComponent<T>();
            }
        }

        private readonly List<GameObject> crees = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in crees) if (g != null) Object.DestroyImmediate(g);
            crees.Clear();
        }

        private static Action<int> Abonnes(CityMapController carte) =>
            (Action<int>)typeof(CityMapController).GetField("OnEnterDistrict", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(carte);

        private CityMapController OuvrirLaCarteDepuisLAccueil()
        {
            var dashGo = new GameObject("Dashboard", typeof(RectTransform));
            crees.Add(dashGo);
            DashboardController dash = dashGo.AddComponent<DashboardController>();
            dash.OpenCityMap();
            Assert.IsNotNull(dash.LastNavGameObject, "« La carte » n'a rien monté par le navigateur");
            crees.Add(dash.LastNavGameObject);
            CityMapController carte = dash.LastNavGameObject.GetComponent<CityMapController>();
            Assert.IsNotNull(carte, "la cible montée doit être ③ (CityMapController)");
            return carte;
        }

        [Test]
        public void G4_LaCarteDeLAccueil_EntrerPasseParLeShell()
        {
            var shellGo = new GameObject("FauxShell", typeof(RectTransform));
            crees.Add(shellGo);
            FauxShell shell = shellGo.AddComponent<FauxShell>();
            CityMapController carte = OuvrirLaCarteDepuisLAccueil();
            Action<int> abonnes = Abonnes(carte);
            Assert.IsNotNull(abonnes, "③ monté par l'Accueil n'est abonné à RIEN : « Entrer » ne ferait rien (G4)");
            abonnes(16);
            CollectionAssert.AreEqual(new[] { 16 }, shell.Entrees, "« Entrer » passe par le shell, avec le district choisi");
        }

        [Test]
        public void G4_ControleNegatif_SansContratDEntree_LaCarteNestAbonneeARien()
        {
            var navGo = new GameObject("FauxNavigateurSeul", typeof(RectTransform));
            crees.Add(navGo);
            navGo.AddComponent<FauxNavigateurSeul>();
            CityMapController carte = OuvrirLaCarteDepuisLAccueil();
            Assert.IsNull(Abonnes(carte), "sans IEntreeDeDistrict, rien n'est abonné — l'instrument distingue bien les deux états");
        }
    }
}
