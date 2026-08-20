# W3.U2 / C6 — La teinte uGUI, les placeholders, les slots — notes d'implémentation

Design : `docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md`, chunk C6 (§3,
C6-F1/F2/F3/F4), décisions D4 (teinte uGUI) et D6 (7 placeholders, slots réellement remplaçables).

⛔⛔ **MODE LÉGER — ruling contrôleur (2026-08-17, machine sous charge)** : aucun run Unity
(batchmode compris), aucune stack Docker, aucun `Tools/run-unity-check.sh` n'a été exécuté pour ce
chunk. Tout ce qui suit est une mesure **statique** (lecture de fichiers, oracles Python
indépendants reproduisant fidèlement la logique C#, exécution RÉELLE du seul instrument qui ne
dépend pas d'Unity — `Tools/lfs-pointer-check.sh`, mécanisme git pur) — jamais une exécution
PlayMode.

## Ce qui a été livré

- `Assets/Scripts/CityMap/DistrictTintedImage.cs` (+ `.meta`) — D4 : composant FRÈRE de
  `DistrictTinted` (qui exige un `SpriteRenderer`, `DistrictTinted.cs:14`), appliquant la teinte à
  un `Image` uGUI. Consomme `DistrictTintResolver.Resolve`/`ToTintColor` — **ne redéclare aucun des
  6 triplets**, la table HSV reste dans `DistrictTintResolver.cs:32-40` (un seul endroit).
- `Assets/Scripts/CityMap/BuildingSpriteSlots.cs` (+ `.meta`) — D6 : `ScriptableObject` REUSE du
  seam `DesignTokens.Current` (`Resources.Load`, cache statique). **7 champs `Sprite` nommés**
  (`frontShop`, `cashSafehouse`, `stash`, `lab` — les 4 requis au J0 ; `growHouse`,
  `dealerSpotFront`, `moneyHolding` — les 3 slots de marge) **+ 1 champ `fallback` déclaré**.
  `Resolve(string operationalType)` est un `switch` **total** sur les 13 valeurs possibles (12
  membres de l'énum back `operational_chain.ts:27-31` + la chaîne vide, D2) : les 7 slots dédiés
  retournent leur sprite, **tout le reste (5 types + chaîne vide + inconnu) retombe sur
  `fallback`** — jamais `null`.
- `Assets/Resources/BuildingSpriteSlots.asset` (+ `.meta`) — le `.asset` existe et charge (seam
  branché), les 8 champs `Sprite` sont **`{fileID: 0}` (null)** — le câblage réel des 7 placeholders
  est un geste Éditeur (glisser-déposer) qui exige les GUID des sprites **importés**, donc
  **DIFFÉRÉ à la fenêtre groupée** (voir § RUNS DIFFÉRÉS point 2).
- **7 PNG placeholders** copiés sous `Assets/Art/Buildings/` (portée du postprocessor
  `W4P4aArtImportPostprocessor.cs`, `ScopedPrefix = "Assets/Art/"`), renommés au motif canonique
  `^sprite_environment_.+$` (D6 point 1, évite l'avertissement du postprocessor) :
  `sprite_environment_placeholder_{frontshop,cashsafehouse,stash,lab,growhouse,dealerspotfront,moneyholding}.png`.
  **`git add`é** → convertis en pointeurs LFS (évidence ci-dessous). **Aucun `.meta`** n'a été
  écrit pour ces PNG — leur génération exige l'import réel par le `TextureImporter` d'Unity
  (`textureType: Sprite`, `spriteImportMode: Single`), DIFFÉRÉ (point 1 ci-dessous).
- `Assets/Tests/PlayMode/DistrictTintedImagePlayModeTests.cs` (+ `.meta`) — `[Category("W3U2")]` :
  - `ApplyTint_SixProfiles_MatchesResolverExactly` — **6 `[TestCase]`**, un par profil connu
    (C6-F1, scénario dimensionné : les 6, pas un seul) ;
  - `ApplyTint_UnknownProfile_FallsBackToNamedNeutral_NeverThrows` ;
  - `RequiresImage_ByAttribute`.
- `Assets/Tests/PlayMode/BuildingSpriteSlotsPlayModeTests.cs` (+ `.meta`) — `[Category("W3U2")]` :
  - `C6F4_AllThirteenOperationalTypeValues_ResolveNonNullSprite` — instance **fabriquée** (7 sprites
    + repli via `Sprite.Create`), scénario dimensionné sur les **13** valeurs (12 membres + chaîne
    vide) ;
  - `C6F4_UnknownOperationalType_FallsBackToNamedSlot_NeverNull` — isole la propriété du repli, les
    7 slots dédiés restant délibérément non câblés ;
  - `BuildingSpriteSlots_Current_LoadsFromResources` — le seam charge (indépendant du câblage des
    sprites, qui reste `null` dans l'asset committé) ;
  - `C6F3_NoSpriteFileNameLiteral_InProductionCode` — balaie `Assets/Scripts` (PAS `Assets/Tests`)
    pour les 7 noms de fichier réels, anti-vacuité (`csFiles.Length > 0`) ;
  - `C6F3_PositiveControl_PatternDoesFindAFileNameWhenOnePresent` — **contrôle positif obligatoire**
    (design C6-F3) : fixture fabriquée à la volée (jamais committée), jamais dans
    `Assets/Scripts`.

## Evidence statique (obtenue SANS Unity — oracles indépendants + exécution réelle du script git)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

### C6-F2 (LFS) — EXÉCUTION RÉELLE, pas un oracle (mécanisme git pur, REUSE `lfs-pointer-check.sh`)

```
$ ./Tools/lfs-pointer-check.sh Assets/Art/Buildings/sprite_environment_placeholder_frontshop.png \
    Assets/Art/Buildings/sprite_environment_placeholder_cashsafehouse.png \
    Assets/Art/Buildings/sprite_environment_placeholder_stash.png \
    Assets/Art/Buildings/sprite_environment_placeholder_lab.png \
    Assets/Art/Buildings/sprite_environment_placeholder_growhouse.png \
    Assets/Art/Buildings/sprite_environment_placeholder_dealerspotfront.png \
    Assets/Art/Buildings/sprite_environment_placeholder_moneyholding.png
G1 PASS ×7 (les 7 chemins, un blob LFS confirmé chacun)
EXIT=0
```
Assertion **positive** (7 pointeurs confirmés), jamais « aucun blob » — conforme à l'avertissement
du design (« un compte à zéro est vrai à vide »).

### C6-F1 (teinte) — oracle Python reproduisant `DistrictTintResolver.ToTintColor` champ pour champ

```
$ python3 -c "... colorsys.hsv_to_rgb sur les 6 (hueDelta,satDelta,valDelta) de DistrictTintResolver.cs:34-39 ..."
distinct tints among 6: 6 (expect 6)
```
Les 6 profils produisent 6 teintes distinctes (mêmes constantes que `DistrictTintResolver.cs`,
recopiées dans l'oracle pour vérification indépendante — `DistrictTintedImage` lui-même ne
duplique RIEN, il appelle le resolver réel). `DistrictTintedImage.ApplyTint` étant un pur
passe-plat vers `DistrictTintResolver.Resolve`/`ToTintColor` (aucune logique de teinte propre), la
correspondance exacte est garantie par construction, pas seulement par cet oracle.

### C6-F4 (table totale) — oracle Python reproduisant le `switch` de `BuildingSpriteSlots.Resolve`

```
$ python3 -c "... 13 valeurs (12 membres operational_chain.ts:27-31 + '') mappées sur 7 slots nommés + fallback ..."
named-slot coverage: 7 (expect 7) ; fallback coverage: 6 (expect 6)
```
Les 13 valeurs (`front_shop, cash_safehouse, stash, lab, grow_house, refinery, press_house,
distribution_hub, office, dealer_spot_front, money_holding, specialized_lab, ""`) couvrent
exactement les 7 slots dédiés (5 mappent sur `fallback`, dont la chaîne vide) — aucune ne tombe sur
`null`.

### C6-F3 (aucun nom de fichier dans le C#) — oracle Python reproduisant le balayage + contrôle positif

```
$ python3 -c "... os.walk('Assets/Scripts'), count(nom) pour les 7 noms réels ..."
scanned 49 .cs files under Assets/Scripts
sprite_environment_placeholder_frontshop: 0 hit(s)
sprite_environment_placeholder_cashsafehouse: 0 hit(s)
sprite_environment_placeholder_stash: 0 hit(s)
sprite_environment_placeholder_lab: 0 hit(s)
sprite_environment_placeholder_growhouse: 0 hit(s)
sprite_environment_placeholder_dealerspotfront: 0 hit(s)
sprite_environment_placeholder_moneyholding: 0 hit(s)
positive control (fabricated file containing the literal): found=True
```
0 hit sur les 7 noms **et** le contrôle positif trouve le même motif dans une fixture fabriquée —
le zéro n'est donc pas dû à un motif impuissant (socle : « un zéro mesuré sur le mauvais chemin est
le plus crédible des faux »).

## RUNS DIFFÉRÉS (à la fenêtre de runs groupée du contrôleur)

1. **L'import Unity des 7 PNG** — génération des `.meta` par `TextureImporter` (via
   `W4P4aArtImportPostprocessor.cs`, qui force `textureType: Sprite`, `spriteImportMode: Single`
   sur tout ce qui entre sous `Assets/Art/`). Ne peut pas être fait hors Éditeur : un `.meta` de
   texture porte des réglages (`spriteImportMode`, `internalIDToNameTable`, GUID par sub-asset)
   qu'aucune commande shell ne dérive de façon fiable. Le nom canonique (`sprite_environment_*`)
   est déjà posé pour que l'import ne déclenche PAS l'avertissement de nommage.
2. **Le câblage de `Assets/Resources/BuildingSpriteSlots.asset`** — les 8 champs `Sprite` sont
   `{fileID: 0}` (null) dans l'asset committé ; les remplir avec les 7 PNG réels (glisser les
   sprites importés sur les champs dans l'Inspecteur, D6 : « réassigner un champ dans l'asset »)
   dépend du point 1 (les sprites doivent être importés — GUID assigné — avant qu'on puisse les
   référencer). **Conséquence mesurable et attendue** : jusqu'à ce câblage,
   `BuildingSpriteSlots.Current.Resolve(<type>)` sur l'asset RÉEL rend `null` pour les 7 slots
   dédiés (`fallback` aussi, tant qu'il n'est pas câblé) — `C6F4_AllThirteenOperationalTypeValues_ResolveNonNullSprite`
   prouve la TOTALITÉ du `switch` sur une instance FABRIQUÉE (7 sprites de test créés par
   `Sprite.Create`), pas sur l'asset committé — c'est une propriété du CODE, indépendante du
   contenu de l'asset (voir § Deviations, aucune falsifiable C6 n'exige que l'asset committé soit
   déjà câblé).
