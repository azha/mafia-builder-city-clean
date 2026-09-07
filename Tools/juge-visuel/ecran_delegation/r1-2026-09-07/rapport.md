# Juge visuel ⊥ — ㉜ Ce que vous avez confié (« le tableau de service ») — r1 — 2026-09-07

Dossier : `Tools/juge-visuel/ecran_delegation/r1-2026-09-07/` · scripts : `mesures/00…22_*.py` (23 scripts)
Référence : `reference-1080x2102.png` (cadre **#73** « Tout est encore à vous », ×3,6)
Capture : `capture-1080x2400.png` (1 seule, campagne `03efb90` 06/09 14:56, surimpression sous chrome)

> **⚠️ Un fichier est arrivé dans le dossier PENDANT ma passe.** Au démarrage, un `ls` rendait
> **6 fichiers** et `hud-canon-1176.png` n'y était pas ; j'avais donc écrit « le chrome n'a aucun
> témoin ». Un relevé binaire (`os.listdir` + `os.lstat`) en fin de passe le trouve, en lien vers
> `../../ecran-principal/ecran-canon.png`, **mtime 1788749783 — 1 563 s après tous les autres
> fichiers du dossier, et après la création de mon répertoire `mesures/`** (1788749491). Le canon
> a donc été ajouté en cours de route. **Je l'ai utilisé** : le chrome EST jugé (table CHROME,
> script `mesures/20`), et le point « non vérifié » correspondant est **rétracté**.
>
> **Témoin retenu, et pourquoi.** La capture n'est PAS dans l'état du cadre nominal : son geste
> (« EN CONFIER UNE ») est **mort**. J'ai donc pris deux homologues :
> — pour la **géométrie, la palette, la typographie, le rythme** → le cadre **#73** rendu en image ;
> — pour le **geste mort seul** → la CSS `.serv6 .sv-geste.mort` (l. 4965-4966 de
>   `ecrans-brennar-6.html`), état du cadre **#77**, **non rendu ce tour** (aucune image ratifiée).
> Toute mesure du geste est donc opposée à une SOURCE, pas à une image : c'est écrit dans la colonne
> « ce que je n'ai pas pu vérifier ».

---

## Verdict : **NON APPROUVÉ**

Le tableau de service est reproduit avec une fidélité remarquable — polices, jetons de couleur,
capitales, largeurs d'encre et bordures tombent à 0-2/255 et à 0-1 px — mais l'écran affiche le
**jeton de décision du jour en or PLEIN (état actif)** juste au-dessus d'un **geste MORT**, un
couplage qu'aucun des six cadres du groupe ne dessine : le joueur lit « vous avez une décision »
et « vous ne pouvez rien faire » dans le même regard.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence | jeu | écart |
|---|---|---|---|---|
| 1 | largeur d'image (échelle imposée par `dossier.md`) | 1080 px = 300 CSS | 1080 px = 300 CSS | rapport **1,00** |
| 2 | bandeau : filet braise (dérivé par le dossier à 143 px) | — | **y = 141-142**, hauteur 143 px | **≤ 2 px** (`14`) |
| 3 | largeur d'une plaque | 974 px | 980 px | 6 px = **exactement** la bordure 1 CSS du châssis `.tel` (2 × 3,6) |
| 4 | bordure de plaque `#38434e` | (56,67,78) | (56,66,77) | **d = 1** (CSS d = 0) |
| 5 | bordure du jeton `#5a4a2a` | (90,74,42) | (90,73,42) | **d = 1** |
| 6 | filet bas de la tête `#333c46` | (51,60,70) | (49,61,71) | **d = 2** |
| 7 | encre des 8 textes du panneau (`#eef3f9` ×2, `#8d99a6` ×3, `#d9ab4e`, `#9a8a6a`, `#8fdfe4`) | — | — | **d = 0** sur 7, **d = 1** sur 1 |
| 8 | hauteurs de capitale : h3 « C » / plaque « L » / CTA « E » | 33 / 24 / 25 px | 33 / 24 / 24 px | **0 / 0 / −1 px** |
| 9 | largeurs d'encre du **même** texte : h3, sous-titre, `q b`, `q i`, `tenu b`, sv-dit L1, sv-dit L2 | 938/826/232/267/75/977/566 | 937/827/231/266/74/976/567 | **≤ 0,4 %** |
| 10 | rond du jeton (16 CSS) | 57 × 58 px | 57 × 57 px | cercle des deux côtés, **d ≤ 1** |
| 11 | `cro` de plaque (9 × 20 CSS) | 32 × 72 px | 32 × 72 px | **0** |
| 12 | écarts entre plaques (CSS `margin-bottom:5px` = 18 px) | 19 / 19 / 19 | 19 / 19 / 19 | **0** |
| 13 | hauteur du CTA (CSS 29,5 CSS = 106 px) | 105 px | 104 px | **1 px** |
| 14 | rayons d'arrondi (amplitude du retrait au coin) | plaque 5 px · jeton 8 px · CTA 8 px | 5 px · 7 px · 7 px | **≤ 1 px** |
| 15 | h3 → sous-titre (haut à haut) | 64 px | 63 px | **1 px** |
| 16 | padding haut du corps (filet de tête → jeton) | 37 px | 38 px | **1 px** |
| 17 | fond `.sv-bas` `#141a21` | (20,26,33) | (22,28,34) | **d = 2** |
| 18 | fond du panneau à 75 % de sa hauteur | (21,24,29) | (21,25,30) | **d = 1** |
| 19 | **polices** : le bloc `.serv6` demande `'DejaVu Serif'` (5 règles) + `'DejaVu Sans'` (13), **zéro Georgia** | — | client = DejaVu | **aucun arbitrage de police sur le panneau** |
| 20 | geste mort du jeu contre la CSS `.sv-geste.mort` | `#1c1414` / `#4a3a3a` / `#8b6a6a` / `#7a6060` | (28,22,22) / (73,59,59) / (139,106,106) / (120,94,94) | **d = 2 / 1 / 0 / 2** |
| 21 | contrastes WCAG des 8 textes du panneau | 4,98 → 14,68 : 1 | 5,01 → 14,51 : 1 | tous conservés |
| 22 | `.sv-titron` du jeu contre `#7e8b98` | — | (126,139,152) | **d = 0**, capitale 18 px (attendu ~17) |

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir, en un écran, **qui tient quoi** dans la maison — quatre charges, chacune à vous ou à
un lieutenant — et savoir qu'on peut en **confier une**, contre un prix, une fois par jour.

