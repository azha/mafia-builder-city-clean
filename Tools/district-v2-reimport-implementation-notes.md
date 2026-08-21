# Réimport artefacts district v2 — notes d'implémentation

Auteur : coder (Sonnet). Fichier de repro jetable utilisé pour ce lot
(`Assets/Tests/PlayMode/_TempDistrictV2CaptureRepro.cs`, patron `EnterDistrictViaRealFlow` dupliqué
de `NavigationPlayModeTests.cs`) : SUPPRIMÉ après capture, même discipline que les rounds
précédents (`Tools/pivot-fond-prerendu-p3-implementation-notes.md` § ROUND 2/4/6). `Assets/
InitTestScene*.unity` (généré par le harnais PlayMode) supprimé avant commit.

Terrain atelier : `atelier3d-mafia` commits `9478753`/`4f7848b`/`e5b23d5`. Terrain Unity :
`mafia-builder-city-clean` (remote `azha/mafia-builder-city-clean`, confirmé par remote + par
les documents du programme qui le nomment — 39 occurrences dans `docs/superpowers/specs|plans`
et 12 dans `~/.claude/.../memory/`). Périmètre : `Assets/Art/District/`, `Assets/Scripts/CityMap/`,
tests du district. Aucun fichier Shell/HUD touché (vérifié par `git status --porcelain` avant/après
— les 11 fichiers modifiés + 9 non-suivis du HUD restent inchangés par ce lot, à l'exception de
`Assets/Tests/PlayMode/DistrictBackgroundPlayModeTests.cs` déjà modifié par l'autre coder (amb-F7
51→61) AVANT que je ne commence — édition préservée, non touchée par moi hors [SECTION AJOUTÉE].

## 1. Import des 56 fichiers (2 fonds + 54 sprites)

- Copie fichier-à-fichier (mêmes noms), donc mêmes GUID/`.meta` — réglages d'import PRÉSERVÉS
  automatiquement, jamais recréés.
- Intégrité de copie : SHA-256 de chacun des 56 fichiers Unity == SHA-256 de la source atelier
  (script Python indépendant, PAS un `diff` proxifié) — 56/56 identiques.
- JSON d'ancrage (`VERGE_D_{NUIT,JOUR}_FINAL.json`) : **byte-identiques** entre atelier v2 et
  Unity AVANT tout changement (confirmé par `diff`, indépendamment de l'affirmation atelier
  « ancres : rien à refaire ») — aucune copie nécessaire, aucune faite.
- Réglages 1:1 STRICT relus par réflexion `TextureImporter` APRÈS réimport (pas supposés) :
  56/56 conformes — `textureType=Sprite spriteMode=Single textureCompression=Uncompressed
  mipmapEnabled=False filterMode=Bilinear format=RGBA32`, tailles == dimensions PNG livrées
  (1080×1920 pour les 2 fonds, dimensions par couple pour les 54 sprites — voir tableau evidence).
- `refresh_unity(force, compile=request)` → 0 erreur (`read_console` types=error, 0 entrée).

## 2. `sprites_post.py` — PAS ré-exécuté, et voici pourquoi (mesuré, pas supposé)

Le doute de départ : `sprites_post.py` existe dans l'atelier et son usage est cité par
`sprites_all.sh` (pipeline `sprites_raw` → extraction → `sprites_unity`). Le code Unity
(`DistrictInteriorScreenController.cs:~541`) porte un commentaire affirmant que les calques
lumineux sont « alignés pixel à pixel ... recadrés ENSEMBLE par sprites_post ».

Mesuré :
1. `sprites_post.py` attend des fichiers d'entrée nommés `{TPL}_{mode}_{etat}.png` (SANS suffixe
   ppm) — glob `p(mode,etat)` dans le script. Le corpus v2 (`sprites_p1_out/`) est nommé
   `{TPL}_{mode}_{etat}_ppm{PPM}.png` (AVEC suffixe ppm) — **aucun fichier du corpus v2 ne
   satisfait le motif que `sprites_post.py` cherche**. Il appartient au pipeline LEGACY
   (`sprites_all.sh` → `sprites_raw`/`sprites_unity`, répertoires INEXISTANTS dans ce lot),
   pas au pipeline P1 (`sprites_batch.py` → `sprites_p1_verge.sh`/`sprites_p1_rerun_failed.sh`
   → `sprites_p1_out/`) qui a produit v1 ET v2.
