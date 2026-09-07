# Juge visuel ⊥ — ㊲ La réputation (« le miroir ») — r16 — 2026-09-07

> Juge à contexte vierge. Je n'ai ouvert ni `Assets/Scripts`, ni un rapport r1…r15, ni les notes
> d'implémentation, ni l'inventaire de dette. Tous les nombres ci-dessous sortent d'un script de
> `mesures/` ; chaque script imprime la taille et le chemin réel des images qu'il ouvre.

## Verdict : **NON APPROUVÉ**

Trois écarts MAJEURS : l'affordance de défilement de 1080×1920 est **posée sur le contenu** (elle
couvre le bord droit des 4 tuiles et 3 colonnes d'encre d'un mot), le **panneau élastique a perdu
11,6 % de sa hauteur** et la carte portrait en **sort par le bas de 10 px**, et le **visage du
lieutenant déborde de sa chevelure** sur la bande des tempes — sur un écran dont le mandat dit qu'il
« est UN portrait ». Aucun BLOQUANT. La typographie, les jetons de couleur, les contrastes, la
luminance moyenne et la densité d'encre sont, eux, à l'identique.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Réf = `reference-1080x2102.png` (cadre nominal #120), jeu = `capture-1080x2400.png` sauf mention.
Contenu à ×3,6 des deux côtés ⇒ comparaison en px bruts licite (annexe 3).

| # | grandeur | réf | jeu 2400 | Δ | script |
|---|---|---|---|---|---|
| 1 | cadre hors-tout, rail à rail (vertical) | 1627 px | 1628 px | **+0,06 %** | `m21` |
| 2 | cadre hors-tout, rail à rail (horizontal) | 1038 px | 1044 px | +0,58 % | `m31C` |
| 3 | carte portrait, largeur rail à rail | 424 px | 425 px | +0,24 % | `m29` |
| 4 | carte portrait, hauteur | 657 px | 659 px | +0,30 % | `m22` |
| 5 | hauteur de capitale « Le miroir » (le L) | 45 px | 45 px (1920 : 45) | **0** | `m24` |
| 6 | hauteur de capitale « Rien n'a encore déteint » (le R) | 36 px | 36 px (1920 : 36) | **0** | `m24` |
| 7 | hauteur de capitale du libellé CTA (le D) | 22 px | 22 px | **0** | `m24` |
| 8 | hauteur de capitale du sous-titre (le U) | 17 px | 18 px (1920 : 17) | ≤ 1 px | `m24` |
| 9 | hauteur de capitale « Pas encore » (le P) | 26 px | 26 px (1920 : 27) | 0 | `m25` |
| 10 | hauteur d'x du titre de tuile (le c de « col ouvert ») | 16 px | 16 px | **0** | `m25` |
| 11 | jeton or vif (titre + CTA) | (242,201,107) | (242,201,106) | **1/255** | `m27` |
| 12 | jeton du rail or du cadre | (176,141,62) | (176,141,61) | **1/255** | `m27` |
| 13 | jeton cyan du chiffre | (127,212,217) | (127,212,217) | **0/255** | `m27` |
| 14 | jeton vert « Il vous écoute » | (125,179,106) | (125,179,106) | **0/255** | `m27` |
| 15 | jeton du libellé de compteur | (138,151,156) | (138,151,156) | **0/255** | `m28` |
| 16 | fond du cadre hors panneaux | (16,21,25) | (15,21,25) | 1/255 | `m28` |
| 17 | contraste du titre « Le miroir » | 11,92:1 | 11,55:1 | −0,37 | `m31A` |
| 18 | contraste du titre du panneau bas | 13,84:1 | 13,85:1 | +0,01 | `m31A` |
| 19 | contraste du chiffre de compteur | 11,33:1 | 11,34:1 | +0,01 | `m31A` |
| 20 | contraste du libellé de compteur | 6,43:1 | 6,43:1 | **0** | `m31A` |
| 21 | contraste du sous-titre | 8,45:1 | 8,19:1 | −0,26 | `m31A` |
| 22 | luminance moyenne du cadre | 31,14 | 31,16 | +0,06 % | `m31E` |
| 23 | densité d'encre dans le cadre | 12,11 % | 12,31 % | +1,7 % rel. | `m31E` |
| 24 | hauteur des boîtes de compteur | 115 px | 116 px (1920 : 117) | +0,9 % | `m22` |
| 25 | hauteur du panneau de titre | 190 px | 184 px | −3,2 % | `m22` |
| 26 | hauteur du panneau bas | 274 px | 267 px | −2,6 % | `m22` |
| 27 | écart chiffre → libellé, compteur 1 | 21 px | 20 px | −1 px | `m15` |
| 28 | largeur max de la silhouette du buste | 285 px | 287 px | +0,7 % | `m36` |
| 29 | rien de coupé : encre sur les 4 bords, aux **2** résolutions | — | **0 px** partout | — | `m31D` |
| 30 | le col EST un triangle : remplissage aire/boîte | 0,40 | 0,40 | **0** | `m35` |
| 31 | le col est centré sur l'axe du cou | x = 293,0 | x = 290,5 | 2,5 px | `m35` |
| 32 | le reflet du miroir est dans le tiers haut du panneau | 30,7 % | 34,0 % (1920 : 33,4 %) | ✓ | `m34` |
| 33 | chrome : filet du bandeau (variante `.chaud`) | braise (224,102,74) attendu | **(224,102,73)** — identique sur les 2 planches ET le témoin ⑱ | 1/255 | `m36` |
| 34 | onglet actif : soulignement or sous PLUS | — | x = 802..839 (38 px), identique aux 2 résolutions | — | `m36` |
| 35 | halo des compteurs : il **existe** | — | `P_ext(1)=102,8` `P_ext(2)=35,3` `P_ext(3)=5,2` pts ; luminance **brute** 94,4 à 1 px contre 13,6 de fond | non nul | `m13` |
| 36 | halo : **aucune soudure** chiffre → libellé (vallée) | +1,57 pt | **0,00 pt** (les 3 compteurs) | — | `m11` |
| 37 | halo : barycentre **centré**, pas de tache décalée | (+0,07 ; +0,22) px | **(−0,89 ; −0,07) px** (1920 : −0,82 ; −0,36) | < 1 px | `m14` |
| 38 | la mention « lieutenant.name — non projeté (L0.4) » de la maquette est **absente** en jeu | présente | **absente** | — | `m30` (crop) |
| 39 | liseré des tuiles | (42,54,72) | (42,53,73) | **1/255** | `m40` |
| 40 | écarts entre tuiles (rythme de la colonne) | 14 / 15 / 15 px | 14 / 14 / 15 px | ≤ 1 px | `m40` |
| 41 | tiret d'ENFREINTES : jeton identique aux chiffres | (127,212,217) | (127,212,217) | **0/255** | `m40` |

---

## 0. L'écran, tel que la maquette le dit

**But.** Se lire sur son lieutenant : venir voir ce qu'il a *absorbé* des règles qu'on lui a
données. Ce n'est pas un tableau de bord, c'est **un portrait** — un miroir dont le reflet est
l'homme.

**Ordre de lecture.** (1) « **Le miroir** » en or sérif, 45 px de capitale, contraste 11,9:1, seul
élément or de la moitié haute — il capte l'œil en premier ; (2) la **rangée des trois compteurs**,
chiffres cyan de 37 px baignés d'un halo qui les fait flotter — le seul accent froid de l'écran ;
(3) le **portrait** dans sa carte à liseré or, à gauche du panneau élastique, et sa sentence verte
« Il vous écoute » ; (4) la colonne des **quatre indices de tenue** (col, manches, montre, gants) ;
(5) le **panneau d'explication** en bas, qui donne le sens de « pas jugeable » ; (6) le **CTA** or
« DONNER UNE PREMIÈRE RÈGLE ».

**Zones.** Chrome (bandeau + dock) · cadre or unique · panneau de titre (titre + sous-titre + filet
or) · rangée de 3 compteurs · panneau élastique (carte portrait à gauche / aparté + 4 tuiles à
droite) · panneau d'explication · boîte CTA.

**Traits d'identité.** ① le **cadre or continu**, un seul, et rien d'autre en or que le titre et le
CTA ; ② les **chiffres cyan halés** — la seule couleur froide, et le seul effet lumineux de
l'écran ; ③ le **buste** dans sa carte à liseré or, tête cerclée de cheveux sombres, col en V
crème ; ④ le **reflet du miroir** : un mince trait turquoise horizontal qui traverse le panneau
dans son tiers haut ; ⑤ un **rythme vertical très régulier** — 4 tuiles de hauteur et de pas
identiques, deux gardes égales (29 px) en haut et en bas du cadre.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, dans sa **substance** : même but, même ordre de lecture, mêmes mots (tous en français), même
palette. À 1080×2400 la luminance moyenne (31,14 → 31,16) et la densité d'encre (12,11 % →
12,31 %) du cadre sont indiscernables, et les cinq contrastes principaux tiennent à ±0,4 près. La
typographie est **exacte** : cinq hauteurs de capitale à 0 ou 1 px. Les jetons de couleur sont à
0-1/255. C'est un écran fidèle.

