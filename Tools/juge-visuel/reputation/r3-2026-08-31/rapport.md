# Juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`, cadre `vierge`) — r3 — 2026-08-31

Référence : `reference/m-120.png` (900×1752, ×3,0) — l'état VIERGE, le seul que la capture montre.
Capture principale : `Assets/Screenshots/screen_b3_reputation_1080x1920.png` (1080×1920, ×3,6).
Toutes les grandeurs de ce rapport sont **en px CSS** (÷3,0 côté référence, ÷3,6 côté capture) ou
en **unités du viewBox SVG** pour le portrait. Aucune comparaison en px bruts.

---

## Verdict : NON APPROUVÉ

*(dans le vocabulaire demandé par l'orchestrateur : **REFUSÉ**)*

L'écran a la bonne palette, les bons textes, la bonne polarité et le bon squelette — mais le bloc
héros ne tient plus sa composition (le cadre du portrait avale tout le mou élastique), le portrait
a perdu ses liserés et a inversé l'ordre cheveux/tête, et **aucun** des huit effets de la maquette
(dégradés de fond, voiles internes, halos, rehauts, reflet correctement étendu) n'est rendu.

**Ce qui bloque, dans l'ordre :** M1 (cadre du portrait élastique — critique à 1080×2400, la
résolution cible), M3 (ordre de superposition inversé sur le visage), M2 (liserés du portrait
absents), M4 (fond de l'écran devenu un aplat), M5 (reflet coupé et 1,5× trop fort), M6 (voiles,
halos et rehauts absents).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport n'est pas recevable. 24 grandeurs, toutes produites par un script.

