# Juge visuel ⊥ — ㉘ La distribution (« la ficelle sur le liège ») — r1 — 2026-09-07

Juge à contexte vierge. Je n'ai ouvert ni `Assets/Scripts`, ni les notes d'implémentation, ni
l'inventaire de dette, ni aucun rapport de juge (visuel ou données). Sources lues : `dossier.md`,
`captures-provenance.md`, `journal-declare.txt`, `entree-generateur.json`, les deux PNG du dossier,
la maquette d'état vide, et la SOURCE HTML/CSS `ecrans-brennar-6.html` (aide de lecture nommée par
le dossier). Aucun `git checkout`, aucun commit, aucune compilation, aucun run.

---

## Verdict : **NON APPROUVÉ**

L'information est là et dans le bon ordre, mais la **matière** de l'écran ne l'est pas : la planche
de liège — qui donne son nom à l'écran et occupe la moitié de la maquette — est devenue un
rectangle brun uni de teinte **unique** (1 teinte sur 36 000 px, contre 673 côté maquette), sans
cadre bois, sans grain, sans dégradé, sans ombre sous les étiquettes, qui ne fait plus que **21,2 %**
de la hauteur de contenu au lieu de 49,2 %.

---

## Homologue retenu — à lire avant les chiffres

La capture montre **« C'est livré »** : ce n'est PAS le cadre nominal rendu en référence
(#54 « Envoyer — la ficelle à tendre », titre « L'envoi de ce soir »). L'homologue est le
**cadre #56 « Livré — mais la route s'use »** (`ecrans-brennar-6.html` l.4688), dont le `<h3>` est
exactement « C'est livré » et le `<p>` exactement « La marchandise est arrivée. Voilà ce que le
trajet a coûté à la route. » — les deux chaînes de la capture.

**#56 n'est pas rendu** (le dossier ne rend que le cadre nominal). J'ai donc procédé ainsi, et c'est
la seule façon honnête de le faire :

- **Toute mesure de FORME** (matière, géométrie, bandes, typographie, gabarit) est faite contre le
  cadre **#54 RENDU**, parce que #54 et #56 partagent la **totalité** du châssis : mêmes classes
  `.entete/.planche/.cadre-b/.fiche/.lecture/.bas/.perso/.av/.geste`, mêmes règles CSS, même
  `height:462px`. Le châssis est donc mesuré sur une IMAGE, pas déduit.
- **Ce qui est propre à #56** (ficelle `#e0c07a` épaisse 3,2 ; 3ᵉ ligne en classe `alerte` ;
  libellés du geste) n'a **jamais été rendu** : je le nomme d'après la CSS et je ne l'oppose à rien.
  C'est en « non vérifié ».

---

## Contrôle positif — ce que l'instrument trouve ÉGAL (et ce qui prouve qu'il mesure bien)

Les valeurs hexadécimales ci-dessous sont **écrites dans la CSS** et **retrouvées au bit** sur la
référence : c'est ce qui établit l'échelle ×3,6 et la fiabilité de la sonde (`mesures/m02`, `m03`).

| # | grandeur | valeur CSS | mesuré sur la RÉFÉRENCE | script |
|---|---|---|---|---|
| 1 | largeur des deux images | 300 CSS × 3,6 | **1080 px** des deux côtés | m01 |
| 2 | fond `.entete` | `#20180f` | **#20180f** (32,24,15) | m02 |
| 3 | fond `.lecture` | `#1a1108` | **#1a1108** | m02 |
| 4 | fond `.bas` | `#141a21` | **#141a21** | m02 |
| 5 | filet haut `.bas` | `2px solid #2c3640` | **#2c3640** | m02 |
| 6 | cadre bois `.cadre-b` | `5px solid #4a3722`, inset 5 CSS | **#4a3722 sur 18 px, à 18 px du bord** | m03 |
| 7 | papier `.fiche` | `#efe6d4` | **#efe6d4** | m02 |
| 8 | fond `.geste` | `#241c11` | **#241c11** | m02 |
| 9 | liseré `.geste` | `1px #5a4a2a` | **#5a4a2a** | m02 |
| 10 | rotation `.fiche.gauche` | `rotate(-2.4deg)` | **−2,39°** | m04 |
| 11 | rotation `.fiche.droite` | `rotate(1.8deg)` | **+1,58°** | m04 |
| 12 | séparateur `.l+.l` | `1px dotted #3d3024` | **#3d3024, 50 % allumé, 320 alternances** | m06/m07 |
| 13 | ficelle #54 | `stroke #c9bda0` | **#c9bda0** | m06 |
| 14 | médaillon `.av` | cercle 34×34 CSS | **34,2 × 33,9 CSS, taux 0,798 ≈ disque 0,785** | m12 |
| 15 | hauteur de capitale `.nom` (10px Serif) | 26,2 px attendus | **26 px** | m08 |
| 16 | hauteur de capitale titre (12px Serif) | 31,5 px attendus | **32 px** | m10 |
| 17 | somme des zones == hauteur de contenu | — | **écart 0 px** des DEUX côtés | m15 |

**Et ce que l'instrument trouve ÉGAL entre la maquette et le jeu** — c'est la partie de l'écran qui
est juste, et elle n'est pas mince :

| # | grandeur | référence | jeu | écart |
|---|---|---|---|---|
| 18 | hauteur des étiquettes | 33,8 CSS | 33,9 / 33,7 CSS | **ÉGAL** |
| 19 | hauteur de capitale `.fiche b` | 24 px | **24 px** | **×1,000** |
| 20 | chasse de « LE CHEMIN » | 152 px | 150 px | **×0,987** |
| 21 | chasse de « À TRAVERSER » | 194 px | 190 px | ×0,979 |
| 22 | chasse de « CETTE ROUTE » | 195 px | 192 px | ×0,985 |
| 23 | couleur de la ficelle | #c9bda0 | **#c9bda0** | **ÉGAL** |
| 24 | épaisseur de la ficelle | 6,6 px (trait) | 6 px | ÉGAL à 0,6 px |
| 25 | forme de la ficelle vs `LE CHEMIN` | droite ⇔ « droit — le plus court » | droite ⇔ « droit — le plus court » | **la sémantique tient** |
| 26 | filet braise du bandeau (`.tel.chaud`) | `--braise` (224,102,74) | **(224,102,73)** | **ÉGAL** (chrome BRÛLANT conforme) |
| 27 | ordre des trois lignes de lecture | chemin / traverser / route | idem | **ÉGAL** |
| 28 | gouttière basse (contenu ↔ dock) | — | **87 px = 24,2 CSS, aucun chevauchement** | conforme |
| 29 | contenu coupé ou hors cadre | — | **0 px clair** sur les bords G/D et sur la frontière du dock | conforme |
| 30 | contrastes de tous les textes principaux | 4,98:1 … 15,02:1 | **6,47:1 … 17,12:1** | tous ≥ 4,5:1 |

