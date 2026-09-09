# Juge visuel ⊥ — ① L'intérieur de district (« le HUD de Brennar ») — r5 — 2026-09-06

## Verdict : NON APPROUVÉ

Le contenu de la fiche est au canon (panneau, boutons, séparateurs, jetons de couleur : tout tombe
juste au pixel), mais **le chrome du shell est rendu ~19 % trop grand sur cet écran — et sur cet
écran seulement** : l'aile droite du bandeau (JOUR + quart du jour) sort de l'écran aux **deux**
résolutions, et la flèche retour est tronquée par le bord gauche.

---

## Préalables imposés par le dossier

**1. Convention de bord.** J'emploie deux conventions et je donne les deux quand l'objet a une rampe :
- **NOMINALE** = tous les pixels au-dessus de la **mi-amplitude** (fond → pic) ;
- **CŒUR** = pixels à **≥ 90 % de l'amplitude**.
Sur la référence les traits sont **nets** (aucune rampe mesurable) : anneau du boîtier nominal
**1,33 CSS** / cœur **0,67 CSS** ; filet du bandeau nominal = cœur = **1,00 CSS**. Sur la capture
l'anneau porte une rampe de ~5 px de chaque côté : nominal **2,90 CSS** / cœur **1,09 CSS** ; le
filet, lui, est un **aplat sans rampe** : nominal = cœur = **2,54 CSS**. Toute épaisseur citée
ci-dessous est **nominale** sauf mention.

**2. Mesure due — la pointe de l'aiguille.** Origine : le **pivot** (le moyeu), pas le centre du
boîtier — c'est le pivot qui décide où la pointe atterrit. R = rayon **extérieur nominal** du boîtier.

| | RÉFÉRENCE | CAPTURE ① | Δ |
|---|---|---|---|
| R (boîtier) | 31,83 CSS | 40,11 CSS | +26,0 % |
| **longueur d'aiguille ÷ R** | **0,4974** (15,83 CSS) | **0,3846** (15,43 CSS) | **−22,7 %** |
| bord **intérieur** de l'arc ÷ R, à l'angle de l'aiguille | **0,506** (16,11 CSS) | **0,394** (15,82 CSS) | −22,1 % |
| bord **extérieur** de l'arc ÷ R, même angle | 0,553 (17,61 CSS) | 0,453 (18,18 CSS) | — |
| **où tombe la pointe** | **elle AFFLEURE le bord intérieur** — 0,28 CSS en deçà, l'encre crème s'arrête exactement là où le teal commence | **elle AFFLEURE le bord intérieur** — 0,39 CSS en deçà | **relation CONSERVÉE** |

⇒ La crainte du dossier (« l'arc a rétréci, l'aiguille non ») est **réfutée par la mesure** :
aiguille −22,7 % et arc −22,1 % en R — **les deux ont rétréci du même facteur**, et la pointe garde
sa relation à l'arc. En valeur **absolue** les deux sont quasi inchangés (arc 16,11 → 15,82 CSS ;
aiguille 15,83 → 15,43) : c'est le **boîtier** qui a grossi autour d'eux. (Script `m49`, `m51`.)

**3. F1 remesuré tel quel** : voir la ligne `F1` de la table des écarts.

**4. Défaut du dossier (à signaler avant tout le reste).** `capture-fiche-sous-chrome-1080x2400.png`
n'est **pas** ce que le dossier annonce. L'image (1080×2400, 77 ko) ne montre **ni bandeau, ni
médaillon, ni dock, ni la fiche de ①** : c'est un panneau de listes sur fond noir, en **anglais**,
portant une **clé i18n brute non résolue** (`game.fiction.building.name`, « Type: Lab », « Cover /
Weak », « Raid risk / Imminent »…). C'est l'écran ② de la suite `screen_2a`, pas ①. ⇒ **La fiche de
① n'existe à AUCUNE seconde résolution dans ce dossier** ; je ne juge pas cette image (hors ①), mais
je signale la clé brute et l'anglais, qui contreviennent à la doctrine « langue affichée : français,
aucun enum brut ».

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Tolérances : position/taille ≤ 2 px ou ≤ 1,5 % du parent · couleur d'aplat ≤ 6/255 · capitale ≤ 1 px
ou ≤ 5 % · espacement ≤ 10 % · rayon ≤ 2 px.

