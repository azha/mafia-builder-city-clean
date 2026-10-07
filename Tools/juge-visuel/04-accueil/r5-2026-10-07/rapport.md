# Juge visuel ⊥ — ④ Accueil / « LA SUITE » — r5 — 2026-10-07

Juge à contexte vierge. Je n'ai rien construit et je n'avais jamais jugé cet écran.
Référence : `r2-2026-10-07/reference/cadre-4-la-suite.png` (1080×2102).
Captures : `captures-2026-10-07-apres-r4b/p1_lancement_1080x1920.png` et `…_1080x2400.png`
(client `1a515d87`, compte neuf, après lecture de LA SUITE).
Instruments : `mesures/` — **50 scripts** (46 à moi, 1 socle commun `_base.py`, 3 rejeux
d'instruments du r4), chacun imprime la taille des images qu'il ouvre ; **38 sorties collées**
(`sortie-*.txt`). Les scripts qui n'ont pas de sortie collée sont les versions **réfutées** par
leur successeur (m1-m4, m6, m8, m9, m15, m18-m20, m22, m24, m29, m30) : elles sont conservées
exprès, avec en tête la raison de leur réfutation — voir l'annexe A3.
**Mon inventaire a été fait AVANT d'ouvrir le rapport r4**, conformément au mandat reçu.

---

## Verdict : **APPROUVÉ**

Aucun BLOQUANT, aucun MAJEUR. L'écran se lit comme la maquette : même but, même ordre de
lecture, mêmes traits d'identité, mêmes couleurs d'encre **au bit près** sur les cinq rôles de
texte, même chrome, même géométrie de panneau et de boutons. Les huit écarts restants sont
MINEURS : six de typographie ou de nuance, un de rythme propre au 1080×2400, un de tons moyens
du décor — tous mesurés, aucun ne change ce qu'un joueur comprend ni l'ordre dans lequel il le
lit.

**Application du ruling user du 2026-10-07 22 h** (« les petits pixels de nuance, on ne les
traite pas, on fait le gros, mais il faut que ce soit fidèle ») : j'ai classé chaque écart
**A/B** (ce qu'un joueur perçoit — compte pour le verdict) ou **C** (pixel ou nuance — consigné,
ne compte pas). Résultat : **0 écart de classe A**, **6 de classe B tous MINEURS**, **2 de
classe C**. Aucun écart de classe A ou B n'atteint la gravité MAJEUR, donc le verdict est
APPROUVÉ. Le plus gros reste, par ordre de ce qu'un joueur perçoit : les tons moyens du décor
(V1), la hiérarchie typographique (V2), la gravité « LÉGÈRE » (V3).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Échelle horizontale 1:1 (les trois images font 1080 px de large) : les largeurs se comparent
sans conversion. Les hauteurs se comparent en **écarts internes**, jamais en y absolus.

| # | grandeur | RÉF | JEU 1920 | JEU 2400 | script |
|---|---|---|---|---|---|
| 1 | panneau LA SUITE, bords extérieurs | x 46..1033 (988) | x 47..1032 (986) | x 47..1032 (986) | m5 |
| 2 | liseré du panneau (couleur) | (31,37,46) | (34,38,46) | (34,38,46) | m5 |
| 3 | verre du panneau, dégradé haut→bas | (12,18,30)→(9,14,24) | (13,19,31)→(9,14,24) | (13,19,31)→(9,14,24) | m32 |
| 4 | bord droit commun des 3 boutons | x 979 (marge 53) | x 979 (marge 53) | x 979 (marge 53) | m10 |
| 5 | hauteur des 3 boutons | 92 / 92 / 92 | 92 / 93 / 93 | 93 / 93 / 93 | m7, m10 |
| 6 | rayon des boutons (B1/B2/B3), ±2 px | 21 / 22 / 22 | 21 / 22 / 24,5 | 24 / 24,5 / 22,5 | m10 |
| 7 | dégradé du bouton or | (231,194,104)→(204,158,60) | (231,194,102)→(205,159,62) | (231,194,103)→(205,159,62) | m32 |
| 8 | filet laiton : pic, plateau, rampes | (176,141,62) ; 143 sur x 360..700 | idem | idem | m21 |
| 9 | encre des titres | (242,201,107) | (242,201,106) | (242,201,106) | m31 |
| 10 | encre des sous-lignes et de LA SUITE | (185,173,146) | (185,173,146) | (185,173,146) | m31 |
| 11 | encre des libellés fantômes | (234,224,200) | (234,224,200) | (234,224,200) | m31 |
| 12 | encre de la gravité (jeton `#8c8272`) | (139,129,113) | (140,130,114) | (140,130,114) | m25, m44 |
| 13 | contraste titre / verre | 11,93:1 | 11,91:1 | 11,91:1 | m31 |
| 14 | contraste sous-ligne / verre | 8,50:1 | 8,44:1 | 8,44:1 | m31 |
| 15 | plaque TRANCHER, bords + liseré | x 46..1033, (41,53,71) | x 47..1032, (42,53,71) | x 47..1032, (42,53,71) | m22b, m23 |
| 16 | capitale « Lt. … attend vos ordres » | 26 px | 25 px | 26 px | m44 |
| 17 | dock : pas entre centres | 187,0 | 187,5 / 187,0 / 187,5 | idem | m26, m27 |
| 18 | dock : diamètre du rond EMPIRE | 127 px | 126 px | 126 px | m28 |
| 19 | dock : largeur et couleur des libellés | 125 px, (180,168,142) | 122 px, (185,173,146) | idem | m27 |
| 20 | écarts internes du panneau (4 mesures) | voir § rythme | 0,966 / 1,032 / 0,974 / 1,000 | idem | m33 |
| 21 | gouttière panneau → plaque | 36 px | **36 px** | 48 px | m43 |
| 22 | teinte moyenne du décor (RVB) | (20,25,32) | (18,22,29) | — | r4m19 rejoué |

★ Deux contrôles négatifs ont été posés pour vérifier que mes instruments discriminent :
le recalage du décor s'effondre de **0,800 à 0,312 / 0,263** sur un décalage volontaire de
+60 px (m34) ; la simulation de gain fait bien saturer les hautes lumières à g=3 (0,11 % de
canaux > 250, m35). Un instrument qui ne discrimine pas ne mesure rien.

---

## 0. L'écran, tel que la maquette le dit

**But.** Au lancement, dire au joueur *ce qu'il a à faire maintenant* — trois amorces de boucle,
ordonnées, chacune avec son geste — puis, séparément, *qui attend une décision de lui*.

**Ordre de lecture.** (1) Le bandeau, qui donne l'état du monde (argent, chaleur, jour/phase).
(2) Le **quartier peint** qui occupe la moitié haute : c'est l'ancrage fictionnel, pas une
information. (3) Le panneau **LA SUITE**, posé en bas sur une plaque de verre : trois rangées
`titre doré · conséquence en gris chaud · bouton à droite`, dont **la première porte le seul
bouton OR** — c'est l'action recommandée. (4) La plaque **TRANCHER**, détachée sous le panneau :
un lieutenant, sa gravité, un verbe en or. (5) Le dock de quatre onglets.

**Zones.** bandeau (chrome) · diorama (décor) · panneau de la suite (contenu) · plaque de
l'exception (contenu secondaire) · dock (chrome).

**Traits d'identité.** (a) un seul or vif, réservé à l'action — le CTA et le verbe TRANCHER ;
(b) le quartier **peint de nuit**, sous un voile, qui transparaît derrière un verre très sombre ;
(c) le filet laiton qui coupe le bandeau et passe derrière le médaillon ; (d) la hiérarchie
`sérif doré / sans-sérif gris chaud` dans chaque rangée ; (e) les boutons **calés à droite sur un
bord commun**, de largeurs différentes parce qu'ils épousent leur libellé.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, et de près. Vu sans la référence à côté, le jeu donne le même but, le même ordre de lecture
et les cinq traits d'identité : l'or n'est qu'à deux endroits (COMMANDER, TRANCHER), le quartier
est peint et de nuit, le filet laiton a **exactement** la même loi (même pic, même plateau,
mêmes rampes), la hiérarchie sérif/sans tient, et les trois boutons sont alignés à droite sur
x=979 avec trois largeurs différentes. Les cinq couleurs d'encre et les cinq contrastes sont
identiques à 1/255 et 0,1:1 près — ce n'est plus un écran « approchant », c'est le même écran.

Ce qui reste se voit **côte à côte, pas seul**. ① La hiérarchie typographique est **13,4 %
plus plate** : les titres sont 6,4 % plus petits et les sous-lignes 6,1 % plus grandes qu'à la
maquette, si bien que le rapport titre/conséquence passe de 1,31 à 1,15. Conséquence visible :
la 2ᵉ rangée tient sur une ligne de titre au lieu de deux, et le panneau est d'autant plus court.
② Le décor est **un peu plat** : à ombres désormais justes (+3,4 %), il manque 14,0 % aux tons
moyens et 11,5 % aux hauts — le quartier se lit, mais les toits et le sol se détachent moins.
③ La gravité **« LÉGÈRE »** est à 64 % de sa largeur de maquette et 70 % de sa capitale : c'est
le plus gros écart typographique de l'écran, et il porte sur le libellé le plus petit.

Aucun de ces trois écarts ne change ce que le joueur comprend, ni l'ordre dans lequel il le lit,
ni une famille de couleur. Ils ne font pas basculer le verdict.

---

## 3. Écarts — un finding par ligne

`gravité` : liste fermée BLOQUANT / MAJEUR / MINEUR.
`critère` : NOUVEAU = la grandeur ou l'instrument n'existait pas au r4 (d'après la liste R1–R10
du dossier) ; DÉJÀ APPLIQUÉ sinon.
`classe` : **A/B** = écart qu'un joueur perçoit (compte pour le verdict) · **C** = pixel ou
nuance (consigné, ne compte pas) — ruling user du 2026-10-07 22 h.

| id | gravité | critère | classe | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `V1` | MINEUR | DÉJÀ APPLIQUÉ | B | Le décor manque de tons MOYENS et HAUTS ; ses ombres, elles, sont justes | apparié n=60 800, recalage r=0,800 : tercile BAS **1,034** · MOYEN **0,860** · HAUT **0,885** ; moyenne 22,21/24,59 = **0,903** (m35) | la même mesure à 1080×2400 : le décor n'y est **pas appariable** (r=0,35 contre 0,80 au contrôle positif, m34) |
| `V2` | MINEUR | NOUVEAU | B | Hiérarchie typographique aplatie : titres trop petits **et** sous-lignes trop grandes | largeur d'encre, mots identiques : titre ×**0,935**/×0,937, sous-ligne ×**1,061** aux deux résolutions ; capitales 29→27,5 et 22→24 ⇒ rapport titre/sous-ligne **1,31 → 1,15** (m13, m14b) | si la maquette voulait ce rapport : l'image le montre, je ne juge pas l'intention |
| `V3` | MINEUR | NOUVEAU | B | « LÉGÈRE » (gravité de l'exception) nettement plus petit et plus serré | largeur **122 → 78 px** (×0,639) ; capitale **20 → 14 px** (×0,70) ; aux deux résolutions (m44) | — |
| `V4` | MINEUR | DÉJÀ APPLIQUÉ | B | Libellés de bouton encore trop petits (R2 non refermé de ce côté) | pas entre glyphes de COMMANDER **28,38 → 26,25** (×0,925), largeur de glyphe 20,6 → 19,2 ; largeurs d'encre ×0,927 / ×0,906 / ×0,903 ⇒ boutons −8,3 % de large (m10, m16, m17) | — |
| `V5` | MINEUR | NOUVEAU | B | « LA SUITE » (le sur-titre) ~10 % plus petit | largeur **162 → 147 px** (×0,907), capitale **19 → 17 px** (m12) | — |
| `V6` | MINEUR | NOUVEAU | B | À **1080×2400 seulement** : la plaque TRANCHER est étirée en hauteur | hauteur **152 (réf) · 149 (1920) · 197 (2400)** ; rembourrage interne 35/39 (réf), 44/42 (1920), **68/67** (2400) — même contenu (m23, m25) | pourquoi le mou de la bande va dans la plaque et non dans la gouttière : hors image |
| `V7` | MINEUR | NOUVEAU | C | Séparateurs de rangée plus fins | épaisseur **3 px → 1–2 px**, couleur (29,34,44) → (28,34,42), étendue x 100..979 → 96..979 (m21) | — |
| `V8` | MINEUR | NOUVEAU | C | Plaque TRANCHER : coins moins arrondis et marges intérieures plus serrées | rayon **22 → 15–16 px** ; texte à **42 → 34 px** du bord ; TRANCHER à **44 → 31 px** du bord droit (m25, m41) | le rayon du PANNEAU : mes deux instruments sont contaminés par le décor derrière (m41, m42) |

**Récapitulatif : 0 BLOQUANT · 0 MAJEUR · 8 MINEURS (6 de classe B, 2 de classe C).**

### Écarts ASSUMÉS — vérifiés « rendus proprement »

| écart assumé (dossier.md) | vérification | état |
|---|---|---|
| chrome commun = HUD v3.1 (bandeau, typo, dock, médaillon, losange) | médaillon plus grand, volutes plus hautes, ARGENT/JOUR moins interlettrés — **conformes au canon HUD, pas au cadre ④** ; **aiguille non inversée** : « Froid » pointe bien dans l'arc TEAL (gauche), comme « Tiède » en réf (m26–m28, zoom manomètre) | APPLIQUÉ, propre |
| « LÉGÈRE » en gris chaud, la couleur réservée à l'alarme | encre **(140,130,114)** contre le jeton `#8c8272` = (140,130,114) — exact ; réf (139,129,113) | APPLIQUÉ, exact |
| fond = diorama DE NUIT | teinte moyenne RVB (18,22,29) contre (20,25,32) en réf — même famille, nuit (r4m19 rejoué) | APPLIQUÉ |
| pastille FAMILLE absente (compte neuf) | 1 seul objet or dans la bande du dock côté jeu : le soulignement d'EMPIRE (x 240..277) ; la réf porte en plus la pastille à x 492..508, y 1890 (m26) | APPLIQUÉ, propre |
| R7 — diorama au zoom 91,7 % | **mesuré indépendamment** : mon recalage rend s = **1,0916** ⇒ le jeu montre le tableau à **91,6 %** du zoom de la maquette. À 0,1 point de la valeur assumée (m34) | APPLIQUÉ, confirmé |
| R8 — gouttière élastique | **36 px en réf, 36 px à 1920 (exact), 48 px à 2400** (m43) | APPLIQUÉ |
| largeur des boutons au contenu | largeurs 329/375/275 (réf) contre 302/344/251 (jeu) — trois largeurs distinctes, bord droit commun ; l'écart est celui de V4 (m10) | APPLIQUÉ |

### Deux écarts qui viennent de la RÉFÉRENCE, pas du jeu — à ne pas compter

1. **Les soulignés pointillés de la maquette sont une annotation d'atelier, pas un dessin.**
   Tous les textes du cadre 4 portent un souligné pointillé gris. Il ne vient pas de la DA :
   le balisage pose `class="prop"` sur chacun d'eux, et la règle est
   `.acc4 .prop{text-decoration:underline dotted #b9ad92;…}` — `prop` = **PROPOSÉ**, l'étiquette
   du cadre le dit (« … (PROPOSÉ) ») et le commentaire CSS voisin la date du 2026-09-26.
   Le pointillé traverse même l'intérieur du bouton or, ce qu'aucun dessin ne demanderait.
   ⇒ **Leur absence en jeu n'est pas un écart.** C'est un piège réel : il gonfle de 2 à 3 px la
   hauteur d'encre de chaque ligne de la référence, donc toute capitale mesurée sans l'écarter
   est fausse (mes m12 et m24 sont tombés dedans avant correction — voir m13 et m25).
2. **Le cadre force `style="height:406px"` sur le panneau**, ce qui laisse du mou en bas :
   la référence a 79 px sous sa dernière ligne, le jeu 40 (1920) et 47 (2400), là où le
   rembourrage CSS vaut 12 px = 43 px à l'échelle ×3,6. ⇒ écart non imputable au client ;
   je ne le compte pas.

---

## Le point à trancher : les tons moyens du décor

### Ce qui est mesuré

Recalage **refait de zéro** (je n'ai repris l'homographie d'aucun tour précédent) par maximisation
de la corrélation de Pearson : **s = 1,0916, dx = −49, dy = 3, r = 0,800**, contrôles négatifs
0,312 (dx+60) et 0,263 (dy+60). *Ce résultat confirme indépendamment l'homographie du r4
(1,0910 ; −48 ; 3) à 0,0006 et 1 px près.* (m29, m34)

Sur **60 800 paires** de pixels homologues, bande de décor commune (JEU y 170..740) :

| tiers défini sur la RÉFÉRENCE | n | RÉF | JEU | JEU/RÉF | manque |
|---|---|---|---|---|---|
| BAS (lum < 17,23) | 20 263 | 12,95 | 13,38 | **1,034** | −0,43 |
| MOYEN (17,23 ≤ lum < 32,09) | 20 195 | 23,24 | 19,99 | **0,860** | +3,25 |
| HAUT (lum ≥ 32,09) | 20 342 | 37,52 | 33,20 | **0,885** | +4,32 |
| ensemble | 60 800 | 24,59 | 22,21 | **0,903** | +2,38 |

**La forme du déficit est le fait décisif.** Par décile de la référence (m37) :

```
  d1    d2    d3    d4    d5    d6    d7    d8    d9    d10
1,226 1,023 0,948 0,897 0,836 0,845 0,873 0,872 0,882 0,908   (JEU/RÉF, m37)
−2,54 −0,29 +0,72 +1,82 +3,44 +3,76 +3,89 +4,31 +4,14 +4,10   (manque, en unités sRGB, m37)
```

Le manque est **quasi CONSTANT (+3,4 à +4,3/255) du 5ᵉ au 10ᵉ décile**, et **négatif au 1ᵉʳ**
(le plancher additif y dépasse la cible de 23 %). Un gain multiplicatif produit, lui, un manque
qui **croît** avec le niveau : ce n'est pas la même forme.
Par bande verticale (m37) le rapport est plat — 0,874 à 0,933 sur six bandes sur huit — donc le
déficit **n'est pas** un voile dégradé mal converti : il est uniforme dans le cadre.

### La réponse à la question posée

**Non. Un gain de teinte 0,42 → 0,46 (×1,095) EN PLUS du plancher ne ferme pas l'écart.**
Simulation sur les pixels appariés, en linéaire, plancher conservé (m35, m38) :

| gain sur la teinte | BAS | MOYEN | HAUT | p99 | canal le plus clair | erreur max sur 10 déciles |
|---|---|---|---|---|---|---|
| livré (g = 1) | 1,034 | 0,860 | 0,885 | 1,033 | 185/255 | **0,231** |
| **g = 1,095** (teinte 0,46) | 1,084 | **0,904** | **0,928** | 1,080 | 193/255 | **0,290** |
| g = 1,15 | 1,112 | 0,929 | 0,953 | 1,106 | 197/255 | 0,323 |
| g = 1,30 (tons moyens à 1,00) | 1,187 | 0,993 | 1,016 | 1,174 | 208/255 | 0,410 |
| g = 1,40 | 1,235 | 1,034 | 1,056 | 1,217 | 215/255 | 0,465 |

*(colonnes BAS/MOYEN/HAUT et p99 : m35, échantillon au pas 3 — n = 60 800 ; colonnes « canal le
plus clair » et « erreur max sur 10 déciles » : m38, pas 4 — n = 34 320. Les deux échantillons
donnent le même rapport d'ensemble à 0,005 près.)*

- ×1,095 ne ferme que **31 %** du déficit de tons moyens (0,860 → 0,904 pour une cible de 1,000)
  et **37 %** du déficit des hauts.
- **Ce n'est pas la brûlure des hautes lumières qui borne** : le canal le plus clair du décor
  passe de 185 à 193 sur 255, et il faut aller à g = 3 pour voir 0,11 % de canaux dépasser 250.
  Le p99,9 de la **référence** vaut 142,7 : ce décor n'approche jamais le blanc.
- **Ce qui borne, c'est l'autre bout** : les ombres sont déjà +3,4 % au-dessus de la cible
  (1ᵉʳ décile +23 %), et un gain multiplie cet excès. À ×1,095 le 1ᵉʳ décile passe à **1,290**,
  et l'erreur maximale sur les déciles **empire** : 0,231 → 0,290. Elle empire **à chaque pas**
  (0,290 · 0,323 · 0,381 · 0,410 · 0,465 pour g = 1,095 · 1,15 · 1,25 · 1,30 · 1,40) :
  ⇒ **aucun gain, quelle que soit sa valeur, ne fait mieux que le livré sur ce critère.**

**Vérification croisée par l'instrument du r4, que j'ai rejoué moi-même sur ces planches**
(`mesures/r4m39_rejoue.py`, `sortie-r4m39-rejoue.txt`) : l'écart absolu moyen en luminance passe
de **3,38 à 2,23** avec ×1,095 — soit **−34 %**, le même tiers ; et ×1,230 est **pire** (3,34)
que ×1,095, exactement parce qu'il surexpose les ombres. Deux instruments indépendants, la même
conclusion.

### Ce que la mesure désigne

Le modèle livré a deux paramètres : `L = teinte × L_art + plancher`. Balayés **ensemble** (m36,
m38), ils font ce qu'aucun des deux ne fait seul :

- sur les **trois tiers** (m36, 91 couples balayés) le meilleur est **gain ×1,40 sur la teinte
  (0,42 → 0,59) ET plancher ramené à ×0,40** (≈ +2/255 au lieu de +5/255) :
  BAS 1,045 · MOYEN 0,957 · HAUT 1,029, erreur max **0,045**, canal le plus clair 214,7/255 —
  **aucune brûlure** ;
- sur les **dix déciles** (m38), le meilleur essayé est gain ×1,50 avec plancher **supprimé** :
  erreur max **0,146**, contre 0,231 au livré et 0,290 au gain seul.

Un **lift additif en sRGB** seul (famille B de m38) est encore pire que le gain : +2/255 porte
déjà le 1ᵉʳ décile à 1,409.
⇒ **Il faut toucher aux deux termes à la fois** : monter la teinte *et* baisser le plancher.
*(Je nomme la classe de correctif que la mesure désigne ; je ne prescris pas de ligne de code.)*

⚠️ **La limite de cette mesure, et elle porte sur le chiffre le plus spectaculaire.** Avec un
recalage à r = 0,800, l'appariement est bruité : un pixel très sombre de la référence peut être
apparié à un voisin plus clair du jeu, ce qui **gonfle mécaniquement** le rapport du décile le
plus sombre. Le **+23 % du 1ᵉʳ décile est donc un majorant**, pas une valeur exacte. Les tons
moyens et hauts, eux, portent le gros de la distribution et ne subissent pas ce biais ; ils sont
confirmés sans appariement : sur la même bande d'écran, moyenne **22,20 contre 24,14**, part des
pixels sous 16 **35,2 % contre 31,9 %** (m39).

---

## 5. Autres résolutions

**1080×2400 — tient.** Rien de coupé, rien hors cadre, rien qui déborde (m45) :
panneau 1162..1857, plaque 1906..2103, libellés du dock jusqu'à 2341, marge basse **58 px**
remplie par la plaque du dock (13,19,30) — aucune bande nue. Les textes, les largeurs d'encre,
les couleurs, les boutons (302/344/251 px), le filet et le dock sont **identiques au pixel** à
ceux du 1080×1920 : tous mes rapports JEU/RÉF de typographie sont les mêmes aux deux
résolutions (×0,935 / ×1,061 / ×0,639 / ×0,941).

Deux faits propres au 2400 :
- **V6** : la plaque TRANCHER passe de 149 à **197 px** de haut à contenu égal, son rembourrage
  interne de 43 à **68 px**. C'est le mou de la bande qui s'y loge.
- la gouttière panneau→plaque passe de 36 à 48 px — c'est l'élasticité **assumée** (R8).

**Ce qui n'a pas pu être jugé au 2400 :** la fidélité des tons du décor. Le cadrage COVER sur un
écran plus haut ne montre pas la même fenêtre du tableau — la meilleure corrélation trouvée par
une recherche volontairement très large (s 0,80..1,35, dy −600..+300) n'est que **0,35**, contre
**0,80** pour la même procédure sur le 1080×1920 (contrôle positif). Toute comparaison de tons
pixel à pixel y serait fausse. Les distributions brutes ne départagent rien non plus : la moyenne
du décor 2400 (24,24) **coïncide** avec celle de la référence (24,14) uniquement parce qu'elle
englobe une portion plus basse et plus claire du tableau (p99 : 82,8 contre 61,7).

---

## 6. Ce que je n'ai pas pu vérifier

1. **Les tons du décor à 1080×2400** — non appariable (r = 0,35 contre 0,80 au contrôle positif).
   *Ce qui trancherait :* une capture 2400 du **même cadrage** que la maquette (même fenêtre du
   tableau), ou l'export hors ligne de la texture avant voile, qui rendrait la comparaison
   indépendante du cadrage.
2. **Le rayon des coins du PANNEAU.** Mes deux instruments échouent, et je ne donne donc aucun
   chiffre. m41 cherchait le bord par contraste : à gauche du panneau il y a le **décor**, qui
   contient des toits plus clairs que le fond local. m42 cherchait le bord par la **couleur du
   liseré**, et **son contrôle positif rate** : à mi-hauteur il trouve le liseré à x = 31 (réf)
   et x = 30 (2400) au lieu de 46 / 47 — c'est-à-dire sur un pixel du décor de même teinte.
   *Seul le 1080×1920 passe son contrôle (x = 47), et y rend un rayon de ~16-20 px.*
   *Ce qui trancherait :* mesurer le coin **intérieur** du verre, ou une capture sur fond uni.
3. **Le +23 % du décile le plus sombre** — majorant, pour la raison de bruit d'appariement
   exposée plus haut. *Ce qui trancherait :* un recalage sub-pixel (interpolation bilinéaire) ou
   une capture au même zoom que la maquette.
4. **La police.** Je ne peux pas lire une famille de police depuis une image. Les largeurs
   relatives sont cohérentes avec une même famille des deux côtés, mais je ne le certifie pas.
   *Ce qui trancherait :* `fc-match 'DejaVu Serif'` / `'DejaVu Sans'` sur la machine du rendu,
   confronté à ce que le client embarque — hors image, et non fourni au dossier.
5. **Pourquoi le mou de la bande va dans la plaque (V6) et non dans la gouttière** — question de
   mise en page, hors image.
6. **Les états non capturés** : jour/aube vs nuit, file pleine, pastille FAMILLE allumée, états
   pressés des boutons. Une seule phase (`Aube`, chaleur `COLD`) a été photographiée.
7. **L'animation.** Deux captures du même état à T et T+1 s n'ont pas été fournies ; je ne peux
   donc dire ni qu'il y a du mouvement ni qu'il n'y en a pas, et je n'ai classé aucun pixel
   mouvant comme écart.
8. **Le bandeau et le dock** sont déclarés chrome commun (HUD v3.1) : je les ai vérifiés
   « rendus proprement » (aiguille dans le bon arc, rien de coupé, pas de libellé de repli), pas
   conformes à un canon que le dossier ne me fournit pas en image.

---

## Correspondance avec le r4 (0 BLOQUANT, 3 MAJEUR, 7 mineurs)

*(Lu seulement APRÈS mon propre inventaire.)*

| r4 | état au r5 | preuve |
|---|---|---|
| **R1** MAJEUR — hauteur fixe de 110 u (92 px) pour les 3 boutons | **FERMÉ** | 92/92/92 en réf · **92/93/93** à 1920 · **93/93/93** à 2400 (m7, m10) |
| **R2** MAJEUR — tailles : sous-ligne 30→38 u, libellé 28→33, « Lt. » 34→40, TRANCHER 30→36 | **PARTIELLEMENT FERMÉ** | « Lt. » capitale 26 réf / **25-26** jeu ✔ · TRANCHER ×**0,941**, capitale 24/23 ✔ · **sous-ligne dépassée** : passée de trop petite à ×**1,061** (V2) ✘ · **libellé de bouton toujours** ×0,925 (V4) ✘ |
| **R3** MAJEUR — filet laiton en plateau 30→70 % avec rampes | **FERMÉ** | profils de luminance **superposables** tranche par tranche ; pic (176,141,62) des deux côtés ; plateau 143 sur x 360..700 des deux côtés (m21) |
| **R4** mineur — plancher additif +5/255 | **APPLIQUÉ, efficace sur les ombres ; le reste du déficit demeure** → V1 | part des pixels sous lum 8 : **0,4 % réf / 0,0 % jeu** ; sous 10 : 1,2 / **0,9** ; mais tons moyens **0,860** (r4m19 rejoué, m35) |
| **R5** mineur — verre dégradé (13,19,31)→(9,14,24) | **FERMÉ** | profil mesuré : réf (12,18,30)→(9,14,24), jeu (13,19,31)→(9,14,24) (m32) |
| **R6** non fait — « conséquence de R2 et du reflux : se re-mesure » | **FERMÉ — ce n'était pas un défaut de rythme** | les 4 écarts internes du panneau sont **égaux** (0,966 · 1,032 · 0,974 · 1,000). Le pas de rangée 259 → 204 px s'explique **entièrement** par le reflux : 55 px d'écart ≈ **une interligne de titre** (11 px × 1,25 × 3,6 = 49,5 px), la 2ᵉ rangée tenant sur une ligne au lieu de deux (m33) |
| **R7** ASSUMÉ — zoom 91,7 % | **VÉRIFIÉ INDÉPENDAMMENT** | mon recalage rend s = **1,0916** ⇒ **91,6 %**, à 0,1 point (m34) |
| **R8** ASSUMÉ — gouttière élastique 37/49 | **VÉRIFIÉ** — et **exacte** à 1920 | **36 px réf · 36 px à 1920 · 48 px à 2400** (m43) |
| **R9** mineur — rayon du bouton 38 u | **FERMÉ** | rayons B1/B2/B3 : **21/22/22** réf contre **21/22/24,5** jeu (m10) |
| **R10** mineur — marges intérieures 58/62 u | **FERMÉ** | texte à **55 px** du bord gauche (réf) contre **51 px** (jeu) ; boutons à **53 px** du bord droit **des deux côtés**, bord droit commun x=979 (m5, m10) |

**Nouveaux au r5 : V2, V3, V5, V6, V7, V8** (6 MINEURS). **Reste du r4 : V1 (ex-R4) et V4
(moitié de R2).** Aucun MAJEUR du r4 ne survit ; aucun MAJEUR neuf n'apparaît.

★ Tendance : r3 = 1 BLOQUANT + 4 MAJEURS + 10 mineurs → r4 = 0 + 3 + 7 → **r5 = 0 + 0 + 8**.
Le compte de mineurs ne baisse pas, et c'est attendu : **le jeu d'instruments s'est élargi**
(recalage refait de zéro, interlettrage séparé de la taille, gravité et sur-titre mesurés pour
la première fois, plaque jugée aux deux résolutions). Trois des huit mineurs — V3, V5, V6 — sont
des grandeurs que personne n'avait encore mesurées, pas des régressions.

---

## Annexes

### A1. Correspondance des repères (échelle)

| | px de l'image | largeur CSS | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,60** |
| CAPTURES | 1080 | 300 | **×3,60** |
| | | **rapport capture ÷ référence** | **1,00** |

Échelle **horizontale 1:1** : toute largeur se compare en px bruts, sans conversion.
Le ×3,60 est vérifié sur quatre grandeurs indépendantes de la CSS de la maquette : capitale du
titre (11 px × 0,729 × 3,6 = 28,9 px, mesurée 29) · capitale de la sous-ligne (8,4 × 0,729 × 3,6
= 22,0, mesurée 22) · capitale du libellé de bouton (8 × 0,729 × 3,6 = 21,0, mesurée 22) ·
rembourrage haut du verre (12 CSS = 43,2 px + 3 px de demi-interligne = 46, mesuré 46).

⚠️ La normalisation **ne couvre pas les rapports internes** : V2 (titre/sous-ligne 1,31 → 1,15)
est invariant d'échelle et reste un écart réel.

Repères verticaux retenus (bords extérieurs) :

| | RÉF | JEU 1920 | JEU 2400 |
|---|---|---|---|
| panneau LA SUITE | 825 .. 1636 | 754 .. 1450 | 1162 .. 1857 |
| séparateurs de rangée | 1075 · 1334 | 994 · 1198 | 1401 · 1605 |
| boutons (haut..bas) | 945-1036 · 1159-1250 · 1418-1509 | 865-956 · 1050-1142 · 1275-1367 | 1271-1363 · 1456-1548 · 1682-1774 |
| plaque TRANCHER | 1674 .. 1825 | 1487 .. 1635 | 1906 .. 2103 |
| dock : ronds / bas des libellés | 1944 (équateur) / 2049 | 1754 / 1861 | 2234 / 2341 |

### A2. Scripts — `mesures/`

Mes instruments (chacun imprime la taille des images lues) :

`_base.py` · `m1_reperes.py` · `m2_bords_panneau.py` · `m3_rect_panneau.py` ·
`m4_profil_vertical.py` · `m5_bord_lateral.py` (bords et liserés — fondation) ·
`m6`–`m10` (boutons : bbox, largeur, rayon ; m10 corrige m6-m9) · `m11`–`m14`, `m14b` (lignes et
largeurs de texte ; **m13 corrige m12**, qui comptait le souligné d'atelier dans la capitale, et
**m14b corrige m14**, dont les fenêtres coupaient les lignes qu'elles mesuraient) ·
`m15`–`m17` (libellés de bouton ; **m16 corrige m15**, dont la fenêtre attrapait le liseré ;
m17 sépare taille et interlettrage) · `m18`–`m20` (structure verticale) · `m21` (séparateurs et
filet) · `m22`–`m25` (plaque TRANCHER ; **m23 corrige m22** — la plaque a son propre liseré —
et **m25 corrige m24**, dont la fenêtre coupait le bord gauche) · `m26`–`m28` (dock ;
**m28 corrige m26**, qui lisait une ligne fixe et rendait deux diamètres faux) ·
`m29`, `m34` (recalage du décor, refait de zéro, avec contrôles positif et négatif) ·
`m30`, `m35`, `m36`, `m38` (tons et simulations de correctif) · `m31` (contrastes) ·
`m32` (dégradés) · `m33` (rythme vertical) · `m37` (forme du déficit) · `m39` (distributions,
2400) · `m40`–`m43` (bas du panneau, rayons, gouttière) · `m44` (LÉGÈRE, Lt., TRANCHER) ·
`m45` (débordements).

Rejoués par moi, verbatim, sur les planches r4b : `r4m19_rejoue.py` (sortie **identique** au
`sortie-m19-r4b.txt` fourni — la mesure du dossier est confirmée), `r4m39_rejoue.py`,
`r4m25_rejoue.py`.

Images d'annexe : `mesures/duo_panneau.png` (panneau réf | jeu, à l'échelle 1:1).

### A3. Erreurs d'instrument que j'ai commises et corrigées (pour qui relira)

1. **m12** comptait le souligné pointillé de la maquette dans la hauteur de capitale (titre à
   40 px au lieu de 29). Corrigé en m13 en coupant au premier creux du profil.
2. **m24** fixait sa fenêtre à x ≥ 90 et rendait « bord gauche du texte = 90 » — **la valeur de
   sa propre fenêtre**. Corrigé en m25 (x ≥ 55) : 42 px en réf, 34 en jeu.
3. **m26** mesurait le diamètre des ronds du dock sur **une ligne fixe** et rendait 116 (réf)
   contre 87 (jeu) — un faux écart de 25 %. Corrigé en m28 (corde maximale) : **127 contre 126**.
4. **m33** et **m40** confondaient le liseré du panneau et celui de la plaque, trop proches pour
   la tolérance choisie. Corrigé en m43 (colonne centrale, où rien n'est derrière).
5. **m39** recalculait la moyenne à l'intérieur de sa boucle d'écart-type (O(n²)) et n'a jamais
   fini au premier lancement. Corrigé.
6. **m29** a d'abord écrit dans le même fichier qu'un run précédent encore vivant : la sortie
   mélangeait deux instruments. Relancé seul, dans un fichier à lui (`sortie-m34.txt`).
