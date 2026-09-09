# Juge visuel ⊥ — ⑥ La Famille (l'organigramme) — r2 — 2026-09-06

## Verdict : NON APPROUVÉ

L'organigramme est, en géométrie, en couleurs et en typographie, une reproduction très fidèle de la
maquette — mais **l'archétype du lieutenant n'est plus nulle part sur l'écran**, et les trois rangs
sont devenus interchangeables : le but déclaré de l'écran (« lire d'un coup d'œil qui tient quoi »)
n'est plus servi.

> ⚠️ **Chrome non alimenté (signalé en tête, non jugé)** — le bloc de droite du bandeau porte
> « JOUR 50 » **et un tiret « — » sur sa seconde ligne** (mesuré `m38` : « JOUR 50 » occupe y 28..48 px ;
> sous lui, un unique objet clair isolé, **y 87..89 · x 999..1033** — une barre de 35×3 px, pas un
> caractère). Une fente du bandeau n'est pas alimentée. Conformément au dossier, **je ne juge pas le
> chrome** (il se juge contre le canon du HUD, pas contre cette référence). Le contenu de l'écran, lui,
> est jugé, et il ne chevauche ni le bandeau ni le dock (voir contrôle positif n° 31).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les valeurs sont en **px CSS** dans le repère de l'annexe 3 (référence ÷2,00000 ·
capture ÷1,88036). Format : `référence → jeu`.

