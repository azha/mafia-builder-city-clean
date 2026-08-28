# Juge données ⊥ — La Semaine de compression (screen_13) — mode MAQUETTE — 2026-08-25

## En une phrase

La maquette dessine **19 des 30 informations** que les 5 routes joueur du domaine renvoient réellement
(mesurées, pas déduites : compte frais + fixture, 4 valeurs de `stress_bucket` sur 4, 3 de `week_state`
sur 3, 5 codes d'erreur sur 5) — **3 écarts à consigner**, dont **1 grave** : la maquette dessine
« Écarter » sur deux cartes où le back répond **422 en consommant quand même une décision** ;
**1 lot back** (forme F : la façon dont un problème a été traité est en base, jamais projetée) ; et
**11 questions « passé à côté ? »** pour l'user.

---

## Écarts à consigner (mode maquette)

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| **É1** | **« Écarter » sur une carte qui n'est pas un signalement** | `decide {choice:'dismiss'}` — **valide UNIQUEMENT si `source_kind='flag'`** | dessiné sur la carte 1 (`exception_card`) et la carte 3 (`stressed_leg`) | **GRAVE — dessiné, refusé par le back, et le refus COÛTE une décision** | back : `compression-board.service.ts:226-233` `if (entry.source_kind !== 'flag') throw new ApiError('VALIDATION_FAILED', …)` · maquette : `maquette-cadres-24-26.html` cartes 1 et 3, `<div class="btn-filet ecarter">Écarter</div>` · mesuré : `mesures/decide-dismiss-422.json` = 422 `'dismiss' is only valid for source_kind='flag' (got 'exception_card')` **et** `mesures/board-after-dismiss.json` = `decisions_used 0 → 1`, `decisions_remaining 5 → 4`, entrée toujours `addressed:false` · **contrôle positif** : la même requête sur une entrée `flag` rend **200** (`mesures/decide-dismiss-flag-ok.json`) — le motif n'est pas trop large · **conséquence mesurée** : 5 taps sur « Écarter » épuisent tout le budget de la semaine et **le tableau reste bloqué** (`mesures/budget-1..6.json`, `board3-exhausted.json` : `used=5`, `remaining=0`, 1 entrée non traitée, cycle toujours actif, aucun `finalized`) |
| **É2** | **« réglée » / « passée » sur une carte traitée** | **aucune clé** — `BoardEntryView` ne porte que `addressed: boolean` ; la façon vit en base dans `decision_ref` | chips `st-done` « réglée » (carte 4) et `st-pend` « passée » (carte 5) | **DESSINÉ SANS SOURCE PROJETÉE → lot back (forme F)** | back : `compression-board.service.ts:141-149` `projectEntry` n'émet que `{id, source_kind, tier, target_ref, addressed}` · colonne : `db/schema/demolition_compression.ts:168` `decision_ref: jsonb('decision_ref')` · **mesuré en base** après un cycle réel : `decision_ref={"choice":"skip","applied":false}` et `decision_ref={"verb":"dismiss_flag","choice":"dismiss","result":{…},"applied":true}` (`mesures/COMMANDES.md` §3) — l'information existe, elle est écrite, elle n'est **pas** projetée |
| **É3** | **tout le vocabulaire de l'écran** (9 familles de problème, 3 gravités, 3 phases de semaine, 4 tensions, 6 natures de cible) | **0 clé i18n** — `GET /v1/i18n/bundle?locale=fr` rend **67 clés**, dont **3** pour ce domaine et **toutes des erreurs** (`error.compression.budget_exhausted`, `.deferral_exhausted`, `.forced_engagement`) | toutes les phrases des cartes et des puces | **ASSUMÉ à consigner** — contraire à la convention lot 0 « libellés en clés i18n partout » | `mesures/i18n-bundle.json` ; contrôle positif du balayage : la même liste rend bien des clés non-`error.` (`game.ui_common.confirm_button`, `game.lieutenant.recap.actions_taken`) — le motif voit les clés de jeu, il n'y en a simplement aucune ici. Le bundle `locale=fr` renvoie par ailleurs des valeurs **en anglais** |

### Deux écarts assumés que je CONFIRME (ils ne sont pas des défauts, ils doivent rester écrits)

- **« 2 prises sur 5 »** : `decisions_budget` n'est **pas** projeté (`compression-board.service.ts:52-56` :
  `BoardView = {entries, decisions_used, decisions_remaining}`). Le plafond n'est obtenable que par la
  somme. Mesuré cohérent aux 4 relevés : `0+5`, `1+4`, `2+3`, `5+0`. Le tunable vaut **5** par défaut,
  plage **3..8** (`core-loops-tunables.ts:284,997-1000`) — **la somme est donc la bonne source**, un « 5 »
  écrit en dur serait faux dès qu'un GM bouge le tunable.
- **« se règle sur la chaîne, pas ici »** (carte 2) : correct — mais la règle qui le décide
  (`RESOLVABLE_SOURCE_KINDS = {exception_card, cue_cascade_card, flag, stressed_leg, friction_penalty}`,
  `compression-board.service.ts:75`) **n'est pas projetée** : le client devra la dupliquer. Une divergence
  future entre les deux listes serait muette. C'est un **écart de conception à consigner**, pas un défaut
  de maquette.
