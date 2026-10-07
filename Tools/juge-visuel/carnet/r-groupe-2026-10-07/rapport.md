# Juge visuel ⊥ — ㉞ Les ordres du soir (`carnet`) — r-groupe — 2026-10-07

## Verdict : **NON APPROUVÉ**

La page crème est là et c'est l'essentiel ; mais **elle n'est pas réglée**, les **pastilles de
rang** ont disparu, et il n'y a **ni bandeau de titre ni bande basse** — donc **aucun geste**.

Classement demandé (ruling user du 07/10) : **A** = le joueur le perçoit nettement · **B** = forme
visible mais secondaire · **C** = pixel/nuance (listé, sans peser sur le verdict).

---

## Écart ASSUMÉ, non classé

Le décor de scène est un lot en cours : le fond en aplat est **connu** et n'est pas compté.
*Une précision qui vaudra au moment de poser ce décor* : le canon de ㉞ n'est pas « sombre », il est
**chaud** — `.carn6 { background: linear-gradient(180deg,#1e1c19,#181614 58%,#131211) }`, mesuré
`#1f1c17` en haut et `#171513` en bas de la référence, contre `#0d0d0d` uniforme en jeu. Ce n'est
pas une nuance : c'est la couleur du bureau sur lequel le carnet est posé.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence (cadre 85) | jeu | écart |
|---|---|---|---|---|
| 1 | la page du carnet existe, crème, pleine largeur utile | `#efe7d6` | `#e5e0d0` | 10/255 |
| 2 | titre « Carnet du soir » en tête de page, sérif, aligné à gauche | oui | oui | — |
| 3 | famille de police du titre d'écran | DejaVu Serif | sérif | — |
| 4 | couleur du titre d'écran | `#f0dfc4` | `#eae0c8` | **6/255** |
| 5 | 8 rangs numérotés 1→8, un par ligne | oui | oui | — |
| 6 | libellé des rangs vides | « — rien — » | « — rien — » | **identique** |
| 7 | or de la valeur ARGENT (bandeau haut) | `#f2c96b` | `#f2c96a` | 1/255 |
| 8 | ordre de lecture (titre → sous-titre → page → bas) | identique | identique | — |
| 9 | gouttière latérale de la page | 13 px CSS | 46 px (= 12,8 px CSS) | 0,8 px |
| 10 | luminance moyenne du contenu | 122,1 | 137,5 | +13 % |
| 11 | les rangs vides sont en gris/italique, plus pâles que les rangs pleins | oui | oui | — |

`fc-match` : `DejaVu Serif → DejaVuSerif.ttf`, `DejaVu Sans → DejaVuSans.ttf` — **aucune
substitution** sur la machine de rendu.

---

## 0. L'écran, tel que la maquette le dit

**But** : poser entre quatre et huit ordres pour la soirée, dans l'ordre où ils partiront, puis
**lancer la soirée** — un geste sans retour.

**Ordre de lecture** : (1) le **bandeau de titre**, plaque chaude pleine largeur fermée par un filet
(« Les ordres de ce soir » + la règle du jeu en une ligne) ; (2) la **page de carnet**, papier crème
**réglé**, qui occupe tout le corps — en tête « Carnet du soir » et, à droite, « 5 ordres sur 8 » ;
(3) les **huit rangs**, chacun ouvert par une **pastille ronde** (disque sombre quand l'ordre est
posé, disque beige quand il est vide) ; (4) la **bande basse**, plaque bleu nuit à filet haut de
2 px, où le lieutenant parle et où se tient le **geste doré** « LANCER LA SOIRÉE » avec sa mise en
garde à droite.

**Traits d'identité** : le **papier réglé** (c'est un carnet, pas une plaque) ; les **pastilles de
rang** ; le contraste chaud/froid entre le bureau sépia et la bande bleue du bas ; le geste doré en
pied.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le joueur reconnaît l'objet : un grand papier crème au milieu d'un écran sombre, huit lignes
numérotées, « — rien — » partout sur un compte neuf. Le but passe, l'ordre de lecture passe.

