# Réserve ajoutée au dossier r15 pendant le tour (2026-09-07 06:00) — `SnapToScreenPixel`

`SnapToScreenPixel` arrondit des positions MONDE et, pendant la capture (1 unité monde = 192 px), quantifie sur 192 px ce qu'il touche.
Il est appelé par les cellules de district et `DistrictMapNavigation`. **Si l'écran de réputation ne l'appelle pas, ce tour est sain.**
Question ouverte posée au juge en cours (addendum demandé à la fin de son rapport) : voit-il des positions suspectement rondes ou
régulières (pas commun, résidu) ? Ce n'est pas une invalidation ; c'est une réserve à porter dans « non vérifié » jusqu'à la réponse
du code (la mesure hors image qui tranche : la liste des appelants de `SnapToScreenPixel`).
