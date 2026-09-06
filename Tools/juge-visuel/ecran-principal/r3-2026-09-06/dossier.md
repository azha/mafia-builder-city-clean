# Dossier du juge visuel — ① L'intérieur de district (« le HUD de Brennar ») — r3 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : L'intérieur de district (« le HUD de Brennar ») (①, canon `hors canon`) — contrôleur `DistrictInteriorScreenController (+ le chrome du shell : bandeau, médaillon, dock)`
- **Ce qu'on vient y faire** : l'écran que l'user désigne comme le plus important : voir son quartier vivant, repérer ses bâtiments, en toucher un pour lire ce qu'il vaut (la `.fiche`) et décider quoi en faire (COLLECTER · BLANCHIR · AMÉLIORER). Le bandeau porte l'argent, le manomètre de chaleur, le jour.
- **Chemin joueur emprunté par la capture** : session réelle → carte de ville → ENTRER dans le district (16) → [pour les captures « fiche »] appui sur le premier bâtiment.
- **États capturés** : trois captures : district SEUL sous chrome (1080×2400) ; fiche OUVERTE à 1080×1920 (résolution native de l'art) ET à 1080×2400. Le quart de jour (aube/nuit) est celui du compte de démo — la référence est de NUIT (« JOUR 12 · SOIRÉE »).

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
  `'DejaVu Sans'` est demandée par 84 règles de la série 6 et rendue par DejaVu Sans elle-même : sur le
  sans-sérif, référence et client partagent la MÊME police — un écart y est un écart de taille, pas de famille.

## Captures en jeu (Play Mode réel, compte réel, SOUS le chrome du shell)

| fichier (dans ce dossier) | résolution | état | prise le | test |
|---|---|---|---|---|
| `capture-district-1080x2400.png` | 1080×2400 | district seul, sous chrome, fiche fermée | 2026-09-04 11:22 | `VuePrincipaleCapturePlayModeTests (`screen_1_district_sous_chrome_1080x2400.png`)` |
| `capture-fiche-1080x1920.png` | 1080×1920 (native de l'art) | fiche OUVERTE sur le premier bâtiment, 3 actions | 2026-09-04 11:22 | `idem (`vue_principale_fiche.png`)` |
| `capture-fiche-1080x2400.png` | 1080×2400 | fiche OUVERTE, même bâtiment | 2026-09-04 11:22 | `idem (`vue_principale_fiche_1080x2400.png`)` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `379ad94`. Une capture est une mesure DATÉE.
- Compte photographié : celui du shell par défaut, `operational_demo@example.test` (`AppShell.cs:104`), garni
  par le seeder — **pas un compte frais**. Son état au moment de la capture n'est pas re-mesurable ici.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- Gardes du test : bâtiments > 0, `TopBar` présent, district 16 actif, fiche portant le bâtiment cliqué et **exactement 3** boutons d'action. Les deux captures « fiche » sont hors écran (RenderTexture, layout refait à chaque résolution) — pas deux recadrages d'une même image.
- ⚠️ **② la fiche bâtiment (`screen_2a`) n'a pas de dossier de juge à elle : elle se juge ICI**, contre `.fiche` du canon (366×169 CSS).
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

⚠️ Cette table date du tour r2 (2026-08-25). Depuis : les 18 districts ont un nom de fiction, chaque bâtiment porte `name_i18n` (S2-a résolu), le bundle `fr` fait 674 clés, et l'écran a été repris. **Plusieurs de ces assumés sont peut-être PÉRIMÉS** — si la capture montre un nom là où la table dit « type », c'est la table qui a vieilli, pas un écart : note-le comme tel.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| les 3 chiffres de la fiche (`$ 2 400` · `$ 180/h` · `12%`) remplacés par des BANDES qualitatives | le DTO ne porte que des bandes (R2.2 : jamais de scalaire en projection joueur) ; les trois cases gardent position et rôle | une case vide, un scalaire inventé, ou trois cases qui ne s'alignent plus |
| le nom du bâtiment remplacé par son TYPE — **peut-être périmé** (`name_i18n` par bâtiment depuis C3) | au r2 : aucun nom en base ; depuis : `…/heat` porte `name_i18n` | un nom vide, une clé brute |
| le nom du district affiché là où le canon n'en met pas | le back projette `name` (18 noms de fiction depuis le 2026-09-02) ; on met en forme | un slug (`Verge-A`), un identifiant |
| l'heure (« 21:40 ») remplacée par le quart du jour (« Aube »…) | aucune minute de jeu côté client (forme F, `game_minute` non projeté — lot back) | un libellé anglais ou vide |
| libellés du dock : ACCUEIL · FAMILLE · FILIÈRE · PLUS (canon : EMPIRE · FAMILLE · MARCHÉ · PLUS) | ce sont les destinations qui EXISTENT ; nommer un écran absent serait un mensonge d'interface | un 5ᵉ onglet, un libellé coupé, une casse non uniforme |
| les ronds du dock VIDES (canon : icône 20×20) | l'user a dit « j'aime pas les icônes » — ARBITRAGE ouvert, à remonter tel quel | — |
| un bouton RETOUR (flèche) en haut à gauche, absent du canon (volute décorative) | on est DANS un district : il faut pouvoir en sortir | qu'il recouvre l'aile gauche du bandeau |
| référence de NUIT, capture au quart de jour du compte | état du monde, pas de l'écran — la palette globale et la luminance moyenne ne sont pas comparables ; restreins la palette au CHROME et à la FICHE | — |

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
- **deux tours (r1, r2 du 2026-08-25) existent dans `Tools/juge-visuel/ecran-principal/`** — pas fournis, ne les ouvre pas ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
