# Pivot « fond pré-rendu » — chunk P3 (Unity), notes d'implémentation

Auteur : coder (Sonnet). Spec : `Tools/pivot-fond-prerendu-design.md`, gate ⊥ APPROVED
2026-08-20 (commit `74f1479`). Scope : §P3 de l'ordre de livraison — `DistrictInteriorScreenController`
rend fond + bâtiments ancrés, falsifiables pp-F1/F2/F3/F5/F6, `defaultScreenOrientation` portrait,
capture + sonde de ressemblance, run PlayMode W3U2 complet.

## Ce qui a été livré

- Import : 2 fonds (`VERGE_D_NUIT_FINAL`, `VERGE_D_JOUR_FINAL`) + leurs JSON d'ancrage sous
  `Assets/Art/District/Backgrounds/` ; 54 sprites joueur (27 template×état × 2 PPM) sous
  `Assets/Art/District/Sprites/`. Réglages 1:1 STRICT vérifiés sur les 56 textures (compression
  Uncompressed/RGBA32, mipmap off, filterMode Bilinear, textureType Sprite, spriteMode Single) —
  evidence : `execute_code` lisant `TextureImporter` + `Texture2D.format` après réimport, collée
  ci-dessous (§ Evidence).
- `Assets/Scripts/CityMap/DistrictBackgroundAnchorDto.cs` (neuf) — DTOs JSON (`schema, district_key,
  profil, mode, camera, image, base_px_par_m, pas_parcelle_m, ppm_plan, parcelles[]`) + le helper
  PUR `DistrictBackgroundAnchor` (bloc→pixel→UI, §4 du design : Unity NE DÉRIVE RIEN, il lit).
- `Assets/Scripts/CityMap/DistrictBackgroundSlots.cs` (neuf) — registre `profil → (fond, ancre)`,
  REUSE du seam `Resources.Load`/`Current` de `BuildingSpriteSlots`/`DesignTokens`. Asset
  `Assets/Resources/DistrictBackgroundSlots.asset` créé, `vergeNuit` câblé sur les fichiers importés.
- `DistrictInteriorScreenController.cs` réécrit (§ RenderNightDiorama/BuildBuildingCell) : plus de
  grille procédurale ; le fond (résolution native compensée, ancré au centre, pp-F1) + un conteneur
  `Cell_{x}_{y}` par bâtiment (taille = sprite natif compensé, position = `pivot_px` du JSON,
  pp-F2/F-calage, pp-F3) remplacent `GridArea`/`GridFloors`/`GridBorder`/`OutOfDistrictBackdrop`/
  `Haze`/`BuildAmbientCell`/`IsStreetCell`/`FloorTint`. Les 5 bindings lumineux (C9) et les
  marqueurs de lieutenant (C10) sont INCHANGÉS (fractional anchors, indépendants de CellSize).
- `BuildingSpriteSlots.asset` re-câblé : les 7 slots de base + leurs `OverlaySet` pointent
  désormais sur des sprites `_ppm24.0` réels de l'atelier (mapping ci-dessous, § Deviations).