Ce qui ne passe pas tient en trois choses. **Le papier n'est pas réglé** : la référence porte un
trait tous les 93-94 px (3 traits sur 300 px balayés), le jeu en porte **zéro**. Un carnet
d'ordres devient un rectangle vide — c'est le trait d'identité le plus fort de l'écran, et c'est
celui qui manque. **Les pastilles de rang ont disparu** : au canon, chaque rang s'ouvre sur un
disque de 15 px CSS (sombre s'il est pris, beige s'il est libre) ; en jeu le numéro est du texte
nu posé sur le papier, et la lecture « places prises / places libres » ne se fait plus d'un coup
d'œil. **Enfin, l'écran n'a pas de pied** : la bande basse (`#141a21`, filet haut de 2 px) et le
geste doré « LANCER LA SOIRÉE » sont absents de la planche — or les **7 cadres** de ㉞ portent cette
bande, et 6 sur 7 portent le geste. Le même jeu dessine cette bande et ce geste correctement sur
㉚ et ㉛ : le dispositif existe, il n'est pas posé ici.

S'y ajoute la disparition du **bandeau de titre** (plaque `#1f1c17` pleine largeur + filet bas) :
le titre flotte sur le fond.

**Les 3 écarts de tête** : A1 le papier n'est pas réglé · A2 pas de pastilles de rang · A4 pas de
bande basse ni de geste.

---

## 3. Écarts

| # | partie | classe | réf | jeu | mesure | script |
|---|---|---|---|---|---|---|
| **A1** | réglure de la page (`.cn-page`, `repeating-linear-gradient` 25/26 px) | **A** | **3 traits** sur la colonne vide `x 700-1000`, `y 1150-1450`, **pas de 93 et 94 px** | **0 trait** sur la même colonne, `y 1200-1700` | 3 → 0 | `m02_carnet.py` |
| **A2** | pastille de rang (`.cn-slot .no`) | **A** | disque 15 px CSS : `#2a2118` (rang pris) / `#cbbfa4` (rang vide) | rien : couleur du papier au centre du rang (`#e5e0d0`), numéro en texte nu | 8 pastilles sur 8 absentes | `m02_carnet.py` |
| **A3** | bandeau de titre (`.cn-tete`) | **A** | plaque `#1f1c17` pleine largeur de `y 437` à `y 613` + filet bas `#3b352c` | `#0d0d0d` **uniforme** de `y 200` à `y 390` — aucune plaque, aucun filet | ~176 px de plaque → 0 | `m02_carnet.py` |
| **A4** | bande basse (`.cn-bas`) + geste (`.cn-geste`) | **A** | plaque `#141a21` + filet haut 2 px `#2c3640` ; voix du lieutenant ; geste encadré `#5a4a2a`/`#241c11`, texte or `#d9ab4e`, mise en garde à droite | zone mesurée `#16161c` (le pavé « ce qu'on sait pour l'instant »), **aucun geste nulle part sur les 4 planches** | bande + geste absents ; présents dans **7/7** et **6/7** des cadres du canon | `m02_carnet.py` |
| **B1** | compteur de l'en-tête de page (`.cn-page h4 span`) | **B** | « 5 ORDRES SUR 8 », aligné à droite, capitales lettrées `#6e6656` | rien à droite de « Carnet du soir » | 1 élément absent | lecture de la planche 2400 |

### C — listés, non traités (ruling du 07/10)

- papier : `#efe7d6` → `#e5e0d0` (Δ 10/255, légèrement plus gris) ;
- hauteur de capitale du titre d'écran : 33 px → 45 px (**+36 %**) — voir l'arbitrage ci-dessous ;
- couleur du titre d'écran : `#f0dfc4` → `#eae0c8` (Δ 6/255, dans la tolérance).

### ARBITRAGE (hors du client, pour l'user)

**L'échelle typographique des titres d'écran est systématiquement ~+35 % en jeu** sur les cinq
écrans de ce groupe (33 px → 45 px ici). Si c'est un choix délibéré de lisibilité sur téléphone,
c'est un arbitrage à acter une fois pour toutes et les maquettes ne le portent pas ; sinon c'est un
écart à reprendre partout en même temps. Je ne le classe pas en défaut.

---

## 5. Autres résolutions

