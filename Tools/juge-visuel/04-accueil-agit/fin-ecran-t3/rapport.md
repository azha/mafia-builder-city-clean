# Juge visuel ⊥ — ④ L'ouverture : carte de tête qui agit + après-geste ⑤ — tour 3 BORNÉ — 2026-11-11

Juge NEUF, contexte vierge. Rien lu du code client, de ses tests, des notes d'implémentation ni
d'aucun rapport de juge ou de revue. Lu : `dossier.md`, `reference/*`, `captures/*`,
`avant-t2/*`, `mesures/instrument-29_couture_corrigee.py`.
Échelle reçue du dossier, jamais déduite : **1 px CSS = 3,6 px d'image des deux côtés**. Toute
grandeur ci-dessous est ramenée en px CSS (÷ 3,6).

---

## Verdict : **APPROUVÉ**

**0 A/B** sur les deux points du tour borné. Point 1 : chaque conséquence se lit sous son option,
centrée sur son bouton à **≤ 0,14 px CSS**, sans aucun débordement sous le bouton voisin, aux trois
seuils d'encre et dans les deux résolutions. Point 2 : **12 paires sur 12 sans régression** (9 paires
à 0 pixel de différence, 3 paires à **1 seul pixel** de différence à Δ = 1/255 sur un canal).
Les 2 findings de la table sont de classe **C** (nuance de densité), donc consignés sans tour.

---

## LA TABLE — tous les findings, rien compté ailleurs

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `MINEUR` | `NOUVEAU` | **classe C** — point 1. L'encre des deux conséquences occupe presque toute la largeur de son bouton, là où la maquette la laisse en retrait : la gouttière entre les deux textes tombe de moitié, et le texte de gauche vient affleurer le bord de son bouton. La lecture « une conséquence sous son option » n'en est pas changée (voir contrôle positif C7/C8). | gouttière d'encre entre les deux conséquences : **réf 90 px = 25,00 CSS** → **jeu 44 px = 12,22 CSS** (−12,78 CSS, −51 %), identique en 2400 et 1920. Marge encre → bord du bouton, côté gauche : **réf 21 px = 5,83 CSS** → **jeu 4 px = 1,11 CSS** ; côté droit du bloc gauche **réf 6,67 → jeu 1,39 CSS** ; bloc droit **réf 10,56 → jeu 3,06 CSS** des deux côtés. Rapport gouttière / plus grand espace de mot : **réf 6,00 → jeu 3,14** (espace de mot mesuré : réf 4,17 CSS, jeu 3,89 CSS). Scripts `mesures/j2-couture-fenetre-generale.py`, `mesures/j3-gouttiere-vs-espace-mot.py`. | La largeur de **contrainte** du bloc : l'encre n'en donne qu'une borne inférieure. Surtout, **les deux textes ne sont pas les mêmes chaînes** (maquette : carte « Un local à remettre en état » ; jeu : carte SEVERED_ROUTE_REBUILD), donc une part non séparable de l'écart d'encre est due au texte, pas à la mise en page. Trancherait : une capture en jeu du **même** texte que le cadre 5, ou le rect de contrainte hors image. |
| `F2` | `MINEUR` | `NOUVEAU` | **classe C** — point 1. L'écart vertical entre le bas de l'aplat or du bouton primaire et la 1ʳᵉ ligne de sa conséquence est un peu plus grand qu'en maquette. Invisible sans côte à côte. | **réf 28 px = 7,78 CSS** → **jeu 32 px = 8,89 CSS** (+4 px, +1,11 CSS, +14 % ; > la tolérance d'espacement de 10 %). Identique au pixel en 2400 et 1920. Script `mesures/j4-rect-boutons-et-ecarts-verticaux.py`. | Où s'arrête exactement le dégradé du bas du bouton : la mesure dépend du point où l'aplat or cesse d'être « or » (R>150, R−B>60). Trancherait : le rect déclaré du bouton hors image. |

**Compte lu dans la table : A/B = 0 · C = 2** (F1, F2 — tous deux MINEUR, tous deux NOUVEAU).
Aucun BLOQUANT, aucun MAJEUR.

---

## Point 1 — ④ avant geste : chaque conséquence sous SON option

**Verdict du point : tenu.** Le critère du dossier (« celle de gauche sous le bouton de gauche,
celle de droite sous le bouton de droite ») est satisfait dans les deux résolutions.

### Les grandeurs demandées (px CSS ; px d'image entre parenthèses)

