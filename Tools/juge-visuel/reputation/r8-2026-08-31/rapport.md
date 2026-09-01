# Juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`) — r8 — 2026-09-01

## Verdict : **APPROUVÉ SOUS RÉSERVE**

Une seule réserve, et elle est ponctuelle : **la montre du portrait** — son cadran ne se lit plus
comme une montre (deux barres horizontales parallèles au lieu de deux aiguilles) et son ellipse
**déborde d'un tiers hors de la silhouette du buste**, visible à 1:1 sur la résolution cible sans
rien chercher. Tout le reste de l'écran — cadre, rythme, palette, textes, contenus, stabilité,
deux résolutions — tombe juste ou dans le bruit ; les autres écarts sont du raffinement de dessin
et du mou de mise en page, pas des empêchements de livraison.

- **15 findings dans la table** — 12 `NOUVEAU`, 3 `DÉJÀ APPLIQUÉ`.
- **0 `BLOQUANT`**, 8 `MAJEUR`, 7 `MINEUR`.
- Porte : **2 `EMPÊCHE`** (F1, F2 — une seule et même cause, la montre) · **6 `RAFFINEMENT`**.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes ces grandeurs sont ramenées en **px CSS** (référence ÷3,0 ; capture ÷3,6), repère =
coin haut-gauche du cadre doré (`m01`). Sans cette normalisation, tout serait « 20 % trop grand ».

| # | grandeur | référence `m-120` | capture 1080×1920 | écart | script |
|---|---|---|---|---|---|
| C1 | **hauteur du cadre doré** | 452,0 CSS | 451,9 CSS | 0,1 (0,02 %) | `m01` |
| C2 | largeur du cadre doré | 288,0 CSS | 290,0 CSS | 2,0 | `m01` |
| C3 | **carte portrait** (bordure dorée) | 117,7 × 182,3 CSS | 117,8 × 182,5 CSS | 0,1 / 0,2 | `m04` |
| C4 | couleur de la bordure dorée | (176, 141, 62) | (176, 141, 61) | 1/255 | `m04` |
| C5 | couleur de la **peau** du portrait | (185, 173, 146) | (185, 173, 146) | **0** | `m03` |
| C6 | couleur du **col** (triangle clair) | (234, 224, 200) | (234, 224, 200) | **0** | `m12` |
| C7 | fond du panneau verdict / des cartes / de la plaque | (15,21,31) / (17,24,35) / (13,19,28) | (13,22,34) partout | ≤ 6/255 | `m06b` |
| C8 | fond hors cadre | (17, 24, 34) | (17, 24, 35) | 1/255 | `m06b` |
| C9 | hauteur de capitale du CTA | 6,3 CSS | 6,4 CSS | +1,6 % | `m09` |
| C10 | hauteur des chiffres « 00 » | 22,0 CSS | 21,9 CSS | −0,5 % | `m09` |
| C11 | hauteur de capitale « col ouvert » | 10,0 CSS | 10,3 CSS | +3,0 % | `m09` |
| C12 | hauteur de capitale du titre « Le miroir » | 13,0 CSS | 12,5 CSS | −3,8 % | `m09` |
| C13 | hauteur du libellé « RÈGLES DONNÉES » | 7,7 CSS | 7,8 CSS | +1,3 % | `m09` |
| C14 | **écart entre deux cartes de règle** | 4,3 / 4,3 / 4,4 CSS | 4,2 / 4,5 / 4,2 CSS | ≤ 0,2 | `m08` |
| C15 | nombre de cartes de règle | 4 | 4 | 0 | `m08` |
| C16 | bas du CTA (fin du contenu) | 442,5 CSS | 442,4 CSS | 0,1 | `m02` |
| C17 | x de départ du sur-titre « Pas encore jugeable » | 146,0 CSS | 143,9 CSS | 2,1 (= décalage global) | `m14` |
| C18 | remplissage aire/boîte du col (test « est-ce un triangle ? ») | 0,43 | 0,39 | dans l'assumé | `m12` |
| C19 | **T vs T+1 s** | — | **0 pixel différent** sur 2 073 600 | aucune animation | `m11` |
| C20 | couleur du tiret ENFREINTES vs les « 00 » | — | (127,212,217) = (127,212,217) | **0** | `m15` |

