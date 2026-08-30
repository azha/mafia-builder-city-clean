# Juge données ⊥ — Le Recrutement (screen_15) — mode MAQUETTE — 2026-08-25

## En une phrase

La maquette dessine **49 éléments porteurs d'information** ; le domaine expose **37 clés**
(36 sur ses 7 routes joueur + `opened_game_day` du voisinage). **20** clés sont dessinées,
**17** ne le sont pas, et **18 éléments de maquette n'ont pas de clé** — regroupés en **13 écarts
nommés** (E1–E13), dont quatre franchement sans aucune source : le nom et les bandes du candidat
*en quête*, le rôle et le poste du formulaire d'embauche, la séquence d'étapes, la sévérité des
chips. S'y ajoutent **5 défauts BACK mesurés** (D1–D5) : trois routes joueur rendent **500** sur
une entrée hors domaine · `session_ready` est structurellement **faux** à l'étape d'embauche alors
que l'embauche est gatée · `opened_game_day` reste **périmé** toute la session · un message d'erreur
joueur affirme qu'un bassin livré n'est pas supporté. Et **10 questions « passé à côté ? »** pour
l'user, dont deux grosses : le **prix** de l'embauche, jamais projeté alors que l'écran fait choisir
une bande de salaire, et la **prise de décision d'étape** — l'interaction centrale de l'écran —
**que la maquette ne dessine dans aucun de ses quatre cadres**.

---

## Défauts BACK mesurés (à traiter dans le lot de câblage, avant l'écran)

| # | information | preuve (mesure) |
|---|---|---|
| **D1** | `GET /v1/recruitment/candidates?pool=<hors domaine>` → **500 INTERNAL_ERROR**. Le `pool` est passé brut dans `eq()` sur une colonne pgEnum via un `as` (`recruitment.repository.ts:165` — `pool as RecruitmentCandidateInsert['pool']`), aucune validation du domaine fermé. L'écran a **trois onglets de bassin** : une valeur périmée côté client = 500. | `mesures/34-pool-bogus.json` — `HTTP 500 INTERNAL_ERROR` (les 3 valeurs légales rendent 200 : `34-pool-saltline.json` n=4, `34-pool-defector.json` n=0, `34-pool-civilian.json` n=4) |
| **D2** | `GET /v1/recruitment/quests/{non-uuid}` → **500**, et `POST /v1/recruitment/quests` avec `candidate_id` non-UUID → **500**. Aucun `ParseUUIDPipe` sur `@Param('id')` (`recruitment.controller.ts:87,119,141,163`) ni sur `candidate_id` (`:101-103`, qui ne vérifie que `typeof === 'string'`). | `mesures/36-quest-nonuuid.json`, `mesures/37-start-nonuuid.json` — `HTTP 500 INTERNAL_ERROR` |
| **D3** ★★ | **`session_ready` est TOUJOURS `false` quand la quête est prête à l'embauche** — et l'embauche, elle, EST gatée par la même règle. `projectQuest` calcule `session_ready = outcome===null && hasMoreGatedSteps && …` avec `hasMoreGatedSteps = current_step < final_gated_step` (`recruitment-quest.service.ts:673, 682-683`) ⇒ à `current_step === final_gated_step`, faux par construction. Or `finalizeHire` porte **le 4ᵉ gap D2** (`:435-448` : « the hire itself is session-gated », le refus à `:442-447`). **Deux mondes distincts rendent la MÊME projection** : embauche refusée et embauche possible sont indiscernables. | **Monde A — embauche REFUSÉE** : `18-advance-step3.json` (`current_step:4 = final_gated_step:4`, `session_ready:false`) puis `22-hire-too-early.json` → **409 « hire session not ready: 0 game-minutes elapsed, 720 required »**. **Monde B — embauche POSSIBLE** : horloge poussée à **4420 ≥ `next_session_ready_at_game_minute` 4410** (`23-advance-clock-4.json`), et `24-quest-hireable.json` rend **encore `session_ready:false`** — puis `28-hire.json` → **200, `outcome:"hired"`**. Deux mondes, même projection. |
| **D4** ★ | **`opened_game_day` n'est pas le jour courant** : il est estampillé à l'ouverture de session et **gelé** pour toute sa durée (`session.repository.ts:161-195`, un seul read d'horloge). Or c'est la source du « Jour N » de l'en-tête (annexe de la maquette, verbatim : « Le jour vient d'`opened_game_day` »). Mesuré : horloge à **5150** (jour 3), `session/open` idempotent rend **1** ; après `session/close` + `session/open`, il rend **3**. Un joueur qui garde sa session ouverte voit un jour faux — et compare « s'efface au jour 15 » à un jour périmé. | `44-session-open-2.json` (`opened_game_day=1`) vs `47-session-open-3.json` (`opened_game_day=3`) ; horloge lue en base : `5150` |
| **D5** | Message d'erreur joueur **périmé** (règle 7 du socle) : `POST /v1/recruitment/quests` avec un `quest_type` inconnu rend `422 "quest_type 'bogus' is not a supported pool yet (saltline/defector only — civilian is C6)"`. **`civilian` EST supporté** (`SUPPORTED_QUEST_TYPES` = `{saltline, defector, civilian}`, `recruitment-quest.service.ts:61`) — et j'ai ouvert une quête civilian en 201. | `38-start-badpool.json` (le message) vs `48-quest-civilian.json` (**HTTP 201**, `pool:"civilian"`) |

---

## Écarts à consigner (maquette : dessiné sans source, ou source manquante)

