# ㊲ La réputation — CE QUE MES GARDES NE COUVRENT PAS

> Écrit avant de déclarer l'écran fini, et volontairement séparé du dossier du juge : celui-ci
> dit ce qui est vérifié, celui-là ce qui ne l'est pas. **Un angle mort connu et non déclaré est
> le seul défaut qui ne laisse aucune prise au juge suivant** — il ne peut pas chercher ce qu'on
> ne lui dit pas d'ignorer.

## Ce que les 15 gardes couvrent (rappel court)

Structure (CanvasRenderer sur tout `Graphic`, convention de fratrie, plancher anti-vacuité),
polarité des quatre poses avec son contrôle positif, les trous déclarés (compteur d'enfreintes,
`restraint` omise, `rule_id` en clair), le chemin d'échec, et la capture (non noire, contenu
propre à cet écran, paire T/T+1 s, garde de prémisse sur la taille du canvas).

## ⛔ CE QU'ELLES NE COUVRENT PAS — huit angles morts, chacun avec ce qui le fermerait

| # | angle mort | pourquoi il reste ouvert | ce qui le fermerait |
|---|---|---|---|
| A1 | **L'occlusion réelle** | `B3S2` vérifie une CONVENTION (chaque contour est premier enfant), pas l'absence de recouvrement. Un frère postérieur opaque et plein cadre passerait. | le juge visuel, à deux résolutions |
| A2 | **Les couleurs rendues** | aucune garde ne lit un pixel de couleur. `comparer-code-maquette` compare des CONSTANTES, pas le rendu — et un mélange en espace linéaire peut décaler ce qu'on voit sans changer la valeur écrite. | le juge visuel |
| A3 | **Les espacements à l'écran** | les constantes sont vérifiées contre la maquette (42 concordances), leur EFFET ne l'est pas. Un `LayoutGroup` mal câblé rendrait des valeurs justes invisibles. | le juge visuel |
| A4 | **Le chrome** | les captures sont prises SANS shell (le monter ferait signer un compte partagé). L'écran n'a donc jamais été vu sous le bandeau et le dock. | une capture montée dans le shell, après l'override d'identité |
| A5 | **Les états `derive` / `gages` / `vide`** | les tests exercent l'état d'un compte frais (`indeterminate`, 0 règle). `drifting`, `hostile`, `wary` et la liste pleine ne sont atteints par AUCUN test — leur code existe et n'est jamais exécuté. | un scénario qui déclare 4 règles et provoque une violation, ou un seed |
| A6 | **`restraint` présente** | jamais exercée : aucune route ne liste les contreparties, donc `counterparty_id` n'est pas obtenable par un chemin joueur. La branche est du code mort côté test. | le lot back L5 (sélecteur des rappelés) |
| A7 | **Le portrait lui-même** | les gardes comptent des voyants et des textes ; personne ne vérifie que les cinq traits du portrait (buste incliné, col, revers, montre, gants) correspondent aux clés. | le juge visuel — c'est précisément ce qu'il sait faire |
| A8 | **La 2ᵉ et la 3ᵉ capture** (⚠️ sans conséquence observée : les 3 lignes `[CAPTURE b3]` sont bien sorties au run 17 — le risque est structurel, il ne s'est pas réalisé) | `B3C1` échoue au premier `Assert` : si 1080×1920 tombe, 1080×2400 et la paire T+1 s ne sont jamais produites. Une seule résolution garantie tant que la première n'est pas verte. | rendre les trois indépendantes (ou les asserter à la fin) |

## ⚠️ A3 s'est RÉALISÉ — deux fois, et c'est la même cause

Un angle mort déclaré n'est pas une précaution rhétorique : celui-là a mordu, deux fois, entre
l'écriture de ce tableau et la capture qu'on donne au juge.

1. **Première fois** — le conteneur `corps` n'avait aucun `LayoutGroup` : les cinq blocs se
   superposaient au centre. Des constantes d'espacement justes, un rendu faux.
2. **Seconde fois** — le `LayoutGroup` posé, les blocs à hauteur FIXE s'étiraient quand même,
   faute de `LayoutElement` : mesuré sur la capture du run 17, les compteurs faisaient plus du
   double de leur hauteur de maquette et le bloc portrait laissait un grand vide sous lui.
   Corrigé en lisant `H_FIXE` / `H_MIROIR` à la source du générateur (lignes 279-280) au lieu de
   les réinventer à l'œil.

**Aucune des 15 gardes n'a rougi dans les deux cas.** Elles vérifiaient que les éléments
existaient, dans le bon ordre, avec les bonnes valeurs — et c'était vrai les deux fois. Ce qui
était faux, c'est ce que ces valeurs PRODUISAIENT à l'écran, et cela ne se voit qu'en regardant
l'image. C'est l'argument le plus concret que j'aie pour dire qu'un juge visuel n'est pas une
formalité de fin de chantier.

⚠️ **Ce que le juge doit en conclure pour son propre travail** : les défauts de cette famille sont
ceux que j'ai le moins de moyens de voir seul. Qu'il regarde les hauteurs et les vides AVANT les
couleurs et les libellés — c'est là que cet écran a déjà menti deux fois.

## Ce que ces angles morts ont en commun

**Sept sur huit tombent dans le périmètre du juge visuel ou d'un lot back**, et c'est cohérent :
une suite de tests d'écran ferme les propriétés STRUCTURELLES (ce qui existe, dans quel ordre,
avec quelles valeurs) ; elle ne ferme pas les propriétés PERÇUES (ce qu'un œil lit). Les
confondre serait prétendre qu'un test remplace un juge.

⚠️ **A5 est le plus gênant et n'appartient à personne d'autre** : trois états de l'écran ont du
code jamais exécuté. Ce n'est pas le juge visuel qui le fermera — il juge ce qu'on lui montre, et
on ne lui montrera que l'état qu'on sait produire. C'est une dette de test, à écrire comme telle
plutôt qu'à laisser croire couverte par les 15 gardes vertes.

## Un chiffre pour ne pas se rassurer

15 gardes, toutes capables de rougir (audit fait, dénominateur = cas examinés, pas fichiers).
**Mais 8 angles morts déclarés en regard.** Le rapport n'est pas 15 contre 0 ; il est 15 contre 8,
et les 8 sont écrits ici pour que le prochain lecteur les cherche au lieu de les découvrir.
