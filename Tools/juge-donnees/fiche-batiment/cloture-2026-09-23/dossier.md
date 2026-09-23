# Dossier du juge données — ② Fiche bâtiment — clôture (préparée) — 2026-09-23

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `Tools/juge-visuel/fiche-batiment/r1-2026-09-23/dossier.md` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : Fiche bâtiment (②) — contrôleur `BuildingCardController`
- **Ce qu'on vient y faire / travaillé cette nuit** : le pupitre (labo), la serre, la saisie
- **Routes** : `/v1/operational/building/:id` (+ convert, repair, deposit-cash, withdraw-cash, upgrade-*), `/storage/:id`, `/lab/:id/cook`, `/precursors/order`, `/grow-house/:id/plant`, `/grow-session/:id` et `/tend`, `/appointment`, `/appointment/:id` et `/honor`, `/distribution/dispatch`, `/laundering/inject`, `/v1/economy/wallet` ; en plus sur F : `GET /lab/:id`, `GET /precursors?building_id`

## Maquette (M)

- Voir la table des références du dossier visuel jumeau (statut ratifié / « maquette à ratifier » écrit ligne par ligne).
- Mots : les tables de l'atelier (`Tools/atelier-2026-09-22/`) — une clé proposée n'est pas une clé ratifiée.

## Back (B)

- **Stack locale** : NON FOURNIE — `docker ps` se colle au créneau (la pile se monte après le gate ; jamais pendant un gate E2E).
- **Back de référence** : `main` du dépôt back `30360c8d` au moment de la préparation ; corps réels datés et leur fraîcheur : dossier jumeau.
- **Compte** : le compte de capture (paire sous `MAFIA_CAPTURE_*`), ou un compte frais par `POST /v1/auth/signup` + `POST /v1/session/open`.

## Front (F)

| fichier | état |
|---|---|
| `Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs` | présent au cumul |

- **Cumul** : `mafia-builder-city-clean` `fc3033ec`. lots 1, 4, 6 NON fusionnés au cumul (voir « connus »)
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `Tools/juge-visuel/fiche-batiment/r1-2026-09-23/rapport.md`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée / source |
|---|---|
| le pupitre : trois échelles de crans (le feu 5, l'étagère 4, les caisses 4), avec les mots servis, pour `lab` et `specialized_lab` seulement | ruling « trop générique, c'est un jeu » (front.md l.896-916) ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `bcdcb977` ; Tools/atelier-2026-09-22/37 tsv |
| les refus dits en phrases (« Rien à faire ici. Repassez quand ce sera tiré ») — aucun code d'erreur à l'écran | front.md l.886-888, 905-906 |
| la serre sans rangée « Culture » ; pousse Bouture · Croissance · Floraison · Récolte ; santé Vigoureuse · Correcte · À soigner ; un seul pot | D14 ; Tools/atelier-2026-09-22/37 tsv ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `acefc0f9` |
| la saisie : « Saisie · {bande servie} », « rien » en ambre si la descente n'a rien pris | Tools/atelier-2026-09-22/37 tsv ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `68f6a5b5` |
| « L’atelier » au lieu de « Taille du labo », partout ; palier « de base · amélioré · au meilleur niveau » | D14 ; Tools/atelier-2026-09-22/37 (décisions f2, `4ee5b92c`) |
| un mot par type (Labo, Réserve, Serre…), le même que sur ① | D12 |
| archétype sans article, formes épicènes | D13 |
| aucun glyphe (pas de « A » près de GAIN, pas de `[#]`) | D11 |
| « état inconnu » / « type inconnu » / « — » | D8 |
| écran statique, sans animation | ruling du 27/08 (front.md l.832-837, 852-856) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
