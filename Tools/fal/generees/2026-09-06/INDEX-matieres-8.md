# Les huit matières d'écran — livrées (2026-09-07)

**Initiative, non demandée** : `front.md` prescrit une matière par écran sur huit écrans, et **aucune
n'existait dans le client** (mesuré : 334 rasters d'icônes et 83 SVG sources sont là, zéro texture).
Les trois premières avaient été produites en essai le 06/09 ; voici les cinq qui manquaient, et le lot
complet passé au même protocole.

| matière | écran | ancre `front.md` | bichromie (ombre → lumière) | encre | pire carreau | raccord |
|---|---|---|---|---|---|---|
| `liege.png` | ㉘ La distribution | :1240 | `#161c2b → #6b5a3a` | crème | 6,72:1 | invisible |
| `table.png` | ㉙ Le conflit | :1307 | `#161c2b → #5a4632` | crème | 8,96:1 | invisible |
| `pelure.png` | ㉚ La chaîne d'appro | :1216 | `#6b6455 → #e0d6bd` | sombre | 7,11:1 | invisible |
| `console.png` | ㉟ La vente | :969 | `#161c2b → #4a5366` | crème | **7,43:1** | invisible |
| `carnet.png` | ㉞ Les ordres du soir | :1113 | `#6b6455 → #e0d6bd` | sombre | **5,77:1** | invisible |
| `fiche.png` | ㉝ Raser un site | :1139 | `#6b5a3a → #e9dcc0` | sombre | **8,25:1** | invisible |
| `feutrine.png` | ㉜ Ce que vous avez confié | :1162 | `#161c2b → #3a4b3f` | crème | **10,19:1** | invisible |
| `parloir.png` | ㉛ La loi | :1187 | `#161c2b → #3a4451` | crème | **8,01:1** | invisible |

Plancher du canon : **4,5:1** (`T.asset.contrast_wcag_floor`). Les huit passent, la plus basse à 5,77.

## Ce que le protocole a attrapé sur ce lot

⚠️ **Le parloir a échoué DEUX FOIS au premier essai**, et les deux échecs avaient la même cause : la
bichromie visait `#8a979c`, un ton clair. L'encre crème dessus rendait **2,60:1** — sous le plancher —
et le raccord ressortait à 3,7 pour un témoin de 0,9. En descendant la lumière à `#3a4451`, le contraste
passe à **8,01** et le raccord tombe **sous le plancher absolu de 2 niveaux**.
★ **Et il faut le dire honnêtement : le raccord n'a pas disparu, il est passé sous le seuil de
visibilité.** Le verre armé porte une trame RÉGULIÈRE ; un raccord par décalage-miroir ne réaligne pas
une grille, il la coupe. Comprimer la plage a rendu la coupure invisible, pas inexistante. Si la trame
doit être plus contrastée un jour, il faudra une tuile **alignée sur la période de la grille**, pas ce
raccord-là.

⚠️ **Rappel de la limite déjà mesurée** : couture invisible ≠ périodicité invisible. Ces matières sont
faites pour des **panneaux**, pas pour des fonds plein écran ; au-delà de 2×2 tuiles l'œil suit la
répétition (`mesurer-periodicite.py` le chiffre).

## Ce qui reste à faire, et qui n'est pas à moi

L'**import Unity** (nommage `Assets/Art/Matieres/`, `textureType`, 9-slice, `wrapMode: Repeat`) et le
**câblage** écran par écran. Les fichiers sont prêts, en 1024², teintés, raccordables.
