# Dossier du juge données — ⑥ La Famille (l'organigramme) — clôture — 2026-09-06

> Rempli par l'orchestrateur (session `mafia-juge`), lu en premier par le juge. Tout ce qui ne peut pas être rempli
> est dit « non fourni » avec la raison — jamais supprimé.

## Mode : **clôture** — trois côtés : B (back) · M (maquette) · F (front)

Le `juge-visuel` de cet écran a rendu **APPROUVÉ** le 2026-09-06 (r1, 0 BLOQUANT, 0 MAJEUR, 10 MINEUR). L'image est
validée ; il reste à savoir **ce que le front AFFICHE de ce que le back RENVOIE**, et ce qui est passé à côté.
Tu compares B ↔ F (M dit ce qui était dessiné) — **pas la capture à la maquette**, c'est fait.

## L'écran

- **Nom** : La Famille — l'organigramme (⑥, canon `screen_3`), onglet FAMILLE.
- **Ce qu'on vient y faire** : le mur de photos — le Don, ses lieutenants en rangs, chacun avec son archétype et son
  ancienneté, et sous chacun ses hommes ; lire d'un coup d'œil qui tient quoi, et qui manque à la table.
- **Domaine présumé** : `services/game-back/src/operational/lieutenant/` (roster, projection par lieutenant, recrutement,
  réassignation, behavior-script, autonomie) et `progression` — le juge vérifie et complète (grep `lieutenant` dans
  TOUS les contrôleurs : `me/`, `session/` peuvent porter la donnée).

## Maquette (M)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/mafia-unity-J/Tools/family-organigramme-reference-source.html` | source HTML/CSS de l'organigramme (extrait isolé de `~/project/atelier3d-mafia/ecrans-brennar.html` §1) |
| `reference-1120.png` (lien, dans ce dossier) | rendu ratifié user (`0881e8a`), 1120×1850, 560 CSS ×2 |

## Back (B) — corps RÉELS de la resync du 2026-09-06, même compte et même minute que la planche

- ⛔ **Aucune stack à monter, aucun `curl`** : B est déjà mesuré. Les corps sont sous `corps-reels/` (copiés depuis la
  branche `da/corps-reels` **`bff35d6`**, 2026-09-06 06:46) : provenance dans chaque fichier — `back_main b357e7a4`,
  compte **`demo_capture@example.test`**, **`horloge_game_minute 72013`** (jour de jeu 50). La planche (ci-dessous) a été
  prise sur **le même compte à la même minute**, encadrée par deux empreintes identiques (rapporté par
  `mafia-clean-city-f2`, 2026-09-06 ~06:50) — comparer une valeur affichée à une valeur servie est légitime pour CE tour.
- **Corps du dossier de code du contrôleur** (`_index.json`) : `GET /v1/lieutenants/{id}` (200) · `GET /v1/progression`
  (200) · `GET /v1/autonomy-reports` (200) · 8 mutations non appelées (`POST lieutenants`, `…/reassign`,
  `…/behavior-script[/validate]`, `…/autonomy/decision`, `…/issues/…/resolve`, `auth/*`).
- ⚠️ **`GET /v1/lieutenants` — le ROSTER, la route que l'organigramme consomme — n'était pas dans le dossier `famille`
  de la sonde.** Copié ici depuis le dossier `revue-du-jour` de la MÊME passe (même compte, même minute 72013, même
  `back_main`) : `corps-reels/GET_lieutenants.json`, **3 lieutenants**, `route_appelee = /v1/lieutenants`. ⚠️ Ne prends
  PAS le fichier homonyme du dossier `reputation` de cette passe : la sonde y a appelé `/v1/lieutenants/` (barre finale)
  résolu en `/v1/lieutenants/{id}` et l'a écrit sous le même nom — c'est un DÉTAIL, pas le roster (défaut d'instrument,
  signalé à part).
