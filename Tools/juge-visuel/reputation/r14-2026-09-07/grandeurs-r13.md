# Grandeurs mesurées au tour r13 (2026-09-06, planches `34e28bf`) — ㊲ La réputation (SANS les verdicts)

> Valeurs sans classe, pour la colonne `critère`. Conventions du r13 : bord = mi-alpha nominal ; coiffe isolée RANGÉE PAR RANGÉE (la
> ligne de balayage coupe la silhouette en deux — une mesure par connexité repart du morceau du bas) ; halo = excès de luminance sur le
> fond par distance de Chebyshev d2..d30 autour de l'encre des compteurs, ajustement A·exp(−d/λ).

## A. Grandeurs trouvées ÉGALES au r13 (24 lignes, verbatim)

| # | grandeur | réf | jeu | Δ / note | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet à filet | 452..2078 = **1627 px** | 482..2109 = **1628 px** | +1 px | `m01`,`m08` |
| 2 | carte portrait, filet or hors-tout | 82..505 = **424 px** | 78..502 = **425 px** | +1 px | `m04` |
| 3 | gouttière carte → tuiles | **36 px** | **36 px** | **0** | `m21` |
| 4 | **13 aplats sur 13** (fond de cadre, enseigne, boîte de compteur, panneau élastique, carte, torse, panneau bas, boîte du CTA, filet or du cadre, filet de tuile, peau, crème, cyan) | — | — | **≤ 6/255**, 10 sur 13 à ≤ 3 | `m14` |
| 5 | profil du fond du cadre sur 8 hauteurs (offsets 10 → 1600) | — | — | **≤ 4/255** — le dégradé du cadre est conforme (ferme r9 F11) | `m14` |
| 6 | peau · crème du col · cyan des chiffres · libellé de compteur | (185,173,146) · (234,224,200) · (127,212,217) · (138,151,156) | idem | **0/255** | `m14`,`m07` |
| 7 | filet or du cadre | (176,141,62) | (176,141,61) | **1/255** | `m14` |
| 8 | titre « Le miroir » : capitale · largeur d'encre · contraste | 48 px · 417 px · 11,55:1 | 48 px · 419 px · 11,55:1 | 0 px · +0,5 % · 0,00 | `m16` |
| 9 | sous-titre : capitale · largeur · contraste | 41 px · 776 px · 8,31:1 | 41 px · 768 px · 8,19:1 | 0 · −1,0 % · −0,12 | `m16` |
| 10 | libellé de la carte portrait : 2 lignes, hauteurs · largeurs | 18/16 px · 227/166 px | 18/16 px · 220/164 px | ≤ 7 px | `m16` |
| 11 | « Il vous écoute » : capitale · largeur · contraste | 26 px · 240 px · 7,23:1 | 26 px · 242 px · 7,38:1 | 0 · +0,8 % | `m16` |
| 12 | titre du panneau bas (sérif) : capitale · largeur · contraste | 38 px · 612 px · 13,57:1 | 38 px · 607 px · 13,85:1 | 0 · −0,8 % | `m16` |
| 13 | libellé du CTA : capitale · largeur · contraste | 30 px · 611 px · 11,22:1 | 29 px · 607 px · 11,44:1 | −1 px · −0,7 % | `m16` |
| 14 | panneau bas : nombre de lignes | 5 | 5 | **0** | `m16` |
| 15 | gouttières entre les 4 tuiles | 14 / 15 / 15 px | 15 / 14 / 15 px | ≤ 1 px | `m17` |
| 16 | épaisseur de la ligne de balayage | 8 px | 7 px | 1 px | `m03` |
| 17 | position du reflet dans le panneau élastique | **31,6 %** de la hauteur | **29,3 %** | tiers haut des deux côtés ⇒ ASSUMÉ tenu | `m19` |
| 18 | le col reste un TRIANGLE (remplissage aire/boîte) | 0,403 | 0,394 | ⇒ ASSUMÉ tenu (0,9 aurait dit « pas un triangle ») | `m17` |
| 19 | axe du col vs axe du buste | centre x 293,0 | centre x 290,5 | 2,5 px | `m17` |
| 20 | tiret « ENFREINTES » : couleur · centrage dans sa boîte | (127,212,217) · — | (127,212,217) · **−0,5 px** | ⇒ ASSUMÉ tenu (un trou se lit comme un trou) | `m19` |
| 21 | la mention « lieutenant.name — non projeté (L0.4) » | **présente** dans la maquette | **ABSENTE** en jeu | ⇒ ASSUMÉ tenu, le nom du compte est projeté | `m16` |
| 22 | luminance moyenne du cadre entier | 32,15 | 31,93 | **−0,7 %** | `m13` |
| 23 | filet du bandeau (chrome) | canon ramené y=141 | capture y=141 | **0 px** | `m18` |
| 24 | planches « écran seul » : rien de coupé en haut ni en bas (3 planches) | — | 0 px d'encre aux rangées 8 et H−9 | **rien hors cadre** | `m19` |

