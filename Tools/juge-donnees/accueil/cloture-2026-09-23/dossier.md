# Dossier du juge données — ④ Accueil — clôture (préparée) — 2026-09-23

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `Tools/juge-visuel/accueil/r1-2026-09-23/dossier.md` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : Accueil (④) — contrôleur `DashboardController`
- **Ce qu'on vient y faire / travaillé cette nuit** : la carte de tête en forme honnête, la file sous pression, l'entrée du rapport
- **Routes** : `/v1/economy/wallet`, `/v1/me` ; la carte : `POST /v1/session/open` (`hl_card`), `POST /v1/session/hl-card/:id/commit` et `/skip`

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
| `Assets/Scripts/Operational/Dashboard/DashboardController.cs` | présent au cumul |
| `Assets/Scripts/Shell/HighestLeverageCardController.cs` | présent au cumul |
| `Assets/Scripts/Shell/HlCardClient.cs` | présent au cumul |

- **Cumul** : `mafia-builder-city-clean` `fc3033ec`. rien de non fusionné relevé pour cet écran.
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `Tools/juge-visuel/accueil/r1-2026-09-23/rapport.md`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée / source |
|---|---|
| les options servies (`hl.option.*`) écrites en TEXTE sous « Ce qu'on peut faire » ; deux boutons « Prendre acte » (commit) et « Pas maintenant » (skip) | les options sont DESCRIPTIVES, commit / skip sont les seules actions (`hl-card-types.ts:99-104` du back ; `a0ff6cba` ; Tools/atelier-2026-09-22/45 tsv) |
| pas de « Conseil : » | aucun champ servi ne marque une recommandation (Tools/atelier-2026-09-22/generer-45-carte-de-tete.py) |
| « prendre acte n'agit pas à votre place » | Tools/atelier-2026-09-22/45 tsv |
| la file : « Plusieurs attendent encore » SANS nombre ; « d'autres attendent au-delà de ce que la file montre » | le back ne sert que des bandes (`queue_pressure_band`, `backlog_badge`) ; `9513b05b` |
| 3 états et l'entrée du rapport, pas plus | périmètre validé par f2 (Tools/atelier-2026-09-22/25 §2.1) |
| formes honnêtes : `flag_review`, `settling_glance`, `friction_glance.penalty_active`, `onboarding`, `priority_band`, `confidence_band` servis mais NON dessinés | Tools/atelier-2026-09-22/25 (questions posées à l'user) |
| aucun mot ni bouton de sortie (on sort en touchant la ville) | front.md §4 B ; Tools/atelier-2026-09-22/25 |
| la carte des rapports annonce un rapport OUVERT, une fois par session | D5 |
| bandes en mots (« modérée », « faible », « grave »), la barre en « Plein jour », dock du canon | R2.2 ; D1 ; D16 ; point 15 |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