⚠️ **Point de dossier important, mesuré et non déduit** : cet écran ne demande **que**
`'DejaVu Sans'` (13 règles) et `'DejaVu Serif'` (5 règles), **zéro `Georgia`** dans son bloc CSS
(l.4609-4682) ; `fc-match` rend `DejaVu Serif → DejaVu Serif "Book"` et `DejaVu Sans → DejaVu Sans
"Book"`. Le client embarque les deux mêmes fontes. ⇒ **Il n'y a AUCUNE substitution de police sur
㉘.** La mise en garde générique du dossier (Georgia → Noto Serif) ne s'applique pas ici : **la
hauteur de capitale ET la chasse sont pleinement opposables**, et aucun écart typographique de cet
écran n'est un ARBITRAGE.

---

## 0. L'écran, tel que la maquette le dit

**Le but.** On y tend une ficelle entre deux points de la ville : d'où part la marchandise, où elle
va, et par quel chemin. Puis on regarde ce que ce trajet coûte à la route. Ce n'est pas un
formulaire de logistique : c'est **une carte punaisée sur une planche de liège**, et l'aside de la
maquette en fait sa thèse — « *la géographie est DESSINÉE, jamais écrite* ; la **forme** de la
ficelle dit la sinuosité, les petits ponts disent les rivières ; *le joueur lit une carte punaisée,
pas trois bandes* ».

**L'ordre de lecture.** (1) La **planche de liège** — elle occupe 49,2 % de la hauteur de contenu,
c'est la seule matière claire d'un écran sombre, et 62,0 % du poids visuel (m13) ; (2) les **deux
étiquettes de papier**, décalées en diagonale (l'une en haut-gauche, l'autre en bas-droite, 51,7 CSS
d'écart), reliées par la ficelle qui traverse la planche ; (3) les **trois lignes d'état** sur leur
bande brun-noir ; (4) **Lt. Rin** qui parle, sur une bande bleu-gris, et le geste unique en bas.

**Les zones.** Bande d'en-tête `#20180f` (titre + une phrase) · planche de liège pleine largeur,
encadrée de bois, à texture pointillée et dégradé · bande `#1a1108` de trois lignes « nom → valeur »
séparées par un pointillé · bande `#141a21` (médaillon rond, nom, rôle, réplique en italique) close
par un bouton discret.

**Les traits d'identité — les 5 choses qui font que c'est CET écran.**
1. **Le liège** : brun texturé, grain de points, dégradé, cadre bois de 5 CSS, ombre interne.
2. **Le papier punaisé** : deux étiquettes crème **inclinées** (−2,4° / +1,8°), à liseré, avec une
   **ombre portée** qui décolle le papier de la planche, largeur ajustée au texte.
3. **La ficelle et la punaise** : un trait crème qui traverse la planche en diagonale, avec du mou.
4. **Quatre bandes de fond distinctes** — brun foncé, liège, brun-noir, bleu-gris — un rythme
   vertical qu'on lit avant les mots.
5. **Un seul geste**, discret : liseré or sur fond sombre, sa conséquence écrite en petit à côté.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

**Non, et l'écart tient en un mot : la matière.** Ce qui survit : la structure logique (deux points,
un trait, trois lignes d'état, un lieutenant, un geste), l'ordre des blocs, les libellés en français,
la lisibilité (tous les contrastes ≥ 6,4:1), et — c'est à saluer — la **sémantique de la ficelle** :
la route dit « droit — le plus court » et la ficelle est effectivement droite.

Ce qui meurt : le liège. Mesuré, la planche du jeu est **une seule teinte** (`#7a5331`, 100 % sur
36 000 px, deux fenêtres indépendantes) là où la maquette en porte 673 ; elle n'a **pas** de cadre
bois (18 px de `#4a3722` côté maquette, rien côté jeu) ; elle est **strictement plate** (luminance
88,84 en haut-gauche, au centre et en bas-droite — la maquette va de 109,6 à 88,9) ; et **rien** ne
tombe sous les étiquettes (excès sombre **0,00 à d = 1 comme à d = 30**, contre une portée de 30 px
côté maquette). Les étiquettes ne sont plus punaisées mais **posées à plat** (0,00° et −0,08° contre
−2,39° et +1,58°), **empilées** au lieu d'être décalées (0,0 CSS d'écart latéral contre 51,7), et
pleine largeur (89,5 % du panneau contre 74,5 %). On ne lit plus une carte punaisée : on lit deux
bandeaux et un trait.

Le deuxième effet, plus large : les **quatre bandes de fond ont disparu**. `#20180f`, `#1a1108`,
`#141a21` et le filet `#2c3640` sont tous devenus `#0d0d0d`, qui couvre **54,9 %** de la zone de
contenu (contre 14,8 % de noir pur côté maquette, réparti en trois familles distinctes de 15 à 17 %
chacune). Le rythme vertical qu'on lisait avant les mots n'existe plus ; la luminance moyenne tombe
de 74,4 à 58,2 et la densité de matière de 46,5 % à 27,3 %.

Le troisième : la **hiérarchie s'est déplacée**. Le titre passe de 8,89 à 12,78 CSS de hauteur de
capitale (**+44 %**), le sous-titre de 5,28 à 7,50 (**+42 %**, et il passe sur deux lignes) ; l'en-tête
double sa part (10,2 % → 18,7 %) pendant que la planche perd la moitié de la sienne (49,2 % → 21,2 %).
Une section entière qui n'existe dans **aucun** des cinq cadres — « VOS COURRIERS » et son bouton —
occupe 22,1 %. Et le geste, discret dans la maquette, est devenu un **pavé or plein** de 268 CSS de
large : la maquette écrit or `#d9ab4e` **sur** `#241c11` ; le jeu peint `#d9ab4d` **en aplat** et
écrit en sombre dessus. C'est l'objet le plus voyant de l'écran.

**Les trois écarts de tête, par impact perçu** : (1) le liège n'est plus du liège ; (2) la planche
perd 55 % de sa hauteur et sa composition en diagonale ; (3) les quatre bandes de fond fusionnent en
une nappe noire.

---

## 3. Écarts

Gravité : liste fermée `BLOQUANT` / `MAJEUR` / `MINEUR`. Critère `NOUVEAU` partout (premier tour).
`dép. données` = l'écart dépendrait-il du compte photographié ? (géométrie, palette, typographie,
espacements : **non** — ils sont vrais quelles que soient les données.)

