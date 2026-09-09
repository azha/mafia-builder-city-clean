# Dossier du juge visuel — ㊲ La réputation (« le miroir ») — r10 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La réputation (« le miroir ») (㊲, canon `screen_b3`) — contrôleur `ReputationScreenController`
- **Ce qu'on vient y faire** : « le miroir » : on vient lire ce que son lieutenant a ABSORBÉ des règles qu'on lui a données — pas ce qu'on lui a dit, ce qu'il en a retenu. L'écran est UN portrait : le lieutenant, sa posture, ses quatre indices de tenue ; on se lit sur lui.
- **Chemin joueur emprunté par la capture** : onglet PLUS → « LA RÉPUTATION » pour le chemin joueur ; **ces captures-ci sont prises SANS le chrome du shell** (suite `ReputationScreenPlayModeTests`, canvas propre) — ne compte pas l'absence de bandeau/dock comme un écart, mais dis ce que cette absence t'empêche de vérifier.
- **États capturés** : un seul : le compte `demo_capture` GELÉ (base 72 118, roster Halde·Rook·Sallo) — VIERGE (cadre #120) ou GARNI (cadre #119) : ton inventaire le dira, c'est LE témoin à choisir.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-1080x2102.png` | rendu du cadre nominal (série 6 #120 « Rien n'a encore déteint » — l'état VIERGE) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `etats/m-119.png … m-124.png` | les 6 cadres du groupe rendus à ×3 (119 = canon garni, 121 dérive, 122 règles, 123 gages, 124 ce qui manque) | 900×1752 | ×3,0 | 300 CSS = 900 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `9fd7b6f` ;
  références rendues au SHA `3c02f72`). Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet
  écran, avec la ligne où chacun commence :
  - #119 (l.6000) — Le miroir — ce qu'il a pris de vous se voit sur lui
  - #120 (l.6003) — Rien n'a encore déteint  ⇐ **cadre NOMINAL, rendu en référence**
  - #121 (l.6006) — Vous vous écartez de vos propres règles
  - #122 (l.6009) — Les règles que vous avez données
  - #123 (l.6012) — Un rappelé — on demande des gages (avec lots back)
  - #124 (l.6015) — Ce qui manque encore
  Le châssis commun (jetons de couleur, primitives) est `/home/erutheone/project/atelier3d-mafia/chassis6.py` — plusieurs classes ne sont
  DÉFINIES que là. La CSS sert à NOMMER les valeurs voulues (hex, px, états) ; si CSS et image divergent, l'image gagne.
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` — Chrome sans tête, fenêtre généreuse puis recadrage
  à 300×584 CSS × 3,6 = 1080×2102, assertion de taille en sortie (anti-crop payé deux fois ici).
- ⚠️ **Témoin** : la référence rendue est le cadre NOMINAL. Si la capture montre un AUTRE état (liste vide, semaine
  en cours, rapport traité…), choisis le cadre d'état homologue dans `etats/` (quand ce répertoire existe dans le
  dossier — sinon il n'y a que la SOURCE, et c'est dit ici) — et dis lequel.
- Générateur de cet écran : `/home/erutheone/project/atelier3d-mafia/generateur-reputation.py` (+ `chassis6.py` pour `.elast`, `.enseigne`, `.fen`, `.pann`, `.cta6`). Le cadre a une hauteur FIXE de **462 px CSS** (`reputation(cadre, H=462)`) : sous lui, sur la maquette, c'est le dock ; sur la capture, c'est le dock du shell. Un vide DANS le cadre se juge ; l'espace sous le cadre est la place du dock.

- **Polices — ce qui a RÉELLEMENT rendu la référence** (`fc-match` sur cette machine, exécuté à la
  génération de ce dossier le 2026-09-06 ; les références ont été rendues ici le 2026-09-03 par
  `Tools/rendre-tel.py` → Chrome sans tête) :

      Georgia            →  "Noto Serif" "Regular"
      DejaVu Sans        →  "DejaVu Sans" "Book"
      Courier New        →  "Liberation Mono" "Regular"
      sans-serif         →  "Noto Sans" "Regular"
      serif              →  "Noto Serif" "Regular"
      Times New Roman    →  "Liberation Serif" "Regular"
      Segoe UI           →  "Noto Sans" "Regular"

  Le client embarque **DejaVu Sans** / **DejaVu Serif** (`DesignTokens.primaryFont` / `hudSerifFont`).
  ⇒ `Georgia` n'a JAMAIS été montrée à personne : un écart de FAMILLE (Noto Serif ↔ DejaVu Serif) ou de
  chasse est un **ARBITRAGE** ; la **hauteur de capitale**, elle, se compare (c'est l'image approuvée).
  ⚠️ Cette phrase ne vaut que pour les références de SÉRIE 6 (`'DejaVu Sans'` demandée par 84 règles et rendue
  par DejaVu Sans elle-même ⇒ sur le sans-sérif, référence et client partagent la MÊME police) — vérifie la
  `font-family` de TA source : la référence Famille demande `"Segoe UI",Roboto,system-ui` ⇒ Noto Sans, et un écart
  de chasse y est un ARBITRAGE (mesuré par le juge ⑥ le 2026-09-06 : +10 % de chasse à capitale égale).

## Captures en jeu (Play Mode réel, compte réel, SOUS le chrome du shell)

| fichier (dans ce dossier) | résolution | état | prise le | test |
|---|---|---|---|---|
| `capture-1080x1920.png` | 1080×1920 (16:9) | compte gelé, SANS chrome | 2026-09-06 11:37 (`0da8895`, `correcteur/ecrans`) | `ReputationScreenPlayModeTests (`screen_b3_reputation_1080x1920.png`, sha256 `1612c8bb…`)` |
| `capture-1080x2400.png` | 1080×2400 (20:9, cible téléphone) | compte gelé, SANS chrome | 2026-09-06 11:37 (`0da8895`) | `idem (`screen_b3_reputation_1080x2400.png`, `9974e422…`)` |
| `capture-1080x1920-t1s.png` | 1080×1920 à T+1 s | contrôle de stabilité (aucune animation attendue) | 2026-09-06 11:37 (`0da8895`) | `idem (`screen_b3_reputation_1080x1920_t1s.png`) — ⚠️ sha256 IDENTIQUE à la capture T (`1612c8bb…`) : 0 pixel différent par construction ; dis si cela prouve la stabilité ou si le même tampon a été écrit deux fois (indécidable depuis l'image)` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `635a101`. Une capture est une mesure DATÉE.
- Compte photographié : celui du shell par défaut, `operational_demo@example.test` (`AppShell.cs:104`), garni
  par le seeder — **pas un compte frais**. Son état au moment de la capture n'est pas re-mesurable ici.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Identité** : le commit `0da8895` dit « un run sans la paire ne peut plus produire d'image » et cite `régime=env identité=demo_capture@example.test` pour cette suite (garde armée : la présence de la paire, jamais la valeur). Base gelée 72 118 (`empreinte-reference.json`). Journal non joint.
- **Cadre à hauteur FIXE de 462 px CSS** (`reputation(cadre, H=462)`) : sous lui, le fond — c'est la place du dock absent. Un vide DANS le cadre se juge ; l'espace sous le cadre, non.
- **Correctif de référence** : `2af4343` (01/09, ancêtre de ces planches ET des planches du r9) — griffes de saleté obliques (−28°/+18°), gant rentré de 1,6 CSS. Depuis le r9 : `cbffc49` (+45/−2, garde de capture) et le chemin d'identité. Fait de provenance, pas verdict.
- **Deux faits rapportés par le correcteur — À VÉRIFIER SUR L'IMAGE, pas à croire** : (1) le portrait serait PROCÉDURAL (rectangles/ellipses aux coordonnées du SVG) ; (2) en état VIERGE la maquette et le client ne rendent PAS de montre (`watch = hidden`, 0 pixel d'or dans la carte), et l'ovale clair aux deux barres que des juges précédents ont appelé « montre » serait le **GANT**. ⇒ **Nomme l'OBJET que tu mesures par sa position dans le buste et sa taille** (« ellipse claire de a×b CSS centrée à (x, y) % de la carte, sous le poignet droit »), jamais par son nom supposé ; puis dis à quel élément du SVG (`generateur-reputation.py`) il correspond, avec la mesure.
- **Mesure DUE sur la calotte/coiffe** (trois réglages précédents, trois erreurs) : **largeur de calotte ÷ largeur de tête**, **hauteur d'attache** (où la calotte rejoint le visage, en % de la hauteur du visage), épaisseur, des deux côtés — c'est ce qui manque pour un 4ᵉ réglage qui ne tâtonne pas.
- **Grandeurs des tours précédents** : `grandeurs-r9.md` (planche du 04/09, sous chrome) et `grandeurs-r8.md` (planche sans chrome du 01/09, la plus comparable à celles-ci) — valeurs sans verdict, pour la colonne `critère`. Rien d'autre des tours r1→r9 n'est fourni.
## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (cadre de série 6/4, `.tel` 300 CSS) | 1080 | 300 | **×3,6** |
| CAPTURE (contenu de l'écran, dessiné à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | **×3,6** |
| | | **rapport capture ÷ référence** | **1,00** |

- ⇒ Pour le CONTENU de l'écran, référence et capture sont **à la même échelle** : 1 px CSS = 3,6 px des
  deux côtés. Un écart de taille sur le contenu est donc un écart RÉEL, pas un artefact d'instrument.
- ⚠️ **Le CHROME (bandeau haut + dock du bas) n'est PAS à cette échelle.** Il est construit par le shell
  d'après `hud-brennar.html` (`.tel` de **392 CSS**) : `AppShell.Px(css) = css × 1280/392` — soit
  **×2,755 px par px CSS à 1080 de large** (`Assets/Scripts/Shell/AppShell.cs:1583`, `EchelleMaquette.cs:87`).
  Le cadre de série 6 dessine sa propre barre et son propre dock à 300 CSS : ce sont des ÉVOCATIONS du
  chrome, pas le chrome. ⇒ **Le chrome se juge contre le canon du HUD** (`Tools/juge-visuel/ecran-principal/ecran-canon.png`,
  1176 px = 392 CSS, ×3) **et le contenu contre le cadre de série 6**. Une différence de hauteur de
  bandeau entre le cadre de série 6 et la capture est ASSUMÉE (chrome partagé), pas un défaut de l'écran.
- Hauteurs : référence **584 CSS** (2102 px, `.tel` en 9:17,5) ; capture **666,7 CSS** (2400 px, 9:20).
  La différence (82,7 CSS) est absorbée par la zone de contenu ENTRE le bandeau et le dock : aligne le
  haut du contenu sur le bas du bandeau, et le bas du contenu sur le haut du dock — jamais par le pixel absolu.
- Géométrie de la capture, DÉRIVÉE du code (le log du run n'a pas été préservé, donc **aucun rect imprimé
  n'est fourni**) : `CanvasScaler` 1280 de large, `matchWidthOrHeight = 0` ⇒ canvas **1280 × 2844,4 unités**,
  `scaleFactor = 1080/1280 = 0,84375` (`AppShell.cs:1201-1202`, `:1270` ; même valeur mesurée au tour r8 de
  ㊲ le 2026-08-31). Le bandeau fait 52 CSS-HUD = **143 px** ; le dock, `TabDockHauteurCss` (somme de
  cinq constantes, `AppShell.cs:1547`) — mesure-le sur l'image, ne le déduis pas.
- ⚠️ Ce que la normalisation NE couvre PAS : les rapports INTERNES (un bloc deux fois trop haut par rapport à
  son voisin, une rangée aux tuiles inégales) sont invariants d'échelle et restent des défauts réels.

## Règles de doctrine applicables

- **Portrait, deux résolutions** : le projet vise le téléphone portrait ; la cible est 1080×2400 (20:9).
  ⚠️ Ce tour ne fournit **qu'une résolution** par écran (sauf mention) — à écrire en non-vérifié, pas à deviner.
- **Gouttière** : le contenu d'écran reste dans le rect libre entre bandeau et dock (`ShellChrome.TopInsetPx`
  / `BottomInsetPx`) ; seul le chrome traverse. Tout contenu SOUS le bandeau ou SOUS le dock est un écart.
- **Contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits — mesuré sur l'art réel, jamais sur un gris choisi.
- **Langue affichée : français**, via résolveurs nommés (i18n `fr`, bundle de 674 clés au moment des
  captures) — aucun enum brut, aucun repli anglais ne doit atteindre l'écran.
- **Espace de mélange** : la maquette est composée en sRGB par Chrome, le client en LINÉAIRE
  (`m_ActiveColorSpace: 1`) ; un écart SYSTÉMATIQUE de même signe sur plusieurs translucidités est une erreur
  de modèle, pas N erreurs.
- **Animation : AUCUNE sur un nouvel écran** (ruling user 2026-08-27). Aucune paire T/T+1 s n'est fournie ce
  tour : à écrire en non-vérifié.
- **Identité photographiée** (ruling f2 2026-09-06 ~07:20, payé sur ㊵) : une planche prise SANS la paire
  `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` photographie `operational_demo` (repli `[SerializeField]`) et RIEN sur
  l'image ne le dit. Avant de comparer une VALEUR de la planche à un corps `demo_capture`, le dossier doit citer la
  ligne `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal du run (ou son sidecar) ;
  sans elle, la comparaison de valeurs va en « non vérifié » — la forme, elle, se juge.
- **Chrome non alimenté** : si le bandeau de la capture montre des tirets (ARGENT « — », JOUR « — ») ou « Unknown »
  dans le médaillon, la capture a été prise AVANT que le bandeau ne soit alimenté — le rapport le dit en tête et
  **ne juge pas le chrome** (il sera repris) ; le contenu de l'écran, lui, se juge.
- **Libellés anglais dans la RÉFÉRENCE** (`HEAT`, `$ 24 850`…) : ruling user 2026-09-02 « fr réel » — le client a
  raison, la maquette est en retard ; à noter UNE fois comme « maquette à mettre à jour », jamais comme écart d'écran.
- **Or** : s'il diffère, dire dans quel SENS — *plus jaune* (un jeton `accentGold #ffd23f` là où l'art veut
  `hudMoneyGold #f2c96b`) ou *plus gris* (désaturation : alpha, voile, matériau) — ce sont deux causes distinctes.
