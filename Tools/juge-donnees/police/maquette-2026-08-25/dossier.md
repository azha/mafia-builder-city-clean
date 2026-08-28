# Dossier du juge données — La police : les Inspections + le Commissariat (screen_10 « MIS Inspection Queue » + screen_9 « Precinct View ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « Les Inspections » (la file MIS, par district) et « Les Commissariats » (les six précincts). Canon : `docs/tech/08_ui_screens/screen_10_mis_inspection_queue.md` et `screen_9_precinct_view.md`. Deux écrans, une surface (§S12), un rapport — distinguer M-inspections et M-commissariat.
- **Ce qu'on vient y faire** : lire, district par district, la charge et le régime de la file d'inspection municipale et la forme de ce qui s'y trouve ; déposer un signalement sur un bâtiment ; lire, précinct par précinct, ce que la police croit de vous et l'intensité de ses patrouilles.
- **Domaine présumé** : `services/game-back/src/citysim/inspection/` (`GET /v1/city/district/:id/inspection`, `POST /v1/city/inspection/report` — `inspection.controller.ts` ; projection `InspectionQueueProjection` ; ledger `false-report-ledger.service.ts` ; enums `inspection.repository.ts`, `inspection.service.ts`, `db/schema/false_report_ledger.ts`), `citysim/police_memory/` (`GET /v1/city/precinct/:id/belief`), `citysim/patrol/` (`GET /v1/city/precinct/:id/patrol`), et `citysim/world/` (`GET /v1/world/districts` — le nom des districts). Voisinage à vérifier : `operational/internal_affairs/` (l'achat de renseignement, objet voisin), `operational/enforcement/` (les raids). Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-2.html` — cadres « Inspections — par district » (index 27), « Inspections — aucune file » (index 28), « Commissariat — les six précincts » (index 29), « Commissariat — rien de connu » (index 30) ; CSS propre : bloc `<style>` « SÉRIE 2 : LA POLICE » ; annexe « Ce que les écrans de police fixent » | source HTML/CSS — ⚠️ 4 Mo, data-URI en dernière ligne : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/police/inspections-canon.png`, `inspections-vide.png`, `commissariat-canon.png`, `commissariat-vide.png` (900×1752) | rendus PROPOSÉS — **pas encore ratifiés par l'user** |

Lecture des éléments : les quatre cadres prétendent avoir une clé réelle derrière chaque ligne ; seuls les deux états vides correspondent à des corps observés (404 sur compte frais) — les bandes non vides sont lues dans le code. Les textes français sont des rendus de bandes et d'enums — le résolveur i18n côté client est à écrire.

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT — comptes frais seulement.
- **Seed si nécessaire** : sur compte frais, `inspection`, `belief` et `patrol` rendent **404** (aucune ligne tant que le tick de police n'a pas tourné). Chercher dans `tests/e2e/` (motifs `inspection`, `precinct`, `patrol`, `police_memory`) comment les specs remplissent — contrôleurs `_test` compris (`citysim/*/*-test.controller.ts`) ; sinon prendre la forme dans les projections, marquée DÉDUIT, et mesurer au moins `POST city/inspection/report` sur un bâtiment du kit (ids dans `city/district/16/heat`) — ⚠️ le corps attend `building_id: number` d'après l'interface : mesurer ce que la route accepte réellement.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| « Verge-A », « Dock-Sud » | `name_canonical` de `GET /v1/world/districts` (Dock-Sud : à vérifier qu'il existe) | à vérifier |
| les quatre barres de gravité et d'origine (sur 4 et 6 valeurs) | `severity_distribution` (4 clés) et `type_distribution` (6 clés) en bandes de présence ; la maquette n'en montre que 4 sur 6 par manque de place | `inspection.repository.ts`, `inspection.service.ts` — à vérifier |
| « Seize autres districts : pas de file » | 404 par district ⇒ 18 appels pour dresser la liste | à vérifier |
| « Déposer un signalement » sans lecture payante ni « flood » | la lecture est la surface d'informateur (pas de route de paiement) ; le flood est l'effet `backlash_triggered` de plusieurs dépôts | `false-report-ledger.service.ts` — à vérifier |
| les précincts listés par numéro, sans district | aucune route ne sert la correspondance district → précinct | à vérifier |
| absence d'achat de renseignement, de greffier, de raids récents, d'activité (le canon les veut) | aucune route précinct ne les sert ; le renseignement existant vise les affaires internes | à vérifier |
| les états non vides | non observés — 404 partout sur compte frais | à vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
