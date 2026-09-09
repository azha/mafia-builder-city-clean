# Grandeurs mesurées au tour r14 (2026-09-07, planches `f52fbe2`) — ㊲ La réputation (SANS les verdicts)

> Valeurs sans classe, pour la colonne `critère`. Conventions du r14 : bord = mi-alpha nominal ; halo = profil moyenne(rangée) − médiane(rangée),
> plateau de constance, vallée en points, fond = p10 par rangée — **le compte de bandes n'est PAS un critère sans seuil** ; les grandeurs
> sans réglage sont la LARGEUR DU PLATEAU et la PROFONDEUR DE LA VALLÉE en points.

## A. Grandeurs trouvées ÉGALES au r14 (26 lignes, verbatim)

| # | grandeur | réf | jeu | Δ / note | script |
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

## B. Grandeurs à ÉCART au r14 — la mesure seule, sans la classe (20 lignes)

| id r14 | ce qui a été mesuré | mesure |
|---|---|---|
| B1 | 1920 sous chrome : le CTA traverse le filet bas du cadre et déborde sous lui | filet bas du cadre y1626..1629 (mi-alpha **1627,5**) · bas de la boîte du CTA y1646..1647 (mi-alpha **1646,5**) ⇒ **débordement 19,0 px** ; r13 : 24 px. Le rail gauche du cadre s'arrête à y1623, la bordure du CTA descend à 1647 (`m01`,`m02`) |
| B2 | 1920 sous chrome : le chrome tombe DANS le cadre | dépassement du chrome mesuré à 2400 (zone vide) : médaillon **y143..203** (x451..628), losange **y215..231** (x531..548). À 1920 le filet haut du cadre est à **y162..164** et le panneau d'enseigne à **y191..194** ⇒ 39 px de médaillon dans le cadre, 9 px dans le panneau ; le losange y est **entièrement**. Or étranger dans le panneau d'enseigne : **+678 px** contre la même fenêtre à 2400 (médaillon ~472 px aux offsets 0..12, losange ~206 px aux offsets 25..38) (`m16`,`m17`,`m18`) |
| M1 | Le halo des compteurs est une tache FIXE posée sous le glyphe, pas un rayonnement : rien au-dessus, tout au-dessous, et le même objet pour trois glyph | lumière 12 rangées au-dessus / au-dessous : réf **176,7 / 184,4** (rapport 1,04) · jeu **0,0 / 643,3**. Barycentre du halo − barycentre du chiffre : réf **+0,6 / +0,1 / −0,0 px** · jeu **+18,4 / +16,5 / +13,1 px**. Pic et largeur à mi-hauteur identiques au décimal sur les 3 compteurs (68,3 pts · 45/44/45 px à y790) pour des encres de 62 / 103 / 47 px de large (`m09`,`m25`) |
| M2 | La carte portrait sort de son panneau : son filet or passe SOUS le bord bas du panneau élastique, aux deux résolutions | 2400 : panneau y874..**1550**, filet bas de la carte mi-alpha **1558,5** ⇒ **−8,5 px** · 1920 : panneau y556..**1229**, carte **1238,0** ⇒ **−9,0 px**. Référence : panneau ..1613, carte ..1531 ⇒ **+82,0 px** de panneau sous la carte (`m12`,`m14`) |
| M3 | Le panneau élastique a perdu 89 px pendant que le cadre gardait sa hauteur — c'est la cause commune de `M2` et de `M5` | hauteur du panneau : réf **765 px** · jeu **676 px** (**−11,6 %**) ; r13 mesurait 766 → **784** (+18). Le vide sous la 4ᵉ tuile passe de **245 px (31,2 %) au r13** à **140 px (20,7 %)**, contre 167 px (21,8 %) au canon : le pied s'est bien refermé, mais par raccourcissement du contenant (`m12`,`m13`) |
| M4 | 2400 (résolution cible) : 340 px de bande morte entre le bandeau et le cadre ; le cadre n'occupe que 79,0 % de la zone libre | filet du bandeau y142 → filet du cadre y482 = **340 px** ; zone libre 142..2203 (1ʳᵉ encre du dock) = **2061 px** ; cadre 482..2109 = **1628 px** ⇒ **79,0 %**, contre **1627/1668 = 97,5 %** dans la maquette (`m02`,`m17`) |
| M5 | 2400 : 139 px de vide DANS le cadre sous le CTA — le contenu ne remplit plus son cadre | garde entre le bas du CTA et le filet bas du cadre : réf **32,0 px** · jeu **139,0 px** (**+334 %**). Au r13 cette garde valait **30 px** et était déclarée conforme. Occupation du cadre par le contenu : réf **96,2 %** · jeu **89,6 %** (`m01`,`m04`) |
| M6 | La ligne de balayage traverse le panneau presque de bord à bord et coupe le portrait | 25 % du pic : **711 → 888 px (+24,9 %)** ; 10 % : **861 → 960 px** ; en % de la largeur du panneau : 72,5 → **90,9 %** (25 %) et 87,8 → **98,3 %** (10 %) ; pic 80,2 → 95,8 pts (`m10`) |
| M7 | La coiffe n'encadre pas le visage : pas de descente sur les tempes, sommet plat, crâne nu sur 9 rangées — inchangé depuis le r13 | épaisseur latérale de sombre à 15 % de la hauteur du visage : **20/20 → 0/0 px** (profil 5/10/15/20/30/50 % : 25/25 · 21/23 · **20/20** · 16/17 · 10/11 · 11/11 → 12/11 · 0/1 · **0/0** · 10/9 · 10/9 · 9/9) · hauteur sous le sommet où 80 % de la largeur max est atteinte : **31 → 16 px** · rangées où la peau touche le fond sans sombre : **0 → 9** (y1134..1144) (`m15`) |
| M8 | Le gras sans-empattement porte moins d'encre à largeur égale, et l'aparté se replie sur 2 lignes au lieu de 3 | sous-titre ligne 1 : largeur 776 → 768 px (−1,0 %) mais encre **4 773 → 3 883 px (−18,6 %)** ; ligne 2 : 1 285 → 985 (**−23,3 %**). Témoin sérif : titre du panneau bas 7 600 → 7 596 px d'encre (**−0,05 %**) à largeur −1,0 %. Aparté : **3 lignes (pas 30/30) → 2 lignes** (`m19`,`m21`) |
| M9 | Les tuiles sont 8 % plus courtes et leur rythme se resserre | hauteurs **101/101/100/101 → 93/—/93/92 px** · pas haut-à-haut **115/116/115 → 107,0 (moyenne 1→3, 3→4)** · haut de la 1ʳᵉ tuile dans le panneau : offset **152 → 123 px** (`m13`) |
| m1 | L'en-tête de la colonne droite reste serré | « Pas encore / jugeable » : pas haut-à-haut **42 → 35 px (−16,7 %)** ; témoin : les 3 lignes du paragraphe du panneau bas sont à 33/33 → 33/32 (`m19`) |
| m2 | La boîte du CTA est plus basse et un peu plus étroite, le texte identique | **1952..2046 = 95 px → 1882..1970 = 89 px (−6,3 %)** ; largeur 980 → 974 px ; libellé : capitale 24 → 23 px, largeur 609 → 607 px (`m01`,`m21`,`m26`) |
| m3 | Le bloc enseigne est plus court : le filet or remonte de 6 px et toute la suite se décale | filet or sous l'enseigne, en offset depuis le filet du cadre : **211..217 → 205..211** ; cascade : compteurs **250 → 246**, panneau élastique **396 → 394** (`m04`) |
| m4 | Le cadre est 6 px plus large et colle 3 px plus près du bord ; ses filets sont 1 px plus épais | hors-tout **1038 → 1044 px** ; marges d'écran **21 → 18 px** à gauche comme à droite ; filets horizontaux **3 → 4 px**, rails verticaux 3 → 3 px (`m01`) |
| m5 | Le visage est 8,7 % plus large pour 1,8 % de haut en plus — la transformation n'est pas homothétique | largeur max de la peau **126 → 137 px** ; hauteur du visage **114 → 116 px** ; largeur max de la silhouette sombre **152 → 152 px** (`m15`) |
| m6 | Le col (triangle crème) est plus grand | boîte **61×40, aire 1 330 → 78×58, aire 2 167** (+27,9 % / +45,0 % / aire +63 %) ; il reste un triangle et reste centré (voir ASSUMÉS) (`m22`) |
| m7 | La bande intérieure haute du cadre porte une lueur chaude là où la maquette en a une froide — changement de famille de teinte | médiane par colonne entre le filet du cadre et le panneau d'enseigne : réf bord `(16,23,34)` → pic `(24,29,36)` ; jeu bord `(16,22,31)` → pic **`(43,37,33)`**. Écart **+19/255 sur R** au pic, et le pic est **sous le médaillon** (x500) (`m26`) |
| m8 | Le fond de la boîte de compteur est un APLAT là où la maquette porte un dégradé vertical | médiane de rangée dans la boîte : réf `(14,21,30)` en haut → `(10,14,23)` au milieu → `(12,19,27)` en bas (**amplitude 6,4 pts de luminance**) ; jeu **`(13,13,22)` partout, amplitude 0,0**. Écart max au bord haut : **8/255 sur G, 8/255 sur B** (`m21`, `diag_fond`) |
| m9 | Le libellé du compteur ne rayonne plus du tout (corollaire de `M1`) | lumière dans les 8 rangées sous la bande du libellé : réf **1 764 pts·px** · jeu **0** (exactement) ; l'excès rend `0,00` sur chacune des rangées y824..832 (`m25`) |

## C. Le halo au r14 (texte, sans verdict)

```
```
