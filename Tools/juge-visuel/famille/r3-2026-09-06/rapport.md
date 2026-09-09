# Juge visuel ⊥ — ⑥ La Famille (l'organigramme) — r3 — 2026-09-06

## Verdict : APPROUVÉ

Aucun BLOQUANT, aucun MAJEUR : l'écran se lit exactement comme la maquette (même but, même ordre de
lecture, mêmes traits d'identité, même rythme au demi-pixel) ; les 14 écarts restants sont tous des
finitions visibles seulement côte à côte, et cinq des treize écarts du tour précédent sont refermés.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Échelle établie avant toute mesure (annexe 3) : feuille de la capture **x 13..1065 px = 1053 px**
pour 560 CSS ⇒ **facteur ×1,8804** ; référence 1120 px / 560 CSS ⇒ ×2,0. Toutes les valeurs ci-dessous
sont en **CSS**, référence → jeu.

| # | grandeur | référence | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | largeur de la feuille (encre, bord à bord) | 560,00 (1120 px) | 560,00 (1053 px) | facteur **dérivé**, pas supposé | `m2` |
| 2 | largeur d'un rang · x0 du rang | 489,00 · 48,50 | 489,80 · 48,40 | +0,80 · −0,10 (CSS calculée : 489,07) | `m9` |
| 3 | hauteur des 3 rangs (liseré haut → liseré bas) | 102,00 / 100,25 / 100,25 | 101,00 / 101,00 / 101,50 | ≤ 1,25 | `m26` |
| 4 | pas rang→rang (témoins homologues, boîte vide des deux côtés) | 202,00 | 201,50 / 201,25 | ≤ 0,75 | `m26` |
| 5 | **hauteur de tête (haut de feuille → filet)** — écart F2 du r2 | 115,50 | **114,34** | **−1,16** (était +13,75 au r2) | `m3` |
| 6 | **rampe d'alpha du filet de tête**, 22 points sur la largeur — écart F3 du r2 | 22·40·60·80·100·120·139·167·176·167·139·109·79·59·39·22 | 23·40·60·80·**99**·**119**·139·167·176·167·139·109·**80**·**60**·40·23 | **≤ 1/255 sur 22 points** | `m19` |
| 7 | **casse du libellé « ÉTAT »** (instrument par corps de lettre, 5 contrôles/6) — écart F9 du r2 | CAPITALES (4 corps à 10,50) | **CAPITALES** (4 corps à 10,64) | fermé | `m21` |
| 8 | **casse de la fente NOM du rang du Don** — écart F13 du r2 | CASSE MIXTE (« Don V. ») | **CASSE MIXTE** (« Vous ») | fermé | `m21` |
| 9 | diamètre du médaillon de rang (CSS 70,93) | 71,00 | 70,73 × 71,26 | ≤ 0,33 | `m15` |
| 10 | buste de lieutenant : largeur d'épaules · aire · trou du visage | 43,7 % · 17,43 % · 14,8 × 21,1 % | 43,2 % · 17,23 % · 14,2 × 20,2 % | ≤ 0,9 pt | `m15`,`m30` |
| 11 | buste du Don : épaules · aire | 43,7 % · 14,50 % | 43,9 % · 14,61 % | ≤ 0,2 pt | `m15` |
| 12 | couleur du buste (`#cfc4a6`) | (207,196,166) | (206,196,165) | ≤ 1 | `m28` |
| 13 | couleurs de texte : titre · sous-titre/libellé · nom/valeur · puce | (242,201,107)·(185,173,146)·(234,224,200)·(127,212,217) | (242,201,**106**) · identiques | ≤ 1 | `m12` |
| 14 | contrastes WCAG : titre · sous-titre · nom · puce · valeur d'état · libellé · boîte vide | 11,22·7,95·13,32·10,26·13,32·7,88·7,95 | 10,78·7,95·13,77·10,79·13,78·8,36·8,11 | tous ≥ 7,9:1 (seuils 3:1 / 4,5:1) | `m12` |
| 15 | hauteurs de capitale : titre · sous-titre · nom du Don · capitale de la valeur d'état (réf « R » de *Repos*, jeu « A » de *Au repos*) · libellé d'état | 18,50 · 12,00 · 18,50 · 15,00 · 10,50 | 18,61 · 12,23 · 18,08 · 15,42 · 10,64 | ≤ 0,42 | `m10`,`m22` |
| 16 | **espace de mélange**, 5 translucidités plates (rail d'équipe `#b08d3e55`, bord de boîte `#ffffff22`, remplissage du retour `#ffffff08`, bordure du don-rang `#d9ab4e44`, contour de puce `#7fd4d955`) | prédiction **sRGB** à ≤ 10/255 | prédiction **sRGB** à ≤ 8/255 | **même modèle**, jamais linéaire (écart linéaire 61 à 187) | `m24` |
| 17 | contrôle à α = 1 (laiton plein `#b08d3e`) | (173,139,61) | (174,139,62) | ≤ 1 | `m24` |
| 18 | ergot du rang (`.rang::before`, CSS 16,8) : longueur · couleur | 17,00 · (176,141,62) | 17,02 · (170,136,59) | 0,02 · ≤ 6 | `m20` |
| 19 | rail principal : x0 · couleur à t = 0,25 / 0,50 / 0,75 | 31,50 · (144,117,55)/(113,94,48)/(83,71,41) | 31,38 · (141,115,55)/(109,91,47)/(79,67,40) | ≤ 0,12 · ≤ 4 | `m20` |
| 20 | rail d'équipe : couleur | (73,63,39) | (73,63,40) | ≤ 1 | `m20` |
| 21 | boîte vide : largeur · hauteur · centrage horizontal du texte | 440,50 · 71,00 · −0,25 | 440,87 · 70,20 · −0,30 | ≤ 0,8 | `m21`,`m3` |
| 22 | boîte « Recruter » : largeur · hauteur · centrage | 515,00 · 71,50 · +1,00 | 515,86 · 71,26 · +0,50 | ≤ 0,9 | `m20`,`m3` |
| 23 | cœur du trait pointillé · épaisseur | (52,54,56) · 1,00 | (53,55,58) · 1,06 | ≤ 2 · 0,06 | `m25` |
| 24 | contour de puce : cœur du trait (haut et gauche) · hauteur de boîte | (52,88,98) · 28,50 | (56,89,98) · 27,65 | ≤ 4 · 0,85 | `m25`,`m13` |
| 25 | bloc « état » : bord droit d'encre (valeur/libellé), 3 rangs | 521,50/518,50 | 520,11/520,65 | ≤ 2,2 (aligné à droite des deux côtés) | `m26` |
| 26 | bloc « état » : décalages depuis le haut de carte (valeur · libellé) | 32,50 · 55,50 | 32,64 · 54,98 | ≤ 0,52 | `m26` |
| 27 | bouton retour : diamètre · contraste du chevron/intérieur | 56,00 × 54,00 · 7,38:1 | 56,37 × 53,18 · 7,13:1 | ≤ 0,8 · 0,25 | `m10`,`m34` |
| 28 | rythme : don→rang1 · rang→vide · vide→rang · vide→recruter | 15,50 · 15,00 · 15,50 · 19,00 | 15,75 · 15,60 · 15,70 · 19,15 | ≤ 0,6 (CSS 14,93 / 18,93) | `m26`,`m3` |
| 29 | luminance moyenne · densité d'encre (même contenu borné à la boîte « Recruter ») | 29,18/255 · 4,98 % | 28,75/255 · 4,96 % | −1,5 % · −0,02 pt | `m23` |
| 30 | palette : 1ʳᵉ couleur (fond de feuille) et son aire | 45,0 % ~(20,28,28) | 46,5 % ~(20,20,28) | mêmes familles, même ordre | `m23` |
| 31 | fond de feuille (CSS `#16191b`) | (22,25,27) | (22,22,28) | ≤ 3 | `m2` |
| 32 | pied du dégradé de panneau (rang et don-rang) | (15,21,30) / (14,19,29) | (15,18,28) / (14,18,27) | ≤ 3 | `m33` |
| 33 | bordures du don-rang, côtés **bas / gauche / droite** (teinte R−B) | +24 / +27 / +24 | +21..+24 / +25 / +27 | teinte or conservée | `m27` |
| 34 | **gouttière** : dernier objet du chrome haut · feuille · premier objet du dock | — | y 231 px · **232..2151** · y 2179 px | **aucun chevauchement** | `m23` |
| 35 | nombre de rangs · cohérence avec le sous-titre | 3 · « 3 LIEUTENANTS » | 3 · « 3 LIEUTENANTS » | 0 | `m5`,`m12` |

---

## 0. L'écran, tel que la maquette le dit

**But.** Le mur de photos de la Famille : qui tient quoi, et qui manque à la table. On y vient pour
lire d'un coup d'œil la hiérarchie (le Don, puis ses lieutenants en rang) et pour ouvrir une fiche
ou recruter.

**Ordre de lecture.** (1) « LA FAMILLE » — le seul texte en or vif, 18,5 CSS de capitale, en haut à
gauche après le bouton retour ; (2) le **rang du Don**, la seule carte à bordure or et à médaillon
cerclé d'or vif, détachée au-dessus de l'arbre ; (3) la **colonne de rangs**, tous identiques, tenus
par un rail vertical en laiton qui descend du Don et pique chaque carte d'un ergot ; (4) à droite de
chaque rang, la **valeur d'état** en gras ; (5) tout en bas, la boîte pointillée « Recruter ».

**Zones.** Tête (retour + titre + sous-titre + filet laiton) · rang du Don · arbre (rail + 3 rangs,
chacun suivi de son bloc d'équipe) · pied (appel au recrutement).

**Traits d'identité.** (a) le **rail en laiton à dégradé** avec ses ergots — c'est ce qui fait un
*organigramme* et pas une liste ; (b) le **médaillon-buste** cerclé de laiton, or vif et haloté pour
le Don ; (c) la **plaque de verre** bleu nuit des cartes, liserée de clair en haut et posée sur son
ombre ; (d) le **pointillé** des emplacements vides, qui dit « il manque quelqu'un ici » ; (e) la
**palette** : bleu nuit + crème + laiton + un seul cyan (la puce).

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, et de très près. Le but est immédiat, l'ordre de lecture est intact (titre or vif → carte du Don
→ colonne de rangs → valeurs d'état → recrutement), et les cinq traits d'identité sont tous là :
rail à dégradé et ergots au bon endroit (couleurs à ≤ 4/255 sur trois hauteurs), médaillons-bustes à
la bonne taille (Ø 70,73 pour 71,00) et au bon dessin (épaules 43,2 % contre 43,7 %, trou du visage
14,2 × 20,2 % contre 14,8 × 21,1 %), plaques de verre au bon rythme (pas 201,5 contre 202,0),
pointillé présent, palette identique. La couche globale le confirme : luminance moyenne 28,75 contre
29,18, **densité d'encre 4,96 % contre 4,98 %** — deux chiffres qu'aucun écart de composition ne
laisserait égaux.

Ce qui a bougé depuis le tour précédent est massif et va dans le bon sens : la **tête** a retrouvé sa
hauteur (114,3 contre 115,5, contre +12 % au r2), la **rampe du filet** est désormais exacte à
**1/255 sur 22 points**, le **libellé d'état** est en capitales, la fente du nom du Don n'est plus un
pronom en capitales, et l'**archétype** est revenu sur la ligne de rôle, en français.

Les trois écarts de tête qui restent sont des finitions, et deux d'entre eux forment une **famille** :
① la **bordure haute du rang du Don** est un trait gris neutre (86,82,76) là où la maquette en fait
un trait **or** (67,59,42) — les trois autres côtés, eux, sont conformes : c'est un *plus gris*
(désaturation), pas un *plus jaune* ; ② les **dispositifs doux pèsent environ la moitié** —
halo du médaillon du Don 42 %, ombre portée des rangs 48 %, anneau du bouton retour 50 % — trois
mesures indépendantes, **même signe, même ordre de grandeur** ⇒ à traiter comme une cause, pas comme
trois défauts ; ③ le **bloc « qui »** du rang est 19,7 % plus lâche (le nom monte de 5 CSS, la
pastille ne bouge pas) pendant que, à l'inverse, le bloc du **rang du Don** est 30 % plus serré.
Aucun de ces trois n'a changé l'ordre de lecture ni un trait d'identité : d'où le verdict.

---

## 3. Écarts

Gravité : liste fermée `BLOQUANT` / `MAJEUR` / `MINEUR`. `ASSUMÉ` et `ARBITRAGE` sont dans des tables
à part et **ne sont pas comptés ici**. La colonne **données** dit si l'écart dépend du contenu du
compte (observation datée) ou de la forme (vrai quelles que soient les données).

**Compte : 0 BLOQUANT · 0 MAJEUR · 14 MINEUR** (dont 1 dépendant des données).

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le bord HAUT du rang du Don est un trait gris neutre, pas un trait or** — les 3 autres côtés sont conformes. Changement de *famille* de teinte (or → gris), sur le seul élément de l'écran qui porte un cadre or. | Pic de couleur sur 8 abscisses (CSS x 70→520) : réf **(67..71, 59..63, 39..47)**, teinte **R−B = +24** ; jeu **(85..86, 82, 76..77)**, teinte **R−B = +9**. ΔR **+18**, ΔL **+22,9**. Côtés bas/gauche/droite : R−B +21..+27 des deux côtés. (`m27`) | si le trait est un liseré `inset` clair ajouté ou la bordure or qui a perdu sa teinte — l'image ne les distingue pas |
| `F2` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le bloc « qui » du rang est 19,7 % plus lâche** : le nom monte, la pastille reste en place. | Sommet de capitale du nom → sommet de la boîte de pastille, même instrument des deux côtés : **24,00 → 28,72** CSS (**+19,7 %**). Décomposition depuis le haut de carte : nom 27,50 → **25,53** (−2,0), pastille 51,50 → **54,25** (+2,8). (`m13`) | — |
| `F3` | MINEUR | DÉJÀ APPLIQUÉ | non | **Dans le rang du Don, l'écart inverse** : les deux lignes sont 30 % plus serrées. | Bas d'encre du nom → haut d'encre du rôle : **19,00 → 13,29** CSS (**−30 %**). Les deux autres blocs à deux lignes sont conformes (bloc « état » 6,50 → 6,92 ; bloc de tête 23,00 → 21,27). (`m12`,`m26`) | — |
| `F4` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le halo du médaillon du Don pèse moins de la moitié.** | Intégrale d'excès du canal R sur 18 anneaux concentriques, ligne de base prise **dans la même carte**, moins le contrôle négatif (moyenne des 2 médaillons de lieutenant, sans `box-shadow`) : **119,5 → 50,0** (**42 %**) ; pic au ras de l'anneau **+19 → +10** ; portée (≥ +3) **9 → 4** CSS. (`m16`) | — |
| `F5` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'ombre portée des rangs pèse 48 %** : les cartes sont moins décollées. | Creux de luminance sous le bord bas, intégré **de d = 2,0 à 12,0 CSS** des deux côtés (les 1,5 premiers CSS sont le liseré `inset`, un autre dispositif ; la borne 12,0 exclut la boîte pointillée suivante) : réf **−58,8 / −68,0 / −68,0** (moy. −64,9), jeu **−31,6 / −30,1 / −31,1** (moy. −31,0) ⇒ **ratio 0,48**. Profondeur à d = 2 : **−10,6/−11,6 → −7,1**. Portée : réf encore −1,0 à d = 18 ; jeu **0,0**. (`m35`,`m17`) | — |
| `F6` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'anneau du bouton retour a perdu la moitié de son énergie**, et son contraste contre l'intérieur du bouton tombe à 1,18:1. | Énergie de trait (4 profils cardinaux, base locale) : **46,3 → 23,1** (−50 %) ; pic **+35,7 → +16,3**. Couleur d'anneau **(62,64,66) → (46,47,49)** ; contraste anneau/intérieur **1,57:1 → 1,18:1**, anneau/extérieur **1,70:1 → 1,29:1**. Prédiction sRGB de `#ffffff26` sur le fond mesuré : réf (57,59,61) ≈ observé ; jeu (61,60,63) contre observé (46,47,49) ⇒ **−15/255**. Contrôle positif : l'anneau laiton du médaillon reste fort des deux côtés (179,4 / 144,0). **Le chevron, lui, reste à 7,13:1** : l'affordance n'est pas perdue. (`m18`,`m34`) | — |
| `F7` | MINEUR | **NOUVEAU** | non | **Le disque intérieur des médaillons est plus sombre et moins bleu** — les rayons coniques ressortent davantage. | Profil radial (médiane sur un cercle complet, ce qui moyenne les rayons), rayons 11 à 32 CSS, sur les 3 médaillons : Δ systématique **(−3..−9, −5..−11, −6..−18)**, soit **ΔB ≈ −13 à −16** au milieu du disque. Exemple à R = 20 : réf (33,43,61) → jeu (26,33,46). Contrôle : la couleur du buste, elle, est identique (207,196,166) → (206,196,165). (`m29`,`m28`) | si l'écart vient du disque (dégradé radial `#243048→#0f1622`) ou d'un voile posé dessus |
| `F8` | MINEUR | **NOUVEAU** | non | **Le fond de tête est une plaque pleine largeur au lieu d'un halo centré** : il éclaire les bords gauche/droit que la maquette laisse au noir, et descend plus bas. | Profil horizontal à CSS y = 8 : réf **(22,25,27) aux deux bords** → (33,33,30) au centre ; jeu **(29,28,30) aux deux bords** → (35,33,32) au centre ⇒ lift de **+7/255 (R)** là où la maquette est à 0. Profil vertical au centre : la maquette retombe au fond à **y = 95 CSS**, le jeu à **y = 118**. La palette le confirme : le jeu porte un bin ~(28,28,28) à **7,8 %** de l'aire, sans homologue dans les 5 premières couleurs de la référence. Contrôle positif : à y = 600 les deux fonds sont plats. (`m11`,`m23`) | si c'est le dégradé de tête élargi ou une ombre projetée par le bandeau du shell sur la feuille |
| `F9` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le texte de la pastille est 11,4 % plus haut de capitale** — et il rompt une égalité que la maquette tient : la CSS donne la **même** taille (14,93 px) à la pastille et au libellé « ÉTAT ». | Instrument par corps de lettre. Référence : pastille **10,50** et libellé ÉTAT **10,50** sur les 3 rangs (**égalité**, contrôle positif). Jeu : libellé ÉTAT **10,64**, pastille **11,70** sur les 3 rangs ⇒ **+10,0 % l'un par rapport à l'autre**, **+11,4 %** par rapport à la maquette. Ratio capitale/taille : réf 0,703 pour les deux ; jeu 0,712 (ÉTAT) contre **0,784** (pastille). (`m22`) | l'archétype (sans homologue dans la maquette) rend une capitale de 12,23 sur la même ligne — non opposable, cité pour information |
| `F10` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le rayon des coins des rangs est ~1,8 CSS plus serré.** | Ajustement du profil du coin haut-gauche, même instrument des deux côtés, 48 points par carte : réf **20,6 / 21,6 / 21,6**, jeu **19,6 / 19,4 / 19,4** ⇒ Δ **−1,8**. Valeur CSS 22,4 ⇒ biais commun de l'instrument ≈ −1,1 : **seule la différence est opposable**. (`m19`) | — |
| `F11` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le haut des cartes est plus bleu**, et le liseré interne haut ne s'atténue plus sur la largeur. | Sommet du dégradé (t = 0,05) : réf (18,24,35) → jeu (20,26,40), **ΔB +5** ; liseré interne haut : réf (53,59,68) → jeu (56,63,78), **ΔB +10**. Le pied du dégradé, lui, est égal (Δ ≤ 3). Et la **variation sur la largeur** : réf (55,62,72) à x=70 → (51,56,64) à x=520 ; jeu **(57,64,79) → (56,63,77)** — quasi plat. (`m18`,`m27`,`m33`) | — |
| `F12` | MINEUR | **NOUVEAU** | non | **Le pointillé des emplacements vides est plus clairsemé** : même couleur de trait, mais des tirets plus courts pour une période plus longue. | Bord haut, comptage sur la largeur : période médiane **5,00 → 5,32 CSS** (+6,4 %) et **taux d'occupation 65 % → 55 %** (boîte vide) / 64 % → 56 % (boîte « Recruter »). Contrôle : le **cœur** du trait est identique — (52,54,56) → (53,55,58) — et l'épaisseur 1,00 → 1,06. (`m20`,`m25`) | — |
| `F13` | MINEUR | **NOUVEAU** | non | **Les anneaux de médaillon perdent ~11 % d'énergie de trait** (même classe que `F6` : un trait de 1 à 1,87 CSS **courbe**). | Énergie médiane sur 16 directions : lieutenant **192,7 / 189,1 → 165,2 / 172,3** (ratio 0,86 / 0,91), Don **283,8 → 251,1** (0,89). Pic : lieutenant (176,141,62) → (164,131,59) ; Don (242,201,107) → (221,184,99). **Contrôle négatif de la classe** : un trait laiton **droit** de même épaisseur (le rail principal) est exact — (173,139,61) → (174,139,62). | si le déficit vient du client ou du facteur de rendu **non entier** (×1,8804) qui étale un trait courbe sur 2 px — une capture à facteur entier trancherait |
| `F14` | MINEUR | DÉJÀ APPLIQUÉ | **oui** | **Le rang du Don échange ses deux fentes** : la maquette met un **nom** en or vif (« Don V. ») et le rôle « VOUS » ; le jeu met le **pronom** « Vous » en or vif et « LE DON » en rôle. | Fente du nom : réf « Don V. » (or vif, casse mixte, capitale 18,50) ; jeu « Vous » (or vif, **casse mixte**, capitale 18,08). Fente du rôle : réf « VOUS » (crème-2, capitales, 11,50) ; jeu « LE DON » (crème-2, **capitales**, 11,70). Les deux fentes sont pleines, en français, à la bonne casse et à la bonne couleur — seule l'attribution change. (`m12`,`m21`) | si le jeu a une **source** pour un nom de Don ; la table des écarts assumés du dossier ne dit rien de cette fente |

### Note de classe (ce que les mesures désignent comme UNE cause, pas comme N défauts)

- **`F4` + `F5` + `F6`** : trois dispositifs indépendants (halo `box-shadow` flou · ombre portée
  `box-shadow` flou · bordure translucide courbe) rendus à **42 %, 48 %, 50 %** — écart *systématique
  et de même signe*. Ce n'est **pas** une erreur d'espace de mélange : les 5 translucidités **plates**
  et la rampe du filet sont exactes en sRGB des deux côtés (contrôles positifs 16, 17 et 6).
- **`F6` + `F13`** : les traits **courbes** de 1 à 1,87 CSS perdent 11 à 50 % de leur énergie ; les
  traits **droits** de même épaisseur et de même couleur sont exacts au 1/255 (rail, pointillé). Le
  déficit croît quand le trait est plus fin (1,87 CSS → −11 % ; 1,00 CSS → −50 %).
- **`F2` + `F9`** : la deuxième ligne du bloc « qui » porte une typographie 10 à 16 % plus grande que
  celle de la maquette, et le bloc est 19,7 % plus haut. Les deux mesures sont compatibles avec une
  seule cause sur la ligne de rôle.

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce que le dossier assume | ce que je constate | rendu proprement ? |
|---|---|---|
| noms du compte re-semé (Rook · Sallo · Halde) | 3 rangs, nom **présent, distinct, non tronqué** sur chacun ; largeur d'encre 93,6 / 91,5 / 102,6 CSS, loin du bord de la colonne (le bloc « état » commence à 418,0) | ✅ |
| chaque rang porte le nom **et** l'archétype en français | ligne 2 : « Cuisinier » sur les 3 rangs, casse mixte (instrument de casse), aucun enum brut, aucun « Unknown » | ✅ |
| pas de « Loyauté 82 % » | aucune jauge, aucun pourcentage sur l'écran | ✅ |
| « Aucune équipe rattachée » sous chaque lieutenant | 3 boîtes pointillées libellées, aucune boîte vide sans libellé, aucun nom inventé | ✅ |
| la puce montre l'**ancienneté**, pas « Délégué / Direct » | « RÉCENT » sur les 3 rangs, jamais vide, contour cyan conforme (cœur du trait (56,89,98) contre (52,88,98)) | ✅ |
| pas de chip « Retiré », pas de rang grisé | aucun | ✅ |
| pas de « District du Don » | aucun district affiché | ✅ |
| pas de bandeau « Un siège libre à la table » | aucun | ✅ |
| bustes contemporains (Don nu, lieutenant à capuche) | Don nu et lieutenant à capuche des deux côtés ; **aucun buste tronqué** : épaules 43,9 % (Don) et 43,2 % (lieutenant) contre 43,7 % / 43,7 %, bbox y 42,4..92,4 % et 38,6..91,7 % | ✅ |
| — (conséquence de « aucune équipe ») | la maquette met un bouton « Voir l'équipe » sous le rang 2 ; le jeu met une 3ᵉ boîte pointillée. Le contenu s'allonge de **+22,5 CSS** au total et le rythme reste régulier (pas 201,5 / 201,3 contre 202,0 / 175,0) | ✅ |

## ARBITRAGES (pas corrigibles côté client)

| sujet | mesure | pourquoi c'est un arbitrage |
|---|---|---|
| famille sans-sérif : **Noto Sans** (ce qui a rendu la référence) ↔ **DejaVu Sans** (embarquée) | sur des chaînes **identiques** : « Aucune équipe rattachée » **240,00 → 264,84 CSS (+10,3 %)** et « Recruter un nouveau lieutenant » **304,00 → 332,92 (+9,5 %)**, à **hauteur de capitale égale** (21,00 → 21,27 ; 16,00 → 15,95). Ratio capitale/taille : 0,714 (Noto) contre 0,728 (DejaVu). | `font-family:"Segoe UI",Roboto,system-ui` ⇒ `fc-match` rend Noto Sans : la référence n'a jamais montré la police du client. Écart de **chasse**, pas de taille. |
| famille sérif : **Noto Serif** ↔ **DejaVu Serif** | titre « LA FAMILLE » : largeur **200,00 → 205,28 (+2,6 %)** à capitale **18,50 → 18,61** ; nom du Don capitale 18,50 → 18,08 | idem (`Georgia,serif`) |
| bin dominant de la palette | réf ~(20,28,28) 45,0 % ↔ jeu ~(20,20,28) 46,5 % | conséquence du fond de feuille (22,25,27) ↔ (22,22,28), Δ 3/255, sous la tolérance ; le changement de *bin* est un artefact de quantification, pas un écart |

---

## 5. Autres résolutions

**Non vérifié.** Le dossier ne fournit **qu'une seule capture, 1080×2400** (§ « Captures en jeu »), et
sa propre règle de doctrine le dit (« Ce tour ne fournit qu'une résolution par écran »). Je ne peux
donc rien affirmer sur le reflux, le débordement ou la conservation des proportions à une autre
résolution. Ce que la capture unique permet de dire : à 1080×2400 rien n'est coupé, rien ne déborde de
son parent (le contenu s'arrête à CSS y 928,55 pour une feuille de 1021,1 CSS de haut, soit **92,5 CSS
de feuille vide sous la boîte « Recruter »**), et le contenu tient dans la gouttière (chrome haut
jusqu'à y = 231 px, feuille 232..2151, dock à partir de 2179).

⇒ La mesure qui trancherait : une seconde capture au format le plus étroit visé (par ex. 1080×1920,
20:9 → 16:9), pour voir si le bloc « qui » (nom + archétype + pastille, qui occupe déjà x 154,8..328,1,
soit 35,4 % de la carte) et le bloc « état » (x 418,0..520,7) se rejoignent.

---

## 6. Non vérifié

1. **Autres résolutions** — une seule capture fournie (voir § 5). *Mesure qui trancherait* : une
   capture à 1080×1920 et une à 1440×3200.
2. **Animation** — le ruling « aucune animation sur un nouvel écran » n'est pas testable : aucune paire
   T / T+1 s n'est fournie. *Mesure qui trancherait* : deux captures du même état à 1 s d'intervalle,
   puis comptage des pixels différents hors chrome.
3. **Identité photographiée** — je n'ai pas relu le journal du run (non joint ; la ligne
   `régime=env identité=demo_capture@example.test` n'est citée que dans le message de commit `5349ac2`).
   Je n'ai donc comparé **aucune valeur** de la planche à un corps de réponse : tout ce que je classe
   ci-dessus est de la **forme**, sauf `F14` qui est marqué « dépend des données ».
4. **L'état `.rang.actif` de la maquette n'a pas de témoin** — dans la référence, le rang 1 porte la
   classe `actif` et se distingue mesurablement d'un rang normal (fond ΔB jusqu'à **+11**, ΔG +6, à
   dy = 80 CSS). Dans la capture, les rangs 1 et 2 sont **identiques à (0,0,0)** — mais les trois rangs
   y sont « Au repos », donc aucun ne *devrait* être actif. **Je ne peux pas dire si le client
   implémente ce traitement.** *Mesure qui trancherait* : une capture d'un compte où un lieutenant est
   actif. (À noter que la maquette elle-même est incohérente : le rang 3 est « Actif » sans la classe.)
5. **Le chrome (bandeau, dock) n'est pas jugé ici** — le dossier le renvoie au canon du HUD. Je signale
   seulement, comme le dossier le demande, que la **3ᵉ fente du bandeau haut affiche un tiret « — »**
   sous « JOUR 50 » (ARGENT et JOUR, eux, sont alimentés : « 9 627 820,00 € » et « JOUR 50 »,
   cohérent avec la minute 72 118 ⇒ 72118/1440 = jour 50).
6. **Cause de `F7`, `F8` et `F13`** — l'image ne sépare pas : disque contre voile (`F7`), dégradé de
   tête élargi contre ombre du bandeau projetée sur la feuille (`F8`), déficit du client contre
   étalement d'un trait courbe par le facteur de rendu **non entier ×1,8804** (`F13`). *Mesure qui
   trancherait pour `F13`* : une capture à une résolution donnant un facteur entier sur la feuille.
7. **Robustesse aux contenus longs** — les 3 rangs portent le même archétype (« Cuisinier ») et le même
   état (« Au repos »). Je n'ai donc **aucun témoin** pour un nom long, un archétype long, ou une
   valeur d'état plus large que « Au repos » (102,6 CSS, qui laisse 89,9 CSS de blanc avant le bloc
   « qui »). *Mesure qui trancherait* : une capture d'un compte aux archétypes variés.
8. **Le déficit d'énergie des traits courbes n'a pas de contrôle négatif parfait** — mon contrôle
   (rail droit, exact) prouve que la classe existe, pas qu'elle explique **tout** le déficit.
9. **Chaîne de gauche du rail d'équipe** — mesurée en couleur et en position, mais je n'ai pas
   re-mesuré sa **hauteur** (63,0 CSS au tour précédent) : hors de mon jeu de mesures ce tour.

---

## Annexes

### Annexe 3 — Correspondance des repères (établie AVANT toute mesure du temps 3)

| | origine (px) | facteur | dérivation |
|---|---|---|---|
| RÉFÉRENCE `reference-1120.png` | (0, 0) | **×2,000** | 1120 px / 560 CSS (`.sheet{width:560px}`), donné par le dossier |
| CAPTURE `capture-1080x2400.png` | (13, 232) | **×1,8804** | **mesuré** : la feuille (fond plat (22,22,28)) occupe x **13..1065** et y **232..2151** ⇒ 1053 px / 560 CSS. Script `m2`, contrôle : le même détecteur rend 0..1119 sur la référence (qui *est* la feuille). |

Conversions utilisées partout : `CSS_x = (x_px − ox) / f`, `CSS_y = (y_px − oy) / f`.
Feuille de la capture : **1021,1 CSS** de haut contre 925,0 pour la référence — la feuille remplit le
rect libre de l'écran, le contenu s'arrête à 928,55.

### Annexe 1 — Inventaire de la référence (résumé ; le détail chiffré est dans les scripts)

| id | catégorie | bbox CSS | forme / remplissage | texte |
|---|---|---|---|---|
| `T` | tête | 0..115,5 × 0..560 | halo radial centré, +11/255 au centre, 0 aux bords ; filet laiton en bas (rampe 22→176→22) | — |
| `T.retour` | bouton | 26,0..81,5 × 34,0..87,5 | cercle Ø 56,0, anneau `#ffffff26` (62,64,66), fond `#ffffff08` (29,32,34) | chevron « ‹ » (185,173,146), 7,38:1 |
| `T.titre` | titre | 101,5..301,0 × 38,0..56,0 | — | « LA FAMILLE », sérif, capitale 18,50, (242,201,107), 11,22:1 |
| `T.sous` | sous-titre | 101,5..251,5 × 79,0..90,5 | — | « 3 LIEUTENANTS », capitales, capitale 12,00, (185,173,146), 7,95:1 |
| `D` | plaque du Don | 22,5..537,0 × 135,0..237,0 | rayon 22,4 ; dégradé (18,24,35)→(14,19,29) ; bordure or 1 CSS, R−B +24 sur les 4 côtés | — |
| `D.medl` | médaillon | Ø 71,0, centre (77,25 · 186,0) | anneau or vif (242,201,107) 1,5 CSS ; **halo** intégrale 119,5 ; disque (33,43,61) à R=20 ; rayons coniques | — |
| `D.nom` / `D.role` | texte | 132,5..205,0 × 164,5..182,5 / 132,0..180,0 × 201,5..212,5 | interligne 19,00 | « Don V. » (or vif, 18,50) / « VOUS » (capitales, 11,50) |
| `A.rail` | rail | x 31,5..33,5 | dégradé laiton (144,117,55)→(83,71,41) | — |
| `R1..R3` | rangs | 48,5..537,6 × h 102,0 / 100,25 / 100,25, pas 202,0 | rayon 21,6 ; liseré haut (55,62,72)→(51,56,64) ; ombre portée intégrale −58,8 à −68,0 ; ergot 17,0 à mi-hauteur | — |
| `R.medl` | médaillon | Ø 71,0, centre (100,75 · +50,0 du haut) | anneau laiton (176,141,62), énergie 190 | — |
| `R.nom` | texte | x0 154,0, capitale ~16,5..17,5 | sérif crème (234,224,200), 13,32:1 | « Comptable / Sécurité / Blanchiment » |
| `R.puce` | pastille | 153,0..250,5 × 304,5..332,5 (h 28,5) | pilule, contour cyan (52,88,98) | capitales, capitale 10,50, (127,212,217) |
| `R.etat` | bloc | bord droit 518,5..521,5 | aligné à droite, décalages 32,5 / 55,5 du haut de carte | valeur (capitale 15,0, gras) + « ÉTAT » (capitales, 10,50) |
| `V1..V3` | boîtes vides | 97,0..537,0 × h 71,0 | pointillé 1,00 CSS, cœur (52,54,56), période 5,00, occupation 65 % | « Aucune équipe rattachée », 240,0 de large, centré à −0,25 |
| `P` | recruter | 22,5..537,0 × 835,0..906,0 | même pointillé | « Recruter un nouveau lieutenant », 304,0 de large |
| — | couche globale | — | luminance 29,18/255 ; densité 4,98 % ; palette 45,0 % ~(20,28,28), 9,5 % ~(20,28,44), 8,5 % ~(20,28,36) | — |

### Annexe 2 — Inventaire de la capture (mêmes fiches, différences en gras)

| id | bbox CSS | différences relevées |
|---|---|---|
| `T` | 0..114,34 | **plaque pleine largeur (+7/255 aux bords), jusqu'à y 118** (`F8`) ; filet : rampe **exacte à 1/255 sur 22 points** |
| `T.retour` | 26,06..81,90 × 34,57..87,22 | Ø 56,37 × 53,18 ✓ ; **anneau (46,47,49), énergie −50 %, 1,18:1** (`F6`) ; chevron 7,13:1 ✓ |
| `T.titre` | 102,64..307,39 × 37,76..55,84 | capitale 18,61 ✓ ; largeur +2,6 % (ARBITRAGE police) |
| `T.sous` | 102,64..262,18 × 77,11..89,88 | capitale 12,23 ✓ (le bbox brut donne 13,30 : c'est le chiffre « 3 », plus haut que les capitales en DejaVu) |
| `D` | 22,34..537,66 × 133,49..234,00 | **bord haut gris (86,82,76)** (`F1`) ; 3 autres côtés or ✓ ; dégradé ΔB +6 au sommet |
| `D.medl` | Ø 70,73, centre (76,32 · 184,01) | **halo intégrale 50,0 (42 %)** (`F4`) ; **anneau −11 % d'énergie** (`F13`) ; **disque ΔB −16** (`F7`) |
| `D.nom` / `D.role` | 130,29..187,20 × 163,80..181,35 / 132,42..203,15 × 194,64..206,34 | **interligne 13,29 (−30 %)** (`F3`) ; **fentes échangées** (`F14`) ; casse conforme des deux côtés |
| `A.rail` | x 31,38..32,98 | couleurs ≤ 4/255 ✓ |
| `R1..R3` | 48,40..537,66 × h 101,0 / 101,0 / 101,5, pas 201,5 / 201,25 | **rayon 19,5 (−1,8)** (`F10`) ; **liseré haut (57,64,79), plat sur la largeur** (`F11`) ; **ombre à 48 %** (`F5`) ; ergot 17,02 ✓ |
| `R.medl` | Ø 70,73 × 71,26 | idem `F7` / `F13` ; buste conforme |
| `R.qui` | nom x0 154,76, capitale 16,49 | **bloc 19,7 % plus lâche** (`F2`) ; **ligne 2 = archétype (capitale 12,23) + pastille (capitale 11,70)** (`F9`, ASSUMÉ pour l'archétype) |
| `R.puce` | 234,53..328,13 × 304,20..331,32 (h 27,65) | **décalée de +81,5 CSS** (l'archétype la précède — ASSUMÉ) ; hauteur ✓ ; contour ✓ ; **texte +11,4 %** (`F9`) |
| `R.etat` | bord droit 520,1..520,7 ; valeur x0 418,01 | positions et alignement ✓ ; « Au repos » ×3 (données) |
| `V1..V3` | 97,32..537,66 × h 70,20 | **période 5,32 / occupation 55 %** (`F12`) ; cœur du trait ✓ ; **3 boîtes au lieu de 2 + 1 bouton** (ASSUMÉ) |
| `P` | 22,34..537,66 × 857,82..928,55 | largeur et hauteur ✓ ; texte +9,5 % de chasse (ARBITRAGE) |
| — | couche globale | luminance **28,75** ✓ ; densité **4,96 %** ✓ ; palette : mêmes familles + **un bin ~(28,28,28) à 7,8 %** sans homologue (`F8`) |

### Annexe 4 — Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre (preuve qu'il a lu les bons
fichiers) et porte au moins un contrôle.

| script | grandeur | contrôle |
|---|---|---|
| `m1_geometrie.py` | profil de luminance par ligne | assert sur les tailles d'image |
| `m2_feuille.py` | **extension de la feuille et facteur d'échelle** | le même détecteur rend 0..1119 sur la référence |
| `m3_bandes.py` | segments d'encre verticaux | — |
| `m4_cartes.py`, `m5_cartes2.py` | boîtes par colonne / par médiane de ligne | largeur CSS calculée 489,07 |
| `m6_horiz.py`, `m7_horiz2.py` | bords horizontaux (2 versions réfutées : la luminance ne discrimine pas `.rang.actif`) | — |
| `m8_lisere.py` | largeur par le liseré interne haut | contrôle négatif : le don-rang n'a pas ce liseré |
| `m9_bords.py` | **bords des cartes par le canal bleu** | positif 489,07 ; négatif : bande de fond pur ⇒ rien |
| `m10_tete.py` | tête : titre, sous-titre, retour, fond | capitale du titre 18,50 |
| `m11_fondtete.py` | **profils du fond de tête** (`F8`) | fond plat à y = 600 des deux côtés |
| `m12_textes.py` | bbox, couleurs, contrastes de 11 textes | couleur du titre = `#f2c96b` |
| `m13_rang_interne.py` | pastille, nom, bloc état | pastille de la référence = 28,0 ; négatif : aucune pastille dans le don-rang |
| `m14/m15_medaillons.py` | anneaux, bustes, **halo du Don** (`F4`) | Ø attendu 70,93 |
| `m16_halo.py` | **halo, ligne de base dans la même carte** | négatif : 2 médaillons de lieutenant sans `box-shadow` |
| `m17_ombres.py`, `m35_ombre_integrale.py` | **ombre portée des rangs** (`F5`) | positif : creux négatif des deux côtés ; négatif : d = 18 ⇒ ~0, ce qui prouve que la borne d = 12 n'inclut aucun objet voisin |
| `m18_bouton_bordures.py` | **anneau du retour** (`F6`), bordures, liserés | positif : anneau laiton du médaillon fort des deux côtés |
| `m19_rayon_filet.py` | **rayon des coins** (`F10`), **rampe du filet** | rayon CSS 22,4 |
| `m20_pointilles_rails.py` | **pointillé** (`F12`), rails, ergots | ergot CSS 16,8 |
| `m21_boites_casse.py` | bords des boîtes, **instrument de casse** | 5 contrôles sur 6 (le négatif « Aucune équipe rattachée » échoue : les lettres se rejoignent) |
| `m22_capitales.py` | **hauteurs de capitale par corps de lettre** (`F9`) | **positif décisif** : pastille et libellé ÉTAT, même taille CSS, rendent 10,50 tous les deux à la référence |
| `m23_global.py` | palette, luminance, densité, **gouttière** | fond de feuille 1ʳᵉ couleur des deux côtés |
| `m24_melange.py` | **espace de mélange, 5 translucidités plates** | contrôle à α = 1 (les deux prédictions coïncident) |
| `m25_traits_fins.py` | **pic** des traits de 1 CSS (réfute un faux écart de `m24`) | rail opaque identique des deux côtés |
| `m26_rangs_details.py` | hauteurs de carte, bloc état, `.rang.actif` | — |
| `m27_bords_rangs.py` | **bordures sur les 4 côtés** (`F1`) | positif : côté haut clair ; négatif : côté bas sombre |
| `m28/m29_medl_*.py` | **profil radial du médaillon** (`F7`) | couleur du buste identique |
| `m30_buste_forme.py` | forme du buste, trou du visage, anneau | couleur d'encre `#cfc4a6` |
| `m31/m32_anneau_*.py` | **pic et énergie des anneaux** (`F13`) | négatif de classe : trait droit exact |
| `m33_degrade.py` | dégradé de panneau | pied du dégradé égal |
| `m34_retour_contraste.py` | **contrastes WCAG du bouton retour** | sous-titre ≥ 7,9:1 des deux côtés |

### Annexe 5 — Écarts du tour précédent, refermés (mesuré, pas déduit)

| écart r2 | grandeur re-mesurée ce tour | état |
|---|---|---|
| F1 — l'archétype n'existe nulle part | « Cuisinier » présent sur les 3 rangs, ligne 2, casse mixte, français | **fermé** |
| F2 — tête +11,96 % | hauteur de tête 115,50 → **114,34** (−1,16) | **fermé** |
| F3 — rampe du filet dans un autre espace | 22 points de la rampe, écart **≤ 1/255** | **fermé** |
| F9 — libellé d'état pas en capitales | 4 corps de lettre à 10,64, **CAPITALES** | **fermé** |
| F13 — pronom en CAPITALES dans la fente du nom | « Vous », **CASSE MIXTE** (la fente reste occupée par un pronom : voir `F14`) | **fermé sur la casse** |
| F4, F5, F6, F7, F8, F10, F11, F12 | re-mesurés : 42 % (r2 : 44 %), 48 % (56 %), −50 % (−47 %), +19,7 % (+19 %), −30 % (−33 %), −1,8 (−2,1), ΔB +5/+10 (+5/+9), (86,82,76) contre (86,82,76) | **inchangés** |