| # | grandeur | référence | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | largeur de la feuille (encre, bord à bord) | 560,0 (1120 px) | 560,0 (1053 px) | facteur dérivé, pas supposé | `m2`,`m3` |
| 2 | largeur du don-rang (bordure à bordure) | 514,75 | 515,0 | +0,25 | `m32`,`m21` |
| 3 | largeur d'un rang · x0 des rangs · x0 du don-rang | 489,0 · 48,5 · 23,5 | 489,8 · 48,4 · 23,9 | ≤ +0,8 | `m5` |
| 4 | hauteur d'un rang (3 rangs) | 100,5 / 99,0 / 99,0 | 99,5 / 99,4 / 99,5 | ≤ 1,0 | `m5` |
| 5 | pas rang→rang (témoins homologues : boîte vide des deux côtés) | 202,0 | 201,6 | −0,4 | `m20` |
| 6 | diamètre des médaillons de rang (spec CSS 70,93) | 71,00 | 70,73 × 70,20 | ≤ 0,8 | `m28` |
| 7 | centre du médaillon de rang : x · y relatif au rang | 101,00 · 50,50 | 100,78 · 50,53 / 50,49 / 50,28 | ≤ 0,3 | `m28` |
| 8 | médaillon du Don : diamètre · marges dans la boîte | 71,00×70,50 · 16,25 / 15,75 | 70,20×70,20 · 15,55 / 15,00 | ≤ 0,8 | `m28`,`m32` |
| 9 | buste de lieutenant : bbox en % du disque · **largeur d'épaules** · aire | x 27,5..71,1 · y 38,7..93,0 · **43,7 %** · 17,6 % | x 28,5..71,5 · y 38,7..92,3 · **43,0 %** · 17,2 % | ≤ 1,0 pt | `m28` |
| 10 | buste du Don : bbox en % du disque · largeur d'épaules | x 28,1..71,9 · y 41,9..93,5 · 43,8 % | x 28,0..72,0 · y 42,4..92,4 · 43,9 % | ≤ 1,1 pt | `m28` |
| 11 | couleurs de texte, à l'octet : titre · sous-titre/libellé · nom/valeur · puce | (242,201,107) · (185,173,146) · (234,224,200) · (127,212,217) | (242,201,**106**) · identique · identique · identique | ≤ 1 | `m22` |
| 12 | hauteurs de capitale : titre · sous-titre · nom du Don · « A » de la valeur d'état · libellé d'état · puce | 18,50 · 12,00 · 18,00 · 15,50 · 10,50 · 10,50 | 18,08 · 12,76 · 18,08 · 15,42 · 10,64 · 11,70 | ≤ 1,2 | `m7`,`m26`,`m31` |
| 13 | graisse de la valeur d'état : jambages du « A » (contrôle : poids normal = 1,0–1,6 des deux côtés) | 2,38 / 3,00 | 2,62 / 2,75 | ≤ 0,3 | `m36` |
| 14 | puce : hauteur · x0 · épaisseur du contour | 28,00 · 153,00 · 1,00 | 28,19 · 153,16 · 1,00 | ≤ 0,2 | `m29` |
| 15 | ergot du rang (`.rang::before`) : x0..x1 · longueur · couleur | 31,50..48,25 · 16,75 · (176,141,62) | 31,25..48,00 · 16,75 · (168,135,58) | 0,25 · 0,00 · ≤ 8 | `m29` |
| 16 | rail principal : couleur à t = 0,25 / 0,50 / 0,75 de sa hauteur | (147,119,55) / (116,96,49) / (84,72,41) | (145,118,55) / (114,94,48) / (82,70,41) | ≤ 2 | `m18` |
| 17 | rail d'équipe : x0..x1 · hauteur · couleur | 72,75..74,25 · 63,0 · (73,63,39) | 73,25..75,25 · 63,0 · (73,63,40) | ≤ 1,0 | `m29` |
| 18 | boîtes pointillées : hauteur · centrage du texte · période du pointillé | 70,5 · +0,0 · 4,98 | 70,5 · −0,5 · 5,44 | 0,0 · 0,5 · +9 % | `m19` |
| 18-bis | bouton retour : diamètre · boîte d'équipe : largeur · rail principal : largeur | 56,00×56,00 · 440,75 · 2,00 | 56,37×55,84 · 440,75 · 1,62 | ≤ 0,4 · **0,00** · 0,38 | `m37` |
| 19 | boîte « Recruter » : x0..x1 (largeur) · hauteur · marges haute/basse · centrage | 23..537 (515) · 71,0 · 27,5 / 27,5 · +0,25 | 23..537 (515) · 70,5 · 26,8 / 27,2 · +0,56 | ≤ 0,7 | `m21` |
| 20 | bloc « état » aligné à droite (bord d'encre) : valeur · libellé | 521,50 · 519,00 | 520,65 · 520,65 | ≤ 1,7 | `m10` |
| 21 | interligne du bloc « état » · interligne du bloc de tête | 10,50 · 22,50 | 10,10 · 21,27 | −4 % · −5 % | `m31` |
| 22 | bordure du don-rang, 3 côtés sur 4 : bas · gauche · droite (teinte R−B) | +25 · +27 · +23 | +25/+32 · +25 · +18 | teinte or conservée | `m33` |
| 23 | liseré interne **bas** des rangs · pied du dégradé | (7,10,15) · (16,21,30) | (6,9,17) · (15,18,28) | ≤ 3 | `m14` |
| 24 | fond de la feuille | (22,25,27) | (22,22,28) | ≤ 3 | `m2` |
| 25 | **espace de mélange, translucidités PLATES** : contour de puce `#7fd4d955` · rail d'équipe `#b08d3e55` · remplissage du retour `#ffffff08` · bordure du don-rang `#d9ab4e44` | prédiction **sRGB** à ≤ 3/255 | prédiction **sRGB** à ≤ 4/255 | même modèle | `m16` |
| 26 | **espace de mélange, rampe d'alpha du rail principal** (1,00 → 0,20) | sRGB 12 / LIN 140 ⇒ **sRGB** | sRGB 10 / LIN 151 ⇒ **sRGB** | même modèle | `m18` |
| 27 | contrastes : titre · sous-titre · nom · puce · valeur d'état · libellé d'état · boîte vide | 10,77 · 7,86 · 13,69 · 10,65 · 13,69 · 8,18 · 7,95 | 10,42 · 7,64 · 13,50 · 10,70 · 13,64 · 8,20 · 8,11 | tous ≥ 7,6:1 (seuils 3:1 / 4,5:1) | `m22` |
| 28 | luminance moyenne · densité d'encre (même contenu borné à la boîte « Recruter ») | 29,09/255 · 6,15 % | 28,41/255 · 5,37 % | −2,3 % · −0,78 pt | `m22` |
| 29 | plateau du filet de tête (excès sur le fond) | +118 | +120 | +2 | `m15` |
| 30 | palette dominante (3 premières couleurs) | 46,7 % (22,25,27) · 22,6 % (18,25,36) · 16,5 % (17,21,28) | 41,2 % (22,22,28) · 24,7 % (17,22,34) · 14,1 % (16,19,28) | même ordre, mêmes familles | `m22` |
| 31 | **gouttière** : dernier objet du chrome haut · feuille · premier objet du dock | — | y 231 px · **232..2151** · y 2179 px | aucun chevauchement | `m23` |
| 32 | nombre de lignes d'information dans la colonne « qui » (3 rangs) | 2 · 2 · 2 | 2 · 2 · 2 | 0 | `m35` |
| 33 | nombre de rangs · cohérence avec le sous-titre | 3 · « 3 LIEUTENANTS » | 3 · « 3 LIEUTENANTS » | 0 | `m5`,`m7` |
| 34 | rang du Don : position verticale du nom dans la boîte | 29,75..48,25 | 29,91..48,52 | ≤ 0,3 | `m35` |
| 35 | chevron « ‹ » et remplissage du bouton retour | présent · excès +4 sur le fond | présent · excès +5 | ≤ 1 | `m8`,`m16` |

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir la Famille : qui la compose, ce que chacun tient, et ce qui manque à la table. C'est un
mur de photos, pas un tableau de bord — on n'y agit qu'à la fin (« Recruter »).

**Ordre de lecture.** (1) « LA FAMILLE » — le seul or vif de la moitié haute, capitale de 18,5, en haut
à gauche ; (2) le rang du Don — la seule boîte à bordure dorée, le seul médaillon halé, isolé au-dessus
de l'arbre ; (3) la colonne des trois rangs, chacun s'ouvrant à gauche sur un **archétype** en serif
crème et se fermant à droite sur un **état** en gras ; (4) les boîtes pointillées, plus pâles, qui
disent le vide sans faire de bruit ; (5) l'appel « Recruter un nouveau lieutenant », en pied.

**Zones.** Tête (retour · titre · sous-titre · filet) — rang du Don — arbre (rail laiton vertical,
ergots, 3 rangs, blocs d'équipe) — appel à l'action.

**Traits d'identité** (ce qui fait qu'on reconnaît *cet* écran) :
1. l'or sur encre bleu-nuit, avec **un seul or vif** réservé au titre et au Don ;
2. le **rail vertical laiton et ses ergots** — c'est lui qui fait un ARBRE d'un empilement ;
3. les **médaillons-bustes** à anneau laiton, tous au même diamètre, le Don seul en or vif et halé ;
4. le **rang à deux étages** : à gauche QUI (archétype puis puce), à droite l'ÉTAT aligné à droite ;
5. les **boîtes pointillées**, qui disent l'absence sur un ton mineur.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour le décor, non pour le propos. La palette, le rail, les médaillons, les boîtes pointillées, le
rythme des rangs et **toutes** les couleurs de texte sont là, à l'octet et au dixième de px CSS : on
reconnaît l'écran immédiatement, et l'ordre de lecture (titre → Don → arbre → recruter) est intact.

Ce qui a changé, c'est **ce que chaque rang raconte**. Dans la maquette, la ligne de tête d'un rang dit
le métier — « Comptable », « Sécurité », « Blanchiment » — et l'œil trie la Famille en un balayage.
Dans le jeu, elle dit un nom — « Lt. Oster », « Lt. Brasse », « Lt. Sallo » — et **plus rien ne dit qui
tient quoi** : les trois rangs sont typographiquement et sémantiquement identiques (nom + « RÉCENT » +
« Au repos »). La colonne « qui » porte exactement **deux** lignes des deux côtés (mesuré, 3 rangs sur
3) : le nom a pris la place de l'archétype, il n'y a pas de troisième fente. C'est le seul écart qui
casse le **but** de l'écran, et c'est pour lui que le verdict est NON APPROUVÉ.

Le deuxième écart perçu est l'**en-tête** : il est 12 % plus haut, et tout le vide est allé se loger
entre le sous-titre et le filet (24,0 → 43,1 CSS, +80 %). Le bloc titre, lui, est *monté* de 4,5. Le
résultat se lit comme un filet décroché de son sous-titre, et il pousse tout le contenu de +11 à +14 CSS.

Le troisième est un faisceau de **retraits d'intensité** qui vont tous dans le même sens : le halo du
Don à 44 % de sa valeur, l'ombre portée des rangs à 56 %, l'anneau du bouton retour à 53 %. Chacun est
mineur seul ; ensemble ils expliquent les −13 % de densité d'encre, et l'écran en jeu est un peu plus
plat que la maquette — les rangs décollent moins du fond, le Don brille moins que ses lieutenants ne
le suggèrent.

Tout le reste tient : contrastes tous ≥ 7,6:1, aucune coupe, aucun débordement, aucune collision, le
contenu strictement entre le bandeau et le dock, les bustes entiers (épaules comprises — le piège
maison de la silhouette tronquée ne s'est pas déclenché).

---

## 3. Écarts

Un finding par ligne. **`données : oui`** = observation datée qui dépend du compte photographié ;
**`non`** = vraie quelles que soient les données. Les tables ASSUMÉ et ARBITRAGE sont **à part** et ne
sont pas comptées ici.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | **BLOQUANT** | **NOUVEAU** | non | **L'archétype du lieutenant n'existe nulle part sur l'écran.** La maquette met l'archétype en ligne de tête du rang (serif crème, la plus grosse encre du bloc « qui ») ; le jeu y met le nom, et l'archétype n'a aucune autre fente. Les trois rangs deviennent interchangeables : « Lt. X » + « RÉCENT » + « Au repos », trois fois. | La colonne « qui » (x 145..400) porte **exactement 2 lignes d'information dans les 3 rangs des deux côtés** — réf. `[(27,0..45,0),(57,5..71,5)]`, jeu `[(25,0..42,6),(59,0..74,5)]` (`m35`, contrôles 5/6 : la 6ᵉ échoue parce que le « p » de « Repos » ponte les deux lignes du bloc *état* de la référence). Inventaire exhaustif des blocs d'encre claire de la feuille (`m34`) : 5 blocs par bande de rang côté jeu — ergot 31,4..48,4 · médaillon 65,4..136,1 · nom 154,8..246,8 · valeur d'état 418,0..445,7 · libellé 458,4..520,6. Aucun n'est un archétype. | Depuis l'image seule je ne peux pas dire si le client possède une fente « archétype » restée **vide** (donnée absente pour ce compte) ou n'en possède **aucune**. La mesure hors image qui trancherait : le corps réel de `GET /v1/lieutenants` pour ce compte (le dossier le situe dans `juge-donnees/famille/cloture-2026-09-06/corps-reels/`) confronté à ce que le rang affiche. |
| `F2` | **MAJEUR** | DÉJÀ APPLIQUÉ | non | **L'en-tête est ~12 % plus haut, et tout le supplément est le vide sous-titre → filet.** Le filet se lit décroché de son sous-titre, et tout le contenu descend. | Hauteur de tête (haut de feuille → filet) **115,00 → 128,75** CSS (+13,75 ; **+11,96 %**). Le bloc titre+sous-titre *monte* de 4,5 (titre 38,00 → 33,50 ; sous-titre 79,00 → 72,86) et son interligne interne est stable (22,50 → 21,27, −5 %). Vide sous-titre → filet **24,00 → 43,13** (+19,13 ; **+79,7 %**). Décalage induit sur le contenu : don-rang +14,0 · rang 1 +11,8 · rang 2 +11,4 (`m7`,`m20`,`m31`). | — |
| `F3` | MINEUR | **NOUVEAU** | non | **La rampe d'alpha du filet de tête est composée dans un autre espace que la maquette** : le filet monte à pleine intensité beaucoup plus près du bord au lieu de s'y éteindre. | Test de modèle à **une variable** (alpha connu de la CSS, fond et laiton plein mesurés sur *chaque* image, 10 points, plus un contrôle à α = 1 où les deux prédictions coïncident et où l'écart est 0 des deux côtés) : **RÉFÉRENCE** somme des écarts sRGB **2**/255 · linéaire **270**/255 ⇒ sRGB ; **JEU** sRGB **275**/255 · linéaire **7**/255 ⇒ **LINÉAIRE** (`m17`). Symptôme (grandeur déjà présente au r1) : à 8 % de la largeur de feuille +17 → **+39** ; à 12 % +34 → **+61** ; plateau +118 → +120 ; bornes à +10/255 40..520 → 30..530 (`m15`). **Portée : c'est une INSTANCE, pas une classe** — le même protocole sur la rampe du rail principal donne sRGB des deux côtés (jeu : sRGB 10 · LIN 151, `m18`), et les 4 translucidités plates testées tombent sur sRGB à ≤ 4/255 des deux côtés (`m16`). | Je n'ai pas pu tester d'autre rampe d'alpha de ce type sur cet écran — il n'y en a qu'une. Ce qui trancherait si la classe est plus large : le même protocole sur un dégradé d'un autre écran. |
| `F4` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le halo du médaillon du Don pèse moins de la moitié.** C'est, avec l'anneau or vif, la seule marque de rang du Don. | Intégrale d'excès du canal R par px CSS, **halo net** (mesure − contrôle négatif pris sur un médaillon de lieutenant, qui n'a pas de `box-shadow`) : **99,0 → 44,0** (44 %) ; pic au ras de l'anneau **+17 → +9** ; portée (≥ 2/255) **12,0 → 10,0** CSS. Contrôle négatif : réf. **0,0**, jeu **12,5** (biais plat de +1/255) (`m28`). L'anneau or vif lui-même, marqueur primaire, est intact (diam. 71,00 → 70,20). | — |
| `F5` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'ombre portée des rangs pèse ~56 %** : les rangs décollent moins du fond. | Creux de luminance sous le bord bas, mesuré **à partir de 1,5 CSS** (les 1,5 premiers px sont le liseré interne `inset 0 -1px rgba(0,0,0,.5)`, un autre dispositif) : **−12,6 → −7,1** /255 (−44 %) ; portée (|Δ| > 2) **12,5 → 9,0** CSS (`m15`). | — |
| `F6` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'anneau du bouton retour a perdu près de la moitié de son énergie de trait** ; le cercle se lit à peine. Le chevron, lui, est là. | Énergie de trait par px CSS (4 profils cardinaux, ligne de base locale prise de part et d'autre de la bande d'anneau) : **49,8 → 26,6** (−47 %) ; pic au-dessus de la base **+36 → +17** ; contraste anneau/fond **1,66:1 → 1,29:1**. Contrôle positif (anneau laiton d'un médaillon) 149,4 → 115,0, fort des deux côtés ; contrôle négatif (aplat de feuille) 9,0 / 10,4 (`m9`,`m8`). Le remplissage interne est conforme (`#ffffff08`, prédiction sRGB à ≤ 4/255, `m16`). | La cause n'est pas un espace de mélange : un mélange linéaire rendrait l'anneau **plus** clair, pas moins. Je ne peux pas trancher entre une épaisseur de trait plus fine et un alpha plus bas depuis l'image. |
| `F7` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'interligne du bloc « qui » du rang est 19 % plus lâche** : la puce descend, le nom monte. | Interligne (ligne de base de la ligne 1 → sommet du corps de la ligne 2), même instrument des deux côtés, témoins homologues sans jambage descendant : **16,50 → 19,68** CSS (**+19 %**). Mesure indépendante du même écart (bas d'encre du nom → haut de la puce) : 7,50 → 11,70 (`m31`,`m10`). | — |
| `F8` | MINEUR | DÉJÀ APPLIQUÉ | non | **Dans le rang du Don, l'écart inverse : l'interligne est 33 % plus serré.** Le bloc du Don paraît tassé là où le rang est plus lâche — **écart sélectif**, donc ce ne sont pas les mêmes conteneurs. | Interligne nom → rôle **19,00 → 12,76** CSS (**−33 %**). Les deux autres blocs à deux lignes de l'écran sont, eux, conformes : bloc « état » 10,50 → 10,10 (−4 %), bloc de tête 22,50 → 21,27 (−5 %) — 2 blocs sur 4 dérivent (`m31`). | — |
| `F9` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le libellé d'état n'est pas mis en capitales** (`text-transform:uppercase` dans la CSS). C'est le seul micro-libellé de l'écran qui ne l'est pas : « 3 LIEUTENANTS », « RÉCENT », « LE DON » le sont. | Instrument de casse par **corps de lettre** (l'accent, blob séparé, est retiré), **6 contrôles sur 6 passés** (3 positifs : sous-titre, puce, rôle du Don ⇒ CAPITALES des deux côtés ; 3 négatifs : nom de rang, texte de boîte vide ⇒ CASSE MIXTE des deux côtés). Sujet : réf. « ÉTAT » corps `[10,5 · 10,5 · 10,5 · 10,5]` ⇒ **CAPITALES** ; jeu « État » corps `[accent 2,13 · 10,64 · 10,10 · 8,51 · 10,10]` ⇒ **CASSE MIXTE** (le « a » à 80 % du max) (`m26`). Hauteur de capitale (10,50 → 10,64) et couleur (185,173,146) identiques. **La grandeur figure dans `grandeurs-r1` ; l'instrument, lui, est neuf** — le tour précédent lisait la casse à l'œil sur un zoom ×4. | — |
| `F10` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le rayon des coins des rangs est ~2 CSS plus serré.** | Ajustement du profil du coin haut-gauche, **même instrument des deux côtés** : rangs **21,7 / 21,8 / 21,8 → 19,8 / 19,7 / 19,6** (Δ ≈ **−2,1**). Valeur CSS 22,4 ⇒ biais commun de l'instrument ≈ −0,6 : **seule la différence est opposable** (`m13`). | Le don-rang ne s'ajuste pas côté jeu (erreur résiduelle 1,23 contre 0,03 pour les rangs) : sa bordure dorée perturbe le discriminant B−R. **Non conclu pour ce seul panneau.** |
| `F11` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le sommet du dégradé des rangs est plus bleu, et son liseré interne haut suit.** Une cause, pas deux : le liseré surligne le fond qu'il a sous lui. | Sommet du dégradé (5 % de la hauteur) **(19,25,36) → (21,27,41)**, ΔB **+5** ; liseré interne haut **(54,60,69) → (56,64,78)**, ΔB **+9**. Le pied du dégradé, lui, est égal ((16,21,30) → (15,18,28)) (`m14`). | — |
| `F12` | MINEUR | **NOUVEAU** | non | **Le bord HAUT du rang du Don porte un liseré clair que la maquette n'a pas.** La CSS ne donne au don-rang qu'un `border:1px solid #d9ab4e44` — pas de `inset … rgba(255,255,255,.15)`, contrairement aux rangs. | Bord haut : réf. **(68,60,43)**, teinte R−B **+25**, ~1,0 CSS ; jeu **(86,82,76)**, teinte R−B **+10**, puis ~0,5 CSS de plus à (39,39,44). **+18 sur le canal R** (+21,9 de luminance) et une teinte devenue presque neutre. Les 3 autres côtés sont conformes (bas R−B +25/+32, gauche +25, droite +18 vs +23). Contrôle : sur un rang ordinaire, le liseré blanc existe des deux côtés ((54,60,69) / (56,64,78)) (`m33`). | — |
| `F13` | MINEUR | DÉJÀ APPLIQUÉ | non | **La fente du NOM du rang du Don porte un pronom en CAPITALES** là où la maquette porte un nom propre en casse mixte ; et les deux fentes ont échangé leur rôle (maquette : `<nom>` / `<relation>` — jeu : `<relation>` / `<titre>`). La forme (taille, couleur, position) est, elle, exacte. | Instrument de casse (le même, 6/6 contrôles) : réf. « Don V. » corps `[17,5 · 12,5 · 12,5 · 18,0]` ⇒ **CASSE MIXTE** ; jeu « VOUS » corps `[17,55 · 18,08 · 18,08 · 18,08]` ⇒ **CAPITALES** (`m26`). Hauteur de capitale 18,00 → 18,08, couleur (242,201,107) → (242,201,106), x0 132,50 → 130,83 (`m11`). La fente du RÔLE reste en capitales des deux côtés (« VOUS » → « LE DON », chasse 48,50 → 71,26 — chaînes différentes). **La grandeur figure dans `grandeurs-r1` ; l'instrument de casse, lui, est neuf.** | Le contenu (aucun nom de joueur n'existe côté back) relève d'un arbitrage produit — voir la table ARBITRAGE. Ce que je constate ici est **la casse**, et le fait que la table des écarts assumés du dossier **ne couvre pas le rang du Don** (sa clause vise « les noms de rang »). |

