# Dossier du juge données — ㉕ La première fois — clôture (préparée) — 2026-09-23

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `Tools/juge-visuel/compte/r1-㉕-2026-09-23/dossier.md` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : La première fois (㉕) — contrôleur `TutorialScreenController`
- **Ce qu'on vient y faire / travaillé cette nuit** : la maquette autour des données servies (ordre lu au back, 4 cadres)
- **Routes** : `GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial` (seul écrivain de `shown_tutorial_ids`), `PATCH /v1/ui/tutorial-opt-out` ; `POST /v1/session/open` (bloc `onboarding`, non dessiné)

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
| `Assets/Scripts/Onboarding/TutorialScreenController.cs` | présent au cumul |

- **Cumul** : `mafia-builder-city-clean` `fc3033ec`. refonte NON fusionnée au cumul (voir « connus »)
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `Tools/juge-visuel/compte/r1-㉕-2026-09-23/rapport.md`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée / source |
|---|---|
| « Compris » à la place de « J'AI COMPRIS » | D14 : série 2 cadre 31 (Tools/atelier-2026-09-22/33 ; Tools/atelier-2026-09-22/36 tsv) |
| la bascule « On vous explique encore » à la place des boutons de refus | D14 : mots de la porte 95-96 (Tools/atelier-2026-09-22/33 ; Tools/atelier-2026-09-22/36 tsv) |
| le TEXTE servi du tutoriel, jamais son identifiant | Tools/atelier-2026-09-22/33 (11 textes servis) |
| « Rien de nouveau pour aujourd'hui. » quand `next_tutorial_id` est null et `eligible` non vide ; « Vous avez tout vu. » seulement si `eligible` est vide | Tools/atelier-2026-09-22/33 §4 ; Tools/atelier-2026-09-22/36 tsv (mot proposé) ; D18 |
| l'ordre des tutoriels est celui que sert le back (au plus un par session de jeu) | Tools/atelier-2026-09-22/33 §1 (`disclosure-schedule.service.ts:72-85`) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
