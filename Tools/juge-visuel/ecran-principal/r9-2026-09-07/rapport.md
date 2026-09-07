# Juge visuel ⊥ — ① L'intérieur de district (« le HUD de Brennar ») — r9 — 2026-09-07

Juge à contexte vierge. Aucun rapport r1→r8 lu, aucun code Unity ouvert, aucune note
d'implémentation. Seules sources : `dossier.md`, `captures-provenance.md`, `journal-joint.md`,
`grandeurs-r8.md` (mesures sans verdict), `ecran-canon.png`, `mesure-canon.txt`, la source
`hud-brennar.html`, et les trois planches. Instruments : `mesures/*.py` (PIL, pas de numpy) ;
chacun imprime la taille des images qu'il ouvre et porte son contrôle.

## Verdict : NON APPROUVÉ

Le chrome, la fiche et le dock sont fidèles au canon à moins de 2 CSS près et le voile du bandeau
est réparé ; ce qui casse la lecture est la **couche district** : deux ancres sur du sol nu, deux
libellés superposés illisibles, et un libellé de type à 1,81 CSS de capitale — soit 29 % de la plus
petite typographie de l'écran — alors qu'il est le **seul** porteur du type (les 11 marqueurs sont
identiques au pixel).

## Contrôle positif — ce que l'instrument trouve ÉGAL

Échelle posée par `dossier.md` : référence ×3,0 (1176 px = 392 CSS), captures ×2,7551
(1080 px = 392 CSS). Toutes les valeurs ci-dessous sont en CSS.

