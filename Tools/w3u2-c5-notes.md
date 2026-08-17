# W3.U2 / C5 — Les tokens de nuit + l'or — notes d'implémentation

Design : `docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md`, chunk C5 (§3, C5-F1/F2/F3),
livrables **U-2** (tokens de nuit) + **U-3** (chrome + repointage + détecteur d'allowlist).

## Correctif de fenêtre (2026-08-17, post `ca29564`) — trou trouvé par `CanonPaletteBridgePlayModeTests`

**Symptôme rapporté par le contrôleur** : `Comparator_Green_OnHealthyTree_BothDirections` rouge —
les 8 tokens neufs de C5 (`chromeTabActive` + les 7 `night*`) étaient déclarés côté runtime
(`DesignTokens.cs` + `.asset`) mais **jamais déclarés côté canon** — "orphelin RUNTIME" ×8. En
cascade, `Comparator_Red_OnAlteredByte` tombait aussi (sa précondition — "la copie clonée doit être
verte avant altération" — présuppose 0 orphelin).

**Où vivait l'extrait canon** : `Assets/Editor/CanonPaletteExtract/canon_palette_extract.json` — un
JSON **committé** dans CE dépôt Unity (pas un doc `gdd/` local, il n'y en a aucun ici — vérifié,
`find . -iname "*.md" -path "*gdd*"` : 0 résultat). C'est un **instantané manuel**, extrait une fois
du canon réel (`gdd/14_tunable_constants.md §Asset pipeline — palette & DA`, repo back
`azha/mafia-clean-city`, commit `918bf4b2` — champs `canonSection`/`backCommitSha` du JSON), commité
lors de W3.U-DA/C1 (commit Unity `29505df`, cf `docs/superpowers/specs/2026-08-15-w3uda-
implementation-notes.md:141`). Le comparateur (`CanonPaletteComparator.Compare`, dans
`CanonPaletteBridgePlayModeTests.cs`) lit ce JSON à l'exécution — il ne touche jamais le repo back.

**Forme de déclaration** — un objet JSON par token, schéma FIXE (`CanonPaletteTokenEntry` :
`name, r, g, b, a, hex`), ajouté en fin du tableau `tokens[]` — patron recopié verbatim de l'entrée
existante `readableTextDark` (dernière avant les 8 neuves). `hex` calculé avec la convention DÉJÀ
déclarée en tête de fichier (`roundingConvention: "demi-haut: floor(channel*255+0.5)"`), reproduite
par oracle Python indépendant — voir § Evidence ci-dessous. `a` (alpha) inclus explicitement pour
CHAQUE entrée, y compris `nightSmoke` (0.35) et `nightHaze` (0.2) : le comparateur mesure une
distance sur le **Vector4 complet** (r,g,b,a) — omettre `a` l'aurait fait défauter à 0 côté canon et
aurait fabriqué un mismatch de VALEUR sur ces deux tokens précisément (translucides par design).

`CanonPaletteComparator.ExpectedTokenCount` bumpé `40 -> 48` (le scénario dimensionné G6 — "un
extrait tronqué doit rougir" — reste inchangé, aucun autre test du fichier ne code le nombre 40 en
dur : vérifié par lecture des 5 tests, `Comparator_Red_OnTruncatedExtract` utilise `.Take(10)` et une
borne `>= 29`, qui reste vraie à 48-10=38 orphelins).

**Classe(s) choisie(s)** : **aucune** — le pont canon↔runtime (`CanonPaletteComparator`/l'extrait
JSON) n'a PAS de notion de classe ; c'est une liste homogène `{name,r,g,b,a,hex}`, comparée par
égalité de nom + distance de valeur, sans distinction art/chrome/game-state. La `ForbiddenList`
scopée aux assets d'art (mentionnée par le contrôleur) est un mécanisme **différent**
(`Assets/Editor/AssetLint/ForbiddenPredicates.cs`, consommé par `AssetLintGates.G5_ForbiddenColors`
— lint de PIXELS de PNG rendus, pas de tokens `DesignTokens`) : pas de convention de classe à
respecter ici, donc pas de classe créée. Les 8 entrées sont ajoutées **à plat**, comme les 40
existantes.

⚠️ **Ce qui remonte au contrôleur — trou de provenance, PAS comblé ici** : les 40 entrées d'origine
portent une provenance vérifiable (`backCommitSha: "918bf4b2"`, un commit RÉEL de `gdd/14` dans le
repo back). Les 8 entrées neuves n'ont **aucun commit `gdd/14` équivalent** — leurs valeurs viennent
de `DesignTokens.asset` (exécution du ruling user 2026-08-17 sur la direction nuit), **jamais lues
depuis un document canon**. Je n'ai PAS touché `backCommitSha`/`canonSection`/`generatedAt` (rester
honnête sur ce que CES 40 entrées-là décrivent), et je n'ai PAS pu amender `gdd/14` : ce document vit
dans le repo back (`azha/mafia-clean-city`), hors de mon arbre (`TON ARBRE : repo Unity`). ⇒ **Tant
que `gdd/14` ne porte pas ces 8 valeurs, l'extrait JSON de ce dépôt est en avance sur son propre
canon déclaré** — le comparateur ne peut pas le détecter (il ne lit que le JSON local, jamais le repo
back), donc ce n'est PAS une falsifiable rouge, c'est un écart de gouvernance à trancher par le
contrôleur : soit amender `gdd/14` (repo back) pour y ajouter les 8 clés au format existant, soit
documenter explicitement que l'extrait canonique de CE lot est "runtime-first, canon à rattraper".

## Evidence du correctif (statique, mode léger — aucun run Unity)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

```
$ python3 -c "... json.load(canon_palette_extract.json), len(tokens) ..."
token count: 48
unique: True
dups: set()
```

Oracle qui REPRODUIT `CanonPaletteComparator.Compare()` champ par champ (parse `.asset` en
`{name: (r,g,b,a)}`, parse le JSON, compare les 2 ensembles de noms ET la distance de valeur par
token, épsilon 0.001 — même seuil que `CanonPaletteComparator.Epsilon`) :

```
asset color entries: 48
extract entries: 48
orphan CANON (in extract, not runtime): set()
orphan RUNTIME (in runtime, not extract): set()
value mismatches (dist >= 0.001): []

VERDICT: errors = 0
```

⇒ **Attendu au juge réel** : `Comparator_Green_OnHealthyTree_BothDirections` vert (0 erreur, les deux
sens), `Extract_LoadsFromDisk_IsDimensioned` vert (48 == `ExpectedTokenCount`), et
`Comparator_Red_OnAlteredByte`/`Comparator_Red_OnOrphanCanon_EntryRemoved`/
`Comparator_Red_OnTruncatedExtract` verts aussi (leur précondition "copie clonée verte" est
désormais satisfaite, plus aucune cascade). Non exécuté ici — ruling MODE LÉGER, le contrôleur
exécute le juge après ce commit.

### RUNS DIFFÉRÉS — ajout à la liste existante

6. **Les 5 tests de `CanonPaletteBridgePlayModeTests`** — vérifiés uniquement par l'oracle Python
   ci-dessus (reproduction de `Compare()`, pas son exécution réelle). Le contrôleur les exécute au
   juge suivant.

⛔⛔ **MODE LÉGER — ruling contrôleur (2026-08-17, machine sous charge)** : aucun run Unity (batchmode
compris), aucune stack Docker, aucun `Tools/run-unity-check.sh` n'a été exécuté pour ce chunk. Tout
ce qui suit est une mesure **statique** (lecture de fichiers, oracles Python indépendants reproduisant
fidèlement la logique des tests C#) — jamais une exécution.

## Ce qui a été livré

- `Assets/Scripts/Theme/DesignTokens.cs` — **8 champs neufs**, aucune valeur en C# (R2.3) :
  - `[Header("Chrome")] chromeTabActive` (D5, U-3).
  - `[Header("District Night")] nightBackground, nightWindowLit, nightNeonGlow, nightSmoke,
    nightHaze, nightBase, nightOutOfDistrictMuted` (U-2).
- `Assets/Resources/DesignTokens.asset` — les 8 clés YAML correspondantes, valeurs choisies et
  documentées en commentaire dans le `.cs` (voir § Valeurs ci-dessous).
- `Assets/Scripts/Shell/AppShell.cs:255` (`RefreshTabButtonVisuals`) — repointé de `accentGold` vers
  `chromeTabActive` pour l'onglet actif (D5 point 2).
- `Assets/Tests/PlayMode/ChromeTabAccentAllowlistPlayModeTests.cs` (+ `.meta`) — `[Category("W3U2")]` :
  - 3 `TestCase` prouvant que le motif de balayage détecte les **3 formes syntaxiques** de liaison
    citées par D5 (champ statique, affectation directe, indirection par variable) ;
  - un contrôle positif obligatoire (D5 point 4) sur répertoire **temporaire fabriqué**, jamais sur
    `Assets/Scripts` réel : une liaison neuve non listée casse l'égalité d'ensembles, son retrait la
    restaure ;
  - `C5F2_AccentGoldBindings_EqualDeclaredAllowlist_TabActiveExcluded` — la mesure réelle contre
    `Assets/Scripts`, allowlist figée à 11 entrées, `Shell/AppShell.cs` explicitement exclu.
- `Assets/Tests/PlayMode/DistrictNightTokensPlayModeTests.cs` (+ `.meta`) — `[Category("W3U2")]` :
  - `C5F3_NightBackground_HasNonZeroSaturation_NeverGray` (engagement 2) ;
  - `C5F3_AntiVacuite_PureGrayWouldFailTheSameProbe` — contrôle positif (un gris pur DOIT casser la
    même sonde).
  - C5-F1 n'a **pas** de test dédié : sa cible déclarée par le design est le gate déjà existant
    `DesignTokensParityPlayModeTests.C0F1_...` (générique sur tout champ public déclaré) — voir
    § Evidence statique.

## Evidence statique (obtenue SANS Unity — oracles indépendants, commandes + sorties)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

### C5-F1 (parité code↔asset) — oracle Python reproduisant `C0F1` champ pour champ

```
$ python3 -c "... regex sur DesignTokens.cs (public Color|TMP_FontAsset) ..."
CS public Color/TMP_FontAsset field decls: 49
$ python3 -c "... regex sur DesignTokens.asset, boilerplate Unity exclu ..."
asset token keys: 49
```
Les deux listes de 49 noms, comparées une à une : identiques. Le gate existant
(`DesignTokensParityPlayModeTests.C0F1_FieldCount_MatchesAssetTokenKeyCount_SameUnit`) restera vert
à la fenêtre groupée — non ré-exécuté ici, mode léger.

### C5-F2 (allowlist accentGold) — oracle Python reproduisant le scan C#

```
$ python3 -c "... os.walk('Assets/Scripts'), count('DesignTokens.Current.accentGold') ..."
total= 11
  Operational/Autonomy/AutonomyInboxController.cs
  Operational/BuildingCard/BuildingCardController.cs
  Operational/Dashboard/DashboardController.cs
  Operational/Exceptions/ExceptionDetailController.cs
  Operational/Exceptions/ExceptionQueueController.cs
  Operational/Laundering/LaunderingController.cs
  Operational/Laundering/PipelineOverviewController.cs
  Operational/Lieutenant/LieutenantScreenController.cs
  Shell/DailyReviewScreenController.cs
  Shell/ExceptionQueuePanelController.cs
  Shell/HighestLeverageCardController.cs
SET_EQUAL: True
AppShell present: False
```
Confirme la mesure du design (12 avant repointage, 11 après) ET l'ensemble exact attendu par
`ExpectedAccentGoldBindings` dans le test.

### C5-F3 (saturation non nulle) — oracle Python (`colorsys`, même convention HSV que Unity)

```
$ python3 -c "import colorsys; print(colorsys.rgb_to_hsv(0.065,0.088,0.1))"
h,s,v = 0.5571428571428573 0.35000000000000003 0.1
S nonzero: True
```
`nightBackground` a S=0.35 en HSV — non nul, satisfait C5-F3.

## RUNS DIFFÉRÉS (à la fenêtre de runs groupée du contrôleur)

1. **Le juge lui-même** — `LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod
   MafiaCI.RunPlayModeTests` sur l'arbre complet (catégorie `W3U2` incluse depuis C4). Attendu :
   `passed >= <baseline C4> + 7` — compte exact des cas neufs de ce chunk :
   `ChromeTabAccentAllowlistPlayModeTests` = 3 `TestCase` (3 formes syntaxiques) + 2 `Test`
   (contrôle positif fichier, allowlist réel) = 5 ; `DistrictNightTokensPlayModeTests` = 2 `Test`
   (saturation, contrôle positif) ; total 7. `failed == 0`.
2. **Compilation Unity** — aucune erreur de compilation n'a pu être confirmée par le compilateur réel ;
   vérifié seulement par relecture manuelle + les 2 oracles Python ci-dessus (parité de noms,
   syntaxe C# relue ligne à ligne). Risque résiduel : une faute de syntaxe C# invisible à une
   relecture (accolade, point-virgule) ne serait détectée qu'au premier `Refresh`/compile réel.
3. **Import/reflection réels de `DesignTokens.asset`** — la parité a été vérifiée par un oracle texte
   qui REPRODUIT la logique de `DesignTokensParityPlayModeTests` (reflection C# non exécutable hors
   Unity) ; la vraie reflection (`typeof(DesignTokens).GetFields(...)`) doit confirmer 49 à la fenêtre.
4. **Rendu visuel** — aucune des 8 valeurs de couleur choisies n'a été VUE (pas de rendu Unity
   possible en mode léger). Les valeurs sont calculées analytiquement (conversion HSV→RGB à la main,
   vérifiée par un second oracle `colorsys`), pas jugées à l'œil. À valider visuellement (ou au moins
   à charger dans l'inspecteur Unity) à la fenêtre groupée — c'est une question d'É3 (design §4-4
   point 3), pas de ce chunk.
5. **Le `.meta` des 2 nouveaux fichiers de test** — écrits à la main (forme minimale à 2 lignes,
   `fileFormatVersion: 2` + `guid:`), en suivant EXACTEMENT le format déjà utilisé par les `.meta`
   voisins du même répertoire (`DesignTokensParityPlayModeTests.cs.meta`,
   `AssetLintGatesPlayModeTests.cs.meta` — vérifiés octet à octet). GUID généré par `uuid.uuid4().hex`,
   vérifié **sans collision** contre les 13364 GUID déjà présents dans l'arbre (`grep -rl` négatif).
   Unity doit néanmoins confirmer l'import à la fenêtre (MonoImporter par défaut, aucun champ
   `executionOrder`/`icon` à régler pour un fichier de test).

