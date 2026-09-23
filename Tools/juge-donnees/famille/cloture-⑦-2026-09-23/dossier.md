# Dossier du juge données — ⑦ Fiche du lieutenant — la mécanique — clôture (préparée) — 2026-09-23

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `Tools/juge-visuel/famille/r1-⑦-2026-09-23/dossier.md` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : Fiche du lieutenant — la mécanique (⑦) — contrôleur `LieutenantScreenController`
- **Ce qu'on vient y faire / travaillé cette nuit** : la fiche autour des données servies, l'ordre permanent émis par l'éditeur de ⑧
- **Routes** : `GET /v1/lieutenants/:id` (`drift_phase`, `standing_order`, bandes) ; à câbler : `POST …/standing-order`, `…/standing-order/decision`, `…/signal-drift/decision`

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
| `Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs` | présent au cumul |

- **Cumul** : `mafia-builder-city-clean` `fc3033ec`. émission non câblée (voir « connus »)
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `Tools/juge-visuel/famille/r1-⑦-2026-09-23/rapport.md`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

| information | raison mesurée / source |
|---|---|
| PAS de formulaire à trois verbes (Collecte, Blanchir, Surveiller), pas de Cible | non servable : aucune action DSL, pas de déclencheur, pas de cible (`compiler.service.ts:66` du back ; `aa2cd03b` ; Tools/atelier-2026-09-22/41) |
| pas de glissière de durée : « pour une durée fixe » | `duration_class` ignoré en M2 (Tools/atelier-2026-09-22/41 ; Tools/atelier-2026-09-22/42 tsv) |
| l'émission passe par l'éditeur de ⑧ (une règle `famille.regle.*`) et « Signer l'ordre » | Tools/atelier-2026-09-22/41 ; « Signer l'ordre » ratifié (série 1, Tools/atelier-2026-09-22/42 tsv) |
| « Et quand il expire » et ses 3 `lapse_action` (choix obligatoire) | sinon 422 (Tools/atelier-2026-09-22/41) |
| disparus : loyauté 82 %, 3/8, 8/12, probation, préfère / rejette, veto, « Sal », « Relever de ses fonctions » | aucune donnée ou aucune route (Tools/atelier-2026-09-22/26 ; Tools/atelier-2026-09-22/12) |
| non dessinés : `trust_budget_bucket`, `flag_frequency_band` (déjà sur ⑯), `cue_bands` | Tools/atelier-2026-09-22/26 |
| les bandes d'autonomie en MOTS seuls, sans jauge | R2.2 et D11 |
| capuche, bordure laiton | décision du 02/09 (Tools/atelier-2026-09-22/12) |
| « Depuis peu » (FRESH), pas « nouveau venu » | D13 |
| dock du canon, ronds vides, Famille active ; la barre en « Plein jour » | point 15 ; D16 |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
