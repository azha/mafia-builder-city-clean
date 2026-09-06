# Juge visuel ⊥ — ㊲ La réputation (« le miroir »), `screen_b3` — r9 — 2026-09-06

Références utilisées : `reference-1080x2102.png` (cadre **#120**, l'état VIERGE) comme témoin
principal ; `etats/m-119.png` (×3,0) comme témoin **secondaire** pour tout ce que #120 ne porte
pas (la tuile ALLUMÉE, la montre, le col boutonné). Choix du témoin justifié au §T ci-dessous.
Chrome jugé contre `Tools/juge-visuel/ecran-principal/ecran-canon.png`, que le dossier désigne
(section « Échelle ») mais ne joint pas — je le déclare.

---

## Verdict : **NON APPROUVÉ**

Un BLOQUANT : le paragraphe du panneau bas affirme « ses quatre voyants sont éteints parce qu'il
n'a **rien pris de vous** » pendant que deux des quatre voyants sont allumés en or et que le
compteur annonce « 02/4 ABSORBÉES ». Sur la **forme** seule — géométrie, palette, typographie,
rythme — l'écran est en revanche un décalque très proche de la maquette.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les valeurs sont en pixels d'image ; l'échelle est ×3,6 des **deux** côtés pour le contenu
(donnée par le dossier, re-vérifiée : voir annexe 3). Scripts : `mesures/m01`…`m26`.

| # | grandeur | RÉF | JEU | écart |
|---|---|---|---|---|
| 1 | hauteur du cadre, filet `.cerne` à filet `.cerne` | 1626 px | 1626 px | **0 px** (m01) |
| 2 | largeur de la carte portrait `.prt` (118 CSS voulu) | 424 px | 425 px | +1 px (m02) |
| 3 | gouttière `.mir6` entre la carte et les tuiles (10 CSS voulu) | 37 px | 37 px | 0 px (m02/m05) |
| 4 | largeur des 3 fenêtres `.fen` / écart entre elles | 312·312·312 / 22 px | 315·314·315 / 22 px | ≤ 3 px (m18d) |
| 5 | bloc `.enseigne` (haut → filet or) / bloc `.compteurs` | 188 / 113 px | 183 / 115 px | −5 / +2 px (m03) |
| 6 | titre « Le miroir » — encre h × l | 47 × 415 | 46 × 421 | −2,1 % / +1,4 % (m07) |
| 7 | chiffres `.fen b` — hauteur d'encre | 41 px | 41 px | **0 px** (m08) |
| 8 | « RÈGLES DONNÉES » / « ABSORBÉES » / « ENFREINTES » — h × l | 18×233 · 18×154 · 15×160 | 19×234 · 19×153 · 15×159 | ≤ 1 px (m08) |
| 9 | `.tl b` « manches basses » / `.tl small` « la justice… » | 21×242 / 19×246 | 21×245 / 19×245 | ≤ 3 px (m09) |
| 10 | `.pann i` / `.pann b` « Rien n'a encore déteint » | 19×586 / 39×613 | 19×591 / 38×621 | ≤ 8 px (m09) |
| 11 | texte du CTA / `.prt b` « Il vous écoute » | 29×611 / 26×239 | 29×607 / 26×247 | ≤ 8 px (m09/m18) |
| 12 | pastilles `.lum` : allumée / éteinte (7 CSS voulu) | — / 26 px | 24 / 26 px | (m16) |
| 13 | couleurs d'encre (8 jetons : muet, cyan, crème, crème2, éteint, vert, or_vif, or_filet) | jetons exacts | **identiques ou ±1/255** | (m08/m09/m16) |
| 14 | aplats : `.cta6` · `.prt`/`.pann`/`.tl OFF` · `.elast` | #16191b · #111823 · #0b0d0d | #16161c · #0d1622 · #0d0d0d | ≤ 4/255 (m13) |
| 15 | couverture de palette, 12 jetons | — | — | **≤ 0,4 point** partout (m20b) |
| 16 | luminance moyenne / densité d'encre de la zone de contenu | 31,94 / 8,12 % | 31,10 / 8,19 % | −2,6 % / +0,9 % (m18e) |
| 17 | rythme vertical du cadre (6 frontières, ramenées au haut du cadre) | — | — | **≤ 13 px sur 1626** (m03) |
| 18 | épaisseur de la ligne de balayage (2 CSS voulu) | 8 px | 7 px | −1 px (m15) |
| 19 | position de la montre dans le buste (SVG : unités 50−31 ⇒ +106 px) | absente (#120) | **+105,5 px** | +0,5 px (m25) |
| 20 | inventaire : 3 compteurs · 4 tuiles · 1 carte portrait · 1 panneau · 1 CTA | 3·4·1·1·1 | 3·4·1·1·1 | **rien en trop, rien d'absent** |
| 21 | accord buste ↔ tuiles (col étroit + montre + pas de manchettes + gants sombres) | — | **4/4 cohérents** | (m25/m26) |
| 22 | gouttière : dernière encre du chrome haut / première encre du dock | — | 230 (cadre à 250) / 2179 (cadre à 1876) | **aucun chevauchement** (m19a) |

---

## §T. Le témoin — quel cadre, et pourquoi

La capture est un état **HYBRIDE** que la maquette ne contient pas :

| ce que montre la capture | cadre d'origine |
|---|---|
| compteur « 00 RÈGLES DONNÉES », verdict gris « Pas encore jugeable », portrait vert « Il vous écoute », panneau bas « « pas jugeable » n'est pas « moyen » / Rien n'a encore déteint », CTA « DONNER UNE **PREMIÈRE** RÈGLE » | **#120** (vierge) |
| « 02/4 ABSORBÉES », tuiles « col boutonné » et « montre visible » ALLUMÉES, col étroit et montre dorée sur le buste | **#119** (garni) |
| sous-titre « PERSONNE NE VOUS A ENCORE JUGÉ » | **aucun** (0 occurrence dans `ecrans-brennar-6.html`, `generateur-reputation.py`, `chassis6.py`) |

⇒ Témoin principal **#120** pour la forme des blocs, du panneau bas et du CTA ; témoin
secondaire **#119** pour la tuile allumée et les deux indices portés par le buste. C'est cette
hybridation qui produit **F1**.

---

## §0. L'écran, tel que la maquette le dit

**But.** On vient lire ce qu'un lieutenant a *retenu* des règles qu'on lui a données. Ce n'est
pas un tableau de bord : c'est **un portrait**, et le portrait est la mesure. Le titre le dit
(« Le miroir ») et le panneau du bas le répète (« ses quatre voyants sont éteints parce qu'il
n'a rien pris de vous — pas parce qu'il est médiocre »).

**Ordre de lecture.** (1) « Le miroir » — 17 CSS de sérif or, seul texte de cette taille, centré
sous un filet or de 2 CSS ; (2) la rangée de trois compteurs cyan (14 CSS, halo) sur fond creux —
la seule couleur froide vive de l'écran ; (3) le buste, dans la seule boîte à liseré **or** du
panneau ; (4) les quatre tuiles à droite, lues comme une liste ; (5) le paragraphe éditorial ;
(6) le CTA, seul bloc à liseré or en bas.

**Zones.** enseigne (titre + sous-titre) · rangée de 3 compteurs · panneau élastique contenant la
carte portrait (gauche, 118 CSS fixes) et la liste des 4 indices (droite, élastique) · panneau
éditorial · pied avec CTA. Le tout dans un cadre de 462 CSS à filet or (`.cerne`).

**Traits d'identité.** (a) le buste dessiné à plat, cerné de noir, dans son cadre or — c'est
l'écran ; (b) la triade or / cyan / crème sur un fond quasi noir bleuté ; (c) les quatre
« voyants » — quatre tuiles identiques, une pastille chacune, allumée ou non ; (d) une ligne de
balayage cyan très fine qui traverse le panneau dans son tiers haut ; (e) un rythme de blocs
séparés par des respirations égales (9 CSS).

---

## §4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, à une exception près, et elle est textuelle. On retrouve le même but, le même ordre de
lecture (titre → compteurs → buste → liste → paragraphe → CTA), les mêmes cinq traits
d'identité. La couche globale le confirme sans appel : luminance moyenne 31,10 contre 31,94,
densité d'encre 8,19 % contre 8,12 %, et une couverture de palette identique à moins de
0,4 point sur douze jetons. Le rythme vertical des six frontières du cadre tient dans 13 px sur
1626. C'est le plus proche des inventaires que j'aie eu à aligner.

Ce qui casse, c'est **le sens** : le paragraphe du bas dit que les quatre voyants sont éteints,
et deux sont allumés en or à cinquante pixels de là, avec « 02/4 ABSORBÉES » juste au-dessus.
L'écran se contredit lui-même dans le champ de vision d'un seul regard. Il faut le dire sans
l'attribuer : la maquette n'a **aucun** cadre où « 00 règles données » cohabite avec deux
absorptions, donc la donnée elle-même peut être impossible ; l'image ne permet pas de trancher
entre « le serveur a renvoyé un corps incohérent » et « le client a choisi le mauvais panneau ».

Les trois écarts de tête, par impact perçu : **F1** (le paragraphe nie les voyants) ; **F2** (le
buste — le héros de l'écran — est à 11,7 px hors de l'axe sur lequel les légendes de sa propre
carte sont centrées, alors qu'en référence le même écart vaut 0,7 px) ; **F3** (le sous-titre est
rendu 29 % plus haut, seul texte de l'écran à sortir de la tolérance typographique).

Tout le reste est de l'ordre du demi-CSS-pixel : un interligne 12 à 17 % plus serré sur les blocs
multi-lignes, un halo de pastille disparu, une ligne de balayage un tiers trop forte. Aucun ne
change ce qu'un joueur lit.

---

## §3. Écarts

Format imposé par le dossier. Colonne `données` ajoutée en application de la consigne
« classe-le dans une colonne *dépend des données : oui/non* ». Colonne `critère` : **je ne peux
pas la remplir honnêtement** — les rapports r1→r8 me sont délibérément retirés, donc je ne sais
pas quelles grandeurs existaient au tour précédent. Tout est marqué `NOUVEAU` **par défaut, et
ce n'est pas une mesure** (repris en §6).

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | **BLOQUANT** | NOUVEAU | **oui** | le paragraphe du panneau bas nie les voyants que l'écran affiche : « ses quatre voyants sont éteints parce qu'il n'a **rien pris de vous** » alors que 2 tuiles sur 4 sont allumées et que le compteur lit « 02/4 ABSORBÉES » | tuiles 1 et 3 : bord `#b08d3d` (voulu `#b08d3e`), fond `#16161c` (voulu `#16191b`), pastille or_vif 24 px — état `.tl.on` sans ambiguïté (m16). Panneau bas : copie **verbatim** du cadre #120, dont le compteur canonique est `00/4`. Aucun des 6 cadres du groupe ne combine « 00 règles données » et « 02 absorbées » | **l'attribution.** Une image ne dit pas si le corps de réponse est incohérent (0 règle donnée / 2 absorbées est impossible dans la grammaire de la maquette) ou si la sélection d'état côté client est fausse. À trancher par le juge-données |
| `F2` | MINEUR | NOUVEAU | non | le buste est hors de l'axe de sa carte : le dessin est décalé vers la **gauche** par rapport à l'axe sur lequel les légendes de la même carte sont centrées | centre du remplissage du visage **272,5** ; centre du torse+chapeau **273,0** ; centre du col **273,0** — trois masques indépendants. Axe des textes de la carte : **284,0 / 284,5**. Écart **−11,7 px = −3,2 CSS**. En RÉFÉRENCE la même comparaison donne **+0,7 px** (m12/m21) | les marges gauche/droite en px : ma sonde de bbox extérieure a **échoué son propre contrôle** (§6), je ne chiffre donc que l'écart d'axe. Le couple gants/montre donne un axe à 277,25 ⇒ la fourchette honnête est **−7 à −11,7 px** |
| `F3` | MINEUR | NOUVEAU | non | le sous-titre `.enseigne i` est rendu ~29 % plus haut, avec un interlettrage compensatoire plus serré | hauteur de capitale sur une portion **sans accent ni apostrophe** : RÉF « UN LIEUTENANT » **17 px (4,72 CSS)** / JEU « PERSONNE…ENCORE » **22 px (6,11 CSS)** = **+29,4 %**. Avance moyenne par caractère quasi identique : 23,48 / 23,83 px. Contrôle positif sur chaîne **identique** (« RÈGLES DONNÉES ») : 18 / 19 px, +5,6 % (m24) | rien : contrôle négatif re-placé et vert (0 ligne d'encre dans l'aplat entre titre et sous-titre, m25) |
| `F4` | MINEUR | NOUVEAU | non | interligne des blocs multi-lignes systématiquement 12 à 17 % plus serré, à taille de glyphe **identique** | `.pann small` : pas de ligne **33 → 27,5 px** (−17 %), runs d'encre 24 px des deux côtés · `.prt i` : pas **27 → 23 px** (−15 %) · `.tl` : hauteur de tuile **101 → 93 px** (−7,9 %) pour des glyphes à 21 et 19 px identiques, l'écart tenant entièrement dans les 3 respirations internes (−2 / −2 / −4 px) (m04/m18b) | — · **note** : même cause probable pour `F13` |
| `F5` | MINEUR | NOUVEAU | non | le halo de la pastille allumée (`box-shadow:0 0 7px #f2c96b99`) est absent | écart moyen au fond de tuile, par rayon. Témoin #119 : **+39,8** à 4,0 CSS, **+23,0** à 5,0 CSS, **+16,1** à 6,0 CSS, +8,7 à 7,3 CSS. Capture : **+7,9** à 3,9 CSS puis **+0,0** dès 5,0 CSS. Contrôle positif r=0 : **+220,0 des deux côtés** (m17a) | — |
| `F6` | MINEUR | NOUVEAU | non | la ligne de balayage cyan est 1,2 à 1,6 × plus forte, et ses extrémités ne s'éteignent plus. Écart **systématique et de même signe sur toute la longueur**, plus fort là où l'alpha est faible ⇒ erreur de **modèle** (espace de mélange), pas 18 erreurs | profil horizontal, score (G+B−2R), 18 points de x=52 à x=1024. Pic : **85 → 101** (×1,19). Extrémité gauche : **31 → 50** (×1,61). Extrémité droite : **3 → 10** (×3,3). Épaisseur inchangée (8 → 7 px = 2 CSS) (m15/m19b) | l'alpha effectif : je ne mesure que le pixel résultant, comme le mandat l'impose |
| `F7` | MINEUR | NOUVEAU | non | le cadre est épinglé en haut : **303 px de bande morte** entre le bas du cadre et le premier pixel du dock, contre 20 px au-dessus | bas du cadre **1876** ; première encre du dock **2179** ; dernière encre du chrome haut **230** ; haut du cadre **250**. 303 px = **12,6 % de la hauteur de l'écran** (m19a) | si le cadre est **censé** être épinglé en haut. Le dossier assume la différence de hauteur de bandeau ; il ne dit pas où va le mou. Ce n'est pas un défaut de ㊲ mais du gabarit de shell |
| `F8` | MINEUR | NOUVEAU | non | le vide sous la 4ᵉ tuile passe de 21,8 % à 31,2 % de la hauteur du panneau élastique | RÉF : tuiles 1000..1446, `.elast` 848..1613 ⇒ vide **167 px (21,8 %)**. JEU : tuiles 766..1180, `.elast` 642..1424 ⇒ vide **244 px (31,2 %)**. Distance dernière tuile → bas de la carte portrait : **86 → 144 px** (m21) | — · **note** : conséquence de `F4` (4 × −8 px) et de `F10` (le sous-texte du verdict passe de 3 à 2 lignes) |
| `F9` | MINEUR | NOUVEAU | non | proportions du buste : le visage est 9,5 % plus large alors que le dessin entier est 1,6 % plus **court** — la transformation n'est pas une homothétie | ligne la plus large du remplissage peau : **126 → 138 px** (+9,5 %) ; diamètre extérieur trait compris **148 → 157 px** ; trait sombre **11,0 → 9,5 px** par côté. Dessin entier (sommet du chapeau → bas du torse) **377 → 371 px**. Rapport visage/torse **0,468 → 0,498** (+6,4 %). Gants : **48×30 → 55×36 px** et à **−97** au lieu de **−106 px** de l'axe (m10/m12/m21/m26) | pourquoi la montre (+105,5 px) est exacte et les gants (−97) ne le sont pas — je constate l'asymétrie, je n'en nomme pas la cause |
| `F10` | MINEUR | NOUVEAU | non | la colonne de droite est 19 px plus large et 9 px plus à gauche (padding de `.elast` mesuré à 6,4 CSS au lieu de 8) ; le sous-texte du verdict passe de 3 lignes à 2 | tuiles : RÉF x 542..997 (**455 px**) / JEU x 533..1007 (**474 px**). Padding `.elast` : 30 px des deux côtés en RÉF, **23 px** en JEU. `.verdict span` : hauteur d'encre **76 → 49 px** (3 lignes → 2) (m05/m17b) | — · 19 px = 0,7 % de la largeur du panneau, **sous** la tolérance « ≤ 1,5 % du parent » ; c'est le reflux qu'il induit qui est reporté |
| `F11` | MINEUR | NOUVEAU | non | le fond du cadre est un dégradé **monotone** ; la maquette a une taille sombre au milieu et un pied qui remonte (radial cyan) | luminance dans la gouttière gauche, par 10 % de la hauteur du cadre. RÉF : 22·21·20·19·18·**16**·15·15·**17**·18·18. JEU : 22·21·21·21·20·19·19·19·18·17·**17** (m20a) | le halo **or** de la maquette (`radial-gradient` centré à 50 %/22 %) : la zone est couverte par l'enseigne des **deux** côtés, je ne peux pas l'échantillonner |
| `F12` | MINEUR | NOUVEAU | **oui** | le sous-titre affiché n'est **aucune** des six lignes du groupe, et il change de sujet : les six parlent du lieutenant, celui-ci parle du joueur | `grep -c -i "personne ne vous a encore"` sur `ecrans-brennar-6.html`, `generateur-reputation.py`, `chassis6.py` ⇒ **0 / 0 / 0**. Les six lignes canoniques : « ce qu'il a pris de vous se voit sur lui », « un lieutenant neuf n'a encore rien absorbé », « vous vous écartez de vos propres règles », « les règles que vous avez données », « un lieutenant rappelé — on demande des gages », « ce qui manque encore » | si cette ligne vient d'un libellé serveur légitime pour un état que la maquette n'a pas dessiné. La **forme** (taille exceptée, `F3`), la couleur `#8a979c` et la position sont justes |
| `F13` | MINEUR | NOUVEAU | non | le bouton CTA est 7 px plus bas de hauteur, texte identique | filet or extérieur : RÉF 1952..2046 = **95 px** ; JEU 1757..1844 = **88 px** (−7,4 %). Encre du libellé identique : 29 × 611 / 29 × 607 (m01/m09) | — · **note** : même cause probable que `F4` (respirations internes) |

**Compte : 1 BLOQUANT · 0 MAJEUR · 12 MINEUR.** Dont **2** dépendent des données (`F1`, `F12`).

---

## Table à part — écarts **ASSUMÉS** (dossier), vérifiés « rendus proprement »

| assumé | son périmètre (colonne 3 du dossier) | ce que je mesure | dans l'assumé ? |
|---|---|---|---|
| compteur ENFREINTES à « — » | sort si le tiret n'a **ni la couleur ni la position** des deux autres chiffres | couleur du tiret **`#7fd4d9`**, exactement celle des chiffres `00` et `02` ; y 538..541, dans la bande des chiffres voisins (516..553) ; centré dans sa fenêtre `.fen` (m08/m09) | **OUI** |
| col rendu par un triangle plein | sort si remplissage aire/boîte ≈ 0,9, si non centré sur l'axe du cou, ou s'il recouvre le cou | **aire/boîte = 0,51** (un triangle parfait vaut 0,50) ; centre du col **273,0** = centre du torse **273,0** ; le col ne mord pas sur le cou (m10/m12) | **OUI** |
| reflet du miroir figé | sort s'il est absent ou hors du tiers haut du panneau | présent, pic à **29,3 %** de la hauteur du panneau (réf. 31,6 %) (m15) | **OUI** — mais son **intensité** sort → `F6` |
| 4 couleurs hors `DesignTokens` | sort si la couleur **rendue** s'écarte de la maquette | encre : 8 jetons identiques ou ±1/255 ; aplats : ≤ 4/255 ; couverture de palette ≤ 0,4 point sur 12 jetons (m08/m13/m20b) | **OUI** |
| nom du lieutenant = celui du compte | sort si « SALVATORE » en dur, ou si la mention « non projeté » est encore visible | « **LT. MARR, VOTRE LIEUTENANT** » ; la ligne `lieutenant.name — non projeté (L0.4)`, présente en référence (y 1478+), est **ABSENTE** de la capture (aucun run d'encre sous « Il vous écoute ») (m18a) | **OUI** |
| pas de section « gages » | sort s'il reste une **place réservée vide** | aucun conteneur vide détecté ; le vide sous la 4ᵉ tuile est un vide de flux, pas une boîte (aucun bord, aucun filet) → traité en `F8` | **OUI** |

---

## Table à part — **ARBITRAGES**

| id | arbitrage | mesure | pourquoi ce n'est pas un défaut du client |
|---|---|---|---|
| `A1` | contraste du sous-texte des tuiles sous le seuil de doctrine (≥ 4,5:1 pour un petit texte) | `#6b737d` sur le fond de tuile : **RÉF 3,71:1**, **JEU 3,79:1** (m19d) | la maquette ratifiée est **en dessous elle aussi**, et le jeu est très légèrement meilleur : c'est un choix de DA à trancher, pas une régression |
| `A2` | famille du sérif | le dossier donne `fc-match` pour Georgia, serif, Times, Segoe — **pas pour `DejaVu Serif`**, qui est la famille réellement demandée par `.enseigne b`, `.pann b`, `.prt b`, `.verdict b` | je ne peux donc pas dire si la référence a rendu DejaVu Serif ou une substitution. Les hauteurs de capitale, elles, coïncident (titre −2,1 %, `.pann b` −2,6 %, `.prt b` 0 %) |
| `A3` | format monétaire du bandeau : « 406 653,08 € » | canon HUD : « $ 24 850 » ; maquette série 6 : « $ 24 850 » | changement de devise et de format décimal — décision produit, et c'est du **chrome** |
| `A4` | libellé du 3ᵉ onglet : « FILIÈRE » | canon HUD : « MARCHÉ » | renommage produit, chrome |

---

## Table à part — **CHROME** (shell partagé ; jugé contre `ecran-canon.png`, hors du compte de ㊲)

| id | constat | mesure |
|---|---|---|
| `C1` | les 4 ronds du dock sont **vides** | encre (lum ≥ 80) dans le disque intérieur : capture **0 / 5525 px** sur les 4 ronds, luminance max **37**. Contrôle positif sur le canon, aux centres **lus** dans `mesure-canon.txt` (`.rond` 46×46 à (71 ; 615,7), ×3) : **20,2 % · 6,6 % · 12,6 % · 13,5 %**, luminance max 199 — 4/4 (m15) |
| `C2` | l'aile droite du bandeau porte « JOUR 37 » puis un « **—** » | canon : « JOUR 12 · SOIRÉE » puis « 21:40 ». Le moment de la journée et l'heure manquent |
| `C3` | la barre d'argent est pleinement dorée | canon : barre à deux tons (portion or + reste gris). Peut n'être qu'une valeur différente — non tranché |

Le manomètre est dans le bon sens (aiguille vers l'arc chaud, libellé « Brûlant ») et l'onglet
actif est bien « PLUS », cohérent avec le chemin joueur décrit par le dossier.

---

## §5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, 1080×2400. Rien n'est donc vérifié sur le
reflux, le hors-cadre ou la conservation des proportions à une autre résolution — voir §6.
Ce qui est vérifiable sur la seule résolution fournie : rien n'est coupé, rien ne déborde de son
parent, rien ne passe sous le bandeau (dernière encre du chrome à y=230, cadre à y=250) ni sous
le dock (cadre à y=1876, première encre du dock à y=2179).

---

## §6. Ce que je n'ai pas pu vérifier

1. **La colonne `critère` du format imposé.** `DÉJÀ APPLIQUÉ` vs `NOUVEAU` suppose de connaître
   le tour précédent ; les rapports r1→r8 me sont délibérément retirés. J'ai tout marqué
   `NOUVEAU` **par convention, et ce n'est pas une mesure**. *Ce qui trancherait :* que le
   dossier joigne, non pas les rapports, mais la **liste des grandeurs mesurées** au tour
   précédent — elle ne transmet pas de conclusion, donc pas d'angle mort.
2. **La seconde résolution.** Le projet vise deux résolutions ; le tour n'en fournit qu'une.
   *Ce qui trancherait :* une capture 1080×1920 du même état.
3. **L'absence d'animation.** Aucune paire T / T+1 s. Le reflet est figé **sur une image**, ce
   qui ne prouve rien. *Ce qui trancherait :* deux captures du même état à 1 s d'intervalle et un
   compte de pixels différents, chrome exclu.
4. **L'attribution de `F1`.** L'image ne distingue pas « corps de réponse incohérent » de
   « mauvaise sélection d'état ». *Ce qui trancherait :* le corps réel de la route, côté
   juge-données.
5. **Les marges gauche/droite du buste dans sa carte (`F2`).** Ma sonde de bbox extérieure a
   **échoué son propre contrôle positif** : elle rend une asymétrie de **+31 px en RÉFÉRENCE**,
   ce que trois mesures de centre indépendantes réfutent (elles donnent 0,7 px). Elle attrape
   l'ombre interne de la carte près des bords. **Écartée** ; seul l'écart d'axe est chiffré.
6. **Le split `fond` / `carte` de ma couverture de palette (m20b) est un artefact**, pas un
   écart : `#0d1622` tombe à moins de 12/255 des **deux** jetons `#0b1016` et `#111823`, et mon
   compteur attribue au premier trouvé. La somme des deux est identique des deux côtés
   (**86,5 %**), et c'est elle qui vaut mesure.
7. **Le halo or radial du fond du cadre** (`radial-gradient` à 50 %/22 %) : l'enseigne le couvre
   des deux côtés, il n'existe aucune colonne libre à cette hauteur. `F11` ne porte donc que sur
   le dégradé linéaire, mesuré dans la gouttière gauche.
8. **L'état du compte de démo au moment de la capture** n'est pas re-mesurable (le dossier le
   dit) : `F1` et `F12` sont des observations **datées du 2026-09-04**.
9. **Le rect imprimé par le test** n'est pas fourni (log non préservé). J'ai vérifié la géométrie
   sur l'image elle-même : largeur 1080, cadre de 1626 px de filet à filet **des deux côtés**,
   ce qui confirme le facteur ×3,6 annoncé par le dossier.
10. **Les valeurs mesurées par les gardes du test** (compte de teintes distinctes, rect minimal,
    voisins éteints) : indisponibles.
11. **Le chrome** est jugé contre un canon que le dossier **désigne sans le joindre**
    (`Tools/juge-visuel/ecran-principal/ecran-canon.png`). Je le déclare ; si ce canon a bougé
    depuis, `C1`–`C3` sont à re-mesurer.
12. Deux de mes contrôles négatifs ont d'abord tiré à faux parce que je les avais posés dans une
    zone qui n'était pas un aplat (m22, m24) et un troisième parce que le masque `#b9ad92` sert
    aussi de couleur de texte (m10). Les trois ont été re-posés (m25) ; les mesures qu'ils
    gardaient sont inchangées.

---

## Annexes

### Annexe 1 — Inventaire de la RÉFÉRENCE (cadre #120, 1080×2102, ×3,6)

Repère : filet `.cerne` haut à **y=452**, gauche à **x=21**, droit à **x=1058**, bas à **y=2078**.
Toutes les valeurs y ci-dessous sont absolues ; le §3 cite l'offset.

| id | catégorie | parent | bbox (px) | forme | remplissage | bord | effet | texte | relations |
|---|---|---|---|---|---|---|---|---|---|
| `P0.cadre` | cadre | écran | 21,452 → 1058,2078 | rect r≈11 | dégradé vertical L22→L15→L18 | 3 px `#b08d3e` | halo or interne | — | 462 CSS de haut |
| `P1.enseigne` | enseigne | P0 | 50,481 → 1029,669 | rect | `#0c121c` | 1 px `#2a3648`, bas **7 px** `#b08d3e` | — | — | h 188 px |
| `P1.titre` | titre | P1 | 328,514 → 742,560 | — | — | — | — | « Le miroir », capitale 47 px, sérif gras, interlettrage large, `#f2c96b`, centré | — |
| `P1.sous` | texte | P1 | 149,589 → 923,628 | — | — | — | — | 2 lignes capitales, hauteur **17 px**, `#b9ad92`, centré | pas de ligne 27 px |
| `P2.fen1..3` | fenêtre | P0 | y 702..815 ; x 50..361 / 384..695 / 718..1029 | rect | `#0a0e16` | 1 px `#2a3648` | halo cyan interne | valeur 41 px `#7fd4d9` + libellé 18 px `#8a979c` | 3 boîtes égales, écart 22 px |
| `P3.elast` | panneau | P0 | 50,848 → 1029,1613 | rect | `#0b0d0d` | 1 px `#2a3648` | ombre interne | — | h 765 px |
| `P3.prt` | carte | P3 | 82,877 → 505,1532 | rect | `#111823` | 1 px `#b08d3e` | — | — | l **424 px** (118 CSS) |
| `P3.buste` | dessin | P3.prt | 156,1030 → 436,1406 | silhouette | torse `#16191b`, peau `#b9ad92`, col `#eae0c8` | trait `#0b1016`, 11 px | — | — | **centré** (axe 293,5 = axe carte) ; visage 126 px ; col large 61 px |
| `P3.prt.i` | texte | P3.prt | 180,913 → 405,954 | — | — | — | — | « LT. HARA, VOTRE LIEUTENANT », 2 lignes, 17 et 15 px, `#8a979c` | centré |
| `P3.prt.b` | texte | P3.prt | 174,1433 → 412,1458 | — | — | — | — | « Il vous écoute », 26 px, sérif, `#7db36a` | centré |
| `P3.prt.ref` | texte | P3.prt | ~126,1478 → ~460,1500 | — | — | — | — | « lieutenant.name — non projeté (L0.4) », `#6b737d` | **présent en référence** |
| `P3.verdict` | verdict | P3 | 544,891 → 970,974 | — | — | — | — | « Pas encore jugeable » 2 lignes `#8a979c` + « ce qu'il a absorbé de vos règles » **3 lignes** | — |
| `P3.tl1..4` | tuile | P3 | y 1000..1100 / 1115..1215 / 1231..1330 / 1346..1446 ; x 542..997 | rect | `#111823` | 1 px `#2a3648` | — | titre 21 px `#b9ad92` + sous-titre 19 px `#6b737d` | h **101 px**, entraxe 115 px, l 455 px ; **4 éteintes** |
| `P3.scan` | ligne | P3 | y≈1090, pleine largeur | trait | dégradé cyan transparent→`#7fd4d9`→transparent | — | — | — | épaisseur 8 px ; pic 85, extrémités 31 et 3 |
| `P4.pann` | panneau | P0 | 50,1647 → 1029,1919 | rect | `#101721` | 1 px `#2a3648` | ombre interne | surtitre 19 px + titre 39 px `#eae0c8` + corps **3 lignes**, pas 33 px | — |
| `P5.cta` | CTA | P0 | 50,1952 → 1029,2046 | rect | `#16191b` | 1 px `#b08d3e` | — | « DONNER UNE PREMIÈRE RÈGLE », 29 px, `#f2c96b`, centré | h **95 px** |

**Couche globale RÉF** — luminance moyenne **31,94** ; densité d'encre (lum ≥ 60) **8,12 %** ;
couverture par jeton : `fond`+`carte` 86,5 %, `lisere` 2,78 %, `rang` 1,75 %, `or_filet` 1,36 %,
`creme2` 1,61 %, `carte2` 0,84 %, `or_vif` 0,66 %, `muet` 0,60 %, `creme` 0,46 %, `cyan` 0,22 %,
`eteint` 0,11 %. Rythme vertical : respirations de 29·33·35·34·33 px entre blocs.

### Annexe 2 — Inventaire de la CAPTURE (1080×2400, ×3,6 pour le contenu)

Repère : filet `.cerne` haut à **y=250**, gauche à **x=18**, droit à **x=1061**, bas à **y=1876**.

| id | bbox (px) | ce qui diffère de l'homologue |
|---|---|---|
| `P0.cadre` | 18,250 → 1061,1876 | **1626 px de haut, identique** ; dégradé monotone (`F11`) |
| `P1.enseigne` | 46,278 → 1033,461 | h 183 px (−5) ; fond `#0d1622` |
| `P1.titre` | 331,316 → 751,361 | capitale 46 px (−1), chasse +1,4 % |
| `P1.sous` | 195,397 → 885,418 | **1 ligne**, capitale **22 px (+29 %)** (`F3`), texte inconnu du corpus (`F12`) |
| `P2.fen1..3` | y 494..609 ; x 46..360 / 383..696 / 719..1033 | 3 boîtes égales, écart 22 px ✓ ; 3ᵉ valeur = « — » cyan (assumé) |
| `P3.elast` | 46,642 → 1033,1424 | h 782 px (+17) ; padding intérieur 23 px au lieu de 30 (`F10`) |
| `P3.prt` | 72,667 → 496,1324 | l **425 px** ✓, h 657 px ✓ |
| `P3.buste` | ~130,829 → ~416,1199 | **axe 272,5–273,0 contre 284 pour la carte** (`F2`) ; visage 138 px (`F9`) ; **col étroit 37 px** (boutonné) ; **montre or présente à +105,5 px** ; gants 55×36 à −97 ; **pas de manchettes** |
| `P3.prt.i` | 170,700 → 398,738 | « LT. MARR… » ; hauteurs 15 / 16 px ✓ ; pas de ligne 23 px (`F4`) |
| `P3.prt.b` | 161,1225 → 407,1250 | « Il vous écoute » 26 px ✓ `#7db36a` ✓ |
| `P3.prt.ref` | — | **ABSENTE** ✓ (assumé satisfait) |
| `P3.verdict` | 533,675 → 1001,749 | sous-texte sur **2 lignes** au lieu de 3 (`F10`) |
| `P3.tl1..4` | y 766..858 / 873..965 / 981..1073 / 1088..1180 ; x 533..1007 | h **93 px** (`F4`), entraxe 107 px, l 474 px (`F10`) ; **tuiles 1 et 3 ALLUMÉES** (bord `#b08d3d`, fond `#16161c`, pastille or 24 px, sans halo — `F5`) |
| `P3.scan` | y≈871 | épaisseur 7 px ✓ ; pic 101, extrémités 50 et 10 (`F6`) |
| `P4.pann` | 46,1458 → 1033,1723 | corps 3 lignes, pas **27,5 px** (`F4`) |
| `P5.cta` | 46,1757 → 1033,1844 | h **88 px** (`F13`) ; texte identique |
| — | 1876 → 2179 | **303 px de bande morte** avant le dock (`F7`) |

**Couche globale JEU** — luminance moyenne **31,10** ; densité d'encre **8,19 %** ;
couverture par jeton identique à ±0,4 point (voir §6.6 pour l'artefact `fond`/`carte`).
Ordre de lecture observé sur la capture seule : titre → compteurs → **buste** → tuiles (les deux
allumées attirent en premier) → paragraphe → CTA — **identique à la référence**.

### Annexe 3 — Correspondance des repères

| | RÉFÉRENCE | CAPTURE |
|---|---|---|
| facteur (contenu) | ×3,6 (300 CSS = 1080 px) | ×3,6 (300 CSS = 1080 px) |
| rapport capture ÷ référence | — | **1,00** |
| origine y (filet `.cerne` haut) | **452** | **250** |
| origine x (filet `.cerne` gauche / droit) | 21 / 1058 | 18 / 1061 |
| hauteur du cadre, filet à filet | **1626 px** | **1626 px** |
| ⇒ transformation | `y_jeu = y_ref − 202` ; `x_jeu = x_ref − 3` | |

Vérification indépendante de l'échelle : la carte `.prt`, dont la CSS fixe la largeur à 118 CSS,
mesure **424 px** en référence et **425 px** en capture (118 × 3,6 = 424,8). Le chrome n'est
**pas** à cette échelle (×2,755) et n'a été comparé qu'au canon HUD.

### Annexe 4 — Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre.

| script | grandeur | contrôle |
|---|---|---|
| `m01_reperes.py` | filets or horizontaux des deux images | largeur d'image imprimée |
| `m02_prt.py` | bords verticaux or (cerne, carte portrait) | largeur `.prt` = 118 CSS des deux côtés |
| `m03_blocs.py` | frontières verticales de tous les blocs | 2 sondes indépendantes (or / liseré) |
| `m04_tuiles.py`, `m05_lect_pleine.py` | tuiles : hauteur, entraxe, largeur ; bbox `.elast` | gap `.lect` = 4 CSS des deux côtés |
| `m06`→`m09` | typographie par élément (bbox d'encre + couleur du cœur du glyphe) | contrôle négatif : fenêtre vide ⇒ `None` |
| `m10`→`m12`, `m21`, `m22` | buste : masques peau / torse / col, centres, diamètres | 3 masques indépendants ; contrôle négatif re-posé en `m25` |
| `m13_aplats.py` | aplats des 9 surfaces nommées par la CSS | 2 points tombés sur de l'encre — signalés et repris |
| `m14`, `m15` | ronds du dock ; ligne de balayage | **contrôle positif sur le canon HUD : 4/4 ronds encrés** |
| `m16`, `m17` | tuile allumée ; halo de la pastille ; textes restants | halo : r=0 ⇒ +220,0 des deux côtés |
| `m18`, `m19`, `m20` | interligne, contrastes, `.fen`, couche globale, gouttière, palette | palette : somme `fond`+`carte` identique |
| `m23`, `m24` | sous-titre : hauteur de capitale hors accent/apostrophe | contrôle positif sur chaîne identique (18/19 px) |
| `m25`, `m26` | montre, manchettes, gants ; contrôles négatifs re-posés | montre à +105,5 px contre +106 px imposés par le SVG |

Sorties collées : voir le corps du rapport, chaque mesure cite son script.
