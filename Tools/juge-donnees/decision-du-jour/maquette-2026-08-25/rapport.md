# Juge données ⊥ — La Décision du jour (screen_1a, la HighestLeverageCard) — mode MAQUETTE — 2026-08-25

## En une phrase

Sur les **10 informations du domaine** que le back projette réellement, la maquette en dessine **9** —
toutes sauf `card_id`, qui est de la plomberie et n'a pas à être montrée : la couverture du domaine est
**pleine**, et le compte « six clés, toutes dessinées » de son annexe est **exact, corps en main**.
Mais sur les **25 clés joueur mesurées** pour cet écran, **16 ne sont pas dessinées** (1 plomberie,
9 frères du même corps de réponse, 6 des deux routes voisines), et je remonte **11 écarts** — dont
**4 que le dossier n'assume pas** : l'état `cap_reached: true` (mesuré productible **avec une carte
tactique**, CSS déjà écrit, aucun cadre), le libellé « elle reviendra **demain** » (mesuré faux : la
carte revient à la **session** suivante, même jour de jeu), « la carte est tranchée, **sans retour** »
(mesuré : le commit ne résout rien, la carte est **ré-émise à l'identique** au `session/open` suivant,
`card_id` neuf) et l'état vide du cadre 4, que le **canon de l'écran déclare « Non applicable »**.
Les deux lots proposés au cadre 5 sont, **tels que nommés, insuffisants** : L1 ne peut pas produire le
nombre dessiné, L2 ne peut pas produire le nom.

## Écarts à consigner (mode maquette)

Gravité : **A** = un joueur le rencontrera et l'écran ne sait pas quoi afficher · **B** = le libellé dit
autre chose que ce que le back fait · **C** = hypothèse vraie aujourd'hui, non gardée.

