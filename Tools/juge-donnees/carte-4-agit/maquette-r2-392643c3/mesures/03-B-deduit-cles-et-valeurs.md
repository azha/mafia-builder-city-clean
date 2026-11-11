# M3 — B, colonne DÉDUITE du source du cumul back

**Aucun corps réel.** Ruling f2 11/11 (dossier §Back) : la pile de dev tourne `main`, le gate arrive —
la stack n'a pas été touchée, `docker` n'a pas été appelé. Chaque ligne porte **DÉDUIT** et sa raison.

Source : `gate/cumul-2026-10-10` @ `7807d6c8`, dépôt `/home/erutheone/project/mafia-clean-city`,
lu par `git show` / `git grep` **sans changer de branche** (branche courante restée `main`, tête
`039c3e15` — `git rev-parse --abbrev-ref HEAD` avant lecture). Tête actuelle du cumul `0cfa6a7d`
(dossier : contrats du domaine identiques).

## 1. Les routes joueur du domaine — compte TROUVÉ : 2 (+1 lecture portée par `session/open`)

`git grep -n "hl-card|hl_card|hlCard" 7807d6c8 -- "services/game-back/src/**/*.controller.ts"`,
contrôleurs `_test` et `admin` exclus :

| # | route | ancre | garde |
|---|---|---|---|
| 1 | `POST /v1/session/hl-card/:id/commit` | `progression/loop10/hl-card.controller.ts:49-62` | `@UseGuards(JwtAuthGuard)` :51 |
| 2 | `POST /v1/session/hl-card/:id/skip` | `progression/loop10/hl-card.controller.ts:66-72` | `@UseGuards(JwtAuthGuard)` :69 |
| — | `POST /v1/session/open` — porte la carte sous `hl_card` | `session/session.controller.ts:18` ; charge `session/session-open-sequence.service.ts:234-267` | joueur |

Hors domaine joueur : `GET /v1/admin/players/:id/hl-card` (`core_loops/core-loops-admin.controller.ts:440`,
rôle `gm`) — BO, exclu.
**Aucune route de LECTURE unitaire de la carte** : pas de `GET …/hl-card/:id`. (Compte vérifié sur le
même grep ; conséquence lue au constat **N2**.)

## 2. `session/open` — 16 clés de premier niveau (DÉDUIT : `SessionOpenSequencePayload`)

`session/session-open-sequence.service.ts:234-267` + le `return` littéral :355-372.
Les 5 que cet écran lit :

| clé | type projeté | valeurs possibles, à la source qui les contraint |
|---|---|---|
| `hl_card` | objet ou `null` | `null` = rien de porté (`hl-card.service.ts:224-227`) |
| `queue` | liste de cartes d'exception | plafonnée à `one_decision_queue_depth_visible` (défaut **3**, `core-loops-tunables.ts:435-438`) ; cardinal seul utilisé ici |
| `backlog_badge` | booléen | `totalPendingCount > seuil` (`exceptions.projection.service.ts:208-210`) |
| `queue_pressure_band` | bande | `'normal' \| 'warning' \| 'saturated'` (`exceptions.projection.service.ts:184`, seuils :194-198) |
| `structural_budget` | `{ used: number; cap_reached: boolean }` | `used` = `player_progression_state.structural_decisions_this_session` (`progression.repository.ts:78-86`) ; `cap_reached = used >= cap` (:361) ; `cap = structuralCapForPlayer` → **0** si une fenêtre d'observation T4 est ouverte, sinon `one_decision_structural_per_session_cap` (défaut **1**, plage 1..2) — `core-loops-tunables.ts:429-433, 548-551` |

## 3. `hl_card` — 7 clés (DÉDUIT : `HighestLeverageCardProjection`)

`progression/loop10/hl-card-projection.ts:115-129`, construites :134-144.

