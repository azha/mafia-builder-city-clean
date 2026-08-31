# Dossier du juge données — ㊲ LA RÉPUTATION — clôture — 2026-08-31

## Mode : clôture

## L'écran

- **Nom** : « La réputation » (l'user dit aussi « le miroir »), `screen_b3`.
- **Ce qu'on vient y faire** : lire ce que son lieutenant a ABSORBÉ des règles qu'on lui a
  données — pas ce qu'on lui a dit, ce qu'il en a retenu. L'écran est un miroir : il montre
  le joueur à travers la tenue et la posture de quelqu'un d'autre.
- **Domaine présumé** : `services/game-back/src/reputation/`, `…/lieutenant/` — le juge
  vérifie et complète, il ne se limite pas à cette liste.

## Maquette (M)

| fichier | rôle |
|---|---|
| `~/project/atelier3d-mafia/generateur-reputation.py` | source, générateur des 6 vues (m-119…m-124) |
| `Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-119.png` … `m-124.png` | les rendus ratifiés |

⚠️ La maquette est produite par un GÉNÉRATEUR Python, pas écrite à la main : les hauteurs de bloc
sont des constantes nommées (`H_FIXE`, `H_MIROIR`, ligne 279-280) et non des valeurs au jugé.
Le front les lit à la source. Un écart de hauteur est donc un écart CHIFFRABLE, pas une impression.

## Back (B)

- **Stack locale** : montée — mais **redémarrée il y a ~9 min par une autre session**, pas par moi
  (mon mandat m'interdit de monter ou relancer une stack Docker). `docker ps` au moment du dossier :

mafia-clean-city-traefik-1  Up 10 minutes
mafia-clean-city-game-back-1  Up 10 minutes (healthy)
mafia-clean-city-bo-back-1  Up 10 minutes (healthy)
mafia-clean-city-docker-socket-shim-1  Up 10 minutes
mafia-clean-city-pg-1  Up 10 minutes (healthy)
mafia-clean-city-redis-1  Up 10 minutes (healthy)
mafia-clean-city-bo-front-1  Up 10 minutes (healthy)

  ⚠️ **Conséquence mesurée, à ne pas confondre avec un défaut de cet écran** : depuis ce
  redémarrage, `Tools/seed_operational_demo.mjs` sort en exit 1 sur un
  `404 RESOURCE_NOT_FOUND — "building 86615e13-… is not a player-owned OPERATIONAL building"`,
  ce qui fait rougir 9 tests d'AUTRES écrans (Charpente/Accueil, DistrictMap) en `OneTimeSetUp`.
  Compté : run14 = 0 échec seeder, run16 = 0, run17 = 9. Aucun de ces tests n'appartient à ㊲ et
  aucun de mes commits ne touche le seeder. Signalé à la session qui orchestre.

- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open`.
- **Seed** : AUCUN. L'écran est instruit à l'état d'un compte neuf — 0 règle donnée, 0 absorbée,
  `consistency_cue = indeterminate`. C'est l'état que la maquette m-119 montre.

## Front (F)

| fichier | rôle |
|---|---|
| `Assets/Scripts/Operational/Reputation/ReputationScreenController.cs` | contrôleur d'écran |
| `Assets/Scripts/Operational/Reputation/ReputationDtos.cs` | DTO désérialisés + polarité des 4 poses |
| `Assets/Scripts/Operational/Reputation/ReputationResolvers.cs` | valeur → libellé, valeur → couleur |
| `Assets/Scripts/Operational/Reputation/ReputationPortrait.cs` | portrait + voyants |

- **Rapport `juge-visuel` APPROUVÉ** : ⏳ **NON FOURNI À CETTE HEURE** — le juge visuel n'a pas
  encore rendu. Ce dossier est monté d'avance ; il ne doit pas être instruit tant que cette ligne
  n'est pas remplacée par un chemin réel. Le mode clôture EXIGE l'approbation visuelle en amont.
- **SHA du client** : `d2fb5ba` · suite PlayMode ScreenB3 : **9/9** au run 28, filtre `MAFIA_CI_CATEGORIES=ScreenB3`
  imprimé dans le log (`passed=9 failed=0 skipped=0`) — un compte, pas une absence d'échec.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée | source |
|---|---|---|
| le nom du lieutenant | présent en base, JAMAIS projeté par la route — l'écran affiche « Salvatore » depuis la maquette et le dit à l'écran (« lieutenant.name — non projeté (L0.4) ») | mesure des corps de réponse, `Tools/reputation-mesures-prealables.md` |
| `restraint` absente | la branche existe mais aucune route ne liste les contreparties : `counterparty_id` n'est pas obtenable par un chemin joueur | angle mort A6 |
| 4 couleurs locales | `Encre`, `Panneau`, `Liseré`, `Vert` n'existent pas dans `DesignTokens` ; arbitrage DA escaladé à l'user, non tranché | `Tools/screen-b3-diagnostic-designtokens.md` |
| états `drifting`/`hostile`/`wary` | code écrit, JAMAIS exécuté par un test — dette assumée et déclarée, pas couverture | angle mort A5 |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ;
- les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
