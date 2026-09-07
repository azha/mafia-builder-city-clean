# Juge visuel ⊥ — ㊱ L'horizon des possibles — r1 — 2026-09-07

## Verdict : NON APPROUVÉ

L'écran est **géométriquement fidèle** (échelle, largeurs, gouttières, tuiles, hauteurs de capitale :
tout tombe dans la tolérance) et **sémantiquement à côté** : la copie affichée en état vide est celle
des cadres de DIAGNOSTIC de l'atelier — quatre fois le mot « serveur », plus « panne » et « capacité »
sur une surface joueur — pendant que les deux phrases de l'homologue #117 qui disent *comment
l'horizon se remplit* sont absentes, remplacées par une liste « L'ÉCHELLE DES PALIERS » qui n'existe
dans aucun des six cadres du groupe.

---

## Témoin choisi, et pourquoi

Le dossier ne rend en image que le cadre **NOMINAL #113** (liste pleine). La capture est en **état vide**.
J'ai pris comme homologue le cadre **#117 « Rien à l'horizon »**, lu en SOURCE (`ecrans-brennar-6.html`,
extrait par `mesures/00_extraire_cadres.py`), pour trois raisons **mesurées** :

1. c'est le seul cadre du groupe dont les compteurs valent `00/0 · 00 · 00` — exactement ceux de la
   capture (les cinq autres portent `02/5 · 01 · 01`) ;
2. c'est le seul dont la boîte liste ne contient **aucune carte** (`'jetons'` : 4 occurrences dans #113,
   3 dans #116, **0** dans #117 — `mesures/01_textes_cadres.py`) ;
3. c'est le seul qui **n'a pas de `.pied`** — donc l'absence du CTA « PRENDRE — 3 JETONS » et de la note
   « écarter une carte est définitif » sur la capture est **correcte**, pas un manque. Un juge qui aurait
   gardé #113 comme témoin aurait ouvert deux findings faux.

⇒ Les grandeurs de FORME communes à tous les cadres (échelle, marges, jetons, typographie, rythme des
boîtes) sont comparées au **rendu #113**, qui partage la même CSS ; les grandeurs propres à l'état vide
(le message centré, le pavé du bas) sont comparées à la **CSS de #117**, jamais à une image — voir §6.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Chaque ligne est produite par un script de `mesures/`, chacun portant son propre contrôle positif et,
quand l'enjeu le mérite, son contrôle négatif (sorties collées en annexe 4).

| # | grandeur | référence | capture | écart | script |
|---|---|---|---|---|---|
| 1 | largeur d'écran / échelle du contenu | 1080 px = 300 CSS | 1080 px = 300 CSS | **×1,00** | `10_base` |
| 2 | largeur des boîtes | 980 px = **272,2 CSS** | 986 px = **273,9 CSS** | +1,7 CSS = +0,6 % | `14`,`15` |
| 3 | marge gauche des boîtes | x=50 → 13,9 CSS | x=47 → 13,1 CSS | −0,8 CSS | `14`,`15` |
| 4 | gouttière entre boîtes (×3) | 9,0 CSS | **9,4 · 9,2 · 9,4 CSS** | +0,3 CSS | `16_rythme` |
| 5 | largeur des 3 tuiles de compteur | 312 · 312 · 312 px | **314 · 314 · 314 px** | +2 px (+0,2 % écran) | `27_tuiles_dock` |
| 6 | écarts entre tuiles | 22 · 22 px | **22 · 22 px** | 0 | `27_tuiles_dock` |
| 7 | hauteur de capitale du titre (« L ») | 45 px = **12,50 CSS** | 45 px = **12,50 CSS** | **0** | `18_texte` |
| 8 | hauteur de capitale du sous-titre | 18 px = 5,00 CSS | 18 px = 5,00 CSS | **0** | `18_texte` |
| 9 | hauteur des chiffres de compteur | 39 px = 10,83 CSS | 38 px = 10,56 CSS | −0,27 CSS | `18_texte` |
| 10 | largeur du libellé « À PORTÉE » | 126 px = 35,0 CSS | 127 px = 35,3 CSS | +1 px | `18_texte` |
| 11 | jeton or de trait `#b08d3e` | (176,141,**62**) | (176,141,**61**) | 1/255 | `19_couleurs` |
| 12 | jeton cyan de compteur `#7fd4d9` | (127,212,217) | (127,212,217) | **0** | `23_encre` |
| 13 | jeton beige `#b9ad92` (sous-titre) | (185,173,146) | (185,173,146) | **0** | `23_encre` |
| 14 | jeton crème `#eae0c8` (items) | (234,224,200) | (234,224,200) | **0** | `29_pave` |
| 15 | corps du texte du pavé (interligne) | CSS 9,24 CSS | **9,44 CSS** | +2 % | `30_interligne` |
| 16 | hauteur de capitale du titre du pavé | CSS 9,48 CSS | 10,00 CSS | +5,5 % | `29_pave` |
| 17 | valeurs des compteurs | #117 : `00/0 · 00 · 00` | `00/0 · 00 · 00` | identiques | lecture |
| 18 | ordre des parties | enseigne → compteurs → liste → pavé | identique | 0 | `16_rythme` |
| 19 | pas de CTA / pas de note de pied | #117 n'a pas de `.pied` | absent | **conforme** | `00`,`01` |
| 20 | contrastes (doctrine ≥ 3:1 / 4,5:1) | 6,4 → 11,8:1 | **8,1 → 13,7:1** | tous au-dessus | `23_encre` |
| 21 | filet du bandeau, compte BRÛLANT | témoin `.tel.chaud` `--braise` (224,102,74) | (224,102,**73**) | 1/255 | `24_chrome` |
| 22 | contenu sous le bandeau / sous le dock | — | contenu 279→2104, bandeau 143, dock **2180** | **aucun recouvrement** | `17`,`27` |
| 23 | reflux à la 2ᵉ résolution (squelette) | — | seule la boîte liste absorbe (1133 → 653 px) | rien coupé, rien hors cadre | `25_squelette` |
| 24 | aucune clé i18n brute, aucun repli anglais | — | 14 lignes d'encre, **toutes en français** | conforme | `31_inventaire` |
| 25 | **chrome** — position du filet du bandeau | canon HUD **51,0 CSS-HUD** | **51,5 CSS-HUD** | +0,5 | `33_filet_dock` |
| 26 | **chrome** — largeur du médaillon | canon **157,0 CSS-HUD = 40,1 %** | **156,8 CSS-HUD = 40,0 %** | −0,1 % | `32_chrome_vs_canon` |
| 27 | **chrome** — libellés du dock, distance au bas | canon **20,3 CSS-HUD** | **21,4 CSS-HUD** | +1,1 | `33_filet_dock` |
| 28 | **chrome** — soulignement or sous ARGENT | canon **40,7 CSS-HUD** | **42,8 CSS-HUD** | +2,1 | `32_chrome_vs_canon` |
| 29 | marge interne de la boîte liste | CSS `.elast{padding:7px 8px}` | **6,9 CSS** en haut et à gauche | −0,1 / −1,1 CSS | `34_bloc_paliers_bbox` |

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir ce qui **s'ouvrira** — les capacités que le monde met à portée — et à quel **prix en jetons**,
avec les conditions à remplir. On y vient pour arbitrer : prendre maintenant, ou attendre. La note de
pied de #113 (« écarter une carte est **définitif** ») dit le registre : des choix qui engagent.