| clé | type | valeurs possibles, à la source |
|---|---|---|
| `card_id` | id opaque | — |
| `decision_type_key` | enum | 8 clés HL (`hl-card-types.ts:62-73`, codes 101-108 :86-97) + 14 clés structurelles + `'UNKNOWN'` (`hl-card-projection.ts:91-97`) |
| `impact_bucket` | bande | `minor <0,4` · `moderate [0,4;0,7)` · `major ≥0,7` (`hl-card-projection.ts:51-55`) |
| `urgency_bucket` | bande | `low` · `elevated` · `pressing`, mêmes coupures (:59-63) |
| `options` | liste de `{label, projected_consequence}` | 2 clés i18n par option, jamais un scalaire (`hl-card-types.ts:112-115`) ; `[]` possible (:140 `?? []`) |
| `structural` | booléen | `catalogueStructuralEntryFor(code) !== undefined` ; **false pour les 8 fournisseurs v1** (codes 101-108 disjoints de 1-14, `hl-card-types.ts:24-44`) |
| `target_count` | compteur ≥ 0 | règle par code, `hl-option-table.ts:107-119` : longueur de liste pour **101** (`building_ids`, :72), **102** (`route_ids`, :75), **107** (`leg_ids`, :90) · **1** pour **105** (`case_id` scalaire, :84) · **0** pour les 4 fournisseurs de NAVIGATION **103, 104, 106, 108** (:78, :81, :87, :93) · **0** pour un code hors table (carte structurelle) ou un `target_ref` vide/mal formé (:108-112, 116-119) |

**`target_count = 0` : producible ?** Oui, et **toujours** pour 103/104/106/108 (règle `navigation`).
Jamais pour 101/102/107 par un fournisseur : chacun rend `[]` avant d'émettre une liste vide —
`damaged-building.provider.ts:53` (`if (total === 0 || damagedIds.length === 0) return []`),
`severed-route.provider.ts:66,74`, `mycelial-stressed-leg.provider.ts:63,67`. 105 vaut 1 par règle.

## 4. `commit` — 8 clés, toutes toujours présentes (DÉDUIT)

`hl-card-types.ts:125-139` ; fabriquées par `commitResponse` `hl-card.service.ts:134-146`.

`committed` (toujours `true`) · `structural` · `outcome` ∈ `'executed' | 'navigate' | 'noted'`
(`hl-card-types.ts:118`) · `executed_ids: string[]` (`[]` hors `executed`) · `stopped_at_id: string|null`
· `stopped_at_error: string|null` · `navigate_screen: string|null` · `navigate_ids: string[]`.

`navigate_screen` ∈ `exceptions_escalations` · `autonomy_reports` · `supply_chain_trace` ·
`exceptions_queue` (`hl-option-table.ts:79, 82, 88, 94`).

**`stopped_at_error` = le code brut de l'`ApiError`** : `hl-card.service.ts:310`
`stoppedAtError = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'`.
**Aucune clé i18n n'accompagne ce code dans le corps 200** : les 8 clés ci-dessus sont tout ce que
`commit` rend, et l'enveloppe de SUCCÈS ne porte pas d'objet `error` (`protocol/envelope.ts:139-154`).

## 5. L'échec de la 1re cible — ce que le back rend VRAIMENT (DÉDUIT)

`hl-card.service.ts:298-316` : à la **première** cible qui échoue (`executed.length === 0`), la
réclamation est compensée et **l'erreur de la route est relancée telle quelle** (`throw err`, :307).
⇒ le client ne reçoit **pas** un corps 200 : il reçoit une enveloppe d'ERREUR.

`protocol/envelope.ts:113-123` — `ErrorObjectComposite` : `code`, `http_status`,
**`user_facing_i18n_key`**, `payload_vars`, `details`, `message`, `trace`, `retryable_class`,
`retry_after_s`. `api-error.ts:8-10` : `user_facing_i18n_key` est **lu dans le registre `ERROR_CODES`
par le `code`** ; `message` est « EN-only, dev-facing technical message (never shown to players,
R-EH-4) » (`api-error.ts:23`).