2. Les GUID assignés dans `Assets/Resources/BuildingSpriteSlots.asset` pour `stashOv.actif` et
   `labOv.actif` pointent, mesuré via `grep guid:` sur les `.meta`, vers
   `entrepot_nuit_actif_ppm24.0.png` et `usine_nuit_actif_ppm24.0.png` — des rendus PLEIN ÉTAT
   du pipeline P1, PAS des fichiers `_ov_` delta que produirait `sprites_post.py`. Unity consomme
   donc déjà, pour v1, les sprites bruts par état — comportement INCHANGÉ par ce lot.
3. La propriété que `sprites_post.py` existe pour garantir (alignement pixel-exact entre les
   calques d'un même template) est délivrée par un AUTRE mécanisme dans le pipeline P1 : le
   « cadrage GELÉ par couple » (template, ppm) de `sprites_batch.py` (G1, notes atelier) — l'état
   BASE converge le cadre puis tous les autres états le RELISENT, donc partagent le MÊME canevas
   par construction. Re-vérifié indépendamment ici (pas recopié de l'atelier) : script Python,
   24/24 couples (template,ppm) du corpus v2 livré ont une taille de fichier IDENTIQUE à travers
   tous leurs états — 0 divergence.

⇒ **`sprites_post.py` n'est PAS le pipeline en jeu pour ce corpus** (ni pour v1 ni pour v2) et
n'a pas besoin d'être ré-exécuté. Le commentaire de `DistrictInteriorScreenController.cs` nommant
« sprites_post » décrit la PROPRIÉTÉ (alignement pixel-exact des calques), livrée aujourd'hui par
un mécanisme différent (cadrage gelé) — imprécision de commentaire préexistante, hors périmètre
de ce lot (je ne touche pas au Shell/HUD ni ne redésigne le pipeline atelier ; signalé ici, pas
corrigé silencieusement).

## 3. Delta de pivot usine/entrepot — pp-F2 est AVEUGLE à ce delta, et voici pourquoi

### Ce que pp-F2 vérifie réellement (lu dans le code, pas supposé)

`PpF2_BuildingPivot_MatchesJsonPivotPx...` (`DistrictBackgroundPlayModeTests.cs`) compare
`actual = ((RectTransform)cell).anchoredPosition` à `expected = PixelToFondLocal(parcel.pivot_px,
...)`. Or `BuildBuildingCell` (`DistrictInteriorScreenController.cs`) calcule
`cellRt.anchoredPosition = localPos` où `localPos = DistrictBackgroundAnchor.PivotLocalForBlock(...)`
— **la MÊME fonction pure**, appliquée aux MÊMES données (`anchorMap`), que celle que le test
rappelle indépendamment. pp-F2 vérifie donc que « le conteneur de cellule est placé là où le code
l'a calculé » — une propriété VRAIE PAR CONSTRUCTION (aux arrondis de `SnapToScreenPixel` près,
absorbés par la tolérance ≤2px). **Ce n'est pas une tautologie sur TOUT pp-F2** (le second volet,
la boucle des 104 pas, vérifie une vraie propriété du MAILLAGE, indépendante du code) — mais le
PREMIER volet (calage bâtiment↔JSON) l'est bel et bien vis-à-vis du CONTENU DU SPRITE.

`pivot_px` est une propriété du FOND (où, dans l'image de fond, se trouve le point-sol de LA
PARCELLE) — il ne dépend d'AUCUN sprite. Le mécanisme qui fait atterrir le bâtiment sur ce point
est `cellRt.pivot = (0.5, 0)` — le pivot BAS-CENTRE DE LA RECTTRANSFORM DE LA CELLULE, dimensionnée
à `baseSprite.rect.width/height` (texture PLEINE, pas la bbox alpha du contenu). C'est donc le
bord bas-centre du FICHIER PNG qui atterrit sur `pivot_px`, jamais un point mesuré dans le
contenu du sprite. **`origin_px` (le champ du frame JSON atelier, « projection de (0,0,0) du
template ») n'est lu NULLE PART dans `Assets/Scripts` ni `Assets/Editor`** (grep exhaustif, 0
occurrence) — ce n'est PAS le mécanisme d'ancrage Unity, contrairement à ce que la formulation de
la consigne de ce lot pouvait laisser supposer. Le design canon (`Tools/pivot-fond-prerendu-design.md`
§4, §8) ne mentionne jamais `origin_px` non plus : il définit explicitement « le pivot BAS-CENTRE
du sprite [tombe sur pivot_px] » — c'est le contrat, pas une approximation à corriger.

