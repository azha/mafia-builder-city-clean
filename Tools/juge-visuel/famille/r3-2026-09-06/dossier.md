# Dossier du juge visuel — ⑥ La Famille (l'organigramme) — r3 — 2026-09-06

> ⚠️ **Ce dossier est complet et instruisable.** S'il te manque quelque chose, c'est un défaut du dossier :
> dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La Famille (l'organigramme) (⑥, canon `screen_3`) — contrôleur `LieutenantScreenController (vu du HAUT de la feuille — ⑧ l'éditeur de règles est le même contrôleur, plus bas)`
- **Ce qu'on vient y faire** : le mur de photos : le Don, ses lieutenants en rangs, chacun avec son archétype et son ancienneté, et sous chacun ses hommes — lire d'un coup d'œil qui tient quoi, et qui manque à la table.
- **Chemin joueur emprunté par la capture** : onglet FAMILLE (`AppShell.cs:218`, `case Tab.Org`) — ici monté par le test de planche, sans défiler, compte de démo.
- **États capturés** : un seul : le compte `demo_capture@example.test` RE-SEMÉ (TD-642) — roster **Rook · Sallo · Halde**, minute de jeu **72 118** (mesurée en base à 10:55). Les noms et la minute diffèrent donc de r1/r2 et des 240 corps réels : **indifférent pour le visuel** (présence, distinction, forme d'un nom) — à écrire en non-vérifié, jamais comme un écart.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-1120.png` | rendu ratifié de l'organigramme (`ecrans-brennar.html` §1, ratifié user `0881e8a`, « DOCTRINE UI FINALE »), la feuille SEULE | 1120×1850 | ×2,0 | 560 CSS = 1120 px |
| `reference-source.html` | extrait ISOLÉ et mis à l'échelle du panneau (provenance CSS ligne par ligne) | — | — | — |
| `etats/ecran-canon.png` | canon de série 2 de l'écran entier (900×1752, ×3, 300 CSS) — pour l'intention et le chrome évoqué | 900×1752 | ×3,0 | 300 CSS = 900 px |

- **Source HTML/CSS** : `reference-source.html` dans ce dossier (l'extrait qui a rendu la référence) ; la page d'origine est `~/project/atelier3d-mafia/ecrans-brennar.html` §1 « Famille — l'organigramme ». L'image gagne sur la CSS.

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
| `capture-1080x2400.png` | 1080×2400 | compte `demo_capture` re-semé, minute 72 118, sous chrome | 2026-09-06 10:34 (commit `5349ac2`, branche `correcteur/ecrans`) | `run `CaptureFamille` séparé (`Assets/Screenshots/famille_1080x2400.png`, sha256 `74071832…`)` |

- Client au moment des captures : `76ee3cc` (`main`, 2026-09-04 11:23 — « les QUINZE planches reprises sur le
  MÊME bundle (674 clés) ») ; ce dossier est préparé sur `fa7ca5a`. Une capture est une mesure DATÉE.
- Compte photographié : celui du shell par défaut, `operational_demo@example.test` (`AppShell.cs:104`), garni
  par le seeder — **pas un compte frais**. Son état au moment de la capture n'est pas re-mesurable ici.
- Gardes du test (`CaptureSousShell` / `CapturerA`) : locataire réellement monté, feuille nommée par l'appelant,
  contenu chargé, rect ≥ 200×200, **compte de TEINTES distinctes** (pas « non noir » — un aplat satisfait « non
  noir »), voisins éteints par différence. Les valeurs mesurées ne sont pas disponibles (log non préservé).
- **Identité photographiée** : le commit `5349ac2` cite le journal du run — `régime=env identité=demo_capture@example.test`, **LU avant l'image** (la garde d'identité de cette suite est armée depuis ce commit). Le journal lui-même n'est pas joint : à écrire en non-vérifié si tu ne le relis pas.
- **Ce qui a changé dans le CODE depuis la capture du r2** (client `8e982ab` → `77bd229`, 3 fichiers de `Operational/Lieutenant/`, `git diff --stat` +208/−31) — fait de provenance, pas verdict : `5349ac2` (le rang porte le nom ET l'archétype ; en-tête ; rampe d'alpha du filet ; F9 ; F13) · `77bd229` (`name` sur les 2 DTO, replis catalogue conservés pour les 3 clés non servies et `inconnu`, garde à 9 valeurs, bouton de réaffectation désactivé selon la bande, deux commentaires faux retirés). Les deux CTA d'action restent sans source de bâtiment : **lot à part, ouvert, à ne PAS compter comme régression**.
- **Grandeurs du tour précédent** : `grandeurs-r2.md` (dans ce dossier) — valeurs sans verdict, pour la colonne `critère`. Rien d'autre du r2 (ni du r1) n'est fourni.
## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE `family-organigramme-reference-1120.png` (`.sheet{width:560px}`) | 1120 | 560 | **×2,0** |
| CAPTURE — la FEUILLE (encre, bord à bord) | **à mesurer sur l'image** | 560 | = largeur mesurée ÷ 560 |

