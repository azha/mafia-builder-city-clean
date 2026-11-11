# Juge visuel ⊥ — ④ L'ouverture : carte de tête QUI AGIT + après-geste ⑤ — fin d'écran — 2026-11-11

Juge NEUF, contexte vierge. N'a lu : ni `Assets/Scripts`, ni notes d'implémentation, ni
`Tools/juge-visuel/04-accueil/r*`, ni `Tools/juge-visuel/ensemble-decor/*`, ni
`Tools/juge-donnees/**`, ni aucun `REVUE*.md`. Entrées : `dossier.md`, `reference/` (3 PNG +
`variantes-textes-8f59cf94.txt`), `captures/` (14 PNG + `journal.tsv`). Aucun Unity lancé, aucune
porte prise. Instruments : `mesures/m01…m17*.py` (PIL seul ; numpy absent), sorties collées en
annexe 4.

## Verdict : NON APPROUVÉ

Le tampon « TRANCHÉE » du jeu est **opaque** là où celui de la maquette est **translucide** : le
titre de la carte, qui est le sujet de l'écran, n'est plus lisible (2,9 % de pixels de texte sous
la plaque contre 32,0 % dans la maquette) ; et un **disque rouge de 35,3 px CSS qui n'existe dans
aucune des trois références** est posé sur le coin haut-droit de la carte, où il mange la dernière
lettre de la ligne grave sur 5 des 6 états.

Compte lu dans la table du §3 : **9 findings de classe A/B** (1 BLOQUANT, 4 MAJEURS, 4 MINEURS) et
**5 de classe C**.

## Réponse au point ouvert du dossier (§ POINT OUVERT À JUGER)

> *« Sur G01 et G06, le tampon “TRANCHÉE” semble recouvrir le titre “Des routes coupées”.
> Mesure-le et classe-le : défaut perçu (A/B) ou fidèle à la maquette (cadre 6) ? »*

**La GÉOMÉTRIE est fidèle, la MATIÈRE ne l'est pas — et c'est la matière qui décide.**

1. **Le recouvrement géométrique est voulu et conforme.** Dans la maquette comme dans le jeu, le
   tampon est posé **au centre exact de la carte** et croise le titre : centre du tampon à y=1070,5
   pour un centre de carte à y=1070 (maquette) ; y=1428,5 pour 1428 (G01). Écart 0,5 px des deux
   côtés. Le tampon QUI CROISE LE TITRE n'est donc pas un défaut (m05, m04).
2. **Mais la plaque du tampon de la maquette est TRANSLUCIDE : le titre se lit à travers.**
   Fenêtre entièrement intérieure à la plaque, posée sur le titre, pixels de texte (plus sombres
   que la plaque, hors rouge brique) : **maquette 32,0 %** · **G01 2,9 %** · **G06 2,9 %**.
   Contrôles du même instrument : texte nu hors plaque 15,2 % (réf) / 27,0 % (jeu) ; champ vide de
   la carte 0,9 % (réf) / 0,0 % (jeu). Les 2,9 % du jeu sont **au niveau du contrôle négatif**
   (m09).
3. **Conséquence lisible :** encre de titre survivante, même carte avec et sans tampon —
   **maquette 32,4 %**, **G01 22,1 %**, **G06 22,0 %** (m07, contrôles +A 0,4 % et +B 0,0 %). À
   l'œil (crops `mesures/crops/ref_cadre6_carte.png` vs `cap_G01_carte.png`) : la maquette laisse
   lire *« Des locaux à remettre en état »* en entier ; le jeu laisse *« Des »* et un moignon.

