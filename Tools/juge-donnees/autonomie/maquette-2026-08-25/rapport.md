# Juge données ⊥ — La Boîte d'autonomie (screen_c7) — mode MAQUETTE — 2026-08-25

## En une phrase

La maquette dessine **13 des 23 informations disponibles** pour cet écran — **6 sans écart, 7 avec** ; **6 écarts** au total, dont
**4 dessinent un état que le back ne peut PAS produire** (le rapport à plusieurs points, la
catégorie qui ne suit pas l'archétype, le libellé de refus qui change d'un point à l'autre, le
point « tranché » visible dans la liste) ; **9 questions « passé à côté ? »**, dont trois routes
d'action joueur du domaine (`reset_budget` / `raise_ceiling` / `override_one_shot`) qu'aucun geste
ne sert ; et **2 affirmations de l'annexe sont RÉFUTÉES par la mesure** (le budget par catégorie a
bien une surface joueur ; le nom de lieutenant est bien projeté sur une route joueur).

---

## Écarts à consigner (mode maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E1** | **un rapport porte plusieurs points** (« point 1 sur 2 », « point 2 sur 2 », « 3 points ») | ● (clé `issues[]`, cardinal ≥ 2 permis par la DB) | ● (cadre 29 rapport 1, cadre 31) | **DESSINÉ NON ATTEIGNABLE** | Chaîne à 4 maillons, chacun compté — voir §« La démonstration E1 » |
| **E2** | **la catégorie du point ne suit pas l'archétype** (un « Cuisinier » avec un point de catégorie *Sécurité*) | ● `category` | ● cadre 29, point 2 | **DESSINÉ NON ATTEIGNABLE** | `lieutenant-tick.service.ts:422` `category: projectCategory(roleArchetype)` — la catégorie EST une fonction de l'archétype (`autonomy-category.ts:63-95`, 1 catégorie par archétype). Un COOK ne peut jamais produire un point `SECURITY_RESPONSE`. |
| **E3** | **les deux options ne suivent pas l'archétype** (paire *Réparer / Différer* sur un Cuisinier) | ● `option_a`/`option_b` | ● cadre 29, point 2 ; cadre 31, point 2 | **DESSINÉ NON ATTEIGNABLE** | `autonomy-report.producer.ts:70-71` : `option_a: pair.option_a` où `pair = OPTION_PAIRS[e.archetype]` (`:65`). Mesuré en vie sur un COOK : `COOK_NOW`/`COOK_REFINE` (`mesures/07-autonomy-reports-1rapport.json`). |
| **E4** | **`refused_action` rendu de deux façons dans le MÊME rapport** (« il a refusé de cuisiner » puis « il a refusé de réparer ») | ● `refused_action` | ● cadre 29 et cadre 31 | **DESSINÉ NON ATTEIGNABLE** | `autonomy-report.producer.ts:69` : `refused_action: e.archetype`. La valeur est l'archétype, donc **identique sur tous les points d'un rapport**. Mesuré : `"refused_action": "COOK"`. |
| **E5** | **un point « tranché » (✓, `.iss.tranchee`) visible dans la liste** | ● `decided` (clé présente) | ● cadre 31, point 1 | **DESSINÉ NON ATTEIGNABLE** | `autonomy-reports.service.ts:98` `allDecided = issues.every(...)` → `recordDecision(..., true)` → `autonomy-report.repository.ts:147` `resolved_at = now()` ; `listOpenByPlayer` filtre `isNull(resolved_at)` (`:124`). Avec **1 point par rapport** (E1), trancher ferme le rapport ⇒ `decided` **ne peut valoir que `null`** sur `GET /v1/autonomy-reports`. Mesuré : `decided:'A'` observé **uniquement** après injection SQL d'un 2ᵉ point synthétique (`mesures/12-autonomy-reports-partiel.json`). |
| **E6** | **le plafond « 3 cycles »** (bandeau + couleur braise de `.age.vieux`) | **–** (aucune clé) | ● cadre 31 | **DESSINÉ SANS SOURCE — à consigner ou lot back** | `backlogCapCycles` : **0 site de projection** dans tout `services/game-back/src` (7 occurrences, toutes internes au tick / au repo / aux tunables). Le client devrait coder « 3 » en dur, et le tunable est surchargeable en base (`lieutenant-tunables.ts:188`, plage 1..N). |

### La démonstration E1 — pourquoi un rapport ne peut porter qu'UN point

Quatre maillons, chacun **compté**, pas déduit :

