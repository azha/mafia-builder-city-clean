# Juge visuel ⊥ — ① L'intérieur de district (« le HUD de Brennar ») — r7 — 2026-09-06

## Verdict : **NON APPROUVÉ**

Le chrome, la plaque de fiche et le dock sont géométriquement au canon à moins de 2 CSS près et les
jetons de couleur sont exacts au 1/255 ; **1 BLOQUANT, 7 MAJEURS, 15 MINEURS**. Ce qui bloque tient à
**une cause de fond et trois corps** : aucun élément de texte posé sur l'art n'a de fond garanti — le
nom du district rend **1,58:1** à la résolution cible et les quatre libellés de navigation **3,6:1** à
1080×1920, faute du voile que le canon déclare sur son dock ; le bouton primaire a un remplissage à
**angles droits** ; le cadran du manomètre ne reproduit ni son segment neutre, ni la forme de ses arcs,
ni sa lunette ; et la variante d'état `.chaud` n'est appliquée qu'à **2 de ses 4** éléments.

---

## Convention de bord (déclarée, appliquée partout)

Pour toute épaisseur de trait je donne **deux** nombres :

- **NOMINAL** = largeur à **mi-alpha** : largeur de la plage où la grandeur discriminante dépasse la
  moitié entre sa ligne de base locale et son pic. C'est la largeur « telle qu'on la voit ».
- **CŒUR** = largeur de la plage au-dessus de **95 %** du pic (le plat opaque). Un trait net a
  cœur ≈ nominal ; un halo a cœur ≪ nominal.

Grandeur discriminante employée pour le laiton/braise : **R − B** (laiton = +114, braise = +151,
tout le reste du HUD < 0). Pour les arcs : `(G+B)/2 − R` (teal) et `R − (G+B)/2` (braise).
Le **filet du bandeau** est un cas particulier : il est rendu **sans aucun anti-crénelage** des deux
côtés dans les deux images, donc cœur = nominal = compte de pixels pleins ÷ échelle.

## Repères et échelle (établis avant toute mesure, cités par toutes les mesures du §3)

| | px image | CSS | facteur |
|---|---|---|---|
| `ecran-canon.png` | 1176 × 2091 | 392 × 697,0 | **×3,0000** |
| captures 1080×1920 | 1080 × 1920 | 392 × **696,889** | **×2,7551** |
| captures 1080×2400 | 1080 × 2400 | 392 × 871,111 | **×2,7551** |

⇒ **La capture principale (1080×1920) est en correspondance CSS 1:1 avec la référence** : 696,889
contre 696,88 CSS de `.tel`. Décalage nul en x (centre du médaillon 195,84 canon / 195,82 jeu ;
centres des ronds du dock 93,67 · 161,67 · 229,67 · 297,67 au canon et 93,64 · 161,70 · 229,57 · 297,63 en jeu, `m58`). Décalage nul en y à 1920.
À 1080×2400 tout le contenu d'écran est décalé de **+174,222 CSS** (mesuré sur le filet doré
supérieur de la fiche : 425,393 → 599,615, `mesures/m30`) ; toutes mes valeurs 2400 sont ramenées au
repère 1920.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | canon | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | **côté du pivot** par rapport au centre du boîtier | +4,83 CSS **sous** (+0,1550 R) | +5,37 CSS **sous** (+0,1652 R) | +0,54 CSS ; **même côté** | `m16` |
| 2 | couleur du pivot | `--laiton` (176,141,62) | (176,141,62) | **0** | `m16` |
| 3 | cerclage du boîtier — couleur (témoin d'état `.chaud`) | `--braise` (224,102,74) | (224,102,73) | 1/255 | `m01`,`m04` |
| 4 | filet du bandeau — couleur (témoin `.chaud` l.31) | `--braise` (224,102,74) | (224,102,73) | 1/255 | `m02`,`m03` |
| 5 | couleur de l'arc **teal** (sur son fond local, 20 L plus sombre en jeu) | (70,103,114) L 96,8 | (70,98,108) L 92,8 | (0,−5,−6) | `m19` |
| 6 | couleur de l'arc **braise** (idem) | (133,70,61) L 82,8 | (131,75,69) L 86,8 | (−2,+5,+8) | `m19` |
| 7 | **indicateur d'onglet actif** (`.dockb .pointe`, 14×2 CSS au canon) | x 87,00..101,00 (14,00) × 2,00, (176,141,62), centre 94,00 | x 87,11..100,90 (13,79) × 1,81, (176,141,61), centre **94,00** | −0,21 / −0,19 | `m43` |
| 8 | l'indicateur **suit l'écran** | — | témoin ⑥ : sous FAMILLE, centre **162,07** (rond 2 = 162) | — | `m43` |
| 9 | plaque de fiche — boîte | 366,00 × 169,19 à (13,00 ; 424,52) | **368,04 × 169,50** à (11,98 ; 425,39) | ≤ 2,04 CSS | `m52` |
| 10 | plaque de fiche — coin arrondi (`border-radius:14px`) | présent | présent : retrait 10,89 → 3,99 CSS sur 12 lignes, **symétrique g/d** | — | `m52` |
| 11 | séparateurs de stats (centres, hauteur) | 140,00 · 251,67 ; h 37,67 | 140,10 · 250,63 ; h 37,39–38,11 | ≤ 1,04 | `m54` |
| 12 | capitales : sous-titre / libellés de stats / libellés de boutons | 6,33 · 6,00 · 8,00 | 6,17 · 5,81 · 7,99 | −2,5 % · −3,2 % · −0,1 % | `m37` |
| 13 | jetons d'encre `--creme-2` (ARGENT, JOUR, libellés dock, libellés stats) | (185,173,146) | (185,173,146) | **0** | `m22`,`m45` |
| 14 | jetons `--or-vif` et `--creme` | (242,201,107) · (234,224,200) | (242,201,106) · (234,224,200) | 1/255 · **0** | `m22` |
| 15 | barre de ratio — couleur et épaisseur | `--or` (217,171,78) · 2,00 CSS | (217,171,77) · 2,18 CSS | 1/255 · +0,18 | `m51` |
| 16 | boutons secondaires — boîtes | BLANCHIR 150,00..275,00 ; AMÉLIORER 280,00..363,00 ; h 39,67 | 149,90..274,76 ; 279,84..361,15 ; h 39,56 | ≤ 1,85 | `m39` |
| 17 | rythme vertical de la fiche (4 bandes) | titre 446,67..457,00 · sous-titre 470,33..478,00 · libellés 518,00..524,00 · texte des boutons 555,67..564,00 | 445,72..457,33 · 470,04..476,21 · 517,95..524,12 · 555,33..563,68 | ≤ 1,8 | `m35` |
| 18 | l'aiguille pointe **dans** le secteur braise (le cadran n'est pas inversé) | — | aiguille à **32,0°**, secteur braise **2..68°** | — | `m11`,`m17` |
| 19 | gouttière | — | fiche 425,39..594,90 (1920) et 599,61..769,12 (2400) ⇒ **10,8 CSS** au-dessus du dock aux deux | — | `m52` |
| 20 | contrastes (à 1080×2400) : ARGENT · montant · titre de fiche · sous-titre · libellés de stats | 8,02 · 11,63 · 11,54 · 8,24 · 8,44 | 8,33 · 11,50 · 11,70 · 8,30 · 8,31 | ≤ 0,31 | `m44` |
| 21 | palette : bandeau et plaque (à 1080×2400) | L moy 33,4 · 35,4 | L moy 30,9 · 37,5 | ≤ 2,5 | `m55` |
| 22 | centre horizontal du médaillon | 195,84 | 195,82 | 0,02 | `m06` |
| 23 | **ronds du dock** — diamètre, centres, pas (remesurés ici, non repris du r6) | Ø 46,00 ; centres 93,67 · 161,67 · 229,67 · 297,67 ; pas 68,00 | Ø 45,73–46,10 ; centres 93,64 · 161,70 · 229,57 · 297,63 ; pas 67,87–68,06 | ≤ 0,37 | `m58` |
| 24 | capitale des libellés du dock | 6,00 (6 glyphes concordants) | 5,81 (6 glyphes) | −3,2 % | `m58` |
| 25 | **contrôle des instruments** : hors plaque, les deux captures 2400 (avec / sans fiche) sont **bit-identiques** | — | 0 pixel différent sur 954 720 (bandeau, art, dock) | — | `m31` |

