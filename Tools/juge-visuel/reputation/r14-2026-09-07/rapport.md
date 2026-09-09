# Juge visuel ⊥ — ㊲ La réputation (« le miroir ») — r14 — 2026-09-07

Planches jugées : `capture-1080x2400.png` (sha256 `452ecd57…`, PRINCIPALE) et
`capture-1080x1920.png` (sha256 `f444402a…`) — les deux empreintes vérifiées contre
`captures-provenance.md` avant toute mesure. Référence : `reference-1080x2102.png`
(cadre nominal #120). Instruments : `mesures/m01…m26`, chacun imprime la taille des
images qu'il ouvre.

## Verdict : NON APPROUVÉ

Le halo des compteurs a cessé d'être trop fort ; il est devenu une **tache lumineuse fixe
posée SOUS le chiffre**, identique au décimal pour un « 00 » et pour un tiret de 4 px.
Et le correctif qui a refermé le pied du panneau élastique l'a raccourci de 89 px sans
raccourcir le cadre : la carte portrait **sort de son panneau** aux deux résolutions et
139 px de vide s'ouvrent dans le cadre sous le bouton. À 1920 le placement n'a pas bougé :
le losange du chrome est toujours posé sur le mot « miroir » et le CTA traverse toujours
le filet bas du cadre.

---

## Convention de bord — déclarée avant les chiffres

- **Bord d'un trait** (filet, rail, liseré, boîte) : la première ligne/colonne où la
  luminance franchit la **mi-hauteur** entre le plateau du fond et le plateau de l'encre,
  sur la **médiane** de la bande. Le « cœur » est l'extremum. Quand je donne un
  « mi-alpha », c'est le milieu de l'intervalle des rangées au-dessus de la mi-hauteur.
- **Bbox d'encre** : inclusive (x0..x1 = premier..dernier px d'encre), avec son seuil
  écrit à côté.
- **Encre d'une rangée** : px dont la luminance dépasse la **médiane de sa propre rangée**
  d'une marge déclarée. La médiane d'une rangée EST son fond (l'encre y est minoritaire
  en colonnes) : ce choix retire le dégradé de fond sans aucun réglage.
- **Aplat** : médiane d'une fenêtre 7×7 prise à ≥ 3 px de tout bord.
- **Fond d'un halo** : 10ᵉ percentile de **chaque rangée** de la boîte (robuste à l'encre
  et au halo, vérifié égal au minimum de la rangée sur les rangées vides).

## Correspondance des repères

| | référence | capture 2400 | capture 1920 |
|---|---|---|---|
| échelle du CONTENU | ×3,6 | ×3,6 | ×3,6 (rapport **1,00**) |
| filet HAUT du cadre (origine des offsets) | y=452 | y=482 | y=162 |
| filet BAS du cadre | y=2076..2078 | y=2106..2109 | y=1626..1629 |
| rails du cadre | x21..23 / x1056..1058 | x18..20 / x1059..1061 | idem 2400 |
| filet du bandeau (chrome) | — (évocation) | y=141..142 | y=141..142 |
| échelle du CHROME (canon 1176 px = 392 CSS) | — | ×0,9184 | ×0,9184 |

Toute grandeur de contenu est donnée **en offset depuis le filet haut du cadre**, ou
depuis le **bloc** qui la porte (bornes des blocs en annexe 3). Vérification de l'échelle
1,00 : filet or `(176,141,62)` / `(176,141,61)`, carte portrait 421,0 → 421,5 px de large,
titre 416 → 418 px — le contenu est bien à la même échelle des deux côtés.

---

## 0. L'écran, tel que la maquette le dit

**But.** Se lire sur son lieutenant : ce n'est pas un tableau de bord, c'est un **portrait**.
On vient voir ce qu'il a *absorbé* des règles qu'on lui a données — et, sur un compte neuf,
constater qu'il n'a rien pris.

**Ordre de lecture.** (1) « Le miroir », or, sérif, 48 px de capitale, seul objet doré du
haut ; (2) les **trois chiffres cyan** — la seule couleur froide et vive de l'écran, sur
une rangée ; (3) le **visage**, plein cadre dans une carte cerclée d'or, avec sous lui la
phrase verte « Il vous écoute » ; (4) les **quatre indices de tenue** à droite ; (5) le
panneau d'explication ; (6) le **bouton unique**, or, en bas.

**Zones.** Enseigne (titre + sous-titre, fermée par un filet or) · rangée de trois
compteurs · panneau élastique (carte portrait à gauche, en-tête + quatre tuiles à droite)
· panneau de texte · CTA.

