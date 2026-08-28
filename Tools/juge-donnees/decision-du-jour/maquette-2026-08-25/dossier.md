# Dossier du juge données — La Décision du jour (screen_1a « Decision Detail », la HighestLeverageCard) — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « La décision du jour » (canon : `docs/tech/08_ui_screens/screen_1a_decision_detail.md`, « Decision Detail (Highest-Leverage Card) »).
- **Ce qu'on vient y faire** : lire la carte que le serveur a désignée à l'ouverture de session comme « ce qui pèse le plus aujourd'hui » — sa famille, sa portée, son urgence, ses deux issues — puis la trancher (commit) ou la laisser en attente (skip, elle revient à la session suivante).
- **Domaine présumé** : `services/game-back/src/progression/loop10/` (`POST /v1/session/hl-card/:id/commit`, `…/skip` ; projection `hl-card-projection.ts` ; fournisseurs `providers/*.provider.ts` ; table `db/schema/core_loops.ts` `highest_leverage_cards`) et la clé `hl_card` + `structural_budget` + `opened_game_day` de `POST /v1/session/open` (`services/game-back/src/session/`). Voisinage à vérifier : `meta_progression/` (`GET /v1/meta/complexity-budget`, `GET /v1/meta/pressure`) — le canon de l'écran parle d'un budget de complexité. Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Décision du jour — une carte se détache » (index 3), « … rien ne se détache » (index 4) et « … avec les lots back L1 + L2 » (index 5) ; le CSS propre à l'écran est le bloc `<style>` « SÉRIE 2 : LA DÉCISION DU JOUR » ; l'annexe « Ce que la Décision du jour fixe » suit l'annexe de la Revue du jour | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/decision-du-jour/ecran-canon.png` (900×1752), `ecran-canon-vide.png`, `ecran-avec-lots-back.png` | rendus PROPOSÉS — **pas encore ratifiés par l'user** (c'est ce que ce jugement précède) |

Lecture des éléments : le cadre 3 est la version « faisable aujourd'hui » (chaque ligne prétend avoir sa clé dans le corps réel) ; le cadre 4 est l'état `hl_card: null` ; le cadre 5 est **par construction** un cadre « avec lots back » — ses ajouts (le nombre « Trois », « depuis hier », « Salvatore », la ligne-lien vers le lieutenant) n'ont pas de source aujourd'hui et sont là pour montrer ce que deux lots donneraient : juger le cadre 3 comme la maquette, et le cadre 5 comme une proposition de lots (dire si les lots nommés sont les bons, et s'il en manque). Les textes français sont des RENDUS de clés (`decision_type_key`, `hl.option.*`, buckets) — le résolveur i18n côté client est à écrire.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire dans le corps, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT (piloté par une suite PlayMode de l'user) — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais, `session/open` rend très probablement `hl_card: null`. Pour obtenir une carte RÉELLE, chercher comment les specs E2E en produisent (`tests/e2e/` — motif `hl_card`, `hl-card`, `highest_leverage`), y compris via un contrôleur `_test` ou une action joueur qui alimente un fournisseur (un rapport d'autonomie en attente, une escalade, un bâtiment endommagé…) ; sinon dire « corps à vide » et prendre l'ensemble de clés dans la projection, marqué DÉDUIT. Mesurer aussi la FORME des réponses de `commit` et `skip` (et leurs refus 404/409) — sur une carte réelle si obtenue, sinon sur un uuid quelconque.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| le tampon « LES LIRE MAINTENANT » = `commit`, le filet « Laisser en attente » = `skip` — c'est-à-dire **issue A ↔ commit, issue B ↔ skip** | le commit ne prend AUCUNE option (l'id de la carte seulement) ; `options[]` est descriptif (deux clés i18n) ; la correspondance est lue dans le sens des libellés, pas dans un contrat | `progression/loop10/hl-card.controller.ts` + `hl-card-types.ts` (`DecisionOption`) — à vérifier |
| les titres français des huit familles et des seize issues | rendus FR de `decision_type_key` (8 valeurs) et de `hl.option.*` (16 clés) — aucune table i18n back ne les porte | `hl-card-types.ts` (catalogue), `providers/*.provider.ts` (options) — à vérifier |
| « Jour 26 » / « Jour 27 » | `opened_game_day` de `session/open` | `session/session-open-sequence.service.ts` — à vérifier |
| la ligne de budget « libre / aucune prise » | `structural_budget.{used, cap_reached}` de `session/open` ; aucune valeur de plafond n'est projetée (booléen seulement) | idem — à vérifier |
| « Tactique » | `structural: false` — les 8 fournisseurs v1 émettent des codes hors du catalogue structurel | `hl-card-projection.ts`, `hl-card-types.ts` — à vérifier |
| absence de « ce que ça fait », de liens connexes, de projection de confiance par option (le canon les veut) | le corps de `hl_card` ne porte ni effet, ni cible lisible, ni compte, ni confiance par option | projection — à vérifier |
| l'état « structurelle + budget consommé » n'est PAS dessiné | aucun fournisseur v1 n'émet de carte structurelle ; l'état n'est productible que par seed direct en base | `hl-card-types.ts` (commentaire de `catalogueStructuralEntryFor`) — à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
