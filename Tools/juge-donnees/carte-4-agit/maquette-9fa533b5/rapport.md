# Juge données ⊥ — ④ l'ouverture : la carte de tête QUI AGIT — mode **maquette** — 2026-11-11

Juge NEUF, contexte vierge. Je n'ai ni dessiné la maquette ni écrit le back. Aucun rapport de juge
précédent, aucune note d'implémentation n'a été ouverte (le dossier l'interdit ; je n'ai pas cherché).
Aucune pile Docker montée, aucune porte Unity prise, aucun Unity lancé, aucune écriture dans le dépôt back.

## En une phrase

La carte de tête sert **19 informations** (7 clés de `hl_card` au `session/open`, 8 clés de `commit`,
1 de `skip`, 2 de `structural_budget`) ; la maquette en montre **13** comme dessinées, **3 mots
dessinés n'ont aucune clé de texte servie**, et sur **18 issues** que le back sait rendre, **1 seule a
un cadre** — d'où **12 constats** (4 A, 5 B, 3 C) et **7 questions « passé à côté ? »**, dont deux
(`target_count`, `executed_ids`) portent sur le chiffre même du geste.

## ⚠️ Ce que B vaut ici — DÉDUIT, et de QUEL SHA

La pile de dev tourne `main` et le gate arrive (ruling f2 11/11) : **chaque ligne de B est DÉDUITE du
SOURCE**, jamais d'un corps réel. Raison : aucune stack ne peut être montée sans toucher la pile de dev.
Recevable au titre du mandat (§2 « si la stack ne peut pas être montée »), **corroboré** par les épingles
E2E d'ensembles de clés, qui sont des assertions de corps : `hl_card.spec.ts:970` et
`core_loops_bo.spec.ts:554` (les 7 clés), `parcours/hl_card_agit.parcours.spec.ts:51` (les 8 clés).

**Écart d'ancrage à signaler** : le dossier épingle `gate/cumul-2026-10-10` **@ 7807d6c8** ; le tip de
cette branche est aujourd'hui **0cfa6a7d** (3 commits plus loin). J'ai lu au tip, et j'ai vérifié que
ça ne change rien : entre les deux SHA, **un seul fichier du lot** bouge (`hl-card.controller.ts`,
3 lignes : la garde 422 `rejectUnknownFields` remontée au contrôleur, défense en profondeur), et les
5 fichiers qui portent les contrats sont **md5-identiques** aux deux SHA
(`mesures/ancrage-sha.txt`). Aucune clé, aucun `outcome`, aucune issue ne diffère.

**Maquette** : lue à `8b79f946` (mise à jour orchestrateur). Vérifié : `ecrans-brennar-accueil.html` est
**octet pour octet le même** à `9fa533b5` et `8b79f946` (md5 `a4a52036…`, 569 800 octets — `mesures/M-maquette-cadres.txt`).
Numérotation de la page : 7 `div.cadre`, le premier étant le **cadre 0** (recoupé sur les commentaires
CSS l.727/733/745 qui nomment « cadre 1 », « cadre 2 », « cadre 4 »). Mes cibles : **cadre 1** (l.783-785),
**cadre 5** (l.794-796), **cadre 6** (l.798-803).

## Écarts à consigner (maquette) — 12 constats, gravités fermées

