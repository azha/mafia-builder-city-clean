# Juge données ⊥ — La Famille (screen_3 « Org Chart ») — mode MAQUETTE — 2026-08-25

Juge à contexte vierge. Ni auteur de la maquette, ni auteur de l'écran. N'a lu ni notes
d'implémentation, ni rapport de juge antérieur, ni `scratchpad/`.

---

## En une phrase

La maquette porte **23 éléments**, dont **16 informations** qui exigent une source back ; la
route de l'écran (`GET /v1/lieutenants`, **5 clés** mesurées) n'en sert que **3** — l'archétype,
le handle du rang, le compte de lieutenants. Résultat : **11 écarts** — dont **5 dessinés sans
aucune source atteignable** et **3 dont la colonne existe en base mais n'est projetée par aucune
route** — et **13 questions « passé à côté ? »**, dont **3 clés que la route rend déjà et que la
maquette n'utilise pas** (`op_state_band`, `rule_count_band`, `tenure_bucket`).

Le fait le plus dur, et il n'est pas un défaut de projection : **les noms n'existent pas en
base non plus.** Les trois chemins de production écrivent le littéral `'Lieutenant'`
(`lieutenant.service.ts:235`, `onboarding-grant.service.ts:367` et `:382`) — projeter
`lieutenant.name` afficherait « Lieutenant » sur les quatre rangs.

---

## Écarts à consigner (mode maquette — pas de colonne F)

Classés par ce qu'un joueur perd. `B⁻` = colonne en base, non projetée.

