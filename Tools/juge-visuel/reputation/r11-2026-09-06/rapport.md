# Juge visuel ⊥ — ㊲ La réputation (« le miroir ») — r11 — 2026-09-06

## Verdict : NON APPROUVÉ

Le contenu est bien plus proche de la maquette qu'au tour précédent (F3 axe du buste, F6 interligne
du paragraphe, F8 largeur des tuiles, F11 longueur de la bouche : fermés, mesurés), mais l'ancrage
« en bas » livré fait passer **141 px du cadre SOUS le bandeau au 1080×1920**, où le titre « Le miroir »
tombe à **2,45:1** de contraste et perd **41 % de ses colonnes** sous le médaillon du manomètre.

---

## Convention de bord — déclarée

- **Par défaut : NOMINALE, à mi-alpha.** Un pixel appartient au trait (ou à une borne de bloc) dès que
  sa couleur a franchi la **moitié** du chemin entre le fond local et le cœur du trait. C'est la
  convention de `m01`, `m12`, `m13`, `m16`, `m22`, `m23`, `m27`, `m28`, `m38`, `m41`.
- **Exception déclarée, pour la GRAISSE des glyphes seulement** (`m26`, `m37`) : **cœur opaque au
  seuil** — `L1 ≤ 20` du jeton d'encre, ou `lum > fond + 55 % de l'amplitude`. Motif : la référence
  porte un halo (F5) qui, à mi-alpha, gonflerait le fût mesuré du côté référence et **fabriquerait**
  l'écart que je cherche. Les deux conventions concordent en sens et en ordre de grandeur sur les
  chiffres : 8 → 6 px (cœur strict) et 10 → 7 px (55 % de l'amplitude).
- **Le haut du dock est mesuré à l'ENCRE** (première rangée portant un pixel du liseré d'onglet),
  pas au rect du composant : la gouttière basse réelle est donc ≤ 70 px (cf. § 6).

## Correspondance des repères

| | origine du cadre (coin haut-gauche du filet or) | hors-tout | échelle |
|---|---|---|---|
| `reference-1080x2102.png` | (21, 452) | 1038 × 1627 px | ×3,6 |
| `capture-1080x2400.png` | (18, 482) | 1044 × 1628 px | ×3,6 |
| `capture-1080x1920.png` | (18, **2**) | 1044 × 1628 px | ×3,6 |

Rapport capture ÷ référence = **1,00** (dossier § Échelle) ⇒ toute comparaison de contenu se fait en
px bruts. Les deux captures sont **le même contenu décalé de 480 px exactement** : 11 909 px
différents (1,5 %) à Δy = 480 contre 51 263 et 51 288 à Δy = 479 et 481 (`m04`) — contrôle
discriminant. Toutes les coordonnées « local » ci-dessous sont relatives à l'origine du cadre.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence | jeu | Δ | script |
|---|---|---|---|---|---|
| P1 | hauteur du cadre, filet à filet | 1627 px | 1628 px | 1 px (0,06 %) | `m01`/`m12` |
| P2 | gouttière basse cadre → première encre du dock | — | **70 px aux DEUX résolutions** (1699−1629 · 2179−2109) | 0 px | `m03`/`m12` |
| P3 | carte portrait (filet doré) | 424 × 656 px | 425 × 658 px | ≤ 2 px | `m19` |
| P4 | **axe du buste** : carte · visage · col · torse · yeux | 272,5 · 272,5 · 272,0 · 272,0-272,5 · 247,5/297,0 | 272,0 · 272,0 · 272,5 · 272,0-272,5 · 247,0/297,5 | ≤ 0,5 px — **F3 fermé** | `m19`/`m29`/`m30`/`m32` |
| P5 | gouttière carte → tuiles | 37 px | 37 px | **0 px** | `m28` |
| P6 | marge tuile → bord droit du panneau | 30 px | 29 px | 1 px | `m28` |
| P7 | 10 aplats (cadre, `.elast`, tuile, compteur, carte, panneau bas, CTA, enseigne, filet or, torse) | — | — | **≤ 6/255 partout**, filet or à **1/255** | `m40` |
| P8 | contraste WCAG de 11 textes (libellé compteur +0,01 · LT. +0,12 · « Il vous écoute » +0,15 · titre du panneau +0,15 · paragraphe +0,11 · CTA +0,22 · titre 11,83→11,55) | — | — | **≤ 0,38 partout** | `m34`/`m06` |
| P9 | couche globale, couverture des 4 premières couleurs de palette | 90,22 · 2,97 · 2,37 · 1,95 % | 90,19 · 2,98 · 2,52 · 1,84 % | ≤ 0,15 pt | `m33` |
| P10 | sous-titre de l'enseigne : couleur · capitale · largeur d'encre | (185,173,146) · 17 px · 775 px | (185,173,146) · 17 px · 768 px | 0/255 · 0 px · −0,9 % | `m35` |
| P11 | chiffres des compteurs : hauteur de capitale · couleur | 37 px · (127,212,217) | 37 px · (127,212,217) | 0 px · 0/255 | `m26` |
| P12 | **interligne du paragraphe** du panneau bas | 32 · 33 px | 33 · 32 px | 1 px — **F6 fermé sur le paragraphe** | `m15` |
| P13 | **tuiles, largeur** · gouttières entre tuiles | 456 px · 14/15/15 | 463 px · 17/14/15 | +1,5 % (0,7 % du parent) — **F8 refermé** | `m16`/`m28` |
| P14 | cou · **longueur de la bouche** | 9,84 u · 10,75 u | 10,23 u · 10,78 u | 0,39 u · **0,03 u — F11 fermé sur la longueur** | `m29`/`m30` |
| P15 | torse : largeur max · gant hors du torse | 74,01 u · 0 px dehors | 74,20 u · **0 px dehors** | +0,26 % · 0 | `m32` |
| P16 | position du balayage teal dans le panneau | 30,8 % | 28,6 % | 2,2 pt — tiers haut des deux côtés | `m27` |
| P17 | boîtes des compteurs, largeur · écarts | 312 px · 23 px | 312 px · 25 px | 0 px · 2 px | `m26` |
| P18 | titre « Le miroir » : largeur d'encre · hauteur de capitale | 416 px · 48 px | 421 px · 46 px | +1,2 % · −4,2 % | `m06` |
| P19 | inventaire des parties | 1 enseigne · 3 compteurs · 1 panneau élastique (carte + 4 tuiles + balayage) · 1 panneau bas · 1 CTA | idem | **rien EN TROP, rien ABSENT** (hors la section « gages », voulue) | `m13`/`m39` |
| P20 | hauteur des lignes de texte des tuiles (capitale ligne 1 · ligne 2) | 21 px · 15 px | 21 px · 15 px | 0 px | `m18` |

---

## 0. L'écran, tel que la maquette le dit

**But.** Un miroir : le joueur vient lire ce que son lieutenant a *absorbé* des règles qu'on lui a
données. Ce n'est pas un tableau de bord, c'est **un portrait** — on se lit sur quelqu'un.

**Ordre de lecture.** (1) le titre sérif doré « Le miroir », seul élément doré et le plus grand ;
(2) la rangée des **trois compteurs cyan**, les seules taches froides et lumineuses de l'écran —
elles disent l'état en un coup d'œil ; (3) le **portrait** dans son cadre doré, à gauche, avec son
verdict vert « Il vous écoute » ; (4) la colonne des **quatre indices de tenue** à droite ;
(5) le panneau d'explication en bas ; (6) le CTA doré, qui ferme.

**Zones.** enseigne (titre + sous-titre + filet or) · rangée de 3 compteurs · panneau élastique
(carte-portrait à gauche, en-tête + 4 tuiles à droite, ligne de balayage teal en travers du tiers
haut) · panneau d'explication · bouton d'appel à l'action.

**Traits d'identité** — les cinq choses qui font que c'est *cet* écran :
(a) l'**or** du filet et du titre sur un bleu nuit presque noir ;
(b) les **chiffres cyan qui rayonnent** — c'est un instrument, pas un texte ;
(c) le **buste** casqué de cheveux, face pleine, col ouvert en triangle clair ;
(d) le **cadre doré autour du portrait**, plus étroit que le reste, qui isole la personne ;
(e) la **ligne de balayage teal** qui traverse le tiers haut du panneau — le « miroir » qui balaie.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

**Au 1080×2400 (cible), oui, à deux réserves fortes.** Le but, l'ordre de lecture et les zones sont
les mêmes ; palette (≤ 0,15 pt de couverture), aplats (≤ 6/255) et contrastes (≤ 0,38) sont tenus.

Ce qui a changé dans ce qu'un joueur perçoit, dans l'ordre de l'impact :

1. **Le lieutenant n'est pas le même homme.** La calotte de cheveux, qui dans la maquette enveloppe
   la tête et encadre le visage sur **21 px de chaque côté**, n'en encadre plus que **1 px** : le
   visage arrive au bord du crâne, et la calotte devient un bonnet posé dessus, séparé par un
   **creux de 28 px** (contre 6 px). C'est le trait d'identité (c) — et l'écran est un portrait.
2. **Les chiffres ne rayonnent plus, et toute la typographie grasse a maigri.** Le halo de la
   maquette (+17,2 de luminance encore à 6 px) est **exactement absent** (0,00 à toute distance
   ≥ 2 px), et tous les éléments gras perdent 20 à 33 % de fût (chiffres 10 → 7 px, CTA 6 → 4 px)
   pendant que le texte courant, lui, ne bouge pas (2 → 2 px). L'écran lit plus **plat** et plus
   **froid** : c'est le trait d'identité (b), et la hiérarchie gras/maigre s'aplatit.
   Densité d'encre globale : 14,68 % → **12,86 %** (−12,4 %).
3. **Le tiers bas de la colonne de droite est vide, et le tiers haut de l'écran aussi.** Sous la
   pile de tuiles il reste **245 px** de panneau nu (contre 167), et entre le bandeau et le cadre
   il reste **339 px** de vide : le cadre n'occupe plus que **80 %** de la zone libre, contre
   **97,5 %** dans la maquette (434 px d'évocation de chrome, valeur du dossier). L'écran est le même, mais il flotte.

**Au 1080×1920, non.** Le cadre est ancré en bas, sa hauteur est fixe, et la zone libre n'est plus
assez haute : il déborde **de 141 px sous le bandeau**. Le titre — la première chose que l'œil doit
rencontrer — est assombri à **2,45:1** (sous le plancher de 3:1) sur 61 % de son encre et
**remplacé par le médaillon du manomètre** sur les 39 % restants. L'écran ne se lit plus comme la
maquette : son premier repère a disparu.

---

## 3. Écarts

**Gravité** : `BLOQUANT` · `MAJEUR` · `MINEUR` (liste fermée). ASSUMÉ et ARBITRAGE sont dans des
tables à part et ne sont pas comptés ici. **Critère** : `DÉJÀ APPLIQUÉ` si la grandeur figure dans
`grandeurs-r10.md`, `NOUVEAU` sinon.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F15` | BLOQUANT | NOUVEAU | non | **1080×1920 — le cadre déborde sous le bandeau.** Ancré en bas avec 70 px de gouttière, hauteur fixe 1628 px : il lui faut 1698 px, la zone libre n'en offre que 1556. Le débord tombe entièrement sous le bandeau. | haut du cadre local y = **2** ; bas du bandeau y = **143** ⇒ gouttière haute **−141 px**. Zone libre 143..1699 = **1556 px** ; besoin **1698 px** ; manque **142 px**. Rail or gauche invisible de y 2 à 142, assombri à (58,46,33) au lieu de (176,141,61). Au 2400 les mêmes bornes donnent +339 px. (`m01`,`m05`,`m12`) | si le cadre est *clippé* ou seulement *recouvert* : l'image ne montre que le composé. Il commence à y=2, donc il n'est pas rogné au ras du canvas. |
| `F16` | BLOQUANT | NOUVEAU | non | **1080×1920 — le titre « Le miroir » est illisible et amputé.** Le bandeau translucide l'assombrit ; le médaillon du manomètre, opaque, en efface le milieu. | sur les 4 092 px de glyphe repérés au 2400 : **0 % intacts**, **61,3 % assombris** à (98,82,48) ⇒ contraste **2,45:1** (contre **11,55:1**), **38,7 % remplacés par du chrome**. **101 colonnes sur 248 (41 %)** entièrement recouvertes, de x=476 à x=614. Encre du chrome sur le glyphe : (104,143,147) et (156,92,84) là où le 2400 rend (242,201,106). (`m08`,`m09`,`m10`,`m11`) | — |
| `F2` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Calotte : la forme livrée ne porte pas les nombres de la maquette.** Le rectangle arrondi atteint sa pleine largeur trop haut, se creuse d'un coup à la jonction, et ne laisse plus de bandeau de cheveux sur les côtés du visage. | **N4 épaisseur latérale à 15 % de la hauteur du visage : 21 px → 1 px** (÷21) · **pincement du crâne : creux de 6 px (95,9 % du max) → 28 px (81,8 %)**, ×4,7 · **N3 hauteur d'attache : 116 px → 92 px** (−21 %) · **N5 courbure du bord bas (sagitta sur ±0,9 de la demi-largeur) : −20,5 px → −12,0 px** (−41 %) · **N1 calotte max ÷ tête max : 0,967 → 1,000** · **N2 à la jonction : 0,967 → 0,948**. Contexte : visage 117 → 121 px de haut, yeux 5,5 px plus haut, sommet de la tête 8 px plus haut. (`m21`,`m22`,`m23`,`m41`) | le mécanisme : je constate la forme rendue, pas comment elle est produite. |
| `F5` | MAJEUR | DÉJÀ APPLIQUÉ | non | **La lueur interne des chiffres cyan est absente**, pas atténuée : nulle. | excès de luminance autour de l'encre cyan, par distance de Chebyshev — réf : +27,3 (d=2) … **+6,07 (d=14)** ; jeu : **+0,00 à toute distance de 2 à 14**, et à d=6 le min ET le max valent 13,65 (aplat parfait). Détecteur contrôlé : nombres de px comparables des deux côtés à chaque distance (411/414, 408/414, 406/411…). (`m24`,`m25`) | le halo de la pastille **allumée** (`box-shadow 0 0 7px`) : les 4 tuiles sont éteintes dans l'état capturé. |
| `F14` | MAJEUR | NOUVEAU | non | **Tout ce qui est GRAS dans la maquette est rendu 20 à 33 % plus maigre ; le texte courant, lui, est identique.** Largeurs et hauteurs d'encre sont pourtant conservées ⇒ c'est la graisse, pas la taille. | fût médian (cœur au seuil) : chiffres **10 → 7 px (−30 %)** · CTA caps **6 → 4 (−33 %)** · sous-titre caps **4 → 3 (−25 %)** · « RÈGLES DONNÉES » **5 → 4 (−20 %)** · « col ouvert » **5 → 4 (−20 %)** · titre sérif du panneau **8 → 7 (−12,5 %)** — contre **2 → 2** pour « la comptabilité tenue » et le paragraphe. Confirmé par le compte d'encre à bbox égale : 0,77 à 0,88 sur les gras, **0,99** sur le paragraphe. Chiffres au cœur strict : runs [8,8,8,8] → [6,6,6,6]. (`m25`,`m26`,`m36`,`m37`) | l'origine : fonte Bold absente, poids ignoré, ou réglage de rendu — non décidable depuis l'image (cf. § 6). |
| `F1` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le pied du panneau élastique est plus vide**, surtout à droite ; les deux colonnes ne finissent plus ensemble. Aucune boîte fantôme : c'est du vide. | vide sous la pile de tuiles : **167 → 245 px (+47 %)**, soit 22 % → **31 %** de la hauteur du panneau ; vide sous la carte : **81 → 97 px (+20 %)**. Décomposition exacte du +78 px : en-tête de la colonne droite **150 → 123 px (−27)** + pile de 4 tuiles **447 → 414 px (−33)** + `.elast` **766 → 784 px (+18)**. 0 liseré entre local 930 et 1175 (aucune boîte vide). (`m13`,`m14`,`m16`) | — |
| `F22` | MAJEUR | NOUVEAU | non | **1080×2400 — 339 px de vide entre le bandeau et le cadre.** Le cadre, à hauteur fixe et ancré en bas, ne remplit plus la zone libre. | gouttière haute **+339 px** (cadre y=482, bandeau y=143) ; le cadre occupe **1628 / 2036 = 80,0 %** de la zone libre, contre **1627 / 1668 = 97,5 %** dans la
maquette (les 434 px d'évocation de chrome de la référence sont **donnés par le dossier**, non
remesurés ici : ma dernière rangée d'encre claire au-dessus du cadre est à y = 218, la silhouette de
ville qui suit étant trop sombre pour mon seuil). Gouttière basse 70 px (3,4 %). (`m12`) | la valeur réelle de `ShellChrome.TopInsetPx` (le rect du run n'est pas fourni) : j'ai mesuré le bas du bandeau sur l'image (filet or plein largeur, y 138..142). |
| `F6b` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'interligne n'a été posé que dans le panneau bas ; l'en-tête de la colonne droite reste serré.** | « Pas encore / jugeable » (sérif) : interligne **42 → 35 px (−16,7 %)** ; « ce qu'il a / absorbé de vos / règles » : **30/30 → 27/27 px (−10 %)**. Le paragraphe du panneau bas, lui, est conforme (32/33 → 33/32). (`m15`) | — |
| `F17` | MINEUR | NOUVEAU | non | **Les tuiles sont 9 px plus courtes** : le rembourrage interne a fondu, la capitale et l'interligne non. | hauteur de tuile **101/101/100/101 → 92/91/93/92 px (−8,9 %)** ; pas haut-à-haut **115/116/115 → 109/105/108** ; rembourrage haut **25 → 22 px**, bas **26 → 21 px** ; capitales 21/15 px des deux côtés, interligne 35 → 34 px. (`m16`,`m18`) | — |
| `F4` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le col (triangle) est nettement plus grand** et mord davantage sur le bas du cou. | **11,12 × 11,12 u → 14,25 × 13,71 u (+28 % / +23 %)** ; remplissage aire/boîte 0,405 → 0,392 (c'est toujours un triangle) ; recouvrement du cou **2 → 11 rangées**. (`m19`,`m29`,`m42`) | — |
| `F11` | MINEUR | DÉJÀ APPLIQUÉ | non | **La bouche est plus fine** (la longueur, elle, est fermée). | hauteur d'encre **2,55 u → 2,19 u (−14 %)** ; longueur 10,75 → 10,78 u ; centre identique (275,0 ; 751,5) des deux côtés. (`m30`) | — |
| `F12` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le gant est plus grand et décalé vers la droite.** | **8,57 × 5,47 u → 9,50 × 6,03 u (+11 % / +10 %)** ; centre (168,0 ; 938,5) → (175,5 ; 936,0), soit **+7,5 px en x**, −2,5 px en y ; toujours **0 px hors du torse**. (`m31`) | — |
| `F7` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le CTA est 7 px plus bas de hauteur** et sa bordure 1 px plus épaisse ; le texte est identique. | boîte **1500..1594 (95 px) → 1507..1594 (88 px), −7,4 %** ; bordure haute **3 → 4 px** ; texte 29 px de capitale des deux côtés, largeur d'encre 610 → 607 px. (`m38`) | — |
| `F13` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'enseigne est 6 px plus courte** ; le filet or remonte d'autant. | bloc **29..217 (189 px) → 29..211 (183 px), −3,2 %** ; filet or sous l'enseigne local **211..217 → 205..211**. Conséquence en cascade sur les blocs suivants : compteurs −5, `.elast` −4, carte −4. (`m13`,`m27`) | — |
| `F18` | MINEUR | NOUVEAU | non | **La ligne de balayage teal est un tiers plus longue** et déborde des deux côtés du panneau ; sa position, elle, est bonne. | **x 185..852 (668 px) → x 68..953 (886 px), +32,6 %** ; épaisseur 8 → 7 px ; position 30,8 % → 28,6 % de la hauteur du panneau. (`m27`) | — |
| `F19` | MINEUR | NOUVEAU | non | **Le cadre est 6 px plus large hors-tout, son filet 1 px plus épais, et il colle 3 px plus près du bord de l'écran.** | filet **3 → 4 px** ; hors-tout **1038 → 1044 px (+0,6 %)** ; intérieur 1032 → 1036 px ; marge à l'écran **21 → 18 px** à gauche comme à droite. (`m01`,`m38`) | — |

**Compte : 16 findings — 2 BLOQUANT, 5 MAJEUR, 9 MINEUR.**
Aucun ne dépend des données : tous portent sur la géométrie, la typographie, la palette ou le rythme.
(Les observations qui dépendent des données sont dans la table ARBITRAGE, en fin de section.)

### Écarts ASSUMÉS — vérification qu'ils sont rendus proprement

| ce qu'on voit | ce qui le ferait SORTIR de l'assumé | mesuré | verdict |
|---|---|---|---|
| compteur ENFREINTES à « — » | que le tiret n'ait ni la couleur ni la position des deux autres chiffres | couleur **(127,212,217)**, exactement celle des chiffres · centré en x à **858,0** pour une boîte centrée à **857,5** · 47 × 4 px · centre vertical **289,5** contre **285,0** pour les chiffres, soit 4,5 px plus bas (`m26`) | **rendu proprement** — le trou se lit comme un trou |
| col rendu par un TRIANGLE plein | remplissage ~0,9 au lieu de ~0,43 · non centré sur l'axe du cou · recouvre le cou | remplissage **0,392** (réf 0,405) · centre x **272,5**, cou centré à **272,5** · recouvrement du cou **11 rangées** contre **2** en réf (`m19`,`m29`,`m42`) | **rendu proprement**, réserve sur le recouvrement — la taille du triangle est traitée à part (F4) |
| reflet du miroir FIXE | absent, ou ailleurs que dans le tiers haut du panneau | présent, à **28,6 %** de la hauteur du panneau (réf 30,8 %) (`m27`) | **rendu proprement** — la fixité n'est pas vérifiable ici (§ 6) |
| 4 couleurs hors `DesignTokens` | que la couleur RENDUE s'écarte de la maquette | 10 aplats à **≤ 6/255**, filet or à **1/255**, jetons d'encre identiques (`m40`) | **rendu proprement** |
| nom du lieutenant = celui du compte | « SALVATORE » en dur, ou la mention « non projeté » encore visible | « **LT. ROOK, VOTRE LIEUTENANT** » ; la légende `lieutenant.name — non projeté (L0.4)` de la maquette est **absente** en jeu (`cmp_carte.png`) | **rendu proprement** |
| pas de section « gages » | une place réservée vide | aucun liseré entre local 930 et 1175 dans la colonne droite (`m14`) | **rendu proprement** |
| ligne de balayage teal présente, fixe | absente, animée, ou ailleurs que dans le tiers haut | présente, tiers haut (`m27`) | **rendu proprement** — sa **largeur** sort du périmètre de l'assumé et va en F18 |

### ARBITRAGES — non corrigibles côté client, ou hors du périmètre de l'écran

| sujet | mesure | pourquoi c'est un arbitrage |
|---|---|---|
| famille du titre sérif | la maquette demande `Georgia` ; `fc-match` sur la machine de rendu répond **Noto Serif** ; le client embarque **DejaVu Serif**. Hauteur de capitale **48 → 46 px (−4,2 %, dans la tolérance)**, largeur d'encre **416 → 421 px (+1,2 %)** (`m06`) | `Georgia` n'a jamais été montrée à personne (dossier § Polices) : l'écart de famille s'arbitre, il ne se corrige pas |
| bandeau non alimenté | le bandeau affiche « JOUR 50 » et un **tiret** à la place de la phase du jour (la maquette dit « JOUR 12 / Matin ») | doctrine « chrome non alimenté » : le rapport le dit et **ne juge pas le chrome** |
| libellés anglais de la RÉFÉRENCE | la maquette écrit `HEAT` dans le manomètre et `$ 24 850` ; le client écrit **CHALEUR** et **9 627 820,00 €** | ruling « fr réel » : le client a raison, **la maquette est à mettre à jour** — noté une fois, jamais compté comme écart d'écran |
| valeurs affichées (dépend des données) | nom `ROOK` contre `HARA` · solde · JOUR 50 contre 12 · les 3 compteurs à 00/00/— des deux côtés | observation datée sur le compte de démo ; la comparaison de VALEUR reste non vérifiée faute du journal du run (§ 6) |

---

## 5. Autres résolutions

**1080×2400 (cible, 20:9) — tient**, aux écarts de la table ci-dessus. Rien de coupé, rien hors
cadre, rien qui déborde de son parent : le cadre vit entre y 482 et 2109, soit à l'intérieur de la
zone libre 143..2179. Gouttière basse 70 px.

**1080×1920 (16:9) — ne tient pas.** C'est la même mise en page décalée de 480 px (contrôle `m04`),
donc aucun reflux : le bloc, à hauteur fixe et ancré en bas, sort par le haut.
- **141 px du cadre passent sous le bandeau** (F15) ; le rail or gauche n'est visible qu'à partir de
  y = 143, assombri à (58,46,33) au lieu de (176,141,61).
- Le chrome recouvre du contenu **jusqu'à y = 239**, soit **96 px sous son propre filet** (le halo du
  médaillon) : 53 001 px de contenu altérés entre y 0 et 239, contre **0** partout ailleurs
  (contrôle à y 800..899 et y 1600..1689 : 0/102 000 et 0/91 800) — `m07`.
- L'enseigne entière (titre + sous-titre) est dans cette bande : le titre est détruit (F16) et le
  sous-titre « UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ » (local 143..182, soit y 145..184 ici)
  est traversé par les libellés du médaillon (« Brûlant », « CHALEUR ») : 5 à 8 % de ses rangées
  sont altérées (`m07`).

---

## 6. Ce que je n'ai pas pu vérifier

1. **La stabilité (absence d'animation).** Aucune paire T / T+1 s n'est fournie. *La mesure qui
   trancherait* : deux captures du même état à une seconde d'intervalle et un compte de pixels
   différents (le tour précédent l'avait : 0 sur 2 073 600). Sans elle, « le reflet est FIXE » et
   « aucune animation » restent **non vérifiés**.
2. **L'identité photographiée.** Le dossier annonce `régime=env` / `demo_capture@example.test` mais
   précise « journal non joint ». *La mesure* : la ligne `[DemoIdentityResolver] régime=env
   identité=…` du journal du run. Sans elle, toute comparaison de **valeur** (le nom `ROOK`, le
   solde, `JOUR 50`) est non vérifiée ; la **forme**, elle, est jugée ci-dessus.
3. **Le rect imprimé par le test** n'est pas fourni. J'ai mesuré le bas du bandeau **sur l'image**
   (filet or plein largeur, y 138..142 aux deux résolutions) et le haut du dock **à l'encre**
   (première rangée portant un liseré d'onglet : 1699 / 2179). *La mesure* : le rect imprimé et
   `ShellChrome.TopInsetPx` / `BottomInsetPx`, plus `TabDockHauteurCss`. **Conséquence : la
   gouttière basse réelle est ≤ 70 px** — mon 70 px est une borne supérieure, et le débord haut
   de F15 est donc une borne *inférieure*.
4. **Le halo de la pastille allumée** (`box-shadow 0 0 7px`, l'autre membre de la famille F5) : les
   quatre tuiles sont éteintes dans l'état capturé. *La mesure* : une capture avec au moins une
   règle absorbée (cadre #119 ou #121 côté maquette).
5. **Les états 121 à 124** (dérive, règles données, gages, ce qui manque) ne sont pas capturés : ni
   la section « gages » ni un compteur ENFREINTES non nul ne sont jugés. *La mesure* : une planche
   par état, contre `etats/m-121.png` … `m-124.png`.
6. **L'origine de la maigreur des gras (F14).** Depuis une image je peux mesurer le fût, pas la
   cause. *La mesure hors image* : la liste des faces réellement embarquées par le client
   (`DesignTokens.primaryFont` / `hudSerifFont` : y a-t-il une face **Bold**, ou une seule
   `Book` ?) et le `font-weight` demandé par la CSS de série 6 pour chacun des six blocs mesurés.
   Tant qu'elle n'est pas faite, « fonte grasse absente » et « poids ignoré » sont indiscernables.
7. **Clippé ou recouvert, au 1080×1920** (F15). L'image ne montre que le résultat composé. J'observe
   que le cadre commence à y = 2, donc qu'il n'est pas rogné au ras du canvas ; savoir si le
   contenu au-dessus de y = 0 existe demanderait le rect du composant.
8. **Aucune capture « avant »** n'est fournie : je ne peux attribuer aucun écart à un commit
   particulier, ni confirmer qu'un écart mesuré ici a été *introduit* par le lot de correctifs.
9. **La conversion sRGB → linéaire** n'est pas testable ici au sens strict : aucune paire
   d'opacités superposées sur deux fonds différents. Les aplats mesurés sont tous à ≤ 6/255, et
   l'écart de graisse (F14) porte sur les **gras seulement** — le texte courant est à 1,00 — donc
   il n'a **pas** la signature d'une erreur d'espace de mélange (qui frapperait uniformément).

---

## Annexes

### 1. Inventaire de la référence (`reference-1080x2102.png`, 1080×2102, origine du cadre (21,452))

| id | catégorie | parent | bbox local (x0,y0,x1,y1) | forme / remplissage / bord | texte |
|---|---|---|---|---|---|
| `R0` | cadre | écran | 0,0,1037,1626 | filet or **3 px** (176,141,62), fond (12,17,24) | — |
| `R1` | enseigne | R0 | 29,29,1008,217 | liseré 3 px, fond (12,18,28), filet or 7 px en pied (local 211..217) | « Le miroir » 48 px cap, (242,201,106), contraste 11,83 ; sous-titre caps espacées 17 px, (185,173,146) |
| `R2` | compteurs ×3 | R0 | 29,250,1008,363 | 3 boîtes de 312 px, écart 23 px, liseré 3 px, fond (10,14,22) | « 00 » cap 37 px, fût 8-10 px, (127,212,217) **+ halo jusqu'à 14 px** ; libellés 18 px (138,151,156) |
| `R3` | panneau élastique | R0 | 29,396,1008,1161 | liseré 3 px, fond (11,13,14) | — |
| `R3a` | carte portrait | R3 | 61,425,484,1080 | **filet or 3 px**, fond (17,24,35) | « LT. HARA, VOTRE LIEUTENANT » · « Il vous écoute » (125,179,106) · légende `non projeté (L0.4)` |
| `R3b` | buste | R3a | tête 198,577..348,763 · torse 133,820..411,1079 | calotte max 147 px, tête max 152 px, **bandeau latéral 21 px**, sagitta −20,5 px · visage 126 px · cou 9,84 u · col 11,12 u · gant 8,57 × 5,47 u | — |
| `R3c` | balayage teal | R3 | 185,631,852,638 | 8 px, dégradé teal, à 30,8 % de la hauteur | — |
| `R3d` | en-tête colonne droite | R3 | 490,438,1000,529 | — | sérif 28 px, interligne 42 px ; petit 3 lignes, interligne 30 px |
| `R3e` | tuiles ×4 | R3 | 521,548,976,994 | 4 boîtes **101 px**, gouttières 14/15/15, liseré 3 px, fond (17,24,35) ; pastille éteinte 25 px (42,54,72) | ligne 1 cap 21 px (185,173,146) ; ligne 2 cap 15 px (101,109,119) |
| `R4` | panneau bas | R0 | 29,1195,1008,1467 | liseré 3 px, fond (16,23,34) | sur-titre · titre sérif 39 px (234,224,200) · 3 lignes, interligne 32/33 px |
| `R5` | CTA | R0 | 29,1500,1008,1594 | filet or 3 px, fond (22,25,27), **95 px** | caps 29 px (242,201,107), contraste 11,22 |

**Couche globale (zone du cadre, 421 947 px échantillonnés)** : luminance moyenne **32,24** ·
densité d'encre (lum > 30) **14,68 %** · palette : (15,21,28) 90,22 % · (40,53,72) 2,97 % ·
(171,166,147) 2,37 % · (175,140,61) 1,95 % · (241,200,106) 0,68 % · (232,223,199) 0,46 % ·
(47,82,98) 0,44 % · (95,103,102) 0,40 % · (169,150,105) 0,28 % · (126,211,216) 0,23 %.
**Rythme vertical** (frontières locales) : 29 · 217 · 250 · 363 · 396 · 425 · 1080 · 1161 · 1195 ·
1467 · 1500 · 1594 · 1626.

### 2. Inventaire de la capture (`capture-1080x2400.png`, origine du cadre (18,482))

Mêmes parties, aucune EN TROP, aucune ABSENTE. Différences par rapport à l'annexe 1 :

| id | ce qui diffère |
|---|---|
| `R0` | filet **4 px**, hors-tout 1044 px, marge écran 18 px |
| `R1` | bloc **183 px** (−6), filet or en pied local 205..211 ; titre cap 46 px, fût sérif inchangé |
| `R2` | boîtes 250 → **245..359**, écarts 25 px ; « 00 » cap 37 px mais **fût 6-7 px**, **halo 0,00** ; 3ᵉ boîte = tiret 47 × 4 px, même cyan, centré |
| `R3` | **392..1175 (784 px, +18)** ; vide en pied 245 px à droite, 97 px à gauche |
| `R3a` | 421..1078, 425 × 658 px ; pas de légende `non projeté` ; nom « LT. ROOK » |
| `R3b` | calotte max **154** = tête max, **bandeau latéral 1 px**, **pincement 126 px**, attache 92 px, sagitta −12,0 px · visage 128 px · col **14,25 u** · gant **9,50 × 6,03 u**, centre +7,5 px |
| `R3c` | **68..953 (886 px, +32,6 %)**, 7 px, à 28,6 % |
| `R3d` | 425..501, interligne sérif **35 px**, petit **27 px** ; bloc 123 px (−27) |
| `R3e` | 521..983 (+7 px de large), 4 boîtes de **92 px**, gouttières 17/14/15, pile 517..930 |
| `R4` | 1208..1473 (266 px, −7), décalé de +13 px ; interlignes du paragraphe conformes |
| `R5` | 1507..1594 (**88 px**, −7), bordure 4 px |

**Couche globale (même aire, 421 947 px)** : luminance moyenne **30,44** (−5,6 %) · densité d'encre
**12,86 %** (−12,4 %) · palette : (14,20,27) 90,19 % · (41,52,72) 2,98 % · (173,166,147) 2,52 % ·
(175,140,60) 1,84 % · (94,102,101) 0,73 % · (241,200,105) 0,57 % · (233,223,199) 0,48 % ·
(52,86,90) 0,25 % · (105,86,45) 0,23 % · (155,141,107) 0,21 %.
**Rythme vertical** : 29 · 211 · 245 · 359 · 392 · 421 · 1078 · 1175 · 1208 · 1473 · 1507 · 1594 ·
1627.

### 3. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre :

`m01` filet or et bandes du cadre · `m02` bornes de chrome · `m03` haut du dock · `m04` équivalence
des deux résolutions (contrôle ±1 px) · `m05` occlusion du rail · `m06` lisibilité du titre ·
`m07` dégât de l'occlusion (contrôles à 0/102 000) · `m08`,`m09`,`m10`,`m11` titre au 1920 ·
`m12` table de la gouttière · `m13` structure des blocs · `m14` panneau élastique · `m15` lignes de
texte · `m16`,`m17`,`m18` tuiles · `m19` carte et buste · `m20` couleurs de la tête · `m21` profil
de la tête · `m22`,`m23`,`m41` les quatre nombres de la calotte et le pincement · `m24`,`m25` halo
des chiffres (avec contrôle du détecteur) · `m26` compteurs et tiret · `m27` divers ·
`m28` tuiles en x · `m29`,`m30`,`m31`,`m32` primitives du buste · `m33` couche globale ·
`m34` contrastes · `m35` sous-titre · `m36`,`m37` graisse · `m38` CTA et enseigne · `m39` carte des
écarts par bande · `m40` aplats · `m42` recouvrement cou/col et évocation de chrome de la référence.
Comparaisons visuelles : `cmp_carte.png`, `cmp_compteurs.png`, `cmp_cta.png`, `cmp_enseigne.png`,
`cmp_colonne_droite.png`.
