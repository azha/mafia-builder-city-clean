# Grandeurs mesurées au tour r5 (2026-09-06, planches 4ccd806) — ① Le HUD de district

> GRANDEURS et valeurs mesurées au tour précédent — SANS les verdicts (amendement de skill, appliqué à la main). Pour la
> colonne `critère` (`DÉJÀ APPLIQUÉ` / `NOUVEAU`). `script` = repère. ⚠️ Le r5 a mesuré un chrome ×1,19 propre à ces
> planches-là : ses grandeurs de CHROME sont à reprendre telles quelles, pas à supposer.

## A. Grandeurs trouvées ÉGALES au r5

| # | grandeur | canon | capture | Δ | script |
|---|---|---|---|---|---|
| 1 | largeur du panneau `.fiche` | 367,33 CSS | 368,04 | **0,71** | `m26` |
| 2 | hauteur du panneau `.fiche` | 168,33 (mesure-canon 169,19) | 168,41 | **0,08** | `m26`,`m27` |
| 3 | 3 boutons d'action — largeur | 105,33 · 105,33 · 105,33 | 104,53 · 104,53 · 104,90 | ≤ 0,80 | `m29` |
| 4 | 3 boutons — écarts entre eux | 9,00 · 9,00 | 9,07 · 9,07 | 0,07 | `m29` |
| 5 | ligne d'actions — hauteur / largeur totale | 39,67 / 334,00 | 39,56 / 332,11 | 0,11 / 1,89 | `m29` |
| 6 | séparateurs de stats (x) | 140,00 et 251,67 | 140,10 et 250,63 | ≤ 1,04 | `m30` |
| 7 | centres des 3 cellules de stats (libellés) | 83,50 / 195,67 / 307,33 | 84,39 / 194,91 / 306,16 | ≤ 1,17 | `m30` |
| 8 | `--or-vif` sur la 1ʳᵉ valeur de stat | (242,201,107) | (242,201,106) | **1/255** | `m30` |
| 9 | `--creme` sur la 2ᵉ valeur | (234,224,200) | (234,224,200) | **0** | `m30` |
| 10 | `--creme-2` sur les 3 libellés de stats | (185,173,146) | (185,173,146) | **0** | `m30` |
| 11 | `--laiton` du filet HAUT de la fiche | (176,141,62) | (176,141,61) | **1/255** | `m25` |
| 12 | `--or` de la barre de ratio | (217,171,78) | (217,171,77) | **1/255** | `m15` |
| 13 | fond du panneau de fiche, 6 sondes, l'art derrière variant de L 74 à L 174 | (15,22,35)→(9,14,23) | (16,23,34)→(9,15,25) | **≤ 2/255** ⇒ le panneau **n'est pas** plus translucide que le canon | `m34`,`m35` |
| 14 | centre x du médaillon | 195,83 | 195,83 | **0** | `m08` |
| 15 | le filet ne traverse pas le médaillon | s'arrête à l'anneau | s'arrête à l'anneau | — | `m03` |
| 16 | capitale « REVENU(S) » (libellé de stat sans accent) | 6,33 | 6,53 | 0,20 | `m30` |
| 17 | capitale des libellés de bouton (BLANCHIR) | 8,67 | 9,07 | 0,40 (+4,6 %) | `m42` |
| 18 | gouttière 1080×1920 : fiche 409,8..578,2 dans 61,7..604,0 | — | respectée | — | `m45` |
| 19 | contrastes (7 textes du bandeau, 6 de la fiche) | — | 6,43:1 à 13,81:1, **tous ≥ 4,5** | — | `m40` |
| 20 | le dock est un voile dégradé sur l'art (non opaque) | idem canon | L 631→693 CSS : 68→26, **sans variation horizontale mesurable** | — | `m46` |
| 21 | **rayon médian de l'arc, convention du correcteur (centre du BOÎTIER)** | 0,411 (teal) / 0,453 (braise) R | **0,4497 R** | ⇒ **la clôture annoncée de F5-rayon est CONFIRMÉE** | `m22` |
| 22 | **le TÉMOIN ⑥ rend le chrome au canon** : ronds 46,10 / centres 93,83·161,88·229,76·297,81 / pas 68,06 / filet 50,09 / aile droite 375,67 | 46,00 / 94·162·230·298 / 68 / 51,00 / 375,0 | ≤ 0,68 | — | `m10`,`m04`,`m14` |

## B. Grandeurs qui portaient un écart au r5 — la MESURE seulement