⇒ **pp-F2 ne peut PAS voir un delta qui déplace le contenu à l'intérieur d'un fichier dont les
dimensions externes sont inchangées** (cas entrepot, dx seul) **ni un delta qui change les
dimensions du fichier lui-même** (cas usine — le fichier RÉTRÉCIT, mais son bord bas-centre reste
PAR DÉFINITION le point que le code utilise) : dans les deux cas, `cellRt.anchoredPosition`
continue de valoir EXACTEMENT `pivot_px` transformé, parce que rien dans cette formule ne lit la
géométrie interne du PNG. **pp-F2 n'a jamais vu cette classe de delta, pour AUCUN des 54 sprites,
avant ce lot non plus** — ce n'est pas un trou introduit par v2, c'est une propriété non couverte
de la conception depuis P3 (round 6/laverie l'a déjà rencontrée : la vérification du pivot après
un recadrage manuel s'est faite par SCRIPT PYTHON externe, jamais par un test C# permanent, avec
la raison explicite « risque spécifique à UNE édition, pas justifiant un falsifiable permanent »
— précédent direct, même classe de risque).

### Mesure indépendante — le delta usine ne dégrade PAS le rendu (au contraire)

Le contrat implicite (« bas-centre du FICHIER ≈ pied visuel du bâtiment ») n'a JAMAIS été
« zéro marge » — mesuré sur v1 ET v2, aux 4 côtés, par script Python (bbox alpha ≥128 vs bord du
fichier) :

| sprite (ppm24)        | v1 marge basse (px / % hauteur) | v2 marge basse (px / % hauteur) |
|---|---|---|
| usine_nuit_base        | 115 px / 15,8 %                  | 14 px / 2,7 %                    |
| entrepot_nuit_base      | 78 px / 18,4 %                   | 16 px / 6,8 %                    |

**v2 RESSERRE la marge dans les deux cas** (dalle retirée ⇒ cadrage plus proche du contenu réel,
G1+G2 atelier) — la « distance de flottement » implicite entre le bord du fichier et le pied
visuel du bâtiment DIMINUE, elle n'augmente pas. Ce n'est pas une garantie formelle (pp-F2 ne
teste toujours pas cette propriété, avant ni après), mais c'est la DIRECTION opposée à une
régression.

