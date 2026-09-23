# Dossier du juge données — ㉙ Le conflit — clôture (préparée) — 2026-09-23

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `Tools/juge-visuel/ecran_conflit/r3-2026-09-23/dossier.md` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : Le conflit (㉙) — contrôleur `ConflitScreenController`
- **Ce qu'on vient y faire / travaillé cette nuit** : les mots (table 40), le geste vers un AXE, les erreurs du POST (addendum 40)
- **Routes** : `/v1/lieutenants`, `GET` et `POST /v1/me/engagements`

## Maquette (M)

- Voir la table des références du dossier visuel jumeau (statut ratifié / « maquette à ratifier » écrit ligne par ligne).
- Mots : les tables de l'atelier (`Tools/atelier-2026-09-22/`) — une clé proposée n'est pas une clé ratifiée.

## Back (B)

- **Stack locale** : NON FOURNIE — `docker ps` se colle au créneau (la pile se monte après le gate ; jamais pendant un gate E2E).
- **Back de référence** : `main` du dépôt back `d62ee1f1` au moment de la préparation ; corps réels datés et leur fraîcheur : dossier jumeau.
- **Compte** : le compte de capture (paire sous `MAFIA_CAPTURE_*`), ou un compte frais par `POST /v1/auth/signup` + `POST /v1/session/open`.

## Front (F)

| fichier | état |
|---|---|
| `Assets/Scripts/Operational/Conflit/ConflitScreenController.cs` | présent au cumul |
| `Assets/Scripts/Operational/Conflit/ConflitDtos.cs` | présent au cumul |

- **Cumul** : `mafia-builder-city-clean` `c0a9092a`. rien de non fusionné relevé pour cet écran.
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `Tools/juge-visuel/ecran_conflit/r3-2026-09-23/rapport.md`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée / source |
|---|---|
| le geste vise un AXE, pas un bâtiment : « On envoie {nom} chez {famille}, sur {axe}. », 5 mots `conflit.axe.*` | `target_holding_id` est un des 5 axes (`engagements.controller.ts:166-183` du back ; `997d6ab4`) ; la référence qui nomme un entrepôt est une dette de maquette (Tools/atelier-2026-09-22/40 tsv) |
| « autre cible », pas « autre bâtiment » | Tools/atelier-2026-09-22/40 tsv |
| pas d'aperçu du butin avant l'envoi | aucune donnée ne le sert (Tools/atelier-2026-09-22/40 tsv) |
| pas de panneau des manques en texte servi (cadre 64) | Tools/atelier-2026-09-22/40 tsv (classé en note) |
| médaillons à initiale C / T / G / S avec le nom de la famille | D11 : le nom accompagne (Tools/atelier-2026-09-22/40 tsv) |
| « Les quatre familles de Brennar », « Dites-moi seulement chez qui… » | D14 (Tools/atelier-2026-09-22/40 tsv) |
| « L'envoyer ce soir » actif seulement quand famille, homme et axe sont choisis ; aucune annulation | Tools/atelier-2026-09-22/40 tsv |
| le refus « deux choses ne collent pas » (aucun gros bras) | le compte de démo n'a aucun MUSCLE (corps `GET_lieutenants.json`) |
| pas d'heure de départ (« il est parti ») | `created_at_minute` absent exprès (front.md ㉙) |
| les erreurs du POST dites en mots : 409 (clé servie `error.engagements.muscle_lieutenant_required`, RATIFIÉE et gardée par le back `f82a140b`), 404 et 422 en un mot chacun, l'échec réseau | Tools/atelier-2026-09-22/40-addendum-engagements (`24897b48`) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