**Compte : 13 findings — 1 BLOQUANT · 1 MAJEUR · 11 MINEUR.** Aucun ne dépend des données.

### Observations DATÉES (dépendent du compte photographié) — hors compte

| # | observation | mesure |
|---|---|---|
| D1 | Les trois rangs portent le **même** état (« Au repos ») et la **même** puce (« RÉCENT ») ; la maquette montre Actif / Repos / Actif et Délégué / Direct / Délégué. Cela accentue F1 mais ne le cause pas. | 3 rangs, 3 fois `418,0..445,7` + `458,4..520,6` (`m34`) |
| D2 | Le 2ᵉ rang de la maquette porte une puce « Voir l'équipe » là où le jeu affiche une 3ᵉ boîte pointillée ⇒ le pas rang 2 → rang 3 diffère (175,0 → 201,5). **Témoins non homologues** : le pas comparable est rang 1 → rang 2, égal (202,0 → 201,6). | `m20` |
| D3 | La valeur d'état est deux fois plus large qu'en maquette (« Au repos » vs « Actif ») : bord gauche 471,0 → 418,0 CSS. Aucune collision ici (le nom le plus long finit à 254,2 ⇒ 163,8 CSS de marge). | `m10` |
| D4 | Aucun lieutenant n'est actif ⇒ la variante `.rang.actif` de la maquette (fond `#101a2ae0`, appliquée à son 1ᵉʳ rang) n'a pas d'homologue observable. **Témoin retenu pour tout le rapport : les rangs 2 et 3 de la maquette.** | `m30` |