| id | gravité | critère | dép. données | écart | mesure | script | note |
|---|---|---|---|---|---|---|---|
| **B1** | BLOQUANT | NOUVEAU | non | **La matière « liège » n'existe pas.** Grain, dégradé, cadre bois, ombre interne, ombre portée et liseré des étiquettes : tous absents. La planche est un aplat uni. | teintes distinctes dans une fenêtre de 36 000 px : réf **673** / jeu **1** (deux fenêtres indépendantes, 100 % `#7a5331`) · luminance haut-G/centre/bas-D : réf **109,6 / 102,0 / 88,9**, jeu **88,84 / 88,84 / 88,84** · `.cadre-b` : réf **18 px de `#4a3722` à 18 px du bord**, jeu **rien** (aplat jusqu'au bord) · ombre sous étiquette : réf **portée 30 px, excès 24,8 max**, jeu **0,00 à d = 1..30** · liseré `.fiche` : réf **#cbbfa4**, jeu **absent** | m03, m05, m12, m15 | Trait d'identité n° 1 — c'est le nom de l'écran. Cause commune avec B2 et m6. |
| **B2** | BLOQUANT | NOUVEAU | non | **La composition en diagonale est perdue** et la planche perd la moitié de sa hauteur. Les deux étiquettes sont empilées, pleine largeur, à plat. | part de la hauteur de contenu : réf **49,2 %**, jeu **21,2 %** (228,1 → 120,0 CSS) · décalage latéral entre les deux étiquettes : réf **+51,7 CSS**, jeu **+0,0 CSS** · largeur : réf **74,5 % / 73,5 %** du panneau, jeu **89,5 % / 89,5 %** · inclinaison : réf **−2,39° / +1,58°**, jeu **0,00° / −0,08°** · ficelle : réf **36° de pente, flèche 13,3 px**, jeu **5,5° de pente, flèche 1,9 px** | m04, m05, m14, m15 | « Le joueur lit une carte punaisée, pas trois bandes » (aside de la maquette) : ce n'est plus vrai. |
| **M1** | MAJEUR | NOUVEAU | non | **Les quatre bandes de fond nommées ont fusionné en une nappe noire.** | réf : `.entete` **#20180f**, `.lecture` **#1a1108**, `.bas` **#141a21** + filet **2px #2c3640** — tous retrouvés au bit. Jeu : **#0d0d0d** partout, filet absent · palette : `#101010` **54,9 %** du contenu côté jeu contre **14,8 %** côté réf (qui répartit en 3 familles à 15-17 %) · luminance moyenne **74,4 → 58,2** · densité de matière **46,5 % → 27,3 %** | m02, m11, m15 | Le rythme vertical se lit avant les mots ; il a disparu. |
| **M2** | MAJEUR | NOUVEAU | non | **Le geste est inversé** : la maquette écrit en or sur fond sombre cerné d'un liseré, le jeu peint un pavé or plein et écrit en sombre. Et sa légende sort du bouton. | réf : fond **#241c11**, liseré **1px #5a4a2a**, texte **#d9ab4e**, légende **dans** le bouton, alignée à **droite** (x 621..989) · jeu : fond **#d9ab4d en aplat**, texte **#221600**, légende **sous** le bouton, alignée à **gauche** (x 59..455) · hauteur **29 → 36,1 CSS** (+24 %) | m01, m02, m12, m13 | Le bouton devient l'objet le plus voyant de l'écran (20,2 % du poids visuel). |
| **M3** | MAJEUR | NOUVEAU | non | **Le titre et le sous-titre sont ~+44 % trop grands** ; le sous-titre passe sur deux lignes et l'en-tête double sa part. | hauteur de capitale : titre **32 → 46 px** (×1,438) ; sous-titre **19 → 27 px** (×1,421) · bande d'encre du sous-titre : **25 → 36 px** (×1,44), **1 ligne → 2 lignes** · part de l'en-tête : **10,2 % → 18,7 %** de la hauteur de contenu | m10, m15 | **Aucune substitution de police sur cet écran** (`fc-match` : DejaVu ↔ DejaVu, 0 `Georgia`) ⇒ ce n'est pas un arbitrage, c'est un corps. |
| **M4** | MAJEUR | NOUVEAU | non | **Le médaillon du lieutenant : cercle habité → carré vide.** | réf : **34,2 × 33,9 CSS**, taux de remplissage de la bbox **0,798** (= disque), **186 teintes** à l'intérieur (silhouette) · jeu : **26,1 × 26,1 CSS**, taux **1,000** (= carré), **1 seule teinte** à l'intérieur | m11, m12 | Contrôle négatif posé : une rangée de la capture sort bien à 1,000. La sonde discrimine. |
| **M5** | MAJEUR | NOUVEAU | **oui (existence)** / non (forme) | **Une section entière EN TROP** — « VOS COURRIERS » (3 rangées) + « ACHETER UN VÉLO » — sans contrepartie dans **aucun** des 5 cadres du groupe, et dessinée dans une matière qui contredit l'écran (rangées `#222a2e` à angles vifs, bouton `#2a2e38`). | **0** occurrence de « courrier » dans toute la source de la maquette ; « vélo » n'apparaît que dans l'**aside** (prose), dans **aucun** balisage de cadre · la section occupe **450 px = 125,0 CSS = 22,1 %** de la hauteur de contenu · rangées 25,8 CSS, bouton 26,1 CSS, toutes à 268,3 CSS de large | m13, m15 | ⚠️ **L'aside du même écran mesure pourtant `GET couriers` et `POST vehicles/purchase` comme routes joueur** : c'est la maquette qui ne les dessine pas. Voir la table ARBITRAGE — l'**existence** de la section n'est pas au client de trancher ; sa **forme** l'est. |
| **M6** | MAJEUR | NOUVEAU | non | **La couleur d'état « tient » change de famille** : vert sauge → turquoise saturé. | jeton CSS `.l b.ok` = **#7fc99a** (127,201,154), teinte **141,9°**, saturation **0,368** · jeu = **#42e0c0** (66,224,192), teinte **167,8°**, saturation **0,705** · écart de teinte **26,0°**, saturation **×1,92** | m12, m13 | Seul accent froid saturé de l'écran, et il porte l'information d'état. Hors du cadre de style « sombre, napolitain, fin 80s ». |
| **m1** | MINEUR | NOUVEAU | non | **Les séparateurs pointillés des lignes de lecture sont absents.** | réf : **6 lignes** au profil pointillé strict (50 % allumé, **320 alternances**), couleur **#3d3024** · jeu : **0** ligne à ce profil sur **tout l'écran** (balayage 143..2100 : les 30 hits sont des lignes de texte, 90-144 alternances, aucune à 320) | m06, m07 | Balayage de la CLASSE, pas de deux fenêtres : le zéro est opposable. |
| **m2** | MINEUR | NOUVEAU | non | **Les valeurs des lignes de lecture sont +16 % trop grandes.** | chaînes **identiques** dans les deux images : « droit — le plus court » largeur **337 → 390 px** (×1,157), hauteur ×1,172 ; « aucune rivière » **237 → 274 px** (×1,156), hauteur ×1,120 | m10 | Même texte, même police ⇒ mesure directe du corps, sans hypothèse. |
| **m3** | MINEUR | NOUVEAU | non | **L'interlettrage des petites capitales n'est pas appliqué** (`letter-spacing:.9px` CSS = 3,24 px). | « LE CHEMIN », lettre à lettre : largeurs réf **[11,11,14,13,11,16,2,13]** → jeu **[12,13,16,15,13,18,3,15]** (**+13 %**) ; blancs réf **[6,17,7,8,7,8,8]** → jeu **[4,13,5,6,5,6,6]** (**−26 %**). Les deux effets se compensent : largeur totale ×0,987 | m11 | La largeur totale égale (contrôle n° 20) **masque** deux écarts opposés : c'est la mesure lettre-à-lettre qui les sépare. |
| **m4** | MINEUR | NOUVEAU | non | **La sur-étiquette `.fiche i` (« D'OÙ ÇA PART ») est −16 % trop petite** — seule grandeur de l'écran SOUS la maquette. | « D'OÙ ÇA PART » : largeur **190 → 166 px** (×0,874), hauteur **25 → 21 px** (×0,840) | m10 | Avec M3 et m2, la dispersion typographique va de **−16 % à +44 %** : ce n'est pas un facteur d'échelle unique, c'est un corps choisi élément par élément. |
| **m5** | MINEUR | NOUVEAU | non | **Le papier des étiquettes est `#eae0c8` au lieu de `#efe6d4`.** | réf **(239,230,212)**, jeu **(234,224,200)**, delta **(−5, −6, −12)** — le bleu sort de la tolérance de 6/255 | m02 | `#eae0c8` est un jeton de la maquette, mais celui de l'**aiguille du manomètre** (`hud-brennar`), pas celui du papier. |
| **m6** | MINEUR | NOUVEAU | non | **Le liège est figé sur l'extrémité SOMBRE de son dégradé.** | CSS : `linear-gradient(158deg, #9a774b, #7b5c37 62%, #654a2c)` sur `#8a6a42` · réf mesurée **#896a42 → #85653e** (L 109,6 → 88,9) · jeu **#7a5331** partout (L 88,84) | m02, m03 | Sous-cas de B1, mais chiffrable à part : même sans texture, la teinte moyenne est trop sombre et trop rouge. |
| **m7** | MINEUR | NOUVEAU | non | **Le panneau est en retrait de 16,1 CSS** là où la maquette le pose à plein bord. | réf x **4..1076** = 297,8 CSS (marge 1,1 CSS) · jeu x **58..1022** = 267,8 CSS (marge **16,1 CSS** de chaque côté) | m03, m07 | Renforce B2 : la planche cesse d'être le sol de l'écran pour devenir une carte posée dessus. |
| **m8** | MINEUR | NOUVEAU | non | **Le texte de l'étiquette basse est aligné à DROITE** alors que la maquette aligne à gauche. | jeu, fiche basse : marge gauche **383 px** / droite **30 px** (titre) et **721 / 30** (sur-étiquette) · réf, fiche droite : « OÙ ÇA VA » à marge gauche **0 px** | m14 | Même cause que B2 : étiquettes à largeur FIXE au lieu d'ajustées au contenu. |
| **m9** | MINEUR | NOUVEAU | non | **La punaise de départ est 18 % plus petite.** | réf **39 × 35 px** (amas rouge n = 1076), jeu **32 × 32 px** (n = 601) | m05 | Balayage du panneau entier, pas d'une fenêtre devinée. |
| **m10** | MINEUR | NOUVEAU | non | **La légende du geste et le nom du lieutenant sont +7 % trop grands.** | « à pied · ça vide le stock du labo » (chaîne identique) : **369 → 397 px** (×1,076) · nom : hauteur de capitale **27 → 29 px** (×1,074) | m10 | — |
| **m11** | MINEUR | NOUVEAU | **oui** | **Vocabulaire de fiction** : l'écran écrit « VOS **COURRIERS** » là où la maquette dit **coursier** (l'homme qui porte), jamais courrier (le pli). | source de la maquette : **coursier = 18**, **courrier = 0**, `couriers` (anglais, dans l'aside) = 1. Contrôle positif du motif : `ficelle` = 8 | grep, m13 | Faux-ami probable sur la route `GET couriers`. Les rangées disent « à vélo / à pied » : ce sont des porteurs, pas du courrier. |
| **m12** | MINEUR | NOUVEAU | **oui** | **La légende du geste ne suit pas l'état** : « à pied · ça vide le stock du labo » (conséquence d'un ENVOI) sous un bouton « TENDRE UNE AUTRE FICELLE » (état LIVRÉ). | cadre #54 (Envoyer) porte exactement cette légende ; le cadre homologue **#56** porte « **même départ, autre arrivée** » | source #54/#56 | Écart de SENS : la légende décrit une action qui n'est plus proposée. Dépend des données pour « à pied ». |
| **m13** | MINEUR | NOUVEAU | non | **La réplique du lieutenant sort de son bloc** : elle démarre au bord gauche du contenu au lieu de la colonne du nom. | réf : nom à x **202**, réplique à x **203** ⇒ **même colonne** (+0,3 CSS) · jeu : nom à x **183**, réplique à x **57** ⇒ **−35,0 CSS**, alignée sur le bord gauche du médaillon | m16 | Contrôle positif : la maquette met bien les deux dans la même colonne du flex `.perso`. Le bloc « qui parle » se scinde en deux. |
| **m14** | MINEUR | NOUVEAU | non | **Les guillemets français « » de la réplique sont absents.** | réf : avant le premier mot, un signe **court** de 16 × 13 px en partie haute (y 1828-1840), suivi d'une capitale de 25 px (y 1820-1844) · jeu : le premier groupe d'encre est un **mot** de 83 × 26 px à pleine hauteur de capitale — aucun signe court devant | m16 | Le cadre homologue **#56** porte verbatim « Livré. Le carton est au comptoir, personne n'a rien vu. », guillemets compris. |

