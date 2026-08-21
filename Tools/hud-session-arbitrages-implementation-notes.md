# hud-session-arbitrages-design.md — implementation-notes.md

Design : `Tools/hud-session-arbitrages-design.md` (B1/B2, gate ⊥ APPROVED sur `65ecc28`, 4
conditions du relecteur). Design **non modifié** par ce lot. Repo `mafia-builder-city-clean`,
branche `main`, à la suite de `65ecc28` (chunk 5 HUD v3.1).

## Ordre d'implémentation (demandé explicitement — F2 : forme d'abord, garde ensuite)

1. `HeatBucketResolver.cs` (`Severity` + `SeverityFor` + `SeverityColor`, M2 : `case Rank.Unknown`
   explicite + `default: throw`, `NeedleAngleDegrees` scindée `(Rank)`+`(string)`).
2. `ShellContracts.asmdef` référence `Theme` (nécessaire à `SeverityColor`).
3. `IShellTenant.cs` gagne `SetToken(string)` ; `IShellSessionSink.cs` perd `AdoptToken`, gagne
   `ShellSessionSinkLocator` (I2, dédupliqué).
4. `AppShell.cs` — B1 : `Token`/`SetIdentity`/`AcquireSessionThenActivateHome` remplacent
   `SessionToken`/`AdoptToken`/`AdoptTokenSequence` ; injection dans `MountTenant<T>`.
