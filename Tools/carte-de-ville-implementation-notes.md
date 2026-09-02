# Carte de la ville (③) — nom de fiction, precinct_id servi, hygiène de montage — implementation-notes.md

Brief donné directement par le contrôleur de session (pas de design écrit à part), branche
`pilote-C`, worktree `mafia-unity-C`. Fichiers touchés : `Assets/Scripts/CityMap/WorldDtos.cs`,
`CityMapController.cs`, `DistrictCellView.cs`, `CityProjectionsClient.cs`, et les quatre suites
`Assets/Tests/PlayMode/CityMap{Fetch,Render,Heat,Detail}PlayModeTests.cs`. Aucun autre fichier
touché — `DistrictInteriorScreenController.cs`, `CityProjectionDtos.cs`,
`VuePrincipaleCapturePlayModeTests.cs` appartiennent à un autre implémenteur qui travaille en
parallèle dans le même worktree (mesuré présent dans `git status` au moment de conclure, jamais
édité par ce chunk).

## Ce qui a été livré

### 1. Nom de fiction

`DistrictDto` gagne `name` (`WorldDtos.cs:20-33`). `CityMapEnums.DisplayName(dto)`
(`WorldDtos.cs:190-197`) est le lieu UNIQUE de résolution du repli (`name` sinon
`name_canonical`) — appelé par `DistrictCellView.Bind` (tuile) et
`CityMapController.SelectDistrict` (titre du panneau détail), pour que les deux ne puissent pas
diverger. Jamais routé par `Libelle.De` : `name` est un littéral serví par le back, pas une clé
i18n (mesuré : aucune clé `game.fiction.district.name`).

### 2. `precinct_id` servi

`DistrictDto` gagne `precinct_id` (`WorldDtos.cs:20-33`). `CityProjectionsClient.Belief`/`Patrol`
gagnent un paramètre optionnel `int? precinctId = null` (repli sur
`PrecinctForDistrict(districtId)` si absent — signature élargie, tous les appelants existants hors
ce chunk restent inchangés). `CityMapController.BuildDetail` (`:720-733`) passe désormais
`cell?.Model?.precinct_id` aux deux appels ; `cell` peut être `null` (districtId sans cellule
correspondante), couvert par le `??`.

### 3. Catégorie `[Category("ScreenCarte")]`

Posée sur les quatre classes de suite. Vérifiée AVANT écriture : aucune collision de préfixe avec
les 21 catégories déjà présentes au moment de la mesure (balayage `python3` sur les `[Category(...)]`
de `Assets/Tests/PlayMode/*.cs`, ni `ScreenCarte` préfixe d'une existante ni l'inverse) — recontrôlé
après coup, une fois la 22ᵉ catégorie posée en parallèle par l'autre implémenteur
(`CaptureCarte`, `VuePrincipaleCapturePlayModeTests.cs`) : toujours aucune collision.

### 4. Hygiène de montage

Quatre propriétés vérifiées dans le corps, deux fausses (corrigées), deux déjà vraies (laissées
intactes) :
- **RectTransform étiré** — déjà vrai (`Stretch(rootRt, Vector2.zero, Vector2.zero)`,
  `CityMapController.cs` `BuildLayout`). Non touché.
- **`Start()`, jamais `Awake()`** — déjà vrai (aucun `Awake()` dans ce fichier, toute lecture de
  géométrie/mount-parent vit dans `Start()`/`BuildLayout()`). Non touché.
- **Ordre de fratrie** — FAUX : aucune garde nulle part. Corrigé, mais PAS par le patron à deux
  sites de `ShopScreenController.cs:105-135` (setter + `OnTransformParentChanged`) : ce patron
  répond à un mécanisme où le screen EST son propre `transform` reparenté par le shell APRÈS
  `SetMountParent`. Ici, `CityMapRoot` et `DetailPanel` sont des GameObjects SÉPARÉS, créés dans
  `BuildLayout()` (donc après tout reparentage du host), et jamais reparentés ensuite — un seul
  `SetAsLastSibling()` par racine suffit, posé à leur création (`CityMapController.cs`, dans
  `BuildLayout` pour `CityMapRoot`, dans `BuildDetailPanel` pour `DetailPanel`).
