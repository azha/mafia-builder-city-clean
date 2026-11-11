# Dossier du juge données — ④ L'ouverture : la carte de tête QUI AGIT (HL chunk 3) — maquette — SHA atelier 9fa533b5 (relancé par JUGE)

> Gabarit `.claude/skills/juge-donnees/dossier-gabarit.md`. Les cadres neufs ont été livrés par CLIENT-2 (SHA ci-dessous).
> Aucun rapport de juge précédent n'est fourni ni ne doit être cherché.

## Mode : maquette (moment 1 — maquette contre ce que le back renvoie)

## L'écran
- **Nom** : ④ L'ouverture — la carte de tête (décision du jour) : avant et APRÈS le geste
- **Ce qu'on vient y faire** : trancher la carte du jour (deux options, une conséquence sous chacune) et voir ce que le geste a fait.
- **Domaine présumé** : `services/game-back/src/progression/loop10/` (`hl-card.controller.ts`, `hl-card.service.ts`, `hl-card-projection.ts`), `session/open` (clé `hl_card`), routes `POST /v1/session/hl-card/:id/commit` et `…/skip` — le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `~/project/atelier3d-mafia-c2/ecrans-brennar-accueil.html` — cadre **1** (AVANT le geste, état cible) et cadre **6** (APRÈS le geste : carte `.carte-or.tranchee`, outcome « executed ») | source HTML/CSS |
| `reference/cadre-1-avant-geste.png`, `reference/cadre-6-apres-geste-tranchee.png` (1080×2102, ×3,6, rendus depuis ce SHA) | rendu — cadre 6 PROPOSÉ, ratification f2 en attente |

- **SHA atelier** : `8b79f946fd664f16c54999c199f08d7ea9551c41`, branche `atelier/client2-q5-apres-2026-10-11`, arbre `~/project/atelier3d-mafia-c2` (propre). Le cadre 6 est en QUEUE de page (pas à la suite du 1) ; le cadre 5 reste la référence de la carte de tête. Mots ratifiés par f2 (11/11) : mot-or « Les travaux sont lancés et payés. L’activité reprend à la fin du chantier. », ligne-or « Retour à l’accueil / Rien d’autre à trancher pour l’instant. ». Les autres issues (route, tronçon, noted, arrêt partiel, navigate) n’ont PAS de cadre dessiné : même structure, seul le texte varie ; leurs textes FR+EN, ratifiés par f2, sont dans `reference/variantes-textes-8b79f946.txt` (sortie de `generateur-q5-apres-2026-10-11.py --variantes`). Pages HTML identiques à 9fa533b5 ; seul le générateur a changé.

## Back (B)
- **Cumul back** : `gate/cumul-2026-10-10` @ `7807d6c8` (merge lot/hl-card-agit : la carte exécute ; `target_count`, `projected_consequence`).
- **Stack locale** : NE PAS LA TOUCHER (ruling f2 11/11 : la pile de dev tourne `main`, le gate arrive). **Au moment 1, la colonne B est DÉDUITE du source du cumul `gate/cumul-2026-10-10` @ `7807d6c8`** — à déclarer ainsi dans le rapport. Les corps RÉELS se mesurent au moment 2, après le gate, sur la pile reconstruite (f2 signalera).
- **Compte** : aucun au moment 1 (B déduite) ; au moment 2 : frais, `POST /v1/auth/signup` puis `POST /v1/session/open`.
- **Seed** : au moment 2 seulement ; au moment 1, dire quel état est productible d'après le source (« déduit »).

## Front (F) : sans objet au moment 1.

## Écarts ASSUMÉS déjà connus
| information | raison mesurée | source |
|---|---|---|
| nombre d'options servies | le back ne sert que 2 options sur un compte frais | décision f2 (HANDOFF JUGE 09/10) — à re-vérifier |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation ; les rapports de juges précédents (visuels ou données) ; les choix non sourcés ci-dessus.
