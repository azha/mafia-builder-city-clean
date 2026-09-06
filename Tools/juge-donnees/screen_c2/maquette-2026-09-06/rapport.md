# Juge données ⊥ — ㊵ « La filière » (le blanchiment) — mode **maquette** — 2026-09-06

> Juge à contexte vierge. Je n'ai ni dessiné la maquette ni construit l'écran, et je n'ai lu ni les
> notes d'implémentation, ni aucun rapport de juge (il n'en existe aucun pour cet écran).
> **Aucune stack montée, aucun `curl`, aucun test** (gate E2E en cours) : `B` vient des corps réels
> déjà capturés + de la lecture du back. Tout ce qui exigerait la pile est en §Non vérifié avec la
> commande qui trancherait.
> Ancres back : `/home/erutheone/project/mafia-clean-city/services/game-back/src` et `tests/e2e`.
> Commandes + sorties : `mesures/commandes-et-sorties.md`.

## En une phrase

La maquette montre **4 informations sur les 11 que les 5 routes joueur du domaine servent** ;
**12 écarts à consigner dont 3 bloquants** — le CTA nominal est éteint pour une raison mesurablement
fausse depuis le 2026-08-31, le badge « écart » par étape n'a aucune source, et le compteur d'écarts
n'a pas de grandeur derrière ; **6 questions « passé à côté ? »**, dont deux (`has_cash`, `terminal`)
que la maquette elle-même appelle sans le savoir.

---

## Écarts à consigner (mode maquette — table des écarts ASSUMÉS pour le juge visuel qui suit)

