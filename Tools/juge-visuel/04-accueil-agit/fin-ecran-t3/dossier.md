# Dossier du juge visuel — ④ L'ouverture : la carte de tête QUI AGIT et l'APRÈS-geste ⑤ — fin d'écran, TOUR 3 BORNÉ (le dernier) — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> **ÉTAT : COMPLET, captures du client `4c6fc58174edc0cd8e83ca184364806ca43d18ed` fournies (11/11). TOUR BORNÉ : tu juges UNIQUEMENT les deux points du « Tour BORNÉ » ci-dessous ; tout autre constat n'est PAS rouvert** (les écarts de pixel ou de nuance déjà consignés ne se rouvrent pas ; un défaut NOUVEAU et GRAVE que tu verrais en passant se signale en ligne « hors périmètre », sans tour).
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran-t3/` — tu écris `rapport.md` et `mesures/` dans CE répertoire.

## L'écran
- **Nom** : ④ L'ouverture (accueil) — la carte de tête (décision du jour) qui AGIT, et l'après-geste ⑤.
- **Ce qu'on vient y faire** : trancher la carte du jour en choisissant l'une de deux options (une conséquence sous chacune) ; le geste exécute, puis la carte « tranchée » dit ce qui s'est passé (ou, sur échec de la 1re cible, que rien n'est parti et que la carte reste à vous).
- **Chemin joueur** : ouverture de session → accueil → carte de tête → geste sur une option → après-geste. **À RENSEIGNER par CLIENT-2** : chemin réellement emprunté par chaque capture.
- **États capturés** : 7 (voir « Captures » : H01 + G01 à G06), chacun en 1080×2400 et 1080×1920.

## Référence (fait autorité : l'IMAGE) — rendus DEPUIS l'atelier master `8f59cf9409546bc9a078dbb91ca48f91be68da95` (arbre propre, étiquette appariée à l'index avant rendu)
| fichier | rôle | taille px | facteur | largeur CSS ↔ Unity |
|---|---|---|---|---|
| `reference/cadre-5-tete-sur-ligne-haute.png` | la carte de tête AU-DESSUS d'une ligne de file haute — référence de la carte de tête (avant geste) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `reference/cadre-6-apres-geste-executed.png` | l'après-geste : carte tranchée, outcome executed (2 locaux) | 1080×2102 | ×3,6 | idem |
| `reference/cadre-7-echec-1re-cible.png` | échec de la 1re cible : carte NON tranchée, pas de tampon, mot-or rouge | 1080×2102 | ×3,6 | idem |
| `reference/variantes-textes-8f59cf94.txt` | textes FR+EN des issues SANS cadre dessiné (même structure, seul le texte varie) — sortie du générateur de l'atelier | — | — | — |
- Source HTML (aide de lecture, ne prime jamais sur l'image) : `~/project/atelier3d-mafia/ecrans-brennar-accueil.html`, cadres 5, 6, 7 (0-based) ; lis-la épinglée `git -C ~/project/atelier3d-mafia show 8f59cf94:ecrans-brennar-accueil.html`.
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` relancé le 2026-11-11 sur la machine du rendu) :

      DejaVu Sans   →  DejaVuSans.ttf
      DejaVu Serif  →  DejaVuSerif.ttf
      Georgia       →  NotoSerif-Regular.ttf   (substitution : chrome du HUD)
      Segoe UI      →  NotoSans-Regular.ttf    (substitution : chrome du HUD)
      Courier New   →  LiberationMono-Regular.ttf

  Le client embarque DejaVu Sans / DejaVu Serif. ⇒ Un écart de FAMILLE de police du chrome est un ARBITRAGE de substitution, pas un défaut.

