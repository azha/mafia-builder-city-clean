# Juge visuel ⊥ — ㉛ La loi / Le parloir (`ecran_loi`) — r-groupe — 2026-10-07

## Verdict : **NON APPROUVÉ**

Le pied de l'écran est excellent — bande, geste doré et note sont justes à 1 ou 4/255 près. Mais
les **trois cartes d'avocat ont perdu leur état** (plus de bord vert, plus de bord doré, plus de
pastille encadrée), le **titre est en sans-serif** et l'écran n'a pas de **bandeau de titre** —
titre qui, de surcroît, **défile sous le chrome** et y laisse un fragment de glyphe.

Classement demandé (ruling user du 07/10) : **A** = le joueur le perçoit nettement · **B** = forme
visible mais secondaire · **C** = pixel/nuance.

---

## Écarts ASSUMÉS, non classés

1. Le décor de scène est un lot en cours : le fond en aplat `#0d0d0d` est **connu**.
2. **La voix du lieutenant** (`.pl-dit`, « Lt. Rin : … ») est **volontairement absente** (donnée à
   servir). Vérifié « rendu proprement » : la bande basse ne laisse ni trou béant ni libellé de
   repli — le geste remonte simplement contre le filet haut. Rien à signaler.
3. Le compte neuf est **sans avocat** et **sans affaire**, et la maquette n'a **aucun cadre
   « parloir vide »** : la vitre du prévenu (`.pl-vitre`), le compte à rebours de jours et la liste
   « ce qu'il sait » ne sont donc **pas comparables** et ne sont pas comptés comme absents.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence (cadre 68) | jeu (1080×1920) | écart |
|---|---|---|---|---|
| 1 | bande basse (`.pl-bas`) — fond | `#141a21` | `#161c22` | **2/255** |
| 2 | geste (`.pl-geste`) — bord | `#5a4a2a` (mesuré `x 50-52` de la réf) | `#5a492a` | **1/255** |
| 3 | geste — fond | `#241c11` | `#221c0d` | **4/255** |
| 4 | geste — texte | `#d9ab4e` | `#d9ab4d` | **1/255** |
| 5 | note de droite du geste | « le commis d'office fait ce qu'il peut » | **même texte, même place** | 0 |
| 6 | étiquette « À VOS RISQUES » — couleur | `#d9ab4e` | `#d9ab4d` | **1/255** |
| 7 | couleur du titre d'écran | canon `#eef3f9` | `#eef1f2` | **7/255** |
| 8 | or de la valeur ARGENT (bandeau haut) | `#f2c96b` | `#f2c96a` | 1/255 |
| 9 | fond de carte neutre (`.pl-choix`) | `#1e242b` | `#222a2e` | 6/255 |
| 10 | luminance moyenne du contenu | 33,8 | 31,2 | −7,7 % |
| 11 | ordre des trois options | commis d'office / un cabinet / la filière | **identique** | — |
| 12 | textes des options et de leur sous-ligne | « gratuit — il fait ce qu'il peut », « ça coûte — il connaît les juges », « ça coûte cher — et ça peut se retourner » | **identiques** | — |
| 13 | ordre de lecture (titre → intertitre → 3 cartes → avertissement → pied) | identique | identique | — |

`fc-match` sur la machine de rendu : `DejaVu Serif → DejaVuSerif.ttf`, `DejaVu Sans →
DejaVuSans.ttf`. **Aucune substitution** ⇒ l'écart de famille relevé en A1 est un vrai écart.

---

## 0. L'écran, tel que la maquette le dit

**But** : quand la police tient quelqu'un à vous, décider **qui le défend** — et savoir ce que
chaque choix coûte.

**Ordre de lecture** : (1) le **bandeau de titre**, plaque `#1a1f26` pleine largeur fermée par un
filet, titre **sérif** ; (2) l'intertitre sourd « QUI PEUT LE DÉFENDRE » ; (3) les **trois cartes
d'option**, et c'est là que tout se joue : chacune est **encadrée**, et son cadre dit son état —
**vert** `#4f7f3f` sur fond vert sombre `#22301f` pour celle qui est **en place**, neutre
`#303a44` pour celle qui est disponible, **doré** `#8a6a22` sur brun `#2e2114` pour celle qui est
risquée ; chacune porte à droite une **pastille encadrée** (bord 1 px de la couleur du texte) ;
(4) l'avertissement sur la filière, dans un bloc à **filet gauche** ; (5) la **bande basse** bleu
nuit à filet haut de 2 px, la voix du lieutenant, puis le **geste doré** avec sa note.