⇒ **Classe A/B, gravité BLOQUANT** (finding `F1`). La maquette ne fait **pas** pareil : elle
recouvre sans effacer.

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence | jeu | script |
|---|---|---|---|---|
| 1 | tailles lues de **toutes** les images | 1080×2102 ×3 | 1080×2400 ×7, 1080×1920 ×7 | m01 |
| 2 | garde anti-vide (pixels non noirs) | 98,1 – 98,6 % | 99,1 – 100,0 % (seuil 5 %) | m01 |
| 3 | largeur du panneau vert | 298,3 CSS | 300,0 CSS | m02 |
| 4 | hauteur de la carte | 212,8 CSS | 212,5 CSS | m04 |
| 5 | marge gauche carte ↔ bord d'écran | 20,6 CSS | 19,7 CSS | m04 |
| 6 | hauteur de capitale de la ligne grave | 25 px = 6,9 CSS | 25 px = 6,9 CSS | m10b |
| 7 | feutre vert, point haut-droit (0,90/0,25) | (28, 75, 52) | (28, 74, 52) | m12 |
| 8 | jeton d'or, couleur du mot-or | (242, 201, 107) | (242, 201, 106) | m11 |
| 9 | diamètre du jeton | 152 px = 42,2 CSS | 150 px = 41,7 CSS | m18 |
| 10 | aplat du bouton or | (230, 192, 102) | (229, 191, 100) | m13a |
| 11 | largeur du bouton or | 420 px = 116,7 CSS | 410 px = 113,9 CSS | m18 |
| 12 | contraste du mot de valeur (`modérée`/`majeure`) | 10,50:1 | 10,52:1 | m13b |
| 13 | contraste du titre de la carte de tête | 11,90:1 | 11,91:1 | m11 |
| 14 | contraste « CE QU'ON PEUT FAIRE » | 8,51:1 | 8,51:1 | m11 |
| 15 | contraste des conséquences sous les gestes | 8,69:1 | 8,63:1 | m11 |
| 16 | contraste de la ligne grave sur feutre | 6,34:1 | 6,51:1 | m11 |
| 17 | contraste du jeton « LIBRE » | 8,33:1 | 8,67:1 | m11 |
| 18 | hauteur du bloc titre / hauteur de carte | 0,154 | 0,148 | m07, m16 |
| 19 | 1920 vs 2400 : carte, panneau, disque | — | identiques au px près | m04, m05 |
| 20 | mots bannis « session » / « structurelle », codes bruts | aucun | **aucun** sur les 7 états | lecture des 14 PNG |

Note sur 20 : le mot affiché sur G05 est « votre décision **de structure** d'aujourd'hui », pas
« structurelle » — la liste fermée du dossier n'est donc pas enfreinte ; je le signale sans le
compter comme finding.

## 0. L'écran, tel que la maquette le dit

**But.** ④ : trancher la décision du jour — une carte, deux gestes, une conséquence écrite sous
chacun. ⑤ : dire ce que le geste a produit, et rendre la main.

**Ordre de lecture (cadre 5).** 1) le titre or au centre du panneau ; 2) les deux boutons, dont
l'or désigne l'action engageante ; 3) les deux conséquences, soulignées en pointillé, qui font le
prix de chaque geste. Le chrome (argent, jour, jauge) et la file basse sont périphériques.

