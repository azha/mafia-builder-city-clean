# ㉕ La première fois (le tutoriel) — une maquette autour des données servies (série 6)

> Atelier / DA, 2026-09-23. Commande f2 (GO du 23/09) : ㉕ est le premier écran d'un joueur neuf ; sa seule maquette (série 2, cadres
> 31-32, **ratifiée par délégation le 02/09**, `front.md` l.22) ne dessine aucune donnée servie avec sa source.
> Registres lus : la ratification par délégation (㉕ ET ㉒/⑲) et les arbitrages de fiction
> (`docs/superpowers/plans/2026-09-02-propositions-fiction.md` §6 : copy 6A approuvée, « le texte approuvé prime »). Page : `~/project/atelier3d-mafia/ecrans-brennar-25-tutoriel.html` (atelier `5d7b6d9`), générée par
> `Tools/atelier-2026-09-22/generer-maquette-25-2026-09-23.py`. La génération LIT les textes au back (`FR_MESSAGES`, back `d8e41362`) : aucun
> n'est recopié à la main. Client lu : cumul `e21e0c55` (`Assets/Scripts/Onboarding/TutorialScreenController.cs`). **Aucun rendu** : il passe par f2.

## 1. L'ordre, lu dans le back (pas supposé)

- `next_tutorial_id` ne désigne QUE les 7 tutoriels du **planning**, dans l'ordre des rangs
  (`disclosure-schedule-catalogue.ts:37,44-52`). Au plus **un par session** : `hasShownAnySince(started_at)`,
  `disclosure-schedule.service.ts:72-85`.
- Les 4 tutoriels **08c natifs** passent seulement par `eligible_tutorial_ids`. Leurs déclencheurs sont dans
  `onboarding-overlay.resolver.ts:127-160`.
- **Joueur neuf, 1ʳᵉ session, à l'ouverture** :
  - `eligible_tutorial_ids` contient `tutorial.exception_card.onboarding_preseed` (une carte pré-semée au signup,
    `onboarding-grant.service.ts`, k = 1).
  - **`next_tutorial_id` vaut null**. `queue_runs_dry` exige QUIET_STATE, c'est-à-dire la file vidée après au moins une résolution
    (`onboarding-funnel.repository.ts:107-122`). `cue_stack_intro` exige la 2ᵉ session.
- **Après la première décision** (la carte tranchée, la file vide) : `next_tutorial_id` = **`tutorial.queue_runs_dry`**.
  C'est le premier tutoriel désigné pour un compte neuf.
- **2ᵉ session** : `tutorial.cue_stack_intro`.
- ⚠️ « session » veut dire **session de jeu** (`count(gameplay_session)`), pas le jour de jeu de la barre. Les cadres sont donc titrés par
  session.

## 2. Les quatre cadres

| # | cadre | données |
|---|---|---|
| 0 | 1ʳᵉ session, à l'ouverture : la bulle pointe la carte préparée | `eligible_tutorial_ids`[0] ; texte `tutorial.exception_card.onboarding_preseed` (servi, heurt marqué) |
| 1 | 1ʳᵉ session, la file vidée | `next_tutorial_id` = `queue_runs_dry` ; texte servi |
| 2 | 2ᵉ session, depuis Plus : la page « la première fois » | la bascule (`tutorials_opt_out` = faux), `shown_tutorial_ids` (02), `eligible_tutorial_ids` (01), `next_tutorial_id` = `cue_stack_intro` |
| 3 | le refus | `tutorials_opt_out` = vrai : bascule éteinte, et la phrase du client |

- **« Compris »** est le mot RATIFIÉ (série 2, cadre 31). D14 : il l'emporte sur « J'AI COMPRIS » du client. C'est le seul geste qui écrit
  `shown_tutorial_ids` (`PATCH /v1/ui/tutorial`).
- **« Ne plus rien me montrer »** (client) est au même rang, comme l'exige le client (l.22-24 : « le refus est un droit »).
  ⚠️ Il est **proposé** : la bulle ratifiée de la série 2 n'a qu'un geste.
- **La bascule porte le libellé RATIFIÉ** du Profil (série 6, cadres 95-96, ratifiés par délégation) : **« On vous explique encore »**,
  avec « décochez le jour où vous n’avez plus besoin qu’on vous tienne la main ». Elle est déjà dans le sens du joueur.

## 3. L'inventaire des données servies

