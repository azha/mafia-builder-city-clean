# Juge visuel ⊥ — ㉙ Le conflit — r5 — 2026-09-23

## Verdict : APPROUVÉ

Le cœur de l'écran se lit comme la maquette et ne présente ni BLOQUANT ni MAJEUR ; les écarts restants sont locaux, le dock hors maquette ne perturbe pas la tâche, et le scroll 1920 rend bien toute l'action accessible.

## Contrôle positif — ce que l'instrument trouve ÉGAL

Tolérances appliquées : position/taille ≤ 2 px ou ≤ 1,5 % du parent ; couleur ≤ 6/255 par canal ; capitale ≤ 1 px ou ≤ 5 % ; espacement ≤ 10 %.

1. Les quatre images ont la même largeur de 1080 px (`mesure_globale.py`).
2. La correspondance horizontale est directe : offset x = 0, échelle x = 1,000 (`mesure_geometrie.py`).
3. L'aplat de la carte claire est exactement RGB `(242, 236, 224)` dans la référence et le jeu (`mesure_elements.py`).
4. La largeur détectée de cet aplat est 980 px en référence contre 988 px en jeu, soit +8 px et seulement +0,74 point de largeur d'écran : dans la tolérance de 1,5 % (`mesure_geometrie.py`).
5. Sa hauteur détectée est identique : 326 px dans les deux images (`mesure_geometrie.py`).
6. Son décalage vertical n'est que de +6 px, soit 0,56 % de la largeur (`mesure_geometrie.py`).
7. La hauteur d'encre du grand titre est identique : 42 px (`mesure_geometrie.py`).
8. Le grand titre ne bouge que de -4 px en x et +2 px en y, sous le seuil relatif de position (`mesure_geometrie.py`).
9. La hauteur d'encre du CTA est 26 px en référence contre 27 px en jeu : +1 px (`mesure_geometrie.py`).
10. Le fond du bandeau haut, échantillonné loin des bords, passe de `(10,14,22)` à `(14,20,28)` : chaque canal reste dans la tolérance (`mesure_geometrie.py`).
11. Le fond du titre passe de `(32,24,15)` à `(34,22,13)` : delta maximal 2/255 (`mesure_geometrie.py`).
12. Le fond du dossier passe de `(33,24,17)` à `(36,23,22)` : delta maximal 5/255 (`mesure_geometrie.py`).
13. Le fond de liste passe de `(29,22,16)` à `(34,22,22)` : delta maximal 6/255 (`mesure_geometrie.py`).
14. À hauteur commune 1080×2102, la luminance moyenne n'écarte que de +0,89 (`mesure_globale.py`).
15. La capture 1920 initiale reproduit la capture 2400 sur la zone y=0:1600 avec une erreur absolue moyenne de 0,1673/255 (`mesure_scroll.py`).

## 0. L'écran, tel que la maquette le dit

Le joueur vient choisir la famille contre laquelle envoyer Lt. Kest ce soir, vérifier l'enjeu, puis engager une action irréversible. Le regard rencontre d'abord le chrome nocturne avec argent, jour et chaleur ; il descend ensuite sur le titre « Le coup de ce soir », puis sur la grande fiche ivoire qui résume homme, cible et butin. La liste des quatre familles constitue le choix central : une carte active bordée d'or, trois alternatives sombres, des initiales en blasons et un historique à droite. La réplique de Kest confirme le ton et le moment. Le CTA doré ferme le parcours et porte la décision.