| # | information (M) | B | M | statut | preuve |
|---|---|---|---|---|---|
| **E1** ★★ | **Le nom et les 3 bandes du candidat EN QUÊTE** (cadre 6 « Candidat Saltline n°4 » ; cadre 8 le nom + « Quartier · connu / Expérience · un peu / Prétention · juste ») | – | ● | **DESSINÉ SANS SOURCE** → lot back | `listAvailableCandidates` filtre `status='available'` (`recruitment.repository.ts:164`) : le candidat mis en quête **sort de la liste** (mesuré `08-candidates-after-start.json` : 3 lignes, `Saltline Candidate #3` absent). Et **il n'existe aucune route `GET candidates/:id`** : `10-candidate-detail-probe.json` → **404 « Cannot GET /v1/recruitment/candidates/… »** (router-miss, pas un 404 de propriété). `QuestProjection` ne porte que `candidate_id`. |
| **E2** ★★ | **La prise de décision d'étape** — CURIOUS/DIRECT/CAUTIOUS, LOGISTICS/MUSCLE/FIXER, salaire × autonomie, et les domaines defector/civilian | ● | – | **NON DESSINÉ** (l'interaction centrale de l'écran) | Aucun des 4 cadres ne dessine de sélecteur de décision : cadre 6/9 = « Continuer » nu ; cadre 8 = relecture des décisions **passées** + formulaire d'embauche ; cadre 7 = vide. Or `POST …/advance` **exige** `{decision_type, decision_value}` (`recruitment.controller.ts:124-127`) et le refuse hors domaine (`41-advance-422-value.json` : *opening_line must be one of CURIOUS\|DIRECT\|CAUTIOUS*). |
| **E3** | **Le rôle** (segmenté « Cuisinier / Logistique / Muscle / Sécurité », 4 des 9) et **sa présélection par l'axe révélé** | – | ● | **DESSINÉ SANS SOURCE** (règle serveur recopiée côté client) | Les 9 archétypes sont code-owned (`MAPPER_KNOWN_ARCHETYPES`, `recruitment-quest-outcome-mapper.ts:171-181`) et **aucune route joueur n'ÉNUMÈRE le domaine**. ⚠️ Nuance mesurée, contre mon premier balayage : la VALEUR `archetype` traverse bien la frontière (`GET /v1/lieutenants` rend `"archetype": "COOK"`, `19-lieutenants.json`) — mais seulement pour les lieutenants qu'on possède déjà. Un client ne peut donc pas dériver les 9 choix légaux du formulaire ; il doit les coder en dur, et `finalizeHire` rejette en 422 tout archétype hors liste (`recruitment-quest.service.ts:431-432`). Le mapping axe→archétype vit dans `AXIS_TO_ARCHETYPE_FAMILY` (`:187-191` — `LOGISTICS→LOGISTICS, MUSCLE→MUSCLE, FIXER→SECURITY`), non projeté. La maquette le recopie **exactement** — mais rien ne rougira le jour où il bougera. |
| **E4** | **Le poste** (« Entrepôt · parmi vos 2 bâtiments ») | ~ | ● | **SOURCE DÉTOURNÉE, PAS DE ROUTE DÉDIÉE** | `POST …/hire` **exige** `assigned_building_id` (`recruitment.controller.ts:149-151`). **Aucune route joueur n'ÉNUMÈRE les bâtiments du joueur** (balayage des **82** GET joueur non-admin non-test). Trois routes émettent bien des `building_id` — `GET /v1/operational/building/:id` (par id, il faut déjà le connaître), `GET /v1/supply-chain/graph` et `GET /v1/friction/nodes/:buildingId` — mais aucune ne rend le portefeuille : le graphe ne liste que les nœuds **ayant une activité** (son propre docblock : « a brand-new player with no graph activity yet reads as `{nodes: [], legs: [], routes: []}` »), et je l'ai **mesuré vide** sur un compte qui possède pourtant 4 bâtiments (`19-supply-chain-graph.json`). La seule source est `GET /v1/city/district/:id/interior` → `buildings[]` — **par district**, donc **18 appels** pour énumérer (18 districts mesurés, `53-world-districts.json`). Mesuré : le compte frais a **4** bâtiments (lab, stash, front_shop, cash_safehouse — `21-district-16.json`), pas 2 ; ils portent un `operational_type`, jamais de nom. |
| **E5** ★ | **« 2 postes ouverts »** (cadre 9, annoncé « lot L2 ») | ~ | ● | **À MOITIÉ SERVABLE** — précision du lot L2 | Le compte du roster EST servable (`GET /v1/lieutenants`, mesuré `19-lieutenants.json` : 2 lignes). Le **plafond** ne l'est pas : `lieutenant.max_count_per_player` (défaut **5**, `lieutenant-tunables.ts:33-35`) n'a **aucun** consommateur de projection — ses 2 seuls sites de lecture sont des gardes (`lieutenant.service.ts:210`, `recruitment-quest.service.ts:138`). Les noms de postes (« coursier-coordinateur · fixeur ») n'ont **aucune** source. ⇒ L2 = « projeter le cap », pas « créer une route open-positions ». |
| **E6** ★ | **« reprend dans 12 h de jeu »** (cadre 9, annoncé « lot L3 ») | ~ | ● | **DÉJÀ SERVABLE SUR LE CHEMIN DU REFUS** — l'écart assumé du dossier est **partiellement réfuté** | Le 409 d'`advance` **porte le delta** : `payload_vars = {elapsed_game_minutes: 0, required_game_minutes: 720}` (`11-advance-refused.json`) — 720 − 0 = **12 h de jeu**, exactement le libellé du cadre 9. Le même corps sort du 409 de `hire` (`22-hire-too-early.json`). **Ce qui reste vrai** : sur la LISTE, avant tout geste, le délai n'est pas calculable — `next_session_ready_at_game_minute` est absolu et la seule ancre temporelle joueur est `opened_game_day`, un **jour** (résolution ±1440 min ⇒ ±24 h de jeu), périmé de surcroît (D4). ⇒ L3 = « servir la minute de jeu COURANTE », et il ne concerne que le libellé **pré-clic**. |
| **E7** ★ | **« prochaine décision : l'approche »** sur une quête **saltline** (cadre 6/9) et **« L'approche — curieuse »** (cadre 8) | ~ | ● | **COLLISION DE LIBELLÉ** entre deux domaines distincts | À l'étape 1 d'une quête saltline, le back attend `opening_line` — mesuré à l'oracle : `42-advance-422-type.json` → *« expected decision_type 'opening_line' at this step »*. Or `approach` est le nom d'une **autre** décision, celle du bassin **defector**, de domaine `{SALTLINE_INTERMEDIARY, DIRECT, CORRUPT_CLERK}` (`defector-recruitment.service.ts:63`). L'annexe emploie « approche » pour **les deux**, et **« directe » appartient aux deux domaines** (`DIRECT` est dans `OPENING_LINE_DOMAIN` **et** dans `DEFECTOR_APPROACH_DOMAIN`). Un résolveur i18n clé-par-libellé les confondra. ⇒ clés à qualifier par bassin : `saltline.opening_line.DIRECT` ≠ `defector.approach.DIRECT`. |
| **E8** ★ | **La séquence d'étapes** (« étape 1 sur 5 », les 5 pastilles, « prochaine décision : … ») | – | ● | **DESSINÉ SANS SOURCE** (confirme l'écart assumé n°3) — **et le modèle de pastilles ne généralise pas** | `stepSequence` est code-owned par bassin (`saltline-recruitment.service.ts:86-96`, `defector:158-170`, `civilian:222-232`) et **n'est projetée nulle part**. Pire : les trois bassins n'ont pas le même rapport `final_gated_step`/`steps_total` — **saltline 4/5** (`07-quest-start.json`), **civilian 4/4** (`48-quest-civilian.json`, mesuré), defector 5/6 (dérivé du code, non mesuré). Le modèle « n pastilles dont la dernière est l'embauche » est **faux pour civilian** : l'embauche y tombe sur la dernière pastille gatée. |
| **E9** | **La couleur des chips** (`q-b` / `q-m` / `q-h` / `q-c`) encode la **désirabilité**, pas l'ordinal de la bande : `district_familiarity=HIGH` → vert (`q-h`), `ask_band=HIGH` → braise (`q-c`) | – | ● | **DESSINÉ SANS SOURCE** — correspondance domaine→apparence à sortir en résolveur nommé | Aucune bande n'est accompagnée d'un axe de sévérité côté back ; la table vit uniquement dans le HTML (`ecrans-brennar-2.html`, bloc « SÉRIE 2 : LE RECRUTEMENT », classes `.chip.q-*`). Piège maison connu (socle : *« une correspondance portée par l'ordre d'un tableau et par de la prose n'a aucune forme exécutable à asserter »*). |
| **E10** | **Le libellé de `district_familiarity=HIGH`** : le cadre 6 rend « Quartier · **connu** » avec la classe `q-h` (haute) alors que l'annexe du même document donne « peu connu · connu · **très connu** » pour LOW·MEDIUM·HIGH | – | ● | **INCOHÉRENCE INTERNE À LA MAQUETTE** | Domaine mesuré : `LOW\|MEDIUM\|HIGH` (`saltline-recruitment.service.ts:180`, et 3 valeurs distinctes observées : LOW, MEDIUM, HIGH dans `06-candidates.json`). La maquette ne montre **aucun** exemple `MEDIUM`, et son unique carte « haute » porte le libellé du milieu. |
| **E11** | **`profile.name` du bassin civilian est une CONSTANTE** — pas un bouchon numéroté | ● | ● | **AGGRAVE l'écart assumé n°1 (lot L1)** | `civilian-recruitment.service.ts:196` : `name: 'Civilian Prospect'` — **sans ordinal**. Mesuré : **4 candidats civils disponibles, 4 fois le même nom** (`33-candidates-after-hire-abandon.json`). Le cadre 6 dessine deux cartes distinguables par leur nom ; pour le bassin Civils elles seraient **rigoureusement identiques**. (Saltline/defector ont au moins un ordinal / la clé du rival.) |
| **E12** | **`hire_quality_bucket` absent de l'historique des quêtes** | B⁻ | – | **FORME F** → lot back (1 clé) | La colonne `recruitment_quests.hire_quality_bucket` est écrite à l'embauche et **persistée** (`db/schema/recruitment.ts:122`) — lue en base : `STRONG` pour ma quête (`psql`), avec `expected_outcome = {"axis":"FIXER","script_style":"exploratory","quality_preview":"STRONG"}`. `projectQuest` ne la porte pas ⇒ `GET quests?status=history` rend `outcome:"hired"` **sans dire si l'embauche était bonne** (`29-quests-history.json`). |
| **E13** ★★ | **`lieutenant.loyalty_seed_bucket` n'est lisible qu'UNE fois, dans la réponse de `hire`** — l'annexe affirme pourtant que « l'écran suivant (la Famille) peut [les] montrer » | B⁻ | – | **AFFIRMATION DE L'ANNEXE RÉFUTÉE** → lot back | Balayage d'arbre sur `loyalty_seed_bucket` : **1 seul controller** le porte, `recruitment.controller.ts:144` (le type de retour de `hire`). **Contrôle positif** sur `hire_quality_bucket` (dont on SAIT qu'il sort par `/hire`) : **2** controllers ⇒ le motif attrape bien. Mesuré côté Famille : `GET /v1/lieutenants/:id` rend **17 clés**, aucune n'est `loyalty_seed_bucket` (`43-lieutenant-detail.json`) ; `GET /v1/lieutenants` en rend **5** (`19-lieutenants.json`). Idem pour `lieutenant.source` (saltline/defector/civilian) et `lieutenant.recruitment_quest_id`. |

---

## « Passé à côté ? » — pour l'user (classé par intérêt joueur décroissant)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | **le PRIX de l'embauche** — `saltlineHireCostCents = 500 000` (5 000 €) × `SALARY_BAND_MULTIPLIER {LOW:0.75, FAIR:1.0, GENEROUS:1.5}` (`recruitment-quest-outcome-mapper.ts:200`) ; **aucune projection** | ce que la négociation coûte vraiment | **utile ici, et c'est le trou le plus gros** : la maquette fait choisir « paie basse · juste · généreuse » **sans jamais montrer d'argent**, et le CTA débite. Le joueur choisit un multiplicateur en aveugle. | ★★★ |
| **Q2** | `expected_outcome.quality_preview` (colonne `recruitment_quests.expected_outcome`) | « cette embauche sera SOLIDE » | **utile au cadre 8**, mais **pas servable tel quel** : la colonne n'est écrite qu'**à** `finalizeHire` (site unique `recruitment-quest.service.ts:587` → `repository:352`), jamais en cours de quête (le « rolling » de DD-R3 n'est pas ce que fait le code). Un aperçu vivant se calcule par le mapper **pur** (`computeHireQualityBucket`) au moment de la lecture. | ★★★ |
| **Q3** | `decisions[].revealed_axis` **exploité comme signal** (mesuré : axe `FIXER` ≠ tâche choisie `LOGISTICS`) | l'axe fort du candidat, révélé par l'essai | **déjà dessiné** (cadre 8) mais la maquette illustre le cas où axe = tâche, ce qui masque le mécanisme. Une carte qui montre l'écart (« vous l'avez testé en logistique, il est fixeur ») est **le** moment de bascule du recrutement. | ★★ |
| **Q4** | `sessions_consumed` | combien de sessions cette quête a déjà coûté | pas indispensable (`current_step` le dit presque) — sauf pour distinguer une quête reprise d'une quête neuve. | ★ |
| **Q5** | `pool = defector` + **le coût de vérification** `defectorVettingCostCents = 1 500 000` (15 000 €) et l'option `{skip: true}` | vérifier un transfuge coûte cher, ou passer et prendre le risque | **utile** : c'est une décision d'argent-contre-risque, la plus riche des trois bassins, et **la maquette ne la dessine pas** (elle ne détaille que Saltline). | ★★ |
| **Q6** | `citizen_id` (bassin civilian) | ce candidat est un citoyen que vous croisez déjà en ville | joli lien de fiction si un écran Citoyens existe ; **inutile** tant qu'aucune route ne résout un `citizen_id`. | ★ |
| **Q7** | `source_rival_key` (bassin defector) | il vient de chez **tel** rival | **utile** : c'est ce qui rend un transfuge intéressant (et ce qui déclenche l'héritage maladaptatif à l'embauche, `finalizeHire` D10). Aujourd'hui c'est une clé opaque sans table de noms. | ★★ |
| **Q8** | `surfaced_at_game_day` | depuis quand il traîne | plomberie ; `expires_at_game_day` suffit à l'écran. | – |
| **Q9** | `status` (toujours `'available'` dans la liste — filtré à la source) et `player_id` (celui de l'appelant) | rien | **plomberie** : deux clés mortes du corps. À retirer si la projection est un jour resserrée. | – |
| **Q10** | `outcome ∈ {hired, declined_player, declined_candidate, abandoned}` (`db/schema/recruitment.ts:33`) | comment une quête s'est terminée | l'historique n'est pas dessiné du tout ; `declined_candidate` mérite une carte (« il a refusé »). ⚠️ voir Q-bis ci-dessous. | ★ |

**Q-bis — une observation qui n'est pas une question mais un défaut back du domaine** (hors périmètre
de la maquette, remonté parce que mesuré) : `declined_candidate` est **inatteignable pour le bassin
civilian aux valeurs livrées**. `declinePredicateFires` exige `pressingCount >= 2`
(`civilian-recruitment.service.ts:317-319`), or la séquence gatée civilian **ne contient qu'UNE
`courting_session`** — mesuré, pas déduit : sondes successives sur une vraie quête civilian →
étape 1 `affinity_source`, étape 2 `courting_session`, étape 3 **`initiation_task`**
(`51-civ-step3-probe.json` : *« expected decision_type 'initiation_task' at this step »*), avec
`current_step:3 / final_gated_step:4` (`52-civ-quest-state.json`). Cause : `courtingRepeats =
max(1, min(courtingSessions=2, gatedCount−2=1)) = 1` (`:223-224`) — le tunable
`civilianCourtingSessions = 2` (mesuré, `45-tunables.json`) est **écrasé par `stepsTotal`**, alors
que le commentaire du fichier affirme l'inverse (« `courtingSessions` is the AUTHORITATIVE repeat
count, `stepsTotal` a defensive floor only »). C'est une **forme E** du socle : deux grandeurs qui
ne mesurent pas la même chose, comparées à un seuil qu'elles ne peuvent pas atteindre.

