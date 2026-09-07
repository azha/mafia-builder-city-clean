# Juge visuel ⊥ — ㊲ La réputation (« le miroir », `screen_b3`) — r15 — 2026-09-07

Planches jugées : `capture-1080x2400.png` (PRINCIPALE) et `capture-1080x1920.png`, commit `a341fd9`.
Référence : `reference-1080x2102.png` = cadre **#120 « Rien n'a encore déteint »** (l'état vierge) —
c'est bien le **témoin homologue** : la capture montre `00 / 00 sur 4 / —`, « Pas encore jugeable »,
« Il vous écoute », « Rien n'a encore déteint ». Aucun autre cadre de `etats/` ne convient.

## Verdict : **NON APPROUVÉ**

Le cadre est au bon endroit et le chrome n'y tombe plus (TD-659 **vérifié en jeu**), mais le halo des
compteurs — déclaré livré — **ne produit exactement aucun pixel**, l'écran n'occupe toujours que 83 %
de sa zone libre à 2400, et à 1920 la seule action de l'écran a disparu **sans qu'aucun pixel n'annonce
une suite** — ce qui est précisément le critère de sortie que le dossier lui-même attache à cet assumé.

## Convention de bord — déclarée avant les chiffres

- **Bord = mi-alpha** : croisement à mi-hauteur entre le plateau de fond local (p10 du profil) et le
  plateau de l'objet, **interpolé linéairement** entre les deux échantillons qui l'encadrent. Un
  « bord extérieur » est le croisement du côté du fond, un « bord intérieur » celui du côté de l'objet ;
  le « centre » d'un filet est la moyenne des deux.
- **Échelles** (données par le dossier, non déduites) : contenu d'écran **3,6 px / px CSS** des deux
  côtés ⇒ comparaison directe en px. Chrome **2,755 px / px CSS-HUD** ; canon HUD `hud-canon-1176.png`
  ramené à l'échelle client par **×0,9184** (2,755 ⁄ 3).
- **Halo** : voir la section dédiée — plateau, vallée, barycentre, symétrie, largeur, tous définis
  avant le premier chiffre.
- **Coiffe** : « SOMBRE » = `(B−R) ≤ 12 et L < 45` (cheveux/torse : réf (22,25,27), jeu (22,22,28)) ;
  « FOND de carte » = `(B−R) ≥ 15` (réf (17,24,35), jeu (13,22,34)). Le discriminant est la **teinte**,
  pas la luminance — les deux sont sombres.
- Toute couleur d'aplat est la **médiane** d'une fenêtre 9×9 prise à ≥ 3 px de tout bord.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

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
| 22 | reflet du miroir dans le tiers haut du panneau (ASSUMÉ) | 30,7 % | **33,1 %** | tenu | `m14` |

Tous les contrôles négatifs de ces scripts sont dans les annexes ; deux ont **échoué et ont été
remplacés**, c'est écrit là où ça compte (§ « ce que je n'ai pas pu vérifier » et annexe 4).

---

## 0. L'écran, tel que la maquette le dit

**But.** On vient lire ce que le lieutenant a **absorbé** des règles qu'on lui a données. L'écran est
**un portrait** : on ne lit pas un tableau de bord, on lit quelqu'un.

**Ordre de lecture.** (1) « **Le miroir** », or, sérif, capitale de 45 px, seul objet chaud du haut ;
(2) la **rangée de trois compteurs** cyan, qui brillent — c'est la seule couleur froide vive de l'écran
et elle appelle l'œil immédiatement après le titre ; (3) le **portrait** dans sa carte cerclée d'or, à
gauche, avec ses quatre indices de tenue à droite ; (4) le **panneau d'explication** en bas, sérif clair ;
(5) le **CTA** or plein, « DONNER UNE PREMIÈRE RÈGLE ».

**Zones.** enseigne (titre + sous-titre, filet or de clôture) · rangée de 3 compteurs · panneau
élastique (carte portrait + colonne des 4 tuiles) · panneau d'explication · CTA.

**Traits d'identité.** ① les trois compteurs cyan **qui rayonnent** dans des boîtes creusées en dégradé ;
② la carte portrait cerclée d'or, **contenue** dans son panneau, avec un reflet de miroir qui la
traverse ; ③ le bleu nuit froid partout, l'or réservé au titre, au cadre et à l'action ; ④ un cadre qui
**remplit** l'espace disponible sous le chrome ; ⑤ le buste, dont la silhouette sombre **enferme** le
visage.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

À 1080×2400, oui pour l'essentiel : même but, même ordre de lecture, même palette, mêmes textes en
français, mêmes contrastes (13 grandeurs typographiques et 6 jetons de couleur à 0 ou 1/255). La
géométrie fine est bonne : le cadre fait 1 px de plus que celui de la maquette sur 1627, la carte
portrait 0,4 px sur 421, les capitales sont identiques au pixel.

Ce qui change la lecture, dans l'ordre de ce qu'un joueur perçoit :

1. **L'écran est trop grand pour son contenu.** Entre le chrome et le cadre il y a **250 px de vide**
   (au-delà de la bande de 89 px désormais réservée au losange), et **137 px de vide dans le cadre sous
   le CTA**. Au total **387 px, 16 % de la hauteur de l'écran**, que la maquette n'a pas : elle remplit
   97,5 % de sa zone libre *(chiffre du dossier)*, le jeu **82,9 %** *(mesuré)*. L'œil descend du manomètre et ne rencontre rien pendant
   un quart de seconde ; puis le bloc s'arrête bien avant le dock. Le trait d'identité ④ est perdu.
2. **Les compteurs ne brillent plus du tout.** Dans la maquette ils rayonnent : à 4 px du chiffre le
   fond est encore éclairé de 25 points, et la lueur porte sur 18 px. Dans le jeu, le fond vaut
   **(13,13,22) exactement** à 2, 4, 10 et 20 px du chiffre, dans toutes les directions — pas un halo
   faible, pas un halo mal placé : **rien**. Les boîtes, en plus, sont des aplats là où la maquette
   creuse un dégradé. Le trait d'identité ① est perdu : la rangée passe de « trois voyants allumés »
   à « trois nombres posés sur du noir ».
3. **Le portrait est un peu cassé, et il ne tient plus dans sa boîte.** Le panneau élastique a perdu
   **89,7 px (−11,8 %)** pendant que le cadre gardait sa hauteur : la carte or **sort de 9,9 px** par le
   bas, les quatre tuiles sont **8 % plus courtes**, et la silhouette sombre de la tête **s'interrompt
   sur 12 rangées** exactement à la largeur maximale du visage — la peau y touche le fond de la carte
   sans aucun contour (référence : 0 rangée). Le trait d'identité ⑤ est entamé.

