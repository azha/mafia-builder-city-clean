# Dossier du juge visuel — ① L'intérieur de district (« le HUD de Brennar ») — r8 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : L'intérieur de district (« le HUD de Brennar ») (①, canon `hors canon`) — contrôleur `DistrictInteriorScreenController (+ le chrome du shell : bandeau, médaillon, dock)`
- **Ce qu'on vient y faire** : l'écran que l'user désigne comme le plus important : voir son quartier vivant, repérer ses bâtiments, en toucher un pour lire ce qu'il vaut (la `.fiche`) et décider quoi en faire (COLLECTER · BLANCHIR · AMÉLIORER). Le bandeau porte l'argent, le manomètre de chaleur, le jour.
- **Chemin joueur emprunté par la capture** : session réelle → carte de ville → ENTRER dans le district (16) → [pour les captures « fiche »] appui sur le premier bâtiment.
- **États capturés** : quatre captures du 2026-09-06 17:08 (`43ac9cb`, `correcteur/ecrans`, recapturées APRÈS les six correctifs — blobs changés, `git log -1` = `43ac9cb` pour chacune) : fiche OUVERTE à 1080×1920 (PRINCIPALE), fiche OUVERTE à 1080×2400, district seul sous chrome à 1080×2400, et un TÉMOIN de dock (la planche ⑥, même commit) pour l'indicateur d'onglet actif. Le compte est à l'état de chaleur **BRÛLANT** (`chaleur=«BURNING»`, phase « Aube ») — la référence PNG est l'état CALME : voir la note sur les témoins.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `ecran-canon.png` | rendu ratifié du `.tel` de `hud-brennar.html` (HUD v3.1 validé user, `5983267`), téléphone SEUL | 1176×2091 | ×3,0 | 392 CSS = 1176 px |
| `mesure-canon.txt` | géométrie du canon mesurée au navigateur | — | — | — |
| `maquette-hud-brennar.png` | un AUTRE rendu de la même page (1680×3240) — non mesuré, ne pas s'en servir comme référence principale | 1680×3240 | ? | — |

