# Dossier du juge données — La Pile du jour (screen_8 « Cue Stack ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « La Pile du jour » (canon : `docs/tech/08_ui_screens/screen_8_cue_stack.md`, « Cue Stack (daily planning verb) ») + son annexe « Les Séquences » (séquences nommées).
- **Ce qu'on vient y faire** : ordonner les créneaux de la session (4 à 8 : entretien, tournée, exceptions, recrutement), lire ce qui dépend de quoi et ce qui risque la collision, engager la pile d'un tampon ; une fois engagée, la regarder s'exécuter ; au palier 2, enregistrer/appliquer des séquences nommées.
- **Domaine présumé** : `services/game-back/src/core_loops/cue_stack/` (`GET /v1/cue-stack/current`, `POST …/compose`, `…/reorder`, `…/commit` — `cue-stack.controller.ts` ; `GET/POST /v1/cue-stack/named-sequences`, `POST …/:id/apply` — `named-sequence.controller.ts` ; vues `cue-stack.service.ts` `CueStackView`/`CueStackSlotView`, `named-sequence.service.ts` `NamedSequenceView` ; catalogue `slot-type.catalogue.ts` ; bandes `estimated-time-bucket.ts`, `slot-dependency-bucket.ts` ; table `cue_stack` dans `db/schema/queues_exceptions_cuestack.ts`, séquences dans le schéma voisin). Voisinage : `session/open` (le jour), `GET /v1/progression` (le palier qui déverrouille les séquences). Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Pile du jour — à ordonner » (index 14), « … rien à ordonner » (index 15), « … engagée, en cours » (index 16), « … séquences nommées (palier 2) » (index 17) ; CSS propre : bloc `<style>` « SÉRIE 2 : LA PILE DU JOUR » ; annexe « Ce que la Pile du jour fixe » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/pile-du-jour/ecran-canon.png`, `ecran-canon-vide.png`, `ecran-engagee.png`, `ecran-sequences-palier2.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les quatre cadres prétendent tous avoir une clé réelle derrière chaque ligne (aucun cadre « avec lots back » ici) — le cadre 16 dessine des statuts de créneau (`done`, `executing`, `failed_collision`, `pending`) lus dans le domaine fermé du code mais **non observés en vie** ; le cadre 17 dessine l'état palier 2 des séquences nommées, que le compte frais ne peut pas atteindre (403 au palier 1). Les textes français sont des rendus de types et de bandes — le résolveur i18n côté client est à écrire.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais `cue-stack/current` rend `{cue_stack_id:null, state:null, committed_at:null, slots:[]}`. Une pile RÉELLE se compose par la route joueur (`POST /v1/cue-stack/compose`, 4 à 8 créneaux) avec des cibles possédées : les bâtiments du kit de départ (ids dans `GET /v1/city/district/<id>/heat` — trouver le district du kit, probablement 16) pour `MAINTENANCE_BATCH`, un candidat `available` de `GET /v1/recruitment/candidates` (contrôleur `_test` `replenish-saltline` si le bassin est vide, `player_id` via `GET /v1/economy/wallet`) pour `RECRUITMENT_STEP`. Puis `reorder`, `commit`, relire `current`. Les statuts d'exécution exigent le tick : dire ce qui n'a pas été observé. Les séquences nommées rendent 403 au palier 1 : mesurer le refus, lire la forme dans le service, marquer DÉDUIT.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| « un bâtiment à vous », « une tournée », « un candidat » (sans nom) | `target_ref = {kind, id}` — identifiants sans nom, aucune table de noms | `slot-type-executor.interface.ts` (`TargetRef`) — à vérifier |
| les libellés des 4 types et des 3 bandes | rendus FR de `slot_type`, `estimated_time_bucket`, `prerequisite_satisfaction_bucket`, `dependency_conflict_bucket` | `slot-type.catalogue.ts`, `estimated-time-bucket.ts`, `slot-dependency-bucket.ts` — à vérifier |
| « après le 1 » | `dependencies[]` (ids de créneaux) rendus par leur rang | à vérifier |
| « dès le palier 2 » | 403 `NAMED_SEQUENCE_UNLOCK_REQUIRED` (`rule_vocabulary_tier >= 2`) mesuré sur compte frais | `named-sequence.service.ts` — à vérifier |
| les statuts du cadre « engagée » | domaine fermé `CueStackSlotStatus`, **non observés** (tick non exécuté pendant la mesure) | `slot-type-executor.interface.ts` — à vérifier |
| « Composer une pile » (état vide) — le composeur n'est PAS dessiné | le back exige que le joueur compose (4-8 créneaux avec cibles) ; le canon attendait des créneaux fournis — question produit, pas écart de clé | à vérifier |
| après-geste non dessiné | `commit` rend la pile avec `state: committed` ; la maquette passe au cadre « engagée » | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
