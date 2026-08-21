# HUD v3.1 — doctrine DA (restyle) — implementation-notes.md

Câblage fonctionnel : LIVRÉ et CLOS (68/68 W3U2, 37/37 W3U1, gate ⊥ APPROVED — voir
`Tools/nav-hud-chunk5-implementation-notes.md`, commit `0ede211`). Ce chunk n'y touche PAS :
il HABILLE `TopBarController.cs` selon la doctrine visuelle validée par l'user en 6 verdicts
successifs (barre unique stylisée, manomètre centré, verre gravé bleu nuit + tampon, or jamais en
aplat, dégradés/texture chiffrés). Référent : `atelier3d-mafia/hud-brennar.html` (barre, médaillon,
ailes) + `atelier3d-mafia/palettes-ecrans.html` (matières D « verre gravé » / B « le tampon »,
comparatif des 3 traitements de bouton).

## Spec extraite de la maquette (mesurée, pas devinée)

`hud-brennar.html`, un seul `<style>` (10 317 caractères), palette `:root` :
`--encre:#0b1016 --panneau:#111823 --lisere:#2a3648 --creme:#eae0c8 --creme-2:#b9ad92
--or:#d9ab4e --or-vif:#f2c96b --laiton:#b08d3e --braise:#e0664a --cyan:#7fd4d9`.

`.barre{height:52px;background:linear-gradient(180deg,#0b111be8,#0d131ed8);backdrop-filter:blur(5px)}`
+ `::after` filet bas `linear-gradient(90deg,transparent,laiton 18%,laiton 82%,transparent)` qui
bascule vers `braise` en état chaud. `.medaillon` : médaillon CIRCULAIRE 64×64, centré
(`left:50%;transform:translateX(-50%)`), `.boitier` = `radial-gradient(circle at 38% 30%,
#2c3242,#141a26 60%,#0a0e16)` + `border:1.5px solid laiton`. Le SVG `.cadran` (markup, pas juste le
CSS) montre le manomètre RÉEL : arc de fond gris + 2 arcs colorés (cyan / braise) sur 180°, aiguille
`<line>` pivot bas-centre, `rotate(-42 30 34)`.

