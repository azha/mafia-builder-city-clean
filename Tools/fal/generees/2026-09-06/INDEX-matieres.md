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

## La périodicité, mesurée (2ᵉ tour)

`mesurer-periodicite.py`, tuilage 5× sur 1080×2400, période 216 px :

| matière | amplitude basse fréquence (lignes · colonnes) | verdict |
|---|---|---|
| liège | 1,6 · 1,6 | répétition non lisible |
| table | 3,8 · 2,2 | répétition non lisible |
| **papier pelure** | 3,9 · **7,6** | **PÉRIODICITÉ VISIBLE** — ce sont les plis, en colonnes |

Contrôle négatif (grain pur, même chemin) : 1,0 · 0,9. Le chiffre confirme ce que l'œil du relecteur
avait vu sur la planche, et il désigne le coupable : les **plis verticaux** du papier, pas son grain.

⛔ **Deux versions fausses avant celle-là, toutes deux gardées en tête du script.**
(1) L'autocorrélation au pas de tuile rend **+0,910 · +0,909 · +0,909** — trois valeurs à un millième :
un champ construit en répétant une tuile est identique à lui-même décalé d'une période **par
construction**. L'instrument ne mesurait pas la périodicité perçue, il vérifiait que j'avais bien tuilé.
(2) Le contrôle négatif tiré directement à la taille de la tuile rendait **5,5** — au-dessus du liège
(1,6), donc un plancher plus haut que la matière qu'il devait borner : du bruit d'échantillonnage
(moyenner 216 pixels laisse ~128/√216), pas de la basse fréquence. **Un contrôle doit emprunter le même
chemin que le sujet** : tiré à la taille de la source puis réduit comme elle, il retombe à 1,0.

## Le papier est un PANNEAU, pas un fond — la maquette tranche

Question posée : un fond de papier clair plein écran inverserait la valeur de tout l'écran. Mesuré dans
`ecrans-brennar-6.html` (cadres 48-53, ㉚) : l'écran `.appr6` est **sombre** (dégradé, `color:#e7ecf3`,
en-tête `#1e1b16`) et le papier est la classe **`.bon`** — `background:#efe7d6`, `color:#2a2118`,
`border-radius:2px`, `box-shadow:0 3px 10px #00000055`. C'est le **bon de commande**, un panneau posé sur
l'écran sombre. ⇒ Pas d'arbitrage user à demander, et pas de tuilage plein écran : à la largeur d'un
panneau, la périodicité mesurée ci-dessus ne se pose pas.

## Reprise du liège

Bichromie vers `#6b5a3a` au lieu de `#8a611c` : contraste du pire carreau **6,72:1** (plancher 4,5),
raccord 3,6 · 4,0 pour un témoin de 3,6 — invisible.
3. **Aucune n'a été vue sous le chrome réel**, seulement sous un rendu de texte fait ici avec la police
   embarquée (DejaVu). La mesure sous chrome demande une capture, donc la porte Unity.

## Le « décor de scène » — ce n'est pas une matière à générer

Les juges le relèvent absent **4 écrans sur 4** et la doctrine v3.3 le prescrit (`front.md:308`). Mesuré :
la scène peinte **existe déjà** — `Assets/Art/District/Backgrounds/VERGE_D_{JOUR,NUIT}_FINAL.png`,
1080×1920, rendus Blender de l'atelier — et **un seul contrôleur la charge**
(`DistrictInteriorScreenController` via `DistrictBackgroundSlots`). Les sept écrans neufs vérifiés
(Conflit, Distribution, ChaîneDAppro, Carnet, Loi, Démolition, Délégation) en comptent **zéro**.
⇒ **C'est un trou de CÂBLAGE, pas un manque d'asset.** Générer une neuvième matière ne le fermerait pas.

**Chiffrage demandé — ce que l'atelier a déjà rendu, et ce qui manquerait :**

| scène | rendus | dimensions | utilisable en portrait ? |
|---|---|---|---|
| District-D | jour + nuit | 1080×1920 | oui — **c'est le seul importé**, sous le nom `VERGE_D_*` (md5 identique à `DISTRICT_D_*`) |
| District-ZO | jour + nuit | 1080×1920 | oui, jamais importé |
| Docks · Verge · Verge3 | jour + nuit chacune | **1728×1080** (paysage) | non — à re-rendre en portrait |

⚠️ **Aucun rendu n'est à 1080×2400**, la seconde résolution de travail citée par `AppShell.cs:1082`.
Les deux scènes portrait couvrent 1920 et laisseraient 480 px à combler à 2400.
⇒ Le lot « décor » se chiffre donc en **câblage d'un emplacement partagé** (7 écrans à zéro) + **import
de 2 rendus déjà faits** + **re-rendu de 3 scènes** pour le format haut. ⚠️ Je n'ai **pas** identifié le
script d'atelier qui produit les `*_FINAL` : deux fichiers les citent (`export_ancres_depuis_blend.py`,
`parcelles.py`) sans les rendre — à demander à la session Blender plutôt qu'à déduire.

## Reproductibilité

`fal-ai/flux/dev`, graine **7**, 1024², ~0,025 $ pièce. Prompts archivés à côté de chaque image.
Outils : `matiere.py` (bichromie + raccord imposé + mesure de couture avec témoin + pire carreau vs encre).
