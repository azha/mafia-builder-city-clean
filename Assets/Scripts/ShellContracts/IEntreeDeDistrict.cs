using System.Linq;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>Entrer dans un district PAR LE SHELL, depuis un écran qui n'est pas l'onglet Empire (G4, passe UX du 2026-09-24) :
    /// « La carte » de l'Accueil monte ③ en SURIMPRESSION, et son « Entrer » ne faisait rien — seul l'onglet Empire abonnait
    /// `CityMapController.OnEnterDistrict` au shell (`AppShell.cs:269`). Contrat dans `ShellContracts` (le shell l'implémente ; l'Accueil,
    /// dans `Operational`, ne voit pas `AppShell` sans cycle) — patron d'`IOuvreurDeFicheOperationnelle`. Un contrat à part plutôt
    /// qu'une méthode de plus sur `IShellNavigator` : ses deux faux de test n'ont rien à y gagner.</summary>
    public interface IEntreeDeDistrict
    {
        /// <summary>Le même geste que l'« Entrer » de l'onglet Empire : démonte l'écran courant (surimpressions comprises) et monte ①.</summary>
        void EntrerDansLeDistrict(int districtId);
    }

    /// <summary>Même localisateur par balayage que `OuvreurDeFicheOperationnelleLocator` : plusieurs vivants ⇒ le plus petit
    /// `GetInstanceID()`.</summary>
    public static class EntreeDeDistrictLocator
    {
        public static IEntreeDeDistrict Find() =>
            Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IEntreeDeDistrict>()
                .OrderBy(o => ((MonoBehaviour)o).GetInstanceID())
                .FirstOrDefault();
    }
}
