# Spec — la matière des boutons (v3, 2026-09-06, mesurée sur `origin/main` @ `fd0e21e`)

Écrite sans rien exécuter. **Re-mesurée après synchronisation** : le client avait avancé de 105 commits
depuis mes chiffres précédents — la v2 les avait pris sur un arbre vieux de trois heures.

## Ce que la re-mesure confirme, et ce qu'elle corrige

| fait | sur `fd0e21e` | verdict |
|---|---|---|
| `AddComponent<Button>` | **42 occurrences dans 26 fichiers** | **inchangé** malgré 105 commits — ce n'est pas une dérive récente, c'est l'état stable |
| fabrique partagée de bouton | **aucune** (`CreerBouton`/`AjouterBouton`/`*Factory` : 0 hit) | inchangé |
| bouton de référence | `BuildFicheBouton`, `DistrictInteriorScreenController.cs:1801-1805` | **ancres déplacées** (c'était `:1704-1708` en v2) |

⇒ Une matière posée aujourd'hui devrait être recopiée **42 fois**, et la 43ᵉ ne l'aurait pas. **La
fabrique partagée n'est pas une étape du lot : elle en est la condition.**

## ⚠️ Ce que la v2 déclarait manquant et qui dort déjà à côté

La v2 prescrivait d'écrire un résolveur nommé, un masque à coins arrondis et une règle de contraste.
**Les trois existent**, dans `Assets/Scripts/ShellContracts/` — le fichier voisin de celui que je citais :

| ce que je croyais à écrire | ce qui existe déjà | ancre |
|---|---|---|
| un résolveur nommé état → apparence | **le patron maison**, résolveur exhaustif sur enum fermé possédé par le fichier, avec `Severity`, `SeverityColor`, `Label`, `Glyph` | `HeatBucketResolver.cs:27-137` (et `DayPhaseResolver.cs`) |
| un masque à coins arrondis pour clipper la matière | `RoundedRectMask(cornerRadiusPx)`, plus `RoundedRectOutline`, `RoundedRectDashedOutline`, `RoundedRectShadow` | `ProceduralUI.cs:1100, 402, 634, 1050` |
| une règle « le texte reste lisible sur la matière » | **`AlphaPourContrasteGaranti(encre, voile, ratioCible)`** et `ContrasteApresVoile` — le voile dont l'alpha GARANTIT un ratio | `ProceduralUI.cs:875, 901` |
| la conversion de couleur maquette → moteur | `CouleurPourMelangeLineaire(encre, fond, alphaSrgb)` | `ProceduralUI.cs:783` |

⇒ **Le lot n'invente aucun mécanisme.** Il en assemble quatre qui existent, sous une fabrique qui
manque. C'est la seule chose qui manque vraiment.

### ⛔ La règle de lisibilité s'APPELLE, elle ne se réécrit pas

C'est le point à ne pas manquer en relisant cette spec. La contrainte « le texte reste lisible sur la
matière » allait être écrite **en prose** — un seuil, une phrase, un rappel. Elle existe déjà **en
fonction exécutable** :

```
ProceduralUI.AlphaPourContrasteGaranti(encre, voile, ratioCible)   // :875 — l'alpha QUI GARANTIT le ratio
ProceduralUI.ContrasteApresVoile(encre, voile, fond, alpha)        // :901 — et son inverse, qui le mesure
```

**Une règle exécutable et une règle en prose n'ont pas la même valeur : la première rougit, la seconde
vieillit.** Toute matière posée sous du texte prend son voile de la première fonction et se vérifie par
la seconde. Réécrire un seuil en dur dans le lot serait la sixième réinvention d'un mécanisme déjà là —
il y en a eu cinq dans la seule soirée du 2026-09-06, dont deux découvertes dans un correctif déjà livré.

### ★ Ce que « 42 » ne dit pas, et que « 42 inchangé » dit

Le compte seul se lirait comme une dette qu'on laisse courir. **Le compte inchangé à travers 105
commits** dit autre chose : ce n'est pas une dérive en cours, c'est **l'état stable du dépôt**. Aucun
des écrans ajoutés ce soir n'a créé de fabrique, et aucun n'en a manqué une — il n'y en a jamais eu.
⇒ La priorité du lot ne vient pas de l'urgence (rien n'empire) mais de la **multiplication** : chaque
écran neuf ajoute des sites à repointer plus tard.

## Le découpage

