# Grandeurs mesurées au tour r2 (2026-09-06, planches d6c851d, PRÉ-Bold) — ③ La Carte de Brennar

> GRANDEURS et valeurs mesurées au tour précédent — SANS les verdicts. Pour la colonne `critère` (`DÉJÀ APPLIQUÉ` / `NOUVEAU`).
> `script` = repère du r2 (ses scripts ne sont PAS fournis). Convention du r2 : angle 0° = horizontale, positif = HORAIRE ; bord =
> mi-alpha nominal ; recalage `cap = 1,0220 × ref + (−12 ; +8)`. ⚠️ Planches du r2 ANTÉRIEURES à la vraie Bold (TD-615) : le « trait
> ×1,41 » de M1 n'est pas comparable à un fût post-Bold.

## A. Grandeurs trouvées ÉGALES au r2 (contrôle positif du r2, verbatim)

| # | grandeur | référence | jeu | écart | script |
|---|---|---|---|---|---|
| C1 | résidu de la peinture, 2 170 cellules de 30×30 | — | — | **médiane 2,0/255** par canal max ; p90 44 (dominé par le disque or, ASSUMÉ) | `m07` |
| C2 | isotropie du cadrage — un seul facteur pour les deux axes | — | s = **1,0220** | anisotropie ±0,5 % : coût 16,0 → 20,0/20,2 ⇒ **aucun étirement** | `m06` |
| C3 | cadrage horizontal | ref x 0..1079 | ref x **11,7..1067,5** | 11,7 px perdus à gauche, 11,5 à droite = **97,76 %** visible | `m06`,`m20` |
| C4 | cadrage vertical | contenu ref 219..2084 | ref **219,2..2081,2** | **99,84 %** visible | `m06`,`m20` |
| C5 | fleuve, médiane 41×41 en ref (760,1100) | (24, 65, 83) | (24, 65, 82) | **1/255** | `m20` |
| C6 | 3 quartiers SANS lavis (LE TREILLIS, SARNES, DÉPÔT-EST) | — | — | Δ **(1,0,−1) · (−2,0,−1) · (0,1,0)** | `m24` |
| C7 | route or, point homologue ref x=200 | pic (136,119,81), 19 px à mi-alpha | pic (136,119,82), **19 px** | 1/255 sur la couleur, 0 px sur la largeur | `m20`,`m21` |
| C8 | rose des vents, bras nord sur l'axe | ref y 534..619 | attendu 553,8..640,6 → mesuré **555..639** | ≤ 1,6 px ; **le bras n'est plus recouvert** (F5 du r1) | `m20` |
| C9 | les 18 noms de quartier | 18 | **18** | français, accents justes (DÉPÔT-EST, LES ENTREPÔTS, LA LISIÈRE, MARNE-BASSE), **0 slug, 0 troncature, 0 mot anglais** | `m10`,`z_txt_*` |
| C10 | angle des 18 noms vs la SOURCE d'auteur | −10/−7/0/+3/+7/+18 | — | **médiane +0,07°, max \|1,37°\|** ; amplitude **28,21°** contre 28° | `m27` |
| C11 | angle jeu − maquette (17 comparables) | — | — | **médiane −0,02°, max \|0,73°\|** | `m27` |
| C12 | hauteur de capitale, 14 mots propres | méd. 17 px | méd. 17 px | **rapport 1,000** (F3 du r1 refermé) | `m27` |
| C13 | contraste encre/peinture, 6 mots | 5,49 à 9,65:1 | **6,98 à 7,78:1** | tous ≥ **5,34:1**, plancher de doctrine 4,5:1 (F2 refermé) | `m17` |
| C14 | gouttière | — | contenu **232..2151** | bandeau uni jusqu'à 231, dock à partir de 2152 : rien dessous | `m20` |
| C15 | rognage des noms | — | marge min. **56 px** à gauche, **85 px** à droite | aucun nom coupé, aucun hors cadre | `m20` |
| C16 | couche globale, zones d'ÉTAT masquées | L moy **35,41**, p90 60,2, densité L>110 1,83 % | L moy **35,29**, p90 57,1, **2,05 %** | Δ **0,12 L** ⇒ tout l'écart global vient des formes ASSUMÉ | `m23` |
| C17 | bande de légende du r1 (F6) | absente en maquette | **0 px** de chacune des 3 pastilles (242,189,49)/(61,178,86)/(209,66,66) | retirée | `m24` |
| C18 | animation dans le contenu | — | **1 px** de différence sur 232..2135 entre les deux planches du run | l'horloge du monde a avancé (JOUR 50 → 51) entre les deux : la carte n'a pas bougé | `m01`,`m02` |
| C19 | « LE THRENNY », peint DANS la texture — contrôle de tous mes instruments | h 18,8 px, trait 2,84 px, profil radial base 61,2 | h 18,9 px, trait 2,76 px, base 60,8 | **+0,5 % / −2,8 %** ; delta de luminance médian **−0,22 L** (p05 −2,66, p95 +1,28) | `m16`,`m19b`,`m25` |