Ce qui a bougé tient en trois choses, et deux d'entre elles touchent l'identité. **(1)** À
1080×1920, une **barre dorée pleine hauteur** — 11 px de large, 1380 px de haut, contraste 6,6:1 —
descend du rail haut au rail bas *à l'intérieur* du contenu : elle recouvre le bord droit des
quatre tuiles sur 4 px, coupe les liserés du panneau de titre, de la boîte ENFREINTES et des deux
grands panneaux, et efface les 3 dernières colonnes d'encre de « ce qu'il a absor**bé** ». Elle
dit juste ce qu'elle doit dire (son curseur occupe 90,9 % pour 92,2 % de contenu visible mesuré) —
mais l'œil lit un **second rail or parallèle au cadre**, pas un ascenseur, et il le lit avant les
tuiles. La gouttière libre de 25 px existe, 27 px plus à droite. **(2)** Le **panneau élastique**
fait 678 px au lieu de 767 (−11,6 %) tandis que la carte portrait garde sa taille : la carte
**sort par le bas**, son liseré or croisant le liseré du panneau sur 10 px, là où la maquette
laisse 81 px de marge. Le même retrait écrase le pas des tuiles (115 → 107 px) et rejette 135 px
de vide sous le CTA (29 px dans la maquette). **(3)** Sur le **portrait** — l'élément héros — la
chevelure sombre, épaisse de 20 px de part et d'autre au niveau des tempes dans la maquette, tombe
à **0 px** en jeu : le visage crève sa silhouette et un bandeau de peau traverse le front ; le col
en V, lui, gagne 54 % d'aire quand le buste ne gagne que 0,7 % de largeur.

À 1080×2400 rien n'est coupé, rien ne déborde, la lecture est celle de la maquette. Le cadre y
flotte cependant dans 250 px de bande morte (l'écran ⑱ du même commit remplit la même zone à
100 %) — écart récurrent, routé en arbitrage.

---

## 3. Écarts

