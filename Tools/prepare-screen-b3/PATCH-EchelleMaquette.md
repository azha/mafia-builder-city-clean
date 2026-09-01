# Patch à appliquer à `Assets/Scripts/ShellContracts/EchelleMaquette.cs`

À poser **en même temps** que les fichiers de `Tools/prepare-screen-b3/`, avant qu'ils compilent :
`ReputationScreenController` lit `EchelleMaquette.LargeurEcransBrennar6`. Si le patch n'est pas
appliqué, **ça ne compile pas** — et c'est voulu : mieux vaut une erreur de compilation qu'un
écran qui hérite en silence de la largeur d'une autre maquette.

## Ce qu'on ajoute, et pourquoi ce n'est pas cosmétique

`EchelleMaquette` existe pour rendre impossible qu'un écran devine son échelle. Il porte déjà :

    LargeurHudBrennar     = 392f   // hud-brennar.html
    LargeurEcransBrennar  = 300f   // ecrans-brennar.html
    LargeurPalettesEcrans = 252f   // palettes-ecrans.html

⚠️ **`ecrans-brennar-6.html` est un QUATRIÈME fichier, et il vaut aussi 300.** La tentation est
donc de réutiliser `LargeurEcransBrennar` — même valeur, ça marcherait aujourd'hui. C'est
exactement le défaut que ce fichier existe pour supprimer, et son propre en-tête le nomme : le
`300` trouvé en dur dans la fiche bâtiment *« n'était pas inventé, il était RECOPIÉ DE LA MAUVAISE
MAQUETTE. Un nombre juste, pour un autre écran. »* Deux fichiers distincts qui coïncident
aujourd'hui n'ont aucune raison de coïncider demain, et le jour où l'un bouge, rien ne rougit.

La valeur est **mesurée**, pas choisie : `ecrans-brennar-6.html:24` —
`.tel{position:relative;width:min(300px,88vw);aspect-ratio:9/17.5;…}` — et confirmée sur les six
PNG livrés par `Tools/mesure-geometrie-reputation.py` (échelle 3,000× exactement, 6/6 cadres à
±6 px CSS du corps déclaré, comptes de frontières non uniformes).

## Le diff

Après le bloc `LargeurEcransBrennar` (vers la ligne 50), insérer :

```csharp
        /// <summary>`ecrans-brennar-6.html` — `.tel{width:min(300px,88vw);aspect-ratio:9/17.5}`.
        /// La série 6 : ㊲ La réputation, et ses voisins de la même planche.
        ///
        /// ⚠️ Vaut le MÊME nombre que <see cref="LargeurEcransBrennar"/>, et c'est précisément
        /// pourquoi elle existe séparément : ce sont DEUX FICHIERS de maquette distincts. Les
        /// confondre marcherait aujourd'hui et casserait en silence le jour où l'un des deux
        /// change de largeur — le défaut que ce fichier entier existe pour rendre impossible
        /// (voir son en-tête : un `300` « recopié de la mauvaise maquette », juste pour un autre
        /// écran). Mesuré le 2026-08-30 sur la source ET sur les six PNG livrés
        /// (`Tools/mesure-geometrie-reputation.py` : échelle 3,000×, 6/6 cadres).</summary>
        public const float LargeurEcransBrennar6 = 300f;
```

## La garde qui va avec

`EchelleF1` (le test existant) rougit si `LargeurHudBrennar` cesse de coïncider avec la maquette.
Lui donner son pendant pour la v6 — **et l'écrire comme une garde de DIVERGENCE, pas d'égalité** :

```csharp
// Les deux maquettes valent 300 aujourd'hui. Cette garde n'asserte PAS qu'elles sont égales
// (ce serait figer une coïncidence) : elle asserte que CHACUNE vaut ce que SON fichier déclare.
// Le jour où ecrans-brennar-6.html passe à 320, ce test rougit et LargeurEcransBrennar reste
// juste — ce qui est exactement le comportement voulu.
Assert.AreEqual(300f, EchelleMaquette.LargeurEcransBrennar6, 0.001f,
    "ecrans-brennar-6.html:24 déclare width:min(300px,88vw) — relire le fichier, pas la constante voisine");
```

⚠️ Une garde qui asserterait `LargeurEcransBrennar == LargeurEcransBrennar6` serait **pire que
pas de garde** : elle certifierait la confusion qu'on cherche à empêcher, et elle rougirait le
jour où l'une des deux maquettes évolue légitimement — c'est-à-dire qu'elle ne pourrait être
satisfaite qu'en rétablissant le défaut.