Contrôles d'instrument exécutés : `m11` compare la capture à elle-même → 0 px (positif) et à la
référence redimensionnée → 1 977 390 px (négatif, l'instrument discrimine bien) ; `m09` rend
`ABSENT` sur une fenêtre vide (négatif) ; `m08` trouve 0 « carte » dans la colonne du portrait
(négatif) ; `m10` retrouve le même fond hors tuile des deux côtés (positif).

---

## 0. L'écran, tel que la maquette le dit

**But.** « Le miroir » : venir lire ce que le lieutenant a *absorbé* des règles données. Ici, l'état
vierge — compte neuf, rien de donné, rien d'absorbé. L'écran doit donc dire, sans mentir, *« il n'y
a encore rien à lire, et ce n'est pas un défaut »*.

**Ordre de lecture.** (1) « Le miroir » en or, seul mot chaud de la moitié haute, sous-titré en
petites capitales espacées ; (2) la rangée des trois compteurs turquoise — le seul turquoise de
l'écran, donc le second aimant ; (3) le grand panneau, où l'œil tombe d'abord sur le **portrait**
encadré d'or (le seul autre or) puis glisse à droite vers les quatre règles éteintes ; (4) le
pavé de verdict en serif clair ; (5) le CTA doré, dernier de la colonne.

**Zones.** plaque-titre (enseigne) · rangée de trois tuiles de statistique · grand panneau à deux
colonnes (carte-portrait à gauche, en-tête + 4 cartes de règle à droite) · panneau de verdict
(sur-titre / titre serif / paragraphe) · CTA pleine largeur. Le tout dans un cadre doré de
**462 px CSS de haut**, sous lequel il n'y a que le fond (place du dock).

**Traits d'identité.** ① le double liseré or — cadre + carte-portrait — sur un bleu-nuit quasi noir ;
② le portrait plat, sans visage réaliste, en aplats ; ③ le turquoise réservé aux chiffres ;
④ la ligne de reflet horizontale translucide qui traverse le haut du panneau (le « miroir ») ;
⑤ le serif du verdict opposé au sans-serif de tout le reste.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui. Le but est intact : on comprend d'un coup d'œil qu'il n'y a rien à lire *encore*, et le
paragraphe le dit dans les mêmes mots. L'ordre de lecture est le même, dans le même ordre, avec
les mêmes aimants : l'or du titre, puis le turquoise des compteurs, puis le portrait, puis le
verdict, puis le CTA. Les cinq traits d'identité sont tous là — les deux liserés d'or, le portrait
plat, le turquoise réservé aux chiffres, la ligne de reflet, le serif du verdict. La palette est la
même à moins de 6/255 sur tous les aplats mesurés, y compris la peau et le col qui sortent au
pixel près. Le rythme vertical coïncide : le cadre fait la même hauteur à 0,1 CSS près, et le bas
du CTA tombe au même endroit.

Les trois écarts de tête, par impact perçu :

1. **La montre du portrait.** À 1:1 sur la cible, c'est le seul endroit où l'œil accroche quelque
   chose qui « ne va pas » : une pastille grise dont le tiers gauche flotte *hors* de la silhouette
   noire du buste, et dont le cadran porte deux barres horizontales parallèles là où la maquette
   dessine deux aiguilles. Ce n'est ni un contresens ni une illisibilité — l'information « montre
   cachée » est portée par la carte de règle, pas par la pastille — mais c'est un élément qui
   s'échappe de son parent, et ça se voit sans le chercher.
2. **Le dessin de la tête.** La maquette pose une calotte de cheveux qui enveloppe le crâne et
   redescend aux tempes ; le jeu pose une ellipse *sur* le crâne, comme un béret posé, sur un
   visage 11 % plus large. Le portrait reste cohérent et lisible comme portrait ; c'est un écart de
   dessin, pas de sens — un joueur sans maquette n'a rien à comparer.
3. **Le mou de mise en page.** Les quatre cartes de règle font 8,9 % de moins en hauteur et la
   légende de l'en-tête tient sur 2 lignes au lieu de 3 : le vide sous la 4ᵉ carte, *dans* le
   panneau, passe de 44,1 à 67,7 px CSS (+53 %). La maquette a déjà ce vide ; le jeu l'agrandit de
   moitié. L'écran ne se lit pas autrement pour autant.

Rien n'est coupé, rien ne sort du cadre, rien ne recouvre rien, tous les textes sont entiers et
lisibles, l'écart assumé du compteur ENFREINTES est rendu proprement (même turquoise, même axe),
et l'écran ne bouge pas d'un pixel entre T et T+1 s.

---

## 3. Écarts

| id | zone | gravité | référence | en jeu | écart | instrument | critère | porte |
|---|---|---|---|---|---|---|---|---|
| F1 | portrait / montre — cadran | MAJEUR | ellipse portant **deux aiguilles** issues du centre (V), lisible comme montre | ellipse portant **deux barres horizontales parallèles**, lisible comme « = » ou pastille | forme du glyphe intérieure changée ; le trait ne dit plus « montre » | `m13` (crop apparié 12 px/CSS `crop_montre.png`) | NOUVEAU | **EMPÊCHE** |
| F2 | portrait / montre — position | MAJEUR | ellipse **entièrement à l'intérieur** de la silhouette noire du buste | tiers gauche de l'ellipse **hors du buste**, sur le fond de la carte | débordement du parent, visible à 1:1 sur 1080×2400 | `m13`, crop 1:1 `crop_1a1_portrait_2400.png` | NOUVEAU | **EMPÊCHE** |
| F3 | portrait / chapeau | MAJEUR | calotte de cheveux **enveloppante**, plus large que le visage, redescendant aux tempes | **ellipse aplatie posée sur le crâne**, ne touchant pas les côtés du visage | silhouette de la tête différente (élément héros) | `m07 crop_tete.png`, `m05` | NOUVEAU | RAFFINEMENT |
| F4 | portrait / visage | MAJEUR | largeur d'encre peau **34,3** CSS (h 70,0) | **38,0** CSS (h 71,3) | **+10,8 %** en largeur, +1,9 % en hauteur | `m03`, `m05` | NOUVEAU | RAFFINEMENT |
| F5 | portrait / axe de la figure | MAJEUR | figure centrée sur la carte : axe visage **58,9** = centre carte **58,9** | axe visage **55,7** vs centre carte **58,9** | **−3,2 CSS** (2,7 % de la carte) ; buste et col décalés d'autant, alors que « SALVATORE » et « Il vous écoute » restent centrés | `m05`, `m12` | NOUVEAU | RAFFINEMENT |
| F6 | portrait / revers | MAJEUR | revers dessinés par **deux diagonales sombres** entaillant le triangle du col | **un trait clair horizontal** ≈ 21,3 × 1 CSS sous la pointe du col ; aucune diagonale | partie **EN TROP** (absente de la maquette) + revers absents | `m13`, `crop_buste.png` | NOUVEAU | RAFFINEMENT |
| F7 | grand panneau / mou | MAJEUR | vide sous la 4ᵉ carte de règle = **44,1** CSS ; vide sous la carte portrait = **20,8** CSS ; panneau h = 210,6 | **67,7** CSS ; **27,7** CSS ; panneau h = **216,5** | **+53 %** / **+33 %** / +5,9 CSS. Cause commune : cartes plus courtes (F8) + légende sur 2 lignes (F13) | `m12`, `m02`, `m08` | DÉJÀ APPLIQUÉ (dossier : « tout vide DANS le cadre est à juger ») | RAFFINEMENT |
| F8 | colonne droite / cartes de règle | MAJEUR | hauteur de carte **28,0** CSS (× 4, identiques) | **25,5** CSS (× 4, identiques) | **−8,9 %** ; les écarts entre cartes, eux, sont justes (C14) — le mou est dans la carte, pas dans la pile | `m08` | NOUVEAU | RAFFINEMENT |
| F9 | portrait / col (assumé) | MINEUR | triangle 16,3 × 16,3 CSS, aire 113,8 | 21,4 × 20,5 CSS, aire 173,1 | **+31 % / +26 %** (aire +52 %). Reste **DANS** le périmètre assumé : remplissage 0,39 (≈ 0,43, donc bien un triangle, pas une boîte), centré sur l'axe du cou, ne recouvre pas le cou | `m12` | DÉJÀ APPLIQUÉ | — |
| F10 | verdict / paragraphe | MINEUR | pas d'interligne **8,83** CSS (8,67 / 9,00) | **7,50** CSS (7,50 / 7,50) | **−15 %** — au-delà du seuil de 10 % sur un espacement | `m10` | NOUVEAU | — |
| F11 | CTA | MINEUR | hauteur **25,3** CSS | **23,4** CSS | **−7,5 %** ; hauteur de capitale du libellé identique (C9), c'est la boîte qui se serre | `m02` | NOUVEAU | — |
| F12 | rythme haut du cadre | MINEUR | règle dorée à 58,7 ; haut des tuiles 70,2 ; haut du grand panneau 111,2 | 56,7 ; 68,3 ; 109,5 | **−2,0 CSS** constants sur tout le haut, alors que le bas du CTA coïncide (C16) : le mou est réparti différemment, pas ajouté | `m02` | NOUVEAU | — |
| F13 | en-tête colonne droite | MINEUR | « ce qu'il a absorbé de vos règles » sur **3 lignes**, alignée à gauche | sur **2 lignes**, plus large | ARBITRAGE de chasse (police substituée) ; conséquence : la pile de cartes démarre 7 CSS plus haut | `m07 crop_liste.png`, `m14` | NOUVEAU | — |
| F14 | colonne droite / largeur de carte | MINEUR | 145,0 → 287,7 CSS (**142,7**) | 143,1 → 289,7 CSS (**146,6**) | **+2,7 %** ; la marge carte↔bord du panneau tombe de 8,5 à 6,3 CSS | `m08` | NOUVEAU | — |
| F15 | reflet du miroir (assumé) | MINEUR | ligne translucide à y = **176,3** CSS, traversant la chevelure | y = **170,8** CSS, passant **au-dessus** du chapeau | −3,5 CSS après correction du décalage global. Reste **DANS** l'assumé : présent, figé, et dans le tiers haut du panneau (111 → 181) | `m02` | DÉJÀ APPLIQUÉ | — |

### Écarts assumés — vérifiés rendus proprement

| assumé | vérification | verdict |
|---|---|---|
| « Salvatore » comme nom | présent, lisible, mention « lieutenant.name — non projeté (L0.4) » sous le verdict vert, à sa place | **propre** |
| ENFREINTES à « — » | couleur (127,212,217) **identique** aux deux « 00 » ; axe x décalé de −2,2 CSS, exactement comme le « 00 » de la tuile 1 (−2,3) ; barre posée au milieu vertical des chiffres | **propre** (`m15`) |
| col en triangle plein | remplissage 0,39 (≠ 0,9) ⇒ bien un triangle · centré sur l'axe du cou · ne recouvre pas le cou. Taille +31 % : F9, dans le périmètre | **propre** |
| 4 couleurs hors `DesignTokens` | aucune conséquence visible : peau, col, bordure dorée, fonds, turquoise tous ≤ 1/255 ou ≤ 6/255 | **propre** |
| reflet fixe | présent, figé (0 px entre T et T+1 s), dans le tiers haut du panneau : F15 | **propre** |

---

## 5. Autres résolutions

**1080×2400 (cible téléphone).** Tient. Le cadre doré occupe exactement les mêmes pixels qu'en
1080×1920 — bbox (18, 18, 1061, 1644), soit 290,0 × 451,9 CSS des deux côtés. La comparaison
pixel à pixel de la zone du cadre (y 0…1660) donne un écart maximal de **7/255**, entièrement
imputable au dégradé du décor de fond, qui est étiré sur la hauteur d'écran ; aucune géométrie ne
bouge. Sous le cadre, canal maximal 31 : fond seul, rien qui traîne. Rien de coupé, rien hors
cadre, rien qui déborde de son parent — **sauf F2**, qui déborde de la même façon aux deux
résolutions (le crop 1:1 publié est d'ailleurs pris sur le 1080×2400).

**1080×1920 à T+1 s.** **0 pixel différent** sur 2 073 600 (`m11`). L'écran ne porte aucune
animation. Le contrôle positif (image vs elle-même → 0) et le contrôle négatif (image vs référence
redimensionnée → 1 977 390) prouvent que l'instrument discrimine.

**Le vide sous le cadre** (1920 : 272 px ; 2400 : 752 px) n'est **pas** compté comme écart : le
dossier le pose explicitement comme la place du dock, et le cadre a une hauteur fixe de 462 CSS.

---

## 6. Non vérifié

1. **Que rien ne passe sous le bandeau haut ni ne touche le dock.** Les captures sont prises sans
   le chrome. Or l'arithmétique du dossier est inquiétante en 16:9 : 122 (chrome) + 462 (cadre) =
   **584 CSS**, pour un écran de 1920/3,6 = **533 CSS**. En 20:9 (cible) l'écran fait 666,7 CSS et
   la somme passe ; en 16:9 elle ne passe pas de 51 CSS, soit tout le CTA. *Ce que je ne peux pas
   dire :* si le shell repositionne, met à l'échelle ou fait défiler. **Trancherait :** une capture
   montée dans le shell en 1080×1920, après l'override d'identité (angle mort A4 de l'auteur).
2. **Le trait « buste incliné ».** Le buste est un dôme symétrique dans la maquette *et* dans le
   jeu ; l'inclinaison n'est peut-être pas censée exister à l'état vierge. **Trancherait :** une
   image d'un état où le trait est actif.
3. **Le trait « gants ».** Je ne le trouve dans aucune des deux images à l'état vierge. Je ne peux
   pas dire s'il est absent des deux ou invisible des deux. **Trancherait :** une image d'un état
   où le voyant « gants sales » est allumé.
4. **Les états `derive` / `gages` / `wary` / liste pleine.** Aucune image n'en est fournie (le
   dossier l'écrit, l'auteur le déclare en A5). Je ne juge que l'état vierge.
5. **La famille de police.** Un écart de chasse est mesurable (F13), la famille ne se lit pas
   depuis une image. **Trancherait :** un `fc-match` de la CSS de `chassis6.py` confronté à la
   police embarquée du client. Classé ARBITRAGE, pas défaut.
6. **L'espace de mélange sur le reflet.** La ligne de reflet est translucide et le navigateur
   compose en sRGB, le client en linéaire. Je compare le **pixel résultant** au même endroit et
   l'écart de position (F15) est géométrique, pas colorimétrique ; je n'ai pas mesuré la
   translucidité résultante sur les deux fonds différents qu'elle traverse (carte et panneau),
   faute de repère commun assez propre. **Trancherait :** un profil du reflet sur trois fonds
   connus, dans les deux images.
7. **Le halo intérieur des tuiles de statistique.** L'agrandissement LANCZOS des crops en suggérait
   un dans la référence ; le profil brut (`m10`) donne 15 des deux côtés hors chiffres, soit aucune
   différence mesurable. Je **retire** ce finding plutôt que de le publier : mon premier instrument
   (l'œil sur une image rééchantillonnée) mesurait le rééchantillonnage.
8. **Deux mesures écartées** — voir l'annexe 4.

---

## Annexes

### 3. Correspondance des repères

| | facteur | origine (px image) du coin haut-gauche du cadre doré | largeur CSS du cadre |
|---|---|---|---|
| référence `m-120.png` (900 × 1752) | ×3,0 | (18, 376) | 288,0 |
| capture 1080×1920 | ×3,6 | (18, 18) | 290,0 |
| capture 1080×2400 | ×3,6 | (18, 18) | 290,0 |

Toute grandeur du rapport est en **px CSS depuis ce coin**. Le chrome absent vaut 376/3,0 −
18/3,6 = **120,3 CSS** de décalage vertical entre les deux repères d'image (le dossier annonce
~122 : cohérent).
Origine secondaire, pour le portrait : coin haut-gauche de la carte dorée — référence (69, 732),
capture (72, 435) ; les écarts mesurés dans ce repère sont des **rapports internes**, invariants
d'échelle.

### 4. Scripts et contrôles

| script | ce qu'il mesure | contrôle + | contrôle − |
|---|---|---|---|
| `m01_reperes.py` | bbox du cadre doré | hauteur CSS 452,0 vs 451,9 | hauteur en px bruts 1356 vs 1627 (l'échelle est bien 1,2×) |
| `m02_rythme.py` | frontières le long de 3 colonnes | haut/bas du cadre coïncident | idem en px bruts |
| `m03_portrait.py` | masques peau / plastron | couleur peau identique | — |
| `m04_carte_et_traits.py` | carte dorée du portrait | couleur de bordure identique | **ÉCHOUÉ** : le masque « gris moyen » attrape le texte SALVATORE dans le quart haut ⇒ **ses chiffres de montre sont écartés**, refaits par `m13` |
| `m05_portrait_geom.py` | traits, en repère carte | largeur de carte 117,7/117,8 | **ÉCHOUÉ** : les masques « noir » attrapent le fond de la carte (remplissage 0,86) ⇒ **chapeau/buste écartés**, refaits à l'œil sur crops appariés |
| `m06_couleurs.py` | 1ʳᵉ passe couleurs | — | **ÉCARTÉ EN ENTIER** : points communs aux deux images, donc contaminés par le décalage de 2 CSS ; remplacé par `m06b` |
| `m06b_couleurs.py` | couleurs, points par image + test de platitude | fonds égaux ≤ 6/255 | 4 points rejetés comme non plats et non publiés |
| `m07_crops.py` | crops appariés à 4 px/CSS | même largeur de sortie | — |
| `m08_liste.py` | 4 cartes de règle | 4 cartes des deux côtés | 0 carte dans la colonne du portrait |
| `m09_textes.py` | hauteurs d'encre | CTA 6,3/6,4 | fenêtre vide → ABSENT |
| `m10_tuiles_et_interligne.py` | halo des tuiles, interligne | fond hors tuile 15,8/16,0 | 3 lignes des deux côtés |
| `m11_stabilite_et_2400.py` | T/T+1 s, 2400 | image vs elle-même = 0 px | vs référence = 1 977 390 px |
| `m12_col_montre_vides.py` | col, vides | couleur du col identique | (b) montre : contrôle négatif échoué, chiffres écartés |
| `m13_montre.py` | la montre, crops 12 px/CSS | même fenêtre CSS | — (conclusion tirée du crop, pas du masque) |
| `m14_entete_liste.py` | en-tête colonne droite | x du sur-titre 146,0/143,9 | — |
| `m15_enfreintes.py` | l'assumé ENFREINTES | tuiles 1 et 2 identiques | libellé gris → couleur différente |

Deux instruments ont échoué leur contrôle négatif (`m04`(b), `m05` masques noirs) et **leurs
chiffres ne sont pas publiés** : F1/F2/F3 reposent sur des crops appariés à la même échelle CSS,
pas sur ces masques.

Images produites : `crop_titre.png`, `crop_portrait.png`, `crop_liste.png`, `crop_verdict.png`,
`crop_tete.png`, `crop_buste.png`, `crop_montre.png`, `crop_1a1_portrait_2400.png`.

### Sur la décision de porte

Test appliqué à chaque MAJEUR : *« si je retire l'instrument qui l'a trouvé, un joueur remarque-t-il
encore quelque chose ? »*

- **F1 + F2 → EMPÊCHE.** Oui : à 1:1 sur la cible, sans crop apparié ni maquette, la pastille grise
  à cheval sur le bord du buste se voit, et se voit comme une erreur, pas comme un parti pris.
  Le portrait est dans l'ordre de lecture normal (3ᵉ arrêt de l'œil) et c'est un élément d'identité.
- **F3, F4, F5 → RAFFINEMENT.** Non : sans la maquette, le portrait se lit comme un portrait
  cohérent. Un joueur ne sait pas que les cheveux devaient envelopper le crâne, ni que le visage
  devait être 11 % plus étroit, ni que la figure devait être à 3 px de plus vers la droite.
- **F6 → RAFFINEMENT.** Le trait clair sous le col se voit, mais se lit comme un détail de veste,
  pas comme une casse. Il ne rend aucune information fausse : l'état des quatre traits est porté
  par les cartes de règle, pas par le dessin.
- **F7, F8 → RAFFINEMENT.** La maquette porte déjà ce vide, de la même nature au même endroit ;
  le jeu l'agrandit de moitié. Rien ne change dans ce que l'œil lit ni dans l'ordre où il le lit.

**Pourquoi pas REFUSÉ.** Un refus doit nommer ce qui, concrètement, ne peut pas être livré. Je ne
trouve rien de tel : aucune information n'est fausse, illisible ou inatteignable ; rien n'est coupé
ni hors cadre aux deux résolutions ; aucun écart ne sort du périmètre d'un assumé ; l'écran ne
bouge pas d'un pixel ; et le squelette (cadre, rythme, palette, typographie, contenus) coïncide
au dixième de pixel CSS sur vingt grandeurs.

**Pourquoi pas APPROUVÉ sec.** Parce que c'est le huitième tour et que c'est précisément la raison
de ne pas laisser passer F1/F2 par lassitude : un élément qui s'échappe de sa silhouette sur
l'élément héros de l'écran est le genre de détail qu'aucune des 15 gardes ne peut voir (angle mort
A7 déclaré par l'auteur), et le juge visuel est le dernier à pouvoir le dire.