### Écarts ASSUMÉS — vérification « rendu proprement »

| ce que le dossier assume | rendu proprement ? | mesure |
|---|---|---|
| noms de rang « Lt. Oster / Lt. Brasse / Lt. Sallo » | **OUI** — présents, non tronqués, casse mixte, couleur (234,224,200) identique à la maquette | chasse 99,45 CSS, marge disponible 163,8 avant la valeur d'état (`m10`) |
| pas de « Loyauté 82 % » | **OUI** — aucune jauge, aucun pourcentage sur la feuille | inventaire exhaustif `m34` |
| « Aucune équipe rattachée » sous chaque lieutenant | **OUI** — 3 boîtes, libellé présent, centré, géométrie identique | h 70,5 = 70,5 · centrage −0,5 (`m19`) |
| la puce montre l'ANCIENNETÉ (« RÉCENT ») | **OUI** — puce non vide, capitales, cyan identique, contour 1,00 CSS | `m26`,`m29` |
| pas de chip « Retiré », pas de rang grisé · pas de « District du Don » · pas de bandeau « siège libre » | **OUI** — aucun des trois | `m34` |
| bustes contemporains (Don nu, lieutenant à capuche) | **OUI — et le piège maison de la silhouette tronquée ne s'est pas déclenché** : épaules présentes | largeur d'épaules 43,7 % → 43,0 % du disque ; bbox y 38,7..93,0 → 38,7..92,3 (`m28`) |
| ⚠️ « archétypes en français (Cuisinier, Comptable…) » | **NON — cette ligne d'assumé n'a plus d'objet.** Sa clause de sortie vise un enum brut ou un repli anglais ; elle **ne couvre pas l'absence**. Reclassée en `F1`. | `m34`,`m35` |

