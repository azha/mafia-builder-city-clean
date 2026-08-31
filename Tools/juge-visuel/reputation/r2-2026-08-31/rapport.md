# Juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`) — r2 — 2026-08-31

Référence : `reference/m-120.png` (état VIERGE, 900×1752, ×3,0 → 300×584 CSS).
Captures : `Assets/Screenshots/screen_b3_reputation_1080x1920.png` (×3,6 → 300×533,3 CSS),
`…_1080x2400.png`, `…_1080x1920_t1s.png`.
Toutes les grandeurs de ce rapport sont **en px CSS**, jamais en px bruts.

---

## Verdict : NON APPROUVÉ

L'écran a la bonne charpente, les bonnes couleurs et les bons textes, mais son **héros
— le portrait du lieutenant — n'est pas la figure de la maquette** (col carré et
désaxé, visage hors de l'axe, montre sans aiguilles), et le **reflet turquoise qui
donne son nom à l'écran a disparu**. Six MAJEURS, aucun BLOQUANT.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Vingt-deux grandeurs, toutes produites par un script de `mesures/` :

| # | grandeur | référence | jeu | écart | script |
|---|---|---|---|---|---|
| 1 | or du liseré du panneau | (176,141,62) | (176,141,61) | 1/255 | 03 |
| 2 | cyan des compteurs « 00 » | (127,212,217) | (127,212,217) | **0** | 03 |
| 3 | gris des libellés de compteur | (138,151,156) | (138,151,156) | **0** | 03 |
| 4 | crème du sous-titre | (185,173,146) | (185,173,146) | **0** | 03 |
| 5 | vert « Il vous écoute » | (125,179,106) | (125,179,106) | **0** | 03 |
| 6 | liseré des plaques | (42,54,72) | (42,53,73) | 1/255 | 03 |
| 7 | aplats fond / corps / carte / tuile / épilogue | — | — | ≤ 4/255 | 03 |
| 8 | aplats du portrait (visage, col, buste) | (185,173,146) (234,224,200) (22,25,27) | idem, (22,22,28) | ≤ 3/255 | 04 |
| 9 | **largeur de la carte-portrait** | 117,7 | 117,7 | **0,0** | 02 |
| 10 | gouttière carte-portrait ↔ tuiles-règles | 10,3 | 10,4 | +0,1 | 02 |
| 11 | largeur des 3 compteurs | 85,7 / 85,6 / 85,7 | 86,6 / 86,4 / 86,4 | +0,9 (0,3 % de l'écran) | 02 |
| 12 | gouttières entre compteurs | 7,0 / 7,0 | 7,0 / 6,9 | ≤ 0,1 | 02 |
| 13 | capitale du titre « Le miroir » | 13,3 | 12,8 | −3,8 % | 07 |
| 14 | capitale du H2 « Rien n'a encore déteint » | 11,0 | 10,8 | −1,8 % | 07 |
| 15 | capitale des chiffres « 00 » | 11,0 | 10,8 | −1,8 % | 07 |
| 16 | capitale du corps de l'épilogue | 6,7 | 6,7 / 6,9 | ≤ +3 % | 07 |
| 17 | largeur d'encre du titre | 115,3 | 116,1 | +0,7 % | 07 |
| 18 | voyant éteint (Ø, aire, remplissage) | 7,0×7,0 · 39,0 · 0,80 | 7,2×6,9 · 38,0 · 0,76 | ≤ 3 % | 08 |
| 19 | taux de remplissage du visage (ovale) | 0,62 | 0,62 | **0,00** | 04 |
| 20 | bas du buste (y depuis le coin de la carte) | 147,0 | 147,5 | +0,5 | 04 |
| 21 | **stabilité T / T+1 s** | — | **0 pixel différent sur 2 073 600** | — | 06 |
| 22 | 20:9 — largeur du panneau d'or, marge basse, encre au bord | 5,0→294,7 · 5,3 · 0 px | identiques à 16:9 | **0** | 06 |

Ni la référence ni les captures ne portent de profil ICC : la comparaison colorimétrique
est faite dans le même espace, sans conversion. **Aucune dérive de mélange sRGB/linéaire
n'est mesurable sur cet écran** — c'est un point positif fort, et il ferme l'angle mort A2.

---

## 0. L'écran, tel que la maquette le dit

**But.** Le miroir. Le joueur vient lire ce que son lieutenant a *absorbé* des règles
qu'il lui a données — pas ce qu'on lui a dit, ce qu'il en a retenu. Sur un compte neuf,
la réponse est « rien », et l'écran doit rendre ce rien **lisible et non décevant**.

**Ordre de lecture.** ① « Le miroir », seul texte en or et le plus grand (capitale 13,3) ;
② la rangée des trois compteurs, seule couleur saturée de l'écran (cyan 127,212,217) ;
③ le **portrait du lieutenant**, unique figure de l'écran, et à sa droite les quatre traits
avec leurs voyants éteints ; ④ l'épilogue, qui explique pourquoi tout est à zéro ;
⑤ le CTA en or, « DONNER UNE PREMIÈRE RÈGLE ».

**Zones.** chrome hérité (ARGENT / HEAT / JOUR) · bandeau-titre (51,7 de haut, clos par un
filet d'or) · rangée de 3 compteurs · panneau CORPS (portrait 117,7 à gauche, liste de 4
tuiles 125,0 à droite) · épilogue (76,0) · CTA (26,0).

**Traits d'identité.**
1. Cadre d'or continu + titre en or sur un presque-noir ;
2. le cyan des compteurs, seule couleur saturée ;
3. **la figure du lieutenant**, vectorielle et plate, dont cinq traits (buste, col, revers,
   montre, gants) sont porteurs de donnée ;
4. **un filet turquoise horizontal (60,98,106) qui traverse tout le panneau CORPS à
   y = 301,7 CSS** — la glace elle-même, devant le visage du lieutenant ;
5. quatre voyants éteints, disques de 7,0 en (42,54,72), en regard des quatre traits.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le but reste lisible et les deux premières stations du regard sont intactes : le titre en or,
puis les compteurs cyan, arrivent dans le bon ordre, à la bonne taille et dans la bonne couleur.
L'épilogue et le CTA ferment la lecture comme dans la maquette. Rien n'est coupé, rien ne sort
du cadre, rien ne bouge entre T et T+1 s, et les deux résolutions tiennent.

**La troisième station casse.** Là où la maquette pose une figure, le jeu pose une figure
abîmée dans une boîte presque vide. Le col — qui doit être un triangle sous le menton — est
un **carré crème** (taux de remplissage 0,93 contre 0,43), 31 % trop grand, décalé de 1,6 à
droite de l'axe pendant que le visage et le cou sont décalés de 3,2 à gauche : le col n'est
pas sous le cou, il est à côté, et il le recouvre. La montre a perdu son anneau et ses deux
aiguilles (32,2 % d'encre dans le cadran → 0,0 %). Les cheveux ne descendent plus le long du
visage. Le lieutenant ne se lit plus comme quelqu'un ; il se lit comme un gabarit non fini.

**Le trait d'identité n°4 a disparu.** Le filet turquoise qui traverse le panneau CORPS —
la glace, ce qui justifie le titre — est absent des deux captures (05 balaie les 1920 lignes
et ne trouve jamais mieux que 6,6 % contre 67,7 % dans la maquette). L'écran s'appelle
« Le miroir » et ne montre plus de miroir.

**Le vide.** La carte-portrait fait 252,2 de haut en 16:9 (182,3 dans la maquette) et 385,6
en 20:9, pour ~120 de contenu. Mais l'arithmétique disculpe la mise en page : la hauteur
disponible pour le panneau augmente de +71,4 (chrome absent, image plus courte) et la carte
en absorbe +69,9 ; en 20:9 elle absorbe +133,4 sur +133,3. **Le bloc élastique fait
exactement son travail** — je ne compte donc pas ce vide comme un défaut de mise en page.
Ce que je compte, c'est que le jeu verse *toute* la réserve dans un seul bloc là où la
maquette en garde 21,0 sous la carte (jeu : 5,5), et qu'en 20:9 le résultat est la plus
grande boîte de l'écran remplie à 31 %.

Enfin, le sous-titre du bandeau ne se replie plus : capitale 6,1 au lieu de 4,7 (+30 %),
une ligne au lieu de deux, et une encre qui court d'un bord à l'autre de la plaque
(marges 3,9 et 4,1 contre 27,3). Il n'est pas coupé — mais il occupe 97 % de sa plaque.

**Les trois écarts de tête, par ce qu'un joueur perçoit :**
1. le portrait n'est pas la figure de la maquette (col carré désaxé, montre aveugle, cheveux) ;
2. le reflet turquoise — le miroir — a disparu ;
3. le sous-titre, trop gros, ne se replie plus et touche les bords de sa plaque.

---

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| 1 | `P3.portrait.col` — forme | MAJEUR | triangle, remplissage **0,43** | rectangle, remplissage **0,93** | +0,50 | 04 | Le dossier n'assume qu'« un triangle sommaire ». Ce qui est rendu n'est même pas ce triangle : l'écart sort du périmètre de l'assumé. |
| 2 | `P3.portrait.col` — taille et axe | MAJEUR | 16,3×16,3 ; centre à l'axe (écart −0,0) | 21,4×21,4 ; centre +1,6 | +31 % ; +1,6 | 04 | aire col / aire visage : 0,098 → 0,298 (**+204 %**) |
| 3 | `P3.portrait.visage`+`.cou` — axe | MAJEUR | centres à 58,8 = l'axe (−0,0) | 55,7 et 55,7 (**−3,2**) | −3,2 (2,7 % de la carte) | 04 | une figure symétrique posée de travers ; cumulé au n°2, cou et col sont désalignés de **4,8** |
| 4 | `P3.portrait.montre` | MAJEUR | cadran 13,3×8,3, **32,2 %** d'encre plus sombre au centre (anneau + 2 aiguilles) | cadran 15,0×9,7, **0,0 %** | −32,2 pts | 04 | trait porteur de donnée réduit à une ellipse muette |
| 5 | `P3.portrait.cheveux` | MAJEUR | silhouette tête 43,0 pour un visage de 34,3 → 8,7 de cheveux latéraux | silhouette 39,0 pour un visage de 36,9 → **1,7** | −7,0 | 04 | les cheveux ne descendent plus le long du visage ; le visage remonte de 7,6 |
| 6 | `P3.reflet` (le miroir) | MAJEUR | filet (60,98,106), y 301,7→303,3, ép. 2,0, x 55,3→276,7 (**67,7 %** de la ligne) | **ABSENT** (meilleur score 6,6 %, balayage des 1920 lignes) | −100 % | 05 | trait d'identité n°4 ; absent aussi en 20:9 |
| 7 | `P1.soustitre` | MAJEUR | capitale 4,7 ; 2 lignes ; marges 27,3 | capitale **6,1** ; 1 ligne ; marges **3,9 / 4,1** | +30 % ; −23,3 | 07 · 06 | l'avance par caractère est identique (6,32 vs 6,34) : c'est la hauteur qui change, pas la chasse — classe de cause : métrique de police substituée ou taille nominale, pas un repli manquant |
| 8 | `P3.corps` — répartition de la réserve | MAJEUR | 21,0 de réserve sous la carte, dans le panneau CORPS | **5,5** ; toute la réserve va à la carte | −15,5 | 01 · 02 · 06 | en 20:9 la carte fait 385,6 pour ~120 de contenu (**31 % remplie**) et devient le plus grand objet de l'écran. L'absorption élastique elle-même est JUSTE (+69,9 pour +71,4 disponibles ; +133,4 pour +133,3 en 20:9). |
| 9 | `P3.portrait.visage` — proportion | MINEUR | aire visage / aire buste 0,618 | 0,731 | **+18 %** | 04 | la tête est plus grosse par rapport au buste |
| 10 | `P3.portrait.col` — occlusion | MINEUR | col y 115,3→131,7 ; cou y 98,0→**114,7** : ils se **touchent** | col y 113,9→135,3 ; cou y 96,9→**115,6** : recouvrement de 1,7 × 13,6 | ~23 CSS² en trop | 04 · 08 | un recouvrement que la maquette n'a pas (angle mort A1 déclaré) |
| 11 | `P1.plaque` — liseré | MINEUR | liseré (42,54,72) tout autour | **ABSENT** : aplat nu (13,22,34) | −1 liseré | 02 · 03 | seule plaque de l'écran privée de son liseré ; les autres l'ont |
| 12 | `P2.compteur` — voile intérieur | MINEUR | dégradé vertical, amplitude 21 (somme des canaux) | **plat**, amplitude 0, exactement la couleur du fond | −21 | 03 | les tuiles ne se détachent plus que par leur liseré |
| 13 | `P3.corps` — dégradé de fond | MINEUR | (13,15,16) + (12,14,15), 7,8 % de l'aire | (13,13,13) plat, 18,4 % | −1 dégradé | 03 | même classe de cause que le n°12 : les fonds dégradés sont rendus plats |
| 14 | `P3.tuile[1-4]` — hauteur | MINEUR | 28,0 (les 4 égales) | 25,0 (les 4 égales) | −10,7 % | 02 | les quatre restent égales entre elles |
| 15 | `P2.compteur` — hauteur | MINEUR | 31,7 | 28,7 | −9,5 % | 02 | |
| 16 | `P3.corps` — marges intérieures | MINEUR | 9,0 / 9,0 / 8,0 / 21,0 (G/D/H/B) | 7,2 / 6,9 / 5,2 / 5,5 | −20 % à −74 % | 02 | conteneur au padding plus serré ; conséquence : tuiles-règles 131,1 au lieu de 125,0 (+4,9 %) |
| 17 | rythme entre blocs | MINEUR | 9,3 / 9,3 / 9,4 / 9,3 | 10,8 / 12,5 / 12,2 / 10,8 | +16 % à +34 % | 02 | **écart sélectif** : les blocs rétrécissent (−6 à −10 %) pendant que les vides entre eux grossissent — deux conteneurs différents |
| 18 | `P4.corps` — interligne | MINEUR | 9,4 | 7,5 / 7,8 | −19 % | 07 | le paragraphe de l'épilogue se lit plus serré |
| 19 | `P2.libellé` — capitale | MINEUR | 4,7 (accent compris) | 5,1 | +8,5 % | 07 | |
| 20 | `P1.plaque` / `P4` / CTA — hauteurs | MINEUR | 51,7 / 76,0 / 26,0 | 48,6 / 70,9 / 24,2 | −6 % / −6,7 % / −6,9 % | 01 · 02 | même signe partout : les blocs à contenu sont uniformément un peu plus courts |
| 21 | `P3.legende` « ce qu'il a absorbé de vos règles » | MINEUR | 3 lignes | 2 lignes | reflux | à l'œil | l'ordre de lecture tient ; colonne plus large |
| 22 | `P2.enfreintes` — « — » au lieu de « 00 » | ASSUMÉ | — | tiret cyan **(127,212,217)**, même encre que les chiffres, centré dans la tuile | — | 08 | **rendu proprement** : pas de libellé de repli, pas de trou |
| 23 | `P3.nom` — « Salvatore » + mention `lieutenant.name — non projeté (L0.4)` | ASSUMÉ | idem dans la maquette | idem, même position (y 155,0 / 155,3), même vert (125,179,106) à 0/255 | — | 04 · 08 | **rendu proprement** |
| 24 | 4 couleurs hors `DesignTokens` | ASSUMÉ | — | les 4 aplats concernés sortent à ≤ 4/255 de la maquette | — | 03 | dette de code, **sans conséquence visuelle mesurable** |
| 25 | familles de police | ARBITRAGE | serif de la maquette (substituée au rendu) | serif embarquée du client | non mesurable depuis une image | — | les hauteurs de capitale, elles, concordent (n° 13-16 du contrôle positif) — sauf le sous-titre, écart n°7 |

---

## 5. Autres résolutions

**1080×2400 (20:9, cible téléphone) — TIENT.**
Rien de coupé (0 pixel d'encre sur les 2 px de bordure d'image), rien hors cadre, rien qui
déborde de son parent. La largeur du panneau d'or est identique au pixel près (5,0 → 294,7),
la marge basse sous le CTA aussi (5,3). Le reflux est propre : tous les repères au-dessus de
la carte-portrait sont **inchangés** (haut du panneau 5,0 ; filet 61,7 ; haut de la carte
120,8) et la totalité des +133,3 CSS supplémentaires passe dans la carte-portrait
(252,2 → 385,6 = +133,4). L'ordre de lecture est conservé.

Écart propre à cette résolution : **la carte-portrait y est remplie à 31 %** et devient, de
loin, le plus grand objet de l'écran (385,6 sur 656,4 de panneau, soit 59 % de sa hauteur).
C'est la manifestation la plus visible de l'écart n°8. Le reflet (n°6) y est également absent.

**1080×1920 T+1 s — TIENT.**
`ImageChops.difference` : `getbbox() = None`, **0 pixel différent sur 2 073 600**, delta max
0/255. Aucune exclusion n'a été nécessaire puisque le chrome est absent des deux images.
L'écran ne porte aucune animation : le *ruling* du 2026-08-27 est respecté, et c'est prouvé.

---

## 6. Non vérifié

| ce que je n'ai pas pu trancher | ce qui trancherait |
|---|---|
| **Ce que l'absence de chrome me cache** : que rien ne passe sous le bandeau ARGENT/HEAT/JOUR, que rien ne touche le dock, que la marge haute du panneau (5,0 en capture, 125,3 sous le chrome dans la maquette) est correcte une fois le shell monté — et surtout la **magnitude réelle de l'écart n°8** : sous le chrome, la carte-portrait retomberait à ~182 en 16:9 (l'arithmétique le dit) mais je ne sais pas ce qu'elle vaudrait en 20:9. | une capture montée dans le shell, après l'override d'identité (angle mort A4 du dossier) |
| **La famille de police** des deux côtés : une image ne dit pas quelle fonte a servi. | `fc-match` sur la CSS de `chassis6.py` + la liste des fontes embarquées par le client |
| **La cause de l'écart n°7** (sous-titre +30 % de capitale) : taille nominale erronée, ou métrique d'une fonte substituée ? | la même mesure sur une seconde chaîne de longueur connue, ou le `font-size` effectif des deux côtés |
| **Si un libellé d'état plus long est coupé** : l'actuel occupe déjà 97 % de sa plaque avec 3,9/4,1 de marge. | une capture d'un état au sous-titre plus long (`drifting`, `hostile`) |
| **Les états `derive` / `gages` / `vide` / liste pleine** (angle mort A5) : leur code existe et n'a jamais été rendu ; je ne juge que ce qu'on me montre. | un scénario qui déclare 4 règles et provoque une violation, ou un seed |
| **Si les cinq traits du portrait CHANGENT avec la donnée** : je n'ai vu que l'état vierge, où les quatre voyants sont éteints. Le col carré est-il « fermé », ou est-ce la même forme quel que soit l'état ? | deux captures du même écran à deux états d'absorption |
| **Les revers du veston** : la maquette forme un V par le contour du buste autour du triangle du col ; le jeu, avec un col rectangulaire, n'a plus de V. Je ne sais pas si un revers distinct existait dans le SVG source. | le SVG d'origine du portrait |
| **Le sous-pixel** : la référence est elle-même une rastérisation à ×3. En deçà de ~0,7 CSS je ne distingue pas un écart d'un bruit d'échantillonnage — toutes les valeurs de ce rapport sous ce seuil sont dans le contrôle positif, jamais dans les écarts. | — |

---

## Annexes

### 1. Inventaire de la référence (`m-120.png`, 300×584 CSS)

| id | catégorie | parent | bbox (px CSS) | forme / remplissage | texte | relations |
|---|---|---|---|---|---|---|
| `P0` | chrome | écran | y 0 → ~121,7 | décor + bandeau ARGENT/HEAT/JOUR | — | hors capture (assumé) |
| `P1` | panneau | écran | y 125,3 → 577,0 ; x 6,0 → 293,7 | rect, liseré d'or 1,0 en (176,141,62) | — | marge basse 7,0 |
| `P1.plaque` | plaque | `P1` | x 14,0→285,0 ; y 133,3→185,0 (h 51,7) | rect, fond (12,18,28), liseré (42,54,72) | — | padding 8,0 depuis `P1` |
| `P1.titre` | titre | `P1.plaque` | x 91,0→206,3 ; y 142,3→155,3 | — | « Le miroir », capitale **13,3**, serif, or (242,201,107), centré, très interlettré | centré sur l'axe de la plaque |
| `P1.soustitre` | texte | `P1.plaque` | x 41,3→256,3 ; y 164,0→174,7 | — | « UN LIEUTENANT NEUF N'A ENCORE RIEN / ABSORBÉ », capitale **4,7**, capitales, crème (185,173,146), **2 lignes centrées**, interligne 6,3 | marges 27,3 de chaque côté |
| `P1.filet` | séparateur | `P1` | y 184,0→185,7, ép. 2,0 | trait or (176,141,62) | — | ferme le bandeau |
| `P2.tuile[1..3]` | plaque | `P1` | y 195,0→226,7 (h 31,7) ; x 14,0→99,7 / 106,7→192,3 / 199,3→285,0 (l 85,7) | rect, liseré (42,54,72), **voile intérieur vertical d'amplitude 21** | — | gouttières 7,0 ; 9,3 sous le filet |
| `P2.chiffre` | texte | `P2.tuile` | y 201,0→211,7 | — | « 00 », « 00/4 », « 00 », capitale **11,0**, cyan (127,212,217) | centré |
| `P2.libellé` | texte | `P2.tuile` | y 216,7→221,3 | — | « RÈGLES DONNÉES » etc., capitale **4,7**, gris (138,151,156) | 5,0 sous le chiffre |
| `P3` | panneau | `P1` | x 14,0→285,7 ; y 236,0→447,3 (h 211,3) | rect, liseré (42,54,72), fond dégradé (13,15,16)→(12,14,15) | — | padding G/D 9,0 ; H 8,0 ; **B 21,0** |
| `P3.carte` | carte | `P3` | x 23,0→140,7 (**l 117,7**) ; y 244,0→426,3 (h 182,3) | rect, liseré **d'or**, fond (17,24,35) | — | 43,3 % de la largeur de `P3` |
| `P3.nom` | texte | `P3.carte` | y ~253 | — | « SALVATORE, VOTRE LIEUTENANT », 2 lignes, gris (138,151,156) | |
| `P3.portrait` | figure | `P3.carte` | y 42,3→147,0 *(repère carte)* | aplats plats | — | **axe de symétrie à 58,85 = l'axe de la carte** |
| `P3.portrait.cheveux` | forme | `P3.portrait` | silhouette tête **43,0** de large | (22,25,27) | — | descend le long du visage : 8,7 de plus que le visage |
| `P3.portrait.visage` | forme | `P3.portrait` | x 41,7→76,0 (34,3) ; y 62,0→116,7 (54,7) | ovale, remplissage 0,62, (185,173,146) | — | centre **58,8 = l'axe** |
| `P3.portrait.cou` | forme | `P3.portrait` | x 51,7→66,0 ; y 98,0→**114,7** | rect, (185,173,146) | — | centre à l'axe ; **abouté au col** |
| `P3.portrait.col` | forme | `P3.portrait` | x 50,7→67,0 (16,3) ; y **115,3**→131,7 | **triangle pointe en bas**, remplissage **0,43**, (234,224,200) | — | centre à l'axe ; forme le V des revers avec le buste |
| `P3.portrait.buste` | forme | `P3.portrait` | l 78,7 ; y 113→147,0 | dôme, (22,25,27) | — | base plate à y 147,0 |
| `P3.portrait.montre` | icône | `P3.portrait.buste` | cadran **13,3×8,3** | ellipse (35,42,45) + anneau sombre + **2 aiguilles** (32,2 % d'encre au centre) | — | bas-gauche du buste |
| `P3.etat` | texte | `P3.carte` | y 155,0→161,3, l 66,0 | — | « Il vous écoute », vert (125,179,106) | |
| `P3.dette` | texte | `P3.carte` | y ~167 | — | « lieutenant.name — non projeté (L0.4) », gris | 10,0 de réserve sous lui avant le bas de carte |
| **`P3.reflet`** | **filet** | **`P3`** | **x 55,3→276,7 ; y 301,7→303,3 (ép. 2,0)** | **trait turquoise (60,98,106), dégradé, éteint aux extrémités** | — | **traverse la carte ET la 1ʳᵉ tuile-règle — la glace** |
| `P3.entete` | titre | `P3` | y 247,7→272,7 | — | « Pas encore jugeable », 2 lignes, gris clair | |
| `P3.legende` | texte | `P3` | à droite de `P3.entete` | — | « ce qu'il a absorbé de vos règles », **3 lignes** | |
| `P3.tuile[1..4]` | rangée | `P3` | x 151,0→276,0 (l 125,0) ; h **28,0** chacune, gouttière 4,3 | rect, liseré (42,54,72), fond (17,24,35) | titres « col ouvert » … + sous-titres | 1ʳᵉ tuile à 42,0 du haut de `P3` |
| `P3.voyant` | badge | `P3.tuile` | Ø **7,0**, aire 39,0, remplissage 0,80 | disque **éteint** (42,54,72) | — | 4 identiques |
| `P4` | panneau | `P1` | y 456,7→532,7 (h 76,0) | rect, fond (16,22,32), liseré | — | 9,4 sous `P3` |
| `P4.surtitre` | texte | `P4` | y 466,0→471,0 | — | « « PAS JUGEABLE » N'EST PAS « MOYEN » », capitale 5,3 | |
| `P4.titre` | titre | `P4` | y 477,3→488,0 | — | « Rien n'a encore déteint », capitale **11,0**, serif | |
| `P4.corps` | texte | `P4` | y 496,3→521,3, 3 lignes | — | capitale **6,7**, **interligne 9,4** | |
| `P5.cta` | bouton | `P1` | y 542,0→568,0 (h 26,0) | rect, liseré d'or | « DONNER UNE PREMIÈRE RÈGLE », or | 9,3 sous `P4` ; 9,3 au-dessus du bas du panneau |

**Couche globale de la référence** (panneau d'or entier, 288×452 CSS) :
luminance moyenne **33,1/255** · densité d'encre (L>45) **12,21 %** · palette dominante
(17,24,35) 25,2 % · (22,25,27) 5,9 % · (13,15,16) 4,6 % · (12,14,15) 3,2 % · (42,54,72) 3,1 % ·
(16,23,34) 3,0 % · rythme vertical : frontières à 125,3 / 184,0 / 195,0 / 236,0 / 244,0 /
426,3 / 447,3 / 456,7 / 532,7 / 542,0 / 568,0 / 577,0, **vides inter-blocs tous à 9,3-9,4**.
Contrastes : titre or (242,201,107) sur (12,18,28) ≈ 11:1 ; chiffres cyan sur (10,14,22) ≈ 10:1 ;
libellés gris (138,151,156) sur (10,14,22) ≈ 5:1.

### 2. Inventaire de la capture (`…_1080x1920.png`, 300×533,3 CSS)

Chaque partie ci-dessus a été refaite **depuis les pixels de la capture**. Seules les fiches
qui diffèrent sont reprises ici ; les autres sont couvertes par le contrôle positif.

| id | ce que la capture montre | statut |
|---|---|---|
| `P0` chrome | **absent** (délibéré, documenté) | ASSUMÉ |
| `P1` panneau | y 5,0→528,1 (h **523,1**) ; liseré d'or (176,141,61) | ÉGAL (couleur) / la hauteur suit la place disponible |
| `P1.plaque` | x 12,8→287,2 ; y 12,8→61,4 (h **48,6**) ; fond (13,22,34) ; **aucun liseré** | ÉCART n°11 |
| `P1.titre` | x 92,2→208,3 ; capitale 12,8 ; (242,201,106) | ÉGAL |
| `P1.soustitre` | x 16,7→283,1 ; **1 ligne** ; capitale **6,1** ; (185,173,146) | ÉCART n°7 |
| `P2.tuile[1..3]` | x 12,8→99,4 / 106,4→192,8 / 199,7→286,1 ; h **28,7** ; **fond parfaitement plat (13,13,22)** | ÉCARTS n°12, n°15 |
| `P2.enfreintes` | « — » cyan (127,212,217), centré, à la place des chiffres | ASSUMÉ, propre |
| `P3` panneau | x 12,8→287,0 ; y 115,6→378,6 (h 263,0) ; fond **plat (13,13,13)** ; padding 7,2/6,9/5,2/5,5 | ÉCARTS n°13, n°16 |
| `P3.carte` | x 20,0→137,7 (**l 117,7**) ; y 120,8→373,1 (h **252,2**) | largeur ÉGALE / hauteur : élastique, écart n°8 |
| `P3.portrait.visage` | x 37,2→74,2 (36,9) ; y 54,4→116,7 (62,2) ; remplissage 0,62 ; **centre 55,7 = axe −3,2** | ÉCARTS n°3, n°9 |
| `P3.portrait.cou` | x 48,1→63,3 ; y 96,9→**115,6** ; centre −3,2 | ÉCART n°3 |
| `P3.portrait.col` | x 49,7→71,1 (**21,4**) ; y **113,9**→135,3 ; **remplissage 0,93** ; **centre +1,6** | ÉCARTS n°1, n°2, n°10 |
| `P3.portrait.cheveux` | silhouette tête **39,0** pour un visage de 36,9 → 1,7 de cheveux latéraux | ÉCART n°5 |
| `P3.portrait.buste` | l 77,2 ; base à y 147,5 ; (22,22,28) | ÉGAL (base et couleur) |
| `P3.portrait.montre` | ellipse **15,0×9,7** (34,42,46), **sans anneau ni aiguille** (0,0 %) | ÉCART n°4 |
| **`P3.reflet`** | **ABSENT** | **ÉCART n°6** |
| `P3.legende` | **2 lignes** | ÉCART n°21 |
| `P3.tuile[1..4]` | x 148,1→279,2 (l 131,1) ; h **25,0** chacune, gouttière 4,7 ; 33,0 du haut de `P3` | ÉCARTS n°14, n°16 |
| `P3.voyant` | Ø 7,2×6,9, aire 38,0, remplissage 0,80, (42,53,73) | ÉGAL |
| `P4` | h **70,9** ; corps **interligne 7,5 / 7,8** | ÉCARTS n°18, n°20 |
| `P5.cta` | h **24,2** | ÉCART n°20 |
| — | **aucune partie EN TROP** : tout ce que la capture montre a une contrepartie dans la maquette | — |

**Couche globale de la capture** (panneau d'or entier, 290×523 CSS) :
luminance moyenne **29,4/255** (−11 %) · densité d'encre **10,21 %** (−16 %) · palette
dominante (13,22,34) 43,0 % · (13,13,22) 22,7 % · (13,13,13) 18,4 % · (22,22,28) 4,8 % ·
(42,53,73) 2,1 % · (176,141,61) 2,0 %.

⚠️ **Ces deux baisses ne sont pas un écart d'encre.** L'aire d'encre absolue vaut
0,1221 × 288 × 452 = **15 896 CSS²** dans la maquette et 0,1021 × 290 × 523 = **15 486 CSS²**
dans le jeu, soit **−2,6 %** : l'encre est la même, c'est le dénominateur qui a grossi de
71,4 CSS de vide. La palette, elle, dit la même chose autrement : la maquette étale ses fonds
sur 4 valeurs dégradées (25,2 + 5,9 + 4,6 + 3,2 %) là où le jeu en pose 3, plates
(43,0 + 22,7 + 18,4 %) — c'est la signature des écarts n°12 et n°13.

### 3. Correspondance des repères

| | référence | capture 16:9 | capture 20:9 |
|---|---|---|---|
| largeur image | 900 px | 1080 px | 1080 px |
| largeur CSS | 300 | 300 | 300 |
| **facteur** | **×3,0** | **×3,6** | **×3,6** |
| hauteur image | 1752 px = 584,0 CSS | 1920 px = 533,3 CSS | 2400 px = 666,7 CSS |
| haut du panneau d'or | y = 125,3 CSS | y = 5,0 CSS | y = 5,0 CSS |
| **offset vertical réf ← capture** | — | **+120,3 CSS** | **+120,3 CSS** |
| origine du repère « portrait » | (69, 732) px | (72, 435) px | idem |
| largeur de la carte-portrait | **117,7 CSS des deux côtés** — les x du portrait sont directement comparables | | |

Toute mesure du temps 3 est exprimée dans ce repère. Les mesures internes au portrait sont
données **depuis le coin haut-gauche intérieur de la carte-portrait**, dont l'axe de symétrie
est à **58,85 CSS** des deux côtés.

### 4. Scripts

Tous dans `mesures/`. Chacun imprime la taille des images qu'il ouvre, porte un contrôle
positif et, quand l'enjeu le mérite, un contrôle négatif. Sorties complètes collées dans
`mesures/sorties.txt`.

| script | ce qu'il mesure | contrôle positif | contrôle négatif |
|---|---|---|---|
| `01_reperes.py` | échelle, offset, frontières d'or, bilan élastique | or du liseré | hauteur de la carte-portrait |
| `02_boites.py` | boîtes, marges intérieures, rythme vertical | largeur de la carte-portrait (117,7 = 117,7) | hauteur de la carte-portrait |
| `03_couleurs.py` | encres, aplats, liseré, voile, palette, luminance, densité | 5 encres + 5 aplats | voile intérieur des compteurs (21 → 0) |
| `04_portrait.py` | les cinq traits : bbox, aire, **taux de remplissage**, axe, silhouette, cadran | couleurs des 3 aplats, remplissage du visage (0,62 = 0,62) | remplissage du col (0,43 → 0,93) |
| `05_reflet.py` | le filet turquoise, par signature de teinte | il le trouve dans la maquette (67,7 %) | balaie les 1920 lignes de la capture, meilleur score 6,6 % |
| `06_resolutions.py` | stabilité T/T+1 s, tenue en 20:9, débordement du sous-titre | largeur du panneau d'or aux 2 résolutions | hauteur de la carte-portrait, qui DOIT grandir en 20:9 |
| `07_textes.py` | hauteurs de capitale, interlignes, étendues d'encre | titre, H2, « 00 », corps | sous-titre (4,7 → 6,1) |
| `08_voyants_et_assumes.py` | voyants, jonction cou/col, vérification des 4 écarts ASSUMÉS | voyant n°1 (7,0 → 7,2 ; disque des deux côtés) | remplissage du col, repris de 04 |

Deux remarques d'instrument, parce qu'elles ont failli produire de faux écarts :
- le détecteur de filets d'or a d'abord compté les **lignes de glyphes du CTA** comme des
  filets ; il exige désormais une plage d'or **contiguë** de plus de 20 % de la largeur ;
- la couleur du vert « Il vous écoute » sortait à 20/255 d'écart tant que je prenais le
  pixel le plus saturé — c'est-à-dire une **frange d'anti-crénelage**. Le mode des pixels
  verts donne (125,179,106) des deux côtés, écart **0**.

---

## Verdict final : **NON APPROUVÉ** (dans le vocabulaire de la commande : **REFUSÉ**)

Ce qui bloque la validation :

1. **Le portrait n'est pas la figure de la maquette** (écarts 1-5) : col rectangulaire au
   lieu d'un triangle et 31 % trop grand, visage et cou hors de l'axe de 3,2 pendant que le
   col part de 1,6 dans l'autre sens, montre sans anneau ni aiguilles, cheveux qui ne
   descendent plus le long du visage. C'est le héros de l'écran et l'angle mort A7 déclaré
   par l'auteur : il est confirmé ouvert.
   ⚠️ Le dossier assume « le col rendu par un **triangle** sommaire ». Ce qui est rendu est
   un carré : **l'écart sort du périmètre de ce qui est assumé**.
2. **Le reflet turquoise est absent** (écart 6) : l'écran s'appelle « Le miroir » et n'a plus
   de glace. Trait d'identité perdu, aux deux résolutions.
3. **Le sous-titre ne se replie plus** (écart 7) : capitale +30 %, une ligne au lieu de deux,
   3,9 CSS de marge avant le bord de la plaque. Aucun état plus bavard n'a été capturé.
4. **La réserve de la maquette a été versée entièrement dans la carte-portrait** (écart 8) :
   en 20:9 le plus grand objet de l'écran est une boîte remplie à 31 %. L'absorption
   élastique elle-même est juste, au CSS près ; c'est sa répartition qui diffère.

Ce qui est acquis et n'a pas à être retouché : **toute la colorimétrie** (22 grandeurs égales,
aucune dérive sRGB/linéaire — l'angle mort A2 est fermé), **la charpente horizontale**
(largeur de la carte, gouttières, compteurs égaux), **les tailles de texte sauf une**,
**la stabilité** (0 pixel entre T et T+1 s), **la tenue en 20:9** (rien de coupé, rien hors
cadre, reflux propre) et **les trois écarts assumés, tous rendus proprement**.