À 1080×1920, l'écran perd son action : le CTA n'est plus là, et **rien ne dit qu'il existe** (0 px
d'ascenseur, marge interne droite mesurée à 6,8 pts d'amplitude, soit exactement la marge gauche prise
comme témoin ; le cadre se referme par son filet or 8,5 px sous le dernier panneau, ce qui se lit comme
une fin). Le régime défilable est assumé — l'absence d'indice ne l'est pas.

---

## Le halo — certification

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

**Verdict de certification : l'Underlay ne produit AUCUN pixel.** Ce n'est pas un halo faible, ce n'est
pas une tache mal placée : le fond du compteur est **strictement constant** — (13,13,22) au bit près —
à 2 px comme à 30 px du glyphe, au-dessus comme au-dessous, sur les trois compteurs et aux deux
résolutions. Le plateau et la vallée ne sont pas « hors tolérance », ils n'ont pas d'objet.

Corroboration indépendante, par un instrument qui ne connaît pas la méthode ci-dessus : le comptage
des pixels de la **famille cyan** sur toute l'image (`m20`) rend **4 468 px** dans la référence contre
**2 362 px** dans le jeu — et l'emprise verticale du cyan passe de `y145..1758` à `y748..786`, c'est-à-dire
**aux seuls glyphes**.

**Classe de cause** (sans nommer de ligne) : c'est le cas d'école du projet — *une garde sur les
PARAMÈTRES d'un effet n'est pas une garde sur son EFFET*. Les trois réglages déclarés (amplitude 1/2,13,
dilatation 0,12, douceur 0,55) peuvent être présents, valides et dans leur domaine, et le seuil
d'existence de l'effet ne se déduit pas de la plage du paramètre. La seule mesure qui tranche est un
comptage de pixels — ici il rend **zéro**.

**Ce qui a changé depuis le r14** : le r14 mesurait une **tache fixe** posée sous le glyphe (lumière
0,0 au-dessus / 643,3 au-dessous, barycentre décalé de +18,4 / +16,5 / +13,1 px). Cette tache a
disparu ; **rien ne l'a remplacée**. L'écart à la maquette n'est donc pas fermé, il a changé de forme.

---

## Le cadre et son vide

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
| occupation du cadre par le contenu | **96,4 %** | **90,0 %** | 97,6 % |

**Réponse à la question posée** — « y a-t-il PLUS de vide que les 21 CSS du canon, et de combien ? » :

