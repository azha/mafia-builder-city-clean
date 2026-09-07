# Grandeurs mesurées au tour r8 (2026-09-06, planches `fd0e21e`, compte `demo_capture`) — ① Le HUD de district (SANS les verdicts)

Ce fichier ne porte que des MESURES : ni gravité, ni classe, ni « fermé/ouvert ». Le juge du r9 remesure avec ses propres instruments.
⚠️ **Deux avertissements qui changent l'usage de ce fichier** :
1. Le compte photographié au r8 (`demo_capture`, 72 155 min, 8 cartes) n'est pas celui du r9 (`operational_demo`, 77 353 min, 314 cartes) : une grandeur de CONTENU qui diffère n'est pas un écart d'écran.
2. **Toute POSITION 2D de la vue district mesurée au r8 (cellules, badges, libellés de type, glyphes, marqueurs) l'a été sur une planche DÉFORMÉE par l'instrument** (`SnapToScreenPixel` arrondissait des unités de monde : ±96 px, corrigé au `78a90aa`). Ces positions ne sont pas une baseline. Le chrome, le HUD, le cadran, la fiche et les couleurs n'étaient PAS touchés par la déformation (0 arrondi de position hors district).

## A. Grandeurs trouvées ÉGALES au r8 (verbatim, table du contrôle positif)

| # | grandeur | canon | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | **plaque de fiche — boîte** (par différence fiche/district, 2400) | 366,00 × 169,19 à (13,00 ; 424,52) | **368,04 × 169,50** à (11,98 ; 599,61) | ≤ 2,04 CSS | `m19`,`m20` |
| 2 | plaque — coin arrondi, symétrique g/d **et** haut/bas | `border-radius:14px` | retraits 10,89 → 2,54 CSS sur 16 lignes, identiques à gauche et à droite | — | `m20` |
| 3 | **plaque — pixel résultant sur le même art** | prédiction sRGB (14,22,33) | mesuré **(12,20,31)** | **2/255** | `m40`,`m43` |
| 4 | **arc teal — pixel résultant** (`#7fd4d955` sur le fond nu) | mesuré canon (69,101,113), prédiction 1/255 | mesuré jeu (70,98,108), prédiction 6/255 | ≤ 6/255 | `m44` |
| 5 | **arc braise — pixel résultant** (`#e0664a88`) | (132,70,61), prédiction 3/255 | (133,76,70), prédiction 7/255 | ≤ 7/255 | `m44` |
| 6 | **bouton COLLECTER — dégradé vertical** | (227,190,98)(222,183,90)(212,169,73)(207,162,65)(202,155,57) | **les mêmes cinq valeurs, bit à bit** | **0** | `m21` |
| 7 | bouton COLLECTER — boîte | 103,33 × 37,67 | 104,53 × 38,11 | ≤ 1,20 | `m21` |
| 8 | **étendues angulaires des arcs** (chacune autour de SON centre de courbure) | teal 83,50° · braise 56,00° | teal **83,00°** · braise **56,00°** | ≤ 0,5° | `m09` |
| 9 | **les QUATRE porteurs de `.chaud`** (boîtier, filet, « Aube », « Brûlant ») | `--braise` (224,102,74) | **(224,102,73) sur les quatre** | 1/255 | `m13` |
| 10 | séparateurs de stats (centres) | 140,00 · 251,67 | 140,10 · 250,63 | ≤ 1,04 | `m31` |
| 11 | sous-titre de fiche — capitale et contraste | 6,25 CSS · 8,24:1 | 6,25 CSS · 8,19 / 8,06:1 | 0 · ≤ 0,18 | `m31` |
| 12 | libellés de stats — capitale et contraste | 6,00 CSS · 8,39:1 | 5,75 CSS · 8,31 / 8,33:1 | −4,2 % · ≤ 0,08 | `m31` |
| 13 | libellés de boutons — encre / fond / contraste | (19,25,35) sur (220,180,86) · 8,99:1 | (21,27,38) sur (218,177,84) · 8,55:1 | ≤ 3/255 | `m31` |
| 14 | ronds du dock — Ø et centres | 46,00 ; 93,67 · 161,67 · 229,67 · 297,67 | 44,28–45,73 ; 93,64 · 161,5–162,1 · 229,2–229,8 · 297,63 | ≤ 1,7 / ≤ 0,55 | `m25` |
| 15 | **indicateur d'onglet actif** — et il SUIT l'écran | 13,67 × 2,00 CSS, (176,141,62), centre 93,83 | 13,43 × 1,81, (176,141,61), centre **93,83** ; témoin ⑥ centre **161,88** (FAMILLE) | ≤ 0,24 | `m25` |
| 16 | rythme vertical de la fiche (4 bandes d'encre) | titre 21,8..32,8 · s-titre 45,8..52,2 · libellés 93,2..99,5 · actions 115,5..155,2 | 20,0..32,3 · 44,3..51,2 · 92,6..99,1 · 114,7..154,3 | ≤ 1,8 | `m22` |
| 17 | **losange sous le médaillon** | présent, centre x 195,67 | présent, centre x **195,46 / 195,82** | ≤ 0,29 | `m35` |
| 18 | barre de ratio — couleur et épaisseur | `--or` (217,171,78) · 2,00 CSS | (217,171,77) · 2,18 CSS | 1/255 · +0,18 | `m17` |
| 19 | volute GAUCHE — position | x 5,00..16,67 ; y ≈ 25,3..26,3 | x **4,36..16,33** ; y 25,04..26,50 | ≤ 0,64 | `m15` |
| 20 | filet du bandeau — y et couleur | y 51,67 ; `--laiton` (calme) | y **51,54** ; (224,102,73) = `--braise` (état chaud) | 0,13 CSS ; 1/255 | `m13` |
| 21 | gouttière | fiche 424,5..593,7, dock à 605,7 | jour plaque/dock **11,82** (1920) et **11,78** (2400) CSS ; rien sous le bandeau | — | `m29` |
| 22 | l'aiguille pointe dans le secteur braise (le cadran n'est PAS inversé) | — | aiguille **29,5°** (conv. B), secteur braise 19,5..66,0° | — | `m11`,`m10` |
| 23 | **contrôle des instruments** : hors plaque, les deux planches 2400 sont bit-identiques | — | 3 composantes de différence seulement : la plaque (472 382 px) + 2 taches de 10 px | — | `m20` |
| 24 | **contrôle de l'instrument d'arcs contre la SOURCE** | teal `(34,00;33,69)` R=26 vb ⇒ 18,20 CSS | fit sur le canon : centre à 0,3 CSS près, **R moyen 18,202** | 0,002 | `m09` |
| 25 | **contrôle du dossier** : les 4 sha256 déclarés | — | `e65305d0…` `09b358f8…` `c11e3fbc…` `2b38b5ee…` | **4/4 exacts** | `sha256sum` |
| 26 | **contrôle de la sonde de contraste** : la même sonde que `m12`, appliquée au titre de la fiche (or-vif sur la plaque) | doit dépasser 10:1 | **10,31:1** (1920) et **10,14:1** (2400) | — | `m28` |

