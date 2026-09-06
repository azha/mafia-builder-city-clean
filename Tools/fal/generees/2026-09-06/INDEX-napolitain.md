# Sombre napolitain — tour d'essai (2026-09-06 soir)

Style **fermé par ruling user** (sombre, napolitain, mafieux) : ce n'est plus une variable comparée,
c'est la contrainte. Ère **1B** (fin 80 – début 90). Pays **indéterminé** — non posé, ne pas l'inventer.
Clé d'attribution : le **NOM**, jamais l'archétype ⇒ un emblème ne peut être que **personnel**.

## Les trois sujets, et ce que la mesure dit

`fal-ai/flux/dev`, graine **63**, 1024², postérisés aux 4 encres du canon sur l'aplat imposé.

| sujet | fond (L) | contraste | écart au fond à 26 px |
|---|---|---|---|
| chef de famille rivale | 33,3 | 6,54:1 | 31,2 % |
| lieutenant titulaire | 33,3 | 6,57:1 | 28,4 % |
| sa doublure | 27,8 | 7,58:1 | 31,1 % |

Le registre tient à 26 px, au niveau des meilleurs de la série précédente. **Deux défauts nommés :**
1. ⚠️ **L'emblème personnel du chef n'a pas été rendu** — le prompt demandait une canule de trachéotomie
   et une cicatrice à la gorge ; l'image n'en porte aucune trace. *Un emblème personnel se VÉRIFIE sur
   l'image, il ne se suppose pas depuis le prompt* — et c'est le seul dispositif d'identité sous la clé
   par nom, donc son contrôle est obligatoire, image par image, avant de peupler les 74.
2. ⚠️ **Fond à 33,3 sur deux des trois** au lieu de 27,8 (le jeton) : le détourage a laissé passer des
   pixels de fond d'origine. L'aplat n'est donc pas exactement uniforme sur ce lot — à resserrer.

## Titulaire ↔ doublure — trois traitements, à ARBITRER (aucun n'est tranché ici)

Contrainte : lisible à **26 px**, et **jamais par la couleur seule** (règle du canon).

| | écart au rendu titulaire, même visage (niveaux) 71 · 40 · 26 px | lecture |
|---|---|---|
| **A** cercle interrompu (cerclage en tirets) | 6,9 · 7,5 · 11,2 | les tirets se referment à petite taille : le plus faible |
| **B** deux encres au lieu de quatre | 15,8 · 15,9 · **15,6** | **stable à toutes les tailles** ; la doublure devient plate, le titulaire garde son laiton |
| **C** médaillon plus petit (0,74) | 45,3 · 43,9 · 47,8 | le plus gros chiffre — et il ment (voir ci-dessous) |

⚠️ **Le chiffre classe C premier pour une raison mécanique, pas perceptive** : réduire l'échelle déplace
TOUS les pixels, donc l'écart moyen explose sans qu'aucune information ne soit ajoutée. La comparaison
qui a un sens est **A contre B**, à géométrie identique. ⇒ **B est le seul candidat qui tienne à 26 px**,
et C entre en collision avec la hiérarchie de l'organigramme, où la taille dit déjà le rang.
**Proposition, non tranchée : B**, éventuellement B + C si la position dans l'arbre doit le redire.

## Trous d'écriture — ce qui manque, et ce que je propose (marqué comme tel)

**Les quatre chefs de famille rivale** ont un nom d'affichage ratifié (`La Coil · Tarcum · Gorge-de-Fer ·
Saltline`, `common/fiction-names.ts:245`, maquette de ㉙ vue par l'user) et **aucun visage ni caractère
écrits nulle part**. Ce sont pourtant les seuls personnages que TOUS les joueurs partagent : ils portent
le plus d'identité de tout le casting. Il manque, par chef : une ligne de caractère (ce qu'il veut, ce
qu'il ne pardonne pas), un emblème **personnel** non ambigu, et son rapport au port.
*PROPOSITION (à ratifier, rien n'est acté)* : `Gorge-de-Fer` — la canule et la voix perdue, il ne parle
qu'écrit ; `La Coil` — l'usurier, mains toujours gantées ; `Tarcum` — le vieux du bassin, casquette
jamais retirée ; `Saltline` — la main-d'œuvre, une brûlure de saumure au visage.

**Les trois avocats n'ont aucun nom** : la base sert des étiquettes de rang (« Boutique Counsel »,
« Public Defender ») **en anglais**. Le back traite la langue ; il reste à décider si un avocat est un
personnage nommé (donc un portrait par rang, avec un nom) ou une fonction anonyme (donc un portrait
générique par rang). *Cette question n'est pas à moi.*

## Budget si la direction passe

74 portraits (48 lieutenants + 18 dealers + 4 chefs + 3 avocats + le Don), ~0,025 $ pièce plus un
détourage chacun ⇒ **≈ 2 $**, une heure de machine. Rien n'est lancé sans arbitrage sur l'image.
