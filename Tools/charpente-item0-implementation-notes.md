# Item 0 (0.1 + 0.4) — round 2, correctifs de revue ⊥ — implementation-notes.md

Design : `Tools/charpente-item0-4-design.md`. Revue ⊥ round 2 : **NOT_APPROVED**, 7 classes de
finding (C1-C7). Ce document rapporte, pour chaque classe : la population mesurée, le compte
avant/après, la commande et la sortie **réelle collée**. Les motifs sont désignés par INDEX quand
leur littéral est celui qu'un contrôle mesure (socle CLAUDE.md — coller la sortie d'un `grep -cF`
réintroduit le motif qu'il mesure).

Logs bruts conservés hors du dépôt : `/tmp/charpente-round2/*.log` (le seul fichier neuf laissé
dans `Tools/` est celui-ci).

Méthode de run corrigée en cours de route (remontée par le contrôleur) : les 4 runs de contrôle
négatif sont **scopés à la catégorie `Charpente` seule** (narrowing temporaire de
`Assets/Editor/MafiaCI.cs:Categories` à `{ "Charpente" }`, restauré à `{ "W4P4a", "W3UDA", "W3U1",
"W3U2", "Charpente" }` avant toute mesure finale — vérifié par `diff` contre une sauvegarde prise
AVANT le narrowing). Le juge **complet** (5 catégories) n'est lancé qu'**une seule fois**, à la fin.

---

## C1 — Attestation de clôture sans sortie collée (le BLOQUANT)

### Contrôle négatif 0.1 — F0.1-a doit ROUGIR quand la scène de build n'a pas de shell

**ARMÉ** — Build Settings (`ProjectSettings/EditorBuildSettings.asset`) pointé sur
`Assets/Scenes/SampleScene.unity` (guid `99c9720ab356a0642a771bea13969a05`, confirmé sans
`AppShell` : `grep -c AppShell Assets/Scenes/SampleScene.unity` → `0`) au lieu de `Boot.unity`.

Commande :
```
LOG_FILE=/tmp/charpente-round2/neg-control-0.1-ARMED.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (`MafiaCI:` lines, `/tmp/charpente-round2/neg-control-0.1-ARMED.log`) :
```
MafiaCI: RunPlayModeTests started — 299 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteBootScenePlayModeTests.F0_1a_LaSceneDeDemarrageDuBuild_PorteAppShellTopBarEtLaBarreDOnglets —   aucun AppShell dans la scène de démarrage du build (Assets/Scenes/SampleScene.unity) — les 24 montages d'Assets/Tests prouvent que le shell marche, jamais qu'un joueur le rencontre.
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteBootScenePlayModeTests.F0_1b_ControlePositif_LaSondeSaitDireNonSurUneSceneSansShell —   la sonde ne trouve pas le shell là où il est
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteMontageLocatairesPlayModeTests.F0_4a_SousUnShell_ToutLocataireVivantEstDansContentSlot —   aucun AppShell dans la scène de démarrage du build (Assets/Scenes/SampleScene.unity)
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteMontageLocatairesPlayModeTests.F0_4b_LeJetonDuLocataireMonteParLeShell_DiffereDeCeluiMonteSeul —   aucun AppShell dans la scène de démarrage du build (Assets/Scenes/SampleScene.unity)
MafiaCI: RunPlayModeTests finished — passed=6 failed=4 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=33s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : F0.1-a ROUGIT**, avec la cause exacte (« aucun AppShell dans la scène de démarrage du
build (Assets/Scenes/SampleScene.unity) »). Collatéral attendu, PAS un défaut distinct : F0.1-b
(contrôle positif — sa PRÉMISSE « le shell est dans la scène de build » est maintenant fausse par
construction du contrôle négatif) et F0.4-a/F0.4-b (même précondition `Assert.IsNotNull(shell,...)`)
rougissent pour la MÊME raison injectée. F0.4-c (balayage de texte pur) et
`C5_ToutMembreDeNavTarget_AUnComportementNomme` (indépendant de la scène) passent : 6 = 10 − 4.

