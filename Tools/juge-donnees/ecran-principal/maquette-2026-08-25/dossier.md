# Dossier du juge données — L'intérieur de district, « le HUD de Brennar » (écran ①, hors canon) — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « l'écran principal » / « l'intérieur de district » / « le HUD de Brennar ». Il n'a PAS d'entrée au canon des 48 écrans (`docs/tech/08_ui_screens/`) — le plus proche par le chrome est `global_conventions_core.md` (TopBar) et par le contenu `screen_2_city_map.md`.
- **Ce qu'on vient y faire** : voir la ville jouée — le district, ses bâtiments et leurs états lumineux (fenêtres ambre = possédé, éteintes = raid/saisie, néon, fumée si activité, alerte si maintenance en retard), avec la barre haute (argent, manomètre de chaleur, jour/heure) — et taper un bâtiment pour ouvrir sa fiche (jugée à part : dossier `fiche-batiment`).
- **Domaine présumé** : `services/game-back/src/session/` (`POST /v1/session/open`), `auth/` (`GET /v1/me`), `economy/` (`GET /v1/economy/wallet`), `citysim/district_interior/` (`GET /v1/city/district/:id/interior` — la route la plus riche), `citysim/heat/` (`…/heat`), `citysim/world/` (`GET /v1/world/districts`), et les 8 autres feuilles `city/district/:id/{cohesion,inspection,flow,stash,leks,throughput,unconformity,buffer}`. Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/hud-brennar.html` — le `.tel` unique (barre haute, médaillon-manomètre, aile droite jour/heure, dock à 4 bulles, la scène du district) ; **exclure le bloc `.fiche`** (ligne ~181), jugé dans le dossier `fiche-batiment` | source HTML/CSS (l'information dessinée) — ⚠️ 8 Mo, data-URI en fin de fichier : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/ecran-principal/ecran-canon.png` (1176×2091) | rendu RATIFIÉ par l'user (commit atelier `5983267` « HUD v3.1 validé user ») |

Lecture des éléments : la scène (bâtiments, fenêtres, néons, fumée) est pilotée par des clés de `…/interior` — chaque état lumineux est une information ; le pied de page de la maquette porte 3 arbitrages encore ouverts (médaillon = horloge ou heat ; dock 4 bulles ou tiroir ; respect/influence) — les traiter comme du DESSINÉ, pas comme des décisions.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire dans le corps, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT (piloté par une suite PlayMode de l'user, corps changeants) — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais, `session/open` octroie un kit de départ (district + bâtiments) ; `GET /v1/city/district/<id>/interior` doit rendre un corps peuplé — chercher le district du joueur dans le corps d'`open` ou via `world/districts`. Les feuilles `cohesion`/`inspection` peuvent rendre 404 sur compte frais : le dire, ne pas conclure « pas de clé ».

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| l'heure `21:40` / « Jour 12 · Soirée » de l'aile droite | `game_minute` est lu puis réduit en jour ; seul `opened_game_day` sort de `session/open` ; `day_phase` existe sur `…/interior` | `session/session.repository.ts:160-165` · `district-interior.controller.ts:87` (à vérifier) |
| le ratio propre/sale sous le solde | le wallet ne porte que `cash_cents` (chaîne) ; aucun ratio | `economy/economy.controller.ts:43` (à vérifier) |
| le manomètre de chaleur (37 %) | le back ne sert que des bandes (`district_bucket`, `citywide_bucket`) — aucun pourcentage | `citysim/heat/heat.controller.ts:51` (à vérifier) |
| les noms de bâtiments sur la scène | `buildings` n'a aucune colonne de nom | `db/schema/` (à vérifier) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
