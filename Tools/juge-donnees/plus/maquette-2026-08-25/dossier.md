# Dossier du juge données — Plus (screen_12 « More menu ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « Plus » (l'onglet du dock ; canon : `docs/tech/08_ui_screens/screen_12_more_menu.md`).
- **Ce qu'on vient y faire** : atteindre les destinations qui ne sont pas dans le dock (pile du jour, revue du jour, inspections, commissariats, recrutement, compression, réglages, aide), chacune avec un compteur d'éléments actionnables quand une liste déjà servie le permet.
- **Domaine présumé** : aucun module propre — l'écran dérive ses compteurs de listes servies ailleurs : `GET /v1/cue-stack/current` (`core_loops/cue_stack/`), la clé `flag_review` de `POST /v1/session/open` (`session/`) et `GET /v1/flag-review` (`core_loops/flag_discipline/`), `GET /v1/recruitment/quests?status=active` (`operational/recruitment/`), `GET /v1/compression/state` + `board` (`core_loops/compression/`), `GET /v1/city/district/:id/inspection` (`citysim/inspection/`). Le juge vérifie et complète — et dit pour chaque compteur dessiné quelle liste le porte, et quel coût (nombre d'appels).

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Plus — les destinations » (index 22) et « Plus — semaine de compression en cours » (index 23) ; CSS propre : bloc `<style>` « SÉRIE 2 : PLUS » ; annexe « Ce que « Plus » fixe » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/plus/ecran-canon.png`, `ecran-compression-active.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : chaque compteur prétend être le cardinal d'une liste réelle ; les sous-lignes en mots sont des rendus des mêmes clés. Le back-office (réservé au personnel) n'est pas dessiné.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais toutes les listes sont vides (compteurs à 0) ; ce n'est pas gênant pour les clés — dire ce qui n'a pas été observé peuplé.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| « 5 créneaux à ordonner » | cardinal des `slots` à `status = pending` de `cue-stack/current` | à vérifier |
| « 3 signalements à trancher » | `flag_review.pending_review_count` de `session/open` (ou `cards.length` de `flag-review`) | à vérifier |
| « 1 quête en cours » | cardinal de `quests` de `recruitment/quests?status=active` | à vérifier |
| Inspections « sans compteur » | la file est servie par district ⇒ 18 appels pour un badge, non dessiné par choix | à vérifier |
| ligne Compression toujours visible (le canon la cache hors semaine active) | `compression/state.week_state` + `stress_bucket` ; en cours : `board.decisions_remaining` | à vérifier |
| Commissariats, Réglages, Aide sans compteur | aucune liste actionnable connue | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