| # | grav. | information | B | M | statut | preuve |
|---|---|---|---|---|---|---|
| C1 | **A** | `outcome: 'executed'` du **plaidoyer** (code 105, `LEGAL_CASE_DECISION`) : ni cadre, **ni texte ratifié** | ● | – | issue servie non couverte | 4 fournisseurs EXÉCUTENT (`hl-option-table.ts` : 101, 102, **105**, 107 — `NB_ACTION_EXECUTE = 4`), les 4 exercés un à un par le back (`hl_card_agit.engine.spec.ts:191-217`, dont `tag: 'plaidoyer'` l.205-209 : `legal_cases.status` `active` → `plea_down`) ; les variantes ratifiées n'en couvrent que **3** (`variantes-textes-8b79f946.txt` l.1-3 : réparation, route, tronçon) |
| C2 | **A** | **échec de la PREMIÈRE cible** : l'erreur propre de la route de domaine est rendue telle quelle, rien n'a été fait, la carte est **rendue** au joueur | ● | – | issue servie non couverte | `hl-card.service.ts:303-307` (« the FIRST target failing: nothing was done… the route's own error is rethrown, untouched ») ; exercée `engine.spec:314` « première cible en échec (fonds à 0) : le statut HTTP de la route, carte inchangée » — aucun cadre, aucun mot ; `.mot-or.rouge` existe en feuille (l.260) et compte **0** instanciation |
| C3 | **A** | M23 « **Rien d'autre à trancher pour l'instant.** » : affirmation **contredite** par trois clés servies par la MÊME route | – | ● | dessiné sans source, et **démenti** par B | M23 l.803 ; `session-open-sequence.service.ts:237-239` sert `queue: ExceptionCardProjection[]`, `backlog_badge: boolean`, `queue_pressure_band` au même `open()`. Le **cadre 5** de la même page (l.796) dessine justement « Plusieurs attendent encore » — l'après-geste affirme le contraire sans lire la clé qui le dit |
| C4 | **A** | M18 « **1** » dans la pièce du jeton = le **reste** du budget structurel | – | ● | dessiné sans source (valeur en dur, R2.3) | le back ne sert que `structural_budget: { used, cap_reached }` (`session-open-sequence.service.ts:240`, `361`) ; le **cap n'est jamais projeté**, c'est un tunable `1..2` défaut 1 (`core-loops-tunables.ts:429-432`) qui **vaut 0** pendant une fenêtre d'observation T4 (`:548-551`). « 1 libre » est donc faux pour cap=0 et pour cap=2 |
| C5 | B | M21 **mot-or** (« Les travaux sont lancés et payés… ») : aucune clé de **texte d'après-geste** n'est servie | – | ● | **ASSUMÉ à consigner** | la réponse de `commit` est fermée à 8 clés, **aucune n'est un texte** (`hl-card-types.ts:125-139` ; pin `parcours:51`) et elle ne reporte même pas `decision_type_key`. Le mot est donc une **dérivation client** (`decision_type_key` × `outcome` × `stopped_at_id ≠ null`) : recevable, mais c'est une table de **8 × 3** à tenir côté client, à consigner comme écart assumé — et C1 est le premier trou de cette table |
| C6 | B | **409 `RESOURCE_STATE_CONFLICT` « déjà tranchée / plus actionnable »** : ni cadre, ni texte | ● | – | issue servie non couverte | `hl-card.service.ts:426-428` (statut autre que `active`/`skipped`) et `:397-402` (réclamation perdue en course) ; `.carte-or .deja` existe en feuille (l.253) et compte **0** instanciation |
| C7 | B | **`POST /v1/session/hl-card/:id/skip`** : route joueur **sans aucun geste** dessiné, et aucun cadre d'après-report | ● | – | route sans CTA | `hl-card.controller.ts:66-72`, `service:379-393` → `{ skipped: true }`. Les deux gestes du cadre 1 (M05/M06, l.785) sont les **deux options de `commit`** (`chosen_option` 0 et 1) : rien ne poste `/skip`. L'étiquette du cadre 1 mentionne « Pas maintenant » comme l'**existant à remplacer**, pas comme un geste de l'état cible |
| C8 | B | carte **structurelle** : `commit` rend `outcome: 'noted'` **même sur `chosen_option: 0`**, consomme le budget, et peut 409 `STRUCTURAL_CAP_EXHAUSTED` | ● | – | issue servie non couverte | `hl-card.service.ts:246-259` (« A structural card executes nothing…: `noted`, whatever `chosen_option` says ») ; `controller:47`. Le joueur qui a choisi d'AGIR lirait « Rien ne bouge » (variantes l.4), et le jeton devrait passer à « pris » : `.jeton-or.pris` existe en feuille (l.257-258), **0** instanciation. ⚠️ Non producible par un fournisseur v1 (codes 101-108 disjoints de `StructuralDecisionType` 1-14, `hl-card-types.ts:160-172`) — d'où B, pas A |
| C9 | B | carte servie avec **`options: []`** et `target_count: 0` | ● | – | état servi que la maquette ne sait pas dessiner | défauts de colonne `options '[]'` / `target_ref '{}'` (`core_loops.ts:41-73`), **épinglés lus en retour** par `session/open` : `hl_card.spec.ts:1035` + `:1054` (« target_ref {} → 0 », « never a 500 on a player read path »). La maquette dessine **toujours** 2 gestes et 2 conséquences ; les 409 « no option [0] to act on » (`hl-commit-plan.ts:60-61`) et « no target to act on » (`:71`) n'ont pas de cadre |
| C10 | C | M12 « Vous avez tranché » et M17 « TRANCHÉE » | – | ● | ASSUMÉ (même famille que C5) | l.803 et l.801 ; dérivés de `committed: true` + `outcome` — aucune clé de texte. À consigner d'un trait avec C5 |
| C11 | C | `decision_type_key = 'UNKNOWN'` | ● | – | valeur servie sans titre dessiné | branche défensive `hl-card-projection.ts:96` (« never throws (this sits on a player-facing read) ») : un code inclassable sort en `'UNKNOWN'`, et aucun titre ne lui correspond |
| C12 | C | **contradiction dans les pièces fournies** sur le cadre de `navigate` | ● | ? | à lever | le dossier dit « navigate n'a PAS de cadre » ; la variante ratifiée dit « navigate · … (existant, **cadre 7 de la série 6**) » (`variantes…txt` l.6). La page épinglée n'a que **7 cadres, numérotés 0 à 6** (`mesures/M-maquette-cadres.txt`) : le « cadre 7 » n'y est pas. L'un des deux est faux |

**A = 4 · B = 5 · C = 3 — total 12.** (A/B = ce qu'un joueur perçoit ; C = nuance, consignée sans correctif, ruling user 07/10.)

## La liste d'issues du dossier, au banc

> Le dossier affirme : « Les autres issues (route, tronçon, noted, arrêt partiel, navigate) n'ont PAS
> de cadre (même structure, seul le texte varie) ».

**Les 5 nommées sont EXACTES** — vérifié : la page ne contient qu'**un** tapis d'après-geste
(`tapis-feutre` = 1, `carte-or tranchee` = 1, `jeton-or` = 1, `mot-or` = 1 dans le corps hors feuille).
**La liste est INCOMPLÈTE** : j'ai recensé **18 issues** servies, 1 avec cadre, **5** avec texte ratifié
sans cadre (les 5 du dossier), **12 sans cadre NI texte** (`mesures/issues-vs-cadres.txt`), dont les
8 que la liste omet : plaidoyer exécuté (C1), erreur de la 1ʳᵉ cible (C2), skip (C7), structurel-noté
+ cap épuisé (C8), 409 déjà tranchée (C6), 409 sans option/sans cible (C9), 404 carte d'un autre joueur,
422 corps invalide. Les deux premières sont des **A** : un joueur v1, sur un fournisseur vivant, y tombe.

## « Passé à côté ? » — pour l'user (questions, pas des défauts)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `hl_card.target_count` (open) | **sur combien de cibles** « Mettre en réparation » va agir | **utile ici, et d'abord** : c'est la différence entre un geste et un chèque en blanc. Mesuré à **2** sur 2 bâtiments endommagés (`hl_card.spec.ts:989`), **1** sur le plaidoyer (`:1032`), **0** sur une navigation (`:1018`). Le lot l'a projeté en disant « a count they are meant to see » (`hl-card-projection.ts:122-128`) — et aucun des 3 cadres ne l'écrit | ●●●● |
| Q2 | `executed_ids` (commit) | **combien** ont réellement été faits | utile ici : le mot-or dit « les travaux sont lancés » au singulier d'un local, pour 1 comme pour 5. `executed_ids.length == target_count` est épinglé (`hl_card.spec.ts:1000`) | ●●●● |
| Q3 | `stopped_at_error` (commit) | **pourquoi** le reste n'est pas parti (le code propre de la route) | utile : la variante « Fait en partie : le reste n'a pas pu partir » dit l'effet sans la cause, alors que la cause est servie, clé en main | ●●● |
| Q4 | **B⁻** `target_ref` → les **noms** des cibles | *quel* local, *quelle* route | utile, et c'est une **forme F** : le MÊME `open()` injecte déjà `DistrictInteriorRepository` « la table de noms des bâtiments pour la carte de file » (`session-open-sequence.service.ts:309-310`) — la carte de FILE nomme les bâtiments, la carte de TÊTE dit « un local ». Précédent connu : `lieutenant.name` | ●●● |
| Q5 | **B⁻** `status` | que cette carte est **déjà** celle qu'il a repoussée | utile : `findCarried` re-sert une carte `skipped` à l'identique (`hl-card.repository.ts:57-67`, `service:419-420`) ; rien ne le dit au joueur. La feuille a même une pastille `.deja` (l.253) sans source pour l'alimenter | ●● |
| Q6 | **B⁻** `surfaced_at` / `resolved_at` | depuis quand elle attend | pas ici : la carte est du jour par construction | ● |
| Q7 | `hl_card.card_id`, `navigate_ids` | — | pas ici : plomberie (l'id opaque que le client reposte ; les ids qu'il remet à l'écran cible) | ○ |

## Lots back suggérés

| # | ce qui manque | d'où | ce que la maquette en fait | preuve |
|---|---|---|---|---|
| 1 | le **reste** (ou le **cap**) du budget structurel | `structuralCapForPlayer` existe côté serveur, la projection n'émet que `used` + `cap_reached` | le chiffre « 1 » de la pièce du jeton (M18) | `session-open-sequence.service.ts:240,361` ; `core-loops-tunables.ts:429-432, 548-551` — **C4** |
| 2 | **forme F** : les noms des cibles de `target_ref` | colonne en base, relue, déjà passée au compositeur ; le résolveur de noms est **déjà injecté dans ce fichier** | pas encore dessiné (la maquette dit « un local ») ⇒ lot **sur réponse à Q4**, pas d'office | `core_loops.ts:41-73` ; `session-open-sequence.service.ts:309-310` |
| 3 | *option* : une clé de **résultat** d'après-geste (clé i18n, R2.2) rendue par `commit` | rien ne la sert aujourd'hui | M21/M12/M17 (C5, C10) ⇒ **arbitrage user** : soit le back la sert, soit la table 8 × 3 est consignée comme écart assumé côté client | `hl-card-types.ts:125-139` |

## Actions : routes ↔ CTA

| route / CTA | en face | statut |
|---|---|---|
| `POST …/commit { chosen_option: 0 }` (`controller:49-62`) | M05 « Mettre en réparation » (geste or, l.785) | ✔ apparié |
| `POST …/commit { chosen_option: 1 }` — et corps absent/`null`, qui vaut 1 (`hl-commit-plan.ts:20,57-58`) | M06 « Laisser en l'état » (l.785) | ✔ apparié |
| `POST …/skip` (`controller:66-72`) | **aucun geste** | **C7 — route sans CTA** |
| M22 « Retour à l'accueil » (l.803) | aucune route (navigation client) | ✔ normal |
| le « Voir » que la variante `navigate` annonce (`variantes…txt` l.6) | `navigate_screen` + `navigate_ids` servis, mais **aucun cadre ici** | **C12** |
| M09 « trancher » de la ligne de file | hors domaine (`exceptions`) | hors périmètre |

**Le nombre d'options, la conséquence sous chaque option, les gestes : CONFORMES, et mieux que « assumés ».**
L'écart assumé du dossier (« le back ne sert que 2 options sur un compte frais ») est **confirmé et
structurel**, pas circonstanciel : les **8** fournisseurs du catalogue servent **exactement 2** options
et **2** `projected_consequence` chacun (8 × `NB_OPTIONS=2 NB_CONSEQUENCES=2`, `mesures/B-fournisseurs-options-issues.txt`),
`projected_consequence` est **REQUIS à l'écriture** par le type (`hl-card-types.ts:108-115`), et la route
**refuse en 422** tout `chosen_option` hors `{0, 1}` (`hl-commit-plan.ts:30-32`) : même une carte à 3-4
options (permise par le commentaire du type, aucun producteur vivant) ne serait committable qu'en 0 ou 1.
La maquette dessine 2 gestes + 2 conséquences, une sous chacun (`.csq4-rang`, l.785/796) : conforme.

## Table de couverture complète

En mode maquette, pas de colonne F. `options` est compté par ses **deux champs** (`label`,
`projected_consequence`), déclaré ici pour que l'arithmétique soit vérifiable.

| # | information | B | M | statut | classe |
|---|---|---|---|---|---|
| 1 | `card_id` | ● | – | disponible, ni dessinée | question (Q7, plomberie) |
| 2 | `decision_type_key` (8 valeurs + `'UNKNOWN'`) | ● | ● M01/M14 | titre résolu client depuis l'enum servie | ✔ (cf. C11 pour `'UNKNOWN'`) |
| 3 | `impact_bucket` (`minor`/`moderate`/`major`) | ● | ● M02/M15 | 3 pips = 3 bandes, + le mot | ✔ |
| 4 | `urgency_bucket` (`low`/`elevated`/`pressing`) | ● | ● M03/M16 | idem | ✔ |
| 5 | `options[].label` | ● | ● M05/M06 | 2 gestes | ✔ |
| 6 | `options[].projected_consequence` | ● | ● M07/M08 | une ligne sous chaque option | ✔ |
| 7 | `structural` (open) | ● | ● M13 « ♦ tactique » | ✔ pour `false` ; `true` sans cadre | ✔ / C8 |
| 8 | `target_count` | ● | – | **disponible, ni dessinée** | **question Q1** |
| 9 | `structural_budget.used` | ● | ● M18/M19 | lu, mais insuffisant seul | ✔ sous réserve de C4 |
| 10 | `structural_budget.cap_reached` | ● | ● M19 « libre » | ✔ | ✔ |
| 11 | `committed: true` | ● | ● M17 « TRANCHÉE » | ✔ (texte assumé, C10) | ✔ |
| 12 | `structural` (commit) | ● | ● M13 + jeton | ✔ pour `false` | ✔ / C8 |
| 13 | `outcome` (`executed`/`navigate`/`noted`) | ● | ● M12 partiel | **1 des 3 valeurs dessinée** | C1, C5, C8, C12 |
| 14 | `executed_ids` | ● | – | disponible, ni dessinée | **question Q2** |
| 15 | `stopped_at_id` | ● | – | texte ratifié, pas de cadre | question (dossier, exact) |
| 16 | `stopped_at_error` | ● | – | disponible, ni dessinée, ni dite | **question Q3** |
| 17 | `navigate_screen` (4 écrans) | ● | – | texte ratifié, cadre introuvable | C12 |
| 18 | `navigate_ids` | ● | – | disponible, ni dessinée | question (Q7, plomberie) |
| 19 | `skipped: true` | ● | – | **route sans CTA ni cadre** | **C7** |
| 20 | le **plafond** (cap) que le chiffre du jeton suppose — M18 | – | ● | dessiné sans source | **C4** |
| 21 | le **mot d'après-geste** — M21 | – | ● | dessiné sans source | **C5** (+ C1) |
| 22 | « **plus rien n'attend** » — M23 | – | ● | dessiné sans source, démenti par B | **C3** |

**Contrôle d'arithmétique** : `|clés B| = 19` (R1 `hl_card` 8 feuilles + R1 `structural_budget` 2 +
R2 `commit` 8 + R3 `skip` 1) **+** `|éléments M non appariés| = 3` (M18-cap, M21, M23) **= 22 lignes**.
Compté : 22 lignes dans la table. ✔
Exclus du compte, déclarés : M04 « Ce qu'on peut faire » et M20 « votre décision structurelle de la
session » (libellés d'écran statiques, aucune donnée joueur) ; M22 (un CTA, traité en section Actions) ;
M09-M11 (ligne de file, barre du haut, dock — servis par d'**autres** clés de la même route, hors domaine
de la carte de tête).

## Annexes

### 1. Routes du domaine — compte TROUVÉ : 3 routes joueur

Obtenu en grepant le mot du domaine dans **tous** les `*.controller.ts` du back, pas en recopiant le
dossier (`mesures/issues-vs-cadres.txt`, en tête) :

- **R1 lecture** `POST /v1/session/open` → clé `hl_card` (`session-open-sequence.service.ts:236`, `357`)
- **R2 action** `POST /v1/session/hl-card/:id/commit` (`hl-card.controller.ts:49-62`, `@UseGuards(JwtAuthGuard)`)
- **R3 action** `POST /v1/session/hl-card/:id/skip` (`hl-card.controller.ts:66-72`, idem)
- **exclus** : `GET /v1/admin/players/:id/hl-card` (rôle `gm`, `core-loops-admin.controller.ts:440-443`) ;
  `core-loops-test.controller.ts` (`_test`). `session.controller.ts:18` n'en porte que le commentaire.
- **authz / IDOR vérifiés** : les deux routes d'action résolvent `account_id → player_id` par le lien
  1-1 Player↔Account, **jamais depuis le corps** (`hl-card.controller.ts:76-88`), et `findOwned` scope la
  carte à son joueur (`hl-card.repository.ts:70-77`) ; la croix est épinglée en E2E
  (`parcours/hl_card_agit.parcours.spec.ts:222` : « commit de la carte de A avec le jeton de B ⇒ 404,
  et réciproquement — sans rien consommer »). Pas de trou de propriété sur ce lot.

### 2. Mesures — `mesures/`

| fichier | ce qu'il porte |
|---|---|
| `ancrage-sha.txt` | 7807d6c8 vs tip : ancêtre, 3 commits, le seul fichier qui bouge, md5 des 5 fichiers de contrat |
| `B-cles-servies.txt` | les 7 clés de `hl_card`, les 8 de `commit`, la 1 de `skip` + les pins E2E |
| `B-fournisseurs-options-issues.txt` | 8 fournisseurs, 4 exécutants / 4 navigations, 4 écrans, 8 × 2 options, le cap non projeté |
| `B-moins-colonnes.txt` | les 11 colonnes de `highest_leverage_cards` : 5 projetées, 2 plomberie, **4 en B⁻** |
| `M-maquette-cadres.txt` | md5 identiques aux 2 SHA, les 7 cadres nommés, les instanciations réelles (dont les 4 classes à 0 usage) |
| `M-inventaire.txt` | M01-M23 avec ligne, sélecteur, texte exact, et ce que ça représente |
| `issues-vs-cadres.txt` | les 18 issues avec leur ancre : 1 avec cadre, 5 avec texte, 12 nues |

### 3. Valeurs possibles, à la source qui les contraint

- `decision_type_key` : 8 clés de `HL_CARD_PROVIDER_CATALOGUE` codes 101-108 (`hl-card-types.ts:86-97`),
  + les clés de `STRUCTURAL_DECISION_CATALOGUE` pour un fournisseur futur, + `'UNKNOWN'` (`projection:91-97`).
- `impact_bucket` : `minor` < 0,4 ; `moderate` [0,4 ; 0,7) ; `major` ≥ 0,7 (`projection:49-55`, cut-points PROV-Y26Q2).
- `urgency_bucket` : `low` / `elevated` / `pressing`, mêmes bornes (`projection:57-63`).
- `outcome` : `'executed' | 'navigate' | 'noted'`, domaine fermé (`hl-card-types.ts:118`).
- `navigate_screen` : 4 valeurs, `exceptions_escalations`, `autonomy_reports`, `supply_chain_trace`,
  `exceptions_queue` (`hl-option-table.ts:79, 82, 88, 94` — `NB_ECRANS_NAVIGATE_DISTINCTS = 4`, identiques
  aux 4 que nomme la variante ratifiée l.6).
- `structural` : `true` **iff** le code est une entrée `live` de `STRUCTURAL_DECISION_CATALOGUE`
  (`hl-card-types.ts:170-172`) ⇒ `false` pour les 8 fournisseurs v1 (numérotation disjointe, en-tête du fichier).
- `target_count` : entier ≥ 0 ; longueur de liste pour 101/102/107, 1 pour 105, **0** pour les 4
  navigations, **0** sur code hors table ou `target_ref` mal formé (`hl-option-table.ts:107-119`).
- `chosen_option` (entrée) : `0` ou `1` seulement, sinon 422 ; absent **et** `null` ⇒ 1 « prendre acte »
  (`hl-commit-plan.ts:20, 26-34`).
- `status` en base (non projeté) : `active | committed | skipped | superseded` (`core_loops.ts`, miroir TS).

### 4. Inventaire M → `mesures/M-inventaire.txt` (M01-M23, avec les 4 classes dessinées en feuille et jamais instanciées)

### 5. Ce que je n'ai pas pu vérifier

1. **Aucun corps réel.** Toute la colonne B est DÉDUITE du source (pile de dev interdite). La mesure qui
   trancherait, au moment 2 : `POST /v1/auth/signup` (Idempotency-Key requis) → `POST /v1/session/open`
   → `Object.keys(hl_card).sort()`, puis `commit { chosen_option: 0 }` sur un substrat semé à **2**
   bâtiments endommagés, pour lire `target_count`, `executed_ids` et le couple `stopped_at_*` sur un corps.
2. **Le cadre de `navigate`** (« cadre 7 de la série 6 ») : introuvable dans la page épinglée, et je n'ai
   pas ouvert d'autre page (le dossier épingle celle-ci, cadres 1/5/6). C12 reste à lever par f2.
3. **L'intention des 4 classes à 0 usage** (`.cachet`, `.deja`, `.jeton-or.pris`, `.mot-or.rouge`) : je
   constate leur existence en feuille et leur **0** instanciation (compté hors `<style>`) ; je n'infère
   pas ce que l'atelier voulait en faire — c'est ce qui les rend citables, pas ce qui les explique.
4. **La valeur réelle du cap** sur cette installation : lue comme tunable (défaut 1, borné 1..2, 0 en
   fenêtre T4), pas comme valeur de base — un `GET` du store de tunables au moment 2 la donnerait.
5. **Les résolveurs i18n du client** : hors périmètre du mode maquette (il n'y a pas encore de front).
   Donc je ne dis pas si les 8 titres, les 16 libellés d'option et les 16 conséquences existent en table
   de chaînes — seulement que le back sert les **clés** et pas les textes.

## Auto-audit du verdict

J'affirme avoir : lu les 10 fichiers du domaine et les 3 specs E2E citées **au SHA**, et non un affichage
terminal ; **compté** (et non déduit) les 7 clés, les 8 clés, les 8 fournisseurs, les 4 exécutants, les
4 navigations, les 8 × 2 options, les 7 cadres, les 4 classes à 0 usage, les 18 issues et les 11 colonnes,
chaque compte dans un `$( )` ou un `grep -c` reporté dans `mesures/` ; vérifié **binairement** que les
deux SHA de maquette donnent le même fichier (md5) et que les 3 commits d'écart du back ne touchent aucun
contrat (md5 des 5 fichiers) ; n'ouvert **aucune** note d'implémentation ni rapport de juge ; **touché à
rien** — ni Docker, ni la porte Unity, ni le dépôt back (lecture par `git show`/`git grep` seuls, branche
`main` laissée checkoutée).
Les deux affirmations de mon verdict qui restent **DÉDUITES et non mesurées** : (a) tout B, faute de
corps réel ; (b) la non-existence d'un cadre `navigate` ailleurs que dans la page épinglée.
