# Dossier du juge visuel — ㊲ La réputation (« le miroir ») — r13 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La réputation (« le miroir ») (㊲, canon `screen_b3`) — contrôleur `ReputationScreenController`
- **Ce qu'on vient y faire** : « le miroir » : on vient lire ce que son lieutenant a ABSORBÉ des règles qu'on lui a données — pas ce qu'on lui a dit, ce qu'il en a retenu. L'écran est UN portrait : le lieutenant, sa posture, ses quatre indices de tenue ; on se lit sur lui.
- **Chemin joueur emprunté par la capture** : onglet PLUS → première entrée « LA RÉPUTATION » (chemin RÉEL du joueur, `Capture_EcranReputation_SousChrome`), compte de démo.
- **États capturés** : celui du compte post-campagne — VIERGE (#120) ou GARNI (#119), ton inventaire le dira. Cinq planches du MÊME commit `34e28bf` (`origin/main`, 23:27 — « ㊲ recapturé post-correctifs — 5 fichiers, pas 4 » ; `50c0a7f` = les trois correctifs, ancêtre ; chaque planche : commit `34e28bf`, blob ≠ r12, vérifié par l’orchestrateur). ⚠️ Deux CATÉGORIES : `CaptureReputation` (sous chrome — la seule qui exerce le cadre SOUS SHELL, donc le CTA/dock) et `ScreenB3` (écran seul, locataire monté HORS shell — aveugle par construction à tout défaut de chrome).

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
- Générateur de cet écran : `/home/erutheone/project/atelier3d-mafia/generateur-reputation.py` (+ `chassis6.py` pour `.elast`, `.enseigne`, `.fen`, `.pann`, `.cta6`). Le cadre a une hauteur FIXE de **462 px CSS** (`reputation(cadre, H=462)`). ⚠️ Mesuré au r10 : **la maquette pose ce bloc EN BAS** du `.tel` (sous 434 px d'évocation de chrome, filet bas à y = 2078 sur 2102) ; **le client le pose EN HAUT** (sous le bandeau réel). L'ancrage est INVERSÉ — c'est un écart de mise en page à part entière (à classer), et il rend indécidable, sur une capture sans chrome, ce que le bandeau du shell recouvrirait. Un vide DANS le cadre se juge ; l'espace hors du cadre se lit à l'aune de cet ancrage.

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
| `capture-1080x2400.png` | 1080×2400 — PRINCIPALE | sous chrome — catégorie `CaptureReputation` (la seule qui EXERCE le cadre sous shell) | 2026-09-06 23:27 (`34e28bf`) | ``screen_b3_reputation_sous_chrome_1080x2400.png` — sha256 `e83de77b…`` |
| `capture-1080x1920.png` | 1080×1920 | sous chrome — `CaptureReputation` : c’est ICI que B1 (CTA sous le dock) se juge | 2026-09-06 23:27 (`34e28bf`) | ``screen_b3_reputation_sous_chrome_1080x1920.png` — sha256 `11da66b6…`` |
| `capture-ecran-seul-1080x2400.png` | 1080×2400 | écran SEUL — catégorie `ScreenB3` monte le locataire HORS shell : ne peut pas voir un défaut de chrome | 2026-09-06 23:27 (`34e28bf`) | ``screen_b3_reputation_1080x2400.png` — sha256 `6a16f4e2…`` |
| `capture-ecran-seul-1080x1920-T.png` | 1080×1920 | écran seul — instant T de la paire | 2026-09-06 23:27 (`34e28bf`) | ``screen_b3_reputation_1080x1920.png` — sha256 `a8a74891…`` |
| `capture-ecran-seul-1080x1920-T+1s.png` | 1080×1920 | écran seul — instant T+1 s (même run) : compte les pixels différents ; le nom arrive-t-il encore après la 1re frame ? | 2026-09-06 23:27 (`34e28bf`) | ``screen_b3_reputation_1080x1920_t1s.png` — sha256 `11c060a1…`` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `4a873fc`. Une capture est une mesure DATÉE.
- Compte photographié : `demo_capture@example.test` — base post-campagne, **empreinte encadrante IDENTIQUE avant/après la capture** (f2, 23:30 : la capture n’a rien déplacé ; run 14/14, declares = comptes = 14). Toujours PAS de corps réels comparables (base `a0623a5` = minute 72 118) ⇒ VALEURS en non vérifié, FORME jugée. Identité : « déclarée par la ligne GO, non relue » ((c)/(d) inconnus pour cette suite).
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Ce que le lot DÉCLARE (`fd0e21e` → `50c0a7f` → `34e28bf`) — à vérifier, pas à croire** :
  - **B1 (1920 : le CTA passait sous le dock)** — déclaré FERMÉ : le cadre remonte de 88 px, son bas passe de **1737 → 1649** (sous la fin de zone libre 1681) ; cause nommée : la hauteur se recalculait à chaque changement de dimensions mais la POSITION restait cuite au montage. L’instrument du correcteur, validé sur l’état d’avant, y rendait 250 et 1737 = les deux nombres du r12. Mesure contenu (cadre + CTA) et première encre du dock à 1920 SOUS CHROME (`capture-1080x1920.png`).
  - **M5 (la coiffe)** — correctif STRUCTUREL déclaré (l’occlusion débordait de 5 unités SOUS la coiffe — exactement la bande mesurée ; désormais une fenêtre de masque aux dimensions de la coiffe). ⛔ **Le correcteur ne prétend PAS l’avoir fermé** : ses trois tentatives de reproduire la mesure ont rendu des verdicts uniformes ou absurdes, il refuse de conclure avec un instrument faux. **C’EST LA QUESTION OUVERTE DU TOUR, à toi de trancher**, avec les trois grandeurs du r12 : épaisseur latérale de sombre à 15 % de la hauteur du visage (réf 19-20 px, r12 0 px), hauteur du sommet où 80 % de la largeur max est atteinte (réf 30 px, r12 17 px), nombre de rangées où le crâne touche le fond SANS contour (réf 0, r12 8). Déclare comment tu isoles la coiffe.
  - **M1 (le halo des compteurs)** — **INCHANGÉ, délibérément** : le paramètre est identifié (deux halos voisins du même fichier à 0,66 et 0,70, celui des compteurs hérite de 1,0), mais le modèle analytique du correcteur prédit un rapport de **8,1** là où le r12 mesurait **2,9** ⇒ il ne pose aucune valeur sans TA mesure sur cette planche : profil d’excès de luminance par distance de Chebyshev d2..d20 autour des chiffres (réf d2 +29,7 … d20 +2,7 ; r12 d2 +66,6 … d20 +22,8) et **le RAPPORT jeu/canon par distance**, plus le contraste des chiffres (réf 7,41:1 ; r12 4,11:1). Dis aussi ce qui domine : l’alpha (hauteur du pic) ou le rayon (étendue).
  - **Unity signale à l’œil, sans diagnostiquer** : une **ligne cyan horizontale qui traverse le portrait**, et le halo toujours visible. Mesure la ligne : est-ce la ligne de balayage (r12 m1 : +34 %, atteint les deux bords) qui passe désormais SUR le portrait, ou autre chose ?
  - **La paire T / T+1 s** (écran seul, 1920) : au r12, 47 196 px bougeaient parce que « LT. TULL, VOTRE LIEUTENANT » arrivait après la 1re frame (+24 px sur le buste). Recompte ; dis si le nom est là dès T.
- Fichiers touchés depuis le r12 (`fd0e21e` → `34e28bf`, sans stats) : `Operational/Exceptions/ExceptionBandes.cs`, `Operational/Exceptions/ExceptionDetailController.cs`, `Operational/Exceptions/ExceptionQueueController.cs`, `Operational/Reputation/ReputationPortrait.cs`, `Operational/Reputation/ReputationScreenController.cs`, `Shell/ExceptionQueuePanelController.cs`, `Shell/TopBarController.cs` — ceux de `Exceptions/` sont hors ㊲ (⑨ B3, règle du descripteur partagée).
- **Chrome** : ARGENT/JOUR alimentés ou tirets ? phase « — » hors district = état VOULU ; le chrome se juge contre `hud-canon-1176.png` ; ronds du dock = arbitrage ; aucune heure dans l’aile droite = forme F `game_minute` (back), à noter une fois, pas à compter.
- **Conventions** : bord (mi-alpha nominal vs cœur) ; coiffe/halo comme ci-dessus.
- **Cadre de style** (user) : sombre, napolitain, mafieux, fin 80s – début 90s — un écart de DIRECTION = ARBITRAGE ; un jeton/matière/asset ABSENT = écart.

## Ce que la ligne GO COUVRE — dénominateur publié par Unity (à recopier dans « non vérifié » pour ce qui manque)

```
(a) deux résolutions 1920+2400    9/16  [ÉTABLI]
(c) onglet actif asserté          7/16  [ÉTABLI]
(d) [CHROME-ALIMENTE] par planche 3/16  [ÉTABLI]
(g) SHA de l'arbre imprimé au run 0/16  [ÉTABLI]
(b) paire T / T+1 seconde          ?/16 [NON ÉTABLI — motif trop large]
(f) état vide ET état riche        ?/16 [NON ÉTABLI — motif trop large]
(e) blob ≠ précédente + descendance du dernier correctif : fourni hors code
```
(tableau d'Unity, 20:55 — pour ㊲ : (a) oui (5 planches), (b) oui (paire fournie), (c) inconnu, (d) inconnu, (e) VÉRIFIÉ par l'orchestrateur : 5 blobs ≠ r11, commit `34e28bf` descendant de `50c0a7f`, (g) non imprimé.)

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

⚠️ Relu pour le r12 : compte post-campagne (valeurs non comparables) ; phase « — » = état voulu ; ronds du dock = arbitrage ; état 16:9 (gouttière) = arbitrage user OUVERT sur les résolutions cibles — mesure-le, classe ARBITRAGE si le cadre élastique ne le ferme pas.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| compteur ENFREINTES à « — » et non « 00 » | aucune clé du corps ne porte ce compte (`boss_mirror_violation_ring` écrit, jamais projeté — juge-données É6) ; un « 00 » dirait « aucune » là où la vérité est « le serveur ne le dit pas » | que le tiret n'ait ni la couleur ni la position des deux autres chiffres — un trou doit se lire comme un trou, pas comme une panne |
| le col rendu par un TRIANGLE plein, sans le liseré du SVG | pas de primitive de chemin dans le client ; le triangle porte le signal ouvert/fermé par sa largeur | que ce ne soit pas un triangle (remplissage aire/boîte ~0,9 au lieu de ~0,43), qu'il ne soit pas centré sur l'axe du cou, qu'il recouvre le cou |
| le reflet du miroir est FIXE | la maquette l'anime (7,5 s) mais le rendu ratifié le fige à 34,7 % de course ; aucune animation sur cet écran (ruling) | qu'il soit absent, ou ailleurs que dans le tiers haut du panneau |
| 4 couleurs hors `DesignTokens` (Encre, Panneau, Liseré, Vert) | arbitrage DA escaladé, non tranché — dette de CODE, pas de rendu | que la couleur RENDUE s'écarte de la maquette |
| le nom du lieutenant est celui du compte, pas « Salvatore » | `lieutenant.name` est projeté depuis C3 (L0.4) ; la mention « non projeté (L0.4) » d'un tour précédent est un DÉFAUT si elle subsiste (juge-données clôture D2) | « SALVATORE » en dur, ou la mention « non projeté » encore visible |
| pas de section « gages » (`restraint`) | omise sans `counterparty_id` (É4) ; sur le compte de démo elle peut être absente | une place réservée vide |
| un tiret « — » à la place de la PHASE (bandeau) | état voulu hors district | un tiret sur ARGENT/JOUR, un médaillon vide (course de capture) |
| ronds du dock sans icône | arbitrage user connu | un rond coupé, un libellé de repli |
| le roster / les règles / les chiffres ne sont pas ceux d'aucun corps fourni | base post-campagne (72 155) sans corps réels | un slug, une clé brute, un mot anglais, un nom vide |

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
- **les tours r1→r12 existent** (`Tools/juge-visuel/reputation/`) — pas fournis ; seule `grandeurs-r12.md` t’est donnée (avec les r9/r11 retrouvées et la paire du r12) ;
- aucun corps réel comparable ; le journal du run ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