1. **Un seul écrivain de production** de `autonomy_reports` : `AutonomyReportProducer`
   (`autonomy-report.producer.ts:77` insert, `:84` append). Balayage : 3 sites d'écriture drizzle,
   tous dans `autonomy-report.repository.ts:65,77,144`, dont les seuls appelants sont ces 2 lignes
   du producteur.
2. **Un seul émetteur de production** de l'événement de refus : `lieutenant-tick.service.ts:417`
   (balayage `emitAutonomyCeilingRefusal` : **2 occurrences**, dont 1 est la définition
   `city-event-bus.ts:3078`).
3. **La catégorie de l'événement est une fonction pure de l'archétype** :
   `lieutenant-tick.service.ts:422` `category: projectCategory(roleArchetype)` avec
   `roleArchetype = archetypeForRoleId(lt.role_id)` (`:212`) ; `projectCategory` est une table
   totale archétype → **une** catégorie (`autonomy-category.ts:63-95`).
4. **`role_id` n'est jamais mis à jour** : balayage des 6 sites `.update(lieutenant)`
   (`lieutenant.repository.ts:1025, 1042, 1058, 1075, 1102, 1131`) — aucun ne touche `role_id`.

⇒ Pour un lieutenant donné, `category` est **constante**. Or le producteur déduplique par
`(cycle, catégorie)` : `autonomy-report.producer.ts:83` `if (issues.some((i) => i.category === e.category)) return;`.
⇒ Le second refus est **toujours** écarté ⇒ `appendIssues` (`:84`) est **du code mort en
production** ⇒ `jsonb_array_length(issues) == 1`, toujours.

**Contre-mesure faite** : la base porte bien 3 rapports à 2 et 3 points — mais leurs catégories
sont `ROUTE_ASSIGNMENT` / `refused_action='reroute'`, valeurs **absentes** de `AUTONOMY_CATEGORIES`
et de `LieutenantArchetype` : ce sont des `INSERT` SQL de specs
(`tests/e2e/bo/lieutenants_autonomy.spec.ts:212`, `tests/e2e/core_loops/hl_card.spec.ts:262`), pas
de la production.

**Ce que le back produit VRAIMENT quand ça traîne** : le compteur de cycle n'avance qu'au
rafraîchissement, qui **remet tous les budgets à plein** en même temps
(`autonomy-ceiling.service.ts:174-176`). Un lieutenant qui redéplète chaque fenêtre ouvre donc
**un NOUVEAU rapport par cycle** — soit *N rapports d'UN point pour le MÊME lieutenant*, d'âges
0, 1, 2… Cet état-là, qui est l'état naturel de l'écran, **n'est dessiné nulle part**.

---

## Deux affirmations de l'annexe RÉFUTÉES par la mesure

| # | ce que l'annexe affirme | ce qui est mesuré |
|---|---|---|
| **R1** | « le budget par catégorie **n'a pas de surface joueur** » (annexe, § « Le rapport qui traîne ») | **FAUX.** `GET /v1/lieutenants/:id` projette `budget_bands` — les 7 catégories en bandes qualitatives. Mesuré en vie : `{"PRODUCTION_OPS":"depleted","LOGISTICS_ROUTING":"full",…}` (`mesures/16-lieutenant-detail.json`) ; source `lieutenant.projection.service.ts:339`. ⇒ **la « jauge de budget d'autonomie » que le canon veut a une source joueur**, à un appel par lieutenant. |
| **R2** | « le nom n'existe dans **aucune** projection » (annexe, § « Qui parle ») | **FAUX en tant qu'énoncé général.** `lieutenant.name` est projeté sur une route joueur : `GET /v1/flag-review` → `cards[].lieutenant.name` (`flag-discipline.service.ts:282`, sous `JwtAuthGuard` `flag-discipline.controller.ts:69-70`). **Vrai** pour les routes d'autonomie et pour le roster (`lieutenant.projection.service.ts` : `count('name') == 0`, contrôles positifs `budget_bands`=4, `archetype`=34). ⇒ écrire « non projeté **sur les routes de cet écran** », et noter qu'un précédent de projection existe déjà en production. ⚠️ Corps non mesuré en vie (`/v1/flag-review` rend `cards: []` sur compte frais) — le point est lu **dans le corps du code**, pas observé. |

