# Juge visuel ⊥ — ④ L'ouverture / Accueil — `A01` — r6 — 2026-10-08

Juge à contexte vierge. Je n'ai ouvert ni `Assets/Scripts`, ni de notes d'implémentation, ni
`04-accueil/` (répertoire parent), ni aucun rapport d'un juge précédent de ④.
**Forme imposée par `dossier.md` § « Format du RAPPORT » ; le compte se prend dans LA table du § 3.**

**Fichiers jugés** (empreintes relues, toutes conformes au `dossier.md`) :

| rôle | fichier | taille | sha256(12) |
|---|---|---|---|
| réf. cadre 4 | `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/reference/A01-cadre-4-la-suite.png` | 1080×2102 | `3a6e791aa1a3` |
| réf. cadre 5 | `…/reference/A01-cadre-5-tete-sur-ligne-haute.png` | 1080×2102 | `dd1788c74d08` |
| jeu court 2400 | `/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-r2/A01_AccueilFile2Cartes_1080x2400.png` | 1080×2400 | `49e107fb4746` ✔ |
| jeu court 1920 | `…/A01_AccueilFile2Cartes_1080x1920.png` | 1080×1920 | `911b4fad616a` ✔ |
| jeu long 2400 | `…/A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png` | 1080×2400 | `7ed22aed7a4e` ✔ |
| jeu long 1920 | `…/A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png` | 1080×1920 | `b07f7edb4a26` ✔ |

Les deux références sont bien les PNG re-rendus de 16h20 (addendum) : **aucune mesure de ce rapport
n'a été prise sur l'ancien cadre 4 ou 5** — ce dossier était vide à mon arrivée (`mesures/` vide,
pas de `rapport.md`).

---

## Verdict : **NON APPROUVÉ**

