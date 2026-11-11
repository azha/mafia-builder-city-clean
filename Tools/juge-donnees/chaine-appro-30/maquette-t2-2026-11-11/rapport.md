# Juge données ⊥ — ㉚ « La chaîne vue du graphe » — maquette, TOUR 2 BORNÉ (P1-P5) — 2026-11-11

## Verdict : **NON**

**NON** — P2, P3, P5 vérifiés sur mesure ; **P1 et P4 CONTREDITS** sur une clause chacun : les deux
règles d'affichage que la correction AJOUTE au cadre (« un maillon engorgé sans flèche est la
**cause** » ; « repli : le type, `building.type.*` ») ne sont dérivables d'**aucune** clé servie, et la
première est **réfutée par un corps réel** (`mesures/08-graph-apres-relief.json` : 3 maillons `mild`
sans flèche, `is_blocked_output = f` en base pour les 5).

| # | verdict | la mesure |
|---|---|---|
| **P1** | **CONTREDIT** | flèche : **1 sur 5** maillons dessinés, attachée à `has_arrow` nommément, **indépendante de la bande** — les 3 clauses VÉRIFIÉES (et l'indépendance de bande est même confirmée par la pile : flèche mesurée sur 2 nœuds `silent`, `mesures/06-graph-dimensionne-tick-p1.json`, parce que le plancher 0,05 < seuil `mild` 0,10). **MAIS** la clause « sans flèche ⇒ la **cause** » est fausse : `applyRelief` (`supply-node-pressure.repository.ts:179-191`) remet `is_blocked_output=false` et `arrow_to_building_id=NULL` **d'un coup** alors que l'indice ne descend que de `reliefPerTick` = 0,08/tick (`core-loops-tunables.ts:606-609`, entrée `mild` 0,10) ⇒ un nœud non-silencieux, sans flèche, **qui n'est pas la cause**, pendant jusqu'à **9 ticks** (`(0,85 − 0,10) / 0,08`). Mesuré : après relief, 3 nœuds `mild` sans flèche et `is_blocked_output = f` en base. Réciproque mesurée : au 1ᵉʳ tick, **3 sources** (`sourcesAccrued: 3`) lisent `silent`. La clé qui dit « cause » est `is_blocked_output`, **jamais projetée côté joueur** (seul `supply-chain-admin.controller.ts:211` la porte). |
| **P2** | **VÉRIFIÉ** | dessiné : **5 maillons + 4 liaisons** (recompté par script sur le cadre épinglé). Compte NEUF mesuré : `nodes=5, legs=0, routes=0` (`mesures/03-graph-neuf-p1.json`) — « 5 maillons sur un compte neuf » **exact**. Dimensionné : `legs=5` (`mesures/06-*`). Aucune limite ni pagination : aucun `.limit`/`LIMIT` dans `leg.repository.ts:436-449` ni `supply-node-pressure.repository.ts:279-284`, et la route ne prend **aucun** paramètre (`supply-chain.controller.ts:122-124`). Défilement : `.appr6 .abody.gr30-defile{overflow-y:auto;overflow-x:hidden}` (maquette l. 6874, 3 classes) **écrase** `.appr6 .abody{overflow:hidden}` (l. 4534, 2 classes) — spécificité **et** ordre de feuille. |
| **P3** | **VÉRIFIÉ** | le back ne sert **aucun** ordre : pas d'`ORDER BY` sur les nœuds (`supply-node-pressure.repository.ts:279-284`, SQL brut) ni sur les legs (`leg.repository.ts:436-449` ; son propre en-tête l. 422 : « *no ordering guarantee needed* ») — seules les `routes` sont triées (`supply-chain-graph.service.ts:149`). Instabilité **mesurée** : **3 ordres distincts** du même compte sur la session (voir ci-dessous). La règle ne dépend que de `bucket`/`debt_bucket` + du nom servi, et **couvre les 4 valeurs de chaque côté** (registre du cadre, l. 6868 : `critical → warm → mild → silent` ; `fractured → stressed → accruing → fresh` ; énums : `backpressure-bucket.ts:22`, `debt-bucket.ts:23`). Les **4** valeurs de `debt_bucket` mesurées sur le fil. |
| **P4** | **CONTREDIT** | la route existe et sert le nom : `GET /v1/me/buildings` (`player-buildings.controller.ts:111-113`, `@UseGuards(JwtAuthGuard)`), `name_i18n: I18nRef` ; **5/5** des `building_id` rencontrés dans `nodes`/`legs`/`arrow_to_building_id` ont un nom, **0 maillon sans nom** ; forme mesurée `{ key: 'game.fiction.building.name', params: {enseigne, district, block} }` et gabarit FR `'{enseigne} — {district}, îlot {block}'` (`string_table.ts:3469`) — **identique au mot près** à ce que la maquette cite et dessine. **MAIS le repli est injouable** : les 12 clés `building.type.*` existent bien (`string_table.ts:2416-2439` / `5325+`), seulement le repli se déclenche quand un maillon **n'a pas** de bâtiment dans `/me/buildings` — et le **type** n'est alors servi par rien : la route du graphe ne donne que `building_id` (`supply-chain.controller.ts:128-133`), et le type vient de `/me/buildings` lui-même. Le cas est **réel** : `/me/buildings` filtre `structural_state != 'demolished'` (`district-interior.repository.ts:320`) alors qu'**aucun** code ne supprime la ligne `supply_node_pressure` : 0 occurrence de `DELETE`/`.delete(` sur cette table (le seul `.delete(` du module est un `Map.delete` JS, `backpressure-update.service.ts:157`) — **contrôle positif du motif** : 91 sites de suppression trouvés ailleurs dans le dépôt. |
| **P5** | **VÉRIFIÉ** | **28 lignes exactement** : `git diff --numstat ec35deec 943ee47b` → `19  9  ecrans-brennar-6.html`, **1 seul fichier**. **4 hunks**, tous dans la zone ㉚ (l. 6868-6901 : commentaire 6868, CSS `.gr30` 6870-6888, cadre 6890-6892, aside 6893-6901) — hunks à 6868, 6873-6878, 6880-6882, 6891 ; l. 6867 (`fin ㊴ Q5`) intacte. **Dans le cadre**, aucune information neuve sans source : les `libellé à servir` sont remplacés par des **valeurs servies**, le 5ᵉ maillon est un cardinal servi, aucun scalaire en dur, aucune clé inexistante. (Les deux règles sans source arrivent par l'**aside** neuf — comptées en P1/P4, pas redoublées ici.) |

**Ordres mesurés** (même compte, même route) : `[e7c7,118f,6a90,44b2,2944]` (compte neuf, 2 passes) →
`[118f,44b2,6a90,2944,e7c7]` (après écriture + tick) → `[6a90,118f,44b2,2944,e7c7]` (après relief).

## Écarts à consigner (maquette)

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| **E-a** | « un maillon engorgé **sans** flèche est la **cause**, pas un maillon qui subit » — règle écrite de l'aside | **B⁻** (`is_blocked_output`, en base, non projeté) | aside l. 6895 | **dessinée sans source** → **forme F, lot back** | `mesures/08-graph-apres-relief.json` (3 × `mild`, `has_arrow:false`) + base `is_blocked_output = f` pour les 5 ; `supply-node-pressure.repository.ts:179-191` ; `supply-chain-graph.service.ts:109-117` (la ligne brute porte `isBlockedOutput`, la projection l'omet) |
| **E-b** | repli `building.type.*` | – (le **type** n'est servi par aucune route atteignable depuis un `building_id` nu) | aside l. 6898 | **repli déclaré, non dérivable** | `supply-chain.controller.ts:128-133` ; `district-interior.repository.ts:320` ; `string_table.ts:2416-2439` (les clés existent, le paramètre manque) |
| **E-c** | « mesuré : **1 maillon sur 3** `warm` » | `bucket` | aside l. 6895 | **compte faux dans la prose** : le cadre dessine **2** maillons `warm` (« Engorgé »), pas 3 | `grep -c 'Engorgé'` sur `mesures/cadre-154.html` = **2** ; les 3 maillons non-silencieux sont 1 × `critical` + 2 × `warm` |
| **E-d** | 2ᵉ forme servie du nom : `game.fiction.building.name.rang` (+ param `rang`, gabarit FR `'… , n° {rang}'`) | ● | – | **servie, ni dessinée ni citée** — le client doit résoudre **2** clés, la maquette n'en nomme qu'une | `fiction-names.ts:68-94` (`desambigue = rank > 1`) ; `string_table.ts:3474` |
| **E-e** | étiquette du cadre : « `GET /v1/supply-chain/graph` **SEUL** (nodes + legs) » | — | cadre l. 6890 (non touchée par le diff) | **étiquette devenue fausse** : chacun des 14 noms dessinés exige un **2ᵉ** appel joueur (`/v1/me/buildings`) | l. 6890 inchangée vs registre l. 6868 (« 2ᵉ appel du client ») |
| **E-f** | clé de tri du « puis par nom servi » | ● | aside l. 6897 | **non spécifiée** : `name_i18n` est un `I18nRef`, pas une chaîne — le tri doit porter sur la chaîne **résolue** (ou `params.enseigne`, puis `district`, puis `block`) | `i18n-ref.ts:22-24` ; `fiction-names.ts:86-94` |

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `is_blocked_output` (⚠️ **en base, non projetée** — `supply_node_pressure`) | « c'est **ici** que ça bouche », par opposition à « ça remonte jusqu'ici » | **utile ici, et nécessaire** : c'est la seule chose qui distingue la cause du symptôme, et la maquette l'a déjà dessinée à sa manière (E-a). Sans elle, la liste montre quatre nuances de pression et aucune direction d'action | **1** |
| 2 | `legs[].maintenance_mode` + `maintenance_completes_at_tick` (lues par `leg.repository.ts:444-445`, **omises** par la projection) | « une réparation est en cours sur cette liaison, elle finit à … » | utile ici : une liaison `Rompu` **déjà en réparation** et une liaison `Rompu` abandonnée demandent deux gestes opposés ; aujourd'hui elles sont dessinées pareil. ⚠️ R2.2 : à servir en **bande**, pas en compte à rebours | **2** |
| 3 | `routes[].state` + `rebuilding` | « cette route est saturée / coupée / en reconstruction » | dette **déjà nommée** par le dossier (cadre suivant) — non rouverte ici | 3 |
| 4 | `routes[].time_to_collapse_bucket` / `sinuosity_stress_bucket` | « combien de temps avant que ça casse » | idem, dette nommée | 4 |
| 5 | `legs[].stress_streak`, `last_throughput_tick`, `last_decay_eval_tick`, `created_at` | ancienneté / régularité du trafic | **pas ici** : de la plomberie de tick, et `stress_streak` est explicitement derrière le mur R2.2 (design §13) | 5 |

## Lots back suggérés (B⁻ dessiné, forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| 1 | `is_blocked_output` | `supply_node_pressure` (8 colonnes) | aside l. 6895 (« la **cause** ») | **forme F complète** : écrite (`accrueSources`, `pressure.repo:106-121`), **relue** (`readAllRaw`, `pressure.repo:280`), **passée au compositeur** (`RawNodePressureRow.isBlockedOutput`), **omise** par la projection (`supply-chain-graph.service.ts:109-117`) ; déjà servie côté BO (`supply-chain-admin.controller.ts:211`) |

Autres colonnes **en base, non projetées** (candidates sans dessin) : `blocked_sources`,
`source_distance_hops`, `last_propagation_tick` (nœuds) · `stress_streak`, `last_throughput_tick`,
`last_decay_eval_tick`, `maintenance_mode`, `maintenance_completes_at_tick`, `created_at` (legs).
`backpressure_index` et `debt_load` sont **interdits** de projection (R2.2, design §13) : jamais des
candidats.

## Actions : routes ↔ CTA

Routes `@Post` joueur du domaine : **3** (`supply-chain.controller.ts:163`, `:217`, `:236`).
CTA / gestes dessinés dans le cadre : **0** (aucun `.geste`, aucun bouton — le cadre est une **vue de
lecture**, ce que son étiquette assume).

| route | CTA | statut |
|---|---|---|
| `POST supply-chain/legs/:legId/maintain` | – | **question** : la poignée (`legs[].leg_id`) est servie et dessinée nulle part ⇒ aucune liaison n'est actionnable depuis ce cadre. Dette nommée par le dossier (`legs[].leg_id`) — cohérent, pas un défaut |
| `POST supply-chain/nodes/:buildingId/trace-step` | – | **question** : `nodes[].building_id` est servi ; remonter la chaîne pas-à-pas serait le geste naturel du maillon. Hors lot (les cadres 50-52 portent la trace, cf. registre l. 6868) |
| `POST supply-chain/nodes/:buildingId/resolve` | – | **question** : idem, le geste « à la source » ; hors lot |

## Table de couverture complète

Recomptée par `mesures/controle-arithmetique.py` depuis `mesures/couverture.tsv` (**jamais** depuis
cette synthèse) :

    |cles B|                  = 21
    |M non apparies|          = 11
    somme                     = 32
    nombre de lignes de table = 32
    CONTROLE VERT

Contrôles **négatifs** du script (sur copie, scratchpad) : une clé B passée à « – » → **ROUGE** ; une
ligne retirée → **ROUGE** (`trous de numérotation = [5]`). Le vert n'est donc pas un vert de
compilateur satisfait.

La table ligne à ligne : `mesures/couverture.tsv` (32 lignes ; 21 clés B dont 13 `ASSUMÉ` du dossier —
`legs[].leg_id` + les 7 clés et le cardinal de `routes[]` — et 11 éléments M non appariés : 4 de la
barre HUD, 4 titres/titrons statiques, 2 littéraux ratifiés, 1 glyphe).

## Annexes

### 1. Routes du domaine (compte, ancres)

`services/game-back/src/core_loops/supply_chain/*.controller.ts` : **3** fichiers, dont 1 `admin` et 1
`-test` exclus. Le contrôleur joueur porte **5** routes, **toutes** sous `@UseGuards(JwtAuthGuard)`
(compté : `@Get` = 2, `@Post` = 3, `@UseGuards(JwtAuthGuard)` = 5) : lectures l. 122
(`supply-chain/graph`) et l. 199 (`supply-chain/nodes/:buildingId/backpressure`) ; actions l. 163,
217, 236.
Complément au-delà du module (grep « building » dans tous les `*.controller.ts`, hors admin/_test/bo) :
**29** fichiers ; celui qui porte la donnée du cadre est
`citysim/district_interior/player-buildings.controller.ts:111` (`GET me/buildings`).
Le module du domaine est **identique** entre le build servi (`35bdd6cb`) et le commit du dossier
(`6040a213`) : `git diff --name-only` sur `core_loops/supply_chain/` et sur `citysim/` → **0** fichier
(contrôle positif : le diff global en touche **28**). Je ne dépends donc d'aucune divergence.

### 2. Corps réels — `mesures/` + commandes

`mesures/commandes.txt` (commande **et** sortie, jetons masqués `Bearer ***`). Corps :
`01-signup.json`, `02-session-open.json` (HTTP **422** « *client_version is required.* » — le kit de
départ est déjà octroyé au signup : 5 bâtiments, 5 nœuds), `03-graph-neuf-p1/-p2.json`,
`04-me-buildings.json`, `05-graph-dimensionne-p1.json`, `06-graph-dimensionne-tick-p1/-p2.json`,
`07-graph-6ticks.json`, `08-graph-apres-relief.json`.

Ensembles de clés mesurés (triés) : racine `data` → `legs`, `nodes`, `routes` · `nodes[]` →
`arrow_to_building_id`, `bucket`, `building_id`, `has_arrow` · `legs[]` → `bypassed`, `debt_bucket`,
`destination_building_id`, `leg_id`, `origin_building_id` · `routes[]` **mesuré vide** (voir §6).

⚠️ **Dimensionnement : pas une action joueur.** `supply_chain_legs` n'est écrit que par une **arrivée
de transit** (`distribution-transit.service.ts:182`) et le tick citysim ne tourne pas sur cette pile
(`supply-node-pressure.repository.ts:305` : « `CITYSIM_CONTINUOUS_LOOPS` n'est posé que sur
staging »). J'ai donc employé le seam `_test` — qui appelle le **code de production** inchangé
(`supply-chain-test.controller.ts:94-104` → `LegAccrualService.recordThroughput`, la vraie formule D5),
sur le **seul** compte jetable `jd2-1794419019`. Aucun compte existant touché, aucune pile modifiée.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | type | valeurs possibles | contrainte lue |
|---|---|---|---|
| `nodes[].bucket` | bande | `silent` \| `mild` \| `warm` \| `critical` | `backpressure-bucket.ts:22` + bornes `backpressure-bucket.ts:35-38` et seuils 0,10 / 0,40 / 0,85 (`core-loops-tunables.ts:582-598`) |
| `nodes[].has_arrow` | booléen | `true` \| `false` | `supply-chain-graph.service.ts:115` (`arrowToBuildingId != null`) |
| `nodes[].arrow_to_building_id` | id opaque \| `null` | le voisin **d'un cran vers la source** | `backpressure-propagation.ts:46,98` |
| `nodes[].building_id` | id opaque | — | `supply-chain.controller.ts:129` |
| `legs[].debt_bucket` | bande | `fresh` \| `accruing` \| `stressed` \| `fractured` | `debt-bucket.ts:23` + `:31-35` ; seuils 0,85 / 2,0 (`core-loops-tunables.ts:698,770`). **Les 4 mesurées sur le fil** (`mesures/06-*`) |
| `legs[].bypassed` | booléen | `true` \| `false` | `supply-chain.controller.ts:139` ; posé par `maintain` mode `reroute_bypass` (`:154-156`) |
| `legs[].leg_id` | id opaque | — | `supply-chain.controller.ts:135` |
| `routes[].state` | enum | `draft` \| `active` \| `saturated` \| `severed` | `supply-chain-graph.service.ts:69` |
| `routes[].sinuosity_stress_bucket` / `time_to_collapse_bucket` / `rebuilding` | bandes / booléen | — | `supply-chain-graph.service.ts:181-189` (non mesurées : `routes` vide, §6) |
| `buildings[].name_i18n` | `I18nRef` | `game.fiction.building.name` (params `enseigne`, `district`, `block`) \| `…name.rang` (+ `rang`) | `fiction-names.ts:68-94` ; gabarits FR `string_table.ts:3469,3474` |

R2.2 : **aucune** clé de la route ne déroge (aucun scalaire ; `backpressure_index`, `debt_load`,
`stress_streak`, `sinuosity_index` restent derrière le mur — vérifié clé par clé sur les corps mesurés).

### 4. Inventaire M (Mxx → représente)

Cadre épinglé : `943ee47b`, index **154** en 0-based sur **155** `<div class="cadre">` (repéré par le
libellé, comme le dossier l'exige) — extrait dans `mesures/cadre-154.html` (4 018 octets) et
`mesures/aside-154.html`. Recompté par script : **5** `.noeud.gr30-n`, **4** `.gr30-l`, **1**
`.gr30-fl`, **14** `.gr30-nom`, **2** « Engorgé ».

| M | texte / valeur telle qu'écrite | représente |
|---|---|---|
| M01-M04 | « ARGENT 24 850 € » · « CHALEUR / Tiède » + jauge · « JOUR 12 » · « Plein jour » | barre HUD commune aux 155 cadres — hors route du cadre |
| M05 | « La chaîne » | titre de l'écran (statique) |
| M06 | « Chaque maillon, sa pression ; chaque liaison, son entretien. » | sous-titre (statique) |
| M07 / M14 | « Les maillons » / « Les liaisons » | titrons de section (statiques) |
| M08 | liste de 5 entrées | cardinal de `nodes[]` |
| M09 | pastille `#d97a6a` / `#e08a4a` ×2 / `#d9ab4e` / `#8fb59a` | la bande du maillon (`bucket`) |
| M10 | 5 noms : « Soudure Varne — La Lisière, îlot 1501 », « Billard Marr — … 1505 », « Clés-Minute Rook — … 1503 », « Consigne de la Threnny — … 1504 », « Réserve Nock — … 1502 » | nom du bâtiment (`name_i18n` de `/me/buildings`, jointure `building_id`) |
| M11 | « Ne livre plus » · « Engorgé » ×2 · « Ça commence à s'accumuler » · « Rien ne bloque » | la bande, en mots (4 valeurs ↔ 4 libellés) |
| M12 / M12b | 1 × « ↳ refoule vers » | `has_arrow` (présence) / le littéral (statique) |
| M13 | « Soudure Varne — … 1501 » (cible) | `arrow_to_building_id` → nom |
| M15 | liste de 4 entrées | cardinal de `legs[]` |
| M16 / M17 / M17b | origine, destination, glyphe « → » | `origin_building_id` / `destination_building_id` → noms |
| M18 | « Rompu » · « Tient à peine » · « L'entretien prend du retard » · « Entretenu » | `debt_bucket` en mots (4 ↔ 4) |
| M19 / M19b | bordure pointillée + « contournée » (1 sur 4) | `bypassed` / le littéral (statique) |

**Aucune valeur codée en dur de type scalaire** dans le cadre (ni largeur de jauge, ni pourcentage, ni
compte) — vérifié : les seuls `style=` du panneau portent des **couleurs** et la hauteur du téléphone
(`height:462px`, commune aux cadres).

### 5. Inventaire F — sans objet (mode maquette)

### 6. Non vérifié

1. **`routes[]` mesuré vide** sur les 7 corps (compte neuf **et** dimensionné) : aucune route
   sauvegardée. Les 7 clés et leurs valeurs possibles restent **DÉDUITES** de
   `supply-chain-graph.service.ts:60-72,175-191`. Ce qui trancherait : `POST /v1/routes` (route joueur
   de `operational/distribution/route.controller.ts`) avec `is_saved=true`, puis re-mesure. Hors lot
   (écart ASSUMÉ du dossier).
2. **Bandes `warm` et `critical` des nœuds** jamais atteintes sur la pile : les 6 ticks de montée
   n'ont porté l'indice qu'à 0,160 (`mild`). Ce qui trancherait : ~4 ticks de plus
   (`backpressureCriticalThreshold` 0,85 à +0,08/tick ⇒ ~11 ticks de source continue). Les mots et les
   couleurs des 4 bandes restent donc appariés **au contrat** (énum), pas à un corps.
3. **Le défilement en pixels** : je vérifie la règle CSS et sa spécificité, **pas** l'effet. Qu'un
   `overflow-y:auto` soit valide ne prouve pas qu'une barre apparaît ni qu'aucun nom ne se fait couper
   à 462 px de haut — c'est une mesure de **rendu** (juge visuel, capture à `t=0`).
4. **« Les cinq noms ci-dessus sont les valeurs mesurées »** (aside l. 6898) : non vérifiable depuis
   mon compte — l'enseigne dérive d'un **hash du `building_id`** (`fiction-names.ts:89`), donc mon
   compte sert 5 **autres** enseignes (« Mécanique Skeld », « Cave Marr », « Photo Ilm », « Box Halde »,
   « Café du Quai »), au **même** gabarit, même district, îlots 1501-1505. La **forme** est vérifiée,
   les cinq valeurs exactes ne le sont pas. Ce qui trancherait : les `building_id` du compte mesuré par
   l'atelier.
5. **`bypassed = true`** jamais obtenu : il demande `POST …/maintain` en mode `reroute_bypass`, donc du
   cash et une liaison éligible. La clé est servie (mesurée `false` ×5) ; la **valeur** dessinée
   (« contournée ») est appariée au contrat, pas à un corps.
6. **Le dossier annonce la maquette à « ~570 Ko »** ; mesuré **2 660 983 octets** (6 904 lignes),
   sha256 `f884ca15…43bcc42`. Sans effet sur le jugement (le cadre est repéré par son libellé, index
   154 confirmé), mais le chiffre du dossier n'est pas celui du fichier épinglé.
