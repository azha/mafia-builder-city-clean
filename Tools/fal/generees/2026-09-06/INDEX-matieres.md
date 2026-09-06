# Matières d'écran — lot d'essai (2026-09-06)

**PROPOSITION.** Rien n'est câblé. Trois matières, choisies comme les trois plus différentes.

## Ce qui est TEXTURE et ce qui porte la DONNÉE — lu dans `front.md` avant de générer

Le discriminant n'est pas « procédural ou généré », c'est *est-ce que l'objet varie avec la donnée ?*
Sur les trois écrans, la matière et le mécanisme sont **dans le même objet**, et générer le mauvais
morceau tuerait la mécanique — c'est la leçon de ㊲ appliquée en amont.

| écran | ancre | ce qui est TEXTURE (généré) | ce qui porte la DONNÉE (reste procédural) |
|---|---|---|---|
| ㉘ La distribution | `front.md:1240` | la planche de **liège** | la **ficelle** : sa forme porte `sinuosity_bucket` (droite · serpente · tordue), les **ponts** portent `river_crossings_count_bucket`, une route `severed` est une ficelle **rompue** |
| ㉙ Le conflit | `front.md:1307` | le **bois** de la table du bar | l'**allumette** : `outcome_bucket` se lit sur ce qu'il en reste (intacte → `retreat` … entièrement consumée → `breakthrough`) ; les **auréoles de verres** sont les quatre familles ; la **serviette** porte le plan |
| ㉚ La chaîne d'appro | `front.md:1216` | le **papier pelure** | la **remontée un cran à la fois** : les crans non remontés restent flous (`trace-step`) |

⛔ En particulier : **aucune auréole de verre n'est peinte dans la texture de la table.** Elles sont
la donnée. Une texture qui les contiendrait rendrait le mécanisme illisible et non falsifiable.

## Trois propriétés imposées après coup, aucune obtenue par le prompt

| propriété | ce que le prompt a donné | ce que le dispositif donne |
|---|---|---|
| **palette** | liège brun-rouge, chêne brun, papier crème — leurs propres couleurs | bichromie entre deux jetons : le grain survit, les couleurs propres disparaissent |
| **raccord** | « seamless tileable » écrit, et 3 textures sur 3 avec une couture : écarts **46,1 · 82,4 · 41,2** contre témoins 13,5 · 5,4 · 1,9 | décalage d'une demi-période + fondu miroir ⇒ **4,1 · 1,5 · 1,3**, au niveau du témoin |
| **lisibilité** | non contrôlée | pire carreau vs encre : **5,85 · 8,96 · 7,11 : 1** (plancher canon 4,5) |

★ Troisième fois de la journée qu'une propriété écrite dans le prompt n'est pas rendue par le modèle
(fond des portraits, encres, raccord). *Un dispositif imposé après coup rattrape les écarts du modèle,
un prompt les espère.*

★ Le critère de raccord a lui-même dû être corrigé : « au plus le double du témoin » condamne les
textures TRÈS lisses — le papier rend témoin **0,5** et raccord **1,2**, donc « couture visible » pour
un écart d'un niveau sur 255. Un critère en RATIO n'a pas de sens quand le dénominateur tend vers zéro :
un **plancher absolu** (2 niveaux) le borne.

## Ce qui n'est PAS résolu, et qui se voit sur la planche

1. **La couture est invisible, la PÉRIODICITÉ ne l'est pas.** Ce sont deux propriétés distinctes et ma
   mesure ne couvre que la première : sur `matieres-en-situation.png`, tuilé 2×2, l'œil suit la
   répétition des mêmes accidents. Pour un fond plein écran (1080×2400 = 5 tuiles de 512), il faut soit
   une source plus grande, soit une rotation/décalage par tuile — à mesurer, pas à supposer.
2. **Le liège est trop saturé** en bichromie vers `#8a611c` : il tire l'ocre. À reprendre vers un jeton
   plus éteint.
3. **Aucune n'a été vue sous le chrome réel**, seulement sous un rendu de texte fait ici avec la police
   embarquée (DejaVu). La mesure sous chrome demande une capture, donc la porte Unity.

## Le « décor de scène » — ce n'est pas une matière à générer

Les juges le relèvent absent **4 écrans sur 4** et la doctrine v3.3 le prescrit (`front.md:308`). Mesuré :
la scène peinte **existe déjà** — `Assets/Art/District/Backgrounds/VERGE_D_{JOUR,NUIT}_FINAL.png`,
1080×1920, rendus Blender de l'atelier — et **un seul contrôleur la charge**
(`DistrictInteriorScreenController` via `DistrictBackgroundSlots`). Les sept écrans neufs vérifiés
(Conflit, Distribution, ChaîneDAppro, Carnet, Loi, Démolition, Délégation) en comptent **zéro**.
⇒ **C'est un trou de CÂBLAGE, pas un manque d'asset.** Générer une neuvième matière ne le fermerait pas.

## Reproductibilité

`fal-ai/flux/dev`, graine **7**, 1024², ~0,025 $ pièce. Prompts archivés à côté de chaque image.
Outils : `matiere.py` (bichromie + raccord imposé + mesure de couture avec témoin + pire carreau vs encre).
