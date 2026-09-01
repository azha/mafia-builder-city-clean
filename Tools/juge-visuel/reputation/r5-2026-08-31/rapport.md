# Juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`) — r5 — 2026-08-31

Référence : `reference/m-120.png` (état VIERGE, 900×1752, ×3,0).
Capture principale : `Assets/Screenshots/screen_b3_reputation_1080x1920.png` (1080×1920, ×3,6).
Toutes les grandeurs de ce rapport sont en **px CSS**, rapportées au coin haut-gauche du
cadre doré (repères : annexe 3). Aucun chiffre n'est écrit à l'œil sauf mention explicite.

---

## Verdict : NON APPROUVÉ

Les couleurs, les liserés, les textes et les gouttières sont justes au pixel près — mais
trois hauteurs ne le sont pas, et le manque cumulé se dépose en une bande vide et
lumineuse de 31 CSS au bas du cadre, sous le CTA, là où la maquette en met 9.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | réf | jeu | écart | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre | 452,00 CSS | 451,94 CSS | −0,06 | `00` |
| 2 | largeur du cadre | 288,00 CSS | 290,00 CSS | +2,00 (0,7 % du parent) | `00` |
| 3 | hauteur des tuiles de compteurs | 32,00 | 32,22 | +0,7 % | `16` |
| 4 | largeur des 3 tuiles | 86 / 86 / 85 | 86,6 / 86,3 / 85,8 | ≤ 0,9 CSS | `03` |
| 5 | les **5 gouttières** entre blocs | 9,00 partout | 8,89 partout | −1,2 % partout | `16` |
| 6 | largeur de la carte du portrait | 117,00 | 117,10 | +0,1 % | `03`,`09` |
| 7 | gouttière carte-portrait ↔ carte-liste | 11,00 | 10,28 | −0,7 CSS | `03` |
| 8 | hauteur du bandeau enseigne | 52,67 | 51,11 | −1,56 (< 2 CSS) | `16` |
| 9 | **largeur rendue de 13 chaînes** (« Le miroir » +0,9 %, sous-titre L1 −1,1 %, « RÈGLES DONNÉES » −0,1 %, « ENFREINTES » −1,1 %, « Pas encore » +1,3 %, « jugeable » +2,2 %, « col ouvert » −0,7 %, sous-titre de carte −1,1 %, « Il vous écoute » +2,9 %, mention `lieutenant.name` −1,5 %, kicker +1,1 %, « Rien n'a encore déteint » +1,1 %, corps L1 −0,3 %, CTA −0,8 %) | — | — | **toutes à ≤ 3 %** | `13` |
| 10 | 9 couleurs d'aplat (enseigne, 3 tuiles, grand panneau, carte portrait, 2 cartes de liste, verdict, CTA) | — | — | **≤ 6/255** (max : l'enseigne à 6 ; les 8 autres à ≤ 4) | `04` |
| 11 | 11 couleurs de liseré (cadre, CTA, enseigne, règle dorée, 3 tuiles, grand panneau, carte portrait, carte de liste, verdict) | — | — | **≤ 4/255** | `15` |
| 12 | couleur d'encre de 13 textes | — | — | **≤ 1/255** | `13` |
| 13 | couleurs du portrait : visage `(185,173,146)`, col `(234,224,200)`, buste `(22,25,27)`/`(22,22,28)`, montre `(35,42,45)`/`(34,42,46)` | — | — | **0 à 3/255** | `07`,`08`,`17` |
| 14 | les deux fonds de la carte du portrait (clair et sombre du miroir) | `(17,24,35)` / `(11,16,22)` | `(13,22,34)` / `(13,13,22)` | 4 et 3/255 | `11` |
| 15 | position du reflet dans le panneau | 31,0 % de la hauteur | 31,7 % | +0,7 pt | `05` |
| 16 | épaisseur du reflet | 1,67 CSS | 1,94 CSS | +0,27 | `05` |
| 17 | aire/boîte du triangle du col (⇒ c'est bien un triangle) | 0,423 | 0,399 | −0,02 | `07` |
| 18 | luminance moyenne dans le cadre | 32,51/255 | 33,76/255 | +1,25 | `14` |
| 19 | luminance moyenne du panneau verdict | 40,59/255 | 39,15/255 | −1,44 | `18` |
| 20 | **stabilité T / T+1 s** | — | 1 px sur 2 073 600, Δ = 1/255 | pratiquement nul | `12` |
| 21 | **20:9 vs 16:9** : le cadre est au **pixel identique** (mêmes bornes y à l'unité près), et les aplats des panneaux sortent à d(20:9, 16:9) = 0 | — | — | identique | `01`,`15` |
| 22 | bouclage de la comptabilité verticale (somme blocs + gouttières = hauteur du cadre) | 0,00 | 0,00 | exact | `16` |

---

## 0. L'écran, tel que la maquette le dit

**Le but.** « Le miroir » : on vient y lire ce que le lieutenant a *absorbé* des règles qu'on
lui a données. L'état capturé est le vierge — zéro règle, zéro absorbée — et l'écran ne
cache pas ce vide : il l'explique.

**L'ordre de lecture.** (1) « **Le miroir** », en or, capitales espacées, seul mot chaud de
la moitié haute ; (2) la **rangée des trois compteurs** — trois `00` cyan, la seule couleur
froide saturée de l'écran, qui donnent le chiffre du vide ; (3) le **portrait du
lieutenant**, encadré d'or, l'unique objet figuratif ; puis en descendant la liste des
quatre traits, le pavé de verdict, et le CTA doré qui ferme le cadre.

**Les zones.** Un cadre doré unique qui tient tout. Dedans, cinq blocs empilés séparés par
une gouttière constante de 9 CSS : enseigne (titre + sous-titre + règle dorée), rangée de
trois tuiles de compteurs, grand panneau (carte du portrait à gauche + colonne des quatre
traits à droite), pavé de verdict, CTA.

**Traits d'identité.** (a) le **cadre doré** fermé, que le CTA vient border par le bas ; (b)
le **portrait**, buste sombre en dôme, visage clair petit dans un grand cadre, col en
triangle crème, montre au revers ; (c) le **trait du reflet**, une ligne turquoise
horizontale qui traverse le tiers haut du panneau et fait du panneau un miroir ; (d) le
**cyan des compteurs** contre l'or du titre ; (e) le fond bleu nuit presque noir, où l'encre
est rare.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, à une chose près, et cette chose se voit avant tout le reste.

Le but est lisible, l'ordre de lecture est intact (titre or → compteurs cyan → portrait →
liste → verdict → CTA), les cinq blocs sont là dans le bon ordre, les couleurs sont
justes — j'ai mesuré 9 aplats, 11 liserés et 13 encres, tous à 4/255 près — et les textes
rendent à moins de 3 % de leur largeur de maquette. La palette et la luminance moyenne du
cadre sont les mêmes (32,5 contre 33,8/255).

**Mais le cadre ne ferme plus.** Dans la maquette, le CTA vient border le bas du cadre :
9 CSS d'air entre son liseré et le liseré doré. En jeu, il y en a **31,4**, soit ×3,5 — et
ce n'est pas du noir, c'est le halo turquoise du décor qui remonte : la luminance de cette
bande passe de 21,8 à 41,5/255. Un bandeau vide et lumineux de 113 px écran barre le bas
du cadre. Le CTA n'ancre plus rien, il flotte. C'est le premier écart qu'un joueur voit, et
il touche un trait d'identité (le cadre fermé). D'où il vient : les cinq gouttières sont
justes, mais **tous les blocs sont un peu courts** et le grand panneau à lui seul perd
16,4 CSS ; le manque cumulé de 22,4 CSS se dépose en bas. Le mou ne va pas là où la maquette
le met — l'élasticité est en aval du CTA au lieu d'être dans le panneau.

Deuxième écart perçu : **le portrait**. Le visage occupe 25,2 % de la hauteur de sa carte au
lieu de 19,7 % (+28 %) et son ovale est plus en œuf (h/l 1,18 contre 1,04) ; la tête paraît
trop grande pour le buste. Troisième : **la montre a perdu son cadran** — la maquette y
dessine deux aiguilles sombres (17,7 % de l'aire du boîtier), le jeu rend un ovale uni
(0,0 %). « Montre cachée » ne se lit plus comme une montre.

Ces trois-là mis à part, l'écran est fidèle, et notablement : les écarts assumés sont tous
rendus proprement, le tiret des ENFREINTES a la couleur exacte des deux autres compteurs et
tombe au centre de sa tuile, et il n'y a **aucune animation** (1 pixel sur 2 073 600 change
de 1/255 entre T et T+1 s).

---

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| 1 | `cadre.bas` — bande vide sous le CTA | **MAJEUR** | 9,00 CSS, lum 21,80/255 | 31,38 CSS, lum 41,49/255 | **+22,38 CSS (×3,5)** ; luminance ×1,9 | `16`,`18` | Cause commune avec 4, 6, 8, 14, 16 : les gouttières sont justes, les blocs sont courts, le reste tombe en bas. Le halo turquoise du décor y remonte : la bande n'est pas noire, elle brille. |
| 2 | `portrait.visage` — ovale du visage | **MAJEUR** | 19,71 % de la hauteur de la carte ; h/l = 1,038 | 25,20 % ; h/l = 1,179 | **+27,9 %** ; forme +13,5 % plus haute que large | `07` | Invariant d'échelle (rapport interne). La largeur, elle, n'est qu'à +6,9 %. |
| 3 | `portrait.montre` — cadran | **MAJEUR** | deux aiguilles sombres = **17,7 %** de l'aire du boîtier | **0,0 %** — boîtier uni | disparition d'un détail de forme | `17` | Un des cinq traits de l'angle mort A7. Contrôles : la sonde trouve 17,7 % dans la maquette et 0 % dans le jeu. |
| 4 | `panneau.h` — grand panneau | MINEUR | 211,66 CSS | 195,28 CSS | −16,38 (−7,7 %) | `16` | Le plus gros contributeur de l'écart 1. |
| 5 | `panneau.padding` — retrait latéral interne | MINEUR | 9,0 CSS à gauche et à droite | 7,2 / 6,9 CSS | −22 % | `03` | **Écart sélectif** : les autres panneaux (enseigne, verdict, CTA) commencent à 8,00 puis 7,78 CSS du bord du cadre — ÉGAL. Seul le retrait *interne* du grand panneau a fondu ⇒ conteneur différent. |
| 6 | `liste.carte.h` — les 4 cartes de traits | MINEUR | 28,33 CSS (×4) | 25,83 CSS (×4) | −2,50 (−8,8 %) | `02` | L'écart des cartes est régulier ; les gouttières entre elles sont justes (4,00 → 3,89). Retraits internes : 7,0 → 6,1 haut, 4,0 → 3,3 milieu, 6,67 → 5,28 bas. |
| 7 | `liste.carte.l` | MINEUR | 125,00 CSS | 131,11 CSS | +6,11 (+4,9 %) | `03` | Conséquence de l'écart 5 : la colonne élastique récupère ce que le retrait a perdu. |
| 8 | `liste.entete` — sous-titre « ce qu'il a absorbé de vos règles » | MINEUR | **3 lignes**, bloc de 22,7 CSS | **2 lignes**, bloc de 13,6 CSS | −9,1 CSS ; la liste démarre 7,7 CSS plus haut | `14` | Reflux, pas une taille : les deux lignes rendues font 55,8 et 41,7 CSS contre 48,7 max en maquette. Le titre « Pas encore jugeable », lui, est ÉGAL (+1,3 % / +2,2 %). |
| 9 | `portrait.figure.axe` | MINEUR | figure centrée à **+0,03 CSS** de l'axe de la carte | **−3,20 CSS** | 2,8 % de la largeur de la carte | `08`,`09` | Le décalage est le même pour la tête, le cou, le col ET les deux épaules : c'est la figure entière qui est posée à gauche de l'axe, pas une pièce désalignée. Contrôle : la maquette sort à +0,03 CSS. |
| 10 | `portrait.col` — triangle | MINEUR | 14,25 % de la largeur de la carte ; 8,76 % de sa hauteur | 18,44 % ; 11,64 % | +29,4 % ; +32,9 % | `07` | L'écart assumé couvre la *forme* (triangle plein sans liseré) — pas la *taille*. Reste dans son périmètre : aire/boîte 0,399 (donc bien un triangle), centré sur l'axe du cou à 1,53 CSS, ne recouvre pas le cou. |
| 11 | `portrait.cou` | MINEUR | 13,11 % de la largeur de la carte | 15,84 % | +20,9 % | `07` | |
| 12 | `portrait.trait` — filet clair sous la pointe du col | MINEUR — **EN TROP** | absent (contrôle négatif : la sonde ne trouve rien dans la maquette) | filet `(143,136,122)`, **21,39 × 0,28 CSS**, à y = 246,39 | élément sans contrepartie | `10` | Un seul pixel de haut, exactement la largeur de la base du triangle : lit comme un bord dégénéré, pas comme un revers. |
| 13 | `reflet.etendue` | MINEUR | 247,0 CSS de large ; surplus vert au pic +85 | 269,7 CSS ; +105 | +9,2 % ; intensité +23 % | `05` | Mesuré sur le pixel résultant au-dessus du même fond. En maquette le reflet s'éteint avant le bord droit du panneau ; en jeu il le touche. Écart de même signe sur toute la course ⇒ modèle de mélange, pas cinq erreurs. |
| 14 | `cta.h` | MINEUR | 26,33 CSS | 24,45 CSS | −1,88 (−7,1 %) | `16` | |
| 15 | `verdict.h` | MINEUR | 76,34 CSS | 74,16 CSS | −2,18 (−2,9 %) | `16` | |
| 16 | `portrait.carte.h` | MINEUR | 182,66 CSS | 174,17 CSS | −8,49 (−4,7 %) | `02` | Contribue à l'écart 4 ; sa largeur, elle, est ÉGALE (117,00 → 117,10). |
| 17 | `portrait.montre.taille` | MINEUR | boîtier 13,33 × 8,33 CSS | 15,00 × 9,72 CSS | +12,5 % / +16,7 % | `17` | Position conservée : centre à −29,7 puis −29,1 CSS de l'axe. |
| A1 | nom « Salvatore » non projeté | ASSUMÉ | — | mention `lieutenant.name — non projeté (L0.4)` présente, lisible, **sous** le verdict (y 276,9..281,7, verdict à 264,2..271,1), encre à 1/255 de la maquette, largeur −1,5 % | **rendu proprement** | `13` | Dans son périmètre. |
| A2 | ENFREINTES à « — » | ASSUMÉ | `00` cyan `(127,212,217)` | tiret cyan **`(127,212,217)`**, centré en x sur sa tuile (238,2 pour un centre de tuile à 238,2), milieu vertical à 80,3 contre 79,2 pour les deux autres compteurs *de la même capture* (+1,1 CSS) | **rendu proprement** | `13` | Même couleur exacte, même colonne, même bande verticale : le trou se lit comme un trou. Dans son périmètre. |
| A3 | col rendu par un triangle | ASSUMÉ | aire/boîte 0,423 | **0,399** — pas 0,9 ; centré sur l'axe du cou à 1,53 CSS ; ne recouvre pas le cou (le cou reste dessus) | **rendu proprement** | `07` | Les trois sorties du périmètre sont vérifiées et aucune n'est atteinte. La *taille* du triangle, elle, n'est pas couverte : voir l'écart 10. |
| A4 | 4 couleurs hors `DesignTokens` | ASSUMÉ | — | **aucune conséquence visible** : 9 aplats ≤ 4/255, 11 liserés ≤ 4/255, 13 encres ≤ 1/255 | **rendu proprement** | `04`,`15`,`13` | Dans son périmètre : la dette reste du code. |
| A5 | reflet fixe, non animé | ASSUMÉ | — | présent, à **31,7 %** de la hauteur du panneau (tiers haut), 0 pixel mobile entre T et T+1 s | **rendu proprement** | `05`,`12` | Ni absent, ni hors du tiers haut. Son étendue et son intensité, elles, ne sont pas couvertes : voir l'écart 13. |
| B1 | chasse des chiffres | **ARBITRAGE** | « 00 » 19,67 CSS de large pour 11,00 de haut | 17,78 pour 10,83 | **−9,6 % de chasse à hauteur égale** (−1,5 %) ; « 00/4 » −4,6 % | `13` | Police substituée. Les 13 autres chaînes rendent à ≤ 3 % : l'écart est propre aux chiffres. Non corrigible côté client sans changer de fonte. |

---

## 5. Autres résolutions

**`screen_b3_reputation_1080x2400.png` (20:9, cible téléphone) — TIENT.**
Le cadre y occupe exactement les mêmes bornes qu'en 16:9, à l'unité de pixel près
(montants x 18..1061, traverses y 18 et 1642..1644 : identiques ; script `01`). Les huit
aplats sondés donnent d(20:9, 16:9) = **0** (script `15`). Rien n'est coupé, rien ne déborde,
rien ne reflue : l'écran est ancré en haut et sa hauteur est fixe.

Seule différence mesurée à l'intérieur du cadre : le **décor de fond**, dimensionné à
l'écran, qui transparaît dans les interstices et autour des éléments clairs — 19,3 % des
pixels de l'intérieur du cadre diffèrent, d'au plus **26/255** (script `12` + sonde
complémentaire). Ce n'est pas un écart de mise en page ; c'est un dégradé plein écran qui
suit la hauteur de l'écran. Aucun aplat de panneau n'est touché.

**`screen_b3_reputation_1080x1920_t1s.png` (T+1 s) — TIENT.**
1 pixel différent sur 2 073 600 (0,00005 %), d'un écart de **1/255**, en (389, 162) — dans
l'anticrénelage du sous-titre. Contrôle positif : la même image comparée à elle-même donne 0.
**L'écran ne porte aucune animation.** Le chrome n'étant pas monté, il n'y avait rien à exclure.

**Conséquence de la hauteur fixe, à noter pour le 16:9 :** l'écart 1 (la bande vide) est le
même aux deux résolutions en valeur absolue, puisque le cadre ne s'étire pas.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Rien ne passe sous le bandeau ni ne touche le dock.** Les captures sont prises sans le
   chrome. Je peux seulement poser l'arithmétique : la maquette fait 122 CSS de chrome +
   462 de cadre = 584 CSS de haut. La capture 16:9 fait 533,3 CSS de haut et pose son cadre
   à 5 CSS du haut. Si le chrome de 122 CSS était monté et que le cadre gardait ses
   **452 CSS mesurés**, il finirait à 574 CSS — soit **41 CSS sous le bas d'un écran 16:9**,
   et sans place pour le dock. En 20:9 (666,7 CSS) il finirait à 574, laissant 92,7 CSS au
   dock, ce qui est cohérent. *Ce qui trancherait : une capture montée dans le shell, aux
   deux résolutions, après l'override d'identité (angle mort A4 de l'auteur).*
2. **La famille de police.** Je lis une image : je mesure des hauteurs de capitale et des
   chasses, pas une fonte. L'écart 9,6 % de chasse sur les chiffres est classé ARBITRAGE
   pour cette raison. *Ce qui trancherait : `fc-match` sur la CSS de la maquette, comparé à
   la fonte embarquée par le client.*
3. **Les quatre autres états** (`drifting`, `hostile`, `wary`, liste pleine, gages, lots).
   `m-121`…`m-124` les montrent en maquette ; aucune capture ne les montre en jeu. Le
   comportement du bloc élastique quand la liste se remplit — donc le devenir de l'écart 1
   quand le panneau grandit — est **entièrement non vérifié**. C'est l'angle mort A5 de
   l'auteur, et il porte directement sur le seul écart MAJEUR de structure de ce rapport.
   *Ce qui trancherait : une capture de l'état à 3 règles / 2 absorbées, à comparer à
   `m-119`.*
4. **L'occlusion réelle** (angle mort A1). Je constate qu'aucun élément n'en recouvre un
   autre dans les deux résolutions capturées ; je ne peux rien dire d'un frère postérieur
   qui n'apparaîtrait que dans un autre état ou une autre taille.
5. **La forme exacte du reflet** hors de sa ligne. J'ai mesuré son y, son épaisseur, son
   étendue et son profil d'intensité le long de x. Je n'ai pas su séparer instrumentalement,
   dans la carte du portrait, le halo sombre qui suit la silhouette des pixels sombres des
   yeux (mêmes valeurs exactes des deux côtés) : je ne publie donc aucun chiffre sur la
   forme de ce halo. *Ce qui trancherait : une capture de la carte du portrait sans le
   personnage, ou le SVG source du halo.*
6. **Ce que la 3ᵉ capture ne prouve pas.** T et T+1 s sont identiques ; cela exclut une
   animation en cours au moment du tir, pas une animation d'entrée déjà terminée à T. *Ce
   qui trancherait : une capture à T+0,1 s.*

---

## Annexes

### 1. Inventaire de la référence (`m-120.png`, 900×1752, ×3,0)

Bornes en CSS relatives au coin haut-gauche du cadre (x 0..288, y 0..452).

| id | catégorie | parent | bbox CSS (x0,y0,x1,y1) | remplissage | bord | texte |
|---|---|---|---|---|---|---|
| `cadre` | cadre | écran | 0, 0, 288, 452 | transparent (décor) | 1 CSS doré `(176,141,62)` | — |
| `enseigne` | plaque | `cadre` | 8, 8, 280, 60,67 | `(12,18,28)` (médiane) | 0,33 CSS `(42,54,72)` | — |
| `enseigne.titre` | titre | `enseigne` | 85,0, 17,0, 200,3, 30,0 | — | — | « Le miroir », h capitale 13,33, encre `(242,201,107)`, capitales espacées |
| `enseigne.sous` | texte | `enseigne` | 35,0, 38,67, 250,3, 44,3 (+ L2) | — | — | 2 lignes capitales, h 4,67, encre `(185,173,146)` |
| `enseigne.regle` | trait | `enseigne` | 8, 58,67, 280, 60,67 | doré `(176,141,62)` | — | — |
| `tuiles` | rangée | `cadre` | 8, 69,67, 279, 101,67 | — | — | 3 tuiles de 86/86/85, gouttière 7 |
| `tuile.1..3` | plaque | `tuiles` | h 32,00 | `(11,16,24)` (médiane) | `(43,57,74)` | `00` cyan `(127,212,217)` h 11,00 ; libellé h 2,33 `(138,151,156)` |
| `panneau` | panneau | `cadre` | 8, 110,67, 279, 322,33 | `(12,14,15)` | `(42,54,72)` | retrait interne 9,0 |
| `portrait.carte` | carte | `panneau` | 17, 118,67, 134, 301,33 | `(17,24,35)` / `(11,16,22)` | **doré** `(176,141,62)` | « SALVATORE, VOTRE LIEUTENANT » en tête |
| `portrait.visage` | forme | `portrait.carte` | ovale, l 34,67 (29,6 % carte) h 36,00 (19,7 %) | `(185,173,146)` | — | — |
| `portrait.cou` | rect | `portrait.carte` | l 15,33 (13,1 %) h 14,67 | `(185,173,146)` | — | — |
| `portrait.col` | triangle | `portrait.carte` | l 16,67 (14,25 %) h 16,00 (8,76 %), aire/boîte 0,423 | `(234,224,200)` | — | — |
| `portrait.buste` | dôme | `portrait.carte` | l max 79,0 (67,5 % carte) | `(22,25,27)` | — | échancrure en V autour du col |
| `portrait.montre` | médaillon | `portrait.buste` | boîtier 13,33 × 8,33, centre à −29,7 de l'axe | `(35,42,45)` | — | **2 aiguilles sombres `(15,21,26)`, 17,7 % de l'aire** |
| `portrait.verdict` | texte | `portrait.carte` | 42,67, 273,33, 109,0, 280,0 | — | — | « Il vous écoute », h 7,00, encre `(125,179,106)` |
| `reflet` | trait | `panneau` | y 176,33..178,0 (31,0 % du panneau), x 20,3..267,3 | dégradé turquoise, pic +85 en vert | — | — |
| `liste.entete` | titre | `panneau` | 145,3, 122,33, 205,3, 143,67 (2 lignes) | — | — | « Pas encore jugeable », l 60,33 / 48,67 |
| `liste.sous` | texte | `panneau` | 215,0, 124,67, 263,3, 147,33 (**3 lignes**) | — | — | « ce qu'il a absorbé de vos règles » |
| `liste.carte.1..4` | carte | `panneau` | x 145..270 (l 125), h 28,33, gouttière 4,00 | `(17,24,35)` | `(42,54,72)` | titre h 6,00 `(185,173,146)` + sous-titre h 5,33 `(107,115,125)` + pastille |
| `verdict` | plaque | `cadre` | 8, 331,33, 279, 407,67 | `(15,22,32)` | `(42,54,72)` | kicker h 5,33 + titre h 11,00 `(234,224,200)` + corps h 6,67 |
| `cta` | bouton | `cadre` | 8, 416,67, 279, 443,00 (h 26,33) | `(22,25,27)` | **doré** | « DONNER UNE PREMIÈRE RÈGLE » h 6,67, l 170,00, encre `(242,201,107)` |
| `cadre.bas` | vide | `cadre` | y 443,00..452,00 (**9,00**) | fond sombre, lum 21,80/255 | — | — |

**Couche globale (dans le cadre)** : luminance moyenne **32,51/255** ; 6 bins dominants
`(24,24,40)` 33,7 %, `(8,24,24)` 21,0 %, `(24,24,24)` 11,3 %, `(8,8,8)` 10,7 %,
`(8,8,24)` 6,4 %, `(40,56,72)` 3,6 %. Rythme vertical : 5 blocs, 5 gouttières de 9,00.

### 2. Inventaire de la capture (1080×1920, ×3,6) — mêmes champs, écarts en gras

| id | bbox CSS | remplissage | bord | texte |
|---|---|---|---|---|
| `cadre` | 0, 0, **290**, 451,94 | transparent | doré `(176,141,61)` | — |
| `enseigne` | 7,78, 7,78, 281,11, 58,89 (**h 51,11**) | `(13,22,34)` | `(42,53,73)` | — |
| `enseigne.titre` | 87,2, 17,5, 203,6, 30,0 | — | — | h 12,78, l 116,67, `(242,201,106)` |
| `tuiles` | 7,78, 67,78, 281,11, 100,00 (h 32,22) | `(13,13,22)` | `(42,53,73)` | tuiles 86,6/86,3/85,8, gouttières 7,5/7,1 |
| `tuile.3` | — | — | — | **« — » `(127,212,217)`**, l 13,33, h 1,39, centrée (238,2) |
| `panneau` | 7,78, 108,89, 281,11, 304,17 (**h 195,28**) | `(13,13,13)` | `(42,53,73)` | **retrait interne 7,2 / 6,9** |
| `portrait.carte` | 15,0, 115,83, 132,5, 290,00 (l 117,10, **h 174,17**) | `(13,22,34)` / `(13,13,22)` | doré | — |
| `portrait.visage` | l 37,22 (31,7 %) **h 43,89 (25,2 %)**, **h/l 1,179**, **axe −3,06** | `(185,173,146)` | — | — |
| `portrait.cou` | **l 18,61 (15,8 %)** h 15,28 | `(185,173,146)` | — | — |
| `portrait.col` | **l 21,67 (18,4 %) h 20,28 (11,6 %)**, aire/boîte 0,399 | `(234,224,200)` | — | — |
| `portrait.trait` | **EN TROP** : 60,00..81,39 × 0,28 CSS à y 246,39 | `(143,136,122)` | — | — |
| `portrait.buste` | l max 91,67, **axe −3,2** | `(22,22,28)` | — | échancrure en V présente |
| `portrait.montre` | boîtier 15,00 × 9,72, centre −29,1 | `(34,42,46)` | — | **uni : 0 aiguille** |
| `reflet` | y 170,83..172,78 (31,7 %), **x 10,0..279,7** | turquoise, **pic +105** | — | — |
| `liste.entete` | 143,3, 117,78, 204,2, 139,17 | — | — | l 61,11 / 49,72 (ÉGAL) |
| `liste.sous` | 217,5, 125,28, 273,1, 138,89 (**2 lignes**) | — | — | l 55,83 / 41,67 |
| `liste.carte.1..4` | x 143,06..274,17 (**l 131,11**), **h 25,83**, gouttière 3,89 | `(13,22,34)` | `(42,53,73)` | titre h 6,11 l 41,39 ; sous-titre h 5,56 l 56,39 |
| `verdict` | 7,78, 313,06, 281,11, 387,22 (**h 74,16**) | `(13,22,34)` | `(42,53,73)` | — |
| `cta` | 7,78, 396,11, 281,11, 420,56 (**h 24,45**) | `(22,22,28)` | doré | l 168,61 (ÉGAL) |
| `cadre.bas` | y 420,56..451,94 (**31,38**) | **halo turquoise, lum 41,49/255** | — | **vide** |

**Couche globale (dans le cadre)** : luminance moyenne **33,76/255** (+1,25) ; bins
dominants `(8,24,40)` 42,4 %, `(8,8,8)` 13,6 %, `(24,24,24)` 9,0 %, `(8,8,24)` 5,7 %,
`(8,24,24)` 3,8 %, `(40,56,72)` 3,2 %. Rythme : mêmes 5 blocs, mêmes 5 gouttières (8,89),
**+ une 6ᵉ zone en bas qui n'existe pas dans la maquette à cette taille**.

### 3. Correspondance des repères

Établie par le script `mesures/00_reperes.py`, en détectant les montants et traverses du
cadre doré (`r>150, 110<g<210, b<130, r−b>60`).

| | origine du cadre (px) | échelle | largeur du cadre |
|---|---|---|---|
| référence `m-120.png` (900×1752) | (18, 376) | **3,0 px / CSS** | 864 px = **288,00 CSS** |
| capture 1080×1920 | (18, 18) | **3,6 px / CSS** | 1044 px = **290,00 CSS** |
| capture 1080×2400 | (18, 18) | 3,6 | 1044 px = 290,00 CSS |

Formule utilisée par tout le rapport : `css = (px − origine) / échelle`.

Contrôle positif de l'échelle : la largeur du cadre sort à **288,00 vs 290,00 CSS**
(+0,7 %). Contrôle négatif : la même largeur en px bruts sort à 864 vs 1044, ratio
**1,2083** — l'attendu 1,20. L'instrument distingue donc bien un écart réel d'un effet
d'échelle. Décalage vertical entre les deux images : le cadre commence à 125,33 CSS absolus
en maquette (122 de chrome + 3) et à 5,00 CSS dans la capture, soit ~120 CSS de chrome
absent — conforme au dossier.

### 4. Scripts

Tous dans `mesures/`. Chacun imprime la taille des images qu'il ouvre et porte ses propres
contrôles.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `00_reperes.py` | cadre, échelle, offset | + largeur en CSS égale · − largeur en px brut au ratio 1,208 |
| `01_rythme.py` | frontières horizontales par saut de luminance | − bande hors cadre : 0 frontière |
| `02_blocs.py` | bbox verticales des blocs et sous-blocs | + tuiles (+0,7 %) · − grand panneau (−7,7 %) |
| `03_horizontal.py` | bornes en x des blocs | + 3 tuiles à ≤ 0,9 CSS |
| `04_miroir_et_couleurs.py` | 9 aplats + fond des marges | + enseigne 6/255 · sondes séparées par image (v2 : la v1 comparait deux blocs différents au même y) |
| `05_reflet.py` | reflet : étendue, profil d'intensité | + même mesure 25 px plus haut : 0 partout |
| `06_portrait.py` | 1ʳᵉ segmentation du portrait | − classe crème absente hors de la carte |
| `07_portrait2.py` | portrait : visage, cou, col, rapports internes | sondes vérifiées une à une (v2 ; la v1 sondait la cravate en croyant sonder le visage) |
| `08_portrait3.py` | axe, superposition cheveux/visage, silhouette | + axe de la maquette sur l'axe de la carte |
| `09_axe_et_montre.py` | axe robuste (fond relu ligne par ligne) | + maquette à +0,03 CSS · − montre à −29 CSS |
| `10_montre_cheveux_traitentrop.py` | filet EN TROP, encadrement du visage | − aucun filet trouvé dans la maquette |
| `11_zone_sombre_miroir.py` | les deux fonds de la carte | + les deux tons à ≤ 4/255 |
| `12_stabilite_et_2400.py` | T/T+1 s, 16:9 vs 20:9 | + image contre elle-même : 0 px |
| `13_textes.py` | hauteur d'encre et **largeur de chaîne** de 14 textes | + CTA · − « 00 » contre son libellé (v2 : la v1 posait des fenêtres à y fixes qui coupaient le texte du jeu) |
| `14_entete_liste_et_global.py` | en-tête de la colonne, palette, luminance | − palette du cadre contre le fond hors cadre |
| `15_bordures_et_2400.py` | 11 liserés + 8 aplats en 20:9 | + liseré doré · − même point 4 CSS à l'intérieur |
| `16_bilan_vertical.py` | comptabilité de la hauteur | bouclage exact à 0,00 des deux côtés |
| `17_montre.py` | aiguilles du cadran | + maquette 17,7 % · − jeu 0,0 % |
| `18_bande_basse.py` | hauteur et luminance de la bande basse | + panneau verdict à −1,44/255 |

**Sorties collées** : `mesures/sorties.txt` — les 19 scripts exécutés à la suite, dans
l'ordre, avec leurs contrôles (1 097 lignes). Régénérable par
`for f in mesures/[0-9][0-9]_*.py; do python3 $f; done`.

Les trois sorties décisives, collées ici :

```
########## 16_bilan_vertical.py
  m-120.png (900, 1752)
  screen_b3_reputation_1080x1920.png (1080, 1920)

bloc                                    REF h    JEU h    delta      rel
--------------------------------------------------------------------------
  (gouttiere)                            8.00     7.78    -0.22    -2.7%
bandeau enseigne (titre)                52.67    51.11    -1.56    -3.0%
  (gouttiere)                            9.00     8.89    -0.11    -1.2%
tuiles compteurs                        32.00    32.22    +0.22    +0.7%
  (gouttiere)                            9.00     8.89    -0.11    -1.2%
grand panneau (portrait + liste)       211.66   195.28   -16.38    -7.7%
  (gouttiere)                            9.00     8.89    -0.11    -1.2%
panneau verdict                         76.34    74.16    -2.18    -2.9%
  (gouttiere)                            9.00     8.89    -0.11    -1.2%
CTA                                     26.33    24.45    -1.88    -7.1%
  VIDE sous le CTA, dans le cadre        9.00    31.38   +22.38  +248.7%   <===
--------------------------------------------------------------------------
somme                                  452.00   451.94
hauteur du cadre (script 00)           452.00   451.94
CONTROLE : ecart de bouclage             0.00     0.00   (doit valoir 0.00)

########## 17_montre.py
--- REF m-120.png (900, 1752)   corps du boitier (35, 42, 45)
    BOITIER : 628 px, bbox px x 139..178 y 1149..1173 = 13.33 x 8.33 CSS
    pixels plus SOMBRES que le boitier et ENTOURES par lui : 111 (17.7 % de l'aire du boitier)
      bbox du detail : x 144..176 y 1155..1165 = 11.00 x 3.67 CSS
      tons : [((15, 21, 26), 75), ((25, 31, 35), 4), ((19, 25, 30), 3)]

--- CAP screen_b3_reputation_1080x1920.png (1080, 1920)   corps du boitier (34, 42, 46)
    BOITIER : 1517 px, bbox px x 140..193 y 915..949 = 15.00 x 9.72 CSS
    pixels plus SOMBRES que le boitier et ENTOURES par lui : 0 (0.0 % de l'aire du boitier)
      -> boitier UNI : aucune aiguille, aucun cadran

########## 12_stabilite_et_2400.py  (extrait)
=== (a) CONTROLE POSITIF : 1080x1920 contre elle-meme ===
    zone comparee 1080x1920 = 2073600 px  |  pixels differents : 0 (0.0000 %)  |  ecart max 0/255
=== (a) STABILITE : T contre T+1 s ===
    zone comparee 1080x1920 = 2073600 px  |  pixels differents : 1 (0.0000 %)  |  ecart max 1/255
    1er pixel different : (389, 162, (150, 141, 119), (150, 140, 119))
```

**Deux instruments écartés en cours de route, et pourquoi.** (a) Une première sonde du
visage lisait en fait la cravate : elle donnait un écart de couleur de 31/255 parfaitement
reproductible et parfaitement faux — corrigée, la couleur du visage sort à **0/255**.
(b) Une première sonde des « cheveux encadrant le visage » comptait comme cheveux le fond
sombre du miroir : elle laissait croire à une inversion d'ordre de superposition. La sonde
corrigée montre que la maquette n'a **aucun** cheveu le long du visage et que le jeu en a un
peu — l'inverse de ce que j'avais cru voir. Aucune de ces deux mesures n'est publiée.
