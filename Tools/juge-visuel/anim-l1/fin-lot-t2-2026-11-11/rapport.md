# Juge visuel ⊥ — ANIMATIONS lot L1 (`shell.entree` · `bandeau.entree` · `bascule.course`) — tour 2 BORNÉ — 2026-11-11

## Verdict : **APPROUVÉ**

Aucun écart A/B sur les trois questions bornées : pendant `bascule.course` **zéro pixel** ne
change hors de l'interrupteur (sur tout le cadre, aux deux résolutions, dans les deux sens) ;
la descente du bandeau tient l'`ease-out` à **≤ 0,49 px** en position et **≤ 0,006** en alpha, sans
rien couper ni sortir du cadre ; sous Réduit l'état final est posé **dès `t0`**, couleur de piste
comprise. Table des findings : **0 finding**.

---

## Trois lignes de verdict

- **Q1 — la bascule, sur l'écran entier : A/B ? NON.** Hors de l'interrupteur, `pixels différents = 0`
  (delta max 0) entre `avant`, `t0`, `t70ms` et `t140ms`, dans les deux sens et aux deux résolutions,
  sur **tout** le cadre moins un rectangle de 100×65 px — alors que le même instrument retrouve le
  fondu connu de `shell.entree` (82,18 % des pixels, rapport de luminance 0,0076 → 0,848 → 1,000).
  Course mesurée **35,97 px** pour **36,00** attendus ; progrès à mi-course **0,676 à 0,690** pour
  `ease-out` = **0,6846**.
