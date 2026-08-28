# Juge données ⊥ — Les Exceptions (screen_5 la file + screen_5a le détail) — mode MAQUETTE — 2026-08-25

## En une phrase

La maquette montre **16 informations sur les 32 que le back rend** pour cet écran (+ 2 colonnes
qu'elle dessine alors qu'elles sont en base sans être projetées, et 2 qu'elle dessine sans aucune
source), et je relève **14 écarts à consigner** — dont un **bloquant produit mesuré** : la 3ᵉ issue
de la carte « chaleur de ville », dessinée, rend **422** — plus **15 questions « passé à côté ? »**
pour l'user et **6 lots back** dérivés.

---

## Écarts à consigner (mode maquette)

Gravité : **B** = bloquant produit (une chose dessinée ne peut pas marcher) · **I** = important
(un contrat manque ou une affirmation du dossier est fausse) · **m** = mineur.

| # | grav | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|---|
| **É1** | **B** | 3ᵉ issue de la carte « chaleur de ville » (`lay_low`) — **irrésolvable** | ● | ● | dessinée, disponible, **inopérante** | Le producteur écrit 3 actions **sans `effect`** : `heat-pressure-exception-producer.service.ts:58-84` (aucune clé `effect` sur les 3). `LayLowHandler.apply` appelle `requireEffect(ctx,'LAY_LOW')` (`effects/lay-low.handler.ts:23`) qui 422 quand `chosenAction.effect` est absent (`effects/exception-effect.ts:32-37`). **Mesuré sur réplique littérale** : `POST /v1/exceptions/<id>/resolve {"method":"LAY_LOW","chosen_action_id":"lay_low"}` → **422** *« action 'lay_low' does not carry the required 'LAY_LOW' effect. »* (`mesures/resolve-laylow-heat.json`). La maquette annonce « Prendre acte · suggéré · **2 autres issues** » (`ecrans-brennar-2.html:614`) : l'une des deux est morte. |
| **É2** | **I** | `event_descriptor` — **deux formes incompatibles**, aucune traduisible | ● | ● | affichée en français **sans source** | Sur les **21** écrivains de `exception_queue` : **13** phrases anglaises littérales, **3** phrases anglaises **interpolées** avec un id brut, **1** variable d'appelant, **4** clés/identifiants. Clés réelles : `ambient.off_hours_drift.card` (`ambient-drift-exception-producer.service.ts:41`), `random_world.coupling_discovery.card` (`random-world-exception-producer.service.ts:42`), `onboarding.preseed_exception.card` (mesuré, `mesures/queue-fresh-avant-session.json`), plus l'identifiant nu `operator_input_requested` (`lieutenant-tick.service.ts:382`). **`GET /v1/i18n/bundle?locale=fr` mesuré : 67 messages, 0 clé du domaine** (`mesures/i18n-fr.json`) — et 63 des 67 sont encore en anglais (`error.validation.failed` → `'Failed.'`). Le client ne peut donc traduire **ni** les phrases **ni** les 4 clés. |
| **É3** | **I** | `event_descriptor` de `route-collapse` : le littéral **« Route X »** n'est jamais substitué | ● | ● | affichée, valeur fausse à la source | `core_loops/supply_chain/route-collapse-exception-producer.service.ts:122` : `event_descriptor: 'Route X collapsed. Downstream offline.'`, avec le commentaire `:120-121` qui l'assume (« the route identity travels in the jsonb `route_id` tag above, **BO-diagnostic only** »). Le joueur lirait littéralement « Route X ». Même famille : `degraded-category-pressure-producer.service.ts:225` interpole un **uuid brut** de route dans la phrase. |
| **É4** | **I** | correspondance issue → `method` : portée par le corps pour **11 producteurs sur 21** seulement, et **jamais vérifiée** par le serveur | ● | – | contrat manquant (**L0.2**, confirmé et chiffré) | **11** fichiers portent le littéral `effect: { type:` (raid ×6, equipment-failure ×4, backpressure ×3, 8 autres ×2) ; les **10** autres n'en portent aucun : heat-pressure, onboarding-preseed, ambient-drift, random-world, cook/logistics/distribution/intelligence/muscle-binding, lieutenant-tick. Et pour `ONE_TIME`/`ESCALATE` le handler **ignore** le `chosen_action_id` : mesuré `{"method":"ONE_TIME","chosen_action_id":"nimporte-quoi"}` → **200 `{resolved:true, outcome:'RESOLVED'}`** (`mesures/resolve-onetime-idbidon.json`), et c'est cette valeur bidon qui est persistée dans `exception_queue.resolution` (`effects/one-time.handler.ts:14-17`). Une erreur d'inférence du client est donc **silencieuse**. |
| **É5** | **I** | `POST /v1/exceptions/:id/resolve` rend **500** sur un id non-UUID | ● | – | défaut back (convention lot 0) | Mesuré : `.../pas-un-uuid/resolve` → **500 `INTERNAL_ERROR`** (`mesures/resolve-nonuuid.json`), là où un UUID inconnu rend proprement **404** (`mesures/resolve-404-inconnu.json`). `@Param('id') id: string` sans `ParseUUIDPipe` — `exceptions.controller.ts:113`. |
| **É6** | **I** | « **3** en attente » : le compte sature à 3 si l'écran lit `session/open` | ● | ● | piège de source | `GET /v1/exceptions/queue` n'est **pas** plafonné (`exceptions.repository.ts:235-241`, `listPending` sans `limit`). `POST /v1/session/open` **l'est** : `rows.slice(0, depth)` avec `depth = oneDecisionQueueDepthVisible` = **3** (`session-open-sequence.service.ts:490` + `core-loops-tunables.ts:434-437`). La maquette dessine exactement **3** cartes (`ecrans-brennar-2.html:604-621`) : les deux sources donnent la même image ici et divergent dès la 4ᵉ carte. Le cadre doit dire laquelle il lit. |
| **É7** | **I** | l'écran d'**archive** derrière « Escalades archivées › » n'est pas maquetté | ● | – | route entièrement disponible, aucune surface | `GET /v1/exceptions/escalations` rend des **cartes complètes** (mêmes 9 clés, `resolution_status:'escalated'`) + `total`/`limit`/`offset` — mesuré `mesures/escalations-apres.json`. La maquette ne dessine que le **lien** et le **compte** (`:622`, `:633`). Clamps mesurés : `limit=0→1`, `limit=999→100`, `offset=-5→0`, `limit=abc→20`. |
| **É8** | **I** | une carte peut avoir **0 issue** et un `suggested_action` **vide** — aucun cadre ne le dessine | ● | – | état réel non couvert | `lieutenant-tick.service.ts:376-390` insère `candidate_actions: []`, `suggested_action: {}`, `event_descriptor:'operator_input_requested'`, `confidence: 0`. `projectCard` les **transmet verbatim** (`exceptions.projection.service.ts:225-231` — `{}` est truthy, le défaut à 4 clés n'est **pas** appliqué). **Mesuré** : `"candidate_actions": []`, `"suggested_action": {}` (`mesures/queue-carte-nue.json`). Un rendu qui lit `suggested_action.label` obtient `undefined` ; le tampon de la file n'a rien à écrire. |
| **É9** | **I** | l'affirmation du dossier « le nom n'existe dans **aucune** projection » est **fausse** | ● | ● | à re-consigner | `GET /v1/flag-review` (route joueur, `JwtAuthGuard`, `flag-discipline.controller.ts:69-70`) projette `lieutenant: { id, name }` — `flag-discipline.service.ts:282`, alimenté par `flag-discipline.repository.ts:616` (`lieutenant_name: lieutenant.name`). Le trou n'est donc **pas** la projection mais la **VALEUR** : mesuré en base, les deux lieutenants du compte frais s'appellent **`Lieutenant`** (`mesures/lieutenant-noms-en-base.txt`), placeholder posé à **3 sites** — `lieutenant.service.ts:235`, `onboarding-grant.service.ts:367` et `:382`. ⇒ le lot L1 est le **générateur de noms**, pas un ajout de clé. |
| **É10** | **I** | l'affirmation du dossier « le back n'a **ni tri ni filtre** » est inexacte, et le tri client ne peut pas départager | ● | ● | à re-consigner | `listPending` **ordonne** : `.orderBy(desc(priority), emitted_at)` — `exceptions.repository.ts:240`. Le filtre « **Par priorité** » (actif par défaut, `:603`) est donc l'ordre **natif** ; il n'y a pas de *paramètre*, c'est autre chose. Et « Par gravité » re-trie sur **3** valeurs, « Par lieutenant » sur **7** valeurs d'archétype : avec `emitted_at` non projeté, le client **n'a aucun départage stable** pour les ex æquo. |
| **É11** | m | cadre 13 : « **PRENDRE ACTE DES 2 ANODINES** / la **grave** reste à votre main » contredit ses propres cartes | – | ● | incohérence interne M | Le cadre dessine **2** cartes `exc grave` (`:667`, `:673`) et **1** `exc moyen` (`:679`) : il y a **deux** graves, pas une, et **une** anodine, pas deux. En outre « anodine » ne correspond à aucune valeur de `severity_band` (`MILD|MODERATE|SEVERE`) ni de `priority_band`. |
| **É12** | m | `queue_pressure_band` et `confidence_band` : **1 valeur sur 3** dessinée | ● | ● | couverture partielle d'un domaine fermé | `queue_pressure_band` ∈ `normal|warning|saturated` (`exceptions.projection.service.ts:132`) : seul « calme » est écrit (`:601`, `:630`, `:664`) ; les classes `.pression b.att` / `b.sat` (`:593`) sont **définies et jamais employées**. Oracle Python sur le fichier **entier** (sa dernière ligne est un data-URI de 4 Mo qu'un `grep` filtré ne couvre pas) : `class="att"` → **0**, `class="sat"` → **0**, **contrôle positif** `class="ok"` → **6**. `confidence_band` ∈ `tentative|likely|confident` : `conf-h` → 4 occurrences (1 définition + 3 emplois, dont `:644` ici), `conf-s` → 3 et `conf-b` → 3 (1 définition + 2 emplois chacun, **tous dans la série « Revue du jour »**, aucun dans les Exceptions). |
| **É13** | m | `archetype` : **3** bustes pour **7** valeurs | ● | ● | couverture partielle | Domaine : `COOK\|SECURITY\|LOGISTICS\|BOOKKEEPER\|LAUNDERING\|DISTRIBUTION\|UNKNOWN` (`lieutenant.projection.service.ts:78-81`, 7 valeurs). Symboles définis dans la maquette : `buste-fedora`, `buste-casquette`, `buste-homburg` — **3**, dont 2 seulement employés dans la série. |
| **É14** | m | `.chip.pri-s` (« silencieuse ») est dessinée mais **inatteignable** en production | ● | ● | état dessiné que B ne produit jamais | La bande `silent` exige `priority < 20` (`exceptions.projection.service.ts:259`). Les 21 producteurs émettent `priority ∈ {20,40,50,60,70,80,85,90}` (le plus bas : onboarding-preseed, 20 — mesuré `priority=20` en base). Et la ré-priorisation ne fait que **croître** : `priority = round(severity × age_factor)` avec `age_factor ∈ [1, 2]` (`exception-priority-decay.ts:27-34`). ⇒ aucune carte ne peut descendre sous 20. |

