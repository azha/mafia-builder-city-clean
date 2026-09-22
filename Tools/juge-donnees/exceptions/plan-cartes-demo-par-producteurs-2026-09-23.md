# Les 4 cartes `exc_demo_*` — qui les consomme, et par quels producteurs de production les faire naître (plan, 2026-09-23)

**Mesure seulement, en lecture ; rien n'est changé.** Lot de demain, avec son contrôle de gel.

## Le défaut (mesuré par le back : E18, E16′)
Les 8 actions sans `label_i18n` et les répliques sans `event_descriptor_i18n` sont toutes sur les 4 cartes du seeder de CE dépôt,
`Tools/seed_operational_demo.mjs:1151-1171` (58ab3d57, 10/06) : `insertCard(…)` en SQL direct (`psql`), prose anglaise, ids d'action
(`teach_heat`, `teach_idle`, `let_ride`, `repair`, `bribe`, `lay_low`) absents de `METHOD_BY_ACTION_ID`. Ce ne sont pas des cartes du
jeu ; le compte de démo les montre en anglais sur ⑨.
Qui écrit sur quel compte : le seeder vise `operational_demo@example.test` ; mais `scripts/provision-demo-riche.mjs:100` (back) l'exécute
AUSSI pour le provisionnement — c'est par là que les `exc_demo_*` existent sur le compte de CAPTURE (gelé).

## Qui consomme les `exc_demo_*` (git grep, HEAD bb9f0d75)
| consommateur | carte(s) | ce qu'il en attend |
|---|---|---|
| `ExceptionQueuePlayModeTests` A (:303) | les 4, par `event_descriptor` | présence des 4 descripteurs seedés |
| `ExceptionQueuePlayModeTests` A (:316-328) | teach_heat, raid_style | **épingles de bandes MESURÉES** sur la carte seedée (CONFIDENT/HIGH/HIGH vient des nombres du seeder) ; `teach_heat` candidat |
| `ExceptionQueuePlayModeTests` B (:358-384) | one_time, teach_heat | ONE_TIME puis 409 doublon ; ADD_RULE sur teach_heat (le DSL revient sur le lieutenant) |
| `ExceptionQueuePlayModeTests` C (:416) | teach_idle, raid_style restants | la note « des exceptions attendent » |
| `RuleEditorTier2PlayModeTests` (:243-245) | teach_heat, teach_idle (ADD_RULE), one_time (ONE_TIME) | vide la file pour le palier 2 |
| `VuePrincipaleCapturePlayModeTests` MUTE (:1419-1460) | **one_time** | **une seule issue** : toute résolution est celle-là ; le compte de capture perd cette carte (restauré par provision-demo-riche) |
| `ExceptionsTampon/FormeG/Parleur/ExceptionBandesTests`, `I18nCatalogPlayModeTests` | teach_idle / teach_heat | **fixtures FABRIQUÉES** dans le test (corps copié du vivant) — pas de dépendance au seeder |
| commentaires : ExceptionBandes.cs:208, ExceptionDetailController.cs:282, ExceptionQueuePanelController.cs:160 ; juge ⑨ r1 | — | mémoire, pas de dépendance |
Garde de gel du compte de capture : il n'existe pas de garde automatique ; l'instrument est `scripts/empreinte-compte.sh <email>` (back),
qui COMPTE des lignes par table (détecte une purge ou une reconstruction, pas une mutation à compte constant).

