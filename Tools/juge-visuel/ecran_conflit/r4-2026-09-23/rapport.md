# Juge visuel ⊥ — ㉙ Le conflit — r4 — 2026-09-23

## Verdict : NON APPROUVÉ

La fonction, le scroll et l'essentiel de la géométrie sont solides, mais le chrome supérieur comporte une bande brune absente de la maquette et les métadonnées répétées des quatre familles sont 2,03× à 3,73× plus lumineuses : ces écarts sont visibles au premier regard et valent trois **MAJEURS**.

## Contrôle positif — ce que l'instrument trouve ÉGAL

Tolérances appliquées : position/taille ≤ 2 px **ou** ≤ 1,5 % du parent ; aplat ≤ 6/255 par canal ; capitale ≤ 1 px ou ≤ 5 % ; espacement ≤ 10 %.

1. Largeur native : référence 1080 px, jeu 1080 px (`inspect_images.py`).
2. Aplat ivoire de la fiche : `(242,236,224)` dans les deux images (`measure_layout.py`).
3. Hauteur intérieure de la fiche ivoire : 326 px dans les deux images (`measure_layout.py`).
4. Largeur intérieure de cette fiche : 980 px réf / 988 px jeu, soit +8 px = +0,82 %, dans la tolérance (`measure_layout.py`).
5. Encre du titre : `(240,223,196)` dans les deux images (`measure_text_and_contrast.py`).
6. Hauteur d'encre du titre : 41 px réf / 40 px jeu, delta −1 px (`measure_text_and_contrast.py`).
7. Encre de la réplique : `(205,214,224)` dans les deux images (`measure_text_and_contrast.py`).
8. Première ligne de la réplique : 29 px réf / 28 px jeu, delta −1 px (`measure_text_and_contrast.py`).
9. Aplat de la carte sélectionnée : `(46,33,20)` réf / `(46,34,22)` jeu, delta `(0,+1,+2)` (`measure_layout.py`).
10. Aplat des cartes normales : `(36,28,20)` réf / `(34,28,22)` jeu, delta `(−2,0,+2)` (`measure_layout.py`).
11. Largeur intérieure des cartes : 974 px réf / 978 px jeu, +4 px = +0,41 % (`measure_layout.py`).
12. Espacement sélection → carte suivante : 24 px réf / 23 px jeu, delta −1 px (`measure_layout.py`).
13. Aplat de la bande-réplique : `(20,26,33)` réf / `(22,28,34)` jeu, delta `(+2,+2,+1)` (`measure_layout.py`).
14. Encre rouge de la cible/prise : `(140,47,54)` réf / `(140,46,53)` jeu, delta `(0,−1,−1)` (`measure_text_and_contrast.py`).
15. Hauteur d'encre principale du CTA : 25 px dans les deux images ; couleur à 1 canal près `(217,171,78)` / `(217,171,77)` (`measure_text_and_contrast.py`).
16. Le layout initial de la fiche ivoire est identique en 1080×2400 et 1080×1920 (`measure_scroll.py`).
17. Le scroll bas translate dix repères homologues de −411 ou −412 px seulement, dispersion 1 px (`measure_scroll.py`).

## 0. L'écran, tel que la maquette le dit