| # | information / élément | statut | preuve mesurée |
|---|---|---|---|
| **É1** | **M15+M16 — le CTA nominal « INJECTER — IMPOSSIBLE » + « il faut une planque, et *rien n'en crée jamais* »** | **BLOQUANT — dessiné CONTRE la mesure** | `safehouses` a un écrivain de production : `laundering-persistence.service.ts:82` (`createSafehouse`), appelé par `onboarding-grant.service.ts:411` pour tout bâtiment `cash_safehouse` du kit (`GRANT_BUILDINGS` = `onboarding-grant.service.ts:142-147`, l'entrée `{ operationalType: 'cash_safehouse', buildingTypeIndex: 1 }`), avec l'amorce d'**un slot plein** (`:408-411`). Compté : **1** appelant de production, **0** avant le lot planque. Le parcours joueur l'assert nommément : `tests/e2e/operational/filiere_blanchiment.parcours.spec.ts:88-91` (« le grant a posé une LIGNE safehouses ») puis `:104-113` (`inject` → **200**, corps de succès exigé). ⇒ **tout joueur neuf a une planque et peut injecter.** Le même faux est répété au cadre 140 (« Aucun chemin ne mène à une planque ») et au cadre 142 (lot L1). |
| **É2** | **M14 — le badge « écart » posé sur l'étape 3 (cadre 138)** | **BLOQUANT — dessiné sans source** | `deviation_active` n'est rendu que par `GET /v1/operational/laundering/:nodeId` ; son entrée de repository filtre `eq(launderingNode.stage_index, 1)` (`laundering.repository.ts:652`) ⇒ le contrôleur **404** pour toute étape ≠ 1 (`laundering.controller.ts:188-192`). Et le drapeau est celui du **front-shop hôte du nœud Stage-1** (`laundering.projection.service.ts:107,119` — `building.audit_pin_expires_at`), jamais celui de l'étape dessinée. |
| **É3** | **M08 — le compteur « écarts » (`00` / `01`)** | **BLOQUANT — grandeur inventée** | B ne sert **aucun compte** : un seul booléen, sur un seul nœud (É2). Un compteur sur 4 étapes ne peut valoir que 0 ou 1, et seulement si le client interroge le nœud Stage-1. Aucune route du domaine ne rend un cardinal d'écarts. |
| **É4** | **M10/M11/M12 — l'échelle dessinée `dirty → partial → mostly_clean → clean` sur 4 étapes** | **IMPORTANT — état non atteignable aux valeurs livrées** | `pipelineCleanlinessForStage(s) = base + (s−1)·gain` (`laundering-tunables.ts:147-154`), défauts `base=0.40` (`:121`), `gain=0.25` (`:132`) ; `cleanlinessBucket` : ≥0.85 CLEAN, ≥0.5 MOSTLY_CLEAN, ≥0.25 PARTIAL (`dwell-time.service.ts:294-299`). ⇒ étapes 1..4 = **PARTIAL / MOSTLY_CLEAN / CLEAN / CLEAN**, ce que le corps réel confirme **à l'identique** (`corps-reels/GET_operational_laundering.json`). `DIRTY` à l'étape 1 exigerait `base ∈ [0.20,0.25)` — dans la plage de registre (0.2..0.6), **pas** la valeur livrée. ⚠️ `DIRTY` reste atteignable sur `GET /:nodeId`, qui lit une AUTRE grandeur (É12). |
| **É5** | **cadre 138 entier — « La filière s'écarte de son profil »** | **IMPORTANT — état non reproductible par un joueur (forme E)** | `deviation = amountCents > 250 000 c` (`laundering.service.ts:153` ; seuil `laundering-tunables.ts:91`). La planque du grant contient **10 000 c** ; une planque **pleine** contient `slotCount(4) × slotCapacityCents(10 000)` = **40 000 c** (`laundering-persistence-tunables.ts:78,82`), et `inject` refuse tout montant supérieur au contenu (`laundering.service.ts:129-134`, message `:132`). **40 000 < 250 001.** Le chemin indirect est fermé aussi : un inject **conforme** écrit `samples=[B,B,B,B], latest=B` ⇒ z=0 ⇒ NOMINAL ⇒ jamais de pin (`laundering.service.ts:303-306`) ; écrivain unique de `transaction_profile` **compté : 1** (`laundering.repository.ts:473`) ; et le tick qui pose le pin est `NIGHTLY/2 UNCONFORMITY_LEDGERS` (`city_sim_scheduler.service.ts:399`), qui ne tourne pas hors staging. ⇒ tout est branché, l'appelant s'exécute, **et l'argument ne peut pas satisfaire le prédicat aux valeurs livrées**. |
| **É6** | **M09 — les 4 noms d'étape (« Le comptoir », « La blanchisserie », « Le garage », « Le notaire »)** | **IMPORTANT — dessiné sans source ⇒ lot back (forme F)** | Les 3 projections de blanchiment ne portent **pas** `building_id` : compté **0** dans `laundering.projection.service.ts` (contrôles positifs dans le même fichier : `has_cash` = 5, `deviation_active` = 3 ; et **9** occurrences de `building_id` dans le contrôleur voisin ⇒ le motif mord). Or le back **sait nommer un bâtiment** : `name_i18n` est servi par `GET /v1/me/buildings` (`player-buildings.controller.ts:66,89`) et par `GET /v1/operational/building/:id` (`real-estate.projection.service.ts:153`). ⇒ ce n'est pas « le back ne nomme pas », c'est « le nœud ne dit pas quel bâtiment il occupe ». **Exactement la forme F refermée un lot plus tôt pour la planque** (`erlang-stash.projection.service.ts:68-76` : « le repository SÉLECTIONNAIT déjà cette colonne et la projection la JETAIT ») — la CLASSE n'a pas été repassée sur la population. |
| **É7** | **M12 — la cuve remplie à 25 / 50 / 75 / 100 %** | **IMPORTANT — à ASSUMER explicitement** | La bande a 4 membres fermés (`city-event-bus.ts:331`) ; la maquette les rend en **hauteur de remplissage continue**. Le mapping bande→hauteur discrète est légitime (R2.2 interdit le scalaire, pas la représentation ordinale) — **mais il doit être écrit comme tel**, sinon le pourcentage se lira comme une grandeur servie et le premier lot qui « corrigera » la jauge inventera un scalaire. |
| **É8** | **`blanchiment.purete.partial` n'existe dans aucune des deux locales** | **MINEUR — résolveur incomplet** | Compté : `blanchiment.purete.partial` = **0** ; contrôles positifs `blanchiment.purete.mostly_clean` = **2**, `blanchiment.purete.a_demi_propre` = **2** (`i18n/string_table.ts`, 2 blocs de locale `en`/`fr`). La famille anglicisée `{clean, dirty, mostly_clean}` couvre **3 des 4** membres du domaine ; la famille francophone `{sale, a_demi_propre, presque_propre, propre}` (+ `proprete_inconnue`) couvre 4/4. ⇒ selon la famille choisie, le résolveur **ne sait pas afficher la bande que le nœud Stage-1 produit précisément aux valeurs livrées** (`PARTIAL`, É4). |
| **É9** | **M11 — le libellé dessiné « à moitié »** | **MINEUR — diverge de la chaîne servie** | `blanchiment.purete.a_demi_propre` = « **À demi propre** » (`string_table.ts:1702`, fr). |
| **É10** | **M18 — « la propreté est la SEULE grandeur servie : ni montant, ni durée, ni frais »** | **MINEUR — proposition partiellement fausse** | Vraie des **montants** : aucun cent sur aucune des 5 routes du domaine (vérifié clé par clé, annexe 3). Fausse au pied de la lettre : la liste sert aussi `stage_index` (un rang), `terminal` et `has_cash` (deux drapeaux). ⚠️ Cette phrase est déjà une **chaîne servie** (`filiere.bloc.la_proprete_est_la_seule_grandeur_servie_ni_montant_ni_duree_ni_frais`, `string_table.ts:739` en / `:1582` fr) — la corriger touche le back, pas seulement la maquette. |
| **É11** | **cadres 139 + 142 — « la chaîne casse au premier maillon », « 04 maillons / 04 cassés / 00 joueurs servis »** | **MINEUR (cadre de diagnostic) — 3 des 4 maillons sont refermés** | **M1 `safehouses`** : refermé (É1). **M2 `laundering/inject`** : refermé transitivement — le parcours exige **200** (`filiere_blanchiment.parcours.spec.ts:104-113`). **M3 `transaction_profile`** : refermé — écrit **inconditionnellement** par `applyInject` (`laundering.repository.ts:470-473`). **M4 `audit_pin`** : encore mort en pratique — mais **pas pour la raison écrite** (« posée uniquement sur un bâtiment promu ») : `listPromoted` exige `ownership IN ('player','leased')` + `structural_state='operational'` + `transaction_profile IS NOT NULL` (`unconformity.repository.ts:130-136`), le grant pose les deux premières (`onboarding-grant.repository.ts:66,91-92`) et l'inject pose la troisième ⇒ **le front-shop EST promu après un inject**. Les vrais bloquants sont É5 (z=0 / seuil inatteignable) et le tick absent. ⇒ le compteur « 04 cassés » est faux de 3, et la cause du 4ᵉ est mal nommée. |
| **É12** | **`cleanliness_band` porte DEUX grandeurs différentes sous le même nom** | **IMPORTANT — la maquette n'en représente qu'une** | Liste + pipeline : `cleanlinessBucket(pipelineCleanlinessForStage(stage_index))` — fonction du **RANG**, stable (`laundering.projection.service.ts:145` et `:159`). `GET /:nodeId` : `cleanlinessBucket(row.cleanliness_at_output)` — le float que **System 8 recalcule chaque minute** (`:117`). Le fichier le dit lui-même (`:127-130` : « distinct de la cleanliness_at_output que System 8 recompute chaque minute »). ⇒ un écran qui liste puis ouvre le détail d'une étape peut montrer **deux bandes différentes pour le même nœud**, sans qu'aucune ne soit fausse. La maquette n'a qu'une représentation de propreté (M11/M12) et ne dit pas laquelle. |

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `has_cash` — `GET /v1/operational/laundering` **et** `…/:nodeId/pipeline` (`laundering.projection.service.ts:49,82`) | « il y a de l'argent **en attente à cette étape** » (présence, jamais les cents) | **utile ici, et c'est la meilleure réponse disponible au « Jamais combien il y a dedans » de l'encart** : pas le montant, mais **où** l'argent est dans la chaîne. Le corps réel le prouve porteur d'information : sur les 4 nœuds du compte de démo, **un seul** est à `true` (l'étape 2) — l'écran dessiné ne le montre nulle part | ★★★ |
| **Q2** | `terminal` — mêmes deux routes (`:49,79`) | « c'est **l'étape qui verse au portefeuille** » (le nœud de release, sans arête sortante) | utile : c'est la seule étape où quelque chose SORT, et c'est **aussi le point d'accroche** de la suivante (`addStage` refuse un nœud qui n'est pas la queue — `laundering.service.ts` §addStage). Le cadre 141 explique ce mécanisme sans jamais montrer le drapeau qui le rend lisible | ★★★ |
| **Q3** | `deviation_bucket` — **route voisine** `GET /v1/city/district/:id/unconformity` (`unconformity.projection.service.ts:46`, domaine fermé NOMINAL / LOW / HIGH / CRITICAL_DEVIATION, + `audit_pin_active` `:44`) | **l'AMPLEUR de l'écart**, par bâtiment | **c'est exactement ce que le lot L4 de la maquette déclare manquant** (« un booléen sans cause ni ampleur ») — l'ampleur **existe déjà**, sur une route joueur livrée. Il ne manque que la clé de jointure (É6) | ★★★ |
| **Q4** | `building_id` — rendu par `POST /v1/operational/laundering/stage` **et par lui seul** (`laundering.controller.ts:150`) | quel bâtiment héberge l'étape qu'on vient de créer | utile — mais c'est surtout **la preuve que la donnée est là** : le back la rend à la création et l'oublie à la lecture. Le vrai geste est de la projeter sur les 3 lectures (É6, lot L-B1) | ★★★ |
| **Q5** | `load_bucket` — route voisine `GET /v1/city/district/:id/stash` (`erlang-stash.projection.service.ts:84`, EMPTY / LOW / NOMINAL / HIGH / FULL) | combien la **planque** a encore à injecter | utile ici : c'est la **seule magnitude disponible en amont** de la filière, et elle conditionne le CTA (un `EMPTY` explique un `INJECTER` grisé pour une raison **vraie**, à la place de É1) | ★★ |
| **Q6** | `deviation` — `POST /v1/operational/laundering/inject` (`laundering.controller.ts:115`) | « **cette injection-ci** a dépassé le profil déclaré » | utile : c'est un retour **immédiat sur le geste**, là où `deviation_active` est un état différé d'un tick nocturne. Réserve : inatteignable aux valeurs livrées (É5) | ★★ |
| — | `node` / `node_id` / `from_node_id` / `front_shop_id` / `safehouse_id` | des poignées opaques | **plomberie** — rien à montrer, tout à garder pour les appels | ☆ |
| — | `slot_count`, `blocking_band`, `high_blocking_alert` (stash) | l'état Erlang-B de la planque | **pas ici** : c'est l'écran planque | ☆ |