## B. Grandeurs à ÉCART au r13 — la mesure seule, sans la classe (20 lignes)

| id r13 | ce qui a été mesuré | mesure |
|---|---|---|
| M1 | Le halo des compteurs n'est plus une ombre de texte : c'est un disque flou qui comble l'interligne et soude le chiffre à son libellé | alpha **×2,13** (A 38,0 → 81,2 pts), rayon **×1,57** (λ 8,01 → 12,56 px), lumière ajoutée **×5,2** ; portée à +5 pts **d16 → d30** ; contraste des chiffres **8,67:1 → 4,49:1** ; fond local **(26,42,50) → (53,89,94)** ; boîte du compteur : **2 lignes → 1** (`m07`,`m16`,`m20`) |
| M2 | La coiffe n'encadre plus le visage : pas de descente sur les tempes, sommet plat, crâne nu sur 6 rangées | 15 % : **20/20 → 1/1 px** · sommet à 80 % : **35 → 16 px** · rangées de crâne nu : **0 → 6** (y 1136..1144) (`m05`,`m06`) |
| M3 | 1920 sous chrome : le cadre remonte à 20 px du filet du bandeau | à 2400 le chrome laisse sous son filet : médaillon **y143..203**, losange **x531..548 × y215..231** (18×17 px, `(176,141,61)`). À 1920 le cadre commence à **y=162** ⇒ le losange ajoute **162 px d'or** dans le panneau d'enseigne là où le contenu seul en porte **0**, sur les rangées du titre ; l'anneau du médaillon pose **138 px** d'or à y172..200 dans le panneau (`m09`,`m10`) |
| M4 | 2400 (résolution cible) : 340 px de bande morte entre le bandeau et le cadre ; le cadre n'occupe que 79,9 % de la zone libre | zone libre **142..2179 = 2038 px** ; cadre **482..2109 = 1628 px** ⇒ **79,9 %**, contre **1627/1668 = 97,5 %** dans la maquette. Gouttière haute **+340 px**, basse **71 px** (`m08`) |
| M5 | 1920 : le CTA déborde de 24 px sous le filet bas du cadre et le masque sur toute sa largeur (seuls les deux angles du cadre restent visibles) | filet bas du cadre **y1622..1625** (rail gauche 167..**1623**) ; bas du CTA **1646..1649**. À 2400, CTA **1989..2076** dans le cadre **482..2109**, garde de **30 px** — exactement celle de la maquette : conforme (`m08`) |
| M6 | Le reflet n'est plus un reflet : la ligne de balayage traverse le panneau de bord à bord en coupant le portrait | étendue à 25 % du pic **524 px (x264..787) → 831 px (x137..967)**, **+58,6 %** ; à 10 % **805 → 968 px (x56..1023)** pour un panneau large de **988 px** ⇒ **84 %** de la largeur contre **53 %** ; pic d'excès 67,5 → 55,0 ; épaisseur 8 → 7 px (`m03`,`m21`) |
| M7 | Le pied du panneau élastique reste vide : les deux colonnes ne finissent pas ensemble | vide sous la 4ᵉ tuile **165 px = 21,5 % → 245 px = 31,2 %** ; vide sous la carte **79 → 95 px** ; panneau `.elast` **766 → 784 px (+18)**, pile de 4 tuiles **447 → 414 px (−33)** (`m12`,`m17`) |
| M8 | L'écran n'est pas stable : 2,31 % des px bougent entre T et T+1 s (ruling : aucune animation) | **47 988 px** ≥ 1/255, **20 419** ≥ 32/255, max **221/255** ; libellé **1 → 2 lignes**, buste décalé ; colonnes mobiles x 147..434 (`m11`) |
| M9 | Le gras sans-empattement porte 15 à 25 % d'encre en moins à largeur et capitale égales ; le sérif, lui, en porte autant ou plus | à largeur d'encre égale (≤ 1 %) : CTA **7 334 → 6 075 px (−17,2 %)** · sous-titre **6 701 → 5 580 (−16,7 %)** · sur-titre du panneau bas **3 690 → 3 119 (−15,5 %)** · libellé de carte **2 980 → 2 225 (−25,3 %)**. Témoins sérif : titre **5 650 → 6 170 (+9,2 %)** · « Il vous écoute » **2 351 → 2 544 (+8,2 %)** · titre du panneau bas **9 438 → 9 094 (−3,6 %)** (`m16`) |
| M10 | Les tuiles sont 8 % plus courtes et leur rythme se resserre ; le rembourrage a fondu, pas la typo | hauteurs **101/101/100/101 → 93/92/93/92 px** ; pas haut-à-haut **115/116/115 → 108/106/108** ; gouttières 14/15/15 → 15/14/15 ; largeur **456 → 463 px (+1,5 %)** (`m12`,`m17`,`m21`) |
| m1 | L'interligne de l'en-tête de la colonne droite reste serré | « Pas encore / jugeable » : pas haut-à-haut **42 → 36 px (−14,3 %)** ; témoin : le paragraphe du panneau bas est conforme (`m17`,`m16`) |
| m2 | L'aparté « ce qu'il a absorbé de vos règles » se replie sur 2 lignes au lieu de 3 | REF **3 lignes** (pas 29/30 px) → JEU **2 lignes** (pas 27) ; panneau élastique **980 → 988 px** (`m17`,`m21`) |
| m3 | La boîte du CTA est 7 px plus basse, le texte identique | **1952..2046 = 95 px → 1989..2076 = 88 px (−7,4 %)** ; libellé : capitale 30 → 29, largeur 611 → 607 (`m01`,`m16`) |
| m4 | Le bloc enseigne est plus court : le filet or remonte de 6 px et toute la suite se décale | filet or sous l'enseigne, en offset : **211..217 → 205..211** ; cascade sur les compteurs **−5**, sur `.elast` **−4** en haut / **+14** en bas (`m12`) |
| m5 | Le cadre est 6 px plus large et colle 3 px plus près du bord | hors-tout **1038 → 1044 px** ; marges d'écran **21 → 18 px** à gauche comme à droite ; filets horizontaux **3 → 4 px**, rails verticaux **3 → 3 px** (`m01`,`m21`) |
| m6 | Le visage est 9,5 % plus large pour 4,9 % de haut en plus — la transformation n'est pas homothétique | largeur max de la peau **126 → 138 px** ; hauteur du visage **123 → 129 px** ; silhouette de tête **153 → 153 px** (`m05`,`m06`) |
| m7 | Le col (triangle crème) est +25 % / +23 % et son aire +50 % | boîte **61×61 px, aire 1500 → 76×75 px, aire 2246** ; il reste un triangle (remplissage 0,403 → 0,394) et reste centré (293,0 → 290,5) (`m17`) |
| m8 | Le cadran de la montre est +11 % / +21 % et son aire +46 % | **47×24 px, aire 741 → 52×29 px, aire 1085** (`m17`) |
| m9 | La bande intérieure haute du cadre porte une lueur brune là où la maquette en a une bleue — changement de famille de teinte | médiane par colonne sur la bande entre le filet du cadre et le panneau d'enseigne : REF bord **(16,23,34)** → pic **(23,29,36)** ; JEU bord **(16,22,31)** → pic **(43,37,33)**. Écart au pic **20/255** sur R. La même lueur déborde au-dessus du filet du cadre (y 417..510 à 2400) (`m09`,`m20`) |
| m10 | Chrome partagé : le libellé « ARGENT » est plus étroit et sa capitale plus haute qu'au canon | canon ramené ×0,9184 : largeur **116 px**, capitale **18 px** ; capture **107 px (−7,8 %)**, capitale **19 px (+5,6 %)** ; le soulignement est à la même largeur (204 px), 6 px plus bas (`m18`) |