- **1080×2400** (haut de liste) : les 8 rangs tiennent dans la page, rien n'est coupé, rien ne
  déborde. La page crème descend jusqu'à `y ≈ 1800` puis laisse place au pavé sombre « ce qu'on
  sait pour l'instant ». Les écarts A1/A2/A3 s'y vérifient à l'identique.
- **1080×1920 (haut et bas)** : la page déborde et défile ; la planche basse montre les rangs 3 à 8
  puis un texte d'aide, et le pavé « ce qui s'ouvrira plus tard ». **Le titre « Carnet du soir » et
  le compteur de page sortent du cadre en défilant** — c'est un effet du défilement, je ne le
  classe pas, mais il faut le lire avec A3 : rien, en haut, ne reste pour nommer l'écran.
- Proportions conservées aux deux résolutions (gouttière 46 px dans les deux cas).

---

## 6. Ce que je n'ai pas pu vérifier

1. **Le rendu du geste à zéro ordre.** Aucun cadre de ㉞ ne montre un carnet **vide** : je constate
   que la bande basse et le geste sont absents, je ne peux pas dire si le canon voudrait ici le
   geste **éteint** (`.cn-geste.mort` existe) plutôt qu'un geste actif. *Mesure qui trancherait :
   un cadre « carnet vide » dans la maquette, ou l'arbitrage de l'user.*
2. **La voix du lieutenant** (`.cn-dit`, « Lt. Rin : … ») : absente avec la bande. Je ne peux pas
   distinguer « le client ne la dessine pas » de « le back ne la sert pas » — pour ㉛ cette donnée
   est explicitement déclarée non servie. *Mesure qui trancherait : le `juge-donnees`.*
3. **Le texte d'aide posé sur le papier** (« Il faut au moins quatre ordres pour une soirée. / Vous
   pouvez déjà poser / Faire l'entretien — 4 cibles », planche basse 1920) n'a **aucune
   contrepartie** dans les 7 cadres : le canon loge ce genre de phrase soit dans un pavé rouge
   (`.cn-refus`), soit dans un bloc à filet gauche de la bande basse (`.cn-rien`). Faute de témoin,
   je ne le classe pas.
4. **Le compteur de page à zéro** : « 0 ORDRES SUR 8 » serait peut-être volontairement masqué.
   Classé B, pas A, pour cette raison.
5. **Les animations** : une planche est figée ; la source de ㉞ ne déclare pas de `@keyframes` sur
   `.carn6`, donc rien à départager ici.
6. **La face exacte du sérif en jeu** : je lis « un sérif », je ne peux pas nommer la fonte depuis
   une image.

---

## Annexes

1. **Références rendues** depuis `~/project/atelier3d-mafia` (master `d84c6eb`),
   `ecrans-brennar-6.html`, `Tools/rendre-tel.py … 3.6` → 1080×2102, **index apparié à son étiquette
   avant rendu** : `ref/cadre-85.png` … `cadre-91.png` ; étiquettes dans `ref/ETIQUETTES.txt`
   (85 = « Les ordres de ce soir », le nominal).
2. **Planches jugées** : `Tools/juge-visuel/planches-par-ecran-2026-10-07/E02_Carnet_1080x2400.png`,
   `…_1080x1920.png`, `…_bas_1080x1920.png`, `…_bas_1080x2400.png`.
3. **Correspondance des repères** : les deux images font **1080 px de large** ; le téléphone de la
   maquette fait 300 px CSS rendus à ×3,6 ⇒ 1 px de référence = 1 px de planche **en largeur**
   (vérifié : gouttière canonique 46,8 px ↔ 46 px mesurés). Les hauteurs diffèrent (2102 / 1920 /
   2400) : aucune distance verticale n'est comparée en px bruts — seuls un **pas de réglure**, des
   épaisseurs et des hauteurs de capitale le sont.
4. **Scripts** : `mesures/outils.py` · `m02_carnet.py` (fond, papier, réglure, pastilles, bande
   basse — chaque mesure imprime la taille des images lues) · `m00_controles.py`, `m06_titres.py`,
   `m07_palettes.py` (communs aux 5 écrans).
