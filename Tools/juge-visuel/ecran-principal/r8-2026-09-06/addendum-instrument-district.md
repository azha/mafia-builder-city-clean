# Addendum ① r8 — les positions de la vue district sont déformées par l'instrument (f2, 2026-09-07 ~07:30)

`SnapToScreenPixel` (`DistrictInteriorScreenController.cs:2190`) arrondit la position MONDE. En ScreenSpaceOverlay
1 unité ≈ 1 px (inoffensif) ; pendant la capture (ScreenSpaceCamera) 1 unité = 192 px ⇒ cellules, badges, libellés de type,
glyphes et marqueurs de lieutenant sont quantifiés sur 192 px — jusqu'à ±96 px de leur bâtiment. Amplitude mesurée en x par
le correcteur : médiane 37 px, max 72 ; le modèle en y est réfuté (borne en x seulement). Portée : DISTRICT seulement (0 arrondi
dans le Shell ni ㊲).

⇒ **Suspendus, ni ouverts ni fermés, jusqu'au correctif + recapture** : tout finding de POSITION de r3→r8 sur la vue district
(« Planque sur le trottoir », « Serre sur un toit vide », les 4 badges hors cadre, la grille résiduelle 0,0 déjà signalée comme
signature d'instrument dans `question-badges-2026-09-07/addendum-artefact-de-capture.md`). Les juges ont mesuré exactement
ce que l'image montrait ; c'est l'image qui était déplacée. Les 51 ancres de la scène (blender) et ces mesures ne se
contredisent plus : deux mondes.

**Tient toujours sur ①** : ce qui n'est pas une position 2D snappée — masses 3D et densité (elles contournent le snap, cf.
`question-densite-2026-09-07`), chrome, HUD, cadran, dock, couleurs, typographie.

**Règle retenue (doctrine)** : *l'instrument de capture peut déformer ce qu'il mesure* ; des positions rondes/régulières sur une
planche sont d'abord un soupçon sur la chaîne, pas sur l'écran — et un juge qui écrit « je ne peux pas trancher le mécanisme
depuis l'image » désigne l'endroit où sortir du pixel.