Un finding par ligne. `ASSUMÉ` et `ARBITRAGE` sont dans des tables à part et ne sont **pas** comptés ici.
Repère commun : rail haut du cadre — réf y=452, 2400 y=482, 1920 y=250 (annexe 3).

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `M1` | **MAJEUR** | NOUVEAU | non | **1080×1920 — l'affordance de défilement est posée SUR le contenu.** Barre or pleine hauteur à l'intérieur du cadre ; elle recouvre le bord droit des 4 tuiles et l'encre de l'aparté ; elle coupe les liserés de 4 blocs. La maquette n'a rien à cet endroit. | barre `x=997..1007` (11 px = 3,06 CSS), `y=250..1629` (1380 px = **100,6 %** de l'intérieur du cadre), or (191,150,67), contraste **6,63:1** (fond gauche) / **7,09:1** (fond droit). Sur ses 1370 rangées utiles, **439 (32,0 %) reposent sur de l'encre** de la planche 2400. Détail : bord droit des tuiles `x=998..1001` (4 colonnes × 4 tuiles × ~93 px) ; aparté ligne 1, l'encre va jusqu'à `x=999` à 2400 → **3 colonnes d'encre remplacées** par l'or à 1920 (`x997:(125,137,142) x998:(138,151,156) x999:(102,112,116)` → or). Gouttière libre disponible : dernière colonne d'encre du contenu `x=1033`, première colonne du rail droit `x=1059` ⇒ **25 px (6,9 CSS) inutilisés** — la barre y tiendrait entière. Contrôle négatif : marge interne gauche, **aucune** colonne or hors du rail. Contrôle d'existence : **0** colonne or > 30 % entre x=960 et 1050 à 2400. | si la barre est *interactive* (glissable) ou seulement indicative ; si le défilement atteint réellement le CTA (aucune planche « après défilement ») — `m02`,`m04`,`m05`,`m06`,`m26` |
| `M2` | **MAJEUR** | DÉJÀ APPLIQUÉ | non | **Le panneau élastique a perdu 11,6 % de sa hauteur ; la carte portrait en sort par le bas.** Le liseré or de la carte croise le liseré du panneau. | panneau **767 → 678 px** (−89 px = −24,7 CSS), identique aux 2 résolutions. Carte portrait **657 → 659 px** (+0,3 %). Bas de la carte / bas du panneau : réf **−81 px** (dedans) → 2400 **+10 px**, 1920 **+9 px**. Retrait en cascade : tuiles **101 → 93 px** de haut (−7,9 %), pas **115 → 107 px** (−7,0 %) — les **écarts entre tuiles sont inchangés** (réf 14/15/15, jeu 14/14/15) : le pas se resserre uniquement parce que les tuiles rapetissent ; vide sous le CTA **29 → 135 px** ; vide total dans le cadre **55 → 160 px** (×2,9). Les deux exigences que je mesure : (a) 4 tuiles × 93 px + 3 écarts × 14 px + en-tête d'aparté 51 px = **465 px** pour la colonne de droite ; (b) la carte, à retrait symétrique de 29 px (retrait haut mesuré : panneau 874 → carte 903), demande **717 px** de panneau — il en fait 678, **déficit 39 px**. | si le panneau est contraint par une garde de code (le dossier déclare une incompatibilité « M3 rétracté ») — je constate seulement que l'écart persiste — `m21`,`m22`,`m33` |
| `M3` | **MAJEUR** | NOUVEAU | non | **Le visage déborde de la chevelure : un bandeau de peau traverse les tempes.** Sur l'élément héros de l'écran. | épaisseur latérale de la chevelure sombre, mesurée à plusieurs hauteurs du visage — réf **22/23 · 20/20 · 10/11 · 10/11 · 11/10 · 11/11** px (gauche/droite à 10 %, 15 %, 25 %, 40 %, 55 %, 70 %) ; jeu 2400 **3/3 · 0/0 · 9/9 · 9/8 · 9/9 · 9/9** ; 1920 **3/2 · 0/0 · 9/9 · 9/8 · 9/9 · 9/9**. Rangées de peau **sans flanc sombre des deux côtés** : réf **0/101**, 2400 **13/102**, 1920 **14/104**. Largeur max de peau **125 → 131 px** sur la rangée des tempes ; boîte de peau **126×161 → 137×172 px** (+8,7 % / +6,8 %) pour une silhouette de buste inchangée (285 → 287 px). | si l'écart vient du gabarit de silhouette ou du dimensionnement de la tête (image seule) — `m29`,`m39` |
| `m1` | MINEUR | NOUVEAU | non | **Le col en V est nettement plus gros que le buste ne l'est.** Il reste un triangle et reste centré (voir ASSUMÉ A2). | col crème **61×61 px → 78×75 px** ; aire **1507 → 2327 px (+54,4 %)** ; largeur au sommet 61 → 78, à la base 1 → 6 ; remplissage aire/boîte 0,40 → 0,40 ; axe x 293,0 → 290,5. Comparaison : la silhouette du buste ne gagne que **+0,7 %** en largeur. | — `m35` |
| `m2` | MINEUR | NOUVEAU | non | **Le reflet du miroir est 68 % plus intense et va d'un bord à l'autre du panneau.** | pic du profil de rangées **30,7 pts (y=1083) → 51,6 pts (y=1104)** (1920 : 52,5) ; épaisseur à mi-hauteur **9 → 7 px** ; étendue **x=79..1001 (923 px) → x=60..1029 (970 px)**, soit bord à bord du panneau ; couleur au cœur **(49,79,89) → (68,109,119)**. | si l'intensité est un choix DA (le dossier n'assume que sa fixité et sa position) — `m34` |
| `m3` | MINEUR | NOUVEAU | non | **La boîte de compteur a perdu son dégradé vertical intérieur** (elle est un aplat). | médianes de rangée dans la boîte 1, haut → milieu → bas : réf **(15,24,31) → (10,15,23) → (15,24,31)**, amplitude R/G/B **5/9/8** ; jeu **(13,13,22) partout**, amplitude **0/0/0** (identique à 1920). | — `m28` |
| `m4` | MINEUR | NOUVEAU | non | **Une lueur AMBRÉE occupe la bande sous le rail haut du cadre, là où la maquette est froide.** | médiane par colonne sur la bande juste sous le rail : réf bord (17,23,34) → pic **(24,29,36)**, `R−B = −12` (froid) ; jeu bord (16,22,31) → pic **(43,37,33)**, `R−B = +10` (chaud). Écart au pic **+19/255 sur R**, luminance 24 → 43. Le même lavis chaud remplit la bande morte au-dessus du cadre (x=540 : 34 → 43 de y=240 à y=480, maximum vers x≈520). | si la lueur vient de l'art de fond ou d'un effet posé sur le cadre — `m37` |
| `m5` | MINEUR | NOUVEAU | non | **L'aparté « ce qu'il a absorbé de vos règles » passe de 3 lignes à 2** : sa colonne est plus large. | réf **3 bandes** (y899-921, 928-946, 952-972), encre jusqu'à **x=970** ⇒ colonne de 175 px ; jeu **2 bandes** (y931-954, 958-981), encre jusqu'à **x=999** ⇒ colonne de **201 px (+14,9 %)**. Bord du panneau : réf x=1027, jeu x=1033. | — `m25`,`m26`,`m38` |
| `m6` | MINEUR | NOUVEAU | non | **Marges d'écran et hors-tout du cadre** légèrement différents. | rails du cadre : réf **x=21..1058** (marges 21/21, hors-tout 1038 px) ; jeu **x=18..1061** (marges **18/18**, hors-tout **1044 px**, +0,58 %), identique aux 2 résolutions. | — `m31C` |
| `m7` | MINEUR | NOUVEAU | non | **Boîte du CTA plus basse de 6 px.** | hauteur rail à rail **96 → 90 px** (−6,3 %) ; largeur **1038 → 1040 px** ; libellé inchangé (capitale 22 px, contraste 11,22 → 11,44). | — `m24`,`m36` |
| `m8` | MINEUR | NOUVEAU | non | **Le filet or sous le sous-titre est 6 px plus haut** dans le cadre. | offset depuis le rail haut du cadre : réf **211..217 px** → 2400 **205..211 px**, 1920 **204..211 px**. | — `m36` |

