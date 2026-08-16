using UnityEngine;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C1 (design D2) — le contrat que les 9 contrôleurs d'écran existants implémentent pour
    // devenir des LOCATAIRES du shell. Un seul membre : le point d'injection de parent de montage
    // que l'AppShell renseigne AVANT que le locataire construise sa mise en page (Start()/BuildLayout,
    // toujours différé d'une frame après AddComponent — voir AppShell.MountTenant).
    //
    // Sans ce contrat, les 9 contrôleurs DÉCOUVRENT leur Canvas via FindFirstObjectByType<Canvas>() et
    // étirent un fond plein écran À LA RACINE du Canvas trouvé (mesuré §1.1 du design : présent dans
    // les 9, `Stretch(zero, one)` juste après). Monté dans un shell propriétaire du Canvas, ce
    // comportement RECOUVRE TabBar + TopBar — ni détruites ni recréées, simplement cachées derrière un
    // fond opaque (BLOCKING-3 du design). `SetMountParent` donne à chaque locataire un endroit CONFINÉ
    // où parenter sa racine à la place du Canvas découvert.
    //
    // Hors shell (tout test PlayMode existant, tout nav-bouton legacy comme
    // DashboardController.OpenCityMap) : personne n'appelle SetMountParent, le champ privé reste null,
    // et le comportement de découverte du Canvas reste EXACTEMENT celui d'aujourd'hui (C1-F3).
    public interface IShellTenant
    {
        void SetMountParent(Transform parent);
    }
}
