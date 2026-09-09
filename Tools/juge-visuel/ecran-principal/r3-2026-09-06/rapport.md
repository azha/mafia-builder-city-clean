# Juge visuel ⊥ — ① L'intérieur de district (« le HUD de Brennar ») — r3 — 2026-09-06

## Verdict : NON APPROUVÉ

Le chrome, le dock et la boîte de la fiche sont d'une fidélité remarquable — palette exacte au jeton
près, géométries au dixième de CSS — mais **la tête de la fiche s'effondre sur un nom long**
(titre sur 2 lignes, seconde ligne à 2,18 CSS du sous-titre là où le canon en met 11,0), **le
manomètre a changé de nature** (arc 2,5× plus épais, +43 % de rayon) et **le bloc argent a quitté
le bord gauche pour venir à 13 CSS du médaillon**.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les valeurs sont ramenées en px CSS (÷3,0 sur la référence, ÷2,755 sur les captures).

| # | grandeur | référence | jeu | écart | script |
|---|---|---|---|---|---|
| 1 | largeur du panneau `.fiche` | 368,00 CSS (attendu 366 + 2 d'anti-crénelage) | 368,06 | **0,06** | `m15` |
| 2 | hauteur du panneau `.fiche` | 169,19 (mesure-canon) | 168,42 (1920) | 0,77 | `m15` |
| 3 | bas de la barre (filet laiton) | y 51,00..51,67 | y 50,09..51,54 | 0,5 | `m02b` |
| 4 | couleur du filet laiton (canon) | (176,141,62) = `--laiton` **exact** | — | contrôle | `m02b` |
| 5 | ronds du dock — diamètre | 46,0 (CSS) | 45,74 / 45,37 / 45,37 / 45,74 | ≤ 0,63 | `m23` |
| 6 | ronds du dock — centres | 94 / 162 / 230 / 298 | 94,01 / 162,07 / 229,95 / 298,00 | ≤ 0,07 | `m23` |
| 7 | centres des libellés du dock | 93,3 / 161,2 / 229,3 / 297,5 | 93,8 / 162,1 / 230,1 / 298,0 | ≤ 0,9 | `m23` |
| 8 | séparateurs de stats (x) | 140,0 et 251,7 | 140,1 et 250,6 | ≤ 1,1 | `m20` |
| 9 | séparateurs — contraste | L 33-34 sur fond 18-19 | L 32-33 sur fond 16-18 | ≈ 0 | `m20` |
| 10 | centres des 3 cellules de stats | 84,5 / 196,2 / 308,0 | 84,05 / 195,1 / 305,65 | ≤ 2,4 | `m17` |
| 11 | bouton or — largeur | 103,33 | 104,54 | 1,21 | `m21` |
| 12 | bouton or — dégradé haut / bas | (232,196,106) / (203,156,58) | (231,194,102) / (203,157,59) | ≤ 4/255 | `m18` |
| 13 | bordure des boutons « ligne » | L = 62 sur fond 24 | L = 60 sur fond 25 | 2 | `m20` |
| 14 | `--or-vif` sur le titre de fiche | (242,201,107) | (242,201,106) | **1/255** | `m18` |
| 15 | `--creme` sur la 2ᵉ stat | (234,224,200) | (234,224,200) | **0** | `m18` |
| 16 | `--creme-2` sur les libellés de stats | (185,173,146) | (185,173,146) | **0** | `m18` |
| 17 | fond du panneau de fiche (6 sondes) | (15,23,37) → (9,15,25) | (14,22,34) → (8,14,24) | ≤ 3/255 | `m18` |
| 18 | fond de la barre (2 sondes) | (17,24,34) / (21,29,41) | (16,17,31) / (17,24,32) | ≤ 4/255 | `m02b` |
| 19 | filet haut de la fiche | y 426,67, (176,141,62) | y 425,41, (176,141,61) | 1,26 CSS | `m13` |
| 20 | centre du médaillon (x) | 195,83 | 195,83 | **0** | `m09` |
| 21 | hauteur de capitale, valeur aile droite | 10,00 | 10,16 | 0,16 | `m27` |
| 22 | hauteur de capitale, libellé de dock | 6,00 | 6,53 | 0,53 | `m27` |
| 23 | chasse EMPIRE / FAMILLE / PLUS | 35,67 / 40,67 / 23,33 | 37,02 / 41,38 / 23,59 | ≤ 1,35 | `m33` |
| 24 | ligne d'actions — largeur totale | 332,7 | 331,8 | 0,9 | `m20` |
| 25 | padding bas du panneau (actions → bord) | 15,0 | 15,25 | 0,25 | `m16` |
| 26 | bord droit de l'aile droite | 374,7 | 375,3 | 0,6 | `m04` |
| 27 | le filet laiton ne traverse pas le médaillon | intérieur sombre (15..26 L) | intérieur sombre (13..32 L) | — | `m09` |
| 28 | **sens du manomètre** : barycentre du teal / de la braise par rapport au moyeu | teal x = 185,9 · braise x = 209,4 (moyeu 196) | teal x = 182,0 · braise x = 209,5 | même côté | `m36` |
| 29 | **sens de l'aiguille** à « Brûlant » | CSS `rotate(-42)` = 42° à GAUCHE (côté teal) à 37 % | **58,5° à DROITE** de la verticale, pointe à r = 12,9 CSS dans l'arc braise | cohérent avec l'état chaud, **pas d'inversion** | `m36b` |
| 30 | gouttière 1080×2400 : fiche 600,7..769 dans 52..780,9 | — | respectée | — | `m25`,`m28` |
| 31 | gouttière 1080×1920 : fiche 426,5..594,9 dans 52..606,8 | — | respectée | — | `m14`,`m24` |
| 32 | rayon du bouton or (coin bas-gauche) | courbe résolue sur ≈5 CSS (r≈9) | ≈6,5 CSS (r≈9) | comparable | `m21b` |
| 33 | les deux captures 1080×2400 hors bande fiche | — | **1 pixel différent sur 221 760** | — | `m28` |

Contrôle négatif exécuté dans `m25` : au milieu de l'art, la dispersion de ligne vaut 211 (donc
l'instrument « bande unie » discrimine bien) — et dans `m19`/`m20`, la sonde de séparateur trouve
2 pics de 1 CSS sur le canon là où la CSS en pose exactement 2.

---

## 0. L'écran, tel que la maquette le dit

**But.** On est *dans* son quartier, la nuit. On vient (a) voir la ville vivante, (b) repérer un
bâtiment qui vaut quelque chose, (c) le toucher pour lire ce qu'il rapporte, (d) décider :
COLLECTER · BLANCHIR · AMÉLIORER.

**Ordre de lecture.** ① l'art — il occupe ~78 % de l'aire et c'est le seul endroit coloré ; ② la
fiche, plaque de verre sombre posée aux deux tiers bas, dont le titre or est le seul texte serif
de grande taille ; ③ le bouton or COLLECTER, unique aplat saturé de l'écran ; ④ le médaillon
central, disque brossé qui coupe la barre ; ⑤ le montant en or, seul chiffre coloré du bandeau ;
⑥ le dock, quatre disques gravés au repos.

**Zones.** barre de verre fumé (0–52 CSS) · art plein cadre · bandeau d'alerte éphémère (78–112) ·
fiche (424,5–593,7) · dock (605,7–695,9).

**Traits d'identité.** (1) *une seule* barre de verre fumé fermée par un filet laiton de 1 px ;
(2) le médaillon-montre au centre, qui déborde sous la barre et porte un cadran fin ;
(3) l'or réservé à l'argent — le montant est le plus gros texte de la barre (17 px contre 15 px
pour l'heure), et le seul autre or est le CTA ; (4) des micro-libellés en capitales très espacées
(0,14 à 0,22 em) ; (5) un rythme de fiche en trois temps : titre → trois cases chiffrées séparées
par des filets → trois boutons.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour l'essentiel, et de très près : les matières y sont. Le verre de la barre, le verre de la
fiche, l'or vif du titre, la crème, la crème-2, le dégradé du bouton or, les filets de séparation,
les quatre disques du dock — tout cela est mesuré **identique au jeton près** (33 grandeurs
ci-dessus, dont trois couleurs à 0/255 d'écart). Le squelette est juste : la fiche fait 366 × 169
CSS comme au canon, le dock est au demi-pixel.

Ce qui a bougé se voit sans côte à côte, et dans cet ordre.

**① La tête de la fiche.** Le titre du bâtiment fait maintenant 327,0 CSS pour 332 disponibles
(98,5 %) : il casse en deux lignes, et la deuxième (« 1501 ») tombe à **2,18 CSS** du sous-titre
(canon : 11,0). Le panneau, lui, garde sa hauteur : c'est donc l'espace du titre qui est mangé —
l'encre du titre démarre à 7,98 CSS du bord haut, *à l'intérieur* des 13 CSS de padding. Résultat :
le nom, l'îlot orphelin et l'état se lisent comme un seul pâté, là où le canon pose une plaque
courte et centrée avec 95 CSS de marge de chaque côté. C'est l'endroit exact où l'écran doit
répondre à « qu'est-ce que ce bâtiment ? ».

**② Le manomètre.** Le disque a grossi de 6 %, mais son anneau a **doublé** (1,33 → 2,90 CSS) et
son arc a **2,5× l'épaisseur** de la référence pour **+43 % de rayon** — l'arc occupe 70 % du rayon
du boîtier contre 52 %. La montre à gousset est devenue un compteur de vitesse. Le sens, lui, est
bon : froid à gauche, brûlant à droite, aiguille dans le rouge.

**③ Le bloc argent.** Il a quitté le bord gauche (+47,9 CSS) et vient buter à **13,1 CSS** du
médaillon là où le canon en laisse **88,0** ; et le montant a perdu 13,5 % de hauteur de capitale
pendant que la valeur de droite gardait la sienne. La hiérarchie « l'or réservé à l'argent » du
canon (montant ×1,133 par rapport à l'heure) s'inverse en ×0,965. Le haut de l'écran se lit
désormais « flèche · rien · argent+montre collés · jour », au lieu de « argent | montre | jour ».

**④ À 1080×2400 seulement**, une bande unie de 35,0 CSS s'intercale entre la barre et l'art, avec
une couture nette sur toute la largeur (L 37,9 → 64,6 en une ligne) : on lit un second horizon
faux sous le bandeau. À 1080×1920 l'art remplit et le défaut n'existe pas.

Le reste — crénage, indicateur d'onglet, volute droite, rouge de la 3ᵉ stat — ne change pas la
lecture ; c'est du côte-à-côte.

---

## 3. Écarts — un finding par ligne

Gravité : liste fermée `BLOQUANT` / `MAJEUR` / `MINEUR`. Les ASSUMÉS et les ARBITRAGES sont dans
des tables à part et ne sont pas comptés ici. Critère : **tous `NOUVEAU`** — les rapports r1/r2 ne
m'ont pas été fournis (choix du dossier), je ne peux donc affirmer d'aucun finding qu'il est
`DÉJÀ APPLIQUÉ`.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` | `NOUVEAU` | oui (nom long) — mais la forme ne réserve rien | La 2ᵉ ligne du titre de fiche colle au sous-titre : le titre et le type se lisent comme un seul bloc, et l'encre du titre déborde dans le padding haut du panneau | blanc ligne 2 → sous-titre : **2,18 CSS** (canon titre → sous-titre : **11,00**) ; encre du titre à rel **7,98** CSS du haut du panneau (canon **21,81**, padding CSS 13) ; hauteur du panneau inchangée (168,42 vs 169,19) ⇒ l'espace vient du rythme, pas de la boîte (`m16`) | si un nom court rétablit le rythme (aucune capture avec un nom court) |
| `F2` | `MAJEUR` | `NOUVEAU` | oui | Le titre remplit la largeur utile au lieu d'être une plaque centrée : 3,0 CSS de marge à gauche, 1,9 à droite | titre L1 x **33,0..360,1** (327,0 CSS) dans une zone de contenu de 332 → **98,5 %** ; canon 124,3..266,0 (**141,7**, soit 42,7 %, 95 CSS de marge de chaque côté) (`m17`) | idem F1 |
| `F3` | `MAJEUR` | `NOUVEAU` | en partie (montant long) | Le bloc argent est déplacé vers le centre et vient au contact du médaillon | libellé « ARGENT » x **16,3 → 64,2** CSS (**+47,9**) ; barre de ratio x 16,0 → 63,9 (**+47,9**) ; blanc valeur → anneau du médaillon **88,0 → 13,1 CSS** (−85 %) (`m06`,`m28`) | si le décalage vient de la flèche retour ou d'un autre parent — non décidable depuis l'image |
| `F4` | `MAJEUR` | `NOUVEAU` | non | Le montant perd 13,5 % de corps et passe SOUS la valeur de droite : la hiérarchie « l'or réservé à l'argent » s'inverse | hauteur de capitale du chiffre : **11,33 → 9,80** CSS (−13,5 %) ; valeur droite **10,00 → 10,16** (+1,6 %) ; rapport gauche/droite **1,133 → 0,965** (le canon impose 17 px à gauche, 15 px à droite, ratio 1,133 — retrouvé exactement) (`m27`) | corps nominal plus petit **ou** réduction automatique pour tenir : indécidable sans une capture à montant court |
| `F5` | `MAJEUR` | `NOUVEAU` | non | Le manomètre a changé de nature : anneau et arc beaucoup plus lourds, arc beaucoup plus grand | anneau **1,33 → 2,90** CSS (+118 %) ; épaisseur radiale de l'arc teal **2,33 → 5,81** (+149 %) ; rayon externe de l'arc **16,7 → 23,9** (+43 %) ; rapport rayon d'arc / rayon de boîtier **0,52 → 0,70** ; diamètre du boîtier **64,00 → 67,88** (+6,1 %) ; moyeu **3,67 → 4,72** (+29 %) (`m10`,`m12`) | l'alpha exact des arcs (la couleur mesurée ne se résout pas à un α unique de `#7fd4d955` : 0,56 / 0,59 / 0,74 selon le canal) |
| `F6` | `MAJEUR` | `NOUVEAU` | non | **1080×2400 uniquement** — bande unie entre le bandeau et l'art, avec une couture franche sur toute la largeur : second horizon faux | bande **(34,38,49)** de y **51,5 à 86,5** CSS = **35,0 CSS** (4,0 % de la hauteur d'écran) ; couture à y 86,5 → 87,0 : L **37,9 → 64,6** en une ligne ; l'art occupe **exactement les px 240 à 2159** (1920 rangées), soit 87,1..784,0 CSS, avec **240 px de panneau déclaré en haut ET 240 en bas** — (34,38,49) au-dessus, (33,37,48) en dessous : l'art est centré, pas ancré (`m25`,`m26`,`m35`) | rien à 1080×1920 : l'art y remplit (contrôlé, `m25`) |
| `F7` | `MINEUR` | `NOUVEAU` | non | L'indicateur d'onglet actif du dock est absent : combiné aux ronds vides (assumé), le dock ne porte plus aucun état | canon : barre laiton **14,00 × 2,00** CSS, couleur **(176,141,62)** exacte, centrée sur x 94 ; captures : **0 pixel laiton** dans la même fenêtre, aux 3 captures (`m24`) | si l'absence est voulue parce qu'on est *dans* un district (aucune source ne le dit — hors table des assumés) |
| `F8` | `MINEUR` | `NOUVEAU` | non | L'écart libellé → valeur est doublé dans **les deux** ailes ⇒ une seule cause | aile gauche : blanc **4,00 → 9,07** CSS (+127 %) ; aile droite : **3,67 → 7,98** (+117 %) ; conséquence : le libellé droit monte de **4,14** CSS (haut 14,67 → 10,53) et la barre de ratio descend de 2,16 (`m07`) | — |
| `F9` | `MINEUR` | `NOUVEAU` | non | Le crénage des micro-libellés du bandeau est divisé par ~2 — or c'est un trait d'identité de la DA (0,22 em) | sur la chaîne **identique** « JOUR » : chasse **26,67 → 21,10** CSS (−20,9 %) ; blanc inter-lettre **3,3 → 1,5** CSS. « ARGENT » : **42,00 → 38,48** (−8,4 %), blanc **3,06 → 1,52**. Les libellés du dock (0,16 em), eux, sont ÉGAUX ⇒ ce n'est pas un effet de police (`m32`,`m33`) | le mécanisme (tracking à 0, ou corps + tracking) n'est pas décidable depuis une image |
| `F10` | `MINEUR` | `NOUVEAU` | non | Le crénage des libellés de bouton est **+25 %**, et la graisse est plus lourde | BLANCHIR **68,33 → 74,41** CSS (+8,9 %), AMÉLIORER **78,00 → 85,66** (+9,8 %) ; blanc inter-lettre 2,62/2,75 → **3,27/3,36** ; hauteur de capitale ÉGALE (8,33 → 8,71) ; le « B » à mi-hauteur rend **un seul fût de 6,17 CSS** au lieu de 5,67 + 1,00 ⇒ contre-poinçon fermé (`m29`,`m33`) | si c'est la graisse 600 non disponible ou un letter-spacing différent : indécidable depuis l'image |
| `F11` | `MINEUR` | `NOUVEAU` | oui (l'état affiché) | La 3ᵉ stat n'utilise pas `--braise` : rouge saturé écrêté au lieu du corail du canon | canon **(224,102,74)** = `#e0664a` **exact** ; jeu **(255,90,77)** — Δ **(+31, −12, +3)**, R écrêté à 255 ; contraste sur le panneau 5,42:1 → 6,04:1 (`m18`,`m31`) | si le client réserve ce rouge à un état « endommagé » distinct du heat (aucune source) |
| `F12` | `MINEUR` | `NOUVEAU` | non | Hauteur de capitale du titre de fiche +15,7 % (contribue au débordement F1/F2) | **10,67 → 12,34** CSS ; hors tolérance sur les deux critères (> 1 px **et** > 5 %) (`m27`) | — |
| `F13` | `MINEUR` | `NOUVEAU` | non | La volute décorative **droite** du bandeau est absente (la gauche est couverte par l'assumé « flèche retour ») | canon x 376..390 / y 16..38 : **132 px** d'encre, max L = 82 sur fond L = 23,5 ; captures : **0** pixel au-dessus du fond + 10, aux 3 captures (`m34b`) | impossible de juger la volute **gauche** séparément : la flèche retour occupe la même zone |
| `F14` | `MINEUR` | `NOUVEAU` | non (position/corps) | Le nom du district est le plus petit texte de l'écran, collé au bord et posé **à cheval sur la couture** de F6 | capitale **5,08** CSS (tous les autres micro-libellés : 6,53) ; x **5,1**..38,8 (aucun autre élément ne descend sous 12 CSS du bord) ; y 87,48..92,56, la couture étant à 87,0 ; contraste **10,36:1** ✓ lisible (`m26`) | — |
| `F15` | `MINEUR` | `NOUVEAU` | non | Le fond du boîtier du médaillon est moins bleu que la référence | canon (22,31,45) et (18,26,40) ; jeu (18,23,33) — Δ jusqu'à **(4, 8, 12)**, le canal B hors tolérance 6/255 (`m28`) | l'état « chaud » du compte peut teinter le boîtier (le canon en état chaud n'est pas fourni) |

**Compte : 15 findings — 1 BLOQUANT, 5 MAJEURS, 9 MINEURS.**

---

## Table à part — écarts ASSUMÉS (vérification « rendu proprement »)

| assumé (dossier) | rendu proprement ? | mesure |
|---|---|---|
| les 3 chiffres de la fiche remplacés par des bandes | **oui** — 3 cases, aucune vide, aucun scalaire, position et rôle gardés | centres 84,05 / 195,1 / 305,65 (canon 84,5 / 196,2 / 308,0) ; séparateurs à 140,1 et 250,6 (canon 140,0 et 251,7) ; couleurs de rôle conservées : or vif / crème / rouge (`m17`,`m18`,`m20`). Réserve : « Endommagé » occupe 89,3 CSS dans une cellule de 110,7 → 10,7 CSS de marge, la plus étroite des trois |
| le nom du bâtiment remplacé par son type | **assumé PÉRIMÉ** — le nom EST là (« Soudure Varne »), pas de clé brute | mais il est concaténé avec le district et l'îlot (« — La Lisière, îlot 1501») ⇒ c'est ce qui produit F1/F2 |
| le nom du district affiché | **oui** pour le contenu — « La Lisière », pas un slug, pas un identifiant | mais sa taille et sa position ne sont pas couvertes par l'assumé ⇒ F14 |
| l'heure remplacée par le quart du jour | **oui** — « Nuit », français, non vide | l'aile droite garde son gabarit : libellé « JOUR 37 » + valeur, bord droit à 375,3 CSS (canon 374,7) |
| libellés du dock ACCUEIL · FAMILLE · FILIÈRE · PLUS | **assumé partiellement PÉRIMÉ** — le rendu est **EMPIRE** · FAMILLE · **FILIÈRE** · PLUS, donc plus proche du canon que l'assumé ne le disait | 4 onglets (pas de 5ᵉ), aucun libellé coupé, casse uniforme, centres à ≤ 0,9 CSS du canon (`m23`) |
| ronds du dock vides | **oui** — 4 disques, bordure présente, aucun résidu d'icône | Ø 45,4–45,7 CSS (`m23`). ARBITRAGE ouvert, reporté tel quel |
| bouton RETOUR en haut à gauche | **la clause de sortie écrite est respectée** (il ne *recouvre* pas l'aile gauche) | flèche x 29,8..38,1 ; aile gauche commence à 64,2 ⇒ pas de recouvrement. **Mais** il l'a *déplacée* de +47,9 CSS, ce que la colonne de sortie ne prévoyait pas ⇒ F3 |
| référence de nuit, capture au quart du compte | **respecté par le protocole** : je n'ai comparé que chrome + fiche + dock | palette globale et luminance moyenne non comparées, comme demandé |

---

## Table à part — ARBITRAGES (non corrigeables côté client, ou à trancher par l'user)

| sujet | mesure | pourquoi c'est un arbitrage |
|---|---|---|
| **Format monétaire** | canon `$ 24 850` (préfixe, espace fine, sans centimes) ; jeu `406 653,08 €` (suffixe, virgule décimale, 2 décimales) — 12 glyphes contre 8 | change la fiction et allonge la chaîne de moitié, ce qui contribue à F3/F4. À trancher produit, pas au pixel |
| **Le manomètre affiche une bande, pas un pourcentage** | canon « 37% » (capitale ≈ 9-10 CSS) + « HEAT » (5,00 CSS, 21,0 de large) ; jeu « Brûlant » (capitale 6,90, 37,7 de large) + « CHALEUR » | même classe que l'assumé n° 1 (R2.2, jamais de scalaire en projection joueur) — **mais absent de la table des assumés**, donc à y inscrire ou à corriger. Le médaillon perd son point de fixation numérique |
| **Ronds du dock sans icône** | 4 disques vides | ARBITRAGE déjà ouvert au dossier (« j'aime pas les icônes »), reporté tel quel |
| **Police sérif** | `fc-match Georgia` → Noto Serif a rendu la référence ; le client embarque DejaVu Serif | écart de FAMILLE ⇒ arbitrage. Contrôlé : la hauteur de capitale de la valeur droite est ÉGALE (10,00 → 10,16), donc l'écart de corps du titre de fiche (F12, +15,7 %) **n'est pas** imputable à la police |
| **Les 3 grandeurs de la fiche ont changé de sens** | canon : À COLLECTER / REVENUS / HEAT LOCAL ; jeu : REVENU / CHAÎNE / ÉTAT | les cases gardent position et rôle (assumé n° 1 tenu), mais ce ne sont plus les mêmes informations : question produit, pas défaut de rendu |
| **Le sous-titre porte un ÉTAT, pas un TYPE** | canon « BAR · QUARTIER GÉNÉRAL » ; jeu « OPÉRATIONNEL » | idem : question produit |

---

## Table à part — observations qui dépendent des DONNÉES (datées du 2026-09-04, compte `operational_demo`)

| observation | mesure | lecture |
|---|---|---|
| Bandeau d'alerte éphémère absent | canon `.bandeau-alerte` 390 × 33,81 CSS à y 79 avec texte centré ; captures : rien entre 52 et 86,5 CSS, seulement la bande unie de F6 | pas de notification dans le compte photographié ⇒ non imputable au rendu |
| Pastille de notification du dock absente | canon : disque or `(217,171,78)` de ~5,4 CSS mesurés au coin haut-droit du rond FAMILLE ; captures : **0** pixel or (`m24`) | idem |
| Barre de ratio remplie à 100 % | canon `width:68%` → or de x 16,0 à 66,3 = **50,3 CSS** sur 74 (exactement 68 %) ; jeu or de 63,9 à 137,9 = **74,0 CSS** = 100 % | soit la donnée vaut 100 %, soit la barre n'a pas de sémantique : indécidable sur une seule capture |
| Filet laiton et anneau orangés | filet (176,141,62) → **(200,126,66)** ; anneau (176,141,62) → **(169,106,58)** | la CSS du canon prévoit exactement ce virage vers `--braise` en état `.chaud`, et le compte est à « Brûlant » ⇒ **conforme en intention**, pas un défaut |
| Marqueurs de bâtiments sur l'art | petits disques or répartis sur les toits | aucun équivalent au canon (qui est un gros plan héros) ⇒ non comparable, comme l'impose le dossier |

---

## 5. Autres résolutions

| résolution | tient / écarts propres |
|---|---|
| **1080×1920** (native de l'art, fiche ouverte) | **Tient.** L'art remplit le cadre, aucune bande unie (`m25`). Fiche à 426,50..594,92 CSS, dock à 604..697 : gouttière respectée. Rien de coupé, rien hors cadre : l'élément le plus à droite est l'aile droite à 375,3 CSS sur 392 ; le plus à gauche est le nom du district à 5,1 CSS |
| **1080×2400** (cible, district seul **et** fiche ouverte) | **F6 est propre à cette résolution** : bande unie de 35,0 CSS sous le bandeau, couture franche à 86,5 CSS, et 87,0 CSS de panneau en bas (recouvert par le dock à 3 CSS près). Tout le reste reflue correctement : les deux captures 2400 rendent des positions **identiques au dixième de CSS** à celles de la 1920 dans le repère du panneau de fiche (bandes rel 7,98 / 27,58 / 41,74 / 68,24 / 89,65 / 113,61 — **byte-identiques**, `m16`), donc la mise en page n'est pas un recadrage mais un vrai reflux qui conserve l'ordre de lecture et les proportions |
| **district seul vs fiche ouverte à 1080×2400** | identiques pixel à pixel hors la bande de la fiche : **1 échantillon différent sur 221 760** (`m28`). Ouvrir la fiche ne déplace rien d'autre |

---

## 6. Ce que je n'ai pas pu vérifier

1. **Animation.** Aucune paire T / T+1 s n'est fournie ; le dossier le dit. Ce que je peux dire :
   les deux captures 1080×2400 sont identiques hors fiche à 1 pixel près sur 221 760 échantillonnés
   — ce n'est **pas** une preuve d'absence d'animation (rien ne dit que ces deux images sont à des
   instants différents), seulement la preuve qu'elles sont comparables.
   ⇒ *Mesure qui trancherait* : deux captures du même état à 1 s d'intervalle, comptage des pixels
   qui bougent, chrome hérité exclu et nommé.
2. **Comparaison aux tours précédents.** r1 et r2 ne m'ont pas été fournis (choix du dossier).
   Aucun finding ne peut donc être classé `DÉJÀ APPLIQUÉ` : tout est `NOUVEAU` au sens du critère.
3. **Le rect imprimé par le test** n'est pas préservé. J'ai donc **contrôlé l'échelle sur l'image**
   avant de m'en servir : ronds de dock à 45,4-45,7 CSS pour 46 attendus, panneau de fiche à
   368,06 px CSS pour 366 + anti-crénelage, bas de barre à 51,5 CSS pour 52. L'échelle ×2,755 du
   dossier tient.
4. **Le corps de la valeur d'argent (F4).** Je ne peux pas distinguer « corps nominal plus petit »
   de « réduction automatique pour tenir » depuis une seule capture.
   ⇒ *Mesure qui trancherait* : une capture avec un solde court (p. ex. 4 chiffres).
5. **Le rythme de la fiche avec un nom court (F1/F2).** Aucune capture ne montre un bâtiment au nom
   court. ⇒ *Mesure qui trancherait* : une capture d'un bâtiment dont le titre tient sur une ligne.
6. **La volute gauche.** Elle occupe la même zone que la flèche retour ; je n'ai pas pu juger son
   absence séparément. Seule la **droite** est mesurable, et elle manque (F13).
7. **Le losange du médaillon de référence** et **l'extrémité droite du filet haut de la fiche** :
   masqués par les call-outs d'annotation du canon (`.co`, disques or de 22 CSS, `z-index:6`) et par
   les deux boutons de démonstration (`.bascule` 🌙 à y 120, `.chaudb` 🔥 à y 170). Le losange en jeu
   existe (laiton (176,141,61), 6,17 CSS sur l'axe, y 78,04..84,21) mais n'a pas de témoin.
8. **L'alpha des arcs du manomètre.** La couleur mesurée en jeu ne se résout pas à un α unique de
   `#7fd4d955` sur le fond du boîtier (0,742 / 0,593 / 0,562 selon le canal) : le jeton de l'arc
   diffère aussi, pas seulement sa géométrie. Je donne les couleurs mesurées, pas un α.
9. **Espace de mélange sRGB / linéaire.** Je l'ai cherché et **je ne le trouve pas sur cet écran** :
   quatre translucidités indépendantes composent à l'identique (bordure `#ffffff2a` L 62 → 60 ;
   séparateur `#ffffff10` L 33 → 32 ; fond de fiche Δ ≤ 3/255 ; fond de barre Δ ≤ 4/255). Il n'y a
   donc pas d'erreur de modèle systématique ici — et l'écart du manomètre n'en relève pas.
10. **L'état du compte.** Les planches datent du 2026-09-04 ; le compte a pu être recréé depuis
    (un gate E2E le purge). Toute la table « dépend des DONNÉES » est datée à ce titre.
11. **Un seul état capturé pour le district seul** (1080×2400) — pas de 1080×1920 sans fiche.
12. **Le mécanisme des écarts de crénage** (F9, F10) n'est pas décidable depuis une image ;
    `fc-match` a déjà écarté la piste « famille de police » puisque les libellés de dock, à la même
    famille et à la même casse, sont égaux.

---

## Annexes

### 1. Inventaire de la référence (`ecran-canon.png`, 1176 × 2091, ×3,0)

**Chrome — `.barre`** : 0..52,0 CSS, verre fumé (17,24,34) en haut → (21,29,41) en bas, fermé par un
filet `--laiton` (176,141,62) de **1,00 CSS**, en dégradé (>50 % de 40,7 à 351,3 CSS).
- `.volute.g` / `.volute.d` : traits crème, opacité .28, ~132 px d'encre chacun, x 4..38 et 354..388.
- `.aile.gauche` (17 ; 10,22 · 96 × 33,55) : libellé « ARGENT » capitale **6,00**, x 16,3..58,0, blanc
  inter-lettre 3,06 ; valeur « $ 24 850 » `--or-vif` (242,201,107), capitale **11,33**, x 16,7..77,3 ;
  `.ratio` 74 CSS dont **50,3 en or** (68 %), 2,00 d'épaisseur, y 40,67..42,67.
- `.medaillon` (164 ; 8 · 64 × 64) : anneau laiton **1,33**, boîtier (22,31,45)→(18,25,39) ; cadran —
  arc teal (68,101,112) épaisseur radiale **2,33**, rayon externe **16,7**, arc braise (132,70,61) ;
  aiguille crème ; moyeu laiton **3,67** ; « 37% » crème x 184,7..207,7 ; « HEAT » `--creme-2`
  (185,173,146), capitale **5,00**, 21,0 de large ; losange masqué par le call-out ②.
- `.aile.droite` (277,05 ; 13,84 · 97,95 × 26,31) : « JOUR 12 · SOIRÉE » capitale **7,33**
  (accent É à 12,67), chasse de « JOUR » **26,67** ; « 21:40 » crème (234,224,200), capitale **10,00**
  (le canon impose 15 px ici contre 17 px à gauche).
- `.bandeau-alerte` (1 ; 79 · 390 × 33,81) : bandeau sombre à dégradé horizontal, texte crème + or.

**`.fiche`** (13 ; 424,52 · 366 × 169,19) : verre (15,23,37) en haut → (9,15,25) en bas, filet laiton
en tête à y 426,67. Titre `--or-vif` capitale **10,67**, x 124,3..266,0 (141,7 de large, centré sur
195,2) ; sous-titre `--creme-2` capitale **6,33**, x 122,3..268,7 ; 3 cases centrées sur 84,5 / 196,2 /
308,0, séparateurs de 1 CSS à 140,0 et 251,7 (L 34 sur fond 18) ; valeurs capitale **11,67**, couleurs
or vif / crème / `--braise` (224,102,74) ; libellés capitale **6,00** ; 3 boutons de 332,7 CSS au total,
COLLECTER en or (232,196,106 → 203,156,58) 103,33 de large, rayon 9, les deux autres bordés `#ffffff2a`
(L 62) ; texte de bouton capitale **8,33**, chasse BLANCHIR **68,33**.

**`.dock`** (1 ; 605,70 · 390 × 90,17) : 4 ronds de 46 CSS, centres 94 / 162 / 230 / 298, icônes 20 × 20 ;
pointe active laiton **14,00 × 2,00** sous EMPIRE ; pastille or au coin du rond FAMILLE ; libellés
`--creme-2` capitale **6,00**, chasses 35,67 / 40,67 / 40,4 / 23,33, contraste 8,43:1.

**Couche globale (chrome + fiche uniquement, comme imposé)** : encres `--or-vif`, `--creme`,
`--creme-2`, `--laiton`, `--braise`, `--cyan` ; fonds entre L 9 et L 24 ; contrastes de texte mesurés
8,02 · 11,31 · 7,94 · 13,28 · 11,61 · 8,31 · 11,62 : 1.

**Non-UI présent dans la référence** : 6 call-outs `.co` (disques `--or` de 22 CSS, `z-index:6`) et les
deux boutons de démonstration `.bascule` / `.chaudb` — ce sont des annotations de la maquette, pas des
parties d'écran ; leur absence en jeu n'est pas un écart.

### 2. Inventaire de la capture (1080 × 2400 et 1080 × 1920, ×2,755)

Identique dans la structure ; ne sont listés que les champs qui diffèrent des fiches ci-dessus.
**Chrome** : filet laiton **1,81** CSS, (200,126,66) [état chaud] ; flèche retour x 29,8..38,1 ;
aile gauche décalée à x 64,2..149,5, libellé capitale **6,53** blanc inter-lettre **1,52**, valeur
capitale **9,80**, ratio **74,0 CSS entièrement or** ; médaillon Ø **67,88**, anneau **2,90**,
(169,106,58), boîtier (18,23,33), arc teal (102,140,143) épaisseur **5,81** rayon externe **23,9**,
moyeu **4,72**, « Brûlant » crème capitale **6,90** (37,7 de large), « CHALEUR » `--creme-2`, losange
laiton 6,17 sur l'axe ; aile droite « JOUR 37 » capitale **7,26** haut à **10,53**, « Nuit » capitale
**10,16** ; **pas de volute droite** ; **pas de bandeau d'alerte** ; « La Lisière » capitale **5,08**
à x 5,1, y 87,48..92,56.
**Bande unie** (34,38,49) de 51,5 à 86,5 CSS **à 1080×2400 seulement** ; art des px 240 à 2159 (87,1 à 784,0 CSS) ; seconde couture en bas à 784,0 CSS — (34,74,97) → (33,37,48) — mais elle tombe DANS le dégradé du dock (qui commence à 778,1) et se lit comme le bas de l'image.
**Fiche** : panneau 368,06 × 168,42, mêmes couleurs de fond à ≤ 3/255 ; titre sur **2 lignes**
(L1 x 33,0..360,1 capitale **12,34** ; L2 « 1501 » x 174,6..217,1) ; sous-titre à **2,18** CSS de la
L2 ; 3 cases aux mêmes centres, séparateurs à 140,1 / 250,6 ; 3ᵉ valeur **(255,90,77)** ; boutons
identiques en boîte, texte **+9 %** de chasse et contre-poinçon fermé.
**Dock** : 4 ronds vides Ø 45,4-45,7 aux mêmes centres ; **pas de pointe active**, **pas de pastille** ;
libellés EMPIRE · FAMILLE · **FILIÈRE** · PLUS, capitale **6,53**, contraste 6,49-8,4:1.

### 3. Correspondance des repères

| | px de l'image | CSS | facteur | contrôlé sur l'image par |
|---|---|---|---|---|
| `ecran-canon.png` | 1176 × 2091 | 392 × 697 | **×3,0** | filet de barre à 51,00 CSS pour 52 ; `.fiche` 368,00 px CSS pour 366 + 2 |
| captures 1080×1920 / 1080×2400 | 1080 | 392 | **×2,755** | ronds de dock 45,37-45,74 pour 46 ; `.fiche` 368,06 pour 366 + 2 ; bas de barre 51,54 pour 52 |

Repère vertical des mesures de fiche : **origine = haut du panneau** (canon 424,52 ; 1920 426,50 ;
2400 600,73), noté « rel » partout. Repère horizontal : origine = bord gauche de l'écran.
Aucune mesure de ce rapport n'est faite en px bruts.

### 4. Scripts

Tous dans `mesures/`, tous impriment la taille des images qu'ils ouvrent.

| script | grandeur |
|---|---|
| `lib.py` | luminance, luminance relative, contraste WCAG, bbox d'encre, médiane de fenêtre |
| `m01_reperes.py` | repérage du filet laiton + contrôle négatif « ligne d'art non unie » |
| `m02_filet_barre.py` / `m02b_filet_barre.py` | filet de barre : extension, épaisseur, couleur, dégradé (m02b corrige la fenêtre en x, contaminée par la barre de ratio dans m02) |
| `m03..m07` | segmentation de la barre : groupes de colonnes, bandes de lignes, bbox serrées |
| `m08..m10` | médaillon : cercle de l'anneau, traversée du filet, runs sur l'axe |
| `m11b_cadran.py`, `m12_arc_bbox.py` | cadran : rayons, épaisseur radiale, couleurs, aires |
| `m13..m15` | rectangle de la fiche (m15 = version par comptage, la seule fiable) |
| `m16`, `m17` | rythme vertical et géométrie horizontale internes à la fiche |
| `m18`, `m19`, `m20`, `m21`, `m21b` | couleurs, variance de fond, séparateurs, bordures, rayon du bouton or |
| `m22`, `m23`, `m24` | dock : bandes, ronds, pointe active, pastille, fond |
| `m25`, `m26` | bandes unies vs art, couture, lisibilité du nom de district |
| `m27`, `m29`, `m31` | hauteurs de capitale, textes du médaillon, graisse de bouton, contrastes |
| `m28` | fond du boîtier, écart argent↔médaillon, bas de fiche à 2400, diff des deux captures 2400 |
| `m30` | contrastes texte/fond sur fond réel |
| `m32`, `m33` | chasse comparée sur chaînes **identiques** (JOUR, ARGENT, EMPIRE, FAMILLE, PLUS, BLANCHIR, AMÉLIORER) |
| `m34b_volutes.py` | volutes décoratives, fenêtres nettoyées de tout texte |
| `m36`, `m36b_aiguille.py` | côtés des arcs et angle de l'aiguille (`m36` est contaminé par le texte du médaillon ; `m36b` borne au-dessus du moyeu et fait foi) |
| `m35_bas_art.py` | bords haut et bas de l'art à 1080×2400, ligne par ligne |

Les vues de travail (recadrages, côte-à-côte) sont dans `mesures/vues/`.

**Sorties collées** : `mesures/sorties.txt` — les 41 scripts rejoués d'affilée, 1 184 lignes,
chacun précédé de `########## <script>.py` et imprimant la taille des images qu'il ouvre.

> Réserves d'instrument, écrites ici parce qu'elles ont failli produire de fausses conclusions :
> `m02` mesure le filet dans une fenêtre en x qui attrape la barre de ratio du montant (corrigé par
> `m02b`) ; `m13`/`m14` cherchent le rectangle de la fiche par « plus long segment sombre », que les
> glyphes coupent (remplacé par le comptage de `m15`) ; `m19` sonde le bord d'un bouton « ligne » à
> une abscisse issue d'un groupe de TEXTE et mesure donc la lettre, pas la bordure (corrigé par
> `m20`) ; `m21` cherche le rayon du bouton or dans une fenêtre en y trop basse et rend « rayon 0 »,
> réfuté par la carte ASCII de `m21b` — c'est cette carte qui fait foi ; `m34` mesure les volutes
> dans une fenêtre qui contient le texte des ailes (corrigé par `m34b`). Les scripts fautifs sont
> conservés avec leur sortie : c'est ce qui permet de vérifier laquelle des deux versions le
> rapport cite. Enfin `m36` cherche l'aiguille dans un anneau où tombe le texte du médaillon et
> rend un angle absurde (−70°) ; `m36b` borne au-dessus du moyeu et fait foi — et il refuse de
> mesurer l'angle du CANON, que le texte « 37% » recouvre : ce chiffre-là vient de la CSS, pas
> de l'image, et c'est écrit dans la ligne 29 du contrôle positif.