**Cause commune mesurée.** `M2` explique `m7`, une partie de `m5` et l'essentiel du vide sous le
CTA : le contenu du cadre passe de **1567 px (435,3 CSS)** à **1461 px (405,8 CSS)**, soit −106 px,
dont **−89 px sont le seul panneau élastique**. Ce n'est pas huit défauts, c'est un panneau trop
court plus quelques réglages.

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| id | ce qui est assumé | ce que je mesure | rendu proprement ? |
|---|---|---|---|
| `A1` | compteur ENFREINTES à « — » et non « 00 » | le tiret mesure **(127,212,217)** — le jeton cyan **exact** des deux chiffres (0/255) — encre x=852..900, bas d'encre y=773 contre 785 pour les chiffres (c'est un tiret : il est plus haut, pas décalé) ; boîte de même hauteur (116 px), libellé « ENFREINTES » de même capitale (14 px) et de même contraste (6,43:1) | **OUI** — le trou se lit comme un trou, pas comme une panne |
| `A2` | le col rendu par un TRIANGLE plein, sans liseré | remplissage aire/boîte **0,40** (un triangle ; le seuil de sortie est ~0,9) ; axe x **290,5** contre l'axe du cou **290,5** ; le col (y=1313..1387) ne recouvre pas le cou (y=1180..1256) | **OUI** (sa taille, elle, est le finding `m1`) |
| `A3` | le reflet du miroir est FIXE | présent, à **34,0 %** de la hauteur du panneau (1920 : 33,4 %) — dans le tiers haut | **OUI** (son intensité est le finding `m2`) |
| `A4` | 4 couleurs hors `DesignTokens` | les couleurs RENDUES sont à 0-1/255 de la maquette (contrôle positif n° 11-16) | **OUI** |
| `A5` | le nom du lieutenant est celui du compte | « LT. SKELD, VOTRE LIEUTENANT » ; **aucune** occurrence de « SALVATORE » ni de la mention « non projeté (L0.4) » que porte la maquette | **OUI** |
| `A6` | pas de section « gages » | aucune place réservée vide dans le panneau élastique | **OUI** |
| `A7` | un tiret « — » à la place de la PHASE (bandeau) | phase « — » ; **ARGENT alimenté** (9 627 820,00 €) et **JOUR 53** alimenté ; médaillon plein (« Brûlant / CHALEUR ») | **OUI** — état voulu hors district ; le reste du chrome se juge |
| `A8` | ronds du dock sans icône | 4 ronds, aucun coupé, libellés EMPIRE / FAMILLE / FILIÈRE / PLUS, soulignement or sous PLUS (x=802..839) aux 2 résolutions | **OUI** |
| `A9` | roster / règles / chiffres pas ceux d'un corps fourni | aucun slug, aucune clé brute, aucun mot anglais, aucun nom vide sur les deux planches (relevé exhaustif en annexe 2) | **OUI** |
| `A10` | à 1920 le CTA est sous la ligne de flottaison | le CTA est **entièrement hors champ**, pas coupé : dernier contenu à y=1618, rail bas du cadre à y=1626-1629, et **0 px d'or** sur les 43 rangées entre le rail bas et le dock (y=1630..1672, balayage exhaustif) ; le titre reste visible ; une affordance existe (finding `M1` pour sa position) | **OUI pour le régime** — la position de l'affordance est le finding `M1` |

