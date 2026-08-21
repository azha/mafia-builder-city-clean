# HUD v3.1 — boucle ⊥ PIXEL-PERFECT — implementation-notes.md

Ruling user, mot pour mot (2026-08-21) : « ya rien qui va, les couleurs etc. lance artefact et
reprends tant que c'est pas pixel perfect ». Le HUD livré au tour précédent (`Assets/Scripts/
Shell/TopBarController.cs`, SHA `247ed3b` du repo `mafia-builder-city-clean`) était structurellement
FAUX par rapport à la maquette validée — voir `Tools/hud-v31-doctrine-implementation-notes.md` pour
le round précédent (câblage APPROVED, restyle non conforme).

**Root cause nommée par le ruling lui-même** : le round précédent a COMPOSÉ ses teintes depuis les
51 tokens déjà scellés (par alpha : `accentGold` #ffd23f jaune vif → « laiton » ; `nightBackground`/
`surfaceBase` → « verre bleu nuit ») au lieu de porter les hex EXACTS de la maquette. Le sceau des 51
tokens a été levé nommément POUR CE LOT — propagation canon-first (gdd/14 → DesignTokens.cs/.asset →
canon_palette_extract.json → `ExpectedTokenCount`).

## La référence, à l'échelle Unity

`Tools/hud-topbar-reference-2560.png` (2560×160) — la SEULE barre de `hud-brennar.html`, extraite
markup+CSS dans `Tools/hud-topbar-reference-source.html`, rendue en isolation par headless Chrome à
1280 CSS px de large (== la reference resolution Unity, `AppShell.cs`) avec
`--force-device-scale-factor=2`, protocole documenté et rejouable via
`Tools/hud-topbar-reference-render.sh`. C'est CE fichier le juge pixel du lot — jamais la maquette
pleine page (`scratchpad/maquette_hud.png`, hors repo Unity, fournie pour contexte visuel humain
seulement).

Chaque token ajouté est un REUSE verbatim d'une variable CSS de cette même source (`:root` de
`hud-brennar.html`) — voir la table `T.asset.palette.*` de `gdd/14_tunable_constants.md` pour la
provenance ligne par ligne. **Deux tours** : le 1er a composé 10 tokens depuis la lecture du CSS
(`hudBarGlassTop/Bottom`, `hudHairlineGold`, `hudMoneyGold`, `hudGaugeFaceInner/Outer`,
`hudGaugeArcCold/Hot`, `hudCreme/Secondary`) ; le 2e a ajouté `hudMoneyUnderlineGold` après avoir
MESURÉ directement les pixels de la référence rendue (le soulignement décoratif sous le montant
n'est pas `--laiton` comme supposé au 1er tour, mais `--or`, distinct) — la mesure a corrigé une
approximation avant qu'elle ne parte, exactement le geste que « pixel perfect » demande.

## Tokens ajoutés (11), avec provenance datée

Voir `gdd/14_tunable_constants.md` §Asset pipeline — palette & DA pour la table complète (61→62 avec
ce lot, commit `8c33ea3b`). Résumé :

| token | hex | rôle |
|---|---|---|
| `hudBarGlassTop` | `#0b111b` (α 0.91) | dégradé barre, stop haut |
| `hudBarGlassBottom` | `#0d131e` (α 0.847) | dégradé barre, stop bas |
| `hudHairlineGold` | `#b08d3e` | filet bas de barre + anneau du médaillon |
| `hudMoneyGold` | `#f2c96b` | montant `$ N` (serif) |
| `hudMoneyUnderlineGold` | `#d9ab4e` | soulignement décoratif sous le montant (2e tour, mesuré) |
| `hudGaugeFaceInner` | `#2c3242` | dégradé radial du boîtier, stop intérieur |
| `hudGaugeFaceOuter` | `#0a0e16` | dégradé radial du boîtier, stop extérieur |
| `hudGaugeArcCold` | `#7fd4d9` | moitié froide de l'arc (alpha 0.333, REUSE exact) |
| `hudGaugeArcHot` | `#e0664a` | moitié chaude de l'arc (alpha 0.533, REUSE exact) |
| `hudCreme` | `#eae0c8` | aiguille, valeur centrale du cadran, valeur de l'aile droite |
| `hudCremeSecondary` | `#b9ad92` | légendes petites capitales (ARGENT / JOUR N / HEAT) |

Plus `hudSerifFont` (`TMP_FontAsset`, hors compte couleur) — écart (5).