### Trous honnêtement documentés — à **garder**, avec leur commentaire de péremption

Trois trous portent déjà leur mode d'emploi ; ils ne doivent pas disparaître silencieusement.

1. `lieutenant.service.ts:235` — `name: 'Lieutenant', // placeholder — the locale name-pool generation is DEFERRED (spec §11).` (et `onboarding-grant.service.ts:367` — *« placeholder — TD-046, byte-identical to the classic recruit path »*). C'est la bonne forme : la valeur est fausse **et le dit**.
2. `exceptions.projection.service.ts:200-214` — la frontière du tag `source` (gardé sur le GET direct, retiré sur `session/open`) est **écrite** plutôt que laissée silencieusement incohérente. Mesuré des deux côtés : `source:"onboarding_preseed"` présent dans `mesures/queue-fresh-avant-session.json`, **absent** de `mesures/session-open.json` — la documentation dit vrai.
3. `logistics-binding.ts:523-527` — l'impossibilité d'exprimer un seuil en DSL est expliquée et l'action retombe sur `add_rule_dsl: null`, au lieu d'une règle bidon.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `script_complexity_band` — `ok\|approaching\|at_max` (`GET /v1/exceptions/queue`, mesuré `"ok"`) | « ce lieutenant approche de son plafond de règles » (plafond = **12**, `core-loops-tunables.ts:363-366`) | **utile ici, et précisément ici** : la carte 3 propose justement d'**apprendre une règle** (`:620` « lui apprend une règle »). Enseigner à un lieutenant `at_max` est le geste que le joueur ne doit pas faire à l'aveugle. Présente uniquement sur les cartes ADD_RULE-capables — donc exactement là où elle sert | **fort** |
| Q2 | `escalations[]` — les cartes archivées elles-mêmes + `total`/`limit`/`offset` | tout ce que le joueur a repoussé, relisible | **utile** : la route est entière et paginée ; seule sa **taille** est dessinée. C'est un écran gratuit | **fort** |
| Q3 | `outcome` (`POST …/resolve`) — 10 valeurs mesurées à la source : `RESOLVED · ESCALATED · TAUGHT · REPAIRING · REPAIRING_SLOW · DEFERRED · DEMOLISHED · LAID_LOW · BRIBE_SUCCEEDED · BRIBE_FAILED` | ce que le geste a **produit** | **utile** : `BRIBE_SUCCEEDED`/`BRIBE_FAILED` est un **tirage** (`effects/bribe.handler.ts:34-47`) — sans retour, le joueur paie et ne sait pas. L'annexe assume « la maquette ne dessine pas d'après-geste » : c'est le point le plus cher de cet écart | **fort** |
| Q4 | `rule_count_band` — `NONE\|FEW\|MANY` (`GET /v1/lieutenants`, mesuré `"NONE"`) | « il n'a aucune règle / peu / beaucoup » | **utile** : le détail écrit **en dur** « il n'a pas de règle pour ça » (`:646`) — la clé le dit vraiment, et se trompe moins | moyen-fort |
| Q5 | `backlog_badge` — booléen (mesuré `false`) | « votre arriéré dépasse le seuil » (**> 10**, `core-loops-tunables.ts:401-404`) | **utile** : c'est le signal « accueil » du canon, et il est distinct du compte brut que le sous-titre montre. Sans lui, rien ne distingue 11 cartes de 40 | moyen |
| Q6 | `op_state_band` — `SETTLING\|PAUSED\|ACTIVE\|IDLE` (`GET /v1/lieutenants`, mesuré `"IDLE"`) | l'état du lieutenant qui parle | **utile** : une exception remontée par un lieutenant **en pause** ne se lit pas comme une remontée d'un lieutenant actif | moyen |
| Q7 | `candidate_actions[].projected_consequence` **sur la file** | la conséquence de l'issue suggérée, avant d'ouvrir le détail | **utile** : le back la sert pour **chaque** action ; la file n'affiche que « suggéré · N autres issues » (`:608`). Une ligne de conséquence sous le tampon coûte zéro appel | moyen |
| Q8 | `suggested_disposition: 'ESCALATE'` | « la machine n'est pas sûre — escalade plutôt » | **pas ici, pas encore** : ⚠️ **mesuré inatteignable**. Seuil 0,6 exclusif (`core-loops-tunables.ts:395-398`) ; oracle sur les 21 producteurs → `{0.9:12, 0.8:6, 0.7:1, 0.6:1, 0:1}`, **un seul** sous le seuil — `lieutenant-tick.service.ts:385` (`confidence: 0`), et **cette carte-là n'a aucune issue** (É8). Le dessiner reviendrait à dessiner un état que la production n'atteint qu'une fois, sur la carte la plus dégénérée. À **réparer côté back d'abord** | fort *sur le back*, nul sur la maquette |
| Q9 | `tenure_bucket` — `FRESH\|…\|ENTRENCHED` (mesuré `"FRESH"`) | l'ancienneté du lieutenant | pas ici : c'est le sujet de l'écran Famille | faible |
| Q10 | `building_type` (int, table `buildings`) | la **catégorie** du bâtiment touché (« un labo », « une planque ») | **utile en remplacement du nom** : `effect.target_building_id` est opaque ; le type est en base, non projeté, et donne un libellé sans exiger une table de noms. ⚠️ aucun mappage type→libellé n'existe aujourd'hui | moyen |
| Q11 | `resolution_status` | l'état de la carte | pas ici : constant par route (`pending` sur la file, `escalated` sur l'archive) — mesuré des deux côtés | nul |
| Q12 | `candidate_actions[].source` | l'étiquette de producteur | pas ici : diagnostic BO ; et son sort diffère déjà entre les deux surfaces (É-trou 2) | nul |
| Q13 | `exception_id`, `candidate_actions[].id` | poignées opaques | plomberie : servent le `resolve` | nul |
| Q14 | `escalations.limit` / `.offset` / `resolve.resolved` | pagination et accusé | plomberie | nul |
| Q15 | cartes `aged_out` | « cette carte a expiré toute seule » | ⚠️ **ce n'est pas une clé disponible, c'est un trou** : la transition existe (`exception-queue-tick.service.ts:110-125`, horizon **48 h**) mais **aucune route joueur ne rend les cartes `aged_out`** — les deux GET filtrent `pending` / `escalated` (`exceptions.repository.ts:239`, `:254`). Une carte disparaît **en silence**. Rien n'est dessiné, et rien ne **pourrait** l'être | à arbitrer |