- **Silhouettes** : ruling DA du 2026-09-02 — plus de chapeaux 1950 (Don nu, lieutenant à capuche, homme à
  casquette). La série 6 porte encore 9 `fedora` et 24 `casquette` : si un buste diffère par le COUVRE-CHEF
  seulement, c'est un ARBITRAGE (la référence est en retard sur le ruling), pas un défaut du client.


## Écarts ASSUMÉS — à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

⚠️ Un écart assumé a un PÉRIMÈTRE : la colonne de droite dit ce qui le ferait SORTIR de l'assumé (auquel cas
c'est un défaut à remonter). Sans elle, l'assumé absorbe en silence des défauts d'une autre classe.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| compteur ENFREINTES à « — » et non « 00 » | aucune clé du corps ne porte ce compte (`boss_mirror_violation_ring` écrit, jamais projeté — juge-données É6) ; un « 00 » dirait « aucune » là où la vérité est « le serveur ne le dit pas » | que le tiret n'ait ni la couleur ni la position des deux autres chiffres — un trou doit se lire comme un trou, pas comme une panne |
| le col rendu par un TRIANGLE plein, sans le liseré du SVG | pas de primitive de chemin dans le client ; le triangle porte le signal ouvert/fermé par sa largeur | que ce ne soit pas un triangle (remplissage aire/boîte ~0,9 au lieu de ~0,43), qu'il ne soit pas centré sur l'axe du cou, qu'il recouvre le cou |
| le reflet du miroir est FIXE | la maquette l'anime (7,5 s) mais le rendu ratifié le fige à 34,7 % de course ; aucune animation sur cet écran (ruling) | qu'il soit absent, ou ailleurs que dans le tiers haut du panneau |
| 4 couleurs hors `DesignTokens` (Encre, Panneau, Liseré, Vert) | arbitrage DA escaladé, non tranché — dette de CODE, pas de rendu | que la couleur RENDUE s'écarte de la maquette |
| le nom du lieutenant est celui du compte, pas « Salvatore » | `lieutenant.name` est projeté depuis C3 (L0.4) ; la mention « non projeté (L0.4) » d'un tour précédent est un DÉFAUT si elle subsiste (juge-données clôture D2) | « SALVATORE » en dur, ou la mention « non projeté » encore visible |
| pas de section « gages » (`restraint`) | omise sans `counterparty_id` (É4) ; sur le compte de démo elle peut être absente | une place réservée vide |
| la ligne de balayage teal qui traverse le panneau au tiers haut est PRÉSENTE, fixe | trait d'identité (e) de la maquette (`.elast::after`, animée 7,5 s côté HTML, figée à 34,7 % de course dans le rendu ratifié) — sa présence est attendue ; son intensité et sa position se mesurent | absente, animée (T ≠ T+1 s), ou ailleurs que dans le tiers haut |