- **Le cadre 24 ne dessine que `deferral_available = true`.** Le `false` a **deux causes distinctes**
  côté back (déjà reporté → `DEFERRAL_EXHAUSTED` ; tension ≥ 95 → `FORCED_ENGAGEMENT`) et **une seule
  valeur** côté projection. Mesuré : `state-after-defer.json` et `state-crushing.json` rendent tous deux
  `deferral_available:false` pour des raisons opposées. La maquette n'a pas d'état à dessiner pour ça.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `compression_glance.forced` (`POST /v1/session/open`) | *la semaine s'est ouverte toute seule* — la tension a dépassé le seuil de force, le joueur n'a rien choisi | **utile ici, et c'est la clé la plus parlante du lot** : elle sépare « j'ai décidé d'ouvrir » de « ça m'est tombé dessus ». Le cadre 25 ne fait aucune différence entre les deux. | ★★★ |
| **Q2** | `DecideOutcome.finalized` (`POST …/decide`) | *votre dernière décision vient de clore la semaine* | **utile** : sans elle, l'écran passe du tableau à un 404 sans un mot. Mesuré : `decide-skip.json` = `finalized:true`, puis `board-after-finalize.json` = 404. | ★★★ |
| **Q3** | `DecideOutcome.revealed_secondary` (`POST …/decide`) | *en réglant celui-là, vous en avez découvert un autre* | **utile** : c'est la boucle du système (D14, ≤1 révélation par décision). L'annexe de la maquette l'écarte explicitement ; à ratifier. | ★★★ |
| **Q4** | 409 `FORCED_ENGAGEMENT` / 409 `DEFERRAL_EXHAUSTED` (`POST …/defer`) | *pourquoi* le report est refusé — deux raisons opposées | **utile** : la puce « Report · disponible » disparaît sans dire pourquoi. Les deux codes existent et sont mesurés. | ★★☆ |
| **Q5** | 409 `COMPRESSION_BUDGET_EXHAUSTED` (`POST …/decide`) | *vous n'avez plus de décision cette semaine* | **utile** : c'est le mur de fin de l'écran. | ★★☆ |
| Q6 | `entry.target_ref.id` | l'identifiant exact de la cible (exception, signalement, bâtiment, tournée, tronçon) | **utile en aval, pas ici** : c'est ce qui permettrait d'ouvrir la fiche depuis la carte. Sans nom ni descripteur, il ne s'affiche pas tel quel. | ★★☆ |
| Q7 | `entry.target_ref.origin_building_id` / `destination_building_id` (tournée, tronçon) | *entre quels deux bâtiments* le tronçon fatigue | pas ici tel quel (ce sont des ids), **mais** c'est la matière d'un « de X à Y » si une table de noms existe un jour | ★☆☆ |
| Q8 | `entry.target_ref.cue_stack_id` + `slot_id` | quel créneau de quelle pile a raté | idem — la maquette dit « un créneau de la pile », l'id ne l'améliore pas seul | ★☆☆ |
| Q9 | `engage → compression_event_id` | l'identifiant du cycle | **plomberie** : sert à corréler, jamais à afficher | ☆☆☆ |
| Q10 | `entry.id` | l'identifiant du problème | **plomberie** : c'est la cible du `decide` | ☆☆☆ |
| Q11 | `DecideOutcome.decided` / `.choice` | l'écho de ce qu'on vient de faire | **plomberie** (confirmation optimiste côté client) | ☆☆☆ |

---

## Lots back suggérés (B⁻ — en base, non projeté)

Sur **12 colonnes** de `compression_events` et **11** de `compression_problem_entry` (comptées par script
sur `db/schema/demolition_compression.ts`), la surface joueur en projette **respectivement 3 et 5**.