Composite visuel indépendant (Python/PIL, sprite v2 collé bas-centre sur `pivot_px` réel du fond
v2, parcelle (0,3) — n'importe quelle parcelle du maillage, le sol/trottoir y est homogène) :
usine et entrepot posent leur mur avant EXACTEMENT sur le trottoir peint dans le fond, sans écart
visible de flottement ni d'enfoncement — captures `preview_usine_v2_on_fond.png`/
`preview_entrepot_v2_on_fond.png` (scratchpad, non commitées — juste une preuve de raisonnement,
la certification RÉELLE se fait par capture Unity + sonde, § 4 ci-dessous).

### Verdict — pas de correctif de code, delta consigné

Conservateur (surface minimale) : **aucun changement de mécanisme d'ancrage** — le contrat
« bas-centre du fichier = pivot_px » est le contrat CANON (design §4/§8), pas une approximation.
Le delta (usine seul, dy_bas +36,6px@24/+86,1px@56 entre AVANT/APRÈS retrait de dalle, sur cadre
gelé identique — mesure atelier, re-vérifiée : bbox v1 989×726→v2 712×515 EST confondue avec un
autre effet, celui de G1/cadrage gelé, PAS isolable a posteriori sur les fichiers finaux livrés —
seule la mesure ATELIER isolait G2 seul) ne casse aucune falsifiable existante et, mesuré
indépendamment ici, RESSERRE la marge de flottement plutôt que de l'aggraver. Consigné comme
Deviation (imprévu non bloquant, § Deviations).

## 4. Capture + certification transport — BIT-EXACT sur les deux fonds v2

Protocole : flux réel (compte `citymap_demo` seedé, `SeederSupport.CityMapSeeder` — idempotent),
`AppShell` → City → `EnterDistrict(16)` → jour_phase forcé (NIGHT puis DAY, mécanisme identique à
`EnterDistrictViaRealFlow`/nav-F4) → `ScreenCapture.CaptureScreenshot` plein écran (protocole établi
`Path.Combine(Application.dataPath,"Screenshots",...)`, patron `PipelineOverviewPlayModeTests.cs`/
`BuildingCardPlayModeTests.cs`). Captures commitées : `Assets/Screenshots/district_fond_v2_{nuit,
jour}.png`, 1280×720 (résolution RÉELLE du Game View au moment de la capture — la caméra de recette
avait changé depuis le cycle précédent (1100×577) : mesuré, pas supposé).

Rect du fond dans la capture (protocole r9) : **retrouvé par recherche d'offset indépendante**
(script Python, corrélation exhaustive de `VERGE_D_{NUIT,JOUR}_FINAL.png` contre la capture sur une
bande médiane hors-chrome, ±3px autour de la position centrée prédite) — le log `Debug.Log` du test
n'a pas pu être relu après coup (`read_console` de l'instance MCP ne retient qu'un tampon court,
piège d'outil distinct de ceux déjà consignés au socle, pas creusé plus avant — hors scope). Résultat,
**identique aux 3 décimales pour NUIT et JOUR** : `rectX=100 rectYTopDown=-600` (= `(1280-1080)/2` et
`(720-1920)/2`, EXACTS — 1280 et 720 sont PAIRS, donc AUCUNE phase demi-pixel, contrairement au
1100×577 impair du cycle précédent — meanAbsDiff=0.000 sur 21600 échantillons dès la position prédite,
tous les offsets voisins ±1px pires d'un facteur ≥170×).

**Oracle BRUT (hors sonde), fenêtre sans chrome** — chrome localisé par balayage ligne-à-ligne (le
TopBar occupe les lignes 0-57, transition nette à 56-58, le TabBar les lignes 656-719, transition à
654-656 — mesuré, pas recopié du cycle précédent puisque le TopBar est en cours d'édition parallèle
HUD v3.1 et sa hauteur n'est PLUS garantie 56 unités). Fenêtre retenue : capture
`x=100,y=60,w=1080,h=594` / source `x=0,y=660,w=1080,h=594`. Diff pixel EXHAUSTIF (script dédié
`raw_pixel_diff.py`, tous les pixels de la fenêtre, pas un échantillonnage) :

```
NUIT : RAW_DIFF window=1080x594 compared=641520 masked_out=0 nonzero=0 maxdiff=0 meandiff=0.0000
       VERDICT: BIT-EXACT
JOUR : (même fenêtre, même résultat — non ré-imprimé, vérifié identique)
```

Aucun masque d'empreinte bâtiment n'a été nécessaire : 0 bâtiment n'occupe cette fenêtre pour ce
compte (`citymap_demo` — voir § écarts non fermés, ce compte n'a pas le starter kit d'un joueur
frais).

**Sonde `Tools/resemblance-probe.py`** — brut (attendu ROUGE, fond natif > viewport, §2.1 du design,
inchangé) puis recadré sur la même fenêtre hors-chrome :

```
NUIT brut    : transport=7.589 nocalque=14.166 cadre=0 corr=0.8369 classe=INDÉTERMINÉ (attendu)
NUIT recadré : F-transport=0.00 F-nocalque=0.00 F-cadre 4/4 corr=1.0000 classe=ALIGNÉ — BIT-EXACT
JOUR recadré : F-transport=0.00 F-nocalque=0.00 F-cadre 4/4 corr=1.0000 classe=ALIGNÉ — BIT-EXACT
```

**Verdict : transport intact, BIT-EXACT sur les deux fonds v2**, cohérent avec le mécanisme déjà
prouvé (`SnapToScreenPixel`, code inchangé par ce lot) — cette re-certification confirme que le
mécanisme de compensation reste correct sous un artefact source DIFFÉRENT et un viewport DIFFÉRENT
(1280×720 pair, jamais mesuré avant), pas seulement sous les conditions du cycle précédent.

### Écart non fermé, trouvé pendant la capture — PAS dans mon périmètre, signalé

La capture plein écran montre, en MARGE GAUCHE de l'écran (x<100, donc HORS de la fenêtre mesurée
ci-dessus — **la certification n'en est pas affectée**), une liste de noms de districts
("Verge-A / Tidewater / Spine-A..D / Stack-1..2") qui appartient structurellement à
`CityMapController.BuildLayout()` (`CityMapRoot`, cellules `DistrictCell` par `NewUI(...,mountRoot)`).
Elle ne devrait plus être visible après `AppShell.EnterDistrict()` (qui appelle `UnmountCurrentTenant()`,
lequel détruit explicitement TOUS les enfants de `ContentSlot` — code lu, le mécanisme est bien
conçu pour ce cas). Observée IDENTIQUE sur les deux captures (nuit ET jour, deux exécutions de test
séparées). Je n'ai PAS pu déterminer la cause exacte sans instrumenter `AppShell.cs`/
`CityMapController.cs` — **hors périmètre de ce lot** (Shell, en édition parallèle HUD v3.1) et
sans falsifiable existante qui l'aurait vu (nav-F4 ne vérifie que les bornes d'éléments NOMMÉS, jamais
un balayage de contenu résiduel). Signalé ici pour un chunk navigation futur — PAS corrigé, PAS de
fichier Shell touché.

## 5. Tests catégorie W3U2 — 67/68 verts, 1 rouge HORS PÉRIMÈTRE (HUD, pas district)

Run complet, catégorie `W3U2`, après import v2 : **68 tests, 67 verts, 1 rouge**
(`MafiaCleanCity.Shell.Tests.HudPlayModeTests.F2_BucketLiteralOccurrences_EqualMeasuredAllowlist` —
« attendu 24 littéraux de bucket, trouvé 25 » — un test d'allowlist HUD sur les littéraux
bucket→apparence, territoire de l'autre coder en cours d'édition (HUD v3.1, commits `canon screen_2`
en cours dans `mafia-clean-city` pendant ce même lot). **Pas touché** : hors périmètre (Shell/HUD),
et le rouge est cohérent avec un chunk HUD encore en vol (littéral ajouté, allowlist pas encore mise
à jour côté auteur).

Re-run scopé, `DistrictBackgroundPlayModeTests` seul (pp-F1, pp-F2/F-calage, pp-F3×2, pp-F6, amb-F7) :
**6/6 verts**, confirmé une seconde fois indépendamment de la passe catégorie complète — pp-F2
tourne VERT avec le corpus v2 (cohérent avec § 3 : la propriété qu'il teste est vraie par
construction).

Tous les tests district/navigation/nocturne (`DistrictInterior*`, `DistrictNightTokens*`,
`DistrictTinted*`, `NavigationPlayModeTests` incl. nav-F4/district 16, `BuildingSpriteSlots*`,
`BuildingCardMaintenanceKeys*`) sont dans les 67 verts — aucun n'a rougi avec le corpus v2.

## § Deviations

1. **sprites_post.py non ré-exécuté** — quoi : le geste 2 du mandat prescrivait de vérifier si
   sprites_post produit des assets consommés par Unity et de l'exécuter le cas échéant. Pourquoi :
   mesuré que ce script appartient à un pipeline legacy incompatible par NOMMAGE avec le corpus
   livré, et que la propriété qu'il garantirait est déjà assurée par le cadrage gelé de
   `sprites_batch.py` (mesuré indépendamment, 24/24). Ce que la consigne disait : « exécute-le côté
   atelier si besoin ». Option retenue : ne pas l'exécuter, consigner la mesure complète (§2).
2. **Delta de pivot usine (dy_bas) non compensé par du code** — quoi : le mandat signalait un delta
   de +36/+85px et demandait de vérifier si pp-F2 le voit. Pourquoi : pp-F2 est structurellement
   aveugle à cette classe de delta (tautologie du CONTENEUR, § 3) et le contrat canon place le
   bas-centre du FICHIER, jamais un point mesuré dans le contenu, comme pivot — aucune divergence
   avec le design. Mesure indépendante (marge bas v1→v2) montre une amélioration, pas une
   régression. Précédent direct : laverie round 6, même classe de risque, même réponse (script
   externe ponctuel, pas de falsifiable permanent, pas de changement de mécanisme).
