# Juge visuel ⊥ — ㉚ La chaîne d'appro (`ecran_appro`) — r-groupe — 2026-10-07

## Verdict : **NON APPROUVÉ**

Le bon de commande est bien là, au bon endroit, et le geste est bien doré ; mais le **titre est
dans la mauvaise famille de police**, le **rouge des valeurs tombe à 2,34:1 sur le papier crème**,
et l'écran a perdu son **bandeau de titre** comme sa **bande basse**.

Classement demandé (ruling user du 07/10) : **A** = le joueur le perçoit nettement · **B** = forme
visible mais secondaire · **C** = pixel/nuance (listé, sans peser sur le verdict).

---

## Écart ASSUMÉ, non classé

Le décor de scène est un lot en cours : le fond en aplat `#0d0d0d` est **connu** et n'est pas
compté. *(Pour mémoire au moment de poser ce décor : le canon `.appr6` est un dégradé **chaud**,
`#1c1a17 → #151310 → #111014`, mesuré `#1e1b16` dans le bandeau de la référence.)*

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence (cadre 48) | jeu (1080×1920) | écart |
|---|---|---|---|---|
| 1 | le bon de commande est un papier crème, pleine largeur utile, en haut du corps | oui | oui | — |
| 2 | en-tête du bon : « Pyralin » à gauche, « BON DE COMMANDE » en capitales à droite | oui | oui | **identique** |
| 3 | 4 lignes clé→valeur, clé en capitales lettrées à gauche, valeur en gras à droite | oui | oui | — |
| 4 | libellés des lignes | à quoi ça sert / ce qu'il en reste / le prix / le fournisseur | idem, même ordre | **identique** |
| 5 | geste — couleur du bord | canon `#5a4a2a` | `#5a492a` | **1/255** |
| 6 | geste — couleur du fond | canon `#241c11` | `#221c0d` | **4/255** |
| 7 | geste — couleur du texte | canon `#d9ab4e` | `#d9ab4d` | **1/255** |
| 8 | geste — capitales, lettrées, pleine largeur utile | oui | oui | — |
| 9 | or de la valeur ARGENT (bandeau haut) | `#f2c96b` | `#f2c96a` | 1/255 |
| 10 | luminance moyenne du contenu | 81,1 | 81,5 | **+0,5 %** |
| 11 | ordre de lecture (titre → sous-titre → bon → voix → geste) | identique | identique | — |
| 12 | voix du lieutenant présente, en italique sérif | oui | oui | — |

`fc-match` sur la machine de rendu : `DejaVu Serif → DejaVuSerif.ttf`, `DejaVu Sans →
DejaVuSans.ttf`. **Aucune substitution** ⇒ l'écart de famille relevé en A1 est un vrai écart, pas un
artefact de rendu de la maquette.

---

## 0. L'écran, tel que la maquette le dit

**But** : savoir où en est la matière première — ce qu'il en reste, ce que ça coûte, de quelle
humeur est le fournisseur — et **en commander**.

**Ordre de lecture** : (1) le **bandeau de titre**, plaque chaude pleine largeur fermée par un
filet, titre **sérif** crème + une ligne d'explication ; (2) le **bon de commande**, papier crème
**à lignes séparées de pointillés**, terminé en bas par une **bande de perforation** — c'est un
ticket, pas un panneau ; (3) à l'intérieur, quatre lignes clé→valeur dont les **valeurs
alarmantes passent au rouge brique** ; (4) la **bande basse** bleu nuit, filet haut de 2 px, où le
lieutenant parle et où se tient le **geste doré** avec sa note à droite.

**Traits d'identité** : le ticket crème **pointillé et perforé** ; le rouge **brique** des alertes
(une encre d'imprimerie, pas un néon) ; le contraste chaud du haut / froid du bas ; le geste doré.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

C'est le plus proche des cinq. Même but, même ordre de lecture, même luminance moyenne (81,1 contre
81,5), même bon de commande au même endroit avec les mêmes quatre lignes dans le même ordre, même
geste doré au pixel près. Un joueur ne se tromperait pas d'écran.