Les zones sont donc : chrome/ville, introduction, fiche d'ordre, liste de cibles, confirmation narrative, action. Les traits d'identité sont la ville presque noire, le mélange bleu nuit/brun tabac, l'ivoire documentaire, l'or patiné, le rouge réservé à la cible et au butin, et le rythme vertical en grandes plaques. La lecture repose sur une alternance nette : ambiance sombre, résumé très clair, choix sombres, confirmation froide, action dorée.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui : le but est immédiatement lisible et l'ordre chrome → titre → fiche → familles → réplique → CTA est conservé. La fiche ivoire reste le premier point focal utile, puis la carte active et enfin le CTA. Les familles de couleurs restent les mêmes ; à hauteur commune, la luminance globale ne varie que de +0,89. La densité de bords baisse de 19,29 % à 17,80 %, surtout parce que les textes et le portrait sont composés différemment, sans aérer ni écraser la structure. Le principal écart perceptible est le portrait : la silhouette, à peine marquée dans la référence, devient très sombre dans le jeu. Le deuxième est le dock de navigation, visible seulement dans le jeu sous le contenu ; il est grand mais arrive après la décision et ne détourne pas le parcours. Le troisième est une compression verticale locale du CTA, dont l'encre remonte de 34 px. Le titre a la même hauteur mais une chasse plus courte. Aucun de ces écarts n'inverse la hiérarchie, ne rend le texte illisible ni ne coupe l'action. La version 1920 exige un défilement, conforme au dossier, et son état bas expose proprement Saltline, la réplique et le CTA au-dessus du dock.

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| 1 | Fiche d'ordre — portrait (`P2.avatar`) | MINEUR | contraste de luminance cercle/figure 15,6 ; aucun pixel intérieur sous 145 | contraste 102,1 ; zone sombre `(114,752)-(181,835)` | +86,5 points de luminance | `mesures/mesure_elements.py` | La silhouette devient un médaillon très présent, mais reste secondaire face au texte. |
| 2 | Chrome bas (`P6.dock`) | MINEUR — EN TROP | aucune contrepartie dans l'image de référence | y=2063..2399 en 2400, hauteur 337 px, 14,04 % de l'image | +337 px visibles | `mesures/mesure_scroll.py` | Partie du shell évoquée par le dossier ; elle suit le contenu et ne change pas l'ordre de lecture de la tâche. |
| 3 | CTA (`P5.cta`) | MINEUR | encre à y=1976, hauteur 26 px | encre à y=1942, hauteur 27 px | y=-34 px ; hauteur +1 px | `mesures/mesure_geometrie.py` | La zone de confirmation est un peu plus compacte ; le CTA reste en fin de parcours. |
| 4 | Grand titre (`P1.title`) | MINEUR | encre 454×42 à `(53,479)` | encre 436×42 à `(49,481)` | largeur -18 px (-3,96 %) ; hauteur égale | `mesures/mesure_geometrie.py` | Chasse plus courte, sans perte de rang typographique. |
| 5 | Réplique (`P4.reply`) | MINEUR | locuteur romain gras, citation italique ; encre claire `(51,1827)-(1005,1893)` | toute la ligne paraît italique ; encre claire `(48,1808)-(989,1867)` | style de locuteur différent ; bloc plus compact | `mesures/mesure_elements.py` | Visible côte à côte, sans ambiguïté de dialogue. |
| 6 | Historique des familles (`P3.history`) | MINEUR | « on ne les a pas croisés » | « on n’a jamais croisé leur route », avec retour de ligne sur la carte active | formulation et reflux différents | contrôle visuel des PNG | Le sens reste « aucun engagement » ; le rythme droit est toutefois plus dense. |
| 7 | Chrome haut (`P0.status`) | ASSUMÉ | `$ 24 850`, `JOUR 12`, `Matin`, `tiède / HEAT` | `ARGENT —`, `JOUR —`, `CHALEUR` | valeurs absentes | `dossier.md` + contrôle visuel | Explicitement déclaré pour le shell sans session ; géométrie et palette restent proches. |
| 8 | Cible et butin (`P2.target`) | ARBITRAGE | « l'entrepôt de Dépôt-Est » / « leur dépôt » | « leurs installations » / « leurs installations » | précision volontairement retirée | `dossier.md` + contrôle visuel | L'API ne fournit ni possession, ni bâtiment, ni district ; ne pas inventer la précision est l'arbitrage de données déclaré. |

## 5. Autres résolutions

### 1080×1920 — position initiale

La structure supérieure est stable : le rendu commun avec la capture 2400 donne une erreur moyenne de 0,1673/255 sur y=0:1600. Le dock fixe occupe y=1618..1919. Saltline et la suite du parcours sont volontairement sous la fenêtre initiale, comme annoncé ; aucun élément visible ne déborde horizontalement ni de son parent.

### 1080×1920 — scroll bas

Le meilleur appariement du contenu donne un déplacement vertical de 446 px (erreur réduite 0,424 ; vérification en pleine zone 1,490/255). Les quatre familles, Saltline, la réplique et le CTA sont accessibles. L'encre du CTA occupe `(93,1496)-(490,1524)` et garde 94 px avant le dock fixe à y=1618. Le CTA n'est ni coupé ni couvert ; le reflux conserve l'ordre de lecture.

## 6. Non vérifié

