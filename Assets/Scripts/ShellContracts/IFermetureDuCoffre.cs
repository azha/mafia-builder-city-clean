using System.Linq;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>⑲ « Fermer le coffre » (23/09, décision f2) — le contrat par lequel un écran dit au SHELL que la session vient d'être
    /// RÉVOQUÉE (`POST /v1/auth/signout` a répondu `signed_out: true`). ⑲ vit dans `Account`, que `Shell` référence : l'écran ne peut
    /// pas voir `AppShell` sans cycle — d'où ce contrat, dans l'assembly que les deux voient (patron de `IOuvreurDeFicheOperationnelle`).
    /// Le shell démonte ses locataires, n'émet PLUS aucun appel authentifié, et n'offre qu'un geste : « Rouvrir le coffre », qui rejoue
    /// le chemin du lancement tel quel.</summary>
    public interface IFermetureDuCoffre
    {
        /// <summary>La session courante est révoquée : le shell ferme le coffre.</summary>
        void CoffreFerme();
    }

    /// <summary>Le shell de la scène, s'il y en a un (un écran monté seul, dans un test, n'en a pas). Même patron que
    /// `OuvreurDeFicheOperationnelleLocator` : le premier par identifiant d'instance, jamais « le premier venu ».</summary>
    public static class FermetureDuCoffreLocator
    {
        public static IFermetureDuCoffre Find() =>
            Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IFermetureDuCoffre>()
                .OrderBy(o => ((MonoBehaviour)o).GetInstanceID())
                .FirstOrDefault();
    }
}