3. **Le juge lui-même** — `LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod
   MafiaCI.RunPlayModeTests` sur l'arbre complet (catégorie `W3U2` déjà incluse depuis C4). Attendu :
   `passed >= <baseline C5> + 8` — compte exact des cas neufs de ce chunk :
   `DistrictTintedImagePlayModeTests` = 6 `TestCase` + 2 `Test` = 8 ;
   `BuildingSpriteSlotsPlayModeTests` = 5 `Test`. **Total 13 cas neufs**, `failed == 0`.
4. **Compilation Unity** — aucune erreur de compilation n'a pu être confirmée par le compilateur
   réel ; vérifiée seulement par relecture manuelle (les 4 fichiers `.cs` neufs ont été relus
   ligne à ligne après écriture) + les 3 oracles Python ci-dessus. Risque résiduel identique à
   celui déjà consigné en C5 : une faute de syntaxe C# invisible à la relecture ne serait détectée
   qu'au premier `Refresh`/compile réel.
5. **Rendu visuel** — ni la teinte appliquée à un `Image` réel, ni l'assemblage des 7 placeholders
   sur la grille 10×4 n'ont pu être vus (§4-4 point 3 du design : question d'É3, pas de ce chunk).
6. **Les `.meta` des 4 nouveaux fichiers `.cs` + 1 `.asset`** — écrits à la main, forme minimale
   2 lignes pour les scripts (`fileFormatVersion: 2` + `guid:`) et forme `NativeFormatImporter`
   pour l'asset, en suivant EXACTEMENT le format des `.meta` voisins du même répertoire
   (`DistrictTinted.cs.meta`, `DesignTokens.cs.meta`, `DesignTokens.asset.meta` — vérifiés
   octet à octet, sauf l'espace de fin sur les champs vides du `.asset.meta`, voir § Deviations).
   GUID générés par `uuid.uuid4().hex`, vérifiés **sans collision** contre l'arbre versionné
   (`git grep -l <guid>` négatif pour les 5). Unity doit néanmoins confirmer l'import à la fenêtre.

## Deviations

### (a) Choix des 3 slots de marge (`grow_house`, `dealer_spot_front`, `money_holding`)

**Quoi** : D6 impose que les 7 placeholders couvrent les 4 types requis au J0 (`lab`, `stash`,
`front_shop`, `cash_safehouse`) « avec de la marge », mais ne prescrit **aucune** affectation pour
les 3 types restants parmi les 8 non-J0 (`grow_house`, `refinery`, `press_house`,
`distribution_hub`, `office`, `dealer_spot_front`, `money_holding`, `specialized_lab`).

**Pourquoi c'est un imprévu non bloquant, pas un conflit** : test du socle appliqué — aucune
falsifiable C6 ne dépend de QUEL type reçoit un slot dédié parmi les 8 non-J0. C6-F4 porte
uniquement sur le COMPTE (13 valeurs, toutes non-null, 7 réels + repli) ; le choix précis ne change
aucune décision.

**Option conservatrice prise** : `grow_house`, `dealer_spot_front`, `money_holding` — trois
systèmes de jeu distincts (culture, dealing, banque) plutôt que trois variantes du même système,
pour maximiser la variété visuelle immédiate si le J0 s'étend légèrement avant l'art final d'É3.

### (b) Formatage octet des `.meta`/`.asset` hand-écrits — espace de fin non reproduit

**Quoi** : `DesignTokens.asset.meta` porte un espace de fin après le `:` sur les champs vides
(`userData: `, `assetBundleName: `, `assetBundleVariant: `) — artefact du sérialiseur Unity. L'outil
d'écriture de fichier utilisé ici normalise ces lignes sans l'espace de fin.

**Pourquoi c'est un imprévu non bloquant** : YAML ne distingue pas `clé:` de `clé: ` (valeur null
dans les deux cas) — aucune sémantique Unity n'en dépend, et le fichier sera de toute façon
ré-sérialisé par Unity au premier `Save` dans l'Éditeur (perdant cette différence dans un sens ou
l'autre). Aucune falsifiable ne porte sur le byte-exact de ce fichier.

### (c) `implementation-notes.md` — REUSE de la pratique déjà établie en C5

Comme en C5 (`Tools/w3u2-c5-notes.md` § Deviations (c)) : `implementation-notes.md` n'existe pas
comme fichier suivi dans ce dépôt. Les déviations sont consignées ici **et** dans le message de
commit, pour être trouvables des deux façons.