`palettes-ecrans.html` (comparatif « bouton d'action — trois traitements ») :
- **D — verre gravé** : `background:linear-gradient(160deg,rgba(26,38,60,.62),rgba(10,16,28,.85));
  border:1px solid #d9ab4e70;color:var(--or-vif);text-shadow:0 0 9px rgba(217,171,78,.35)` —
  texte « DONNER L'ORDRE », commentaire CSS littéral : *« l'or aux lettres et au filet, jamais en
  aplat »*.
- **B — le tampon** : `background:#d9cca9;border:2px solid #93402c;color:#93402c` — texte
  **« SIGNER L'ORDRE »**.
Doctrine finale (consigne du lot) : **le D, mais on garde le SIGNER L'ORDRE du B** — matière verre
gravé + copie tampon.

## Ce qui a été livré

### 1. Restructuration de l'ancrage (`TopBarController.BuildLayout`)

Le `HorizontalLayoutGroup` unique sur la racine est retiré : il ne peut PAS garantir un centrage
absolu (la position d'un enfant dépend de tout ce qui le précède dans la fratrie). Chaque enfant
reçoit désormais un ancrage EXPLICITE (anchor/pivot/anchoredPosition/sizeDelta). `LeadingAction` et
`Manometre` restent des enfants DIRECTS de `transform` (jamais nichés dans un sous-conteneur) —
`NavigationPlayModeTests.cs:89` (`Find("LeadingAction")`) et `HudPlayModeTests.cs:333`
(`Find("Manometre/ZoneRow")`) font un `Find` à un segment qui ne descend pas dans un
sous-conteneur intermédiaire ; casser ça aurait rendu ces deux fichiers rouges.

Layout final (gauche → droite) : `[← Carte (caché par défaut)]` `[Callsign]` … `[GameDay/DayPhase]`
`[Manometre — EXACTEMENT au centre de la barre]` `[Notification/badge]` … `[Cash]`. Le seul reflow
manuel restant est `RepositionLeftCluster()` (callsign glisse à droite quand `LeadingAction`
devient visible) — tout le reste est ancré en absolu et ne bouge jamais avec ses voisins.

### 2. Chrome doctrine (nouveau)

- `BuildBarBackground()` — fond en dégradé vertical (2 nouveaux fichiers, voir §3), premier enfant
  (rendu sous tout le reste).
- `BuildHairline()` — filet bas, 2px, pleine largeur, or composé par alpha (calme) ou teinte
  Severe (alarme, BURNING).
- `BuildManometre()` — médaillon circulaire (anneau + face à dégradé radial, `ProceduralUI`),
  ancré à (0.5, 0.5) — position ZÉRO, indépendant de tout voisin. `ZoneRow` (3 zones,
  `HeatBucketResolver.SeverityColor`) et `Needle` restent des FRÈRES, INCHANGÉS dans leur
  structure/couleurs (byte-pour-byte ce que `HudF6`/`F2_SeverityTokenAccesses` épinglaient déjà).
- `BuildNotificationBadge()` — le « badge » : fond chrome + soulignement or (matière tampon,
  simplifiée — voir Deviations) + le texte fonctionnel INCHANGÉ (`"[ ] Clear"` / `"[!] New"`).
- `UpdateAlarmState()` — filet + anneau basculent vers la teinte Severe quand
  `CitywideHeatRank == Burning` (mockup `.tel.chaud`/`.tel.descente`), calme sinon. Passe
  EXCLUSIVEMENT par `HeatBucketResolver.SeverityColor` — jamais un accès direct à un token de
  sévérité depuis ce fichier (`F2_SeverityTokenAccesses` l'exclut explicitement).
- `InitPalette()` — l'UNIQUE lecture de `accentGold` de tout le fichier (indirection par variable),
  composée par alpha en deux teintes dérivées (filet 0.62, anneau 0.78) — jamais une couleur d'aplat.

### 3. Deux fichiers neufs (`Assets/Scripts/Shell/`, aucun asmdef touché — Shell référence déjà
   `Theme` + `UnityEngine.UI`)

- `VerticalGradientImage.cs` — `Graphic` custom, quad 2 couleurs interpolées par le GPU (uGUI n'a
  pas d'équivalent `linear-gradient`). Couleurs TOUJOURS reçues via `SetColors`, zéro accès
  DesignTokens/littéral dans ce fichier.
- `ProceduralUI.cs` — génère au RUNTIME (jamais `AssetDatabase`, safe IL2CPP) un disque à dégradé
  radial (`RadialDisc`) et un anneau (`Ring`, centre transparent) via `Texture2D`/`Sprite.Create`,
  mis en cache par clé. Couleurs reçues en paramètre — zéro accès DesignTokens/littéral.

### 4. Composition des teintes « bleu nuit »/« laiton » absentes des 51 tokens

La maquette D utilise des hex hors des 51 tokens scellés (`rgba(26,38,60,.62)`→`rgba(10,16,28,.85)`
pour le verre, `#b08d3e` pour le laiton). **Composé, jamais un 52e token** :
- Fond de barre : `nightBackground` (réel `(0.13,0.168,0.21)` = `#212B36`, déjà documenté « bleu-
  pétrole désaturé ») en haut, `surfaceBase` (`(0.051,0.059,0.063)`) en bas — écart mesuré contre
  les stops de la maquette : ~0.03/canal (haut), ~0.01-0.02/canal (bas). Alpha 0.96/0.92 pour la
  sensation « verre » (pas de vrai flou de fond — uGUI ne l'offre pas nativement ici, voir
  Deviations).
- Filet/anneau : `accentGold` (`(1,0.824,0.247)`) à alpha réduite (0.62/0.78) — écart contre
  `--laiton` (`(0.690,0.553,0.243)`) : ~0.07/canal après blend sur fond sombre. Un seul token or
  existe dans le pont canon ; composer par alpha est la forme prescrite par la consigne du lot pour
  ce cas exact.

## Falsifiables — statut (run réel)

Run `category_names=["W3U1","W3U2","HUDv31"]` (chunk + voisins directs, floor scopé) —
**117/117 verts**, deux runs consécutifs identiques (105 pré-existants inchangés + 12 nouveaux) :

| # | statut | evidence |
|---|---|---|
| (a) DA1 — manomètre centré | 🟢 | ancrage 0.5/0.5 + double témoin coins WORLD (`barCenterX==manoCenterX`, mesuré `550.0==550.0` sur un capture 1100×577) + garde de régression structurelle (bascule `LeadingAction`, le centre ne bouge PAS) |
| (b) DA2 — or jamais en aplat | 🟢 | couverture RÉELLE échantillonnée (32×32, pas la boîte englobante) ; anneau mesuré `500.0px²` (boîte 4096px²) ; contrôle positif (≥2 Images or trouvées) + contrôle négatif (aplat or 80×40 = 3200px² correctement classé « aplat ») |
| (c) DA3/DA4 — provenance 51 tokens | 🟢 | zéro littéral `new Color(`/`new Color32(`/`TryParseHtmlString` dans les 3 fichiers doctrine (contrôle positif sur les 3 formes) ; tout `DesignTokens.Current.X` de `TopBarController.cs` est un champ RÉEL (reflet sur `DesignTokens`, comparé à `CanonPaletteComparator.ExpectedTokenCount+1`) ; mécanisme de scan éprouvé sur les 3 formes syntaxiques (nommée/directe/indirection) |
| (d) DA5 — non-régression | 🟢 | `RenderedTexts.Count==2` (callsign+badge, resserrement NOMMÉ de `C2F4`'s `>=2`), aucun scalaire brut dans le corpus |
| Suite existante | 🟢 105/105 | `TopBarControllerPlayModeTests` (C2F1-F4), `HudPlayModeTests` (hud-F1..F7, F2, F6, M1, M2), `NavigationPlayModeTests`, `AppShellPlayModeTests`, `ChromeTabAccentAllowlistPlayModeTests` (amendée, voir ci-dessous) — inchangés |

### Falsifiable existante AMENDÉE nommément

`ChromeTabAccentAllowlistPlayModeTests.ExpectedAccentGoldBindings` — **11 → 12 entrées**, ajout de
`"Shell/TopBarController.cs"`. Raison : `InitPalette()` introduit le PREMIER accès à `accentGold`
de ce fichier (une seule fois, indirection par variable — forme (iii) déjà couverte par
`Scan_DetectsAllThreeSyntacticForms`). Le total d'occurrences suit automatiquement
(`ExpectedAccentGoldBindings.Count`), aucune valeur numérique séparée à maintenir.

## Deviations

1. **Piège de citation (socle CLAUDE.md) rencontré ET corrigé pendant ce chunk** — un premier jet
   du docblock d'`UpdateAlarmState` citait VERBATIM `` `DesignTokens.Current.accentDanger` `` pour
   expliquer qu'on NE l'utilise PAS directement. Le scanner de substring de
   `F2_SeverityTokenAccesses` compte les COMMENTAIRES aussi bien que le code — 32 attendu, 33
   mesuré. Corrigé en PARAPHRASANT (« la teinte alarme passe PAR LE RÉSOLVEUR — jamais un accès
   direct… ») ; re-vérifié par oracle Python indépendant (0 occurrence des 3 littéraux de sévérité,
   0 littéral de bucket, exactement 1 `accentGold`) avant de relancer les tests.
2. **Bug Unity mesuré et corrigé en cours de route : `RequireComponent(typeof(CanvasRenderer))`
   porté par `Graphic` n'est PAS auto-honoré par `AddComponent<T>()` pour un type DÉRIVÉ, à
   l'exécution** — reproduit côte à côte (`Image` l'obtient, `VerticalGradientImage` non), sur DEUX
   GameObjects isolés. Conséquence AVANT correctif : le fond de barre ne dessinait RIEN
   (silencieux, aucune erreur console) — les deux premières captures montraient le flat
   `surfaceCard` de `TopBarSlot` en dessous, pas le dégradé. Corrigé : `CanvasRenderer` EXPLICITE
   dans le constructeur du `GameObject` avant tout `AddComponent`. Vérifié par mesure de pixels
   (échantillon vertical `y=1..44` à x=900) : gradient RÉEL confirmé après correctif
   (`(33,41,51)→(15,17,19)`, uniforme `(22,22,28)` avant). Documenté aussi dans
   `VerticalGradientImage.cs` pour tout futur réutilisateur.
3. **Pas de callsign dans `.barre` de la maquette source** — `hud-brennar.html` ne montre AUCUN
   élément d'identité joueur dans sa barre (seulement money/day-time + médaillon + volutes
   décoratives). Le placement du callsign (coin gauche, permanent) est une DÉCISION
   d'implémentation, pas une extraction — convention « identité coin », cohérente avec le
   reste du chrome (bouton leading au même coin).
4. **« Tampon SIGNER L'ORDRE » (doctrine B) REUSE comme MATÉRIAU, pas comme copie littérale** —
   `palettes-ecrans.html` §B/D documente un traitement de BOUTON D'ACTION (CTA « donner/signer
   l'ordre »), pas le badge de notification du TopBar. Appliqué la MATIÈRE du tampon (filet or en
   soulignement, texte espacé) au badge existant, en gardant son texte fonctionnel VERBATIM
   (`"[ ] Clear"`/`"[!] New"`, épinglé par C2F2/C2F4) — jamais la copie littérale « SIGNER
   L'ORDRE », qui appartient à une autre feature (un CTA d'ordre, hors périmètre TopBar). Le cadre à
   4 côtés de la maquette B est simplifié à un SEUL filet (soulignement) : un cadre plein-troué
   aurait rendu la falsifiable « or jamais en aplat » ambiguë sur sa propre boîte englobante — voir
   §(b) ci-dessus, résolu proprement par la mesure de couverture, mais le filet unique reste le
   choix le plus sobre et le moins de surface changée.
