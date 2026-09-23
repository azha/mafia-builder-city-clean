# Dossier du juge données — ⑲ Réglages — la porte « le coffre » — clôture (préparée) — 2026-09-23

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `Tools/juge-visuel/compte/r1-⑲-2026-09-23/dossier.md` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : Réglages — la porte « le coffre » (⑲) — contrôleur `SettingsScreenController`
- **Ce qu'on vient y faire / travaillé cette nuit** : la porte mise à jour : ce que le back sert aujourd'hui (une porte, deux entrées avec ㉒)
- **Routes** : `GET /v1/me` (`locale`, `meta_market_visibility_enabled`), `PATCH /v1/me/settings`, `GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial-opt-out`, `PUT /v1/me/meta-market/visibility`, `POST /v1/auth/signout`

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
| `Assets/Scripts/Account/Settings/SettingsScreenController.cs` | présent au cumul |

- **Cumul** : `mafia-builder-city-clean` `fc3033ec`. branchement NON fusionné au cumul (voir « connus »)
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `Tools/juge-visuel/compte/r1-⑲-2026-09-23/rapport.md`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée / source |
|---|---|
| « Depuis ce matin » (L5), « FERMER PARTOUT » (L11), « TOUT EFFACER » (L10) éteints, ou absents au client | dettes de maquette : dessinées, non servies (Tools/atelier-2026-09-22/35 §7 ; `42c62272`) |
| « Dire mes prix au marché » allumée, sans lot | L1 fermé : `GET /v1/me` + `PUT /v1/me/meta-market/visibility` (Tools/atelier-2026-09-22/35) |
| « La langue de la maison · Français › », sans lot | L8 fermé (`PATCH /v1/me/settings`) ; le 97 fait foi contre le 95 (Tools/atelier-2026-09-22/35) |
| la bascule « On vous explique encore » et « FERMER LE COFFRE · cette session seulement », vivants | repris du cadre 95 ratifié ; décision f2 (Tools/atelier-2026-09-22/35 §7) |
| la bascule ALLUMÉE quand `tutorials_opt_out` = faux | inversion opt-in / opt-out écrite sur la maquette (Tools/atelier-2026-09-22/35) |
| une porte pour deux entrées Plus (㉒ « Le compte », ⑲ « Le jeu ») | décision f2 « on garde » (Tools/atelier-2026-09-22/35 §7) |
| les mots de la porte à la place des littéraux du client | D14 (Tools/atelier-2026-09-22/35 §5 ; Tools/atelier-2026-09-22/38 tsv) |
| « Le coffre est fermé. » / « Rouvrir le coffre » après la sortie | mots PROPOSÉS par f2, sans maquette de l'après (Tools/atelier-2026-09-22/38 tsv) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