**DÉSARMÉ** — Build Settings restauré sur `Boot.unity`/`b5a856f8cf59822cda0fbb25bde23ae7`.
Commande :
```
LOG_FILE=/tmp/charpente-round2/neg-control-0.1-DESARME.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 299 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: RunPlayModeTests finished — passed=10 failed=0 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=34s timeout=900s issue=[sortie normale (RC=0)]`.

**Verdict : VERT — 10/10, aucun résiduel.**

### Contrôle négatif 0.4 — F0.4-a doit ROUGIR quand `ExceptionQueueController.OpenDetail` réarme sa racine de scène

**ARMÉ** — un seul site réarmé : dans `Assets/Scripts/Operational/Exceptions/ExceptionQueueController.cs`,
`OpenDetail`, la garde `if (nav != null)` remplacée temporairement par
`if (false && nav != null) /* CONTRÔLE NÉGATIF C1 round 2 — RESTAURÉ après le run */` — force la
branche de repli (racine de scène nue `Nav_ExceptionDetail`) inconditionnellement, pour CE site
SEUL (`DashboardController.OpenNav` reste inchangé, fixé).

Commande :
```
LOG_FILE=/tmp/charpente-round2/neg-control-0.4-ARMED.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 299 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteMontageLocatairesPlayModeTests.F0_4a_SousUnShell_ToutLocataireVivantEstDansContentSlot —   Nav_ExceptionDetail (ExceptionDetailController) n'est PAS un descendant de ContentSlot — locataires vivants nommément : Nav_ExceptionDetail (ExceptionDetailController), Tenant_AutonomyInboxController (AutonomyInboxController), Tenant_BuildingCardController (BuildingCardController), Tenant_CityMapController (CityMapController), Tenant_DashboardController (DashboardController), Tenant_ExceptionQueueController (ExceptionQueueController), Tenant_LaunderingController (LaunderingController).
MafiaCI: RunPlayModeTests finished — passed=9 failed=1 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=34s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : F0.4-a ROUGIT**, exactement sur l'objet mesuré (l'EFFET — `IsChildOf(ContentSlot)` —
pas l'appel). Preuve que le correctif C2 (§ ci-dessous, ensemble de TYPES) ne masque PAS ce défaut :
`CollectionAssert.AreEquivalent` sur les 7 types reste VRAIE (le type `ExceptionDetailController`
est toujours présent dans le compte, juste mal placé) — c'est la garde de containment, DISTINCTE,
qui rougit. Les deux gardes ne sont pas redondantes.

**DÉSARMÉ** — `ExceptionQueueController.cs` restauré depuis
`/tmp/charpente-round2/ExceptionQueueController.cs.original-backup` ; `diff` confirmé IDENTIQUE.
Commande :
```
LOG_FILE=/tmp/charpente-round2/neg-control-0.4-DESARME.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 299 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: RunPlayModeTests finished — passed=10 failed=0 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=33s timeout=900s issue=[sortie normale (RC=0)]`.

**Verdict : VERT — 10/10, aucun résiduel.**

### Falsifiables du lot — statut final (toutes mesurées, run réel)

| # | falsifiable | armé (défaut réintroduit) | désarmé |
|---|---|---|---|
| F0.1-a | scène de démarrage porte AppShell/TopBar/TabBar (ensemble de 4 onglets, corrigé C2) | 🔴 rouge, cause nommée | 🟢 vert |
| F0.1-b | contrôle positif de la sonde (scène du build → trouvé ; scène témoin → non trouvé) | 🔴 rouge (collatéral — prémisse cassée par l'ARMÉ 0.1) | 🟢 vert |
| F0.4-a | sous un shell, tout locataire vivant est dans ContentSlot (ensemble de 7 types, corrigé C2) | 🔴 rouge sur les DEUX contrôles négatifs (0.1 et 0.4) | 🟢 vert |
| F0.4-b | jeton : A (shell, via localisateur — traversée du localisateur ajoutée, C4) ≠ B (seul) | 🔴 rouge (collatéral sous 0.1 ARMÉ — précondition shell) ; 🟢 PASSE sous 0.4 ARMÉ (mutation scopée à OpenDetail/ExceptionDetailController, sans effet sur ExceptionQueueController) | 🟢 vert |
| F0.4-c | corps de montage unique (1 site, `AppShell.cs:395`) | insensible aux deux contrôles négatifs (balayage de texte pur) — 🟢 constant | 🟢 vert |
| C5 (nouveau) | tout membre de `NavTarget` a un comportement nommé | insensible aux deux contrôles négatifs (pas de scène/shell requis) — 🟢 constant | 🟢 vert |

---

## C2 — Garde anti-vacuité calée SOUS le dimensionnement du scénario

**Classe** : un plancher (`Assert.Greater`/`GreaterOrEqual`) sur une POPULATION NOMMÉE (locataires,
boutons) reste VERT même si la plupart des membres disparaissent — seul un compte EXACT (ensemble)
détecte la dégénérescence partielle.

**Population mesurée** — tous les `Assert.Greater(...)`/`Assert.GreaterOrEqual(...)` des deux
fichiers `Charpente*` :
```
$ grep -nE 'Assert\.Greater(OrEqual)?\(' Assets/Tests/PlayMode/CharpenteBootScenePlayModeTests.cs Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs
CharpenteBootScenePlayModeTests.cs:124:   Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1, ...)   [légitime, anti-vacuité Build Settings — PAS touché]
CharpenteBootScenePlayModeTests.cs:153:   Assert.Greater(onglets.Length, 0, ...)                                  [DÉFECTUEUX — F0.1-a, corrigé]
CharpenteMontageLocatairesPlayModeTests.cs:112:  Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1, ...)  [légitime, anti-vacuité Build Settings — PAS touché]
CharpenteMontageLocatairesPlayModeTests.cs:194: Assert.GreaterOrEqual(locataires.Count, 2, ...)                    [DÉFECTUEUX — F0.4-a, finding nommé par la revue, corrigé]
```
**Compte : population = 4** (2 légitimes, inchangés · 2 défectueux). Les deux légitimes vérifient
une EXISTENCE (« au moins une scène enregistrée »), pas une IDENTITÉ de membres — ils ne relèvent
pas de la même classe et n'ont pas été convertis.

**Après correctif** :
- F0.1-a : `Assert.Greater(onglets.Length, 0, ...)` → `CollectionAssert.AreEquivalent` sur les NOMS
  de GameObject des boutons (`Tab_Home`, `Tab_Org`, `Tab_Pipeline`, `Tab_More` — 4 exactement, canon
  §6, City exclue du dock).
- F0.4-a : `Assert.GreaterOrEqual(locataires.Count, 2, ...)` → `CollectionAssert.AreEquivalent` sur
  les NOMS DE TYPE des 7 locataires attendus (Dashboard + les 5 `OpenNav` + le détail d'exception).
- **Compte après : 2 défectueux → 0** (population totale des `Assert.Greater(OrEqual)?` = 2, tous
  deux légitimes).

Preuve que le remplacement mesure toujours quelque chose (anti-vacuité PRÉSERVÉE, pas seulement
resserrée) : `CollectionAssert.AreEquivalent` contre un ensemble non-vide de 4 (resp. 7) noms EXIGE
un compte exact — un monde vide ou partiel ROUGIT désormais, alors que l'ancien plancher le laissait
passer. Démontré en conditions réelles par le contrôle négatif 0.4 ci-dessus : le type
`ExceptionDetailController` restait dans l'ensemble (donc `CollectionAssert` seule ne suffirait pas
à détecter CE défaut précis) — c'est la garde de containment séparée (`IsChildOf`) qui ferme la
boucle. Les deux gardes sont complémentaires, pas redondantes.

---

## C3 — Corps de montage recopié à la main

**Classe** : un site d'appel qui recopie à la main la séquence de montage (au lieu d'appeler le
point d'entrée partagé) hérite silencieusement du retard que la fusion venait de corriger ailleurs.

**Population mesurée** (`grep -rnE '\.SetMountParent\(' Assets/Scripts Assets/Tests`, appels RÉELS
— exclut la prose et les littéraux de test) :

AVANT : **2** — `AppShell.cs:392` (corps fusionné, `ConstruireLocataire<T>`) et
`Assets/Tests/PlayMode/DistrictInteriorDioramaPlayModeTests.cs:117-122` (recopie à la main,
« replicating EXACTLY », sans `PublierInsetsDuChrome()` ni `SetToken`).

**Correctif** : `DistrictInteriorDioramaPlayModeTests.cs` (`C8F1_ScreenRoot_MountsInContentSlot_NeverAtCanvasRoot`)
appelle désormais `shell.MonterLocataireEnSurimpression<DistrictInteriorScreenController>()` (déjà
`public`, fait précisément les 4 gestes).

APRÈS (mesuré) :
```
$ grep -rnE '\.SetMountParent\(' Assets/Scripts Assets/Tests | grep -v '\.meta:'
Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs:320:  private const string MotifCorpsDeMontage = "tenant.SetMountParent(ContentSlot)";   [littéral de test, pas un appel]
Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs:342:  [TestCase("... tenant.SetMountParent(ContentSlot); ...")]                          [littéral de test, pas un appel]
Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs:344:  [TestCase("// … IShellTenant.SetMountParent... ")]                                  [littéral de test, pas un appel]
Assets/Scripts/Shell/AppShell.cs:25:   // `IShellTenant.SetMountParent(ContentSlot)` sur le locataire ...                                                [prose, pas un appel]
Assets/Scripts/Shell/AppShell.cs:395:  tenant.SetMountParent(ContentSlot);                                                                                [APPEL RÉEL — le seul restant]
```
**Compte : 2 → 1 appel réel.**

Test conservé vert : rejoué à la fois dans le run BASELINE (passed=193/197 — 0 échec sur
`C8F1_...`) et dans le run FINAL (passed=194/197 — idem) : le test n'a JAMAIS rougi après ce
correctif, sur deux runs indépendants séparés par ~50 minutes d'autres runs. Aucun `STOP` requis.

---

## C4 — Localisateur qui rend un objet ARBITRAIRE en cas d'ambiguïté

**Geste 1** — `ShellNavigatorLocator.Find()` (`Assets/Scripts/ShellContracts/IShellNavigator.cs`) :
`Debug.LogError` nommant le compte quand > 1 `IShellNavigator` vivants, puis choix DÉTERMINISTE
(le plus petit `GetInstanceID()`, ordre stable indépendant de `FindObjectsSortMode.None`).

**Geste 2** — F0.4-b (`CharpenteMontageLocatairesPlayModeTests.cs`) traversait le mécanisme
directement (`shell.MonterLocataireEnSurimpression<T>()`), ce qui ne prouve rien sur le CÂBLAGE
(aucun appelant de production ne tient de référence `shell` — les deux (`DashboardController.OpenNav`,
`ExceptionQueueController.OpenDetail`) passent par `ShellNavigatorLocator.Find()`). Corrigé : F0.4-b
appelle désormais `ShellNavigatorLocator.Find()`, affirme qu'il trouve CE shell
(`Assert.AreSame(shell, navA, ...)`), PUIS monte via le navigateur trouvé.

Preuve que ce chemin fonctionne : F0.4-b fait partie des 10/10 verts du run DÉSARMÉ 0.1
(`neg-control-0.1-DESARME.log`, `passed=10 failed=0`) et des 10/10 verts du run DÉSARMÉ 0.4
(`neg-control-0.4-DESARME.log`, `passed=10 failed=0`) — les deux fois avec la nouvelle traversée du
localisateur en place. Sous 0.1 ARMÉ, F0.4-b rougit en COLLATÉRAL (précondition shell absente),
attendu et sans rapport avec C4.

---

## C5 — Membre d'enum sans détecteur

**Population** : `DashboardController.NavTarget` — 6 membres (`None, CityMap, BuildingCard,
Pipeline, Exceptions, Autonomy`). AVANT : 0 test n'énumérait `Enum.GetValues` ; le `switch` (branche
shell ET branche de repli d'`OpenNav`) n'avait pas de `default`, silencieusement non-exhaustif sur
`None` (CS0161 ne s'applique pas à une méthode `void`).

**Geste** :
1. `DashboardController.OpenNav` : garde explicite `if (target == NavTarget.None) return;` en tête
   de méthode — les DEUX branches font désormais EXACTEMENT la même chose sur ce membre (rien),
   nommément documenté.
2. Nouveau test `CharpenteMontageLocatairesPlayModeTests.C5_ToutMembreDeNavTarget_AUnComportementNomme` :
   invoque `OpenNav` par réflexion (`private`) pour chacun des 6 membres, sur un `DashboardController`
   nu (branche de repli, la plus simple des deux — le garde `None` rend les deux branches
   identiques sur ce membre) ; asserte pour les 5 cibles réelles qu'un hôte portant le BON type de
   composant est monté, et pour `None` qu'AUCUN hôte n'est créé. Porte sa propre garde de PORTÉE
   (`Assert.AreEqual(6, membres.Length, ...)`) : si un 7e membre apparaît, ce test rougit d'abord
   ICI plutôt que de passer silencieusement à côté.

**Compte** : 6 membres, 6 couverts nommément (5 « monté » + 1 « aucune destination ») — 0 avant,
6/6 après. Vérifié vert dans TOUS les runs qui incluent la catégorie Charpente (baseline 193/197,
0.1 ARMÉ 6/10 — le test fait partie des 6 passants, insensible au défaut de scène — 0.1 DÉSARMÉ
10/10, 0.4 ARMÉ 9/10 — insensible au défaut de site — 0.4 DÉSARMÉ 10/10, final 194/197).

---

## C6 — `SetUp` qui ne nettoie qu'une partie de ce qui peut polluer

**Geste** : les deux `[UnitySetUp] SetUp()` (`CharpenteBootScenePlayModeTests.cs`,
`CharpenteMontageLocatairesPlayModeTests.cs`) détruisaient `AppShell` et `Canvas` résiduels
seulement. Étendu : un troisième balayage détruit TOUT `GameObject` portant un `IShellTenant`
(quelle que soit sa racine — attrape une racine `Nav_*` nue laissée par la branche de repli d'un
test voisin), et **imprime le compte** (`locatairesTues`) au même titre que les deux autres
(`shellsTues`, `canvasTues`) — un dispositif conditionnel qui ne déclare pas son régime est
indiscernable d'un dispositif inerte.

Preuve indirecte que ce nettoyage fonctionne sans effet de bord : les runs ARMÉ/DÉSARMÉ de C1
s'enchaînent (plusieurs fixtures `Charpente` dans le même domaine PlayMode, catégorie scopée) sans
un seul rouge de co-tenance — 10/10 sur les deux DÉSARMÉ, 0 échec attribuable à un résiduel
inter-tests.

---

## C7 — Énoncés datés laissés faux par le correctif

**3 corrections nommées, PARAPHRASÉES (jamais citées verbatim) :**

1. `AppShell.cs` (docstring d'`EnterDistrict`, ex-`:184-185`) — ne dit plus « Reuses EXACTLY
   MountTenant&lt;T&gt;'s own body (§3.3 : ":111-129")» (corps et plage de lignes qui n'existaient déjà
   plus après la fusion) ; dit désormais que le corps privé PARTAGÉ est `ConstruireLocataire<T>`,
   appelé par les TROIS sites.
2. `DistrictInteriorScreenController.cs` (justification du no-op `SetToken`) — ne dit plus
   qu'`EnterDistrict` « duplique le corps de MountTenant&lt;T&gt; SANS appeler la méthode générique »
   (faux depuis la fusion : `EnterDistrict` appelle bien `ConstruireLocataire<T>`, qui appelle
   `SetToken` génériquement, ici sciemment ignoré). Le no-op reste correct ; la raison a changé.
3. `DashboardController.cs` (intro d'`OpenNav`) — la première phrase (« Open the target controller
   ... a nav button creates a host GameObject + adds the component ») ne décrivait plus que la
   branche de repli ; reformulée pour le dire explicitement, sans contredire le paragraphe AMENDÉ
   qui suit.

**Repasse de la classe** — comptes réels des blocs de commentaires relus pour staleness dans les 3
fichiers touchés par ce lot (`AppShell.cs`, `DashboardController.cs`, `ExceptionQueueController.cs`) :
**12 blocs relus** (6 dans AppShell.cs, 3 dans DashboardController.cs, 2 dans ExceptionQueueController.cs,
1 partagé/référencé) — **3 stale → corrigés** (ci-dessus), **9 confirmés à jour ou correctement
scopés** (ex. « hors shell, personne n'appelle SetMountParent » reste vrai car explicitement borné
au cas hors-shell).

Étendu par prudence à 3 fichiers **voisins non touchés par ce lot** (hors du périmètre strict de
« les fichiers que ce lot a touché », donc non modifiés) : `IShellTenant.cs` (référence à
`DashboardController.OpenCityMap` toujours exacte, scopée « hors shell ») ·
`ExceptionDetailController.cs` (justification du no-op `SetToken`, sans rapport avec la fusion) ·
`CityMapController.cs` (« synchronous MountTenant&lt;T&gt; window » — incomplet depuis que
`MonterLocataireEnSurimpression&lt;T&gt;` monte aussi ce contrôleur, mais pas FAUX ; non touché, hors
mandat de ce round).

**Observé, hors périmètre, signalé sans correction** : `DashboardController.cs` (méthodes
`HeatLabel`/`HeatGlyph`/`HeatAccent`, ~ligne 510+) porte des auto-références de numéro de ligne
(« `:322-323` », « `:354` ») déjà fausses AVANT ce round (dérive datant du chunk `HeatBucketResolver`,
mesurée à HEAD : callers réels à `:341-342`, pas `:322-323`) — mes édits (+38 lignes nettes dans ce
fichier) ont mécaniquement aggravé l'écart numérique sans changer la CLASSE du défaut ni sa cause.
Non touché : hors mandat des classes C1-C7, dette pré-existante sur un sujet sans rapport
(résolveur de heat bucket, pas montage/navigateur).

---

## Run complet du juge (5 catégories, une seule fois, à la fin)

Commande :
```
LOG_FILE=/tmp/charpente-round2/full-run-FINAL.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (`MafiaCI:` lines) :
```
MafiaCI: RunPlayModeTests started — 299 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.CityMap.Tests.DistrictMapNavigationPlayModeTests.NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance —   scénario dimensionné — cette résolution DOIT produire une bande de letterbox (mesuré 0.0px), sinon l'assertion suivante ne teste pas le défaut visé
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.AppShellPlayModeTests.StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas —   prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.NavigationPlayModeTests.NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution —   nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà inclusives du débordement du médaillon, 26.3px mesurés) — un titre qui ne réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous
MafiaCI: RunPlayModeTests finished — passed=194 failed=3 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=243s timeout=900s issue=[sortie normale (RC=1)]`.