**Compte** : 2 BLOQUANT · 6 MAJEUR · 14 MINEUR. (ASSUMÉ et ARBITRAGE sont hors de ce compte.)

### Qui est en cause — écran ou maquette ?

Je ne prescris aucune ligne à changer ; je dis seulement, pour chaque écart, **de quel côté est la
divergence**, parce que la réponse n'est pas la même partout.

| destinataire | écarts | pourquoi |
|---|---|---|
| **correcteur** (l'écran s'écarte de la maquette) | **B1, B2, M1, M2, M3, M4, M6, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m13, m14** | La maquette **rendue** porte la valeur, mesurée sur l'image ou retrouvée au bit dans la CSS du châssis commun ; le jeu en diverge. Aucune de ces grandeurs ne dépend des données. |
| **correcteur** (écart de SENS, pas de forme) | **m11** (« COURRIERS » pour *coursiers*), **m12** (légende d'ENVOI sous un bouton de RE-TENDRE) | La fiction de la maquette dit « coursier » 18 fois et « courrier » 0 fois ; la légende de #56 est « même départ, autre arrivée ». |
| **blender** (la maquette est en retard) | **M5 — pour la seule question de son EXISTENCE** | L'aside du même écran mesure `GET couriers` et `POST vehicles/purchase` comme routes joueur ; aucun des 5 cadres ne les dessine. La **forme** de la section reste au correcteur (elle est dessinée dans une matière qui contredit l'écran). |
| **arbitrage user** | l'emplacement de la section « VOS COURRIERS » et **ce qu'elle prend au liège** (22,1 % de la hauteur de contenu) ; les ronds du dock sans icône (déjà tranché) | Un produit, pas une technique : la planche ne peut pas garder 49 % de l'écran ET loger une liste de 125 CSS sans que quelqu'un tranche. |
| **blender** (combinaison non dessinée) | l'état « livré **et** la route tient » | #55 dit « tient », #56 dit « est trop fréquentée » ; le back peut produire les deux ensemble. |