### ARBITRAGES — non corrigibles côté client, ou décision produit

| # | arbitrage | mesure |
|---|---|---|
| `A1` | **Police.** La référence a été rendue avec **Noto Sans / Noto Serif** (substitution système, `fc-match` cité par le dossier) ; le client embarque **DejaVu**. Sur **deux chaînes strictement identiques des deux côtés** : « Aucune équipe rattachée » chasse **240,0 → 264,8** (+10,3 %) à hauteur d'encre égale (21,0 → 21,3) ; « Recruter un nouveau lieutenant » **303,5 → 332,4** (+9,5 %) à hauteur d'encre 16,00 → 16,49. Le titre : chasse 200,0 → 205,3 (+2,6 %), capitale 18,50 → 18,08. **La chasse est un arbitrage ; la hauteur de capitale, comparée, est conforme.** (`m19`,`m21`,`m7`) |
| `A2` | **Le rang du Don n'a pas de nom à afficher** (aucun nom de joueur côté back). La maquette montre « Don V. » ; le client montre « VOUS / LE DON ». Le choix du contenu est un arbitrage produit ; ce qui reste corrigible côté client est la **casse** et la **répartition des deux fentes** — voir `F13`. |
| `A3` | **La maquette est en retard sur la donnée** : elle dessine des puces « Délégué / Direct » que le back ne peut pas servir (`mode` constant en production, E7 du dossier) et un archétype par rang. Le client a raison sur la puce ; la maquette a raison sur **la présence** d'un archétype (`F1`). À porter à « maquette à mettre à jour » : la puce, **pas** l'archétype. |

---

## 5. Autres résolutions

**Une seule résolution est fournie** (1080×2400, la cible portrait 20:9). Rien n'est donc vérifié sur le
reflux, la coupe, le débordement ou la conservation des proportions à une autre taille — voir § 6.