## Format du RAPPORT — imposé

⛔ Le juge choisit ses catégories et ses instruments ; il ne choisit pas la forme de son verdict. **Un finding
par ligne, dans UNE table, et rien de compté ailleurs** :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | <l'écart> | <les nombres> | <ou vide> |

- **gravité** : liste fermée, trois valeurs, pas de synonyme (ASSUMÉ et ARBITRAGE vont dans des tables À PART,
  jamais comptés avec les findings).
- **critère** : `NOUVEAU` dès que l'instrument ou la grandeur n'existait pas au tour précédent (au premier tour,
  tout est `NOUVEAU`).
- ⛔ **Sépare ce qui dépend des DONNÉES de ce qui dépend de la FORME.** Les planches ont été prises sur le compte
  de démo `operational_demo@example.test` le 2026-09-04 ; ce compte peut avoir été RECRÉÉ depuis (un gate E2E
  le purge). Un écart de contenu (un nom, un compte, une liste plus ou moins longue que la maquette) est une
  observation DATÉE — classe-le dans une colonne `dépend des données : oui/non`, ou dans une table séparée.
  Géométrie, palette, typographie, espacements, rythme sont vrais quelles que soient les données : c'est eux
  qui comptent d'abord.
- Le compte se prend dans la table, jamais dans la synthèse.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests — tu constates ce que tu VOIS ;
- les notes d'implémentation du chantier ;
- **les rapports de juges précédents** (`Tools/juge-visuel/<ecran>/r<k>/` pour k < N, et `Tools/juge-donnees/…`) :
  même s'ils existent à côté, ils ne te sont délibérément pas fournis — un juge qui hérite du contexte hérite
  des angles morts ;
- toute capture « avant » ;
- le rect imprimé par le test (log non préservé) — la géométrie ci-dessus est dérivée du code, et tu la
  vérifies sur l'image (largeur du bandeau = 1080, hauteur mesurée) avant de t'en servir ;
- **neuf tours de juge (r1 → r9) existent dans `Tools/juge-visuel/reputation/`** — pas fournis, ne les ouvre pas ; seules `grandeurs-r8.md` / `grandeurs-r9.md` te sont données ;
- le journal du run `0da8895` ; le chrome (captures sans shell) ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
