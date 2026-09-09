using System.Linq;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    // Item 0.4 de `front.md` (Tools/charpente-item0-4-design.md §2.1) — direction INVERSE
    // d'`IShellTenant` (voir ce fichier), MÊME raison qu'`IShellSessionSink` : ici c'est un TENANT
    // (`DashboardController.OpenNav`, `ExceptionQueueController.OpenDetail`) qui appelle DANS le
    // shell, jamais l'inverse. `CityMap`/`Operational` ne référencent PAS l'assembly `Shell`
    // (asmdef refuse le cycle qu'une référence directe créerait) — `ShellContracts` est la
    // frontière déjà établie pour ce problème ; ce fichier y ajoute un SECOND contrat, sur le même
    // idiome (interface + localisateur statique par balayage), pour le même sens de dépendance.
    // Aucun mécanisme neuf : design §1.5.
    //
    // Mesuré (design §1.1-§1.3) : sans ce contrat, les deux sites d'appel créaient une racine de
    // scène (`new GameObject($"Nav_{target}")`), jamais parentée sous `ContentSlot` — le locataire
    // qu'elle porte DÉCOUVRE alors le Canvas (`IShellTenant.cs`) et étire un fond plein écran qui
    // RECOUVRE TabBar + TopBar. `MonterLocataireEnSurimpression<T>` donne à ces deux sites le même
    // point de montage confiné que `AppShell.MountTenant<T>`/`EnterDistrict` utilisent déjà.
    public interface IShellNavigator
    {
        /// <summary>Monte `T` comme locataire du shell, EN SURIMPRESSION (design §2.1 : ce n'est
        /// pas de la décoration, c'est la sémantique EXACTE d'aujourd'hui — l'appelant ouvre un
        /// écran par-dessus le locataire courant SANS le détruire, ex. le détail d'exception qui
        /// recouvre sa file pour pouvoir la rappeler au retour). Hôte confiné dans `ContentSlot`,
        /// insets du chrome publiés, `SetMountParent` + `SetToken` donnés dans la fenêtre
        /// SYNCHRONE — mêmes 4 gestes que tout autre montage de locataire, rien de plus. Ne touche
        /// PAS `MountedTenantGameObject`/`MountedTenantType` (ces champs désignent l'écran de
        /// l'ONGLET courant, pas un écran ouvert en surimpression). Rend le composant monté, pour
        /// que l'appelant l'initialise AVANT son `Start()` (différé d'une frame après
        /// `AddComponent`).</summary>
        T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant;
    }

    // Même corps que `ShellSessionSinkLocator.Find()` (`IShellSessionSink.cs`) — un localisateur
    // par balayage n'a aucun état à désynchroniser : il suffit qu'`AppShell` implémente
    // `IShellNavigator` pour qu'un appelant le trouve, sans registre à tenir.
    public static class ShellNavigatorLocator
    {
        /// <summary>Revue ⊥ round 2 (C4) — `FirstOrDefault()` sur `FindObjectsSortMode.None` rendait
        /// un objet d'ORDRE NON SPÉCIFIÉ dès que plusieurs `IShellNavigator` sont vivants. Mesuré :
        /// la situation existe (`AppShellPlayModeTests.cs:237-256` garde deux `AppShell` vivants
        /// simultanément ; le `SetUp` des fixtures Charpente imprime des résidus détruits dans les
        /// runs réels). Le précédent invoqué au design (`ShellSessionSinkLocator`) ne transporte
        /// qu'une chaîne — une mauvaise pioche est inoffensive. Celui-ci transporte le MONTAGE D'UN
        /// ÉCRAN ENTIER dans le `ContentSlot` du shell trouvé : une mauvaise pioche parente l'écran
        /// sous un shell ÉTRANGER, potentiellement invisible au joueur. ⇒ Bruyant plutôt
        /// qu'arbitraire : l'ambiguïté est signalée (compte inclus), puis résolue par un ordre
        /// STABLE (le plus petit `GetInstanceID()` — un entier posé par Unity à la création de
        /// l'objet, indépendant de l'ordre de découverte de `FindObjectsByType`).</summary>
        public static IShellNavigator Find()
        {
            var vivants = Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IShellNavigator>().ToList();
            if (vivants.Count > 1)
            {
                Debug.LogError($"[ShellNavigatorLocator] {vivants.Count} IShellNavigator vivants simultanément — " +
                    "un montage ici pourrait entrer dans le ContentSlot d'un shell ÉTRANGER au lieu de celui " +
                    "attendu (un locataire entier, pas une simple chaîne — cf. ShellSessionSinkLocator). Choix " +
                    "déterministe : le plus petit GetInstanceID() (ordre STABLE, indépendant de l'ordre de " +
                    "découverte de FindObjectsByType, FindObjectsSortMode.None).");
            }
            return vivants.OrderBy(n => ((MonoBehaviour)n).GetInstanceID()).FirstOrDefault();
        }
    }
}
