# ㊴ Le dossier — notes d'implémentation et DÉVIATIONS (CLIENT-2, 08/10)

Design : `DESIGN.md` v5.2 (revue ⊥ APPROVED). Code : étapes 0-3 de `feat/dossier-39`. Revue de code ⊥ : 2 BLOCKING (clés i18n), corrigés.

## Déviations du design, et choix tranchés au code
- **Nommage des nœuds de `FiletsPoses`** : suffixe seulement en cas de collision (écart à « comme `Contour` », accepté par f2). Les 5 écrans à enseigne changent de rendu : le bord haut revient.
- **Clés i18n** : statut et type d'acteur par la VALEUR SERVIE (`forensic.statut.*`, `forensic.acteur.lawyer|clerk`, servies FR+EN) ; le sous-titre de l'état vide a son rôle (`forensic.enseigne.rien_a_votre_nom`), la clé `bloc.rien_a_votre_nom` étant celle du texte `.rien`. 16 clés non servies à la dette de ZeroRepli (f2 les fait servir sur `lot/mots-2026-10-08`).
- **PROPOSÉ, hors maquette** : `RefAffichee` = `ia.actor.` + 4 premiers caractères de `actorRef` ; « — » sur route en erreur ; un statut inconnu s'affiche brut, en encre atténuée ; la liste des acteurs est rognée (`RectMask2D`), non défilante.
- **Rendu approché (classe C, à consigner au juge)** : silhouette rastérisée (tête, demi-ellipse d'épaules, chevron/porte close) au lieu du SVG ; marque sombre en `hudGaugeFaceOuter` (#0a0e16, d 2,24 de #0b1016) ; `text-shadow` des compteurs et `border-radius:1px` des crans non rendus ; interlettrage des compteurs (`.06em`) non appliqué.
- **Opacité du « parti »** : `opacity:.45` de la maquette (sRGB) rendu par un alpha uGUI de **0,2** (Unity compose en linéaire ; 0,45 rendait (179, 63, 55) au lieu de (122, 49, 43), mesuré au créneau du 08/10). uGUI module chaque graphique, la maquette compose le GROUPE : le fond de la ligne se mêle à celui de la boîte (≤ 3/255).
- **Dernier cran** : `CouleurPour(Franchi)` passe de `accentWarning` à `accentDanger` (cadre 132 : mot, quatre crans et bord en #ff5a4d).
- **Gardes** : `ScreenB7D1-D7` (structure, bascule, vide, erreurs, zéro requête avec compteur mis à l'épreuve, calcul, source) et `ScreenB7P1` (pixels sur banc : crans, bord de la porte, or, encre de la note et du « — », ligne « parti » à 45 %). Jamais jouées avant le créneau.