---

## ARBITRAGES — non corrigibles côté client, ou déjà tranchés ailleurs

| id | arbitrage | mesure | destinataire |
|---|---|---|---|
| `R1` | **Halo des compteurs : écart de PORTÉE, dans le plafond déclaré.** Le halo existe, il est centré, il ne soude pas le chiffre au libellé — il est simplement **court**. | profil **extérieur** au glyphe (trous des « 0 » exclus par remplissage depuis le bord ; méthode `grandeurs-r15` §C, `d = 1` inclus) : réf `d1=70,9 d2=24,9 d3=23,5 d4=22,2 d5=19,8 d6=16,5 d8=12,7 d10=9,8 d12=7,5 d16=3,8 d20=0,8` ⇒ **portée ≥ 20 px** ; jeu 2400 `d1=102,8 d2=35,3 d3=5,2 d4=0,00 … d20=0,00` ⇒ **portée extérieure = 3 px** (1920 : `99,3 / 37,7 / 5,5 / 0,00` ⇒ 3 px). Mi-valeur (relative à `d2`) réf **d8**, jeu **d2**. Luminance **brute** à droite de l'encre : réf `1px:140,5 2px:39,1 3px:38,1 4px:37,1 6px:33,6 8px:31,0 12px:26,4 20px:18,1 30px:13,5` ; jeu `1px:94,4` puis **13,6 = le fond exact** dès 2 px. Vallée chiffre→libellé réf **+1,57 pt**, jeu **0,00 pt** (aucune soudure). Barycentre jeu **(−0,89 ; −0,07) px** (aucune tache décalée). Contrôle positif de l'instrument : il retrouve le profil de référence au centième (`d1=26,81 d2=25,11 … d18=0,81` avec la sonde dilatée du r15). ⇒ **3 px ≤ le plafond de 6 déclaré** : la déclaration du correcteur est **vérifiée**, l'écart est de portée seule. | user (dette déclarée TD-685 — non relue) |
| `R2` | **Le cadre laisse 250 px de bande morte au-dessus de lui à 2400** ; écart récurrent, aucun correctif déclaré. | zone libre mesurée **sur l'image** : l'inset haut du contenu est donné par le témoin ⑱ (sa liste commence exactement à **y=232**) et le haut du dock par la coupure nette de cette même liste (**y=2152**) ⇒ **zone libre = 1920 px = 533,3 CSS**. Le cadre y occupe **1628 px (452,2 CSS) = 84,8 %**, avec **250 px (69,4 CSS) vides au-dessus** — 0 rangée sur 250 porte le moindre contenu (écart max à la médiane de rangée ≤ 14 pts ; il n'y a qu'un dégradé de fond) — et 42 px au-dessous. **Le témoin ⑱, même commit, même shell, remplit cette zone à 100 %.** À 1920 le même cadre occupe **95,8 %** (1380/1440) et sa garde basse tombe à 8 px. Maquette : le bloc du cadre remplit son emplacement (1627 px de rails dans un bloc de 1663 px = **97,8 %**). | user (fond : bloc de hauteur fixe 462 CSS dans une zone libre de 533 CSS) |
| `R3` | **Police du sérif** : la référence a été rendue en **Noto Serif** (`Georgia` substitué, table `fc-match` du dossier), le client embarque **DejaVu Serif**. Famille et chasse ne sont pas opposables. | seules les **hauteurs de capitale** sont comparées, et elles sont égales : L=45/45, R=36/36, D=22/22, P=26/26 | — (arbitrage acté) |
| `R4` | **Libellés de la maquette en retard** : la référence affiche `HEAT`, `tiède`, `$ 24 850`, `JOUR 12` ; le client affiche `CHALEUR`, `Brûlant`, `9 627 820,00 €`, `JOUR 53`. Ruling « fr réel » : le client a raison. | — | maquette à mettre à jour (une fois) |
| `R5` | **Contraste du sous-libellé de tuile sous le seuil de doctrine, DES DEUX CÔTÉS.** La doctrine demande ≥ 4,5:1 pour un petit texte. | réf **3,71:1** ((107,115,125) sur (17,24,35)) ; jeu **3,78:1** ((106,115,125) sur (13,22,34)). Le client est **conforme à la maquette** ; c'est la maquette qui est sous le seuil. | user / DA (ce n'est pas un écart d'écran) |
| `R6` | **Ronds du dock sans icône** | arbitrage user connu ; 4 ronds vides, aucun coupé | — |

---

## 5. Autres résolutions

**1080×2400 (principale, format visé).** Mon inventaire tient. Rien de coupé (0 px d'encre sur les
4 bords), rien hors cadre, rien qui déborde de son parent **sauf** la carte portrait (`M2`, +10 px
sous son panneau). Ordre de lecture conservé. Le cadre flotte dans sa zone libre (`R2`).

**1080×1920.** Le contenu est **identique au pixel près** à celui de 2400 — décalage constant de
**232 px**, vérifié sur trois ancres or indépendantes (filet du titre +233, haut de la carte +232,
bas de la carte +232) : mêmes largeurs, mêmes hauteurs de bloc, mêmes bords droits (`x=1033`
partout). C'est le **cadre** qui est plus court (1380 px contre 1628), et lui seul : le CTA passe
hors champ, entièrement, sans être coupé. Rien de coupé sur les 4 bords non plus. Deux écarts
propres à cette résolution :
- **`M1` (MAJEUR)** — l'affordance de défilement décrite ci-dessus, absente à 2400 (contrôle
  d'existence : 0 colonne or > 30 % entre x=960 et x=1050 à 2400).
