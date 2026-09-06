# Juge visuel ⊥ — ③ La Carte de Brennar — r2 — 2026-09-06

## Verdict : NON APPROUVÉ

La carte elle-même est livrée avec une fidélité que je n'ai pas su prendre en défaut — peinture au
bit près, cadrage à 1 %, 18 noms sur 18 au bon endroit, au bon angle (17 à **≤ 0,53°** de leur source,
le 18ᵉ à 1,37°) et à la bonne taille — mais **le lettrage n'est plus celui de la maquette** : une linéale au lieu d'une
romaine à empattements, l'interlettrage de 0,24 em perdu, et un halo qui **éclaircit** la peinture là
où la maquette la **creuse**. Ces trois écarts se voient au premier regard et changent un trait
d'identité de l'écran.

---

## Déclarations préalables (lire avant les chiffres)

**Convention d'angle.** 0° = horizontale de l'image ; **positif = HORAIRE à l'écran** (y croît vers
le bas ⇒ un mot dont la fin est plus BASSE que le début a un angle positif). C'est la convention du
dossier (`rotate(θ cx cy)` SVG). L'angle d'un mot est la régression de sa **ligne de base** (bas
d'encre) sur les seules colonnes dont la hauteur d'encre ≥ 11 px — ce qui écarte accents, traits
d'union, points, et les libellés d'écusson (capitale ≈ 9 px). Le **résidu** de cette régression est
imprimé partout : c'est lui qui dit si la mesure a porté sur un seul objet.

**Convention de bord.** Épaisseur = **mi-alpha nominal** : distance entre les deux traversées du
niveau `(cœur + fond local)/2` le long d'un profil perpendiculaire. Le fond local est la médiane des
12 lignes les plus éloignées du pic dans la fenêtre, jamais un gris choisi.

**Recalage** (`mesures/m06_recalage2d.py`) : `cap = 1,0220 × ref + (−12,0 ; +8,0)`, **isotrope**
(coût 16,0 au minimum ; toute anisotropie le dégrade — 20,0 à sx/sy = 0,995, 20,2 à 1,005 ; ±3 px
donnent 24 à 28). Le recalage par profils de colonnes du `m05` a été **abandonné** : il ne
discriminait pas en X (5,29 au minimum contre 5,60 à ±20 px). Toute mesure du §3 cite ce recalage.

**Chrome — non jugé, et pourquoi.** Le bandeau porte un **tiret « — »** à la place de la phase
(`z_chrome_phase.png`, aile droite, y 50..110). ARGENT (`9 627 820,00 €`) et JOUR (`50`) sont
alimentés, la phase ne l'est pas. La doctrine du dossier commande alors de le dire en tête et de
**ne pas juger le chrome** : c'est fait, aucune ligne de la table ne porte sur le bandeau ni sur le
dock. Le médaillon **ne dit plus « Unknown »** (il rend « Brûlant / CHALEUR ») — la fermeture
`31d8e43` tient sur ce point.

**Défaut du dossier, à corriger au prochain tour.** `capture-carte-seule-1080x2400.png` est déclarée
« HORS chrome (la carte seule) ». **Elle ne l'est pas** : elle porte le même bandeau et le même dock.
Les deux fichiers diffèrent de **5 105 px** (0,197 %) répartis en 5 zones, **toutes dans le chrome**
(compteur de jour 50/51 · sous-pixels de l'ARGENT · aiguille du manomètre · libellés du dock).
Je n'ai donc **pas pu** lire la peinture sous le bandeau/dock comme le dossier m'y invitait
(`m01`, `m02`).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence | jeu | écart | script |
|---|---|---|---|---|---|
| C1 | résidu de la peinture, 2 170 cellules de 30×30 | — | — | **médiane 2,0/255** par canal max ; p90 44 (dominé par le disque or, ASSUMÉ) | `m07` |
| C2 | isotropie du cadrage — un seul facteur pour les deux axes | — | s = **1,0220** | anisotropie ±0,5 % : coût 16,0 → 20,0/20,2 ⇒ **aucun étirement** | `m06` |
| C3 | cadrage horizontal | ref x 0..1079 | ref x **11,7..1067,5** | 11,7 px perdus à gauche, 11,5 à droite = **97,76 %** visible | `m06`,`m20` |
| C4 | cadrage vertical | contenu ref 219..2084 | ref **219,2..2081,2** | **99,84 %** visible | `m06`,`m20` |
| C5 | fleuve, médiane 41×41 en ref (760,1100) | (24, 65, 83) | (24, 65, 82) | **1/255** | `m20` |
| C6 | 3 quartiers SANS lavis (LE TREILLIS, SARNES, DÉPÔT-EST) | — | — | Δ **(1,0,−1) · (−2,0,−1) · (0,1,0)** | `m24` |
| C7 | route or, point homologue ref x=200 | pic (136,119,81), 19 px à mi-alpha | pic (136,119,82), **19 px** | 1/255 sur la couleur, 0 px sur la largeur | `m20`,`m21` |
| C8 | rose des vents, bras nord sur l'axe | ref y 534..619 | attendu 553,8..640,6 → mesuré **555..639** | ≤ 1,6 px ; **le bras n'est plus recouvert** (F5 du r1) | `m20` |
| C9 | les 18 noms de quartier | 18 | **18** | français, accents justes (DÉPÔT-EST, LES ENTREPÔTS, LA LISIÈRE, MARNE-BASSE), **0 slug, 0 troncature, 0 mot anglais** | `m10`,`z_txt_*` |
| C10 | angle des 18 noms vs la SOURCE d'auteur | −10/−7/0/+3/+7/+18 | — | **médiane +0,07°, max \|1,37°\|** ; amplitude **28,21°** contre 28° | `m27` |
| C11 | angle jeu − maquette (17 comparables) | — | — | **médiane −0,02°, max \|0,73°\|** | `m27` |
| C12 | hauteur de capitale, 14 mots propres | méd. 17 px | méd. 17 px | **rapport 1,000** (F3 du r1 refermé) | `m27` |
| C13 | contraste encre/peinture, 6 mots | 5,49 à 9,65:1 | **6,98 à 7,78:1** | tous ≥ **5,34:1**, plancher de doctrine 4,5:1 (F2 refermé) | `m17` |
| C14 | gouttière | — | contenu **232..2151** | bandeau uni jusqu'à 231, dock à partir de 2152 : rien dessous | `m20` |
| C15 | rognage des noms | — | marge min. **56 px** à gauche, **85 px** à droite | aucun nom coupé, aucun hors cadre | `m20` |
| C16 | couche globale, zones d'ÉTAT masquées | L moy **35,41**, p90 60,2, densité L>110 1,83 % | L moy **35,29**, p90 57,1, **2,05 %** | Δ **0,12 L** ⇒ tout l'écart global vient des formes ASSUMÉ | `m23` |
| C17 | bande de légende du r1 (F6) | absente en maquette | **0 px** de chacune des 3 pastilles (242,189,49)/(61,178,86)/(209,66,66) | retirée | `m24` |
| C18 | animation dans le contenu | — | **1 px** de différence sur 232..2135 entre les deux planches du run | l'horloge du monde a avancé (JOUR 50 → 51) entre les deux : la carte n'a pas bougé | `m01`,`m02` |
| C19 | « LE THRENNY », peint DANS la texture — contrôle de tous mes instruments | h 18,8 px, trait 2,84 px, profil radial base 61,2 | h 18,9 px, trait 2,76 px, base 60,8 | **+0,5 % / −2,8 %** ; delta de luminance médian **−0,22 L** (p05 −2,66, p95 +1,28) | `m16`,`m19b`,`m25` |

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir la ville d'un coup d'œil et décider où aller : *où ça chauffe*, *qui est en chasse*,
*où je suis*. C'est une carte de décision, pas une illustration.

**Ordre de lecture de la maquette.** (1) le **manomètre** du bandeau — le seul objet circulaire,
cerclé d'or, au centre haut ; (2) les **six écussons** rouges/or/cyan numérotés, qui brillent
(`drop-shadow` #e0664a) sur un fond nocturne — ce sont les seuls points saturés de l'écran ; (3) le
**disque or « VOUS ÊTES ICI »** en bas à droite, la seule grande masse claire ; (4) les **deux
lavis khaki** (LES BASSINS, HAUTES-MARCHES) qui disent la chaleur par l'aire ; (5) enfin les **18
noms de quartier**, gravés à même la peinture, volontairement discrets ; (6) le **pied de page**
italique qui donne le geste (« pincez pour approcher »).

**Zones.** bandeau (argent / chaleur / jour-phase) · la carte plein cadre (deux rives, le Threnny,
le port au nord) · le pied de page.

**Traits d'identité.** ① une peinture nocturne bleu-nuit très sombre (luminance médiane 33,7) percée
de points d'or et de cyan ; ② un **lettrage de carte ancienne** : romaine à empattements, largement
interlettrée, **creusée** dans la peinture par un liseré sombre de 4 px (−10 à −20 L) — jamais posée dessus ; ③ chaque nom
**suit la trame de son quartier** (six profils : −10, −7, 0, +3, +7, +18) ; ④ des accents de couleur
rares et saturés (écussons, or) sur un fond désaturé ; ⑤ la ville tient le cadre entier, sans marge.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour la ville, non pour le lettrage. La **peinture est la même au bit près** (résidu médian
2/255 sur 2 170 cellules) et elle est cadrée presque à l'identique (97,8 % en X, 99,8 % en Y) : les
rues, le fleuve, le port, la rose des vents, la route or tombent tous justes. Les **18 noms sont là,
en français, accentués, chacun sur son quartier, chacun incliné selon sa trame** — la promesse F4 est
tenue à 0,5° près sur les six profils, et la hauteur de capitale est rigoureusement celle de la
maquette (rapport 1,000). Rien n'est coupé, rien ne passe sous le bandeau ni sous le dock.

Ce qui a changé, c'est **la matière du lettrage**. La maquette écrit en romaine à empattements,
aérée (interlettrage 8,0 px), et **creuse** un sillon sombre autour de chaque lettre (−10 à −20 L sur
4 px) : le nom a l'air gravé dans la peinture. Le jeu écrit en linéale, serrée (interlettrage 4,0 px,
−21 % de largeur totale), au trait 41 % plus gras, et **pose un halo clair** autour du mot (+14 à
+30 L au premier pixel contre sa propre peinture, +24 à +36 L face à la maquette) : le nom a l'air posé sur un voile lumineux. Le sens du traitement est
**inversé**, et c'est le trait d'identité ② de l'écran qui saute.

Les trois écarts de tête, par impact perçu : **(1)** la famille de caractères, romaine → linéale ;
**(2)** l'interlettrage de 0,24 em (5,70 px attendus) qui n'est pas appliqué ; **(3)** le halo clair
là où la maquette a un liseré sombre. Ils ont une seule conséquence : les noms lisent comme des
libellés d'interface, plus comme la toponymie d'une carte.

Le reste de l'écart global est **entièrement** imputable aux formes d'ÉTAT non livrées (déclarées
ASSUMÉ) : masquées, les deux couches globales se rejoignent à **0,12 L** de luminance moyenne. La
conséquence est réelle mais elle n'est pas au débit de ce tour : privé des écussons, du disque or et
des lavis, l'écran perd ses trois premiers rangs d'ordre de lecture, et l'œil tombe d'emblée sur les
noms. **Il n'y a aujourd'hui rien sur la carte qui dise où ça chauffe** — alors qu'une pastille en
bas à gauche annonce « Chaleur : affichée ».

---

## 3. Écarts — table unique

Gravité : **BLOQUANT** / **MAJEUR** / **MINEUR** (liste fermée). ASSUMÉ et ARBITRAGE sont dans des
tables à part et ne sont **pas** comptés ici.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `M1` | MAJEUR | NOUVEAU | non | **Famille de caractères des noms : romaine à empattements → linéale.** La maquette demande `font-family:Georgia,serif` (`.carte .nomq`), rendue en **Noto Serif** (`fc-match`, dossier) ; le jeu rend une **linéale**. Le client embarque **DejaVu Serif** (`hudSerifFont`) : la clause d'ARBITRAGE du dossier couvre la paire *Noto Serif ↔ DejaVu Serif*, pas un passage **serif → sans**. | Épaisseur de trait (segment horizontal moyen d'encre, bande 35–62 % de la capitale, à capitale égale) : **REF 2,26 px → JEU 3,19 px, ×1,41**. **Contrôle positif** « LE THRENNY » (mêmes glyphes des deux côtés) : 2,84 / 2,76 px, **bruit 2,8 %** ⇒ l'instrument discrimine (signal +41 %). La médiane du jeu inclut une ligne contaminée (LA COLONNE, hauteur d'encre 49 px : la fenêtre a ramassé autre chose) qui la tire vers le BAS ⇒ le +41 % est un plancher. Preuve visuelle `z_halo_LETREILLIS_{ref,cap}.png`, `z_nom_SAINTBRAND.png`. (`m19`, `m19b`) | Je n'ai pas de mesure qui **nomme** la police du jeu depuis une image (l'empattement lui-même : mes deux tentatives, `m18` §A et `m19` bas/mil, ont un bruit de contrôle du même ordre que le signal — je les déclare non concluantes et ne m'en sers pas). Trancherait : lire `DesignTokens.primaryFont`/`hudSerifFont` et l'asset réellement assigné au libellé. |
| `M2` | MAJEUR | NOUVEAU | non | **L'interlettrage de la maquette (0,24 em) n'est pas appliqué.** Les noms du jeu sont 21 % plus étroits à hauteur de capitale égale. | Écart inter-lettres médian : **REF 8,0 px → JEU 4,0 px**. Largeur d'encre jeu/maquette sur les 11 mots où les deux côtés sont complets : **médiane 0,788** (0,762 à 0,859). Avance par caractère : **REF 22,0 px → JEU 17,2 px, Δ 4,62 px** ; l'interlettrage déclaré vaut à lui seul `0,24 × 6,6 × 3,6 =` **5,70 px** ⇒ la perte de chasse s'explique **entièrement** par le tracking manquant, la chasse propre des glyphes ne différant que de ~1 px. (`m18` §C, `m27`) | Trois mots (HAUTES-MARCHES, PLACE DES COMPTES, LE TREILLIS) donnent un rapport > 1 : leur détection côté maquette est **partielle** (écusson ou voile par-dessus) ; je les écarte du calcul et le dis. |
| `M3` | MAJEUR | NOUVEAU | non | **Le traitement autour du nom a le signe INVERSÉ.** La maquette **assombrit** la peinture autour de chaque lettre (`paint-order:stroke`, `stroke:#080d14`, `width:2.4`) : le nom est *creusé*. Le jeu **éclaircit** : le nom est posé sur un halo. | Profil radial de luminance autour de l'encre. **Deux grandeurs distinctes, je ne les mélange pas.** **(A) chaque image contre SA propre peinture lointaine** (`m16`) : maquette **−10 à −20 L** de d = 1 à d = 4, retour à la ligne de base à d ≈ 5-6 ; jeu **+13,6 à +29,6 L à d = 1** (médiane **+17,7**), retour à d ≈ 8. **(B) jeu − maquette aux mêmes points de la peinture** (`m25`, ce qu'un œil voit, les deux effets cumulés) : **+23,7 à +36,1 L à d = 1** (médiane **+26**), mi-pic à d = 2-3, éteint à d ≥ 8 ; peinture éclaircie de plus de 5 L : **33 494 px** sur 8 noms. **Contrôle positif** « LE THRENNY » sur (B) : delta médian **−0,22 L** (p05 −2,66, p95 +1,28). **Contrôle négatif** (encre synthétique dans le fleuve, peinture plate) : amplitude **1,04 / 1,43 L** ⇒ la machinerie de distance n'invente pas de cloche. (`m16`, `m17`, `m25`) | Je ne peux pas dire depuis une image si le halo est radial, rectangulaire ou par glyphe — seulement qu'il est isotrope à ±1 px sur les huit mots mesurés. Le dossier annonce « α < 0,15, +20 L sur fond L ≈ 30 » : sur la grandeur (A), qui est celle qu'il décrit, je mesure **médiane +17,7 L** — la cible est **tenue** ; le seul dépassement est MARNE-BASSE à **+29,6 L**, sur le parc vert. Ce n'est donc pas l'intensité du halo que je remonte, c'est son **signe**. |
| `m1` | MINEUR | NOUVEAU | non | **L'encre du nom est 23 L plus sombre qu'en maquette** (et plus chaude). La cible déclarée F9 — r−b dans la bande 29–40 — est **atteinte** ; c'est la clarté qui a bougé. | Encre médiane des 18 mots : **REF (204, 196, 174), r−b 29** (étendue 25..39) → **JEU (185, 173, 146), r−b 39** (étendue 39..39, valeur **identique sur les 18**). Luminance **196,1 → 173,6, Δ −22,5 L (−11,5 %)**. Le contraste reste au-dessus du plancher (C13). (`m13`, `m27`) | La maquette pose l'encre à `opacity:.9`, donc sa valeur mesurée varie avec la peinture dessous ; celle du jeu est constante (opaque). Je compare des médianes, pas des jetons nominaux. |
| `m2` | MINEUR | **DÉJÀ APPLIQUÉ** | non | **Les noms sont posés systématiquement plus bas qu'en maquette.** L'explication avancée au r1 (« on comparait un mot incliné à un mot horizontal ») est **réfutée** : les deux côtés sont maintenant inclinés et l'écart n'a pas bougé. | Centroïde d'encre ramené dans le repère de la maquette, 13 mots : **dy médian +7,5 px** (étendue +5,4 à +10,8), **13/13 du même signe** ; dx médian −2,7 px (−10,6 à +7,8), signe partagé. Le r1 mesurait +8,4. 7,5 px = 44 % d'une hauteur de capitale. **Hors** de la tolérance de 2 px du mandat, **dans** celle de 1,5 % du parent (16 px) — c'est sa constance, pas son amplitude, qui en fait un écart. (`m18` §B) | Un biais résiduel du recalage ne peut pas l'expliquer : le même recalage donne dx centré près de 0 et discrimine à ±3 px (C2). |
| `m3` | MINEUR | DÉJÀ APPLIQUÉ | oui | **La pastille « Chaleur : affichée » est peinte hors de la palette de l'écran** : encre **blanc pur** sur une plaque grise neutre, angles vifs, sans bord. C'est le seul blanc pur de tout l'écran. Sa **présence** relève de l'ARBITRAGE user (table à part) ; sa **forme** n'est couverte par aucune ligne du dossier. | **124 px exactement (255,255,255)** dans la zone de contenu, tous dans x 43..160 / y 2116..2125 ; **0 px** dans la maquette. Plaque **x 13..190, y 2106..2135 = 178 × 30 px**, fond **(56, 61, 75)** (L = 60,9), **angles vifs** (rangée pleine dès y = 2106, 0 trou sur 178 px), **aucun liseré** (x = 12 rend (3,4,5)), **bas affleurant** le bas du contenu (2135). Amas le plus clair de tout le balayage « en trop » : **+48,4 L** (le suivant est un halo de nom, +26,6). (`m22`, `m26`, `m28`) | Je ne peux pas dire depuis une image si c'est un bouton, un état ou un témoin de mise au point. Son périmètre d'ARBITRAGE tient, mais de justesse : elle **ne recouvre ni un nom ni un repère peint** (aucun nom ne croise sa boîte ; le repère peint le plus proche au-dessus s'arrête à **y = 2105** et la plaque commence à **y = 2106** — **1 px de dégagement**). |
| `m4` | MINEUR | NOUVEAU | oui | **Le petit drapeau rouge de LES BASSINS (`g.pin-esc` de la maquette) est absent.** Même famille que les formes d'ÉTAT déclarées ASSUMÉ, mais **il n'est pas nommé dans le dossier** : je ne l'absorbe pas en silence. | Pixels de la teinte `#e0664a` dans la fenêtre ref (238,340)-(292,404) : **784 → 0**. Contrôles positifs du même filtre : route or 237/230 px, fleuve 1011/939 px ⇒ le filtre attrape bien sa teinte des deux côtés. (`m23`) | Si le lot des formes d'état le couvre, il se refermera avec lui ; le dossier ne le dit pas. |