---

## Lots back suggérés

### Forme F — colonne en base, non projetée, **dessinée** par la maquette

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| **L1** | `name` (+ `name_locale`) | `lieutenant` | `:669`, `:670`, `:681`, `:682` — « Salvatore », « Vito Marchetti » | Colonne `varchar(64) NOT NULL` (`db/schema/lieutenant.ts:91-92`), **déjà projetée** sur une route joueur sœur (`flag-discipline.service.ts:282`). **Le lot n'est pas la projection : c'est le générateur** — valeur mesurée en base `Lieutenant` pour les 2 lieutenants du compte frais, placeholder posé à 3 sites (`lieutenant.service.ts:235`, `onboarding-grant.service.ts:367`, `:382`). ⇒ le lot livre le **maillon manquant** (le pool de noms), puis la clé sur la carte. |
| **L2** | `emitted_at` | `exception_queue` | `:666` filtre « Par âge » ; `:668`, `:674`, `:680` — « il y a 3 h », « hier », « il y a 40 min » | `timestamp NOT NULL DEFAULT now()` (`db/schema/queues_exceptions_cuestack.ts:56`), **déjà lue** par le back (c'est le 2ᵉ critère de tri, `exceptions.repository.ts:240`, et l'entrée de la formule d'âge `exception-priority-decay.ts:27`) — **seule la projection l'omet** (`exceptions.projection.service.ts:220-237`). Précédent de forme sur une surface sœur : `flagged_game_day` est projeté par `GET /v1/flag-review` (`flag-discipline.service.ts:285`). Mesuré en base : `2026-08-25 19:05:13.877797+00`. |
| **L3** | `resolved_at` + `resolution` (jsonb) | `exception_queue` | non dessiné (l'écran d'archive manque, É7) — **à ouvrir avec lui** | `db/schema/queues_exceptions_cuestack.ts:57-58`. Mesuré en base après un ESCALATE : `resolved_at=2026-08-25 19:05:55.852+00`, `resolution={"method":"ESCALATE","chosen_action_id":"escalate"}`. `listEscalated` **trie déjà** sur `resolved_at DESC` (`exceptions.repository.ts:255`) sans le projeter : l'archive est ordonnée par une date que le client ne voit pas. |

### Hors forme F — la donnée n'existe **nulle part**

| # | information | maquette | preuve |
|---|---|---|---|
| **L4** | **nom de bâtiment** | `:670` — « au **Verge d'Or** » | Mesuré sur la base réelle : `buildings` a **12 colonnes**, aucune de nom. Et sur **tout** le schéma public, seules **8** colonnes s'appellent `name/label/display_name/title` : `lawyers.name`, `lieutenant.name`, `named_sequences.name`, `region.display_name`, `telemetry_event(.*).name`. ⇒ nouveau lot (table de noms), exactement l'item « TABLE DE NOMS pour la fiction » du lot 0. |
| **L5** | **résolution par lot** | `:685` — « PRENDRE ACTE DES 2 ANODINES » | Une seule route d'action existe dans le domaine : `POST /v1/exceptions/:id/resolve` (`exceptions.controller.ts:109`), unitaire. **Précédent maison à réutiliser** : `POST /v1/flag-review/batch-confirm` (`flag-discipline.controller.ts:78-80`), set-based et idempotent par construction (`flag-discipline.service.ts:298-300`). |
| **L6** | **libellés traduisibles** | tout le texte de l'écran | É2 + É3. Le mécanisme existe (`GET /v1/i18n/bundle`, `i18n/i18n.controller.ts:32`) mais porte **0** clé du domaine sur 67 mesurées, et 21 producteurs sur 21 écrivent du texte non résolvable (13 phrases, 3 interpolées, 1 variable, 4 clés absentes du bundle). |

---

## Actions : routes ↔ CTA

**Routes `@Post` joueur du domaine : 1.** Balayage : `exceptions.controller.ts` porte **3** routes, toutes
sous `@UseGuards(JwtAuthGuard)` — `@Get('exceptions/queue')` `:66-67`, `@Get('exceptions/escalations')`
`:84-85`, `@Post('exceptions/:id/resolve')` `:109-111`. Aucun contrôleur `_test`/BO dans `src/exceptions/`.

| geste de la maquette | route | verdict |
|---|---|---|
| tampon « Réparer le bâtiment » / « Prendre acte » / « Expédier automatiquement » (`:608`, `:614`, `:620`) | `POST …/resolve` | ✔ — mais la `method` est **inférée** par le client (É4) |
| « … » (ouvrir le détail) (`:608`) | *aucune* | ✔ par conception : le détail est la même carte dépliée, il n'existe **pas** de `GET` unitaire (2 GET au total) |
| CTA du détail « RÉPARER LE BÂTIMENT » (`:656`) | `POST …/resolve` | ✔ |
| « Escalades archivées › » (`:622`, `:633`) | `GET …/escalations` | ✔ pour le compte — **l'écran cible manque** (É7) |
| filtres « Par priorité / gravité / lieutenant » (`:603`) | *aucun paramètre* | ✔ client — mais voir É10 (ordre natif, ex æquo non départageables) |
| « PRENDRE ACTE DES 2 ANODINES » (`:685`) | **aucune** | ✗ — L5 |
| escalader | `POST …/resolve` `method=ESCALATE` | ✔ mesuré : `{resolved:true, outcome:'ESCALATED'}`, la carte quitte la file et entre dans l'archive (`mesures/resolve-escalate-200.json`, `queue-apres-escalate.json`, `escalations-apres.json`) |

**Routes de lecture sans geste dessiné** : aucune — les 2 GET sont tous deux sollicités.

---

## Table de couverture complète

Mode maquette : deux colonnes, **B** et **M**. `●` présent · `–` absent · `○` présent mais partiellement dessiné.

### Clés B (32)

| # | information | B | M | statut | ancre |
|---|---|---|---|---|---|
| B1 | `exception_id` | ● | – | plomberie (poignée du resolve) | proj. `:98` |
| B2 | `lieutenant_id` (nullable) | ● | ● | ✔ — sert la jointure archétype ; `null` ⇒ « toute la ville · aucun lieutenant » (`:613`) | proj. `:99` / mesuré |
| B3 | `event_descriptor` | ● | ● | **É2/É3** — affiché traduit, sans source | proj. `:100` |
| B4 | cardinal de `candidate_actions` | ● | ● | ✔ — « 5 autres issues », « 2 autres issues », « Six issues » | mesuré 6/3/3/2 |
| B5 | `candidate_actions[].id` | ● | – | plomberie (`chosen_action_id`) | proj. `:76` |
| B6 | `candidate_actions[].label` | ● | ● | ✔ + É2 (langue) | proj. `:77` |
| B7 | `candidate_actions[].projected_consequence` | ● | ○ | ✔ sur le détail (`:649-654`) — **absente de la file** (Q7) | proj. `:78` |
| B8 | `candidate_actions[].add_rule_dsl` | ● | ● | ✔ — DSL verbatim `:652`, « lui apprend une règle » `:620` | proj. `:80` |
| B9 | `candidate_actions[].effect.type` | ● | – | **É4** — plomberie, mais absente 10 fois sur 21 | proj. `:83` |
| B10 | `effect.target_building_id` | ● | ● | ✔ « au bâtiment touché » (`:607`, `:646`) — id opaque | proj. `:52-58` |
| B11 | `candidate_actions[].source` | ● | – | plomberie BO ; sort différent selon la surface (mesuré) | proj. `:200-214` |
| B12 | `suggested_action` (laquelle) | ● | ● | ✔ « suggéré », « la première est suggérée » | proj. `:102` |
| B13 | `confidence_band` | ● | ○ | **É12** — 1 valeur sur 3 dessinée (`:644`) | proj. `:62` |
| B14 | `priority_band` | ● | ● | ✔ 4 classes / 4 valeurs — mais **É14** (`pri-s` inatteignable) | proj. `:65` |
| B15 | `severity_band` | ● | ● | ✔ 3 classes + 3 rails / 3 valeurs | proj. `:68` |
| B16 | `resolution_status` | ● | – | Q11 — constant par route | proj. `:106` |
| B17 | `suggested_disposition` | ● | – | **Q8** — mesuré inatteignable (1/21, sur la carte à 0 issue) | proj. `:115` |
| B18 | `script_complexity_band` | ● | – | **Q1** — la plus forte | proj. `:124` |
| B19 | `queue_pressure_band` | ● | ○ | **É12** — seul « calme » écrit | proj. `:132` |
| B20 | `backlog_badge` | ● | – | **Q5** | proj. `:156` |
| B21 | longueur de `exceptions[]` (le compte) | ● | ● | ✔ « 3 en attente » — mais **É6** | ctrl. `:70` |
| B22 | `escalations[]` (les cartes archivées) | ● | – | **É7 / Q2** | ctrl. `:90` |
| B23 | `escalations.total` | ● | ● | ✔ « 1 » (`:622`), « 0 » (`:633`) — mesuré `total=1` | ctrl. `:90` |
| B24 | `escalations.limit` | ● | – | plomberie (clamps mesurés) | ctrl. `:94` |
| B25 | `escalations.offset` | ● | – | plomberie (clamps mesurés) | ctrl. `:96` |
| B26 | `resolve.resolved` | ● | – | plomberie | ctrl. `:116` |
| B27 | `resolve.outcome` (10 valeurs) | ● | – | **Q3** — écart assumé par l'annexe `:920-921` | 10 `return` dans `effects/` |
| B28 | `opened_game_day` (`session/open`) | ● | ● | ✔ « Jour 26 » — ⚠️ source **hors** des routes de l'écran | s.-o.-seq. `:245` |
| B29 | `lieutenants[].archetype` | ● | ○ | ✔ « Cuisinier » / « Logistique » — **É13** (3 bustes / 7 valeurs) | mesuré `COOK` |
| B30 | `lieutenants[].op_state_band` | ● | – | **Q6** | mesuré `IDLE` |
| B31 | `lieutenants[].rule_count_band` | ● | – | **Q4** | mesuré `NONE` |
| B32 | `lieutenants[].tenure_bucket` | ● | – | Q9 | mesuré `FRESH` |

### Colonnes B⁻ (en base, non projetées) — 4

| # | colonne | B⁻ | M | statut |
|---|---|---|---|---|
| Bm1 | `exception_queue.emitted_at` | ● | ● | **forme F → lot L2** |
| Bm2 | `exception_queue.resolved_at` | ● | – | lot L3 (avec l'écran d'archive) |
| Bm3 | `exception_queue.resolution` | ● | – | lot L3 |
| Bm4 | `lieutenant.name` | ● | ● | **lot L1** — projetée ailleurs, valeur placeholder |

*(Non comptés en B⁻ : `confidence`/`priority`/`severity` bruts — leur non-projection est la règle R2.2,
pas un trou ; `player_id` — interne.)*

### Éléments M non appariés — 2

| # | élément | M | statut |
|---|---|---|---|
| Mx1 | « au **Verge d'Or** » (`:670`) | ● | dessiné **sans source, ni projetée ni en base** → lot L4 |
| Mx2 | « PRENDRE ACTE DES 2 ANODINES » (`:685`) | ● | dessiné **sans route** → lot L5 (+ É11) |

*(Ne comptent pas comme non appariés : les constantes d'interface — « Les Exceptions », « L'exception »,
« à relire à tête reposée », « rien à relire », « la routine tient », « appui long — la carte se ferme »,
les lettres A–F des issues, le glyphe `B` de la vignette ville, les 3 libellés de filtre.)*

### Contrôle d'arithmétique

| terme | compte |
|---|---|
| \|clés B\| | **32** |
| \|colonnes B⁻\| | **4** |
| \|éléments M non appariés\| | **2** |
| **somme** | **38** |
| **lignes de la table** | **38** ✅ |

**Comptées comme « montrées »** : les clés B marquées `●` ou `○` en colonne M — B2, B3, B4, B6, B7,
B8, B10, B12, B13, B14, B15, B19, B21, B23, B28, B29 = **16** (dont **4 partielles** `○` : B7, B13,
B19, B29). ⇒ **16 informations montrées sur 32 disponibles**, plus **2** dessinées sans projection
(Bm1 `emitted_at`, Bm4 `lieutenant.name`) et **2** dessinées sans aucune source (Mx1, Mx2).
Les **16** clés B non montrées : **6 questions** fortes ou moyennes (B18 → Q1, B22 → Q2, B27 → Q3,
B31 → Q4, B20 → Q5, B30 → Q6) · **1 défaut back** (B17 → Q8, mesuré inatteignable) · **1 écart de
contrat** (B9 → É4) · **3 sans intérêt d'affichage** (B11, B16, B32) · **5 plomberies**
(B1, B5, B24, B25, B26). 6+1+1+3+5 = **16** ✅

---

## Annexes

### 1. Routes du domaine — compte et ancres

**Balayage** (comptes pris dans un `$( )`, jamais lus au terminal).
`services/game-back/src/**/*.controller.ts` : **144** fichiers. Ceux dont le corps contient le mot
« exception » : **49**. Ceux d'entre eux qui ne sont ni `-test` ni `-admin` : **14**. Après lecture
de chacun des 14 : **9** ne parlent que d'exceptions JavaScript (`NotFoundException`,
`GlobalExceptionFilter`) ou citent `ExceptionsController` comme *patron de pont d'identité*
(flag-discipline, health, meta-progression, ambient, route, legal, autonomy-reports, random-world,
hl-card) · **1** est un homonyme d'un autre domaine (distribution, voir ci-dessous) · **4** portent
vraiment de la donnée pour cet écran. Soit :

