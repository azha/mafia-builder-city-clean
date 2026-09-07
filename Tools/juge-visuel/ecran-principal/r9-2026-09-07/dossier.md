# Dossier du juge visuel — ① L'intérieur de district (« le HUD de Brennar ») — r9 — 2026-09-07

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : L'intérieur de district (« le HUD de Brennar ») (①, canon `hors canon`) — contrôleur `DistrictInteriorScreenController (+ le chrome du shell : bandeau, médaillon, dock)`
- **Ce qu'on vient y faire** : l'écran que l'user désigne comme le plus important : voir son quartier vivant, repérer ses bâtiments, en toucher un pour lire ce qu'il vaut (la `.fiche`) et décider quoi en faire (COLLECTER · BLANCHIR · AMÉLIORER). Le bandeau porte l'argent, le manomètre de chaleur, le jour.
- **Chemin joueur emprunté par la capture** : session réelle → carte de ville → ENTRER dans le district (16) → [pour les captures « fiche »] appui sur le premier bâtiment.
- **États capturés** : trois planches du commit `d5ddc40` (`correcteur/ecrans`, 07/09 04:27 — « district : planches recapturées APRÈS le correctif du snap, avec leur journal et leurs empreintes ») : district sous chrome (2400) ; fiche OUVERTE à 1920 et à 2400. Descend de `78a90aa` (correctif `SnapToScreenPixel`), `d495284` (planches du r7), `fd0e21e` (r8) — VÉRIFIÉ ; 3 blobs ≠ r8 et ≠ r7, vérifiés (sha256 dans `captures-provenance.md`). **Le journal du run est JOINT** (`journal-joint.md`, 78 lignes, commité avec les planches) — première fois pour ①. Pas de témoin ⑥ (dock famille) ce tour. Le quart de jour est celui du compte photographié ; la référence est de NUIT.

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
  ⚠️ **Lis la `font-family` de TA source et applique la table `fc-match` ci-dessus** — ce que la référence a montré
  dépend de la source : SÉRIE 6 (`ecrans-brennar-6.html`) demande `'DejaVu Sans'` (84 règles) ⇒ rendue par DejaVu
  Sans elle-même, référence et client partagent la MÊME police sur le sans-sérif — **mais PAS sur le sérif** : la même source demande
  `Georgia,serif` (69 règles) ⇒ Noto Serif à la référence, DejaVu Serif au client (défaut de dossier attrapé au ㊲ r15 : le bloc ne
  citait que le sans) ; FAMILLE demande
  `"Segoe UI",Roboto,system-ui` ⇒ Noto Sans (écart de chasse = ARBITRAGE, +10 % mesuré par le juge ⑥) ; HUD
  (`hud-brennar.html`) demande `"Segoe UI",Roboto,system-ui,sans-serif` pour le corps ⇒ Noto Sans, et
  `Georgia,"Times New Roman",serif` pour titre, valeurs d'aile, heure, `.heatpct`, `.stats b` ⇒ Noto Serif. Aucune
  comparaison de FAMILLE n'est opposable là où la référence a rendu Noto et le client DejaVu ; la hauteur de capitale, si.

## Captures en jeu (Play Mode réel, compte réel, SOUS le chrome du shell)

