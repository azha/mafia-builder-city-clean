# Juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`) — r7 — 2026-08-31

Référence principale : `reference/m-120.png` (état VIERGE, 900×1752 = 300×584 css, ×3,0).
Capture principale : `Assets/Screenshots/screen_b3_reputation_1080x1920.png` (1080×1920 = 300×533,3 css, ×3,6).
**Toutes les grandeurs de ce rapport sont en px CSS**, jamais en px bruts (cf. §Annexe 3).

## Verdict : NON APPROUVÉ

Aucun BLOQUANT — rien n'est coupé, absent, hors cadre ni illisible, à aucune des deux résolutions —
mais **trois MAJEURS** : un vide de mise en page qui a grandi de 75 % au bas de la grande carte, une
chevelure qui déborde la tête et se lit comme un couvre-chef, et la disparition du liseré sombre qui
détourait le portrait. (Dans le vocabulaire à trois crans de l'orchestrateur : **REFUSÉ**, sur ces
trois points seulement.)

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Vingt et une grandeurs mesurées identiques (tolérances du mandat : ≤ 2 px css ou 1,5 % du parent ;
couleur ≤ 6/255 ; capitale ≤ 1 px ou 5 %).

| # | grandeur | référence | en jeu | écart | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre doré | 448,0 css | 448,3 css | +0,3 | `02` |
| 2 | largeur de la règle dorée sous le titre | 180,0 css | 180,0 css | 0,0 | `12` (CTRL+) |
| 3 | hauteur de la rangée des compteurs | 42,0 css | 42,2 css | +0,2 | `03` |
| 4 | pas horizontal des 3 tuiles de compteur | 95,9 / 96,0 css | 96,5 / 96,7 css | +0,6 | `06` |
| 5 | hauteur de capitale des chiffres « 00 » | 10,3 css | 10,6 css | +2,9 % | `06` |
| 6 | couleur des chiffres | `(127,212,217)` | `(127,212,217)` | 0 | `05` |
| 7 | capitale du « L » de *Le miroir* | 12,33 css | 12,78 css | +3,6 % | `20` |
| 8 | largeur d'encre de *Le miroir* | 115,3 css | 116,4 css | +1,0 % | `14` |
| 9 | capitale du « D » de *DONNER* | 6,67 css | 6,39 css | −4,2 % | `20` |
| 10 | largeur d'encre du CTA | 169,7 css | 168,4 css | −0,8 % | `14` |
| 11 | *Rien n'a encore déteint* : encre H × L | 11,00 × 170,0 css | 10,83 × 170,3 css | −1,5 % / +0,2 % | `14`,`15` |
| 12 | titre de carte de règle (*col ouvert*) | 6,00 css | 6,11 css | +1,8 % | `15` |
| 13 | sous-titre de carte (*la comptabilité tenue*) | 5,33 css | 5,56 css | +4,3 % | `15` |
| 14 | sur-titre bas (*« PAS JUGEABLE » N'EST PAS…*) | 5,00 css | 5,00 css | 0,0 | `15` |
| 15 | interligne du verdict *Pas encore jugeable* | 11,6 css | 11,4 css | −1,7 % | `15` |
| 16 | écart entre deux cartes de règle | 4,3 css | 4,2 css | −2 % | `08` |
| 17 | marge HAUTE de la carte du portrait dans la grande carte | 8,0 css | 7,8 css | −0,2 | `17` |
| 18 | gouttière entre colonne portrait et colonne cartes | 10,3 css | 10,3 css | 0,0 | `20` |
| 19 | couleur du liseré de carte | `(42,54,72)` = `#2a3648` | `(42,53,73)` | ≤1/255 | `20` |
| 20 | rapport L/H de l'ellipse du gant (SVG : 1,47) | 1,60 | 1,54 | −0,06 | `13` |
| 21 | luminance moyenne / densité d'encre, **dans le cadre** | 31,99 / 12,04 % | 30,65 / 11,35 % | −4 % / −0,7 pt | `17` |

Et, en couleurs de jeton : **or_vif** `#f2c96b`, **crème** `#eae0c8`, **crème2** `#b9ad92`,
**muet** `#8a979c`, **vert** `#7db36a`, **cyan** `#7fd4d9`, **liseré** `#2a3648`, **rang** `#232a2d`
sont rendus **au jeton près** (`14`, `05`, `13`, `20`). C'est la réponse directe à l'angle mort
**A2** (« les couleurs rendues ») : sur les aplats et les textes, rien ne dérive.

**Stabilité T / T+1 s (`01`)** : **1 pixel** diffère, d'un delta de **1/255**. Contrôle positif
(image contre elle-même) = 0 ; contrôle négatif (16:9 contre 20:9 recadrée) = 590 848. L'écran ne
porte donc aucune animation — la garde du mandat est passée.

---

## 0. L'écran, tel que la maquette le dit (lu sur `m-120.png` seule)

**But.** Un miroir. On vient y lire ce que le lieutenant a *absorbé* des règles qu'on lui a données.
Sur `m-120`, l'état est vierge : la réponse est « rien, et ce n'est pas un jugement ».

**Ordre de lecture.** (1) *Le miroir*, doré, capitales espacées, seul élément chaud de la moitié
haute. (2) La rangée des trois compteurs, cyan vif sur trois plaques — c'est le chiffre qui accroche.
(3) La grande carte : à gauche l'homme, à droite la liste de ses quatre tenues. (4) La plaque
d'explication en bas, texte courant, la seule zone de prose. (5) Le CTA doré, cerclé, qui ferme
l'écran.

**Zones.** Panneau-titre (titre + sur-titre + règle dorée) · rangée de trois compteurs · grande
carte à deux colonnes (carte du portrait cerclée d'or / quatre cartes de règle) · plaque
d'explication · CTA.

**Traits d'identité.** ① Le portrait détouré : un homme dessiné à plat, chaque forme cernée d'un
liseré presque noir, comme un autocollant posé sur la carte. ② Le reflet du miroir : une seule
ligne turquoise horizontale, en dégradé, qui traverse le tiers haut de la grande carte — la seule
chose qui dit « miroir ». ③ Le seul encadrement doré de l'écran est sur le portrait : l'homme est
l'objet, pas la liste. ④ Trois chiffres cyan sur fond nuit, rien d'autre de saturé. ⑤ Un rythme
vertical serré : les blocs se suivent sans respiration, la seule vraie détente est sous la colonne
du portrait.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, dans l'essentiel. Le but est lisible, l'ordre de lecture est le même (titre doré → compteurs
cyan → portrait + quatre tenues → prose → CTA), les cinq zones sont là, dans le bon ordre, aux
bonnes proportions horizontales, et la palette globale est superposable (luminance 32,0 → 30,7 ;
densité d'encre 12,0 % → 11,4 %). La polarité est juste : les quatre voyants sont éteints, les
quatre libellés sont les libellés « off » (*col ouvert*, *manches basses*, *montre cachée*,
*gants sales*), le verdict est *Pas encore jugeable*, et le tiret d'ENFREINTES porte exactement le
cyan et la position des deux « 00 » — le trou se lit comme un trou.

Ce qui a bougé tient en trois choses, dans cet ordre d'impact perçu.

**① Le bas de la grande carte s'est creusé.** Sous la carte du portrait, la maquette laisse 21,4 css
de fond ; le jeu en laisse **37,5**, soit **+75 %**. Rapporté à la marge haute du même conteneur
(8,0 css, restée juste), la maquette est à 2,67× et le jeu à 4,81×. Un joueur ne mesure pas ça : il
voit une carte qui se termine par une bande noire vide et se demande ce qui manque. C'est
exactement la famille que l'auteur déclare non couverte en **A3**, et c'est le seul écart de mise en
page que l'œil attrape sans comparaison.

**② L'homme porte un chapeau.** Dans la maquette, la chevelure est *plus étroite* que le crâne
(0,95× la largeur de la tête) : elle se pose dessus. Dans le jeu elle est **plus large** (1,11×) et
déborde d'environ 2 css de chaque côté, sur une hauteur augmentée de 33 %. Le résultat ne se lit
plus comme des cheveux mais comme un béret. Le trait n'est lié à aucune clé de données — mais c'est
le visage du seul personnage de l'écran.

**③ Le portrait a perdu son trait de contour.** La maquette cerne chaque forme d'un liseré `#0b1016`
de 2 à 3 css : autour de la tête, 2,7 css ; autour du buste, 3,0 css. Dans le jeu, la tête n'a plus
que ~0,9 css d'anticrénelage et le buste **rien du tout** — le profil horizontal passe du fond au
remplissage par une rampe continue, sans jamais descendre sous la valeur du fond. Le buste fond dans
la carte, et le trait d'identité ① disparaît. Le dossier assume l'absence du liseré **sur le col
seulement** ; la tête et le buste sortent de ce périmètre.

Ce qui n'a **pas** bougé mérite d'être dit aussi fort : les hauteurs de capitale, les largeurs
d'encre, toutes les couleurs de jeton, les écarts entre cartes, la gouttière entre les deux
colonnes, le pas des compteurs, et la stabilité T/T+1 s.

---

## 3. Écarts — un finding par ligne

| id | zone | gravité | référence | en jeu | écart | instrument | critère |
|---|---|---|---|---|---|---|---|
| **F1** | grande carte — vide sous la carte du portrait | **MAJEUR** | 21,4 css = 10,1 % de la grande carte ; rapport marge basse/haute = 2,67 | 37,5 css = 17,2 % ; rapport 4,81 | **+16,1 css (+75 %)** ; +7,1 pt de la hauteur de carte | `09_boites.py`, `17_couche_globale.py` | NOUVEAU |
| **F2** | portrait — chevelure | **MAJEUR** | largeur max 32,7 css = **0,95×** la largeur de la tête ; monte 16,0 css au-dessus du crâne | 40,8 css = **1,11×** la tête ; monte 21,3 css | +8,1 css (+25 %) en largeur, +5,3 css (+33 %) en hauteur ; **rapport chevelure/tête +17 %** (invariant d'échelle) | `18_tete_cheveux.py` | NOUVEAU |
| **F3** | portrait — liseré de contour | **MAJEUR** | stroke `#0b1016` : tête 2,7 css, buste 3,0 css (profil : fond → 11,16,22 → remplissage) | tête ≈0,9 css ; buste **0** (rampe continue 13,22,34 → 22,22,28, jamais plus sombre que le fond) | liseré supprimé sur 2 formes sur 3 | `11_buste.py`, `18_tete_cheveux.py` | NOUVEAU (l'assumé ne couvre que le **col**) |
| **F4** | colonne droite — hauteur des cartes de règle | MINEUR | 28,0 css ×4 ; padding haut 7,0 / bas 6,3 ; bloc des 4 = 125,0 css | 25,6 css ×4 ; padding 6,1 / 5,0 ; bloc = 115,0 css | −2,4 css par carte (−8,6 %) ; **−10,0 css sur le bloc** ; les textes internes, eux, sont ÉGAUX | `08_cartes_v2.py`, `15_capitales.py` | NOUVEAU |
| **F5** | carte du portrait — hauteur | MINEUR | 182,3 css | 172,2 css | −10,1 css (−5,5 %) | `09_boites.py` | NOUVEAU |
| **F6** | grande carte — hauteur | MINEUR | 211,7 css | 217,5 css | +5,8 css (+2,7 %) — croît pendant que ses deux colonnes rétrécissent : le mou ne vient pas du contenu | `09_boites.py` | NOUVEAU |
| **F7** | grande carte — padding horizontal intérieur | MINEUR | 8,33 css à gauche **et** à droite | 6,39 css des deux côtés | −1,9 css (−23 %) ; **écart sélectif** : le padding vertical haut est conservé (8,0 → 7,8) ⇒ conteneur différent en horizontal | `20` | NOUVEAU |
| **F8** | colonne droite — largeur des cartes | MINEUR | 151,0 → 276,7 css (L = 126,0) | 148,1 → 279,7 css (L = 131,9) | +5,9 css (+4,7 %) — conséquence directe de F7 | `20` | NOUVEAU |
| **F9** | portrait — marques du gant (« gants sales ») | MINEUR | deux traits **diagonaux**, pente dy/dx **+0,52** et **−0,26** (SVG : +0,53 / −0,33) | deux traits **horizontaux**, pente **+0,03** et **+0,04** | l'usure devient un « = » ; trait lié à la clé `gloves` | `13_gant.py` | NOUVEAU |
| **F10** | portrait — taille du gant | MINEUR | 13,33 × 8,33 css | 15,00 × 9,72 css | +12,5 % / +16,7 % (le rapport L/H, lui, reste juste : 1,60 → 1,54) | `13_gant.py` | NOUVEAU |
| **F11** | portrait — trait crème **EN TROP** à la pointe du col | MINEUR | rien : rangées de remplissage `#16191b` pures de part et d'autre | trait horizontal de **1 px**, y_local 244,72, x 65,0 → 86,4 css (**21,7 css** = la largeur nominale du triangle), rgb `(143,136,122)` | partie sans contrepartie dans la maquette ; lit comme le bas de la boîte du triangle | `12_trait_parasite.py` | NOUVEAU |
| **F12** | portrait — taille du col | MINEUR | triangle 16,7 css ; rapport col/tête = **0,491** | 20,8 css ; rapport = **0,581** | +24 % en absolu, **+18 % en rapport à la tête** (invariant d'échelle). Le remplissage aire/boîte reste 0,41 → 0,40 : c'est bien un triangle | `10_portrait.py` | NOUVEAU |
| **F13** | grande carte — légende « ce qu'il a absorbé de vos règles » | MINEUR | **3 lignes** ; encre x 210,0 → 269,3 (L = 59,3 css) ; marge droite 16,7 css | **2 lignes** ; x 210,0 → 279,7 (L = 69,7 css) ; marge droite 7,5 css | reflux dû à F7/F8 ; le bloc d'en-tête change de silhouette | `14_textes.py`, `15_capitales.py` | NOUVEAU |
| **F14** | colonne droite — écart en-tête → 1ʳᵉ carte | MINEUR | 6,3 css | 4,2 css | −2,1 css (−33 %) | `15_capitales.py` + `08_cartes_v2.py` | NOUVEAU |
| **F15** | reflet du miroir — intensité | MINEUR | pic du dégradé `(64,105,114)` à x ≈ 152 css | `(70,119,122)` au même x | +6 / **+14** / +8 par canal ; la teinte bascule (b−g : +9 → +3) | `04_ligne_miroir.py` | DÉJÀ APPLIQUÉ (le dossier nomme le piège sRGB/linéaire ; couche translucide, cause de classe « espace de mélange ») |
| **F16** | reflet du miroir — position | MINEUR | y_local 174,7 css = 31 % de la hauteur de la grande carte | 169,2 css = 28 % | −5,5 css ; **reste dans le tiers haut** ⇒ l'écart assumé tient | `04_ligne_miroir.py` | DÉJÀ APPLIQUÉ |
| **F17** | cadre — largeur et marge gauche | MINEUR | 287,7 css ; marge gauche 6,0 css | 289,7 css ; 5,0 css | +2,0 css / −1,0 css (au seuil de bruit, mais systématique sur les deux bords) | `02_reperes.py` | NOUVEAU |
| **A1** | mention « lieutenant.name — non projeté (L0.4) » | ASSUMÉ | présente, sous le verdict, en `eteint` | présente, sous *Il vous écoute*, même couleur, même place | rendu proprement ⇒ **ne sort pas** de l'assumé | `14_textes.py` | DÉJÀ APPLIQUÉ |
| **A2** | compteur ENFREINTES au tiret | ASSUMÉ | (la réf porte « 00 ») | tiret **cyan `(127,212,217)`**, identique aux deux « 00 » ; décalage dans sa tuile −3,06 css (réf des « 00 » : −3,67) ; centre vertical 78,8 css contre 77,4 | **couleur ET position conformes** ⇒ ne sort pas de l'assumé | `05`, `06_tiret_enfreintes.py` | DÉJÀ APPLIQUÉ |
| **A3** | col rendu par un triangle plein sans liseré | ASSUMÉ | — | remplissage aire/boîte **0,395** (réf 0,410 ; le dossier prévient qu'un 0,9 serait une autre forme) ; centré sur l'axe du cou ; ne recouvre pas le cou | ne sort pas de l'assumé — **mais** le liseré manquant du buste et de la tête sort de ce périmètre (F3) | `10_portrait.py` | DÉJÀ APPLIQUÉ |
| **A4** | 4 couleurs hors `DesignTokens` | ASSUMÉ | jetons de la maquette | `#f2c96b`, `#eae0c8`, `#b9ad92`, `#8a979c`, `#7db36a`, `#7fd4d9`, `#2a3648`, `#232a2d` rendus au jeton près | **aucune conséquence visible** ⇒ ne sort pas de l'assumé | `14`, `05`, `13`, `20` | DÉJÀ APPLIQUÉ |
| **A5** | reflet fixe, non animé | ASSUMÉ | animé (7,5 s) dans la CSS, figé dans le rendu ratifié | présent, dans le tiers haut (28 %) ; 1 px différent entre T et T+1 s | ne sort pas de l'assumé | `01`, `04` | DÉJÀ APPLIQUÉ |

**Compte : 0 BLOQUANT · 3 MAJEURS · 14 MINEURS · 5 ASSUMÉS · 0 ARBITRAGE.**
`NOUVEAU` : 3 MAJEURS sur 3, 11 MINEURS sur 14.

**Causes communes.** F5 + F6 + F1 sont une seule respiration mal répartie : la colonne du portrait
raccourcit (−10,1) pendant que son conteneur s'allonge (+5,8), et les 16,1 css partent tous en bas.
F7 → F8 → F13 est une seule chaîne : un padding horizontal de 6,4 au lieu de 8,3 élargit la colonne
droite, qui fait reflué la légende de 3 à 2 lignes. F4 est indépendante (padding interne des cartes).
F2 + F3 + F9 + F10 + F11 + F12 sont toutes dans le portrait : c'est l'angle mort **A7**, et il est
ouvert.

---

## 5. Autres résolutions

**1080×2400 (20:9, cible téléphone) — TIENT.** (`16_resolution_2400.py`)
Le cadre est **au pixel identique** au 16:9 : x 5,0 → 294,7 css (largeur 289,7 css, contrôle positif
exact), y 6,7 → 455,0 css (hauteur 448,3). Rien n'est coupé, rien ne dépasse : 0 px d'encre à moins
d'1 css des bords de l'image ; les seuls pixels « hors cadre » (2 086, luminance 126 = le doré) sont
les coins arrondis du cadre lui-même, en nombre strictement identique en haut et en bas.
Le contenu ne reflue pas : la hauteur du cadre est fixée à 462 css par la maquette, et les 133,4 css
de hauteur supplémentaire vont intégralement au fond sous le cadre — la place du dock (marge basse
78,3 css en 16:9, 211,7 css en 20:9). **Aucun écart propre à cette résolution.**
Note : 236 824 pixels diffèrent entre les deux captures *dans* le cadre, avec un delta max de
**7/255** — géométrie identique, seul le fond recalculé sous les surfaces translucides bouge. C'est
au plancher de bruit ; je ne le compte pas comme écart (voir §6).

**1080×1920 T+1 s — TIENT.** 1 pixel, delta 1/255 (`01_stabilite.py`). Aucune animation.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Le chrome (bandeau ARGENT / HEAT / JOUR et dock).** Absent des trois captures, délibérément.
   Je ne peux donc vérifier ni *que rien ne passe sous le bandeau*, ni *que rien ne touche le dock* —
   or c'est précisément là que le cadre à hauteur fixe rencontre le shell. Je peux seulement dire
   que la marge sous le cadre vaut 78,3 css en 16:9 et 211,7 css en 20:9, et que le cadre commence à
   6,7 css du haut de l'image alors que la maquette lui donne 122 css de chrome au-dessus.
   *Ce qui trancherait* : une capture montée dans le shell, après l'override d'identité (angle mort A4).
2. **Les états `drifting` / `hostile` / `wary` / liste pleine / gages / lots.** Aucune image de ces
   états dans le dossier. Je juge l'état vierge, et rien d'autre. *Ce qui trancherait* : un scénario
   ou un seed qui les produise, puis une capture par état (A5).
3. **La famille de police.** Je mesure des hauteurs de capitale et des largeurs d'encre, pas des
   contours. Les deux coïncidant (« Rien n'a encore déteint » : 170,0 contre 170,3 css de large pour
   11,00 contre 10,83 css de haut ; « Le miroir » : 115,3 contre 116,4), une substitution est
   improbable — mais je ne peux pas l'exclure. *Ce qui trancherait* : `fc-match` sur la CSS de la
   maquette confronté au nom de la police embarquée par le client.
4. **L'animation au-delà d'une seconde.** La paire T / T+1 s exclut tout mouvement de période courte
   ou toute boucle en cours. Une animation d'entrée déjà terminée à T, ou de période > 1 s, n'y
   laisserait aucune trace. *Ce qui trancherait* : une troisième capture à T+4 s.
5. **L'interligne du sur-titre du panneau-titre.** Mon découpage en bandes fusionne ses deux lignes
   dans la référence (interligne serré) et les sépare dans la capture ; les deux chiffres ne sont pas
   comparables et je ne publie ni l'un ni l'autre. *Ce qui trancherait* : un découpage par colonne
   plutôt que par rangée.
6. **Les 236 824 px à Δ ≤ 7/255 entre 16:9 et 20:9, dans le cadre.** Je constate la différence ; je
   ne peux pas dire depuis l'image si c'est le dégradé de fond recalculé sous les surfaces
   translucides ou un tonemap dépendant de la taille de cible. *Ce qui trancherait* : une capture
   20:9 avec le fond remplacé par un aplat.
7. **La cause des trois MAJEURS.** Je nomme la classe (une répartition de mou dans un conteneur
   vertical pour F1 ; une forme et une échelle pour F2 ; un contour non porté par les formes du
   portrait pour F3). Je n'ouvre pas le code et je ne désigne aucune ligne.

---

## Annexes

### Annexe 1 — Inventaire de la référence (`m-120.png`, y_local = 0 au bord haut intérieur du cadre)

| id | catégorie | bbox (css_local) | remplissage / bord | texte |
|---|---|---|---|---|
| `frame` | cadre | y 0 → 448,0 ; x 6,0 → 293,7 | bord doré `#b08d3e` 1 css, coins arrondis | — |
| `P1` | panneau-titre | y ~6,3 → 59 | fond carte ; règle dorée 180,0 css de large à y 57,0 | — |
| `P1.titre` | titre | y 15,3 → 28,3 ; x 91,0 → 206,3 | `#f2c96b` | *Le miroir*, capitale 12,33 css, sérif, capitales espacées |
| `P1.sur` | sur-titre | y ~36,7 → 48,0 | `#b9ad92` | 2 lignes capitales |
| `P2` | rangée de compteurs | y 68,0 → 110,0 (H 42,0) | 3 tuiles, pas 95,9 css | — |
| `P2.n1..n3` | chiffres | y 74,3 → 84,3 (capitale 10,3) | `#7fd4d9` | `00` / `00/4` / `00` |
| `P3` | grande carte | y 109,0 → 320,7 (H 211,7) ; x 14,0 → 286,0 | liseré `#2a3648` ; padding intérieur 8,3 css horizontal, 8,0 haut | — |
| `P3.prt` | carte du portrait | y 117,0 → 299,3 (H 182,3) ; x 23,0 → 140,7 (L 117,7) | bord **doré** `#b08d3e` | — |
| `P3.prt.tete` | tête | y 179,0 → ~209 ; L max 34,3 css | `#b9ad92`, **liseré `#0b1016` 2,7 css** | — |
| `P3.prt.cheveux` | chevelure | y 163 → 180 ; L max **32,7 css (0,95× la tête)** | `#16191b` + liseré | — |
| `P3.prt.buste` | buste | y ~232 → 274 ; L 72,0 css | `#16191b`, **liseré 3,0 css** | — |
| `P3.prt.col` | col (triangle) | y 232,3 → 248,7 ; L = H = 16,7 css ; remplissage aire/boîte 0,410 | `#eae0c8` + liseré fin | — |
| `P3.prt.gant` | gant | y 256,0 → 264,0 ; 13,33 × 8,33 css ; L/H 1,60 | `#232a2d` ; **2 marques diagonales** (+0,52 / −0,26) | — |
| `P3.prt.verdict` | verdict | y 272,0 → 278,7 ; x 35,3 → 128,3 | `#7db36a` | *Il vous écoute* |
| `P3.mir` | reflet du miroir | y 174,7 ; épaisseur 2,0 css ; dégradé plein cadre, pic à x ≈ 152 | pic `(64,105,114)` | — |
| `P3.verd` | verdict droite | 2 lignes, y 120,7 / 132,3 ; interligne 11,6 | `#8a979c` | *Pas encore jugeable* |
| `P3.leg` | légende | **3 lignes**, x 210,0 → 269,3 (L 59,3) | `#8a979c` | *ce qu'il a absorbé de vos règles* |
| `P3.rg1..4` | cartes de règle | y 151,0 / 183,3 / 215,7 / 248,0 ; H **28,0** ; écart 4,3 ; x 151,0 → 276,7 (L 126,0) | fond `#111823`, liseré `#2a3648` | titre 6,00 css `#b9ad92` / sous-titre 5,33 css `#6b737d` |
| `P4` | plaque d'explication | y 329,7 → 405,0 (H 75,3) | fond carte, liseré | sur-titre 5,00 · titre 11,00 · prose |
| `P5` | CTA | y 415,0 → 441,3 (H 26,3) | bord doré | *DONNER UNE PREMIÈRE RÈGLE*, capitale 6,67 css |

**Couche globale (dans le cadre)** : palette `(17,24,35)` 35,6 % · `(15,21,30)` 23,4 % ·
`(11,14,18)` 17,0 % · `(70,71,63)` 11,7 % · `(13,17,22)` 7,8 % · `(15,24,32)` 4,5 %.
Luminance moyenne **31,99** ; densité d'encre (lum > 40) **12,04 %**.

### Annexe 2 — Inventaire de la capture (`screen_b3_reputation_1080x1920.png`)

Mêmes parties, mêmes catégories, **aucune partie absente, une seule partie EN TROP** (F11, le trait
crème d'1 px à la pointe du col).

| id | bbox (css_local) | delta vs réf |
|---|---|---|
| `frame` | y 6,7 → 455,0 (H 448,3) ; x 5,0 → 294,7 (L 289,7) | +0,3 / +2,0 |
| `P1` | règle dorée 180,0 css à y 55,0 | largeur ÉGALE |
| `P1.titre` | y 15,8 → 27,5 ; x 92,2 → 208,6 ; capitale 12,78 | ÉGAL |
| `P2` | y 66,1 → 108,3 (H 42,2) ; pas 96,5 css | ÉGAL |
| `P2.n3` | **tiret** cyan `(127,212,217)`, centre vertical 78,8 css, décalage −3,06 | ASSUMÉ tenu |
| `P3` | y 107,2 → 324,7 (H **217,5**) ; x 12,8 → 287,2 ; padding horizontal **6,39** | **F6, F7** |
| `P3.prt` | y 115,0 → 287,2 (H **172,2**) ; x 20,0 → 137,8 (L 117,8) | **F5** (largeur ÉGALE) |
| `P3.prt.tete` | y 173,3 → ~203 ; L max 36,7 ; **liseré ≈0,9 css** | **F3** |
| `P3.prt.cheveux` | y 152 → 175 ; L max **40,8 css (1,11× la tête)** | **F2** |
| `P3.prt.buste` | L 74,2 css ; **liseré 0** | **F3** |
| `P3.prt.col` | y 223,3 → 243,9 ; L = H = 20,8 ; remplissage 0,395 | **F12** (forme conforme) |
| `P3.prt.trait` | **EN TROP** — y 244,72, x 65,0 → 86,4 (21,7 css), 1 px, `(143,136,122)` | **F11** |
| `P3.prt.gant` | y 247,5 → 256,9 ; 15,00 × 9,72 ; L/H 1,54 ; **2 marques horizontales** (+0,03 / +0,04) | **F9, F10** |
| `P3.mir` | y 169,2 ; épaisseur 1,9 ; pic `(70,119,122)` | **F15, F16** |
| `P3.verd` | 2 lignes, y 116,1 / 127,5 ; interligne 11,4 | ÉGAL |
| `P3.leg` | **2 lignes**, x 210,0 → 279,7 (L 69,7) | **F13** |
| `P3.rg1..4` | y 141,7 / 171,4 / 201,4 / 231,1 ; H **25,6** ; écart 4,2 ; x 148,1 → 279,7 (L 131,9) | **F4, F8** |
| `P3.vide` | **37,5 css** sous la carte du portrait | **F1** |
| `P4` | y 334,7 → 406,7 (H 72,0) | −3,3 |
| `P5` | y 416,9 → 441,4 (H 24,5) ; capitale 6,39 | −1,8 / ÉGAL |

**Couche globale (dans le cadre)** : `(13,22,34)` 44,4 % · `(13,13,15)` 18,2 % · `(21,22,28)` 12,6 % ·
`(15,19,24)` 12,1 % · `(80,79,70)` 10,8 % · `(13,22,35)` 1,9 %.
Luminance moyenne **30,65** ; densité **11,35 %**. Mêmes familles, mêmes proportions.

### Annexe 3 — Correspondance des repères

| | px/css | bord haut intérieur du cadre (px bruts) | conversion |
|---|---|---|---|
| référence `m-120.png` (900×1752) | **×3,0** | y = 381 | `y_local_css = (y_px − 381) / 3,0` · `x_css = x_px / 3,0` |
| capture 1080×1920 | **×3,6** | y = 24 | `y_local_css = (y_px − 24) / 3,6` · `x_css = x_px / 3,6` |
| capture 1080×2400 | **×3,6** | y = 24 | idem |

Bords latéraux du cadre : réf x 18 → 881 px bruts ; capture x 18 → 1061.
**Contrôle de l'échelle** : la hauteur du cadre vaut 1 344 px bruts en référence et 1 614 en
capture (rapport 1,201 = 3,6/3,0), soit **448,0 css contre 448,3 css**. L'échelle est posée ; aucune
mesure de ce rapport n'est en px bruts.

### Annexe 4 — Scripts (`mesures/`)

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `01_stabilite.py` | diff pixel T / T+1 s | CTRL+ image vs elle-même = 0 · CTRL− 16:9 vs 20:9 = 590 848 |
| `02_reperes.py` | bornes du cadre doré, échelle | CTRL+ hauteur css égale · CTRL− px bruts différents (×1,2) |
| `03_rythme.py` | frontières horizontales par saut de luminance | (profil brut, sert de carte) |
| `04_ligne_miroir.py` | étendue, épaisseur, profil et pic du reflet | CTRL+ règle dorée trouvée pleine · CTRL− ligne de fond = None |
| `05_compteurs.py` | encre et couleur des 3 chiffres | CTRL− couleur du libellé gris ≠ couleur du chiffre |
| `06_tiret_enfreintes.py` | périmètre de l'assumé « tiret » : couleur, centre, décalage | CTRL+ tuiles 0 et 1 identiques · CTRL− la tuile 2 de la réf se comporte comme un « 00 » |
| `07_cartes_regles.py` | (1ʳᵉ tentative, colonne traversant le texte — **écartée**, remplacée par `08`) | — |
| `08_cartes_v2.py` | bornes des 4 cartes par médiane de rangée | CTRL+ 4 bandes trouvées des deux côtés · CTRL− marge du cadre |
| `09_boites.py` | carte du portrait (liseré doré), grande carte, le vide | CTRL+ largeur de la carte du portrait égale · CTRL− 0 px doré hors cadre |
| `10_portrait.py` | formes du portrait par couleur de jeton | CTRL+ couleur exacte au jeton · CTRL− magenta = 0 px |
| `11_buste.py` | présence du liseré du buste, profil du bord | CTRL+ le liseré est trouvé sur la réf · CTRL− milieu du dôme |
| `12_trait_parasite.py` | le trait crème d'1 px, rangée par rangée | CTRL+ la règle dorée du titre est retrouvée (180,0 css) |
| `13_gant.py` | ellipse du gant, rapport L/H, **pente des marques** | CTRL+ L/H attendu 1,47 · CTRL− centre du buste = 0 px |
| `14_textes.py` | hauteur d'encre et couleur des textes | CTRL− fenêtre vide = 0 px |
| `15_capitales.py` | hauteur ligne par ligne | CTRL− fond = 0 bande |
| `16_resolution_2400.py` | cadre, marges, encre hors cadre en 20:9 | CTRL+ largeurs de cadre égales · CTRL− hauteurs d'image différentes |
| `17_couche_globale.py` | palette, luminance, densité, rythme, le vide en % | CTRL+ familles dominantes identiques · CTRL− palette de la bande du titre |
| `18_tete_cheveux.py` | profil de largeur de la chevelure, liseré de la tête | CTRL+ liseré trouvé sur la réf · CTRL− centre de la joue |
| `19_tuiles_titre.py` | bords des tuiles et du panneau-titre | CTRL− intérieur de la grande carte |
| `20_appoints.py` | capitale sur glyphe isolé · bords de la colonne des cartes · **padding horizontal de la grande carte** · couleur du filet de carte | CTRL+ padding gauche = padding droite sur la même image (8,33/8,33 en réf ; 6,39/6,39 en jeu) · CTRL− la rangée du vide ne rend aucune carte |

**Instruments écartés** (dits ici plutôt que publiés) :
- `07_cartes_regles.py` : la colonne verticale traversait le texte des cartes ; il rendait 8 à 9
  « cartes » là où il y en a 4. Ses chiffres ne sont pas dans ce rapport ; `08` l'a remplacé et passe
  son contrôle positif (4 bandes).
- La hauteur d'encre en bande de `14`/`15` pour *Le miroir* (13,33 → 11,94 css) et pour le CTA
  (6,67 → 8,06 css) : la fenêtre capturait les accents (`È` de PREMIÈRE) d'un côté et pas de l'autre.
  Mesurés sur un glyphe isolé (`L`, `D`), les deux sont ÉGAUX. **Ces deux écarts sont retirés** ;
  seuls les chiffres du glyphe isolé figurent au contrôle positif (lignes 7 et 9).
- Le repérage du gant par le jeton `rang` dans `10` : il ne trouvait que des pixels d'anticrénelage
  épars (remplissage aire/boîte 0,014). Remplacé par `13`, qui isole l'ellipse par contraste.
