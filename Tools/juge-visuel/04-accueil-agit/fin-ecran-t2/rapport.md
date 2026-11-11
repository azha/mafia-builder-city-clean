# Juge visuel ⊥ — ④ L'ouverture : la carte de tête QUI AGIT et l'après-geste ⑤ — fin d'écran, TOUR 2 — 2026-11-11

Juge NEUF, contexte vierge. Rien lu du code client, de ses tests, des notes d'implémentation, ni
d'aucun rapport de juge ou de revue (ni `04-accueil/r*`, ni `04-accueil-agit/fin-ecran/`, ni
`juge-donnees/**`, ni `ensemble-decor`). Entrées : `dossier.md`, `reference/` (3 PNG + le fichier de
variantes), `captures/` (14 PNG + `journal.tsv`). Instruments : `mesures/*.py` (PIL seul, numpy
absent), sorties collées en annexe 4.

## Verdict : NON APPROUVÉ

Un seul écart A/B, et il est à l'étage AVANT le geste : sur ④ chaque conséquence n'est plus posée
sous l'option qu'elle explique — la couture qui sépare les deux options se déplace de 142,5 px
(39,6 px CSS, 13,2 % de la largeur d'écran) entre la rangée des boutons et la rangée des
conséquences, contre 7,0 px dans la maquette. Tout l'après-geste ⑤ (G01→G06), lui, est fidèle :
aucun A/B.

---

## Comptes (lus dans la table du § 3)

| classe | nombre |
|---|---|
| **A/B** (ce qu'un joueur perçoit) | **1** — `F1` |
| **C** (pixel ou nuance, consigné) | **12** — `F2` à `F13` |
| gravité BLOQUANT | 0 |
| gravité MAJEUR | 1 |
| gravité MINEUR | 12 |

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Dix-huit grandeurs, chacune produite par un script de `mesures/`. Elles fixent aussi l'échelle :
**X est 1:1** entre la référence et la capture (1 px CSS = 3,6 px d'image des deux côtés), et les
hauteurs de capitale coïncidant au pixel près, **les ÉCARTS LOCAUX en Y sont comparables** (ce sont
les hauteurs totales d'image, 2102 vs 2400/1920, qui ne le sont pas).

| # | grandeur | référence | capture | script |
|---|---|---|---|---|
| 1 | jeton — disque doré | 151 px de diam., x=[806..957], rondeur 1,000 | 151 px, x=[806..957], rondeur 1,000 | `05`, `17` |
| 2 | titre de carte — « Des » | 108 px de large, capitale du 'D' = 40 px (11,11 CSS) | 108 px, 40 px (11,11 CSS) | `10` |
| 3 | titre de la carte du jour (④) | 'U' = 43 px (11,94 CSS) | 'D' = 43 px (11,94 CSS) | `20` |
| 4 | or des textes (grave, mot-or, ligne-or, LIBRE) | (242, 201, 107) | (242, 201, 106) | `16` |
| 5 | rouge de « Rien n'est parti » | (255, 179, 158) | (255, 179, 158) | `16` |
| 6 | grave « VOUS AVEZ TRANCHÉ » | 569 px de large, capitale 26 px | 569 px, 26 px | `13` |
| 7 | « RETOUR À L'ACCUEIL » | capitale 25 px | capitale 25 px | `14`, `26` |
| 8 | sous-ligne « La carte vous attend encore. » | 398 px de large | 398 px | `26` |
| 9 | « CE QU'ON PEUT FAIRE » | 417 px, centre x=539,0 | 412 px, centre x=539,5 | `19` |
| 10 | libellés du bandeau d'onglets | 645 px, centre x=529,0 | 646 px, centre x=530,5 | `20` |
| 11 | filet d'or intérieur de la carte | (176, 141, 62), 3 px | (176, 141, 62), 3 px | `25` |
| 12 | étiquettes PORTÉE / URGENCE (encre) | (90, 70, 41) | (90, 71, 42) | `16` |
| 13 | valeur de bande — 'm' de modérée/majeure | 29 px de large, 18 px de hauteur d'x, départ x=139 | 29 px, 18 px, départ x=138 | `11` |
| 14 | tampon — angle et centre vertical | −19,52°, centre à 50,0 % de la carte | −20,06°, centre à 49,9 % | `06` |
| 15 | titre ATTÉNUÉ sous la plaque du tampon | (171, 161, 141) → 2,02:1 | (171, 162, 140) → 2,00:1 | `28` |
| 16 | médaillon de chaleur — centrage | centre x=539,0 | centre x=539,5 | `23` |
| 17 | coin haut-droit de la carte (cachet retiré) | 0 px d'encre | 0 px d'encre dans les **6** états | `27` |
| 18 | vert du panneau / papier de la carte | (30,68,47) / (245,238,217) | (21,60,42) / (244,237,216) | `02` |

Garde anti-vide exigée par le dossier : les 14 captures sont à **98,9 – 100,0 %** de pixels non
noirs (plancher 5 %) ; contrôle négatif d'un cadre noir fabriqué : 0,0 % (`01`).

---

## 0. L'écran, tel que la maquette le dit

**But.** ④ : trancher la décision du jour. On y vient pour choisir entre **deux** options, chacune
assortie d'une conséquence écrite en toutes lettres — c'est un écran de *décision informée*, pas
d'information. ⑤ : savoir ce que le geste a produit, et si la décision du jour est consommée.

**Ordre de lecture.** (1) Le titre or de la carte du jour, le seul gros texte ; (2) la rangée des
deux boutons — l'un plein or (l'action), l'autre détouré (l'abstention) ; (3) les deux conséquences,
une sous chaque bouton, qui ferment le choix. La bande « PORTÉE / URGENCE » et le libellé
« CE QU'ON PEUT FAIRE » sont des repères, pas des étapes. Après le geste : (1) le grave en
capitales espacées (« VOUS AVEZ TRANCHÉ »), (2) la carte de papier tamponnée, (3) le mot-or qui
raconte, (4) la ligne-or de sortie.

**Zones.** Chrome haut (argent / médaillon de chaleur / jour) · scène 3D · panneau de l'écran
(bleu nuit avant le geste, **vert de table de jeu** après) · carte de papier crème (après le geste
seulement) · jeton doré et son état · pied (mot-or, filets, ligne-or, sous-ligne) · bandeau
d'onglets.

**Traits d'identité.** (a) Le passage du **bleu nuit au vert de feutre** quand la décision est
prise ; (b) la **carte de papier** crème, inclinée, à liseré d'or, avec son losange ♦ TACTIQUE ;
(c) le **tampon « TRANCHÉE »** oblique, posé à cheval sur la carte, qui voile le titre sans
l'effacer ; (d) le **jeton** doré « votre grande décision du jour » ; (e) la **symétrie à deux
colonnes** de l'étage avant le geste : un bouton, une conséquence, deux fois.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour l'après-geste ⑤, non tout à fait pour ④. Les six états d'après-geste sont, à l'œil et à
l'instrument, la maquette : même vert, même papier, même or (242,201,106 contre 242,201,107), même
tampon à l'angle et au centre près, même jeton au pixel près, même atténuation du titre sous la
plaque (2,00:1 contre 2,02:1). Le but, l'ordre de lecture et les cinq traits d'identité sont
intacts ; le coin haut-droit est propre dans les six états (0 px d'encre), donc rien ne subsiste du
cachet de cire.

Sur ④ en revanche, le cinquième trait d'identité — la symétrie à deux colonnes — est rompu. La
maquette aligne tout sur une seule couture verticale : la gouttière des boutons (centre x=539,5) et
celle des conséquences (centre x=546,5) ne diffèrent que de 7,0 px. En jeu, la gouttière des
conséquences part à x=670,5 alors que celle des boutons est à x=528,0 : **142,5 px d'écart**. Le
paragraphe de gauche, large de 552 px contre 381, dépasse de 139 px le bord droit de son bouton et
court sous le bouton droit ; celui de droite commence 146 px après le bord gauche du sien ; la
gouttière qui sépare les deux conséquences tombe de 90 px (25,00 CSS) à 36 px (10,00 CSS), −60 %.
Le lien « cette option → cette conséquence » cesse d'être porté par la géométrie. C'est le seul
écart de l'écran qu'un joueur perçoit, et il touche exactement ce que l'écran sert à faire.

Les douze autres écarts sont des nuances de craft, toutes sous le seuil du premier regard : un pied
comprimé de 2 à 3 px CSS par interligne, des filets-or passés d'olive à or franc, un tampon 15 %
plus petit qui ne déborde plus de la carte, une étiquette « TACTIQUE » 30 % trop grande et son
losange passé à côté du mot au lieu d'au-dessus. Aucune ne change la lecture. Côté contraste, **tout
passe le plancher** : le plus bas mesuré est la pastille « DÉJÀ TRANCHÉE » à 4,68:1 (plancher 4,5),
puis « PRIS » à 5,50:1 et la sous-ligne grise à 5,52:1.

---

## 3. Écarts — la table

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` **A/B** | `MAJEUR` | `NOUVEAU` | **④ H01 — la conséquence n'est plus sous son option.** La couture verticale qui sépare les deux options saute de 142,5 px entre l'étage des boutons et celui des conséquences ; la colonne gauche déborde sous le bouton droit et la gouttière entre les deux textes est coupée de 60 % | gouttière des **boutons** : réf x=[526..553] l=28 px centre **539,5** / jeu x=[514..542] l=29 px centre **528,0**. Gouttière des **conséquences** : réf x=[502..591] l=90 px (25,00 CSS) centre **546,5** / jeu x=[653..688] l=36 px (10,00 CSS) centre **670,5**. **Décalage des deux coutures : réf +7,0 px (+1,94 CSS, +0,65 % de la largeur d'écran) · jeu +142,5 px (+39,58 CSS, +13,19 %)**. Largeur des blocs : réf **381 et 350 px** (105,83 / 97,22 CSS) · jeu **552 et 289 px** (153,33 / 80,28 CSS). Le bloc gauche finit à x=652 alors que son bouton finit à x=513 (**+139 px de débord**) ; le bloc droit commence à x=689 alors que son bouton commence à x=543 (**+146 px**). Stable aux seuils 55 / 95 / 130, et **identique au pixel en 1080×1920** (même 552/289, même gouttière 36 px, même centre 670,5). Script `29` (qui corrige les chiffres de `19`/`20`/`21`, dont la fenêtre en Y coupait la 1ʳᵉ ligne du bloc) | la cause : je mesure des pixels, pas une feuille de style. Le fait que les deux boutons soient aussi inégaux (`F2`) **désigne** une rangée dimensionnée par le contenu plutôt qu'en deux moitiés égales, mais je ne peux pas l'affirmer depuis l'image |
| `F2` C | `MINEUR` | `NOUVEAU` | ④ H01 — les deux boutons n'ont pas la même largeur ; la maquette les fait rigoureusement égaux | réf : **426 px** (118,33 CSS) **et 426 px** — jeu : **416 px** (115,56 CSS) **et 439 px** (121,94 CSS), soit +23 px (+6,4 CSS) d'écart entre les deux. Hauteur : 135 px (37,50 CSS) réf / 129 px (35,83 CSS) jeu. Script `19` | idem `F1` : cause non lisible depuis l'image. Même note : les deux écarts tiennent probablement ensemble |
| `F3` C | `MINEUR` | `NOUVEAU` | ④ H01 — les étiquettes « PORTÉE » / « URGENCE » flottent au-dessus de la ligne de base de leur valeur, au lieu de la partager | base du label PORTÉE / base du 'm' de la valeur (glyphe sans jambage) : **réf 1033 vs 1034 → 1 px** ; **jeu 1450 vs 1462 → 12 px (3,33 CSS)**. Idem pour URGENCE. La hauteur de capitale du label est 22 px des deux côtés : le décalage vaut 55 % de sa propre capitale. Scripts `18`, `19` | — (la 1ʳᵉ mesure, prise sur « majeure »/« pressante », lisait le bas du jambage j/p : corrigée en `19`) |
| `F4` C | `MINEUR` | `NOUVEAU` | ⑤ — les deux filets-or du pied changent de famille de teinte : olive (R≈G) dans la maquette, or franc (R≫G) en jeu | couleur **résultante** au centre du trait, sur un vert de même luminance (fond 26 réf / 26-31 jeu) : **réf (89, 93, 54) et (87, 89, 51)** · **jeu (149, 129, 70) et (149, 127, 68)**. ΔR +60, ΔG +36, ΔB +16. Épaisseur 3 px des deux côtés ; longueur 988 px (274,4 CSS) réf / 1010 px (280,6 CSS) jeu. Script `15` | l'écart est systématique et de même signe sur les **deux** filets ⇒ erreur de **modèle** (composition d'une translucidité) plutôt que deux réglages ratés. Je ne peux pas, depuis l'image, dire quelle opacité a été recopiée |
| `F5` C | `MINEUR` | `NOUVEAU` | ⑤ G01/G06 — le tampon « TRANCHÉE » est plus petit et ne chevauche plus le bord de la carte : il n'est plus « posé à cheval », il est posé dedans | encre rouge du tampon : **réf 660 × 354 px (183,3 × 98,3 CSS)** · **jeu 609 × 302 px (169,2 × 83,9 CSS)**, soit −7,7 % en largeur et **−14,7 % en hauteur**. Rapport au cadre : 1,142 et 0,468 de la carte (réf) contre 1,032 et 0,411 (jeu). **Débord hors de la carte : réf +42 / +40 px (11,7 / 11,1 CSS) · jeu +9 / +10 px (2,5 / 2,8 CSS)**. Angle et centre vertical ÉGAUX (contrôle positif n° 14). Script `06` | — (contrôle négatif passé : le détecteur est muet sur cadre 7 et G05, qui n'ont pas de tampon) |
| `F6` C | `MINEUR` | `NOUVEAU` | ⑤ — le losange ♦ est passé **à côté** de « TACTIQUE » au lieu d'être **au-dessus**, et le libellé est nettement plus grand | réf : deux bandes, losange à [5,4 %..10,3 %] de la hauteur de carte (38 × 30 px) **puis** TACTIQUE à [11,6 %..14,0 %] — jeu : **une seule bande** à [4,0 %..9,8 %], losange 33 × 25 px **en ligne** avec le mot. Libellé : **réf 117 px de large, capitale 15 px** · **jeu 148 px, capitale 19-20 px** (+26 % / +30 %) ; le pas entre lettres ne bouge presque pas (17 px → 18 px), donc l'interlettrage relatif se resserre d'autant. Scripts `08`, `09`, `11` | — |
| `F7` C | `MINEUR` | `NOUVEAU` | ⑤ — « votre grande décision du jour » passe du gris-vert froid au beige chaud, alors que la sous-ligne voisine, elle, garde le gris froid juste : glissement de jeton sur un seul élément | **réf (142, 167, 151) et (141, 166, 144)** — G > R de 25 · **jeu (185, 173, 146)** — R > G de 12. Témoin dans la même image : sous-ligne « Rien d'autre à trancher… » **réf (139, 161, 146)** / **jeu (141, 163, 149)** = ÉGAL. Contraste du petit texte : 4,94:1 réf / 5,67:1 jeu — au-dessus du plancher des deux côtés. Scripts `16`, `17` | — |
| `F8` C | `MINEUR` | `NOUVEAU` | ⑤ — le mot d'état (LIBRE / PRIS) est collé sous le jeton, et il est plus étroit à hauteur égale | écart disque → mot : **réf 29 px (8,06 CSS)** · **jeu 9 px (2,50 CSS)**, −69 %. « LIBRE » : **réf 102 px de large, capitale 21 px** · **jeu 86 px, capitale 20 px** (−16 % de chasse à taille égale). Écart mot → petit texte : 22 px (6,11 CSS) réf / 14 px (3,89 CSS) jeu. Le **disque** lui-même est identique (contrôle positif n° 1). Script `17` | l'état **« fermée aujourd'hui »** n'est pas capturé : je ne juge que « libre » et « pris » |
| `F9` C | `MINEUR` | `NOUVEAU` | ⑤ — le pied du panneau est comprimé entre ses éléments, alors que ses marges externes sont conservées | écarts verticaux (cadre 7 ↔ G05, même état, pas de tampon) : mot → filet 1 **33 px (9,17 CSS) → 29 px (8,06)** ; filet 1 → RETOUR **33 px (9,17) → 24 px (6,67)** ; RETOUR → sous-ligne **28 px (7,78) → 16 px (4,44)**, −43 % ; sous-ligne → filet 2 **33 px (9,17) → 24 px (6,67)**. Marge externe conservée : filet 2 → bas du panneau 44 px (12,22) → 43 px (11,94). Script `26` | — |
| `F10` C | `MINEUR` | `NOUVEAU` | ⑤ — le passe-partout crème entre le bord de la carte et son filet d'or est trois fois plus mince : le bord se lit comme un cadre doré plutôt que comme un tirage à marge | profil transversal du bord gauche et du bord haut : **réf** [bord sombre ~3 px][**crème 13-14 px (3,6-3,9 CSS)**][or (176,141,62) 3 px][papier] · **jeu** [bord or sombre ~5 px][**crème 5 px (1,4 CSS)**][or (176,141,62) 3 px][papier]. Le filet d'or lui-même est identique (contrôle positif n° 11). Script `25` | — |
| `F11` C | `MINEUR` | `NOUVEAU` | ⑤ — le bloc de titre de la carte est posé plus bas dans le papier | capitale du 'D' de la ligne 1, en % de la hauteur de carte : **réf [36,2 %..41,3 %]** · **jeu [41,7 %..47,0 %]**, soit **+5,5 points ≈ 40 px ≈ 11,2 CSS** plus bas. Par rapport au centre de la zone libre (sous TACTIQUE, au-dessus du trait) : réf 3,1 points **au-dessus**, jeu 3,7 points **en dessous** (≈ 6,8 points ≈ 14 CSS de basculement). La **taille** du titre est identique (contrôle positif n° 2). Scripts `08`, `10` | — |
| `F12` C | `MINEUR` | `NOUVEAU` | ⑤ — la carte de papier est un peu plus large et plus courte | **réf 585 × 757 px (162,5 × 210,3 CSS)**, rapport l/h **0,773** · **jeu 597 × 733 px (165,8 × 203,6 CSS)**, rapport **0,814** (+5,3 %). Marge gauche 107 px (29,7 CSS) réf / 100 px (27,8 CSS) jeu. Mesuré sur la paire sans tampon (cadre 7 ↔ G05/G03). Script `04` | — (les détecteurs du script `03` ayant raté leur contrôle négatif, tous leurs chiffres sont jetés ; `04` les remplace) |
| `F13` C | `MINEUR` | `NOUVEAU` | ⑤ — « TACTIQUE » est d'un rouge plus saturé | **réf (153, 74, 59)** · **jeu (147, 64, 42)** : ΔG −10, ΔB −17 (au-delà du plancher de bruit de 6/255 ; ΔR −6 y est). Contraste 5,34:1 réf / 6,14:1 jeu, les deux au-dessus du plancher. Script `16` | — |

### Écarts ASSUMÉS du dossier — vérifiés « rendus proprement », ce ne sont pas des défauts

| assumé | ce que montre l'image |
|---|---|
| pointillé `.prop` non rendu (sous « CE QU'ON PEUT FAIRE » et sous les conséquences) | absent, et **rien ne le remplace** : pas de trou, pas de soulignement de repli, pas de décalage de ligne. L'espacement du titre de section est par ailleurs juste (417 px réf / 412 px jeu, même centre) |
| geste `skip` non dessiné, « Pas maintenant » retiré | H01 ne montre que **2** gestes, conformes au journal |
| amorce « Rien n'est parti : » (TD-937, cadre 7) | **présente** en tête du mot rouge de G05, dans la même couleur que la maquette (255,179,158) |
| `superseded` → 404 « Cette carte n'est plus là. » | rendu en G04, sans grave — et **sans trou** à la place du grave : la carte remonte proprement sous le bord du panneau |
| jeton : 3 états sans chiffre contre 1 dessiné | « libre » (or 242,201,106) et « pris » (gris chaud 168,159,133, contraste 5,50:1) sont bien différenciés à l'œil ; « fermée aujourd'hui » non capturé |
| pastille `.deja` absente de la maquette | présente en G03, **dans** la carte, lisible à **4,68:1** (plancher 4,5) |
| cachet de cire retiré en après-geste | **0 px d'encre** dans le coin haut-droit de la carte, dans les 6 états (contrôle positif n° 17) |
| mots bannis / codes bruts | lecture des 14 images : ni « session », ni « structurelle » (y compris en **G06**, dont l'écran n'affiche que « C'EST NOTÉ » / « Rien ne bouge. On en reparlera si ça empire. »), ni code, ni enum |

Le `journal.tsv` concorde avec les images sur les 7 états (grave, mot, tampon, pastille, ligne-or,
sous-ligne, jeton) : aucune divergence journal ↔ image à signaler.

---

## 5. Autres résolutions

**1080×2400 (téléphone 20:9) — la résolution jugée en détail ci-dessus.** Rien de coupé, rien hors
cadre, rien qui déborde du panneau.

**1080×1920 (art natif).** Tient. Le panneau est **ancré en bas** et la mise en page est identique
au pixel près : pour chacun des 6 états, le bas du panneau est au **même** écart du bord d'écran en
1920 et en 2400 (230, 227, 225, 225, 227, 227 px), la carte occupe les mêmes x et la même hauteur
(ex. G01 : x=[104..693], h=734 px dans les deux), le tampon a le même bbox relatif, et les libellés
du bandeau d'onglets sont au pixel identique (646 px, centre 530,5). Seule la hauteur de décor
visible au-dessus du panneau change — ce qui est le comportement attendu. Script `24`.

**Écart propre à une résolution : aucun.** `F1` en particulier est **identique au pixel** en 1920 :
couture des boutons 528,0, couture des conséquences 670,5, décalage +142,5 px, blocs 553 et 289 px,
gouttière 36 px — exactement les valeurs du 2400 (script `29`). Ce n'est donc pas un problème de
reflux : la rangée est bâtie pareil aux deux résolutions.

---

## 6. Non vérifié

1. **Les pastilles VIDES de PORTÉE / URGENCE.** La maquette montre des anneaux creux (2/3 et 1/3) ;
   la carte capturée est à 3/3 et 3/3, toutes pleines. Je n'ai donc **aucune** image de l'anneau
   creux côté client. *Ce qui trancherait : une capture avec portée et urgence non maximales.*
2. **L'étage « ligne de file » de ④.** Le cadre 5 montre une carte de file (« Lt. Ilm attend vos
   ordres… TRANCHER ») ; H01 montre la file **vide** (« Aucune exception en attente / Personne ne
   fait la queue »). Deux états différents : cette zone n'est pas jugée. *Ce qui trancherait : une
   capture de ④ avec une file non vide.*
3. **Le décor 3D.** La maquette peint un fond ; le jeu rend une scène (enseigne « LE VERGE D'OR »,
   immeubles). Sans contrepartie comparable, et hors du périmètre de ce dossier.
4. **L'inclinaison de la carte.** Mesurée +1,46° sur cadre 7 et +0,65° sur cadre 6 — la **même**
   maquette, donc mon estimateur de bord varie de 0,8°. Les +2,00° mesurés en jeu sont dans cette
   incertitude : **je n'assère pas d'écart**. *Ce qui trancherait : l'angle déclaré dans la source.*
5. **L'animation.** Une seule capture par état. Sans un couple T / T+1 s je ne peux dire ni ce qui
   bouge, ni où l'image se fige. Le dossier le pose comme VOULU ; je n'ai rien classé en écart de ce
   chef.
6. **La géométrie de la pastille « DÉJÀ TRANCHÉE ».** La maquette ne la dessine pas (assumé) : je
   constate seulement qu'elle est dans la carte et lisible. Mon détecteur de pointillé a raté son
   contrôle négatif (il voyait le liseré d'or de la carte) ⇒ **ses chiffres de centrage sont jetés**.
7. **La famille de police.** Une image ne la donne pas. Le `fc-match` du dossier établit la
   substitution côté maquette (Georgia → Noto Serif, Segoe → Noto Sans) ; je n'ai comparé que des
   hauteurs de capitale, et elles coïncident (contrôles positifs n° 2, 3, 6, 7).
8. **Les textes EN.** Aucune capture en anglais ; le fichier de variantes n'est qu'un texte.
9. **La longueur du filet du bandeau HAUT** (841 px réf / 926 px jeu) : le filet s'estompe aux
   extrémités, la mesure dépend du seuil ⇒ **non assérée**. Sa **couleur**, elle, est égale
   ((176,141,62) réf / (170,136,60) jeu).
10. **G04 affiche encore la carte** alors que le texte dit « Cette carte n'est plus là. ». Le dossier
    impose que la mise en page des issues sans cadre « suive le cadre 6 », donc je ne peux pas
    trancher si la carte devrait disparaître. *Ce qui trancherait : un cadre de maquette pour le 404.*
11. **Le contour du bouton secondaire de ④** est trop ténu pour un détecteur à seuil élevé : la
    couture des boutons n'est fiable qu'au seuil 60 (script `29`). C'est la valeur retenue pour
    `F1` ; au-dessus de ce seuil l'intérieur vide du bouton détouré se fait passer pour une
    gouttière — c'est exactement ce qui avait faussé la première mesure (`21`).
12. **La maquette a été mesurée « sans texte sous 4,5:1 avant les derniers mots » et non remesurée
    depuis** (dossier § doctrine) : je confirme que **côté jeu** rien ne passe sous le plancher
    (minimum 4,68:1), mais je ne peux pas dire si la maquette elle-même a bougé.

---

## Annexes

### Annexe 3 — correspondance des repères (échelle, offset)

| | référence | capture | rapport |
|---|---|---|---|
| largeur d'image | 1080 px | 1080 px | **1,000** |
| px CSS | 1 CSS = 3,6 px | 1 CSS = 3,6 px | **1,000** |
| offset X mesuré (jeton) | centre x = 882,0 | centre x = 881,5 | **−0,5 px** |
| offset X mesuré (médaillon) | centre x = 539,0 | centre x = 539,5 | **+0,5 px** |
| offset X mesuré (bandeau d'onglets) | centre x = 529,0 | centre x = 530,5 | **+1,5 px** |
| échelle Y (hauteurs de capitale) | 'D' 40 px · RETOUR 25 px · grave 26 px | 40 px · 25 px · 26 px | **1,000** |
| hauteur d'image | 2102 px | 2400 / 1920 px | **sans rapport** — en Y on ne compare que des % de hauteur de carte / de panneau, ou des écarts LOCAUX |

Toute mesure du § 3 cite cette correspondance : les positions X sont comparées en px absolus (1:1
vérifié par trois repères indépendants), les positions Y en % de la hauteur du parent, et les
espacements en px locaux — légitimes puisque l'échelle Y vaut 1,000 sur les hauteurs de capitale.

### Annexe 4 — scripts et instruments

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre, chacun porte son contrôle
positif et son contrôle négatif.

| script | ce qu'il mesure | état |
|---|---|---|
| `01_tailles_et_vide.py` | tailles des 17 images, garde anti-vide | ✅ contrôle négatif passé (noir = 0,0 %) |
| `02_sondes_couleurs.py` | sondes de calibration (vert, papier, ciel) | ✅ |
| `03_geometrie_panneau_carte.py` | 1ʳᵉ tentative carte + jeton | ❌ **RATÉ** — contrôle négatif à 0,374 % (> 0,2) et jeton de « rondeur » 0,26 : le détecteur comptait l'or et les glyphes. **Tous ses chiffres sont jetés**, remplacés par `04` et `05` |
| `04_carte_et_jeton_runs.py` | carte par le plus long run de papier | ✅ muet sur cadre 5 (pas de carte) |
| `05_jeton_erosion.py` | jeton par érosion (rayon 6) | ✅ rondeur 1,000 des deux côtés, muet sur cadre 5 |
| `06_tampon.py` | tampon : bbox, angle, débord | ✅ muet sur cadre 7 et G05 |
| `07_cotes_a_cotes.py` | montages côte à côte (aucun chiffre) | — |
| `08_rythme_interne_carte.py` | bandes d'encre en % de hauteur de carte | ✅ papier vierge = 0 ligne |
| `09_hauteurs_de_capitale.py` | 1ʳᵉ tentative hauteurs | ⚠️ **partiellement RATÉ** : les lignes « grave » et « RETOUR » utilisaient un seuil d'encre SOMBRE sur fond VERT (luminance 50 < 165) — le fond entier passait pour de l'encre. **Ces lignes-là sont jetées** (refaites en `12`/`13`). Les lignes sur papier restent valides |
| `10_glyphes_segmentes.py` | segmentation en glyphes, compte contrôlé | ✅ jette d'office toute ligne dont le compte de lettres ne tombe pas |
| `11_profils_colonnes.py` | profils colonne par colonne | ✅ a corrigé la mesure du 'm' de `09` (jambage de « majeure ») |
| `12_textes_clairs_sur_vert.py` | textes clairs, segmentation | ⚠️ contrôle négatif mal posé (fenêtres tombées sur le mot-or) ⇒ refait en `13` |
| `13_lignes_or.py` | textes clairs par étendue de ligne | ✅ contrôle négatif refait et passé (vert nu = aucune encre) |
| `14_profil_lignes_pied.py` | profil ligne par ligne du pied | ✅ |
| `15_filets_or.py` | filets-or : épaisseur, étendue, couleur résultante | ✅ |
| `16_contrastes.py` | contrastes WCAG sur fond réel | ✅ contrôle négatif 1,03:1 / 1,04:1 sur papier vierge |
| `17_colonne_jeton.py` | disque, mot d'état, petit texte | ✅ retrouve le disque de `05` (deux instruments indépendants) |
| `18_cadre5_H01.py` | 1ʳᵉ passe ④ | ⚠️ 3 fenêtres mordues et 2 bases faussées par les jambages ⇒ corrigé en `19` |
| `19_cadre5_H01_corrige.py` | ④ corrigé : bases, colonnes, boutons | ✅ |
| `20_H01_details.py` | capitales, panneau, bandeau | ✅ |
| `21_couture_deux_options.py` | la couture des deux options + images annotées | ⚠️ contrôle négatif passé, mais sa fenêtre en Y **coupait la 1ʳᵉ ligne** du bloc de conséquence (gouttière 55 px au lieu de 36, bloc gauche 514 px au lieu de 552) ⇒ **ses chiffres sont remplacés par ceux de `29`** ; ses images annotées restent valides |
| `29_couture_corrigee.py` | **mesure définitive** de `F1` : lignes imprimées une par une (aucune tronquée), colonnes séparées, 3 seuils, 2 résolutions | ✅ contrôle positif passé (2400 et 1920 identiques), stable aux seuils 55/95/130 |
| `22_chrome_haut.py` | 1ʳᵉ passe chrome | ❌ **RATÉ** sur le médaillon (érosion rayon 4 : rondeur 0,409 côté réf, 14 px côté jeu). **Jeté**, remplacé par `23` |
| `23_medaillon_et_filet_chrome.py` | médaillon par balayage, filet relatif | ✅ contrôle négatif passé (rien à y=420) |
| `24_resolutions_et_pastille.py` | ancrage du panneau, 1920 vs 2400 | ✅ pour l'ancrage ; ⚠️ le volet « pastille » a raté son contrôle négatif (il voyait les pastilles rondes) ⇒ chiffres de centrage jetés |
| `25_liseres_carte_et_pastille.py` | profils transversaux des liserés | ✅ pour les liserés ; ⚠️ le volet « pointillé » a raté son contrôle négatif ⇒ jeté |
| `26_rythme_pied.py` | rythme vertical du pied | ✅ |
| `27_parasites_et_inclinaison.py` | chasse aux parasites, inclinaison | ✅ pour les parasites (positif 3,35 % / négatif 0) ; l'inclinaison est **non assérée** (voir § 6.4) |
| `28_titre_sous_la_plaque.py` | lisibilité du titre sous le tampon | ✅ contrôle négatif 1,01:1 / 1,06:1, contrôle positif 13,2:1 / 13,0:1 |

**Cinq instruments ont raté quelque chose, et leurs chiffres ont été jetés plutôt que publiés** :
`03` (contrôle négatif à 0,374 % et jeton « rond » à 0,26) · les lignes sur fond vert de `09`
(mauvaise polarité d'encre) · le médaillon de `22` (érosion trop forte) · les volets « pointillé »
de `24` et `25` (faux positifs sur les pastilles rondes et sur le liseré d'or) · la fenêtre en Y de
`21` (1ʳᵉ ligne de conséquence coupée). Chacun a été remplacé par un instrument qui, lui,
discrimine (`04`, `05`, `12`/`13`, `23`, `29`). **Aucun chiffre du § 3 ne provient d'un instrument
qui a raté son contrôle.**

### Annexe 1 & 2 — inventaires

Les fiches de parties sont réparties dans les scripts et leurs sorties : géométrie (`04`, `05`,
`19`, `20`, `22`, `23`), remplissages et couleurs (`02`, `15`, `16`, `17`, `25`), textes et
typographie (`08`, `10`, `11`, `13`, `14`, `20`, `26`), effets (`06`, `28`), relations et rythme
(`08`, `21`, `26`), couche globale (`01`, `16`, `24`). Les montages côte à côte à même échelle sont
produits par `07` et `21`.

### Point de vigilance n° 1 du dossier — réponse chiffrée

« Le tampon ↔ lisibilité du titre de la carte sous la plaque (G01, G06) » : **rendu conforme**. Le
titre est atténué à **(171, 162, 140) → 2,00:1** sous la plaque en jeu, contre **(171, 161, 141) →
2,02:1** dans la maquette, et reste **plein hors de la plaque** (13,01:1 jeu / 13,21:1 réf). Les deux
mondes voilent le titre exactement de la même façon ; aucun écart. Le seul écart du tampon est sa
taille et son débord (`F5`).