*(Note : la valeur en base est littéralement `"Lieutenant"` pour les deux lieutenants du kit de
départ — donc même projeté, le champ ne porte aucune fiction tant que la table de noms n'existe
pas. Le refus de le dessiner reste le bon choix ; c'est l'argument qui est faux.)*

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `POST /v1/lieutenants/:id/autonomy/decision` `{kind}` ∈ `reset_budget` \| `raise_ceiling` \| `override_one_shot` (`lieutenant.controller.ts:358`) | « je lui **rends** sa marge », « je lui **élargis** sa marge pour de bon », « je lui laisse **passer celle-ci** » | **Utile ici, et c'est le geste que l'écran raconte sans l'offrir.** L'écran dit « il a refusé faute de marge » et ne propose que de faire le travail à sa place ; les trois décisions sont la réponse à la *cause*. Mesurées en vie : `reset_budget` 200, `override_one_shot` 200 (`mesures/25-*.json`) ; `raise_ceiling` 409 `STRUCTURAL_CAP_EXHAUSTED` — c'est une décision **structurelle** de session (`mesures/26-decision-raise.json`), donc à présenter comme telle. | ★★★ |
| **Q2** | `budget_bands` (`GET /v1/lieutenants/:id`) | la marge restante du lieutenant, catégorie par catégorie, en 4 bandes (`depleted`/`low`/`nominal`/`full`) | **Utile ici** : c'est le seul chiffre qui explique *pourquoi* il refuse et *quand* il refusera encore. Coût : 1 appel par lieutenant du rapport (le roster ne le porte pas). Répond exactement à la jauge que le canon réclame. | ★★★ |
| **Q3** | `outcome` (réponse du `resolve`) — **13** valeurs mesurées : `COLLECTED, COOK_REFINED, COOK_STARTED, DEFERRED, DEPOSITED, DEPOSITED_RESERVE, DISPATCHED, HELD, INJECTED, INJECTED_CONSERVATIVE, LEFT_TO_RIDE, NOOP, REPAIRED` | ce qui s'est réellement passé après le choix | **Utile ici** : aucun état d'après-geste n'est dessiné, et `NOOP` (« rien n'a pu se faire ») est **mesuré en vie sur un choix B** (`mesures/13-resolve-B.json`). Un joueur qui tranche et ne voit rien bouger n'a aucune explication. ⚠️ L'annexe en cite cinq (*collecté · réparé · différé · laissé courir · rien à faire*) — **aucune** n'est produite par la paire COOK. | ★★★ |
| **Q4** | `op_state_band` (`GET /v1/lieutenants`) — `SETTLING`/`PAUSED`/`ACTIVE`/`IDLE` | ce que le lieutenant fait **pendant** que son rapport attend | Utile : distingue « il est bloqué » de « il tourne sur autre chose ». Déjà dans le roster que l'écran appelle de toute façon. | ★★ |
| **Q5** | `emitted_at` (colonne `autonomy_reports`, **non projetée**) | la date réelle du refus | Moyennement utile : `backlog_age_cycles` dit déjà l'ancienneté, mais en *cycles*, une unité que le joueur ne voit nulle part ailleurs. Une date de jeu serait plus lisible. | ★★ |
| **Q6** | `tenure_bucket` (`GET /v1/lieutenants`) — `FRESH`/`ACCLIMATED`/… | l'ancienneté de celui qui parle | Pas ici : c'est de l'information de fiche, pas de décision. | ★ |
| **Q7** | `rule_count_band` (`GET /v1/lieutenants`) | à quel point son script est étoffé | Pas ici. | ★ |
| **Q8** | `effect_kind` (12 valeurs, `option-pairs.ts:14-17`) | le verbe technique derrière l'option | Pas ici : `label_key` le dit déjà en mots. Plomberie. | – |
| **Q9** | `report_id` / `issue_id` / `resolved` | plomberie du geste | Pas ici. | – |

---

## Lots back suggérés

