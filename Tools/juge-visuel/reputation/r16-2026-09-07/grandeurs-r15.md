# Grandeurs mesurées au tour r15 (2026-09-07, planches `a341fd9`, compte `demo_capture`) — ㊲ La réputation (SANS les verdicts)

Ce fichier ne porte que des MESURES : ni gravité, ni classe, ni « fermé/ouvert ». Le juge du r16 remesure avec ses propres
instruments ; il peut reprendre la MÉTHODE décrite ici (elle a été transmise au correcteur comme définition de la cible).
⚠️ Le compte photographié au r15 (`demo_capture`) n'est pas celui du r16 (`operational_demo`) : une grandeur de CONTENU qui
diffère n'est pas un écart d'écran.

## A. Grandeurs trouvées ÉGALES au r15 (verbatim, table du contrôle positif)

| # | grandeur | réf | jeu (2400) | Δ | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet à filet (mi-alpha ext→ext) | **1627,0 px** | **1628,0 px** | +0,06 % | `m03` |
| 2 | carte portrait, largeur rail à rail | **421,0 px** | **421,4 px** | +0,1 % | `m11` |
| 3 | hauteur de capitale « Le miroir » (le L) | **45 px** | **45 px** | **0** | `m33` |
| 4 | hauteur de capitale « Rien n'a encore déteint » (le R) | **34 px** | **34 px** | **0** | `m33` |
| 5 | hauteur de capitale du libellé CTA (le D) | **22 px** | **22 px** | **0** | `m33` |
| 6 | épaisseur de trait du sérif (run médian, titre du panneau bas) | **9,0 px** | **9,0 px** | **0** | `m28` |
| 7 | jeton cyan du chiffre (cœur) | (127,212,217) | (127,212,217) | **0/255** | `m19`,`m20` |
| 8 | jeton vert « Il vous écoute » | (125,179,106) | (125,179,106) | **0/255** ; aire 2096 → 2098 px (+0,1 %) | `m20` |
| 9 | jeton crème | (234,224,200) | (234,224,200) | **0/255** | `m20` |
| 10 | jeton peau | (185,173,146) | (185,173,146) | **0/255** | `m19` |
| 11 | jeton or vif (titre + CTA) | (242,201,107) | (242,201,106) | **1/255** ; aire −2,4 % | `m19`,`m20` |
| 12 | filet or du cadre (cœur) | (176,141,62) | (176,141,61) | **1/255** | `m19` |
| 13 | contraste du titre « Le miroir » | 11,91:1 | 11,55:1 | −0,36 | `m21` |
| 14 | contraste du titre du panneau bas | 13,57:1 | 13,85:1 | +0,28 | `m21` |
| 15 | contraste du sous-titre | 8,37:1 | 8,19:1 | −0,18 | `m21` |
| 16 | hauteur des boîtes de compteur (centre à centre) | 111,1 px | 111,8 px | +0,7 % | `m29` |
| 17 | pas des 3 lignes du paragraphe du panneau bas | 33 / 32 px | 33 / 33 px | ≤ 1 px | `m21` |
| 18 | luminance moyenne du cadre · densité d'encre | 31,84 · 10,89 % | 31,19 · 10,54 % | −2,0 % · −3,2 % | `m26` |
| 19 | filet du bandeau (chrome) vs canon ramené | canon **140,5..142,3** | capture **141..142** | **0 px** | `m24` |
| 20 | rien de coupé : encre sur les 4 rangées/colonnes de bord, aux **2** résolutions | — | **0 px** partout | — | `m27` |
| 21 | position verticale du losange vs la CSS du canon (bas à 82 CSS = 225,9 px) | 225,9 px | **227,5 px** | +1,6 px | `m25` |

## B. Grandeurs à ÉCART au r15 — la mesure seule (id r15 · dépend des données ? · mesure)