## Deviations

### (a) « néons par type de business » — interprété comme UN token générique, pas N tokens par type

**Quoi** : le design (C5, phrase d'introduction) liste "néons par type de business" parmi les tokens
neufs, sans qu'aucune section D2-D9 du même document ne définisse de teintes de néon DIFFÉRENTES par
`operational_type`. La table des 5 bindings lumineux (§1.5) et D3 traitent le néon comme **un seul**
état binaire (`revenue_band == 'EARNING'` ⟺ allumé), sans dimension de couleur par type de business.

**Pourquoi c'est un imprévu non bloquant, pas un conflit** : aucune décision du document ne contredit
le choix d'un token unique — l'ambiguïté porte sur une prose de titre de chunk, jamais reprise ni
précisée dans les décisions D2 (clés de la projection), D3 (rendu du néon) ou C9 (bindings). Le test
du socle (« si ce doute se résolvait défavorablement, une décision changerait-elle ? ») répond non :
qu'il y ait 1 ou 12 tokens de néon, aucune falsifiable C5-F1/F2/F3 n'en dépend, et rien dans C6/C8/C9
ne référence de nom de token de néon spécifique par type.

**Option conservatrice prise** : un seul champ `nightNeonGlow` (générique, réutilisé pour tout
`operational_type` capable d'`EARNING`). C'est la surface la plus petite compatible avec le texte du
chunk, et elle n'exclut PAS une extension future (ajouter des variantes par type resterait additif,
n'invaliderait aucune falsifiable existante).

**Alternative rejetée** : 12 tokens `nightNeon_<operational_type>` — rejetée parce qu'elle invente une
architecture (quelle teinte pour quel type ?) qu'aucune section du design ne tranche ; l'inventer ici
aurait été deviner un choix de design à la place de l'auteur, exactement ce que le socle interdit.

### (b) Valeur de `chromeTabActive` — reprise à l'identique d'`accentGold`

**Quoi** : D5 ne prescrit AUCUNE valeur pour `chromeTabActive` (§4-4 point 4 du design dit même
explicitement ne pas avoir ouvert `DesignTokens.asset`). A-DA-1 (la VALEUR propre du token) est un
arbitrage délibérément laissé OUVERT par D5, distinct de l'USAGE qu'il tranche.

**Option conservatrice prise** : `chromeTabActive = accentGold` (#ffd23f, 1/0.824/0.247) — zéro
changement de pixel au repointage, cohérent avec le patron déjà suivi dans ce fichier même
(cf. commentaire `DesignTokens.cs:12-14`, "Zéro changement de pixel" pour W4.P4a/C3-C4). Le
repointage change la SOURCE de la couleur (donc `accentGold` quitte bien la liste de ses
consommateurs, ce que C5-F2 vérifie), pas son apparence — ce que A-DA-1, resté ouvert, pourra changer
plus tard sans toucher au mécanisme de repointage lui-même.

### (c) `implementation-notes.md` — n'existe pas dans ce dépôt, deviations consignées ici + en commit

**Quoi** : plusieurs commentaires historiques de ce dépôt (`DesignTokens.cs`, `UiTimingTunables.cs`,
`HighestLeverageCardControllerPlayModeTests.cs`) renvoient à un `implementation-notes.md § Deviations`
qui n'a **jamais existé comme fichier suivi par git** dans cet arbre (`git log --all --diff-filter=AD`
sur `*implementation-notes*` : aucun résultat, sur TOUT l'historique). La pratique réellement observée
dans ce dépôt, y compris dans le chunk précédent de CE lot (commit `abba5eb`, W3.U2/C4), consigne les
déviations **dans le corps du message de commit**. C'est la forme suivie ici — cette note-ci et le
message de commit portent la même information, pour qu'elle soit trouvable des deux façons.