**Note commune à `M1`, `M2`, `M3`** : trois mécanismes distincts (asset de police · propriété
d'interlettrage · effet autour du glyphe), une seule conséquence perçue — le lettrage ne lit plus
comme la toponymie d'une carte. Ils se corrigent séparément et je ne les fusionne pas.

**Aucun BLOQUANT.** Je l'ai cherché : aucun nom absent, coupé, hors cadre ou illisible (contraste
minimal 5,34:1) ; rien sous le bandeau ni sous le dock ; aucun quartier coupé par le cadre ; aucune
hiérarchie inversée **dans le périmètre livré**.

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce qui est assumé | ce que je mesure | rendu proprement ? |
|---|---|---|
| formes d'ÉTAT : **6 écussons de conviction** | px de leur teinte, fenêtres homologues : **1 242 → 0 · 1 599 → 0 · 1 134 → 0 · 724 → 45 · 757 → 0 · 728 → 0** (`m23`) | **Oui** — la peinture nue à leur place, aucun fragment, aucune pastille, aucun aplat saturé (le balayage « en trop » du `m26` ne trouve aucun amas là) |
| formes d'ÉTAT : **lavis de chaleur sur l'aire d'un quartier** | couleur médiane de l'aire : LES BASSINS **(61,57,42) → (16,28,37)** ; HAUTES-MARCHES **(86,77,62) → (30,37,57)**. Témoins sans lavis : ≤ 2/255 (C6) (`m24`) | **Oui** — la peinture nue |
| **« VOUS ÊTES ICI » / le quartier en or « chez vous »** | épingle+halo **5 409 → 181 px** ; disque or **19 490 → 584 px** ; en maquette LA LISIÈRE est le quartier « mien » (`.q.mien .nomq`, encre or, corps 7,4 au lieu de 6,6) — en jeu c'est un nom ordinaire (`m23`) | **Oui** — la peinture nue. ⚠️ la maquette pose « chez vous » sur **LA LISIÈRE** alors que le contrôle du dossier place les 4 bâtiments du kit au district 1, **LES BASSINS** : le client n'en dessine aucun, donc ce n'est pas son écart, mais l'incohérence est dans la maquette |
| **pied de page** « Brennar, la nuit — … pincez pour approcher » (aide sans clé i18n) | encre claire aux deux lignes de la maquette : **4 149 px → 145** et **2 201 px → 240**. Le **voile** qui l'accompagne (`.carte-pied`, dégradé vers `#0a0f18ee`) disparaît avec elle : les noms du bas remontent de L 136 (plafonnés par le voile en maquette) à L 185 en jeu (`m24`, `m14b`) | **Oui** — absence propre, aucun fragment. Structurellement forcée : le dock occupe cette bande |
| **« LE THRENNY », « LE PORT »** (0 occurrence au bundle) | tous deux **présents** — ils sont peints dans la texture, pas projetés | **Oui** |
| **le mot de la chaleur / les écussons sans mot** | aucun mot d'état sur la carte ; aucune clé brute, aucun mot anglais dans la zone de contenu | **Oui** |
| **la bande de chaleur peut être d'un autre état** | aucune différence de teinte entre la capture et une maquette *sans* lavis (3 quartiers témoins à ≤ 2/255) ⇒ **rien sur la carte n'encode la chaleur** | voir §6 : je ne peux pas trancher depuis une image entre « lot d'états non livré » et « toutes les données valent Libre » |