| id r15 | données | mesure |
|---|---|---|
| `B1` | non | Or de la boîte du CTA (y1882..1970) : **13 550 px à 2400** ; **0 px d'or entre le filet bas du cadre et le dock à 1920** (y1631..1819). Les seuls 190 px d'or sous le cadre à 1920 sont le soulignement de l'onglet actif PLUS (x802..839), **présents à l'identique à 2400** (190 px). Ascenseur : marge interne droite y260..1620, **amplitude 6,8 pts**, 0 colonne > 10 pts ; **contrôle négatif** = marge interne gauche, **6,8 pts** — identiques. Garde entre la dernière encre (1617,5) et le filet bas (1625,5) : **8,0 px**. Fond nu sous le cadre : **86 px** avant le dock (`m23`, `m05`) |
| `M1` | non | `P(2)` **25,11 → 0,02 pts** ; `P(4..16)` **17,48/9,84/5,45/2,41 → 0,00/0,00/0,00/0,00** ; portée **d18 → d1** ; vallée **+1,57 → 0,00 pts** ; barycentre **(−1,0;+1,3) px → indéfini** ; luminance brute à 3/6/12/30 px **32,5/24,7/15,5/13,7 → 13,6/13,6/13,6/13,6** ; pixels cyan de l'image **4 468 → 2 362** (`m08`,`m09`,`m10`,`m20`) |
| `M2` | non | inset 232,0 px → filet du cadre 481,5 ⇒ **249,5 px** ; du filet du bandeau (142) ⇒ **339,5 px**. Zone libre 232..2195 = 1963 px, cadre 1628 px ⇒ **82,9 %**. Maquette : 1627/1668 = **97,5 %** *(zone libre de la maquette dérivée du dossier : 434 px d'évocation de chrome, filet bas à y2078 sur 2102 — je ne l'ai pas remesurée)*. À 1920 : **93,1 %** (`m03`,`m25`,`m27`) |
| `M3` | non | garde bas **29,0 px (réf) → 137,0 px (jeu)**, garde haut 29,0 → 25,5 ; vide total **16,11 → 45,14 CSS** ; occupation du cadre **96,4 % → 90,0 %** (`m03`,`m05`) |
| `M4` | non | hauteur du panneau (centre à centre) **763,3 → 673,6 px** ; identique à 1920 (673,6) ; vide sous la 4ᵉ tuile 165 px (21,6 %) → 138 px (20,5 %) (`m12`,`m13`) |
| `M5` | non | rangées où la peau est aussi large ou plus large que la silhouette : **réf 0 / jeu 12** (y1133..1144 à 2400, y901..912 à 1920, largeur de peau jusqu'à 137 px pour 0 px de sombre). Flancs sombres à 4 px du bord de peau : **réf 14/14 sondes, jeu 10/14** ; épaisseur latérale à 15 % de la hauteur du visage **18/18 px → 0/0 px** (`m18`) |
| `m1` | non | bords EXTÉRIEURS des deux côtés : carte 1560,5 − panneau 1550,6 = **+9,9 px** à 2400 ; 1327,5 − 1318,6 = **+8,9 px** à 1920 ; réf 1532,5 − 1613,6 = **−81,1 px** (`m12`) |
| `m2` | non | hauteur (bord à bord) **98,0 → 89,5 px** ; pas haut-à-haut **115,0/115,8/115,0 → 107,2/107,2/107,5** ; offset de la 1ʳᵉ tuile dans le panneau **154,3 → 124,7 px** (`m04`,`m13`,`m29`) |
| `m3` | non | épaisseur de trait (run médian, seuil à mi-hauteur, indépendant du réglage) : sous-titre **5,0 → 4,0 px (−20 %)**, libellé CTA **6,0 → 5,0 px (−17 %)**, **témoin sérif 9,0 → 9,0 px (0 %)**. Encre du sous-titre L1 **5 049 → 3 951 px (−21,7 %)**, L2 **1 349 → 1 002 px (−25,7 %)**. Aparté « ce qu'il a absorbé de vos règles » : **3 bandes → 2 bandes** (`m21`,`m28`) |
| `m4` | non | médiane par colonne, bande y488..508 : bord **(16,22,31)** → pic **(43,37,33)** à x540 ; réf bord (17,24,34) → pic **(24,29,36)**. `R−B` : réf **−12** au pic (froid), jeu **+10** (chaud). Écart **+19/255 sur R** (`m22`) |
| `m5` | non | médianes de rangée dans la boîte 1 : réf **(14,22,30) → (10,14,22) → (15,23,30)** ; jeu **(13,13,22) partout, amplitude 0/0/0**. Écart max au bord haut **9/255 sur G, 8/255 sur B** (`m32`) |
| `m6` | non | « Pas encore / jugeable », pas haut-à-haut **42 → 35 px (−16,7 %)** ; témoin : les 3 lignes du paragraphe du panneau bas restent à 33/33 (`m26`) |
| `m7` | non | offset du filet or depuis le filet du cadre : **211..217 → 205..211** (2400) et **204..211** (1920) (`m26`) |
| `m8` | non | hors-tout rail à rail **1035,0 → 1040,4 px (+5,3)** ; marges d'écran **21/21 → 18/18 px** ; épaisseur des filets horizontaux **3,0 → 4,0 px** (`m03`,`m29`) |
| `m9` | non | **1952..2046 = 95 px → 1882..1970 = 89 px (−6,3 %)** ; largeur rail à rail **980 → 988 px** ; libellé identique (capitale 22 px, contraste 11,22 → 11,44) (`m26`,`m33`) |
| `m10` | non | largeur max de peau **126 → 137 px** ; hauteur du visage **124 → 129 px** ; largeur max de la silhouette sombre **152 → 155 px** (`m17`,`m18`) |
| `m11` | non | boîte **61×40 (aire 1 330) → 60×58 (aire 1 788)** ; reste un triangle (remplissage **0,55 → 0,51**) et reste centré sur l'axe du cou (**x 293,0 → 290,5**) (`m26`) |
| `m12` | non | pic **81,6 → 95,8 pts (+17,4 %)** ; largeur à 10 % du pic **885 px (90,8 % du panneau) → 960 px (97,8 %)**, soit x60..1019 = bord à bord ; à 25 % **813 → 851 px** ; épaisseur mi-alpha **8,0 → 6,6 px** (`m14`,`m15`) |
| `m13` | non | mesuré **9,5 × 9,0 px** ; attendu **27,3 px** de diagonale (carré 7×7 CSS tourné à 45° → 9,90 CSS × 2,755). Position : bas mesuré **227,5 px**, attendu **225,9 px** ⇒ **+1,6 px** (`m25`) |

Le r15 notait une cause commune MESURÉE : le panneau élastique −89,7 px produit les mesures m1, m2, m6 et une partie de M3 ;
M2/M3 sont deux faces d'un cadre de hauteur fixe (452 CSS dessinés) dans une zone libre plus grande (2400 : 1963 px).

## C. Le halo au r15 — méthode et chiffres (la méthode a été transmise au correcteur comme définition de la CIBLE)

**Méthode, écrite avant les chiffres.**
- **Fond** : médiane de la **rangée**, calculée sur l'intérieur de la boîte du compteur (l'encre est
  minoritaire, la médiane est donc le fond, gradient compris).
