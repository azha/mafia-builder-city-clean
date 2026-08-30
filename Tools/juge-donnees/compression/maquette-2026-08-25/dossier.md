# Dossier du juge données — La Semaine de compression (screen_13 « Compression Week Board ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « La Semaine de compression » (canon : `docs/tech/08_ui_screens/screen_13_compression_week_board.md`).
- **Ce qu'on vient y faire** : voir où en est la tension de l'organisation ; quand une semaine de compression s'annonce, l'ouvrir ou la reporter ; quand elle est en cours, lire le tableau de tous les problèmes actifs et dépenser un budget limité de décisions pour les régler, les passer ou les écarter.
- **Domaine présumé** : `services/game-back/src/core_loops/compression/` (`GET /v1/compression/state` — `compression-projection.controller.ts` ; `GET /v1/compression/board`, `POST …/engage`, `POST …/board/problems/:id/decide` — `compression-board.controller.ts` ; `POST /v1/compression/defer` — `compression.controller.ts` ; vues `compression-board.service.ts` `BoardView`/`BoardEntryView`/`DecideOutcome` ; bandes `stress-bucket.ts`, `problem-tier.ts` ; agrégateur `problem-aggregator.service.ts` ; tables `db/schema/demolition_compression.ts` `compression_events` + `compression_problem_entries`, colonne `player_progression_state.compression_week_state`). Voisinage : la clé `compression_glance` de `session/open`, `GET /v1/friction/state`. Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Compression — la semaine s'annonce » (index 19), « … le tableau des problèmes » (index 20), « … au calme » (index 21) ; CSS propre : bloc `<style>` « SÉRIE 2 : LA SEMAINE DE COMPRESSION » ; annexe « Ce que la Semaine de compression fixe » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/compression/ecran-annoncee.png`, `ecran-canon.png` (le tableau), `ecran-canon-vide.png` (au calme) (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les trois cadres prétendent avoir une clé réelle derrière chaque ligne (pas de cadre « avec lots back ») ; seul le cadre 21 (au calme) correspond à un corps observé sur compte frais — les cadres 19 et 20 dessinent des états (`warning`, `active`, un board peuplé) lus dans le code et non observés. Les phrases des problèmes sont des rendus FR de `source_kind` (neuf familles) — le résolveur i18n côté client est à écrire.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais `compression/state` rend `{calm, none, false}` et `board` rend 404. Pour observer une semaine annoncée puis en cours : chercher dans `tests/e2e/` (motif `compression`) comment les specs font monter la tension ou ouvrent un cycle — il existe un `compression-test.controller.ts` (le lire) ; sinon prendre la forme dans les services, marquée DÉDUIT, et mesurer au moins les refus (`engage` sans cycle → 404, `defer` sans cycle → 404, `decide` sans board → 404).

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| les phrases des neuf familles de problème | rendus FR de `source_kind` (varchar, domaine tenu par l'agrégateur, pas un pgEnum) | `problem-aggregator.service.ts` — à vérifier |
| « sur un lieutenant / un bâtiment / un tronçon » (sans nom) | `target_ref = {kind, id, …}` — identifiants sans nom | `problem-aggregator.service.ts` (les `targetRef`) — à vérifier |
| « Régler » absent sur certaines cartes | 5 `source_kind` acceptent `resolve` ; les autres n'acceptent que `skip` | `compression-board.service.ts` (`RESOLVABLE_SOURCE_KINDS`) — à vérifier |
| « 2 prises sur 5 » | `decisions_used` + `decisions_remaining` ; le plafond (tunable, défaut 5) n'est pas projeté, la somme le donne | `compression-board.service.ts` — à vérifier |
| absence d'échéance (« 2 jours » du canon) et de descripteur précis | aucune clé de deadline ; la carte ne porte que famille + cible | à vérifier |
| « Report · disponible » / refus du report | `deferral_available` ; `defer` rend `FORCED_ENGAGEMENT` ou `DEFERRAL_EXHAUSTED` | `compression-defer.service.ts` — à vérifier |
| les états « annoncée » et « en cours » | `week_state ∈ none · warning · active` — non observés sur compte frais | `stress-bucket.ts`, `player_progression_state.ts` — à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
