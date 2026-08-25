# Dossier du juge données — La Revue du jour (screen_11 « Daily Review ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « La Revue du jour » (canon : `docs/tech/08_ui_screens/screen_11_daily_review.md`, « Daily Review — Flag Discipline »).
- **Ce qu'on vient y faire** : à la première session de chaque jour de jeu, lire les signalements que les
  lieutenants ont levés (un jeton de confiance dépensé pour poser une question), les valider ou passer
  outre un par un, et confirmer d'un seul geste la routine qui n'a pas dévié.
- **Domaine présumé** : `services/game-back/src/core_loops/flag_discipline/` (routes `GET /v1/flag-review`,
  `POST /v1/flag-review/:flagId/validate`, `POST /v1/flag-review/:flagId/dismiss`,
  `POST /v1/flag-review/batch-confirm`) et la clé `flag_review` de `POST /v1/session/open`
  (`services/game-back/src/session/`). Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadre 0 « Revue du jour — les signalements » et cadre 1 « Revue du jour — rien à signaler » | source HTML/CSS (l'information dessinée). Le CSS commun est celui d'`ecrans-brennar.html` (doctrine v3.1) ; le CSS propre à l'écran est dans le bloc `<style>` « SÉRIE 2 ». |
| `Tools/juge-visuel/revue-du-jour/ecran-canon.png` (900×1752) et `ecran-canon-vide.png` | rendus PROPOSÉS — **pas encore ratifiés par l'user** (c'est ce que ce jugement précède) |

Lecture des éléments : les noms de lieutenants (Salvatore, Vito Marchetti, Rosa Bellini) sont la fiction
partagée avec la maquette « Famille » ratifiée ; les textes des cartes sont des RENDUS français de ce que
le back sert comme clés i18n (`descriptor`, `flag_reason`) — à classer comme tels.

## Back (B)

- **Stack locale** : montée, dev (`mesures/docker-ps.txt`, 7 conteneurs `mafia-clean-city-*`, Traefik sur
  `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter ni redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open`.
  ⚠️ Le compte de démo `operational_demo@example.test` est **piloté en continu par une suite PlayMode de
  l'éditeur Unity de l'user** (seeder relancé en boucle) : ses corps changent de seconde en seconde et
  passent par des phases vides — **ne pas s'en servir comme référence** ; lectures seulement, si besoin.
- **Seed si nécessaire** : sur compte frais, `GET /v1/flag-review` rend `cards: []`. Pour obtenir une carte
  RÉELLE, chercher comment les specs E2E en produisent (`tests/e2e/core_loops/` — motif `flag`), y compris
  via un contrôleur `_test` s'il en existe un ; sinon dire « corps à vide » et prendre l'ensemble de clés
  dans la projection (`flag-discipline.service.ts`, type `FlagCardProjection`), marqué DÉDUIT.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| Zone A du canon (tendances heat / cohésion / charge routine en buckets) — **non dessinée** | le back ne sert aucune de ces tendances ; le client existant les déclare « mortes, forme A, non simulées » (décision D6 du design W3.U1 C8) | `Assets/Scripts/Shell/DailyReviewScreenController.cs:10-14` (à vérifier) |
| `routine_pending_count` dessiné comme un **entier** (« 17 routines », « · 17 » sur le tampon) | le back sert l'entier, pas le `RoutineLoadBucket` du canon | `flag-discipline.service.ts:291-294` |
| Textes des cartes (« Réacheminer la tournée 7 », « Le nouveau trajet passe… ») | rendus FR de `descriptor.{key,params}` et `flag_reason.{key,params}` — le résolveur i18n côté client est à écrire | `flag-discipline.service.ts:70-80` |
| « J11 » / « J12 » | `flagged_game_day` | idem |
| Chip « Confiance · normale / élevée / faible » | `trust_budget_bucket` ∈ {low, standard, high} | idem + `FlagConvergenceService` |
| Sous-titre « Jour 12 » | `opened_game_day` de `session/open` | `session.controller.ts:56` |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`) ;
- les rapports de juges précédents (visuels ou données), et le rapport de confrontation du jour ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