- **Excès** : `exces(x,y) = L(x,y) − médiane(rangée y)`, en **points** de luminance.
- **Encre** : cœur cyan (`|c − (127,212,217)| ≤ 28`) **dilaté de 2 px** pour avaler la frange
  d'anti-crénelage.
- **Profil de Chebyshev** `P(d)` : moyenne de l'excès sur l'anneau à distance `d` de l'encre,
  `d = 1..30`, **domaine borné au-dessus de la bande du libellé** pour qu'aucun anneau ne le touche.
- **PLATEAU** : plus grand `D` tel que `P(d) ≥ 0,90 · P(2)` sur `[2, D]`. Un halo qui **rayonne**
  décroît dès `d = 2` (plateau de 1 px) ; une **tache posée** garde sa valeur puis tombe d'un coup.
- **VALLÉE** : minimum du profil de rangées `moyenne(rangée) − médiane(rangée)` entre le bas de l'encre
  du chiffre et le haut de la bande du libellé, **en points**.
- **BARYCENTRE** : centroïde pondéré par l'excès hors encre, comparé au centroïde de l'encre.
- **SYMÉTRIE** : somme **brute** (sans écrêtage) de l'excès sur les 12 rangées au-dessus et au-dessous
  de l'encre, colonnes de l'encre.