---

## Écarts d'ARBITRAGE

| point | mesure | pourquoi arbitrage |
|---|---|---|
| **pastille « Chaleur » en bas à gauche** que la maquette n'a pas | plaque **x 13..190, y 2106..2135** ; ne recouvre **ni un nom ni un repère peint** — dégagement **1 px** sous le repère le plus proche (`m28`) | ARBITRAGE user ouvert, déclaré au dossier. Son **périmètre tient**. Sa **forme** part en `m3` |
| **chasse des glyphes** à capitale égale | après retrait de l'interlettrage déclaré, l'avance propre des glyphes ne diffère que de ~1,1 px (≈ +5 %) | la maquette n'a jamais montré Georgia à personne (`fc-match` → Noto Serif) ; un écart de chasse **à famille donnée** ne se corrige pas, il s'arbitre. ⚠️ Ceci **ne couvre pas** `M1` : la classe romaine → linéale n'est pas une substitution de rendu |
| **libellés anglais de la RÉFÉRENCE** (`HEAT`, `$ 24 850`) | la maquette porte `Heat` et un montant en dollars ; le jeu porte `CHALEUR` et des euros | ruling « fr réel » 2026-09-02 : **le client a raison, la maquette est en retard**. Noté une fois, jamais compté comme écart d'écran |
| **cadre de téléphone de la maquette** (coins arrondis, liseré) | présent dans `reference-1080x2102.png`, absent d'une capture plein écran | c'est le châssis `.tel` du planchier, pas un élément d'écran |

