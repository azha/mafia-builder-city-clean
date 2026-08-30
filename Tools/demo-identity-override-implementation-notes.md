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

## RONDE 2 — remédiation revue ⊥ (2026-08-30, NOT_APPROVED 2 BLOCKING / 3 IMPORTANT / 7 MINOR)

Rapport : `/tmp/revue-demo-identity.md`. Contrainte machine RE-VÉRIFIÉE avant d'écrire une ligne :
`docker ps -aq | wc -l` → 7 (base de dev seule, aucun gate) ; mais l'énumération `/proc/<pid>/exe`
trouve PLUSIEURS processus `.../Unity/Hub/Editor/6000.4.6f1/Editor/Unity` actifs ⇒ **l'éditeur est
ouvert**. Donc : ÉCRIT + COMMITÉ, **RIEN LANCÉ, aucune exécution de la seconde phase cette fois non
plus** — à l'exception du réplica Python du scanner (ce n'est pas Unity, ça ne touche pas
l'éditeur), exécuté sur l'arbre final réel (voir B1).

### B1 (BLOCKING, PREUVE) — la garde était ROUGE sur l'arbre livré

Fermé en paraphrasant les deux citations littérales du docstring de `DemoIdentityResolver.cs`
(jamais en strippant les commentaires du scanner — l'instrument de MESURE originel était en Python
à commentaires stripés, mais l'instrument de la GARDE livrée est en C# à texte brut ; c'est le texte
brut qu'il fallait rendre exempt de citation, pas l'inverse, pour ne pas diverger encore une fois de
ce que la garde exécute réellement). Réplique EXACTE du scanner (`CountLiteralOccurrences` +
`ScanDirectory`, même logique, portée `Assets/Scripts`) en Python, exécutée sur l'arbre FINAL (après
tous les correctifs de cette ronde) :

```
$ python3 …   # os.walk('Assets/Scripts'), substring count, ordinal
motif '.SignIn(' : TotalOccurrences = 1, FilesWithHits = {'CityMap/DemoIdentityResolver.cs': 1}
motif '.SignUp(' : TotalOccurrences = 0, FilesWithHits = {}
```

`AreEqual(1, scan.TotalOccurrences)` pour `.SignIn(` est désormais VRAI sur l'arbre livré — le
docstring ne cite plus le motif, il le PARAPHRASE et explique explicitement pourquoi (« le citer ici
le réintroduirait dans ce fichier »).

### B2 (BLOCKING, PRODUCTION) — la surcharge écrasait l'appel explicite `SetIdentity()`

CLASSE : « toute source d'identité concurrente du résolveur ». Population mesurée sur
`Assets/Scripts` :
1. **Appel explicite** — `AppShell.SetIdentity` (`grep -rln "SetIdentity" Assets/Scripts` → 1 seul
   fichier). C'était l'instance fautive : son fallback était lu par `ResolveAndSignIn` avec
   `allowEnvironmentOverride` implicitement vrai, donc TOUJOURS battu par une variable
   d'environnement posée — l'inverse de l'intention.
2. **Défaut `[SerializeField]` sérialisé** — 1 site vivant (`Assets/Scenes/Boot.unity:416-417`),
   valeur = défaut C#, aucune divergence. Rang le plus faible, correctement inchangé.
3. **`AuthClient.SignUp`** — pas une question de précédence mais de CONTOURNEMENT total du
   résolveur (monde dégénéré n°1 du rapport ⊥). 0 occurrence en production aujourd'hui ; fermé par
   un second motif de garde (voir plus bas), pas par une précédence — rien à hiérarchiser puisque
   personne ne l'appelle.

