using System.Linq;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    // nav-hud-design-v1.md §6.1/§6.2 (chunk 5) — direction INVERSE d'`IShellTenant` (voir ce
    // fichier) : ici c'est un TENANT (DashboardController) qui appelle DANS le shell, jamais
    // l'inverse. `CityMap`/`Operational` ne référencent PAS l'assembly `Shell` (Shell dépend d'EUX —
    // une référence directe depuis un tenant créerait un cycle, qu'asmdef refuse). `ShellContracts`
    // est la frontière établie pour ce problème côté `IShellTenant` — ce fichier vit au même
    // endroit, pour la même raison, dans l'autre sens.
    //
    // AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — `AdoptToken` QUITTE ce contrat. « Le SHELL
    // possède la session » : la direction locataire→shell pour le JETON meurt (c'était la course —
    // §1.1 : deux comptes démo qui se disputaient le TopBar). Le shell acquiert désormais SON PROPRE
    // jeton une fois (`AppShell.Start()`) et le DONNE aux locataires via `IShellTenant.SetToken`
    // (sens shell→tenant). Seul `PublishCitywideHeat` (tenant→shell, §6.2) survit ici : Dashboard
    // publie la valeur qu'il vient de sonder lui-même (REUSE, pas un 3e appelant) ; ce sens-là n'a
    // jamais porté la course sur l'IDENTITÉ, seulement sur une DONNÉE affichée.
    public interface IShellSessionSink
    {
        void PublishCitywideHeat(string citywideBucket);
    }

    // I2 (hud-session-arbitrages-design.md §3) — DÉDUPLIQUÉ : `DashboardController.cs` et
    // `CityMapController.cs` portaient chacun une copie OCTET POUR OCTET (md5 identique mesuré) de
    // ce localisateur. Sa place est ici, contre `IShellSessionSink` dont l'interface documente déjà
    // la raison (contrainte générique Unity `T : UnityEngine.Object`, qu'une interface ne satisfait
    // jamais — `FindFirstObjectByType<IShellSessionSink>()` ne compilerait même pas comme on le
    // voudrait). Sous B1, `CityMapController` n'a plus AUCUN appelant pour ce localisateur (il ne
    // publie pas de heat) — sa copie est retirée FRANCHEMENT (I2, branche 2) plutôt que laissée
    // orpheline ; `DashboardController` garde SON appel unique (`PublishCitywideHeat`), donc CE
    // localisateur reste sur un chemin emprunté (I2, branche 1) — jamais un garde-fou sans
    // consommateur.
    public static class ShellSessionSinkLocator
    {
        public static IShellSessionSink Find()
        {
            return Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IShellSessionSink>().FirstOrDefault();
        }
    }
}