---

## Ce que le lot DÉCLARE — vérifié une par une

| item déclaré | verdict mesuré |
|---|---|
| **F1** plaque opaque 210×40 remplacée par zone transparente + halo | **tenu** — plus aucune plaque : la peinture est à 2/255 partout hors halos (`m07`). Le halo existe, mais son **signe** est inversé ⇒ `M3` |
| **F2** contraste | **tenu** — 5,34 à 7,78:1, plancher 4,5 (`m17`) |
| **F3** capitale 10 → 16 CSS | **tenu** — rapport jeu/maquette **1,000** sur 14 mots (`m27`) |
| **F4** angle par district repris de la source | **tenu** — 18/18, médiane +0,07°, max 1,37° ; amplitude 28,21° contre 28° de la source ; les six profils de trame se retrouvent groupés (`m27`) |
| **F5** route or byte-exacte, rose des vents dégagée | **tenu** — pic (136,119,81)/(136,119,82), 19 px des deux côtés ; bras nord à ≤ 1,6 px (`m20`,`m21`) |
| **F6** pastilles de légende retirées | **tenu** — 0 px des trois teintes (`m24`) |
| **F7 / F10** largeur fixe, arête sans arrondi | **tenus** — tombent avec F1 |
| **F8** noms ~8 px plus bas | **NON tenu** — +7,5 px médian, 13/13 du même signe (r1 : +8,4). L'explication par l'inclinaison est réfutée ⇒ `m2` |
| **F9** blanc → crème, r−b 39 | **tenu sur la cible déclarée** (r−b = 39 sur les 18, bande maquette 29–40) ; la **clarté**, elle, descend de 22,6 L ⇒ `m1` |

