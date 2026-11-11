# Juge visuel ⊥ — ㊴ « Le dossier » (pistes) — tour borné « rendu neuf du lot » — 2026-11-11

Juge à contexte vierge. N'ont été ouverts que : le mandat
`~/project/mafia-clean-city/.claude/skills/juge-visuel/mandat-juge.md`, le `dossier.md` de ce
répertoire, les 5 références et les 12 captures. **Ni code, ni notes d'implémentation, ni message
de commit, ni rapport de juge antérieur, ni la source HTML de la maquette** (le `dossier.md`
l'offre en aide de lecture ; la consigne de l'orchestrateur la met hors de ma portée — elle est
donc listée en § 6 comme la mesure hors image qui trancherait).

---

## Verdict : **NON APPROUVÉ**

À 1080×2400 l'écran est la maquette, au pixel près sur presque tout ce qui se mesure ; à
**1080×1920 (art natif, résolution cible du dossier)** le bas des trois cartes de pistes est effacé
par un fondu de fenêtre défilante : en anglais la phrase de gravité de la piste du lot se lit
**« You're being »**, amputée de « watched », et la ligne qui explique les pistes éteintes
(« pas encore sur la table ») a entièrement disparu.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes ces grandeurs sont mesurées par les scripts de `mesures/`, référence contre capture. Échelle
posée au § Annexe 3 ; les grandeurs internes aux cartes sont exprimées en `dy` sous la bordure haute
de la carte, ce qui annule le décalage en Y (le dossier pose qu'il n'y a **pas** de rapport en Y).

| # | grandeur | référence | capture | écart |
|---|---|---|---|---|
| 1 | barre allumée OR (aplat, médiane) | `(242, 201, 107)` cadre-152 C3 | `(242, 201, 106)` watched 2400 C3 | **1/255** sur B |
| 2 | barre allumée VERTE | `(125, 179, 106)` cadre-152 C1 | `(125, 179, 106)` watched 2400 C2 | **0** |
| 3 | barre éteinte | `(42, 54, 72)` | `(42, 53, 73)` | **≤ 1/255** |
| 4 | titre de carte, gris vif | `(138, 151, 156)` | `(138, 151, 156)` | **0** |
| 5 | titre de carte éteinte, gris sourd | `(122, 131, 141)` cadre-150 C1 | `(122, 131, 141)` C1 | **0** |
| 6 | gouttière entre cartes | 18 px (cadres 131/150/152/153) | 18 px (les 8 planches Pistes) | **0** |
| 7 | titre C2 ligne 1 « CE QUI SORT DES » (hors lot) | encre `x[430,646]` w=**217** | encre `x[431,647]` w=**217** | **1 px** |
| 8 | titre C2 ligne 2 « CUVES » | `x[499,578]` w=**80** | `x[500,578]` w=**79** | **1 px** |
| 9 | rythme vertical des 4 barres (`dy`) | 100 / 129 / 157 / 186 | 98 / 126 / 155 / 184 | **2 px** = 0,56 px CSS |
| 10 | `dy` du mot de gravité | 230 | 228 | **2 px** |
| 11 | `dy` du tiret « — » et de sa sous-ligne | 242 / 271 (cadre-150) | 240 / 269 | **2 px** |
| 12 | encre de « pas encore sur la table » | w=**212** (cadre-150 C1 et C3) | w=**212** (FR 2400 C1) | **0** |
| 13 | hauteur d'encre du titre de carte | 15–16 px | 15–16 px | ≤ 1 px |
| 14 | chasse du titre de carte | 205 px / 15 car. = **13,67 px/car.** | 248 px / 18 car. = **13,78** | **+0,8 %** |
| 15 | encre totale de « On vous regarde » | 121 + 119 + chasse d'espace ≈ **250** | **250** (une ligne) | **0** |
| 16 | tiret « — » de la piste éteinte | w=25, centré sur la carte | w=24, centré sur la carte | **1 px** |
| 17 | contraste du titre d'écran (or sur plaque) | **11,92:1** | **11,92:1** | **0** |
| 18 | largeur d'image | 1080 px | 1080 px (12/12) | **0** |
| 19 | garde anti-vide (≥ 5 % non noir) | — | **97,4 – 97,9 %** sur 12/12 | OK |
| 20 | hauteur de chiffre des compteurs | 41 px (cadre-131) | 41 px (quiet, 2 résolutions) | **0** |

Les couleurs d'aplat sont **égales à 1/255 près** : sur cet écran, le piège « Unity compose en
linéaire, la maquette en sRGB » **ne mord pas** — il n'y a ni translucidité ni dégradé dans les
cartes de pistes, rien que des aplats opaques. Je ne l'innocente pas pour autant sur le fondu du
§ F3, qui est le seul endroit où un mélange intervient (voir la note de F3).

---

## 0. L'écran, tel que la maquette le dit

**But.** Savoir, en un regard, par quel bout on est en train de se faire prendre. Trois pistes de
renseignement — la comptabilité, ce qui sort des cuves, le train de vie d'un lieutenant — montent
**séparément** ; être propre sur deux ne protège pas de la troisième.