| route | méthode | garde | ancre |
|---|---|---|---|
| `/v1/exceptions/queue` | GET | `JwtAuthGuard` | `exceptions.controller.ts:66-67` |
| `/v1/exceptions/escalations?limit&offset` | GET | `JwtAuthGuard` | `:84-85` |
| `/v1/exceptions/:id/resolve` | POST | `JwtAuthGuard` | `:109-111` |
| `/v1/session/open` (clés `queue`, `backlog_badge`, `queue_pressure_band`, `opened_game_day`) | POST | `JwtAuthGuard` | `session.controller.ts:56-58` |
| `/v1/lieutenants` (jointure `archetype`) | GET | `JwtAuthGuard` | `lieutenant.controller.ts:317-318` |
| `/v1/progression` (compte les exceptions traitées) | GET | `JwtAuthGuard` | `progression.controller.ts:34` — hors périmètre de cet écran |

⚠️ **Homonyme à ne pas confondre** : `POST /v1/distribution/caught-exceptions/:id/resolve`
(`operational/distribution/distribution.controller.ts:153-157`) est la résolution d'un **coursier
intercepté**, pas une carte d'`exception_queue`. Même famille que le piège
`operational/enforcement/` du socle.

### 2. Corps réels — `mesures/` + commandes

Toutes les commandes et leurs sorties sont dans `mesures/COMMANDES.md` et les 30 `.json`.
Points saillants :