---

## Lots back suggérés (B⁻ dessiné, ou route manquante)

| # | ce qui manque | où | maquette | preuve |
|---|---|---|---|---|
| **L-a** ★★ | **résoudre un candidat par son id** (ou porter le profil du candidat dans `QuestProjection`) — sans quoi la carte de quête n'a **ni nom ni bandes** | `recruitment.controller.ts` (route `GET recruitment/candidates/:id`, le repo a déjà `getCandidateForPlayer`, `recruitment.repository.ts:175`) **ou** `projectQuest` | M20, M31–M34 (cadres 6, 8, 9) | `10-candidate-detail-probe.json` (404 router-miss) + `08-candidates-after-start.json` |
| **L-b** ★★ | **un booléen d'embauche** (`hire_ready`) ou faire porter à `session_ready` le gap d'embauche | `recruitment-quest.service.ts:672-684` (`projectQuest`) | M43 « ENGAGER » | défaut **D3** ci-dessus, deux mondes mesurés |
| **L-c** ★★ | **la minute de jeu courante** dans une lecture vivante (et non seulement l'estampille de session) | `session/open` (`SessionOpenSequencePayload`) ou une route `GET /v1/city/clock` | M02 « Jour N », M49 « reprend dans 12 h » | défaut **D4** (1 vs 3) |
| **L-d** | **`hire_quality_bucket`** dans `QuestProjection` (au moins pour `status=history`) | `recruitment-quest.service.ts:676-690` | l'historique (non dessiné) | E12 |
| **L-e** | **`loyalty_seed_bucket`**, **`source`**, **`name`** sur la projection lieutenant | `lieutenant.projection.service.ts` | l'écran Famille (annexe) | E13, balayage 1 controller + contrôle positif 2 |
| **L-f** | **le plafond de roster** (`lieutenant.max_count_per_player`) projeté | n'importe quelle lecture joueur (p. ex. `GET /v1/lieutenants`) | M47 « 2 postes ouverts » | E5 |
| **L-g** | **lister les bâtiments du joueur** (une route, pas 18) | domaine `real_estate` | M42 « Poste » | E4, 82 GET joueur balayés |
| **L-h** | **le prix de l'embauche** projeté (base × multiplicateur de bande) | `QuestProjection` ou une lecture dédiée | M38/M44 (négociation) | Q1 |
| **L-0** | **conventions lot 0** : `ParseUUIDPipe` sur les 4 routes à id + validation du domaine fermé sur `?pool=` + libellés en clés i18n | `recruitment.controller.ts` ; `GET /v1/i18n/bundle` | tout l'écran | D1, D2 ; bundle mesuré : **67 messages**, préfixes `error.*` / `game.*`, locale `en`, **0 clé recrutement** (`35-i18n-bundle.json`) |

---

## Actions : routes ↔ CTA

| route joueur (`@Post`) | CTA maquette | statut |
|---|---|---|
| `POST /v1/recruitment/quests` | « Ouvrir la quête » (cadres 6, 9) | ✔ apparié |
| `POST /v1/recruitment/quests/:id/advance` | « Continuer » (cadres 6, 9) | ⚠️ **apparié à moitié** — le CTA existe, **le corps qu'il doit envoyer n'est pas dessiné** (E2) |
| `POST /v1/recruitment/quests/:id/hire` | « ENGAGER · SALTLINE » (cadre 8) | ⚠️ apparié, mais les **deux champs obligatoires** du corps sont sans source (E3, E4) et l'état d'activation du CTA est indécidable (D3) |
| `POST /v1/recruitment/quests/:id/abandon` | « Abandonner la quête » (cadre 8) | ✔ apparié — et son effet dessiné (« le candidat redevient disponible ») est **mesuré vrai** (`32-abandon.json` puis `33-candidates-after-hire-abandon.json` : le candidat abandonné est de retour en `available`) |

**Aucune route `@Post` du domaine n'est orpheline ; aucun CTA n'est sans route.** Ce qui manque
n'est pas un geste, c'est **le contenu d'un geste** (le `decision_value` de `advance`).

---

## Table de couverture complète

**Convention de comptage** (déclarée pour que le contrôle soit vérifiable) : une clé B = une
**feuille d'information** projetée, **plus** les trois conteneurs de tableau (`candidates[]`,
`quests[]`, `decisions[]`) dont le **cardinal** ou la liste est lui-même une information affichée. Les 4 CTA
(M15, M23, M43, M45) sont appariés à leur route dans la section *Actions* et comptés appariés ici.