- **Régime vivable ?** Oui, avec une réserve. Visible sans défiler : titre, sous-titre, les 3
  compteurs, le panneau élastique **entier** (4 tuiles), le panneau d'explication **complet** (3
  lignes, y=1426..1580). Hors champ : la seule boîte CTA. L'affordance est **franche** (contraste
  6,6:1, 11 px de large, pleine hauteur) et **honnête** : son curseur clair occupe **1255 px sur
  1380 = 90,9 %**, contre **92,2 %** de contenu réellement visible que je mesure (1380 px visibles
  sur 1496 px du rail haut au bas de la boîte CTA). Un joueur sait donc qu'il reste peu à voir. La
  réserve est sa **position**, pas son existence : elle est dans le contenu, pas dans la gouttière.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Le chrome contre son canon — le fichier annoncé par le dossier est ABSENT.** Le dossier dit
   « dans ce dossier : `hud-canon-1176.png` » ; `find . -name 'hud-canon*'` ne rend **rien**. Je
   n'ai donc pu vérifier que la **cohérence interne** : les deux planches ㊲ et le témoin ⑱ (même
   commit) portent le même filet braise (224,102,73), le même médaillon, le même dock, le même
   soulignement or. *Mesure qui trancherait : joindre `Tools/juge-visuel/ecran-principal/ecran-canon.png`.*
   ⇒ **défaut de dossier.**
2. **Animation : non vérifié.** Aucune paire T / T+1 s ce tour (le dossier le déclare). Une image
   ne prouve pas l'absence d'animation. *Mesure : deux captures du même état à 1 s d'écart, compte
   des pixels différents, chrome exclu.*
3. **Les VALEURS ne sont pas comparables — et c'est acceptable pour ㊲.** Les planches
   photographient `operational_demo@example.test` (régime=défaut) ; le r15 était sur
   `demo_capture` ; aucun journal n'est joint, l'identité est **déclarée, non relue**. Donc
   « LT. SKELD », « JOUR 53 », « 9 627 820,00 € », le tiret d'ENFREINTES et les compteurs sont
   **non vérifiés**. **La comparaison à la maquette reste valide pour cet écran**, et voici
   pourquoi : le cadre de référence est l'état **VIERGE** (#120 « Rien n'a encore déteint ») et la
   capture est dans **le même état** — « 00 » règles données, « 00/4 » absorbées, les quatre tuiles
   éteintes, « Pas encore jugeable », « Rien n'a encore déteint », « Il vous écoute ». Les deux
   inventaires portent donc **les mêmes parties, dans les mêmes états** ; seuls les noms propres et
   les montants diffèrent. Toute la géométrie, la typographie, la palette et le rythme jugés
   ci-dessus sont indépendants du compte. *Mesure qui trancherait pour les valeurs : la ligne
   `[DemoIdentityResolver]` du journal du run, ou une planche prise avec la paire `MAFIA_DEMO_*`.*
4. **Le défilement lui-même.** L'affordance dit qu'il y a une suite ; une image ne prouve pas que
   le geste atteint le CTA. *Mesure : une planche prise après défilement jusqu'en bas.*
5. **Le rect imprimé par le test** n'est pas fourni ((g) non imprimé). J'ai vérifié ce que l'image
   permet : largeur 1080 des trois planches, cadre de largeur identique entre les deux résolutions,
   contenu superposable à 232 px près. L'échelle ×3,6 vient du dossier, je ne l'ai pas dérivée.