**Traits d'identité.** (a) l'or du cadre et du titre sur un bleu nuit presque noir ;
(b) le **cyan** des compteurs, la seule couleur froide ; (c) le **portrait** occupant la
moitié gauche, cerclé d'or, coiffe sombre qui encadre le visage ; (d) le **reflet**, une
ligne teal horizontale qui glisse dans le tiers haut du panneau, signature « miroir » ;
(e) une seule action, en bas, dorée.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour le but, l'ordre de lecture et quatre traits d'identité sur cinq : à 2400 on lit
le titre, puis les trois chiffres cyan, puis le visage, puis les tuiles, puis le bouton,
exactement dans cet ordre. Palette, luminance et densité coïncident (luminance moyenne du
cadre 32,15 → 31,71, densité d'encre 11,17 % → 11,09 %, 12 aplats sur 13 à ≤ 6/255).

Trois écarts pèsent, dans cet ordre.

**1. Les compteurs.** Chaque chiffre repose sur une **tache lumineuse fixe**, posée 17 px
plus bas que lui, qui ne rayonne pas : il n'y a **strictement aucune lumière au-dessus du
chiffre** (18 pts·px contre 42 133 au-dessous ; la maquette est à 1,04). Elle a le même
pic et la même largeur — au décimal — pour un « 00 » de 62 px, un « 00/4 » de 103 px et un
tiret de 47 px : elle ne parle pas du glyphe. Sur ENFREINTES, où la valeur est un tiret,
la tache porte dix fois plus de matière que le tiret : le trou ne se lit plus comme un trou,
il se lit comme une lampe. C'est le seul endroit de l'écran qui n'a pas l'air dessiné.

**2. Le cadre ne tient plus son contenu.** À 2400 il y a 340 px de vide entre le bandeau et
le cadre, puis 139 px de vide **dans** le cadre sous le bouton (la maquette en laisse 32) ;
le cadre n'occupe que 79,0 % de la zone libre contre 97,5 % au canon. Et le panneau
élastique a maigri de 89 px pendant que le cadre gardait sa taille : la **carte portrait
dépasse de 9 px sous le bord de son propre panneau**, son filet or croisant celui du
panneau. L'écran donne l'impression d'un bloc trop court flottant dans une boîte trop
grande.

**3. Le portrait.** Le reflet n'est plus un reflet : il traverse 97 % de la largeur du
panneau (contre 88 % au canon) et coupe la tête. Et la coiffe reste une calotte plate qui
ne descend pas sur les tempes — 0 px de sombre latéral là où la maquette en met 20, et
9 rangées où la peau touche le fond sans contour. Le visage ne se lit plus comme
« encadré ».

À **1920**, la lecture casse franchement : le **losange or du chrome est posé sur le mot
« miroir »**, l'arc bas du médaillon entre dans le panneau d'enseigne, et le **filet bas du
cadre traverse le bouton**, qui déborde de 19 px sous lui.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes ces grandeurs sont mesurées par les mêmes scripts que les écarts.

| # | grandeur | référence | jeu (2400) | Δ | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet à filet | 452..2078 = **1627** | 482..2109 = **1628** | +1 px | `m01` |
| 2 | carte portrait, largeur hors-tout du filet or | **421,0 px** | **421,5 px** | +0,1 % | `m14` |
| 3 | carte portrait, hauteur hors-tout | 653,0 px | 654,5 px | +0,2 % | `m14` |
| 4 | marge au-dessus de la carte dans le panneau | **30,0 px** | **30,0 px** | **0** | `m14` |
| 5 | filet or du cadre (cœur) | (176,141,62) | (176,141,61) | **1/255** | `m21` |
| 6 | 12 aplats sur 13 (fond de cadre haut/bas, enseigne, boîte de compteur, panneau élastique, carte, torse, peau, crème, panneau bas, boîte du CTA, tuile) | — | — | **≤ 6/255**, 8 à ≤ 3/255 | `m20` |
| 7 | crème du col · vert « Il vous écoute » | (185,173,146) · (125,179,106) | idem · idem | **0/255** | `m20`,`m21` |
| 8 | cyan du chiffre (cœur de l'encre) | (127,212,217) | (127,212,217) | **0/255** | `m08` |
| 9 | titre « Le miroir » : capitale · largeur · encre | 48 px · 416 px | 48 px · 418 px | 0 · +0,5 % | `m19` |
| 10 | titre « Le miroir » : contraste | **11,83:1** | **11,55:1** | −0,28 | `m20` |
| 11 | sous-titre : capitale · largeur · contraste | 18 px · 776 px · 8,31:1 | 18 px · 768 px · 8,19:1 | 0 · −1,0 % | `m19`,`m20` |
| 12 | « Il vous écoute » : capitale · largeur · contraste | 24 px · 238 px · **7,23:1** | 25 px · 241 px · **7,38:1** | +1 px · +1,3 % | `m21` |
| 13 | titre du panneau bas : capitale · largeur · contraste | 38 px · 613 px · **13,57:1** | 37 px · 607 px · **13,85:1** | −1 px · −1,0 % | `m21` |
| 14 | sur-titre du panneau bas : capitale · largeur · contraste | 19 px · 586 px · 5,99:1 | 19 px · 591 px · 6,05:1 | **0 px** · +0,9 % | `m21`,`m24` |
| 15 | libellé du CTA : capitale · largeur · contraste | 24 px · 609 px · **11,22:1** | 23 px · 607 px · **11,44:1** | −1 px · −0,3 % | `m21` |
| 16 | panneau bas : nombre de lignes · pas des 3 lignes de paragraphe | 5 · 33/33 px | 5 · 33/32 px | 0 · ≤ 1 px | `m19` |
| 17 | gouttières entre les 4 tuiles | 14/15/15 px | 15/14/15 px | ≤ 1 px | `m13` |
| 18 | largeur de la boîte du CTA | 980 px | 974 px | −0,6 % | `m26` |
| 19 | épaisseur de la ligne de balayage | 8 px | 7 px | 1 px | `m10` |
| 20 | position du reflet dans le panneau (tiers haut) | **30,7 %** | **33,9 %** | ASSUMÉ tenu | `m10` |
| 21 | largeur max de la silhouette de coiffe | **152 px** | **152 px** | **0** | `m15` |
| 22 | luminance moyenne du cadre · densité d'encre | 32,15 · 11,17 % | 31,71 · 11,09 % | −1,4 % · −0,7 % | `m24` |
| 23 | rien de coupé : encre sur les rangées/colonnes de bord (2400 ET 1920) | — | **0 px > L45** aux 4 bords | rien hors cadre | `m24` |
| 24 | contraste des chiffres cyan (cœur vs anneau d2..d4) | **11,03:1** | **11,34:1** | +0,31 | `m08` |
| 25 | filet du bandeau (chrome) : rangée | canon ramené y=141 | capture y=141..142 | **0 px** | `m23` |
| 26 | gouttière carte → tuiles (mi-alpha à mi-alpha) | rail droit de la carte 504,0 → bord de tuile 544,5 = **40,5 px** | 501,0 → 541,5 = **40,5 px** | **0,0 px** | `m11`,`m13` |

---

## Le halo — CERTIFICATION

### La méthode, déclarée avant de compter

**Boîte de mesure.** L'intérieur du `.fen` de chaque compteur (bords obtenus en `m05b` par
le liseré horizontal, qui donne directement l'étendue en x), **érodé de 8 px** : le liseré
fait 3 px et sa frange d'anti-crénelage 2 à 3 px de plus. La boîte contient le chiffre ET
son libellé — c'est la case que le dossier désigne.

**(1) Comptage des bandes, et le test de « sans seuil ».**
`e(y) = MOYENNE(rangée) − MÉDIANE(rangée)`. La médiane d'une rangée est son fond quel que
soit le dégradé ; la moyenne le dépasse d'autant qu'il y a d'encre ; `e(y) = 0` sur une
rangée vide **par construction**, sans marge ni standoff à choisir.
`bandes(f)` = runs maximaux de rangées où `e(y) ≥ f·max(e)`, `f` balayé de 0,02 à 0,60.
**Le compte n'est un FAIT que sur le PLATEAU de constance le plus large** ; je publie la
courbe entière et la largeur du plateau. Grandeur continue **sans aucun réglage**, publiée
à côté : la **VALLÉE** = minimum de `e(y)` entre la bande du chiffre et celle du libellé,
en points et en fraction du plus petit des deux pics (0,000 = deux bandes franchement
séparées, 1,000 = une seule masse).

**(2) Coquilles de Chebyshev.** `encre` = px de la boîte de luminance ≥ fond + 0,50·(P99,5 −
fond) (sensibilité balayée à 0,40 et 0,60 : ±6 % sur la population d'encre). `coquille d` =
px non-encre à distance de Chebyshev exactement `d`. `excès(d)` = moyenne de la coquille
moins le fond **de sa propre rangée** (p10).

**(3) Contraste des chiffres** = WCAG entre la médiane du **cœur** de l'encre (px d'encre
dont les 24 voisins à ±2 sont tous encre) et le fond local (coquilles d2..d4).

**(4) Ajustement** `A·exp(−d/λ)` par moindres carrés sur `ln(excès)`, d2..d12.

**(5) Forme** (question que le profil radial ne pose pas) : barycentre de l'excès (> 1 pt)
contre barycentre de l'encre du **chiffre seul**, dans une fenêtre **symétrique** de 12
rangées au-dessus et 12 au-dessous de la bande du chiffre (bornée pour ne jamais toucher
la bande du libellé) ; et la lumière totale au-dessus contre au-dessous.

**Contrôles.** Positif : la référence doit rendre **2 bandes** sur son plateau et son cœur
d'encre doit être le cyan nominal `(127,212,217)`. Les deux passent. Négatif : une bande
vide du cadre rend **max(e) = 0,313 pt** et **0 bande**.

> **Deux versions fausses de cet instrument sont conservées dans l'en-tête de `m06`, avec la
> raison qui les a trahies.** (a) érosion de 3 px : la frange du liseré restait dans la
> boîte, le « fond » pris aux 4 coins valait 26,3 côté référence au lieu de ~14, et **tous**
> les excès sortaient négatifs — c'est le signe *uniforme* qui a trahi l'instrument, pas la
> valeur ; (b) seuil d'encre pris sur le maximum du profil de **rangées** (une moyenne, ~65)
> au lieu du maximum des **pixels** (~194) : le halo lui-même était classé « encre » et le
> « cœur du chiffre » rendait `(53,87,92)`, c'est-à-dire la couleur du halo.

### Les chiffres

**(1) Bandes d'encre — le compte, et pourquoi le compte seul ne tranche pas.**

| compteur | plateau (réf) | plateau (jeu 2400) | vallée réf | vallée jeu |
|---|---|---|---|---|
| 1 RÈGLES DONNÉES | **2** bandes, f = 0,09..0,53 (largeur 0,44) | **2** bandes, f = 0,09..0,32 (largeur 0,23) | **1,45 pt** (0,046) | **2,75 pt** (0,096) |
| 2 ABSORBÉES | **2**, f = 0,08..0,60 (0,52) | **2**, f = 0,10..0,46 (0,36) | 0,21 pt (0,005) | 2,39 pt (0,066) |
| 3 ENFREINTES | **2**, f = 0,13..0,58 (0,45) | **2**, f = 0,29..0,48 (0,19) | 0,60 pt (0,019) | 1,22 pt (0,041) |

À 1920 : valeurs identiques au dixième (2 bandes, plateaux 0,09..0,31 / 0,10..0,46 /
0,29..0,48).

**Ce qui départage le « 2 » du correcteur et le « 1 » du r13, c'est la méthode, et je peux
le dire exactement : le compte de bandes n'est PAS un critère sans seuil.** Il dépend
entièrement du niveau choisi. Sur ce même profil, cadre 1 :

```
f ≥ 0,09  →  2 bandes (réf)      f ≥ 0,09  →  2 bandes (jeu)
f = 0,05  →  3 bandes (réf)      f = 0,05  →  1 bande  (jeu)
f = 0,04  →  2 bandes (réf)      f = 0,04  →  1 bande  (jeu)
```
Un compteur qui prend un seuil **relatif** ≥ ~0,09 rend 2 des deux côtés ; un compteur qui
prend un seuil **absolu** entre 1,5 et 2,7 points rend 2 côté référence et **1** côté jeu,
parce que la vallée de la référence descend à 1,45 pt et celle du jeu s'arrête à 2,75 pt.
Aucun des deux n'a tort : ils n'ont pas déclaré leur critère. Ce qui EST sans réglage, ce
sont les deux colonnes de droite du tableau — **la largeur du plateau** et **la vallée en
points** — et elles disent : *la soudure du r13 est défaite ; l'interligne reste 1,9 fois
plus rempli qu'au canon*.

**(2) Profil d'excès par distance de Chebyshev** (fond = p10 par rangée ; compteur 1) :

| d | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 26 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **réf** | +8,7 | +9,4 | +6,1 | +4,9 | +4,3 | +3,9 | +3,0 | +1,9 | +1,6 | +1,4 | +1,4 | +1,5 | +2,1 |
| **jeu** | +6,1 | +7,1 | +6,5 | +5,4 | +7,3 | +3,3 | **0,0** | **0,0** | **0,0** | **0,0** | **0,0** | **0,0** | **0,0** |
| **jeu/réf** | **0,71** | 0,76 | 1,06 | 1,11 | **1,67** | 0,84 | **0,00** | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |

Compteur 2 : 0,60 · 0,70 · 0,85 · 0,90 · 1,26 · 0,46 · 0,00 …
Compteur 3 (le tiret) : 0,50 · 0,63 · 1,13 · 1,47 · **2,38** · **2,61** · **3,48** · **5,92** · **8,33** · 0,00 …

Deux faits sortent de ce tableau. Le premier : **le jeu tombe à ZÉRO EXACT à partir de
d = 14** (d = 20 pour le compteur 3), alors que la référence décroît encore doucement
jusqu'à d ≈ 26. Le halo du jeu a un **bord dur** ; celui du canon a une queue. Le second :
le profil du jeu **n'est pas monotone** (d10 > d8 > d6 sur les compteurs 1 et 2 ; d18 ≫ d2
sur le compteur 3). Un rayonnement centré sur son glyphe décroît toujours avec la distance ;
celui-ci passe par un maximum **loin** du glyphe, parce que sa source n'est pas le glyphe.

> ⚠️ **Mes valeurs absolues ne sont pas comparables à celles du r13** (réf d2 +29,7 ; r13
> jeu d2 +65,0). Le r13 retranchait un fond global ; je retranche le fond **de chaque
> rangée**, ce qui était nécessaire ici (la boîte de la référence porte un dégradé vertical,
> celle du jeu est un aplat — voir `m8` ci-dessous), sinon le dégradé du canon se compte
> comme du halo. La comparaison **réf ↔ jeu** est faite avec un seul instrument des deux
> côtés : c'est elle qui porte le verdict, pas le rapprochement avec les nombres du r13.

**(3) Contraste des chiffres** : réf **11,03:1** → jeu **11,34:1** (compteur 1 ; 10,96 →
11,34 sur le compteur 2). Le fond local d2..d4 est `(12,18,26)` en référence et
`(13,13,22)` en jeu. **Le contraste est restauré et même très légèrement supérieur au
canon** (r13 : 8,67 → 4,49).

**(4) Ajustement `A·exp(−d/λ)` sur d2..d12** : réf `A = 11,79 pts, λ = 16,84 px` ;
jeu `A = 7,89 pts, λ = 21,11 px`. Soit **alpha ×0,67** et **rayon ×1,25** — mais
l'ajustement exponentiel **ne décrit pas** le profil du jeu (non-monotone, bord dur) : je le
donne parce que le dossier le demande, et je dis qu'il est **inapplicable** ici. Le r13
mesurait ×2,13 et ×1,57 : l'excès d'alpha est parti.

**(5) La forme — la grandeur qui n'avait jamais été mesurée, et qui décide.**

| grandeur (chiffres seuls, fenêtre symétrique) | réf c1 | réf c2 | réf c3 | jeu c1 | jeu c2 | jeu c3 |
|---|---|---|---|---|---|---|
| écart vertical barycentre halo − barycentre chiffre | **+0,6 px** | +0,1 | −0,0 | **+18,4 px** | +16,5 | +13,1 |
| lumière 20 rangées AU-DESSUS du chiffre | 18 948 | 20 677 | 18 948 | **18** | **18** | **18** |
| lumière 20 rangées AU-DESSOUS | 21 840 | 26 967 | 20 197 | 42 133 | 42 447 | 41 397 |
| **rapport dessous/dessus** | **1,15** | **1,30** | **1,07** | **2 328** | **2 383** | **2 288** |

Sur une fenêtre **strictement symétrique de 12 rangées** de chaque côté (aucune ne touche le
liseré ni la bande du libellé) : référence **176,7 contre 184,4** (rapport 1,04) ; jeu
**0,0 contre 643,3**.

Et la tache est **la même sur les trois compteurs, au décimal**, pour trois glyphes de
tailles très différentes :

| rangée (jeu 2400) | pic d'excès | largeur à mi-hauteur | c1 (« 00 », 62 px d'encre large) | c2 (« 00/4 », 103 px) | c3 (tiret, 47 px) |
|---|---|---|---|---|---|
| y = 790 | **68,3** | **45 / 44 / 45 px** | x181..225 | x518..561 | x854..898 |
| y = 795 | **58,9** | 42 / 42 / 42 px | x183..224 | x519..560 | x855..896 |
| y = 800 | **45,2** | 37 / 38 / 37 px | x185..221 | x521..558 | x858..894 |
| y = 805 | **27,1** | 30 / 30 / 30 px | x189..218 | x525..554 | x861..890 |

