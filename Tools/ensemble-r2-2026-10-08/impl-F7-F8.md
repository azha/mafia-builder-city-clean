# Implémentation F7 + F8 — ⑤ « la décision du jour » (E11), juge d'ensemble r2

Tête client : `e22787b2` + working tree (non commité). Unity NON lancé ; typecheck hors porte seulement.

## Fichiers
- `Assets/Scripts/Shell/DecisionDetailScreenController.cs` : F7 (le tampon devient la `.plaque-laiton`), F8 (`Filets.Poser(decor.Support, …TapisFeutre)` + `SetAsLastSibling`). `PlaqueDuTampon` supprimée (remplacée par `DegradeDeLaPlaque()`, `EncreDeLaPlaque`, `EncreDeLaSousLigne()`).
- `Assets/Scripts/ShellContracts/PiedDEcran.cs` : docstring seule de `PlaqueCreme` (⑮ DÉPOSER seulement). Hors liste de la consigne mais demandé nommément.
- `Assets/Scripts/ShellContracts/ProceduralUI.cs` : NON touché (les primitives existaient : `DegradeLineaire`, `EchantillonDeDegrade`, `RoundedRectMask`).
- Tests : `PiedDEcranPlayModeTests` (P5 réécrit : `P5_Cinq_LaPlaqueLaiton_SerieSix_Matiere_Encre_EtContraste`), `DecorDeScenePosePlayModeTests` (`PlaqueLaiton`, `TapisFeutre` retirées de `RecettesEnAttente["⑤"]`), `DecisionDetailCartePlayModeTests` (+ `F7_…RenduSurLesPixels`, `F8_…RenduSurLesPixels`, banc).

## F7 — construction
`Tampon` (VLG, padding 12/11 CSS) : `Image` rectangle arrondi rayon 6 + `Mask(showMaskGraphic=false)` ; enfant `Degrade` (`ProceduralUI.DegradeLineaire(180°, #e8c87a 0 % / hudHairlineGold 55 % / #8a6a22 100 %)`, pixels OPAQUES cuits), hors mise en page, 1er ; `Filets.Poser(PlaqueLaiton)` (1 px `#6b4a12`, rayon 6) remis à l'index 1 (au-dessus du dégradé, sous les textes) ; libellé `hudSerifFont` Bold 12,5 CSS, `characterSpacing` 22, encre `#3a2a0a` ; sous-ligne 8 CSS. Le cerne rouge et la plaque crème sont retirés. Le palier médian est le token `hudHairlineGold` (= #b08d3e, pas une recopie).

## Alpha 0,8 de la sous-ligne (`small{color:#3a2a0acc}`)
Texte : couleur OPAQUE pré-mélangée en sRGB (`Color.Lerp(fond, encre, 0,8)`), `fond` = le dégradé à 70 % de la hauteur (où se tient la sous-ligne) ⇒ (79,59,19). Aucune opacité à convertir ; « déplacer la couleur à opacité gardée » n'est pas exact sur un fond qui varie.

## Contrastes mesurés (WCAG, `python3 -I`, mêmes formules que le test)
| encre / fond | ratio |
|---|---|
| #3a2a0a / #e8c87a (haut) | 8,56 |
| #3a2a0a / dégradé à 35 % (où se tient le libellé) | 5,73 |
| #3a2a0a / #b08d3e (palier médian) | **4,44** (cible 4,5 manquée de 0,06 : c'est la maquette) |
| #3a2a0a / #8a6a22 (bas) | 2,75 |
| sous-ligne (79,59,19) / dégradé à 70 % | 2,92 |
Épinglés : médian ≥ 4,4 ET < 4,5 (mesure), libellé ≥ 4,5, contrôle négatif bas < 3, sous-ligne ≥ 2,8.

## F8
`Filets.Poser(decor.Support, Filets.DecisionDetail.TapisFeutre).transform.SetAsLastSibling()` juste après `DecorDeScene.Poser`. `PileDeDecision` ne touche que les offsets du support : le conteneur (étiré) suit. Le `Mask` du support (26/26/0/0) coupe les extrémités du trait droit (`Cotes.Haut` n'est pas un contour arrondi). Garde d'effet : ≥ 20 colonnes sur 28 en (176,141,62) ± 12 à 2 px sous le bord haut du support ; contrôle négatif 22 px plus bas = 0.

## Évidence
- `typecheck-hors-porte.py --controle --frais ShellContracts --frais Shell --frais Operational --frais CoreLoops CityMap.PlayMode.Tests.csproj Assets/Tests/PlayMode/DecisionDetailCartePlayModeTests.cs` : `CityMap.PlayMode.Tests.csproj: 247 sources · 281 refs · EXIT=0 · 0 erreur(s)` ; `[contrôle positif] … EXIT=1, 1 erreur(s), citée dans ce fichier : OUI`.
- `--tout` : 17 × EXIT=0 (un passage intermédiaire a montré CitySim rouge sur `HauteurSupportInspectionVideCss` : fichiers de l'autre agent, en cours d'édition ; repassé 17/17).
- `apparier-litteraux-aux-tokens.py` : 0 littéral à moins de 4 d'un token (nouveaux : #e8c87a à 15,3 ; #8a6a22 à 10,8 ; #3a2a0a à 29).

## Déviations (quoi / pourquoi / ce que la spec disait)
1. Pas de `box-shadow:0 4px 10px #000a, inset 0 1px 0 #fff8, inset 0 -1px 0 #0008` ni de `text-shadow:0 1px 0 #ffffff66` : la consigne ne les demandait pas ; surface minimale.
2. Contraste médian 4,44 < 4,5 : suivi de la maquette (pas d'écart de couleur inventé) ; épinglé tel quel.
3. Sous-ligne à 2,92:1 (8 CSS, 80 %) : idem, maquette ; à juger en capture (lisibilité = A/B possible).

## Doutes que seule une capture lèvera
- Le bord 1 px `#6b4a12` en contour arrondi sous `Mask` (antialias des coins) ; l'épaisseur réelle du liseré d'or (`PxTrait` sur la base série 6).
- Les coins du liseré du tapis (trait droit coupé par le rayon 26) : amincissement vs `border-top` CSS.
- Lisibilité de la sous-ligne ; ombre portée absente de la plaque.
