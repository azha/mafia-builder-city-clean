# Grandeurs mesurées au tour r12 (2026-09-06, planches `fd0e21e` — post-Bold, post-correctifs de la journée) — ㊲ La réputation

> Valeurs SANS verdict, pour la colonne `critère`. Conventions du r12 : bord = mi-alpha nominal ; coiffe = épaisseur latérale de sombre à 15 %
> de la hauteur du visage, sommet = hauteur où 80 % de la largeur max est atteinte, rangées où le crâne touche le fond sans contour ; halo =
> excès de luminance sur le fond par distance de Chebyshev d2..d20 autour de l'encre des compteurs.

## A. Grandeurs trouvées ÉGALES au r12 (24 lignes, verbatim)

| # | grandeur | réf | jeu | Δ / note | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet à filet | 1627 px | 1628 px | **+1 px** | `m01`,`m34` |
| 2 | carte portrait, filet or hors-tout | 82..505 = **424 px** | 78..502 = **425 px** | +1 px | `m38` |
| 3 | gouttière carte → tuiles | **36 px** | **36 px** | **0 px** | `m38` |
| 4 | marge tuile → bord droit du panneau élastique | **31 px** | **31 px** | **0 px** | `m38` |
| 5 | 10 aplats (cadre, élast, compteur, carte, panneau bas, CTA, enseigne, tuile, torse, peau) | — | — | **≤ 7/255, 8 sur 10 à ≤ 4** | `m27` |
| 6 | 6 jetons d'encre (or vif, or filet, cyan, crème, peau, vert) | — | — | **0 à 1/255** | `m27`,`m28` |
| 7 | couverture de 8 jetons sur toute la surface du cadre | — | — | **≤ 0,17 point** | `m28` |
| 8 | contraste WCAG de 10 textes sur 11 | — | — | **≤ 0,29** (titre 11,84 → 11,55) | `m28` |
| 9 | hauteurs de capitale : titre · paragraphe · « col ouvert » · CTA · « Il vous écoute » | 48 · 24 · 21 · 29 · 26 px | 48 · 24 · 21 · 29 · 26 px | **0 px** | `m23` |
| 10 | largeur d'encre du libellé CTA | 610 px | 607 px | −0,5 % | `m10` |
| 11 | axe du buste (peau · col · cou), relatif à la carte | 208,0 / 208,0 / 208,5 | 209,5 / 209,5 / 209,5 | **≤ 1,5 px** | `m19`,`m17` |
| 12 | yeux : écartement des centres · hauteur de la boîte | 49,5 px · 26 px | 50,5 px · 26 px | ≤ 1 px | `m20` |
| 13 | longueur de la bouche | 59 px | 59 px | **0 px** | `m20` |
| 14 | pastilles des 4 tuiles : diamètre · couleur | 25 px · (42,54,72) | 25 px · (42,53,73) | 0 px · 1/255 | `m33` |
| 15 | gouttières entre tuiles | 16 / 17 / 17 px | 17 / 17 / 18 px | ≤ 1 px | `m13b` |
| 16 | épaisseur de la ligne de balayage | 8 px | 8 px | **0 px** | `m14b` |
| 17 | rails **verticaux** du cadre | 3 px | 3 px | **0 px** | `m35a` |
| 18 | largeur max du torse · largeur du cou | 285 px · 54 px | 288 px · 56 px | +1,1 % · +3,7 % | `m21`,`m19` |
| 19 | couleur du cadran de la montre | (35,42,45) | (34,42,46) | **1/255** | `m22b` |
| 20 | luminance moyenne du cadre | 32,38 | 31,94 | **−1,4 %** | `m27` |
| 21 | interligne du paragraphe du panneau bas | 33 / 33 px | 34 / 33 px | ≤ 1 px | `m12` |
| 22 | interligne des deux lignes d'une tuile | 35 px | 34 px | 1 px | `m29a` |
| 23 | hauteur du bandeau (filet bas) vs canon HUD | 141 px (canon ramené) | 141 px | **0 px** | `m32` |
| 24 | inventaire des parties | 1 enseigne · 1 filet or · 3 compteurs · 1 panneau élastique (carte + 4 tuiles + balayage + en-tête) · 1 panneau bas · 1 CTA | idem | **rien EN TROP, rien ABSENT** | `m05`,`m13b`,`m33` |

