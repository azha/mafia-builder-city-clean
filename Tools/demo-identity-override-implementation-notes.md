# Surcharge d'identité de démo par éditeur — implementation-notes.md

Ruling user direct 2026-08-30 : « oui, livre-le ». Besoin : faire tourner DEUX éditeurs Unity en
parallèle (worktree principal + `~/project/mafia-unity-B`, branche `pilote-B`) sans rejouer
l'incident du 2026-08-21 (59/59 → 0/59 — le gouverneur « une décision structurelle par session » ne
mord que si une session active existe, et deux éditeurs partageant le compte partagent aussi cette
session).

⛔⛔ **RIEN N'A ÉTÉ EXÉCUTÉ.** Mesuré au début de ce lot : un gate E2E à 5 shards tournait (15
conteneurs `mcc-e2e-r10base-{1..5}`) ET l'éditeur de l'user était ouvert sur ce dossier (verrou de
projet). Consigne du contrôleur : aucun run, d'aucune sorte. Ce lot est écrit + committé ; la
vérification (compilation Unity, PlayMode réel) est une SECONDE PHASE que le contrôleur déclenchera
quand la machine sera libre.

Ce qui a été fait à la place, comme evidence :
- Mesures de population par oracle Python (commentaires C# stripés, jamais un grep nu — `rg` est
  proxifié en `grep` nu sur cette machine, et une alternance `|` y matche littéralement).
- Sanity de syntaxe : balance accolades/parenthèses par oracle Python sur les 12 fichiers C#
  touchés (0 partout) ; `node --check` sur les 2 seeders `.mjs` (syntaxe OK, sans toucher Docker/DB) ;
  une évaluation `node -e` isolée des 3 lignes EMAIL/CALLSIGN/PASSWORD de chaque seeder, confirmant
  le défaut byte-identique à l'ancien code ET la dérivation correcte sous surcharge.
- Lecture directe du dépôt back (`~/project/mafia-clean-city`, en lecture seule) pour dériver les
  préconditions de la falsifiable §4 — jamais supposées (voir le docstring du fichier de test).

## Ce qui est livré