### QUAI-NORD — la question explicite du dossier, tranchée en nommant l'objet

Le dossier demandait laquelle des deux hypothèses tient. **C'est la première : la mesure du r1 ne
portait pas sur le mot.** La maquette **suit** sa source à cet endroit.

| objet mesuré (dans la RÉFÉRENCE) | fenêtre | angle | résidu | hauteur de capitale |
|---|---|---|---|---|
| **(a) le mot « QUAI-NORD » seul** | (455,448)-(650,515), encre crème, colonnes de capitale ≥ 11 px | **−10,25°** | **1,39 px** | 18 px |
| **(b) le libellé « CHASSE » de l'écusson n° 1** (`.ecusson .l`, `#b3a88f`, écusson NON tourné) | (396,446)-(456,468) | **+0,60°** | 0,92 px | 9 px |
| **(c) fenêtre large mélangeant (a) et (b)**, sans filtre de hauteur | (396,440)-(650,515) | **−2,49°** | **10,59 px** | 17 px |

La source d'auteur donne `rotate(-10 152.8 69.6)` pour QUAI-NORD (cadre #22 de
`ecrans-brennar-6.html` — aide de lecture ; l'image confirme). Le −3,51° du r1 est à un demi-degré
de la mesure **mélangée** (c), et le résidu de régression le trahit : **1,39 px** quand on mesure le
mot, **10,59 px** quand on y ajoute le libellé horizontal de l'écusson posé juste à sa gauche. En
jeu, QUAI-NORD rend **−9,96°**. (`m15`)

