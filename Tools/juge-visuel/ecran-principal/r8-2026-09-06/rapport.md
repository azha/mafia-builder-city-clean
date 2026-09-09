# Juge visuel ⊥ — ① L'intérieur de district (« le HUD de Brennar ») — r8 — 2026-09-06

## Verdict : NON APPROUVÉ

Trois MAJEUR, aucun BLOQUANT : la fiche et le dock sont au canon, le médaillon reste un halo à arcs
épais, et le voile du bandeau a gardé l'alpha de la maquette sans le convertir en linéaire.

---

## Conventions déclarées

- **Échelle** — canon `ecran-canon.png` 1176 px = 392 CSS (**×3,000**) ; captures 1080 px = 392 CSS
  (**×2,755102**). Toute grandeur de ce rapport est en **px CSS**. Vérifié sur l'image : le filet du
  bandeau tombe à y = 51,67 CSS au canon et 51,54 CSS en jeu ; les ronds du dock ont le même pas.
- **Convention de bord** (épaisseurs de trait) — **NOMINAL = mi-alpha** (mi-hauteur entre le fond
  local et le pic local) · **CŒUR = pixels > 95 % du pic**. Les deux sont données quand la forme du
  bord est le sujet (halo vs trait).
- **Convention d'angle** (cadran) — **0° vers la DROITE, sens trigonométrique**. Deux origines,
  toutes deux imprimées, parce qu'aucune n'est neutre et qu'un écart qui ne tient que sous une
  convention n'est pas un écart :
  - **A (primaire) = le CENTRE DU BOÎTIER** — le centre que l'œil prend pour celui de l'instrument,
    et celui qui rend les nombres du r7 reproductibles ;
  - **B (contrôle) = le PIVOT de l'aiguille** — l'axe physique du gabarit, et la seule origine où la
    source `hud-brennar.html` est directement opposable.
  ⚠️ Mesuré ici : **les trois arcs du canon ne sont PAS concentriques** (chaque `A 26 26` de la source
  a son propre centre de courbure : teal `(34,00 ; 33,69)`, braise `(26,19 ; 30,84)`, piste neutre
  `(30 ; 47,86)` en unités viewBox). Il n'existe donc pas de « centre du cadran » du canon : c'est
  pour cela que je publie les deux conventions.
- **Espace de mélange** — toute translucidité est jugée sur le **pixel résultant sur le même fond**,
  jamais sur un alpha. Les deux modèles (sRGB, comme Chrome ; linéaire, comme le client) sont
  confrontés à la mesure pour chaque surface : c'est ce qui distingue une erreur de modèle d'un
  alpha non converti (voir M3 et le contrôle m43).
- **Ce que la référence contient et qui n'est PAS l'écran** — `ecran-canon.png` est le rendu de la
  page d'atelier : elle porte **6 pastilles d'annotation `.co`** (les ronds dorés numérotés 1 à 6),
  les **deux bascules de démo** `.bascule` (🌙, `left:10px;top:120px`) et `.chaudb` (🔥,
  `top:170px`), et le `.floater` animé « + $320 ». Ce sont des échafaudages de maquette : je ne les
  compte pas comme « absents en jeu ». Deux de mes sondes ont d'abord été faussées par eux (la
  pastille 6 sur le profil du dock, la pastille 5 sur le filet de la fiche) — corrigé, cf. m25/m35.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | canon | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | **plaque de fiche — boîte** (par différence fiche/district, 2400) | 366,00 × 169,19 à (13,00 ; 424,52) | **368,04 × 169,50** à (11,98 ; 599,61) | ≤ 2,04 CSS | `m19`,`m20` |
| 2 | plaque — coin arrondi, symétrique g/d **et** haut/bas | `border-radius:14px` | retraits 10,89 → 2,54 CSS sur 16 lignes, identiques à gauche et à droite | — | `m20` |
| 3 | **plaque — pixel résultant sur le même art** | prédiction sRGB (14,22,33) | mesuré **(12,20,31)** | **2/255** | `m40`,`m43` |
| 4 | **arc teal — pixel résultant** (`#7fd4d955` sur le fond nu) | mesuré canon (69,101,113), prédiction 1/255 | mesuré jeu (70,98,108), prédiction 6/255 | ≤ 6/255 | `m44` |
| 5 | **arc braise — pixel résultant** (`#e0664a88`) | (132,70,61), prédiction 3/255 | (133,76,70), prédiction 7/255 | ≤ 7/255 | `m44` |
| 6 | **bouton COLLECTER — dégradé vertical** | (227,190,98)(222,183,90)(212,169,73)(207,162,65)(202,155,57) | **les mêmes cinq valeurs, bit à bit** | **0** | `m21` |
| 7 | bouton COLLECTER — boîte | 103,33 × 37,67 | 104,53 × 38,11 | ≤ 1,20 | `m21` |
| 8 | **étendues angulaires des arcs** (chacune autour de SON centre de courbure) | teal 83,50° · braise 56,00° | teal **83,00°** · braise **56,00°** | ≤ 0,5° | `m09` |
| 9 | **les QUATRE porteurs de `.chaud`** (boîtier, filet, « Aube », « Brûlant ») | `--braise` (224,102,74) | **(224,102,73) sur les quatre** | 1/255 | `m13` |
| 10 | séparateurs de stats (centres) | 140,00 · 251,67 | 140,10 · 250,63 | ≤ 1,04 | `m31` |
| 11 | sous-titre de fiche — capitale et contraste | 6,25 CSS · 8,24:1 | 6,25 CSS · 8,19 / 8,06:1 | 0 · ≤ 0,18 | `m31` |
| 12 | libellés de stats — capitale et contraste | 6,00 CSS · 8,39:1 | 5,75 CSS · 8,31 / 8,33:1 | −4,2 % · ≤ 0,08 | `m31` |
| 13 | libellés de boutons — encre / fond / contraste | (19,25,35) sur (220,180,86) · 8,99:1 | (21,27,38) sur (218,177,84) · 8,55:1 | ≤ 3/255 | `m31` |
| 14 | ronds du dock — Ø et centres | 46,00 ; 93,67 · 161,67 · 229,67 · 297,67 | 44,28–45,73 ; 93,64 · 161,5–162,1 · 229,2–229,8 · 297,63 | ≤ 1,7 / ≤ 0,55 | `m25` |
| 15 | **indicateur d'onglet actif** — et il SUIT l'écran | 13,67 × 2,00 CSS, (176,141,62), centre 93,83 | 13,43 × 1,81, (176,141,61), centre **93,83** ; témoin ⑥ centre **161,88** (FAMILLE) | ≤ 0,24 | `m25` |
| 16 | rythme vertical de la fiche (4 bandes d'encre) | titre 21,8..32,8 · s-titre 45,8..52,2 · libellés 93,2..99,5 · actions 115,5..155,2 | 20,0..32,3 · 44,3..51,2 · 92,6..99,1 · 114,7..154,3 | ≤ 1,8 | `m22` |
| 17 | **losange sous le médaillon** | présent, centre x 195,67 | présent, centre x **195,46 / 195,82** | ≤ 0,29 | `m35` |
| 18 | barre de ratio — couleur et épaisseur | `--or` (217,171,78) · 2,00 CSS | (217,171,77) · 2,18 CSS | 1/255 · +0,18 | `m17` |
| 19 | volute GAUCHE — position | x 5,00..16,67 ; y ≈ 25,3..26,3 | x **4,36..16,33** ; y 25,04..26,50 | ≤ 0,64 | `m15` |
| 20 | filet du bandeau — y et couleur | y 51,67 ; `--laiton` (calme) | y **51,54** ; (224,102,73) = `--braise` (état chaud) | 0,13 CSS ; 1/255 | `m13` |
| 21 | gouttière | fiche 424,5..593,7, dock à 605,7 | jour plaque/dock **11,82** (1920) et **11,78** (2400) CSS ; rien sous le bandeau | — | `m29` |
| 22 | l'aiguille pointe dans le secteur braise (le cadran n'est PAS inversé) | — | aiguille **29,5°** (conv. B), secteur braise 19,5..66,0° | — | `m11`,`m10` |
| 23 | **contrôle des instruments** : hors plaque, les deux planches 2400 sont bit-identiques | — | 3 composantes de différence seulement : la plaque (472 382 px) + 2 taches de 10 px | — | `m20` |
| 24 | **contrôle de l'instrument d'arcs contre la SOURCE** | teal `(34,00;33,69)` R=26 vb ⇒ 18,20 CSS | fit sur le canon : centre à 0,3 CSS près, **R moyen 18,202** | 0,002 | `m09` |
| 25 | **contrôle du dossier** : les 4 sha256 déclarés | — | `e65305d0…` `09b358f8…` `c11e3fbc…` `2b38b5ee…` | **4/4 exacts** | `sha256sum` |
| 26 | **contrôle de la sonde de contraste** : la même sonde que `m12`, appliquée au titre de la fiche (or-vif sur la plaque) | doit dépasser 10:1 | **10,31:1** (1920) et **10,14:1** (2400) | — | `m28` |