Cet écran sert à préparer puis engager le coup du soir : le joueur choisit une famille, comprend qui part, ce qui est visé et ce qui sera pris, puis confirme une décision irréversible. Le regard rencontre d'abord le shell nocturne et son manomètre, puis le titre « Le coup de ce soir ». La grande fiche ivoire compose l'ordre et constitue le héros central. Vient ensuite la liste des quatre familles, où l'ocre et le bouton « CE SOIR » rendent la sélection immédiatement explicite. La bande bleu-noir porte la voix de Lt. Kest et conduit au CTA final. Les traits d'identité sont la palette nuit/brun/ivoire, le médaillon thermique, la fiche d'ordre claire, le rouge réservé à la cible et au gain, puis le rythme de quatre dossiers alignés.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le but reste immédiatement lisible : choisir La Coil et envoyer Lt. Kest ce soir.
L'ordre de lecture principal est conservé : titre, fiche ivoire, famille sélectionnée, réplique puis CTA.
La sélection ocre, le rouge de cible et le panneau ivoire gardent leur fonction et leurs teintes.
La géométrie de la fiche, la taille du titre et le rythme horizontal sont remarquablement proches.
Le premier écart perçu est le large bandeau brun ajouté derrière le manomètre : il découpe le ciel en deux alors que la maquette laisse un chrome nocturne continu.
Le deuxième est la remontée générale de contraste des textes secondaires des familles ; les descriptions deviennent deux fois plus lumineuses.
Le troisième est encore plus marqué sur « jamais » : sa luminance est multipliée par 3,73 et il concurrence les noms de familles.
Ces deux contrastes répétés aplatissent la hiérarchie interne de chaque carte et rendent la liste visuellement plus bavarde.
Le cadre extérieur arrondi de la maquette manque, mais son trait mince ne change pas à lui seul le parcours du regard.
Le CTA est plus étroit et les cartes légèrement plus basses ; ces différences restent surtout visibles côte à côte.
Sur l'image entière, la luminance linéaire moyenne passe de 0,12747 à 0,11442 et la densité de ruptures de 16,664 % à 14,439 %, chiffres descriptifs car le jeu inclut 298 px de hauteur et un dock sans homologue (`measure_global.py`).
Dans l'ensemble, l'écran est bien le même produit et la même composition, mais pas encore la même hiérarchie de chrome et de textes secondaires.

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| 1 | H1.chrome.bande-superieure | **MAJEUR · EN TROP** | aucun pixel `(41,27,22)` dans la tranche y=130..244 ; médianes latérales `(9,14,21)` / `(10,14,21)` | bande `(0,143,1079,231)`, 87 846 px exacts, 70,73 % de la tranche | bande pleine de 89 px, absente en réf | `mesures/measure_shell.py` | Découpe le ciel nocturne derrière le manomètre ; différence de composition visible sans côte à côte. |
| 2 | L*.carte.description | **MAJEUR** | encre `(111,99,80)`, L=0,1288, contraste 2,86:1 | `(154,138,106)`, L=0,2609, contraste 4,99:1 | RGB `(+43,+39,+26)`, luminance ×2,03 | `mesures/measure_text_and_contrast.py` | Répété sur les quatre familles ; cause visuelle commune avec #3, vraisemblablement un token de texte secondaire différent. |
| 3 | L*.carte.statut-jamais | **MAJEUR** | encre `(87,68,51)`, L=0,0640, contraste 1,82:1 | `(148,132,106)`, L=0,2384, contraste 4,63:1 | RGB `(+61,+64,+55)`, luminance ×3,73 | `mesures/measure_text_and_contrast.py` | « jamais » devient presque aussi présent que les noms ; répété quatre fois. |
| 4 | S0.cadre-exterieur | **MINEUR · ABSENT EN JEU** | trait ardoise `(58,67,86)` continu sur 1 942–1 966 px aux quatre bords latéraux | aucune course de cette couleur aux bords | trait fin supprimé | `mesures/measure_shell.py` | Silhouette arrondie perdue, mais trait de seulement quelques pixels. |
| 5 | B1.cta | **MINEUR** | intérieur `(53,1941,1026,2039)`, 974×99 px | `(97,1874,982,1970)`, 886×97 px | largeur −88 px (−9,03 %) ; retraits +44/+43 px | `mesures/measure_layout.py` | Le CTA ne reprend plus les alignements latéraux des cartes ; fonction et lisibilité intactes. |
| 6 | L1..L4.cartes | **MINEUR** | sélection 159 px ; normales 158/159/145 px visibles dans l'aplat exact | quatre intérieurs à 150 px | −8 à −9 px sur les trois cartes entièrement comparables (−5,1 à −5,7 %) | `mesures/measure_layout.py` | Compactage régulier, sans coupe ; la dernière carte de référence est interrompue par la bande-réplique et n'est pas témoin de hauteur. |
| 7 | T1.sous-titre | **MINEUR** | lignes exactes y=543..561 et 582..595 | y=529..547 et 563..575 | −14 px puis −19 px, seconde ligne −1 px de haut | `mesures/measure_text_and_contrast.py` | Le sous-titre remonte vers le titre ; la lecture reste claire. |
| 8 | D1.cible-et-prise | **ARBITRAGE** | « l'entrepôt de Dépôt-Est » / « la ferraille de leur dépôt » | « leurs installations » / « la ferraille de leurs installations » | précision du bâtiment non disponible | `mesures/measure_text_and_contrast.py` (boîtes et encres), `dossier.md` (cause) | Arbitrage de données explicitement imposé par le dossier, pas défaut graphique ; le rendu générique est propre et sans trou. |
| 9 | H1.valeurs-session | **ASSUMÉ** | `$ 24 850`, `JOUR 12`, `Matin`, `tiède / HEAT` | `ARGENT —`, `JOUR —`, `CHALEUR` | valeurs absentes | `mesures/inspect_images.py` (images lues), `dossier.md` (acceptation) | État sans session annoncé ; géométrie du médaillon conservée à quelques pixels près. |

## 5. Autres résolutions

### 1080×2400 — capture principale

Tout le dossier est accessible sans défilement : quatrième carte complète jusqu'à y=1731, bande-réplique y=1744..2028, CTA y=1874..1970. Aucun texte n'est coupé. Le dock occupe la hauteur restante ; la référence n'en fournit pas d'homologue stylistique. Les écarts #1 à #7 sont présents.

