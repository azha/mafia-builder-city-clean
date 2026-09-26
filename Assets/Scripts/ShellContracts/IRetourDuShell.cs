using System.Linq;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>« Revenir » PAR LE SHELL, depuis un écran qui dessine son propre retour (G3, passe UX : le « ‹ » de l'en-tête Famille
    /// était décoratif). La flèche du bandeau est retirée (ARBITRAGES-user-2026-09-07 §C.14) : un retour dessiné par un écran fait le
    /// MÊME geste que le retour du système, `AppShell.Depiler`. Contrat dans `ShellContracts` (les écrans ne voient pas `AppShell`
    /// sans cycle) — patron d'`IEntreeDeDistrict`.</summary>
    public interface IRetourDuShell
    {
        /// <summary>Dépile UN niveau ; rend ce qui a été dépilé, ou `racine` sur la carte (rien n'est fait).</summary>
        string Depiler();
    }

    /// <summary>Même localisateur par balayage qu'`EntreeDeDistrictLocator` : plusieurs vivants ⇒ le plus petit `GetInstanceID()`.</summary>
    public static class RetourDuShellLocator
    {
        public static IRetourDuShell Find() =>
            Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IRetourDuShell>()
                .OrderBy(o => ((MonoBehaviour)o).GetInstanceID())
                .FirstOrDefault();
    }
}
