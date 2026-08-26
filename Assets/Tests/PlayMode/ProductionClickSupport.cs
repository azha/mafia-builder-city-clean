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
    // écrit demain ; ceci ferme LA CLASSE DES DEUX GARDES DE `Button.Press()`
    // (`IsActive()`/`IsInteractable()`), pas seulement la population du jour QUI LES ARME.
    //
    // ⛔⛔ CORRIGÉ round 5 (revue ⊥, MAJEUR 1) — cette affirmation, lue sans la borne ci-dessus,
    // se lisait « ferme LA CLASSE [de l'atteignabilité au clic] » — FAUX, mesuré sur DEUX
    // mécanismes distincts, chacun `Charpente` 19/0 (donc INVISIBLES à ce helper ET à toutes les
    // gardes qui l'utilisent) : `img.raycastTarget = false` sur l'`Image` posée par
    // `AppShell.AddTabButton` (`AppShell.cs:861-863` — l'UNIQUE surface de test de collision du
    // dock : les 4 autres enfants de chaque bulle sont DÉJÀ `raycastTarget = false`) et
    // `CanvasGroup.blocksRaycasts = false` sur `TabBarRoot`. Bypass volontaire du RAYCAST
    // (ci-dessous) : `ExecuteEvents.Execute` route DIRECTEMENT sur `bouton.gameObject`, sans
    // jamais consulter un `GraphicRaycaster` — donc ni `raycastTarget` ni `CanvasGroup.
    // blocksRaycasts` ne sont dans le chemin que CE helper emprunte. Un bouton rendu INATTEIGNABLE
    // AU DOIGT par l'un ou l'autre reste `IsActive()`/`IsInteractable()` VRAI, et ce helper clique
    // dessus quand même. ⇒ CE FICHIER FERME UNE MOITIÉ DE LA CLASSE (l'état d'activation du
    // `Selectable`), PAS L'AUTRE (le hit-testing) — la seconde moitié est fermée par une garde
    // SÉPARÉE, `CharpenteMontageLocatairesPlayModeTests.F0_2c_...` (un `GraphicRaycaster.Raycast`
    // RÉEL au centre de chaque bulle), PAS par ce helper : `ExecuteEvents.Execute` ne PEUT pas
    // couvrir le raycast tout en restant fidèle à l'idiome « trouver le bouton par nom, jamais par
    // une position d'écran » (ci-dessous) — les deux couvertures sont structurellement disjointes.
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
        /// <summary>Le geste de production : un clic RÉEL sur `bouton`, PAR `Button.Press()`
        /// (round 5, MINEUR 2 — corrigé : « par l'EventSystem » était rhétorique. `ExecuteEvents`
        /// est un dispatcher STATIQUE ; `EventSystem.current` ne remplit qu'un champ du
        /// `PointerEventData` ci-dessous. Ce qui est réellement gagné, et c'est réel, c'est le
        /// passage PAR le composant `Button` — donc par `Selectable.IsActive()`/`IsInteractable()`
        /// — plutôt que par sa `UnityEvent` nue). Honore ces deux gardes : un bouton mort au clic
        /// ne déclenche RIEN ici, exactement comme au doigt d'un joueur — l'appelant doit alors
        /// observer l'ABSENCE d'effet (le mounted type qui ne change pas, l'écran qui ne monte
        /// pas), jamais supposer que l'appel a réussi. NE COUVRE PAS le hit-testing (raycastTarget /
        /// CanvasGroup.blocksRaycasts — § MAJEUR 1 ci-dessus) : cette moitié se prouve par
        /// `F0_2c_...` (`GraphicRaycaster.Raycast` réel), jamais par ce helper.</summary>
        public static bool Click(Button bouton)
        {
            Assert.IsNotNull(bouton, "ProductionClickSupport.Click : bouton null — le site d'appel doit vérifier " +
                "l'existence du bouton AVANT d'appeler ce helper.");
            Assert.IsNotNull(EventSystem.current,
                "ProductionClickSupport.Click : aucun EventSystem.current — AppShell.EnsureEventSystem() " +
                "doit avoir tourné avant qu'un clic de production puisse être simulé (charge la scène de " +
                "démarrage du build et laisse le shell s'initialiser d'abord).");
            // round 5 (revue ⊥, MINEUR 1) — `position`/`pressPosition`/`clickCount` restent à leur
            // défaut (`Vector2.zero`/0) : `ExecuteEvents.Execute` route directement sur
            // `bouton.gameObject`, aucun handler de ce dépôt ne lit ces champs aujourd'hui (0
            // consommateur mesuré dans `Assets/Scripts`, round 5). À consigner pour le jour où ce
            // helper sert un handler qui les lit (un geste de carte, par ex.) — ce jour-là, les
            // poser explicitement plutôt que les laisser au défaut silencieux.
            var donnees = new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
            // round 5 (revue ⊥, MINEUR 1) — `ExecuteEvents.Execute` REND un booléen (trouvé/appelé
            // un `IPointerClickHandler` sur `bouton.gameObject` ou ses parents) que round 4
            // jetait silencieusement. Il NE PROUVE PAS que `Button.Press()` a réellement flippé un
            // état (`IsActive()`/`IsInteractable()` peuvent encore avoir fait un retour anticipé) —
            // mais il distingue « aucun handler collecté » (bouton mal formé, composant absent) de
            // « un handler a été appelé ». Exploité ici plutôt que jeté.
            bool handlerAtteint = ExecuteEvents.Execute(bouton.gameObject, donnees, ExecuteEvents.pointerClickHandler);
            Assert.IsTrue(handlerAtteint,
                $"ProductionClickSupport.Click({bouton.gameObject.name}) : ExecuteEvents.Execute n'a " +
                "trouvé AUCUN IPointerClickHandler sur ce GameObject ni ses parents — un clic qui " +
                "n'atteint aucun handler est SILENCIEUX si on ne vérifie pas ce booléen (round 5, " +
                "MINEUR 1). Ceci ne prouve PAS que Button.Press() a produit un effet — seulement " +
                "qu'un handler existe et a été invoqué ; l'ABSENCE d'effet (IsActive()/" +
                "IsInteractable() faux) reste au site d'appel de l'observer.");
            return handlerAtteint;
        }
    }
}