**Comptes.** `|B|` = **37** (13 sur `candidates` · 18 sur `quests` · 3 propres à `hire` · 2 du
corps de refus 409 · 1 de voisinage `opened_game_day`) · `|M|` = **49** éléments, dont
`|M non apparié|` = **18** · `|F sans source|` = **0** (mode maquette).
**Somme = 37 + 18 + 0 = 55 lignes**, réparties en **20** (● ●) + **17** (● –) + **18** (– ●) =
**55**. ✔ *(Les 31 éléments M appariés se fondent dans les 20 lignes ● ● — `current_step` seul est
rendu par M19, M21, M29 et M30.)*

### ● ● — disponible et dessiné : 20 lignes

| # | clé B | élément(s) M | statut |
|---|---|---|---|
| 1 | `candidates[]` (cardinal) | M03 « 3 candidats », M17 « … et 1 autre », M25 « 0 candidat » | ✔ mesuré 3 dispo sur 4 |
| 2 | `candidates[].pool` | M05/M06/M07 onglets Saltline / Transfuges / Civils | ✔ 3 valeurs = 3 onglets |
| 3 | `candidates[].profile.name` | M09 « Candidat Saltline n°1 » | ✔ mais **bouchon** (E11) |
| 4 | `candidates[].profile.district_familiarity` | M11 « Quartier · peu connu » | ✔ libellé HIGH douteux (E10) |
| 5 | `candidates[].profile.experience` | M12 « Expérience · aucune » | ✔ |
| 6 | `candidates[].profile.ask_band` | M13 « Prétention · juste » | ✔ |
| 7 | `candidates[].expires_at_game_day` | M10 « s'efface au jour 15 » | ✔ mesuré 15 = 1 + 14 |
| 8 | `quests[]` (cardinal) | M04 « 1 quête », M18 « Quête en cours · 1 », M28 « 1 quête prête » | ✔ |
| 9 | `quests[].pool` | M21 « Saltline · », M29, M43 « ENGAGER · SALTLINE » | ✔ |
| 10 | `quests[].current_step` | M19, M21 « étape 1 sur 5 », M29, M30 (pastilles) | ✔ |
| 11 | `quests[].steps_total` | M16 « cinq étapes », M19/M30 (nombre de pastilles) | ✔ **modèle non générique** (E8) |
| 12 | `quests[].final_gated_step` | M28 « prête à l'embauche », M39 | ✔ |
| 13 | `quests[].session_ready` | M23 « Continuer » grisé, M24 « pas encore prête » | ✔ **pour `advance`** — faux pour `hire` (**D3**) |
| 14 | `quests[].decisions[]` (la liste) | la pile d'étapes du cadre 8 | ✔ |
| 15 | `decisions[].decision_type` | M35 « L'approche », M36 « La tâche d'essai », M38 « La négociation » | ✔ mais libellé colliding (**E7**) |
| 16 | `decisions[].decision_value` | M35 « curieuse », M36 « logistique », M38 « paie juste · autonomie équilibrée » | ✔ |
| 17 | `decisions[].revealed_axis` | M37 « axe révélé : logistique » | ✔ (mesuré `FIXER` ≠ tâche `LOGISTICS`) |
| 18 | `error.payload_vars.elapsed_game_minutes` | M49 « reprend dans 12 h de jeu » | ✔ **sur le refus seulement** (E6) |
| 19 | `error.payload_vars.required_game_minutes` | M49 (même élément) | ✔ idem |
| 20 | `session/open.opened_game_day` | M02 « Jour 1 », M28 « Jour 4 » | ⚠️ **périmé en session** (**D4**) |