---

## Lots back suggérés (B⁻ dessiné, ou grandeur lue puis jetée — forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| **L-B1** | `building_id` → les **3** projections de blanchiment | `laundering_nodes` (`db/schema/pipeline_and_laundering.ts:20`, `notNull()`) | **M09** (les 4 noms) | compté **0** dans `laundering.projection.service.ts` / contrôle positif **9** dans le contrôleur. Précédent EXACT déjà refermé pour `safehouses` (`erlang-stash.projection.service.ts:68-76`). Débloque `name_i18n` via `GET /v1/me/buildings` sans nouveau mécanisme |
| **L-B2** | `current_occupancy` → une **BANDE** d'occupation par étape (au lieu du seul booléen) | `tail_risk_estimates` (`pipeline_and_laundering.ts:129`) | **M18** (« Jamais combien il y a dedans ») + lot **L2** du cadre 142 | ★ **la donnée est déjà lue et passée au compositeur, puis réduite à un booléen** : `laundering.repository.ts:683` la sélectionne (`occupancy_cents`), `laundering.projection.service.ts:147` fait `has_cash: occupancy_cents > 0`. ⇒ le lot L2 **n'exige aucun nouveau mécanisme** : c'est une bande additive sur une valeur déjà en main. `TailP95Bucket` est même déjà nommé au schéma (`:130`) et **compté : 1 occurrence dans tout le back — le commentaire lui-même**, zéro implémentation |
| **L-B3** | `deviation_active` (ou sa bande) sur la **liste** et le **pipeline**, pas seulement sur le nœud Stage-1 | `buildings.audit_pin_expires_at` (`db/schema/city_state.ts:153`) | **M08** + **M14** | `laundering.repository.ts:652` (`eq(stage_index, 1)`). Le bucket d'ampleur existe déjà côté System 7 (Q3) |
| **L-B4** | `blanchiment.purete.partial` (les deux locales) | `i18n/string_table.ts` | **M11** | É8 — 3 membres sur 4, contrôles positifs à 2 |
| — | `routing_weight` (`laundering_edges`, `:59`) — `RoutingWeightBucket` documenté, **compté : 1 occurrence (le commentaire), 0 implémentation** | — | **non dessiné** | ⇒ pas un lot : une question pour l'user (« l'aiguillage entre étapes a-t-il un sens produit ? ») |

