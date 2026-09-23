# ce que le back sert à ④, ⑪, ⑫, ㊵ et ⑦, avant tout dessin

> Atelier / DA, 2026-09-23. Commande : ARBITRAGES du 07/09, point 2 (« ④ ⑪ (+ le_pipeline, la_filiere) n'ont aucune maquette série 6 ⇒
> injugeables — reco : maquette ») et point 19 (maquettes autour des données SERVIES, jamais un libellé sans source).
> **Instrument** : `inventaire-donnees-servies.py` — chaque champ des CORPS RÉELS du dossier de juge, et s'il est LU par le code de
> l'écran (arbre `mafia-unity-F` à `c06b0600`). « Lu » = lu par le code, pas dessiné : une borne. Un champ non lu est une question
> « passé à côté ? », pas un défaut. Annexes générées : `25-annexe-04-accueil.md`, `25-annexe-11-coffre.md`, `25-annexe-12-pipeline.md`,
> `25-annexe-40-filiere.md`, `25-annexe-07-lieutenant.md` (commandes en tête de chacune).
> ⚠️ **Fraîcheur** : les corps datent du 22/09, back servi `03cf564c` ; `main` a avancé de 114 commits depuis (`verifier-fraicheur-corps.py` :
> 120 corps « périmés » par une source touchée). Je ne les re-capture pas (la pile dev et un compte : ce n'est pas mon rôle). J'ai relu
> les projections au back `62dcbb35` pour chaque domaine inventorié : voir « écart au back d'aujourd'hui » dans chaque section.

## 0. Ce que les noms désignent

| nom (point 2) | contrôleur | monté par | maquette aujourd'hui |
|---|---|---|---|
| ④ l'Accueil | `DashboardController` + les 4 panneaux de l'ouverture de session (`HighestLeverageCard`, `ExceptionQueuePanel`, `OrgVitalsPanel`, `HomeChrome` — `front.md` §4 B) | surimpression à l'ouverture de session | **aucune** |
| ⑪ « le coffre » | `LaunderingController` | l'onglet **Filière** du dock (`AppShell.cs:271`, `Tab.Pipeline`) | **aucune** |
| ⑫ `le_pipeline` | `PipelineOverviewController` | surimpression depuis ⑪ (`LaunderingController.cs:437-446`) | **aucune** |
| ㊵ `la_filiere` | `FiliereScreenController` | le menu Plus, « LA FILIÈRE » (`AppShell.cs:837`) | ⚠️ **elle EXISTE depuis le point 2** : série 6, cadres **137-142** (« La filière — où en est chaque étape »), référence `screen_c2/reference-1080x2102.png` |

⇒ **Le point 2 est périmé pour `la_filiere`** : ㊵ a une maquette et une référence ; il est jugeable.

## 1. ⑪, ⑫ et ㊵ : trois écrans sur les mêmes données

Mêmes routes GET dans les trois dossiers (`coffre` et `screen_c2`, vérifié : ensembles identiques). Ce que chacun LIT du domaine blanchiment :

| champ servi | ⑪ | ⑫ | ㊵ |
|---|---|---|---|
| `GET …/laundering` `nodes[].node` | ✓ | ✓ | ✓ |
| `nodes[].stage_index` (1 à 4 : l'ORDRE des étapes) | · | · | · |
| `nodes[].cleanliness_band` (DIRTY · PARTIAL · MOSTLY_CLEAN · CLEAN) | ✓ | ✓ | ✓ |
| `nodes[].terminal` (la dernière étape) | · | ✓ | ✓ |
| `nodes[].has_cash` (de l'argent attend à cette étape) | · | ✓ | ✓ |
| `GET …/laundering/{node}` `cleanliness_band` | ✓ | ✓ | ✓ |
| `…/{node}` `deviation_active` (le nœud s'écarte de son profil) | ✓ | · | · |
| `GET …/{node}/pipeline` `stages[].node`, `cleanliness_band` | ✓ | ✓ | ✓ |
| `stages[].terminal`, `stages[].has_cash` | · | ✓ | ✓ |

**Écart au back d'aujourd'hui** (`laundering.projection.service.ts` à `62dcbb35`) : **aucun** — les quatre interfaces portent exactement ces champs.

**Constats** :
- ⑫ et ㊵ lisent **exactement** les mêmes champs ; ⑪ en lit un sous-ensemble, plus `deviation_active`, que ⑫ et ㊵ ignorent — alors que
  ㊵ a un cadre pour lui (138 « La filière s'écarte de son profil »).
- **Personne ne lit `stage_index`** : l'ordre des étapes est servi, et les trois écrans le reconstruisent (ou pas) autrement. Passé à côté ?
- Tout le domaine tient en **6 champs** : une chaîne de 1 à 4 étapes, chacune avec sa propreté, « dernière ? », « de l'argent attend ? »,
  et un drapeau d'écart par nœud. C'est ce que dessinent les cadres 137-142 de ㊵ (« où en est chaque maillon », « de l'argent attend à
  cette étape », « la sortie », le cadre d'écart).

⇒ **Recommandation : ne PAS dessiner de maquette neuve pour ⑪ ni pour ⑫.** La maquette de ㊵ couvre déjà tout ce que le back sert à ces
deux écrans. La vraie question est de **structure**, pas de dessin : **quel écran porte la filière ?** L'onglet du dock qui s'appelle
« Filière » monte ⑪, et l'écran qui a la maquette « la filière » est ㊵, rangé dans le menu Plus ; ⑫ en est une troisième vue. Trois
options : (a) l'onglet Filière monte ㊵ (et ⑪, ⑫ se retirent ou deviennent ses états) ; (b) ⑪ adopte la maquette de ㊵ ; (c) garder les
trois et en dessiner deux. (a) suit le ruling du dock (« le bouton ne ment pas », `front.md` §4 A) : c'est ma recommandation. À f2 —
c'est un montage, pas un mot.

## 2. ④ l'Accueil : l'ouverture de session

Données **lues** (47) et **non lues** (136) : `25-annexe-04-accueil.md`. Le cœur est `POST /v1/session/open` (ce que l'Accueil affiche,
`front.md` §4 B). Ce qu'il sert et que les cinq fichiers de l'Accueil ne lisent pas — une question « passé à côté ? » chacun :

| donnée servie | ce qu'elle dit au joueur | question |
|---|---|---|
| `backlog_badge` | des cartes s'accumulent au-delà de ce que la file montre | passé à côté ? (c'est aussi un candidat au point or de Famille, `22-…` §7.3) |
| `queue_pressure_band` (normal · tendue · saturée — mots servis `exceptions.queue_pressure.*`) | la file est-elle calme ? | passé à côté ? |
| `queue[].priority_band`, `queue[].confidence_band` | l'urgence d'une carte, l'assurance du lieutenant | passé à côté ? (la gravité, elle, est lue) |
| `queue[].event_descriptor_i18n` | la réplique traduite de la carte | ⚠️ **non lue** : `ExceptionQueuePanelController.cs:161-163` affiche `card.event_descriptor` — la chaîne brute du serveur (prose anglaise « Citywide heat is high… », ou un identifiant `exc_demo_…`) — au lieu de la clé servie. Défaut de langue, pas une question. (Les gestes de la carte ne sont pas affichés ici : le « label » que l'instrument compte comme lu est une variable locale, pas le champ.) |
| `queue[].candidate_actions[].effect` (`type`, `target_building_id`) | ce que fait le geste, et sur quel bâtiment | passé à côté ? |
| `flag_review` (`pending_review_count`, `auto_open`) | des drapeaux attendent une relecture | passé à côté ? |
| `settling_glance` (`settling_count`, `all_clear`) | des changements ne sont pas encore « posés » | passé à côté ? |
| `friction_glance.penalty_active` | la friction coûte déjà quelque chose | passé à côté ? (la bande, elle, est lue) |
| `onboarding` (`funnel_step`, `first_decision_recorded`) | où en est le joueur neuf | passé à côté ? |
| `opened_game_day` | le jour | lu par la barre (`TopBarController`), pas par l'Accueil : normal |
| `GET /v1/autonomy-reports` (13 champs : rapports, issues, options A/B, `backlog_age_cycles`) | les rapports des lieutenants en attente | **aucun champ lu** par l'Accueil — alors que `hl_card` dit `AUTONOMY_REPORTS_PENDING` : l'Accueil annonce des rapports qu'il ne montre pas. Passé à côté ? |
| `GET /v1/lieutenants/{id}` (18 champs) | la fiche d'un lieutenant | seul `name` est lu : normal pour un en-tête |

**Écart au back d'aujourd'hui** : `session/open` sert **14** clés depuis F14 (`f4883b7c`) ; le corps du 22/09 en a 12 — il manque
`opened_game_minute` et `day_phase`. La carte d'exception porte `building { id, name_i18n }` depuis S03 (`406ae440`), absente du corps.

⇒ **Avant tout dessin de ④** : la maquette doit choisir, parmi ces données, ce que l'ouverture de session MONTRE. Le canon
(`global_conventions_core` : « destination cold-open ») et `front.md` §4 B (« l'ouverture de session […] puis on tombe sur la ville »)
disent une surimpression courte. Je propose de dessiner **trois états** seulement — rien à trancher / une carte de tête / la file sous
pression — avec les données déjà servies (`hl_card`, `queue[0]`, `queue_pressure_band`, `backlog_badge`), et de laisser les glances
(`flag_review`, `settling`, `friction`, `compression`, `onboarding`) à leurs écrans. À f2 de valider ce périmètre avant que je dessine.

### 2.1 Tranché par l'orchestrateur (2026-09-23)

- **Périmètre de ④ VALIDÉ** : trois états — rien à trancher · une carte de tête · la file sous pression — avec `hl_card`, `queue[0]`,
  `queue_pressure_band`, `backlog_badge`. **Ajout** : quand `hl_card.decision_type_key` vaut `AUTONOMY_REPORTS_PENDING`, l'état « carte de
  tête » montre l'**entrée du rapport** (le lieutenant, « a un rapport pour vous » — les mots du bandeau, `22-…` §7.1 C) ; « une annonce sans
  suite ment ». Le nom du lieutenant arrive au lot F du back.
- **Questions pour l'user** (servies, non lues, NON dessinées — f2 les lui présente) :
  1. `flag_review` (`pending_review_count`, `auto_open`) : des drapeaux attendent une relecture — l'ouverture de session doit-elle le dire ?
  2. `settling_glance` (`settling_count`, `all_clear`) : des changements pas encore posés — le dire à l'ouverture ?
  3. `friction_glance.penalty_active` : la friction coûte déjà — le dire, en plus de la bande ?
  4. `onboarding` (`funnel_step`, `first_decision_recorded`) : un accueil différent pour le joueur neuf ?
  5. `queue[].priority_band` : l'urgence d'une carte, à côté de sa gravité ?
  6. `queue[].confidence_band` : l'assurance du lieutenant sur sa suggestion ?
- **Défaut de langue** (`ExceptionQueuePanelController.cs:161-163`) : confié à CLIENT-1, avec balayage de la classe (tout lecteur de
  `event_descriptor` brut).
- **Filière** (§1) : reco (a) retenue — l'onglet Filière monte ㊵ ; ⑪ et ⑫ sortent du chemin joueur et ne sont plus à juger (inscrit
  dans le générateur des dossiers, `construire-dossiers.py`, notes de ⑪ et de ㊵) ; conditions : ㊵ lit `deviation_active`, l'ordre vient de
  `stage_index`. Montage : CLIENT-1.

### 2.2 La maquette de ④ (dessinée le 2026-09-23, atelier `b4c6475`)

`~/project/atelier3d-mafia/ecrans-brennar-accueil.html` (générée par `generer-maquette-4-2026-09-23.py`) : l'ouverture de session en VERRE sur la
ville (série 6), quatre cadres — **rien à trancher** (« Rien à signaler », « Aucune décision en attente · Aucune exception en attente »,
« Personne ne fait la queue — la routine tient ») · **une carte de tête** (`decision.type.*` « Un local à remettre en état », « Portée
modérée · Urgence faible » — les mots de ⑤ ratifié, série 4 — et ses deux options `hl.option.*`) · **des rapports à lire** (l'entrée :
« Lt. Quist a un rapport pour vous », « Lire maintenant » / « Laisser en attente ») · **la file sous pression** (« Les exceptions »,
« saturée », « Plusieurs attendent encore »). Sous la carte, la suivante de la file : « {nom} attend vos ordres » · « grave » · « trancher ».
Mots : 27 non marqués, tous servis ou ratifiés (vérifié contre `FR_MESSAGES` du back `e355ba63`) ; proposés : « la ville › » (la sortie vers
la ville) et « d'autres attendent au-delà de ce que la file montre » (`backlog_badge`). Aucun rendu : lot `Tools/juge-visuel/rendre-lot-2026-09-23.py`.

## 3. ⑦ la fiche du lieutenant : la base de sa maquette

`GET /v1/lieutenants/{id}` (famille, `25-annexe-07-lieutenant.md`) — ce que `LieutenantScreenController` (⑥ et ⑦) lit et ne lit pas :

| lu (14) | non lu (5) — une question « passé à côté ? » chacune |
|---|---|
| `name`, `archetype`, `granted_role`, `mode`, `op_state_band`, `rule_count_band`, `tenure_bucket`, `script_revision_cost`, `reassignment_disruption`, `role_efficiency_bonus`, `reassign_availability`, `budget_bands.*`, `script_source` | `drift_phase` (l'écart à ses propres règles) · `standing_order.freshness` et `.promotion_suggested` (sa consigne permanente, et s'il faut la promouvoir) · `trust_budget_bucket` (la confiance qu'on lui accorde) · `flag_frequency_band` (à quelle fréquence il signale) |

**Écart au back d'aujourd'hui** (`lieutenant.projection.service.ts` à `62dcbb35`, `LieutenantBands`) : un champ de plus que le corps,
**`cue_bands`**. Personne ne le lit encore.

La maquette de ⑦ (commande de l'orchestrateur, point 2 de sa liste) part de ces **19 + 1** champs, jamais d'un libellé sans source ;
elle suit dans `26-…`.

## 4. Ce qui part d'ici

- Ce document et ses cinq annexes générées ; `inventaire-donnees-servies.py` (`--fichier-seul`, `--aussi`, `--post`).
- **Pour f2** : (1) quel écran porte la filière (§1, reco : l'onglet Filière monte ㊵) ; (2) le périmètre de ④ avant dessin (§2, trois
  états) ; (3) l'Accueil affiche `event_descriptor` brut au lieu de `event_descriptor_i18n` (`ExceptionQueuePanelController.cs:161-163`) — pour CLIENT-2 ; (4) le point 2 est périmé pour `la_filiere`.
- Aucun rendu.
