# Dettes du design de mouvement (revue ⊥ n°4, 08/10/2026) — des détails, pas des trous

Rien ici ne rend le code faux ; à fermer au fil de E1-E3.

1. `UiTimingTunables.AppuiLongDeplacementMs` n'existe pas encore : à créer (Q12) et à signaler dans l'en-tête du fichier (« 4 identifiants `T.ui.*` »). *Dit dans le design v4.1 ; reste le geste.*
2. `AppuiLong.Duree` n'a aucun appelant externe (mesuré) : le « recensement » est vide. *Corrigé dans le texte.*
3. Citation du canon l.125 (le TAP du joueur, pas une transition contre une autre) — recalée dans le texte.
4. G12 vs règle de remplacement : critère à écrire dans le test — un occupant issu de `Transitionner` est REMPLACÉ ; un occupant issu d'`Attacher` fait REFUSER un second `Absolu`.
5. Table de repère : `EchelleX`/`EchelleY` nommés — corrigé dans le texte.
6. Les 7 transitions (B5…B11) ne sont jamais ÉCHANTILLONNÉES (pas seulement B8) ; `recenser-transitions.cjs` ne capture ni l'`ease-in-out` ni l'angle de l'inline. `Aisance` de B10/B11 n'a pas d'oracle ; à régler quand E3 les code (lire l'easing dans le CSS source).
7. §5(ii) : « ne se gèle pas » — le canon dit que l'animation est COUPÉE au profit d'un indicateur statique + compteur textuel ; le comportement normatif est juste ; préciser que le compteur textuel est rendu par le contrôleur, pas par la régie.
8. Après suppression du type `AmbientPulseLoop` : 4 commentaires le nomment encore (`DistrictInteriorScreenController.cs:52`, tests `:19`, `:197`, `:201`) — à nettoyer dans le lot E2.
9. « ShellContracts utilise déjà uGUI (8 fichiers) » = 7 + `LongPressButton` (EventSystems) ; la conclusion tient.
10. G5 : « 3 extrema/s » (≠ période 0,4 s) — corrigé dans le design et le catalogue.