| # | colonne | table | maquette | preuve / ce que ça donnerait |
|---|---|---|---|---|
| **L1** | `decision_ref` (→ `.choice`) | `compression_problem_entry` | **dessiné** — M43 « réglée », M47 « passée » | **forme F, prioritaire** : écrit par `markEntryAddressed` (`compression-board.service.ts:178`), lu nulle part côté joueur. Projeter `decision: 'skip'|'resolve'|'dismiss'|null` à côté de `addressed` suffit. Mesuré en base (`COMMANDES.md` §3) |
| **L2** | `persisted` | `compression_problem_entry` | pas dessiné | *« ce problème traîne depuis la semaine dernière — il a empiré d'un cran »*. C'est la dent de report (§10.4) : le joueur la subit et ne la voit pas. Colonne `demolition_compression.ts:169` |
| **L3** | `revealed_by_entry_id` | `compression_problem_entry` | pas dessiné | *« celui-ci est apparu après votre décision »* — le pendant persistant de `revealed_secondary` (Q3). Colonne `:166` |
| **L4** | `decisions_budget` | `compression_events` | dessiné **par dérivation** (« sur 5 ») | aujourd'hui déductible (`used + remaining`) donc pas bloquant ; le projeter supprimerait une arithmétique côté client. Colonne `:125` |
| **L5** | `deferral_count` | `compression_events` | pas dessiné | distinguerait les **deux** causes de `deferral_available:false` (Q4) sans attendre le 409. Colonne `:124` |
| **L6** | `severity_multiplier_applied` | `compression_events` | pas dessiné | *« la semaine s'est ouverte en catastrophe — tout est monté d'un cran »* (§9.2c). Colonne `:128` |
| **L7** | `fired_at_tick` + tunable `compression_board_abandon_horizon_game_days` (défaut **14**, plage 7..30) | `compression_events` / `core-loops-tunables.ts:328,1123-1129` | pas dessiné — **et l'annexe de la maquette écrit « aucune clé de deadline »** | **à corriger dans l'annexe** : une échéance EXISTE côté serveur (le balayage d'abandon N/31 finalise un tableau resté actif au-delà de l'horizon, `friction-budget-tick.service.ts:129-134`). Elle n'est pas *projetée*, ce qui n'est pas la même chose que « n'existe pas ». Le canon réclame « 2 jours » : c'est un arbitrage produit, pas un trou |
| — | `stress_at_fire`, `org_stress` | `compression_events` / `player_progression_state` | — | **à NE PAS projeter** : scalaires bruts, mur R2.2 (`stress-bucket.ts:12-16,31-34`) |

---

## Actions : routes ↔ CTA

**5 routes joueur** dans le domaine, toutes sous `@UseGuards(JwtAuthGuard)`, **3 en écriture** —
comptées à la main sur les 3 contrôleurs non-`_test`, non-admin (annexe 1). 5 routes `_test`, 7 routes
admin, exclues.

| geste | route | CTA maquette | verdict |
|---|---|---|---|
| ouvrir la semaine | `POST /v1/compression/engage` | cadre 24, « OUVRIR LA SEMAINE » (appui long) | ✔ apparié — mesuré 200, et 404 sans cycle ouvert |
| reporter d'un cycle | `POST /v1/compression/defer` | cadre 24, « Reporter d'un cycle » (appui long) | ✔ apparié — mesuré 200 puis 409 `DEFERRAL_EXHAUSTED`, et 409 `FORCED_ENGAGEMENT` à 96 de tension |
| régler | `POST …/decide {choice:'resolve'}` | cartes 1 et 3, « Régler » | ✔ apparié — `exception_card` et `stressed_leg` sont bien dans les 5 familles réglables |
| passer | `POST …/decide {choice:'skip'}` | cartes 1, 2, 3, « Passer » | ✔ apparié — toujours valide, quelle que soit la famille |
| **écarter** | `POST …/decide {choice:'dismiss'}` | cartes 1 et 3, « Écarter » | **✘ É1** — le back n'accepte `dismiss` que sur `source_kind='flag'`, et la maquette ne dessine **aucun** bouton sur sa seule carte `flag` (carte 4, déjà traitée). Le geste est dessiné exactement là où il est invalide, et absent là où il est valide |
| — | — | cadre 24, « ‹ » retour · cadre 25/26, « ‹ » retour | navigation, hors domaine |
| — | (aucune) | cadre 26 — aucun geste au calme | ✔ cohérent : `engage`/`defer`/`decide` rendent tous **404** sur compte frais (mesuré) |

**Aucune route d'action du domaine n'est sans CTA.** Aucun CTA n'est sans route. Le seul écart porte sur
la **validité conditionnelle** d'un des trois choix.

---

## Table de couverture complète

Colonne F absente (mode maquette). `●` = présent · `–` = absent · `B⁻` = en base, non projeté.