*Éléments M appariés non listés en propre parce qu'ils se fondent dans les lignes ci-dessus :*
M01 (non — voir ● –), M15/M23/M43/M45 (les 4 CTA, section *Actions*), M26 (onglets à 0 = ligne 1+2),
M46 (« le candidat redevient disponible » — **mesuré vrai**, `32-abandon.json` puis
`33-candidates-after-hire-abandon.json`, apparié à la recomposition de `candidates[]`).

### ● – — disponible, ni dessiné ni affiché : 17 lignes → questions « passé à côté ? »

`candidates[].candidate_id` · `candidates[].player_id` (Q9) · `candidates[].citizen_id` (Q6) ·
`candidates[].source_rival_key` (Q7) · `candidates[].status` (Q9) ·
`candidates[].surfaced_at_game_day` (Q8) · `quests[].quest_id` · `quests[].candidate_id`
(**le lien, jamais résolu — la cause de E1**) · `quests[].sessions_consumed` (Q4) ·
`quests[].next_session_ready_at_game_minute` (inutilisable seul — E6) · `quests[].outcome` (Q10) ·
`decisions[].step` · `decisions[].at_game_minute` · `decisions[].skipped` (Q5) ·
`hire.lieutenant_id` · `hire.hire_quality_bucket` · `hire.loyalty_seed_bucket`
(les deux dernières = les « deux bandes rendues par `hire` » de l'écart assumé n°5 — **non
dessinées, et non re-lisibles**, E13).