- **Source HTML/CSS** : `/home/erutheone/project/atelier3d-mafia/hud-brennar.html` (aide de lecture ; l'image gagne). Les jetons de couleur sont ceux de `DesignTokens.asset` (74) + le `:root` de l'atelier.
- Rendu par `Tools/rendre-maquette.py` (2026-08-25) : `.tel` isolé, collé en 0,0, recadré à 392×697 CSS × 3, assertion de non-rognage passée.

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
| `capture-fiche-1080x1920.png` | 1080×1920 — PRINCIPALE | fiche OUVERTE | 2026-09-06 17:08 (`43ac9cb`) | `VuePrincipaleCapturePlayModeTests (`vue_principale_fiche.png`, blob `3e1b33ac`, sha256 `e65305d0…`)` |
| `capture-fiche-1080x2400.png` | 1080×2400 | fiche OUVERTE | 2026-09-06 17:08 (`43ac9cb`) | `idem (`vue_principale_fiche_1080x2400.png`, blob `4dd6cc0f`, `09b358f8…`)` |
| `capture-district-1080x2400.png` | 1080×2400 | district seul, sous chrome | 2026-09-06 17:08 (`43ac9cb`) | `idem (`screen_1_district_sous_chrome_1080x2400.png`, blob `1762fe28`, `c11e3fbc…`)` |
| `temoin-dock-famille-1080x2400.png` | 1080×2400 | TÉMOIN : l'écran ⑥, même commit — pour le DOCK (indicateur d'onglet actif, voile du dock) et le bandeau seulement | 2026-09-06 17:08 (`43ac9cb`) | `planche ⑥ (`famille_1080x2400.png`, blob `8bc1a43e`, `2b38b5ee…`)` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `6ed73af`. Une capture est une mesure DATÉE.
- Compte photographié : `demo_capture@example.test`, compte GELÉ — empreinte inchangée (minute 72 118 · 17 bâtiments · 3 lieutenants · 2 planques). Journal du run, PAR PLANCHE (les trois planches ① portent les trois lignes) : `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` · `[CHROME-CAPITALE] 19 px bande 27..45` · `[CHROME-ALIMENTE] montant=«9 627 820,00 €» jour=50 chaleur=«BURNING» phase=«Aube» district=16`. Le témoin ⑥ porte `régime=env demo_capture`. La garde `ChromeAlimenteOuEchoue` (attend montant, jour ET bucket de chaleur) est passée : le bandeau est ALIMENTÉ, le chrome SE JUGE. Les VALEURS se comparent aux corps de la base gelée.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Témoin d'ÉTAT — à lire avant le médaillon** : le compte est **BRÛLANT** ; la référence `ecran-canon.png` est l'état CALME (« 37 % »). La source `hud-brennar.html` porte la variante **`.tel.chaud`** sur QUATRE règles : `.tel.chaud .barre::after{…var(--braise)…}` (l. 31, filet du bandeau), `.tel.chaud .aile.droite .val{color:var(--braise)}` (l. 41, « Aube »), `.tel.chaud .heatpct{color:var(--braise)}` (l. 64, « Brûlant »), `.tel.chaud .medaillon .boitier{border-color:var(--braise)}` (l. 65). ⇒ Pour ces QUATRE parties, le témoin est la CSS `.chaud` (`--braise` = (224,102,74)), pas le PNG calme. Tout le reste se compare au PNG.
- **Ce que le lot DÉCLARE (`5a3ad92` → `48992d2` → `43ac9cb`) — à vérifier, pas à croire** :
  - **B1 (nom du district)** : un fond posé sous le nom — contraste déclaré 1,70 → 5,32:1, pire cas 3,90:1 « dans la bande de fondu délibérée ». Mesure le contraste du nom sur l'art aux DEUX résolutions (pire cas inclus) ; la **FORME** de ce bandeau/fond (que la maquette n'a pas — elle est un gros plan sans nom posé sur le ciel) est un **ARBITRAGE de DA** : décris-la et classe la forme en ARBITRAGE, le contraste en finding s'il reste sous 4,5:1.
  - **M5 (voile du dock)** : la rampe avait une pente sans PALIER ; le canon déclare `.dock{background:linear-gradient(180deg,transparent,#070b12d8 40%)}` (plateau dès 40 %). Contrastes des libellés de navigation déclarés 4,20 → 7,05–8,36:1, pire cas = médiane. Mesure la marche de luminance au bord haut du dock et les 4 contrastes, aux deux résolutions, et sur le témoin ⑥.
  - **Arcs à ÉTENDUE CUITE** : bornes en degrés du canon, plus de coupe `Filled` / `fillAmount` ; fuselage déclaré ÷4,5 (froid) et ÷3,3 (chaud), arc chaud à 60° pour 60,55 déclaré. Mesure l'épaisseur radiale à mi-hauteur LE LONG de chaque arc jusqu'aux embouts (canon 2,46–2,52 constant, coupé net) et la forme des embouts.
  - **Interstice (segment neutre)** : le correcteur mesure 34° par son oracle pour 29,45 aux chemins — instrumental au moins en partie (son seuil coupe sous la mi-alpha). **C'est TOI qui tranches, en pixels, avec ta méthode** : vide VISIBLE à mi-hauteur (secteurs, 0° à droite sens trigo) — le r7 rendait canon **37°** (braise → 51°, teal dès 89°) et jeu 12°. Écris les deux bornes et le vide, pour le canon et pour le jeu.
  - **Lunette** : posée au rayon du canon (0,797 R) mais **déclarée 2,9× trop faible** (TD-654, oracle du correcteur rouge délibérément). Mesure le maximum local à r ≈ 27,1 CSS (canon +18,5 L) ; compte-le comme écart s'il est faible — le lot le déclare, il n'est pas ASSUMÉ.
  - **`.chaud` ×4** : « Brûlant » (`.heatpct`) et « Aube » (`.aile.droite .val`) déclarés passés en `--braise`, boîtier et filet déjà braise au r7. Mode du cœur des glyphes sur les quatre.
  - **COLLECTER** : remplissage sous masque arrondi (les deux variantes de bouton). Retrait de coin sur les 9 premières et 9 dernières lignes (canon 8,67 → 2,67 CSS).
  - **Volutes** : posées par une primitive à chemin depuis le `d` du canon (34×12, opacité .28). Présence, position (canon x 5,00..17,33 et 370,33..387,00 à y ≈ 25,3–26,3 CSS), opacité résultante.
- **NON traités, déclarés (lot r9 « à froid ») — à mesurer et à compter, en les marquant `DÉJÀ APPLIQUÉ / non traité déclaré`** : éclairage directionnel du fond du cadran, longueur de l'aiguille, taille du pivot. **ARBITRAGE** : flèche retour / bloc ARGENT (point 0 de l'user), titre de fiche pleine largeur (contenu).
- **Filet du bandeau** : la COTE est juste (1,00 CSS = canon) ; à ×2,7551 le rendu tronque à 2 px pleins (0,726 CSS) — troncature de rastérisation sub-3 px que le canon évite parce que ×3,000 tombe sur un entier. **Classe ASSUMÉ** : vérifie seulement qu'il est continu, pleine largeur, en `--braise`, à y = 51 CSS — pas un défaut de cote.
- **Convention de bord** : déclare-la (le r7 : NOMINAL = mi-alpha, CŒUR = > 95 % du pic).
- Fichiers touchés depuis le r7 (`d495284` → `43ac9cb`, sans stats) : `CityMap/DistrictInteriorScreenController.cs`, `Shell/AppShell.cs`, `Shell/TopBarController.cs`, `ShellContracts/ProceduralUI.cs` (①) ; CityMap/Reputation hors ①.
- **Grandeurs du tour précédent** : `grandeurs-r7.md` — valeurs sans verdict, pour la colonne `critère`. Rien d'autre des tours r1→r7 n'est fourni. ⚠️ Le r7 était PRÉ-Bold (TD-615) ; ces planches sont POST-Bold : un fût de gras ne se compare pas entre les deux.
## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE `ecran-canon.png` (`.tel` de `hud-brennar.html`, 392 CSS) | 1176 | 392 | **×3,0** |
| CAPTURES (chrome ET intérieur de district dessinés à `LargeurHudBrennar = 392`) | 1080 | 392 | **×2,755** |
| | | **rapport capture ÷ référence** | **0,918** |

