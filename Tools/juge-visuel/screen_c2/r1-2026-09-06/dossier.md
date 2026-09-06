# Dossier du juge visuel — ㊵ Le blanchiment (« la filière ») — r1 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Le blanchiment (« la filière ») (㊵, canon `écran neuf, sans id canon`) — contrôleur `FiliereScreenController`
- **Ce qu'on vient y faire** : voir où en est chaque étape de la filière (le rang, la propreté de ce qui en sort, s'il y a de l'argent en attente), où la chaîne casse, ce qu'on ne peut pas commencer — et injecter du liquide sale au premier maillon.
- **Chemin joueur emprunté par la capture** : onglet PLUS → « LA FILIÈRE » (chemin réel du joueur, `Capture_…FiliereSousChrome`), compte de démo.
- **États capturés** : un seul : le compte de démo au 2026-09-04 (4 nœuds mesurés dans le corps réel, 1 seul `has_cash`).

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-1080x2102.png` | rendu du cadre nominal (série 6 #137 « où en est chaque étape ») — ratifié par délégation, ⚠️ porte un fait FAUX (voir assumés) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `70c8f23` ;
  références rendues au SHA `3c02f72`). Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet
  écran, avec la ligne où chacun commence :
  - #137 (l.6331) — La filière — où en est chaque étape  ⇐ **cadre NOMINAL, rendu en référence**
  - #138 (l.6334) — La filière s'écarte de son profil
  - #139 (l.6337) — Ce qui est tenu, ce qui reste flou
  - #140 (l.6340) — Vous n'avez pas encore de filière
  - #141 (l.6343) — Aucune filière montée
  - #142 (l.6346) — Où en est chaque maillon
  Le châssis commun (jetons de couleur, primitives) est `/home/erutheone/project/atelier3d-mafia/chassis6.py` — plusieurs classes ne sont
  DÉFINIES que là. La CSS sert à NOMMER les valeurs voulues (hex, px, états) ; si CSS et image divergent, l'image gagne.
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` — Chrome sans tête, fenêtre généreuse puis recadrage
  à 300×584 CSS × 3,6 = 1080×2102, assertion de taille en sortie (anti-crop payé deux fois ici).
- ⚠️ **Témoin** : la référence rendue est le cadre NOMINAL. Si la capture montre un AUTRE état (liste vide, semaine
  en cours, rapport traité…), choisis le cadre d'état homologue dans `etats/` ou dans la source — et dis lequel.
- Générateur : `/home/erutheone/project/atelier3d-mafia/generateur-blanchiment.py` (+ `chassis6.py`).

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
| `capture-1080x2400.png` | 1080×2400 | compte de démo, sous chrome, via Plus | 2026-09-04 11:22 | `VuePrincipaleCapturePlayModeTests (`screen_c2_filiere_sous_chrome_1080x2400.png`)` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `aacc973`. Une capture est une mesure DATÉE.
- Compte photographié : celui du shell par défaut, `operational_demo@example.test` (`AppShell.cs:104`), garni
  par le seeder — **pas un compte frais**. Son état au moment de la capture n'est pas re-mesurable ici.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).

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

⚠️ **La maquette elle-même est fausse sur un point, mesuré** (juge-données du jour, É1) : son CTA nominal est éteint (« INJECTER — IMPOSSIBLE », « il faut une planque, et rien n'en crée jamais ») alors que la planque a un écrivain de production depuis le 2026-08-31 et que le parcours joueur rend 200 sur `inject`. Si la capture montre un CTA ACTIF là où la référence le montre éteint, **c'est la référence qui a tort** : classe ARBITRAGE (maquette à corriger), pas défaut d'écran. Ne juge la FORME du CTA (géométrie, couleurs, typographie) que contre le cadre où il est actif, si tu en trouves un dans la source.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| les 4 étapes s'appellent « ÉTAPE 01 » … et non « Le comptoir · La blanchisserie · Le garage · Le notaire » | aucune projection ne porte `building_id` (compté 0 dans les 3 projections, contrôles positifs 5/3/9) — dessiné sans source, forme F, déjà en dette TD-610 | un nom INVENTÉ (un des quatre noms de la maquette écrit en dur), ou une clé i18n brute |
| pas de badge « écart » sur une étape, pas de compteur « écarts 00/01 » | `deviation_active` n'existe que sur `GET /:nodeId` et le repository filtre `stage_index == 1` (404 ailleurs) ; aucun cardinal servi (É2, É3) | un badge ou un compteur AFFICHÉ — il serait sans source |
| les propretés des 4 étapes valent PARTIAL / MOSTLY_CLEAN / CLEAN / CLEAN, pas dirty→clean | `base 0,40 + 0,25·(rang−1)` aux valeurs livrées (É4) ; DIRTY est inatteignable sans re-tuner | une étape affichée DIRTY, ou un libellé hors des 4 membres de la bande |
| la cuve remplie par paliers 25/50/75/100 % | bande à 4 membres rendue en hauteur discrète — légitime (R2.2 interdit le scalaire, pas l'ordinal), à ASSUMER (É7) | une hauteur qui ne soit pas l'un des 4 paliers |
| « À demi propre » et non « à moitié » | chaîne servie `blanchiment.purete.a_demi_propre` (`string_table.ts:1702`) — la maquette diverge (É9) | — |
| un libellé de propreté manquant sur PARTIAL | `blanchiment.purete.partial` n'existe dans aucune locale (É8) — si le client tombe sur un repli, c'est un DÉFAUT à remonter tel quel, pas un assumé | un repli anglais ou une clé brute visible ⇒ défaut |
| le cadre 138 « la filière s'écarte de son profil » n'est pas capturable | seuil de déviation 250 000 c, planque pleine = 40 000 c (É5, forme E) | — |
| les cadres 139/142 (« 04 maillons / 04 cassés ») sont périmés | 3 des 4 maillons sont refermés (É11) ; si le client affiche encore « 4 cassés », c'est une prose datée en production — DÉFAUT | un compte de maillons cassés affiché ≥ 2 |

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
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
