# Dossier du juge visuel — ③ La Carte de Brennar (city map) — r2 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La Carte de Brennar (city map) (③, canon `screen_2`) — contrôleur `CityMapController`
- **Ce qu'on vient y faire** : la ville de nuit, peinte : 18 quartiers nommés, le fleuve, le port ; lire d'un coup d'œil où ça chauffe (la bande de chaleur par quartier), qui est en chasse (les écussons de conviction), et approcher — entrer chez soi.
- **Chemin joueur emprunté par la capture** : onglet EMPIRE (défaut) → la carte, sous chrome (`screen_2_carte_sous_chrome`), compte de démo.
- **États capturés** : un seul : le compte gelé `demo_capture`, de NUIT, sous chrome — deux planches du MÊME run (2026-09-06 14:13, `d6c851d`, `correcteur/ecrans`) : sous chrome (PRINCIPALE) et hors chrome (carte seule). Le jour, la semaine de compression et les pastilles par district restent des questions OUVERTES (ne pas les classer défaut).

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-1080x2102.png` | rendu du cadre nominal (série 6 #22 « Brennar la nuit ») — ratifié (ruling user 2026-08-26 : « c'est le plus important, c'est le premier écran ») | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `9fd7b6f` ;
  références rendues au SHA `3c02f72`). Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet
  écran, avec la ligne où chacun commence :
  - #22 (l.846) — La Carte — Brennar la nuit  ⇐ **cadre NOMINAL, rendu en référence**
  - #23 (l.875) — La Carte — un quartier touché
  - #24 (l.904) — La Carte — approcher : chez vous
  Le châssis commun (jetons de couleur, primitives) est `/home/erutheone/project/atelier3d-mafia/chassis6.py` — plusieurs classes ne sont
  DÉFINIES que là. La CSS sert à NOMMER les valeurs voulues (hex, px, états) ; si CSS et image divergent, l'image gagne.
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` — Chrome sans tête, fenêtre généreuse puis recadrage
  à 300×584 CSS × 3,6 = 1080×2102, assertion de taille en sortie (anti-crop payé deux fois ici).
- ⚠️ **Témoin** : la référence rendue est le cadre NOMINAL. Si la capture montre un AUTRE état (liste vide, semaine
  en cours, rapport traité…), choisis le cadre d'état homologue dans `etats/` (quand ce répertoire existe dans le
  dossier — sinon il n'y a que la SOURCE, et c'est dit ici) — et dis lequel.
- ⚠️ **La ville de la capture EST la peinture de la série 6** (texture 2100×3640 tirée du cadre, TD-494/560, 2026-09-03) : la géométrie, les rues, le fleuve doivent donc tomber JUSTE à un rééchantillonnage près — un écart de forme sur la ville elle-même désignerait la texture, pas le code. Ce qui se juge vraiment : le cadrage (quelle part de la peinture est visible, où), les 18 marqueurs de nom, la bande de chaleur, le chrome, la bande du bas.

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
| `capture-1080x2400.png` | 1080×2400 — PRINCIPALE | compte gelé, sous chrome | 2026-09-06 14:13 (`d6c851d`) | `VuePrincipaleCapturePlayModeTests (`screen_2_carte_sous_chrome_1080x2400.png`, sha256 `ab3fc0a7…`)` |
| `capture-carte-seule-1080x2400.png` | 1080×2400 | même run, HORS chrome (la carte seule) | 2026-09-06 14:13 (`d6c851d`) | `idem (`carte_ville_1080x2400.png`, `affce6d1…`) — même commit, même compte : utilisable pour lire la peinture sous le bandeau/dock et pour un delta chrome/hors-chrome` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `f218067`. Une capture est une mesure DATÉE.
- Compte photographié : `demo_capture@example.test`, compte GELÉ (minute 72 118) — journal du run : `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` ; suite `ScreenCarte` 9/9. Les VALEURS (chaleur, conviction, « chez vous ») se comparent aux corps de la base gelée (`corps-reels/`, `a0623a5`).
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Ce que le lot DÉCLARE (`e40bce2` → `c7a8e2a` → `7a29020` → `d6c851d`) — à vérifier, pas à croire** :
  - **F4 (angle des noms)** : angle par district repris de la source d'auteur ; **convention déclarée : 0° = horizontale de l'image, positif = HORAIRE** (`rotate(θ cx cy)` SVG). Amplitude mesurée en jeu par le correcteur : 28,0° (`Glass-1 +18,0` / `Tidewater-1 −10,0`). Déclare TA convention et mesure les 18 angles.
  - **Angles de la SOURCE, par profil de trame** (mesure DATÉE lue dans `/home/erutheone/project/atelier3d-mafia/geo_brennar.py`, champ `rot`, le 2026-09-06 — aide de lecture, ne prime jamais sur l'image) : tidewater **−10** · verge **−7** · lattice **0** · spine **+3** · stack **+7** · glass **+18**. Contrôle contre les 7 mesures du r1 : 6 concordent (0,04 à 0,62°) ; **QUAI-NORD diverge de 6,49°** (r1 −3,5° · source −10°, ses congénères de trame LES BASSINS/SARNES à −10). ⇒ **Remesure QUAI-NORD sur la RÉFÉRENCE en NOMMANT l'objet mesuré** (le mot ? son halo ? une étiquette voisine ?) : soit la mesure du r1 portait sur autre chose, soit la maquette rendue ne suit pas sa source à cet endroit — écris laquelle des deux.
  - **F1/F2/F5/F7/F10 (la plaque)** : l'`Image` opaque 210×40 sous chaque nom est déclarée remplacée par une zone de toucher transparente + un **halo radial** (opacité α < 0,15, dérivée de l'instrument du r1 : +20 L sur fond L≈30) + le nom. Mesure ce que le halo FAIT à la peinture (profil radial, élévation de luminance, rayon), et si la peinture reste lisible sous le nom (la maquette grave le texte à même la peinture).
  - **F3** : corps 16 → 26, capitale 10 → 16 (unités CSS). **F9** : blanc → crème, r−b déclaré 39 (bande maquette 29–40). **F6** : pastilles de légende retirées ; **le bouton « Chaleur » qui reste = ARBITRAGE user** (pas un écart). **F5** : la route or `hudMoneyGold` déclarée byte-exacte. **F8** (noms ~8 px plus bas) : à REMESURER maintenant que les mots sont inclinés — le r1 disait qu'une part de l'écart venait de comparer un mot incliné à un mot horizontal.