- ⇒ Ramène toute mesure en px CSS (÷3,0 sur la référence, ÷2,755 sur les captures) avant de conclure. Un rond de
  dock de 46 CSS fait 138 px sur la référence et **126,7 px** sur chaque capture — les deux sont justes.
- Géométrie du canon mesurée AU NAVIGATEUR (`Tools/mesurer-maquette.py`, `mesure-canon.txt` copié dans ce dossier) :
  `.tel` 392×696,88 · `.fiche` 366×169,19 à (13 ; 424,52) · `.dock` 390×90,17 · `.rond` 46 · `.medaillon` 64 ·
  `.aile.gauche` 96×33,55 · `.aile.droite` 97,95×26,31.
- Géométrie des captures, DÉRIVÉE du code (rect non imprimé, log non préservé) : canvas 1280 u de large,
  `scaleFactor` 0,84375 ⇒ 1280×2844,4 u à 1080×2400 et 1280×2275,6 u à 1080×1920.
- ⚠️ **Le fond de district n'est JAMAIS mis à l'échelle** : art natif 1080×1920 posé au pixel (propriété certifiée
  bit-exacte). À 1080×2400, ce que l'art ne couvre pas est un panneau de couleur DÉCLARÉE (`DistrictSceneBackdrop`),
  jamais nu. Des bandes unies ne sont pas un défaut de cadrage ; leur ÉTENDUE et leur lecture, si.
- ⚠️ Le canon montre un gros plan sur un bâtiment héros ; les captures sont au palier « district entier ». Ne
  compte pas la quantité d'art visible comme un écart : juge le CHROME, la FICHE, le DOCK, la palette, le rythme.
- Ce que la normalisation ne couvre pas : les rapports INTERNES (fiche/dock, médaillon/bandeau) restent réels.

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

⚠️ Table relue le 2026-09-06 (r8) : compte GELÉ ; dock EMPIRE ; bloc ARGENT = arbitrage flèche retour ; **état BRÛLANT ⇒ boîtier/filet/« Aube »/« Brûlant » en `--braise` par la CSS `.chaud`** ; filet tronqué à 2 px = rastérisation, pas cote.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| les 3 chiffres de la fiche (`$ 2 400` · `$ 180/h` · `12%`) remplacés par des BANDES qualitatives | le DTO ne porte que des bandes (R2.2 : jamais de scalaire en projection joueur) ; les trois cases gardent position et rôle | une case vide, un scalaire inventé, ou trois cases qui ne s'alignent plus |
| libellés du dock : EMPIRE · FAMILLE · FILIÈRE · PLUS | ce sont les destinations qui EXISTENT | un 5ᵉ onglet, un libellé coupé, une casse non uniforme |
| le nom du district affiché là où le canon n'en met pas | le back projette `name` (18 noms de fiction depuis le 2026-09-02) ; on met en forme | un slug (`Verge-A`), un identifiant |
| l'heure (« 21:40 ») remplacée par le quart du jour (« Aube »…) | aucune minute de jeu côté client (forme F, `game_minute` non projeté — lot back) | un libellé anglais ou vide |
| les ronds du dock VIDES (canon : icône 20×20) | l'user a dit « j'aime pas les icônes » — ARBITRAGE ouvert, à remonter tel quel | — |
| un bouton RETOUR (flèche) en haut à gauche, absent du canon (volute décorative) | on est DANS un district : il faut pouvoir en sortir | qu'il recouvre l'aile gauche du bandeau |
| référence de NUIT, capture au quart de jour du compte | état du monde, pas de l'écran — la palette globale et la luminance moyenne ne sont pas comparables ; restreins la palette au CHROME et à la FICHE | — |
| le bloc ARGENT déplacé vers le centre par la flèche retour | ARBITRAGE user ouvert (point 0), pas de l'échelle | qu'il touche ou recouvre le médaillon ; mesure la marge |
| boîtier du médaillon, filet du bandeau, « Aube » (aile droite) et « Brûlant » (cadran) en `--braise` (224,102,74) | état BRÛLANT du compte ; règles `.tel.chaud` l. 31, 41, 64, 65 | une couleur qui ne soit ni `--laiton` (calme) ni `--braise` (chaud) ; un des quatre resté crème |
| filet du bandeau à 2 px pleins (0,726 CSS) pour une cote de 1,00 CSS | troncature de rastérisation sub-3 px à ×2,7551 (le canon ×3,000 tombe sur un entier) — déclaré par le correcteur | un filet discontinu, pas pleine largeur, pas en braise, pas à y = 51 CSS |

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
- **sept tours (r1-r3, r5-r7 ; r4 suspendu, jamais rendu) existent dans `Tools/juge-visuel/ecran-principal/`** — pas fournis ; seule `grandeurs-r7.md` t'est donnée ;
- le journal complet du run (ses lignes utiles sont citées ci-dessus, par planche) ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