---

## 0. L'écran, tel que la maquette le dit

**But.** On est *dans* un quartier. On vient voir ce qu'il vit, poser le doigt sur un bâtiment, lire
en une ligne ce qu'il vaut, et trancher : COLLECTER · BLANCHIR · AMÉLIORER. Tout le reste est
contexte.

**Ordre de lecture.** (1) **La fiche**, en bas : une plaque de verre sombre posée sur un décor clair,
avec le seul or saturé de la moitié basse (le bouton COLLECTER) — c'est le point d'action et l'œil
y tombe. (2) **Le médaillon**, au centre du bandeau : un disque qui rompt la ligne horizontale de la
barre et attire par sa forme, pas par sa taille. (3) **Le montant en or**, à gauche. (4) **Le dock**,
en pied, quatre ronds gravés dans un voile sombre. Le décor n'est jamais le sujet : il est ce sur
quoi les deux plaques de verre se posent.

**Zones.** bandeau de verre fumé (argent · montre de la ville · jour) — art du district — fiche du
bâtiment — dock de navigation.

**Traits d'identité** (les cinq choses qui font que c'est *cet* écran) :
1. **une seule** barre de verre fumé, traversée d'un **filet de laiton** d'un pixel ;
2. **l'or est réservé à l'argent** et à l'unique CTA — nulle part ailleurs ;
3. **la montre à gousset de la ville** : cerclage de laiton **net**, cadran à deux arcs **fins**,
   aiguille longue qui traverse le chiffre ;
4. la **plaque de verre** à coins arrondis, coiffée d'un filet de laiton qui s'éteint aux extrémités ;
5. quatre **ronds gravés** posés dans un voile qui s'assombrit vers le bas.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, et de plus près qu'au tour précédent. Même but, même ordre de lecture (la fiche d'abord, le
médaillon ensuite, le montant, le dock), mêmes quatre zones, même palette. **La fiche est le point
fort de ce tour** : boîte, coins, transmittance, dégradé du bouton or, séparateurs, capitales et
contrastes tombent tous dans le bruit — le pixel résultant de la plaque est à **2/255** de ce que la
règle du canon produirait sur le même art, et le dégradé du bouton COLLECTER est **bit-identique**
sur cinq échantillons verticaux sur six.

Les trois écarts de tête tiennent tous au **chrome**, et deux d'entre eux au **médaillon** :

1. **Le cerclage est un halo, pas un trait.** Au canon le bord monte en 0,25 CSS et tient un plateau
   sur 73 % de sa largeur ; en jeu il monte sur 1,5 CSS et ne tient un plateau que sur 27 %. C'est le
   trait d'identité n° 3 — « la montre à gousset de la ville » — qui s'émousse : de loin on voit une
   lueur orange, pas une lunette de laiton.
2. **Les arcs du cadran sont 1,6 à 1,8× trop épais** (2,55–2,65 → 4,15–4,45 CSS). Le cadran passe
   d'instrument fin à jauge épaisse. Le fuselage des embouts, lui, a bien disparu.
3. **À 1080×1920, le voile du bandeau laisse passer l'art.** Il rend **+29/255 et +13,3 L** plus
   clair que ce que produirait la règle du canon sur le même fond, et ses trois textes perdent 37 à
   41 % de contraste (ARGENT 8,02 → 5,07 ; le montant 11,31 → 6,64 ; JOUR 7,96 → 4,84). La cause est
   nommée **et démontrée** : l'alpha de la maquette a été **recopié sans conversion sRGB → linéaire**,
   alors que la plaque de fiche et les deux arcs, eux, l'ont bien converti. Ce n'est donc pas une
   erreur de modèle uniforme — c'est une conversion appliquée à trois surfaces sur cinq.

**Ce que ce tour a fermé** : le voile du dock (pire contraste 3,54 → **6,17**), l'interstice du cadran
(12° → **33,5–34°**), les étendues angulaires des arcs (**exactes**), le fuselage des embouts, les
quatre porteurs de `.chaud`, le remplissage arrondi de COLLECTER, la lunette, la volute gauche, et le
fond sous le nom du district (1,58:1 → **7,98:1** à 1920 et **4,57:1** à 2400).