---

## Actions : routes ↔ CTA

| route joueur | CTA maquette | statut |
|---|---|---|
| `POST /v1/operational/laundering/inject` (`laundering.controller.ts:79`, `JwtAuthGuard`) | **M15** « INJECTER — IMPOSSIBLE » (classe `eteint`), cadres 137/138/140 | **apparié, mais l'état est faux** — É1. Le CTA a besoin de **2 identités** que l'écran ne va chercher nulle part : `front_shop_id` (via `GET /v1/city/district/:id/interior`, `operational_type === 'front_shop'`) et `safehouse_id` (via `GET /v1/city/district/:id/stash`) — c'est ce que fait le parcours, `filiere_blanchiment.parcours.spec.ts:84-102` |
| `POST /v1/operational/laundering/stage` (`laundering.controller.ts:129`, `JwtAuthGuard`) | **aucun CTA** — le cadre 141 **explique le mécanisme en prose** (« une étape s'accroche à la précédente ») sans jamais l'offrir | **route sans CTA ⇒ QUESTION** : la filière ne peut pas s'allonger depuis cet écran. C'est la seule action qui fait passer la chaîne de 1 à N étapes — donc la seule qui produit l'écran nominal dessiné (4 étapes) |
| `POST /v1/operational/dealer/:id/collect` (`selling.controller.ts:94`, `JwtAuthGuard`) | aucun CTA (mentionné en prose au cadre 142 : « débloque aussi le ramassage des caisses de dealers ») | **hors écran** — c'est l'écran dealers. Retenu ici parce que c'est le seul chemin qui **remplit** la planque après le grant (`{dealer_id, safehouse_id}`) |

---

## Table de couverture complète

Mode maquette ⇒ **pas de colonne F**. `B⁻` = en base / lu, non projeté.

### Lignes issues de B (11 informations, fusionnées depuis 22 paires (route, clé) — détail annexe 3)

| # | information | B | M | statut | classe |
|---|---|---|---|---|---|
| 1 | identité de nœud (`node`, `node_id`, `from_node_id`) | ● | – | disponible, ni dessinée ni affichée | question (plomberie) |
| 2 | **cardinal de la chaîne** (`nodes[]`, `stages[]`) | ● | ● M06 « 04 étapes », M13 les liens, M17 l'état vide | dessinée + disponible | ✔ |
| 3 | **rang de l'étape** (`stage_index`) | ● | ● M13 (l'ordre), M06 | dessinée + disponible | ✔ |
| 4 | **bande de propreté** (`cleanliness_band`) | ● | ● M10 (valeur brute), M11 (libellé), M12 (jauge), M07 (« 01/4 propre au bout ») | dessinée + disponible | ✔ **avec 4 réserves : É4, É7, É8, É12** |
| 5 | **`terminal`** — l'étape qui verse | ● | – | disponible, ni dessinée ni affichée | **« PASSÉ À CÔTÉ ? » Q2** |
| 6 | **`has_cash`** — de l'argent en attente ici | ● | – | disponible, ni dessinée ni affichée | **« PASSÉ À CÔTÉ ? » Q1** |
| 7 | `deviation_active` (nœud Stage-1 seulement) | ● | ● M08 (compteur), M14 (badge) | dessinée + disponible **mais mal dérivée** | **DÉFAUT É2 + É3** |
| 8 | `deviation` (verdict immédiat de l'inject) | ● | – | disponible, ni dessinée ni affichée | **« PASSÉ À CÔTÉ ? » Q6** |
| 9 | identité du front-shop (`front_shop_id`) | ● | – | disponible, non dessinée | question (plomberie / entrée du CTA) |
| 10 | identité de la planque (`safehouse_id`) | ● | – | disponible, non dessinée | question (plomberie / entrée du CTA) |
| 11 | **bâtiment hôte d'une étape** (`building_id`, rendu par `POST stage` **seul**) | ● | – | disponible **en écriture**, jamais en lecture | **« PASSÉ À CÔTÉ ? » Q4 + lot L-B1** |

### Lignes issues de M non appariées (9 éléments)

| # | élément | B | M | statut | classe |
|---|---|---|---|---|---|
| 12 | M01 — « Argent / $ 24 850 » | ● (hors ㊵) | ● | shell | hors domaine — `GET /v1/economy/wallet` (`economy.controller.ts:43`), non re-mesuré ici |
| 13 | M02 — manomètre + « tiède / Heat » | ● (hors ㊵) | ● | shell | hors domaine — `GET /v1/city/district/:id/heat` (`heat.controller.ts:52`), non re-mesuré ici |
| 14 | M03 — « Jour 12 / Matin » | ● (hors ㊵) | ● | shell | hors domaine — `POST /v1/session/open` (`session.repository.ts:161-165`, `game_minute` → jour), non re-mesuré ici |
| 15 | M04 — titre « La filière » | – | ● | statique | i18n `filiere.bloc.la_filiere` (`string_table.ts:736`/`1579`) — pas une donnée |
| 16 | M05 — sous-titre d'état (« où en est chaque étape » / « la filière s'écarte… » / « aucune filière ») | – | ● | statique par variante | pas une donnée ; **la variante « s'écarte » n'est pas atteignable** (É5) |
| 17 | **M09 — les 4 noms d'étape** | **B⁻** | ● | **en base, non projeté, dessiné** | **forme F → lot back L-B1** (É6) |
| 18 | **M14 — badge « écart » sur l'étape 3** | – | ● | **dessiné sans source** | **DÉFAUT É2** |
| 19 | **M16 — « il faut une planque, et rien n'en crée jamais »** | – | ● | **dessiné CONTRE la mesure** | **DÉFAUT É1** |
| 20 | M18 — encart « ce que la filière ne dit pas » | – | ● | éditorial, proposition partiellement fausse | **É10** (et déjà servi en i18n `string_table.ts:739` en / `:1582` fr) |

