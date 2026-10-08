# Dossier du juge visuel — ④ L'ouverture / Accueil — r6 — 2026-10-08

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`.
> À lire EN PREMIER. Tout chemin est ABSOLU. Rien n'a été supprimé du gabarit : ce qui n'est pas fourni est dit.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/`
> Tu écris `rapport.md` et `mesures/` dans CE répertoire.

## L'écran — une phrase de produit
④ est l'écran d'OUVERTURE du jeu (après `session/open`) : « ce qu'il y a à trancher ce matin, et ce qui attend derrière ».
Une **carte de TÊTE** (la décision du jour, sérif or, niveaux, options en TEXTE, UN geste « PRENDRE ACTE »)
au-dessus d'une **file** (« la suite ») dont chaque ligne porte une raison, un pluriel (« Plusieurs attendent encore »)
et un geste. Le chrome (bandeau haut, médaillon manomètre, dock) est le chrome COMMUN du jeu.

## Captures (4) — un seul répertoire
`/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-r2/`

| fichier | résolution | état | empreinte sha256 (12) |
|---|---|---|---|
| `A01_AccueilFile2Cartes_1080x2400.png` | 1080×2400 (20:9, téléphone visé) | file à 2 cartes, raison COURTE (2 lignes) | 49e107fb4746 |
| `A01_AccueilFile2Cartes_1080x1920.png` | 1080×1920 (art natif) | idem | 911b4fad616a |
| `A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png` | 1080×2400 | tête / raison LONGUE (3 lignes) | 7ed22aed7a4e |
| `A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png` | 1080×1920 | idem | b07f7edb4a26 |