| # | information (Mxx) | B | M | statut | preuve |
|---|---|---|---|---|---|
| **E1** | **Nom du lieutenant** — « Salvatore « Sal » », « Vito Marchetti », « Rosa Bellini », « Enzo Greco » (M09) | B⁻ + précédent joueur | ● | **lot back (forme F) + trou de CONTENU** | Colonne `name varchar(64) NOT NULL` — `db/schema/lieutenant.ts:91`. **Ni `getProjectionRow` ni `listForPlayer` ne la SÉLECTIONNENT** (`lieutenant.repository.ts:382-397` et `:430-440`, les deux blocs `.select({…})`). ⚠️ Mais **la valeur est un placeholder** : `name: 'Lieutenant', // placeholder — la locale name-pool est DEFERRED (spec §11)` — `lieutenant.service.ts:235` ; idem `onboarding-grant.service.ts:367` (« TD-046 ») et `:382`. **3 chemins de production sur 3.** Précédent joueur qui projette DÉJÀ le nom : `GET /v1/flag-review` → `cards[].lieutenant.name` (`flag-discipline.service.ts:282`, repo `:616`, contrôleur `flag-discipline.controller.ts:69` sous `JwtAuthGuard`). |
| **E2** | **Loyauté en %** — « 82% », « 64% », « 91% » + libellé « Loyauté » (M13) | B⁻ | ● | **lot back (forme F) + écart de FORME + trou de CONTENU** | La seule grandeur de loyauté sur un lieutenant est `loyalty_seed_bucket` — un **enum à 4 valeurs**, pas un pourcentage : `CREATE TYPE "loyalty_seed_bucket" AS ENUM ('seeded','tested','tempered','fractured')` (`db/migrations/0124_recruitment_quests.sql:40`), colonne `db/schema/lieutenant.ts:164`. Le commentaire de la colonne l'assume : « *R2.2-clean by construction — the composite IS the player-facing surface (**no raw scalar loyalty anywhere**)* » (`:162-163`). ⚠️ **Colonne NULLable, écrite UNE seule fois à l'embauche par quête** (`:161` « NULL = classic/pre-04f-B recruit ») ⇒ les **2 lieutenants du kit de départ l'ont à NULL** (le grant ne la passe pas — `onboarding-grant.service.ts:362-390`). Surface joueur actuelle : **une seule**, l'écho à l'embauche `POST /v1/recruitment/quests/:id/hire` (`recruitment.controller.ts:144`) — jamais relue ensuite. |
| **E3** | **Rattachement lieutenant → ses hommes** (le fil laiton, `.equipe`, M15) | **–** | ● | **dessiné sans source** | Les deux entités « homme » du back sont `dealer` et `courier` (`db/schema/operational_chain.ts`). **Aucune des deux ne porte de `lieutenant_id`** : `dealer` = `dealer_id, player_id, home_building_id, coverage_lek_tile_id, substance_specialization, current_state, operating_hours_start, operating_hours_end, float_cents` (9 colonnes) ; `courier` = `courier_id, player_id, role_type, vehicle_type, home_dispatch_hub_id, current_state, current_route_id, current_load_grams, current_load_cents, sessions_active` (10 colonnes). Elles pendent du **joueur** et d'un **bâtiment**, jamais d'un lieutenant. |
| **E4** | **Nom de l'homme** — « Nino », « Carlo », « Luca » (M16) | **–** | ● | **dessiné sans source** | Ni `dealer` ni `courier` n'ont de colonne `name` (listes de colonnes ci-dessus, extraites par oracle Python sur `operational_chain.ts`). Aucune table de noms de fiction n'existe pour eux. |
| **E5** | **Résumé d'équipe agrégé** — « 4 gros bras », « 1 chauffeur », « 3 laveurs » (M20) | **–** | ● | **dessiné sans source** | Même cause que E3/E4, plus un problème de **domaine** : les seuls métiers du back sont `courier_role_type = ('courier','runner')` (`operational_chain.ts:46`) et `vehicle_type = ('foot','bike','car','refrigerated_van')` (`:47`). **« gros bras » et « laveurs » ne correspondent à aucune valeur** ; « chauffeur » ≈ `vehicle_type='car'`. Et le compte PAR lieutenant est impossible sans E3. |
| **E6** | **Chip « Retiré » + rang grisé** (M12) | **–** | ● | **dessiné sans source atteignable** | Deux candidats, **tous deux morts** : (a) `lieutenant.extinction_state` (`'STABLE'\|'BURST'\|'FADING'\|'RESOLVED'`, `db/schema/lieutenant.ts:20`) — **0 écrivain de production** (les seules mentions hors `db/` sont des commentaires disant que les fixtures de test l'écrivent en direct : `vertical-horizon-test.controller.ts:58-62`, `constraint-evaluators.ts:8`) ; (b) `mastery_score.delegation_state` dont la contrainte est `CHECK IN ('SELF','DELEGATED','RETIRED')` (`db/migrations/0002_player_progression_state.sql:62-63`) — **le littéral `'RETIRED'` rend 0 sur 1 014 fichiers `.ts`** (contrôle positif du même balayage : `'DELEGATED'` → 17, `'SELF'` → 45), et le code le dit lui-même : « *`RETIRED` (**no writer exists on this base**)* » `meta_progression/budget-cost.ts:6` et `:47`. **Aucune route ne retire / relève / licencie un lieutenant** — balayage sur les **75** contrôleurs joueur, motif `retire\|dismiss\|fire\|remove\|delete\|revoke\|relieve` appliqué au CHEMIN de chaque `@Get/@Post/@Put/@Patch/@Delete` : **2 hits, aucun sur un lieutenant** (`meta/horizon-feed/:cardId/dismiss`, `flag-review/:flagId/dismiss`). **Contrôle positif du même balayage** : la route `lieutenants/:id/reassign` est bien trouvée (1/1). |
| **E7** | **Chip « Délégué » / « Direct »** (M11) | ● *(ailleurs)* | ● | **source disponible mais PAS celle qu'on croit** | `mode` (`'tasked'\|'delegated'`) existe et est projeté — **mais sur le DÉTAIL seulement** (`LieutenantBands.mode`, `lieutenant.projection.service.ts:138`), **et il est CONSTANT en production** : les 3 écrivains passent tous `mode: 'delegated'` (`lieutenant.service.ts:238`, `onboarding-grant.service.ts:370` et `:385`) et **aucun UPDATE de `mode` n'existe** (seul l'INSERT de `recruit`, `lieutenant.repository.ts:829`). ⇒ « Direct » ne peut jamais apparaître. La source utilisable est ailleurs : `GET /v1/meta/task-categories` rend `task_categories[].delegation_state ∈ SELF\|DELEGATED\|RETIRED` **et** `delegated_lieutenant_ref` (le `lieutenant_id`) — `meta-progression.projection.service.ts:147-148,168-169`, mesuré. Le front devrait **inverser** cette table (catégorie→lieutenant) pour poser le chip. |
| **E8** | **District du Don** — « Le Verge » (M07) | **–** | ● | **dessiné sans source** | **Aucune route joueur ne rend « les districts / bâtiments du joueur »** : sur les 75 contrôleurs hors `_test`/admin, `GET /v1/operational/building/:id` exige un id, et il n'existe pas de liste. `GET /v1/world/districts` rend les 18 districts avec `name_canonical` = **`Verge-A` / `Verge-B` / `Verge-C`** (mesuré) — un profil `verge`, jamais « Le Verge » ; et rien n'y marque la possession (`control_state` = `UNCONTESTED` pour les 18). Contournement existant mais coûteux : `GET /v1/city/district/:id/interior` rend `buildings[]` **player-scoped** — il faudrait balayer les 18 districts pour trouver le sien. |
| **E9** | **Lieu de l'homme** — « Coin de la 3ᵉ », « Devant Rizzo », « Toit des docks » (M18) | B⁻ | ● | **lot back (forme F)** | `dealer.home_building_id` et `dealer.coverage_lek_tile_id` existent en base (`operational_chain.ts`), mais `DealerProjection` **n'a que 7 clés** — `dealer, activity_band, cash_band, substance, margin_band, addiction_loyalty_status, withdrawn` (`selling.projection.service.ts:63-88`) — **aucune n'est un lieu**. Idem `CourierProjection` (5 clés : `courier, vehicle_type, transit_band, temperature_status, degrading`, `distribution.projection.service.ts:285-303`). |
| **E10** | **Bandeau « Un siège libre à la table »** (M21) | B⁻ (tunable) | ● | **lot back** | Le plafond de roster existe et vaut **5** : `TunablesStore.resolveInt('lieutenant.max_count_per_player', 'LIEUTENANT_MAX_COUNT_PER_PLAYER', 5)` — `lieutenant-tunables.ts:33-35`. Il n'est **jamais projeté** : il n'est lu que côté serveur pour refuser (`lieutenant.service.ts:210` → 409, `recruitment-quest.service.ts:138` → 409). Le front ne peut donc pas savoir combien de sièges restent sans le coder en dur. |
| **E11** | **Libellés FR d'archétype** — « Comptable », « Sécurité », « Blanchiment », « Logistique » (M10) | ● *(la valeur)* | ● | **écart de LIBELLÉ à consigner** | La **valeur** est projetée (`archetype ∈ COOK\|SECURITY\|LOGISTICS\|BOOKKEEPER\|LAUNDERING\|DISTRIBUTION\|UNKNOWN`, mesuré `COOK`). Le **libellé** n'existe nulle part : `GET /v1/i18n/bundle?locale=fr` rend **67 messages**, dont **63 `error.*`** et **4 `game.*`** seulement (mesuré). Oracle Python sur `i18n/string_table.ts` : contrôle positif `assignment.summary` → 2 ; `BOOKKEEPER\|COOK\|LAUNDERING\|LOGISTICS\|SECURITY\|DISTRIBUTION` → **0** ; `SETTLING\|ENTRENCHED\|IDLE\|delegated\|PAUSED` → **0**. ⇒ le front coderait 6 libellés en dur, contre la convention « libellés en clés i18n partout » du lot 0. |

### Contrainte de livraison que le lot back doit regarder en face

Le jeu de clés du roster est **fermé par une assertion `toEqual` exacte** :
`tests/e2e/operational/lieutenant_roster_list.spec.ts:369-371` — *« each row has exactly the 5
band/handle fields »*. Et la même spec **interdit nommément** `assigned_building_id`,
`recruited_at`, `granted_role`, `mode`, `script_source` sur une ligne de roster
(`FORBIDDEN_KEYS`, `:85-102`), plus un scanner récursif qui **rejette toute clé hors
allow-list** et **tout nombre / booléen brut** (`findLeak`, `:255-277`). Ajouter `name`,
une bande de loyauté ou un chip de délégation au roster **rougit cette spec** — c'est le
dispositif anti-péremption qui fait son travail, pas un accident : il faudra l'amender **dans
le même commit**, avec les valeurs attendues AVANT/APRÈS.

---

## « Passé à côté ? » — pour l'user

Clés disponibles sur une route joueur, **ni dessinées ni affichées**. Classées par intérêt joueur
décroissant. Je propose, l'user tranche.

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `exceptions[].lieutenant_id` (`GET /v1/exceptions/queue`, aussi dans `session/open.queue[]`) | **Quel lieutenant a une décision en attente.** Mesuré : le kit de départ pose déjà 1 exception rattachée au 1ᵉʳ lieutenant. | **Utile ici, et c'est le manque le plus criant** : l'organigramme est l'écran où l'on choisit qui ouvrir, et rien n'indique qui réclame quelque chose. Une pastille sur le rang = 1 clé déjà rendue. | ★★★ |
| Q2 | `op_state_band` (`GET /v1/lieutenants`) | `SETTLING \| PAUSED \| ACTIVE \| IDLE` — le lieutenant travaille / est en pause / sort d'une réaffectation. | **Utile ici** : c'est le seul état *vivant* de la ligne, et il est déjà dans la réponse que l'écran consomme. La maquette a un emplacement libre (sous le rôle). | ★★★ |
| Q3 | `buildings[].lieutenant_ids` + `operational_type` + `name_canonical` (`GET /v1/city/district/:id/interior`) | **Où travaille chaque lieutenant** (« Verge-A · labo »). Mesuré : `lieutenant_ids: ["01a0…a571","01a0…16b7"]` sur le lab du grant. | **Utile ici** : c'est exactement l'information que la maquette donne aux *hommes* (« Coin de la 3ᵉ ») et refuse aux lieutenants. Réserve : nécessite de connaître le district ⇒ dépend de E8. | ★★★ |
| Q4 | `tenure_bucket` (`GET /v1/lieutenants`) | `FRESH \| ACCLIMATED \| SEASONED \| SENIOR \| ENTRENCHED` — l'ancienneté au poste. | **Utile ici** : la maquette met « DEPUIS 34 JOURS » sur la fiche (écran 2) ; la bande dit la même chose en un mot et coûte 0 requête de plus. C'est aussi le « teaser de filtre » pour lequel elle a été ajoutée (`lieutenant.projection.service.ts:214-217`). | ★★ |
| Q5 | `delegation_state` + `delegated_lieutenant_ref` (`GET /v1/meta/task-categories`) | **Quelle catégorie de travail est déléguée à quel lieutenant.** Mesuré : 4 catégories (`ROUTE_ASSIGNMENT`, `LIEUTENANT_HIRING`, `SUPPLY_SOURCING`, `HEAT_MANAGEMENT`), toutes `SELF` sur compte frais. | **Utile ici** : c'est la vraie source du chip « Délégué » (cf. E7), et elle porte en plus *ce qui* est délégué — plus riche que le chip dessiné. | ★★ |
| Q6 | `rule_count_band` (`GET /v1/lieutenants`) | `NONE \| FEW \| MANY` — le lieutenant a-t-il un script de comportement. | **Utile ici, mais discret** : « aucune consigne » sur un rang est une invitation à ouvrir la fiche. Un point, pas une ligne. | ★★ |
| Q7 | `standing_order.freshness` + `promotion_suggested` (`GET /v1/lieutenants/:id`) | `NONE \| FRESH \| EXPIRES_SOON \| EXPIRED` — l'ordre permanent expire bientôt. | **Utile, mais pas ici** : c'est un signal d'urgence, il mériterait de remonter au roster ; aujourd'hui il faut ouvrir chaque fiche. Coût : N requêtes. | ★★ |
| Q8 | `trust_budget_bucket` + `flag_frequency_band` (`GET /v1/lieutenants/:id`) | `low\|standard\|high` et `none\|occasional\|frequent` — combien ce lieutenant vous alerte, et s'il a encore du crédit. | **C'est la « loyauté » qui EXISTE vraiment** — pas au sens affectif mais au sens « fait-il perdre du temps ». À proposer à l'user comme substitut de M13 si la loyauté d'attachement n'est pas au canon. | ★★ |
| Q9 | `reassign_availability` (`GET /v1/lieutenants/:id`) | `AVAILABLE \| ON_COOLDOWN` — puis-je le déplacer maintenant. | **Pas ici** : c'est une info d'action, elle appartient à la fiche. | ★ |
| Q10 | `drift_phase` + `cue_bands` (`GET /v1/lieutenants/:id`) | `DIRECT_ALIGNED \| DRIFTING \| INCIDENTAL_LOCKED \| RESETTING` — le lieutenant commence à obéir à autre chose qu'à vos ordres. | **Fiction très forte, mauvais écran** : ça mérite un badge de roster le jour où ce n'est plus `{}` sur compte frais (mesuré vide). | ★ |
| Q11 | `budget_bands` (`GET /v1/lieutenants/:id`) | `{PRODUCTION_OPS:'full', …}` — combien d'autonomie il lui reste par catégorie. | **Pas ici** : trop dense pour une ligne. | ★ |
| Q12 | `granted_role` (`GET /v1/lieutenants/:id`) | `advisory \| executor \| delegated_owner \| cohort_overseer`. | **Pas ici, et à surveiller** : **constant `'executor'` en production** (3 écrivains : `lieutenant.service.ts:237`, `onboarding-grant.service.ts:369`, `:384`) — l'afficher ferait croire à une variété qui n'existe pas. | ✕ |
| Q13 | `me.lifecycle_state` / `me.locale` / `me.email` / `me.account_id` (`GET /v1/me`) | L'état du compte du joueur. | **Pas ici** : plomberie de compte, pas de la fiction. `handle` (le callsign) est la seule des 5 qui serve — c'est le « Don V. ». | ✕ |

---

## Lots back suggérés (B⁻ dessiné → forme F)

| # | colonne / valeur | table / source | maquette | preuve | note |
|---|---|---|---|---|---|
| L1 | `name` (+ `name_locale`) | `lieutenant` | M09 | `db/schema/lieutenant.ts:91-92` ; absente des DEUX blocs `.select({…})` : `getProjectionRow` `lieutenant.repository.ts:382-397` et `listForPlayer` `:430-440` | **Projeter ne suffit pas** : il faut D'ABORD une table de noms (TD-046). Sinon les 4 rangs affichent « Lieutenant ». Précédent de projection à copier : `flag-discipline.service.ts:282`. |
| L2 | `loyalty_seed_bucket` | `lieutenant` | M13 | `db/schema/lieutenant.ts:164` ; enum `0124_recruitment_quests.sql:40` | **4 bandes, pas un %.** Et NULL pour tout recrutement non-quête, kit de départ compris ⇒ il faut décider ce qu'on montre pour NULL (et le grant devrait la poser). |
| L3 | plafond de roster `lieutenant.max_count_per_player` | tunable (5) | M21 | `lieutenant-tunables.ts:33-35` ; consommé seulement en refus `lieutenant.service.ts:210` | 1 clé à ajouter au corps du roster (`roster_cap` ou `seats_free`) — ou le compte des sièges libres directement. |
| L4 | `home_building_id` / `coverage_lek_tile_id` | `dealer` | M18 | `DealerProjection` = 7 clés, `selling.projection.service.ts:63-88` | Sous forme de LIEU projeté (nom de bâtiment/tuile), jamais l'uuid nu. |
| L5 | libellés d'archétype et de bandes | `i18n/string_table.ts` | M10 | 4 clés `game.*` seulement (oracle Python, contrôle positif OK) | 6 archétypes + 4 `op_state` + 5 `tenure` = 15 clés. Convention du lot 0. |
| L6 | **nouveau** : lien homme → lieutenant | `dealer` / `courier` | M15, M16, M20 | aucune colonne `lieutenant_id` sur les deux tables | **Ce n'est pas une forme F, c'est une colonne qui n'existe pas** — arbitrage produit avant tout code. |
| L7 | **nouveau** : route « mes districts / mes bâtiments » | — | M07 | 0 route de liste sur les 75 contrôleurs joueur | Débloque aussi Q3 (le lieu du lieutenant). |

---

## Actions : routes ↔ CTA

| geste de la maquette | route joueur | verdict |
|---|---|---|
| Taper un rang → ouvrir la fiche | `GET /v1/lieutenants/:id` (`lieutenant.controller.ts:334`) | ✔ — `lieutenant_id` est bien le handle rendu par le roster. |
| « **recruter au Verge d'Or** » (M22) | `POST /v1/lieutenants` (`:181`) **ou** les 7 routes `recruitment/*` (`recruitment.controller.ts:62-159`) | ⚠️ **vocabulaire divergent.** Le CTA nomme un LIEU ; la route exige `{ archetype, assigned_building_id }` (`lieutenant.controller.ts:190-193`). Et le chemin riche (candidats → quête → `advance` → `hire`) n'est **pas dessiné du tout** : `GET /v1/recruitment/candidates` rend `[]` sur compte frais (mesuré) — il faut un tick du monde pour peupler la pool. |
| Bouton retour « ‹ » (M23) | — | navigation cliente. |
| *(absent de la maquette)* « relever de ses fonctions » | **aucune route** | 0 route de retrait/licenciement (cf. E6). `POST /v1/lieutenants/:id/reassign` (`:257`) **déplace**, il ne retire pas. |
| *(absent de la maquette)* résoudre une exception | `POST /v1/exceptions/:id/resolve` (`exceptions.controller.ts:109`) | Route joueur vivante, rattachée à un `lieutenant_id` — cf. Q1. |
| *(absent de la maquette)* décision d'autonomie / de dérive / d'ordre permanent | `POST /v1/lieutenants/:id/autonomy/decision` (`:358`), `…/signal-drift/decision` (`:422`), `…/standing-order` (`:497`), `…/standing-order/decision` (`:537`) | 4 routes joueur sans aucun geste dessiné ni sur cet écran ni sur l'écran 2. |

**Bilan actions** : 19 routes joueur dans les 2 modules du domaine (6 `GET`, 13 `POST` — compte
ci-dessous), **2 gestes** dessinés sur cet écran, **1 CTA** dont le vocabulaire ne correspond pas.

---

## Table de couverture complète

`●` = présent · `–` = absent · `B⁻` = en base, non projeté · `Baux` = clé rendue par une route
d'un AUTRE domaine.

| # | information | B | M | statut | classe |
|---|---|---|---|---|---|
| 1 | `lieutenants[].lieutenant_id` — handle du rang | ● | ● | le rang est cliquable, l'id le porte | ✔ |
| 2 | `lieutenants[].archetype` — le métier | ● | ● (M10) | valeur ✔, **libellé FR absent** | ✔ / E11 |
| 3 | `lieutenants[].op_state_band` | ● | – | disponible, non dessinée | **Q2** |
| 4 | `lieutenants[].rule_count_band` | ● | – | disponible, non dessinée | **Q6** |
| 5 | `lieutenants[].tenure_bucket` | ● | – | disponible, non dessinée | **Q4** |
| 6 | `me.handle` — nom du Don | ● | ● (M05) | affiché « Don V. » vs `jd-1787683680` mesuré | ✔ (forme à arbitrer) |
| 7 | `me.account_id` | ● | – | plomberie | **Q13** |
| 8 | `me.email` | ● | – | plomberie | **Q13** |
| 9 | `me.lifecycle_state` | ● | – | plomberie | **Q13** |
| 10 | `me.locale` | ● | – | plomberie | **Q13** |
| 11 | `Baux flag-review.cards[].lieutenant.name` | ● | ● (M09) | nom projeté ailleurs, pas ici | **E1** |
| 12 | `Baux task-categories[].delegation_state` | ● | ● (M11) | vraie source du chip | **E7** |
| 13 | `Baux task-categories[].delegated_lieutenant_ref` | ● | ● (M11) | idem | **E7 / Q5** |
| 14 | `Baux interior.buildings[].lieutenant_ids` | ● | – | le lieu du lieutenant | **Q3** |
| 15 | `Baux interior.buildings[].operational_type` | ● | – | le type de lieu | **Q3** |
| 16 | `Baux world/districts[].name_canonical` | ● | ● (M07) | rend `Verge-A`, pas « Le Verge » ; et rien ne dit lequel est le mien | **E8** |
| 17 | `Baux exceptions[].lieutenant_id` | ● | – | qui réclame une décision | **Q1** |
| 18 | `Baux dealers[].substance` | ● | ● (M17) | « Vendeur » sourçable ; « Guetteur » non | partiel |
| 19 | `Baux couriers[].vehicle_type` | ● | ● (M17) | « chauffeur » sourçable | partiel |
| 20 | **Loyauté %** (M13) | B⁻ | ● | bande 4 valeurs en base, jamais projetée, NULL au kit | **E2** |
| 21 | **Chip « Retiré »** (M12) | – | ● | 0 écrivain de production des deux côtés | **E6** |
| 22 | **Rattachement homme → lieutenant** (M15) | – | ● | colonne inexistante | **E3** |
| 23 | **Nom de l'homme** (M16) | – | ● | colonne inexistante | **E4** |
| 24 | **Lieu de l'homme** (M18) | B⁻ | ● | en base, hors des 7 clés de `DealerProjection` | **E9** |
| 25 | **Résumé d'équipe** « 4 gros bras » (M20) | – | ● | ni entité ni compte | **E5** |
| 26 | **Compte de lieutenants** « 3 » (M02) | ● dérivé | ● | longueur de `lieutenants[]`… **moins les retirés**, qui n'existent pas | ✔ partiel |
| 27 | **Compte d'hommes** « 11 » (M03) | – | ● | somme de `dealers[]`+`couriers[]` sans rattachement | **E5 (même cause)** |
| 28 | **Bandeau « siège libre »** (M21) | B⁻ | ● | plafond=5, jamais projeté | **E10** |
| 29 | **CTA « recruter au Verge d'Or »** (M22) | ● (route) | ● | route ✔, vocabulaire ✕ | à consigner |
| 30 | Titre « La Famille » (M01) | – | ● | statique, sans clé i18n | ASSUMÉ (UI) |
| 31 | Marqueur « Vous » (M06) | – | ● | statique | ASSUMÉ (UI) |
| 32 | Buste homburg du Don (M04) | – | ● | asset client | ASSUMÉ (UI) |
| 33 | Buste fedora du lieutenant (M08) | – | ● | asset client, invariant | ASSUMÉ (UI) |
| 34 | Buste casquette de l'homme (M19) | – | ● | asset client | ASSUMÉ (UI) |
| 35 | Rang « actif » / sélectionné (M14) | – | ● | état d'UI local | ASSUMÉ (UI) |
| 36 | Bouton retour « ‹ » (M23) | – | ● | navigation | ASSUMÉ (UI) |

### Contrôle d'arithmétique

- **|clés B| entrant dans la table** = 19
  (5 de `GET /v1/lieutenants` + 5 de `GET /v1/me` + 9 clés `Baux` : `flag-review` 1,
  `task-categories` 2, `interior` 2, `world/districts` 1, `exceptions/queue` 1, `dealers` 1,
  `couriers` 1) → lignes **1 à 19**.
- **|éléments M non appariés|** = 17 → lignes **20 à 36**.
- **19 + 17 = 36 = nombre de lignes.** ✔

Deux précisions d'honnêteté sur ce compte :
- **M11** (chip de délégation) et **M17** (métier de l'homme) reçoivent **2 clés B chacun** —
  d'où 2 lignes chacun (12/13 et 18/19). Le nombre de lignes reste juste ; ce n'est pas
  strictement « une ligne par information ».
- **Les 23 identifiants M01→M23 apparaissent tous** dans la table (contrôle : union des Mxx
  cités = 23 distincts). Les lignes **26 et 27** (les deux comptes de l'en-tête) sont classées
  côté M parce qu'elles s'apparient à une **dérivation** (longueur d'un tableau), pas à une clé
  nommée.

*(Hors table, mesurées et annexées mais sans information dessinée sur CET écran : les
17 clés de `GET /v1/lieutenants/:id` — l'écran 2 —, les 12 clés de `POST /v1/session/open`,
`economy/wallet`, `supply-chain/graph`, `autonomy-reports`, `recruitment/*`. Elles alimentent
les questions Q7 à Q12.)*

---

## Annexes

### Annexe 1 — Routes du domaine (compte + ancres)

**Contrôleurs** : 144 fichiers `*.controller.ts` ; **75** hors `-test.controller.ts` et hors
`*admin*` (oracle Python, `os.walk` sur `services/game-back/src`).

**Modules nommés au dossier — 19 routes joueur, toutes sous `JwtAuthGuard` (vérifié ligne à ligne) :**

`operational/lieutenant/lieutenant.controller.ts` (10)
| ligne | verbe | chemin |
|---|---|---|
| :181 | POST | `/v1/lieutenants` |
| :221 | POST | `/v1/lieutenants/:id/behavior-script` |
| :257 | POST | `/v1/lieutenants/:id/reassign` |
| :294 | POST | `/v1/lieutenants/:id/behavior-script/validate` |
| :317 | **GET** | `/v1/lieutenants` ← **la route de cet écran** |
| :334 | **GET** | `/v1/lieutenants/:id` |
| :358 | POST | `/v1/lieutenants/:id/autonomy/decision` |
| :422 | POST | `/v1/lieutenants/:id/signal-drift/decision` |
| :497 | POST | `/v1/lieutenants/:id/standing-order` |
| :537 | POST | `/v1/lieutenants/:id/standing-order/decision` |

`operational/lieutenant/autonomy/autonomy-reports.controller.ts` (2) — `:40` GET `/v1/autonomy-reports`, `:55` POST `…/issues/:issueId/resolve`.

`operational/recruitment/recruitment.controller.ts` (7) — `:62` GET `candidates`, `:73` GET `quests`, `:85` GET `quests/:id`, `:96` POST `quests`, `:115` POST `quests/:id/advance`, `:137` POST `quests/:id/hire`, `:159` POST `quests/:id/abandon`.

**Complément au-delà des modules nommés** — balayage `grep -ci lieutenant` sur les 75 contrôleurs
joueur : **13 fichiers** en contiennent (`lieutenant.controller` 127, `reputation` 19,
`engagements` 18, `meta-progression` 15, `execution-plan` 10, `horizon-tier-advancement` 7,
`legal` 5, `recruitment` 5, `exceptions` 2, `insurance` 2, `random-world` 2, `annealing` 1,
`hl-card` 1). ⚠️ Ce motif **RATE `autonomy-reports.controller.ts`** (0 occurrence du mot alors que
c'est un contrôleur du module) et **rate `flag-discipline.controller.ts`** — les deux ont été
trouvés par le chemin de fichier et par la trace de `lieutenant.name`. *Un balayage sur le mot du
domaine ne suffit pas ; il faut aussi le chemin.*

**Les 10 routes hors domaine qui portent de la donnée pour cet écran :**
`GET /v1/me` (`auth.controller.ts:343`) · `POST /v1/session/open` (`session.controller.ts:56`) ·
`GET /v1/flag-review` (`flag-discipline.controller.ts:69`) ·
`GET /v1/meta/task-categories` (`meta-progression.controller.ts:89`) ·
`GET /v1/city/district/:id/interior` (`district-interior.controller.ts:87`) ·
`GET /v1/exceptions/queue` (`exceptions.controller.ts:66`) ·
`GET /v1/operational/dealers` (`selling.controller.ts:116`) ·
`GET /v1/operational/couriers` (`distribution.controller.ts:97`) ·
`GET /v1/world/districts` (`world.controller.ts:39`, **public, sans garde** — délibéré, `:36-38`) ·
`GET /v1/i18n/bundle` (`i18n.controller.ts:32`, **public**, délibéré `:27-29`).

### Annexe 2 — Corps réels (`mesures/`)

Compte frais `jd-1787683680`, créé le 2026-08-25T18:48:00Z. Commandes complètes dans
`mesures/COMMANDES.md`. **Tous les fichiers `.json` validés par `json.load`.**

⚠️ **Piège de mesure rencontré** : `curl -s … > fichier.json` **nu** a écrit un fichier
**tronqué à 200 octets** terminé par `…` (`06-recruitment-candidates.json`, vraie taille 205).
La couche d'affichage du proxy s'applique aussi à une **redirection**. Toutes les mesures ont
été refaites via `rtk proxy curl`.

| fichier | route | résultat |
|---|---|---|
| `03-lieutenants.json` | `GET /v1/lieutenants` | **2 lignes** (kit de départ), 5 clés chacune |
| `04-lieutenant-detail.json` | `GET /v1/lieutenants/:id` | 17 clés |
| `05-me.json` | `GET /v1/me` | 5 clés — `handle: "jd-1787683680"` |
| `02-session-open.json` | `POST /v1/session/open` | 12 clés ; `queue[0].lieutenant_id` présent |
| `09-flag-review.json` | `GET /v1/flag-review` | `{cards: [], routine_pending_count: 0, batch_confirm_available: false}` — **vide sur compte frais** |
| `06/07-recruitment-*.json` | candidats / quêtes | `[]` / `[]` — **vides sur compte frais** |
| `08-autonomy-reports.json` | rapports d'autonomie | `[]` |
| `10/11-dealers/couriers.json` | hommes | `[]` / `[]` — le kit ne donne aucun dealer-spot |
| `12-i18n-bundle-fr.json` | bundle FR | **67 messages** (63 `error.*`, 4 `game.*`) |
| `13-world-districts.json` | 18 districts | 7 clés ; profils `glass, lattice, spine, stack, tidewater, verge` |
| `16-district16-interior.json` | Verge-A | 9 clés ; **4 bâtiments du joueur**, `lieutenant_ids` peuplé sur le lab |
| `17-task-categories.json` | catégories | 4 catégories, toutes `delegation_state: "SELF"`, `delegated: []` |
| `18-exceptions-queue.json` | file | 1 exception, `lieutenant_id` présent |

**Kit de départ mesuré** : 4 bâtiments (`lab`, `stash`, `front_shop`, `cash_safehouse`) sur un
district `verge` (`onboarding-grant.service.ts:107,120-124`), **2 lieutenants COOK** tous deux
assignés au lab (`:362,377`), 1 exception pré-semée, 1 000 000 cents.

### Annexe 3 — Valeurs possibles par clé, avec la contrainte source

**`GET /v1/lieutenants` → `payload.data.lieutenants[]` — 5 clés** (mesuré ; épinglé par
`tests/e2e/operational/lieutenant_roster_list.spec.ts:369-371`)

| clé | domaine | contrainte source |
|---|---|---|
| `lieutenant_id` | uuid opaque | `db/schema/lieutenant.ts:83` (uuidv7) |
| `archetype` | `COOK\|SECURITY\|LOGISTICS\|BOOKKEEPER\|LAUNDERING\|DISTRIBUTION\|UNKNOWN` | `lieutenant.projection.service.ts:83` (`ArchetypeBand`) ; dérivé de `role_id` |
| `op_state_band` | `SETTLING\|PAUSED\|ACTIVE\|IDLE` | `lieutenant.projection.service.ts:98` ; précédence documentée `:93-97` |
| `rule_count_band` | `NONE\|FEW\|MANY` | `lieutenant.projection.service.ts:102` (0 / 1-5 / 6+) |
| `tenure_bucket` | `FRESH\|ACCLIMATED\|SEASONED\|SENIOR\|ENTRENCHED` | `lieutenant.projection.service.ts:107` → `TenureInertiaBucketComposite` (`tenure-inertia.ts`) |

⚠️ **Docstrings périmés** : `lieutenant.controller.ts:307-309` et
`lieutenant.projection.service.ts:189-195` annoncent **4 champs** (« EXACTLY 4 fields ») alors
que la réponse mesurée en porte **5** ; le commentaire de `rosterRows` (`:361`) dit encore
« maps each to the 4-field band surface ». La spec E2E, elle, a été mise à jour (`:370`
« Phase-11 (A5) GREW the row 4 → 5 »). *Trois énoncés datés, dans deux fichiers, non repris.*

**`GET /v1/lieutenants/:id` — 17 clés** (mesuré) : `archetype`, `granted_role`
(`advisory\|executor\|delegated_owner\|cohort_overseer`, `:87`), `mode` (`tasked\|delegated`,
`:91`), `op_state_band`, `rule_count_band`, `tenure_bucket`, `script_revision_cost`
(`COST_1..COST_MAX`), `reassignment_disruption` (`DISRUPT_SHORT..DISRUPT_MAX`),
`role_efficiency_bonus` (`BONUS_NONE..BONUS_CAP`), `reassign_availability`
(`AVAILABLE\|ON_COOLDOWN`, `:124`), `budget_bands` (map, `depleted\|low\|nominal\|full`),
`cue_bands` (map, `dormant\|partial\|reliable\|dominant`), `drift_phase`
(`DIRECT_ALIGNED\|DRIFTING\|INCIDENTAL_LOCKED\|RESETTING`), `standing_order`
(`{freshness: NONE\|FRESH\|EXPIRES_SOON\|EXPIRED, promotion_suggested: bool}`),
`trust_budget_bucket` (`low\|standard\|high`), `flag_frequency_band`
(`none\|occasional\|frequent`), `script_source` (texte libre du joueur).

**`GET /v1/me` — 5 clés** : `account_id` (uuid), `handle` (= callsign, `varchar(24)`,
`schema/player.ts:34`), `email` (nullable), `lifecycle_state` (`ACTIVE` mesuré), `locale`
(`varchar(8)`).

**`lieutenant` — 24 colonnes, couverture par les deux projections joueur** (oracle Python sur
`db/schema/lieutenant.ts`)

| # | colonne | statut |
|---|---|---|
| 1 | `lieutenant_id` | ● projeté (roster + détail) |
| 2 | `player_id` | interne — correct |
| 3 | **`name`** | **B⁻** — non sélectionné par le repo (cf. E1) |
| 4 | **`name_locale`** | **B⁻** |
| 5 | `role_id` | → `archetype` (bande) |
| 6 | **`source`** (`saltline\|defector\|civilian`) | **B⁻** — « d'où vient ce lieutenant » |
| 7 | `tenure_score` | → `tenure_bucket` |
| 8 | **`recruited_at`** | **B⁻** — lu pour l'`ORDER BY` du roster (`lieutenant.repository.ts:444`), jamais rendu ; **interdit par `FORBIDDEN_KEYS`** |
| 9 | `succession_horizon` | BO-only assumé (`db/schema/lieutenant.ts:113`) |
| 10 | **`primary_or_understudy`** | **B⁻** — le kit crée 1 primary + 1 understudy (`onboarding-grant.service.ts:9`) et rien ne le montre |
| 11 | **`primary_for_role_id`** | **B⁻** |
| 12 | `understudy_sync_pct` | BO-only assumé (`:123`) |
| 13 | **`extinction_state`** | **B⁻ et sans écrivain** (cf. E6) |
| 14 | `burst_magnitude` | BO-only assumé (`:129`) |
| 15 | `behavior_script_id` | interne ; `source` → `script_source` (détail) |
| 16 | `granted_role` | ● détail — constant `'executor'` en prod |
| 17 | `mode` | ● détail — constant `'delegated'` en prod (cf. E7) |
| 18 | **`assigned_building_id`** | **B⁻** — entrée de bande seulement ; **interdit par `FORBIDDEN_KEYS`** |
| 19 | `delegation_paused` | → `op_state_band` |
| 20 | **`target_building_id`** | **B⁻** ; **interdit par `FORBIDDEN_KEYS`** |
| 21 | `tenure_reset_at_tick` | → `reassign_availability` |
| 22 | `settling_until_tick` | → `op_state_band` |
| 23 | **`loyalty_seed_bucket`** | **B⁻** (cf. E2) |
| 24 | **`recruitment_quest_id`** | **B⁻** — « pourquoi ce lieutenant est comme ça » (`db/schema/lieutenant.ts:165-166`) |

⇒ **11 colonnes sur 24 sont B⁻** ; 3 d'entre elles sont dessinées par la maquette (`name`,
`loyalty_seed_bucket`, et — pour les hommes — l'équivalent `dealer.home_building_id`).

**Autres tables du domaine `lieutenant.ts`** (colonnes relevées, non balayées pour la projection —
cf. Non vérifié) : `behavior_script` (6), `jurisdiction_boundary` (3), `lieutenant_cue_registry`
(3), `lieutenant_task_exposure` (7 — `exposure_tier`, `aversion_flag`… la matière du « Préfère /
Rejette » de l'écran 2), `standing_order` (11), `veto_assignment` (3).
`recruitment.ts` : `recruitment_candidates` (9, dont `profile` jsonb) et `recruitment_quests` (14).

⚠️ `GET /v1/recruitment/candidates` rend le **type de ligne BRUT de la table**
(`Promise<{candidates: RecruitmentCandidateRow[]}>`, `recruitment.controller.ts:67`, où
`RecruitmentCandidateRow = typeof recruitmentCandidates.$inferSelect`, `db/schema/recruitment.ts:156`)
— y compris `profile` jsonb, `surfaced_at_game_day`, `expires_at_game_day`. C'est une exception à
R2.2 sur une route joueur ; je la signale, je ne la tranche pas. Le `profile` contient
`{name, district_familiarity ∈ LOW\|MEDIUM\|HIGH, experience ∈ NONE\|SOME\|VETERAN, ask_band ∈
LOW\|FAIR\|HIGH}` (`civilian-recruitment.service.ts:195-200`, `defector-…:125-130`,
`saltline-…:189-194`) — **avec le même placeholder TD-046** (« Civilian Prospect »,
« Defector Contact (…) », « Saltline Candidate #N »).

### Annexe 4 — Inventaire M (source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar.html`, **lignes 207-246**)

Le rendu ratifié `Tools/juge-visuel/famille/ecran-canon.png` (**900×1752**, RGB) **correspond au
HTML** — il est coupé en bas : le rang « Enzo Greco / Retiré » (`:240-242`) et le bandeau
« siège libre » (`:244`) sont dans le HTML, hors du cadrage du PNG. J'ai inventorié sur le HTML.

| id | élément (lignes HTML) | texte / valeur | représente |
|---|---|---|---|
| M01 | `<h3>` (:211) | « La Famille » | titre d'écran |
| M02 | `.tete .sous` (:211) | « 3 lieutenants » | **compte de lieutenants actifs** — 4 rangs dessinés, 1 « Retiré » ⇒ **la maquette EXCLUT le retiré du compte** |
| M03 | `.tete .sous` (:211) | « 11 hommes » | **compte d'hommes** — 3 nommés + 4 + 1 + 3 = 11, arithmétique vérifiée |
| M04 | `.medl.don` (:213) | buste homburg | identité visuelle du joueur |
| M05 | `.don-rang .nom` (:214) | « Don V. » | **nom du joueur** |
| M06 | `.don-rang .role` (:214) | « Vous » | marqueur d'identité |
| M07 | `.don-rang .role` (:214) | « Le Verge » | **district du joueur** |
| M08 | `.rang .medl` (:216, 227, 234, 240) | buste fedora | identité visuelle du lieutenant — **invariante** (le même buste pour les 4) |
| M09 | `.rang .nom` (:217, 228, 235, 241) | « Salvatore « Sal » », « Vito Marchetti », « Rosa Bellini », « Enzo Greco » | **nom du lieutenant** |
| M10 | `.rang .role` (:217, 228, 235, 241) | « Comptable », « Sécurité », « Blanchiment », « Logistique » | **archétype, libellé FR** |
| M11 | `.chip.del` / `.chip.self` (:217, 228, 235) | « Délégué » (cyan) / « Direct » (neutre) | **état de délégation** |
| M12 | `.chip.ret` + `style="opacity:.55"` + `.medl.dim` (:240, :242) | « Retiré » (braise) + rang grisé | **lieutenant retiré** |
| M13 | `.rang .etat b` + `span` (:218, 229, 236) | « 82% », « 64% », « 91% » / « Loyauté » | **loyauté, en POURCENTAGE** |
| M14 | `.rang.actif` (:216) | bordure or + fond éclairci | rang sélectionné |
| M15 | `.arbre` (:215) + `.equipe` (:219, 230, 237) | fil laiton + embranchements | **rattachement hiérarchique lieutenant → ses hommes** |
| M16 | `.homme .nom` (:221, 223, 225) | « Nino », « Carlo », « Luca » | **nom de l'homme** |
| M17 | `.homme small` (:221, 223, 225) | « Vendeur », « Vendeur », « Guetteur » | **métier de l'homme** |
| M18 | `.homme .ou` (:221, 223, 225) | « Coin de la 3ᵉ », « Devant Rizzo », « Toit des docks » | **lieu de l'homme** |
| M19 | `.medl.petit` (:220, 222, 224) | buste casquette | identité visuelle de l'homme |
| M20 | `.eq-chip` (:231, 232, 238) | « 4 gros bras », « 1 chauffeur », « 3 laveurs » | **effectif agrégé par type** |
| M21 | `.vide` (:244) | « Un siège libre à la table » | **place restante au roster** |
| M22 | `.vide b` (:244) | « recruter au Verge d'Or » | **CTA de recrutement, nommé par un LIEU** |
| M23 | `.retour` (:211) | « ‹ » | navigation retour |

**23 éléments**, dont **16 porteurs d'une information qui exige une source back** (tous sauf
M01, M04, M06, M08, M14, M19, M23).

**Valeurs codées en dur qui exigent une source ou un écart assumé** : les 3 pourcentages de
M13, les 3 comptes de M20, les 2 comptes de M02/M03, les 4 noms de M09, les 3 noms + 3 lieux
de M16/M18, le « Le Verge » de M07. *Sans arbitrage, le front les inventera.*

### Annexe 5 — Non vérifié

1. **`GET /v1/flag-review` mesuré à VIDE** (`cards: []`). Sa clé `cards[].lieutenant.name` est
   établie par **lecture de code** (`flag-discipline.service.ts:282` ← repo `:616` ←
   `lieutenant.name`), pas par un corps observé. **DÉDUIT.** *Mesure qui trancherait* : faire
   lever un flag (tick `FLAG_DISCIPLINE` ou action réelle) puis relire la route.
2. **`GET /v1/operational/dealers` et `/couriers` mesurés à VIDE.** Leurs jeux de clés (7 et 5)
   viennent des interfaces `DealerProjection` (`selling.projection.service.ts:63-88`) et
   `CourierProjection` (`distribution.projection.service.ts:285-303`). **DÉDUIT.** *Mesure* :
   acheter un `dealer_spot` (`POST /v1/operational/building/purchase`, 1 000 000 cents
   disponibles), puis `POST /v1/operational/dealer/assign`. Non fait — hors du périmètre de
   l'écran et coûteux en écritures sur la stack de l'user.
3. **`GET /v1/recruitment/candidates` et `/quests` mesurés à VIDE.** La pool de candidats est
   peuplée par un tick du monde (`civilian/defector/saltline-recruitment.service.ts`). **Je n'ai
   donc jamais observé un corps de quête ni la réponse de `hire`** (celle qui porte
   `loyalty_seed_bucket` + `hire_quality_bucket`, `recruitment.controller.ts:144`). *Mesure* :
   attendre / déclencher le tick de surfacing, puis dérouler `quests` → `advance` → `hire`.
4. **`loyalty_seed_bucket` jamais observé non-NULL.** Les 4 valeurs viennent de l'enum de la
   migration ; leur DISTRIBUTION réelle (quel parcours donne `fractured` ?) n'a pas été mesurée
   — `computeLoyaltySeedBucket` (`recruitment-quest.service.ts:525`) non lu dans le corps.
5. **Balayage de projection non fait sur les 5 autres tables du domaine** (`standing_order`,
   `lieutenant_task_exposure`, `veto_assignment`, `jurisdiction_boundary`,
   `lieutenant_cue_registry`) : j'ai relevé leurs colonnes, je n'ai **pas** vérifié colonne par
   colonne ce que les projections en rendent. Elles alimentent surtout l'écran 2 (fiche).
   *Un balayage qui ne classe pas chaque hit reste DÉDUIT.*
6. **`GET /v1/lieutenants/:id` mesuré sur un lieutenant NEUF uniquement** ⇒ `budget_bands` et
   `cue_bands` sont `{}`, `standing_order.freshness` est `NONE`, `drift_phase` est
   `DIRECT_ALIGNED`. **Je n'ai vu aucune de ces clés dans un état non-neutre** — je connais leur
   domaine par le type, pas par observation.
7. **Le PNG ratifié est coupé** avant le rang « Retiré » et le bandeau « siège libre ». Ces deux
   éléments sont dans le HTML ; je n'ai donc **pas** de preuve visuelle qu'ils font partie de ce
   que l'user a ratifié. *Mesure* : demander à l'user, ou re-rendre le HTML en pleine hauteur.
8. ~~Le mot « Guetteur » (M17)…~~ **MESURÉ après coup** : `courier_role_type =
   ('courier','runner')` (`operational_chain.ts:46`), `dealer_state =
   ('working','idle','absent','compromised')` (`:52`), `vehicle_type =
   ('foot','bike','car','refrigerated_van')` (`:47`). **Aucune valeur « guetteur / lookout ».**
   Ce point est donc COMPTÉ, pas déduit. *(Restent non balayés : les enums de métier des autres
   domaines — `ash`, `grow`, `laundering` — au cas où un « laveur » y vivrait.)*
9. **Aucun tick du monde n'a tourné** pendant mes mesures (`CITYSIM_CONTINUOUS_LOOPS` non
   vérifié sur cette stack). Tout ce que je rapporte est donc l'état d'un compte **à J+0,
   phase DAWN** (`16-district16-interior.json` → `day_phase: "DAWN"`, `session/open` →
   `opened_game_day: 1`).