**Traits d'identité** : les **trois cartes dont le cadre porte l'état** ; les **pastilles
encadrées** ; la bande basse froide et son geste doré ; la vitre rayée du prévenu quand il y en a un.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le pied est le meilleur des cinq écrans du lot : bande, filet, geste doré, note de droite — tout y
est, à 1 ou 4/255 près. L'ordre de lecture et les textes des options sont identiques mot pour mot.

Mais le cœur de l'écran a perdu son information. Au canon, **le cadre de chaque carte dit l'état** :
on voit d'un coup d'œil laquelle est en place (vert), laquelle est disponible (neutre), laquelle est
risquée (or). En jeu, **les trois cartes sont rigoureusement la même plaque** `#222a2e`, **sans
aucun bord** — j'ai traversé leur bord gauche au pixel : la couleur du bord est celle du fond. Et
les **pastilles d'état sont devenues du texte nu** : la référence rend un pavé encadré de 240 × 93 px,
le jeu une étiquette de 143 × 21 px sans cadre. Il reste la couleur du libellé pour porter l'état,
seule, et elle change de famille (le vert `#7fc99a` devient un turquoise `#42e0c0`). L'écran passe
d'un tableau de choix à une liste de trois lignes qui se ressemblent.

Deux autres choses, moins graves. Le **titre** est en sans-serif à 45 px de capitale au lieu du
sérif à 33, et il n'a **pas de bandeau** — il flotte sur le fond. Et il **défile** : sur la planche
du bas, il a disparu sous le chrome en n'y laissant qu'un **fragment de glyphe blanc de 11 × 5 px**,
seul au milieu d'une bande noire. Au canon, `.pl-tete` est `flex:none` — le bandeau ne bouge jamais.

**Les 3 écarts de tête** : A2 les cartes perdent leur bord d'état · A3 les pastilles ne sont plus
encadrées · A1 le titre en sans-serif sans bandeau.

---

## 3. Écarts

| # | partie | classe | réf | jeu | mesure | script |
|---|---|---|---|---|---|---|
| **A2** | cartes d'option (`.pl-choix.pris` / `.risque` / neutre) | **A** | « commis d'office » : fond `#22301f`, **bord `#4f7f3f`** ; « la filière » : fond `#2e2114`, **bord `#8a6a22`** ; neutre : bord `#303a44` | les trois : fond `#222a2e`, **bord = fond** (`#222a2e` à la traversée du bord gauche) | 3 fonds d'état → 1 seul ; **3 bords sur 3 absents** | `m05_loi.py` |
| **A3** | pastille d'état (`.pl-choix .tag`, `border:1px solid currentColor`) | **A** | pavé **encadré**, encre mesurée 240 × 93 px | **texte nu**, encre 143 × 21 px | cadre → 0 | `m05_loi.py` |
| **A1** | titre d'écran (`.pl-tete h3`) | **A** | **DejaVu Serif**, capitale **33 px** | **sans-serif**, capitale **45 px** (+36 %) | famille + corps (la couleur, elle, est juste : Δ 7/255) | `m05_loi.py`, `m06_titres.py`, `mesures/titres_jeu.png` |
| **A4** | bandeau de titre (`.pl-tete`) | **A** | plaque `#1a1f26` pleine largeur + filet bas `#333c46` | `#0d0d0d` uniforme de `y 250` à `y 470` | plaque + filet → 0 | `m05_loi.py` |
| **B1** | ancrage du titre | **B** | `.pl-tete` est `flex:none` : le bandeau **ne défile pas** | le titre défile et se fait couper par le chrome ; il en reste un **fragment blanc de 11 × 5 px** en `(164, 231)-(174, 235)`, 55 px d'encre — **présent sur la planche défilée, absent sur la non défilée** | 1 artefact | `m05_loi.py`, `mesures/loi_fragment.png` |
| **B2** | couleur de « EN PLACE » | **B** | **vert** `#7fc99a` (7,10:1 sur son fond) | **turquoise** `#42e0c0` (8,80:1) | changement de **famille** de teinte (Δ 61 sur le rouge, 38 sur le bleu) | `m05_loi.py` |
| **B3** | avertissement sur la filière (`.pl-rien`-like) | **B** | bloc à **filet gauche**, « filière » en gras | texte courant, sans filet, sans gras | 1 dispositif absent | lecture des planches |

### C — listés, non traités (ruling du 07/10)

