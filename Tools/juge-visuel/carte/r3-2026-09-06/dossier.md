# Dossier du juge visuel — ③ La Carte de Brennar (city map) — r3 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La Carte de Brennar (city map) (③, canon `screen_2`) — contrôleur `CityMapController`
- **Ce qu'on vient y faire** : la ville de nuit, peinte : 18 quartiers nommés, le fleuve, le port ; lire d'un coup d'œil où ça chauffe (la bande de chaleur par quartier), qui est en chasse (les écussons de conviction), et approcher — entrer chez soi.
- **Chemin joueur emprunté par la capture** : onglet EMPIRE (défaut) → la carte, sous chrome (`screen_2_carte_sous_chrome`), compte de démo.
- **États capturés** : un seul : le compte gelé, de NUIT — trois planches POST-Bold (TD-615) et POST-lettrage (`ea533b5` 17:07) : sous chrome à 1080×2400 (PRINCIPALE, commit `43ac9cb` 17:08), sous chrome à 1080×1920 (commit `d779d50` 17:15), et une VRAIE carte hors chrome à 1080×2400 (commit `d779d50` — le contrôleur monté seul dans un test structurel, propriété garantie par la scène). Le jour, la semaine de compression et les pastilles par district restent des questions OUVERTES.

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
| `capture-1080x2400.png` | 1080×2400 — PRINCIPALE | compte gelé, sous chrome | 2026-09-06 17:08 (`43ac9cb`) | ``screen_2_carte_sous_chrome_1080x2400.png`, blob `d47247c4`, sha256 `50af1fc7…`` |
| `capture-1080x1920.png` | 1080×1920 | compte gelé, sous chrome | 2026-09-06 17:15 (`d779d50`) | ``screen_2_carte_sous_chrome_1080x1920.png`, blob `4dda0565`, `2fe413da…`` |
| `capture-hors-chrome-1080x2400.png` | 1080×2400 | la carte SEULE, hors chrome (VRAIE cette fois : ni bandeau ni dock) | 2026-09-06 17:15 (`d779d50`) | ``carte_ville_hors_chrome_1080x2400.png`, blob `43b0802c`, `94911199…` — même compte, même jour : utilisable pour lire la peinture sous le bandeau/dock et pour un delta chrome/hors-chrome` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `21ee636`. Une capture est une mesure DATÉE.
- Compte photographié : `demo_capture@example.test`, compte GELÉ — empreinte inchangée (minute 72 118 · 17 · 3 · 2). Journal PAR PLANCHE : les deux planches sous chrome portent `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` · `[CHROME-CAPITALE] 19 px bande 27..45` ; la planche hors chrome porte `régime=env identité=demo_capture@example.test` (⚠️ la carte lit une SECONDE paire d'identité, `MAFIA_CITYMAP_*` — un premier run hors chrome avait signé `citymap_demo` ; les deux paires sont exportées sur ce run). Suites `ScreenCarte` + `CaptureCarte` 10/10. Les VALEURS se comparent aux corps de la base gelée.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Ce que le lot DÉCLARE (`d6c851d` angles → `ea533b5` lettrage → `2407907`) — à vérifier, pas à croire** :
  - **M1** famille : les noms passent en ROMAINE (`hudSerifFont`, jamais appelé avant). Famille, puis épaisseur de trait à capitale égale (post-Bold des deux côtés du fût ? non : la référence est un rendu navigateur — compare la forme des empattements et le fût, contrôle positif « LE THRENNY » peint).
  - **M2** interlettrage `0,24 em` (le lot dit : la valeur 8 valait 0,08 em — l'UNITÉ était le défaut). Écart inter-lettres, largeur d'encre jeu/maquette sur les mots complets, avance par caractère.
  - **M3** contour SOMBRE par `Underlay` à la cote du canon (`paint-order:stroke; stroke:#080d14; width:2.4`), plus aucun halo clair. Profil radial de luminance autour de l'encre contre la peinture lointaine : le canon CREUSE (−10 à −20 L de d = 1 à 4).
  - **m1** encre à `opacity:.9` (le canon : (204,196,174) médian, r−b 25..39, la valeur varie avec la peinture dessous).
  - **F4 / QUAI-NORD** : inchangés depuis le r2 (18 angles ≤ 0,53° sauf LA LISIÈRE +1,37) — recontrôle rapide, même convention.
  - **F8 (noms +7,5 px plus bas, 13/13 du même signe au r2) — NON corrigé, cause cherchée** : deux candidats réfutés par le correcteur (ligne de base/alignement : écart encre−boîte +0,00 sur 18 ; pivot après rotation : l'écart SUIT l'angle, +0,52 à 10° / −0,16 à −3°, une grandeur qui varie n'explique pas un écart constant) ; reste le SENS DE L'ANCRE (la donnée place le centroïde du quartier, la référence pose le lettrage ailleurs). Il n'a PAS décalé les noms. ⇒ **Mesure et livre, en annexe, la table des 18 noms : centre d'encre (x, y) sur le PNG canon EN CSS (÷3,6) et sur la capture ramené dans le repère du canon, plus dy et dx** — c'est la grandeur qui tranchera l'ancre (l'atelier fournit l'autre chemin : les 18 ancres de la source). Compte l'écart comme au r2 si tu le retrouves.
- **NE PAS compter comme régression** : la couche d'ÉTAT de la maquette (`ecusson · pin-esc · moi · nappe · lueur`) est un lot à part — ASSUMÉ (voir la table). Le bouton/la pastille « Chaleur » en bas à gauche = ARBITRAGE user (sa forme se mesure, sa présence ne se compte pas).
- **Chrome** : ARGENT et JOUR sont alimentés ; la PHASE (aile droite, sous JOUR) porte un tiret « — » hors district : **état VOULU** (vidée à chaque activation d'onglet) ⇒ ASSUMÉ, et le reste du chrome (bandeau, médaillon « Brûlant / CHALEUR », dock) **SE JUGE** contre le HUD canon — le compte est BRÛLANT : boîtier, filet et « Brûlant » en `--braise` par la CSS `.tel.chaud` (l. 31, 64, 65 de `hud-brennar.html`), pas le PNG calme. ⚠️ Le commit `2407907` (17:16) est postérieur aux planches et touche aucun script : le chrome photographié est celui de `d779d50`/`43ac9cb`.
- **Conventions** : déclare ta convention de bord et ta convention d'angle (le r2 : 0° = horizontale, positif = HORAIRE, régression de la ligne de base, résidu imprimé).
- Fichiers touchés depuis le r2 (`d6c851d` → `2407907`, sans stats) : `CityMap/CityMapController.cs`, `CityMap/DistrictInteriorScreenController.cs` (③ et ①) ; `Shell/AppShell.cs`, `Shell/TopBarController.cs`, `ShellContracts/ProceduralUI.cs` (chrome partagé) ; Reputation hors ③.
- **Grandeurs du tour précédent** : `grandeurs-r2.md` — valeurs sans verdict, pour la colonne `critère`, avec les 18 angles. Rien d'autre des tours r1-r2 n'est fourni.
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
  **ne juge pas le chrome** (il sera repris) ; le contenu de l'écran, lui, se juge. ⚠️ **Exception mesurée le
  2026-09-06 (f2)** : la PHASE de l'aile droite (« Aube »…) est vidée à chaque activation d'onglet et n'est alimentée
  qu'en district — un tiret « — » à la place de la phase, ARGENT et JOUR étant alimentés, est un ÉTAT VOULU hors ① :
  classe ASSUMÉ, et le reste du chrome SE JUGE.
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
⚠️ Relu le 2026-09-06 (r3) : compte GELÉ ; couche d'ÉTAT = lot à part ; tiret de PHASE hors district = état voulu ; « Chaleur » = ARBITRAGE.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| la ville (quartiers, rues, îlots, tours, parcs, fleuve, port, bateaux, lune, rose des vents) est la peinture, pas une donnée | aucune colonne de géométrie en base (`world_geography.ts:30-45`) — design ratifié (Ma..Me) | un quartier COUPÉ par le cadre, la texture étirée (rapport d'aspect ≠ 2100/3640), un marqueur hors de son quartier |
| la COUCHE D'ÉTAT de la maquette — `ecusson · pin-esc · moi · nappe · lueur` (écussons de conviction, tracé de descente, « chez vous », lavis/halo de chaleur) — ABSENTE | lot à part : `rendre-ville-peinte.py:82` retire exactement ces cinq groupes de la peinture (tranché f2 2026-09-06) | un fragment cassé, une pastille, un aplat saturé posé à leur place |
| 18 noms de quartier en français | `world/districts.name` (18/18 mesurés) ; substituteur de fiction dans la maquette | un slug, un nom manquant, deux marqueurs qui se chevauchent |
| le MOT de la chaleur (« tiède », « froid ») peut manquer ou différer | la bande a sa source, le libellé n'a pas de clé i18n (Mf) — lot back i18n | une clé brute ou un mot anglais (COLD, WARM…) |
| les écussons de conviction peuvent manquer ou n'avoir pas de mot | `belief` a 4 valeurs, 0 clé i18n (Mg) ; DORMANT (l'état de départ) n'a AUCUN dessin dans la maquette | — |
| « VOUS ÊTES ICI » / le quartier en or « chez vous » peut manquer | aucune clé du back ne dit quel district est celui du joueur (Mj) ; dérivable de `me/buildings` seulement | un « chez vous » posé sur le mauvais quartier (contrôle : les 4 bâtiments du kit sont au district 1, Les Bassins, mesuré §DA-4) |
| « LE THRENNY », « LE PORT » peuvent manquer | 0 occurrence dans le bundle (Mc, Md) | — |
| « pincez pour approcher », « ENTRER dans le quartier » peuvent différer | aide sans clé ; `carte.bloc.entrer` sert « Entrer » (Ml, Mm) | un mot anglais |
| le libellé de type de bâtiment de la bande du bas peut différer de « le labo, la planque… » | deux familles i18n concurrentes (D3), aucune ne dit « la façade » | une clé brute |
| la bande de chaleur peut être JOUR/état différent de la référence | ruling ouvert (jour / compression / pastilles) ; heat par district = 18 appels, l'écran peut n'en montrer qu'une partie | — |
| un tiret « — » à la place de la PHASE (aile droite du bandeau, sous JOUR), ARGENT et JOUR alimentés | état VOULU hors district : la phase est vidée à chaque activation d'onglet (mesuré par f2/le correcteur) | un tiret sur ARGENT ou JOUR, un médaillon « Unknown » ou vide (course de capture) |
| un bouton / une pastille « Chaleur » en bas à gauche que la maquette n'a pas | ARBITRAGE user ouvert (r1 F6 : pastilles retirées, le bouton reste) | qu'il recouvre un nom ou un repère peint ; sa forme (blanc pur, angles vifs) se mesure |

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
- **les tours r1 et r2 (`Tools/juge-visuel/carte/r1-…`, `r2-…`) existent** — pas fournis ; seule `grandeurs-r2.md` t'est donnée ;
- le journal complet du run (ses lignes utiles sont citées ci-dessus, par planche) ; les scripts du r2 ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
