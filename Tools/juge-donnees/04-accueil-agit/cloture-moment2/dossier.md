# Dossier du juge données — ④ la carte qui agit + après-geste ⑤ — clôture (moment 2) — 2026-11-11

> Gabarit `.claude/skills/juge-donnees/dossier-gabarit.md`. **ÉTAT : PRÉPARÉ, NE SE LANCE QU'APRÈS le rapport du juge visuel APPROUVÉ** (ordre f2 : juge-visuel PUIS juge-données). Répertoire : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/04-accueil-agit/cloture-moment2/` — tu écris `rapport.md` et `mesures/` ICI.
> Aucun rapport de juge précédent n'est fourni ni ne doit être cherché.

## Mode : clôture (B vs M vs F) — corps RÉELS mesurés

## L'écran
- **Nom** : ④ L'ouverture — carte de tête qui AGIT (commit sur l'une de deux options) et après-geste ⑤.
- **Ce qu'on vient y faire** : trancher la carte du jour et voir ce que le geste a fait.
- **Domaine présumé** : `services/game-back/src/progression/loop10/` (`hl-card.controller.ts`, `hl-card.service.ts`, `hl-card-projection.ts`), `session/open` (clé `hl_card`), `POST /v1/session/hl-card/:id/commit` et `…/skip` — le juge vérifie et complète.

## Maquette (M)
| fichier | rôle |
|---|---|
| `~/project/atelier3d-mafia/ecrans-brennar-accueil.html` @ `8f59cf9409546bc9a078dbb91ca48f91be68da95` — cadres 5, 6, 7 (0-based) ; épingle : `git -C ~/project/atelier3d-mafia show 8f59cf94:ecrans-brennar-accueil.html` | source |
| `~/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran/reference/` (cadres 5/6/7 rendus du master + `variantes-textes-8f59cf94.txt`) | rendus ratifiés / textes des issues sans cadre |
- NB : maquette RATIFIÉE par arbitrage de f2 ; le juge ne la rejuge pas, il la confronte au back et au front.

## Back (B)
- **Version** : `lot/hl-card-apres-geste` @ `35bdd6cb6ddb21321999c97a7c3b26aa0fc3d5b0` (dépôt `~/project/mafia-clean-city`), qui TOURNE sur la pile de dev locale ; f2 a vérifié `X-Server-Build`. **A REFAIRE par le juge avant toute mesure** : relire l'en-tête `X-Server-Build` d'une réponse et le comparer à ce SHA ; sinon B redevient DÉDUIT, à déclarer.
- **Stack locale** : `docker ps` à coller au début des mesures (état réel le jour du jugement).
- **Conditions imposées par f2 (11/11), NON NÉGOCIABLES** :
  1. UNIQUEMENT des comptes JETABLES créés par `POST /v1/auth/signup` joueur (Idempotency-Key requis) puis `POST /v1/session/open`, UN PAR SCÉNARIO, callsign au préfixe `juge4m2_<n>`.
  2. JAMAIS le compte de démo ; JAMAIS une route `_test`, ni purge, ni reset (règle V16).
  3. `X-Server-Build` doit valoir `35bdd6cb…` : relu AVANT la 1re mesure ET APRÈS la dernière (les deux lectures collées dans `mesures/`). Écart ⇒ B redevient DÉDUIT, à déclarer.
  4. Ne touche NI `docker compose` NI aucun conteneur (lecture `docker ps` seule). Aucune migration, aucune écriture hors comptes jetables et hors ton répertoire de dossier.
- **Seed** : `hl_card` est null sur un compte neuf. Pour obtenir une carte à deux options puis exécuter `commit`, il faut une action réelle (joueur) : à trouver par le juge dans les routes joueur et la spec E2E ; sinon déclarer « non productible » (ne PAS recourir à une route `_test`). Les `commit` MUTENT le compte : ne jamais réutiliser un compte entre scénarios.

## Front (F)
| fichier | rôle |
|---|---|
| `~/project/mafia-unity-F/Assets/Scripts/Shell/HlCardClient.cs` | routes appelées (commit / skip) |
| `~/project/mafia-unity-F/Assets/Scripts/Shell/ApresGesteHl.cs` | après-geste : résolution des clés / textes |
| `~/project/mafia-unity-F/Assets/Tests/PlayMode/ApresGesteDecisionPlayModeTests.cs` | test PlayMode de l'écran |
- **SHA du client** : `b56d837eaf11eaa7d7ff602245af5dfa90b832ea` (branche `lot/mots-client-2026-10-08`, code produit = `22890e0b` + 3 commits de tests de capture) ; PlayMode 167/168 vert (f2). Captures de l'écran du client (aide de lecture, pas une preuve de B) : `~/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran/captures/` — N'OUVRE QUE les PNG et le `journal.tsv` ; les réponses de commit y sont FABRIQUÉES (clés servies, phrases du bundle) : c'est à toi de mesurer les vraies réponses du back. Lis-le épinglé : `git -C ~/project/mafia-unity-F show b56d837e:<chemin>` ; ne modifie rien, n'ouvre pas Unity.
- **Rapport `juge-visuel`** : rendu le 11/11, NON APPROUVÉ (écarts de pixels en correction côté client) ; son rapport N'EST PAS fourni (interdit). Ordre f2 : le moment 2 données se fait malgré tout sur le client `b56d837e`, car il juge l'INFORMATION (B vs M vs F), pas les pixels ; les corrections visuelles n'en changent pas les clés.
- Contrôleur d'écran, DTO, résolveurs : le juge les trouve à partir de `HlCardClient.cs` / `ApresGesteHl.cs`.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)
| information | raison | source |
|---|---|---|
| 2 phrases du cadre 7 sans clé servie | TD-937 | arbitré f2 |
| `navigate_screen` non suivi | TD-938 | arbitré f2 |
| `superseded` → 404 « Cette carte n'est plus là. » | arbitré f2 | |
| `noted` sur la branche structurelle inatteignable en v1 | TD-929(b) | |
| geste `skip` sans geste dessiné ; « Pas maintenant » retiré | décision 08/10 | |
| noms des cibles (forme F), `status: skipped` | DETTE back | arbitré f2 |
| 9 constats C de l'examen de maquette (littéraux sans clé, E18 sans cadre, jeton 1 état dessiné/3, …) | consignés, ni correctif ni tour | |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation ; tout rapport de juge ou de revue précédent (dont `…/carte-4-agit/maquette-*/`, `…/04-accueil/r*/`, `…/ecran_dossier_39/`, tout `REVUE*.md`) : INTERDITS ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.