| # | information | B | M | statut |
|---|---|---|---|---|
| 1 | tension de l'organisation (bande) | ● `state.stress_bucket` · `glance.stress_bucket` | ● M03/M07 (montante), M61/M65 (calme) | ✔ |
| 2 | phase de la semaine | ● `state.week_state` · `glance.week_state` | ● M04/M08 (annoncée), M22 (en cours), M62/M66 (aucune) | ✔ |
| 3 | report encore possible | ● `state.deferral_available` | ● M09 « Report · disponible » | ✔ (seul l'état `true` est dessiné) |
| 4 | semaine ouverte de FORCE | ● `glance.forced` | – | **PASSÉ À CÔTÉ ? (Q1)** |
| 5 | jour courant | ● `session/open.opened_game_day` | ● M02 « Jour 30 », M20 « Jour 31 », M60 « Jour 1 » | ✔ (clé d'une autre route, assumée) |
| 6 | nombre de problèmes sur la table | ● `board.entries[]` (cardinal) | ● M50 (5 cartes) | ✔ |
| 7 | décisions déjà prises | ● `board.decisions_used` (+ écho `decide`) | ● M24 « 2 prises » | ✔ |
| 8 | décisions restantes | ● `board.decisions_remaining` (+ écho `decide`) | ● M21, M25, M26 | ✔ |
| 9 | plafond de décisions | – (non projeté) | ● M24 « sur 5 » | ASSUMÉ — dérivé `used+remaining`, confirmé bon |
| 10 | identifiant du problème | ● `entry.id` | – | plomberie (Q10) |
| 11 | famille du problème (9 valeurs) | ● `entry.source_kind` | ● M28, M34, M39, M44, M48 (5 des 9 mises en scène) | ✔ |
| 12 | gravité (3 valeurs) | ● `entry.tier` | ● M27 Grave, M33/M38 Modérée, M42/M47 Légère | ✔ |
| 13 | nature de la cible (7 valeurs) | ● `entry.target_ref.kind` | ● M29, M35, M40, M45, M49 (5 des 7) | ✔ |
| 14 | identifiant de la cible | ● `entry.target_ref.id` | – | **PASSÉ À CÔTÉ ? (Q6)** |
| 15 | lieutenant concerné | ● `entry.target_ref.lieutenant_id` | ● M29 « sur un lieutenant » (le mot, jamais le nom) | ✔ partiel |
| 16 | extrémités d'une tournée / d'un tronçon | ● `target_ref.origin_building_id`/`destination_building_id` | – | **PASSÉ À CÔTÉ ? (Q7)** |
| 17 | pile + créneau visés | ● `target_ref.cue_stack_id`/`slot_id` | ● M49 « un créneau de la pile » (le mot) | ✔ partiel |
| 18 | problème traité ou non | ● `entry.addressed` | ● M46 (carte barrée, opacité .6) | ✔ |
| 19 | **de quelle FAÇON il a été traité** | **B⁻ `decision_ref.choice`** | ● M43 « réglée », M47 « passée » | **É2 — lot back (forme F)** |
| 20 | « se règle d'ici » vs « se règle ailleurs » | – (règle `RESOLVABLE_SOURCE_KINDS` non projetée) | ● M30, M36, M41 | ASSUMÉ — règle dupliquée côté client |
| 21 | ouvrir la semaine | ● `POST engage → {engaged, compression_event_id}` | ● M12 | ✔ |
| 22 | reporter d'un cycle | ● `POST defer → {deferred}` | ● M13 | ✔ |
| 23 | Régler | ● `decide {choice:'resolve'}` | ● M30, M41 | ✔ |
| 24 | Passer | ● `decide {choice:'skip'}` | ● M31, M37, M41 | ✔ |
| 25 | Écarter | ● `decide {choice:'dismiss'}` — **`flag` uniquement** | ● M32, M41 (sur `exception_card` et `stressed_leg`) | **É1 — DÉFAUT GRAVE** |
| 26 | un problème secondaire vient d'apparaître | ● `decide.revealed_secondary` | – | **PASSÉ À CÔTÉ ? (Q3)** |
| 27 | la semaine vient de se terminer | ● `decide.finalized` | – | **PASSÉ À CÔTÉ ? (Q2)** |
| 28 | écho de la décision | ● `decide.decided`, `decide.choice` | – | plomberie (Q11) |
| 29 | report refusé — tension trop haute | ● 409 `FORCED_ENGAGEMENT` | – | **PASSÉ À CÔTÉ ? (Q4)** |
| 30 | report refusé — déjà utilisé | ● 409 `DEFERRAL_EXHAUSTED` | – | **PASSÉ À CÔTÉ ? (Q4)** |
| 31 | plus aucune décision disponible | ● 409 `COMPRESSION_BUDGET_EXHAUSTED` | – | **PASSÉ À CÔTÉ ? (Q5)** |
| 32 | choix invalide pour cette carte | ● 422 `VALIDATION_FAILED` | – | **DÉFAUT** — conséquence directe de É1 : la maquette n'a pas d'état pour un refus qu'elle provoque |
| 33 | rien à ouvrir / aucun tableau | ● 404 `RESOURCE_NOT_FOUND` | ● M68 « Aucune semaine de compression en vue » | ✔ |
| 34 | les mots de tout le domaine | – (0 clé i18n) | ● tout le texte des cartes et des puces | **É3 — ASSUMÉ à consigner (lot 0)** |

**Contrôle d'arithmétique** — `|clés/actions/codes B| = 30` (lignes 1-8, 10-18, 21-33) ·
`|B⁻ apparié| = 1` (ligne 19) · `|éléments M non appariés| = 3` (lignes 9, 20, 34) ·
**30 + 1 + 3 = 34 = nombre de lignes.** ✔

**Couverture** (comptée par script sur le tableau ci-dessus, pas estimée) : sur les **30** informations
que le back renvoie, la maquette en dessine **19** — lignes 1, 2, 3, 5, 6, 7, 8, 11, 12, 13, 15, 17, 18,
21, 22, 23, 24, 25, 33 — dont **1 fautive** (ligne 25, « Écarter »). **11 ne sont pas dessinées** :
lignes 4, 10, 14, 16, 26, 27, 28, 29, 30, 31, 32 — dont **4 de pure plomberie** (10, 14, 16, 28) et
**7 qui posent une vraie question produit** (4, 26, 27, 29, 30, 31, 32).

---

## Annexes

### 1. Routes du domaine (compte)

**Balayage** : `grep -rlEi "compress" services/game-back/src --include='*.controller.ts'` → **12 fichiers**.
Après exclusion des `_test`, des admin/BO et des fichiers où « compression » n'apparaît **que dans l'en-tête
de plan** (les 3 contrôleurs `demolition/` — vérifié ligne à ligne : `decommission.controller.ts:1-3`,
`friction-projection.controller.ts:1-3`, `replacement-option.controller.ts:1-3`, aucune donnée de
compression dans leurs corps) :

| # | route | fichier:ligne | garde |
|---|---|---|---|
| 1 | `GET /v1/compression/state` | `compression-projection.controller.ts:37` | `JwtAuthGuard:38` |
| 2 | `GET /v1/compression/board` | `compression-board.controller.ts:55` | `JwtAuthGuard:56` |
| 3 | `POST /v1/compression/engage` | `compression-board.controller.ts:44` | `JwtAuthGuard:46` |
| 4 | `POST /v1/compression/board/problems/:id/decide` | `compression-board.controller.ts:63` | `JwtAuthGuard:65` |
| 5 | `POST /v1/compression/defer` | `compression.controller.ts:39` | `JwtAuthGuard:41` |

**Voisinage mesuré** : `POST /v1/session/open` → bloc `compression_glance = {stress_bucket, week_state,
forced}` (`session-open-sequence.service.ts:172-176` (interface) et `:428-443` (composition)) — **3 clés, épinglées** par
`tests/e2e/core_loops/session_lifecycle.spec.ts:837-838`. `GET /v1/friction/state` →
`{friction_bucket, penalty_active, friction_node_count}` (mesuré) : c'est la source du `source_kind
= friction_penalty` du tableau, mais aucun cadre ne le dessine.

**Hors périmètre, compté** : 5 routes `_test` (`compression-test.controller.ts:74,85,96,108,120`),
7 routes admin (`demolition-compression-admin.controller.ts`). Aucune n'a servi à mesurer un corps de
réponse joueur.

⚠️ **Un aparté qui n'est pas dans mon mandat mais qui vaut d'être dit** : `org_stress` n'a **pas** de
chemin joueur qui le fasse monter dans une session de mesure. Son écrivain de production est réel
(`CompressionStressSubscriber.updateStressAccumulator`, abonné à `SessionClosedEvent`,
`compression-stress-subscriber.service.ts:48-53`, donc `POST /v1/session/close`) — mais l'incrément est
fonction des 7 sources de tension, nulles sur un compte frais. La transition `none → warning` est donc
**atteignable en principe et non atteinte en pratique** dans un temps de mesure. Trois commentaires du
dépôt (`live-ops-event-catalogue.ts:341-354`, `live-ops-lever-audit.ts:25,31,242`,
`live-ops-scheduler.service.ts:171-179`) affirment encore « `org_stress` has **zero writers** » : c'est
un **énoncé daté**, faux depuis P3-E C6.

### 2. Corps réels — `mesures/` + `mesures/COMMANDES.md`

Toutes les commandes et leurs fichiers de sortie sont dans `mesures/COMMANDES.md`. Résumé des corps :

    GET  /v1/compression/state   (compte frais) -> {"stress_bucket":"calm","week_state":"none","deferral_available":false}
    GET  /v1/compression/state   (61, warning)  -> {"stress_bucket":"mounting","week_state":"warning","deferral_available":true}
    GET  /v1/compression/state   (71, reporté)  -> {"stress_bucket":"mounting","week_state":"warning","deferral_available":false}
    GET  /v1/compression/state   (96, warning)  -> {"stress_bucket":"crushing","week_state":"warning","deferral_available":false}
    GET  /v1/compression/state   (active)       -> {"stress_bucket":"compression_active","week_state":"active","deferral_available":false}
    GET  /v1/compression/board   (compte frais) -> 404 RESOURCE_NOT_FOUND
    GET  /v1/compression/board   (active)       -> {"entries":[{"id","source_kind","tier","target_ref","addressed"}],
                                                    "decisions_used":0,"decisions_remaining":5}
    POST /v1/compression/engage                 -> {"engaged":true,"compression_event_id":"<uuid>"}
    POST /v1/compression/defer                  -> {"deferred":true}   | 409 DEFERRAL_EXHAUSTED | 409 FORCED_ENGAGEMENT | 404
    POST .../decide {choice:"skip"}             -> {"decided":true,"choice":"skip","decisions_used":2,
                                                    "decisions_remaining":3,"revealed_secondary":false,"finalized":true}
    POST .../decide {choice:"dismiss"} (flag)   -> {"decided":true,"choice":"dismiss","decisions_used":1,
                                                    "decisions_remaining":4,"revealed_secondary":false,"finalized":false}
    POST .../decide {choice:"dismiss"} (autre)  -> 422 VALIDATION_FAILED  (budget consommé quand même)
    POST .../decide {} (choice absent)          -> 422 VALIDATION_FAILED  "choice must be one of skip | resolve | dismiss"
    POST /v1/session/open -> compression_glance  = {"stress_bucket":…,"week_state":…,"forced":false}

**Ensembles de clés (triés)**

- `compression/state` : `deferral_available, stress_bucket, week_state` — **3**
- `compression/board` : `decisions_remaining, decisions_used, entries` — **3**
- `BoardEntryView` : `addressed, id, source_kind, target_ref, tier` — **5**
- `compression/engage` : `compression_event_id, engaged` — **2**
- `compression/defer` : `deferred` — **1**
- `DecideOutcome` : `choice, decided, decisions_remaining, decisions_used, finalized, revealed_secondary` — **6**
- `compression_glance` : `forced, stress_bucket, week_state` — **3**
- `session/open` (contexte, mesuré) : `backlog_badge, compression_glance, flag_review, friction_glance,
  hl_card, onboarding, opened_game_day, queue, queue_pressure_band, session_id, settling_glance,
  structural_budget` — **12 clés**, conformes à l'épingle `session_lifecycle.spec.ts:782-786`

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue à la source | observé |
|---|---|---|---|
| `stress_bucket` | `calm · mounting · crushing · compression_active` | union TypeScript `stress-bucket.ts:28` ; cutpoints `stress-bucket.ts:36-40` : `active ⇒ compression_active` ; `<50 ⇒ calm` ; `<85 ⇒ mounting` ; sinon `crushing`. Tunables : `compression_stress_bucket_calm_upper_bound` défaut **50** (30..70, `core-loops-tunables.ts:336,1136-1141`), `compression_stress_threshold_trigger` défaut **85** (70..95, `:285,1003-1006`) | **4/4 observées** |
| `week_state` | `none · warning · active` | **CHECK SQL** `0002_player_progression_state.sql:18-19` `CHECK ("compression_week_state" IN ('none','warning','active'))` | **3/3 observées** |
| `deferral_available` | `true · false` | dérivée : `compression-week.repository.ts:315` — cycle `state='open'` **et** `deferral_count=0` **et** `org_stress < 95` | **2/2 observées** |
| `forced` | `true · false` | colonne `compression_events.forced` (`demolition_compression.ts:127`), flippée par `engageForced` (`compression-board.repository.ts:91-107`) | `false` observé ; `true` **non observé** |
| `tier` | `minor · moderate · critical` | **CHECK SQL** `compression_problem_entry_tier_chk` (`demolition_compression.ts:172`) + union TS `problem-tier.ts:28` | `minor` observé ; `moderate`/`critical` **non observés** |
| `source_kind` | **9** : `exception_card · flag · backpressure_node · severed_route · stressed_leg · cue_stack_failed_slot · cue_cascade_card · settling_overload · friction_penalty` | **aucun CHECK, aucun pgEnum** (D1) — `varchar(32)` (`demolition_compression.ts:163`). Le domaine est tenu **uniquement** par le registre runtime `problem-aggregator.service.ts:99-192` (9 `out.push`, comptés un par un) | `exception_card`, `flag` observés ; 7 **non observés** |
| `target_ref.kind` | **7** : `exception · flag · building · route · leg · cue_slot · friction` | `jsonb` sans contrainte — même registre runtime, `problem-aggregator.service.ts:107,116,126,138,151,160,169,178,188` | `exception`, `flag` observés |
| `decide.choice` (entrée) | `skip · resolve · dismiss` | `compression-board.controller.ts:33` `VALID_CHOICES` ; **`dismiss` restreint à `source_kind='flag'`** `compression-board.service.ts:226-233` ; **`resolve` restreint à 5 familles** `:75, :235-239` | **3/3 exercées** |
| `decisions_budget` | 3..8, défaut **5** | `core-loops-tunables.ts:284,997-1000` ; snapshoté à l'ouverture du cycle (`demolition_compression.ts:125`) ; **CHECK** `decisions_used >= 0 AND <= decisions_budget` (`:136`) | 5 observé |
| `deferral_count` | 0..1 | **CHECK SQL** `compression_events_deferral_count_chk` (`demolition_compression.ts:134`) | 0 et 1 observés |
| `compression_events.state` | `open · active · finalized · expired` | **CHECK SQL** `compression_events_state_chk` (`demolition_compression.ts:133`) — **jamais projeté** | — |

⚠️ **`source_kind` et `target_ref.kind` n'ont AUCUNE contrainte de base.** Leur domaine n'existe que dans
le corps d'une méthode. Un dixième `source_kind` ajouté demain ne casserait ni la base, ni le typage, ni
un test — et le client afficherait une carte muette. C'est le point le plus fragile de la surface pour
un résolveur i18n côté client : le détecteur d'un membre neuf devra être un **test qui compare la liste
du résolveur à celle de l'agrégateur**, pas le compilateur.

### 4. Inventaire M (Mxx → ce que ça représente)

Source : `mesures/maquette-cadres-24-26.html` (extrait fidèle des lignes 809-903 de
`ecrans-brennar-2.html` filtré par `awk 'length($0)<4000'`).

**Cadre 24 — « Compression — la semaine s'annonce »**

| id | élément | représente |
|---|---|---|
| M01 | `h3` « La Compression » | titre d'écran (statique) |
| M02 | `.sous` « Jour 30 » | `opened_game_day` |
| M03 | `.sous` « tension **montante** » | `stress_bucket = mounting` |
| M04 | `.sous` « semaine annoncée » | `week_state = warning` |
| M05 | `.kicker` « Ce qui vient » | statique |
| M06 | `.titre` « Vos problèmes s'accumulent… » | statique, conditionné par `week_state=warning` |
| M07 | `.chip.ten-m` « Tension · montante » | `stress_bucket` |
| M08 | `.chip.ten-a` « Semaine · annoncée » | `week_state` |
| M09 | `.chip.q-h` « Report · disponible » | `deferral_available = true` |
| M10 | `.note` « …que **quelques décisions**… » | statique — **délibérément sans nombre** (le budget n'est pas lisible avant l'ouverture : `board` est 404 tant que `week_state='warning'`, mesuré). Bon choix |
| M11 | `.pipeline.issues` A / B | statique (explication des deux issues) |
| M12 | `.cta` « OUVRIR LA SEMAINE » | `POST /v1/compression/engage` |
| M13 | `.cta.secondaire` « Reporter d'un cycle » | `POST /v1/compression/defer` |
| M14 | `.retour` « ‹ » | navigation |

**Cadre 25 — « Compression — le tableau des problèmes »**

| id | élément | représente |
|---|---|---|
| M20 | `.sous` « Jour 31 » | `opened_game_day` |
| M21 | `.sous` « **3** décisions restantes » | `decisions_remaining` |
| M22 | `.sous` « semaine en cours » | `week_state = active` |
| M23 | `.budget .quoi` « Vos décisions de la semaine » | statique |
| M24 | `.budget small` « 2 prises sur 5 » | `decisions_used` = 2 · **« 5 » = `used + remaining`** (plafond non projeté) |
| M25 | `.budget b.n` « 3 » | `decisions_remaining` |
| M26 | `.pt.pris` (pastille) | indicateur visuel du budget |
| M27 | `.chip.sev-g` « Grave » | `tier = critical` |
| M28 | `.titre` « Une exception attend depuis trop longtemps » | `source_kind = exception_card` |
| M29 | `.qui` « sur **un lieutenant** » | `target_ref.lieutenant_id` (`kind = exception`) — **le mot, jamais le nom** |
| M30 | `.btn-filet.regler` « Régler » | `decide {choice:'resolve'}` — valide (`exception_card` ∈ 5 familles) |
| M31 | `.btn-filet` « Passer » | `decide {choice:'skip'}` |
| **M32** | `.btn-filet.ecarter` « **Écarter** » | `decide {choice:'dismiss'}` — **INVALIDE sur `exception_card` (É1)** |
| M33 | `.chip.sev-m` « Modérée » | `tier = moderate` |
| M34 | `.titre` « Un nœud de la chaîne sature » | `source_kind = backpressure_node` |
| M35 | `.qui` « sur **un bâtiment** » | `target_ref.kind = building` |
| M36 | `small.ailleurs` « se règle sur la chaîne, pas ici » | dérivé : `source_kind ∉ RESOLVABLE_SOURCE_KINDS` — **règle non projetée** |
| M37 | `.btn-filet` « Passer » (seul) | `decide {choice:'skip'}` — correct |
| M38 | `.chip.sev-m` « Modérée » | `tier = moderate` |
| M39 | `.titre` « Un tronçon fatigue faute d'entretien » | `source_kind = stressed_leg` |
| M40 | `.qui` « sur **un tronçon** de la chaîne » | `target_ref.kind = leg` |
| **M41** | « Régler » / « Passer » / « **Écarter** » | `resolve` ✔ · `skip` ✔ · **`dismiss` INVALIDE sur `stressed_leg` (É1)** |
| M42 | `.chip.sev-l` « Légère » | `tier = minor` |
| **M43** | `.chip.st-done` « **réglée** » | **`decision_ref.choice ∈ {resolve, dismiss}` — B⁻ (É2)** |
| M44 | `.titre` « Un signalement n'a pas été tranché » | `source_kind = flag` — **la seule carte où « Écarter » serait valide, et elle n'a aucun bouton** |
| M45 | `.qui` « sur **un signalement** » | `target_ref.kind = flag` |
| M46 | `.exc.regle` (barré, opacité .6) | `addressed = true` |
| **M47** | `.chip.st-pend` « **passée** » | **`decision_ref.choice = 'skip'` — B⁻ (É2)** |
| M48 | `.titre` « Un créneau de la pile a raté » | `source_kind = cue_stack_failed_slot` |
| M49 | `.qui` « sur **un créneau** de la pile » | `target_ref.cue_stack_id` / `slot_id` (⚠ ce `target_ref` n'a **pas** de champ `id`, `problem-aggregator.service.ts:160`) |
| M50 | `.corps.serre` (5 cartes) | `entries[]` cardinal |

**Cadre 26 — « Compression — au calme »**

| id | élément | représente |
|---|---|---|
| M60 | `.sous` « Jour 1 » | `opened_game_day` |
| M61 | `.sous` « tension **calme** » | `stress_bucket = calm` |
| M62 | `.sous` « aucune semaine » | `week_state = none` |
| M63 | `.kicker` « Où en est la tension » | statique |
| M64 | `.titre` « Rien ne presse… » | statique |
| M65 | `.chip.ten-c` « Tension · calme » | `stress_bucket` |
| M66 | `.chip.q-b` « Semaine · aucune » | `week_state` |
| M67 | `.note` « …**montante**, puis **écrasante**… » | statique — nomme 2 des 4 bandes |
| M68 | `.vide.milieu` « Aucune semaine de compression en vue » | `board` → 404 / `week_state = none` |
| — | *absence* de puce « Report » | `deferral_available = false` — mesuré cohérent sur compte frais |

**Cadres hors périmètre mais consommant les mêmes clés** (écran « Plus », screen_12, lignes 934 et 954) :
`.dest` « La Compression / tension calme · aucune semaine » et `.dest.alerte` « La Compression /
3 décisions restantes » + `.chip.actif` « En cours ». Mêmes clés, mêmes conclusions ; l'annexe de la
maquette le dit et signale que le canon **cache** cette ligne hors semaine active — arbitrage user ouvert.

### 5. Ce que je n'ai pas pu vérifier

| # | non vérifié | pourquoi | la mesure qui trancherait |
|---|---|---|---|
| N1 | `tier = moderate` et `tier = critical` **jamais observés** en corps réel | les 2 seules sources disponibles sur mon compte (exception d'onboarding en bande `watching`, signalement semé à `game_day=1`) mappent toutes deux sur `minor` (`problem-tier.ts:49-53, 65-67`) | semer une exception à `priority >= 80` ou un signalement vieux de ≥ 7 jours de jeu, puis relire le tableau |
| N2 | **7 des 9 `source_kind` jamais observés** — `backpressure_node`, `severed_route`, `stressed_leg`, `cue_stack_failed_slot`, `cue_cascade_card`, `settling_overload`, `friction_penalty` | chacun exige un monde bâti (bâtiments, routes, tronçons, piles de créneaux, recuit, pénalité de friction). `tests/e2e/core_loops/compression_board.spec.ts` test 1 les sème tous les 9 — c'est le bon instrument | rejouer le test 1 de ce spec et capturer le corps du `GET board` qu'il obtient |
| N3 | **5 des 7 `target_ref.kind` jamais observés** — `building`, `route`, `leg`, `cue_slot`, `friction` | même cause que N2 | idem N2 |
| N4 | `compression_glance.forced = true` jamais observé | exige `org_stress ≥ 95` **au moment de l'ouverture de session**, avec un cycle `state='open'` — le contrôle est un abonné à `SessionOpenedEvent` dont le propre en-tête documente qu'il peut écrire **après** la composition de la réponse (`session-open-sequence.service.ts:436-437`) : `forced:true` ne se lit **de façon fiable qu'à l'ouverture SUIVANTE** | semer `org_stress=96` + cycle `open`, ouvrir une session, **puis en ouvrir une seconde** et lire le glance |
| N5 | `revealed_secondary = true` jamais observé | exige de régler pour de vrai (`resolve`/`dismiss`) une entrée dont la **même** famille porte un second problème non encore sur le tableau (`problem-aggregator.service.ts:90-95`). Mes 2 cycles n'avaient qu'une entrée par famille | semer 2 signalements en attente, en écarter un, lire `revealed_secondary` |
| N6 | le rendu du tableau à **5 cartes** comme le dessine le cadre 25 | mes tableaux réels avaient 1 et 2 entrées | idem N2 |
| N7 | la transition `none → warning` par un **chemin joueur** | l'écrivain de production existe (`SessionClosedEvent`), mais l'incrément est nul sur un compte frais ; j'ai ouvert le cycle **par fixture SQL**, comme le fait le spec E2E du dépôt. **Tout ce que je rapporte de `warning`/`active` a donc été atteint par fixture, pas par le jeu** | une spec **parcours** (couche 2 du socle) qui monte la tension par des actions joueur seules — elle n'existe pas encore pour ce domaine |
| N8 | le canon `docs/tech/08_ui_screens/screen_13_compression_week_board.md` (501 lignes) **non confronté** | hors de mon mandat (je compare **B** et **M**, pas **canon** et **M**) | c'est le travail du `juge-visuel` et de la spec d'écran |
| N9 | la **couleur/forme** des puces et cartes | hors mandat (juge données) | `juge-visuel` |
| N10 | le comportement de `resolve` sur les 4 familles réglables autres que `flag` (`exception_card`, `cue_cascade_card`, `stressed_leg`, `friction_penalty`) | `resolve` sur `exception_card` déclenche une vraie résolution d'exception via `suggested_action` (`compression-board.service.ts:247-253, 289-296`) et `friction_penalty` déclenche un **décommissionnement réel gouverné** (`:267-279`) — je n'ai pas voulu muter davantage l'état du joueur | `compression_board.spec.ts` test 4 le fait déjà pour `friction_penalty` |
| N11 | l'état du compte de mesure **laissé en place** | `player_id = 01a03a5a-9705-71d8-be51-d2eac1b13664`, cycle 3 laissé **actif, budget épuisé** (c'est la preuve de É1). Toutes mes écritures SQL sont scopées à ce seul joueur ; aucune n'a touché le compte de démo, aucun conteneur n'a été monté ni redémarré | `DELETE FROM account WHERE account_id = …` (cascade) si l'user veut nettoyer |