**passed=194 failed=3.** ⛔ **AUCUN des 3 échecs n'est dans la catégorie `Charpente`**, ni dans le
périmètre C1-C7 : les 3 fichiers concernés (`DistrictMapNavigationPlayModeTests.cs`,
`AppShellPlayModeTests.cs`, `NavigationPlayModeTests.cs`) ont été balayés (`grep -cE
"OpenNav|OpenDetail|IShellNavigator|ShellNavigatorLocator|MonterLocataireEnSurimpression|NavTarget|ConstruireLocataire"`)
et rendent **0** occurrence chacun — aucune dépendance à la surface touchée par ce round.

★ **Comparaison à deux runs indépendants, pas un seul** (contrainte explicite de la revue) :
- Run BASELINE (avant les 4 contrôles négatifs, log `_full-run-round2-baseline.log`, 298s) :
  `passed=193 failed=4` — les 4 échecs étaient `AppShellPlayModeTests.StaleAbandonedShell`,
  `NavigationPlayModeTests.NavF4`, `OrgVitalsPanelControllerPlayModeTests.C6F4`,
  `DistrictMapNavigationPlayModeTests.NavD12`.
- Run FINAL (ci-dessus, 243s) : `passed=194 failed=3` — MÊMES 3 échecs
  (`StaleAbandonedShell`, `NavF4`, `NavD12`), et `OrgVitalsPanelControllerPlayModeTests.C6F4`
  **est passé cette fois** (194 = 193+1, le C6F4 qui manquait est repassé au vert).