- **LARGEUR QUI SUIT L'ENCRE** : largeur à mi-hauteur du profil de colonnes de l'excès, sur la bande
  du chiffre, comparée à la largeur de l'encre — d'un compteur à l'autre, les encres font 67/68/67 px
  (réf) et 62/62/47 px (jeu).
- **Garde anti-vacuité de la méthode** (`m10`) : un halo large et uniforme ferait monter la médiane et
  s'annulerait dans l'excès. On lit donc **aussi la luminance BRUTE** le long d'une ligne passant par
  le milieu du chiffre, jusqu'aux bords de la boîte.

**Chiffres.**

| grandeur | réf (compteur 1) | jeu 2400 | jeu 1920 |
|---|---|---|---|
| `P(1)` | 26,81 pts | 4,46 pts *(frange du glyphe)* | 4,30 pts |
| **`P(2)`** | **25,11 pts** | **0,02 pts** | **0,01 pts** |
| `P(4)` / `P(8)` / `P(12)` / `P(16)` | 17,48 / 9,84 / 5,45 / 2,41 | **0,00 / 0,00 / 0,00 / 0,00** | **0,00 / 0,00 / 0,00 / 0,00** |
| portée (dernier `d` avec `P(d) > 0,5`) | **d ≈ 18** | **d = 1** | **d = 1** |
| **PLATEAU** (`P ≥ 0,90·P(2)`) | d2..d2 — **1 px**, décroissance immédiate ⇒ **rayonnement** | sans objet (`P(2) ≈ 0`) | sans objet |
| **VALLÉE** chiffre → libellé | **+1,57 pts** (c2 : +0,32 ; c3 : +0,74) | **0,00 pts** (les 3 compteurs) | **0,00 pts** |
| **BARYCENTRE** halo − chiffre | **(−1,0 ; +1,3) px** | **indéfini** — masse d'excès hors encre = 0 | indéfini |
| **SYMÉTRIE** haut / bas (brut) | 12 051 / 13 693 → **1,14** | 2 538 / 2 250 (**entièrement la frange de la rangée 748**, 37 px non nuls sur 744) | 1 569 / 1 669 |
| **LARGEUR** du halo / largeur de l'encre | 67/67 = **1,00** ; c2 66/68 = 0,97 ; c3 67/67 = 1,00 | 61/62 = 0,98 — mais c'est **l'encre elle-même** | idem |
| **luminance BRUTE** à 3 / 6 / 12 / 30 px de l'encre (rangée médiane du chiffre) | **32,5 / 24,7 / 15,5 / 13,7** | **13,6 / 13,6 / 13,6 / 13,6** | **13,6 / 13,6 / 13,6 / 13,6** |
| couleur du fond à 4 px au-dessus du chiffre | **(23,38,46)** *(fond lointain (15,26,35))* | **(13,13,22)** *(fond lointain (13,13,22))* | (13,13,22) |