- **Q2 — la descente du bandeau : A/B ? NON.** Décalages **17,00 / 14,00 / 9,00 / 0,00 px** à
  t50/t70/t100/t200 contre **17,13 / 13,51 / 8,69 / 0,00** attendus ; alpha **0,000 / 0,384 / 0,507 /
  0,691 / 1,000** contre **0 / 0,3781 / 0,5095 / 0,6846 / 1**. Le bandeau ne modifie **aucun pixel
  au-dessus de y=198** : la barre haute et tous ses textes (« CHALEUR » s'arrête à y=174) sont
  intacts, 24 px de garde. Deux recouvrements transitoires du chrome, tous deux mesurés, tous deux
  **classe C** (voir plus bas) : rien d'illisible, rien de coupé, rien hors cadre ; contraste du
  texte **à l'état final 14,05 : 1**.
- **Q3 — l'état Réduit : A/B ? NON.** Les trois captures de la bascule en Réduit sont identiques
  **par octets ET par pixels** (`pixels différents = 0`, delta max 0) et identiques à **l'arrivée du
  mode normal** (`sens1_t140ms`, 0 px d'écart) : curseur arrivé **et** couleur finale déjà posée dès
  `t0` — la tolérance « 1 frame à l'ancienne couleur » n'est même pas consommée. Bandeau : colonne
  x=250 strictement identique au repos du mode normal. Shell : centile 99,9 = **224,25** et max par
  canal **(242, 224, 217)**, soit exactement le mode normal à α = 1.

---

## Table des findings

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

**0 finding.** (Aucun `BLOQUANT`, aucun `MAJEUR`, aucun `MINEUR`.) Le compte est pris dans cette
table et nulle part ailleurs.

---

## Classe C — consignés, ni correctif ni tour (sans gravité, hors du compte)

| id | ce que c'est | mesure | pourquoi ce n'est pas A/B |
|---|---|---|---|
| `C1` | À `t50ms` et `t70ms`, le filet haut du bandeau passe sur la **pointe basse de l'anneau d'or du médaillon** | Emprise du bandeau : `y 198..272` à t50, `y 201..276` à t70, `y 206..281` à t100, `y 215..289` au repos. L'or du médaillon descend jusqu'à **y=203**. Chevauchement : **6 rangées** à t50 (x 507..572 au plus large), **3 rangées** à t70, **0** à t100 et au repos. Sur le pixel : l'or passe de `(169,136,59)` à `(145,120,71)` — voilé de ~14 %, non effacé. `mesures/11-emprise-bandeau-vs-chrome.py`, `mesures/08-recouvrement-chrome.py` | Voile translucide transitoire (~100 ms, α 0,38) sur une pointe d'arc de 3 à 6 px de haut. Aucun texte, rien de coupé — le cas que le dossier nomme explicitement « admissible ». |
| `C2` | Pendant la descente, le **losange d'or** (ornement fixe du chrome, `y 215..231`, `x 531..548`) se voit **à travers** le panneau à demi transparent et tombe sur la ligne de texte, au niveau du « : » | Losange seul : `(176,141,61)`. Sous le bandeau : `(145,116,52)` à t50, `(132,106,48)` à t70, `(51,44,31)` au repos ⇒ le bandeau est **au-dessus**, c'est sa translucidité qui laisse voir l'ornement. Le point haut du « : » déborde sur la pointe du losange de **2 rangées** (y 230-231) **à t50 seulement** ; il reste dessiné **par-dessus**, à `(186,168,134)`, plus clair que le losange. `mesures/08-recouvrement-chrome.py` | Phrase entièrement lisible ; seul le point haut d'un « : » peut se lire fondu à la pointe du losange, ~85 ms, en plein mouvement. Le recouvrement du losange **au repos** est l'état d'avant le lot (α = 1 posé d'un coup), pas un effet de L1. |
| `C3` | Pendant le fondu de `shell.entree`, les **barres** laissent passer un résidu du contenu | Barre haute : delta max **2/255** (0 pixel au-delà de 2) ; barre d'onglets : delta max **3/255** (4 758 px à 3). Témoin négatif, même mesure sur la zone contenu : 1 648 350 px. `mesures/10-gardes-et-fondu.py` + sonde collée en annexe 4 | Sous le plancher de bruit d'un aplat (6/255). Les barres **ne s'estompent pas** : un fondu rendrait des deltas de plusieurs dizaines. |
| `C4` | Asymétrie de l'aisance entre les deux sens de la bascule | Progrès à t=70 ms : sens 1 = **0,6896** (1920) / **0,6888** (2400) ; sens 2 = **0,6763** / **0,6777**. Écart au `cubic-bezier(0,0,0.58,1)` : **+0,005 / −0,008**, soit **+0,18 px / −0,30 px**. `mesures/04-course-curseur.py` | Sous la tolérance de position (2 px). Le signe opposé entre les deux sens désigne la gigue d'échantillonnage de la régie, pas une courbe fausse. |

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

1. **Échelle du dossier vérifiée sur l'image.** Piste `Px(22)` = 93,9 u ⇒ 79,2 px prédits ;
   mesurée **x 930..1008 = 79 px** (`mesures/03`, `04`). Curseur `Px(10)` = 42,7 u ⇒ 36,03 px ;
   profil brut : plein de x=970 à x=1004 avec bord partiel à 1005 ⇒ **≈ 36 px** (`mesures/03`).
2. **Course du curseur** : **35,97 px = 42,64 u** mesurés contre **36,00 px = 42,67 u** attendus,
   identique dans les 4 séries (sens 1/2 × 1920/2400). Delta **0,03 u** (`mesures/04`).
3. **Continuité du geste** : centre du curseur à `t0` = centre à `avant`, **écart 0,00 px** aux deux
   résolutions — le départ de la course est exactement là où le curseur était au repos (`mesures/04`).
4. **Token `Or`** : piste allumée mesurée **(217, 171, 77)** contre `#d9ab4e` = (217, 171, 78) ⇒ écart
   **(0, 0, −1)** (`mesures/12`).
5. **Token `Eteint`** (blanc α 0,18) : mesuré **(119, 119, 119)**, prédiction par composition
   **LINÉAIRE** sur le fond (13,13,13) = **(119, 119, 119)**, écart **(0,0,0)**. Témoin négatif : la
   prédiction sRGB naïve donne (57,57,57), à **62/255** — l'instrument discrimine les deux espaces
   (`mesures/12`).
6. **Position du bandeau au repos** : filet haut `y 215..217`, barycentre **216,50**, identique à
   1080×1920 et 1080×2400 (`mesures/07`).
7. **Alpha du bandeau** : 0,000 / 0,384 / 0,507 / 0,691 / 1,000 contre le journal 0,000 / 0,378 /
   0,509 / 0,685 / 1,000 ⇒ écart max **0,006** (`mesures/06`).
8. **Emprise horizontale du bandeau** : **x 118..961, 844 px, marges 118 / 118 px**, la même aux 4
   instants et aux 2 résolutions (`mesures/07`).
9. **Stabilité hors interrupteur** : `lum_hors` = **22,1727** (1920) et **20,1168** (2400) à
   l'identique sur les 7 captures de bascule, rapport **1,0000**, **0 pixel** changé (`mesures/02`).
10. **Réduit = arrivée du mode normal** : `reduit-bascule-course_t0/_t70ms/_t140ms` ⇔
    `bascule-course-marche-sens1_t140ms_1080x2400` : **0 pixel** d'écart ; `reduit…_avant` ⇔
    `…sens1_avant` : **0 pixel** (`mesures/09`).
11. **Réduit, bandeau** : colonne x=250 → filet `215..217 (81,83,84)`, panneau `(12,21,27)` puis
    `(15,22,28)` puis `(14,22,28)`, filet bas `288..289 (81,83,84)` — **strictement identique** au
    repos du mode normal (`mesures/13`).
12. **Réduit, shell** : centile 99,9 = **224,25** et max par canal **(242, 224, 217)**, les mêmes que
    `shell-entree_t160ms_1080x2400` (α = 1). Témoin négatif : `t80ms` donne 190,00 et (205,190,184)
    (`mesures/09`).
13. **Contraste du texte du bandeau à l'état final** : **14,05 : 1** (plancher 4,5) (`mesures/10`).
14. **Garde anti-vide** : **38 captures sur 38** au-dessus de 5 % de pixels non noirs ; la plus
    pauvre est `shell-entree_t0_1080x2400` à **14,88 %** — donc même le cas « α = 0 » que le dossier
    dispensait passe la garde, grâce aux barres qui ne s'estompent pas (`mesures/10`).
15. **Textes de la barre haute intacts** : « CHALEUR » occupe `y 160..174` ; le bandeau ne modifie
    **aucun pixel au-dessus de y=198** à aucun instant (`mesures/11` + sonde annexe 4).

---

## Lecture globale — le mouvement se lit-il comme le design le dit ?

Trois gestes, trois lectures nettes.

**`bascule.course`** : le curseur part d'où il était, parcourt la piste en 140 ms avec un
ralentissement de fin (69 % du chemin à mi-course, la signature d'un `ease-out`), et le laiton de la
piste s'allume **quand il arrive**, pas pendant. C'est exactement la phrase du catalogue — « le
curseur passe d'un bout de la piste à l'autre sous le pouce, et le laiton de la piste s'allume quand
il arrive au bout ». Et surtout : **rien d'autre ne bouge**. Zéro pixel. L'écran de réglages reste
posé ; seul l'interrupteur qu'on vient de toucher vit. C'était la question coûteuse du tour, elle est
tranchée sur les pixels, pas sur le journal.

**`bandeau.entree`** : l'annonce descend de 27,5 px en s'allumant, sur la même courbe pour les deux
canaux (le même progrès pilote y et α — vérifiable : 6,22 u et 0,378 à t50 sont le même 0,3781). Elle
reste dans son couloir (844 px, marges égales), ne touche jamais la barre haute, et se pose à sa
place. Le billet passé par-dessus le comptoir, oui. Deux frôlements du chrome pendant le passage —
la pointe de l'anneau du médaillon voilée 6 rangées, le losange qui transparaît sur la ligne de
texte — sont des effets de translucidité transitoire, pas des collisions : rien n'est caché, rien
n'est coupé, la phrase se lit d'un bout à l'autre à tous les instants capturés.

**Réduit** : le mouvement n'est pas « rapide », il est **absent**. Le curseur est au bout, la piste
a déjà sa couleur, le bandeau est à son repos, l'onglet est à pleine encre — et ce, dès le premier
instant demandé. L'identité au pixel avec l'état final du mode normal est le meilleur argument
possible : ce n'est pas « une animation très courte », c'est l'état d'arrivée.

Ce qui reste à l'image est donc du mouvement *voulu*, posé aux bons endroits, et borné : il
n'emporte ni le reste de l'écran, ni la lisibilité, ni le cadre.

---

## Ce que je n'ai PAS pu vérifier

1. **La bascule de la ligne « Tutoriels » (⑲) et celle de ㉕.** Le journal porte trois lignes
   `bascule-course-tutoriels-sens1` (x = 46,93 / 17,78 / 4,27 u) mais **aucun fichier image** : la
   colonne `fichier` y est « — ». Je n'ai donc jugé la course que sur la ligne « Marche ».
   *Ce qui trancherait* : les 3 PNG de `bascule-course-tutoriels-sens1` aux mêmes instants.
2. **Les instants non capturés.** Entre `t0` et `t50ms` le bandeau est plus haut (bord haut prédit à
   **y ≈ 189 à t0**, donc jusqu'à ~100 px de l'anneau d'or traversés) à un alpha < 0,38. Je n'ai pas
   d'image là. *Ce qui trancherait* : une capture à **t = 20 ms et t = 30 ms**. Même trou entre les
   instants de la bascule (rien entre t0 et t70) et du shell (rien entre t0 et t80).
3. **La fluidité**. Une série de PNG ne montre pas une saccade, un saut d'image ni une durée réelle :
   je constate *où tombe* chaque image figée, pas la continuité entre deux. *Ce qui trancherait* :
   une capture par frame, ou le relevé des `deltaTime` réels du banc.
4. **Ce que l'identité par octets prouve — et ne prouve pas.** Les trois captures Réduit de la
   bascule ont le même sha256 : cela prouve que **les trois images sont la même image**, donc
   qu'aucun pixel n'a bougé entre les instants demandés. Cela **ne prouve pas** (a) qu'il ne s'est
   rien passé *entre* deux instants capturés, (b) que le banc a réellement **re-rendu** la scène à
   chaque instant plutôt que d'écrire trois fois le même tampon, ni (c) à lui seul que l'état est le
   bon — ce dernier point, lui, est établi autrement : l'image est aussi au pixel près l'**arrivée du
   mode normal** (`sens1_t140ms`), et l'état `avant` diffère bien d'elle (3 130 px). *Ce qui
   trancherait pour (b)* : un témoin re-rendu à chaque capture (horloge, compteur de frame incrusté)
   ou le journal des appels de rendu.
5. **L'égalité au pixel entre Réduit et mode normal pour `shell` et `bandeau`.** Les captures
   réduites viennent d'une **autre partie** (lieutenants « Kest / Wend » et annonce « Lt. Kest attend
   vos ordres — trancher », contre « Vesk / Hara » et « Les indics parlent… »). Je n'ai pu comparer
   que des grandeurs indépendantes du contenu (filet, panneau, haut de distribution). *Ce qui
   trancherait* : des captures Réduit prises sur **la même graine** que le mode normal.
6. **Réduit à 1080×1920** : le dossier n'en fournit qu'à 1080×2400. Les 6 captures `reduit/` ne
   disent donc rien d'un reflux propre à l'autre résolution.
7. **L'alpha exact de `shell.entree` à t80.** Mon estimateur d'encre rend **0,721 / 0,724** quand le
   journal écrit 0,685. L'écart est un **biais de modèle** (un empilement de couches translucides
   n'est pas linéaire en α, mon modèle à une couche l'est) et non un écart mesuré : la lecture
   indépendante en luminance moyenne donne un rapport **0,848 = 0,685^(1/2,2)**, exactement ce
   qu'attend une composition linéaire ré-encodée. Je certifie donc seulement ce que la doctrine
   demande — **monotone, borné, 0 au début, 1 à la fin** — pas la troisième décimale.
8. **Les cas de collision et d'interruption** : seconde annonce pendant l'entrée, `bandeau.sortie`
   lancée pendant `bandeau.entree`, montage interrompu, refus de piste au plafond (handle nul).
   Aucun n'est capturé ; ce sont des comportements, pas des images.
9. **Le cold-open et les surimpressions** (exclusions écrites du catalogue), ainsi que les **9 classes
   de capture à identifiants** — limite assumée du dossier, non rouverte.
10. **L'interactivité pendant les 160 ms** (l'écran invisible reste cliquable, consigné au design §1) :
    invisible par construction sur une image.

---

## Écarts ASSUMÉS — inventoriés, rendus proprement

| écart assumé | ce que montrent les pixels |
|---|---|
| La sortie de l'écran précédent n'est pas animée | `shell-entree_t0` : la zone contenu est à `lum = 0,2268` (rapport 0,0076 au final) — l'ancien écran a disparu **d'un coup**, sans fantôme ni rémanence. 1 903 793 px séparent `avant` de `t160ms` : ce sont bien deux écrans différents (`mesures/02`). |
| Pas de translation sur `shell.entree` (fondu seul) | La bbox du diff `t0→t80` couvre toute la zone contenu (`0,143,1079,1739`) sans décalage de bord : aucun glissement, seulement une montée d'encre (`mesures/01`). |
| La couleur de la piste n'est pas animée, posée à l'arrivée | Sens 1 : piste `Or (217,171,77)` à `t0` **et** `t70ms`, `Eteint (119,119,119)` à `t140ms`. Sens 2 : l'inverse exact. Aucun état intermédiaire de couleur (`mesures/12`). |
| Sous Réduit, une image à ancienne couleur est admise (1 frame) | **Non consommée** : à `t0` la piste porte déjà `(119,119,119)`, la couleur d'arrivée (`mesures/09`). |
| Polices de chrome substituées | Arbitrage de substitution, hors de ce tour borné ; aucune mesure typographique faite. |

---

## Hors périmètre

Rien de nouveau et grave vu en passant. (Signalé pour mémoire, sans tour : la barre d'onglets laisse
filtrer jusqu'à 3/255 du contenu pendant le fondu — `C3` ci-dessus.)

---

## Annexes

### 1. Correspondance des repères (échelle, offsets) — établie au dossier, vérifiée sur l'image

| grandeur | source | valeur | vérification sur les pixels |
|---|---|---|---|
| 1 u de canvas | dossier (1280 u ↔ 1080 px) | 0,84375 px | piste 93,9 u → 79,2 px prédits, **79 px** mesurés |
| 1 u du canal du bandeau | dossier (`TopBarEchelle` ×3,265) | 2,755 px écran | 6,22 u → 17,14 px prédits, **17,00 px** mesurés |
| course totale du curseur | catalogue (42,67 u) | 36,00 px | **35,97 px** mesurés |
| piste de l'interrupteur « Marche » | — | — | x **930..1008**, y **935..977** (1920) ; y **947..989** (2400) |
| repos du filet haut du bandeau | — | — | y **215..217**, barycentre **216,50**, aux deux résolutions |
| losange d'or (chrome) | — | — | y **215..231**, x **531..548** |
| anneau d'or du médaillon | — | — | or jusqu'à **y=203** |
| « CHALEUR » (barre haute) | — | — | y **160..174** |

L'axe Y de 1080×2400 est décalé de **+12 px** par rapport à 1080×1920 pour la ligne « Marche »
(contenu centré sur une hauteur utile plus grande) ; les grandeurs du chrome haut, elles, sont
**identiques** aux deux résolutions (ancrage au bord haut) — ce que confirment les mêmes y de filet
(216,50) et la même emprise (118..961).

### 2. Inventaire — ce que montrent les captures

- **Écran de réglages ⑲** (`bascule-*`) : barre haute (ARGENT / 10 000 € / médaillon « Froid ·
  CHALEUR » / JOUR 1 · Aube), losange, titre « LES RÉGLAGES », deux cartes de langue (Français
  `.actif` cerclé d'or, English au repos), trois lignes à interrupteur (« On vous explique encore »
  allumé, « Dire mes prix au marché » = la ligne **Marche** animée, « Mouvement réduit » éteint), CTA
  « FERMER LE COFFRE », deux boutons en pointillés désactivés, barre d'onglets à 4 médaillons
  (PLUS souligné). **Seul l'interrupteur de la ligne « Marche » change entre les instants.**
- **Écran Famille** (`shell-*`, `bandeau-*`) : même chrome, titre « LA FAMILLE », « 2 LIEUTENANTS »,
  carte « Vous / LE DON », deux cartes de lieutenant avec rail or, deux bulles de conseil, CTA
  « Recruter un nouveau lieutenant ». Le bandeau éphémère s'insère **entre le losange et le titre**.
- **Captures `reduit/`** : même chrome, autre partie (« Lt. Kest / Lt. Wend », annonce « Lt. Kest
  attend vos ordres — trancher »).

### 3. Scripts — `mesures/*.py`

Chacun imprime la **taille de chaque image ouverte** (toutes 1080×1920 ou 1080×2400, celles du
dossier) et porte son contrôle positif et négatif.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `01-diff-bbox.py` | bbox et compte des pixels qui diffèrent entre deux captures | + : fondu `shell` t0→t80 = 82,18 % des px, bbox 1080×1597 · − : image contre elle-même = 0 px |
| `02-stabilite-hors-interrupteur.py` | luminance moyenne du contenu **hors** interrupteur + pixels changés hors du rectangle, sur **tout** le cadre | + : `shell` t0/t80/t160 → rapports 0,0076 / 0,848 / 1,000 · − : même image → 1,0000 et 0 px |
| `03-profil-interrupteur.py` | lecture BRUTE, pixel par pixel, de l'interrupteur (pose les repères) | lecture nue, sans verdict |
| `04-course-curseur.py` | position sous-pixel du curseur (barycentre de couverture), largeur, piste | + : largeur de piste 79 px / curseur ≈ 36 px · − : centre(avant) vs centre(t140) = 35,97 px |
| `05-profil-bandeau.py` | lecture BRUTE de la colonne x=250 (pose les repères du bandeau) | lecture nue, sans verdict |
| `06-descente-bandeau.py` | alpha apparent par l'encre en luminance **linéaire** | + : t200 → 1,000 · − : t0 → 0,000. **Son estimateur de POSITION a été REJETÉ** (voir 07) |
| `07-position-bandeau.py` | **remplace** l'estimateur de position de 06 : filet haut sous-pixel | + : retombe sur la lecture brute de 05 (198/201/206/215) · − : ABSENT sur l'écran sans bandeau |
| `08-recouvrement-chrome.py` | médaillon, losange, bande de texte, glyphe recouvert | + : le losange s'assombrit au repos (0,36× le fond) · − : fond contre lui-même |
| `09-reduit.py` | identité octets + pixels des captures Réduit, curseur, piste, bandeau, shell | + : t160 normal = Réduit sur le haut de distribution · − : t80 (α 0,685) nettement plus bas ; `avant` vs `t0` = 3 130 px |
| `10-gardes-et-fondu.py` | garde anti-vide, fondu `shell`, barres, contraste final | + : encre t160 → 1,000 · − : encre t0 → 0,000 ; zone contenu = 1 648 350 px |
| `11-emprise-bandeau-vs-chrome.py` | bbox du bandeau ligne par ligne contre le fond sans bandeau | + : au repos la bbox démarre à y=215 (valeur trouvée indépendamment par 07) · − : fond vs fond = pas de bbox |
| `12-couleurs-piste.py` | tokens `Or` et `Eteint`, et **quand** la couleur change | + : `Or` à (0,0,−1) du token · − : prédiction sRGB naïve à 62/255 |
| `13-reduit-bandeau-detail.py` | paliers de la colonne x=250 du bandeau Réduit | + : `t200ms` (repos) · − : `t70ms` (α 0,507, décalé de 14 px) |

Images de travail (recadrages ×3 et ×8 de la zone du « : ») : `mesures/vues/`.

### 4. Sondes collées (sorties brutes non reprises par un script dédié)

**Les barres pendant le fondu** (`shell-entree_t0` vs `t160ms`, 1080×1920) :

```
t0 (1080, 1920)
t160 (1080, 1920)
barre haute    delta max=2  px delta>=1 : 98619  px delta>2 : 0  exemple (518, 28, (41, 34, 29), (43, 34, 29))
barre onglets  delta max=3  px delta>=1 : 155815  px delta>2 : 4758  exemple (0, 1740, (9, 13, 23), (12, 16, 25))
```

**Position de « CHALEUR »** (sur `bandeau-entree_t0_1080x1920`, écran sans bandeau) :

```
fond (1080, 1920)
lignes avec encre CLAIRE (max canal>=90) dans x 440..640 :
   y=160 :  4 px, x 498..501
   ...
   y=174 : 43 px, x 497..586
```

**sha256 des captures** (extrait des identités qui portent le verdict Q3) :

```
14e457d9ceb6b41c05ba58467051c837412d03f2342ffed0a83638f867c894e2  bascule-course-marche-sens1_avant_1080x1920.png
14e457d9ceb6b41c05ba58467051c837412d03f2342ffed0a83638f867c894e2  bascule-course-marche-sens1_t0_1080x1920.png
14e457d9ceb6b41c05ba58467051c837412d03f2342ffed0a83638f867c894e2  bascule-course-marche-sens2_t140ms_1080x1920.png
8d4c746152d2effbee07c24d085697bd73203771be1380ebf135de22b34e193a  bascule-course-marche-sens1_t140ms_1080x2400.png
8d4c746152d2effbee07c24d085697bd73203771be1380ebf135de22b34e193a  reduit/reduit-bascule-course_t0_1080x2400.png
8d4c746152d2effbee07c24d085697bd73203771be1380ebf135de22b34e193a  reduit/reduit-bascule-course_t70ms_1080x2400.png
8d4c746152d2effbee07c24d085697bd73203771be1380ebf135de22b34e193a  reduit/reduit-bascule-course_t140ms_1080x2400.png
73b82383bf798f9c134db74f0d3329fdb02e58fb581b66cbb7ce0ceff4f339bd  bascule-course-marche-sens1_avant_1080x2400.png
73b82383bf798f9c134db74f0d3329fdb02e58fb581b66cbb7ce0ceff4f339bd  reduit/reduit-bascule-course_avant_1080x2400.png
62ed781b2f7856252f8e4e1efd5163ab0291dae82daedaa2552a3d01f02a374f  shell-entree_t160ms_1080x1920.png
62ed781b2f7856252f8e4e1efd5163ab0291dae82daedaa2552a3d01f02a374f  bandeau-entree_t0_1080x1920.png
```

La dernière paire justifie le choix du **fond de référence** des scripts 06/08/11 :
`bandeau-entree_t0` est, octet pour octet, l'écran de `shell-entree_t160ms` — donc l'écran **sans
bandeau**, ce que confirme l'encre nulle mesurée au script 06.

---

## Auto-audit du verdict

Je certifie avoir ouvert et mesuré **moi-même** chaque fichier cité : les 32 PNG de `captures/`, les
6 de `captures/reduit/`, `captures/journal.tsv`, `reference/catalogue-extrait.md` et
`reference/design-l1.md`. Aucun chiffre de ce rapport ne vient du journal sans avoir été **retrouvé
sur les pixels** : les alphas du bandeau (0,384 / 0,507 / 0,691), les décalages (17 / 14 / 9 px) et
les positions du curseur (987,72 / 962,92 / 951,75 px) sont des mesures d'image, le journal n'ayant
servi que de valeur à confronter. Je n'ai lu ni le code du client, ni les notes d'implémentation, ni
aucun rapport de juge antérieur, ni le répertoire `fin-lot-2026-11-11` — interdits par le dossier.
Un estimateur que j'avais écrit (`06`, position du filet) a été **rejeté par son propre témoin** et
remplacé par `07` plutôt que corrigé à la main ; les deux scripts restent dans `mesures/`, le rejet
est écrit dans l'en-tête de `07`. Le verdict APPROUVÉ repose sur une table de findings **vide**, et
ce compte est pris dans la table, pas dans ce paragraphe.
