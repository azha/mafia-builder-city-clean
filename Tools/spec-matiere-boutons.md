# Spec — la matière des boutons (proposition, 2026-09-06)

À exécuter quand la base de démo est refondue. **Ne pas toucher au chrome partagé avant.**

## Le découpage

Un bouton porte trois choses ; deux varient avec la donnée, une seule est une texture.

| ce qu'il porte | varie ? | où ça vit |
|---|---|---|
| **forme** — rayon, taille, ordre de fratrie, état de layout | oui (résolution, contenu) | **procédural**, inchangé |
| **état** — actif · désactivé · chaud, et le libellé | oui (donnée) | **procédural** : le résolveur d'état donne la teinte |
| **matière** — le grain du laiton brossé, du cuir, du métal peint | **non** | **texture** : un `Sprite` en 9-slice, tuilé, posé SOUS le tracé et **teinté** par le résolveur |

La texture n'est donc jamais une image de bouton : c'est un **grain** neutre que la teinte d'état
colore. Un bouton désactivé et un bouton chaud partagent le même sprite.

## ⛔ La garde, et pourquoi elle est structurelle

Mesuré sur ce dépôt le 2026-08-22 : un `Graphic` nu n'implémente ni `IMaskable` ni `IClippable` —
**aucun `Mask` ne peut l'atteindre**. Un sprite posé sous un masque à coins arrondis ne sera donc pas
clippé, et le défaut est **invisible sur un bouton large** (aucun coin ne dépasse). Second piège du même
jour : `AddComponent<T>()` à l'exécution n'honore pas le `[RequireComponent(CanvasRenderer)]` d'une
classe de base, et sans `CanvasRenderer` un `Graphic` **ne dessine rien, sans erreur console**.

⇒ Les gardes sont **structurelles**, pas des gardes de pixel :
1. tout `Graphic` sous un `Mask` est un `MaskableGraphic` ;
2. tout objet de matière porte son `CanvasRenderer` ;
3. le résolveur d'état est la **seule** source de teinte (aucune correspondance état→couleur ailleurs).

## Le premier test

**Un bouton ÉTROIT**, jamais un large : c'est la seule géométrie qui révèle le défaut de clipping.
Avant/après en capture, et la garde 1 exécutée sur l'arbre du bouton.