### Contrôle d'arithmétique

    |clés B| (informations distinctes du domaine ㊵, après fusion)     = 11
    |éléments M non appariés|                                          =  9
    |rendus F sans source|                            = n/a (mode maquette)
    ───────────────────────────────────────────────────────────────────────
    somme                                                              = 20
    lignes de la table de couverture                                   = 20   ✔

    Contrôle secondaire (fusion) : 22 paires (route, clé) → 11 informations.
      6+2+2+3+2+2+1+1+1+1+1 = 22   ✔   (détail annexe 3)
    Contrôle secondaire (M) : 8 appariés à une clé + 1 apparié à une ACTION (M15, table §Actions)
      + 9 non appariés = 18 éléments M inventoriés   ✔   (annexe 4)

    Hors table, délibérément : les cadres **139** et **142** sont des cadres de DIAGNOSTIC de dette
    (les 4 maillons, les 4 lots L1-L4), pas de l'information joueur. Ils sont néanmoins **vérifiés
    comme affirmations sur le back** — voir É11 (3 maillons sur 4 refermés, cause du 4ᵉ mal nommée),
    É1 (L1), L-B2 (L2), É6 (L3), Q3 (L4).

---

## Annexes

### 1. Routes du domaine (compte, ancres)

**Contrôleur du domaine — 5 routes joueur** (compté : `grep -c "@UseGuards(JwtAuthGuard)"` = 5, aucune `_test`, aucune BO) :