⚠️ N'ouvre **aucun autre fichier** de ce répertoire (ni `journal.tsv`, ni `LISEZMOI.md`, ni les planches `E01`…`E12`) : ce sont les matériaux d'autres juges.
Faits de capture (relevés au journal par l'orchestrateur) : variante courte — raison « L'étagère est vide. Sans pyralin, je ne rallume pas. » sur 2 lignes ; variante longue — « L'étagère est vide depuis hier soir, et sans pyralin je ne rallume pas le labo : il me faut une livraison avant la nuit. » sur 3 lignes ; pluriel « Plusieurs attendent encore » ; le journal déclare que l'écart carte de tête ↔ zone vaut 0,0250 de la zone (marge voulue 0,025). Ces nombres sont des **déclarations du harnais** : mesure-les, ne les recopie pas.

## Référence (fait autorité : l'IMAGE) — dans `reference/`, 2 PNG, 1080×2102, ×3,6
Rendus de `ecrans-brennar-accueil.html` (atelier). Le nom du fichier porte l'index du cadre.
- `reference/A01-cadre-4-la-suite.png` — la file : la carte au-dessus, « la suite » en dessous ; **juge la variante `file 2 cartes / raison courte`**.
- `reference/A01-cadre-5-tete-sur-ligne-haute.png` — **la carte de TÊTE au-dessus d'une ligne de file haute** ; **juge la variante `TeteRaisonLongue`**.
La carte de tête est **NEUVE** : elle a été refaite sur le cadre 5 (aucun cadre ne portait la forme précédente). Juge-la contre le cadre 5, pas contre la file nominale du cadre 4.

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (les 2, sans exception) | 1080 | 300 | **×3,6** |
| CAPTURE (les 4 de ce dossier) | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** |

- Ce rapport de 1,000 est **NORMAL**, et **toute mesure se ramène en px CSS avant de conclure**
  (1 px CSS = 3,6 px d'image, **des deux côtés**).
- ✅ **Il n'y a AUCUNE référence à 900×1752 (×3,0) dans ce dossier** — vérifié fichier par fichier. Si
  tu ouvres une image qui ne fait pas 1080×2102, c'est qu'elle vient d'ailleurs : ne l'utilise pas.
- **En Y, il n'y a PAS de rapport** : les références sont un gabarit de **2102** px, les captures font
  **2400** ou **1920**. Comparer en **% de la hauteur utile** ou sur des grandeurs invariantes
  (épaisseur de filet, hauteur de capitale, largeur de colonne) — **jamais** en px Y absolus. C'est
  aussi : **1920 n'est pas 2400 avec moins de place**, c'est une autre lecture.
- ⚠️ Ce que la normalisation **NE couvre pas** : les rapports **INTERNES** (un bloc deux fois trop
  haut par rapport à son voisin) sont **invariants d'échelle** et restent des **défauts réels**.
- ⚠️ Le pire faux écart est celui qui est chiffré, reproductible, et **entièrement dû à l'instrument**.

## Polices — ce qui a RÉELLEMENT rendu

Piles `font-family` **calculées** (Chromium, éléments porteurs de texte) sur les cadres de référence
de la série 6 et de la page d'accueil, mesurées le 2026-10-08 sur ces mêmes pages (atelier `4bd3ea2`) :

      "DejaVu Sans"                               le gros du corps de texte
      "DejaVu Serif"                              titres et chiffres sérif
      Georgia, serif                              3 éléments par cadre — chrome du HUD
      "Segoe UI", Roboto, system-ui, sans-serif   3 éléments par cadre — chrome du HUD
      "Courier New", monospace                    quelques étiquettes techniques

`fc-match` **relancé le 2026-10-08** sur la machine qui a rendu les PNG, famille par famille :

      DejaVu Sans       →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      DejaVu Serif      →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      Georgia           →  NotoSerif-Regular.ttf: "Noto Serif" "Regular"
      serif             →  NotoSerif-Regular.ttf: "Noto Serif" "Regular"
      Segoe UI          →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      Roboto            →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      system-ui         →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      sans-serif        →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      Courier New       →  LiberationMono-Regular.ttf: "Liberation Mono" "Regular"
      monospace         →  DejaVuSansMono.ttf: "DejaVu Sans Mono" "Book"

Le client embarque **DejaVu Sans** et **DejaVu Serif**.
⇒ **« Georgia », « Segoe UI », « Courier New » n'existent pas sur cette machine** : les références les
montrent en **Noto Serif**, **Noto Sans**, **Liberation Mono**. Un écart de **FAMILLE** sur ces
éléments-là est un **ARBITRAGE de substitution**, jamais un défaut du client. Sur tout le reste
(`DejaVu Sans` / `DejaVu Serif`), maquette et jeu ont la **même** fonte : là, un écart de police EST
un écart.

## Règles de doctrine applicables

- **gouttière** : le contenu d'écran reste dans le rect du fond ; seul le chrome (bandeau haut, dock
  bas) traverse. **C'est une règle d'ensemble** : la même gouttière sur les douze.
- **contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits — sur l'art réel, pas un gris choisi. L'atelier
  tient une garde de contraste à 4,5:1 sur les 152 cadres de la série 6 (master `4bd3ea2`) : les
  maquettes sont au vert, **donc un texte sous le seuil dans le JEU est un écart**.
- **langue affichée** : **français**, via résolveurs nommés — aucun enum brut, aucun identifiant
  technique, aucun texte anglais à l'écran.
- **safe area / portrait** : le projet est configuré **portrait seul**.
- **espace de couleur** : le client compose en **linéaire**, les maquettes en **sRGB**. Une opacité CSS
  se **convertit**, elle ne se recopie pas. Un écart de teinte sur un élément translucide se mesure
  sur la **couleur composée**.
- **animation** : voulue sur les écrans neufs (ruling user du 2026-08-27, version du SOIR) ; un pixel qui bouge n'est pas un écart ; seul compte **où tombe l'image figée**. Les captures T et T+1 s n'ont pas été prises : l'animation est « non vérifié ».

## Gardes de capture (ce qui rendrait l'image mensongère) — toutes passées

Harnais `PlanchesParEcranCapturePlayModeTests`, catégorie `ClichePlanchesParEcran`, via
`CaptureSousShell` : compte **NEUF** par salve (inscriptions `sha256:6775f5d7`, `ce423c7f`,
`12cde7c1`, `861779a9` au journal), **vrai shell**, `signup` + `session/open` réels, back visé
`http://localhost`.

- **l'écran est réellement entré et monté** — un écran non monté fait échouer le test, pas une image
  noire ;
- **un ÉCHEC noté au journal n'est pas un vert** — le test rougit si une planche manque ;
- **contenu INATTEIGNABLE** — une liste qui déborde sans que le défilement atteigne son bout fait
  rougir le test ; c'est ce qui garantit que les planches `_bas` **ferment** le débordement (le
  journal écrit « remonté jusqu'au bout ») ;
- **plancher d'encre** lu sur le PNG — 4 planches du dépôt ont été **vides sous des tests verts**.
  Mesure de ce jeu : **22 % à 87 %** de pixels non noirs selon la planche, aucune sous le plancher ;
- **échelle du chrome lue sur le PNG** : hauteur de capitale d'« ARGENT ». Un run à **×1,21** a déjà
  coûté **2 BLOQUANT et 8 MAJEUR** à un juge, sur une planche dont les octets étaient pourtant
  identiques à ceux du commit : le défaut vivait dans l'ÉTAT d'un run. Cette garde lit l'image ;
- **variété** : `teintes ≤ 12 ⇒ « c'est un fond, pas un écran »`.

Résultat du run : **5/5, VERDICT code=0** — run 7 de
`/home/erutheone/project/mafia-unity-F/Tools/preuves/creneau-2026-10-08i/VERDICTS.txt`.

**Commit du client au moment des captures** : `lot/mots-client-2026-10-08`, tête **`d5ff4a8b`** ;
back visé : pile dev sur `http://localhost` (cumul back `241a9b6e`). Une capture est une mesure
**DATÉE**, pas une propriété du commit.

## Écarts ASSUMÉS (à inventorier, classer ASSUMÉ, vérifier « rendu proprement »)
| # | écart | raison |
|---|---|---|
| 1 | **Valeurs du HUD** d'un compte neuf : 10 000 €, Froid, JOUR 1, Aube — contre 24 850 € / Tiède / JOUR 12 / Plein jour sur la maquette. | une valeur servie n'est pas un écart de FORME ; la forme du HUD se juge. |
| 2 | **Aucun bouton** sur la carte de tête hors le geste « PRENDRE ACTE » : les options sont en TEXTE ; pas de geste « Pas maintenant ». | décision du jour (TD-724) : la décision n'a pas d'effet servi par option ; « Pas maintenant » retiré. |
| 3 | **Pastille FAMILLE** absente sur la file (le cadre la dessine). | elle n'est allumée que par ≥ 1 rapport d'autonomie servi ; un compte neuf n'en a aucun. Arbitrage de DONNÉE. |
| 4 | **Le chrome (bandeau, médaillon, filet, losange, dock) est celui du HUD v3.1**, commun aux douze écrans : un écart de chrome identique sur tous les écrans n'est pas propre à ④. | le chrome se juge par le juge d'ensemble ; ici, vérifie seulement qu'il est rendu proprement et cohérent avec la maquette. |
| 5 | Le **fond** est le quartier peint (diorama, NUIT), voilé comme la maquette. | choix DA ratifié ; juge seulement la matière, la luminance et la lisibilité du texte posé dessus. |
⚠️ Cette table est incomplète par construction (elle ne vient pas d'un `juge-donnees` en mode maquette). Un élément de maquette absent du jeu et non listé ici est un vrai finding. Un assumé rendu salement reste un défaut.

## Format du RAPPORT — imposé, parce que le compte n'est pas défini sans lui

⛔ **Le juge choisit ses catégories et ses instruments ; il ne choisit pas la forme de son verdict.**
Mesuré sur cinq tours d'un même écran : recompter les MÊMES rapports de deux façons légitimes rend
`r3=8 · r4=4` d'un côté et `r3=6 · r4=7` de l'autre — **les deux méthodes s'inversent**. Le
NUMÉRATEUR n'est pas défini tant que la forme varie d'un juge à l'autre.

**Un finding par ligne, dans UNE table, et rien de compté ailleurs :**

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `A01` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DOCTRINE` \| **`INSTRUMENT NEUF`** | <l'écart> | <les nombres> | <ou vide> |

- **écran** : toujours `A01` dans ce tour.
- **gravité** : liste **fermée** — trois valeurs, pas de synonyme, pas de nuance en prose.
- **critère** : tu n'as **pas** accès au tour précédent (c'est volontaire), donc la colonne se remplit
  depuis **ce** dossier : `DOCTRINE` quand l'écart tombe sous une règle écrite en « Règles de doctrine
  applicables » ; `INSTRUMENT NEUF` quand la grandeur vient d'un instrument que **tu** as construit.
  *Un élargissement du critère doit se lire comme tel, jamais se déguiser en régression — ni en
  progrès.*
- ⛔ **Ne PAS geler le jeu d'instruments pour rendre le compte comparable.** Le tour qui a trouvé le
  seul BLOQUANT d'une série de cinq (un trou noir occupant **54,7 %** d'un panneau) est **exactement**
  celui où le jeu est passé de 17 à 18 instruments. ***Optimiser la lisibilité d'une tendance au
  détriment de ce qu'elle mesure, c'est fabriquer une bonne courbe sur un mauvais écran.*** On gèle la
  FORME, jamais la portée.
- ⚠️ **Le résumé rendu à l'orchestrateur n'est pas une mesure du rapport** : deux résumés d'une même
  série annonçaient 6 et 3 majeurs là où leurs rapports en portent 8 et 8. **Le compte se prend dans
  la table.**

**Classement A / B / C** (ruling user 07/10, en vigueur) :
- **A / B** — fond, matière, élément absent, texte, geste, lisibilité : **remontés pleinement**.
- **C** — pixel, nuance, demi-px : **consignés**, ni correctif ni tour de juge. `MINEUR`, et **écris
  « classe C »** dans la colonne écart.

**Contrôles de forme attendus** : le rapport **s'ouvre sur un contrôle positif** (ce que l'instrument
trouve ÉGAL — sans lui, un instrument qui rendrait tout faux passerait pour sévère) ; chaque écart
chiffré pointe un script dans `mesures/` (à créer dans **ce** répertoire) qui **imprime la taille des
images lues**, et ces tailles sont celles de ce dossier ; la section « non vérifié » existe et n'est
pas vide (ou dit « rien » avec sa raison) ; **les deux résolutions sont jugées**, ou le rapport dit
laquelle ne l'a pas été et pourquoi.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- le code du client (`Assets/Scripts`), ses tests, les notes d'implémentation ;
- tout rapport ou dossier de juge précédent de ④ (`Tools/juge-visuel/04-accueil/r1…r5-*`, `dossier.md` voisin, `ensemble-decor/`) : n'ouvre pas le répertoire parent `04-accueil/` ;
- toute planche d'une autre série ou d'un autre état ; les captures T / T+1 s (animation : non prise ⇒ « non vérifié »).

## ⚠️ Addendum de l'orchestrateur — références REMPLACÉES (08/10, 16h20)
Les deux PNG de `reference/` ont été **re-rendus** depuis l'atelier `master` `4bd3ea2` (`Tools/rendre-tel.py … 3.6`, 1080×2102, « non rogné »). Les versions précédentes, copiées d'un tour plus ancien, étaient **antérieures à l'atelier `7d88a65`** : le cadre 4 n'y montrait ni la raison ni « Plusieurs attendent encore » sur la ligne de tête. **Toute mesure prise sur l'ancien cadre 4 ou 5 est à refaire** ; dis-le dans « non vérifié » si tu l'as faite.