Ce qui est vérifié **à 1080×2400** : la feuille occupe x 13..1065 (1053 px) et y 232..2151 (1920 px) ;
aucun contenu ne sort de la feuille ; le dernier objet du chrome haut finit à y = 231 px et le premier
objet du dock commence à y = 2179 px, donc **la gouttière est respectée aux deux bouts** ; le contenu
s'arrête à y = 2005 px et laisse 77,6 CSS de feuille vide sous la boîte « Recruter » (la maquette étant
rognée à l'encre, cette réserve n'a pas d'homologue et n'est pas un écart).

---

## 6. Ce que je n'ai pas pu vérifier

1. **Une seule résolution.** Aucun jugement possible sur le reflux, la troncature ou le débordement à
   une autre taille. *Ce qui trancherait :* une seconde capture (p. ex. 1080×1920) et le même
   inventaire en % de la largeur de feuille.
2. **Aucune paire T / T+1 s.** Le ruling « aucune animation sur un nouvel écran » (2026-08-27) n'est
   donc **pas vérifié**. *Ce qui trancherait :* deux captures du même état à 1 s d'écart et un compte
   de pixels différents, chrome exclu.
3. **Identité photographiée non relue.** Le dossier cite la ligne
   `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` depuis le message de commit,
   mais **ne joint pas le journal**. Toute comparaison de **valeur** (les trois noms, la minute 72 013,
   le solde du bandeau) reste donc non prouvée **par moi** ; la **forme**, elle, se juge, et c'est ce
   que fait ce rapport. *Ce qui trancherait :* le journal du run `CaptureFamille`, ou la garde
   `MAFIA_CAPTURE_EXPECT_PLAYER` armée sur cette suite (TD-640).
4. **F1 — fente vide ou fente absente ?** L'image ne le dit pas. *Ce qui trancherait :* le corps réel
   de `GET /v1/lieutenants` pour ce compte, confronté à ce que le rang affiche.
5. **Variante `.rang.actif` non observable** : aucun lieutenant n'est actif dans cette donnée. Je n'ai
   donc pas pu vérifier que le client sait la rendre. *Ce qui trancherait :* une capture avec au moins
   un lieutenant actif.
6. **Rayon des coins du don-rang côté jeu : non conclu** (l'ajustement échoue, erreur 1,23 contre 0,03
   pour les rangs — la bordure dorée perturbe le discriminant). Seuls les rangs sont opposables (`F10`).
7. **Chrome non jugé** (règle du dossier). Je signale seulement que le bloc JOUR porte « JOUR 50 » **et
   un tiret sur sa seconde ligne** ⇒ une fente du bandeau n'est pas alimentée. *Ce qui trancherait :*
   le canon du HUD, hors périmètre de ce dossier.
8. **Aucune capture « avant »** n'est fournie et le rapport r1 ne m'est délibérément pas donné : je n'ai
   comparé qu'à la référence. Les mentions « DÉJÀ APPLIQUÉ » viennent de `grandeurs-r1.md` (valeurs sans
   verdict), pas d'un rapport.
9. **Collision nom long / valeur d'état non observable.** « Au repos » occupe 102,6 CSS contre 50,5 pour
   « Actif » ; le nom le plus long de ce compte ne fait que 99,45 CSS. *Ce qui trancherait :* une capture
   avec le nom le plus long que le catalogue peut servir.
10. **Cause de `F6` non tranchée** : je peux exclure l'espace de mélange (un mélange linéaire rendrait
    l'anneau plus clair, pas moins) mais pas départager « trait plus fin » de « alpha plus bas ».
11. **Portée de `F3` bornée à l'écran.** Une seule rampe d'alpha de ce type existe ici. Que l'anomalie
    soit propre à ce dispositif ou partagée par d'autres écrans n'est pas décidable depuis ce dossier.
12. **Graisse non mesurée** pour le nom de rang (serif) et le titre ; seule celle de la valeur d'état
    l'a été (`m36`).

---

## Annexes

### 1. Inventaire de la référence (fiches + couche globale)

Repère : origine au coin haut-gauche de la feuille, unité CSS (÷2,00000).