Trois choses le trahissent quand même. **Le titre n'est plus dans la langue graphique de la
maison** : le canon demande DejaVu **Serif** crème `#f0dfc4` à 33 px de capitale ; le jeu rend un
**sans-serif** blanc `#eef1f2` à 50 px, qui déborde sur deux lignes. C'est le premier objet que
l'œil rencontre, et il ne ressemble plus aux autres écrans — ㊳ et ㉞ rendent, eux, leur titre en
sérif. **Le rouge a changé de famille** : `#a8402f` (brique) devient `#ff5a4d` (corail vif), et sur
le papier crème le contraste tombe de **4,96:1 à 2,34:1** — sous le plancher de 3:1 de la doctrine.
La ligne qui dit « il n'y a plus rien » est précisément celle qu'on lit le plus mal. Enfin, le
**ticket n'est plus un ticket** : ni les 4 filets pointillés entre les lignes, ni la bande de
perforation du bas ; et l'écran n'a plus de **pied** — la plaque bleu nuit à filet haut a disparu,
le geste flotte sur le fond et a perdu sa note de droite.

**Les 3 écarts de tête** : A2 le rouge à 2,34:1 (lisibilité) · A1 le titre en sans-serif ·
A3+A4 les deux bandeaux (haut et bas) absents.

---

## 3. Écarts

| # | partie | classe | réf | jeu | mesure | script |
|---|---|---|---|---|---|---|
| **A1** | titre d'écran (`.entete h3`) | **A** | **DejaVu Serif**, `#f0dfc4`, capitale **33 px**, 1 ligne | **sans-serif**, `#eef1f2`, capitale **50 px** (+52 %), 2 lignes | famille + couleur (Δ 26/255 sur le canal rouge-jaune) + corps | `m03_appro.py`, `m06_titres.py`, `mesures/appro_titres.png` |
| **A2** | rouge des valeurs (`.bon .l b.rouge`) | **A** | dominante **`#a8402f`** (2 322 px) ⇒ **4,96:1** sur le papier | dominante **`#ff5a4d`** (2 779 px) ⇒ **2,34:1** sur le papier | contraste divisé par 2,1 ; **sous le plancher 3:1** | `m03_appro.py` |
| **A3** | bandeau de titre (`.entete`) | **A** | plaque `#1e1b16` pleine largeur + filet bas `#3a352c` | `#0d0d0d` **uniforme** de `y 250` à `y 580` | plaque + filet → 0 | `m03_appro.py` |
| **A4** | bande basse (`.bas`) | **A** | plaque `#141a21` + filet haut 2 px `#2c3640` sous laquelle vivent la voix et le geste | `#0d0d0d` autour du geste — aucune plaque, aucun filet | bande → 0 (le geste, lui, est juste) | `m03_appro.py` |
| **B1** | filets pointillés du bon (`.bon .l{border-top:1px dotted #c3b79e}`) | **B** | **4 filets**, `y 749-751 / 817-819 / 885-887 / 953-955`, 277 transitions, 50 % de remplissage | **0 filet** sur tout le bon (`y 620-1060`) | 4 → 0 | `m03b_appro_filets.py` (**contrôle positif sur la réf = 4, contrôle négatif sur une ligne de texte = 0**) |
| **B2** | perforation basse du bon (`.bon::after`) | **B** | bande de 5 px CSS en créneaux `#cbbfa4`/transparent, sur toute la largeur | rien : le papier s'arrête net | 1 élément absent | `m03_appro.py` |
| **B3** | note de droite du geste (`.geste small`) | **B** | « ça part du compte tout de suite », alignée à droite dans le geste | absente — le geste ne porte que son libellé | 1 élément absent | lecture des planches |

### C — listés, non traités (ruling du 07/10)

- papier du bon : `#efe7d6` → `#eae0c8` (Δ 14/255) ;
- intertitre « LA CHAÎNE, EN REMONTANT » : le canon (`.titron`) le veut à 6,6 px CSS très lettré et
  sourd (`#8a8069`) ; en jeu il est nettement plus gros et plus clair ;