- **NE PAS compter comme régression** : les couleurs d'ÉTAT de la maquette (écussons de conviction, lavis / halo de chaleur sur l'aire d'un quartier — formes vectorielles) ne sont PAS faites : lot à part, classe ASSUMÉ (vérifie seulement que rien de cassé n'apparaît à leur place).
- **Chrome** : le « Unknown » du médaillon est déclaré fermé (`31d8e43`). Si le bandeau / médaillon / dock portent encore un tiret ou « Unknown », dis-le en tête et ne juge pas le chrome (doctrine) ; sinon le chrome se compare au HUD canon comme sur les autres écrans.
- **Convention de bord** : déclare-la pour toute épaisseur de trait.
- Fichiers touchés depuis le r1 (`e40bce2^` → `d6c851d`, sans stats) : `CityMap/CityMapController.cs`, `CityMap/VillePeinteDtos.cs` (③) ; `Shell/AppShell.cs`, `Shell/TopBarController.cs` (chrome partagé) ; Reputation (hors ③).
- **Grandeurs du tour précédent** : `grandeurs-r1.md` — valeurs sans verdict, pour la colonne `critère`. Rien d'autre du r1 n'est fourni.
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

⚠️ Le juge-données du jour a établi que **la géométrie de la ville est du DESIGN ratifié** (ruling user : « rien n'a besoin d'être vrai côté back — la géométrie est du design ») et que **8 libellés de la maquette n'ont pas de clé i18n servie** (chaleur, conviction, profil, descente, aide, « Entrer »). Un libellé absent ou remplacé par le mot de la BANDE n'est pas un défaut d'écran.
⚠️ Relu le 2026-09-06 (r2) : compte GELÉ `demo_capture` ; les formes d'ÉTAT (écussons, lavis, halo de chaleur) sont un lot à part = ASSUMÉ ; le bouton « Chaleur » = ARBITRAGE.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| la ville (quartiers, rues, îlots, tours, parcs, fleuve, port, bateaux, lune, rose des vents) est la peinture, pas une donnée | aucune colonne de géométrie en base (`world_geography.ts:30-45`) — design ratifié (Ma..Me) | un quartier COUPÉ par le cadre, la texture étirée (rapport d'aspect ≠ 2100/3640), un marqueur hors de son quartier |
| 18 noms de quartier en français | `world/districts.name` (18/18 mesurés) ; substituteur de fiction dans la maquette | un slug, un nom manquant, deux marqueurs qui se chevauchent |
| le MOT de la chaleur (« tiède », « froid ») peut manquer ou différer | la bande a sa source, le libellé n'a pas de clé i18n (Mf) — lot back i18n | une clé brute ou un mot anglais (COLD, WARM…) |
| les écussons de conviction peuvent manquer ou n'avoir pas de mot | `belief` a 4 valeurs, 0 clé i18n (Mg) ; DORMANT (l'état de départ) n'a AUCUN dessin dans la maquette | — |
| « VOUS ÊTES ICI » / le quartier en or « chez vous » peut manquer | aucune clé du back ne dit quel district est celui du joueur (Mj) ; dérivable de `me/buildings` seulement | un « chez vous » posé sur le mauvais quartier (contrôle : les 4 bâtiments du kit sont au district 1, Les Bassins, mesuré §DA-4) |
| « LE THRENNY », « LE PORT » peuvent manquer | 0 occurrence dans le bundle (Mc, Md) | — |
| « pincez pour approcher », « ENTRER dans le quartier » peuvent différer | aide sans clé ; `carte.bloc.entrer` sert « Entrer » (Ml, Mm) | un mot anglais |
| le libellé de type de bâtiment de la bande du bas peut différer de « le labo, la planque… » | deux familles i18n concurrentes (D3), aucune ne dit « la façade » | une clé brute |
| la bande de chaleur peut être JOUR/état différent de la référence | ruling ouvert (jour / compression / pastilles) ; heat par district = 18 appels, l'écran peut n'en montrer qu'une partie | — |
| les formes d'ÉTAT de la maquette — écussons de conviction, lavis / halo de chaleur sur l'aire d'un quartier — absentes | lot à part, non livré (déclaré par le correcteur au r2) | un fragment cassé, une pastille, un aplat saturé posé à leur place |
| un bouton « Chaleur » (bas gauche) que la maquette n'a pas | ARBITRAGE user ouvert (r1 F6 : les pastilles sont retirées, le bouton reste) | qu'il recouvre un nom de quartier ou un repère peint (rose des vents, fleuve) |

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
- **le tour r1 (`Tools/juge-visuel/carte/r1-2026-09-06/`) existe** — pas fourni ; seule `grandeurs-r1.md` t'est donnée ;
- le journal complet du run (sa ligne utile est citée ci-dessus) ; les scripts du r1 ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
