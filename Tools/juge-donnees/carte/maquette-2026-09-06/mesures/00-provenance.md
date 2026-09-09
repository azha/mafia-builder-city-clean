# 00 — provenance des mesures (juge données ⊥ — ③ la Carte de Brennar — 2026-09-06)

## SHA du back RÉELLEMENT lu — trois chemins indépendants, concordants
$ A=$(git rev-parse HEAD)  ·  $ rtk proxy git rev-parse HEAD  ·  $ cat .git/refs/heads/main
  au DÉBUT de la passe : 0775ac980cb6bb6379829264f8cc8a2a8c6a6b44 (main, 2026-09-06 03:54)
  à la FIN de la passe  : aafdf5fc6a55ddb052da87a45c2fd7144bdde56f (main, 2026-09-06 04:03:25 +0200)

## main a bougé PENDANT la passe — ce que ça change : RIEN pour ce rapport
$ rtk proxy git diff --name-only 0775ac98 aafdf5fc
  -> CLAUDE.md
  -> docs_int/tech_debt_inventory.md
  -> 0 fichier sous services/game-back/ ni tests/e2e/ (compte via grep -c -E)

## PIÈGE DE MESURE rencontré, et écarté (socle : couche d'affichage du proxy)
La commande `git rev-parse --short HEAD` LUE AU TERMINAL a rendu « 6ea71c84 » — un sha
qui n'est celui d'AUCUN des trois oracles ci-dessus. Tout sha de ce rapport vient donc
dun $( ) ou de `rtk proxy`, jamais dune sortie lue au terminal.

## Écarts avec ce qu'annonce dossier.md
- dossier.md l.41 : back src « main `b0cbde96` ». Mesuré : `0775ac98` → `aafdf5fc`.
- corps réels : datés 2026-09-04T10:15:48, back_main `6ff684db` (provenance dans CHAQUE fichier).
- aucune stack montée, aucun curl, aucun test lancé (gate E2E en cours — contrainte du mandat).