---

## B. Grandeurs à ÉCART au r8 — la mesure seule (id r8 · dépend des données ? · mesure)

| id r8 | données | mesure |
|---|---|---|
| `M1` | non | profil radial médian de (R−B) sur 720 rayons — canon : montée 0 → 100 en **0,25 CSS**, NOMINAL **1,30**, CŒUR **0,95** = **73 % de plateau** ; jeu : montée étalée sur **1,5 CSS**, NOMINAL **2,15** (1920) / **2,60** (2400), CŒUR 0,60 / 0,70 = **28 % / 27 %**. Le canon déclare `border:1.5px solid` (`m02`) |
| `M2` | non | épaisseur **perpendiculaire** à la centerline, largeur à mi-alpha, 83 à 105 coupes par arc — canon teal **2,65** (p10 2,45 = la valeur de la source : `stroke-width 3.5 × 0.700`), braise **2,55** ; jeu teal **4,20** / **4,15**, braise **4,45** / **4,40** ⇒ **+58 % et +75 %** (`m08`) |
| `M3` | non | même fond (art réel, prémisse vérifiée : 99,2 % de pixels bit-identiques à 240 px de décalage entre les deux planches, `m41`) — art (149,164,182) : le canon produirait **(30,37,49) L 14,4**, le jeu produit **(59,66,76) L 27,7** ⇒ **29/255, +13,3 L**. Modèle : prédiction **linéaire (58,65,75) écart 1/255**, prédiction sRGB écart 29 ⇒ alpha **recopié**. Conséquence mesurée à 1080×1920 : ARGENT **8,02 → 5,07**, montant **11,31 → 6,64**, JOUR **7,96 → 4,84** (`m42`,`m43`,`m31`) |
| `m1` | non | fenêtre x 376..392 CSS (au-delà de `.aile.droite` qui finit à 375) : canon **132 px** d'encre en x 376,00..386,67, y 25,33..26,33 ; jeu **0 px**. Fenêtre élargie 355..392 avec l'encre du texte exclue : jeu 15/23 px, tous frange d'anti-crénelage de « Aube ». **Contrôle de capacité : la même sonde trouve la volute du canon** (`m15`,`m16`) |
| `m2` | non | fond (16,20,31) : prédiction **linéaire (133,127,115) écart 0/255**, prédiction sRGB (77,77,78) **écart 56/255**, mesure **(133,127,115)**. L'opacité nominale **0,28 est bonne** ; c'est le pixel résultant qui est faux (`m38`,`m43`) |
| `m3` | non | rayon de courbure : canon **18,20** CSS (les deux arcs, valeur de la source retrouvée à 0,002 près) ; jeu teal **15,93**, braise **15,26** ⇒ **−12,5 % / −16,2 %**. Centre : canon à (+2,55 ; −0,40) et (−2,80 ; −2,05) du pivot ; jeu à (+0,60 ; **−4,60**) et (+0,15 ; **−5,15**). Course totale (conv. A) canon **221,50°**, jeu **177,00 / 176,00°** ; (conv. B) **180,00°** contre **141,50°**. Boîtes/pivot : le canon descend à y = 0,06 CSS du pivot, le jeu s'arrête à **−5,66** (`m07`,`m09`,`m10`) |
| `m4` | non | **conv. A** (centre du boîtier) — canon : braise s'arrête à **48,50°**, teal reprend à **88,50°**, **vide 40,00°** ; jeu : **57,50 → 91,50 = 34,00°** (1920) et **58,00 → 91,50 = 33,50°** (2400). **conv. B** (pivot) — canon **61,00 → 89,50 = 28,50°** (la source donne 60,55 → 90,00 = 29,45) ; jeu **66,00 → 91,00 = 25,00°**. Stable de 15 % à 70 % de couverture (`m10`) |
| `m5` | non | bissectrice du vide, au rayon de la bande d'arcs : canon bosse **+0,2 L** (la piste `#ffffff22` du canon existe mais son centre est 15,3 CSS plus bas — elle passe sous « 37% », pas dans le vide) ; jeu bosse **+9,0 L** à r = 14,8–15,0, contre +23,2 / +24,0 L sous les arcs colorés (`m11`,`m37`) |
| `m6` | non | pointe à **15,88** CSS du pivot au canon (la source pose 22 vb + cap rond = 16,1) contre **13,07** en jeu ⇒ **−17,7 %** (`m11`) |
| `m7` | non | aire équivalente du masque laiton : canon **3,53** CSS de diamètre (la source pose `r=2.6` vb = 3,64), bbox 3,00 × 3,33 ; jeu **4,51**, bbox 4,72 × 4,36 ⇒ **+28 %**, aire **×1,63** (`m12`) |
| `m8` | non | médiane par secteur de 45° dans l'anneau 0,58..0,72 R, encre et arcs exclus — canon : amplitude inter-secteurs RGB **(19, 19, 21)**, **ΔL 9,2**, secteur le plus clair **90..135°** (haut-gauche, conforme au `radial-gradient(circle at 38% 30%)` de la source) ; jeu **(1, 1, 1)**, **ΔL 0,5** (`m11`) |
| `m9` | la LARGEUR suit le nombre de glyphes (7 contre 3) ; la POSITION, non | centre vertical de l'encre par rapport au centre du boîtier : canon **+0,50** CSS (boîte 22,33 × 13,00) ; jeu **+5,54** (1920) et **+5,39** (2400), boîte 37,02 × 14,16 ⇒ déplacement **+4,89 / +5,04 CSS**. Le canon pose `.heatpct{margin-top:-14px}`. *(r7 mesurait +7,13 : l'écart a diminué, il n'est pas fermé.)* (`m33`) |
| `m10` | la LARGEUR suit le mot (« CHALEUR » 32,67 CSS contre « HEAT » 20,67) | coin d'encre le plus éloigné, rapporté au rayon INTÉRIEUR nominal du cerclage : canon **0,660 R** (dégagement **10,43** CSS) ; jeu **0,892 / 0,893 R** (dégagement **3,37 / 3,35** CSS). Le libellé est aussi 9 CSS plus bas que celui du canon, donc **sous le filet**, sur l'art (`m33`) |
| `m11` | non | diamètre NOMINAL extérieur : canon **63,90** CSS (`.medaillon` = 64) ; jeu **67,00** (1920) et **67,60** (2400) ⇒ **+4,9 % / +5,8 %**. Ligne médiane du trait : 62,60 → 64,85 / 65,00. Une part vient du halo de `M1` (une lueur étale sa mi-alpha), mais la ligne médiane bouge aussi (`m02`) |
| `m12` | oui — le fond dépend de l'art sous le mot, donc du district photographié | encre (202,193,172), capitale **≈ 4,8 CSS** ; fond posé pris à la même hauteur hors texte — **1080×2400 : 4,57:1 global, 4,32:1 pire colonne** ; **1080×1920 : 7,98:1 global, 7,55:1 pire colonne**. Le texte ne descend PAS dans la bande de fondu (0 px à 1920, 3 px à 2400) : le « pire cas dans le fondu » déclaré ne s'applique pas au mot (`m28`) |
| `m13` | oui, peut-être : composant absent **ou** aucune alerte en attente | canon : **2 288 px** d'encre claire en x 65,0..269,0 / y 90,3..112,7 plus **5 079 px** d'`--or-vif` (le `<b>`) ; jeu : **0 px** d'or-vif dans la bande y 78..113, aux trois planches. Contrôle de capacité : la sonde trouve le ruban du canon (`m36`) |
| `m14` | non | retrait du remplissage sur les 10 premières lignes : canon **6,00 · 5,00 · 4,33 · 3,67 · 3,33 · 2,67 · 2,33 · 2,00 · 1,67 · 1,67** ; jeu **3,63 · 3,27 · 2,90 · 2,54 · 2,18 · 1,81 · 1,45 · 1,45 · 1,09 · 0,73** — symétrique g/d et haut/bas dans les deux. Le canon pose `border-radius:9px` (`m21`) |
| `m15` | oui, en partie | canon : remplissage `--or` (217,171,78) sur **50,00** CSS puis **piste (90,99,118)** jusqu'à ~90 CSS (74 CSS de piste, 67,6 % rempli — la source dit 68 %) ; jeu : **73,68** CSS tout en (217,171,77), et à 6 CSS à droite de la fin le fond local (59,67,77) / (17,23,32), **aucun pixel** de la couleur de piste (`m17`) |
| `m16` | non | corrélation du vu-à-travers avec l'art **BRUT r = 0,136** contre l'art **FLOUTÉ à 5 CSS r = 0,100** — le brut gagne. Amplitude visible du décor à travers la plaque : **3,9 L** entre le décile d'art le plus sombre et le plus clair (`m30`,`m20`) |
| `m17` | oui — la longueur du montant décide (ici 14 caractères) | dernier pixel `--or-vif` du montant x **161,88** ; bord NOMINAL gauche du cerclage x **162,25** (1920) et **161,95** (2400) ⇒ jour **0,37** puis **0,07 CSS**. Jour **VISIBLE** (première lueur du halo) **1,81 CSS**. Canon : **86,80 CSS**. Aucun recouvrement mesuré (`m17`) |
| `m18` | non | encre **(238,241,242)** : **42/255** de `--creme` (234,224,200), **17/255** du blanc pur. Boîte x 23,96..37,75, y 20,33..28,31 CSS (`m38`) |
| `m19` | non | colonne x=300 : **(34,38,49) de y 51,90 à 83,48** (31,58 CSS) puis (19,24,35) de 83,48 à 87,11 (le même panneau, sous le fond posé du nom) ; l'art commence à **87,11**. Soit **35,21 CSS = 4,0 %** de la hauteur d'écran. En pied, l'art finit à **784,0** et les **87 CSS** restants sont un panneau, occupé par le dock (`m29`) |
| `m20` | non | encre : canon x **77,33..314,67** (237,33 CSS), plein laiton 112,00..279,67 ; jeu x **51,54..340,10** (288,56 CSS), plein laiton 97,64..294,00. Couleur (173,138,60), à 3/255 de `--laiton`. Le canon pose `left:14px;right:14px` + dégradé 30 %/70 % (`m35`) |

## C. Positions de la vue district — NON reportées

Les écarts de position du r3→r8 (« Planque sur le trottoir », « Serre sur un toit vide », 4 badges hors cadre, grille résiduelle 0,0) ont été
SUSPENDUS comme artefact d'instrument (`r8-2026-09-06/addendum-instrument-district.md`). Ils ne sont pas transcrits : remesure à neuf sur la
planche du r9. Ce qui est désormais établi hors image (déclaré par blender, instrument non fourni) : le badge tombe sur son ancre à 0,60 px ; 23 des
40 ancres désignent de la rue. Un badge sur la rue est donc un écart réel, de cause « carte d'ancrage ».