5. Les 10 implémenteurs d'`IShellTenant` — `SetToken` déjà présent sur 5 (Dashboard, BuildingCard,
   Laundering, PipelineOverview, LieutenantScreen — AUCUN changement) ; ajouté sur 2
   (CityMapController, avec garde `AuthThenHeat` ; ExceptionQueueController, AutonomyInboxController)
   ; no-op sur 2 (ExceptionDetailController, DistrictInteriorScreenController — mécanismes
   d'injection PRÉEXISTANTS et inchangés, `SetSession`/appelant externe).
6. **`TopBarController.cs` (F2, LA FORME D'ABORD)** — `zoneColors` : tableau positionnel +
   commentaires → 3 appels `HeatBucketResolver.SeverityColor(Severity.X)`, indexés par `Severity`.
7. `DashboardController.HeatAccent` (B2, LE BUG) — repointée sur le même résolveur ; la mauvaise
   paire {HOT,BURNING}→Severe corrigée en {WARM,HOT}→Moderate, BURNING→Severe.
8. `OrgVitalsPanelController.HeatLabel` (F1) — chaîne de ternaires → `HeatBucketResolver.Label`.
9. **`HudPlayModeTests.cs` (F2, LA GARDE ENSUITE)** — nouveau test `F2_SeverityTokenAccesses_...`
   (REUSE du patron `ChromeTabAccentAllowlistPlayModeTests`), hud-F6 refondue, hud-F2 durcie
   (M1, strict), M2 (nouveau test, `Enum.GetValues`), hud-F7 (neuve), hud-F1/F5 réécrites pour B1.
10. `NavigationPlayModeTests.cs`, `AppShellPlayModeTests.cs`,
    `DistrictInteriorScreenControllerPlayModeTests.cs` — ajustements de régression (voir § Deviations).

## Le sort de I2

**Tranché** : `ShellSessionSinkLocator` (déduplication du localisateur, `IShellSessionSink.cs`) reste
sur un chemin emprunté — `DashboardController.LoadDashboard` l'appelle toujours (son seul appel,
`PublishCitywideHeat`). `CityMapController` avait la copie octet-pour-octet identique ; sous B1 elle
n'a plus AUCUN appelant (`AdoptToken` a quitté le contrat, CityMap ne publie pas de heat) — **retirée
franchement** (branche 2 du choix posé par I2), pas laissée orpheline.

## Falsifiables — statut (run réel)

`category_names=["W3U2"]` : **64/64 verts**, deux fois de suite (stabilité vérifiée contre la
nature temporelle des correctifs de course ci-dessous). `category_names=["W3U1"]` : **36/36
verts**, deux fois de suite.

| # | statut | evidence |
|---|---|---|
| hud-F1 | 🟢 | réécrite pour B1 : shell signe lui-même (signup frais + `SetIdentity`), `TopBar.Loaded`, cash == lecture indépendante, ET `dashboard.Token == shell.Token` (le locataire n'a PAS re-signé) |
| hud-F2 | 🟢 | M1 : `Assert.Less` en CHAÎNE (COLD<WARM<HOT<BURNING), pas `Distinct().Count()` — une aiguille inversée rougirait maintenant |
| M2 | 🟢 | nouveau test : `Enum.GetValues(typeof(Rank))` énuméré, angles tous distincts (5 valeurs, Unknown comprise) |
| hud-F3 | 🟢 | inchangée — 200 + payload.data + citywide_bucket ∈ 4 |
| hud-F5 | 🟢 | inchangée fonctionnellement ; setup durci (course de montage, voir Deviations) |
| hud-F6 | 🟢 | refondue : `DashboardController.HeatAccent` (réflexion) == bande TopBar réelle == hex canon, pour les 4 buckets ; monotonie non stricte ; garde 3 couleurs distinctes exactement |
| hud-F7 | 🟢 | neuve : garde de dimensionnement (2 callsigns démo différents) AVANT 3 alternances Home↔City ; callsign stable au 1er palier à travers les 6 paliers ; cash final == wallet indépendant pour ce callsign |
| F2 (allowlist) | 🟢 | scan mesuré, 12 fichiers / 32 occurrences ; `TopBarController.cs` explicitement absent (régression fermée) |
| F1 (OrgVitals) | 🟢 | repointée, régression W3U1 vérifiée (36/36) |

## Deviations

1. **Trois races de montage trouvées EN LOT (invisibles fichier par fichier), toutes de la MÊME
   famille** : `AppShell.Start()` lance désormais `AcquireSessionThenActivateHome` en tâche de fond
   (signin+session/open+TopBar.Load, plusieurs allers-retours réseau), qui se termine par SON PROPRE
   `ActivateTab(Tab.Home)`. Un test qui bascule manuellement d'onglet après un UNIQUE
   `yield return null;` (patron pré-B1, où `Start()` montait Home SYNCHRONE) court désormais le risque
   que ce `ActivateTab(Home)` tardif écrase son propre montage. Mesuré et corrigé à 3 endroits :
   - `hud-F5` (`HudPlayModeTests.cs`) — `CityTabDistrictId` retombait à -1 en lot.
   - `NavigationPlayModeTests.MountShellAtCityTab` — `MissingReferenceException` sur des objets
     détruits par le remontage tardif de Home (nav-F1/F2/F5).
   - `AppShellPlayModeTests.C1F1`/`C1F2` — `MountedTenantType`/l'objet nommé du locataire étaient
     encore `null`.
   Fix uniforme : attendre `TopBar.Loaded` (ou, pour `nav-F3` qui a délibérément besoin que
   l'acquisition du shell ÉCHOUE, `CurrentTab == Home` — signal robuste aux deux branches,
   succès et échec) avant toute bascule manuelle d'onglet.
2. **`nav-F3` — la fenêtre "avant authentification" a structurellement disparu pour un locataire
   INJECTÉ.** Sous B1, un `CityMapController` monté APRÈS que le shell a son jeton reçoit
   `SetToken` de façon SYNCHRONE, avant même `Start()` — `IsAuthenticated` peut être vrai dès le
   premier frame, effaçant la fenêtre que ce test observait. Fix : ce test pose une identité de
   shell DÉLIBÉRÉMENT INVALIDE (`SetIdentity`) — le signin du shell échoue, `Token` reste vide,
   `MountTenant<T>` n'injecte rien, et `CityMapController` retombe sur le repli authentique (« rien
   reçu ⇒ il signe lui-même », `IShellTenant.cs`) — la fenêtre avant/après que ce test testait
   depuis toujours, inchangée dans sa PROPRIÉTÉ, changée dans son MOYEN D'OBSERVATION.
3. **`DistrictInteriorScreenControllerPlayModeTests.C7F3` — contrôle positif 8→9.** Ce test compte
   les sites `.SignIn(` connus dans `Assets/Scripts` comme contrôle positif anti-vacuité (« un zéro
   mesuré sur le mauvais chemin est le plus crédible des faux »). `AppShell.cs` porte désormais SON
   PROPRE appel `.SignIn(` (B1 §1.2) — un 9e site LÉGITIME, pas une dérive. Re-mesuré (pas recopié),
   constante mise à jour 8→9, nom de test corrigé en conséquence.
4. **`hud_topbar_fed_v1.png` (capture COLD, chunk 5) retirée du dépôt.** I1 établit explicitement
   qu'une capture COLD est indistinguable d'un échec (COLD = défaut par 3 chemins back). Remplacée
   par `hud_topbar_burning_v1.png` (ce lot), qui imprime la TRANSITION (avant : TopBar pas encore
   construit / après : bucket=BURNING rang=Burning angle=60) — la preuve que I1 exige.
5. **Ordre `ActivateTab(Home)` / sonde heat dans `AcquireSessionThenActivateHome`** — non prescrit
   par le design. Choisi : `ActivateTab(Home)` D'ABORD (juste après `TopBar.Load`), sonde heat
   ENSUITE (best-effort, ne bloque pas l'affichage). Mesuré : l'ordre inverse (sonde avant montage)
   laissait une fenêtre où `TopBar.Loaded==true` mais `MountedTenantGameObject==null` — rougi une
   fois (hud-F1), corrigé.

## Portées des comptes cités (F3/F4 — minors)

- **12 fichiers / 32 occurrences** des 3 tokens de sévérité (`DesignTokens.Current.accentSuccess/
  Warning/Danger`) : balayage Python indépendant, portée = `Assets/Scripts` (arbre entier,
  récursif), après le fix B2/F2. Rejoué par le test C# `F2_SeverityTokenAccesses_...` sur la même
  portée (`Application.dataPath/Scripts`).
- **10 implémenteurs d'`IShellTenant`** : portée = classes déclarant `: MonoBehaviour, ...
  IShellTenant` sous `Assets/Scripts` (grep sur la déclaration de classe, pas sur toute mention du
  nom de l'interface — cette dernière requête rendait 12-13 fichiers, incluant les 2 fichiers de
  définition d'interface eux-mêmes et un faux-positif de commentaire).
- **9 sites `.SignIn(`** : portée = `Assets/Scripts` entier (le contrôle positif de
  `C7F3`), motif littéral `.SignIn(` (sensible à l'espace/la casse — vérifié qu'aucun site connu ne
  l'écrit autrement).

## Evidence

Capture I1 : `Assets/Screenshots/hud_topbar_burning_v1.png`, rect `screenW=2560 screenH=1440
rectX=0 rectYTopDown=0 rectW=2560 rectH=112`. Transition imprimée :
```
I1_TRANSITION_BEFORE bucket=(TopBar pas encore construit) rank=n/a angle=n/a
I1_TRANSITION_AFTER  bucket=BURNING rank=Burning angle=60
```
État réel (compte operational_demo, identité par défaut du shell) au moment de la capture, MESURÉ
indépendamment avant tout test de ce lot (`GET /v1/city/district/16/heat` brut, hors Unity) :
`citywide_bucket=BURNING` — état accumulé d'un seed antérieur de cette session de travail ; le
ré-invoquer via `Tools/seed_operational_demo.mjs` échoue sur un plafond de jeu sans rapport
(`STRUCTURAL_CAP_EXHAUSTED`, "retry next session") — pas un bug de ce lot, juste un compte déjà à
l'état voulu.

⚠️ **CONSÉQUENCE (MINORS, verdict ⊥ closing) — pas seulement le constat.** Cette capture n'est PAS
reproductible aujourd'hui : `operational_demo` est actuellement le SEUL compte connu dont l'état
(BURNING) satisfait I1, et le mécanisme qui l'y a amené (le seeder) est actuellement cassé pour ce
compte par le plafond de session. Si cet état se perd (la heat décroît naturellement avec le temps
in-game côté back, ou un futur reset de stack/DB efface la ville) **personne ne peut regénérer cette
preuve avant que le seeder soit corrigé pour gérer `STRUCTURAL_CAP_EXHAUSTED`** (ex. ouvrir une
session fraîche — `POST /v1/session/open` — avant sa tentative de conversion, ce que le script
n'appelle actuellement JAMAIS) **ou qu'une nouvelle fenêtre de session s'ouvre naturellement**. Tant
que ce correctif n'existe pas, `hud_topbar_burning_v1.png` reste la SEULE preuve I1 valide de ce
dépôt — la traiter comme un artefact ponctuel à préserver, pas comme quelque chose de re-dérivable à
la demande. Hors périmètre de ce lot (seeder Node.js, pas du code HUD) — consigné, pas corrigé.

## Quatre gestes de clôture (verdict ⊥, 2026-08-21) — APPROVED, 0 BLOCKING

Le gate a validé HUD v3.1 avec 0 BLOCKING et demandé 4 gestes de clôture, aucun bloquant. Tous
faits, W3U2 68/68 (deux fois) + W3U1 37/37 (deux fois) après.

### IMPORTANT-1 — la course de montage tardif fermée EN PRODUCTION, pas seulement côté tests

`AcquireSessionThenActivateHome` appelait `ActivateTab(Tab.Home)` INCONDITIONNELLEMENT (les deux
branches, succès et échec) après 2-4 allers-retours réseau, alors que la TabBar est cliquable dès
`Start()` (`EnsureInitialized`). Un joueur qui touche « City » PENDANT l'acquisition se faisait
ramener de force sur Home, son locataire détruit — motif 6/6 pour la 2e fois dans ce chunk (round 1 :
course à 2 comptes fermée par isolation ; round 2 : montage tardif fermé par attente ; les deux fois
le mécanisme restait vivant EN PRODUCTION). Fermé cette fois avec le sentinel `(Tab)(-1)`
(`AppShell.cs:60`, « a named state, not a magic default ») : les DEUX appels `ActivateTab(Tab.Home)`
ne s'exécutent que si `CurrentTab == (Tab)(-1)` — rien n'a encore été activé. `TopBar.Load` reste
inconditionnel (le TopBar est persistant, affiche l'identité du shell quel que soit l'onglet actif) ;
seul le MONTAGE forcé de Home est gardé.

Falsifiable neuve : `AppShellPlayModeTests.LateHomeActivation_DoesNotOverride_PlayerNavigationDuringAcquisition`
— reproduction DÉTERMINISTE (pas dépendante du minutage réseau réel) : `ActivateTab(City)` appelé
AVANT même que `Start()` ne tourne (fenêtre synchrone même-frame que `AddComponent<AppShell>()`),
puis l'acquisition asynchrone du shell tourne à son terme — `CurrentTab` doit rester `City`,
`MountedTenantType` doit rester `CityMapController`.

### IMPORTANT-2 — l'angle mort de la garde F2, fermé par un second motif + contrôle positif

Le premier motif (accès direct aux 3 tokens `DesignTokens.Current.accentXXX`) a un angle mort
MESURÉ : 8 des 12 fichiers de son allowlist définissent des ALIAS locaux (`AccentMild =>
DesignTokens.Current.accentSuccess`). Une correspondance bucket→apparence DIVERGENTE écrite VIA
l'alias (`b == "HOT" ? AccentSevere : AccentMild`) ajoute ZÉRO occurrence du premier motif — F2
resterait VERTE à travers la classe exacte qu'elle existe pour attraper.

Second motif ajouté : les 4 littéraux de bucket (`"COLD"`/`"WARM"`/`"HOT"`/`"BURNING"`), MÊME
mécanisme (égalité d'ensembles contre allowlist mesurée : **4 fichiers, 24 occurrences**).
`BuildingCardController.cs` (2 occurrences, "HOT" seulement) est un **faux positif documenté** :
sa bande `temperature_status` (Crick cold-chain, `OPTIMAL_COLD|MODERATE|HOT`) est un domaine
ENTIÈREMENT différent qui partage par coïncidence le mot anglais "HOT" — vérifié : zéro occurrence
de "COLD"/"WARM"/"BURNING" dans ce fichier (les 3 littéraux les moins ambigus). Laissé sur
l'allowlist (pas de motif rétréci à 3 littéraux) : le total exact reste le détecteur, et une VRAIE
correspondance ajoutée dans ce fichier ferait quand même diverger le compte.

Contrôle positif ajouté (`Scan_DetectsAliasedBucketColorMapping_ViaBucketLiteralMotif`, 3 fixtures) :
prouve que le second motif attrape la forme aliasée (`b == "HOT" ? AccentSevere : AccentMild`,
`case "BURNING": return AccentSevere;`) — et qu'une définition d'alias SEULE (sans littéral de
bucket) ne compte pas comme une correspondance (0 attendu).

Revendication corrigée : le commentaire disait « aucune correspondance bucket→apparence hors du
résolveur » (absolu). Corrigé en « aucune correspondance DÉTECTABLE PAR CES DEUX MOTIFS » — ni l'un
ni l'autre ne voit un hex en dur ou une 3e forme d'indirection ; ce n'est pas une preuve
universelle, bornée comme `Scan_DetectsAllThreeSyntacticForms` l'est à SES 3 formes.

### hud-F7 — une ligne, CityMapController.Token == shell.Token à chaque palier City

Ajoutée : `CityMapController` est le SEUL locataire dont le repli ressusciterait la course à 2
comptes AU NIVEAU TENANT (son propre signin démo, citymap_demo, s'il n'était pas injecté) — ni
hud-F1 (Dashboard) ni le reste de hud-F7 (qui ne lit que le TopBar) ne le voyaient. Vérifié
maintenant à CHAQUE palier City, pas seulement au premier.

### MINORS

- **nav-F3** : le commentaire disait la fenêtre "avant authentification" INCHANGÉE. Précisé : le
  MÉCANISME est inchangé, le STATUT ne l'est pas — c'était le chemin NOMINAL avant B1 (CityMap
  signait toujours lui-même), c'est devenu le chemin DÉGRADÉ sous B1 (atteignable SEULEMENT en
  provoquant un échec délibéré du shell) — un joueur réel ne la traverse plus jamais.
- **Capture BURNING** : voir § CONSÉQUENCE ci-dessus (déplacée à côté du constat, pas seulement
  après).
- **hud-F6** : précision ajoutée — `HeatAccent` ET le manomètre consomment tous deux
  `SeverityColor` désormais, donc l'égalité surface-contre-surface est un témoin FAIBLE (un bug
  DANS le résolveur partagé ferait dériver les deux surfaces ENSEMBLE, identiquement, et cette
  égalité resterait verte). **L'assertion porteuse est l'égalité aux 3 hex canon** — le seul oracle
  réellement indépendant des deux surfaces.

SHA : voir le commit qui accompagne ces notes (`git log -1 --format=%H`).