| # | grandeur | canon | capture | Δ | script |
|---|---|---|---|---|---|
| 1 | largeur du panneau `.fiche` | 367,33 CSS | 368,04 | **0,71** | `m26` |
| 2 | hauteur du panneau `.fiche` | 168,33 (mesure-canon 169,19) | 168,41 | **0,08** | `m26`,`m27` |
| 3 | 3 boutons d'action — largeur | 105,33 · 105,33 · 105,33 | 104,53 · 104,53 · 104,90 | ≤ 0,80 | `m29` |
| 4 | 3 boutons — écarts entre eux | 9,00 · 9,00 | 9,07 · 9,07 | 0,07 | `m29` |
| 5 | ligne d'actions — hauteur / largeur totale | 39,67 / 334,00 | 39,56 / 332,11 | 0,11 / 1,89 | `m29` |
| 6 | séparateurs de stats (x) | 140,00 et 251,67 | 140,10 et 250,63 | ≤ 1,04 | `m30` |
| 7 | centres des 3 cellules de stats (libellés) | 83,50 / 195,67 / 307,33 | 84,39 / 194,91 / 306,16 | ≤ 1,17 | `m30` |
| 8 | `--or-vif` sur la 1ʳᵉ valeur de stat | (242,201,107) | (242,201,106) | **1/255** | `m30` |
| 9 | `--creme` sur la 2ᵉ valeur | (234,224,200) | (234,224,200) | **0** | `m30` |
| 10 | `--creme-2` sur les 3 libellés de stats | (185,173,146) | (185,173,146) | **0** | `m30` |
| 11 | `--laiton` du filet HAUT de la fiche | (176,141,62) | (176,141,61) | **1/255** | `m25` |
| 12 | `--or` de la barre de ratio | (217,171,78) | (217,171,77) | **1/255** | `m15` |
| 13 | fond du panneau de fiche, 6 sondes, l'art derrière variant de L 74 à L 174 | (15,22,35)→(9,14,23) | (16,23,34)→(9,15,25) | **≤ 2/255** ⇒ le panneau **n'est pas** plus translucide que le canon | `m34`,`m35` |
| 14 | centre x du médaillon | 195,83 | 195,83 | **0** | `m08` |
| 15 | le filet ne traverse pas le médaillon | s'arrête à l'anneau | s'arrête à l'anneau | — | `m03` |
| 16 | capitale « REVENU(S) » (libellé de stat sans accent) | 6,33 | 6,53 | 0,20 | `m30` |
| 17 | capitale des libellés de bouton (BLANCHIR) | 8,67 | 9,07 | 0,40 (+4,6 %) | `m42` |
| 18 | gouttière 1080×1920 : fiche 409,8..578,2 dans 61,7..604,0 | — | respectée | — | `m45` |
| 19 | contrastes (7 textes du bandeau, 6 de la fiche) | — | 6,43:1 à 13,81:1, **tous ≥ 4,5** | — | `m40` |
| 20 | le dock est un voile dégradé sur l'art (non opaque) | idem canon | L 631→693 CSS : 68→26, **sans variation horizontale mesurable** | — | `m46` |
| 21 | **rayon médian de l'arc, convention du correcteur (centre du BOÎTIER)** | 0,411 (teal) / 0,453 (braise) R | **0,4497 R** | ⇒ **la clôture annoncée de F5-rayon est CONFIRMÉE** | `m22` |
| 22 | **le TÉMOIN ⑥ rend le chrome au canon** : ronds 46,10 / centres 93,83·161,88·229,76·297,81 / pas 68,06 / filet 50,09 / aile droite 375,67 | 46,00 / 94·162·230·298 / 68 / 51,00 / 375,0 | ≤ 0,68 | — | `m10`,`m04`,`m14` |

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir son quartier vivant, repérer ses bâtiments, en toucher un pour lire ce qu'il vaut, et
décider quoi en faire. Trois zones, trois rôles.

**Ordre de lecture.** (1) Le **médaillon** — un disque cerclé d'or, posé à cheval sur le filet, au
centre exact de la largeur : c'est l'objet le plus contrasté et le seul rond de l'écran, l'œil y va
d'abord. (2) Le **montant en or** à gauche, le seul chiffre chaud du bandeau. (3) L'**art** — un
bâtiment héros éclairé au milieu d'une ville sombre. (4) La **fiche**, plaque noire à filet de
laiton, quand elle est ouverte : titre or au centre, trois chiffres, trois boutons. (5) Le **dock**.

**Zones.** Bandeau (52 CSS) = l'état du joueur : argent, chaleur, temps. Corps = le district.
Fiche (366×169) = la décision. Dock (90 CSS) = la navigation.

**Traits d'identité.** (a) Le **manomètre-montre-à-gousset** : boîtier 64 CSS, cerclage de laiton
**net** de 1,33 CSS, lunette intérieure, fond en dégradé radial, cadran à trois zones — froid,
**neutre**, chaud — et une aiguille qui affleure l'arc, avec **le nombre au centre, sur l'aiguille**.
(b) La **gravure** : filet de laiton de 1 CSS, volutes aux deux bouts, tout en traits fins.
(c) L'**or** comme unique couleur chaude sur une base bleu nuit. (d) Le **rythme respiré** du
bandeau (libellé, blanc, valeur, blanc, barre) et de la tête de fiche (titre, 10,7 CSS de blanc,
sous-titre). (e) La **symétrie** : deux ailes de 96 CSS, un médaillon au milieu.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le but reste lisible et l'ordre de lecture tient : le médaillon domine, l'or attire, la fiche est la
plaque de décision, le dock est en bas. **La fiche, elle, est excellente** — panneau, boutons,
séparateurs, cellules, jetons de couleur : tout est au canon à moins de 2/255 et 2 CSS près. Ce qui
casse, c'est le **chrome**.

Trois écarts de tête, par impact perçu :

1. **Le bandeau est trop grand pour l'écran et il déborde.** Huit grandeurs indépendantes donnent le
   même facteur **×1,19** par rapport au canon (ronds du dock 1,184 · pas 1,185 · chasses 1,204 à
   1,211 · capitale 1,204 · barre de ratio 1,187 · filet 1,187). Conséquence directe : **« JOUR » est
   coupé après le R et le quart du jour s'arrête sur « Aub »**, aux deux résolutions ; le joueur perd
   la date et l'heure, deux des trois informations du bandeau. Le témoin ⑥, **même shell, même
   résolution, pris trois minutes plus tôt**, rend le canon exactement — le défaut est propre à ①.

2. **Le manomètre n'est plus la même montre.** Le boîtier a grossi de 26 % pendant que le cadran
   gardait sa taille absolue : le cadran n'occupe plus que 39 % du diamètre au lieu de 51 %. Le pivot
   est passé **de l'autre côté** du centre (0,147 R en dessous au canon, 0,145 R au-dessus en jeu),
   ce qui pousse le cadran dans la moitié haute et laisse les deux lignes de texte occuper toute la
   moitié basse — là où le canon met le nombre **au centre, sur l'aiguille**. Le cerclage net de
   laiton est devenu un **halo flou** deux fois plus épais, la **lunette intérieure a disparu**, le
   fond en dégradé radial est devenu **plat**, le **segment neutre de 27°** entre le froid et le
   chaud a disparu, et l'arc est **deux fois plus épais** et **45 % plus clair**. Pris un par un
   chacun est mineur ; ensemble ils changent l'objet qui porte l'identité de l'écran.

3. **La tête de fiche s'effondre sur un nom long.** Le blanc entre le titre et le sous-titre est de
   **0,37 CSS** contre 10,67 au canon (−96,5 %), et l'encre du titre démarre à 7,62 CSS du haut du
   panneau contre 18,66. Le titre sur deux lignes et « OPÉRATIONNEL » se touchent ; le bloc de tête
   se lit comme un pâté, alors que le reste de la fiche est irréprochable.

