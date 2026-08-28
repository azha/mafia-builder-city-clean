# Dossier du juge données — Les Exceptions : la file + le détail (screen_5 « Exception Queue » + screen_5a « Exception Detail ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « Les Exceptions » (la file) et « L'exception » (le détail d'une carte). Canon : `docs/tech/08_ui_screens/screen_5_exception_queue.md` et `screen_5a_exception_detail.md`. Deux écrans, un domaine, un rapport — distinguer les éléments de la file (M-file) de ceux du détail (M-détail).
- **Ce qu'on vient y faire** : lire ce que les lieutenants (ou la ville) remontent parce qu'aucune règle ne couvre la situation, choisir une issue parmi celles proposées — une fois, ou en l'enseignant comme règle, ou en l'escaladant — et vider la file ; consulter les escalades archivées.
- **Domaine présumé** : `services/game-back/src/exceptions/` (`GET /v1/exceptions/queue`, `GET /v1/exceptions/escalations?limit&offset`, `POST /v1/exceptions/:id/resolve` ; projection `exceptions.projection.service.ts` ; les producteurs `*-exception-producer.service.ts`, `raid-exception-producer.service.ts`, `equipment-failure-card.service.ts` ; les gestionnaires `exceptions/effects/*.handler.ts` ; table `db/schema/queues_exceptions_cuestack.ts` `exception_queue`), plus la clé `queue` de `POST /v1/session/open` (`session/`) et le roster `GET /v1/lieutenants` (le rôle de celui qui parle). Le juge vérifie et complète — les bindings d'archétype (`operational/lieutenant/*-binding.ts`) émettent aussi des cartes.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Exceptions — trois cartes en attente » (index 10), « … rien en attente » (index 11), « Exception — le détail d'un raid » (index 12), « Exceptions — avec les lots back L1 + L2 + L3 » (index 13) ; CSS propre : bloc `<style>` « SÉRIE 2 : LES EXCEPTIONS » ; annexe « Ce que les Exceptions fixent » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/exceptions/ecran-canon.png`, `ecran-canon-vide.png`, `ecran-detail.png`, `ecran-avec-lots-back.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les cadres 10, 11 et 12 prétendent avoir une clé réelle derrière chaque ligne (les trois cartes du cadre 10 sont trois producteurs réels du back — raid, chaleur de ville, entassement logistique — avec les bandes que la projection calcule de leurs scalaires) ; le cadre 13 est **par construction** un cadre « avec lots back » — ses ajouts (noms propres, « il y a 3 h », tri par âge, tampon de résolution par lot) n'ont pas de source aujourd'hui : juger 10/11/12 comme la maquette, et 13 comme une proposition de lots. Les textes français sont des rendus de libellés que le back sert en anglais en dur — le résolveur i18n côté client est à écrire.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais, la file porte UNE carte d'amorçage (`onboarding.preseed_exception.card`). Pour une carte de raid ou de chaleur, chercher dans `tests/e2e/` (motifs `raid`, `heat-pressure`, `exceptions/queue`) comment les specs les produisent — contrôleurs `_test` compris ; sinon lire les producteurs pour la forme et le dire. Mesurer `resolve` sur la carte d'amorçage (200, puis 409 au rejeu) et un `method` invalide (le 422 énumère les méthodes).

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| la correspondance issue → `method` du resolve (« Réparer » → `REPAIR`, « Prendre acte » → `ONE_TIME`, règle présente → `ADD_RULE`, « Escalader » → `ESCALATE`) | quand l'issue porte `effect.type`, c'est lui ; sinon rien dans le corps ne relie `candidate_actions[].id` aux méthodes — la table est côté client | `exceptions.projection.service.ts` (`CandidateActionView.effect` optionnel), `exceptions.controller.ts` (`ResolveBody`) — à vérifier |
| le rôle de celui qui parle (« Cuisinier », « Logistique ») | la carte ne porte que `lieutenant_id` ; le rôle vient d'une jointure client avec `GET /v1/lieutenants` (`archetype`) ; le nom n'est projeté nulle part | à vérifier |
| « au bâtiment touché » | `effect.target_building_id`, sans nom | à vérifier |
| le tri « par priorité / gravité / lieutenant » | côté client, sur les bandes ; aucun paramètre de tri ou de filtre sur la route | `exceptions.controller.ts` — à vérifier |
| absence de tri par âge (cadre 10) | `emitted_at` en base, non projeté | `db/schema/queues_exceptions_cuestack.ts` — à vérifier |
| les libellés et conséquences en français | rendus de textes anglais en dur dans les producteurs | à vérifier |
| « Escalades archivées · 1 » | `total` de `GET /v1/exceptions/escalations` | à vérifier |
| après-geste non dessiné | `resolve` rend `{ resolved, outcome }` ; la carte sort de la file | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