**Ce qui reste ouvert dans le cadran**, hors des trois écarts de tête, est un faisceau de petits
décalages qui vont tous dans le même sens : l'anneau des arcs est 14 % trop petit et 5 CSS trop haut,
l'aiguille 18 % trop courte, le pivot 28 % trop gros, les deux libellés poussés vers le bas dont l'un
à 3,35 CSS du cerclage. Aucun ne casse la lecture ; ensemble ils font un cadran plus lourd, plus haut
et moins centré que celui de la maquette.

---

## 3. Écarts — une table, un finding par ligne

Gravité : `BLOQUANT` / `MAJEUR` / `MINEUR` seulement. `critère` = la **grandeur ou l'instrument**
existait-il au r7 (`DÉJÀ APPLIQUÉ`) ou non (`NOUVEAU`) — il ne dit rien du correctif.
ASSUMÉ et ARBITRAGE sont dans des tables séparées et ne sont pas comptés ici.

**BLOQUANT : aucun.** Rien n'est coupé, hors cadre, illisible ni inversé ; la hiérarchie et l'ordre
de lecture sont préservés aux deux résolutions.

| id | gravité | critère | écart | mesure | dépend des données | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `M1` | MAJEUR | DÉJÀ APPLIQUÉ | **Le cerclage du médaillon est un HALO, pas un trait** (trait d'identité n° 3) | profil radial médian de (R−B) sur 720 rayons — canon : montée 0 → 100 en **0,25 CSS**, NOMINAL **1,30**, CŒUR **0,95** = **73 % de plateau** ; jeu : montée étalée sur **1,5 CSS**, NOMINAL **2,15** (1920) / **2,60** (2400), CŒUR 0,60 / 0,70 = **28 % / 27 %**. Le canon déclare `border:1.5px solid` (`m02`) | non | — |
| `M2` | MAJEUR | DÉJÀ APPLIQUÉ | **Les arcs du cadran sont 1,6 à 1,8× trop épais** | épaisseur **perpendiculaire** à la centerline, largeur à mi-alpha, 83 à 105 coupes par arc — canon teal **2,65** (p10 2,45 = la valeur de la source : `stroke-width 3.5 × 0.700`), braise **2,55** ; jeu teal **4,20** / **4,15**, braise **4,45** / **4,40** ⇒ **+58 % et +75 %** (`m08`) | non | — |
| `M3` | MAJEUR | NOUVEAU | **Le voile du bandeau rend +29/255 trop clair : son alpha n'a pas été converti pour l'espace linéaire** | même fond (art réel, prémisse vérifiée : 99,2 % de pixels bit-identiques à 240 px de décalage entre les deux planches, `m41`) — art (149,164,182) : le canon produirait **(30,37,49) L 14,4**, le jeu produit **(59,66,76) L 27,7** ⇒ **29/255, +13,3 L**. Modèle : prédiction **linéaire (58,65,75) écart 1/255**, prédiction sRGB écart 29 ⇒ alpha **recopié**. Conséquence mesurée à 1080×1920 : ARGENT **8,02 → 5,07**, montant **11,31 → 6,64**, JOUR **7,96 → 4,84** (`m42`,`m43`,`m31`) | non | le voile n'est mesurable qu'à **1080×1920** (à 2400 c'est le panneau uni qui est derrière) |
| `m1` | MINEUR | DÉJÀ APPLIQUÉ | **La volute DROITE est absente** (la gauche est présente et bien placée) | fenêtre x 376..392 CSS (au-delà de `.aile.droite` qui finit à 375) : canon **132 px** d'encre en x 376,00..386,67, y 25,33..26,33 ; jeu **0 px**. Fenêtre élargie 355..392 avec l'encre du texte exclue : jeu 15/23 px, tous frange d'anti-crénelage de « Aube ». **Contrôle de capacité : la même sonde trouve la volute du canon** (`m15`,`m16`) | non | — |
| `m2` | MINEUR | NOUVEAU | **La volute gauche rend 1,9× trop forte** — même cause que `M3` | fond (16,20,31) : prédiction **linéaire (133,127,115) écart 0/255**, prédiction sRGB (77,77,78) **écart 56/255**, mesure **(133,127,115)**. L'opacité nominale **0,28 est bonne** ; c'est le pixel résultant qui est faux (`m38`,`m43`) | non | — |
| `m3` | MINEUR | DÉJÀ APPLIQUÉ | **L'anneau des arcs est 14 % trop petit et ~5 CSS trop haut** ⇒ les extrémités tombent ~20° courtes | rayon de courbure : canon **18,20** CSS (les deux arcs, valeur de la source retrouvée à 0,002 près) ; jeu teal **15,93**, braise **15,26** ⇒ **−12,5 % / −16,2 %**. Centre : canon à (+2,55 ; −0,40) et (−2,80 ; −2,05) du pivot ; jeu à (+0,60 ; **−4,60**) et (+0,15 ; **−5,15**). Course totale (conv. A) canon **221,50°**, jeu **177,00 / 176,00°** ; (conv. B) **180,00°** contre **141,50°**. Boîtes/pivot : le canon descend à y = 0,06 CSS du pivot, le jeu s'arrête à **−5,66** (`m07`,`m09`,`m10`) | non | — |
| `m4` | MINEUR | DÉJÀ APPLIQUÉ | **L'interstice reste −15 % sous le canon** | **conv. A** (centre du boîtier) — canon : braise s'arrête à **48,50°**, teal reprend à **88,50°**, **vide 40,00°** ; jeu : **57,50 → 91,50 = 34,00°** (1920) et **58,00 → 91,50 = 33,50°** (2400). **conv. B** (pivot) — canon **61,00 → 89,50 = 28,50°** (la source donne 60,55 → 90,00 = 29,45) ; jeu **66,00 → 91,00 = 25,00°**. Stable de 15 % à 70 % de couverture (`m10`) | non | — |
| `m5` | MINEUR | NOUVEAU | **Une piste neutre comble l'interstice**, là où le canon n'y pose rien | bissectrice du vide, au rayon de la bande d'arcs : canon bosse **+0,2 L** (la piste `#ffffff22` du canon existe mais son centre est 15,3 CSS plus bas — elle passe sous « 37% », pas dans le vide) ; jeu bosse **+9,0 L** à r = 14,8–15,0, contre +23,2 / +24,0 L sous les arcs colorés (`m11`,`m37`) | non | — |
| `m6` | MINEUR | DÉJÀ APPLIQUÉ | **L'aiguille est 18 % trop courte** — *déclaré non traité (lot r9)* | pointe à **15,88** CSS du pivot au canon (la source pose 22 vb + cap rond = 16,1) contre **13,07** en jeu ⇒ **−17,7 %** (`m11`) | non | — |
| `m7` | MINEUR | DÉJÀ APPLIQUÉ | **Le pivot est 28 % trop gros** — *déclaré non traité* | aire équivalente du masque laiton : canon **3,53** CSS de diamètre (la source pose `r=2.6` vb = 3,64), bbox 3,00 × 3,33 ; jeu **4,51**, bbox 4,72 × 4,36 ⇒ **+28 %**, aire **×1,63** (`m12`) | non | — |
| `m8` | MINEUR | DÉJÀ APPLIQUÉ | **Le fond du cadran a perdu son éclairage directionnel** — *déclaré non traité* | médiane par secteur de 45° dans l'anneau 0,58..0,72 R, encre et arcs exclus — canon : amplitude inter-secteurs RGB **(19, 19, 21)**, **ΔL 9,2**, secteur le plus clair **90..135°** (haut-gauche, conforme au `radial-gradient(circle at 38% 30%)` de la source) ; jeu **(1, 1, 1)**, **ΔL 0,5** (`m11`) | non | je ne sais pas dire si l'éclairage est absent ou noyé dans le vignettage radial du jeu |
| `m9` | MINEUR | DÉJÀ APPLIQUÉ | **`.heatpct` est ~5 CSS trop bas** : « Brûlant » est entièrement sous le centre là où « 37% » est à cheval | centre vertical de l'encre par rapport au centre du boîtier : canon **+0,50** CSS (boîte 22,33 × 13,00) ; jeu **+5,54** (1920) et **+5,39** (2400), boîte 37,02 × 14,16 ⇒ déplacement **+4,89 / +5,04 CSS**. Le canon pose `.heatpct{margin-top:-14px}`. *(r7 mesurait +7,13 : l'écart a diminué, il n'est pas fermé.)* (`m33`) | la LARGEUR suit le nombre de glyphes (7 contre 3) ; la POSITION, non | — |
| `m10` | MINEUR | DÉJÀ APPLIQUÉ | **`.heatlib` frôle le cerclage** | coin d'encre le plus éloigné, rapporté au rayon INTÉRIEUR nominal du cerclage : canon **0,660 R** (dégagement **10,43** CSS) ; jeu **0,892 / 0,893 R** (dégagement **3,37 / 3,35** CSS). Le libellé est aussi 9 CSS plus bas que celui du canon, donc **sous le filet**, sur l'art (`m33`) | la LARGEUR suit le mot (« CHALEUR » 32,67 CSS contre « HEAT » 20,67) | — |
| `m11` | MINEUR | DÉJÀ APPLIQUÉ | **Le boîtier est ~5 % trop grand** | diamètre NOMINAL extérieur : canon **63,90** CSS (`.medaillon` = 64) ; jeu **67,00** (1920) et **67,60** (2400) ⇒ **+4,9 % / +5,8 %**. Ligne médiane du trait : 62,60 → 64,85 / 65,00. Une part vient du halo de `M1` (une lueur étale sa mi-alpha), mais la ligne médiane bouge aussi (`m02`) | non | la part exacte imputable au halo n'est pas séparable |
| `m12` | MINEUR | NOUVEAU | **Nom du district : 4,32:1 dans la pire colonne à la résolution CIBLE** (doctrine ≥ 4,5 pour un petit texte) | encre (202,193,172), capitale **≈ 4,8 CSS** ; fond posé pris à la même hauteur hors texte — **1080×2400 : 4,57:1 global, 4,32:1 pire colonne** ; **1080×1920 : 7,98:1 global, 7,55:1 pire colonne**. Le texte ne descend PAS dans la bande de fondu (0 px à 1920, 3 px à 2400) : le « pire cas dans le fondu » déclaré ne s'applique pas au mot (`m28`) | oui — le fond dépend de l'art sous le mot, donc du district photographié | — |
| `m13` | MINEUR | DÉJÀ APPLIQUÉ | **Le ruban `.bandeau-alerte` du canon est absent** | canon : **2 288 px** d'encre claire en x 65,0..269,0 / y 90,3..112,7 plus **5 079 px** d'`--or-vif` (le `<b>`) ; jeu : **0 px** d'or-vif dans la bande y 78..113, aux trois planches. Contrôle de capacité : la sonde trouve le ruban du canon (`m36`) | oui, peut-être : composant absent **ou** aucune alerte en attente | je ne peux pas trancher depuis une image. ⚠️ Son créneau canon (y 78..111,8) est désormais **occupé** par le fond posé du nom (83,5..96,5) |
| `m14` | MINEUR | NOUVEAU | **Le coin du remplissage COLLECTER a un rayon ≈ 5,7–6,0 au lieu de 9,0 CSS** | retrait du remplissage sur les 10 premières lignes : canon **6,00 · 5,00 · 4,33 · 3,67 · 3,33 · 2,67 · 2,33 · 2,00 · 1,67 · 1,67** ; jeu **3,63 · 3,27 · 2,90 · 2,54 · 2,18 · 1,81 · 1,45 · 1,45 · 1,09 · 0,73** — symétrique g/d et haut/bas dans les deux. Le canon pose `border-radius:9px` (`m21`) | non | — |
| `m15` | MINEUR | DÉJÀ APPLIQUÉ | **La barre de ratio n'a pas de piste visible** : elle est d'un seul ton là où le canon en a deux | canon : remplissage `--or` (217,171,78) sur **50,00** CSS puis **piste (90,99,118)** jusqu'à ~90 CSS (74 CSS de piste, 67,6 % rempli — la source dit 68 %) ; jeu : **73,68** CSS tout en (217,171,77), et à 6 CSS à droite de la fin le fond local (59,67,77) / (17,23,32), **aucun pixel** de la couleur de piste (`m17`) | oui, en partie | **je ne peux pas distinguer « ratio à 100 % » de « pas de piste »** : 73,68 CSS = 99,6 % de la piste de 74 CSS du canon. Trancherait : une capture à un ratio ≠ 100 % |
| `m16` | MINEUR | DÉJÀ APPLIQUÉ | **La plaque de fiche ne floute pas ce qui transparaît** (le canon pose `backdrop-filter:blur(5px)`) | corrélation du vu-à-travers avec l'art **BRUT r = 0,136** contre l'art **FLOUTÉ à 5 CSS r = 0,100** — le brut gagne. Amplitude visible du décor à travers la plaque : **3,9 L** entre le décile d'art le plus sombre et le plus clair (`m30`,`m20`) | non | l'amplitude est faible (transmittance 6 %) : l'effet du flou serait de toute façon ténu |
| `m17` | MINEUR | DÉJÀ APPLIQUÉ | **Le bloc ARGENT atteint le bord nominal du cerclage à la résolution cible** — la clause de sortie de l'assumé est mesurablement atteinte | dernier pixel `--or-vif` du montant x **161,88** ; bord NOMINAL gauche du cerclage x **162,25** (1920) et **161,95** (2400) ⇒ jour **0,37** puis **0,07 CSS**. Jour **VISIBLE** (première lueur du halo) **1,81 CSS**. Canon : **86,80 CSS**. Aucun recouvrement mesuré (`m17`) | oui — la longueur du montant décide (ici 14 caractères) | un montant plus long recouvrirait ; je ne peux pas le tester depuis cette planche |
| `m18` | MINEUR | DÉJÀ APPLIQUÉ | **La flèche retour est d'un blanc neutre hors palette** | encre **(238,241,242)** : **42/255** de `--creme` (234,224,200), **17/255** du blanc pur. Boîte x 23,96..37,75, y 20,33..28,31 CSS (`m38`) | non | — |
| `m19` | MINEUR | DÉJÀ APPLIQUÉ | **À 1080×2400, un panneau uni de 35,2 CSS s'intercale entre le filet et l'art** | colonne x=300 : **(34,38,49) de y 51,90 à 83,48** (31,58 CSS) puis (19,24,35) de 83,48 à 87,11 (le même panneau, sous le fond posé du nom) ; l'art commence à **87,11**. Soit **35,21 CSS = 4,0 %** de la hauteur d'écran. En pied, l'art finit à **784,0** et les **87 CSS** restants sont un panneau, occupé par le dock (`m29`) | non | — |
| `m20` | MINEUR | NOUVEAU | **Le filet supérieur de la fiche s'étend plus loin que celui du canon** | encre : canon x **77,33..314,67** (237,33 CSS), plein laiton 112,00..279,67 ; jeu x **51,54..340,10** (288,56 CSS), plein laiton 97,64..294,00. Couleur (173,138,60), à 3/255 de `--laiton`. Le canon pose `left:14px;right:14px` + dégradé 30 %/70 % (`m35`) | non | à 2400 la ligne du filet est lue contre un art clair : sa **couleur** n'y est pas mesurable proprement (l'étendue, si) |

**Compte : 0 BLOQUANT · 3 MAJEUR · 20 MINEUR.**

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce qu'on voit | ce qui le ferait sortir de l'assumé | vérifié |
|---|---|---|
| les 3 chiffres remplacés par des bandes qualitatives | une case vide, un scalaire inventé, ou trois cases désalignées | ✅ trois cases, séparateurs à **140,10 / 250,63** (canon 140,00 / 251,67), aucune vide (`m31`) |
| libellés du dock EMPIRE · FAMILLE · FILIÈRE · PLUS | un 5ᵉ onglet, un libellé coupé, une casse non uniforme | ✅ quatre, tout en capitales, aucun tronqué ; capitale 5,75 CSS uniforme (`m24`,`m31`) |
| le nom du district affiché là où le canon n'en met pas | un slug, un identifiant | ✅ « La Lisière » |
| le quart du jour (« Aube ») à la place de l'heure | un libellé anglais ou vide | ✅ « Aube », en `--braise` (état chaud), 65–67 % du cœur des glyphes (`m13`) |
| les ronds du dock vides | — | ✅ aucun pixel d'icône dans les quatre ronds |
| un bouton RETOUR en haut à gauche | qu'il recouvre l'aile gauche du bandeau | ✅ x 23,96..37,75 ; le montant commence à **64,97** ⇒ **27,2 CSS** de dégagement (`m38`,`m15`) |
| référence de NUIT, capture au quart de jour | — | ✅ palette et luminance restreintes au **chrome + fiche** dans tout ce rapport |
| le bloc ARGENT déplacé vers le centre | **qu'il touche ou recouvre le médaillon ; mesure la marge** | ⚠️ marge nominale **0,37 CSS (1920) / 0,07 CSS (2400)**, jour visible 1,81 CSS, **aucun recouvrement** — la clause est atteinte sans être franchie ⇒ remonté en `m17` |
| boîtier, filet, « Aube », « Brûlant » en `--braise` | une couleur ni laiton ni braise ; un des quatre resté crème | ✅ **les quatre** à **(224,102,73)**, 1/255 de `--braise` (`m13`) |
| filet du bandeau à 2 px pleins (0,726 CSS) | un filet discontinu, pas pleine largeur, pas en braise, pas à y = 51 CSS | ✅ **continu** : les 12 interruptions détectées sont **toutes** entre x 169,1 et 222,5, c'est-à-dire dans l'emprise du médaillon (qui passe au-dessus, `z-index:3`, comme au canon) ; pleine largeur **16,0..375,7** avec un fondu aux deux bouts comme le canon ; `--braise` ; y = **51,54** (canon 51,67) (`m13`,`m14`) |

---

## ARBITRAGES

| # | arbitrage | mesure |
|---|---|---|
| A1 | **Police : aucune comparaison de famille ni de chasse n'est opposable sur cet écran.** Ma source demande `"Segoe UI",Roboto,system-ui` et `Georgia,"Times New Roman",serif` ; `fc-match` sur la machine de rendu répond **Noto Sans** et **Noto Serif**, et le client embarque **DejaVu Sans / DejaVu Serif**. ⚠️ La note du dossier sur la « série 6 » (référence et client partageant DejaVu Sans) **ne s'applique pas ici** : cette source ne demande DejaVu nulle part | les **hauteurs de capitale**, elles, se comparent et concordent : sous-titre 6,25 = 6,25 ; libellés de stats 6,00 → 5,75 ; libellés de dock 6,00 → 5,75 ; libellés de boutons 15,0 = 15,0 (`m31`) |
| A2 | **Forme du fond posé sous le nom du district** — le canon n'en a aucun (c'est un gros plan sans nom) | bande **pleine largeur**, y **83,5..96,5 CSS**, **bord haut net** (0,4 CSS), **fondu de 3 CSS en bas**, assombrissement **×0,50 en L** et constant sur toute la largeur (rapports 0,479 / 0,485 / 0,490 à 1920 ; 0,513 / 0,515 / 0,516 à 2400). Le mot n'occupe que x 5,4..38,5 : la bande est ~10× plus large que son contenu (`m26`,`m27`) |
| A3 | **Titre de fiche pleine largeur** (contenu : 44 caractères contre 13) | canon : encre or x 124,33..265,67, marges **94,33 / 96,33** dans `.titre`, capitale **10,25** ; jeu : x **29,76..361,51**, marges **−0,24 / 0,49**, capitale **8,75** (−14,6 %). Le titre **déborde de 0,24 CSS** à gauche de sa boîte nominale (`m29`) |
| A4 | **Flèche retour et bloc ARGENT déplacé** (point 0 user, arbitrage ouvert) | cf. `m17` et `m18` pour les mesures |
| A5 | **Libellés anglais de la RÉFÉRENCE** (`HEAT`, `$ 24 850`, `Jour 12 · Soirée`, `21:40`) — ruling « fr réel » du 2026-09-02 : le client a raison, la maquette est en retard | noté une fois, jamais compté comme écart d'écran |
| A6 | **La référence porte de l'échafaudage d'atelier** : 6 pastilles `.co`, les bascules `.bascule` 🌙 et `.chaudb` 🔥, le `.floater` animé « + $320 » | non comptés comme absents ; deux de mes sondes ont dû être corrigées pour les écarter (`m25`, `m35`) |

---

## Ce que le lot DÉCLARE — vérifié un par un

| # | déclaration | verdict | mesure |
|---|---|---|---|
| D1 | **B1** — fond posé sous le nom, contraste 1,70 → **5,32:1**, pire cas 3,90:1 « dans la bande de fondu » | **PARTIELLEMENT TENU** | mesuré **7,98:1** à 1920 et **4,57:1** (pire colonne **4,32:1**) à 1080×2400 — mieux que le pire cas déclaré, encore **sous 4,5** à la résolution cible. Et le mot **ne descend pas** dans la bande de fondu (0 px à 1920, 3 px à 2400) : le caveat déclaré ne le couvre pas ⇒ `m12`. La FORME du fond va en `A2` |
| D2 | **M5** — voile du dock avec **palier dès 40 %**, contrastes 4,20 → **7,05–8,36:1**, pire cas = médiane | **TENU** | rampe mesurée de **38 CSS** (canon : 40 % de 90,17 = **36,07**) puis **plateau** (étendue 0,1 L sur les 25 derniers CSS à 1920, 0,0 L à 2400). Contrastes : **1920 : 6,17 · 6,71 · 6,48 · 6,89** (pire 6,17, médiane 6,60) · **2400 : 7,10 · 7,73 · 7,47 · 7,93** · **témoin ⑥ : 8,43 ×4**. Doctrine franchie partout (r7 : 3,54–3,76 à 1920). Les valeurs à 1920 sont **sous** la fourchette déclarée (`m24`,`m25`) |
| D3 | **Arcs à étendue cuite** : bornes en degrés du canon, plus de coupe `Filled` ; **fuselage ÷4,5 (froid) et ÷3,3 (chaud)** ; arc chaud à **60°** pour 60,55 | **TENU sur l'étendue et le fuselage** | étendues angulaires (chacune autour de son propre centre de courbure) : **teal 83,00° contre 83,50°**, **braise 56,00° contre 56,00°** ⇒ exactes. Embouts : épaisseur **constante** jusqu'au bout des deux arcs (teal 4,30 → 4,15 ; braise 4,65 → 4,55–3,85), plus de fuselage (r7 : braise 1,02 → 3,16 → 0,94). ⚠️ Mais l'**épaisseur** reste 1,6–1,8× trop grande (`M2`, non déclaré) et le **rayon** de l'anneau est 14 % trop petit (`m3`, non déclaré) (`m08`,`m09`) |
| D4 | **Interstice** : l'oracle du correcteur rend 34° pour 29,45 aux chemins — « c'est TOI qui tranches » | **TRANCHÉ** | **conv. A (centre du boîtier, primaire)** : canon **braise → 48,50° · teal ← 88,50° · vide 40,00°** ; jeu **braise → 57,50 · teal ← 91,50 · vide 34,00°** (1920) et **58,00 / 91,50 / 33,50°** (2400). **conv. B (pivot)** : canon **61,00 / 89,50 / 28,50°** (source : 60,55 / 90,00 / 29,45) ; jeu **66,00 / 91,00 / 25,00°**. ⇒ **le vide est passé de 12° à 33,5–34°, et il reste −6,0/−6,5° (−15 %) sous le canon**. Stable de 15 % à 70 % de couverture. Le « 34° » de l'oracle du correcteur tombe donc **juste sur ma convention A** — mais le canon y vaut 40°, pas 29,45 : les deux nombres qu'il comparait ne sont pas dans la même convention (`m10`) |
| D5 | **Lunette** posée au rayon du canon mais **déclarée 2,9× trop faible** (TD-654) | **TENU — la déclaration n'est PAS confirmée** | maximum local présent dans les deux : canon à **r = 26,4–26,7 CSS** (u = 0,826–0,836), pic RGB **(55,60,72)** sur des creux (31,41,59) et (30,35,48) ⇒ amplitude **(23,19,12)** à **(24,25,24)** ; jeu à **r = 25,9–26,4 CSS** (u = 0,771–0,781), pic **(36,39,47)** sur (17,21,31) et (13,17,26) ⇒ amplitude **(19,18,16)** à **(23,22,21)**. Même rayon absolu à **0,3–0,5 CSS**, amplitude **comparable**. Je ne remonte pas d'écart (`m12`,`m37`) |
| D6 | **`.chaud` ×4** : « Brûlant » et « Aube » passés en `--braise` | **TENU** | les quatre porteurs à **(224,102,73)** : boîtier (pic du cerclage), filet, `.aile.droite .val` (65–67 % du cœur), `.heatpct` (42–43 %). 1/255 de `--braise`. Au r7, deux des quatre étaient restés crème (`m13`) |
| D7 | **COLLECTER** : remplissage sous masque arrondi, retrait de coin 8,67 → 2,67 CSS | **TENU** | retraits mesurés **3,63 → 0,73 CSS** sur 10 lignes, **symétriques g/d et haut/bas** (r7 : **0,00 ×9**). ⚠️ Le rayon obtenu est ≈ **5,7–6,0** contre 9,0 au canon ⇒ `m14`. Le contrôle négatif tient : 0 pixel « or » dans la zone BLANCHIR (`m21`) |
| D8 | **Volutes** : posées depuis le `d` du canon (34×12, opacité .28), aux deux bouts | **MOITIÉ TENU** | **GAUCHE présente** : x 4,36..16,33, y 25,04..26,50 (canon x 5,00..16,67, y 25,3..26,3). **DROITE absente** : 0 px, contrôle de capacité positif sur le canon ⇒ `m1`. Opacité : α = **0,28 confirmé au bit près** en espace linéaire, mais **non converti** ⇒ le pixel rendu est 1,9× plus fort que celui de la maquette ⇒ `m2` (`m15`,`m16`,`m38`,`m43`) |
| D9 | **Non traités déclarés** (lot r9 « à froid ») : éclairage du fond du cadran, longueur de l'aiguille, taille du pivot | **mesurés et comptés** | `m8` (ΔRGB (1,1,1) contre (19,19,21)) · `m6` (13,07 contre 15,88 CSS) · `m7` (Ø 4,51 contre 3,53 CSS) |

### Le contrôle qui décide de `M3` et `m2` — cinq surfaces translucides, deux modèles

Un écart systématique de même signe serait une erreur de modèle. **Il n'est pas systématique** :

| surface | fond mesuré | MESURE | prédiction **sRGB** | prédiction **LINÉAIRE** | gagnant |
|---|---|---|---|---|---|
| voile du bandeau (`.barre`, t = 0,128) | (149,164,182) | (59,66,76) | (30,37,49) — écart **29** | (58,65,75) — écart **1** | **linéaire** ⇒ alpha *recopié* |
| volute gauche 2400 (`.volute`, α 0,28) | (16,20,31) | (133,127,115) | (77,77,78) — écart **56** | (133,127,115) — écart **0** | **linéaire** ⇒ alpha *recopié* |
| volute gauche 1920 | (56,62,73) | (139,135,127) | (106,107,109) — écart **33** | (139,135,126) — écart **1** | **linéaire** ⇒ alpha *recopié* |
| plaque de fiche (`.fiche`, t = 0,049) | (85,135,157) | (12,20,31) | (14,22,33) — écart **2** | (21,35,46) — écart **15** | **sRGB** ⇒ alpha *converti* |
| arc teal (`#7fd4d955`) / arc braise (`#e0664a88`) | fond nu du cadran | (70,98,108) / (133,76,70) | écart **6** / **7** | écart **34** / **38** | **sRGB** ⇒ alpha *converti* |

⇒ **La conversion sRGB → linéaire est appliquée à la plaque et aux deux arcs, et pas au voile du
bandeau ni aux volutes.** Ce n'est pas une erreur de modèle : c'est une conversion appliquée à trois
surfaces sur cinq. *(Contrôle de l'instrument : sur le canon, les deux arcs sont prédits par le
modèle sRGB à 1–4/255 — Chrome compose bien en sRGB.)* — `m43`, `m44`

---

## 5. Autres résolutions

**1080×2400 (cible)** — l'inventaire tient : rien n'est coupé, rien ne déborde, l'ordre de lecture est
le même, les proportions en % de largeur sont conservées (les ronds du dock, la plaque, le médaillon
sont aux mêmes abscisses qu'à 1920, à ≤ 0,55 CSS près). Écarts propres à cette résolution :

- **`m12` — le nom du district y tombe à 4,32:1 dans sa pire colonne** (7,98:1 à 1920) : l'art derrière
  le mot est le ciel clair, alors qu'à 1920 c'est un mur sombre. C'est **la seule résolution** où la
  doctrine n'est pas franchie.
- **`m19` — 35,2 CSS de panneau uni (34,38,49)** entre le filet du bandeau et le haut de l'art, plus
  87 CSS en pied (occupés par le dock). Le haut de l'écran se lit alors comme un empilement de quatre
  bandes horizontales : bandeau (L 10,6) / panneau (L 15,2) / fond posé du nom (L 8 puis 35) / art
  (L 69). Le médaillon et son losange chevauchent le panneau, ce qui l'atténue.
- **`M3` n'y est PAS observable** : derrière le bandeau il y a le panneau uni, pas l'art. Le bandeau y
  rend L 10,6 (canon 11,7). Le défaut est réel mais **invisible à cette résolution**.
- Le voile du dock y est meilleur qu'à 1920 (7,10–7,93:1 contre 6,17–6,89) pour la même raison.

**Témoin ⑥ (dock, 1080×2400)** — l'indicateur d'onglet actif est bien sous **FAMILLE** (centre 161,88,
rond 2 à 161,67) alors qu'il est sous **EMPIRE** (93,83) sur les trois planches ① : l'indicateur suit
l'écran. Contrastes des quatre libellés : **8,43:1** partout.

**Planche « district seul sous chrome » (2400)** — identique à la planche fiche **au bit près** hors
plaque, à 20 px près (deux taches de 10 px, à x 108,2 / 194,2 CSS et y 339–342 CSS, sans doute deux
marqueurs de bâtiment qui changent d'état à l'ouverture de la fiche).

---

## 6. Ce que je n'ai pas pu vérifier

1. **Animation** — aucune paire T / T+1 s n'est fournie ; le dossier le dit. *Indice, pas preuve* : les
   deux planches 2400 (fiche et district) sont **bit-identiques hors plaque** à 20 px près, ce qui
   couvre le bandeau, le cadran, l'art et le dock. Mais ce sont deux **états** différents, pas deux
   **instants** du même état : je ne conclus pas. **Trancherait** : deux captures du même état à T et
   T+1 s, et le compte de pixels différents hors chrome hérité.
2. **Barre de ratio** — « remplissage à 100 % » et « pas de piste » sont indiscernables ici : 73,68 CSS
   d'or = 99,6 % de la piste de 74 CSS du canon. **Trancherait** : une capture à un ratio ≠ 100 %.
3. **`.bandeau-alerte`** — composant absent ou aucune alerte en attente ? **Trancherait** : une capture
   avec une alerte en attente. À noter que son créneau canon (y 78..111,8) est désormais occupé par le
   fond posé du nom (83,5..96,5).
4. **Le voile du bandeau (`M3`) n'est mesurable qu'à 1080×1920** — c'est la seule planche où de l'art
   passe derrière le bandeau. **Trancherait** : une capture 2400 dont l'art remonterait sous le
   bandeau, ou le rect imprimé du panneau de fond.
5. **Éclairage du fond de cadran** — je mesure son absence (`m8`) mais je ne sais pas dire s'il est
   absent ou noyé par le vignettage radial du jeu (amplitude radiale L 2,5 sur 0,60..0,72 R).
6. **Part du halo dans `m11`** — le boîtier mesure +5 % en diamètre nominal, mais une lueur étale
   mécaniquement sa mi-alpha. La ligne médiane du trait bouge aussi (62,60 → 64,9/65,0), donc l'écart
   n'est pas *entièrement* un artefact du halo — je ne sais pas le décomposer.
7. **Valeurs affichées contre les corps de la base gelée** — hors mandat visuel (c'est `juge-donnees`).
   Le dossier cite bien `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` pour
   les trois planches ①, donc les valeurs *seraient* comparables ; je ne les juge pas.
8. **Fûts de gras entre r7 et r8** — le r7 est PRÉ-Bold (TD-615) : je n'ai comparé aucune graisse
   entre les deux tours, seulement des grandeurs que la graisse ne change pas.
9. **Hors périmètre du dossier, donc non jugés** : marqueurs de bâtiments, pastille dorée, badge de
   notification du dock, et la quantité d'art visible (palier « district entier » contre gros plan).
10. **Une seule résolution** pour l'état « district seul » (2400) et pour le témoin ⑥ (2400).
11. **Couleur du filet supérieur de la fiche à 2400** — la ligne y est lue contre un art clair et sa
    médiane est contaminée ; seule son étendue y est opposable (`m20`).

---

## Annexes

### 1. Inventaire de la référence — couche globale

| zone | L moyen | % de pixels > L 90 | palette dominante (quantifiée par 16) |
|---|---|---|---|
| bandeau (0..51 CSS) | **11,7** | 0,0 % | — |
| plaque de fiche | **13,2** | 0,0 % | — |
| dock (605,7..695,9) | **11,2** | 0,0 % | — |
| chrome + fiche | — | — | (0,16,16) 26,7 % · (0,16,32) 26,2 % · (16,16,32) 24,8 % · (0,0,16) 7,1 % · (208,160,64) 1,5 % |

Géométrie lue au navigateur (`mesure-canon.txt`) : `.tel` 392 × 696,88 · `.fiche` 366 × 169,19 à
(13,00 ; 424,52) · `.dock` 390 × 90,17 à (1,00 ; 605,70) · `.rond` 46 · `.medaillon` 64 à (164 ; 8) ·
`.aile.gauche` 96 × 33,55 · `.aile.droite` 97,95 × 26,31 · `.bandeau-alerte` 390 × 33,81 à y 79.

Géométrie du cadran **dérivée de la source** et **retrouvée sur l'image** : SVG 60×40 dans une boîte
44×28 ⇒ `preserveAspectRatio` = 0,700 ; arcs `A 26 26` ⇒ **R = 18,20 CSS** ; trait `stroke-width 3.5`
⇒ **2,45 CSS** ; pivot `r=2.6` ⇒ **3,64 CSS** ; aiguille `(30,34)→(30,12)` + cap rond ⇒ **16,1 CSS**,
`rotate(-42)` ⇒ **132°**. Mesuré sur l'image : R 18,202 · 2,45 (p10) · 3,53 · 15,88 · 132,1°.

### 2. Inventaire de la capture — couche globale

| zone | L moyen (1920) | L moyen (2400) | canon |
|---|---|---|---|
| bandeau | **27,3** | 10,6 | 11,7 |
| plaque de fiche | 14,0 | 14,0 | 13,2 |
| dock | 21,5 | 10,7 | 11,2 |

Palette du chrome + fiche à 2400 : (0,16,16) 28,7 % · (16,16,32) 22,3 % · (0,16,32) 19,1 % ·
(16,16,16) 10,6 % · (0,0,16) 6,6 % · (208,160,64) 1,4 % — la même que le canon à l'ordre près, avec
le même 1,4–1,5 % d'or. À 1920 la troisième entrée devient (48,48,64) à 11,9 % : c'est `M3`.

### 3. Correspondance des repères

| repère | canon | jeu 1920 | jeu 2400 |
|---|---|---|---|
| facteur | ×3,000000 | ×2,755102 | ×2,755102 |
| centre du boîtier (CSS) | (195,75 ; 38,00) | (195,75 ; 39,65) | (195,75 ; 39,80) |
| rayon nominal extérieur | 31,95 | 33,50 | 33,80 |
| pivot (CSS) | (195,80 ; 43,60) | (195,69 ; 44,86) | (195,69 ; 44,86) |
| haut de la plaque de fiche | 424,52 | 425,39 | 599,61 |
| hauteur d'écran | 696,88 | 696,88 | 871,06 |
| décalage de l'art entre les deux résolutions | — | 0 | **+240 px = +87,11 CSS** (99,2 % bit-identique) |

### 4. Scripts — `mesures/`

`commun.py` (échelle, luminance WCAG, L\*, médianes, jetons du `:root`) ·
`m01`/`m02` ancres et centre du boîtier · `m03`–`m05` masques d'arcs et pivot ·
`m06`–`m10` arcs : courbure, bornes, interstice · `m07` contrôle contre la source ·
`m08` épaisseur perpendiculaire et embouts · `m11`–`m12` piste, aiguille, pivot, lunette ·
`m13`–`m17` chrome : filet, `.chaud`, volutes, bloc ARGENT, ratio ·
`m18`–`m21` fiche : plaque par différence, régions, boutons ·
`m22`–`m25` textes de la fiche et dock · `m26`–`m28` nom du district ·
`m29`–`m31` titre, gouttière, bandes 2400, capitales et contrastes ·
`m32`/`m33` libellés du cadran · `m34`–`m38` filet de fiche, losange, lunette RGB, flèche ·
`m39`–`m44` alpha linéaire, pixel résultant, **prémisse du deux-fonds**, modèles de mélange.

Chaque script imprime la taille des images qu'il ouvre et son facteur d'échelle. Chaque script qui
décide porte un contrôle : contrôle **positif** contre la source pour le cadran (`m07`, `m09`),
contrôle **négatif** (0 px teal dans le pivot, `m03` ; 0 px « or » dans BLANCHIR, `m21`), contrôle de
**capacité** pour les sondes d'absence (la volute du canon, `m16` ; le ruban du canon, `m36`), et
contrôle de **prémisse** pour la mesure à deux fonds (`m41`).

**Trois de mes sondes ont été réfutées par leur propre contrôle avant toute conclusion**, et je le
consigne parce que chacune aurait produit un finding faux :
- l'ajustement algébrique de cercle divergeait sur des arcs courts (R 14,4 pour un R vrai de 18,2) —
  remplacé par une recherche sur grille validée contre la source ;
- la mesure du voile du bandeau lisait son « art nu » **sous le fond posé du nom** sur la rangée
  y = 8 CSS — rangée écartée, prémisse ensuite vérifiée à 99,2 % ;
- la comparaison des transmittances en sRGB donnait « 2,5 à 4× trop transparent » pour le bandeau :
  résolue en espace linéaire, la valeur juste est **+29/255 sur le pixel résultant**, et c'est le
  contrôle sur la plaque et les arcs qui a montré que ce n'était pas une erreur de modèle.
