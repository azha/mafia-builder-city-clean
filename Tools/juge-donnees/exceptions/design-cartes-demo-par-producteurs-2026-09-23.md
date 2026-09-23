# DESIGN v6.1 — les cartes d'exception de démo naissent des producteurs de production (2026-09-23)

Statut : **v6, réponse à la revue ⊥ n°5 (§ 13 : 1 BLOQUANT — la propagation est scopée au JOUEUR, pas à `lab2` ; 1 IMPORTANT — les écrivains de `buildings.heat` ; 1 MINEUR) et au verdict du back `f87301bd` (`heat-inject` = chemin de production après l'émission ; magnitude `MICRO` pour imiter une cuisson) — la précondition d'ouverture est LEVÉE** ; v5 était la réponse à la revue ⊥ n°4 (§ 12 : 1 BLOQUANT — la chaleur est hors de portée par la production, pour H ET pour P ; 1 IMPORTANT)** — **PRÉCONDITION D'OUVERTURE : verdict du back sur `_test/citysim/heat-inject`** ; v4 répondait à la revue ⊥ n°3 (§ 11 : 1 BLOQUANT neuf — la chaleur de `lab2` —, 1 IMPORTANT, 2 MINEURS)** ; v3 répondait à la revue ⊥ n°2 (NOT_APPROVED : 1 BLOQUANT neuf, 1 IMPORTANT, 3 MINEURS ; les 11 de la revue n°1 refermés)** — tables de réponse au § 9 (n°1) et au § 10 (n°2).
Plan d'origine : `plan-cartes-demo-par-producteurs-2026-09-23.md` (`a550891f`, décision `e4f6c330`). Verdict du back sur
`_test/citysim/raid` : recevable pour le seeder de démo (`back.md`, S6-h ; TD-692 corrigé).

## 0. Invariants
1. **`demo_capture@example.test` (compte GELÉ) n'est touché par RIEN dans ce lot.** Preuve : `scripts/empreinte-compte.sh
   demo_capture@example.test` (back, lecture seule) AVANT tout run et APRÈS le dernier ; sorties collées, IDENTIQUES.
2. **Garde de gel inchangée** (v1 la durcissait : retiré, cf. § 9 n°7). Les runs de ce lot se font `env -u MAFIA_SEED_IDENTIFIER
   -u MAFIA_SEED_PASSWORD -u MAFIA_SEED_ALLOW_FROZEN -u MAFIA_CAPTURE_* -u MAFIA_DEMO_*` : le seeder ne peut semer que son défaut,
   `operational_demo@example.test`. Le chemin réel d'écriture de `demo_capture` est MESURÉ (M0b) et proposé au back, pas tranché ici.
3. **Plus aucune carte écrite à la main** : `insertCard` et son `INSERT INTO exception_queue` disparaissent. Temps accéléré par
   `_test/citysim/advance`, raid émis par `_test/citysim/raid` (recevable). Les scripts de lieutenant s'attachent par la route RÉELLE.
4. Aucune épingle recopiée : chaque valeur épinglée est RE-MESURÉE sur la carte produite (M4), citée avec sa mesure.

## 1. Les trois cartes — ce que le code du back impose (lecture seule, références vérifiées par la revue)
| rôle | producteur | déclencheur | ce qui la rend possible | i18n |
|---|---|---|---|---|
| **R** raid, enseignable `STATE(building_damaged)` | `raid-exception-producer` | `BuildingRaidedEvent` (flush `RAID_EXECUTION` après `_test/citysim/raid`) | un lieutenant `mode=delegated`, `granted_role=executor`, **script VALIDE** (`findDelegatedByAssignedBuilding`), assigné au bâtiment raidé ; son script ne couvre pas `building_damaged` ; aucune carte en attente pour lui | descripteur + libellés servis |
| **H** chaleur du cuisinier, enseignable `EVENT(heat)` | `exception-producer` (salient non couvert, `LIEUTENANT_TICK`) | `cook-binding.ts:234` : `s.events.heat >= band` (`cookHeatHighBand`, défaut **0.5**) et script qui ne couvre pas `(EVENT, heat)` | un COOK délégué à script valide sur un bâtiment `operational_type='lab'` (`COOK_HOST_OPERATIONAL_TYPES = {'lab'}`) | libellés servis ; **descripteur SANS jumeau i18n** (le producteur générique n'en écrit pas) — § 7 |
| **P** pression citoyenne, non liée | `heat-pressure-exception-producer` | `HeatEscalationEvent` HOT/BURNING | le créneau JOUEUR libre (`hasPendingPlayerLevelCard`, partagé avec cue-cascade, backpressure, ambient-drift, random-world) | descripteur + libellés servis |

**Pourquoi H malgré l'anglais résiduel** (§ 9 n°2) : parmi les 14 producteurs, les seuls ENSEIGNABLES sont R (`building_damaged`) et
les cartes « salient » du producteur générique (sans descripteur i18n) ; les 5 autres à descripteur i18n (heat-pressure, cue-cascade,
backpressure, ambient-drift, random-world) ont tous `add_rule_dsl: null`. Le palier 2 exige **2 signaux enseignés DISTINCTS**
(`progression.service.ts:24-32`, K=2 / N=3 ; `extractTaughtSignal`, `exceptions.service.ts:276-279`) ⇒ une carte salient est
INÉVITABLE tant que le back n'ajoute pas le jumeau i18n à `exception-producer`. C'est une dette BACK, datée et routée (§ 7).

## 2. Les deux lieutenants (dédup par lieutenant ⇒ deux)
- **COOK₁ sur `lab`** (le labo raidé, bloc `freeBlock(0)`) → sa SEULE carte possible est **R** : son script COUVRE `(EVENT, heat)` sans
  jamais se déclencher — la couverture se lit sur `(kind, field)` seulement (`scriptCoversSignal`, `lieutenant-tick.service.ts:672-674`),
  le seuil est ignoré. Texte : **`WHEN EVENT(heat,>=,5) THEN PAUSE_OPS @1;`** — compile (aucune
  borne [0..1] dans le compilateur) ; jamais vrai : la chaleur est bornée à [0,1] (`citysim/heat/heat-propagation.service.ts:314`,
  `clamp01`), comparaison numérique directe (`dsl/executor.service.ts:285`). ⇒ l'ordre des ticks (raid avant ou après un `LIEUTENANT_TICK`) ne change plus rien.
- **COOK₂ sur `lab2`**, un SECOND labo : acquis par **`operationalBuilding(blocHorsRayon(), 'lab')` placé APRÈS toutes les autres
  acquisitions du seeder** ; `blocHorsRayon()` (neuf, § 13 n°1) prend le premier bloc libre du district 16 dont la distance de tuile
  (Chebyshev, la même que `tileDistance`, `heat-propagation.service.ts:382-384`) à CHAQUE bâtiment du joueur est > au rayon de
  propagation, et échoue en le disant s'il n'y en a aucun ; le seeder imprime la distance minimale obtenue et ASSERTE bloc ≠ `raidBlockId`. → sa seule carte possible est **H** : son script ne couvre ni `heat` ni
  `building_damaged` et ne peut jamais se déclencher. Texte : **`WHEN STATE(source_has_product,==,true) THEN PAUSE_OPS @1;`** — un champ
  du binding LOGISTICS, ABSENT du snapshot COOK (« every other field stays absent → a false trigger », `cook-binding.ts:105`) : faux
  QUOI QUE porte `lab2` (produit, pureté, précurseurs) et même sans ligne `building_operational_state`. v3 prenait
  `precursor_purity_below_escalation`, inerte seulement tant que `lab2` n'a pas de brindle bas — or v4 FAIT cuisiner `lab2` (ci-dessous) :
  ce champ serait devenu vivant. Palier 1 : `checkTriggerValue` (`dsl/compiler.service.ts:286-329`) n'a pas de palette par archétype ;
  vérifié par la route réelle `validate` (M1), sinon le design s'arrête.
- **La chaleur — LES NOMBRES, puis le MÉCANISME (§ 12 n°1).** Portes : **H** exige `buildings.heat ≥ cookHeatHighBand = 0.5`
  (`lieutenant-tunables.ts:78-80`, lu brut `cook-binding.ts:124`) ; **P** exige un `HeatEscalationEvent`, émis seulement à
  `heat ≥ heatEscalationThreshold = 0.7` (`heat-tunables.ts:64`, émission `heat-propagation.service.ts:335-337`). Sources de production :
  une cuisson injecte `MICRO = 0.02` (`heat-contrib-tunables.ts:58-60`, `INJECTION_DELTA`, `heat-propagation.service.ts:124`) ; la plus
  grosse injection du jeu est `MEDIUM = 0.25` (:127) ; la chaleur DÉCROÎT à chaque tick (demi-vie, `heat-tunables.ts:19-21,71-72`) ; la
  propagation ne part que d'un voisin HOT/BURNING dans le rayon (:312-315), et le seeder place le joueur en district 16, loin des blocs
  chauds (`seed_operational_demo.mjs:~155`). ⇒ **aucun chemin de production déterministe n'atteint 0.5, ni 0.7**. L'affirmation « ville
  BURNING » des v1-v4 est RETIRÉE (jamais mesurée). ⚠️ Une mesure CONTRAIRE existe dans le dépôt — `LieutenantRuleEditorPlayModeTests.cs`
  (commentaire de DelegatedStatus) : « heat ramps 0.1 → 0.35 → 0.60 → 0.85 over 3 ticks » sur ce même compte ; elle contredit l'arithmétique
  des tunables et n'est PAS une source retenue : elle est RE-MESURÉE en M2 (si elle tient, elle dit quelle source existe que les tunables ne
  montrent pas).
  **Mécanisme : `POST /v1/_test/citysim/heat-inject`, `magnitude=MICRO`** (`citysim/heat/heat-test.controller.ts:40`). **Verdict du back
  `f87301bd`** (`back.md`, à côté de S6-h) : après l'émission, c'est le chemin de production — `HeatPropagationService` (`heat-propagation.service.ts:168`,
  qui ne garde que joueur, bâtiment, magnitude). Recompté (revue n°6, n°2) : TROIS abonnés à `onHeatInjection`, dont deux crochets de
  capture de test en mémoire sans écriture (`distribution-test.controller.ts:445`, « listens for ALL » :1838 ; `forensic-test.controller.ts:507`), et l'escalade comme le snapshot COOK se lisent sur `buildings.heat`. `MICRO` (+0.02) = une
  cuisson ; le défaut `LOW_MEDIUM` en vaut 6 : on ne l'utilise pas. **Aucune écriture directe de `heat`.**
  **Les nombres (§ 13 n°2).** Au tick `MINUTE/4`, le tampon est VERSÉ (somme de toutes les injections, `:275-279`) PUIS décru
  (`:281-292`, facteur par minute de jeu `f = 0.5^(1/480) = 0.998557`, demi-vie 8 h, `heat-tunables.ts:76-79`) ; `clamp01` plafonne à 1.
  Le `LIEUTENANT_TICK` (`MINUTE/19`) lit la valeur persistée dans le MÊME tour ⇒ un seul `advance(1)` suffit. Avec `h₀` = chaleur de `lab2`
  MESURÉE et imprimée juste avant (attendue 0 : bâtiment neuf, jamais cuisiné) : `n = ⌈(porte / f − h₀) / 0.02⌉`.
  | porte | `n` à `h₀ = 0` | après flush + décroissance | `n − 1` donnerait | marge |
  |---|---|---|---|---|
  | **H** : `cookHeatHighBand` 0.5 | **26** MICRO | 0.51925 | 0.49928 (sous la porte) | 3.8 % |
  | **P** : `heatEscalationThreshold` 0.7 | **36** MICRO | 0.71896 | 0.69899 (sous la porte) | 2.7 % |
  On injecte `n_P` (36 à `h₀ = 0`, recalculé sur `h₀` mesuré) : il franchit les deux portes. **Porte BORNÉE** : une rafale de `n_P`,
  puis `advance(1)` et lecture de `buildings.heat(lab2)` + de la file, jusqu'à 3 avances ; si la chaleur lue est < 0.7 (flushs réels
  intercalés : la boucle temps réel tourne à `tick.real_seconds_per_game_minute`, 2 s par défaut), UN complément de
  `⌈(0.7 / f − h) / 0.02⌉` MICRO, plafonné à 5 ; plafond total nommé `PLAFOND_MICRO = n_P + 5`. Au-delà, ou si P et H ne sont pas en
  attente après la 3ᵉ avance : échec qui imprime chaleur, nombre d'injections et file. Chaque pas imprime la chaleur.
  **Durées qui en découlent** (à `h₀ = 0`) : `lab2` reste ≥ 0.7 pendant ≈ 19 ticks — un `HeatEscalationEvent` PAR tick (`:333-345`),
  soit ≈ 19 événements — et reste HOT (≥ 0.5, donc SOURCE de propagation) ≈ 252 ticks, ≈ 8 min 24 s réelles à 2 s par minute de jeu.
  **Ce que ces nombres touchent AU-DELÀ de `lab2` (§ 13 n°1)** — la propagation est scopée au JOUEUR (`listBuildings(playerId)`,
  bâtiments `operational` seulement, `heat.repository.ts`), rayon 2 tuiles (Chebyshev), `+0.036` par tick à chaque bâtiment dans le rayon,
  cumulatif (un voisin monte, passe HOT et devient source) : d'où `blocHorsRayon()`. ⚠️ `lab` RESTE dans cet ensemble après le
  raid (revue n°6, n°3, CONTREDITE par le code) : le raid écrit `building_operational_state.structural_state = 'damaged'`
  (`raid.repository.ts:199`), alors que `listBuildings` filtre `buildings.structural_state` (`heat.repository.ts:141`, table
  `city_state.ts:143`) — « DISTINCT de buildings.structural_state city-state » (`operational_chain.ts:53`). `lab` compte donc parmi les
  bâtiments dont `lab2` doit être hors de portée, avant ET après le raid. Et chaque escalade a QUATRE abonnés
  (`git grep onHeatEscalation`) : `heat-pressure` (P, dédup joueur), `patrol.service.ts:163` (attention policière), `cue-stack-disruption
  .service.ts:77` (pile de cues du bâtiment), `mastery-accumulator.service.ts:121` (maîtrise, méta-progression) ; plus le seau de district
  forcé BURNING (Inv 7). Tous relevés AVANT/APRÈS en M2b (e).
  **Les écrivains de `buildings.heat` (§ 13 n°3), énumérés sur le code** : (1) le tick de chaleur (`heat.repository.ts:176`, seul écrivain
  PÉRIODIQUE), nourri par le tampon d'injections, lui-même alimenté par `heat-contrib.service.ts:260` (cuisson, stock, deals — magnitude
  par tunable, ash `LOW_MEDIUM`), `courier-detection.service.ts:845`, `inspection-queue-dispatcher.service.ts:163,197` (`LOW`) et le
  crochet de test ; (2) `raid-exception.repository.ts:78` (`adjustBuildingHeat`, chemin de RÉSOLUTION d'une carte de raid, ± ; pas
  périodique). Aucun ne produit `+0.25` par tick sur `lab` sans émetteur `MEDIUM` actif : la rampe citée par
  `LieutenantRuleEditorPlayModeTests.cs:480-487` n'a pas de source identifiée ⇒ M2 la RE-MESURE en premier (3 `advance(1)` sans
  injection) ; si elle se reproduit, le lot S'ARRÊTE (écrivain inconnu : l'arithmétique ci-dessus serait fausse dans les deux sens) ; sinon
  le commentaire est daté PÉRIMÉ sur place, avec la mesure.
- **Attache obligatoire** (§ 9 n°3) : `behavior_script.valid` vaut `false` par défaut (`db/schema/lieutenant.ts:73`) et le recrutement
  insère `.values({})` ⇒ sans attache, ni R ni H. Route : `POST /v1/lieutenants/:id/behavior-script`.
- Note honnête (§ 9 n°10) : la règle enseignée par R à COOK₁ (`STATE(building_damaged)`) compile (moteur agnostique) mais le snapshot
  COOK ne porte pas ce champ ⇒ elle ne se déclenchera jamais pour un COOK. La carte R sert ici le compte du palier et la file, pas une
  boucle fermée — écrit dans le rapport et dans le commentaire du test.

## 3. Couverture des tests
| test | carte |
|---|---|
| ExceptionQueue **B** : ONE_TIME + 409 au doublon | **P** (`acknowledge`, ONE_TIME : `method-by-action-id.ts:16-18`) |
| ExceptionQueue **B** : ADD_RULE sur H, la règle ENSEIGNÉE arrive sur le script du lieutenant DE LA CARTE | **H** (`pause`) — assertion RÉÉCRITE (§ 10 n°1) : le test lit `GetBands(h.lieutenant_id)` (et asserte que c'est `salient_lieutenant_id` du manifeste), et épingle le **texte complet** de la règle enseignée, re-mesuré en M4 (`WHEN EVENT(heat,>=,<bande>) THEN PAUSE_OPS @100;`, `cook-binding.ts:239`) — jamais la sous-chaîne `PAUSE_OPS`, que les DEUX scripts semés portent déjà |
| ExceptionQueue **B** : `progress_to_next` ≠ LOCKED | P + H — seuil lu dans la sortie réelle |
| ExceptionQueue **C** : des exceptions attendent après B | **R** |
| RuleEditorTier2 : palier 2 | ADD_RULE **H** (`heat`) + ADD_RULE **R** (`building_damaged`) + ONE_TIME **P** = 2 distincts / 3 traités |
| ExceptionQueue **A** | P, H, R ; bandes et méthodes re-mesurées (M4) |

## 4. Étapes, dans l'ordre
**Phase 0 — mesures, dans le créneau, sur `operational_demo` SEULEMENT, AVANT d'écrire toute épingle**
- **M0** : empreinte AVANT de `demo_capture` ; et en lecture seule, ses cartes en attente classées par producteur — balayage jsonb
  (`candidate_actions[*].source = 'HEAT_PRESSURE'`, clé de `event_descriptor_i18n`), comme `exceptions.repository.ts` (§ 9 n°11).
- **M0b** : le VRAI chemin d'écriture de `demo_capture` — qui l'a provisionné, avec quelles variables (journaux, `provision-demo-*`),
  sachant que `provision-demo-riche.mjs:54,100` lit `MAFIA_DEMO_IDENTIFIER` alors que le seeder lit `MAFIA_SEED_IDENTIFIER`. Résultat
  transmis au back, qui décide (§ 9 n°7).
- **M1** : la règle de COOK₂ passe `validate` au palier 1 ; celle de COOK₁ aussi.
- **M2c — faisabilité de `blocHorsRayon()`, AVANT toute écriture** (revue n°6, n°1) : un `SELECT` en lecture seule sur `blocks`
  (`coordinates` jsonb `{x,y}`, propriété du BLOC, `world_geography.ts:57`) et `buildings` : nombre de blocs libres du district 16 à
  Chebyshev > rayon de TOUS les blocs que le décor du seeder occupera (les blocs actuels du joueur + ceux que `freeBlock` prendra, calculés
  dans le même ordre). Imprimé. **Zéro ⇒ le lot s'arrête AVANT d'écrire quoi que ce soit** et demande au back un repli (rayon, ou
  district d'accueil de `lab2`) ; l'assertion du seeder reste, en ceinture.
- **M2 — PORTE, pas relevé** : D'ABORD la rampe citée par `LieutenantRuleEditorPlayModeTests.cs:480-487` (chaleur de CHAQUE bâtiment du
  joueur sur 3 `advance(1)`, sans injection) — si elle se reproduit, arrêt (§ 2, écrivains) ; valeur effective des tunables lus par le
  § 2 (rayon, facteur, demi-vie, seuil, `cookHeatHighBand`, `tick.real_seconds_per_game_minute` : surcharge DB > env > défaut) — un
  écart recalcule `n` ; puis, sous `PLAFOND_MICRO`, `buildings.heat(lab2)` franchit 0.7 (→ P) et un `LIEUTENANT_TICK` la lit ≥ 0.5
  (→ H) ; sinon arrêt ;
  inertie de la règle de COOK₂ : état de `lab2` (production, `delegation_paused`) identique avant/après l'attache et le tick ; et, après
  un ADD_RULE de test, l'état de settling du lieutenant enseigné (fenêtre ouverte, attendue) relevé.
- **M2b — ce que `lab2` et la boucle déplacent réellement (§ 12 n°2)**, `git grep` à l'appui AVANT d'exécuter : (a) le DEUXIÈME labo
  (listes, registres, cartes du joueur) ; (b) le **portefeuille** (achat + conversion de `lab2`) ; (c) les **comptes de bâtiments imprimés et
  assertés par le seeder** (`seed_operational_demo.mjs:668` « N buildings purchased + converted », `opCount` :674) ; (d) l'**horloge** : les
  avances neuves décalent `clockMinute(playerId)`, que 13c lit pour armer la forfaiture et que Phase-21 estampille — toute valeur d'horloge
  épinglée ailleurs est recherchée ; (e) la **chaleur**, relevée AVANT l'injection et APRÈS la dernière avance : la distance de tuile de `lab2` à CHAQUE bâtiment du joueur
  (attendue > rayon, sinon arrêt) ; la chaleur brute ET les bandes PAR BÂTIMENT (`HeatBucket`, `raid_risk`) de TOUS les bâtiments semés —
  le `raid_risk` du `stash` (« healthy control », `seed_operational_demo.mjs:1098-1101`) et le plancher HIGH de `lab` (:1089-1095) nommément ;
  le seau du district 16 et le seau citywide ; les quatre abonnés de l'escalade (patrouille du district, pile de cues de `lab2`, compteurs
  de maîtrise du joueur, carte P) ; toute épingle de ces valeurs dans les tests ; et les classes de test qui ACHÈTENT un bâtiment pour
  `operational_demo` dans le district 16 (un achat à ≤ 2 tuiles de `lab2` pendant sa fenêtre HOT, ≈ 8 min réelles, le mettrait sous la
  propagation) — listées par `git grep` sur la route `building/purchase` — `git grep` sur les comptes de bâtiments/labos du joueur de démo
  (registres, listes, cartes) ; toute occurrence est traitée AVANT d'exécuter.
- **M3** : marge du plafond de roster (5) — le seeder passe de 1 à 2 lieutenants ; maximum SIMULTANÉ de recrues par classe semeuse
  (LieutenantUiExtension, LieutenantTenureInertia, LieutenantRuleEditor…) mesuré ; une classe à 4 simultanés est traitée AVANT.
- **M4** : seeder modifié, à blanc sur `operational_demo` → `GET /v1/exceptions/queue` ; la sortie (bandes, ids, méthodes, clés i18n,
  et les cartes SUPPLÉMENTAIRES éventuelles) est collée dans le rapport : c'est la source unique des épingles.

**Phase 1 — seeder** (`Tools/seed_operational_demo.mjs`)
1. **`lab2`, dans CET ordre (§ 11 n°2, n°3)** : `operationalBuilding(blocHorsRayon(), 'lab')` APRÈS toutes les autres acquisitions ;
   assertion bloc ≠ `raidBlockId` et distance minimale > rayon, imprimée ; son `setup_remaining_ticks=1` + `advance(1)` DÉDIÉS (le nudge de :668-673 est déjà passé) ;
   assertion `conversion_stage='operational'` (PAS de cuisson : la chaleur vient de `heat-inject`, § 2). Tout ceci AVANT l'étape 2 (recrutements), donc
   avant l'étape 13 (raid) et avant les re-pins de l'étape 5.
2. Le recrutement « Phase-20 » se DÉPLACE avant l'étape 13 : COOK₁ sur `lab`, COOK₂ sur `lab2`, chacun + attache de son script (§ 2).
3. Étape 13 inchangée (émission `_test/citysim/raid` + `advance(1)` = flush) → R.
4. Rafale de `n_P` MICRO sur `lab2` puis avance BORNÉE sur sa condition (P ET H dans la file ; `PLAFOND_MICRO`, 3 avances ; § 2) → P, H.
5. **Tout ce qui doit être posé « après la dernière avance » est posé APRÈS l'étape 4** (§ 9 n°6) : 13b (tête de blanchiment DIRTY),
   13c (forfaiture armée) et **Phase-21** (budget `depleted` : `last_refresh_tick` estampillé au tick courant APRÈS la dernière avance,
   fenêtre `refreshIfDue` re-mesurée). Vérifié ligne à ligne ; les motifs périmés sont corrigés (§ 9 n°9 : l'audit de la tenue d'argent
   est en `TWELVE_H/5`, `city_sim_scheduler.service.ts:396` — le motif du re-pin est re-mesuré, pas recopié).
6. `insertCard` ×4 et ses objets SUPPRIMÉS. Contrôle de sortie du seeder (§ 9 n°5) : la file **CONTIENT** P, H, R (identifiés par
   producteur) ; toute AUTRE carte en attente n'est admise que si son producteur figure dans une liste NOMMÉE dans le seeder, établie par
   M4 ; sinon échec qui la nomme.

7. Le **manifeste** du seeder expose les DEUX ids, nommés : `exception_lieutenant_id` = COOK₁ (raid ; nom inchangé — Phase-21 et
   RuleEditorTier2 le lisent) et **`salient_lieutenant_id` = COOK₂** (neuf). RuleEditorTier2 (`ctl.OpenLieutenant(exceptionLtId)`,
   `RuleEditorTier2PlayModeTests.cs:209`) ouvre COOK₁, NOMMÉMENT (commentaire). ExceptionQueue lit les deux (`ExceptionQueuePlayModeTests.cs:208`).

**Phase 2 — tests** (identification par PRODUCTEUR, jamais par `exc_demo_*`)
- Aide partagée neuve (test-support) `CarteDuProducteur(cards, Producteur.Raid | SalientCook | PressionChaleur)` : R par
  `event_descriptor_i18n.key == "exception.raid.card.descriptor"` ; P par une action `source == "HEAT_PRESSURE"` ; H par un
  `label_i18n.key` en `exception.lieutenant_cook.`. Écrite une fois.
- ExceptionQueue A/B/C et RuleEditorTier2 selon le § 3 ; épingles = M4.
- Les autres `exc_demo_*` du dépôt sont des fixtures FABRIQUÉES ou des commentaires : inchangées (listées dans le rapport).

**Phase 3 — la MUTE** (`VuePrincipaleCapturePlayModeTests`, § 9 n°8) — **GATÉE PAR M0** :
- `demo_capture` porte une P en attente ⇒ la MUTE vise P, `candidate_actions[0]`, sans repli sur une autre carte ; mandat ⑨ à jour.
- Sinon ⇒ **aucune édition de la MUTE dans ce lot** ; le trou est écrit (rapport + mandat ⑨) avec sa date et ce design, et routé au
  lot de re-provisionnement (revu par le back).

## 5. Fichiers touchés
`Tools/seed_operational_demo.mjs` ; `Assets/Tests/PlayMode/ExceptionQueuePlayModeTests.cs` ; `Assets/Tests/PlayMode/RuleEditorTier2PlayModeTests.cs` ;
une aide de test neuve (+ `.meta`, GUID prouvé absent) ; selon M2, le commentaire `LieutenantRuleEditorPlayModeTests.cs:480-487` daté PÉRIMÉ ; selon M0, `VuePrincipaleCapturePlayModeTests.cs` et le mandat ⑨ ; le rapport de
clôture. **Aucun fichier de production. Ni `TopBarController` ni `AppShell`** (réservés à CLIENT-2 jusqu'à son ①-6).

## 6. Contrôle, clôture
Typecheck `--tout` 17/17 ; cliquet ; `catalogue-sortie.py` ; Palette. Créneau : M0…M4, puis `EcranExceptions`, la catégorie de
RuleEditorTier2, les classes semeuses de lieutenants, puis la partie 1 complète — VERDICT code=0, aucun 409 de roster. Clôture :
empreintes AVANT == APRÈS, sortie M4, épingles citées avec leur mesure, dette § 7 transmise.

## 7. Dette nommée, datée (2026-09-23) — l'anglais résiduel de H
La carte H (salient COOK) garde son descripteur anglais (« High heat on the assigned building… ») : le producteur générique
`exceptions/exception-producer.service.ts:53-64` n'écrit pas `event_descriptor_i18n`. **Demande au back** : que ce producteur écrive le
jumeau i18n des cartes salient (une clé par signal de binding). Tant qu'elle n'est pas servie, ⑨ montre cette phrase en anglais sur le
compte de démo — c'est la SEULE prose non traduite qui reste des 4 cartes d'origine (R et P sont servies ; H a ses libellés servis).

## 8. Risques
Timing (toute attente bornée sur sa condition) · **fenêtre de SETTLING** : un ADD_RULE ré-attache (`add-rule.handler.ts:34`) et
`attachScript` ouvre une fenêtre de settling sur une révision valide → valide (`lieutenant.service.ts:~538-545`) ; les deux scripts étant
VALIDES avant les tests, chaque ADD_RULE suspend la délégation du lieutenant enseigné — inoffensif sans avance après, mais un état neuf du
compte de démo (écran ⑦) : relevé par M2 · effets de bord de COOK₂ (M2) · second labo lu par d'autres suites (M2b) · roster (M3) ·
cartes supplémentaires du créneau joueur (M4 + liste nommée) · seuils de progression (lus en sortie).

## 9. Réponse à la revue ⊥ n°1
| n° | sévérité | constat | réponse v2 |
|---|---|---|---|
| 1 | BLOQUANT | COOK ⇒ `lab` seulement ; `refinery`/`ashLab` impossibles | second **`lab`** acquis hors du bloc raidé (§ 2, Phase 1.1) |
| 2 | BLOQUANT | H n'a pas de descripteur i18n | H gardée (seule source d'un 2ᵉ signal enseignable) ; prose résiduelle ÉCRITE + dette datée + demande au back (§ 1, § 7) ; M4 ne l'exige plus |
| 3 | IMPORTANT | `valid=false` par défaut : M1 n'est pas ouverte | attache = étape obligatoire, textes exacts, `validate` au palier 1 (§ 2, M1) |
| 4 | IMPORTANT | la porte est `heat ≥ 0.5` | M2 épingle `buildings.heat` de `lab` et `lab2` ; COOK₁ couvre `heat` (§ 2) ⇒ le créneau de dédup de COOK₁ ne dépend plus de sa chaleur |
| 5 | IMPORTANT | « exactement P, H, R » intenable | « contient P, H, R » + liste NOMMÉE des producteurs admis en plus, établie par M4 (Phase 1.6) |
| 6 | IMPORTANT | Phase-21 et les `LIEUTENANT_TICK` | Phase-21 posée APRÈS la dernière avance, fenêtre re-mesurée (Phase 1.5) |
| 7 | IMPORTANT | durcissement sur prémisse non mesurée | durcissement RETIRÉ ; garde inchangée ; runs `env -u` ; M0b mesure le vrai chemin et le back décide (§ 0.2) |
| 8 | IMPORTANT | MUTE rouge sans péremption | Phase 3 GATÉE par M0 ; sinon aucune édition, trou écrit et daté |
| 9 | MINEUR | motif `MINUTE/19` périmé (13c) | re-mesuré (`TWELVE_H/5`), motif corrigé |
| 10 | MINEUR | boucle fermée surpromise | écrit (§ 2, note honnête) |
| 11 | MINEUR | pas de colonne « producteur » | balayage jsonb précisé (M0) |

## 10. Réponse à la revue ⊥ n°2
| n° | sévérité | constat | réponse v3 |
|---|---|---|---|
| 1 | BLOQUANT | B vert sans rien tester : manifeste à un seul id, et `PAUSE_OPS` déjà présent dans les deux scripts semés | manifeste à DEUX ids nommés (Phase 1.7) ; B lit le lieutenant DE LA CARTE H (= `salient_lieutenant_id`) et épingle le TEXTE COMPLET de la règle enseignée (M4) ; « inchangée » retiré (§ 3) ; RuleEditorTier2 ouvre COOK₁ nommément |
| 2 | IMPORTANT | `freeBlock(k)` n'est pas un index stable | `freeBlock(0)` APRÈS toutes les acquisitions + assertion bloc ≠ `raidBlockId` (§ 2) |
| 3 | MINEUR | borne de la chaleur non citée | `clamp01`, `heat-propagation.service.ts:314` (§ 2) |
| 4 | MINEUR | settling ouvert par ADD_RULE sur script valide | § 8 + relevé M2 |
| 5 | MINEUR | ancre `:673` | `:672-674` (§ 2) |
| — | MINEUR (question) | motif d'inertie de COOK₂ | corrigé : pureté du brindle STOCKÉ, `cook-binding.ts:145-149` (§ 2) |

## 11. Réponse à la revue ⊥ n°3
| n° | sévérité | constat | réponse v4 |
|---|---|---|---|
| 1 | BLOQUANT | `lab2` naît à heat 0 : aucun chemin vers H | MÉCANISME nommé : `lab2` opérationnel puis CUISINÉ par la recette exacte de `lab` (production) ; M2 devient une PORTE bornée ; repli `_test/citysim/heat-inject` SEULEMENT avec verdict du back (demandé) ; sinon arrêt (§ 2) |
| 2 | IMPORTANT | `lab2` non opérationnel au recrutement | son `setup_remaining_ticks=1` + `advance(1)` dédiés, assertion `operational`, AVANT l'étape 2 (Phase 1.1) |
| 3 | MINEUR | Phase 1.1 ≠ § 2 | alignés : `freeBlock(0)` APRÈS toutes les acquisitions (Phase 1.1) |
| 4 | MINEUR | inertie de COOK₂ : deux causes possibles | règle CHANGÉE : `STATE(source_has_product)` (LOGISTICS), ABSENT du snapshot COOK ⇒ faux quoi que porte `lab2` — nécessaire puisque `lab2` cuisine désormais (§ 2) |

## 12. Réponse à la revue ⊥ n°4
| n° | sévérité | constat | réponse v5 |
|---|---|---|---|
| 1 | BLOQUANT | chaleur hors de portée par la production (MICRO 0.02, MEDIUM 0.25 max, décroissance, district froid) ; P (0.7) jamais mesurée ; `heat-inject` est le SEUL chemin, sans verdict | les quatre nombres écrits, « ville BURNING » retirée, porte de P mesurée (M2) ; `heat-inject` PRINCIPAL (3 × MEDIUM par tick, boucle bornée) pour H ET P ; **verdict du back = précondition d'ouverture, pas de code avant** ; la mesure contraire du dépôt (rampe à 0.85) est citée et RE-MESURÉE, pas retenue (§ 2) |
| 2 | IMPORTANT | M2b trop étroit | M2b étendu : portefeuille, comptes de bâtiments imprimés/assertés (:668, :674), horloge (13c, Phase-21), bande de chaleur du joueur ; `lab2` ne cuisine plus (moins de déplacement) |

## 13. Réponse à la revue ⊥ n°5 (NOT_APPROVED : 1 BLOQUANT, 1 IMPORTANT, 1 MINEUR) et au verdict du back `f87301bd`
| n° | constat | réponse |
|---|---|---|
| 1 BLOQUANT | la propagation est scopée au JOUEUR ; `lab2` HOT arrose tout bâtiment à ≤ 2 tuiles, en cascade | § 2 réécrit (« sur le joueur ») ; `blocHorsRayon()` remplace `freeBlock(0)` pour `lab2` (distance Chebyshev > rayon à CHAQUE bâtiment, sinon échec) ; durée de source chiffrée (≈ 252 ticks) ; M2b (e) étendue aux bandes PAR BÂTIMENT de tout le décor, `stash` et `lab` nommément, et aux quatre abonnés de l'escalade (patrouille, cues, maîtrise, P), vérifiés sur le code |
| 2 MINEUR | ordre flush → décroissance, marge, `clamp01`, un seul `advance(1)` | § 2 : table des portes, `n = ⌈(porte / f − h₀) / 0.02⌉`, 26 / 36 MICRO à `h₀ = 0`, marges 3.8 % / 2.7 %, `n − 1` sous la porte |
| 3 IMPORTANT | l'écrivain inconnu de `buildings.heat` (rampe `+0.25` par tick) | écrivains ÉNUMÉRÉS sur le code (§ 2) : un seul périodique (le tick), un de résolution (`raid-exception.repository.ts:78`) ; aucune source de la rampe ⇒ M2 la re-mesure EN PREMIER ; reproduite ⇒ arrêt ; sinon commentaire daté PÉRIMÉ |
| back | `heat-inject` = chemin de production ; `MICRO` pour une cuisson ; porte bornée ; aucune écriture de `heat` | précondition LEVÉE ; MEDIUM ×3 remplacé par `n_P` MICRO calculé sur `h₀` mesuré ; `PLAFOND_MICRO = n_P + 5`, 3 avances ; aucune écriture directe (§ 2) |

## 14. Réponse à la revue ⊥ n°6 (APPROVED sous réserve de 3 éditions du document, sans revue n°7)
| n° | constat | réponse |
|---|---|---|
| 1 IMPORTANT | la faisabilité de `blocHorsRayon()` n'est éprouvée qu'en plein semis | **M2c** en Phase 0 : blocs candidats comptés en lecture seule, zéro ⇒ arrêt avant toute écriture, repli demandé au back |
| 2 MINEUR | « un seul abonné » à `HeatInjectionEvent` repris sans recompte | recompté : 3 abonnés, dont 2 crochets de capture de test sans écriture, avec leurs `fichier:ligne` (§ 2) |
| 3 MINEUR | « après le raid, `lab` sort de l'ensemble de propagation » | **CONTREDIT par le code, écrit au § 2** : le raid écrit `building_operational_state.structural_state` (`raid.repository.ts:199`), l'ensemble lit `buildings.structural_state` (`heat.repository.ts:141`) — deux colonnes distinctes (`operational_chain.ts:53`). `lab` RESTE source et cible ; il est donc compté par `blocHorsRayon()` et par M2c |

## 15. Exécution — Phase 0, 2026-09-23 06:35 : M0 fait, **M2c = 0 ⇒ ARRÊT avant toute écriture**
**M0** (06:35:33, avant tout geste du lot) : `empreinte-compte.sh demo_capture@example.test` → horloge 72155, 20 bâtiments,
3 lieutenants, 2 planques, 8 highest_leverage_cards, 1 autonomy_report, 4 cartes non résolues / 6. Cartes classées par producteur
(lecture seule, `BEGIN READ ONLY`) : **une P en attente** (`fa051b50`, `exception.heat_pressure.card.descriptor`, source
`HEAT_PRESSURE`, actions acknowledge/escalate/lay_low) ⇒ la MUTE visera P, `candidate_actions[0]` (Phase 3) ; les autres en attente :
`exc_demo_raid_style`, `exc_demo_teach_idle` (fabriquées, sans jumeau), `onboarding.preseed_exception.card`. Empreinte APRÈS l'arrêt
(06:36:44) : **identique**.
**M2c** (lecture seule, compte `operational_demo`) : **0 bloc libre sur 31** du district 16 à Chebyshev > 2 de tous les bâtiments du
joueur (le meilleur est à 2). C'est GÉOMÉTRIQUE : le district 16 a y ∈ [0,3], x ∈ [0,9], et le joueur occupe x = 0,2,4,6,7,8 sur
y = 0-1. ⇒ **Le lot s'arrête ici, rien n'est écrit** (règle du § 4, M2c).
⚠️ **Constat pour le back** : les coordonnées de bloc sont LOCALES au district (`{x,y}` de 0-9 × 0-7, répétées dans les 18 districts)
et `tileDistance` (`heat-propagation.service.ts:382-384`, `heat.repository.ts:88`) les compare SANS le district. Les bâtiments du joueur
aux mêmes coordonnées locales dans des districts différents sont donc « voisins » (mesuré : `operational_demo` a un bâtiment en (0,0)
dans les districts 1, 11, 13 et 16). La propagation traverse les districts — c'est peut-être voulu, peut-être un défaut : au back.
**Replis possibles, à trancher par le back / f2** : (a) `lab2` dans un AUTRE district, sur un bloc à y ≥ 4 (districts 2-7, 9-14,
17-18) — hors rayon avec la distance d'aujourd'hui ET avec une distance corrigée par district ; exige d'étendre la purge du seeder à ce
bloc ; (b) un rayon plus petit pour ce compte (tunable `T.city.heat_propagation_radius_tiles`, surcharge DB) — touche tout le joueur ;
(c) accepter la propagation et la BORNER (injections minimales, M2b(e) relève tous les bâtiments) — ce que la revue n°5 a refusé.