- `ProjectSettings.asset` : `defaultScreenOrientation: 0` (Portrait), autorotation limitée au
  portrait seul (`allowedAutorotateToPortrait: 1`, les 3 autres à `0`) — posé via
  `PlayerSettings` (API, pas d'édition YAML manuelle), vérifié par lecture directe du fichier.
- Falsifiables neuves : `Assets/Tests/PlayMode/DistrictBackgroundPlayModeTests.cs` (pp-F1, pp-F2/
  F-calage, pp-F3 en 2 parties, pp-F6, `amb-F7` relocalisée). Amendement NOMMÉ de pp-F5
  (`DistrictInteriorDioramaPlayModeTests.cs:241`, `childCount` 4→2) dans le MÊME commit que le
  retrait d'`OutOfDistrictBackdrop`/`Haze`.
- Retraits NOMMÉS (aucun silencieux) : `DistrictAmbientFillPlayModeTests.cs` (amb-F1..F8, table de
  correspondance dans l'en-tête du nouveau fichier) et `DistrictInteriorFloorOrderPlayModeTests.cs`
  (R4F1/R4F2) — raisons détaillées dans les en-têtes des fichiers concernés (design §7 pour les
  amb-F*, absence d'objet à ordonner pour R4F1/R4F2).
- `NavigationPlayModeTests.cs` : nav-F4 (district 16) amendée (titre inchangé, grille/largeur
  retirées avec raison nommée) + nav-F4 étendue au district 3 (§12 du design) — mesurée VERTE.

## § Deviations (imprévus non bloquants, options conservatrices)

1. **Mapping atelier→`operational_type`, NON prescrit par ce design** (le design couvre la
   géométrie/l'ancrage, pas l'assignation content). Choix conservateur, documenté, trivialement
   réversible dans l'asset (patron C6, zéro C#) :
   `lab←usine` · `stash←entrepot` · `front_shop←epicerie` · `cash_safehouse←residentiel3` (voir #5,
   remplace `laverie` défectueux) · `grow_house←residentiel2` · `dealer_spot_front←diner` ·
   `money_holding←hotel` (overlay neon←`hotel_nuit_sign`, seul état nommé différemment) ·
   `fallback←barbier`. `bar_hero`, `residentiel4`, `residentiel5` restent importés mais NON câblés
   (pas de 8e/9e/10e slot dans `BuildingSpriteSlots` — hors scope de ce chunk).

2. ⚠️ **AMENDÉE (round 4, verdict ⊥) — DIAGNOSTIC INITIAL FAUX, corrigé par une mesure dans la
   BONNE base.** La première version de cette Deviation comparait un pas mesuré en PIXELS BRUTS à
   une formule qui suppose le maillage aligné sur l'axe monde X — hors tolérance de plus de 1000px
   — et concluait que la propriété de pas régulier du design NE TENAIT PAS sur la donnée livrée.
   **Cette conclusion était FAUSSE.** Le maillage EST un quadrillage régulier en MÈTRES MONDE, à
   ~6,50m de pas sur toute sa longueur (54 pas horizontaux mesurés, extrêmes 6.4998–6.5006m) — il
   est simplement TOURNÉ d'environ 21,2° par rapport aux axes `ex`/`ey`, et la base `(ex,ey)`
   elle-même est OBLIQUE (déterminant non nul, axes du maillage orthogonaux entre eux à ~90,00°
   mesurés dans cette base — la grille est un vrai rectangle, pas les axes monde). Un pas en pixels
   bruts ne peut donc jamais se comparer à `pas_parcelle_m × |ex|` — ce n'est pas la question que
   pose la donnée. Le contrôle a été refait : résoudre le pas mesuré dans la base `(ex,ey)` (système
   2×2, données déjà dans le DTO) et vérifier que sa norme EN MÈTRES vaut `pas_parcelle_m` — c'est
   ce que `DistrictBackgroundPlayModeTests.cs` (`PpF2_...`, commentaire in-situ) vérifie désormais,
   remplaçant le contrôle précédent qui comparait le JSON à une translation de lui-même
   (tautologique — il ne pouvait rougir sur AUCUN maillage, régulier ou non).

3. **pp-F3, second volet — interprétation de `largeur_monde_m`.** Le design ne fournit aucune
   table de largeurs réelles par template (ni dans les artefacts livrés, ni dans le code existant),
   et en dériver une nécessiterait Blender headless (hors outillage/scope de ce chunk Unity).
   Interprétation retenue, non-circulaire : chaque sprite est comparé à son PROPRE jumeau d'autre
   PPM (le même template+état existe aux deux PPM 24.0/56.471) — `largeur_monde_m` dérivée du
   jumeau, testée contre le ppm PROPRE du sprite. Couvre exhaustivement les 54 sprites (27 paires).

4. **pp-F3 clause 1 — échantillon, pas exhaustif.** Le facteur d'affichage 1,000 n'est vérifiable
   QUE sur un sprite RENDU (une RectTransform n'existe que pour un sprite affiché à l'écran) — testé
   sur les 4 bâtiments réels du J0 (un par `operational_type` WIRED). C'est un ÉCHANTILLON
   représentatif, pas les 54 — la clause 2 (cross-PPM) couvre, elle, les 54 exhaustivement.

5. **Défaut mesuré, hors périmètre — `laverie_nuit_base` (les 2 PPM).** Seul des 27 couples livrés
   dont le ratio croisé dépasse 1% (mesuré 9,02% sur la largeur, 24:159×145 vs 56.471:347×375,
   contre ≤0,34% pour les 26 autres). `BuildingSpriteSlots.cashSafehouse` a été RE-CÂBLÉ sur
   `residentiel3` (propre, 0,12%) pour ne pas dépendre de l'asset défectueux dans le chemin de
   rendu — `PpF3_Part2` (balayage exhaustif des 54 fichiers bruts) reste ROUGE sur ce cas,
   VOLONTAIREMENT (masquer serait le trou que le socle interdit). Correctif réel = re-rendu Blender
   (chunk P1, atelier), hors outillage de ce chunk. Commentaire in-situ dans le test.

6. **Tokens `nightBackground`/`nightFloorAlt`/`nightBase` (FloorTint) — orphelins, non supprimés.**
   `FloorTint()` (le seul consommateur) est retiré avec la grille. Les 3 champs restent déclarés
   dans `DesignTokens.cs`/`.asset` (R2.3, registre partagé) : les supprimer est un changement de
   surface plus large (risque sur le gate de parité `DesignTokensParityPlayModeTests`) et n'est pas
   demandé par ce design. `DistrictNightTokensPlayModeTests.cs` (R2F1/R2F2/R3F1/R3F2) ne référence
   QUE les valeurs de token (comparaisons statiques), jamais le contrôleur — ces tests restent
   VALIDES et VERTS tels quels, mais leur PRÉMISSE implicite (« ces couleurs sont vues à l'écran »)
   ne tient plus pour cet écran spécifique. Consigné, pas silencieux.

7. **`BuildingSpriteSlots.metresParBloc`/`ambientVerge`/`ambientDefaut` — orphelins, non
   supprimés**, même raisonnement (retirer des champs d'un ScriptableObject partagé est un
   changement de surface hors du périmètre de ce chunk ; `AmbF7` — seul test encore vivant sur ce
   territoire — ne les référence pas).

8. **Grille de secours pour blocs sans ancre JSON.** Un profil sans fond (vague 1 : tout sauf
   `verge`) ou un bloc absent de la carte reçoit une position déterministe `(x×100, −y×100)` en
   unités canvas compensées — JAMAIS testée au pixel (seul verge/district 16 porte pp-F2). Sert
   UNIQUEMENT à garder vivants les tests à payload synthétique (profil `lattice` : C9, C10,
   lieutenant-markers) qui n'ont pas de fond en vague 1 et ne testent pas la position.

9. **Repli `DistrictBackgroundPlaceholder` confiné aux insets, pas un `Stretch(0,0)` plein-root.**
   Mesuré (nav-F4/district 3, 2 itérations) : `ContentSlot`/`root` couvrent le MÊME espace que
   `TopBarSlot`/`TabBarRoot` (la non-occlusion du shell tient par l'ORDRE DE FRATRIE, `AppShell.cs:
   29-33`, pas par un `ContentSlot` rétréci) — un `Stretch(0,0)` naïf chevauchait donc les deux
   barres en bornes brutes. Le repli respecte désormais `safeInsetTop`/`safeInsetBottom` (+2px de
   marge : un contact EXACT sur la borne compte comme une intersection pour `Bounds.Intersects`,
   mesuré une fois, corrigé).

10. **`nav-F4` (district 16) amendée, pas seulement étendue.** La grille CONFINÉE (dimensionnée
    pour ContentSlot) n'existe plus ; le fond est désormais NATIF (1080×1920 réels), et un fond
    natif dépasse un viewport de test 1100×577 — donc chevauche `TopBarSlot`/`TabBarRoot` en
    bornes brutes, BÉNIN (même argument de fratrie que #9). La vérification titre-vs-TopBar SURVIT
    inchangée ; la vérification grille-vs-TabBar + largeur≥60% est retirée avec raison nommée,
    remplacée par une propriété positive (le fond dépasse ContentSlot en HAUTEUR — mesuré, l'axe où
    ça se voit ; la LARGEUR, elle, reste sous celle de ContentSlot à ce scaleFactor).

11. **`Canvas.pixelPerfect = true` ajouté** dans `BuildRoot()` — `grep` : posé nulle part ailleurs
    dans ce dépôt. Amélioration de bonne foi (la primitive Unity la plus proche du ruling user
    « pixel perfect »), mesurée SANS effet significatif sur l'écart résiduel de la sonde de
    ressemblance (§ Sonde ci-dessous) — conservée car neutre-à-positive sur tout le reste, jamais
    négative dans les mesures faites.

12. **Fond `JOUR` (`VERGE_D_JOUR_FINAL`) importé, PAS câblé.** D8 (mapping day_phase→art) est
    inchangé par ce pivot (§7 du design, chunk nav-hud non touché) — NIGHT seul construit l'art
    héros, DAWN/DAY/DUSK restent le repli déclaré existant. Câbler le jour est un chunk futur.

13. **pp-F7/pp-F8 non implémentées.** Le mandat de ce chunk (voir tête du prompt) énumère
    explicitement pp-F1/F2/F3/F5/F6 comme livrables Unity ; pp-F7 (parcellaire complet dans le
    cadre) et pp-F8 (ancrage vient de Blender) valident les artefacts P0 (JSON produit par
    l'atelier), pas le rendu Unity — hors périmètre annoncé de ce chunk.

## § Sonde de ressemblance — investigation complète (point faible nommé, remonté au ⊥)

**Capture** (flux réel : signup frais → session/open → AppShell → City → EnterDistrict(16) →
day_phase forcé NIGHT) à `Assets/Screenshots/district_fond_v1.png`, 1100×577 (résolution RÉELLE du
Game View mesurée, jamais supposée). Rect du fond imprimé AU MOMENT DE LA CAPTURE (protocole r9) :
`X=10 Y=-672(top-down) W=1080 H=1920` (coïncide exactement avec un centrage parfait : marge
horizontale (1100-1080)/2=10 ✅, centrage vertical (577-1920)/2=-671.5≈-672 ✅ — la géométrie de
compensation est ALGÉBRIQUEMENT exacte, confirmée deux fois indépendamment).

**Verdict brut** (`--rect 10,-672,1080,1920`, sans déclaration) : F-cadre ROUGE (0/4 coins — la
zone visible ne couvre que ~30% de la hauteur du fond, aspect 9:16 contre viewport 1100×577,
attendu et anticipé par le design §2.1). Avec `--declare-fraction 0.3005` : F-cadre VERT, mais
F-transport et F-nocalque restent ROUGES avec un ratio ~1,7-1,8:1 (signature « calque »).

**Diagnostic → contamination par le chrome.** `TopBarSlot` (56 unités × 0,859375 ≈ 48px réels) et
`TabBarRoot` (64×0,859375=55px) recouvrent LÉGITIMEMENT le haut/bas du fond (même ordre de fratrie
que #9/#10) — la comparaison brute inclut donc des pixels de TopBar/TabBar comparés au fond,
faussant la mesure. Recadrage source+capture sur la bande SANS chrome
(capture y∈[49,522], x∈[10,1090] → source y∈[721,1194]) : **F-cadre VERT nativement (tailles
identiques 1080×473), F-nocalque VERT (0,23, seuil 0,50) — les APLATS sont fidèles.** F-transport
reste ROUGE : **MAE arêtes ≈5,4-6,7, ratio ≈23-40:1 → diagnostic RÉÉCHANTILLONNÉ** (signature de la
sonde elle-même, `Tools/resemblance-probe.py`).

**Cette valeur correspond presque exactement à la 2ᵉ branche PRÉDITE À L'AVANCE par le mandat**
(« absente ⇒ RÉÉCHANTILLONNÉ, MAE arêtes ~6-7, ratio≥8:1 ») — donc F-transport NE CERTIFIE PAS
« transport intact » en l'état, malgré une géométrie de placement PROUVÉE exacte.

**Hypothèses testées, dans l'ordre, toutes RÉFUTÉES sauf la dernière (non résolue) :**
1. *Filtrage Bilinear (flou d'interpolation sous-pixel)* — testé en basculant l'import en `Point` :
   AUCUNE amélioration (6,71 MAE, ratio 40:1 — légèrement PIRE). Réfuté : même le nearest-neighbor
   montre la signature, donc ce n'est pas un flou d'interpolation.
2. *Dérive d'échelle (mauvais facteur, drift croissant avec la distance au centre)* — recherche par
   force brute du meilleur décalage (dx,dy) à 5 positions X réparties sur toute la largeur (50 à
   1060) : le meilleur offset reste `(0, 0 ou 1)` PARTOUT, aucune dérive détectée. Réfuté.
3. *`Canvas.pixelPerfect`* — posé à `true` (§ Deviations #11) : AUCUN effet significatif mesuré
   (5,40→5,63 MAE sur le même crop). Réfuté comme correctif suffisant (conservé quand même,
   neutre-à-positif).
4. *Drapeau `sRGBTexture`* — désactivé en test : EFFET CATASTROPHIQUE (MAE 62,88, ratio 1,1:1 —
   un vrai décalage gamma uniforme). CONFIRME que `sRGBTexture=true` (défaut Unity, conservé) est
   CORRECT, et réfute cette piste comme cause du problème résiduel.
5. *Inspection visuelle directe* (crop 200×100 agrandi ×4, source vs capture côte à côte) : les
   deux images sont visuellement très proches, aucun défaut grossier visible à l'œil — cohérent
   avec un écart mesuré réel mais SUBTIL (pas une image cassée).
6. **Hypothèse non résolue, la plus plausible sur les indices disponibles** : le projet est en
   `colorSpace=Linear` avec un pipeline URP (`PC_RPAsset`) — `QualitySettings.activeColorSpace`
   mesuré directement. Une scène TRÈS SOMBRE (nuit — la majorité des échantillons de bord sont sous
   RGB(60,60,60)) traversant un pipeline Linear avec un framebuffer 8 bits peut perdre de la
   précision de façon non-uniforme, plus visible aux ARÊTES (fort gradient local) qu'aux APLATS
   (où le même écart s'applique presque uniformément et s'annule en moyenne) — cohérent avec le
   signal mesuré (arêtes mauvaises, aplats parfaits). PAS CONFIRMÉ : nécessiterait le Frame
   Debugger / RenderDoc, hors outillage et hors scope de ce chunk (config de pipeline de rendu
   PRÉEXISTANTE au pivot, jamais mentionnée par le design).

**⚠️ CONCLUSION POUR LE ⊥ : F-transport ne certifie PAS « transport intact » sur cette capture.**
Le géométrique (position, taille, cadrage une fois le chrome exclu) est prouvé exact par 3 mesures
indépendantes (pp-F1, l'auto-cohérence du centrage, la recherche d'offset à force brute). L'écart
résiduel est réel, mesuré, karactérisé (RÉÉCHANTILLONNÉ, ~5,4-6,7 MAE, ratio 23-40:1) et
**correspond à la branche que le mandat avait explicitement anticipée** — ce n'est donc pas une
surprise à cacher, c'est le résultat mesuré que la sonde existe pour produire. Route possible non
essayée (hors scope coder) : Frame Debugger sur une capture Play-mode réelle, ou test avec
`Camera.main.allowHDR=false`/`GraphicsSettings` alternative — décision produit/pipeline, pas un
choix technique tranché par une mesure que je peux faire seul.

## § Evidence (build/tests)

- Compilation : `refresh_unity(compile=request, force, all)` → 0 erreur à chaque étape (collé en
  transcript de session).
- Import textures (56 fichiers, 54 sprites + 2 fonds) : `TextureImporter` relu après réimport —
  `textureType=Sprite spriteMode=Single mipmap=False filter=Bilinear compression=Uncompressed
  texFormat=RGBA32 texW=1080 texH=1920` (échantillon fond) — evidence complète en transcript.
- PlayMode, catégorie W3U2 complète : **56 tests, 55 verts, 1 rouge documenté**
  (`PpF3_Part2..._laverie_nuit_base`). Avant (mesuré sur `git show 74f1479`, compte RUNTIME réel
  incluant les `[TestCase]` de `DistrictTintedImagePlayModeTests`/`ChromeTabAccentAllowlist...`,
  non touchés par ce chunk) : 59. Delta −3 = −8 (amb-F1..8 retirées comme fichier) −2 (R4F1/R4F2
  retirées) +1 (nav-F4/district-3) +6 (nouveau fichier pp-F1/F2/F3×2/F6 + amb-F7 relocalisée).
  Vérifié deux fois : par comptage statique des attributs `[Test]`/`[UnityTest]` (50→47, delta −3)
  ET par le run RÉEL (59→56, même delta −3) — les deux méthodes s'accordent.
- ⚠️ **Piège de mesure évité** (socle : `ls`/`wc -l` proxifiés) : un premier `ls Sprites/*.png |
  wc -l` a rendu 56 (faux) contre 54 réels (`python3 -c "import glob; ..."`, oracle indépendant,
  confirmé par `AssetDatabase.FindAssets` côté Unity : 56 = 54 sprites + 2 fonds, cohérent).

---

## § ROUND 2 (verdict ⊥ sur la sonde) — geste par geste, 2026-08-20

Contexte : le ⊥ a confirmé la géométrie une 4ᵉ fois (corrélation normalisée 0,9098, échelle
1,000, offset ±2px) et classé la panne comme un TRANSFORT DE VALEURS (« calque »), pas un
rééchantillonnage — sur SA mesure de « l'état livré » : MAE 59,63 / ratio 1,1:1. Il notait aussi
que mon 5,4/23-40:1 du round 1 n'était pas reproductible chez lui faute d'avoir reçu le rect exact.

### Geste 1 — le chiffre arbitral (rect imprimé, source brute, sans recadrage ni déclaration)

Re-capture fraîche (flux réel identique au round 1), rect imprimé AU MOMENT DE LA CAPTURE :
`screenW=1100 screenH=577 rectX=10 rectYTopDown=-672 rectW=1080 rectH=1920 scaleFactor=0.859375`
— identique au round 1 à 1px près (confirmé par une recherche d'offset indépendante, voir plus
bas), la géométrie ne bouge pas.

```
python3 Tools/resemblance-probe.py --source .../VERGE_D_NUIT_FINAL.png \
  --capture Assets/Screenshots/district_fond_v2_methodA_capturescreenshot.png --rect 10,-672,1080,1920
```
```
F-transport  MAE arêtes =  10.48   (seuil ≤ 1.00)  ROUGE
F-nocalque   MAE plats  =   5.95   (seuil ≤ 0.50)  ROUGE
F-cadre      rect 1080x1920 vs source 1080x1920, coins 0/4  ROUGE
diagnostic   CADRE (rect 1080x1920 != source 1080x1920) — les MAE ci-dessus mesurent le décalage
             du mapping, PAS une panne de teinte
RESULT transport=10.479 nocalque=5.951 ratio=1.8 cadre=0 compares=2101/432
```
F-cadre rouge = attendu (le fond natif 1080×1920 dépasse le viewport 1100×577, §2.1 F-cadre du
design). Ce chiffre — **10,48 / 5,95 / ratio 1,8:1** — est LE chiffre arbitral demandé : reproductible
2 fois (round 1 et round 2, sessions Unity distinctes), byte-cohérent aux 3 décimales près.

### Geste 2 — une variable à la fois

| variable | protocole | résultat | verdict |
|---|---|---|---|
| **(a) méthode de capture** | `ScreenCapture.CaptureScreenshot` vs `Texture2D.ReadPixels` manuel, MÊME frame (`WaitForEndOfFrame` commun), même rect | `10.479/5.951/1.8` pour LES DEUX, **identique à la 3ᵉ décimale** | **RÉFUTÉE** — la méthode de capture n'est pas la variable |
| **(c) config URP caméra/Canvas** | Mesuré en jeu (réflexion, pas de doc) au moment exact de la capture | `camCount=0 volumeCount=0 rpAsset=Mobile_RPAsset colorGradingMode=LowDynamicRange GLsRGBWrite=True` | **RÉFUTÉE PAR MESURE** — zéro caméra, zéro Volume dans la scène : aucun post-processing/tonemapping n'est possible sur un Canvas Overlay sans caméra. Rejoint le ⊥ : un transform de valeurs existe, mais PAS celui-là. |
| **(b) sRGBTexture du fond, ISOLÉ** | toggle SEUL (filterMode/compression/pixelPerfect inchangés), recapture, sonde, puis revert | **off → 59.982/53.907/ratio 1.1** — quasi IDENTIQUE au chiffre du ⊥ (59,63/~/1,1). **on (= état commité SHA 92e3c08, vérifié `git show 92e3c08:...meta` → `sRGBTexture: 1`) → 10.479/5.951/1.8**, PAS 59,63. | **CONFIRMÉE comme levier réel et de grande magnitude** — mais dans la MAUVAISE direction pour expliquer « l'état livré » : le commit livré a `sRGBTexture=1` (le bon réglage), et NE reproduit PAS le chiffre du ⊥. |

**⚠️ Constat, pas une accusation — les faits, avec leurs commandes** : le chiffre du ⊥ (59,63,
ratio 1,1:1) est reproduit **presque exactement** par mon essai isolé `sRGBTexture=false`
(59,98/53,91/1,1) et **PAS DU TOUT** par l'état réellement commité (`sRGBTexture=true`, 10,48/5,95/1,8
brut). Deux lectures possibles, aucune tranchée ici : (i) sa mesure a porté sur un état transitoire
`sRGBTexture=false` — session Unity partagée, mon propre toggle du round 1 (testé puis reverti) —
si sa capture est tombée entre les deux ; (ii) autre chose explique la coïncidence. Ce que je PEUX
affirmer, avec commande+sortie collées à l'appui : **l'état COMMITÉ (SHA 92e3c08, celui qui compte)
a `sRGBTexture=1`, et NE mesure PAS 59,63/1,1 — ni en brut (10,48/5,95/1,8), ni en recadrage propre
(ci-dessous, 5,63/0,23/24:1)**. Recommandation : que le ⊥ re-mesure sur une capture FRAÎCHE,
horodatée après ce commit, pour lever le doute — je ne peux pas trancher pour lui.

**Recadrage propre (hors chrome TopBar/TabBar, `sRGBTexture=true`, l'état livré), reproduit 2×
(round 1 et round 2, à 0,03 MAE près)** :
```
F-transport  MAE arêtes =   5.63   (seuil ≤ 1.00)  ROUGE
F-nocalque   MAE plats  =   0.23   (seuil ≤ 0.50)  VERT
F-cadre      rect 1080x473 vs source 1080x473, coins 4/4  VERT
diagnostic   RÉÉCHANTILLONNÉ (signature arêtes/plats 24:1)
RESULT transport=5.632 nocalque=0.233 ratio=24.2 cadre=1 compares=3000/3000
```
Recherche d'offset indépendante (grille fine pleine résolution, 6≤rx≤22, -680≤ry≤-664, stride 5,
métrique luma) : meilleur point `rx=10, ry=-671` — **confirme le rect imprimé à 1px près**, donc ce
résidu n'est pas un défaut d'alignement de ma part.

**État final : AUCUNE des 3 variables prescrites, seule, n'atteint « transport intact ».**
(a) et (c) sont réfutées par mesure directe. (b) est un vrai levier (off casse tout), mais l'état
LIVRÉ a déjà le bon réglage et ne montre pas le grand écart rapporté — il montre un écart PLUS
PETIT mais toujours réel : MAE arêtes 5,63 (seuil 1,0), signature RÉÉCHANTILLONNÉ (24:1), pas
CALQUE. C'est le round 1 qui avait raison sur la SIGNATURE ; le round 1 avait tort de ne pas
transmettre le rect exact, ce qui a empêché le ⊥ de reproduire ce chiffre précis — corrigé ici.
**Piste non résolue, hors des 3 variables prescrites** : `Mobile_RPAsset` est actif en PlayMode
(pas `PC_RPAsset`, vu hors Play mode) — un tiers de qualité différent avec un pipeline couleur
propre est une 4ᵉ variable non testée par ce round, candidate pour la suite.

### Geste 3 — mode d'emploi de péremption sur le rouge laverie

Ajouté verbatim dans `DistrictBackgroundPlayModeTests.cs` (juste avant `PpF3_Part2`) : « CE ROUGE
EST ATTENDU tant que `laverie_nuit_base` n'a pas été re-rendue à l'atelier ; le jour où elle l'est,
ce test devient VERT et cette note doit être supprimée » — précédent `toBe(404)` du socle.

### Geste 4 — quantificateur « POUR CHACUN »

pp-F3 le portait déjà explicitement (§ header, « POUR CHACUN des sprites livrés », 27/27 couples
vérifiés par compte). pp-F2 le PORTAIT DÉJÀ EN CODE (`foreach` sur `dto.buildings`, anti-vacuité
`checkedBuildings==4`) mais le HEADER ne le disait pas explicitement — corrigé (aucun changement de
comportement, seulement la clarté du commentaire).

### Evidence finale round 2

PlayMode W3U2 complet, re-vérifié après tous les changements de ce round : **56 tests, 55 verts,
1 rouge** (`PpF3_Part2..._laverie_nuit_base`, désormais avec son mode d'emploi de péremption).

---

## § ROUND 3 (verdict ⊥ : Mobile_RPAsset.m_RenderScale) — 2026-08-20

**Comparaison statique** (geste 1) : `Assets/Settings/PC_RPAsset.asset` porte `m_RenderScale: 1` ;
`Assets/Settings/Mobile_RPAsset.asset` portait `m_RenderScale: 0.8` — cohérent avec le round 2
(`rpAsset=Mobile_RPAsset` mesuré actif en PlayMode ; `PC_RPAsset` est ce que je lisais hors Play
mode, expliquant la différence d'observation entre les deux contextes).

**Changement appliqué** (geste 2) : `Mobile_RPAsset.asset` `m_RenderScale: 0.8 → 1` (édition YAML
directe + `refresh_unity`, vérifié chargé côté Unity via l'API URP :
`Mobile_RPAsset.renderScale=1`).

⚠️ **DEVIATION (nature PRODUIT, à consigner)** — `m_RenderScale=0.8` était vraisemblablement un
choix de PERFORMANCE MOBILE (rendre à 80% de résolution puis upscaler, un compromis qualité/FPS
standard sur mobile), pas un défaut. Le ruling user « pixel perfect » DOMINE pour ce pivot, donc le
réglage passe à 1.0 — mais **la performance mobile devra être RE-VALIDÉE plus tard** (FPS sur
device réel) avant de considérer ce changement définitivement acquis. Valeur d'origine : `0.8`,
consignée ici pour un rollback informé si la validation perf l'exige.

**Re-capture + sonde (geste 3)** — MÊME protocole exact (flux réel, rect imprimé `10,-672,1080,1920`,
`scaleFactor=0.859375`, confirmé `renderScale=1` au moment de la capture) :

Brut (rect imprimé, F-cadre rouge attendu — fond natif > viewport) :
```
RESULT transport=10.479 nocalque=5.951 ratio=1.8 cadre=0 compares=2101/432
```
Recadrage propre (hors chrome TopBar/TabBar, F-cadre vert nativement) :
```
F-transport  MAE arêtes =   5.63   (seuil ≤ 1.00)  ROUGE
F-nocalque   MAE plats  =   0.23   (seuil ≤ 0.50)  VERT
F-cadre      rect 1080x473 vs source 1080x473, coins 4/4  VERT
diagnostic   RÉÉCHANTILLONNÉ (signature arêtes/plats 24:1)
RESULT transport=5.632 nocalque=0.233 ratio=24.2 cadre=1 compares=3000/3000
```

**⚠️ RÉSULTAT : IDENTIQUE au round 2, à 3 décimales près (5.632/0.233/24.2 avant ET après).**
`m_RenderScale` n'était PAS la cause de ce résidu — changer 0.8→1.0 n'a mesurablement RIEN changé.
Explication cohérente avec le round 2 : `camCount=0` pendant toute la capture (mesuré, réflexion,
pas la doc) — le Render Scale d'URP s'applique au rendu D'UNE CAMÉRA (rendre en interne à
renderScale×résolution puis upscaler) ; sans caméra du tout, un Canvas ScreenSpaceOverlay composite
directement sur le backbuffer final et n'a jamais transité par ce chemin, donc rien à corriger là.

**STOP, conformément à la consigne** — pas de bricolage supplémentaire. Le résidu RÉÉCHANTILLONNÉ
(MAE arêtes 5,63, ratio 24:1) reste réel, mesuré, reproduit sur 3 rounds indépendants avec des
protocoles légèrement différents, et n'est expliqué par AUCUNE des 4 variables testées à ce jour
(méthode de capture, sRGBTexture, config URP caméra/Volume, render scale). Le changement
`m_RenderScale=1` est CONSERVÉ (améliore la fidélité pixel-perfect par principe même sans effet
mesuré ici, et suit le ruling user) mais n'est plus une piste pour CE résidu spécifique.

---

## § ROUND 4 (verdict ⊥, relecteur frais) — CAUSE TRANCHÉE, CIBLE ATTEINTE — 2026-08-20

Diagnostic du ⊥ : phase sous-pixel (0,000 ; 0,500) produite par la PARITÉ IMPAIRE du viewport
(577 ⇒ centre vertical à 288,5, un demi-pixel). Sonde mise à jour (commit `238b1ab`, 3ᵉ branche
« corrélation au meilleur alignement », 7 contrôles dont un « phase sous-pixel 0,5px » — selftest
7/7 reproduit avant de commencer.

### Geste 0 — la preuve gratuite (prédiction ⊥ écrite d'avance : MAE ~0,0x VERT)

Re-capture à viewport **1100×576** (hauteur PAIRE, via un `GameViewSize` custom sélectionné par
réflexion — code du contrôleur INCHANGÉ à ce stade). Recadrage propre hors chrome, sonde :
```
F-transport  MAE arêtes =   0.00   VERT
F-nocalque   MAE plats  =   0.00   VERT
F-cadre      coins 4/4  VERT
corrélation  r = 1.0000  -> ALIGNÉ
diagnostic   transport intact
RESULT transport=0.000 nocalque=0.000 ratio=inf cadre=1 corr=1.0000 dxy=+0+0 classe=ALIGNÉ compares=3000/3000
```
**Prédiction confirmée exactement.** La cause est tranchée — pas de re-bouclage nécessaire.

### Gestes 1-3 — le correctif en code (viewport ODD 1100×577, le cas dur, gardé pour la suite)

- **B2** : `canvas.pixelPerfect = true` (ex `DistrictInteriorScreenController.cs:728`) RETIRÉ.
  Bloc de commentaire au-dessus PARAPHRASÉ (aucune citation de l'affirmation retirée) — décrit
  maintenant l'essai antérieur au passé, sa mesure négative, et renvoie au round 4 des notes.
- **Snap explicite** (`SnapToScreenPixel`, nouvelle méthode) : mesure `RectTransform.position`
  (coïncide avec l'écran sur un Canvas ScreenSpaceOverlay), arrondit au pixel entier, réinjecte la
  correction dans `anchoredPosition` via `lossyScale` (≈ `scaleFactor` sur cette hiérarchie).
  Appliqué au fond (geste 2, juste après `fondRt.anchoredPosition = Vector2.zero`) ET à CHAQUE
  ancre de bâtiment (geste 3 / I2, juste après `cellRt.anchoredPosition = localPos` — `:406`
  d'origine, `pivot_px` fractionnaire, aucun arrondi avant ce correctif).

### Geste 4 (B1) — capture sous l'état livré, commitée, avec son chiffre

Re-capture au viewport DUR (1100×577, impair) sous le code corrigé. Rect imprimé :
`rectX=10 rectYTopDown=-671 rectW=1080 rectH=1920` (glissé de −672 à −671 — le snap a bougé le
fond d'exactement 1px, la correction attendue). Fichier commité : `Assets/Screenshots/district_fond_v1.png`.

```
python3 Tools/resemblance-probe.py --source .../VERGE_D_NUIT_FINAL.png --capture district_fond_v1.png --rect 10,-671,1080,1920
```
Brut (F-cadre rouge attendu — fond natif > viewport, §2.1 du design, inchangé) :
```
RESULT transport=3.334 nocalque=5.820 ratio=0.6 cadre=0 corr=0.9486 dxy=+0+0 classe=ALIGNÉ compares=2088/427
```
**Recadrage propre hors chrome TopBar/TabBar — LE CHIFFRE FINAL :**
```
F-transport  MAE arêtes =   0.00   (seuil ≤ 1.00)  VERT
F-nocalque   MAE plats  =   0.00   (seuil ≤ 0.50)  VERT
F-cadre      rect 1080x473 vs source 1080x473, coins 4/4  VERT
corrélation  r = 1.0000 au meilleur alignement (+0,+0)  seuils 0.70/0.90  -> ALIGNÉ
diagnostic   transport intact
RESULT transport=0.000 nocalque=0.000 ratio=inf cadre=1 corr=1.0000 dxy=+0+0 classe=ALIGNÉ compares=3000/3000
```
**CIBLE ATTEINTE : transport intact, sur le viewport DUR (impair), capture commitée reproductible.**

**Validation de la falsifiable pré-enregistrée ⊥ (« pixelPerfect ON ⇒ ~1,3-1,4 ROUGE ; OFF ⇒
~0,0x VERT »)** — testée par une réactivation TEMPORAIRE de `canvas.pixelPerfect = true` après le
snap, recapture, sonde, puis retrait (état final = OFF, code livré). Résultat mesuré, honnête :
**les deux captures (ON et OFF) sont OCTET POUR OCTET IDENTIQUES** (md5 identique, 0 octet de
différence sur 1 532 520) — **0,00/0,00 VERT dans LES DEUX cas**, PAS ~1,3-1,4 ROUGE en ON. La
falsifiable numérique n'est donc PAS confirmée telle quelle sur cette mesure : une fois le snap
explicite en place, `pixelPerfect` n'a plus RIEN à corriger (positions déjà entières) et devient un
no-op mesuré, ni positif ni négatif — cohérent avec le retrait (B2) mais pas avec l'amplitude
prédite. Consigné sans l'ajuster pour coller à la prédiction.

### Geste 5 (I1) — le contrôle d'ancrage tautologique remplacé, Deviation #2 amendée

Vérifié indépendamment (Python, avant d'écrire le C#) : `det(ex,ey) = -338,26` ✓,
`√(a²+b²) = 6,5006m` pour le pas (0,0)→(1,0) ✓ (54 pas horizontaux mesurés : 6,4998–6,5006m),
angle entre les deux axes du maillage (dans la base ex,ey) = 89,997° ✓, rotation du maillage par
rapport à `ex` ≈ 21,198° ✓ — les 4 nombres du ⊥ reproduits à la 3ᵉ décimale. Le contrôle dans
`DistrictBackgroundPlayModeTests.cs` (`PpF2_...`) est remplacé : résout `perStep = a·ex + b·ey`
(système 2×2, données du DTO) et vérifie `√(a²+b²) == pas_parcelle_m` (±0,01m). La Deviation #2 de
ce fichier est amendée (paraphrasée, pas de citation du diagnostic retiré) — voir plus haut.

### Geste 6 (I3) — la note laverie, forme honnête

Retiré : la revendication que la note fonctionne comme le précédent `toBe(404)` (auto-invalidant
par un ROUGE à la fermeture). Ce test-ci VERDIT silencieusement à la fermeture du défaut — rien ne
force la relecture de la note. Dit tel quel maintenant : c'est une consigne en prose, acceptée
comme telle, pas un mécanisme qui s'applique tout seul.

### Geste 7 — evidence finale

PlayMode W3U2 complet, re-vérifié après TOUS les changements de ce round : **56 tests, 55 verts,
1 rouge** (`PpF3_Part2..._laverie_nuit_base`, note honnête). `pp-F1`/`pp-F2` (avec le nouveau
contrôle I1) inclus dans les 55 verts.

---

## § P4 (première tranche, périmètre écrit par le ⊥) — 2026-08-20

### a) Fond JOUR câblé

`DistrictBackgroundSlots.cs` : ajout `vergeJour` (BackgroundEntry) + généralisation
`ResolveNight(profile)` → `Resolve(profile, mode)` (`ResolveNight` conservée comme raccourci
`Resolve(profile, "nuit")`, zéro changement pour les appelants existants).
`DistrictInteriorScreenController.cs` : `DioramaArtPhase` gagne `DayHero` ; `ResolveArtPhase`
route NIGHT→NightHero, **DAY→DayHero** (neuf), DAWN/DUSK→NonHeroFallback (D8 original, inchangé —
aucun art DAWN/DUSK produit par l'atelier). `RenderNightDiorama`/`RenderDayDiorama` délèguent
désormais à `RenderHeroDiorama(dto, mode)` partagée (même construction, seul le fond change — les
sprites bâtiment restent `_nuit`, aucun sprite `_jour` livré par l'atelier, consigné ici).
`DistrictBackgroundPlayModeTests.cs`/`DistrictInteriorDioramaPlayModeTests.cs` (C8F5) amendés en
conséquence — `C8F5_ThreeNonHeroPhases...` devient `C8F5_TwoNonHeroPhases_MapToDeclaredFallback_DayAndNightMapToHeroArt`
(DAWN/DUSK seuls dans la boucle repli ; DAY vérifiée séparément comme second palier héros).

**Capture + sonde, DAY, viewport 1100×577** (`Assets/Screenshots/district_fond_jour_v1.png`,
rect imprimé `10,-671,1080,1920` — géométrie IDENTIQUE au fond nuit, même mécanisme) :

Brut (F-cadre rouge attendu, fond natif > viewport) :
```
RESULT transport=7.427 nocalque=9.942 ratio=0.7 cadre=0 corr=0.7627 dxy=+0+0 classe=INDÉTERMINÉ compares=1824/497
```
Recadrage propre hors chrome — LE CHIFFRE :
```
F-transport  MAE arêtes =   0.00   VERT
F-nocalque   MAE plats  =   0.00   VERT
F-cadre      coins 4/4  VERT
corrélation  r = 1.0000 -> ALIGNÉ
diagnostic   transport intact
RESULT transport=0.000 nocalque=0.000 ratio=inf cadre=1 corr=1.0000 dxy=+0+0 classe=ALIGNÉ compares=3000/3000
```
**Bit-exact, comme prédit** (même compensation, même snap que le fond nuit).

### b) Sonde de fidélité SPRITES — INSTRUMENT LIMITÉ, STOP conformément à la consigne

Bâtiment testé : `cash_safehouse` (sprite `residentiel3_nuit_base_ppm24.0`, 196×257, le plus visible
des 4 bâtiments du J0 à ce viewport — `lab`/`usine` et `stash`/`entrepot` tombent ENTIÈREMENT hors
écran, mesuré : `rectYTopDown` + `rectH` ≤ 0 pour les deux). Capture commitée :
`Assets/Screenshots/district_sprite_lab_v1.png`, rect imprimé `62,-106,196,257`.

```
python3 Tools/resemblance-probe.py --source .../residentiel3_nuit_base_ppm24.0.png \
  --capture district_sprite_lab_v1.png --rect 62,-106,196,257
```
```
n'a pas pu s'exécuter : artefact trop petit pour 2 x 3000 échantillons
Traceback ... TypeError: cannot unpack non-iterable int object
```
**Deux constats distincts, aucun n'est un résidu de transport** :
1. `N_SAMPLES=3000` (paramètre GELÉ, calibré sur le fond 1080×1920, ~2M px) exige 2×3000
   échantillons de gradient — un sprite de 196×257 (~50K px, stride 7) n'en fournit qu'environ 972.
   L'instrument, TEL QUE CALIBRÉ, ne peut PAS juger un artefact de cette taille — ni vert ni rouge,
   `n'a pas pu s'exécuter` (code 2), la 3ᵉ catégorie que le fichier lui-même distingue explicitement
   de VERT/ROUGE.
2. **Bug distinct trouvé dans `resemblance-probe.py` (commit `238b1ab`)** : `main()` fait
   `code, _ = juger(...)`, mais les branches `return 2` de `juger()` (image trop petite, rect hors
   capture, etc.) rendent un `int` NU, pas un tuple — `TypeError` à l'unpacking. Reproductible sur
   n'importe quel artefact trop petit, pas spécifique à ce sprite. Je NE CORRIGE PAS l'instrument du
   ⊥ moi-même (frontière auteur/relecteur) — consigné pour lui.

**STOP ici, conformément à la consigne** ("Si résidu : STOP + chiffre + on itère"). Ce n'est pas un
résidu mesuré, c'est une incapacité d'instrument — je ne bricole pas de solution de contournement
(pas de N_SAMPLES local, pas de patch du script du ⊥). Attente d'une décision (recalibrer
N_SAMPLES pour les artefacts à l'échelle sprite, ou une méthodologie différente). Note structurelle,
PAS une preuve : la géométrie du sprite (rect 196×257 == texture native, `SnapToScreenPixel`
appliqué UNIFORMÉMENT au fond et à chaque ancre bâtiment, même mécanisme que le fond bit-exact) rend
`transport intact` PLAUSIBLE, mais NON PROUVÉ par cette tentative.

### c) Portée de la certification — hors device réel

⚠️ **La certification « transport intact » ne couvre QUE l'environnement de capture mesuré ici**
(Éditeur Unity, Game View 1100×577/1100×576, `scaleFactor = Screen.width / referenceResolution.x`
= 1100/1280 = 0,859375). Sur un DEVICE RÉEL (APK Android, build IL2CPP), `Screen.width` sera une
AUTRE valeur (résolution physique de l'écran) — `scaleFactor` en découle mais N'A JAMAIS ÉTÉ MESURÉ
sur un device réel dans cette investigation. C'est un DÉDUIT assumé (le mécanisme de compensation
est générique, indépendant de la valeur numérique de `scaleFactor` — `SnapToScreenPixel` corrige
QUELLE QUE SOIT la phase sous-pixel résultante), pas une mesure. **Détecteur de péremption** : la
MÊME sonde, rejouée sur la PREMIÈRE capture device disponible — si elle rend autre chose que
« transport intact », cette section doit être mise à jour et la certification restreinte au device
testé.