| grandeur | réf cadre 5 | H01 2400 | H01 1920 | delta jeu − réf |
|---|---|---|---|---|
| couture (centre de gouttière) à l'**étage des boutons** | **149,86** (539,5) | **149,86** (539,5) | **149,86** (539,5) | **0,00** |
| couture à l'**étage des conséquences** | **151,81** (546,5) | **150,69** (542,5) | **150,69** (542,5) | **−1,11** |
| décalage couture conséquences − couture boutons | +1,94 | +0,83 | +0,83 | −1,11 |
| gouttière entre les deux **boutons** | **7,78** (28) | **7,78** (28) | **7,78** (28) | **0,00** |
| gouttière entre les deux **textes** de conséquence | **25,00** (90) | **12,22** (44) | **12,22** (44) | **−12,78** → `F1` |
| largeur d'encre, bloc **gauche** | 105,83 (381) | 116,39 (419) | 116,39 (419) | +10,56 (textes ≠) |
| largeur d'encre, bloc **droit** | 97,22 (350) | 112,78 (406) | 112,78 (406) | +15,56 (textes ≠) |
| largeur du **bouton** primaire (aplat or seul) | 116,67 (420) | 117,50 (423) | 117,50 (423) | +0,83 |
| largeur des deux boutons (lueur comprise) | 118,33 / 118,33 | 118,89 / 118,89 | 118,89 / 118,89 | +0,56 |
| **débordement** du bloc gauche sous le bouton droit | **0** (marge 6,67) | **0** (marge 1,39) | **0** (marge 1,39) | aucun |
| **débordement** du bloc droit sous le bouton gauche | **0** (marge 10,56) | **0** (marge 3,06) | **0** (marge 3,06) | aucun |
| décentrage encre / bouton, gauche | −0,42 | **−0,14** | **−0,14** | — |
| décentrage encre / bouton, droite | 0,00 | **0,00** | **0,00** | — |

Débordement contrôlé aux **trois seuils d'encre 55 / 95 / 130** : l'encre de gauche s'arrête à
x = 520/521 et la gouttière court jusqu'à x = 564/565 — aucun pixel de l'un des deux blocs ne passe
sous le bouton voisin, à aucun seuil.

### Pourquoi la couture tient malgré F1

La séparation des deux colonnes reste **3,14 fois** plus large que le plus grand espace de mot du
même texte (maquette : 6,00 fois). Aucune ligne ne traverse la couture ; les cinq lignes de gauche
et les trois de droite sont centrées chacune sur le centre de son bouton (767,5 px pour les deux
blocs de droite, au pixel près). Un joueur lit deux colonnes, pas un paragraphe.

### Appariement option ↔ conséquence (le témoin)

Gauche = bouton primaire or **« DÉTOURNER MAINTENANT »** ⇒ conséquence « Un détour est tracé pour
chaque route et payé tout de suite, tant que l'argent suit ; le passage rouvre une fois les travaux
finis. » Droite = bouton secondaire au contour **« LAISSER LA ROUTE COUPÉE »** ⇒ « Rien n'est payé,
mais ce qui est coupé le reste : plus rien n'y passe. » Même structure que le cadre 5 (primaire or
à gauche, secondaire au contour à droite) et appariement conforme au `journal.tsv`
(`options=«Détourner maintenant | Laisser la route coupée»`). **Aucun croisement.**

---

## Point 2 — non-régression de l'après-geste G01 → G06

**Verdict du point : sans régression, 12 paires sur 12.**
`mesures/j1-diff-non-regression.py`, comparaison RGB stricte pixel à pixel,
`captures/…_c4c6fc581_…` contre `avant-t2/…_c3aa3bbdb_…`.

| état | 1080×2400 | 1080×1920 | verdict |
|---|---|---|---|
| G01 executed | **1 px** (Δ=1/255) en (813, 1777) | **0 px** | sans régression |
| G02 noted | **0 px** | **0 px** | sans régression |
| G03 déjà tranchée | **1 px** (Δ=1/255) en (308, 1932) | **1 px** (Δ=1/255) en (308, 1452) | sans régression |
| G04 404 « plus là » | **0 px** | **0 px** | sans régression |
| G05 1ʳᵉ cible en échec | **0 px** | **0 px** | sans régression |
| G06 noted structurelle | **0 px** | **0 px** | sans régression |

Aucune paire n'a **un seul** pixel dont un canal s'écarte de ≥ 8/255 : la zone englobante des
différences perceptibles est **vide** pour les 12 paires. Les trois pixels isolés valent
(127,127,104) vs (127,126,104) et (217,204,170) vs (216,204,170) — un pas de quantification, hors
de toute perception. Aucun élément déplacé, apparu, disparu ; aucun texte changé.