- « DISPONIBLE » : `#8d99a6` → `#b8c2cc` (Δ 43/255, plus clair) ;
- fond de carte neutre : `#1e242b` → `#222a2e` (Δ 6/255, dans la tolérance) ;
- bande basse : `#141a21` → `#161c22` (Δ 2/255) ;
- l'échelle typographique des titres (+36 % ici, ~+35 % systématique sur les 5 écrans) — voir
  l'**arbitrage** consigné dans le rapport de ㉞.

---

## 5. Autres résolutions

- **1080×1920** : le contenu déborde et défile (ascenseur doré visible à droite). En haut de liste,
  le texte sous « AFFAIRES EN COURS » est coupé par la bande basse ; la planche du bas montre que
  tout est atteignable. Rien ne sort du cadre. **C'est à cette résolution seulement qu'apparaît
  l'artefact B1.**
- **1080×2400** : la planche « bas » est **bit-à-bit identique** à la planche haute
  (`md5 ffc15c00253786af29e2a9f9bb59a4a9` pour les deux) ⇒ à cette hauteur **le contenu ne déborde
  pas**, le défilement n'a rien changé. Rien n'est coupé ; A2/A3/A4 s'y vérifient à l'identique ;
  B1 **n'apparaît pas** (rien ne défile).
- Gouttières conservées aux deux résolutions.

---

## 6. Ce que je n'ai pas pu vérifier

1. **L'écran nominal (cadre 67, « Ils ont arrêté quelqu'un à vous »)** : la vitre rayée du prévenu,
   son médaillon, le compte à rebours « 9 jours avant le jugement » et la liste « ce qu'il sait —
   et ce qui est déjà sorti » **n'existent pas** sur un compte neuf, et aucun cadre ne montre le
   parloir vide. *Ce qui trancherait : une planche prise sur un compte ayant une affaire en cours.*
2. **La voix du lieutenant** : déclarée absente par construction (donnée à servir) — je confirme
   seulement que son absence ne casse rien dans la bande basse.
3. **L'état « pris » d'une autre carte** : seule « commis d'office » est en place ici ; je ne peux
   pas vérifier que le fond vert reviendrait sur « un cabinet » si on le prenait.
4. **Le fragment de glyphe (B1)** : je mesure sa présence et sa taille ; je ne peux pas dire depuis
   l'image s'il vient d'un masque mal posé ou d'un titre simplement placé dans la zone défilante.
   *Ce qui trancherait : une planche prise à mi-défilement.*
5. **La face exacte du sans-serif du titre** : je lis « un sans-serif », je ne peux pas nommer la
   fonte depuis une image.
6. **Les animations** : la source de ㉛ ne déclare pas de `@keyframes` sur `.parl6`.

---

## Annexes

1. **Références rendues** depuis `~/project/atelier3d-mafia` (master `d84c6eb`),
   `ecrans-brennar-6.html`, `Tools/rendre-tel.py … 3.6` → 1080×2102, **index apparié à son
   étiquette avant rendu** : `ref/cadre-67.png` … `cadre-72.png` ; étiquettes dans
   `ref/ETIQUETTES.txt`. **Témoin principal : le cadre 68** (« Lui trouver un avocat »), le seul qui
   montre les trois cartes d'option ; le cadre 67 est le nominal mais montre un prévenu, que le
   compte neuf n'a pas.
2. **Planches jugées** : `Tools/juge-visuel/planches-par-ecran-2026-10-07/E05_Loi_1080x1920.png`,
   `…_bas_1080x1920.png`, `…_1080x2400.png`, `…_bas_1080x2400.png`.
3. **Correspondance des repères** : les deux images font **1080 px de large** ; le téléphone de la
   maquette fait 300 px CSS rendus à ×3,6 ⇒ 1 px de référence = 1 px de planche **en largeur**.
   Les hauteurs diffèrent : aucune distance verticale n'est comparée en px bruts — seules des
   épaisseurs, des bbox d'encre et des hauteurs de capitale le sont.
4. **Scripts** : `mesures/outils.py` · `m05_loi.py` (cartes, bords, pastilles, bande basse, geste,
   bandeau, fragment de titre — chaque mesure imprime la taille des images lues) ·
   `m00_controles.py`, `m06_titres.py`, `m07_palettes.py` (communs aux 5 écrans) ·
   `mesures/loi_fragment.png` (le fragment, agrandi ×2), `mesures/titres_jeu.png` (les 5 titres).
