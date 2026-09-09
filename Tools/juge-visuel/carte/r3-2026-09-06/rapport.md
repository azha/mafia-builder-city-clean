# Juge visuel ⊥ — ③ La Carte de Brennar — r3 — 2026-09-06

## Verdict : **NON APPROUVÉ**

Le lettrage a fait un bond — famille, graisse, interlettrage et inclinaison sont désormais
conformes au canon — mais le **traitement autour des lettres a toujours le signe inversé**
(le canon creuse la peinture, le jeu l'éclaire), **les quatre pastilles du dock sont vides**,
et **à 1080×1920 la carte est dessinée plein cadre** : le bandeau mange « LE PORT » et le dock
mange les trois noms de la rangée basse.

Planches jugées (sha256 vérifiés contre le dossier) :
`capture-1080x2400.png` `50af1fc7…` · `capture-1080x1920.png` `2fe413da…` ·
`capture-hors-chrome-1080x2400.png` `94911199…` · `reference-1080x2102.png` `23896ee4…`

---

## Conventions déclarées (avant toute mesure)

| | convention |
|---|---|
| **repère** | image, x vers la droite, y vers le bas, origine coin haut-gauche |
| **ANGLE** | **0° = horizontale ; positif = HORAIRE à l'écran** — même sens que `rotate(+n)` du SVG source. Estimateur : angle qui rend le profil d'encre **perpendiculaire** le plus concentré (pas de 0,05°), pas l'axe principal du nuage (celui-ci dérive sur les mots courts). Le **résidu** imprimé est l'écart-type des distances à la ligne de base retenue. |
| **BORD (segmentation)** | **mi-alpha** : `T = (fond + plateau)/2`, fond = médiane de L sur la fenêtre, plateau = p99,5 de L parmi les pixels « chauds ». Le seuil s'adapte donc au voile de bas de maquette et à la différence de clarté de l'encre ⇒ les deux masques sont comparables. |
| **BORD (épaisseur de trait)** | **mi-hauteur LOCALE** : base = médiane de L à 4–6 px de part et d'autre du segment, sommet = pic du segment, bord par interpolation linéaire. *C'est la seule convention comparable ici* : la base locale de la maquette est son **contour sombre**, celle du jeu son **halo clair**. Une convention à base lointaine compte le halo du jeu comme de l'encre et gonfle son trait de +53 % — artefact vérifié (`m21`) puis écarté (`m33`). |
| **pixel d'encre de nom** | `R≥G≥B` et `5 ≤ R−B ≤ 75` — exclut les lampes or (`R−B=135`), les tours blanc-bleu (`R−B<0`), le disque « VOUS ÊTES ICI » (or). Complété par le **retrait des segments horizontaux > 25 px** (la route or fait 100 à 300 px ; la plus longue barre de glyphe, celle du T, fait ~14 px à une capitale de 17). |
| **RECALAGE** | `capture = s·référence + (tx, ty)`, **s = 1,02215 · tx = −11,94 · ty = +8,17**, obtenu par **deux chemins indépendants** (échantillonnage ponctuel `m05`/`m06`, resampling PIL `m06`) qui rendent `1,02216 / −11,98 / +8,14` et `1,02214 / −11,89 / +8,20`. |

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | maquette | jeu | écart | script |
|---|---|---|---|---|---|
| C1 | recalage, deux chemins indépendants | — | s=1,02216 / 1,02214 · tx=−11,98 / −11,89 · ty=+8,14 / +8,20 | **concordance 0,1 px** | `m05`,`m06` |
| C2 | isotropie du cadrage | — | anisotropie ±0,4 % : coût 0,26 → 0,43/0,44 | **aucun étirement** | `m06` |
| C3 | résidu global au recalage retenu (1 872 000 px) | — | — | **médiane 2/255**, p75 8, p90 53 (dominé par la couche d'ÉTAT) | `m06` |
| C4 | « LE THRENNY » (peint DANS la texture) — centre d'encre | (541,7 ; 1137,1) | ramené (541,8 ; 1138,2) | **dx +0,14 · dy +1,04 px** ; chemin par profils : +0,00 / +1,00 | `m18` |
| C5 | « LE THRENNY » — hauteur de capitale / largeur | 17,0 px / 227,0 | 17,0 px / 232,0 | rapport largeur **1,0220** (attendu s = 1,0221) | `m17` |
| C6 | « LE THRENNY » — épaisseur de trait (mi-hauteur locale) | 2,405 px | 2,458 px | rapport **1,0221** = s **exactement** | `m33` |
| C7 | « LE THRENNY » — couleur d'encre | (166, 201, 212) | (165, 199, 213) | **≤ 2/255** | `m17` |
| C8 | « LE THRENNY » — profil radial à d=1 | −20,5 L | −18,9 L | **le contour sombre est reproduit par la texture** | `m16` |
| C9 | **18 inclinaisons** vs la source d'auteur | −10 / −7 / 0 / +3 / +7 / +18 | — | **médiane −0,07°, max \|0,35°\|** ; jeu − maquette médiane −0,10°, max \|0,95°\| (LA LISIÈRE, état or) | `m19` |
| C10 | contrôle **négatif** d'angle : la même fenêtre tournée de +3,00° | — | mesuré **+3,05°** | l'instrument discrimine | `m19` |
| C11 | fleuve, médiane 41×41 en réf (760, 1100) | (24, 65, 83) | (24, 65, 82) | **1/255** | `m30` |
| C12 | point homologue de la route or, réf (200, 662) | (29, 37, 56) | (30, 37, 57) | **1/255** | `m30` |
| C13 | couche globale (zones ASSUMÉ masquées, 176 971 échantillons) | L moy **34,45**, p90 56,6, densité L>110 **2,16 %** | L moy **34,69**, p90 54,7, **2,04 %** | **Δ 0,24 L** | `m30` |
| C14 | avance par caractère des noms | — | rapport jeu/maquette médian **1,0131** (attendu 1,0221) | **−0,9 %** — l'interlettrage est revenu | `m20` |
| C15 | hauteur de capitale des noms (12 mots sans accent) | — | rapport **1,0404** (attendu 1,0221) | **+1,8 %**, dans la tolérance de 5 % | `m33` |
| C16 | graisse des noms **à capitale égale** | — | **×1,026** | +2,6 % | `m33` |
| C17 | contraste encre/peinture des 18 noms (WCAG, art réel) | min 4,54 méd 7,94 | min **6,59** méd **7,12** | tous **≥ 6,59:1**, plancher de doctrine 4,5:1 | `m30` |
| C18 | cadrage horizontal | réf x 0..1079 | réf 0 → −11,9 ; réf 1079 → 1091,0 | **97,8 % visible**, perte symétrique 11,9 / 11,0 px | `m07` |
| C19 | cadrage vertical | contenu réf 219..2101 | 232,0 .. 2155,7, coupé à 2151 | **99,77 % visible** ; réf y=219 → cap y=**232,0**, le haut du contenu tombe pile | `m07` |
| C20 | gouttière à 1080×2400 | — | contenu **232..2151** (rect exact, lignes uniformes au-dessus et au-dessous) ; bandeau 0..203 ; dock ≥ 2179 | **rien sous le chrome** | `m02`,`m03` |
| C21 | rognage des noms | — | marge minimale **24 px** à gauche (LA CHANCELLERIE) ; aucun nom coupé (la seule marge droite basse, 4 px sur LA LISIÈRE, est un pixel chaud isolé de la peinture : la découpe `vues/zoom_LALISIERE_bord.png` montre le dernier « E » se terminant vers x≈1002, soit ~78 px de marge) | — | `m35` |
| C22 | balayage « en trop / absent » : 805 cellules de 20×20 au résidu p70 > 40/255 | — | **28 amas, tous expliqués** : couche d'ÉTAT (6 écussons, 2 nappes, disque or, drapeau), légende, pastille « Chaleur », halo des noms | **0 quartier manquant, 0 marqueur en trop, 0 déplacement** | `m34` |
| C23 | chrome — géométrie contre le canon HUD (CSS-HUD) | filet à **50,67** ; médaillon Ø **~63**, centre **~38** ; barre-ratio **74,3** ; pastilles Ø **45,7**, pas **68,0**, 1ʳᵉ à x **71,0** | filet **51,18** (CSS `.barre{height:52px}`) ; médaillon **6,2..72,6 = Ø 66,4**, centre **39,4** (CSS `top:7px; 64px` ⇒ 7..71, centre 39) ; barre **74,7** (CSS `width:74px`) ; pastilles Ø **44,6**, pas **67,9**, 1ʳᵉ à x **71,5** | **tout dans 1,5 CSS** | `m23`,`m24`,`m26`,`m27` |
| C24 | chrome — couleurs | or vif money (242,201,107) ; barre (217,171,78) ; encre de libellé (185,173,146) | (242,201,**106**) ; (217,171,**77**) ; (185,173,146) | **≤ 1/255** | `m23` |
| C25 | les deux planches 2400 (sous chrome / hors chrome) dans 232..2151 | — | **écart max 3/255**, 596 px non nuls sur 2 073 600 (0,03 %) | la planche « hors chrome » est bien la même carte ; le monde n'a pas bougé entre 17:08 et 17:15 | `m03` |
| C27 | **sens de l'aiguille du manomètre** (piège documenté au socle) | arc froid à gauche, arc chaud à droite | **idem** : arc cyan médiane **−34,2°**, arc braise médiane **+44,2°** (0° = vers le haut, positif = horaire) ; **aiguille du jeu : médiane +62,4°, p10 +58,0 / p90 +69,0** — lobe unique **du côté CHAUD**, en accord avec « Brûlant » | **aucune inversion** | `m36` |
| C26 | 18 noms de quartier, **à 1080×2400** | 18 | **18**, français, accents justes (DÉPÔT-EST, LES ENTREPÔTS, LA LISIÈRE, MARNE-BASSE), **0 slug, 0 troncature, 0 mot anglais** | — | `vues/planche_noms_*` |

---

## 0. L'écran, tel que la maquette le dit

**Le but.** C'est la carte-mère du jeu : la ville de nuit, peinte à la main, où l'on vient
*regarder* avant d'agir — voir où ça chauffe, où l'on est chez soi, et approcher un quartier.
C'est le premier écran du jeu (ruling user 2026-08-26) ; il doit donner l'impression d'une
**carte d'état-major** posée sur une table, pas d'une interface.

**L'ordre de lecture.** (1) Le **fleuve** — la seule grande masse claire (L=65 contre 33 partout
ailleurs) coupe l'image en deux rives et impose la géographie avant tout le reste ; (2) les
**écussons rouges numérotés** et le **disque or « VOUS ÊTES ICI »** — les seuls objets saturés
et hauts en contraste, ils disent où regarder ; (3) les **18 noms de quartier**, un lettrage
sérif crème, très interlettré, incliné pour épouser la trame des rues ; (4) le **chrome** —
argent à gauche, médaillon de chaleur au centre, jour à droite.

**Les zones.** Bandeau haut (52 CSS) · la carte (300×520 unités, cadrée en `slice`) avec ses
deux rives, le port en haut, le fleuve « LE THRENNY » au milieu, le quartier « chez vous » en or
en bas à droite · un bandeau d'aide en bas · le dock d'onglets.

**Les traits d'identité** — les cinq choses qui font que c'est *cet* écran :
1. la **peinture** bleu-nuit à 34 L moyens, ponctuée de lampes or ;
2. le **fleuve** turquoise en diagonale douce, seul aplat clair ;
3. les **noms gravés** : lettres crème **creusées** dans la peinture par un contour sombre, comme
   une inscription au burin — ils appartiennent au dessin, ils ne flottent pas dessus ;
4. l'**inclinaison** des noms, qui suit la trame des îlots (−10° au nord, +18° au sud-est) ;
5. le **médaillon de chaleur**, montre à gousset suspendue au milieu du bandeau.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, à un tiers près. La ville, le fleuve, le port, la rose des vents, la route or, les 18 noms
en français et leurs inclinaisons sont là et tombent juste : la couche globale ne bouge que de
**0,24 L** et le résidu médian sur toute la carte est de **2/255**. Le premier regard rencontre le
même fleuve, la même géographie, la même palette.

Ce qui change, c'est **la troisième chose que l'œil rencontre**. Dans la maquette, les noms sont
*gravés* : le canon assombrit la peinture de **−13 à −24 L** tout autour de chaque lettre, ce qui
les enfonce dans le dessin. Dans le jeu, la peinture est **éclaircie de +10 à +25 L** au même
endroit : chaque nom porte une **traînée pâle** qui le fait flotter au-dessus de la ville. Le
signe est inversé, et c'est le trait d'identité n°3 qui tombe. Sur HAUTES-MARCHES, PLACE DES
COMPTES et LA CHANCELLERIE — les mots longs — la traînée devient une bande claire visible sans
comparaison. C'est le premier écart perçu, et il est d'autant plus net que le même effet, **peint
dans la texture**, est parfaitement reproduit sur « LE THRENNY » (−18,9 L) : la carte SAIT faire
le contour sombre, seul le lettrage que le client dessine ne le fait pas.

Le deuxième écart est dans le chrome : les **quatre pastilles du dock sont vides** — 0 pixel
au-dessus du fond+28 contre 17 à 32 % au canon. Quatre disques bleus sans icône sous quatre
libellés : la navigation reste lisible par les mots, mais le dock a perdu sa signalétique.

Le troisième n'apparaît qu'à l'autre résolution, et c'est le plus grave : **à 1080×1920 la carte
est dessinée plein cadre** (elle occupe y 16..1892 d'un écran de 1920) au lieu d'être posée dans
la gouttière comme elle l'est correctement à 2400. Le bandeau recouvre le port et le libellé peint
« LE PORT » ; les pastilles du dock recouvrent **LA CHANCELLERIE**, **LES FRICHES** et
**PONT-GRIS**, qui se lisent « LA CHANCE… », « FRICHES » et « ONTGRIS ».

Le reste est de l'ordre du réglage : les noms sont posés **6 px trop bas** (constant, 15/15 du
même signe, déjà annoncé), leur encre est le mauvais jeton (`--creme-2` opaque au lieu de
`#e0d6bd` à 90 %), et le libellé « ARGENT » du bandeau a perdu son interlettrage.

---

## 3. Écarts

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | **BLOQUANT** | **NOUVEAU** | non | **À 1080×1920 la carte est dessinée PLEIN CADRE au lieu d'être posée dans la gouttière.** Le bandeau recouvre le haut du port et le libellé peint « LE PORT » ; les pastilles du dock recouvrent les trois noms de la rangée basse. À 1080×2400 la même carte est correctement encadrée. | Deux chemins concordants : optimiseur `s=0,9966 tx=+1,75 ty=−202,25` (coût 0,204) et repère peint « LE THRENNY » `s=1,0000 tx=+0,70 ty=−206,0`. Le contenu de la maquette (réf y 219..2101) occupe **y 16 .. 1892** d'un écran de 1920. Bandeau = 52 CSS-HUD = **143 px** : « LE PORT » tombe à **y = 63** (sous le bandeau, mesuré `L max 173` à y=30 ⇒ peinture bien présente). Pastilles du dock : **y 2185..2295 à 2400**, dock ancré en bas (l'encre du libellé « EMPIRE » est à 2324..2341 à 2400 et 1845..1854 à 1920, soit **480 px** de décalage) ⇒ **y 1705..1815 à 1920** ; LA CHANCELLERIE / LES FRICHES / PONT-GRIS y ont leurs lignes de base à **1712 / 1713 / 1695**. Découpe `vues/cap1920_bas.png`, `vues/cap1920_haut.png`. À 2400 : contenu **232..2151**, bandeau 0..203, dock ≥ 2179 — gouttière respectée. | si un troisième format (p. ex. 1080×2340) bascule dans l'un ou l'autre régime |
| `M1` | **MAJEUR** | DÉJÀ APPLIQUÉ (r2 M3) | non | **Le traitement autour des noms a toujours le signe INVERSÉ.** Le canon creuse la peinture (contour sombre `stroke:#080d14; width:2.4`) ; le jeu l'éclaire. Le correctif est **déclaré** par le lot et **n'est pas dans l'image**. | Profil radial de luminance, chaque image contre **sa propre** peinture lointaine (d=18..26), 8 mots. **d=1 : maquette médiane −12,8 L** (−23,1 à +0,5) → **jeu +14,4 L** (+10,5 à +24,7) ; **d=2 : −16,7 → +10,8** ; **d=3 : −17,8 → +8,0** ; retour à la ligne de base à d≈6 (maquette) et d≈6-9 (jeu). **Contrôle positif** « LE THRENNY », peint : **−20,5 / −18,9** ⇒ l'instrument voit un contour sombre quand il existe, des deux côtés. **Contrôle négatif** (encre synthétique posée sur la peinture plate du fleuve) : **+1,7 / +0,9** ⇒ la machinerie de distance n'invente pas de cloche. Preuves : `vues/zoom_HAUTESMARCHES.png`, `zoom_DEPOTEST.png`, `zoom_PONTGRIS.png`, `zoom_ORSEL.png`. | si le halo clair vient d'un `Underlay` à la mauvaise couleur, d'une ombre portée claire ou d'un second calque — je mesure l'EFFET, pas le mécanisme |
| `M2` | **MAJEUR** | **NOUVEAU** | non | **Les quatre pastilles du dock sont VIDES** : aucune icône. Le canon en porte quatre (portefeuille, silhouette, maison, rouage). | Disque central de rayon 42 % de la pastille : canon **628/2453 (25,6 %) · 412 (16,8 %) · 731 (29,8 %) · 785 (32,0 %)** pixels au-dessus de fond+28, **max L = 199** ; jeu **0/2121 (0,0 %)** sur les quatre, **max L = 37** (le seul relief est le dégradé radial du disque). Vérifié aux deux résolutions (`vues/cap_dock.png`, `vues/cap1920_bas.png`). | — |
| `m1` | MINEUR | DÉJÀ APPLIQUÉ (r2 m1) | non | **L'encre des noms n'est ni la couleur ni l'opacité du canon.** Le jeu peint `--creme-2 #b9ad92` **opaque** ; le canon peint `#e0d6bd` à `opacity:.9`. Le lot déclare « encre à `opacity:.9` » : **réfuté par la variance**. | Cœur d'encre : **jeu (185, 173, 146) = `#b9ad92` bit-exact, IDENTIQUE sur les 18 noms** (variance nulle ; une version antérieure de l'instrument, dont la bande ramassait la route or et la rose des vents, en donnait deux à ±3/255 — le durcissement `m17` les a ramenés dans le rang) ; **maquette (204, 196, 174) médian, étendue (176,168,147) à (209,198,174)** — elle varie avec la peinture dessous, comme le veut `opacity:.9`. ΔL **196,1 → 173,5 = −22,6 (−11,5 %)** ; r−b **30 → 39**. Une encre à 90 % laisserait passer 10 % de peintures très différentes (parc vert, route or, fleuve) : la variance nulle prouve l'opacité. Le contraste reste au-dessus du plancher (C17). | — |
| `m2` | MINEUR | DÉJÀ APPLIQUÉ (r2 m2, **F8**) | non | **Les 18 noms sont posés plus bas que le canon**, d'une quantité **constante**. Non corrigé (annoncé par le dossier) — voir l'annexe et la lecture de l'ancre ci-dessous. | Deux chemins : **centroïde d'encre** dy médian **+7,03 px** ; **corrélation des profils 1-D** dy médian **+7,25 px**, **18/18 du même signe**. Sur les 15 fenêtres non contaminées : moyenne **+6,80 px, écart-type 1,73** ; dx moyen **+0,83 px, écart-type 4,72**. Biais de recalage mesuré sur « LE THRENNY » : **+1,04 px** ⇒ **décalage net ≈ +6,0 px = 1,66 CSS = 35 % d'une hauteur de capitale**. | — |
| `m3` | MINEUR | **NOUVEAU** | non | **Le trait d'union perd son air sur deux noms**, qui se lisent d'un bloc : « DÉPÔTEST », « PONTGRIS ». | Écart contenant le trait d'union, en px de l'image : **DÉPÔT-EST 18 (maquette) → 3 (jeu)** ; **PONT-GRIS 18 → 2** (et le T, le trait et le G fusionnent en un amas de 41 px) ; **MARNE-BASSE 21 → 11** ; **SAINT-BRAND 19 → 3** ; **QUAI-NORD 22 → 20** (conforme). Découpes `vues/zoom_PONTGRIS.png`, `zoom_DEPOTEST.png`. | pourquoi l'effet est sélectif (QUAI-NORD conforme, DÉPÔT-EST non) — il faudrait la table de crénage de la police embarquée |
| `m4` | MINEUR | **NOUVEAU** | non | **Le libellé « ARGENT » du bandeau n'a pas l'interlettrage du canon** et sa capitale est trop grande. | Canon : largeur **42,00 CSS** pour une capitale de **6,00** (CSS : `.aile .lib{font-size:8.5px;letter-spacing:.22em}`). Jeu : **38,11 CSS** pour une capitale de **6,90**. À capitale égale : **7,00 → 5,52, soit −21 %** de chasse. Capitale **+15 %** (la ligne `[CHROME-CAPITALE] 19 px` du journal confirme les 19 px = 6,90 CSS). | si le même écart touche les autres libellés du bandeau (JOUR, CHALEUR) — non mesuré individuellement |
| `m5` | MINEUR | **NOUVEAU** | non | **L'anneau du médaillon est un halo diffus au lieu du bord net du canon.** | Profil radial horizontal depuis le centre : canon `…19 · 22 · 29 · **142 · 142 · 142** · 17 · 19…` — un créneau de **1,5 CSS** (= `border:1.5px solid` de la CSS) ; jeu `…18 · 42 · 65 · 101 · **119 · 119** · 101 · 82 · 20…` — **3,0 CSS à mi-hauteur**, bords progressifs, **pic 119 au lieu de 142**. Diamètre et centre, eux, sont justes (C23). | — |
| `m6` | MINEUR | **NOUVEAU** | non | **Capitale des libellés du dock trop grande.** | « EMPIRE » : canon lignes d'encre 2013..2030 = **6,00 CSS** ; jeu 2324..2341 = **6,53 CSS**, soit **+8,8 %** (le souligné actif, lignes 2312..2316, a été exclu de la mesure). Largeur 35,67 → 37,02 CSS. | — |

*(Une cause commune à `M1`, `m1` et `m3` : les trois portent sur le lettrage que le CLIENT dessine.
« LE THRENNY » et « LE PORT », peints dans la texture, sont irréprochables sur les trois — c'est ce
qui rend la comparaison décisive.)*

---

## Ce que le lot déclare — vérifié un par un

| déclaration du lot | verdict | mesure |
|---|---|---|
| **M1** — les noms passent en **romaine** (`hudSerifFont`), graisse comparable à capitale égale | **VÉRIFIÉ, appliqué** | Les empattements sont présents des deux côtés sur les 18 mots (`vues/planche_noms_A/B/C.png`). Épaisseur de trait à **mi-hauteur locale**, 12 mots sans accent : rapport jeu/maquette **1,0669** ; capitale **1,0404** ⇒ **à capitale égale, ×1,026**. Contrôle positif « LE THRENNY » : rapport **1,0221 = s exactement**. *(Le r2 mesurait ×1,41 ; c'est refermé.)* ⚠️ Une convention de bord à base **lointaine** rend ×1,53 sur les mêmes images — elle compte le halo clair de `M1` comme de l'encre. J'ai gardé la convention locale et je le déclare. |
| **M2** — interlettrage **0,24 em** (l'unité était le défaut) | **VÉRIFIÉ, appliqué** | Avance par caractère (centres d'amas de lettres), 17 mots : rapport jeu/maquette médian **1,0131** contre **1,0221** attendu ⇒ **−0,9 %**. Écart inter-lettres médian **8,0 px (maquette) → 7,0 px (jeu)**, n=138 de chaque côté. Contrôle positif « LE THRENNY » : **1,0240**. *(Le r2 mesurait 22,0 → 17,2 px, rapport 0,78.)* |
| **M3** — contour **sombre** par `Underlay` à la cote du canon, « plus aucun halo clair » | **RÉFUTÉ** | Voir `M1` du tableau des écarts : **+14,4 L à d=1** là où le canon fait **−12,8 L**. Il n'y a pas de contour sombre, et le halo clair est toujours là. |
| **m1** — encre à `opacity:.9` | **RÉFUTÉ** | Voir `m1` : cœur d'encre **(185,173,146) constant sur 16/18 noms** ⇒ opaque ; et c'est `--creme-2 #b9ad92`, pas `#e0d6bd`. |
| **F4 / QUAI-NORD** — 18 angles inchangés, ≤ 0,53° sauf LA LISIÈRE +1,37 | **VÉRIFIÉ, et meilleur** | jeu − source : médiane **−0,07°**, **max \|0,35°\|** (SAINT-BRAND) ; **LA LISIÈRE à −0,05°** (elle valait +1,37 au r2). jeu − maquette : médiane −0,10°, max \|0,95°\| (LA LISIÈRE, dont la maquette est en état or). Contrôle négatif : image tournée de +3,00° → mesuré **+3,05°**. |
| **F8** — noms plus bas, **non corrigé**, cause cherchée ; « reste le SENS DE L'ANCRE » | **CONFIRMÉ non corrigé — et le candidat restant n'est pas soutenu par la mesure** | dy médian **+7,03 / +7,25 px** par deux chemins, **18/18 du même signe**. **Ce qui tranche : la dispersion.** dy a un écart-type de **1,73 px** pour une moyenne de +6,80 ; dx a un écart-type de **4,72 px** pour une moyenne de +0,83. *Un changement de sens d'ancre* — le centroïde du quartier au lieu du lettrage posé à la main — **produirait une dispersion comparable sur les DEUX axes et des signes mélangés**, puisque les 18 ancres du canon sont placées à la main (x et y indépendants dans la source). Ce qui est mesuré est une **translation verticale constante** de ~6 px nets, avec un dx centré sur zéro. Table complète en **annexe 1**. |

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce qu'on voit | rendu proprement ? | mesure |
|---|---|---|
| la couche d'ÉTAT absente (6 écussons, nappes chaudes, tracé de descente, disque or « VOUS ÊTES ICI », drapeau rouge) | **OUI** | Balayage `m34` : les 6 amas de résidu les plus gros correspondent exactement à ces groupes ; **aucun fragment cassé, aucune pastille ni aplat posé à leur place**. La peinture sous-jacente est intacte : sur les 3 quartiers concernés, la couche globale ne diffère que de 0,24 L une fois ces zones masquées. |
| la légende « Brennar, la nuit — deux rives, dix-huit quartiers · pincez pour approcher, touchez un quartier » absente | **OUI** (aide sans clé i18n) | Amas de résidu à réf (325..697, 2019..2039) et voisins, signe **−39 à −46 L** (le jeu est plus sombre = le texte manque). Rien n'a été posé à sa place. ⚠️ Le périmètre du dossier dit « peuvent **différer** » ; ici elles sont **absentes** — à confirmer si l'absence totale est bien l'intention. |
| LA LISIÈRE en état « chez vous » (or, `font-size:7.4`) dans la maquette, en crème ordinaire dans le jeu | **OUI** | Encre maquette **(135,114,63)** sur nappe or, contraste 1,16:1 ; jeu **(185,173,146)** sur peinture bleue, contraste **7,36:1**. Le nom est complet, non coupé, à l'angle juste (−7,05° contre −7 en source). |
| PHASE de l'aile droite à « — », ARGENT et JOUR alimentés | **OUI** | ARGENT = `9 627 820,00 €` (or vif 242,201,106), JOUR = `JOUR 50`, PHASE = tiret **en braise** — cohérent avec `.tel.chaud .aile.droite .val{color:var(--braise)}`. Pas de « Unknown », pas de médaillon vide. |
| médaillon « Brûlant / CHALEUR » en braise, filet du bandeau en braise | **OUI** | Filet à **51,18 CSS** couleur **(121,56,45)** ; anneau du boîtier braise ; « Brûlant » en braise. Conforme à `.tel.chaud .barre::after`, `.tel.chaud .medaillon .boitier` et `.tel.chaud .heatpct`. **L'aiguille pointe du côté CHAUD** — mesuré : médiane **+62,4°** (0° = vers le haut, positif = horaire), p10 +58,0 / p90 +69,0, un seul lobe ; l'arc cyan est à **−34,2°** et l'arc braise à **+44,2°**. Pas d'aiguille inversée (`m36`). |
| 18 noms français | **OUI** | 18/18, accents justes, 0 slug, 0 troncature, 0 mot anglais, aucun chevauchement entre marqueurs. |
| bande de chaleur / mot de la chaleur / écussons de conviction absents de la carte | **OUI** | Ils font partie de la couche d'ÉTAT ci-dessus. |

---

## ARBITRAGES

| point | pourquoi ce n'est pas un défaut du client | ce que je mesure quand même |
|---|---|---|
| **Police** — la maquette a été rendue avec **Noto Serif** (`fc-match Georgia`), le client embarque **DejaVu Serif** | `Georgia` n'a jamais été montrée à personne | La **hauteur de capitale** se compare et elle est juste (**+1,8 %**, C15) ; la **graisse** aussi (**×1,026**, C16). L'écart de chasse résiduel est de **−0,9 %** (C14) — indiscernable. |
| **Pastille « Chaleur : affichée »** en bas à gauche, absente de la maquette | ARBITRAGE user ouvert (r1 F6) — sa présence ne se compte pas | Sa **forme est hors palette**, inchangée depuis le r2 : encre **BLANC PUR (255,255,255) sur 123 px** alors que la maquette n'en compte **0** dans tout le contenu ; plaque **178 × 30 px** (x 13..190, y 2106..2135), fond **(56,61,75)** plat, **angles vifs** (ligne pleine dès y=2106), **aucun liseré** (x=12 rend (3,4,5)). Elle est l'amas le plus clair du balayage (**+40 L**). **Elle ne recouvre ni nom ni repère peint** (la peinture dessous a L médiane 11,8) ⇒ elle reste dans l'assumé. |
| Le canon HUD met un **pourcentage** dans le médaillon (« 37 % ») ; le jeu et le cadre de série 6 y mettent un **mot** (« Brûlant » / « tiède ») | deux canons divergent | Le mot est en braise et le libellé « CHALEUR » tracké, conformes à `.tel.chaud .heatpct` et `.heatlib`. |
| Onglet **« MARCHÉ » (canon HUD) → « FILIÈRE » (jeu)** ; pastille de notification or sur FAMILLE présente au canon, absente au jeu | jeu d'onglets et état de notification = produit / données | Géométrie du dock identique (C23). |
| Maquette en retard sur le français réel : **`HEAT`**, **`$ 24 850`** dans la référence | ruling user 2026-09-02 « fr réel » — le client a raison | noté une fois, jamais compté comme écart. |

---

## 5. Autres résolutions

**1080×2400 (PRINCIPALE, sous chrome)** — tient. Le contenu occupe **232..2151** ; le bandeau
s'arrête à **203**, le dock commence à **2179** : la carte vit entièrement dans la gouttière, avec
28 px de fond de scène en haut et 27 en bas. Le médaillon déborde jusqu'à y=231, donc **dans le
fond de scène**, jamais sur la carte. Aucun nom coupé (marge minimale 24 px). Le losange or du
médaillon (canon : `.medaillon .losange{bottom:-11px}`) touche le tout premier rang du contenu —
2 cellules de résidu, sans conséquence.

**1080×2400 hors chrome** — la planche est bien la carte seule, et **identique à 3/255 près** à ce
que la planche sous chrome montre entre 232 et 2151. Elle prouve que rien n'est caché sous le
bandeau ni sous le dock à cette résolution.

**1080×1920** — **ne tient pas** : voir `B1`. La carte est dessinée à l'échelle **s ≈ 1,00** (contre
1,0221 à 2400) sur **y 16..1892**, c'est-à-dire **sur tout l'écran**, chrome compris. Conséquences
mesurées : « LE PORT » à y=63 sous le bandeau ; LA CHANCELLERIE, LES FRICHES et PONT-GRIS dans la
bande des pastilles (1705..1815), amputés de 2 à 4 lettres chacun ; toute la lisière basse de la
peinture derrière les libellés d'onglet. Les quatre pastilles y sont **également vides**.

---

## 6. Ce que je n'ai pas pu vérifier

| point | la mesure hors image qui trancherait |
|---|---|
| **Animation** — aucune paire T / T+1 s n'est fournie. Les deux planches 2400 (17:08 et 17:15, deux commits) ne diffèrent que de **596 px à ≤ 3/255** dans le contenu, ce qui montre que la carte est **déterministe entre deux runs**, mais **ne prouve pas** l'absence d'animation (deux captures peuvent tomber sur la même phase). | deux captures du même run à 1 s d'intervalle, et un compte de pixels différents hors chrome |
| **Le mécanisme** du halo clair de `M1` — je mesure l'effet (profil radial), pas sa cause. Un `Underlay` à la mauvaise couleur, une ombre portée claire ou un second calque produisent la même signature. | lire les paramètres du matériau de texte dans la scène, ou rendre le même mot sur un fond noir uni hors ligne |
| **La police réellement embarquée** — je constate des empattements et une métrique juste, je ne peux pas nommer la fonte depuis une image. | le fichier de police que `hudSerifFont` résout, et son nom PostScript |
| **Le caractère sélectif du trait d'union** (`m3`) — QUAI-NORD conforme, DÉPÔT-EST non. | la table de crénage / les paires de la police embarquée |
| **Les états ouverts** annoncés par le dossier : le JOUR, la semaine de compression, les pastilles par district, l'état « un quartier touché » (cadre #23) et « approcher : chez vous » (cadre #24). | des planches de ces états ; ils ne sont pas dans ce dossier |
| **Les valeurs** affichées (9 627 820,00 € · JOUR 50 · Brûlant) — le journal cite bien `régime=env identité=demo_capture@example.test`, donc elles sont comparables aux corps de la base gelée, mais **je n'ai pas la base** : je n'ai jugé que la forme. | les corps réels de `session/open` et du domaine chaleur sur le compte gelé |
| **Le chrome à 1080×1920** — je n'ai vérifié que le recouvrement, pas sa géométrie en CSS. | la même campagne `m23`–`m27` appliquée à la planche 1920 |
| **Une troisième résolution** (p. ex. 1080×2340, très répandu) — le régime de `B1` bascule quelque part entre 1920 et 2400 et je ne sais pas où. | une planche à 1080×2340 |
| **Les libellés du bandeau autres que « ARGENT »** (JOUR, CHALEUR) — je n'ai mesuré l'interlettrage que sur ARGENT. | le même instrument `m24` sur les deux autres |
| **Ce qu'un joueur voit sur un vrai téléphone** — je juge des PNG ; la densité de pixels et la luminosité d'écran changent la perception du halo de `M1`. | la couche 4 du socle : l'APK sur l'appareil |

---

## Annexe 1 — les 18 noms : centre d'encre, canon et jeu, en CSS

Centre d'encre du masque à mi-alpha. Colonne « canon » : coordonnées du PNG de référence
divisées par 3,6. Colonne « jeu → canon » : centre mesuré sur la capture hors chrome, ramené dans
le repère du canon par `((x−tx)/s, (y−ty)/s)` avec `s=1,02215, tx=−11,94, ty=+8,17`, puis ÷3,6.
`dy prof.` est le décalage obtenu par le **second chemin** (corrélation des profils d'encre 1-D
normalisés), indépendant du centroïde ; `|c−p|` est l'écart entre les deux chemins.

⚠️ Les trois lignes marquées **(†)** ont une fenêtre **contaminée côté maquette** — la légende
« Brennar, la nuit… » pour LA CHANCELLERIE, l'écusson n°5 pour PLACE DES COMPTES, le disque or
« VOUS ÊTES ICI » pour LA LISIÈRE. Leur **centroïde** est faux (voir `|c−p|`) ; leur **dy par
profils** reste exploitable. Les statistiques du bas les excluent.

| quartier | centre CANON (CSS) | centre JEU→CANON (CSS) | dx px | dy px | dx CSS | dy CSS | dy prof. (px) | \|c−p\| |
|---|---|---|---|---|---|---|---|---|
| LES BASSINS | (50,77 ; 130,91) | (49,45 ; 133,18) | −4,74 | **+8,17** | −1,32 | +2,27 | +7,25 | 0,92 |
| QUAI-NORD | (152,48 ; 130,49) | (153,28 ; 132,38) | +2,90 | **+6,83** | +0,80 | +1,90 | +7,00 | 0,17 |
| SARNES | (252,40 ; 126,07) | (254,18 ; 127,82) | +6,41 | **+6,32** | +1,78 | +1,76 | +7,25 | 0,93 |
| LA COLONNE | (55,07 ; 192,97) | (52,58 ; 194,83) | −8,99 | **+6,68** | −2,50 | +1,86 | +7,25 | 0,57 |
| HAUTES-MARCHES | (160,73 ; 191,14) | (160,83 ; 193,18) | +0,38 | **+7,35** | +0,11 | +2,04 | +7,25 | 0,10 |
| VERRIER | (256,32 ; 184,27) | (255,15 ; 186,26) | −4,23 | **+7,16** | −1,17 | +1,99 | +7,25 | 0,09 |
| SAINT-BRAND | (53,98 ; 256,28) | (52,95 ; 258,20) | −3,72 | **+6,91** | −1,03 | +1,92 | +7,25 | 0,34 |
| LES ENTREPÔTS | (158,55 ; 256,48) | (159,82 ; 259,05) | +4,57 | **+9,25** | +1,27 | +2,57 | +7,50 | 1,75 |
| DÉPÔT-EST | (252,88 ; 254,96) | (254,98 ; 257,32) | +7,54 | **+8,48** | +2,09 | +2,35 | +7,25 | 1,23 |
| LE TREILLIS | (49,04 ; 381,13) | (48,05 ; 382,30) | −3,56 | **+4,22** | −0,99 | +1,17 | +8,25 | 4,03 |
| MARNE-BASSE | (152,00 ; 386,40) | (152,61 ; 387,34) | +2,20 | **+3,41** | +0,61 | +0,95 | +5,50 | 2,09 |
| LE VERRE | (255,47 ; 382,63) | (256,63 ; 385,11) | +4,18 | **+8,94** | +1,16 | +2,48 | +7,00 | 1,94 |
| ORSEL | (41,66 ; 456,60) | (43,37 ; 457,59) | +6,16 | **+3,57** | +1,71 | +0,99 | +4,50 | 0,93 |
| PLACE DES COMPTES **(†)** | (158,94 ; 462,48) | (147,89 ; 460,98) | −39,79 | −5,39 | −11,05 | −1,50 | **+7,00** | 12,39 |
| LA LISIÈRE **(†)** | (265,52 ; 451,57) | (254,69 ; 454,71) | −38,98 | +11,30 | −10,83 | +3,14 | **+2,50** | 8,80 |
| LA CHANCELLERIE **(†)** | (72,14 ; 541,88) | (48,23 ; 534,93) | −86,05 | −25,01 | −23,90 | −6,95 | **+7,25** | 32,26 |
| LES FRICHES | (147,84 ; 532,64) | (147,96 ; 534,67) | +0,43 | **+7,29** | +0,12 | +2,03 | +7,25 | 0,04 |
| PONT-GRIS | (247,67 ; 527,87) | (248,49 ; 529,91) | +2,96 | **+7,36** | +0,82 | +2,04 | +7,25 | 0,11 |

**Statistiques** (15 lignes, hors les trois contaminées) :

```
dy  : moyenne +6,80 px   médiane +7,16 px   écart-type 1,73   15/15 du même signe
dx  : moyenne +0,83 px   médiane +0,40 px   écart-type 4,72   signes mélangés
dy par profils (18/18) : médiane +7,25 px, étendue +2,50 .. +8,25, 18/18 du même signe
biais de recalage mesuré sur « LE THRENNY » (peint)  : dx +0,14 · dy +1,04 px
⇒ décalage NET des noms : dy ≈ +6,0 px = 1,66 CSS = 35 % d'une hauteur de capitale ; dx ≈ 0
```

**Lecture pour l'ancre** — la dispersion de `dy` (**1,73 px**) est **2,7 fois plus faible** que
celle de `dx` (**4,72 px**), alors que c'est `dy` qui porte la totalité du décalage. Les 18 ancres
du canon sont posées **à la main** dans la source (x et y indépendants d'un quartier à l'autre) :
si le jeu plaçait le nom sur le **centroïde du quartier** au lieu du lettrage du canon, l'écart
serait **dispersé sur les deux axes et de signes mélangés**. Ce qui est mesuré est une
**translation verticale constante**. Le candidat « sens de l'ancre » n'est donc pas soutenu par
la mesure, pas plus que les deux déjà réfutés par le correcteur.

---

## Annexe 2 — inclinaison des 18 noms (deg, positif = HORAIRE)

| quartier | source | maquette | résidu (px) | jeu | résidu (px) | jeu − source | jeu − maquette |
|---|---|---|---|---|---|---|---|
| LES BASSINS | −10 | −10,05 | 4,78 | −9,95 | 5,13 | +0,05 | +0,10 |
| QUAI-NORD | −10 | −10,05 | 4,94 | −10,00 | 5,10 | +0,00 | +0,05 |
| SARNES | −10 | −10,15 | 4,74 | −10,15 | 5,10 | −0,15 | +0,00 |
| LA COLONNE | +3 | +3,00 | 5,10 | +2,85 | 5,06 | −0,15 | −0,15 |
| HAUTES-MARCHES | +3 | +3,00 | 4,78 | +3,00 | 5,13 | +0,00 | +0,00 |
| VERRIER | +3 | +2,80 | 7,22 | +3,00 | 7,13 | +0,00 | +0,20 |
| SAINT-BRAND | +3 | +3,00 | 4,88 | +2,65 | 5,20 | −0,35 | −0,35 |
| LES ENTREPÔTS | +7 | +7,15 | 5,81 | +6,95 | 5,37 | −0,05 | −0,20 |
| DÉPÔT-EST | +7 | +6,85 | 5,31 | +7,00 | 5,46 | +0,00 | +0,15 |
| LE TREILLIS | 0 | +0,00 | 5,20 | −0,20 | 4,08 | −0,20 | −0,20 |
| MARNE-BASSE | 0 | +0,05 | 4,90 | −0,05 | 3,90 | −0,05 | −0,10 |
| LE VERRE | +18 | +17,95 | 5,04 | +17,85 | 5,35 | −0,15 | −0,10 |
| ORSEL | 0 | +0,15 | 5,37 | −0,25 | 5,19 | −0,25 | −0,40 |
| PLACE DES COMPTES | +18 | +18,00 | 5,02 | +18,00 | 5,28 | +0,00 | +0,00 |
| LA LISIÈRE | −7 | −6,10 | 8,92 | −7,05 | 5,70 | −0,05 | −0,95 |
| LA CHANCELLERIE | +18 | +18,35 | 8,57 | +17,90 | 5,26 | −0,10 | −0,45 |
| LES FRICHES | −7 | −7,05 | 5,28 | −7,15 | 5,43 | −0,15 | −0,10 |
| PONT-GRIS | −7 | −7,30 | 5,67 | −7,10 | 5,73 | −0,10 | +0,20 |

`jeu − source` : médiane **−0,07°**, max **|0,35°|**. `jeu − maquette` : médiane **−0,10°**, max **|0,95°|**.
Contrôle positif « LE THRENNY » : REF −0,15° / CAP −0,10°, écart **+0,05°**.
Contrôle négatif : la même fenêtre tournée de **+3,00°** rend **+3,05°**.

---

## Annexe 3 — profil radial autour de l'encre des noms (ΔL contre la peinture lointaine d=18..26)

| nom | côté | d1 | d2 | d3 | d4 | d5 | d6 | d7 | d8 |
|---|---|---|---|---|---|---|---|---|---|
| QUAI-NORD | maquette | −8,6 | −21,3 | −21,3 | −21,3 | −15,7 | −3,0 | 0,0 | 0,0 |
| QUAI-NORD | **jeu** | **+12,3** | +8,3 | +7,7 | +6,5 | +5,2 | +1,8 | +0,7 | +0,7 |
| SARNES | maquette | −9,5 | −13,8 | −13,8 | −13,8 | −11,1 | +0,1 | +2,2 | +2,5 |
| SARNES | **jeu** | **+22,5** | +16,5 | +13,7 | +11,2 | +9,1 | +6,8 | +4,6 | +3,6 |
| SAINT-BRAND | maquette | +0,5 | −16,5 | −18,5 | −18,9 | −9,2 | +0,8 | +2,8 | +2,8 |
| SAINT-BRAND | **jeu** | **+16,5** | +12,2 | +9,3 | +6,6 | +2,9 | +2,4 | +2,4 | +2,4 |
| DÉPÔT-EST | maquette | −19,3 | −20,3 | −20,3 | −20,3 | −16,0 | −3,0 | 0,0 | 0,0 |
| DÉPÔT-EST | **jeu** | **+14,8** | +10,6 | +8,2 | +6,3 | +3,3 | +0,8 | 0,0 | 0,0 |
| LE TREILLIS | maquette | −12,1 | −16,4 | −17,0 | −17,1 | −15,3 | −13,6 | −13,6 | −13,6 |
| LE TREILLIS | **jeu** | **+13,8** | +10,9 | +7,0 | +3,9 | +3,6 | +3,6 | +1,5 | +0,9 |
| MARNE-BASSE | maquette | −13,5 | −16,8 | −16,8 | −16,8 | −12,6 | +2,8 | +2,8 | +2,8 |
| MARNE-BASSE | **jeu** | **+24,7** | +19,5 | +16,1 | +11,6 | +8,1 | +3,6 | +3,6 | +3,6 |
| LE VERRE | maquette | −23,1 | −24,3 | −24,3 | −24,2 | −16,2 | −2,8 | −1,7 | −1,0 |
| LE VERRE | **jeu** | **+13,9** | +7,8 | +5,8 | +4,3 | +3,5 | +2,4 | +1,7 | +0,8 |
| PLACE DES COMPTES | maquette | −15,9 | −24,3 | −24,3 | −24,3 | −13,3 | 0,0 | 0,0 | 0,0 |
| PLACE DES COMPTES | **jeu** | **+10,5** | +5,5 | +3,2 | +1,3 | +0,2 | 0,0 | 0,0 | 0,0 |
| **« LE THRENNY » (peint) — contrôle positif** | maquette | **−20,5** | −20,6 | −20,6 | −14,5 | −0,4 | +0,7 | +0,7 | +0,6 |
| **« LE THRENNY » (peint) — contrôle positif** | **jeu** | **−18,9** | −19,9 | −19,9 | −18,9 | −1,0 | +0,3 | +0,3 | 0,0 |
| **encre synthétique sur peinture plate — contrôle négatif** | maquette | +1,7 | +1,7 | +1,5 | +1,4 | +1,4 | +1,4 | +1,4 | +0,7 |
| **encre synthétique sur peinture plate — contrôle négatif** | jeu | +0,9 | +0,9 | +0,9 | +0,9 | +0,9 | +0,9 | +0,9 | +0,9 |

Médianes à d=1 : **maquette −12,8 L · jeu +14,4 L**. À d=2 : −16,7 / +10,8. À d=3 : −17,8 / +8,0.

---

## Annexe 4 — scripts

Tous dans `mesures/`. Chacun imprime la taille des images qu'il ouvre.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `geom.py` | repère commun, conventions, ancres SVG des 18 noms | — |
| `m01_bandes.py` | bandes horizontales des quatre images | — |
| `m02_rect.py` | rect exact du contenu (lignes strictement uniformes) | — |
| `m03_chrome.py` | où le chrome recouvre le contenu (delta sous/hors chrome) | positif : delta nul au cœur du fleuve |
| `m04_rect1920.py` | absence de letterbox à 1920 | — |
| `m05_recalage.py`, `m06_recalage_fin.py` | recalage affine isotrope, **deux chemins** | positif : décalage volontaire ×1,7 le coût ; négatif : anisotropie ±0,4 % |
| `m07_warp.py` | référence recalée + image de résidu | bornes du contenu imprimées |
| `m11_strips.py`, `m12_zoom.py` | planches comparatives et zooms | — |
| `m13_encre.py` | luminance/couleur d'encre par nom (choix du seuil) | — |
| `m14/m15/m17_noms_*.py` | métriques des noms (3 versions, chacune réfutée par son contrôle) | positif « LE THRENNY » à chaque version |
| `m16_halo.py` | **profil radial** (l'écart `M1`) | positif « LE THRENNY » ; négatif encre synthétique |
| `m18_table18.py` | table des 18 noms, **deux chemins** (centroïde, profils) | positif « LE THRENNY » : dy +1,04 / +1,00 |
| `m19_angles.py` | inclinaisons, estimateur par concentration du profil | positif « LE THRENNY » ; **négatif : image tournée de +3,00°** |
| `m20_chasse.py` | avance par caractère, écarts inter-lettres | positif « LE THRENNY » : 1,0240 vs s=1,0221 |
| `m21_graisse.py` | *(écarté)* graisse à base lointaine — rend ×1,53, artefact du halo | conservé pour montrer l'artefact |
| `m22_coupe.py` | coupes brutes de luminance à travers les fûts | — |
| `m23`–`m27_chrome*.py` | bandeau, médaillon, barre-ratio, dock, icônes, libellés | positif : 392 CSS des deux côtés ; couleurs à 1/255 |
| `m28`,`m28b`,`m31`,`m32_1920*.py` | régime de la résolution 1920, **deux chemins** | positif : la même procédure retrouve s=1,0221 à 2400 |
| `m29_pastille.py` | forme de la pastille « Chaleur : affichée » | 0 blanc pur dans la maquette |
| `m30_global.py` | couche globale, palette, contraste WCAG | positif : fleuve et route or à 1/255 |
| `m33_trait_local.py` | **graisse à mi-hauteur locale** (la bonne convention) | positif « LE THRENNY » : **1,0221 = s exactement** |
| `m34_balayage.py` | balayage « en trop / absent » par amas de résidu | les amas attendus (couche d'ÉTAT) sortent en tête |
| `m35_divers.py` | marges au cadre, écarts autour du trait d'union | — |
| `m36_aiguille.py` | **sens de l'aiguille** du manomètre et orientation des deux arcs | positif : l'arc froid doit sortir à gauche et l'arc chaud à droite, des deux côtés |

Images de travail dans `mesures/vues/` (`planche_noms_A/B/C.png`, `zoom_*.png`, `med_duo.png`,
`residu_small.png`, `cap1920_haut/bas.png`, `canon_*.png`).