⇒ **`OrgVitalsPanelControllerPlayModeTests.C6F4` est confirmé MARGINAL/FLAKY sur cette machine**
(rouge une fois, vert l'autre, message « Timeout value of 180000 ms was exceeded » dans le run
BASELINE — dépassement de plafond mesuré, PAS une régression, exactement l'avertissement de la
revue). **Les 3 autres échecs sont STABLES sur les deux runs** — pré-existants, sans rapport avec
ce round (0 référence à la surface touchée), non corrigés (hors mandat C1-C7).

---

## Deviations (imprévus non bloquants, option conservatrice, consignés)

1. **Ambiguïté de libellé de la revue (C4)** — le texte dit « fais traverser le localisateur à
   **F0.4-a** », mais sa propre justification cite « F0.4-b appelle MonterLocataireEnSurimpression
   directement ». Mesuré : F0.4-a passe DÉJÀ par le localisateur (via `dashboard.OpenNav`/
   `queue.OpenDetail`, du code de production) ; c'est F0.4-b qui appelait `shell.MonterLocataireEn
   Surimpression<T>()` directement. Interprété comme un lapsus (F0.4-b est la cible réelle, cohérent
   avec la justification donnée) — option qui change le moins de surface et suit la seule lecture
   cohérente avec le texte qui l'accompagne. Consigné plutôt que deviné en silence.
2. **`LogAssert.ignoreFailingMessages = true;` ajouté au test C5** — non prescrit par la revue,
   ajouté par prudence défensive (cohérence avec le reste du fichier) même si le test, synchrone et
   sans `yield`, ne peut structurellement pas laisser un `Start()` s'exécuter avant que ses hôtes
   soient détruits. Option qui ne change aucun comportement testé.
3. **Choix déterministe de `ShellNavigatorLocator.Find()` (C4)** — le plus petit `GetInstanceID()`.
   Aucun précédent dans ce dépôt pour ce choix précis ; retenu pour sa stabilité (un entier posé par
   Unity à la création, indépendant de l'ordre de découverte) plutôt que pour une préférence
   produit — un choix produit reviendrait à l'auteur du design/à l'user si la classe d'ambiguïté
   devient un problème réel (aujourd'hui : 0 occurrence dans la suite verte).

## Ce que je n'ai pas pu vérifier

- **Que l'ambiguïté de `ShellNavigatorLocator.Find()` soit un jour RÉELLEMENT exercée en
  production.** Mesuré : la situation (2 `AppShell` vivants) existe dans
  `AppShellPlayModeTests.cs:237-256`, mais ce test n'appelle jamais `ShellNavigatorLocator.Find()`
  — donc le `Debug.LogError` ajouté n'a jamais été vu rougir/s'imprimer sur un run réel de ce dépôt.
  Le mécanisme est écrit et le choix déterministe est vérifiable par lecture, mais il n'existe pas
  de scénario exercé qui le PROUVE en conditions réelles.
- **La dérive pré-existante des auto-références de ligne dans `HeatLabel`/`HeatGlyph`/`HeatAccent`**
  (§C7) — signalée, pas mesurée plus finement (à quel chunk exact elle remonte), et non corrigée
  (hors mandat de ce round).
- **Les 8 fichiers `Assets/InitTestScene*.unity` non trackés** (accumulés par les runs successifs
  de ce round — artefact du test runner Unity en batchmode, pas du code de ce lot) — signalés au
  contrôleur, non supprimés (geste explicitement réservé au contrôleur : « je m'en occupe »).
- **`Assets/Fonts/DejaVuSans SDF.asset`, `Assets/Fonts/DejaVuSerif SDF.asset`,
  `Assets/TextMesh Pro/.../LiberationSans SDF.asset`** — modifiés par les runs Unity (régénération
  d'atlas SDF, effet de bord connu de ce dépôt sur toute ouverture de projet/run de test) — signalés,
  PAS commités, PAS restaurés par moi (le contrôleur fait le `git checkout` avant le commit).
