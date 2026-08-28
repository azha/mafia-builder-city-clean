# Dossier du juge données — La fiche de lieutenant + l'ordre permanent (screen_4 « Lieutenant Detail » + screen_4a « Rule Editor ») — maquette — 2026-08-25

## Mode : maquette

## L'écran

- **Nom** : « Salvatore » / « la fiche de lieutenant », avec en dessous « SIGNER L'ORDRE » (le formulaire d'ordre permanent). Canon : `docs/tech/08_ui_screens/screen_4_lieutenant_detail.md` et `screen_4a_rule_editor.md`. Un seul cadre de maquette porte les deux écrans — juger les deux dans le même rapport, en distinguant les éléments de la fiche (M-fiche) de ceux du formulaire (M-ordre).
- **Ce qu'on vient y faire** : lire un lieutenant — loyauté, autonomie, curriculum, probation, veto, bandes de statut, roster, réassignation — puis lui signer un ordre permanent (segmenté Collecte | Blanchir | Surveiller, durée, CTA SIGNER L'ORDRE).
- **Domaine présumé** : `services/game-back/src/lieutenant/` (`GET /v1/lieutenants/:id` — 17 champs —, `POST …/:id/reassign`, `…/:id/behavior-script` + `/validate`, `…/:id/autonomy/decision`, `…/:id/signal-drift/decision`, `…/:id/standing-order` + `/decision`). Le juge vérifie et complète — notamment QUELLE route porte l'ordre permanent de la maquette (`standing-order` ou `behavior-script` ?).

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar.html` — cadre « Lieutenant — fiche + formulaire » (ligne ~249) | source HTML/CSS — ⚠️ 4 Mo, data-URI en fin de fichier : lire avec `awk 'length($0)<4000'` |
| `Tools/juge-visuel/lieutenant/ecran-canon.png` | rendu RATIFIÉ par l'user (commit atelier `0881e8a`) |

## Back (B)

- **Stack locale** : montée, dev — `mesures/docker-ps.txt` (7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost`). Aucun gate E2E en cours. ⛔ Ne rien monter, ne rien redémarrer.
- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open` (`client_version` obligatoire dans le corps, sinon 422).
  ⛔ Le compte de démo `operational_demo@example.test` est INTERDIT (piloté par une suite PlayMode de l'user, corps changeants) — comptes frais seulement.
- **Seed si nécessaire** : le kit de départ donne au moins un lieutenant (id depuis `GET /v1/lieutenants`) ; mesurer `/:id` dessus. Pour les routes d'action, mesurer la FORME de la réponse (et des refus) sans chercher à peupler le monde.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| le nom « Salvatore » | `name` absent du détail `/:id` (et `lieutenant_id` aussi) | `lieutenant.projection.service.ts:318-352` (à vérifier) |
| l'ordre permanent existant (les règles en place) | aucune route ne LIT le script de comportement — `validate`/attach n'existent qu'en écriture | `lieutenant.controller.ts:221,294` (à vérifier) |
| `succession_horizon` | explicitement exclu de la projection joueur (décision) | `lieutenant.projection.service.ts:17` (à vérifier) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier (`Tools/*-implementation-notes.md`, `Tools/*-design.md`, `Tools/*-notes.md`) ;
- les rapports de juges précédents (visuels ou données — `Tools/juge-visuel/*/r*/`, `Tools/juge-donnees/*/`), et les rapports de confrontation du dépôt principal (`scratchpad/`) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
