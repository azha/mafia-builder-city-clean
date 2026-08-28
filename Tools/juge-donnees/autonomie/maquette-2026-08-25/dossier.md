# Dossier du juge données — La Boîte d'autonomie (screen_c7 « Autonomy Inbox ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « La Boîte d'autonomie » (canon : `docs/tech/08c_remaining_screens/screen_c7_autonomy_inbox.md`).
- **Ce qu'on vient y faire** : lire ce que chaque lieutenant a refusé de faire faute d'autonomie et trancher, point par point, entre les deux options qu'il soumet (A ou B), avant que l'arriéré n'atteigne le plafond où l'option A s'applique seule.
- **Domaine présumé** : `services/game-back/src/operational/lieutenant/autonomy/` (`GET /v1/autonomy-reports`, `POST /v1/autonomy-reports/:reportId/issues/:issueId/resolve` — `autonomy-reports.controller.ts` ; projection `autonomy-reports.projection.ts` ; paires d'options `option-pairs.ts` ; catégories `autonomy-category.ts` ; producteur `autonomy-report.producer.ts` ; gestionnaires `option-handlers/` ; plafond `lieutenant-tunables.ts` `backlogCapCycles`), plus le roster `GET /v1/lieutenants` (le rôle de celui qui parle) et les routes `…/:id/autonomy/decision` de `lieutenant.controller.ts` (le budget d'autonomie — à distinguer de la boîte). Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Autonomie — deux rapports en attente » (index 24), « … rien en attente » (index 25), « … un rapport qui traîne » (index 26) ; CSS propre : bloc `<style>` « SÉRIE 2 : LA BOÎTE D'AUTONOMIE » ; annexe « Ce que la Boîte d'autonomie fixe » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/autonomie/ecran-canon.png`, `ecran-canon-vide.png`, `ecran-rapport-qui-traine.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les trois cadres prétendent avoir une clé réelle derrière chaque ligne ; les rapports dessinés suivent les paires d'options du code (aucun rapport observé en vie sur compte frais). Les textes français sont des rendus de `label_key`, `category`, `refused_action`, `projected_outcome` — le résolveur i18n côté client est à écrire.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais `autonomy-reports` rend `reports: []`. Pour un rapport RÉEL, chercher dans `tests/e2e/` (motif `autonomy-report`, `autonomy_report`) comment les specs en produisent — contrôleurs `_test` compris ; mesurer alors `resolve` (A puis B, le 409 au rejeu) ; sinon prendre la forme dans la projection, marquée DÉDUIT.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| « Cuisinier », « Logistique » (le rôle de celui qui parle) | le rapport ne porte que `lieutenant_id` ; le rôle vient d'une jointure client avec le roster ; le nom n'est projeté nulle part | à vérifier |
| « il a refusé de cuisiner » | `refused_action` = l'archétype (le producteur y écrit `e.archetype`) | `autonomy-report.producer.ts` — à vérifier |
| les libellés A/B et les quatre bandes de conséquence | `label_key` (clés `autonomy.*`, aucune table i18n back) et `projected_outcome` | `option-pairs.ts` — à vérifier |
| « depuis 1 cycle » / « depuis 3 cycles » + bannière du plafond | `backlog_age_cycles` ; plafond `backlog_cap_cycles` (défaut 3) non projeté, auto-application côté serveur | `autonomy-reports.service.ts`, `lieutenant-tunables.ts` — à vérifier |
| absence d'« Escalader » et de jauge de budget (le canon les veut) | le resolve n'accepte que A ou B ; le budget par catégorie n'a aucune surface joueur | à vérifier |
| après-geste non dessiné | `resolve` rend `{resolved, outcome}` ; le point passe à `decided`, le rapport sort quand tout est tranché | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