**Ordre de lecture.** (1) Le titre or **« Le dossier »** sur sa plaque soulignée d'or, le seul objet
or-sur-noir de la moitié haute. (2) La **rangée des trois cartes** : l'œil y va par la couleur — la
colonne allumée (or ou orange) se détache des colonnes éteintes en bleu ardoise. (3) Le **mot de
gravité** en gros sous les barres, qui donne le verdict en mots, pas en chiffres. (4) Les
**compteurs** cyan et le bloc de prose du bas, qui expliquent la règle.

**Zones.** chrome du shell (argent / chaleur / jour) — hors ㊴ · plaque de titre + sous-titre ·
rangée de compteurs, dont un porte un **bord or et un chevron** : c'est la fenêtre vers les acteurs ·
panneau des trois cartes (titre de piste, 4 barres, mot de gravité, parfois une sous-ligne) · ligne
d'italique de commentaire sous les cartes · plaque « POURQUOI TROIS COLONNES » · CTA
« ACHETER DU RENSEIGNEMENT », éteint, avec sa légende.

**Traits d'identité** (ce qui fait reconnaître *cet* écran) :
1. **Trois colonnes de largeur égale**, séparées par deux gouttières de 18 px, chacune close par un
   liseré complet sur ses quatre côtés.
2. **Quatre barres par colonne**, allumées du bas vers le haut, dont le nombre et la couleur
   (vert → orange → or) portent toute la gravité.
3. Un **mot de gravité en prose**, serif, de la couleur de la barre allumée.
4. Une colonne éteinte dit « **—** » puis « **pas encore sur la table** » : la maquette ne laisse
   jamais une colonne muette.
5. Palette : or `(242,201,107)`, vert `(125,179,106)`, orange `(255,158,61)`, ardoise `(42,54,72)`
   sur fond `(13,22,34)`.

**Témoin choisi.** Le dossier désigne **cadre-152** (nom servi) comme homologue de la piste vivante,
et **cadre-153** pour le cas « nom non servi ». **cadre-131** porte encore la bande brute
(`watched` / `visible` / `quiet`) sous les mots de gravité que 152/153 n'ont plus : je le traite en
**brouillon antérieur** et ne m'en sers que là où 152/153 ne dessinent pas le cas. **cadre-150** est
la seule planche qui dessine une piste **éteinte** : c'est lui le témoin de la colonne éteinte.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

**À 1080×2400 : oui, et de très près.** But, ordre de lecture et les cinq traits d'identité sont
tous là. La rangée de trois cartes a la même largeur de carte (298 vs 293 px), les mêmes gouttières
de 18 px, le même rythme interne de barres (`dy` 98/126/155/184 contre 100/129/157/186), les mêmes
aplats à 1/255 près, le même mot de gravité à la même hauteur. Le titre nommé
« LE TRAIN DE VIE DE LT. RIN » occupe la place et la graisse de
« LE TRAIN DE VIE DE LT. MARREK » de cadre-152, sur deux lignes comme lui, à la même hauteur de
capitale (15 px). La colonne éteinte dit « — » puis « pas encore sur la table », exactement comme
cadre-150, aux mêmes `dy` à 2 px près. Un joueur lit la même chose, dans le même ordre.

**À 1080×1920 : non.** La rangée de cartes devient une **fenêtre défilante** (pouce mesuré, 188 px
de haut, `x[1024,1028]`, absent à 2400) et le client **efface** ce qui dépasse au lieu de le
rendre : le fond des cartes `(13,22,34)` s'éteint à partir de `dy≈212` et a rejoint le fond de la
fenêtre `(10,15,23)` à `dy≈258`, soit les **56 derniers px (17,8 %) de chaque carte**. Les cartes
n'ont **plus de liseré bas** — elles saignent dans le noir, ce qui casse le trait d'identité n° 1.
La colonne éteinte perd sa phrase et redevient muette — trait d'identité n° 4 perdu. Et en anglais,
la phrase de gravité de la piste que ce lot vient de nommer est coupée en deux : le joueur lit
**« You're being »**. Le verdict en mots, qui est le 3ᵉ temps de lecture de l'écran, est amputé.

