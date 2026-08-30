# Dossier du juge données — Le Recrutement (screen_15 « Recruitment ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « Le Recrutement » (canon : `docs/tech/08_ui_screens/screen_15_recruitment.md`).
- **Ce qu'on vient y faire** : voir qui cherche à entrer dans la famille (les candidats, par bassin : Saltline, transfuges, civils), ouvrir une quête de recrutement avec l'un d'eux, la faire avancer une étape par session, et à la fin l'engager (ou abandonner).
- **Domaine présumé** : `services/game-back/src/operational/recruitment/` (`GET /v1/recruitment/candidates?pool=`, `GET /v1/recruitment/quests?status=`, `GET …/quests/:id`, `POST …/quests`, `POST …/quests/:id/advance`, `…/hire`, `…/abandon` ; projection `recruitment-quest.service.ts` `QuestProjection` ; candidats = la ligne `recruitment_candidates` brute ; tables `db/schema/recruitment.ts`), et ce que `session/open` et `GET /v1/lieutenants` portent en voisinage (le jour, les lieutenants existants). Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Recrutement — la rue propose » (index 6), « … personne à la porte » (index 7), « … prêt à engager » (index 8), « … avec les lots back L1 + L2 + L3 » (index 9) ; CSS propre : bloc `<style>` « SÉRIE 2 : LE RECRUTEMENT » ; annexe « Ce que le Recrutement fixe » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/recrutement/ecran-canon.png`, `ecran-canon-vide.png`, `ecran-pret-a-engager.png`, `ecran-avec-lots-back.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les cadres 6, 7 et 8 prétendent avoir une clé réelle derrière chaque ligne (cadre 8 = une quête Saltline à `current_step = final_gated_step`, avec ses trois décisions prises et le formulaire d'embauche qu'exige le corps de `hire`) ; le cadre 9 est **par construction** un cadre « avec lots back » — ses ajouts (les noms propres, la bannière des postes ouverts, « reprend dans 12 h de jeu ») n'ont pas de source aujourd'hui : juger 6/7/8 comme la maquette, et 9 comme une proposition de lots. Les textes français sont des rendus de bandes et de clés (bassin, familiarité, expérience, prétention, décisions d'étape, archétypes) — le résolveur i18n côté client est à écrire.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais, `candidates` et `quests` rendent `[]`. Le bassin est rempli par un tick de nuit (`recruitment-availability-tick.service.ts`) ; pour mesurer un corps peuplé, chercher dans `tests/e2e/` (motif `recruitment`) comment les specs remplissent — il existe un contrôleur `_test` dans le module (le lire) ; le `player_id` du compte se lit dans `GET /v1/economy/wallet`. Ouvrir une quête réelle (`POST …/quests`) et tenter un `advance` pour mesurer la FORME de la réponse et du refus quand la session n'est pas prête. Si une quête ne peut pas être menée jusqu'à `final_gated_step` sans faire avancer l'horloge, le dire — et prendre la forme de `hire` dans le contrôleur, marquée DÉDUIT.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| « Candidat Saltline n°1 » (et n°2, n°4) | `profile.name` est un bouchon côté back (« Saltline Candidate #0 ») ; aucune table de noms | `saltline-recruitment.service.ts` (bloc `profile:`) — à vérifier |
| « pas encore prête — à la prochaine session », sans durée | `session_ready` est projeté ; `next_session_ready_at_game_minute` aussi, mais aucune route joueur ne sert la minute de jeu courante ⇒ le délai n'est pas calculable côté client | `recruitment-quest.service.ts` (`projectQuest`) — à vérifier |
| « prochaine décision : l'approche » | dérivé de `current_step` + le bassin (`opening_line` à l'étape 1 pour Saltline) — la séquence des étapes n'est PAS projetée, elle est lue dans le service | `saltline-recruitment.service.ts` (`stepSequence`) — à vérifier |
| le rôle et le poste du formulaire d'embauche | `hire` exige `archetype` + `assigned_building_id` ; « Entrepôt » est un type, pas un nom (pas de table de noms) | `recruitment.controller.ts` (`HireBody`) — à vérifier |
| les deux bandes rendues par `hire` (qualité de l'embauche, loyauté de départ) — **non dessinées** | état d'après-geste ; la maquette ne dessine pas d'après-embauche | `recruitment.controller.ts` — à vérifier |
| les postes ouverts (cadre 9 seulement) | aucune route « open-positions » | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