- Contre la **référence rendue** (l'image qui fait autorité) : **16,11 CSS de vide**, réparti
  symétriquement 29,0 / 29,0 px. Le jeu à 2400 : **45,14 CSS**, réparti 25,5 / 137,0 px.
  ⇒ **excédent = 29,03 CSS (104,5 px), entièrement en bas.**
- Contre les **21 CSS annoncés du canon** : **excédent = 24,14 CSS (86,9 px).**
- La déclaration de la ligne GO (**cadre 462,00 / contenu 432,39 / vide 29,61 / excédent 8,6 CSS**)
  **n'est pas reproductible sur l'image**, et son excédent est **3,4× trop petit** :
  - son repère est décalé d'un **+9,88 CSS constant** sur le cadre — 462,00 déclaré contre 452,22 dessiné
    à 2400, et 393,21 déclaré contre 383,33 dessiné à 1920 : *le même écart deux fois*, donc une
    convention (padding ou boîte de mise en page), pas une erreur de mesure ;
  - mais en appliquant le même décalage au contenu (432,39 → 422,5 CSS), on reste à **17,6 CSS** du
    contenu réellement dessiné (404,86 CSS). Le vide déclaré (29,61 CSS) reste **15,5 CSS en dessous**
    du vide mesuré (45,14 CSS).
  ⇒ Je ne peux pas dire *où* est l'erreur du triplet déclaré ; je peux dire que **le vide que le joueur
  voit est de 45,1 CSS**, dont **38,1 CSS d'un seul bloc sous le CTA**, et que la déclaration en
  annonce 29,6 réparti.

**Et le vide hors du cadre, à 2400** : l'inset haut publié vaut 275,0 u = **232,0 px** ; le cadre
commence à 481,5 ⇒ **249,5 px de bande morte à l'intérieur même de la zone libre**, après la bande de
89 px désormais réservée au losange. Le dock commence à 2195 ⇒ zone libre = 1963 px, cadre = 1628 px :
**82,9 %**. À 1920 la même mesure donne zone libre 1483 px, cadre 1380 px : **93,1 %**. La maquette,
elle, remplit **97,5 %** *(zone libre dérivée du dossier, non remesurée)*. Le cadre a une hauteur fixe (452 CSS dessinés) : à 2400 il ne peut pas
remplir, et le vide se répartit 250 px au-dessus + 85 px au-dessous.

---

## Le régime 16:9 (1080×1920)

**Ce que le joueur voit sans défiler** : le titre et son sous-titre, les trois compteurs, le panneau
élastique entier (portrait + les 4 tuiles, aucune tuile coupée), et le panneau d'explication **complet**
— sur-titre, titre sérif, et ses **3 lignes** de paragraphe (y1491..1579), exactement comme à 2400.
Le filet bas du cadre se referme à y1626..1629, **8,5 px** sous la dernière encre. Rien n'est coupé :
0 px d'encre sur les 4 bords de l'image (`m27`).

**Ce qu'il perd** : la boîte du CTA « DONNER UNE PREMIÈRE RÈGLE » — **13 550 px d'or à 2400 (y1882..1970), 0 px
entre le cadre et le dock à 1920** (y1631..1819 ; les 190 px d'or restants sont le soulignement de l'onglet PLUS, identique à 2400). C'est la seule action de l'écran.

**Sait-il qu'il y a une suite ?** Non. Sonde sur la marge interne droite du cadre, y260..1620 :
**amplitude maximale 6,8 pts**, aucune colonne au-dessus de 10 pts ; la marge interne **gauche**, prise
comme contrôle négatif (aucun ascenseur n'y est jamais dessiné), rend **la même valeur, 6,8 pts**.
Aucun ascenseur, aucun dégradé de bord, aucune flèche. Pire : le cadre **se referme par son filet or**
juste sous le dernier panneau — la clôture la plus explicite du vocabulaire de cet écran — et il reste
86 px de fond nu entre ce filet et le dock. Tout dit « c'est fini ».

**Vivable ?** **Non en l'état** — et je ne rouvre pas le régime défilable, qui est assumé et que je
n'ai pas les moyens de contredire depuis une image fixe. Ce que je remonte est **le critère de sortie
que le dossier attache lui-même à cet assumé** : « *que rien n'indique une suite* ». Il est mesuré vrai.

---

## Ce que le lot déclare — vérifié un par un

| déclaration | verdict | ce que j'ai mesuré |
|---|---|---|
| Le losange du chrome est **canonique** | **CONFIRMÉ** (par la source, pas par l'image) | `hud-brennar.html:55` définit `.medaillon .losange` : carré `7×7 px`, `rotate(45deg)`, `background: var(--laiton)`, `bottom:-11px`. Sur `hud-canon-1176.png` il est **invisible** : la pastille d'annotation ② recouvre exactement sa place. Le canon PNG ne peut donc pas servir de témoin ici — c'est dit en § 6. |
| Sa place n'était pas réservée ; elle l'est désormais | **CONFIRMÉ** | Inset haut publié 275,0 u = 232,0 px = bandeau (169,5 u = 143 px) + **105,5 u = 88,7 px** de bande réservée. À 1920 le filet haut du cadre est passé de **y162** (r14) à **y250** : **+88 px exactement**. |
| Après : filet à y = 254, losange y 215..228 ⇒ **24 px de garde, sorti du cadre** | **CONFIRMÉ** (22,0 px à ma convention) | Losange mi-alpha **y218,5..227,5**, x534,8..544,2, centre (539,5 ; 223,0) — **identique au dixième sur les 3 planches** du commit. Filet haut du cadre (ext) : **249,5** à 1920 ⇒ **garde 22,0 px = 8,0 CSS-HUD** ; **481,5** à 2400 ⇒ **garde 254,0 px**. Le médaillon (bas y201) est à **48,5 px** du cadre à 1920. **Plus aucun élément de chrome dans le cadre, aux deux résolutions.** B1 et B2 du r14 sont **FERMÉS**. |
| Le losange a sa bande sur le témoin ⑱ | **CONFIRMÉ, mais juste** | Même losange, même place (y218,5..227,5). La première encre large de ⑱ est à **y232**, soit **4,5 px** sous le losange. Je ne juge pas ⑱. |
| B1 à 1920 (CTA sous le filet bas) **fermé par disparition du champ** | **CONFIRMÉ sur la disparition, ROUVERT sur l'affordance** | Le CTA ne déborde plus : il n'existe plus dans le champ (**0 px d'or entre le cadre et le dock**, y1631..1819) et rien n'est coupé. Mais « rien n'indique une suite » est **mesuré vrai** ⇒ sortie d'assumé (`B1` ci-dessous). |
| **M2** (la carte sort de son panneau) : à trancher | **OUVERT, inchangé** | Bord bas du panneau mesuré dans la **colonne droite** (là où la carte ne peut pas le masquer), **bord EXTÉRIEUR** des deux côtés : panneau **1550,6**, filet or bas de la carte **1560,5** ⇒ **+9,9 px de débord** à 2400 ; **1318,6 / 1327,5 ⇒ +8,9 px** à 1920. Référence : panneau **1613,6**, carte **1532,5** ⇒ **−81,1 px** (la carte est bien dedans). r14 mesurait 8,5 / 9,0. |
| **M3** (le panneau élastique a perdu 89 px) : à trancher | **OUVERT, inchangé** | Hauteur du panneau, bord à bord (centres) : réf **763,3 px**, jeu **673,6 px** ⇒ **−89,7 px (−11,8 %)**, identique à 1920 (673,6 px). r14 mesurait −89 px / −11,6 %. |
| Le canon met **21 px CSS de vide** dans le cadre ; GO déclare 462,00 / 432,39 / **29,61** / excédent **8,6** | **NON REPRODUCTIBLE ; excédent 3,4× sous-estimé** | Voir § « Le cadre et son vide ». Mesuré : vide **45,14 CSS**, excédent **29,03 CSS** contre la référence et **24,14 CSS** contre les 21 annoncés. |
| **HALO** : Underlay TMP dans ce SHA | **L'EFFET NE PRODUIT AUCUN PIXEL** | Voir § « Le halo — certification ». `P(2) = 0,02 pts` (réf 25,11) ; `P(d≥3) = 0,00` exactement ; luminance brute **(13,13,22)** à 2, 4, 10, 20, 30 px de l'encre ; vallée 0,00 pts ; barycentre indéfini. |
| Réserve du correcteur : TD-659 vérifié **en jeu**, pas par sa garde | **PRISE EN COMPTE** | Ma certification ne repose sur **aucun vert de suite** : je n'ai lu ni test, ni journal, ni code. Toutes les valeurs ci-dessus viennent des trois PNG du dossier, avec les scripts de `mesures/`. |
| « AVANT : filet haut du cadre y = 166, losange 49 px sous le filet » | **NON VÉRIFIABLE** | Aucune planche « avant » n'est fournie. Je m'appuie sur `grandeurs-r14.md` (y162..164 à 1920), qui est une mesure rapportée, pas une image. |

---

## 3. Écarts

Un finding par ligne. `critère` = **NOUVEAU** dès que l'instrument ou la grandeur n'existait pas au r14.
Colonne **données** : oui = l'écart dépend du contenu du compte photographié ; non = géométrie, palette,
typographie, rythme — vrai quelles que soient les données.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | **BLOQUANT** | NOUVEAU | non | **1080×1920 — le CTA est hors champ et RIEN n'annonce une suite.** Le cadre se referme par son filet or juste sous le dernier panneau : la page se lit comme finie. Sortie d'assumé par le critère écrit dans le dossier lui-même. | Or de la boîte du CTA (y1882..1970) : **13 550 px à 2400** ; **0 px d'or entre le filet bas du cadre et le dock à 1920** (y1631..1819). Les seuls 190 px d'or sous le cadre à 1920 sont le soulignement de l'onglet actif PLUS (x802..839), **présents à l'identique à 2400** (190 px). Ascenseur : marge interne droite y260..1620, **amplitude 6,8 pts**, 0 colonne > 10 pts ; **contrôle négatif** = marge interne gauche, **6,8 pts** — identiques. Garde entre la dernière encre (1617,5) et le filet bas (1625,5) : **8,0 px**. Fond nu sous le cadre : **86 px** avant le dock (`m23`, `m05`) | que l'écran défile réellement — une image ne le montre pas. Je constate l'absence d'indice, pas l'absence de défilement. |
| `M1` | **MAJEUR** | NOUVEAU | non | **Le halo des compteurs ne produit aucun pixel.** La rangée passe de « trois voyants allumés » à « trois nombres sur du noir » — trait d'identité ① perdu. | `P(2)` **25,11 → 0,02 pts** ; `P(4..16)` **17,48/9,84/5,45/2,41 → 0,00/0,00/0,00/0,00** ; portée **d18 → d1** ; vallée **+1,57 → 0,00 pts** ; barycentre **(−1,0;+1,3) px → indéfini** ; luminance brute à 3/6/12/30 px **32,5/24,7/15,5/13,7 → 13,6/13,6/13,6/13,6** ; pixels cyan de l'image **4 468 → 2 362** (`m08`,`m09`,`m10`,`m20`) | si l'effet est éteint, mal paramétré ou masqué : l'image ne dit que « 0 pixel ». |
| `M2` | **MAJEUR** | DÉJÀ APPLIQUÉ | non | **Le cadre n'occupe que 83 % de sa zone libre : 250 px de vide entre le chrome et lui** (au-delà de la bande réservée), là où la maquette remplit 97,5 %. L'ancrage est inversé (maquette en bas, client en haut) et le cadre a une hauteur fixe. | inset 232,0 px → filet du cadre 481,5 ⇒ **249,5 px** ; du filet du bandeau (142) ⇒ **339,5 px**. Zone libre 232..2195 = 1963 px, cadre 1628 px ⇒ **82,9 %**. Maquette : 1627/1668 = **97,5 %** *(zone libre de la maquette dérivée du dossier : 434 px d'évocation de chrome, filet bas à y2078 sur 2102 — je ne l'ai pas remesurée)*. À 1920 : **93,1 %** (`m03`,`m25`,`m27`) | ce que le shell réserve exactement en bas (`TabDockHauteurCss` non imprimé) ; j'ai pris le haut des ronds du dock, y2195. |
| `M3` | **MAJEUR** | DÉJÀ APPLIQUÉ | non | **137 px de vide DANS le cadre sous le CTA** — le contenu ne remplit plus son cadre, et le vide n'est pas là où la maquette le met (elle le répartit 29/29). | garde bas **29,0 px (réf) → 137,0 px (jeu)**, garde haut 29,0 → 25,5 ; vide total **16,11 → 45,14 CSS** ; occupation du cadre **96,4 % → 90,0 %** (`m03`,`m05`) | — |
| `M4` | **MAJEUR** | DÉJÀ APPLIQUÉ | non | **Le panneau élastique a perdu 89,7 px (−11,8 %)** pendant que le cadre gardait sa hauteur. C'est la cause commune de `M5`, `m5` et `m10`. | hauteur du panneau (centre à centre) **763,3 → 673,6 px** ; identique à 1920 (673,6) ; vide sous la 4ᵉ tuile 165 px (21,6 %) → 138 px (20,5 %) (`m12`,`m13`) | — |
| `M5` | **MAJEUR** | DÉJÀ APPLIQUÉ | non | **La silhouette sombre de la tête s'interrompt sur 12 rangées, exactement à la largeur maximale du visage** : la peau touche le fond de la carte sans aucun contour. Le buste est l'élément héros de l'écran. | rangées où la peau est aussi large ou plus large que la silhouette : **réf 0 / jeu 12** (y1133..1144 à 2400, y901..912 à 1920, largeur de peau jusqu'à 137 px pour 0 px de sombre). Flancs sombres à 4 px du bord de peau : **réf 14/14 sondes, jeu 10/14** ; épaisseur latérale à 15 % de la hauteur du visage **18/18 px → 0/0 px** (`m18`) | si le couvre-chef du client est une **casquette** voulue (ruling DA) plutôt qu'une calotte : voir table ARBITRAGE. La rupture de contour, elle, ne dépend pas de ce choix. |
| `m1` | MINEUR | DÉJÀ APPLIQUÉ | non | La carte portrait **sort de son panneau par le bas**. | bords EXTÉRIEURS des deux côtés : carte 1560,5 − panneau 1550,6 = **+9,9 px** à 2400 ; 1327,5 − 1318,6 = **+8,9 px** à 1920 ; réf 1532,5 − 1613,6 = **−81,1 px** (`m12`) | — |
| `m2` | MINEUR | DÉJÀ APPLIQUÉ | non | Les 4 tuiles sont **8,7 % plus courtes** et leur rythme se resserre de 6,7 %. | hauteur (bord à bord) **98,0 → 89,5 px** ; pas haut-à-haut **115,0/115,8/115,0 → 107,2/107,2/107,5** ; offset de la 1ʳᵉ tuile dans le panneau **154,3 → 124,7 px** (`m04`,`m13`,`m29`) | — |
| `m3` | MINEUR | NOUVEAU | non | **Le gras sans-empattement porte moins d'encre à taille égale** ; l'aparté se replie sur 2 lignes au lieu de 3. Le sérif, lui, est identique (témoin). | épaisseur de trait (run médian, seuil à mi-hauteur, indépendant du réglage) : sous-titre **5,0 → 4,0 px (−20 %)**, libellé CTA **6,0 → 5,0 px (−17 %)**, **témoin sérif 9,0 → 9,0 px (0 %)**. Encre du sous-titre L1 **5 049 → 3 951 px (−21,7 %)**, L2 **1 349 → 1 002 px (−25,7 %)**. Aparté « ce qu'il a absorbé de vos règles » : **3 bandes → 2 bandes** (`m21`,`m28`) | — |
| `m4` | MINEUR | DÉJÀ APPLIQUÉ | non | **La bande intérieure haute du cadre porte une lueur CHAUDE là où la maquette en a une froide** — changement de famille de teinte, pic sous le médaillon. | médiane par colonne, bande y488..508 : bord **(16,22,31)** → pic **(43,37,33)** à x540 ; réf bord (17,24,34) → pic **(24,29,36)**. `R−B` : réf **−12** au pic (froid), jeu **+10** (chaud). Écart **+19/255 sur R** (`m22`) | la part imputable à l'état **BRÛLANT** du compte (la maquette est « tiède », donc son bloom est teal) : je ne peux pas la séparer depuis une image. |
| `m5` | MINEUR | DÉJÀ APPLIQUÉ | non | Le fond de la boîte de compteur est un **aplat** là où la maquette creuse un dégradé vertical. | médianes de rangée dans la boîte 1 : réf **(14,22,30) → (10,14,22) → (15,23,30)** ; jeu **(13,13,22) partout, amplitude 0/0/0**. Écart max au bord haut **9/255 sur G, 8/255 sur B** (`m32`) | — |
| `m6` | MINEUR | DÉJÀ APPLIQUÉ | non | L'en-tête de la colonne droite reste serré. | « Pas encore / jugeable », pas haut-à-haut **42 → 35 px (−16,7 %)** ; témoin : les 3 lignes du paragraphe du panneau bas restent à 33/33 (`m26`) | — |
| `m7` | MINEUR | DÉJÀ APPLIQUÉ | non | Le bloc enseigne est plus court : le filet or remonte de 6 px. | offset du filet or depuis le filet du cadre : **211..217 → 205..211** (2400) et **204..211** (1920) (`m26`) | — |
| `m8` | MINEUR | DÉJÀ APPLIQUÉ | non | Le cadre est 5 px plus large et colle 3 px plus près du bord ; ses filets sont 1 px plus épais. | hors-tout rail à rail **1035,0 → 1040,4 px (+5,3)** ; marges d'écran **21/21 → 18/18 px** ; épaisseur des filets horizontaux **3,0 → 4,0 px** (`m03`,`m29`) | — |
| `m9` | MINEUR | DÉJÀ APPLIQUÉ | non | La boîte du CTA est 6 % plus basse (et 8 px plus large). | **1952..2046 = 95 px → 1882..1970 = 89 px (−6,3 %)** ; largeur rail à rail **980 → 988 px** ; libellé identique (capitale 22 px, contraste 11,22 → 11,44) (`m26`,`m33`) | — |
| `m10` | MINEUR | DÉJÀ APPLIQUÉ | non | Le visage est 8,7 % plus large pour 1,8 % de haut en plus — la transformation n'est pas homothétique. | largeur max de peau **126 → 137 px** ; hauteur du visage **124 → 129 px** ; largeur max de la silhouette sombre **152 → 155 px** (`m17`,`m18`) | — |
| `m11` | MINEUR | DÉJÀ APPLIQUÉ | non | Le col (triangle crème) est 45 % plus haut à largeur égale. | boîte **61×40 (aire 1 330) → 60×58 (aire 1 788)** ; reste un triangle (remplissage **0,55 → 0,51**) et reste centré sur l'axe du cou (**x 293,0 → 290,5**) (`m26`) | — |
| `m12` | MINEUR | DÉJÀ APPLIQUÉ | non | La ligne de balayage est plus forte et atteint les **deux** bords du panneau. | pic **81,6 → 95,8 pts (+17,4 %)** ; largeur à 10 % du pic **885 px (90,8 % du panneau) → 960 px (97,8 %)**, soit x60..1019 = bord à bord ; à 25 % **813 → 851 px** ; épaisseur mi-alpha **8,0 → 6,6 px** (`m14`,`m15`) | mon profil soustrait le fond verticalement (d = 16 px) ; r14 mesurait sans cette soustraction et trouvait +24,9 % à 25 % — mon écart est plus petit (+4,7 %). Les deux mesures sont dans le rapport, la mienne est décrite. |
| `m13` | MINEUR | NOUVEAU | non | **Le losange du chrome est ~2,9× trop petit** par rapport à sa définition canonique (sa position, elle, est juste). | mesuré **9,5 × 9,0 px** ; attendu **27,3 px** de diagonale (carré 7×7 CSS tourné à 45° → 9,90 CSS × 2,755). Position : bas mesuré **227,5 px**, attendu **225,9 px** ⇒ **+1,6 px** (`m25`) | la taille n'est **pas mesurable sur `hud-canon-1176.png`** (la pastille ② couvre la place) : elle est dérivée de la CSS, qui est une aide de lecture et ne prime pas sur l'image. À confirmer sur un canon HUD non annoté. |

**Cause commune signalée** : `M4` (panneau raccourci de 89,7 px) produit `m1`, `m2`, `m6` et une partie
de `M3`. `M2` et `M3` sont deux faces du même fait — un cadre de hauteur **fixe** dans une zone libre
plus grande que lui.

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce qu'on voit | rendu proprement ? | mesure |
|---|---|---|
| compteur ENFREINTES à « — » et non « 00 » | **OUI** | Le tiret est du **même jeton exact** que les chiffres : (127,212,217), **0/255**. Centré horizontalement dans sa boîte (**x 875,8** pour un centre de boîte à **875,5**). Son centre vertical est à **771,5** contre **767,0** pour les chiffres (4,5 px plus bas) — c'est la position normale d'un tiret dans sa fonte, pas un décalage de boîte. Il se lit comme un trou, pas comme une panne. |
| col rendu par un TRIANGLE plein | **OUI** | remplissage aire/boîte **0,51** (le critère de sortie est ~0,9) ; centré sur l'axe du cou (x 290,5 contre 293,0 en réf) ; ne recouvre pas le cou. Sa taille a changé : voir `m11`. |
| reflet du miroir FIXE | **OUI** | rangée du balayage à **33,1 %** de la hauteur du panneau (réf 30,7 %) — dans le tiers haut, présent. |
| 4 couleurs hors `DesignTokens` | **OUI** | les couleurs RENDUES tiennent : fond de carte (17,24,35)→(13,22,34), torse (22,25,27)→(22,22,28), crème (185,173,146)→(185,173,146), vert (125,179,106)→(125,179,106). |
| nom du lieutenant = celui du compte | **OUI** | « **LT. TULL, VOTRE LIEUTENANT** ». Ni « SALVATORE » en dur, ni la mention « lieutenant.name — non projeté (L0.4) » que porte la référence : elle est **absente** de la capture. |
| pas de section « gages » | **OUI** | aucune place réservée vide : le panneau élastique enchaîne carte + 4 tuiles, puis le panneau d'explication. |
| tiret « — » à la place de la PHASE (bandeau) | **OUI** | ARGENT (**9 627 820,00 €**) et JOUR (**50**) sont alimentés ; le médaillon porte « Brûlant / CHALEUR », pas « Unknown ». Seule la phase est à « — ». |
| ronds du dock sans icône | **OUI** | 4 ronds complets, aucun coupé, libellés EMPIRE / FAMILLE / FILIÈRE / PLUS lisibles. |
| roster / règles / chiffres non comparables à un corps | **OUI** | aucun slug, aucune clé brute, aucun mot anglais, aucun nom vide dans le contenu de l'écran. |
| à 1080×1920, le CTA est sous la ligne de flottaison | **NON — l'assumé est SORTI** | Son propre critère de sortie (« *que rien n'indique une suite* ») est **mesuré vrai** : 0 px d'ascenseur, marge droite = marge gauche témoin (6,8 pts), et le cadre se referme par son filet or. ⇒ remonté en `B1`. Les deux autres critères de sortie **ne sont pas** atteints : rien n'est coupé, et le titre n'est pas masqué. |

---

## ARBITRAGES

| point | pourquoi ce n'est pas un défaut d'implémentation |
|---|---|
| **Famille de police du SÉRIF** | La source série 6 déclare **`Georgia,serif` 69 fois** (`ecrans-brennar-6.html`) ; `fc-match Georgia` sur cette machine rend **Noto Serif**, et le client embarque **DejaVu Serif**. La référence n'a donc **jamais montré Georgia**, et le sérif n'est **pas** partagé entre référence et client — contrairement au sans-empattement (`'DejaVu Sans'`, partagé). Ce que je peux comparer, la **hauteur de capitale**, est identique : 45/45, 34/34, 22/22 px. Rien à corriger. *(Précision de dossier : la note du dossier ne mentionne que le `'DejaVu Sans'` de la série 6.)* |
| **Libellés anglais dans la RÉFÉRENCE** | La maquette porte « HEAT » et « $ 24 850 » ; le client porte « CHALEUR » et « 9 627 820,00 € ». Ruling « fr réel » : le client a raison, **la maquette est à mettre à jour**. Noté une fois. |
| **Ronds du dock sans icône** | Arbitrage user connu. |
| **Couvre-chef du buste** | La référence donne une **calotte arrondie qui descend sur les tempes** ; le jeu donne une **coiffe à sommet plat avec une arête horizontale nette en travers du front** et les tempes nues. Si c'est l'application du ruling DA « homme à casquette », c'est un arbitrage et la référence est en retard. Depuis l'image je ne peux pas trancher l'intention. La **rupture de contour** qui l'accompagne (`M5`) ne dépend pas de ce choix et reste un écart. |
| **Aile ARGENT / flèche retour** | Tranchés (à retirer) : mesurés, non comptés. |
| **Heure absente du bandeau** | Forme F déclarée au dossier ; non comptée. |
| **Onglet « FILIÈRE » là où le canon HUD porte « MARCHÉ »** | Chrome partagé, hors ㊲ ; signalé une fois, non compté. |

---

## 5. Autres résolutions

**1080×1920** — l'inventaire du temps 2 tient pour tout ce qui reste dans le champ : mêmes jetons,
mêmes largeurs (cadre 1040,4 px, carte 421,4 px, boîtes de compteur 311,6 px), mêmes textes, même
panneau élastique (673,6 px, débord de la carte 8,9 px). Rien n'est coupé, rien ne déborde de son
parent, l'ordre de lecture est conservé jusqu'au panneau d'explication.

Écarts **propres à 1920** :
- `B1` (ci-dessus) : le CTA hors champ sans indice de suite.
- Le cadre y remplit **93,1 %** de la zone libre contre 82,9 % à 2400 — la mise en page est **meilleure**
  à 1920 : c'est le cadre à hauteur fixe qui ne suit pas l'agrandissement de la zone libre à 2400.
- La lueur chaude du haut de cadre y est un peu moins forte : pic **(39,35,34)**, `R−B = +5`, contre
  (43,37,33) et `+10` à 2400.

Les deux planches sont issues du **même commit** et le chrome y est **rigoureusement identique**
(losange à 0,0 px près, filet du bandeau à y141..142 dans les deux).

---

## 6. Ce que je n'ai pas pu vérifier

- **Aucune animation vérifiable.** Le dossier ne fournit **aucune paire T / T+1 s** (déclaré : test tué
  ce tour). Le ruling « aucune animation sur un nouvel écran » reste **non contrôlé**. La mesure qui
  trancherait : deux captures du même état à 1 s d'intervalle, et un compte de pixels différents hors
  chrome.
- **Aucune comparaison de VALEUR.** L'identité du compte photographié est **déclarée par la ligne GO et
  non relue** (`journal-declare.txt` est une transcription, aucun journal n'est joint). Je n'ai donc
  comparé aucun nombre de la planche à un corps de réponse ; seule la **forme** est jugée. La mesure qui
  trancherait : la ligne `[DemoIdentityResolver] régime=env identité=…` du run, jointe au dossier.
- **Le défilement lui-même.** Une image ne prouve pas qu'un écran défile. Je constate l'absence
  d'affordance, pas l'absence de défilement. La mesure qui trancherait : une capture après défilement,
  ou une paire haut/bas.
- **La taille canonique du losange.** Non mesurable sur `hud-canon-1176.png` : la **pastille d'annotation
  ②** recouvre exactement sa place. La valeur attendue (27,3 px) vient de la **CSS**, qui est une aide de
  lecture et ne prime pas sur l'image. La mesure qui trancherait : un rendu du HUD **sans la couche
  d'annotation**.
- **La part de la lueur chaude imputable à l'état BRÛLANT.** La maquette est « tiède » (bloom teal), le
  compte est « brûlant » (bloom braise) : je peux mesurer le changement de famille de teinte, pas le
  séparer de l'état. La mesure qui trancherait : une planche du même écran sur un compte **calme**.
- **Le triplet déclaré 462,00 / 432,39 / 29,61 CSS.** Je peux montrer qu'il n'est pas reproductible sur
  l'image et que son repère est décalé de +9,88 CSS sur le cadre ; je ne peux pas dire **où** son
  « contenu » est mesuré. La mesure qui trancherait : le rect imprimé par le test (non préservé), ou le
  repère explicite de la mesure.
- **Défaut de dossier** : la section **« C. Le halo au r14 »** de `grandeurs-r14.md` est un **bloc de
  code vide**. J'ai dû reconstruire la convention du r14 depuis l'en-tête du fichier et depuis les
  lignes M1 et m9. Ce que je rapporte comme « convention r14 » est donc partiellement déduit ; ma propre
  convention, elle, est écrite en tête de la section halo.
- **Dénominateur de la ligne GO, recopié tel quel** : (b) paire T/T+1 **NON ÉTABLI** ; (f) état vide ET
  état riche **NON ÉTABLI** ; (g) SHA de l'arbre au run **non imprimé** ; (c) onglet actif asserté et
  (d) `[CHROME-ALIMENTE]` par planche : **inconnus pour ㊲**.
- **Deux contrôles négatifs de mes propres scripts ont échoué et ont été remplacés** — c'est dans
  l'annexe 4, et c'est ce qui a corrigé deux mesures : (i) `m17` rendait « **toutes** les rangées du
  visage touchent le fond sans sombre » (124/129/130), un résultat **uniforme** donc suspect : il
  mesurait la frange d'anti-crénelage, pas le contour ; `m18` saute 3 px de frange et rend **0 / 12**.
  (ii) `m29` cherchait un pas commun en minimisant un résidu **absolu**, ce qui fait toujours gagner le
  plus petit pas ; `m30` minimise le résidu **normalisé** et compare à un tirage aléatoire.

---

## Addendum — Positions rondes ou régulières ?

*(question posée après la mesure ; ne change aucun verdict ci-dessus)*

**Ce que j'ai mesuré.** 20 bords horizontaux et 9 bords verticaux de `capture-1080x2400.png`, en
mi-alpha **sous-pixel** (`m29`), puis la même série sur `reference-1080x2102.png` comme **témoin
d'instrument** (`m31`) — un rendu navigateur, qui n'a aucune raison d'être aligné sur une grille Unity.

**Bords horizontaux (centres, jeu 2400)** : 483,465 · 511,884 · 690,023 · 727,974 · 839,799 · 875,366 ·
904,383 · 998,126 · 1098,250 · 1101,254 · 1212,520 · 1320,068 · 1408,948 · 1548,954 · 1558,568 ·
1585,001 · 1847,776 · 1883,469 · 1968,526 · 2107,523.

**Bords verticaux (centres, jeu 2400)** : 19,311 · 47,411 · 79,500 · 359,002 · 383,849 · 500,896 ·
719,998 · 1031,589 · 1059,689.

**Recherche d'un pas commun** (résidu **normalisé** `r/p`, p balayé de 8 à 400 px par 1/64 px ; un vrai
pas donne `r/p ≪ 0,25`, du bruit ~0,25) :

| série | meilleur p | résidu | r/p |
|---|---|---|---|
| 20 bords horizontaux | 34,656 px | 12,03 px | **0,347** |
| 9 bords verticaux | 21,094 px | 5,35 px | **0,254** |
| *[ctrl positif]* série bâtie sur 107,5 px | 10,75 px | 0,00 px | **0,000** |
| *[ctrl négatif]* 20 tirages uniformes | 22,188 px | 6,89 px | 0,311 |
| *[ctrl négatif]* 9 tirages uniformes | 33,938 px | 8,04 px | 0,237 |

Les deux séries du jeu sont **aussi irrégulières, ou plus, que du bruit** : `0,347` contre `0,311`
pour 20 tirages aléatoires, `0,254` contre `0,237` pour 9. **Aucun pas commun.**

**Coordonnées « trop propres » ?** 9 des 20 bords horizontaux tombent à moins de 0,05 px d'un entier ou
d'un demi — apparemment un excès (4/20 attendus). **Mais le témoin réfute l'imputation** : la même sonde
sur la **référence** (rendu navigateur, hors de toute grille Unity) en trouve **11 sur 18**, donc
davantage. Le groupement est fabriqué par mon estimateur mi-alpha, qui rend exactement `x,500` chaque
fois qu'un filet propre de 3–4 px est encadré par deux plateaux nets. **Ce n'est pas une propriété du
rendu du client.**

**Régularités réelles, et ce qu'elles valent :**
- Le **centre horizontal** du cadre est **539,500** et celui du losange **539,500**, soit exactement
  `(1080−1)/2`. Attendu : deux éléments centrés. La référence donne **539,500** aussi.
- Les **boîtes de compteur** ont deux bords à 0,002 px d'un entier (bord droit de la boîte 1 = **359,002**,
  bord gauche de la boîte 3 = **719,998**). Mais leur **pas n'est pas régulier** : 336,438 puis 336,149 px
  (jitter **0,29 px**), et les bords extérieurs sont séparés de 360,996 px, pas 361,000. Une grille les
  aurait rendus identiques.
- Les **tuiles** : pas **107,197 / 107,548 px** (jitter 0,35 px) — non rond, non régulier. Dans la
  **référence** au contraire les trois bords hauts mesurés partagent la **même partie fractionnaire
  (0,074)** et un pas de 115,500 / 115,000 : c'est la *maquette* qui est régulière, pas le jeu.
- **Aucun alignement inexpliqué** : sur les 190 paires de bords horizontaux, une seule paire est à moins
  de 4 px (bas de la tuile 1 à 1098,250 et haut de la tuile 2 à 1101,254, écart 3,004 px) — et elle est
  **contaminée**, la ligne de balayage passe exactement là.

**Réponse : pas commun : aucun** (meilleur candidat 34,66 px, résidu 12,03 px, `r/p` = 0,347 — moins
régulier qu'un tirage aléatoire de même taille, `r/p` = 0,311).

Rapport : `/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r15-2026-09-07/rapport.md`

---

## Annexes

### 1. Inventaire de la référence (`reference-1080x2102.png`, cadre #120)

| id | partie | bbox (px) | forme / remplissage | texte |
|---|---|---|---|---|
| `R.cadre` | cadre | y451,5..2078,5, x20,5..1058,5 | rect, filet or 3 px (176,141,62), fond dégradé (17,24,34)→(20,28,30) | — |
| `R.enseigne` | panneau de titre | y480,3..669,6 | rect, bord (42,54,72), clos par un filet or 663..669 | « Le miroir » or (242,201,107), capitale **45 px**, contraste 11,91 ; sous-titre 2 lignes, capitale 18 px, contraste 8,37 |
| `R.compteurs` | 3 boîtes | y701,4..815,6 ; x 51,0 / 384,8 / 718,8 (centres de bord gauche), largeur 309,1 | rect, fond **en dégradé** (14,22,30)→(10,14,22)→(15,23,30) | « 00 » cyan (127,212,217), 67×37 px, **halo P(2)=25,11 pts, portée 18 px** ; libellés gris |
| `R.elast` | panneau élastique | y847,0..1613,6, **hauteur 763,3** | rect, bord (42,54,72), fond (9,11,12) | — |
| `R.carte` | carte portrait | y876,5..1532,5, x81,5..505,5, **421,0×653** | rect, filet or, fond (17,24,35) | « LT. HARA, VOTRE LIEUTENANT » ; « Il vous écoute » vert (125,179,106) ; mention « lieutenant.name — non projeté (L0.4) » |
| `R.buste` | silhouette | visage y1099..1222, largeur max 126 px | sombre (22,25,27) **enfermant le visage sur 14/14 sondes** ; peau (185,173,146) ; col crème 61×40, remplissage 0,55 | — |
| `R.tuiles` | 4 tuiles | y1001..1447, hauteur **98,0**, pas **115,0/115,8/115,0** | rect, bord clair | titres crème + sous-titres gris, contraste 7,14..8,02 |
| `R.balayage` | reflet | y1086, épaisseur 8,0 px | ligne teal, pic **81,6 pts**, 90,8 % de la largeur du panneau à 10 % | — |
| `R.pannbas` | panneau d'explication | y1646,5..1919,6 | rect | sur-titre (capitale 8 px), titre sérif (capitale **34 px**, contraste 13,57), 3 lignes de paragraphe au pas 33/32 |
| `R.cta` | bouton | y1951,5..2046,5, **980×95** | rect, filet or | « DONNER UNE PREMIÈRE RÈGLE », capitale **22 px**, contraste 11,22 |

**Couche globale (réf)** : luminance moyenne du cadre **31,84**, densité d'encre **10,89 %** ;
jetons dominants (aires) or vif 14 426 px, crème 10 070 px, cyan 4 468 px, vert 2 096 px ;
vide dans le cadre **58 px (29,0 haut / 29,0 bas)** ; occupation **96,4 %**.

### 2. Inventaire de la capture (`capture-1080x2400.png`)

Mêmes parties, mêmes catégories, aucune partie EN TROP, aucune partie ABSENTE au niveau des blocs.
Différences de fiche par rapport à l'annexe 1 :

- `J.cadre` y481,5..2109,5, x17,5..1061,5 — **1628,0 px** (+1), largeur **1040,4** (+5,4), filets **4 px**,
  fond de la bande haute **(43,37,33) au pic sous le médaillon** (chaud, `R−B = +10`).
- `J.enseigne` y510,1..693,5 — filet or à **205..211** d'offset (−6).
- `J.compteurs` y726,3..841,6, largeur 311,6 (+0,8 %) — fond **aplat (13,13,22), amplitude 0** ;
  « 00 » 62×37 px, **halo P(2)=0,02 pts, portée 0** ; 3ᵉ compteur = tiret, même jeton cyan.
- `J.elast` y873,3..1550,6, **hauteur 673,6 (−11,8 %)**.
- `J.carte` y902,5..1560,5, **421,4×658** — **dépasse le panneau de 9,9 px**.
- `J.buste` visage y1118..1246, largeur max **137 px** ; **12 rangées sans contour** (y1133..1144) ;
  col 60×58, remplissage 0,51.
- `J.tuiles` y997..1411, hauteur **89,5**, pas **107,2/107,2/107,5**.
- `J.balayage` y1098, épaisseur 6,6 px, pic **95,8 pts**, **97,8 %** de la largeur du panneau à 10 %.
- `J.pannbas` y1583,5..1849,5 — sur-titre capitale 9 px, titre capitale 34 px, 3 lignes au pas 33/33.
- `J.cta` y1881,5..1970,5, **988×89** ; **137,0 px de vide** entre son filet bas et le filet du cadre.
- Chrome : filet du bandeau y141..142 ; médaillon (braise) bas y201 ; **losange y218,5..227,5**,
  9,5×9,0 px ; dock : 4 ronds y2195..2289, libellés y2300..2341.

**Couche globale (jeu 2400)** : luminance moyenne du cadre **31,19** (−2,0 %), densité d'encre
**10,54 %** (−3,2 %) ; or vif 14 078 px (−2,4 %), crème 9 556 px (−5,1 %), **cyan 2 362 px (−47,1 %)**,
vert 2 098 px (+0,1 %) ; vide dans le cadre **162,5 px (25,5 haut / 137,0 bas)** ; occupation **90,0 %**.

### 3. Correspondance des repères

| plan | facteur | origine |
|---|---|---|
| contenu d'écran, référence | 3,6 px / px CSS | dossier |
| contenu d'écran, capture | 3,6 px / px CSS | dossier ⇒ **rapport 1,00**, comparaison en px directe |
| chrome, capture | 2,755 px / px CSS-HUD | dossier (`AppShell.Px`) |
| canon HUD → capture | **×0,9184** (2,755 ⁄ 3) | vérifié : filet du bandeau canon y153..155 → **140,5..142,3** ; capture **141..142**, écart **0 px** |
| alignement vertical réf ↔ jeu (2400) | **offset +30,0 px** (jeu = réf + 30,0) | filet haut du cadre 451,5 → 481,5 ; filet bas 2078,5 → 2109,5 (+31,0). Toute mesure du § 3 cite ses deux valeurs absolues, jamais une soustraction faite avec cet offset. |
| alignement vertical réf ↔ jeu (1920) | offset **−202,0 px** | filet haut 451,5 → 249,5 |

### 4. Scripts — `mesures/*.py`

| script | grandeur | contrôle positif | contrôle négatif |
|---|---|---|---|
| `common.py` | helpers (mi-alpha, médianes, contraste WCAG) | contraste blanc/noir = **21,0** | contraste blanc/blanc = **1,0** |
| `m01_geometrie.py` | rangées à forte densité or | filets du cadre trouvés dans les 3 images | — |
| `m02_chrome_losange.py` | objets or sous le bandeau | losange trouvé sur les 3 planches | bande y300..340 à 2400 : **0 objet** |
| `m03_cadre_vide.py` | filets du cadre, contenu, gardes | rails du cadre trouvés partout | hors cadre : **0 rangée d'encre** (réf) — *à 2400 le contrôle a rendu 41, mon détecteur d'encre suivait le dégradé de fond ; les gardes ont été reprises par `m04`+`m05` sur les bords de panneau* |
| `m04_structures.py` | lignes horizontales de structure | les filets or du cadre sortent | — |
| `m05_bas.py` | dernier contenu, vide bas, dock | dock trouvé aux 2 résolutions | 30 px sous le cadre : **0** (jeu) ; **2** en réf = le bord arrondi du `.tel`, attendu |
| `m06/m07` | boîtes de compteur, cœur de l'encre cyan | largeurs voisines pour les 2 premiers compteurs de la réf (67/68 px) | cœur cyan dans le bas de la boîte : **0** |
| `m08/m09_halo` | `P(d)`, plateau, vallée, barycentre, symétrie, largeur | réf `P(2)=25,11` ≫ 0 | 8 rangées sans encre : excès **0,000 pt** (jeu) |
| `m10_halo_absolu.py` | **garde anti-vacuité** : luminance BRUTE | réf : décroissance 32,5 → 13,7 | rangée sans encre : min = max = **13,6** |
| `m11/m12` | panneau élastique, débord de la carte | bord haut du panneau retrouvé au même y que `m04` | 40 px sous le bord bas : amplitude 10,5 pts |
| `m13/m14/m15` | tuiles, ligne de balayage | pic du balayage sur la rangée trouvée par `m04` | *le contrôle « 40 px plus haut » a échoué (92,9 pts) : il tombait sur un bord de tuile ; la mesure retenue est le profil différentiel vertical, décrit dans `m12`* |
| `m16/m17/m18` | coiffe, visage | réf : flancs sombres **14/14** sondes | `m17` a rendu un résultat **uniforme** (toutes les rangées) ⇒ instrument corrigé en `m18` (saut de 3 px de frange), qui rend **0 / 12** |
| `m19/m20` | aplats et jetons | même jeton lu dans 2 fenêtres éloignées | fenêtre à cheval sur le filet or : valeur **intermédiaire** (33,36,37) |
| `m21/m28/m33` | textes : bandes, encre, épaisseur de trait, capitales | 3 lignes de paragraphe à pas régulier | bande vide : **0 ligne** |
| `m22` | lueur chaude (`R−B`) | panneau bas : `R−B` très négatif partout | filet or : `R−B` très positif |
| `m23` | régime 16:9 | 3 lignes de paragraphe à 1920 comme à 2400 | marge **gauche** = marge droite (6,8 pts) |
| `m24/m25` | chrome, losange, TD-659 | losange à la même place sur les 3 planches | laiton en y300..340 : **0** à 2400 |
| `m26/m32` | CTA, enseigne, en-tête, col, globales, dégradé de boîte | panneau bas : amplitude 2,93 pts (réf) / 0,00 (jeu) | boîte du CTA : remplissage 0,33 ≠ 0,5 |
| `m27` | rien de coupé, dock | rangée 141 : **944 px** d'encre | rangées/colonnes de bord : **0** |
| `m29/m30/m31` | addendum régularité | série 107,5 ⇒ `r/p = 0,000` | tirages uniformes ⇒ `r/p = 0,311 / 0,237` ; **témoin référence** : 11/18 bords « ronds » |
| `crop_tete_ref_gauche_jeu_droite.png`, `crop_losange_canon_jeu_temoin.png` | pièces à conviction visuelles | — | — |