| # | information | forme | maquette | preuve |
|---|---|---|---|---|
| **L1** | **projeter le plafond** — ajouter `backlog_cap_cycles` (ou `cycles_before_default`) à `AutonomyReportView` | **dessiné sans source** | M21 (bandeau) + M07 variante braise | `backlogCapCycles` : 0 site de projection ; le client devrait coder « 3 » en dur alors que le tunable est surchargeable en base (`lieutenant-tunables.ts:186-189`) |
| **L2** | **rendre les 18 `label_key` traduisibles** — `GET /v1/i18n/bundle?locale=fr` rend 4 723 octets et **0** clé `autonomy.*` (contrôle positif : `error.` présent) | clé sans texte | M12/M14 (6 libellés rendus en français dans la maquette) | `mesures/19-i18n-bundle.json` ; 18 `label_key` distincts comptés dans `option-pairs.ts` |
| **L3** | **`ParseUUIDPipe` sur `:reportId`** — un `reportId` non-UUID rend **500 `INTERNAL_ERROR`**, pas 422 | dette back du geste | le geste A/B | mesuré : `POST /v1/autonomy-reports/pas-un-uuid/issues/x/resolve` → **HTTP 500** (`mesures/20-resolve-nonuuid.json`) ; le contrôleur fait `String(reportId ?? '')` sans validation (`autonomy-reports.controller.ts:72`) |
| **L4** | *(conditionnel — si l'user veut le nom)* projeter `lieutenant.name` sur `GET /v1/autonomy-reports` ou sur le roster | **forme F** (en base, NOT NULL, relu, jamais projeté sur ces routes) | non dessiné aujourd'hui | colonne `lieutenant.name varchar(64) NOT NULL` ; précédent de projection joueur : `flag-discipline.service.ts:282`. **Sans table de noms, la valeur vaut `"Lieutenant"`** (mesuré) — le lot n'a de sens qu'avec elle |

⚠️ **L1 n'est pas un simple ajout de clé si E1 est corrigé côté produit** : voir la question
d'arbitrage ci-dessous.

---

## Ce que E1–E5 imposent comme arbitrage (pour l'user — je ne tranche pas)

Les cinq écarts ont **une seule cause** : la maquette suppose qu'un rapport agrège plusieurs
refus. Deux sorties, exclusives :

- **(a) Aligner la maquette sur le back** : un rapport = un point. Alors « point N sur M »,
  « 3 points », « 1 point à trancher », l'état « tranché » et le second point de chaque cadre
  disparaissent ; et il faut dessiner ce que le back produit vraiment — **plusieurs rapports du
  même lieutenant, d'âges différents** (voir §E1).
- **(b) Aligner le back sur la maquette** : c'est un **lot de moteur**, pas de projection — il faut
  que le refus porte une catégorie qui ne soit plus `projectCategory(archetype)`, ce qui touche la
  porte d'autonomie elle-même (`checkAndConsume` ne consulte que la catégorie primaire,
  `autonomy-ceiling.service.ts:72-73`). Beaucoup plus cher que les 4 lots ci-dessus réunis.

---

## Actions : routes ↔ gestes

| geste de la maquette | route | statut |
|---|---|---|
| tap sur l'option **A** ou **B** d'un point | `POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve` `{chosen}` (`autonomy-reports.controller.ts:55`) | ✔ apparié — mesuré 200 `{resolved:true, outcome}` ; rejeu → **409** `RESOURCE_STATE_CONFLICT` ; `chosen:"C"` → **422** ; `chosen` absent → défaut `'A'` (`:70`) |
| retour « ‹ » | — | navigation |
| *(aucun)* | `POST /v1/lieutenants/:id/autonomy/decision` — 3 `kind` | **route joueur sans geste** → Q1 |
| « Escalader » (voulu par le canon) | *(aucune route)* | ✔ correctement non dessiné — le `resolve` n'accepte que `A`\|`B` (`autonomy-reports.controller.ts:67-70`) |

**Autorisation (contrôle ⊥ fait, pas déduit)** : les deux routes sont sous `JwtAuthGuard`
(`:41`, `:57`), le `player_id` vient du JWT et jamais du corps (`resolvePlayerId`, `:76-89`), la
lecture est scopée joueur (`autonomy-report.repository.ts:124`) et le `resolve` passe par
`getOwnedReport(playerId, reportId)` (`:91`). **Mesuré avec un 2ᵉ compte frais** : `resolve` sur le
rapport du joueur 1 → **404** ; `GET` → `{"reports":[]}` (`mesures/23-idor-resolve.json`,
`mesures/24-idor-list.json`). **Pas d'IDOR.**

---

## Table de couverture complète

Comptes : **|clés B| = 23** (17 du domaine autonomie + 6 de jointure) · **|éléments M non
appariés| = 4** · **|rendus F sans source| = 0** (mode maquette) · **somme = 27 lignes**.
Les 3 lignes **B⁻** sont listées à part et n'entrent pas dans l'arithmétique.