## Captures en jeu (Play Mode réel) — 14 PNG + `captures/journal.tsv` (copie fidèle de `~/project/mafia-unity-F/Logs/captures-apres-geste/4c6fc581/`)
Dossier des captures : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran-t3/captures/`. Chaque état existe en **1080×2400** (téléphone visé 20:9) et **1080×1920** (art natif). Noms signés `c4c6fc581_b35bdd6cb` = client `4c6fc581` + back `35bdd6cb`.

| id | état | référence |
|---|---|---|
| `H01_AccueilTete_Cadre5` | ④ la carte de tête AVANT geste (2 gestes « Détourner maintenant » / « Laisser la route coupée », carte SEVERED_ROUTE_REBUILD) | cadre 5 |
| `G01_ApresGeste_executed` | après-geste executed (2 routes) : carte tranchée, tampon, mot-or, ligne-or, jeton libre | cadre 6 |
| `G02_ApresGeste_noted` | noted CONSULTATIF (option « laisser » : committed=false, rien n'est tranché, sans tampon) | cadre 6 (texte `noted`) |
| `G03_ApresGeste_deja_tranchee` | 409 déjà tranché (pastille « déjà », sans tampon neuf) | cadre 6 / variante 409 |
| `G04_ApresGeste_404_plus_la` | 404 « Cette carte n'est plus là. » (y c. carte remplacée) | variante 404 |
| `G05_ApresGeste_premiere_cible_en_echec` | échec de la 1re cible : carte NON tranchée, pas de tampon | cadre 7 |
| `G06_ApresGeste_noted_structurelle` | noted d'une carte STRUCTURELLE : committed=true, tampon, jeton PRIS | cadre 6 (variante noted) |

- `captures/journal.tsv` : une ligne par capture, avec le texte lu à l'écran par le test (grave, mot-or, ligne-or, jeton…) — **sortie de l'instrument, à confronter à l'IMAGE** (l'image prime ; si le journal et l'image divergent, c'est un finding).
- **ÉTAT À CONNAÎTRE** : compte neuf, vrai shell du jeu ; le catalogue de textes = le bundle SERVI par le back `35bdd6cb`. Les RÉPONSES de commit et la carte de tête sont **FABRIQUÉES** avec les clés réellement servies (les phrases sont celles du bundle) : tu juges l'AFFICHAGE, pas l'effet du geste (l'effet réel est mesuré ailleurs). Le test échoue si `X-Server-Build` ≠ `35bdd6cb`.
- Client au moment des captures : `4c6fc581af11eaa7d7ff602245af5dfa90b832ea` (branche `lot/mots-client-2026-10-08`, 3 commits de tests de capture après `22890e0b`, code produit inchangé) ; PlayMode 167/168 vert (f2). Une capture est une mesure DATÉE.
- Garde anti-vide : A MESURER par toi (≥ 5 % de pixels non noirs).

## Échelle — OBLIGATOIRE, jamais déduite par le juge
| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (les 3) | 1080 | 300 | **×3,6** |
| CAPTURE (les 14, mesurée : 1080 px de large) | 1080 | 300 (canvas 1280 u rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** (tailles relues sur les fichiers) |
- Ce rapport est NORMAL ; toute mesure se ramène en px CSS avant de conclure (1 px CSS = 3,6 px d'image des deux côtés). **En Y il n'y a PAS de rapport** : les références font 2102, les captures 2400 ou 1920 — comparer en % de hauteur utile ou sur des grandeurs invariantes, jamais en px Y absolus ; 1920 n'est pas 2400 avec moins de place.
- ⚠️ Ce que la normalisation NE couvre pas : les rapports INTERNES (un bloc deux fois trop haut par rapport à son voisin) sont invariants d'échelle et restent des défauts réels.
- ⚠️ Le pire faux écart est celui qui est chiffré, reproductible, et entièrement dû à l'instrument.

## Règles de doctrine applicables
- gouttière : le contenu d'écran reste dans le rect du fond ; seul le chrome traverse
- contraste : ≥ 3:1 grands textes, ≥ 4,5:1 petits (sur l'art réel) — la maquette a été mesurée sans texte sous 4,5:1 avant les derniers mots ; non remesuré depuis
- langue affichée : français, via résolveurs / clés servies (aucun code brut, aucun enum à l'écran) ; mots bannis à l'écran : « session », « structurelle »
- animation VOULUE sur les écrans neufs : un pixel qui bouge n'est pas un écart ; capture figée à t=0 ; sans captures T et T+1 s : « non vérifié »
- Unity compose en LINÉAIRE, la maquette HTML en sRGB : ne pas juger une opacité/ombre/dégradé recopié comme un écart de valeur sans le mesurer

## Écarts ASSUMÉS — à inventorier, classer ASSUMÉ, vérifier « rendu proprement » (ce ne sont PAS des défauts)
| écart | raison |
|---|---|
| TD-937 : 2 phrases du cadre 7 sans clé servie | arbitré f2 |
| TD-938 : `navigate_screen` non suivi | arbitré f2 |
| `superseded` → 404 « Cette carte n'est plus là. » | arbitré f2 |
| `noted` sur la branche structurelle inatteignable en v1 | TD-929(b) |
| geste `skip` sans geste dessiné ; « Pas maintenant » retiré | décision du 08/10 |
| jeton : 3 états sans chiffre (libre / pris / fermée aujourd'hui) vs 1 état dessiné | consigné |
| 9 C de l'examen de maquette (pastille `.deja` absente, 3 espaces avant « : » U+202F/U+0020/U+00A0, phrase générique pour 4/6 codes, E18 500 après exécution sans cadre, littéraux sans clé, ancres périmées…) | consignés, ni correctif ni tour |
| pointillé `.prop` sous « CE QU'ON PEUT FAIRE » et sous les conséquences : annotation de DA « proposé, non ratifié » (l. 696 de `ecrans-brennar-accueil.html` @8f59cf94), NON rendue | arbitré f2 — ne pas signaler son absence |
| l'EN de l'amorce « Rien n'est parti : » retombe en FR tant que la clé n'est pas servie | arbitré f2 |
| pixel ou nuance (classe C) | consigné, ni correctif ni tour |
- Les issues SANS cadre dessiné (route, maillon, noted, arrêt partiel, plaidoyer, 409, 404, options vides) : jugées sur le TEXTE (`variantes-textes-8f59cf94.txt`) et sur la capture si elle existe ; leur MISE EN PAGE suit le cadre 6.

## Tour BORNÉ — les deux seuls points jugés
**Point 1 — ④ avant geste (H01, 2400 et 1920)** : chaque CONSÉQUENCE doit se lire SOUS SON option (celle de gauche sous le bouton de gauche, celle de droite sous le bouton de droite), comme sur le cadre 5 de la maquette. Mesure la couture entre les deux options à l'étage des boutons et à l'étage des conséquences (en px CSS), les largeurs des blocs, la gouttière entre les deux textes, et l'éventuel débordement d'un bloc sous le bouton voisin. Instrument fourni : `mesures/instrument-29_couture_corrigee.py` (couture boutons/conséquences ; ses fenêtres Y sont celles d'un tour précédent : IMPRIME les lignes une à une et vérifie qu'aucune n'est coupée avant de te fier aux chiffres ; contrôle positif = mesure identique en 2400 et 1920 ; contrôle négatif = la même séparation sur la rangée de boutons). Tu peux écrire tes propres instruments.
**Point 2 — NON-RÉGRESSION de l'après-geste (G01 à G06, 2400 et 1920)** : compare chaque capture de `captures/` à la MÊME capture du tour précédent, fournie dans `avant-t2/` (mêmes états, mêmes dimensions ; le client a changé uniquement la contrainte de largeur des conséquences et la largeur égale des deux boutons, donc les états G01-G06 devraient être identiques). Mesure la différence pixel par pixel (nombre de pixels qui diffèrent, zone englobante) ; toute différence perceptible par un joueur (élément déplacé, apparu, disparu, texte changé, contraste) est un finding ; une différence nulle ou invisible = « sans régression ». Contrôle de ton instrument : compare une capture à elle-même (0 attendu) et à une autre capture (≠0).
Les captures `avant-t2/` sont listées ici avec la preuve qu'UNE famille de variables change (mise en page des conséquences/boutons de H01) : ne les utilise QUE pour le point 2 ; la référence d'autorité reste l'image de `reference/`.

## Écarts ASSUMÉS supplémentaires — consignés au tour précédent, NE PAS ROUVRIR
Boutons de largeur inégale (désormais en cours de correction : constate seulement) ; étiquettes PORTÉE/URGENCE au-dessus de leur base ; filets-or ; tampon plus petit ; losange ♦ à côté de TACTIQUE ; « votre grande décision du jour » en beige ; mot LIBRE sous le jeton ; pied comprimé ; passe-partout crème plus étroit ; titre de carte plus bas ; proportions de la carte ; teinte de TACTIQUE.

## Format du RAPPORT — imposé
UNE table, un finding par ligne, rien compté ailleurs :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | … | … | … |

- gravité : liste fermée. critère : NOUVEAU dès que l'instrument ou la grandeur n'existait pas avant. Ne PAS geler le jeu d'instruments : on gèle la FORME, jamais la portée.
- Le compte se prend dans la table, jamais dans ton résumé. Ruling user 07/10 : A/B = ce qu'un joueur perçoit (fond, matière, élément absent, texte, geste, lisibilité) ; C = pixel ou nuance. Un écran sans A/B est APPROUVÉ.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports de juges précédents (`Tools/juge-visuel/04-accueil/r*`, `Tools/juge-visuel/04-accueil-agit/fin-ecran/` et `…/fin-ecran-t2/` (répertoires des tours 1 et 2, qui contiennent des rapports : INTERDITS), `Tools/juge-donnees/…`, `Tools/juge-visuel/ensemble-decor/…`) : INTERDITS ;
- toute capture « avant » — sauf `avant-t2/` pour le point 2 (voir ci-dessus).