### Les 18 angles

| quartier | source | maquette | jeu | jeu − source | jeu − maquette |
|---|---|---|---|---|---|
| LES BASSINS | −10 | −10,15 | −9,96 | +0,04 | +0,19 |
| QUAI-NORD | −10 | −10,25 | −9,96 | +0,04 | +0,29 |
| SARNES | −10 | −10,00 | −9,47 | +0,53 | +0,53 |
| LA COLONNE | +3 | +3,12 | +3,50 | +0,50 | +0,38 |
| HAUTES-MARCHES | +3 | +3,42 | +3,40 | +0,40 | −0,02 |
| VERRIER | +3 | +3,06 | +2,63 | −0,37 | −0,43 |
| SAINT-BRAND | +3 | +3,14 | +3,09 | +0,09 | −0,05 |
| LES ENTREPÔTS | +7 | +6,95 | +6,79 | −0,21 | −0,16 |
| DÉPÔT-EST | +7 | +7,07 | +7,06 | +0,06 | −0,01 |
| LE TREILLIS | 0 | +0,28 | −0,10 | −0,10 | −0,38 |
| MARNE-BASSE | 0 | +0,20 | +0,48 | +0,48 | +0,28 |
| LE VERRE | +18 | +17,67 | +17,50 | −0,50 | −0,17 |
| ORSEL | 0 | +0,84 | +0,11 | +0,11 | −0,73 |
| PLACE DES COMPTES | +18 | +18,18 | +17,93 | −0,07 | −0,25 |
| LA LISIÈRE | −7 | *(non isolable)* | −5,63 | **+1,37** | — |
| LA CHANCELLERIE | +18 | +18,16 | +18,25 | +0,25 | +0,09 |
| LES FRICHES | −7 | −6,89 | −6,90 | +0,10 | −0,01 |
| PONT-GRIS | −7 | −7,02 | −7,21 | −0,21 | −0,19 |

LA LISIÈRE côté maquette n'est **pas isolable**, et j'écris pourquoi plutôt que de donner un nombre :
c'est le quartier « mien », son encre est **or** (`#f2c96b`) posée **sur le disque or** — le filtre
attrape le disque entier. Quatre fenêtres, de la plus large à la plus serrée, rendent
**n = 10 129 / 7 369 / 5 215 / 3 798 px d'« encre »** pour un mot de 10 lettres, et une hauteur de
capitale de **66 / 51 / 41 / 33 px** au lieu des ~19 attendus (corps 7,4 au lieu de 6,6) : c'est le
disque qui est mesuré, pas le mot (`m28`). Côté jeu, la fenêtre serrée donne **−5,63°** avec un
résidu de **1,37 px** ; la fenêtre large donnait −3,39° avec un résidu de **7,68 px** — c'est le
résidu qui départage, et j'écarte la seconde pour cette raison.

---

## 5. Autres résolutions

**Rien à juger : le dossier ne fournit qu'une seule résolution.** Les deux fichiers sont
`1080 × 2400` (vérifié : `m01` imprime les trois tailles). La cible portrait 1080×2400 est donc
couverte ; toute autre résolution est **non vérifiée** (§6).

---

## 6. Ce que je n'ai pas pu vérifier

1. **Une seule résolution.** Aucune seconde résolution n'est fournie. Reflux, débordements et
   proportions à une autre taille sont **non vérifiés**. Trancherait : une capture du même run à une
   deuxième résolution (le dossier en annonce le principe, ce tour n'en livre pas).
2. **La carte « hors chrome » n'existe pas.** Le second fichier porte le même bandeau et le même
   dock (`m01`, `m02`). Je n'ai donc **pas** pu lire la peinture sous le bandeau ni sous le dock, ce
   que le dossier proposait explicitement. Trancherait : une vraie capture hors chrome du même run.
3. **Animation — partiellement tranché, dans le bon sens.** Aucune paire T/T+1 s n'est fournie, mais
   les deux planches du même run sont séparées d'au moins un jour de monde (JOUR 50 → 51) et la zone
   de contenu (232..2135) diffère de **1 px**. C'est une preuve forte d'absence d'animation **dans
   le contenu**. En revanche l'**aiguille du manomètre** bouge entre les deux (799 px de différence,
   x 489..592 / y 122..144) — c'est du chrome, non jugé ici, mais à regarder par qui juge le chrome.
