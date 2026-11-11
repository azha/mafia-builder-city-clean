# Juge données ⊥ — ④ la carte qui AGIT + après-geste ⑤ (cadres 5, 6, 7) — clôture, moment 2 — 2026-11-11

Juge NEUF, contexte vierge. Aucun rapport de juge ni de revue lu ; aucune note d'implémentation lue.
Sources épinglées : back `35bdd6cb` (`~/project/mafia-clean-city`, `git show`), client `b56d837e`
(`~/project/mafia-unity-F`, `git show`), maquette atelier `8f59cf94` (`ecrans-brennar-accueil.html`,
cadres 5/6/7 **0-based** + `reference/variantes-textes-8f59cf94.txt`).

## Conditions de f2 — tenues

| condition | tenue | preuve |
|---|---|---|
| `X-Server-Build` = `35bdd6cb…` AVANT la 1re mesure | oui | `mesures/build-avant.txt` → `X-Server-Build: 35bdd6cb` (06:45:45) |
| `X-Server-Build` = `35bdd6cb…` APRÈS la dernière | oui | `mesures/build-apres.txt` → `X-Server-Build: 35bdd6cb` (07:00:20), sur `/v1/health` **et** sur `POST /v1/session/hl-card/<uuid>/skip` |
| comptes JETABLES `juge4m2_<n>`, un par scénario, `POST /v1/auth/signup` + `Idempotency-Key` | oui, **5** | `juge4m2_1` (01,02) · `juge4m2_2` (05,06) · `juge4m2_3` (07,08) · `juge4m2_4` (09,10) · `juge4m2_5` (11,12) |
| jamais le compte de démo, jamais `_test`, jamais purge/reset | oui | aucune URL `_test` dans `mesures/` ; aucun reset |
| aucun `docker compose`, aucun conteneur touché | oui | `mesures/docker-ps.txt` (lecture seule) |
| aucune écriture hors comptes jetables et hors ce répertoire | oui | seuls `rapport.md` + `mesures/` écrits |
| B mesuré sur corps RÉELS | **partiel** — voir §« non productible » | `mesures/02,06,08,10,12` |

⚠️ **`rtk curl` RÉSUME le JSON** (il a rendu un schéma `{payload:{data:{backlog_badge: bool…}}}` à la
place du corps). Toutes les mesures passent par `rtk proxy curl`. Le premier essai filtré est
conservé tel quel dans `mesures/00-journal-rtk-curl-resume.txt` pour que l'erreur ne se refasse pas.

## En une phrase

L'écran REND **18 des 25 clés** que le back sert pour ce domaine (3 de plus lues en LOGIQUE — l'id de
la carte, le code du refus, `skipped` ; **4 reçues et jetées** — `stopped_at_error`, `navigate_screen`,
`navigate_ids`, `details.reason`) ; **0 défaut A/B** ; **9 constats C**
(dont 6 re-vérifiés comme écarts déjà assumés) ; **3 questions « passé à côté ? »** ; et la seule
chose que je n'ai pas pu mesurer en vrai est la carte NON NULLE elle-même : **aucune carte à deux
options n'est productible par une action JOUEUR sur un compte neuf** (mesuré, §suivant).

## « Non productible » — la carte à deux options, mesurée comme inatteignable

Le dossier m'autorise à déclarer « non productible » si aucune action joueur n'y mène. Je le déclare,
avec la mesure.

1. **Compte neuf** : `hl_card: null` (`mesures/02-open-juge4m2_1-neuf.json`), file à **1** carte
   d'exception (`onboarding.preseed_exception.card`), `structural_budget {used:0, cap_reached:false}`.
2. **Les 8 fournisseurs** (`HL_CARD_PROVIDER_CATALOGUE`, `hl-card-types.ts:86-97`) et l'ÉCRIVAIN de
   leur précondition — aucun n'est un `@Post` joueur :

