# Juge visuel ⊥ — ㊲ La réputation (« le miroir ») — r10 — 2026-09-06

## Verdict : NON APPROUVÉ

L'écran est juste partout où on peut le mesurer sans le regarder — palette, typographie, contrastes,
rythme des blocs sont au jeton et au pixel près — et faux aux trois endroits où l'œil se pose :
la coiffe du lieutenant, l'axe de son buste dans sa carte, et le tiers vide en pied du grand panneau.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Repère commun : **filet doré du cadre**, réf `y 452..2078` / jeu `y 18..1644`. Toutes les cotes `v`
ci-dessous sont relatives au haut de ce filet. Échelle : **1,00** (1 px CSS = 3,6 px des deux côtés).
Convention de bbox, la même partout : **première ligne du liseré haut → dernière ligne du liseré bas**.

| # | grandeur | référence | jeu | Δ | script |
|---|---|---|---|---|---|
| C1 | hauteur du cadre, filet à filet | 1626 px | 1626 px | **0 px** | `r10_m01` |
| C2 | six interstices entre blocs (haut→enseigne, filet or→fenêtres, fenêtres→élastique, élastique→panneau bas, panneau bas→CTA, CTA→bas du cadre) | 29·33·33·34·33·32 px | 28·33·33·34·34·32 px | **≤ 1 px** | `r10_m04` |
| C3 | somme des hauteurs des 5 blocs | 1432 px | 1432 px | **0 px** | `r10_m04` |
| C4 | carte portrait `.prt` (filet doré) | 423 × 655 px | 424 × 657 px | ≤ 2 px (0,3 %) | `r10_m05` |
| C5 | gouttière carte ↔ tuiles | 37 px | 37 px | **0 px** | `r10_m05`/`m06` |
| C6 | écart entre deux tuiles (×3) · entre deux fenêtres (×2) | 17 px · 23 px | 17 px · 23 px | **0 px** | `r10_m04` |
| C7 | jeton `or_filet` (filet du cadre ET de la carte) | (176,141,62) | (176,141,61) | **1/255** | `r10_m18` |
| C8 | jetons d'encre : `creme2` visage · `creme` col · `cyan` chiffres · `vert` « Il vous écoute » · `muet` libellés | (185,173,146)·(234,224,200)·(127,212,217)·(125,179,106)·(138,151,156) | idem | **0/255** sur les 5 | `r10_m17`/`m22`/`m26` |
| C9 | jeton `rang` du gant | (35,42,45) | (34,42,46) | 1/255 | `r10_m17` |
| C10 | 8 aplats de fond (carte, élastique, tuile, fenêtre, panneau bas, CTA, gouttière du cadre, torse) | — | — | **≤ 6/255** partout | `r10_m17` |
| C11 | largeurs d'encre de **12 chaînes IDENTIQUES** des deux côtés (« LIEUTENANT » 165/164 · les 4 couples de tuiles 257/256, 299/298, 273/275, 331/330 · les 3 libellés de compteur 235/235, 154/153, 161/159 · les 3 lignes du paragraphe 863/860, 894/888, 805/799 · le CTA 611/607) | — | — | **≤ 1,3 %** | `r10_lib_texte` |
| C12 | verdict « Pas encore / jugeable » | 216×28 · 169×36 | 219×28 · 172×37 | ≤ 3 px | `r10_lib_texte` |
| C13 | titre « Le miroir », encre h × l | 48 × 417 px | 46 × 420 px | −4,2 % / +0,7 % | `r10_lib_texte` |
| C14 | contraste WCAG de **14** textes (titre 11,92→11,55 · chiffres 11,35→11,34 · « Rien n'a encore déteint » 13,70→13,85 · paragraphe 8,24→8,19 · CTA 11,22→11,44 …) | — | — | **≤ 0,37** partout | `r10_m26`/`m33` |
| C15 | pastilles éteintes : diamètre · couleur · hauteur relative dans la tuile | 25×25 px · (42,54,72) · 51,0 % | 24×24 px · (42,53,73) · 51,7 % | 1 px · 1/255 · 0,7 pt | `r10_m25` |
| C16 | yeux : taille et abscisse SVG (attendu rx 1,9 ry 2,3 à x = 26,5 / 35,5) | 3,65-3,83 × 4,56 u à 26,48 / 35,50 | 3,84 × 4,75 u à 26,50 / 35,64 | ≤ 0,2 u | `r10_m30` |
| C17 | cou (rectangle SVG **sans contour**, attendu 10,0 u) | 9,84 u | 10,23 u | 0,4 u | `r10_m19` |
| C18 | échelle du buste · hauteur totale du dessin | 5,486 px/u · 378 px | 5,472 px/u · 377 px | 0,26 % · 1 px | `r10_m19` |
| C19 | luminance moyenne · densité d'encre (zone du cadre, 1,69 M px de part et d'autre) | 32,15 · 11,52 % | 31,07 · 11,83 % | −3,3 % · +2,7 % | `r10_m28` |
| C20 | couverture de palette, 10 jetons d'encre | — | — | **≤ 0,3 point** | `r10_m28` |
| C21 | les deux mots dorés du paragraphe (`rien pris de vous`, `indéterminé`) : abscisses | u 630..849 · 349..507 | u 623..842 · 344..500 | ≤ 7 px | `r10_m27` |
| C21b | espace sous « Il vous écoute » jusqu'au bas de la carte | 74 px | 74 px | **0 px** — en réf 19 de ces px portent la légende `lieutenant.name — non projeté`, en jeu ils sont nus ; la mise en page, elle, ne bouge pas | `r10_lib_texte` |
| C21c | le gant déborde-t-il du torse ? (défaut d'un tour précédent) | 0 px dehors | **0 px dehors** | contrôle négatif : décalé de 40 px, l'instrument compte 538 / 324 px dehors | `r10_m32` |
| C22 | inventaire des parties | 3 compteurs · 1 carte · 1 buste (9 primitives) · 1 verdict · 1 en-tête · 4 tuiles · 1 balayage · 1 panneau bas · 1 CTA | idem | **rien en trop**, une seule absence (voulue, cf. A5) | `r10_m04`…`m30` |
| C23 | 1080×1920 vs 1080×2400 | — | — | géométrie **identique au pixel** (cadre y 18..1644), fond seul ≤ 7/255 | `r10_m29` |
| C24 | T vs T+1 s | — | **0 pixel** différent sur 2 073 600 | — | `r10_m09` |

> ⚠️ Le dossier m'avertit du piège de police. **Il ne s'applique pas ici** : la série 6 demande
> `'DejaVu Sans'`, la machine de rendu l'a servie avec DejaVu Sans, et le client embarque DejaVu.
> Mesuré (C11) : **11 chaînes identiques à ≤ 1,2 % de largeur d'encre**. Aucun arbitrage de chasse.

---

## 0. L'écran, tel que la maquette le dit

**But.** « Le miroir » : on ne vient pas y lire un score, on vient regarder son lieutenant et y
reconnaître ce qu'il a *retenu* des règles qu'on lui a données. La question à laquelle l'écran
répond est « qu'est-ce qui a déteint sur lui ? », et la réponse est une **tenue**, pas un chiffre.

**Ordre de lecture.** (1) « Le miroir », or, sérif, la seule chose de cette taille et de cette
couleur ; (2) la rangée des trois compteurs cyan — le cyan est la seule couleur froide vive de
l'écran et les chiffres font 39 à 41 px d'encre ; (3) **le portrait**, seule figure de l'écran, dans la
seule boîte à filet doré du contenu ; (4) les quatre tuiles à sa droite, lues comme la légende du
portrait ; (5) le panneau bas qui explique pourquoi il n'y a rien à juger ; (6) le CTA doré.

**Zones.** enseigne (titre + sous-titre + filet or) · rangée de 3 compteurs · panneau élastique
[carte portrait à gauche | verdict + en-tête + 4 tuiles à droite] traversé par une ligne de
balayage teal · panneau bas (sur-titre, titre sérif, paragraphe à mots dorés) · CTA.

**Traits d'identité.** (a) le **buste** — un homme dessiné, cheveux enveloppants, col clair en V,
gant sale — c'est l'élément héros et le seul dessin de l'écran ; (b) la **paire** portrait ↔ quatre
tuiles : chaque tuile nomme un détail visible sur le buste ; (c) le **cerne doré** du cadre repris
en petit sur la carte portrait, deux filets et rien d'autre en or plein ; (d) la **rangée de trois
compteurs cyan lumineux** sur fond presque noir ; (e) la **ligne de balayage teal** qui traverse le
panneau au tiers haut, comme un balayage de miroir.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, dans sa structure et dans son ton. Vu seul, sans la référence à côté, on retrouve le même but,
le même ordre de lecture (titre or → compteurs cyan → portrait → tuiles → panneau → CTA), la même
palette (10 jetons d'encre à ≤ 0,3 point de couverture, 8 aplats à ≤ 6/255), la même densité
(11,52 % → 11,83 % d'encre) et la même luminance (32,15 → 31,07). Le rythme vertical est
remarquablement exact : les six interstices entre blocs sont identiques à 1 px près et la somme des
hauteurs de blocs vaut **1432 px des deux côtés**. Aucun texte n'est coupé, aucun repli anglais,
aucun enum brut ; tous les contrastes tiennent à ≤ 0,4 de ceux de la maquette.

Ce qui se voit quand même, dans l'ordre de ce qu'un joueur perçoit :

1. **La tête n'est plus la même tête.** Dans la maquette, la chevelure enveloppe le crâne et
   redescend sur les tempes ; en jeu c'est une ellipse posée à plat, plus étroite que la tête
   (0,92× contre 1,18×), qui ne touche le visage à **aucune** hauteur, et dont le bord bas
   **bombe vers le bas** au milieu du front au lieu de creuser aux tempes. Le lieutenant lit
   « béret » au lieu de « cheveux ». C'est le trait d'identité (a), sur l'élément héros.
2. **Le buste est décentré dans sa carte.** −11,4 px (−3,2 CSS), quatre masques indépendants
   d'accord, alors que les deux textes de la même carte restent centrés : la figure penche à
   gauche, le vide s'accumule à droite.
3. **Le tiers bas du grand panneau est vide.** La colonne de droite s'arrête 65 px plus haut que
   dans la maquette dans un panneau 17 px plus grand : le vide sous la 4ᵉ tuile passe de 169 à
   247 px, soit de 1,9 à 2,7 tuiles de fond nu — 31,6 % du panneau.

Le reste est du réglage fin : contours dessinés à l'extérieur des formes, halos cyan absents,
interlignes 11–17 % plus serrés, CTA 7 px plus bas. Aucun de ces points ne change ce que l'écran
dit ; les trois premiers, si — ils portent sur le portrait, qui **est** cet écran.

---

## 3. Écarts

> Un finding par ligne. `dépend des données` : **non** partout — géométrie, palette, typographie et
> espacements sont vrais quel que soit le compte photographié. Les deux observations qui dépendent
> des données sont isolées dans la table `D` plus bas.

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `MAJEUR` | `DÉJÀ APPLIQUÉ` | Le vide en pied du panneau élastique passe de 169 à 247 px : la colonne de droite s'arrête 65 px plus haut alors que le panneau est 17 px plus grand. **dépend des données : non** | `.elast` v 396..1161 (**765 px**) → 392..1174 (**782 px**). Pile de 4 tuiles v 548..992 (444 px) → 516..927 (411 px). Vide sous la 4ᵉ tuile **169 → 247 px**, soit **22,1 % → 31,6 %** de la hauteur du panneau (+46 %). Décomposition, à la somme exacte (+78) : padding haut −10 · bloc verdict+en-tête −14 (3→2 lignes) · interstice −4 · pile de tuiles −33 · panneau +17. Vide sous la carte portrait **81 → 100 px**. Hauteur d'une tuile **98 → 90 px** (−8,2 %) pour un bloc de texte 55 → 53 px | rien : le panneau ne contient **aucune** boîte vide en pied (0 liseré entre v 930 et v 1172) |
| `F2` | `MAJEUR` | `NOUVEAU` | La coiffe ne prend plus la tête : ellipse posée sur le crâne au lieu d'une chevelure qui descend sur les tempes ; le bord bas a la courbure **inverse**. C'est la mesure DUE réclamée par le dossier. **dépend des données : non** | **(a) largeur de calotte ÷ largeur de tête** : au maximum 149/126 = **1,183** → 146/138 = **1,058** ; **au point où elle rejoint le visage** : en réf la coiffe s'élargit de façon **monotone** jusqu'à 149 px et fusionne avec le visage sans jamais se rétrécir (149/126 = **1,183**) ; en jeu elle atteint 146 px puis **se rétrécit** jusqu'à **127 px** à v = 636, 8 px au-dessus du sommet du visage (127/138 = **0,920** — la coiffe est plus étroite que la tête qu'elle coiffe). **(b) hauteur d'attache** : l'épaisseur d'encre latérale dépasse la ligne de base du trait (réf G 11,5 / D 11,8 px ; jeu G 10,2 / D 10,2 px) jusqu'à **20,0 %** de la hauteur du visage en réf ; en jeu elle ne la dépasse **à aucune hauteur** (écarts −1,2 à +0,8 px de 0 % à 50 %, pas 2,5 %) ⇒ **attache = 0 %**. **(c) épaisseur latérale à 15 % du visage** : **G 20 / D 20 px** → **G 10 / D 10 px** (soit +8,5/+8,2 px de coiffe en réf, −0,2/−0,2 en jeu). **(d) forme** : la calotte est la plus large **4 px au-dessus** du sommet du visage en réf (elle s'évase aux tempes) et **31 px au-dessus** en jeu (ellipse qui se referme) ; en jeu une bande d'encre de **105 × 14 px (19,2 u SVG)** traverse le front à v 644..657 — absente en réf | pourquoi : le SVG (`generateur-reputation.py:136-138`) donne un **chemin** à bord bas concave (`C40 20 36 21 31 21 C26 21 21 21 18 26`) que le client approche par une ellipse. Je constate la forme rendue, pas le mécanisme |
| `F3` | `MAJEUR` | `DÉJÀ APPLIQUÉ` | Le buste est hors de l'axe de sa carte, alors que les deux textes de la même carte restent centrés. **dépend des données : non** | Centre de la carte u = **266,0**. Quatre masques indépendants : remplissage peau **254,6** · cou **255,0** · col **254,7** · bbox d'encre du torse **254,5** ⇒ **−11,4 px = −3,2 CSS** (2,7 % de la largeur de la carte). En réf les mêmes quatre valent 272,3 / 272,5 / 272,3 / 272,5 pour un centre de carte à 272,5 (**−0,2 px**). Textes de la carte en jeu : « LIEUTENANT » centré à 268,7, « Il vous écoute » à 268,8 ⇒ l'écart **figure ↔ texte** vaut **14,1 px** | — |
| `F4` | `MINEUR` | `DÉJÀ APPLIQUÉ` | Cause commune à quatre primitives : le contour est rendu **à l'extérieur** du chemin au lieu d'être centré dessus ; chaque forme pleine gagne ≈ 2 unités SVG et le trait sombre mord le fond au lieu de mordre le remplissage. **dépend des données : non** | En unités SVG (échelle mesurée 5,486 / 5,472 px/u, Δ 0,26 %) — visage rempli **22,97 → 25,22 u** (trait centré = 23,0 ; trait extérieur = 25,0) · torse **52,13 → 54,83 u** (52,0 / 54,0) · col **11,12 → 14,26 u** (≈11 / 14,0) · gant **8,75 × 5,47 → 10,05 × 6,40 u** (8,8×5,6 / 10,0×6,8). Contrôle : le **cou**, seule primitive sans contour, ne bouge pas (9,84 → 10,23 u pour 10,0 attendu). En px : visage 126 → 138 (+9,5 %), trait du visage 11,5 → 10,2 px par côté | le col est déjà couvert par l'écart ASSUMÉ A2 ; je note ici que la même cause déborde sur trois autres primitives |
| `F5` | `MINEUR` | `NOUVEAU` | Les lueurs cyan sont absentes : halo des chiffres des compteurs (`text-shadow:0 0 8px`) et lueur interne des fenêtres (`inset 0 0 10px`). **dépend des données : non** | Halo : luminance au-dessus du fond de la fenêtre, à d px à gauche du 1ᵉʳ pixel de chiffre — réf **+20,3 / +17,6 / +14,8 / +10,5 / +6,9 / +3,1 / −1,5** à d = 2/4/6/9/12/16/22 px ; jeu **+0,0 à toutes** ces distances. Lueur interne : score teal en descendant du liseré haut — réf +12,5 au bord → +10,0 à 40 px (excès de **+2,5** près du liseré) ; jeu **+4,5 uniforme**. Contrôle positif : la couleur du chiffre est le jeton cyan exact des deux côtés | l'autre membre de cette famille — le halo de la **pastille allumée** (`box-shadow 0 0 7px`) — n'est pas mesurable ici : l'état capturé a ses 4 tuiles éteintes |
| `F6` | `MINEUR` | `DÉJÀ APPLIQUÉ` | Les blocs multi-lignes sont 8 à 17 % plus serrés, à hauteur de glyphe identique. **dépend des données : non** | Paragraphe `.pann` : pas de ligne **33,0 → 27,5 px** (−17 %) pour des runs d'encre de 24 px et des largeurs de ligne à ≤ 1 %. Titre de carte « LT. …, VOTRE / LIEUTENANT » : **27 → 24 px** (−11 %), « LIEUTENANT » mesuré 16 × 165 → 16 × 164 px. Sous-titre de l'enseigne : 23 → 22 px. Tuile : hauteur **98 → 90 px** (−8,2 %), l'écart tenant entièrement dans les respirations (haut 24 → 22, bas 20 → 16) | — |
| `F7` | `MINEUR` | `DÉJÀ APPLIQUÉ` | Le bouton CTA est 7 px plus bas ; le libellé est inchangé. **dépend des données : non** | Filet or extérieur v **1500..1594 (94 px)** → **1507..1594 (87 px)** (−7,4 %) ; bas du bouton **exactement au même v**. Encre du libellé 611 → 607 px de large (−0,7 %) | — |
| `F8` | `MINEUR` | `DÉJÀ APPLIQUÉ` | La colonne de droite est 19 px plus large : le padding intérieur du panneau élastique tombe de 30 à 23 px. **dépend des données : non** | Tuiles u **521..976 (455 px)** → **515..989 (474 px)** (+4,2 %). Padding `.elast` gauche **30 → 23 px**, droit **30 → 23 px**. La carte portrait, elle, garde sa largeur (423 → 424 px) et la gouttière ne bouge pas (37 → 37) ⇒ tout l'élargissement va aux tuiles. Padding gauche du texte dans la tuile 30 → 27 px. Conséquence mesurée : l'en-tête « ce qu'il a absorbé de vos règles » passe de **3 à 2 lignes** (u 775..949 sur 3 lignes → 783..983 sur 2) | — |
| `F9` | `MINEUR` | `DÉJÀ APPLIQUÉ` | La ligne de balayage est plus forte et ses extrémités ne s'éteignent plus. **dépend des données : non** | Excès teal sur le fond local, dans trois gouttières propres des deux côtés : bord gauche **+1,1 → +7,1** (×6,5) · centre **+36,8 → +49,6** (×1,35) · bord droit **+1,1 → +7,3** (×6,6). Épaisseur **8 → 7 px**. Contrôle positif : à 20 px au-dessus et 20 px en dessous, l'excès vaut **0,0** des deux côtés | — |
| `F10` | `MINEUR` | `DÉJÀ APPLIQUÉ` | Le fond du cadre est monotone là où la maquette a une taille sombre au milieu — mais une part de l'écart n'est pas imputable au cadre. **dépend des données : non** | Luminance dans la gouttière gauche, par 10 % de la hauteur du cadre — réf 23,2·21,4·20,4·19,3·17,4·16,4·**15,3**·15,4·17,2·18,2·18,2 (**minimum à 60 %**) ; jeu 23,3·22,5·22,2·21,4·21,3·20,4·19,4·19,4·18,6·18,4·17,4 (**monotone**). Écart max **6/255** | **Réserve mesurée** : le MÊME cadre rendu à 1080×1920 et à 1080×2400 diffère de jusqu'à **7/255** sur ce même fond (310 089 px différents, géométrie identique) ⇒ le dégradé est ancré sur l'**écran**, pas sur le cadre. Le cadre étant ici collé en haut (capture sans chrome) alors que la maquette le pose en bas, il ne voit pas la même tranche du dégradé. Non départageable sans une capture sous le shell |
| `F11` | `MINEUR` | `NOUVEAU` | La bouche est 15 % plus courte : extrémités de trait carrées au lieu d'arrondies. **dépend des données : non** | Trait de bouche **59 × 14 px (10,75 × 2,55 u)** → **50 × 12 px (9,14 × 2,19 u)**. Le SVG donne 9 u de chemin + 1,7 u de `stroke-linecap:round` = **10,7 u** — la réf est exacte, le jeu rend le chemin nu. Contrôle positif dans le même masque : les deux yeux sont à ≤ 0,2 u (C16) | — |
| `F12` | `MINEUR` | `NOUVEAU` | Le gant est décalé de 1,45 unité SVG vers la droite. **dépend des données : non** | Centre de l'ellipse de remplissage `rang` : x_svg **11,90** (réf ; attendu 12,0) → **13,35** (jeu) ⇒ **+7,9 px = +2,2 CSS**. y_svg 76,17 → 75,89 (attendu 75,0). Aucun pixel de gant ne déborde du torse ni d'un côté ni de l'autre (0 / 0) | — |
| `F13` | `MINEUR` | `DÉJÀ APPLIQUÉ` | Le bloc enseigne perd 12 px de respiration sous le sous-titre. **dépend des données : non** | Boîte enseigne v **29..217 (188 px)** → **28..211 (183 px)**. Sous-titre (2 lignes) 137..177 → 140..183 ⇒ **padding bas 40 → 28 px** (−30 %) ; padding haut 32 → 35 px. Filet or 7 → 8 px d'épaisseur | — |

**Tête de liste par impact perçu : `F2` (la tête), `F3` (l'axe du buste), `F1` (le tiers vide).**

---

## Écarts ASSUMÉS — rendus proprement ?

| ce qu'on voit | mesuré | dans le périmètre ? |
|---|---|---|
| `A1` compteur ENFREINTES à « — » | tiret **(127,212,217)** = **exactement** la couleur des deux autres compteurs (Δ 0/255) ; v 287..291, centre v = 289 contre 291 pour les chiffres ; u 834..882, centre 857,8 pour une fenêtre centrée à 858 | **OUI** — le critère de sortie était « ni la couleur ni la position des deux autres chiffres » : les deux sont tenues. Le trou se lit comme un trou |
| `A2` col rendu par un triangle plein, sans le liseré du SVG | remplissage aire/boîte **0,401** (réf 0,420 ; critère de sortie ≈ 0,9) ⇒ bien un triangle · centré sur l'axe du cou (col 254,7 / cou 255,0) · ne recouvre pas le cou (le cou est mesuré nu sur 25 lignes sous le menton, v 763..793, avant que le col ne commence à v 827). Taille 11,12 → **14,26 u**, soit **exactement le chemin nominal du SVG (14 u)** privé de l'inset de son trait de 1,6 u | **OUI** — et l'écart de taille est la conséquence arithmétique de l'assumé, pas un écart de plus |
| `A3` reflet / ligne de balayage FIXE | **0 pixel différent** entre T et T+1 s sur 2 073 600 · centre à **28,9 %** de la hauteur du panneau (réf 31,2 %) ⇒ tiers haut · présente d'un bord à l'autre | **OUI** pour présence, fixité et position. Son **intensité** sort de l'assumé (le dossier dit qu'elle se mesure) ⇒ `F9` |
| `A4` 4 couleurs hors `DesignTokens` (Encre, Panneau, Liseré, Vert) | couleurs **rendues** : `carte2` (22,25,27)→(22,22,28) Δ3 · `carte` (17,24,35)→(13,22,34) Δ4 · `lisere` (42,54,72)→(42,53,73) Δ1 · `vert` (125,179,106)→(125,179,106) **Δ0** | **OUI** — le critère de sortie était « que la couleur RENDUE s'écarte de la maquette » : ≤ 4/255 |
| `A5` nom du lieutenant = celui du compte | « LT. ROOK, VOTRE LIEUTENANT ». Ni « SALVATORE » en dur, ni la mention « non projeté » : le bas de la carte ne porte plus qu'**une** ligne (v 975..1000) là où la réf en a deux (981..1006 puis 1024..1042) | **OUI**. Et la mise en page ne s'en trouve pas décalée : l'espace sous « Il vous écoute » vaut **74 px des deux côtés** (C21b) — en réf 19 de ces px portent la légende, en jeu ils sont nus |
| `A6` pas de section « gages » | absente, et **aucune place réservée vide** : entre le bas de la 4ᵉ tuile (v 930) et le bas du panneau (v 1172) il n'y a **0 liseré** — c'est du fond nu continu | **OUI**. Ce vide est celui que `F1` mesure ; il n'est pas dû à un conteneur vide |
| `A7` captures sans le chrome du shell | la maquette porte une évocation de bandeau (ARGENT / manomètre HEAT / JOUR 12) sur ses **434 px** de haut (120,6 CSS) ; la capture n'en a rien et le cadre commence à y = 18 | **non compté** (consigne du dossier). Ce que cela empêche de vérifier : § 6, points 2 et 3 |

## ARBITRAGES

| id | sujet | mesure | pourquoi c'est un arbitrage |
|---|---|---|---|
| `B1` | contraste des sous-titres de tuile (`la comptabilité tenue`…) | **3,54:1** en réf, **3,46:1** en jeu, pour un plancher de doctrine de **4,5:1** sur les petits textes | Le client **reproduit fidèlement** la maquette (Δ 0,08). Le plafond vient du jeton `eteint` (#6b737d ; l'encre mesurée vaut (104,112,119) / (100,109,118), le glyphe étant trop fin pour atteindre sa couleur nominale) sur `carte` #111823. À trancher côté DA, pas côté écran |
| `B2` | libellés anglais de la maquette (`HEAT`) et format `$ 24 850` | présents dans l'évocation de chrome de la référence, absents des captures | Ruling user 2026-09-02 « fr réel » : la maquette est en retard, le client a raison. **Noté une fois**, jamais compté comme écart |

## Observations qui DÉPENDENT DES DONNÉES

| id | observation | mesure |
|---|---|---|
| `D1` | Le nom affiché diffère aux trois dates : cadre #120 rendu à ×3 → « SALVATORE » · référence ×3,6 (03/09) → « LT. HARA » · capture (06/09) → « LT. ROOK ». La forme, elle, est identique (2 lignes, « LIEUTENANT » à 16 × 164 px contre 16 × 165) | `r10_lib_texte` |
| `D2` | **Le témoin est bien #120 (VIERGE)** : les 17 chaînes de l'écran correspondent une à une (00 / 00-sur-4 / all-tiles-off · « Pas encore jugeable » · « Il vous écoute » · « Rien n'a encore déteint » · « DONNER UNE PREMIÈRE RÈGLE »), et #119 diffère sur les sept d'entre elles que j'ai comparées. Seul ENFREINTES s'écarte : « — » contre « 00 » (assumé `A1`) | comparaison `etats/m-119` vs `etats/m-120` |

---

## 5. Autres résolutions

**1080×2400 (cible téléphone, 20:9)** — résolution principale du rapport. Cadre y 18..1644.
Rien de coupé, rien hors cadre, aucun débordement de parent. Bande de fond nu sous le cadre :
**755 px = 31,5 % de l'écran** (c'est la place du dock, absent de ces captures).

**1080×1920 (16:9)** — l'inventaire du § 2 tient **au pixel** : le cadre y est aux mêmes
`y 18..1644`, tous les blocs aux mêmes `v`, aucun reflux, aucune ligne de texte qui change de
rupture. La seule différence mesurable est le **fond** : 310 089 px diffèrent, **delta max 7/255**,
sur le seul dégradé (cf. la réserve de `F10`). Bande de fond nu sous le cadre : **275 px = 14,3 %**.

⇒ **Aucun écart propre à une résolution.** Le contenu ne se réagence pas : le cadre a une hauteur
fixe et c'est la bande vide sous lui qui absorbe toute la différence de format.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Que l'écran soit vraiment sans animation.** `capture-1080x1920.png` et
   `capture-1080x1920-t1s.png` ont le **même sha256** (`1612c8bb…`), la même taille (265 475 octets)
   et **0 pixel différent** sur 2 073 600. Un écran statique re-rendu par un moteur déterministe et
   un même tampon écrit deux fois donnent **exactement** ce résultat ; l'image ne peut pas les
   départager, et les mtimes non plus (les trois fichiers ont été copiés dans le dossier à 33 ms
   d'intervalle). *Ce qui trancherait* : le journal du run `0da8895` (non joint) montrant deux appels
   de rendu distincts, ou une capture T+1 s prise après une action qui change un pixel connu.
2. **La règle de gouttière.** Les captures sont sans chrome. Le cadre commence à **y = 18 (5 CSS)**
   aux deux résolutions ; le dossier donne un bandeau de shell de **143 px**. Si la mise en page sous
   le shell est celle-ci, le bandeau couvrirait les **125 premiers px** du cadre — son liseré haut
   (y 46..49) et le tiers haut de « Le miroir » (y 81..126). **Indécidable ici.** *Ce qui trancherait* :
   une capture du même écran SOUS le shell, ou le rect imprimé par le test (log non préservé).
3. **Ce qu'il reste de fond nu entre le cadre et le dock.** 755 px à 2400, 275 px à 1920 ; sans le
   dock je ne peux pas dire combien il en reste après lui. *Ce qui trancherait* : la hauteur mesurée
   de `TabDockHauteurCss` sur une planche avec chrome.
4. **L'identité photographiée — et le dossier se contredit.** Il écrit d'un côté « compte
   photographié : `operational_demo@example.test` (`AppShell.cs:104`) » et « les planches ont été
   prises sur le compte de démo `operational_demo` le 2026-09-04 », de l'autre « base gelée 72 118,
   roster Halde·Rook·Sallo » et « le commit cite `identité=demo_capture@example.test` », pour des
   captures datées du **2026-09-06**. Le journal n'est pas joint. ⇒ Conformément au ruling f2, toute
   comparaison de **valeur** (« LT. ROOK ») reste non vérifiée ; la **forme** est jugée.
5. **Les cinq autres états du groupe.** Une seule capture d'état m'est fournie (#120 vierge). Je ne
   peux rien dire des tuiles **allumées**, du **halo de pastille allumée** (`box-shadow 0 0 7px
   or_vif99`), de la **montre dorée** (`rect` en `or_vif`, absente à juste titre ici — **0 px d'or**
   dans la carte contre 4 091 px dans le titre au même détecteur), ni de la section « gages ».
   ⚠️ Le halo de pastille est **exactement la famille** que `F5` trouve absente sur les chiffres :
   à re-mesurer sur un état garni avant de croire la classe fermée.
6. **Le chrome** (bandeau, dock, manomètre, ARGENT, JOUR) : absent des captures, non jugé — il se
   juge de toute façon contre le canon du HUD, pas contre ce cadre.
7. **Les gardes du test lui-même** (compte de teintes distinctes, voisins éteints, rect ≥ 200×200) :
   le dossier dit « valeurs mesurées non disponibles (log non préservé) ». Je ne peux pas confirmer
   que la planche a passé ses propres gardes.
8. **Un défaut du dossier, à corriger pour le tour suivant.** Le dossier affirme deux fois : « le
   cadre a une hauteur FIXE de 462 px CSS : **sous lui, sur la maquette, c'est le dock** ». Mesuré :
   dans `reference-1080x2102.png` le filet bas du cadre est à **y = 2078** pour une image de
   **2102** px — il reste **24 px (6,7 CSS)**, et il n'y a **aucun dock**. Le bloc de 462 CSS est
   posé **en bas** de la maquette, sous une évocation de chrome de **434 px (120,6 CSS)**. La
   capture, elle, le pose **en haut**. C'est cette inversion d'ancrage qui rend le point 2, le
   point 3 et la réserve de `F10` indécidables.
9. **Le mécanisme** des écarts `F2`, `F4` et `F11` : je constate des formes rendues et je les
   confronte aux coordonnées du SVG que le dossier me désigne (`generateur-reputation.py:105-145`).
   Je ne dis pas quelle ligne du client les produit — ce n'est pas mon travail et je n'ai pas ouvert
   le code du client.

---

## Annexe 1 — Inventaire de la RÉFÉRENCE (`reference-1080x2102.png`, 1080 × 2102)

Coordonnées `u/v` relatives au **haut-gauche du filet doré du cadre** (abs `x0 = 21`, `y0 = 452`).
Cadre : `u 0..1037`, `v 0..1626`.

| id | catégorie | parent | bbox (u,v) | forme / remplissage | texte |
|---|---|---|---|---|---|
| `P0` | évocation de chrome | `.tel` | y 0..434 (abs) | bandeau + silhouette de ville | ARGENT / $ 24 850 / manomètre « tiède HEAT » / JOUR 12 / Matin |
| `P1` | cadre | — | 0..1037 × 0..1626 | filet 3 px `or_filet` (176,141,62), fond en dégradé (min de luminance à 60 %) | — |
| `P1.1` | enseigne | `P1` | 29..1008 × 29..217 | boîte à liseré, bord bas or 7 px | — |
| `P1.1a` | titre | `P1.1` | 306..722 × 61..108 | sérif, `or_vif` (242,201,107), contraste 11,92 | « Le miroir » |
| `P1.1b` | sous-titre | `P1.1` | 127..902 × 137..177, 2 lignes, pas 23 px | `creme2`, capitales, très interlettré, contraste 8,44 | « UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ » |
| `P2.1..3` | fenêtres (compteurs) | `P1` | 29..340 / 363..674 / 697..1008 × 250..363 (311 px chacune, écart 23) | liseré, lueur cyan interne (+2,5 près du bord) | — |
| `P2.x b` | chiffres | `P2.x` | h 39-41 px, l 69 / 107 / 69 | `cyan` (127,212,217) + **halo** (+20,3 à 2 px) | « 00 » « 00/4 » « 00 » |
| `P2.x small` | libellés | `P2.x` | h 16-19 px, l 235 / 154 / 161 | `muet` (138,151,156), contraste 6,43 | « RÈGLES DONNÉES » « ABSORBÉES » « ENFREINTES » |
| `P3` | panneau élastique | `P1` | 29..1008 × 396..1161 (**765 px**) | liseré, fond `fond2`, padding intérieur **30 px** | — |
| `P3.1` | carte portrait | `P3` | 61..484 × 425..1080 (**423 × 655**) | filet doré 3 px | — |
| `P3.1a` | titre de carte | `P3.1` | 159..384 × 461..503, 2 lignes, pas 27 | `muet`, capitales, contraste 5,93 | « LT. HARA, VOTRE LIEUTENANT » |
| `P3.1b` | buste | `P3.1` | 130..415 × 577..954 (échelle **5,486 px/u**, axe u = 272,3 = centre de carte) | 9 primitives, contours **centrés** sur les chemins | — |
| `P3.1b1` | torse | `P3.1b` | 52,13 u de large | `carte2`, trait `fond` | — |
| `P3.1b2` | col | `P3.1b` | 11,12 × 11,12 u, remplissage 0,420 | `creme` (234,224,200) | — |
| `P3.1b3` | cou | `P3.1b` | 9,84 u | `creme2` | — |
| `P3.1b4` | visage | `P3.1b` | 22,97 u de remplissage, trait 11,5/11,8 px | `creme2` (185,173,146) | — |
| `P3.1b5` | coiffe | `P3.1b` | max **149 px** (1,183 × la tête), attache à **20,0 %** du visage, épaisseur latérale 20/20 px à 15 % | encre, bord bas **concave** | — |
| `P3.1b6-7` | yeux | `P3.1b` | 3,65-3,83 × 4,56 u à x_svg 26,48 / 35,50 | encre | — |
| `P3.1b8` | bouche | `P3.1b` | 10,75 × 2,55 u | trait à bouts **arrondis** | — |
| `P3.1b9` | gant | `P3.1b` | 8,75 × 5,47 u, centre x_svg **11,90** / y_svg 76,17 ; **25,2 % / 78,4 %** de la carte | `rang` (35,42,45) + 2 griffes obliques | — |
| `P3.1c` | état | `P3.1` | 153..392 × 981..1006 | `vert` (125,179,106), contraste 7,23 | « Il vous écoute » |
| `P3.1d` | légende de dev | `P3.1` | 105..441 × 1024..1042 | `eteint` | « lieutenant.name — non projeté (L0.4) » |
| `P3.2` | verdict | `P3` | 523..739 × 438..524, 2 lignes, pas 42 | sérif, `muet` | « Pas encore jugeable » |
| `P3.3` | en-tête | `P3` | 775..949 × 447..529, **3 lignes**, pas 29/30 | `muet`, aligné à gauche | « ce qu'il a absorbé de vos règles » |
| `P3.4..7` | tuiles | `P3` | 521..976 (**455 px**) × 548..646 / 663..761 / 779..876 / 894..992 (**98 px**, écart 17) | liseré, fond `carte` | — |
| `P3.x lum` | pastille | tuile | 25 × 25 px, à 51,0 % de la hauteur de la tuile | `lisere` (42,54,72) | — |
| `P3.x b/small` | textes | tuile | bloc de 55 px, respirations 24 / 20 | `creme2` / `eteint` (contraste 8,02 / 3,54) | « col ouvert » … |
| `P3.8` | ligne de balayage | `P3` | v 631..638 (**8 px**), centre à **31,2 %** du panneau | dégradé teal, **éteint aux deux bords** (+1,1) | — |
| `P4` | panneau bas | `P1` | 29..1008 × 1195..1467 (**272 px**) | liseré | — |
| `P4a/b/c` | sur-titre / titre / paragraphe | `P4` | 1228..1246 / 1269..1307 / 1338..1427 (3 lignes, **pas 33 px**) | `muet` / `creme` sérif (13,70) / `creme2` + 2 mots `or_vif` | — |
| `P5` | CTA | `P1` | 29..1008 × 1500..1594 (**94 px**) | filet or, fond `carte2` | « DONNER UNE PREMIÈRE RÈGLE » (611 px, contraste 11,22) |

**Couche globale (zone du cadre, 1 688 826 px)** : luminance moyenne **32,15**, densité d'encre
(L > 40) **11,52 %**, palette dominée par les fonds (`carte`/`fond`/`fond2` ≈ 85 %), encre répartie
sur `creme` 0,44 % · `creme2` 1,56 % · `muet` 0,53 % · `or_vif` 0,64 % · `or_filet` 2,10 % ·
`cyan` 0,22 % · `vert` 0,08 % · `lisere` 2,74 %.

## Annexe 2 — Inventaire de la CAPTURE (`capture-1080x2400.png`, 1080 × 2400)

Mêmes repères, `x0 = 18`, `y0 = 18`. Cadre : `u 0..1043`, `v 0..1626`. **Seules les fiches qui
diffèrent sont reprises ; toutes les autres sont identiques à ≤ 2 px / ≤ 6/255 (cf. § Contrôle positif).**

| id | ce qui change |
|---|---|
| `P0` | **absent** (capture sans chrome) — non compté |
| `P1` | cadre 1043 px de large (+6) ; fond **monotone** (`F10`) |
| `P1.1` | 28..211 (**183 px**), padding bas 28 (`F13`) |
| `P2.x b` | **aucun halo** (`F5`) ; fenêtre 3 = **tiret** cyan 49 × 5 px centré (assumé `A1`) |
| `P2.x` | lueur interne absente (`F5`) |
| `P3` | 392..1174 (**782 px**), padding intérieur **23 px** (`F8`) |
| `P3.1` | 54..478 × 417..1074 (424 × 657) ; centre u = 266,0 |
| `P3.1a` | pas de ligne 24 (`F6`) ; « LT. ROOK, VOTRE LIEUTENANT » (`D1`) |
| `P3.1b` | axe u = **254,6** ⇒ **−11,4 px** du centre de carte (`F3`) ; contours **extérieurs** (`F4`) |
| `P3.1b2` | col **14,26 u** (assumé `A2` rendu à sa taille nominale) |
| `P3.1b4` | visage **25,22 u** (+9,5 % en px), trait 10,2 px |
| `P3.1b5` | coiffe max **146 px** = **1,058 ×** la tête, puis **rétrécie à 127 px = 0,920 ×** avant de la toucher ; attache **0 %** ; épaisseur latérale 10/10 px ; bord bas **convexe**, bande de 105 × 14 px en travers du front (`F2`) |
| `P3.1b8` | bouche **9,14 × 2,19 u**, bouts carrés (`F11`) |
| `P3.1b9` | gant 10,05 × 6,40 u, centre x_svg **13,35** (`F12`) ; **24,5 % / 78,2 %** de la carte |
| `P3.1d` | **absent** — voulu (`A5`) ; les 74 px sous « Il vous écoute » restent nus, la boîte ne bouge pas (C21b) |
| `P3.3` | **2 lignes** au lieu de 3 (`F8`) |
| `P3.4..7` | tuiles 515..989 (**474 px**) × **90 px**, écart 17 (`F1`, `F8`) |
| `P3.8` | v 615..621 (**7 px**), centre à **28,9 %** du panneau, extrémités **allumées** (+7,1 / +7,3) (`F9`) |
| `P3` (vide) | vide sous la 4ᵉ tuile **247 px = 31,6 %** du panneau (`F1`) |
| `P4` | 1208..1473 (**265 px**), paragraphe à **pas 27,5 px** (`F6`) |
| `P5` | 1507..1594 (**87 px**) (`F7`) |

**Couche globale (1 698 588 px)** : luminance **31,07** (−3,3 %), densité d'encre **11,83 %**
(+2,7 %), couverture des 10 jetons d'encre à **≤ 0,3 point** de la référence.

## Annexe 3 — Correspondance des repères

| | référence | capture |
|---|---|---|
| ancre | filet doré du cadre, `x 21..1058`, `y 452..2078` | filet doré du cadre, `x 18..1061`, `y 18..1644` |
| hauteur du cadre | 1626 px | 1626 px (**rapport 1,000**) |
| largeur du cadre | 1037 px | 1043 px (**rapport 1,006**) |
| transformation | `v = y − 452`, `u = x − 21` | `v = y − 18`, `u = x − 18` |
| échelle | 3,6 px / px CSS | 3,6 px / px CSS |
| échelle du buste (mesurée, pas déduite) | 5,486 px / unité SVG | 5,472 px / unité SVG (**Δ 0,26 %**) |

Toutes les cotes du § 3 sont exprimées dans ce repère. L'écart de 6 px de largeur du cadre est
signalé partout où il pourrait porter (il vaut 0,6 % et ne franchit aucun seuil de ce rapport).

## Annexe 4 — Scripts

Dans `mesures/`, un fichier par grandeur ou famille de grandeurs ; chacun imprime la taille des
images qu'il ouvre et porte son contrôle positif (et négatif quand l'enjeu le mérite) :

| script | ce qu'il mesure | son contrôle |
|---|---|---|
| `r10_m01_cadre.py` | bbox du filet doré du cadre | largeur d'image = 1080 des trois côtés |
| `r10_m02_palette.py` | palette quantifiée de la zone du cadre | somme des % = 100,00 |
| `r10_m04_boites.py` | liserés horizontaux/verticaux de toutes les boîtes | 2 filets par fenêtre × 3 |
| `r10_m05_carte.py` | bbox doré de la carte portrait | le filet du cadre est retrouvé aux mêmes `v` que `m01` |
| `r10_m06_tuiles.py` | bords verticaux des 4 tuiles | les 4 tuiles rendent le même `u0/u1` |
| `r10_m07/m08/m31_balayage*.py` | position, épaisseur, profil et intensité de la ligne | 20 px au-dessus − 20 px en dessous = 0,0 |
| `r10_m09_anim.py` | T vs T+1 s | 1920 vs haut de 2400 rend 65 704 différences ⇒ discrimine |
| `r10_m17/m18` | aplats vs jetons `chassis6.py` ; dégradé du cadre | `or_filet` = (176,141,62) retrouvé en réf |
| `r10_m12/m13/m14/m15` | masques du buste, **la mesure DUE sur la calotte** | largeur du visage recalculée = celle de `m12` ; ligne de base G ≈ D |
| `r10_m19_primitives.py` | chaque primitive en **unités SVG** | l'échelle px/u est la même des deux côtés |
| `r10_m21_gant2.py` + `r10_m32` | l'ellipse claire (plus grande composante connexe), recherche d'or, débordement du torse | le détecteur d'or trouve 4 643 / 4 091 px dans le titre, **0** dans la carte ; contrôle négatif du débordement : gant décalé de 40 px ⇒ 538 / 324 px dehors |
| `r10_m22/m23` | couleur et halo des compteurs, lueur des fenêtres | couleur du chiffre = jeton `cyan` exact |
| `r10_m25_pastilles2.py` | pastilles éteintes | les 4 pastilles identiques dans chaque image |
| `r10_m26_contraste.py` + `r10_m33` | contraste WCAG de 14 textes (le paragraphe remesuré sur sa ligne **sans mot doré**) | « RÈGLES DONNÉES » (chaîne identique) rend 6,43 des deux côtés ; l'encre du paragraphe rend le jeton `creme2` exact des deux côtés |
| `r10_m28_global.py` | couche globale | les deux zones ont la même aire (imprimée) |
| `r10_m29_1920.py` | 1080×1920 vs 1080×2400 | un décalage volontaire de 3 px rend 52 668 différences |
| `r10_m30_visage_traits.py` | yeux et bouche | les deux yeux d'une même image sont égaux à ≤ 1 px |
| `r10_lib_texte.py` | détection de lignes de texte et bbox d'encre | seuil dérivé de la médiane du fond de chaque boîte |

### Sorties collées (extraits décisifs)

```
--- r10_m14_attache.py : LA MESURE DUE (b) ---
=== REF  visage v[650,763] h=114 l=126
  ligne de base du TRAIT (72-84 % du visage) : G=11.5 px  D=11.8 px   (controle positif : G≈D, ecart 0.2)
   %visage    G     D    (G-base)  (D-base)
      0.0 %    34    32      +22.5    +20.2
      7.5 %    24    24      +12.5    +12.2
     15.0 %    20    20       +8.5     +8.2
     20.0 %    17    18       +5.5     +6.2
     22.5 %    11    12       -0.5     +0.2
     50.0 %    10    11       -1.5     -0.8
  (b) HAUTEUR D'ATTACHE = 20.0 % de la hauteur du visage
=== CAP  visage v[644,759] h=116 l=138
  ligne de base du TRAIT (72-84 % du visage) : G=10.2 px  D=10.2 px   (controle positif : G≈D, ecart 0.0)
      0.0 %    10    11       -0.2     +0.8
      7.5 %    10    11       -0.2     +0.8
     15.0 %    10    10       -0.2     -0.2
     20.0 %    10     9       -0.2     -1.2
     50.0 %    10     9       -0.2     -1.2
  (b) HAUTEUR D'ATTACHE = None % de la hauteur du visage
```

```
--- r10_m19_primitives.py : le contour est dessine A L'EXTERIEUR ---
=== REF   encre h=378 px -> echelle mesuree = 5.486 px/u   centre_u encre = 272.5
  VISAGE (ellipse rx=12,5 sw=2) : remplissage 126 px = 22.97 u  (trait CENTRE -> 23,0 ; EXTERIEUR -> 25,0)
  COU    (rect 10 u, sans trait): 54 px =  9.84 u   (attendu 10,0 u)
  COL    (triangle 14 u sw=1,6): largeur haut 61 px = 11.12 u   (CENTRE ~11 u ; EXTERIEUR 14,0 u)
  TORSE  (path 50 u, sw=2)     : 286 px = 52.13 u   (CENTRE 52,0 ; EXTERIEUR 54,0)
=== CAP   encre h=377 px -> echelle mesuree = 5.472 px/u   centre_u encre = 254.5
  VISAGE : 138 px = 25.22 u        COU : 56 px = 10.23 u
  COL    : 78 px = 14.26 u         TORSE : 300 px = 54.83 u
```

```
--- r10_m21_gant2.py : c'est le GANT, pas une montre ---
=== REF  PLUS GRANDE composante 'rang' : 48 x 30 px = 8.75 x 5.47 u  remplissage=0.664
     centre SVG = (11.86, 76.17) u   (gant attendu : 12,0 ; 75,0)
  OR or_vif dans la carte : 0 px  |  CONTROLE POSITIF (titre « Le miroir ») : 4643 px
=== CAP  PLUS GRANDE composante 'rang' : 55 x 35 px = 10.05 x 6.40 u  remplissage=0.739
     centre SVG = (13.36, 75.89) u
  OR or_vif dans la carte : 0 px  |  CONTROLE POSITIF (titre « Le miroir ») : 4091 px
```

```
--- r10_m22_compteurs.py : le halo cyan est absent ---
=== REF  chiffres « 00 » (fenetre 1) : (127, 212, 217)   d(jeton cyan)=0
         fenetre 3 : (127, 212, 217)   d(chiffres f1)=0
  HALO : fond de fenetre L=17.8 ; luminance a d px a GAUCHE du 1er chiffre :
    d=2:+20.3  d=4:+17.6  d=6:+14.8  d=9:+10.5  d=12:+6.9  d=16:+3.1  d=22:-1.5  d=30:-5.0
=== CAP  chiffres « 00 » : (127, 212, 217)  d=0     fenetre 3 (« — ») : (127, 212, 217)  d=0
  HALO : fond de fenetre L=13.6 ;
    d=2:+0.0  d=4:+0.0  d=6:+0.0  d=9:+0.0  d=12:+0.0  d=16:+0.0  d=22:+0.0  d=30:+0.0
```

```
--- r10_m31_balayage3.py : la ligne ne s'eteint plus aux bords ---
REF  ligne v=631..638 (8 px)
   u 36..54    : DELTA=   1.1   (controle + : au-dessus - en-dessous = +0.0)
   u 490..512  : DELTA=  36.8   (+0.0)
   u 984..1002 : DELTA=   1.1   (+0.0)
CAP  ligne v=615..621 (7 px)
   u 35..50    : DELTA=   7.1   (+0.0)
   u 490..512  : DELTA=  49.6   (+0.0)
   u 994..1008 : DELTA=   7.3   (+0.0)
```

```
--- r10_m26_contraste.py (extrait) ---
texte                                             REF encre           /fond  ratio |        CAP encre           /fond  ratio
titre « Le miroir »                         (242, 201, 107)    (12, 18, 28)  11.92 |  (242, 201, 106)    (13, 22, 34)  11.55
chiffres « 00 » f1                          (127, 212, 217)     (9, 14, 22)  11.35 |  (127, 212, 217)    (13, 13, 22)  11.34
libelle « REGLES DONNEES » (CONTROLE +)     (138, 151, 156)     (9, 14, 22)   6.43 |  (138, 151, 156)    (13, 13, 22)   6.43
carte : « Il vous ecoute »                  (125, 179, 106)    (17, 24, 35)   7.23 |  (125, 179, 106)    (13, 22, 34)   7.38
tuile 2 : sous-titre                        (104, 112, 119)    (17, 24, 35)   3.54 |  (100, 109, 118)    (13, 22, 34)   3.46
pann : « Rien n a encore deteint »          (234, 224, 200)    (16, 23, 34)  13.70 |  (234, 224, 200)    (13, 22, 34)  13.85
CTA                                         (242, 201, 107)    (22, 25, 27)  11.22 |  (242, 201, 106)    (22, 22, 28)  11.44
```

```
--- r10_m09_anim.py + r10_m29_1920.py ---
T   : (1080, 1920)   T+1s: (1080, 1920)
   pixels differents T vs T+1s : 0 / 2073600  (delta max 0)
   CONTROLE POSITIF (1920 vs haut de 2400, 1 px sur 9) : 65704 differents -> l'instrument discrimine
   sha256 capture-1080x1920.png     1612c8bb03da9bb2
   sha256 capture-1080x1920-t1s.png 1612c8bb03da9bb2
1920 vs 2400, zone y 0..1659 : 1792800 px -> 310089 differents (delta max 7)
   CONTROLE POSITIF (2400 decale de 3 px en x) : 52668 differents -> l'instrument discrimine
   1920: derniere ligne d'encre a y=1644 / 1920 -> marge basse 275 px (14.3 %)
   2400: derniere ligne d'encre a y=1644 / 2400 -> marge basse 755 px (31.5 %)
```
