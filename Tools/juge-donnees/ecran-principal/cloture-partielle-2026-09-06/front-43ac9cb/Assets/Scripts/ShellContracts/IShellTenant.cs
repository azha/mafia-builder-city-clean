using UnityEngine;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C1 (design D2) — le contrat que les contrôleurs d'écran existants implémentent pour
    // devenir des LOCATAIRES du shell. Le point d'injection de parent de montage
    // que l'AppShell renseigne AVANT que le locataire construise sa mise en page (Start()/BuildLayout,
    // toujours différé d'une frame après AddComponent — voir AppShell.MountTenant).
    //
    // Sans ce contrat, les contrôleurs DÉCOUVRENT leur Canvas via FindFirstObjectByType<Canvas>() et
    // étirent un fond plein écran À LA RACINE du Canvas trouvé (mesuré §1.1 du design : présent dans
    // les 9 d'origine, `Stretch(zero, one)` juste après). Monté dans un shell propriétaire du Canvas, ce
    // comportement RECOUVRE TabBar + TopBar — ni détruites ni recréées, simplement cachées derrière un
    // fond opaque (BLOCKING-3 du design). `SetMountParent` donne à chaque locataire un endroit CONFINÉ
    // où parenter sa racine à la place du Canvas découvert.
    //
    // Hors shell (tout test PlayMode existant, tout nav-bouton legacy comme
    // DashboardController.OpenCityMap) : personne n'appelle SetMountParent, le champ privé reste null,
    // et le comportement de découverte du Canvas reste EXACTEMENT celui d'aujourd'hui (C1-F3).
    //
    // AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — SECOND point d'injection : `SetToken`.
    // « Le SHELL possède la session » : AppShell acquiert SON PROPRE jeton une fois dans `Start()`
    // et le DONNE au locataire dans la MÊME fenêtre synchrone que `SetMountParent`
    // (`AppShell.MountTenant<T>`). Un locataire qui REÇOIT un jeton non-vide saute son `SignIn()`
    // (idempotent — le sien reste, il est seulement sauté) et pose son propre état d'auth comme il
    // le ferait après un signin réussi. **Repli inchangé, MÊME clause qu'au-dessus** : rien reçu
    // (chaîne vide/null — tout test PlayMode existant qui monte un tenant SEUL, hors shell) ⇒ le
    // locataire signe lui-même, comme aujourd'hui.
    public interface IShellTenant
    {
        void SetMountParent(Transform parent);
        void SetToken(string token);
    }
}