Couche globale : la palette du **chrome + fiche** n'est pas comparable telle quelle (référence de
nuit, capture de jour : le bandeau est un voile sur un art clair, ce qui fait passer la densité
d'encre de 9,6 % à 24,5 % pour une raison qui n'est pas l'écran). Restreinte au **panneau de fiche**,
elle est identique au canon (13). L'or reste l'unique couleur chaude ; le laiton du bandeau, lui,
a viré à l'orange (voir `C1`).

---

## 3. Écarts

Gravité : liste fermée BLOQUANT / MAJEUR / MINEUR. `ASSUMÉ` et `ARBITRAGE` sont dans les tables à
part, jamais comptés ici. **Compte, relu par script sur la table elle-même (`m58`) : 2 BLOQUANT · 11 MAJEUR · 11 MINEUR = 24 findings.**

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | DÉJÀ APPLIQUÉ (g26) | non | **L'aile droite du bandeau sort de l'écran par la droite, aux deux résolutions.** Le libellé « JOUR » est coupé après le R (le canon lit « JOUR 12 · SOIRÉE ») et la valeur s'arrête sur « Aub ». Cause : `B2`. | 1080×2400 : libellé x **368,04..392,00 CSS**, valeur x **366,23..392,00** — les deux atteignent la dernière colonne de pixels (x=1079). 1080×1920 : libellé x **368,41..392,00**, valeur **366,23..392,00**, idem. Canon : bord droit de l'aile à **375,0** CSS (mesure-canon 277,05+97,95) ; ma mesure sur la référence **375,3**. Témoin ⑥ : **375,67**, non coupé. (`m14`,`m57`) | la valeur affichée elle-même (« Aube » ?) — je vois « Aub » puis le bord |
| `B2` | BLOQUANT | DÉJÀ APPLIQUÉ (g3,g5,g6,g22,g23) | non | **Le chrome du shell est rendu ~19 % trop grand sur ① — et seulement sur ①.** Un seul défaut d'échelle qui produit `B1`, descend le filet de 8 CSS, grossit le médaillon et le dock. | 8 grandeurs, capture ÷ canon : ronds du dock **54,44/46,00 = 1,184** · pas **80,58/68,00 = 1,185** · chasse EMPIRE **43,92/36,33 = 1,209** · FAMILLE **49,36/41,00 = 1,204** · PLUS **28,67/23,67 = 1,211** · capitale des libellés de dock **7,62/6,33 = 1,204** · barre de ratio **87,84/74,00 = 1,187** · bas du filet **61,70/52,00 = 1,187**. Les centres des ronds sont **identiques en CSS à 1920 et à 2400** (74,95 · 155,53 · 236,11 · 316,69) : ce n'est pas un effet de résolution. **Témoin ⑥ (même shell, 1080×2400) : 45,73–46,10 · 93,83·161,88·229,76·297,81 · pas 68,06 · filet 50,09** = le canon. (`m10`,`m11`,`m12`,`m04`,`m15`,`m57`) | quel objet porte le facteur (je ne lis pas le code) |
| `A1` | MAJEUR | NOUVEAU | non | **La flèche RETOUR est tronquée par le bord gauche de l'écran**, sans aucune marge. | Encre à **x = 0** ; l'extension verticale du chevron vaut encore **8 px** à x=0 contre **4 px** pour la hampe ⇒ le sommet est hors écran (extrapolation : ~4 px = **1,45 CSS** manquants). Canon : l'élément le plus à gauche du bandeau est la volute à **5,00 CSS**, l'aile gauche à **16,00**. (`m16`,`m17`) | — |
| `F1` | MAJEUR | DÉJÀ APPLIQUÉ (F1) | forme (le rythme) ; la longueur du nom est une donnée | **La tête de fiche s'effondre sur un nom long : le sous-titre touche la 2ᵉ ligne du titre**, et le padding haut du panneau est perdu. **Non traité, et pire qu'au r3.** | Blanc titre-L2 → sous-titre : bas d'encre **452,61** → haut d'encre **452,98** = **0,37 CSS**. Canon : 457,33 → 468,00 = **10,67 CSS** ⇒ **−96,5 %** (r3 : 2,18). Encre du titre à **7,62 CSS** du haut du panneau contre **18,66** au canon. Hauteur du panneau **inchangée** (168,41 vs 168,33) ⇒ le blanc vient du rythme, pas de la boîte. (`m28`) | le comportement sur un nom court (une seule planche) |
| `M1` | MAJEUR | NOUVEAU | non | **Le pivot du cadran est du mauvais côté du centre du boîtier**, ce qui pousse le cadran dans la moitié haute et laisse les deux lignes de texte occuper toute la moitié basse. | Canon : centre du boîtier (587,5 ; 116,5) px, pivot (587,5 ; 130,5) ⇒ pivot **0,147 R EN DESSOUS**. Jeu : centre (539,5 ; 130,0), pivot (539,5 ; 114,0) ⇒ pivot **0,145 R AU-DESSUS**. Écart **0,29 R = 11,7 CSS**. Bande verticale de la valeur : canon −0,225..+0,173 R (centrée sur le centre) ; jeu **+0,136..+0,371 R** (+0,280 R plus bas). (`m07`,`m22`,`m33`) | — |
| `M2` | MAJEUR | NOUVEAU | non | **Le cadran a gardé sa taille absolue pendant que le boîtier grossissait de 26 %** : il n'occupe plus que 39 % du diamètre au lieu de 51 %. | Bord intérieur de l'arc : **16,11 CSS (0,506 R)** → **15,82 CSS (0,394 R)**. Aiguille : **15,83 CSS (0,497 R)** → **15,43 CSS (0,385 R)**. Boîtier (nominal) **64,00 → 80,22 CSS** ; au cœur **64,00 → 77,3**. (`m06`,`m08`,`m49`,`m51`) | — |
| `M3` | MAJEUR | NOUVEAU | non | **Le segment NEUTRE de 27° entre la zone froide et la zone chaude a disparu** : le cadran passe de « froid \| neutre \| chaud » à un dégradé continu. | Canon : teal **−91..+1°**, **neutre +2..+28° (27°)**, braise **+29..+91°**. Jeu : teal **−105..+21°**, braise **−7..+105°**, **segment neutre = 0°** (les deux zones se recouvrent). Contrôle négatif : le même détecteur **trouve** le trou sur la référence et **n'en trouve pas** sur la capture. (`m49`) | si le trou du canon est une piste neutre peinte ou un vide (une seule planche de canon) |
| `M4` | MAJEUR | DÉJÀ APPLIQUÉ (F5) | non | **L'arc est ~2× plus épais radialement.** | Épaisseur médiane (nominale) : canon **2,50 CSS teal / 2,33 braise = 0,0785 / 0,0733 R** ; jeu **5,90 / 3,99 CSS = 0,147 / 0,0995 R**. À l'angle de l'aiguille : canon **1,49 CSS**, jeu **2,18**. (`m49`,`m51`) | — |
| `M5` | MAJEUR | DÉJÀ APPLIQUÉ (F5) + NOUVEAU (lunette) | non | **Le cerclage net du boîtier est devenu un halo flou 2× plus épais, et la lunette intérieure du canon est absente.** | Profil radial moyen sur 24 rayons. Canon : plat (L≈32) jusqu'à 0,963 R, puis (176,141,62) **net** sur 0,963..1,005 R — nominal **1,33 CSS**, cœur **0,67** ; **lunette** claire à **0,838..0,869 R** (L 32 → **51,6**). Jeu : **aucune lunette** (L plat 16→21 de 0,78 à 0,90 R), puis une rampe orange continue de **0,905 à 1,005 R**, pic (178,113,62) à 0,959 — nominal **2,90 CSS**, cœur **1,09**. (`m52`,`m07`,`m08`) | — |
| `M6` | MAJEUR | NOUVEAU | non | **Les deux couleurs de l'arc sont ~45 % plus claires, dans le même sens ⇒ erreur de MODÈLE, mais pas seulement.** | Teal canon **(70,103,114)** L=96,7 → jeu **(109,150,155)** L=141,6 (**+46 %**) ; braise canon **(133,71,62)** L=83,5 → jeu **(180,102,89)** L=117,6 (**+41 %**). Contrôle du modèle : le canon est reproduit à **≤ 5/255** par une composition **sRGB** des sources du SVG (`#7fd4d955`, `#e0664a88`) sur le fond du cadran (prédictions (68,100,112) et (137,75,67)). Sur la capture, la même composition rend **sRGB** (52,83,92)/(126,63,53) — erreur max **60** — et **LINÉAIRE** (75,129,132)/(167,76,57) — erreur max **32**. ⇒ le linéaire **divise l'erreur par ~2 sans la fermer** : l'espace de mélange est une cause, il n'est pas la seule. (`m19`,`m23`,`m24`) | l'opacité et la couleur source réellement employées par le client |
| `F8` | MAJEUR | DÉJÀ APPLIQUÉ (F8) | non | **L'écart libellé → valeur du bloc ARGENT est triplé**, et le facteur d'échelle `B2` ne l'explique pas. | Canon **3,33 CSS** (17,33 → 20,67) ; jeu ① **10,53 CSS** (19,96 → 30,49) ; **témoin ⑥ 9,07 CSS**. `B2` (×1,19) ne prédit que **3,96**. Aile droite : canon **1,33** → jeu **8,71 CSS**. Le témoin, qui est à l'échelle du canon, porte le même défaut ⇒ il est **indépendant de `B2`**. (`m43`,`m42`) | — |
| `F7` | MAJEUR | DÉJÀ APPLIQUÉ (F7) | oui (quel onglet est actif) — mais l'absence, non | **L'indicateur d'onglet actif du dock est absent.** Rien n'indique où l'on se trouve dans la navigation. | Contrôle **négatif** : la sonde **trouve** la barre sur la référence — x **87,00..101,00 CSS** (14,00 de large), y **663,67..665,67** (2,00), couleur **(176,141,62)** exacte. Captures : **0 pixel laiton dans TOUT le dock à 1080×1920** ; à 2400 les 261 px trouvés s'étalent sur x 54,44..330,30 à la hauteur des libellés (encre des libellés, pas une barre de 14 CSS). (`m39`) | — |
| `F4` | MAJEUR | DÉJÀ APPLIQUÉ (F4) | non | **Le montant perd 16 % de corps.** | Mesuré sur le **témoin ⑥**, seule planche à l'échelle du canon : chiffre **9,80 CSS** contre **11,33–11,67** au canon ⇒ **−16 %** (valeur identique au r3). Sur ①, 11,98 CSS pour un chrome ×1,19 ⇒ attendu 13,5–13,9 ⇒ **−14 %**. (`m45`,`m47`) | — |
| `F12` | MINEUR | DÉJÀ APPLIQUÉ (F12) | non | **La capitale du titre de fiche est +15,7 %.** | Canon **10,67 CSS** (médiane de 8 lettres sans accent de « LE VERGE D'OR ») ; jeu **12,34 CSS** (chiffres « 1 » et « 2 » de la 2ᵉ ligne, sans accent ni descendante). Hors tolérance sur les deux critères (> 1 px **et** > 5 %). (`m31`) | — |
| `C1` | MINEUR | NOUVEAU | oui (l'état « chaud ») | **L'accent chaud du chrome (filet + anneau) est ORANGE-BRIQUE là où le canon veut BRAISE** : plus orange, moins rouge, plus clair. | Jeu : **(200,126,66)** (filet et anneau, valeur identique). Le canon en état **`.chaud`** — que la planche montre (« Brûlant ») — impose `--braise` **(224,102,74)** au filet **et** à l'anneau. Δ **(−24, +24, −8)** ; **teinte 11,2° → 26,9°** (+15,7°), saturation identique (0,670), luminance **+9 %**. La référence, elle, est en état neutre (`--laiton` (176,141,62), mesuré **exact**) : ce n'est **pas** le bon témoin. (`m02`,`m03`) | aucune planche d'un état NON chaud n'est fournie ⇒ je ne peux pas dire si l'orange est piloté par l'état ou constant |
| `C2` | MINEUR | NOUVEAU | non | **Le filet du bandeau est 2,5× plus épais** — au-delà du facteur `B2`. | Convention nominale = cœur (les deux filets sont des aplats sans rampe) : canon **1,00 CSS** (3 px, y 51,00..52,00), jeu **2,54 CSS** (7 px, y 59,16..61,70). `B2` ne prédirait que **1,19**. Témoin ⑥ : **1,81 CSS**. (`m03`,`m04`) | — |
| `M7` | MINEUR | DÉJÀ APPLIQUÉ (F15) | non | **Le fond du cadran est PLAT au lieu d'être un dégradé radial, et plus sombre.** | 4 sondes symétriques à 0,55 R. Canon **(34,44,61) / (26,35,51) / (22,30,45) / (18,26,40)** — amplitude **(16,18,21)**. Jeu **(15,19,29) / (16,20,29) / (15,20,29) / (16,20,30)** — amplitude **(1,1,1)**. Le coin haut-gauche est plus sombre de **(19,25,32)**. (`m46`) | — |
| `M8` | MINEUR | NOUVEAU | oui (le mot « CHALEUR » vs « HEAT ») | **Le libellé du manomètre frôle la lunette.** | Coin du libellé à **0,846 R** du centre du boîtier, bord intérieur de l'anneau à **0,918 R** ⇒ **0,072 R = 2,9 CSS** de dégagement. Canon (« HEAT ») : coin à **0,614 R**, anneau intérieur à **0,958 R** ⇒ **0,344 R = 11,0 CSS**. (`m33`,`m52`) | — |
| `F10` | MINEUR | DÉJÀ APPLIQUÉ (F10) | non | **Le crénage des libellés de bouton est +8,9 % et le blanc inter-lettre +22 %.** | BLANCHIR : chasse canon **68,33** → jeu **74,41 CSS** (+8,9 %) ; blanc médian **2,67 → 3,27 CSS** ; capitale 8,67 → 9,07 (+4,6 %, **dans** la tolérance). (`m42`) | — |
| `F14` | MINEUR | DÉJÀ APPLIQUÉ (F14) | oui (l'art sous le libellé) | **Le nom de district tombe à 2,00:1 sur le ciel** — la doctrine demande ≥ 4,5:1 pour un petit texte ; seul un contour noir le sauve. | Encre **(234,224,200)**, ciel **(146,161,180)** ⇒ **2,00:1**. Contour le plus sombre **(0,0,0)** ⇒ encre/contour **15,99:1**, contour/ciel **7,98:1**. Capitale **5,44 CSS** = le plus petit texte de l'écran (libellés du dock : 7,62). Marge gauche **6,53 CSS**. Au r3 il valait 10,36:1 — il est passé de la bande sombre (y 87,5) au ciel (y **103,8**). (`m38`,`m40`) | la lisibilité sur les autres quarts du jour / les autres districts |
| `F13` | MINEUR | DÉJÀ APPLIQUÉ (F13) | non | **Les DEUX volutes décoratives du bandeau sont absentes** (le r3 ne relevait que la droite). | Contrôle **négatif** : la sonde trouve **524 px** (gauche, x 5,00..27,67 CSS, y 20,33..28,33) et **544 px** (droite, x 363,67..387,00) sur la référence. Sur les 3 planches ① : **0 pixel** dans la fenêtre gauche ; les 110 px trouvés dans la fenêtre droite sont l'encre du « JOUR » qui déborde (y 18,15..21,05), pas une volute. L'assumé « la flèche remplace la volute gauche » ne couvre pas : la flèche occupe **x 0,00..8,71 CSS**, la volute canon **5,00..27,67**. (`m16`) | — |
| `F6` | MINEUR | DÉJÀ APPLIQUÉ (F6) | non | **1080×2400 uniquement** : bande de fond déclaré **nue** de 25,4 CSS entre le filet et l'art. | Haut **(34,38,49)** de **61,70 à 87,11 CSS = 25,41 CSS** (2,9 % de la hauteur d'écran) ; bas **(31,35,46)** de **784,00 à 871,0 = 87,0 CSS** (10,0 %) mais **occupée par le dock** (ronds 785,6..840,1) donc non nue. L'art natif occupe exactement 87,11..784,00. La bande haute a **rétréci** (35,0 → 25,4) uniquement parce que le filet est descendu de 8 CSS (`B2`), pas parce que l'art a bougé. (`m36`,`m37`) | — |
| `M9` | MINEUR | NOUVEAU | non | **La fiche est posée 17,9 CSS trop haut** (sa hauteur, elle, est juste). | Panneau : jeu **409,79..578,20 CSS**, canon **427,67..596,00**. Hauteur **168,41 vs 168,33** (ÉGAL) ; position **−17,88 CSS** en haut, **−17,80** en bas. Écart fiche→dock : canon ~12 CSS, jeu **25,8 CSS**. Gouttière respectée. (`m26`,`m27`,`m45`) | — |
| `M10` | MINEUR | NOUVEAU | non | **La barre de ratio est 27 % plus épaisse** — au-delà du facteur `B2`. | Canon **2,00 CSS** (CSS `.ratio{height:2px}`, mesuré 2,00) ; jeu **2,54 CSS**. `B2` prédirait 2,38. (`m43`,`m15`) | — |

---

## Table à part — ASSUMÉ (jamais compté avec les findings)

| ce qui était assumé | rendu proprement ? | mesure |
|---|---|---|
| les 3 chiffres de la fiche remplacés par des bandes | **OUI** | 3 cases, position et rôle gardés : centres des libellés **84,39 / 194,91 / 306,16** CSS (canon 83,50 / 195,67 / 307,33, Δ ≤ 1,17) ; séparateurs **140,10 / 250,63** (canon 140,00 / 251,67). Aucune case vide, aucun scalaire inventé. |
| libellés du dock EMPIRE · FAMILLE · FILIÈRE · PLUS | **OUI** | 4 onglets, casse uniforme, aucun libellé coupé ni tronqué (chasses 43,92 / 49,36 / — / 28,67 CSS, encre entière). Pas de 5ᵉ onglet. |
| le nom du district affiché | **OUI pour la forme** | « La Lisière » — un nom de fiction, pas un slug ni un identifiant. (Contraste : voir `F14`.) |
| le quart du jour à la place de l'heure | **NON — il est COUPÉ** | libellé français (« Aub… ») mais tronqué au bord droit ⇒ remonté en `B1`. |
| les ronds du dock vides | **OUI** | 4 ronds, aucune icône, aucun trou. ARBITRAGE ouvert (voir ci-dessous). |
| un bouton RETOUR en haut à gauche | **périmètre respecté, mais tronqué** | il **ne recouvre pas** l'aile gauche : flèche x **0,00..8,71 CSS**, « ARGENT » commence à **39,56**. Mais il est coupé au bord ⇒ remonté en `A1`. |
| référence de nuit, capture au quart de jour | **pris en compte** | palette globale non comparée ; comparaison restreinte au chrome et à la fiche. |

## Table à part — ARBITRAGE

| point | mesure | pourquoi c'est un arbitrage |
|---|---|---|
| le bloc ARGENT déplacé vers le centre par la flèche retour | libellé « ARGENT » x **16,00 → 39,56 CSS (+23,56)** ; barre de ratio **16,00 → 39,56 (+23,56)**. **Périmètre de l'assumé : « qu'il touche ou recouvre le médaillon » — il ne le touche PAS, mais il n'en est plus qu'à 1,07 CSS** : l'encre or du « € » approche à **113,5 px** du centre pour un anneau à **110,5 px** (canon : l'encre la plus proche est à **74,36 CSS** de l'anneau). Au r3 le dégagement valait 13,1 CSS. | aucun canon de chrome avec bouton retour. ⚠️ Le dégagement de 1,07 CSS **dépend de la longueur du montant** : un montant plus long, ou le maintien du facteur `B2`, déclenche la clause de sortie. |
| ronds du dock sans icône | 4 ronds, diamètre 54,44 CSS, aucune encre à l'intérieur | ruling user « j'aime pas les icônes » — à remonter tel quel. |
| police : Georgia demandée, **Noto Serif** rendue dans la référence ; le client embarque DejaVu Serif | non mesuré finement — la référence n'a jamais montré Georgia à personne | écart de **famille** et de chasse = arbitrage, pas défaut. Les hauteurs de capitale, elles, sont comparées (`F12`, contrôle positif 16-17). |
| libellés anglais dans la RÉFÉRENCE (`HEAT`, `$ 24 850`, `MARCHÉ`) | — | ruling user 2026-09-02 « fr réel » : **le client a raison, la maquette est en retard**. Noté une fois ; jamais compté comme écart. |

## Table à part — écarts qui DÉPENDENT DES DONNÉES (observations datées, non comptées)

| observation | mesure | pourquoi c'est une donnée |
|---|---|---|
| la 3ᵉ valeur de stat n'est plus en `--braise` | canon **(224,102,74)** (« 12% ») ; jeu **(234,224,200)** `--creme` (« Sain ») | l'état affiché est bon (« Sain ») ; le canon montrait un état alarmant. Le r3 relevait (255,90,77) sur un autre état ⇒ non comparable. |
| la barre de ratio est entièrement or, sans la portion vide | canon : or **16,00..66,33** + ardoise **#5a6376 (90,99,118)** 66,33..90,00 (68 % / 32 %) ; jeu : **or sur toute la largeur**, aucune portion (90,99,118) | le canon est à 68 % (`<i style="width:68%">`) ; le compte photographié affiche 9 627 820,00 € — probablement 100 %. La lecture « deux tons » du canon est perdue **pour cette donnée**. |
| pas de pastille de notification sur FAMILLE | contrôle négatif : la sonde trouve **185 px** d'or sur la référence (x 179,33..184,67 CSS, y 617,00..622,33) ; **0** sur la capture | notification absente sur ce compte. |
| « Brûlant » / « CHALEUR » à la place de « 37% » / « HEAT » | valeur : hauteur **13,00 → 9,80 CSS**, bande verticale −0,225..+0,173 R → **+0,136..+0,371 R** ; libellé **5,00 → 6,17 CSS**, +0,372..+0,518 R → **+0,543..+0,688 R** | bande qualitative au lieu d'un scalaire (même famille R2.2 que l'assumé de la fiche) — **mais ce cas n'est PAS dans la table des assumés du dossier**, je le signale plutôt que de l'y ranger d'office. |
| le titre de fiche n'est pas en capitales | jeu « Réparation Ilm — La Lisière, îlot 1501, n° 2 » ; canon « LE VERGE D'OR » | la CSS du canon (`.fiche .titre .serif`) **ne porte aucun `text-transform`** ⇒ les capitales du canon sont dans la **donnée**, pas dans la forme. **Ce n'est pas un défaut du client.** |

---

## 5. Autres résolutions

- **1080×1920 (principale, native de l'art)** : l'inventaire tient. `B1` (aile droite coupée), `B2`
  (centres de dock identiques en CSS), `A1`, `F1`, `F7` (0 pixel laiton dans tout le dock),
  `F13` : tous présents. Gouttière respectée (fiche 409,8..578,2 dans 61,7..604,0). Aucune bande
  de fond déclaré (l'art natif couvre exactement l'écran).
- **1080×2400 (cible)** : l'inventaire tient. Écarts **propres à cette résolution** : `F6` (bande
  nue de 25,41 CSS en haut, bande occupée de 87,0 CSS en bas). La fiche n'y est pas ouverte, donc
  `F1`/`F12`/`M9`/`F10` n'y sont pas revérifiés.
- **La fiche de ① n'existe à aucune seconde résolution** (voir « Préalables », point 4) ⇒ tous les
  écarts de fiche reposent sur **une seule planche**.
- **Témoin ⑥ (1080×2400)** : utilisé uniquement comme comparateur de chrome, comme le dossier
  l'autorise. ⚠️ Son aile droite affiche « JOUR 50 » et **un tiret « — » en valeur** ⇒ son bandeau
  n'est pas entièrement alimenté ; je n'en juge **que la géométrie** (dock, filet, bord de l'aile),
  jamais le contenu.

---

## 6. Non vérifié

1. **Animation.** Aucune paire T / T+1 s n'est fournie pour aucun état. ⇒ le ruling « aucune
   animation sur un nouvel écran » n'est **pas vérifiable** ici. *La mesure qui trancherait* : deux
   captures du même état à 1 s d'intervalle, compte de pixels différents hors chrome hérité.
   (Le r3 avait un tel contrôle — grandeur 33 : « 1 pixel différent sur 221 760 » — entre deux
   planches 1080×2400 hors bande fiche ; ce tour n'en fournit pas d'équivalent.)
2. **L'état NON chaud du manomètre.** Les deux planches (① et ⑥) montrent « Brûlant ». Je ne peux
   donc pas dire si l'orange **(200,126,66)** de `C1` est piloté par l'état de chaleur (comme au
   canon, où `.tel.chaud` bascule filet et anneau sur `--braise`) ou s'il est constant.
   *La mesure qui trancherait* : une planche du même écran avec une chaleur basse — l'anneau doit
   alors rendre `--laiton (176,141,62)`.
3. **Le comportement de la tête de fiche sur un nom COURT.** `F1` est mesuré sur un nom qui passe à
   la ligne. *La mesure qui trancherait* : une planche de ① sur un bâtiment au nom court.
4. **Les valeurs affichées.** Le dossier rapporte l'identité `régime=env identité=demo_capture@…`
   mais **ne joint pas la ligne de journal**. Conformément à la doctrine, **je n'ai comparé aucune
   VALEUR** de la planche à un corps back ; je n'ai jugé que la forme. *La mesure qui trancherait* :
   la ligne `[DemoIdentityResolver]` du run, ou son sidecar.
5. **La police réellement embarquée par le client.** Je constate des écarts de chasse (`F10`) mais
   je ne peux pas, depuis une image, séparer « autre fonte » de « autre interlettrage ».
   *La mesure qui trancherait* : `fc-match` sur la pile CSS (le dossier la donne : Georgia →
   **Noto Serif**, DejaVu Sans → **DejaVu Sans**) confrontée à la fonte réellement chargée en jeu.
6. **L'objet qui porte le facteur ×1,19 de `B2`.** Je mesure le facteur sur 8 grandeurs et je prouve
   qu'il est propre à ① (le témoin ⑥ est au canon), mais je n'ouvre pas le code : je ne peux pas
   dire *quoi* est mal dimensionné. *La mesure qui trancherait* : le `rect` et le `lossyScale` du
   nœud de chrome imprimés à l'exécution sur ① **et** sur ⑥ — le dossier dit que le log n'a pas été
   préservé.
7. **Le rect imprimé par le test.** Non fourni ; toute ma géométrie de capture repose sur l'échelle
   **déclarée** par le dossier (1080 px = 392 CSS). J'ai vérifié cette échelle sur le témoin ⑥
   (ronds de dock à 46,10 CSS, aile droite à 375,67) — elle y est juste ; c'est précisément ce qui
   rend `B2` opposable.
8. **La bande basse à 1080×2400 sous le dock.** Je constate qu'elle est occupée par le dock, mais je
   n'ai pas de canon pour une hauteur d'écran de 871 CSS (le canon est un 9:16 de 696,88 CSS).
9. **La touche / la zone tactile de la flèche retour.** Je mesure l'encre, pas la cible tactile :
   une flèche tronquée peut avoir une zone cliquable intacte.

---

## Annexes

### 1. Correspondance des repères

| | px de l'image | largeur CSS | facteur | vérifié sur |
|---|---|---|---|---|
| RÉFÉRENCE `ecran-canon.png` 1176×2091 | 1176 | 392 | **×3,0** | contrôle positif : `.medaillon` mesuré **64,00 CSS** (mesure-canon : 64,00), `.rond` **46,00** (46,00), `--laiton` du filet **(176,141,62)** exact |
| CAPTURES 1080×1920 et 1080×2400 | 1080 | 392 | **×2,755** | vérifié sur le témoin ⑥ (ronds 45,73–46,10 ; aile droite 375,67) ; **contredit par ①** ⇒ `B2` |
| Origines : médaillon canon (587,5 ; 116,5) px, pivot (587,5 ; 130,5), R=95,5 px. Médaillon jeu 2400 (539,5 ; 130,0) px, pivot (539,5 ; 114,0), R=110,5 px. Panneau de fiche : canon y 427,67..596,00 CSS ; jeu y 409,79..578,20. | | | | |

⚠️ La référence `ecran-canon.png` porte **six pastilles d'annotation numérotées (1 à 6)** qui ne font
pas partie de l'écran (x 10..40 CSS et 355..385 CSS environ, or vif). Je les ai exclues de tous les
inventaires ; leur absence dans les captures n'est **pas** un écart.

### 2. Inventaire de la référence (extraits chiffrés)

- **Bandeau** 0..52,00 CSS. Filet bas y **51,00..52,00** (1,00 CSS), `--laiton` **(176,141,62)** exact,
  dégradé transparent → laiton 18 % → laiton 82 % → transparent. Volutes x **5,00..27,67** et
  **363,67..387,00**, y 18,33..28,33, L max 208/224 sur fond 23/25.
- **Aile gauche** : « ARGENT » x 16,00..58,00, capitale **6,67**, `--creme-2` ; blanc **3,33** ;
  « $ 24 850 » x 6,67..77,33, chiffres **11,33–11,67**, `--or-vif` ; blanc **6,00** ; barre de ratio
  y 40,67..42,67 (**2,00 CSS**), x **16,00..90,00** (74,00), or **(217,171,78)** 68 % + ardoise
  **(90,99,118)** 32 %.
- **Aile droite** : « JOUR 12 · SOIRÉE » x 278,67..373,67, capitale **8,00** ; blanc **1,33** ;
  « 21:40 » x 341,00..380,00, chiffres **15,67–16,00**. Bord droit **375,3 CSS**.
- **Médaillon** : boîtier **64,00 CSS** centré sur x 195,83, y 7,00..71,00 ; anneau `--laiton`
  **1,33 CSS** net ; lunette claire à 0,838..0,869 R ; fond en **dégradé radial** (34,44,61) →
  (18,26,40) ; cadran : teal (70,103,114) **−91..+1°**, neutre **+2..+28°**, braise (133,71,62)
  **+29..+91°**, rayon **0,506..0,553 R** depuis le pivot, épaisseur **2,33–2,50 CSS** ; moyeu
  **3,33 CSS** `--laiton` ; aiguille `--creme` **15,83 CSS = 0,497 R**, angle **−41,6°**
  (CSS : `rotate(-42deg)` ⇒ **contrôle positif à 0,4°**) ; « 37% » **13,00 CSS** centré sur le centre
  du boîtier ; « HEAT » **5,00 CSS** à +0,372..+0,518 R.
- **Fiche** : panneau **367,33 × 168,33 CSS** à (13,00 ; 427,67), fond (15,22,35) → (9,14,23),
  filet haut `--laiton` à y 426,67. Titre **10,67 CSS** de capitale, `--or-vif`, x 124,33..266,00
  (**42,7 %** de la zone de 332), centré. Blanc **10,67**. Sous-titre `--creme-2`.
  Stats : séparateurs 140,00 / 251,67 ; valeurs `--or-vif` / `--creme` / `--braise` ;
  libellés `--creme-2` **6,33 CSS**. Actions : 3 × **105,33 CSS**, écarts **9,00**, hauteur **39,67**.
- **Dock** : 4 ronds **46,00 CSS** centrés 94 / 162 / 230 / 298, pas **68,00** ; libellés **6,33 CSS**,
  chasses 36,33 / 41,00 / — / 23,67 ; **barre d'onglet actif laiton 14,00 × 2,00** sous EMPIRE ;
  pastille or sur FAMILLE ; panneau en dégradé vers transparent.

### 3. Inventaire de la capture (extraits chiffrés)

- **Bandeau** 0..61,70 CSS (**+9,70**). Filet **2,54 CSS**, **(200,126,66)**. **0 volute.**
  Flèche retour x **0,00..8,71**, y 28,31..34,12, **tronquée**.
- **Aile gauche** : « ARGENT » x 39,56..85,31, capitale **8,35** ; blanc **10,53** ; montant
  `--or-vif` chiffres **11,98** ; blanc **8,71** ; barre **2,54 CSS**, x **39,56..127,40** (87,84),
  **entièrement or**.
- **Aile droite** : « JOUR » x **368,04..392,00** (coupé), capitale 9,07 ; blanc 8,71 ;
  « Aub » x **366,23..392,00** (coupé), capitale 13,07.
- **Médaillon** : boîtier **80,22 CSS** nominal / 77,3 cœur, centré x **195,83** (exact), y 7,26..87,5 ;
  anneau **halo** 2,90 CSS nominal / 1,09 cœur, pic (178,113,62) ; **pas de lunette** ; fond **plat**
  (15,19,29)±1 ; cadran : teal (109,150,155) **−105..+21°**, braise (180,102,89) **−7..+105°**,
  **aucun segment neutre**, rayon **0,394..0,453 R** depuis le pivot, épaisseur **3,99–5,90 CSS** ;
  moyeu **5,81 × 5,44 CSS** ; aiguille `--creme` **15,43 CSS = 0,385 R**, angle **+61,9°** ;
  « Brûlant » **9,80 CSS** à +0,136..+0,371 R ; « CHALEUR » **6,17 CSS** à +0,543..+0,688 R ;
  losange laiton sous le boîtier (présent, comme au canon).
- **Fiche** (1920) : panneau **368,04 × 168,41 CSS** à (11,98 ; 409,79), fond (16,23,34) → (9,15,25),
  filet haut **(176,141,61)**. Titre sur **2 lignes**, capitale **12,34**, centré (196,18 pour une
  zone centrée sur 196,00) ; blanc titre→sous-titre **0,37**. Séparateurs 140,10 / 250,63 ;
  libellés `--creme-2` **6,53** ; actions 3 × ~104,5 CSS, écarts 9,07, hauteur 39,56.
- **Dock** : 4 ronds **54,44 CSS** centrés **74,95 / 155,53 / 236,11 / 316,69**, pas **80,58** ;
  libellés **7,62 CSS** ; **aucune barre d'onglet actif** ; **aucune pastille** ; voile dégradé
  sur l'art (68→26 de L de 631 à 693 CSS).
- **1080×2400 seulement** : bande (34,38,49) 61,70..87,11 CSS ; art natif 87,11..784,00 ;
  bande (31,35,46) 784,00..871,0 portant le dock.

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre. Contrôles embarqués :
`m02` (positif : `--laiton` exact sur la référence) · `m05`/`m06` (positif : diamètre du médaillon =
64,00 CSS de `mesure-canon`) · `m09`/`m10` (positif : `.rond` = 46,00 CSS) · `m16`/`m38`/`m39`
(**négatifs** : la sonde DOIT trouver les volutes, la barre d'onglet actif et la pastille sur la
référence — elle les trouve) · `m22` (positif : angle d'aiguille **−41,6°** contre `rotate(-42deg)`
dans la CSS ; **négatif** : le détecteur d'arc trouve un trou angulaire sur la référence et n'en
trouve pas sur la capture) · `m24` (contrôle de modèle sRGB / linéaire) · `m25` (positif : filet haut
de fiche à y 426,67 CSS) · `m49` (attendus dérivés du SVG du canon).

| script | grandeur |
|---|---|
| `m01`–`m04` | filet du bandeau : position, épaisseur (2 conventions), couleur |
| `m05`–`m08` | médaillon : centre, diamètre, anneau |
| `m09`–`m12` | dock : ronds, centres, pas, libellés |
| `m13`–`m17` | ailes du bandeau, débordement, flèche retour, volutes |
| `m18`–`m24` | manomètre : arc, aiguille, moyeu, couleurs, espace de mélange |
| `m25`–`m31` | fiche : panneau, rythme, cellules, boutons, titre |
| `m32`–`m35` | textes du médaillon, opacité du panneau |
| `m36`–`m40` | bandes 1080×2400, nom de district, onglet actif, contrastes |
| `m41`–`m47` | typographie des ailes, corps du montant, fond du cadran |
| `m48`–`m52` | mesure due (arc/aiguille depuis le pivot), lunette |
| `m53`–`m57` | couche globale, bloc argent ↔ médaillon, confirmation à 1920 |