| id | catégorie | parent | bbox CSS (x0,y0,x1,y1) | forme / remplissage / bord | texte |
|---|---|---|---|---|---|
| `T` | tête | feuille | 0, 0, 560, 115 | voile radial or (excès +11,+8,+3 au sommet, éteint à y 80) | — |
| `T.retour` | bouton | `T` | 26,00 · 34,00 · 82,00 · 90,00 | cercle Ø **56,00 × 56,00** (valeur CSS 56) ; anneau 1 CSS, pic +36 sur le fond, contraste 1,66:1 ; remplissage `#ffffff08` | chevron « ‹ » |
| `T.titre` | titre | `T` | 101,5 · 38,0 · 301,5 · 56,5 | serif, capitales, interlettrage large | « LA FAMILLE », (242,201,107), capitale 18,50 |
| `T.sous` | texte | `T` | 101,5 · 79,0 · 252,0 · 91,0 | sans-sérif, capitales | « 3 LIEUTENANTS », (185,173,146), capitale 12,00 |
| `T.filet` | séparateur | `T` | 22,4 · 115,0 · 537,6 · 116,0 | 1 CSS, laiton (176,141,62), **rampe d'alpha linéaire composée en sRGB** ; +17 à 8 %, plateau +118 | — |
| `D` | plaque | feuille | 22,5 · 134,75 · 537,25 · 237,25 | rayon 21,5 ; dégradé (19,25,36) → (16,21,30) ; bordure or 1 CSS sur **4 côtés**, R−B +25 | — |
| `D.medl` | médaillon | `D` | 42,0 · 151,0 · 113,0 · 221,5 | Ø 71,0 ; anneau or vif ; **halo, intégrale 99,0 · pic +17 · portée 12,0** | buste « Don » nu, épaules 43,8 % |
| `D.nom` | texte | `D` | 132,5 · 165,0 · 205,5 · 183,0 | serif, **casse mixte** | « Don V. », (242,201,107), capitale 18,00 |
| `D.role` | texte | `D` | 132,0 · 201,5 · 180,5 · 213,0 | capitales | « VOUS », (185,173,146), 11,50 |
| `A.rail` | rail | feuille | 31,38 · 232,5 · 33,25 · 797,0 | largeur **2,00** mesurée à mi-hauteur ; dégradé d'alpha 1,00 → 0,20, **sRGB** | — |
| `R1..R3` | plaque | `A` | 48,5 · {252,5 / 454,5 / 629,5} · 537,0 · +99..100,5 | rayon 21,8 ; dégradé (19,25,36) → (16,21,30) ; liseré interne haut (54,60,69), bas (7,10,15) ; **ombre portée creux −12,6, portée 12,5** ; ergot 16,75 à mi-hauteur | — |
| `R*.medl` | médaillon | `R*` | 65,5 · +15,0 · 136,5 · +86,0 | Ø 71,0 ; anneau laiton (176,141,62) | buste « lieutenant » à capuche, épaules 43,7 % |
| `R*.nom` | texte | `R*` | 154,0 · +27,0 · … | serif, casse mixte | **l'ARCHÉTYPE** (« Comptable » / « Sécurité » / « Blanchiment »), (234,224,200) |
| `R*.puce` | puce | `R*` | 153,0 · +52,0 · 251,0 · +80,0 | pilule, contour 1,00 CSS, `#7fd4d955` → (54,87,95) | « DÉLÉGUÉ » / « DIRECT », capitales, (127,212,217) |
| `R*.etatv` | texte | `R*` | … · +32,0 · 521,5 · +48,5 | gras (jambages 2,4–3,0), aligné à droite | « Actif » / « Repos », (234,224,200), capitale 15,50 |
| `R*.etatl` | texte | `R*` | 484,5 · +55,5 · 519,0 · +69,5 | **capitales**, interlettrage | « ÉTAT », (185,173,146), corps 10,50 |
| `E*` | boîte | `A` | **96,75** · 368,5 · **537,25** · 439,0 (largeur 440,75 · h 70,5) | pointillé `#ffffff22`, période 4,98 | « Aucune équipe rattachée », centré (+0,0), encre 21,0 |
| `V` | boîte | feuille | 23,0 · 835,0 · 537,0 · 906,0 | pointillé, marges 27,5 / 27,5 | « Recruter un nouveau lieutenant », centré (+0,25), encre 16,00 |

**Couche globale (référence).** Luminance moyenne 29,09/255 · densité d'encre 6,15 % · palette :
46,7 % (22,25,27) · 22,6 % (18,25,36) · 16,5 % (17,21,28) · 6,4 % (25,25,27) · 6,2 % (41,46,49).
Rythme vertical (frontières) : 0 · 38 · 79 · 115 · 136 · 236 · 252,5 · 353 · 368,5 · 439 · 454,5 ·
553,5 · 629,5 · 728,5 · 835 · 906. Contrastes texte/fond : 7,86 à 13,69:1.

### 2. Inventaire de la capture (fiches + couche globale)

Même découpage, mesuré **depuis les pixels de la capture** (÷1,88036, origine 13, 232). Seules les
fiches qui **diffèrent** sont reprises ; toutes les autres sont dans le contrôle positif ci-dessus.