**Les 3 écarts de tête, par impact perçu :** **F1** (phrase de gravité EN amputée à 1920),
**F2** (la phrase qui explique une piste éteinte disparaît à 1920), **F3** (les cartes perdent leur
liseré bas et s'éteignent dans le noir à 1920 — cause commune de F1, F2 et F4).

---

## 3. Écarts — table unique (le compte se prend ici, nulle part ailleurs)

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| **F1** | **BLOQUANT** | indéterminé (voir note) | **1080×1920, EN `watched`** : la phrase de gravité de la piste du train de vie est coupée. Le joueur lit **« You're being »** ; « watched » n'est pas rendu. Q2. | À 2400 la phrase occupe 2 bandes : `y[1204,1230]` w=195 et `y[1236,1257]` w=127, encre `(242,201,106)`, **contraste 11,55:1**. À 1920 la 2ᵉ bande se réduit à **14 px d'encre sur une seule ligne**, `y[1135]` `x[864,916]`, encre `(39,33,19)`, **contraste 1,15:1** — illisible. `mesures/02`, `mesures/03`, `mesures/04` | Pas de capture « avant » dans le dossier ⇒ je ne peux pas dire si le lot a introduit ou hérité le défaut. Indice contre l'hypothèse « introduit » : il frappe aussi C1 et C2, que le lot n'a pas touchées. |
| **F2** | **BLOQUANT** | indéterminé (idem F1) | **1080×1920, les 4 planches Pistes** : la ligne sous le tiret de la piste éteinte — « pas encore sur la table » / « not on the table yet » — **n'est pas affichée du tout**. La colonne reste muette, ce que la maquette ne fait jamais. Q4. | À 2400 : `dy` 269→287, encre `(122,131,141)` w=212 (FR) / 184 (EN), **contraste 4,73:1**. À 1920 : **0 px d'encre** sur toute la plage `dy` 262→290 (recensement exhaustif, `mesures/02`). Homologue : cadre-150 C1 `y[1169,1184]` w=212. | idem F1. |
| **F3** | **MAJEUR** | indéterminé (idem F1) | **1080×1920** : le bas des trois cartes est effacé par un fondu de fenêtre défilante ; les cartes **perdent leur liseré bas** et se fondent dans le noir. Cause commune de F1, F2 et F4. | Fond de carte `(13,22,34)` **constant de `dy` 60 à 305 à 2400** ; à 1920 il décroît de `dy≈212` et vaut `(13,14,17)` à `dy=255`, puis le fond de fenêtre `(10,15,23)` à `dy≈258`. Liseré bas présent à 2400 (`y[1289,1292]`, `(42,53,73)`), **absent à 1920** (profil uniforme `(10,15,23)` de `y1137` à `y1168`). Pouce de défilement `x[1024,1028]`, `y[856,1043]`, h=188 px, **présent sur les 4 planches 1920, absent sur les 4 planches 2400**. `mesures/02` | Que le fondu soit un **voile** ou un **masque de découpe** ne se tranche pas depuis l'image : la décroissance est multiplicative et régulière (or à `dy=235` `(204,169,88)` = 0,84× ; à `dy=248` `(158,131,68)` = 0,65× ; à `dy=254` `(103,85,45)` = 0,45×), ce qui est compatible avec les deux. Ce n'est **pas** une animation : il est conditionné à la résolution (absent à 2400) et coïncide avec un pouce de défilement. |
| **F4** | **MAJEUR** | indéterminé (idem F1) | **1080×1920, les 4 planches Pistes** : la ligne d'italique sous la rangée de cartes (« Les livres : personne ne regarde par là. Pour l'instant. » / « The books: nobody's looking that way. For now. ») **n'est pas affichée**. | À 2400 : `y[1318,1342]` w=689 (FR) / `y[1318,1343]` w=597 (EN), encre `(138,151,156)`. Homologue : cadre-152 `y[1228,1253]` w=692. À 1920 : **aucune bande d'encre** entre la fin des cartes et le liseré du panneau suivant (`y` 1100→1180), hors le fondu résiduel. `mesures/03` (contrôle + et − passés) | idem F1. |
| **F5** | **MAJEUR** | DÉJÀ APPLIQUÉ (la vue Vide n'est pas l'objet du lot) | **`quiet`, planches EN, 2 résolutions** : le **sous-titre de ㊴** reste en **français** — « RIEN À VOTRE NOM » — alors que le titre, les compteurs, le texte du panneau vide et le bloc de clôture sont bien en anglais. C'est une chaîne de ㊴, pas du chrome du shell. Q4/Q5. | Encre du sous-titre **identique** en FR et en EN : `y[674,695]` `x[357,722]` **w=366** à 2400, `y[573,594]` **w=366** à 1920. Contrôle de l'instrument : le titre d'écran, lui, sort bien **traduit** (FR w=459 « Le dossier » / EN w=345 « The file »). Seule occurrence « même encre » de tout le panneau, sur les 3 états × 2 résolutions. `mesures/07` | Je ne peux pas dire si la clé est absente du bundle EN ou si le client ne la demande pas : il faudrait lire le bundle i18n servi — hors image et hors ma portée. |
| **F6** | **MINEUR** | NOUVEAU (porté par le titre nommé) | Le **titre nommé** remplit sa boîte de texte presque bord à bord : « LE TRAIN DE VIE DE » laisse **3 px de marge** de chaque côté, là où la maquette en laisse 9 à 21. Rien n'est coupé ni ne déborde. Q1. | Capture FR : encre `x[732,979]` w=248 dans une boîte `x[729,982]` ⇒ marges **3 / 3 px** (0,83 px CSS). Référence : cadre-152 L1 `x[748,952]` ⇒ **19 / 21** ; cadre-153 L2 (ligne la plus longue) `x[738,964]` ⇒ **9 / 9**. `mesures/04` | Seuls deux noms sont capturés (« LT. RIN », « LT. HARA », 3 et 4 lettres). Un nom plus long déplacerait le point de césure ; je ne peux pas dire à partir de quelle longueur la 2ᵉ ligne déborderait — il faudrait une capture avec un nom long. |

**Compte pris dans cette table : 6 findings — 2 BLOQUANTS, 3 MAJEURS, 1 MINEUR.**

### Réponses aux cinq questions bornées

- **Q1 — le titre nommé : A/B ? NON.** Présent, lisible, dans son cadre, rien de coupé ni de
  débordant, aux 2 résolutions et dans les 2 langues ; homologue fidèle de cadre-152 (même casse,
  même couleur `(138,151,156)`, même hauteur de capitale 15 px, même chasse à 0,8 % près, 2 lignes
  comme la maquette). Un seul MINEUR : **F6** (marges réduites à 3 px).
- **Q2 — la piste vivante : A/B ? OUI — F1.** À 2400, parfait : `watched` rend 1 barre éteinte +
  3 barres or `(242,201,106)` et « On vous regarde » / « You're being watched », c'est-à-dire
  exactement l'allumage, la couleur et le mot de cadre-152. À **1920 en anglais**, le mot est coupé
  (**F1**). Les deux pistes voisines sont dessinées comme la maquette les dessine (structure,
  nombre de barres, couleurs, positions — § Contrôle positif) ; leur **vocabulaire** diverge, mais
  c'est du C (voir ci-dessous).
- **Q3 — les compteurs : A/B ? NON.** Trois compteurs, lisibles, non coupés, aux abscisses de
  cadre-150 (`x` 466/467 et 718/719 — écart 1 px), hauteur de chiffre 41 px identique à la
  référence, format « chiffre + dénominateur en petit + libellé dessous » conforme. Les
  dénominateurs (`/2`, `/0`) et le fait que la maquette ratifiée 152/153 n'en dessine que **deux**
  sont consignés en C.
- **Q4 — ce qui s'affiche sous la bande : A/B ? OUI — F2, F5** (et F4 pour la ligne sous la rangée).
  **Aucun mot système, aucun nom d'énumération, aucune valeur brute** n'est affiché sous les
  bandes : la bande brute `watched` / `visible` / `quiet` que porte cadre-131 n'apparaît sur
  **aucune** des 12 planches — recensement exhaustif carte par carte, `mesures/01`. Les seuls
  textes sous la bande sont le mot de gravité et, pour une piste éteinte, « — » +
  « pas encore sur la table ». Défauts : la seconde ligne **manque** à 1920 (**F2**) et le
  sous-titre de la vue Vide reste français en anglais (**F5**).
- **Q5 — l'état `quiet` : A/B ? OUI — F5.** La vue Vide est **propre et complète** : rien de coupé,
  pas de trou, textes lisibles (titre 11,92:1 ; sous-titre 8,38:1 ; texte du panneau vide 5,05:1 ;
  bloc de clôture 6,05 à 13,85:1 — tous au-dessus des seuils 3:1 / 4,5:1), et **identique aux deux
  résolutions** (15 bandes d'encre en FR et 13 en EN, aux mêmes largeurs d'encre à 1920 et à 2400 :
  elle **ne déborde pas**, contrairement à la vue Pistes). Seul défaut : **F5**.

### Classe C — consignés, ni correctif ni tour (ne comptent pas comme findings)

| id | constat | mesure |
|---|---|---|
| C1 | Au niveau vert (4ᵉ barre verte), le client écrit **« invisible » / « unseen »** ; la maquette ratifiée écrit **« rien à signaler »** (cadre-152 C1) et le brouillon cadre-131 **« discret »**. Même niveau d'allumage, registre différent. | encre du mot : réf 224 px (« rien à signaler ») / 106 px (« discret ») ; capture 128 px (« invisible ») ; même 4ᵉ barre verte `(125,179,106)` dans les trois cas |
| C2 | À **2 barres or** allumées, le client écrit **« remarqué » / « noticed »** ; la seule planche de maquette qui allume 2 barres or (cadre-131, brouillon à bande brute) écrit « On vous regarde ». Aucun homologue **ratifié** du niveau `noticed`. | cadre-131 C1 : barres or aux `dy` 157 et 186, mot w=121+119 ; capture `noticed` C3 : or aux `dy` 155 et 184, mot w=148 (FR) / 114 (EN) |
| C3 | **Trois** compteurs en jeu ; la maquette **ratifiée** (152/153) n'en dessine que **deux**, cadre-150 et cadre-131 en dessinent trois. | réf 152/153 : 2 groupes `x[176,398]` et `x[551,1024]` ; réf 150 : 3 groupes ; capture : 3 groupes `x[55,356]`, `x[467,612]`, `x[719,1024]` |
| C4 | La phrase de gravité or tient sur **une** ligne en jeu, sur **deux** dans la maquette — conséquence d'une boîte de texte plus large de 9 px image (2,5 px CSS), pas d'une taille de police différente (chasse égale à 0 px près). | boîte réf 245 px / capture 254 px ; encre de la phrase : 250 px dans les deux cas |
| C5 | Cartes **5 px plus larges** qu'en référence (+1,4 px CSS, +1,7 %) et bord gauche du panneau 7 px plus à gauche. | réf 293 px `x[82,374]` ; capture 298 px `x[75,372]` ; gouttières égales (18 px) |
| C6 | Interligne du titre de carte **22 px** contre 24 px en référence (−8,3 %, sous la tolérance de 10 %). | réf `y` 908→932 ; capture `y` 1005→1027 |

### ASSUMÉ — vérifié « rendu proprement », non rouvert

| écart | vérification |
|---|---|
| dénominateur `/2` et `/0` au lieu de `/3`, `/4` | rendu propre : chiffre + dénominateur en petit, même graisse et même place qu'en référence, aucun libellé de repli, rien de coupé |
| chrome du shell en français sur les planches EN (« ARGENT », « JOUR 1 », « CHALEUR », « EMPIRE / FAMILLE / FILIÈRE / PLUS ») | **hors périmètre ㊴**, signalé pour mémoire : ces libellés sont hors du cadre or du panneau. **F5 n'est pas de ceux-là** : « RIEN À VOTRE NOM » est le sous-titre *interne* de ㊴, sur sa plaque de titre |
| polices Georgia → Noto Serif, Segoe UI → Noto Sans | ARBITRAGE de substitution. Mesurable et **égal** : hauteur de capitale 15–16 px et chasse à 0,8 % près entre référence et capture (contrôles 13 et 14) — l'écart de famille ne se tranche pas depuis une image |
| annotations de DA « PROPOSÉ / non ratifié » non rendues | aucune trace sur les captures : rendu propre |

### Hors périmètre (signalé sans tour, comme le demande le dossier)

- **Aucun** défaut nouveau et grave hors des cinq questions n'a été vu.

---

## 5. Autres résolutions

- **1080×2400 (téléphone visé 20:9)** — **tient.** Les 4 planches Pistes et les 2 planches Vide
  sont complètes : cartes closes sur leurs 4 côtés, liseré bas à `y[1289,1292]`, mot de gravité
  entier (contraste 11,55:1), sous-ligne « pas encore sur la table » présente (4,73:1), ligne
  d'italique sous la rangée présente (w=689 FR / 597 EN). Rien de coupé, rien hors cadre, aucune
  barre de défilement.
- **1080×1920 (art natif)** — **ne tient pas**, pour la **vue Pistes seulement** : **F1, F2, F3,
  F4**. Ce qui reste visible y est encore lisible (le mot de gravité conserve 9,28:1 sur sa partie
  haute) : le défaut n'est pas un manque de contraste, c'est une **amputation**. La mise en page
  interne des cartes est pourtant **identique** aux deux résolutions (mêmes `dy` : barres 97/126/
  155/184, mot 228, tiret 240, sous-ligne 269) — rien n'a été déplacé ni recomposé : **la fenêtre
  est simplement trop courte et le client efface le dépassement au lieu de le reporter.**
- **1080×1920, vue Vide** — **tient.** Même nombre de bandes d'encre et mêmes largeurs d'encre
  qu'à 2400, dans les deux langues (contrôle positif de `mesures/06`).

---

## 6. Ce que je n'ai pas pu vérifier

1. **NOUVEAU vs DÉJÀ APPLIQUÉ pour F1-F4.** Le dossier le dit : « toute capture « avant » : il n'y
   en a pas pour toi ». Je ne peux donc pas trancher la colonne « critère » pour les quatre écarts
   de 1920. *Ce qui trancherait* : une capture 1080×1920 de la vue Pistes au client **antérieur au
   lot**, tout le reste égal. *Indice, pas preuve* : le défaut frappe aussi les colonnes C1 et C2,
   que le lot n'a pas touchées, et la mise en page interne des cartes est identique aux deux
   résolutions — il ressemble à une contrainte de hauteur de fenêtre, pas à un effet du titre nommé.
2. **Le cas « nom non servi » (cadre-153, « LE TRAIN DE VIE D'UN LIEUTENANT »)** n'est capturé par
   aucune des 12 planches : les trois états servent tous un nom ou aucune piste. Je ne peux donc pas
   dire si le repli générique s'affiche, ni s'il tient dans sa boîte (sa ligne est la plus longue de
   la référence : 227 px contre 248 px pour la ligne du client — voir F6). *Ce qui trancherait* :
   une capture d'un compte dont `lifestyle_lieutenant_name` est null.
3. **Le cas « effluent visible »** (un mot de gravité orange avec sa sous-ligne sous la piste des
   cuves) n'est montré par aucune planche — le dossier l'annonçait. La sous-ligne « Ça se remarque »
   de cadre-152 C2 (`y[1148,1165]` w=148) n'a donc **aucun homologue mesurable** en jeu. *Ce qui
   trancherait* : une capture d'un compte dont la piste des cuves est à `visible`.
4. **Le vocabulaire des mots de gravité (C1, C2).** Depuis l'image je peux dire que « invisible » et
   « remarqué » ne sont dans aucune des deux planches ratifiées, et qu'ils sont bien **traduits**
   (« unseen », « noticed ») donc servis et non recopiés d'une énumération — mais pas si le registre
   est celui que la DA a arrêté. *Ce qui trancherait* : le registre des mots dans la source HTML de
   la maquette (`git -C …/atelier3d-mafia-c2 show b2ceebeb:ecrans-brennar-6.html`), que
   l'orchestrateur a mise hors de ma portée, ou le bundle i18n servi — c'est une question de
   **données**, pas d'image.
5. **La nature exacte du fondu de F3** (voile par-dessus, ou masque qui découpe) ne se tranche pas
   depuis les pixels : la décroissance multiplicative régulière est compatible avec les deux.
   *Ce qui trancherait* : un rendu de la même scène avec la fenêtre agrandie de 60 px.
6. **La famille de police.** Un rendu ne la donne pas. Les hauteurs de capitale et les chasses sont
   égales (contrôles 13-14) ; l'écart de famille reste un ARBITRAGE. *Ce qui trancherait* :
   `fc-match` sur la CSS de la maquette — le dossier le donne déjà pour la référence, pas pour le
   client.
7. **L'appariement positionnel FR/EN de `mesures/07`** se désynchronise après la 6ᵉ bande dans la
   vue Vide (le texte du panneau vide tient sur 3 lignes en FR et 2 en EN). La conclusion de F5 ne
   repose que sur les bandes 0 à 5, où l'appariement est sûr, et a été **relue à l'œil** sur
   `E13_Dossier_quiet_en_1080x2400.png`.
8. **L'animation.** Toutes les captures sont figées ; je n'ai classé aucun pixel qui bouge comme un
   écart. Le fondu de F3 est exclu de ce régime : il est conditionné à la résolution (absent à
   2400) et accompagné d'un pouce de défilement, ce qu'une image d'animation ne ferait pas.

---

## Annexes

### Annexe 1 — Inventaire de la référence (cadre-152, témoin principal)

Échelle : 1080 px d'image = 300 px CSS (×3,6). Les % sont rapportés à la largeur de la carte (293 px).

| id | catégorie | parent | bbox (px image) | forme / remplissage | texte | relations |
|---|---|---|---|---|---|---|
| `P.cadre` | panneau | écran | `x[29,1050]`, `y[452,2078]` | rect, liseré or | — | contient tout ㊴ |
| `P.titre` | plaque | `P.cadre` | `y[484,662]` | rect ardoise, souligné or | « Le dossier » or `(242,201,107)`, 11,92:1 | 1ᵉʳ temps de lecture |
| `P.cpt` | rangée | `P.cadre` | `y[702,789]` | 2 boîtes | `02/3` cyan + `01/4` or, boîte or + chevron | la 2ᵉ est la fenêtre acteurs |
| `C1` | carte | `P.cartes` | `x[82,374]`, `y[877,1198]` | rect, liseré 4 côtés | — | w=293 px = 100 % |
| `C1.titre` | texte | `C1` | `x[117,337]`, `y[905,923]` | — | « LA COMPTABILITÉ », h=19, `(138,151,156)` | `dy`=28 |
| `C1.barres` | jauge | `C1` | `x[106,350]` | 4 barres h≈21, `dy` 100/129/157/186 | 3 ardoise + 1 **verte** `(125,179,106)` (la 4ᵉ) | w=245 = 83,6 % |
| `C1.mot` | texte | `C1` | `x[117,340]`, `y[1106,1133]` | — | « rien à signaler », vert, h=28 | `dy`=229 ; **pas de sous-ligne** |
| `C2.titre` | texte | `C2` | 2 lignes `y[908,925]`, `y[932,947]` | — | « CE QUI SORT DES / CUVES », w=217 / 80 | interligne 24 |
| `C2.barres` | jauge | `C2` | `x[418,661]` | 1 ardoise + 3 **orange** `(255,158,61)` | — | — |
| `C2.mot` | texte | `C2` | `x[469,611]`, `y[1107,1133]` | — | « ça se voit », orange, h=27 | `dy`=230 |
| `C2.sous` | texte | `C2` | `x[466,613]`, `y[1148,1165]` | — | « Ça se remarque », `(122,131,141)`, h=18 | `dy`=271 — **le seul cas de sous-ligne de 152** |
| `C3.titre` | texte | `C3` | `y[908,922]` w=205 ; `y[932,946]` w=187 | — | « LE TRAIN DE VIE / DE LT. MARREK », h=15 | marges 19 / 21 px |
| `C3.barres` | jauge | `C3` | `x[729,973]` | 1 ardoise + 3 **or** `(242,201,107)` | — | — |
| `C3.mot` | texte | `C3` | `y[1107,1128]` w=121 ; `y[1140,1166]` w=119 | — | « On vous / regarde », or, h=22 / 27 | `dy`=230 ; **2 lignes** |
| `P.ital` | texte | `P.cadre` | `x[193,884]`, `y[1228,1253]` | — | « Les livres : personne ne regarde par là… » | sous la rangée |
| `P.pourquoi` | plaque | `P.cadre` | `y[1579,1866]` | rect | titre crème `(234,224,200)`, 13,85:1 | — |
| `P.cta` | CTA | `P.cadre` | `y[1905,1992]` | rect éteint | « ACHETER DU RENSEIGNEMENT » `(122,131,141)` | + légende or `y[2019,2041]` |

**Couche globale (référence).** Fond dominant `(13,22,34)` ; encres : or `(242,201,107)`, crème
`(234,224,200)`, gris vif `(138,151,156)`, gris sourd `(122,131,141)`, vert `(125,179,106)`, orange
`(255,158,61)`, ardoise `(42,54,72)`. Densité non noire 96,5 %. Rythme vertical : plaque de titre →
compteurs → cartes → italique → plaque de prose → CTA. Contrastes principaux 11,92 / 13,85 / 8,38 /
4,73:1.

**cadre-150 (témoin de la colonne éteinte).** C1 et C3 : 4 barres ardoise, puis « — »
(`y[1140,1143]`, w=25, `dy`=242) puis « pas encore sur la table » (`y[1169,1184]`, w=212, `dy`=271,
`(122,131,141)`). Titre de carte éteinte dégradé à `(122,131,141)`.

**cadre-131 (brouillon antérieur).** Porte en plus une **bande brute** sous chaque mot :
« watched » (w=78), « visible » (w=59), « quiet » (w=48) en `(122,131,141)`. **Rien de tel dans les
12 captures.**

### Annexe 2 — Inventaire de la capture (watched FR 1080×2400, planche principale)

| id | catégorie | bbox (px image) | remplissage / texte | écart au témoin |
|---|---|---|---|---|
| `K.titre` | plaque | `y[595,642]` | « Le dossier » or `(242,201,106)`, 11,92:1 | ÉGAL |
| `K.sous` | texte | `y[674,698]` h=25, w=939 | « TROIS PISTES, ET ELLES NE SE MÉLANGENT PAS » sur **1 ligne** | réf cadre-152 : `y[584,629]` **h=46**, w=852 ⇒ **2 lignes**. Même cause que C4 (boîte de texte plus large en jeu) ⇒ C |
| `K.cpt` | rangée | `y[741,953]` | **3** compteurs : `01/2` / `00` / `00/0` (or + chevron) | C3 / ASSUMÉ |
| `K.C1` | carte | `x[75,372]`, `y[976,1289]` | w=298, liseré 4 côtés | C5 (+5 px) |
| `K.C1.titre` | texte | `x[113,334]`, `y[1001,1019]` | « LA COMPTABILITÉ » `(122,131,141)` h=19 | ÉGAL (témoin cadre-150) |
| `K.C1.barres` | jauge | `x[97,350]` | **4 ardoise** `(42,53,73)`, `dy` 98/126/155/184 | ÉGAL |
| `K.C1.tiret` | texte | `x[212,235]`, `y[1216,1218]` | « — » `(122,131,141)`, `dy`=240 | ÉGAL |
| `K.C1.sous` | texte | `x[118,329]`, `y[1245,1263]` | « pas encore sur la table » w=212, 4,73:1, `dy`=269 | **ÉGAL à 2400 ; ABSENT à 1920 (F2)** |
| `K.C2.titre` | texte | 2 lignes `y[1005,1021]`, `y[1027,1041]` | « CE QUI SORT DES / CUVES » w=217 / 79 | ÉGAL (1 px) |
| `K.C2.barres` | jauge | `x[413,666]` | 3 ardoise + 1 **verte** `(125,179,106)` (la 4ᵉ) | ÉGAL |
| `K.C2.mot` | texte | `x[476,603]`, `y[1204,1225]` | « invisible », vert, w=128, `dy`=228 | C1 (vocabulaire) |
| `K.C3.titre` | texte | `y[1005,1019]` w=248 ; `y[1027,1041]` w=88 | « LE TRAIN DE VIE DE / LT. RIN » h=15, `(138,151,156)` | **Q1 : homologue fidèle** ; F6 (marges 3 px) |
| `K.C3.barres` | jauge | `x[729,982]` | 1 ardoise + 3 **or** `(242,201,106)` | ÉGAL |
| `K.C3.mot` | texte | `x[731,980]`, `y[1204,1230]` | « On vous regarde » or, w=250, 11,55:1, `dy`=228 | mot ÉGAL ; C4 (1 ligne) |
| `K.ital` | texte | `x[192,880]`, `y[1318,1342]` | « Les livres : personne ne regarde par là… » w=689 | **ÉGAL à 2400 ; ABSENT à 1920 (F4)** |
| `K.pourquoi` | plaque | `y[1681,1828]` | titre crème 13,85:1 | ÉGAL |
| `K.cta` | CTA | `y[1997,2020]` | « ACHETER DU RENSEIGNEMENT » éteint + légende or | ÉGAL |
| `K.onglets` | chrome | bas d'écran | EMPIRE / FAMILLE / FILIÈRE / PLUS | **EN TROP** vs la référence, qui est rognée à 2102 px — hors ㊴, non compté |

**Couche globale (capture 2400).** Fond `(13,22,34)`, mêmes six encres aux mêmes valeurs à 1/255
près, densité non noire 97,4 %, même rythme vertical, mêmes contrastes. **Couche globale (1920) :**
identique jusqu'à `dy≈212` dans les cartes, puis décroissance jusqu'au noir de fenêtre — c'est tout
l'objet de F1-F4.

### Annexe 3 — Correspondance des repères

| | px d'image | px CSS | facteur |
|---|---|---|---|
| RÉFÉRENCE (1080×2102) | 1080 | 300 | **×3,6** |
| CAPTURE (1080×2400 et 1080×1920) | 1080 | 300 | **×3,6** |
| **rapport capture ÷ référence, en X** | | | **1,000** |

- **En Y il n'y a pas de rapport** (dossier) : toute mesure verticale est donnée en `dy` sous la
  **bordure haute de la rangée de cartes** — `y=877` pour cadre-152/153/131, `y=898` pour cadre-150,
  `y=976` pour les captures 2400, `y=875` pour les captures 1920. Ces quatre origines sont mesurées
  par `mesures/01-cartes-pistes.py`, pas supposées.
- **Décalage en X** : bord gauche de la rangée de cartes, référence `x=82`, capture `x=75`
  ⇒ **−7 px image = −1,94 px CSS**. Toutes les abscisses du § 3 sont brutes ; les comparaisons de
  largeur sont faites en largeur, pas en abscisse, pour ne pas traîner ce décalage.
- Toutes les mesures du § 3 citent cette correspondance.

### Annexe 4 — Scripts

Tous dans `mesures/`, tous impriment la taille des images qu'ils ouvrent, tous portent un contrôle
positif et, quand l'enjeu le mérite, un contrôle négatif.

| script | mesure | contrôles |
|---|---|---|
| `00-inventaire-et-garde-anti-vide.py` | taille des 17 images, garde anti-vide | + : 17 largeurs = 1080 ⇒ OK · − : hauteurs réf {2102} et captures {1920, 2400} disjointes ⇒ OK |
| `01-cartes-pistes.py` | bbox des 3 cartes et segmentation complète de leur intérieur, réf + 12 captures | + : gouttières 18/18 px partout ⇒ OK · − : « aucune carte » dans les 4 planches `quiet` ⇒ OK (discrimine) |
| `02-coupe-bas-des-cartes-1920.py` | encre et couleur par `dy`, 1920 contre 2400 | − : le tiret sort différent (94,102,110) vs (122,131,141) ⇒ OK. **Le contrôle positif sur les barres a échoué par défaut de méthode** (fond pris comme médiane de la ligne, or les barres occupent 85 % de la ligne) ; il est **remplacé** par le contrôle 1-3 du § Contrôle positif, mesuré par `01` |
| `03-zone-sous-les-cartes.py` | la ligne d'italique sous la rangée | + : trouvée dans les 2 réf et les 4 planches 2400 ⇒ OK · − : même fenêtre 300 px plus haut ⇒ 1 bande de 38 070 px, tout autre ⇒ OK |
| `04-titre-nomme-compteurs-contraste.py` | Q1 (bbox et marges du titre nommé) + contrastes | + : titre C2 hors lot identique réf/capture à 1 px ⇒ OK. *La section « compteurs » de ce script n'a rien trouvé : elle est remplacée par `05`.* |
| `05-compteurs.py` | Q3 : nombre, place et hauteur des compteurs | + / − : cadre-131 → **3** groupes, cadre-152 → **2** ⇒ discrimine (au 1er jet, seuil trop bas : 1 groupe partout, corrigé) |
| `06-vue-vide.py` | Q5 : structure, contrastes et débordement de la vue Vide | + : 15 bandes FR et 13 EN, **mêmes largeurs d'encre à 1920 et à 2400** ⇒ pas de débordement · − : la vue Pistes, elle, diffère (18 vs 11) ⇒ discrimine |
| `07-fr-dans-les-planches-en.py` | Q4 : chaîne non traduite détectée par égalité d'encre FR/EN | + : le titre d'écran sort « traduit » (459 vs 345) ⇒ OK · − : les traverses pleine largeur sortent identiques ⇒ OK |

Deux instruments ont été **écartés en cours de route parce que leur contrôle a rougi** : un
détecteur de cartes qui attrapait la rangée des compteurs (largeurs inégales — corrigé), et un
recensement plein panneau dont le cadre or trouvé était le souligné du titre et dont la fenêtre
incluait les montants or, ce qui fondait tout le panneau en une bande (supprimé, remplacé par `03`).
