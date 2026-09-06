# Juge visuel ⊥ — ㊴ Le dossier (« ce qu'ils ont sur vous ») — r1 — 2026-09-06

## Verdict : NON APPROUVÉ

L'écran en jeu n'est pas une exécution du cadre #131 : c'est **un autre écran** — autre titre, autre
sous-titre, sans les trois échelles ni les trois compteurs qui sont le sujet de la maquette — et
seuls la grille de mise en page, les marges et une partie des jetons de couleur sont communs.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport n'est pas recevable ; elle prouve aussi que l'instrument discrimine
(il ne rend pas « tout faux »).

| # | grandeur | référence | jeu | écart |
|---|---|---|---|---|
| P1 | largeur d'image / échelle | 1080 px = 300 CSS (×3,6) | 1080 px = 300 CSS (×3,6) | 0 |
| P2 | marge latérale des panneaux (% de la largeur d'écran) | 4,29 % (46 px / 1072) | 3,61 % (39 px / 1080) | 0,68 pt — **sous** la tolérance de 1,5 % |
| P3 | largeur des panneaux (% de la largeur d'écran) | 91,42 % (980 px) | 92,78 % (1002 px) | 1,36 pt — sous 1,5 % |
| P4 | symétrie gauche/droite de la capture | — | marge g. 39 px, marge d. 39 px | 0 px |
| P5 | rayon des coins de panneau | carré (0 transition sur 7 px de diagonale) | carré (idem) | 0 |
| P6 | hauteur de capitale du titre sérif du panneau bas | 36 px (`O` de « On peut… ») | 36 px (`U` de « Une bande… ») | **0 px** |
| P7 | interligne de ce même titre sérif | 54 px (1650→1704) | 54 px (1691→1745) | **0 px** |
| P8 | couleur du corps de texte | `creme2` #b9ad92 = (185,173,146) | (185,173,146) | **0/255 sur 3 canaux** |
| P9 | couleur de la phrase de piste | `creme` #eae0c8 = (234,224,200) *(rôle : titre du panneau bas)* | (234,224,200) | 0/255 |
| P10 | ancrage vertical du panneau explicatif (% de la zone de contenu) | 69,30 % | 71,61 % | 2,3 pt |
| P11 | gouttière | — | encre la plus haute y=215 (bandeau à 143) ; encre de contenu la plus basse y=2100 (dock à 2194) | **rien sous le chrome** |
| P12 | bas du bandeau | valeur dérivée du code annoncée par `dossier.md` : 143 px | **mesuré 143 px** (filet orange y138..142, fond de contenu à partir de y143) | 0 px |
| P13 | padding interne des panneaux | texte à 40 px du bord (`.pann` x50 → texte x90) | texte à 36-38 px du bord (panneau x39 → texte x75-77) | ≤ 4 px |
| P14 | égalité des trois blocs de piste | colonnes larges de 298 / 304 / 298 px (spread 6 px = 2,0 %, dû au seuil de bbox sur le filet) | cartes hautes de 224 / 223 / 223 px, séparées par 36 / 36 / 36 px | **spread ≤ 1 px côté jeu** — les trois pistes sont traitées à l'identique des deux côtés |
| P15 | identité géométrique des trois filets de piste | — | x 74..1005 (932 px) dans les 3 cartes | 0 px |
| P16 | langue affichée | (maquette : clés anglaises `watched`/`visible`/`quiet`) | **100 % français**, aucun enum brut, aucun UUID, aucun repli anglais | conforme |
| P17 | contrastes | le plus faible de la maquette : `.cle` à **3,71:1** (sous le plancher 4,5:1) | le plus faible du jeu : **8,11:1** | le jeu est **au-dessus** de la doctrine partout |
| P18 | familles de police | `fc-match "DejaVu Serif"` → DejaVu Serif Book ; `"DejaVu Sans"` → DejaVu Sans Book | le client embarque DejaVu Serif / DejaVu Sans | **même police des deux côtés — aucun arbitrage de famille sur cet écran** |

Contrôles de l'instrument lui-même (scripts `mesures/05`, `10`, `11`, `12`) :
`.crans` col.2 mesuré **(255,158,61)** = `#ff9e3d` écrit en toutes lettres dans le markup ·
cran vide **(42,54,72)** = `#2a3648` · cran col.3 **(125,179,106)** = `#7db36a` · `.pann`
**(17,24,35)** = `#111823` — **4 valeurs byte-exactes**. Contrôles négatifs : bbox `None` sur un
fond pur, 0 glyphe dans une zone vide, 0 px coloré dans le vide de `.elast`, 1,00:1 sur une paire
identique. L'aire colorée prédite pour la bande des crans (30 870 px) est retrouvée à **31 999 px**.

---

## 0. L'écran, tel que la maquette le dit

**But** — lire trois pistes qui ne se mélangent pas, *chacune sur son échelle* : où en est la
comptabilité, ce qui sort des cuves, le train de vie. Puis décider d'acheter du renseignement.

**Ordre de lecture** (1) la plaque gravée « **L e   d o s s i e r** » — or vif, capitale de 45 px,
interlettrage 0,2 em, sur fond serti et souligné d'un filet or de 7 px ; (2) la rangée de trois
compteurs cyan « **01**/3 · **00** · **01**/4 » — le seul cyan de l'écran, avec un halo interne ;
(3) les **trois échelles** côte à côte, 12 crans dont 6 allumés, trois couleurs différentes ;
(4) le pavé pédagogique crème ; (5) le CTA or.

**Zones** bandeau (évocation) · plaque de titre · rangée de compteurs · panneau des trois pistes
(colonnes + réserve élastique) · panneau « pourquoi » · pied (CTA + note).

**Traits d'identité** (a) tout est **serti** : un filet `lisere` #2a3648 autour de chaque plaque,
un cadre or `.cerne` autour de l'écran entier ; (b) le **bleu nuit** — quatre niveaux de surface
distincts, du creux #0a0e16 à la plaque #111823 ; (c) la typographie **gravée** — capitales
minuscules très espacées (0,2 em / 0,34 em) ; (d) **trois échelles lisibles d'un coup d'œil**,
côte à côte, à trois hauteurs de remplissage différentes ; (e) une hiérarchie de taille franche
(titre 45 / titre sérif 36 / le reste 14-17).

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Le joueur qui arrive par PLUS → « LE DOSSIER » lit un écran qui s'appelle **« Ce qui se
voit »** et qui annonce « trois signaux, trois bandes » : le mot *dossier*, le mot *piste* et
l'idée « elles ne se mélangent pas » ont disparu de la page. Aucune des deux chaînes du jeu
n'existe dans les 2,5 Mo de la série 6 (balayage insensible à la casse : « ce qui se voit » 0,
« trois signaux » 0 ; contrôle positif « le dossier » 12).

Ce qui manque ensuite est **l'information**, pas la décoration : les 12 crans (3 colonnes × 4,
245 × 21 px, remplis 2/4, 3/4, 1/4) sont remplacés par **3 filets pleins de 932 × 8 px**. On ne lit
plus *où on en est* sur une piste — seulement sa couleur et une phrase. Les trois compteurs de tête
(« 01/3 pistes chaudes », « **00** franchies », « 01/4 qui tiennent ») n'existent nulle part :
**0 px de cyan** entre le bandeau et la 3ᵉ carte, contre 3 568 px sur la référence. Le palier
« franchies » — le dernier palier, celui qui est un *événement* — n'a donc plus aucune
représentation.