**Ordre de lecture.** (1) l'enseigne — « **L'horizon** » en or sérif, la plus grosse encre de l'écran
(capitale 12,5 CSS) sur un bloc souligné d'un filet or de 2 px ; (2) la barre de trois compteurs, chiffres
**cyan** de 10,8 CSS, seule couleur froide de la page — le bilan en un regard : à portée / prises /
reculées ; (3) la liste des cartes, qui occupe **91 %** de la boîte élastique et 263 CSS de haut ; (4) le
CTA or en bas.

**Zones.** cerne (cadre or intérieur, `inset:5`) · enseigne (titre + exergue) · compteurs (3 tuiles) ·
boîte élastique (les cartes, ou le message quand il n'y en a pas) · pied (CTA + note) — remplacé par un
**pavé d'explication** dans l'état vide #117.

**Traits d'identité** (les 5 choses qui font qu'on reconnaît *cet* écran) :
1. le **cerne or continu** qui enferme tout le panneau — un cartouche gravé ;
2. le **marine** : le fond est `#111823 → #0b1016 → #0d0f10`, avec une lueur or en haut et cyan en bas ;
3. la **hiérarchie du trait** : ardoise `#2a3648` pour la structure, **or `#b08d3e` réservé** au cerne, au
   filet sous le titre et au CTA — l'or désigne ce qui compte ;
4. l'**or crème `#f2c96b`** du titre, jamais un jaune saturé ;
5. le **cyan** des compteurs, unique accent froid.

**Ce que dit l'état vide (#117), verbatim de la source.** Boîte liste : *« Rien ne s'ouvre pour l'instant.
L'horizon se remplit en jouant. »* — centré (`.rien{flex:1;align-items:center;justify-content:center}`).
Pavé : exergue *« pourquoi c'est vide »*, titre crème *« Les cartes viennent du monde, pas du menu »*,
texte *« une possibilité apparaît quand ce que vous faites remplit ses conditions. Rien ici ne s'achète
directement. »*
⇒ **Le vide y est un plafond, pas une perte** : il nomme la cause, la voie (jouer), et rassure sur ce qui
n'est pas perdu (rien n'a été dépensé, rien ne s'achète). C'est exactement la lecture demandée par l'user.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Il se lit comme un **écran de diagnostic**. L'inventaire d'encre complet de la capture
(`31_inventaire_encre.py`, 14 lignes, toutes transcrites) donne, dans l'ordre du regard : « L'horizon » ·
**« CE QUE LE SERVEUR NE DIT PAS »** · `00/0 00 00` · **« L'ÉCHELLE DES PALIERS »** · « Palier 2 » ·
**« le serveur ne dit pas ce qui manque pour y arriver »** · « Palier3 » · « Palier4 » · « Palier5 » ·
**« CE QUE LE SERVEUR ENVOIE VRAIMENT »** · « Rien à l'horizon » · **« le serveur ne propose aucune
capacité pour l'instant — ce n'est pas une panne, c'est un état »**. Quatre fois « serveur », une fois
« panne », une fois « capacité » : le joueur n'apprend pas ce qui manque, il apprend **qu'une machine ne
le lui dit pas**, et on lui jure que ce n'est pas une panne — ce qui est la façon la plus sûre de lui
faire penser à une panne. Les deux phrases de #117 qui répondent à « comment ça se remplit ? » ne sont
sur l'écran **ni l'une ni l'autre**. Le vide, ici, ne plafonne pas : il **s'excuse**.

Le deuxième fait dominant est le **trou** : 753 px (209 CSS) strictement sans encre au bas de la boîte
liste — **66 % de la boîte, 37 % du rect d'écran libre**. Là où #117 pose un message *centré* qui remplit
optiquement la boîte, la capture épingle un bloc en haut et laisse un puits noir en dessous. C'est ce
puits, et non le message, que l'œil lit comme « il manque quelque chose ».

Le troisième est la **perte du cartouche**. Le cerne or a disparu (0 pixel or dans les trois gouttières,
contre 16/16 et 26/26 sur les colonnes attendues de la référence) et, en compensation, **toutes** les
boîtes sont passées en or : l'or ne désigne plus rien puisqu'il est partout, et le filet or de 2 px qui
soulignait le titre s'est dissous dans un cadre uniforme. En dessous, le fond marine est devenu neutre
plat (bleuité B−R : **+8,70 → −1,04**, contrôle négatif en niveaux de gris = 0,00), sans les deux lueurs
radiales. La preuve que ce n'est pas une direction d'écran mais une sortie du système : **sur la même
image**, le dock du shell est encore marine (`#0d131d`) et l'ARGENT du bandeau encore `#f2c96a` — le bon
or — pendant que le titre de ㊱ est `#ffd240`, le jeton `accentGold` que la doctrine nomme comme la
substitution « plus jaune ».

Ce qui tient, et ce n'est pas rien : la géométrie est juste au pixel près (24 grandeurs égales, dont les
tuiles à ±2 px et la capitale du titre à 0), la langue est du français réel sans clé brute, les contrastes
sont tous au-dessus du plancher, le chrome est alimenté et braise comme il doit l'être pour un compte
brûlant, et l'absence de CTA est **conforme** à l'état vide. **Le squelette est bon ; c'est le texte et la
peau qui sont ceux d'un autre cadre.**

---

## 3. Écarts

Table unique, un finding par ligne. `dépend des données` = oui si l'observation change avec le contenu du
compte (les planches sont datées) ; non si elle est vraie quelles que soient les données.
Au premier tour, tout est `NOUVEAU`.