| # | information | B | M | statut | classe |
|---|---|---|---|---|---|
| 1 | `reports[]` cardinal | ● | ● M03 « 2 rapports » / M18 « 0 rapport » / M19 état vide | affichée comme dessinée | ✔ |
| 2 | `report_id` | ● | – | plomberie | Q9 |
| 3 | `lieutenant_id` | ● | – (clé de jointure) | plomberie | Q9 |
| 4 | `backlog_age_cycles` | ● | ● M07 « ce cycle » / « depuis 1 cycle » / « depuis 3 cycles » | affichée comme dessinée — arithmétique vérifiée (0 puis 2 après bump du cycle) | ✔ |
| 5 | `issues[]` cardinal | ● | ● M04 « 3 points », M09 « point 1 sur 2 », M20 « 1 point à trancher » | **cardinal ≥ 2 non atteignable** | **E1** |
| 6 | `issue_id` | ● | – | plomberie | Q9 |
| 7 | `category` | ● | ● M08 « Production » / « Sécurité » | valeur dessinée incompatible avec l'archétype | **E2** |
| 8 | `refused_action` | ● | ● M10 « Il a refusé de cuisiner » / « … de réparer » | deux rendus d'une valeur constante | **E4** |
| 9 | `decided` | ● | ● M22 « tranché » ✓ | non-`null` inobservable sur cette route | **E5** |
| 10 | `option_a.label_key` | ● | ● M12 | dessinée ; **le texte n'a pas de source** (0/18 dans le bundle) | **L2** |
| 11 | `option_a.effect_kind` | ● | – | disponible, non dessinée | Q8 |
| 12 | `option_a.projected_outcome` | ● | ● M13 chip | affichée comme dessinée | ✔ |
| 13 | `option_b.label_key` | ● | ● M14 | idem 10 | **L2** |
| 14 | `option_b.effect_kind` | ● | – | disponible, non dessinée | Q8 |
| 15 | `option_b.projected_outcome` | ● | ● M15 chip | affichée comme dessinée — ⚠️ 3 bandes sur 4 seulement (voir Non vérifié) | ✔ |
| 16 | paire `option_a`/`option_b` (l'appariement archétype ↔ paire) | ● | ● M12–M15, M17 | paire dessinée ≠ paire de l'archétype | **E3** |
| 17 | `resolved` (resolve) | ● | – | plomberie | Q9 |
| 18 | `outcome` (resolve) | ● | – | disponible, aucun état d'après-geste dessiné | **Q3** |
| 19 | `lieutenants[].archetype` (roster) | ● | ● M05 médaillon + M06 « Cuisinier » | affichée comme dessinée — ★ **disponible sans jointure** : `refused_action` porte déjà l'archétype | ✔ |
| 20 | `lieutenants[].op_state_band` | ● | – | disponible, non dessinée | Q4 |
| 21 | `lieutenants[].tenure_bucket` | ● | – | disponible, non dessinée | Q6 |
| 22 | `lieutenants[].rule_count_band` | ● | – | disponible, non dessinée | Q7 |
| 23 | `opened_game_day` (session/open) | ● | ● M02 « Jour 26 » | affichée comme dessinée (voir Non vérifié : instantané d'ouverture) | ✔ |
| 24 | **plafond de l'arriéré** (« 3 cycles », bandeau) | – | ● M21 | **dessinée sans source** | **E6 / L1** |
| 25 | **seuil de couleur** `.age.vieux` (braise à 3 cycles) | – | ● M07-braise | **dessinée sans source** (même cause que 24) | **E6 / L1** |
| 26 | **« l'option A est le défaut »** (liseré doré `.opt.a`) | – | ● M16 | dessinée sans clé — dérivable de la POSITION (`option_a`) et du tunable `defaultOption=1`, non projeté | **ASSUMÉ à consigner** |
| 27 | **« sa marge d'autonomie est épuisée »** | – | ● M11 | prose statique, dérivable du fait qu'un rapport existe | **ASSUMÉ, acceptable** |

**Lignes B⁻ (en base, non projetées sur les routes de cet écran) — hors arithmétique :**

| # | colonne | table | dessinée ? | statut |
|---|---|---|---|---|
| B⁻1 | `name` (`varchar(64)` NOT NULL) | `lieutenant` | non | Q/L4 — précédent de projection joueur : `flag-discipline.service.ts:282` |
| B⁻2 | `emitted_at` | `autonomy_reports` | non | Q5 |
| B⁻3 | `budget.entries[cat].bucket` | `autonomy_ceiling_state` | non | **PAS un B⁻** en réalité : projeté sur `GET /v1/lieutenants/:id` → Q2 / R1 |

---

## Annexes

### 1. Routes du domaine — compte et ancres

Balayage : `grep -rn -i "autonom" --include='*.controller.ts'` sur
`services/game-back/src` → **4 fichiers** (`hl-card.controller.ts` — simple commentaire ;
`distribution-test.controller.ts` — un `script_complexity_bucket` homonyme, sans rapport ;
plus les deux ci-dessous). **Aucun contrôleur `_test` d'autonomie n'existe.**

| route | ancre | garde |
|---|---|---|
| `GET /v1/autonomy-reports` | `autonomy-reports.controller.ts:40` | `JwtAuthGuard` `:41` |
| `POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve` | `:55` | `JwtAuthGuard` `:57` |
| `GET /v1/lieutenants` (jointure — le rôle) | `lieutenant.controller.ts:317` | `JwtAuthGuard` `:318` |
| `GET /v1/lieutenants/:id` (le budget en bandes) | `:334` | `JwtAuthGuard` `:335` |
| `POST /v1/lieutenants/:id/autonomy/decision` (action, sans geste) | `:358` | `JwtAuthGuard` `:360` |

### 2. Corps réels — `mesures/` + commandes

Compte frais : `POST /v1/auth/signup` (Idempotency-Key requis) → `payload.data.access_token`,
puis `POST /v1/session/open {client_version}`. Kit de départ mesuré : **4 bâtiments**
(lab/stash/front_shop/cash_safehouse) et **2 lieutenants COOK déjà `delegated`/`executor`**.

Scénario **dimensionné** pour faire naître un rapport RÉEL (aucun n'apparaît sur compte frais) —
recette reprise de `tests/e2e/operational/lieutenant_autonomy_inbox.spec.ts:237-264` :
précurseurs (SQL) + script « toujours cuisiner » (**route joueur**
`POST /v1/lieutenants/:id/behavior-script`) + budget `PRODUCTION_OPS` déplété (SQL) + 3 ticks
(`POST /v1/_test/citysim/advance`). Le rapport est ensuite produit par le **chemin de production**
(le refus du tick), pas par une insertion.

| fichier | contenu |
|---|---|
| `01-signup.json` | 201 |
| `02-session-open.json` | 200 — 12 clés, dont `opened_game_day: 1`. ⚠️ `backlog_badge` y est le badge de la file d'**exceptions** (`exceptions.controller.ts:70`), **pas** un compteur de rapports d'autonomie |
| `03-autonomy-reports-frais.json` | 200 `{"reports": []}` — l'état vide du cadre 30, mesuré |
| `04-lieutenants-frais.json` / `17-lieutenants-apres.json` | 200 — roster, 5 clés par ligne |
| `07-autonomy-reports-1rapport.json` | 200 — **le corps réel**, 1 rapport, 1 point, `backlog_age_cycles: 0` |
| `09-autonomy-reports-age2.json` | 200 — après passage du cycle à 2 : `backlog_age_cycles: 2` (arithmétique confirmée) |
| `10-resolve-A.json` | 200 `{"resolved":true,"outcome":"COOK_STARTED"}` |
| `11-resolve-A-rejeu.json` | **409** `RESOURCE_STATE_CONFLICT` |
| `12-autonomy-reports-partiel.json` | 200 — `decided:'A'` + `decided:null` (**après ajout SQL d'un 2ᵉ point** — état non atteignable en production, cf. E1) |
| `13-resolve-B.json` | 200 `{"resolved":true,"outcome":"NOOP"}` — le choix B n'a rien produit |
| `14-autonomy-reports-apres.json` | 200 `{"reports": []}` — tous les points tranchés ⇒ le rapport sort de la liste |
| `15-resolve-422.json` | **422** `VALIDATION_FAILED` sur `chosen:"C"` |
| `16-lieutenant-detail.json` | 200 — **`budget_bands`** (les 7 catégories en bandes) |
| `18-flag-review.json` | 200 `{"cards":[]}` — vide sur compte frais |
| `19-i18n-bundle.json` | 200, 4 723 o, **0** clé `autonomy.*` |
| `20-resolve-nonuuid.json` | **500** `INTERNAL_ERROR` sur `reportId` non-UUID |
| `21-resolve-404.json` | 404 sur UUID inconnu |
| `23/24-idor-*.json` | 404 + `{"reports":[]}` depuis un 2ᵉ compte |
| `25/26-decision-*.json` | `reset_budget` 200, `override_one_shot` 200, `raise_ceiling` **409** `STRUCTURAL_CAP_EXHAUSTED` |

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | source de la contrainte |
|---|---|---|
| `backlog_age_cycles` | entier ≥ 0 | `autonomy-reports.projection.ts:35` `Math.max(0, currentCycle - row.cycle_id)` ; `CHECK (cycle_id >= 0)` `0007_queues_exceptions_cuestack.sql:93` |
| `issues[]` longueur | DB : `CHECK (jsonb_array_length(issues) BETWEEN 1 AND 5)` (`0007:95-96`) ; tunable `reportIssuesMax=5` ; **production : 1** (cf. E1) | migration + `producer.ts:82-83` |
| `category` | 7 valeurs déclarées (`PRODUCTION_OPS, LOGISTICS_ROUTING, DISTRIBUTION_DISPATCH, LAUNDERING_FLOW, SECURITY_RESPONSE, BOOKKEEPING_AUDIT, CROSS_CATEGORY_INCIDENT`) — **6 atteignables** : les catégories primaires des 9 archétypes, comptées distinctes (MUSCLE et INTELLIGENCE retombent sur `SECURITY_RESPONSE`, FACILITY_MANAGER sur `PRODUCTION_OPS`). `CROSS_CATEGORY_INCIDENT` n'a **aucun** archétype primaire (`autonomy-category.ts:91`) ⇒ **jamais produite** | `autonomy-category.ts:15-23` + `63-87` |
| `refused_action` | 9 archétypes (`COOK, LAUNDERING, BOOKKEEPER, SECURITY, LOGISTICS, DISTRIBUTION, MUSCLE, INTELLIGENCE, FACILITY_MANAGER`) | `producer.ts:69` + `OPTION_PAIRS` (`option-pairs.ts:41-67`) |
| `decided` | `'A' \| 'B' \| null` ; **`null` seul atteignable sur cette route** (E5) | `autonomy-reports.projection.ts:9-10, 30` |
| `label_key` | **18** clés distinctes `autonomy.*` | `option-pairs.ts` (comptées) |
| `effect_kind` | **12** valeurs | `option-pairs.ts:14-17` (union fermée) |
| `projected_outcome` | **4** bandes : `MINIMAL, TRADEOFF, ELEVATED_EXPOSURE, OPPORTUNITY_COST` | `option-pairs.ts:18` |
| `outcome` (resolve) | **13** valeurs | balayage des 12 handlers ; ⚠️ un `grep "return '…'"` n'en rend que **12** — `COOK_REFINED` est dans un ternaire (`cook-refine.handler.ts:54`), invisible au motif. Recompté par oracle Python. |
| erreurs du `resolve` | 404 `RESOURCE_NOT_FOUND` · 409 `RESOURCE_STATE_CONFLICT` · 422 `VALIDATION_FAILED` · **500 `INTERNAL_ERROR` sur id non-UUID** | contrôleur `:67-73`, service `:75-84`, mesures 15/20/21 |

### 4. Inventaire M (Mxx → ce que ça représente)

Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html`, cadres 29/30/31
(bloc `<style>` « SÉRIE 2 : LA BOÎTE D'AUTONOMIE »).

| id | texte / état | représente | source |
|---|---|---|---|
| M01 | « La Boîte d'autonomie » | titre | chrome statique |
| M02 | « Jour 26 / 27 / 29 » | jour de jeu | `opened_game_day` (session/open) |
| M03 | « **2** rapports » | cardinal de `reports[]` | ✔ |
| M04 | « 3 points » | somme des `issues[]` | ✔ arithmétique, mais ≥ 2 non atteignable |
| M05 | médaillon `#buste-fedora` / `#buste-casquette` | archétype | `archetype` / `refused_action` |
| M06 | « Cuisinier » / « Logistique » | le rôle de celui qui parle | idem |
| M07 | « ce cycle » / « depuis 1 cycle » / « depuis 3 cycles » (+ `.vieux` braise) | `backlog_age_cycles` (+ seuil du plafond) | ✔ / **sans source pour le seuil** |
| M08 | « **Production** » / « **Sécurité** » / « **Logistique** » | `category` | ✔ / **E2** |
| M09 | « point 1 sur 2 » | rang + cardinal du point | **E1** |
| M10 | « Il a refusé de cuisiner » / « … de réparer » / « … d'expédier » | `refused_action` | ✔ / **E4** |
| M11 | « — sa marge d'autonomie est épuisée » | prose statique | ASSUMÉ |
| M12 | « **A** Cuisiner maintenant » | `option_a.label_key` | **L2** |
| M13 | chip « conséquence minime » (`o-min`) | `MINIMAL` | ✔ |
| M14 | « **B** Affiner d'abord » | `option_b.label_key` | **L2** |
| M15 | chip « un compromis » (`o-tr`) / « un manque à gagner » (`o-opp`) | `TRADEOFF` / `OPPORTUNITY_COST` | ✔ |
| M16 | `.opt.a` liseré doré | « A est le défaut » | ASSUMÉ (position + `defaultOption=1`, non projeté) |
| M17 | 2ᵉ bloc `.iss` du même rapport | 2ᵉ point | **E1/E2/E3/E4** |
| M18 | « **0** rapport » | `reports.length == 0` | ✔ |
| M19 | « Vos lieutenants n'ont rien à vous soumettre… » | état vide | ✔ mesuré |
| M20 | « 1 point à trancher » | points à `decided == null` | **E1/E5** |
| M21 | bandeau « attend depuis **3 cycles** — sans réponse, l'option A s'appliquera » | le plafond | **E6 / L1** |
| M22 | « · tranché », `.iss.tranchee`, `.opt.fait` (✓) | `decided != null` | **E5** |
| M23 | « ‹ » | retour | chrome |
| M24 | tap sur `.opt` | le geste `resolve` | ✔ apparié |

*(chips définies mais non employées dans les trois cadres : `o-exp` = `ELEVATED_EXPOSURE`.)*

### 5. Ce que je n'ai pas pu vérifier

1. **Un inbox à DEUX rapports n'a pas été observé.** Le 2ᵉ lieutenant du kit n'a pas pu recevoir
   son script : `POST /v1/lieutenants/:id/behavior-script` → **409 `STRUCTURAL_CAP_EXHAUSTED`**
   (une décision structurelle par session — `mesures/08-attach-script-lt2.json`). La forme du
   tableau `reports[]` est donc mesurée à **1** élément et à **0**, jamais à 2. *Ce qui
   trancherait* : rouvrir une session (`session/close` puis `session/open`) puis répéter la
   recette sur le 2ᵉ lieutenant.
2. **Le rapport « qui traîne » à son plafond, et l'auto-application de A, ne sont pas mesurés en
   vie.** J'ai forcé `backlog_age_cycles` à 2 en écrivant `cycle_id` (SQL) ; je n'ai pas laissé un
   rapport atteindre 3 cycles ni observé `applyDefaultOnTimeout` s'exécuter. *Ce qui trancherait* :
   ouvrir un rapport, puis avancer ≥ 3 × `refreshWindowTicks` (≈ 90 ticks) et relire la liste.
3. **La 4ᵉ bande de conséquence (`ELEVATED_EXPOSURE`) n'est ni dessinée dans les trois cadres ni
   mesurée** : elle n'apparaît que sur les paires `LAUNDERING`, `MUSCLE`, `INTELLIGENCE`. Sa chip
   `o-exp` existe en CSS mais n'a été validée visuellement nulle part.
4. **Les 3 archétypes de remplissage** (`MUSCLE`, `INTELLIGENCE`, `FACILITY_MANAGER`) réutilisent
   `REPAIR_NOW`/`DEFER` avec des `label_key` qui leur sont propres
   (`option-pairs.ts:48-66`, marqués `[PROV-Y26Q2]`) : leurs libellés promettent « assaut » /
   « observer » / « planifier » mais l'effet exécuté est « réparer » / « différer ». **Non
   mesuré** (aucun lieutenant de ces archétypes n'existe sur compte frais) — mais c'est un
   désaccord libellé ↔ effet à signaler à qui écrira le résolveur i18n.
5. **`GET /v1/flag-review` rendu vide** : la projection de `lieutenant.name` (R2) est lue **dans le
   code** (`flag-discipline.service.ts:282`), jamais observée dans un corps. *Ce qui trancherait* :
   faire naître un `flagged_item`.
6. **`opened_game_day` est un instantané d'ouverture de session** : le « Jour 26 » du bandeau ne
   bougera pas si le monde avance pendant la session. Comportement non mesuré sur la durée.
7. **`CROSS_CATEGORY_INCIDENT`** : catégorie déclarée (`autonomy-category.ts:22`) qu'aucun
   archétype ne prend pour catégorie primaire ⇒ **aucun rapport ne peut la porter** par le chemin
   mesuré. Je n'ai pas énuméré d'autre chemin d'écriture — mais il n'y a **qu'un** écrivain de
   production (§E1, maillon 1).
8. **Je n'ai pas rejoué le scénario deux fois.** Chaque corps mesuré l'a été une seule fois, sur
   une stack partagée avec d'autres travaux (7 conteneurs, `docker ps` en tête de dossier).
