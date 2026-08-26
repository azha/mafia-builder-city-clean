using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace MafiaCleanCity.Tests
{
    // ROUND 4 (revue ⊥ des items 0.2/0.3/0.3-bis, BLOQUANT — Tools/charpente-item0-2-3-
    // implementation-notes.md § BLOQUANT round 4) — `Button.onClick.Invoke()` N'EST PAS le geste
    // de production. Un joueur clique via l'EventSystem : `IPointerClickHandler.OnPointerClick`
    // → `Button.Press()`, dont la PREMIÈRE ligne est
    // `if (!IsActive() || !IsInteractable()) return;`. `UnityEvent.Invoke()` appelle directement
    // la liste de listeners de `onClick` — il court-circuite les DEUX gardes.
    //
    // Mesuré par la revue (armé sur UNE bulle du dock, `b.interactable = false` dans
    // `AppShell.AddTabButton`) : la garde `F0_2b_...` de round 3 restait VERTE — le dock
    // « fonctionnait » pour un doigt qui ne pouvait pas réellement le toucher, exactement la
    // propriété dont ce lot est la raison d'être (l'atteignabilité PAR UN GESTE DE JOUEUR).
    //
    // Fermeture STRUCTURELLE, choisie sciemment plutôt que deux assertions ajoutées à côté de
    // chaque site de clic (`Assert.IsTrue(bouton.interactable)` + `Assert.IsTrue(bouton.
    // gameObject.activeInHierarchy)` avant chaque `.onClick.Invoke()`) : `ExecuteEvents.Execute`
    // invoque `IPointerClickHandler.OnPointerClick`, qui appelle `Button.Press()` — et
    // `Press()` PORTE DÉJÀ les deux gardes, pour TOUT `Button`, sans qu'aucun site d'appel n'ait
    // à s'en souvenir. Une paire d'assertions ajoutée à côté aurait fermé les 7 sites CONNUS
    // aujourd'hui (balayage round 4, `Assets/Tests`) et laissé la même faute possible au 8ᵉ site
    // écrit demain ; ceci ferme la CLASSE, pas seulement la population du jour.
    //
    // Bypass volontaire du RAYCAST (pas de coordonnées d'écran, pas de `GraphicRaycaster`) —
    // cohérent avec l'idiome DÉJÀ établi ici : chaque site trouve SON bouton par nom
    // (`Find`/`GetComponentInChildren`), jamais par une position d'écran. Ce que ce helper change,
    // c'est le passage PAR le composant `Button` (donc par `Selectable.IsActive()`/
    // `IsInteractable()`), plutôt que par sa `UnityEvent` nue.
    //
    // `Selectable.IsActive()` = `isActiveAndEnabled` : couvre `SetActive(false)` sur la bulle ELLE-
    // MÊME **ou sur un de ses parents**, et le composant `enabled == false`.
    // `Selectable.IsInteractable()` = `.interactable` ET toute chaîne de `CanvasGroup` bloquante
    // au-dessus — un cran plus large que le simple booléen que la revue a armé pour mesurer.
    public static class ProductionClickSupport
    {
        /// <summary>Le geste de production : un clic RÉEL sur `bouton`, par l'EventSystem
        /// (`AppShell.EnsureEventSystem()` en pose un dès le premier `Start()` du shell — voir
        /// `AppShell.cs`). Honore `IsActive()`/`IsInteractable()` : un bouton mort au clic ne
        /// déclenche RIEN ici, exactement comme au doigt d'un joueur — l'appelant doit alors
        /// observer l'ABSENCE d'effet (le mounted type qui ne change pas, l'écran qui ne monte
        /// pas), jamais supposer que l'appel a réussi.</summary>
        public static void Click(Button bouton)
        {
            Assert.IsNotNull(bouton, "ProductionClickSupport.Click : bouton null — le site d'appel doit vérifier " +
                "l'existence du bouton AVANT d'appeler ce helper.");
            Assert.IsNotNull(EventSystem.current,
                "ProductionClickSupport.Click : aucun EventSystem.current — AppShell.EnsureEventSystem() " +
                "doit avoir tourné avant qu'un clic de production puisse être simulé (charge la scène de " +
                "démarrage du build et laisse le shell s'initialiser d'abord).");
            var donnees = new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
            ExecuteEvents.Execute(bouton.gameObject, donnees, ExecuteEvents.pointerClickHandler);
        }
    }
}
