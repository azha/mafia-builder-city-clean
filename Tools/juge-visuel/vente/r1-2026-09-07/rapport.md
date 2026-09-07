# Juge visuel ⊥ — ㉟ La vente (« les points de vente ») — r1 — 2026-09-07

## Verdict : **NON APPROUVÉ**

Le châssis de l'écran dessiné par la maquette — boîtier cerné de laiton, plaque d'enseigne, trois
compteurs, conteneur de liste, pied à CTA — n'existe pas dans la capture : il reste un titre, une
carte et 74,2 % de noir plat, et les deux qualificatifs affichés sont en anglais.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL / CONFORME

Seize grandeurs, toutes produites par un script de `mesures/`.

| # | grandeur | mesure | script |
|---|---|---|---|
| 1 | largeur des trois images | 1080 px des trois côtés (réf 1080×2102, capture 1080×2400, planche 1080×2400) | `m00` |
| 2 | échelle ×3,6 de la RÉFÉRENCE, vérifiée sur 4 grandeurs CSS indépendantes | `.cerne` inset 5 CSS → **18 px** · `.enseigne` margin-top 13 CSS → **47 px** · `.enseigne` border-bottom 2 CSS → **7 px** · `.vnt6` height 462−10 CSS → **1 627 px** ⇒ 3,60 px/CSS | `m04`, `m06c` |
| 3 | jetons de la référence retrouvés **à l'octet** | titre `(242,201,107)` = `#f2c96b` · sous-titre `(185,173,146)` = `#b9ad92` · filet d'enseigne `(176,141,62)` = `#b08d3e` · compteur `(127,212,217)` = `#7fd4d9` · fond `.dl` `(17,24,35)` = `#111823` · fond `.elast` `(13,15,16)` = `#0d0f10` | `m06c`, `m08`, `m11` |
| 4 | hauteur du bandeau de la capture | dérivée du code 143 px ; filet mesuré à **y=141..142**, fond d'écran dès y=143 | `m13` |
| 5 | filet du bandeau en régime BRÛLANT | `(224,102,73)` mesuré hors médaillon = jeton `--braise` `(224,102,74)` attendu par `.tel.chaud` — écart ≤ 1/255 | `m14` |
| 6 | **chrome ALIMENTÉ** (le corps de commit antérieur signalait « manomètre *Unknown* ») | ARGENT en or `(242,201,106)`, « JOUR 50 », médaillon « Brûlant / CHALEUR » — aucun « Unknown », aucun tiret sur ARGENT/JOUR | `m10`, `m14` |
| 7 | dock | 4 ronds à x 196..321, 383..509, 570..696, 758..883 ⇒ centre 539,5 (écran 540) ; intérieur `(27,36,50)`, vide | `m14` |
| 8 | titre centré | centre d'encre x = **539,0** pour un écran de 1080 (centre 540) — 1 px | `m06b` |
| 9 | jeton crème du nom | `(234,224,200)` = `#eae0c8`, identique au `.dl .qui b` de la maquette | `m10b`, `m11` |
| 10 | contrastes de tous les textes de l'écran | min **4,34:1** (le CTA éteint) ; libellés 8,75:1 ; valeurs 14,80:1 ; titre 9,15:1 — au-dessus des planchers 3:1 / 4,5:1 | `m10b` |
| 11 | cadre de la CARTE : continu | **960/960** colonnes portent un pixel de bord, 0 trou (c'est ce témoin qui rend le trou du bouton opposable) | `m07` |
| 12 | gouttière respectée | contenu d'écran de y=215 à y=669 ; rect libre y=144..2178 ⇒ rien sous le bandeau, rien sous le dock, rien hors cadre, aucun texte coupé | `m13` |
| 13 | les deux planches montrent le MÊME contenu d'écran | sous le médaillon (y ≥ 200, c.-à-d. l'écran proprement dit) : **12 px** au-delà de ±8, tous sur **une seule colonne** (x=283), l'anticrénelage d'un pip. Les 1 823 autres px > 8 de la bande y ≥ 144 sont à x=462..617 y=144..200 — le bas du **médaillon du chrome**, pas l'écran. Tout le reste est à ±1..2 (dégradé) | `m17`, `m17b` |
| 15 | **hauteur du bandeau, contre le CANON HUD** (arrivé dans le dossier pendant le travail) | canon : filet laiton `(167,134,60)` à y=153..155 ⇒ **52,3 CSS-HUD** ; capture : filet braise à y=141..142 ⇒ **51,5 CSS-HUD**. Écart 0,8 CSS-HUD (1,5 %) | `m21` |
| 16 | **l'ornement du coin haut-gauche est CANONIQUE** | canon : x=15..129 · y=50..99 (38,3 × 16,7 CSS-HUD), `(78,80,82)`, **2,15:1** ; capture : 29,4 × 6,9 CSS-HUD, `(65,67,68)`, **1,89:1**. Même objet, même registre de contraste | `m20`, `m21` |
| 14 | instrument discriminant | contrôle négatif sur bande vide → 0 colonne, 0 px d'encre ; contrôle positif `est_or(#f2c96b)`=vrai / `est_or(#0e1420)`=faux ; `teal(#7fd4d9)`=vrai / `teal(#111823)`=faux | `m02`, `m07`, `m15` |