## B. Grandeurs à ÉCART au r2 — la mesure seule, sans la classe

| id r2 | ce qui a été mesuré | mesure du r2 |
|---|---|---|
| M1 | Famille de caractères des noms : romaine à empattements → linéale | Épaisseur de trait (segment horizontal moyen d'encre, bande 35–62 % de la capitale, à capitale égale) : **REF 2,26 px → JEU 3,19 px, ×1,41**. **Contrôle positif** « LE THRENNY » (mêmes glyphes des deux côtés) : 2,84 / 2,76 px, **bruit 2,8 %** ⇒ l'instrument discrimine (signal +41 %). La médiane du jeu inclut une ligne contaminée (LA COLONNE, hauteur d'encre 49 px : la fenêtre a ramassé autre chose) qui la tire vers le BAS ⇒ le +41 % est un plancher. Preuve visuelle `z_halo_LETREILLIS_{ref,cap}.png`, `z_nom_SAINTBRAND.png`. (`m19`, `m19b`) |
| M2 | L'interlettrage de la maquette (0,24 em) n'est pas appliqué | Écart inter-lettres médian : **REF 8,0 px → JEU 4,0 px**. Largeur d'encre jeu/maquette sur les 11 mots où les deux côtés sont complets : **médiane 0,788** (0,762 à 0,859). Avance par caractère : **REF 22,0 px → JEU 17,2 px, Δ 4,62 px** ; l'interlettrage déclaré vaut à lui seul `0,24 × 6,6 × 3,6 =` **5,70 px** ⇒ la perte de chasse s'explique **entièrement** par le tracking manquant, la chasse propre des glyphes ne différant que de ~1 px. (`m18` §C, `m27`) |
| M3 | Le traitement autour du nom a le signe INVERSÉ. La maquette assombrit la peinture autour de chaque lettre (`paint-order:stroke`, `stroke:#080d14`, `wi | Profil radial de luminance autour de l'encre. **Deux grandeurs distinctes, je ne les mélange pas.** **(A) chaque image contre SA propre peinture lointaine** (`m16`) : maquette **−10 à −20 L** de d = 1 à d = 4, retour à la ligne de base à d ≈ 5-6 ; jeu **+13,6 à +29,6 L à d = 1** (médiane **+17,7**), retour à d ≈ 8. **(B) jeu − maquette aux mêmes points de la peinture** (`m25`, ce qu'un œil voit, les deux effets cumulés) : **+23,7 à +36,1 L à d = 1** (médiane **+26**), mi-pic à d = 2-3, éteint à d ≥ 8 ; peinture éclaircie de plus de 5 L : **33 494 px** sur 8 noms. **Contrôle positif** « LE THRENNY » sur (B) : delta médian **−0,22 L** (p05 −2,66, p95 +1,28). **Contrôle négatif** (encre synthétique dans le fleuve, peinture plate) : amplitude **1,04 / 1,43 L** ⇒ la machinerie de distance n'invente pas de cloche. (`m16`, `m17`, `m25`) |
| m1 | L'encre du nom est 23 L plus sombre qu'en maquette (et plus chaude) | Encre médiane des 18 mots : **REF (204, 196, 174), r−b 29** (étendue 25..39) → **JEU (185, 173, 146), r−b 39** (étendue 39..39, valeur **identique sur les 18**). Luminance **196,1 → 173,6, Δ −22,5 L (−11,5 %)**. Le contraste reste au-dessus du plancher (C13). (`m13`, `m27`) |
| m2 | Les noms sont posés systématiquement plus bas qu'en maquette | Centroïde d'encre ramené dans le repère de la maquette, 13 mots : **dy médian +7,5 px** (étendue +5,4 à +10,8), **13/13 du même signe** ; dx médian −2,7 px (−10,6 à +7,8), signe partagé. Le r1 mesurait +8,4. 7,5 px = 44 % d'une hauteur de capitale. **Hors** de la tolérance de 2 px du mandat, **dans** celle de 1,5 % du parent (16 px) — c'est sa constance, pas son amplitude, qui en fait un écart. (`m18` §B) |
| m3 | La pastille « Chaleur : affichée » est peinte hors de la palette de l'écran : encre blanc pur sur une plaque grise neutre, angles vifs, sans bord | **124 px exactement (255,255,255)** dans la zone de contenu, tous dans x 43..160 / y 2116..2125 ; **0 px** dans la maquette. Plaque **x 13..190, y 2106..2135 = 178 × 30 px**, fond **(56, 61, 75)** (L = 60,9), **angles vifs** (rangée pleine dès y = 2106, 0 trou sur 178 px), **aucun liseré** (x = 12 rend (3,4,5)), **bas affleurant** le bas du contenu (2135). Amas le plus clair de tout le balayage « en trop » : **+48,4 L** (le suivant est un halo de nom, +26,6). (`m22`, `m26`, `m28`) |
| m4 | Le petit drapeau rouge de LES BASSINS (`g.pin-esc` de la maquette) est absent | Pixels de la teinte `#e0664a` dans la fenêtre ref (238,340)-(292,404) : **784 → 0**. Contrôles positifs du même filtre : route or 237/230 px, fleuve 1011/939 px ⇒ le filtre attrape bien sa teinte des deux côtés. (`m23`) |

## C. Les 18 angles au r2 (source · maquette · jeu), en degrés — pour la colonne `réf`

| quartier | source | maquette | jeu |
|---|---|---|---|
| LES BASSINS | −10 | −10,15 | −9,96 |
| QUAI-NORD | −10 | −10,25 | −9,96 |
| SARNES | −10 | −10,00 | −9,47 |
| LA COLONNE | +3 | +3,12 | +3,50 |
| HAUTES-MARCHES | +3 | +3,42 | +3,40 |
| VERRIER | +3 | +3,06 | +2,63 |
| SAINT-BRAND | +3 | +3,14 | +3,09 |
| LES ENTREPÔTS | +7 | +6,95 | +6,79 |
| DÉPÔT-EST | +7 | +7,07 | +7,06 |
| LE TREILLIS | 0 | +0,28 | −0,10 |
| MARNE-BASSE | 0 | +0,20 | +0,48 |
| LE VERRE | +18 | +17,67 | +17,50 |
| ORSEL | 0 | +0,84 | +0,11 |
| PLACE DES COMPTES | +18 | +18,18 | +17,93 |
| LA LISIÈRE | −7 | *(non isolable)* | −5,63 |
| LA CHANCELLERIE | +18 | +18,16 | +18,25 |
| LES FRICHES | −7 | −6,89 | −6,90 |
| PONT-GRIS | −7 | −7,02 | −7,21 |

## D. Ce que le r2 n'avait PAS pu vérifier (résumé, sans verdict)

- une seule résolution ; la carte « hors chrome » n'existait pas ; police du jeu non nommée (épaisseur seule discriminante) ;
- la chaleur : rien sur la carte ne l'encode (lot d'états vs données Libre) ; libellé plus long que « PLACE DES COMPTES » ; états d'interaction.