Trois pics identiques à la décimale, trois largeurs identiques à ±1 px, trois centres qui
tombent exactement sur les centres des trois **boîtes** (203,0 / 539,5 / 876,0). En
référence, à 4 px sous les chiffres, la lueur fait **77 px** de large pour un « 00 » de
69 px : elle suit le glyphe. Ici, elle l'ignore.

Enfin, le **libellé** ne rayonne plus : sous sa bande, la référence porte 1 764 pts·px de
lumière, le jeu **0** (`m25`). Le champ lumineux du jeu s'arrête net au bas du libellé
comme il s'arrête net au haut du chiffre.

### Conclusion sur le halo

**Les quatre grandeurs que le r13 avait nommées sont FERMÉES :**
l'alpha (×2,13 → ×0,67), le rayon utile (portée à +5 pts : d30 → **d12**, contre d16 au
canon), le contraste des chiffres (4,49:1 → **11,34:1**, canon 11,03:1) et la soudure
chiffre/libellé (1 bande → **2**, sur un plateau).

**La question reste OUVERTE, pour une raison qui n'a jamais été mesurée** : ce qui est
dessiné n'est pas un rayonnement du glyphe. C'est une **tache fixe**, de taille, de
position et d'intensité identiques quel que soit le glyphe, centrée sur la boîte et posée
13 à 18 px **sous** la ligne des chiffres, avec **zéro** lumière au-dessus (canon : rapport
1,04 à 1,30). Ce n'est ni « fermé » ni « sur-corrigé » : la **quantité totale** de lumière
est celle du canon (42 151 contre 40 788 pts·px sur la même fenêtre, +3,3 %) — elle est
entièrement **déplacée**.