| méthode | chemin | ancre | corps réel |
|---|---|---|---|
| POST | `/v1/operational/laundering/inject` | `laundering.controller.ts:79-81` | **mutation** (jamais appelée) |
| POST | `/v1/operational/laundering/stage` | `laundering.controller.ts:129-131` | ⚠️ **absente du manifeste** (compté : 0 ; contrôle positif `inject` = 1) |
| GET | `/v1/operational/laundering` | `laundering.controller.ts:170-171` | **200, mesuré** — 4 nœuds |
| GET | `/v1/operational/laundering/:nodeId` | `laundering.controller.ts:183-184` | « sans instance » ⇒ **DÉDUIT** |
| GET | `/v1/operational/laundering/:nodeId/pipeline` | `laundering.controller.ts:203-204` | « sans instance » ⇒ **DÉDUIT** |

**Balayage au-delà du module** (`grep -ril 'launder' / 'safehouse' / 'blanchiment'` sur tous les `*.controller.ts`) — 10 + 5 + 0 fichiers ; après retrait des `_test`, des admin/BO et des hors-sujet, **2 routes joueur de frontière** retenues :

| GET | `/v1/city/district/:id/stash` | `erlang-stash.controller.ts:59-60` | l'amont : la planque (entrée du CTA) |
| POST | `/v1/operational/dealer/:id/collect` | `selling.controller.ts:94-96` | le seul chemin qui **remplit** la planque après le grant |

Et **3 routes joueur voisines** qui portent de l'information que cet écran demande sans l'avoir :
`GET /v1/city/district/:id/unconformity` (`unconformity.controller.ts:56`) · `GET /v1/me/buildings`
(`player-buildings.controller.ts:89`) · `GET /v1/operational/building/:id` (`real-estate.controller.ts:227`).

### 2. Corps réels — provenance

`Tools/juge-visuel/screen_c2/corps-reels/` — `back_main 6ff684db`, 2026-09-04T10:15:48, compte
`operational_demo@example.test`, image `mafia-clean-city-game-back 2026-09-04T08:14:29Z`.
`_index.json` : **1 appelée · 2 sans instance · 2 mutations · 0 erreur** (5 routes).

`GET_operational_laundering.json` — 200, X-Request-Id `0af6129d-4408-412a-9a3c-4f458f2566de` :

    nodes[0]  stage_index 1  PARTIAL       terminal false  has_cash false
    nodes[1]  stage_index 2  MOSTLY_CLEAN  terminal false  has_cash TRUE
    nodes[2]  stage_index 3  CLEAN         terminal false  has_cash false
    nodes[3]  stage_index 4  CLEAN         terminal TRUE   has_cash false

⚠️ **Les deux « sans instance » sont un artefact de capture, pas une absence de donnée** : le
manifeste dit « aucune instance sur le compte de démo — attendue dans un corps du dossier
(clés `['nodeId']`) », or **les 4 ids sont dans le corps voisin**, sous la clé `node` (pas `nodeId`).
La sonde a cherché un nom de paramètre littéral. Commande qui trancherait (après le gate) en §6.

### 3. Valeurs possibles par clé, avec la contrainte source

**22 paires (route, clé) → 11 informations.** Détail de la fusion :
I1 nœud (6 paires) · I2 conteneur (2) · I3 rang (2) · I4 bande (3) · I5 terminal (2) · I6 has_cash (2) ·
I7 deviation_active (1) · I8 deviation (1) · I9 front_shop (1) · I10 safehouse (1) · I11 building (1) = **22**.