Réconciliation après le r15 (f2, 07:10) : le correcteur a rendu l'effet et compté ses pixels (α=0 ⇒ 1 276 px changés ; dilatation
0,12 livrée ⇒ le halo colle au glyphe ; 0,60 ⇒ saturation). Le zéro mesuré au r15 à d≥2 était exact ; l'effet existait, plus court
que la première distance de la sonde. Profil de RÉFÉRENCE complet (compteur 1 = compteur 3 ; le compteur 2 est contaminé par le
« /4 » voisin au-delà de d6) :
```
d1=26,81 d2=25,11 d3=22,25 d4=17,48 d5=14,27 d6=12,67 d7=11,18 d8=9,84 d9=8,65 d10=7,49
d11=6,42 d12=5,45 d13=4,51 d14=3,82 d15=2,95 d16=2,41 d17=1,60 d18=0,60 d19=0,24 d20=−0,10
portée ≈ 18 px · mi-valeur vers d6–d7 · plateau 1 px · vallée +1,57 pt · symétrie 1,14 · barycentre (−1,0 ; +1,3) · largeur 1,00
```
Écart chiffre → libellé (bas de l'encre du chiffre → haut de la bande du libellé) : à mesurer ; le correcteur déclare 19 px.

## D. Le cadre et son vide au r15 (mi-alpha ; 3,6 px/CSS)

Mesures au même instrument des deux côtés (mi-alpha ; conversion 3,6 px/CSS).

| grandeur | réf 2102 | jeu 2400 | jeu 1920 |
|---|---|---|---|
| filet haut du cadre (ext / int) | 451,5 / 454,5 | 481,5 / 485,5 | 249,5 / 253,5 |
| filet bas du cadre (int / ext) | 2075,5 / 2078,5 | 2105,5 / 2109,5 | 1625,5 / 1629,5 |
| **cadre hors-tout** | **1627,0 px = 451,94 CSS** | **1628,0 px = 452,22 CSS** | **1380,0 px = 383,33 CSS** |
| cadre intérieur (filet à filet, faces internes) | 1621,0 px = 450,28 CSS | 1620,0 px = 450,00 CSS | 1372,0 px = 381,11 CSS |
| 1ᵉʳ contenu (bord du panneau de titre, ext) | 483,5 | 511,0 | 278,0 |
| dernier contenu (filet bas de la boîte du CTA / du panneau bas, ext) | 2046,5 | 1968,5 | 1617,5 |
| **contenu, haut à bas** | **1563,0 px = 434,17 CSS** | **1457,5 px = 404,86 CSS** | **1339,5 px = 372,08 CSS** |
| garde HAUT (filet int → 1ᵉʳ contenu) | **29,0 px = 8,06 CSS** | **25,5 px = 7,08 CSS** | 24,5 px = 6,81 CSS |
| garde BAS (dernier contenu → filet int) | **29,0 px = 8,06 CSS** | **137,0 px = 38,06 CSS** | 8,0 px = 2,22 CSS |
| **VIDE total dans le cadre** | **58,0 px = 16,11 CSS** | **162,5 px = 45,14 CSS** | 32,5 px = 9,03 CSS |

Hors du cadre à 2400 : inset haut publié 275,0 u = 232,0 px ; cadre à 481,5 ⇒ 249,5 px de bande morte ; dock à 2195 ⇒ zone libre
1963 px, cadre 1628 px (82,9 %). À 1920 : zone libre 1483 px, cadre 1380 px (93,1 %). Maquette : 97,5 % (dérivé).

## E. Le régime 16:9 au r15 (1080×1920)

Visible sans défiler : titre, sous-titre, 3 compteurs, panneau élastique entier (4 tuiles), panneau d'explication complet (3 lignes,
y1491..1579) ; filet bas du cadre y1626..1629, 8,5 px sous la dernière encre ; 0 px d'encre sur les 4 bords. Hors champ : la boîte
du CTA (13 550 px d'or à 2400, y1882..1970 ; 0 px d'or entre le cadre et le dock à 1920, y1631..1819 ; les 190 px d'or restants =
soulignement de l'onglet PLUS). Sonde d'affordance : marge interne DROITE du cadre y260..1620, amplitude max 6,8 pts, aucune colonne
> 10 pts ; marge GAUCHE (contrôle négatif) : 6,8 pts, la même valeur. 86 px de fond nu entre le filet bas et le dock.