- l'échelle typographique des titres (+35 % systématique sur les 5 écrans) — voir l'**arbitrage**
  consigné dans le rapport de ㉞, le même ici.

---

## 5. Autres résolutions

- **1080×1920** : tout tient, rien n'est coupé, aucune liste ne déborde (conforme au journal de
  capture). Le geste est à `y ≈ 1395-1480`, suivi d'un vide jusqu'à la barre d'onglets.
- **1080×2400** : même composition, même état ; le vide sous le geste s'allonge à ~1 100 px
  (≈ 46 % de la hauteur de l'écran). Rien ne déborde, les gouttières tiennent (46 px aux deux
  résolutions), l'ordre de lecture est conservé. Ce vide est la conséquence directe de A4 : au
  canon, la bande basse est **ancrée en pied**, donc l'écran n'a pas de trou — ici le contenu se
  tasse en haut.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Le pavé de pénurie** (`.penurie`, bloc rouge brique dans le bon) : absent en jeu, mais le
   compte neuf n'est probablement pas en pénurie — **non comparable**. *Mesure qui trancherait :
   `scarcity_active` dans le corps de `GET /v1/operational/precursors` (ressort du `juge-donnees`).*
2. **La chaîne qu'on remonte** (`.chaine`, nœuds + tuyaux, cadres 50-52) : le jeu affiche à sa place
   une phrase (« Rien ne circule encore : vos maillons attendent une première commande. »). Aucun
   cadre ne montre cet état vide ⇒ **non jugeable**.
3. **La note du geste** (B3) : je constate son absence ; je ne peux pas savoir si elle est
   conditionnée à un état.
4. **La face exacte du sans-serif du titre en jeu** : je lis « un sans-serif », je ne peux pas
   nommer la fonte depuis une image. Ce qui est établi, c'est que ce **n'est pas** la famille du
   canon, et que ce n'est pas une substitution (`fc-match` ci-dessus).
5. **Les animations** : la source de ㉚ ne déclare pas de `@keyframes` sur `.appr6` ; une planche
   figée ne départage de toute façon rien de ce qui bouge.
6. **L'état « commande en route / délégué »** (cadres 49 et 53) : non capturé.

---

## Annexes

1. **Références rendues** depuis `~/project/atelier3d-mafia` (master `d84c6eb`),
   `ecrans-brennar-6.html`, `Tools/rendre-tel.py … 3.6` → 1080×2102, **index apparié à son
   étiquette avant rendu** : `ref/cadre-48.png` … `cadre-53.png` ; étiquettes dans
   `ref/ETIQUETTES.txt` (48 = « Commander — et il n'y a plus rien », le nominal).
2. **Planches jugées** :
   `Tools/juge-visuel/planches-par-ecran-2026-10-07/E03_Chanedappro_1080x1920.png` et
   `…_1080x2400.png`.
3. **Correspondance des repères** : les deux images font **1080 px de large** ; le téléphone de la
   maquette fait 300 px CSS rendus à ×3,6 ⇒ 1 px de référence = 1 px de planche **en largeur**
   (gouttière canonique 46,8 px ↔ 46 px mesurés). Les hauteurs diffèrent : aucune distance
   verticale n'est comparée en px bruts.
4. **Scripts** : `mesures/outils.py` · `m03_appro.py` (titre, bandeau, papier, rouge, perforation,
   bande basse) · `m03b_appro_filets.py` (**détecteur de filet pointillé, avec contrôle positif
   sur la référence — 4 filets attendus, 4 trouvés — et contrôle négatif sur une ligne de texte —
   0 attendu, 0 trouvé**) · `m00_controles.py`, `m06_titres.py`, `m07_palettes.py` (communs aux
   5 écrans) · `mesures/appro_titres.png` (les deux titres l'un sous l'autre),
   `mesures/titres_jeu.png` (les 5 titres en jeu, qui montrent que ㊳ et ㉞ sont en sérif).