| id | gravité | critère | dépend des données | partie | écart | mesure | script | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | non | copie de l'état vide | Le vide ne dit **jamais** comment l'horizon se remplit. L'homologue #117 le dit deux fois (« L'horizon se remplit en jouant. » et « une possibilité apparaît quand ce que vous faites remplit ses conditions »). La seule ligne de la capture qui approche la question **refuse d'y répondre** : « le serveur ne dit pas ce qui manque pour y arriver ». ⇒ vide lu comme panne/attente subie, pas comme plafond franchissable. | Inventaire d'encre EXHAUSTIF : **14 lignes** sur toute la surface, toutes transcrites ; **0** contient l'une des deux phrases de #117. Contrôle négatif : 0 ligne dans la zone vide y=1070..1815. | `31`,`01` | d'où vient le texte (back ou client) — aucun rapport juge-données n'existe pour cet écran |
| `B2` | BLOQUANT | NOUVEAU | non | enseigne `i` + pavé `i`/`small` + sous-ligne de liste | Registre de DIAGNOSTIC monté en texte joueur. Le sous-titre affiché « CE QUE LE SERVEUR NE DIT PAS » et l'exergue « CE QUE LE SERVEUR ENVOIE VRAIMENT » sont **mot pour mot** ceux du cadre **#116**, dont l'étiquette d'atelier est *« Sans les textes — l'écran tel qu'il s'affiche aujourd'hui »* : de la copie écrite **pour l'équipe**. L'homologue #117 veut « rien à l'horizon » / « pourquoi c'est vide ». | Chaînes cherchées dans **2 598 894 caractères** de source : `'ce que le serveur ne dit pas'` → **1** hit, cadre **#116** ; `'ce que le serveur envoie vraiment'` → **1** hit, cadre **#116** ; **0** dans #117. Sur la capture : **4** occurrences de « serveur », + « panne », + « capacité ». Contrôle négatif : chaîne inventée → 0. | `02`,`03`,`26` | — |
| `B3` | BLOQUANT | NOUVEAU | oui (le contenu « Palier n » vient d'une source non identifiée) | boîte liste — bloc « L'ÉCHELLE DES PALIERS » | Partie **EN TROP** : un bloc de 5 lignes (99,2 CSS de haut, 31 % de la boîte) qui n'a **aucun homologue** dans les six cadres du groupe #113–118, et qui occupe la place du message d'état vide. C'est la 4ᵉ chose que l'œil rencontre ⇒ change l'ordre de lecture. | `'chelle des paliers'` → **0** occurrence dans TOUTE la source de l'atelier (HTML 2,6 Mo + `chassis6.py`) ; `'Palier3'` → **0** ; les 2 seuls hits voisins (`'palier 2'`, `"ce n'est pas une panne"`) tombent dans les cadres **#91** et **#44**, deux AUTRES écrans. Contrôle positif du même balayage : `'ce que le serveur ne dit pas'` → 1 hit, bon cadre. | `02`,`03`,`22` | si ce bloc est un état transitoire de développement ou la forme voulue — non départageable depuis l'image |
| `B4` | BLOQUANT | NOUVEAU | non | boîte liste — message d'état vide | **ABSENT EN JEU** : le `.rien` de #117 (`flex:1`, centré verticalement et horizontalement, italique 8 px sérif) n'existe pas. Résultat : la boîte liste est un puits noir. | Boîte liste = y 678..1819 (**315,6 CSS**) ; encre de y=707 à 1063 (**99,2 CSS = 31 %**) ; **753 px = 209,2 CSS strictement sans encre** = **66 % de la boîte** et **37 % du rect d'écran libre** (2037 px). Référence #113 : contenu sur 91 % de la boîte, bande vide de 6 %. | `20`,`31` | — |
| `M1` | MAJEUR | NOUVEAU | non | fond d'écran | Le **marine** devient **neutre plat**. Le dégradé `#111823 → #0b1016 → #0d0f10` et les deux lueurs radiales (or à 22 %, cyan à 96 %) ont disparu : une seule valeur, identique en haut, au milieu et en bas. | Bleuité moyenne (B−R) du panneau : réf **+8,70** → capture **−1,04**. Dominante : réf `#111823` 45,7 % (B−R=+18) → capture `#0d0d0d` 55,2 % (B−R=0). Fond échantillonné à y=200 / 900 / 2200 / 2340 : **`#0d0d0d` partout**. Luminance 30,69 → 22,36. Contrôle négatif (référence convertie en gris) : bleuité **+0,00**. | `19`,`28` | — |
| `M2` | MAJEUR | NOUVEAU | non | `.cerne` | **ABSENT EN JEU** : le cadre or intérieur continu (`inset:5`), trait d'identité n°1, n'est pas dessiné. | Référence : colonnes or **x=21..23 et 1056..1058**, continues sur **1627 px** ; présentes **16/16, 26/26, 26/26** dans les trois gouttières inter-boîtes ; **0/26** au centre (x=540). Capture : **0 pixel or** dans les trois gouttières (y 465..492, 650..674, 1823..1850), **sur toute la largeur**. | `11`,`20`,`21` | — |
| `M3` | MAJEUR | NOUVEAU | non | bordures de toutes les boîtes | Hiérarchie du trait **inversée** : la maquette trace la structure en ardoise `#2a3648` et **réserve** l'or `#b08d3e` au cerne, au filet de 2 px sous le titre et au CTA. La capture met l'**or partout** ⇒ l'or ne désigne plus rien, et le filet de 2 px sous le titre disparaît dans un cadre uniforme de 1 px. | Réf : bord haut enseigne / bords `.fen` / bord `.elast` = **(42,54,72) `#2a3648`** ; bord bas enseigne = **7 px** = 2 CSS d'or. Capture : **les 8 bords mesurés** (enseigne ×2, compteurs ×2, liste ×2, pavé ×2) = **(176,141,61) `#b08d3d`**, tous **3 px** = 0,83 CSS ; **0** bord ardoise détecté sur toute l'image. | `11`,`12`,`19` | — |
| `M4` | MAJEUR | NOUVEAU | non | encre du titre + titre du pavé | L'or est **plus JAUNE** : `#ffd240` au lieu de `#f2c96b`. C'est le jeton `accentGold #ffd23f` nommé par la doctrine, là où l'art veut `hudMoneyGold #f2c96b`. | Réf titre = **(242,201,107)** — écart au jeton **0/255**. Capture titre = **(255,210,64)** : ΔR +13, ΔG +9, **ΔB −43**. Preuve interne, **même image** : l'ARGENT du bandeau du shell rend **`#f2c96a`** (bon jeton) — donc le bon or est disponible et c'est ㊱ qui en change. Contrôle négatif : le sous-titre rend `#b9ad92`, à 57/255 du titre ⇒ la sonde distingue deux encres voisines. | `23`,`24`,`29` | — |
| `M5` | MAJEUR | NOUVEAU | non | fonds des boîtes | Les **quatre** fonds distincts de la maquette collapsent en **un seul**, et la boîte liste perd tout fond propre (elle prend la couleur du fond d'écran) ⇒ le contenant de la liste n'existe plus que par son trait. | Réf : `.enseigne` `#0d131c` · `.fen` **`#0a0e16`** · `.elast` **`#0d0f10`** · `.ct`/`.pann` **`#111823`** (contrôle négatif : `.fen` vs `.ct` = 13/255 d'écart ⇒ l'instrument sépare). Capture : enseigne = compteurs = pavé = bloc paliers = **`#16161c`** ; `.elast` = **`#0d0d0d`** = fond d'écran, écart **0**. | `19` | — |
| `M6` | MAJEUR | NOUVEAU | non | pavé du bas, titre | Le titre du pavé est en **or `#ffd240`** là où #117 l'écrit en **crème `#eae0c8`** (`.pann b{color:#eae0c8}`, aucun style en ligne dans #117). ⇒ deux titres or sérif se disputent le regard, et le pavé d'explication prend le poids d'un titre d'écran. | Capture « Rien à l'horizon » : encre **(255,210,64)**, capitale 10,00 CSS. Jeton attendu **(234,224,200)** : écart **ΔB 136/255**. Contrôle positif : le client **possède** le jeton crème — les items « Palier 2..5 » rendent exactement **(234,224,200)**. | `29` | — |
| `m1` | MINEUR | NOUVEAU | non | titre + textes | Apostrophe **droite** `'` au lieu de l'apostrophe typographique `’` — dans « L'horizon », « Rien à l'horizon », « l'instant », « n'est », « c'est ». | Réf : le `L` et l'apostrophe fusionnent en un glyphe de 55 px (`’` courbe, collée). Capture : glyphe `L` de 39 px **puis un glyphe séparé x=391..397 (7 px, h=17 px)** = un tic vertical. Largeur de ligne 405 → 417 px (+2,9 %). | `18`,`26` | — |
| `m2` | MINEUR | NOUVEAU | non | enseigne | Boîte titre **+10 % de haut** pour le même contenu : marge interne haute +5,0 CSS, basse +3,6 CSS, et écart titre↔sous-titre **resserré** de −2,2 CSS. | Réf 481→646 = **46,1 CSS** ; capture 279→461 = **50,8 CSS**. Détail : haut 8,6 → 13,6 CSS · titre↔sous-titre 7,2 → 5,0 CSS · bas 8,6 → 12,2 CSS. | `16`,`18` | — |
| `m3` | MINEUR | NOUVEAU | non | compteurs | Tuiles **+33 % de haut** pour des chiffres de même taille (10,83 → 10,56 CSS). Même cause que `m2` : marges internes doublées, écart chiffre↔libellé resserré. | Réf 679→792 = **31,4 CSS** (CSS prédit 31,9) ; capture 495→645 = **41,9 CSS**. Détail : haut 5,3 → 11,9 CSS · chiffre↔libellé 5,0 → 2,8 CSS · bas 5,0 → 9,7 CSS. | `16`,`18` | — |
| `m4` | MINEUR | NOUVEAU | non | libellés de compteur + exergue du pavé | Deux jetons de libellé fondus en un : `#8a979c` (gris **froid**) rendu en `#b9ad92` (beige **chaud**) — changement de famille, aux **deux** emplacements où la maquette veut le gris froid. | Réf `.fen>span` = **(138,151,156)**, écart au jeton 0/255. Capture, libellé « À PORTÉE » **et** exergue « CE QUE LE SERVEUR ENVOIE VRAIMENT » = **(185,173,146)** : ΔR **+47**, ΔG +22, ΔB −10. | `23`,`29` | — |
| `m5` | MINEUR | NOUVEAU | non | rect d'écran | **Marges mortes** : 37,8 CSS au-dessus du titre (maquette : 13 CSS) et 21,1 CSS sous le pavé (maquette : le `.pann` touche le bas du panneau) ⇒ **59 CSS = 10 % du rect libre** rendus au vide, alors que c'est la boîte liste qui a besoin de hauteur. Sans effet en état vide ; visible dès que la liste se remplit. | Rect libre sous chrome : bandeau bas **143** → dock haut **2180** = 2037 px = 566 CSS. Contenu 279 → 2104 = 507 CSS. Haut 136 px = 37,8 CSS · bas 76 px = 21,1 CSS. | `17`,`27` | la cause (inset de shell ou marge d'écran) — le rect imprimé par le test n'est pas fourni |
| `m6` | MINEUR | NOUVEAU | oui | bloc « paliers » (déjà EN TROP, cf. `B3`) | « Palier**3** », « Palier**4** », « Palier**5** » sont **collés** — l'espace manque —, alors que « Palier **2** » l'a. Défaut sélectif ⇒ deux chemins de construction différents pour la même liste. | Écart fin-du-mot → chiffre : **« Palier 2 » = 30 px** ; « Palier3/4/5 » = **5 px** — soit **moins** que l'écart inter-lettres normal du même mot (**6–7 px**, mesuré identique sur les quatre lignes, contrôle négatif). Rapport 6:1. | `22` | — |

### Écarts ASSUMÉS (hors compte)

| ce qu'on voit | pourquoi | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| Phase de l'aile droite = « — » | Doctrine 2026-09-06 (f2) : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district ; ARGENT (`9 627 820,00 €`) et JOUR (`JOUR 50`) **sont** alimentés ⇒ chrome alimenté, état voulu hors ①. | un tiret sur ARGENT ou JOUR, ou « Unknown » dans le médaillon |
| Filet du bandeau en braise (224,102,73), médaillon « Brûlant » | Compte BRÛLANT ⇒ témoin = la CSS `.tel.chaud` (`--braise` 224,102,74), pas le PNG calme. Écart mesuré : **1/255**. | un filet laiton `#b08d3e` alors que le médaillon dit « Brûlant », ou l'inverse |
| Pas de CTA « PRENDRE — 3 JETONS », pas de note « écarter une carte est définitif » | Le cadre d'état homologue **#117 n'a pas de `.pied`** (vérifié en source) ⇒ leur absence est **conforme**, pas un manque. | leur absence dans un état **non vide** (liste peuplée) |
| `HEAT`, `$ 24 850`, `tiède` dans la RÉFÉRENCE | Ruling user 2026-09-02 « fr réel » : le client a raison, la maquette est en retard. À signaler une fois au blender, jamais comme écart d'écran. | un libellé anglais sur la **capture** |
| Ronds du dock sans icône | Arbitrage user connu (« j'aime pas les icônes »). | — |

### ARBITRAGES (hors compte)

| sujet | constat | destinataire |
|---|---|---|
| **Famille sérif** | La source demande `Georgia,serif` ; `fc-match Georgia` sur la machine de rendu répond **Noto Serif** — Georgia n'a jamais été montrée. Le client embarque **DejaVu Serif**. Aucune comparaison de famille n'est opposable. La **hauteur de capitale**, elle, est **égale : 12,50 CSS des deux côtés** (ligne 7 du contrôle positif). | arbitrage user (embarquer la même police, ou acter l'écart) |
| **Format monétaire** | Bandeau : `9 627 820,00 €` ; maquette : `$ 24 850`. Deux décimales sur un solde à 9,6 M. **Appartient au shell, pas à ㊱** — je le signale sans le compter. | arbitrage user + shell |
| **Direction de style vs défaut (M1)** | La neutralisation du marine pourrait se plaider comme une direction (« sombre, napolitain, fin 80s »). Je la classe en **défaut**, pas en direction, parce que **sur la même image** le shell garde le marine (dock `#0d131d`, bandeau `#0d0f1c`) : ce n'est pas la DA qui a bougé, c'est ㊱ qui sort du système. Si l'user tranche l'inverse, `M1` et `M5` deviennent des arbitrages ; `M2`, `M3`, `M4`, `M6` restent des écarts. | arbitrage user (sur `M1`/`M5` seulement) |
| **« serveur » = machine ou garçon de café ?** | En français, « le serveur » peut se lire comme un personnage. Ici la lecture fictionnelle est **détruite par le voisinage** : « ce n'est pas une **panne** », « aucune **capacité** », « **L'ÉCHELLE DES PALIERS** ». Je maintiens `B2`. | — (mentionné pour que l'arbitrage soit su) |

---

## 3-bis. Le chrome, confronté au canon HUD — appartient au SHELL, pas à ㊱

⚠️ **Correction de séquence, dite telle quelle.** À l'ouverture du dossier (04:30), `hud-canon-1176.png`
**n'était pas là** — j'avais écrit en non-vérifié que le chrome n'était pas jugeable. Le fichier est
apparu dans le dossier **pendant ma passe** (horodatage 04:56, lien vers
`Tools/juge-visuel/ecran-principal/ecran-canon.png`, 1176×2091). J'ai **re-mesuré** plutôt que de laisser
l'affirmation périmée : ce paragraphe remplace ce non-vérifié, qui est retiré.

⚠️ **Le PNG canon porte des pastilles d'annotation numérotées ①..⑥** qui ne sont **pas** de l'interface.
Toute bbox prise à l'aveugle sur le canon les inclut : mes mesures verticales du médaillon en sont
polluées et je ne les cite pas ; les mesures **horizontales** et les **positions de filet**, elles, sont
propres.

Échelles : canon **1176 px = 392 CSS-HUD ⇒ ×3,000** · capture **1080 px = 392 CSS-HUD ⇒ ×2,755**
(`AppShell.Px = css × 1280/392`). Tout est exprimé en **CSS-HUD**, jamais en px bruts.

**Ce qui tient** (lignes 25 à 28 du contrôle positif) : filet du bandeau à 51,0 → 51,5 CSS-HUD · médaillon
à 40,1 % → 40,0 % de la largeur · libellés du dock à 20,3 → 21,4 CSS-HUD du bas · soulignement or de
l'aile gauche à 40,7 → 42,8 CSS-HUD. Contrôle négatif : la même sonde sur la capture **hors shell** rend
une couverture de filet de **0 %** et une dernière encre à 107,4 CSS-HUD du bas ⇒ l'instrument distingue
bien « avec chrome » de « sans chrome ». **La géométrie du chrome est conforme au canon.**

**Ce qui diffère — et qui n'est PAS un écart de ㊱** (je le consigne pour que ce ne soit pas perdu, sans
le compter dans la table du §3) :

| observation | canon | capture | lecture |
|---|---|---|---|
| couleur du filet | **`#a7863c`** laiton (canon = état CALME, « 37 % ») | **`#d96347`** braise | **conforme** : compte BRÛLANT ⇒ témoin `.tel.chaud` `--braise` (224,102,74), mesuré (224,102,73) |
| 3ᵉ onglet du dock | **MARCHÉ** | **FILIÈRE** | jeu d'onglets du shell ; hors ㊱ — à porter au dossier du shell, pas ici |
| icônes dans les ronds | présentes (20×20) | absentes | **ARBITRAGE user connu** |
| médaillon | « **37 %** / HEAT » | « **Brûlant** / CHALEUR » | `CHALEUR` : ruling « fr réel », le canon est en retard. Chiffre → mot : choix de shell, hors ㊱ |
| aile droite | « JOUR 12 · SOIRÉE » / « **21:40** » | « JOUR 50 » / « **—** » | phase et heure non alimentées hors district ⇒ **ASSUMÉ** par doctrine |

---

## 5. Autres résolutions

⚠️ **L'état vide n'est capturé qu'à 1080×2400.** Les trois autres planches sont d'un **autre état** :

| capture | état réel, LU sur l'image | tient ? |
|---|---|---|
| `capture-1080x2400.png` (sous chrome, campagne `fd0e21e`) | **ÉTAT VIDE** — la planche principale. Contenu 279→2104 ; bandeau bas 143 ; dock haut 2180 ⇒ **rien sous le bandeau, rien sous le dock**, gouttières 136 px / 76 px. | oui |
| `capture-ecran-seul-etat-vide-1080x2400.png` (hors shell, campagne `03efb90`) | **ÉTAT VIDE**, écran seul. Boîtes aux **mêmes y au pixel près** que la planche sous chrome (279/461/495/645/678/1819/1853/2104) — malgré deux campagnes et deux mondes différents. | oui |
| `capture-ecran-seul-1080x2400.png` | **PAS l'état vide : l'état SQUELETTE** (avant données). Titre `L'horizon` **sans sous-titre** ; les trois compteurs réduits à **trois tirets cyan** (44 px chacun, x=182/518/854) **sans libellé** ; boîte liste **0 ligne d'encre sur 1133 px** ; pavé **0 ligne d'encre sur 243 px** — un rectangle bordé d'or, vide. | à part |
| `capture-ecran-seul-1080x1920.png` | **idem, état SQUELETTE**, 16:9. | à part |

**Reflux 2400 → 1920 (sur l'état squelette, seul état disponible aux deux résolutions)** : enseigne, compteurs
et pavé gardent exactement leurs positions et hauteurs (279..461 / 495..645 / pavé 244 px des deux côtés) ;
**seule la boîte liste absorbe** (1133 → 653 px). Rien de coupé, rien hors cadre, rien qui déborde de son
parent, ordre de lecture conservé, proportions en % de largeur identiques. **Le reflux est correct.**

**Observation sur l'état squelette** (hors table des findings : ce n'est pas l'état soumis) — s'il persiste
au-delà de quelques images, un écran qui montre trois tirets et deux rectangles bordés vides sur 1376 px
se lit comme cassé, ce qui est exactement le défaut de SENS que l'user vise. Une image ne dit pas s'il est
transitoire : voir §6.

---

## 6. Non vérifié

1. **Le canon HUD est arrivé en cours de passe — mesuré, mais partiellement.** `hud-canon-1176.png` était
   absent du dossier à 04:30 et présent à 04:56 ; j'ai re-mesuré (§3-bis) et **retiré** mon non-vérifié
   d'origine. Ce qui reste non vérifié : les **grandeurs verticales** du bandeau et du médaillon, parce que
   le PNG canon porte des **pastilles d'annotation ①..⑥** qui polluent toute bbox. *Mesure qui trancherait :
   un canon HUD **sans** les pastilles, ou leurs coordonnées pour les masquer.*
2. **L'état soumis n'existe qu'à UNE résolution.** La doctrine demande deux résolutions portrait ; les deux
   planches 1080×1920 et la 3ᵉ 1080×2400 montrent l'état **squelette**. Le reflux de l'**état vide** à
   1080×1920 n'est donc **pas vérifié** — en particulier le comportement du puits de 209 CSS quand la
   hauteur diminue de 480 px. *Mesure : une capture de l'état vide à 1080×1920.*
3. **Aucune paire T / T+1 s** ⇒ le ruling « aucune animation sur un nouvel écran » (2026-08-27) **n'est pas
   vérifiable**. *Mesure : deux captures du même état à 1 s d'écart, et un compte de pixels différents,
   chrome exclu.*
4. **Identité du compte déclarée par corps de commit, journal non joint** (le dossier le dit lui-même).
   ⇒ **toutes les VALEURS sont non vérifiées** : `9 627 820,00 €`, `JOUR 50`, `00/0 · 00 · 00`, et le fait
   même que la liste soit vide *parce que le compte n'a rien* plutôt que par un échec de projection. Seule
   la **forme** est jugée. *Mesure : la ligne `[DemoIdentityResolver] régime=env identité=…` du journal du
   run, jointe au dossier.*
5. **L'état squelette est-il transitoire ?** Une image ne le dit pas. S'il persiste sur échec réseau ou
   réponse lente, c'est un écran cassé (cf. §5). *Mesure : une capture datée à T+2 s sur le même montage,
   ou le compte d'images pendant lequel l'état est affiché.*
6. **Le cadre d'état homologue #117 n'est PAS rendu en image** — le dossier ne fournit que la SOURCE.
   Toutes mes comparaisons de forme passent donc par le cadre **nominal #113** (même CSS) plus la lecture
   de la CSS de #117. Les grandeurs propres à #117 — hauteur du `.pann`, position exacte du `.rien` centré,
   longueur des deux lignes — sont **dérivées de la CSS, jamais mesurées sur une image**. *Mesure :
   `Tools/rendre-tel.py ecrans-brennar-6.html 117 … 3.6`.*
7. **Le décor de district derrière le panneau.** La maquette montre la scène (`.scene district`,
   `brightness(.24)`) au-dessus du panneau ; la capture montre du `#0d0d0d` plat entre le bandeau et le
   titre (136 px). Je **ne peux pas trancher** si le cadre de série 6 est un mock-up de présentation (la
   scène n'étant alors pas du ressort de ㊱) ou si l'écran doit laisser voir le monde. *Mesure : la doctrine
   de composition shell/écran, ou une planche sous shell d'un autre écran de la même série.*
8. **Hauteur de capitale des plus petits libellés — non départageable.** « À PORTÉE » (même chaîne des deux
   côtés) rend une encre **+2 px plus haute** en jeu (12 → 14 px) pour une **largeur identique** (126 vs
   127 px). Deux mesures du même objet qui divergent dans des sens différents accusent le **repère**, pas la
   valeur : à 12 px, une dilatation de rendu (SDF) épaissit le glyphe sans changer sa chasse. Je ne le compte
   **pas** comme finding. *Mesure : la taille nominale déclarée, ou un rendu du même libellé à 4×.*
9. **Aucun rapport juge-données n'existe pour cet écran** (écran neuf). Toute question « d'où vient cette
   valeur ? » — les « Palier 2..5 », la liste vide, les compteurs à 00 — est hors de ma portée. *Mesure :
   un `juge-donnees` sur les corps réels de l'écran.*
10. **Le rect imprimé par le test n'est pas fourni** (log non préservé). La géométrie du shell
    (`TopInsetPx`/`BottomInsetPx`, hauteur du dock) est **dérivée du code par le dossier** ; je l'ai
    vérifiée **sur l'image** (bandeau 143, dock 2180, largeur 1080) mais la **cause** des marges mortes de
    `m5` — inset de shell ou marge propre à l'écran — reste indéterminée.
11. **Position suspectement ronde ?** Contrôle fait, rien à signaler : les positions mesurées ne sont pas des
    multiples d'un pas régulier (279, 461, 495, 645, 678, 1819, 1853, 2104), donc **aucun soupçon
    d'arrondi de chaîne de capture** (`SnapToScreenPixel`) sur cette planche.

---

## Annexes

### 1. Inventaire de la référence (#113 rendu, 1080×2102) — fiches

Repère : origine `.hrz6` = **y = 435 px**, échelle **×3,6** (1 CSS = 3,6 px). Toutes les valeurs px sont
celles de l'image ; les CSS sont px ÷ 3,6 ; les % sont rapportés à la largeur d'écran (1080 px).

| id | catégorie | parent | bbox px | bbox CSS (depuis `.hrz6`) | forme | remplissage | bord | texte |
|---|---|---|---|---|---|---|---|---|
| `R.cerne` | chrome de panneau | `.hrz6` | x 21..1058 · y 452..2078 | inset 5 · 288×451,7 | rect, rayon 3 | — | **1 px `#b08d3e` (176,141,62)** + halo | — |
| `R.enseigne` | plaque titre | `.hrz6` | x 50..1029 · y 481..646 | 13,9→286 · 12,8→58,6 (h **46,1**) | rect | `#0d131c` (dégradé translucide) | 1 px `#2a3648` ; **bas : 2 px `#b08d3e` (7 px)** | — |
| `R.titre` | texte | `R.enseigne` | x 332..736 · y 513..559 | l 112,5 CSS | — | — | — | « L’horizon », **capitale 12,50 CSS**, sérif 700, ls .2em, **`#f2c96b`**, centré, contraste **11,84:1** |
| `R.sstitre` | texte | `R.enseigne` | x 208..863 · y 585..609 | l 182,2 CSS | — | — | — | « CE QUI S’OUVRE, ET À QUEL PRIX », **capitale 5,00 CSS**, ls .34em, **`#b9ad92`**, 8,32:1 |
| `R.fen1..3` | tuiles compteur | `.hrz6` | y 679..792 · x 50..361 / 384..695 / 718..1029 | h **31,4** · l **86,7 CSS ×3**, écart **6,1 CSS** | rect | **`#0a0e16`** + lueur cyan interne | 1 px `#2a3648` | chiffres **10,83 CSS** `#7fd4d9` (8,91:1) ; libellés **cap 3,33 CSS** `#8a979c` (6,43:1) |
| `R.elast` | boîte liste | `.hrz6` | x 50..1029 · y 826..1868 | h **289,5 CSS** | rect | **`#0d0f10`** | 1 px `#2a3648` | contient 4 `.ct`, encre de 854 à 1800 = **91 %** |
| `R.ct.recule` | carte | `R.elast` | y 1302..1576 | — | rect | `#111823` | **1 px `#ff5a4d`** (rouge) | « Le rabatteur » + bandeau « C’était à portée. Ça s’est éloigné. » |
| `R.cta6` | CTA | `.pied` | x ~50..1029 · y 1902..1995 | h **25,6 CSS** | rect | `#16191b` | 1 px `#b08d3e` | « PRENDRE — 3 JETONS », cap **6,39 CSS**, `#f2c96b`, 11,22:1 |
| `R.note6` | texte | `.pied` | x 364..716 · y 2020..2037 | — | — | — | — | « écarter une carte est **définitif** » |

**Couche globale (panneau y 435..2098)** : luminance **30,69** · **bleuité B−R +8,70** · encre (L>45) **11,21 %** ·
palette `#111823` 45,7 % · `#0d1116` 17,3 % · `#14181b` 13,7 % · `#373633` 13,1 % · `#0f181f` 9,3 %.
**Rythme vertical** (frontières, CSS depuis `.hrz6`) : 4,7 (cerne) · 12,8 (enseigne) · 58,9 · 67,8 (compteurs) ·
98,6 · 108,3 (liste) · 397,8 · 407,5 (CTA) · 432,8 · 455,8 (cerne bas). **Gouttières inter-boîtes : 9,0 CSS.**

**Homologue #117 (source seulement, non rendu)** : mêmes `.cerne` / `.enseigne` / `.compteurs` / `.elast` ;
`.enseigne i` = « rien à l’horizon » ; compteurs `00/0 · 00 · 00` ; `.elast` contient
`.rien{flex:1;align-items:center;justify-content:center;font:italic 8px/1.5 'DejaVu Serif';color:#6b737d}` →
« Rien ne s’ouvre pour l’instant. / L’horizon se remplit en jouant. » ; puis `.pann` (`#111823`, 1 px `#2a3648`) :
`i` « pourquoi c’est vide » (`#8a979c`) · `b` « Les cartes viennent du monde, pas du menu » (**`#eae0c8`**, 13 px
sérif) · `small` « une possibilité apparaît quand ce que vous faites remplit ses conditions. Rien ici ne s’achète
directement. » (`#b9ad92`, 6,6 px/1,4). **Pas de `.pied`.**

### 2. Inventaire de la capture (état vide, 1080×2400) — fiches

| id | catégorie | parent | bbox px | bbox CSS | forme | remplissage | bord | texte |
|---|---|---|---|---|---|---|---|---|
| `C.enseigne` | plaque titre | écran | x 47..1032 · y 279..461 | l **273,9** · h **50,8** | rect | **`#16161c`** | **1 px `#b08d3d` sur les 4 côtés (3 px)** | — |
| `C.titre` | texte | `C.enseigne` | x 332..748 · y 331..377 | l 115,8 CSS | — | — | — | « L'horizon » (**apostrophe droite**), capitale **12,50 CSS**, **`#ffd240`**, 12,48:1 |
| `C.sstitre` | texte | `C.enseigne` | x 228..851 · y 395..415 | l 173,3 CSS | — | — | — | « CE QUE LE SERVEUR NE DIT PAS », capitale **5,00 CSS**, `#b9ad92`, 8,11:1 |
| `C.fen1..3` | tuiles compteur | écran | y 495..645 · x 47..360 / 383..696 / 719..1032 | h **41,9** · l **87,2 CSS ×3**, écart **6,1 CSS** | rect | `#16161c` | 1 px `#b08d3d` | « 00/0 » **10,56 CSS** `#7fd4d9` (10,57:1) ; libellés cap 3,89 CSS **`#b9ad92`** (8,11:1) |
| `C.elast` | boîte liste | écran | x 47..1032 · y 678..1819 | h **315,6 CSS** | rect | **`#0d0d0d` (= fond d'écran)** | 1 px `#b08d3d` | encre 707..1063 (**31 %**) puis **753 px vides (66 %)** |
| `C.paliers` | **EN TROP** | `C.elast` | x **75..1004** · y **707..1063** | l **258,3** · h **99,2 CSS** | rect | `#16161c` | aucun | « L'ÉCHELLE DES PALIERS » (cap 6,39 CSS, `#b9ad92`) · « · Palier 2 » (cap 7,50 CSS, **`#eae0c8`**, 13,72:1) · « le serveur ne dit pas ce qui manque pour y arriver » (`#b9ad92`, indent +6 px) · « · Palier3 » · « · Palier4 » · « · Palier5 » — pas successifs 14,72 / 12,22 / 14,17 / 13,89 CSS |
| `C.pann` | pavé | écran | x 47..1032 · y 1853..2104 | h **70,0 CSS** | rect | `#16161c` | 1 px `#b08d3d` | `i` « CE QUE LE SERVEUR ENVOIE VRAIMENT » cap **4,17 CSS** `#b9ad92` · `b` « Rien à l'horizon » cap **10,00 CSS** **`#ffd240`** · `small` 2 lignes, interligne **9,44 CSS**, `#b9ad92`, 8,11:1 |
| `C.chrome` | shell (hors ㊱) | — | bandeau y 0..143 · dock y 2180..2400 | — | — | bandeau `#0d0f1c` · dock `#0d131d` | filet **(224,102,73)** braise | ARGENT `#b9ad92` / `9 627 820,00 €` **`#f2c96a`** · JOUR 50 · phase « — » · médaillon « Brûlant / CHALEUR » · dock EMPIRE FAMILLE FILIÈRE PLUS |

**Couche globale (rect d'écran y 143..2180)** : luminance **22,36** · **bleuité B−R −1,04** · encre (L>45) **6,90 %** ·
palette `#0d0d0d` 55,2 % · `#16161c` 37,5 % · `#655a3c` 5,5 % (l'or des traits) · reste < 1,5 %.
**Rythme vertical** : 279 (enseigne) · 461 · 495 (compteurs) · 645 · 678 (liste) · 1819 · 1853 (pavé) · 2104.
**Gouttières inter-boîtes : 9,4 / 9,2 / 9,4 CSS.** **Inventaire d'encre exhaustif : 14 lignes**, toutes
transcrites au §4 — c'est ce qui fonde les énoncés d'ABSENCE de `B1` et `B4`.

### 3. Correspondance des repères

| | référence | capture | rapport |
|---|---|---|---|
| échelle du CONTENU | 1080 px = 300 CSS ⇒ ×3,6 | 1080 px = 300 CSS ⇒ ×3,6 | **1,00** (posé par `dossier.md`, vérifié : largeur 1080 des deux côtés) |
| origine verticale | `.hrz6` haut = **y 435 px** (cerne 452 − 5 CSS×3,6) | rect d'écran = bandeau bas **143** → dock haut **2180** | non superposables ⇒ **aucune comparaison en y absolu** |
| ancrage des comparaisons | bord de boîte ↔ bord de boîte, gouttière ↔ gouttière | idem | tout écart cité au §3 est un écart de **hauteur de boîte** ou d'**écart entre boîtes**, jamais de position absolue |
| échelle du CHROME | — | `AppShell.Px = css × 1280/392` ⇒ **×2,755** | le chrome n'est **pas** comparable au cadre de série 6 (dossier) |

### 4. Scripts

Tous dans `mesures/`, PIL seulement, chacun imprime la taille des images qu'il ouvre et porte ses contrôles.

| script | ce qu'il mesure | contrôle positif | contrôle négatif |
|---|---|---|---|
| `00_extraire_cadres.py` | extrait les cadres #113–118 | #113 contient « ce qui s’ouvre… » → **True** | #113 contient « rien à l’horizon » → **False** |
| `01_textes_cadres.py` | occurrences par cadre + texte visible de #117 | `jetons` : #113=4, #116=3 | `jetons` : **#117=0** |
| `02_recherche_atelier.py` | les libellés de la capture dans 2,6 Mo de source | `'ce que le serveur ne dit pas'` → **1** | chaîne inventée → **0** |
| `03_contexte_atelier.py` | dans quel CADRE tombe chaque hit | « rien à l'horizon » → cadre **#117** | « palier 2 » → cadre **#91** (autre écran) |
| `10_base.py` | tailles, palettes, luminance, densité | 5 largeurs = **1080** | 5 hauteurs **différentes** (2102/2400/2400/2400/1920) |
| `11_bords.py` · `12_boites.py` | lignes de bord OR / ARDOISE | bord bas enseigne réf = **(176,141,62)** | bande de fond → **0 px or** |
| `13_geometrie.py` | boîtes + fonds | largeurs 1080/1080 | `.fen` vs `.ct` réf : **13/255** d'écart |
| `14_etendue.py` · `15_etendue_ref.py` | étendue horizontale par appariement de couleur | enseigne réf **n=980** px appariés | « or » sur ligne de fond : **n=6** (bruit) |
| `16_rythme.py` | frontières verticales | 1ʳᵉ frontière réf = **481** (= bord mesuré au 15) | sonde en gouttière → **aucune frontière** |
| `17_chrome.py` · `24_chrome_detail.py` | bandeau, filet, dock | filet capture sous chrome = **(224,102,73)** | même ligne sur écran seul = **`#0d0d0d`** |
| `18_texte.py` | glyphes, hauteurs de capitale | « L » réf = **12,50 CSS** (prédit 12,4) | fenêtre sans texte → **0 glyphe** |
| `19_couleurs.py` | médianes de remplissage et de bord | bord bas enseigne = **`#b08d3e`** exact | `.fen` ≠ `.ct` (13/255) |
| `20_cerne_vide.py` | colonnes or continues + taille du vide | cerne réf trouvé x=21..23 / 1056..1058 | moitié centrale réf → **[]** |
| `21_cerne_cible.py` | cerne dans les **gouttières** | réf **16/16, 26/26, 26/26** | réf centre x=540 → **0/26** |
| `22_paliers.py` | lignes et espacement du bloc en trop | « Palier 2 » : écart **30 px** | inter-lettres du même mot : **6–7 px** sur les 4 lignes |
| `23_encre_contraste.py` | encre (décile haut) + contraste WCAG | titre réf = **(242,201,107)**, écart **0/255** | sous-titre à **57/255** du titre |
| `25_squelette.py` | inventaire de la capture « état non déclaré » | titre trouvé (`#ffd240`) | boîte liste et pavé → **0 ligne** |
| `26_crops.py` | agrandissements ×2 pour transcrire les textes | — | — |
| `27_tuiles_dock.py` | tuiles de compteur + haut du dock | 3 tuiles égales des deux côtés | boîte liste → **1** segment |
| `28_couche_globale.py` | palette, luminance, **bleuité** | réf bleuité **+8,70** | réf en gris → **+0,00** |
| `29_pave.py` | pavé du bas vs jetons de #117 | « Palier 2 » = **(234,224,200)** crème | titre = **(255,210,64)**, autre encre |
| `30_interligne.py` | taille de texte par l'interligne | réf `.cnd6` **10,28 CSS** (prédit 10,19) | à travers une frontière de bloc : **34,72 CSS** |
| `31_inventaire_encre.py` | inventaire EXHAUSTIF de l'encre | boîte liste **7** bandes, pavé **4** | zone vide y 1070..1815 → **0** |
| `32_chrome_vs_canon.py` · `33_filet_dock.py` | chrome contre le canon HUD, en CSS-HUD | filet présent des deux côtés (64 % / 83 %) | écran seul : couverture **0 %** |
| `34_bloc_paliers_bbox.py` | bbox de la plaque du bloc en trop | fond de plaque = **(22,22,28)** | même détection dans le vide → **None** |

Fichiers produits : `mesures/cadre_113..118.html`, `mesures/crop_enseigne.png`,
`mesures/crop_bloc_paliers.png`, `mesures/crop_pave_bas.png`.