4. **La police du jeu, nommée.** Mes deux instruments d'empattement (`m18` §A profil de couverture,
   `m19` rapport bas/milieu) ont un **bruit de contrôle du même ordre que le signal** (0,084 et 0,143
   contre des écarts de 0,109 à 0,121) : ils ne discriminent pas et je ne m'en sers pas. Ce qui
   discrimine, c'est l'épaisseur de trait (+41 %, bruit 2,8 %) et l'œil sur `z_halo_LETREILLIS_*.png`.
   Trancherait, hors image : la police réellement assignée au libellé de quartier dans le client.
5. **La chaleur.** La pastille annonce « Chaleur : affichée » et **rien sur la carte n'encode la
   chaleur** (les trois quartiers témoins sont à ≤ 2/255 d'une maquette sans lavis). Je ne peux pas
   distinguer depuis une image « le lot des formes d'état n'est pas livré » de « toutes les données
   valent Libre sur ce compte ». Trancherait : les corps réels de `heat` par district sur le compte
   gelé, ou une capture sur un compte à chaleur haute.
6. **Identité photographiée : admise, non re-vérifiée par moi.** Le dossier cite la ligne
   `[DemoIdentityResolver] régime=env identité=demo_capture@example.test`, mais **le journal du run
   n'est pas joint** : je prends la citation pour ce qu'elle est. Toutes mes conclusions sont de
   **FORME** et n'en dépendent pas ; la seule ligne marquée « dépend des données : oui » est `m3`
   (le libellé de la pastille) et `m4`.
7. **Le rect imprimé du test n'est pas fourni** (le dossier le dit). Je ne m'en suis pas servi : mes
   bornes de contenu (232 / 2151) et le recalage sont mesurés sur l'image, pas dérivés du code.
8. **États d'interaction** (survol, appui, « ENTRER dans le quartier »), **le jour**, la semaine de
   compression et les pastilles par district : aucune capture, aucune maquette d'état dans le
   dossier. Non vérifiés — et le dossier demande explicitement de ne pas les classer défaut.
9. **Un libellé plus long que « PLACE DES COMPTES »** (le plus long des 18) n'est pas exercé : je ne
   sais pas si le lettrage du jeu déborde ou se tronque au-delà.
10. **Le disque or et l'épingle rendent 584 et 181 px** dans le jeu là où la maquette en rend 19 490
    et 5 409. Ces restes sont, à l'examen, des points d'or **peints dans la texture** qui tombent
    dans la fenêtre — mais je ne l'ai pas prouvé pixel à pixel, seulement constaté que le balayage
    « en trop » (`m26`) ne signale aucun amas ajouté à cet endroit.

---

## Annexes

### 1. Inventaire de la référence (résumé chiffré)

Couche globale, zone de contenu (0,219)-(1080,2084), 1080×1866 px : **L moyenne 38,26 · médiane
33,65 · p90 66,46 · p99 171,60** ; densité d'encre (L > 110) **3,53 %** ; **0 px** de blanc pur.
Palette dominante (quantification à 6) : `(8,14,21) 26,1 %` · `(24,37,51) 16,7 %` · `(19,25,37)
16,6 %` · `(31,37,51) 15,7 %` · `(40,57,61) 15,4 %` · `(91,93,83) 9,5 %`.

Parties et leurs jetons (CSS de l'atelier, valeurs confirmées sur l'image) : sol de quartier
`#182634`/`#1c2740`/`#20273a`/`#1e2229`/`#1a2333`/`#1d2538` selon la trame · rues `#0a1119` ·
fleuve `#0a1119` sur l'eau (24,64,82) · nom de quartier `.nomq` **Georgia/serif 6,6 px,
letter-spacing 0,24 em, fill `#e0d6bd`, opacity 0,9, paint-order stroke, stroke `#080d14` 2,4** ·
lavis de chaleur `.nappe.warm #d9ab4e α.3` / `.hot #e0664a α.42` / `.burning #e0402a α.55` ·
écusson `fill #0e1421`, `stroke #b08d3e` (chasse `#e0664a`, soupçon `#d9ab4e`, veille `#7fd4d9`) ·
« mien » `.q.mien .nomq fill #f2c96b, font-size 7,4` · route `.spine-av #f2c96b α.5` · rose des
vents `#c9bfa5 α.7` · pied de page Georgia italique 9,5 px sur dégradé vers `#0a0f18ee`.

Rythme vertical (frontières mesurées, ref y) : bandeau évoqué 0..218 · rive nord 219..~980 ·
Threnny ~985..~1190 · rive sud ~1195..~2050 · pied de page ~1930..2084 (voile) ; contenu 219..2084.

### 2. Inventaire de la capture (résumé chiffré)

Couche globale, zone de contenu (0,232)-(1080,2135), 1080×1904 px : **L moyenne 34,01 · médiane
33,11 · p90 55,37 · p99 169,42** ; densité d'encre (L > 110) **2,13 %** ; blanc pur **124 px**
(la seule pastille). Palette dominante : `(9,14,20) 24,7 %` · `(27,42,58) 22,9 %` · `(24,30,43)
16,1 %` · `(28,36,51) 15,8 %` · `(16,24,34) 11,4 %` · `(53,79,87) 9,0 %`.

Zones : bandeau 0..231 (uni `(28,28,34)` de 204 à 214, losange d'or 215..231) · peinture 232..2135 ·
bande sombre 2136..2151 (L 7,6, soit −1,6 L par rapport aux 16 px au-dessus : c'est la peinture, pas
un voile ajouté) · dock 2152..2400.

Parties **en trop** par rapport à la maquette (balayage `m26`, 38 amas ≥ +12 L) : **37 sont les
halos des noms** (+14 à +27 L médian) ; **1 est la pastille « Chaleur »** (+48,4 L). Parties
**absentes** (6 amas ≤ −12 L) : lavis HAUTES-MARCHES (159 cellules, −40,9 L) · disque or + LA LISIÈRE
(158, −33,9) · lavis LES BASSINS (118, −32,8) · écusson 3 (13, −26,3) · écusson 1 (7 + 4, −24,7 et
−15,5). **Contrôle positif du balayage satisfait** : les amas sombres sont exactement les éléments
déjà identifiés absents par le comptage de teinte (`m23`).

### 3. Correspondance des repères

`cap_x = 1,0220 × ref_x − 12,0` · `cap_y = 1,0220 × ref_y + 8,0` (isotrope, `m06`). Inverse :
`ref = (cap − t) / 1,0220`. Peinture visible : ref x **11,7..1067,5**, ref y **219,2..2081,2**.
Échelle du contenu : 1 px CSS = 3,6 px des deux côtés (dossier), rapport capture ÷ référence = 1,00 ;
le facteur 1,0220 est donc un **cadrage** (la capture montre 2,2 % de peinture en moins par axe),
pas un changement d'échelle typographique — ce que confirme le rapport de hauteur de capitale 1,000.

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `m01_geometrie_chrome.py` | tailles, delta entre les deux planches | + largeurs à 1080 ; − hauteurs différentes |
| `m02_delta_zones.py` | localisation des 5 105 px de delta | — |
| `m03_frontieres.py` / `m04_frontieres_ref.py` | bornes du contenu par profil de ligne | — |
| `m05_recalage.py` | recalage par profils 1-D — **abandonné** | le contrôle de discrimination le réfute en X (5,29 / 5,60) |
| `m06_recalage2d.py` | recalage 2-D sur points à fort gradient | + minimum net (16,0 contre 24-28 à ±3 px) ; − balayage d'anisotropie |
| `m07_residu_peinture.py` | résidu de la peinture, 2 170 cellules | + cellules de fleuve à ≤ 1/255 |
| `m08_vues_recalees.py` | vues côte à côte recalées | — |
| `m09` → `m14b` | détection et mesure des 18 noms (4 versions ; les trois premières sont conservées avec la raison de leur remplacement écrite en tête) | + 18/18, hcap dans 14..22 ; − libellés d'écusson exclus par le seuil de hauteur |
| `m15_quainord.py` | QUAI-NORD, trois objets séparés | le résidu de régression sert de discriminant (1,39 / 10,59) |
| `m16_halo.py` | profil radial autour des noms | + « LE THRENNY » identique des deux côtés |
| `m17_contraste.py` | contrastes WCAG | − encre synthétique dans le fleuve : profil plat (1,04 / 1,43 L) |
| `m18_serif_position.py` | signature d'empattement (**non concluante**), position, décomposition de la largeur | + « LE THRENNY » : bruit 0,084 ≈ signal ⇒ instrument écarté |
| `m19_serif_runs.py` / `m19b` | rapport bas/milieu (**non concluant**) puis **épaisseur de trait** (concluant) | + « LE THRENNY » : bruit 0,143 ≈ signal, puis 2,8 % contre +41 % |
| `m20_structure.py` | gouttière, cadrage, marges, repères peints | + rose des vents, fleuve, route or |
| `m21_route_pastille.py` | profils bruts de la route or, pastille | — |
| `m22_global_chrome.py` | couche globale, blanc pur, chrome | + palette quantifiée des deux côtés |
| `m23_absences.py` | absences par comptage de teinte + couche globale masquée | + route or 237/230, fleuve 1011/939 |
| `m24_lavis_pied.py` | lavis, pied de page, bande de légende du r1 | + 3 quartiers sans lavis à ≤ 2/255 |
| `m25_halo_etendue.py` | étendue du halo, surface de peinture altérée | + « LE THRENNY » : delta médian −0,22 L |
| `m26_en_trop.py` | balayage « ajouté / absent » sur tout l'écran | + les amas sombres sont les éléments déjà identifiés |
| `m27_table_finale.py` | consolidation des 18 noms | — |
| `m28_pastille_bbox.py` | géométrie exacte de la pastille (le `m21` échantillonnait le bord de la tour voisine et donnait un fond faux) ; pourquoi LA LISIÈRE n'est pas isolable côté maquette | le compte de px d'« encre » et la hauteur de capitale servent de détecteur de contamination |

Vues de travail : `v_reference_recalee.png`, `v_*_REFhaut_CAPbas.png`, `z_nom_*.png`,
`z_halo_LETREILLIS_{ref,cap}.png`, `z_txt_*.png`, `z_pastille_chaleur.png`, `z_chrome_*.png`,
`r_*.png`.

**Empreintes vérifiées** (`sha256sum`) : `capture-1080x2400.png` `ab3fc0a7…` et
`capture-carte-seule-1080x2400.png` `affce6d1…` — conformes au dossier ; `reference-1080x2102.png`
`23896ee4…`.