| clé | route(s) | type projeté | valeurs possibles | contrainte source |
|---|---|---|---|---|
| `nodes` / `stages` | liste / pipeline | tableau | ≥ 0 entrées ; **une liste vide est une VALEUR, jamais un 404** | `laundering.controller.ts:163-164` ; `laundering.projection.service.ts:136-137` |
| `node` | liste, `/:nodeId`, pipeline | id opaque (uuid) | — | `pipeline_and_laundering.ts:18` (`uuid().primaryKey()`) |
| `stage_index` | liste, `POST stage` | rang entier ≥ 1 | 1 pour l'inject ; `from.stage_index + 1` pour un stage | `pipeline_and_laundering.ts:21` (`integer notNull`) ; `laundering.service.ts` §addStage |
| `cleanliness_band` | liste, pipeline | **bande fermée, 4 membres** | `DIRTY \| PARTIAL \| MOSTLY_CLEAN \| CLEAN` | `citysim/events/city-event-bus.ts:331`. **Dérivation liste/pipeline** : `cleanlinessBucket(pipelineCleanlinessForStage(stage_index))` ⇒ aux valeurs livrées **seules `PARTIAL/MOSTLY_CLEAN/CLEAN` sont produites** (É4) |
| `cleanliness_band` | `/:nodeId` | même domaine, **AUTRE grandeur** | les 4 membres atteignables | `cleanlinessBucket(cleanliness_at_output)` — le float System 8, recalculé chaque minute (`laundering.projection.service.ts:117`, `dwell-time.service.ts:294-299`) — **É12** |
| `terminal` | liste, pipeline | booléen structurel | `true` ⇔ aucune arête sortante | `laundering.repository.ts:693` / `:729-732` |
| `has_cash` | liste, pipeline | booléen de présence | `occupancy_cents > 0` | `laundering.projection.service.ts:147,162` ; source `tail_risk_estimates.current_occupancy` (`pipeline_and_laundering.ts:129`) |
| `deviation_active` | `/:nodeId` | booléen | `audit_pin_expires_at != null && > now` | `laundering.projection.service.ts:119` ; colonne `city_state.ts:153` — **posée par le seul tick NIGHTLY/2** (`city_sim_scheduler.service.ts:399`) |
| `deviation` | `POST inject` | booléen | `amount_cents > 250 000 c` (défaut ; plage 50 000..5 000 000) | `laundering.service.ts:153` ; `laundering-tunables.ts:85,91` |
| `front_shop_id` / `safehouse_id` / `node_id` / `from_node_id` / `building_id` | mutations | ids opaques (uuid) | — | `laundering.controller.ts:111-116, 147-152` |

**Frontière** — `GET /v1/city/district/:id/stash` : `district`, `district_blocking_band`
(`LOW\|MODERATE\|HIGH\|SATURATED`, `erlang-stash.projection.service.ts:55-61`),
`any_high_blocking_alert`, `safehouses[]{safehouse_id, building_id, slot_count,
load_bucket (EMPTY\|LOW\|NOMINAL\|HIGH\|FULL), blocking_band, high_blocking_alert}` (`:64-89`).
`POST /v1/operational/dealer/:id/collect` : `{dealer_id, safehouse_id}` (`selling.controller.ts:101`).

**Épingles d'ensemble de clés** (les 5 ensembles, épinglés par une spec **parcours**, routes joueur
seulement, aucun seed SQL) — `tests/e2e/operational/filiere_blanchiment.parcours.spec.ts` :
`inject` `:111-113` · liste `:120,126-127` · `/:nodeId` `:133-135` · pipeline `:139-145` ·
`stage` `:155-157`. Épingle dédiée de la liste : `laundering_nodes_list_keyset.spec.ts:37-40`.

### 4. Inventaire M (Mxx → représente) — 18 éléments