- Les états pressé, confirmé, réseau, historique non vide et absence de gros bras ne sont pas capturés ; il faudrait une capture déterministe de chacun.
- L'animation, sa cadence et ses états intermédiaires ne sont pas vérifiables sur des PNG fixes ; il faudrait une courte séquence ou des captures horodatées.
- La famille exacte et la graisse nominale des polices ne peuvent pas être déduites sûrement des pixels ; les `fc-match` de la référence et l'inventaire des fontes embarquées trancheraient.
- Le dock n'a pas de contrepartie dans la référence, donc sa fidélité graphique propre n'est pas jugeable ici ; seule son intégration et son occlusion le sont.
- Le geste de scroll et le comportement inertiel ne sont pas mesurés ; seuls les deux états extrêmes fournis sont vérifiés.
- Les rayons et ombres très doux n'ont pas été isolés de l'anticrénelage ; aucune différence perceptuelle forte n'est visible, mais une référence alpha ou un rendu à fond uni permettrait une mesure stricte.

## Annexes

### 1. Inventaire de la référence

| id | catégorie / parent | bbox ou repères instrumentés | forme, remplissage, bord, effet | texte et relations |
|---|---|---|---|---|
| `R0` | chrome / écran | largeur 1080 ; bande centrale plate y=219..433 | bleu-noir `(10,14,22)` échantillonné ; ville noire, médaillon circulaire or, pas d'ombre forte | argent à gauche, chaleur centrée, jour à droite |
| `R1` | introduction / écran | aplats centraux y=434..551 et 559..637 | plaque brun tabac `(32,24,15)`, séparateur discret | titre ivoire 454×42 à `(53,479)`, sous-titre dessous |
| `R2` | fiche / dossier | aplat clair détecté x=50..1029, y=677..1002 | rectangle arrondi ivoire `(242,236,224)`, filet interne beige ; portrait circulaire très peu contrasté | ordre en sérif noir/rouge, butin rouge à droite |
| `R3` | familles / dossier | quatre bandes de cartes jusqu'à y=1779 au centre | sélection brune bordée or ; alternatives brun très sombre ; blasons arrondis | noms à gauche, historique à droite, bouton « CE SOIR » sur l'active |
| `R4` | réplique / écran | aplats bleu nuit y=1787..1937 | panneau froid `(20,26,33)`, liseré supérieur | locuteur gras puis citation italique |
| `R5` | CTA / réplique | aplat central y=1941..2039 ; encre `(101,1976)-(509,2002)` | rectangle brun bordé or | action dorée à gauche, irréversibilité à droite |

Couche globale : palette quantifiée dominante brun `(36,28,20)` 15,59 %, ivoire `(240,234,221)` 13,87 %, brun `(44,33,21)` 10,93 %, quasi-noir `(15,16,20)` 10,43 %, bleu-noir `(6,10,15)` 9,21 %. Luminance moyenne 57,52 ; densité de bords 19,29 % (`mesure_globale.py`).

### 2. Inventaire de la capture principale

| id | catégorie / parent | bbox ou repères instrumentés | forme, remplissage, bord, effet | texte et relations |
|---|---|---|---|---|
| `C0` | chrome / écran | largeur 1080 ; bande centrale y=232..430 | bleu-noir `(14,20,28)` échantillonné ; ville noire, jauge circulaire or | valeurs vides assumées ; diamant sous jauge |
| `C1` | introduction / écran | aplats y=434..532 et 548..640 | brun `(34,22,13/14)`, séparateur | titre ivoire 436×42 à `(49,481)` |
| `C2` | fiche / dossier | aplat clair x=46..1033, y=683..1008 | rectangle arrondi ivoire identique ; portrait beaucoup plus sombre | cible générique rouge, butin générique rouge |
| `C3` | familles / dossier | cartes centrales y=1063..1765 | sélection brune/or puis trois cartes sombres, géométrie régulière | contenu complet, historique plus long à droite |
| `C4` | réplique / écran | aplats y=1777..1902 | panneau `(22,28,34)`, liseré supérieur | citation compacte entièrement italique à l'œil |
| `C5` | CTA / réplique | aplat y=1907..2004 ; encre `(93,1942)-(490,1969)` | rectangle brun/or | action et avertissement lisibles |
| `C6` | dock / shell | y=2063..2399 | fond prune/bleu-noir ; quatre cercles | `EMPIRE`, `FAMILLE`, `FILIÈRE`, `PLUS` |

