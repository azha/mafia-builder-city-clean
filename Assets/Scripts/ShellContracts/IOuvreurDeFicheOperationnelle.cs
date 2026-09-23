using System.Linq;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>①-0 (2026-09-23, écart ① `e2bd7681` §0.2) — OUVRIR LA FICHE OPÉRATIONNELLE D'UN BÂTIMENT, AVEC CE BÂTIMENT.
    /// `BuildingCardController` (screen_2a) vit dans `Operational`, que `CityMap` ne voit pas (c'est `Operational` qui référence
    /// `CityMap`) : la fiche de ① passe donc par ce contrat, que le shell (qui voit les deux) implémente.
    /// ⛔ Jamais sans bâtiment : un id vide ou nul rend `false` et ne monte RIEN. C'était la route morte mesurée — l'Accueil
    /// (« La fiche ») montait l'écran sans `BuildingId`, et `Boot()` n'y chargeait rien.</summary>
    public interface IOuvreurDeFicheOperationnelle
    {
        /// <summary>Monte la fiche opérationnelle de `buildingId` en surimpression. `false` si l'id est vide ou si rien n'a été monté.</summary>
        bool OuvrirFicheOperationnelle(string buildingId);
    }

    /// <summary>Même localisateur par balayage que `ShellNavigatorLocator` : aucun registre à tenir, il suffit d'implémenter le
    /// contrat. Plusieurs vivants ⇒ le plus petit `GetInstanceID()` (ordre stable), comme lui.</summary>
    public static class OuvreurDeFicheOperationnelleLocator
    {
        public static IOuvreurDeFicheOperationnelle Find() =>
            Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IOuvreurDeFicheOperationnelle>()
                .OrderBy(o => ((MonoBehaviour)o).GetInstanceID())
                .FirstOrDefault();
    }
}
