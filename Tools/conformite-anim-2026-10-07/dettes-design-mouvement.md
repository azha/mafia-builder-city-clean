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

## Interprétations faites par le code E1 (08/10) — à ratifier au prochain passage du design

Le design ne tranchait pas ces points ; E1 a choisi, les tests épinglent le choix. Aucune ne contredit le texte.

11. **Fin de piste** : une piste finie TIENT sa valeur finale (`quandFini` une fois, après l'écriture) — **sauf** si la valeur finale de chaque canal égale la base du propriétaire (identité, `Melange`/`Hue` 0, ou la valeur `Absolu` qu'il a posée), auquel cas elle est **libérée** (ajout de CLIENT-3 à la relecture : sans lui, 16 transitions d'écran jamais détachées remplissaient le quota non-`Ambiance`). Les virages du chrome tiennent (le propriétaire n'écrit plus leur couleur). Test : `Fin_PisteQuiRejointLaBase_EstLiberee_SinonElleTient`, avec mutation vérifiée.
12. **`Reglage.PhaseS`** suit `animation-delay` : positif = retard (la première clé est tenue), négatif = avance.
13. **`Transitionner`** : un seul canal `Absolu`, ses clés sont une courbe de progrès 0 → 1 ; valeur = `de + (vers − de) × courbe`.
14. **Gel d'un `Retour`** : sans `PoseDeReposS` déclarée, figé au repos (« sans échelle »), pas sauté à sa fin. Le voile `Alpha` est gardé sous `Reduit` parce qu'il ne déclare pas de pose ; `carnet.en-main` en déclare une et gèle. ⚠️ Règle IMPLICITE : E2 la rendra explicite (un drapeau ou l'`Id` `retour.appui-voile`), §17 bornant l'exception au voile.
15. **`Reglage.Dx` et `Chute`** portés, non appliqués (aucun usage en E1 ; `bascule.course` en aura besoin en E2/E4).
16. **API ajoutée** au §3 : `Regie.Admettre(Entree)` (entrées synthétiques des tests), `EstVivant`, `Delestage`, `Evaluations`, `Ecritures`, `RegieMouvement.PoserPolitique`.
17. **Chrome sous `Reduit`** : le pouls est figé à son creux (α 0,45, pose 0,55 s) pendant une descente : cerclage sombre et immobile. **Question DA à f2.**
18. **Design §1** : « à p = 0,125, 0,914 pour 0,775 » se lit `SmoothStep` 0,914 contre `ease` 0,7753 (oracle 0,775319) ; les tests exigent 0,7753.
19. **`.meta`** des 17 fichiers et du dossier `Mouvements/` créés à la main (format minimal du dépôt, GUID neufs) pour qu'aucun arbre n'en génère d'autres à l'import.