## C. Les grandeurs de r12 retrouvées au r13 (statut r13, verbatim)

| grandeur | r12 | r13 | statut |
|---|---|---|---|
| id r12 | grandeur | r12 | r13 (ce tour) |
| B1 | 1920 : CTA sous le dock | posé 107 px sous le bandeau, débordement 56 px, 47-49 % des colonnes du filet perdues | posé **20 px** sous le bandeau ; bas du CTA 1649 ; **dock à 1699 ⇒ 50 px de garde** |
| M1 | halo des compteurs | d2 +66,6 → d20 +22,8 ; contraste 7,41 → 4,11 | d2 **+65,0** → d20 **+23,2** ; contraste **8,67 → 4,49** |
| M2 | CTA hors du cadre en mode élastique | C1920 cadre 250..1629, CTA 1650..1737 → dehors ; S2400 dehors | C1920 cadre **162..1625**, CTA **1562..1649** → **encore dehors de 24 px** ; **S2400 cadre 482..2109, CTA 1989..2076 → DEDANS** |
| M3 | 2400 : 339 px de bande morte, cadre à 80,0 % | 339 px · 80,0 % | **340 px · 79,9 %** |
| M4 | pied du panneau élastique vide | 167 → 246 px (31,5 %) | **165 → 245 px (31,2 %)** |
| M5 | la coiffe | 19-20 → 0 px · 30 → 17 px · 0 → 8 rangées | **20 → 1 px** · **35 → 16 px** · **0 → 6 rangées** |
| M6 | gras sans-empattement −15 à −30 %, sérif refermé | −15,3 à −30,5 % · sérif −2,5 à +5,1 % | **−15,5 à −25,3 %** · sérif **−3,6 à +9,2 %** |
| M7 | col +28 % / +23 % | 61×61 → 78×75, aire 1507 → 2303 | **61×61 → 76×75, aire 1500 → 2246** |
| M8 | instabilité T/T+1 s | 47 196 px (2,276 %) ; nom absent à T | **47 988 px (2,314 %)** ; nom absent à T |
| m1 | balayage +34,5 %, atteint les deux bords | 618 → 831 px | **524 → 831 px (+58,6 %)** au même seuil ; 831 px identique au r12 |
| m2 | tuiles 9 % plus courtes | 99 → 90 px ; pas 115 → 107 | **101 → 93 px ; pas 115 → 108** |
| m3 | boîte du CTA −7,4 % | 95 → 88 px | **95 → 88 px** |
| m4 | en-tête droit serré −14,3 % | 42 → 36 px | **42 → 36 px** |
| m5 | aparté 2 lignes au lieu de 3 | 3 → 2 | **3 → 2** |
| m6 | bouche plus fine | épaisseur 9,9 → 6,8 px | **non re-mesurée** (ma sonde attrapait le contour du visage) |
| m7 | cadran +11 % / +13 % | 47×30 → 52×34 | **47×24 → 52×29** (+10,6 % / +20,8 %) |
| m8 | cadre +6 px, marge 21 → 18, filet 3 → 4 | idem | **idem** |
| m9 | enseigne −7 px, filet or remonté | 211..217 → 204..211 | **211..217 → 205..211** |
| m10 | visage +8,7 % de large | 126 → 137 px | **126 → 138 px** |
| m11 | chrome : ARGENT −7,5 % / capitale +8,9 % | 116/17,4 → 107/19 | **116/18 → 107/19** |
| m12 | chrome : aile droite sans heure | 2 lignes → 1 ligne + tiret 3×35 px | **2 lignes → 1 ligne (JOUR 50) + tiret 3×35 px à y87..89** |
| — | grandeurs r12 déclarées **ÉGALES** (24) | — | **22 re-mesurées, toutes encore égales** (tableau de contrôle positif) ; 2 non re-mesurées : pastilles des tuiles, yeux |