| source | champ | dessiné |
|---|---|---|
| `GET /v1/ui/tutorial-state` | `tutorials_opt_out` | cadres 2, 3 (la bascule) |
| | `shown_tutorial_ids[]` | cadre 2 (le nombre) — vide dans le corps réel du compte de démo, donc absent de la 1ʳᵉ mesure (4 champs, pas 3) |
| | `eligible_tutorial_ids[]` | cadres 0 et 2 |
| | `next_tutorial_id` | cadres 1, 2 |
| `POST /v1/session/open`, bloc `onboarding` | `funnel_step`, `first_decision_recorded` | **non**, voir §4 |
| `FR_MESSAGES` | 11 textes `tutorial.*` | 3 dessinés (cadres 0, 1, 2) ; les 8 autres en annexe |

## 4. Passé à côté ? — et ce que le client doit savoir

- **`funnel_step` et `first_decision_recorded`** (session/open) : ils disent où en est le joueur dans son premier jour. Aucune décision
  du joueur n'en dépend, donc ils ne sont pas dessinés. Passé à côté ?
- ⚠️ **Le texte du tutoriel de la 1ʳᵉ carte est la même chaîne que le texte de la carte** : `tutorial.exception_card.onboarding_preseed`
  = `onboarding.preseed_exception.card`, octet pour octet (le générateur le vérifie). La bulle répète la carte au lieu d'expliquer ce
  qu'est une carte. La série 2 ratifiée le faisait (« Ceci est une carte d’exception. Votre lieutenant n’avait pas de règle… ») ; ces mots
  n'ont aucune clé servie. **Question pour le back et l'user** : servir la phrase ratifiée de la série 2 comme texte de ce tutoriel ?
- ⚠️ **Le client affiche l'IDENTIFIANT** (`TutorialScreenController.cs:171-181`, « le texte de ce tutoriel n'est pas encore écrit »).
  Ce n'est plus vrai : **D10-h est close** et les 11 textes sont servis depuis `4a922bc9` (02/09). Le client peut résoudre
  `next_tutorial_id` par le bundle.
- ⚠️ **« Vous avez tout vu. » quand `next_tutorial_id` est null** (client l.164-168) est **faux** dans deux cas :
  - en 1ʳᵉ session, avant la première décision (le planning n'a encore rien désigné) ;
  - après le plafond d'une par session.

  Null veut dire « rien de nouveau pour cette session », pas « fini ». Proposé : « tout vu » seulement si `eligible_tutorial_ids`
  est vide ; sinon « rien de nouveau pour aujourd’hui » (proposé).
- **La bascule est dans le sens du JOUEUR** (commande f2) : « On vous explique encore » (le mot ratifié) est cochée quand
  `tutorials_opt_out` = **faux**. ⚠️ **Inversion pour le client** : bascule allumée ⇔ `PATCH /v1/ui/tutorial-opt-out { tutorials_opt_out: false }`.

## 5. Les heurts du servi — signalés, **non corrigés**

1. **« Lt. Hara » en dur**, dans `tutorial.exception_card.onboarding_preseed` ET `onboarding.preseed_exception.card` (FR et EN).
   **Il y a un doute, donc à f2 de trancher.**
   - Pour « `{nom}` manquant » : les deux cuisiniers du joueur neuf s'appellent `'Lieutenant'` (placeholder TD-046,
     `onboarding-grant.service.ts:453,468`), pas Hara. La carte parle d'un lieutenant que le joueur n'a pas.
   - Contre : c'est la copy **6A approuvée par l'user**, et « Lt. Hara » est un nom CANON (41 occurrences, un personnage récurrent aux
     jours 3 et 6 du même funnel ; `onboarding-grant.service.ts:167-179`).
   - Si `{nom}` : au back, sur ces deux clés exactes. Tant que le grant nomme « Lieutenant », la carte dira « Lieutenant — cuisson du soir
     bloquée… ».
   - L'autre voie : que le grant nomme Hara l'un des deux cuisiniers.