### 1080×1920 — position initiale

Le layout n'est pas arbitrairement réduit : les courses ivoire centrales sont exactement les mêmes que dans la capture 2400 (`683..755`, `772..866`, `871..1008`). La sélection et les deux cartes suivantes sont entières ; Saltline est partiellement masquée par la zone basse, conformément à un écran scrollable. Ni la réplique ni le CTA ne sont encore visibles, ce qui rend la preuve basse indispensable.

### 1080×1920 — bas de scroll

Les repères homologues sont tous translatés de −411/−412 px avec seulement 1 px de dispersion. Saltline est entière (`1171..1319`), la bande-réplique atteint `1332..1617` et le CTA est entier à `1462..1558`. Il reste donc 60 px entre le bas du CTA et la fin de la bande de contenu ; aucune coupe, aucun débordement et aucun changement d'ordre de lecture ne sont observés. **Le scroll 1080×1920 tient.**

## 6. Non vérifié

- La famille de police ne peut pas être identifiée avec certitude depuis les PNG ; il faudrait les sorties `fc-match` de la machine de rendu et l'inventaire des fontes du client. Seules les hauteurs d'encre ont été comparées.
- Les animations ne sont pas vérifiables sur des captures fixes ; il faudrait une courte séquence ou plusieurs instants déterministes.
- Les états pressé/confirmé, réseau, historique non vide et absence de gros bras ne sont pas fournis, comme annoncé dans `dossier.md`.
- La fidélité stylistique du dock n'est pas comparable : il est visible dans les captures jeu mais n'a pas de contrepartie dans la référence recadrée. Seules l'absence d'occlusion finale et la tenue du scroll ont été jugées.
- Les cibles tactiles et le caractère réellement interactif du CTA ne se déduisent pas d'une image ; une capture d'état pressé ou un test d'interaction serait nécessaire.

## Annexes

### 1. Inventaire de la référence

| id | catégorie / parent | bbox mesurée | forme, remplissage, texte, relations |
|---|---|---|---|
| H0 | chrome / écran | cadre latéral x=0..1 et 1078..1079, courses 1 942–1 966 px | grand rectangle nuit à coins très arrondis, bord ardoise `(58,67,86)` ; contient données, ville et médaillon |
| H1 | médaillon / H0 | or `(443,25,635,218)` | cercle ~193×194 px, anneau ocre, jauge bleu/rouge, texte central ; centré x=539 |
| T0 | bande-titre / écran | aplat principal `(3,434,1076,637)` | brun `(32,24,15)` ; titre ivoire bbox `(53,480,505,520)`, sous-titre ocre sur deux lignes |
| P0 | fiche d'ordre / écran | aplat ivoire `(50,677,1029,1002)` = 980×326 | rectangle arrondi, séparateur beige ; phrase noire, cible/prise rouges ; médaillon lieutenant à gauche |
| L0 | liste / écran | des cartes à partir de y=1087 | titre capitales ocre ; quatre cartes verticales, retraits latéraux ~53 px |
| L1 | carte sélectionnée / L0 | aplat `(53,1087,1026,1245)` = 974×159 | brun chaud, bord ocre, monogramme, nom ivoire, métadonnées très sourdes, badge « CE SOIR » |
| L2–L4 | cartes normales / L0 | `(53,1270,1026,1427)`, `(53,1452,1026,1610)`, `(53,1635,1026,1779)` | brun sombre ; même structure, sans badge actif |
| R0 | bande-réplique / écran | `(3,1787,1076,2084)` | bleu-noir `(20,26,33)`, fin liseré supérieur ; réplique claire italique |
| B0 | CTA / R0 | intérieur `(53,1941,1026,2039)` = 974×99 | rectangle sombre bord ocre, libellé or à gauche, avertissement ocre sourd à droite |

Couche globale : palette quantifiée dominante `(32,24,16)` 18,306 %, `(36,28,20)` 17,557 %, ivoire `(239,232,218)` 14,655 %, nuit `(10,15,22)` 12,510 %. Luminance linéaire moyenne 0,12747 ; densité de ruptures 16,664 % (`measure_global.py`).

### 2. Inventaire de la capture principale