| fichier (dans ce dossier) | résolution | état | prise le | test |
|---|---|---|---|---|
| `capture-district-1080x2400.png` | 1080×2400 — PRINCIPALE | district seul, sous chrome, fiche fermée — APRÈS le correctif du snap (`78a90aa`) | 2026-09-07 04:27 (`d5ddc40`) | `screen_1_district_sous_chrome_1080x2400.png — sha256 b94df804…` |
| `capture-fiche-1080x1920.png` | 1080×1920 (native de l'art) | fiche OUVERTE sur le premier bâtiment, 3 actions — après le correctif du snap | 2026-09-07 04:27 (`d5ddc40`) | `vue_principale_fiche.png — sha256 1f2b037d…` |
| `capture-fiche-1080x2400.png` | 1080×2400 | fiche OUVERTE, même bâtiment — après le correctif du snap | 2026-09-07 04:27 (`d5ddc40`) | `vue_principale_fiche_1080x2400.png — sha256 3bfeffee…` |

- Client au moment des captures : `d5ddc40` (`correcteur/ecrans`, 07/09 04:27), arbre de rendu = le commit des planches à 1 commit près (le journal ne l'imprime pas) ; ce dossier est préparé sur `0c7a4bc`. Une capture est une mesure DATÉE.
- Compte photographié : `operational_demo@example.test` — **régime=défaut**, JOURNAL JOINT (`journal-joint.md`) : empreinte 77 353 · 17 · 3 · 2 · 314 cartes, identique avant/après. Valeurs non comparables au canon ni à aucune campagne `demo_capture` ⇒ non vérifié ; FORME jugée.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Ce que le lot DÉCLARE (`fd0e21e` → `d5ddc40`) — à vérifier, pas à croire** :
  - **`78a90aa` — `SnapToScreenPixel` arrondissait des unités de MONDE (1 unité = 192 px pendant la capture ⇒ ±96 px de déplacement des cellules, badges, libellés de type, glyphes, marqueurs de lieutenant) ; il arrondit désormais dans le repère ÉCRAN.** Le correcteur a mesuré, dans la même frame, 39 sites : résidu médian **0,48 px** contre **85,42 px** pour l'ancien calcul. ⇒ **Toutes les positions 2D de la vue district des tours r3→r8 étaient déformées par l'instrument** : elles ne sont PAS une baseline (voir `grandeurs-r8.md` §C). Tu remesures les positions à neuf.
  - Le journal le dit lui-même : « *mon instrument établit que le déplacement de l'instrument a disparu, pas que l'image est juste* ». ⇒ le correctif est prouvé sur la MESURE, pas sur la MISE EN PAGE : **un badge peut être à sa place géométrique et sur le mauvais bâtiment — c'est exactement ce que tu juges.**
  - **Réconciliation de `mafia-blender` (07/09 ~08:10, instrument commité chez lui, non fourni)** : badge → ancre **0,60 px max sur 8/11 appariements** (le snap marche) ; **ancre → bâtiment : 23/40 ancres à plus de 3 m d'un bâtiment** (elles désignent de la rue). Contrôle de son instrument : sur la planche d'AVANT, 0/11 appariements, résidu médian 42,35 px (rapport 137×). ⇒ **Un badge posé sur du trottoir / un toit vide n'est plus un artefact : c'est un vrai défaut, dont la cause est la CARTE D'ANCRAGE (destinataire `mafia-blender`), pas le rendu du client.** Classe-le ainsi, et compte-les.
  - Ruling user qui le rend grave : « **tout doit être construit, on n'est pas un city builder** » — le sprite du joueur se pose SUR un bâtiment existant, jamais sur du sol nu. Une ancre sur la rue viole une décision de l'user, ce n'est pas une imprécision.
  - Aucun autre correctif de ① n'est déclaré entre le r8 et ces planches (halo du cerclage, arcs, voile du bandeau, volute droite, aiguille, pivot… : NON déclarés corrigés) — remesure-les ; un écart RÉCURRENT (r7, r8, r9) est un fond/arbitrage, pas un correctif de plus.
- ⚠️ **Identité — JOURNAL JOINT** (`journal-joint.md`) : `[DemoIdentityResolver] régime=défaut identité=operational_demo@example.test` ; empreinte AVANT et APRÈS la capture **77 353 min · 17 bâtiments · 3 lt · 2 planques · 314 cartes · 6/6 — IDENTIQUE** (la capture n'a rien muté). Cet écran passe par le résolveur du client et n'appelle pas l'identité de capture gelée : **c'est une propriété du chemin, pas un oubli**. ⇒ **Ne compare AUCUNE grandeur de contenu de cette planche à une planche d'une campagne `demo_capture`** (314 cartes contre 6–8 : deux mondes). Les valeurs (argent, chaleur, jour, nombres de la fiche) sont « non vérifié » ; la FORME est jugée. Le journal dit aussi : `capture : passed=1 failed=0 declares=1 comptes=1` ; lancé avec la seule paire `MAFIA_CAPTURE_*`, catégorie `CaptureDistrict`. Lis le journal, cite-le ; ne le crois pas sur ce que tu peux mesurer.
- Gardes du test : bâtiments > 0, `TopBar` présent, district actif, fiche portant le bâtiment cliqué et **exactement 3** boutons d'action. Les deux captures « fiche » sont hors écran (RenderTexture, layout refait à chaque résolution) — pas deux recadrages d'une même image.
- ⚠️ **② la fiche bâtiment (`screen_2a`) n'a pas de dossier de juge à elle : elle se juge ICI**, contre `.fiche` du canon (366×169 CSS).
- État BRÛLANT ⇒ les 4 règles `.tel.chaud` de `hud-brennar.html` (l. 31, 41, 64, 65) sont le témoin, pas le PNG calme.


## Ce que la ligne GO COUVRE — dénominateur publié par Unity (à recopier dans « non vérifié » pour ce qui manque)

```
(a) deux résolutions 1920+2400            OUI pour la fiche ; district 2400 seulement
(b) paire T / T+1 seconde                  NON
(c) onglet actif asserté                   DÉCLARÉ dans le journal JOINT (« passed=1 failed=0 declares=1 comptes=1 »)
(d) [CHROME-ALIMENTE] par planche          à LIRE dans `journal-joint.md` (non transcrit ici)
(e) blob ≠ précédente + descendance        VÉRIFIÉ par l'orchestrateur (3 blobs ≠ r8 ; d5ddc40 descend de 78a90aa, d495284, fd0e21e)
(g) SHA de l'arbre imprimé au run          NON imprimé
(i) identité                               JOINTE (journal) : régime=défaut identité=operational_demo@example.test ; empreinte identique avant/après
```

# amendement 2026-09-06 (21:05) : la ligne GO publie son DÉNOMINATEUR de couverture ; le dossier le recopie tel quel
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
- **Ronds du dock VIDES (aucune icône)** : le canon HUD pose une icône 20×20 dans chaque rond ; le client n'en pose aucune —
  **ARBITRAGE user connu (« j'aime pas les icônes »)**, jamais un écart d'écran : table ARBITRAGE, une ligne.
- **Cadre de style tranché par l'user (2026-09-06 soir)** : sombre, napolitain, mafieux, ère fin des années 1980 – début 1990.
  Si la maquette et la capture divergent sur la DIRECTION (palette d'ambiance, matière, époque, ton) plutôt que sur la géométrie,
  écris-le comme un **écart de direction = ARBITRAGE**, jamais comme un défaut d'implémentation ; un écart de géométrie, de
  couleur de jeton, de typographie ou d'espacement reste un écart d'écran.
- **Une ligne de journal ne se cite que JOINTE** (fichier dans le dossier). Sinon le dossier écrit « déclaré par la ligne GO, non
  relu » : le 2026-09-06, une ligne `[CHROME-ALIMENTE]` citée « par planche » s'est révélée inexistante dans le client, et l'identité
  n'est imprimée qu'une fois par SUITE à la connexion. Une preuve recopiée d'un message n'est pas une preuve lue.
- **Chaque capture déclare sa CATÉGORIE de suite et son ANGLE MORT** (règle 2026-09-06, ㊲ r13) : une suite qui monte le
  locataire HORS shell (`Screen…`) ne peut pas voir un défaut de chrome ni de placement face au dock ; seule une suite SOUS shell
  (`Capture…`) les exerce. Un défaut de cadre a survécu à plusieurs tours parce que deux instruments indépendants étaient aveugles
  au même endroit : l'orthogonalité des auteurs ne donne pas l'orthogonalité des angles morts, seule la DÉCLARATION la donne.
  ⇒ dans la table des captures, le rôle dit « sous shell / hors shell » et ce que la planche ne peut pas montrer.
- **Deux mesures d'un MÊME objet qui s'écartent dans des sens opposés accusent un REPÈRE, pas une valeur** (correcteur,
  2026-09-07 : ×3,27 puis ÷100 dans la même série — unités de canvas contre unités de maquette). Un écart constant accuse une
  valeur ; un écart qui change de signe et d'ordre accuse une unité. Devant ce motif, ne cherche pas le bon réglage, cherche le bon
  repère, et écris-le. ★ Une garde chiffrée par un nombre mesuré dans le mauvais repère est verte, plausible, et certifie le défaut.
- **Témoin d'ÉTAT du chrome — pour TOUT écran sous shell** : le canon HUD (`hud-canon-1176.png`) est l'état CALME (« 37 % ») ;
  quand le compte est BRÛLANT (médaillon « Brûlant »), la source `hud-brennar.html` porte la variante `.tel.chaud` sur QUATRE règles —
  filet du bandeau `.barre::after` (l. 31), valeur de l'aile droite (l. 41), `.heatpct` (l. 64), boîtier du médaillon (l. 65) — toutes
  en `--braise` (224,102,74). ⇒ Pour ces quatre parties le témoin est la CSS `.chaud`, pas le PNG calme : un filet ou un boîtier
  braise n'est pas un laiton faux (défaut de dossier attrapé au ㊲ r14 : la règle n'était écrite que dans les dossiers ①).
- **L'instrument de capture peut DÉFORMER ce qu'il mesure** (2026-09-07 : `SnapToScreenPixel` arrondit des positions MONDE ; pendant
  la capture 1 unité = 192 px ⇒ cellules, badges, libellés et glyphes du district déplacés jusqu'à ±96 px, et une « maille » à résidu
  0,0 qui n'existait pas). ⇒ Une position suspectement RONDE ou RÉGULIÈRE sur une planche (multiples d'un pas, alignements sans
  raison, entiers trop propres) est d'abord un soupçon sur la CHAÎNE DE CAPTURE, pas sur l'écran : dis-le, mesure le pas et le
  résidu, et mets-le en « non vérifié » avec la mesure hors image (les appelants de `SnapToScreenPixel`). Tant que ce correctif n'est
  pas posé, aucune planche de district prise par cette chaîne ne montre la mise en page réelle.
- **Un zéro exact au-delà d'une distance dit « rien AU-DELÀ », pas « rien »** (㊲ r15 : `P(2) = 0,02`, `P(d≥3) = 0,00` lus comme
  « aucun pixel » — l'effet existait, plus court que la première distance de la sonde). ⇒ Pour tout halo / lueur / ombre : mesurer
  AUSSI `d = 1` et la luminance BRUTE au bord de l'encre, et écrire la portée (dernier d où l'excès > 0,5) avant de conclure « absent ».
  Une fenêtre d'observation plus large que l'effet rend un zéro parfait qui ressemble à une absence.
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

⚠️ Relu pour le r9 : phase « — » hors district = état VOULU ; ronds du dock vides = arbitrage user connu ; état BRÛLANT ⇒ témoin `.tel.chaud` ; **les positions de badges/cellules/libellés ne sont PLUS un artefact d'instrument après `78a90aa`** — un badge sur la rue est un écart (cause : carte d'ancrage, destinataire blender).

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
- **les tours r1→r8 existent** — pas fournis ; seule `grandeurs-r8.md` t'est donnée (mesures, jamais de verdict ; ses POSITIONS de district sont déformées, dis-le si tu les cites) ;
- aucun témoin ⑥ ce tour ; aucune paire T/T+1 ; aucun corps réel comparable (compte vivant) ; l'instrument de réconciliation de blender n'est pas fourni (ses nombres sont DÉCLARÉS) ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
