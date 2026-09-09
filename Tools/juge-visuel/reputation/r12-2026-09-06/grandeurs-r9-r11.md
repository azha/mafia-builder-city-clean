# Grandeurs mesurées aux tours r9 et r11 — ㊲ La réputation (SANS les verdicts)

> Deux tours, deux planches : **r9** = planche de `main` `76ee3cc` (2026-09-04, AVANT tous les correctifs du jour — ligne de base de nuit ;
> ses 13 constats sont « à rejuger sur planche fraîche ») ; **r11** = planches `3b0ffae` (14:00, PRÉ-Bold ; r11 mesurait un fût de gras
> −20-33 % : NON comparable post-Bold). Valeurs sans classe, pour la colonne `critère`. Rien d'autre des tours r1→r11 n'est fourni.

## r9 — A. Grandeurs trouvées ÉGALES (contrôle positif, verbatim, 22 lignes)

| # | grandeur | réf | jeu | Δ / note | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet `.cerne` à filet `.cerne` | 1626 px | 1626 px | **0 px** (m01) |  |
| 2 | largeur de la carte portrait `.prt` (118 CSS voulu) | 424 px | 425 px | +1 px (m02) |  |
| 3 | gouttière `.mir6` entre la carte et les tuiles (10 CSS voulu) | 37 px | 37 px | 0 px (m02/m05) |  |
| 4 | largeur des 3 fenêtres `.fen` / écart entre elles | 312·312·312 / 22 px | 315·314·315 / 22 px | ≤ 3 px (m18d) |  |
| 5 | bloc `.enseigne` (haut → filet or) / bloc `.compteurs` | 188 / 113 px | 183 / 115 px | −5 / +2 px (m03) |  |
| 6 | titre « Le miroir » — encre h × l | 47 × 415 | 46 × 421 | −2,1 % / +1,4 % (m07) |  |
| 7 | chiffres `.fen b` — hauteur d'encre | 41 px | 41 px | **0 px** (m08) |  |
| 8 | « RÈGLES DONNÉES » / « ABSORBÉES » / « ENFREINTES » — h × l | 18×233 · 18×154 · 15×160 | 19×234 · 19×153 · 15×159 | ≤ 1 px (m08) |  |
| 9 | `.tl b` « manches basses » / `.tl small` « la justice… » | 21×242 / 19×246 | 21×245 / 19×245 | ≤ 3 px (m09) |  |
| 10 | `.pann i` / `.pann b` « Rien n'a encore déteint » | 19×586 / 39×613 | 19×591 / 38×621 | ≤ 8 px (m09) |  |
| 11 | texte du CTA / `.prt b` « Il vous écoute » | 29×611 / 26×239 | 29×607 / 26×247 | ≤ 8 px (m09/m18) |  |
| 12 | pastilles `.lum` : allumée / éteinte (7 CSS voulu) | — / 26 px | 24 / 26 px | (m16) |  |
| 13 | couleurs d'encre (8 jetons : muet, cyan, crème, crème2, éteint, vert, or_vif, or_filet) | jetons exacts | **identiques ou ±1/255** | (m08/m09/m16) |  |
| 14 | aplats : `.cta6` · `.prt`/`.pann`/`.tl OFF` · `.elast` | #16191b · #111823 · #0b0d0d | #16161c · #0d1622 · #0d0d0d | ≤ 4/255 (m13) |  |
| 15 | couverture de palette, 12 jetons | — | — | **≤ 0,4 point** partout (m20b) |  |
| 16 | luminance moyenne / densité d'encre de la zone de contenu | 31,94 / 8,12 % | 31,10 / 8,19 % | −2,6 % / +0,9 % (m18e) |  |
| 17 | rythme vertical du cadre (6 frontières, ramenées au haut du cadre) | — | — | **≤ 13 px sur 1626** (m03) |  |
| 18 | épaisseur de la ligne de balayage (2 CSS voulu) | 8 px | 7 px | −1 px (m15) |  |
| 19 | position de la montre dans le buste (SVG : unités 50−31 ⇒ +106 px) | absente (#120) | **+105,5 px** | +0,5 px (m25) |  |
| 20 | inventaire : 3 compteurs · 4 tuiles · 1 carte portrait · 1 panneau · 1 CTA | 3·4·1·1·1 | 3·4·1·1·1 | **rien en trop, rien d'absent** |  |
| 21 | accord buste ↔ tuiles (col étroit + montre + pas de manchettes + gants sombres) | — | **4/4 cohérents** | (m25/m26) |  |
| 22 | gouttière : dernière encre du chrome haut / première encre du dock | — | 230 (cadre à 250) / 2179 (cadre à 1876) | **aucun chevauchement** (m19a) |  |

## r9 — B. Grandeurs à ÉCART — la mesure seule, sans la classe (13 lignes)

| id | ce qui a été mesuré | mesure |
|---|---|---|
| F1 | le paragraphe du panneau bas nie les voyants que l'écran affiche : « ses quatre voyants sont éteints parce qu'il n'a rien pris de vous » alors que 2 t | tuiles 1 et 3 : bord `#b08d3d` (voulu `#b08d3e`), fond `#16161c` (voulu `#16191b`), pastille or_vif 24 px — état `.tl.on` sans ambiguïté (m16). Panneau bas : copie **verbatim** du cadre #120, dont le compteur canonique est `00/4`. Aucun des 6 cadres du groupe ne combine « 00 règles données » et « 02 absorbées » |
| F2 | le buste est hors de l'axe de sa carte : le dessin est décalé vers la gauche par rapport à l'axe sur lequel les légendes de la même carte sont centrée | centre du remplissage du visage **272,5** ; centre du torse+chapeau **273,0** ; centre du col **273,0** — trois masques indépendants. Axe des textes de la carte : **284,0 / 284,5**. Écart **−11,7 px = −3,2 CSS**. En RÉFÉRENCE la même comparaison donne **+0,7 px** (m12/m21) |
| F3 | le sous-titre `.enseigne i` est rendu ~29 % plus haut, avec un interlettrage compensatoire plus serré | hauteur de capitale sur une portion **sans accent ni apostrophe** : RÉF « UN LIEUTENANT » **17 px (4,72 CSS)** / JEU « PERSONNE…ENCORE » **22 px (6,11 CSS)** = **+29,4 %**. Avance moyenne par caractère quasi identique : 23,48 / 23,83 px. Contrôle positif sur chaîne **identique** (« RÈGLES DONNÉES ») : 18 / 19 px, +5,6 % (m24) |
| F4 | interligne des blocs multi-lignes systématiquement 12 à 17 % plus serré, à taille de glyphe identique | `.pann small` : pas de ligne **33 → 27,5 px** (−17 %), runs d'encre 24 px des deux côtés · `.prt i` : pas **27 → 23 px** (−15 %) · `.tl` : hauteur de tuile **101 → 93 px** (−7,9 %) pour des glyphes à 21 et 19 px identiques, l'écart tenant entièrement dans les 3 respirations internes (−2 / −2 / −4 px) (m04/m18b) |
| F5 | le halo de la pastille allumée (`box-shadow:0 0 7px #f2c96b99`) est absent | écart moyen au fond de tuile, par rayon. Témoin #119 : **+39,8** à 4,0 CSS, **+23,0** à 5,0 CSS, **+16,1** à 6,0 CSS, +8,7 à 7,3 CSS. Capture : **+7,9** à 3,9 CSS puis **+0,0** dès 5,0 CSS. Contrôle positif r=0 : **+220,0 des deux côtés** (m17a) |
| F6 | la ligne de balayage cyan est 1,2 à 1,6 × plus forte, et ses extrémités ne s'éteignent plus | profil horizontal, score (G+B−2R), 18 points de x=52 à x=1024. Pic : **85 → 101** (×1,19). Extrémité gauche : **31 → 50** (×1,61). Extrémité droite : **3 → 10** (×3,3). Épaisseur inchangée (8 → 7 px = 2 CSS) (m15/m19b) |
| F7 | le cadre est épinglé en haut : 303 px de bande morte entre le bas du cadre et le premier pixel du dock, contre 20 px au-dessus | bas du cadre **1876** ; première encre du dock **2179** ; dernière encre du chrome haut **230** ; haut du cadre **250**. 303 px = **12,6 % de la hauteur de l'écran** (m19a) |
| F8 | le vide sous la 4ᵉ tuile passe de 21,8 % à 31,2 % de la hauteur du panneau élastique | RÉF : tuiles 1000..1446, `.elast` 848..1613 ⇒ vide **167 px (21,8 %)**. JEU : tuiles 766..1180, `.elast` 642..1424 ⇒ vide **244 px (31,2 %)**. Distance dernière tuile → bas de la carte portrait : **86 → 144 px** (m21) |
| F9 | proportions du buste : le visage est 9,5 % plus large alors que le dessin entier est 1,6 % plus court — la transformation n'est pas une homothétie | ligne la plus large du remplissage peau : **126 → 138 px** (+9,5 %) ; diamètre extérieur trait compris **148 → 157 px** ; trait sombre **11,0 → 9,5 px** par côté. Dessin entier (sommet du chapeau → bas du torse) **377 → 371 px**. Rapport visage/torse **0,468 → 0,498** (+6,4 %). Gants : **48×30 → 55×36 px** et à **−97** au lieu de **−106 px** de l'axe (m10/m12/m21/m26) |
| F10 | la colonne de droite est 19 px plus large et 9 px plus à gauche (padding de `.elast` mesuré à 6,4 CSS au lieu de 8) ; le sous-texte du verdict passe d | tuiles : RÉF x 542..997 (**455 px**) / JEU x 533..1007 (**474 px**). Padding `.elast` : 30 px des deux côtés en RÉF, **23 px** en JEU. `.verdict span` : hauteur d'encre **76 → 49 px** (3 lignes → 2) (m05/m17b) |
| F11 | le fond du cadre est un dégradé monotone ; la maquette a une taille sombre au milieu et un pied qui remonte (radial cyan) | luminance dans la gouttière gauche, par 10 % de la hauteur du cadre. RÉF : 22·21·20·19·18·**16**·15·15·**17**·18·18. JEU : 22·21·21·21·20·19·19·19·18·17·**17** (m20a) |
| F12 | le sous-titre affiché n'est aucune des six lignes du groupe, et il change de sujet : les six parlent du lieutenant, celui-ci parle du joueur | `grep -c -i "personne ne vous a encore"` sur `ecrans-brennar-6.html`, `generateur-reputation.py`, `chassis6.py` ⇒ **0 / 0 / 0**. Les six lignes canoniques : « ce qu'il a pris de vous se voit sur lui », « un lieutenant neuf n'a encore rien absorbé », « vous vous écartez de vos propres règles », « les règles que vous avez données », « un lieutenant rappelé — on demande des gages », « ce qui manque encore » |
| F13 | le bouton CTA est 7 px plus bas de hauteur, texte identique | filet or extérieur : RÉF 1952..2046 = **95 px** ; JEU 1757..1844 = **88 px** (−7,4 %). Encre du libellé identique : 29 × 611 / 29 × 607 (m01/m09) |

## r11 — A. Grandeurs trouvées ÉGALES (contrôle positif, verbatim, 20 lignes)

| # | grandeur | réf | jeu | Δ / note | script |
|---|---|---|---|---|---|
| P1 | hauteur du cadre, filet à filet | 1627 px | 1628 px | 1 px (0,06 %) | `m01`/`m12` |
| P2 | gouttière basse cadre → première encre du dock | — | **70 px aux DEUX résolutions** (1699−1629 · 2179−2109) | 0 px | `m03`/`m12` |
| P3 | carte portrait (filet doré) | 424 × 656 px | 425 × 658 px | ≤ 2 px | `m19` |
| P4 | **axe du buste** : carte · visage · col · torse · yeux | 272,5 · 272,5 · 272,0 · 272,0-272,5 · 247,5/297,0 | 272,0 · 272,0 · 272,5 · 272,0-272,5 · 247,0/297,5 | ≤ 0,5 px — **F3 fermé** | `m19`/`m29`/`m30`/`m32` |
| P5 | gouttière carte → tuiles | 37 px | 37 px | **0 px** | `m28` |
| P6 | marge tuile → bord droit du panneau | 30 px | 29 px | 1 px | `m28` |
| P7 | 10 aplats (cadre, `.elast`, tuile, compteur, carte, panneau bas, CTA, enseigne, filet or, torse) | — | — | **≤ 6/255 partout**, filet or à **1/255** | `m40` |
| P8 | contraste WCAG de 11 textes (libellé compteur +0,01 · LT. +0,12 · « Il vous écoute » +0,15 · titre du panneau +0,15 · paragraphe +0,11 · CTA +0,22 · titre 11,83→11,55) | — | — | **≤ 0,38 partout** | `m34`/`m06` |
| P9 | couche globale, couverture des 4 premières couleurs de palette | 90,22 · 2,97 · 2,37 · 1,95 % | 90,19 · 2,98 · 2,52 · 1,84 % | ≤ 0,15 pt | `m33` |
| P10 | sous-titre de l'enseigne : couleur · capitale · largeur d'encre | (185,173,146) · 17 px · 775 px | (185,173,146) · 17 px · 768 px | 0/255 · 0 px · −0,9 % | `m35` |
| P11 | chiffres des compteurs : hauteur de capitale · couleur | 37 px · (127,212,217) | 37 px · (127,212,217) | 0 px · 0/255 | `m26` |
| P12 | **interligne du paragraphe** du panneau bas | 32 · 33 px | 33 · 32 px | 1 px — **F6 fermé sur le paragraphe** | `m15` |
| P13 | **tuiles, largeur** · gouttières entre tuiles | 456 px · 14/15/15 | 463 px · 17/14/15 | +1,5 % (0,7 % du parent) — **F8 refermé** | `m16`/`m28` |
| P14 | cou · **longueur de la bouche** | 9,84 u · 10,75 u | 10,23 u · 10,78 u | 0,39 u · **0,03 u — F11 fermé sur la longueur** | `m29`/`m30` |
| P15 | torse : largeur max · gant hors du torse | 74,01 u · 0 px dehors | 74,20 u · **0 px dehors** | +0,26 % · 0 | `m32` |
| P16 | position du balayage teal dans le panneau | 30,8 % | 28,6 % | 2,2 pt — tiers haut des deux côtés | `m27` |
| P17 | boîtes des compteurs, largeur · écarts | 312 px · 23 px | 312 px · 25 px | 0 px · 2 px | `m26` |
| P18 | titre « Le miroir » : largeur d'encre · hauteur de capitale | 416 px · 48 px | 421 px · 46 px | +1,2 % · −4,2 % | `m06` |
| P19 | inventaire des parties | 1 enseigne · 3 compteurs · 1 panneau élastique (carte + 4 tuiles + balayage) · 1 panneau bas · 1 CTA | idem | **rien EN TROP, rien ABSENT** (hors la section « gages », voulue) | `m13`/`m39` |
| P20 | hauteur des lignes de texte des tuiles (capitale ligne 1 · ligne 2) | 21 px · 15 px | 21 px · 15 px | 0 px | `m18` |

## r11 — B. Grandeurs à ÉCART — la mesure seule, sans la classe (16 lignes)

| id | ce qui a été mesuré | mesure |
|---|---|---|
| F15 | 1080×1920 — le cadre déborde sous le bandeau | haut du cadre local y = **2** ; bas du bandeau y = **143** ⇒ gouttière haute **−141 px**. Zone libre 143..1699 = **1556 px** ; besoin **1698 px** ; manque **142 px**. Rail or gauche invisible de y 2 à 142, assombri à (58,46,33) au lieu de (176,141,61). Au 2400 les mêmes bornes donnent +339 px. (`m01`,`m05`,`m12`) |
| F16 | 1080×1920 — le titre « Le miroir » est illisible et amputé | sur les 4 092 px de glyphe repérés au 2400 : **0 % intacts**, **61,3 % assombris** à (98,82,48) ⇒ contraste **2,45:1** (contre **11,55:1**), **38,7 % remplacés par du chrome**. **101 colonnes sur 248 (41 %)** entièrement recouvertes, de x=476 à x=614. Encre du chrome sur le glyphe : (104,143,147) et (156,92,84) là où le 2400 rend (242,201,106). (`m08`,`m09`,`m10`,`m11`) |
| F2 | Calotte : la forme livrée ne porte pas les nombres de la maquette | **N4 épaisseur latérale à 15 % de la hauteur du visage : 21 px → 1 px** (÷21) · **pincement du crâne : creux de 6 px (95,9 % du max) → 28 px (81,8 %)**, ×4,7 · **N3 hauteur d'attache : 116 px → 92 px** (−21 %) · **N5 courbure du bord bas (sagitta sur ±0,9 de la demi-largeur) : −20,5 px → −12,0 px** (−41 %) · **N1 calotte max ÷ tête max : 0,967 → 1,000** · **N2 à la jonction : 0,967 → 0,948**. Contexte : visage 117 → 121 px de haut, yeux 5,5 px plus haut, sommet de la tête 8 px plus haut. (`m21`,`m22`,`m23`,`m41`) |
| F5 | La lueur interne des chiffres cyan est absente, pas atténuée : nulle. | excès de luminance autour de l'encre cyan, par distance de Chebyshev — réf : +27,3 (d=2) … **+6,07 (d=14)** ; jeu : **+0,00 à toute distance de 2 à 14**, et à d=6 le min ET le max valent 13,65 (aplat parfait). Détecteur contrôlé : nombres de px comparables des deux côtés à chaque distance (411/414, 408/414, 406/411…). (`m24`,`m25`) |
| F14 | Tout ce qui est GRAS dans la maquette est rendu 20 à 33 % plus maigre ; le texte courant, lui, est identique | fût médian (cœur au seuil) : chiffres **10 → 7 px (−30 %)** · CTA caps **6 → 4 (−33 %)** · sous-titre caps **4 → 3 (−25 %)** · « RÈGLES DONNÉES » **5 → 4 (−20 %)** · « col ouvert » **5 → 4 (−20 %)** · titre sérif du panneau **8 → 7 (−12,5 %)** — contre **2 → 2** pour « la comptabilité tenue » et le paragraphe. Confirmé par le compte d'encre à bbox égale : 0,77 à 0,88 sur les gras, **0,99** sur le paragraphe. Chiffres au cœur strict : runs [8,8,8,8] → [6,6,6,6]. (`m25`,`m26`,`m36`,`m37`) |
| F1 | Le pied du panneau élastique est plus vide, surtout à droite ; les deux colonnes ne finissent plus ensemble | vide sous la pile de tuiles : **167 → 245 px (+47 %)**, soit 22 % → **31 %** de la hauteur du panneau ; vide sous la carte : **81 → 97 px (+20 %)**. Décomposition exacte du +78 px : en-tête de la colonne droite **150 → 123 px (−27)** + pile de 4 tuiles **447 → 414 px (−33)** + `.elast` **766 → 784 px (+18)**. 0 liseré entre local 930 et 1175 (aucune boîte vide). (`m13`,`m14`,`m16`) |
| F22 | 1080×2400 — 339 px de vide entre le bandeau et le cadre | gouttière haute **+339 px** (cadre y=482, bandeau y=143) ; le cadre occupe **1628 / 2036 = 80,0 %** de la zone libre, contre **1627 / 1668 = 97,5 %** dans la |
| F6b | L'interligne n'a été posé que dans le panneau bas ; l'en-tête de la colonne droite reste serré. | « Pas encore / jugeable » (sérif) : interligne **42 → 35 px (−16,7 %)** ; « ce qu'il a / absorbé de vos / règles » : **30/30 → 27/27 px (−10 %)**. Le paragraphe du panneau bas, lui, est conforme (32/33 → 33/32). (`m15`) |
| F17 | Les tuiles sont 9 px plus courtes : le rembourrage interne a fondu, la capitale et l'interligne non. | hauteur de tuile **101/101/100/101 → 92/91/93/92 px (−8,9 %)** ; pas haut-à-haut **115/116/115 → 109/105/108** ; rembourrage haut **25 → 22 px**, bas **26 → 21 px** ; capitales 21/15 px des deux côtés, interligne 35 → 34 px. (`m16`,`m18`) |
| F4 | Le col (triangle) est nettement plus grand et mord davantage sur le bas du cou. | **11,12 × 11,12 u → 14,25 × 13,71 u (+28 % / +23 %)** ; remplissage aire/boîte 0,405 → 0,392 (c'est toujours un triangle) ; recouvrement du cou **2 → 11 rangées**. (`m19`,`m29`,`m42`) |
| F11 | La bouche est plus fine (la longueur, elle, est fermée). | hauteur d'encre **2,55 u → 2,19 u (−14 %)** ; longueur 10,75 → 10,78 u ; centre identique (275,0 ; 751,5) des deux côtés. (`m30`) |
| F12 | Le gant est plus grand et décalé vers la droite. | **8,57 × 5,47 u → 9,50 × 6,03 u (+11 % / +10 %)** ; centre (168,0 ; 938,5) → (175,5 ; 936,0), soit **+7,5 px en x**, −2,5 px en y ; toujours **0 px hors du torse**. (`m31`) |
| F7 | Le CTA est 7 px plus bas de hauteur et sa bordure 1 px plus épaisse ; le texte est identique. | boîte **1500..1594 (95 px) → 1507..1594 (88 px), −7,4 %** ; bordure haute **3 → 4 px** ; texte 29 px de capitale des deux côtés, largeur d'encre 610 → 607 px. (`m38`) |
| F13 | L'enseigne est 6 px plus courte ; le filet or remonte d'autant. | bloc **29..217 (189 px) → 29..211 (183 px), −3,2 %** ; filet or sous l'enseigne local **211..217 → 205..211**. Conséquence en cascade sur les blocs suivants : compteurs −5, `.elast` −4, carte −4. (`m13`,`m27`) |
| F18 | La ligne de balayage teal est un tiers plus longue et déborde des deux côtés du panneau ; sa position, elle, est bonne. | **x 185..852 (668 px) → x 68..953 (886 px), +32,6 %** ; épaisseur 8 → 7 px ; position 30,8 % → 28,6 % de la hauteur du panneau. (`m27`) |
| F19 | Le cadre est 6 px plus large hors-tout, son filet 1 px plus épais, et il colle 3 px plus près du bord de l'écran. | filet **3 → 4 px** ; hors-tout **1038 → 1044 px (+0,6 %)** ; intérieur 1032 → 1036 px ; marge à l'écran **21 → 18 px** à gauche comme à droite. (`m01`,`m38`) |