Source : `atelier3d-mafia/ecrans-brennar-6.html`, cadres **137** (nominal, l.6329) · 138 (l.6332) ·
139 (l.6335) · 140 (l.6338) · 141 (l.6341) · 142 (l.6344) — indices 0-based confirmés par oracle
python sur les 143 occurrences de `<div class="cadre">`. Référence ratifiée :
`Tools/juge-visuel/screen_c2/reference-1080x2102.png` = rendu du cadre **137** (vérifié à l'image).

| id | élément (cadre) | représente | apparié à |
|---|---|---|---|
| M01 | `.aile` « Argent » / « $ 24 850 » (137) | le solde du joueur | shell |
| M02 | `.mano` svg + « tiède » / « Heat » (137) | la chaleur de la ville | shell |
| M03 | `.aile.droite` « Jour 12 » / « Matin » (137) | la date de jeu | shell |
| M04 | `.enseigne > b` « La filière » (137) | le titre | statique |
| M05 | `.enseigne > i` (137/138/140/141) | le sous-titre d'état | statique |
| M06 | `.fen[0]` « 04 » / « étapes » (137) | le cardinal de la chaîne | **I2** |
| M07 | `.fen[1]` « 01/4 » / « propre au bout » (137) | combien d'étapes sont CLEAN | **I4** |
| M08 | `.fen[2]` « 00 » / « écarts » (137), « 01 » (138) | le nombre d'écarts | **I7 — É3** |
| M09 | `.et6 > div > b` ×4 : « Le comptoir », « La blanchisserie », « Le garage », « Le notaire » | le NOM de l'étape | **aucun — É6 / L-B1** |
| M10 | `.et6 > div > span` ×4 : « node · dirty/partial/mostly_clean/clean » | type + valeur brute de la bande | **I4** |
| M11 | `.et6 > span.pr` ×4 : « sale / à moitié / presque propre / propre » (+ couleur) | le libellé de la bande | **I4 — É8, É9** |
| M12 | `.et6 > .cuve > u{height:25/50/75/100%}` ×4 | la propreté comme **jauge de remplissage** | **I4 — É7** |
| M13 | `.lien` ×3 (137) | le chaînage / l'ordre des étapes | **I2, I3** |
| M14 | `.et6.alerte` + `span.dv` « écart » sur l'étape 3 (138) | un écart **par étape** | **aucun — É2** |
| M15 | `.pied > .cta6.eteint` « INJECTER — IMPOSSIBLE » (137/138/140) | l'action principale + son état désactivé | **action `POST inject` — É1** |
| M16 | `.pied > .note6` « il faut une planque, et *rien n'en crée jamais* » (137/138) | la cause du blocage | **aucun — É1** |
| M17 | `.rien` (140 : « il faut une planque pour commencer » · 141 : « aucune filière montée ») | l'état vide | **I2 (liste vide)** — cause fausse en 140 (É1) |
| M18 | `.pann` i/b/small (137 : « Jamais combien il y a dedans » · 138 : « un seul voyant » · 141 : « une étape s'accroche… ») | encart éditorial | **É10** |

### 5. Inventaire F

**Non applicable — mode maquette.** L'écran existe dans le client, il n'a pas été lu ce tour-ci
(consigne du dossier). Toute ligne de la table qui aurait besoin de « ce que le front affiche » porte
`F : non mesuré (mode maquette)`.

### 6. Non vérifié — avec la mesure qui trancherait

1. **Les corps de `GET …/:nodeId` et `…/:nodeId/pipeline`** : jamais capturés (« sans instance ») alors
   que le compte de démo a **4 nœuds**. Leurs ensembles de clés sont **DÉDUITS** de l'interface
   (`laundering.projection.service.ts:57-93`) + des épingles du parcours (`:133-135`, `:139-145`).
   Après le gate :
   ```
   NODE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/laundering \
     | python3 -c 'import sys,json;print(json.load(sys.stdin)["payload"]["data"]["nodes"][0]["node"])')
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/laundering/$NODE | python3 -m json.tool
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/laundering/$NODE/pipeline | python3 -m json.tool
   ```
   ⚠️ Le 2ᵉ appel **doit** être fait sur le nœud `stage_index == 1` : sur tout autre il rend 404 (É2) —
   et un 404 satisfait trivialement toute assertion d'absence.
2. **`POST /v1/operational/laundering/stage`** : route joueur du domaine, **absente du manifeste**
   (compté 0 / contrôle positif 1). Aucun corps, pas même une entrée « mutation ». Elle est le seul
   moyen d'atteindre l'écran NOMINAL dessiné (4 étapes). À ajouter à `capturer-corps-reels.py`.
3. **Par quel chemin le compte de démo a-t-il ses 4 nœuds ?** Ni le corps ni le manifeste ne le disent
   (parcours joueur ? seed SQL ?). Trancherait : rejouer `filiere_blanchiment.parcours.spec.ts` sur un
   compte frais et comparer, ou `psql` sur la pile dev.
4. **`deviation_active == true`** : aucun corps réel ne le montre, et É5 dit pourquoi. Trancherait :
   un override de registre (`LAUNDERING_FRONT_SHOP_LEGIT_BASELINE_CENTS=1000`) + un inject + un tick
   NIGHTLY forcé. ⚠️ Ce serait **le test vert obtenu en abaissant un seuil** : à traiter comme un
   SIGNAL (« le défaut livré rend cet effet inatteignable »), jamais comme une validation.
5. **La bande réelle de `GET /:nodeId`** (dérivée de `cleanliness_at_output`, É12) : non mesurée, elle
   dépend du tick MINUTE de System 8, qui ne tourne pas hors staging. Trancherait : la même stack en
   `CITYSIM_CONTINUOUS_LOOPS=1`, ou une lecture directe de la colonne.
6. **Les 3 éléments de barre (M01/M02/M03)** : sources **nommées** (`economy.controller.ts:43`,
   `heat.controller.ts:52`, `session/open`) mais **pas re-mesurées** — hors domaine ㊵, elles
   appartiennent au dossier du shell.
7. **F (ce que le front affiche)** : non mesuré, par consigne. Les 12 écarts ci-dessus sont donc des
   écarts **B ↔ M** ; le tour de clôture devra vérifier lesquels le front a déjà refermés ou aggravés.
8. **Fraîcheur** : les corps sont datés `back_main 6ff684db` (2026-09-04) ; le back lu ici est plus
   récent. Aucun des 5 corps du dossier n'est dans les 2 corps déclarés périmés par
   `verifier-fraicheur-corps.py` (les deux `GET_i18n_bundle_locale.json`), mais **je n'ai pas rejoué
   ce contrôle** : je le rapporte tel que le dossier le donne.