Couche globale complète : brun `(34,28,22)` 16,42 %, brun-rouge `(35,23,17)` 12,29 %, ivoire `(242,237,224)` 11,30 %, bleu nuit `(19,21,28)` 11,12 %. Luminance 53,71 et densité 16,58 % sur 1080×2400 ; sur la hauteur commune 1080×2102, luminance 58,41 et densité 17,80 % (`mesure_globale.py`).

### 3. Correspondance des repères

- Largeur commune : 1080 px ; offset horizontal 0 ; échelle horizontale 1,000.
- L'aplat clair fournit le témoin structurel : largeur 980 → 988 px, hauteur 326 → 326 px, translation verticale +6 px.
- Les grandes frontières homologues suivent le même ordre ; le bas du contenu jeu arrive à y=2062 avant le dock, contre y=2084 pour le dernier panneau bleu de référence.
- Pour le scroll 1920, les motifs des cartes donnent un offset de 446 px ; le chrome haut et le dock restent fixes.

### 4. Scripts et sorties

- `mesures/mesure_globale.py` — dimensions, palettes, luminance, densité, frontières.
- `mesures/mesure_geometrie.py` — aplats, boîtes d'encre, couleurs locales, repères.
- `mesures/mesure_elements.py` — portrait, sélection, réplique, CTA.
- `mesures/mesure_scroll.py` — correspondance 2400/1920, offset et accessibilité du bas.

Sorties discriminantes :

```text
mesure_globale.py
IMAGE reference-1080x2102.png: 1080x2102
IMAGE capture-1080x2400.png: 1080x2400
IMAGE capture-1080x1920.png: 1080x1920
IMAGE capture-1080x1920-bas.png: 1080x1920
CONTROLE_POSITIF largeur commune: [1080, 1080, 1080, 1080] -> True
CONTROLE_NEGATIF hauteurs distinctes: [2102, 2400, 1920, 1920] -> True
reference luminance,densite: 57.52 19.29
capture luminance,densite: 58.41 17.8
delta capture-reference: 0.89 -1.49

mesure_geometrie.py
IMAGE reference-1080x2102.png: 1080x2102
IMAGE capture-1080x2400.png: 1080x2400
CONTROLE_POSITIF largeur image: [1080, 1080] -> True
CONTROLE_NEGATIF hauteur image: [2102, 2400] -> True
comparaison aplat clair ligne mediane: ref x=50..1029 largeur=980 (90.74% écran); cap x=46..1033 largeur=988 (91.48%); delta=8 px (0.74 point écran)
comparaison bloc clair vertical détecté: ref y=677..1002 hauteur=326; cap y=683..1008 hauteur=326; delta position=+6 px (0.56% largeur), delta hauteur=+0
comparaison titre encre: ref 454x42 @53,479; cap 436x42 @49,481; delta largeur=-18 (-3.96%), hauteur=+0, position=(-4,+2)
comparaison CTA encre: ref 408x26 @101,1976; cap 397x27 @93,1942; delta y=-34 (-3.15% largeur écran)

mesure_elements.py
IMAGE reference-1080x2102.png: 1080x2102
IMAGE capture-1080x2400.png: 1080x2400
CONTROLE_POSITIF largeur: [1080, 1080] -> True
CONTROLE_NEGATIF hauteur: [2102, 2400] -> True
contraste_luminance_avatar_cercle-figure: 15.6
bbox_avatar_pixels_sombres(<145): None
contraste_luminance_avatar_cercle-figure: 102.1
bbox_avatar_pixels_sombres(<145): (114, 752, 181, 835, 3149)
CONTROLE_POSITIF aplat carte claire @540,700: (242, 236, 224) (242, 236, 224)
CONTROLE_NEGATIF figure avatar: (207, 196, 166) (108, 99, 80)

mesure_scroll.py
IMAGE capture-1080x2400.png: 1080x2400
IMAGE capture-1080x1920.png: 1080x1920
IMAGE capture-1080x1920-bas.png: 1080x1920
CONTROLE_POSITIF largeur commune: [1080, 1080, 1080] -> True
CONTROLE_NEGATIF 2400 vs 1920: 2400 1920 -> True
MAD 2400 vs 1920 initial, zone 0:1600 = 0.1673
meilleurs_offsets_scroll (MAD, px): [(0.424, 446), (0.563, 445), (1.102, 447)]
verification_offset=446: source y=900:1600, bas y=454:1154, MAD=1.4900
bbox pixels or CTA/contour dans état bas: (93, 1496, 490, 1524)
marge CTA-encre au dock fixe (y=1618): 94 px
```