## B. Grandeurs à ÉCART au r12 — la mesure seule, sans la classe (21 lignes)

| id r12 | ce qui a été mesuré | mesure |
|---|---|---|
| B1 | 1080×1920 : le CTA passe sous le dock et son libellé est rogné | Zone libre 143..1681 = **1539 px** ; contenu **1488 px** ⇒ il TIENT, mais il est posé 107 px sous le bandeau ⇒ **débordement de 56 px**. Filet bas du CTA : **460/984, 464/982, 476/980 colonnes perdues (47 · 47 · 49 %)**. Encre du libellé : **7,2 %** des px repeints (>40/255), **27,3 %** modifiés (>25/255) ; 8 des 29 rangées de capitale dans les disques. (`m03`,`m07`,`m08b`,`m10`,`m35b`) |
| M1 | Le halo des compteurs est 2 à 8× trop fort et ~1,4 à 2,4× trop large : ce n'est plus une ombre de texte serrée mais un disque flou, qui bave jusque da | Excès de luminance sur le fond, par distance de Chebyshev à l'encre — compteur 1, REF `d2:+29,7 d8:+15,0 d12:+10,2 d20:+2,7` ; JEU `d2:+66,6 d8:+40,8 d12:+31,6 d20:+22,8` (**×2,2 → ×8,3**). ENFREINTES (tiret de 4 px) : JEU `d2:+87,9 … d20:+41,8`. Décroissance à mi-hauteur : **d≈8 → d≈11,5** (compteur), **d≈8 → d≈19** (tiret). Contraste des chiffres **7,41:1 → 4,11:1** (fond local (33,54,62) → (57,95,100)). Nombres de px comparables à chaque distance (412/417, 400/405, 310/298…) ⇒ le détecteur n'est pas biaisé par la population. (`m16`,`m28`) |
| M2 | Le CTA sort du cadre en mode « élastique ». À 2400 sous chrome il est DANS le cadre (comme la maquette) ; à 1920 et sur les DEUX planches « écran seul | Filets or : REF cadre 452..2078, CTA 1952..2046 → **dedans**. C2400 cadre 482..2109, CTA 1989..2076 → **dedans**. C1920 cadre 250..1629, CTA 1650..1737 → **dehors**. S2400 cadre 730..2109, CTA 2130..2217 → **dehors**. Rail vertical or : 1620 px à 2400 contre **1372 px** partout ailleurs. (`m01`,`m03`) |
| M3 | 1080×2400 (résolution cible) : 339 px de bande morte entre le bandeau et le cadre | Bandeau bas 143 ; cadre 482..2109 (**1628 px**) ; première encre du dock 2179. Zone libre **2036 px** ⇒ le cadre occupe **80,0 %**, contre **97,5 %** dans la maquette (1627/1668). Gouttière haute **+339 px**, basse **+69 px**. (`m02`,`m35b`) |
| M4 | Le pied du panneau élastique reste vide à 2400 ; les deux colonnes ne finissent pas ensemble | Vide sous la 4ᵉ tuile : REF **167 px = 21,9 %** du panneau → JEU 2400 **246 px = 31,5 %** ; vide sous la carte **79 → 97 px**. Décomposition : panneau `.elast` 762 → **780 px (+18)**, pile de 4 tuiles 445 → **412 px (−33)**. À 1920 : panneau 673 px, vide sous les tuiles **140 px = 20,8 %**, vide sous la carte **1 px**. (`m13b`,`m36`) |
| M5 | La coiffe n'encadre plus le visage : elle ne descend pas sur les tempes, son sommet est plat, et le crâne sort du dessin sur 8 rangées sans contour. | Épaisseur latérale de sombre (cheveux + contour) accolée à la peau, par % de la hauteur du visage — REF `5 %:26/26 · 10 %:22/23 · **15 %:19/20** · 20 %:13/13 · 30 %:10/11 · 50 %:11/10` ; JEU `5 %:22/21 · 10 %:2/2 · **15 %:0/0** · 20 %:0/0 · 30 %:10/9 · 50 %:9/10`. Pincement du sommet (largeur / largeur max) : REF `4 px:38,5 % · 8:50,0 % · 16:63,5 % · 32:81,8 %` ; JEU `4:52,9 % · 8:64,5 % · 16:79,4 % · 32:95,5 %` (80 % du max atteint à **30 px** contre **17 px**). Rapport coiffe/visage **1,175 → 1,131**. **Rangées où la peau touche le fond sans contour : REF 0, JEU 8** (y 1136..1147 = 13 %..21 %). (`m18b`,`m18c`,`m37`) |
| M6 | Le gras SANS-EMPATTEMENT reste 15 à 30 % plus maigre ; le gras SÉRIF, lui, est refermé | Densité d'encre au cœur (seuil 75 %) / fût moyen — CTA caps **−20,6 / −22,6 %** · chiffres **−15,3 / −23,5 %** · sous-titre caps **−26,1 / −30,5 %** · libellé de compteur **−19,1 / −22,1 %** · « col ouvert » **−27,6 / −26,8 %**. **Témoins maigres** : paragraphe −10,9 / −8,7 %, sous-texte de tuile −5,3 / +12,7 %. **Sérif gras** : titre du panneau −2,5 / −1,9 %, « Le miroir » +5,1 / +1,9 %, « Il vous écoute » +3,0 / +3,6 %. (`m26`, corroboré par `m25`) |
| M7 | Le col (triangle) est +28 % / +23 % et mord plus bas sur le cou. | Masque crème (234,224,200) ±6 : REF **61 × 61 px**, aire 1507 ; JEU **78 × 75 px**, aire 2303. Remplissage aire/boîte 0,405 → 0,394 (c'est toujours un triangle). Centre sur l'axe (208,0 → 209,5 rel carte). (`m17`,`m19`) |
| M8 | L'écran n'est pas stable : entre T et T+1 s, le portrait descend de 24 px parce que le nom du lieutenant arrive après coup. | 1080×1920 écran seul : **47 196 px** diffèrent (**2,276 %**) ; 43 870 à ≥ 8/255 ; 20 054 à ≥ 32/255 ; écart max **221/255** en (254,1057) (crème → fond de carte). Colonnes mobiles **x 147..433** — **0 colonne au-delà de x=530** (la colonne des tuiles, les compteurs, le panneau bas et le CTA ne bougent pas). Libellé de la carte : **1 ligne (703..718) → 2 lignes (703..719 + 727..741)**. Décalage du buste minimisant l'écart de profil : **+24 px** (résidu 1,59). (`m30`,`m31`) |
| m1 | La ligne de balayage est ~34 % plus longue et atteint les deux bords du panneau. | Excès de teal par rapport au fond local (y±25), au pic : REF 67,5 / JEU 55,0. Étendue à **25 % du pic** : REF x 240..857 = **618 px** → JEU x 137..967 = **831 px (+34,5 %)** ; à 10 % : 860 → 966 px. Épaisseur **8 px** des deux côtés. Position **31,4 % → 29,2 %** de la hauteur du panneau (tiers haut des deux côtés). (`m14b`,`m14c`) |
| m2 | Les tuiles sont 9 % plus courtes ; le rembourrage interne a fondu, pas la typo. | Hauteur de tuile **99 / 99 / 98 / 99 → 90 / 89 / 90 / 90 px** ; pas haut-à-haut **115 / 116 / 115 → 107 / 107 / 108** ; gouttières **16/17/17 → 17/17/18** ; capitales 21 et 16-18 px des deux côtés. Largeur des tuiles **454 → 461 px (+1,5 %)**. (`m13b`,`m23`) |
| m3 | La boîte du CTA est 7 px plus basse, le texte identique. | REF **1952..2046 = 95 px** ; JEU **1989..2076 = 88 px** (**−7,4 %**). Libellé : largeur d'encre 610 → 607 px, capitale **29 px** des deux côtés. Filets 3 px des deux côtés. (`m10`) |
| m4 | L'interligne de l'en-tête de la colonne droite reste serré (le paragraphe du panneau bas, lui, est conforme). | « Pas encore / jugeable » : lignes REF (891..917) et (933..967) → pas **42 px** ; JEU (910..937) et (946..981) → pas **36 px** (**−14,3 %**). Témoin : paragraphe du panneau bas 33/33 → 34/33. (`m29a`,`m12`) |
| m5 | L'aparté « ce qu'il a absorbé de vos règles » se replie sur 2 lignes au lieu de 3 (colonne droite plus large). | REF 3 lignes, pas **29 / 30 px** ; JEU **2 lignes**, pas 28 px. Tuiles 454 → 461 px, panneau élastique 978 → 986 px. (`m29a`,`m06`) |
| m6 | La bouche est plus fine ; sa longueur est juste. | Trait interne au visage : REF x267..325 (**59 px**), y1196..1211 (**16 px**), encre **586 px** ; JEU x264..322 (**59 px**), y1228..1239 (**12 px, −25 %**), encre **403 px (−31 %)**. Épaisseur moyenne (aire/longueur) **9,9 → 6,8 px**. Centre identique à 1 px près. (`m20`) |
| m7 | Le cadran de la montre est +11 % / +13 % et décalé de 8,5 px vers l'axe. | Masque couleur exacte : REF **47 × 30 px**, aire 900 ; JEU **52 × 34 px**, aire 1230. Centre rel carte (104,0 ; 510,5) → (112,5 ; 509,5) ⇒ distance à l'axe du buste **104,5 → 97,0 px**. Couleur (35,42,45) → (34,42,46). (`m22b`) |
| m8 | Le cadre est 6 px plus large, colle 3 px plus près du bord, et son filet HORIZONTAL est 1 px plus épais (les rails verticaux, eux, sont refermés à 3 p | Hors-tout **1038 → 1044 px** ; marge écran **21 → 18 px** à gauche comme à droite ; rails verticaux **3 → 3 px** ; filets haut et bas **3 → 4 px**, mesuré à x = 200, 540 et 900. (`m34`,`m35a`) |
| m9 | Le bloc enseigne est ~7 px plus court ; le filet or remonte d'autant, et toute la suite se décale. | Filet or sous l'enseigne, relatif au haut du cadre : **211..217 → 204..211**. Panneau de l'enseigne 29..211 → 31..204 (**182 → 173 px, −4,9 %**). Cascade : compteurs −4, `.elast` −4 en haut / +14 en bas, panneau bas +15, CTA +9. (`m05`) |
| m10 | Le visage est 8,7 % plus large pour un dessin de hauteur voisine — la transformation n'est pas homothétique. | Largeur max de la peau **126 → 137 px (+8,7 %)** ; hauteur du visage **134 → 140 px (+4,5 %)** ; largeur du cou 54 → 56 px ; largeur max du torse 285 → 288 px (**+1,1 %**). (`m18a`,`m18b`,`m21`) |
| m11 | Chrome partagé — le libellé « ARGENT » est plus haut et moins interlettré qu'au canon HUD, et la barre d'argent n'a plus de reliquat. | Canon ramené à l'échelle capture (×0,9184) : largeur **116 px**, capitale **17,4 px**, 6 groupes de lettres. Capture : largeur **107 px (−7,5 %)**, capitale **19 px (+8,9 %)**, 6 groupes. Barre : reliquat gris visible au canon, absent en jeu. (`m32`) |
| m12 | Chrome partagé — l'aile droite ne porte qu'UNE ligne de texte là où le canon en porte deux : aucune heure n'est affichée. | Canon : lignes d'encre à y 43..66 (« JOUR 12 · SOIRÉE ») et **77..107 (« 21:40 », capitale 31 px)**. Capture : **une seule** ligne à y 28..48 (« JOUR 50 ») ; la 2ᵉ ligne est un tiret de **3 px × 35 px** à y 87..89. Filet du bandeau au bon endroit (141 px des deux côtés). (`m32`) |

## C. Les grandeurs de r9/r11 retrouvées au r12 (statut r12, verbatim)

| grandeur (source) | r9 / r11 | r12 | statut r12 |
|---|---|---|---|
| grandeur (source) | r9 / r11 | r12 (2400) | statut |
| hauteur du cadre (r9 #1 · r11 P1) | 1626 / 1627 px | **1627 → 1628** | **ÉGAL** |
| carte portrait (r9 #2 · r11 P3) | 424 / 425 px | **424 → 425** | **ÉGAL** |
| gouttière carte → tuiles (r9 #3 · r11 P5) | 37 / 37 px | **36 → 36** | **ÉGAL** |
| axe du buste (r9 F2, −11,7 px → r11 P4, fermé) | ≤ 0,5 px | **≤ 1,5 px** | **RESTE FERMÉ** |
| aplats (r9 #14 · r11 P7) | ≤ 6/255 | **≤ 7/255**, 8/10 à ≤ 4 | **ÉGAL** |
| contrastes WCAG (r11 P8) | ≤ 0,38 | **≤ 0,29 sur 10 textes** ; chiffres cyan **−3,30** | **ÉGAL sauf les chiffres** (cause : `M1`) |
| couverture de palette (r9 #15 · r11 P9) | ≤ 0,4 pt / ≤ 0,15 pt | **≤ 0,17 pt (8 jetons)** | **ÉGAL** |
| sous-titre : couleur · capitale (r11 P10) | 0/255 · 0 px | **0/255 · 17 → 18 px** | **ÉGAL** |
| chiffres : capitale · couleur (r11 P11) | 37 px · 0/255 | **38 → 38 px · 0/255** | **ÉGAL** |
| interligne du paragraphe (r11 P12, fermé) | 1 px | **≤ 1 px** | **RESTE FERMÉ** |
| tuiles : largeur · gouttières (r11 P13) | +1,5 % · 17/14/15 | **+1,5 % · 17/17/18** | **ÉGAL** |
| longueur de la bouche (r11 P14, fermé) | 0,03 u | **59 → 59 px** | **RESTE FERMÉ** |
| torse : largeur max (r11 P15) | +0,26 % | **+1,1 %** | **ÉGAL** |
| position du balayage (r11 P16) | 30,8 → 28,6 % | **31,4 → 29,2 %** | **ÉGAL** |
| boîtes des compteurs (r11 P17) | 312 px · écarts 23/25 | REF 310 · 310 · 310 → JEU 313 · 312 · 313 px ; écarts 24 → 24 px | **ÉGAL** (+1,0 %) |
| titre « Le miroir » (r9 #6 · r11 P18) | +1,2 % · −4,2 % | **+1,0 % · 0,0 %** | **ÉGAL, amélioré** |
| inventaire (r9 #20 · r11 P19) | rien en trop / absent | **idem** | **ÉGAL** |
| capitales des tuiles (r11 P20) | 21 · 15 px | **21 · 16-18 px** | **ÉGAL** |
| gouttière basse cadre → dock (r11 P2 : 70 px) | 70 px | **2400 : 69-71 px** · **1920 : le CTA la traverse** | **RÉGRESSÉ à 1920** (`B1`) |
| **r9 F1** (le paragraphe nie les voyants : 2 tuiles allumées) | tuiles 1 et 3 `.on` | **les 4 tuiles ÉTEINTES**, pastille (42,53,73) = celle de la réf | **FERMÉ** |
| **r9 F12** (le sous-titre n'est aucune des 6 lignes) | 0/0/0 au grep | « UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ » = la ligne de #120, `grep` **1 hit** dans `ecrans-brennar-6.html:6005` et `generateur-reputation.py:185` ; contrôle négatif « personne ne vous a encore » **0 hit** dans le HTML | **FERMÉ** |
| **r9 F11** (fond du cadre : dégradé monotone) | 22·21·20·19·18·16·15·15·17·18·18 vs 22·21·21·21·20·19·19·19·18·17·17 | non remesuré ce tour | **NON REJUGÉ** |
| **r9 F10 / r11 P6** (padding `.elast` asymétrique, 30 vs 23 px) | 30 → 23 px | **31 → 31 px des deux côtés** | **FERMÉ** |
| **r9 F5 / r11 F5** (halo de pastille / lueur des chiffres ABSENTE) | +0,00 à toute distance | **+66,6 à d2, +22,8 à d20** | **FERMÉ → SUR-CORRIGÉ** (`M1`) |
| **r11 F15** (1920 : le cadre déborde SOUS le bandeau, −141 px) | −141 px, rail invisible sur 140 px | **gouttière haute +107 px**, rail or intact | **FERMÉ** |
| **r11 F16** (1920 : le titre illisible, 41 % des colonnes recouvertes) | 0 % intact, contraste 2,45:1 | titre entier, capitale 48 px, contraste **11,55:1** | **FERMÉ** |
| **r11 F2** (calotte, 6 nombres) | ép. latérale 21 → 1 px | **19-20 → 0 px** | **OUVERT** (`M5`) |
| **r11 F14** (gras −20 à −33 %) | −12,5 à −33 % | sérif **−2,5 à +5 %** · sans **−15 à −30 %** | **MOITIÉ FERMÉ** (`M6`) |
| **r11 F1 / r9 F8** (vide du pied) | 167 → 245 px (31 %) | **167 → 246 px (31,5 %)** à 2400 ; **20,8 %** à 1920 | **OUVERT à 2400** (`M4`) |
| **r11 F4** (col +28 %/+23 %) | +28 % / +23 % | **+28 % / +23 %** | **OUVERT** (`M7`) |
| **r11 F11** (bouche −14 %) | −14 % | **−25 %** | **OUVERT** (`m6`) |
| **r11 F12** (gant +11 %/+10 %, +7,5 px) | +11 % / +10 % | **+11 % / +13 %, +8,5 px** | **OUVERT** (`m7`) |
| **r11 F7** (CTA −7,4 %) | 95 → 88 px | **95 → 88 px** | **OUVERT** (`m3`) |
| **r11 F13** (enseigne −6 px) | 189 → 183 px | **182 → 173 px** | **OUVERT** (`m9`) |
| **r11 F17** (tuiles −8,9 %) | 101 → 92 px | **99 → 90 px** | **OUVERT** (`m2`) |
| **r11 F18** (balayage +32,6 %) | 668 → 886 px | **618 → 831 px (+34,5 %)** | **OUVERT** (`m1`) |
| **r11 F19** (cadre +6 px, filet 3 → 4) | +6 px, filet 3 → 4 | **+6 px** ; rails verticaux **3 → 3**, filets horizontaux **3 → 4** | **PARTIELLEMENT FERMÉ** (`m8`) |
| **r11 F22** (2400 : 339 px de vide en haut, 80,0 %) | 339 px, 80,0 % | **339 px, 80,0 %** | **OUVERT** (`M3`) |
| **r11 F6b** (en-tête droit serré, 42 → 35) | −16,7 % | **42 → 36 px (−14,3 %)** | **OUVERT** (`m4`) |

## D. La paire T / T+1 s au r12 (écran seul, 1920)

```
px ≥ 1/255 : 47 196 (2,27604 %) · ≥ 8/255 : 43 870 · ≥ 32/255 : 20 054 · max 221/255 en (254,1057) · colonnes mobiles x 147..433 (0 au-delà de 530)
mécanisme : « VOTRE LIEUTENANT » (1 ligne, y 703..718) → « LT. TULL, VOTRE LIEUTENANT » (2 lignes, y 703..719 + 727..741) ; buste +24 px ; reste identique à l'octet
contrôle positif : T vs planche sous chrome = 52 288 px sur un échantillon au 1/9
```
