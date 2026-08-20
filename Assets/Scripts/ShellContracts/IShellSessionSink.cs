namespace MafiaCleanCity.Shell
{
    // nav-hud-design-v1.md §6.1 (chunk 5, HUD v3.1) — LE MAILLON, direction INVERSE d'IShellTenant
    // (voir ce fichier) : ici c'est un TENANT (DashboardController, CityMapController) qui appelle
    // DANS le shell, jamais l'inverse. `CityMap`/`Operational` ne référencent PAS l'assembly `Shell`
    // (Shell dépend d'EUX — un `using MafiaCleanCity.Shell.AppShell` direct depuis un tenant créerait
    // une référence d'assembly CIRCULAIRE, que asmdef refuse). `ShellContracts` est déjà la frontière
    // établie pour EXACTEMENT ce problème côté `IShellTenant` — ce fichier vit au même endroit, pour
    // la même raison, dans l'autre sens.
    //
    // `AppShell` implémente ce contrat. Un tenant le trouve via
    // `FindObjectsByType<MonoBehaviour>(...).OfType<IShellSessionSink>().FirstOrDefault()` — jamais
    // `FindFirstObjectByType<IShellSessionSink>()` : l'API Unity contraint son paramètre générique à
    // `UnityEngine.Object`, qu'une interface ne satisfait jamais (mesuré : `GetGenericParameterConstraints()`
    // rend `UnityEngine.Object`). Hors shell (tout test PlayMode existant qui monte un tenant seul) :
    // la recherche ne trouve rien, `sink` est `null`, no-op — comportement identique à avant ce chunk
    // (même idiome que `SetMountParent` resté sans appelant hors shell, `IShellTenant.cs`).
    public interface IShellSessionSink
    {
        void AdoptToken(string token);
        void PublishCitywideHeat(string citywideBucket);
    }
}