- ⚠️ Ici l'échelle de la capture N'EST PAS la largeur de l'écran : la feuille de l'organigramme est un panneau
  DANS l'écran (au dernier tour mesuré, 2026-08-25, elle faisait 1248 u sur un canvas de 1280, soit ~1053 px à
  1080 de large ⇒ ×1,88). **Mesure la largeur de la feuille (encre) sur la capture et dérive le facteur** ; cite-le
  dans ton annexe 3. Sans ça, tout paraîtra « 6 % trop petit ».
- Référence rendue par `Tools/family-organigramme-reference-render.sh` : Chrome sans tête, viewport 560 CSS,
  `--force-device-scale-factor=2`, fenêtre généreuse (1300) puis crop à l'encre (fond `--encre #0b1016`). Le client
  dessine à `FX()` = échelle du panneau : **1 unité de canvas = 1 px CSS de la référence** au facteur du panneau.
- Le chrome (bandeau, dock) est celui du shell (392 CSS ↔ 1280 u, ×2,755 px) — se juge contre le canon du HUD
  (`Tools/juge-visuel/ecran-principal/ecran-canon.png`), pas contre cette référence qui n'en a pas.
- Ce que la normalisation ne couvre pas : les rapports INTERNES (médaillon/rang, rang/rang, marges) restent réels.

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

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| les noms de rang sont ceux du compte RE-SEMÉ (Rook, Sallo, Halde — pas Oster/Brasse, pas Salvatore) | `name` servi par les 2 routes et repris dans les 2 DTO depuis `77bd229` ; le compte a été re-semé (TD-642) | un nom manquant, un archétype SEUL en ligne de nom, un identifiant, une troncature |
| chaque rang porte le nom ET l'archétype en français (Cuisinier, Comptable, Sécurité, Gros bras…) | `archetype` servi, `FamilleLabels` le traduit (9 valeurs) ; rétabli par `5349ac2` après avoir disparu au r2 | un rang sans archétype, un enum brut (`COOK`), « Unknown » |
| pas de « Loyauté 82 % » | la seule grandeur est `loyalty_seed_bucket`, un enum à 4 valeurs (E2) — un pourcentage serait inventé | une jauge ou un % affiché |
| sous chaque lieutenant : « Aucune équipe rattachée » (ou rien) au lieu de « Nino · Coin de la 3ᵉ » | aucune entité « homme » ne porte de `lieutenant_id` ni de nom (E3, E4, E5) — dessiné sans source | un slot vide sans libellé, ou des noms inventés |
| la puce montre l'ANCIENNETÉ, pas « Délégué / Direct » | `mode` n'est projeté que sur le détail et est CONSTANT en production (E7) | une puce vide |
| pas de chip « Retiré », pas de rang grisé | `extinction_state` : 0 écrivain de production (E6) | — |
| pas de « District du Don » sous le Don | aucune route ne rend « mes districts » (E8) | un district inventé |
| pas de bandeau « Un siège libre à la table » | le plafond (5) est un tunable jamais projeté (E10) | — |
| bustes contemporains (Don nu, lieutenant à capuche, homme à casquette) | ruling DA 2026-09-02 ; la référence porte encore des chapeaux | un buste tronqué (épaules manquantes), ovale, ou absent |

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
- **les rapports r1 et r2 et leurs scripts** — seule `grandeurs-r2.md` t'est donnée ;
- le journal du run `CaptureFamille` (la ligne d'identité est citée dans le commit, pas jointe) ;
- les corps réels du compte re-semé (ils n'existent pas encore : refonte de la base en cours) ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