- `GET /v1/exceptions/queue` — **3 clés de premier niveau** : `exceptions`, `queue_pressure_band`,
  `backlog_badge` (`mesures/queue-fresh-avant-session.json`).
- carte : **9 clés toujours** + **2 conditionnelles**. Les 11 mesurées ensemble sur une même carte :
  `mesures/queue-carte-riche.json`.
- `POST /v1/session/open` — **12 clés** : `backlog_badge, compression_glance, flag_review,
  friction_glance, hl_card, onboarding, opened_game_day, queue, queue_pressure_band, session_id,
  settling_glance, structural_budget`.
- `GET /v1/exceptions/escalations` — **4 clés** : `escalations, total, limit, offset`.
- `POST …/resolve` — **2 clés** : `resolved, outcome`.
- `GET /v1/lieutenants` — **5 clés par ligne** : `lieutenant_id, archetype, op_state_band,
  rule_count_band, tenure_bucket`.
- codes mesurés : 200 · 401 (sans jeton) · 404 (uuid inconnu) · 409 (rejeu) · 422 (méthode inconnue ·
  action non-addable · corps vide · effet manquant) · **500 (id non-UUID)**.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue |
|---|---|---|
| `confidence_band` | `tentative \| likely \| confident` | `exceptions.projection.service.ts:62` ; coupes `:247-251` (0,4 / 0,7) |
| `priority_band` | `silent \| watching \| urgent \| critical` | `:65` ; coupes `:255-259` (20 / 50 / 80) |
| `severity_band` | `MILD \| MODERATE \| SEVERE` | `:68` ; coupes `:264-267` (30 / 70) |
| `queue_pressure_band` | `normal \| warning \| saturated` | `:132` ; bornes cap **20** / warn **15** (`core-loops-tunables.ts:369-386`) |
| `script_complexity_band` | `ok \| approaching \| at_max` | `:166` ; plafond **12** (`core-loops-tunables.ts:363-366`) |
| `suggested_disposition` | `'ESCALATE'` ou **clé absente** | `:115`, `:187-189` ; seuil **0,6** strict (`core-loops-tunables.ts:395-398`) |
| `backlog_badge` | booléen, **strictement >** seuil | `:156` ; seuil **10** (`core-loops-tunables.ts:401-404`) |
| `resolution_status` | `pending \| resolved \| escalated \| aged_out` | `pgEnum` — `db/schema/queues_exceptions_cuestack.ts:33-38` |
| `effect.type` / `method` | 10 valeurs | `exceptions.projection.service.ts:32-42` — **confirmé par le 422 mesuré** qui les énumère |
| `outcome` | 10 valeurs | les 10 `return '…'` de `src/exceptions/effects/` |
| `archetype` | 7 valeurs | `lieutenant.projection.service.ts:78-81` |