---

## 0. L'écran, tel que la maquette le dit

**But.** On est *dans* un quartier. On vient y voir son quartier vivant la nuit, repérer ses
bâtiments, en toucher un pour lire ce qu'il vaut, et décider : COLLECTER · BLANCHIR · AMÉLIORER.

**Ordre de lecture.** (1) La **barre haute** : un gros montant en or vif à gauche, et au centre un
**médaillon de laiton** — une montre à gousset — qui tranche sur le verre fumé ; c'est le seul objet
rond et brillant de l'écran. (2) Le **bâtiment héros**, éclairé, au milieu de l'art. (3) La
**plaque de fiche** en bas : un titre serif en or, trois chiffres, un CTA doré plein. (4) Le **dock**,
quatre ronds gravés, sourds, qui ne demandent rien.

**Zones.** barre haute (argent · manomètre · jour) · un ruban d'alerte plein-largeur juste sous la
barre · l'art du district · la plaque de fiche · le dock.

**Traits d'identité.** (a) le **laiton** : un filet de 1 CSS qui traverse la barre, un cerclage de
1,5 CSS autour du médaillon, un trait de 14×2 sous l'onglet actif — toujours net, jamais diffus ;
(b) le **verre fumé** : bandeau, plaque et dock sont des plaques sombres translucides posées sur
l'art, qui l'assourdissent sans le cacher ; (c) le **cadran** : deux arcs FINS et de largeur
constante séparés par un large segment neutre au sommet, une aiguille qui les traverse ; (d) l'**or
vif** réservé à deux choses : l'argent et le CTA ; (e) tout est **arrondi** — plaque 14, boutons 9,
ronds 23.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le but, les zones et l'ordre de lecture sont conservés : on voit le quartier, on lit la plaque, on
trouve le CTA doré, on retrouve les quatre onglets. La plaque de fiche est au canon à 2 CSS près,
son rythme vertical est superposable et ses encres sont les jetons exacts. Le pivot du cadran est
enfin **du bon côté** et les arcs ont retrouvé leurs **couleurs** — les deux corrections annoncées
qui portaient le plus.

Ce qui a changé de lecture tient en trois points. **Un.** Le **manomètre** ne se lit plus comme un
cadran mais comme une **tente** : deux masses épaisses (teal 4,15 CSS contre 2,49) aux extrémités
fuselées, qui se rejoignent presque au sommet (12° de neutre contre 38°), sous un cerclage devenu
**halo** (nominal 2,3–2,6 CSS contre 1,38, sans plat) et sans sa lunette intérieure ; l'aiguille,
raccourcie de 19 %, s'arrête **avant** d'atteindre les arcs alors que celle du canon les traverse.
Le laiton net, trait d'identité n°1, y disparaît. **Deux.** Le **bouton primaire** : son
remplissage doré est un **rectangle à angles droits** (retrait 0,00 CSS sur les neuf premières
lignes, contre 8,67 → 2,67 au canon) avec le tracé arrondi dessiné *à l'intérieur* — quatre
oreilles dorées aux angles. Sur l'objet le plus important de l'écran, et à toutes les résolutions.
**Trois.** Le **chrome ne pose pas son propre voile** : le canon déclare
`.dock{background:linear-gradient(180deg,transparent,#070b12d8 40%)}` et le jeu n'a **aucune marche
de luminance** au bord du dock (−2,7 L à 1920 ; à 2400 la marche de −72 L tombe 4 CSS plus bas, sur
le panneau de fond, pas sur le dock). Conséquence mesurée : à 1080×1920 les quatre libellés de
navigation tombent à **3,54–3,76:1** (canon 7,13–8,40) et le nom du district à **1,58:1** à
1080×2400, la résolution cible.

Le reste est du second ordre mais va dans le même sens : le boîtier est 5 % trop grand, son fond a
perdu son éclairage directionnel (amplitude inter-secteurs L 1,1 contre 19,4), les deux volutes du
bandeau manquent, le montant perd 17 % de corps, et la variante d'état `.chaud` — que le dossier me
donne comme témoin — n'est appliquée qu'au boîtier et au filet : « Brûlant » et « Aube » restent en
crème là où la CSS demande `--braise`.