Ces trois pixels sont aussi une **information utile** : si les captures `avant-t2/` avaient été
recopiées au lieu d'être re-rendues, les 12 paires seraient identiques au bit près. Elles ne le sont
pas — la chaîne de capture a bien retourné deux fois.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

1. Couture des **boutons** : 539,5 px d'image = **149,86 CSS**, identique en réf, 2400 et 1920 (0,00).
2. Gouttière entre les **boutons** : **7,78 CSS** (28 px), identique réf / 2400 / 1920.
3. Largeurs des deux boutons **égales entre elles** en jeu : 428 px / 428 px (118,89 CSS chacun) —
   et égales en maquette : 426 / 426.
4. Centre du bloc droit de conséquence = centre du bouton droit : **767,5 px exactement**, des deux
   côtés de la comparaison, en 2400 comme en 1920 (décentrage 0,00 CSS).
5. Décentrage du bloc gauche : **−0,14 CSS** en jeu (maquette −0,42 CSS) — tous deux sous le bruit.
6. Rect de l'aplat or, **identique au pixel** entre 2400 et 1920 : x = [100..522], h = 124 px.
7. Toutes les colonnes de l'étage des conséquences, **identiques au pixel** entre 2400 et 1920 :
   gauche [102..520], droite [565..970], gouttière [521..564]. (Contrôle positif demandé par le
   dossier : mesure identique aux deux résolutions. **Obtenu, au pixel.**)
