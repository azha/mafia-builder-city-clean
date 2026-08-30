# Dossier du juge données — La fiche de bâtiment (screen_2a « Building Card ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « la fiche » (canon : `docs/tech/08_ui_screens/screen_2a_building_card.md`).
- **Ce qu'on vient y faire** : après un tap sur un bâtiment du district, lire ce qu'il est, ce qu'il rapporte, sa chaleur locale, et agir : COLLECTER, BLANCHIR, AMÉLIORER.
- **Domaine présumé** : `services/game-back/src/operational/real_estate/` (`GET /v1/operational/building/:id`, 23 champs ; `purchase`, `convert`, `upgrade-tier`, `upgrade-hub-tier`, `upgrade-equipment-tier`), `operational/enforcement/` (`repair`), `operational/maintenance/`, `operational/money_holding/` (`deposit-cash`, `withdraw-cash`), `operational/production/` (`lab/:id`, `storage/:id`), `operational/selling/` (`dealer/:id/collect`), `citysim/heat/` (le heat local). Le juge vérifie et complète — notamment QUELLE route porte « collecter » et « blanchir ».

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/hud-brennar.html` — le bloc `.fiche` (ligne ~181 : titre, type, 3 statistiques, 3 actions) et SEULEMENT lui | source HTML/CSS — ⚠️ 8 Mo, data-URI en fin de fichier : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/ecran-principal/ecran-canon.png` (1176×2091) — la fiche est le panneau bas | rendu RATIFIÉ par l'user (commit atelier `5983267`) |

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire dans le corps, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT (piloté par une suite PlayMode de l'user, corps changeants) — comptes frais seulement.
- **Seed si nécessaire** : le kit de départ de `session/open` donne des bâtiments au compte frais — trouver leurs ids (corps d'`open`, `…/interior`, ou `…/heat`) puis `GET /v1/operational/building/:id`. Si certains des 23 champs valent `NONE` à vide, chercher l'action joueur ou le tick qui les remplit, et le dire.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| le nom « LE VERGE D'OR » et « Quartier général » | `buildings` n'a aucune colonne de nom ; le type est un entier | `db/schema/` + `real-estate.projection.service.ts:315-366` (à vérifier) |
| où est le bâtiment (bloc, district) | `block_id` / `district_id` relus puis non projetés | idem (à vérifier) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
