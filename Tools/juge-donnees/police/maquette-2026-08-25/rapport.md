# Juge données ⊥ — La police (screen_10 « Les Inspections » + screen_9 « Les Commissariats ») — mode MAQUETTE — 2026-08-25

Juge à contexte vierge. Compte **frais** `jdpol-1787686176`, stack dev locale, aucun conteneur monté
ni redémarré, compte de démo jamais touché. Commandes dans `commandes.md`, sorties dans `mesures/`.

---

## En une phrase

Les deux maquettes dessinent **17 des 28 informations** que le back sert pour ces deux écrans — **11 sont
disponibles et non dessinées**, dont **6 méritent une question** (les 5 autres sont de la plomberie ou une
constante) ; **8 éléments dessinés n'ont aucune clé derrière eux** ; et la mesure remonte
**11 écarts** dont **4 durs** — un nom de district qui n'existe pas, un état « seize districts sans
file » que le back ne produit jamais, un CTA qui ne peut désigner aucun bâtiment (entier vs uuid),
et un « coûte de l'argent » démenti par un delta de portefeuille **mesuré à 0**.

Et **quatre** valeurs d'énumération dessinables sont **structurellement mortes** : `FALSE_REPORT` et
`GENUINE_REPORT` (les **4** chemins d'écriture de production de `inspection_queues.entries` énumérés —
aucun ne les pose), `BUDGET_CUT` et `SURGE` (0 écrivain de production d'un `budget_modifier` non nul).

---

## Défauts / écarts à consigner (mode maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **D1** | Le nom du 2ᵉ district de la maquette : « **Dock-Sud** » | ● `name_canonical` | ● | **DESSINÉ SANS SOURCE** — la valeur n'est dans aucune ligne | `mesures/14-world-districts.json` : les 18 `name_canonical` sont `Tidewater-1..3`, `Spine-A..D`, `Lattice-A..C`, `Stack-1..2`, `Glass-1..3`, `Verge-A..C`. Aucun « Dock ». Balayage insensible à la casse du seed de géographie (`db/migrations/0016_world_geography_seed.sql`) : **1** hit pour `dock`, et c'est le mot « Docker » dans un commentaire. « Verge-A » = district **16**, lui, existe. |
| **D2** | « **Seize autres districts : la police n'y a pas ouvert de file** » | ● | ● | **ÉTAT INEXISTANT** — le back n'a que deux régimes, jamais un mélange | Mesuré : sur compte frais **18/18 → 404** (`mesures/03-fresh-codes.txt`) ; après le **premier** dispatch 12 h **18/18 → 200** (`mesures/06-apres1j-codes.txt`). Le semis est tout-ou-rien (`inspection_queue.spec.ts:318-330` : « exactly city.district_count (18) rows »). Un district calme rend **200 + `queue_load: EMPTY`**, pas 404. |
| **D3** | CTA « **Déposer un signalement sur un bâtiment** » | ● (route) | ● | **GESTE NON CÂBLABLE** — deux espaces d'identité disjoints | La route exige un entier : `inspection.controller.ts:128-131` (`building_id must be a non-negative integer`). La **seule** identité de bâtiment qu'une route joueur rend est un **uuid** : `heat.projection.service.ts:43` + mesuré `mesures/09-heat-16.json` (`"building": "2dd2a970-…"`). Mesuré : l'uuid réel envoyé à la route → **422** (`mesures/13-report-uuid.json`). |
| **D4** | Sous-ligne du CTA « **coûte de l'argent** » | ⊘ | ● | **DESSINÉ SANS SOURCE** — rien n'est débité | Mesuré : `cash_cents` **1000000 → 1000000** autour d'un `FALSE_REPORT` (`mesures/10-wallet-avant.json` / `12-wallet-apres.json`). La réponse porte `cost_resolved: 50` mais le débit est différé : `false-report-ledger.service.ts:18-20` (« the actual currency deduction is player economy P2 »). |
| **D5** | Barre « **signalements** » (origine) | ● ×2 | ● ×1 | **BANDE MORTE + 2 clés fondues en 1** | `type_distribution.FALSE_REPORT` et `.GENUINE_REPORT` : **0 écrivain** dans tout `services/game-back/src`. Preuve par **énumération des chemins d'écriture**, pas par littéral : les **4** appels de production à `InspectionQueueRepository.applyQueues` sont `inspection.service.ts:563` (le tick de dispatch), `false-report-ledger.service.ts:164`, `effluent-stoichiometry.service.ts:646`, `standing-gap-heat.service.ts:674` — tous les autres sont dans `forensic-test.controller.ts` (contrôleur `_test`). Les sources qu'ils posent : le tick via ses **4** appels d'`enqueueWithOverflow` (`:403` SCHEDULED, `:422` SCHEDULED, `:473` INFORMANT, `:633` CASCADE), le ledger **SCHEDULED** (`false-report-ledger.service.ts:146`), les deux forensiques **FORENSIC** (`effluent-stoichiometry.service.ts:640`, `standing-gap-heat.service.ts:668`). ⇒ Déposer un signalement **n'ajoute jamais** une entrée `FALSE_REPORT`/`GENUINE_REPORT` : la barre que le joueur alimente est celle qu'il ne verra jamais bouger. ★ Et `inspection.service.ts:51-52` affirme l'inverse, verbatim : « *The FALSE_REPORT / GENUINE_REPORT source enum members in QueueEntrySource are now produced by the FILE action path.* » — **énoncé daté faux, en production**. |
| **D6** | Barre « **forensique** » (6ᵉ origine) | ● | – | **CLÉ DISPONIBLE, NON DESSINÉE** (la maquette montre 4 barres sur 6) | `inspection.projection.service.ts:85` (`ALL_SOURCES`, 6 membres) ; mesuré 6 clés dans chaque corps (`mesures/apres-7j/inspection-*.json`). FORENSIC est **vivant** (2 écrivains de production). |
| **D7** | Chip « **Régime · arriéré** » et les régimes en général | ● 4 valeurs, **2 atteignables** | ● | **DOMAINE SURDIMENSIONNÉ** | `dispatcherRegime` (`inspection.service.ts:860-866`) : `BUDGET_CUT` si `budget_modifier < 0`, `SURGE` si `> 0`. **Aucun écrivain de production** ne pose un `budget_modifier` non nul — les seuls sont 3 `INSERT` bruts dans `forensic-test.controller.ts:811, 2093, 2310` (contrôleur `_test`). Mesuré : `budget_modifier = 0` sur les 18 lignes. ⇒ domaine vivant = {NOMINAL, BACKLOGGED}. ★ Nuance vérifiée : le moteur d'effets sait déplacer le **plafond** de file (`T.city.inspection_queue_cap`, `random-world-event-generator.service.ts:141`, `political-event-catalogue.ts:66,182`) — donc `BACKLOGGED` reste atteignable par un événement live ; il ne touche **jamais** `budget_modifier`, donc `BUDGET_CUT`/`SURGE`, eux, restent morts. |
| **D8** | Chip « **Charge · lourde** » | ● 5 valeurs, **2 observées** | ● | **NON OBSERVÉ** — HEAVY exige ≥ 20 entrées | Cap = 32 (`inspection-tunables.ts:64`) ; HEAVY à 60 % (`inspection.projection.service.ts:75`) ⇒ ≥ 19,2. Mesuré après **8 jours in-game** de joueur passif : longueur max **4** sur 18 districts (`mesures/apres-7j/`), donc `EMPTY`/`LIGHT` seulement. Aucun test du dépôt n'épingle une valeur non-`NOMINAL`/non-`LIGHT` (`inspection_queue.spec.ts:546,550` ne testent que l'appartenance au domaine). |
| **D9** | Bande « **quelques** » (SOME) des deux distributions | ● | ● | **NON ATTEIGNABLE sous 5 entrées** | `presenceBand` (`inspection.projection.service.ts:152-158`) : `SOME` exige `0 < frac < 0,25`. À 4 entrées maximum, toute part non nulle vaut ≥ 0,25 ⇒ `MANY` ou `PREDOMINANT`. Mesuré sur 18 districts × 2 relevés : bandes vues = **NONE, MANY, PREDOMINANT** — jamais SOME. |
| **D10** | « **Un vous soupçonne** » / « le précinct 3 vous soupçonne » (récit d'un seul précinct saillant) | ● | ● | **RÉCIT DÉMENTI PAR LA MESURE** | Mesuré après **1** jour in-game d'un joueur qui n'a rien fait : `belief` = **HUNTING ×4**, SUSPICIOUS, WATCHFUL. Après 8 jours : **HUNTING ×4, SUSPICIOUS ×2** — jamais DORMANT. Cause : `belief` est buckété sur le **pic** de la carte entière (`police_memory.service.ts:900-912` + `inspection`… pardon, `police_memory.projection.service.ts:63,68-72`), et le pic **sature à 255** (mesuré : 4 précincts sur 6 à 255 dès le jour 1). Le seuil HUNTING est 180. |
| **D11** | Chevron « › » sur chaque ligne de précinct | ⊘ | ● | **AFFORDANCE SANS DESTINATION** | Les seules routes précinct sont `belief` et `patrol` (balayage arbre entier, contrôle positif ci-dessous). Le détail promis par le chevron ne contient rien de plus que la ligne elle-même. |

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `backlash_triggered` (`POST city/inspection/report`) | « ça y est, la police s'est retournée contre vous » — le seul retour que le geste produise | **Utile ici, et c'est le trou le plus cher** : mesuré, il passe à `true` **une seule fois** (au 8ᵉ dépôt) puis retombe à `false` (`mesures/15-flood.txt`). C'est un **front**, pas un état : un joueur qui rate l'écran ne peut plus jamais savoir qu'il est sous sanction. La maquette ne le dessine nulle part. | ★★★ |
| **Q2** | `cost_resolved` (même route) | le prix du geste (50) | **Utile** : la maquette dit « coûte de l'argent » sans le montant, et rien n'est débité (D4). Soit on montre le nombre, soit on retire la promesse. | ★★★ |
| **Q3** | `type_distribution.FORENSIC` | « ils font de la police scientifique sur vous » — l'origine la plus inquiétante des six | **Utile ici** : c'est la seule origine qui distingue « la routine » de « ils vous visent ». Elle a 2 écrivains de production, donc elle bougera vraiment. | ★★★ |
| **Q4** | `type_distribution.GENUINE_REPORT` vs `.FALSE_REPORT` | « on vous dénonce à raison » vs « à tort » | **Utile en principe, inutile aujourd'hui** : les deux sont à `NONE` pour toujours (D5). ⇒ soit c'est un lot back (les faire écrire), soit on retire la barre. | ★★ |
| **Q5** | `bank_side` + `profile` (`GET world/districts`) | de quel côté du fleuve, et quel genre de quartier | **Utile ici** : le problème de navigation de cet écran est une liste plate de 18 districts ; ces deux clés donnent gratuitement deux regroupements lisibles (nord/sud, 6 familles). Mesuré et servi pour les 18. | ★★ |
| Q6 | `block_count`, `index` (`GET world/districts`) | la taille du district ; son rang dans sa famille | Pas ici — `index` est déjà dans le nom (« Verge-**A** ») ; `block_count` est de la géographie, pas de la police. | ★ |
| Q7 | `control_state` (`GET world/districts`) | qui tient le district | **Non** : constante `'UNCONTESTED'` en dur (`world-geography.repository.ts:80`) — de la plomberie tant que le contrôle territorial n'est pas branché. | ✗ |
| Q8 | `report_id`, `entry_type` (`POST …/report`) | l'accusé de réception | Plomberie. | ✗ |

---

## Ce qui est en base et qu'aucune projection joueur ne porte (B⁻) — candidats à un lot back

**Aucun n'est dessiné** (compte : **0** ligne `B⁻ ● –`) — c'est pourquoi ce sont des questions produit
et non des défauts de maquette. Ils sont ici parce que le canon des deux écrans les demande
explicitement et que la donnée existe déjà.

| # | colonne / donnée | table | écrivain de production ? | ce que le canon en fait | preuve |
|---|---|---|---|---|---|
| **L1** | correspondance **district → précinct** | (calculée en mémoire, pas une colonne) | **oui — déjà construite au boot** | `screen_9 §2` la veut (« le precinct est résolu via `precinct.anchor_district` ») ; la maquette liste donc les précincts par numéro, sans district | `police_memory.service.ts:192, 234-247` (`districtToPrecinct`, précinct = ⌈district/3⌉) et `patrol.service.ts:93,143`. **Deux** copies serveur, **zéro** route. Le client devrait la recalculer ⇒ 3ᵉ copie. Le lot le moins cher de la liste. |
| **L2** | `last_raid_at` | `precinct_memory` | **oui** — `police_memory.service.ts:480` (`stampLastRaid`, sur `RaidPlannedEvent`) | `screen_9 §1 ZONE D — RECENT RAIDS` | **Mesuré non nul** : 4 précincts sur 6 portent un horodatage après 1 jour in-game. Aucune projection ne le lit. |
| **L3** | `building_raid` (ligne complète : district, bloc, tick, statut) | `building_raid` | **oui** — `raid.repository.ts:298, 401` | idem `ZONE D` (« • 3 days ago Block 47 / No casualties ») | 0 route joueur en lecture ; le seul geste joueur du domaine est `POST /v1/operational/building/:id/repair` (`repair.controller.ts:54-56`) — le joueur peut **réparer** un bâtiment raidé sans qu'aucun écran ne lui dise qu'il l'a été. |
| **L4** | `backlash_penalty_active`, `backlash_remaining_count`, `window_false_count` | `false_report_ledger_summary` | **oui** — `false-report-ledger.repository.ts:124-132` | l'état « la police s'est retournée » | **Mesuré** : `t / 8 / 9` après mes 9 dépôts. Lu **nulle part** hors du garde anti-re-déclenchement (`false-report-ledger.service.ts:87`). `backlash_remaining_count` a **0 lecteur** : les rapports suivants ne sont **pas** ignorés (mesuré : le 9ᵉ dépôt rend un `report_id`), contrairement à ce que `law_mis §173` décrit. |
| **L5** | l'historique des dépôts du joueur | `false_report_ledger` | **oui** (la route FILE) | — | 0 route en lecture : le joueur ne peut jamais relire ce qu'il a signalé. `verified_false_at` et `source_confirmed` ont **0 écrivain** dans tout l'arbre (mesuré en base : 9 lignes, `source_confirmed` = false partout, `verified_false_at` = NULL partout). |
| L6 | `last_intel_purchased_at`, `corruption_clerk_id` | `precinct_memory` | **NON — 0 écrivain** | `screen_9 §1 ZONE C — INTEL` (achat de renseignement, greffier corrompu) | 3 et 6 occurrences dans l'arbre, **toutes** en commentaire ou en migration. Ce ne sont pas des lots de projection : la mécanique entière est absente. |
| L7 | `top_5_buildings`, `suspicion_map`, `entries`/`head`/`tail`, `length` | `precinct_memory`, `patrol_observation_queues`, `inspection_queues` | oui | **interdits au joueur** | `screen_10 §P5` et `inspection.projection.service.ts:11-25` — non projetés **à raison**, aucun lot. |

---

## Actions : routes ↔ CTA

| route `@Post` joueur du domaine | CTA maquette | statut |
|---|---|---|
| `POST /v1/city/inspection/report` (`inspection.controller.ts:115-117`) | « Déposer un signalement sur un bâtiment » | **apparié, mais non câblable** — voir D3 |
| — (aucune) | canon `[Read queue contents →] ($200 fee)` (screen_10 §1 ZONE B) | **route absente** — re-vérifié : 1 seule occurrence d'`informant_fee` dans tout l'arbre, un commentaire (`inspection-tunables.ts:35`). Non dessiné : correct. |
| — (aucune) | canon `[Flood queue — N low-severity reports]` (screen_10 §1 ZONE C) | **pas une route** : c'est N appels à `…/report`. Non dessiné : correct. |
| — (aucune) | canon `[Buy intel: 1 building, $1 200]` (screen_9 §2 `POST /bpd/precinct/:id/intel/buy`) | **route absente**. Le seul achat de renseignement existant vise un **acteur des affaires internes**, pas un précinct : `internal-affairs.controller.ts:76-78` (`:ref` = `lawyer_id`/`candidate_id`). Non dessiné : correct. |
| — (aucune) | canon `[Recruit clerk: $8 000 + 2 sess]` (screen_9 §2 `POST /bpd/precinct/:id/clerk/recruit`) | **route absente**. Non dessiné : correct. |
| `POST /v1/operational/building/:id/repair` (`repair.controller.ts:54-56`) | **aucun CTA** sur ces deux écrans | **question** : c'est le geste de sortie de la boucle raid, et l'écran qui parle des raids ne le porte pas (voir L3). |
| — | chevron « › » par précinct | **CTA sans route** — D11 |

---

## Table de couverture complète

Colonne F absente (mode maquette). `●` = présent · `–` = absent · `⊘` = pas de clé.
M-inspections = cadres 32/33 ; M-commissariat = cadres 34/35.

### Partie 1 — les 28 informations que le back sert (|B| = 28)

| # | information (clé) | route | B | M | statut |
|---|---|---|---|---|---|
| B1 | `district` (`"district-16"`) | inspection | ● | ● (via jointure sur le nom) | ✔ — identité, pas un nom ; le client doit dépiler le préfixe |
| B2 | `queue_load` | inspection | ● | ● chip « Charge · … » | ✔ (5 valeurs, 2 observées — D8) |
| B3 | `dispatcher_regime` | inspection | ● | ● chip « Régime · … » | ✔ (4 valeurs, 2 atteignables — D7) |
| B4 | `severity_distribution.LOW` | inspection | ● | ● barre 1 « faible » | ✔ |
| B5 | `severity_distribution.MEDIUM` | inspection | ● | ● barre 2 « moyenne » | ✔ |
| B6 | `severity_distribution.HIGH` | inspection | ● | ● barre 3 « haute » | ✔ |
| B7 | `severity_distribution.CRITICAL` | inspection | ● | ● barre 4 « critique » | ✔ |
| B8 | `type_distribution.SCHEDULED` | inspection | ● | ● barre 1 « programmées » | ✔ |
| B9 | `type_distribution.INFORMANT` | inspection | ● | ● barre 2 « informateur » | ✔ |
| B10 | `type_distribution.FALSE_REPORT` | inspection | ● | ● barre 3 « signalements » (fondue) | **D5** |
| B11 | `type_distribution.GENUINE_REPORT` | inspection | ● | – (fondue dans B10) | **D5** + Q4 |
| B12 | `type_distribution.CASCADE` | inspection | ● | ● barre 4 « cascade » | ✔ |
| B13 | `type_distribution.FORENSIC` | inspection | ● | – | **D6** / Q3 |
| B14 | `report_id` | report | ● | – | Q8 — plomberie |
| B15 | `entry_type` (écho) | report | ● | – | Q8 — plomberie |
| B16 | `cost_resolved` (50) | report | ● | – | **Q2** |
| B17 | `backlash_triggered` | report | ● | – | **Q1** |
| B18 | `precinct` (`"precinct-3"`) | belief + patrol | ● | ● pastille « 3 » + « Précinct 3 » | ✔ |
| B19 | `belief` | belief | ● | ● chip conviction | ✔ (4 valeurs, 3 observées — D10) |
| B20 | `patrol_heat` | patrol | ● | ● chip patrouilles | ✔ (4 valeurs, 4 observées) |
| B21 | `id` (district) | world/districts | ● | ● (implicite, via la jointure) | ✔ |
| B22 | `profile` | world/districts | ● | – | **Q5** |
| B23 | `index` | world/districts | ● | – | Q6 |
| B24 | `name_canonical` | world/districts | ● | ● « Verge-A » | ✔ (mais « Dock-Sud » — **D1**) |
| B25 | `block_count` | world/districts | ● | – | Q6 |
| B26 | `bank_side` | world/districts | ● | – | **Q5** |
| B27 | `control_state` | world/districts | ● | – | Q7 — constante |
| B28 | `opened_game_day` | session/open | ● | ● « Jour 26 » | ✔ — mesuré : **8** après 8 jours in-game, figé pour la durée de la session (`session.repository.ts:169`) |

**Comptes de la partie 1** : **17** informations dessinées (`● ●` — B1–B10, B12, B18–B21, B24, B28) et
**11** disponibles non dessinées (`● – –` — B11, B13, B14, B15, B16, B17, B22, B23, B25, B26, B27).
17 + 11 = **28** ✔. Sur les 11 : **6 questions réelles** (B11, B13, B16, B17, B22, B26 → Q1–Q5),
**3 de plomberie** (B14, B15) ou constantes (B27 → Q7/Q8), **2 de faible intérêt ici** (B23, B25 → Q6).

### Partie 2 — les 8 éléments dessinés sans clé derrière (|M non apparié| = 8)

| # | élément dessiné | B | statut |
|---|---|---|---|
| M-A | « **2** districts sous file » / « **0** district sous file » (compteur d'en-tête) | ⊘ | **dessiné sans source** — aucun agrégat ; dérivable seulement en 18 appels. À consigner comme ASSUMÉ (client) ou à servir. |
| M-B | « Seize autres districts : la police n'y a pas ouvert de file » | ⊘ | **D2** — état que le back ne produit jamais |
| M-C | « la nuit prochaine en dira plus » (échéance, état vide) | ⊘ | **dessiné sans source** — aucune clé ne dit quand tombe le prochain dispatch. Le canon la veut (`screen_9 §1 ZONE A` : « Next review in: 6h in-game », `next_review_in_hours_ig`) ; elle n'existe pas. |
| M-D | « coûte de l'argent » | ⊘ | **D4** — démenti par la mesure |
| M-E | « **6** précincts » | ⊘ | **dessiné sans source** — `precinctCount` est un tunable serveur (`police-memory-tunables.ts`), jamais projeté ; le client le code en dur ou sonde 1..7. |
| M-F | « un vous soupçonne » (cardinal des précincts saillants) | ⊘ | **D10** — dérivé client de 6 appels, et le récit ne tient pas à la mesure |
| M-G | Le bandeau « Ce que la police croit » + sa phrase + le surlignage `.actif` de la ligne 3 | ⊘ | **dessiné sans source** — « quel précinct compte » est un arbitrage client (max sur `belief` ? sur `patrol_heat` ? départage ?) qu'aucune clé ne tranche. À écrire, sinon deux clients divergeront. |
| M-H | Chevron « › » par ligne de précinct | ⊘ | **D11** — affordance sans destination |

### Contrôle d'arithmétique

- `|clés B|` = **28** (13 inspection + 4 report + 2 belief + 1 patrol [`precinct` fusionné avec belief] + 7 world/districts + 1 session/open)
- `|éléments M non appariés|` = **8**
- `|rendus F sans source|` = **—** (mode maquette, pas de front)
- **Somme = 28 + 8 = 36 = nombre de lignes de la table** (28 en partie 1, 8 en partie 2). ✔

---

## Annexes

### 1. Routes du domaine — compte et ancres

Balayage de **144** contrôleurs (`find services/game-back/src -name '*.controller.ts'`), dont **36**
portant `test` dans le nom, exclus.

**Routes joueur du domaine police — 4** :

| # | route | ancre | garde |
|---|---|---|---|
| 1 | `GET /v1/city/district/:id/inspection` | `citysim/inspection/inspection.controller.ts:75-76` | `JwtAuthGuard` |
| 2 | `POST /v1/city/inspection/report` (201) | `citysim/inspection/inspection.controller.ts:115-117` | `JwtAuthGuard` |
| 3 | `GET /v1/city/precinct/:id/belief` | `citysim/police_memory/police_memory.controller.ts:50-51` | `JwtAuthGuard` |
| 4 | `GET /v1/city/precinct/:id/patrol` | `citysim/patrol/patrol.controller.ts:51-52` | `JwtAuthGuard` |

**Routes de support que ces deux écrans doivent aussi appeler — 3** :

| # | route | ancre | garde |
|---|---|---|---|
| 5 | `GET /v1/world/districts` | `citysim/world/world.controller.ts:39-43` | **AUCUNE** — mesuré : `200` sans en-tête `Authorization` (`mesures/14-world-districts.json`) |
| 6 | `POST /v1/session/open` | `session/session.controller.ts:56-58` | `JwtAuthGuard` — seule source de « Jour N » |
| 7 | `GET /v1/city/district/:id/heat` | `citysim/heat/heat.controller.ts:51-52` | `JwtAuthGuard` — seule source d'une identité de bâtiment |

**Coût d'affichage mesuré** : 18 (inspections) + 6 + 6 (commissariats) = **30 appels** pour peindre les
deux écrans, plus 1 (`world/districts`) et 1 (`session/open`). Aucun agrégat n'existe.

**Contrôles du balayage** (le motif pouvait rater sa cible) :
- *contrôle positif* — le même motif appliqué **aux contrôleurs `_test`** trouve bien
  `@Post('_test/citysim/raid')` (`citysim/scheduler/citysim-test.controller.ts:242`),
  `@Post('_test/legal/fire-building-raided')`, `@Post('_test/insurance/setup-raid-scenario')` ⇒ le motif
  attrape la classe « route contenant `raid` ».
- *contrôle de forme* — **0** fichier déclare un chemin de route en guillemets doubles ou en gabarit
  (`@Get("…"` : 0 fichier ; ``@Get(`…`` : 0 fichier) ⇒ le motif à guillemets simples est exhaustif.
- ⇒ **0 route de production** contenant `bpd` ou `raid` dans son chemin. Balayage complémentaire par
  mot-clé du domaine dans les 108 contrôleurs non-`test` (`inspection`, `precinct`, `patrol`, `police`,
  `belief`, `informant`, `raid`, `enforcement`, `report`) : les seuls voisins joignables sont
  `city/district/:id/unconformity`, `…/cohesion`, `…/leks`, `…/heat`, `operational/building/:id/repair`
  et les trois routes `exceptions/*` — aucune ne porte de donnée de police.

### 2. Corps réels — `mesures/` et commandes

Voir `commandes.md`. Fichiers clés :
- `mesures/03-fresh-codes.txt` — compte frais : **30 × 404**.
- `mesures/06-apres1j-codes.txt` — après **1** jour in-game (seam `_test/citysim/advance`, le même que
  `inspection_queue.spec.ts:234`) : **30 × 200**. `cadences_fired` = `{twelve_h: 2, nightly: 1, …}`
  (`mesures/05-advance-1440.json`).
- `mesures/apres-1j/` et `mesures/apres-7j/` — les 30 corps, deux relevés (jour 1 et jour 8).
- `mesures/15-flood.txt` — 9 dépôts, `backlash_triggered: true` **au 8ᵉ**, `false` au 9ᵉ.
- `mesures/18-erreurs.txt` — district `0`/`19`/`abc` → **422 VALIDATION_FAILED** ; précinct `0`/`7`/`abc`
  → **422** ; sans jeton → **401**. Aucun 500 (les ids sont des entiers, pas des uuid).

⚠️ **Le dimensionnement passe par un seam `_test`** (`POST /v1/_test/citysim/advance`) : c'est le seul
moyen d'avancer l'horloge ici. Sur cette stack, `CITYSIM_CONTINUOUS_LOOPS` **n'est pas posé**
(`docker inspect` du conteneur : `NODE_ENV=development`, aucune variable `CITYSIM_*`) ; il n'est posé que
dans `docker-compose.staging.yml:64`, et c'est lui qui lie `RealCitySimClock` (`scheduler.module.ts:54`).
⇒ **En dev, sans le seam, les 30 routes rendent 404 pour toujours** : l'état « aucune file / rien de
connu » est le SEUL état qu'un joueur atteint sur cette stack. Les corps non vides sont donc mesurés,
mais par un chemin qui n'est pas un chemin joueur — je le dis plutôt que de le taire.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine (source) | observé (2 relevés × 18/6) |
|---|---|---|
| `queue_load` | 5 : `EMPTY \| LIGHT \| MODERATE \| HEAVY \| SATURATED` — `inspection.projection.service.ts:42` ; bornes `:73-76` (0 / 25 % / 60 % / 100 % du cap 32) | **EMPTY, LIGHT** |
| `dispatcher_regime` | 4 : `NOMINAL \| BACKLOGGED \| BUDGET_CUT \| SURGE` — `inspection.service.ts:93` ; dérivation `:860-866` | **NOMINAL** (BACKLOGGED à ≥ 80 % du cap ; BUDGET_CUT/SURGE **inatteignables**) |
| `severity_distribution.*` (4 clés) | clés : `LOW \| MEDIUM \| HIGH \| CRITICAL` — `inspection.repository.ts:45` · valeurs : 4 bandes `NONE \| SOME \| MANY \| PREDOMINANT` — `inspection.projection.service.ts:52`, bornes `:79-81` | **NONE, MANY, PREDOMINANT** |
| `type_distribution.*` (6 clés) | clés : `SCHEDULED \| INFORMANT \| FALSE_REPORT \| GENUINE_REPORT \| CASCADE \| FORENSIC` — `inspection.repository.ts:56-62` (⚠️ commentaire `:50-51` : « no pgEnum or CHECK constraint on the source field ») · mêmes 4 bandes | **NONE, PREDOMINANT** ; seul `SCHEDULED` non nul chez un joueur passif |
| `belief` | 4 : `DORMANT \| WATCHFUL \| SUSPICIOUS \| HUNTING` — `police_memory.projection.service.ts:30` ; seuils pic `:45-47` (1 / 80 / 180 sur 0..255) | **WATCHFUL, SUSPICIOUS, HUNTING** (jamais DORMANT après 1 jour) |
| `patrol_heat` | 4 : `QUIET \| LOW \| MEDIUM \| HIGH` — `patrol.projection.service.ts:32` ; bornes `:48-49` (25 % / 75 %) | **les 4** |
| `entry_type` (report) | 2 : `FALSE_REPORT \| GENUINE_REPORT` — `db/schema/false_report_ledger.ts:11` (`CHECK` en migration) ; validé `inspection.controller.ts:123` | FALSE_REPORT |
| `cost_resolved` | entier, `T.city.false_report_base_cost` défaut **50** — `inspection-tunables.ts:77` | 50 |
| `backlash_triggered` | booléen ; seuil `T.city.flood_backlash_threshold` défaut **8** — `inspection-tunables.ts:79` ; ratio faux/max(vrais,1) — `false-report-ledger.service.ts:82-83` | `true` au 8ᵉ dépôt, une seule fois |
| `profile` (district) | 6 : `tidewater \| spine \| lattice \| stack \| glass \| verge` (pgEnum `world_geography.ts`) | les 6 |
| `bank_side` | 2 : `north \| south` | les 2 |
| `control_state` | 4 : `UNCONTESTED \| CONTESTED \| PLAYER_HELD \| RIVAL_HELD` — `world-geography.repository.ts:42` | **`UNCONTESTED` en dur** (`:80`) |
| `name_canonical` | 18 valeurs seedées (migration 0016) | `Tidewater-1..3`, `Spine-A..D`, `Lattice-A..C`, `Stack-1..2`, `Glass-1..3`, `Verge-A..C` |

### 4. Inventaire M (Mxx → ce que ça représente)

**M-inspections — cadre 32 « par district »** (`ecrans-brennar-2.html:1110-1129`)

| id | élément | représente | apparié à |
|---|---|---|---|
| M1 | titre « Les Inspections » | identité d'écran | — |
| M2 | chevron ‹ retour | navigation | — |
| M3 | « Jour 26 » | jour in-game | B28 |
| M4 | « **2** districts sous file » | cardinal | **M-A (aucune clé)** |
| M5 | « Verge-A » / « Dock-Sud » | nom du district | B24 (D1 sur la 2ᵉ) |
| M6 | chip `l-4` « Charge · lourde », `l-2` « Charge · légère » | charge de la file | B2 |
| M7 | chip `l-5` « Régime · arriéré », `l-1` « Régime · nominal » | régime du répartiteur | B3 |
| M8 | ligne « GRAVITÉ » — 4 barres `p1/p2/p3` + libellés `data-l` | distribution par gravité | B4–B7 |
| M9 | ligne « ORIGINE » — **4** barres | distribution par origine (**6** clés en B) | B8, B9, B10+B11 fondues, B12 ; **B13 absente** |
| M10 | 2ᵉ carte district | idem M5–M9 | idem |
| M11 | « Seize autres districts : la police n'y a pas ouvert de file » | état des 16 restants | **M-B (D2)** |
| M12 | CTA « Déposer un signalement sur un bâtiment » | le geste | route 2 (D3) |
| M13 | sous-ligne « coûte de l'argent — trop de faux, et la police se retourne » | prix + sanction | **M-D (D4)** ; la 2ᵉ moitié renvoie à B17, non dessiné |

**M-inspections — cadre 33 « aucune file »** (`:1135-1142`)

| id | élément | représente | apparié à |
|---|---|---|---|
| M14 | « Jour 1 · **0** district sous file » | cardinal à vide | M-A |
| M15 | « La police n'a pas encore ouvert de file dans vos districts — **la nuit prochaine en dira plus** » | état 404 + échéance | 1ʳᵉ moitié : les 18 × 404 ✔ · 2ᵉ moitié : **M-C** |

**M-commissariat — cadre 34 « les six précincts »** (`:1145-1163`)

| id | élément | représente | apparié à |
|---|---|---|---|
| M16 | titre « Les Commissariats » | identité | — |
| M17 | « Jour 26 · **6** précincts · **un vous soupçonne** » | jour + cardinal + saillance | B28 ✔ · **M-E** · **M-F (D10)** |
| M18 | kicker « Ce que la police croit » | intitulé du bandeau | **M-G** |
| M19 | « Le précinct 3 vous soupçonne — ses patrouilles se resserrent » | le précinct saillant | **M-G** (rendu de B19+B20 d'**un** précinct choisi par le client) |
| M20 | chip `cr-2` « Conviction · soupçonneuse » | `belief` du saillant | B19 |
| M21 | chip `l-4` « Patrouilles · serrées » | `patrol_heat` du saillant | B20 |
| M22–M27 | 6 lignes : pastille `1..6`, « Précinct N », chip conviction, chip patrouilles | les 6 précincts | B18, B19, B20 |
| M28 | surlignage `.prec.actif` sur la ligne 3 | le saillant | **M-G** |
| M29 | chevron « › » sur chaque ligne | destination de détail | **M-H (D11)** |

**M-commissariat — cadre 35 « rien de connu »** (`:1165-1174`)

| id | élément | représente | apparié à |
|---|---|---|---|
| M30 | « Jour 1 · **6** précincts · rien de connu » | cardinal + état | M-E ; « rien de connu » = les 12 × 404 ✔ |
| M31 | « La police n'a encore rien retenu de vous — ni conviction, ni patrouille » | état 404 | ✔ |

**Vocabulaires français ↔ domaines back** (annexe « Ce que les écrans de police fixent ») — vérifiés
un à un : `queue_load` 5↔5 ✔ · `dispatcher_regime` 4↔4 ✔ · bandes de présence 4↔4 ✔ · gravité 4↔4 ✔ ·
**origine 6↔4 ✘** (D5/D6) · `belief` 4↔4 ✔ · `patrol_heat` 4↔4 ✔.

★ Note mineure de couverture (pas de la géométrie) : `QUIET` et `LOW` reçoivent la **même** classe de
chip `l-1` (`:1157` « patrouilles calmes » et `:1155` « patrouilles légères ») — deux valeurs distinctes
du back rendues au même niveau visuel. Les 4 bandes ont bien 4 libellés, mais 3 niveaux.

### 5. Inventaire F

Sans objet — mode **maquette**, le front n'existe pas encore.

### 6. Non vérifié

1. **Les états non vides ne sont pas atteints par un chemin joueur.** Ils sont mesurés via
   `POST /v1/_test/citysim/advance` (contrôleur `_test`, `citysim-test.controller.ts:92`). Sur cette
   stack `CITYSIM_CONTINUOUS_LOOPS` n'est pas posé ⇒ un joueur réel reste à 404. La mesure qui
   trancherait : monter la stack avec `CITYSIM_CONTINUOUS_LOOPS=1` (comme `docker-compose.staging.yml:64`),
   ouvrir une session, laisser passer le temps réel, et relire. **Je ne l'ai pas fait** (interdiction de
   monter/redémarrer un conteneur).
2. **`MODERATE`, `HEAVY`, `SATURATED`, `BACKLOGGED` non observés.** 8 jours in-game d'un joueur passif
   plafonnent à 4 entrées ; le cap est 32. Je ne sais pas si un joueur ACTIF (bâtiments, chaleur,
   forensique) les atteint. La mesure qui trancherait : rejouer le même dimensionnement sur un compte
   qui a converti des bâtiments et accumulé de la chaleur, et relire les 18 corps.
3. **`SOME` non observé** : démontré inatteignable **sous 5 entrées** (arithmétique de `presenceBand`),
   pas démontré inatteignable en général. Une file de ≥ 5 entrées avec 1 d'un type le produirait.
4. **La saillance de `belief`** : mesurée dégénérée (pic saturé à 255 sur 4 précincts sur 6 dès le
   jour 1) **sur un compte frais avec le kit de départ**. Je n'ai pas mesuré si elle redescend
   (décroissance `memory_decay_per_tile_per_day`) sur un horizon plus long — je n'ai avancé que 8 jours.
5. **Les corps de `POST …/report` sous backlash** : je n'ai pas vérifié ce que devient une file après
   l'injection de l'audit de représailles (`false-report-ledger.service.ts:129-178`) au-delà du fait que
   la source injectée est `SCHEDULED` et non `FALSE_REPORT`.
6. **`GET /v1/world/threnny-edges`** (route 8 du monde) : hors domaine police, non mesurée.
7. **Le rendu PNG de la maquette « inspections-canon »** superpose les libellés `data-l` des barres
   (ils se chevauchent et deviennent illisibles). C'est du ressort du juge **visuel** ; j'ai donc fait
   l'inventaire M **sur la source HTML**, pas sur l'image.
8. **Je n'ai pas classé les 362 occurrences de `CASCADE`** de l'arbre (dominées par `ON DELETE CASCADE`).
   La conclusion sur les écrivains d'entrées de file ne s'appuie pas dessus : elle s'appuie sur
   l'**énumération des 4 appelants** de `enqueueWithOverflow` plus les 2 écrivains forensiques — une
   énumération de sites d'appel, pas un balayage de littéral. ★ Le balayage par littéral
   (`source: 'CASCADE'`) rendait **0** et aurait menti : la forme réelle est une variable
   (`inspection.service.ts:631` puis `source,` en abrégé à `:637`).