### – ● — dessiné sans source : 18 lignes → les écarts E1–E13

| élément M | écart |
|---|---|
| M01 « Le Recrutement » (titre) | chrome statique — aucune source requise, mais **aucune clé i18n** non plus (L-0) |
| M08 buste générique du candidat | aucune source, un seul sprite pour les 3 bassins et tous les profils |
| M14 couleur du chip (`q-b`/`q-m`/`q-h`/`q-c`) | **E9** — correspondance domaine→apparence sans résolveur |
| M16 « une par session » | la **durée** de session (`questSessionDurationInGameHours = 12`) n'est pas projetée |
| M20 nom du candidat en quête (cadre 6/9) | **E1** |
| M22 « prochaine décision : l'approche » | **E7** + **E8** |
| M27 « la nuit en amènera » | copie statique — et **fausse sur cette stack** (annexe 6, point 3) |
| M31 nom du candidat en quête (cadre 8) | **E1** |
| M32 « Quartier · connu » (candidat en quête) | **E1** |
| M33 « Expérience · un peu » (candidat en quête) | **E1** |
| M34 « Prétention · juste » (candidat en quête) | **E1** |
| M39 « L'embauche — à vous, le rôle et le poste » | **E8** (l'étape d'embauche n'est pas une entrée de `decisions[]`) |
| M40 les 4 rôles du segmenté | **E3** |
| M41 la présélection par l'axe révélé | **E3** |
| M42 « Poste — Entrepôt, parmi vos 2 bâtiments » | **E4** |
| M44 « paie et autonomie négociées s'appliquent » | **Q1** — le multiplicateur et le prix ne sont pas projetés |
| M47 « 2 postes ouverts — coursier-coordinateur · fixeur » | **E5** |
| M48 les noms propres (Karim Selim, Dario Larue, Nino Castellane) | **E11** / lot L1 |