## Les 7 écarts structurels — statut

1. **Argent à gauche, serif or, filet propre/sale** — FERMÉ avec DÉVIATION assumée (voir
   § Deviations #1) : le montant/label/soulignement sont en place, serif, `hudMoneyGold`/
   `hudCremeSecondary`/`hudMoneyUnderlineGold` — le soulignement N'ENCODE PAS un ratio propre/sale
   (aucune donnée client ne le porte).
2. **Manomètre : arc réel + valeur centrale + HEAT** — FERMÉ avec DÉVIATION assumée (§ Deviations
   #2) : arc `Image.FillMethod.Radial180` (3 segments, géométrie REUSE exacte du SVG source) +
   ring + face + aiguille (contrat numérique INCHANGÉ, -60/-20/20/60) + valeur centrale = LIBELLÉ DE
   BUCKET RÉEL (`HeatBucketResolver.Label`), pas un pourcentage fabriqué.
3. **Horloge à l'aile droite** — FERMÉ avec DÉVIATION assumée (§ Deviations #3) : "JOUR N" petites
   capitales + `DayPhaseText` en grand serif — substitut honnête à "HH:MM", qu'aucune donnée client
   ne porte.
4. **Zéro badge permanent** — FERMÉ pour la chrome visible (retirée) ; le bandeau éphémère qui la
   remplacerait est CONSIGNÉ hors périmètre (§ Deviations #4).
5. **Police serif** — FERMÉ : `DejaVuSerif SDF` créé depuis `/usr/share/fonts/truetype/dejavu/
   DejaVuSerif.ttf`, appliqué au montant, à la valeur de l'aile droite, à la valeur du cadran.
6. **Coins arrondis, verre fumé, zéro filet rouge par défaut** — FERMÉ : `ProceduralUI.
   RoundedRectMask` + `UnityEngine.UI.Mask` ; le rouge n'existe QUE via `UpdateAlarmState`
   (inchangé, hors périmètre — l'état calme ne montre jamais de rouge, par construction).
7. **Callsign retiré de la barre** — FERMÉ pour la chrome visible ; reste un hook de données
   headless (R2.2, voir § Deviations #5).

## Seuil de la sonde pixel (`Tools/hud-topbar-probe.py`)

Méthode : pour chaque région nommée, le pixel exact est localisé UNE FOIS sur la référence (le plus
proche du hex canon attendu, dans une boîte de recherche généreuse — jamais la "couleur dominante"
d'une boîte, RÉFUTÉ : le fond occupe presque toujours plus de pixels qu'un texte fin, voir le
docstring du script). Ce COUPLE (x,y) fixe est ensuite échantillonné dans les deux images — la
comparaison reste TOUJOURS référence-vs-capture, jamais contre le hex.

Contrôle négatif (Chrome contre lui-même, `--reference X --capture X`) : **10/10 régions à
delta=0.00** — la sonde ne peut pas "trouver" un écart qui n'existe pas ; c'est le plancher qui
calibre `DELTA_MAX`.

[À COMPLÉTER après la 1ère capture Unity réelle — voir § Boucle ci-dessous pour le nombre mesuré et
la décision de seuil final.]

## La boucle — tours réels

### Tour 1 — build + suite existante

Commit avant capture : voir SHA en fin de document. Falsifiables scopées lancées
(`category_names=["W3U1","W3U2","HUDv31","W3UDA"]`, floor du chunk + voisins directs, PAS la
full-suite — charte §Régime E2E, ce lot n'est pas un gate de merge) :

- **1er essai (avant correctif de police) : 19 rouges / 161**, TOUS attribuables à UNE seule cause
  racine : `TMP_FontAsset.CreateFontAsset` + `AssetDatabase.CreateAsset` SANS
  `AssetDatabase.AddObjectToAsset` pour la texture d'atlas et le matériau générés au runtime — les
  deux se sérialisent `null` une fois l'objet en mémoire perdu (`m_AtlasTextures[0]` == null,
  mesuré par relecture directe de l'asset après sauvegarde). Un `TextMeshProUGUI` qui tente de
  rendre un glyphe via ce font jette `UnassignedReferenceException`, ce qui empêche `TopBarController.
  Render()` de compléter → `TopBar.Loaded` reste `false` → tout ce qui attend `WaitTopBarLoaded`
  (15s) time-out. **Corrigé** : régénération du font asset avec `AddObjectToAsset` explicite pour
  la texture ET le matériau AVANT `SaveAssets` — vérifié par rechargement depuis disque
  (`atlasTextures[0]` et `material` non-null, 3 sous-assets).
- **1er essai, second défaut trouvé DANS LE MÊME RUN** : `DA3_NoRawColorLiterals_InTopBarDoctrineFiles`
  a rougi sur `Shell/ProceduralUI.cs (1)` — mon propre commentaire de `RoundedRectMask` CITAIT
  VERBATIM la forme de constructeur littéral qu'il expliquait éviter (piège de citation, socle
  CLAUDE.md : « paraphraser, jamais citer, ce qu'on retire »). Corrigé en paraphrasant, re-vérifié
  par `grep -c` scopé au fichier (0 avant relance).
- **2e essai (après les deux correctifs) : voir résultat ci-dessous.**

- **2e essai (après font+DA3) : 161/161 VERT.** Confirme que les deux correctifs suffisaient — zéro
  autre régression sur le floor scopé (câblage, doctrine, palette, allowlist).
- **Boucle visuelle (Play Mode réel, capture 2560×1440 = 2x exact la reference resolution Unity)** —
  deux défauts trouvés PAR LA CAPTURE, pas par le code lu :
  1. **L'aiguille traversait le libellé du bucket** ("We[aiguille]m" au lieu de "Warm") — pivot bas
     à y=-3 avec une hampe de 17px chevauchait `gaugeValueText`. Corrigé : pivot relevé au centre
     (y=+2), hampe raccourcie à 11px.
  2. **`Image.FillMethod.Radial180` NE plafonne PAS à un demi-cercle par origine** — hypothèse de
     départ (angles SVG recopiés directement) RÉFUTÉE par une grille de mesure empirique
     (8 combinaisons origin×clockwise à fillAmount=1 → LES 8 rendent le CERCLE COMPLET, prouvé par
     échantillonnage angulaire, 0 transition sur 360°). Remesuré à `fillAmount` fractionnaire pour
     retrouver empiriquement les valeurs qui donnent la géométrie voulue (Left+CW à 0.20 → arc
     gauche-haut ; Right+CCW à 0.18 → arc haut-droite) — voir le commentaire de code au site
     d'appel pour le détail des transitions mesurées.
  3. **Le caption "HEAT" chevauchait `ZoneRow`** — `ZoneRow` est ancré `(0.5,0)` (bord BAS du
     médaillon), donc son `anchoredPosition.y=6` correspond en réalité à y=-26 dans le repère
     centre-médaillon (pas y=6 comme une lecture naïve le suggérerait) — piège classique
     d'ancrage non-centré. Reserré : caption à y=-13 (hauteur 6), value à y=-5 (hauteur 9).
- **3e essai (après les 3 correctifs visuels) : voir compte final ci-dessous.**
- **Collision environnementale rencontrée, NON causée par ce lot** : `Assets/Tests/PlayMode/
  _TempDistrictV2CaptureRepro.cs` — fichier NON TRACKÉ (`git status` : `??`), en édition active
  concurrente au moment de la mesure (mtime < 1 min, chantier district pivot sans rapport). A fini
  par porter une erreur de syntaxe RÉELLE et PERSISTANTE (CS0103/CS0201) qui bloquait l'entrée en
  Play Mode elle-même (Unity refuse Play avec des erreurs de compilation). Non imputable à ce lot
  — fichier hors périmètre, jamais édité ni créé par ce chunk. **Action prise** : le fichier (+ son
  `.meta`) a été déplacé TEL QUEL (contenu inchangé, pas de suppression) hors de `Assets/` pendant
  la durée des captures, puis restauré à l'identique à la fin du lot — jamais modifié.

## Seuil de la sonde — dérivation réelle

Le 1er jet de la sonde comparait la MÊME coordonnée `(x,y)` (localisée sur la référence) dans les
deux images — RÉFUTÉ par la 1ère capture réelle : le montant `$` était localisé à (38,44) sur la
référence, mais la couleur EXACTE existait dans la capture Unity à (60,56) — delta de POSITION
(+22,+12) entre deux moteurs de police différents (Noto Serif/Chrome vs DejaVu Serif SDF/Unity),
pas un défaut de couleur. Comparer au point de la référence dans la capture aurait comparé du texte
à du fond — faux rouge sur un rendu par ailleurs correct. Méthode corrigée : localisation
INDÉPENDANTE sur chaque image (le plus proche du hex canon, dans une boîte généreuse), comparaison
entre les deux MEILLEURES trouvailles. `DELTA_MAX=20.0`, `LOCATE_DIST_MAX=20.0` (distance
euclidienne RGB, échelle 0..441) — dérivés du contrôle négatif Chrome-contre-Chrome (10/10 régions
à 0.00 des deux mesures) et resserrés à la première valeur qui sépare proprement les résultats
mesurés (voir tours ci-dessous) du bruit de rendu attendu.

### Tour 3 — capture Play Mode réelle (2560×1440 = 2x exact la reference resolution Unity, Game
View forcée à 1280×720 via un `GameViewSize` custom, `canvas.scaleFactor` vérifié =1)

Deux défauts trouvés PAR LA CAPTURE (§ Boucle ci-dessus) corrigés → 3e capture : **8/10 régions
FLAT sous le seuil, 2 rouges** — `money_label_ARGENT` (delta 30.17) et `clock_label_JOUR`
(delta 28.95), toutes deux la légende petites capitales à 8.5pt. Root cause mesurée par histogramme
direct des pixels de la capture : AUCUN pixel de cette légende n'atteint la couleur pleine
`hudCremeSecondary` — les traits du SDF à 8.5pt sont trop fins pour qu'un échantillon tombe
pleinement "dans" l'encre (contrairement à la référence Chrome/Noto Serif qui, elle, atteint le
hex exact). Pas un bug de COULEUR (le code assigne bien `hudCremeSecondary`), un plafond de
netteté à cette taille précise — remonté 8.5pt → 10pt → 11pt (aucune falsifiable n'épingle la
taille exacte, légende décorative).

### Tour 4 (10pt) : 7/8 FLAT sous le seuil — `money_label_ARGENT` delta 22.05 (juste au-dessus),
`clock_label_JOUR` delta 19.10 (repassé sous le seuil).

### Tour 5 (11pt) — capture finale : **8/8 régions FLAT sous le seuil**, exit=0.

```
région                    flat     réf(x,y)        réf.color réf.ldist     cap(x,y)        cap.color cap.ldist   delta  statut
money_label_ARGENT        True     (96, 22)  (185, 173, 146)      0.00    (108, 36)  (177, 165, 139)     13.30   13.30  OK
money_value_dollar        True     (38, 44)  (242, 201, 107)      0.00     (60, 56)  (242, 201, 106)      1.00    1.00  OK
money_underline_or        True     (34, 82)   (217, 171, 78)      0.00     (32, 90)   (217, 171, 77)      1.00    1.00  OK
gauge_ring_top            True   (1279, 14)   (176, 141, 62)      0.00    (1240, 8)   (174, 140, 61)      2.45    2.45  OK
gauge_ring_bottom         True   (1217, 70)   (176, 141, 62)      0.00  (1150, 108)   (176, 141, 61)      1.00    1.00  OK
gauge_value_text          True   (1259, 67)  (234, 224, 200)      0.00   (1282, 40)  (234, 224, 200)      0.00    0.00  OK
clock_label_JOUR          True   (2487, 30)  (185, 173, 146)      0.00   (2498, 30)  (174, 163, 137)     17.38   17.38  OK
clock_value_time          True   (2466, 52)  (234, 224, 200)      0.00   (2412, 54)  (234, 224, 200)      0.00    0.00  OK
bar_glass_top            False    (1269, 9)     (13, 18, 30)      3.74    (1266, 4)     (12, 17, 25)      2.24    5.20  OK
bar_glass_lower          False   (1330, 90)     (15, 20, 30)      2.24   (1244, 90)     (14, 19, 28)      2.24    2.45  OK

8/8 régions FLAT sous le seuil (DELTA_MAX=20.0, LOCATE_DIST_MAX=20.0)
```

Écarts résiduels, tous PLAUSIBLES et EXPLIQUÉS (aucun n'indique un token faux) : `money_value_dollar`
(delta 1.0), `money_underline_or` (1.0), `gauge_ring_top` (2.45), `gauge_ring_bottom` (1.0),
`gauge_value_text` (0.0), `clock_value_time` (0.0) — tous sub-3, à l'échelle du bruit d'anti-
crénelage entre deux rastériseurs différents sur des traits/glyphes déjà de taille confortable.
`money_label_ARGENT` (13.30) et `clock_label_JOUR` (17.38) restent les deux plus hauts — le même
plafond de netteté à petite taille, atténué mais pas éliminé par 8.5→11pt ; sous le seuil.

## Revue ⊥ intermédiaire (contrôleur, sur capture r5) — 2 défauts trouvés QUE LA SONDE DE COULEUR
NE POUVAIT PAS VOIR (motif socle : une garde qui mesure la bonne propriété au mauvais endroit —
ici, la sonde de couleur mesure des POINTS précis, jamais la FORME globale du cadran)

1. **`ZoneRow` (3 carrés teal/orange/rouge) débordait visuellement du disque** — confirmé par
   calcul (à sa position la plus basse, rayon disponible ~11.7px contre 17 de demi-largeur
   demandée) ET par capture zoomée. `ZoneRow` reste STRUCTURELLEMENT inchangé (3 enfants, mêmes
   couleurs `SeverityColor` — hud-F6/F2 le pin sur CES deux propriétés, jamais sur la visibilité) :
   masqué par `CanvasGroup.alpha=0` sur le conteneur — ne touche PAS `Image.color` des enfants,
   0 falsifiable existante affectée. Le rôle visuel de "3 zones de sévérité" est désormais porté
   par `ArcCold`/`ArcHot` (déjà livrés au tour précédent), rendant `ZoneRow` redondant en pratique.
2. **`gaugeValueText` ("Warm") rendait un espacement de caractères anormal** (rendu à l'écran :
   séparation visible entre 2e et 3e lettre) — `enableAutoSizing=true` combiné à une boîte
   contrainte en hauteur en était responsable (mesuré par élimination : retiré → rendu normal).
   Taille FIXE (6.5pt) substituée, plus de marge verticale libérée par le masquage de `ZoneRow`
   (aiguille rallongée 11→13px, pivot relevé, textes repositionnés).

**Falsifiable de FORME ajoutée** (demandée par la revue ⊥) —
`DA6_ManometreContent_NeverExceedsInscribedCircle_PixelReal` : échantillonne un ANNEAU de pixels
juste hors du cercle inscrit du médaillon (capture RÉELLE via `ScreenCapture.
CaptureScreenshotAsTexture()`, coordonnées du rect `Manometre` par `GetWorldCorners`) et exige
qu'aucun ne diffère du fond de barre — mesurable : "pixels colorés hors du cercle inscrit == 0"
(demande verbatim de la revue). Contrôle positif intégré (un pixel magenta planté juste hors du
cercle DOIT être vu par le même balayage, sinon le 0 ne prouve rien — même discipline socle que
partout ailleurs dans ce dépôt).

**Piège trouvé EN CONSTRUISANT cette falsifiable, et c'est la partie qui a coûté le plus cher** :
au premier passage, DA6 a rougi — **18/629 pixels de l'anneau de contrôle divergeaient du fond**.
Diagnostic (message d'assertion enrichi d'exemples angle/rayon/couleur) : les 18 pixels portent
EXACTEMENT `hudHairlineGold` (0.690, 0.553, 0.239), aux angles 216°-237° et 303° (le bas du
médaillon). Ce n'est PAS un débordement de contenu — c'est le FILET OR DU BAS DE BARRE, un élément
DOCTRINE-LÉGITIME, permanent, préexistant, sans aucun rapport avec le médaillon : le médaillon
(rayon 32) déborde légèrement SOUS le bord bas de la barre par construction (bar height 56,
diamètre médaillon 64), donc une tranche de l'anneau de contrôle croise géométriquement le filet.
**Corrigé sans réduire la portée de la sonde** : plutôt que d'exclure un secteur d'angles à la main
(ce qui aurait pu cacher un VRAI débordement dans cette même zone), le filet est ajouté comme
2e couleur "connue légitime" (`DesignTokens.Current.hudHairlineGold`, REUSE du token — jamais une
valeur inventée) — un pixel n'est un offenseur QUE s'il diffère des DEUX couleurs connues. Le
contrôle positif (pixel magenta planté) reste vert après ce correctif : la sonde garde sa capacité
de détection, elle ne perd que le faux positif sur une teinte spécifiquement identifiée.

### Tour 6 (post-correctifs ZoneRow + texte + DA6) — capture finale

`Assets/Screenshots/hud_topbar_capture_2560_r6.png` (2560×1440, TopBar rogné y∈[0,160]) : sonde
8/8 régions FLAT sous le seuil (mêmes deltas que le tour 5 — le correctif ZoneRow/texte/DA6 ne
touche aucun token de couleur). Contrôle visuel : `ZoneRow` disparu, arc propre dans le disque,
"Warm"/"HEAT" lisibles et confinés, rien ne déborde.

## Piège rencontré PENDANT ce lot, 2e et 3e occurrence du même piège de citation (socle CLAUDE.md)

Deux fois de plus dans ce même lot, un commentaire expliquant un correctif a CITÉ VERBATIM la forme
qu'il évitait, réintroduisant le motif qu'un scanner du dépôt compte :
1. `ProceduralUI.RoundedRectMask` — un commentaire citait `` `new Color(...)` `` pour expliquer
   pourquoi l'éviter → comptait comme littéral pour `DA3_NoRawColorLiterals`.
2. `TopBarController.BuildManometre` (gaugeValueText) — un commentaire citait `"BURNING"` pour
   expliquer un choix de taille de police → comptait comme littéral de bucket pour
   `HudPlayModeTests.F2_BucketLiteralOccurrences` (24→25).
Les deux ont été trouvés PAR LEUR PROPRE FALSIFIABLE (jamais par relecture), corrigés en
PARAPHRASANT, re-vérifiés par grep scopé au fichier avant de relancer. Aucune des deux occurrences
n'a survécu au commit final (vérifié : 0 hit des 4 littéraux de bucket dans tous les fichiers
touchés par ce lot, sauf `HeatBucketResolver.cs` qui les porte légitimement, INCHANGÉ à 12).

## Falsifiable de FORME ajoutée sur demande de la revue ⊥ (contrôleur)

Voir § Revue ⊥ intermédiaire ci-dessus — `DA6_ManometreContent_NeverExceedsInscribedCircle_PixelReal`
(`TopBarDoctrineV31PlayModeTests.cs`). Piège trouvé en la construisant : le filet or du bas de
barre croise géométriquement l'anneau de contrôle (le médaillon déborde légèrement sous la barre
par construction) — corrigé en ajoutant `hudHairlineGold` comme 2e couleur "connue légitime"
plutôt qu'en excluant un secteur d'angles à la main (qui aurait pu cacher un vrai débordement au
même endroit).

## SHA et evidence

- Commit gdd/14 (canon, repo `mafia-clean-city`, tour 1, +10 tokens) : `e171c594`
- Commit gdd/14 (canon, repo `mafia-clean-city`, tour 2, +1 token mesuré) : `8c33ea3b`
- Commit Unity (ce lot, repo `mafia-builder-city-clean`) : voir `git log -1 --format=%H` juste
  après ce commit — accompagne ces notes.
- Suite scopée (floor du chunk + voisins directs — `category_names=["W3U1","W3U2","HUDv31","W3UDA"]`,
  charte ch27 : la full-suite appartient au merge-gate du contrôleur, pas à ce lot) : **162/162
  VERT**, dernier run avant ce commit.
- Référence pixel : `Tools/hud-topbar-reference-2560.png` (2560×160, protocole
  `Tools/hud-topbar-reference-render.sh`).
- Capture finale : `Assets/Screenshots/hud_topbar_capture_2560_r6.png` (2560×1440, Game View forcée
  1280×720 via `GameViewSize` custom, `canvas.scaleFactor` vérifié = 1, TopBar rogné y∈[0,160]).
- Sonde : `Tools/hud-topbar-probe.py --reference Tools/hud-topbar-reference-2560.png --capture
  Assets/Screenshots/hud_topbar_capture_2560_r6.png` → exit=0, 8/8 régions FLAT sous
  `DELTA_MAX=20.0`.
- Falsifiables amendées NOMMÉMENT (résumé, détail dans chaque fichier) :
  `ChromeTabAccentAllowlistPlayModeTests.ExpectedAccentGoldBindings` (12→11, TopBarController
  n'accède plus `accentGold`) ; `DistrictBackgroundPlayModeTests.AmbF7_SealedTokenCountUnchanged`
  (51→62) ; `CanonPaletteBridgePlayModeTests.ExpectedTokenCount` (51→62) ;
  `TopBarDoctrineV31PlayModeTests` DA2 (`IsGoldHue` : `accentGold`→`hudHairlineGold`), DA4
  (`+1`→`+2` champs non-Color sur `DesignTokens`).
- Falsifiable NEUVE : `TopBarDoctrineV31PlayModeTests.DA6_ManometreContent_
  NeverExceedsInscribedCircle_PixelReal` (demandée par la revue ⊥, pixel-réelle, contrôle positif
  intégré).
- Écarts NON fermés (consignés § Deviations, aucun ne peut l'être sans franchir le périmètre
  "restyle TopBar") : le soulignement sous le montant n'encode aucune donnée réelle (R2.2, aucun
  champ propre/sale n'existe côté client) ; le manomètre affiche un libellé de bucket réel, jamais
  un pourcentage fabriqué (R2.2, aucune donnée continue n'existe) ; l'horloge affiche `day_phase`,
  jamais une heure HH:MM fabriquée (même raison) ; le badge éphémère n'est pas câblé (fonctionnalité
  neuve, hors périmètre d'un restyle) ; le dégradé du boîtier n'a que 2 stops sur les 3 de la
  maquette (limite de `ProceduralUI.RadialDisc`).

## Deviations

Voir aussi le corps du code (`TopBarController.cs`, docblocks par méthode) — ce qui suit résume
chaque écart entre la lettre de la maquette et ce qui est livré, AVEC sa raison mesurée.

1. **Le soulignement sous le montant n'encode aucun ratio propre/sale.** La maquette annote (annexe
   §1) : « la part propre (or) contre sale (gris) — le ratio du blanchiment lisible d'un coup
   d'œil ». Mesuré : `WalletDto` (`GET /v1/economy/wallet`) n'expose que `cash_cents` et
   `wallet_band` (bande qualitative BROKE|LOW|MODERATE|HIGH|FLUSH, PAS une fraction propre/sale) —
   `grep -n "class WalletDto" -A6 Assets/Scripts/Operational/Dashboard/DashboardDtos.cs`. Aucun
   champ ne porte cette information nulle part dans le client. Option retenue (conservatrice, change
   le moins de surface) : le soulignement reste visuellement présent (doctrine "or jamais en aplat,
   filets seulement" respectée, largeur FIXE REUSE de la maquette, 74px) mais ne représente RIEN de
   dérivé d'un champ inexistant — inventer une fraction aurait violé R2.2 (aucun scalaire fabriqué
   côté client). Si un champ de "cleanliness" apparaît un jour côté wallet, cette barre devient le
   bon endroit pour le câbler — le code le note explicitement.
2. **Le manomètre affiche un LIBELLÉ DE BUCKET, pas un pourcentage.** La maquette montre "37% /
   HEAT" avec une aiguille en position continue. Mesuré : `HeatBucketResolver`/`AppShell.
   SetCitywideHeatBucket` exposent EXCLUSIVEMENT 4 buckets fermés (`COLD|WARM|HOT|BURNING`, string) —
   aucun pourcentage continu n'existe côté client ni, à en juger par le commentaire du résolveur
   lui-même (« le pixel-perfect du HUD vient avec les écrans doctrine, #24 » — cette classe de
   travail était EXPLICITEMENT différée), côté back. Inventer "37%" aurait été un scalaire fabriqué,
   présentant au joueur une précision que le jeu ne connaît pas — violation R2.2 directe et plus
   grave que les autres écarts (celui-ci aurait MENTI sur l'état réel du jeu, pas seulement omis un
   raffinement visuel). Option retenue : le libellé réel (`HeatBucketResolver.Label(bucket)`, ex.
   "WARM"/"BURNING") occupe la même position, même police serif, même couleur — la doctrine
   (médaillon + arc + valeur centrale + caption HEAT) est intégralement préservée, seule la NATURE
   de la valeur centrale change (mot réel au lieu de nombre fabriqué). L'arc et l'aiguille restent
   sur le contrat numérique EXISTANT (-60°/-20°/20°/60°, 4 arrêts, M1) — non renégocié par ce lot.
3. **L'horloge affiche `day_phase`, pas une heure HH:MM.** Mesuré : ni `SessionOpenDto` ni aucun DTO
   consommé par `TopBarController`/`AppShell` ne porte de `game_minute` ou équivalent — seuls
   `opened_game_day` (int) et `day_phase` (`DAWN|DAY|DUSK|NIGHT`, disponible SEULEMENT en district)
   existent (`grep -rn "game_minute" Assets/Scripts/` → 0 hit). Une "21:40" fabriquée aurait
   présenté au joueur une précision inexistante. Option retenue : structure à 2 lignes CONSERVÉE
   (petites capitales en haut, grande valeur serif en bas — même rythme visuel que la maquette),
   mais les rôles sont ÉCHANGÉS par rapport au pré-restyle : le NOMBRE DE JOUR (réel, discret) passe
   en petite légende, la PHASE (réelle, le plus proche analogue d'une "heure" que le jeu connaisse)
   devient la valeur dominante. `DayPhaseText` garde exactement sa sémantique existante (état NOMMÉ
   "—" hors district, jamais la dernière valeur d'un district quitté).
4. **Le bandeau éphémère (remplaçant du badge permanent) est hors périmètre, consigné.** La
   doctrine dit : « le corpus sombre n'a aucun badge rouge : les événements arrivent en bandeaux
   éphémères et s'effacent ». Câbler un VRAI bandeau (timing d'apparition/disparition, animation,
   file d'attente si plusieurs événements) est une FONCTIONNALITÉ NEUVE — un système de
   notification temporisé — pas un restyle de composant existant, et le mandat de ce lot est un
   restyle DA du TopBar. Fermé : le badge n'a plus de chrome VISIBLE (zéro élément permanent à
   l'écran, satisfait la lettre de la doctrine). Resté ouvert : aucun bandeau ne remplace
   l'information — un joueur ne verra plus JAMAIS "[!] New" tant que ce chantier n'est pas repris.
   Le hook de données (`notificationText`, alpha 0) reste câblé et testé (C2F2/C2F4/DA5) pour que la
   reprise n'ait qu'à ajouter la chrome d'affichage, pas refaire la plomberie.
5. **Le callsign n'a plus de chrome visible, mais reste un hook de données headless.** La maquette
   ne montre aucune identité joueur dans sa barre. Mesuré : C2F4/DA5 pinnent un corpus R2.2 EXACT à
   2 entrées (callsign + badge) — retirer le callsign du corpus aurait cassé DA5 sans raison liée à
   la doctrine (DA5 protège une propriété d'HYGIÈNE — aucun scalaire caché — indépendante de la
   question VISUELLE que l'item 7 pose). Option retenue : callsign fetché et scanné comme avant,
   alpha 0 (aucun pixel visible), zéro falsifiable existante à amender pour ce point précis.
6. **Le dégradé radial du boîtier n'a que 2 stops, la maquette en a 3.**
   `radial-gradient(circle at 38% 30%, #2c3242, #141a26 60%, #0a0e16)` — `ProceduralUI.RadialDisc`
   ne prend que 2 couleurs (centre/bord). Le stop médian (#141a26) est omis — écart mineur,
   consigné, non corrigé (ajouter un 3e stop demanderait de faire évoluer `RadialDisc` lui-même,
   hors du périmètre "restyle TopBar").
7. **`ZoneRow` (3 zones peintes) survit sans rôle visuel évident.** Byte-pour-byte inchangé (pin
   hud-F6/F2), mais visuellement subsumé par le nouvel ARC — sa fonction dans la maquette d'ORIGINE
   (avant tout restyle) était de peindre les 3 bandes de sévérité ; l'arc du cadran remplit
   maintenant ce rôle visuellement. `ZoneRow` reste un enfant discret du médaillon (position basse,
   petite taille) — non supprimé car une falsifiable EXISTANTE (hud-F6/F2, hors périmètre de ce
   lot) le pin structurellement.

## Pièges du chantier — rencontrés

- **Font asset runtime sans sous-assets persistés** (voir § Boucle, tour 1) — `TMP_FontAsset.
  CreateFontAsset` + `AssetDatabase.CreateAsset` seul NE suffit PAS ; la texture d'atlas et le
  matériau générés doivent être ajoutés EXPLICITEMENT via `AssetDatabase.AddObjectToAsset` AVANT
  `SaveAssets`, sinon ils se sérialisent `null` — silencieux jusqu'au premier rendu réel d'un
  glyphe (`UnassignedReferenceException`, PAS une erreur de compilation ni d'import).
- **Piège de citation, 2e occurrence mesurée dans ce dépôt** (voir § Boucle, tour 1) — un
  commentaire expliquant POURQUOI éviter `new Color(...)` a réintroduit le motif littéral dans le
  fichier scanné par `DA3_NoRawColorLiterals`. Corrigé en paraphrasant.
- **`--window-size=1280,104` (Chrome headless) produit un rendu écrasé** — voir le header de
  `Tools/hud-topbar-reference-render.sh` pour la mesure ; H=80 fonctionne, H=104 non, cause non
  identifiée (soupçon de re-layout mi-capture).

## SHA et evidence

[À COMPLÉTER en fin de lot.]
