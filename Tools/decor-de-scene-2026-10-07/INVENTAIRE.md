# Décor de scène — inventaire écran × couche × matière (CLIENT-2, 07/10/2026)

Cadre : ruling user du 07/09 (`Tools/juge-visuel/ARBITRAGES-user-2026-09-07.md` pt 1 : « décor de scène série 6 absent — option (a) lot d'assets scène par écran », RATIFIÉ en bloc à 01:05 par f2) ;
ruling du 07/10 (« le gros, fidèle ; les nuances à la fin »). Source de vérité : la maquette `~/project/atelier3d-mafia/ecrans-brennar-6.html` (146 cadres), MESURÉE dans Chromium
(`mesurer-*.cjs`, styles calculés — pas lue à l'œil). Écrans ↔ cadres : `Tools/juge-visuel/INDEX.md`. Les JSON voisins sont les mesures brutes ; `inventaire.py` régénère le tableau.

## 1. Ce que la maquette série 6 empile, du fond vers le joueur (mesuré)

Chaque cadre `.tel` = **quatre couches communes** + le contenu :
| couche | recette (maquette) | portée |
|---|---|---|
| L1 SCÈNE | une image plein cadre `background-size:cover`, `position: center 20…38 %` ; 4 images au total : `district` (nuit, 720×1280), `verge` (nuit, 900×765), `bar` (nuit, 720×900), `verge-jour` (900×765) ; filtre de LUMINOSITÉ par écran (`brightness(.18 … .62)`) | 26 écrans |
| L2 VOILE | `linear-gradient(180deg,#0a0f18cc 0,#0a0f1822 18%,#0a0f1800 40%,#0a0f1866 100%)`, le MÊME partout (143 cadres sur 146) | 26 |
| L3 SUPPORT | le fond du panneau posé sur la scène (la scène ne reste visible que dans une BANDE du haut : ≈ 21 % du cadre pour 16 écrans, 10 à 35 % pour les autres, 100 % sur la carte) — voir familles | 26 |
| L4 CERNE + ENSEIGNE | cerne laiton `1px #b08d3e` à 5 px du bord, lueur `0 0 12px #b08d3e26`, trait intérieur `#0b1016` ; enseigne plate en tête (`linear-gradient(178deg,rgba(11,17,27,.91),rgba(13,19,30,.85))`, filet bas laiton 2px) | 7 (famille A) |
Plus la **médaille `mano`** (rond laiton, radial) = chrome partagé, déjà au client, hors lot.

### Les trois familles de SUPPORT (L3)
- **A — support standard** (7 écrans : ㊲ ㉟ ㊳ ㊴ ㊵ ㊱ ㉑) : recette IDENTIQUE, `rep6 = vnt6 = jrn6 = dos6 = bln6 = hrz6 = mar6` :
  `radial(72 % 40 % en 50 % 22 %, or rgba(217,171,78,.15) → 0 à 66 %)` + `radial(90 % 60 % en 50 % 96 %, cyan rgba(127,212,217,.07) → 0 à 70 %)` + `linear 178° #111823 0 % → #0b1016 54 % → #0d0f10 100 %` + cerne + enseigne. C'est le « dégradé + halos » dont l'aplat `#0d0f10` est la version morte.
- **B — support à fond propre** (9 écrans : ㉜ ㉚ ㉛ ㉝ ㉞ ㉙ ㉘ ㉓ ㉒) : un dégradé vertical à 3 arrêts, propre à l'écran (ex. ㉚ `#1c1a17→#151310 60 %→#111014`, ㉙ `#2a1e14→#1d1610 46 %→#141014`, ㉒ `158° #333c46→#232a32 42 %→#1a2027`), + objets dédiés (plaques, pages à rayures…).
- **C — objet / matière dédiée** (10 écrans : ⑤ ⑯ ⑨ ⑩ ⑭ ⑮ ⑰ ㉔ ⑱ ③) : un OBJET dessiné (tapis de feutre + lampe ⑤, feuille de registre ⑯, zinc + ardoise ⑨ ⑩, tôle + cadrans + vis ⑭, liège + punaises ⑮ ⑰, téléphone + LCD ㉔, bureau + abat-jour ⑱, carte ③).

## 2. Inventaire compté (sortie de `inventaire.py`)
```
SYM  CONTRÔLEUR                         CADRE(n)  SCÈNE        LUM   BANDE  RACINE    FAMILLE                   CERNE ENSEIGNE  OBJETS
③    CityMapController                   22(3)  district    0.4   100%  barre     C objet / matière dédiée  F     F        fleuve,halo,carte-pied
④    DashboardController                — aucune maquette série 6
⑤    DecisionDetailScreenController       4(5)  verge       —      34%  tapis-feutre C objet / matière dédiée  F     F        tapis-feutre,spot,carte-or,cachet,piece,plaque-laiton
⑥    LieutenantScreenController         — aucune maquette série 6
⑪    LaunderingController               — aucune maquette série 6
⑯    DailyReviewScreenController          0(4)  verge-jour  —      19%  feuille   C objet / matière dédiée  F     F        fond
㊲    ReputationScreenController         119(6)  district    0.24   21%  rep6      A support standard        T     T        rep6,enseigne
㉟    SellingScreenController            107(6)  district    0.24   21%  vnt6      A support standard        T     T        vnt6,enseigne
㉓    ShopScreenController                98(3)  district    0.24   21%  vitr6     B support à fond propre   F     F        art,compt,vitre,reflet,reflet.b
⑮    InspectionScreenController          31(5)  district    0.45   10%  corkboard C objet / matière dédiée  F     F        punaise,fiche-p.chasse,corkboard,grain,fiche-p.soup,fiche-p.veille
⑰    PrecinctScreenController            31(5)  district    0.45   10%  corkboard C objet / matière dédiée  F     F        punaise,fiche-p.chasse,corkboard,grain,fiche-p.soup,fiche-p.veille
⑭    CompressionScreenController         14(6)  district    0.62   35%  tole      C objet / matière dédiée  F     F        tole,vapeur,cadran-fer,vis.v1,vis.v2,vis.v3
㊴    ForensicScreenController           131(6)  district    0.24   21%  dos6      A support standard        T     T        dos6,enseigne
㊳    JournalScreenController            125(6)  district    0.24   21%  jrn6      A support standard        T     T        jrn6,enseigne
㊵    FiliereScreenController            137(6)  district    0.24   21%  bln6      A support standard        T     T        bln6,enseigne
㉕    TutorialScreenController           — aucune maquette série 6
㉒    ProfileScreenController             95(3)  district    0.24   21%  cofr6     B support à fond propre   F     F        pl,tir,poig,cofr6,plaque-id,molette
⑲    SettingsScreenController           — aucune maquette série 6
㊱    HorizonScreenController            113(6)  district    0.24   21%  hrz6      A support standard        T     T        hrz6,enseigne
㉜    DelegationScreenController          73(6)  district    0.18   21%  serv6     B support à fond propre   F     F        sv-plaque,serv6
㉚    ChaineDApproScreenController        48(6)  district    0.2    21%  appr6     B support à fond propre   F     F        appr6
㉘    DistributionScreenController        54(5)  district    0.24   21%  lieg6     B support à fond propre   F     F        planche
㉛    LoiScreenController                 67(6)  district    0.18   21%  parl6     B support à fond propre   F     F        parl6,pl-vitre
㉝    DemolitionScreenController          79(6)  district    0.18   21%  demo6     B support à fond propre   F     F        demo6
㉞    CarnetScreenController              85(7)  district    0.18   21%  carn6     B support à fond propre   F     F        carn6,cn-page
㉙    ConflitScreenController             59(8)  district    0.2    21%  cfl6      B support à fond propre   F     F        cfl6
①    DistrictInteriorScreenController   — aucune maquette série 6
②    BuildingCardController             — aucune maquette série 6
⑨    ExceptionQueueController             9(4)  bar         —      29%  ardoise-p C objet / matière dédiée  F     F        lampe
⑩    ExceptionDetailController           10(1)  bar         —      11%  ardoise-p C objet / matière dédiée  F     F        lampe
㉔    AutonomyInboxController             25(6)  district    0.45   10%  burner    C objet / matière dédiée  F     F        i,span,burner,lcd,scan,ok
⑬    CueStack (sections)                — aucune maquette série 6
⑳    Recruitment (sections)             — aucune maquette série 6
㉑    Market (non monté)                 101(6)  district    0.24   21%  mar6      A support standard        T     T        mar6,enseigne,ecrin
⑱    AppShell.MonterMenuPlus             20(2)  bar         0.55   12%  bureau    C objet / matière dédiée  F     F        objet,tag-laiton,bureau,abat-jour,pied,lumiere

ÉCRANS AVEC MAQUETTE SÉRIE 6 : 26 | sans : 9
Scènes : {'district': 21, 'verge': 1, 'verge-jour': 1, 'bar': 3}
Familles : {'C objet / matière dédiée': 10, 'A support standard': 7, 'B support à fond propre': 9}
Cerne+enseigne : 7 | luminosités distinctes : ['0.18', '0.2', '0.24', '0.4', '0.45', '0.55', '0.62', '—']
Cadres couverts : 133
```
Lecture : 35 écrans de l'index, **26 ont une maquette série 6 (25 cadres nominaux distincts : ⑮ et ⑰ partagent les cadres 31-35)**, 9 n'en ont pas (④ ⑥ ⑪ ㉕ ⑲ ① ② ⑬ ⑳ — le décor n'y est PAS défini : hors périmètre fidèle, à décider par f2).
Scènes : `district` 21 écrans, `bar` 3, `verge` 1, `verge-jour` 1. Familles : A 7 · B 9 · C 10. **7 écrans portent cerne + enseigne ; 19 non.**

## 3. État du client (cumul `53db4679`, lu dans le code — pas rejugé sur planche)
| état | écrans | preuve |
|---|---|---|
| décor LIVRÉ (scène + dégradé + zinc) | ⑨ ⑩ (`DecorAuComptoir`), ⑯ (`RevueDuJourDecor`) | `git grep DecorAuComptoir` : ExceptionQueue ×15, ExceptionDetail ×6, RevueDuJourDecor ×2 |
| fond plat `surfaceBase` / voile plat | ㊳ ㊴ ㊵ ㉚ ㉘ ㉛ ㊱ ㉞ ㊲(`Encre`) ㉟ ⑮ ⑰ ⑭ ㉒ + ㉜ ㉝ (`FondBas`) | `AjouterFond(racine, surfaceBase|FondBas|Encre)` ou `voile.color = surfaceBase` aux contrôleurs |
| fond local sombre | ㉙ (`#141a21` en ligne) | `ConflitScreenController.cs:1065` |
| aplat noir selon CLIENT-3 (cause 1), non revérifié par moi | ㉓ ⑤ ⑱ ㉔ | `ecarts-design.md` §2.1 |
| non relevé | ③ ㉑ (non monté) | — |
La scène existe déjà au client pour ④/① (`DistrictBackgroundSlots`, `Assets/Art/District/Backgrounds/VERGE_D_{JOUR,NUIT}_FINAL.png`).

## 4. Assets (les 4 scènes de la maquette ↔ le dépôt)
| scène maquette | image maquette | source au dépôt | état |
|---|---|---|---|
| district (nuit) | 720×1280 jpeg | `Assets/Art/District/Backgrounds/VERGE_D_NUIT_FINAL.png` (1080×1920) / `Tools/fal/generees/2026-09-06/decors/DISTRICT_D_NUIT_1080x2400.png` | PRÉSENTE (même scène, plus grande) |
| bar (nuit) | 720×900 | `Assets/Art/Scenes/Resources/Scenes/sprite_environment_bar_nuit.png` (1080×1350) | PRÉSENTE (déjà chargée par ⑨ ⑩) |
| verge-jour | 900×765 (recadrage) | `Assets/Art/Scenes/Resources/Scenes/sprite_environment_verge_d_or_jour.png` (1728×1080) | PRÉSENTE (déjà chargée par ⑯) |
| verge (nuit) | 900×765 | AUCUN fichier au client | ABSENTE — seule la copie embarquée dans la maquette (900×765 jpeg, extraite ici) ; un rendu propre est à demander à l'atelier (⑤ seul l'utilise) |
Matières PNG de `Tools/fal/generees/2026-09-06/` (liège, table, pelure, console, carnet, fiche, feutrine, parloir) : **non utilisées par la maquette série 6** (aucune texture bitmap dans ses supports : mesuré, 0 `feTurbulence`/`url()` hors scène) ; elles datent d'une prescription antérieure (`front.md`). Le décor fidèle à la série 6 n'a donc PAS besoin d'import de matières : ce sont des dégradés, des rayures et des objets.

## 5. Ce que le client doit donc savoir poser (le périmètre du mécanisme)
1. une SCÈNE (4 images) avec position, luminosité et hauteur de bande ; 2. le VOILE ; 3. un SUPPORT à dégradés/halos/rayures déclaratif (familles A, B ; C pour les fonds d'objets) ; 4. CERNE + ENSEIGNE (famille A).
Les OBJETS dédiés de la famille C (tapis, tôle, liège…) sont du contenu d'écran, pas du gabarit : seuls leurs FONDS entrent dans le mécanisme.

## 6. Limites
- Mesure sur le cadre NOMINAL de chaque écran ; les autres états (vide, erreur) peuvent changer l'objet, pas la scène ni le support (non vérifié état par état).
- La luminosité par écran vient du filtre CSS `brightness()` ; `blur(1px)` et `sepia(.18)` existent sur ③ et ⑭ (couches de nuance, hors du gros).
- « État client » = code, pas planche ; aucun écran n'a été re-photographié.
