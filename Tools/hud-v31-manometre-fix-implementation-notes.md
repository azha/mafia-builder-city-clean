# HUD v3.1 — correctif MANOMÈTRE — implementation-notes.md

Suite directe de `Tools/hud-v31-pixelperfect-implementation-notes.md` (SHA `7387043`). Ce lot
corrige les 5 défauts mesurés sur le manomètre du TopBar (anneau doublé/rouge/débordant, arc
troué, piste basse parasite, aiguille/pivot, texte central) et livre l'oracle qui les voit.

## Périmètre

`Assets/Scripts/Shell/TopBarController.cs` (le manomètre) + `Assets/Scripts/Shell/AppShell.cs`
(un correctif de frontière avec le lot navigation, demandé par le contrôleur — voir § Frontière
navigation) + `Assets/Tests/PlayMode/ManometreOraclePlayModeTests.cs` (neuf) +
`Assets/Tests/PlayMode/NavigationPlayModeTests.cs` (2 falsifiables amendées NOMMÉMENT, hors
périmètre HUD mais explicitement confiées par le contrôleur). **Jamais touché** :
`Assets/Scripts/CityMap/` (territoire du lot navigation, en cours en parallèle).

## Diagnostic préalable — ce que DA6 ne pouvait pas voir

`DA6_ManometreContent_NeverExceedsInscribedCircle_PixelReal` (existante,
`TopBarDoctrineV31PlayModeTests.cs`) a deux angles morts, confirmés par mesure :

1. **Elle n'exerce JAMAIS l'état alarme** — `SetCitywideHeatBucket` n'y est jamais appelé,
   `UpdateAlarmState` reste inerte, l'anneau reste calme/or. Les défauts 1 (rouge) n'existent
   QUE sous alarme — un test qui ne déclenche jamais l'alarme ne peut pas les voir.
2. **Elle traite TOUT pixel `hudHairlineGold` comme légitime**, n'importe où dans la fenêtre
   échantillonnée (`knownGood = { bg, hudHairlineGold }`) — un second anneau or mal positionné y
   passerait aussi bien qu'un premier correct : la garde vérifie une COULEUR, pas une FORME.

Diagnostic structurel (execute_code, `GetComponentsInChildren<Image>` sur un `TopBarController`
fraîchement construit) : l'anneau **n'a qu'une seule instance** (`BoitierRing`, un seul
GameObject). Le « doublement » perçu sur la capture originale n'était donc **pas une duplication
d'objet** — c'était la fusion visuelle de l'anneau (débordement bas ~4px, médaillon CENTRÉ) avec
le filet bas de barre, tous deux rouge sous alarme, sans marge visible entre les deux. Confirmé
par balayage angulaire pixel-réel : au rayon exact du médaillon centré, le pixel le plus bas de
l'anneau (~y=60 en coordonnées écran) touche directement le filet (~y=54-56).

## Les 5 défauts — géométrie calculée

### Défaut 1 — anneau rouge et doublé, débordement

