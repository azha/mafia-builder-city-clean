# Juge données ⊥ — La Revue du jour (screen_11) — mode **maquette** — 2026-08-25

## En une phrase

La maquette montre **10 des 17 clés** que le back sert pour cet écran ; **8 écarts** à consigner
ou à arbitrer — dont **deux qui rendent la maquette non-rendable en l'état** (le motif n'a que
5 phrases possibles dans tout le jeu, et les libellés « tournée 7 / lavomatic / coin du Lek »
n'ont aucune source dans la charge de la carte) — et **7 questions « passé à côté ? »**, dont
une bande de calibration déjà projetée, client-facing, jamais dessinée.

---

## Écarts à consigner (mode maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E1** | **`.motif`** — « Le nouveau trajet passe à deux rues du commissariat » | ● | ● | **NON RENDABLE — la charge ne porte pas l'information** | `flag_reason` = **une clé fixe par générateur** (5 en tout) et ses `params` sont **byte-identiques à ceux du `descriptor`** — vérifié **5/5** : `courier-scheduling.generator.ts:70-77` (`{route_id}` des deux côtés) · `precursor-order.generator.ts:90-97` (`{building_id, precursor_type}`) · `front-shop-reconciliation.generator.ts:78-85` (`{building_id}`) · `stash-reorder.generator.ts:77-84` (`{building_id, substance_type}`) · `lek-rotation.generator.ts:75-82` (`{dealer_id}`). Corps mesuré : `mesures/flag-review-seeded.json` → `flag_reason.key = core_loops.flag_discipline.reason.deviation_detected`, `params = {generator}`. ⇒ **deux cartes du même générateur portent la MÊME phrase**, et le motif ne peut rien dire que le titre ne dise déjà. |
| **E2** | **`.quoi`** — « Réacheminer **la tournée 7** », « **le coin du Lek** », « **le lavomatic** » | ● | ● | **étiquette humaine sans source dans la carte** | `descriptor.params` ne porte que des **identifiants opaques** : `route_id`/`building_id`/`dealer_id` (uuid) + 2 énumérés (`precursor_type`, `substance_type`) — mêmes ancres qu'E1 ; corps mesuré `descriptor.params = {"route_id":"rt-7"}`. En base : `route.route_name varchar(48)` **existe mais est nullable** et n'est listé au joueur que pour `is_saved = true` (`db/schema/operational_chain.ts:290` · `operational/distribution/route.service.ts:223-229`) ; **`dealer` et `buildings` n'ont AUCUNE colonne de nom** (colonnes énumérées à la source, oracle python : `dealer` = dealer_id, player_id, home_building_id, coverage_lek_tile_id, substance_specialization, current_state, operating_hours_*, float_cents ; `buildings` = building_id, player_id, block_id, building_type, ownership, heat, …). ⇒ soit lot back (L1), soit la maquette assume des noms génériques dérivés du **type**. |
| **E3** | `routine_pending_count` dessiné en **entier** (3 fois : sous-titre « 17 routines », `b` du bloc routine, tampon « · 17 ») | ● | ● | **CONFLIT DE CANON — arbitrage user, pas un écart assumé** | Le canon de l'écran l'**interdit** deux fois : `docs/tech/08_ui_screens/screen_11_daily_review.md:120` (« *pas de compteur brut (P5 strict)* ») et `:231` (« *Jamais le count exact de routines (P5 — le joueur ne voit pas l'entier)* », `RoutineLoadBucket` LIGHT/TYPICAL/HEAVY). Le back sert l'entier (`flag-discipline.service.ts:89,293`) et son E2E le **whitelist explicitement** comme ordinal own-content (`tests/e2e/core_loops/flag_review_surface.spec.ts:366`). Mesuré : `17`. **Deux sources écrites se contredisent ⇒ ça remonte, ça ne se consigne pas.** |
| **E4** | Zone A du canon (`CycleSummaryCard` : heat trend + cohesion trend + routine bucket) — **non dessinée** | – | – | **écart LÉGITIME, confirmé par mesure** | `HeatTrendBucket` / `CohesionTrendBucket` / `RoutineLoadBucket` : **0 fichier** dans tout `services/game-back/src` (contrôle positif dans la même passe : `TrustBudgetBucket` → **6 fichiers**). Sweep élargi : `heat_trend` **0**, `cohesion_trend` **0**, `routine_load` **0** ; les **11 fichiers portant `Trend`**, ouverts un par un, portent tous un `PriceTrend` de marché — 10 pour le marché des précurseurs (`db/schema/precursor_market_state.ts:48` `pgEnum('price_trend', ['UP','STABLE','DOWN'])`, dont `core_loops/flag_discipline/generators/deviation-scores.ts:28,59-61` qui l'importe) et 1 pour le méta-marché (`operational/meta_market/meta-market-read.service.ts:169`, `'up'|'stable'|'down'` sur 7 jours). **Aucune tendance de chaleur ni de cohésion nulle part.** ⚠️ **Précision qui manquait au dossier** : le heat et la cohésion **existent** sur des routes joueur — `GET /v1/city/district/:id/heat` rend `{"district_bucket":"COLD","citywide_bucket":"COLD","escalated":false}` (mesuré), `…/cohesion` rend **404** sur compte frais. Ce sont des buckets **instantanés par district**, jamais une **tendance de cycle** ni un agrégat d'organisation. L'écart tient ; sa formulation « le back ne sert aucune de ces tendances » est exacte, « le back ne sert rien sur la chaleur » serait fausse. |
| **E5** | « **Passer outre** » = simple bouton-filet, **sans confirmation** | ● | ● | **divergence explicite d'un canon écrit — à ratifier** | Canon `screen_11_daily_review.md:256` : ouvre un `OverrideFlagSheet` (bottom sheet) avec rappel du coût ; `:261` : la confirmation y est **elle-même un long-press** (« perte de token = action destructive par définition ») ; `:341`, `:466` idem. La maquette l'assume en annexe (« Deux boutons-filets, pas de modale »). Effet réel mesuré : `dismiss.json` → `token_returned: false`, **irréversible** (2ᵉ appel → 409, `validate-again.json`). Le tampon de routine, lui, garde bien son appui long. |
| **E6** | **aucun retour après verdict** — `resolved` / `verdict` / `token_returned` / `batch_confirmed_count` | ● | – | **4 clés servies, 0 dessinée** | `flag-discipline.service.ts:64-68` (`FlagVerdictResult`) et `:96-98` (`BatchConfirmResult`) ; corps mesurés `validate.json`, `dismiss.json`, `batch-confirm.json` (`17`). La maquette ne dessine **aucun** état d'après-geste. `token_returned` est le SEUL endroit où l'économie du jeton — que l'annexe décrit en prose — devient visible à l'écran. |
| **E7** | **silhouette identique sur les 3 cartes** (`#buste-fedora` ×3, y compris « Rosa Bellini ») | – | ● | **identité visuelle sans source** | Maquette `ecrans-brennar-2.html`, cadre 0 : les 3 `<use href="#buste-fedora"/>`. La carte de flag ne porte **que** `lieutenant.{id,name}` (`flag-discipline.service.ts:74-81`, corps mesuré) — pas d'`archetype`, pas de `role_id`. `archetype` **existe** sur `GET /v1/lieutenants` et `/:id` (mesuré : `LOGISTICS`, `COOK`) mais pas ici. ⇒ décoratif assumé, ou lot back (L3). |
| **E8** | « collectes, livraisons, relèves » — la **composition** des 17 routines | B⁻ | ● | **dessiné en prose, jamais projeté** | `routine_items.generator` est un pgEnum **fermé à 5 membres** (`db/schema/flag_discipline.ts:34-40`) mais la seule lecture joueur est un `count(*)` **sans regroupement** (`flag-discipline.repository.ts:650-656`). La sous-ligne nomme trois familles que le back ne sait pas dénombrer côté joueur. ⇒ lot back (L4) ou copie assumée comme purement littéraire. |

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `flag_frequency_band` — `GET /v1/lieutenants/:id` (mesuré : `"occasional"`, `mesures/lieutenant-detail.json`) ∈ `none \| occasional \| frequent` (`convergence.ts:34-35`, seuil `flagFrequencyBandFrequentMin` défaut 4 sur 7 jours de jeu) | « ce lieutenant vous signale **souvent** / rarement » | **Utile ici, et c'est la plus forte** : c'est exactement le signal qui dit s'il faut valider ou passer outre — un lieutenant `frequent` sur-signale, un `none` qui parle soudain mérite attention. Déjà calculé, déjà **client-facing**, déjà à côté du `trust_budget_bucket` que la carte porte : le mettre sur la carte ne coûte qu'un champ dans la projection. | ★★★ |
| **Q2** | `token_returned` — `POST /v1/flag-review/:id/validate\|dismiss` (mesuré `true` / `false`) | « votre décision lui a **rendu** / **coûté** son jeton » | Utile ici : la maquette explique la règle en annexe mais l'écran ne la montre jamais. Un micro-retour sur la carte qui sort (« jeton rendu » / « jeton perdu ») rend l'économie lisible **au moment où elle se joue**. | ★★★ |
| **Q3** | `lieutenant.id` — `GET /v1/flag-review` (mesuré, opaque) | rien en soi — mais c'est la **clé de navigation** vers la fiche du lieutenant | Utile ici : rendre la carte tapable vers screen_4, qui porte `trust_budget_bucket`, `flag_frequency_band`, `tenure_bucket`, `drift_phase` (tous mesurés dans `lieutenant-detail.json`). Coût client seul, zéro lot back. | ★★ |
| **Q4** | `tenure_bucket` — `GET /v1/lieutenants` / `:id` (mesuré : `FRESH`) | « ce lieutenant est **nouveau** » | Utile ici : le canon lui-même explique qu'un bas-ancienneté sur-signale au début (`convergence.ts:70` — « *low-tenure may over-flag initially* » — et la leniency est appliquée à `:81`, `input.isLowTenure` déclaré `:53`). Un joueur qui voit `FRESH` sait pourquoi il reçoit trois questions du même homme. | ★★ |
| **Q5** | `batch_confirmed_count` — `POST /v1/flag-review/batch-confirm` (mesuré `17` puis `0`) | « **17 routines signées** » | Utile ici : c'est la seule confirmation que l'appui long a mordu, et le `0` du second appel dit « déjà fait ». Sans lui, un tampon long-pressé deux fois n'a aucun retour distinguable. | ★★ |
| **Q6** | l'**historique des verdicts** — `flagged_items.resolution` ∈ `pending\|validated\|dismissed\|timed_out` (`db/schema/flag_discipline.ts:54-59`) | « voilà ce que vous avez décidé hier » | Pas ici (l'écran est un tri du jour), mais **aucune surface joueur** n'expose la moindre résolution passée : la seule lecture est `resolution = 'pending'` (`flag-discipline.repository.ts:623`). Le reste n'existe qu'en BO (`flag-discipline-admin.controller.ts:265`). À noter comme trou de domaine, pas comme trou d'écran. | ★ |
| **Q7** | la **remise hebdomadaire** — dérivable **sans nouvelle clé** depuis `opened_game_day` : `epoch = floor(game_day / 7)` (`flag-weekly-reset-tick.service.ts`, en-tête + `deriveWeekEpoch`) | « les jetons se remettent à plat dans N jours » | Utile ici : l'annexe dit « perdu **jusqu'à la remise hebdomadaire** » et l'écran ne dit jamais quand. Le client a déjà tout ce qu'il faut (`opened_game_day` mesuré = 1). Zéro lot back. | ★★ |

**Non-questions, vérifiées et closes** : `flag_id` (identifiant opaque, plomberie du geste) ·
`flag_review.auto_open` (mesuré `true` — sert la navigation, l'annexe le dit et c'est correct) ·
`deviation_score_internal` et `credibility_tokens` (interdits R2.2 — `flag_review_surface.spec.ts:363`).

---

## Lots back suggérés (B⁻ dessiné)

| # | colonne / champ | table / source | maquette | preuve |
|---|---|---|---|---|
| **L1** | une **étiquette humaine** dans `descriptor.params` | `route.route_name` existe (nullable) ; `dealer` et `buildings` **n'ont aucun nom** — seul `buildings.building_type` (int) est joueur-atteignable (`operational/real_estate/real-estate.repository.ts`, unique projection trouvée) | E2 — « la tournée 7 », « le lavomatic », « le coin du Lek » | `db/schema/operational_chain.ts:290` · `operational/distribution/route.service.ts:223-229` (`.select()` nu ⇒ `route_name` sort, mais seulement pour `is_saved = true`) |
| **L2** | un **motif discriminant** : `flagReason.params` doit porter la **condition** qui a déclenché, pas le même identifiant que le descriptor | les 5 générateurs **calculent déjà** la condition puis la **jettent** dans un score numérique BO-only | E1 — les 3 motifs situationnels | `courier-scheduling.generator.ts:74-77` + `:81` (`deviationScore` garde `routeState`/`sinuosityIndex`, `flagReason` non). Cas le plus net, mesuré : `precursor-order.generator.ts:66,79,101` lit `scarcityActive` **et** `price_trend` du marché, les passe à `precursorOrderDeviationScore` — dont le corps distingue explicitement les deux (`deviation-scores.ts:59-61` : rupture → 0,9 ; prix `UP` → 0,5) — et son `flagReason.params` (`:94-97`) ne porte **ni l'un ni l'autre**. Le back sait dire *pourquoi*, et ne le dit pas |
| **L3** | `archetype` sur la carte de flag | dérivé de `lieutenant.role_id` ; déjà projeté par `GET /v1/lieutenants` (mesuré `LOGISTICS`/`COOK`) | E7 — le buste | `flag-discipline.service.ts:74-81` (la carte porte `{id,name}` seuls) vs `mesures/lieutenants.json` |
| **L4** | `routine_pending_count` **par générateur** (5 valeurs) | `routine_items.generator` | E8 — « collectes, livraisons, relèves » | `db/schema/flag_discipline.ts:34-40` (enum) vs `flag-discipline.repository.ts:650-656` (`count(*)` sans `GROUP BY`) |

**Non-forme-F** : aucune de ces 4 n'est une forme F stricte (donnée déjà relue et passée au
compositeur, omise par la seule projection). L1/L2/L4 exigent une **lecture nouvelle** ; L3 exige
une jointure. C'est un lot back ordinaire, pas un trou de projection.

---

## Actions : routes ↔ CTA

**Routes joueur du domaine, compte trouvé : 4** — balayage `@(Get|Post|Patch|Put|Delete)` sur
`**/*.controller.ts` avec `flag` dans le chemin → 24 hits, dont **4 joueurs sous `JwtAuthGuard`**
(les 5 autres du module sont `@Controller('admin')` + `requireStaffRole` — `flag-discipline-admin.
controller.ts:173,204,266,303,343,390` — et 5 sont des seams `_test`). Balayage `routine` dans un
chemin de route : **0**.

| geste maquette | route | statut |
|---|---|---|
| « ✓ Valider » | `POST /v1/flag-review/:flagId/validate` (`flag-discipline.controller.ts:51`) | ✔ apparié — mesuré 200 / 409 / 404 |
| « Passer outre » | `POST /v1/flag-review/:flagId/dismiss` (`:60`) | ✔ apparié — **mais E5** (le canon exige une feuille de confirmation, la maquette non) |
| « CONFIRMER LA ROUTINE · 17 » (appui long) | `POST /v1/flag-review/batch-confirm` (`:78`) | ✔ apparié — appui long conforme au canon `:260` |
| (chargement de l'écran) | `GET /v1/flag-review` (`:69`) | ✔ apparié |
| (ouverture automatique) | `POST /v1/session/open` → `flag_review.auto_open` (`session.controller.ts:56` ; `session-open-sequence.service.ts:136-143`, `:464-473`) | ✔ apparié — mesuré `auto_open: true` avec 2 flags pendants |
| « ‹ » retour | — | chrome de navigation, hors grille |

**Aucune route joueur du domaine sans CTA. Aucun CTA sans route.**

⚠️ **Dépendance à deux appels** : le sous-titre a besoin de `opened_game_day` (`session/open`)
alors que les cartes viennent de `GET /v1/flag-review`, qui ne porte **aucun** jour courant. Sans
le premier, « J11 » (`flagged_game_day`) n'est pas situable — le client ne peut pas dire « hier ».

⚠️ **Fenêtre de péremption non dite** : un flag `pending` est basculé en `timed_out` après
`flag_batch_confirm_window_real_hours` **heures réelles** (défaut **20**,
`flag-discipline-tunables.ts:129-132` ; bascule `flag-discipline-tick.service.ts:122-132`). Rien
dans le corps de `GET /v1/flag-review` ne le signale (`flagged_at` n'est pas projeté), et le canon
D13 interdit tout décompte. **Conséquence mesurée à la source : le timeout RECRÉDITE le jeton**
(`flag-discipline-tick.service.ts:134`) ⇒ ne rien dire ne coûte rien au joueur. Écart sans enjeu,
mais il fallait le vérifier avant de l'écrire.

---

## Table de couverture complète

Légende : ● présent · – absent · B⁻ en base non projeté. La colonne **F** n'existe pas (mode maquette).

| # | information | B | M | statut | classe |
|---|---|---|---|---|---|
| B01 | `cards[]` — la liste et son cardinal (`GET /v1/flag-review`) | ● | ● | 3 cartes dessinées ; état vide = « rien ne réclame votre parole » | ✔ |
| B02 | `cards[].flag_id` | ● | – | identifiant opaque, consommé par les 2 CTA | plomberie |
| B03 | `cards[].lieutenant.id` | ● | – | disponible, ni dessiné ni utilisé | **Q3** |
| B04 | `cards[].lieutenant.name` | ● | ● | « Salvatore » / « Vito Marchetti » / « Rosa Bellini » | ✔ |
| B05 | `cards[].descriptor` `{key,params}` | ● | ● | ligne `.quoi` | ✔ / **E2** |
| B06 | `cards[].flag_reason` `{key,params}` | ● | ● | ligne `.motif` | ✔ / **E1** |
| B07 | `cards[].flagged_game_day` | ● | ● | « J11 » / « J12 » | ✔ |
| B08 | `cards[].trust_budget_bucket` | ● | ● | chip « Confiance · faible/normale/élevée » — **3 valeurs dessinées, 3 valeurs mesurées** | ✔ |
| B09 | `routine_pending_count` | ● | ● | « 17 routines » ×3 | ✔ / **E3** |
| B10 | `batch_confirm_available` | ● | ● | conditionne la présence du tampon (annexe) | ✔ |
| B11 | `flag_review.pending_review_count` (`session/open`) | ● | ● | « **3** signalements » + « les 3 signalements restent à votre main » | ✔ |
| B12 | `flag_review.auto_open` | ● | – | pilote la navigation, jamais affiché — **voulu** | ✔ (assumé) |
| B13 | `opened_game_day` | ● | ● | « Jour 12 » / « Jour 13 » | ✔ |
| B14 | `resolved` (validate/dismiss) | ● | – | dessiné nulle part | **E6** |
| B15 | `verdict` (validate/dismiss) | ● | – | dessiné nulle part | **E6** |
| B16 | `token_returned` (validate/dismiss) | ● | – | dessiné nulle part | **E6 / Q2** |
| B17 | `batch_confirmed_count` (batch-confirm) | ● | – | dessiné nulle part | **E6 / Q5** |
| M18 | pastille verte du bloc routine (« rien n'a dévié ») | – | ● | **dérivée** : `status='pending'` = « jamais flaggé » par construction (`flag-discipline.repository.ts:650-656`). Invariante — une seule couleur possible | assumé (décoratif dérivé) |
| M19 | silhouette de buste (`#buste-fedora` ×3) | – | ● | aucune source d'identité sur la carte | **E7** |
| M20 | « collectes, livraisons, relèves » | B⁻ | ● | composition non projetée | **E8 / L4** |

**Arithmétique du découpage** — `|clés B| = 17` · `|éléments M non appariés| = 3` · `|rendus F sans
source| = 0` (mode maquette) · **somme = 20 = nombre de lignes**. ✔

Deux écarts n'ont **pas** de ligne ici, et c'est voulu : **E4** est un `– – –` (la Zone A du canon
n'est ni en B ni en M — écart au canon d'écran, pas écart de couverture) ; **E5** porte sur
l'**interaction** attachée à une action, donc il vit dans la section « Actions » ci-dessus, où la
grille est route ↔ CTA et non clé ↔ élément. Les six autres (E1→B06, E2→B05, E3→B09, E6→B14-B17,
E7→M19, E8→M20) sont bien dans les 20 lignes.

Chrome exclu de l'inventaire M (aucune information portée, aucune source attendue) : le titre
« La Revue du jour » et la flèche de retour « ‹ ».

Clés de `session/open` **hors domaine** de cet écran, énumérées pour que le compte de 12 soit
opposable et qu'aucune ne passe pour omise ici : `session_id`, `hl_card`, `queue`,
`backlog_badge`, `queue_pressure_band`, `structural_budget`, `settling_glance`, `friction_glance`,
`compression_glance`, `onboarding` (mesuré, `mesures/session-open-seeded.json`).

---

## Annexes

### 1. Routes du domaine (compte, ancres)

**4 routes joueur**, toutes sous `JwtAuthGuard`, toutes dans
`services/game-back/src/core_loops/flag_discipline/flag-discipline.controller.ts` :

| route | ancre | garde |
|---|---|---|
| `POST /v1/flag-review/:flagId/validate` | `:51-57` | `@UseGuards(JwtAuthGuard)` `:53` |
| `POST /v1/flag-review/:flagId/dismiss` | `:60-66` | `:62` |
| `GET  /v1/flag-review` | `:69-74` | `:70` |
| `POST /v1/flag-review/batch-confirm` | `:78-84` | `:80` |

Chacune résout `account_id → player_id` par le pont d'identité 1-1 (`:88-100`) et le service
re-vérifie la propriété du flag avant toute mutation (`flag-discipline.service.ts:200-203`,
`:236-239`) ⇒ **pas d'IDOR sur ce périmètre** (404 mesuré sur un `flag_id` étranger,
`mesures/validate-404.json`).

**+1 clé de projection** hors module : `flag_review` dans `POST /v1/session/open`
(`session.controller.ts:56` ; type `FlagReviewGlance` `session-open-sequence.service.ts:136-143` ;
calcul `:464-473`), plus `opened_game_day` (`:245`).

**Exclues** : le contrôleur BO — `@Controller('admin')` (`flag-discipline-admin.controller.ts:173`)
porte **5 routes**, toutes sous `requireStaffRole('gm'|'admin')` (`:204,266,303,343,390`), dont
**4** ont `flag` dans leur chemin (`:203,265,302,388`) et entrent donc dans les 24 hits ci-dessous.
Et **5 seams `_test`** (`core-loops-test.controller.ts:631,670,702,735,779`), enregistrés seulement
si `testControllersEnabled()` (`core-loops.module.ts:78`).

**Balayage de complétude** (au-delà des modules nommés par le dossier) :
`grep -rnE "@(Get|Post|Patch|Put|Delete)\('[^']*flag"` sur tous les `*.controller.ts` → **24 hits**,
classés un par un : **13 dans le domaine** (4 joueur + 4 admin + 5 seams `_test`) et **11 hors
domaine** — forensic `soft-flag` (4 : `forensic-test.controller.ts:1270,1373,2610` +
`forensic-admin.controller.ts:223`), reputation (3 : `reputation-test.controller.ts:1404,1745,1816`),
meta-market `cohort-flags` (4 : `meta-market-admin.controller.ts:131` +
`meta-market-test.controller.ts:617,1136,1192`) — tous des homonymes (« feature flag », « soft
flag ») sans rapport avec la discipline de signalement. 13 + 11 = 24. `…routine` dans un chemin de
route → **0**.

### 2. Corps réels

Voir `mesures/commandes.md` (commandes + protocole) et les 17 fichiers `mesures/*.json`.
Compte **frais**, jamais le compte de démo piloté en continu par l'éditeur Unity.
Scénario **dimensionné** : un corps à vide (`flag-review-fresh.json`, `cards: []`) n'est pas un
ensemble de clés ⇒ 2 lieutenants + 19 `routine_items` + 2 flags réels via le seam `force-flag`,
puis re-mesure.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | type projeté | valeurs possibles | contrainte source | mesuré |
|---|---|---|---|---|
| `trust_budget_bucket` | bande fermée, 3 membres | `low` \| `standard` \| `high` | `convergence.ts:39` (union TS) ; formule `:116-121` — `ratio = tokens/max` : `< lowRatio` → low, `> highRatio` → high, sinon standard. Défauts `max = 5`, `lowRatio = 0,4`, `highRatio = 0,8` (`flag-discipline-tunables.ts:116-120`, `:264-274`), plages DB-override `2..10`, `0,1..0,6`, `0,6..1,0` (`:66-96`) | **3/3** : 1/5 → `low`, 3/5 → `standard`, 5/5 → `high` |
| `verdict` | énuméré fermé, 2 membres côté route | `validated` \| `dismissed` | `flag-discipline.service.ts:66` | 2/2 |
| `token_returned` | booléen | `true` (validate) \| `false` (dismiss) | `:222`, `:261` | 2/2 |
| `resolved` | littéral | `true` seulement | `:65` (`readonly resolved: true`) | 1/1 |
| `descriptor.key` | clé i18n | **5 valeurs** (une par générateur) | les 5 `generators/*.generator.ts` (ancres en E1) | 1 mesurée sur 5 |
| `flag_reason.key` | clé i18n | **5 valeurs** + 1 repli générique `…reason.deviation_detected` posé quand l'appelant n'en fournit pas (`flag-discipline.service.ts:160-163` — c'est le cas du seam `force-flag`) | idem | repli mesuré |
| `flagged_game_day` | entier | ≥ 0, le `game_day` du `routine_item` source | `db/schema/flag_discipline.ts:71`, `:124` | 11, 12, 13 |
| `routine_pending_count` | entier | ≥ 0 ; `count(*)` sur `status='pending'` | `flag-discipline.repository.ts:650-656` ; domaine du statut : `pending\|auto_confirmed\|batch_confirmed\|flagged` (`db/schema/flag_discipline.ts:46-51`) | 0, 17 |
| `batch_confirm_available` | booléen dérivé | `routine_pending_count > 0` | `flag-discipline.service.ts:294` | 2/2 |
| `pending_review_count` | entier | ≥ 0 ; même jeu de lignes que `cards` | `flag-discipline.repository.ts:636-642` | 0, 2 |
| `auto_open` | booléen dérivé | `pending > 0 ET aucune AUTRE session ouverte ce jour de jeu` | `session-open-sequence.service.ts:470-472` | `false`, `true` |
| `opened_game_day` | entier | ≥ 0 | `session-open-sequence.service.ts:245` | 1 |
| `batch_confirmed_count` | entier | ≥ 0 ; lignes réellement basculées par CET appel | `flag-discipline.repository.ts:668-675` | 17, puis 0 |
| `lieutenant.name` | chaîne | libre, `varchar(64)` `NOT NULL` | `db/schema/lieutenant.ts:91` | « Salvatore », « Vito Marchetti » |
| `descriptor.params` / `flag_reason.params` | carte à clés dynamiques | `route_id` \| `building_id` \| `dealer_id` (uuid opaques) · `precursor_type` · `substance_type` | les 5 générateurs (E1) ; l'E2E ne contrôle **pas** les clés à l'intérieur de `params` (`flag_review_surface.spec.ts:371-373`) | `{route_id}`, `{generator}` |

### 4. Inventaire M (élément → ce que ça représente)

Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html`, cadres 0 et 1 de la
rangée « SÉRIE 2 » (lu par substitution des `data:` — 4,08 Mo → 23,8 Ko).

| id | élément (sélecteur) | texte / valeur dessinée | représente |
|---|---|---|---|
| M01 | `.tete .sous` (1ᵉʳ segment) | « Jour 12 » / « Jour 13 » | `opened_game_day` |
| M02 | `.tete .sous b` | « **3** » / « **0** » signalement(s) | `flag_review.pending_review_count` |
| M03 | `.tete .sous` (3ᵉ segment) | « 17 routines » / « 9 routines » | `routine_pending_count` |
| M04 | `.sig` ×3 | les cartes elles-mêmes | `cards[]` |
| M05 | `.sig .qui .nom` | « Salvatore », « Vito Marchetti », « Rosa Bellini » | `lieutenant.name` |
| M06 | `.sig .qui .jour` | « J11 », « J11 », « J12 » | `flagged_game_day` |
| M07 | `.chip.conf` (3 variantes `conf-b/conf-s/conf-h`) | « Confiance · faible / normale / élevée » | `trust_budget_bucket` |
| M08 | `.sig .quoi` | « Réacheminer la tournée 7 », « Tenir le coin du Lek malgré la surenchère », « Renouveler la licence du lavomatic » | `descriptor` — **E2** |
| M09 | `.sig .motif` | « Le nouveau trajet passe à deux rues du commissariat », « Le droit de place a doublé — la recette de la semaine peut y passer », « Elle expire ce cycle — sans elle, la façade ne couvre plus rien » | `flag_reason` — **E1** |
| M10 | `.btn-filet.valider` | « ✓ Valider » | route validate |
| M11 | `.btn-filet` | « Passer outre » | route dismiss — **E5** |
| M12 | `.routine .etape b` | « 17 » / « 9 » | `routine_pending_count` (2ᵉ occurrence) |
| M13 | `.cta` | « CONFIRMER LA ROUTINE · 17 » / « · 9 » | route batch-confirm + `routine_pending_count` (3ᵉ occurrence), présent ssi `batch_confirm_available` |
| M14 | `.cta small` | « appui long — les 3 signalements restent à votre main » | rappel de `pending_review_count` |
| M15 | `.vide.milieu` (cadre 1) | « Vos lieutenants ont tenu la ligne — rien ne réclame votre parole » | état vide, condition `cards.length == 0` |
| M18 | `.routine .etape .pt` | pastille verte, invariante | dérivé (voir table) |
| M19 | `.medl.petit svg use` ×3 | `#buste-fedora` ×3 | aucune source — **E7** |
| M20 | `.routine .etape .quoi small` | « collectes, livraisons, relèves — rien n'a dévié » | composition — **E8** |

Aucune valeur codée en dur de type géométrique (pas de `width:%` inventé comme sur les jauges des
autres écrans de la série) : **tous les nombres dessinés sortent d'une clé mesurée**. Les
constantes `17`, `9`, `3`, `12`, `13`, `J11`, `J12` sont des valeurs d'exemple, pas des valeurs
gelées — et la valeur `17` est exactement la valeur nominale que le canon annonce
(`screen_11_daily_review.md:231`, « GDD typique ≈ 17 routines »), reproduite à l'identique dans le
scénario mesuré.

### 5. Inventaire F

Sans objet — **mode maquette**, le front n'est pas jugé. Le dossier cite
`Assets/Scripts/Shell/DailyReviewScreenController.cs` comme source de l'écart E4 : ce fichier
appartient au client Unity, **hors du périmètre de lecture de ce jugement**, et E4 a été
re-vérifié **côté back** (0 occurrence, contrôle positif à 6) plutôt que recopié.

### 6. Non vérifié

1. **Les 4 autres clés `descriptor` / `flag_reason` sur 5.** Une seule paire a été mesurée dans un
   corps réel (le repli `reason.deviation_detected`, parce que le seam `force-flag` ne fournit pas
   de `flagReason`). Les 5 clés de générateur sont **lues à la source** (ancres en E1) mais aucune
   n'a transité par un corps HTTP. ⇒ *la mesure qui trancherait* : `POST /v1/_test/core-loops/
   run-flag-tick` après avoir semé le substrat des 5 générateurs (route + courier_shift, dealer,
   front-shop, stash, precursor) — coûteux, et E1/E2 ne dépendent pas du résultat (les params sont
   lus à la source, 5/5).
2. **Le rendu i18n français.** Aucun catalogue de traduction n'a été trouvé ni cherché côté back :
   je juge la **charge** (`{key, params}`), pas la phrase finale. Que « la tournée 7 » soit
   rendable dépend d'un résolveur client qui n'existe pas encore — c'est précisément E2.
3. **`route_name` sur le chemin réel des flags.** J'ai vérifié que la colonne existe et qu'un
   `GET /v1/operational/routes` la renvoie pour les routes `is_saved = true`. Je n'ai **pas**
   vérifié quelle proportion des routes qu'un `courier_shift` référence sont `is_saved` ni ont un
   nom non nul — donc L1 est fondé sur l'existence de la colonne, pas sur sa disponibilité
   effective au moment du flag.
4. **L'état `PartialState` / `OfflineState` / `ErrorState` du canon** (`screen_11_daily_review.md:
   287-292`) : la maquette ne dessine que l'état nominal et l'état vide. Pas jugé — un état non
   dessiné n'est pas un écart de **données**.
5. **Le `SemanticBar` MILD/MODERATE/SEVERE par carte** que le canon exige (`:130`) : ni en B ni en
   M, donc hors grille. La seule grandeur de sévérité en base est `deviation_score_internal` (`db/schema/
   flag_discipline.ts:122`), que R2.2 interdit de projeter (`flag_review_surface.spec.ts:363`) et
   qui n'a **aucune** bande client-facing : `SeverityBucket` rend **3 fichiers**, tous dans
   `operational/reputation/` (`boss-mirror.service.ts:297-300`, un entier de miroir de patron,
   sans rapport) — **0 dans `core_loops/flag_discipline/`**. À ne pas confondre avec le
   `severity_band: "MILD"` **mesuré** sur les cartes d'exception de `session/open`
   (`mesures/session-open.json`) : c'est la file d'exceptions, pas les signalements.
   ⇒ *si l'user veut la barre de sévérité, c'est un lot back complet* (définir la bande, pas
   seulement la projeter) — je ne l'ai pas classé faute d'un côté à mesurer.
6. **La cohésion sur un compte tické.** `GET /v1/city/district/1/cohesion` rend 404 sur compte
   frais (« the city sim has not ticked nightly »). Je n'ai pas fait tourner de tick nocturne :
   E4 ne repose pas dessus (l'absence de **tendance** est prouvée par un balayage à zéro avec
   contrôle positif, pas par ce 404).
7. **Le compte de démo** `operational_demo@example.test` : lu nulle part, comme le dossier
   l'imposait — ses corps changent de seconde en seconde sous la suite PlayMode.
