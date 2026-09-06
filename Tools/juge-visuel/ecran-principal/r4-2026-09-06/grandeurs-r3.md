# Grandeurs mesurées au tour r3 (2026-09-06, planches du 04/09) — ① Le HUD de district

> Liste des GRANDEURS et de leurs valeurs mesurées au tour précédent — SANS les verdicts (amendement de skill soumis à
> l'user, appliqué à la main). Sert à remplir la colonne `critère` (`DÉJÀ APPLIQUÉ` / `NOUVEAU`). La colonne `script` est
> un repère, pas une invitation à l'ouvrir. ⚠️ Les planches du r3 étaient sur `operational_demo` (04/09) : les valeurs de
> CONTENU (solde, nom de bâtiment, jour) ne sont pas comparables ; la forme l'est.

## A. Grandeurs trouvées ÉGALES au r3

| # | grandeur | canon | capture | Δ | script |
|---|---|---|---|---|---|
| 1 | largeur du panneau `.fiche` | 368,00 CSS (attendu 366 + 2 d'anti-crénelage) | 368,06 | **0,06** | `m15` |
| 2 | hauteur du panneau `.fiche` | 169,19 (mesure-canon) | 168,42 (1920) | 0,77 | `m15` |
| 3 | bas de la barre (filet laiton) | y 51,00..51,67 | y 50,09..51,54 | 0,5 | `m02b` |
| 4 | couleur du filet laiton (canon) | (176,141,62) = `--laiton` **exact** | — | contrôle | `m02b` |
| 5 | ronds du dock — diamètre | 46,0 (CSS) | 45,74 / 45,37 / 45,37 / 45,74 | ≤ 0,63 | `m23` |
| 6 | ronds du dock — centres | 94 / 162 / 230 / 298 | 94,01 / 162,07 / 229,95 / 298,00 | ≤ 0,07 | `m23` |
| 7 | centres des libellés du dock | 93,3 / 161,2 / 229,3 / 297,5 | 93,8 / 162,1 / 230,1 / 298,0 | ≤ 0,9 | `m23` |
| 8 | séparateurs de stats (x) | 140,0 et 251,7 | 140,1 et 250,6 | ≤ 1,1 | `m20` |
| 9 | séparateurs — contraste | L 33-34 sur fond 18-19 | L 32-33 sur fond 16-18 | ≈ 0 | `m20` |
| 10 | centres des 3 cellules de stats | 84,5 / 196,2 / 308,0 | 84,05 / 195,1 / 305,65 | ≤ 2,4 | `m17` |
| 11 | bouton or — largeur | 103,33 | 104,54 | 1,21 | `m21` |
| 12 | bouton or — dégradé haut / bas | (232,196,106) / (203,156,58) | (231,194,102) / (203,157,59) | ≤ 4/255 | `m18` |
| 13 | bordure des boutons « ligne » | L = 62 sur fond 24 | L = 60 sur fond 25 | 2 | `m20` |
| 14 | `--or-vif` sur le titre de fiche | (242,201,107) | (242,201,106) | **1/255** | `m18` |
| 15 | `--creme` sur la 2ᵉ stat | (234,224,200) | (234,224,200) | **0** | `m18` |
| 16 | `--creme-2` sur les libellés de stats | (185,173,146) | (185,173,146) | **0** | `m18` |
| 17 | fond du panneau de fiche (6 sondes) | (15,23,37) → (9,15,25) | (14,22,34) → (8,14,24) | ≤ 3/255 | `m18` |
| 18 | fond de la barre (2 sondes) | (17,24,34) / (21,29,41) | (16,17,31) / (17,24,32) | ≤ 4/255 | `m02b` |
| 19 | filet haut de la fiche | y 426,67, (176,141,62) | y 425,41, (176,141,61) | 1,26 CSS | `m13` |
| 20 | centre du médaillon (x) | 195,83 | 195,83 | **0** | `m09` |
| 21 | hauteur de capitale, valeur aile droite | 10,00 | 10,16 | 0,16 | `m27` |
| 22 | hauteur de capitale, libellé de dock | 6,00 | 6,53 | 0,53 | `m27` |
| 23 | chasse EMPIRE / FAMILLE / PLUS | 35,67 / 40,67 / 23,33 | 37,02 / 41,38 / 23,59 | ≤ 1,35 | `m33` |
| 24 | ligne d'actions — largeur totale | 332,7 | 331,8 | 0,9 | `m20` |
| 25 | padding bas du panneau (actions → bord) | 15,0 | 15,25 | 0,25 | `m16` |
| 26 | bord droit de l'aile droite | 374,7 | 375,3 | 0,6 | `m04` |
| 27 | le filet laiton ne traverse pas le médaillon | intérieur sombre (15..26 L) | intérieur sombre (13..32 L) | — | `m09` |
| 28 | **sens du manomètre** : barycentre du teal / de la braise par rapport au moyeu | teal x = 185,9 · braise x = 209,4 (moyeu 196) | teal x = 182,0 · braise x = 209,5 | même côté | `m36` |
| 29 | **sens de l'aiguille** à « Brûlant » | CSS `rotate(-42)` = 42° à GAUCHE (côté teal) à 37 % | **58,5° à DROITE** de la verticale, pointe à r = 12,9 CSS dans l'arc braise | cohérent avec l'état chaud, **pas d'inversion** | `m36b` |
| 30 | gouttière 1080×2400 : fiche 600,7..769 dans 52..780,9 | — | respectée | — | `m25`,`m28` |
| 31 | gouttière 1080×1920 : fiche 426,5..594,9 dans 52..606,8 | — | respectée | — | `m14`,`m24` |
| 32 | rayon du bouton or (coin bas-gauche) | courbe résolue sur ≈5 CSS (r≈9) | ≈6,5 CSS (r≈9) | comparable | `m21b` |
| 33 | les deux captures 1080×2400 hors bande fiche | — | **1 pixel différent sur 221 760** | — | `m28` |

## B. Grandeurs qui portaient un écart au r3 — la MESURE seulement

| grandeur (id) | mesure |
|---|---|
| F1 — La 2ᵉ ligne du titre de fiche colle au sous-titre  | blanc ligne 2 → sous-titre : **2,18 CSS** (canon titre → sous-titre : **11,00**) ; encre du titre à rel **7,98** CSS du haut du panneau (canon **21,81**, padding CSS 13) ; hauteur du panneau inchangée (168,42 vs 169,19) ⇒ l'espace vient du rythme, pas de la boîte (`m16`) |
| F2 — Le titre remplit la largeur utile au lieu d'être une plaque centrée  | titre L1 x **33,0..360,1** (327,0 CSS) dans une zone de contenu de 332 → **98,5 %** ; canon 124,3..266,0 (**141,7**, soit 42,7 %, 95 CSS de marge de chaque côté) (`m17`) |
| F3 — Le bloc argent est déplacé vers le centre et vient au contact du médaillon | libellé « ARGENT » x **16,3 → 64,2** CSS (**+47,9**) ; barre de ratio x 16,0 → 63,9 (**+47,9**) ; blanc valeur → anneau du médaillon **88,0 → 13,1 CSS** (−85 %) (`m06`,`m28`) |
| F4 — Le montant perd 13,5 % de corps et passe SOUS la valeur de droite  | hauteur de capitale du chiffre : **11,33 → 9,80** CSS (−13,5 %) ; valeur droite **10,00 → 10,16** (+1,6 %) ; rapport gauche/droite **1,133 → 0,965** (le canon impose 17 px à gauche, 15 px à droite, ratio 1,133 — retrouvé exactement) (`m27`) |
| F5 — Le manomètre a changé de nature  | anneau **1,33 → 2,90** CSS (+118 %) ; épaisseur radiale de l'arc teal **2,33 → 5,81** (+149 %) ; rayon externe de l'arc **16,7 → 23,9** (+43 %) ; rapport rayon d'arc / rayon de boîtier **0,52 → 0,70** ; diamètre du boîtier **64,00 → 67,88** (+6,1 %) ; moyeu **3,67 → 4,72** (+29 %) (`m10`,`m12`) |
| F6 — **1080×2400 uniquement** | bande **(34,38,49)** de y **51,5 à 86,5** CSS = **35,0 CSS** (4,0 % de la hauteur d'écran) ; couture à y 86,5 → 87,0 : L **37,9 → 64,6** en une ligne ; l'art occupe **exactement les px 240 à 2159** (1920 rangées), soit 87,1..784,0 CSS, avec **240 px de panneau déclaré en haut ET 240 en bas** — (34,38,49) au-dessus, (33,37,48) en |
| F7 — L'indicateur d'onglet actif du dock est absent  | canon : barre laiton **14,00 × 2,00** CSS, couleur **(176,141,62)** exacte, centrée sur x 94 ; captures : **0 pixel laiton** dans la même fenêtre, aux 3 captures (`m24`) |
| F8 — L'écart libellé → valeur est doublé dans **les deux** ailes ⇒ une seule cause | aile gauche : blanc **4,00 → 9,07** CSS (+127 %) ; aile droite : **3,67 → 7,98** (+117 %) ; conséquence : le libellé droit monte de **4,14** CSS (haut 14,67 → 10,53) et la barre de ratio descend de 2,16 (`m07`) |
| F9 — Le crénage des micro-libellés du bandeau est divisé par ~2 | sur la chaîne **identique** « JOUR » : chasse **26,67 → 21,10** CSS (−20,9 %) ; blanc inter-lettre **3,3 → 1,5** CSS. « ARGENT » : **42,00 → 38,48** (−8,4 %), blanc **3,06 → 1,52**. Les libellés du dock (0,16 em), eux, sont ÉGAUX ⇒ ce n'est pas un effet de police (`m32`,`m33`) |
| F10 — Le crénage des libellés de bouton est **+25 %**, et la graisse est plus lourde | BLANCHIR **68,33 → 74,41** CSS (+8,9 %), AMÉLIORER **78,00 → 85,66** (+9,8 %) ; blanc inter-lettre 2,62/2,75 → **3,27/3,36** ; hauteur de capitale ÉGALE (8,33 → 8,71) ; le « B » à mi-hauteur rend **un seul fût de 6,17 CSS** au lieu de 5,67 + 1,00 ⇒ contre-poinçon fermé (`m29`,`m33`) |
| F11 — La 3ᵉ stat n'utilise pas `--braise`  | canon **(224,102,74)** = `#e0664a` **exact** ; jeu **(255,90,77)** — Δ **(+31, −12, +3)**, R écrêté à 255 ; contraste sur le panneau 5,42:1 → 6,04:1 (`m18`,`m31`) |
| F12 — Hauteur de capitale du titre de fiche +15,7 % (contribue au débordement F1/F2) | **10,67 → 12,34** CSS ; hors tolérance sur les deux critères (> 1 px **et** > 5 %) (`m27`) |
| F13 — La volute décorative **droite** du bandeau est absente (la gauche est couverte par l'assum | canon x 376..390 / y 16..38 : **132 px** d'encre, max L = 82 sur fond L = 23,5 ; captures : **0** pixel au-dessus du fond + 10, aux 3 captures (`m34b`) |
| F14 — Le nom du district est le plus petit texte de l'écran, collé au bord et posé **à cheval su | capitale **5,08** CSS (tous les autres micro-libellés : 6,53) ; x **5,1**..38,8 (aucun autre élément ne descend sous 12 CSS du bord) ; y 87,48..92,56, la couture étant à 87,0 ; contraste **10,36:1** ✓ lisible (`m26`) |
| F15 — Le fond du boîtier du médaillon est moins bleu que la référence | canon (22,31,45) et (18,26,40) ; jeu (18,23,33) — Δ jusqu'à **(4, 8, 12)**, le canal B hors tolérance 6/255 (`m28`) |