| id | ce que la capture porte |
|---|---|
| `T` | hauteur **128,75** (au lieu de 115,0) ; voile radial encore à +7 à y 80 (il suit la tête plus haute) |
| `T.retour` | Ø **56,37 × 55,84** ; mais **y 30,31..86,15 — le bouton est monté de 3,7 CSS** (avec tout le bloc de tête, `F2`) ; anneau **pic +17**, contraste **1,29:1** ; remplissage conforme ; chevron présent |
| `T.titre` | y **33,5..51,6** (monte de 4,5) ; chasse 205,3 (+2,6 %) ; couleur (242,201,106) |
| `T.sous` | y **72,86..85,62** ; chasse 160,1 (+6,4 %) |
| `T.filet` | y **128,75** ; **rampe composée en LINÉAIRE** (+39 à 8 %, +61 à 12 %) ; plateau +120 |
| `D` | 22,4 · **148,25** · 537,2 · **249,00** (h 100,75) ; **bord haut (86,82,76), R−B +10** — liseré clair en trop ; 3 autres côtés conformes |
| `D.medl` | Ø 70,20 ; **halo net 44,0 · pic +9 · portée 10,0** |
| `D.nom` | « **VOUS** », **CAPITALES**, capitale 18,08, (242,201,106), x0 130,83 |
| `D.role` | « **LE DON** », capitales, 12,24 ; interligne nom→rôle **12,76** (−33 %) |
| `R1..R3` | rayon **19,7** ; dégradé **(21,27,41)** → (15,18,28) ; liseré interne haut **(56,64,78)** ; **ombre creux −7,1, portée 9,0** |
| `R*.nom` | **le NOM du lieutenant** (« Lt. Oster / Lt. Brasse / Lt. Sallo »), casse mixte, (234,224,200), capitale 17,02 — **l'archétype n'est nulle part** |
| `R*.puce` | « RÉCENT », capitales, cyan identique, h 28,19 ; **interligne nom→puce 19,68** (+19 %) |
| `R*.etatv` | « Au repos », gras conforme, capitale 15,42, bord droit 520,65, bord gauche **418,0** |
| `R*.etatl` | « **État** », **CASSE MIXTE**, corps 10,64, couleur identique |
| `E*` | **trois** boîtes (la maquette en a deux plus une puce « Voir l'équipe ») ; x **97,25..537,75** (largeur **440,75**, identique) ; h 70,5 ; période 5,44 |
| `V` | identique (23..537, h 70,5, centré) ; texte +9,5 % de chasse |

**Couche globale (capture).** Luminance moyenne 28,41/255 (−2,3 %) · densité d'encre 5,37 %
(−0,78 pt) · palette : 41,2 % (22,22,28) · 24,7 % (17,22,34) · 14,1 % (16,19,28) · 11,7 % (23,22,28) ·
6,0 % (40,42,46). Rythme vertical : 0 · 33,5 · 72,9 · 128,75 · 150 · 249 · 264,3 · 363,8 · 380 · 450,5 ·
465,9 · 565,3 · 667,4 · 766,9 · 872,7 · 943. Contrastes texte/fond : 7,64 à 13,64:1.

### 3. Correspondance des repères (échelle, offset)

| | origine (px de l'image) = (0,0) CSS | largeur mesurée | facteur |
|---|---|---|---|
| RÉFÉRENCE `reference-1120.png` | (0, 0) | 1120 px pour 560 CSS (donné par le dossier) | **×2,00000** |
| CAPTURE `capture-1080x2400.png` | **(13, 232)** | **1053 px** mesurés pour 560 CSS | **×1,88036** |

La feuille de la capture a été trouvée par la frontière avec le fond hors-feuille (11,11,11), identique
sur trois lignes calmes (y = 1420, 1800, 2100) : **x 13..1065**, **y 232..2151** (1920 px = 1021,1 CSS —
la maquette étant rognée à l'encre, sa hauteur 925 CSS n'est pas comparable). Le facteur n'est **pas**
la largeur de l'écran : sans cette mesure, tout l'écran paraîtrait 6 % trop petit. **Toute grandeur
« CSS » de ce rapport est dans ce repère.**

### 4. Scripts

Dans `mesures/`. Chacun imprime la taille des images qu'il ouvre (via `lib.charger()`).

| script | grandeur | contrôles |
|---|---|---|
| `lib.py` | repères, conversion CSS↔px, médiane de fenêtre, contraste WCAG | — |
| `m1_cadre.py`, `m2_feuille.py`, `m3_echelle.py` | bornes de la feuille, facteur d'échelle | fond hors-feuille ≠ fond de feuille ; 3 lignes calmes concordantes |
| `m4_structure.py`, `m5_panneaux.py` | bandes d'encre, bornes des panneaux (discriminant B−R ≥ 12) | largeur du don-rang = 513 des deux côtés ; le fond de feuille ne produit aucune bande |
| `m6_zooms.py` | découpes côte à côte à la même échelle CSS (`z_*.png`) | — |
| `m7_tete.py` | filet, bouton retour, titre, sous-titre | x0 du bouton retour = 26,1 CSS des deux côtés |
| `m8_retour.py`, `m9_anneaux.py` | énergie de trait d'un anneau | **positif** : anneau laiton d'un médaillon (fort des 2 côtés) · **négatif** : aplat de feuille (≈ 0) |
| `m11_donrang.py`, `m32_donbox.py`, `m33_don_bordure.py` | fentes du rang du Don, bornes et bordure de sa boîte | contrôle sur un rang ordinaire (liseré blanc attendu des 2 côtés) |
| `m12_halo.py`, `m28_medaillons.py` | halo du Don, position et diamètre des médaillons, bustes | **négatif** : médaillon de lieutenant, sans `box-shadow` (réf. 0,0) |
| `m13_coins.py` | rayon des coins (ajustement) | la référence doit approcher la valeur CSS 22,4 (obtenu 21,7–21,8) |
| `m14_panneau_fond.py`, `m15_ombre_filet.py` | dégradé, liserés, ombre portée, extinction du filet | ligne de base prise hors de portée de l'ombre |
| `m16_melange.py`, `m17_rampe.py`, `m18_rampes_classe.py` | **espace de mélange** : 4 translucidités plates, la rampe du filet, la rampe du rail | **positif** : à α = 1 les deux prédictions coïncident et l'écart est 0 des deux côtés |
| `m19_boites.py`, `m21_recruter.py` | boîtes pointillées et boîte « Recruter » | largeur = 515 CSS des deux côtés |
| `m20_rythme.py` | rythme vertical et dérive cumulée | témoins homologues explicités |
| `m22_couche_globale.py` | palette, luminance, densité, contrastes | zone bornée au même contenu des deux côtés |
| `m24_casse_etat.py` | **instrument de casse v1 — RÉFUTÉ par son propre contrôle** (il mesurait les gouttières entre lettres : positif 35 %, négatif 80 %, mais le texte de puce, tout en capitales, rendait 85 %) — conservé pour la traçabilité, **non utilisé** |
| `m25_casse_v2.py` | v2 — **ratée sur les accents** (« ÉLÉGUÉ » et « ÉTAT » classés mixtes par leur É) |
| `m26_casse_v3.py` | **v3 retenue** : corps de lettre, accent retiré | **6 contrôles sur 6** (3 positifs, 3 négatifs) |
| `m27_bustes.py` | bustes — **repère faux** (centre du médaillon décalé de 15 CSS), corrigé et rejoué dans `m28` |
| `m29_rails_puce.py` | ergots, rails d'équipe, puce | ergot ≈ 16,8 CSS des deux côtés |
| `m30_bordures.py` | bordures des rangs, variante `.actif` | sonde à 25 % de la hauteur (à mi-hauteur c'est l'ergot qu'on lit) |
| `m31_interlignes.py` | interlignes des 4 blocs à deux lignes | hauteurs de capitale égales exigées avant de comparer ; crème et crème-2 séparés par une borne haute |
| `m34_inventaire_textes.py`, `m35_fentes_qui.py` | inventaire exhaustif des blocs de texte, **compte des fentes d'information** | **5 contrôles sur 6** (le 6ᵉ échoue pour une cause nommée : le « p » de « Repos » ponte les deux lignes du bloc *état* de la référence) |
| `m36_graisse.py` | graisse de la valeur d'état | **positif** : le même « A » au poids normal rend 1,0–1,6 des deux côtés |
| `m37_complements.py` | bbox du bouton retour, côtés de la boîte d'équipe, largeur du rail | bornes prises sur les CÔTÉS verticaux, jamais sur un bord haut arrondi |
| `m38_bandeau_tiret.py` | le tiret du bloc JOUR (étaye la mention de tête ; le chrome n'est pas jugé) | balayage borné au quart droit du bandeau |