5. **Pas de flou de fond réel (`backdrop-filter:blur`)** — uGUI n'offre pas nativement de blur de
   contenu sous-jacent pour un panneau simple sans passe de rendu dédiée. Compensé par une alpha
   plus élevée (0.96/0.92, proche de l'original e8/d8 ≈ 0.91/0.85) : lecture visuelle "verre sombre"
   proche, sans le flou.
6. **Callsign : `enableAutoSizing` ajouté** (bug pré-existant visible sur la capture AVANT restyle —
   `operational_demo` passait sur 2 lignes). Corrigé au passage (aucune falsifiable n'épingle la
   taille de police exacte du callsign) — défaut évident, pris + signalé (règle socle).
7. **Callsign hors du périmètre « répartis autour du centre »** — lu littéralement, la consigne du
   lot groupe callsign/jour/badge « autour du centre » ; interprété comme jour+badge FLANQUANT le
   manomètre (le geste demandé explicitement — le centrage) et callsign au coin gauche (convention
   d'identité, la maquette ne le montre pas du tout — voir déviation 3). Signalé explicitement ici
   plutôt que deviné en silence.

## Ce qui n'a PAS pu être tenu avec les 51 tokens (écart assumé, à faire trancher si le rendu ne
   convient pas)

Aucun blocage : les 3 teintes hors-token de la maquette (verre bleu nuit 2 stops, laiton) ont
toutes été composées depuis des tokens EXISTANTS avec un écart mesuré < 0.07/canal (voir §4
ci-dessus). Pas de 52e token demandé, pas de STOP nécessaire sur ce chunk.

## Evidence

Captures (Play Mode réel, `AppShell` complet, callsign `operational_demo`, cash réel
`$9,970,000.00`) :
- `Assets/Screenshots/hud_topbar_v31_burning.png` — `SetCitywideHeatBucket("BURNING")`, filet+anneau
  en teinte Severe, aiguille +60°.
- `Assets/Screenshots/hud_topbar_v31_nominal.png` — `SetCitywideHeatBucket("COLD")`, filet+anneau
  en or calme, aiguille -60°.
- Rect imprimé (mesure séparée, même résolution de capture) :
  `screenW=1100 screenH=577 canvasScaleFactor=0.859 rectX=0.0 rectYTopDown=0.0 rectW=1100.0
  rectH=48.1 barCenterX=550.0 manoCenterX=550.0`.
- Référence AVANT restyle (non modifiée par ce chunk) : `Assets/Screenshots/hud_topbar_burning_v1.png`.

Effet de bord bénin commité avec ce lot : `Assets/Fonts/DejaVuSans SDF.asset` — l'atlas SDF
dynamique de TextMeshPro a grossi (3 glyphes neufs) suite aux sessions Play Mode réelles de capture
(texte réellement rendu à travers ce font asset) — comportement TMP normal, additif uniquement
(diff vérifié : aucune suppression).

SHA : voir le commit qui accompagne ces notes (`git log -1 --format=%H`).