**Ordre de lecture.** (1) le **titre sérif clair** en haut, 33 px de capitale sur 14,7:1 de contraste,
qui nomme l'état (« Ce que vous tenez encore vous-même ») ; (2) le **jeton d'or** juste dessous —
la seule masse chaude de la moitié haute (13,4 % de l'aire du panneau en teinte brune) : c'est la
ressource du jour ; (3) la **pile de quatre plaques**, lues de gauche (la charge) à droite (qui la
tient, en cyan `#8fdfe4` quand c'est vous) ; (4) tout en bas, la **phrase en italique** qui dit
pourquoi ça compte, puis le **geste d'or** qui appelle l'action.

**Zones.** Tête (titre + promesse, fond `#1b2027`, filet `#333c46`) · corps (jeton + 4 plaques, sur
le dégradé `#1d2229→#121519`) · vide de respiration · pied (`#141a21`, séparé par un **filet 2 CSS
`#2c3640`**) portant la phrase et le geste.

**Traits d'identité.** ① le **jeton d'or plein** (rond `#d9ab4e` + libellé or) comme unique accent
chaud du corps ; ② les **quatre plaques identiques** avec leur onglet gris `cro` à gauche et le
verdict à droite ; ③ le **cyan** réservé à « vous » ; ④ le **pied encadré par un filet clair**, avec
la phrase italique sérif dont le membre décisif est en **blanc plus vif** ; ⑤ le **geste d'or** en
bas, seul appel à l'action.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, à un détail près qui pèse plus que tous les autres. Le but est immédiatement lisible, l'ordre
de lecture est **le même** (titre → jeton d'or → quatre plaques → phrase → geste), les cinq traits
d'identité sont présents, et la couche globale colle : luminance moyenne 37,2 (réf) contre 35,6
(jeu), densité d'encre 8,7 % contre 6,6 %, contrastes conservés à ±0,4 point sur huit textes. La
typographie est **la même police à la même taille** — 0,1 % d'écart de chasse sur le titre.

Ce qui change la lecture : **le jeton du jour est en or PLEIN (actif) et le geste est MORT.** Les
quatre discriminants de l'état du jeton sont tous du côté « actif » (rond `#d9ab4d`, fond
`#241c11`, bordure `#5a4a2a`, libellé `#d9ab4e`) alors que le geste est exactement l'état
`.sv-geste.mort` de la maquette. Or les **six** cadres du groupe apparient strictement : les quatre
qui portent un jeton actif portent un geste actif ; le seul geste mort (#77) est sous un jeton
`.use` **éteint**. Le joueur lit donc, en un regard, « vous avez votre décision d'aujourd'hui » et
« aucune n'est encore prête ».

Deuxième par l'impact : le **pied a perdu son filet**. Les 7 px de `#2c3640` qui, dans la maquette,
tracent la frontière entre la liste et le bloc de conclusion ont disparu ; le fond passe de
(20,24,29) à (22,28,34), soit 5 niveaux — invisible. Le pied ne se détache plus, et comme le vide
au-dessus est passé de 333 à 600 px (25 % de l'écran), la moitié basse est un long silence sans
articulation.

Troisième : le **jeton s'est aplati**. Il fait 127 px au lieu de 172 (−26 %) parce que la place
donnée à son indice de droite est plus étroite (≈ 343 px contre 418-465), ce qui fait passer le
titre de 3 lignes serrées à 2 lignes larges. Il n'est plus 1,26 × plus haut qu'une plaque mais
0,98 × : l'accent chaud pèse moins dans la moitié haute (part de teinte brune 13,4 % → 4,9 %).

Le reste est de la finition : plaques en aplat au lieu d'un léger dégradé, emphase de la phrase
italique portée par la graisse mais pas par la couleur, interligne de cette phrase 16 % plus serré.
Rien n'est coupé, rien ne déborde, rien ne sort du cadre.

---

## 3. Écarts

Un finding par ligne. `dépend des données` : OUI = l'observation change si le compte change.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| **M1** | MAJEUR | NOUVEAU | **OUI** | **Jeton de décision ACTIF au-dessus d'un geste MORT** — couplage qu'aucun cadre du groupe ne dessine ; le joueur lit « décision disponible » + « rien n'est possible » | Jeton du jeu, 4 discriminants, tous « actif » : rond (217,171,77) vs `#d9ab4e` **d=1** (l'état `.use` serait `#2a2320`) · fond (34,28,13) vs `#241c11` **d=4** (`.use` = `#1c1414`) · bordure (90,73,42) vs `#5a4a2a` **d=1** (`.use` = `#4a3a3a`) · libellé (217,171,77) vs `#d9ab4e` **d=1** (`.use` = `#8b6a6a`). Geste du jeu, 4 discriminants, tous « mort » : fond (28,22,22) vs `#1c1414` **d=2** · bordure (73,59,59) vs `#4a3a3a` **d=1** · libellé (139,106,106) vs `#8b6a6a` **d=0** · indice (120,94,94) vs `#7a6060` **d=2**. Cadres du groupe comptés par script (`mesures/22`) : **6/6** — #73/#74/#75 jeton **ACTIF** + geste **actif** · #76 sans jeton + geste actif · **#77 jeton `.use` + geste MORT** · #78 ni l'un ni l'autre. **Aucun cadre n'apparie ACTIF et MORT.** Contrôle positif `sv-plaque` = 23, contrôle négatif `sv-zzz` = 0. `mesures/12`, `mesures/17`, `mesures/22` | aucun cadre de la maquette ne dessine ce couplage ⇒ la gravité repose sur la **lecture**, pas sur un témoin ratifié. La cause (aucun lieutenant prêt) n'est pas vérifiable : identité déclarée par corps de commit, journal non joint |
| **m1** | MINEUR | NOUVEAU | non | **Filet haut de `.sv-bas` absent** (CSS `border-top:2px solid #2c3640`) : la frontière liste/pied n'est plus tracée | Réf : filet **y = 1780..1786** (7 px = 2 CSS), couleur (44,54,64) = `#2c3640` **d=0**. Jeu : balayage **exhaustif** de y=1200 à 2400, tolérance 12 puis 20, cible `#2c3640` ⇒ **aucune ligne** ; seul passage de fond à y≈1857-1859, (20,24,29)→(22,28,34), **Δ = 5 niveaux**. Contrôle positif : le même balayage TROUVE le filet en réf ; contrôle négatif `#00ff00` : 0 des deux côtés. **DURCI** (`mesures/21`) par un détecteur qui ne suppose AUCUNE couleur — « une ligne pleine largeur plus claire que ses deux voisines » : il sort le filet en réf (y = 1781-1785, Δ 27,4, `#2c3640`) et, dans la capture, **rien entre y = 1200 et 1990** hormis les deux lignes de glyphes de la phrase. `mesures/07`, `mesures/21` | — |
| **m2** | MINEUR | NOUVEAU | non | **Jeton 26 % plus court** : l'indice de droite reçoit une boîte plus étroite, il passe à 2 lignes et le titre de 3 lignes à 2 ⇒ le rapport jeton/plaque tombe de 1,26 à 0,98 | Hauteur de boîte : réf **172 px** (643→814), jeu **127 px** (435→561), **−45 px (−26 %)** — recoupé par deux instruments indépendants (bordure claire `mesures/01`, fond de boîte `mesures/17`). Blocs de colonnes, boîte entière balayée : réf rond 89..145 · titre 180..447 (**3 lignes**) · indice 574..989 (l=416, **1 ligne**) ; jeu rond 83..139 · titre 174..610 (**2 lignes**) · indice 684..995 (l=312, **2 lignes**). CSS : `i{max-width:52%}` = 465 px disponibles en réf. `mesures/11` | — |
| **m3** | MINEUR | NOUVEAU | non | **Écart sélectif** : la marge jeton → 1ʳᵉ plaque vaut +49 % alors que les trois marges entre plaques sont exactes ⇒ ce n'est pas l'espacement global, c'est le conteneur du jeton | Réf 814→851 = **37 px** (CSS `margin-bottom:10px` = 36) ; jeu 561→616 = **55 px**, **+18 px**. Marges entre plaques : **19/19/19 px des deux côtés** (CSS 5 px = 18). `mesures/01` | — |
| **m4** | MINEUR | NOUVEAU | non | **Plaques en aplat** : le dégradé vertical et le liseré interne clair du haut ont disparu | Réf : dégradé (36,44,52) en haut → (28,35,43) en bas, **amplitude 13 niveaux** sur 128 px, + 3 px de liseré (47,54,62) sous la bordure (CSS `inset 0 1px 0 #ffffff0d`). Jeu : **(34,38,46) constant, amplitude 0**, aucun liseré. Vérifié sur **deux fenêtres x indépendantes** (600-720 et 430-560) et sur les plaques 1 et 4. Écart au haut de plaque **d=6**, au bas **d=7**. `mesures/06` (dont son second chemin `(b'')` : autres fenêtres x, autre plaque) | — |
| **m5** | MINEUR | NOUVEAU | non | **Emphase de la phrase du pied perdue en COULEUR** : `rien ne se fait sans vous` reste à la teinte du texte courant | Réf : segment x=458..873 à **`#eef3f9`** (238,243,249), lum max **242,4**, contre `#cdd6e0` (205,214,224) avant et après ⇒ écart **33/255**. Jeu : les trois segments à **`#cdd6e0`**, lum max **212,8** partout ⇒ écart **0**. La **graisse**, elle, est là (densité d'encre du segment 31,2 % contre 24,9 %/19,9 %, même profil qu'en réf 29,5 / 21,4 / 16,8 %). Contrôle : l'instrument discrimine (33 en réf). **DURCI** (`mesures/21`) : l'emphase ne passe pas non plus par la TEINTE — écart R−B réf **8**, jeu **0** ; écart RGB complet réf **33**, jeu **0** ; contrôle positif de teinte sur le « vous » cyan, R−B = **−85**. `mesures/15`, `mesures/21` | — |
| **m6** | MINEUR | NOUVEAU | non | **Interligne de la phrase du pied 16 % plus serré** | Haut de ligne à haut de ligne : réf **43 px** (1826→1869) = exactement `8.6px/1.4` CSS ×3,6 = 43,3 ; jeu **36 px** (1894→1930). Même police, même corps (largeurs 977/976 et 566/567 px, hauteurs d'encre 31/31). `mesures/08` | — |
| **m7** | MINEUR | NOUVEAU | non | **Interligne `tenu` (verdict / sous-verdict) +35 %** | Bas du gras → haut de l'italique : réf **17 px**, jeu **23 px** (CSS `margin-top:2px` = 7,2 px). Le couple de gauche (`q b`/`q i`) est, lui, exact : 17 / 18 px. `mesures/08` | — |
| **m8** | MINEUR | NOUVEAU | non | **Tête du panneau +47 %** — le titre descend de 91 px dans sa propre tête pour dégager le chrome | Réf : tête **173 px** (434→606), capitale du titre à **46 px** du haut. Jeu : tête **255 px** (143→397), capitale à **137 px** du haut, **+91 px**. L'espace est occupé par le **débord du médaillon** (arc bas jusqu'à y≈198) et le **losange d'ornement** (encre 478..601 × 180..231). Rien de l'écran n'est occulté ; le rythme interne sous l'ornement est identique (h3→p 64/63 px). `mesures/02`, `mesures/03` | le **débord exact** du médaillon n'est pas mesurable proprement (voir N4) ; ce qui l'est : l'encre de chrome s'arrête à **y = 231** et la capitale du titre commence à **y = 277**, soit **46 px** plus bas — exactement les 46 px de la référence |
| **m9** | MINEUR | NOUVEAU | non | **Partie EN TROP** : une rangée `CE QUI N'EST PAS ENCORE À CONFIER ▶` sous la liste, qu'aucun des 6 cadres ne porte | Encre x=47..762, y=1232..1257, capitale **18 px**, couleur **(126,139,152) = `#7e8b98`, d=0** avec `.sv-titron` (CSS 6,6 px, ls 1,5 px, majuscules) ⇒ rendue dans le vocabulaire exact de la maquette ; contraste 5,12:1 ; posée 44 px sous la dernière plaque, 3 px à gauche du bord des plaques. Compté dans la source (`mesures/22`) : `sv-titron` apparaît **1 fois** dans tout le groupe, **dans #78** ; la chaîne « n'est pas encore » **1 fois**, dans le **h3 de #78** — jamais une rangée de #73. `mesures/08`, `mesures/09`, `mesures/12`, `mesures/22` | aucun cadre ne dessine cette affordance de navigation ⇒ elle demande une ratification DA, pas une correction (voir ARBITRAGE A4) |

**Compte : 1 MAJEUR, 9 MINEURS, 0 BLOQUANT.**

### Observations qui DÉPENDENT DES DONNÉES (non comptées ci-dessus)

| # | observation | mesure | statut |
|---|---|---|---|
| D1 | Le sous-verdict des 4 rangées a changé de **sujet** : la maquette dit ce que VOUS faites (« vous la faites » ×4), le jeu dit où en est un **délégataire** (« vous apprenez encore » ×3, « presque prête » ×1) | largeur d'encre `tenu i` : réf **148 px**, jeu **245 px** (+65 %) — textes différents, c'est le contrôle négatif de mon instrument de largeur | à trancher côté produit ; la FORME (couleur `#8d99a6` d=0, corps, alignement à droite) est exacte |
| D2 | Geste mort avec la raison « aucune n'est encore prête » — cause de M1 | forme exacte contre `.sv-geste.mort` (voir contrôle positif n° 20) | daté du 06/09 14:56, compte `demo_capture` déclaré |
| D3 | Chrome alimenté : ARGENT `9 627 820,00 €`, `JOUR 50`, médaillon `Brûlant / CHALEUR` avec anneau et filet **braise** | filet braise mesuré à y=141-142, (93,45,39) ; contrôle négatif : aucun motif braise sous y=1200 | témoin `.tel.chaud` correct par doctrine ; **valeurs non vérifiables** (identité déclarée, journal non joint) |

### ASSUMÉ — vérifié « rendu proprement »

| ce qu'on voit | pourquoi | rendu proprement ? | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|
| Bandeau + dock du shell différents de la barre évoquée du cadre de série 6 | doctrine `dossier.md` : le chrome se juge contre le canon HUD, pas contre le cadre | bandeau 143 px = la valeur dérivée (≤2 px) ; dock à y≈2148 ; **gouttière respectée** : aucun contenu d'écran sous le bandeau ni sous le dock | un contenu d'écran occulté par le chrome, ou un chrome qui ne traverse plus |
| Phase de l'aile droite à « — » | état VOULU hors district (doctrine, f2 2026-09-06) | ARGENT et JOUR alimentés, seule la phase est tiretée | un tiret sur ARGENT ou JOUR ⇒ capture prise avant alimentation |
| Bande d'art de district visible au-dessus du panneau dans la maquette, absente en jeu | c'est le châssis `.tel` (`.scene district`, `filter:brightness(.18)`), pas l'écran ; `dossier.md` prescrit d'aligner le haut du contenu sur le bas du bandeau | réf : moyenne **9,9**, σ **3,06** (texture réelle) ; jeu : moyenne **32,6**, σ **0,27** — aplat, sous le témoin plat (σ 0,46) | si le canon HUD (absent du dossier) montrait de l'art à cet endroit |
| Ronds du dock sans icône (**A6**) | arbitrage user connu ; confirmé contre le canon, qui pose bien une icône dans chaque rond | 4 ronds, 4 libellés (EMPIRE / FAMILLE / FILIÈRE / PLUS), soulignement sous EMPIRE | — |
| Vide de 600 px entre la liste et le pied | `.sv-body{flex:1}` : la hauteur d'écran supplémentaire (82,7 CSS) est absorbée là, comme prescrit | vide **plat** (σ 0,47), rien qui l'occupe ; réf 333 px (15,8 % de l'écran), jeu 600 px (25,0 %) — 78 % du gain de hauteur du panneau y est passé | un contenu attendu qui manquerait dans ce vide |

### CHROME — jugé contre `hud-canon-1176.png` (1176 px = 392 CSS-HUD, ×3 ; capture ×2,755)

Le chrome est **partagé** : il n'entre dans aucun finding de ㉜ (il sera repris avec ①). Je le
mesure parce que le canon est là, et parce que la doctrine du dossier exige de le juger contre lui.
Le canon est l'état **CALME** (« 37 % ») ; la capture est **BRÛLANT**, donc pour le filet du
bandeau le témoin est la CSS `.tel.chaud` (`--braise` = 224,102,74), pas le PNG calme.

| grandeur | canon | capture | verdict |
|---|---|---|---|
| largeur en CSS-HUD (contrôle positif) | 392,0 | 392,0 | **ÉGAL** |
| hauteur du bandeau (filet pleine largeur) | y = 154 → **51,3 CSS-HUD** | y = 141 → **51,2 CSS-HUD** | **ÉGAL (−0,2 CSS)** |
| couleur du filet | `#b08d3e` (176,141,62), laiton, R−G = **35** | `#e06649` (224,102,73), **d = 1 avec `--braise` (224,102,74)**, R−G = **122** | **témoin `.chaud` correct** (contrôle positif d'état : écart R−G = 87 > 40) |
| pas des 4 onglets du dock | 67,8 / 68,2 / 68,2 CSS-HUD | 68,2 / 68,1 / 67,9 CSS-HUD | **ÉGAL (≤ 0,4 CSS)** |
| centrage du groupe d'onglets | 49,83 % de la largeur | 50,00 % | **ÉGAL** |
| bord gauche du 1ᵉʳ libellé | 19,30 % | 19,26 % | **ÉGAL** |
| 3ᵉ onglet | `MARCHÉ` | `FILIÈRE` | **libellé différent** — onglet renommé ; chrome, hors ㉜ |
| icônes dans les ronds | présentes (20 × 20) | aucune | arbitrage user connu (A6) |
| repère d'onglet actif | **point** au-dessus du rond (FAMILLE) | **soulignement d'or** sous le libellé (EMPIRE) | mécanisme différent ; chrome, hors ㉜ |
| aile droite | `JOUR 12 · SOIRÉE` + **`21:40`** (horloge) | `JOUR 50` + **`—`** | la phase manque du petit libellé (assumé hors district) **et** la grande valeur, que le canon remplit d'une **heure**, porte un tiret — je ne peux pas dire si le « — » remplace la phase ou l'heure |
| ajouts absents du canon | — | **flèche `←`** en haut à gauche · **losange d'or** sous le médaillon (encre 478..601 × 180..231) | chrome ; A5 |

### ARBITRAGE — pas corrigible côté client

| id | point | mesure | destinataire |
|---|---|---|---|
| A1 | La maquette ne dessine **aucun** cadre pour « rien n'est confié ET personne n'est prêt » — son #73 apparie cette donnée à un geste **actif** | 6/6 cadres du groupe lus ; #77 est le seul geste mort, sous un jeton `.use` | **blender + user** (dessiner l'état, ou trancher le couplage) — c'est la source de M1 |
| A2 | Le jeton `.sv-geste.mort small` de la maquette (`#7a6060` sur `#1c1414`) rend **3,03:1** — sous le plancher de doctrine de 4,5:1 pour un petit texte (6,5 CSS = 23 px) | mesuré sur la capture : (120,94,94) sur (28,22,22) = **3,03:1** ; le client est fidèle au jeton (d=2) | **blender / DA** — la valeur vient de la maquette, pas du client |
| A3 | Libellés de la RÉFÉRENCE en retard : `$ 24 850`, `Jour 12 / Matin`, `HEAT` | le jeu affiche `9 627 820,00 €`, `JOUR 50`, `CHALEUR` | **blender** (maquette à mettre à jour) — noté une fois, jamais un écart d'écran |
| A4 | L'affordance `CE QUI N'EST PAS ENCORE À CONFIER ▶` (m9) est une route vers le cadre #78 que la maquette n'a jamais dessinée comme rangée | rendue dans le jeton `.sv-titron` exact (d=0) | **user / blender** (ratifier l'affordance, ou la dessiner) |
| A5 | Flèche « ← » en haut à gauche du bandeau | chrome ; hors du canon de série 6 | **user** (arbitrage connu sur le domicile de la flèche retour) |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, **1080×2400**. La cible 1920 (`ligne GO (a)`) est
absente : rien n'est vérifié sur le reflux, ni sur les coupes, ni sur la conservation des
proportions à une autre largeur. Voir « non vérifié ».

---

## 6. Non vérifié

| # | ce que je n'ai pas pu voir | la mesure hors image qui trancherait |
|---|---|---|
| N1 | **Résolution 1920** — reflux, coupes, débordements à une autre largeur | une capture `planche_*_1080x1920.png` de la même campagne |
| N2 | **Absence d'animation** (ruling 2026-08-27) : une seule image | une paire T / T+1 s du même état ⇒ compter les pixels différents, chrome exclu |
| N3 | **Toutes les VALEURS affichées** (9 627 820,00 € · JOUR 50 · Brûlant · « vous apprenez encore » · « presque prête » · « aucune n'est encore prête ») : identité **déclarée par corps de commit**, journal non joint | la ligne `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal du run, jointe au dossier |
| N4 | ~~Le chrome n'a aucun témoin~~ — **RÉTRACTÉ** : le canon est arrivé en cours de passe (voir le bandeau en tête) et le chrome a été mesuré. Reste non mesuré : le **débord du médaillon** sous le filet (au canon les fenêtres éclairées de l'art passent le critère de teinte chaude, jusqu'à y = 377 ; à la capture le dernier hit est le losange d'or — deux contaminations, aucun chiffre publiable) et le **remplissage de la jauge sous ARGENT** (ma plage fusionnait la barre et l'anneau : elle rendait 100 % des deux côtés alors que le canon montre une barre à moitié grise) | un canon rendu **sur fond neutre** (sans l'art de district), ou une sonde du médaillon bornée par le rect réel du composant |
| N5 | **Les 5 autres cadres du groupe (#74-#78) ne sont pas rendus** : M1, m9 et A2 sont jugés contre la **source CSS**, jamais contre une image ratifiée | rendre `#74`…`#78` avec `Tools/rendre-tel.py … 3.6` |
| N6 | **Onglet actif non asserté** et **chemin joueur non exercé** (surimpression par le test de planche) : un défaut d'arrivée par « Plus → CE QUE VOUS AVEZ CONFIÉ » est hors de portée de cette planche | une capture prise par une suite *sous shell* qui emprunte le menu |
| N7 | **SHA de l'arbre au rendu non imprimé** (« dernier commit » = commit du PNG) : je ne peux pas dater le code qui a produit l'image | `git rev-parse HEAD` imprimé au run et repris dans `captures-provenance.md` |
| N8 | **D'où viennent les sous-verdicts** (« vous apprenez encore », « presque prête ») : aucun rapport juge-données pour cet écran, et les corps de `corps-reels/` datent du 04/09 sur un autre compte | une passe `juge-donnees` sur le domaine délégation |
| N9 | **Comportement au-delà de 4 rangées** : la maquette pose `.sv-body{overflow:hidden}` et n'a jamais plus de 4 charges ; le cadre #78 en montre 6 grisées | une capture d'un compte à 2 charges confiées (cadre #75) et une du cadre #78 |
| N10 | **Le rythme du pied en l'absence de son filet** : je mesure l'absence, pas ce qu'un correctif y remettrait | — |

---

## Annexes

### 1. Inventaire de la référence (cadre #73, 1080 × 2102, ×3,6)

**Couche globale** (zone du panneau, y 434-2098) : palette `#102020` 23,9 % · `#101010` 20,1 % ·
`#101020` 19,6 % · `#201010` **13,4 %** (les brunes chaudes : jeton + geste) · `#202030` 11,7 %.
Luminance moyenne **37,24**, fond médian 28,91, **densité d'encre 8,69 %**.

| id | catégorie | bbox (px) | forme / remplissage | texte |
|---|---|---|---|---|
| `P0` | châssis `.tel` | 0..1079 × 0..2101 | bordure 1 CSS `#3a4356`, rayon 22 CSS | — |
| `P1` | bande d'art (châssis) | 4..1076 × 4..433 | photo district `brightness(.18)` — moyenne 9,9, σ 3,06 | barre évoquée : `Argent $ 24 850` · manomètre `tiède/HEAT` · `Jour 12 / Matin` |
| `P2` | tête | 434..606, filet bas 604..606 `#333c46` | aplat `#1b2027` | h3 sérif 700, cap **33 px**, `#eef3f9`, largeur 938 · p 7 CSS `#8d99a6`, largeur 826 |
| `P3` | jeton | 643..814 (h **172**), x 53..1026 | fond `#241c11`, bordure `#5a4a2a`, rayon 3 CSS | rond `#d9ab4e` 57×58 · titre or `#d9ab4e` **3 lignes** x 180..447 · indice `#9a8a6a` **1 ligne** x 574..989 (l 416) |
| `P4a-d` | 4 plaques | 851..986 · 1005..1140 · 1159..1293 · 1312..1447 (h **136/136/135/136**, écarts **19/19/19**) | **dégradé** `#242c34`→`#1b222a` (13 niveaux) + liseré interne `#ffffff0d` (3 px), bordure `#38434e`, rayon 2 CSS | `cro` `#46515c` 32×72 · `q b` sérif cap **24 px** `#eef3f9` · `q i` `#8d99a6` · `tenu b` **`#8fdfe4`** · `tenu i` `#8d99a6` (l 148) |
| `P5` | vide | 1447..1780 (**333 px**) | dégradé du panneau, σ 0,46 | — |
| `P6` | pied | 1780..2098 | **filet haut 7 px `#2c3640`**, fond `#141a21`, padding 9/13/15 CSS | phrase italique sérif `#cdd6e0`, 2 lignes, interligne **43 px**, membre emphasé **`#eef3f9`** x 458..873 |
| `P7` | geste | 1938..2042 (h **105**) | fond `#241c11`, bordure `#5a4a2a`, rayon 3 CSS | `EN CONFIER UNE` cap **25 px** `#d9ab4e` · indice `#9a8a6a` |

### 2. Inventaire de la capture (1080 × 2400)

**Couche globale** (zone du panneau, y 143-2152) : palette `#101020` 30,9 % · `#101010` 23,8 % ·
`#202020` 20,6 % · `#102020` 12,9 % · `#201000` **4,9 %** (brunes chaudes). Luminance moyenne
**35,60**, fond médian 28,19, **densité d'encre 6,57 %**.

| id | catégorie | bbox (px) | forme / remplissage | texte |
|---|---|---|---|---|
| `C0` | chrome bandeau | 0..142, filet braise 141..142 (93,45,39) | — | `←` · `ARGENT 9 627 820,00 €` · médaillon `Brûlant / CHALEUR` anneau braise (débord jusqu'à y≈198) · `JOUR 50` · `—` |
| `C1` | ornement | 478..601 × 180..231 | losange d'or | — |
| `C2` | tête | 143..397 (h **255**), filet bas 395..397 | aplat `#1b2027` (28,33,40) | h3 cap **33 px** l 937 · p l 827 |
| `C3` | jeton | 435..561 (h **127**), x 50..1029 | fond (34,28,13), bordure (90,73,42) | rond 57×57 · titre or **2 lignes** x 174..610 · indice **2 lignes** x 684..995 (l 312) |
| `C4a-d` | 4 plaques | 616..745 · 764..892 · 911..1040 · 1059..1188 (h **130/129/130/130**, écarts **19/19/19**) | **aplat (34,38,46)**, aucun liseré, bordure (56,66,77) | `cro` 32×72 · `q b` cap **24 px** · `tenu b` `#8fdfe4` · `tenu i` l 245 |
| `C5` | **rangée EN TROP** | 47..762 × 1232..1257 | — | `CE QUI N'EST PAS ENCORE À CONFIER ▶`, `#7e8b98`, cap 18 px |
| `C6` | vide | 1257..1857 (**600 px**) | σ 0,47 | — |
| `C7` | pied | ≈1857..2148 | **aucun filet** (Δ 5 niveaux), fond (22,28,34) | phrase 2 lignes, interligne **36 px**, membre emphasé en **graisse seule** |
| `C8` | geste **mort** | 1994..2097 (h **104**) | fond (28,22,22), bordure (73,59,59) | `EN CONFIER UNE` (139,106,106) · `aucune n'est encore prête` (120,94,94) |
| `C9` | chrome dock | ≈2148..2400 | 4 ronds vides | `EMPIRE` (souligné) · `FAMILLE` · `FILIÈRE` · `PLUS` |

### 3. Correspondance des repères

- **Échelle** : imposée par `dossier.md` — 1080 px = 300 CSS des deux côtés, **rapport 1,00**. Aucune
  mise à l'échelle appliquée : les px sont directement comparables sur le CONTENU.
- **Offset horizontal** : la référence est décalée de **+3 px** par la bordure 1 CSS du châssis
  `.tel` (mesuré : plaque réf x 53..1026 = 974 px ; jeu x 50..1029 = 980 px). Toute abscisse du
  temps 3 est lue à ce décalage près.
- **Offset vertical** : aucun offset global possible (les hauteurs d'écran diffèrent). J'ancre sur le
  **haut du panneau** : réf y = 434, jeu y = 143. Toute distance interne est mesurée depuis cet
  ancrage ou de bloc à bloc, jamais en pixel absolu.
- **Chrome** : le bandeau du jeu (143 px, filet braise mesuré) est à ×2,755 px/CSS-HUD, PAS à ×3,6 —
  il n'entre dans aucune comparaison de contenu.

### 4. Scripts

`mesures/00_profils.py` · `01_boites.py` · `02_bandes.py` · `03_encre.py` · `04_horizontal.py` ·
`05_couleurs.py` · `06_bordures_gradients.py` · `07_svbas_filet.py` · `08_lignes_texte.py` ·
`09_jeton_et_capitales.py` · `10_jeton_split.py` · `11_jeton_colonnes.py` ·
`12_teintes_et_texture.py` · `13_global.py` · `14_chrome_et_bas.py` · `15_dit_gras.py` ·
`16_rayons.py` · `17_recoupement.py` · `18_chrome_vs_canon.py` · `19_chrome_v2.py` · `20_chrome_v3.py` · `21_durcissement.py` · `22_appariement_source.py`
Crops : `crop_ref_jeton.png`, `crop_cap_jeton.png`, `crop_cap_ornement.png`, `crop_cap_titron.png`,
`crop_ref_bande_scene.png`, `crop_cap_bande_tete.png`.

Chacun **imprime la taille des images qu'il ouvre** et porte son contrôle positif (et négatif quand
l'enjeu le mérite). Trois pièges attrapés **par ces contrôles**, avant toute conclusion :

1. `04_horizontal.py` a d'abord rendu « largeur 1080 » pour **toute** ligne de la référence — son
   contrôle négatif (une ligne vide) rendait la même chose : le seuil attrapait la **bordure du
   châssis `.tel`**. Corrigé en excluant x < 10 et x ≥ 1070 ; le contrôle négatif passe alors.
2. `05_couleurs.py` a rendu des bordures fausses : une fenêtre médiane de **9 px de haut** sur une
   bordure de **3 px** mesure le fond. `06` refait toutes les bordures sur une bande de **1 px**.
3. `09` a d'abord donné un rond de **45 × 57 px** dans la capture — un **ovale**, que j'ai failli
   remonter. La fenêtre de mesure s'arrêtait à x = 128 et **tronquait le rond** : balayé sur la
   largeur entière (`11`), il fait **57 × 57**, un cercle. *Une mesure qui rend le résultat attendu
   est le moment de la durcir.*
4. `18_chrome_vs_canon.py` a mesuré **deux fois autre chose que ce qu'il nommait** : son « filet du
   bandeau » était le **soulignement de la valeur ARGENT**, et son « anneau du médaillon » était le
   **filet**, d'où un faux « médaillon 8,9 % trop grand ». C'est **son propre contrôle négatif** qui
   l'a dit : il exigeait deux couleurs de filet DIFFÉRENTES (laiton calme / braise chaud) et les
   deux sondes rendaient le même or, à 1/255 près. `19` puis `20` corrigent — et `20` conclut à
   **−0,2 CSS d'écart** sur la hauteur de bandeau.
5. Deux grandeurs de chrome ont été **retirées plutôt que publiées fausses** : le débord du
   médaillon (les fenêtres éclairées de l'art du canon passent le critère de teinte chaude) et le
   remplissage de la jauge ARGENT (la plage fusionnait la barre et l'anneau, 100 % des deux côtés).
   Elles sont en N4.
6. Les trois conclusions d'**absence** (m1, m5, m9) ont été **rejouées avec un critère qui ne
   suppose pas la forme attendue** (`21`, `22`) — un filet de n'importe quelle couleur, une
   emphase portée par la teinte plutôt que par la clarté, un comptage par cadre au lieu d'une
   lecture. Les trois tiennent, et leurs contrôles positifs sortent tous non nuls.

Recoupement obligatoire : les hauteurs de boîtes de `01` (détection de **bordure claire**) sont
refaites par `17` (détection de **fond de boîte**) — deux instruments indépendants, mêmes valeurs à
±3 px sur les 4 plaques, le jeton et le geste, des deux côtés.





### 5. Sorties collées (exécutées le 2026-09-07 sur les fichiers du dossier)

#### `mesures/01_boites.py`
```
=== REFERENCE : colonne x=70 (dans le padding gauche des boites) ===
[REF] reference-1080x2102.png 1080x2102  colonne x=70 bande y=[434,2102) seuil=55
   bord y=480..482 (ep=3px) lum_max=242.4
   bord y=510..512 (ep=3px) lum_max=242.4
   bord y=604..606 (ep=3px) lum_max=58.8
   bord y=643..645 (ep=3px) lum_max=75.1
   bord y=812..814 (ep=3px) lum_max=75.1
   bord y=851..853 (ep=3px) lum_max=65.5
   bord y=984..986 (ep=3px) lum_max=65.5
   bord y=1005..1007 (ep=3px) lum_max=65.5
   bord y=1138..1140 (ep=3px) lum_max=65.5
   bord y=1159..1161 (ep=3px) lum_max=65.5
   bord y=1291..1293 (ep=3px) lum_max=65.5
   bord y=1312..1314 (ep=3px) lum_max=65.5
   bord y=1445..1447 (ep=3px) lum_max=65.5
   bord y=1827..1832 (ep=6px) lum_max=212.8
   bord y=1839..1849 (ep=11px) lum_max=212.8
   bord y=1938..1940 (ep=3px) lum_max=75.1
   bord y=2040..2042 (ep=3px) lum_max=75.1

=== CONTROLE NEGATIF : colonne x=20 (hors sv-body, marge .serv6) ===
[REF-neg] reference-1080x2102.png 1080x2102  colonne x=20 bande y=[434,2102) seuil=55
   2 bord(s) trouve(s) -> attendu 0 ; [(604, 606, 58.8), (2070, 2073, 66.5)]

=== CAPTURE : colonne x=70 ===
[CAP] capture-1080x2400.png 1080x2400  colonne x=70 bande y=[150,2400) seuil=55
   bord y=280..284 (ep=5px) lum_max=242.4
   bord y=308..311 (ep=4px) lum_max=242.4
   bord y=346..359 (ep=14px) lum_max=151.4
   bord y=395..397 (ep=3px) lum_max=59.2
   bord y=435..437 (ep=3px) lum_max=74.4
   bord y=559..561 (ep=3px) lum_max=74.4
   bord y=616..619 (ep=4px) lum_max=64.7
   bord y=743..745 (ep=3px) lum_max=64.7
   bord y=764..766 (ep=3px) lum_max=64.7
   bord y=890..892 (ep=3px) lum_max=64.7
   bord y=911..914 (ep=4px) lum_max=64.7
   bord y=1038..1040 (ep=3px) lum_max=64.7
   bord y=1059..1061 (ep=3px) lum_max=64.7
   bord y=1185..1188 (ep=4px) lum_max=64.7
   bord y=1895..1896 (ep=2px) lum_max=133.2
   bord y=1902..1904 (ep=3px) lum_max=205.8
   bord y=1907..1909 (ep=3px) lum_max=209.0
   bord y=1916..1917 (ep=2px) lum_max=176.9
   bord y=1940..1946 (ep=7px) lum_max=212.8
   bord y=1951..1954 (ep=4px) lum_max=199.0
   bord y=1994..1996 (ep=3px) lum_max=62.0
   bord y=2094..2097 (ep=4px) lum_max=62.0

=== CAPTURE CONTROLE NEGATIF : colonne x=20 ===
[CAP-neg] capture-1080x2400.png 1080x2400  colonne x=20 bande y=[150,2400) seuil=55
   1 bord(s) ; [(395, 397, 59.2)]
```

#### `mesures/04_horizontal.py`
```
REF (1080, 2102)
CAP (1080, 2400)

--- REFERENCE ---
[REF] jeton bord haut            y= 644 : x=56..1023  largeur=968  (= 268.9 CSS)
[REF] plaque1 bord haut          y= 852 : x=53..1026  largeur=974  (= 270.6 CSS)
[REF] plaque2 bord haut          y=1006 : x=53..1026  largeur=974  (= 270.6 CSS)
[REF] plaque4 bord bas           y=1446 : x=53..1026  largeur=974  (= 270.6 CSS)
[REF] CTA bord haut              y=1939 : x=56..1023  largeur=968  (= 268.9 CSS)
[REF] sv-bas bord haut(2px)      y=1783 : x=10..1069  largeur=1060  (= 294.4 CSS)
[REF] sv-tete bord bas           y= 605 : x=10..1069  largeur=1060  (= 294.4 CSS)
CONTROLE NEGATIF:
[REF] ligne vide du panneau      y=1600 : AUCUN bord (seuil 58)

--- CAPTURE ---
[CAP] jeton bord haut            y= 436 : x=51..1028  largeur=978  (= 271.7 CSS)
[CAP] plaque1 bord haut          y= 617 : x=50..1029  largeur=980  (= 272.2 CSS)
[CAP] plaque2 bord haut          y= 765 : x=50..1029  largeur=980  (= 272.2 CSS)
[CAP] plaque4 bord bas           y=1187 : x=50..1029  largeur=980  (= 272.2 CSS)
[CAP] CTA bord haut              y=1995 : x=52..1027  largeur=976  (= 271.1 CSS)
[CAP] sv-tete bord bas           y= 396 : x=10..1069  largeur=1060  (= 294.4 CSS)
CONTROLE NEGATIF:
[CAP] ligne vide du panneau      y=1500 : AUCUN bord (seuil 58)
```

#### `mesures/06_bordures_gradients.py`
```
REF (1080, 2102) CAP (1080, 2400)

=== (a) BORDURES (bande 1px de haut, x=600..720, hors texte) ===
  plaque1 bord HAUT    REF #38434e (56, 67, 78)     CAP #38424d (56, 66, 77)     d(REF,CAP)=  1  CSS #38434e ecartREF=0
  plaque1 bord BAS     REF #38434e (56, 67, 78)     CAP #38424d (56, 66, 77)     d(REF,CAP)=  1  CSS #38434e ecartREF=0
  jeton bord HAUT      REF #5a4a2a (90, 74, 42)     CAP #5a492a (90, 73, 42)     d(REF,CAP)=  1  CSS #5a4a2a ecartREF=0
  sv-tete bord BAS     REF #333c46 (51, 60, 70)     CAP #313d47 (49, 61, 71)     d(REF,CAP)=  2  CSS #333c46 ecartREF=0
  sv-bas bord HAUT     REF #2c3640 (44, 54, 64)     CAP #161c22 (22, 28, 34)     d(REF,CAP)= 30  CSS #2c3640 ecartREF=0
  CTA bord HAUT        REF #5a4a2a (90, 74, 42)     CAP #493b3b (73, 59, 59)     d(REF,CAP)= 17

=== (b) PROFIL VERTICAL DANS LA PLAQUE 1 (x=600..720, hors texte) ===
  REF (haut 855 -> bas 982)                CAP (haut 621 -> bas 741)
   y=  855 #2f363e (47, 54, 62)          y=  621 #22262e (34, 38, 46)
   y=  870 #232b33 (35, 43, 51)          y=  636 #22262e (34, 38, 46)
   y=  886 #222a32 (34, 42, 50)          y=  651 #22262e (34, 38, 46)
   y=  902 #212931 (33, 41, 49)          y=  666 #22262e (34, 38, 46)
   y=  918 #20272f (32, 39, 47)          y=  681 #22262e (34, 38, 46)
   y=  934 #1f262e (31, 38, 46)          y=  696 #22262e (34, 38, 46)
   y=  950 #1e252d (30, 37, 45)          y=  711 #22262e (34, 38, 46)
   y=  966 #1c242c (28, 36, 44)          y=  726 #22262e (34, 38, 46)
   y=  982 #1b222a (27, 34, 42)          y=  741 #22262e (34, 38, 46)
  amplitude du degrade  REF: d(haut,bas)=13   CAP: d(haut,bas)=0

=== (b') PROFIL DANS LA BOITE CTA (x=760..860, entre libelle et small) ===
   REF y= 1943 #241c11      CAP y= 1999 #1c1616
   REF y= 1961 #241c11      CAP y= 2017 #1c1616
   REF y= 1980 #d38b2b      CAP y= 2036 #614a4a
   REF y= 1999 #893f14      CAP y= 2054 #5d4747
   REF y= 2018 #241c11      CAP y= 2073 #1c1616
   REF y= 2037 #241c11      CAP y= 2092 #1c1616

=== (c) FOND .serv6 : degrade 180deg #1d2229 -> #161a20 (58%) -> #121519 ===
      5%  REF y=  517 #1b2027   CAP y=  243 #1c2226
     25%  REF y=  850 #1a1f25   CAP y=  645 #22262e
     50%  REF y= 1266 #1d242c   CAP y= 1147 #22262e
     75%  REF y= 1682 #15181d   CAP y= 1649 #15191e
     95%  REF y= 2014 #241c11   CAP y= 2051 #1c1616

CONTROLE POSITIF bordure plaque1 REF vs #38434e : #38434e ecart 0
CONTROLE NEGATIF ligne 6px sous la bordure       : #242c34 ecart 26

=== (b'') SECOND CHEMIN : le meme profil de plaque sur d'AUTRES x et une AUTRE plaque ===
   (une conclusion tiree d'une seule fenetre est un seul chemin de mesure)
   --- x=460..560 ---
     REF plaque4 haut/bas : (36, 44, 52) / (28, 35, 43)
     CAP plaque4 haut/bas : (34, 38, 46) / (34, 38, 46)
   --- x=430..530 ---
     REF plaque4 haut/bas : (36, 44, 52) / (28, 35, 43)
     CAP plaque4 haut/bas : (34, 38, 46) / (34, 38, 46)
```

#### `mesures/07_svbas_filet.py`
```
--- cible #2c3640 (filet .sv-bas) ---
[REF (controle positif)] reference-1080x2102.png 1080x2102  cible=#2c3640 tol=12 bande y=[1400,2102)
   y=1780..1786 (ep=7px)  couleur=(44, 54, 64)
   y=1991..1991 (ep=1px)  couleur=(39, 45, 53)
[CAP] capture-1080x2400.png 1080x2400  cible=#2c3640 tol=12 bande y=[1200,2400)
   y=1240..1240 (ep=1px)  couleur=(41, 47, 53)

--- tolerance elargie a 20 sur la CAPTURE ---
[CAP tol20] capture-1080x2400.png 1080x2400  cible=#2c3640 tol=20 bande y=[1200,2400)
   y=1240..1240 (ep=1px)  couleur=(41, 47, 53)

--- CONTROLE NEGATIF cible #00ff00 ---
[REF neg] reference-1080x2102.png 1080x2102  cible=#00ff00 tol=12 bande y=[434,2102)
   AUCUNE ligne
[CAP neg] capture-1080x2400.png 1080x2400  cible=#00ff00 tol=12 bande y=[143,2400)
   AUCUNE ligne

--- ou commence exactement le fond .sv-bas (#141a21) dans la CAPTURE ? ---
   y=1780  (20, 24, 29)
   y=1784  (20, 24, 29)
   y=1788  (20, 24, 29)
   y=1792  (20, 24, 29)
   y=1796  (20, 24, 29)
   y=1800  (20, 24, 29)
   y=1804  (20, 24, 29)
   y=1808  (20, 24, 29)
   y=1812  (20, 24, 29)
   y=1816  (20, 24, 29)
   y=1820  (20, 24, 29)
   y=1824  (20, 24, 29)
   y=1828  (20, 24, 29)
   y=1832  (20, 24, 29)
   y=1836  (20, 24, 29)
   y=1840  (20, 24, 29)
   y=1844  (20, 24, 29)
   y=1848  (20, 24, 29)
   y=1852  (20, 24, 29)
   y=1856  (20, 24, 29)
   y=1860  (22, 28, 34)
   y=1864  (22, 28, 34)
   y=1868  (22, 28, 34)
   y=1872  (22, 28, 34)
   y=1876  (22, 28, 34)
   y=1880  (22, 28, 34)
   y=1884  (22, 28, 34)
   y=1888  (22, 28, 34)
   y=1892  (22, 28, 34)
   y=1896  (22, 28, 34)
   y=1900  (22, 28, 34)
   y=1904  (22, 28, 34)
   y=1908  (129, 135, 143)
   y=1912  (22, 28, 34)
   y=1916  (172, 180, 189)
```

#### `mesures/08_lignes_texte.py`
```
REF (1080, 2102) CAP (1080, 2400)

=== jeton : b (gras or) ===
  [REF] b  (fond lum=28.9)
      ligne y=677..702 (h= 26)  x=181..448 (l= 268)
      ligne y=711..746 (h= 36)  x=140..335 (l= 196)
      ligne y=751..780 (h= 30)  x=180..370 (l= 191)
  [CAP] b  (fond lum=28.2)
      ligne y=467..532 (h= 66)  x=120..599 (l= 480)
=== jeton : i (droite) ===
  [REF] i  (fond lum=28.9)
      ligne y=718..740 (h= 23)  x=573..990 (l= 418)
  [CAP] i  (fond lum=28.2)
      ligne y=474..497 (h= 24)  x=600..995 (l= 396)
      ligne y=502..519 (h= 18)  x=902..996 (l=  95)
=== jeton : rond seul ===
  [REF] rond  (fond lum=28.9)
      ligne y=700..757 (h= 58)  x=89..145 (l=  57)
  [CAP] rond  (fond lum=28.2)
      ligne y=470..526 (h= 57)  x=83..127 (l=  45)

=== sv-tete h3 + p ===
  [REF] h3+p  (fond lum=31.4)
      ligne y=477..520 (h= 44)  x=51..988 (l= 938)
      ligne y=541..567 (h= 27)  x=51..876 (l= 826)
  [CAP] h3+p  (fond lum=33.0)
      ligne y=277..321 (h= 45)  x=48..984 (l= 937)
      ligne y=340..365 (h= 26)  x=47..873 (l= 827)

=== plaque1 gauche (q) ===
  [REF] q  (fond lum=38.1)
      ligne y=885..911 (h= 27)  x=154..385 (l= 232)
      ligne y=928..951 (h= 24)  x=154..420 (l= 267)
  [CAP] q  (fond lum=37.7)
      ligne y=649..675 (h= 27)  x=149..379 (l= 231)
      ligne y=693..716 (h= 24)  x=149..414 (l= 266)
=== plaque1 droite (tenu) ===
  [REF] tenu  (fond lum=38.1)
      ligne y=895..911 (h= 17)  x=915..989 (l=  75)
      ligne y=928..945 (h= 18)  x=843..990 (l= 148)
  [CAP] tenu  (fond lum=37.7)
      ligne y=658..674 (h= 17)  x=922..995 (l=  74)
      ligne y=697..713 (h= 17)  x=751..995 (l= 245)

=== sv-dit ===
  [REF] dit  (fond lum=25.2)
      ligne y=1826..1856 (h= 31)  x=51..1027 (l= 977)
      ligne y=1869..1899 (h= 31)  x=51..616 (l= 566)
  [CAP] dit  (fond lum=27.2)
      ligne y=1894..1924 (h= 31)  x=48..1023 (l= 976)
      ligne y=1930..1960 (h= 31)  x=43..609 (l= 567)

=== CTA interieur ===
  [REF] cta  (fond lum=28.9)
      ligne y=1975..2002 (h= 28)  x=95..986 (l= 892)
  [CAP] cta  (fond lum=23.3)
      ligne y=2032..2058 (h= 27)  x=89..992 (l= 904)

=== titron EN TROP (capture seulement) ===
  [CAP] titron  (fond lum=26.6)
      ligne y=1232..1257 (h= 26)  x=47..762 (l= 716)
```

#### `mesures/09_jeton_et_capitales.py`
```
REF (1080, 2102) CAP (1080, 2400)

=== (a) JETON — runs clairs (lum>=90) sur la ligne mediane de la boite ===
  REF boite y=643..814 -> ligne y=728 ; CAP boite y=435..561 -> ligne y=498
   [REF] y=728 runs = [(89, 145, 57), (181, 191, 11), (200, 204, 5), (214, 219, 6), (228, 233, 6), (240, 244, 5), (249, 254, 6), (268, 273, 6), (282, 287, 6), (294, 298, 5), (304, 309, 6), (318, 335, 18), (574, 575, 2), (587, 588, 2), (596, 597, 2), (601, 603, 3), (610, 611, 2), (616, 617, 2), (624, 625, 2), (630, 640, 11), (645, 646, 2), (661, 662, 2), (670, 671, 2), (675, 677, 3), (684, 685, 2), (697, 699, 3), (706, 716, 11), (721, 722, 2), (730, 731, 2), (735, 736, 2), (743, 754, 12), (758, 760, 3), (767, 768, 2), (772, 773, 2), (781, 782, 2), (788, 789, 2), (796, 806, 11), (848, 850, 3), (857, 859, 3), (865, 872, 8), (877, 879, 3), (896, 898, 3), (902, 913, 12), (917, 919, 3), (936, 937, 2), (945, 946, 2), (950, 961, 12), (965, 966, 2), (973, 975, 3), (982, 985, 4)]
   [CAP] y=498 runs = [(83, 139, 57)]
  -> le 1er run est le ROND ; diametre horizontal :
   [REF] rond: x=89..145 (l=57)  y=700..757 (h=58)  ratio l/h=0.983
   [CAP] rond: x=83..139 (l=57)  y=470..526 (h=57)  ratio l/h=1.000
  CONTROLE NEGATIF (ligne hors rond, y = bord haut de boite +2) :
   [REF] y=646 runs clairs = []
   [CAP] y=439 runs clairs = []

=== (a') JETON — extremites de l'encre 'i' (gris chaud) et du 'b' (or) ===
   REF b(or) x: (96, 989)   CAP b(or) x: (84, 610)

=== (b) HAUTEURS DE CAPITALE (une lettre isolee, sans accent) ===
   h3 'C'           REF y=480..512 cap= 33px   CAP y=280..312 cap= 33px   delta= +0 (+0.0 %)
   plaque1 'L'      REF y=887..910 cap= 24px   CAP y=652..675 cap= 24px   delta= +0 (+0.0 %)
   CTA 'E'          REF y=1976..2000 cap= 25px   CAP y=2033..2056 cap= 24px   delta= -1 (-4.0 %)
   titron 'C' (CAP seul) y=1236..1253 cap=18px   (.sv-titron CSS 6,6px -> cap attendue ~17px)
```

#### `mesures/11_jeton_colonnes.py`
```
REF (1080, 2102) CAP (1080, 2400)

=== blocs de colonnes dans le JETON (creux minimal 18 px) ===
REF (boite x=53..1026, interieur y=650..808) :
   bloc x=89..145  (l=57)
   bloc x=180..447  (l=268)
   bloc x=574..989  (l=416)
CAP (boite x=50..1029, interieur y=442..556) :
   bloc x=83..139  (l=57)
   bloc x=174..610  (l=437)
   bloc x=684..995  (l=312)

CONTROLE NEGATIF : encre dans la bande y=647..660 (sous le bord haut)
   [REF] y=[647,660) pixels clairs = 0
   [CAP] y=[439,452) pixels clairs = 0

=== meme mesure sur la PLAQUE 1 (temoin: q a gauche, tenu a droite) ===
REF (y=860..980) :
   bloc x=89..120 (l=32)
   bloc x=154..420 (l=267)
   bloc x=843..989 (l=147)
CAP (y=624..738) :
   bloc x=83..114 (l=32)
   bloc x=149..414 (l=266)
   bloc x=751..995 (l=245)
```

#### `mesures/12_teintes_et_texture.py`
```
REF (1080, 2102) CAP (1080, 2400)

=== (a) COULEURS D'ENCRE (mediane du decile le plus clair du glyphe) ===
texte                                   REF  d(CSS)                  CAP  d(REF,CAP)
h3 titre               #eef3f9 (238, 243, 249)   0  #eef3f9 (238, 243, 249)      0   CSS #eef3f9
p sous-titre           #8d99a6 (141, 153, 166)   0  #8d99a6 (141, 153, 166)      0   CSS #8d99a6
jeton b (or)           #d9ab4e  (217, 171, 78)   0  #d9ab4d  (217, 171, 77)      1   CSS #d9ab4e
jeton i                #9a8a6a (154, 138, 106)   0  #9a8a6a (154, 138, 106)      0   CSS #9a8a6a
plaque q b             #eef3f9 (238, 243, 249)   0  #eef3f9 (238, 243, 249)      0   CSS #eef3f9
plaque q i             #8d99a6 (141, 153, 166)   0  #8d99a6 (141, 153, 166)      0   CSS #8d99a6
plaque tenu.vous b     #8fdfe4 (143, 223, 228)   0  #8fdfe4 (143, 223, 228)      0   CSS #8fdfe4
plaque tenu i          #8d99a6 (141, 153, 166)   0  #8d99a6 (141, 153, 166)      0   CSS #8d99a6
sv-dit italique        #eef3f9 (238, 243, 249)  33  #cdd6e0 (205, 214, 224)     33   CSS #cdd6e0

  CTA (etats DIFFERENTS : REF = .sv-geste actif ; CAP = .sv-geste.mort)
   libelle  REF #d9ab4e (217, 171, 78)  vs CSS actif #d9ab4e ecart=0
            CAP #8b6a6a (139, 106, 106)  vs CSS .mort #8b6a6a ecart=0
   small    REF #9a8a6a (154, 138, 106)  vs CSS actif #9a8a6a ecart=0
            CAP #785e5e (120, 94, 94)  vs CSS .mort #7a6060 ecart=2

  titron (CAP seul) #7e8b98 (126, 139, 152)  vs CSS .sv-titron #7e8b98 ecart=0

=== (b) TEXTURE de la bande HAUTE (ecart-type de luminance, pas de 2 px) ===
   REF bande scene (y 230..430)           moyenne=  9.15  sigma=  2.85  n=52000
   CAP bande tete  (y 150..270)           moyenne= 33.83  sigma= 11.23  n=31200
   REF fond panneau vide (temoin plat)    moyenne= 23.83  sigma=  0.46  n=35000
   CAP fond panneau vide (temoin plat)    moyenne= 25.07  sigma=  0.47  n=35000

=== (c) LISERE INTERNE de .sv-plaque (inset 0 1px 0 #ffffff0d) ===
   REF plaque1, lignes juste sous la bordure haute (851..853) :
     y=852 #38434e
     y=853 #38434e
     y=854 #2f363e
     y=855 #2f363e
     y=856 #2f363e
     y=857 #293038
     y=858 #242c34
     y=859 #242c34
     y=860 #242c34
     y=861 #242c34
   CAP plaque1, lignes juste sous la bordure haute (616..619) :
     y=617 #38424d
     y=618 #38424d
     y=619 #323b45
     y=620 #22262e
     y=621 #22262e
     y=622 #22262e
     y=623 #22262e
     y=624 #22262e
     y=625 #22262e
     y=626 #22262e
```

#### `mesures/13_global.py`
```
REF (1080, 2102) CAP (1080, 2400)

=== PALETTE (quantifiee a 32 niveaux/canal, top 6 par aire) ===
  [REF] zone 1064x1664, n=442624
     #102020   23.9 %
     #101010   20.1 %
     #101020   19.6 %
     #201010   13.4 %
     #202030   11.7 %
     #202020    1.5 %
  [CAP] zone 1072x2009, n=538680
     #101020   30.9 %
     #101010   23.8 %
     #202020   20.6 %
     #102020   12.9 %
     #201000    4.9 %
     #304040    1.2 %

=== LUMINANCE MOYENNE et DENSITE D'ENCRE (lum > fond+18) ===
  [REF] luminance moyenne= 37.24  fond median= 28.91  densite d'encre= 8.69 %
  [CAP] luminance moyenne= 35.60  fond median= 28.19  densite d'encre= 6.57 %

=== TEXTURE de la bande haute HORS medaillon (x 20..400) ===
   REF y=230..430 (art district)        moyenne=  9.91 sigma= 3.06
   CAP y=150..270 (tete du panneau)     moyenne= 32.62 sigma= 0.27
   REF temoin plat (panneau vide)       moyenne= 23.83 sigma= 0.46
   CAP temoin plat (panneau vide)       moyenne= 25.07 sigma= 0.47

=== CONTRASTES WCAG (encre mesuree / fond mesure) ===
texte                               REF      CAP
h3 titre / fond tete             14.68:1   14.51:1
p sous-titre / fond tete          5.64:1    5.58:1
plaque q b / plaque              13.20:1   13.59:1
plaque q i / plaque               5.08:1    5.23:1
tenu.vous b / plaque              9.71:1   10.00:1
jeton b / jeton                   7.91:1    7.97:1
jeton i / jeton                   4.98:1    5.01:1
sv-dit / sv-bas                  11.91:1   11.68:1
CTA libelle / CTA                 7.91:1    3.71:1
CTA small / CTA                   4.98:1    3.03:1
titron (CAP seul) / fond                -    5.12:1
```

#### `mesures/15_dit_gras.py`
```
REF (1080, 2102) CAP (1080, 2400)
  REF avant le gras (x 51..450)    encre=#cdd6e0 (205, 214, 224)  lum_max= 212.8   ecart/#eef3f9= 33  ecart/#cdd6e0=  0
  REF le GRAS      (x 460..870)    encre=#eef3f9 (238, 243, 249)  lum_max= 242.4   ecart/#eef3f9=  0  ecart/#cdd6e0= 33
  REF apres        (x 880..1027)   encre=#cdd6e0 (205, 214, 224)  lum_max= 212.8   ecart/#eef3f9= 33  ecart/#cdd6e0=  0
  CAP avant le gras (x 43..445)    encre=#cdd6e0 (205, 214, 224)  lum_max= 212.8   ecart/#eef3f9= 33  ecart/#cdd6e0=  0
  CAP le GRAS      (x 455..865)    encre=#cdd6e0 (205, 214, 224)  lum_max= 212.8   ecart/#eef3f9= 33  ecart/#cdd6e0=  0
  CAP apres        (x 875..1023)   encre=#cdd6e0 (205, 214, 224)  lum_max= 212.8   ecart/#eef3f9= 33  ecart/#cdd6e0=  0

  CONTROLE : REF courant vs REF gras -> ecart=33 (exige >20 pour que l'instrument discrimine)
  CAPTURE  : CAP courant vs CAP gras -> ecart=0

  densite d'encre du segment (part de pixels > fond+40), signe de la GRAISSE :
    REF avant le gras (x 51..450)    21.41 %
    REF le GRAS      (x 460..870)    29.46 %
    REF apres        (x 880..1027)   16.79 %
    CAP avant le gras (x 43..445)    24.89 %
    CAP le GRAS      (x 455..865)    31.20 %
    CAP apres        (x 875..1023)   19.87 %

=== localisation de l'encre a x=1033 dans la CAPTURE ===
   lignes concernees : [438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477] ...
   couleur a (1033,438) = #1b1f26
```

#### `mesures/16_rayons.py`
```
REF (1080, 2102) CAP (1080, 2400)
  REF plaque1 (radius CSS 2px=7,2px)   retraits = [2, 0, -1, -2, -2, -3, -3, -3, -3, -3, -3, -3, -3, -3]
      -> retrait nul a la ligne 1  (= rayon apparent en px)
  CAP plaque1                          retraits = [1, 0, -1, -2, -3, -4, -4, -4, -4, -4, -4, -4, -4, -4]
      -> retrait nul a la ligne 0  (= rayon apparent en px)
  REF jeton   (radius CSS 3px=10,8px)  retraits = [5, 2, 1, 0, -1, -1, -2, -2, -3, -3, -3, -3, -3, -3]
      -> retrait nul a la ligne 2  (= rayon apparent en px)
  CAP jeton                            retraits = [3, 1, 0, -1, -2, -2, -3, -3, -4, -4, -4, -4, -4, -4]
      -> retrait nul a la ligne 1  (= rayon apparent en px)
  REF CTA     (radius CSS 3px=10,8px)  retraits = [5, 3, 1, 0, -1, -1, -2, -2, -3, -3, -3, -3, -3, -3]
      -> retrait nul a la ligne 2  (= rayon apparent en px)
  CAP CTA                              retraits = [3, 1, 0, -1, -2, -2, -3, -4, -4, -4, -4, -4, -4, -4]
      -> retrait nul a la ligne 1  (= rayon apparent en px)

  CONTROLE NEGATIF (filet .sv-bas REF, pleine largeur, sans coin) :
     retraits = [-6, -6, -6, -6, -6, -6]
```

#### `mesures/17_recoupement.py`
```
--- PLAQUES : fond de plaque (REF degrade ~ (31,39,47) ; CAP aplat (34,38,46)) ---
[REF] reference-1080x2102.png 1080x2102  cible fond=(31, 39, 47) tol=9
   boite y=858..983  hauteur_interieure=126px  (+2 bordures = 133)
   boite y=1012..1137  hauteur_interieure=126px  (+2 bordures = 133)
   boite y=1166..1290  hauteur_interieure=125px  (+2 bordures = 132)
   boite y=1319..1444  hauteur_interieure=126px  (+2 bordures = 133)
[CAP] capture-1080x2400.png 1080x2400  cible fond=(34, 38, 46) tol=9
   boite y=620..741  hauteur_interieure=122px  (+2 bordures = 129)
   boite y=767..889  hauteur_interieure=123px  (+2 bordures = 130)
   boite y=915..1037  hauteur_interieure=123px  (+2 bordures = 130)
   boite y=1063..1184  hauteur_interieure=122px  (+2 bordures = 129)

--- JETON : fond #241c11 / #221c0d ---
[REF] reference-1080x2102.png 1080x2102  cible fond=(36, 28, 17) tol=8
   boite y=646..722  hauteur_interieure=77px  (+2 bordures = 84)
   boite y=735..811  hauteur_interieure=77px  (+2 bordures = 84)
[CAP] capture-1080x2400.png 1080x2400  cible fond=(34, 28, 13) tol=8
   boite y=438..558  hauteur_interieure=121px  (+2 bordures = 128)

--- CTA : REF #241c11 ; CAP #1c1616 ---
[REF] reference-1080x2102.png 1080x2102  cible fond=(36, 28, 17) tol=8
   boite y=1941..1984  hauteur_interieure=44px  (+2 bordures = 51)
   boite y=1998..2039  hauteur_interieure=42px  (+2 bordures = 49)
[CAP] capture-1080x2400.png 1080x2400  cible fond=(28, 22, 22) tol=8
   boite y=1997..2093  hauteur_interieure=97px  (+2 bordures = 104)

CONTROLE NEGATIF (cible = fond du panneau, dans la zone des plaques : la methode
  devrait alors marquer les INTERVALLES, pas les boites) :
[REF neg #00ff00] reference-1080x2102.png 1080x2102  cible fond=(0, 255, 0) tol=8
   (aucune boite listee ci-dessus = controle negatif OK)
```

#### `mesures/20_chrome_v3.py`
```
CANON (1176, 2091)   CAPTURE (1080, 2400)
CONTROLE POSITIF largeur : 392.0 / 392.0 CSS-HUD (392 attendu)

=== filet du bandeau (max de couverture teintee) ===
   [CANON  ] y=154  couverture=56 %  couleur=#b08d3e (176, 141, 62)
   [CAPTURE] y=141  couverture=75 %  couleur=#e06649 (224, 102, 73)
   bandeau : canon 51.3 CSS-HUD   capture 51.2 CSS-HUD   ecart=-0.2 CSS
   CONTROLE POSITIF etat : R-G canon=35 vs capture=122 -> ecart=87 (>40 exige)
   capture vs --braise (224,102,74) : d=1
   CONTROLE NEGATIF (400 px plus bas, couverture attendue < 20 %) :
   [CANON  ] y=575  couverture=4 %  couleur=#ff7005 (255, 112, 5)
   [CAPTURE] couverture=0 % — AUCUN pixel laiton/braise dans la bande

=== libelles du dock ===
   [CANON   y=2010..2060] 4 bloc(s) : [(227, 333, 107), (423, 544, 122), (628, 748, 121), (858, 927, 70)]
   [CAPTURE y=2320..2360] 4 bloc(s) : [(208, 309, 102), (390, 503, 114), (582, 686, 105), (789, 853, 65)]
   pas : canon [67.8, 68.2, 68.2] CSS-HUD | capture [68.2, 68.1, 67.9] CSS-HUD
   centre du groupe : canon 49.83 % | capture 50.00 % de la largeur
   1er libelle (bord gauche) : canon 19.30 % | capture 19.26 %
   CONTROLE NEGATIF (400 px plus haut) :
   [CANON  ] 1 bloc(s) : [(90, 399, 310)]
   [CAPTURE] 1 bloc(s) : [(44, 609, 566)]
```

#### `mesures/21_durcissement.py`
```
REF (1080, 2102) CAP (1080, 2400)

=== (A) une ligne pleine largeur plus claire que ses voisines, TOUTE couleur ===
   [REF  (controle positif : le filet doit sortir)] y=[1460,1935) sur x=[120,960) -> 9 ligne(s) : [(1781, 27.4, '#2c3640'), (1782, 27.4, '#2c3640'), (1783, 27.4, '#2c3640'), (1784, 27.4, '#2c3640'), (1785, 27.4, '#2c3640'), (1834, 70.8, '#426c9e'), (1835, 62.7, '#7a7272'), (1848, 55.1, '#6c6b78')] ...
   [CAP  (entre la derniere plaque et le CTA)] y=[1200,1990) sur x=[120,960) -> 4 ligne(s) : [(1902, 80.0, '#959ba3'), (1903, 36.6, '#888f96'), (1916, 83.5, '#979ea6'), (1917, 80.3, '#676c73')]

=== (B) l'emphase du sv-dit passe-t-elle par la TEINTE ? ===
   [REF courant ] encre=#cdd6e0 (205, 214, 224)  R-B= -19  R-G=  -9
   [REF GRAS    ] encre=#eef3f9 (238, 243, 249)  R-B= -11  R-G=  -5
   [CAP courant ] encre=#cdd6e0 (205, 214, 224)  R-B= -19  R-G=  -9
   [CAP GRAS    ] encre=#cdd6e0 (205, 214, 224)  R-B= -19  R-G=  -9
   ecart de teinte (R-B) : REF 8  |  CAP 0
   ecart RGB complet     : REF 33  |  CAP 0
   [CONTROLE + : 'vous' cyan de la capture] encre=#8fdfe4 (143, 223, 228)  R-B= -85  R-G= -80
   controle positif de teinte : 'vous' cyan vs texte de plaque -> R-B=-85 (tres negatif attendu)
```

#### `mesures/22_appariement_source.py`
```
source : /home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html — 6684 lignes
cadres trouves : 6 (6 attendus)

   #73 Tout est encore a vous           jeton = ACTIF         geste = actif
   #74 Confier l'approvisionnement      jeton = ACTIF         geste = actif
   #75 Deux charges confiees            jeton = ACTIF         geste = actif
   #76 Reprendre - ce que ca couterait  jeton = aucun         geste = actif
   #77 Deja tranche aujourd'hui         jeton = use (eteint)  geste = MORT
   #78 Les huit qui n'existent pas      jeton = aucun         geste = aucun

   'sv-titron' dans tout le groupe : 1 — uniquement dans #78 : 1
   "n'est pas encore" dans tout le groupe : 1 — uniquement dans le h3 de #78

CONTROLE POSITIF 'sv-plaque' = 23 (23 attendu, non nul)
CONTROLE NEGATIF 'sv-zzz'    = 0 (0 attendu)

=> AUCUN cadre n'apparie un jeton ACTIF a un geste MORT : 4 actifs+actif, 1 use+MORT, 1 sans.
```