La matière, les couleurs, la gouttière et le chrome sont justes au pixel ; mais la **carte de tête**
a perdu sa moitié basse (le libellé « ce qu'on peut faire » et les options avec leur conséquence),
et à **1080×2400** la **ligne de file** est vide à 57,5 % contre 26,9 % dans la maquette.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport ne serait pas recevable : un instrument qui rendrait tout faux
passerait pour sévère. Voici **19 grandeurs mesurées égales**, toutes produites par un script de
`mesures/` qui imprime la taille des images qu'il ouvre.

| # | grandeur | référence | jeu | script |
|---|---|---|---|---|
| 1 | gouttière latérale (bord extérieur de carte → bord d'image) | 46 px = 4,26 % de l'image | 47 px = 4,35 % | `02`,`04` |
| 2 | largeur de la plaque `.verre` | 988 px = 274,44 CSS | 986 px = 273,89 CSS (Δ 0,56 CSS) | `04`,`06` |
| 3 | remplissage de la plaque (médiane 7×7) | (11, 17, 29) | (12, 18, 28) — Δ (+1,+1,−1)/255 | `02` |
| 4 | liseré de la plaque, couleur et épaisseur | (33, 38, 49) · 3 px | (34, 38, 46) · 3 px | `02` |
| 5 | liseré de la carte de file | (42, 54, 72) = `#2a3648` | (42, 53, 71) — Δ (0,−1,−1)/255 | `02` |
| 6 | **filet laiton du haut de plaque** (`.verre::after`) | **(176, 141, 62) = `#b08d3e`** | **(176, 141, 62) — exact, sur les 4 planches** | `07`,`14`,`17` |
| 7 | largeur visible du filet laiton | 705-707 px | 718 px (+1,6 %) | `17` |
| 8 | encre `#b9ad92` (raison, `.sur`, `.niveaux span`) | (185, 173, 146) | (185, 173, 146) — exact | `14` |
| 9 | encre `#f2c96b` (titres sérif, `TRANCHER`) | (242, 201, 107) | (242, 201, 106) | `14` |
| 10 | encre `#eae0c8` (valeurs des niveaux) | (234, 224, 200) | (234, 224, 200) — exact | `14` |
| 11 | encre `#8c8272` (« Plusieurs attendent encore ») | (140, 130, 114) | (140, 130, 114) — exact | `14` |
| 12 | hauteur de capitale du titre sérif de la carte de tête | 43 px = 11,94 CSS | 43 px = 11,94 CSS — Δ 0 | `09` |
| 13 | « PORTÉE » (même chaîne) : largeur d'encre / hauteur | 125 px / 18 px | 124 px / 18 px (−0,8 %) | `09`,`11` |
| 14 | « Plusieurs attendent encore » (même chaîne) : largeur / capitale P | 357 px / 22 px | 350 px / 21 px (−2,0 %) | `09`,`11` |
| 15 | largeur du séparateur de rangée de « la suite » | 880 px | 884 px | `07` |
| 16 | écartement des 4 ronds du dock · centres | 187,0 px · 259/446/633/820 | 187,0-187,5 px · 258,5/446/633/820,5 | `17` |
| 17 | centre du médaillon | x = 539,5 (milieu de l'image) | x = 539,5 | `18` |
| 18 | retrait gauche du texte dans la carte de file | 41 px | 33 px — Δ 8 px = 0,81 % de la largeur de carte → **sous la tolérance de 1,5 % du parent** | `13` |
| 19 | contrastes WCAG, 11 textes mesurés sur leur fond réel | 4,92 → 14,28 : 1 | 5,11 → 14,38 : 1 — **aucun texte sous 4,5 : 1** | `14` |
| 20 | hauteur du bouton or de rangée de « la suite » | 93 px = 25,83 CSS | 93 px = 25,83 CSS — Δ 0 (la largeur, elle, suit le libellé servi) | `12`,`24` |
| 21 | bord droit de ce même bouton | x = 979 | x = 979 — Δ 0 | `24` |

Deux contrôles externes, qui valident l'instrument *et* le harnais :

- **Interlignes de la référence contre la CSS de l'atelier** : `.rep` mesuré 11,39 CSS contre
  8,4 px × 1,35 = 11,34 attendu ; `.t4 b` mesuré 13,89 CSS contre 11 × 1,25 = 13,75 attendu
  (`21`). Mon instrument retrouve la feuille de style à 0,4 % près.
- **La déclaration du journal est vérifiée, pas recopiée** : l'écart carte de tête ↔ carte de
  file vaut **0,0250 de (H − 480)** à 1080×2400 **et** à 1080×1920 (48 px et 36 px mesurés, `15`).
  Le harnais disait 0,0250 ; je le mesure à 0,0250.

---

## 0. L'écran, tel que la maquette le dit *(écrit sur la référence seule, avant d'ouvrir une capture)*

**But** — c'est l'ouverture de la journée. Le joueur vient y lire **ce qu'il doit trancher ce matin**,
et **ce qui attend derrière**. Il n'y gère rien ; il décide, puis il part.

**Ordre de lecture** — (1) le **titre sérif or** de la carte de tête, le plus gros corps de l'écran
(43 px de capitale, 11,94 CSS) et la seule chose en or sur un fond nuit ; (2) les **gestes** de cette
carte, deux pavés de même poids, celui de gauche en or plein ; (3) la **ligne de file** du bas, plus
basse, plus grise, qui dit qui attend et combien ; (4) le chrome — bandeau, médaillon, dock — qui
encadre sans appeler.

**Zones** — ① bandeau haut (argent, manomètre de chaleur, jour/moment) ; ② décor : le quartier peint
de nuit, voilé, qui occupe le haut de l'écran et donne la matière ; ③ la **plaque** (`.verre`),
ancrée en bas, qui porte soit la carte de tête soit « la suite » ; ④ la **ligne de file haute**, une
carte à part sous la plaque, avec son propre liseré plus clair ; ⑤ le dock.

**Traits d'identité** — (a) le **filet laiton** `#b08d3e` qui barre le haut de chaque plaque, seul
trait franc de l'écran ; (b) le **couple or/crème sur bleu nuit** : titres `#f2c96b`, courants
`#b9ad92`, valeurs `#eae0c8`, aplats autour de (11,17,29) ; (c) la **plaque ancrée en bas** qui
laisse le décor respirer au-dessus ; (d) la ligne de file **détachée** de la plaque par une ombre
portée et un liseré plus clair (`#2a3648`) ; (e) une carte de tête qui **explique ce que coûte chaque
option** — la moitié basse de la carte est consacrée à cela.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour la **matière** : mêmes aplats, mêmes encres au 1/255 près, même filet laiton `#b08d3e` au
pixel, même gouttière, même décor (luminance 21,4-25,4 en jeu contre 23,4-24,3 en maquette), mêmes
contrastes. Rien n'est coupé, rien ne déborde, rien n'est en anglais, rien n'est hors cadre.

Non pour le **propos de la carte de tête**. Dans la maquette, la carte dit : voilà la décision, voilà
sa portée et son urgence, **voilà ce qu'on peut faire**, et **voilà ce que coûte chacune des deux
options**. Ces deux derniers blocs occupent **38,6 % de la hauteur de la carte** (280 px sur 725).
Dans le jeu, ils n'existent pas : la carte tombe de 201,4 CSS à 98,9 CSS (49,1 %) et ne porte plus
que titre, niveaux, et un seul pavé or **plein cadre** (89,7 % de la largeur contre 43,1 %, part
d'encre or ×3,09). L'ordre de lecture en est changé : au lieu de titre → gestes → conséquences,
l'œil va titre → **pavé or**, et s'arrête. Le joueur appuie sans savoir ce qu'il paie.

Non plus pour le **rythme de la ligne de file à 1080×2400**, la résolution « téléphone visé ». La
carte y fait 107,78 CSS contre 81,67 (+32,0 %) tandis que son bloc de texte tombe à 45,83 CSS contre
59,72 (−23,3 %) : marges internes ×2,8 (30,8/31,1 CSS contre 10,6/11,4), **vide 57,5 % contre
26,9 %**. Même sans côte à côte, la carte se lit comme une boîte presque vide. À 1080×1920 la même
carte mesure 80,83 CSS (−1,0 %, ÉGAL) : l'écart est **propre au 2400**.

Troisième chose vue au premier regard : l'**étiquette de gravité** (`MODÉRÉE`) de la ligne de file est
descendue d'un cran de registre — 18 px d'accent-à-ligne-de-base contre 27 (−33 %), 14,3 px d'encre
par lettre contre 20,5 (l'interlettrage de 0,14 em n'est pas rendu). Elle est désormais **plus petite
que « Plusieurs attendent encore »** (capitale 17 px contre 21), qui est la ligne la moins importante
de la carte dans la maquette : la hiérarchie interne de la carte est inversée sur ce point.

**Les trois écarts de tête** : `F1` (moitié basse de la carte de tête absente) · `F3` (ligne de file
vide à 57,5 % à 2400) · `F2` (pavé or plein cadre, part d'or ×3,09).

---

## 3. Écarts — LA table *(le compte se prend ici, et nulle part ailleurs)*

Gravité : liste fermée `BLOQUANT` / `MAJEUR` / `MINEUR`.
Critère : `DOCTRINE` si l'écart tombe sous une règle du § « Règles de doctrine applicables » ;
`INSTRUMENT NEUF` si la grandeur vient d'un instrument que j'ai construit pour ce tour.
Classement A/B/C (ruling 07/10) : les écarts marqués **« classe C »** sont consignés, sans correctif
ni tour de juge.

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `A01` | `BLOQUANT` | `INSTRUMENT NEUF` | **Carte de tête : la moitié basse est absente** — ni le libellé « CE QU'ON PEUT FAIRE » (`.sur`), ni les lignes de conséquence des options. La carte ne porte plus que titre + niveaux + un geste. | Réf. cadre 5, plaque y[771,1495] = 725 px (201,39 CSS) ; bandes d'encre : titre 846-961, niveaux 1005-1034, **`.sur` 1078-1105**, gestes 1141-1275, **conséquences 1300-1449**. Les deux blocs absents occupent 280 px = **38,6 % de la hauteur de carte**. Jeu (`l24`/`l19`) : plaque 356 px (98,89 CSS) = **49,1 %** de la référence ; bandes : titre 1362-1420, niveaux 1450-1483 (la bande de 4 px à 1450-1453, 4 px d'encre au plus, est le sommet des accents de « PORTÉE »), geste 1532-1624 — **et rien entre les niveaux et le geste, rien sous le geste**. Scripts `07`, `15`, `23`. | Si la décision servie « Des rapports à lire » porte effectivement des options côté back (question de **donnée**, pas d'image). L'assumé n° 2 du dossier annonce pourtant « les options sont en TEXTE » ; l'atelier (`4bd3ea2`) marque `.sur` et les conséquences « proposé, non ratifié » — l'arbitrage entre les deux appartient à f2. La mesure hors image qui trancherait : le DTO de la décision du jour servi par `session/open` (client `d5ff4a8b`, back `241a9b6e`), ou un tour de `juge-donnees` en mode maquette. |
| `F2` | `A01` | `MAJEUR` | `INSTRUMENT NEUF` | **Le geste or de la carte de tête est un pavé plein cadre** là où la maquette pose deux gestes de même poids séparés par 7,78 CSS. | Réf. : 2 gestes, **426 × 135 px** chacun (118,3 × 37,5 CSS) = **43,1 %** de la largeur de plaque, écart 28 px ; aire d'or 51 489 px = **7,19 %** de la plaque. Jeu : **1 geste, 884 × 93 px** (245,6 × 25,8 CSS) = **89,7 %** de la largeur ; aire d'or 78 046 px = **22,23 %** de la plaque, soit **×3,09**. Script `20`. | Cause commune avec `F1` : un seul geste au lieu de deux. Le retrait du second geste est couvert par l'assumé n° 2 ; la **largeur plein cadre** du geste restant ne l'est pas, mais je ne peux pas savoir si elle est voulue (choix de mise en page) ou subie. |
| `F3` | `A01` | `MAJEUR` | `INSTRUMENT NEUF` | **[1080×2400] La ligne de file est une boîte presque vide** : la carte grandit de 32 % pendant que son texte rétrécit de 23 %. Rapport interne, donc invariant d'échelle. | Carte : réf. y[1532,1825] = 294 px = **81,67 CSS** ; jeu 2400 y[1716,2103] = 388 px = **107,78 CSS (+32,0 %)** ; jeu 1920 y[1345,1635] = 291 px = 80,83 CSS (**−1,0 %, ÉGAL**). Bloc de texte : réf. 215 px (59,72 CSS) ; jeu 165 px (45,83 CSS, **−23,3 %**). Marges internes haut/bas : réf. 38/41 px (10,56/11,39 CSS) ; jeu 111/112 px (30,83/31,11 CSS) = **×2,9 et ×2,7**. **Vide : 26,9 % en maquette, 57,5 % à 2400** (48,7 % pour la variante longue), 43,6 % à 1920. Scripts `05`, `15`, `23`. | Rien : les deux résolutions sont mesurées, et le témoin est la même carte (`.suivant`) dans les deux cadres de référence (rect identique, contrôle positif du `15`). |
| `F4` | `A01` | `MAJEUR` | `INSTRUMENT NEUF` | **L'étiquette de gravité de la ligne de file a changé de registre** : un tiers plus petite, et sans l'interlettrage de la maquette. Elle passe sous « Plusieurs attendent encore », la ligne la moins importante de la carte. | Bande accent-à-ligne-de-base : réf. « LÉGÈRE » y[1616,1642] = **27 px (7,50 CSS)** ; jeu « MODÉRÉE » y[1866,1883] = **18 px (5,00 CSS)**, soit **−33,3 %**. Capitale finale `E` : 20 px → 17 px (−15 %). Encre par lettre : 123 px / 6 = **20,5 px** → 100 px / 7 = **14,3 px** (−30 %), l'interlettrage `0,14 em` n'est pas rendu. Comparaison interne, à corps nominal égal (l'atelier donne 7,6 px à `.qui small` **et** à `.plus`) : capitale finale `E` de la gravité contre capitale `P` de `.plus` — **réf. 20 px contre 22 px (Δ 2 px), jeu 17 px contre 21 px (Δ 4 px)** : dans le jeu la gravité tombe nettement sous la ligne la moins importante de la carte. Couleur juste pour le niveau servi : (163,153,133) ≈ `#a39985` = `g-moderate`. Scripts `12`, `13`. | Les deux chaînes diffèrent (`LÉGÈRE` / `MODÉRÉE`) : je compare donc une hauteur accent-à-ligne-de-base et une encre **par lettre**, pas une largeur brute. Je ne peux pas exclure que le client applique un interlettrage que la casse de cette chaîne rendrait mal. |
| `F5` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **Interlignes serrés** dans les deux cartes — au-delà de la tolérance de 10 % sur l'espacement pour deux mesures sur trois. | Mesuré bas-de-jambage à bas-de-jambage (deux lignes portant toutes deux une descendante) : raison de la ligne de file **11,39 → 9,44 CSS (−17,1 %)** ; titre sérif de rangée **13,89 → 11,94 CSS (−14,0 %)** ; raison de rangée 11,39 → 10,56 CSS (−7,3 %, ÉGAL). Conséquence sur la plaque « la suite », qui porte la **même structure de rangées** des deux côtés (1 ligne + 1 ligne, puis 2 + 2, puis 2 + 2) : 812 px (225,56 CSS) → 741 px (205,83 CSS), **−8,7 %**. Scripts `21`, `23`. | Rien : les chaînes comparées sont identiques (« Blanchissez-le : il ne rapporte rien » / « tant qu'il dort. », « De l'argent attend dans la » / « planque »), vérifiées à l'œil sur deux découpes. |
| `F6` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — le titre sérif de rangée est rendu à un corps légèrement plus petit. | Même chaîne, largeur d'encre : « De l'argent attend dans la » 524 → 488 px (**−6,9 %**) et « planque » 160 → 149 px (**−6,9 %**, même signe, même amplitude). Capitale `D` 29 → 28 px (−3,4 %, ÉGAL). Scripts `09`, `11`. | Je lis une image, pas une fonte : je ne peux pas distinguer « corps plus petit » de « même corps, chasse légèrement différente ». Un relevé de l'atlas TMP embarqué trancherait. |
| `F7` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — « LA SUITE » est moins interlettré que la maquette. | Même chaîne : largeur d'encre 164 → 147 px (**−10,4 %**) pour une capitale 18 → 17 px (−5,6 %) : la perte est dans l'espace entre lettres (`0,28 em` en maquette), pas dans le corps. Scripts `09`, `11`. | Idem `F6`. |
| `F8` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — **[1080×2400]** l'écart entre la plaque et la ligne de file est proportionnel à la hauteur d'écran là où la maquette le pose fixe. | Réf. : **36 px = 10,00 CSS** (= `.verre{margin-bottom:10px}`). Jeu 1920 : 36 px = 10,00 CSS (**ÉGAL**). Jeu 2400 : **48 px = 13,33 CSS (+33 %)**. Les deux valeurs du jeu valent exactement **0,0250 × (H − 480)** — la règle déclarée au journal, que je confirme. Script `15`. | Rien ; la règle est cohérente avec elle-même, c'est son choix (proportionnel vs fixe) qui s'écarte de la maquette. |
| `F9` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — le séparateur de rangée de « la suite » est plus fin, et d'épaisseur variable d'une rangée à l'autre. | Réf. : **3 px (0,83 CSS)** sur les deux séparateurs, pic de luminance 32,7 et 31,7. Jeu : **1 px puis 2 px** (0,28 / 0,56 CSS) à 2400, 2 px à 1920 — pic 33,3 (même couleur, même largeur 884 px). Script `22`. | Rien : l'arrondi sous-pixel suffit à l'expliquer, mais il produit deux épaisseurs différentes dans la même plaque. |

**Compte, pris dans la table ci-dessus : 1 `BLOQUANT` · 3 `MAJEUR` · 5 `MINEUR` (dont 4 « classe C »). Total 9.**
Rien n'est compté ailleurs : les écarts assumés (§ ci-dessous) et les arbitrages (§ ci-dessous) ne
portent pas d'identifiant et n'entrent pas dans ce compte.

---

## Écarts ASSUMÉS — inventoriés et vérifiés « rendus proprement »

| # | assumé du dossier | vérification | verdict |
|---|---|---|---|
| 1 | Valeurs du HUD d'un compte neuf (10 000 €, Froid, JOUR 1, Aube) | Toutes présentes, en français, sans libellé de repli ni identifiant technique. Encre et contrastes du bandeau conformes. Aucune valeur vide. | **rendu proprement** |
| 2 | Aucun bouton sur la carte de tête hors le geste ; les options en TEXTE ; pas de « Pas maintenant » | Le second geste est bien absent (contrôle négatif du `20` : aucun geste à liseré à droite du geste or). **Mais les options en TEXTE sont absentes elles aussi** (0 bande d'encre entre les niveaux et le geste, et 0 sous le geste). | **rendu INCOMPLET → `F1`** |
| 3 | Pastille FAMILLE absente (allumée seulement par ≥ 1 rapport d'autonomie servi) | La pastille `.disc` est présente dans la référence (12 × 12 px = 3,33 CSS, couleur mesurée (217,171,78), coin haut-droit du rond FAMILLE, script `24`) et **absente du jeu** (0 px d'or dans la fenêtre, contrôle négatif voisin à 0 px). Absence nette : pas de trou, pas de rond vide à la place. | **rendu proprement** |
| 4 | Le chrome (bandeau, médaillon, filet, losange, dock) est celui du HUD v3.1, commun aux douze écrans | Cohérent et complet. Mesures relevées **pour le juge d'ensemble, non comptées ici** : médaillon ⌀ 52,22 CSS contre 48,89 (**+6,8 %**, centré à 539,5 des deux côtés) ; ronds du dock ⌀ 31,8 CSS contre 33,1 (−4 %), écartement identique (187 px) ; pastille active 38 × 5 px contre 39 × 7 px, couleur (176,141,61) contre (176,141,62) ; **matière du rond : la maquette porte un dégradé radial éclairé en haut-gauche (amplitude +4,9 de luminance), le jeu est plat (−0,9)**. Aucun élément de chrome manquant. | **rendu proprement** — la matière du rond revient au juge d'ensemble |
| 5 | Le fond est le quartier peint (diorama, NUIT), voilé comme la maquette | Bande de décor (entre le filet de bandeau et le haut de plaque) : luminance moyenne **23,4-24,3** en maquette, **20,1-25,4** en jeu ; palettes dominantes de même famille (bleus nuit (8,13,21)→(27,33,41) + une touche chaude à 7,5-8,8 % de l'aire des deux côtés). Lisibilité : les 11 textes mesurés sont **tous ≥ 4,92 : 1** en maquette et **≥ 5,11 : 1** en jeu. | **rendu proprement** |

---

## 5. Autres résolutions

- **1080×2400 (téléphone visé, variante courte et variante longue)** — résolution de référence de ce
  rapport. Tous les écarts du § 3 y sont mesurés. Rien de coupé, rien hors cadre, rien qui déborde de
  son parent : la plaque est ancrée à 1667 et la ligne de file ferme à 2103, à 296 px (82,22 CSS) du
  bas d'image, le dock au-dessous.
- **1080×1920 (art natif, variante courte et variante longue)** — l'inventaire tient. Même gouttière
  (47 px), même liseré, même filet laiton `#b08d3e`, mêmes encres, même dock, même ordre de lecture.
  Trois précisions propres à cette résolution :
  - `F3` **n'y existe pas** : la ligne de file y mesure 80,83 CSS contre 81,67 en maquette (−1,0 %,
    ÉGAL). Le vide y tombe à 43,6 % (variante courte) et 31,3 % (variante longue).
  - `F8` **n'y existe pas** : l'écart plaque ↔ file y vaut 10,00 CSS, exactement la maquette.
  - `F1`, `F2`, `F4`, `F5`, `F6`, `F7`, `F9` s'y retrouvent à l'identique (carte de tête 98,89 CSS,
    geste or 884 × 93 px, étiquette de gravité 17 px, séparateur 1-2 px).
  - La variante longue (raison sur 3 lignes) **ne déborde pas** : bloc de texte 55,56 CSS dans une
    carte de 80,83 CSS, marges 12,50/12,78 CSS. Le reflux est propre.
- Aucune des 4 planches ne montre un texte coupé, un chevauchement, ou un contenu sous la ligne de
  flottaison.

---

## 6. Non vérifié

1. **L'animation.** Les captures T et T+1 s n'ont pas été prises (dossier L99) : je ne peux pas dire
   si les `@keyframes` exigés sur un écran neuf existent. Ce qui *est* jugeable — **où tombe l'image
   figée** — l'a été : sur les 4 planches, aucune image figée ne coupe une ligne de texte, ne laisse
   un élément à mi-course ni ne vide une zone. *Mesure qui trancherait* : deux captures de la même
   planche à t et t+1 s, ou le relevé des `@keyframes` déclarés.
2. **Si la décision du jour servie porte des options** (`F1`). Je lis une image ; la présence
   d'options est une donnée. *Mesure qui trancherait* : le DTO servi par `session/open` au couple
   (client `d5ff4a8b`, back `241a9b6e`), ou un tour de `juge-donnees` en mode maquette.
3. **Le libellé du geste.** Le dossier annonce « PRENDRE ACTE » ; le jeu affiche « LIRE MAINTENANT »,
   qui est **exactement** le geste or du cadre 2 de la maquette pour cette décision. L'image fait
   autorité et l'image dit « Lire maintenant » : je ne classe donc pas d'écart, mais je ne peux pas
   trancher lequel des deux fait foi. *Mesure qui trancherait* : la clé i18n servie.
4. **La fonte réellement embarquée.** Les écarts de chasse à chaîne égale sont de signes contraires
   (sérif −6,9 %, sans-serif **+4,1 à +5,0 %**, `.sur` −10,4 %) : c'est compatible avec DejaVu à des
   corps légèrement différents, mais une image ne permet pas de le prouver. *Mesure qui trancherait* :
   un relevé de l'atlas TMP du client, ou un `fc-match` côté jeu.
5. **Les états non capturés** : file à une seule carte, file vide, carte de tête sans niveaux,
   pastille FAMILLE allumée, carte de tête avec plus de deux options.
6. **Le chrome en tant que tel** (assumé n° 4) : mesuré, non jugé — il revient au juge d'ensemble.
   En particulier la matière plate du rond de dock (amplitude de dégradé interne +4,9 → −0,9) :
   si elle est identique sur les douze écrans, elle n'est pas propre à ④.
7. **L'arbitrage entre l'assumé n° 2 et l'annotation « proposé, non ratifié »** de l'atelier sur
   `.sur` et les conséquences. C'est une décision de f2, pas une mesure. Si f2 lit l'assumé n° 2
   comme couvrant **toute** la moitié basse de la carte de tête, `F1` passe de `BLOQUANT` à
   « assumé rendu proprement » et le verdict se rejoue sur `F2`, `F3` et `F4` — c'est-à-dire qu'il
   reste **NON APPROUVÉ**.
8. **Mesures NON refaites sur d'anciennes références** : aucune. Le dossier était vide à mon arrivée
   et les deux PNG portent les empreintes des fichiers re-rendus de 16h20.

---

## Annexes

### 1. Inventaire de la référence (fiches + couche globale)

Échelle établie au § 3 du dossier, jamais déduite : **1 px CSS = 3,6 px image des deux côtés**,
rapport X = 1,000, **aucun rapport en Y** (gabarit 2102 contre captures 2400 / 1920) — toute
comparaison verticale se fait en **% de la carte** ou sur un **rapport interne**.

**Cadre 4 — « la suite »** (1080×2102)

| id | catégorie | parent | bbox px | forme | remplissage | bord | effet | texte | relations |
|---|---|---|---|---|---|---|---|---|---|
| `C.barre` | chrome | écran | (0,0)-(1079,140) | rect | dégradé nuit | filet laiton bas | — | ARGENT / 24 850 € / JOUR 12 / Plein jour | pleine largeur |
| `C.medaillon` | médaillon | chrome | ⌀ 176 px, centre x 539,5 | cercle | nuit, aiguille | anneau laiton | — | Tiède / CHALEUR | centré, chevauche le filet |
| `D.decor` | fond | écran | y 140→683 | — | bleus nuit (8,13,21)→(27,33,41) | — | voile | — | luminance moy. 23,4 ; densité 3,1 % |
| `P` | plaque | écran | (46,683)-(1033,1495) | arrondi | (11,17,29) | 3 px (33,38,49) | ombre portée vers le bas | — | ancrée en bas ; gouttière 46 px |
| `P.filet` | séparateur | `P` | y 684, x 185→891 | trait | **(176,141,62)** | — | dégradé aux bouts | — | inset symétrique |
| `P.sur` | titre | `P` | y 728-746 | — | — | — | — | « LA SUITE », capitale 18 px, interlettré, (185,173,146) | centré |
| `P.r1..r3` | rangées | `P` | y 802-896 / 974-1155 / 1233-1415 | — | — | séparateur 3 px (880 px) | — | titre sérif (242,201,107) cap. 29 px ; raison (185,173,146) | 3 rangées, interligne 11,39 CSS |
| `P.g1` | bouton or | `P.r1` | 380×93 px | pilule r≈8 CSS | dégradé or | — | — | COMMANDER | à droite |
| `P.g2,g3` | boutons liseré | `P.r2,r3` | — | pilule | `#ffffff0a` | `#ffffff2a` | — | VOIR LA VENTE / BLANCHIR | à droite |
| `F` | ligne de file | écran | (46,1532)-(1033,1825) | arrondi | (11,19,28) | 3 px **(42,54,72)** | reçoit l'ombre de `P` | — | h = 294 px (81,67 CSS) ; vide 26,9 % |
| `F.qui` | texte | `F` | y 1570-1597 | — | — | — | — | « Lt. Ilm attend vos ordres », cap. 25 px, (213,205,182) | retrait 41 px |
| `F.small` | étiquette | `F` | y 1616-1642 | — | — | — | — | « LÉGÈRE », 27 px accent→base, interlettré, (138,128,113) | sous le titre |
| `F.rep` | texte | `F` | y 1665-1742 | — | — | — | — | raison 2 lignes, (185,173,146), interligne 11,39 CSS | — |
| `F.plus` | texte | `F` | y 1763-1784 | — | — | — | — | « Plusieurs attendent encore », cap. 22 px, (140,130,114) | dernière ligne |
| `F.act` | geste texte | `F` | — | — | — | — | — | « TRANCHER », (242,201,107) | à droite, centré vertic. |
| `K.dock` | dock | écran | y 1870-2060 | — | — | — | — | EMPIRE / FAMILLE / FILIÈRE / PLUS | 4 ronds ⌀ 119 px, pas 187 px |
| `K.pt` | pastille | `K.dock` | 39×7 px | trait | (176,141,62) | — | — | — | sous EMPIRE |
| `K.disc` | pastille | `K.dock` | 12×12 px | cercle | or (217,171,78) | — | — | — | coin haut-droit de FAMILLE |

**Cadre 5 — carte de tête** (1080×2102) : même chrome, même `F`, même dock. La plaque devient
(46,771)-(1033,1495), h = 725 px (201,39 CSS) : filet laiton y 774 ; titre sérif or sur 2 lignes
(846-961, capitale 43 px) ; niveaux (1005-1034) ; **`.sur` « CE QU'ON PEUT FAIRE » (1078-1105)** ;
**deux gestes 426 × 135 px, écart 28 px, l'un or plein, l'autre à liseré (1141-1275)** ;
**quatre lignes de conséquence (1300-1449)**.

**Couche globale de la référence** — cadre 4 : luminance moy. 26,1 (méd. 17,7 ; p90 34,1), densité
(L > 40) 6,97 % ; palette (11,17,27) 24,7 % · (8,13,21) 22,9 % · (25,32,40) 19,0 % · (17,23,32)
14,0 % · (12,20,30) 11,6 % · (72,68,57) 7,8 %. Cadre 5 : moy. 28,5 ; densité 8,47 %.
Rythme vertical : barre 140 · plaque 683/771 · file 1532 · dock 1870.

### 2. Inventaire de la capture (fiches + couche globale) — refait depuis ses pixels

| id | présent | bbox px (2400) | écart à la référence |
|---|---|---|---|
| `C.barre` | oui | (0,0)-(1079,145) | filet laiton présent, pleine largeur |
| `C.medaillon` | oui | ⌀ 188 px, centre 539,5 | **+6,8 %** (chrome, assumé 4) |
| `D.decor` | oui | y 145→927 | luminance moy. 21,4 ; densité 3,5 % — même famille |
| `P` (la suite) | oui | (47,927)-(1032,1667) | largeur ÉGALE ; h 741 px contre 812 (**−8,7 %**, `F5`) |
| `P.filet` | oui | y 927, x 181→898 | **(176,141,62) exact**, inset symétrique |
| `P.sur` | oui | y 970-986 | capitale 17 px ; largeur −10,4 % (`F7`) |
| `P.r1..r3` | oui, 3 rangées | 1038-1130 / 1208-1379 / 1456-1619 | séparateurs 1 et 2 px (`F9`) ; titres −6,9 % (`F6`) |
| `P.g1` (or) | oui | 178×93 px | bouton or de rangée, hauteur ÉGALE (93 px) |
| `P.g2,g3` | oui | — | liseré présent |
| `F` (ligne de file) | oui | (47,1716)-(1032,2103) | **h 388 px contre 294 (+32,0 %)** ; vide 57,5 % (`F3`) |
| `F.qui` | oui | y 1827-1852 | capitale 24 px contre 25 — ÉGAL |
| `F.small` | oui | y 1866-1883 | **18 px contre 27 (−33 %)** (`F4`) |
| `F.rep` | oui | y 1896-1960 | interligne 9,44 CSS contre 11,39 (`F5`) |
| `F.plus` | oui | y 1971-1991 | capitale 21 contre 22 — ÉGAL |
| `F.act` | oui | — | (233,197,106) contre (242,201,107) — ÉGAL |
| **`T.sur`** (« CE QU'ON PEUT FAIRE ») | **ABSENT EN JEU** | — | `F1` |
| **`T.csq`** (conséquences des options) | **ABSENT EN JEU** | — | `F1` |
| `T.geste` | oui, **un seul** | 884×93 px | **89,7 % de la largeur contre 43,1 %** (`F2`) |
| `K.dock` | oui | 4 ronds ⌀ 114-115 px, pas 187-187,5 px | matière plate (assumé 4) |
| `K.pt` | oui | 38×5 px, (176,141,61) | ÉGAL |
| `K.disc` | **ABSENT EN JEU** | — | assumé n° 3 |
| *(rien EN TROP)* | — | — | aucune partie du jeu n'est sans contrepartie dans la maquette |

**Couche globale de la capture** — `c24` : luminance moy. 23,7 (méd. 17,4 ; p90 31,2), densité
5,41 % ; palette (12,15,24) 25,7 % · (12,19,30) 24,0 % · (23,29,36) 20,5 % · (9,14,23) 15,8 % ·
(59,57,51) 7,5 % · (15,20,29) 6,5 %. `l24` : moy. 28,9 ; densité 10,97 % (la carte de tête, deux
fois plus courte, découvre davantage de décor éclairé). `c19` : moy. 24,3 ; densité 5,38 %.
**La palette, la luminance et la densité du jeu sont dans la bande de la maquette** ; l'écart de
densité du cadre long s'explique entièrement par `F1` (moins de plaque ⇒ plus de décor visible).

### 3. Correspondance des repères (échelle, offset)

| repère | référence (1080×2102) | jeu 2400 | jeu 1920 |
|---|---|---|---|
| échelle | ×3,6 (1080 px / 300 CSS) | ×3,6 | ×3,6 |
| bord gauche de carte | x = 46 | x = 47 | x = 47 |
| bord droit de carte | x = 1033 | x = 1032 | x = 1032 |
| filet de la plaque | y = 684 (cadre 4) / 774 (cadre 5) | y = 927 / 1312 | y = 568 / 953 |
| bas de la plaque | y = 1495 | y = 1667 | y = 1308 |
| haut de la ligne de file | y = 1532 | y = 1716 | y = 1345 |
| bas de la ligne de file | y = 1825 | y = 2103 | y = 1635 |
| centre du dock (1er rond) | (259, 1930) | (258,5, 2240) | (258,5, 1760) |
| écart plaque ↔ file | 36 px = 10,00 CSS | 48 px = 13,33 CSS = 0,0250 × (H−480) | 36 px = 10,00 CSS = 0,0250 × (H−480) |

Toute mesure du § 3 cite ces repères ; aucune comparaison n'est faite en px Y absolus entre deux
hauteurs d'image différentes.

### 4. Scripts — `mesures/*.py`

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `00_tailles.py` | tailles et empreintes des 6 images | positif : réfs = 1080×2102 ; négatif : capture ≠ 2102 |
| `outil.py` | briques communes (aucune mesure) | — |
| `01_gouttiere_et_cartes.py` | premier détecteur de bord (**écarté**) | négatif : échoue sur le ciel de la réf. |
| `02_profil.py` | dump de profil brut (exploration) | — |
| `03_cartes.py` | rects par liseré (**partiellement écarté**) | positif/négatif imprimés |
| `04_rects.py` | rects par masque de couleur de liseré | négatif : 0 px de liseré sur une ligne de ciel |
| `05_rythme.py` | rythme interne de la ligne de file | positif : cadres 4 et 5 identiques |
| `06_plaque.py` | première tentative sur la plaque (**écartée**) | — |
| `07_bandes.py` | bandes d'encre des plaques, filet laiton | positif : filet = `#b08d3e` des deux côtés |
| `08_capitales.py` | hauteurs de capitale (**FAUX, voir ci-dessous**) | — |
| `09_capitales2.py` | hauteurs de capitale, runs séparés | positif : `.plus` égal ; négatif : soulignement présent/absent |
| `10_crop.py` | découpes pour inspection à l'œil | — |
| `11_lignes.py` | largeur d'encre, chaîne par chaîne | positif : chaînes identiques |
| `12_boutons.py` | boutons or, étiquette de gravité | négatif : 0 px d'or sur un bouton à liseré (jeu) |
| `13_gravite.py` | alignement gauche, étiquette de gravité | négatif : 0 encre dans un interligne |
| `14_couleurs_contraste.py` | encre au cœur des glyphes + WCAG | positif : filet `#b08d3e` ; négatif : fond/fond = 1,00 |
| `15_reperes.py` | tous les rects, vérifiés un à un | positif : cadres 4/5 et planches courte/longue identiques |
| `16_chrome.py` | chrome, 1ʳᵉ passe (**3 faux, voir ci-dessous**) | — |
| `17_dock_medaillon.py` | filet borné, dock, pastilles | positif : ronds équidistants ; négatif : `.disc` absente sous EMPIRE |
| `18_medaillon_pt_matiere.py` | médaillon, pastille active, matière du rond | négatif : aucun anneau sous le médaillon |
| `19_global.py` | palette, luminance, densité, décor | positif : cadres 4/5 égaux ; négatif : barre ≠ plein écran |
| `20_tete_et_pt.py` | gestes de la carte de tête, part d'or | positif : deux gestes trouvés par deux instruments ≠ |
| `21_interlignes.py` | interlignes bas-à-bas | positif : la réf. retrouve la CSS à 0,4 % |
| `22_separateurs.py` | épaisseur des séparateurs | négatif : 0 trait dans l'aplat |
| `23_recap.py` | récapitulatif de tous les chiffres cités | positif/négatif imprimés |
| `24_disc_et_bouton.py` | couleur de la pastille FAMILLE, hauteur du bouton or de rangée | positif : hauteur 93 px des deux côtés ; négatif : 0 px d'or 190 px à gauche |

**Faux de mon propre instrument, trouvés et corrigés** (consignés parce qu'un chiffre reproductible
et entièrement dû à l'instrument est le pire des écarts) :

1. `01`/`03`/`05` — un détecteur de bord « maximum de gradient » attrapait le **texte** au lieu du
   liseré. Remplacé par un détecteur de **maximum local** puis par la **couleur** du liseré.
2. `05` à 1080×1920 — le dégradé du décor passe juste au-dessus de la ligne de file et produisait un
   faux bord à y = 1327 ; le liseré est à **1344-1347**. Sans cette correction, la carte paraissait
   de 309 px (+5 %) au lieu de 291 px (−1,0 %). Corrigé au `15`.
3. `08` — **toutes** les hauteurs de capitale de la référence étaient gonflées par le **soulignement
   pointillé** de l'atelier. Corrigé au `09` (runs de lignes séparés). Sans cette correction, `F6`
   aurait été annoncé à −28 % au lieu de −6,9 %, et la raison de rangée à −39 % au lieu de −7,3 %.
4. `12a` — fenêtre du masque or non bornée : le titre or de rangée comptait comme « or » (604 px).
   Corrigé au `20`.
5. `16a`/`16c` — fenêtres non bornées : les toits éclairés du décor et le texte « 24 850 € »
   comptaient dans le filet et dans le médaillon (⌀ annoncé 492 px au lieu de 176). Corrigés aux
   `17`/`18`.

### 5. Le soulignement pointillé de la référence n'est PAS un trait de design

Les deux cadres de référence montrent un **soulignement pointillé** sous « LA SUITE », sous les
titres et raisons de rangée, sous les libellés de bouton, sous « CE QU'ON PEUT FAIRE » et sous les
quatre lignes de conséquence — une douzaine d'éléments. Rien de tout cela n'apparaît dans le jeu.

Ce n'est pas un écart : c'est une **annotation de l'atelier**. La page source nommée par le dossier
(`/home/erutheone/project/atelier3d-mafia/ecrans-brennar-accueil.html`, dépôt à `4bd3ea2`, exactement
le master cité au dossier) porte en en-tête, ligne 696 :

> « Un mot souligné en pointillé est **proposé, non ratifié**. »

et, ligne 725 : `.acc4 .prop{text-decoration:underline dotted #b9ad92;text-underline-offset:2px}`.

Je le consigne parce que, sans cette vérification, l'absence du pointillé aurait produit **un faux
`MAJEUR` portant sur une douzaine d'éléments**, et parce que la même annotation porte sur `.sur` et
sur les lignes de conséquence — ce qui pèse sur l'arbitrage du § 6 point 7.

### 6. Arbitrages — non corrigibles côté client, non comptés

- **Polices.** Le dossier donne les substitutions de la machine de rendu (Georgia → Noto Serif,
  Segoe UI → Noto Sans, Courier New → Liberation Mono). **Sur cet écran, aucun élément mesuré n'est
  concerné** : toutes les piles de `.acc4` sont `DejaVu Sans` / `DejaVu Serif`, que le client embarque.
  Les écarts de corps de `F6` et `F7` ne sont donc **pas** imputables à une substitution de famille —
  c'est pour cela que je les ai classés en écarts et non en arbitrages. Les 3 + 3 éléments de chrome
  en Georgia / Segoe UI relèvent, eux, de l'arbitrage de substitution **et** du juge d'ensemble.
- **Libellé du geste** : dossier « PRENDRE ACTE » contre jeu « LIRE MAINTENANT », qui est le geste or
  de la maquette pour cette décision. L'image fait autorité ⇒ pas d'écart classé ; arbitrage f2.
- **Format de la valeur d'argent** : « 10 000 € » (jeu) contre « 24 850 € » (maquette) — même forme,
  valeur servie, couvert par l'assumé n° 1.
- **Assumé n° 2 contre annotation « proposé, non ratifié »** (§ 6 point 7) : arbitrage f2. Il déplace
  `F1`, pas le verdict.