| ce que le bouton porte | varie avec la donnée ? | où ça vit |
|---|---|---|
| **forme** — rayon, taille, ordre de fratrie | oui (résolution, contenu) | procédural, inchangé |
| **état** — actif · désactivé · chaud, et le libellé | oui | procédural : un résolveur **sur le patron de `HeatBucketResolver`** rend la teinte |
| **matière** — grain du laiton brossé, du cuir, du métal peint | **non** | texture : `Sprite` en **9-slice**, tuilé, posé SOUS le tracé et **teinté** par le résolveur |

⚠️ **Contrainte que le code impose et qu'on ne peut pas ignorer** : `BuildFicheBouton` pose
`fond.color = Color.white`, donc **c'est le sprite qui porte la couleur**. Si la matière arrive déjà
colorée, l'état n'a plus où s'exprimer. ⇒ **la texture de grain est NEUTRE** (niveaux de gris) et la
couleur d'état passe par `Image.color`. Sans cette règle, on reproduit le défaut actuel un cran plus bas.

⚠️ **Et l'état est aujourd'hui un `bool or:`** passé à la fabrique — une correspondance état → apparence
**non nommée**, donc inassertable : aucune garde d'ensemble ne peut la voir. **Premier geste du lot,
avant toute texture** : `bool or` → un résolveur nommé, sur le patron du voisin.

## Le style de la matière — sombre napolitain, fin des années 1980

Une matière de bouton porte autant d'identité qu'un visage, et à 26 px elle en porte davantage.
Registre : **laiton brossé, cuir sombre, métal peint écaillé** — pas de plastique, pas de verre
brillant, pas de dégradé lisse. La palette est imposée **après coup** (bichromie entre deux jetons),
comme pour les matières d'écran : le grain survit, les couleurs propres disparaissent, et la contrainte
ne dépend pas d'un prompt.

## ⛔ Ce que cette spec ne tranche PAS

Le même refus que pour le décor, aux mêmes endroits — l'user n'a pas parlé, donc rien n'est écrit :
1. **quelle matière pour quel bouton** — un grain commun à tous, ou un grain par famille d'écran (la
   doctrine v3.3 dit « un écran une matière », mais elle parle du FOND, pas des commandes) ;
2. **si le bouton principal se distingue par la matière ou seulement par la teinte** ;
3. **si l'état « chaud » a une matière propre** ou reste une teinte sur la matière commune ;
4. **le rayon et l'épaisseur** — ils viennent des maquettes, pas d'une décision de spec.
Le lot livre le mécanisme et **zéro table**. Remplir un trou que l'user a laissé ouvert, c'est une
décision déguisée en implémentation.

## Les gardes — structurelles, jamais de pixel

1. **une seule fabrique** : le compte de `AddComponent<Button>` hors de la fabrique doit être **0**,
   asserté sur l'arbre, avec le compte actuel (**42**) cité comme point de départ ;
2. tout `Graphic` sous un `Mask` est un `MaskableGraphic` ;
3. tout objet de matière porte son `CanvasRenderer` — ⚠️ `AddComponent<T>()` à l'exécution **n'honore
   pas** `[RequireComponent]` d'une classe de base, et sans lui un `Graphic` **ne dessine rien, sans
   erreur console** ;
4. le résolveur est la **seule** source de teinte d'état : aucun littéral état → couleur ailleurs ;
5. **contrôle positif obligatoire** sur chacune : retirer le composant, ou poser une teinte hors
   résolveur, doit faire **rougir**. Une garde qui n'a jamais rougi est une prose datée avec un
   `[Test]` devant.

⚠️ **Énoncé daté corrigé en v2 et re-vérifié ici** : le défaut du 2026-08-22 (`VerticalGradientImage`
dérivait de `Graphic` nu, donc aucun `Mask` ne pouvait l'atteindre) **est réparé** — la classe est
`MaskableGraphic`. La garde 2 reste due comme garde de **classe** pour les composants à venir, pas
comme correctif d'un défaut vivant.

## Le premier test

Un **bouton étroit**, jamais un large : c'est la seule géométrie où un défaut de clipping se voit.
⚠️ Les trois CTA de `BuildFicheBouton` sont **pleine largeur** — impropres. Le candidat se choisit en
mesurant `preferredWidth`/`minWidth` sur les fabriques portant un `Button`, pas de mémoire.
Livrables : capture avant/après du bouton choisi, les cinq gardes exécutées, et le compte de sites
repointés vers la fabrique (**42 → 0** hors fabrique).