- **`ShellChrome.BottomInsetPx`** — FAUX, et à un endroit plus précis que prévu : le padding bas
  de `CityMapRoot` (racine + `ReserveSpaceForPanel`, qui écrasait le premier sans reprendre
  l'inset) ET, surtout, la géométrie du `DetailPanel` — son `sizeDelta.y=-16` ne mangeait QUE
  l'inset du haut ; son bord bas tombait EXACTEMENT sur le bord bas de `ContentSlot` (calcul via
  la formule `offsetMin/offsetMax` de Unity, vérifié à la main puis confirmé par le compilateur).
  Sous shell, `ContentSlot` couvre tout le canvas par conception, donc le Footer/« Entrer » du
  panneau passait sous le dock. Les trois sites corrigés partagent un seul calcul
  (`BottomPadding`/l'expression inline dans `BuildDetailPanel`), jamais dupliqués séparément.

## Deviations

- **Sibling-order : patron Shop non copié littéralement.** Voir §4 ci-dessus — appliquer le
  patron à deux sites (setter de `SetMountParent` + `OnTransformParentChanged`) aurait posé la
  garde sur le `transform` du HOST de `CityMapController`, qui ne porte aucun visuel (l'écran
  vit dans `CityMapRoot`, un enfant séparé). Option retenue : un seul `SetAsLastSibling()` par
  racine visuelle, à sa création, avec le raisonnement en commentaire à chaque site. Pourquoi
  conservateur : ça ferme la même classe de défaut (un locataire/panneau qui rendrait sous ses
  frères) sans poser un hook (`OnTransformParentChanged`) qui ne protégerait rien ici.
- **`ShellChrome.TopInsetPx` NON traité**, alors que le même gap existe symétriquement (le
  `DetailPanel` et le padding haut de `CityMapRoot` utilisent un littéral `16` nu, ignorant
  `TopInsetPx`, exactement comme `BottomInsetPx` l'était). Resté hors scope : les quatre
  propriétés à vérifier, telles que données, ne nomment que `BottomInsetPx`. Signalé ici plutôt
  que corrigé en silence — un futur chunk (ou une relecture) peut trancher s'il faut l'aligner.
- **Repli `PrecinctForDistrict` gardé, jamais retiré** — `precinct_id` coïncide 18/18 avec la
  formule aujourd'hui (mesuré par le brief, pas re-remesuré ici) ; la formule reste le repli pour
  tout appelant qui n'a qu'un `districtId` nu (aucun autre appelant trouvé par grep — `Belief`/
  `Patrol` n'ont qu'UN site d'appel dans tout le dépôt, `CityMapController.BuildDetail`).
- **Test unitaire pur ajouté** (`CityMapFetchPlayModeTests.DisplayName_FallsBackToNameCanonical_WhenNameMissing`,
  `[Test]` synchrone, zéro réseau/DB) pour couvrir la branche de repli de `DisplayName` que le
  back (qui sert toujours `name` aujourd'hui, 18/18) ne peut pas exercer en E2E. Assumé conforme
  à « E2E fonctionnels only, no-mock-DB » : ce test ne mocke ni ne contourne aucune DB, il
  n'en touche aucune — c'est un test de fonction pure, catégorie déjà présente dans ce dépôt
  (`DistrictNightTokensPlayModeTests.cs` et consorts mêlent `[Test]` et `[UnityTest]` dans le
  même fichier).

## Non fait, avec la raison

- Vérification du contrat `SetToken` (deux sources de jeton) : DEMANDÉE en lecture seule, PAS en
  correction. Résultat : vérifié VRAI dans le corps — `AuthThenHeat()` (`:127-136`) fait
  `if (IsAuthenticated) { ...; yield break; }` AVANT tout appel à `DemoIdentityResolver.
  ResolveAndSignIn` ; `SetToken(token)` (`:160-164`) pose `IsAuthenticated = !string.IsNullOrEmpty
  (token)` et est appelé par le shell AVANT `Start()` (fenêtre synchrone de
  `ConstruireLocataire<T>`, `AppShell.cs`). Un jeton non vide reçu du shell fait donc sauter le
  sign-in démo. Les identifiants en dur (`demoIdentifier`/`demoPassword`, `:29-30`) ne sont
  exercés que (a) hors shell — les trois suites `CityMapHeatPlayModeTests`/`CityMapDetailPlayModeTests`
  montent le contrôleur seul, sans `SetToken` — et (b) si le shell n'a pas encore résolu de jeton
  au moment du montage. Pas une dette à deux sources concurrentes : une seule source active à la
  fois, gardée par `IsAuthenticated`. Non touché, comme demandé.
