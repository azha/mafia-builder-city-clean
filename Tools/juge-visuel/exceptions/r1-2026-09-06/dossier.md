# Dossier du juge visuel — ⑨ La file d'exceptions (Exception Queue) — r1 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La file d'exceptions (Exception Queue) (⑨, canon `screen_5`) — contrôleur `ExceptionQueueController`
- **Ce qu'on vient y faire** : la file des exceptions qui attendent le patron : lire d'un coup d'œil COMBIEN attendent et QUI (lieutenant, motif, urgence), trier / filtrer, et résoudre — au comptoir, une par une ou par lot. C'est l'écran qui portera bientôt l'arrestation d'un lieutenant (avocat, défendre ou non) : ce tour est sa LIGNE DE BASE avant qu'il grossisse.
- **Chemin joueur emprunté par la capture** : Accueil → la file d'exceptions (aussi depuis le menu Plus, « LE DOSSIER »), compte gelé.
- **États capturés** : un seul : le compte gelé `demo_capture` (6 exceptions en attente d'après les corps, dont Lt. Sallo). Les cadres d'ÉTATS de la maquette (vide « personne ne fait la queue », « après le tampon », « avec les lots back », le détail ⑩) ne sont PAS photographiés — ne pas les classer défaut, les citer en non vérifié.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-⑨-1080x2102.png` | rendu du cadre NOMINAL `ecrans-brennar-4.html` #14 « Exceptions — la file au comptoir » — ratifié (contrôleur cite série 4 cadre 14, user « ok c'est bien » 2026-08-26 ; ratification par délégation 2026-09-02) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `aide-serie6-cadre9.txt` | ⚠️ AIDE seulement : la série 6 (`ecrans-brennar-6.html` #9, l. 764, « Exceptions — l'ardoise : ils… ») est la RE-RENDITION avec le vocabulaire de la fiction (noms, « fr réel ») — non rendue en image ici ; un libellé anglais ou de substitution dans la référence série 4 = maquette en retard, pas un écart | — | — | — |
| `v4-14.png / v4-16.png / v4-17.png / v4-18.png` | cadres d'ÉTATS série 4 (#14 nominal, #16 vide, #17 après le tampon, #18 avec les lots back) rendus à ×3 (900 px) — aides de lecture, PAS des références ratifiées à cette échelle | 900×1752 | ×3 | 300 CSS = 900 px |
| `ecran-canon.png / ecran-canon-vide.png` | canon HUD antérieur (900×1752, ×3) — aide de lecture seulement | 900×1752 | ×3 | 300 CSS = 900 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-4.html`
  (atelier `3c02f72`) — cadres `<div class="cadre">` numérotés **0-based** : **#14 (l. 811) — Exceptions — la file au comptoir ⇐ NOMINAL,
  rendu en référence** · #15 (l. 825) — le détail (⑩, hors mandat) · #16 (l. 842) — personne ne fait la queue · #17 (l. 853) — après le
  tampon, le suivant s'avance · #18 (l. 866) — avec les lots back. Série 6 (`ecrans-brennar-6.html`, fiction) : #9 (l. 764) nominal,
  #11–13 (l. 770–776) états. Le châssis commun (jetons, primitives) est en tête de chaque fichier.

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
  Sans elle-même, référence et client partagent la MÊME police sur le sans-sérif ; FAMILLE demande
  `"Segoe UI",Roboto,system-ui` ⇒ Noto Sans (écart de chasse = ARBITRAGE, +10 % mesuré par le juge ⑥) ; HUD
  (`hud-brennar.html`) demande `"Segoe UI",Roboto,system-ui,sans-serif` pour le corps ⇒ Noto Sans, et
  `Georgia,"Times New Roman",serif` pour titre, valeurs d'aile, heure, `.heatpct`, `.stats b` ⇒ Noto Serif. Aucune
  comparaison de FAMILLE n'est opposable là où la référence a rendu Noto et le client DejaVu ; la hauteur de capitale, si.

## Captures en jeu (Play Mode réel, compte réel, SOUS le chrome du shell)

| fichier (dans ce dossier) | résolution | état | prise le | test |
|---|---|---|---|---|
| `capture-1080x2400.png` | 1080×2400 — PRINCIPALE | compte gelé, sous chrome | 2026-09-06 14:56 (`03efb90`, campagne TD-615 post-Bold) | ``screen_5_exceptions_sous_chrome_1080x2400.png` — sha256 `c63a9fe6…`` |
| `capture-sans-chrome-declaree-1080x2400.png` | 1080×2400 | DÉCLARÉE sans chrome par son nom — à VÉRIFIER (sur ③ la planche homonyme portait bandeau et dock) | 2026-09-06 14:56 (`03efb90`) | ``screen_5_exceptions_1080x2400.png` — sha256 `93a1da63…`` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `d021abd`. Une capture est une mesure DATÉE.
- Compte photographié : `demo_capture@example.test`, compte GELÉ à la minute 72 118 (base `a0623a5`, empreinte 72118 · 17 · 3 · 2 inchangée jusqu'à 15:15Z, les planches datent de 12:56Z). ⚠️ **La ligne de journal `[DemoIdentityResolver] régime=env …` de CE run n'est PAS jointe** (campagne de recapture `03efb90`, dont une catégorie au moins a tourné sans la paire d'identité) ⇒ par la règle du dossier, les VALEURS (noms, compte d'exceptions, montants) vont en « non vérifié » tant que l'identité n'est pas établie ; **la FORME se juge**. Indice à relever, sans conclure : le compte gelé porte 6 exceptions en attente dont **Lt. Sallo** (corps) — inventorie ce que la planche montre (combien de rangées, quels noms) sans le compter comme écart.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Ligne de base** : premier tour de cet écran — aucune déclaration de correctif, aucune grandeur antérieure. Mesure TOUT ce qui se voit.
- **Chrome** : ARGENT / JOUR peuvent porter un tiret et le médaillon être vide (course de capture, planches antérieures à `9fa198a`) — si c'est le cas, dis-le en tête et ne juge pas le chrome ; la phase à « — » hors district est un état VOULU (ASSUMÉ). Sinon le chrome se juge contre le HUD canon.
- **Vocabulaire** : la référence série 4 peut porter des libellés de substitution ou anglais ; la série 6 (#9) porte la fiction — un libellé de la fiction dans le jeu contre un placeholder dans la référence = maquette en retard, pas un écart (règle du dossier).
- **Convention de bord** : déclare-la.
- ⚠️ Ces planches sont POST-Bold (TD-615, `6aadd9e` 14:45 < `03efb90` 14:56) : les graisses se comparent.
## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (cadre de série 4 — cadre #14, MÊME planchier `.tel` de 300 CSS que la série 6/4, `.tel` 300 CSS) | 1080 | 300 | **×3,6** |
| CAPTURE (contenu de l'écran, dessiné à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | **×3,6** |
| | | **rapport capture ÷ référence** | **1,00** |

- ⇒ Pour le CONTENU de l'écran, référence et capture sont **à la même échelle** : 1 px CSS = 3,6 px des
  deux côtés. Un écart de taille sur le contenu est donc un écart RÉEL, pas un artefact d'instrument.
- ⚠️ **Le CHROME (bandeau haut + dock du bas) n'est PAS à cette échelle.** Il est construit par le shell
  d'après `hud-brennar.html` (`.tel` de **392 CSS**) : `AppShell.Px(css) = css × 1280/392` — soit
  **×2,755 px par px CSS à 1080 de large** (`Assets/Scripts/Shell/AppShell.cs:1583`, `EchelleMaquette.cs:87`).
  Le cadre de série 4 — cadre #14, MÊME planchier `.tel` de 300 CSS que la série 6 dessine sa propre barre et son propre dock à 300 CSS : ce sont des ÉVOCATIONS du
  chrome, pas le chrome. ⇒ **Le chrome se juge contre le canon du HUD** (`Tools/juge-visuel/ecran-principal/ecran-canon.png`,
  1176 px = 392 CSS, ×3) **et le contenu contre le cadre de série 4 — cadre #14, MÊME planchier `.tel` de 300 CSS que la série 6**. Une différence de hauteur de
  bandeau entre le cadre de série 4 — cadre #14, MÊME planchier `.tel` de 300 CSS que la série 6 et la capture est ASSUMÉE (chrome partagé), pas un défaut de l'écran.
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

⚠️ Table écrite pour le r1 (2026-09-06 soir) depuis les corps de la base gelée et les règles du programme — pas de juge-données préalable sur ⑨.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| les noms de lieutenants et les motifs sont ceux du COMPTE GELÉ (Lt. Sallo, Rook, Halde…), pas ceux de la maquette | données : la maquette écrit des noms de fiction de série 4 ; le back sert le roster réel | un slug, une clé i18n brute, un mot anglais, un nom vide |
| le NOMBRE d'exceptions diffère de la maquette | données : 6 en attente sur le compte gelé (corps `GET_exceptions_queue`) | une liste vide sans l'état « personne ne fait la queue », une rangée tronquée, un chevauchement |
| un tiret « — » à la place de la PHASE (aile droite du bandeau) | état VOULU hors district | un tiret sur ARGENT/JOUR ou un médaillon vide (course de capture) — à dire en tête |
| ronds du dock sans icône | arbitrage user connu (« j'aime pas les icônes ») | un rond coupé, un libellé de repli |
| les chiffres de la maquette (montants, jours) rendus en BANDES ou avec d'autres valeurs | R2.2 + données | un scalaire inventé, un format anglais (« $10,000.00 ») |

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
- aucune capture des cadres d'états (#16 vide, #17 après tampon, #18 lots back) ni du détail ⑩ ;
- le journal du run de `03efb90` (identité non établie — voir *compte*) ;
- pas de 2ᵉ résolution (1920) ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
