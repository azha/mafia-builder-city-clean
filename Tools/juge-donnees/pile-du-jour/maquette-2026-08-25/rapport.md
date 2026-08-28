# Juge données ⊥ — La Pile du jour (screen_8 « Cue Stack ») — mode MAQUETTE — 2026-08-25

## En une phrase

Les quatre cadres montrent **18 des 31 informations** que la surface joueur du domaine rend
réellement ; **13 défauts** (dont deux qui rendent la maquette *fausse* et non pas *incomplète* :
un rang qui n'est pas celui qu'exécute le back, et une bande de temps qui n'apporte aucune
information) et **13 questions « passé à côté ? »**, dont la plus lourde — ce que chaque créneau a
*réellement fait* — est annoncée par l'annexe et dessinée nulle part.

---

## Défauts / écarts à consigner

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **D1** | **le RANG d'un créneau : `drag_order` projeté ≠ ordre d'exécution** | ● | ● | **DÉFAUT back (le plus grave)** | `cue-stack-execution-tick.service.ts:149-150` `const slotIndex = row.executing_slot_index ?? 0; const slot = slots[slotIndex];` — l'exécuteur parcourt la **position de tableau**. Balayage des lecteurs de `drag_order` : **12 occurrences, 0 dans le tick** (contrôle positif : le motif camelCase `dragOrder` rend 2 hits, donc le balayage ne rate pas la forme dérivée). Les deux bandes de dépendance sont pourtant dérivées de `drag_order` (`slot-dependency-bucket.ts:94` `dep.drag_order > slot.drag_order`). **Faux positif mesuré de bout en bout** : la pile engagée porte un créneau `DISTRIBUTION_RUN` classé `UNSATISFIED/BLOCKING` (`mesures/21-current-apres-commit.json`, drag_order 1, dépendance de drag_order 3) — il finit **`done`** (`mesures/27-tick-3.json`), parce que sa dépendance occupe la position **0** du tableau et a donc tiré la première. ⇒ la pastille `.ordre` (M6), le « après le 1 » (M9) et le « ⚠ ordre risqué » (M12) n'ont pas de rang faisant autorité à afficher. |
| **D2** | `estimated_time_bucket` : 2 libellés faux, et la bande n'informe pas | ● | ● | **DÉFAUT** | Bande = **fonction pure du `slot_type`** (`cue-stack.service.ts:348` → `durationMinutesFor(s.slot_type)`), donc redondante avec le nom déjà affiché. Valeurs livrées (`core-loops-tunables.ts:824-846`) 15/20/25/10 min, cutpoints `estimated-time-bucket.ts:40-43` (<20 → `VERY_QUICK`, <35 → `QUICK`) ⇒ **2 valeurs atteignables sur 5**. Mesuré : `DISTRIBUTION_RUN` → `VERY_QUICK`, la maquette écrit « **moyen** » (= `MODERATE`, inatteignable) ; `EXCEPTION_BATCH_RESOLUTION` (10 min) → `VERY_QUICK`, la maquette écrit « **rapide** ». Mesure : `mesures/15-compose-mixte.json`. |
| **D3** | chip « en cours » sur un créneau (M22) | – | ● | **DÉFAUT (dessiné sans source)** | `'executing'` est déclaré membre de `CueStackSlotStatus` (`slot-type-executor.interface.ts:56`) et **jamais écrit** : les seules écritures de statut de créneau sont `done`/`failed_collision`/`failed_executor` (`cue-stack-execution.repository.ts:160`) et `failed_disrupted` (`:220`). Balayage `'executing'` dans le module : 15 hits, **tous sur `state` (niveau pile)**. Confirmé par 9 ticks et 4 lectures : `mesures/28|33|34-current-*.json` — aucun créneau n'a jamais porté `executing`. **Et aucune clé ne dit quel créneau est en cours** : `executing_slot_index` est server-only (absent de `CueStackView`, `cue-stack.service.ts:80-85`). |
| **D4** | l'étape de confirmation de l'engagement | ● | – | **DÉFAUT (disponible, décisif, non dessiné)** | `POST /v1/cue-stack/commit` **échoue en 409 `SETTLING_COMPOUND_REQUIRED`** dès qu'un bâtiment visé est en train de se stabiliser, et exige un renvoi avec `acknowledge_compounding: true` (`cue-stack.controller.ts:97-99`, `cue-stack.service.ts:152-168`). Mesuré : `mesures/19-commit-sans-ack.json` (409, `details.settling[]` = 2 bâtiments + `band: "medium"`), puis `mesures/20-commit-ack.json` (200). La maquette n'a qu'un CTA à un temps (« appui long ») et ne dessine ni le refus, ni la liste, ni les bandes. |
| **D5** | « enregistrée le **jour 19** » (M36) | ● | ● | **DÉFAUT (conversion sans source)** | `created_at` est un horodatage **mur** ISO — mesuré `"2026-08-25T19:17:28.069Z"` (`mesures/41-named-seq-save.json`). Aucune clé de la réponse ne porte de jour de jeu, et `opened_game_day` (session/open) ne permet pas de rétro-convertir un horodatage passé. |
| **D6** | « la pile **du jour** », « le prochain jour en ouvre une autre » (M30) | – | ● | **DÉFAUT (règle dessinée que le back n'a pas)** | Rien ne lie une pile à un jour : la contrainte est « au plus **une** pile non-terminale par joueur » (`queues_exceptions_cuestack.ts:157-159`, index partiel `state IN ('pending','committed','executing')`). Mesuré : pile résolue → recompose **immédiate** acceptée le même jour (`mesures/39-current-resolue.json` puis `mesures/40-compose3.json`, 200). |
| **D7** | la pile terminée n'est lisible par aucune route | ● | ● | **DÉFAUT** | `findCurrent` filtre `state IN ('pending','committed','executing')` (`cue-stack.repository.ts:334`) — `'resolved'` exclu ; **0 route joueur ne lit une pile résolue** (balayage `'resolved'` dans le repository : 0 hit en filtre, contrôle positif 5 hits du mot dans le fichier). Mesuré : après le dernier tick, `GET current` rend `{cue_stack_id:null,…}` (`mesures/39-current-resolue.json`) — c'est-à-dire **le cadre 20**. ⇒ le cadre 21 s'évapore à la seconde où la pile finit ; le joueur ne voit jamais le bilan de ce qu'il a engagé. |
| **D8** | « supprimez-en une » sans route de suppression | ● | – | **DÉFAUT back** | `NAMED_SEQUENCE_CAP_REACHED` dit verbatim « *delete one before saving another* » (`named-sequence.service.ts:111`) et il y a **0 `@Delete` dans tout le module `cue_stack`** (contrôle positif : le même motif rend **1** sur `route.controller.ts`). |
| **D9** | `POST …/named-sequences/:id/apply` sur id non-UUID | ● | – | **DÉFAUT back (500)** | Mesuré `mesures/46-apply-nonuuid.json` : **HTTP 500 `INTERNAL_ERROR`** là où `mesures/45-apply-404.json` (UUID inconnu) rend proprement 404. Pas de `ParseUUIDPipe` sur `named-sequence.controller.ts:71-74`. C'est la convention du lot 0. |
| **D10** | tous les libellés FR du domaine | – | ● | **ASSUMÉ confirmé — résolveur client à écrire** | `GET /v1/i18n/bundle` mesuré (`mesures/47-i18n-bundle.json`) : **67 messages, `locale: "en"`**, dont **8** pour ce domaine et **toutes des clés d'ERREUR** (`error.cue_stack.*` ×5, `error.named_sequence.*` ×3). **0 libellé** pour `slot_type`, `estimated_time_bucket`, `prerequisite_satisfaction_bucket`, `dependency_conflict_bucket`, `status`, `outcome.status`. |
| **D11** | « de quatre à huit créneaux » (M18) | – | ● | **ASSUMÉ à consigner / lot back** | La borne existe deux fois côté serveur — `CHECK (jsonb_array_length(slots)=0 OR BETWEEN 4 AND 8)` (`0007_queues_exceptions_cuestack.sql:67-68`) et `cueStackDepthSlotsMax` (défaut 8, plage **4..8**, `core-loops-tunables.ts:806-810`) — et **n'est projetée dans aucune réponse**. Le front la codera en dur ; le jour où le tunable bouge, la maquette ment. |
| **D12** | `outcome.status` disponible, jamais dessiné | ● | – | **DÉFAUT (le « fait » vert ment)** | Mesuré : un créneau `status: "done"` peut porter `outcome: {"status": "noop_empty_source"}` — la tournée a bien tourné et **n'a rien transporté** (`mesures/27-tick-3.json` + dump base annexe 3). La maquette ne dessine que `status` ⇒ « fait », vert, barré. |
| **D13** | « Composer une pile · entretien · tournée · exceptions · recrutement » (M19) | ● | ● | **DÉFAUT de dimensionnement** | Sur compte **frais**, mesuré : `GET /v1/operational/routes` → `{"routes":[]}` · `GET /v1/recruitment/candidates` → `{"candidates":[]}` · la seule carte d'exception présente ne porte pas d'`effect.target_building_id` (session/open, `mesures/02`). ⇒ **3 des 4 types annoncés n'ont aucune cible composable au premier jour** ; seul `MAINTENANCE_BATCH` (4 bâtiments du kit) l'est. |

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `slots[].outcome.status` (`GET /v1/cue-stack/current`) | ce que le créneau a **réellement** produit : `scheduled`, `quest_started`, `noop_empty_source` (mesurés) · `dispatched`, `batch_resolved` (lus dans le code) | **Utile ici, et probablement obligatoire** : sans lui « fait » est un mensonge dans au moins un cas mesuré (une tournée à vide). C'est la seule clé qui distingue « ça a marché » de « ça s'est exécuté » | ★★★★★ |
| 2 | la carte de rattrapage `CUE_CASCADE` (`GET /v1/exceptions/queue`) | chaque créneau raté produit une carte portant `slot_id`, `slot_type`, `target_ref_kind/id` et l'affordance « *recommit a matching slot to recover it, at a time penalty* » (×1,5, `cueStackRecoveryCostMultiplier`) | **Utile ici** : la maquette dessine le drame (« raté — collision ») et pas sa suite. Une ligne « ça repart, et ça coûtera plus cher » ferme la boucle | ★★★★★ |
| 3 | `settling[].band` + `initiating_change_type` (`GET /v1/annealing/rolling-queue`) | pourquoi un bâtiment est intouchable et pour combien de temps encore (`medium`, `ROUTE_CREATED` — mesurés) | **Utile ici** : c'est exactement le contenu que réclame le refus D4, et c'est ce qui explique un `failed_executor` que le joueur subit sans comprendre | ★★★★☆ |
| 4 | `touchable[]` (même route) | la liste des bâtiments qu'on peut viser **maintenant** | **Utile ici** : c'est le contenu du composeur, l'écran que la maquette déclare elle-même ne pas dessiner | ★★★★☆ |
| 5 | `progress_to_next` (`GET /v1/progression`, et dans le corps du 403) | `LOCKED` / `IN_PROGRESS` / `UNLOCKED` | **Utile ici** : le verrou dit « dès le palier 2 », il pourrait dire « vous y êtes presque ». Mesuré à `LOCKED` sur compte frais | ★★★☆☆ |
| 6 | les 8 codes d'erreur métier | `CUE_STACK_DEPENDENCY_CYCLE`, `SLOT_TYPE_RESERVED`, `CUE_STACK_SLOT_TARGET_INVALID`, `CUE_STACK_ALREADY_ACTIVE`, `RESOURCE_STATE_CONFLICT`, `NAMED_SEQUENCE_*` ×3 | **Utile au composeur, pas à ces 4 cadres** : aucun état d'échec n'est dessiné (cible disparue, cycle, type réservé) | ★★★☆☆ |
| 7 | `sequences[].slots` (contenu du gabarit) | ce qu'une séquence enregistrée contient vraiment (types, cibles, dépendances, rangs) | **Utile** : « 5 créneaux » ne permet pas de choisir entre deux séquences. Un dépliage ou 5 pastilles de type | ★★★☆☆ |
| 8 | `lieutenants_settling[]` (rolling-queue) | les lieutenants en cours de stabilisation | **Pas ici** : c'est l'écran Famille | ★☆☆☆☆ |
| 9 | `slots[].slot_id`, `target_ref.id`, `sequence_id` | identifiants opaques | **Pas ici** : plomberie — sauf `target_ref.id`, qui est la **cause** de « un bâtiment à vous » (voir lots back) | ★☆☆☆☆ |
| 10 | `settling_glance` (`session/open`) | `{settling_count, all_clear}` — mesuré `{0, true}` | **Pas ici** : c'est un badge de l'accueil ; noté au passage que c'est un **compte brut**, pas une bande (R2.2) | ★☆☆☆☆ |
| 11 | `RESERVED_SLOT_TYPES` (3 : `STASH_CONSOLIDATION`, `INSPECTION_RESPONSE`, `LAUNDERING_INJECTION`) | des types qui existent et que le back refuse (422) | **Pas ici** : à ne surtout pas montrer ; l'annexe les mentionne, la maquette a raison de ne pas les dessiner | ★☆☆☆☆ |
| 12 | `state = 'resolved'` | la pile a fini | **Utile mais inatteignable** : voir D7 — aucune route ne la sert | ★★★☆☆ |
| 13 | `cueStackNamedSequencesMax` (5) | le plafond de séquences | **Utile au cadre 22** : « 2 / 5 » au lieu de « 2 séquences enregistrées ». Non projeté (comme D11) | ★★☆☆☆ |

---

## Lots back suggérés (dessiné ou nécessaire, non projeté)

| # | manque | table / source | maquette | preuve |
|---|---|---|---|---|
| L1 | **un rang unique et faisant autorité** — soit l'exécuteur trie par `drag_order`, soit la projection dérive ses bandes de la position de tableau, soit le back projette l'index d'exécution | `cue_stacks.slots` (jsonb) | M6, M9, M12, M26 | D1 — `slot-dependency-bucket.ts:94` vs `cue-stack-execution-tick.service.ts:149-150` |
| L2 | **la table de noms** (bâtiments, tournées, candidats) — sans elle « un bâtiment à vous » est le mieux possible | `buildings` (aucune colonne de nom : `building_id, player_id, block_id, building_type, ownership, heat, …` — mesuré) ; `routes.route_name` **existe** (`route.service.ts:203` le persiste) et n'est projeté par aucune réponse de ce domaine ; `recruitment_candidates.profile.name` **existe et EST projeté** par `GET /v1/recruitment/candidates` (mesuré : `"Saltline Candidate #0"`) | M8 | forme F sur `route_name` ; absence pure sur `buildings` |
| L3 | **quel créneau est en cours** — projeter `executing_slot_index`, ou écrire le statut `executing` | `cue_stacks.executing_slot_index` (colonne existante, jamais projetée) | M22 | D3 |
| L4 | **une lecture de la pile terminée** (bilan de fin) | `cue_stacks` `state='resolved'` (lignes conservées, mesurées en base) | cadre 21 | D7 |
| L5 | **`DELETE /v1/cue-stack/named-sequences/:id`** | `named_sequences` | cadre 22 | D8 — le message d'erreur la promet déjà |
| L6 | **`ParseUUIDPipe`** sur `:id` | — | — | D9 (500 mesuré) |
| L7 | **projeter les bornes** 4..8 et le plafond 5 de séquences | `coreLoopsTunables` | M18, M33 | D11 |
| L8 | **libellés i18n des valeurs du domaine** (4 types + 3 bandes + 6 statuts + 5 `outcome.status`) | bundle i18n | tous les cadres | D10 |
| L9 | **projeter `outcome.status`** — il est déjà dans `CueStackSlotView` mais rien ne le dessine ; c'est un lot **front**, pas back | — | cadre 21 | D12 (disponible, mesuré) |

---

## Actions : routes ↔ CTA

**8 routes joueur** dans le périmètre (7 du domaine + 1 voisine du même design P3-D), toutes sous
`@UseGuards(JwtAuthGuard)` — annexe 1.

| geste maquette | route | statut |
|---|---|---|
| M5 poignée ⋮⋮ (glisser) | `POST /v1/cue-stack/reorder` (remplacement **complet** du tableau) | ✔ mesuré 200 ; ⚠ recalcule bien les bandes (`mesures/18-reorder.json` : `WARN` → `BLOCKING`), mais sur `drag_order` (D1) |
| M13 « ENGAGER LA PILE · 5 » (appui long) | `POST /v1/cue-stack/commit` | ✔ — mais **à deux temps** en réalité (D4) |
| M19 « Composer une pile » | `POST /v1/cue-stack/compose` | ⚠ **CTA sans écran** : le composeur (choix de 4 à 8 cibles) n'est dessiné nulle part — question produit déjà posée par l'annexe, confirmée ici, et aggravée par D13 |
| M37 « Appliquer » | `POST /v1/cue-stack/named-sequences/:id/apply` | ✔ mesuré 200 ; la prose M38 (« remplace la pile du jour, si elle n'est pas engagée ») est **exacte** — mesuré `CUE_STACK_ALREADY_ACTIVE` sur pile engagée (`mesures/24`) |
| M39 « Enregistrer la pile du jour » | `POST /v1/cue-stack/named-sequences` | ✔ mesuré 201 ; ⚠ **refusé (409) si la pile est `executing`** (`findSaveableStack` = `pending`|`committed` seulement, `cue-stack.repository.ts:351` — mesuré `mesures/37`), état non dessiné |
| M15 « Enregistrer comme séquence · dès le palier 2 » | 403 `NAMED_SEQUENCE_UNLOCK_REQUIRED` | ✔ mesuré, avec `details: {vocabulary_tier: 1, progress_to_next: "LOCKED"}` |
| — | `GET /v1/annealing/rolling-queue` | ⚠ **route sans CTA ni affichage** — voir questions 3 et 4 |
| — | *(aucune)* | ⚠ **CTA manquant** : supprimer une séquence (D8) |

---

## Table de couverture complète

Comptes : **|B| = 31** clés/informations back · **|M porteurs d'information| = 32** (dont **27
appariés**, **5 non appariés**) · **|F| = 0** (mode maquette).
**31 + 5 = 36 lignes.** Exclus de la table et traités ailleurs : **5 affordances d'action**
(M5, M13, M19, M37, M39 → §Actions) et **2 titres statiques** (M1 « La Pile du jour », M31 « Les
Séquences »). Inventaire M total = 32 + 5 + 2 = **39**.

| # | information | B | M | statut |
|---|---|---|---|---|
| 1 | `cue_stack_id` (null ⇒ pas de pile) | ● | M17 | ✔ |
| 2 | `state` (`pending`/`committed`/`executing`/`resolved`) | ● | M4, M20, M29 | ✔ *(`resolved` inatteignable — D7)* |
| 3 | `committed_at` | ● | M30 « engagée ce matin » | ✔ approximatif |
| 4 | cardinal de `slots` | ● | M3, M13 | ✔ |
| 5 | `slots[].slot_id` | ● | – | question (plomberie) |
| 6 | `slots[].slot_type` (4 LIVE) | ● | M7, M19 | ✔ |
| 7 | `slots[].target_ref.kind` (`building`/`route`/`candidate`) | ● | M8 | ✔ |
| 8 | `slots[].target_ref.id` | ● | – | question → **L2** |
| 9 | `slots[].dependencies` | ● | M9, M26 | ✔ sous réserve **D1** |
| 10 | `slots[].drag_order` | ● | M6 | **D1** |
| 11 | `slots[].status` | ● | M21, M23, M24, M27, M28 | ✔ (5 valeurs sur 6) |
| 12 | `slots[].outcome.status` | ● | – | **D12** |
| 13 | `slots[].estimated_time_bucket` | ● | M10 | **D2** |
| 14 | `slots[].prerequisite_satisfaction_bucket` | ● | M11, M25 | ✔ |
| 15 | `slots[].dependency_conflict_bucket` | ● | M12, M26 | ✔ de forme, **faux de valeur (D1)** |
| 16 | 409 `details.settling[].building_ref` | ● | – | **D4** |
| 17 | 409 `details.settling[].band` | ● | – | **D4** |
| 18 | `sequences[].sequence_id` | ● | – | question (plomberie) |
| 19 | `sequences[].name` | ● | M34 | ✔ |
| 20 | `sequences[].created_at` | ● | M36 | **D5** |
| 21 | `sequences[].slots` (gabarit : 5 champs, sans statuts) | ● | M35 (cardinal seul) | ✔ partiel → question 7 |
| 22 | `vocabulary_tier` | ● | M32, M15 | ✔ |
| 23 | `progress_to_next` | ● | – | question 5 |
| 24 | `opened_game_day` | ● | M2, M16 | ✔ |
| 25 | rolling-queue `settling[].building_ref` | ● | – | question 3 |
| 26 | rolling-queue `settling[].band` | ● | – | question 3 |
| 27 | rolling-queue `settling[].initiating_change_type` | ● | – | question 3 |
| 28 | rolling-queue `touchable[]` | ● | – | question 4 |
| 29 | rolling-queue `lieutenants_settling[]` | ● | – | question 8 |
| 30 | les 8 codes d'erreur métier | ● | – | question 6 |
| 31 | cardinal de `sequences` | ● | M33 | ✔ |
| 32 | M14 « l'ordre est figé, les collisions se paieront » | – | ● | **ASSUMÉ vrai** (commit irréversible : `mesures/22`, `mesures/23` ; recovery ×1,5 : `cue-stack-execution-tick.service.ts:177`) |
| 33 | M18 « de quatre à huit créneaux » | – | ● | **D11** |
| 34 | M22 chip « en cours » | – | ● | **D3** |
| 35 | M30 « le prochain jour en ouvre une autre » | – | ● | **D6** |
| 36 | M38 « Appliquer remplace la pile du jour, si elle n'est pas engagée » | – | ● | **ASSUMÉ vrai**, mesuré (`mesures/44`, `mesures/24`) |

---

## Annexes

### 1. Routes du domaine (compte : 8 routes joueur)

Balayage : `grep -rEl 'cue.?stack|CueStack'` sur `**/*.controller.ts` → **17 fichiers** ; après
retrait des `*-test.controller.ts` et `*-admin.controller.ts` et lecture de chacun, **2 contrôleurs
joueur** portent le domaine, plus **1 voisin** issu du même design (P3-D cue-annealing).

| route | ancre | garde |
|---|---|---|
| `GET  /v1/cue-stack/current` | `cue-stack.controller.ts:55-60` | `JwtAuthGuard` |
| `POST /v1/cue-stack/compose` | `cue-stack.controller.ts:68-74` (200, upsert) | `JwtAuthGuard` |
| `POST /v1/cue-stack/reorder` | `cue-stack.controller.ts:80-86` (200) | `JwtAuthGuard` |
| `POST /v1/cue-stack/commit` | `cue-stack.controller.ts:94-100` (200) | `JwtAuthGuard` |
| `POST /v1/cue-stack/named-sequences` | `named-sequence.controller.ts:46-52` (201) | `JwtAuthGuard` |
| `GET  /v1/cue-stack/named-sequences` | `named-sequence.controller.ts:55-61` | `JwtAuthGuard` |
| `POST /v1/cue-stack/named-sequences/:id/apply` | `named-sequence.controller.ts:71-77` (200) | `JwtAuthGuard` |
| `GET  /v1/annealing/rolling-queue` | `annealing.controller.ts:40-45` | `JwtAuthGuard` |

Voisines lues : `POST /v1/session/open` (`session.controller.ts:56`), `GET /v1/progression`,
`GET /v1/i18n/bundle`, `GET /v1/exceptions/queue`, `GET /v1/recruitment/candidates`,
`GET /v1/operational/routes`, `POST /v1/operational/routes`, `GET /v1/city/district/:id/heat`.
Écartés du périmètre après lecture : `cue-annealing-admin.controller.ts` (BO/staff),
`cue-stack-test.controller.ts` (`_test`), `meta_progression/execution-plan.controller.ts`
(homonymie sur « slot » — écran Horizon), `citysim/erlang_stash` et `operational/selling`
(homonymie « slot »).

### 2. Corps réels — `mesures/` + `mesures/00-commandes.md`

Compte **frais** `jd-1787685073` (`player_id 01a03a55-7384-7fb7-a68f-9276ede1c609`), stack locale
dev (`mesures/docker-ps.txt`), **58 fichiers de mesure**. **Trois** seeds **déclarés**, employés
uniquement pour *dimensionner* ce qu'aucun chemin joueur ne produisait au jour 1 :

1. `POST /v1/_test/recruitment/replenish-saltline` (bassin de candidats vide sur compte frais) ;
2. `POST /v1/_test/cue-stack/run-execution-tick` — **`runTick` est la MÊME méthode que le créneau
   `MINUTE/29`** enregistré en production (`cue-stack-execution-tick.service.ts:114-122`) ; le seam
   ne court-circuite aucune règle. Nécessaire parce que `CITYSIM_CONTINUOUS_LOOPS` est **absent**
   de l'environnement du conteneur `game-back` (mesuré : seul `NODE_ENV=development` sort) ⇒
   l'horloge est épinglée et **la pile ne s'exécute jamais d'elle-même sur cette stack** ;
3. un `UPDATE player_progression_state SET rule_vocabulary_tier=2` **en SQL**, sur ce compte
   jetable, pour atteindre le cadre 22 : le chemin joueur exige K signaux `ADD_RULE` distincts ET
   N exceptions traitées (`progression.service.ts:29-33`).

Ensembles de clés mesurés (triés) :

- `CueStackView` (compose / reorder / commit / current) : `committed_at`, `cue_stack_id`, `slots`,
  `state` — **4 clés**.
- `CueStackSlotView` : `dependencies`, `dependency_conflict_bucket`, `drag_order`,
  `estimated_time_bucket`, `outcome`, `prerequisite_satisfaction_bucket`, `slot_id`, `slot_type`,
  `status`, `target_ref` — **10 clés**.
- `NamedSequenceView` : `created_at`, `name`, `sequence_id`, `slots` — **4 clés** ; gabarit de
  créneau : `dependencies`, `drag_order`, `slot_id`, `slot_type`, `target_ref` — **5 champs, sans
  `status` ni `outcome`** (mesuré `mesures/42-named-seq-list.json`).
- `RollingQueueView` : `lieutenants_settling`, `settling`, `touchable` — **3 clés**.
- `ProgressionView` : `progress_to_next`, `vocabulary_tier` — **2 clés**.

**Ordre du tableau `slots`** : mesuré **non trié** — la réponse rend les créneaux dans l'ordre du
tableau soumis, `drag_order` quelconque (`mesures/18-reorder.json` : envoyé `[3,1,2,0]`, rendu
`[3,1,2,0]`).

**B⁻ — colonnes en base non projetées** :
`cue_stacks.session_ref`, `.executing_slot_index`, `.executing_slot_started_minute`,
`.last_executed_game_minute` (les 4 colonnes de bookkeeping, `queues_exceptions_cuestack.ts:144-147`
— server-only R2.2 assumé, sauf `executing_slot_index` → **L3**) ·
`slots[].outcome.detail` **strippé** (`cue-stack.service.ts:347`) — mesuré en base :
`{costBand:"STANDARD",emergency:false}`, `{questId,questType:"saltline"}` (annexe 3) ·
`annealing_state.settling_ends_at`, `.changes_during_settling`, `.throughput_multiplier`,
`.compounding_history`, `.settled`, `.last_sweep_at` (`cue_annealing.ts:79-89`) — projetés en
`band` + `initiating_change_type` seulement.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte | atteignable ? |
|---|---|---|---|
| `state` | `pending` · `committed` · `executing` · `resolved` | `pgEnum cue_stack_state` (`queues_exceptions_cuestack.ts:24-29`) | 3/4 par une route joueur — **`resolved` jamais servi (D7)** |
| `slots[].slot_type` | 4 LIVE + 3 RÉSERVÉS | `slot-type.catalogue.ts:17-33` (catalogue runtime, **zéro pgEnum**, D1) | 4 composables ; les 3 réservés → 422 `SLOT_TYPE_RESERVED` |
| `target_ref.kind` | `building` (MAINTENANCE_BATCH, EXCEPTION_BATCH_RESOLUTION) · `route` (DISTRIBUTION_RUN) · `candidate` (RECRUITMENT_STEP) | `slot-type.catalogue.ts:56-61` `EXPECTED_TARGET_KIND` | 3/3 ; `candidate` mesuré, `route` mesuré, `building` mesuré |
| `slots[].status` | `pending` · `executing` · `done` · `failed_collision` · `failed_disrupted` · `failed_executor` | union TS `slot-type-executor.interface.ts:54-60` | **5/6** — `executing` jamais écrit (**D3**) ; `failed_disrupted` non observé (annexe 6) |
| `slots[].outcome.status` | `scheduled` · `quest_started` · `dispatched` · `noop_empty_source` · `batch_resolved` · `failed_collision` · `failed_executor` · `failed_disrupted` | littéraux : `maintenance-batch.executor.ts:39` · `recruitment-step.executor.ts:49` · `distribution-run.executor.ts:69,85` · `exception-batch-resolution.executor.ts:69` · `cue-stack-execution-tick.service.ts:211,225` · `cue-stack-disruption.service.ts:122` | 3 observés (`scheduled`, `quest_started`, `noop_empty_source`) + `failed_collision`, `failed_executor` observés en statut ; `dispatched`/`batch_resolved`/`failed_disrupted` non observés |
| `estimated_time_bucket` | `VERY_QUICK` · `QUICK` · `MODERATE` · `LONG` · `VERY_LONG` | `estimated-time-bucket.ts:38-43` (cutpoints **en dur**, non tunables) | **2/5** aux valeurs livrées (**D2**) |
| `prerequisite_satisfaction_bucket` | `SATISFIED` · `PENDING` · `UNSATISFIED` | `slot-dependency-bucket.ts:46` | **3/3 mesurés** (`mesures/08-compose.json`) |
| `dependency_conflict_bucket` | `NONE` · `WARN` · `BLOCKING` | `slot-dependency-bucket.ts:47` | **3/3 mesurés** — valeur fausse (**D1**) |
| `settling[].band` | `short` · `medium` · `long` (+ au-delà) | `annealingBandShortUpperMinutes` 10 / `…Medium…` 30 / `…Long…` 120 (`core-loops-tunables.ts:864-880`) | `medium` mesuré |
| `settling[].initiating_change_type` | registre runtime (`ROUTE_CREATED` mesuré) | `annealing_state.initiating_change` jsonb (`cue_annealing.ts:81`) — **non contraint en base** | 1 valeur observée |
| `vocabulary_tier` | 1..6 | `progression.projection.service.ts:10-11` | 1 mesuré, 2 semé |
| `progress_to_next` | `LOCKED` · `IN_PROGRESS` · `UNLOCKED` | `progression.projection.service.ts:7` | `LOCKED` mesuré |
| bornes de pile | 4..8 créneaux | `0007_queues_exceptions_cuestack.sql:67-68` + `cueStackDepthSlotsMax` (défaut 8, plage 4..8) | non projeté (**D11**) |
| plafond de séquences | 5 | `cueStackNamedSequencesMax` (défaut 5, plage 3..10) | non projeté ; `NAMED_SEQUENCE_CAP_REACHED` non déclenché |
| durées de créneau | 15 / 20 / 25 / 10 min de jeu | `core-loops-tunables.ts:824-846` | jamais projetées (R2.2 — bandes seulement) |

### 4. Inventaire M (39 éléments)

**Cadre 19 — « à ordonner »** (ligne 729 de `ecrans-brennar-2.html`)
M1 titre « La Pile du jour » *(chrome)* · M2 « Jour 26 » → `opened_game_day` · M3 « **5** créneaux »
→ cardinal · M4 « à ordonner » → `state` · M5 poignée ⋮⋮ *(action)* · M6 pastille `.ordre` 1–5 →
rang · M7 nom du créneau → `slot_type` · M8 « sur **un bâtiment** à vous » → `target_ref.kind` ·
M9 « après le **1** » / « après le **3** et le **4** » → `dependencies` · M10 chip `tps`
(« rapide » / « moyen ») → `estimated_time_bucket` · M11 chip `pret`/`att` (« prêt », « en attente
du 1 ») → `prerequisite_satisfaction_bucket` · M12 chip `warn` « ⚠ ordre risqué » →
`dependency_conflict_bucket` · M13 CTA « ENGAGER LA PILE · 5 » *(action)* · M14 « appui long —
l'ordre est figé, les collisions se paieront » · M15 verrou « Enregistrer comme séquence · dès le
palier 2 » → 403 / `vocabulary_tier`.

**Cadre 20 — « rien à ordonner »** (ligne 745)
M16 « Jour 27 » · M17 « **aucune** pile » → `cue_stack_id: null` · M18 « Aucune pile ce jour —
composez-en une : de quatre à huit créneaux » · M19 CTA « Composer une pile · entretien · tournée ·
exceptions · recrutement » *(action)*.

**Cadre 21 — « engagée, en cours »** (ligne 756)
M20 « en cours » (cyan) → `state` · M21 chip `st-done` « fait » · M22 chip `st-exec` « en cours » ·
M23 chip `st-fail` « raté — collision » · M24 chip `st-pend` « à venir » · M25 chip `pret`
« prérequis tenus » · M26 chip `bloq` « bloqué par le 4 » · M27 `.slot.termine` (barré, opacité
0,72) · M28 `.slot.rate` (bordure braise) · M29 poignées disparues → `state ≠ pending` ·
M30 pipeline « La pile s'exécute sans vous / engagée ce matin — le prochain jour en ouvre une
autre ».

**Cadre 22 — « séquences nommées (palier 2) »** (ligne 771)
M31 titre « Les Séquences » *(chrome)* · M32 « Palier 2 » → `vocabulary_tier` · M33 « **2**
séquences enregistrées » → cardinal · M34 « Tournée du matin » → `name` · M35 « 5 créneaux » →
cardinal du gabarit · M36 « enregistrée le jour 19 » → `created_at` · M37 « Appliquer » *(action)* ·
M38 « Appliquer remplace la pile du jour, si elle n'est pas engagée » · M39 CTA « Enregistrer la
pile du jour · elle devient une séquence, sans ses états » *(action)*.

*Valeur codée en dur repérée : aucune largeur de jauge ni pourcentage dans le CSS « SÉRIE 2 : LA
PILE DU JOUR » (lignes 692-726) — les seules valeurs dessinées sont des textes.*

### 5. Inventaire F

Sans objet — **mode maquette**, le front n'existe pas.

### 6. Non vérifié

1. **`failed_disrupted`** — jamais observé. Exige un `HeatEscalationEvent` / `BuildingRaidedEvent`.
   La mesure qui trancherait : `POST /v1/_test/cue-stack/disrupt-building` (existe,
   `cue-stack-test.controller.ts:181`), non employée pour ne pas empiler les seams.
2. **`EXCEPTION_BATCH_RESOLUTION`** — jamais composé : sur compte frais, aucune carte ne porte
   `effect.target_building_id` (le prédicat de `hasPendingForBuilding`,
   `exceptions.repository.ts:326`). Le type **est** atteignable en production — **3 producteurs
   comptés** écrivent ce champ (`raid-exception-producer.service.ts:75,82,89` ·
   `equipment-failure-card.service.ts:38,45,52,59` ·
   `backpressure-exception-producer.service.ts:95,103`) — mais aucun n'était armé. ⇒ le 4ᵉ type
   du CTA M19 exige un **événement du monde**, pas une action du joueur.
3. **`outcome.status` `dispatched` et `batch_resolved`** — lus dans le code, non observés (la
   tournée mesurée a rendu `noop_empty_source`, faute de cargaison à la source).
4. **`MODERATE` / `LONG` / `VERY_LONG`** — inatteignables aux valeurs livrées, donc non observés ;
   atteignables seulement par un override de tunable.
5. **Le faux NÉGATIF de D1** (bande `WARN` sur une collision certaine) est **prouvé par le code**
   (`slot-dependency-bucket.ts:94` vs `cue-stack-execution-tick.service.ts:149-150`) et
   **cohérent** avec une mesure (`mesures/49-compose4.json` projette `PENDING/WARN`, la base rend
   `failed_collision`), mais cette mesure **n'isole pas** : la dépendance a elle-même échoué. Le
   faux POSITIF, lui, est mesuré proprement de bout en bout (D1).
6. **Le cadre 22 a été mesuré après un seed SQL du palier.** Le chemin joueur vers le palier 2
   n'a pas été parcouru ; la forme des corps est donc réelle, la *condition d'accès* est déduite du
   code (`progression.service.ts:29-33`).
7. **Le comportement en staging / production n'a pas été mesuré** — seulement l'absence de
   `CITYSIM_CONTINUOUS_LOOPS` dans le conteneur de dev. Combien de temps réel dure un créneau
   (10 à 25 minutes **de jeu**) reste donc non mesuré, et c'est ce qui décide si le cadre 21 est un
   écran qu'on regarde ou un écran qu'on retrouve.
8. **`NAMED_SEQUENCE_CAP_REACHED`** non déclenché (une seule séquence enregistrée sur un plafond
   de 5) : le libellé et le corps de ce 409 sont lus, pas mesurés.
9. **Les rendus PNG** (`Tools/juge-visuel/pile-du-jour/*.png`) n'ont pas été ouverts — ce juge lit
   la source HTML/CSS, qui est l'artefact opposable.
10. **Le `event_descriptor` de la carte de rattrapage** est de la prose anglaise brute (« *A
    cue-stack slot could not fire as planned…* », mesuré) et non une clé i18n, contrairement à la
    carte d'onboarding (`onboarding.preseed_exception.card`). Relève de l'écran Exceptions, signalé
    au passage.