2. **« Il décide seul »** (`tutorial.graduation`) vient des arbitrages de fiction du 02/09 (`propositions-fiction.md:164`, commit `4a922bc9`),
   écrits par le back après le choix 6A, **pas d'une maquette ratifiée** : D13 s'applique, forme épicène. (Si f2 tient ce document pour
   ratifié, les deux mots vont à la liste de l'user.)
   - Proposé : « Un lieutenant a fini son apprentissage. **Désormais, la décision lui revient**, dans le cadre que vous fixez. »
   - L'EN (« They decide alone ») est déjà épicène.
3. **« Un lieutenant est prêt à passer. »** (`tutorial.graduation_eligibility_intro`) : « prêt » s'accorde au masculin. D13 en a retiré
   « prêt » pour le coursier.
   - Proposé : « Un lieutenant **peut passer au grade suivant**. Sa promotion se prépare ici. »
4. **Apostrophes droites** (D10) dans 5 des 11 valeurs FR `tutorial.*` : la maquette les rend en `’` (`normaliser`), le servi reste à passer.

## 6. Les mots proposés (non ratifiés)

Mots RATIFIÉS employés, non soulignés :
- « Compris » (série 2, cadre 31) ;
- « On vous explique encore » et « décochez le jour où vous n’avez plus besoin qu’on vous tienne la main » (série 6, cadres 95-96).

Tous deux sans clé servie à ce jour.


| mot | pour | source |
|---|---|---|
| la première fois | surtitre de la bulle, titre de la page | le client (`TutorialScreenController.cs:250`, « LA PREMIÈRE FOIS », sans clé) ; la maquette ratifiée ⑱ (Plus, série 6, 20-21) n'a pas d'entrée tutoriel |
| Ne plus rien me montrer | le refus, au même rang que « Compris » | le client (l.194, sans clé) ; la série 2 ratifiée n'a qu'un geste |
| vues · à venir | `shown_tutorial_ids`, `eligible_tutorial_ids` (le client écrit « {n} vu(s) · {n} disponible(s) ») | neuf |
| à découvrir | le suivant, sur la page | le client (l.174, « À DÉCOUVRIR ») |
| Vous avez demandé qu’on vous laisse tranquille. | le refus | le client (l.156) |

## 7. À ratifier (user, via f2)

1. La forme : la bulle sur la ville, pointant sa cible ; la page « la première fois » sous Plus ; quatre cadres.
2. Les mots du §6, dont le second geste de la bulle, absent de la série 2 ratifiée.
3. La question de §4 : faut-il une copy qui explique la carte, plutôt que de la répéter ?

## Annexe — les 11 tutoriels servis (3 dessinés, 8 listés)

| clé | disposition | rang | déclencheur (back) | FR servi | EN servi | ici |
|---|---|---|---|---|---|---|
| `tutorial.exception_card.onboarding_preseed` | 08c natif | — | une carte pré-semée dans la file (`hasPreseedCard`, k = 1 au signup) | Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement). | Lt. Hara — tonight’s cook is stuck: out of solvent. Order now (cost) or wait for tomorrow (yield). | cadre 0 |
| `tutorial.queue_runs_dry` | planning | D1_STEP_6 (rang 0) | funnel en QUIET_STATE : la file vidée après ≥ 1 résolution | La file est vide. Rien n'attend votre décision : la ville tourne sans vous. | The queue is empty. Nothing is waiting on your decision: the city runs without you. | cadre 1 |
| `tutorial.cue_stack_intro` | planning | D2 (rang 1) | session n° ≥ 2 (`T.onboard.cue_stack_intro_day`, défaut 2) | La pile du jour ordonne vos consignes. Le premier créneau part en premier. | The day’s stack puts your orders in sequence. The first slot goes first. | cadre 2 |
| `tutorial.daily_review_intro` | planning | D3 (rang 2) | session n° ≥ 3 ET un élément signalé en attente | Chaque matin, la Revue liste ce qui a dévié de la routine. Tranchez, ou laissez. | Every morning, the Review lists what strayed from the routine. Decide, or let it be. | annexe |
| `tutorial.city_map_heat_intro` | planning | D4 (rang 3) | session n° ≥ 4 | La carte montre la chaleur par îlot. Plus c'est chaud, plus la police regarde. | The map shows the heat block by block. The hotter it is, the closer the police look. | annexe |
| `tutorial.audit_pin_intro` | planning | D5 (rang 4) | jamais : `eligible: false` au catalogue | Un audit est épinglé sur ce bâtiment. Ses comptes seront relus. | An audit is pinned on this building. Its books will be gone over. | annexe |
| `tutorial.graduation_eligibility_intro` | planning | D6 (rang 5) | un candidat à la promotion | Un lieutenant est prêt à passer. Sa promotion se prépare ici. | A lieutenant is ready to move up. Their promotion is prepared here. | annexe |
| `tutorial.possibility_horizon_intro` | planning | D7 (rang 6) | un événement de promotion | L'horizon montre ce que vos lieutenants peuvent apprendre ensuite. | The horizon shows what your lieutenants can learn next. | annexe |
| `tutorial.graduation` | 08c natif | — | un événement de promotion | Un lieutenant a fini son apprentissage. Il décide seul, dans le cadre que vous fixez. | A lieutenant has finished their apprenticeship. They decide alone, within the limits you set. | annexe |
| `tutorial.compression_week` | 08c natif | — | un événement de compression | Semaine de compression : l'organisation est sous tension. Réduisez, ou encaissez. | Compression week: the organization is under strain. Cut back, or take the hit. | annexe |
| `tutorial.vacancy` | 08c natif | — | jamais : `return false` | Un poste est vacant. Sans titulaire, la routine s'arrête là. | A post is vacant. With no one in it, the routine stops there. | annexe |
