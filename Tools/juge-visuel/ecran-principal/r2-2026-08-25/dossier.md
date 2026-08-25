# Dossier du juge visuel — Écran principal (district de Brennar) — r2 — 2026-08-25

## L'écran

- **Nom** : l'écran principal — l'intérieur d'un district. L'user l'appelle « l'écran principal »
  et dit : « c'est lui le plus important ».
- **Ce qu'on vient y faire** : voir son quartier vivant, repérer ses bâtiments, en toucher un pour
  savoir ce qu'il vaut et décider quoi en faire.
- **Chemin joueur emprunté par la capture** : signup réel → `session/open` réel → carte de ville →
  entrée dans le district 16 → **appui sur le premier bâtiment** (le même `OuvrirFiche` que le
  `Button` de la cellule appelle). Aucun mock, aucune donnée fabriquée.
- **États capturés** : un seul état de contenu (jour, `day_phase` = Dawn, fiche OUVERTE sur un
  bâtiment). C'est l'état que l'user a nommé — il veut voir les 3 actions ET les 4 bulles ensemble.
  L'état « fiche fermée » n'est pas fourni ce tour-ci.

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `ecran-canon.png` | rendu ratifié, **téléphone SEUL** | 1176×2091 | ×3 | **392 px CSS = toute la largeur** |
| `/home/erutheone/project/atelier3d-mafia/hud-brennar.html` | source (aide de lecture, ne prime JAMAIS sur l'image) | — | — | — |

- **Script de rendu** : `Tools/rendre-maquette.py` (commité), rendu du 2026-08-25. Le `.tel` a été
  ISOLÉ et collé en 0,0, puis recadré à 1176×2091 = 392×697 CSS × 3. Assertion de non-rognage
  passée (« rendu ≥ géométrie source imposée ») — Chrome sans tête crope en silence quand la
  fenêtre est juste, piège déjà payé ici.
- **Géométrie du canon mesurée AU NAVIGATEUR** (`Tools/mesurer-maquette.py`, sortie dans
  `mesure-canon.txt`) — pas déduite des paddings :

      .tel     392,00 × 696,88        .fiche   366,00 × 169,19  à ( 13,00 · 424,52)
      .dock    390,00 ×  90,17        .rond     46,00 ×  46,00
      .medaillon 64,00 × 64,00        .aile.gauche 96,00 × 33,55 · .aile.droite 97,95 × 26,31

- **CORRESPONDANCE D'ÉCHELLE — le juge la reçoit, il n'a pas à la deviner** :
  **1 px CSS de la maquette = largeur_capture / 392.** Donc à 1080 de large, **1 px CSS = 2,755 px
  de capture**. Un rond de 46 CSS doit mesurer **126,7 px** dans les deux captures (elles font
  toutes deux 1080 de large).

- **Polices — ce qui a RÉELLEMENT rendu le PNG de référence** (`fc-match`, machine du rendu) :

      Georgia           →  Noto Serif        (PAS Georgia — absente de la machine)
      "Times New Roman" →  Liberation Serif
      serif             →  Noto Serif
      "Segoe UI"        →  Noto Sans
      Roboto            →  Noto Sans
      sans-serif        →  Noto Sans

  Le client embarque **DejaVu Sans** et **DejaVu Serif** (`DesignTokens.primaryFont` /
  `hudSerifFont`), choisies pour leur couverture de glyphes.
  ⇒ **La maquette n'a JAMAIS montré Georgia à personne.** Un écart de FAMILLE ou de chasse est un
  **ARBITRAGE**, pas un défaut du client. Un écart de HAUTEUR DE CAPITALE reste un écart légitime
  (c'est l'image que l'user a approuvée).

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | état | test |
|---|---|---|---|
| `capture-1080x1920.png` | 1080×1920 — résolution NATIVE de l'art de district | jour, fiche ouverte | `Capture_VuePrincipale_DistrictAvecBatiments_SousChromeV31` |
| `capture-1080x2400.png` | 1080×2400 — le téléphone 19,5:9 réellement visé | jour, fiche ouverte | idem |

- Les deux sont prises hors écran (RenderTexture + canvas en `ScreenSpaceCamera`), le layout est
  réellement refait à chaque résolution — ce ne sont pas deux recadrages d'une même image.
- **Gardes anti-mensonge du test** (sans elles une capture de l'écran d'AVANT passerait) : la fiche
  doit être OUVERTE, porter le bâtiment cliqué, et compter **exactement 3** boutons d'action.
- Pixels non noirs mesurés : **100.0 %** et **100.0 %**.
- Commit du client au moment des captures : `12b665b` — prises APRÈS le dernier correctif.

## Règles de doctrine applicables

- **Portrait** : le projet vise le téléphone portrait. Les deux captures sont portrait.
- **Langue affichée : français**, via résolveurs nommés — aucun enum brut ne doit atteindre l'écran.
- **L'or jamais en aplat**, sauf sur l'unique action principale (le canon : « une seule action
  colorée : COLLECTER »).
- **Contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits — mesuré sur l'ART RÉEL, jamais sur un gris
  choisi.
- **Le fond de district n'est JAMAIS mis à l'échelle** : il est posé à sa taille native et aligné au
  pixel (propriété certifiée bit-exacte). Ce qui n'est pas couvert par l'art est rempli par un
  panneau de couleur DÉCLARÉE (`DistrictSceneBackdrop`), jamais laissé nu. ⇒ Des bandes unies autour
  de l'art ne sont pas un défaut de cadrage ; en revanche, **leur étendue et leur lecture** sont
  jugeables.
- **Le canon montre un niveau de ZOOM différent** (gros plan sur un bâtiment héros). La capture est
  au palier « district entier ». ⇒ Ne pas compter la quantité d'art visible comme un écart ; juger
  le CHROME, la FICHE, le DOCK, la palette et le rythme.

## Ce qui a changé depuis la capture précédente (pour que tu saches que ce n'est PAS le même monde)

Une passe de correctifs a eu lieu. On ne te dit ni lesquels ni où : ton travail est de mesurer
l'écran tel qu'il est. La seule chose utile à savoir est que **les captures sont neuves**, prises
après cette passe, sur le même chemin joueur.

⚠️ **Un écart supplémentaire est ASSUMÉ et n'était pas déclaré au tour précédent** : la référence
est l'état **NUIT** (`JOUR 12 · SOIRÉE`, 21:40) et la capture l'état **JOUR** (`day_phase = Dawn`).
Toute comparaison de palette globale, de luminance moyenne et de l'art lui-même est donc **non
concluante** — restreins tes mesures au CHROME (bandeau, fiche, dock).

## Écarts ASSUMÉS (à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »)

| écart | raison mesurée |
|---|---|
| Les 3 chiffres de la fiche (`$ 2 400` · `$ 180/h` · `12%`) sont remplacés par des **bandes qualitatives** (« Au repos » · « Coupée » · « Sain ») | Le DTO du bâtiment ne porte **aucun scalaire** — que des bandes — et la règle R2.2 interdit les scalaires bruts en projection joueur. Les inventer serait fabriquer de la donnée. Les trois cases gardent leur POSITION et leur RÔLE. |
| Le nom du bâtiment (« LE VERGE D'OR ») est remplacé par son **type** (« Lab ») | Le DTO ne porte pas de nom. |
| Le nom du district s'affiche en clair (« Verge A ») là où le canon n'en affiche aucun | Le back ne projette qu'un identifiant (`name_canonical`, « e.g. Tidewater-1 ») ; on met en forme, on n'invente pas. |
| L'heure du canon (« 21:40 ») est remplacée par le quart du jour (« Aube ») | **Aucune donnée d'horloge n'existe côté client** : le DTO de session ne porte pas de minute de jeu. Substitut déclaré. |
| Libellés du dock : ACCUEIL · FAMILLE · FILIÈRE · PLUS au lieu de EMPIRE · FAMILLE · MARCHÉ · PLUS | Ce sont les destinations qui EXISTENT réellement dans le client. Nommer un écran qui n'existe pas serait un mensonge d'interface. |
| Les ronds du dock sont **vides** — le canon y met une icône de 20×20 | L'user a dit ailleurs « j'aime pas les icônes ». C'est un ARBITRAGE ouvert, à remonter. |
| Un bouton **retour (flèche)** existe en haut à gauche, absent du canon (qui y met une volute décorative) | On est DANS un district : il faut pouvoir en sortir. |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- tout rapport de juge précédent — **il en existe un (r1), et il ne t'est délibérément pas
  fourni**. Tu dois refaire l'inventaire depuis les pixels, pas vérifier une liste : un juge qui
  hérite du contexte hérite des angles morts, et un juge à qui l'on donne « ce qui a été corrigé »
  ne cherche plus ailleurs ;
- toute capture « avant ».
