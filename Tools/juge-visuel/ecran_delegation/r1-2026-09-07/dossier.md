# Dossier du juge visuel — ㉜ Ce que vous avez confié (« le tableau de service ») — r1 — 2026-09-07

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Ce que vous avez confié (« le tableau de service ») (㉜, canon `écran neuf, sans id canon`) — contrôleur `DelegationScreenController`
- **Ce qu'on vient y faire** : non fourni par front.md (aucune puce « Montre ») — c'est au juge de l'écrire au temps 0, depuis la référence SEULE
- **Chemin joueur emprunté par la capture** : Plus → CE QUE VOUS AVEZ CONFIÉ
- **États capturés** : PREMIER TOUR (r1) — aucune planche jugée avant. 1 capture(s), 1 campagne(s) : `03efb90` 06/09 14:56. Planches = blobs commités sur `main` du client (`fd0e21e` est le tip de la base de preuve du 06/09 soir) ; aucun correctif d'écran antérieur ⇒ pas de descendance à vérifier, pas de tour précédent.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-1080x2102.png` | rendu du cadre nominal (`ecrans-brennar-6.html` #73) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `9fd7b6f` ;
  références rendues au SHA `3c02f72`). Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet
  écran, avec la ligne où chacun commence :
  - #73 (l.4971) — Tout est encore à vous  ⇐ **cadre NOMINAL, rendu en référence**
  - #74 (l.4973) — Confier l'approvisionnement
  - #75 (l.4975) — Deux charges confiées
  - #76 (l.4977) — Reprendre — ce que ça coûterait
  - #77 (l.4979) — Vous avez déjà tranché aujourd'hui
  - #78 (l.4981) — Les huit qui n'existent pas encore
  Le châssis commun (jetons de couleur, primitives) est `/home/erutheone/project/atelier3d-mafia/chassis6.py` — plusieurs classes ne sont
  DÉFINIES que là. La CSS sert à NOMMER les valeurs voulues (hex, px, états) ; si CSS et image divergent, l'image gagne.
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` — Chrome sans tête, fenêtre généreuse puis recadrage
  à 300×584 CSS × 3,6 = 1080×2102, assertion de taille en sortie (anti-crop payé deux fois ici).
- ⚠️ **Témoin** : la référence rendue est le cadre NOMINAL. Si la capture montre un AUTRE état (liste vide, semaine
  en cours, rapport traité…), choisis le cadre d'état homologue dans `etats/` (quand ce répertoire existe dans le
  dossier — sinon il n'y a que la SOURCE, et c'est dit ici) — et dis lequel.

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
| `capture-1080x2400.png` | 1080×2400 — PRINCIPALE | surimpression sous chrome (test de planche) — campagne `03efb90` (06/09 14:56) | 06/09 14:56 (`03efb90`) | `planche_ce_que_vous_avez_confie_1080x2400.png — sha256 0dcbe120…` |

- Client au moment des captures : `03efb90` (`main` du client, 06/09 14:56) — une capture par campagne, voir la table ; ce dossier est préparé sur `28b9da5`. Une capture est une mesure DATÉE.
- Compte photographié : compte de CAPTURE `demo_capture@example.test` (gelé, puis dérivant entre campagnes — voir la note) — identité DÉCLARÉE par corps de commit, non relue ; valeurs non comparables à la référence ni aux corps ⇒ non vérifié ; FORME jugée.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Identité par campagne — DÉCLARÉE par le CORPS DE COMMIT (aucun journal joint dans l'arbre ; `journal-declare.txt` transcrit), jamais relue** :
  - `03efb90` (06/09 14:56) : « empreinte du compte gelé identique avant/après » : **72 118** · 17 bâtiments · 3 lt · 2 planques · 7 cartes — DÉCLARÉ (compte gelé `demo_capture`).
- ⚠️ **Le compte « gelé » a DÉRIVÉ entre les campagnes** (empreintes lues dans les corps de commit par f2) : 06:56 → 72 013 min / 17 bât. / 6 cartes · 14:56 et 15:31 → 72 118 / 17 / 7 · 20:53 → 72 155 / 20 / 8 — une seule campagne ici, mais les VALEURS restent non vérifiées (compte de capture, pas la maquette).
- **Planches `planche_*`** : écran monté en **SURIMPRESSION sous le chrome** par le test de planche `PlancheEcransManquantsCapturePlayModeTests` (déclaré par la suite qui écrit ce nom de fichier) — le chemin joueur (menu Plus) n'est PAS exercé par cette capture ; le chrome (bandeau, dock) est celui du shell, alimenté ou non (mesure-le : témoin `.tel.chaud` si BRÛLANT, phase « — » hors district = voulu).


## Ce que la ligne GO COUVRE — dénominateur publié par Unity (à recopier dans « non vérifié » pour ce qui manque)

```
(a) deux résolutions 1920+2400            NON — 2400 seulement
(b) paire T / T+1 seconde                  NON
(c) onglet actif asserté                   NON déclaré (surimpression : le chemin joueur n'est pas exercé)
(d) [CHROME-ALIMENTE] par planche          NON déclaré — à mesurer sur l'image
(e) blob commité, présent, premier tour     VÉRIFIÉ par l'orchestrateur (sha256 dans `captures-provenance.md`) ; aucun correctif antérieur
(g) SHA de l'arbre imprimé au run          NON imprimé (« dernier commit » = commit du PNG)
(i) identité                               DÉCLARÉE par corps de commit, par campagne (ci-dessus) ; journal non joint
```

# amendement 2026-09-06 (21:05) : la ligne GO publie son DÉNOMINATEUR de couverture ; le dossier le recopie tel quel
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
  chrome, pas le chrome. ⇒ **Le chrome se juge contre le canon du HUD** — dans ce dossier : **`hud-canon-1176.png`** (lien vers
  `Tools/juge-visuel/ecran-principal/ecran-canon.png`, 1176 px = 392 CSS, ×3 ; ⚠️ un fichier `ecran-canon.png` LOCAL, s'il existe,
  est un canon ANTÉRIEUR de l'écran, pas le HUD) **et le contenu contre le cadre de série 6**. Une différence de hauteur de
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

⚠️ Premier tour : **aucune table d'écarts assumés** n'a été inventoriée pour cet écran — tu classes toi-même (ASSUMÉ n'existe donc que pour les règles de doctrine ci-dessous). Aucun rapport juge-données n'existe pour cet écran (écran neuf) : toute question « d'où vient cette valeur ? » va en « non vérifié ». Rappels : phase « — » hors district = état VOULU ; ronds du dock vides = arbitrage user connu ; CHALEUR/HEAT ou anglais dans la RÉFÉRENCE = maquette en retard (blender), jamais un écart ; une clé i18n BRUTE ou un libellé de repli visible sur la CAPTURE = écart de SENS ; cadre de style (sombre, napolitain, mafieux, fin 80s–début 90s) : divergence de DIRECTION = ARBITRAGE, jeton/matière/asset absent = écart.
- **États vides (priorité 1 de l'user, 07/09 00:40)** : un état vide se juge au SENS — « *ça plafonne et ça BLOQUE, rien n'est perdu* ». Un vide qui se lit comme une perte, une punition ou un écran cassé est un défaut de SENS (BLOQUANT si c'est la première lecture) ; un vide qui dit ce qui manque et comment l'obtenir est conforme même sans illustration. Les illustrations d'état vide de l'atelier (`etats/vide-maquette-*.png`, quand fournies) ne sont montées dans AUCUN écran du client (0 `Resources.Load` d'illustration d'état vide, mesuré par le correcteur) : elles servent à juger le SENS voulu, pas à retrouver une image au pixel — leur absence à l'écran n'est pas un écart, c'est un montage qui n'existe pas encore (arbitrage/lot).

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|


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
- aucun tour précédent, aucune grandeur antérieure ;
- aucun journal joint (identités DÉCLARÉES par corps de commit dans `journal-declare.txt`) ; aucune paire T/T+1 ; aucun corps réel comparable (les corps de `corps-reels/` du dossier de l'écran datent du 04/09 sur `operational_demo`, pas du compte gelé : NON comparables en valeur) ;
- les cadres d'ÉTAT de la maquette ne sont PAS rendus ce tour (aucun rendu possible) — seule la SOURCE HTML/CSS des cadres du groupe est lisible ; le cadre nominal seul est rendu ;
- ⚠️ les planches `ecran_*_1080x2400/1920` de la campagne `1d3d412` sont VIDES (0,000 % d'encre, mesuré) : NON fournies — la seule capture est celle du test de planche ;

- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
