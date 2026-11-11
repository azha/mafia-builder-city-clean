# Planches de l'Accueil — AVANT / APRÈS, lot « retour d'appui v5 » (11/11/2026)

**But** : juger les DEUX changements visibles de l'Accueil — (a) la ligne TRANCHER (`flexibleHeight = 1` : le bouton faisait 257×0, il épouse la hauteur de la rangée) ; (b) l'Accueil sans le Pied de la carte (`MasquerLePiedALAccueil`) — et comparer l'APRÈS à la MAQUETTE (`ecrans-brennar-accueil.html` @ atelier `8f59cf94`).

## Méthode (acceptée par f2)
- **APRÈS** = tête `735b889f` telle quelle. **AVANT** = `735b889f` MOINS exactement deux lignes (la ligne `btnLe.flexibleHeight = 1f` de `ExceptionQueuePanelController`, l'appel `MasquerLePiedALAccueil()` d'`AppShell`), retirées le temps de la capture ; les deux fichiers sont remis par `git checkout`, `git diff` vide (0 octet) relevé après.
- ⚠ **HYPOTHÈSE, non prouvée par ces planches** : le reste du diff `0b24be49..735b889f` dans `Assets/Scripts` (câblage du retour d'appui, coutures de test) ne change rien au repos de l'Accueil. Elle n'est pas couverte par le diff AVANT/APRÈS (qui ne prouve que les deux changements) : elle l'est par la comparaison APRÈS ↔ maquette du juge.
- Banc : `Assets/Tests/PlayMode/AccueilPlanchesRetourAppuiPlayModeTests.cs` (le VRAI shell, session fixe, régie figée à t = 0, 2 photos par cadrage, 2 résolutions 1080×1920 et 1080×2400). Se joue par son nom avec `PLANCHES_DIR`.
- Outil : `diff-planches.py avant apres diff` (seuil 3/255, plus grand canal ; contrôle positif intégré : 1 px à +10 ⇒ 1 vu, 1 px à +2 ⇒ 0 vu ; code de sortie 3 s'il est faux). Rapport : `diff/rapport-diff.md`.

## États montés (cadres ④ de la maquette)
| planche | cadre maquette | donnée |
|---|---|---|
| c1-rien-a-trancher | 1 « rien à trancher » | session sans carte, file vide, pas de suite |
| c2-une-carte-de-tete | 2 « une carte de tête » | carte `DAMAGED_BUILDING_REPAIR`, modérée / faible |
| c3-des-rapports-a-lire | 3 « des rapports à lire » | carte `AUTONOMY_REPORTS_PENDING` |
| c4-la-file-sous-pression | 4 « la file sous pression » | 4 cartes en file, pas de carte de tête |
| c5-joueur-neuf-la-suite | 5 « un joueur neuf : la suite » | La suite (palier 1), file vide |
| c6-carte-de-tete-au-dessus-de-la-file | 6 « carte de tête au-dessus d'une file haute » | carte + 4 cartes en file |
**Non montés** : cadre 7 (l'après-geste de la carte tranchée) et cadre 8 (l'échec de la 1re cible) : ils demandent un geste.

## Résultat (pixels)
- **12 cadrages (6 états × 2 résolutions) : 0 pixel différent entre AVANT et APRÈS** (seuil 3/255), sur la photo 1 ET sur la photo 2 (vérifié séparément pour les 3 cadrages instables).
- Les deux changements sont donc **sans effet visible au repos** : TRANCHER reste centré dans sa rangée (le mot ne bouge pas), et le Pied de la carte n'était pas visible à l'Accueil (sous la plaque de la file ; absent aussi de c1, où il n'y a pas de plaque : voir `avant/c1-rien-a-trancher-1080x1920-1.png`).
- **Stabilité de paire** (diff -1/-2 d'un même run) : 0 px sur 9 cadrages ; **non nulle sur 3 cadrages à 1080×1920** (c2 : 936 px, c3 : 1 063, c6 : 1 019), **identique dans les deux arbres** (même compte, même boîte : une bande de texte de 13 px de haut, x 418-662, y ≈ 1421-1550, dans la carte de tête ; absente à 1080×2400). Lecture : le texte de la carte de tête n'a pas fini de se composer à la 1re photo. Le diff AVANT/APRÈS de ces trois cadrages est néanmoins 0 sur la photo 1 comme sur la photo 2.
- Limite : aucun contrôle positif AU NIVEAU DU BANC (on n'a pas provoqué un changement visuel réel pour vérifier que le banc le voit) ; le contrôle positif exigé est celui de l'outil.
