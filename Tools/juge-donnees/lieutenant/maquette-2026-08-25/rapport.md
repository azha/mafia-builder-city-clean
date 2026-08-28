# Juge données ⊥ — Lieutenant (fiche `screen_4` + ordre permanent `screen_4a`) — mode MAQUETTE — 2026-08-25

## En une phrase

La maquette montre **20 informations**, dont **5 seulement** ont une source dans ce que le back
renvoie aujourd'hui : **15 écarts à consigner** (4 réparables par une projection, 3 par des tables
qui n'ont **aucun écrivain**, 8 sans aucun modèle en base), **4 d'entre eux sont des scalaires bruts
que le canon P5/R2.2 interdit explicitement**, et **48 clés disponibles** sur 6 routes joueur du
domaine ne sont **pas dessinées du tout** — dont deux surfaces entières (`autonomy-reports`,
`me/reputation`) que la maquette ignore.

---

## Écarts à consigner (mode maquette : `– ●`, dessiné sans source)

### E-A — dessiné, la colonne EXISTE en base, la projection l'omet ⇒ **lot back, forme F** (4)

| # | information (Mxx) | colonne B⁻ | preuve |
|---|---|---|---|
| **E1** | **M01** « Salvatore » + **M07** « Sal » (le nom / le surnom) | `lieutenant.name` varchar(64) NOT NULL | colonne : `db/schema/lieutenant.ts:91` · absente des 17 clés mesurées : `mesures/04-lieutenant-detail.json` · ⚠️ **la valeur réelle est `Lieutenant`** (mesuré `mesures/07-db-lieutenant-row.txt`, colonne 2) — les **3** écrivains de production posent ce littéral : `operational/lieutenant/lieutenant.service.ts:235` « *placeholder — the locale name-pool generation is DEFERRED* », `onboarding/onboarding-grant.service.ts:367` et `:382`. **Projeter la colonne ne suffit pas : il n'existe aucune table de noms.** Pas de surnom en base (0 colonne). |
| **E2** | **M08** « LE VERGE » (le lieu d'affectation) | `lieutenant.assigned_building_id` uuid | colonne : `db/schema/lieutenant.ts:141` · valeur réelle non nulle mesurée (`07-db-lieutenant-row.txt`, `165cb490-…`) · la projection ne la lit que pour dériver `op_state_band` (`lieutenant.projection.service.ts:322`) et ne la renvoie jamais. Le nom du quartier suppose en plus une jointure bâtiment→district non projetée. |
| **E3** | **M09** « DEPUIS 34 JOURS » (l'ancienneté) | `lieutenant.recruited_at` timestamptz NOT NULL | colonne : `db/schema/lieutenant.ts:111` · valeur réelle `2026-08-25 18:48:04+00` (`07-db-lieutenant-row.txt`) · **le canon la veut** : `docs/tech/08_ui_screens/screen_4_lieutenant_detail.md:216` en-tête « `Logistics · Recruited Day 3` ». Non projetée. |
| **E4** | **M10** « 82% » / Loyauté | `lieutenant.loyalty_seed_bucket` pgEnum | colonne : `db/schema/lieutenant.ts:164`, domaine `('seeded','tested','tempered','fractured')` `:53` · **écrite UNE fois** au hire de quête et **renvoyée UNE fois** dans `POST /v1/recruitment/quests/:id/advance` (`operational/recruitment/recruitment.controller.ts:144`) — **aucune route de lecture** (balayage `loyalty_seed_bucket` hors `db/schema` : 7 hits, 0 lecteur de projection) · **NULL sur le lieutenant du kit de départ** (mesuré `07-db-lieutenant-row.txt`, dernière colonne vide). ⚠️ voir aussi **E-D1** (la maquette en fait un %). |

### E-B — dessiné, la table existe, **zéro écrivain** ⇒ **lot back, forme A (écrire la ligne)** (3)

| # | information (Mxx) | table B⁻ | preuve |
|---|---|---|---|
| **E5** | **M16** « Préfère : Blanchir · Collecte » | `lieutenant_task_exposure.exposure_tier` | `db/schema/lieutenant.ts:237-255` · **0 fichier TS hors `db/schema/lieutenant.ts`** ne nomme la table ni son identifiant Drizzle (`lieutenantTaskExposure` : 0 hit hors schéma ; `lieutenant_task_exposure` : 0 fichier hors schéma). Les seules autres occurrences du dépôt sont 2 specs d'**existence de schéma** (`tests/e2e/infra/migrations.spec.ts:117`, `tests/e2e/operational/lieutenant_schema_foundation.spec.ts:81,438-440` — « *unchanged (7 columns)* »). |
| **E6** | **M17** « Rejette : Surveiller » | `lieutenant_task_exposure.aversion_flag` | idem E5 (`db/schema/lieutenant.ts:245`). |
| **E7** | **M18** « Veto : Aucun en cours » | `veto_assignment` (`player × category × lieutenant`) | `db/schema/lieutenant.ts:339-352`, domaine `veto_category = ('SUPPLY','FINANCIAL','PERSONNEL','OPERATIONS')` `:35` · **0 fichier TS hors schéma** (`vetoAssignment` : 0 hit ; `veto_assignment` : 0 fichier) ; l'endpoint `/admin/lieutenants/:id/veto-assignments` que le commentaire du schéma annonce (`db/schema/lieutenant.ts:202`) **n'existe pas** (`veto-assignments` : 0 hit dans tous les `*.controller.ts`). **Le canon le demande explicitement** : `screen_4_lieutenant_detail.md:254` « `Veto assignments: Supply, Operations` ». ⚠️ Un `Aucun en cours` codé en dur passerait pour vrai à jamais. |

### E-C — dessiné, **aucune colonne, aucune table** ⇒ ASSUMÉ à consigner, ou nouveau modèle (8)

| # | information (Mxx) | ce qu'il faudrait | preuve d'absence |
|---|---|---|---|
| **E8** | **M04** « 3 hommes » | un effectif rattaché au lieutenant | `crew` / `soldier` / `headcount` dans `db/schema/` : **0 fichier chacun**. Le seul hit `subordinate` est `reputation_state.ts:228` (`norms_flags.fairness_to_subordinates`, un booléen de norme). Aucun modèle d'équipe. |
| **E9** | **M06** silhouette `#buste-fedora` (le RANG) | un rang lisible au chapeau | la maquette Famille pose la convention (`ecrans-brennar.html:339` « chapeau (lieutenants), casquette (les hommes) ») ; côté B rien ne distingue un rang — `granted_role` (4 valeurs) est une **autorité**, pas un rang, et `primary_or_understudy` est B⁻ non projeté. |
| **E10** | **M07** « Sal » (le surnom) | une colonne de surnom | 0 colonne (`db/schema/lieutenant.ts:91-92` : `name` + `name_locale`, rien d'autre). Fusionné avec E1 pour le lot. |
| **E11** | **M15** « Probation : ACCOMPLIE » | un état de probation | `probation` dans tout `services/game-back/src` : **1 fichier**, `operational/template_library/recruitment-quest-template-library.ts` (un gabarit de quête), aucune colonne, aucune projection. |
| **E12** | **M19** segmenté « Collecte / Blanchir(on) / Surveiller ✕ » | un domaine fermé de 3 verbes d'ordre | `POST /v1/lieutenants/:id/standing-order` n'accepte que `{ rule_source, lapse_action }` (`lieutenant.controller.ts:111-114`). Le seul domaine fermé voisin est le vocabulaire DSL `IrActionKind` = **7 valeurs** `EXECUTE_DEFAULT / PAUSE_OPS / REQUEST_PLAYER_INPUT / DISPATCH_COURIER / SET_STANCE / TOGGLE_EPHEMERAL / SCHEDULE_MAINTENANCE` (`dsl/ir.ts:81-90`) — **aucune ne se lit « Collecte », « Blanchir » ou « Surveiller »**. Le domaine `TaskCategoryKey` en a une voisine, `CASH_LAUNDERING`, mais elle est **RESERVED** (« *no player-verb surface to retire on this base yet* », `meta_progression/task-category-catalogue.ts:44-47`). |
| **E13** | **M19-bis** le segment **désactivé** « Surveiller ✕ » (`opacity:.45`) | la règle qui désactive | dérive de E6 (aversion) : pas de source, donc le front choisirait seul quel segment griser. |
| **E14** | **M20** « Sal rejette la surveillance — l'ordre coûterait de la loyauté » | une clé i18n + ses `params` | mesuré : `GET /v1/i18n/bundle` rend **67 messages, locale `en`** (`mesures/20-i18n-bundle.json`), dont **2 seulement** touchent le lieutenant (`game.lieutenant.assignment.summary`, `game.lieutenant.recap.actions_taken`). Occurrences dans le bundle : `archetype` 0, `autonomy` 0, `tenure` 0, `drift` 0, `COOK` 0, `BOOKKEEPER` 0. **Aucun des 16 libellés français de la maquette n'a de clé.** |
| **E15** | **M21** « Cible : Lavomatic du bloc médian » | une cible d'ordre | la colonne `standing_order.target_entity_id` est NOT NULL (`db/schema/lieutenant.ts:278`) et l'insert de production y écrit une **constante inerte** : `operational/lieutenant/standing-order/standing-order.repository.ts:182` « `target_entity_id: INERT_TARGET_ENTITY_ID, // legacy polymorphic target (NOT NULL); inert in M2` » (et `instruction_type: 0` `:181`, même mention). La route n'a **aucun paramètre de cible**. |
| **E16** | **M22** « Durée : 12 jours » + glissière à 62 % | une durée choisie | `lieutenant.controller.ts:109` dit verbatim « *`duration_class` is ignored in M2 (always the standard TTL — spec §3.1)* » et l'interface `StandingOrderBody` `:111-114` ne porte **que** `rule_source` + `lapse_action`. Le TTL est **fixe** : `expiresAt = now + durationStandardTicks` (`standing-order.service.ts:119`), `durationStandardTicks` **= 40** (`operational/lieutenant/lieutenant-tunables.ts:258-262`). ⇒ Un joueur qui bouge la glissière ne changerait rien. |

### E-D — **paires B/M en désaccord de FORME : la maquette affiche un scalaire là où le back projette une bande** (4) ⚠️

C'est l'écart le plus structurant, parce qu'il ne se répare **pas** côté back : le canon l'interdit.
`screen_4_lieutenant_detail.md:320` : « *tous les endpoints `lt.detail.*` ne sérialisent jamais de
scalaires de compétence (`loyalty: int`, `skill: int`) — bloqué invariant P4* ».

| # | maquette | ce que B projette | preuve |
|---|---|---|---|
| **E17** | **M10** « **82%** » Loyauté (`ecrans-brennar.html:258`) | `loyalty_seed_bucket` = 4 buckets, jamais un ratio | `db/schema/lieutenant.ts:160-164` « *the composite IS the player-facing surface (**no raw scalar loyalty anywhere**)* ». |
| **E18** | **M11** « **3/8** » Autonomie (`:259`) | `budget_bands` = map de **7 catégories** × 4 buckets — mesuré non vide : `{PRODUCTION_OPS:'full', LOGISTICS_ROUTING:'full', DISTRIBUTION_DISPATCH:'full', LAUNDERING_FLOW:'full', SECURITY_RESPONSE:'full', BOOKKEEPING_AUDIT:'full', CROSS_CATEGORY_INCIDENT:'full'}` (`mesures/12-lieutenant-detail-after.json`) | `screen_4_lieutenant_detail.md:308` : « `budget.entries` per `AutonomyCategoryRef` (bucket `AutonomyBucketComposite` uniquement — **jamais compteur interne**) ». Un « 3/8 » exigerait le compteur ET le plafond, tous deux privés (`autonomy-category.ts:53` « *Never surfaced (R2.2 — a private…* »). ⇒ **la maquette montre 1 nombre là où le back en donne 7 bandes** : ce n'est pas un problème de format, c'est un problème de **cardinalité**. |
| **E19** | **M14** « Curriculum » barre **66 %** + « **8/12** » (`:263`) | `hidden_curriculum.uniform_tells` = **4 indices binaires** (`collar buttoned\|open`, `sleeves rolled\|down`, `watch visible\|hidden`, `gloves clean\|dirty`) — mesuré : `{"collar":"open","sleeves":"down","watch":"hidden","gloves":"dirty"}` (`mesures/06-me-reputation.json`) | domaines : `operational/reputation/hidden-curriculum.service.ts:172-181` · shape : `reputation-hub.service.ts:115-120`. Aucun compteur de progression n'existe. Le voisin qui en a un est `GET /v1/meta/task-categories` → `mastery_bucket` (`NASCENT\|LEARNING\|PRACTICED\|ELIGIBLE`) + `progress_band` (`LOW\|MEDIUM\|HIGH`) (`meta_progression/mastery-bucket.ts:33,38`) — **des bandes, toujours pas un 8/12**. |
| **E20** | **M22** glissière « 12 jours » à **62 %** (`:275`, CSS `.fait{width:62%}` `:106`, `.pouce{left:62%}` `:107`) | rien (cf. E16) | une position codée en dur, sans variable. |

### E-E — pair B/M dont la VALEUR dessinée n'est dans aucun domaine de la clé supposée (1)

| # | maquette | ambiguïté | preuve |
|---|---|---|---|
| **E21** | **M12** « **Stable** » sous le libellé « **Signal** » (`:260`) | le LIBELLÉ dit *signal* → `drift_phase`, dont le domaine est `DIRECT_ALIGNED \| DRIFTING \| INCIDENTAL_LOCKED \| RESETTING` — **`Stable` n'y est pas**. La VALEUR `Stable` est exactement `extinction_state = 'STABLE'` (`db/schema/lieutenant.ts:20`), qui est **B⁻ (non projeté)**. | `operational/lieutenant/signal-drift/signal-drift-cues.ts:35` · mesuré `drift_phase: "DIRECT_ALIGNED"` puis `"RESETTING"` après une décision (`04-` vs `14-lieutenant-detail-after2.json`). ⇒ **à trancher : est-ce la phase de dérive (disponible) ou l'état d'extinction (à projeter) ?** Le canon met les deux sur le même écran (`screen_4:251` « `Extinction: STABLE` » ET `:283` « `Drift phase: DRIFTING ⚠` »). |

---

## « Passé à côté ? » — pour l'user

Classé par intérêt joueur décroissant. **Tu proposes, l'user tranche.**

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `reports[]` **entier** — `GET /v1/autonomy-reports` (`operational/lieutenant/autonomy/autonomy-reports.controller.ts:40`) : `{report_id, lieutenant_id, backlog_age_cycles, issues[]{issue_id, category, refused_action, decided, option_a{label_key,effect_kind,projected_outcome}, option_b{…}}}` (`autonomy-reports.projection.ts:12-17`) | « **ce que ton lieutenant a REFUSÉ de faire faute d'autonomie, et les deux options qu'il te soumet** » — avec l'âge de la file | **Utile ici, et c'est le plus gros manque.** C'est la seule surface où le lieutenant PARLE au joueur, elle est per-lieutenant, elle est P5-propre, et la maquette n'en montre rien. Elle donne au bloc « Autonomie » un contenu réel là où « 3/8 » n'en a pas. | ★★★★★ |
| **Q2** | `hidden_curriculum.uniform_tells` (4) + `boss_mirror.portrait_posture` (`attentive\|cautious\|withdrawn\|hostile`) + `boss_mirror.consistency_cue` (`aligned\|drifting\|indeterminate`) — `GET /v1/me/reputation?lieutenant_id=` (`operational/reputation/reputation.controller.ts:129`) | « **comment il se tient devant toi, et ce que sa tenue trahit de tes propres règles** » | **Utile ici, et c'est fait pour ce portrait** : `portrait_posture` est littéralement *« Posture cue band on the lieutenant portrait »* (`reputation-hub.service.ts:64-65`) — la maquette a un médaillon (M06) et n'y branche rien. Les 4 tells sont la version P5-propre du « Curriculum » que la maquette dessine en 8/12. | ★★★★★ |
| **Q3** | `cue_bands` (map de **5** cues × 4 buckets) + `drift_phase` — `GET /v1/lieutenants/:id` — mesuré non vide : `{TIME_SLOT:'dormant', DIRECT_ORDER:'reliable', PEER_BEHAVIOR:'dormant', TERRITORY_STATE:'dormant', RESOURCE_AVAILABILITY:'dormant'}` (`mesures/14-…json`) | « **à quel signal il obéit vraiment** — ton ordre direct, l'heure, le voisin, le stock ? » | **Utile ici.** Le canon lui consacre un onglet entier avec ses barres (`screen_4:273-292`, l'inventaire des 5 cues à `:277-281`) ; la maquette le réduit à un mot (« Signal · Stable »). C'est la matière du bloc M12 si on veut qu'il dise quelque chose. | ★★★★☆ |
| **Q4** | `delegated[].{category_key, delegated_lieutenant_ref}` + `task_categories[].{mastery_bucket, progress_band, recall_scar, recovery}` — `GET /v1/meta/task-categories` (`meta_progression/meta-progression.controller.ts:89`) — mesuré : 4 catégories LIVE, toutes `SELF` (`mesures/21-task-categories.json`) | « **quelles responsabilités ce lieutenant tient à ta place**, et à quel point il les maîtrise » | **Utile ici** — c'est la lecture honnête de « Préfère » (M16) : non pas un goût, mais **ce qui lui est confié**. Et c'est déjà branché (`delegation_state IN ('SELF','DELEGATED','RETIRED')`, `db/migrations/0002_player_progression_state.sql:63`). | ★★★★☆ |
| **Q5** | `tenure_bucket` + les **3 effets** dérivés `script_revision_cost` (`COST_1..COST_MAX`), `reassignment_disruption` (`DISRUPT_SHORT..MAX`), `role_efficiency_bonus` (`BONUS_NONE..CAP`) — `GET /v1/lieutenants/:id` (`operational/lieutenant/tenure-inertia.ts:24-33`) | « **ce que son ancienneté te COÛTE et te RAPPORTE** : re-scripter est plus cher, le déplacer plus long, mais il rend mieux » | **Utile ici** — c'est le prix de la décision « Relever de ses fonctions » (M24) et de « SIGNER L'ORDRE » (M23), et la maquette n'affiche ni l'un ni l'autre. 4 bandes déjà disponibles, zéro travail back. | ★★★★☆ |

*Suite, moins prioritaire* : `reassign_availability` (`AVAILABLE\|ON_COOLDOWN`) — dit si le CTA M24 est
seulement possible ; `trust_budget_bucket` + `flag_frequency_band` (« combien de fois tu l'as pris en
faute ») ; `standing_order.promotion_suggested` (« il refait toujours le même ordre — promeus-le en
défaut ») ; `stability_bucket` / `decision_horizon_tier` / `cycles_ahead` (`GET /v1/meta/horizon/
execution-plans?lieutenant_id=`) ; `granted_role` (4 valeurs — la maquette n'affiche que `mode`).

---

## Lots back suggérés (B⁻ dessiné — forme F et forme A)

| # | colonne / table | table | maquette | forme | preuve |
|---|---|---|---|---|---|
| **L1** | `loyalty_seed_bucket` | `lieutenant` | M10 | **F** (projection) — 1 clé à ajouter à `LieutenantBands`, déjà un bucket, R2.2-propre par construction | `db/schema/lieutenant.ts:164` ; 0 lecteur mesuré |
| **L2** | `recruited_at` | `lieutenant` | M09 | **F** — projeter un **jour de jeu** dérivé, jamais l'horodatage (P5) | `db/schema/lieutenant.ts:111` ; canon `screen_4:216` |
| **L3** | `assigned_building_id` → nom de bâtiment/quartier | `lieutenant` + `building` | M08, M21 | **F** + jointure ; ⚠️ **et une table de noms de bâtiments manque** (cf. lot 0 conventions) | `db/schema/lieutenant.ts:141` |
| **L4** | `name` | `lieutenant` | M01, M07 | **F** + **A** : projeter la colonne **ET** écrire un vrai nom — la valeur produite est le littéral `'Lieutenant'` aux 3 sites d'écriture | `lieutenant.service.ts:235`, `onboarding-grant.service.ts:367,382` ; mesuré `07-db-lieutenant-row.txt` |
| **L5** | `exposure_tier` + `aversion_flag` | `lieutenant_task_exposure` | M16, M17 | **A** (écrire la ligne) — 0 écrivain, 0 lecteur | `db/schema/lieutenant.ts:237-255` |
| **L6** | `category` | `veto_assignment` | M18 | **A** — 0 écrivain, 0 lecteur, l'endpoint annoncé n'existe pas | `db/schema/lieutenant.ts:339-352` |
| **L7** | `extinction_state` | `lieutenant` | M12 (si l'user tranche « extinction ») | **F** — pgEnum déjà fermé (`STABLE\|BURST\|FADING\|RESOLVED`) | `db/schema/lieutenant.ts:20,127` ; canon `screen_4:251` |
| **L8** | `duration` de l'ordre permanent + `target` | `standing_order` (`expires_at`, `target_entity_id`) | M21, M22 | **paramètre de route** — les 2 colonnes existent, l'insert y écrit des constantes inertes | `standing-order.repository.ts:181-182` ; `lieutenant.controller.ts:111` |
| **L9** | *(pas une colonne)* verbes d'ordre « Collecte / Blanchir / Surveiller » | — | M19 | **domaine à créer** ou re-mapper sur `IrActionKind` (7) | `dsl/ir.ts:81-90` |
| **L10** | *(pas une colonne)* clés i18n de tous les libellés d'écran + locale `fr` | — | tout l'écran | **lot 0** — bundle mesuré : 67 messages, locale `en`, 0 clé d'archétype/bande | `mesures/20-i18n-bundle.json` |

**Deux dettes back mesurées, hors couverture mais sur le chemin de cet écran :**

- **D1 — `GET /v1/lieutenants/<non-uuid>` rend `500 INTERNAL_ERROR`**, pas 422 : mesuré, `mesures/18-refusals.txt` (« `HTTP=500` », code `INTERNAL_ERROR`, `user_facing_i18n_key: error.internal.unexpected`). Aucun `ParseUUIDPipe` sur la route (`lieutenant.controller.ts:334-339`). C'est exactement la convention *lot 0*.
- **D2 — la docstring de la projection est périmée sur le domaine qu'elle décrit.** `lieutenant.projection.service.ts:22` asserte « *all **6** SHIPPED archetypes (`COOK\|SECURITY\|LOGISTICS\|BOOKKEEPER\|LAUNDERING\|DISTRIBUTION`)* » ; le type qu'elle projette en compte **9** (oracle Python sur `operational/lieutenant/lieutenant-archetype.ts:38-51` : `COOK, LOGISTICS, DISTRIBUTION, LAUNDERING, SECURITY, BOOKKEEPER, MUSCLE, INTELLIGENCE, FACILITY_MANAGER`). ⇒ `ArchetypeBand` a **10** valeurs (9 + `UNKNOWN`). Un résolveur de libellés écrit d'après la docstring en raterait **3 sur 9**. *(Le premier motif que j'ai employé — une regex non gourmande jusqu'au premier `;` — a rendu **6**, c'est-à-dire exactement la valeur qui confirmait la docstring : le `;` du commentaire `…assault scripts; requestAssault…` coupait l'union. Re-mesuré ligne à ligne.)*

---

## Actions : routes ↔ CTA

| CTA / geste (maquette) | route joueur | verdict |
|---|---|---|
| **M23** « SIGNER L'ORDRE » (`:276`) | `POST /v1/lieutenants/:id/standing-order` (`lieutenant.controller.ts:497`) — mesuré `{issued:true, order_id}` (`mesures/11-…json`) | ✔ **la route existe** — mais elle prend un `rule_source` **DSL** et un `lapse_action`, pas les 3 champs du formulaire (segment / cible / durée). ⚠️ **Refus non dessiné** : un 2ᵉ ordre rend **409 `RESOURCE_STATE_CONFLICT`** « *already has an active standing order — RENEW it instead* » (mesuré, `18-refusals.txt`). Le formulaire ne montre nulle part qu'un ordre est **déjà en cours**, ni le geste RENEW. |
| **M24** « Relever de ses fonctions » (`:277`) | **AUCUNE** | ⛔ **CTA sans route.** Balayage : les seules routes `lieutenants/…` du dépôt sont les **10** du contrôleur joueur + 2 routes BO de `flag-discipline-admin`. Aucun `fire` / `retire` : `retire` dans tout `operational/lieutenant/` = **1 hit**, et c'est un commentaire sur la *retraite d'une CATÉGORIE de tâche* (`lieutenant.controller.ts:167`), pas sur le lieutenant. `LieutenantService.retire()` — que `db/schema/lieutenant.ts:335` cite comme existant — **n'existe pas** (0 hit dans `lieutenant.service.ts`; contrôle positif : `reassign` y compte **18** hits). Voisins possibles : `POST /v1/lieutenants/:id/reassign` (déplace, ne retire pas) ou `POST /v1/meta/recall` (reprend une catégorie déléguée). |
| *(pas de CTA)* | `POST /v1/lieutenants/:id/standing-order/decision` `{RENEW\|REVOKE\|PROMOTE_TO_DEFAULT}` (`:537`) | **route sans CTA** — 3 gestes joueur livrés que la maquette ne montre pas. `PROMOTE_TO_DEFAULT` est justement ce que `standing_order.promotion_suggested` propose. |
| *(pas de CTA)* | `POST /v1/lieutenants/:id/autonomy/decision` `{reset_budget\|raise_ceiling\|override_one_shot}` (`:358`) | **route sans CTA** — mesuré `{applied:true}` ; c'est ce qui remplit `budget_bands` (mesuré : `{}` avant, 7 catégories après, `04-` vs `12-…json`). |
| *(pas de CTA)* | `POST /v1/lieutenants/:id/signal-drift/decision` `{disrupt_cue\|reinforce_direct_order\|reset_observation_window}` + `target_cue` ∈ 5 (`:422`) | **route sans CTA** — le canon lui donne pourtant un bouton (`screen_4:284` « `[ Disrupt TIME_SLOT pattern → ]` »). Mesuré : fait passer `drift_phase` de `DIRECT_ALIGNED` à `RESETTING`. |
| *(pas de CTA)* | `POST /v1/lieutenants/:id/behavior-script` + `/validate` (`:221`, `:294`) | **routes sans CTA** — c'est l'éditeur de règles `screen_4a` proprement dit ; la maquette l'a remplacé par un segmenté à 3 valeurs. |
| *(pas de CTA)* | `POST /v1/lieutenants/:id/reassign` (`:257`) | **route sans CTA** ; elle renvoie les bandes fraîches (mirror `GET /:id`). |
| *(pas de CTA)* | `POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve` `{chosen:'A'\|'B'}` (`autonomy-reports.controller.ts:55`) | **route sans CTA** — le pendant d'action de **Q1**. |
| *(pas de CTA)* | `POST /v1/meta/graduation` `{category_id, lieutenant_id}` (`meta-progression.controller.ts:109`) | **route sans CTA** — « confier une responsabilité à CE lieutenant ». |

⚠️ **Écart de FORME de refus** : le back rend des messages **en anglais, en clair**, avec des clés i18n
génériques et `payload_vars: null` (mesuré : `error.resource.state_conflict`, `error.validation.failed`,
`mesures/18-refusals.txt`). La maquette écrit ses refus en français (M20). Rien ne relie les deux.

---

## Table de couverture complète

Portée déclarée : **6 routes de LECTURE** joueur du domaine (R1–R6, annexe 1). Colonne F absente (mode maquette).

### Partie 1 — R1 `GET /v1/lieutenants/:id` (18 clés feuilles mesurées)

| B (clé) | M | statut |
|---|---|---|
| `archetype` | **M02** « Comptable » | ● ● **dessinée, disponible** — ⚠️ 10 valeurs possibles, 0 clé i18n (D2, E14) |
| `granted_role` | – | ● – **PASSÉ À CÔTÉ ?** (4 valeurs : `advisory\|executor\|delegated_owner\|cohort_overseer`) |
| `mode` | **M03** « Délégué » | ● ● **dessinée, disponible** (`tasked\|delegated`) |
| `op_state_band` | – | ● – **PASSÉ À CÔTÉ ?** (`SETTLING\|PAUSED\|ACTIVE\|IDLE`) |
| `rule_count_band` | – | ● – **PASSÉ À CÔTÉ ?** (`NONE\|FEW\|MANY` ; mesuré `NONE`→`FEW` après attache) |
| `tenure_bucket` | – | ● – **PASSÉ À CÔTÉ ?** (Q5) |
| `script_revision_cost` | – | ● – **PASSÉ À CÔTÉ ?** (Q5) |
| `reassignment_disruption` | – | ● – **PASSÉ À CÔTÉ ?** (Q5) |
| `role_efficiency_bonus` | – | ● – **PASSÉ À CÔTÉ ?** (Q5) |
| `reassign_availability` | – | ● – **PASSÉ À CÔTÉ ?** — conditionne M24 |
| `budget_bands` (map ×7) | **M11** « 3/8 » | ● ● mais **DÉSACCORD DE FORME + DE CARDINALITÉ** — **E18** |
| `cue_bands` (map ×5) | – | ● – **PASSÉ À CÔTÉ ?** (Q3) |
| `drift_phase` | **M12** « Stable » | ● ● mais **la valeur dessinée n'est pas dans le domaine** — **E21** |
| `standing_order.freshness` | – | ● – **PASSÉ À CÔTÉ ?** (`NONE\|FRESH\|EXPIRES_SOON\|EXPIRED`) — c'est **l'ordre en cours**, et le formulaire ne le montre pas |
| `standing_order.promotion_suggested` | – | ● – **PASSÉ À CÔTÉ ?** |
| `trust_budget_bucket` | – | ● – **PASSÉ À CÔTÉ ?** (`low\|standard\|high`) |
| `flag_frequency_band` | – | ● – **PASSÉ À CÔTÉ ?** (`none\|occasional\|frequent`) |
| `script_source` | – | ● – **PASSÉ À CÔTÉ ?** — ⚠️ **réfute un écart assumé du dossier** (voir §Réfutations) |

### Partie 2 — R2 `GET /v1/lieutenants` (1 clé neuve)

| B | M | statut |
|---|---|---|
| `lieutenant_id` | – | ● – handle opaque (plomberie, pas une info joueur) |

*(`archetype`, `op_state_band`, `rule_count_band`, `tenure_bucket` : doublons de R1, non recomptés.)*

### Partie 3 — R3 `GET /v1/me/reputation?lieutenant_id=` (8 clés)

| B | M | statut |
|---|---|---|
| `player_id` | – | ● – plomberie |
| `boss_mirror.portrait_posture` | – | ● – **PASSÉ À CÔTÉ ?** (Q2) — 4 valeurs, faite pour le médaillon M06 |
| `boss_mirror.declared_rules[]` | – | ● – **PASSÉ À CÔTÉ ?** |
| `boss_mirror.consistency_cue` | – | ● – **PASSÉ À CÔTÉ ?** (3 valeurs) |
| `hidden_curriculum.uniform_tells.collar` | **M14** (sujet) | ● ● **désaccord de forme** — **E19** |
| `…sleeves` | **M14** (sujet) | ● ● **désaccord de forme** — E19 |
| `…watch` | **M14** (sujet) | ● ● **désaccord de forme** — E19 |
| `…gloves` | **M14** (sujet) | ● ● **désaccord de forme** — E19 |

*(`restraint` est OMIS sans `counterparty_id` — non compté, voir §Non vérifié.)*

### Partie 4 — R4 `GET /v1/meta/horizon/execution-plans?lieutenant_id=` (4 clés)

| B | M | statut |
|---|---|---|
| `plans[]` | – | ● – **PASSÉ À CÔTÉ ?** — mesuré `[]` deux fois, y compris **après** un ordre permanent réussi (`05-` puis `15-…json`) : un ordre permanent **n'est pas** un plan d'exécution |
| `stability_bucket` | – | ● – **PASSÉ À CÔTÉ ?** (`LOW\|BUILDING\|READY_TO_ADVANCE`) |
| `decision_horizon_tier` | – | ● – **PASSÉ À CÔTÉ ?** |
| `cycles_ahead` | – | ● – **PASSÉ À CÔTÉ ?** |

### Partie 5 — R5 `GET /v1/autonomy-reports` (8 clés) — **toute la surface est ● –**

| B | M | statut |
|---|---|---|
| `reports[].report_id` | – | ● – plomberie |
| `reports[].backlog_age_cycles` | – | ● – **PASSÉ À CÔTÉ ?** (Q1) |
| `…issues[].issue_id` | – | ● – plomberie |
| `…issues[].category` | – | ● – **PASSÉ À CÔTÉ ?** (Q1) |
| `…issues[].refused_action` | – | ● – **PASSÉ À CÔTÉ ?** (Q1) — le cœur du sujet |
| `…issues[].decided` | – | ● – **PASSÉ À CÔTÉ ?** (Q1) |
| `…issues[].option_a` | – | ● – **PASSÉ À CÔTÉ ?** (Q1) |
| `…issues[].option_b` | – | ● – **PASSÉ À CÔTÉ ?** (Q1) |

### Partie 6 — R6 `GET /v1/meta/task-categories` (9 clés)

| B | M | statut |
|---|---|---|
| `task_categories[].category_key` | – | ● – **PASSÉ À CÔTÉ ?** (Q4) |
| `…mastery_bucket` | – | ● – **PASSÉ À CÔTÉ ?** (Q4) — le voisin P5-propre de M14 |
| `…progress_band` | – | ● – **PASSÉ À CÔTÉ ?** (Q4) |
| `…delegation_state` | – | ● – **PASSÉ À CÔTÉ ?** (`SELF\|DELEGATED\|RETIRED`) |
| `…delegated_lieutenant_ref?` | – | ● – **PASSÉ À CÔTÉ ?** — la clé qui rend cette route **per-lieutenant** |
| `…successor?` | – | ● – **PASSÉ À CÔTÉ ?** |
| `…recovery` | – | ● – **PASSÉ À CÔTÉ ?** |
| `…fallback_quality_bucket?` | – | ● – **PASSÉ À CÔTÉ ?** |
| `…recall_scar` | – | ● – **PASSÉ À CÔTÉ ?** — « il a déjà été relevé de cette responsabilité » |

### Partie 7 — éléments M **non appariés** (15) — tous `– ●`

| M | texte / valeur | statut | renvoi |
|---|---|---|---|
| **M01** | « Salvatore » | **lot back (F+A)** | E1, L4 |
| **M04** | « 3 hommes » | **ASSUMÉ à consigner** (aucun modèle) | E8 |
| **M06** | silhouette fedora (rang) | **ASSUMÉ à consigner** | E9 |
| **M07** | « Sal » | **ASSUMÉ à consigner** | E10 |
| **M08** | « LE VERGE » | **lot back (F)** | E2, L3 |
| **M09** | « DEPUIS 34 JOURS » | **lot back (F)** | E3, L2 |
| **M10** | « 82% » Loyauté | **lot back (F)** + **désaccord de forme** | E4, E17, L1 |
| **M15** | « Probation : ACCOMPLIE » | **ASSUMÉ à consigner** | E11 |
| **M16** | « Préfère : Blanchir · Collecte » | **lot back (A)** | E5, L5 |
| **M17** | « Rejette : Surveiller » | **lot back (A)** | E6, L5 |
| **M18** | « Veto : Aucun en cours » | **lot back (A)** | E7, L6 |
| **M19** | segmenté Collecte/Blanchir/Surveiller ✕ | **ASSUMÉ à consigner** (domaine à créer) | E12, E13, L9 |
| **M20** | hint « Sal rejette la surveillance… » | **ASSUMÉ à consigner** (+ lot 0 i18n) | E14, L10 |
| **M21** | « Cible : Lavomatic du bloc médian » | **lot back (paramètre de route)** | E15, L8 |
| **M22** | « Durée : 12 jours » | **lot back (paramètre de route)** + **désaccord de forme** | E16, E20, L8 |

### Contrôle d'arithmétique

    |clés B|                = 48   (18 R1 + 1 R2 + 8 R3 + 4 R4 + 8 R5 + 9 R6)
    |éléments M non appariés| = 15
    |rendus F sans source|     =  0   (mode maquette — pas de front)
    ------------------------------------------------------------------
    somme                     = 63
    lignes de la table        = 63   (18 + 1 + 8 + 4 + 8 + 9 + 15)   ✔

**Inventaire M complet = 22 éléments porteurs d'information** : 20 dans la table ci-dessus
(5 appariés : M02, M03, M11, M12, M14 — dont **3 en désaccord** ; 15 non appariés) **+ 2 CTA**
(M23, M24) traités dans §Actions. Non comptés comme information : le chevron de retour (`:250`),
le titre de panneau « Caractéristiques » (`:262`), les libellés de champ `Ordre permanent` /
`Cible` / `Durée` (`:269,272,274`) — étiquettes, pas données.

---

## Réfutations des écarts « assumés » du dossier

Le dossier en listait **3**. Re-vérifiés à la source, **2 tiennent, 1 est faux, 1 est plus étroit qu'annoncé**.

| écart assumé | verdict | preuve |
|---|---|---|
| « le nom `Salvatore` — `name` absent du détail (et `lieutenant_id` aussi) » | ✅ **TIENT**, et il faut ajouter que **la valeur elle-même est un placeholder** (`'Lieutenant'`). `lieutenant_id` est bien absent du détail — mais **présent** dans le roster `GET /v1/lieutenants` (`mesures/03-…json`). | mesuré ; `lieutenant.service.ts:235` |
| « l'ordre permanent existant — **aucune route ne LIT le script de comportement**, `validate`/attach n'existent qu'en écriture » | ❌ **FAUX tel qu'écrit.** `GET /v1/lieutenants/:id` **round-trippe `script_source` verbatim** : j'ai attaché `WHEN STATE(cook_idle,=,true) THEN EXECUTE_DEFAULT @50;` puis relu la route → la même chaîne, et `rule_count_band` passé de `NONE` à `FEW` (`mesures/16-` et `17-detail-after-script.json`). La docstring le dit : *« the player-authored `script_source` (the ONE allowed readable field; spec §7) »*. ⚠️ **Ce qui est vrai, c'est l'énoncé plus étroit** : l'**ORDRE PERMANENT** (`standing_order`) n'expose que `{freshness, promotion_suggested}` — jamais sa **règle**, sa **cible** ni son **échéance** (`standing-order.service.ts:45` + `:49-53`). | mesuré |
| « `succession_horizon` explicitement exclu de la projection joueur » | ✅ **TIENT.** La colonne existe (`db/schema/lieutenant.ts:115`, `real` NOT NULL default 1.0, mesurée à `1`) et la docstring de la projection l'exclut nommément deux fois (`lieutenant.projection.service.ts:17` et `:39`). Absente des 17 clés mesurées. ⚠️ mais **le canon la veut sur cet écran** : `screen_4:253` « `Succession horizon: visible (healthy)` », en **bucket** — donc c'est un arbitrage produit ouvert, pas une décision refermée. | mesuré |

---

## Annexes

### Annexe 1 — Routes joueur du domaine : **22 comptées** (le dossier en annonçait 7)

**A. `operational/lieutenant/lieutenant.controller.ts` — 10 routes, `@UseGuards(JwtAuthGuard)` sur les 10**
(compte binaire : `grep -cE "^  @(Get|Post)\('"` = **10** ; `grep -c 'UseGuards(JwtAuthGuard)'` = **10**)

    :181  POST /v1/lieutenants                                   :317  GET  /v1/lieutenants
    :221  POST /v1/lieutenants/:id/behavior-script               :334  GET  /v1/lieutenants/:id
    :257  POST /v1/lieutenants/:id/reassign                      :358  POST /v1/lieutenants/:id/autonomy/decision
    :294  POST /v1/lieutenants/:id/behavior-script/validate      :422  POST /v1/lieutenants/:id/signal-drift/decision
    :497  POST /v1/lieutenants/:id/standing-order                :537  POST /v1/lieutenants/:id/standing-order/decision

**B. `operational/lieutenant/autonomy/autonomy-reports.controller.ts` — 2 routes, MÊME module**

    :40  GET  /v1/autonomy-reports
    :55  POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve

**C. hors module, portant de la donnée keyée par `lieutenant_id` — 10 routes**

    reputation.controller.ts:129        GET  /v1/me/reputation?lieutenant_id=&counterparty_id=
    execution-plan.controller.ts:79     GET  /v1/meta/horizon/execution-plans?lieutenant_id=   (422 si absent)
    meta-progression.controller.ts:89   GET  /v1/meta/task-categories                          (delegated[].delegated_lieutenant_ref)
    meta-progression.controller.ts:109  POST /v1/meta/graduation      {category_id, lieutenant_id}
    meta-progression.controller.ts:138  POST /v1/meta/recall          {category_id}
    meta-progression.controller.ts:161  GET  /v1/meta/recall-preview/:categoryId
    flag-discipline.controller.ts:69    GET  /v1/flag-review                                   (cards[].lieutenant.{id,name})
    exceptions.controller.ts:66         GET  /v1/exceptions/queue                              (exceptions[].lieutenant_id)
    engagements.controller.ts:112       POST /v1/engagements          {lieutenant_id}  (archétype MUSCLE)
    recruitment.controller.ts:144       POST .../quests/:id/advance → {lieutenant_id, hire_quality_bucket, loyalty_seed_bucket}

⚠️ **Le balayage naïf que le dossier suggère RATE 2 de ces routes, et j'ai vérifié pourquoi.**
`grep -rlE 'lieutenant|Lieutenant' --include='*.controller.ts'` rend 33 fichiers et **exclut**
`autonomy-reports.controller.ts` (compte binaire du motif `ieutenant` dans ce fichier : **0**) et
`flag-discipline.controller.ts` (**0** également) — or la seconde projette littéralement
`lieutenant: { id, name }` (`core_loops/flag_discipline/flag-discipline.service.ts:76`). *Le mot du
domaine n'apparaît pas dans le contrôleur quand il vit dans le TYPE importé.*
**Contrôle positif du greppeur** : `reassign` dans `lieutenant.service.ts` = **18** hits.

### Annexe 2 — Corps réels

`mesures/*.json` + `mesures/README-commandes.md` (commande complète par fichier).
Compte frais `jd-1787683684`, stack locale Traefik `http://localhost`, 7 conteneurs
(`mesures/docker-ps.txt`), aucun gate en cours, **compte de démo non touché**.

**Dimensionnement effectué** (un corps vide n'est pas un ensemble de clés) : sur compte frais
`budget_bands` et `cue_bands` rendent `{}`. Deux actions **joueur** réelles les remplissent —
`autonomy/decision{reset_budget}` → 7 catégories ; `signal-drift/decision{disrupt_cue,DIRECT_ORDER}`
→ 5 cues + `drift_phase: RESETTING`. `standing_order.freshness` passe de `NONE` à `FRESH` après
`POST …/standing-order`. Tout est mesuré avant/après (`04-` vs `12-` vs `14-`).

### Annexe 3 — Valeurs possibles par clé (contrainte SOURCE, jamais recopiée d'un design)

    archetype               10  = LieutenantArchetype(9) + 'UNKNOWN'   lieutenant-archetype.ts:38-51 (oracle) ⚠️ D2
    granted_role             4  advisory|executor|delegated_owner|cohort_overseer      db/schema/lieutenant.ts:40 (pgEnum)
    mode                     2  tasked|delegated                                      db/schema/lieutenant.ts:44 (pgEnum)
    op_state_band            4  SETTLING|PAUSED|ACTIVE|IDLE                            lieutenant.projection.service.ts:98
    rule_count_band          3  NONE|FEW|MANY  (cut-point FEW_MAX=5)                   lieutenant.projection.service.ts:102, :255
    tenure_bucket            5  FRESH|ACCLIMATED|SEASONED|SENIOR|ENTRENCHED            tenure-inertia.ts:24
    script_revision_cost     4  COST_1|COST_2|COST_3|COST_MAX                          tenure-inertia.ts:27
    reassignment_disruption  4  DISRUPT_SHORT|MED|LONG|MAX                             tenure-inertia.ts:30
    role_efficiency_bonus    4  BONUS_NONE|LOW|MID|CAP                                 tenure-inertia.ts:33
    reassign_availability    2  AVAILABLE|ON_COOLDOWN                                  lieutenant.projection.service.ts:124
    budget_bands       7 clés × 4  AUTONOMY_CATEGORIES(7) × depleted|low|nominal|full   autonomy-category.ts:15-23, :28
    cue_bands          5 clés × 4  cue_type(5) × dormant|partial|reliable|dominant      db/schema/lieutenant.ts:29 · signal-drift-cues.ts:32
    drift_phase              4  DIRECT_ALIGNED|DRIFTING|INCIDENTAL_LOCKED|RESETTING     signal-drift-cues.ts:35
    standing_order.freshness 4  NONE|FRESH|EXPIRES_SOON|EXPIRED                         standing-order.service.ts:45
    trust_budget_bucket      3  low|standard|high                                       convergence.ts:39
    flag_frequency_band      3  none|occasional|frequent                                convergence.ts:35
    script_source         texte libre (DSL écrit par le joueur — le SEUL non-borné)     lieutenant.projection.service.ts:34
    portrait_posture         4  attentive|cautious|withdrawn|hostile                    reputation-hub.service.ts:65
    consistency_cue          3  aligned|drifting|indeterminate                          reputation-hub.service.ts:69
    uniform_tells         2×2×2×2  buttoned|open · rolled|down · visible|hidden · clean|dirty   hidden-curriculum.service.ts:172-181
    stability_bucket         3  LOW|BUILDING|READY_TO_ADVANCE                           stability-bucket.ts:27
    mastery_bucket           4  NASCENT|LEARNING|PRACTICED|ELIGIBLE                     mastery-bucket.ts:33
    progress_band            3  LOW|MEDIUM|HIGH                                         mastery-bucket.ts:38
    delegation_state         3  SELF|DELEGATED|RETIRED   (CHECK SQL)                    db/migrations/0002_player_progression_state.sql:63
    lapse_action (entrée)    3  REVERT_DEFAULT|HOLD_LAST|ESCALATE_TO_PLAYER             db/schema/lieutenant.ts:32 (pgEnum)
    loyalty_seed_bucket B⁻   4  seeded|tested|tempered|fractured                        db/schema/lieutenant.ts:53 (pgEnum)
    extinction_state    B⁻   4  STABLE|BURST|FADING|RESOLVED                            db/schema/lieutenant.ts:20 (pgEnum)
    veto_category       B⁻   4  SUPPLY|FINANCIAL|PERSONNEL|OPERATIONS                   db/schema/lieutenant.ts:35 (pgEnum)
    decision_horizon_tier / cycles_ahead / backlog_age_cycles : ENTIERS bruts, aucune contrainte lisible → §Non vérifié

### Annexe 4 — Inventaire M (Mxx → ce que ça représente)

Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar.html`, cadre « Lieutenant — fiche +
formulaire », **lignes 249-279** (numéros réels du fichier ; lu via `awk 'length($0)<4000 {printf "%d| %s\n", NR, $0}'`).

    M01 :252  <h3>Salvatore</h3>                            le nom du lieutenant
    M02 :252  sous-titre « Comptable »                      l'archétype
    M03 :252  sous-titre « Délégué »                        tasked vs delegated
    M04 :252  sous-titre « 3 hommes »                       l'effectif sous ses ordres
    M06 :254  <use href="#buste-fedora">                    la silhouette de RANG (fedora = lieutenant)
    M07 :255  .nom « « Sal » »                              le surnom
    M08 :256  « LE VERGE »                                  le lieu / quartier d'affectation
    M09 :256  « DEPUIS 34 JOURS »                           l'ancienneté, en jours
    M10 :258  <b>82%</b> / « Loyauté »                      la loyauté, en POURCENTAGE
    M11 :259  <b>3/8</b> / « Autonomie »                    l'autonomie, en COMPTEUR/PLAFOND
    M12 :260  <b color:cyan>Stable</b> / « Signal »         l'état du signal
    M14 :263  « Curriculum » + .cbar i{width:66%} + 8/12    la progression du curriculum, BARRE + FRACTION
    M15 :264  « Probation » = ACCOMPLIE (vert)              l'état de probation
    M16 :265  « Préfère » = « Blanchir · Collecte »         les tâches qu'il préfère
    M17 :266  « Rejette » = « Surveiller » (braise)         la tâche qu'il refuse
    M18 :267  « Veto » = « Aucun en cours »                 les vetos qu'il porte
    M19 :270  .segmente Collecte | Blanchir(.on) | Surveiller ✕(opacity .45)   le TYPE d'ordre + la sélection + le segment DÉSACTIVÉ
    M20 :271  <small> « Sal rejette la surveillance — l'ordre coûterait de la loyauté »   la conséquence prévue du choix
    M21 :273  .selecteur « Lavomatic du bloc médian » ▾     la CIBLE de l'ordre
    M22 :275  <output>12 jours</output> + .fait{62%} + .pouce{left:62%}   la DURÉE de l'ordre
    M23 :276  .cta « SIGNER L'ORDRE »                       action principale
    M24 :277  .cta.secondaire « Relever de ses fonctions »  action destructive

**Valeurs codées en dur relevées (aucune n'a de variable)** : `82%`, `3/8`, `8/12`, `width:66%` (`:263`),
`12 jours`, `width:62%` (`.fait`, CSS `:106`), `left:62%` (`.pouce`, CSS `:107`), `opacity:.45` (`:270`),
et **les 16 libellés français** — dont aucun n'a de clé dans le bundle i18n mesuré.

### Annexe 5 — inventaire F

**Sans objet — mode maquette** (le front n'existe pas encore).

### Annexe 6 — Ce que je n'ai PAS pu vérifier

1. **`restraint` (`GET /v1/me/reputation`) n'a jamais été exercé.** Il est **omis** — pas neutralisé —
   quand `counterparty_id` est absent (`reputation-hub.service.ts:250`, D-2 : *« sections omises si
   absents »*). Je n'avais aucun `counterparty_id` valide sur compte frais. **Mesure qui trancherait** :
   rejouer la route avec un `counterparty_id` réel et compter les clés de `restraint`.
2. **`plans[]` mesuré VIDE, deux fois.** Y compris après un `standing-order` réussi. Je n'ai donc **pas
   l'ensemble de clés d'un plan**, seulement celui de l'enveloppe. **Mesure qui trancherait** :
   `POST /v1/meta/horizon/execution-plans` (`execution-plan.controller.ts:55`, corps `CreateExecutionPlanBody`)
   puis re-lire — je ne l'ai pas fait pour ne pas peupler le monde au-delà du mandat.
3. **`reports[]` mesuré VIDE**, `cards[]` de `flag-review` **VIDE**, `declared_rules[]` **VIDE**.
   Les clés de Q1 viennent donc de l'**interface de projection lue à la source**
   (`autonomy-reports.projection.ts:12-17`), pas d'un corps observé ⇒ **elles portent DÉDUIT sur l'ORDRE
   et la NULLITÉ des champs**, pas sur leur existence. **Mesure qui trancherait** : un tick qui produit
   un refus d'autonomie, hors de portée d'une session de mesure.
4. **Le mode `op_state_band` n'a été observé qu'à `IDLE`** ; `SETTLING`, `PAUSED`, `ACTIVE` sont lus
   dans le code, jamais mesurés. Idem `tenure_bucket` (seulement `FRESH`), `trust_budget_bucket`
   (seulement `high`), `flag_frequency_band` (seulement `none`), `reassign_availability` (seulement
   `AVAILABLE`), `standing_order.freshness` (`NONE` et `FRESH` seulement — jamais `EXPIRES_SOON`/`EXPIRED`,
   qui demandent d'avancer l'horloge de 32 puis 40 ticks).
5. **`decision_horizon_tier`, `cycles_ahead`, `backlog_age_cycles` sont des ENTIERS BRUTS** dans des
   projections joueur. Je n'ai trouvé **aucune contrainte lisible** bornant leur domaine. Ils dérogent à
   la lettre de R2.2 (« le back projette des bandes, jamais de scalaire ») ; je ne tranche pas — je le
   signale. Idem `structural_budget.used` dans `session/open` (mesuré `0`).
6. **Je n'ai pas exercé `POST /v1/lieutenants` (recruit) ni `/reassign`** : les deux passent par le
   gouverneur Loop-10 (`StructuralDecisionGovernorService`) et auraient consommé le budget structurel de
   la session, ce qui aurait faussé les mesures suivantes. Leurs formes de réponse sont donc lues à la
   source (`lieutenant.controller.ts:187` → `{lieutenant_id, recruit_poll?}` ; `:264` → `LieutenantBands`),
   **DÉDUIT**.
7. **Le rendu ratifié `Tools/juge-visuel/lieutenant/ecran-canon.png` n'a pas été ouvert** : mon inventaire
   M vient de la **source HTML/CSS**, qui est la seule à porter les valeurs (`width:66%`, `opacity:.45`)
   qu'une image ne donnerait qu'approximativement. Si le PNG ratifié diverge du HTML, mon inventaire suit
   le HTML.
8. **Piège d'affichage rencontré et corrigé en cours de route** : la mesure `08-flag-review.json`, écrite
   par un `curl … > fichier` **nu**, est arrivée **tronquée à 201 octets** avec un marqueur `...` — le
   fichier n'était pas du JSON. Détecté par un oracle Python (longueur + 60 derniers octets de chaque
   fichier), pas par la lecture au terminal. **Toutes les mesures à partir de `08-` sont passées par
   `rtk proxy curl`** ; les 7 premières ont été re-vérifiées à l'octet (elles se terminent toutes par un
   `}}}` valide et se parsent). Les comptes qui décident dans ce rapport sont pris dans un `$( )` ou via
   un oracle Python.