## D. Le halo au r13 (texte du rapport, sans verdict)

```
## Le halo des compteurs — profil, rapport, et ce qui domine
Compteur 1 (« RÈGLES DONNÉES »), boîtes intérieures mesurées au gradient : REF `x54..358 × y706..812`,
JEU `x50..356 × y731..837`. Les px du libellé crème sont exclus ; les comptes par distance sont
comparables des deux côtés (361-425 px à d2, 226-237 à d30) ⇒ **la population n'explique pas l'écart**.
| d (Chebyshev) | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 22 | 26 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **réf** (pts de luminance) | +28,1 | +25,4 | +17,9 | +13,4 | +10,9 | +8,6 | +6,9 | +5,3 | +4,2 | +4,7 | +1,9 | +1,4 |
| **jeu** | +65,0 | +63,5 | +52,2 | +41,8 | +35,6 | +31,6 | +27,9 | +24,3 | +20,7 | +19,3 | +8,9 | +7,4 |
| **jeu / réf** | **2,32** | 2,50 | 2,92 | 3,11 | 3,28 | 3,66 | 4,07 | 4,57 | 4,97 | 4,07 | 4,78 | **5,17** |
- **Contraste des chiffres** : **8,67:1 → 4,49:1** (fond local de l'anneau d2..d4 : `(26,42,50)` → `(53,89,94)`).
  Le seuil de doctrine pour un grand texte est 3:1 : **le jeu passe encore**, mais il a perdu **48 %** de son contraste.
- **Portée** : dernière distance où l'excès dépasse +5 points — **d=16 (réf) → d=30 (jeu)**.
- **Ce qui domine.** Ajustement `A·exp(−d/λ)` sur d2..d12 : réf `A = 38,0 pts, λ = 8,01 px` ;
  jeu `A = 81,2 pts, λ = 12,56 px`. ⇒ **alpha ×2,13 · rayon ×1,57 · lumière totale ajoutée (A·λ²) ×5,2**.
  **Aucun des deux ne domine seul** : le rapport n'est pas constant avec la distance (il irait de 2,32
  partout si seul l'alpha avait bougé) et il ne tend pas vers 1 en d→0 (ce qu'il ferait si seul le
  rayon avait bougé). Concrètement : ramener **l'alpha seul** au canon (÷2,13) laisserait un halo encore
  **1,57× trop large**, qui porterait encore ≈ +10 pts à d=20 là où la maquette est à +1 ; ramener le
  **rayon seul** laisserait le contraste des chiffres vers 5,5:1 au lieu de 8,67:1.
  **Le rapport de 8,1 du modèle du correcteur n'est atteint à aucune distance ≤ 30 px** sur cette planche.
- **Preuve indépendante de la portée, sans aucun réglage de seuil** : mon inventaire automatique de
  lignes (`m16`) trouve **2 lignes** dans la boîte du compteur de la référence (chiffres y724..762,
  libellé y780..798) et **1 seule** en jeu (y747..823, h=77) — la lueur comble les 25 px d'interligne
  et **soude le chiffre à son libellé**.
- **Le compteur 3 est le pire cas** : pour un tiret de **4 px** de haut, l'excès est **+88,1 à d2** et
  **encore +17,5 à d30** (référence, avec « 00 » : +28,1 → +2,4). Le halo est de rayon fixe,
  indépendant du glyphe : un tiret de 185 px d'encre produit un disque lumineux.
```

