# Juge données ⊥ — Plus (screen_12 « More menu ») — mode MAQUETTE — 2026-08-25

Juge à contexte vierge. Ni la maquette ni l'écran ne sont de moi. Deux côtés seulement : **B**
(ce que le back renvoie) et **M** (ce que la maquette montre) — le front n'existe pas encore.
Mesures : `mesures/` (34 fichiers JSON + `commandes.md` + `keysets-mesures.txt`). Dépôt back
`/home/erutheone/project/mafia-clean-city` — rien commité, rien créé hors de ce dossier, aucun
conteneur monté ou redémarré, compte de démo jamais touché.

> **Note de méthode, à lire avant les ancres.** Les numéros de ligne de
> `ecrans-brennar-2.html` rendus par `grep -n` **dérivent de 2 lignes** au-delà de ~l.500 dans cet
> environnement (couche d'affichage du proxy). **Toutes** les ancres de ce rapport ont été reprises
> par un oracle Python indépendant (`enumerate(open(f), 1)`) et sont exactes ; les ancres de code
> ont été re-vérifiées une à une par le même oracle (28 contrôles, 1 correction).

## En une phrase

La maquette montre **8 informations** de données sur les **51** que rendent les routes qu'elle
consomme (ou que le dossier lui prêtait) ; **5 écarts** à corriger ou ratifier (+1 tranché en faveur
de la maquette) — dont **2 mesurés en vie**, où
le compteur dessiné affiche un nombre au moment précis où **rien n'est actionnable** — et
**10 questions « passé à côté ? »**, dont 5 à coût nul (la clé est déjà dans un corps que l'écran reçoit).

---

## Écarts à consigner

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| **E1** | **La Pile — le compteur lit `slots[].status` au lieu de `state`** | ● | ● | **DÉFAUT — mesuré en vie** | `mesures/25-current-committed.json` : après un `POST /v1/cue-stack/commit` (200), `GET /v1/cue-stack/current` rend `state:"committed"` et **les 5 slots restent tous `status:"pending"`**. `mesures/26-reorder-after-commit.json` : `POST /v1/cue-stack/reorder` → **409 `RESOURCE_STATE_CONFLICT`**. La maquette (`ecrans-brennar-2.html:930`, `<small>5 créneaux à ordonner</small>` + `<span class="n">5</span>` ; commentaire de source `:923` « cue-stack/current.slots pending ») afficherait donc **« 5 créneaux à ordonner »** avec **zéro ordonnançable**. La clé juste est `state` : `reorderPending` est `WHERE player_id=$1 AND state = 'pending'` (`cue-stack.repository.ts:142`), et `findCurrent` rend délibérément **tout** stack non terminal — `state IN ('pending','committed','executing')` (`cue-stack.repository.ts:334`) — donc le cas se produit dès la première pile lancée. Le canon dit déjà la bonne chose : « count de slots en attente de **commit** » (`screen_12_more_menu.md:157`). |
| **E2** | **Le Recrutement — le compteur compte l'existence, pas l'actionnabilité** | ● | ● | **DÉFAUT — mesuré en vie** | `mesures/30-quests-active.json` : une quête réellement démarrée (`POST /v1/recruitment/quests` → 201) rend `"session_ready": false` et `"next_session_ready_at_game_minute": 2220` — `advanceStep` serait refusé. La maquette (`:935`, « 1 quête en cours » + `1`) badge donc un item sur lequel rien n'est possible. `session_ready` est calculé **dans le même corps** (`recruitment-quest.service.ts:682-684`), coût nul. Le canon exige « un **entier d'items actionnables** » (`screen_12_more_menu.md:191`). |
| **E3** | **Trois readouts « 0 » contredisent une règle explicite du canon** | ● | ● | **DÉFAUT de doctrine** | Canon `screen_12_more_menu.md:193` : « Badge zéro = badge absent (ligne sans `SplitFlapReadout`). **Jamais de readout « 0 »**. » Maquette cadre 2 : `:950`, `:951`, `:955` portent `<span class="n zero">0</span>`, avec une règle CSS écrite exprès pour eux (`:914`, `.dest .n.zero{color:var(--creme-2);opacity:.6}`). **Absent de la table des écarts assumés du dossier** — donc soit à corriger, soit à ratifier comme divergence délibérée. |
| **E4** | **L'état `week_state = 'warning'` n'est dessiné nulle part** | ● | – | **ÉCART à ratifier** | Domaine lu à la contrainte : `CHECK ("compression_week_state" IN ('none','warning','active'))` — `db/migrations/0002_player_progression_state.sql:18-19`. La maquette dessine `none` (`:936`) et `active` (`:956`). Or `warning` est **le seul état où le joueur a un choix** : `POST /v1/compression/engage` (404 partout ailleurs — `compression-board.service.ts:94-99`) et `POST /v1/compression/defer`, dont la disponibilité `deferral_available` n'est vraie **que là** (`compression-week.repository.ts:315` : `event.state === 'open' && deferral_count === 0 && orgStress < seuil`). Idem `stress_bucket ∈ {calm, mounting, crushing, compression_active}` (`stress-bucket.ts:28`) : `mounting`/`crushing` ne sont pas dessinés sur Plus, alors que l'écran Compression, lui, les dessine (`:831`, « tension **montante** »). |
| **E5** | **Le badge « Inspections » du canon n'est servable par AUCUNE route** | B⁻ | – | **lot back** (voir §Lots, L1) | Canon `screen_12_more_menu.md:159` + `:202` : `InspectionPendingCountBadge` via `GET /v1/me/inspection-queue/summary`, marqué « [à ajouter au catalogue 18] ». **0 route** à ce chemin sur les 1017 balayées (oracle `routes.json` ; contrôle positif : `me/reputation` → 1). La seule surface joueur est **par district (1..18)** (`inspection.controller.ts:75`) et **band-only** : aucun compte brut n'en sort (`inspection.projection.service.ts:59-70`). ⇒ Le « sans compteur » de la maquette (`:932`) n'est pas seulement un arbitrage de coût : **c'est le seul rendu possible aujourd'hui**. |
| **E6** | **La 9ᵉ ligne du canon (Backoffice) est structurellement inatteignable — l'omission de la maquette est CORRECTE** | – | – | **écart RÉSOLU en faveur de la maquette** | `auth/jwt-auth.guard.ts:123` : `if (result.account.kind !== 'PLAYER') throw new ApiError('AUTHZ_PERMISSION_DENIED')`. Un compte STAFF prend **403 sur toute route joueur**, donc ne peut atteindre aucun écran du client. Sur le client de jeu, `AdminAccessFlag` est **toujours faux** ⇒ la ligne du canon (`screen_12_more_menu.md:178`) ne peut jamais s'afficher. |

### Deux présomptions du dossier RÉFUTÉES par la mesure — le coût réel est plus bas qu'annoncé

- **`GET /v1/compression/state` est REDONDANT pour cet écran.** `session/open.compression_glance`
  porte `stress_bucket` + `week_state` par **le même read** (`CompressionWeekRepository.getStateProjection`)
  et **la même formule** (`stressBucket`) — `session-open-sequence.service.ts:439-442` vs
  `compression-projection.controller.ts:41-45`. La sous-ligne « tension calme · aucune semaine »
  coûte **0 appel**, pas 1. Seul `deferral_available` justifierait l'appel — et il n'est pas dessiné (E4).
- **`GET /v1/flag-review` est REDONDANT pour le compteur.** `flag_review.pending_review_count` est un
  `COUNT` sur `flagged_items WHERE player_id=$1 AND resolution='pending'`
  (`flag-discipline.repository.ts:640`), prédicat **byte-identique** à celui de `listPendingFlagsForPlayer`
  (`:623`) ⇒ rigoureusement égal à `cards.length`. **0 appel.**

⇒ **Coût mesuré du dessin actuel : 2 appels** (`GET /v1/cue-stack/current`, `GET /v1/recruitment/quests`)
au repos ; **3** pendant une semaine de compression active (`GET /v1/compression/board`, qui **404**
dans tout autre état — `compression-board.repository.ts:53-59`, `state = 'active'`).

### Rafraîchissement des compteurs — mesuré, avec sa réserve

Deux des quatre signaux dessinés viennent d'un **POST**. Mesuré : `POST /v1/session/open` rappelé
rend le **même `session_id`** (`mesures/31-session-open-2.json`) et **recompose les glances à neuf**
(`session.service.ts:108-112` — le chemin idempotent rappelle `openSequence.build`), **sans** émettre
`SessionOpenedEvent` (l'émission est sur le chemin fresh-open seul, `:125`). C'est donc un
rafraîchissement utilisable. ⚠️ **Réserve mesurée** : au-delà de `session.stale_timeout_real_minutes`
(**défaut 240 min**, `core-loops-tunables.ts:517-521`) la session est close puis rouverte — l'événement
**est** alors émis et le contrôle d'engagement forcé de compression se déclenche. Rafraîchir Plus par
`session/open` n'est neutre **que sur session fraîche** ; à consigner.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `routine_pending_count` + `batch_confirm_available` (`GET /v1/flag-review`) | combien d'items de routine attendent une confirmation en masse (`POST /v1/flag-review/batch-confirm`) — **une seconde population, sur une AUTRE table** : `routine_items.status='pending'` (`flag-discipline.repository.ts:654`) vs `flagged_items.resolution='pending'` (`:640`) | **Utile ici.** Un joueur avec 0 signalement mais 17 routines à confirmer voit « 0 » aujourd'hui et n'ouvre pas la Revue — alors que la maquette de la Revue elle-même affiche les deux (`:241`, « Jour 12 · 3 signalements · 17 routines »). Coût : +1 appel. | ★★★ |
| Q2 | `compression_glance.week_state === 'warning'` + `compression/state.deferral_available` | la semaine de compression est **ouverte mais pas encore engagée** : le joueur peut la reporter (une seule fois) ou l'engager volontairement | **Utile ici.** C'est la seule fenêtre de décision avant que la semaine ne s'impose ; ne rien dessiner là revient à cacher la décision. Coût : 0 pour `week_state` (glance), +1 pour `deferral_available`. | ★★★ |
| Q3 | `quests[].session_ready` (`GET /v1/recruitment/quests`) | laquelle des quêtes ouvertes peut avancer **maintenant** | **Utile ici, coût NUL** (même corps). C'est la différence entre « 1 quête » et « 1 quête sur laquelle je peux agir ». Décision produit : le badge compte-t-il l'ouvert ou l'actionnable ? | ★★★ |
| Q4 | `settling_glance.settling_count` / `all_clear` (`session/open`) | combien de bâtiments « se tassent » et sont donc intouchables | **Utile mais sans destination.** Sa surface est `GET /v1/annealing/rolling-queue` (route joueur, `annealing.controller.ts:40`) et **aucune des 8 lignes de Plus n'y mène**. Coût NUL. Question préalable : faut-il une 9ᵉ destination ? | ★★☆ |
| Q5 | `GET /v1/autonomy-reports` (`autonomy-reports.controller.ts:40`) + le geste `POST …/issues/:issueId/resolve` (`:55`) | les rapports d'autonomie en attente d'arbitrage | **Destination potentiellement orpheline.** Elle est **maquettée dans le même fichier** (« La Boîte d'autonomie », `:966` commentaire de source, `:998` titre) et n'est **ni** dans les 8 destinations dessinées **ni** dans les 9 du canon. Soit elle a un autre point d'entrée, soit personne ne peut y arriver. | ★★★ (navigation, pas badge) |
| Q6 | `GET /v1/recruitment/candidates.candidates[]` | combien de candidats sont disponibles pour ouvrir une quête (mesuré : 4 après réappro) | **Utile ici.** Un joueur à 0 quête et 4 candidats voit « 0 » et n'apprend pas qu'il y a de quoi commencer — alors que la maquette du Recrutement affiche les deux (`:472`, « Jour 1 · 3 candidats · 1 quête »). Coût : +1 appel. | ★★☆ |
| Q7 | `city/precinct/:id/belief` ×6 (`police_memory.controller.ts:50`) | `DORMANT / WATCHFUL / SUSPICIOUS / **HUNTING**` — le seul signal franchement alarmant du jeu | **Utile.** La ligne Commissariats est aujourd'hui totalement muette. Un point d'alerte « ≥ 1 commissariat en HUNTING » coûte **6** appels (précincts 1..6), pas 18. À arbitrer contre le coût. | ★★☆ |
| Q8 | `friction_glance.penalty_active` / `friction_bucket` (`session/open`) | une pénalité d'efficacité est active sur l'organisation | **Utile, sans destination.** Sa surface est `GET /v1/friction/state` + `GET /v1/friction/replacement-options` (avec le geste `POST …/:id/pick`) — aucune ligne de Plus n'y mène. Coût NUL. | ★★☆ |
| Q9 | `structural_budget.cap_reached` / `used` (`session/open`) | le plafond de décisions structurelles de la session est atteint | **Pas ici.** C'est un état global qui refuse des gestes ailleurs — sa place est la TopBar, pas une ligne de navigation. Coût NUL. À trancher. | ★☆☆ |
| Q10 | `GET /v1/me` — `locale`, `handle`, `email`, `lifecycle_state` | la seule matière back des Réglages | **À consigner.** Il n'existe **aucune route d'écriture** sur `/me` : 0 `PUT`/`PATCH`/`POST` sur les 1017 routes (contrôle positif : `PUT me/meta-market/visibility` → 1). Réglages sera donc un écran **client-only** en lecture ; autant l'écrire maintenant que le découvrir au montage. | ★☆☆ |

---

## Lots back suggérés

| # | ce qui manque | table / colonne | dessiné ? | preuve |
|---|---|---|---|---|
| **L1** | **Compteur d'inspections agrégé** — le canon le dessine, aucune route ne le sert | `inspection_queues.length`, par `(player_id, district_id)` — `db/migrations/0005_city_state.sql:79`. **Projetée par aucune projection joueur** : la seule, `InspectionQueueProjection`, ne rend que des bandes (`inspection.projection.service.ts:59-70`) | canon oui (`screen_12:159`), maquette non (`:932`) | **forme F** : la donnée est en base, écrite par le tick, jamais projetée. Une clé `pending_inspections_count` sur `session/open` (précédent exact : `flag_review.pending_review_count`, « own-content list length », R2.2-légal) supprimerait **18 appels** et fermerait E5. |
| **L2** | **Glance « pile »** dans `session/open` | rien à ajouter en base : `cue_stacks.state` + `jsonb_array_length(slots)` | oui (`:930`) | `session/open` porte **5** blocs de glance et **aucun** pour le cue-stack (les 12 clés de premier niveau sont épinglées par `tests/e2e/onboarding/tutorial_overlay_session_open_non_regression.spec.ts:177-189`). Une clé `cue_stack_glance: {state, orderable_slot_count}` ferme **E1** *et* supprime 1 appel. |
| **L3** | **Glance « recrutement »** dans `session/open` | rien à ajouter en base : `recruitment_quests.outcome IS NULL` (`recruitment.repository.ts:200-208`) + `recruitment_candidates.status='available'` | oui (`:935`) | `{open_quest_count, ready_quest_count, available_candidate_count}` ferme **E2** et **Q6** et supprime 1 appel. |

⇒ **L1 + L2 + L3 rendraient l'écran Plus à ZÉRO appel propre** : tout viendrait du corps de
`session/open` que le shell reçoit déjà. C'est aussi le seul chemin qui rende le rafraîchissement
**cohérent** — un seul corps, un seul instant — au lieu de trois corps pris à trois moments.

**Balayage B⁻ (scopé aux 5 tables qui portent les 5 compteurs) — aucun autre hit** :
`cue_stacks.session_ref` / `executing_slot_index` / `executing_slot_started_minute` /
`last_executed_game_minute` (`db/schema/queues_exceptions_cuestack.ts:144-148`) sont **server-only par
conception** (R2.2) ; `compression_events.decisions_budget` (`0133_compression_week.sql:48`) n'est pas
projeté mais `decisions_remaining` en est la dérivée exposée (`compression-board.service.ts:136-137`)
— ce n'est pas un trou.

---

## Actions : routes ↔ CTA

Plus est un **écran de navigation pure** : le canon ne lui donne aucun geste autre que le tap
(`screen_12_more_menu.md:223`, « Tap simple sur item : push vers l'écran destination »). La maquette
est conforme — 8 lignes, 8 chevrons, aucun bouton, aucun `POST`.

| geste dessiné | route | statut |
|---|---|---|
| tap « La Pile du jour » (`:930`) | — (navigation) → screen_8 | ✔ |
| tap « La Revue du jour » (`:931`) | — → screen_11 | ✔ |
| tap « Les Inspections » (`:932`) | — → screen_10 | ✔ |
| tap « Les Commissariats » (`:933`) | — → screen_9 | ✔ |
| tap « Le Recrutement » (`:935`) | — → screen_15 | ✔ |
| tap « La Compression » (`:936`) | — → screen_13 | ✔ |
| tap « Réglages » (`:938`) | — → screen_14 | ✔ (mais 0 route d'écriture — Q10) |
| tap « Aide · À propos » (`:939`) | — (feuille modale) | ✔ |
| flèche de retour « ‹ » (`:927`, `:947`) | — | ⚠️ **question** : Plus est un ONGLET du dock ; une flèche de retour sur un onglet racine n'a pas de destination évidente. À ratifier. |

**Routes joueur du périmètre SANS aucune ligne dans Plus** — chacune est une question, pas un défaut :
elles peuvent avoir un autre point d'entrée que je n'ai pas cherché.

| route | geste associé | commentaire |
|---|---|---|
| `GET /v1/autonomy-reports` | `POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve` | maquettée dans le même fichier (`:966`, `:998`), absente des 8 destinations ET des 9 du canon — **Q5** |
| `GET /v1/annealing/rolling-queue` | — | destination naturelle de `settling_glance` — **Q4** |
| `GET /v1/friction/state`, `GET /v1/friction/replacement-options` | `POST /v1/friction/replacement-options/:id/pick`, `POST /v1/friction/nodes/:buildingId/decommission` | destination naturelle de `friction_glance` — **Q8** |
| `GET /v1/cue-stack/named-sequences` | `POST …`, `POST …/:id/apply` | maquettée (« Les Séquences », `:776`) ; **403 `NAMED_SEQUENCE_UNLOCK_REQUIRED` au palier 1** (`mesures/09-named-sequences.json`) — probablement une sous-destination de la Pile, **non vérifié** |
| `GET /v1/meta/complexity-budget`, `GET /v1/meta/capability-debts` | — | mesurées (`mesures/15-`, `16-`), aucune ligne nulle part sur cet écran |
| `POST /v1/compression/engage`, `POST /v1/compression/defer` | — | gestes de l'état `warning`, non dessiné — **E4** |

---

## Table de couverture complète

Mode maquette ⇒ deux colonnes (B, M). **Convention de fusion** : une liste compte pour **une**
information (son cardinal) ; ses feuilles d'élément sont regroupées sur une ligne et notées, parce
qu'elles appartiennent à l'écran **destination**, pas à un badge de navigation.
`● (déduit)` = clé lue à l'interface, route non exerçable sur compte frais (voir §Non vérifié).

### `POST /v1/session/open` — 12 clés de premier niveau, 33 feuilles

| # | clé | B | M | statut |
|---|---|---|---|---|
| B01 | `session_id` | ● | – | plomberie |
| B02 | `hl_card` | ● | – | appartient à screen_1 |
| B03 | `queue[]` cardinal (13 feuilles d'élément) | ● | – | appartient à screen_5 |
| B04 | `backlog_badge` | ● | – | ● – – question (faible) |
| B05 | `queue_pressure_band` (`normal\|warning\|saturated`) | ● | – | ● – – question (faible) |
| B06 | `structural_budget.used` | ● | – | ● – – **Q9** |
| B07 | `structural_budget.cap_reached` | ● | – | ● – – **Q9** |
| B08 | `flag_review.pending_review_count` | ● | ● MD3 | **✔ affichée comme dessinée** |
| B09 | `flag_review.auto_open` | ● | – | ● – – question (comportement de shell) |
| B10 | `settling_glance.settling_count` | ● | – | ● – – **Q4** |
| B11 | `settling_glance.all_clear` | ● | – | ● – – **Q4** |
| B12 | `friction_glance.friction_bucket` | ● | – | ● – – **Q8** |
| B13 | `friction_glance.penalty_active` | ● | – | ● – – **Q8** |
| B14 | `compression_glance.stress_bucket` | ● | ● MD6 | **✔** — 2 valeurs sur 4 dessinées (**E4**) |
| B15 | `compression_glance.week_state` | ● | ● MD6 / MD8 | **✔** — 2 valeurs sur 3 dessinées (**E4**) |
| B16 | `compression_glance.forced` | ● | – | ● – – question (« la semaine s'est imposée ») |
| B17 | `onboarding.funnel_step` | ● | – | hors périmètre |
| B18 | `onboarding.first_decision_recorded` | ● | – | hors périmètre |
| B19 | `opened_game_day` | ● | ● MD1 | **✔** — réserve : jour d'OUVERTURE, pas jour courant (§Non vérifié n°6) |

### `GET /v1/cue-stack/current` — 4 clés, 14 feuilles

| # | clé | B | M | statut |
|---|---|---|---|---|
| B20 | `cue_stack_id` | ● | – | plomberie |
| B21 | `state` (`pending\|committed\|executing\|resolved`) | ● | – | **DÉFAUT E1** — c'est la clé que MD2 aurait dû lire |
| B22 | `committed_at` | ● | – | ● – – question (faible) |
| B23 | `slots[]` cardinal (10 feuilles d'élément) | ● | ● MD2 | **✔** pour le cardinal |
| B24 | `slots[].status` (6 valeurs) | ● | ● MD2 (filtre) | **DÉFAUT E1** — mauvaise grandeur |

### `GET /v1/flag-review` — 3 clés

| # | clé | B | M | statut |
|---|---|---|---|---|
| B25 | `cards[]` cardinal (6 feuilles d'élément) | ● | ● via B08 | ✔ (redondant — prédicat identique à B08) |
| B26 | `routine_pending_count` | ● | – | ● – – **Q1** |
| B27 | `batch_confirm_available` | ● | – | ● – – **Q1** |

### `GET /v1/recruitment/quests?status=active` — 1 clé, 11 feuilles

| # | clé | B | M | statut |
|---|---|---|---|---|
| B28 | `quests[]` cardinal | ● | ● MD5 | **✔** |
| B29 | `quests[].session_ready` | ● | – | ● – – **E2 / Q3** |
| B30 | `quests[].next_session_ready_at_game_minute` | ● | – | ● – – question |
| B31 | `quests[]` autres feuilles — `quest_id`, `pool`, `candidate_id`, `current_step`, `steps_total`, `final_gated_step`, `sessions_consumed`, `decisions[]`, `outcome` | ● | – | appartient à screen_15 |

### `GET /v1/compression/state` — 3 clés (2 fusionnées avec B14/B15)

| # | clé | B | M | statut |
|---|---|---|---|---|
| B34 | `deferral_available` | ● | – | ● – – **Q2 / E4** |

### `GET /v1/compression/board` — 3 clés (DÉDUITES : 404 sur compte frais)

| # | clé | B | M | statut |
|---|---|---|---|---|
| B35 | `entries[]` cardinal (5 feuilles d'élément) | ● (déduit) | – | ● – – question : « N problèmes » est une alternative à « N décisions » |
| B36 | `decisions_used` | ● (déduit) | – | ● – – question |
| B37 | `decisions_remaining` | ● (déduit) | ● MD7 | **✔ (jamais observée en vie)** — et c'est le SEUL appel supplémentaire de l'écran |

### `GET /v1/city/district/:id/inspection` ×18 — 5 clés (DÉDUITES : 404)

| # | clé | B | M | statut |
|---|---|---|---|---|
| B38 | `district` | ● (déduit) | – | plomberie |
| B39 | `queue_load` (`EMPTY\|LIGHT\|MODERATE\|HEAVY\|SATURATED`) | ● (déduit) | ● MD4 (« sans compteur ») | **apparié à un énoncé d'ABSENCE** — voir **E5** / **L1** |
| B40 | `dispatcher_regime` (`NOMINAL\|BACKLOGGED\|BUDGET_CUT\|SURGE`) | ● (déduit) | – | ● – – question (faible : 18 appels) |
| B41 | `severity_distribution` (Record de 4 bandes) | ● (déduit) | – | appartient à screen_10 |
| B42 | `type_distribution` (Record de 6 bandes) | ● (déduit) | – | appartient à screen_10 |

### `GET /v1/city/precinct/:id/patrol` et `…/belief` ×6 — 4 clés (DÉDUITES : 404)

| # | clé | B | M | statut |
|---|---|---|---|---|
| B43 | `patrol.precinct` | ● (déduit) | – | plomberie |
| B44 | `patrol.patrol_heat` (`QUIET\|LOW\|MEDIUM\|HIGH`) | ● (déduit) | – | ● – – question |
| B45 | `belief.precinct` | ● (déduit) | – | plomberie |
| B46 | `belief.belief` (`DORMANT\|WATCHFUL\|SUSPICIOUS\|HUNTING`) | ● (déduit) | – | ● – – **Q7** |

### `GET /v1/me` — 5 clés · `GET /v1/i18n/bundle` — 2 clés

| # | clé | B | M | statut |
|---|---|---|---|---|
| B47 | `me.account_id` | ● | – | plomberie |
| B48 | `me.handle` | ● | – | ● – – **Q10** (Réglages) |
| B49 | `me.email` | ● | – | ● – – **Q10** |
| B50 | `me.lifecycle_state` | ● | – | ● – – **Q10** |
| B51 | `me.locale` | ● | – | ● – – **Q10** |
| B52 | `i18n.locale` | ● | – | plomberie |
| B53 | `i18n.messages` | ● | ● (tous les libellés de l'écran) | ✔ |

### Contrôle d'arithmétique

- **`|clés B|`** = 19 (`session/open`) + 5 (`cue-stack/current`) + 3 (`flag-review`) + 4 (`quests`)
  + 1 (`compression/state`, après fusion de `stress_bucket`/`week_state` dans B14/B15) + 3 (`board`)
  + 5 (`inspection`) + 4 (`precinct` patrol+belief) + 5 (`me`) + 2 (`i18n`) = **51**
- **`|éléments M porteurs de données non appariés|`** = **0** — les 8 informations dessinées
  (MD1…MD8, annexe 4) s'apparient toutes à une clé B. Les **15** autres éléments de la maquette sont
  des libellés ou des affordances de structure (titre d'écran, 3 titres de section, 8 noms de
  destination, la flèche de retour, les 8 chevrons comptés comme un) — hors couverture données,
  listés en annexe 4.
- **`|rendus F sans source|`** = **0** (mode maquette, pas de front)
- **somme = 51 + 0 + 0 = 51 lignes** — la table ci-dessus en compte 51 (19+5+3+4+1+3+5+4+7). ✔

---

## Annexes

### 1. Routes du périmètre — compte et ancres

Oracle indépendant du terminal : `scratchpad/routes.py` parse les **144** `*.controller.ts` de
`services/game-back/src` et produit `routes.json`. **1017** décorateurs de route au total (le compte
recoupe celui du socle `CLAUDE.md`, « 1 017 routes réelles »), dont **680** `_test` et **164** sous
`@UseGuards(JwtAuthGuard)`. Contrôle positif du filtre de chemin : `me/reputation` → 1 route trouvée.

**Le domaine « Plus » n'a AUCUN module ni AUCUNE route à lui** — confirmé : les 8 destinations tirent
toutes d'ailleurs.

| destination | route(s) joueur | ancre | mesuré |
|---|---|---|---|
| La Pile du jour | `GET /v1/cue-stack/current` | `core_loops/cue_stack/cue-stack.controller.ts:55` | ✔ **peuplé** (5 slots réels) |
| — gestes | `POST cue-stack/compose` · `reorder` · `commit` | `:68` · `:80` · `:94` | ✔ les 3 exercés |
| La Revue du jour | `GET /v1/flag-review` | `core_loops/flag_discipline/flag-discipline.controller.ts:69` | ✔ (`cards` vide) |
| — gestes | `POST flag-review/:flagId/validate` · `dismiss` · `POST flag-review/batch-confirm` | `:51` · `:60` · `:78` | non exercés |
| Les Inspections | `GET /v1/city/district/:id/inspection` (1..18) | `citysim/inspection/inspection.controller.ts:75` | 404 (city sim non tickée) |
| — geste | `POST /v1/city/inspection/report` | `:115` | non exercé |
| Les Commissariats | `GET /v1/city/precinct/:id/patrol` (1..6) | `citysim/patrol/patrol.controller.ts:51` | 404 |
| | `GET /v1/city/precinct/:id/belief` (1..6) | `citysim/police_memory/police_memory.controller.ts:50` | 404 |
| Le Recrutement | `GET /v1/recruitment/quests` (défaut `active`) · `GET /v1/recruitment/candidates` · `GET /v1/recruitment/quests/:id` | `operational/recruitment/recruitment.controller.ts:73` · `:62` · `:85` | ✔ **peuplé** (1 quête réelle, 4 candidats) |
| — gestes | `POST recruitment/quests` · `…/:id/advance` · `hire` · `abandon` | `:96` · `:115` · `:137` · `:159` | `POST quests` exercé |
| La Compression | `GET /v1/compression/state` | `core_loops/compression/compression-projection.controller.ts:37` | ✔ |
| | `GET /v1/compression/board` | `core_loops/compression/compression-board.controller.ts:55` | **404** (aucun cycle) |
| — gestes | `POST compression/engage` · `POST compression/board/problems/:id/decide` · `POST compression/defer` | `:44` · `:63` · `core_loops/compression/compression.controller.ts:39` | non exercés |
| Réglages | `GET /v1/me` — **lecture seule, 0 route d'écriture** | `auth/auth.controller.ts:343` | ✔ |
| Aide · À propos | `GET /v1/i18n/bundle` (non gardée) | `i18n/i18n.controller.ts:32` | ✔ |
| en-tête « Jour N » | `POST /v1/session/open` | `session/session.controller.ts:56` | ✔ |

**Balayages complémentaires**, au-delà des modules nommés par le dossier :
`settings|preferences|reglage` → **0** route ; `privacy|gdpr|consent|export|erasure` → **3**, toutes
`_test` ; `clock|game_day` → **6**, toutes `_test` ; les **5** endpoints `…/summary` que le canon
appelle (`me/cue-stack/summary`, `me/flags/summary`, `me/inspection-queue/summary`,
`me/recruitment/summary`, `me/compression-week/state`) → **0** chacun.

### 2. Corps réels — `mesures/` + `mesures/commandes.md`

34 fichiers JSON, tous validés par `json.load` (contrôle : 34 lus, 0 invalide). Compte **frais** `jd-plus-1787685599`,
`player_id 01a03a5d-787e-7478-9b74-36bd8a7ed268`. Le compte de démo `operational_demo@example.test`
n'a **jamais** été touché ; aucun conteneur monté ni redémarré. Toutes les mesures par
`/usr/bin/curl -o <fichier>` — le `curl` nu est proxifié et sa sortie, **même redirigée par `>`**,
peut être remplacée par un résumé de schéma.

**Dimensionnement.** Sur compte frais toutes les listes sont vides. Deux ont été peuplées :

- **la Pile, par des actions JOUEUR seules** — `POST /v1/cue-stack/compose` (5 slots
  `MAINTENANCE_BATCH` ciblant les 4 bâtiments que `GET /v1/annealing/rolling-queue.touchable` rend au
  kit de départ) → `commit` → `reorder`. C'est ce qui a produit **E1** ;
- **le Recrutement, par un seam `_test` DÉCLARÉ** — `POST /v1/_test/recruitment/replenish-saltline`
  (aucun chemin joueur ne crée de candidat sur compte frais), suivi d'une **action joueur réelle**
  `POST /v1/recruitment/quests` → 201. C'est ce qui a produit **E2**.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | source de la contrainte |
|---|---|---|
| `cue-stack.state` | `pending \| committed \| executing \| resolved` | `pgEnum('cue_stack_state')`, `db/schema/queues_exceptions_cuestack.ts:24-29` |
| `cue-stack.slots[].status` | `pending \| executing \| done \| failed_collision \| failed_disrupted \| failed_executor` | union TS `CueStackSlotStatus`, `core_loops/cue_stack/slot-type-executor.interface.ts:54-60` |
| `cue-stack.slots[]` cardinal | **0, ou 4..8** | `CHECK (jsonb_array_length(slots) = 0 OR … BETWEEN 4 AND 8)`, `db/migrations/0007_queues_exceptions_cuestack.sql:67-68` ⇒ le compteur de la Pile ne vaudra **jamais** 1, 2 ni 3 |
| `slots[].slot_type` | 4 LIVE (`DISTRIBUTION_RUN`, `MAINTENANCE_BATCH`, `RECRUITMENT_STEP`, `EXCEPTION_BATCH_RESOLUTION`) + 3 RESERVED refusés en 422 | `core_loops/cue_stack/slot-type.catalogue.ts:17-32` |
| `slots[].estimated_time_bucket` | `VERY_QUICK \| QUICK \| MODERATE \| LONG \| VERY_LONG` | `core_loops/cue_stack/estimated-time-bucket.ts:38` |
| `slots[].prerequisite_satisfaction_bucket` | `SATISFIED \| PENDING \| UNSATISFIED` | `core_loops/cue_stack/slot-dependency-bucket.ts:46` |
| `slots[].dependency_conflict_bucket` | `NONE \| WARN \| BLOCKING` | `core_loops/cue_stack/slot-dependency-bucket.ts:47` |
| `week_state` (glance et `/compression/state`) | `none \| warning \| active` | `CHECK ("compression_week_state" IN ('none','warning','active'))`, `db/migrations/0002_player_progression_state.sql:18-19` |
| `stress_bucket` | `calm \| mounting \| crushing \| compression_active` — `compression_active` **gagne inconditionnellement** dès `week_state='active'` | `core_loops/compression/stress-bucket.ts:28` + `:36-41` |
| `flag_review.pending_review_count` | entier ≥ 0 — `COUNT(flagged_items WHERE player_id=$1 AND resolution='pending')` | `core_loops/flag_discipline/flag-discipline.repository.ts:640` (prédicat identique à `:623`) |
| `flag-review.routine_pending_count` | entier ≥ 0 — `COUNT(routine_items WHERE player_id=$1 AND status='pending')` : **autre table, autre colonne** | `:654` |
| `flag-review.cards[].trust_budget_bucket` | `low \| standard \| high` | `core_loops/flag_discipline/convergence.ts:39` |
| `quests[]` (status `active`) | `outcome IS NULL` | `operational/recruitment/recruitment.repository.ts:200-208` |
| `quests[].session_ready` | booléen **live** — « le prochain `advance` passerait-il MAINTENANT » : `outcome === null && hasMoreGatedSteps && now - lastAdvance >= sessionMinutes` | `operational/recruitment/recruitment-quest.service.ts:682-683` |
| `board.decisions_remaining` | `decisions_budget - decisions_used` ; `decisions_budget` est **figé à l'ouverture du cycle** et n'est **jamais** projeté | `core_loops/compression/compression-board.service.ts:136-137` ; `db/migrations/0133_compression_week.sql:48` |
| `deferral_available` | vrai **seulement** si le cycle est `state='open'`, `deferral_count=0` et `org_stress <` seuil de forçage | `core_loops/compression/compression-week.repository.ts:315` |
| `inspection.queue_load` | `EMPTY \| LIGHT \| MODERATE \| HEAVY \| SATURATED` | `citysim/inspection/inspection.projection.service.ts:42` |
| `inspection.dispatcher_regime` | `NOMINAL \| BACKLOGGED \| BUDGET_CUT \| SURGE` | `citysim/inspection/inspection.service.ts:93` |
| `inspection.*_distribution` | `NONE \| SOME \| MANY \| PREDOMINANT`, sur 4 sévérités et 6 sources | `citysim/inspection/inspection.projection.service.ts:52` ; `inspection.repository.ts:45,56` |
| `patrol_heat` | `QUIET \| LOW \| MEDIUM \| HIGH` | `citysim/patrol/patrol.projection.service.ts:32` |
| `belief` | `DORMANT \| WATCHFUL \| SUSPICIOUS \| HUNTING` | `citysim/police_memory/police_memory.projection.service.ts:30` |
| `friction_bucket` | `light \| balanced \| strained \| overloaded` | `core_loops/demolition/friction-budget-bucket.ts:34` |
| `queue_pressure_band` | `normal \| warning \| saturated` | `exceptions/exceptions.projection.service.ts:132` |
| `me.lifecycle_state` | mesuré `ACTIVE` — domaine non relu (hors périmètre) | — |
| `account_kind` du jeton | tout ≠ `PLAYER` ⇒ **403 `AUTHZ_PERMISSION_DENIED`** sur toute route joueur | `auth/jwt-auth.guard.ts:123-127` |

### 4. Inventaire M — `ecrans-brennar-2.html`, cadres index 22 (l.923-940) et 23 (l.943-960)

Numéros vérifiés par oracle Python (voir la note de méthode en tête).

**Informations (8)** — chacune appariée à une clé B :

| id | élément (ligne) | texte mesuré | représente | clé B |
|---|---|---|---|---|
| MD1 | `.tete .sous` (`:927`, `:947`) | « Jour 26 » / « Jour 31 » | le jour de jeu | B19 |
| MD2 | `.dest` Pile : `small` + `.n` (`:930`, `:950`) | « 5 créneaux à ordonner » + `5` / « aucune pile » + `0` | créneaux ordonnançables | B23 + B24 (**devrait être B21** — E1) |
| MD3 | `.dest` Revue : `small` + `.n` (`:931`, `:951`) | « 3 signalements à trancher » + `3` / « rien à signaler » + `0` | signalements en attente de verdict | B08 |
| MD4 | `.dest` Inspections : `small` (`:932`, `:952`) | « par district — sans compteur » | l'absence assumée d'un compteur | B39 (énoncé d'absence) |
| MD5 | `.dest` Recrutement : `small` + `.n` (`:935`, `:955`) | « 1 quête en cours » + `1` / « aucune quête » + `0` | quêtes ouvertes | B28 |
| MD6 | `.dest` Compression : `small` (`:936`) | « tension calme · aucune semaine » | tension + phase de la semaine | B14 + B15 |
| MD7 | `.dest` Compression : `small` (`:956`) | « 3 décisions restantes » | décisions restantes du tableau | B37 |
| MD8 | `.dest.alerte` + `.chip.actif` (`:956`) | « En cours » + bordure et nom en braise | la semaine est engagée | B15 (`= 'active'`) |

**Structure et affordances (15) — hors couverture données** : `h3` « Plus » (`:927`) · `.sous`
« tout le reste » (`:927`) · `.retour` « ‹ » (`:927`) · 3 `.section-t` « Opérations » /
« Organisation » / « Système » (`:929`, `:934`, `:937`) · 8 `.dest .nom` (« La Pile du jour »,
« La Revue du jour », « Les Inspections », « Les Commissariats », « Le Recrutement »,
« La Compression », « Réglages », « Aide · À propos », l.930-939) · les 8 `.fleche` « › »
(comptées comme une).

**Valeur codée en dur repérée : aucune.** Les 3 compteurs, les 5 sous-lignes de données et la
puce d'état sont tous adossés à une clé mesurée ou déduite d'une interface. (Le « 3 » de MD7 vient
de `decisions_remaining` — jamais observé en vie, §6 n°2.)

**Ordre et sectionnement** : identiques au canon (`screen_12_more_menu.md:155-179`), Backoffice
retiré — et E6 montre que c'est le seul rendu correct.

### 5. Inventaire F

Sans objet — mode maquette, le front n'existe pas.

### 6. Ce que je n'ai pas pu vérifier

1. **`GET /v1/flag-review.cards[]` jamais observé peuplé.** Aucun flag n'existe sur compte frais ; la
   chaîne demande un `routine_item` **et** un lieutenant, et le seul seam
   (`POST /v1/_test/core-loops/force-flag`, `core_loops/core-loops-test.controller.ts:670`) exige un
   `routineItemId` qu'aucune route joueur ne crée sur compte frais. L'égalité
   `pending_review_count == cards.length` est prouvée **à la source** — prédicats SQL identiques,
   `flag-discipline.repository.ts:623` et `:640` — **pas en vie**. Mesure qui trancherait : créer un
   routine_item, `force-flag`, puis comparer les deux corps.
2. **`GET /v1/compression/board` : 404 sur compte frais** (`mesures/07-compression-board.json`, aucun
   cycle ouvert). Ses 3 clés et `BoardEntryView` sont **DÉDUITES** de l'interface
   (`compression-board.service.ts:44-56`). ⇒ **MD7 (« 3 décisions restantes ») n'a jamais été vue en
   vie.** Mesure qui trancherait : faire monter `org_stress` au-delà de
   `compressionStressThresholdTrigger` (défaut 85), puis `POST /v1/compression/engage`.
3. **Les états `week_state='warning'`, `stress_bucket ∈ {mounting, crushing}` et `forced=true` n'ont
   pas été observés** — le compte frais est à `calm / none / false`. Même mesure que (2).
4. **`GET /v1/city/district/:id/inspection` et `…/precinct/:id/{patrol,belief}` : 404** (« la city sim
   n'a pas tické le dispatch 12 h »). Leurs clés sont **DÉDUITES** des interfaces. Mesure qui
   trancherait : un tick de city sim — les 6 routes d'horloge sont toutes `_test`.
5. **Le seuil « 99+ » du canon** (`T.ui.more_menu.badge_count_max_display`, `screen_12:192`) : je n'ai
   trouvé aucun tunable back de ce nom, **mais je n'ai pas balayé le registre de tunables UI** — je ne
   conclus donc pas « il n'existe pas ». Note utile quand même : la Pile est bornée à **8** par
   `cs_slots_length_chk`, elle n'atteindra jamais un seuil à deux chiffres.
6. **« Jour N » : je n'ai pas pu vérifier qu'il reste juste.** `opened_game_day` est le jour de
   l'**ouverture** de la session (`session-open-sequence.service.ts:241-245` : « la MÊME valeur que
   `openedGameDay` reçu en argument par `build()`, jamais recalculée ni re-lue »). Aucune route joueur
   ne rend l'horloge. Sur une session pouvant durer jusqu'à **240 min**
   (`core-loops-tunables.ts:517-521`), l'en-tête peut afficher un jour périmé. Mesure qui trancherait :
   avancer l'horloge par le seam `_test` puis comparer un `session/open` idempotent au jour réel.
7. **Le rendu PNG (`Tools/juge-visuel/plus/ecran-canon.png`, `ecran-compression-active.png`) n'a pas
   été confronté au HTML.** J'ai jugé la **source** HTML/CSS ; si le PNG diverge du HTML, mon
   inventaire M porte sur le HTML. C'est le juge visuel qui tranche cette paire, pas moi.
8. **Je n'ai pas cherché le point d'entrée de « Les Séquences » ni de « La Boîte d'autonomie ».** Je
   constate seulement qu'aucune des 8 destinations dessinées n'y mène et que le canon de screen_12 ne
   les nomme pas.
9. **Le balayage B⁻ est SCOPÉ** aux 5 tables qui portent les 5 compteurs (`cue_stacks`,
   `flagged_items` / `routine_items`, `recruitment_quests`, `compression_events`, `inspection_queues`).
   Je n'ai **pas** balayé l'ensemble du schéma : un B⁻ hors de ces 5 tables m'aurait échappé.
10. **Les hits de mon balayage de routes sont COMPTÉS et CLASSÉS pour les 12 routes du périmètre**
    (chacune ouverte et lue), mais les 1017 décorateurs n'ont été **classés** que par
    fichier/garde/`_test` — pas ouverts un à un. Une route joueur d'un module dont le nom ne contient
    aucun des mots que j'ai balayés (`cue_stack`, `flag`, `recruitment`, `compression`, `inspection`,
    `precinct`, `enforcement`, `settings`, `privacy`, `me/`, `annealing`, `friction`, `autonomy`,
    `clock`, `telemetry`, `progression`) aurait pu m'échapper.