**Non compté ici, parce que ce n'est pas un défaut de couverture mais une incohérence interne à la
maquette :** **E2** (la prise de décision d'étape n'est dessinée dans aucun cadre — c'est une clé B
*appariée* aux lignes 15/16 en LECTURE, jamais en ÉCRITURE) et **E10** (le libellé de
`district_familiarity=HIGH` contredit l'annexe du même document). Les deux restent des écarts à
trancher.

---

## Annexes

### 1. Routes du domaine — compte et ancres

Balayage python sur **tous** les `*.controller.ts` de `services/game-back/src` : **1019**
décorateurs de route, dont **680** `_test` et **339** non-`_test`. Filtre `recruit` dans le
chemin : **12** non-`_test` + **5** `_test`.

**7 routes joueur** (toutes `@UseGuards(JwtAuthGuard)`, vérifié ligne à ligne) —
`operational/recruitment/recruitment.controller.ts` :

| verbe | chemin | ligne |
|---|---|---|
| GET | `recruitment/candidates?pool=` | `:62` (garde `:63`) |
| GET | `recruitment/quests?status=active\|history` | `:73` (garde `:74`) |
| GET | `recruitment/quests/:id` | `:85` (garde `:86`) |
| POST | `recruitment/quests` (201) | `:96` (garde `:98`) |
| POST | `recruitment/quests/:id/advance` (200) | `:115` (garde `:117`) |
| POST | `recruitment/quests/:id/hire` (200) | `:137` (garde `:139`) |
| POST | `recruitment/quests/:id/abandon` (200) | `:159` (garde `:161`) |

**5 routes staff** (`recruitment-admin.controller.ts`, `requireStaffRole('gm'\|'admin')` : `:149`,
`:175`, `:211`, `:270`, `:335`) — exclues. **3 routes `_test`** dans le module
(`recruitment-test.controller.ts:64,97,135`) — exclues du compte B, employées comme
**dimensionnement** (voir annexe 2).

**Complément hors module** (grep `recruit` sur tous les controllers, 20 fichiers) : aucune autre
route joueur ne porte de donnée de recrutement. Les voisins réellement consommés par l'écran sont
`POST /v1/session/open` (le jour), `GET /v1/lieutenants` (le roster et, pour le bassin civilian, la
liste fermée des `affinity_source`), `GET /v1/city/district/:id/interior` (les bâtiments, E4).

### 2. Corps réels — `mesures/` et commandes

Compte **frais**, jamais le compte de démo : `callsign = jd-rec-1787684414`,
`player_id = 01a03a4b-62f9-75d9-94d2-9cee555e330f` (`mesures/00-account.txt`).

```
# signup (Idempotency-Key requis — auth.controller.ts:238) ; jeton à payload.data.access_token
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-rec-$(date +%s)"
curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}" > 01-signup.json
# session/open (client_version obligatoire — session.controller.ts:60-63)
curl -s -X POST http://localhost/v1/session/open -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"client_version":"juge-donnees-1.0"}' > 02-session-open.json
```

**Dimensionnement** (sur compte frais, `candidates` et `quests` rendent `[]` —
`03-fresh-*.json`) : `POST /v1/_test/recruitment/run-availability-tick` (le **vrai** corps de la
cadence NIGHTLY/23, appelé directement) → `saltlineInserted: 4` (`05-availability-tick.json`).
Puis l'horloge par `POST /v1/_test/citysim/advance?ticks=730` — `advancePlayer`, **le chemin de
production** (`city_sim_scheduler.service.ts`), 5 avances de 730 minutes ≈ 56 s chacune.

Fichiers : `01`–`53` dans `mesures/`, plus **`mesures/COMMANDES.txt`** (toutes les commandes, y
compris les `SELECT` de lecture en base) et **`mesures/KEYSETS.txt`** (les ensembles de clés triés,
recalculés depuis les corps réels).
Parcours complet mesuré : ouverture de quête → `opening_line CURIOUS` → `trial_task LOGISTICS`
(+ `revealed_axis FIXER`) → `negotiation FAIR/BALANCED` → **embauche 200**
(`hire_quality_bucket: STRONG`, `loyalty_seed_bucket: tested`) ; plus une quête abandonnée et une
quête civilian menée à son étape 3.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue à la source |
|---|---|---|
| `pool` / `quest_type` | `saltline \| defector \| civilian` | pgEnum `lieutenant_source` réutilisé, `db/schema/recruitment.ts:51,99` |
| `status` (candidat) | `available \| in_quest \| hired \| expired \| declined` | **`text`, PAS de CHECK** — domaine code-owned, `db/schema/recruitment.ts:64-65` (dit explicitement « application-enforced, not a DB CHECK ») |
| `outcome` | `hired \| declined_player \| declined_candidate \| abandoned` | pgEnum `recruitment_quest_outcome`, `db/schema/recruitment.ts:33` |
| `profile.district_familiarity` | `LOW \| MEDIUM \| HIGH` | littéral de génération, `saltline-recruitment.service.ts:181` (idem defector `:117`, civilian `:187`) |
| `profile.experience` | `NONE \| SOME \| VETERAN` | idem `:183` |
| `profile.ask_band` | `LOW \| FAIR \| HIGH` | idem `:183` |
| `decisions[].decision_type` (saltline) | `opening_line \| trial_task \| negotiation` | `saltline-recruitment.service.ts:64` |
| `decision_value` `opening_line` | `CURIOUS \| DIRECT \| CAUTIOUS` | `OPENING_LINE_DOMAIN`, `:49` |
| `decision_value` `trial_task` / `revealed_axis` | `LOGISTICS \| MUSCLE \| FIXER` | `TRIAL_TASK_DOMAIN`, `:54` |
| `decision_value` `negotiation` | `{salary_band: LOW\|FAIR\|GENEROUS, autonomy_band: TIGHT\|BALANCED\|LOOSE}` | `:58`, `:60` |
| `decision_type` (defector) | `approach \| vetting_session \| negotiation` | `defector-recruitment.service.ts:67` ; `approach ∈ {SALTLINE_INTERMEDIARY, DIRECT, CORRUPT_CLERK}` `:63` |
| `decision_type` (civilian) | `affinity_source \| courting_session \| initiation_task` | `civilian-recruitment.service.ts:149` ; `courting_tone ∈ {PATIENT, PRESSING}` `:135` ; `initiation_task ∈ {ERRAND, LEDGER, LOOKOUT}` `:139` ; `affinity_source ∈ {'player'} ∪ ids de vos lieutenants` `:146` + garde de propriété `recruitment-quest.service.ts:231-238` |
| `hire_quality_bucket` | `WEAK \| SOLID \| STRONG \| EXEMPLARY` | pgEnum `hire_quality`, `db/schema/recruitment.ts:29` |
| `loyalty_seed_bucket` | `seeded \| tested \| tempered \| fractured` | pgEnum, `db/schema/lieutenant.ts:53` |
| `archetype` (corps de `hire`) | 9 valeurs : `LOGISTICS, MUSCLE, COOK, SECURITY, FACILITY_MANAGER, BOOKKEEPER, DISTRIBUTION, LAUNDERING, INTELLIGENCE` | `MAPPER_KNOWN_ARCHETYPES`, `recruitment-quest-outcome-mapper.ts:171-181` — **la liste française de l'annexe en compte 9, elle correspond exactement** |
| `current_step` / `steps_total` / `final_gated_step` | entiers ; **saltline 1..4 / 5 / 4**, **civilian 1..3 / 4 / 4** (mesurés), defector 1..4 / 6 / 5 (dérivé du code, non mesuré) | tunables mesurés `45-tunables.json` : `saltlineQuestSteps 5`, `defectorQuestSteps 6`, `civilianQuestSteps 4`, `questSessionDurationInGameHours 12`, `saltlineCandidatesPerPool 4`, `candidateExpiryGameDays 14` |

**R2.2** — aucune clé du domaine ne déroge : tout est bande fermée, id opaque, compteur d'étape ou
horodatage de jeu. Les internes serveur sont bien masqués (`double_agent` jamais dans
`QuestProjection` par construction ; `detected`/`session_n` retirés à la frontière,
`sanitizeDecisionsForProjection`, `recruitment-quest.service.ts:685, 702-711`).

### 4. Inventaire M (Mxx → ce que ça représente)

**Source** : `~/project/atelier3d-mafia/ecrans-brennar-2.html`, bloc « SÉRIE 2 : LE RECRUTEMENT »
(CSS) et cadres 6 à 9 (lignes 469–557 du fichier filtré `awk 'length($0)<4000'`), plus l'annexe
« Ce que le Recrutement fixe » (ligne 627+).

Cadre 6 « la rue propose » — M01 titre · M02 « Jour 1 » · M03 « 3 candidats » · M04 « 1 quête » ·
M05/M06/M07 les trois onglets de bassin avec compte · M08 buste générique · M09 nom du candidat ·
M10 « s'efface au jour 15 » · M11/M12/M13 les trois chips de bande · M14 la couleur du chip ·
M15 « Ouvrir la quête » · M16 « cinq étapes, une par session » · M17 « … et 1 autre » ·
M18 « Quête en cours · 1 » · M19 les 5 pastilles · M20 nom du candidat en quête ·
M21 « Saltline · étape 1 sur 5 » · M22 « prochaine décision : l'approche » · M23 « Continuer »
grisé · M24 « pas encore prête — à la prochaine session ».
Cadre 7 « personne à la porte » — M25 « 0 candidat · 0 quête » · M26 les onglets à 0 ·
M27 « Personne ne cherche à entrer pour l'instant — la nuit en amènera ».
Cadre 8 « prêt à engager » — M28 « Jour 4 · 1 quête prête à l'embauche » · M29 « Quête Saltline ·
étape 4 sur 5 » · M30 les pastilles 4 pleines + 1 vive · M31 nom du candidat · M32/M33/M34 ses
trois bandes · M35 « L'approche — curieuse » · M36 « La tâche d'essai — logistique » ·
M37 « axe révélé : logistique » · M38 « La négociation — paie juste · autonomie équilibrée » ·
M39 « L'embauche — à vous, le rôle et le poste » · M40 les 4 rôles · M41 la présélection
« Logistique » · M42 « Poste — Entrepôt, parmi vos 2 bâtiments » · M43 « ENGAGER · SALTLINE » ·
M44 « appui long — paie et autonomie négociées s'appliquent » · M45 « Abandonner la quête » ·
M46 « le candidat redevient disponible ».
Cadre 9 « avec les lots back » — M47 « 2 postes ouverts — coursier-coordinateur · fixeur » ·
M48 les noms propres (Karim Selim, Dario Larue, Nino Castellane) · M49 « reprend dans 12 h de jeu ».

### 5. Inventaire F

**Sans objet** — mode maquette, le front n'existe pas encore.

### 6. Non vérifié

1. **Le bassin `defector` n'a jamais rendu de corps.** `GET candidates?pool=defector` → `n=0` sur
   mon compte (`34-pool-defector.json`) : la surface d'un transfuge exige un rival « qualifiant »
   (régime `bleeding`/`retrench`, D8) que je n'ai pas su produire sans la route admin
   `POST recruitment/force-defector-trigger` (staff, hors périmètre joueur). Donc : la forme
   `profile.name = "Defector Contact (<rivalKey>)"`, la valeur de `source_rival_key`, le corps
   d'une décision `vetting_session` (`{skip}` / le débit de 15 000 €) et
   `final_gated_step = 5` sont **DÉDUITS du code** (`defector-recruitment.service.ts:126,158-170`,
   `recruitment-quest.service.ts:254-267`), jamais mesurés. **Ce qui trancherait** : un
   `POST /v1/recruitment/force-defector-trigger` avec un jeton staff, puis la même séquence.
2. **Aucune quête civilian menée jusqu'à l'embauche.** J'ai mesuré ses 3 étapes gatées et son
   `final_gated_step = 4` ; je n'ai pas mesuré `mapCivilianSeedScript` ni le
   `civilianInitiationMismatch` (l'écart tâche/démographie qui fait tomber la loyauté de `seeded` à
   `tested`). **Ce qui trancherait** : deux avances de plus + un `hire` sur la quête
   `1cc01916-13e6-4901-a691-8a3c6b4dfc46`.
3. **Le monde ne tourne pas tout seul sur cette stack.** `CITYSIM_CONTINUOUS_LOOPS` est **vide**
   dans `mafia-clean-city-game-back-1` (mesuré par `docker exec`), et
   `scheduler.module.ts:53-56` lie alors `PinnedCitySimClock` au lieu de `RealCitySimClock`.
   Conséquence pour l'écran : **« la nuit en amènera » (M27) n'arrive jamais** ici — le bassin de
   candidats d'un vrai joueur reste vide indéfiniment, et aucune quête ne peut avancer (le gate
   D2 est en temps de JEU). Toutes mes mesures « peuplées » ont été obtenues en poussant l'horloge
   par une route `_test`. **Je n'ai pas vérifié l'état du VPS** — la question « un joueur peut-il
   réellement recruter en production ? » reste ouverte et relève d'une spec **parcours**, pas de ce
   rapport.
4. **`status` n'a jamais été observé ailleurs qu'à `available` et `hired`.** Les valeurs
   `in_quest`, `expired`, `declined` sont lues dans un **commentaire** de schéma
   (`db/schema/recruitment.ts:64`), pas dans une contrainte : le domaine n'est pas opposable, et
   rien ne rougira si un 6ᵉ état apparaît. (J'ai bien observé le passage hors de `available` à
   l'ouverture d'une quête, mais par **disparition de la liste**, pas par lecture de la valeur.)
5. **Le rendu PNG de la maquette n'a pas été comparé au HTML.** J'ai jugé la **source**
   (`ecrans-brennar-2.html`) ; les quatre `Tools/juge-visuel/recrutement/*.png` ne sont pas
   ratifiés et n'entrent pas dans ce jugement. Un écart HTML↔PNG, s'il existe, m'est invisible.
6. **Je n'ai pas mesuré le débit réel de l'embauche.** `saltlineHireCostCents × multiplicateur`
   est lu dans le code et le tunable (`45-tunables.json`) ; je n'ai pas comparé le portefeuille
   avant/après `hire` (Q1 en serait renforcé, pas modifié).
