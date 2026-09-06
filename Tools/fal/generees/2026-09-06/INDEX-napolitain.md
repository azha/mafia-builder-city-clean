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

Chiffres corrigés après réparation de la sonde (voir ci-dessous) : fond **27,8 sur les trois**,
contraste 7,63 / 7,67 / 7,58:1, écart à 26 px **32,5 / 29,4 / 31,1 %**.

### Défaut 1 — l'emblème n'a pas été rendu, et il est maintenant GARDÉ

Le prompt du chef demandait une canule de trachéotomie et une cicatrice ; l'image n'en porte rien.
Sous la clé par nom, l'emblème personnel est le **seul** dispositif d'identité ⇒ un portrait sans son
emblème est un portrait **sans identité**, pas un portrait moins bon.

⛔ **La première sonde écrite pour ça était fausse et disait OUI.** Elle comparait l'image à un témoin
généré à la même graine, prompt privé de sa clause d'emblème, et concluait sur la divergence de la zone
de gorge : **22,56 ⇒ « EMBLÈME RENDU »** sur le cas même qui l'avait motivée. En recadrant les deux
gorges côte à côte : aucune canule ni cicatrice dans l'une ni dans l'autre — toute la divergence venait
de la **cravate**, passée de bordeaux à noire parce qu'on avait retiré treize mots. La sonde mesurait
« le prompt a changé l'image », pas « l'emblème est là ». *Aucune mesure de pixels ne sait dire « ceci
est une canule ».*

⇒ `verifier-embleme.py` v2 pose la question à un modèle de **vision** (`fal-ai/moondream2/visual-query`)
avec ses deux contrôles exécutés à chaque appel — positif : le masque à gaz du cuisinier doit rendre
*yes* ; négatif : le même objet, absent d'un autre portrait, doit rendre *no*. Exécuté sur le chef :
contrôles ✓ ✓, réponse **« no »**, code de sortie **1**. La garde attrape le défaut qui l'a motivée.

### Défaut 2 — il n'existait pas : c'était la sonde

J'ai lu « fond L 33,3 au lieu de 27,8 » sur deux portraits, conclu que le détourage laissait passer du
fond d'origine, et durci le seuil à 200 + érosion. **Le chiffre n'a pas bougé d'un dixième.** Cause
réelle, trouvée en imprimant les quatre coins : trois valent **exactement (22,28,43)** — le jeton — et
le quatrième vaut **(44,50,66)**, la deuxième encre : **l'épaule du sujet atteint ce coin**, et ma sonde
en faisait la moyenne avec le fond. L'aplat était juste depuis le début.
⇒ Durcissement **retiré** (il rognait le sujet, remplissage 0,56 → 0,55, pour un défaut inexistant) et
sonde corrigée : **médiane** des quatre coins au lieu de la moyenne — trois coins sur quatre suffisent
à dire le fond, la médiane les écoute. Les trois portraits rendent alors 27,8, le jeton exact.

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
