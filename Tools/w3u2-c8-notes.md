# W3.U2 / C8 — L'écran — notes d'implémentation

Design : `docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md` (repo `mafia-w3u2`), chunk C8
(§3, lignes 1464-1502), livrables **U-9** (l'écran : grille, socle, brume, bords, sol) et **U-15**
(palier de nuit, D8). Design APPROVED après 7 revues ⊥ — exécuté tel quel, aucune décision de
conception rouverte ici.

⛔⛔ **MODE LÉGER** (ruling contrôleur, reconduit sur ce chunk) : aucun run Unity (batchmode compris),
aucune stack Docker, aucun `Tools/run-unity-check.sh` n'a été exécuté pour ce chunk. Tout ce qui suit
est une mesure **statique** (lecture de fichiers, oracles Python indépendants reproduisant fidèlement
la logique C#) — jamais une exécution PlayMode.

## Ce qui a été livré

- **U-9 — l'écran** (`Assets/Scripts/CityMap/DistrictInteriorScreenController.cs`, étendu — C7 avait
  livré le point d'entrée data seul) : la classe implémente désormais `MafiaCleanCity.Shell.
  IShellTenant` (`SetMountParent`), construit sa racine ("DistrictInteriorRoot") PARESSEUSEMENT au
  premier appel de `Render(dto)` (pas à `Start()`/`Awake()` — voir § Deviations (a) pour pourquoi
  `SetSession` et `Render` restent NON couplés dans ce chunk). `RenderNightDiorama` bâtit :
  - la grille (une cellule par entrée de `blocks[]`, positionnée par `(x,y)`, `GridArea` dimensionnée
    depuis `grid.width`/`grid.height` — C8-F2) ;
  - **socle** (`nightBase`) sous chaque bâtiment construit ;
  - **sol** (engagement 6, ≥3 rendus distincts, fonction déterministe de `(x,y)` — § Deviations (b)) ;
  - **hors-district sourd** (engagement 5, `nightOutOfDistrictMuted`, remplit toute la racine sous le
    reste) ;
  - **brume** (`nightHaze`, par-dessus tout, `raycastTarget=false`) ;
  - le sprite de bâtiment via `BuildingSpriteSlots.Current.Resolve(operational_type)` — **premier
    appelant de PRODUCTION** de ce resolver (C6 ne lui avait donné que son propre test) ;
  - un libellé de type par bâtiment construit (`TypeLabel`, copie locale du patron
    `BuildingCardController.TypeLabel` — § Deviations (e)).
- **U-15 — le palier de nuit** (D8) : `DioramaArtPhase` (enum, 3 membres :
  `NightHero`/`NonHeroFallback`/`Unknown`) + `ResolveArtPhase(string)`, un `switch` EXPLICITE sur les 4
  valeurs de fil connues (`DAWN`/`DAY`/`DUSK` → `NonHeroFallback` ; `NIGHT` → `NightHero`), toute autre
  valeur → `Unknown` (jamais avalée par le repli des 3 quarts nommés). `Render(dto)` bâtit soit le
  diorama complet (`NightHero`), soit un panneau NOMMÉ (`DayPhaseFallbackPanel`, § Deviations (d)) pour
  `NonHeroFallback`.
- **Tests** (`Assets/Tests/PlayMode/DistrictInteriorDioramaPlayModeTests.cs`, `[Category("W3U2")]`) :
  4 `[UnityTest]` couvrant C8-F1 à C8-F5 (voir tableau ci-dessous).

## Falsifiables — statut

| # | quoi | statut |
|---|---|---|
| C8-F1 | confinement — racine enfant effectif de `ContentSlot`, Canvas à exactement 3 enfants | ÉCRITE, différée |
| C8-F2 | grille = blocs reçus, chaque bâtiment sur SA cellule (jointure par `block_id`→`(x,y)`) | ÉCRITE, différée |
| C8-F3 | garde R2.2 (aucun texte n'est un nombre nu), scénario dimensionné (texte réellement rendu) | ÉCRITE, différée |
| C8-F4 | le J0 tient : 40 cellules dont 36 en silhouette sourde | ÉCRITE, différée (combinée à C8-F2, même scénario) |
| C8-F5 | mapping EXPLICITE : 3 paliers non-héros → repli déclaré, NIGHT → art de nuit | ÉCRITE, différée |

## Evidence statique (obtenue SANS Unity — oracles indépendants)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

### Balance syntaxique — scanner string/commentaire-aware (REUSE du scanner de C7)

```
$ python3 -c "... scanner qui suit l'état chaîne/char/commentaire ..."
Assets/Scripts/CityMap/DistrictInteriorScreenController.cs        -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Tests/PlayMode/DistrictInteriorDioramaPlayModeTests.cs     -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
```
**Aucun compilateur C# réel n'a tourné** — ce contrôle prouve l'absence d'un déséquilibre structurel
grossier, pas l'absence de toute faute de syntaxe fine ni de faute sémantique — voir § RUNS DIFFÉRÉS.

### C7-F3 non régressée — re-balayage `.SignIn(` après extension du fichier

```
$ python3 -c "... os.walk('Assets/Scripts'), count('.SignIn(') ..."
total .cs files under Assets/Scripts: 50
.SignIn( hits: 8   (INCHANGÉ — mêmes 8 fichiers que la mesure de C7)
diorama contains .SignIn(: False
```
L'extension du fichier pour C8 (IShellTenant, `Render`, la grille) n'a introduit AUCUN appel signin —
C7-F3 reste vraie sur le fichier étendu.

### C7-F3 (identifiant sérialisé) non régressée — balayage des identifiants de champ

```
$ python3 -c "... regex sur les déclarations de champ du fichier étendu ..."
field-ish identifiers found: ['CellSize', 'RenderedTexts', 'ScreenRoot', 'baseUrl', 'initialized',
  'mountParent', 'projections', 'renderedTexts', 'root']
banned matches (password/identifier/callsign, substring): []
```
Balayage approximatif (regex, pas la réflexion C# réelle que fait le test) — tous les champs neufs de
C8 (`root`, `mountParent`, `ScreenRoot`, `RenderedTexts`/`renderedTexts`, `CellSize`) sont absents du
fichier C7 d'origine et ne portent aucune des 3 sous-chaînes interdites.

### Unicité des symboles neufs

```
$ grep -rn "DioramaArtPhase\b" Assets/Scripts Assets/Tests | grep -v les-deux-fichiers-neufs
(vide)
```
`DioramaArtPhase` n'existe nulle part ailleurs dans l'arbre — pas d'homonyme (leçon du socle sur les
types homonymes exportés dans le même répertoire).

### GUID du `.meta` neuf — vérifié sans collision

```
$ python3 -c "import uuid; print(uuid.uuid4().hex)"
b52869d07c4d41c296465edcba06e45e
$ git grep -l b52869d07c4d41c296465edcba06e45e ; echo "exit=$?"
exit=1   (aucun hit — pas de collision)
```

### Grid shape (district 16, "verge-a") — re-dérivée de la migration, pas recopiée

```
$ grep -n "block_count" services/game-back/.../0016_world_geography_seed.sql   (repo mafia-w3u2)
30 + ((v.id * 7) % 51) AS block_count
```
Pour `id=16` : `30 + (112 % 51) = 30 + 10 = 40` — confirme le "40 blocs" de C8-F4 et le "4 bâtiments
sur 40 blocs" du design. `coordinates = {"x": (n-1)%10, "y": (n-1)/10}` ⇒ `grid = {width:10, height:4}`
côté serveur (D2 : "calculé depuis les blocs réels"). Les tests de ce chunk ne HARDCODENT pas ce 40 —
ils l'assertent contre la valeur RÉELLEMENT reçue (`dto.blocks.Length`), ce calcul ne sert qu'à
documenter POURQUOI 40 est la valeur attendue.

## RUNS DIFFÉRÉS (à la fenêtre de runs groupée du contrôleur)

1. **Compilation Unity réelle** — aucune erreur de compilation n'a pu être confirmée par le
   compilateur réel ; vérifiée seulement par relecture manuelle ligne à ligne + le scanner syntaxique
   ci-dessus. Risque résiduel identique à celui déjà consigné en C5/C6/C7.
2. **Les 4 `[UnityTest]` de ce chunk, vus par un run réel** — aucun n'a été exécuté. Dépendance stack :
   C8-F2/F4/F3/F5 signent chacun un compte FRAIS (`AuthClient.SignUp` + `session/open`) contre
   `http://localhost` (Traefik @ le dépôt `mafia-w3u2`, branche `lot/w3.u2`) — jamais vérifié cette
   session. C8-F1 ne consomme aucune route (structurel, comme C1-F2).
3. **Le juge lui-même** — `LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod
   MafiaCI.RunPlayModeTests`. Attendu : `passed >= <baseline C7> + 4` — 4 `[UnityTest]` neufs
   (`C8F1_...`, `C8F2_C8F4_...`, `C8F3_...`, `C8F5_...`), `failed == 0`.
4. **Le rendu visuel** — ni la grille assemblée, ni la teinte du sol, ni le panneau de repli n'ont pu
   être VUS (mode léger). Question d'É3 pour le rendu FINAL (§4-4 du design) ; le mécanisme lui-même
   (compte de cellules, jointure bâtiment↔bloc, mapping day_phase) est ce que les 4 tests prouvent
   sans avoir besoin de voir un pixel.
5. **Le `.meta` neuf** — écrit à la main, forme minimale 2 lignes, suivant le format des `.meta`
   voisins de C5/C6/C7 (vérifiés octet à octet dans ces chunks). GUID généré par `uuid.uuid4().hex`,
   vérifié sans collision (ci-dessus). Unity doit confirmer l'import à la fenêtre.

## Deviations

### (a) `SetSession` et `Render` restent NON couplés dans ce chunk

**Quoi** : le design ne dit pas explicitement si un fetch réussi (`SetSession`) doit déclencher
automatiquement `Render`. Coupler les deux (`SetSession`'s success callback appelant `Render(dto)`)
semblait le geste naturel pour un écran "complet".

**Pourquoi c'est un imprévu non bloquant** : test du socle appliqué — aucune falsifiable C8 n'exige
que le succès du fetch déclenche le rendu (C8-F2..F5 pilotent toutes `Render` DIRECTEMENT, avec des
payloads réels-mais-réécrits ou fabriqués — jamais via `SetSession`). Et le coupler AURAIT introduit
une régression réelle : le smoke test déjà fermé de C7
(`C7F3_SetSession_InjectedBearer_FetchesRealDataWithoutTheComponentSigningItselfIn`) appelle
`SetSession` sur un host FRAIS sans jamais monter de shell — si `SetSession` avait construit un Canvas
via `Render`, ce Canvas serait resté orphelin après le test (le `TearDown` de C7 ne détruit que son
propre `hostGo`, pas un Canvas indépendant), polluant le domaine PlayMode partagé pour les tests
suivants — EXACTEMENT le piège que `AppShellPlayModeTests` documente pour son propre `ShellCanvas`.

**Option retenue** : `Render(dto)` reste un point d'entrée PUBLIC, INDÉPENDANT, appelé explicitement.
Sa racine se construit PARESSEUSEMENT (au premier appel), jamais à `Start()`/`EnsureInitialized()`.
Aucun fichier de C7 n'a été touché. Un futur chunk qui câble une navigation réelle vers cet écran
(aucun ne le fait encore — D9 : "personne, en production, ne détient et ne distribue un jeton")
appellera les deux explicitement, avec un `TearDown` pensé pour les deux dès le départ.

### (b) "Sol à ≥3 textures avec usure placée" (engagement 6) — mécanisme non prescrit par le design

**Quoi** : le design nomme l'exigence (C8, phrase d'introduction : "sol à ≥ 3 textures avec usure
placée (engagement 6)") mais aucune décision D1-D9 ni aucune falsifiable C8-F* n'en précise le
mécanisme (quelles textures, quelle fonction de placement).

**Pourquoi c'est un imprévu non bloquant** : test du socle appliqué — aucune falsifiable de ce chunk
ne dépend de la fonction exacte choisie ; §4 point 3 du design classe explicitement "le rendu visuel
des placeholders assemblés" comme une question d'É3, pas de ce chunk.

**Option retenue** : `FloorTint(x, y)` — 3 rendus distincts dérivés des DEUX tokens déjà provisionnés
par C5 pour ce diorama (`nightBackground` seul · `Lerp(nightBackground, nightBase, 0.5)` ·
`nightBase` seul), sélectionnés par `(x + y) % 3` — une fonction DÉTERMINISTE de la position (jamais
`Random`), ce qui satisfait littéralement "usure PLACÉE" (l'énoncé oppose explicitement le placement
au tirage aléatoire). Aucun nouveau champ `DesignTokens` créé : R2.3 (tunables jamais inline) est
respecté en réutilisant des tokens déjà `.asset`-backed plutôt qu'en inventant deux couleurs brutes en
C#.

**Alternative rejetée** : ajouter 2-3 nouveaux champs `DesignTokens` dédiés au sol — rejetée parce
qu'aucune falsifiable ne les réclame et que cela aurait élargi la surface R2.3 (nouvelles clés
`.asset` à maintenir) sans bénéfice mesurable pour ce chunk.

### (c) `DistrictTintedImage`/`dto.profile` NON consommé par cet écran

**Quoi** : D4 dit du composant `DistrictTintedImage` (livré par C6, zéro appelant de production
avant ce lot) : "Ce lot lui en donne un". `dto.profile` est explicitement décrit par D2 comme "la clé
de jointure des sous-teintes, déjà sur le fil" — suggérant qu'UN chunk de ce lot doit l'appliquer.

**Pourquoi c'est un imprévu non bloquant, pas un conflit** : aucune section C8-F1..F5 ni aucune
section C9/C10/C11 ne nomme `DistrictTintedImage` ou `dto.profile` comme un livrable à câbler
précisément. Et j'ai mesuré une INCOMPATIBILITÉ réelle avec l'endroit le plus naturel : appliquer
`DistrictTintedImage.ApplyTint(profile)` à l'arrière-plan "hors-district" REMPLACERAIT entièrement sa
couleur par la teinte résolue (proche du blanc pour la plupart des profils, `ApplyTint` écrit
directement `_image.color`), ce qui CONTREDIRAIT l'exigence explicite "hors-district SOURD"
(engagement 5, un token dédié `nightOutOfDistrictMuted` délibérément sombre). Inventer un AUTRE
endroit (une couche de teinte additive sur le sol, par exemple) serait deviner une architecture que
l'auteur n'a pas spécifiée — exactement ce que le socle interdit pour un conflit.

**Option retenue** : ne PAS câbler `DistrictTintedImage` dans ce chunk. `dto.profile` reste lu par le
DTO (C7) mais n'a pas de consommateur visuel dans C8. Consigné ici pour qu'un chunk ultérieur (C9/C10,
ou la clôture C11) puisse trancher où l'appliquer — ou pour que la revue ⊥ le signale si elle juge que
D4's promesse doit être honorée précisément dans ce chunk.

### (d) Le contenu du panneau de repli (`DayPhaseFallbackPanel`) — texte non prescrit

**Quoi** : D8/C8-F5 exigent un "repli DÉCLARÉ" pour les 3 paliers non-héros, sans préciser son
contenu visuel exact.

**Pourquoi c'est un imprévu non bloquant** : C8-F5 vérifie que le repli est un état NOMMÉ et
DISTINCT de l'art de nuit (pas son contenu littéral). Un objet nommé `DayPhaseFallbackPanel` +
un message textuel (sans nombre nu, R2.2) suffit.

**Option retenue** : un panneau plein-écran (`nightOutOfDistrictMuted`) + un message TMP centré. Bas
risque, remplaçable sans toucher aucune falsifiable le jour où l'art réel des 3 paliers arrive (D8 —
c'est précisément l'événement qui doit faire ROUGIR C8-F5, le détecteur de péremption du différé).

### (e) `TypeLabel` — copie locale du patron `BuildingCardController.TypeLabel`

**Quoi** : `BuildingCardController.cs:1061` porte déjà un `TypeLabel(string)` mappant
`operational_type` → libellé humain, avec les mêmes 10 cas.

**Pourquoi ce n'est pas une violation R9.3/DRY** : R9.3 porte sur la PERSISTENCE (ch09 = source de
vérité, jamais dupliquée) — pas sur des chaînes d'affichage UI. Le patron ÉTABLI de ce dépôt est que
CHAQUE écran porte ses propres helpers de libellé (`LaunderingController.CleanlinessLabel`,
`BuildingCardController.SetupLabel`, etc.) plutôt qu'une dépendance croisée entre modules d'écran pour
une chaîne de présentation. Importer `BuildingCardController` depuis `CityMap` juste pour un libellé
aurait été une dépendance plus lourde que la duplication qu'elle évite.

### (f) `implementation-notes.md` — REUSE de la pratique déjà établie en C5/C6/C7

Comme en C5/C6/C7 : `implementation-notes.md` n'existe pas comme fichier suivi dans ce dépôt. Les
déviations sont consignées ici **et** dans les messages de commit correspondants.

Aucun conflit avec le canon rencontré — les 6 points ci-dessus sont des choix d'implémentation
matériels (mécanisme non prescrit par le design, ou option la moins coûteuse conforme à la lettre du
design), jamais des désaccords avec la spec.

## ⚠️ Correctif de fenêtre (post-C10) — voir `Tools/w3u2-c10-notes.md` § Correctifs de fenêtre

Le juge final (première exécution réelle, fenêtre C8-C10) a fait rougir **C8-F5**
(`DistrictInteriorDioramaPlayModeTests.cs`) : `ClearContent`/`Destroy` différé (staleness entre les
`Render()` successifs de la boucle DAWN/DAY/DUSK) + une épingle d'absence fragile (`Assert.IsNull
(Find("DayPhaseFallbackPanel"))`), remplacée par une valeur PRÉSENTE (`childCount == 4`). Détail complet
+ evidence : `Tools/w3u2-c10-notes.md` § Correctifs de fenêtre, classe ①/②.