**Les 21 producteurs de cartes** (oracle Python sur les 21 fichiers, `confidence` :
`{0.9:12, 0.8:6, 0.7:1, 0.6:1, 0:1}`) :

| producteur | conf / sev / pri | bandes | `effect` ? | forme du descripteur |
|---|---|---|---|---|
| raid `raid-exception-producer.service.ts:52-54` | 0.9 / 90 / 90 | confident · SEVERE · critical | oui (6) | phrase |
| equipment-failure `:88-90` | 0.9 / 85 / 85 | confident · SEVERE · critical | oui (4) | phrase |
| compression-residue `:118-120` | 0.9 / 85 / 85 | confident · SEVERE · critical | oui (2) | variable |
| friction-threshold `:135-137` | 0.9 / 80 / 80 | confident · SEVERE · critical | oui (2) | phrase |
| flag-exhaustion `:138-140` | 0.9 / 80 / 80 | confident · SEVERE · critical | oui (2) | phrase **interpolée** |
| backpressure `:147-149` | 0.9 / 80 / 80 | confident · SEVERE · critical | oui (3) | phrase |
| mycelial-stress `:131-133` | 0.9 / 80 / 80 | confident · SEVERE · critical | oui (2) | phrase |
| route-collapse `:129-131` | 0.9 / 80 / 80 | confident · SEVERE · critical | oui (2) | phrase (**« Route X »**) |
| execution-plan-deviation `:96-98` | 0.9 / 80 / 80 | confident · SEVERE · critical | oui (2) | phrase **interpolée** |
| heat-pressure `:91-93` | 0.9 / 70 / 70 | confident · SEVERE · urgent | **non** | phrase |
| cue-cascade `:149-151` | 0.9 / 60 / 60 | confident · MODERATE · urgent | oui (2) | phrase |
| degraded-category `:265-267` | 0.9 / 60 / 60 | confident · MODERATE · urgent | oui (2) | phrase **interpolée** (uuid) |
| cook-binding `:266-268` | 0.8 / 80 / 80 | confident · SEVERE · critical | **non** | phrase |
| logistics-binding `:536-538` | 0.8 / 60 / 60 | confident · MODERATE · urgent | **non** | phrase |
| distribution-binding `:398-400` | 0.8 / 60 / 60 | confident · MODERATE · urgent | **non** | phrase |
| ambient-drift `:84-86` | 0.8 / 50 / 50 | confident · MODERATE · urgent | **non** | **clé** `ambient.off_hours_drift.card` |
| random-world `:85-87` | 0.8 / 50 / 50 | confident · MODERATE · urgent | **non** | **clé** `random_world.coupling_discovery.card` |
| onboarding-preseed `:421-423` | 0.8 / 20 / 20 | confident · MILD · watching | **non** | **clé** `onboarding.preseed_exception.card` |
| muscle-binding `:309-311` | 0.7 / 50 / 50 | confident · MODERATE · urgent | **non** | phrase |
| intelligence-binding `:277-279` | 0.6 / 40 / 40 | **likely** · MODERATE · watching | **non** | phrase |
| lieutenant-tick `:385-387` | **0** / 50 / 50 | **tentative** · MODERATE · urgent | **non** (0 action) | identifiant nu `operator_input_requested` |