| code | fournisseur | précondition | seul écrivain (hors `_test`/semis) |
|---|---|---|---|
| 101 | DAMAGED_BUILDING_REPAIR | `building_operational_state.structural_state='damaged'` | `RaidExecutionService`, balayage de l'ordonnanceur (`app.module.ts:384`, `citysim/scheduler/city_sim_system.ts:124`, `city_sim_scheduler.service.ts:230`) |
| 102 | SEVERED_ROUTE_REBUILD | `route.state='severed'` | balayage DD-SEVER de l'ordonnanceur (`city_sim_system.ts:469`, `city_sim_scheduler.service.ts:538`) |
| 103 | ESCALATION_BACKLOG_REVIEW | ≥ `hl_escalation_backlog_min` cartes `escalated` (**défaut 3**, `core-loops-tunables.ts:462-465`) | `POST /v1/exceptions/:id/resolve` method `ESCALATE` — **action joueur**, mais plafonnée à 1 (mesuré) |
| 104 | AUTONOMY_REPORTS_PENDING | `autonomy_reports` non résolu | `AutonomyReportRepository.insertReport` appelé par le SEUL `autonomy-report.producer.ts:77` (producteur d'évènement) |
| 105 | LEGAL_CASE_DECISION | `legal_case.status='active'` | `legal-case.repository.ts:124` (chaîne chaleur/police), aucun `@Post` joueur qui ouvre une affaire |
| 106 | BACKPRESSURE_CRITICAL_TRACE | `supply_node_pressure` au seuil `critical` | `supply-node-pressure.repository.ts:245` (`BackpressureUpdateService`, tick) |
| 107 | MYCELIAL_STRESSED_LEG | `supply_chain_legs.debt_load` au-delà du seuil | `leg.repository.ts:77` `upsertThroughput` — SEUL écrivain, appelé par `LegAccrualService` à l'ARRIVÉE d'une livraison ; le passage « stressé » est l'éval NOCTURNE (`city_sim_system.ts:930`) |
| 108 | CUE_CASCADE_FALLOUT | exceptions `pending` portant `candidate_actions[].source` = marqueur cascade | `cue-cascade-exception-producer.service.ts` (producteur d'évènement) |

3. **La seule voie joueur (103) mesurée jusqu'au bout** (`mesures/12-productibilite-juge4m2_5.txt`) :
   open → file 1 carte → `POST /v1/exceptions/<id>/resolve {"method":"ESCALATE"}` → `{"resolved":true,
   "outcome":"ESCALATED"}` → `GET /v1/exceptions/escalations` → `total escalated = 1` →
   `POST /v1/session/close` → `POST /v1/session/open` FRAIS (c'est la seule ouverture qui recalcule,
   `hl-card.service.ts:12-13`) → **`hl_card = None`, file = 0**. 1 < 3 : la carte ne naît pas, et la
   file est désormais vide (aucune route joueur ne crée une exception).

⇒ Conséquence déclarée : **`hl_card` non nul, et les issues 200 de `commit` (`executed`, `noted`,
`navigate`, l'arrêt partiel) et le 409 `ALREADY_RESOLVED`, sont DÉDUITS** — de la projection
(`hl-card-projection.ts:115-129`), du constructeur de réponse (`hl-commit-response.ts:23-44`), du
sélecteur de clé (`hl-outcome-i18n.ts:44-57`) et du bundle i18n RÉEL. Tout le reste de B est **mesuré**.

## Défauts (clôture)

**Aucun.** Zéro ligne `● ● –` non consignée, zéro rendu `– ● ●` / `– – ●` non consigné.

## Table de constats — la SEULE table comptée (rien compté ailleurs)

Gravité : **A/B** = ce qu'un joueur perçoit sur les cadres 5/6/7 · **C** = nuance ou état hors portée.
Critère : **DÉJÀ-APPLIQUÉ** = écart assumé du dossier, re-vérifié · **NOUVEAU** = trouvé ici.

| id | grav. | critère | constat | mesure (fichier:ligne / commande) | non vérifié |
|---|---|---|---|---|---|
| C1 | C | DÉJÀ-APPLIQUÉ (TD-938) | `navigate_screen` / `navigate_ids` sont SERVIS, la maquette DESSINE l'issue navigate (grave « Vous filez aux rapports », mot « La carte est tranchée — pas le sujet », ligne-or « Voir » + écran cible) et le front ne les lit **jamais** : pour les 3 fournisseurs de navigation non-rapports (103, 106, 108) le geste servi « Aller les lire » / « Remonter la piste » / « Examiner maintenant » tranche la carte et remonte à l'Accueil sans rien ouvrir. (104 échappe : ④ le route par `lireButton` → `OuvrirLesRapports()`, navigation réelle sans commit.) | servis : `hl-card-types.ts:136-138`, `hl-card.service.ts:270-274` · dessinés : `variantes-textes-8f59cf94.txt:13` · **0 lecture de production** : `git grep -n -E "navigate_screen\|navigate_ids" b56d837e -- 'Assets/**/*.cs'` → 2 lignes de DÉCLARATION (`HlCardClient.cs:21,22`), 1 commentaire, 6 lignes de tests ; `mesures/14-usages-champs-F.txt` → `.navigate_screen usages=0`, `.navigate_ids usages=0` · routage : `HighestLeverageCardController.cs:135` (`EndsWith("AUTONOMY_REPORTS_PENDING")`) | l'issue `navigate` elle-même (non productible) |
| C2 | C | DÉJÀ-APPLIQUÉ (TD-937) | Les **2** phrases du cadre 7 sont sans clé servie et le front n'en rend **aucune** : le préfixe « Rien n'est parti : » et le repli « ça n'a pas pu se faire pour l'instant. ». F rend à la place `.grave` « La carte reste sur la table » + la phrase SERVIE du refus, sinon « La décision n'a pas été prise. » ; sur un arrêt partiel sans phrase servie il rend le préfixe `hl.after_choice.partial_stop` SEUL, « : » retiré. | maquette : `cadre7.html` `.mot-or.rouge`, `variantes-textes:6,7` · aucune clé `hl.*` ne porte ces phrases : `mesures/03-i18n-bundle-cles.txt` (38 clés `hl.*` listées) · front : `ApresGesteHl.cs:60-61,164-166` | quelle erreur les 4 exécutants lèvent réellement en 1re cible ⇒ si `stopped_at_i18n_key` est GÉNÉRIQUE (`error.resource.*`/`error.validation.*` ⇒ `RefusServi.cs:25-35` rend null) le préfixe reste nu |
| C3 | C | DÉJÀ-APPLIQUÉ | `superseded` → 404 « Cette carte n'est plus là. » : vérifié des deux côtés. | back : `hl-commit-plan.ts:45-49` (`superseded` → `HL_CARD_NOT_FOUND`), `error-codes.ts:658-661` (`user_facing_i18n_key: 'error.hl_card.not_found'`) · **404 réel mesuré** : `mesures/06-commit-404-juge4m2_2.json` + `mesures/08-skip-404-juge4m2_3.json` · bundle : `error.hl_card.not_found = 'Cette carte n’est plus là.'` (`mesures/03`) · front : `ApresGesteHl.cs:152-160,173` | la carte réellement `superseded` (non productible) |
| C4 | C | DÉJÀ-APPLIQUÉ (TD-929 b) | `noted` sur la branche STRUCTURELLE est inatteignable en v1 : les codes du catalogue HL sont 101-108, ceux du catalogue structurel vont de **1 à 16** (12 `live`), donc `catalogueStructuralEntryFor` rend toujours `undefined` pour une carte de fournisseur réel. Effet de bord : `structural` est toujours `false`, donc le mot `.coin` est toujours « tactique » et `STRUCTURAL_CAP_EXHAUSTED` est hors d'atteinte. | `hl-card-types.ts:86-97,174-176` · `structural-decision-catalogue.ts:117-171` (codes 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16 ; `live:false` sur 8,12,13,14) · ⚠️ l'en-tête `hl-card-types.ts:12-13,38-41` dit encore « outside the StructuralDecisionType **1-14** range » : **ancre périmée**, le catalogue va à 16 (l'invariant de disjonction tient : 16 < 101) | — |
| C5 | C | DÉJÀ-APPLIQUÉ (08/10) | `POST …/skip` n'a **aucun** CTA : `RequestSkip()` existe, 0 appelant de production. La maquette ne dessine pas le geste ; « Pas maintenant » est retiré. | `git grep -n RequestSkip b56d837e -- 'Assets/**/*.cs'` → `HighestLeverageCardController.cs:95` (commentaire), `:271` (déclaration), `HighestLeverageCardControllerPlayModeTests.cs:267` (test) — **0 site de production** · route 404 mesurée quand même : `mesures/08` | — |
| C6 | C | DÉJÀ-APPLIQUÉ | B⁻ : `target_ref` (ids des cibles) n'est projeté que par son COMPTE (`target_count`) — aucun NOM de cible ; `status` (`active\|committed\|skipped\|superseded`) n'est pas projeté du tout : une carte reportée d'un skip est indistinguable d'une carte fraîche. | schéma : `db/schema/core_loops.ts` table `highest_leverage_cards` — **11 colonnes** (`card_id, player_id, session_ref, decision_type, target_ref, impact_internal, urgency_internal, options, status, surfaced_at, resolved_at`) · projection = **7 clés** (`hl-card-projection.ts:115-129`) ⇒ 4 colonnes jamais projetées + `target_ref` réduit à un compte (`hl-option-table.ts:133-136`) | — |
| C7 | C | DÉJÀ-APPLIQUÉ (« littéraux sans clé ») | **13 des 22** clés que ④/⑤ DÉRIVENT d'un littéral ne sont pas servies par le bundle réel : le client affiche son littéral français (repli COMPTÉ par `Libelle`). Tout l'après-geste de chrome y passe : le `.grave` (3 variantes), la `.ligne-or` et ses 2 sous-lignes, le tampon « TRANCHÉE », la pastille « Déjà tranchée », et les **4** mots du jeton. Les littéraux sont mot pour mot ceux de la maquette ⇒ **aucun écart perçu aujourd'hui**, mais aucune locale ne peut les traduire. | `mesures/04-cles-derivees-vs-bundle.txt` (règle `Slug` recopiée de `Libelle.cs:164-176` ; 22 clés distinctes, 9 servies, 13 absentes, avec `fichier:ligne`) · 2 autres textes n'ont même pas de clé dérivée (littéraux posés en dur, hors `Libelle`, donc INVISIBLES au compteur de replis) : `DecisionDetailScreenController.cs:260` (`"structurelle"`/`"tactique"`) et `:262-264` (la note du zinc) | — |
| C8 | C | NOUVEAU | `options[].projected_consequence` est **servi** et **jeté** : `DecisionOptionDto` ne déclare que `label` (`SessionDtos.cs:16-19`), donc `JsonUtility` écarte le champ en silence ; le front RECONSTRUIT la clé par concaténation `labelCle + ".projected_consequence"` (`HighestLeverageCardController.cs:652`). Aujourd'hui sans effet : la concaténation est identique au champ servi pour **16/16** options et les 16 clés sont servies. Rien côté client ne compare les deux ⇒ un fournisseur qui nommerait sa conséquence autrement que `<label>.projected_consequence` ferait disparaître les deux `.csq4` sans un rouge (`ConsequenceDe` rend `""`, `Visibilites()` retire la rangée). | `mesures/15-derivation-consequence.txt` (16 options des 8 fournisseurs, `OK 16/16`, `servies 16/16`) · `mesures/14-usages-champs-F.txt` → contrôle positif : `.projected_consequence` n'apparaît qu'à `HighestLeverageCardController.cs:652`, **dans une chaîne**, jamais en lecture de champ · garde back existante (clé prescrite vs servie) : `hl-option-table.ts:55-62` | — |
| C9 | C | NOUVEAU | Deux nombres fabriqués côté client, aucun des deux rendu dans les cadres 5/6/7 : (a) `jetonChiffre.text = pris ? "0" : "1"` reconstruit un SCALAIRE depuis la bande `cap_reached` (R2.2) — caché en mode après (`:408`), donc hors cadres 6/7 ; (b) `total` du « Fait pour {n} sur {total} » est `Math.Max(target_count, n)` **plus un plancher `n+1`** quand l'arrêt partiel donnerait `total ≤ n` : un dénominateur que le back ne sert jamais sur `commit`. | (a) `DecisionDetailScreenController.cs:272` ; caché `:408` · (b) `ApresGesteHl.cs:37-47` ; `commit` ne sert pas `target_count` (10 clés : `hl-card-types.ts:125-143`) | (b) non observable : l'arrêt partiel n'est pas productible |

**Comptes LUS DANS CETTE TABLE : A = 0 · B = 0 · C = 9.**

## « Passé à côté ? » — pour l'user (questions, jamais des défauts)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `navigate_screen` + `navigate_ids` (`commit`) | « ton geste t'emmène ICI, sur CES objets » | **utile ici** — c'est la seule chose qui fait que « Aller les lire » / « Remonter la piste » / « Examiner maintenant » tienne sa promesse sur 3 des 8 fournisseurs ; sans elle le geste consomme la carte du jour et rend l'Accueil. La maquette l'a déjà dessinée (`variantes-textes:13`) | **1** |
| Q2 | `status` = `skipped` (colonne B⁻) | « cette carte, tu l'avais mise de côté » | utile ici, petit — une ligne « reportée d'hier » dans le cadre 5 distingue la carte neuve de la carte portée ; aujourd'hui aucune différence visible. Demande un lot back (la colonne existe, la projection ne la porte pas) | 2 |
| Q3 | `surfaced_at` (colonne B⁻) | « depuis quand elle attend » | **pas ici** — la bande d'urgence dit déjà la pression, et un horodatage sur une carte est la porte ouverte à l'horloge figée que `SessionDtos.cs:131-134` interdit déjà pour `opened_game_minute` | 3 |

`stopped_at_error` (code brut) n'est pas une question : c'est de la plomberie, et sa phrase joueur est
déjà servie à côté (`stopped_at_i18n_key`, lookup TOTAL `hl-commit-response.ts:17-20`).

## Lots back suggérés (B⁻ dessiné, forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| L1 | `status` | `highest_leverage_cards` | non dessinée (la maquette n'a pas de ligne « mise de côté ») ⇒ **pas** une forme F : une question produit (Q2) | `core_loops.ts` (colonne `status` `hl_card_status` NOT NULL) vs `hl-card-projection.ts:115-129` (7 clés, pas `status`) |
| L2 | noms des cibles | hors `highest_leverage_cards` (`target_ref` ne porte que des ids) | non dessinés dans les cadres 5/6/7 | `hl-option-table.ts:76-78` (champs `building_ids`/`route_ids`/`leg_ids`/`case_id`) ; aucun nom en base sur cette table ⇒ un lot back avec jointure, consigné DETTE |

Aucun B⁻ **dessiné** ⇒ **aucune forme F ouverte par cet écran**.

## Actions : routes ↔ CTA

| route joueur (`@Post`, `JwtAuthGuard`) | CTA maquette | CTA front | verdict |
|---|---|---|---|
| `POST /v1/session/open` (`session.controller.ts:57-59`) | — (ouverture froide) | `SessionClient.OpenUrl` (`SessionClient.cs:23`) | ✔ |
| `POST /v1/session/close` (`session.controller.ts:76-78`) | — | `SessionClient.CloseUrl` (`:71`) | ✔ hors écran |
| `POST /v1/session/hl-card/:id/commit` (`hl-card.controller.ts:49-51`) | cadre 5 `.g.or` « Mettre en réparation » + `.g` « Laisser en l'état » | `AgirButton` → `RequestCommit(0)` (`:499`), `LaisserButton` → `RequestCommit(1)` (`:502`), saisie accessible → `RequestCommit(OptionDeLaSaisie)` (`:263`) — l'option est TOUJOURS postée (`HlCardClient.cs:51`) | ✔ |
| idem | — | **4e CTA : ⑤ `BoutonLire` (plaque « LES LIRE MAINTENANT », appui long) → `Commit()` sans option ⇒ corps `{}` ⇒ le back lit l'option 1, « prendre acte »** (`DecisionDetailScreenController.cs:683-692,350`; défaut D1 `hl-commit-plan.ts:20`) | hors cadres 5/6/7 (⑤ AVANT le geste, masqué en mode après `:388`) — signalé, non rouvert |
| `POST /v1/session/hl-card/:id/skip` (`:66-68`) | aucun geste dessiné | **aucun appelant de production** | C5, écart assumé |
| ④ « Lire maintenant » (carte 104) | cadre 2 | `lireButton` → `OuvrirLesRapports()` — navigation, **aucun commit** | ✔ CTA sans route du domaine, voulu (table 45) |

Routes du domaine trouvées : **3** joueur (`session/open`, `…/commit`, `…/skip`) + `session/close`
(même module, ne porte pas `hl_card`). Exclues : `GET /v1/admin/players/:id/hl-card`
(`core-loops-admin.controller.ts:440`, rôle `gm`) et `core-loops-test.controller.ts` (`_test`).
`git grep -n -E "hl.?card|hlCard" 35bdd6cb -- 'services/game-back/src/**/*.controller.ts'` → 4 fichiers,
dont 2 exclus. Les deux listes (back / `*Client.cs`) se recouvrent exactement : le client ne construit
que `/v1/session/hl-card/{id}/commit` et `/skip` (`HlCardClient.cs:55,67`).

## Table de couverture complète

`● ` = porté/dessiné/rendu · `○` = reçu mais LOGIQUE (jamais montré) · `–` = absent.

### Les 25 clés de B

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| 1 | `hl_card.card_id` | ● | – | ○ | plomberie : l'id de l'URL de `commit` | `HighestLeverageCardController.cs:214`, `DecisionDetailScreenController.cs:350` |
| 2 | `hl_card.decision_type_key` | ● | ● `.titre` | ● | ✔ | 8/8 clés `decision.type.<KEY>` servies (`mesures/13`) ; `LibellesDecision.Type` `:46-70` ; rendu `:317,335`, `:261` |
| 3 | `hl_card.impact_bucket` | ● | ● `.niveaux`/`.bandes`+pips | ● | ✔ | 3/3 valeurs (`minor\|moderate\|major`, `hl-card-projection.ts:45`) couvertes `LibellesDecision.cs:37,72-83` ; 3 clés servies (`mesures/13`) ; pips `RemplirPips` `:297-318` |
| 4 | `hl_card.urgency_bucket` | ● | ● | ● | ✔ | 3/3 (`low\|elevated\|pressing`, `:47`) `LibellesDecision.cs:38,85-94` ; 3 clés servies |
| 5 | `hl_card.options[].label` | ● | ● 2 `.g` | ● | ✔ | `RendreLesOptions` `:361-390` ; 16/16 clés servies (`mesures/03`) |
| 6 | `hl_card.options[].projected_consequence` | ● | ● 2 `.csq4` | ● *dérivée* | **C8** | champ non déclaré (`SessionDtos.cs:16-19`), clé reconstruite `:652` ; 16/16 identiques (`mesures/15`) |
| 7 | `hl_card.structural` | ● | ● `.coin ♦ tactique` | ● *littéral* | ✔ (mot en dur, C7) | `DecisionDetailScreenController.cs:259-260` ; toujours `false` en v1 (C4) |
| 8 | `hl_card.target_count` | ● | ● (singulier cadre 5 / pluriel cadres 6-7) | ● | ✔ | `hl-card-projection.ts:128,142` ; 5 usages (`mesures/14`) ; branche ICU `one`/`other` `LibellesDecision.cs:65-66` |
| 9 | `structural_budget.used` | ● | ● jeton « pris »/« fermée aujourd'hui » | ● | ✔ | `ApresGesteHl.cs:85` ; mesuré `used:0` (`mesures/02`) |
| 10 | `structural_budget.cap_reached` | ● | ● jeton | ● | ✔ | `ApresGesteHl.cs:84` ; `HighestLeverageCardController.cs:159` |
| 11 | `queue` (longueur) | ● | ● `.ligne-or small` | ● | ✔ | `AppShell.cs:1847` → `FileEnAttente` ; `ApresGesteHl.cs:176-177` ; mesuré `len(queue)=1` (`mesures/02`) |
| 12 | `commit.committed` | ● | ● `.tampon-diag` « TRANCHÉE » + carte désaturée | ● | ✔ (déduit) | `hl-commit-response.ts:29` ; `ApresGesteHl.cs:32,135,137` |
| 13 | `commit.structural` | ● | ● jeton « pris » | ● | ✔ (déduit) | `ApresGesteHl.cs:137` ; inatteignable `true` en v1 (C4) |
| 14 | `commit.outcome` | ● | ● `.grave` (« Vous avez tranché » / « C'est noté ») | ● | ✔ (déduit) | 3 valeurs `executed\|navigate\|noted` (`hl-card-types.ts:118`) ; `ApresGesteHl.cs:130-134` |
| 15 | `commit.executed_ids` | ● | ● `{n}` du mot-or (« pour 2 locaux ») | ● | ✔ (déduit) | `ApresGesteHl.cs:26,39` |
| 16 | `commit.stopped_at_id` | ● | ● (variante 6) | ● | ✔ (déduit) | `ApresGesteHl.cs:29,41,58` |
| 17 | `commit.stopped_at_error` | ● | – | – | plomberie, voulu (D7) | **0 usage** (`mesures/14`) ; la phrase joueur passe par la clé (#21) |
| 18 | `commit.navigate_screen` | ● | ● (variante 13) | **–** | **C1** (TD-938) | 0 usage de production |
| 19 | `commit.navigate_ids` | ● | ● (variante 13 : « `[]` pour les escalades ») | **–** | **C1** | 0 usage de production |
| 20 | `commit.outcome_i18n_key` | ● | ● `.mot-or` | ● | ✔ | `hl-outcome-i18n.ts:44-57` ; 4 clés `hl.outcome.*.executed` + `hl.after_choice.noted` + `…partial_stop` **toutes servies** (`mesures/03`) ; `ApresGesteHl.cs:55-56` |
| 21 | `commit.stopped_at_i18n_key` | ● | ● (variante 6) | ● | ✔ | `hl-commit-response.ts:42` ; `ApresGesteHl.cs:59` ; null si générique (C2) |
| 22 | refus `error.user_facing_i18n_key` | ● | ● (variantes 7, 8, 11, 12) | ● | ✔ **mesuré** | `mesures/06,08,10` ; 3 clés `error.hl_card.*` servies (`mesures/03`) ; `RefusServi.cs:89-97`, `ApresGesteHl.cs:143-169,173` |
| 23 | refus `error.code` | ● | – | ○ | plomberie | `RefusServi.cs:43-76` (lu, jamais montré) ; mesuré `HL_CARD_NOT_FOUND`, `VALIDATION_FAILED`, `JSON_PARSE_ERROR` |
| 24 | refus `details.reason` (`no_option_zero`/`no_target`) | ● | – | – | **passé à côté, plomberie** | `hl-commit-plan.ts:37,58`, `hl-card.service.ts:256` ; mesuré sur `details:{param:…}` des 422 (`mesures/10`) ; le client ne lit que la clé |
| 25 | `skip.skipped` | ● | – | ○ | sans CTA (C5) | `HlCardClient.cs:70-73` |

### Les 7 éléments M non appariés (dessinés, aucune clé B)

| # | élément (cadre) | F | statut |
|---|---|---|---|
| 26 | `.sur` « Ce qu'on peut faire » (5) | ● | ✔ clé SERVIE `accueil.carte.ce_qu_on_peut_faire` (`mesures/04`) |
| 27 | `.niveaux` libellés « Portée » / « Urgence » (5, 6, 7) | ● | ✔ clés SERVIES `accueil.carte.portee`/`.urgence` |
| 28 | `.ligne-or` « Retour à l'accueil » (6, 7) | ● | C7 : clé `accueil.carte.retour_a_l_accueil` **non servie**, littéral identique à la maquette |
| 29 | `.ligne-or small` « Rien d'autre à trancher pour l'instant. » (6) | ● | C7 : clé non servie ; la variante file non vide passe par la clé SERVIE `accueil.file.plusieurs_attendent_encore` |
| 30 | `.jeton-or small` « votre grande décision du jour » + 3 états (6, 7) | ● | C7 : 4 clés `accueil.jeton.*` non servies ; les 3 états de `variantes-textes:10` sont tous implémentés (`ApresGesteHl.cs:77-89`) alors que la maquette n'en dessine qu'un (constat C déjà consigné) |
| 31 | cadre 7 : « Rien n'est parti : » + « ça n'a pas pu se faire pour l'instant. » | **–** | **C2** (TD-937) |
| 32 | variante 9 : `options: []` ⇒ « Rien à faire ici pour l'instant. », AUCUN geste | **–** | **C** : F montre à la place le seul geste « Prendre acte » (`:394`) et aucune phrase. État **inatteignable** : les 8 fournisseurs écrivent 2 options (16/16, `mesures/15`), `insertActive` passe toujours `winner.options` ⇒ le défaut `'[]'::jsonb` de la colonne n'est servi à personne. Compté dans C7/C8 ? **non** : ligne de couverture seule, gravité C, déjà arbitrée côté maquette (C9 de l'examen) |

### Les 3 rendus F sans source

| # | rendu | statut |
|---|---|---|
| 33 | `jetonChiffre` « 0 »/« 1 » (scalaire reconstruit depuis `cap_reached`) | **C9 (a)** — caché dans les cadres 6/7 |
| 34 | `total` du « Fait pour {n} sur {total} » (max + plancher `n+1`) | **C9 (b)** |
| 35 | ⑤ plaque « LES LIRE MAINTENANT » + « appui long — la carte est tranchée ; le sujet, lui, reste à traiter » (littéraux en dur, sans clé, indépendants des options servies) | C — ⑤ AVANT le geste, hors cadres 5/6/7 (signalé dans Actions) |

**Contrôle d'arithmétique : |clés B| = 25 · |éléments M non appariés| = 7 · |rendus F sans source| = 3 ·
somme = 35 = nombre de lignes de la table de couverture.** ✔

## Verdict

**APPROUVÉ** — 0 constat A, 0 constat B (comptes lus dans la table ci-dessus : A = 0, B = 0, C = 9).

Auto-audit : j'ai bien vérifié ce que j'affirme. Les comptes qui décident (25 clés B, 7 M non
appariés, 3 F sans source, 13/22 clés dérivées non servies, 16/16 conséquences identiques, 0 usage de
`navigate_screen`, 0 appelant de `RequestSkip`, 11 colonnes vs 7 clés projetées, 8 fournisseurs et
leurs écrivains) sont tous issus d'une lecture de fichier à la ligne ou d'une commande dont la sortie
est dans `mesures/`, jamais d'un affichage de terminal élidé. Les deux lectures de `X-Server-Build`
encadrent réellement les mesures. Les 6 écarts assumés du dossier ont été re-vérifiés un par un
(C1-C6) et non rouverts ; les 2 constats NOUVEAUX (C8, C9) sont des C, mesurés sans effet perçu
aujourd'hui.

## Annexes

### 1. Routes du domaine — compte et ancres
Voir §Actions. Compte : **3** routes joueur + 1 voisine (`session/close`), 2 exclues (BO `gm`, `_test`).

### 2. Corps réels — `mesures/`
| fichier | ce qu'il porte |
|---|---|
| `docker-ps.txt` | la pile, lecture seule (7 conteneurs, `game-back` *healthy*) |
| `build-avant.txt` / `build-apres.txt` | `X-Server-Build: 35bdd6cb` avant/après |
| `01,05,07,09,11-signup-*.txt` | les 5 comptes jetables (`Idempotency-Key` par signup) |
| `02-open-juge4m2_1-neuf.json` | `POST /v1/session/open` sur compte NEUF : **16 clés**, `hl_card: null` |
| `03-i18n-bundle-cmd.txt`, `03-i18n-bundle-cles.txt` | `GET /v1/i18n/bundle?locale=fr-FR` : 2113 clés servies ; 38 `hl.*`, 3 `error.hl_card.*`, 15 `accueil.carte*/file*` |
| `04-cles-derivees-vs-bundle.txt` | 22 clés dérivées de ④/⑤ → 9 servies / 13 absentes |
| `06-commit-404-juge4m2_2.json` | 404 `HL_CARD_NOT_FOUND` + `user_facing_i18n_key` |
| `08-skip-404-juge4m2_3.json` | 404 sur `skip` |
| `10-commit-422-juge4m2_4.json` | 5 corps : `chosen_option:2` → 422 ; `"0"` → 422 ; champ inconnu → 422 ; `{}` → 404 (le corps vide est licite) ; `null` → 400 |
| `12-productibilite-juge4m2_5.txt` | escalade réelle → 1 escalated → close → open frais → `hl_card = None` |
| `13-cles-decision-bundle.txt` | 8/8 `decision.type.<KEY>` + 6/6 bandes servies |
| `14-usages-champs-F.txt` | usages non commentés des 10 + 7 + 2 champs, avec contrôle positif ET négatif |
| `15-derivation-consequence.txt` | 16/16 conséquences dérivées == servies |

### 3. Valeurs possibles par clé, avec la contrainte source
- `outcome` : `executed \| navigate \| noted` — union TS `hl-card-types.ts:118`.
- `impact_bucket` : `minor \| moderate \| major` — `hl-card-projection.ts:45`, coupures `:51-55` (<0,4 / [0,4;0,7) / ≥0,7, `[PROV-Y26Q2]`).
- `urgency_bucket` : `low \| elevated \| pressing` — `:47`, coupures `:59-63`.
- `decision_type_key` : 8 clés HL (`HL_CARD_PROVIDER_CATALOGUE` 101-108) ∪ 16 clés structurelles (codes 1-16) ∪ `'UNKNOWN'` (branche défensive `hl-card-projection.ts:96`).
- `structural` : booléen, `true` iff le code est `live` dans le catalogue structurel ⇒ **toujours `false`** en v1.
- `target_count` : entier ≥ 0 — règle par code `hl-option-table.ts:124-136` (liste / scalaire / navigation ⇒ 0).
- `status` (en base, non projeté) : `pgEnum('hl_card_status', ['active','committed','skipped','superseded'])`.
- refus de `commit` : `HL_CARD_NOT_FOUND` 404 · `HL_CARD_ALREADY_RESOLVED` 409 · `HL_CARD_NOTHING_TO_ACT_ON` 409 (`details.reason` ∈ {`no_option_zero`,`no_target`}) · `VALIDATION_FAILED` 422 · `STRUCTURAL_CAP_EXHAUSTED` 409 (branche structurelle, inatteignable) · l'erreur propre de la 1re cible — `error-codes.ts:658-678`, `hl-card.controller.ts:46-48`.

### 4. Inventaire M (cadres 5/6/7 + variantes) → ce que ça représente
Lignes 1-11 et 26-32 de la table de couverture ; source : `cadre5.html`/`cadre6.html`/`cadre7.html`
découpés du master `8f59cf94` (8 `<div class="cadre">` dans la page, indices 0-7 ; 5 = « carte de tête
au-dessus d'une ligne de file haute », 6 = « APRÈS-geste … executed, 2 locaux », 7 = « ÉCHEC DE LA 1re
CIBLE ») et `reference/variantes-textes-8f59cf94.txt` (13 variantes d'issues sans cadre).

### 5. Inventaire F (champ → sites → classe)
`mesures/14-usages-champs-F.txt`, champ par champ avec `fichier:ligne`. Classes : **RENDU** 1-16, 20-22
(hors 17-19) · **LOGIQUE** `card_id`, `error.code`, `skipped` · **IGNORÉ** `stopped_at_error`,
`navigate_screen`, `navigate_ids`, `options[].projected_consequence`, `details.reason`.
Chaîne de montage vérifiée (aucun geste mort) : `HighestLeverageCardController.OnApresGeste`
(`:245`) → abonné `AppShell.cs:1848-1853` → `DecisionDetailScreenController.AfficherApresGeste`
(`:381-412`).

### 6. Non vérifié
1. **La carte non nulle** et les 4 issues 200 de `commit` : non productibles par une action joueur sur
   compte neuf (§ dédié). La mesure qui trancherait : un semis direct en base ou une route `_test` —
   tous deux interdits par le dossier. Épingle à imiter si on veut figer le contrat sans semis :
   l'ensemble de clés de `tutorial_overlay_session_open_non_regression.spec.ts:177-187`.
2. **Quelle erreur les 4 exécutants lèvent en 1re cible** ⇒ si `stopped_at_i18n_key` tombe dans une
   famille GÉNÉRIQUE (`RefusServi.cs:25-28`), le mot d'arrêt partiel reste le préfixe nu (lié à C2).
3. **`error.core_loops.structural_cap_exhausted`** : non cherché dans le bundle — la branche qui
   l'émet est inatteignable en v1 (C4).
4. **L'état `options: []`** (ligne 32) : inatteignable par un fournisseur réel ; non observé.
5. **La lecture « servie » vaut pour `locale=fr`** : le bundle `en` n'a pas été mesuré, donc les
   13 clés absentes de C7 ne sont pas qualifiées pour l'anglais.
6. **Les pixels** : hors mandat (le juge visuel du 11/11 est NON APPROUVÉ, son rapport ne m'a pas été
   fourni et je ne l'ai pas cherché) — les corrections visuelles ne changent aucune clé mesurée ici.