**Root cause double** :
(a) le médaillon était CENTRÉ (`anchoredPosition=(0,0)`) dans une barre de 56px — débordement
symétrique ~4px en haut ET en bas, l'anneau bas quasi-collé au filet ;
(b) `UpdateAlarmState` basculait sur `HeatBucketResolver.SeverityColor(Severe)` **pur**
(`accentDanger` #ff5a4d), un rouge d'alerte sémantique partagé avec les badges de danger de tout
l'écran — pas « une teinte du laiton qui se réchauffe ».

**Correctif géométrique** — `ManometreVerticalOffsetPx = -13f`. REUSE exact de la maquette
(`hud-topbar-reference-source.html:23`, `.medaillon{top:7px}` dans `.barre{height:52px}`) :
médaillon centre = 7+32=39 depuis le haut, centre de barre = 26 → offset = 39-26 = **13px sous
le centre de la barre**. Appliqué verbatim (pas de recalcul proportionnel — même doctrine que
`ManometreDiameter`). Résultat MESURÉ (capture réelle) : bord haut à 9px du haut de barre (0
débordement, 0 clip par l'écran), bord bas déborde de **17px** (contre ~19px SVG — écart
attribuable à la hauteur de barre Unity 56px vs 52px CSS).

**Correctif de teinte** — `AlarmTintBlendRatio = 0.55f`, `Color.Lerp(calmGoldColor,
HeatBucketResolver.SeverityColor(Severe), 0.55f)`. Aucun token inventé (R2.3 : proportion
appliquée à deux tokens scellés). Résultat mesuré (oracle) : distance à `accentDanger` brut
> 0.10 (normalisé RGB) — visuellement un orange/cuivre chaud, pas un rouge d'alerte.

### Défaut 2 — arc troué en haut / Défaut 3 — piste grise parasite en bas

**Root cause commune** — le tour précédent avait mesuré qu'`Image.FillMethod.Radial180` rend un
cercle COMPLET à `fillAmount=1` (quel que soit origine/sens) et en avait déduit qu'aucun angle
fractionnaire fiable n'était dérivable ; le track avait donc été simplifié en cercle complet
(`Type.Simple`). RE-MESURÉ : le constat à `fillAmount=1` reste vrai, mais sa cause est que le
remplissage est **proportionnel aux 360° complets**, jamais 180° — un `fillAmount` fractionnaire
reste parfaitement fiable, juste avec le mauvais diviseur.

**Géométrie SVG source** (`hud-topbar-reference-source.html:41-48`, viewBox 60×40, centre local
(30,34), rayon 26, angles en convention trigonométrique standard = `Mathf.Cos/Sin`) :
- **track** : point gauche (8,34, 180°) au point droit (52,34, 0°) PAR le haut → demi-cercle
  supérieur exact, `fillAmount = 180/360 = 0.5`.
- **cold** : point gauche (8,34, 180°) au point haut (30,8, 90°) → `fillAmount = 90/360 = 0.25`.
- **hot** : point (43,11) au point droit (52,34, 0°), angle de départ =
  `atan2(34-11, 43-30) = atan2(23,13) ≈ 60,55°` → `fillAmount = 60,55/360 ≈ 0,1682`.

**MESURÉ** (balayage angulaire pixel-réel sur capture Play Mode) : cold couvre effectivement
≈[90°,178°] — conforme au modèle 360° linéaire. **Hot ne suit PAS la même relation** —
`Origin.Right+CCW` a une réponse fillAmount→angle mesurée DIFFÉRENTE d'`Origin.Left+CW` (asymétrie
mesurée, cause non identifiée dans le temps imparti) : à 0,1682 la couverture réelle est
≈[7°,91°], pas [0°,60,55°]. Résultat : hot rejoint cold à ~90° **sans trou** (l'interstice "crème"
théorique du SVG ne survit pas à cette combinaison), mais la PROPRIÉTÉ qui compte — continuité,
zéro trou visible — est atteinte et vérifiée par capture. `fillAmount` gardé au chiffre SVG :
le réduire rouvrirait un trou (le défaut ciblé), l'augmenter n'apporterait rien.

**Track** repassé en `Type.Filled`, `Origin.Left`, `fillClockwise=true`, `fillAmount=0.5` —
supprime la piste basse (défaut 3, confirmé par balayage : lower-half vide dans les deux états)
ET laisse sa teinte pâle visible dans l'interstice haut, lu comme "crème" (défaut 2, confirmé :
aucun secteur de 20° vide sur tout l'hémicycle supérieur).

### Défaut 4 — aiguille épaisse / pivot en pâté doré

**Mesuré** : les proportions D'ORIGINE étaient déjà proches du SVG (trait 2px/rayon26≈0,077 vs
aiguille SVG 2px/rayon26 = identique ; pivot Ø5px/rayon26≈0,2 vs SVG Ø5,2px/rayon26≈0,2 — quasi
identiques). Le "pâté" n'était donc **pas un défaut de taille** : `ProceduralUI.RadialDisc(5,...)`
génère une texture à la résolution EXACTE du diamètre demandé — un cercle sur **5 texels visibles**
n'a quasiment aucune marge d'anti-crénelage et rend un blob anguleux, pas un cercle net.

**Correctif** : `NeedleCenterDotTextureResPx = 32` — génère le disque à résolution INTERNE 32×32
(anti-crénelage réel) tout en gardant `NeedleCenterDotDiameterPx = 5f` (taille AFFICHÉE inchangée,
proportion SVG déjà correcte). `NeedleThicknessPx` 2f→1.5f pour "trait fin" (amincissement
modeste, la proportion SVG était déjà correcte, geste demandé à la lettre par le défaut).

### Défaut 5 — texte central écrasé, illisible

**Mesuré** (TMP `preferredWidth`, police réelle `hudSerifFont`) : "Burning" (le plus long des 4
libellés `HeatBucketResolver.Label`) tient à **41,06px de large à 10pt**, largement sous
`faceDiameter-8≈49px` — la contrainte de largeur qui plafonnait à 6,5pt (héritée de
`moneyLabelText`) ne s'appliquait pas ici : le plafond de netteté SDF, pas la largeur, limitait.

**Correctif** : `GaugeValueFontSizePx = 10f` (was 6.5), `GaugeCaptionFontSizePx = 7f` (was 5.5).
Repositionné verticalement (`y=-9`/`-21`, hauteurs 13/9) pour rester dans `faceDiameter` (28.5)
avec marge, sans chevaucher l'aiguille (pivot à y=+5, aucun conflit).