Les trois écarts de tête, par impact perçu : **1)** l'échelle de chaque piste a disparu ;
**2)** l'écran ne s'annonce plus comme le dossier ; **3)** les compteurs, donc le décompte des
paliers franchis, ont disparu.

L'ordre de lecture s'en trouve inversé au bas de l'écran : le titre du panneau explicatif est passé
de crème #eae0c8 à **or (255,210,64)**, la même famille que le titre d'écran — deux blocs or de
850 px de large se disputent maintenant le premier regard, et le second est un aveu technique daté
(« au 2 septembre 2026 », « la valeur par défaut du serveur »), à 7 lignes, après 17,9 % de vide.

Globalement l'écran est **plus vide et plus sombre** : densité d'encre 12,0 % → **5,3 %**, aire
colorée 5,52 % → **2,01 %** de la zone de contenu (÷2,75 par unité d'aire), luminance moyenne
0,0399 → 0,0283 (−29 %), et la palette s'effondre sur **deux** valeurs plates qui couvrent 92,8 %
(contre 5 tons bleu nuit couvrant 74,6 %). Le sertissage a disparu entièrement : **0 px** de
`lisere` #2a3648 et **0 px** de filet or #b08d3e dans toute la zone de contenu, contre 72 542 px et
10 847 px sur la référence.

Ce qui tient, et qui est solide : la grille (marges, largeurs, symétrie, paddings), les jetons de
texte, la gouttière, la langue, et des contrastes **meilleurs** que ceux de la maquette.

---

## 3. Écarts

`gravité` ∈ {BLOQUANT, MAJEUR, MINEUR}. ASSUMÉ et ARBITRAGE sont dans des tables à part et ne sont
pas comptés ici. `dép. données` = l'écart change-t-il si le compte de démo est recréé ?

| id | gravité | critère | dép. données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | BLOQUANT | NOUVEAU | non | **L'échelle de chaque piste a disparu.** 12 crans gradués → 3 filets pleins : on ne lit plus le niveau atteint, seulement une couleur. | RÉF : 12 barres de **245 × 21 px** (3 colonnes × 4 crans ; remplies 2/4 or, 3/4 ambre, 1/4 vert), pitch 28-29 px, x 106..350 / 418..661 / 729..973, y 977..1084. JEU : **3** filets 932 × 7-8 px (x 74..1005), un par carte, sans graduation. Balayage « barre pleine ≥ 200 px de large » sur toute la zone de contenu du jeu : **3 objets**, 0 gradué. (`mesures/12`) | si l'écran défile et si des crans existent hors cadre — une seule capture, mais 17,9 % de vide au milieu argue que non |
| `F2` | BLOQUANT | NOUVEAU | non (la forme) | **Les trois compteurs de tête ont disparu** — dont « **00** franchies », seule représentation du dernier palier (l'événement « ils sont venus »). | RÉF : 3 fenêtres serties de **288 × 130 px** à 15,84–23,67 % de la zone de contenu, chiffres `cyan` #7fd4d9 (**3 568 px** de cyan mesurés). JEU : **0 px** de #7fd4d9 entre y143 et y1150 ; le seul cyan de l'écran (7 456 px) est **entièrement** le filet de la 3ᵉ carte (y1158..1170 : 7 456 px). Contrôle positif du même motif sur la référence : trouve la cible. (`mesures/12`) | — |
| `F3` | BLOQUANT | NOUVEAU | non | **Titre et sous-titre remplacés** : « Le dossier » → « Ce qui se voit » ; « TROIS PISTES, ET ELLES NE SE MÉLANGENT PAS » → « TROIS SIGNAUX, TROIS BANDES ». L'écran ne s'annonce plus comme celui qu'on a ouvert (entrée PLUS → « LE DOSSIER »). | Balayage `grep -oiF … \| wc -l` sur `ecrans-brennar-6.html` (2,5 Mo, **tous** les cadres de la série 6) : « ce qui se voit » **0**, « trois signaux » **0**, « on vous regarde » **0**, « rien ne dépasse » **0**, « une bande sans source » **0**. Contrôle positif « le dossier » **12**, « trois pistes » **3**, « ça se voit » **4**. | si un cadre d'état non fourni porte ces libellés : `etats/` **n'existe pas** dans ce dossier (défaut du dossier, voir §6) |
| `F4` | MAJEUR | NOUVEAU | non | **Les trois pistes ne sont plus côte à côte** : 3 colonnes juxtaposées → 3 rangées empilées pleine largeur. L'argument visuel du sous-titre (les voir *ensemble*, sur la même ligne, pour ne pas les moyenner) devient une liste séquentielle. | RÉF : colonnes x 82..379 / 388..691 / 700..997 (**27,80 %** de la largeur chacune), même bande y 877..1200. JEU : cartes de **92,78 %** de la largeur, y 501..724 / 761..983 / 1020..1242. | — |
| `F5` | MAJEUR | NOUVEAU | non | **L'or de la 1ʳᵉ piste est plus jaune** : jeton `accentGold #ffd23f` là où l'art veut `hudMoneyGold #f2c96b`. | RÉF cran or : **(242,201,107)** = #f2c96b (byte-exact vs markup). JEU filet carte 1 : **(255,210,64)** = #ffd240. Δ = **(+13, +9, −43)** — 43/255 sur le bleu, soit 7× la tolérance de 6. Le même #ffd240 sert aussi au titre d'écran et au titre du panneau bas. | — |
| `F6` | MAJEUR | NOUVEAU | non | **Le vert a totalement disparu** : la piste « train de vie » au palier calme est `vert` #7db36a dans l'art, `cyan` #7fd4d9 dans le jeu — or le cyan est, dans la maquette, la couleur **réservée aux compteurs**. | RÉF : **6 539 px** de #7db36a dans la zone de contenu. JEU : **0 px** dans toute la zone de contenu (même motif, même tolérance ; contrôle positif : trouve 6 539 sur la référence). Filet carte 3 mesuré **(127,212,217)** = #7fd4d9. | que le palier affiché soit bien l'homologue de `quiet` — le panneau du jeu écrit lui-même « « train de vie » rend « calme » », ce qui l'indique |
| `F7` | MAJEUR | NOUVEAU | non | **Aucun panneau n'a de bord.** Les 5 plaques du jeu flottent au lieu d'être serties ; c'est le trait d'identité (a) de la maquette. | RÉF : **72 542 px** de `lisere` #2a3648 dans la zone de contenu (`.enseigne`, `.fen`, `.elast`, `.pi`, `.pann` portent tous un filet de 1 px CSS = 3 px, mesuré x 50..52). JEU : **0 px**. Vérifié en second par une méthode **structurelle** (indépendante de la couleur) : transition directe (13,13,13)→(22,22,28) au pixel, sur 3 panneaux et sur les 2 axes. | — |
| `F8` | MAJEUR | NOUVEAU | non | **Tout l'or de structure a disparu** : cadre or de l'écran (`.cerne`), filet or de 7 px sous le titre, encadré or du CTA. | RÉF : 6 lignes or #b08d3e pleine largeur (y 452-454, **663-669**, 1902-1904, 1993-1995, 2076-2078) + **5 423 + 5 424 px** d'or dans les colonnes de bord (x 0..60 et 1020..1079). JEU : **0 ligne, 0 px** dans la zone de contenu. | si `.cerne` est une convention de tous les cadres de série 6 plutôt qu'un élément de cet écran — il est déclaré dans `chassis6.py` **et** posé explicitement dans le markup du cadre #131 |
| `F9` | MAJEUR | NOUVEAU | non | **Le titre et le sous-titre perdent leur interlettrage** : la plaque gravée devient du texte courant. | RÉF titre (`letter-spacing:.2em`) : jeu inter-glyphes **16-18 px** pour une capitale de 45 px (0,36-0,40 cap). JEU : **5-9 px** pour une capitale de 51 px (0,10-0,18 cap). RÉF sous-titre (`.34em`) : gaps 9-11 px pour cap 17 (0,59 cap). JEU : **3-6 px** pour cap 22 (0,14 cap). | — |
| `F10` | MAJEUR | NOUVEAU | non | **Le titre du panneau explicatif passe de crème à or**, à la même famille que le titre d'écran ⇒ deux blocs or se disputent le premier regard et l'ordre de lecture bascule vers le bas de l'écran. | RÉF `.pann b` : **(234,224,200)** = `creme` #eae0c8. JEU : **(255,210,64)** = #ffd240, sur 2 lignes de 850 et 465 px, capitale 36 px. Δ = (+21, −14, −136). | — |
| `F11` | MAJEUR | NOUVEAU | non | **Échelle typographique compressée** : la hiérarchie franche de la maquette s'aplatit. | Capitales (RÉF → JEU) : titre **45 → 50** (+11 % ; capitale mesurée 51 px sur le `C`, moins ~2 % de débord de lettre ronde, contre un `L` plat côté référence) · sous-titre **17 → 22** (+29 %) · intitulé de piste/carte **14,5 → 23** (+59 %) · intitulé du panneau bas **15 → 21** (+40 %) · titre sérif du panneau **36 → 36** (0 %) · hauteur d'x du corps **14 → 19** (+36 %). Rapport titre:corps **3,2 → 2,6** ; rapport titre sérif:intitulé **2,4 → 1,7**. | rien : `fc-match` prouve que les deux côtés utilisent DejaVu (P18) ⇒ ce sont des écarts de **taille**, pas de famille |
| `F12` | MAJEUR | NOUVEAU | non | **Une seule valeur de surface pour les 5 panneaux** : la profondeur creux/plaque/fond de la maquette disparaît. | RÉF : 4 niveaux distincts — `.enseigne` dégradé (23,28,36)→(16,21,30) · `.fen` creux (26,43,51) · `.elast` (13,15,16) · `.pann`/`.pi` (17,24,35). JEU : **(22,22,28) sur les 5 panneaux, écart 0/255 entre eux** ; fond (13,13,13). Palette quantifiée : 2 couleurs couvrent **92,8 %** de la zone de contenu du jeu, contre 5 tons couvrant 74,6 % côté référence. | — |
| `F13` | MAJEUR | NOUVEAU | **oui** (le texte), non (le remplacement) | **Le panneau explicatif porte un autre message** : l'argument produit (« pourquoi trois colonnes / *On peut être propre sur deux et pris sur la troisième* ») est remplacé par un aveu technique **daté** en langue d'ingénieur. | RÉF : intitulé + 1 titre de 2 lignes + **2** lignes de corps, **17,90 %** de la zone de contenu. JEU : « CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE » + titre 2 lignes + **7** lignes de corps, **23,85 %** ; contient « au 2 septembre 2026 », « la valeur par défaut du serveur », « Le corps ne dit pas… ». | si ce texte est un arbitrage produit ratifié — il n'est **pas** dans la table des écarts assumés du dossier ; la date en dur est une observation, pas un jugement de code |
| `F14` | MAJEUR | NOUVEAU | non | **L'écran est nettement plus vide, plus sombre et moins coloré** que la maquette. | Aire colorée (S>0,35 ∧ V>0,30) : **5,52 % → 2,01 %** de la zone de contenu (93 957 → 44 476 px, ÷2,75 par unité d'aire). Densité d'encre (L>0,035) : **12,0 % → 5,3 %**. Luminance moyenne : **0,0399 → 0,0283** (−29 %). | — *(cause commune : F1 + F2 + F7 + F8 ; ligne conservée parce que c'est la grandeur que l'œil perçoit en premier)* |
| `F15` | MINEUR | NOUVEAU | non | **Losange or EN TROP** sous le bandeau, sans homologue dans la maquette. | bbox (531,215)–(548,231), **18 × 17 px**, couleur **(176,141,61)** = `or_filet` #b08d3e, centré à 539,5 (centre d'écran exact). | s'il appartient au **chrome du shell** (partagé, donc hors périmètre de cet écran) ou à l'écran — indécidable depuis une image d'un seul écran |
| `F16` | MINEUR | NOUVEAU | non | **Le bloc de titre est raccourci de 30 %** : le rythme du haut ne suit pas la maquette. | RÉF `.enseigne` : **12,74 %** de la zone de contenu (y 459..669). JEU panneau de titre : **8,88 %** (y 282..464). Bas du bloc : 14,26 % → 15,66 %. | — |
| `F17` | MINEUR | NOUVEAU | non | **Les filets de piste sont 3,8× plus larges que les crans qu'ils remplacent, et changent de côté** : posés SOUS la phrase (souligné) alors que les crans sont AU-DESSUS du verdict. | Largeur : **22,85 % → 86,30 %** de la largeur d'écran. Position : RÉF crans y 977..1084 puis verdict y 1107..1133 ; JEU phrase y 584..630 puis filet y 642..648. | — *(corollaire de F1)* |
| `F18` | MINEUR | NOUVEAU | non | **Le grand vide change de nature** : réserve élastique *à l'intérieur* d'un panneau serti (« il y a de la place pour plus ») → trou à ciel ouvert entre la 3ᵉ carte et le panneau du bas. | RÉF : **21,48 %** de la zone de contenu, dans `.elast` (bordé). JEU : **17,90 %**, sur le fond nu (aucune encre entre y1243 et y1610, vérifié : 0 bord détecté à y=1400). | — |
| `F19` | MINEUR | NOUVEAU | non | **Interligne du corps de texte +15 %.** | RÉF : pas **33 px** (= 6,6 px × 1,4 × 3,6, exact). JEU : pas **38 px**. | — *(corollaire de F11)* |

**Compte : 3 BLOQUANT · 11 MAJEUR · 5 MINEUR = 19 findings.**

---

## Table à part — écarts ASSUMÉS (vérification « rendu proprement »)

| # | écart assumé (dossier.md) | rendu proprement ? | mesure |
|---|---|---|---|
| A1 | le libellé de la 3ᵉ piste ne dit pas « votre » train de vie | **oui** | le jeu écrit « TRAIN DE VIE » ; aucun possessif, aucun trou, aucun libellé de repli |
| A2 | pas de CTA « ACHETER DU RENSEIGNEMENT » | **oui** | 0 px d'or de bord (#b08d3e) dans tout le bas de l'écran ; **pas de bouton fantôme, pas de bloc éteint**. ⚠️ la **note de pied** qui accompagne le CTA (« sur un acteur, pas sur une piste — on n'achète pas un dossier », RÉF y 2018..2041) tombe avec lui : aucune légende orpheline ne subsiste — propre |
| A3 | « cinq achetables » n'apparaît nulle part | **oui** | absent des deux côtés |
| A4 | pas d'UUID / d'identifiant opaque à l'écran | **oui** | aucune chaîne de type identifiant dans les 4 blocs de texte du jeu |
| A5 | l'état vide « Rien à votre nom » indiscernable de « tout au plus bas » | **sans objet** | la capture n'est pas dans l'état vide (3 bandes alimentées) |
| A6 | pas de prix affiché avant l'achat | **oui** | aucun montant dans la zone de contenu ; le seul montant de l'image est dans le bandeau (chrome) |
| A7 | la 3ᵉ fenêtre de compteurs porte un seul sens | ⚠️ **hors périmètre** | cet assumé **présuppose que les fenêtres de compteurs existent**. Elles n'existent pas (F2 : 0 px de cyan). Un assumé sur le *sens* d'un compteur ne peut pas absorber l'*absence* de tous les compteurs — c'est pourquoi F2 est compté comme finding. |

---

## Table à part — ARBITRAGES (non corrigibles côté client, ou décidés hors de l'image)

| # | point | ce que la mesure dit |
|---|---|---|
| `B1` | **Le rouge de la 2ᵉ piste** — filet **(255,90,77)** = `danger` #ff5a4d, là où le seul témoin de la maquette est `ambre` #ff9e3d (`visible`). | Le dossier annonce que le compte de démo est à `glaring` sur l'effluent et que **aucun cadre ne dessine ce palier**. Le client a donc inventé une forme **sans témoin** : un rouge franc au-dessus de l'ambre. La forme est cohérente avec l'échelle (plus chaud que `visible`) et le libellé suit (« Ça se voit de loin » vs « ça se voit »). **Maquette incomplète, pas défaut du client** — mais l'écart de *géométrie* du filet reste compté en F1/F17. |
| `B2` | **La ligne de balayage teal de la référence** (y 1090..1097, x 169..909, (47,76,85)) n'existe pas dans le jeu. | C'est `.elast::after`, une **animation** (`animation: …-scan 7.5s linear infinite`) figée par le rendu Chrome. Ruling « un nouvel écran est SANS animation » ⇒ le client a raison, la référence porte un artefact de rendu. |
| `B3` | **Les clés anglaises `watched` / `visible` / `quiet`** (RÉF, #6b737d, capitale 14 px, sous chaque verdict) ne sont pas reprises. | Doctrine « aucun enum brut ne doit atteindre l'écran » ⇒ le client a raison. À noter : c'est le **seul** texte de la maquette sous le plancher de contraste (3,71:1). |
| `B4` | **Maquette à mettre à jour** (une fois, ruling « fr réel » 2026-09-02) : la référence affiche « $ 24 850 », « HEAT », « tiède », « Jour 12 / Matin ». Le jeu affiche « 406 653,08 € », « CHALEUR », « Brûlant », « JOUR 37 ». | Le client a raison ; ce n'est pas un écart d'écran. |
| `B5` | **Polices** — aucun arbitrage sur cet écran. | `fc-match "DejaVu Serif"` → **DejaVu Serif Book**, `fc-match "DejaVu Sans"` → **DejaVu Sans Book** ; le chassis de la série 6 demande explicitement ces deux familles et le client les embarque. Contrairement aux écrans qui demandent `Georgia` (→ Noto Serif), **la référence et le jeu partagent ici la même police** : tout écart de capitale (F11) est un écart de taille, pas de famille. |

---

## 5. Autres résolutions

**Non jugeable — une seule capture fournie** (1080×2400, 20:9). Le projet vise le portrait et le
dossier lui-même annonce « deux résolutions » puis n'en fournit qu'une. Aucun reflux n'a pu être
observé. Ce qui est vérifiable sur l'unique capture, et qui tient : rien n'est coupé, rien ne
déborde de son parent, rien n'est hors cadre, et la gouttière est respectée (P11).

---

## 6. Non vérifié

| point | la mesure hors image qui trancherait |
|---|---|
| **Une seule résolution.** Le comportement à 1080×1920 (19,5:9) et sur un écran plus court est inconnu — or l'écran porte 17,9 % de vide, donc son reflux est justement la question intéressante. | une seconde capture à 1080×1920 par le même test |
| **Animation.** Aucune paire T / T+1 s fournie ⇒ l'absence d'animation (ruling 2026-08-27) n'est **pas prouvée**, seulement non contredite. | deux captures du même état à 1 s d'écart, puis compte de pixels différents hors chrome |
| **Cadre témoin.** La capture ne correspond à **aucun** des 6 cadres #131–#136. Le dossier renvoie à un répertoire `etats/` pour choisir un homologue : **ce répertoire n'existe pas** (`ls` de `screen_b7/` : `corps-reels/`, `r1-2026-09-06/`, `dossier.md`, `mandat.md`, `reference-1080x2102.png`). J'ai donc jugé contre le cadre nominal #131, faute d'homologue. **C'est un défaut du dossier.** | rendre les cadres #132–#136 (`Tools/rendre-tel.py … 3.6`) et vérifier qu'aucun ne porte « Ce qui se voit » |
| **Décision produit.** Je ne peux pas savoir si la suppression des crans (F1), des compteurs (F2) et le changement de titre (F3) sont des arbitrages ratifiés. La table des écarts assumés ne les porte pas, et le mandat dit qu'un choix qui n'y est pas n'existe pas. | l'arbitrage de l'user, puis une ligne dans la table des assumés du prochain tour, avec son périmètre |
| **Le losange or (F15).** Chrome du shell ou contenu d'écran ? | la même capture sur un autre écran du même shell : s'il y est aussi, c'est du chrome |
| **Le chrome (bandeau + dock).** Non jugé : le canon du HUD (`Tools/juge-visuel/ecran-principal/ecran-canon.png`) n'est pas dans le dossier, et le bandeau est **partiellement non alimenté** — la sous-ligne de JOUR affiche « **—** » là où la maquette dit « Matin ». Doctrine : chrome non alimenté ⇒ ne pas juger le chrome. | fournir le canon HUD dans le dossier, et une capture avec le moment de la journée alimenté |
| **Défilement.** Une seule image : je ne peux pas prouver que la page ne défile pas et qu'aucun contenu (les crans ? les compteurs ?) n'existe hors cadre. Les 17,9 % de vide au milieu l'indiquent, mais ne le prouvent pas. | une capture après un défilement maximal, ou la hauteur du contenu imprimée par le test |
| **Rect imprimé.** Le log du run n'est pas préservé : `scaleFactor` et le rect réel de la feuille ne sont pas vérifiables. J'ai vérifié sur l'image la seule grandeur dérivée que le dossier annonce (bandeau = 143 px, P12) et elle tombe juste. | préserver la sortie du test avec la capture |
| **Fraîcheur des données.** La capture date du 2026-09-04 sur `operational_demo@example.test` ; le compte a pu être recréé depuis. Seul F13 dépend des données ; tout le reste (géométrie, palette, typographie, rythme) est vrai quelles que soient les données. | rejouer la capture et comparer les 3 libellés de bande |

---

## Annexes

### 1. Inventaire de la référence (cadre #131, 1080×2102)

Corps d'écran `.dos6` : **y 434..2082** (H = 1 648 px), x 4..1075 (1 072 px). Cadre or `.cerne`
(1 px `or_filet` #b08d3e, inset 5 CSS) : x 22..23 / 1056..1057, y 452..2078.

| id | catégorie | bbox px | % zone | forme / remplissage | texte |
|---|---|---|---|---|---|
| `R1` | plaque de titre `.enseigne` | y 459..669 | 1,52–14,26 % (h 12,74 %) | bordure 1 px `lisere` (42,54,72), fond dégradé (23,28,36)→(16,21,30), **filet or 7 px** en bas (176,141,62) | — |
| `R1.a` | titre | y 513..560, x 306..764 | — | — | « Le dossier », DejaVu Serif 700, **capitale 45 px**, letter-spacing 0,2 em (gaps 16-18 px), `or_vif` (242,201,107), centré |
| `R1.b` | sous-titre | y 589..629 (2 lignes), x 110..961 | — | — | « TROIS PISTES, ET ELLES NE SE MÉLANGENT PAS », DejaVu Sans 700, **capitale 17 px**, letter-spacing 0,34 em (gaps 9-11), (185,173,146) |
| `R2` | 3 fenêtres `.fen` | y 695..824 ; x 84..371 / 396..683 / 708..995 | 15,84–23,67 % (h 7,83 %) | bordure 1 px `lisere`, fond `creux` (26,43,51) avec halo cyan interne | « 01/3 PISTES CHAUDES », « 00 FRANCHIES », « 01/4 QUI TIENNENT » ; chiffres `cyan` #7fd4d9 (3 568 px), libellés `muet` |
| `R3` | panneau des pistes `.elast` | y 845..1560 | 24,94–68,33 % (h 43,39 %) | bordure 1 px `lisere`, fond (13,15,16) | — |
| `R3.1-3` | 3 colonnes `.pi` | y 877..1200 ; x 82..379 / 388..691 / 700..997 | h 19,60 % | bordure 1 px `lisere`, fond `carte` (17,24,35) — **27,80 %** de la largeur chacune | intitulés `muet` (138,151,156) capitale 14-15 px |
| `R3.crans` | 12 crans | y 977..997 / 1006..1026 / 1034..1055 / 1063..1084 ; x 106..350, 418..661, 729..973 | — | 245 × 21 px, pitch 28-29 px | col.1 : vide, vide, **#f2c96b**, **#f2c96b** · col.2 : vide, **#ff9e3d** ×3 · col.3 : vide ×3, **#7db36a** ; vide = **#2a3648** |
| `R3.verdict` | mots de verdict | y 1107..1133 | — | — | « on regarde » (#f2c96b), « ça se voit » (#ff9e3d), « discret » (#7db36a), DejaVu Serif 700 |
| `R3.cle` | clés anglaises | y 1148..1161 | — | — | watched / visible / quiet, (107,115,125), capitale 14 px, **contraste 3,71:1** |
| `R3.scan` | ligne de balayage animée | y 1090..1097, x 169..909 | — | (47,76,85), dégradé transparent→cyan→transparent | *(artefact d'animation)* |
| `R3.vide` | réserve élastique | y 1201..1555 | h 21,48 % | fond (13,15,16), **dans** le panneau bordé | — |
| `R4` | panneau `.pann` | y 1576..1871 | 69,30–87,20 % (h 17,90 %) | bordure 1 px `lisere`, fond `carte` (17,24,35) | intitulé « POURQUOI TROIS COLONNES » (cap 15, `muet`) · titre sérif 2 lignes, **cap 36 px**, pitch 54 px, `creme` (234,224,200) · corps 2 lignes, x-height 14, pitch 33, `creme2` + gras `or_vif` |
| `R5` | CTA `.cta6` | y 1882..2009 | 87,86–95,57 % (h 7,71 %) | bordure 1 px or (176,141,62) haut y1902-1904 et bas y1993-1995, fond `carte2` (22,25,27) | « ACHETER DU RENSEIGNEMENT », `or_vif`, capitale 24 px, letter-spacing |
| `R6` | note `.note6` | y 2018..2041 | 96,12–97,51 % | — | « sur un acteur, pas sur une piste — **on n'achète pas un dossier** », `muet` + gras `or_vif` |

**Couche globale** — palette quantifiée de la zone de contenu : (17,24,35) 21,58 % · (15,20,28)
16,97 % · (13,16,20) 13,97 % · (23,28,31) 11,15 % · (10,12,13) 10,90 % · (124,116,91) 7,36 %.
Luminance moyenne **0,0399** · densité d'encre **12,0 %** · aire colorée **5,52 %**
(orange/or 71 230 px, cyan 9 217, vert 6 884, bleu 4 560, rouge 773).

### 2. Inventaire de la capture (1080×2400)

Zone de contenu : **y 143..2193** (H = 2 050 px, bandeau 0..142, dock 2194..2399), panneaux
x 39..1040 (1 002 px). **Aucun bord, aucun rayon, aucun filet or de structure.**

| id | catégorie | bbox px | % zone | forme / remplissage | texte |
|---|---|---|---|---|---|
| `C0` | losange (EN TROP) | (531,215)–(548,231) | 3,51–4,29 % | 18 × 17 px, (176,141,61) | — |
| `C1` | panneau de titre | y 282..464, x 39..1040 | 6,78–15,66 % (h 8,88 %) | plein (22,22,28), **0 bord, 0 filet or, coins carrés** | « Ce qui se voit » DejaVu Serif, **cap 51 px**, gaps 5-9, (255,210,64), centré · « TROIS SIGNAUX, TROIS BANDES » **cap 22**, gaps 3-6, (185,173,146) |
| `C2` | carte 1 | y 501..724 (h 224) | 17,46–28,34 % (h 10,88 %) | plein (22,22,28) | « RISQUE D'AUDIT » cap 23, (185,173,146) · « On vous regarde » cap 36 / x-h 25, (234,224,200) · **filet y 642..648, x 74..1005, (255,210,64)** |
| `C3` | carte 2 | y 761..983 (h 223) | 30,15–40,98 % (h 10,83 %) | plein (22,22,28) | « VISIBILITÉ DES REJETS » · « Ça se voit de loin » · **filet y 901..908, (255,90,77)** |
| `C4` | carte 3 | y 1020..1242 (h 223) | 42,78–53,61 % (h 10,83 %) | plein (22,22,28) | « TRAIN DE VIE » · « Rien ne dépasse » · **filet y 1160..1167, (127,212,217)** |
| `C5` | vide | y 1243..1610 | 53,66–71,56 % (h 17,90 %) | fond nu (13,13,13), 0 encre | — |
| `C6` | panneau bas | y 1611..2100, x 39..1040 | 71,61–95,46 % (h 23,85 %) | plein (22,22,28), 0 bord | « CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE » cap 21, (185,173,146) · titre sérif 2 lignes **cap 36, pitch 54**, (255,210,64) · corps **7 lignes**, x-h 19, pitch 38, (185,173,146) |
| `C7` | dock (chrome, non jugé) | y 2194..2399 (h 206) | — | 4 disques + libellés EMPIRE / FAMILLE / FILIÈRE / **PLUS** (actif, trait or) | — |
| `C8` | bandeau (chrome, non jugé) | y 0..142, filet orange y 138..142 | — | manomètre débordant sous le filet (y 150..203) | « ARGENT / 406 653,08 € » · « Brûlant / CHALEUR » · « JOUR 37 / **—** » |

**Couche globale** — palette : (22,22,28) **55,51 %** · (13,13,13) **37,24 %** · (207,196,134)
3,35 % · (139,109,87) 1,85 % · (13,13,14) 0,93 % · (13,14,16) 0,56 %. Luminance moyenne **0,0283**
· densité d'encre **5,3 %** · aire colorée **2,01 %** (or/jaune 25 054 px, rouge 7 456, cyan 7 456,
orange 4 510, **vert 0**).

### 3. Correspondance des repères

| | référence | capture | rapport |
|---|---|---|---|
| échelle | 1 px CSS = 3,6 px (300 CSS = 1080) | 1 px CSS = 3,6 px (300 CSS = 1080) | **1,00** — écarts de taille = écarts réels |
| largeur d'écran utile | x 4..1075 = **1 072 px** (le cadre `.tel` mange 2 × 4 px + 2 px d'or) | x 0..1079 = **1 080 px** | 1,007 |
| zone de contenu (verticale) | `.dos6` y 434..2082, **H = 1 648 px** | sous bandeau / au-dessus dock, y 143..2193, **H = 2 050 px** | **1,244** |
| **normalisation employée** | toute position verticale est donnée en **% de H** ; toute largeur en **% de la largeur d'écran** ; jamais en px absolus entre les deux images | | |
| chrome | évocation à 300 CSS (barre dessinée par le cadre, **pas de dock**) | chrome réel à 392 CSS-HUD (×2,755) : bandeau **143 px** (mesuré = dérivé), dock **206 px** | non comparable — hors jugement |

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre et porte son contrôle.

| script | grandeur | contrôle |
|---|---|---|
| `01_geometrie.py` | profils de luminance par ligne | — |
| `02_bandes.py` | segmentation des panneaux par couleur médiane de ligne | — |
| `03_horiz.py` | bords gauche/droit des panneaux | **négatif** : y=1400 et y=2150 rendent « aucun bord » |
| `04_ref_horiz.py` | runs horizontaux de la référence | positif : 3 colonnes trouvées à y=1000 |
| `05_inventaire.py` | bbox d'encre, couleur médiane | **positif ×3 byte-exact** (#ff9e3d, #2a3648, #7db36a) + **négatif** (bbox None) |
| `06_texte.py` | segmentation en lignes de texte + couleur | **positif** : filet or de l'enseigne rendu h=7 (attendu 7,2) |
| `07_rythme.py` | bandeau / dock de la capture | **positif** : bas du bandeau mesuré 143 = valeur dérivée du dossier |
| `08_surfaces.py` | remplissages, bords, axe bleu B−R | **positif** `.pann`=(17,24,35) · **négatif** fond `.tel`=(11,16,22) |
| `09_capitales.py` | segmentation en glyphes, hauteur de capitale, jeu inter-glyphes | **positif** : sous-titre cap 17 px (attendu 16,8) · **négatif** : 0 glyphe dans le vide |
| `10_contraste_palette.py` | contrastes WCAG, palette quantifiée, luminance, densité | **positif** #eae0c8/#000 = 15,99:1 · **négatif** paire identique = 1,00:1 |
| `11_couleur.py` | aire colorée par famille de teinte | **positif** : 31 999 px sur la bande des crans (prédit 30 870) · **négatif** : 0 px dans le vide |
| `12_absences.py` | **preuve des absences** — chaque motif est passé sur la CAPTURE **et** sur la RÉFÉRENCE | chaque zéro de la capture est apparié à un compte non nul sur la référence (5 423 / 72 542 / 3 568 / 6 539 px) |
| `13_finitions.py` | filets or pleine largeur, rayons de coin, losange | **positif** : les 6 lignes or de la référence sont trouvées |
| `14_normalisation.py` | rythme vertical en % de la zone de contenu | **positif** : marges latérales à ~4 % des deux côtés |

Mesures hors image : `grep -oiF … | wc -l` sur `ecrans-brennar-6.html` (2,5 Mo) — piped, jamais lu
au terminal ; `fc-match` sur les familles demandées par `chassis6.py`.