**Ordre de lecture (cadre 6/7).** Le tapis vert prend tout l'écran : 1) la ligne grave en
petites capitales or (« VOUS AVEZ TRANCHÉ » / « LA CARTE RESTE SUR LA TABLE ») ; 2) la carte de
papier, avec son titre et, si elle est tranchée, le tampon en travers ; 3) le mot-or sous la carte
(or = fait, saumon = rien n'est parti) ; 4) la ligne-or entre deux filets. Le jeton d'or à droite
dit si la grande décision du jour est encore disponible.

**Traits d'identité.** (a) le tapis **vert feutre** à vignette, rupture totale avec la nuit bleue
de ④ ; (b) la **carte de papier crème** posée dessus, presque blanche ; (c) le **tampon encré
translucide**, objet de papeterie, pas un bandeau ; (d) l'**or** comme seule couleur d'action ;
(e) le **jeton frappé** à droite.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le gabarit est là, et il est bon : panneau, carte, mot-or, ligne-or, jeton, tous à leur place et
aux bonnes proportions (20 grandeurs égales ci-dessus, dont la hauteur de carte à 0,3 px CSS près
et la hauteur de capitale de la grave au pixel). Le passage de ④ à ⑤ se lit : la nuit bleue cède
au feutre vert, l'œil tombe sur la ligne grave puis sur la carte. Les deux résolutions donnent le
même écran.

Trois choses cassent la lecture, par ordre d'impact perçu.

**1. La carte n'a plus de titre quand elle est tranchée.** Dans la maquette, le tampon est une
encre posée sur du papier : on lit *à travers*. Dans le jeu c'est une **étiquette opaque** collée
par-dessus — 22 % de l'encre du titre survit, et ce qui survit (« Des ») ne dit rien. Le joueur
vient de trancher *quelque chose* dont l'écran ne lui redit plus le nom. C'est le trait d'identité
(c) qui tombe, et avec lui le sens de la vignette.

**2. Un objet rouge que la maquette ne dessine nulle part.** Un disque rouge vif de 35,3 px CSS
(12 % de la largeur d'écran) est posé à cheval sur le coin haut-droit de la carte, sur les 6
états. Aucune des trois références ne porte quoi que ce soit de comparable. Il est le deuxième
point de fixation de l'œil après la grave — devant la carte — alors qu'il ne porte aucune
information nouvelle (il redouble le losange ♦ TACTIQUE déjà présent en haut à gauche). Et il
**mange du texte** : la dernière lettre de la ligne grave sur G01, G02, G03, G05, G06.

**3. Le papier a perdu sa blancheur, et la lisibilité avec.** La carte de la maquette va de
(244,234,206) en haut à (231,217,180) en bas ; celle du jeu est un aplat de (219,206,171). Le
papier devient carton. La conséquence n'est pas esthétique : « PORTÉE / URGENCE » tombe à
**3,91:1** et la pastille « DÉJÀ TRANCHÉE » à **4,45:1**, sous le plancher de 4,5:1 du dossier,
alors que la maquette tient à 6,02:1 et 6,14:1.

Le reste de la couche globale tient : l'or est le même jeton de couleur à 1/255 près, le feutre a
exactement la même teinte de base, les contrastes du feutre et du chrome sont tous au-dessus du
plancher, et la palette ne change pas de famille.

## 3. Écarts — table unique, un finding par ligne

Classe entre crochets : **A/B** = ce qu'un joueur perçoit (fond, matière, élément absent, texte,
geste, lisibilité) · **C** = pixel ou nuance (consigné, ni correctif ni tour).

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | BLOQUANT | NOUVEAU | **[A/B]** La plaque du tampon « TRANCHÉE » est **opaque** ; celle de la maquette est translucide et laisse lire le titre. Sur G01/G06 le titre « Des routes coupées » est détruit : seul « Des » reste lisible. | Pixels de texte sous la plaque : maquette **32,0 %** · G01 **2,9 %** · G06 **2,9 %** (contrôles : texte nu 15,2 / 27,0 % ; champ vide 0,9 / 0,0 %) — `m09`. Encre de titre survivante : maquette **32,4 %**, G01 **22,1 %**, G06 **22,0 %** (contrôles +A 0,4 %, +B 0,0 %) — `m07`. Crops `ref_cadre6_carte.png` / `cap_G01_carte.png`. | L'alpha réellement demandé par la CSS du tampon (`m09` mesure le pixel résultant, pas l'alpha) ; la conversion sRGB→linéaire peut expliquer une plaque plus dense, pas une plaque **pleine**. |
| `F2` | MAJEUR | NOUVEAU | **[A/B]** Un **disque rouge vif EN TROP** (Ø 35,3 px CSS, losange or au centre) à cheval sur le coin haut-droit de la carte, sur les 6 états après-geste. Aucune des 3 références ne le dessine. | Disque : bbox x 611..737, L=127 px = **35,3 CSS**, H=127–128 px, identique sur les 12 PNG G0x (2400 **et** 1920). Références : **aucune** tache rouge vif ≥ 2000 px dans cadre-5 ni cadre-7 ; la seule de cadre-6 est le tampon lui-même (bbox 70..729 × 894..1247). Contrôle positif du masque : il retrouve le petit ♦ TACTIQUE (aire 318 px) dans la référence — `m05`. | Ce que cet élément est censé dire (aucune maquette ne le porte ; `journal.tsv` ne le nomme pas) ; s'il est un état (`.deja`, rang, suite) ou un décor. |
| `F3` | MAJEUR | NOUVEAU | **[A/B]** Ce disque **coupe la ligne grave** : la dernière lettre passe derrière lui sur G01, G02, G03, G05, G06. | Hauteur d'encre des lettres de la grave : maquette cadre-6 = 15 lettres à **25–26 px**, aucune courte. Jeu : G01 `21` · G02 `21` et `17` · G03 `21` · G05 `18` · G06 `21` et `17`, pour une médiane de **25 px** des deux côtés — soit jusqu'à **−32 %** de hauteur de lettre — `m10b`. Crops `cap_G05_grave_disque.png`, `cap_G02_grave_disque.png`. | Si le même recouvrement se produit sur des libellés plus longs que ceux capturés (p. ex. une grave traduite) : aucune capture d'un autre libellé. |
| `F4` | MINEUR | NOUVEAU | **[A/B]** Sur **G04**, ce disque **sort du panneau vert** et est dessiné sur le décor, au-dessus du liseré or (règle de gouttière : « le contenu reste dans le rect du fond ; seul le chrome traverse »). | Liseré or du panneau y=**1094** ; haut du disque y=**1085** ⇒ **+9 px = +2,5 px CSS hors du panneau**. Sur les 5 autres états le disque est 73–74 px **sous** le liseré. Contrôle positif du repère : le même détecteur retrouve le liseré de cadre-6 à y=532 et de cadre-7 à y=649 (m04 donnait 542 / 659, l'écart est l'épaisseur du liseré) — `m10a`. Crop `cap_G04_haut_panneau.png`. | Le débord de l'**ombre** du disque (plus haut que le disque lui-même) n'est pas chiffré : le masque ne retient que le rouge vif. |
| `F5` | MAJEUR | NOUVEAU | **[A/B]** Le **contraste des petits textes de la carte passe sous le plancher de 4,5:1** du dossier. | « PORTÉE / URGENCE » : maquette **6,02:1** → jeu **3,91:1**. « TACTIQUE » : **6,14:1** → **4,47:1**. Pastille « DÉJÀ TRANCHÉE » (G03) : **4,45:1**. Contrôles de l'instrument : « Aube » blanc/noir **14,17:1**, feutre uni sans texte **1,06:1** — `m11`, `m13b`, `m14a`, `m18`. | Le plancher applicable si ces libellés comptaient comme « grands textes » (3:1) : leur hauteur de capitale est 7,5 px CSS, je les traite en petits textes. |
| `F6` | MINEUR | NOUVEAU | **[A/B]** Le **papier de la carte** est plus sombre et **plat**, là où la maquette a un dégradé clair. Cause commune de `F5`. | Maquette cadre-7 : (244,234,206) en haut → (231,217,180) plus bas (dégradé). Jeu G02 : **(219,206,171) dans les deux fenêtres** (aplat ; contrôle négatif : 2 fenêtres du même aplat, écart 0/255). Δ jusqu'à **(−25, −28, −35)** — `m12`. | Si l'écart vient d'un espace de mélange (sRGB/linéaire) ou d'un jeton de couleur différent : le pixel résultant ne départage pas. |
| `F7` | MAJEUR | NOUVEAU | **[A/B]** **G05 : l'amorce « Rien n'est parti : » manque** au mot-or. La maquette cadre-7 écrit *« Rien n'est parti : ça n'a pas pu se faire pour l'instant. »* ; le jeu écrit seulement *« Votre décision de structure d'aujourd'hui est prise. Reprenez demain. »* | Lecture de l'image à taille réelle, crops `ref7_mot.png` / `capG05_mot.png`. `variantes-textes-8f59cf94.txt` ligne 7 impose « Rien n'est parti : {phrase joueur} ». `journal.tsv` G05 confirme le texte affiché sans amorce. | Si l'amorce est l'une des « 2 phrases du cadre 7 sans clé servie » de **TD-937** : les deux (PROPOSÉ) du fichier de variantes sont la grave et la sous-ligne, **toutes deux affichées** — l'amorce serait donc une 3ᵉ. À trancher hors image (table des clés servies). |
| `F8` | MINEUR | NOUVEAU | **[A/B]** Les **soulignés pointillés** de ④ sont **absents** : sous « CE QU'ON PEUT FAIRE » et sous chaque ligne de conséquence. | Profil ligne par ligne sous « CE QU'ON PEUT FAIRE » : maquette, rangées y=1102..1105, n=**203** px clairs sur une largeur de **405** px en **102 plages de 2 px** (un pointillé de 4 px d'épaisseur) ; capture, rangées 1533..1559 : **n=0 partout**. Sous la dernière conséquence : maquette y=1447..1449, n=167 en **56 plages** sur 332 px ; capture : rien sous y=1855 — `m15`. | Si le pointillé est un `text-decoration` que la police embarquée ne sait pas poser, ou un élément non porté. |
| `F9` | MINEUR | NOUVEAU | **[A/B]** Les petits libellés de la carte sont en **linéale** dans le jeu, en **sérif** dans la maquette (« PORTÉE », « URGENCE », « majeure »/« modérée », « TACTIQUE ») ; le titre, lui, reste sérif des deux côtés. | **Non chiffré** : le discriminateur sérif/linéale que j'ai écrit a **raté ses propres contrôles** (témoin linéale R=6,23 contre témoin sérif R=0,10, séparation inversée par les hampes et l'interligne) — `m13c` ; je l'écarte. Preuve retenue : crops `ref7_pied.png` et `capG02_pied.png`, à la même échelle. | La famille que la CSS demande réellement et celle que le client substitue. `fc-match` du dossier ne couvre que le chrome (Georgia, Segoe UI) : il ne dit rien de la carte. |
| `F10` | MINEUR | NOUVEAU | **[C]** Le **titre tombe plus bas dans la carte** : il commence à 0,420 de la hauteur de carte au lieu de 0,346. Aggrave `F1` (il se centre là où le tampon passe). | Haut d'encre du titre : maquette cadre-7 y=1071 dans une carte y=806..1571 ⇒ **0,346** ; jeu G02 y=1463 dans une carte y=1142..1906 ⇒ **0,420**. Δ = 0,074 × 212,5 CSS = **+15,7 px CSS** — `m07`, `m16`. Hauteur du bloc titre quasi égale (0,154 vs 0,148). | Si la maquette centre le titre sur la zone haute et le jeu sur la carte entière : deux titres de longueurs différentes ne le départagent pas seuls. |
| `F11` | MINEUR | NOUVEAU | **[C]** La **vignette du feutre** est plus faible : le tapis ne s'assombrit pas autant vers le bas et le bord gauche. Teinte de base **identique**. | Points homologues (fraction du panneau) — bas 0,50/0,93 : maquette **(10,35,24)** → jeu **(17,50,35)** ; bord gauche 0,03/0,55 : (25,57,39) → (23,65,45) ; haut-droit 0,90/0,25 : (28,75,52) → **(28,74,52)** — `m12`. | Part imputable à la composition linéaire d'Unity sur un dégradé radial recopié en sRGB. |
| `F12` | MINEUR | NOUVEAU | **[C]** Le tampon du jeu est **plus petit** que celui de la maquette (bbox du rectangle tourné). | bbox tampon : maquette **183,3 × 98,3 CSS**, jeu **169,2 × 83,9 CSS** ⇒ −7,7 % en largeur, −14,6 % en hauteur. Le ratio H/L passe de 0,536 à 0,496 (mélange de taille et d'angle) — `m05`. | L'angle de rotation seul : une bbox ne sépare pas taille et angle ; il faudrait l'axe du tampon. |
| `F13` | MINEUR | NOUVEAU | **[C]** La **carte est 4,7 px CSS plus large** et commence 7,5 px CSS plus haut sous la grave. | Carte (bord extérieur) : maquette cadre-7 **181,1 CSS** de large, jeu **185,8 CSS** (+2,6 %) ; haut de carte depuis le haut du panneau : maquette **40,8 CSS**, jeu **33,3 CSS** — `m04`. | Ce qui occupe la distance : l'ombre portée de la carte est incluse des deux côtés mais peut ne pas avoir la même étendue. |
| `F14` | MINEUR | NOUVEAU | **[C]** Le **filet de séparation** au-dessus de PORTÉE est gris dans le jeu, rosé dans la maquette. | **Non chiffré** : mon détecteur de filet n'a trouvé la ligne **ni** dans la référence **ni** dans la capture (seuil trop strict pour un filet de 1 px anticrénelé) — `m16`. Lu sur les crops `ref7_pied.png` / `capG02_pied.png`. | La couleur exacte du filet des deux côtés : à refaire avec un profil de colonne, pas un seuil de rangée. |

**Écarts ASSUMÉS du dossier — vérifiés « rendus proprement », aucun n'est compté ci-dessus :**
`skip` sans geste dessiné → H01 n'affiche **que 2 gestes**, pas de « Pas maintenant » ✔ ·
`superseded`/404 → G04 affiche « Cette carte n'est plus là. » sans grave, mise en page du cadre 6 ✔ ·
pastille `.deja` absente de la maquette → G03 la dessine avec son filet tireté, texte entier, sans
débord (son contraste est compté en `F5`) ✔ · jeton à 3 états sans chiffre → « LIBRE » (G01–G05) et
« PRIS » (G06) rendus avec le petit texte « votre grande décision du jour » ✔ · TD-937, les 2
phrases du cadre 7 sans clé servie → la grave « LA CARTE RESTE SUR LA TABLE » et la sous-ligne
« La carte vous attend encore. » **sont bien affichées** ✔ · aucun libellé de repli visible, aucun
trou, aucun code brut sur les 7 états ✔.

## 5. Autres résolutions

- **1080×2400 (téléphone 20:9, cible)** : jugée en premier ; c'est la résolution de toutes les
  mesures ci-dessus.
- **1080×1920 (art natif)** : **tient**. Carte identique au pixel (x 71..739, L=669 px,
  H/L=1,143), panneau de même hauteur (347,5 / 321,1 / 300,0 / 298,3 / 329,4 / 321,1 CSS selon
  l'état), disque rouge au même x et de même diamètre (`m04`, `m05`). Rien de coupé, rien hors
  cadre, rien qui déborde en bas. **Aucun écart propre à 1920** — et aucun écart de 2400 n'y est
  absent : `F1` à `F4` s'y voient à l'identique (le disque coupe le « É » de « TRANCHÉ » sur
  `G01_…_1080x1920.png`, le tampon efface le titre de la même façon).
- Différence attendue et non comptée : 1920 montre moins de décor au-dessus du panneau — c'est la
  hauteur utile qui change, pas la mise en page.

## 6. Non vérifié

1. **Ce qu'est le disque rouge** (`F2`). Aucune maquette ne le porte, `journal.tsv` ne le nomme
   pas. *Mesure hors image qui trancherait* : le cadre de maquette qui le dessinerait, ou la
   ligne du générateur d'atelier qui le déclare — sinon, un geste user.
2. **L'alpha voulu du tampon** (`F1`). Je mesure le pixel résultant, pas l'alpha. *Trancherait* :
   l'opacité de la plaque dans `ecrans-brennar-accueil.html` au SHA `8f59cf94`, convertie en
   linéaire (`ProceduralUI.AlphaSrgbVersLineaire`) et comparée au rendu.
3. **L'amorce « Rien n'est parti : »** (`F7`) est-elle couverte par TD-937 ? *Trancherait* : la
   table des clés servies par le back `35bdd6cb` pour le domaine de l'échec de 1ʳᵉ cible.
4. **La famille de police de la carte** (`F9`). `fc-match` du dossier ne couvre que le chrome.
   *Trancherait* : `fc-match` de la `font-family` déclarée pour la carte, et la police que le
   client embarque pour elle.
5. **L'état vide de la file haute.** H01 affiche « Aucune exception en attente / Personne ne fait
   la queue » en deux lignes nues, là où cadre-5 dessine un panneau bordé avec lieutenant, gravité,
   citation et « TRANCHER ». **Les deux états ne sont pas homologues** (compte neuf, file vide) et
   **aucune référence ne dessine la file vide** : je ne classe pas. *Trancherait* : un cadre de
   maquette pour la file vide, ou une capture avec file peuplée.
6. **Le 3ᵉ état du jeton** (« fermée aujourd'hui ») n'est capturé nulle part ; les pastilles
   PORTÉE/URGENCE ne sont capturées qu'à **3 points pleins sur 3** — l'état « cerclé/vide »
   (modérée, faible) n'est exercé par aucune capture.
7. **Le panneau de nuit de ④** : (18,25,34) côté maquette, (11,17,27) côté jeu — mais le panneau
   est **translucide** et le décor derrière n'est pas le même (ruelle de nuit vs enseigne
   « LE VERGE D'OR »). **Deux variables, aucune conclusion** : je ne le classe pas.
8. **L'animation.** Captures figées, pas de couple T / T+1 s. L'animation est voulue sur les écrans
   neufs ; je n'ai classé aucun pixel comme écart pour cette raison. Le rendu figé ne coupe aucune
   ligne de texte sur un balayage (vérifié à l'œil sur les 14 PNG).
9. **La géométrie des bords du panneau de ④** (`m17`) : mon détecteur de bord a rendu des valeurs
   incohérentes (x=7 côté maquette) parce que le décor éclairé transparaît à travers le panneau
   translucide ; **je n'en rapporte aucun chiffre**. Le bouton or, lui, a été remesuré proprement
   (contrôle positif n° 11).

## Annexes

### 1. Inventaire de la référence (cadre 6, couche globale)
Panneau vert : x 3..1076 (298,3 CSS), liseré or en haut, coins hauts arrondis, vignette radiale
(28,75,52) au centre-haut → (10,35,24) en bas. Carte : 181,1 × 212,8 CSS (cadre-7, non tamponnée),
papier dégradé (244,234,206) → (231,217,180), double filet or, ombre portée. Losange ♦ + « TACTIQUE »
en rouge brique (147,64,44) en haut à gauche. Titre sérif gras noir, 2 lignes, de 0,346 à 0,499 de
la hauteur de carte. Filet rosé, puis PORTÉE/URGENCE (3 pastilles, pleines ou cerclées) et le mot de
valeur en sérif. Tampon : rectangle tourné, cadre rouge brique 2 traits, plaque **translucide**,
bbox 183,3 × 98,3 CSS, centré sur la carte. Jeton : Ø 42,2 CSS, cranté, « LIBRE » or +
« votre grande décision du jour ». Mot-or (242,201,107) centré, 3 lignes. Ligne-or entre deux filets
or. Chrome : bandeau haut, jauge circulaire, barre de 4 pastilles en bas.

### 2. Inventaire de la capture (G01, couche globale)
Même découpage, mêmes places, mêmes couleurs d'or et de feutre de base. **En plus** : un disque
rouge vif Ø 35,3 CSS à cheval sur le coin haut-droit de la carte (`F2`). **En moins** : la
translucidité de la plaque du tampon (`F1`), le dégradé du papier (`F6`), les soulignés pointillés
de ④ (`F8`). **Décalés** : le titre (+15,7 CSS vers le bas, `F10`), le tampon (−7,7 % de largeur,
`F12`), la carte (+4,7 CSS de largeur, `F13`).

### 3. Correspondance des repères
Échelle donnée par le dossier et **non déduite** : 1 px CSS = 3,6 px d'image **des deux côtés**
(référence 1080 px = 300 CSS ; capture 1080 px = 300 CSS). Rapport capture ÷ référence = **1,000 en
X**. **Aucun rapport en Y** : les références font 2102 px, les captures 2400 ou 1920 — toute mesure
verticale de ce rapport est soit une grandeur invariante (hauteur de carte, hauteur de capitale),
soit une **fraction** de la hauteur de carte ou du panneau. Offsets retenus : carte maquette
cadre-6 (62, 689)-(737, 1451), cadre-7 (74, 806)-(725, 1571) ; carte jeu G01 (71, 1046)-(739, 1810),
G02/G04/G06 (71, 1142)-(739, 1906), G03 (71, 1219)-(739, 1983), G05 (71, 1111)-(739, 1874).

### 4. Scripts
Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre et porte ses contrôles :

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `m01_tailles_et_vide.py` | tailles des 17 PNG, garde anti-vide | image noire 0,0 % / image blanche 100,0 % |
| `m02_reperes.py` | panneau vert, première approche de la carte | cadre-5 et H01 : aucun panneau vert (négatif) |
| `m03_carte.py` | plage crème de la carte | cadre-5 / H01 : aucune carte (négatif) |
| `m04_carte_contour.py` | contour de carte, panneau, marges | 1920 et 2400 donnent les mêmes valeurs |
| `m05_pastille_rouge.py` | disque rouge, tampon | retrouve le ♦ TACTIQUE (318 px) dans la référence |
| `m06_tampon_sur_titre.py` | **version ratée**, gardée exprès | contrôle +A à 80 % d'écart ⇒ instrument rejeté |
| `m07_tampon_sur_titre_v2.py` | encre de titre survivante | +A 0,4 % · +B 0,0 % |
| `m08_crops.py` | crops de travail | imprime chaque source et sa taille |
| `m09_plaque_opacite.py` | **translucidité de la plaque** | + texte nu 15,2/27,0 % · − champ vide 0,9/0,0 % |
| `m10_disque_debord_et_grave.py` | débord du disque, lettres coupées | liseré retrouvé sur les 2 références ; 15 lettres égales côté maquette |
| `m11_contraste.py` | contrastes WCAG, hauteurs d'encre | + « Aube » 14,17:1 · − feutre uni 1,06:1 |
| `m12_aplats.py` | papier, feutre, or | − 2 fenêtres du même aplat : 0/255 d'écart |
| `m13_pied_bouton_police.py` | bouton or, petits textes, sérif/linéale | **le volet sérif/linéale rate ses contrôles et est écarté** |
| `m14_tactique_et_pointilles.py` | TACTIQUE, première approche des pointillés | plancher de bruit 5–10 % ⇒ remplacé par m15 |
| `m15_profil_souligne.py` | **profil ligne par ligne des soulignés** | se lit sans seuil : 102 plages de 2 px vs n=0 |
| `m16_rythme_pastille_jeton.py` | position du titre, pastille, jeton | filet non trouvé ⇒ `F14` laissé non chiffré |
| `m17_panneau_tete.py` | bords du panneau de ④ | **incohérent (décor translucide) ⇒ aucun chiffre repris** |
| `m18_bouton_jeton_pastille.py` | bouton or, jeton, pastille — remesurés | − bande sans bouton : 15 px / 0 px |

Crops dans `mesures/crops/` : `ref_cadre6_carte`, `cap_G01_carte`, `cap_G02_grave_disque`,
`cap_G05_grave_disque`, `cap_G03_grave_disque`, `cap_G04_haut_panneau`, `ref7_pied`,
`capG02_pied`, `ref5_bouton`, `capH01_bouton`, `ref7_mot`, `capG05_mot`, `capG03_pastille`,
`ref_cadre5_gestes`, `cap_H01_gestes`, `cap_H01_file`.

### 5. Auto-audit du verdict
J'ai réellement ouvert et lu les **14 captures** et les **3 références** à taille réelle, et
`journal.tsv` et `variantes-textes-8f59cf94.txt` en entier. Les 14 textes du `journal.tsv`
correspondent à ce que montre l'image sur **6 des 7 états** ; le seul écart journal↔image est
`F7` (G05), et le journal ne le contredit pas, il le confirme (il consigne le mot **sans**
l'amorce). Deux de mes instruments ont raté leurs contrôles (`m06`, `m13c`) et un troisième a
rendu des valeurs incohérentes (`m17`) : les trois sont signalés et **aucun chiffre n'en est
repris** dans la table. Les findings `F9` et `F14` sont explicitement non chiffrés.