| # | grandeur | canon | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | **plaque de fiche — boîte** (par différence district/fiche à 2400) | 366,00 × 169,19 à (13,00 ; 424,52) | **368,04 × 169,50** à (11,98 ; 599,61) | ≤ 2,04 | `m33` |
| 2 | **plaque — ancrage au BAS de l'écran** | 272,36 du bas | **271,42** (2400) · **271,49** (1920) | ≤ 0,94 | `m47` |
| 3 | plaque — coins arrondis, retraits sur 18 lignes | `border-radius:14px` | 10,89 → 2,18, **identiques à gauche et à droite au pixel** | — | `m33` |
| 4 | **rythme vertical de la fiche, 5 bandes** (titre · sous-titre · valeurs · libellés · actions) | 22,00‥32,67 · 43,67‥53,33 · 71,33‥82,33 · 91,67‥99,33 · 115,67‥155,00 | 20,69‥32,30 · 44,64‥51,18 · 69,69‥83,84 · 91,10‥99,09 · 115,06‥154,26 | ≤ 2,15 | `m41` |
| 5 | **dégradé vertical du CTA** (4 derniers échantillons) | (226,187,95)(219,178,84)(212,169,73)(205,160,62) | (225,186,94)(218,177,83)(212,168,73)(206,160,62) | **≤ 1/255** | `m43` |
| 6 | boutons — largeurs et positions | CTA 103,33 ; b2 105,00 ; b3 105,00 ; x 17,00 / 143,33 / 257,67 | 104,53 ; 104,17 ; 104,53 ; x 15,97 / 142,64 / 256,25 | ≤ 1,9 | `m43`,`m44` |
| 7 | séparateurs de stats (centres) | 127,00 · 238,67 | 128,13 · 238,65 | ≤ 1,13 | `m43` |
| 8 | filet haut de la fiche | `--laiton` (176,141,62) | (176,141,61) | 1/255 | `m41` |
| 9 | filet du bandeau — y et couleur | y 51,00 ; `.tel.chaud` ⇒ `--braise` (224,102,74) | y **51,18** ; **(224,102,73)** | 0,18 · 1/255 | `m23` |
| 10 | **les QUATRE porteurs de `.chaud`** (filet · valeur d'aile droite · heatpct · boîtier) | `--braise` | (218,100,71) · (224,102,73) · (224,102,73) · (224,102,73) | ≤ 6/255 | `m23`,`m25`,`m21` |
| 11 | centre du médaillon | (195,83 ; 38,84) — la CSS pose (196 ; 39) | (195,82 ; 39,81) | 0,01 · 0,97 | `m03` |
| 12 | couleurs de crête des arcs | teal (69,102,114) · braise (133,70,62) | teal (70,98,108) · braise (133,76,70) | ≤ 8/255 | `m16` |
| 13 | **l'aiguille pointe dans le secteur braise** (cadran NON inversé) | — | aiguille 29,8° ; secteur braise 19,6‥65,3° | — | `m18`,`m20` |
| 14 | ronds du dock — Ø et centres | 46,00 ; 94,00 · 162,00 · 230,00 · 298,00 | 44,64–45,01 ; **93,83 · 161,88 · 229,76 · 297,81** | ≤ 1,4 / ≤ 0,24 | `m49` |
| 15 | **indicateur d'onglet actif** | 14,00 × 2,00, `--laiton` (176,141,62), centre 93,83 | 13,79 × 1,81, (176,141,61), centre **93,83** | ≤ 0,21 · 1/255 · 0,00 | `m49` |
| 16 | libellés du dock — encre et contraste | (184,172,144), 8,35:1, bande 6,33 | **(185,173,146) = `--creme-2` exact**, 8,30:1, bande 6,53 | 0/255 | `m38`,`m50` |
| 17 | libellé ARGENT | `--creme-2` (185,173,146), 8,01:1 | (185,173,146), 8,53:1 | 0/255 | `m25` |
| 18 | encre du montant | `--or-vif` (242,201,107) | (242,201,106) | 1/255 | `m25` |
| 19 | sous-titre et libellés de stats de la fiche | `--creme-2`, capitales 7,00 et 6,67 | `--creme-2` exact, 6,90 et 6,53 | 0/255 · ≤ 2 % | `m45` |
| 20 | valeurs de stats — colonnes 1 et 2 | `--or-vif` · `--creme` | (242,201,106) · (234,224,200) | ≤ 1/255 | `m45` |
| 21 | **voile du bandeau — composition sur le MÊME art** (r8 mesurait 29/255) | prédiction CSS sRGB | écart médian **4,3/255** ; L* mesuré 6,6 contre 7,9 prédit | −1,3 L* | `m27`,`m28` |
| 22 | **indépendance de résolution de la couche district** | — | **100,00 %** des 84 240 échantillons bit-identiques à +240 px (contrôle négatif : décalage 0 → 2,08 % ; ±1 → 67,5 %) | 0 | `m28` |
| 23 | couche globale de la FICHE (L\* moyen · densité d'encre) | 27,1 · 9,7 % | 27,4 · 10,5 % | ≤ 0,8 % | `m46` |
| 24 | couche globale du BANDEAU | 20,8 · 5,8 % | 19,6 · 6,6 % | ≤ 1,2 | `m46` |
| 25 | ouvrir la fiche ne déplace RIEN d'autre : les deux planches 2400 sont identiques hors plaque | — | 2 composantes seulement : la plaque (472 382 px) + 1 tache de 10 px | — | `m33` |
| 25b | **les 11 marqueurs de bâtiment sont le MÊME dessin** | — | 9 sur 11 **bit-identiques** au premier (0/255 sur 197 px) ; les 2 autres ne diffèrent que par l'art qui transparaît | 0 | `m51` |
| 26 | **contrôles des instruments** : l'ajustement de cercle retrouve le médaillon déclaré (D 62,63 mesuré / 62,50 CSS de ligne médiane) · l'instrument d'étendue retrouve la source (teal **89,7°** pour 90,0 ; braise **59,3°** pour 60,5) · l'instrument d'aiguille retrouve `rotate(-42)` (**132,6°**) · arc synthétique R=57 / 90° rendu **57,14 / 90,0°** | — | — | — | `m03`,`m20`,`m18`,`m17` |

## 0. L'écran, tel que la maquette le dit

**But** — voir son quartier vivant, repérer *ses* bâtiments, en toucher un pour lire ce qu'il vaut,
et décider : COLLECTER · BLANCHIR · AMÉLIORER.

**Ordre de lecture** — (1) le **médaillon** central : c'est l'objet le plus contrasté et le seul
cerclé, posé sur l'axe, il débordE sous la barre ; (2) l'**argent** en or, seul or du bandeau, à
gauche, avec son fil de ratio ; (3) la **ville** peinte, qui occupe les deux tiers de la hauteur ;
(4) la **fiche** en verre fumé quand elle s'ouvre, avec son unique CTA doré ; (5) le **dock**, quatre
ronds gravés, gris et discrets.

**Zones** — barre de verre fumé (52 CSS) portant deux ailes et le médaillon · bandeau d'alerte
éphémère (top 78 CSS) · art plein cadre · fiche (366 × 169 CSS, ancrée bas) · dock (390 × 90 CSS).

**Traits d'identité** — (a) le médaillon-montre : bézel laiton **fin**, cadran **bombé** par un
dégradé décentré, arcs minces, grosse valeur au centre ; (b) l'**or réservé à l'argent** ; (c) le
verre fumé partout (barre, fiche, dock) ; (d) un **seul** CTA coloré ; (e) zéro badge permanent :
l'information passe par des bandeaux éphémères et par la ville elle-même.

*Attention de lecture* : les six pastilles numérotées ①–⑥, le bouton 🌙 et le bouton 🔥 de la
référence sont les **call-outs de la maquette** (`.co`, `.bascule`, `.chaudb` dans la source) et non
des parties d'écran. Ils sont exclus de l'inventaire et de toute mesure.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour le **chrome**, la **fiche** et le **dock** : même rythme (5 bandes à ≤ 2,15 CSS), même
plaque, même CTA au bit près, même dock au 0,24 CSS près, mêmes jetons de couleur (or-vif, crème-2,
laiton, braise à 0 ou 1/255), même clarté globale (L\* 27,4 contre 27,1 dans la fiche). Le voile du
bandeau, qui ratait de 29/255 au tour précédent, compose désormais à **4,3/255** de ce que la CSS du
canon produirait sur le même art : c'est fermé, et le contraste du montant y gagne (11,74:1).

Ce qui ne se lit pas, c'est la **carte** — et je ne parle pas du palier de zoom, qui est un choix de
cadrage, mais du **repérage**. Onze pastilles **rigoureusement identiques** (mesuré : 9 sur 11
bit-identiques, 0/255 sur 197 px ; les 2 autres ne diffèrent que par l'art qui transparaît) dont la
seule information distinctive est un libellé de **1,81 CSS de capitale, soit 5 px** sur une planche
1080×2400 — contre 6,33 CSS pour les libellés du dock, la plus petite typo du canon. Le correctif
annoncé tient sur sa lettre — **les 11 cellules portent bien un libellé de type** — mais pas sur son
but : il ne discrimine pas, parce qu'on ne le lit pas. Deux de ces libellés ne se lisent
pas du tout : l'un est la **superposition de deux chaînes** (deux bâtiments partagent la même ancre),
l'autre passe sur une verrière claire à 4,49:1. Et deux pastilles sont posées sur du **sol nu** —
l'une sur la chaussée entre deux immeubles, l'autre sur le quai au pied d'une grue.

Troisième écart de lecture : le **médaillon a perdu son relief**. Le cadran du canon est bombé
(amplitude inter-secteurs (19,19,23), ΔL\* 9,3, le clair en haut-gauche, exactement le
`radial-gradient(circle at 38% 30%)` de la source) ; celui du jeu est **plat** ((1,1,2), ΔL\* 0,6).
Le bézel, fin et net au canon (1,35 CSS à mi-hauteur, plateau 69 %), est **flou** en jeu (2,60 CSS,
plateau 30 %), les arcs sont 1,7× trop épais, et « Brûlant » remplit le boîtier jusqu'à **1,08 CSS**
du cerclage. La montre de gousset est devenue un voyant rouge.

Enfin, l'ordre de lecture est perturbé au premier regard par une collision : le montant
« 9 627 820,00 € » vient **à 1,09 CSS** de la lueur du médaillon, là où le canon ménage 89,00 CSS.

## 3. Écarts

Format imposé par `dossier.md`. Gravité : liste fermée à trois valeurs ; ASSUMÉ et ARBITRAGE sont
dans des tables à part et ne sont pas comptés ici. `critère` = NOUVEAU dès que la grandeur ou
l'instrument n'existait pas au tour précédent (référence : `grandeurs-r8.md`).

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | non | **Deux libellés de type superposés au marqueur B03** — un seul marqueur détecté, deux chaînes dessinées au même centre : le mot est un pâté. Deux bâtiments partagent la même ancre. | marqueur B03 (296,883) px = (107,44 ; 320,50) CSS ; encre du libellé x 247‥328 px, 29,76 CSS de large — même largeur qu'un « Commerce-écran » seul (27,95 CSS en B07) mais glyphes doublés. Preuve côte à côte : `mesures/vues/z-collision-preuve.png` (B07 et B10 lisibles, B03 non). `m34`,`m32` | combien de bâtiments exactement sous cette ancre (2 minimum) — hors image |
| `B2` | BLOQUANT | NOUVEAU | non | **Deux marqueurs sur du sol nu** : `Serre` (B06) sur la chaussée entre deux immeubles, dans la flaque d'un lampadaire ; `Commerce-écran` (B11) sur le quai pavé, au pied d'une grue, entre des fûts et une caisse. Viole « tout doit être construit ». | 2 des 11 marqueurs ; B06 (305,947) px = (110,70 ; 343,73) CSS ; B11 (148,1496) px = (53,72 ; 542,99) CSS. Vues : `z-B06-serre.png`, `z-B11-quai.png`. `m32` | les 9 autres : 8 sur façade, 1 sur toiture (B09) — jugé à l'œil sur planche-contact, pas mesuré |
| `B3` | BLOQUANT | NOUVEAU | non | **Le libellé de type ne se lit pas** — et il est le SEUL porteur du type : les 11 marqueurs sont identiques (même anneau, même goutte). Traits de 1 px, contreformes bouchées. | capitale **1,81 CSS = 5 px** (« L » de Laboratoire, rangs 800‥804, carte de pixels `m37`) contre **6,33 CSS** pour les libellés du dock du canon et 6,53 en jeu (`m38`) ⇒ **29 %**. Et les marqueurs ne discriminent rien : **9 des 11 sont BIT-IDENTIQUES** au premier (écart max **0/255** sur les 197 px du disque r = 8), les 2 autres ne diffèrent que par l'art qui transparaît (10 % et 5 % des px). Contrôle négatif du même instrument : un marqueur de lieutenant diffère sur **54 à 69 %** des px. `m51`,`m32`,`m37` | si une taille dynamique existe à un autre niveau de zoom (une seule planche par état) |
| `M1` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le cerclage du médaillon est flou**, pas net : le canon a un bord franc, le jeu une bosse gaussienne. | profil radial médian de (R−B) sur 720 rayons : canon plateau 30,50‥32,10 CSS, **1,35** à mi-hauteur, **1,60** à 10 %, plateau/total **69 %** ; jeu **2,60** à mi-hauteur, **3,65** à 10 %, plateau **30 %**. Diamètre extérieur à 10 % : **68,60** contre 64,20. `m04` | — |
| `M2` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Arcs du cadran 1,7× trop épais** (déclaré mesuré-non-corrigé par le dossier ⇒ RÉCURRENT r7·r8·r9). | épaisseur = aire ÷ longueur de ligne moyenne, composante connexe : canon teal **2,54** / braise **2,47** ; jeu **4,34** / **4,10** ⇒ **+71 % / +66 %**. Contrôle : la même méthode retrouve 2,54 pour un `stroke-width` source de 2,45 CSS ; arc synthétique 90°/R57 rendu à 0,0°/0,14 px. `m20`,`m17` | — |
| `M3` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le cadran a perdu son bombé** : le canon est éclairé en haut-gauche, le jeu est uniformément plat. | médiane par secteur de 45° dans l'anneau 0,58‥0,72 R, arcs et encre exclus : canon amplitude RGB **(19, 19, 23)**, **ΔL\* 9,3**, secteur le plus clair **90‥135°** (conforme au `circle at 38% 30%` de la source) ; jeu **(1, 1, 2)**, **ΔL\* 0,6**. `m48` | — |
| `M4` | MAJEUR | DÉJÀ APPLIQUÉ | largeur oui, position non | **Le texte du médaillon ne tient plus dans son boîtier** : « Brûlant » occupe 91 % du diamètre intérieur et frôle le cerclage ; « CHALEUR » aussi ; les deux sont poussés vers le bas. | « Brûlant » 57,35 × 8,35 CSS, coin d'encre à **0,966 R_int**, dégagement **1,08 CSS** (canon « 37% » 22,67 large, 0,419 R_int, dégagement **17,75**) ; « CHALEUR » 33,76 large, 0,907 R_int, dégagement **2,95** (canon « HEAT » 20,33, 0,640 R_int, **11,01**). Centres verticaux : +8,47 et +20,99 contre −0,84 et +14,16. `m21`,`m22` | — |
| `M5` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Course du cadran comprimée de 21 %** : les deux arcs sont raccourcis, le vide reste. | étendue autour du pivot, composante connexe : canon teal **89,7°** (90,5‥180,2) + vide **30,1°** + braise **59,3°** (1,0‥60,3) = course **179,2°** ; jeu teal **68,5°** (92,1‥160,6) + vide **26,8°** + braise **45,7°** (19,6‥65,3) = course **141,0°**. Rayon depuis le pivot 18,89 / 18,38 contre 16,49 / 16,84. `m20` | le rayon de COURBURE des arcs : mon ajustement de ligne moyenne a échoué à son contrôle, je ne le publie pas |
| `M6` | MAJEUR | NOUVEAU | non | **Aucun retour de sélection sur la carte** : la fiche ouverte ne dit pas de quel bâtiment elle parle, alors que 11 marqueurs identiques coexistent. | différence pixel à pixel des deux planches 2400 : **472 382 px** de plaque + **une seule autre composante de 10 px** (1,09 × 1,45 CSS) à l'intérieur du marqueur B05. Vue côte à côte : `z-selection.png`. `m33` | si un effet de sélection existe en animation (aucune paire T/T+1 fournie) |
| `M7` | MAJEUR | NOUVEAU | oui, l'art sous le mot décide | **Trois libellés de type sous le seuil de contraste** ; celui de B05 est amputé à l'œil par la verrière blanche derrière lui. | encre contre le fond immédiat (anneau 3 px) : B07 **2,30:1**, B11 **2,92:1**, B05 **4,49:1** — doctrine ≥ 4,5:1 pour les petits textes, ≥ 3:1 pour les grands. Les 8 autres : 5,32 à 11,51:1. `m34` | — |
| `M8` | MAJEUR | NOUVEAU | oui (3 lieutenants au compte) | **Les 3 marqueurs de lieutenant sont empilés sur le même bâtiment**, identiques, côte à côte, sans libellé — impossible de savoir qui est où. | trois pastilles de ~9 px de large, jointives, à (474‥518 ; 748‥770) px, au-dessus du marqueur `Laboratoire` (490,783). Vue : `z-3marqueurs2.png`. | quel bâtiment chacun désigne — hors image |
| `M9` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Volute droite absente** alors que la gauche est présente : le bandeau est asymétrique. | canon : encre de volute en x 376,00‥386,67 CSS (r8 : 132 px) ; jeu : **aucune encre au-delà de x = 374,94** dans la bande y 12‥46 CSS. Contrôle de capacité : la même sonde trouve la volute GAUCHE du jeu (composante de 328 px, x 4,36‥27,59) et celle du canon (152 px, x 5,00‥18,00). `m24` | — |
| `M10` | MAJEUR | NOUVEAU | non | **À 1080×2400, l'art est coupé net en bas et une bande unie de 31,6 CSS le sépare du bandeau en haut.** | bande unie **(34,38,49)** en y 51,90‥83,12 CSS (87 px) ; art de y = 240 à 2160 px exactement ; couture basse : L passe de **0,0590** (33,73,94 — l'eau) à **0,0186** (33,37,48) **en 1 px, sur toute la largeur**. `m01`,`m40`,`m39` | l'aspect à 1080×1920 pour l'état « fiche fermée » (non fourni) |
| `M11` | MAJEUR | NOUVEAU | non | **La bande du nom de district occupe le créneau du bandeau d'alerte du canon, en pleine largeur et alignée à gauche** — là où le canon pose un bandeau centré à dégradé latéral. Le texte casse la marge gauche de l'écran. | bande pleine largeur y **83,48‥96,55 CSS** (13,43 de haut) ; le canon pose `.bandeau-alerte` à `top:78px` ; texte « La Lisière » à **x 5,08** CSS du bord (tout le reste de l'écran est à ≥ 11,98) ; capitale **4,72 CSS**, contraste 9,71:1. `m40`,`m48` | — |
| `M12` | MAJEUR | DÉJÀ APPLIQUÉ | **peut-être** | **La barre de ratio n'a plus de piste** : impossible de lire la part propre/sale, il n'y a qu'un trait plein. | canon : remplissage `--or` sur **49,67** CSS puis piste (90,99,118) sur **22,67** CSS (67,1 % rempli, la source dit 68 %). Jeu : **74,04 CSS entièrement en (217,171,77)**, et **0 px** de la couleur de piste sur 60 CSS à droite. `m23` | si le ratio vaut réellement 100 % ou si la piste n'est pas dessinée — les deux rendent la même image |
| `M13` | MAJEUR | DÉJÀ APPLIQUÉ | **peut-être** | **Bandeau d'alerte éphémère absent** — le canon en fait un trait d'identité (« zéro badge permanent, l'info arrive en bandeaux »). | bande y 78‥113 CSS : canon **5 101 px** d'`--or-vif` + 1 710 px d'encre claire ; jeu **0 px** d'or-vif (les 97 px clairs sont le nom de district). Contrôle de capacité : la sonde trouve le ruban du canon. `m23` | composant absent ou aucune alerte en attente — non tranchable sur une planche |
| `M14` | MAJEUR | DÉJÀ APPLIQUÉ | oui, la longueur du montant décide | **Le montant d'argent touche la lueur du médaillon** : il n'y a plus de jour entre les deux. L'aile gauche commence 47,88 CSS plus à droite qu'au canon (le bouton retour occupe la place ; je constate l'adjacence, je ne tiens pas la cause), et rien ne borne le montant à droite. Le format « fr réel » est un arbitrage tranché ; **l'absence de garde ne l'est pas**. | **jour VISIBLE 1,09 CSS (3 px)** entre le dernier pixel d'`--or-vif` (x 161,52) et la première colonne qui s'écarte du fond (x 162,61) ; **canon : 89,00 CSS**. Bord nominal du cerclage à 163,84 ⇒ jour nominal 1,96. « ARGENT » commence à x **63,88** contre **16,00**. Les 11 glyphes sont complets, le « € » n'est pas coupé (7,26 × 9,80 CSS). `m50`,`m07`,`m08`,`m26` | de combien de caractères il faut allonger le montant pour qu'il soit rogné (une seule longueur observée) |
| `m1` | MINEUR | DÉJÀ APPLIQUÉ | non | Pivot du cadran trop gros. | diamètre équivalent (aire) **4,51** contre **3,55** CSS ⇒ +27 % ; bbox 5,08 × 4,72 contre 3,33 × 3,67. La source pose `r=2.6` vb. `m09` | — |
| `m2` | MINEUR | DÉJÀ APPLIQUÉ | non | Aiguille trop courte. | longueur depuis le pivot **13,06** contre **15,90** CSS ⇒ −17,9 %. Contrôle : l'angle du canon mesuré 132,6° reproduit le `rotate(-42 30 34)` de la source. `m18` | — |
| `m3` | MINEUR | NOUVEAU | non | Losange sous le médaillon trop maigre et 2,2 CSS trop bas. | même seuil (écart à `--laiton` < 60) : canon **686 px**, diagonale équivalente **12,35** CSS, y 69,67‥79,67 ; jeu **238 px**, **7,92** CSS, y 71,87‥81,67. Centre x 195,50 contre 195,82 (égal). `m48` | — |
| `m4` | MINEUR | NOUVEAU | oui | Capitale du montant réduite de 16 % — vraisemblablement un ajustement à la largeur disponible. | canon chiffres **11,33–11,67** CSS ; jeu **9,80** CSS sur les 11 glyphes. `m08`,`m26` | si la taille est fixe ou ajustée (une seule longueur de montant observée) |
| `m5` | MINEUR | NOUVEAU | oui | Le titre de la fiche n'est plus un nom court centré mais une ligne pleine largeur, en corps réduit. | canon « LE VERGE D'OR » : 11 glyphes, **142,00** CSS de large, capitale **11,00** ; jeu : 37 glyphes, **332,11** CSS = **90 % de la plaque**, capitale **8,71**. Encre `--or-vif` exacte des deux côtés. `m45` | — |
| `m6` | MINEUR | NOUVEAU | non | Encre du CTA : bleu-noir au lieu du brun-noir du canon. | canon (36,24,23) — la CSS pose `#241804` = (36,24,4) ; jeu **(9,15,26)** ⇒ **27/255**. Contraste 8,74:1 contre 8,01:1 (meilleur). `m45` | — |
| `m7` | MINEUR | DÉJÀ APPLIQUÉ | non | La plaque de la fiche est plus opaque que le canon : le décor n'y transparaît presque plus. | régression contre l'art NU (mêmes lignes, planche district) : pente ≈ 0 (r = −0,07), alpha ≥ 1 ⇒ opaque ; amplitude du décor à travers la plaque **1,64 L\*** entre le 1ᵉʳ et le 9ᵉ décile d'art ; écart médian à la prédiction CSS sRGB **6,6/255** (prédiction linéaire : 10,7). Bas de plaque (8,14,24) contre (8,13,23) prédits. `m42` | le flou (`backdrop-filter:blur(5px)`) : à cette opacité, brut et flouté donnent la même corrélation (−0,068 contre −0,088) ⇒ indécidable |
| `m8` | MINEUR | NOUVEAU | non | Filet du bandeau plus fin que déclaré. | jeu **0,73 CSS** (2 px, y 51,18‥51,54) ; la source pose `height:1px`. `m40` | — |
| `m9` | MINEUR | DÉJÀ APPLIQUÉ | non | Ronds du dock 3 % trop petits. | **44,64–45,01** contre **46,00** CSS. Centres justes à 0,24 près. `m49` | — |
| `m10` | MINEUR | NOUVEAU | non | Le dégradé du dock est deux fois plus court et plus opaque que celui du canon, et à 2400 il n'a pas d'art dessous. | à 1920 : l'art passe intact (pente **1,000**, r = 1,000) jusqu'à la ligne d'art 1680, puis 0,68 à 1700 et ≤ 0,16 dès 1720 ⇒ transition sur **~14,5 CSS** ; le canon pose `transparent → #070b12d8 à 40 %` soit **36 CSS**, alpha 0,847. `m39` | — |
| `m11` | MINEUR | NOUVEAU | oui | Le disque des marqueurs laisse transparaître l'art (verrière visible dans B05, cheminée dans B06), ce qui salit la pastille. | B05 et B06 sont les **seuls** des 11 à ne pas être bit-identiques au marqueur de référence : **10 %** et **5 %** de leurs 197 px de disque s'en écartent de plus de 24/255 (max 212 et 62), les 9 autres à **0/255**. `m51` | l'alpha exact du disque (pas de fond de référence sous chaque marqueur) |

**Compte : 3 BLOQUANT · 14 MAJEUR · 11 MINEUR = 28 findings.** Treize de ces 28 écarts sont `DÉJÀ APPLIQUÉ` — ils ont
la même valeur qu'au tour précédent, aux instruments près : ce sont des **RÉCURRENTS**, pas des
régressions. Deux écarts du tour précédent ne sont **plus des écarts** : le voile du bandeau (29/255
→ 4,3/255) et les positions du district, qui étaient un artefact d'instrument et que j'ai remesurées
à neuf.

## 5. Autres résolutions

- **1080×2400, fiche fermée (planche principale)** : l'inventaire tient. L'art occupe exactement
  y ∈ [240 ; 2160) px, centré ; 240 px de panneau en haut (dont 143 sous le bandeau, **97 px = 35 CSS
  visibles**) et 240 px en bas, entièrement recouverts par le dock. Rien n'est coupé ni hors cadre ;
  aucun marqueur ne touche un bord (x 136‥905 px). Écarts propres : `M10`.
- **1080×2400, fiche ouverte** : identique à la précédente hors la plaque et 10 px (`m33`). Les
  11 marqueurs restent visibles.
- **1080×1920, fiche ouverte** : la mise en page tient et les proportions sont conservées — la plaque
  est à **271,49 CSS du bas** contre 271,42 à 2400 (Δ 0,07), le dock et le nom de district sont aux
  mêmes y-écran. La couche district est **bit-identique** à celle de 2400 au décalage de +240 px
  (100,00 % sur 84 240 échantillons, `m28`). Deux différences propres : (a) **2 des 11 marqueurs sont
  recouverts par la fiche** (les ancres d'art y = 1240 et 1256), contre 0 à 2400 — conséquence
  normale d'un écran plus court ; (b) le dock **laisse voir l'art** (pente 1,000 sur les lignes d'art
  1640‥1680) alors qu'à 2400 il repose sur un panneau uni.
- **Manque** : aucune planche du district **fiche fermée** à 1080×1920, et aucune planche à une
  troisième résolution. À écrire en non-vérifié, pas à deviner.

## 6. Non vérifié

| ce que je n'ai pas pu trancher | la mesure hors image qui trancherait |
|---|---|
| **Animation** : aucune paire T / T+1 s n'est fournie ⇒ le ruling « aucune animation sur un nouvel écran » n'est ni confirmé ni infirmé. | deux captures du même état à 1 s d'intervalle, puis compte des pixels différents hors chrome hérité |
| **Valeurs de contenu** (argent, jour, chaleur, chiffres de la fiche, nombre de bâtiments) : planche prise sur `operational_demo` (journal joint : 77 353 min, 17 bâtiments, 3 lt, 314 cartes), non comparable au canon ni à une campagne `demo_capture`. **Seule la FORME est jugée ici.** | une planche prise avec la paire `MAFIA_DEMO_*` sur le compte de capture gelé |
| **11 marqueurs pour 17 bâtiments** en base : les 6 manquants sont-ils hors district, non projetés, ou sous une ancre partagée ? | ressort de `juge-donnees` (corps de la route district + colonnes en base) |
| **La piste de la barre de ratio** : absente, ou ratio à 100 % ? Les deux produisent la même image. | une planche sur un compte au ratio ≠ 100 %, ou la lecture du composant |
| **Le bandeau d'alerte** : composant absent, ou aucune alerte en attente ? | une planche avec une alerte en attente |
| **La 3ᵉ stat de la fiche en crème** là où le canon la met en braise : règle de couleur perdue, ou valeur « Sain » qui ne doit pas alarmer ? | une planche sur un bâtiment en mauvais état |
| **Le rayon de COURBURE des arcs** : mon ajustement de ligne moyenne n'a pas passé son contrôle (l'ajustement de Kasa biaise de −11 % sur une bande épaisse, et les arcs du canon ne sont pas centrés sur le pivot — la source les place à (34,0 ; 33,7) et (26,2 ; 30,8) vb). Je publie l'étendue angulaire et l'épaisseur, qui ont passé leurs contrôles ; **pas** le rayon. | un ajustement sur les extrémités des chemins SVG, ou un instrument validé sur arc décentré |
| **Le flou de la plaque** (`backdrop-filter:blur(5px)`) : à l'opacité mesurée, art brut et art flouté donnent la même corrélation. | une planche de la plaque sur un art à fort contraste local |
| **La famille de police réellement embarquée** par le client. | `fc-match` sur la pile CSS (fait : Georgia → **Noto Serif**) plus l'identification du `.ttf` du client — hors image |
| **La cause exacte des ancres sur le sol nu** et du doublon B03 : je constate les positions à l'écran, je ne tiens pas la carte d'ancrage. | la réconciliation ancre ↔ bâtiment côté `mafia-blender` (déclarée : 23/40 ancres à plus de 3 m d'un bâtiment ; instrument non fourni) |
| **Le SHA de l'arbre de rendu** des planches n'est pas imprimé (point (g) du dénominateur GO) ; l'identité, elle, est jointe et lue. | l'imprimer au run |
| **Sur/sous-bâtiment des 9 autres marqueurs** : jugé à l'œil sur la planche-contact (8 façades, 1 toiture), non mesuré. | une sonde de matière (l'art est importé `isReadable:0` — mesure hors ligne sur le PNG source) |

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce qu'on voit | état | contrôle du périmètre |
|---|---|---|
| les 3 chiffres de la fiche remplacés par des bandes qualitatives (« Au repos / REVENU », « Coupée / CHAÎNE », « Sain / ÉTAT ») | **conforme** | aucune case vide, aucun scalaire inventé, les 3 cases restent alignées (séparateurs à 128,13 et 238,65 contre 127,00 et 238,67 au canon) |
| le nom du bâtiment remplacé par son TYPE | **PÉRIMÉ dans la fiche** : la fiche affiche un NOM (« Mécanique Skeld — La Lisière, îlot 1501, n° 2 ») ; **encore vrai sur la carte**, où les marqueurs portent le type | pas de clé brute, pas de nom vide |
| le nom du district affiché là où le canon n'en met pas | **rendu**, nom de fiction « La Lisière », pas un slug ⇒ dans l'assumé — mais sa **forme** sort de l'assumé et devient `M11` | le libellé lui-même est correct |
| l'heure remplacée par le quart du jour | **conforme** : « Soirée », en français, non vide, en `--braise` comme le veut `.tel.chaud` | pas de libellé anglais |
| libellés du dock | **PÉRIMÉ** : la table annonçait ACCUEIL, la capture montre **EMPIRE · FAMILLE · FILIÈRE · PLUS** — le 1ᵉʳ est désormais **identique au canon**, seul le 3ᵉ diffère (FILIÈRE / MARCHÉ) | 4 onglets, casse uniforme, aucun libellé coupé, encre `--creme-2` exacte |
| bouton RETOUR en haut à gauche | **conforme** : composante de 101 px en x 29,76‥37,75 CSS ; l'aile gauche commence à 63,88 ⇒ **aucun recouvrement** | ne recouvre pas l'aile gauche |
| référence de NUIT, capture au quart « Soirée » | **cohérent** ; palette globale restreinte au chrome et à la fiche, comme demandé | — |

## Écarts d'ARBITRAGE

| point | mesure | pourquoi ce n'est pas un défaut d'écran |
|---|---|---|
| ronds du dock **sans icône** | canon : `img` 20×20 dans chaque rond ; jeu : 0 px d'encre à l'intérieur des 4 ronds | ruling user connu (« j'aime pas les icônes ») |
| **famille sérif** | `fc-match Georgia` → **Noto Serif** a rendu la référence ; le client embarque **DejaVu Serif** | la référence n'a jamais montré Georgia à personne ; seule la hauteur de capitale est opposable (et elle l'est : `m4`, `m5`) |
| **format monétaire** « 9 627 820,00 € » contre « $ 24 850 » | 14 caractères contre 8 ; 11 glyphes mesurés, tous complets, le « € » n'est PAS coupé (7,26 × 9,80 CSS) | ruling « fr réel » du 2026-09-02 : le client a raison, la maquette est en retard. ⚠️ **Mais la conséquence n'est pas un arbitrage** : voir `M14` dans la table des écarts |
| **libellés anglais du canon** (`HEAT`, `$ 24 850`) | — | maquette à mettre à jour, noté une fois |
| **3ᵉ stat en crème** au lieu de braise | canon (224,102,74) ; jeu (234,224,200) | la valeur est « Sain » : alarmer serait faux. Non tranchable sans une seconde planche |
| **FILIÈRE** au lieu de MARCHÉ | — | destination qui existe ; nommer un écran absent serait un mensonge d'interface |

## Annexes

### 1. Inventaire de la référence (extrait — fiches complètes dans les scripts)

Couche globale, zone par zone (`m46`) : **bandeau** L\* moyen 20,8, densité d'encre 5,8 %, palette
dominée par 5 bleus nuit (14‥23, 20‥30, 29‥41) + une classe chaude (100,94,78) à 7,9 % ; **fiche**
L\* 27,1, densité 9,7 %, classe or (147,127,80) à 10,1 % ; **dock** L\* 17,8, densité 4,0 %.

Parties (bbox en CSS, `mesure-canon.txt` + mesures) : `.tel` 392 × 696,88 · `.barre` 392 × 52 ·
`.medaillon` 64 × 64 à (164 ; 8), cerclage `1.5px solid --laiton`, ligne médiane R = 31,31 mesurée
(31,25 déclarée) · `.cadran` arcs 2,45 CSS d'épaisseur source, teal 90° et braise 60,5° autour du
pivot, vide 30,1° · `.aile.gauche` 96 × 33,55 à (17 ; 10,22) · `.ratio` 74 × 2, rempli à 67,1 % ·
`.bandeau-alerte` à top 78 · `.fiche` 366 × 169,19 à (13 ; 424,52), rayon 14, filet laiton haut ·
`.dock` 390 × 90,17, 4 `.rond` de 46 aux centres 94 / 162 / 230 / 298, `.pointe` 14 × 2 laiton.
**Exclus** : les 6 `.co`, `.bascule`, `.chaudb` — annotations de la maquette.

### 2. Inventaire de la capture (extrait)

Couche globale (`m46`) : **bandeau** L\* 19,6, densité 6,6 %, classe chaude (56,46,44) à 12,1 %
(l'état `.chaud`) ; **fiche** L\* 27,4, densité 10,5 % ; **dock (2400)** L\* 11,1, densité 1,0 %.

Structure verticale à 1080×2400 (`m01`, `m40`) : bandeau 0‥140 px · filet braise 141‥142 ·
**panneau uni (34,38,49) 143‥229** · bande du nom (19,24,35) 230‥239 · **art 240‥2159** ·
**panneau (14,20,31) 2160‥2399**, occupé par le dock. Parties **en trop** par rapport au canon :
la bande pleine largeur du nom de district (`M11`), les 11 marqueurs de bâtiment, les 3 marqueurs de
lieutenant (`M8`), le bouton retour (assumé). Partie **absente** : le bandeau d'alerte (`M13`), la
volute droite (`M9`), la piste du ratio (`M12`), les icônes du dock (arbitrage).

### 3. Correspondance des repères

| repère | valeur | établi par |
|---|---|---|
| échelle référence | ×3,000 (1176 px = 392 CSS) | `dossier.md` |
| échelle captures | ×2,7551 (1080 px = 392 CSS) | `dossier.md` |
| rapport capture ÷ référence | 0,918 | — |
| art du district, 2400 | y ∈ [240 ; 2160) px, centré ; **ligne d'art `a` ↔ écran `a` à 1920 ↔ `a+240` à 2400** | `m28` (100,00 % bit-identiques ; contrôles négatifs 0 → 2,08 %, ±1 → 67,5 %) |
| centre du médaillon | canon (587,49 ; 116,52) px = (195,83 ; 38,84) CSS · jeu (539,50 ; 109,67) px = (195,82 ; 39,81) CSS | `m03` (ajustement de cercle robuste, résidu médian 0,87 / 0,57 px) |
| pivot du cadran | canon (195,82 ; 43,62) CSS · jeu (195,71 ; 44,86) CSS | `m09` (composante connexe laiton ; contrôle : la CSS prédit 43,87) |
| plaque de fiche | canon (13,00 ; 424,52) 366,00 × 169,19 · jeu (11,98 ; 599,61) 368,04 × 169,50 ; **ancrage bas** | `m33`, `m47` |
| origine du dock | 1ᵉʳ rond centré à 93,83 CSS des deux côtés | `m49` |

### 4. Scripts — `mesures/*.py`, avec leur contrôle

| script | ce qu'il mesure | son contrôle |
|---|---|---|
| `commun.py` | échelles, médianes, luminance/contraste WCAG, mélanges sRGB et linéaire, jetons | contraste(blanc,noir) = 21,00 ; contraste(gris,gris) = 1,00 |
| `texte.py` | segmentation en glyphes, capitale, encre, contraste | — |
| `m01_structure.py` | bandes unies des 3 planches | imprime les 3 tailles |
| `m03_centre.py` | centre + R du cerclage (ajustement de Kasa robuste) | retrouve le centre CSS du canon à 0,17 CSS et la ligne médiane à 0,06 CSS |
| `m04_halo.py` | profil radial du cerclage (720 rayons, pas 0,05 CSS) | retrouve `border:1.5px` du canon (1,60 à 10 %) |
| `m05..m08` | aile gauche, montant, glyphes | 11 glyphes trouvés pour « 9 627 820,00 € » |
| `m09_pivot.py` | pivot du cadran | canon 3,55 CSS pour `r=2.6` vb = 3,81 déclarés |
| `m11/m13/m15/m16` | masques de classification des arcs | masques exportés et **regardés** (`vues/masque-*.png`, `vues/arcs5-*.png`) avant toute mesure |
| `m17/m20` | étendue angulaire et épaisseur des arcs | canon teal **89,7°** pour 90,0 attendus, braise **59,3°** pour 60,5 ; arc synthétique R57/90° → 57,14 / 90,0° |
| `m18_aiguille.py` | aiguille | canon **132,6°** pour `rotate(-42 30 34)` |
| `m19_courbure.py` | rayon de courbure | **contrôle échoué** ⇒ résultat NON publié (voir §6) |
| `m21/m22` | textes du médaillon, dégagement au cerclage | même sonde des deux côtés |
| `m23..m26` | filet, ratio, volutes, losange, alerte, textes du bandeau | contrôle de capacité : la sonde de volute trouve celle du canon et celle de gauche en jeu |
| `m27/m28` | **voile du bandeau** : régression alpha/couleur contre l'art nu | premise prouvée à 100,00 % (84 240 échantillons), contrôles négatifs à 2,08 % et 67,5 % |
| `m30..m32` | **marqueurs de bâtiment** (gabarit annulaire calibré) | contrôle positif : le marqueur « Laboratoire » (491,784) retrouvé ; 11 marqueurs à 2400, les mêmes coordonnées d'art à 1920 et 2400 |
| `m51_identite_marqueurs.py` | les 11 marqueurs sont-ils le même dessin ? | 9/11 bit-identiques (0/255) ; contrôle négatif : un marqueur de lieutenant diffère sur 54–69 % des px |
| `m33..m37` | fiche par différence, libellés de district, cartes de pixels | la différence ne rend que 2 composantes ⇒ elle mesure bien la plaque |
| `m38/m39/m49` | dock : profil, opacité, ronds, indicateur | centres du canon retrouvés à 0,24 CSS |
| `m40..m48` | bandes hautes, plaque, boutons, textes de fiche, dégradé du cadran | `m48` reproduit indépendamment l'amplitude du canon (19,19,23) et le secteur clair 90‥135° annoncé par la CSS |
| `m50_final.py` | jour montant ↔ médaillon, filet, libellés du dock | canon 89,00 CSS de jour, jeu 1,09 |
| `vues/` | 20 planches de contrôle regardées (planche-contact des 11 marqueurs, preuves de collision, sélection, dock, médaillon) | — |