## E. La coiffe au r13 (texte du rapport, sans verdict)

```
## La coiffe — méthode d'isolement et verdict
**Ce qui rend cette mesure difficile, et comment je l'ai contourné.** La coiffe `(22,25,27)` REF /
`(22,22,28)` JEU et le fond de carte `(17,24,35)` / `(13,22,34)` ne sont séparés que de **8 et 9/255**
en Chebyshev : aucun seuil « distance au fond » ne les distingue (une première version de `m06`
utilisant un seuil de 12 a rendu une silhouette **vide** au-dessus de la ligne de balayage, et a pris
la ligne elle-même pour le sommet du crâne — l'échec est imprimé dans l'en-tête du script). Et la
**ligne de balayage** éclaire la coiffe en `(45,67,69)` / `(54,89,93)`, ce qui la rend *plus proche du
fond que d'elle-même* : elle **coupe la silhouette en deux**, et une mesure par composante connexe
repart du morceau du bas.
**Isolement retenu** — classement de chaque px de la carte au **plus proche nominal** parmi les cinq
matières relevées à l'histogramme (`m02`) : fond, peau, contour, coiffe, crème. `SOMBRE = {contour,
coiffe}`. Le **visage** est la plus grande composante connexe de PEAU (le libellé « LT. … » en est une
autre, plus petite : il est écarté sans réglage de seuil ; le cou y est rattaché, mais ses rangées font
54-56 px et les rangées du visage ≥ 60 px). La **tête** est mesurée **rangée par rangée**, sans
connexité, pour que l'exclusion des rangées de balayage (REF 1078..1095, JEU 1093..1110) ne coûte que
ces rangées-là. Contrôle positif : la largeur max du visage rend **126 px (REF) / 138 px (JEU)** et la
largeur max de la silhouette **153 px des deux côtés** — deux instruments indépendants (`m05` par
composante, `m06` par rangée) tombent sur la même valeur.
| grandeur | référence | jeu | r12 (pour mémoire) | verdict |
|---|---|---|---|---|
| **épaisseur latérale de sombre à 15 % de la hauteur du visage** | **20 / 20 px** | **1 / 1 px** | 19-20 → 0 | inchangé |
| profil complet (5/10/15/20/30/50 %) | 26/26 · 23/23 · **20/20** · 16/16 · 11/12 · 11/11 | 18/18 · 2/1 · **1/1** · 10/10 · 9/10 · 9/10 | — | le creux de 10 % à 15 % est intact |
| **hauteur sous le sommet où 80 % de la largeur max est atteinte** | **35 px** | **16 px** | 30 → 17 | inchangé |
| pincement (4/8/16/32 px sous le sommet, en % du max) | 34,0 · 45,8 · 60,1 · 78,4 % | 53,6 · 65,4 · 80,4 · 96,1 % | 38,5/50,0/63,5/81,8 → 52,9/64,5/79,4/95,5 | inchangé |
| **rangées où la peau touche le fond SANS contour** | **0** | **6** (y 1136..1144, soit 12 %..19 % du visage, côtés G et D) | 0 → 8 | amélioré de 2 rangées |
⇒ **Je tranche : M5 n'est PAS fermée.** Le correctif structurel n'a pas changé la forme de la coiffe ;
il a au mieux raccourci de deux rangées la bande où le crâne sort du dessin. Ce n'est **pas** un écart
de couvre-chef (l'arbitrage `fedora`/`casquette` du dossier ne s'applique pas : les deux côtés dessinent
la même calotte sombre) — c'est la **géométrie** de cette calotte : sommet plat au lieu de pincé,
et pas de descente sur les tempes.
```