6. **Les nombres `[CADRE-B3]` déclarés** : je ne les ai pas pris pour prémisse (le dossier
   l'interdit) et je les ai retrouvés *a posteriori* dans un autre repère — « haut 550,4 u »
   = 464,4 px contre **482 px** de rail mesuré, et « 275,0 u = l'inset » = 232,0 px contre **250 px**
   de rail mesuré : **le même écart de +18 px des deux côtés**, donc un retrait constant entre la
   boîte déclarée et le liseré visible. Les déclarations sont cohérentes avec l'image ; je n'ai pas
   pu vérifier le retrait lui-même. *Mesure : le rect imprimé au run.*
7. **`TD-685`** : déclarée par la ligne GO, non fournie, non relue. J'ai mesuré, je n'ai pas lu.
8. **La cause des écarts** : je constate des pixels. Que `M2` vienne d'un `ContentSizeFitter`, que
   `M3` vienne du gabarit de silhouette ou du dimensionnement de la tête, que `m4` vienne de l'art de
   fond ou d'un effet posé sur le cadre — je ne peux pas le dire depuis une image.
9. **La 2ᵉ résolution est jugée sur une seule planche par résolution** ; aucune planche « écran
   seul » fraîche n'est fournie, donc je n'ai pas pu séparer ce que le shell recouvrirait de ce que
   l'écran dessine.

---

## Annexes

### Annexe 1 — Inventaire de la référence (fiches + couche globale)

Échelle ×3,6 ; « % » = part de la largeur intérieure du cadre (1033 px) ou de sa hauteur (1622 px).

| id | catégorie | parent | bbox (px) | forme / remplissage / bord | texte | relations |
|---|---|---|---|---|---|---|
| `R.cadre` | cadre | écran | (21,452)-(1058,2078) | rect, liseré or **3 px** (176,141,62) | — | marges d'écran 21/21 px ; hors-tout 1038×1627 |
| `R.titre` | panneau | `R.cadre` | y 481..670 (x non mesuré isolément) | rect, fond (12,18,28), filet or **7 px** (143 de luminance) en pied | « Le miroir » or (242,201,107), capitale **45 px**, sérif ; sous-titre (185,173,146) capitale **17 px**, capitales espacées, 2 lignes | garde haut au rail : **26 px** ; hauteur **190 px** (11,7 % du cadre) |
| `R.cpt1..3` | boîte | `R.cadre` | y 702..815 ; x ≈50..357 / ≈386..694 / ≈720..1029 | rect, liseré (53 de luminance), **dégradé vertical intérieur** (15,24,31)→(10,15,23)→(15,24,31) | chiffre cyan (127,212,217) h **37 px**, encre 67/68/67 px ; libellé (138,151,156) capitale **14 px** | hauteur **115 px** ; écart chiffre→libellé **21/21/22 px** ; **halo** de portée ≥ 20 px autour des chiffres |
| `R.elast` | panneau | `R.cadre` | y 848..1614, bord droit x=1029 | rect, liseré (42,54,72), fond (17,24,35) | — | hauteur **767 px** (47,3 % du cadre) |
| `R.carte` | carte | `R.elast` | y 877..1533, x 82..505 | rect, liseré or **3 px** | libellé « LT. HARA, VOTRE LIEUTENANT » ; « Il vous écoute » vert (125,179,106) capitale **23 px** ; « lieutenant.name — non projeté (L0.4) » | **424×657 px** ; retrait haut 29 px, **retrait bas 81 px** |
| `R.buste` | icône | `R.carte` | y 1050..1406 | silhouette sombre, largeur max **285 px** ; visage (185,173,146) **126×161 px** ; **chevelure latérale 20-23 px** au niveau des tempes ; col crème **61×61 px**, remplissage 0,40 | — | 0 rangée de peau sans flanc sombre |
| `R.aparte` | texte | `R.elast` | y 899..972, x 796..970 | — | **3 lignes**, (185,173,146) | colonne **175 px** |
| `R.tuile1..4` | rangée | `R.elast` | y 1000..1100, 1115..1215, 1231..1330, 1346..1446 | rect, liseré (42,54,72), fond (17,24,35), pastille ronde | titre (185,173,146) h d'x **16 px** ; sous-libellé (107,115,125) | hauteur **101 px**, pas **115 px**, écarts entre tuiles **14/15/15 px** — **rythme régulier** |
| `R.reflet` | effet | `R.elast` | pic à **y=1083**, x 79..1001 | trait horizontal turquoise (49,79,89), **pic 30,7 pts**, épaisseur à mi-hauteur **9 px** | — | à **30,7 %** de la hauteur du panneau |
| `R.bas` | panneau | `R.cadre` | y 1647..1920 | rect, fond (15,22,32) | sur-titre gris espacé ; titre crème (234,224,200) capitale **36 px** ; paragraphe 3 lignes, pas 33/32 px | hauteur **274 px** |
| `R.cta` | bouton | `R.cadre` | y 1952..2047, x 21..1058 | rect, liseré or, fond (22,25,27) | « DONNER UNE PREMIÈRE RÈGLE » or, capitale **22 px** | hauteur **96 px** ; garde bas au rail **29 px** |

**Couche globale (intérieur du cadre)** : luminance moyenne **31,14** · densité d'encre **12,11 %** ·
contrastes principaux 11,92 / 13,84 / 11,33 / 8,45 / 6,43 : 1 · vide total dans le cadre **55 px**
(26 en haut, 29 en bas) · rythme vertical : 481 / 702 / 848 / 1647 / 1952 / 2078.
**Palette** : après contrôle du biais de seau (quantification à 24 puis décalée de 12), l'image est
dominée à **73,8 %** par un unique seau très sombre — le découpage à décalage 0 fabriquait une
fausse différence de palette avec la capture (frontière de seau à G=24). *Contrôle fait, résultat
écarté.*

### Annexe 2 — Inventaire de la capture (1080×2400) + relevé de langue

Mêmes parties, mêmes états, aux positions décalées de +30 px (rail haut 452 → 482).
Différences de fiche par rapport à l'annexe 1 : `titre` **184 px** · `cpt` **116 px, aplat sans
dégradé** · `elast` **678 px** · `carte` **425×659 px, retrait bas −10 px (elle dépasse)** ·
`buste` visage **137×172 px, chevelure latérale 0-9 px**, col **78×75 px** · `aparte` **2 lignes,
colonne 201 px** · `tuiles` **93 px, pas 107 px** (rythme régulier : 997 / 1104 / 1211 / 1319 —
mon premier relevé donnait un pas irrégulier, c'était le reflet du miroir compté comme bord de
tuile ; corrigé) · `reflet` **pic 51,6 pts, bord à bord** · `bas` **267 px** · `cta` **90 px** ·
vide dans le cadre **160 px** (25 en haut, **135 en bas**). Partie **EN TROP** à 1920 seulement :
`J.ascenseur` (11×1380 px, or 191,150,67).

**Couche globale** : luminance moyenne **31,16** · densité d'encre **12,31 %** · palette dominée à
**87,6 %** par le même seau sombre (contrôle de décalage fait).

**Relevé de langue (exhaustif, les deux planches)** : « Le miroir » · « UN LIEUTENANT NEUF N'A
ENCORE RIEN ABSORBÉ » · « RÈGLES DONNÉES » · « ABSORBÉES » · « ENFREINTES » · « LT. SKELD, VOTRE
LIEUTENANT » · « Pas encore jugeable » · « ce qu'il a absorbé de vos règles » · « col ouvert / la
comptabilité tenue » · « manches basses / la justice envers les siens » · « montre cachée / la
ponctualité » · « gants sales / la discrétion devant les civils » · « Il vous écoute » · « « PAS
JUGEABLE » N'EST PAS « MOYEN » » · « Rien n'a encore déteint » · le paragraphe · « DONNER UNE
PREMIÈRE RÈGLE » · chrome : « ARGENT », « JOUR 53 », « Brûlant », « CHALEUR », « EMPIRE »,
« FAMILLE », « FILIÈRE », « PLUS ». **Aucun mot anglais, aucun slug, aucune clé brute, aucun enum,
aucun nom vide.**

### Annexe 3 — Correspondance des repères

| | référence | capture 2400 | capture 1920 |
|---|---|---|---|
| échelle du contenu | ×3,6 (1080 px = 300 CSS) | ×3,6 | ×3,6 |
| rapport capture ÷ référence | — | **1,00** | **1,00** |
| rail haut du cadre (bord extérieur) | y = **452** | y = **482** | y = **250** |
| rail bas du cadre (bord extérieur) | y = **2078** | y = **2109** | y = **1629** |
| rails gauche / droit | x = 21 / 1058 | x = 18 / 1061 | x = 18 / 1061 |
| décalage 1920 → 2400 | — | — | **+232 px**, vérifié sur 3 ancres or (+233 / +232 / +232) |
| inset haut du contenu (chrome) | — | **y = 232**, mesuré sur le **témoin ⑱** (1ʳᵉ rangée de sa liste) | y = 232 |
| haut du dock | — | **y = 2152**, mesuré sur le **témoin ⑱** (coupure nette de sa liste) | y = 1672 (report) |
| filet du bandeau | — | y = 141 | y = 141 |

Toute mesure du §3 est exprimée soit en px de l'image (comparables, rapport 1,00), soit en CSS
(÷3,6), soit en % du parent.

### Annexe 4 — Scripts

`mesures/lib.py` (luminance, contraste WCAG, médianes, détection d'or) — puis, par famille de
grandeurs :

| script | ce qu'il mesure | contrôle |
|---|---|---|
| `m01_cadre_repere.py` | rangées d'or (rails, filets) des 3 images | positif : largeur 1080 des 3 images |
| `m02_colonnes_or.py` | colonnes d'or verticales → rails + **découverte de la barre à 1920** | négatif : la moitié gauche ne rend qu'un rail |
| `m03_bords_droits.py` | bord droit de l'encre, rangée par rangée | négatif : le bord gauche, même méthode |
| `m04_ascenseur.py` | géométrie, contraste, profil de la barre | négatif d'existence à 2400 ; négatif de marge gauche |
| `m05_ascenseur_profil.py` | profil fin + **ce que la barre recouvre** (report sur 2400) | contrôle de l'offset sur 3 ancres |
| `m06_ascenseur_curseur.py` | curseur / glissière, largeur des segments, proportions | — |
| `m07..m10` | localisation des chiffres cyan et des boîtes de compteur | positif : le jeton cyan est trouvé dans les 3 images |
| `m11_halo.py` | **profil de halo** (méthode `grandeurs-r15` §C, sonde dilatée) | **positif : retrouve le profil de référence d1=26,81 … portée 18** |
| `m12_halo_diag.py` | où vit la masse d'excès (diagnostic du barycentre) | — |
| `m13_halo_exterieur.py` | **profil EXTÉRIEUR au glyphe** (trous exclus par remplissage depuis le bord) | positif : réf portée ≥ 20 ; le compteur 2 montre la contamination du « /4 » |
| `m14_halo_bary.py` | barycentre (d ≤ 6, hors trous), symétrie | — |
| `m15_ecart_libelle.py` | écart chiffre → libellé, par compteur | — |
| `m16..m18, m22, m37, m38` | chrome, zone libre, bande morte, lueur, **inset mesuré sur le témoin** | positif : filet du bandeau à la même rangée sur les 3 planches |
| `m19..m21, m32, m33` | gardes internes, frontières horizontales, panneaux, tuiles | positif : rails or et filet du titre sortent en tête du détecteur |
| `m23..m26` | hauteurs de capitale, bandes de lignes, aparté | positif : « Le miroir » 45/45 ; négatif : le corps sort nettement plus bas |
| `m27, m28, m31, m32` | jetons, fonds, contrastes, bords, couche globale, **contrôle du biais de seau** | positif : rail or 1/255 ; négatif : cyan ≠ crème |
| `m29, m34, m35, m36, m39` | portrait, reflet, col, silhouette, **chevelure** | positif : la référence rend une chevelure non nulle à toutes les sondes |
| `m30_crops.py` | découpes côte à côte (`crop_portrait.png`, `crop_compteurs.png`, `crop_tuiles.png`, `crop_barre.png`) | — |
| `m40_verifs.py` | re-vérification de chaque nombre cité (écarts entre tuiles, jeton du tiret, or sous le cadre à 1920, liserés) | balayage exhaustif y=1630..1672 |

**Deux instruments réfutés en cours de route, et corrigés** (consignés parce qu'ils auraient fait
écrire des faux) : (a) un détecteur de tuiles par seuil de fond a rendu des hauteurs **93/99/93/92**
et des pas **101/113/108** — l'irrégularité était le **reflet du miroir** compté comme bord de
tuile ; en lisant les pixels du liseré (42,53,73) contre ceux du reflet (27,44,45), les tuiles sont
**93 px, pas 107**, parfaitement régulières ; (b) un histogramme quantifié à 24 donnait deux
palettes dominantes différentes (36,9 % contre 56,1 %) — le contrôle à décalage 12 les ramène à
73,8 % et 87,6 % du **même** seau : la différence était une frontière de seau à G=24, pas une
dérive de palette.