**Vérification des trois cartes du cadre 10** — les bandes dessinées sont **exactes** :
raid → « Grave / Critique » ✔ (90/90) · chaleur → « Grave / Urgente » ✔ (70/70) · logistique →
« Modérée / Urgente » ✔ (60/60). Et les comptes d'issues aussi : 6 → « 5 autres », 3 → « 2 autres ».

### 4. Inventaire M (élément → ce qu'il représente)

**Cadre 10 — « trois cartes en attente » (`:598-624`)**
M1 titre d'écran (constante) · M2 « Jour 26 » → `opened_game_day` · M3 « **3** en attente » → cardinal
de `exceptions[]` · M4 « calme » → `queue_pressure_band` · M5 trois filtres (client) · M6 rail de
couleur gauche → `severity_band` · M7 puce « Grave » → `severity_band` · M8 puce « Critique » →
`priority_band` · M9 buste → `archetype` · M10 titre → `event_descriptor` · M11 « **Cuisinier** » →
`archetype` · M12 « au bâtiment touché » → `effect.target_building_id` · M13 tampon « Réparer le
bâtiment » → `suggested_action.label` · M14 « suggéré · 5 autres issues » → `suggested_action` +
cardinal · M15 « … » → ouvre le détail · M16-M22 carte 2 (mêmes sources ; « toute la ville · aucun
lieutenant » → `lieutenant_id: null` ; vignette ville) · M23-M29 carte 3 (« lui apprend une règle » →
`add_rule_dsl` non nul sur la suggérée) · M30 « Escalades archivées » + M31 « **1** » →
`escalations.total`.

