# Grandeurs mesurées au tour r9 — ㊲ La réputation

> Liste des GRANDEURS et de leurs valeurs mesurées à ce tour — SANS les verdicts, gravités ni classements (amendement
> de skill soumis à l'user le 2026-09-06, appliqué à la main). Sert à remplir la colonne `critère` (`DÉJÀ APPLIQUÉ` = la
> grandeur figurait ici · `NOUVEAU` = tu l'as introduite). La colonne `script` est un repère, pas une invitation à l'ouvrir.
> ⚠️ Le r9 a jugé une planche ANTÉRIEURE (2026-09-04, compte `operational_demo`, avant recapture) : les valeurs de CONTENU ne sont pas comparables ; les grandeurs de FORME le sont.

## A. Grandeurs trouvées ÉGALES au r9

| # | grandeur | référence | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet `.cerne` à filet `.cerne` | 1626 px | 1626 px | **0 px** (m01) |
| 2 | largeur de la carte portrait `.prt` (118 CSS voulu) | 424 px | 425 px | +1 px (m02) |
| 3 | gouttière `.mir6` entre la carte et les tuiles (10 CSS voulu) | 37 px | 37 px | 0 px (m02/m05) |
| 4 | largeur des 3 fenêtres `.fen` / écart entre elles | 312·312·312 / 22 px | 315·314·315 / 22 px | ≤ 3 px (m18d) |
| 5 | bloc `.enseigne` (haut → filet or) / bloc `.compteurs` | 188 / 113 px | 183 / 115 px | −5 / +2 px (m03) |
| 6 | titre « Le miroir » — encre h × l | 47 × 415 | 46 × 421 | −2,1 % / +1,4 % (m07) |
| 7 | chiffres `.fen b` — hauteur d'encre | 41 px | 41 px | **0 px** (m08) |
| 8 | « RÈGLES DONNÉES » / « ABSORBÉES » / « ENFREINTES » — h × l | 18×233 · 18×154 · 15×160 | 19×234 · 19×153 · 15×159 | ≤ 1 px (m08) |
| 9 | `.tl b` « manches basses » / `.tl small` « la justice… » | 21×242 / 19×246 | 21×245 / 19×245 | ≤ 3 px (m09) |
| 10 | `.pann i` / `.pann b` « Rien n'a encore déteint » | 19×586 / 39×613 | 19×591 / 38×621 | ≤ 8 px (m09) |
| 11 | texte du CTA / `.prt b` « Il vous écoute » | 29×611 / 26×239 | 29×607 / 26×247 | ≤ 8 px (m09/m18) |
| 12 | pastilles `.lum` : allumée / éteinte (7 CSS voulu) | — / 26 px | 24 / 26 px | (m16) |
| 13 | couleurs d'encre (8 jetons : muet, cyan, crème, crème2, éteint, vert, or_vif, or_filet) | jetons exacts | **identiques ou ±1/255** | (m08/m09/m16) |
| 14 | aplats : `.cta6` · `.prt`/`.pann`/`.tl OFF` · `.elast` | #16191b · #111823 · #0b0d0d | #16161c · #0d1622 · #0d0d0d | ≤ 4/255 (m13) |
| 15 | couverture de palette, 12 jetons | — | — | **≤ 0,4 point** partout (m20b) |
| 16 | luminance moyenne / densité d'encre de la zone de contenu | 31,94 / 8,12 % | 31,10 / 8,19 % | −2,6 % / +0,9 % (m18e) |
| 17 | rythme vertical du cadre (6 frontières, ramenées au haut du cadre) | — | — | **≤ 13 px sur 1626** (m03) |
| 18 | épaisseur de la ligne de balayage (2 CSS voulu) | 8 px | 7 px | −1 px (m15) |
| 19 | position de la montre dans le buste (SVG : unités 50−31 ⇒ +106 px) | absente (#120) | **+105,5 px** | +0,5 px (m25) |
| 20 | inventaire : 3 compteurs · 4 tuiles · 1 carte portrait · 1 panneau · 1 CTA | 3·4·1·1·1 | 3·4·1·1·1 | **rien en trop, rien d'absent** |
| 21 | accord buste ↔ tuiles (col étroit + montre + pas de manchettes + gants sombres) | — | **4/4 cohérents** | (m25/m26) |
| 22 | gouttière : dernière encre du chrome haut / première encre du dock | — | 230 (cadre à 250) / 2179 (cadre à 1876) | **aucun chevauchement** (m19a) |
| ce que montre la capture | cadre d'origine |
| compteur « 00 RÈGLES DONNÉES », verdict gris « Pas encore jugeable », portrait vert « Il vous écoute », panneau bas « « pas jugeable » n'est pas « moyen » / Rien n'a encore déteint », CTA « DONNER UNE **PREMIÈRE** RÈGLE » | **#120** (vierge) |
| « 02/4 ABSORBÉES », tuiles « col boutonné » et « montre visible » ALLUMÉES, col étroit et montre dorée sur le buste | **#119** (garni) |
| sous-titre « PERSONNE NE VOUS A ENCORE JUGÉ » | **aucun** (0 occurrence dans `ecrans-brennar-6.html`, `generateur-reputation.py`, `chassis6.py`) |

## B. Grandeurs qui portaient un écart au r9 — la MESURE seulement (pas la classe)

| grandeur (id) | mesure |
|---|---|
| F1 — le paragraphe du panneau bas nie les voyants que l'écran affiche  | tuiles 1 et 3 : bord `#b08d3d` (voulu `#b08d3e`), fond `#16161c` (voulu `#16191b`), pastille or_vif 24 px — état `.tl.on` sans ambiguïté (m16). Panneau bas : copie **verbatim** du cadre #120, dont le compteur canonique est `00/4`. Aucun des 6 cadres du groupe ne combine « 00 règles données » et « 02 absorbées » |
| F2 — le buste est hors de l'axe de sa carte  | centre du remplissage du visage **272,5** ; centre du torse+chapeau **273,0** ; centre du col **273,0** — trois masques indépendants. Axe des textes de la carte : **284,0 / 284,5**. Écart **−11,7 px = −3,2 CSS**. En RÉFÉRENCE la même comparaison donne **+0,7 px** (m12/m21) |
| F3 — le sous-titre `.enseigne i` est rendu ~29 % plus haut, avec un interlettrage compensatoire | hauteur de capitale sur une portion **sans accent ni apostrophe** : RÉF « UN LIEUTENANT » **17 px (4,72 CSS)** / JEU « PERSONNE…ENCORE » **22 px (6,11 CSS)** = **+29,4 %**. Avance moyenne par caractère quasi identique : 23,48 / 23,83 px. Contrôle positif sur chaîne **identique** (« RÈGLES DONNÉES ») : 18 / 19 px, +5,6 % (m24) |
| F4 — interligne des blocs multi-lignes systématiquement 12 à 17 % plus serré, à taille de glyph | `.pann small` : pas de ligne **33 → 27,5 px** (−17 %), runs d'encre 24 px des deux côtés · `.prt i` : pas **27 → 23 px** (−15 %) · `.tl` : hauteur de tuile **101 → 93 px** (−7,9 %) pour des glyphes à 21 et 19 px identiques, l'écart tenant entièrement dans les 3 respirations internes (−2 / −2 / −4 px) (m04/m18b) |
| F5 — le halo de la pastille allumée (`box-shadow:0 0 7px #f2c96b99`) est absent | écart moyen au fond de tuile, par rayon. Témoin #119 : **+39,8** à 4,0 CSS, **+23,0** à 5,0 CSS, **+16,1** à 6,0 CSS, +8,7 à 7,3 CSS. Capture : **+7,9** à 3,9 CSS puis **+0,0** dès 5,0 CSS. Contrôle positif r=0 : **+220,0 des deux côtés** (m17a) |
| F6 — la ligne de balayage cyan est 1,2 à 1,6 × plus forte, et ses extrémités ne s'éteignent plu | profil horizontal, score (G+B−2R), 18 points de x=52 à x=1024. Pic : **85 → 101** (×1,19). Extrémité gauche : **31 → 50** (×1,61). Extrémité droite : **3 → 10** (×3,3). Épaisseur inchangée (8 → 7 px = 2 CSS) (m15/m19b) |
| F7 — le cadre est épinglé en haut  | bas du cadre **1876** ; première encre du dock **2179** ; dernière encre du chrome haut **230** ; haut du cadre **250**. 303 px = **12,6 % de la hauteur de l'écran** (m19a) |
| F8 — le vide sous la 4ᵉ tuile passe de 21,8 % à 31,2 % de la hauteur du panneau élastique | RÉF : tuiles 1000..1446, `.elast` 848..1613 ⇒ vide **167 px (21,8 %)**. JEU : tuiles 766..1180, `.elast` 642..1424 ⇒ vide **244 px (31,2 %)**. Distance dernière tuile → bas de la carte portrait : **86 → 144 px** (m21) |
| F9 — proportions du buste  | ligne la plus large du remplissage peau : **126 → 138 px** (+9,5 %) ; diamètre extérieur trait compris **148 → 157 px** ; trait sombre **11,0 → 9,5 px** par côté. Dessin entier (sommet du chapeau → bas du torse) **377 → 371 px**. Rapport visage/torse **0,468 → 0,498** (+6,4 %). Gants : **48×30 → 55×36 px** et à **−97** au lieu d |
| F10 — la colonne de droite est 19 px plus large et 9 px plus à gauche (padding de `.elast` mesur | tuiles : RÉF x 542..997 (**455 px**) / JEU x 533..1007 (**474 px**). Padding `.elast` : 30 px des deux côtés en RÉF, **23 px** en JEU. `.verdict span` : hauteur d'encre **76 → 49 px** (3 lignes → 2) (m05/m17b) |
| F11 — le fond du cadre est un dégradé **monotone** ; la maquette a une taille sombre au milieu e | luminance dans la gouttière gauche, par 10 % de la hauteur du cadre. RÉF : 22·21·20·19·18·**16**·15·15·**17**·18·18. JEU : 22·21·21·21·20·19·19·19·18·17·**17** (m20a) |
| F12 — le sous-titre affiché n'est **aucune** des six lignes du groupe, et il change de sujet  | `grep -c -i "personne ne vous a encore"` sur `ecrans-brennar-6.html`, `generateur-reputation.py`, `chassis6.py` ⇒ **0 / 0 / 0**. Les six lignes canoniques : « ce qu'il a pris de vous se voit sur lui », « un lieutenant neuf n'a encore rien absorbé », « vous vous écartez de vos propres règles », « les règles que vous avez données  |
| F13 — le bouton CTA est 7 px plus bas de hauteur, texte identique | filet or extérieur : RÉF 1952..2046 = **95 px** ; JEU 1757..1844 = **88 px** (−7,4 %). Encre du libellé identique : 29 × 611 / 29 × 607 (m01/m09) |