Codes atteignables depuis les 4 exécutants, et leur clé joueur servie :

| code | `user_facing_i18n_key` | FR servi | ancre |
|---|---|---|---|
| `RESOURCE_NOT_FOUND` (404) | `error.resource.not_found` | « Ce n'est plus là. » | `error-codes.ts:103-107` ; `string_table.ts:6183` |
| `RESOURCE_STATE_CONFLICT` (409) | `error.resource.state_conflict` | « La situation a changé depuis votre dernier coup d'œil. Rechargez et décidez à nouveau. » | `error-codes.ts:108-112` ; `string_table.ts:6185` |
| `VALIDATION_FAILED` (422) | `error.validation.failed` | « Une partie de ce que vous avez saisi n'a pas été acceptée… » | `error-codes.ts:118-122` ; `string_table.ts:6211` |
| `MAINTENANCE_IN_PROGRESS` (409) | `error.supply_chain.maintenance_in_progress` | « Un entretien est en cours sur place. Il s'achèvera de lui-même. » | `error-codes.ts:277-281` ; `string_table.ts:6203` |
| `REBUILD_IN_PROGRESS` (409) | `error.sinuosity.rebuild_in_progress` | « Une reconstruction est déjà en cours. Attendez qu'elle s'achève. » | `error-codes.ts:315-319` ; `string_table.ts:6195` |
| `CATEGORY_DELEGATED` (409) | `error.meta_progression.category_delegated` | (servi) | `error-codes.ts:485-489` ; `string_table.ts:6157` |

Jetés par : `repair.service.ts:59, 65, 77` (101) · `route-rebuild.service.ts:151, 158, 203, 215` +
`hl-reroute.executor.ts:40` (102) · `legal-case.service.ts:556, 561` (105) ·
`leg-maintenance.service.ts:115, 128, 139` (107).

**⇒ « la phrase joueur de l'erreur de la route » A une source servie sur le chemin d'ERREUR**
(`payload.error.user_facing_i18n_key` + `string_table`), **et n'en a AUCUNE sur le chemin 200 de
l'arrêt partiel** (§4).

## 6. Les 409 de `commit` — tous le même code, sans discriminant (DÉDUIT)

Quatre causes distinctes rendent **`RESOURCE_STATE_CONFLICT`**, donc le même `http_status` 409, la
même `user_facing_i18n_key` `error.resource.state_conflict`, `payload_vars: null`, `details: null`
(aucun des sites ne passe `details` ni `payloadVars`) :

1. carte déjà terminale — `hl-card.service.ts:427` (`requireActionable`) ;
2. réclamation perdue (course) — `hl-card.service.ts:400` (`claimOrConflict`) ;
3. rien sur quoi agir — `hl-card.service.ts:270` sur `planCommit` `conflict` (`hl-commit-plan.ts:60-61` « no option [0] to act on », `:71` « no target to act on ») ;
4. **échec de la 1re cible** quand la route refuse en 409 — ex. `repair.service.ts:65` (local non endommagé) et `:77` (fonds insuffisants), relancé tel quel par `hl-card.service.ts:307`.

Le seul champ qui les sépare est `message`, **EN dev-facing que R-EH-4 interdit de montrer**
(`api-error.ts:23`).

## 7. B⁻ — en base, non projeté (rappel, hors tour borné)

`highest_leverage_cards` (`db/migrations/0120_core_loops_session.sql:84`, `db/schema/core_loops.ts`) :
`status` (`'active'|'committed'|'skipped'|'superseded'`, migration :66) et les scalaires bruts
`impact_internal`/`urgency_internal` ne sont pas projetés côté joueur — les seconds **délibérément**
(R2.2, `hl-card-projection.ts:131-133`). `status: skipped` est déjà noté **DETTE back** au dossier.