| id | catégorie / parent | bbox mesurée | forme, remplissage, texte, relations |
|---|---|---|---|
| H0 | chrome / écran | pleine largeur, sans trait latéral continu | shell bord à bord ; données absentes assumées ; ville, médaillon et dock |
| H0.bande | bande / H0 | `(0,143,1079,231)` | rectangle brun `(41,27,22)` derrière le médaillon, sans homologue |
| H1 | médaillon / H0 | or `(442,19,638,200)` | cercle ~197×182 px mesurés par couronne, centré x=540 ; hiérarchie conservée |
| T0 | bande-titre / écran | aplat principal `(1,435,1078,640)` | brun `(34,22,13)` ; titre bbox `(49,482,483,521)`, sous-titre deux lignes remonté |
| P0 | fiche d'ordre / écran | aplat `(46,683,1033,1008)` = 988×326 | même fiche ivoire et séparateur ; formulation générique propre |
| L1 | carte sélectionnée / liste | `(51,1063,1028,1212)` = 978×150 | structure et état corrects ; métadonnées nettement éclaircies |
| L2–L4 | cartes normales / liste | `(51,1236,1028,1385)`, `(51,1409,1028,1558)`, `(51,1582,1028,1731)` | quatre lignes régulières de 150 px ; même surcontraste secondaire |
| R0 | bande-réplique / écran | `(1,1744,1078,2028)` | bleu-noir `(22,28,34)` ; texte clair de hauteur égale |
| B0 | CTA / R0 | `(97,1874,982,1970)` = 886×97 | libellé entier, contraste et hauteur d'encre conservés, retrait latéral accru |
| N0 | dock / shell | sous y≈2029 sur la capture 2400 | quatre médaillons et libellés ; pas d'homologue de référence |

Couche globale : palette dominante `(34,28,22)` 14,941 %, ivoire `(238,232,218)` 12,934 %, nuit `(15,19,29)` 12,438 %, prune `(28,17,22)` 10,121 %. Luminance moyenne 0,11442 ; densité 14,439 % (`measure_global.py`).

### 3. Correspondance des repères

- Échelle horizontale : **1,000**, les quatre PNG faisant 1080 px de large.
- Offset horizontal de contenu : fiche ivoire x=50 réf / x=46 jeu ; différence −4 px, puis largeur +8 px. Les comparaisons de largeur sont donc faites en px natifs et en % des 1080 px.
- Il n'existe pas d'échelle verticale affine unique : la capture 2400 ajoute le dock et compacte localement la liste. Les repères ont été appariés par parties (titre, fiche, cartes, réponse, CTA), jamais par redimensionnement global.
- Repères stables : titre y=480..520 / 482..521 ; fiche ivoire 326 px dans les deux ; scroll bas −411/−412 px.

### 4. Scripts et sorties synthétiques

Tous les scripts impriment les tailles exactes des images ouvertes et portent un témoin positif et un témoin négatif.

```text
$ python3 mesures/inspect_images.py
IMAGE reference-1080x2102.png size=(1080, 2102) sha256=57b9...abf
IMAGE capture-1080x2400.png size=(1080, 2400) sha256=607d...0d1
IMAGE capture-1080x1920.png size=(1080, 1920) sha256=b9d7...d577a
IMAGE capture-1080x1920-bas.png size=(1080, 1920) sha256=4e10...7e50
CONTROL_POSITIVE same_width_1080 widths=[1080, 1080, 1080, 1080] result=True
CONTROL_NEGATIVE distinct_heights ref=2102 capture=2400 delta=298 result=True

$ python3 mesures/measure_layout.py
cream_panel ref: (50,677,1029,1002), 980×326
cream_panel cap: (46,683,1033,1008), 988×326
selected_card ref: 974×159 ; cap: 978×150
cta ref: 974×99 ; cap: 886×97
CONTROL_POSITIVE cream_center equal=True
CONTROL_NEGATIVE cream_vs_normal distinct=True

$ python3 mesures/measure_text_and_contrast.py
screen_title rows ref=41 px cap=40 px
secondary_description contrast ref=2.86:1 cap=4.99:1 luminance_ratio=2.03x
status_never contrast ref=1.82:1 cap=4.63:1 luminance_ratio=3.73x
CONTROL_POSITIVE title_face equal=True ; reply_face equal=True
CONTROL_NEGATIVE secondary_description_delta=(43,39,26) distinct=True

$ python3 mesures/measure_shell.py
BROWN_HEADER_BAND ref count=0
BROWN_HEADER_BAND cap bbox=(0,143,1079,231), count=87846, share=70.73%
OUTER_FRAME ref longest=1942..1966 px ; cap longest=0
CONTROL_POSITIVE medallion_extent ref=(193,194) cap=(197,182)
CONTROL_NEGATIVE brown_band distinct=True

$ python3 mesures/measure_scroll.py
CONTROL_POSITIVE initial_cream_runs equal=True
SCROLL_TRANSLATION deltas=-411/-412 px, spread=1 px
bottom CTA y=1462..1558 ; content bottom=1617
CONTROL_NEGATIVE moved=True

$ python3 mesures/measure_global.py
reference luminance=0.12747 edge_density=16.664%
capture luminance=0.11442 edge_density=14.439%
CONTROL_POSITIVE shared cream and title ink
CONTROL_NEGATIVE heights 2102 vs 2400
```