| grandeur (id) | mesure |
|---|---|
| B1 — **L'aile droite du bandeau sort de l'écran par la droite, aux deux résolutions.** Le libel | 1080×2400 : libellé x **368,04..392,00 CSS**, valeur x **366,23..392,00** — les deux atteignent la dernière colonne de pixels (x=1079). 1080×1920 : libellé x **368,41..392,00**, valeur **366,23..392,00**, idem. Canon : bord droit de l'aile à **375,0** CSS (mesure-canon 277,05+97,95) ; ma mesure sur la référence **375,3**. Témoin |
| B2 — **Le chrome du shell est rendu ~19 % trop grand sur ① | 8 grandeurs, capture ÷ canon : ronds du dock **54,44/46,00 = 1,184** · pas **80,58/68,00 = 1,185** · chasse EMPIRE **43,92/36,33 = 1,209** · FAMILLE **49,36/41,00 = 1,204** · PLUS **28,67/23,67 = 1,211** · capitale des libellés de dock **7,62/6,33 = 1,204** · barre de ratio **87,84/74,00 = 1,187** · bas du filet **61,70/52,00 =  |
| A1 — **La flèche RETOUR est tronquée par le bord gauche de l'écran**, sans aucune marge. | Encre à **x = 0** ; l'extension verticale du chevron vaut encore **8 px** à x=0 contre **4 px** pour la hampe ⇒ le sommet est hors écran (extrapolation : ~4 px = **1,45 CSS** manquants). Canon : l'élément le plus à gauche du bandeau est la volute à **5,00 CSS**, l'aile gauche à **16,00**. (`m16`,`m17`) |
| F1 — **La tête de fiche s'effondre sur un nom long  | Blanc titre-L2 → sous-titre : bas d'encre **452,61** → haut d'encre **452,98** = **0,37 CSS**. Canon : 457,33 → 468,00 = **10,67 CSS** ⇒ **−96,5 %** (r3 : 2,18). Encre du titre à **7,62 CSS** du haut du panneau contre **18,66** au canon. Hauteur du panneau **inchangée** (168,41 vs 168,33) ⇒ le blanc vient du rythme, pas de la bo |
| M1 — **Le pivot du cadran est du mauvais côté du centre du boîtier**, ce qui pousse le cadran d | Canon : centre du boîtier (587,5 ; 116,5) px, pivot (587,5 ; 130,5) ⇒ pivot **0,147 R EN DESSOUS**. Jeu : centre (539,5 ; 130,0), pivot (539,5 ; 114,0) ⇒ pivot **0,145 R AU-DESSUS**. Écart **0,29 R = 11,7 CSS**. Bande verticale de la valeur : canon −0,225..+0,173 R (centrée sur le centre) ; jeu **+0,136..+0,371 R** (+0,280 R plu |
| M2 — **Le cadran a gardé sa taille absolue pendant que le boîtier grossissait de 26 %**  | Bord intérieur de l'arc : **16,11 CSS (0,506 R)** → **15,82 CSS (0,394 R)**. Aiguille : **15,83 CSS (0,497 R)** → **15,43 CSS (0,385 R)**. Boîtier (nominal) **64,00 → 80,22 CSS** ; au cœur **64,00 → 77,3**. (`m06`,`m08`,`m49`,`m51`) |
| M3 — **Le segment NEUTRE de 27° entre la zone froide et la zone chaude a disparu**  | neutre \ |
| M4 — **L'arc est ~2× plus épais radialement.** | Épaisseur médiane (nominale) : canon **2,50 CSS teal / 2,33 braise = 0,0785 / 0,0733 R** ; jeu **5,90 / 3,99 CSS = 0,147 / 0,0995 R**. À l'angle de l'aiguille : canon **1,49 CSS**, jeu **2,18**. (`m49`,`m51`) |
| M5 — **Le cerclage net du boîtier est devenu un halo flou 2× plus épais, et la lunette intérieu | Profil radial moyen sur 24 rayons. Canon : plat (L≈32) jusqu'à 0,963 R, puis (176,141,62) **net** sur 0,963..1,005 R — nominal **1,33 CSS**, cœur **0,67** ; **lunette** claire à **0,838..0,869 R** (L 32 → **51,6**). Jeu : **aucune lunette** (L plat 16→21 de 0,78 à 0,90 R), puis une rampe orange continue de **0,905 à 1,005 R**, p |
| M6 — **Les deux couleurs de l'arc sont ~45 % plus claires, dans le même sens ⇒ erreur de MODÈLE | Teal canon **(70,103,114)** L=96,7 → jeu **(109,150,155)** L=141,6 (**+46 %**) ; braise canon **(133,71,62)** L=83,5 → jeu **(180,102,89)** L=117,6 (**+41 %**). Contrôle du modèle : le canon est reproduit à **≤ 5/255** par une composition **sRGB** des sources du SVG (`#7fd4d955`, `#e0664a88`) sur le fond du cadran (prédictions ( |
| F8 — **L'écart libellé → valeur du bloc ARGENT est triplé**, et le facteur d'échelle `B2` ne l' | Canon **3,33 CSS** (17,33 → 20,67) ; jeu ① **10,53 CSS** (19,96 → 30,49) ; **témoin ⑥ 9,07 CSS**. `B2` (×1,19) ne prédit que **3,96**. Aile droite : canon **1,33** → jeu **8,71 CSS**. Le témoin, qui est à l'échelle du canon, porte le même défaut ⇒ il est **indépendant de `B2`**. (`m43`,`m42`) |
| F7 — **L'indicateur d'onglet actif du dock est absent.** Rien n'indique où l'on se trouve dans  | Contrôle **négatif** : la sonde **trouve** la barre sur la référence — x **87,00..101,00 CSS** (14,00 de large), y **663,67..665,67** (2,00), couleur **(176,141,62)** exacte. Captures : **0 pixel laiton dans TOUT le dock à 1080×1920** ; à 2400 les 261 px trouvés s'étalent sur x 54,44..330,30 à la hauteur des libellés (encre des  |
| F4 — **Le montant perd 16 % de corps.** | Mesuré sur le **témoin ⑥**, seule planche à l'échelle du canon : chiffre **9,80 CSS** contre **11,33–11,67** au canon ⇒ **−16 %** (valeur identique au r3). Sur ①, 11,98 CSS pour un chrome ×1,19 ⇒ attendu 13,5–13,9 ⇒ **−14 %**. (`m45`,`m47`) |
| F12 — **La capitale du titre de fiche est +15,7 %.** | Canon **10,67 CSS** (médiane de 8 lettres sans accent de « LE VERGE D'OR ») ; jeu **12,34 CSS** (chiffres « 1 » et « 2 » de la 2ᵉ ligne, sans accent ni descendante). Hors tolérance sur les deux critères (> 1 px **et** > 5 %). (`m31`) |
| M7 — **Le fond du cadran est PLAT au lieu d'être un dégradé radial, et plus sombre.** | 4 sondes symétriques à 0,55 R. Canon **(34,44,61) / (26,35,51) / (22,30,45) / (18,26,40)** — amplitude **(16,18,21)**. Jeu **(15,19,29) / (16,20,29) / (15,20,29) / (16,20,30)** — amplitude **(1,1,1)**. Le coin haut-gauche est plus sombre de **(19,25,32)**. (`m46`) |
| M8 — **Le libellé du manomètre frôle la lunette.** | Coin du libellé à **0,846 R** du centre du boîtier, bord intérieur de l'anneau à **0,918 R** ⇒ **0,072 R = 2,9 CSS** de dégagement. Canon (« HEAT ») : coin à **0,614 R**, anneau intérieur à **0,958 R** ⇒ **0,344 R = 11,0 CSS**. (`m33`,`m52`) |
| F10 — **Le crénage des libellés de bouton est +8,9 % et le blanc inter-lettre +22 %.** | BLANCHIR : chasse canon **68,33** → jeu **74,41 CSS** (+8,9 %) ; blanc médian **2,67 → 3,27 CSS** ; capitale 8,67 → 9,07 (+4,6 %, **dans** la tolérance). (`m42`) |
| F14 — **Le nom de district tombe à 2,00:1 sur le ciel** | Encre **(234,224,200)**, ciel **(146,161,180)** ⇒ **2,00:1**. Contour le plus sombre **(0,0,0)** ⇒ encre/contour **15,99:1**, contour/ciel **7,98:1**. Capitale **5,44 CSS** = le plus petit texte de l'écran (libellés du dock : 7,62). Marge gauche **6,53 CSS**. Au r3 il valait 10,36:1 — il est passé de la bande sombre (y 87,5) au  |
| F13 — **Les DEUX volutes décoratives du bandeau sont absentes** (le r3 ne relevait que la droite | Contrôle **négatif** : la sonde trouve **524 px** (gauche, x 5,00..27,67 CSS, y 20,33..28,33) et **544 px** (droite, x 363,67..387,00) sur la référence. Sur les 3 planches ① : **0 pixel** dans la fenêtre gauche ; les 110 px trouvés dans la fenêtre droite sont l'encre du « JOUR » qui déborde (y 18,15..21,05), pas une volute. L'as |
| F6 — **1080×2400 uniquement**  | Haut **(34,38,49)** de **61,70 à 87,11 CSS = 25,41 CSS** (2,9 % de la hauteur d'écran) ; bas **(31,35,46)** de **784,00 à 871,0 = 87,0 CSS** (10,0 %) mais **occupée par le dock** (ronds 785,6..840,1) donc non nue. L'art natif occupe exactement 87,11..784,00. La bande haute a **rétréci** (35,0 → 25,4) uniquement parce que le file |
| M9 — **La fiche est posée 17,9 CSS trop haut** (sa hauteur, elle, est juste). | Panneau : jeu **409,79..578,20 CSS**, canon **427,67..596,00**. Hauteur **168,41 vs 168,33** (ÉGAL) ; position **−17,88 CSS** en haut, **−17,80** en bas. Écart fiche→dock : canon ~12 CSS, jeu **25,8 CSS**. Gouttière respectée. (`m26`,`m27`,`m45`) |
| M10 — **La barre de ratio est 27 % plus épaisse** | Canon **2,00 CSS** (CSS `.ratio{height:2px}`, mesuré 2,00) ; jeu **2,54 CSS**. `B2` prédirait 2,38. (`m43`,`m15`) |