8. Marge de bas de carte (dernière ligne → bord bas de la carte) : **13,06 CSS** en jeu dans les
   deux résolutions, **12,22 CSS** (jusqu'au pointillé) / 13,33 CSS (jusqu'à l'encre du texte) en
   maquette — rien n'est coupé, rien ne touche le bord.
9. Hauteur du bouton primaire : 35,83 CSS (réf) vs 34,44 CSS (jeu) — 5 px d'image, sous 1,5 % du
   parent.
10. Garde anti-vide du dossier : **100 % de pixels non noirs** (somme RGB > 24, échantillon 1/9) sur
    les 14 captures — très au-dessus du plancher de 5 %.
11. Appariement couleur/rang des deux boutons : primaire **or plein** à gauche, secondaire **au
    contour** à droite, comme au cadre 5 (témoin correct : je n'ai pas comparé le secondaire au
    primaire).
12. Point 2 : 9 paires sur 12 à **exactement 0** pixel de différence.

## Contrôles des instruments (chacun positif ET négatif)

| script | contrôle positif | contrôle négatif | état |
|---|---|---|---|
| `j1-diff-non-regression.py` | une capture comparée à **elle-même** → **0 px** | G01-2400 vs G02-2400 (états différents) → **1 341 536 px** (51,76 %), dont 433 933 à ≥ 8/255, bbox y = [915..1983] | **passé** |
| `j2-couture-fenetre-generale.py` | mesure **identique au pixel** en 2400 et 1920 (cf. contrôle positif n° 7) ; retrouve sur la référence les chiffres d'`instrument-29` dont la fenêtre y était déjà saine | trou = 400 px → **1 seul bloc** et non 2, sur les trois images ; et la couture des boutons (539,5) sort à une **autre abscisse** que celle des conséquences (542,5 / 546,5) | **passé** |
| `j3-gouttiere-vs-espace-mot.py` | sur la maquette ratifiée, rapport gouttière / espace de mot = **6,00** (la valeur à battre) | seuil d'encre 250 → **aucune ligne détectée** sur les trois images (l'instrument n'invente pas de trous) | **passé** |
| `j4-rect-boutons-et-ecarts-verticaux.py` | rect de l'aplat **identique au pixel** en 2400 et 1920 | détecteur d'or appliqué au bouton **secondaire** → **RIEN** | **passé après correction** |

**Deux instruments ont d'abord raté leur contrôle ; leurs chiffres sont jetés, et je le dis :**
- `j3` première version : le filtre « trou interne » gardait les trous qui **contiennent** la
  gouttière (ligne courte d'un côté), d'où un « espace de mot » de 140 px (réf) et 184 px (jeu), et
  un rapport gouttière/espace de 0,64 et 0,24 — absurdes. Filtre corrigé (un trou interne est
  entièrement d'un côté de la gouttière) ⇒ 15 px et 14 px, rapports 6,00 et 3,14.
- `j4` première version : le détecteur d'or sans condition de **run** prenait le libellé crème
  « LAISSER EN L'ÉTAT » de la référence pour de l'or ⇒ contrôle négatif **échoué**. Condition de run
  ≥ 200 px ajoutée ⇒ contrôle négatif passé sur les trois images. Les chiffres cités viennent tous
  de la version corrigée.

### Sur l'instrument fourni (`instrument-29_couture_corrigee.py`)

Je l'ai lancé, et sa propre sortie **signale la troncature** que le dossier m'invitait à chercher :

    ligne y=[1710..1726] x=[ 137.. 969] l=833  !! TRONQUEE

Sa fenêtre y = [1710..1900] sur la capture 2400 coupe la 1ʳᵉ ligne de conséquence (qui commence à
y = 1698). J'ai donc **refait** la mesure avec `j2`, fenêtre bornée au balayage de bandes (boutons
1541..1668, conséquences 1698..1855, marges ≥ 13 px de chaque côté, aucune bande marquée « touche le
bord »). **Les chiffres de couture et de gouttière se trouvent inchangés** (542,5 et 44 px) : la
ligne coupée était la plus courte des deux côtés et ne portait pas les extrêmes. Je cite donc `j2`,
pas `29`, mais les deux concordent.

---

## Hors périmètre (ni dans la table, ni dans le verdict)

- **Rien de nouveau et grave à signaler.** Les états G01-G06 étant identiques au pixel au tour
  précédent, rien de neuf ne peut s'y trouver ; seul H01 pouvait en porter, et je n'y vois aucun
  élément coupé, hors cadre ou illisible, dans les deux résolutions.
- **Faux départ que j'ai écarté moi-même** : un petit crochet gris qui barre le « 1 » de
  « 10 000 € » en haut à gauche des captures. Je l'ai cru en trop, puis l'ai retrouvé **à
  l'identique sur la référence** `cadre-5-tete-sur-ligne-haute.png` (même forme, sur « 24 850 € ») :
  c'est un ornement de la maquette, pas un défaut. Je le consigne pour qu'un juge suivant ne le
  relève pas non plus.
- Le pointillé `.prop` sous les conséquences est **absent** en jeu, comme le dossier l'arbitre
  (« ne pas signaler son absence ») — vérifié présent sur la référence, absent en jeu, rien d'autre
  n'a disparu avec lui (les 8 lignes de texte sont toutes là, aucune tronquée).
- Les écarts ASSUMÉS listés au dossier (jeton, filets-or, tampon, étiquettes PORTÉE/URGENCE,
  proportions de la carte…) n'ont pas été rouverts.

---

## Ce que je n'ai pas pu vérifier

1. **Les deux textes comparés ne sont pas les mêmes chaînes** (maquette : « Un local à remettre en
   état » ; jeu : carte SEVERED_ROUTE_REBUILD). Toute largeur d'encre est donc un composite
   mise-en-page × texte. Trancherait : une capture en jeu de la **même** carte que le cadre 5.
2. **La largeur de contrainte** des blocs de conséquence : invisible depuis l'image, l'encre n'en
   donne qu'une borne inférieure (F1). Trancherait : le rect de contrainte, hors image.
3. **La provenance des captures `avant-t2/`** : je ne peux pas prouver depuis les images qu'elles
   ont été produites par le client `3aa3bbdb`. L'argument le plus fort dont je dispose est interne
   (3 paires diffèrent d'un pixel, donc il y a bien eu deux rendus). Trancherait : le journal de
   capture du tour précédent.
4. **L'animation** : une seule capture par état, figée à t = 0. Sans captures à T et T+1 s, je ne
   peux rien dire de ce qui bouge — ni le classer en écart (le dossier l'interdit à juste titre).
5. **Le contraste** des textes de conséquence sur l'art réel n'a pas été mesuré : il est hors des
   deux points du tour borné.
6. **États non capturés** : la carte de tête avec une seule option, avec des libellés plus longs, ou
   en EN. Un texte plus long rapprocherait encore les deux colonnes (F1) — le cas limite n'est pas
   dans le dossier.

---

## Annexe — scripts et sorties

Tous dans `mesures/`, chacun imprimant la taille de chaque image ouverte :
`j1-diff-non-regression.py`, `j2-couture-fenetre-generale.py`, `j3-gouttiere-vs-espace-mot.py`,
`j4-rect-boutons-et-ecarts-verticaux.py`. Les fenêtres y de `j2` et `j4` viennent d'un balayage de
bandes préalable (bandes de la référence : boutons 1141..1275, conséquences 1300..1449 ; H01 2400 :
1541..1668 et 1698..1855 ; H01 1920 : 1086..1215 et 1244..1401).