**Cadre 11 — « rien en attente » (`:627-635`)**
M32 « Jour 27 · **0** en attente · calme » (mêmes sources) · M33 « Vos lieutenants n'ont rien remonté
— la routine tient » → `exceptions: []` · M34 « rien à relire · **0** » → `total: 0`.
✔ mesuré : après résolution, `exceptions=0`, `queue_pressure_band='normal'`, `backlog_badge=false`.

**Cadre 12 — le détail d'un raid (`:638-658`)**
M35 titre d'écran · M36 « Jour 26 · **grave** · critique » → `severity_band` + `priority_band` ·
M37 puce « Confiance · sûre » → `confidence_band` · M38 titre → `event_descriptor` · M39 note
« **Cuisinier**, au bâtiment touché — il n'a pas de règle pour ça » → `archetype` +
`effect.target_building_id` + (**en dur**, cf. Q4) · M40 « Six issues — la première est suggérée » →
cardinal + `suggested_action` · M41-M46 les six étapes → `label` + `projected_consequence`, la D
portant `add_rule_dsl` **verbatim** (chaîne identique à `raid-exception-producer.service.ts:95` —
vérifiée caractère à caractère) · M47 CTA → `resolve` · M48 « appui long » (interface).

**Cadre 13 — « avec les lots back L1 + L2 + L3 » (`:661-687`)**
M49 filtre « Par âge » → `emitted_at` (**B⁻**) · M50 « il y a 3 h » / « hier » / « il y a 40 min » →
`emitted_at` (**B⁻**) · M51 « Salvatore » / « Vito Marchetti » → `lieutenant.name` (**B⁻**) ·
M52 « cuisinier » / « logistique » → `archetype` · M53 « au **Verge d'Or** » → **aucune source** ·
M54 titres interpolés avec le nom → `event_descriptor` + `lieutenant.name` · M55 « PRENDRE ACTE DES
2 ANODINES » → **aucune route** (+ É11).

### 5. Inventaire F

Sans objet — mode **maquette**, il n'y a pas de front.

### 6. Ce que je n'ai **pas** pu vérifier

1. **Aucun des 21 producteurs n'a été exercé par son chemin de PRODUCTION.** Les cartes raid /
   chaleur / logistique ont été **répliquées** via le seam `POST /v1/_test/core-loops/seed-pending-exception`
   (`core-loops-test.controller.ts:504-529`) en recopiant la forme **littérale** lue dans chaque
   producteur ; les scalaires viennent de la lecture des fichiers, pas d'une émission réelle.
   Conséquence sur É1 : le **mécanisme** (`requireEffect` sur un `chosenAction` sans `effect`) est
   mesuré, mais sur une réplique — ce qui trancherait définitivement est un test parcours qui fait
   monter la chaleur de ville jusqu'à `HOT/BURNING` et tente `LAY_LOW`.
2. La carte **panne d'équipement** (`equipment-failure-card.service.ts`, 4 effets `REPAIR_*`) n'a été
   ni exercée ni répliquée : je n'ai pas vérifié que ses 4 actions portent bien leur
   `target_building_id`.
3. `queue_pressure_band` mesurée uniquement à **`normal`** ; `warning`/`saturated` exigent 15 puis 20
   cartes en attente **pour un même lieutenant** — non produites. Idem `backlog_badge`, mesuré
   uniquement à `false` (il faut > 10 cartes).
4. `script_complexity_band` mesurée uniquement à **`ok`** ; `approaching`/`at_max` exigent 11 puis 12
   règles compilées sur un lieutenant — non produites.
5. `suggested_disposition` mesurée à `'ESCALATE'` sur une carte **semée** à `confidence 0.3` ; je n'ai
   pas produit la carte de production qui l'atteindrait (`lieutenant-tick`, `REQUEST_PLAYER_INPUT`),
   donc l'inatteignabilité de Q8 repose sur l'**oracle des 21 littéraux** + le seuil lu, pas sur une
   émission.
6. Je n'ai pas cherché de **mappage `building_type` → libellé** au-delà d'un balayage de noms de
   symboles ; l'absence de table de noms, elle, est mesurée sur `information_schema` (exhaustive).
7. Je n'ai **pas ouvert les 4 PNG de référence** — mon objet est la donnée, pas le pixel ; les écarts
   de rendu relèvent du juge visuel.
8. Le **résolveur i18n côté client** n'a pas été cherché (mode maquette). É2 porte sur ce que le back
   sert, pas sur ce que le client saurait en faire.
9. Je n'ai pas vérifié si les 4 clés i18n existent dans une source de traduction **hors** du bundle
   servi (`i18n/string_table.ts` non ouvert dans le détail) : ce que j'affirme est qu'elles ne sont
   **pas dans la réponse mesurée** de `GET /v1/i18n/bundle?locale=fr`.
10. **État laissé sur le compte de test** `jd-1787684713` : 1 carte pendante (« nue », semée),
    1 carte escaladée, 3 cartes résolues. Compte frais, jamais le compte de démo. Aucun conteneur
    monté, redémarré ni arrêté ; toutes les requêtes SQL sont des `SELECT`.
