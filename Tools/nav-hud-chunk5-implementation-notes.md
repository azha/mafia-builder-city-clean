# nav-hud-design-v1.md, chunk 5 — HUD v3.1 — implementation-notes.md

Design : `Tools/nav-hud-design-v1.md` §6 (chunk 5, HUD v3.1), §8 (mondes dégénérés). Design
APPROVED, **non modifié** par ce chunk. Repo `mafia-builder-city-clean`, branche `main`
directement, à la suite du pivot fond pré-rendu (certifié clos ⊥) et de `geste 0` (deux résiduels
du pivot fermés dans le même passage — voir `Tools/pivot-fond-prerendu-p3-implementation-notes.md`
§ GESTE 0).

## Ce qui a été livré

### 1. Le maillon (§6.1)

`AppShell.cs` gagne `SessionToken`, `LastSessionOpen`, `AdoptToken(string token)` (idempotent SUR
LE MÊME jeton — un jeton différent rouvre légitimement une session, par conception : deux
locataires démo distincts, `§6.1` ne prescrit rien de plus) → `SessionClient.OpenSession` →
`TopBar.Load(token, dto.backlog_badge, dto.opened_game_day)`.

Deux publieurs câblés, aux ancres exactes citées par le design :
- `DashboardController.Boot()`, juste après `yield return SignIn(); if (!IsAuthenticated) yield
  break;` (design `:152`, `:158`).
- `CityMapController.AuthThenHeat()`, juste après `IsAuthenticated = true;` (design `:120`).

**Frontière d'assembly, pas prévue par le design mais mesurée dès le premier compile** : `Operational`
et `CityMap` NE référencent PAS l'assembly `Shell` (`Shell` dépend d'EUX — un
`FindFirstObjectByType<Shell.AppShell>` direct depuis un tenant aurait créé une référence
circulaire, qu'asmdef refuse). `IShellTenant` existe déjà pour EXACTEMENT ce problème dans le sens
inverse (le shell découvre les tenants) — `IShellSessionSink` (nouveau, `ShellContracts`) est son
miroir : les tenants découvrent le shell. `AppShell` l'implémente. Un tenant le trouve via
`FindObjectsByType<MonoBehaviour>(...).OfType<IShellSessionSink>().FirstOrDefault()` — **jamais**
`FindFirstObjectByType<IShellSessionSink>()` : mesuré par réflexion
(`GetGenericParameterConstraints()`) que ce générique Unity exige `T : UnityEngine.Object`, qu'une
interface ne satisfait jamais. Hors shell (tout test PlayMode existant qui monte un tenant seul) :
la recherche ne trouve rien, no-op — comportement identique à avant ce chunk.

### 2. Clés + manomètre heat (§6.2, §6.4)

`HeatBucketResolver` (NOUVEAU, `Assets/Scripts/ShellContracts/HeatBucketResolver.cs` — vit dans
`ShellContracts`, pas `Shell`, pour la MÊME raison d'assembly que ci-dessus : `Operational` a
besoin de l'appeler) — lieu UNIQUE de résolution des 4 membres de `HeatBucket`
(`city-event-bus.ts:484`) : `ResolveRank` (résolveur exhaustif, repli NOMMÉ `Rank.Unknown`, patron
`ResolveArtPhase`), `Label`/`Glyph` (byte-identiques aux anciens `DashboardController.HeatLabel`/
`HeatGlyph`), `NeedleAngleDegrees` (4 angles DISTINCTS, -60°/-20°/20°/60°, fonction PURE).
`DashboardController.HeatLabel`/`HeatGlyph` REPOINTÉS dessus (signature/visibilité inchangées,
seul le corps délègue — un lieu, pas deux résolveurs qui pourraient dériver l'un de l'autre,
§6.4 : « exactement la dérive que ce dépôt a déjà payée sur un type homonyme »).

`AppShell.PublishCitywideHeat(bucket)` — reçoit la valeur d'un tenant (Dashboard, REUSE de son
propre appel `:225`, PAS un 3ᵉ appelant) et la pousse au TopBar. **Repli** dans
`AdoptTokenSequence`, après `TopBar.Load` : si personne n'a publié ET que le tenant monté à cet
instant n'est PAS `DashboardController`, sonde elle-même (REUSE du même flux, probe district 16,
best-effort) — logique de décision PAR IDENTITÉ DE TENANT (pas par délai/timing), donc sans
fenêtre de course : si Dashboard est monté, on lui fait confiance (il publiera sous peu) ; sinon,
personne d'autre ne le fera.