## L'oracle — `ManometreOraclePlayModeTests.cs` (5 tests, 5 contrôles positifs)

Scaffold LÉGER (Canvas+CanvasScaler+TopBarSlot 56px, REUSE exact d'`AppShell.BuildLayout`) SANS
AppShell — aucun des 5 checks ne dépend de wallet/callsign/session (`SetCitywideHeatBucket` est
local, synchrone). Élimine la flakiness réseau (`BootShell()` faisait 2 signups séquentiels pour
Oracle1 seul, timeouts sous contention d'éditeur partagé) : suite complète en **~0.5s**.

1. **`Oracle1_Ring_UniqueLaitonFamily_On360_CalmAndAlarm_NeverRawDanger`** — balayage 360° (pas
   6°) en calme ET alarme, comptant les RUNS contigus de couleur "famille laiton" par angle (1 =
   sain, 2+ = doublé). CP : un anneau synthétique à 2 rayons distincts DOIT rendre 2 runs. Assertions
   supplémentaires : la teinte RÉAGIT à l'état, et n'égale JAMAIS `accentDanger` brut sous alarme.
2. **`Oracle2_NoManometreContentAboveBarTop_BottomOverhangBounded`** — GÉOMÉTRIQUE (RectTransform,
   pas pixel : l'écran s'arrête exactement au haut de la barre, aucun pixel "au-dessus" ne peut
   exister à tester). Zéro débordement haut, débordement bas BORNÉ (mesuré ~17px, max 24 = ~1.4×,
   jamais un doublement), anti-vacuité (>4px, sinon le médaillon serait recentré par erreur). CP :
   reproduit le RectTransform CENTRÉ (bug d'origine) sur une sonde isolée, hors écran, et prouve
   que le même calcul le détecte.
3. **`Oracle3_ArcCoversEveryUpperSector_AbsentInLowerHalf`** — 9 secteurs de 20° sur l'hémicycle
   supérieur, chacun DOIT porter de l'encre (comparée à une référence au MÊME rayon à 270°, jamais
   un fond externe — la face est un dégradé radial, comparer à un fond plat produit un delta non
   nul même sans défaut). Hémicycle inférieur DOIT rester vide (zone d'exclusion [210°,330°] pour
   `GaugeValue`/`GaugeCaption`, éléments doctrine-légitimes qui vivent dans cette zone — MESURÉ en
   construisant ce test, même piège que le filet de DA6). 2 CP (secteur haut forcé au fond → vu
   vide ; piste plantée en bas, hors zones d'exclusion → vue).
4. **`Oracle4_CentralText_MeetsMinimumContrast`** — ratio de contraste WCAG-like entre les 10%
   pixels les plus clairs de `GaugeValue` et le fond local du cadran, seuil 3.0. CP : texte
   dégradé à 90% vers le fond DOIT tomber sous le seuil.
5. **`Oracle5_Needle_ThinTrait_DiscreetPivot_GeometricAssertion`** — géométrique (RectTransform),
   aiguille ≤2px, pivot ≤6px. CP : sanity du seuil (valeur gonflée dépasse bien le seuil).

## Frontière navigation — demandée par le contrôleur

Mesure indépendante du contrôleur sur la référence commitée : débordement voulu ≈28px à l'échelle
1280 (56px/2560). **Vérification indépendante (ce lot)** : cette mesure porte sur `y=159`, la
**DERNIÈRE rangée** de l'image (hauteur 160px) — `Tools/hud-topbar-reference-render.sh` documente
lui-même que 80px CSS (160 physiques) est "juste assez pour le DISQUE (top:7+height:64=71px) SANS
COUPER HEAT", ce qui laisse le **losange décoratif** (qui pend encore plus bas, `bottom:-11px`
sous le médaillon) **coupé par le bord du viewport** — confirmé par balayage : le gold reste à
largeur QUASI-MAXIMALE jusqu'à la dernière rangée (154-159), signature d'un diamant tronché en
plein milieu, pas d'une pointe naturelle. La mesure de 28px est donc contaminée par cet artefact
de clip, pas une mesure du médaillon seul. Mon propre calcul (ring seul, sans losange — Unity n'a
pas de losange) donne ~19px SVG / 17px mesuré Unity, cohérent avec le §Défaut 1 ci-dessus.
**Signalé, non bloquant** : le MÉCANISME demandé (propriété calculée en live, jamais une
constante) rend ce désaccord sans conséquence — `EffectiveBottomOverhangPx` reflète la géométrie
RÉELLE quelle qu'elle soit, aucune des deux mesures n'est câblée en dur nulle part.

**Livré** :
- `TopBarController.EffectiveBottomOverhangPx` (public, MESURÉ en live via
  `RectTransformUtility.CalculateRelativeRectTransformBounds(transform, manoRect)` — jamais
  `GetWorldCorners`, qui mélangeait les unités ÉCRAN post-`CanvasScaler` avec les unités CANVAS
  LOCALES de `TopBarSlot.rect.height`, correct seulement si `scaleFactor==1` — bug trouvé et
  corrigé EN CONSTRUISANT ce correctif, voir docblock du champ).
- `AppShell.EnterDistrict` réserve désormais `TopBarSlot.rect.height + TopBar.
  EffectiveBottomOverhangPx` (au lieu du nominal seul) pour `SetSafeInsets`.
- `NavigationPlayModeTests.NavF4_TitleClearsTopBar_...` amendée NOMMÉMENT — MESURÉ en construisant
  le correctif : `RectTransformUtility.CalculateRelativeRectTransformBounds(canvasRoot,
  shell.TopBarSlot)` agrège DÉJÀ récursivement tous les descendants (donc `Manometre`) — `topBarB`
  contenait donc DÉJÀ le débordement réel ; ma 1ʳᵉ version de l'amendement l'étendait une SECONDE
  fois (double-compte), gardée rouge jusqu'à ce diagnostic. Version finale : `topBarB` seul
  (déjà inclusif) + garde anti-vacuité sur `EffectiveBottomOverhangPx > 4px`.
- `NavigationPlayModeTests.NavF5_TitleOffsetConsumesInsetTop_...` amendée NOMMÉMENT (conséquence
  directe et mécanique du même correctif `EnterDistrict` — hors mandat explicite du contrôleur
  mais laissé rouge aurait laissé le plancher rouge pour un défaut entièrement attribuable à ce
  lot) : `insetTop` suit désormais la MÊME formule que `EnterDistrict` calcule réellement.
- **TabBar vérifié, pas de défaut symétrique** : `BuildTabBar` utilise `HorizontalLayoutGroup`
  avec `childControlHeight=true, childForceExpandHeight=true` — structurellement incapable de
  laisser un enfant dépasser les bornes du groupe (lu dans le code, pas supposé).

## Evidence

- Compile : 0 erreur (`refresh_unity` force, `read_console` types=error → 0 entrées).
- Suite scopée (`category_names=["W3U1","W3U2","HUDv31","W3UDA"]`) : **178/178 VERT**
  (77.6s), charte ch27 — full-suite hors mandat, appartient au merge-gate du contrôleur.
- Oracle seul (`group_names=["ManometreOraclePlayModeTests"]`) : **5/5 VERT** (~0.5s).
- Captures Play Mode réelles, commitées (`Assets/Screenshots/`) :
  - `hud_v31_manometre_BEFORE_burning.png` — reproduction du bug AVANT ce lot (anneau rouge
    doublé/fusionné, piste basse, texte écrasé), capturée en construisant le diagnostic.
  - `hud_v31_manometre_final_calm.png` — état calme APRÈS correctif (anneau or unique, arc
    continu, texte lisible).
  - `hud_v31_manometre_final_burning.png` — état alarme APRÈS correctif (anneau teinté chaud
    unique, non fusionné avec le filet).
  - `Tools/hud-v31-manometre-fix-reference-vs-unity.png` — montage zoomé référence (haut) vs
    Unity APRÈS correctif, état burning (bas), cadrage comparable.

## Deviations

1. **L'interstice "crème" entre cold et hot ne survit pas** à la combinaison `Origin.Right+CCW`
   mesurée pour hot (voir § Défaut 2/3) — hot rejoint cold sans trou visible plutôt que de laisser
   voir la teinte pâle du track entre les deux. Option retenue (conservatrice) : garder le
   `fillAmount` SVG-exact (0,1682) plutôt que de le re-dériver empiriquement pour restaurer
   l'interstice — la PROPRIÉTÉ qui compte (continuité, zéro trou) est atteinte et vérifiée ; rouvrir
   un trou pour restaurer une nuance esthétique non demandée explicitement aurait été un compromis
   pire. Si l'asymétrie `Origin.Right+CCW` vs `Origin.Left+CW` est un jour comprise/documentée,
   cette valeur peut être reprécisée.
2. **La valeur centrale du manomètre reste le libellé de bucket** (ex. "Burning"), jamais un
   pourcentage — ARBITRAGE EN ATTENTE côté user (R2.2 : aucune donnée continue n'existe côté
   client). Le défaut 5 (lisibilité) est fermé indépendamment de cet arbitrage : le palier est
   désormais lisible quelle que soit l'issue.
