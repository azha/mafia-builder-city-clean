# Dossier du juge données — La Famille (screen_3 « Org Chart ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « La Famille » / « l'organigramme » (canon : `docs/tech/08_ui_screens/screen_3_org_chart.md`).
- **Ce qu'on vient y faire** : voir l'organisation — le Don, ses lieutenants, leurs hommes, l'état de chacun (délégation, ancienneté, confiance) — et choisir un lieutenant pour ouvrir sa fiche.
- **Domaine présumé** : `services/game-back/src/lieutenant/` (`GET /v1/lieutenants` — roster —, `GET /v1/lieutenants/:id`), `recruitment/`, et ce que `session/open` et `GET /v1/me` portent sur le joueur lui-même (le Don). Le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar.html` — cadre « Famille — l'organigramme » (ligne ~208) | source HTML/CSS — ⚠️ 4 Mo, data-URI en fin de fichier : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/famille/ecran-canon.png` | rendu RATIFIÉ par l'user (commit atelier `0881e8a` « DOCTRINE UI FINALE (verdicts user) ») |

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire dans le corps, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT (piloté par une suite PlayMode de l'user, corps changeants) — comptes frais seulement.
- **Seed si nécessaire** : le kit de départ donne au moins un lieutenant au compte frais (à mesurer sur `GET /v1/lieutenants`) ; pour un roster plus large, le recrutement réel passe par `recruitment/quests` → `advance` → `hire`. Un roster à un seul membre n'est pas un ensemble de clés « vide » — mais dire ce qui n'a pas pu être observé (équipe, hommes).

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| les noms (Salvatore, Vito Marchetti, Rosa Bellini…) | `lieutenant.name` est en base et n'est pas projeté par le roster | `lieutenant.projection.service.ts:369-378` (à vérifier) |
| la maîtrise (split-flap « mastery ») | `mastery_score` n'a de surface qu'ADMIN | `GET /admin/meta/mastery-distribution` (à vérifier) |
| les « hommes » sous chaque lieutenant | pas de route joueur connue pour un sous-effectif | (à vérifier — peut ne pas exister du tout) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