## Les producteurs de production (back, lecture seule) — 14 ; 6 portent descripteur i18n + libellés i18n + `method`
heat-pressure, raid, cue-cascade, backpressure, ambient-drift, random-world. Les deux qui recouvrent les 4 cartes :
| producteur | déclencheur | forme de la carte | recouvre |
|---|---|---|---|
| `exceptions/raid-exception-producer` | `BuildingRaidedEvent` (raid exécuté ; planifié en production par `citysim/patrol/patrol.service.ts:337`) | liée au lieutenant délégué ; repair / bribe / lay_low + **une action ENSEIGNABLE** (`add_rule_dsl` `WHEN STATE(building_damaged,==,true) THEN EXECUTE_DEFAULT @100;`) | raid_style ; le rôle « enseignable » de teach_heat/teach_idle |
| `exceptions/heat-pressure-exception-producer` | `HeatEscalationEvent` (`citysim/heat/heat-propagation.service.ts:337`, tick de propagation) | NON liée ; acknowledge / escalate / lay_low, **aucune enseignable** | le rôle « non liée » de one_time — mais **3 issues, pas 1** |

## Ce qui ne tient PAS dans la demande telle qu'écrite
- **« Sans passer par une route `_test` »** : le seeder en appelle déjà deux (`_test/citysim/advance` ×2, `_test/citysim/raid`). Aucun des
  deux déclencheurs n'est DÉTERMINISTE sans elles : le raid de production vient de la patrouille (aléatoire, temps réel), l'escalade de
  chaleur d'un tick réel. ⇒ Proposition : garder l'accélération d'HORLOGE (`advance`) — le déclencheur et la carte sont alors ceux de
  production, seul le temps est accéléré — et ne plus jamais ÉCRIRE de carte à la main. Le `_test/citysim/raid` direct est à décider par
  le back (il émet `RaidPlanned` comme la patrouille : la carte qui en sort est celle du producteur de production).
- **one_time n'a pas d'équivalent à UNE issue** : la capture MUTE résoudrait `candidate_actions[0]` d'une carte heat-pressure (acknowledge),
  déterministe mais plus « sans choix ». À écrire dans son mandat.
- **Les épingles de bandes et les DSL enseignés changent** : A (:316-328) est épinglé sur les nombres du seeder ; B/RuleEditorTier2
  enseignent le DSL de teach_heat/teach_idle. À re-mesurer sur les cartes des producteurs, pas à recopier.

## Plan (demain)
1. **Gel d'abord** : `empreinte-compte.sh <compte de capture>` AVANT, et le seeder modifié ne tourne QUE sur `operational_demo` tant que
   provision-demo-riche n'est pas revu avec le back (il exécute le seeder sur le compte gelé).
2. Seeder : retirer `insertCard` ×4 et le `psql` qui les écrit ; à la place, amener la ville au raid et à l'escalade par l'horloge
   (`advance`) et laisser les producteurs écrire ; attendre les cartes par la route de file (`/v1/exceptions/queue`), bornée.
3. Tests : A trouve ses cartes par PRODUCTEUR (`source`/étiquette) et non plus par `exc_demo_*` ; épingles re-mesurées ; B et
   RuleEditorTier2 enseignent l'action enseignable du raid ; C inchangé sur le fond.
4. MUTE : cible = carte heat-pressure, `candidate_actions[0]` ; mandat du juge mis à jour ; empreinte APRÈS = AVANT moins une résolution.
5. Contrôle : ⑨ ne montre plus aucune prose anglaise sur le compte de démo (garde zéro repli des locataires + E16′/E18 du back).

## Décision de l'orchestrateur (2026-09-23)
Plan approuvé avec ses trois écarts : horloge accélérée (cartes et déclencheurs de production, jamais une carte écrite à la main ;
le `_test/citysim/raid` direct est tranché par le back) ; la MUTE résout la 1ʳᵉ action d'une carte `heat_pressure`, écrit au mandat ;
épingles et DSL enseigné re-mesurés. **Condition** : `provision-demo-riche.mjs` exécute ce seeder sur le compte de capture GELÉ ⇒ le lot
passe par une **revue ⊥ (reviewer neuf, pas l'auteur) AVANT exécution**, et l'empreinte AVANT/APRÈS du compte de capture
(`scripts/empreinte-compte.sh`) est la preuve de clôture.