`TopBarController` gagne le manomètre (`BuildManometre()`) : `ZoneRow` (3 bandes peintes,
`accentSuccess`/`accentWarning`/`accentDanger`, sa PROPRE `HorizontalLayoutGroup`) et `Needle`
(pivot bas-centre, tournée par `SetCitywideHeatBucket`) sont des FRÈRES, jamais parent/enfant —
sinon la Layout Group du premier écraserait la rotation du second à chaque rebuild.

### 3. day_phase (§6.3)

`TopBarController.SetDayPhase(string)` — état NOMMÉ `"—"` si `null`/vide, sinon la valeur
verbatim. `AppShell.EnterDistrictSequence` la pousse juste après `tenant.Render(...)`
(`tenant.LastFetch?.day_phase`, JAMAIS dérivée côté client). `AppShell.ActivateTab` la remet à
`null` au MÊME endroit où `CityTabDistrictId` se remet à -1 (pour EXACTEMENT la même raison —
toute activation d'onglet efface ce qui n'a de sens qu'EN district). Dette back (13ᵉ clé, forme F)
**non implémentée** ici, conformément à la consigne explicite du coordinateur.

## Falsifiables — statut (run réel)

Run `category_names=["W3U2"]` : **61/61 verts** (56 pré-existants + 5 nouveaux hud-F*, aucune
régression). Run `category_names=["W3U1"]` (TopBar/AppShell/SessionClient, chunks antérieurs
touchés indirectement par le repointage `HeatGlyph`/`HeatLabel` et l'ajout d'`AdoptToken`) :
**36/36 verts**.

| # | statut | evidence |
|---|---|---|
| hud-F1 | 🟢 | `AdoptToken(jeton réel)` → `TopBar.Loaded==true`, `RenderedCashText != "—"`, `CurrentWallet.cash_cents` == lecture INDÉPENDANTE (`GET /v1/economy/wallet` brut, AVANT `AdoptToken`) |
| hud-F2 | 🟢 | `HeatBucketResolver.NeedleAngleDegrees` sur les 4 buckets → 4 valeurs `Distinct().Count()==4`, fonction pure, 0 requête |
| hud-F3 | 🟢 | `GET /v1/city/district/16/heat`, jeton réel : `responseCode==200` (corps de succès EXIGÉ), `payload.data` parsé, `citywide_bucket` ∈ {COLD,WARM,HOT,BURNING} |
| hud-F4 | 🟢 (REUSE) | `SessionClientPlayModeTests.C3F3_...` (`:243`) re-vérifiée verte, 12/12 — aucune duplication écrite |
| hud-F5 | 🟢 | EN district (16, réel, via `EnterDistrict`) : `DayPhaseText` ∈ 4 valeurs réelles (prémisse) ; hors district (`ExitToCityMap`) : `DayPhaseText=="—"` ET `CityTabDistrictId==-1`, MÊME test |
| hud-F6 | 🟢 | réflexion sur `DashboardController.HeatGlyph` (private static, RÉEL, pas le résolveur appelé deux fois) : rang dérivé du glyphe == rang dérivé de l'angle, pour les 4 buckets |

## Deviations

1. **hud-F1 isolé de la course "deux locataires démo"** — MESURÉ (pas supposé) : sur cette stack,
   le compte démo de `DashboardController` (`operational_demo@example.test`) est déjà
   authentifiable (contrairement au précédent d'`AppShellPlayModeTests`, 401 mesuré là-bas).
   Laissé courir, `Boot()` publierait SON PROPRE jeton via `AdoptToken` — différent du mien, donc
   PAS bloqué par l'idempotence (§6.1 : idempotent sur le MÊME jeton seulement) — et une course sur
   lequel des deux `TopBar.Load` gagne aurait rendu ce test (sensible au CASH EXACT) non
   déterministe. Fermé en basculant vers l'onglet `More` (ne monte rien) immédiatement après le
   premier `yield return null;`, AVANT que `DashboardController.Start()` n'ait la moindre chance de
   tourner (différé d'une frame, comme pour Home lui-même) — détruit l'instance avant tout
   `Boot()`/`SignIn()`. Vérifié empiriquement : rouge reproductible (cash `962782000` au lieu de
   `1000000`) AVANT le correctif, vert après, deux fois de suite.
2. **`Tools/seed_citymap_demo.mjs` corrigé** (hors périmètre C# de ce chunk, mais bloquait le
   `[OneTimeSetUp]` partagé par hud-F5 ET par `NavigationPlayModeTests.cs`/chunk 2) : son
   `DELETE FROM buildings WHERE player_id=...` échouait avec une violation de FK
   (`lieutenant_assigned_building_id_fkey`) — un run antérieur (le heavy-advance déclenche
   l'assignation de lieutenant) laisse un lieutenant pointer vers un bâtiment que le RUN SUIVANT
   veut supprimer. Reproduit 2× (pas transitoire). Corrigé en détachant le lieutenant
   (`UPDATE lieutenant SET assigned_building_id = NULL WHERE ...`) avant le `DELETE` — la colonne
   est NULLable par conception (migration `0026` : « NULL si non-délégué »), donc ce reset est
   schema-compliant, pas un contournement. Vérifié : hud-F5 rouge (échec du seeder) avant, vert
   après, à deux reprises.
3. **Manomètre — représentation SIMPLE, pas le cadran radial de l'artefact de référence.** §0 du
   design : le juge de CE chunk est fonctionnel (falsifiables), le pixel-perfect du HUD vient avec
   les écrans doctrine (#24). 3 bandes verticales peintes + une aiguille rectangulaire pivotée —
   prouve hud-F2/hud-F6 sans investir dans un cadran radial dont la forme exacte n'est pas
   spécifiée par ce chunk.
4. **`AppShell` gagne un champ `baseUrl` (`[SerializeField] private string baseUrl = "http://localhost"`)**
   — absent avant ce chunk (le shell ne consommait aucune route, design §3.0 pré-chunk-5). Même
   patron que TOUS les autres contrôleurs du dépôt (`DashboardController`, `CityMapController`,
   `TopBarController`).
5. **`clientVersion` de `SessionClient.OpenSession`** — le design ne fixe pas cette valeur pour
   l'appelant de production (les tests utilisent des littéraux `"e2e-w3u1-1.0.0"`). Choisi
   `Application.version` (lit `bundleVersion: 0.1.0` de `ProjectSettings`) — jamais un littéral en
   dur, cohérent avec le reste du dépôt (`FormatCash` : jamais de symbole en dur).

## Evidence

Capture du TopBar alimenté (maillon + manomètre + day_phase, flux réel) :
`Assets/Screenshots/hud_topbar_fed_v1.png`, rect `screenW=2560 screenH=1440 rectX=0 rectYTopDown=0
rectW=2560 rectH=112`. État imprimé au moment de la capture : `cash=$10,000.00 dayPhase=DAWN
heatBucket=COLD heatRank=Cold needleAngle=-60 cityTabDistrictId=16` — `heatBucket=COLD` (pas la
valeur "HOT" que le script de capture avait publiée manuellement en premier) confirme que le REPLI
de l'AppShell (repli sur sonde propre, § ci-dessus) a bien tourné et écrasé la valeur de test par
la vraie valeur sondée — preuve du mécanisme, pas seulement de son code.

SHA : voir le commit qui accompagne ces notes (`git log -1 --format=%H` au moment du commit).
