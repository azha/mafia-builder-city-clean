# ㉟ « La vente » — planche prise sur un arbre COMPOSITE, 2026-09-07

## ⛔ De quoi cet arbre est fait — une capture d'arbre fabriqué doit le dire

```
source  origin/pilote-F @ a4b2afa6896cf844090f77edfbf2923c5ddb2e21   pour CES chemins :
          Assets/Scripts/Operational/Selling/SellingScreenController.cs
          Assets/Scripts/ShellContracts/EtatsVidesIllustres.cs   (+ .meta)
          Assets/Scripts/ShellContracts/FamilleDIcones.cs        (+ .meta)
          Assets/Art/EtatsVides/Resources/EtatsVides/vide-vente.png (+ .meta)
reste   correcteur/ecrans @ 230fbe6ebe1b4029460a672f1a14df8aa5e4d9d8
back    image du conteneur construite le 2026-09-07T04:04:54Z (886 messages i18n servis)
identité régime MAFIA_CAPTURE_* — demo_capture@example.test, garde EXPECT_PLAYER posée
run     MAFIA_CI_CATEGORIES=PhotoPlanche · declares=1 comptes=1 · passed=1 failed=0
```

⚠️ **L'arbre a été restauré immédiatement après** : `git status` vide, typecheck 17/17.
**Cette planche n'est reproductible depuis AUCUNE branche seule.** C'est pour ça qu'elle vit ici,
sous un nom qui le dit, et non dans `Assets/Screenshots/`.

## ⛔ POURQUOI CET ARBRE COMPOSITE A ÉTÉ NÉCESSAIRE

Une première capture, prise depuis `correcteur/ecrans` seul, montrait **pas de cerne, pas de
sous-titre, pas de compteurs, et deux valeurs d'énumération en anglais** — c'est-à-dire
**exactement les quatre défauts que l'auteur venait de fermer**.
```
SellingScreenController.cs   correcteur/ecrans  18 845 octets   0 des six marqueurs
                             origin/pilote-F    30 909 octets   1 · 1 · 1 · 1 · 3 · 2
```
⇒ ***Un arbre en retard produit une planche qui accuse le travail qu'il ne contient pas.***
⇒ **Règle : une campagne photographie le CONTENEUR côté back et l'ARBRE DE TRAVAIL côté client.
Ni l'un ni l'autre n'est « le dépôt ».** Une commande de capture doit nommer sa BRANCHE autant que
sa catégorie.

## ⛔ LE PÉRIMÈTRE S'EST ÉTENDU D'UN FICHIER, ET C'EST LE COMPILATEUR QUI L'A NOMMÉ

Le premier checkout (3 fichiers) **ne compilait pas** :
`EtatsVidesIllustres.cs(28,33): CS0246: 'FamilleDIcones' could not be found`.
⇒ `FamilleDIcones.cs` (3 352 octets) n'emploie que `System.Collections.Generic` et `UnityEngine` :
**sa fermeture transitive est vide**. Ajouté ⇒ **17/17, EXIT=0**.
⚠️ *Ce n'est pas « compléter au jugé » : le compilateur a nommé la dépendance et sa clôture a été
mesurée avant de l'ajouter. Si elle avait ouvert un second maillon, je m'arrêtais.*

## ✅ CE QUE LA PLANCHE FERME — deux des trois critères de l'auteur

| # | critère | verdict |
|---|---|---|
| 2 | l'enseigne + son sous-titre **verbatim** | ✅ « LES POINTS DE VENTE » · « qui vend, et ce qu'il y a dans la caisse » |
| 3 | trois compteurs sur une ligne | ✅ `01/1 au travail · 00 caisses pleines · 00 grillés` |
| — | B3, les énumérations en français | ✅ « MOYENNE » · « AU TARIF » |
| — | M1, le pointillé du bouton | ✅ le cadre de RAMASSER est un vrai pointillé régulier |

⚠️ Sur les deux `00` : l'auteur écrit « si vous lisez `0`, c'est un défaut ». **Ici ce sont de
VRAIS zéros** — un point de vente visible, zéro caisse pleine, zéro grillé — dérivés de lignes
visibles, pas d'une donnée manquante. **Non retenu comme finding.**

## ⛔ B1 N'EST PAS FERMÉ — LE CERNE EXISTE, IL EST AU MAUVAIS RECT

L'auteur pose le critère lui-même : *« un filet or à 5 px des quatre côtés ; s'il n'y a pas de
filet, B1 n'est pas fermé, quoi que dise le reste »*.

```
or sur le bord GAUCHE  (x=5)      0 px sur 667 échantillonnés
or sur le bord DROIT   (x=1074)   0 px sur 667
or sur le bord HAUT    (y=5)      0 px sur 357
or sur le bord BAS     (y=2394)   0 px sur 357
```
⇒ **L'or ne vit qu'en BANDES HORIZONTALES** : le filet du chrome (y 118-123), les glyphes de
l'enseigne, et **une « pilule » dorée de 1 010 × 20 px entre l'enseigne et les compteurs**, à
35 px des bords gauche et droit.

⇒ ★★ **LA CAUSE EST STRUCTURELLE ET NOMMABLE — le sprite tourne, son rect est faux.**
```csharp
VerticalLayoutGroup v = gameObject.AddComponent<VerticalLayoutGroup>();
v.childControlWidth = true;  v.childControlHeight = true;   ⇐ le groupe PILOTE ses enfants
...
GameObject cerne = NewUI("Cerne", transform);                ⇐ enfant du MÊME gameObject
cerneRt.anchorMin = Vector2.zero; cerneRt.anchorMax = Vector2.one;   ⇐ écrasé par le groupe
```
⇒ **Un recouvrement plein écran ne peut pas être enfant d'un groupe de layout** : le groupe
réécrit ancres et offsets, et le cerne devient une RANGÉE de la pile — d'où la pilule.
⇒ **Le remède connu est d'une ligne** : `cerne.AddComponent<LayoutElement>().ignoreLayout = true;`
(ou sortir le cerne du groupe). Mesuré : `ignoreLayout` apparaît **0 fois** dans ce fichier.
⇒ **Instance UNIQUE** : `NewUI("Cerne"` ne se trouve dans aucun autre fichier de `pilote-F`.

⚠️ **Je ne corrige pas** : le fichier appartient à son auteur, mon arbre était temporaire, et
*toucher un fichier pour une raison ne donne pas le droit d'y corriger autre chose*. La mesure et
la cause sont ici ; le geste lui revient.