- **Ce compte est « même âge, moins vécu »** que le compte historique (6 cartes de levier contre 269, 1 rapport
  d'autonomie contre 0) : pour ⑥ (3 lieutenants, 17 bâtiments, identiques des deux côtés) ça ne change rien —
  **une liste courte ailleurs n'est pas un défaut**.
- **Valeurs possibles** de chaque clé : à lire dans le code back `/home/erutheone/project/mafia-clean-city/services/game-back/src`
  (`main`), migrations `db/migrations/`, schéma `db/schema/`, specs `/home/erutheone/project/mafia-clean-city/tests/e2e/`
  — lecture seule, aucune commande qui compile ou teste. La spec `tests/e2e/operational/lieutenant_roster_list.spec.ts`
  **épingle l'ensemble de clés du roster** (`toEqual` exact + `FORBIDDEN_KEYS`) — détecteur de forme F de cette surface.

## Front (F)

| fichier | rôle |
|---|---|
| `/home/erutheone/project/mafia-unity-J/Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs` | contrôleur d'écran (3 349 lignes, 6 sections — l'organigramme est la section vue du HAUT, `:1720` « l'organigramme (maquette ratifiée) ») |
| `…/Lieutenant/LieutenantDtos.cs` | DTO désérialisés (`RosterRow`, `LieutenantBands`, enveloppes) |
| `…/Lieutenant/FamilleLabels.cs` | résolveurs i18n : archétype → libellé, ancienneté → palier |
| `…/Lieutenant/LieutenantClient.cs` | routes appelées (`Url(leaf)` = `/v1/lieutenants{leaf}` — les littéraux seuls rendent 0 route : lis les docstrings et les `Url(...)`) |
| `…/Lieutenant/RuleModel.cs` | modèle des règles (section ⑧, hors organigramme) |

- **SHA du code** : `76ee3cc` (client `main`) — **mesuré identique** à `pilote-F` `0f1398b` sur
  `Assets/Scripts/Operational/Lieutenant/`, `ShellContracts/` et `AppShell.cs` (`git diff --stat 76ee3cc 0f1398b` vide) :
  le code que tu lis dans ce worktree est celui qui a produit la planche.
- **Planche** : `planche-1080x2400.png` (dans ce dossier) — copie de `mafia-unity-F/Assets/Screenshots/planche_la_famille_1080x2400.png`
  (mtime 2026-09-06 06:41, sha256 `9c842c2b…`, **non commitée** au moment de la copie — une mesure DATÉE), prise sur
  `pilote-F` après **TD-615** (`0f1398b` : le gras était SIMULÉ partout, une vraie Bold est câblée). ⚠️ Toute planche
  antérieure à TD-615 porte un gras simulé — une comparaison avant/après sur un titre gras mesure la POLICE, pas l'écran.
- **Rapport `juge-visuel` APPROUVÉ** : `Tools/juge-visuel/famille/r1-2026-09-06/rapport.md` (**ne le lis pas** — son
  verdict suffit ; ses 10 MINEUR — halo du Don, bouton retour, en-tête — sont hors de ton mandat : tu juges la DONNÉE).
- Suite PlayMode : non fournie ce tour (aucun run lancé par cette session) — à écrire en non-vérifié.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

Établis par le juge-données mode maquette du 2026-08-25 (E1..E11) et repris dans le dossier visuel du 2026-09-06 —
**plusieurs ont pu se PÉRIMER** (C3/L0.4 a projeté `lieutenant.name` depuis) : re-mesure chacun sur les corps.

| information | raison mesurée (datée) | source |
|---|---|---|
| nom du lieutenant | AU 25/08 : en base, jamais projeté (forme F). **Depuis C3 : projeté** (`name` sur le roster et le détail) — vérifier sur `GET_lieutenants.json` | front.md ⑥ « DÉBLOQUÉ » |
| « Loyauté 82 % » | seule grandeur : `loyalty_seed_bucket`, enum à 4 valeurs — un % serait inventé | JD maquette E2 |
| rattachement lieutenant → hommes, noms des hommes, résumé d'équipe | aucune entité « homme » ne porte `lieutenant_id` ni de nom (E3, E4, E5) — le client affiche « Aucune équipe rattachée » | JD maquette |
| chip « Retiré » / rang grisé | `extinction_state` : 0 écrivain de production (E6) | JD maquette |
| chip « Délégué / Direct » | `mode` projeté sur le DÉTAIL seulement et CONSTANT en production (E7) — le client montre l'ANCIENNETÉ | JD maquette |
| district du Don (« Le Verge ») | aucune route « mes districts » (E8) | JD maquette |
| lieu de l'homme | `dealer.home_building_id` non projeté (E9) | JD maquette |
| bandeau « Un siège libre à la table » | plafond de roster = tunable 5, jamais projeté (E10) | JD maquette |
| archétypes en français | résolveur `FamilleLabels` (9 archétypes) ; la maquette en dessine 4 | JD maquette E11 |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ;
- les rapports de juges précédents (visuels ou données) — `Tools/juge-donnees/famille/maquette-2026-08-25/`,
  `Tools/juge-visuel/famille/r1-2026-09-06/rapport.md` : ils existent, ne les ouvre pas ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas ;
- une stack montée, un compte frais, un `curl` : **pas ce tour-ci** (les corps sont la mesure). Tout ce qui l'exigerait
  va en « non vérifié » avec la commande qui trancherait.