⇒ Le défaut a **migré vers l'intérieur** d'un cran, comme les trois tours précédents :
r12/r13 = *magnitude* (alpha, rayon) ; r14 = *placement et dépendance au glyphe*. La
grandeur à surveiller au tour suivant n'est plus un profil radial, c'est le **rapport
dessous/dessus** (canon 1,04–1,30) et l'**identité des trois profils entre compteurs**
(si les trois compteurs rendent le même profil au décimal, l'effet ne parle pas du glyphe).

---

## La ligne cyan

Le dossier demande de mesurer indépendamment si c'est l'**écran** ou la **chaîne de
capture**. Quatre discriminants exécutables sur des images :

| | discriminant | résultat |
|---|---|---|
| D1 | la référence la porte-t-elle ? | **OUI** — pic à y=1083, épaisseur 8 px, couleur `(63,102,105)`. Une planche rendue par Chrome ne peut pas porter un parasite de la chaîne de capture Unity. |
| D2 | position **relative au panneau** identique aux deux résolutions ? | **OUI** — 33,9 % à 2400 (y=1104 dans 874..1550), 33,7 % à 1920 (y=783 dans 556..1229). Les rangées **absolues** diffèrent de 321 px. Un parasite de capture est ancré à une rangée de l'appareil, pas à un panneau. |
| D3 | traverse-t-elle des zones qu'aucun élément ne peut dessiner (marges hors cadre, chrome) ? | **NON** — 0 colonne d'excès > 2 pts en x < 16 et x > 1063, aux deux résolutions. |
| D4 | profil net (1 px, bords francs) ou doux ? | **doux** : 7 px à mi-hauteur, couleur `(70,120,125)`, dégradé sur ses bords. |

⇒ **C'est l'ÉCRAN, pas la chaîne de capture.** Le doute exprimé côté Unity est levé : la
ligne est un élément dessiné, présent au canon, à la même place relative aux deux
résolutions.

Ce qui est en écart, c'est son **étendue** et son intensité :

| grandeur | référence | jeu (2400 = 1920) | Δ |
|---|---|---|---|
| étendue à 25 % du pic | x185..895 = **711 px** | x109..996 = **888 px** | **+24,9 %** |
| étendue à 10 % du pic | x109..969 = **861 px** | x60..1019 = **960 px** | +11,5 % |
| en % de la largeur du panneau élastique (981 / 977 px) | 72,5 % (25 %) · 87,8 % (10 %) | **90,9 %** (25 %) · **98,3 %** (10 %) | +18 pts · +10 pts |
| pic d'excès · épaisseur à mi-hauteur | 80,2 pts · 8 px | 95,8 pts · 7 px | +19,5 % · −1 px |
| position relative dans le panneau | 30,7 % | 33,9 % | tiers haut des deux côtés |

À 10 % du pic elle touche **les deux bords** du panneau (x60 et x1019 pour un panneau
x49..1030). En référence elle s'éteint 60 px avant le bord gauche et 61 px avant le droit.
Elle traverse donc la carte portrait de part en part et coupe la coiffe en deux — c'est
d'ailleurs ce qui rend la coiffe difficile à mesurer (voir `m15`).

---

## 3. Écarts — table unique

`critère` : `DÉJÀ APPLIQUÉ` = l'instrument et la grandeur existaient au r13 ·
`NOUVEAU` = la grandeur ou l'instrument n'existait pas au tour précédent.
`données` : oui = l'écart dépend du contenu du compte photographié.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | DÉJÀ APPLIQUÉ | non | **1920 sous chrome : le CTA traverse le filet bas du cadre et déborde sous lui.** Le filet passe dans l'intérieur du bouton, entre son libellé et sa bordure basse | filet bas du cadre y1626..1629 (mi-alpha **1627,5**) · bas de la boîte du CTA y1646..1647 (mi-alpha **1646,5**) ⇒ **débordement 19,0 px** ; r13 : 24 px. Le rail gauche du cadre s'arrête à y1623, la bordure du CTA descend à 1647 (`m01`,`m02`) | — |
| `B2` | BLOQUANT | DÉJÀ APPLIQUÉ | non | **1920 sous chrome : le chrome tombe DANS le cadre.** L'arc bas du médaillon entre dans le panneau d'enseigne et le **losange or se pose sur le mot « miroir »** | dépassement du chrome mesuré à 2400 (zone vide) : médaillon **y143..203** (x451..628), losange **y215..231** (x531..548). À 1920 le filet haut du cadre est à **y162..164** et le panneau d'enseigne à **y191..194** ⇒ 39 px de médaillon dans le cadre, 9 px dans le panneau ; le losange y est **entièrement**. Or étranger dans le panneau d'enseigne : **+678 px** contre la même fenêtre à 2400 (médaillon ~472 px aux offsets 0..12, losange ~206 px aux offsets 25..38) (`m16`,`m17`,`m18`) | si le losange recouvre un glyphe : à 2400 sa fenêtre x531..548 ne porte **0 px** d'or de titre — il tombe dans l'inter-lettre, mais 14 px au-dessus de l'encre du titre |
| `M1` | MAJEUR | NOUVEAU | non | **Le halo des compteurs est une tache FIXE posée sous le glyphe**, pas un rayonnement : rien au-dessus, tout au-dessous, et le même objet pour trois glyphes différents | lumière 12 rangées au-dessus / au-dessous : réf **176,7 / 184,4** (rapport 1,04) · jeu **0,0 / 643,3**. Barycentre du halo − barycentre du chiffre : réf **+0,6 / +0,1 / −0,0 px** · jeu **+18,4 / +16,5 / +13,1 px**. Pic et largeur à mi-hauteur identiques au décimal sur les 3 compteurs (68,3 pts · 45/44/45 px à y790) pour des encres de 62 / 103 / 47 px de large (`m09`,`m25`) | le mécanisme (sprite, ombre portée décalée, blur d'un fond) — non décidable depuis une image |
| `M2` | MAJEUR | NOUVEAU | non | **La carte portrait sort de son panneau** : son filet or passe SOUS le bord bas du panneau élastique, aux deux résolutions | 2400 : panneau y874..**1550**, filet bas de la carte mi-alpha **1558,5** ⇒ **−8,5 px** · 1920 : panneau y556..**1229**, carte **1238,0** ⇒ **−9,0 px**. Référence : panneau ..1613, carte ..1531 ⇒ **+82,0 px** de panneau sous la carte (`m12`,`m14`) | — |
| `M3` | MAJEUR | NOUVEAU | non | **Le panneau élastique a perdu 89 px pendant que le cadre gardait sa hauteur** — c'est la cause commune de `M2` et de `M5` | hauteur du panneau : réf **765 px** · jeu **676 px** (**−11,6 %**) ; r13 mesurait 766 → **784** (+18). Le vide sous la 4ᵉ tuile passe de **245 px (31,2 %) au r13** à **140 px (20,7 %)**, contre 167 px (21,8 %) au canon : le pied s'est bien refermé, mais par raccourcissement du contenant (`m12`,`m13`) | — |
| `M4` | MAJEUR | DÉJÀ APPLIQUÉ | non | **2400 (résolution cible) : 340 px de bande morte entre le bandeau et le cadre** ; le cadre n'occupe que 79,0 % de la zone libre | filet du bandeau y142 → filet du cadre y482 = **340 px** ; zone libre 142..2203 (1ʳᵉ encre du dock) = **2061 px** ; cadre 482..2109 = **1628 px** ⇒ **79,0 %**, contre **1627/1668 = 97,5 %** dans la maquette (`m02`,`m17`) | — |
| `M5` | MAJEUR | NOUVEAU | non | **2400 : 139 px de vide DANS le cadre sous le CTA** — le contenu ne remplit plus son cadre | garde entre le bas du CTA et le filet bas du cadre : réf **32,0 px** · jeu **139,0 px** (**+334 %**). Au r13 cette garde valait **30 px** et était déclarée conforme. Occupation du cadre par le contenu : réf **96,2 %** · jeu **89,6 %** (`m01`,`m04`) | — |
| `M6` | MAJEUR | DÉJÀ APPLIQUÉ | non | **La ligne de balayage traverse le panneau presque de bord à bord** et coupe le portrait | 25 % du pic : **711 → 888 px (+24,9 %)** ; 10 % : **861 → 960 px** ; en % de la largeur du panneau : 72,5 → **90,9 %** (25 %) et 87,8 → **98,3 %** (10 %) ; pic 80,2 → 95,8 pts (`m10`) | — |
| `M7` | MAJEUR | DÉJÀ APPLIQUÉ | non | **La coiffe n'encadre pas le visage** : pas de descente sur les tempes, sommet plat, crâne nu sur 9 rangées — inchangé depuis le r13 | épaisseur latérale de sombre à 15 % de la hauteur du visage : **20/20 → 0/0 px** (profil 5/10/15/20/30/50 % : 25/25 · 21/23 · **20/20** · 16/17 · 10/11 · 11/11 → 12/11 · 0/1 · **0/0** · 10/9 · 10/9 · 9/9) · hauteur sous le sommet où 80 % de la largeur max est atteinte : **31 → 16 px** · rangées où la peau touche le fond sans sombre : **0 → 9** (y1134..1144) (`m15`) | le mécanisme : ce n'est PAS un écart de couvre-chef (les deux côtés dessinent la même calotte), c'est sa géométrie |
| `M8` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le gras sans-empattement porte moins d'encre à largeur égale**, et l'aparté se replie sur 2 lignes au lieu de 3 | sous-titre ligne 1 : largeur 776 → 768 px (−1,0 %) mais encre **4 773 → 3 883 px (−18,6 %)** ; ligne 2 : 1 285 → 985 (**−23,3 %**). Témoin sérif : titre du panneau bas 7 600 → 7 596 px d'encre (**−0,05 %**) à largeur −1,0 %. Aparté : **3 lignes (pas 30/30) → 2 lignes** (`m19`,`m21`) | la famille de police est un ARBITRAGE (table ci-dessous) ; l'écart d'encre à capitale et largeur égales, lui, se mesure |
| `M9` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Les tuiles sont 8 % plus courtes et leur rythme se resserre** | hauteurs **101/101/100/101 → 93/—/93/92 px** · pas haut-à-haut **115/116/115 → 107,0 (moyenne 1→3, 3→4)** · haut de la 1ʳᵉ tuile dans le panneau : offset **152 → 123 px** (`m13`) | la hauteur de la tuile 2 (88 px) est contaminée par les rangées de la ligne cyan, exclues : non retenue |
| `m1` | MINEUR | DÉJÀ APPLIQUÉ | non | L'en-tête de la colonne droite reste serré | « Pas encore / jugeable » : pas haut-à-haut **42 → 35 px (−16,7 %)** ; témoin : les 3 lignes du paragraphe du panneau bas sont à 33/33 → 33/32 (`m19`) | — |
| `m2` | MINEUR | DÉJÀ APPLIQUÉ | non | La boîte du CTA est plus basse et un peu plus étroite, le texte identique | **1952..2046 = 95 px → 1882..1970 = 89 px (−6,3 %)** ; largeur 980 → 974 px ; libellé : capitale 24 → 23 px, largeur 609 → 607 px (`m01`,`m21`,`m26`) | — |
| `m3` | MINEUR | DÉJÀ APPLIQUÉ | non | Le bloc enseigne est plus court : le filet or remonte de 6 px et toute la suite se décale | filet or sous l'enseigne, en offset depuis le filet du cadre : **211..217 → 205..211** ; cascade : compteurs **250 → 246**, panneau élastique **396 → 394** (`m04`) | — |
| `m4` | MINEUR | DÉJÀ APPLIQUÉ | non | Le cadre est 6 px plus large et colle 3 px plus près du bord ; ses filets sont 1 px plus épais | hors-tout **1038 → 1044 px** ; marges d'écran **21 → 18 px** à gauche comme à droite ; filets horizontaux **3 → 4 px**, rails verticaux 3 → 3 px (`m01`) | — |
| `m5` | MINEUR | DÉJÀ APPLIQUÉ | non | Le visage est 8,7 % plus large pour 1,8 % de haut en plus — la transformation n'est pas homothétique | largeur max de la peau **126 → 137 px** ; hauteur du visage **114 → 116 px** ; largeur max de la silhouette sombre **152 → 152 px** (`m15`) | — |
| `m6` | MINEUR | DÉJÀ APPLIQUÉ | non | Le col (triangle crème) est plus grand | boîte **61×40, aire 1 330 → 78×58, aire 2 167** (+27,9 % / +45,0 % / aire +63 %) ; il reste un triangle et reste centré (voir ASSUMÉS) (`m22`) | la fenêtre de mesure de la hauteur diffère de celle du r13 (61×61 → 76×75) : seule la tendance est comparable |
| `m7` | MINEUR | DÉJÀ APPLIQUÉ | non | La bande intérieure haute du cadre porte une lueur **chaude** là où la maquette en a une **froide** — changement de famille de teinte | médiane par colonne entre le filet du cadre et le panneau d'enseigne : réf bord `(16,23,34)` → pic `(24,29,36)` ; jeu bord `(16,22,31)` → pic **`(43,37,33)`**. Écart **+19/255 sur R** au pic, et le pic est **sous le médaillon** (x500) (`m26`) | la cause probable est le débordement de la lueur du médaillon en état « Brûlant » à travers le filet du cadre ; aucun canon du HUD dans cet état n'est fourni (voir §6) |
| `m8` | MINEUR | NOUVEAU | non | **Le fond de la boîte de compteur est un APLAT** là où la maquette porte un dégradé vertical | médiane de rangée dans la boîte : réf `(14,21,30)` en haut → `(10,14,23)` au milieu → `(12,19,27)` en bas (**amplitude 6,4 pts de luminance**) ; jeu **`(13,13,22)` partout, amplitude 0,0**. Écart max au bord haut : **8/255 sur G, 8/255 sur B** (`m21`, `diag_fond`) | — |
| `m9` | MINEUR | NOUVEAU | non | **Le libellé du compteur ne rayonne plus du tout** (corollaire de `M1`) | lumière dans les 8 rangées sous la bande du libellé : réf **1 764 pts·px** · jeu **0** (exactement) ; l'excès rend `0,00` sur chacune des rangées y824..832 (`m25`) | — |

**Compte : 2 BLOQUANT · 9 MAJEUR · 9 MINEUR = 20 findings.** Aucun ne dépend des données.
`NOUVEAU` : **6** (`M1`, `M2`, `M3`, `M5`, `m8`, `m9`). `DÉJÀ APPLIQUÉ` : **14**. 6 + 14 = 20.

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| assumé | vérification | verdict |
|---|---|---|
| compteur ENFREINTES à « — » | couleur du tiret `(127,212,217)` = **exactement** celle des deux chiffres ; centre x **876,0** = centre exact de sa boîte (876,0) ; y770..773, soit dans la bande des chiffres (748..786) (`m22`) | **TENU** sur le périmètre écrit. ⚠️ mais voir `M1` : le tiret de 4 px est posé sur une tache de 45×35 px qui porte ~10× plus de matière que lui — le trou reste un trou par sa couleur et sa position, il ne l'est plus par son **poids visuel** |
| col rendu par un TRIANGLE plein | remplissage aire/boîte **0,545 (réf) → 0,479 (jeu)** — très loin de ~0,9 ; centre x **293,0 → 290,5** (2,5 px) ; ne recouvre pas le cou (`m22`) | **TENU** |
| reflet FIXE | position **30,7 % (réf) → 33,9 % (jeu)** de la hauteur du panneau : tiers haut des deux côtés ; présent (`m10`) | **TENU** (son étendue, elle, est `M6`) |
| 4 couleurs hors `DesignTokens` (Encre, Panneau, Liseré, Vert) | fond de panneau élastique `(11,13,13)`/`(13,13,13)` · fond de panneau bas `(16,23,34)`/`(13,22,34)` · liseré de boîte L 52,7/52,1 · vert `(125,179,106)` des deux côtés (`m20`,`m21`) | **TENU** — les couleurs RENDUES ne s'écartent pas |
| nom du lieutenant = celui du compte | « LT. TULL, VOTRE LIEUTENANT » projeté, 2 lignes ; **aucune** bande d'encre à l'offset de la mention « non projeté (L0.4) », présente en référence (`m19`,`m22`) | **TENU** |
| pas de section « gages » | sous la 4ᵉ tuile, colonne droite y1411..1547 : **2 rangées** portant de l'encre (la bordure du panneau) ⇒ aucune place réservée vide (`m22`) | **TENU** |
| tiret « — » à la place de la PHASE | aile droite : « JOUR 50 » + un tiret ; ARGENT et JOUR sont alimentés (`m23`) | **TENU** |
| ronds du dock sans icône | 4 ronds, libellés EMPIRE / FAMILLE / FILIÈRE / PLUS, aucun rond coupé, aucun libellé de repli (`m23`) | **TENU** |
| roster / règles / chiffres non comparables | aucun slug, aucune clé brute, aucun mot anglais, aucun nom vide sur toute la surface du cadre ; format monétaire français `9 627 820,00 €` | **TENU** |

## ARBITRAGES ratifiés — une ligne chacun, jamais comptés avec les findings

| arbitrage | mesure (pour mémoire) |
|---|---|
| flèche retour — tranché (à retirer) | non comptée |
| bloc ARGENT déplacé — tranché (à retirer) | canon ramené ×0,9184 : largeur **116 px**, capitale **17 px** ; capture **107 px (−7,8 %)**, capitale **19 px (+11,8 %)** (`m23`) |
| ronds du dock sans icône — arbitrage user connu | 4 ronds vides ; le canon pose une icône 20×20 dans chacun |
| aucune heure dans l'aile droite — forme F | canon « JOUR 12 · SOIRÉE / 21:40 » sur 2 lignes (293×70 px) ; capture « JOUR 50 » sur 1 ligne (94×21 px) |
| famille de police | la référence de série 6 demande `'DejaVu Sans'` et a été rendue par DejaVu Sans : **aucune substitution sur le sans-sérif**. Le titre sérif de la maquette est rendu par Noto Serif, le client embarque DejaVu Serif ⇒ l'écart de **famille et de chasse** sur le sérif n'est pas opposable ; la **hauteur de capitale** l'est, et elle est égale (48/48, 38/37, 24/23) |
| libellés anglais dans la RÉFÉRENCE (`HEAT`, `$ 24 850`) | maquette à mettre à jour — noté une fois, jamais compté comme écart d'écran |
| 3ᵉ onglet du dock : « FILIÈRE » (client) vs « MARCHÉ » (canon HUD) | taxonomie de navigation, hors périmètre de cet écran |
| ancrage du bloc : la maquette le pose EN BAS du `.tel`, le client EN HAUT | écart de mise en page ratifié par le dossier (r10) ; c'est ce qui produit `M4` |
| état 16:9 (gouttière) | arbitrage user OUVERT sur les résolutions cibles ; `B1` et `B2` ne sont **pas** des questions de gouttière — ce sont un bouton qui traverse son cadre et un ornement de chrome posé sur un mot |

---

## Les grandeurs du r13 retrouvées — égales ou non

| grandeur r13 | valeur r13 | valeur r14 | statut |
|---|---|---|---|
| M1 halo — soudure chiffre/libellé | 2 lignes → **1** | **2 → 2** (plateau) | **FERMÉ** |
| M1 halo — alpha · rayon | ×2,13 · ×1,57 | **×0,67 · ×1,25** (ajustement inapplicable, profil non monotone) | **FERMÉ** |
| M1 halo — contraste des chiffres | 8,67 → **4,49:1** | **11,03 → 11,34:1** | **FERMÉ** |
| M1 halo — portée à +5 pts | d16 → **d30** | d16 (réf) → **d12** (jeu) | **FERMÉ** (au-delà : bord dur à 0) |
| — halo : forme (dessous/dessus) | *non mesuré* | réf **1,04** · jeu **2 328** | **OUVERT — `M1`, nouveau** |
| M2 coiffe — latéral 15 % | 20/20 → **1/1** | 20/20 → **0/0** | **INCHANGÉ** (`M7`) |
| M2 coiffe — sommet 80 % | 35 → **16** | 31 → **16** | **INCHANGÉ** (`M7`) |
| M2 coiffe — rangées nues | 0 → **6** | 0 → **9** | **INCHANGÉ** (convention de comptage plus large) |
| M3 1920 — chrome dans le cadre | losange +162 px d'or, médaillon +138 px | **+678 px d'or** au total dans le panneau d'enseigne | **INCHANGÉ** (`B2`) |
| M4 2400 — bande morte / occupation | 340 px · **79,9 %** | **340 px · 79,0 %** | **INCHANGÉ** (`M4`) |
| M5 1920 — CTA hors du cadre | **24 px** | **19 px** | **OUVERT, réduit de 5 px** (`B1`) |
| M5 2400 — CTA dans le cadre, garde 30 px | conforme | **139 px** | **RÉGRESSÉ** (`M5`) |
| M6 balayage — étendue à 25 % | 524 → **831 px** (+58,6 %) | 711 → **888 px** (+24,9 %) | **OUVERT** (`M6`) — nombres non comparables (fond par colonne locale ici) |
| M7 pied du panneau élastique vide | 165 → **245 px (31,2 %)** | 167 → **140 px (20,7 %)** | **FERMÉ en proportion**, mais par `M3` |
| M7 panneau `.elast` | 766 → **784 px** | 765 → **676 px** | **RÉGRESSÉ** (`M3`) |
| M8 instabilité T/T+1 s | 47 988 px (2,31 %) | **non mesurable** (pas de paire) | **NON VÉRIFIÉ** |
| M9 gras sans-empattement | −15,5 à −25,3 % | **−18,6 à −23,3 %** ; témoin sérif −0,05 % | **INCHANGÉ** (`M8`) |
| M10 tuiles plus courtes | 101 → 93 px, pas 115 → 108 | 101 → **93**, pas 115,3 → **107,0** | **INCHANGÉ** (`M9`) |
| m1 en-tête droit serré | 42 → 36 px | 42 → **35 px** | **INCHANGÉ** (`m1`) |
| m2 aparté 3 lignes → 2 | 3 → 2 | **3 → 2** | **INCHANGÉ** (`M8`) |
| m3 boîte du CTA | 95 → 88 px | 95 → **89 px** | **INCHANGÉ** (`m2`) |
| m4 bloc enseigne raccourci | 211..217 → 205..211 | **211..217 → 205..211** | **INCHANGÉ** (`m3`) |
| m5 cadre +6 px, marges 21 → 18 | idem | **idem** | **INCHANGÉ** (`m4`) |
| m6 visage +9,5 % de large | 126 → 138 px | 126 → **137 px** | **INCHANGÉ** (`m5`) |
| m7 col +25 % / +23 % | 61×61 → 76×75 | +27,9 % / +45,0 % (fenêtre différente) | **INCHANGÉ** (`m6`) |
| m8 cadran de la montre | 47×24 → 52×29 | **non re-mesuré** (ma fenêtre l'a manqué) | **NON VÉRIFIÉ** |
| m9 lueur brune de la bande haute | pic `(23,29,36)` → `(43,37,33)` | pic **`(24,29,36)` → `(43,37,33)`** | **INCHANGÉ** (`m7`) |
| m10 chrome ARGENT | 116/18 → 107/19 | **116/17 → 107/19** | **ARBITRAGE** (bloc tranché) |
| **24 grandeurs déclarées ÉGALES au r13** | — | **21 re-mesurées, toutes encore égales** (contrôle positif ci-dessus, 26 lignes) ; **3 non re-mesurées, nommées** : le « profil du fond du cadre sur 8 hauteurs » (je n'en ai vérifié que 2, haut et bas, à ≤ 5/255) · le « libellé de la carte » sur sa LARGEUR d'encre (le nom du compte diffère de celui de la maquette : grandeur dépendante des données) · les « planches écran seul, rien de coupé » (aucune planche écran seul fraîche ce tour — remplacée par le même contrôle sur les deux planches sous chrome, ligne 23 du contrôle positif) | — |

---

## 5. Autres résolutions

**1080×1920 sous chrome.** L'inventaire du contenu tient **au pixel** : tous les offsets
internes du cadre sont identiques à ceux de 2400 (panneau d'enseigne 29..32, filet or
204..212, compteurs 246..358, panneau élastique 393..395 → 1065..1067, panneau bas
1101..1105 → 1363..1367, CTA 1400..1404 → 1484..1485). Les compteurs, la coiffe, la ligne
cyan et la carte portrait rendent les mêmes valeurs qu'à 2400 (halo : plateaux et vallées
identiques au centième ; ligne cyan : 888 / 960 px et pic 95,8 pts, à l'identique).

Ce qui est **propre à 1920** :
- `B1` — le CTA déborde de **19,0 px** sous le filet bas du cadre, qui traverse le bouton.
- `B2` — le chrome tombe dans le cadre (**+678 px** d'or étranger dans le panneau
  d'enseigne), losange sur le mot « miroir ».
- Le cadre y mesure **1468 px** (162..1629) alors que son contenu en demande **1486**
  (du filet haut y162 au bas du CTA y1647) : le cadre est **élastique**, le contenu est
  **fixe**, et à 1920 le cadre passe **sous** la taille de son contenu — de **19,0 px** en
  mi-alpha, ce qui est exactement `B1`. C'est le même mécanisme que `M5` vu par l'autre
  bout : à 2400 la garde sous le CTA vaut 139 px là où le canon en met 32, soit **107 px de
  trop** ; à 1920 elle vaut **−19 px**.
- Gouttière haute : filet du bandeau y142 → filet du cadre y162 = **20 px**.
  Gouttière basse : bas du CTA y1647 → 1ʳᵉ encre du dock y1699 = **52 px**.
- Rien de coupé : 0 px de luminance > 45 sur les rangées 4 / H−5 et les colonnes 4 / W−5.

**1080×2400 (cible).** Gouttière haute **340 px**, gouttière basse (filet bas du cadre
y2109 → 1ʳᵉ encre du dock y2203) **94 px**. Rien de coupé aux quatre bords.

---

## 6. Ce que je n'ai pas pu vérifier

1. **L'animation.** Aucune paire T / T+1 s n'est fournie (le test qui la produit a été tué
   par le segfault). Le ruling « aucune animation sur un nouvel écran » n'est **pas
   vérifiable** ce tour. Au r13, 2,31 % des px bougeaient. ⇒ ce qui trancherait : deux
   captures du même état à 1 s d'intervalle, et un compte de px différents ≥ 1/255, le
   chrome exclu nommément.
2. **Les valeurs affichées.** L'identité `demo_capture@example.test` est **déclarée par la
   ligne GO, non relue** (le journal du run n'est pas joint). Je n'ai donc comparé **aucune
   valeur** à un corps réel ; la FORME seule est jugée. ⇒ ce qui trancherait : la ligne
   `[DemoIdentityResolver] régime=env identité=…` du journal, jointe au dossier.
3. **La couleur du chrome en état « Brûlant ».** Le filet du bandeau est **`(224,102,73)`**
   (rouge) en jeu là où le canon HUD le fait **`(176,141,62)`** (or) ; l'anneau du médaillon
   et le libellé « Brûlant » sont rouges de la même façon, et la lueur chaude de `m7`
   descend de là. **Le canon fourni est à « 37 % HEAT » (tiède), la capture à « Brûlant ».**
   Je ne peux pas séparer *teinte d'état voulue* de *jeton faux* sur des images d'états
   différents, et je ne classe donc pas. ⇒ ce qui trancherait : un canon HUD rendu en état
   « Brûlant », ou la règle écrite qui dit si le filet du bandeau est teinté par la chaleur.
4. **L'inset du shell** — exclu du tour par le dossier. Je note seulement, sans en faire un
   finding, que le contenu du cadre est **fixe** et le cadre **élastique** (voir §5) : c'est
   la grandeur qui décide de `B1`/`M5`, et elle est adjacente au sujet de l'inset.
5. **Le mécanisme du halo.** Je mesure que l'effet est fixe, décalé vers le bas et
   indépendant du glyphe ; je ne peux pas dire depuis une image s'il s'agit d'un sprite, d'une
   ombre portée à décalage, ou d'un flou appliqué au mauvais objet.
6. **Le cadran de la montre** (r13 m8) : ma fenêtre de mesure l'a manqué (aucun px crème
   trouvé dans x140..230 × y1330..1385). Non re-mesuré.
7. **Trois grandeurs de la liste « égales » du r12/r13** non re-mesurées : les pastilles des
   tuiles, les yeux, et l'axe du col rapporté à l'axe du buste (j'ai mesuré le centre du col,
   293,0 → 290,5, mais pas l'axe du buste indépendamment).
8. **Les nombres absolus du halo du r13** (d2 +29,7 / +65,0) ne sont pas reproductibles avec
   ma définition de fond, et je ne les ai donc pas repris : ma comparaison est réf ↔ jeu, un
   seul instrument des deux côtés.
9. **Dénominateur de couverture publié par la ligne GO**, recopié tel quel : (a) deux
   résolutions **9/16 ÉTABLI** — fourni ici ; (b) paire T/T+1 **?/16 NON ÉTABLI** — absente
   ici ; (c) onglet actif asserté **7/16 ÉTABLI** — **inconnu pour ㊲** ; (d)
   `[CHROME-ALIMENTE]` par planche **3/16 ÉTABLI** — **inconnu pour ㊲** ; (e) blob ≠
   précédente + descendance — vérifié hors code par l'orchestrateur ; (f) état vide ET état
   riche **?/16 NON ÉTABLI** ; (g) SHA de l'arbre imprimé au run **0/16** — **non imprimé**,
   donc l'arbre qui a rendu ces planches n'est pas prouvé par la planche elle-même.
10. **Catégorie de suite et angle mort** : les deux planches viennent d'une suite **sous
    shell** (`Capture_EcranReputation_SousChrome`), qui exerce le bandeau et le dock. Elle ne
    peut pas montrer l'écran **hors** chrome (pas de planche « écran seul » fraîche ce tour) :
    tout défaut qui n'apparaîtrait qu'en montage hors shell m'est invisible.

---

## Annexes

### Annexe 1 — Inventaire de la référence (couche globale)

Cadre x21..1058 × y452..2078 (1 688 826 px) : luminance moyenne **32,15**, densité d'encre
(L > 45) **11,17 %**. Palette (seaux de 16) : `(24,24,40)` 33,60 % · `(8,24,24)` 22,29 % ·
`(8,8,8)` 11,05 % · `(24,24,24)` 10,68 % · `(8,8,24)` 6,77 % · `(40,56,72)` 2,75 %.
Rythme vertical (offsets depuis le filet haut y452) : panneau d'enseigne **29..31**, filet
or **211..217**, compteurs **250..252 → 361..363**, panneau élastique **396..398 →
1159..1161**, panneau bas **1195..1197 → 1465..1467**, CTA **1500..1502 → 1592..1594**,
filet bas **1624..1626**. Gouttières entre blocs : 33 / 33 / 34 / 33 px.

### Annexe 2 — Inventaire de la capture (couche globale)

2400, cadre x18..1061 × y482..2109 (1 699 632 px) : luminance moyenne **31,71**, densité
d'encre **11,09 %**. Palette : `(8,24,40)` 43,13 % · `(24,24,24)` 18,34 % · `(8,8,8)`
11,77 % · `(8,24,24)` 7,31 % · `(8,8,24)` 5,64 % · `(40,56,72)` 2,74 %. (Le glissement du
seau dominant de `(24,24,40)` vers `(8,24,40)` est un effet de bord de quantification : les
aplats mesurés point par point sont à ≤ 6/255 — voir contrôle positif #6.)
Rythme vertical (offsets depuis y482) : panneau d'enseigne **30..32**, filet or
**205..211**, compteurs **246..248 → 356..358**, panneau élastique **394..396 →
1065..1068**, panneau bas **1102..1105 → 1364..1368**, CTA **1400..1404 → 1484..1489**,
filet bas **1624..1627**. Gouttières entre blocs : 35 / 36 / 35 / 33 px.
1920 : luminance moyenne **32,45**, densité **11,93 %**, **mêmes offsets internes**.

### Annexe 3 — Bornes des blocs utilisées par les scripts

| bloc | référence | jeu 2400 | jeu 1920 |
|---|---|---|---|
| enseigne (panneau → filet or) | 481..669 | 512..693 | 192..373 |
| rangée de compteurs | 702..815 | 728..840 | 408..520 |
| boîtes de compteur (x) | 50..361 · 384..695 · 718..1029 | 49..357 · 386..693 · 722..1030 | idem 2400 |
| panneau élastique | 848..1613 | 874..1550 | 556..1229 |
| carte portrait (filet or) | x83..504 · y878..1531 | x79,5..501 · y904..1558,5 | x79,5..501 · y583,5..1238 |
| 4 tuiles | 1000..1446 | 997..1410 | — |
| panneau bas | 1647..1919 | 1584..1850 | 1264..1529 |
| CTA | 1952..2046 | 1882..1970 | 1562..1647 |
| ligne cyan (rangées exclues des mesures de coiffe) | 1078..1096 | 1092..1110 | 772..790 |

### Annexe 4 — Scripts

`mesures/commun.py` (conventions + primitives) · `m01_reperes.py` · `m02_placement.py` ·
`m03_structure.py` · `m04_blocs.py` · `m05_boites_compteurs.py` · `m05b_boites.py` ·
`m06_halo.py` (v2, avec ses deux versions fausses documentées en en-tête) ·
`m07_bandes.py` · `m08_halo_geo.py` · `m09_halo_forme.py` · `m10_ligne_cyan.py` ·
`m11_geometrie.py` · `m12_panneau_elast.py` · `m13_tuiles.py` (v3, v1 et v2 documentées) ·
`m14_carte.py` · `m15_coiffe.py` (v3, v1 et v2 documentées) · `m16_chrome_dans_cadre.py` ·
`m17_placement1920.py` · `m18_recouvrement.py` · `m19_texte.py` (v2) · `m20_aplats.py` ·
`m21_correctifs.py` (reprise des ancres fausses de m20) · `m22_assumes.py` ·
`m23_chrome.py` · `m24_global.py` · `m25_halo_libelle.py` · `m26_reste.py` ·
`diag_fond.py`.
Images produites : `cmp_compteurs.png` (compteurs réf/jeu à la même échelle),
`halo_amplifie.png` (champ d'excès amplifié ×3,2 — la preuve visuelle de `M1`),
`cmp_pied_carte.png` (`M2`), `cmp_1920_bornes.png` et `cmp_1920_cta.png` (`B1`, `B2`).