Correctif : `DemoIdentityResolver.Resolve`/`ResolveAndSignIn` gagnent un paramètre
`allowEnvironmentOverride = true` (défaut inchangé pour les 9 sites qui ne le passent pas).
`AppShell` gagne un champ `identityExplicitlySet`, posé à `true` dans `SetIdentity()`, et passe
`allowEnvironmentOverride: !identityExplicitlySet` à son unique appel de `ResolveAndSignIn`
(l'identité "operational"). Précédence livrée, écrite noir sur blanc dans
`DemoIdentityResolver.cs` : **appel explicite (1) > variable d'environnement (2) > défaut sérialisé
(3)**.

Recompte des 11 sites `SetIdentity` (revue ⊥) : les 2 qui rougissaient déterministiquement
(`CharpenteOuvertureSessionOverlayPlayModeTests.cs:492`, `NavigationPlayModeTests.cs:225` — identité
délibérément invalide, censée faire échouer le sign-in) retrouvent leur comportement voulu sous
surcharge : l'identité invalide explicite gagne, l'échec attendu se produit, quel que soit
l'environnement. Les 9 autres (qui posaient une identité VALIDE mais différente du défaut) cessent
de silencieusement tourner sur le compte d'un éditeur voisin — même correction, même mécanisme.

Guard-scope (fermeture PARTIELLE de la classe « contournement total », pas seulement la précédence
de #1) : ajout d'un second motif `.SignUp(` à `DemoIdentityResolverGuardPlayModeTests`, avec ses
propres 4 formes d'alias, ses 2 contrôles négatifs et son contrôle positif dédié
(`Scan_NewSignUpCallOutsideResolver_IsDetected`) prouvant que le motif SAIT détecter — sinon
l'allowlist vide attendue serait un zéro aveugle. Réplique Python confirmée ci-dessus : 0/0.

### I1 (IMPORTANT, PREUVE) — falsifiable inter-comptes non dimensionnée

Ajout de `SameAccount_SecondStructuralDecisionInSameSession_Gets409` : même compte, une session,
DEUX achats. La première décision structurelle DOIT réussir, la seconde DOIT recevoir 409
STRUCTURAL_CAP_EXHAUSTED. Dimensionné par lecture directe de la formule du back
(`0016_world_geography_seed.sql` D2 : `block_count = 30 + ((district_id*7) % 51)`, district 16 ⇒
40 blocs, 4 pris par le kit de départ, 36 libres — largement assez pour deux achats consécutifs).
NON EXÉCUTÉ (même contrainte machine).

### I2 (IMPORTANT, PREUVE) — les 3 classes ne tournaient sous aucun juge

`Assets/Editor/MafiaCI.cs:34` (désormais `:36`) — `"DemoIdentity"` ajouté au tableau `Categories`,
même patron que les entrées précédentes (élargir, jamais un second point d'entrée).

### I3 (IMPORTANT, PRODUCTION) — la paire citymap est inerte sur le chemin nominal

Corrigé le docstring (pas le code — décision consciente, la propriété qui compterait
("préférer citymap au jeton du shell") est un choix produit hors du périmètre de ce lot) :
`DemoIdentityResolver.cs` porte désormais explicitement la réserve, avec le mécanisme exact
(`CityMapController.AuthThenHeat` sort tôt sur `IsAuthenticated` avant de lire sa propre paire
d'environnement) et sa conséquence pour un éditeur qui ne poserait QUE `MAFIA_CITYMAP_*`.

### MINOR

- **m1** — les 3 `.meta` sont générés (format minimal `fileFormatVersion: 2` + `guid` 32-hex,
  identique à `AuthClient.cs.meta` et aux ~135 autres scripts du dépôt — vérifié par comptage de
  lignes, pas de bloc `MonoImporter` ici car aucune de ces classes n'a de réglage spécial) et
  commités avec de nouveaux GUID vérifiés non-collisionnants contre tous les GUID existants du
  projet.
- **m2** — ancre `structural-decision-governor.service.ts:88-92` → `:86` (les deux citations,
  `DemoIdentityResolver.cs` et `DemoIdentityTwoAccountsPlayModeTests.cs:31`).
- **m3** — `onboarding-grant.service.ts:322-323` → `:323-324` ; `real-estate.service.ts:241` →
  `:242`.
- **m4** — `conversion-tunables.ts` cité désormais avec son répertoire complet
  (`operational/real_estate/conversion-tunables.ts`).
- **m5** — non touché dans le CODE (les ancres exactes `:53-55`/`:30-32` étaient déjà correctes
  dans les seeders eux-mêmes ; l'écart ne vivait que dans CES notes, ci-dessus au §1/§2, dont les
  plages citées sont maintenant `Tools/seed_operational_demo.mjs:53-55` /
  `Tools/seed_citymap_demo.mjs:30-32`).
- **m6** — `Resolve()` durci de `string.IsNullOrEmpty` à `string.IsNullOrWhiteSpace` (identifiant/
  mot de passe réduits à des espaces retombent désormais sur le fallback aussi). Nouveau test
  `Resolve_EnvVarWhitespaceOnly_FallsBack`.
- **m7** — DÉCIDÉ ET DÉCLARÉ (pas corrigé) : les deux variables d'une paire retombent
  INDÉPENDAMMENT, donc une identité MIXTE reste possible si un environnement n'est configuré qu'à
  moitié. Gardé tel quel — le back refuse bruyamment (401, jamais un faux succès), et forcer les
  deux variables d'une paire à être posées ENSEMBLE ajouterait une validation pour un cas déjà sans
  risque de succès silencieux sur la mauvaise combinaison. Documenté explicitement dans
  `DemoIdentityResolver.cs`.

### Ce qui reste NON EXÉCUTÉ après cette ronde (identique à la ronde 1, contrainte inchangée)

Compilation Unity réelle, la garde d'ensemble et les tests de comportement du résolveur sous NUnit,
la falsifiable §4 (2 comptes) et la nouvelle garde de capacité (I1) contre le back réel. Rien de
tout cela n'a été affirmé "vert" — seule la sanity de syntaxe (balance accolades/parenthèses/
crochets par oracle Python, 0 partout sur les 5 fichiers `.cs` touchés) et la réplique EXACTE du
scanner de garde (B1, ci-dessus) ont servi de filet.

## RONDE 3 — remédiation revue ⊥ r2 (2026-08-30, NOT_APPROVED 1 BLOCKING / 3 IMPORTANT / 4 MINOR)

Rapports : `/tmp/revue-demo-identity-r2.md` (ronde 2, cette remédiation) et `/tmp/revue-demo-identity.md`
(ronde 1, pour contexte). Contrainte machine RE-VÉRIFIÉE avant d'écrire une ligne, PUIS RE-RE-VÉRIFIÉE
juste avant ce commit : `docker ps -aq | wc -l` → 7 (base de dev seule, aucun gate) ; mais
l'énumération `/proc/<pid>/exe` trouve TOUJOURS l'éditeur Unity ouvert sur CE dépôt
(`-projectpath /home/erutheone/project/mafia-builder-city-clean`, PID 2643750 + ses 2 AssetImportWorker)
— donc, comme aux deux rondes précédentes : ÉCRIT + COMMITÉ, **RIEN LANCÉ** (aucune compilation
Unity, aucun run NUnit/PlayMode). Filet : oracles Python (réplique EXACTE des scanners C# livrés,
jamais une approximation) + sanity de balance `{}` (0 partout sur les 6 fichiers `.cs` touchés —
`(`/`)` bruts ne sont PAS un oracle fiable en présence de prose entre parenthèses dans les
commentaires, y compris sur `AppShell.cs` intact depuis la ronde 1 : diff pré-existant, non introduit
ici, vérifié par `git show HEAD:…`).

### LE BLOQUANT — reclassification COMPLÈTE des 11 sites `SetIdentity`, refaite ici (pas recopiée)

Réplique Python de `ScanDirectory`/`CountLiteralOccurrences` sur `.SetIdentity(` (même convention que
`.SignIn(`/`.SignUp(` — un point immédiatement suivi du nom, exclut structurellement la déclaration
`public void SetIdentity(…)`, précédée d'un espace) :

```
AVANT (HEAD 69b8afb, ronde 2) — Assets/Tests, RAW :
  TotalOccurrences=11, 6 fichiers :
    AccueilPanneauxGeometriePhotoPlayModeTests.cs: 1
    AppShellPlayModeTests.cs: 2
    CharpenteOuvertureSessionOverlayPlayModeTests.cs: 1
    HudPlayModeTests.cs: 1
    NavigationPlayModeTests.cs: 2
    VuePrincipaleCapturePlayModeTests.cs: 4
```

Chaque site OUVERT et classé un par un (jamais recopié depuis le rapport ⊥) :

| classe | population | sites | verdict | geste |
|---|---|---|---|---|
| **A** — identité délibérément INVALIDE | 2 | `CharpenteOuvertureSessionOverlayPlayModeTests.cs:492`, `NavigationPlayModeTests.cs` (NavF3, ex-`:225`) | ✅ correct, inchangé | rien à faire — l'échec voulu survit à tout environnement (rang 1 > rang 2) |
| **C** — compte FRAIS créé par le test lui-même (signup) | 5 | `HudPlayModeTests.cs:149`, `VuePrincipaleCapturePlayModeTests.cs:59,165,247,438` | ✅ correct, inchangé | rien à faire — un compte unique par run n'a aucun risque de collision, et l'explicite doit y battre l'environnement |
| **B** — compte de démo PARTAGÉ "citymap_demo", en DUR | 3 | `NavigationPlayModeTests.cs` (`MountShellAtCityTab`, fan-out **5** `[UnityTest]`), `AppShellPlayModeTests.cs` (2 shells, 1 test) | ❌ ÉPINGLÉ — corrigé | routage par `DemoIdentityResolver.Resolve(CityMapIdentifierEnvVar, CityMapPasswordEnvVar, "citymap_demo@example.test", "citymap-demo-pw")` **avant** `SetIdentity` — le littéral ne reste qu'un fallback |
| **B (no-op)** — défaut sérialisé recopié OCTET POUR OCTET | 1 | `AccueilPanneauxGeometriePhotoPlayModeTests.cs:341` | ❌ no-op devenu désactivation silencieuse — corrigé | **appel RETIRÉ** (pas reclassé) — voir raisonnement ci-dessous |

Compte : 2 + 5 + 3 + 1 = 11. ✅ (le rapport ⊥ comptait 2+5+4 en fusionnant B et le no-op ; ici
distingués parce que leur RÉPARATION diffère : les 3 premiers gagnent une résolution, le 4ᵉ disparaît.)

**Pourquoi retirer plutôt que router `Accueil:341`** : le test seed `operational_demo` via
`SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, …)`, qui lance `Tools/seed_operational_demo.mjs`
en sous-processus **héritant de l'environnement OS du process Unity** (`SeederSupport.RunSeeder` ne
surcharge que `PATH`, `ProcessStartInfo.EnvironmentVariables` copie le reste). Ce seeder lit
`MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` — EXACTEMENT les mêmes variables que
`AppShell.AcquireSessionThenActivateHome` résout nativement pour l'identité "operational" (rang 2,
`allowEnvironmentOverride` par défaut = `true` tant que `SetIdentity` n'est pas appelé). En NE
posant PAS `SetIdentity`, ce test reste donc TOUJOURS en phase avec ce que le seeder vient de peupler
— par défaut ET sous surcharge — sans code de plus. Router au lieu de retirer aurait ajouté un appel
`Resolve` inutile pour reproduire un comportement que `AppShell` fournit déjà nativement dès qu'on
NE l'empêche pas. Les deux constantes `OperationalEmail`/`OperationalPassword` (devenues sans autre
lecteur) sont retirées avec l'appel.

### Le monde dégénéré NEUF (I3 du rapport ⊥) — garde d'ensemble sur « qui désactive la surcharge »

`.SignIn(`/`.SignUp(` pincent QUI atteint le réseau — pas QUI rend la surcharge INERTE pour un shell
(zéro appel réseau direct, donc invisible aux deux gardes). Nouveau motif `.SetIdentity(`, MÊME
patron (contrôles positif+négatif, allowlist d'ENSEMBLE, portée déclarée), dans
`DemoIdentityResolverPlayModeTests.cs` :

```
APRÈS (arbre livré) — Assets/Tests, motif .SetIdentity( :
  RAW (avec le scanner lui-même, ses [TestCase] fabriquent le motif) : 23, 6 fichiers
  APRÈS EXCLUSION du fichier hébergeant le scanner (ScanDirectoryExcludingFile, portée = UN
  fichier nommé, jamais un répertoire — un vrai contournement ailleurs sous Assets/Tests resterait vu) :
    TotalOccurrences=10, 5 fichiers :
      AppShellPlayModeTests.cs: 2 · CharpenteOuvertureSessionOverlayPlayModeTests.cs: 1 ·
      HudPlayModeTests.cs: 1 · NavigationPlayModeTests.cs: 2 · VuePrincipaleCapturePlayModeTests.cs: 4
```

⚠️ Piège trouvé EN ÉCRIVANT cette garde (même famille que B1) : les `[TestCase]` de CE fichier qui
FABRIQUENT `.SetIdentity(` pour prouver que le scanner le détecte se comptent ELLES-MÊMES si la
portée n'exclut pas leur propre fichier — mesuré : 10 → 20 sans l'exclusion. `.SignIn(`/`.SignUp(`
n'ont jamais ce problème (portée = `Assets/Scripts`, hors de leur propre fichier de test) ; celui-ci
en a besoin car sa portée RÉELLE recouvre `Assets/Tests` tout entier. Fermé par
`ScanDirectoryExcludingFile` (exclusion NOMMÉE, un seul fichier — pas un répertoire, contrôlé par
`Scan_SelfExclusion_DoesNotBlindRealCallsElsewhere`, qui prouve qu'un vrai contournement écrit dans
un AUTRE fichier reste détecté).

`ExpectedExplicitIdentitySites` = les 5 fichiers de la table ci-dessus (Accueil n'y figure plus,
puisqu'il n'appelle plus `SetIdentity`). Elle rougirait AUJOURD'HUI si un 6ᵉ fichier apparaissait —
c'est le point.

### IMPORTANT — I1 : justification de m7 remplacée (pas la décision, sa MOTIVATION était fausse)

`DemoIdentityResolver.cs` (précédence, § "Les DEUX variables…") ne dit plus « le back refuse
BRUYAMMENT (401) » — RÉFUTÉ par les seeders du lot lui-même : `seed_operational_demo.mjs:53,55` et
`seed_citymap_demo.mjs:30,32` retombent sur les MÊMES constantes, indépendamment, comme le résolveur.
Le vrai mode d'échec : un `MAFIA_DEMO_IDENTIFIER` TOMBÉ (variable non posée) résout vers
`('operational_demo@example.test', 'operational-demo-pw')` — un compte RÉEL, SEEDÉ, qui authentifie
SANS ERREUR. Éditeur B silencieusement de retour sur le compte de A. La décision (ne pas forcer les
deux variables d'une paire ensemble) reste correcte — forcer la paire n'aurait pas fermé CE mode
d'échec (l'absence TOTALE des deux resterait valide) — mais pour la bonne raison : ce n'est pas une
validation qui manquait, c'est l'OBSERVABILITÉ (→ I2).

### IMPORTANT — I2 : le résolveur DÉCLARE désormais ce qu'il a résolu

`ResolveAndSignIn` imprime `[DemoIdentityResolver] régime=… identité=…` (jamais le mot de passe)
juste avant `auth.SignIn(...)`. Régime = "explicite" (`!allowEnvironmentOverride`), "env" (variable
non blanche lue), ou "défaut" (fallback). C'est le détecteur réel de I1 : un repli silencieux sur le
compte partagé s'imprime désormais comme `régime=défaut identité=operational_demo@example.test`, au
lieu d'être indiscernable d'un fonctionnement normal.

### IMPORTANT — I2 (MafiaCI) : la conséquence de la ronde 2 est maintenant ANNONCÉE

Ajouter `"DemoIdentity"` à `MafiaCI.Categories` (fait en ronde 2) fait entrer 3 classes sous CE juge
pour la PREMIÈRE FOIS. `Assets/Editor/MafiaCI.cs` porte désormais la clause explicite : un rouge au
premier run n'est PAS une régression de ce lot, c'est un défaut DORMANT jamais observé avant — son
diagnostic commence par déterminer s'il préexistait déjà, pas par accuser ce lot.

### IMPORTANT — m3 : le message d'échec de la garde `.SignIn(` nomme désormais DEUX causes

`RealNetworkSignInCalls_LiveOnlyInsideTheResolver_ScopedToAssetsScripts` ne pousse plus seulement
vers « élargir l'allowlist » : le message nomme aussi « un commentaire cite le motif littéralement »
(la cause RÉELLE du dernier rouge de cette garde, B1 ronde 2) et prévient qu'élargir l'allowlist sur
CE diagnostic certifierait la seconde cause au lieu de la corriger.

### MINOR

- **m1** — `DemoIdentityResolver.cs` § précédence, rang 1 : la portée du superlatif est désormais
  déclarée (« SEULE DÉCLARATION … portée de CETTE mesure, pas des APPELS ») — les 10 sites d'appel
  vivent tous dans `Assets/Tests`, jamais `Assets/Scripts`.
- **m2** — pas de correctif code ; consigné pour CE commit : la classe/population/compte sont collés
  ci-dessus, pas résumés en une phrase qui pourrait sur-déclarer (leçon de la ronde 2 elle-même).
- **m3** — voir IMPORTANT ci-dessus (le rapport le classe MINOR, traité ici avec la rigueur d'un
  IMPORTANT parce qu'il ferme définitivement le piège de citation de B1).
- **m4** — 3ᵉ motif de garde `SigninUrl`/`SignupUrl`, portée `Assets/Scripts`, allowlist
  `{CityMap/AuthClient.cs}` (3/3 mesuré, contrôle positif dédié
  `Scan_NewDirectUrlAccessSite_IsDetected`). Ferme le monde dégénéré n°3 du rapport ronde 1/2.

### Ce qui reste NON EXÉCUTÉ après cette ronde (identique aux rondes 1 et 2, contrainte inchangée)

Compilation Unity réelle ; les 6 nouveaux tests `[Test]` purs de cette ronde (aucun réseau — mêmes
garanties que la ronde 2 : logique pure ou scan de fichiers, zéro I/O réseau, zéro risque de
contamination d'un compte réel) ; la garde d'ensemble et les tests de comportement du résolveur déjà
écrits en ronde 1/2 ; la falsifiable §4 et la garde de capacité I1 contre le back réel. Filet :
oracles Python répliquant EXACTEMENT chaque scanner livré (voir les blocs ci-dessus), exécutés sur
l'arbre FINAL de cette ronde, jamais sur un brouillon intermédiaire.

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