| # | grandeur | référence | capture | script |
|---|---|---|---|---|
| 1 | `or_filet` (cerne, bord bas de l'enseigne, cadre du portrait) | (176,141,62) | (176,141,61) | 06 |
| 2 | `or_vif` (titre, CTA) | (242,201,107) | (242,201,106) | 06 |
| 3 | `cyan` (chiffres des compteurs) | (127,212,217) | (127,212,217) | 06 |
| 4 | `creme2` (visage, cou) | (185,173,146) | (185,173,146) | 06 |
| 5 | `creme` (col) | (234,224,200) | (234,224,200) | 06 |
| 6 | `vert` (« Il vous écoute ») | (125,179,106) | (125,179,106) | 06 |
| 7 | `muet` (libellés des compteurs) | (138,151,156) | (138,151,156) | 06 |
| 8 | `lisere` (bord des fenêtres) | (42,54,72) | (42,53,73) | 06 |
| 9 | `rang` (gants — polarité « sales ») | (35,42,45) | (34,42,46) | 06 |
| 10 | largeur du cadre `.prt` (CSS déclarée : 118) | 118,0 CSS | 118,1 CSS | 03 |
| 11 | écart `.prt` → tuiles (CSS déclarée : `gap:10px`) | 10,0 CSS | 10,0 CSS | 05 |
| 12 | largeur intérieure du cerne | 288,0 CSS | 290,0 CSS | 01 |
| 13 | largeur des blocs (enseigne / `.pann` / `.cta6`) | 272,0 CSS | 274,4 CSS | 05 |
| 14 | titre « Le miroir » : largeur · hauteur d'encre | 115,7 · 13,3 | 116,7 · 12,8 | 04 |
| 15 | sous-titre de l'enseigne : largeur | 215,7 CSS | 213,3 CSS | 04b |
| 16 | libellé « RÈGLES DONNÉES » : largeur · hauteur | 65,3 · 5,3 | 65,3 · 5,3 | 04b |
| 17 | « lieutenant.name — non projeté (L0.4) » | 93,3 · 5,0 | 91,9 · 5,0 | 04a |
| 18 | « Rien n'a encore déteint » | 170,3 · 11,0 | 172,2 · 10,8 | 04a |
| 19 | les 3 lignes du paragraphe `.pann` (largeurs) | 239,3 / 248,0 / 223,0 | 238,6 / 246,4 / 221,7 | 04a |
| 20 | CTA « DONNER UNE PREMIÈRE RÈGLE » (largeur) | 169,7 CSS | 168,3 CSS | 04a |
| 21 | rythme haut (bord doré enseigne · fenêtres · `.elast`) | 59,2 · 69,3→100,3 · 110,3 | 57,2 · 67,5→98,6 · 108,6 | 02 |
| 22 | écart entre deux tuiles (CSS déclarée : `gap:4px`) | 4,0 CSS | 3,9–4,2 CSS | 03 |
| 23 | polarité : 4 voyants ÉTEINTS (pastille `lisere`, fond `carte`) | 4/4 éteints | 4/4 éteints | 13 |
| 24 | stabilité T vs T+1 s | — | **1 px sur 2 073 600, Δ = 1/255** | 07 |

Contrôles négatifs exercés (chaque instrument sait discriminer) :
la hauteur du cerne DIFFÈRE bien (452,0 contre 522,5 CSS — script 01) ·
le fond de la référence DIFFÈRE bien du haut au bas de la MÊME image (16,23,34)→(11,16,21) (08) ·
le remplissage aire/boîte SÉPARE bien un triangle (0,41) d'un rectangle (0,96) (09) ·
la largeur du buste (46,7 u) SÉPARE bien de celle de la tête (22,4 u) (09b) ·
le comparateur T/T+1 s rend bien 435 914 pixels différents entre 1920 et 2400 (07) ·
l'alpha du reflet DÉCROÎT bien vers les deux bords dans la référence (12).

---

## 0. L'écran, tel que la maquette le dit

**Son but.** « Le miroir ». On y vient lire ce que son lieutenant a **absorbé** des règles qu'on lui
a données. L'écran ne montre pas des chiffres de performance : il montre un **homme**, et ce qu'on
lit sur lui, c'est soi. Dans l'état vierge il dit une chose et une seule : *rien n'a encore déteint,
et ce n'est pas un mauvais score — c'est un « pas encore ».*

**L'ordre de lecture.** (1) « **Le miroir** » en or sérif espacé, seul élément doré large de
l'écran, sous un filet d'or franc. (2) La **rangée de trois chiffres cyan** — les seuls accents
froids et lumineux : `00`, `00/4`, `00`. (3) Le **bloc miroir** : à gauche un portrait dans un cadre
doré, à droite le verdict « Pas encore jugeable » et quatre tuiles éteintes ; l'œil fait
l'aller-retour portrait ↔ tuiles, et c'est ce va-et-vient qui EST le propos de l'écran. (4) Le
panneau d'explication. (5) Le CTA doré, en bas, sous le pied.

**Les zones.** chrome (hors capture) · enseigne · rangée de trois fenêtres-compteurs · cadre
élastique `.elast` contenant le bloc miroir (cadre-portrait 118 CSS de large + colonne des quatre
tuiles) · panneau de prose · pied avec CTA.

**Les traits d'identité** — les cinq choses qui font qu'on reconnaît *cet* écran :
1. **Le cadre doré du portrait**, le seul liseré or de l'intérieur de l'écran, qui isole l'homme.
2. **Le portrait « papier découpé »** : des aplats bornés par un liseré sombre épais, une calotte de
   cheveux plaquée sur le crâne, un col en V crème, une pointe de gant sale au bas de l'épaule.
3. **Le rythme portrait ↔ quatre tuiles** : deux colonnes de hauteur voisine, denses, serrées.
4. **Le fond couvé** : un dégradé vertical du panneau vers l'encre, réchauffé par un halo doré
   sous l'enseigne et refroidi par un halo cyan au pied — l'écran est un intérieur, pas une plaque.
5. **Le reflet** : une fine barre cyan qui traverse TOUT le panneau, portrait compris. C'est ce qui
   fait du panneau un miroir plutôt qu'une liste.

C'est cette grille qui décide de la gravité ci-dessous.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le but reste lisible et le premier regard est juste : titre or, trois chiffres cyan, puis le bloc
miroir. Les mots, la polarité (quatre voyants éteints), les couleurs nommées et la largeur des
blocs sont, eux, **exacts au pixel CSS près**. Un joueur comprendrait l'écran.

Mais l'écran ne se **compose** plus comme la maquette, et pour trois raisons qu'on voit sans
côte à côte.

**(1) Le cadre doré du portrait est devenu une colonne vide.** Dans la maquette il s'arrête au
contenu (182,7 CSS) et le mou de la page reste SOUS le bloc miroir, dans le noir du cadre
élastique. Dans le jeu c'est le cadre du portrait qui s'étire : 252,5 CSS à 1080×1920 (97 CSS de
vide sous l'homme) et **385,8 CSS à 1080×2400 — la résolution cible — soit 231 CSS de vide, 60 %
du cadre, 35 % du panneau entier**. Le va-et-vient portrait ↔ tuiles, qui est le propos de l'écran,
devient un déséquilibre : une colonne vide bordée d'or à côté d'une liste courte. C'est le défaut
qu'un joueur voit en premier, et il empire à la résolution qui compte.

**(2) L'homme n'est plus le même homme.** Aucun liseré : l'encre `fond` mesurée à l'intérieur du
SVG passe de 244 u² (une composante connexe qui dessine toute la silhouette) à 12,4 u² (un œil).
Les épaules ne se détachent plus du fond du cadre que par 1,9 de luminance. Et la calotte de
cheveux est passée **derrière** la tête au lieu de devant : le visage sort en ovale complet (haut
d'encre à 17,4 u au lieu de 22,2) et les cheveux ne sont plus qu'un disque sombre qui dépasse.
« Un homme aux cheveux plaqués » est devenu « un ovale nu devant une ombre ». Le trait d'identité
n°2 est perdu.

**(3) L'écran est éteint.** Le fond est un aplat unique (13,13,22) sur les 16 sondes : plus de
dégradé vertical, plus de halo doré sous l'enseigne (la maquette y monte à (41,40,35)), plus de
halo cyan au pied. Aucun voile interne (`.elast`, `.pann`), aucun halo de chiffre, aucun rehaut
d'enseigne, aucun halo externe du cerne — six mesures centre/bord rendent Δlum = 0,0 là où la
référence rend +2,7, +4,6, −8,9, +11. Et le seul effet qui reste, le reflet, est **coupé** (il
passe derrière le cadre du portrait : rien de 0 à 46 % de la largeur) et **1,5× trop fort**
(alpha 0,663 au pic contre 0,447 dans la maquette, qui est la valeur écrite dans la CSS). Il ne se
lit plus comme un reflet de miroir mais comme un trait de séparation sous la première tuile.

Les couches globales confirment : palette et contrastes **égaux**, densité et rythme **faux**. La
gravité, ici, ne vient jamais de la magnitude en pixels — elle vient de ce que chacun de ces trois
écarts casse un trait d'identité nommé au temps 0.

---

## 3. Écarts

Trié BLOQUANT → MAJEUR → MINEUR → ASSUMÉ → ARBITRAGE. Aucun BLOQUANT : rien n'est coupé, rien n'est
hors cadre, rien n'est illisible, l'ordre de lecture des cinq zones tient.

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| M1 | `mir6.prt` (cadre du portrait) | MAJEUR | hauteur 182,7 CSS ; 20,7 CSS de vide sous le bloc, DANS `.elast` | 252,5 CSS à 1920 · **385,8 CSS à 2400** ; 97 puis 231 CSS de vide DANS le cadre doré | +69,8 / +203,1 CSS | 03 | le mou élastique est absorbé par le mauvais conteneur : la maquette le laisse sous `.mir6`, le jeu l'injecte dans `.prt` (qui est en `align-items:stretch`). Écart INTERNE, donc invariant d'échelle |
| M2 | `prt.svg` — liserés | MAJEUR | encre `fond` = 244,1 u², une composante de 51,2 × 23,5 u (contour de buste, col, gants, tête, cheveux) | 12,4 u², une composante de 3,8 × 4,3 u = **un œil** | −95 % | 09b | aucun `stroke` n'est rendu. Cause unique de M2, m3 et m5 |
| M2b | `prt.svg` — contraste du buste | MAJEUR | buste borné par un liseré à lum 15,4 | buste (lum 22,5) sur le cadre (lum 20,6) : **Δlum 1,9** | −13,5 lum de séparation | 06/09b | conséquence directe de M2 : les épaules se dissolvent dans le cadre |
| M3 | `prt.svg` — calotte / tête | MAJEUR | cheveux peints APRÈS la tête ; visage visible à partir de y = 22,2 u, cheveux 21,1 × 8,0 u | tête peinte APRÈS les cheveux ; visage à partir de y = **17,4 u** (ellipse entière), cheveux 27,6 × 14,2 u | haut du visage +4,8 u (+26 % de la hauteur du visage) | 09b | **ordre de superposition inversé**. Ferme l'angle mort A7 déclaré par l'auteur |
| M4 | fond de l'écran (`.rep6`) | MAJEUR | dégradé 178° (16,23,34) → (11,16,21) → (15,19,21) + radial doré à 50 %/22 % (gouttières à **(41,40,35)**) + radial cyan au pied | **(13,13,22) sur 10 sondes de hauteur et 6 gouttières, sans exception** | jusqu'à (−28,−27,−13) | 08 | les trois couches de `background` sont remplacées par un aplat |
| M5 | `.elast::after` (le reflet) — étendue | MAJEUR | bande continue de 6 % à 94 % de la largeur de `.elast`, **au-dessus** du cadre du portrait | **rien de 0 % à 46 %** (il passe derrière `.prt`), puis 46 %→97 % | moitié gauche perdue | 11/12 | un frère postérieur opaque recouvre le reflet — c'est exactement l'occlusion que la garde `B3S2` ne sait pas voir (A1) |
| M5b | `.elast::after` — intensité | MAJEUR | alpha effectif 0 → **0,447** au centre → 0 (la CSS écrit `opacity:.45`) | 0 → **0,663** au centre, puis palier franc | **×1,48** | 12 | translucidité systématiquement trop forte : signature d'un mélange en espace linéaire |
| M6 | voiles, halos, rehauts | MAJEUR | `.elast` inset noir Δlum **+2,7** · `.pann` inset noir **+4,6** · `.fen` glow cyan **−8,9** · halo des chiffres **+11 lum décroissant sur 8 CSS** · rehaut d'enseigne (26,31,41) · halo externe du cerne (23,26,29) à 2 px contre (18,23,29) à 12 px | **0,0 · 0,0 · 0,0 · 0,0 plat · absent · (13,13,22) partout** | 6 effets sur 6 absents | 08/10 | une seule cause : aucun `box-shadow` / `text-shadow` n'est rendu |
| m1 | `.enseigne` — bord liseré | MINEUR | 1 px CSS de `lisere` (42,54,72) en haut, à gauche, à droite ; puis le rehaut (26,31,41) | le fond `carte` (13,22,34) commence directement ; **seul le bord bas doré subsiste** | bord absent sur 3 côtés | 11 | **écart sélectif** : `.fen`, `.tl` et `.pann` ont bien leur liseré. Désigne un conteneur traité à part |
| m2 | `.pied` — gouttière basse | MINEUR | 9,3 CSS sous le CTA (= la marge latérale, 8) | **31,9 CSS** (4× la marge latérale) | +22,6 CSS | 02 | non couvert par les assumés. Voir §6 : sans le chrome je ne peux pas dire si c'est une réserve de dock |
| m3 | `prt.svg` — trait sous le col | MINEUR / **EN TROP** | rien à l'apex du col (y = 70 u) | **1 px de haut, 14,0 u (21,7 CSS) de large, (96,91,83)** = crème à ~35 % sur le buste, exactement à y = 70 u | élément inexistant dans la maquette | 10 | la rangée basse de la boîte du triangle est peinte. Non couvert par l'assumé « col en triangle » |
| m4 | `prt.svg` — centrage | MINEUR | centre du buste à 247 px pour un centre de cadre à 246,5 | centre du buste à 274 px pour un centre de cadre à 284 | **−2,8 CSS vers la gauche** | 09b | uniforme sur les 6 traits (tête, cou, cheveux, col, gants, buste : −1,9 à −2,1 u) : c'est le SVG entier qui est décalé, pas une forme |
| m5 | `prt.svg` — marques des gants | MINEUR | 2 traits `fond` de 1 u sur l'ellipse des gants | absents | 2 traits | 09b | même cause que M2. La polarité « sales » reste portée par `rang`, correcte |
| m6 | hauteurs de tuiles et interlignes | MINEUR | tuile 28,3 CSS · interligne `.pann` 9,3 CSS · interligne du span de verdict 8,2 CSS | 25,8 · 7,6 · 7,5 | −8,8 % · **−18 %** · −9 % | 03/04a/04b | les hauteurs de CAPITALE sont égales (cf. contrôle positif) : c'est l'interlignage, pas la taille |
| m7 | rembourrages intérieurs | MINEUR | padding de `.elast` 9,0 CSS (bord→`.prt`) · retrait du contenu de tuile 15,3 CSS | 7,2 · 13,0 | −1,8 · −2,3 CSS | 05 | |
| m8 | hauteurs des blocs fixes | MINEUR | enseigne 59,2 · `.pann` 75,3 · `.cta6` 25,4 CSS | 57,2 · 73,0 · 23,4 | −2,0 · −2,3 · −2,0 CSS | 02 | même signe partout : un pas de rembourrage vertical systématiquement plus court |
| A1 | nom « Salvatore » + mention L0.4 | ASSUMÉ | présente sous le verdict, encre 5,0 CSS, largeur 93,3 | présente sous le verdict, encre 5,0 CSS, largeur 91,9 | — | 04a | **DANS le périmètre** : ni absente, ni illisible, ni déplacée |
| A2 | compteur ENFREINTES à « — » | ASSUMÉ | « 00 » cyan, centre (242,4 ; 80,7) CSS | « — » **exactement `cyan` (127,212,217)**, centre (243,5 ; 80,0) CSS | +1,1 en x, −0,7 en y | 04b/06 | **DANS le périmètre** : même couleur et même place que les deux autres chiffres — le trou se lit comme un trou |
| A3 | col en triangle sans liseré | ASSUMÉ | triangle, remplissage aire/boîte 0,52 | triangle, remplissage **0,392** (la sortie était fixée à ~0,9) ; 14,0 u de large = la largeur « ouvert » (fermé = 8 u) ; centré sur l'axe du cou (col 29,0 u / cou 28,95 u) ; ne recouvre pas le cou | — | 09b | **DANS le périmètre sur les trois critères de sortie.** Le trait en trop à sa pointe (m3) n'est pas couvert par cet assumé et est remonté à part |
| A4 | 4 couleurs hors `DesignTokens` | ASSUMÉ | `carte` (17,24,35) · `carte2` (22,25,27) · `lisere` (42,54,72) · `vert` (125,179,106) | (13,22,34) · (22,22,28) · (42,53,73) · (125,179,106) | ≤ 4/255 par canal | 06 | **DANS le périmètre** : la dette de code n'a aucune conséquence visible |
| A5 | reflet FIXE, non animé | ASSUMÉ | — | **1 px différent sur 2 073 600 entre T et T+1 s (Δ = 1/255)** ; présent ; à 61,9 CSS sous le haut de `.elast` = 34,7 % de la course déclarée ; à 23 % de la hauteur du panneau | — | 07/11 | **DANS le périmètre.** Mais l'assumé ne couvre QUE « fixe / présent / tiers haut » : son étendue et son intensité sont hors périmètre → M5 et M5b |
| R1 | retour à la ligne du span du verdict | ARBITRAGE | 3 lignes (« ce qu'il a » / « absorbé de vos » / « règles ») | **2 lignes** (« ce qu'il a absorbé » / « de vos règles ») | −1 ligne | 04b | même largeur disponible (le jeu atteint 278,3 CSS pour une limite à 279) : différence de chasse de police |
| R2 | chasse des titres de tuiles | ARBITRAGE | « col ouvert » 102,7 CSS | 110,0 CSS | **+7,1 %** à hauteur de capitale égale | 04b | même famille d'arbitrage que R1 |

---

## 5. Autres résolutions

**`screen_b3_reputation_1080x2400.png` (20:9, cible téléphone) — tient, avec un écart aggravé.**
Rien n'est coupé, rien n'est hors cadre, rien ne déborde de son parent, l'ordre de lecture des cinq
zones est conservé, et toutes les proportions horizontales sont identiques à la version 16:9 (bords
de `.prt` à 15,0 et 132,8 CSS ; bords des tuiles à 143,1 et 275,0 ; blocs à 7,8→282,2 — script 03).
Le rythme haut est identique **au dixième de px CSS près** jusqu'à `.elast` (56,7 · 67,8 · 98,9 ·
108,9 CSS), ce qui est le bon comportement : tout le supplément (+133,1 CSS de hauteur de cerne)
part dans le bloc élastique.

**Écart propre à 1080×2400 :** M1 y devient dominant. Le cadre du portrait passe à **385,8 CSS**
(contre 182,7 dans la maquette) et porte **231 CSS de vide** sous l'homme — 60 % du cadre, 35 % de
la hauteur totale du panneau. La colonne de droite, elle, s'arrête à 258,6 CSS. À cette résolution
le bloc miroir n'est plus une paire de colonnes voisines mais une colonne vide encadrée d'or à
côté d'une liste courte, et c'est la première chose que l'œil rencontre après les compteurs.
La gouttière basse sous le CTA reste à 32,2 CSS (m2), identique.

**`screen_b3_reputation_1080x1920_t1s.png` — tient.** 1 pixel diffère de la première capture, de
1/255, en (389,162) dans le sous-titre : du bruit de quantification, pas un mouvement. Aucune
animation. (Script 07, avec contrôle positif à 0 px et contrôle négatif à 435 914 px.)

---

## 6. Ce que je n'ai pas pu vérifier

1. **Tout ce que le chrome cacherait ou toucherait.** Les captures sont sans bandeau ni dock
   (délibéré, documenté). Je ne peux donc pas dire que rien ne passe sous le bandeau, que rien ne
   touche le dock, ni si l'enseigne reste lisible sous la jauge HEAT. **En particulier m2** (les
   22,6 CSS px de vide en trop sous le CTA) est ambigu : c'est soit un défaut de gouttière, soit
   une réserve de dock non déclarée. *Ce qui trancherait :* une capture montée dans le shell, après
   l'override d'identité (A4 des angles morts déclarés).
2. **La famille de police.** Une image ne la donne pas. R1 et R2 sont classés ARBITRAGE sur cette
   base et non en défaut. *Ce qui trancherait :* `fc-match` sur les familles écrites dans le
   châssis (`DejaVu Sans`, `DejaVu Serif`) au moment du rendu de la maquette, confronté à
   l'inventaire des polices embarquées par le client.
3. **Les quatre autres états de l'écran.** `drifting`, `hostile`, `wary`, la liste pleine et les
   gages ne sont dans AUCUNE image de ce dossier (A5 des angles morts déclarés). Ne sont donc
   exercés ni les quatre poses (rotations de 0/6/14/20° autour de (31,70)), ni les libellés
   « col boutonné / manches roulées / montre visible / gants propres », ni les manchettes, ni la
   montre dorée, ni un voyant ALLUMÉ (pastille `or_vif` + halo, bord `or_filet`, fond `carte2`).
   **Or M2 et M6 font peser un risque précis sur cet état non capturé :** le voyant allumé se
   distingue de l'éteint par sa couleur ET par un `box-shadow` de 7 px — et aucun `box-shadow`
   n'est rendu. *Ce qui trancherait :* une capture de l'état `canon` (homologue `m-119`) et de
   l'état `derive` (homologue `m-121`).
4. **La netteté du portrait.** À 4×, les bords de la tête et de la calotte sont sensiblement plus
   flous dans la capture que dans la référence, alors que le cou et le col y sont nets. Je ne peux
   pas dire depuis l'image si c'est une texture de faible résolution agrandie ou un anti-crénelage
   plus doux. *Ce qui trancherait :* la taille de la texture ou du maillage du portrait dans le
   client.
5. **L'origine exacte du SVG dans son cadre.** m4 (décentrage de 2,8 CSS) repose sur l'hypothèse
   que le SVG est centré dans le cadre — hypothèse corroborée par la symétrie du buste et par le
   fait que la référence, elle, tombe à 0,5 px du centre. *Ce qui trancherait :* le rectangle du
   nœud du portrait dans le client.
6. **La NATURE des inversions d'ordre.** Je constate ce qui recouvre quoi (M3, M5). Je ne peux pas
   dire depuis une image si c'est un ordre de fratrie, un masque, ou un frère plein cadre.
7. **La dette de code des 4 couleurs hors tokens (A4).** Je vérifie le rendu, pas le code. Le rendu
   est conforme ; la dette reste entière et n'appartient pas au juge visuel.

---

## Annexes

### 1. Inventaire de la référence (`m-120.png`, 900×1752, ×3,0)

Coordonnées en px CSS depuis le coin haut-gauche du cerne (18, 377).

| id | catégorie | parent | bbox (CSS) | forme | remplissage | bord | effet | texte |
|---|---|---|---|---|---|---|---|---|
| `cerne` | cadre | écran | 0,0 → 288,0 × 452,0 | rect, r≈1 | transparent | 1 px `or_filet` (176,141,62) | halo externe : (23,26,29) à 2 px, (18,23,29) à 12 px | — |
| `fond` | décor | écran | plein écran | dégradé 178° (16,23,34)→(11,16,21)→(15,19,21) + radial doré 50 %/22 % (gouttières à (41,40,35)) + radial cyan 50 %/96 % | — | — | — |
| `enseigne` | plaque | écran | 8,0 → 280,0 × 7,7→60,0 | rect | (11,17,27)→(12,18,28) | 1 px `lisere` 3 côtés + 2 px `or_filet` en bas | rehaut interne haut (26,31,41) | — |
| `enseigne.b` | titre | `enseigne` | largeur 115,7 | — | `or_vif` (242,201,107) | — | — | « Le miroir », encre 13,3 CSS, sérif, chasse .2em |
| `enseigne.i` | sur-titre | `enseigne` | largeur 215,7, 2 lignes | — | `creme2` | — | — | « UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ », capitales, chasse .34em |
| `compteurs` | rangée | écran | 8,0 → 280,0 × 69,3→100,3 | 3 fenêtres, gap 6,0 | `creux` éclairci par le glow → (14,23,30) | 1 px `lisere` | glow cyan interne : centre lum 14,5 / bord 23,4 (Δ −8,9) | — |
| `fen1.b` … `fen3.b` | chiffres | `compteurs` | encre 11,0 / 11,7 / 11,0 CSS | — | `cyan` (127,212,217) | — | halo cyan : +11 lum, décroissant sur 8 CSS | « 00 », « 00/4 », « 00 » |
| `fen*.span` | libellé | `compteurs` | encre 5,3 CSS, largeurs 65,3 / 44,7 | — | `muet` (138,151,156) | — | — | « RÈGLES DONNÉES / ABSORBÉES / ENFREINTES » |
| `elast` | cadre | écran | 8,0 → 280,0 × 110,3→321,3 (h 211,0) | rect | `fond2` | 1 px `lisere` | voile interne noir : centre lum 12,4 / bord 9,7 (Δ +2,7) | — |
| `elast::after` | reflet | `elast` | 6 %→94 % de la largeur, à 65,7 CSS du haut, épaisseur 2,0 CSS | bande | `cyan` en dégradé 90° ; alpha effectif 0→**0,447**→0 | — | — | — |
| `prt` | plaque | `elast` | 17,0 → 134,7 (**118,0 de large**) × 118,3→300,7 (**h 182,7**) ; 20,7 CSS de vide sous elle dans `elast` | rect | `carte` (17,24,35) | 1 px `or_filet` | — | — |
| `prt.i` | libellé | `prt` | encre 5,3 CSS, 2 lignes, largeur 72,0 | — | `muet` | — | — | « SALVATORE, VOTRE LIEUTENANT » |
| `prt.svg` | portrait | `prt` | 96 × 119 CSS, centré (centre à 247 px pour un cadre à 246,5) | voir ci-dessous | — | — | — | — |
| `prt.b` | verdict | `prt` | encre 7,3 CSS, largeur 66,7 | — | `vert` (125,179,106) | — | — | « Il vous écoute », sérif |
| `prt.ref` | note | `prt` | encre 5,0 CSS, largeur 93,3 | — | `eteint` | — | — | « lieutenant.name — non projeté (L0.4) » |
| `lect.verdict.b` | titre | `elast` | 2 lignes, encre 7,7 / 10,0, pas de ligne 11,7 CSS | — | `muet` | — | — | « Pas encore jugeable », sérif |
| `lect.verdict.span` | légende | `elast` | **3 lignes**, pas de ligne 8,2 CSS, largeurs 28,7 / 48,3 / 19,0 | — | `muet` | — | — | « ce qu'il a absorbé de vos règles » |
| `tl1`…`tl4` | tuiles | `elast` | 145,0 → 271,0 (126,0 de large) × **28,3 CSS de haut**, gap 4,0 | rect | `carte` | 1 px `lisere` | — | — |
| `tl*.lum` | voyant | `tl*` | 6,3 × 6,3 CSS, retrait gauche 15,3 | cercle | **`lisere` (42,54,72) — ÉTEINT ×4** | — | aucun halo | — |
| `tl*.b` | titre | `tl*` | encre ~7,4 CSS, « col ouvert » 102,7 de large | — | `creme2` | — | — | col ouvert / manches basses / montre cachée / gants sales |
| `tl*.small` | sous-titre | `tl*` | 105,3 de large | — | `eteint` | — | — | la comptabilité tenue / … |
| `pann` | panneau | écran | 8,0 → 280,0 × 331,0→406,3 (h 75,3) | rect | `carte` | 1 px `lisere` | voile interne noir : Δlum +4,6 | — |
| `pann.i / .b / .small` | textes | `pann` | encres 5,7 / 11,0 / 6,7 CSS ; 3 lignes à pas 9,3 | — | `muet` / `creme` / `creme2` + `or_vif` sur les `u` | — | — | « « PAS JUGEABLE » N'EST PAS « MOYEN » » / « Rien n'a encore déteint » / le paragraphe |
| `cta6` | bouton | `pied` | 8,0 → 280,0 × 416,3→441,7 (h 25,4) ; 9,3 CSS sous lui | rect | `carte2` | 1 px `or_filet` | — | « DONNER UNE PREMIÈRE RÈGLE », encre 8,3 CSS, `or_vif` |

**Le portrait de la référence, en unités du viewBox (62 × 78 ; 1 u = 4,645 px) :**

| trait | boîte d'encre | aire | remplissage | lecture |
|---|---|---|---|---|
| tête | 22,4 × 23,7 u, y 22,2→45,6 | 391,6 u² | 0,739 | **le haut du crâne est couvert par la calotte** |
| cou | 9,9 × 9,7 u, x 26,0→35,7 | 92,2 u² | 0,961 | rectangle |
| cheveux | 21,1 × 8,0 u, y 11,4→19,2 | 124,9 u² | 0,744 | calotte plaquée, PEINTE APRÈS la tête |
| buste | 46,7 × 19,8 u | 625,3 u² | 0,676 | dôme |
| col | 9,5 × 9,5 u | 46,9 u² | **0,523** | triangle |
| gants | 8,6 × 5,4 u, x 8,0→16,4 | 30,0 u² | 0,647 | ellipse `rang` + 2 marques de saleté |
| **encre `fond` (liserés + yeux + bouche)** | **51,2 × 23,5 u** | **244,1 u²** | 0,203 | **une seule composante connexe : le contour de toute la silhouette** |

**Couche globale (référence).** Palette dominante : `carte`/`fond`/`fond2` (les trois noirs bleutés,
> 70 % de l'aire) · `carte2` (buste, cheveux, CTA) · `creme2` (visage, cou, textes de tuiles) ·
`or_filet`/`or_vif` (cerne, cadre du portrait, titre, CTA — < 3 % de l'aire mais tout le poids
visuel) · `cyan` (3 chiffres + le reflet). Luminance de fond 15–25, encre 90–240 : contraste fort,
densité faible (l'écran respire). Rythme vertical (frontières en CSS sous le cerne) :
7,7 · 60,0 · 69,3 · 100,3 · 110,3 · 321,3 · 331,0 · 406,3 · 416,3 · 441,7 · 452,0.

### 2. Inventaire de la capture (`…_1080x1920.png`, 1080×1920, ×3,6)

Refait depuis les pixels, pas depuis l'inventaire ci-dessus. Origine : coin haut-gauche du cerne
(18, 19). Seuls les champs qui DIFFÈRENT sont détaillés ; tout le reste est en contrôle positif.

| id | ce que la capture montre | statut |
|---|---|---|
| `cerne` | 0,0 → 290,0 × 522,5 CSS. `or_filet` (176,141,61). **Aucun halo externe** : (13,13,22) à 2 px comme à 12 px | ÉGAL sauf l'effet (M6) |
| `fond` | **(13,13,22) sur 10 sondes de hauteur et 6 gouttières.** Aucun dégradé, aucun radial | **M4** |
| `enseigne` | 7,8 → 282,2 × 8→57,2 CSS. Fond `carte` (13,22,34) opaque. **Aucun bord `lisere`, aucun rehaut** ; le bord bas doré est là (8 px = 2,2 CSS) | **m1**, m8 |
| `enseigne.b/.i` | « Le miroir » 116,7 CSS · sous-titre 213,3 CSS sur 2 lignes | ÉGAL |
| `compteurs` | 3 fenêtres, 67,5→98,6 CSS, bords `lisere` présents. **Fond (13,13,22) = le fond de l'écran ; aucun glow interne, aucun halo de chiffre** | ÉGAL en géométrie, **M6** en effet |
| `fen3.b` | **« — »**, `cyan` exact, centre (243,5 ; 80,0) CSS | **ASSUMÉ A2, dans le périmètre** |
| `elast` | 7,8 → 282,2 × 108,6→374,4 (h 265,8). **Aucun voile interne** (centre = bord = (13,13,13)) | **M6** |
| `elast::after` | bande à 61,9 CSS du haut, 1,9 CSS d'épaisseur, `cyan`. **Absente de 0 à 46 % de la largeur** (elle passe derrière `.prt`), présente de 46 % à 97 % ; **alpha 0,663 au pic** | **M5, M5b** ; ASSUMÉ A5 dans son périmètre |
| `prt` | 15,0 → 132,8 (**118,1 de large**, ÉGAL) × 115,6→**367,8** (**h 252,5**). 6,7 CSS de vide sous elle dans `elast` ; **97 CSS de vide DANS elle, sous l'homme** | **M1** |
| `prt.svg` | centre du buste à 274 px pour un cadre centré à 284 → **−2,8 CSS** | **m4** |
| `lect.verdict.span` | **2 lignes** au lieu de 3, pas de ligne 7,5 CSS | **R1**, m6 |
| `tl1`…`tl4` | 143,1 → 275,0 (131,9 de large) × **25,8 CSS de haut**, gap 3,9–4,2. Retrait du contenu 13,0 CSS | **m6**, m7 |
| `tl*.lum` | 6,4 × 6,4 CSS, **`lisere` — ÉTEINT ×4** | ÉGAL (polarité correcte) |
| `pann` | 7,8 → 282,2 × 384,2→457,2 (h 73,0). **Aucun voile interne.** Interligne 7,6 CSS | **M6**, m6, m8 |
| `cta6` | 7,8 → 282,2 × 467,2→490,6 (h 23,4). **31,9 CSS de vide sous lui** | **m2**, m8 |
| — | **aucune partie EN TROP au niveau des blocs** ; une seule au niveau du trait : le filet sous le col (m3) | |

**Le portrait de la capture, en unités du viewBox (1 u = 5,574 px) :**

| trait | boîte d'encre | aire | remplissage | delta contre la référence |
|---|---|---|---|---|
| tête | 24,0 × **28,7** u, y **17,4**→45,9 | 496,2 u² | 0,719 | **haut du crâne +4,8 u : l'ellipse entière est visible** (M3) |
| cou | 10,0 × 10,0 u | 100,9 u² | **1,000** | ÉGAL (et contrôle négatif du détecteur de forme) |
| cheveux | **27,6 × 14,2** u | 211,1 u² | 0,539 | +6,5 / +6,2 u : la calotte est passée DERRIÈRE (M3) |
| buste | 48,3 × 21,3 u | 686,0 u² | 0,666 | ÉGAL (contrôle positif : 50 u générés) |
| col | 14,0 × 13,5 u | 73,8 u² | **0,392** | triangle, largeur « ouvert » — **ASSUMÉ A3 dans le périmètre** |
| gants | 9,9 × 6,3 u | 49,8 u² | 0,804 | ellipse pleine, **sans les 2 marques de saleté** (m5) |
| **encre `fond`** | **3,8 × 4,3 u** | **12,4 u²** | 0,762 | **= un œil. Zéro liseré** (M2) |
| *(en trop)* | filet horizontal 14,0 u × 1 px à y = 70 u, (96,91,83) | — | — | **m3** |

**Couche globale (capture).** Palette : les mêmes jetons, aux mêmes valeurs (≤ 4/255) — mais un
**aplat** de fond au lieu de trois couches de dégradé, et **zéro** pixel d'ombre, de halo ou de
voile. Contrastes de texte identiques. Densité **plus faible** : 97 CSS (1920) à 231 CSS (2400) de
vide supplémentaire dans le cadre du portrait, +22,6 CSS sous le CTA. Rythme vertical (CSS sous le
cerne) : 8 · 57,2 · 67,5 · 98,6 · 108,6 · **374,4** · 384,2 · 457,2 · 467,2 · 490,6 · 522,5 —
identique à la référence jusqu'à 110, puis décalé de +53 CSS par l'élastique et de +22 en bas.

### 3. Correspondance des repères

| | référence `m-120.png` | capture `…_1080x1920.png` | capture `…_1080x2400.png` |
|---|---|---|---|
| taille | 900 × 1752 | 1080 × 1920 | 1080 × 2400 |
| échelle | ×3,0 (900 px = 300 CSS) | ×3,6 (1080 px = 300 CSS) | ×3,6 |
| origine (coin haut-gauche du cerne) | (18, 377) | (18, 19) | (18, 18) |
| hauteur du cerne | 452,0 CSS | 522,5 CSS | 656,4 CSS |
| chrome présent | oui (~130 CSS au-dessus de l'origine) | non | non |
| unité du viewBox du portrait (62 × 78 rendu sur 96 CSS) | 4,6452 px | 5,5742 px | 5,5742 px |
| origine du SVG du portrait | (102, 815) | (111, 534) — mesurée à (100, 534) | — |

**Toute mesure du §3 cite cette correspondance.** Aucune comparaison en px bruts n'a été faite ; la
consigne d'échelle du dossier (« la capture est 1,2× plus grande, et c'est NORMAL ») est appliquée
partout, et c'est pourquoi les 24 grandeurs du contrôle positif sortent égales alors que les images
n'ont pas la même taille. Les écarts retenus sont soit des rapports INTERNES (M1, M2, M3, M5), soit
des couleurs (M4, M6), soit des écarts en CSS après normalisation (m1 à m8).

### 4. Scripts

Tous dans `mesures/`. Chacun imprime la taille des images qu'il ouvre et porte son contrôle positif
(et, quand l'enjeu le mérite, son contrôle négatif) dans sa docstring.
**Leur sortie intégrale est collée dans `mesures/sorties.txt`** (442 lignes, regénérable par
`for f in mesures/*.py; do python3 $f; done`). PIL seulement ; aucun numpy.

| script | ce qu'il mesure |
|---|---|
| `01_reperes.py` | bornes du cerne et des bandes dorées ; pose l'échelle et l'origine |
| `02_rythme.py` | rythme vertical par marches de luminance, dans les 3 captures |
| `03_miroir.py` | boîte de `.prt`, boîtes des tuiles, vide résiduel dans `.elast` |
| `04_textes.py`, `04a_lignes.py`, `04b_lignes2.py` | hauteur d'encre et largeur de chaque ligne de texte |
| `05_horizontal.py` | bords gauche/droite de tous les blocs |
| `06_couleurs.py` | 22 aplats et textes, contre les jetons du châssis |
| `07_stabilite.py` | T contre T+1 s (et les deux contrôles) |
| `08_fond_effets.py` | profil du fond (16 sondes) + les voiles internes centre/bord |
| `09_portrait.py`, `09b_traits.py` | les 7 traits du portrait par composantes connexes, en unités SVG |
| `10_details.py` | le filet en trop sous le col, le halo des chiffres, les rehauts |
| `11_reflet_enseigne.py` | le reflet sur colonne d'aplat ; le bord manquant de l'enseigne |
| `12_reflet_profil.py` | alpha effectif du reflet sur 21 colonnes |
| `13_polarite.py` | les 4 voyants : pastille, fond, bord |

---

## Note sur le dossier

Le dossier est bien complet et instruisable : aucun champ « à remplir » n'y subsiste. Deux remarques
pour le prochain tour :

- La colonne « ce qui le ferait SORTIR de l'assumé » a fait exactement son travail sur A3 (le col) :
  sans elle j'aurais compté le triangle sans liseré comme un défaut, et **avec** elle j'ai su que le
  filet en trop à sa pointe (m3), lui, n'était pas couvert. Même chose pour A5 : l'assumé couvre
  « fixe / présent / tiers haut », pas l'étendue ni l'intensité — d'où M5 et M5b.
- `angles-morts-declares.md` a désigné juste : A7 (le portrait) et A1 (l'occlusion réelle) sont
  exactement là où sont M3 et M5. A2 (les couleurs rendues) est, lui, **fermé par ce rapport** :
  les jetons sortent à ≤ 4/255. En revanche l'angle A3, déclaré FERMÉ par la garde `B3S4`, ne l'est
  que pour la propriété « le bloc élastique absorbe la hauteur ajoutée » — il l'absorbe bien, mais
  **au mauvais endroit** (M1). Une garde qui vérifie qu'une hauteur est absorbée ne dit pas par
  quel enfant.
