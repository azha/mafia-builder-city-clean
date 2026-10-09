# Juge visuel ⊥ — JUGE D'ENSEMBLE du décor (A01 + E01-E11) — r3 — 2026-10-08

Dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r3-2026-10-08/`
Scripts : `mesures/m01…m12` (chacun imprime la taille des images qu'il ouvre).
Références : les 54 PNG de `reference/`, **tous vérifiés 1080×2102** (`m00`, ci-dessous).
Captures : les **35** planches de `…/planches-par-ecran-2026-10-08-client2-r2/`, **les 35 empreintes
sha256 du dossier vérifiées une à une** (voir Annexe 3). Les six `E12_Dossier_*` n'ont pas été ouvertes.

## Verdict : NON APPROUVÉ

Les douze écrans tiennent **comme un seul jeu** — le chrome est pixel à pixel le même sur les 26
planches, les deux résolutions comprises — mais neuf écarts A/B restent, dont trois matières ou
éléments de structure absents (la planche de ㉘, le filet d'or de ⑭, l'or de la carte de ⑤) et une
famille typographique qui s'écarte sur quatre bandeaux de titre sur cinq.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | maquette | jeu | script |
|---|---|---|---|---|
| 1 | chrome du HUD, ㉚ contre ㉘, y=0..300 | — | **0 / 84 000 px différents** | `m08` |
| 2 | chrome du HUD, ㊳ contre ㉚, y=0..190 | — | **0 / 53 200 px différents** | `m08` |
| 3 | hauteur de capitale d'« ARGENT » | 21 px | **19 px sur les 13 planches 2400, sans exception** | `m01` |
| 4 | anneau d'or du manomètre | D=194 px, x=443..636 | **D=184 px, x=448..631 sur les 13** | `m01` |
| 5 | filet d'or sous le HUD | A01 cadres 4/5 : y=143..145 | **y=141..142, 776 px, sur les 13** | `m01` |
| 6 | bandeau haut, 2400 contre 1920 | — | **0 px différent sur 11 écrans / 13** (⑭ et ⑤ : 0,03 %) | `m09a` |
| 7 | dock : ligne de base du libellé | — | **58 px du bas sur les 26 planches**, aux deux résolutions | `m09b` |
| 8 | dock : diamètre de la pastille | 200 px (55,6 CSS) | 203-204 px (56,4-56,7 CSS) → **+1,1 px CSS** | `m11a` |
| 9 | ㉓ titre « LA VITRINE » | capitale 29 px, interlettrage/h 0,418 | 30 px, 0,421 → **+3,4 % / +0,7 %** | `m02b`,`m03b` |
| 10 | ㉓ rubrique « LES EXTRAS — PAYÉS EN MARKS » | capitale 21 px | **21 px** | `m02b` |
| 11 | ⑭ plaque « TENSION » | capitale 22 px, interlettrage/h 0,598 | **22 px**, 0,644 | `m02b` |
| 12 | dock « FAMILLE » | capitale 17 px, interlettrage/h 0,314 | 18 px, **0,315** | `m02b` |
| 13 | ㊵ libellé de compteur « ÉTAPES » | capitale 18 px | **18 px** | `m02b` |
| 14 | ⑮ le liège | cadre 31 : (116, 88, 47) | **(115, 86, 45)** → Δ (−1, −2, −2) | `m04` |
| 15 | ⑮ étendue du liège | — | **1231 px d'image aux DEUX résolutions** (342 px CSS) | `m10a` |
| 16 | ⑤ le feutre du tapis | (38, 84, 60) | **(33, 84, 58)** → Δ (−5, 0, −2) | `m04` |
| 17 | ⑤ liseré d'or en haut du tapis | (176, 141, 62), 10 lignes | **(176, 141, 61), 11 lignes** | `m10d` |
| 18 | ⑤ inclinaison de la carte | +13 px sur 500 lignes | **+13 px sur 500 lignes** | `m10c` |
| 19 | ㊳ titre « Le journal » | or (242, 201, 107), 11,83:1 | **(242, 201, 106), 11,81:1** | `m06` |
| 20 | A01 eyebrow « LA SUITE » | encre (185, 173, 146), 8,44:1 | **(185, 173, 146), 8,37:1** | `m06` |
| 21 | ㉝ sous-titre de bandeau | capitale 19 px, encre (143, 146, 133) | **19 px, (143, 146, 133)** → Δ (0, 0, 0) | `m03b`,`m07a` |
| 22 | ㉛ encre du sous-titre | (141, 153, 166) | (138, 151, 156) → Δ (−3, −2, −10) | `m07a` |
| 23 | ㉚ socle du geste | (20, 26, 33) | (22, 28, 34) | `m11c` |
| 24 | ㊳ « Y PRÊTER ATTENTION » centré dans son cadre | −2 px du centre | **−0 px** | `m12c` |
| 25 | titres de bandeau (5 écrans) | capitale 32-33 px | **33-34 px** | `m03b` |

Contrôles négatifs qui discriminent : un rect sans texte rend 1,01:1 (`m06`) ; deux matières
différentes de la **maquette** (liège de ⑮ contre tôle de ⑭) rendent Δ (60, 27, −22) (`m04`) ;
« ARGENT » et « CHALEUR », dont le dossier dit que la fonte est **substituée** (Segoe UI → Noto Sans
en maquette, DejaVu Sans en jeu), rendent −11,7 % et −40,5 % de rapport largeur/hauteur alors que
tous les mots en DejaVu des deux côtés rendent ±10 % (`m02b`) — l'instrument sépare donc bien la
substitution de police d'un écart de composition.

---

## 0. L'écran, tel que la maquette le dit — et ce que la SÉRIE dit

**Ce que le joueur vient faire.** Douze pages d'un même carnet de patron : prendre la température
(㊳), poser ses ordres (㉞), nourrir la machine (㉚ ㉘), tenir la police et la loi (⑮ ㉛), alléger
(㉝), dépenser (㉓), blanchir (㊵), lire la pression de la semaine (⑭), trancher la carte du jour
(④ ⑤). Chaque page finit sur **un** geste.

**L'ordre de lecture, partout le même :** 1) le chrome (argent, manomètre, jour) ; 2) le titre et son
sous-titre, qui disent où l'on est et ce qui s'y joue ; 3) la matière du corps — et c'est elle qui
donne son identité à chaque page : liège pour ⑮, kraft pour ㉘, tôle pour ⑭, feutre vert pour ⑤,
papier crème pour ㉞, bleu nuit fileté d'or pour ㊳ et ㊵ ; 4) le geste, en bas, en capitales or.

**Les traits d'identité de la série :** l'or (242, 201, 106) réservé aux titres de panneau et aux
gestes · le bleu nuit (14, 19, 29) comme fond commun · une matière par écran, toujours grainée ·
les capitales largement interlettrées pour les eyebrows et les libellés · un bandeau de titre
sérif + sous-titre linéale, calé à **51 px** (14,2 px CSS) du bord · le manomètre au centre du HUD,
son filet d'or et son losange.

**Grille de gravité qui en découle :** une matière qui perd son grain, un filet d'or qui disparaît,
l'or qui devient rouge, un sous-titre qui passe de 1 à 2 lignes — tout cela touche l'identité ou
l'ordre de lecture et pèse plus qu'un demi-pixel d'espacement.

---

## 4. Lecture globale — les douze écrans en jeu se lisent-ils comme un seul jeu ?

**Oui pour le chrome, et c'est le résultat le plus solide de ce tour.** Le bandeau haut est
identique **au pixel près** d'un écran à l'autre (0 / 84 000 px entre ㉚ et ㉘) et entre les deux
résolutions (0 px sur 11 écrans sur 13). Le dock est au même endroit sur les 26 planches. Le liège de
⑮ tombe à (−1, −2, −2) de son cadre, le feutre de ⑤ à (−5, 0, −2), le liseré d'or du tapis à 1/255.
Les titres, les interlettrages, les gestes centrés : vingt-cinq grandeurs ÉGALES.

**Trois choses cassent pourtant la lecture.** *Un*, le **sous-titre du bandeau de titre** est
1,4 à 1,5× trop grand sur ㉚ ㉘ ㉛ ㉞ — et juste sur ㉝. Le contraste de taille titre/sous-titre tombe
de 1,68-1,74 à 1,17-1,26 : le bandeau cesse d'être « un titre et sa glose », il devient deux
phrases de même poids, et le sous-titre passe de 1 à 2 lignes sur trois écrans. *Deux*, **trois
matières ou structures de matière manquent** : la planche de ㉘ est un aplat brun d'écart-type de
luminance **exactement 0,00000** là où la maquette est du kraft grainé à double filet ; le **filet
d'or de 14 px pleine largeur** qui sépare la scène du corps sur ⑭ n'existe pas ; sur ⑤ **l'or de la
carte est devenu rouge brique** (176, 141, 62 → 147, 64, 44) et l'eyebrow qui flottait en or sur le
feutre est passé **dans** la carte, en rouge, calé à gauche. *Trois*, **un écran mutile le chrome** :
sur ㊳ la bande « Lt. Marr attend vos ordres » recouvre l'arc inférieur de l'anneau d'or du manomètre
(17 lignes, présentes sur les onze autres planches).

**Et une voix qui flotte.** ㉞ appelle son geste « Lancer la soirée » en casse de phrase quand les
onze autres sont en capitales ; ㊵ cale son libellé à gauche (−98 px CSS) quand la maquette le
centre ; la marge gauche du bandeau de titre vaut 44, 48, 55, 59, 60 ou 60 px selon l'écran, contre
51 partout en maquette.

**À saluer, parce que c'est mesuré :** sur toutes les planches que j'ai lues, **aucun texte anglais,
aucun enum brut, aucune clé technique** — alors que les cadres de référence ㊳ 125 affichent
`news.beat.body_found`, `ambient.queue_pharmacy`, `ambient.night_trucks`, `ambient.church_closed`
et que ㉓ 98 affiche « Callsign Color Pack », « Theme: Sodium Night », « Extra Save Slot »,
« Third Save Slot ». Le jeu est ici **plus conforme à la doctrine que sa maquette**.

---

## 3. Écarts — la table qui fait foi

**0 BLOQUANT · 9 MAJEUR · 10 MINEUR.** Le compte se prend ici, pas dans le résumé.

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | **`ENSEMBLE`** (㉚ ㉘ ㉛ ㉞ ; ㉝ juste) | `MAJEUR` | `INSTRUMENT NEUF` | le **sous-titre du bandeau de titre** est 1,4 à 1,5× trop grand ; la hiérarchie titre/sous-titre s'écrase et le sous-titre passe de 1 à 2 lignes sur ㉚ ㉘ ㉞ | hauteur de capitale du 1ᵉʳ glyphe, `m03b` : ㉚ 19 → **29 px** (+52,6 %) · ㉘ 19 → **28** (+47,4) · ㉛ 19 → **27** (+42,1) · ㉞ hauteur d'x 20 pour une capitale de 19 en réf (≈ +44 %) · ㉝ 19 → **19** (0,0 %). Rapport titre/sous-titre : 1,74 → 1,17 (㉚), 1,68 → 1,21 (㉘), 1,68 → 1,26 (㉛), 1,68 → **1,74** (㉝). Confirmation indépendante sur ㉚, chaîne identique des deux côtés : 48 caractères tiennent sur 605 px en maquette et 888 px en jeu (×1,47) | pourquoi ㉝ échappe à l'écart : l'image ne dit pas quel conteneur diffère |
| `F2` | `E04` ㉘ | `MAJEUR` | `INSTRUMENT NEUF` | la **planche** qui porte la fiche est un **aplat brun sans grain et sans filet** là où la maquette est du kraft grainé à **double** encadrement | `m05a` : 6 fenêtres de 100×60 sur la planche du jeu → médiane **(74, 55, 34)** et grain σ(lum) = **0,00000** aux six ; kraft de la maquette (fenêtres 4-6) → (125, 94, 57) / (124, 93, 55) / (115, 86, 51), σ = 0,0093 / 0,0098 / 0,0074. Δ de teinte ≈ **(−48, −36, −20)**. `m05b` : profil horizontal — maquette, transitions à x=17-21 **et** x=39-43 (et symétriques à 1037, 1059-1062) = deux filets ; jeu, **une seule** transition à x=57 et une à x=1023 = aucun filet. Contrôle : la fiche crème rend σ=0,27 dans les deux images | la **taille** de la planche (268×120 px CSS contre 290×224) relève de l'assumé n° 1 — je ne la compte pas |
| `F3` | `E08` ⑭ | `MAJEUR` | `INSTRUMENT NEUF` | le **filet d'or pleine largeur** qui sépare la scène du corps est **absent** | `m05c` : maquette cadre 18 → **14 lignes d'or, y=1135..1148, couleur (176, 141, 62)**, ≥ 880 px de large (3,9 px CSS d'épaisseur) ; jeu → **aucune** ligne d'or entre y=790 et y=900 ; la frontière passe de (30, 33, 37) à (36, 42, 45) sans or | — |
| `F4` | `E11` ⑤ | `MAJEUR` | `INSTRUMENT NEUF` | l'eyebrow « CE QUI PÈSE LE PLUS … » quitte le tapis pour la carte, l'**or devient rouge brique** et le centrage devient un calage à gauche | `m10b` : maquette — encre **(241, 200, 105)** sur le feutre (37, 81, 56), x=162..909 (centre 535,5 pour un écran centré sur 540), **au-dessus** de la carte, 5,71:1. Jeu — encre **(147, 64, 42)** sur la carte crème (219, 206, 171), x=136..696 (calé à gauche), **dans** la carte, **4,47:1** (doctrine : 4,5:1 pour les petits textes). Cause commune avec `F5` | le texte diffère (« CE SOIR » / « AUJOURD'HUI ») : valeur servie, non comptée |
| `F5` | `E11` ⑤ | `MAJEUR` | `INSTRUMENT NEUF` | le **liseré intérieur de la carte** est rouge là où la maquette le fait or | `m05d`, profil horizontal au travers du bord gauche : maquette → or sombre (107, 74, 18) 3 px, crème (251, 243, 220) 13 px, **or (176, 141, 62) 3 px**, face (238, 227, 195). Jeu → (138, 106, 44) 4 px, crème (219, 206, 171) 5 px, **rouge (147, 64, 44) 3 px**, face (219, 206, 171). Δ sur le filet intérieur : **(−29, −77, −18)**. Même rouge que `F4` ⇒ une seule cause : la couleur d'accent de la carte | — |
| `F6` | `E01` ㊳ | `MAJEUR` | `INSTRUMENT NEUF` | la bande « Lt. Marr attend vos ordres — trancher » **recouvre l'arc inférieur de l'anneau d'or du manomètre** | `m08` : ㊳ et ㉚ sont identiques à **0 px** au-dessus de y=190 ; entre y=190 et 300, **67,5 %** des pixels diffèrent (lignes 215..289). Les pixels d'or de l'arc, présents sur ㉚ de **y=215 à y=231** (jusqu'à 18 px de large par ligne), sont **absents** sur ㊳. Le losange ◆ (y=185..201), lui, est intact des deux côtés | si la bande est voulue sur cet écran (aucun des six cadres ㊳ ne la porte) ; le recouvrement du chrome, lui, est mesuré |
| `F7` | `E02` ㉞ | `MAJEUR` | `INSTRUMENT NEUF` | le geste principal est en **casse de phrase** et en mauve désaturé, là où la maquette et les onze autres gestes du jeu sont en **capitales or** | `m12b`, hauteurs des 4 premiers glyphes : maquette « LANCER LA SOIRÉE » **25 / 25 / 25 / 27** (capitales) ; jeu **26 / 20 / 20 / 20** (capitale puis bas-de-casse). `m06` : encre maquette (217, 171, 78) à 7,91:1 ; jeu **(152, 121, 121)** à **4,69:1** — au-dessus du seuil, donc pas d'écart de doctrine, mais changement de **famille** (or → rose grisé) | si l'écran est dans un état « indisponible » voulu (0 ordre posé) ; aucun des cadres 85-91 ne montre ce geste éteint |
| `F8` | `E02` ㉞ | `MAJEUR` | `INSTRUMENT NEUF` | la puce de geste « Poser un ordre » est un **pavé gris plein** dont le libellé **casse sur deux lignes**, là où la maquette compose ses puces en capitales or filetées | `m12b` : ligne 1 du libellé, hauteurs de glyphes **19 / 17 / 17 / 17 / 17** ⇒ casse de phrase ; le libellé occupe **2 lignes** (y=865..883 puis la suivante). `m06` : fond plein **(209, 203, 184)**, encre (34, 28, 22), 10,39:1. Témoins de la maquette : « REJOUER » et « VOUS Y ÉTIEZ » (cadres 88-91), capitales or interlettrées sur filet | la puce n'a aucun homologue dans les cadres 85-91 (le carnet y est toujours rempli) |
| `F9` | `E10` ㊵ | `MAJEUR` | `INSTRUMENT NEUF` | le libellé du geste est **calé à gauche** dans un cadre pleine largeur, là où la maquette le **centre** | `m12c` : maquette « INJECTER » — encre x=450..625, centre **538** pour un cadre centré sur 540 (écart −2 px) ; jeu « BLANCHIR » — encre x=84..288, centre **186**, écart **−354 px d'image = −98 px CSS**. Témoin positif dans le même script : ㊳ « Y PRÊTER ATTENTION » centré des deux côtés (−2 px / −0 px) | — |
| `F10` | **`ENSEMBLE`** (㉚ ㉘ ㉞ ; ㉛ ㉝ justes) | `MINEUR` | `INSTRUMENT NEUF` | l'**encre secondaire** et le **socle du geste** sont froids partout, alors que la maquette les réchauffe sur les bandeaux bruns | `m07a`, encre du sous-titre : ㉚ (154, 143, 120) → (138, 151, 156), Δ **(−16, +8, +36)** · ㉘ (154, 138, 106) → (138, 151, 156), Δ **(−16, +13, +50)** · ㉞ (154, 143, 120) → (185, 173, 146), Δ (+31, +30, +26) · ㉛ Δ (−3, −2, −10) · ㉝ Δ **(0, 0, 0)**. `m11c`, socle du geste de ㉘ : (26, 17, 8) brun → **(22, 28, 34)** bleu-gris, Δ (−4, +11, +26) ; ㉚ (20, 26, 33) → (22, 28, 34) juste | — |
| `F11` | **`ENSEMBLE`** (6 écrans) | `MINEUR` | `INSTRUMENT NEUF` | la **marge gauche du bandeau de titre** n'est pas constante d'un écran à l'autre | `m12a` : maquette **51 px** (14,2 CSS) sur ㉚ ㉘ ㉛ ㉝ ㉞ et 48 px sur ㉓ ; jeu **59 / 60 / 60 / 48 / 55 / 44 px** (16,4 / 16,7 / 16,7 / 13,3 / 15,3 / 12,2 CSS). Amplitude en jeu : **16 px d'image = 4,4 px CSS** | — |
| `F12` | `E08` ⑭ | `MINEUR` | `INSTRUMENT NEUF` | **deux lignes de texte en trop** sous la jauge (« LA SEMAINE » + « TENSION CALME · AUCUNE SEMAINE ») : l'état est dit trois fois de suite | aucun des **six** cadres 14-19 ne porte de titre ni de sous-titre à cet endroit (planche-contact des cadres 14, 15, 16, 17, 19 + lecture du cadre 18) ; la maquette n'y met qu'une ligne, la légende de jauge. `m02b` : la légende « CALME — VOS AFFAIRES RESPIRENT » est bien présente dans les deux | si un titre d'écran est attendu ici par une règle hors maquette |
| `F13` | `E08` ⑭ | `MINEUR` | `INSTRUMENT NEUF` | la **ligne d'attaque** du panneau d'explication est en **or**, couleur réservée dans la série aux titres de panneau et aux gestes, là où la maquette la fait crème | pixels les plus clairs du bloc : maquette **(234, 224, 200)**, jeu **(242, 201, 106)** — Δ **(+8, −23, −94)** ; le corps du même panneau est (234, 224, 200) en maquette et (185, 173, 146) en jeu | — |
| `F14` | `E08` ⑭ | `MINEUR` | `INSTRUMENT NEUF` | la **tôle** et le fond du panneau sont plus sombres — **classe C** | `m04` : tôle (56, 61, 69) → **(40, 45, 49)**, Δ (−16, −16, −20) ; fond du panneau (56, 61, 68) → (39, 45, 49), Δ (−17, −16, −19). Même famille, même grain (σ 0,20 → 0,16) | — |
| `F15` | `E01` ㊳ | `MINEUR` | `INSTRUMENT NEUF` | le geste principal est grisé **en gardant le libellé de l'état actif** : la maquette, quand elle éteint ce geste, en **change le libellé** | `m06` : maquette cadre 125 (actif) or (242, 201, 107) à **11,22:1** ; maquette cadre 127 (éteint) (42, 54, 72) à **1,46:1** et libellé « RIEN À FAIRE — C'EST ACQUIS » ; jeu (122, 131, 141) à **4,88:1** — au-dessus du seuil de doctrine, donc **lisible**, mais ni l'un ni l'autre des deux états de la maquette | si l'état éteint est l'état juste avec 18 affaires « à la une » : question de données, hors image |
| `F16` | `E09` ⑮ | `MINEUR` | `DOCTRINE` | trois lignes de petit texte du registre sont **sous le seuil de contraste** | `m07c`, rects serrés, cœur de glyphe à 2 % : encre **(106, 105, 95)** sur (233, 230, 216) → **4,42:1** pour « 18 DISTRICTS · TOUT OU RIEN… », « PARTOUT À LA FOIS » et « DISTRICT CHARGE RÉGIME ORIGINES ». Doctrine : ≥ 4,5:1 pour les petits textes. Marge : **1,8 % sous le seuil** | l'estimateur de cœur de glyphe peut sous-estimer l'encre de 1 à 2 % sur un texte de 5 px CSS de capitale ; la mesure qui trancherait : la couleur déclarée dans la CSS |
| `F17` | `E07` ㉓ | `MINEUR` | `INSTRUMENT NEUF` | le **jeton du solde** compose « 50 Marks » d'un seul corps là où la maquette oppose un « 50 » large à des petites capitales interlettrées « MARKS » | `m11b` : cadre du jeton, maquette **297 px (82,5 CSS)**, jeu **227 px (63,1 CSS)** → **−23,6 %** ; la maquette porte deux corps de texte dans le jeton, le jeu un seul | — |
| `F18` | `A01` ④ | `MINEUR` | `INSTRUMENT NEUF` | le **souligné pointillé** des libellés de la file n'est pas repris | `m12d` : maquette cadre 4, sous le titre de rangée 1, une bande d'encre de **3 px (y=1007..1009)** séparée du texte ; jeu, aucune bande entre le titre (y=1040..1078) et la ligne suivante (y=1101..1125) | **je ne peux pas distinguer, depuis l'image, un parti pris de maquette d'une annotation d'atelier** : le pointillé n'apparaît que sur `ecrans-brennar-accueil.html` et sur une partie seulement des textes. Trancherait : la règle `text-decoration` de cette page |
| `F19` | **`ENSEMBLE`** (㊳ ㊵) | `MINEUR` | `INSTRUMENT NEUF` | les **titres de panneau** sont un cran plus hauts — **classe C** | `m03b`, capitale du 1ᵉʳ glyphe : ㊳ « Le journal » 45 → **50 px** (+11,1 % ; 12,5 → 13,9 px CSS) · ㊵ « La filière » 45 → **51 px** (+13,3 % ; 12,5 → 14,2 px CSS). Les sous-titres de ces deux panneaux suivent : 21 → 24 px et 18 → 21 px | — |

---

## Écarts ASSUMÉS — inventoriés, **non comptés**, vérifiés « rendus proprement »

| n° | ce qui est assumé | rendu proprement ? |
|---|---|---|
| 1 | ㉘ état « aucun relais » : bandeau visible, planche bornée portant « D'OÙ ÇA PART » | bandeau ✓ ; planche présente, **268 × 120 px CSS** (x=57..1022, y=791..1223), fiche de 34 px CSS ✓. **Le geste « ACHETER UN RELAIS » est PRÉSENT** sur la planche 2400 — la ligne 1 de la table du dossier dit le contraire (« il n'apparaît pas »), le `journal.tsv` et l'addendum du tour 3 disent « AVEC le geste d'achat » : **ce sont eux qui ont raison**. ⚠️ la **matière** de la planche, elle, n'est pas rendue proprement ⇒ `F2` |
| 2 | ㉘ sous-titre 2 phrases → 1 | **non vérifiable** : un seul état capturé ✓ (noté en § 6) |
| 3 | ㊳ compteur « en cours » à 00 | lu sur la planche : « **18** À LA UNE · **01** DANS LA RUE · **00** EN COURS » ✓ |
| 4 | ㊳ étiquette d'angle non servie | ⚠️ **l'assumé est périmé** : les cartes portent « ANGLE HUMAIN », l'étiquette **est** servie, et elle est rendue proprement ✓ |
| 5 | ㊳ noms de journaux en français | « LE CLAIRON DE BRENNAR », « LA FEUILLE LIBRE », « LA SEMAINE DE TILBEY » ✓ ; conséquence prise au sérieux : **aucun texte anglais ni clé technique trouvé sur les planches lues** |
| 6 | ⑭ état vide, cadre 18 pour témoin | ✓ |
| 7 | ⑭ deux libellés en repli sur un littéral | **forme vérifiée** : « TENSION » capitale 22 px = maquette, interlettrage/h 0,644 contre 0,598 ; la légende tient sur une ligne, lisible ✓ |
| 8 | ⑮ état vide, cadres 31/33/34 | ✓ — et le liège tombe à Δ (−1, −2, −2) du cadre 31 |
| 9 | ⑮ « budget coupé » en capitales dans 52 px | **introuvable** sur les deux planches ⑮ (2400 et 1920) : la question de lisibilité qui m'est posée ne porte sur rien de visible dans ce jeu ⇒ § 6 |
| 10 | ㊵ le panneau « qui se lit comme un trou » | ✓ — le cadre 140 porte la même boîte vide ; le jeu la reproduit |
| 11 | ⑤ carte fabriquée | ✓ |
| 12 | ⑤ geste « laisser sur le tapis » retiré | ✓ — **pas de trou** : les deux filets d'or qui l'encadraient dans la maquette sont partis avec lui et une ligne en italique prend la place |
| 13 | ㉓ bloc Wexler absent | ✓ — rien d'inventé, **pas de cercle vide** ; la bande basse est simplement absente |
| 14 | ④ carte de tête jugée contre le cadre 5 | ✓ (mais voir § 6 : le PNG du cadre **4** est antérieur à l'atelier `7d88a65`) |
| 15 | valeurs de compte neuf dans le HUD | ✓ — et la **forme** du HUD est identique sur les 13 planches 2400 |
| r3 | voix en pied absente sur ㉛ ㉘ ㉝ ⑮ ㉞ | ✓ — sur ㉛ et ㉝ la bande basse reste présente et porte le geste : pas de trou |
| r3 | ㉘ fiche « D'OÙ ÇA PART » sur phrase servie | ✓ « Aucune route tendue pour l'instant. » |
| r3 | ⑮ liège borné sous la scène | ✓ présent, **342 px CSS** aux deux résolutions (l'addendum annonce 400) |
| r3 | ㊳ trois titres de une sur le même sujet | ✓ consigné, non compté |

---

## 5. Autres résolutions

**Les deux résolutions ont été jugées.** Mesures `m09`, lecture des planches `_bas`.

- **1080×1920, chrome** : le bandeau haut est **identique au pixel près** à celui de 2400 sur 11
  écrans sur 13 ; ⑭ et ⑤ diffèrent de 56 et 46 px (**0,03 %**), dans le décor derrière le manomètre.
  Le dock est à **58 px du bas** sur les 26 planches. Aucun écart propre à la résolution sur le chrome.
- **⑭ à 1920** : le corps défile ; la 3ᵉ ligne du panneau d'explication est **coupée en deux par le
  fondu de défilement**, l'ascenseur est visible. Le journal l'annonce (débordement de 125,5 u) et
  la planche `_bas` **ferme** le contenu (« s'ouvre. » lisible). Pas d'écart propre.
- **㉛ et ㉝ à 1920** (débordement de 323,3 et 234,4 u) : les planches `_bas` closent, le geste est
  entièrement visible dans les deux cas.
- **㉞ aux deux résolutions** : la rangée 8 du carnet est **coupée en deux au repos** ; `_bas` ferme
  et révèle « Il faut au moins quatre ordres pour une soirée. » Comportement de liste, pas un écart.
- **㊳ et ㉓** : débordent aux deux résolutions, `_bas` ferment aux deux.
- **⑮** : le liège mesure **1231 px d'image aux deux résolutions** (342 px CSS) — invariant ✓.
- Rien hors cadre, rien sous le dock, aucun texte qui sorte de son parent, à aucune des deux
  résolutions.
- Les neuf MAJEUR et les dix MINEUR de la table se retrouvent **inchangés** à 1920 (vérifié à l'œil
  sur ⑭ et ⑮ ; le reste par identité du chrome et des blocs).

---

## 6. Non vérifié

1. **L'animation.** Le dossier le dit : les captures T et T+1 s n'ont pas été prises. Un juge ne peut
   pas trancher. *Trancherait :* deux captures du même écran à une seconde d'intervalle.
2. **Le PNG de référence `A01-cadre-4-la-suite.png` est antérieur à l'atelier `7d88a65`.** Le
   `journal.tsv` de A01 le dit lui-même : ce commit a porté la ligne haute du cadre 4 de 424 à 506 u,
   « la raison + "Plusieurs attendent encore" ». Le cadre fourni ne porte **ni** la raison **ni**
   cette mention ; les quatre planches A01, si. Je n'ai donc **pas pu juger la ligne de file de ④
   contre son homologue**. *Trancherait :* re-rendre le cadre 4 à l'atelier `4bd3ea2`, comme les
   quinze PNG neufs de ce tour.
3. **⑮ « budget coupé ».** L'assumé n° 9 me pose explicitement la question de sa lisibilité
   (capitales dans une colonne de 52 px). **Je ne l'ai trouvé sur aucune des deux planches ⑮.**
   *Trancherait :* une capture de l'état où ce libellé s'affiche.
4. **La famille de police du titre de la fiche de ㉘.** La maquette la compose en sérif et aligne à
   gauche, le jeu paraît la composer en linéale et centrer — je n'ai **pas** réussi à chiffrer le
   bord de l'encre sans que ma fenêtre le rogne, donc je ne le compte pas. *Trancherait :* la largeur
   d'encre d'un même mot à hauteur de capitale égale, ou la CSS de la fiche.
5. **㉘, les trois rangées « LE CHEMIN / À TRAVERSER / CETTE ROUTE »** du cadre 54 sont absentes de la
   planche. L'état « aucun relais » n'ayant **aucun cadre**, je ne peux pas dire si leur absence est
   voulue ; je ne la compte pas.
6. **⑭, le cran « écrasante »** de la jauge : aucun cadre, donc non jugeable (dossier, point 2).
7. **Les états « inactif » de ㊳ et ㉞** : savoir s'ils sont les états justes est une question de
   données, pas d'image. *Trancherait :* un `juge-donnees` sur ces deux écrans.
8. **Le souligné pointillé de l'accueil** (`F18`) : parti pris de maquette ou annotation d'atelier ?
   *Trancherait :* la règle `text-decoration` de `ecrans-brennar-accueil.html`.
9. **Deux incohérences du dossier lui-même, signalées parce qu'elles ont pu orienter mes témoins** :
   le fichier porte en tête « **r2** » alors que le répertoire et les assumés ajoutés sont du **tour 3** ;
   et le `journal.tsv` renvoie, pour ⑭, aux cadres **25 / 29 de `ecrans-brennar-4.html`** alors que le
   dossier impose les **cadres 14-19 de la série 6** et le cadre **18** pour témoin. **J'ai suivi le
   dossier**, qui fait autorité.
10. **Les six planches `E12_Dossier_*`** : non ouvertes, conformément à la consigne.

---

## Annexes

### Annexe 1 — Inventaire de la référence (couche globale)

Chrome du HUD, commun aux 54 cadres : fond (10, 14, 22) à (16, 22, 36) · « ARGENT » capitale 21 px,
largeur d'encre 134 px, gouttières entre glyphes 8/7/10/9/8 px (interlettrage/h = **0,400**) ·
anneau d'or du manomètre D = 194 px, x=443..636, épaisseur de l'anneau 7 px · filet d'or sous le HUD
**uniquement** sur les cadres de `ecrans-brennar-accueil.html` (A01 4 et 5, y=143..145) · dock
visible **uniquement** sur ces mêmes cadres, pastille D = 200 px.
Matières : kraft de ㉘ (122, 91, 54) σ=0,009 · liège de ⑮ (116, 88, 47) · tôle de ⑭ (56, 61, 69) ·
feutre de ⑤ (38, 84, 60) · fond commun bleu nuit (13, 19, 29).
Or de la série : **(242, 201, 106)** pour les titres de panneau et les gestes ; **(176, 141, 62)**
pour les filets et liserés.
Bandeau de titre (㉚ ㉘ ㉛ ㉝ ㉞) : titre sérif, capitale 31-33 px, calé à **51 px** ; sous-titre
linéale, capitale **19 px** (rapport 1,68-1,74), encre accordée à la chaleur du bandeau.

### Annexe 2 — Inventaire de la capture (couche globale)

Chrome, **identique sur les 13 planches 2400 et les 13 planches 1920** : « ARGENT » capitale 19 px,
largeur 107 px, gouttières 3/3/5/4/3 (interlettrage/h = 0,189 — **substitution de police**, cf.
contrôle négatif) · anneau D = 184 px, x=448..631 · filet d'or y=141..142 sur 776 px · losange ◆
y=185..201 · dock pastille D = 203-204, libellé à 58 px du bas.
Matières : planche de ㉘ **(74, 55, 34) σ=0,00000** · liège de ⑮ (115, 86, 45) · tôle de ⑭
(40, 45, 49) · feutre de ⑤ (33, 84, 58) · fond commun (14, 19, 29).
Or : (242, 201, 106) pour les titres de panneau, les gestes **et** la ligne d'attaque du panneau de
⑭ ; (176, 141, 61) pour le liseré du tapis de ⑤ ; **(147, 64, 44)** pour le liseré intérieur et
l'eyebrow de la carte de ⑤.
Bandeau de titre : titre capitale 33-34 px, calé à 44/48/55/59/60/60 px ; sous-titre capitale
**19 px (㉝) ou 27-29 px (㉚ ㉘ ㉛ ㉞)**, encre unique (138, 151, 156) ou (185, 173, 146).

### Annexe 3 — Correspondance des repères, et provenance

- **Échelle du dossier, appliquée telle quelle** : référence 1080 px = 300 px CSS = ×3,6 ; capture
  1080 px = 300 px CSS = ×3,6 ⇒ **1 px CSS = 3,6 px d'image des deux côtés**, rapport 1,000 en X.
  Aucune mesure de ce rapport n'a été comparée en px Y absolus : toutes les grandeurs citées sont des
  invariants (hauteur de capitale, épaisseur de filet, couleur, rapport largeur/hauteur, écart au
  centre d'un cadre, écart-type de luminance) ou sont ramenées en px CSS.
- **Les 54 PNG de `reference/` sont tous 1080×2102** — vérifié fichier par fichier :
  `python3 -c "…Image.open(f).size…"` → `(1080, 2102) 54 · TOTAL 54`.
- **Les 35 empreintes sha256 du dossier ont été vérifiées une à une** sur le répertoire de captures
  (`sha256sum *.png | cut -c1-12`) : les 35 correspondent, aucune exception. Les six
  `E12_Dossier_*` n'ont pas été ouvertes.
- Chaque script de `mesures/` imprime `[OUVRE] <fichier> <largeur>x<hauteur>` pour chaque image ;
  ces tailles sont celles de ce dossier.

### Annexe 4 — Scripts

| script | ce qu'il mesure |
|---|---|
| `mesures/outils.py` | boîte à outils (médiane de fenêtre, bbox d'encre, profil de lignes, luminance, contraste WCAG, palette quantifiée, px CSS) |
| `mesures/m01_chrome_hud.py` | chrome du HUD sur les 13 planches 2400 et les 13 cadres nominaux |
| `mesures/m02_interlettrage.py`, `m02b_interlettrage.py` | interlettrage et hauteur de capitale sur 13 mots appariés |
| `mesures/m03_bandeau_titre.py`, `m03b_bandeau_titre.py` | bandeau de titre : capitale du 1ᵉʳ glyphe, titre et sous-titre, 7 écrans |
| `mesures/m04_fonds_matieres.py` | matières : médiane + grain (écart-type de luminance) sur ㉘ ⑮ ⑭ ⑤ |
| `mesures/m05_e04_plaque_e08_filet.py` | planche de ㉘ en 6 fenêtres, cadre de la planche, filet d'or de ⑭, bordure de la carte de ⑤ |
| `mesures/m06_contrastes.py` | contrastes texte/fond sur l'art réel, 14 blocs |
| `mesures/m07_encre_seconde_et_gouttiere.py` | encre secondaire des 5 bandeaux, bords d'encre, petit texte de ⑮ |
| `mesures/m08_bandeau_e01_sur_chrome.py` | ce que la bande de ㊳ recouvre (diff pixel à pixel contre ㉚) |
| `mesures/m09_1920.py` | seconde résolution : chrome 2400 contre 1920, dock, planches `_bas` |
| `mesures/m10_e09_liege_e11_bandeau.py` | liège de ⑮ aux deux résolutions, eyebrow et inclinaison de la carte de ⑤, liseré du tapis |
| `mesures/m11_divers.py` | dock, jeton de ㉓, socle du geste, luminance du décor de A01 |
| `mesures/m12_marges_casse_souligne.py` | marges de bandeau, casse des libellés, alignement des gestes, souligné pointillé |

---

## Auto-audit du verdict

J'atteste avoir **réellement** vérifié ce que j'affirme : les 35 empreintes sha256 ont été recalculées
et comparées une à une à celles du dossier ; les 54 tailles de référence ont été relues par script ;
chaque chiffre de la table § 3 vient d'un script de `mesures/`, pas d'une lecture à l'œil. Les trois
affirmations que je ne tire **pas** d'une mesure — la famille de police de la fiche de ㉘, la nature
du souligné pointillé de l'accueil, et l'état attendu des gestes éteints de ㊳ et ㉞ — sont en § 6 et
**ne sont comptées nulle part**. Le compte **0 BLOQUANT / 9 MAJEUR / 10 MINEUR** se lit dans la table
du § 3 et nulle part ailleurs.