> ⚠️ **Un instrument m'a menti et son contrôle l'a dit.** Mes deux premières versions de `m16`
> (invariants de structure de la maquette) rendaient **0 UNIFORME** sur les 6 cadres : le motif était
> juste, la POPULATION était fausse (un cadre s'étale sur 3 lignes source, je n'en lisais qu'une).
> `m16d_invariants_maquette.py` corrigé rend un tableau non uniforme, contrôles positif ET négatif verts.

---

## 0. L'écran, tel que la maquette le dit

*(écrit sur la référence SEULE, avant d'ouvrir la capture — `front.md` ne donne pas le but)*

**Le but.** Savoir **qui vend, et ce qu'il y a dans la caisse**. C'est le tableau de bord des dealers
postés sur les points de vente : combien travaillent, chez qui la caisse est pleine, qui s'est fait
prendre — et c'est de là qu'on en affecte un de plus.

**L'ordre de lecture.** (1) l'**enseigne** « La vente », or vif, 12,5 CSS de capitale, seule masse
chaude du haut, posée sur une plaque soulignée d'un filet laiton — elle nomme l'écran ; (2) les
**trois chiffres teal** des compteurs (10,8 CSS, halo `#7fd4d999`), seule couleur froide vive, qui
donnent l'état du monde en une seconde : 03/6 au travail · 03 caisses pleines · 01 grillés ;
(3) la **liste** des six dealers, de haut en bas, chaque rangée sur sa plaque : nom + lieu + lek +
posture de prix à gauche, état et jauge à droite ; (4) le **CTA laiton** pleine largeur en pied ;
(5) la **note** du bas, qui dit le problème du moment.

**Les zones.** Cerne laiton (le boîtier) · enseigne · trois compteurs · conteneur de liste ·
pied (CTA + note).

**Les traits d'identité.** (a) le **cerne laiton** qui fait de l'écran un *boîtier* et non une page ;
(b) une **nuit bleutée en dégradé**, halo or en haut, halo teal en bas ; (c) le duo **or / teal** sur
ardoise `#2a3648` ; (d) une liste **dense** — six rangées de 32,5 CSS, chacune sur sa plaque plus
claire que le fond ; (e) l'état d'un dealer **codé par la couleur du statut** : vert `#7db36a`,
gris `#8a979c`, rouge `#ff5a4d`, gris froid `#6b737d`.

**Le témoin d'état.** La capture montre un point de vente et un ramassage refusé : l'état le plus
proche est le cadre **#109 « Ramasser — nulle part où la porter »**, qui n'est **pas rendu** ce tour.
Je compare donc la FORME au cadre nominal #107 rendu, et j'établis ce qui est **invariant d'état**
en comptant dans la SOURCE des six cadres : `.cerne` **6/6**, `.enseigne` **6/6**, `.compteurs`
**6/6** avec exactement **3 `.fen`** dans chacun (`m16d`). Ce qui suit sur le châssis ne dépend donc
d'aucun choix de témoin.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, et l'écart n'est pas de degré. La maquette est un **boîtier plein** ; la capture est un **titre
posé sur du noir**. Le cerne laiton, la plaque d'enseigne, les trois compteurs et le conteneur de
liste sont absents — et ils sont présents dans **6 cadres sur 6** du groupe, donc leur absence ne
s'explique par aucun état. Ce qui reste occupe **25,8 %** du rect libre : sous la carte, sur
1 509 px de haut, l'instrument compte **zéro** pixel non-fond. La place ne manque pas : le rect libre
fait 565 CSS quand le panneau de la maquette en demande 462.

L'**ordre de lecture** est amputé de son deuxième temps. Dans la maquette, l'œil va au titre puis
aux trois chiffres teal — l'état du monde avant le détail. Ici il n'y a pas de deuxième temps : du
titre on tombe directement sur une carte, puis sur le vide. Il n'y a **aucune action** : le pied à
CTA laiton (« AFFECTER UN DEALER ») n'existe pas, et le seul bouton de l'écran est éteint **et son
cadre est brisé** — 334 px de rail manquants en haut comme en bas.

Les **traits d'identité** tombent trois sur cinq. La nuit bleutée dégradée avec ses deux halos est
devenue un **aplat neutre** `(13,13,13)` : la saturation moyenne de la zone passe de 0,383 à
**0,0079** (÷48) et 97,7 % de l'aire tient dans une seule benne de couleur — ce n'est pas un écart
d'espace de mélange, aucun espace ne transforme un dégradé saturé en gris parfait, c'est un fond
qui n'est pas peint. Le duo or/teal perd le teal (aucun `#7fd4d9` sur l'écran) et l'or du titre
n'est pas celui de l'enseigne : `#d9ab4e` au lieu de `#f2c96b`, **plus sombre et plus orangé**.
L'ardoise `#2a3648` est remplacée par un gris neutre `(106,106,106)`, deux fois plus clair.

Et le **sens** décroche à deux endroits. Les deux qualificatifs des jauges sont en anglais —
« Moderate », « Standard » — sur le seul contenu de l'écran, là où la maquette écrit « cher »,
« au tarif », « au-dessus ». Le blocage, lui, est réduit à un sous-libellé gris dans un bouton
cassé, alors que la maquette lui consacre un panneau bordé de rouge, un titre et trois lignes qui
nomment le maillon manquant : le joueur lit « l'écran est cassé » là où il devrait lire « la chaîne
est bloquée, rien n'est perdu ».

**Les trois écarts de tête**, par impact perçu : ① le châssis absent (B1) ; ② l'écran vide à 74 %
sans aucune action (B2 + M2) ; ③ l'anglais brut sur le seul contenu (B3).

---

## 3. Écarts

Format imposé par `dossier.md`. Gravité : liste fermée à trois valeurs ; `ASSUMÉ` et `ARBITRAGE`
sont dans les tables à part et **ne sont pas comptés** ici. Colonne `données` : « oui » = observation
DATÉE qui dépend du compte photographié ; « non » = vraie quelles que soient les données.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| **B1** | BLOQUANT | NOUVEAU | non | **Le châssis de l'écran est absent** : ni cerne laiton, ni plaque d'enseigne (titre + sous-titre + filet laiton), ni les trois fenêtres de compteurs, ni le conteneur de liste. | Maquette : `.cerne` 1× · `.enseigne` 1× · `.compteurs` 1× avec **3 `.fen`** dans **6 cadres sur 6** (`m16d`) ⇒ invariant d'état. Réf : cerne laiton `(176,141,62)` à x=21..1058 / y=452..2078 (288,3 × 452 CSS) ; enseigne y=481..646 fermée par un filet laiton de 7 px ; `.fen` y=679..792 ; `.elast` y=825..1869. Capture : **0** trait laiton dans la zone de contenu hors chrome (seule encre laiton = le losange 18×17 px et les 4 pips), **0** chiffre teal, **0** sous-titre, **0** conteneur de liste (`m02`, `m06b`, `m09`). | — |
| **B2** | BLOQUANT | NOUVEAU | partiellement | **L'écran est vide à 74,2 %** et il ne l'est pas par manque de place. | Rect libre bandeau→dock = y 144..2178 = 2 035 px = **565 CSS** ; le panneau de la maquette en demande **462 CSS**. Contenu de la capture : y 215..669 ⇒ **25,8 %** occupé. Sous la carte, sur 1 509 px (419 CSS), **0 pixel** avec lum > 16,5 (`m13`). Densité d'encre de la zone : 14,54 % (réf) → **2,12 %** (capture) (`m09`). | Le nombre de points de vente dépend du compte ; la structure absente (B1) fait que la question ne se pose pas — même six cartes laisseraient le pied et les compteurs manquants. |
| **B3** | BLOQUANT | NOUVEAU | non | **Deux valeurs en ANGLAIS sur le seul contenu de l'écran** : « Moderate » (jauge Caisse) et « Standard » (jauge Marge) — la forme même d'un enum non résolu. | Encre mesurée : « Moderate » x=387..503 y=439..459, capitale 19 px (5,28 CSS), `(234,224,200)` ; « Standard » x=344..454 y=485..504, mêmes métriques (`m10b`). Homologue maquette : un qualificatif **français** dans la ligne du dealer — « cher », « au tarif », « au-dessus », « très cher ». Doctrine du dossier : « aucun enum brut, aucun repli anglais ne doit atteindre l'écran » ; « un libellé de repli visible sur la CAPTURE = écart de SENS ». | La clé i18n exacte et le fait que ce soit un repli plutôt qu'un libellé voulu : hors image (bundle `fr`). |
| **M1** | MAJEUR | NOUVEAU | non | **Le cadre du bouton RAMASSER est brisé** : le rail du haut ET le rail du bas s'interrompent au tiers droit ; un fragment de coin flotte, détaché, à l'extrême droite. | Trou **x=629..962** (334 px = 92,8 CSS) sur les DEUX rails, soit **36 %** de la largeur du bouton (x=71..1008, 938 px = 260,6 CSS). Entre x=820 et x=939, **zéro** pixel d'encre sur toute la hauteur du bouton (`m07`, `m07b`). Contrôle positif dans le même script : le cadre de la carte est continu 960/960. **Reproduit à l'identique sur les deux campagnes.** | La cause (tuile centrale d'un 9-slice non répétée, sprite tronqué, masque) : hors image. |
| **M2** | MAJEUR | NOUVEAU | non | **Aucune action « AFFECTER UN DEALER »** : le pied à CTA laiton pleine largeur n'existe pas, et l'écran n'offre aucune action possible (son seul bouton est éteint). | Réf : `.cta6` x=50..1029 (980 px = 272,2 CSS), y=1902..1995 (94 px), bord `#b08d3e`, texte `#f2c96b`, capitale 6,11 CSS ; suivi de la note `.note6` y=2018..2041 (`m04`, `m11`, `m18b`). Capture : rien entre y=670 et le dock (`m13`). Le CTA est présent dans **4 cadres sur 6** de la maquette. | La maquette elle-même déclare, cadre #112, le lot **L3** « choisir le point de vente depuis cet écran — aucune route ne les liste » : l'absence peut être un maillon manquant assumé plutôt qu'un défaut de rendu. **Aucune table d'écarts assumés n'existe pour cet écran** ⇒ arbitrage user. |
| **M3** | MAJEUR | NOUVEAU | non | **Le fond a perdu la nuit napolitaine** : la maquette compose un dégradé bleu nuit plus un halo or en haut et un halo teal en bas ; la capture est un aplat NEUTRE. | Réf, panneau : luminance moyenne **28,85**, saturation moyenne **0,383**, dominante `(0,24,24)` bleutée ; profil vertical à x=540 : `(23,28,36)` en haut → `(45,43,37)` au niveau du halo or → `(18,26,28)` en bas. Capture, rect libre : luminance moyenne **15,12**, saturation moyenne **0,0079**, **97,73 %** de l'aire dans la seule benne `(0,0,0)` ; fond `(13,13,13)` **identique** de y=700 à y=2100 (`m09`). | — (ce n'est pas un écart d'espace de mélange : aucun espace ne rend un dégradé saturé en gris de saturation 0,008.) |
| **M4** | MAJEUR | NOUVEAU | non | **La carte n'a pas de plaque, et son bord a changé de famille** : intérieur identique au fond de page, bord gris neutre là où la maquette pose une ardoise bleutée. | Capture : intérieur `(13,13,13)` = fond hors carte `(13,13,13)` ; bord `(106,106,106)`, épaisseur 5 px (1,39 CSS) (`m08`). Réf : `.dl` fond `(17,24,35)` = `#111823` **distinct** du fond de liste `(13,15,16)` = `#0d0f10` ; bord `#2a3648` `(42,54,72)`. Luminance du bord ×2,0 ; saturation du bord 0,42 → **0,00**. | — |
| **M5** | MAJEUR | NOUVEAU | non | **Le titre n'est pas au jeton de l'enseigne** — il est **plus sombre et plus orangé** (pas « plus gris »). | Capture : `(217,171,77)` sur **5 554 px**, p50 = p90 = max ⇒ jeton plat = `#d9ab4e` `(217,171,78)`, qui est dans la maquette le jeton des **jauges**, pas de l'enseigne. Réf : `(242,201,107)` = `#f2c96b`. Δ = (25,30,30) par canal, soit 4 à 5× la tolérance de 6/255 (`m06c`, `m10b`). | — |
| **M6** | MAJEUR | NOUVEAU | non | **Le statut a perdu son codage couleur** : « AU POSTE » est dans un gris chaud qui n'appartient à aucune des quatre familles d'état de la maquette. | Capture : `(185,173,146)` = `#b9ad92`, capitale 21 px (5,83 CSS) (`m10b`). Réf `.dl .et` : vert `#7db36a` `(125,179,106)` mesuré (au travail), `#8a979c` (au repos), `#ff5a4d` (grillé), `#6b737d` (pas là) — capitale 12 px (3,33 CSS) (`m11`). Le statut affiché correspond à « au travail » ⇒ il devrait être **vert**. | Un seul statut est visible : je ne peux pas prouver que les trois autres familles ont disparu, seulement que celle-ci est hors palette. Trancherait : une capture d'un compte comptant un dealer grillé. |
| **M7** | MAJEUR | NOUVEAU | non | **Les jauges ont changé de forme, de compte et de jeton** : cinq carrés CREUX au trait orange, là où la maquette pose quatre barres PLEINES. | Capture : **5** segments par jauge, x 180..365 (pas 40 px), hauteur 25 px (6,94 CSS), **creux** (coupe verticale au centre : encre à y=438..440 et y=458..462, fond `(13,13,13)` entre les deux) ; trait allumé `(184,113,17)`, éteint `(54,54,54)` (`m12`). Réf : `.jg` **4** segments pleins de 34 px chacun, x 809..965 (**43,6 CSS** mesurés au total ; CSS `width:44px`), hauteur 5 CSS *(CSS, non mesurée séparément — le statut au-dessus contamine la coupe)*, `#f2c96b`/`#d9ab4e`, éteint `#2a3648` ; `.marge` **4** petites barres pleines. | Que « Caisse » corresponde bien à `.jg` et « Marge » à `.marge` est **ma lecture** (les noms concordent) ; le juge-données le trancherait. |
| **M8** | MAJEUR | NOUVEAU | non | **L'identité du produit est perdue** : un disque or uni remplace le glyphe de substance, et il fait moins de la moitié de sa taille. | Capture : disque x=71..108, y=377..414 ⇒ **38 × 38 px = 10,6 CSS**, dégradé `(89,66,17)` → `(211,166,74)` → `(136,102,29)`, aucun dessin (`m13`, `m14`). Réf : `svg width=19 height=19` = **19 CSS = 68 px**, glyphe **coloré par substance** (billet or `#f2c96b`, losange teal `#7fd4d9`, dague crème `#efe9da`, boîte violette `#c9a8e0`). Taille : **−44 %**. | — |
| **M9** | MAJEUR | NOUVEAU | oui | **La ligne « lieu · lek N · posture de prix » est absente** : ni district, ni lek, ni tarif nulle part sur l'écran. | Réf `.dl .qui small` : « La Lisière · lek 12 · cher », x=213..545, capitale 17 px (4,72 CSS), `#8a979c`, suivie de 4 pips de marge inline (`m11`). Capture : sous le nom viennent directement les deux jauges (y=438) — aucune encre entre y=411 et y=437 (`m10b`, `m13`). | Si le back ne projette pas ces trois champs, c'est une forme F (projection), pas un défaut de rendu. **Aucun rapport juge-données n'existe pour cet écran** : trancherait le corps réel de la route de la vente. |
| **M10** | MAJEUR | NOUVEAU | non | **Le blocage n'est plus présenté comme un blocage** : une ligne grise dans un bouton cassé au lieu du panneau d'explication de la maquette. | Réf, cadre #109 : un `.pann` bordé `#ff5a4d` avec un titre `.pann b` 13 CSS (« Nulle part où la porter ») et trois lignes `.pann small` 6,6 CSS qui nomment le maillon (« ramasser… veut dire la déposer dans une **planque** … il n'existe aujourd'hui **aucun moyen d'en obtenir une** »), **plus** le CTA de pied `cta6 eteint` ; `.pann` est présent dans 4 cadres sur 6 (`m16d`). Capture : un seul sous-libellé, x=261..819, capitale 20 px (5,56 CSS), `(185,173,146)`, à l'intérieur du bouton (`m10b`). | Le cadre #109 **n'est pas rendu** ce tour : je le lis dans la SOURCE, pas dans une image. |
| **M11** | MAJEUR | NOUVEAU | **oui** | **Le texte de l'écran nie ce que l'empreinte déclarée compte** : « aucune planque n'existe encore », alors que l'empreinte des DEUX campagnes déclare **2 planques**. | Texte lu sur l'image : « impossible — aucune planque n'existe encore », x=261..819 y=592..616 (`m10b`), identique sur les deux planches (`m17b`). Empreintes déclarées : `03efb90` → 72 118 · 17 bât. · 3 lt · **2 planques** · 7 cartes ; `fd0e21e` → 72 155 · 20 bât. · 3 lt · **2 planques** · 8 cartes (`journal-declare.txt`). | **La prémisse est DÉCLARÉE par corps de commit, jamais relue** — aucun journal n'est joint et l'identité photographiée n'est pas imprimée sur l'image. Trancherait : la ligne `[DemoIdentityResolver] régime=env identité=…` du journal du run **jointe**, plus le corps de la route des planques. Tant qu'elle manque, ce finding porte sur une contradiction entre deux DÉCLARATIONS, pas entre l'image et une mesure. |
| **m1** | MINEUR | NOUVEAU | non | **L'écran est retitré** : « LES POINTS DE VENTE » là où l'enseigne de la maquette dit « La vente » dans les six cadres. | `m16d` : `<b>La vente</b>` dans 6/6 cadres, avec un sous-titre distinct par état. La capture affiche l'alias entre parenthèses du nom d'écran, en capitales, sans sous-titre. | Si le retitrage est une décision produit, c'est un arbitrage user — rien dans le dossier ne le dit. |
| **m2** | MINEUR | NOUVEAU | non | **Hauteur de capitale du titre −22 %.** | Réf « L » de « La vente » : y=515..559 ⇒ **45 px = 12,50 CSS**, encre 370 px de large. Capture « L » : y=269..303 ⇒ **35 px = 9,72 CSS**, encre 725 px (`m06b`, `m06c`). | Conséquence probable de m1 (19 caractères contre 8 dans la même largeur) ; à ce titre non indépendant. |
| **m3** | MINEUR | NOUVEAU | non | **Le nom du dealer est en SÉRIF et 28 % plus grand** ; la maquette le demande en sans. | Capture : capitale 32 px = **8,89 CSS**, empattements visibles (`m10b`). Réf `.dl .qui b` : `700 9px 'DejaVu Sans'`, capitale 25 px = **6,94 CSS** (`m11`). **Ce n'est PAS un arbitrage de police** : le bloc `.vnt6` ne demande **aucune** Georgia (0 occurrence dans le bloc ; contrôle positif : **70** occurrences sur 69 lignes dans le fichier entier), seulement `'DejaVu Sans'` (12 règles) et `'DejaVu Serif'` (3), et `fc-match` rend ces deux familles à elles-mêmes. Référence et client partagent donc la même fonte ici. | — |
| **m4** | MINEUR | NOUVEAU | non | **Apostrophe droite** `'` (U+0027) là où la maquette pose l'apostrophe typographique `’` (U+2019). | Zoom ×4 : « n'existe » sur la capture = barre verticale (`mesures/zoom_apostrophe.png`) ; « QU’IL » sur la référence = virgule haute inclinée (`mesures/zoom_ref_apostrophe.png`). La source HTML porte `qu’il`, `s’est`, `n’en` (U+2019). | — |
| **m5** | MINEUR | NOUVEAU | non | **Un losange laiton est posé au-dessus du titre** : il n'a aucun homologue dans le panneau de la maquette (EN TROP). | x=531..548, y=215..231 ⇒ 18×17 px, `(176,141,61)` = `#b08d3e` (`m13`). Le panneau `.vnt6` ne contient aucune ornementation entre le haut du cerne et l'enseigne. | S'il appartient au chrome du shell plutôt qu'à l'écran, il sort de mon périmètre — le canon HUD (`hud-canon-1176.png`) n'est **pas fourni** dans ce dossier alors que `dossier.md` l'annonce. |
| **m6** | MINEUR | NOUVEAU | non | **Rythme : une carte occupe la place de 2,8 rangées de la maquette**, et elle est 10 % plus large. | Capture, carte : 1 010 × 327 px = **280,6 × 90,8 CSS** (`m08`). Réf, rangée `.dl` : 922 × 117 px = **256 × 32,5 CSS**, gap inter-rangées 12 px (3,3 CSS) (`m04`, `m18b`). | — |
| **m7** | MINEUR | NOUVEAU | **oui** | **La carte est intitulée par un mot que la maquette emploie comme SUBSTANCE**, pas comme personne : « Brindle ». | La maquette écrit, cadre #108 : « il vend **brindle** au lek 12 » — `brindle` y est le produit ; le titre de rangée y est le **nom du dealer** (Oskar, Mira, Joran, Tamsin, Ilse, Dov). Sur la capture, « Brindle » occupe exactement la place du nom (x=175..284, y=378..410) et aucun nom de personne, ni lieu, ni lek n'apparaît (voir M9). | **Je ne peux pas trancher depuis l'image** : « Brindle » peut être un nom propre. Trancherait : la clé du corps de réponse qui alimente ce libellé (juge-données). **Si c'est bien la substance, ce finding devient MAJEUR** — l'écran répond « ce qui se vend » et non « qui vend », c'est-à-dire l'inverse de son but. |

**Compte : 3 BLOQUANT · 11 MAJEUR · 7 MINEUR.**

> ⚠️ **Un finding RETIRÉ en cours de route, et il faut le dire.** J'avais ouvert un `m8` sur
> l'ornement sombre du coin haut-gauche du bandeau (trait à volute, `(65,67,68)`, **1,89:1**), parce
> que `dossier.md` annonçait un canon HUD qui **n'était pas dans le dossier** quand je l'ai listé.
> Le fichier `hud-canon-1176.png` **est apparu pendant mon travail** ; je l'ai mesuré (`m21`) :
> le canon porte **le même ornement**, x=15..129 · y=50..99 (38,3 × 16,7 CSS-HUD), `(78,80,82)`,
> **2,15:1**. Il est donc canonique, et son contraste est du même ordre (l'écart de 12 % tient à la
> différence de fond). **Finding retiré**, reversé en `A3`. *Un dossier qui se complète pendant la
> mesure invalide la mesure d'avant : j'ai relisté le répertoire avant de rendre.*

---

## Écarts ASSUMÉS (non comptés)

| id | ce qu'on voit | pourquoi | rendu proprement ? | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|---|
| `A1` | Aile droite : « JOUR 50 » puis « — » | Doctrine du dossier : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district ⇒ état VOULU hors ①. | **Oui** : ARGENT (`(242,201,106)`, or exact) et JOUR 50 sont alimentés, le médaillon dit « Brûlant / CHALEUR » ; seule l'aile droite est en repli (`m10`, `m14`). | **Périmètre mesuré contre le canon** (`m21`) : le canon porte un libellé « JOUR 12 · SOIRÉE » de x=832..1125 (**92,6 CSS-HUD**) **et une valeur horaire « 21:40 »** (y=77..107) ; la capture porte « JOUR 50 » de x=940..1034 (**34,5 CSS-HUD**, −63 %) et une valeur réduite à un tiret de **3 px**. L'assumé couvre la PHASE ; **si l'HEURE aussi manque durablement, ce n'est plus l'assumé** — c'est un champ de chrome à part. |
| `A3` | Ornement à volute dans le coin haut-gauche du bandeau, à 1,89:1 | **Il est dans le canon** : même objet, x=15..129 · y=50..99, `(78,80,82)`, **2,15:1** (`m21`). C'est un filet décoratif, pas du texte : le plancher de 3:1 ne s'y applique pas. | **Oui**, aux mêmes proportions (29,4 CSS-HUD de large contre 38,3 au canon — voir périmètre). | Un écart de largeur qui dépasserait 25 % du canon, ou une couleur qui sortirait du gris ardoise. La largeur mesurée est **23 % sous** celle du canon : à re-mesurer au tour suivant, c'est la borne. |
| `A2` | Les 4 ronds du dock sont vides | Arbitrage user connu (« j'aime pas les icônes »). | **Oui** : 4 ronds centrés (centre 539,5), intérieur `(27,36,50)` uniforme, aucun libellé de repli (`m14`). | Un rond manquant, décentré, ou un glyphe de repli. |

## ARBITRAGES (non comptés)

| id | objet | mesure | destinataire |
|---|---|---|---|
| `R1` | **La RÉFÉRENCE porte un artefact d'ANIMATION figé, qui coupe une rangée en deux.** Le bloc `.vnt6` déclare 3 `@keyframes` et `.elast::after{animation:vnt6-scan 7.5s linear infinite}` — donc la maquette contrevient au ruling « aucune animation sur un écran neuf » (2026-08-27), et la référence rendue **n'est pas reproductible**. | Trait teal mesuré à **y=1059..1066** (8 px = 2,2 CSS ; CSS `height:2px` → 7,2 px ✓), `(49,79,89)`, traversant x 100..1000 — **dans la rangée « Mira » (y=982..1098), sur sa ligne de texte**. Aucune autre bande teal continue dans la liste (`m15`). | **blender** (retirer les 3 `@keyframes` et `.elast::after`, re-rendre la référence) |
| `R2` | `$ 24 850` et `HEAT` dans la RÉFÉRENCE | Ruling user 2026-09-02 « fr réel » : le client a raison (« 9 627 820,00 € », « CHALEUR »), la maquette est en retard. | **blender** (maquette à mettre à jour) |
| `R3` | Format monétaire « 9 627 820,00 € » (deux décimales, symbole suffixé) contre « $ 24 850 » (entier, symbole préfixé) | Décision produit, pas un défaut de rendu ; c'est du **chrome**, pas l'écran. | **arbitrage user** |
| `R4` | Sérif du **CHROME** (bandeau) | `hud-brennar.html` demande `Georgia,"Times New Roman",serif` ⇒ `fc-match Georgia` = **Noto Serif** à la référence, **DejaVu Serif** au client. Écart de famille non opposable. ⚠️ **Ne s'applique PAS au panneau de l'écran** (voir `m3`). | **arbitrage** (non corrigible côté client) |
| `R5` | Absence de « AFFECTER UN DEALER » (voir **M2**) | La maquette déclare elle-même le lot **L3** (« aucune route ne les liste »). Si c'est un maillon manquant accepté, M2 doit passer en ASSUMÉ — mais il faut alors qu'il entre dans une table d'écarts assumés, qui n'existe pas. | **arbitrage user** |

---

## 5. Autres résolutions

**Une seule résolution est fournie** (1080×2400). Le dénominateur publié par la ligne GO le dit :
« (a) deux résolutions 1920+2400 → NON — 2400 seulement ». Rien n'est donc vérifiable sur le reflux,
la conservation des proportions à une autre largeur, ni sur un débordement propre à une résolution.

La **deuxième planche** fournie (`capture-planche-1080x2400.png`) est à la **même** résolution et
provient d'une **autre campagne** (`03efb90`, 06/09 14:56) : elle ne vaut pas comme seconde
résolution. Elle sert de **second témoin** et elle confirme, à l'identique, B1, B2, B3, M1, M3, M4,
M7, M10, M11 : le trou du bouton est aux **mêmes** colonnes (x=629..962, rails haut et bas), le fond
est le même aplat, les jauges ont les mêmes cinq segments. Conformément au dossier je ne compare
jamais une planche à l'autre pour conclure à une régression : les deux photographient deux mondes
(17 → 20 bâtiments, 7 → 8 cartes déclarés).

Écart mesuré entre les deux planches, dans le **chrome** : la planche porte une **flèche retour**
« ← » `(238,241,242)` à x=82..104 · y=66..78 (16,71:1) et son aile gauche est décalée vers la
droite ; la capture principale n'a pas de flèche mais un **ornement sombre** à x=12..92 · y=56..74,
`(65,67,68)`, **1,89:1** (`m20`). Mesuré sur le **canon** (`m21`) : il ne pose **aucune flèche
retour** dans l'aile gauche (aucune encre claire isolée avant « ARGENT », qui commence à x=48), mais
il pose bien **l'ornement à volute** — c'est donc l'ornement qui est canonique et la flèche qui est
un ajout. Les deux planches venant de deux campagnes, je ne conclus à aucune régression : je
constate deux états du même créneau, et un arbitrage user ouvert porte déjà sur le domicile de la
flèche retour en série 6.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Aucune paire T / T+1 s** ⇒ **l'absence d'animation n'est pas prouvée** (ruling user 2026-08-27).
   Les deux planches sont à 6 h d'écart, dans deux mondes : leur ressemblance ne prouve rien sur une
   boucle courte. *Trancherait* : deux captures du même état à 1 s d'écart, diff en pixels, chrome
   exclu nommément.
2. **L'identité photographiée n'est écrite nulle part sur l'image** et **aucun journal n'est joint** :
   les empreintes (72 118 / 72 155, 2 planques…) sont **transcrites depuis des corps de commit**.
   Toute comparaison de VALEUR est donc hors de portée — c'est pourquoi M11 est classé « dépend des
   données ». *Trancherait* : la ligne `[DemoIdentityResolver] régime=env identité=demo_capture@example.test`
   du journal du run, **jointe au dossier**.
3. **Le cadre d'état homologue (#109 « Ramasser — nulle part où la porter ») n'est pas rendu.** Je
   l'ai lu dans la SOURCE ; je n'ai donc aucune image contre laquelle comparer la forme de l'état
   effectivement capturé. *Trancherait* : `Tools/rendre-tel.py ecrans-brennar-6.html 109 … 3.6`.
   (Le châssis — B1 — échappe à cette limite : il est invariant sur les 6 cadres, mesuré.)
4. **Le canon du chrome est arrivé DANS le dossier pendant que je travaillais.** Au premier
   `ls`, `hud-canon-1176.png` n'existait pas (3 PNG : la référence et les deux captures) ; il était
   là au moment de rendre. Je l'ai mesuré (`m21`) et j'en ai tiré deux contrôles positifs (hauteur
   de bandeau, ornement canonique) et le **retrait d'un finding**. Ce que je n'ai **pas** fait, faute
   d'avoir refait le tour complet : juger la typographie du chrome, ses jetons, la géométrie du
   médaillon et la composition de l'aile gauche contre le canon. *Trancherait* : un tour dédié au
   chrome — il est **partagé**, donc il ne se juge pas écran par écran.
5. **Aucun rapport juge-données n'existe pour cet écran.** Toutes les questions « d'où vient cette
   valeur ? » restent ouvertes : « Brindle » est-il une personne ou une substance (m7) ; les buckets
   `Moderate`/`Standard` viennent-ils d'un enum non projeté (B3) ; district / lek / tarif sont-ils
   absents de la projection ou du rendu (M9) ; les 2 planques déclarées sont-elles visibles du
   joueur (M11).
6. **Le rect imprimé par le test n'est pas fourni** (log non préservé). J'ai vérifié la géométrie
   dérivée sur l'image — largeur 1080, bandeau à 143 px — mais pas le `scaleFactor` ni les insets
   réels. La hauteur du dock, que le dossier me demandait de mesurer et non de déduire, vaut
   **221 px** (haut à y=2179).
7. **Le mécanisme du trou du cadre (M1) n'est pas déterminable depuis une image** : tuile centrale
   d'un 9-slice non répétée, sprite tronqué à l'import, ou masque — trois causes possibles, une
   seule mesure hors image les départage (l'inspection du sprite et de son `border` d'import).
8. **La perte du codage couleur des statuts (M6) n'est prouvée que sur un échantillon** : un seul
   dealer est affiché. *Trancherait* : une planche d'un compte comptant au moins un dealer grillé et
   un au repos.
9. **Rien dans ce tour ne dit si le trait `SnapToScreenPixel`** signalé par le dossier affecte cet
   écran. Je n'ai relevé aucune position suspectement ronde : les bords de la carte tombent à
   x=35/1044 et y=343/669, le trou du bouton à x=629..962 — aucun multiple d'un pas régulier.

---

## Annexes

### Annexe 1 — Inventaire de la référence (`reference-1080x2102.png`, 1080×2102, ×3,6)

Échelle vérifiée sur 4 grandeurs CSS indépendantes (contrôle positif n° 2). Toutes les couleurs
citées sont **mesurées**, et toutes tombent sur le jeton CSS à ≤ 1/255.

| id | catégorie | parent | bbox px | bbox CSS | forme | remplissage | bord | texte | relations |
|---|---|---|---|---|---|---|---|---|---|
| `R.cerne` | boîtier | panneau | x 21..1058 · y 452..2078 | 288,3 × 452 | rect, rayon 3 CSS | — | 1 CSS `#b08d3e` `(176,141,62)` mesuré | — | inset 5 CSS du panneau (mesuré 18 px) |
| `R.enseigne` | plaque | `R.cerne` | x 28..1051 · y 481..646 | 284,4 × 46 | rect | dégradé bleu nuit `(12,18,28)` au centre | 1 CSS `#2a3648` ; **bas 2 CSS `#b08d3e`** (7 px mesurés) | — | 13 CSS sous le bord du panneau |
| `R.titre` | titre | `R.enseigne` | x 349..718 · y 515..560 | 102,8 × 12,8 | — | — | — | « La vente », **capitale 45 px = 12,50 CSS**, DejaVu Serif 700, interlettrage .2em, `(242,201,107)` | centré (centre 533,5) |
| `R.soustitre` | texte | `R.enseigne` | x 102..969 · y 589..608 | 240,8 × 5,6 | — | — | — | « QUI VEND, ET CE QU’IL Y A DANS LA CAISSE », capitale 20 px = 5,56 CSS, `(185,173,146)`, capitales, .34em | 8 px sous le titre |
| `R.fen×3` | compteurs | `R.cerne` | y 679..792 | h 31,7 | 3 fenêtres, gap 6 CSS | `#0a0e16`, lueur teal interne | 1 CSS `#2a3648` | chiffres capitale 39 px = **10,83 CSS** `(127,212,217)` ; libellés capitale 14 px = 3,89 CSS `(138,151,156)` | 9 CSS sous l'enseigne |
| `R.elast` | conteneur de liste | `R.cerne` | x 50..1029 · y 825..1869 | 272,2 × 290 | rect | `#0d0f10` `(13,15,16)` mesuré | 1 CSS `#2a3648` | — | `flex:1` — il absorbe la hauteur restante |
| `R.dl×6` | rangées | `R.elast` | rangée 1 : y 854..970 ; bord horizontal **922 px d'encre** dans un `.elast` de 980 px | 256 × 32,5 | rect | `#111823` `(17,24,35)` mesuré | 1 CSS `#2a3648` | nom capitale 25 px = 6,94 CSS `(234,224,200)` sans-sérif ; ligne secondaire capitale 17 px = 4,72 CSS ; statut capitale 12 px = 3,33 CSS, **couleur = l'état** | gap 12 px (3,3 CSS) ; rangées 5-6 à opacité .5 |
| `R.icone` | glyphe | `R.dl` | 19 × 19 CSS = 68 px | — | glyphe SVG **par substance** | billet or / losange teal / dague crème / boîte violette | — | — | colonne de gauche de la grille `19px 1fr auto` |
| `R.jg` | jauge | `R.dl` | x 809..965 · y ≈ 920 | 43,6 (mesuré) × 5 (CSS) | **4 barres pleines** de 34 px, gap 1,5 CSS, rayon 1 | `#f2c96b` / `#d9ab4e` / éteint `#2a3648`@.55 | — | — | sous le statut, aligné à droite |
| `R.marge` | jauge inline | `R.dl small` | 4 barres 3 × 7 CSS | — | **4 barres pleines** | `#d9ab4e` / éteint `#2a3648` | — | — | à la suite du texte secondaire |
| `R.cta6` | CTA | pied | x 50..1029 · y 1902..1995 | 272,2 × 26 | rect | `#16191b` | 1 CSS `#b08d3e` | « AFFECTER UN DEALER », capitale 22 px = 6,11 CSS, `(242,201,107)`, .11em | 9 CSS sous la liste |
| `R.note6` | texte | pied | x 157..923 · y 2018..2041 | 212,8 × 6,4 | — | — | — | capitale 19 px = 5,28 CSS ; le fragment souligné en `(242,201,107)` | centré, 5 CSS sous le CTA |
| `R.scan` | **artefact** | `R.elast` | x 100..1000 · y 1059..1066 | — | trait horizontal 2,2 CSS | teal `(49,79,89)` | — | — | **traverse la rangée « Mira » et coupe sa ligne de texte** (voir `R1`) |

**Couche globale (panneau, zone x 21..1058 · y 452..2078).** Luminance moyenne **28,85** · densité
d'encre (lum > 28) **14,54 %** · saturation moyenne **0,383** · palette : `(0,24,24)` 32,3 %,
`(0,0,0)` 28,3 %, `(0,0,24)` 25,1 %, `(24,24,24)` 4,2 %, `(24,48,72)` 3,2 %, `(168,120,48)` 1,9 %.
Rythme vertical (frontières mesurées) : 452 · 481 · 646 · 679 · 792 · 825 · 854 · 970 · 982 · 1098 ·
1110 · 1226 · 1238 · 1355 · 1869 · 1902 · 1995 · 2078.

### Annexe 2 — Inventaire de la capture (`capture-1080x2400.png`, 1080×2400)

| id | catégorie | bbox px | bbox CSS | forme | remplissage | bord | texte | statut |
|---|---|---|---|---|---|---|---|---|
| `C.bandeau` | chrome | y 0..143 | h 52 CSS-HUD | bande | bleu nuit | filet bas 2 px `(224,102,73)` = braise `.chaud` | ARGENT `(242,201,106)` capitale 43 px ; JOUR 50 capitale 21 px ; médaillon « Brûlant / CHALEUR » | jugé seulement « alimenté / filet » — canon HUD absent du dossier |
| `C.volute` | ornement (chrome) | x 12..92 · y 56..74 | 29,4 × 6,9 CSS-HUD | trait à volute | — | `(65,67,68)`, **1,89:1** sur le fond du bandeau | — | `A3` — **canonique** (le canon porte le même objet à 2,15:1) |
| `C.losange` | ornement | x 531..548 · y 215..231 | 5 × 4,7 | losange | `(176,141,61)` | — | — | **EN TROP** (`m5`) |
| `C.titre` | titre | x 176..902 · y 268..303 | 201,9 × 10 | — | — | — | « LES POINTS DE VENTE », **capitale 35 px = 9,72 CSS**, `(217,171,77)` = `#d9ab4e`, centré (539,0) | `m1`, `m2`, `M5` |
| `C.carte` | carte | x 35..1044 · y 343..669 | 280,6 × 90,8 | rect, rayon ≈ 9,7 CSS | **aucun** — `(13,13,13)` = le fond de page | 5 px `(106,106,106)` neutre, continu 960/960 | — | `M4`, `m6` |
| `C.disque` | icône | x 71..108 · y 377..414 | 10,6 × 10,6 | cercle | dégradé or `(89,66,17)`→`(211,166,74)`→`(136,102,29)` | — | — | `M8` |
| `C.nom` | titre de carte | x 175..284 · y 378..410 | 30,3 × 9,2 | — | — | — | « Brindle », **sérif**, capitale 32 px = 8,89 CSS, `(234,224,200)` | `m3`, `m7` |
| `C.statut` | badge | x 874..1007 · y 385..405 | 37,2 × 5,8 | — | — | — | « AU POSTE », capitale 21 px = 5,83 CSS, `(185,173,146)` | `M6` |
| `C.caisse` | jauge | pips x 180..365 · y 438..462 ; libellé x 72..184 ; valeur x 387..503 | pips 51,4 × 6,9 | **5 carrés CREUX**, pas 40 px | vide `(13,13,13)` | trait allumé `(184,113,17)`, éteint `(54,54,54)` | « Caisse » capitale 21 px ; **« Moderate »** capitale 19 px `(234,224,200)` | `M7`, `B3` |
| `C.marge` | jauge | pips x 180..322 · y 483..510 ; valeur x 344..454 | — | **5 carrés CREUX** | vide | idem | « Marge » ; **« Standard »** | `M7`, `B3` |
| `C.bouton` | CTA éteint | x 71..1008 · y ≈ 524..644 | 260,6 × 33 | rect arrondi | aucun | **BRISÉ** : rails haut et bas interrompus x 629..962 ; fragment de coin détaché x 963..1008 | « RAMASSER » capitale 25 px = 6,94 CSS `(119,119,119)` ; sous-libellé « impossible — aucune planque n'existe encore » capitale 20 px `(185,173,146)` | `M1`, `M10`, `M11`, `m4` |
| `C.vide` | — | y 670..2178 | 419 CSS | — | `(13,13,13)` uniforme | — | **0 pixel** avec lum > 16,5 | `B2` |
| `C.dock` | chrome | y 2179..2399 | h 221 px | 4 ronds ⌀ 126 px | `(13,18,29)`, ronds `(27,36,50)` | — | EMPIRE · FAMILLE · FILIÈRE · PLUS | `A2` |

**Absent en jeu** (homologue de la maquette sans contrepartie) : `R.cerne`, `R.enseigne`,
`R.soustitre`, `R.fen×3`, `R.elast`, `R.marge` inline, `R.cta6`, `R.note6`, la ligne secondaire de
`R.dl`, le halo or, le halo teal, le dégradé de fond.

**Couche globale (rect libre y 144..2178).** Luminance moyenne **15,12** · densité d'encre **2,12 %**
· saturation moyenne **0,0079** · palette : `(0,0,0)` **97,73 %**, `(96,96,96)` 0,52 %,
`(48,48,48)` 0,22 %, `(72,72,72)` 0,18 %, `(216,168,72)` 0,17 %, `(24,24,24)` 0,16 %.
Rythme vertical : 143 (bas du bandeau) · 215 · 231 · 268 · 303 · 343 · 669 · **rien** · 2179 · 2400.

### Annexe 3 — Correspondance des repères

| | référence | capture | rapport |
|---|---|---|---|
| échelle du CONTENU | 1080 px = 300 CSS ⇒ **×3,6** (vérifiée sur 4 grandeurs, contrôle positif n° 2) | 1080 px = 300 CSS ⇒ **×3,6** (donnée par `dossier.md`) | **1,00** — tout écart de taille sur le contenu est réel |
| échelle du CHROME | le cadre de série 6 dessine SA barre à 300 CSS (évocation) | shell à 392 CSS ⇒ ×2,755 | non comparable ⇒ chrome jugé à part |
| origine verticale | haut du panneau `.vnt6` = **y 434** (cerne 452 − inset 18) | bas du bandeau = **y 143** (filet mesuré 141..142) | alignement par le HAUT du contenu |
| fin verticale | bas du panneau = **y 2096** (cerne 2078 + 18) | haut du dock = **y 2179** | alignement par le BAS du contenu |
| hauteur disponible | **462 CSS** (1 663 px) | **565 CSS** (2 035 px) | la capture a **103 CSS de plus** que la maquette n'en demande |

Toute mesure de la section 3 cite cette correspondance : les largeurs et les hauteurs de capitale
sont exprimées en px **et** en CSS ; les positions verticales sont rapportées au haut du contenu de
leur côté, jamais au pixel absolu.

### Annexe 4 — Scripts

Tous dans `mesures/`. Chacun ouvre ses images **en imprimant leur taille** et porte un contrôle
positif ; les scripts qui décident portent aussi un contrôle négatif.

| script | grandeur | contrôle positif | contrôle négatif |
|---|---|---|---|
| `m00_apercu.py` | tailles, vignettes | largeur = 1080 des trois côtés | hauteurs différentes 2102 / 2400 |
| `m01_reperes.py` | profil de luminance par ligne, bandes d'encre | largeur = 1080 | profil non uniforme (étendue 126,8 / 87,2) |
| `m02_or.py` | cartographie de l'encre or | `est_or(#f2c96b)` et `est_or(#d9ab4e)` = vrai | `est_or(#0e1420)`, `est_or(#7fd4d9)`, `est_or(#eae0c8)` = faux |
| `m03_cadres.py` | bord du panneau / de la carte | largeur 1080 des deux côtés | ligne vide (y=1500) → aucun bord |
| `m04_ref_blocs.py` | frontières internes du panneau | `proche((176,141,62),LAITON)` = vrai | `proche((13,15,16),LAITON)` = faux |
| `m05_cap_blocs.py` | blocs de la capture, fonds, dock | colonne x=2 reste au fond (13,0) | — |
| `m06b/m06c` | titres, sous-titre, filet | jetons `#f2c96b`, `#b9ad92`, `#b08d3e` retrouvés **à l'octet** | bande or du bandeau distincte de celle du titre |
| `m07/m07b_bouton.py` | **continuité du cadre du bouton** | cadre de la carte : **960/960** colonnes, 0 trou | bande vide : 0/960 |
| `m08_carte.py` | géométrie de la carte, fonds | jetons `#111823` / `#0d0f10` de la référence retrouvés | — |
| `m09_palette.py` | palette, luminance, densité, saturation | dominante de la référence bleutée (b > r) | dominante de la capture neutre (r = g = b) |
| `m10b_textes_cap.py` | textes de la capture, capitales, contrastes | jeton du titre plat sur 5 554 px | fenêtre de fond pur → aucune encre |
| `m11_textes_ref.py` | textes de la référence | 9 jetons CSS retrouvés à ≤ 1/255 | — |
| `m12_jauges.py` | segments des jauges | référence : **4** segments pour `.jg` (Oskar) | entre deux rangées : 0 segment |
| `m13/m14` | zone vide, chrome, disque, pips, dock | filet = braise `(224,102,73)` attendue en `.chaud` | — |
| `m15_scanline_ref.py` | artefact d'animation de la référence | `teal(#7fd4d9)` = vrai | `teal(#111823)` = faux ; une seule bande teal continue |
| `m16d_invariants_maquette.py` | invariants de structure des 6 cadres (source de la maquette) | cerne=1 & enseigne=1 & compteurs=1 & fen=3 dans 6/6 | tableau non uniforme (dl / pied / rien varient) ; **deux versions antérieures rendaient 0 uniforme — population fausse, corrigée** |
| `m17/m17b` | diff des deux planches | a vs a → 0 px | écarts par amplitude : ±1..2 = bruit, > 8 localisés |
| `m18b_largeurs.py` | largeurs comparables | les objets distincts rendent des largeurs distinctes | — |
| `m19_fleche_et_rangee.py` | flèche retour ; largeur réelle d'une rangée `.dl` | bord `.dl` retrouvé sur 3 lignes de rangée (922 px chaque fois) | même motif au milieu du fond de liste → 6 px ; différence inverse mesurée dans les deux sens |
| `m20_ornement_bandeau.py` | ornement du bandeau, contraste | flèche de la planche à 16,71:1 | la même sonde sur la planche rend 62 px au lieu de 247 |
| `m21_canon_chrome.py` | **canon HUD** : hauteur de bandeau, ornement, aile droite | largeur du canon = 1176 (392 CSS ×3) | l'aile gauche de la capture rend 3 lignes d'encre là où l'aile droite en rend 2 |

Images de lecture produites : `mesures/vign_*.png`, `mesures/crop_ref_enseigne.png`,
`mesures/crop_cap_haut.png`, `mesures/zoom_apostrophe.png`, `mesures/zoom_ref_apostrophe.png`,
`mesures/zoom_ramasser.png`, `mesures/zoom_cap_gauche.png`, `mesures/zoom_planche_gauche.png`, `mesures/crop_canon_bandeau.png`.
