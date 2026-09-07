# Juge visuel ⊥ — ㉚ La chaîne d'appro (« le bon de commande et la conduite qui refoule ») — r1 — 2026-09-07

**Verdict : NON APPROUVÉ**

L'écran en jeu porte le bon contenu et la bonne ossature, mais il **dit au joueur, en français et en
clair, qu'il ne sait pas afficher sa propre section** (« *Des maillons existent, mais cet écran ne sait
pas encore les afficher.* ») ; et il a perdu les trois choses qui faisaient que la maquette est *ce*
bon de commande-là et pas une carte d'interface : le **papier déchiré** (bord perforé + filets
pointillés), la **voix sérif**, et le **fond chaud** — pendant que le CTA, discret dans la maquette,
est devenu un aplat d'or qui domine la moitié basse de l'écran.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les valeurs ci-dessous sont produites par les scripts de `mesures/` (sorties collées en annexe 4).
Repère commun : **1 px CSS = 3,6 px des deux côtés** (`dossier.md` § Échelle) ; les grandeurs sont
données en px de l'image **et** en % de la largeur d'écran ou de la zone de contenu.

| # | grandeur | référence | capture | écart |
|---|---|---|---|---|
| 1 | largeur d'écran | 1080 px | 1080 px | 0 (contrôle de l'échelle) |
| 2 | largeur du bon de commande | 980 px = 90,74 % | 966 px = 89,44 % | **1,30 %** de la largeur d'écran, sous la tolérance de 1,5 % ⇒ ÉGAL |
| 3 | largeur du CTA = largeur du bon | 980 px | 966 px | identique au bon des deux côtés ⇒ même colonne |
| 4 | centrage du bon (marges g/d) | 50 / 50 px | 57 / 57 px | symétrique des deux côtés |
| 5 | nombre de lignes du bon | 4 | 4 | mêmes 4 libellés, même ordre |
| 6 | alignement à droite des valeurs | fin d'encre x = 988-989 | x = 977-978 | callé sur le padding droit des deux côtés |
| 7 | alignement à gauche des libellés | x = 89-91 | x = 101-104 | callé sur le padding gauche des deux côtés |
| 8 | part du VIDE dans la zone de contenu | 553 px = **33,3 %** | 668 px = **32,8 %** | 0,5 pt — le vide a la même *taille* (il a changé de *place*, cf. `M3`) |
| 9 | hauteur relative du CTA | 105 px = 6,3 % | 137 px = 6,7 % | 0,4 pt |
| 10 | contraste des valeurs noires sur le papier | 12,84:1 | 13,52:1 | tous deux ≫ 4,5:1 |
| 11 | contraste du titre | 13,12:1 | 17,12:1 | tous deux ≫ 3:1 |
| 12 | famille des textes que la maquette pose en **DejaVu Sans** (sous-titre, valeurs du bon, libellés, CTA) | Sans | **Sans** | l'oracle de forme (`12_`) élit la même famille des deux côtés sur 4 chaînes |
| 13 | langue affichée | — | **100 % français**, 0 clé i18n brute, 0 repli anglais | conforme à la doctrine |
| 14 | gouttière haute | — | 1ʳᵉ encre de contenu y = 217 > bandeau 143 | rien sous le bandeau |
| 15 | gouttière basse | — | dernière encre y = 1511 < dock 2180 | rien sous le dock |
| 16 | témoin `.tel.chaud` du bandeau (filet `--braise` 224,102,74) | — | mesuré **(220,101,73)** à y = 141-142 | Δ ≤ 4/255 ⇒ le bandeau est bien dans sa variante BRÛLANT, pas un laiton faux |
| 17 | 1ʳᵉ chose que l'œil rencontre | le papier crème (22,9 % de l'aire, L = 231) | le papier crème (18,3 % de l'aire, L = 224) | inchangé |
| 18 | hauteur du bandeau *(contre le canon HUD, 1176 px = 392 CSS, facteur 0,91837)* | filet à y = 153 ⇒ attendu **140,5** | filet à y = **141** | **+0,3 %** |
| 19 | diamètre extérieur du médaillon | 192 px ⇒ attendu 176,3 | 182 px | +5,7 px = +3,2 % — **sous la tolérance** (1,5 % de 1080 = 16,2 px) |
| 20 | centrage horizontal du médaillon | 587,5/1176 = **0,4996** | 539,5/1080 = **0,4995** | 0,0001 |
| 21 | débordement du médaillon sous le filet | 57 px ⇒ attendu 52,3 | 58 px | +5,7 px, cohérent avec le diamètre |
| 22 | **piste de la jauge ARGENT** | or 48..198 + gris 199..269 ⇒ piste **222 px** ⇒ attendue **203,9** | or 176..379 = **204 px**, aucun reliquat gris | **+0,1 px** — la piste n'est pas absente, elle est **PLEINE à 100 %** (montant à 9,6 M) |
| 23 | alignement à droite de l'aile droite | lignes finissant à x 1120 / 1124 ⇒ attendu 1028,6 / 1032,2 | 1033 / 1033 | +4,4 px / +0,8 px |

> **Une sonde a failli produire un faux finding ici.** Bornée à x < 440, elle voyait « or 176..379,
> aucun gris » et concluait *« la jauge a perdu sa piste »*. La piste attendue vaut 222 × 0,91837 =
> **203,9 px** et la barre or mesure **204 px** : la piste est là, elle est simplement **entièrement
> remplie**. Un « absent » ne se déclare qu'après avoir calculé ce que « présent et plein » aurait donné.

**Calibrage de l'instrument** — les 9 aplats de la référence retrouvent **exactement** l'hexadécimal
écrit dans la CSS de `ecrans-brennar-6.html` : `#1e1b16` · `#3a352c` · `#efe7d6` · `#a8402f` ·
`#cbbfa4` · `#141a21` · `#2c3640` · `#241c11` · `#5a4a2a` (script `13_`). C'est ce qui autorise à
lire les écarts de la capture comme des écarts réels.

---

## 0. L'écran, tel que la maquette le dit

**But.** On vient ici *commander de la matière première* — et surtout comprendre **pourquoi ça ne
vient pas**. L'écran est un **bon de commande** posé sur une table : il dit ce qu'il reste, ce que ça
coûte, et dans quel état est la relation avec le fournisseur. Le geste au bout est unique et payant.

**Ordre de lecture.**
1. **Le papier crème** — la seule grande surface claire (22,9 % de l'aire du panneau, L = 231 contre
   L ≈ 20 pour le fond). L'œil ne peut pas commencer ailleurs.
2. **Le bandeau rouge brique** dans le papier (« Il y a une pénurie en ville ») — la seule couleur
   saturée de l'écran, 8,2 % de l'aire. C'est la cause, et elle est donnée en une phrase.
3. **Le titre sérif** au-dessus, sur une bande légèrement plus claire séparée par un filet.
4. **En bas, sur une plaque bleu-gris détachée** : la phrase du lieutenant, puis le bouton — un
   rectangle **cerné d'or sur fond sombre**, avec sa mise en garde chuchotée à droite.

**Zones.** (a) chrome évoqué (bandeau + scène de district assombrie, hors jugement) ; (b) l'entête
titre + sous-titre sur `#1e1b16`, fermée par un filet `#3a352c` ; (c) le corps : le bon de commande ;
(d) un vide franc de 33 % ; (e) la plaque de décision `#141a21` ancrée en bas.

**Traits d'identité** — les cinq choses qui font que c'est *cet* écran :
1. **Le papier est déchiré** : bord bas perforé (bande de 18 px, période 28,8 px, `#cbbfa4`) et
   **4 filets pointillés** entre les lignes. C'est un document, pas une carte.
2. **La voix sérif** : titre, nom du produit et citation en DejaVu Serif ; tout le reste en sans.
3. **Le sol est chaud et les voix sont distinctes** : dégradé brun-noir (L 24,2 → 18,2), encres
   secondaires kaki (`#9a8f78`, `#7a6d58`, `#8a7f6b`, `#8a8069`) et **quatre valeurs différentes**
   pour le sous-titre, la citation, le nom du lieutenant et le titron.
4. **Le rouge d'alerte est une terre cuite** `#a8402f`, jamais un rouge d'écran.
5. **Le geste est discret et ancré en bas** : cerné, pas rempli ; et il s'excuse à voix basse
   (« ça part du compte tout de suite »).

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le but reste lisible : on reconnaît le bon de commande, les quatre lignes, la phrase du lieutenant,
le bouton. **L'ordre de lecture, lui, a changé au deuxième rang.** Dans la maquette, la deuxième
chose que l'œil rencontre est la **brique rouge de la pénurie** — la cause. Dans le jeu, il n'y a
plus une seule surface rouge (0 % contre 8,2 % de l'aire) et à sa place, à 8 % de l'aire, il y a un
**aplat d'or plein** : le CTA. Le joueur lit donc « papier → gros bouton » au lieu de « papier →
pourquoi c'est bloqué → geste ». La décision passe devant la raison.

Le troisième rang est pire : entre le papier et la citation, l'écran écrit **« Des maillons existent,
mais cet écran ne sait pas encore les afficher. »** — 10,76:1 de contraste, le texte courant le mieux
contrasté de la page, au milieu du chemin de lecture. Ce n'est pas un vide qui « plafonne et bloque » :
c'est un écran qui s'annonce inachevé. Et sous le bouton, un tiers de l'écran (668 px) reste noir,
parce que la plaque de décision n'est plus ancrée en bas — dans la maquette le vide *précède* la
décision, ici il la *suit*.

Enfin, l'identité : sur cinq traits, **quatre sont tombés et le cinquième est retourné**. Le papier n'est plus déchiré (0 filet
pointillé sur 4, pas de bord perforé, pas d'ombre, coins carrés) ; la voix sérif a disparu partout
(titre, « Pyralin », citation : l'oracle de forme élit DejaVu **Sans** dans les trois cas — marges de
163 % et 270 % sur le titre et « Pyralin », et sur la citation meilleur sérif 0,545 contre meilleur
sans 0,415, sur deux mots indépendants) ; le sol est passé du brun chaud dégradé à un `#0d0d0d` neutre plat, et **les quatre encres que la
maquette distingue sur ce sol — sous-titre, citation, nom du lieutenant, titron — sortent toutes à la
même valeur `#8a979c`** ; sur le papier c'est l'inverse, tout s'éclaircit, et la terre cuite devient un
corail vif `#ff5a4d` qui tombe à **2,34:1**. Et le cinquième — un geste discret, cerné, ancré en bas — est devenu un aplat plein qui flotte au milieu.

Le type est le dernier ressort commun : les **boîtes** sont à l'échelle (×0,99) mais le **texte** est
à ×1,44 en médiane (titre ×1,52, sous-titre ×1,58). Le titre passe donc de 1 à 2 lignes, l'entête
triple de hauteur, et la ligne 4 du bon se retrouve à 32 px d'écart entre son libellé et sa valeur —
exactement le minimum de la maquette.

**Les trois écarts de tête, par impact perçu** : `B1` le bouche-trou avoué au joueur · `M4`+`M3` le
CTA retourné et flottant qui prend la place de la cause · `M6`+`M8`+`M9` la perte du papier-document
(sérif, perforation, pointillés).

---

## 3. Écarts

Un finding par ligne. `dépend des données` = oui quand l'écart pourrait n'être qu'un état de compte
différent (la capture est prise sur un compte de capture, identité **déclarée non relue**).
`destinataire` : **correcteur** = l'écran est en cause · **blender** = la maquette est en retard ·
**user** = arbitrage produit.

| id | gravité | critère | dépend des données | destinataire | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | non | correcteur | **Un bouche-trou de développement est affiché au joueur** : « Des maillons existent, mais cet écran ne sait pas encore les afficher. » Aucun des 6 cadres du groupe ㉚ ne porte cette phrase. Placée entre le bon et la citation, elle est le texte courant le plus contrasté de l'écran. Doctrine « états vides » : un vide qui se lit comme un écran cassé est un défaut de SENS. | bande y = 1153..1216, x = 60..972, 2 lignes, encre `#b8c2cc` sur `#0d0d0d` = **10,76:1** (`13_`, `14_`, `22_`). **Balayage, portée déclarée = les 107 fichiers `.html` de l'atelier**, comptes pris dans un `$( )` : « Des maillons existent » → **0 fichier** · « ne sait pas encore les afficher » → **0 fichier**. Contrôles de la même passe : « Pyralin » → 1 fichier, « bon de commande » → 2, « Commander de la matière première » → 1 (positifs) ; « zzzzzinexistant » → 0 (négatif). Portée resserrée sur `ecrans-brennar-6.html` : « maillons » 2 hits, tous deux dans un **autre** écran ; « ne sait pas encore » 2 hits, tous deux = « on ne sait pas encore » dans les nœuds flous des cadres #50/#51. | — |
| `M1` | MAJEUR | NOUVEAU | **oui** | correcteur ou données | **Le bloc `.penurie` est absent.** C'est la seule surface saturée de la maquette et la phrase qui explique l'écran. La classe « rouge » disparaît de la palette de la capture. | REF : bloc y = 1050..1187 (138 px), `#a8402f` exact, **8,2 %** de l'aire du panneau. CAP : **0 ligne** de classe rouge dans toute la zone de contenu (`02_`, `18_`). | `scarcity_active` est un booléen : je ne peux pas distinguer « l'état est faux sur ce compte » de « le bloc n'est pas implémenté ». Trancherait : une capture sur un compte à `scarcity_active = true`, ou le rapport juge-données. |
| `M2` | MAJEUR | NOUVEAU | non | correcteur | **La plaque de décision `.bas` est absente** : ni le fond `#141a21` (12,7 % de l'aire de la maquette) ni le filet supérieur de 2 px `#2c3640`. Citation et bouton flottent sur le fond de page. | REF : filet y = 1780..1786 `#2c3640`, fond y = 1787..1937 `#141a21`. CAP : fond `#0d0d0d` continu de 1055 à 2179, aucun filet horizontal détecté (`03_`, `17_`, `22_`). | — |
| `M3` | MAJEUR | NOUVEAU | non | correcteur | **Le bloc du bas n'est plus ancré en bas** : le vide est passé d'*avant* la décision à *après*. 668 px (32,8 % de la zone de contenu) de noir sous le CTA ; le bouton n'est plus à portée de pouce. | positions normalisées (0 = haut de zone de contenu, 1 = bas) — REF : bon 0,123→0,473 · **vide 0,473→0,806** · citation 0,833 · CTA **0,901→0,964**. CAP : bon 0,228→0,447 · citation 0,554 · CTA **0,605→0,672** · **vide 0,672→1,000** (`15_`, `16_`). | — |
| `M4` | MAJEUR | NOUVEAU | non | correcteur | **Le CTA est retourné** : aplat d'or plein + encre sombre, au lieu d'un fond sombre cerné d'or avec libellé or. Aucun bord distinct. Il devient l'objet le plus saturé de l'écran (7,7 % de l'aire). | REF : fond `#241c11`, bord `#5a4a2a` (1 px CSS), libellé `#d9ab4e`. CAP : fond **`#d9ab4d`** (= le libellé de la maquette), bord = fond (Δ ≤ 6/255 ⇒ aucun bord), libellé `#221600` (`13_`, `17_`, `18_`). | — |
| `M5` | MAJEUR | NOUVEAU | non | correcteur | **Le libellé secondaire du CTA est absent** (« ça part du compte tout de suite »). La maquette prévient que le geste débite immédiatement ; le jeu ne le dit plus. | encre dans la moitié droite du CTA : REF **2154 px** · CAP **0 px** (`17_`). Présent dans la source, cadre #48 : `<small>ça part du compte tout de suite</small>`. | — |
| `M6` | MAJEUR | NOUVEAU | non | correcteur | **La voix sérif a disparu.** Les 3 éléments que la CSS pose en `'DejaVu Serif'` (titre `.entete h3`, `.bon h4` « Pyralin », citation `.dit`) sont rendus en DejaVu **Sans** par le client. Ce n'est **pas** l'arbitrage de substitution du dossier : la source demande `DejaVu Serif` nommément, et le client embarque cette fonte (`hudSerifFont`). | oracle de forme (gabarit binarisé étiré sur la bbox, chasse neutralisée) : **5 contrôles sur 5 corrects au niveau FAMILLE** (4/5 au niveau de la fonte exacte) — titre REF → SerifBold (marge 82 %), « Pyralin » REF → SerifBold (144 %), citation REF → SERIF, sous-titre REF → SansBook (87 %), « pour le brindle » REF → SansBold (76 %). Capture : titre → **SansBold** (désaccord 0,100 ; marge 163 %), « Pyralin » → **SansBold** (0,089 ; marge 270 %), citation → **SANS** sur deux mots indépendants (`12_`). | La sous-famille exacte (graisse, italique) n'est pas opposable : le 5ᵉ contrôle a élu SerifBoldItal au lieu de SerifItal. Je ne conclus qu'au niveau **famille**. |
| `M7` | MAJEUR | NOUVEAU | non | correcteur | **Le type est sur-dimensionné alors que les boîtes sont à l'échelle** ⇒ le titre passe de 1 à 2 lignes et l'entête triple. | boîtes ×0,99 (largeur du bon 980→966, du CTA 980→966) ; type ×1,44 médian : titre **33→50 px (×1,52)**, sous-titre 19→30 (**×1,58**), « Pyralin » 27→39 (×1,44), « BON DE COMMANDE » 16→21 (×1,31), CTA 25→29 (×1,16), libellé « LE » 17→19 (×1,12). Encre de l'entête : **88 px → 267 px (×3,03)** (`07_`, `21_`). | — |
| `M8` | MAJEUR | NOUVEAU | non | correcteur | **Le bord perforé du bon (`.bon::after`) est absent** — le trait qui fait du bon un document déchiré. | REF : bande y = 1209..1226, **18 px** (= 5 CSS), `#cbbfa4` exact, 63 transitions clair/sombre sur 920 px ⇒ **période 29 px = 8,06 CSS** (la CSS déclare 8 px). CAP : **aucune** bande périodique sous la dernière ligne ; le bon finit à plat à y = 1054 (`04_`). | — |
| `M9` | MAJEUR | NOUVEAU | non | correcteur | **Les 4 filets pointillés entre les lignes du bon sont absents** ; les quatre lignes ne sont plus séparées. | REF : filets à y = 749-751, 817-819, 885-887, 953-955 — 3 px, 302 transitions sur 920 px ⇒ pointillé, `#c3b79e`. CAP : **0 filet** (les 2 seules bandes détectées, y = 974-985 et 988-991, sont les jambages du texte de la 4ᵉ ligne). Contrôle négatif : la même sonde sur une bande de papier nue rend 0 (`04_`). | — |
| `M10` | MAJEUR | NOUVEAU | non | correcteur | **Le contraste des libellés du bon s'effondre** : les quatre intitulés qui disent ce que chaque valeur signifie deviennent presque invisibles sur le papier. Même effondrement sur « BON DE COMMANDE ». | libellés : `#887c6f` sur `#efe7d6` = **3,31:1** → `#c0b59a` sur `#eae0c8` = **1,55:1** (÷2,1). « BON DE COMMANDE » : 3,20:1 → **1,69:1**. Doctrine : ≥ 4,5:1 petits textes (`13_`, `14_`). | La maquette est elle-même sous le seuil (3,31:1) ; l'écart d'écran est le facteur 2,1, pas la conformité absolue. |
| `M11` | MAJEUR | NOUVEAU | non | correcteur | **Le rouge d'alerte change de famille et passe sous le seuil** : terre cuite → corail vif, sur le texte qui porte l'information critique (« il n'y a plus rien · 0 L », « le prix monte »). | `#a8402f` (168,64,47) → **`#ff5a4d`** (255,90,77), Δ = (+87,+26,+30) ; contraste sur le papier **4,96:1 → 2,34:1** (`13_`, `14_`). | — |
| `M12` | MAJEUR | NOUVEAU | non | correcteur | **Sur le fond sombre, quatre jetons distincts de la maquette se rabattent sur UN SEUL gris froid** : sous-titre, citation, nom du lieutenant et titron sortent tous à `#8a979c`. Il ne reste plus aucune hiérarchie chromatique entre parler, citer et nommer. Le sol perd en même temps son dégradé et sa chaleur. | encre, R−B et luminance (script `26_`) : sous-titre `#9a8f78` (R−B +34) → `#8a979c` (−18), **Δ = −52** · titron `#8a8069` (+33) → `#8a979c`, **Δ = −51** · titre `#f0dfc4` (+44) → `#eef1f2` (−4), **Δ = −48** · citation `#cdd6e0` (L 212,8) → `#8a979c` (L 148,6), **Δ L = −64** · nom `#eef3f9` (L 242,4) → `#8a979c`, **Δ L = −94**. **7 parties sur 8 du fond sombre refroidissent.** Fond : dégradé `#1a1815 → #151310 → #131212` (L 24,2 → 19,2 → 18,2 ; R−B +5 → +1) remplacé par l'aplat `#0d0d0d` (L 13,0 ; R−B 0) sur **70,1 %** de l'aire (`13_`, `18_`, `26_`). | — |
| `M13` | MAJEUR | NOUVEAU | non | correcteur | **Sur le papier, le mouvement est inverse et de même signe partout : toutes les encres secondaires s'éclaircissent** — c'est la cause mécanique de `M10` et `M11`. **Δ(R−B) positif sur les 5 grandeurs du papier** ⇒ écart systématique de même signe, donc **une erreur de modèle** (jetons génériques appliqués au papier), pas 5 erreurs. | Δ(R−B) : papier +9 · libellé +13 · étiquette +8 · valeur noire +16 · valeur rouge **+57** (5/5 positifs). Δ luminance des encres secondaires : libellé de ligne **+55,8** · étiquette « BON DE COMMANDE » **+45,7** · valeur rouge **+39,3** (le papier lui-même, lui, s'assombrit un peu : L 231,5 → 224,4 — c'est le contraste qui se referme des deux bouts) (`26_`). | Deux espaces de composition différents (navigateur sRGB / client linéaire) produiraient un écart de ce type ; je ne peux pas trancher depuis une image sans une paire de superpositions à opacité connue. |
| `m1` | MINEUR | NOUVEAU | non | correcteur | Le papier du bon est plus jaune. | `#efe7d6` (239,231,214) → `#eae0c8` (234,224,200) ; Δ bleu = **−14/255** (tolérance 6) (`13_`). | — |
| `m2` | MINEUR | NOUVEAU | non | correcteur | Bon et CTA ont des **coins carrés** là où la maquette les arrondit. | retrait du bord sur 24 lignes du coin haut-gauche : bon REF **5 px** (CSS 2 px = 7,2) → CAP **0** ; CTA REF **8 px** (CSS 3 px = 10,8) → CAP **0**. Contrôle négatif sur un bord droit : 0 (`20_`). | — |
| `m3` | MINEUR | NOUVEAU | non | correcteur | **Pas d'ombre portée sous le bon** : le papier ne pose plus sur la table. | REF, luminance médiane sous le bord bas : 15,0 à d = 1 px, remontant à 18,3 à d = 22 px (fond ≈ 20) ⇒ excès ≈ 5/255, portée ≈ 22-30 px. CAP : **13,0 à toutes les distances de d = 1 à d = 22** (`20_`). | Le fond de la capture est `#0d0d0d` : une ombre y est **physiquement** irreprésentable. L'absence peut être une conséquence de `M12`, pas une omission indépendante. |
| `m4` | MINEUR | NOUVEAU | non | correcteur | **La bande d'entête et son filet sont absents** : le titre ne repose plus sur `#1e1b16` et n'est plus fermé par le filet `#3a352c`. | REF : bande y = 439..603 `#1e1b16`, filet y = 604..606 `#3a352c`. CAP : `#0d0d0d` au-dessus du titre **et** sous le sous-titre (Δ = 0/255), aucun filet horizontal entre y = 560 et 607 (`17_`). | La bande elle-même n'est qu'à 4/255 du fond dans la maquette : c'est le filet qui se voit — d'où MINEUR et non MAJEUR. |
| `m5` | MINEUR | NOUVEAU | non | correcteur | « BON DE COMMANDE » n'est plus aligné sur la **ligne de base** de « Pyralin » (la CSS déclare `align-items:baseline`) : il flotte vers le haut. | bas de capitale : REF 710 / 710 = **0 px** ; CAP 693 / 670 = **23 px** (`23_`). | — |
| `m6` | MINEUR | NOUVEAU | non | correcteur | Le **nom du lieutenant perd sa distinction** : dans la maquette `.dit b` est droit, gras et plus clair que la citation ; dans le jeu il est de la même couleur et du même style que le reste. | REF : « Lt. Kane » `#eef3f9` vs citation `#cdd6e0` (Δ ≈ 33/255, et style droit). CAP : « Nestor » `#8a979c` = citation `#8a979c` (**Δ = 0**) (`13_`). | — |
| `m7` | MINEUR | NOUVEAU | non | correcteur | Marges internes du bon plus grandes. | padding gauche 41 → 48 px (11,4 → 13,3 CSS, **+17 %**) ; padding haut 41 → 47 px (+15 %) ; pas des lignes 68 → 75 px (+10 %) (`17_`, `21_`). | — |
| `m8` | MINEUR | NOUVEAU | non | correcteur | La **4ᵉ ligne du bon est à la limite de la collision** : libellé et valeur ne sont plus séparés que par le `gap` minimal. | écart libellé→valeur, ligne 4 : REF **195 px** → CAP **32 px** (le `gap:9px` de la CSS vaut 32,4 px) (`23_`). Conséquence directe de `M7`. | — |
| `m9` | MINEUR | NOUVEAU | non | correcteur | Le titron **« LA CHAÎNE, EN REMONTANT » est en trop dans l'état nominal** : dans la maquette il n'existe que dans les cadres #50, #51 et #52, jamais dans #48. | bande y = 1104..1126, x = 60..512 (`22_`). Source (portée : `ecrans-brennar-6.html`, compte pris dans un `$( )`) : « en remontant » rend **3** hits, aux cadres #50/#51/#52 seulement — aucun dans #48. Même cause que `B1`. | — |
| `m10` | MINEUR | NOUVEAU | **oui** | correcteur (chrome) | **Le bandeau est à 3 px de la collision** : la valeur ARGENT s'arrête à 3 px de l'anneau du médaillon. Le montant suivant plus long passera dessous. | encre or de la valeur : dernière colonne **x = 446** ; anneau du médaillon à la hauteur du centre : **x = 449** ⇒ **3 px**. Le « € » n'est pas coupé (profil vertical régulier jusqu'à x = 446, 0 à x = 447) (`25_`). **Contre le canon** : la valeur s'y arrête à x = 231 et l'anneau commence à x = 492 ⇒ dégagement **260 px**, soit **238,8 px attendus** en capture. Mesuré : **3 px**. Décomposition : −133 px de décalage du bloc ARGENT (`m12`) et −101 px de valeur plus longue (268 px contre 167 attendus) ⇒ −234, il reste 5 ≈ 3 px mesurés (`29_`, `30_`). | Quelle part vient du montant et quelle part du décalage dépend du compte : sur un compte à 5 chiffres la valeur tiendrait. Trancherait : une planche sur un compte au montant du canon. |
| `m11` | MINEUR | NOUVEAU | **oui** | correcteur (chrome) | **L'aile droite ne montre ni la phase ni l'heure.** Le canon met le jour ET la phase sur la 1ʳᵉ ligne, puis l'heure sur la 2ᵉ ; la capture met le jour seul, puis un tiret. La phase manquante est couverte par la table ASSUMÉ — **l'heure ne l'est pas** : la règle du dossier parle du tiret « à la place de la phase », or dans le canon ce slot porte l'heure. | canon : « JOUR 12 · SOIRÉE » x 832..1120 (289 px) + « 21:40 » x 1023..1124 (hauteur d'encre 31 px). capture : « JOUR 50 » x 940..1033 (94 px) + « — » x 999..1033 (hauteur d'encre **3 px**). L'alignement à droite, lui, est juste : 1033 mesuré contre 1028,6 et 1032,2 attendus (`29_`, `30_`). | Si le client place la phase dans le slot que le canon réserve à l'heure, alors une seule information manque et non deux. Trancherait : une planche prise **en district**, où la phase est alimentée. |
| `m12` | MINEUR | NOUVEAU | non | user (chrome) | **Le bloc ARGENT est poussé de 133 px vers la droite** par un glyphe que le canon n'a pas (une flèche retour, x 82..104, y 66..78). C'est la cause directe de `m10` : sans ce décalage la valeur ne serait pas à 3 px du médaillon. | bord gauche du bloc ARGENT : canon x = 48 ⇒ attendu **x = 44,1** ; capture **x = 177** — écart **+132,9 px = +12,3 % de la largeur d'écran**. Encre claire dans x 0..170 : canon **1351 px** (le libellé ARGENT lui-même) · capture **99 px** (un glyphe isolé) (`29_`, `30_`). | Je ne sais pas si une flèche retour est **voulue** sur un écran atteint depuis « Plus » — c'est un arbitrage, pas une mesure. Le canon HUD est celui de l'écran principal, qui n'a pas de retour à faire. |

**Mesure rétractée.** Mon premier instrument (`19_`) annonçait un **chevauchement de −20 px** et
366 px d'encre sous le médaillon. Il était faux : sa sonde « braise » comptait le **filet du bandeau**
(y = 141-142, pleine largeur) comme un bord de médaillon. `25_` le remplace, avec un contrôle positif
(la traversée à y = 110 doit rendre exactement 2 intervalles symétriques autour de x = 540 : elle rend
`(449,451)` et `(628,630)`) et un contrôle négatif (traversée à y = 300 hors médaillon : 0). Verdict
corrigé : **pas de chevauchement, 3 px de dégagement**.

### Écarts qui dépendent des DONNÉES (observation datée, pas un défaut de forme)

Compte de capture, identité **déclarée par corps de commit, non relue** ⇒ aucune de ces valeurs n'est
opposable ; elles sont listées pour que personne ne les compte comme des écarts de forme.

| ce que montre la maquette (cadre #48) | ce que montre la capture | lecture |
|---|---|---|
| `Lt. Kane :` | `Nestor :` | nom projeté ; la citation est **identique au mot près** |
| `il n'y a plus rien · 11 – 50 L` | `il n'y a plus rien · 0 L` | `stock_liters_label` ; les deux sont des *labels*, pas des comptes |
| `il vous fait attendre exprès` (rouge) | `il vous prend encore au sérieux` (neutre) | `supplier_pressure_bucket` STRAINED → FRESH ; **le client applique correctement la couleur du bucket** |
| `$ 24 850` · `Jour 12` · `Matin` · `tiède` | `9 627 820,00 €` · `JOUR 50` · `—` · `Brûlant` | état du compte + phase « — » hors district (ASSUMÉ) |
| bloc pénurie présent | absent | cf. `M1` |
| pastille dorée sur l'onglet FAMILLE (canon HUD) | absente | badge de notification ; dépend de l'état du compte |

---

## Table ASSUMÉ

| ce qu'on voit | pourquoi | rendu proprement ? | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|
| Phase de l'aile droite à « — » | Vidée à chaque activation d'onglet, alimentée seulement en district (règle f2 2026-09-06) ; ARGENT et JOUR **sont** alimentés | oui — un tiret cadré, pas un libellé de repli ni « Unknown » | ARGENT ou JOUR eux aussi à « — » ⇒ chrome non alimenté, le chrome ne se jugerait plus |
| La maquette n'a **pas** de dock et remplace le bandeau par une scène de district assombrie | Chrome partagé : le cadre de série 6 dessine des **évocations** à 300 CSS, le shell dessine le vrai chrome à 392 CSS (×2,755) | oui — la comparaison de hauteur bandeau/dock n'est pas faite | un contenu d'écran qui passerait **sous** le bandeau ou le dock (vérifié : non, cf. contrôle positif 14-15) |
| L'illustration d'état vide `etats/vide-maquette-appro.png` n'apparaît nulle part | Aucun écran du client ne monte ces illustrations (0 `Resources.Load`, mesuré par le correcteur) | sans objet | — ; elle sert ici à juger le **sens** voulu du vide : un registre de bons qui attend, calme, rien de perdu — c'est ce sens que `B1` contredit |

## Table ARBITRAGE

| point | lecture | destinataire |
|---|---|---|
| Ronds du dock **sans icône** (4 disques vides) | arbitrage user connu (« j'aime pas les icônes ») — jamais un écart d'écran | user (déjà tranché) |
| La référence affiche `HEAT` et `$ 24 850` | maquette en retard sur le ruling « fr réel » du 2026-09-02 ; le client a raison avec `CHALEUR` et `€` | **blender** (une fois, pour tout le groupe ㉚) |
| L'onglet actif du dock est **EMPIRE** alors que l'écran affiché est la chaîne d'appro | la planche est une **surimpression** : le chemin joueur (Plus) n'est pas exercé, l'onglet actif n'est pas asserté (ligne GO, point (c)) — ce n'est pas jugeable comme un défaut d'écran | — (relève du dispositif de capture) |
| Direction générale : la maquette est **sépia chaud, papier, arrière-salle** ; le jeu est **noir neutre + corail vif + or plat** | Le cadre de style tranché le 2026-09-06 (« sombre, napolitain, mafieux, fin 80s – début 90s ») penche du côté de la maquette. Les écarts de **jeton** sont comptés en `M11`/`M12` ; ce qui reste ici est la question de direction, si l'user veut au contraire un rendu plus froid | **user** |
| 3ᵉ onglet du dock : le canon HUD dit **MARCHÉ**, la capture dit **FILIÈRE** | renommage d'onglet ; le canon peut être en retard, ou l'onglet a changé de nom. Ce n'est pas un écart de *cet* écran | **user** ou **blender** |
| Flèche retour dans le bandeau (`m12`) : absente du canon HUD | le canon est celui de l'écran principal, qui n'a pas de retour à faire ; sur un écran atteint depuis « Plus », une flèche est plausible — mais elle coûte 12,3 % de la largeur au bloc ARGENT | **user** |
| Les silhouettes / couvre-chefs | sans objet : cet écran n'en porte aucun | — |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, `capture-1080x2400.png` (1080×2400, 20:9) — la
1920 est absente (point (a) de la ligne GO : « NON — 2400 seulement »). Rien n'est donc établi sur
le reflux, la coupe ou le débordement à une autre résolution. Voir § 6.

---

## 6. Non vérifié

1. **Deuxième résolution (1080×1920)** — absente du dossier. Rien n'est su du reflux : or le titre
   tient déjà sur 2 lignes à 2400 (`M7`), et le bloc du bas n'est pas ancré (`M3`) — deux raisons de
   penser que 1920 est le cas défavorable. *Trancherait : une capture 1080×1920 du même état.*
2. **Animation** — aucune paire T / T+1 s (point (b) de la ligne GO). Le ruling « aucune animation
   sur un écran neuf » n'est **pas vérifiable** sur une image unique. *Trancherait : deux captures du
   même état à 1 s d'intervalle, et le compte de pixels différents hors chrome.*
3. **Géométrie du dock — et une accusation que je retire.** Une première version
   de ce rapport déclarait `hud-canon-1176.png` **absent du dossier** et en tirait un « défaut de
   dossier ». **C'était faux, et je le retire** : le fichier est bien là (lien vers
   `Tools/juge-visuel/ecran-principal/ecran-canon.png`, **1176×2091**, 1 728 566 octets — vérifié par
   `test -e` + `readlink -f` + ouverture PIL, après qu'un premier `ls` lu au terminal ne l'a pas
   montré). Le chrome **a donc été jugé** (§ 3, `m11`-`m12`, et 6 lignes du contrôle positif). Ce qui
   reste non vérifié est la **géométrie du dock** : le dock du canon repose sur l'art de la carte, la
   sonde de fond n'y accroche pas, et mes trois premières tentatives ont rendu des valeurs absurdes
   (« 7 ronds », « dock à 0,750 de la hauteur »). *Trancherait : un canon de dock sur fond neutre, ou
   une sonde qui détecte les anneaux par leur trait plutôt que par le fond.*
4. **Identité photographiée** — déclarée par corps de commit (`72 118` · 17 bâtiments · 3 lt ·
   2 planques · 7 cartes), **journal de run non joint**. Aucune valeur de la planche n'est opposable
   à un corps réel. *Trancherait : la ligne `[DemoIdentityResolver] régime=env identité=…` du journal
   du run, jointe au dossier.*
5. **Les cadres d'état #49 à #53 ne sont pas rendus.** Je n'ai comparé que le cadre nominal #48 —
   dont j'ai confirmé qu'il est bien l'homologue (titre, sous-titre, 4 lignes, citation et libellé du
   geste identiques au mot près à la source du cadre #48). Je ne sais donc rien de la conformité des
   5 autres états, ni de ce que l'écran fait quand la chaîne existe vraiment. *Trancherait :
   `Tools/rendre-tel.py ecrans-brennar-6.html 49..53 … 3.6`.*
6. **`M1` (pénurie)** — je ne peux pas séparer « `scarcity_active = false` sur ce compte » de « le
   bloc n'est pas implémenté ». *Trancherait : une capture sur un compte en pénurie, ou le rapport
   juge-données de cet écran (inexistant : écran neuf).*
7. **Le losange d'ornement** (x 531..548, y 217..229, or, 162 px d'encre) sous le médaillon n'existe
   dans aucun cadre de la maquette. Le canon HUD **ne peut pas trancher** : à la position homologue
   (x 578..597, y 236..249 en repère canon) son fond est l'art de la carte, dont les fenêtres
   éclairées rendent 1380 px « or » sur une fenêtre du même ordre — la sonde n'y discrimine rien. Je
   ne sais donc pas s'il appartient au chrome du shell ou à l'écran, et je ne le compte pas comme
   écart. *Trancherait : sa présence sur la planche d'un autre écran de la même campagne.*
8. **Sous-famille de fonte** — l'oracle de forme ne discrimine de façon contrôlée qu'au niveau
   **famille** (serif / sans) : son 5ᵉ contrôle a élu SerifBoldItal au lieu de SerifItal. `M6`
   n'affirme donc que la famille, jamais la graisse ni l'italique exacts du client.
9. **Rect imprimé par le test** — non fourni (log non préservé). J'ai vérifié sur l'image ce qui
   pouvait l'être : largeur 1080, bandeau à 143 px, dock à partir de 2180, 4 groupes de colonnes dans
   le dock — cohérents avec la géométrie dérivée du code par le dossier. Le `scaleFactor` n'est pas
   confirmé indépendamment.
10. **Angle mort déclaré de la capture** : planche prise en **surimpression sous le chrome**, le
    chemin joueur (Plus → LA CHAÎNE D'APPRO) n'est pas exercé. Cette planche ne peut rien dire de
    l'entrée dans l'écran, de la navigation, ni de l'état initial réel.
11. **Positions suspectement rondes** — je n'en ai trouvé aucune : les frontières mesurées (143, 608,
    1054, 1375, 1511, 2180) ne forment ni pas régulier ni multiples d'une maille. Rien n'accuse la
    chaîne de capture ici (contrairement au piège `SnapToScreenPixel` du dossier, qui vise les
    planches de district).
12. **`m3` (ombre)** — mesurée absente **dès d = 1 px** et jusqu'à d = 22 px, donc ce n'est pas un
    « zéro au-delà de la première distance ». Mais sur un fond `#0d0d0d` une ombre est
    irreprésentable : l'absence peut n'être qu'une conséquence de `M12`.

---

## Annexes

### Annexe 1 — Inventaire de la référence (`reference-1080x2102.png`, 1080×2102)

Repère : `.tel` = 300 × 584 CSS rendu ×3,6. `.barre` = 60 CSS (216 px). `.panneau` porte
`.appr6{height:462px}` **collé en bas** ⇒ le panneau occupe **y = 439..2101** (1663 px = 462 CSS).
Toutes les valeurs de la colonne « CSS » sont lues dans `ecrans-brennar-6.html`, et **retrouvées à
l'octet** sur l'image (script `13_`).

| id | catégorie | parent | bbox (px) | forme / remplissage | bord | effet | texte |
|---|---|---|---|---|---|---|---|
| `R0.chrome` | chrome évoqué | `.tel` | 0..433 | scène de district `brightness(.2)` + voile | — | — | ARGENT `$ 24 850`, médaillon `tiède/HEAT`, `Jour 12 / Matin` — **hors jugement** |
| `R1.entete` | bande | panneau | y 434..606, pleine largeur | aplat `#1e1b16` | bas : 3 px `#3a352c` | — | — |
| `R1.titre` | titre | `R1.entete` | x 51..945, cap y 480..512 | — | — | — | « Commander de la matière première », **cap 33 px**, DejaVu **Serif** 700, `#f0dfc4`, 1 ligne, 13,12:1 |
| `R1.soustitre` | texte courant | `R1.entete` | x 51..907, y 543..564 | — | — | — | « Sans elle, aucun labo ne rallume… », cap 19 px, DejaVu Sans, `#9a8f78`, **1 ligne**, 5,37:1 |
| `R2.bon` | plaque / papier | `.abody` | x 50..1029, y 643..1226 (980×584) | aplat `#efe7d6` | rayon ≈ 5 px | **ombre portée**, excès ≈ 5/255, portée ≈ 22-30 px | — |
| `R2.nom` | titre de plaque | `R2.bon` | x 91..232, cap y 684..710 | — | — | — | « Pyralin », cap 27 px, DejaVu **Serif** 700, `#2a2118`, 12,84:1 |
| `R2.tag` | étiquette | `R2.bon` | x 703..985, cap y 695..710 | — | — | — | « BON DE COMMANDE », cap 16 px, Sans, `#8a7f6b`, **aligné sur la ligne de base de `R2.nom`**, 3,20:1 |
| `R2.filet1-4` | séparateur | `R2.bon` | y 749, 817, 885, 953 (3 px) | **pointillé** `#c3b79e`, 302 transitions / 920 px | — | — | — |
| `R2.l1-4` | rangée | `R2.bon` | pas de **68 px** | libellé à gauche (cap 17 px, `#7a6d58`), valeur à droite (Sans 700, `#2a2118` ou `#a8402f`) | — | — | 4 rangées ; écart libellé/valeur de 176 à 570 px |
| `R2.penurie` | bandeau d'alerte | `R2.bon` | x 90..990, y 1050..1187 (138 px) | aplat **`#a8402f`** (8,2 % de l'aire) | rayon 2 CSS | — | « Il y a une pénurie en ville » + 2 lignes `#f0d8cf` |
| `R2.perfo` | bord déchiré | `R2.bon` | y 1209..1226 (18 px) | **peigne** `#cbbfa4`, période 29 px | — | — | — |
| `R3.vide` | fond | panneau | y 1227..1779 (553 px) | dégradé `#151310 → #131212` | — | — | **33,3 % du panneau** |
| `R4.bas` | plaque | panneau | y 1780..2101 | aplat `#141a21` (12,7 % de l'aire) | haut : 7 px `#2c3640` | — | — |
| `R4.dit` | citation | `R4.bas` | x 50..979, y 1825..1894 | — | — | — | **italique serif** `#cdd6e0`, 2 lignes ; « Lt. Kane : » droit, gras, `#eef3f9` |
| `R4.geste` | CTA | `R4.bas` | x 50..1029, y 1938..2042 (980×105) | aplat **`#241c11`** | **1 px `#5a4a2a`**, rayon ≈ 8 px | — | « EN COMMANDER » cap 25 px `#d9ab4e` à gauche ; « ça part du compte tout de suite » `#9a8a6a` à droite (2154 px d'encre) |

**Couche globale (panneau y 439..2101)** — palette : `#efe7d6` 22,9 % · `#161411` 20,2 % ·
`#131211` 18,7 % · `#211d16` 15,1 % · `#141a21` 12,7 % · `#a76351` **8,2 %**. Luminance moyenne
**80,4/255**. Température moyenne (R−B) **+16,97**. Rythme vertical : 439 / 606 / 643 / 1226 / 1780 /
1938 / 2101.

### Annexe 2 — Inventaire de la capture (`capture-1080x2400.png`, 1080×2400)

Zone de contenu mesurée : **y 143..2179** (2037 px), entre le bas du bandeau et la 1ʳᵉ ligne encrée du
dock. Inventaire exhaustif : **15 bandes** (script `22_`), toutes fichées ci-dessous.

| id | catégorie | bbox (px) | forme / remplissage | texte | statut |
|---|---|---|---|---|---|
| `C0.bandeau` | chrome | y 0..142 | `#0d121b`, filet bas 2 px **`#dc6549`** (braise, conforme au témoin `.chaud`) | flèche retour (x 82..104) · ARGENT `9 627 820,00 €` (or, x 177..446) + jauge pleine (x 176..379) · médaillon `Brûlant / CHALEUR` (anneau x 449..630, Ø 182, centre 0,4995) · `JOUR 50` / `—` (aile droite, calée à droite x 1033) | **jugé contre `hud-canon-1176.png`** : hauteur, Ø et centrage du médaillon, jauge et alignement conformes (contrôle positif 18-23) ; `m11` `m12` |
| `C0.losange` | ornement | x 531..548, y 217..229 | losange or | — | **EN TROP** vs maquette — probablement chrome (§ 6.7) |
| `C1.titre` | titre | x 60..1001, cap y 294..343 ; l2 x 63..386, y 381..431 | — | « Commander de la matière première », **cap 50 px**, DejaVu **Sans** 700, `#eef1f2`, **2 lignes**, 17,12:1 | `M6` `M7` `M12` |
| `C1.soustitre` | texte courant | x 60..975, y 483..515 ; l2 x 61..411, y 527..556 | — | cap 30 px, Sans, `#8a979c`, **2 lignes**, 6,47:1 | `M7` `M12` |
| — | bande d'entête | — | **absente** (`#0d0d0d` continu, aucun filet) | — | `m4` |
| `C2.bon` | plaque / papier | x 57..1022, y 608..1054 (966×447) | aplat `#eae0c8` | — | `m1` ; rayon **0** (`m2`) ; **aucune ombre** (`m3`) |
| `C2.nom` | titre de plaque | x 105..308, cap y 655..693 | — | « Pyralin », cap 39 px, DejaVu **Sans** 700, `#221600`, 13,52:1 | `M6` `M7` |
| `C2.tag` | étiquette | x 663..976, cap y 650..670 | — | « BON DE COMMANDE », cap 21 px, `#b9ad92`, **23 px au-dessus** de la ligne de base de `C2.nom`, **1,69:1** | `m5` `M10` |
| `C2.l1-4` | rangée | pas de **75 px** | libellé `#c0b59a` (**1,55:1**) à gauche, valeur à droite (`#221600` ou **`#ff5a4d`**) | 4 rangées, mêmes libellés qu'en référence | `M10` `M11` `m7` `m8` |
| — | filets pointillés | — | **absents** (0 sur 4) | — | `M9` |
| — | bloc pénurie | — | **absent** (0 ligne rouge) | — | `M1` |
| — | bord perforé | — | **absent** | — | `M8` |
| `C3.titron` | intitulé de section | x 60..512, y 1104..1126 | — | « LA CHAÎNE, EN REMONTANT », `#8a979c` | `m9` |
| `C3.trou` | texte courant | x 60..972, y 1153..1216 | — | « Des maillons existent, mais cet écran ne sait pas encore les afficher. », `#b8c2cc`, **10,76:1**, 2 lignes | **`B1`** |
| `C4.dit` | citation | x 56..1020, y 1272..1338 | — | italique **Sans** `#8a979c`, 2 lignes ; « Nestor : » **de la même couleur et du même style** que la citation | `M6` `M12` `m6` |
| `C4.geste` | CTA | x 57..1022, y 1375..1511 (966×137) | aplat **`#d9ab4d`** (7,7 % de l'aire), **aucun bord**, rayon 0 | « EN COMMANDER » cap 29 px `#221600` à gauche ; **0 px d'encre à droite** | `M4` `M5` `m2` |
| `C5.vide` | fond | y 1512..2179 (668 px) | aplat `#0d0d0d` | — | **32,8 % de la zone de contenu, SOUS le CTA** — `M3` |
| `C6.dock` | chrome | y ≥ 2180 | 4 disques vides (x 196-321, 384-508, 571-695, 758-883) + EMPIRE / FAMILLE / **FILIÈRE** / PLUS ; soulignement or sur EMPIRE | — | canon : 4 disques **avec icône**, 3ᵉ libellé **MARCHÉ**, pastille sur FAMILLE. Icônes = ARBITRAGE user ; libellé = arbitrage ; **géométrie non comparable** (le dock du canon repose sur l'art de la carte) — § 6.3 |

**Couche globale (y 143..2179)** — palette : `#0d0d0d` **70,1 %** · `#eae0c8` 18,3 % · `#b29257`
**7,7 %** · `#eef1f2` 1,0 %. **Aucune classe rouge.** Luminance moyenne **67,0/255**. Température moyenne (R−B) +15,04 — **ce chiffre global ne discrimine pas** (le papier le porte
des deux côtés) : le glissement se lit par partie, cf. `M12` / `M13`. Rythme vertical : 143 / 294 / 608 / 1054 / 1104 / 1375 / 1511 / 2180.

### Annexe 3 — Correspondance des repères

- **Contenu d'écran** : 1 px CSS = **3,6 px** des deux côtés (référence : `.tel` 300 CSS → 1080 px ;
  capture : `LargeurEcransBrennar6 = 300` → 1080 px). Rapport capture ÷ référence = **1,00**. Vérifié
  sur l'image : largeur du bon 980 → 966 px (Δ 1,30 % de la largeur d'écran).
- **Chrome** : hors de ce repère (392 CSS, ×2,755). Bandeau vérifié à **143 px** sur l'image
  (filet braise à y = 141-142), conforme à la géométrie dérivée par le dossier. Dock : 1ʳᵉ ligne
  encrée à **y = 2180**, mesurée, non déduite.
- **Normalisation verticale** : référence 0 = y 439 (haut du panneau), 1 = y 2102 (bas d'écran),
  h = 1663. Capture 0 = y 143 (bas du bandeau), 1 = y 2180 (haut du dock), h = 2037. Toutes les
  positions du § 3 citent ce repère. Contrôle : la part du vide sort à 33,3 % / 32,8 % — les deux
  repères sont donc bien homologues.
- **Aucune comparaison en px bruts** n'est faite entre les deux images sans passer par ce repère,
  sauf pour les grandeurs qui sont à la même échelle par construction (largeurs, hauteurs de
  capitale), et c'est dit à chaque fois.

### Annexe 4 — Scripts (`mesures/*.py`)

**26 scripts, 26 sorties.** Chacun imprime la taille des images qu'il ouvre et porte ses contrôles.
**Les sorties intégrales sont dans `mesures/sorties.txt`** (929 lignes, régénérées d'un bloc au moment
d'écrire ce rapport). Les deux sorties porteuses sont recopiées ci-dessous.

**Calibrage de l'instrument de couleur** — `13_couleurs.py`, aplats de la référence contre les hex de la CSS :

```
  REF bandeau entete .entete         (30, 27, 22)       #1e1b16   CSS #1e1b16
  REF filet .entete border-bottom    (58, 53, 44)       #3a352c   CSS #3a352c
  REF papier .bon                    (239, 231, 214)    #efe7d6   CSS #efe7d6
  REF bloc .penurie                  (168, 64, 47)      #a8402f   CSS #a8402f
  REF bande perforee .bon::after     (203, 191, 164)    #cbbfa4   CSS #cbbfa4
  REF bande .bas                     (20, 26, 33)       #141a21   CSS #141a21
  REF filet .bas border-top          (44, 54, 64)       #2c3640   CSS #2c3640
  REF fond CTA .geste                (36, 28, 17)       #241c11   CSS #241c11
  REF bord CTA .geste                (90, 74, 42)       #5a4a2a   CSS #5a4a2a
  CAP papier .bon                    (234, 224, 200)    #eae0c8
  CAP fond CTA                       (217, 171, 77)     #d9ab4d
  CONTROLE NEGATIF (fenetre a cheval papier/fond) : #11100d -> valeur intermediaire attendue
```

**Oracle de forme des fontes** — `12_oracle_forme_v2.py` (`CTRL+` = police déclarée par la CSS) :

```
CTRL+ REF titre 'Commander'      [CSS 700 DejaVu Serif] -> SerifBold     [SERIF]  desaccord=0.164  marge= 82%  OK
CTRL+ REF bon  'Pyralin'         [CSS 700 DejaVu Serif] -> SerifBold     [SERIF]  desaccord=0.192  marge=144%  OK
CTRL+ REF cit. 'vide.'           [CSS ital DejaVu Serif] -> SerifBoldItal [SERIF]  desaccord=0.250  marge= 28%  (famille OK, fonte exacte non)
CTRL+ REF s-titre 'fournisseur,' [CSS 400 DejaVu Sans]  -> SansBook      [SANS]   desaccord=0.282  marge= 87%  OK
CTRL+ REF bon  'pour le brindle' [CSS 700 DejaVu Sans]  -> SansBold      [SANS]   desaccord=0.212  marge= 76%  OK
MES   CAP titre 'Commander'                            -> SansBold      [SANS]   desaccord=0.100  marge=163%
MES   CAP bon  'Pyralin'                               -> SansBold      [SANS]   desaccord=0.089  marge=270%
MES   CAP cit. 'vide.'          meilleur SERIF=0.545   meilleur SANS=0.415  => SANS
MES   CAP cit. 'est'            meilleur SERIF=0.398   meilleur SANS=0.328  => SANS
MES   CAP s-titre 'fournisseur,'                       -> SansBook      [SANS]   desaccord=0.275  marge= 90%
MES   CAP bon  'pour le brindle'                       -> SansBold      [SANS]   desaccord=0.091  marge=272%
MES   REF CTA 'COMMANDER'                              -> SansBold      [SANS]   desaccord=0.175
MES   CAP CTA 'COMMANDER'                              -> SansBold      [SANS]   desaccord=0.168
```


| script | grandeur | contrôles |
|---|---|---|
| `01_geometrie.py` | profil de luminance par ligne | + largeurs égales · − hauteurs différentes |
| `02_regions.py` | régions papier / rouge / or | + papier trouvé en référence · absence de rouge en jeu = le finding |
| `03_bandes_fond.py` | médiane de ligne ⇒ aplats et frontières | + ref y 800 = `#efe7d6` · − ref y 1400 loin du papier |
| `04_bon_details.py` | filets pointillés, bande perforée | + 4 filets + 1 peigne en référence (déclarés par la CSS) · − bande de papier nue ⇒ 0 |
| `05_bbox_bon.py` | bbox du bon par run contigu | + 274/300 = 91,33 % attendu · − ligne hors bon ⇒ 0 % |
| `06_lignes_texte.py` | bandes d'encre par zone | + ≥ 5 bandes dans le bon · − zone vide ⇒ 0 |
| `07_hauteur_capitale.py` | hauteurs de capitale | + titre réf ≈ 31,5 px attendu, mesuré 33 · − zone vide ⇒ aucune encre |
| `08_serif_ou_sans.py` | ratio pied/fût | **RÉFUTÉ par ses propres contrôles** (serif et sans se recouvrent) — conservé comme trace |
| `10_oracle_police.py` | chasse / hauteur de capitale | **RÉFUTÉ** : élit SansBold sur « Pyralin » réf, déclaré Serif — la grandeur ne discrimine pas |
| `11_` / `12_oracle_forme_v2.py` | gabarit de forme étiré | + 4/5 contrôles exacts, **5/5 au niveau famille** ; `11_` portait 2 découpes fausses (désaccord ≈ 0,73 pour *toutes* les fontes = signature d'une découpe fausse, pas d'un signal) |
| `09_mots.py` | segmentation en mots | + 6 mots sur une ligne du bon · − bande vide ⇒ 0 |
| `13_couleurs.py` | aplats et encres | + **9 hex de la CSS retrouvés exactement** · − fenêtre à cheval ⇒ valeur intermédiaire |
| `14_contraste.py` | contrastes WCAG | + calcul direct depuis les hex · − encre = fond ⇒ 1,00:1 |
| `15_` / `16_dock.py` | chrome, gouttière, positions normalisées | + filet braise trouvé, 4 groupes de colonnes au dock · − même sonde sur la référence ⇒ rien ; − zone 1600-2100 ⇒ 0 ligne encrée |
| `17_cta_et_bandes.py` | CTA, bande d'entête, marges | + bord ≠ fond en référence · − milieu du CTA ⇒ pas de bord |
| `18_couche_globale.py` | palette, luminance, densité, température | + somme des classes = 100 % · − bande uniforme ⇒ 1ʳᵉ couleur > 88 % |
| `20_rayons_ombre.py` | rayons d'arrondi, ombre portée | + rayons CSS retrouvés · − bord droit ⇒ retrait 0 |
| `21_echelles.py` | échelle boîtes vs type | + largeur d'écran 1080/1080 = 1,000 · − 2400/2102 n'est PAS l'échelle |
| `22_inventaire_bandes.py` | inventaire exhaustif | + 4 filets retrouvés · − ref y 1300-1700 ⇒ 0 bande |
| `23_lignes_du_bon.py` | écarts libellé/valeur, ligne de base | + ligne de base commune en référence · − titre l1/l2 ⇒ 88 px |
| balayages `grep` | présence/absence d'une chaîne dans le corpus de l'atelier | comptes pris dans un `$( )` (jamais lus au terminal) ; portée écrite à côté de chaque compte ; + 3 motifs certains (« Pyralin », « bon de commande », « Commander de la matière première ») · − « zzzzzinexistant » ⇒ 0. Une 1ʳᵉ passe rendait **0 y compris sur son contrôle positif** (glob `--include` avalé par le shell) : balayage inerte, refait. |
| `27_` → `30_chrome_final.py` | chrome contre le canon HUD | **`27_` et `28_` RÉFUTÉS par leurs propres sorties** (« médaillon Ø 1176 », « dock à 0,750 de la hauteur », « bas de l'anneau y = 299 ») : le canon est l'écran HUD **entier**, et les sondes non bornées balayaient l'art de la carte et le filet pleine largeur. `30_` borne chaque fenêtre en X **et** en Y et exclut les lignes du filet ; + hauteur de bandeau 153 ⇒ 140,5 attendu / 141 mesuré · − traversée à y = 250 hors médaillon ⇒ 0 groupe |
| `26_temperature.py` | R−B et luminance par partie | + `#efe7d6` ⇒ R−B = +25 (calcul direct) · − `#808080` ⇒ 0 |
| `19_` → `25_collision_v2.py` | dégagement ARGENT / médaillon | `19_` **RÉTRACTÉ** (comptait le filet du bandeau) ; `25_` : + traversée y 110 ⇒ exactement 2 intervalles symétriques · − traversée y 300 ⇒ 0 |

`mesures/vue/` contient les recadrages d'inspection (`ref_*.png`, `cap_*.png`) — aucun n'est une
mesure, ils servent à la lecture.
