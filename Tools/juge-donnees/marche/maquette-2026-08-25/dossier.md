# Dossier du juge données — Le Marché, « le patron table » (screen_b1 « Substance Market ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « Marché » (l'onglet du dock ratifié). Canon : `docs/tech/08_ui_screens/screen_b1_*.md` s'il existe — sinon `docs/tech/` (motif `Substance Market`, `screen_b1`).
- **Ce qu'on vient y faire** : voir les lanes (district × substance), leurs prix, la confiance, la tendance, et passer un ordre.
- **Domaine présumé** : `services/game-back/src/operational/market/` (`GET /v1/me/market/lanes/:districtId/:substanceType`), `operational/precursors/` (`GET …/precursors`, `POST …/precursors/order` — le marché des PRÉCURSEURS, objet voisin), `operational/selling/` (dealers). Le juge vérifie et complète — et dit clairement ce qui, dans la maquette, n'a AUCUNE route joueur (pas seulement aucune clé).

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar.html` — cadre « Marché — le patron « table » » (ligne ~306) | source HTML/CSS — ⚠️ 4 Mo, data-URI en fin de fichier : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/marche/ecran-canon.png` | rendu RATIFIÉ par l'user (commit atelier `0881e8a`) |

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire dans le corps, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT (piloté par une suite PlayMode de l'user, corps changeants) — comptes frais seulement.
- **Seed si nécessaire** : la route de lane exige un couple (district, substance) — prendre le district du kit de départ et les valeurs de substance lues à la source (enum). Si le corps ne porte qu'une bande sur compte frais, le dire et lire les écrivains de `lane_pricing_state`.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| la LISTE des lanes | aucune route d'énumération ; le back exige le couple (district, substance) | `operational/market/market.controller.ts:60` (à vérifier) |
| prix, tendance, carnet, passage d'ordre | `lane_pricing_state` : seul `lane_confidence_bucket` est projeté ; aucun carnet d'ordres, aucune route d'ordre côté substances | idem (à vérifier) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