---

## Table ASSUMÉ — vérifié « rendu proprement »

Le dossier ne fournit **aucune** table d'écarts assumés pour cet écran (premier tour) ; les lignes
ci-dessous viennent des règles de doctrine du dossier.

| ce qu'on voit | pourquoi c'est assumé | rendu proprement ? | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|
| Bandeau haut de 143 px, différent de la barre dessinée par le cadre de série 6 | Chrome partagé, construit à ×2,755 et non ×3,6 (règle d'échelle du dossier) | Oui — largeur 1080, aucun débordement | Un contenu d'écran passant SOUS le bandeau |
| Filet braise `#e0664a` sous le bandeau + médaillon « Brûlant » | Témoin `.tel.chaud` de `hud-brennar.html`, pas le PNG calme | Oui — mesuré **(224,102,73)** contre (224,102,74) attendu | Un filet laiton alors que le médaillon dit « Brûlant » |
| `CHALEUR`, `9 627 820,00 €`, `JOUR 50` au lieu de `HEAT`, `$ 24 850`, `Jour 12` | Ruling user 2026-09-02 « fr réel » : le client a raison, la maquette est en retard | Oui — aucun libellé anglais, aucune clé i18n brute sur la capture | Un enum brut ou un repli anglais visible |
| Le médaillon du chrome déborde de 88 px sous le bandeau (y 143..231) | Le chrome traverse la gouttière, par conception | Oui — le premier élément de contenu (titre, y 290) est dégagé | Un élément de CONTENU sous le bandeau |

---

## Table ARBITRAGE — pas corrigible côté client

| sujet | ce qui est mesuré | destinataire |
|---|---|---|
| **Ronds du dock sans icône** | Arbitrage user connu (« j'aime pas les icônes ») ; le canon HUD pose une icône 20×20, le client aucune. 4 ronds mesurés à y 2179..2295 | user (déjà tranché) |
| **La section « VOS COURRIERS » / « ACHETER UN VÉLO » n'est dessinée nulle part** | 0 occurrence de « courrier » dans la source ; « vélo » seulement dans l'aside. **Mais** l'aside du même écran mesure `GET couriers` (IDLE·IN_TRANSIT·ARRIVED) et `POST vehicles/purchase` comme routes joueur, et écrit que « FOOT est **toujours** disponible ; vélo, camionnette et voiture n'apparaissent que si le joueur en possède — la liste est **par joueur** ». Elle coûte 22,1 % de la hauteur de contenu | **blender** (compléter la maquette) puis **user** (où elle va, et ce qu'elle prend au liège) |
| **L'état capturé ne correspond à la lettre d'aucun cadre** | « C'est livré » (#56) **avec** « CETTE ROUTE : tient » (classe `ok`, valeur de #55). #56 écrit « est trop fréquentée — ça se sait » (classe `alerte`). Livré + route qui tient est une combinaison légitime du back (`route_state=active` + coursier `ARRIVED`) que la maquette n'a pas dessinée | **blender** (dessiner la 5ᵉ combinaison) — pas un défaut du client |
| **Aucun écart de POLICE** | Contrairement au cas général du dossier : `fc-match` rend DejaVu Serif → DejaVu Serif et DejaVu Sans → DejaVu Sans ; 0 `Georgia` dans le bloc CSS de ㉘. **Rien à arbitrer**, tout écart typographique est opposable | — (ligne d'information) |

---

## Chrome — jugé contre le canon HUD, pas contre le cadre de série 6

Le canon `hud-canon-1176.png` (1176 px = 392 CSS-HUD, ×3) est apparu dans le dossier **pendant**
cette passe (04:56). Je l'ai mesuré. Les deux images sont ramenées en **CSS-HUD** (canon ÷3,000 ;
capture ÷2,755) — contrôle positif : les deux rendent **392,0 CSS-HUD** de large.

⚠️ Le canon est l'état **CALME** (« 37 % », filet laiton). La capture est **BRÛLANT**. Pour le filet
du bandeau, la valeur de l'aile droite, `.heatpct` et le boîtier du médaillon, le témoin est donc la
CSS `.tel.chaud` (`--braise` 224,102,74), **pas ce PNG** — règle du dossier.

| grandeur | canon | capture | verdict |
|---|---|---|---|
| hauteur de bandeau (jusqu'au filet) | **51,0 CSS-HUD** | **51,2 CSS-HUD** | **ÉGAL** (+0,2) |
| couleur du filet | `#b08d3e` (laiton, calme) | `#e06649` | **CONFORME** au témoin `.chaud` : braise attendue (224,102,74), mesurée (224,102,73) |
| anneau du médaillon (largeur) | 64,0 CSS-HUD | 66,1 CSS-HUD | +3,3 % — hauteur non opposable (mon filtre coupe le bas de l'anneau) |
| phase de l'aile droite | « SOIRÉE · 21:40 » | « — » | **ASSUMÉ** : vidée hors district, ARGENT et JOUR étant alimentés (règle du dossier) |
| jauge or sous ARGENT | 149,0 CSS-HUD de large, à y 40,7 | 100,5 CSS-HUD, à y 30,9 | dépend de la donnée (remplissage) — non opposable |
| **flèche retour en haut à gauche** | **rien** (60 px sur un trait de 0,7 CSS-HUD de haut) | **un glyphe de 8,3 × 4,7 CSS-HUD** à x 82..104 px | **EN TROP** dans le chrome ; il décale « ARGENT » de **+48,2 CSS-HUD** (16,0 → 64,2) |
| losange or sous le médaillon | absent | **présent** (162 px clairs, y 210..240) | **EN TROP** dans le chrome |
| ronds du dock | icônes 20×20 | **aucune icône** | ARBITRAGE user connu |
| onglets | EMPIRE · FAMILLE · **MARCHÉ** · PLUS, pastille au-dessus de l'actif | EMPIRE · FAMILLE · **FILIÈRE** · PLUS, soulignement or sous EMPIRE | non opposable ici — voir « non vérifié » n° 6 |

⇒ **Aucune de ces lignes n'est un défaut de ㉘** : le bandeau et le dock appartiennent au shell, et
le dossier classe explicitement en ASSUMÉ toute différence de chrome entre le cadre de série 6 et la
capture. Je les écris quand même, chiffrées, pour que l'assumé n'absorbe pas en silence deux
éléments (flèche retour, losange) qui ne sont **ni dans le canon HUD, ni dans le cadre de série 6**.
Destinataire : **shell / arbitrage user**, pas le correcteur de cet écran.

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, **1080×2400**. La ligne GO publie elle-même
`(a) deux résolutions 1920+2400 → NON — 2400 seulement`. Le reflux à une autre résolution, la
conservation des proportions et l'absence de coupure ailleurs qu'en 20:9 sont **non vérifiés**.

Ce que j'ai pu vérifier sur la seule résolution fournie :
- rien de coupé sur les bords : **0 px clair** dans les 4 px de gauche et les 4 px de droite, sur
  toute la zone de contenu (y 143..2179) ;
- rien sous le dock : **0 px clair** dans la bande 2170..2181 ; dernier pixel de contenu à y = 2092,
  soit **87 px (24,2 CSS) de gouttière** ;
- rien sous le bandeau : les 264 px clairs de la bande 143..151 appartiennent au **médaillon du
  chrome**, qui a le droit de traverser.

---

## 6. Non vérifié

| # | ce que je n'ai pas pu vérifier | la mesure hors image qui trancherait |
|---|---|---|
| 1 | **La résolution 1920** (reflux, proportions, coupures) | une capture 1080×1920 du même état |
| 2 | **L'absence d'animation** (ruling 2026-08-27) : une seule image, aucune paire T / T+1 s | deux captures du même état à 1 s d'intervalle, puis compte des pixels différents hors chrome |
| 3 | ~~Le canon HUD est absent du dossier~~ — **rétracté en cours de passe.** À 04:30 le fichier annoncé par `dossier.md` n'existait pas (`ls` → No such file) ; il est apparu à **04:56**, pendant mes mesures. Je l'ai donc mesuré : voir la section **Chrome** ci-dessous. Je laisse la trace de l'énoncé daté plutôt que de la réécrire en silence | — (résolu) |
| 4 | **Le cadre homologue #56 n'est pas rendu.** Toute ma mesure de forme s'appuie sur le châssis commun rendu (#54), légitime parce que #54 et #56 partagent la totalité des classes CSS — mais les traits propres à #56 (ficelle `#e0c07a` épaisse 3,2 « saturée, elle s'épaissit et jaunit », 3ᵉ ligne en classe `alerte` `#d97a6a`, légende « même départ, autre arrivée ») n'ont **jamais été montrés en image** | `Tools/rendre-tel.py ecrans-brennar-6.html 56 <sortie> 3.6` |
| 5 | **Toutes les VALEURS de la capture** (noms des bâtiments, montant, jour, nombre de coursiers, « Dima ») : identité déclarée par corps de commit, **journal non joint** | la ligne `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal du run, jointe au dossier |
| 6 | **L'onglet actif et le chemin joueur.** La planche est une **surimpression sous le chrome** : « Plus → LA DISTRIBUTION » n'est pas exercé. Le dock souligne **EMPIRE** alors que l'écran vit sous **PLUS** — non opposable sur cette capture | une capture prise par le chemin joueur (suite sous shell qui active l'onglet) |
| 7 | **La punaise d'arrivée** (bleue `#3f6f8f`) : elle est **occultée par l'étiquette** dans la maquette comme dans le jeu ; je ne peux pas dire si le client la dessine | un rendu du cadre sans l'étiquette, ou une capture avec des libellés courts |
| 8 | **L'état VIDE.** Non capturé. La maquette d'état vide de l'atelier (`etats/vide-maquette-distribution.png`, 1024×1024) montre une **planche nue sous une lampe, une pelote de ficelle au sol et des punaises libres** : elle dit « le tableau est vide et prêt », jamais une perte ni une punition — conforme à la règle d'user du 07/09. Je ne peux pas dire ce que le client affiche quand il n'y a pas de route | une capture de l'écran sur un compte sans route tendue |
| 9 | **Le rect imprimé par le test** (log non préservé). J'ai vérifié la géométrie sur l'image : largeur 1080, hauteur 2400, et le facteur ×3,6 validé par 12 valeurs hex CSS retrouvées au bit | `git rev-parse HEAD` et le rect imprimés au run, joints au dossier |
| 10 | **Si « tient » est la bonne réponse** pour l'état réel de la route de ce compte (je juge la couleur, pas la valeur) | rapport `juge-donnees` — aucun n'existe pour cet écran (écran neuf) |
| 11 | **Le liège du jeu porte-t-il une texture invisible à ma sonde ?** Non : deux fenêtres de 36 000 px rendent **1 teinte, 100 %**. Un aplat ne peut pas cacher un grain. Je le note pour dire que le zéro a été cherché à d = 1 comme à d = 30 (règle du dossier sur les zéros au-delà d'une distance) | — |

---

## Annexes

### Annexe 1 — Inventaire de la référence (cadre #54 rendu, châssis de #56)

**Couche globale** — palette dominante de la zone de contenu (y 434..2102, quantification 32) :
`#705030` 17,3 % · `#101030` 16,9 % (`.bas`) · `#301010` 15,6 % (`.entete`/`.lecture`) · `#101010`
14,8 % · `#f0f0d0` 9,9 % (papier) · `#907030` 9,6 %. Luminance moyenne **74,39**. Densité de
matière (L ≥ 60) **46,5 %**. Rythme vertical : 4 frontières nettes à y = 434, 604, 1425, 1673.
Poids visuel : planche **62,0 %**, bas 18,0 %, lecture 12,7 %, entête 7,4 %.

| id | catégorie | parent | bbox (px) | % du contenu | forme | remplissage | bord | effet | texte |
|---|---|---|---|---|---|---|---|---|---|
| `R.entete` | bande | contenu | 4,434→1076,604 | 10,2 % de la hauteur | rect | `#20180f` | bas 1px `#3d3024` | — | h3 700 12px Serif `#f0dfc4` (cap 32 px) ; p 7px Sans `#9a8a6a` (cap 19 px) |
| `R.planche` | panneau | contenu | 4,604→1076,1425 | **49,2 %** | rect plein bord | `#8a6a42` + 2 trames de points (9 et 13 CSS) + dégradé 158° `#9a774b→#7b5c37→#654a2c` (L 109,6→88,9) | — | ombre interne 44 CSS | — |
| `R.cadre-b` | cadre | `R.planche` | inset 5 CSS | — | rect, rayon 3 | — | **5 CSS `#4a3722`** (18 px mesurés) | halos 1px `#00000044` / `#2a1e12` | — |
| `R.fiche.g` | étiquette | `R.planche` | 51,670→850,829 | 74,5 % de la largeur du panneau, 4,4 % du bord gauche | rect, rayon 1, **rotate −2,39°** | `#efe6d4` | 1px `#cbbfa4` | **ombre portée, portée 30 px, excès 24,8** | b 700 9px Serif (cap 24 px) ; i 6,2px caps `#6d6250` (190 px de large) |
| `R.fiche.d` | étiquette | `R.planche` | 238,1190→1026,1357 | 73,5 %, 4,7 % du bord droit | rect, **rotate +1,58°** | `#efe6d4` | 1px `#cbbfa4` | idem | idem, texte aligné à gauche |
| `R.fil` | ficelle | `R.planche` | diagonale | pente 36° | courbe, **flèche 13,3 px** | trait `#c9bda0`, 6,6 px + ombre | — | ombre décalée (1,5 ; 2,5) | — |
| `R.punaise` | punaise | `R.planche` | 264,848→302,882 | 39 × 35 px | ellipse | `#c4413a` + reflet | — | ombre au sol | — |
| `R.lecture` | bande | contenu | 4,1425→1076,1673 | 14,9 % | rect | `#1a1108` | haut 1px `#3d3024` | — | 3 lignes ; u 6,6px caps `#9a8a6a` ls 0,9px ; b 700 8,2px `#efe6d4` |
| `R.sep` | séparateur | `R.lecture` | y 1517-1519 ; 1581-1583 | — | **pointillé** | `#3d3024`, **50 % allumé, 320 alternances** | — | — | — |
| `R.bas` | bande | contenu | 4,1673→1076,2102 | 25,7 % | rect | `#141a21` | haut **2px `#2c3640`** | — | — |
| `R.av` | médaillon | `R.bas` | 46,1716→168,1837 | **34,2 × 33,9 CSS** | **cercle** (taux 0,798) | `#212932`, **186 teintes** (silhouette) | 1px `#3b4650` | — | — |
| `R.nom` | texte | `R.bas` | y 1720-1747 | — | — | `#eef3f9` | — | — | 700 10px Serif, cap 27 px |
| `R.dit` | texte | `R.bas` | y 1818-1896, 2 lignes | — | — | `#cdd6e0` | — | — | italique 9px Serif, guillemets « » |
| `R.geste` | bouton | `R.bas` | y 1938-2043 | 29 CSS de haut | rect, rayon 3 | **`#241c11`** | **1px `#5a4a2a`** | — | b 700 9,5px caps **`#d9ab4e`** (cap 25 px) ; small 6,5px `#9a8a6a` **dedans, à droite** (x 621..989) |

### Annexe 2 — Inventaire de la capture (1080×2400)

**Couche globale** — palette du contenu (y 143..2179) : **`#101010` 54,9 %** · `#303030` 16,9 % ·
`#705030` 9,4 % · `#f0f0d0` 9,0 % · **`#d0b050` 5,5 %** (le pavé or) · `#301010` 0,8 %. Luminance
moyenne **58,16**. Densité **27,3 %**. Poids visuel : planche 60,3 %, **CTA 20,2 %**, section en trop
12,2 %, titre 3,1 %, lecture 2,6 %, perso 1,6 %.

| id | catégorie | bbox (px) | % du contenu | forme | remplissage | bord | effet | texte |
|---|---|---|---|---|---|---|---|---|
| `C.chrome` | bandeau (hérité) | 0,0→1080,143 | — | — | `#0d141a` + filet **`#e06649`** (y 141-142) | — | médaillon débordant jusqu'à y 231 | ARGENT 9 627 820,00 € · Brûlant / CHALEUR · JOUR 50 · « — » |
| `C.titre` | texte | y 290-339 | 18,7 % avec le sous-titre | — | `#eef1f2` sur `#0d0d0d` | — | — | cap **46 px** (réf 32) ; contraste 17,12:1 |
| `C.soustitre` | texte | y 402-472, **2 lignes** | — | — | `#8a979c` | — | — | cap **27 px** (réf 19) |
| `C.planche` | panneau | 58,524→1022,956 | **21,2 %** | rect | **`#7a5331` uni, 1 teinte** | **aucun** | **aucun** | — |
| `C.fiche.h` | étiquette | 108,575→971,719 | 89,5 % de la largeur du panneau | rect **0,00°** | `#eae0c8` | **aucun** | **aucune ombre (0,00 à d=1..30)** | b cap 24 px ; i 166 px, aligné à gauche |
| `C.fiche.b` | étiquette | 108,770→971,904 | 89,5 %, **décalage 0,0 CSS** | rect **−0,08°** | `#eae0c8` | aucun | aucune | b et i **alignés à DROITE** |
| `C.fil` | ficelle | 107,696→971,780 | pente 5,5° | quasi droite, **flèche 1,9 px** | `#c9bda0`, **6 px** | — | pas d'ombre | — |
| `C.punaise` | punaise | 92,681→123,712 | **32 × 32 px** | ronde | rouge | — | — | — |
| `C.lecture` | 3 lignes | y 956-1240 | 13,9 % | — | **fond `#0d0d0d`, aucune bande** | **aucun séparateur** | — | u `#b8c2cc` (+15 %, ls 0) ; b `#eef1f2` (+16 %) ; « tient » **`#42e0c0`** |
| `C.courriers` | **section en trop** | y 1240-1690 | **22,1 %** | 3 rangées 25,8 CSS + bouton 26,1 CSS, 268,3 CSS de large | rangées `#222a2e`, bouton `#2a2e38` | — | — | « VOS COURRIERS » ; « à vélo / prêt » ×2 ; « à pied / arrivé » ; « ACHETER UN VÉLO » |
| `C.av` | médaillon | 57,1717→150,1810 | **26,1 × 26,1 CSS** | **carré** (taux 1,000) | `#222a2e`, **1 teinte** | — | — | vide |
| `C.nom` | texte | y 1723-1752 | — | — | clair | — | — | cap 29 px (réf 27) |
| `C.dit` | texte | y 1845-1876, 1 ligne | — | — | gris italique | — | — | **sans guillemets** |
| `C.cta` | bouton | 57,1906→1022,2036 | **36,1 CSS de haut** | rect | **`#d9ab4d` en aplat** | — | — | texte **`#221600`** cap 27 px ; contraste 8,36:1 |
| `C.legende` | texte | 59,2067→455,2093 | — | — | `#b8c2cc` | — | — | **sous** le bouton, **à gauche** ; +7,6 % |
| `C.dock` | dock (hérité) | y 2179→ | — | 4 ronds, **sans icône** | bleuté | — | — | EMPIRE · FAMILLE · FILIÈRE · PLUS |

### Annexe 3 — Correspondance des repères

- **Échelle du CONTENU** : 1 px CSS = **3,6 px** des deux côtés (référence `.tel` 300 CSS → 1080 px ;
  capture dessinée à `LargeurEcransBrennar6 = 300` → 1080 px). **Rapport capture ÷ référence = 1,00**
  ⇒ tout écart de taille sur le contenu est un écart RÉEL. Vérifié, et non supposé, par la
  restitution au bit de 12 valeurs hexadécimales CSS sur la référence (contrôles 2 à 13).
- **Échelle du CHROME** : ×2,755 (392 CSS-HUD → 1080 px). Le bandeau mesure **143 px = 51,9 CSS-HUD**
  contre 52 annoncés. Le chrome n'est donc pas comparable au cadre de série 6 — c'est un ASSUMÉ.
- **Origines verticales** : référence, contenu = y 434 (fin du bandeau) → 2102 ; **H = 1668 px =
  463,3 CSS**. Capture, contenu = y 143 (fin du filet braise) → 2179 (premier rond du dock) ;
  **H = 2036 px = 565,6 CSS**. Toute part est exprimée en % de ces H, jamais en px absolus.
- **Falsifiable du découpage** : somme des zones == H, **écart 0 px des deux côtés** (m15).

### Annexe 4 — Scripts

Tous dans `mesures/`. Chacun **imprime la taille des images qu'il ouvre** et porte au moins un
contrôle positif ; les contrôles négatifs sont notés là où l'enjeu le méritait.

| script | ce qu'il mesure | contrôle |
|---|---|---|
| `m01_bandes.py` | frontières horizontales des deux images | + largeur = 1080 des deux côtés |
| `m02_aplats.py` | médianes de fenêtre des aplats nommés | + 8 hex CSS retrouvés au bit · − entête ≠ lecture |
| `m03_liege.py` | bords du panneau, cadre bois, texture, dégradé | + `.cadre-b` = 18 px de `#4a3722` à 18 px du bord · − fenêtres de fond |
| `m04_fiches_fil.py` | bbox, inclinaison, ombre, ficelle, punaise | + rotation réf = −2,39° pour −2,4° CSS · − réf vs jeu |
| `m05_punaises_ombre.py` | reprise : balayage des punaises, portée de l'ombre à d = 1..30, inclinaison sous la ficelle | + punaise rouge trouvée sur la référence |
| `m06_ficelle_lecture.py` | ficelle dans la bande libre, flèche de l'arc, séparateurs | + pic = `#c9bda0` · + pointillé `#3d3024` à 50 % |
| `m07_gabarit.py` | rect de contenu, dock, balayage pointillé de tout l'écran, gabarit vertical | + filet braise (224,102,73) |
| `m08_typo.py` | premières hauteurs de capitale | ⚠️ **contrôle positif ÉCHOUÉ** (fenêtres y devinées) ⇒ repris par m09/m10 |
| `m09_lignes_texte.py` | localisation des lignes d'encre par profil | — (instrument de repérage) |
| `m10_chaines_identiques.py` | 9 chaînes **identiques** dans les deux images : largeur et hauteur | + `.fiche b` sort à ×1,000 |
| `m11_global.py` | palette, luminance, densité, contrastes, rondeur, interlettrage, dock | ⚠️ 3 fenêtres mal posées ⇒ reprises par m12 |
| `m12_reprises.py` | reprise : médaillon, contrastes par percentile, haut du dock, bord des fiches | + `.av` réf = ROND 0,798 · − rangée jeu = CARRÉ 1,000 |
| `m13_lecture_globale.py` | poids visuel par zone, géométrie de la section en trop, teinte de « tient » | + la planche sort en tête sur la référence (62,0 %) |
| `m14_composition.py` | largeur, décalage latéral, alignement du texte des étiquettes | + décalage réf non nul (+51,7 CSS) |
| `m15_verifs_finales.py` | teintes du liège (fenêtres propres), somme == total, recherche de coupure | + réf = 673 teintes / 312 teintes selon la fenêtre |
| `m16_replique.py` | indentation de la réplique, guillemets | + nom et réplique dans la même colonne sur la référence (+0,3 CSS) |
| `m17_chrome.py` | chrome contre le canon HUD | + 392,0 CSS-HUD de large des deux côtés · ⚠️ **deux mesures fausses** (médaillon, flèche) ⇒ reprises par m18 |
| `m18_chrome_reprise.py` | reprise : anneau par sa COULEUR, fenêtres posées en CSS-HUD | + contrôle de rondeur qui a **détecté** que m17 mesurait le filet |

⚠️ **Deux scripts ont vu leur contrôle positif échouer** (`m08`, `m11`) parce que j'avais **deviné**
les fenêtres au lieu de les trouver. Je les ai laissés dans le dossier avec leur échec, et repris
les trois grandeurs concernées par `m09`/`m10` et `m12`. Aucun chiffre de `m08` ni les trois
grandeurs fautives de `m11` ne sont repris dans les tables ci-dessus.
