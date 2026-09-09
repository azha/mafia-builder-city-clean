# Juge visuel ⊥ — ① L'intérieur de district (« le HUD de Brennar ») — r6 — 2026-09-06

## Verdict : NON APPROUVÉ

Le correctif annoncé (F1, tête de fiche) **tient**, le chrome **n'est plus à ×1,19** (les rapports
re-mesurés vont de ×0,994 à ×1,090) et le panneau de fiche est aujourd'hui un quasi-calque du canon
— mais le **médaillon-manomètre**, non traité, ne se lit plus comme un cadran (pivot du mauvais côté
du centre, segment neutre absent, lunette absente, fond plat, arc plus épais et plus clair, libellé
qui frôle le cerclage), et le **cerclage du boîtier comme le filet du bandeau ont changé de teinte**
(200,126,66 au lieu du laiton 176,141,62). *Le compte des écarts se prend dans la table du § 3.*

---

## Convention de bord — DÉCLARÉE (elle vaut pour tout le rapport)

| grandeur | convention |
|---|---|
| **texte** | encre = `L ≥ fond + 0,5·(pic − fond)`, fond au 6ᵉ–10ᵉ centile de la fenêtre, pic au 99ᵉ. Quand le chiffre décide (capitale d'ARGENT), mesure **sous-pixel** par profil de couverture, bord à mi-amplitude du plateau (`m03`), avec contrôle positif (deux fenêtres, écart 0,000 CSS). |
| **traits** (filet, cerclage, arc) | bord **NOMINAL** = mi-amplitude de la rampe (mi-alpha). Le **CŒUR** (≥ 90 % du pic) est donné à part chaque fois que la *forme* du profil est en cause (net vs halo). |
| **disques** (ronds du dock, boîtier) | diamètre pris **bord extérieur à bord extérieur du cerclage**, à mi-amplitude. |
| **rayons du manomètre** | fraction de **R = rayon du PIC du cerclage du boîtier**, centre ajusté par moindres carrés sur 109 rayons (résidu médian **0,23 px** canon / **0,74 px** jeu — le facteur 3 est lui-même la signature du halo). R = **31,07 CSS** (canon) / **32,73 CSS** (jeu). |
| **couleurs** | médiane d'une fenêtre 7×7 à ≥ 3 px de tout bord, ou médiane du **cœur** (≥ 97 % du pic) pour un glyphe. |

Échelle : référence ÷3,0 · captures ÷2,7551. **Toute valeur ci-dessous est en px CSS** sauf mention.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | canon | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | **F1 — encre du titre de fiche sous le filet du panneau** | 19,66 | **19,97** | **+0,31** | `m22`,`m23` |
| 2 | **F1 — blanc titre → sous-titre (accent compris)** | 11,00 | **10,52** (1920) · 11,25 (2400) | −0,48 | `m23`,`m44` |
| 3 | **F1 — le titre tient sur UNE ligne** | 1 ligne | **1 ligne** | — | `m23` |
| 4 | ronds du dock — diamètre | 46,00 | 45,73 · 46,10 · 46,10 · 45,73 | ≤ 0,27 | `m08` |
| 5 | ronds du dock — centres | 94 · 162 · 230 · 298 | 94,01 · 162,06 · 229,94 · 297,99 | ≤ 0,12 | `m08` |
| 6 | ronds du dock — pas | 68,00 | 67,87 · 68,24 · 67,88 | ≤ 0,24 | `m04` |
| 7 | ronds du dock — épaisseur du cerclage | 1,00 | 0,73 – 1,09 | ≤ 0,27 | `m08` |
| 8 | chasses du dock (EMPIRE / FAMILLE / PLUS) | 36,33 · 41,00 · 23,33 | 37,02 · 41,38 · 23,59 | +1,9 % · +0,9 % · +1,1 % | `m09` |
| 9 | centres des libellés du dock | 93,50 · 161,50 · 297,67 | 94,01 · 162,24 · 298,17 | ≤ 0,74 | `m09` |
| 10 | capitale d'« ARGENT » (sous-pixel) | 6,21 (18,64 px) | **6,67 / 6,68** (18,38 / 18,40 px) | +0,47 (< 1 px) | `m03` |
| 11 | aile droite — bord droit de la valeur | 375,00 | **375,30** | +0,30 — **ne sort plus de l'écran** | `m27` |
| 12 | aile droite — corps et ligne de base de la valeur | 10,00–10,33 · base 35,33 | 10,16 · base 35,57 | ≤ 0,24 | `m28` |
| 13 | barre de ratio — couleur `--or` et épaisseur | (217,171,78) · 2,00 | (217,171,77) · 2,18 | 1/255 · +0,18 | `m26` |
| 14 | filet supérieur de la FICHE — couleur `--laiton`, épaisseur | (176,141,62) · 1,00 | (176,141,61) · 1,09 | 1/255 · +0,09 | `m22` |
| 15 | panneau de fiche — haut, largeur | 426,67 · 366,16 | 425,39 · 368,22 | −1,28 · +2,06 | `m22` |
| 16 | bouton OR — boîte et dégradé | x 30,00..133,00 · y 541,00..578,33 · (232,196,105)→(202,156,57) | x 29,04..130,30 · y 540,09..579,29 · (232,196,105)→(200,153,55) | ≤ 1,89 ; haut **exact** | `m38` |
| 17 | séparateurs de stats (x) | 140,00 · 251,67 | 140,10 · 250,63 | ≤ 1,04 | `m46` |
| 18 | centres des 3 cellules de stats | 83,67 · 195,67 · ~307,3 | 84,39 · 194,91 · 305,98 | ≤ 1,3 | `m46` |
| 19 | bandes de stats (valeurs / libellés), y | 495,33..507,00 / 518,00..524,00 | 494,72..509,24 / 517,95..524,48 | ≤ 0,61 sur les libellés | `m37` |
| 20 | encres de la fiche | `--or-vif` (242,201,107) · `--creme-2` (185,173,146) | (242,201,106) · (185,173,146) | 1/255 · **0** | `m33`,`m34` |
| 21 | **palette du panneau de fiche** (6 dominantes + proportions) | (13,20,31) 89,4 % · (217,175,82) 4,3 % · (235,196,104) 1,3 % · (203,157,59) 1,0 % · (233,223,199) 0,8 % · (56,61,69) 0,7 % | (14,20,31) 88,8 % · (216,176,83) 4,5 % · (235,196,103) 1,3 % · (203,157,59) 1,0 % · (233,223,199) 0,8 % · (53,59,70) 0,7 % | ≤ 3/255, ≤ 0,5 pt | `m42` |
| 22 | médaillon — centre x | 195,80 | 195,44 / 195,47 | ≤ 0,36 | `m13` |
| 23 | médaillon — le filet ne traverse pas le boîtier | s'arrête à l'anneau | s'arrête à l'anneau | — | `m26` |
| 24 | pivot du cadran — couleur | `--laiton` (176,141,62) | **(176,141,62)** | **0** | `m20` |
| 25 | libellés du manomètre — couleurs | `--creme` (234,224,200) · `--creme-2` (184,172,145) | (234,224,200) · (185,173,146) | **0** · 1/255 | `m36` |
| 26 | rayon médian de l'arc **braise** | 0,4840 R | 0,4870 R | +0,6 % — F5-rayon tient sur la braise | `m15` |
| 27 | contrastes du bandeau | — | ARGENT **5,01:1** · JOUR **5,00:1** (≥ 4,5) | — | `m33` |
| 28 | gouttière | respectée | respectée aux deux résolutions | — | `m39`,`m44` |
| 29 | cohérence des deux planches 2400 | — | chrome **bit-identique** (0 px différent pour y < 339,7 CSS) | — | `m44` |
| 30 | libellés du dock : 4 onglets, capitales, aucun coupé | 4 | 4, capitales, aucun coupé | — | `m09` |
| 31 | **profil de fondu horizontal du filet du bandeau** (le trait s'éteint aux extrémités) | plein de x≈100 à 300, fondu sous 60 et au-delà de 350 | **même forme** : plein de 100 à 300, fondu sous 60 et au-delà de 350 | — | `m45b` |
| 32 | montant et titre de fiche : même encre `--or-vif` | (242,201,107) | (242,201,106) sur les deux | 1/255 | `m33`,`m47` |

---

## Le CHROME ×1,19 — mesuré tel quel, comme demandé

Neuf grandeurs, rapport jeu ÷ canon, à comparer aux valeurs du r5 :

| grandeur | canon | r6 (jeu) | rapport r6 | rapport r5 |
|---|---|---|---|---|
| capitale d'« ARGENT » (sous-pixel) | 6,21 | 6,67 | **×1,075** | (19 px vs 23/22 px) |
| capitale d'« ARGENT » (px bruts, seuil entier) | 19 px @×3 | **19 px @×2,755** | — | 23 (1920) / 22 (2400) |
| ronds du dock — diamètre | 46,00 | 45,73–46,10 | **×0,994–1,002** | ×1,184 |
| ronds du dock — pas | 68,00 | 67,87–68,24 | **×0,998–1,004** | ×1,185 |
| chasse EMPIRE | 36,33 | 37,02 | **×1,019** | ×1,209 |
| chasse FAMILLE | 41,00 | 41,38 | **×1,009** | ×1,204 |
| chasse PLUS | 23,33 | 23,59 | **×1,011** | ×1,211 |
| capitale des libellés de dock | 6,00 | 6,53 | **×1,088** | ×1,204 |
| barre de ratio — épaisseur | 2,00 | 2,18 | **×1,090** | ×1,187 |
| bas du filet du bandeau | 52,00 | 51,90 | **×0,998** | ×1,187 |

⇒ **Le ×1,19 n'est PAS reproduit sur ces planches.** Et le résidu a une forme qui exclut l'échelle :
les **géométries et les chasses** sont à **×1,00 ± 2 %**, seules les **hauteurs de capitale** portent
un **+7,5 à +9 %** constant (ARGENT +7,5 %, dock +8,8 %, ratio +9,0 %). Une échelle bougerait aussi
les chasses ; elles ne bougent pas ⇒ **c'est une signature de métrique de POLICE** (client DejaVu Sans
vs référence Noto Sans, cf. `fc-match` du dossier et `body{font:…"Segoe UI"…}` de la source), **pas
un facteur d'échelle**. Ce résidu tient dans la tolérance (Δ ≤ 0,53 CSS < 1 px) : il est au contrôle
positif, pas aux écarts.

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir son quartier vivant, repérer un bâtiment, le toucher, lire ce qu'il vaut et décider
quoi en faire. L'écran est un **plan habité** sur lequel se posent trois surfaces de chrome.

**Ordre de lecture de la maquette.** (1) le **médaillon** central — le seul objet circulaire, le seul
cerclé d'or, posé à cheval sur la limite du bandeau : c'est la montre à gousset de la ville, elle dit
la chaleur ; (2) le **montant en or** à gauche, la plus grande encre colorée du bandeau ; (3) l'**art**
et le bâtiment héros ; (4) la **fiche**, panneau de verre fumé bordé d'un filet de laiton, avec son
titre or centré et son unique bouton plein ; (5) le **dock**.

**Zones.** bandeau (argent · médaillon-manomètre · jour) — art du district — fiche (titre, sous-titre,
trois cellules de stats, trois actions dont une seule pleine) — dock (4 ronds + libellés).

**Traits d'identité.** ① le **laiton** `#b08d3e` en filet fin et en cerclage, partout et jamais ailleurs
qu'en trait ; ② le **médaillon-manomètre** : boîtier cerclé net, lunette intérieure, cadran à dégradé
radial, arc froid / **neutre** / chaud, aiguille depuis un pivot **bas** ; ③ le **verre fumé** de la
fiche (aplat très sombre à 89 % d'aire, encres or et crème) ; ④ un **seul** appel à l'action plein,
les deux autres en ligne ; ⑤ des **ornements discrets** — volutes du bandeau, pastille et trait d'onglet
actif du dock.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour la **fiche**, non pour le **médaillon**. La fiche est aujourd'hui un calque : même panneau,
même filet de laiton, même bouton or, mêmes six couleurs dominantes aux mêmes proportions, et la tête
de fiche — le défaut du tour précédent — est rentrée dans le rang (titre sur une ligne, encre à
19,97 CSS du filet contre 19,66 au canon, blanc de 10,52 contre 11,00). Le chrome a retrouvé son
échelle : ronds, pas, chasses et filet sont au canon à 2 % près, et l'aile droite ne sort plus de
l'écran.

Ce qui a changé de nature, c'est le **médaillon**, et c'est le premier objet que l'œil rencontre. Au
canon c'est une montre : un cerclage **net** de 1,35 CSS en laiton, une lunette intérieure, un cadran
qui **respire** (dégradé radial, 19,3 L d'amplitude), un arc mince et constant (2,4–2,7 CSS) coupé
d'un **segment neutre de 39°** entre le froid et le chaud, une aiguille pendue à un pivot **sous** le
centre. En jeu c'est une **lampe** : le cerclage est un halo de 2,55 CSS dont le cœur ne fait que
0,80 (contre 0,98 sur 1,35 au canon), d'une teinte **orangée (200,126,66)** qui n'est ni le laiton ni
l'or du dépôt ; la lunette a disparu ; le cadran est **plat** (1,1 L d'amplitude, contre 19,3) ; l'arc
est **2× plus épais**, d'épaisseur **variable** selon l'angle, et **33 à 40 % plus clair** ; le froid
et le chaud se **touchent** (recouvrement de 26° là où le canon montre 39° de rail neutre) ; et le
pivot est passé de **0,150 R sous** le centre à **0,152 R au-dessus** — l'instrument est retourné.
Comme le même orange (200,126,66) porte aussi le **filet** du bandeau, qui a par ailleurs **doublé
d'épaisseur** (1,00 → 1,81), le haut de l'écran a globalement changé de métal : le laiton discret est
devenu un néon.

Les trois écarts de tête, par impact perçu : **(1)** le médaillon ne se lit plus comme un cadran
(pivot inversé + segment neutre absent + fond plat + lunette absente) ; **(2)** le laiton du haut
d'écran est devenu un orange plus rouge et un trait deux fois plus épais ; **(3)** le dock ne dit plus
**où l'on est** — indicateur d'onglet actif et pastille absents (0 px de laiton sur toute la bande).
Deux écarts de doctrine s'y ajoutent : le **nom de district à 1,99:1** sur le ciel à la résolution
cible, et les **libellés du dock à 4,05:1** à 1080×1920.

---

## 3. Écarts

`dép. données` = l'écart change-t-il si le compte change ? Géométrie, palette, typographie,
espacements et présence/absence sont vrais quelles que soient les données.

| id | gravité | critère | dép. données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F01` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le pivot du cadran est du mauvais côté du centre du boîtier** — l'aiguille est pendue par le haut au lieu d'être plantée en bas | pivot laiton (masque serré ±18/canal) : canon centre px (587,50 ; 130,50) ⇒ **+4,66 CSS = +0,1499 R SOUS** le centre ajusté ; jeu (539,50 ; 96,00) ⇒ **−4,97 CSS = −0,1517 R AU-DESSUS**. Écart **0,302 R = 9,63 CSS** (`m21`) | — |
| `F02` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le segment NEUTRE entre zone froide et zone chaude a disparu** : les deux arcs se rejoignent et se recouvrent | secteurs angulaires depuis le centre du boîtier (0° = à droite, sens trigo) — canon : teal **89°..198°**, braise **342°..50°** ⇒ **39° de rail neutre visible** au sommet ; jeu : teal **68°..179°**, braise **0°..94°** ⇒ **0°** de neutre et **26° de recouvrement** (`m15`) | si le recouvrement est un dégradé de raccord ou deux arcs superposés — l'image ne tranche pas |
| `F03` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Les deux couleurs de l'arc sont 33–40 % plus claires, dans le même sens ⇒ erreur de MODÈLE (sRGB ↔ linéaire), pas deux erreurs** | teal (67,100,111) L=93,8 → (97,132,136) L=124,8 (**+33 %**) ; braise (131,69,61) L=81,6 → (169,101,89) L=114,6 (**+40 %**). Test du modèle sur les sources du SVG (`#7fd4d955`, `#e0664a88`) : le **canon** est reproduit par une composition **sRGB** à **d=2,0** (teal) et **d=8,6** (braise) contre 45,5 / 41,7 en linéaire ; le **jeu** est reproduit par une composition **LINÉAIRE** à d=17,9 / 34,6 contre 63,1 / 55,8 en sRGB (`m17`) | le résidu linéaire (18 à 35/255) : masque de classe incluant des pixels de bord, ou couleurs sources légèrement différentes côté client |
| `F04` | MAJEUR | DÉJÀ APPLIQUÉ | non | **L'arc est ~2× plus épais ET d'épaisseur variable** (le canon est un trait de largeur constante) | épaisseur radiale à angle fixé — canon teal 2,68 / 2,60 / 2,73 / 2,67 (100/140/160/180°) et braise 2,42 / 2,22 / 2,40 / 2,39 (10/20/30/40°) ⇒ **constante 2,2–2,7** ; jeu teal **5,26 / 5,54 / 5,90 / 5,86** et braise **2,86 / 4,25 / 4,55 / 4,70** ⇒ **variable 2,9–5,9**. Bord **extérieur** constant (0,545–0,556 R), bord **intérieur** variable (`m16`) | — |
| `F05` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le cerclage du boîtier est passé d'un trait NET à un HALO, et la lunette intérieure a disparu** | profil radial moyen sur 144 rayons (filet et bas exclus) — canon : plateau à L=142,7 sur 30,63..31,98 ⇒ **nominal 1,35 CSS**, **cœur 0,98** (73 % de plat) ; jeu : pic unique L=120,0 à r=32,50, ⇒ **nominal 2,55 CSS**, **cœur 0,80** (31 % de plat). **Lunette** : canon bosse nette L 27→53,8 à **r = 27,1 CSS (0,873 R)** ; jeu **aucune bosse** (L monotone 22,2 → 17,8 → 25,7 de 0,80 à 0,92 R) (`m14`) | — |
| `F06` | MAJEUR | NOUVEAU | non | **Le cerclage du boîtier ET le filet du bandeau ne sont plus en laiton mais dans un orange plus ROUGE** (ni `--laiton`, ni `--or`, ni `accentGold`) | filet, pic mesuré sur **30 colonnes** hors médaillon et hors barre de ratio : canon **(176,141,62)** = `--laiton`, uniforme ; jeu **(200,126,66)**, uniforme. Cerclage du boîtier au sommet : jeu (196,123,65)/(200,126,66), canon L=142,7 / R−B=114 = laiton. Δ = **(+24, −15, +4)** : R monte, **G descend** ⇒ plus rouge, pas plus jaune ni désaturé (`m45`, `m14`) | — |
| `F07` | MAJEUR | NOUVEAU | non | **Le filet du bandeau a 81 % d'épaisseur en plus** | coupe verticale à x=300 CSS, sans anti-crénelage d'aucun côté : canon **3 px** pleins (176,141,62) de y 51,00 à 52,00 ⇒ **1,00 CSS** ; jeu **5 px** pleins (200,126,66) de y 50,09 à 51,90 ⇒ **1,81 CSS** (`m26`, `m45`, coupe `m45b`). *Le dégradé horizontal d'extrémité est le même des deux côtés (plein de 100 à 300 CSS, fondu au-delà) — ce n'est PAS une différence de translucidité, seulement d'épaisseur et de teinte (`F06`).* | — |
| `F08` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le libellé du manomètre frôle le cerclage** | coin le plus éloigné du centre, pixels restreints au disque du boîtier — canon « HEAT » **0,634 R = 19,70 CSS**, bord intérieur du cerclage 30,63 ⇒ **dégagement 10,93 CSS** ; jeu « CHALEUR » **0,887 R = 29,03 CSS**, bord intérieur 31,17 ⇒ **dégagement 2,14 CSS** (`m36`, `m14`) | le libellé dépend des données (bucket de chaleur) : un mot plus long collerait le cerclage — non testable sur un seul état |
| `F09` | MAJEUR | DÉJÀ APPLIQUÉ | non | **Le dock ne dit plus où l'on se trouve : indicateur d'onglet actif ET pastille de notification absents** Trois sondes (`m31`, `m48`). **(a) couleur** — référence : **1357 px** laiton dans la bande du dock, dont le trait d'onglet actif x 87,00..101,00 y 663,67..665,67 ; captures : **0 px** aux deux résolutions. **Capacité** : la MÊME sonde rend **5128 px** sur le filet du bandeau et **29 135 px** sur le bouton OR des mêmes captures ⇒ elle n'est pas aveugle. **(b) forme, sans hypothèse de couleur** — amplitude sous chaque rond : référence **131,4 / 3,0 / 4,2 / 9,0** (l'onglet actif se détache seul) ; jeu **3,6 / 3,6 / 83,0 / 3,6** — et le 83,0 est **l'accent de « FILIÈRE »** (2 à 4 px de `--creme-2` à y 1840-1841, fenêtre débordant sur le libellé), pas un trait. **(c) pastille** — coin haut-droit : référence **1,9 / 148,2 / 31,8 / 9,3** (FAMILLE se détache) ; jeu **3,0 / 2,9 / 3,1 / 3,1** | — |
| `F10` | MAJEUR | DÉJÀ APPLIQUÉ | **oui** (art + quart du jour) | **Le nom de district tombe à 1,99:1 sur le ciel à 1080×2400** (doctrine : ≥ 4,5:1 petits textes) | encre (233,223,199), ciel (146,161,180) ⇒ **1,99:1** ; contour (45,50,53) ⇒ encre/contour 9,79:1, contour/ciel 4,93:1 ; capitale **4,72 CSS** = le plus petit texte de l'écran. À 1080×1920 le même libellé tombe sur une silhouette sombre et rend **7,74:1** ⇒ la lisibilité est laissée au hasard de l'art (`m33`, `m34`) | quels autres districts / quarts placent le libellé sur du clair — une seule planche par résolution |
| `F11` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le fond du cadran est PLAT au lieu d'être un dégradé radial directionnel** | médiane par secteur de 45° dans l'anneau 0,58..0,72 R, pixels d'arc et de texte exclus — canon : amplitude inter-secteurs **RGB (19,19,23), L 19,3**, plus clair au secteur **90–135°** (haut-gauche, conforme à `radial-gradient(circle at 38% 30%…)`) ; jeu : **RGB (1,1,2), L 1,1** aux deux résolutions (`m18`) | — |
| `F12` | MINEUR | DÉJÀ APPLIQUÉ | non | **Le boîtier du médaillon est 5,4 % plus grand** | rayon du pic du cerclage **31,07 → 32,73 CSS** (+5,3 %) ; bord extérieur nominal 31,98 → 33,72 (+5,4 %) ⇒ diamètre nominal **63,96 → 67,44 CSS** (`m13`, `m14`) | — |
| `F13` | MINEUR | NOUVEAU | non | **Le disque du pivot est 31–42 % plus gros et n'est pas rond** | canon **3,33 × 3,33 CSS** (10 × 10 px) ; jeu **4,36 × 4,72 CSS** (12 × 13 px) (`m21`) | — |
| `F14` | MINEUR | DÉJÀ APPLIQUÉ | non | **L'aiguille est 16 % plus courte, et 20 % plus courte rapportée au boîtier** | canon (dérivé de la source SVG : `line y1=34 y2=12`, ×0,7) **15,40 CSS = 0,496 R** ; jeu mesurée (masque crème, quadrant au-dessus du pivot) **12,99 CSS = 0,397 R**, épaisseur 1,24 CSS contre 1,40 au canon (`m41`) | l'aiguille du **canon** n'a pas pu être isolée dans l'image : le « 37% » est de la même crème et la croise ⇒ la valeur canon vient de la source, pas de l'image |
| `F15` | MINEUR | DÉJÀ APPLIQUÉ | **oui** (longueur du montant) | **Les chiffres du montant perdent 15 % de corps** | canon « $ 24 850 » : chiffres **11,33–11,67** ; jeu « 9 627 820,00 € » : chiffres **9,80** aux deux résolutions ⇒ **−14,7 %** (`m28`) | si le corps est fixe ou réduit pour tenir : un seul montant photographié |
| `F16` | MINEUR | NOUVEAU | **oui** (ratio affiché) | **La barre de ratio n'a plus de piste : sa portion dorée SEULE dépasse déjà la largeur TOTALE du canon de 37 %** | canon : or x 16,00..66,00 (**50,33**) + piste **`#5a6376` = (90,99,118)** jusqu'à 90,00 ⇒ total **74,00** ; jeu : or x 63,88..164,79 (**101,27**) puis (46,54,62), (15,19,28), (21,26,36) ⇒ **aucune piste**. 101,27 / 74,00 = **×1,369** (`m26`) | si la piste est absente ou si le ratio vaut 100 % — discriminant : une planche à ratio < 100 %, ou un balayage de `#5a6376` |
| `F17` | MINEUR | DÉJÀ APPLIQUÉ | non | **Les deux volutes décoratives du bandeau sont absentes** | critère d'**amplitude** (pic − médiane) dans la fenêtre — canon **185,1** (gauche) / **154,9** (droite) ; jeu **2,0 / 0,9** (1920) et **0,7 / 0,7** (2400). **Contrôle de capacité** : la même sonde, à la même hauteur, rend **74,9 / 114,4** ailleurs dans le bandeau des mêmes captures ⇒ elle n'est pas aveugle (`m32`) | — |
| `F18` | MINEUR | DÉJÀ APPLIQUÉ | **oui** (longueur du nom) | **La capitale du titre de fiche perd 18 %** (le r5 la mesurait *plus grande* de 15,7 % ; le signe s'est inversé avec le passage à une ligne) et le titre occupe 99,2 % de la largeur disponible | canon « LE VERGE D'OR » : capitales **10,67** (8 lettres concordantes) ; jeu « Réparation Ilm — … » : capitales **8,71** (R, I, L, L, L), chiffres 9,07–9,44 ⇒ **−18,4 %**. Titre x **31,21..360,42** = **329,21** dans un `.titre` de **332** (`m24`) | **si le corps est fixe ou auto-réduit** — le dossier annonce « pas d'auto-réduction », l'ajustement à 99,2 % de la largeur suggère l'inverse. Discriminant : une planche avec un nom **court** |
| `F19` | MINEUR | NOUVEAU | non | **La capitale du sous-titre de fiche perd 10 %** | canon « BAR · QUARTIER GÉNÉRAL » **7,67** ; jeu « OPÉRATIONNEL » **6,90** (`m23`) | — |
| `F20` | MINEUR | NOUVEAU | **oui** (art + quart du jour) | **À 1080×1920 les libellés du dock tombent à 4,05:1** (doctrine : ≥ 4,5:1) : le voile du dock n'établit pas de base sombre sur l'art clair | EMPIRE, encre (185,173,146) — canon sur fond (11,16,25) : **8,48:1** ; jeu 2400 sur (20,25,36) : **7,92:1** ; jeu **1920** sur (47,77,91) : **4,05:1**. Profil du voile à x=356 : L **126,7 → 79,1** à la hauteur des libellés, **39,2** seulement au bas de l'écran (`m33`, `m43`) | la référence est de NUIT : impossible de savoir si le canon tiendrait 4,5:1 sur le même art de jour |
| `F21` | MINEUR | DÉJÀ APPLIQUÉ | non | **1080×2400 : bande unie de 34,85 CSS entre le filet du bandeau et le haut de l'art** | (34,38,49) L=37,9, de **51,90 à 86,75 CSS** = **4,0 %** de la hauteur d'écran ; ni la couleur du bandeau (16,21,31) ni celle du ciel (150,164,183). Bas : gradient (34,37,48)→(15,21,32) de 784,00 à 870,75, **occupé par le dock** (`m39`) | — |
| `F22` | MINEUR | DÉJÀ APPLIQUÉ | **oui** | **Le libellé principal du manomètre est 65 % plus large que le canon et déporté vers le bas** | canon « 37% » x 184,67..207,00 (**22,67**), y 31,67..45,00 → **à cheval sur le centre** du boîtier (38,84) ; jeu « Brûlant » x 177,49..214,51 (**37,39**), y 44,28..52,27 → **entièrement sous** le centre (39,81), de 9,0 CSS (`m36`) | dépend du bucket affiché |

---

## Table à part — écarts ASSUMÉS (vérifiés « rendus proprement », NON comptés avec les findings)

| ce qu'on voit | rendu proprement ? | mesure | reste-t-il dans son périmètre ? |
|---|---|---|---|
| les 3 chiffres de la fiche remplacés par des bandes qualitatives | **oui** | 3 cellules, séparateurs à 140,10 / 250,63 (canon 140,00 / 251,67), centres 84,39 / 194,91 / 305,98 (canon 83,67 / 195,67 / ~307,3) ; aucune case vide | **oui** — les trois cases gardent position et rôle |
| libellés du dock EMPIRE · FAMILLE · FILIÈRE · PLUS | **oui** | 4 onglets, toutes capitales, aucun libellé coupé, chasses 37,02 / 41,38 / 38,11 / 23,59 | **oui** |
| nom du district affiché là où le canon n'en met pas | **oui** — « La Lisière », pas de slug ni d'identifiant | encre (233,223,199) `--creme` | **oui** sur la forme — mais sa **lisibilité** sort de l'assumé, voir `F10` |
| l'heure remplacée par le quart du jour | **oui** — « Aube », français, non vide | corps 10,16 CSS, ligne de base 35,57 (canon 10,00–10,33 / 35,33) | **oui** |
| ronds du dock vides (icône 20×20 retirée) | **oui** — disques propres, cerclage présent, dégradé radial présent, aucun artefact d'emplacement vide | fond au centre (28,37,52) ≈ `#1d2635` du canon ; cerclage 0,73–1,09 CSS | **oui** |
| bouton RETOUR en haut à gauche | **oui** | x 29,76..37,75, y 23,96..28,31 (7,99 × 4,35 CSS), encre (238,241,242) | **oui** — il ne recouvre pas l'aile gauche (l'aile a été **déplacée**, voir ci-dessous) |
| référence de NUIT vs capture au quart de jour | — | palette restreinte au chrome et à la fiche, comme demandé | — |
| bloc ARGENT déplacé vers le centre | **à surveiller** | canon encre à x **16,00** ; jeu x **63,88** (barre de ratio) / 64,24 (libellé) ⇒ **+47,9 CSS**, soit **le double du +23,56 relevé au r5**. Sur la ligne de l'encre la plus à droite (y = 26,13 CSS) : dernier pixel plein du « € » à x=443 (**160,79 CSS**), bord à mi-amplitude à 444 (**161,16**), puis **8 pixels de bandeau intact** (161,52..164,06, couleur constante), premier pixel du halo du cerclage à x=453 (**164,42 CSS**) ⇒ **dégagement 2,90 CSS** (`m47`, coupe imprimée) | **oui, de justesse** — il ne touche pas. Deux chiffres de plus au montant le font sortir de l'assumé |

## Table à part — ARBITRAGES (non comptés avec les findings)

| point | mesure | pourquoi ce n'est pas un défaut du client |
|---|---|---|
| famille de police du chrome | référence rendue en **Noto Sans** (`body{font:…"Segoe UI",Roboto,system-ui}` → `fc-match` du dossier) ; client en **DejaVu Sans**. Chasses à **×1,00–1,02**, capitales à **×1,075–1,090** | métrique de police, pas d'échelle — cf. la section « chrome ×1,19 » |
| famille de police des serifs | référence : `font-family:Georgia,serif` sur **7 règles** de la source (titre de fiche, montant, heure, `heatpct`, `stats b`) → **Noto Serif** ; client **DejaVu Serif** | `Georgia` n'a jamais été montrée à personne |
| titre de fiche pleine largeur, casse mixte | « Réparation Ilm — La Lisière, îlot 1501, n° 2 » (329,21 CSS) contre « LE VERGE D'OR » (141,33) ; **centré** dans les deux cas (195,8 contre 195,0) | contenu composé par le back |
| libellés anglais de la RÉFÉRENCE (`HEAT`, `$ 24 850`, `21:40`) | le client rend `CHALEUR`, `9 627 820,00 €`, `Aube` | ruling « fr réel » — **maquette à mettre à jour**, noté une fois |
| ronds du dock sans icône | 0 px d'encre à l'intérieur des 4 disques | ARBITRAGE ouvert (« j'aime pas les icônes ») |

---

## 5. Autres résolutions

- **1080×2400 (cible)** — l'inventaire tient. Le chrome est **bit-identique** entre les deux planches
  2400 (0 pixel différent pour y < 339,7 CSS). La fiche est ancrée au bas : haut à **599,61 CSS**
  (871,1 − 599,61 = 271,5 du bas, contre 270,2 au canon), largeur **368,22**, titre à **19,97 CSS**
  du filet et blanc de **11,25** — identiques au 1920 en valeur CSS. Rien de coupé, rien hors cadre,
  gouttière respectée. **Écarts propres à cette résolution** : `F21` (bande unie de 34,85 CSS en haut)
  et `F10` (le nom de district tombe sur le ciel ⇒ 1,99:1 ; à 1920 il tombe sur une silhouette et
  rend 7,74:1).
- **1080×1920 (native de l'art)** — l'inventaire tient également. **Écart propre** : `F20`, les
  libellés du dock à **4,05:1** parce que l'art (l'eau, L≈126) traverse le voile du dock (L 79 à la
  hauteur des libellés) ; à 2400 le même libellé rend 7,92:1 parce que le fond déclaré est derrière.
  Le bandeau y est aussi nettement plus clair (L moyenne **65,8** contre **30,2** à 2400 et **31,5**
  au canon) : l'art de jour traverse la plaque du bandeau.
- **Pas de troisième résolution, pas de planche « district seul » à 1920** : le comportement de la
  bande unie `F21` à 1920 n'est pas testable (l'art y est natif, il n'y a pas de bande).

---

## 6. Ce que je n'ai pas pu vérifier

1. **L'identité photographiée.** Le dossier annonce `régime=env`, compte `demo_capture@example.test`,
   **mais il ne cite pas** la ligne `[DemoIdentityResolver] régime=env identité=…` du journal — il dit
   même « log non préservé ». Par sa propre doctrine, **toute comparaison de VALEUR va en non
   vérifié** : le montant, `JOUR 50`, `Aube`, `Brûlant`, le nom du bâtiment, les trois bandes, le nom
   du district. Les **formes** ci-dessus sont jugées ; les valeurs ne le sont pas. *Mesure qui
   trancherait : la ligne du journal, ou son sidecar.*
2. **Animation.** Aucune paire T / T+1 s n'est fournie ⇒ le ruling « aucune animation sur un nouvel
   écran » est **non vérifié**. *Mesure : deux captures du même état à 1 s d'intervalle, compte des
   pixels différents hors chrome hérité.*
3. **`F18` — corps du titre de fiche fixe ou auto-réduit ?** Le titre remplit 99,2 % de la largeur
   disponible et perd 18 % de capitale ; le dossier affirme « pas d'auto-réduction ». *Mesure : une
   planche avec un nom de bâtiment COURT — si la capitale remonte à ~10,7, il y a auto-réduction.*
4. **`F16` — piste de la barre de ratio absente, ou ratio à 100 % ?** *Mesure : une planche à ratio
   < 100 %, ou un balayage de `#5a6376` (90,99,118) dans le bandeau.*
5. **Opacité de la plaque du bandeau.** À 1920 l'art de jour la fait passer de (16,21,31) à
   (53,59,69) : je ne peux pas dire si le canon ferait pareil, sa référence étant de nuit. *Mesure :
   une capture au quart de NUIT, ou l'opacité déclarée de la plaque.*
6. **`F14` — aiguille du canon.** Non isolable dans l'image (le « 37% » est de la même crème et la
   croise). La valeur canon vient de la **source SVG** (`line x1=30 y1=34 x2=30 y2=12`, échelle 0,7),
   recoupée avec le 15,83 du r5, pas de l'image.
7. **`F02` — nature du recouvrement de 26°** entre teal et braise : dégradé de raccord ou deux arcs
   superposés ? *Mesure : l'asset source du cadran, ou une capture à zoom supérieur.*
8. **La bit-exactitude de l'art de district** (déclarée par le dossier) n'a pas été re-vérifiée : je
   n'ai pas l'art natif dans le dossier.
9. **Les grandeurs du r5 que je n'ai pas rejouées** : largeur et écarts des **trois** boutons
   (je n'ai mesuré que le bouton OR, qui est le seul dont les bords soient assertables sans ambiguïté),
   et le détail des **13 contrastes** de textes du r5 (j'en ai mesuré 7).
10. **La cause du chrome ×1,19 du r5** reste hors de portée d'une image : je constate seulement qu'il
    **n'est pas là** sur ces planches, sur 9 grandeurs. La sonde `[CHROME-CAPTURE]` du journal, non
    fournie, est ce qui dirait laquelle a bougé.
11. **Une seule planche par état** : aucun écart mesuré ici n'est distingué d'un aléa de run.

---

## Annexes

### Annexe 3 — Correspondance des repères

| | référence | captures |
|---|---|---|
| échelle | 1176 px = 392 CSS ⇒ **÷3,0** | 1080 px = 392 CSS ⇒ **÷2,7551** |
| origine | (0,0) de l'image = (0,0) CSS du `.tel` | (0,0) de l'image = (0,0) CSS de l'écran |
| centre du boîtier du médaillon (ajusté, `m13`) | px **(587,40 ; 116,52)** = CSS (195,80 ; 38,84), R(pic) = **93,21 px = 31,07 CSS**, résidu médian **0,23 px** | 2400 : px **(538,44 ; 109,68)** = CSS (195,44 ; 39,81), R = **90,18 px = 32,73 CSS**, résidu **0,74 px** · 1920 : px (538,55 ; 109,49) = CSS (195,47 ; 39,74), R = 89,93 px = 32,64 CSS, résidu 0,68 px |
| filet du bandeau (repère horizontal) | y **51,00..52,00 CSS** | y **50,09..51,90 CSS** |
| filet supérieur de la fiche (repère vertical du panneau) | y **426,67 CSS** | 1920 : **425,39** · 2400 : **599,61** |
| ligne des centres des ronds du dock | y **640,00 CSS** (px 1920) | 1920 : y **638,81** (px 1760) · 2400 : y **813,0** (px 2240) |

### Annexe 1 — Inventaire de la référence (couche globale)

| zone | L moyenne | L médiane | dominantes (part) |
|---|---|---|---|
| bandeau (y 0..51) | 31,5 | 23,3 | (18,25,36) 93,5 % · (83,91,95) 1,4 % · (177,167,144) 0,8 % · (49,55,68) 0,7 % · (175,140,61) 0,7 % · (241,200,106) 0,7 % |
| fiche (panneau) | 34,9 | 19,5 | (13,20,31) 89,4 % · (217,175,82) 4,3 % · (235,196,104) 1,3 % · (203,157,59) 1,0 % · (233,223,199) 0,8 % · (56,61,69) 0,7 % |
| dock (y 605..696) | 29,4 | 21,4 | (16,21,29) 88,9 % · (44,55,69) 2,2 % · (56,72,81) 2,0 % · (75,91,91) 1,8 % · (100,78,52) 1,4 % · (164,163,150) 0,8 % |

Fiches principales (géométrie du canon, recoupée sur l'image) : `.fiche` 366,00 × 169,19 à (13,00 ;
424,52) · `.dock` 390 × 90,17 à (1 ; 605,70) · `.rond` 46,00, cerclage 1,00, dégradé
`radial-gradient(circle at 38% 30%, #1d2635, #0d1420 65%)` · `.medaillon` 64,00, cerclage laiton 1,35
nominal / 0,98 cœur, lunette à 0,873 R · `.aile.gauche` 96 × 33,55 à (17 ; 10,22) · `.aile.droite`
97,95 × 26,31 à (277,05 ; 13,84) · `.ratio` 74 × 2, or 68 % + piste (90,99,118) · cadran : arc r=26
(SVG 60×40 à ×0,7), stroke 3,5 SVG = 2,45 CSS, pivot r=2,6 SVG = 3,64 CSS à 0,150 R **sous** le
centre du boîtier, aiguille 22 SVG = 15,40 CSS.

### Annexe 2 — Inventaire de la capture (couche globale)

| zone | L moyenne | L médiane | dominantes (part) |
|---|---|---|---|
| bandeau 1920 | 65,8 | 61,4 | (53,59,69) 48,0 % · (59,67,77) 32,5 % · (23,28,39) 8,5 % · (76,78,83) 5,2 % · (160,106,77) 1,8 % · (216,172,80) 1,0 % |
| bandeau 2400 | 30,2 | 20,7 | (16,21,31) 92,8 % · (159,100,55) 1,2 % · (216,171,79) 1,0 % · (241,200,105) 1,0 % · (180,169,144) 0,7 % · (233,224,202) 0,7 % |
| fiche 1920 | 37,3 | 19,5 | (14,20,31) 88,8 % · (216,176,83) 4,5 % · (235,196,103) 1,3 % · (203,157,59) 1,0 % · (233,223,199) 0,8 % · (53,59,70) 0,7 % |
| dock 1920 | 78,4 | 81,1 | (49,79,94) 18,4 % · (74,119,138) 15,6 % · (82,132,153) 14,8 % · (23,36,48) 13,5 % · (54,87,103) 12,8 % · (18,26,39) 10,9 % |
| dock 2400 | 34,8 | 28,2 | (23,28,39) 93,0 % · (84,135,157) 4,5 % · (85,85,85) 1,3 % · (180,168,142) 0,4 % |

**Parties EN TROP par rapport à la maquette** : bouton RETOUR (assumé), nom de district (assumé),
bande unie haute à 2400 (`F21`). **Parties ABSENTES** : volutes ×2 (`F17`), trait d'onglet actif et
pastille du dock (`F09`), lunette du médaillon (`F05`), segment neutre de l'arc (`F02`), piste de la
barre de ratio (`F16`), icônes des ronds (assumé).

### Annexe 4 — Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre. `lib.py` (échelles, luminance,
contraste WCAG, médiane de fenêtre) · `m01`–`m03` capitale d'ARGENT (m03 = sous-pixel + contrôle
positif) · `m04`,`m05`,`m07`,`m08` ronds du dock · `m06` dock à 2400 · `m09` libellés du dock ·
`m10`–`m14` médaillon (masque doré, ajustement de cercle par moindres carrés, profils radiaux) ·
`m15`,`m16` arc (classes de couleur, secteurs, épaisseurs) · `m17` modèle de mélange sRGB/linéaire ·
`m18` fond du cadran par secteurs · `m19`–`m21` pivot · `m22`–`m24` fiche et tête de fiche ·
`m25`,`m26` filet et barre de ratio · `m27`,`m28` ailes · `m29`,`m30` dégagement ARGENT ↔ médaillon ·
`m31`,`m32` volutes et indicateur d'onglet · `m33`,`m34` contrastes · `m35`,`m36` libellés du
manomètre · `m37`,`m38` bas de fiche et boutons · `m39` bandes à 2400 · `m40`,`m41` aiguille · `m42`
palette · `m43` voile du dock · `m44` cohérence entre résolutions · `m45` couleur du filet · `m46`
séparateurs de stats · `m47` dégagement ARGENT ↔ médaillon (coupe imprimée) · `m48` indicateur d'onglet actif (capacité + forme).

Sorties **exécutées et collées** : `mesures/sorties.txt` (994 lignes, 32 scripts, chacun
réimprimant la taille des images qu'il ouvre).

**Instruments réfutés en cours de route, conservés comme mise en garde** :
- `m17a` (4 sondes à deux rayons différents) rendait une amplitude de **(11,13,14)** sur le fond du
  cadran — mélanger deux rayons **fabrique** l'amplitude ; à rayon constant (`m18`) elle vaut
  **(1,1,2)**. La conclusion « le fond n'est plus plat » aurait été fausse.
- `m29` mesurait un dégagement ARGENT ↔ médaillon de **−1,09 CSS** : la sonde attrapait le
  **cerclage** faute d'exclure le disque. Corrigée (`m30`), elle rend ≈ **+2,3 CSS**.
- `m35` donnait aux libellés du manomètre une couleur **bleutée** (236,254,255) : la fenêtre débordait
  du médaillon et échantillonnait les **nuages** de l'art. Masquée au disque (`m36`), la couleur est
  **(234,224,200)** — exactement `--creme`.
- `m31a` comptait 651 à 1173 px de « volute » sur les captures : seuil **relatif** appliqué à une zone
  **plate**. Repris en critère d'**amplitude** avec contrôle de capacité (`m32`).