---

## 3. Écarts — table unique

`critère` : `NOUVEAU` = la grandeur ou l'instrument n'existait pas au r6 (d'après `grandeurs-r6.md`).
`données` : **oui** = l'écart peut venir du contenu servi ce jour-là et non de la forme.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| **B1** | BLOQUANT | DÉJÀ APPLIQUÉ | non | **Le nom du district n'est pas lisible à la résolution CIBLE.** Aucun fond n'est garanti sous lui : sa lisibilité est laissée au hasard de l'art. | 1080×2400 : encre (209,200,179) sur ciel (146,161,180) ⇒ **1,58:1** ; le contour (137,131,118) ne sauve rien (contour/ciel **1,43:1**). Capitale **4,72 CSS** = le plus petit texte de l'écran. Doctrine : ≥ 4,5:1. À 1080×1920 le même libellé tombe sur un mur sombre et rend 4,57:1. (`m48`) | que ce soit vrai pour tous les districts : je n'ai qu'un art et deux captures. Un autre quartier plus sombre le rendrait lisible — c'est bien le défaut. |
| **M1** | MAJEUR | **NOUVEAU** | non | **Bouton COLLECTER : le remplissage doré est un rectangle à ANGLES DROITS**, et le tracé arrondi est dessiné à l'intérieur ⇒ quatre « oreilles » dorées d'environ 5×5 CSS aux angles. Le canon (`.btn{border-radius:9px}`) a un remplissage arrondi. | retrait du bord doré, 9 premières lignes du haut — canon **8,67 · 6,67 · 5,33 · 5,00 · 4,33 · 4,00 · 3,33 · 3,00 · 2,67** CSS ; jeu **0,00** ×9. Idem sur les 9 dernières lignes. Identique à 1920 et 2400. Le tracé arrondi est bien là (rayon ≈ 5 CSS, coupe `m40`). Boîte du bouton correcte par ailleurs (104,53×39,56 contre 105,33×39,67). (`m39`,`m40`,`m41`) | si les boutons secondaires ont le même défaut : ils n'ont pas de remplissage, donc rien à trahir. |
| **M2** | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le segment neutre du cadran fait 12° au lieu de 38°**, et la course totale du cadran 177° au lieu de 215°. | secteurs à mi-hauteur (0° = à droite, sens trigo) — canon : braise jusqu'à **51°**, teal à partir de **89°** ⇒ **38°** de neutre, course −17°..198° = **215°** ; jeu : braise jusqu'à **69°**, teal à partir de **79,5°** ⇒ **10,5–12°** de neutre, course 2°..179° = **177°**. (`m11`) | le nombre visé par le correcteur (« ~24° à ~3° près ») : je mesure la forme rendue, pas son intention ; nos conventions d'angle diffèrent. |
| **M3** | MAJEUR | **NOUVEAU** (le r6 mesurait l'épaisseur, pas le profil d'extrémité) | non | **Les arcs sont ~1,7× trop épais et leurs extrémités sont FUSELÉES** au lieu d'être coupées net ; ils sont aussi poussés vers l'extérieur. | épaisseur radiale à mi-hauteur — canon **teal 2,44/2,48/2,54** (100/120/140°) et **braise 2,46–2,52** (10..50°), **constante jusqu'à l'extrémité** ; jeu teal **4,16/4,14/4,20/4,02** (constante) et braise **1,02 → 3,16 → 0,94** de 5° à 70° (maximum à 35–40°, fuselée aux deux bouts). Rayon extérieur : canon 14,08–14,42 (teal) et 15,68–16,38 (braise) ; jeu **17,2–17,5** pour les deux. (`m12`,`m13`) | la concentricité exacte des arcs du canon avec le boîtier : le test à angles miroirs est incohérent (−0,82 / −2,75 / +1,43) parce que « 37% » et l'aiguille polluent le secteur teal à 140–165°. Je ne compare donc que des épaisseurs et des rayons extérieurs par secteur. |
| **M4** | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le cerclage du boîtier est un HALO, pas un trait, et la lunette intérieure du canon a disparu.** | profil radial de (R−B), médiane sur 288 rayons, filet exclu — canon : **plateau** à 113–114 de r 31,0 à 31,6 ⇒ NOMINAL **1,38** CSS / CŒUR **0,78** (57 % de plat), montée de 0 à 91 en 0,4 CSS ; jeu : **pic unique** sans plat, NOMINAL **2,28** (1920) / **2,60** (2400) CSS / CŒUR 0,66–0,78 (29 %), montée étalée sur 1,8 CSS. Le canon déclare `border:1.5px solid var(--laiton)`. **Lunette** (`.medaillon .lunette`, anneau inset 3px) : canon = maximum local **+18,5 L à r = 27,11 CSS (0,87 R)** suivi d'un creux à 0,92 R ; jeu = **aucun maximum local entre 0,80 et 0,97 R**, le profil descend jusqu'à 0,87 R puis remonte de façon monotone dans le cerclage. (`m09`,`m20`) | si la lunette est « absente » ou « fondue dans le halo » : mon instrument voit qu'elle n'est **pas distinguable du cerclage**, il ne peut pas dire laquelle des deux. |
| **M5** | MAJEUR | **NOUVEAU** en tant que grandeur (le r6 mesurait le contraste, pas la marche au bord du dock) | non | **Le dock ne pose aucun fond à lui** ⇒ à 1080×1920 les quatre libellés de navigation passent sous le plancher de doctrine. | contraste des libellés (encre (185,173,146)) — canon **7,13–8,40:1** ; jeu **2400 7,74–7,82:1** ; jeu **1920 3,54 · 3,66 · 3,64 · 3,76:1** (doctrine ≥ 4,5 pour un petit texte, capitale 5,81 CSS). Cause mesurée : **aucune marche de luminance au bord haut du dock** (x=20 CSS : −2,7 L à 1920) ; à 2400 la marche de −72 L est à y=784,00, soit **4 CSS sous** le bord du dock (779,92) — c'est le panneau de fond, pas le dock. Le canon déclare `.dock{background:linear-gradient(180deg,transparent,#070b12d8 40%)}`. Couche globale du dock : canon L 29,5 et 3,8 % de pixels > L 90 ; jeu 1920 **L 78,7 et 41,2 %**. (`m42`,`m45`,`m46`,`m55`) | l'alpha exact que poserait le voile du canon : je n'ai pas de capture « dock éteint » côté canon. |
| **M6** | MAJEUR | **NOUVEAU** | non | **La variante d'état `.chaud` n'est appliquée qu'à 2 de ses 4 éléments** : le libellé de chaleur reste en crème. | source du canon (lue) : `.tel.chaud .heatpct{color:var(--braise)}` (l. 64) et `--braise:#e0664a` = (224,102,74). Mesuré sur « Brûlant », mode du cœur des glyphes : **(234,224,200) 69 %** = `--creme`, la valeur de l'état CALME. Appliqué en revanche au boîtier (224,102,73) et au filet (224,102,73). (`m22`, source l. 31/41/64/65) | rien : la règle CSS a été relue à la ligne, le jeton `--braise` aussi. |
| **M7** | MAJEUR | **NOUVEAU** | **oui (probable)** | **Le ruban `.bandeau-alerte` du canon est absent** (« ✉ Sal a un rapport du soir — lire », plein-largeur, encadré de deux filets, à y 78–113). | canon : bloc d'encre x 64,7..269,0 / y 90,3..112,7 plus deux filets horizontaux ; jeu : rien dans la bande y 79..113 aux deux résolutions, ni dans la capture district-seule (inspection de la bande, `mesures/z_alerte_3.png`). `.bandeau-alerte{top:78px}` dans la source. (`m50`) | **s'il s'agit d'un composant non livré ou d'un compte sans alerte en attente.** Une image ne peut pas trancher : il faut le corps de la route (juge-données) ou une capture avec un rapport en attente. |
| **m1** | MINEUR | DÉJÀ APPLIQUÉ | non | Capitale du titre de fiche −15,7 %, et le titre remplit **exactement** sa boîte (marges nulles). | canon « LE VERGE D'OR » : 11 glyphes tous à **h = 10,33** CSS, x 124,33..266,00 (centré, 94 CSS de marge de chaque côté) ; jeu : capitales (R, I, L, L, 1501) **h = 8,71**, x **30,13..361,51** = 331,38 dans un `.titre` de **332** ⇒ marges **0,13 / 0,49** CSS. (`m36`) | — |
| **m2** | MINEUR | DÉJÀ APPLIQUÉ | non | Les chiffres du montant perdent 17 % de corps et descendent de 2,2 CSS. | canon « $ 24 850 » : chiffres **11,00–11,33** CSS, base 33,33 ; jeu « 9 627 820,00 € » : **9,44** (les 11 chiffres, identiques), base **35,57**. (`m38`) | — |
| **m3** | MINEUR | DÉJÀ APPLIQUÉ | non | Le filet du bandeau est 27 % trop fin (le correctif annoncé visait 1,00). | coupe verticale à x=300, **sans anti-crénelage d'aucun côté dans les deux images** ⇒ cœur = nominal : canon **3 px pleins (176,141,62) = 1,000 CSS** ; jeu **2 px pleins (224,102,73) = 0,726 CSS**. À ×2,755 la valeur due est 2,755 px : le rendu a arrondi à 2. (`m03`) | — |
| **m4** | MINEUR | DÉJÀ APPLIQUÉ | non | Les deux volutes décoratives du bandeau sont absentes. | sonde de segments horizontaux fins, balayage de **tout** le bandeau (la cible a pu bouger : le bloc ARGENT est décalé de +47,2 CSS) — canon : **2** segments, y 25,33..26,33, x **5,00..17,33** (11,67–12,33 CSS selon la ligne) et **370,33..387,00** (12,67–16,67 CSS) ; jeu : **aucun**. `.volute{width:34px;height:12px;opacity:.28;stroke:#eae0c8}` dans la source. **Contrôle de capacité sur la capture même** : la sonde y trouve la hampe de la flèche retour (x 31,58..38,11, 6,17–6,53 CSS, (238,241,242)) ⇒ elle n'est pas aveugle. (`m26`,`m27`) | — |
| **m5** | MINEUR | DÉJÀ APPLIQUÉ | non | Le disque du pivot est ~⅓ trop grand. | mi-alpha sur (R−B), coupes h/v : canon **3,71 × 3,46** CSS ; jeu **4,91 × 4,96** ⇒ +32 % / +43 %, aire ×1,9. (`m18`) | — |
| **m6** | MINEUR | DÉJÀ APPLIQUÉ | non | L'aiguille est 19 % trop courte **et n'atteint plus les arcs**. | canon : pointe à **16,06 CSS = 0,515 R**, elle **traverse** l'arc teal (bord ext. 14,1) ; jeu : **12,99 CSS = 0,400 R**, s'arrête **1,4–1,7 CSS avant** le bord intérieur de l'arc braise (14,34–14,70 à 35–40°). (`m17`,`m13`) | — |
| **m7** | MINEUR | DÉJÀ APPLIQUÉ | non | Le sous-libellé du cadran frôle le cerclage. | coin le plus éloigné du centre, pixels restreints au disque du boîtier — canon « HEAT » **19,56 CSS = 0,639** du rayon intérieur du cerclage, dégagement **11,06 CSS** ; jeu « CHALEUR » **28,80 CSS = 0,92**, dégagement **2,40 (2400) / 2,56 (1920) CSS**. (`m21`,`m53`) | — |
| **m8** | MINEUR | DÉJÀ APPLIQUÉ | en partie (la largeur suit le mot) | Le libellé principal du cadran est entièrement **sous** le centre du boîtier au lieu d'être à cheval. | canon « 37% » : 22,67 × 13,00 CSS, centre à **−0,67** du centre du boîtier (à cheval) ; jeu « Brûlant » : 37,39 × 12,70, centre à **+6,46** ⇒ déplacement de **7,13 CSS** vers le bas. Le canon pose `.heatpct{margin-top:-14px}`. La largeur (+65 %) suit le nombre de glyphes, pas le corps (hauteurs 13,00 contre 12,70). (`m21`) | — |
| **m9** | MINEUR | DÉJÀ APPLIQUÉ | non | Le boîtier du médaillon est 5 % trop grand et 1 CSS trop bas. | diamètre NOMINAL extérieur (mi-alpha sur R−B) : canon **64,00** CSS (= `.medaillon` 64) ; jeu **67,28** (1920) / **67,60** (2400) ⇒ +5,1 / +5,6 %. Ligne médiane du trait : 62,04 → 64,9–65,1. Centre y : 38,84 → 39,82 (**+0,98**). (`m09`,`m06`) | — |
| **m10** | MINEUR | DÉJÀ APPLIQUÉ | non | Le fond du cadran a perdu son éclairage **directionnel** ; il est remplacé par un vignettage concentrique. | médiane par secteur de 45° dans l'anneau 0,58..0,72 R, encre et arcs exclus — canon : amplitude inter-secteurs RGB **(18,9 ; 19,2 ; 22,9)**, L **19,4**, secteur le plus clair **90–135°** (haut-gauche, conforme à `radial-gradient(circle at 38% 30%,…)` lu dans la source) ; jeu : **(1,0 ; 1,2 ; 1,1)**, L **1,1**. Amplitude **radiale** : canon L 7,6, jeu L **24,6**. (`m15`) | — |
| **m11** | MINEUR | **NOUVEAU** | non | La plaque de fiche a la bonne opacité mais **ne floute pas** ce qui transparaît : l'art se lit net à travers (grue, marquages au sol, véhicules). | opacité mesurée **directement** contre la capture district-seule du même commit (contrôle : hors plaque, 0 pixel différent) — transmittance **7,0 % R · 3,7 % G · 1,3 % B**, conforme au canon (`background:linear-gradient(180deg,#0c1320**ef**,#080d17**f6**)` ⇒ 6,3 % → 3,5 %). Mais le canon pose aussi `backdrop-filter:blur(5px)` : la corrélation du fond de plaque est **plus forte avec l'art BRUT (r = 0,303) qu'avec l'art flouté à 5 CSS (r = 0,247)** ⇒ pas de flou. Amplitude visible : L 18,4 → **33,5** entre le décile d'art le plus sombre et le plus clair (0,3 % des pixels de la plaque). (`m31`,`m34`,`m57`) | — |
| **m12** | MINEUR | **NOUVEAU** | non | La flèche retour est d'un blanc neutre hors palette. | encre médiane **(236,239,240)** ; distance max-canal à `--creme` (234,224,200) = **40/255**, au blanc pur = 19/255. Boîte 8,35 × 4,72 CSS à (29,76 ; 23,96). (`m53`) | — |
| **m13** | MINEUR | **NOUVEAU** | non | `.aile.droite .val` (« Aube ») reste en crème alors que `.tel.chaud` demande `--braise` (l. 41). Même cause que **M6**. | mode du cœur des glyphes : **(234,224,200) 99 %**. (`m22`) | si `--braise` est *souhaitable* sur un quart de journée : c'est un arbitrage produit, pas une mesure. Je constate l'écart au témoin que le dossier m'impose. |
| **m14** | MINEUR | DÉJÀ APPLIQUÉ | non | À 1080×2400, un panneau de fond uni de 35,2 CSS s'intercale entre le filet du bandeau et le haut de l'art. | (34,38,49) de y **51,90 à 87,11** ⇒ **35,21 CSS = 4,0 %** de la hauteur d'écran ; ce n'est ni la couleur du bandeau (16,21,31) ni celle du ciel (156,170,188). Bande basse : dégradé (34,37,48) → (17,23,34) de 784,00 à 868, **occupée par le dock**. (`m49`) | — c'est ce panneau qui pose le nom du district sur le ciel clair (**B1**). |
| **m15** | MINEUR | **NOUVEAU** | non | Le bloc ARGENT arrive à 0,66 CSS de l'anneau nominal du médaillon. | dernier pixel `--or-vif` du montant : x **161,52** (y 26,50) ; bord extérieur **nominal** du cerclage : x **162,18** ⇒ jour **0,66 CSS** ; sur la ligne de l'encre elle-même, la lueur du cerclage commence à x 164,2 ⇒ jour visible **2,7 CSS**. Canon : **87,17 CSS**. (`m25`,`m23`) | l'intention : le déplacement du bloc est un ARBITRAGE ouvert (voir table). Je ne fais que mesurer la marge que le dossier demande. |

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce qui est assumé | rendu proprement ? | mesure |
|---|---|---|
| 3 chiffres de la fiche → bandes qualitatives | **oui** : aucune case vide, aucun scalaire inventé, les 3 cellules gardent leurs séparateurs (centres 140,10 / 250,63 contre 140,00 / 251,67) et leurs centres de cellule ; valeurs « Au repos · Coupée · Sain », libellés « REVENU · CHAÎNE · ÉTAT » | `m54`,`m37` |
| libellés du dock EMPIRE · FAMILLE · FILIÈRE · PLUS | **oui** : 4 onglets, capitales, aucun coupé, bande d'encre y 667,85..675,47 continue | `m45` |
| nom du district affiché | **rendu**, mais **illisible à la cible** ⇒ **B1** (ce n'est plus « rendu proprement ») | `m48` |
| l'heure → quart du jour (« Aube ») | **oui**, français, pas d'enum brut ; encre `--creme` — mais voir **m13** pour la couleur d'état | `m22`,`m23` |
| ronds du dock vides | **oui** : 4 ronds, diamètre et pas conformes ; aucun libellé de repli visible | `m42` |
| bouton RETOUR en haut à gauche | **oui**, il ne recouvre pas l'aile gauche (boîte 8,35 × 4,72 à x 29,76..38,11) ; couleur hors palette ⇒ **m12** | `m53` |
| référence de nuit / capture au quart de jour | **oui** ; palette restreinte au chrome et à la fiche comme demandé (§ contrôle positif 21) | `m55` |
| bloc ARGENT déplacé vers le centre | il **ne touche ni ne recouvre** le médaillon : jour de **0,66 CSS** au bord nominal ⇒ reste dans l'assumé, mais à 0,66 CSS de sa borne ⇒ mesuré en **m15** | `m25` |
| boîtier + filet + valeur d'aile droite + libellé de chaleur en `--braise` | **2 sur 4** : boîtier (224,102,73) ✓ et filet (224,102,73) ✓ ; « Brûlant » et « Aube » restent `--creme` ⇒ **M6** et **m13** | `m22` |

---

## ARBITRAGES (pas corrigibles côté client / décision produit)

| sujet | mesure | remarque |
|---|---|---|
| **Polices** | la référence a été rendue avec **Noto Serif / Noto Sans** (`fc-match` du dossier), le client embarque **DejaVu** | tout écart de famille ou de chasse est un arbitrage ; je n'ai comparé que des **hauteurs de capitale** |
| **Bloc ARGENT poussé par la flèche retour** | décalage **+47,2 CSS** (ARGENT x 16,33 → 64,24) ; marge au médaillon **0,66 CSS** (nominal) / **2,7 CSS** (lueur, sur la ligne de l'encre) | signalé urgent par le dossier |
| **Titre de fiche pleine largeur** | 331,38 CSS dans une boîte de 332 ⇒ marges 0,13/0,49 ; capitale ramenée à 8,71 (−15,7 %) | conséquence mesurable du choix de contenu (**m1**) |
| **Casse du titre** | canon : capitales + interlettrage `.13em` ; jeu : casse mixte | non couvert par la table des assumés |
| **Ronds du dock vides** | canon `.dockb .rond img{20×20}` ; jeu : aucun glyphe | arbitrage user « j'aime pas les icônes », à remonter tel quel |
| **Libellés anglais de la RÉFÉRENCE** | `HEAT`, `$ 24 850` | maquette à mettre à jour (ruling « fr réel ») — noté une fois, jamais compté comme écart d'écran |
| **« 37% » → « Brûlant »** | bande qualitative au lieu d'un scalaire | même famille que les bandes de la fiche (R2.2) ; non listé dans la table des assumés du dossier |
| **3ᵉ valeur de stats** | canon « 12% » en `--braise` (224,102,74) ; jeu « Sain » en `--creme` | dépend des données : une bande « Sain » en braise serait un contresens |

---

## 5. Autres résolutions

**1080×2400 (cible).** L'inventaire tient : rien de coupé, rien hors cadre, rien qui déborde de son
parent, gouttière respectée (fiche 599,61..769,12, dock à 779,92 ⇒ 10,8 CSS). Les proportions
internes sont conservées (le chrome est **bit-identique** entre la planche fiche et la planche
district ; la fiche est décalée en bloc de +174,222 CSS). **Écarts propres à cette résolution** :
(a) **B1** — le nom du district tombe sur le ciel clair et rend **1,58:1** ; (b) **m14** — le panneau
de fond uni de 35,21 CSS entre le filet du bandeau et l'art ; (c) le cerclage y est légèrement plus
large qu'à 1920 (nominal 2,60 contre 2,28 CSS).

**1080×1920 (principale).** Écart propre : **M5** — le dock n'a aucun voile et l'art y est clair,
les quatre libellés tombent à **3,54–3,76:1** ; le bandeau subit la même chose de façon moins grave
(fond (65,73,82) au lieu de (17,24,32), ARGENT 5,15:1 et montant 6,57:1 — au-dessus du plancher,
mais la couche globale du bandeau passe de L 30,9 à **L 66,0**).

**Ce que je n'ai pas** : une seule orientation (portrait), deux résolutions, aucune autre proportion.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Animation.** Le dossier ne fournit aucune paire T / T+1 s. Le ruling « aucune animation sur un
   nouvel écran » n'est donc **pas testé**. *Mesure qui trancherait* : deux captures du même état à
   1 s d'écart, compte de pixels différents hors chrome hérité.
2. **`.bandeau-alerte` (M7)** : une image ne distingue pas « composant non livré » de « aucun rapport
   en attente sur ce compte ». *Mesure* : le corps de la route qui alimente l'alerte (juge-données),
   ou une capture prise avec un rapport en attente.
3. **Barre de ratio.** Le jeu rend **74,04 CSS entièrement en `--or`** ; le canon rend 49,33 d'or +
   22,67 de piste `#5a6376`, sur un `.ratio{width:74px}`. **74,04 ≈ 74 : un ratio à 100 % couvrirait
   la piste exactement.** Je ne peux donc **pas** distinguer « la piste n'est pas dessinée » de « le
   ratio vaut 100 % ». *Mesure* : une capture d'un compte au ratio < 100 %.
4. **Lunette (M4)** : je mesure qu'aucun anneau n'est **distinguable** du cerclage entre 0,80 et
   0,97 R ; je ne peux pas dire si elle est absente ou fondue dans le halo. *Mesure* : une capture
   avec le cerclage neutralisé, ou le rendu de la lunette seule.
5. **Concentricité des arcs du canon** : test à angles miroirs incohérent (−0,82 / −2,75 / +1,43 CSS
   selon l'angle, aucun décalage de centre ne les égalise) parce que « 37% » et l'aiguille polluent le
   secteur teal à 140–165°. Je ne conclus donc rien sur un décalage global du cadran du canon ; mes
   comparaisons portent sur des épaisseurs et des rayons **par secteur**.
6. **Voile du dock du canon** : je lis sa déclaration CSS mais je n'ai pas de capture « dock éteint »
   côté canon, donc je ne peux pas chiffrer l'alpha qu'il pose réellement — seulement constater que
   le jeu **ne pose aucune marche** au bord du dock.
7. **Marqueurs de bâtiments** (~18 pastilles sur l'art) et **pastille dorée** à (196 ; 96) : le canon
   est un gros plan sans marqueurs ; le dossier interdit de compter la quantité d'art. Non jugés.
8. **Badge de notification du dock** (`.dockb small.disc`, 8 CSS, `--or`, sur FAMILLE au canon) :
   absent en jeu, mais c'est un **état de données** — je ne peux pas savoir s'il y a quelque chose à
   notifier. *Mesure* : une capture avec une notification en attente.
9. **Valeurs affichées.** Le dossier cite bien la ligne
   `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` : les valeurs sont donc
   comparables aux corps de la base gelée. Je n'ai néanmoins **pas** confronté les valeurs au back
   (ce n'est pas mon mandat) — seulement leur forme, leur langue (français partout, aucun enum brut,
   aucun repli anglais atteint l'écran) et leur mise en page.
10. **`.chaud` rendu.** Le témoin d'état est une **règle CSS**, pas une image : je n'ai pas de PNG du
    canon à l'état BRÛLANT. J'ai relu les 4 règles dans la source (l. 31, 41, 64, 65) et le jeton
    `--braise:#e0664a` = (224,102,74) ; c'est sur cette lecture que reposent **M6** et **m13**.

---

## Annexes

### A1. Inventaire de la référence (fiches, format compact)

| id | catégorie | parent | bbox CSS | forme | remplissage | bord | texte | relations |
|---|---|---|---|---|---|---|---|---|
| `R.bandeau` | chrome | `.tel` | 0..392 × 0..52 | bande | verre fumé, L moy **33,4**, 6,0 % d'encre | filet bas `--laiton` **1,000 CSS**, plein de x≈100 à 300, fondu sous 60 et au-delà de 350 | — | traverse toute la largeur |
| `R.aile.g` | texte | `R.bandeau` | 16,33..77,00 × 11,00..34,67 | 2 lignes | — | — | « ARGENT » `--creme-2` cap **6,00** ; « $ 24 850 » `--or-vif` chiffres **11,00–11,33** | aligné à gauche, x0 = 16,33 |
| `R.ratio` | jauge | `R.bandeau` | 16,33..89,67 × 40,67..42,67 | trait | or **49,33** + piste `#5a6376` **22,67** (total 73,3) | — | — | sous le montant, +6,0 CSS |
| `R.aile.d` | texte | `R.bandeau` | 277,67..375,00 × 12,67..35,67 | 2 lignes | — | — | « JOUR 12 · SOIRÉE » `--creme-2` ; « 21:40 » `--creme` h **10,00** | bord droit 375,00 |
| `R.volute.g` / `.d` | ornement | `R.bandeau` | 5,00..17,33 et 370,33..387,00 × 25,33..26,33 | trait + volute | `#eae0c8` à 28 % | — | — | à mi-hauteur des ailes |
| `R.medaillon` | médaillon | `.tel` | 163,84..227,84 × 6,84..70,84 | cercle Ø **64,00** nominal | dégradé radial **directionnel** (38 % 30 %), amplitude inter-secteurs L **19,4** | cerclage `--laiton` NOMINAL **1,38** / CŒUR **0,78** CSS | — | centre (195,84 ; 38,84) |
| `R.lunette` | anneau | `R.medaillon` | r = **27,11** CSS (0,87 R) | anneau | bosse **+18,5 L**, creux à 0,92 R | 1px `#ffffff1e` | — | inset 3 px |
| `R.arc.teal` | jauge | `R.medaillon` | 89°..198° | arc | (70,103,114) | épaisseur **2,44–2,54**, ext. 14,08–14,42 | — | extrémités coupées net |
| `R.arc.braise` | jauge | `R.medaillon` | −17°..51° | arc | (133,70,61) | épaisseur **2,46–2,52**, ext. 15,68–16,38 | — | **38°** de neutre au sommet |
| `R.aiguille` | index | `R.medaillon` | 132,4°, longueur **16,06** (0,515 R) | trait | `--creme` | 1,40 CSS | — | traverse l'arc |
| `R.pivot` | disque | `R.medaillon` | **3,71 × 3,46** | cercle | `--laiton` | — | — | **+4,83 CSS sous** le centre |
| `R.heatpct` | texte | `R.medaillon` | 184,67..207,33 × 31,67..44,67 | — | — | — | « 37% » `--creme` h 13,00, **à cheval** sur le centre | — |
| `R.heatlib` | texte | `R.medaillon` | 185,33..205,67 × 50,67..55,67 | — | — | — | « HEAT » `--creme-2` cap **5,00**, coin à **0,639** R | dégagement 11,06 |
| `R.alerte` | ruban | `.tel` | 1..391 × 79,00..112,81 | bande + 2 filets | — | — | « ✉ **Sal** a un rapport du soir — lire » | plein-largeur |
| `R.fiche` | plaque | `.tel` | 13,00..379,00 × 424,52..593,71 | rect r **14** | `#0c1320ef`→`#080d17f6` + `blur(5px)` | 1px `#ffffff17` ; filet haut `--laiton` 1 CSS | — | L moy 35,4 |
| `R.titre` | texte | `R.fiche` | 124,33..266,00 × 446,67..457,00 | — | — | — | capitales **10,33**, `--or-vif`, **centré** | 94 CSS de marge |
| `R.soustitre` | texte | `R.fiche` | 122,33..268,33 × 470,33..478,00 | — | — | — | capitales **6,33**, `--creme-2` | — |
| `R.stats` | rangée | `R.fiche` | 51,33..336,67 × 490,33..527,67 | 3 cellules | — | 2 séparateurs 1px à **140,00** et **251,67**, h **37,67** | valeurs h 9,67–11,33 ; libellés cap **6,00** | 3ᵉ valeur `--braise` |
| `R.btn.or` | bouton | `R.fiche` | 29,00..134,33 × 540,00..579,67 | rect **r 9** | dégradé `#e9c56b`→`#c99a37` | 1px `#8a611c` | « COLLECTER » cap **8,00** | retrait de coin **8,67 → 2,67** |
| `R.btn.ligne` ×2 | bouton | `R.fiche` | 150,00..275,00 et 280,00..363,00 × 540..579,67 | rect r 9 | `#ffffff0a` | 1px `#ffffff2a` | cap 8,00 | — |
| `R.dock` | chrome | `.tel` | 1..391 × 605,70..695,87 | bande | voile `transparent → #070b12d8 40 %` ; L moy **29,5**, 3,8 % > L 90 | — | — | — |
| `R.rond` ×4 | médaillon | `R.dock` | Ø **46,00**, centres 93,67 · 161,67 · 229,67 · 297,67 | cercle | dégradé radial dir. | 1px `#ffffff22` | icône 20×20 | pas **68,00** (`m58`) |
| `R.pointe` | indicateur | `R.dock` | 87,00..101,00 × 663,67..665,67 | trait | `--laiton` | — | — | **14,00 × 2,00**, sous EMPIRE |
| `R.dock.lib` ×4 | texte | `R.dock` | y 669,00..677,00 (bande d'encre h 8,00) | — | — | — | capitales **6,00** `--creme-2`, **7,13–8,40:1** | — |

### A2. Inventaire de la capture principale (1080×1920) — ce qui DIFFÈRE de A1

Tout ce qui n'est pas listé ici est dans le contrôle positif (égal dans la tolérance).

| id | ce qui diffère | valeur |
|---|---|---|
| `J.bandeau` | fond **beaucoup plus clair** (voile insuffisant sur art clair) | L moy **66,0** contre 33,4 ; filet **0,726** CSS, couleur `--braise` (état) |
| `J.aile.g` | **décalée de +47,2 CSS** ; chiffres plus petits ; base plus basse | x0 **64,24** ; chiffres **9,44** ; base 35,57 |
| `J.ratio` | **entièrement or**, aucune piste visible | x 63,88..137,93 = **74,04** CSS, épaisseur 2,18 |
| `J.volutes` | **absentes** | 0 segment (contrôle de capacité positif) |
| `J.retour` | **en trop** (assumé) | flèche (236,239,240), 8,35 × 4,72 à (29,76 ; 23,96) |
| `J.medaillon` | +5,1 % de diamètre, +0,98 CSS plus bas, cerclage en **halo** | Ø nominal **67,28** ; NOMINAL 2,28 / CŒUR 0,66 |
| `J.lunette` | **aucun maximum local** entre 0,80 et 0,97 R | — |
| `J.arc.teal` | **plus épais, extrémités fuselées, plus à l'extérieur** | 4,02–4,30 ; ext. 17,2–17,4 ; secteur 81..179° |
| `J.arc.braise` | **fuselé**, secteur raccourci | 1,02 → 3,16 → 0,94 (5°→70°) ; ext. 17,4–17,5 ; secteur 2..68° ⇒ **12°** de neutre |
| `J.aiguille` | plus courte, n'atteint plus l'arc | **12,99** (0,400 R) ; angle 32,0° (dans le secteur braise ✓) |
| `J.pivot` | +⅓ de diamètre | **4,91 × 4,96** ; +5,37 CSS sous le centre (bon côté) |
| `J.heatpct` | mot au lieu d'un scalaire, **crème au lieu de braise**, entièrement sous le centre | (234,224,200) ; 37,39 × 12,70 ; centre **+6,46** |
| `J.heatlib` | frôle le cerclage | coin à **0,918** R, dégagement 2,56 |
| `J.alerte` | **absent** | 0 pixel |
| `J.nomdistrict` | **en trop** (assumé) ; encre (209,200,179) + contour | 5,44..38,47 × 87,47..92,19 ; capitale 4,72 ; **4,57:1** ici, **1,58:1** à 2400 |
| `J.fiche` | boîte et rythme conformes ; l'art transparaît **net** | 368,04 × 169,50 ; transmittance 7,0/3,7/1,3 % ; **pas de flou** |
| `J.titre` | capitale −15,7 %, remplit la boîte | 8,71 ; x 30,13..361,51 dans 332 |
| `J.stats` | 3 bandes qualitatives, 3ᵉ valeur en crème | séparateurs 140,10 / 250,63 |
| `J.btn.or` | **remplissage à angles droits** + tracé arrondi intérieur | retrait de coin **0,00** ×9 ; boîte 104,53 × 39,56 |
| `J.dock` | **aucun fond propre** | marche au bord **−2,7 L** ; L moy **78,7**, 41,2 % > L 90 |
| `J.dock.lib` | contraste sous le plancher | **3,54 · 3,66 · 3,64 · 3,76:1** |
| `J.pointe` | **présente et correcte** | 13,79 × 1,81, centre 94,00 ; témoin ⑥ : centre 162,07 |

### A3. Correspondance des repères

- ×3,0000 (référence) · ×2,7551 (captures) ; **aucun décalage x** ; **aucun décalage y à 1920** ;
  **+174,222 CSS en y à 2400** (mesuré sur le filet doré de la fiche, `m30`).
- Centre du boîtier du médaillon utilisé par toutes les mesures polaires :
  canon **(195,840 ; 38,837)**, jeu **(195,817 ; 39,820)** — ajustement de cercle par couleur du
  cerclage sur 144 rayons, filet exclu (`m06`).
- Rayon de référence R = ligne médiane du cerclage : canon **31,16**, jeu **32,50** CSS.

### A4. Scripts

`mesures/lib.py`, `lib2.py` (échelles, échantillonnage bilinéaire, contraste WCAG) puis, un par
grandeur ou famille de grandeurs, chacun imprimant la taille des images qu'il ouvre :

`m01` `m04` `m06` `m08` boîtier (masque, ajustement de cercle) · `m02` `m03` filet · `m05` `m09`
profil radial et netteté du cerclage · `m07` coupes brutes · `m10`–`m13` arcs (rayon, secteurs,
épaisseur, bords) · `m14` recherche d'un polygone dans le cadran · `m15` fond du cadran
(inter-secteurs + radial) · `m16`–`m18` pivot et aiguille · `m19` couleurs des arcs sur fond local ·
`m20` lunette · `m21` `m53` libellés du cadran · `m22` encres (mode du cœur des glyphes) ·
`m23`–`m25` géométrie du bandeau, barre de ratio, marge au médaillon · `m26` `m27` volutes (avec
contrôle de capacité) · `m28`–`m34` `m57` plaque de fiche (opacité, alpha effectif, flou) ·
`m35`–`m41` typographie et boutons de la fiche · `m42`–`m46` dock (indicateur, libellés, voile) ·
`m47` `m48` nom du district · `m49` bandes 2400 · `m50` ruban d'alerte · `m51` `m52` `m54` divers,
boîte de la plaque, séparateurs · `m55` palette · `m58` ronds et libellés du dock · `m56` concentricité (test **non concluant**,
consigné en §6).

Vues produites : `vue_ref` `vue_c19` `vue_c24` `vue_d24` `vue_t24` (à l'échelle CSS),
`z_bandeau_*` `z_med_*` `z_cadran_c19` `z_fiche_*` `z_btn_*` `z_dock_*` `z_volute_*`
`z_nomdistrict_*` `z_alerte_3` `z_plaque_struct_*`.
