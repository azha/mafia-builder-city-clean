# Spec — la matière des boutons (v2, 2026-09-06, mesurée sur le code)

À exécuter quand la base de démo est refondue. **Ne pas toucher au chrome partagé avant.**
La v1 de cette spec était écrite sans lire le code des boutons ; tout ce qui suit est ancré.

## Ce qui existe aujourd'hui — mesuré

Le bouton de référence est `BuildFicheBouton` (`Assets/Scripts/CityMap/DistrictInteriorScreenController.cs:1752`),
qui produit les trois CTA de la fiche (`COLLECTER` `:1704`, `BLANCHIR` `:1706`, `AMÉLIORER` `:1708`) :

| pièce | ce que le code fait | ancre |
|---|---|---|
| plaque | `Image` + sprite **généré** `ProceduralUI.VerticalGradient(64, …)`, `Image.Type.Simple` | `:1758-1764` |
| teinte | **`fond.color = Color.white`** — donc **c'est le sprite qui porte la couleur**, pas la teinte | `:1765` |
| état | un **booléen `or:`** passé à la fabrique, qui choisit l'apparence dorée ou non | `:1752`, `:1704-1708` |
| contour | un second `Image` (« trait ») sous un objet de masque, couleur `DesignTokens.Current.ficheCtaOrBord` | `:1780-1781` |

`AddComponent<Button>` apparaît **42 fois** dans `Assets/Scripts` : il n'existe pas de fabrique unique.
Toute matière posée « sur les boutons » doit donc passer par une fabrique partagée, sinon elle sera
posée 42 fois à la main et divergera.

## Le découpage

| ce que le bouton porte | varie avec la donnée ? | où ça vit |
|---|---|---|
| **forme** — rayon, taille, ordre de fratrie | oui (résolution, contenu) | procédural, inchangé |
| **état** — `or` / désactivé / chaud, et le libellé | oui | procédural : un **résolveur nommé** rend la teinte |
| **matière** — grain du laiton brossé, du cuir, du métal peint | **non** | texture : `Sprite` en **9-slice**, tuilé, teinté |

⚠️ **Conséquence directe de `fond.color = Color.white` :** la texture de grain doit être **neutre**
(niveaux de gris), et la couleur d'état doit passer par `Image.color`. Poser un grain déjà coloré
reproduirait le défaut actuel — l'apparence dans le sprite, l'état nulle part.

⚠️ **Et le booléen `or:` est une correspondance état → apparence non nommée**, exactement la forme que
le socle interdit (« une correspondance portée par l'ordre d'un tableau ou par de la prose n'a aucune
forme exécutable à asserter »). **Premier geste du lot, avant toute texture** : remplacer `bool or` par
une fonction nommée prenant la valeur du domaine (`TeinteBouton(EtatBouton) → Color`). Sans ça, aucune
garde d'ensemble ne peut voir la classe.

## Les gardes — structurelles, jamais de pixel

1. tout `Graphic` sous un `Mask` est un `MaskableGraphic` ;
2. tout objet de matière porte son `CanvasRenderer` (⚠️ `AddComponent<T>()` à l'exécution **n'honore
   pas** `[RequireComponent]` d'une classe de base — sans `CanvasRenderer`, un `Graphic` ne dessine
   **rien, sans erreur console**) ;
3. le résolveur est la **seule** source de teinte d'état : aucun littéral d'état→couleur ailleurs.

⚠️ **Énoncé daté corrigé en écrivant cette v2** : le défaut du 2026-08-22 (« `VerticalGradientImage`
dérive de `Graphic` nu, donc aucun `Mask` ne peut l'atteindre ») **est réparé** — la classe est
aujourd'hui `MaskableGraphic` (`Assets/Scripts/ShellContracts/VerticalGradientImage.cs:38`). La garde 1
reste due, mais comme garde de **classe** pour les composants à venir, pas comme correctif d'un défaut
vivant. *Une leçon reprise d'un rapport sans être recomptée est un fait déduit.*

## Le premier test

Un **bouton étroit**, jamais un large : c'est la seule géométrie où un défaut de clipping se voit.
⚠️ Les trois CTA de `BuildFicheBouton` sont **pleine largeur** — ils ne conviennent pas. Le candidat se
choisit en mesurant (`preferredWidth` / `minWidth` sur les fabriques qui portent un `Button`), pas de
mémoire ; je ne l'ai pas fait ici parce que le choix appartient au lot qui exécutera.

Livrables du test : capture avant/après du bouton choisi, garde 1 exécutée sur son arbre, et le compte
des sites d'appel repointés vers la fabrique partagée (`AddComponent<Button>` : 42 aujourd'hui).