**1. Lecture d'environnement par éditeur, les DEUX identités** — `Assets/Scripts/CityMap/
DemoIdentityResolver.cs` (nouveau). Deux paires de variables :
- `MAFIA_DEMO_IDENTIFIER` / `MAFIA_DEMO_PASSWORD` — identité "operational" (AppShell.cs + les 7
  contrôleurs `Operational/*`).
- `MAFIA_CITYMAP_IDENTIFIER` / `MAFIA_CITYMAP_PASSWORD` — identité "citymap" (`CityMapController.cs`
  seul — compte SÉPARÉ, seedé par un script distinct).

`DemoIdentityResolver.Resolve(...)` retombe sur le `[SerializeField]` existant si la variable est
absente OU vide (jamais une chaîne vide envoyée au back) — défaut INCHANGÉ, vérifié par
`node -e` (ci-dessus) côté seeder et par lecture directe côté C# (`string.IsNullOrEmpty` couvre les
deux cas). `DemoIdentityResolver.ResolveAndSignIn(...)` est le point d'entrée que les 9 sites de
production appellent désormais — voir §3.

**2. Paramètre équivalent côté seeder, additif, défaut inchangé** :
- `Tools/seed_operational_demo.mjs:48-53` (les lignes citées par le mandat) — `EMAIL`/`PASSWORD`
  lisent `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` (`||`, donc `undefined` ET `''` retombent sur
  le littéral), `CALLSIGN` est dérivé de `EMAIL.split('@')[0]` — rend `'operational_demo'` au défaut
  (byte-identique à l'ancienne constante, vérifié par `node -e`).
- `Tools/seed_citymap_demo.mjs:26-31` — même mécanisme, `MAFIA_CITYMAP_IDENTIFIER`/
  `MAFIA_CITYMAP_PASSWORD`. **Non explicitement demandé par le mandat** (qui ne cite que
  `seed_operational_demo.mjs:48-49`) — ajouté pour SYMÉTRIE (voir § Deviations, entrée 1).

**3. La garde d'ensemble** — `Assets/Tests/PlayMode/DemoIdentityResolverPlayModeTests.cs` (nouveau),
classe `DemoIdentityResolverGuardPlayModeTests`. Motif : `.SignIn(` (un point immédiatement suivi de
`SignIn(`) — le point de passage obligé du VRAI appel réseau (`AuthClient.SignIn`, méthode
d'instance) quel que soit le nom du receveur. Ce motif exclut structurellement :
- la DÉCLARATION (`public IEnumerator SignIn(...`, précédée d'un espace, jamais d'un point) ;
- le point d'entrée du résolveur, délibérément nommé `ResolveAndSignIn` et non `SignIn` — un
  homonyme se serait inclus dans son propre motif et aurait rendu la garde inexploitable.

Portée déclarée : `Assets/Scripts` uniquement (jamais `Assets/Tests` — un test peut signer
directement pour ses propres besoins de fixture, ce n'est pas le chemin de production protégé).

**Comptes AVANT/APRÈS (mesurés par oracle Python, commentaires stripés, scope `Assets/Scripts`)** :

| Motif | AVANT | APRÈS |
|---|---|---|
| `\.SignIn\(` (hors résolveur) | **9 fichiers / 9 occurrences** | **1 fichier / 1 occurrence** (`CityMap/DemoIdentityResolver.cs`, la ligne `auth.SignIn(...)` À L'INTÉRIEUR de `ResolveAndSignIn`) |
| `DemoIdentityResolver\.ResolveAndSignIn\(` | 0 | **9 fichiers / 9 occurrences** |

Les 9 fichiers (avant → après, même liste) : `AppShell.cs`, `CityMap/CityMapController.cs`,
`Operational/Autonomy/AutonomyInboxController.cs`, `Operational/BuildingCard/
BuildingCardController.cs`, `Operational/Dashboard/DashboardController.cs`, `Operational/
Exceptions/ExceptionQueueController.cs`, `Operational/Laundering/LaunderingController.cs`,
`Operational/Laundering/PipelineOverviewController.cs`, `Operational/Lieutenant/
LieutenantScreenController.cs`.

Contrôle positif (`Scan_NewCallOutsideResolver_BreaksTheSet_ThenRemovalRestoresIt`, répertoire
FABRIQUÉ, jamais `Assets/Scripts` réel) + 4 formes syntaxiques testées (`auth.SignIn(`,
`this.auth.SignIn(`, `_auth.SignIn(`, `authClient.SignIn(` — même compte attendu : 1) + 2 contrôles
négatifs (le point d'entrée du résolveur lui-même, la déclaration de méthode) — pattern repris
verbatim de `ChromeTabAccentAllowlistPlayModeTests` (précédent maison cité dans le socle du dépôt).

Le même fichier porte aussi `DemoIdentityResolverResolveBehaviorTests` (logique pure, pas de
réseau) : défaut inchangé sans variable, surcharge effective avec variable, une variable VIDÉE
retombe sur le défaut, les 4 noms de variable sont deux à deux distincts. Ces tests utilisent des
noms de variable FABRIQUÉS pour le test (jamais les vraies `MAFIA_DEMO_IDENTIFIER`/
`MAFIA_CITYMAP_IDENTIFIER`) — zéro risque de contaminer un run réel.

**4. La falsifiable croisée (deux comptes, aucun 409)** — `Assets/Tests/PlayMode/
DemoIdentityTwoAccountsPlayModeTests.cs` (nouveau), **ÉCRITE ET NON LANCÉE**. Scénario : deux
comptes FRAIS (signup), chacun signé via `DemoIdentityResolver.ResolveAndSignIn` (variables
d'environnement fabriquées pointant vers CE compte, fallback délibérément vers une identité qui
N'EXISTE PAS — si le résolveur retombait sur le fallback au lieu de lire la variable, le sign-in
échouerait et le test le verrait), fixture `session/close` (régime rétabli explicitement, jamais
hérité) → `session/open` (session ACTIVE — précondition exacte du plafond gouverneur, D9) →
découverte d'un bloc libre POUR CE JOUEUR dans son district de départ (Verge-A, id 16, via
`GET /v1/city/district/16/interior`) → `POST /v1/operational/building/purchase`
(`building_type_target=dealer_spot_front`). Assertions : les deux jetons sont distincts, ni l'un ni
l'autre ne reçoit 409, et les deux achats RÉUSSISSENT (un échec pour une autre raison ne prouverait
rien du gouverneur).

Préconditions dérivées PAR LECTURE du dépôt back (`~/project/mafia-clean-city`, lecture seule,
jamais devinées) — citées dans le docstring du fichier de test avec fichier:ligne : kit de départ
$10 000 (`auth.service.ts:150`, gratuit — `onboarding-grant.service.ts:322-323`), prix d'acquisition
d'un type non-lab/non-refinery = $7 500 (`conversion-tunables.ts:87-91,195,335` —
$10 000 > $7 500), `dealer_spot_front` est un type M1 valide et n'est PAS l'un des 4 types déjà
accordés (`real-estate.service.ts:241`, `onboarding-grant.service.ts:121-124`), un bloc libre se
calcule PAR JOUEUR (`real-estate.repository.ts:151-171` — la géographie est globale au district mais
la propriété est scopée `player_id`, donc aucun risque de collision avec un AUTRE joueur du même
district).

## Deviations

1. **`Tools/seed_citymap_demo.mjs` surchargé alors que le mandat ne cite que
   `seed_operational_demo.mjs:48-49`.** Imprévu non bloquant : le mandat dit explicitement « pour
   les DEUX identités » à l'item 1 (côté Unity) mais ne mentionne le seeder citymap nulle part.
   Option retenue (conservatrice — change le moins de surface, additif, zéro risque) : ajouter le
   MÊME mécanisme au second seeder, pour que les deux identités soient surchargeables de bout en
   bout (Unity ET seeding) plutôt que seulement côté client. Si le contrôleur juge que ce fichier
   était HORS PÉRIMÈTRE, le revert est un remplacement de 3 lignes.
2. **Nom de méthode `ResolveAndSignIn` plutôt que `SignIn` sur le résolveur.** Pas une déviation du
   mandat (qui ne prescrit pas de nom), mais une décision structurante à motiver : un homonyme
   `SignIn` sur `DemoIdentityResolver` se serait inclus dans le motif de la garde d'ensemble
   (`.SignIn(`), rendant impossible de distinguer "j'appelle le résolveur" de "je le contourne".
3. **Choix de `POST /v1/operational/building/purchase` (BUILDING_ACQUISITION) comme décision
   structurelle de la falsifiable §4**, plutôt qu'un autre des ~12 sites du catalogue
   (`structural-decision-catalogue.ts`). Aucun contrôleur Unity n'a de client de purchase existant
   (`BuildingCardController` ne fait que LIRE une carte existante) — la découverte de bloc libre et
   le corps de requête ont donc été écrits directement dans le fichier de test, avec les
   préconditions dérivées du code back cité ligne par ligne (jamais devinées). Alternative
   envisagée et écartée : `LIEUTENANT_RECRUIT` — écarté faute d'avoir pu confirmer par LECTURE seule
   (sans exécuter) que la précondition de roster d'un compte FRAIS est aussi simple à satisfaire que
   l'achat de bâtiment.
4. **Rien exécuté, aucune vérification empirique du scénario §4** (contrainte machine). Ce qui
   RESTE À FAIRE en seconde phase : lancer ce test seul (`Assets/Tests/PlayMode/
   DemoIdentityTwoAccountsPlayModeTests.cs`, catégorie `DemoIdentity`) contre le stack réel, et la
   garde d'ensemble + les tests de comportement du résolveur (même catégorie) — ces derniers ne
   touchent pas le réseau et devraient être quasi instantanés.

## Ce qui n'a pas été fermé

- Aucune compilation Unity réelle n'a eu lieu (interdite pour cette session) — la sanity de syntaxe
  (balance accolades/parenthèses, lecture manuelle) est le seul filet avant la seconde phase.
- Le second worktree `~/project/mafia-unity-B` (branche `pilote-B`) n'a pas été touché — c'est à lui
  de poser ses propres variables d'environnement (`MAFIA_DEMO_IDENTIFIER`, etc.) pointant vers un
  second compte réellement seedé ; ce lot ne seed AUCUN second compte, il rend le mécanisme
  DISPONIBLE.
- `front.md`/`back.md`, `Tools/juge-visuel/*`, `Tools/juge-donnees/*`, `Tools/
  redimensionnement-design.md` : non touchés (hors périmètre, explicitement interdits par le
  mandat).
