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

## Créneau du 08/10 (client-2, porte rendue) — VERT
Filtre en 13 noms nus (DecorDeScene, ScreenB7, BundleReel, Replis, Palette, EcranFiliere, ScreenC1, ScreenC2, ScreenC6, ChassisVente, GestesDeVente, VenteRamassage, HorizonAuMontage), rebase sur le cumul 955f7e1d. Trois runs : **103/105** (D6b rouge SUR LE CUMUL — ㉛ Loi branchée par CLIENT-1 mais restée en attente — et une mesure d'encre trop stricte) → **104/105** (l'opacité 0,45 du « parti » recopiée rendait (179, 63, 55) au lieu de (122, 49, 43) : Unity compose en linéaire) → **105/105, VERDICT 0**, déclarés = comptés = 105, 13 catégories exécutées. Le rejeu des 5 écrans à enseigne (Filière, Journal, Vente, Horizon ; Forensic en ScreenB7) est dans ces 105.
Non faits (hors mandat de cette session) : les deux juges ⊥ (visuel puis données) de la fin d'écran — à f2.

## Juge-données de ㊴ (08/10) — suites
- **D2, le panneau « Pas de réponse »** (`CE QU'ON SAIT VRAIMENT`, route en erreur) n'a pas de maquette : RATIFIÉ par f2 comme repli réseau ASSUMÉ (ni le zéro ni « tout va bien » : « on ne sait pas »).
- **D3, le dénominateur `00/1` au lieu de `00/3`** : en dette, TD-883 (`Tools/juge-donnees/dettes-client2.md`).
- **A2, les deux pistes « constantes »** : les deux bandes sont SERVIES puis jetées par `DossierCalculs.PistesConstantes` ; mesure lue et ce qui n'est pas mesuré écrits en commentaire à la place de la liste muette (`ForensicScreenController.cs`). D1 (des candidats refusés comptés comme acteurs) : défaut BACK, f2.

