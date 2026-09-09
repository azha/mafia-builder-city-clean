# Dossier du juge visuel — ㊲ La réputation (« le miroir ») — r16 — 2026-09-07

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La réputation (« le miroir ») (㊲, canon `screen_b3`) — contrôleur `ReputationScreenController`
- **Ce qu'on vient y faire** : « le miroir » : on vient lire ce que son lieutenant a ABSORBÉ des règles qu'on lui a données — pas ce qu'on lui a dit, ce qu'il en a retenu. L'écran est UN portrait : le lieutenant, sa posture, ses quatre indices de tenue ; on se lit sur lui.
- **Chemin joueur emprunté par la capture** : onglet PLUS → première entrée « LA RÉPUTATION » (chemin RÉEL du joueur, `Capture_EcranReputation_SousChrome`), compte de démo.
- **États capturés** : deux planches ㊲ SOUS CHROME du commit `3465929` (`correcteur/ecrans`, 07/09 04:12 — « planches ㊲ pour la ligne GO groupée — affordance + halo dans les mêmes captures ») ; descend de `a341fd9` (planches du r15), `ebee935` (B1 : l'ascenseur) et `c292d0f` (M1 : underlay plafonné) — vérifié ; 3 blobs ≠ r15, vérifiés (sha256 dans `captures-provenance.md`). + un TÉMOIN de chrome (⑱ menu Plus, même commit, blob changé). Pas de planche « écran seul » ni de paire T/T+1 ce tour.

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
| `capture-1080x2400.png` | 1080×2400 — PRINCIPALE (format visé) | sous chrome — `CaptureReputation` : exerce le cadre face au bandeau ET au dock | 2026-09-07 04:12 (`3465929`) | ``screen_b3_reputation_sous_chrome_1080x2400.png` — sha256 `4fcfab8e…`` |
| `capture-1080x1920.png` | 1080×1920 | sous chrome — `CaptureReputation` : régime 16:9 DÉFILABLE déclaré, avec l'affordance B1-nouveau déclarée (`ebee935`) | 2026-09-07 04:12 (`3465929`) | ``screen_b3_reputation_sous_chrome_1080x1920.png` — sha256 `7cb9c5a5…`` |
| `temoin-menu-plus-1080x2400.png` | 1080×2400 — TÉMOIN | écran ⑱ (menu Plus), même commit — TÉMOIN du chrome seulement ; ne pas juger ⑱ | 2026-09-07 04:12 (`3465929`) | ``menu_plus_1080x2400.png` — sha256 `51f5ddca…`` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `a1370c7`. Une capture est une mesure DATÉE.
- Compte photographié : `operational_demo@example.test` — **régime=défaut** (le `SetIdentity` retiré à dessein : compte de démo VOULU par le correcteur pour cette capture) ; identité **déclarée par la ligne GO, non relue** (aucun journal joint — `journal-declare.txt` = transcription). Horloge inconnue, compte vivant. Valeurs non comparables à la référence ni aux corps ⇒ non vérifié ; FORME jugée. Le r15 était sur `demo_capture` : un contenu différent n'est pas un écart..
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Ce que le lot DÉCLARE (`a341fd9` → `3465929`, sujets de commit RELUS dans le dépôt ; le reste transcrit de la ligne GO de f2) — à vérifier, pas à croire** :
  - **B1 du r15 (1920 : rien n'annonce une suite) — `ebee935` « l'affordance qui manquait — un ascenseur, après deux mécanismes mesurables et illisibles »** : déclaré DANS ces planches. Mesure-le : y a-t-il un ascenseur / une indication de suite sur la planche 1920 (sonde de la marge interne droite du cadre CONTRE la marge gauche en contrôle négatif, comme grandeur r15 §E) ; est-il lisible pour un joueur (contraste, taille, position) ; est-il ABSENT à 2400 quand tout tient (ou présent à tort) ; le CTA est-il toujours hors champ à 1920 (c'est le régime déclaré : dis s'il est vivable AVEC l'affordance).
  - **M1 du r15 (halo des compteurs) — `98ae7be` « le halo devient un UNDERLAY du glyphe », `d6a280c`/`ce84f94` (sondes), `c292d0f` « l'`Underlay` de TMP NE PEUT PAS atteindre la cible — quatre correctifs sur un mécanisme plafonné »**. Le correcteur déclare (ligne GO, verbatim) : « portée 18 / mi-valeur 6 pour la référence ; LIVRÉ portée 2 / mi-valeur 2 ; MAXIMUM du mécanisme 6 / 3 — aucun réglage n'atteint 18 » ; « barycentre (+0,0 ; +0,2) px ⇒ rayonnement centré » ; « la soudure chiffre↔libellé est IMPOSSIBLE : portée 6 px contre un écart chiffre→libellé de 19 px, luminance du fond sur TOUTES les rangées de l'écart » ; l'écart de profil est inscrit en dette **TD-685** (déclaré, non relu ici). ⇒ **Mesure le profil COMPLET** avec la méthode de `grandeurs-r15.md` §C — et, doctrine du r15, mesure AUSSI `d = 1` et la luminance BRUTE au bord de l'encre avant d'écrire « absent » ; écris la portée (dernier d où l'excès > 0,5 pt), la mi-valeur, le plateau, la vallée, le barycentre, la symétrie, la largeur. Classe : si le halo EXISTE et que son écart à la référence est un écart de PORTÉE (≤ le plafond déclaré), c'est un **ARBITRAGE** (« écran faux, ou maquette hors de portée du moteur ? ») adossé à TD-685, pas un correctif à rouvrir ; si la vallée chiffre→libellé porte de la lumière (soudure) ou si le barycentre est décalé (tache), ou si le halo est ABSENT à d=1 et en brute, la déclaration est fausse et c'est un écart.
  - **`e20044e` « M3 + M2 : mon `ContentSizeFitter` a supprimé le mou que le panneau élastique absorbait »** puis **`3aefa83` « M3 RÉTRACTÉ : une garde existante l'interdit — deux exigences justes, incompatibles »** — dans la numérotation du CORRECTEUR, « M2 » = la carte portrait sort de son panneau (r15 : +9,9 px) et « M3 » = le panneau élastique a perdu 89 px (r15 : −89,7 px, −11,8 %). Remesure les deux (grandeurs r15 §B) : le débord de la carte et la hauteur du panneau. Le M3 rétracté est une déclaration d'INCOMPATIBILITÉ (deux exigences) : si l'écart persiste, classe ARBITRAGE et écris les deux exigences telles que tu les mesures.
  - Le cadre fixe dans sa zone libre (r15 : 83 % à 2400, 250 px de vide au-dessus, 137 px sous le CTA) : AUCUN correctif déclaré — remesure, et si inchangé, c'est un écart RÉCURRENT (r14, r15, r16) ⇒ fond/arbitrage, pas un correctif de plus.
- ⚠️ **Identité** : ces planches photographient `operational_demo@example.test` (régime=défaut, `SetIdentity` retiré À DESSEIN par le correcteur : c'est le compte voulu pour cette capture). Le r15 photographiait `demo_capture`. ⇒ **tout changement de CONTENU (valeur des compteurs, tuiles, textes, portrait) entre les grandeurs r15 et ces planches peut venir du COMPTE, pas de l'écran** — ne lis ni correctif ni régression dans une valeur ; juge la FORME, classe les valeurs « non vérifié ». Dis explicitement, dans « ce que je n'ai pas pu vérifier », si ce compte rend la comparaison à la maquette valide pour ㊲ et pourquoi.
- La ligne GO déclare aussi : `[CADRE-B3] 1080x2400 · cadre 462,00 css (voulu 462,00) · haut 550,4 u · inset 275,0` ; `[CADRE-B3] 1080x1920 · cadre 393,21 css · haut 275,0 u = l'inset EXACTEMENT` ; `[DEBORD-BANDEAU] régime NOEUD · sortie 105,17 sur les deux passes` (transcrites dans `journal-declare.txt`, NON relues). Le r15 avait mesuré que le triplet cadre/contenu/vide déclaré n'était pas reproductible sur l'image (+9,88 CSS de convention sur le cadre) : ne pars pas de ces nombres, pars de l'image.


## Ce que la ligne GO COUVRE — dénominateur publié par Unity (à recopier dans « non vérifié » pour ce qui manque)

```
(a) deux résolutions 1920+2400            OUI (2 planches sous chrome)
(b) paire T / T+1 seconde                  NON ce tour
(c) onglet actif asserté                   DÉCLARÉ (« capture : passed=1 failed=0 declares=1 comptes=1 »), non relu
(d) [CHROME-ALIMENTE] par planche          NON déclaré
(e) blob ≠ précédente + descendance        VÉRIFIÉ par l'orchestrateur (3 blobs ≠ r15 ; 3465929 descend de a341fd9, ebee935, c292d0f)
(g) SHA de l'arbre imprimé au run          NON imprimé
(i) identité                               DÉCLARÉE par la ligne GO : `régime=défaut identité=operational_demo@example.test` (journal NON joint)
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

⚠️ Relu pour le r16 : compte de démo VIVANT (valeurs non comparables) ; phase « — » = état voulu ; ronds du dock = arbitrage ; état 16:9 (gouttière) = arbitrage user OUVERT sur les résolutions cibles — le régime DÉFILABLE est déclaré, et ce tour déclare l'affordance : mesure si c'est vivable ; l'écart de PORTÉE du halo = dette déclarée (TD-685) ⇒ ARBITRAGE si la mesure le confirme, écart si elle le réfute.

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
| à 1080×1920, le CTA « DONNER UNE PREMIÈRE RÈGLE » est SOUS la ligne de flottaison (écran défilable) | RÉGIME DÉCLARÉ — ruling user « écran 16:9 = rendre l’écran défilable » | qu’il soit COUPÉ à l’écran, que rien n’indique une suite, ou que le défilement masque le titre |

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
- **les tours r1→r15 existent** — pas fournis ; seule `grandeurs-r15.md` t'est donnée (mesures, jamais de verdict) ;
- aucun journal joint (lignes DÉCLARÉES dans `journal-declare.txt`) ; aucune paire T/T+1 ; aucune planche écran seul fraîche ; aucun corps réel comparable (compte de démo vivant, horloge inconnue) ;
- la dette TD-685 (inventaire du back) — déclarée par la ligne GO, pas fournie : tu ne la relis pas, tu mesures ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