| # | information | B | M | statut | gravité | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|---|
| **E1** | l'état **`structural_budget.cap_reached: true`** de la ligne de budget | ● | – | **disponible, PRODUCTIBLE, non dessiné** | **A** | mesuré `mesures/session-open-cap-reached.json` : `structural_budget = {"used":1,"cap_reached":true}` **avec** `hl_card.structural = false`. Cap = 1 (`core-loops-tunables.ts:428-431`, plage 1..2) ; `cap_reached = used >= cap` (`session-open-sequence.service.ts:326`). Écrivain de production **unique** du compteur : `structural-decision-governor.repository.ts:99` — appelé depuis **6 contrôleurs joueur** (`real-estate.controller.ts:96,129` · `lieutenant.controller.ts:196,230,271,391` · `meta-progression.controller.ts:116,144` · `horizon-adoption.controller.ts:69` · `decommission.controller.ts:63` · `replacement-option.controller.ts:84`). Le CSS de l'écran prévoit l'état : `.budget .pt.pris` et `.budget b.pris` **définis 1 fois chacun**, **0 usage** dans les 3 cadres (`ecrans-brennar-2.html:352` et `:356` vs `:362-420`). ⚠️ L'écart assumé du dossier décrit un AUTRE état (« carte **structurelle** + budget consommé », lui effectivement improductible en v1) et **masque celui-ci**, qui est le seul des deux qu'un joueur rencontrera. |
| **E2** | « elle reviendra **demain**, au même rang » (small du filet, M24) | ● | ● | **libellé faux** | **B** | mesuré : 3 `session/open` consécutifs, **tous** `opened_game_day: 1` (`session-open-fresh.json`, `session-open-with-card.json`, `session-open-after-skip.json`) ; après `skip` (200), la carte revient au `session/open` suivant avec le **même `card_id`** `d627aa9e-…` et une projection identique. La carte revient à la **session** suivante, pas « demain ». Le MÊME cadre l'écrit correctement 10 lignes plus haut : M17 « la carte revient à la **prochaine session**, au même rang ». **Deux formulations contradictoires du même fait dans le même cadre.** |
| **E3** | « la carte est tranchée, **sans retour** » (M22) et « **vous filez aux rapports** » (M14) | ● | ● | **libellé promet une finalité que le back ne donne pas** | **B** | mesuré : `commit` → 200 `{committed:true,structural:false}` ; au `session/open` suivant, `hl_card` est **une carte NEUVE** (`b067fdd8-…` ≠ `d627aa9e-…`) de la **même famille**, **mêmes bandes**, **mêmes options** (`session-open-after-commit.json`). Cause lue : `commit` n'écrit que `status='committed', resolved_at=now()` (`hl-card.repository.ts:150-155`) + `decisions_made += 1` (`session.service.ts:193`) — il **ne résout pas** le rapport d'autonomie sous-jacent, donc le fournisseur ré-émet (`autonomy-reports.provider.ts:50` filtre `resolved_at IS NULL`). « Sans retour » est vrai du `card_id`, **faux de la situation**. |
| **E4** | l'état vide (cadre 4) | ● | ● | **contredit le canon de l'écran, non consigné** | **A** | `docs/tech/08_ui_screens/screen_1a_decision_detail.md:215-217` : « `EmptyState` — **Non applicable : Screen 1a ne s'ouvre que si une `HighestLeverageCard` existe. Si appelé sans card_id valide → retour immédiat Screen 1 (guard navigation)** ». Le back, lui, **rend `hl_card: null` honnêtement** (mesuré sur compte frais) — donc l'état existe côté donnée. Ce n'est pas la maquette qui a tort : c'est une **re-base du canon**, et elle n'est **dans aucun** des 7 écarts assumés du dossier. À ratifier explicitement (ou retirer le cadre 4). |
| **E5** | la bande **haute** (`major` / `pressing`) n'est dessinée nulle part | ● | – | valeur atteignable, non dessinée | **C** | `.chip.b-maj` **définie 1 fois** (`ecrans-brennar-2.html:334`), **0 usage** dans les 3 cadres. Atteignable, mesuré à la source : impact = `issuesCount / 5` (`autonomy-reports.provider.ts:64`, cap 5 ⇒ 0,8 et 1,0 donnent `major` par `impactBucket` `hl-card-projection.ts:51`) ; urgency = `ageHours / 48` (`:65` + tunable horizon) ⇒ `pressing` dès 33,6 h. Les 3 bandes existent des deux côtés (`ImpactEstimateBucket` `:44`, `UrgencyBucket` `:46`), **2 sur 3** sont dessinées. |
| **E6** | la maquette fige **`options.length == 2`** | ● | ● | hypothèse vraie aujourd'hui, **non gardée** | **C** | contrat : « **2..4** qualitative decision options » (`hl-card-types.ts:99-105`, colonne `options jsonb` `core_loops.ts:51` — **aucune contrainte DB**, `projectHlCard` rend `DecisionOption[]` non borné `hl-card-projection.ts:132`). Mesuré : **8 fournisseurs sur 8** émettent exactement **2** options (les 16 `label:` relevés, annexe 3). La maquette code le 2 en dur **trois fois** (le titre « Les **deux** issues », deux pastilles A/B, deux CTA). Vrai aujourd'hui ⇒ à consigner **avec son détecteur** (un test qui compte les options des 8 fournisseurs et rougit au 9ᵉ), pas à laisser implicite. |
| **E7** | `decision_type_key` peut valoir **`'UNKNOWN'`** ou l'une des **16** clés du catalogue structurel | ● | – | valeur possible sans case dans la table des familles | **C** | `decisionTypeLabelFor` cherche d'abord les 8 clés HL, **puis les 16 du catalogue structurel sans filtrer `live`** (`hl-card-projection.ts:91-95`), puis rend `'UNKNOWN'` — branche défensive assumée par le fichier lui-même (`:24-27` : « never 500 the whole `open()` request over a diagnostic string »). La table des familles de la maquette a **8 lignes** : le résolveur i18n client n'a **aucun cas de repli**. |
| **E8** | les **24 chaînes françaises** (8 titres + 16 libellés d'issue) n'ont aucune source back | – | ● | **écart assumé — CONFIRMÉ et chiffré** | — | mesuré `GET /v1/i18n/bundle?locale=fr` → **67 clés**, **2 préfixes** (`error`, `game`), **0** `hl.*`, **0** nom de famille. Contrôle positif sur le même sondage : **63** clés `error.*` trouvées, donc le sondage mord. Idem `locale=en`. ⇒ le résolveur i18n client porte **100 %** du rendu de cet écran. ★ Et le bundle `fr` rend l'**anglais** pour les 3 clés d'erreur que cet écran peut recevoir (`error.resource.state_conflict` → « State conflict. », `error.resource.not_found` → « Not found. », `error.internal.unexpected` → « Unexpected. ») — la 409 « déjà tranchée » n'a donc **pas** de message français côté back. |
| **E9** | cadre 5 — « **Trois** rapports d'autonomie » (M27) : **le lot L1 nommé ne peut pas la produire** | – | ● | **la source proposée ne porte pas la grandeur dessinée** | **A** | le fournisseur ne compte **pas** les rapports : il prend le **plus ancien seul** (`.orderBy(asc(emitted_at)).limit(1)`, `autonomy-reports.provider.ts:51-52`) et compte les **issues de ce rapport-là** (`issuesCount = oldest.issues.length`, `:56`, plafond 5 `:38`). La quantité que L1 pourrait projeter est donc « **trois points dans un rapport** », **pas** « trois rapports ». *(Même famille que la forme E du socle : deux grandeurs différentes sous le même mot.)* ⇒ soit le libellé change, soit le lot change (voir la ligne ★ ci-dessous). |
| **E10** | cadre 5 — « il vient de **Salvatore** » (M29) + la ligne-lien (M30-M33) : **le lot L2 nommé ne suffit pas** | – | ● | **il manque deux lots, pas un** | **A** | (a) `targetRef` de ce fournisseur = `{ entity: 'autonomy_reports', report_id }` (`autonomy-reports.provider.ts:66`) — **pas de `lieutenant_id`** : projeter `target_ref` tel quel donne un uuid opaque, jamais un lieutenant. La colonne existe pourtant en base (`autonomy_reports.lieutenant_id`, **NOT NULL**, `queues_exceptions_cuestack.ts:182`) — c'est le **fournisseur** qu'il faut modifier, donc **pas une forme F** (pas un simple lot de projection). (b) même avec l'id, il n'y a pas de nom : mesuré sur compte frais, `lieutenant.name` = littéralement **`'Lieutenant'`** pour **2 lignes sur 2**, écrit en dur par **4 sites de production** (`lieutenant.service.ts:235` « placeholder — the locale name-pool generation is DEFERRED (spec §11) », `onboarding-grant.service.ts:367,382` « placeholder — TD-046 », `insurance-test.controller.ts:4665`). ⇒ L2 + **la table de noms L0.5 + un écrivain de nom**. |
| **E11** | `POST /v1/session/hl-card/:id/commit` et `…/skip` rendent **500** sur un id non-UUID | ● | — | **défaut back, lot 0** | **A** | mesuré ×2 : `…/pas-un-uuid/commit` → **HTTP 500 `INTERNAL_ERROR`** (`mesures/commit-nonuuid.json`), `…/pas-un-uuid/skip` → **HTTP 500** (`mesures/skip-nonuuid.json`). Aucun `ParseUUIDPipe` sur les deux `@Param('id')` (`hl-card.controller.ts:43,53`). Le reste du contrat est propre : 200 / 409 `RESOURCE_STATE_CONFLICT` / 404 `RESOURCE_NOT_FOUND` / 401 sans jeton — tous mesurés. C'est exactement l'item « `ParseUUIDPipe` sur toute route à id » du lot 0 de `CLAUDE.md`. |

★ **Alternative mesurée qui rend E9 et E10 partiellement gratuits** : `GET /v1/autonomy-reports` est une
route **joueur** sous `JwtAuthGuard` (`operational/lieutenant/autonomy/autonomy-reports.controller.ts:40-41`)
et rend **déjà** `reports[]` avec `report_id`, `lieutenant_id`, `backlog_age_cycles` et `issues[]`
(mesuré : `mesures/autonomy-reports.json`, 200, 1 rapport, 3 issues). Le **nombre de rapports** et le
**lieutenant** de cette famille sont donc atteignables **sans aucun lot back** — au prix d'un appel
propre à la famille, là où L1/L2 seraient génériques pour les 8. C'est un arbitrage produit, pas une
mesure : je le pose, je ne le tranche pas.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `decisions_remaining` — `GET /v1/meta/pressure` (mesuré **1** sur compte frais) | « il vous reste **N** décisions dans cette session » — le **vrai** budget de décisions, appliqué | **Utile ici, et c'est la question la plus dure de l'écran.** L'écran s'appelle « la décision du jour » et la seule jauge dessinée est le budget **structurel** — qu'**aucune** carte v1 ne consomme (mesuré : `used` reste 0 après commit). Cette ligne dit donc, pour **toutes** les cartes d'aujourd'hui, « ça ne coûte rien » : une jauge **toujours verte**. `decisions_remaining` est la jauge qui bouge. | **ÉLEVÉ** |
| **Q2** | `highest_leverage_cards.target_ref` (**B⁻** — en base, jamais projeté) | *ce que* la carte désigne : 5 fournisseurs sur 8 portent des tableaux d'ids, 2 un id simple, **1 un COMPTE déjà calculé** | **Utile — et une forme F pure pour une famille.** `escalation-backlog.provider.ts:59` écrit `{entity:'exception_queue', **escalated_count: count**}` : le nombre que le cadre 5 veut dessiner est **déjà en base**, déjà passé au compositeur, **seule la projection l'omet**. Un lot de projection **sans aucun nouvel écrivain**. Et c'est le seul champ qui permettrait le `RelatedLinksPanel` que le canon exige. | **ÉLEVÉ** |
| **Q3** | `highest_leverage_cards.status` (**B⁻**) | « c'est la carte que vous aviez **laissée en attente** » | **Utile.** Mesuré : après un `skip`, la carte revient avec un `card_id` **identique** et une projection **byte-identique** — le joueur n'a **aucun moyen** de savoir qu'il l'a déjà vue. C'est exactement l'information qui rend le filet « laisser en attente » honnête plutôt que muet. Valeurs contraintes par un enum PG natif à 4 membres (`core_loops.ts:28-33`). | **ÉLEVÉ** |
| **Q4** | `free_units` / `delegation_hints[].would_free` — `GET /v1/meta/complexity-budget` (mesuré `{cap:100, free_units:60, hints×4 à would_free:8}`) | « cette décision libérerait ~8 unités de complexité » | **Pas pour cette carte — et la mesure dit pourquoi.** C'est exactement ce que le canon dessine dans son `WhatThisDoesPanel` (`screen_1a…md:41`, « Frees ~8 complexity budget units »), mais `would_free` porte sur une **graduation de catégorie**, pas sur une carte HL v1 : brancher les deux comparerait **deux grandeurs différentes**. À garder au chaud pour le jour où une carte structurelle existera. | **MOYEN — ne pas câbler naïvement** |
| **Q5** | `highest_leverage_cards.surfaced_at` (**B⁻**) | « cette carte est là depuis… » | **Réfuté par la mesure, et c'est utile de le dire avant de câbler.** `reactivateCarried` **remet `surfaced_at` à `now()`** à chaque ouverture où la carte est reconduite (`hl-card.repository.ts:132`). La colonne ne porte donc **pas** « depuis quand », mais « vue pour la dernière fois ». Pour « depuis hier » il faudrait une colonne **`first_surfaced_at`** — un lot, pas une projection. | **FAIBLE en l'état** |

Les 10 autres clés disponibles non dessinées et non retenues : `session_id` (plomberie), `queue[]`,
`backlog_badge`, `queue_pressure_band`, `flag_review`, `settling_glance`, `friction_glance`,
`compression_glance`, `onboarding` (surface d'**autres** écrans, disponibles à coût nul dans le même
corps), `pressure_tier` et `decisions_this_session_display` (le second est explicitement **non
appliqué** — `pressure-tier.controller.ts:43-46` : « la cadence 12/8/4/2 **NON enforced**, un axe
DIFFÉRENT, jamais la valeur appliquée » ⇒ **ne jamais l'afficher comme un budget**), `session_ref` et
`resolved_at` (**B⁻**, plomberie).

---

## Lots back suggérés

| # | colonne / champ | table / fichier | dessiné en | forme | preuve |
|---|---|---|---|---|---|
| **L-a** | `target_ref.escalated_count` | `highest_leverage_cards.target_ref` (jsonb) | M27 (le nombre), famille `ESCALATION_BACKLOG_REVIEW` | **forme F pure** — écrit, relu, passé au compositeur, omis par la projection | `escalation-backlog.provider.ts:59` ; projection à 6 clés `hl-card-projection.ts:114-121` |
| **L-b** | `target_ref` (les 8 formes) | idem | M30-M33 (la ligne-lien) | **forme F** pour la navigation, **PAS** pour nommer un lieutenant (voir E10) | `mesures/` + les 8 `targetRef:` relevés en annexe 3 |
| **L-c** | `status` | `highest_leverage_cards.status` | non dessiné (Q3) | forme F | `core_loops.ts:52` ; enum PG 4 membres `:28-33` |
| **L-d** | `lieutenant_id` dans le `targetRef` d'AUTONOMY | `autonomy-reports.provider.ts:66` | M29/M31 | **PAS une forme F** — le fournisseur ne le met pas dans sa charge utile ; lot de **fournisseur**, pas de projection | colonne NOT NULL `queues_exceptions_cuestack.ts:182` |
| **L-e** | un nom réel de lieutenant | `lieutenant.name` | M29/M31 | **lot L0.5 + un écrivain** — la colonne existe mais vaut `'Lieutenant'` en dur | 4 sites de production, `lieutenant.service.ts:235` etc. |
| **L-f** | `ParseUUIDPipe` sur les 2 `@Param('id')` | `hl-card.controller.ts:43,53` | — | **correctif lot 0** | 500 mesuré ×2 |
| **L-g** | le nombre de rapports (si le libellé M27 est gardé) | aucune source aujourd'hui dans la carte | M27 | **nouveau calcul de fournisseur** (le provider fait `limit(1)`) | `autonomy-reports.provider.ts:51-52` |

---

## Actions : routes ↔ CTA

| route joueur | méthode + chemin | garde | CTA / geste de la maquette | apparié ? |
|---|---|---|---|---|
| ouverture de l'écran | `POST /v1/session/open` | `JwtAuthGuard` (`session.controller.ts:58`) | l'écran **n'a pas de route à lui** — il lit ce que l'ouverture lui a donné (annexe de la maquette : exact, vérifié) | ✔ |
| trancher | `POST /v1/session/hl-card/:id/commit` → `{committed, structural}` | `JwtAuthGuard` (`hl-card.controller.ts:42`) | M21 tampon « LES LIRE MAINTENANT », appui long | ✔ (mais voir E3) |
| laisser en attente | `POST /v1/session/hl-card/:id/skip` → `{skipped:true}` | `JwtAuthGuard` (`:52`) | M23 filet « Laisser en attente » | ✔ (mais voir E2) |
| revenir | — | — | M01 `‹` — navigation client, aucune route | ✔ (le canon le veut aussi, `screen_1a…md:161`) |
| aller aux rapports | `GET /v1/autonomy-reports` | `JwtAuthGuard` (`autonomy-reports.controller.ts:41`) | M14 « vous filez aux rapports » — **destination réelle, mesurée 200** | ✔ |
| **route canon absente** | `GET /v1/me/decisions/{id}` | — | le canon veut un **fetch de détail** (`screen_1a…md:91`) pour le contexte, les effets et les projections de confiance | ✘ — **0 hit** sur `me/decisions` dans tout `services/game-back/src` (contrôle positif : `session/hl-card` → **11 hits**). Le chemin canon des 3 routes diffère (`/v1/me/decisions/*` vs `/v1/session/hl-card/*`) : re-base de canon connue, pas un défaut. |
| **CTA sans route** | — | — | aucun | — |

Aucune option n'est transmise au serveur : `commit` prend **l'id de la carte et rien d'autre**
(`hl-card.controller.ts:43`), `options[]` est descriptif (`hl-card-types.ts:99-105` : « No functional
consequence this chunk »). **L'écart assumé « issue A ↔ commit, issue B ↔ skip » est confirmé**, et
mieux : il est **régulier sur les 8 familles** — la première option est toujours l'action, la seconde
toujours l'abandon (16/16 relevés, annexe 3). Ce n'est toujours pas un contrat écrit ; c'est une
régularité mesurée, qui mérite le détecteur d'E6.

---

## Table de couverture complète

**Contrôle d'arithmétique.** `|B| = 25` (10 domaine + 9 frères du même corps de réponse + 6 routes
voisines) · `|M non apparié|` cadres 3-4 `= 10` · `|M non apparié|` cadre 5 `= 7` ⇒ **somme = 42**.
Lignes effectivement écrites ci-dessous : **42** (comptées à part : A 11 + B 9 + C 6 + D 10 + E 6).
Les deux écarts de découpage se compensent et sont explicités, pour que le contrôle soit auditable et
non chanceux : **le bloc A porte 11 lignes pour 10 clés** (la clé `options` occupe **deux** lignes —
une par issue, parce que la maquette les dessine séparément) et **le bloc E porte 6 lignes pour
7 éléments** (M32 et M33 — le libellé de relation et le chevron — sont une seule affordance de
navigation, fusionnés en une ligne). 11 − 10 = +1, 6 − 7 = −1.

### Bloc A — le domaine (10 clés) — `POST /v1/session/open`

| # | information | B | M | statut |
|---|---|---|---|---|
| 1 | `hl_card == null` → « rien ne se détache » | ● | ● (M04/M25) | ✔ dessinée dans ses deux valeurs |
| 2 | `hl_card.card_id` | ● | – | plomberie des deux gestes — **non affichable**, correctement non dessinée |
| 3 | `hl_card.decision_type_key` (8 valeurs) | ● | ● (M06) | ✔ — les 8 familles ont leur ligne (voir E7 pour la 9ᵉ, `UNKNOWN`) |
| 4 | `hl_card.impact_bucket` (3 valeurs) | ● | ● (M07) | ✔ — 2 bandes sur 3 dessinées (E5) |
| 5 | `hl_card.urgency_bucket` (3 valeurs) | ● | ● (M08) | ✔ — 2 bandes sur 3 dessinées (E5) |
| 6 | `hl_card.structural` | ● | ● (M09/M10) | ✔ — valeur `false` seule dessinée, **honnête** (aucun fournisseur v1 n'émet `true`) |
| 7 | `hl_card.options[0].label` | ● | ● (M12/M13/M21) | ✔ |
| 8 | `hl_card.options[1].label` | ● | ● (M15/M16/M23) | ✔ |
| 9 | `structural_budget.used` | ● | ● (M20) | ✔ — valeur 0 seule dessinée (E1) |
| 10 | `structural_budget.cap_reached` | ● | ● (M18) | ✔ — valeur `false` seule dessinée ⇒ **E1** |
| 11 | `opened_game_day` | ● | ● (M03) | ✔ |

*(Décompte des 10 clés du domaine : l'état vide `hl_card == null` (1) + les 6 sous-clés de `hl_card`
+ les 2 de `structural_budget` + `opened_game_day` (1) = **10**. Le tableau en fait **11 lignes** parce
que `options` en occupe deux — une par issue, la maquette les dessinant séparément.)*

### Bloc B — frères du MÊME corps de réponse, disponibles à coût nul (9 clés)

| # | clé | B | M | statut |
|---|---|---|---|---|
| 12 | `session_id` | ● | – | plomberie |
| 13 | `queue[]` (16 clés par carte, mesuré 1 carte pré-semée) | ● | – | **« passé à côté ? »** — surface de l'écran File d'exceptions |
| 14 | `backlog_badge` | ● | – | idem |
| 15 | `queue_pressure_band` | ● | – | idem |
| 16 | `flag_review` `{pending_review_count, auto_open}` | ● | – | idem — surface Revue du jour |
| 17 | `settling_glance` `{settling_count, all_clear}` | ● | – | idem |
| 18 | `friction_glance` `{friction_bucket, penalty_active}` | ● | – | idem |
| 19 | `compression_glance` `{stress_bucket, week_state, forced}` | ● | – | idem |
| 20 | `onboarding` `{funnel_step, first_decision_recorded}` | ● | – | idem — ★ mesuré : **le commit HL ne pose PAS `first_decision_recorded`** (false avant ET après) ; voir « non vérifié » |

### Bloc C — routes joueur voisines mesurées (6 clés)

| # | clé (route) | B | M | statut |
|---|---|---|---|---|
| 21 | `cap` (`GET /v1/meta/complexity-budget`) | ● | – | **« passé à côté ? »** Q4 |
| 22 | `free_units` (idem) | ● | – | **« passé à côté ? »** Q4 |
| 23 | `delegation_hints[]` `{category_key, would_free}` (idem) | ● | – | **« passé à côté ? »** Q4 |
| 24 | `pressure_tier` (`GET /v1/meta/pressure`) | ● | – | disponible, non retenu |
| 25 | `decisions_remaining` (idem) | ● | – | **« passé à côté ? »** Q1 — le plus fort |
| 26 | `decisions_this_session_display` (idem) | ● | – | disponible — ⛔ **non appliqué**, ne jamais l'afficher comme budget |

### Bloc D — éléments de la maquette SANS clé B (cadres 3-4, 10 éléments)

| # | Mxx | texte | statut |
|---|---|---|---|
| 27 | M01 | `‹` (retour) | affordance de navigation, sans donnée — ✔ (le canon la veut) |
| 28 | M02 | « La décision du jour » | **chaîne d'écran** — sans source back, comme les 24 autres (E8) ⇒ **ASSUMÉ, à consigner** |
| 29 | M05 | « Ce qui pèse le plus aujourd'hui » | idem — ✔ mais **ASSUMÉ** |
| 30 | M11 | « Les deux issues » | idem, **et il fige `options.length == 2`** ⇒ **E6** |
| 31 | M14 | « la carte est tranchée — vous filez aux rapports » | **conséquence dessinée sans source** ⇒ **E3** (le back ne résout rien) |
| 32 | M17 | « la carte revient à la prochaine session, au même rang » | **conséquence dessinée sans source** — mais **exacte**, vérifiée en code : `commit` accepte `active` OU `skipped` (`hl-card.service.ts:253-262`), `skip` ne stampe pas `resolved_at` (`hl-card.repository.ts:158-163`), la carte est reconduite si elle reste top-1 (`hl-card.service.ts:131-139`). ⚠️ **avec une réserve non dessinée** : si aucun candidat n'existe plus, la carte carriée est **`superseded` — terminale** (`:126-129`), elle ne « revient » pas, elle **disparaît**. |
| 33 | M19 | « Votre décision structurelle de la session » | libellé de la ligne de budget — **ASSUMÉ** |
| 34 | M22 | « appui long — la carte est tranchée, sans retour » | ⇒ **E3** |
| 35 | M24 | « elle reviendra demain, au même rang » | ⇒ **E2** (contredit M17 dans le même cadre) |
| 36 | M26 | « Rien ne pèse plus que le reste aujourd'hui — vos affaires tiennent » | message d'état vide ⇒ **E4** (le canon dit « Non applicable ») |

### Bloc E — cadre 5, proposition de lots (7 éléments, comptés à part)

| # | Mxx | texte | statut |
|---|---|---|---|
| 37 | M27 | « **Trois** » | ⇒ **E9** — le lot L1 nommé **ne peut pas** la produire |
| 38 | M28 | « depuis hier » | ★ **productible par L1** : `ageHours` est calculé puis jeté (`autonomy-reports.provider.ts:57`) — c'est la seule des trois additions du cadre 5 que L1 donne vraiment |
| 39 | M29 | « il vient de **Salvatore** » | ⇒ **E10** — L2 + L0.5 + un écrivain de nom |
| 40 | M30 | buste `#buste-fedora` de la ligne-lien | dessiné sans source (aucune apparence de lieutenant n'est projetée) — **ASSUMÉ** |
| 41 | M31 | « Salvatore » (ligne-lien) | ⇒ **E10** |
| 42 | M32-M33 | « · son rapport le plus ancien » + `›` | navigation — **productible par L2** (`report_id` est dans `target_ref`) ⇒ **L-b** |

---

## Annexes

### Annexe 1 — Routes du domaine (compte mesuré)

Balayage : `144` fichiers `*.controller.ts` sous `services/game-back/src`. Recherche du domaine par
**deux motifs** (`decision` insensible à la casse → 44 fichiers ; `highest_leverage|HlCard|hl_card|hl-card`
→ 5 fichiers), puis lecture de chaque `@Get`/`@Post` des candidats.

**Routes joueur (`JwtAuthGuard`, hors `_test`, hors BO) portant la donnée de cet écran : 4.**

| # | méthode + chemin | ancre | rôle pour l'écran |
|---|---|---|---|
| 1 | `POST /v1/session/open` | `session/session.controller.ts:56-58` | **seul porteur** de `hl_card`, `structural_budget`, `opened_game_day` |
| 2 | `POST /v1/session/close` | `session/session.controller.ts:69-71` | idempotent ; nécessaire pour re-déclencher `computeAndPersist` |
| 3 | `POST /v1/session/hl-card/:id/commit` | `progression/loop10/hl-card.controller.ts:40-42` | trancher |
| 4 | `POST /v1/session/hl-card/:id/skip` | `progression/loop10/hl-card.controller.ts:50-52` | laisser en attente |

**Il n'existe AUCUNE route de LECTURE joueur de la carte.** Contrôle positif : `grep 'session/hl-card'`
→ **11 hits** ; `grep 'me/decisions'` (le chemin canon) → **0 hit**.

**Voisinage vérifié (routes joueur, mesurées) : 3.** `GET /v1/meta/complexity-budget`
(`meta_progression/complexity-budget.controller.ts:45-46`), `GET /v1/meta/pressure`
(`meta_progression/pressure-tier.controller.ts:48-49`), `GET /v1/autonomy-reports`
(`operational/lieutenant/autonomy/autonomy-reports.controller.ts:40-41`).

**Hors périmètre joueur** : `GET /v1/admin/players/:id/hl-card` (rôle `gm`,
`core_loops/core-loops-admin.controller.ts:440-442` — c'est **l'inversion P5** : les scalaires bruts
`impact_internal`/`urgency_internal` et `score` n'existent QUE là) ; `POST /v1/_test/core-loops/
arm-hl-provider-failure` (`core-loops-test.controller.ts:618`).

### Annexe 2 — Corps réels

Tout est dans `mesures/` ; les commandes exactes dans `mesures/commandes.sh`. Stack dev locale
(7 conteneurs, Traefik sur `http://localhost`), comptes **frais** `jd-1787683964` et `jd2-…` —
**le compte de démo n'a jamais été touché, aucun conteneur monté ni redémarré.**

**`POST /v1/session/open` — 12 clés de premier niveau** (mesuré, compte frais) :
`backlog_badge, compression_glance, flag_review, friction_glance, hl_card, onboarding,
opened_game_day, queue, queue_pressure_band, session_id, settling_glance, structural_budget`.

**`hl_card` — 6 clés** (mesuré sur carte réelle, `mesures/session-open-with-card.json`) :
`card_id, decision_type_key, impact_bucket, options, structural, urgency_bucket`. Corps :

    {"card_id":"d627aa9e-…","decision_type_key":"AUTONOMY_REPORTS_PENDING","impact_bucket":"moderate",
     "urgency_bucket":"elevated","structural":false,
     "options":[{"label":"hl.option.autonomy_reports.review_now"},{"label":"hl.option.autonomy_reports.leave_pending"}]}

Dimensionnement (un corps vide n'est pas un ensemble de clés) : compte frais ⇒ `hl_card: null`
(mesuré). Une ligne `autonomy_reports` non résolue, 3 issues, émise il y a 30 h ⇒ impact 3/5 = 0,60 →
`moderate`, urgency 30/48 = 0,625 → `elevated`. Les deux bandes **prédites avant la mesure** par
`impactBucket`/`urgencyBucket` (`hl-card-projection.ts:50-62`) et **rendues telles quelles**.

**Séquence des deux gestes** (mesurée de bout en bout) :

| geste | code | corps |
|---|---|---|
| `skip` sur `active` | **200** | `{"skipped":true}` |
| `skip` sur `skipped` | **409** | `RESOURCE_STATE_CONFLICT` — « is 'skipped', not 'active' — cannot skip. » |
| `session/open` après skip | 200 | **même `card_id`**, projection identique ⇒ la carte est reconduite |
| `commit` sur `skipped` | **200** | `{"committed":true,"structural":false}` — un carried skippé **reste tranchable** |
| `commit` sur `committed` | **409** | « is already 'committed'. » |
| `commit` sur uuid inconnu | **404** | `RESOURCE_NOT_FOUND` |
| `commit` / `skip` sur **non-uuid** | **500** ⚠ | `INTERNAL_ERROR` — voir E11 |
| `commit` sans jeton | **401** | — |
| `session/open` après commit | 200 | **carte NEUVE**, même famille, mêmes bandes ⇒ E3 |
| `structural_budget` après commit | — | `{"used":0,"cap_reached":false}` — **inchangé** ⇒ la note M10 (« ne consomme pas ») est **VRAIE**, mesurée |

**Voisinage** : `GET /v1/meta/complexity-budget` → `{"cap":100,"free_units":60,"delegation_hints":[
{"category_key":"ROUTE_ASSIGNMENT","would_free":8}, …×4]}` · `GET /v1/meta/pressure` →
`{"pressure_tier":1,"decisions_remaining":1,"decisions_this_session_display":12}` ·
`GET /v1/autonomy-reports` → `{"reports":[{"report_id","lieutenant_id","backlog_age_cycles":0,"issues":[×3]}]}`.

**B⁻ — en base, non projeté.** `highest_leverage_cards` a **11 colonnes** (`db/schema/core_loops.ts:41-74`).
La projection en porte **6**. Hors `player_id` (identité, jamais projetable), **5 colonnes sont en base
et dans aucune projection joueur** :

| colonne | type | ce qu'elle porte | dessinée ? |
|---|---|---|---|
| `session_ref` | uuid nullable, soft-ref | la session qui a fait surface | non |
| `target_ref` | jsonb NOT NULL | **la cible** — l'entité et ses ids, parfois un compte | **oui, M27/M30-M33** ⇒ **L-a / L-b** |
| `status` | enum PG 4 membres | `active/committed/skipped/superseded` | non ⇒ **Q3** |
| `surfaced_at` | timestamptz NOT NULL | remis à `now()` à chaque reconduction ⇒ **pas** « depuis quand » | non ⇒ **Q5, réfutée** |
| `resolved_at` | timestamptz nullable | null tant que non terminal | non |

### Annexe 3 — Valeurs possibles par clé, avec la contrainte source

| clé | valeurs | contrainte lue à la source |
|---|---|---|
| `decision_type_key` | **8** clés HL, **+16** clés structurelles (le résolveur **ne filtre pas** `live`), **+`'UNKNOWN'`** | `HL_CARD_PROVIDER_CATALOGUE` (8 entrées, codes 101-108, `hl-card-types.ts:86-97`) · `STRUCTURAL_DECISION_CATALOGUE` (16 entrées, `structural-decision-catalogue.ts:117-171`) · `decisionTypeLabelFor` `hl-card-projection.ts:90-96` |
| `impact_bucket` | `minor` \| `moderate` \| `major` | union TS `hl-card-projection.ts:44` ; coupures `<0,4` / `[0,4;0,7)` / `≥0,7` `:50-54` |
| `urgency_bucket` | `low` \| `elevated` \| `pressing` | union TS `:46` ; mêmes coupures `:58-62` |
| `structural` | `false` **toujours** en v1 | `catalogueStructuralEntryFor` filtre `e.live` ET `e.code === decision_type` (`hl-card-types.ts:136-138`) ; les 8 codes v1 sont 101-108, **disjoints** des codes du catalogue structurel |
| `options[].label` | **16** clés `hl.option.*`, 2 par famille | les 8 fichiers `providers/*.provider.ts`, relevé ci-dessous |
| `structural_budget.used` | entier ≥ 0 | `player_progression_state.structural_decisions_this_session` (`player_progression_state.ts:50`) |
| `structural_budget.cap_reached` | booléen, `used >= cap`, **cap = 1** (plage 1..2) | `session-open-sequence.service.ts:326` + `core-loops-tunables.ts:428-431` |
| `opened_game_day` | entier | `gameplay_sessions.opened_game_day`, une seule lecture d'horloge (`session-open-sequence.service.ts:245` déclaration / `:332` émission) |

**Les 8 familles × 2 options — relevé exhaustif, et l'appariement aux 16 libellés français de la maquette :**

| code | `decision_type_key` | `options[0].label` | `options[1].label` | titre FR de la maquette | issues FR |
|---|---|---|---|---|---|
| 101 | `DAMAGED_BUILDING_REPAIR` | `hl.option.damaged_building.repair_via_queue` | `…leave_damaged` | Des bâtiments endommagés attendent réparation | Réparer par la file / Laisser en l'état |
| 102 | `SEVERED_ROUTE_REBUILD` | `hl.option.severed_route.reroute_now` | `…leave_severed` | Une tournée est coupée | Rerouter maintenant / Laisser coupée |
| 103 | `ESCALATION_BACKLOG_REVIEW` | `hl.option.escalation_backlog.review_now` | `…leave_pending` | Des escalades s'accumulent | Les passer en revue / Les laisser en attente |
| 104 | `AUTONOMY_REPORTS_PENDING` | `hl.option.autonomy_reports.review_now` | `…leave_pending` | Des rapports d'autonomie attendent votre lecture | Les lire maintenant / Les laisser en attente |
| 105 | `LEGAL_CASE_DECISION` | `hl.option.legal_case.accept_plea_deal` | `…let_ride` | Une affaire judiciaire attend votre choix | Accepter l'accord / Laisser courir |
| 106 | `BACKPRESSURE_CRITICAL_TRACE` | `hl.option.backpressure_critical_trace.trace_now` | `…leave_pending` | La chaîne sature à un point critique | Remonter la trace maintenant / Laisser en attente |
| 107 | `MYCELIAL_STRESSED_LEG` | `hl.option.mycelial_stressed_leg.maintain_now` | `…leave_stressed` | Un tronçon de la chaîne fatigue | Entretenir maintenant / Laisser fatiguer |
| 108 | `CUE_CASCADE_FALLOUT` | `hl.option.cue_cascade_fallout.review_now` | `…leave_pending` | Une cascade d'exceptions retombe sur la file | La passer en revue / La laisser en attente |

**16 clés ↔ 16 libellés, appariement 1:1, sans reste** — et la régularité est stricte : `options[0]` est
**toujours** l'action, `options[1]` **toujours** l'abandon, 8 fois sur 8. C'est ce qui rend l'écart
assumé « A ↔ commit, B ↔ skip » raisonnable ; ça reste une régularité mesurée, pas un contrat (E6).

**Ce que chaque fournisseur CALCULE puis JETTE (l'assiette réelle du lot L1) :**

| famille | grandeurs calculées, non projetées | ancre |
|---|---|---|
| `AUTONOMY_REPORTS_PENDING` | `issuesCount` (**du rapport le plus ancien**, ≤ 5), `ageHours` | `autonomy-reports.provider.ts:56-57` |
| `DAMAGED_BUILDING_REPAIR` | `damagedIds.length`, `total`, `daysDamaged` | `damaged-building.provider.ts:79-81` |
| `SEVERED_ROUTE_REBUILD` | `severedIds.length`, `total` | `severed-route.provider.ts:56-58` |
| `ESCALATION_BACKLOG_REVIEW` | `count` — **déjà écrit dans `target_ref.escalated_count`** | `escalation-backlog.provider.ts:57-59` |
| `LEGAL_CASE_DECISION` | `chargeSeverity`, `ticksRemaining`, `caseDurationTicks` | `legal-case.provider.ts:63-65` |
| `BACKPRESSURE_CRITICAL_TRACE` | `criticalBuildingIds.length`, `total` | `backpressure-critical-trace.provider.ts:81-83` |
| `MYCELIAL_STRESSED_LEG` | `stressedLegIds.length`, `total` | `mycelial-stressed-leg.provider.ts:68-70` |
| `CUE_CASCADE_FALLOUT` | `cascadeIds.length`, `total` | `cue-cascade-fallout.provider.ts:78-80` |

⇒ **7 familles sur 8 calculent un cardinal** que L1 pourrait projeter. **La 8ᵉ — celle que la maquette
dessine — ne le calcule pas** (E9).

### Annexe 4 — Inventaire M (Mxx → ce que ça représente)

**Cadre 3 « une carte se détache » (`ecrans-brennar-2.html:364-385`) — 24 éléments porteurs :**
M01 `‹` retour · M02 « La décision du jour » titre d'écran · M03 « Jour 26 » ← `opened_game_day` ·
M04 « **une** carte se détache » ← `hl_card != null` · M05 kicker « Ce qui pèse le plus aujourd'hui » ·
M06 titre de la carte ← `decision_type_key` · M07 « Portée · modérée » ← `impact_bucket` ·
M08 « Urgence · faible » ← `urgency_bucket` · M09 « Tactique » ← `structural: false` ·
M10 note « Trancher ne consomme **pas** votre décision structurelle de la session. » ← dérivé de `structural` ·
M11 « Les deux issues » · M12 pastille « A » ← `options[0]` (ordinal) · M13 « Les lire maintenant » ←
`options[0].label` · M14 « la carte est tranchée — vous filez aux rapports » ← conséquence ·
M15 pastille « B » (style *attente*) ← `options[1]` · M16 « Les laisser en attente » ← `options[1].label` ·
M17 « la carte revient à la prochaine session, au même rang » ← conséquence ·
M18 pastille verte + « **libre** » ← `cap_reached: false` · M19 « Votre décision structurelle de la session » ·
M20 « aucune prise pour l'instant » ← `used: 0` · M21 tampon « LES LIRE MAINTENANT » ← `options[0]` + le geste `commit` ·
M22 « appui long — la carte est tranchée, sans retour » · M23 filet « Laisser en attente » ← `options[1]` + `skip` ·
M24 « elle reviendra demain, au même rang ».

**Cadre 4 « rien ne se détache » (`:386-396`) — 2 éléments neufs :** M25 « **rien** ne se détache » ←
`hl_card == null` · M26 « Rien ne pèse plus que le reste aujourd'hui — **vos affaires tiennent** ».

**Cadre 5 « avec les lots back L1 + L2 » (`:397-420`) — 7 éléments neufs :** M27 « **Trois** » ·
M28 « depuis hier » · M29 « il vient de **Salvatore** » · M30 buste `#buste-fedora` de la ligne-lien ·
M31 « Salvatore » (ligne-lien) · M32 « · son rapport le plus ancien » · M33 `›`.

**Classes CSS définies et JAMAIS utilisées** (compté sur `:321-360` pour les définitions et `:362-420`
pour les usages) : `.chip.struc` (1 déf. / **0** usage) · `.chip.b-maj` (1 / **0**) ·
`.budget .pt.pris` (1 / **0**) · `.budget b.pris` (1 / **0**). Contrôle positif du même comptage :
`.chip.tact` 1 déf. / **2** usages, `.chip.b-mod` 1 / **2**, `class="pt"` **3** usages. ⇒ le comptage
mord ; ces 4 états sont **stylés et non dessinés** (E1, E5).

### Annexe 5 — Ce que je n'ai pas pu vérifier

1. **Le mode est « maquette » : il n'y a pas de colonne F.** Aucun contrôleur d'écran Unity n'a été lu
   (aucun n'existe pour cet écran à ma connaissance — je ne l'ai pas mesuré, ce n'était pas mon mandat).
2. **`hl_card` mesuré sur UNE famille sur 8.** J'ai dimensionné `AUTONOMY_REPORTS_PENDING` (celle que la
   maquette dessine). Les 7 autres sont lues **en code** (leurs `targetRef`, `options`, impact/urgency),
   pas exercées. La FORME de la projection est la même pour toutes (`projectHlCard` est unique), donc
   l'ensemble de clés est sûr ; les **valeurs** des 7 autres restent DÉDUITES.
3. **`structural: true` non exercé.** Aucun fournisseur v1 ne peut l'émettre (codes disjoints, prouvé par
   lecture des deux catalogues) ; le produire demanderait un seed direct en base d'une ligne
   `highest_leverage_cards` avec un code 1-16 — je ne l'ai pas fait. Le contrat de refus
   `409 STRUCTURAL_CAP_EXHAUSTED` du gouverneur (`hl-card.controller.ts:38-39`) est donc **non mesuré**.
4. **`cap_reached: true` : la FORME est mesurée, le CHEMIN JOUEUR ne l'est pas.** J'ai posé
   `structural_decisions_this_session = 1` en base pour obtenir le corps. Que le compteur soit
   atteignable par une action joueur est **lu** (6 contrôleurs sous `JwtAuthGuard` appellent
   `governor.commit`), pas **exercé** — la mesure qui trancherait : un achat de bâtiment réel
   (`POST /v1/real-estate/…`) suivi d'un `session/open`.
5. **Une 500 que j'ai provoquée moi-même, et qui n'est PAS un défaut.** Mon premier seed
   d'`autonomy_reports` portait un `issues` mal formé (sans `option_a`/`option_b`) ⇒
   `GET /v1/autonomy-reports` a rendu **500**. Contrôle : sur un **second compte frais sans rapport**, la
   même route rend **200 `{"reports":[]}`** ; seed réparé au bon schéma (`option-pairs.ts:21`) ⇒ **200**.
   ⇒ **le 500 venait de mon seed, pas du back.** *(Je le consigne parce qu'un juge qui ne le dit pas
   livre un faux défaut — et parce que la robustesse d'une route joueur à une ligne mal formée reste,
   elle, une vraie question, hors périmètre de cet écran.)*
6. **`onboarding.first_decision_recorded` reste `false` après un `commit` de carte HL** (mesuré avant et
   après). Je n'ai **pas** lu ce qui écrit ce champ, donc je ne classe pas : c'est une **question**, pas
   un constat. Elle compte pour cet écran parce que son geste principal est un « commit » et que
   l'entonnoir d'onboarding a une étape `FIRST_COMMIT`.
7. **Le libellé « au même rang » n'est pas mesuré dans le cas concurrentiel.** J'ai prouvé la
   reconduction avec **un seul** candidat. Avec deux candidats, la carte carriée est **re-scorée à neuf**
   et perd sa place si un autre la dépasse (`hl-card.service.ts:123-142` : le vainqueur est
   `pickTopHlCandidate` **sans référence au score porté**) — lu, non exercé. Le scénario qui
   trancherait demande **deux** fournisseurs alimentés simultanément.
8. **Ni TopBar ni TabBar** ne sont dessinés, alors que le canon les exige (`screen_1a…md:21` et `:75`) —
   je le signale sans le classer : c'est une décision de **série** (le shell), pas de cet écran, et je
   n'ai pas les autres cadres de la série sous les yeux.
