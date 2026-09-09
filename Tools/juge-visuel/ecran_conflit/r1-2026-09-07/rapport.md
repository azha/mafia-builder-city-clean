# Juge visuel ⊥ — ㉙ Le conflit (« la table du fond ») — r1 — 2026-09-07

> Juge à contexte vierge. Je n'ai ouvert ni `Assets/Scripts`, ni les notes d'implémentation, ni
> l'inventaire de dette, ni aucun rapport de juge. Aucune compilation, aucun run Unity, aucun Docker :
> `python3`+PIL, `grep`/`sed`, `fc-match`. Tous les chiffres de ce rapport sont produits par un script
> de `mesures/` ; ce qui n'a pas de script est écrit « estimé à l'œil » et classé en non vérifié.

## Verdict : NON APPROUVÉ

L'écran en jeu porte la LISTE des quatre familles de la maquette, mais pas l'écran de la maquette : le
plan sur la serviette et la bande d'action (réplique + « L'ENVOYER CE SOIR ») — **38,1 % du rect libre
de la référence** — n'existent pas, et le sépia/laiton qui fait l'identité de cet écran a été remplacé
par un bleu-gris **aussi froid que le dock de nuit** (indice R−B : **+20,23 → −11,19** sur la zone des
cartes).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

**Douze** jetons CSS de la référence sont retrouvés **au pixel** : c'est ce qui rend les écarts
ci-dessous opposables (un instrument qui ne retrouve pas ce qui est juste ne prouve rien de ce qui est faux).

| # | grandeur | référence / canon | capture | écart | script |
|---|---|---|---|---|---|
| 1 | largeur d'écran, échelle du contenu | 1080 px, ×3,6 | 1080 px, ×3,6 | rapport **1,00** — comparaison en px directe | dossier |
| 2 | hauteur du bandeau | 143 px prédits par le dossier | filet mesuré à y=141-142, bande 0..143 | **0 px** | `m6_chrome_gouttiere` |
| 3 | filet du bandeau sous `.tel.chaud` | `--braise` #e0664a (224,102,74) | (224,102,73) | **1/255** | `m7_chrome_chaud` |
| 4 | boîtier du médaillon sous `.tel.chaud` | `--braise` | (222,101,72) | **2/255** | `m8_medaillon_aile` |
| 5 | valeur ARGENT | `--or-vif` #f2c96b (242,201,107) | (242,201,106) | **1/255** | `m8_medaillon_aile` |
| 6 | libellé JOUR | `--creme-2` #b9ad92 (185,173,146) | (185,173,146) | **0/255** | `m8_medaillon_aile` |
| 7 | nombre, ordre et noms des familles | La Coil · Tarcum · Gorge-de-Fer · Saltline | idem, même ordre | **0** | vue `_vue_cap_familles` |
| 8 | lignes d'identité des familles | « les ferrailleurs de Spine », « le port, et ce qui y entre », « les docks du nord », « la ligne de sel, à l'est » | identiques au mot près | **0** | vue |
| 9 | hauteur de capitale du nom de famille (`T` de Tarcum) | 25 px | 24 px | **1 px** (tol. 1 px / 5 %) | `m5_typo` |
| 10 | largeur du bloc de contenu | 980 px (272,2 CSS) | 966 px (268,3 CSS) | **−1,4 %** de la largeur d'écran (tol. 1,5 %) | `m4_rects` |
| 11 | symétrie des gouttières | 50 / 50 px | 57 / 57 px | **0 px** d'asymétrie | `m4_rects` |
| 12 | hauteur d'une carte famille | 165 px | 169 px | **+2,4 %** (tol. 10 %) | `m11_structure` |
| 13 | gouttière respectée | — | 1ʳᵉ encre y=293 (bandeau 143), dernière y=1643 (dock 2160) | **aucun débordement** | `m6_chrome_gouttiere`,`m11_structure` |
| 14 | aplat des cartes | la CSS `.fam` demande une couleur **plate** (pas de dégradé) | plat : **0/255** d'écart sur 315×140 px | **conforme** | `m12_chaleur` ⚠️ le contrôle côté référence a été contaminé par le texte de la carte (102/255) : je n'affirme la platitude **que** sur la capture, la référence est établie par la CSS |
| 15 | contraste des textes (doctrine ≥ 4,5:1) | — | de **6,47:1** à **17,12:1**, 10/10 textes conformes | **conforme** | `m10_contraste` |
| 16 | langue | fr | fr partout ; « CHALEUR » là où le canon dit « HEAT » — **le client a raison** | conforme | vues |
| 17 | jetons CSS de la référence retrouvés au pixel | `#241c14`,`#2e2114`,`#20180f`,`#f2ece0`,`#141a21`,`#3d3024`,`#efe6d4`,`#8a7f6b`,`#d9ab4e`,`#f0dfc4`,`#ddd3c0`,`#cbbfa4` | — | **Δ ≤ 3/255** sur les **12** | `m2_couleurs`,`m3_fond_bords`,`m10_contraste`,`m18_details` |
| 18 | maquette de cet écran = sans animation | bloc `.cfl6` (5 729 o, l. 5359-5439) : 0 `animation`, 0 `@keyframes`, 0 `transition` | — | contrôle positif : 58 `cfl6` dans le bloc, 593 `animation` / 315 `@keyframes` dans le fichier entier | `grep` scopé |

Contrôles négatifs qui ont bien rendu « rien » : bande vide de la capture (`m5_typo`, `m10_contraste`,
`m11_structure`), gouttière entre deux cartes (`m4_rects`), zone hors cadran de la capture
(`m15_cadran_remplissage`, 0,0 %), aucun anneau à gauche de x=180 (`m18_details`), carte visée ≠ carte
normale (`m2_couleurs`). ⚠️ Un contrôle négatif **a échoué** — le même `m15_cadran_remplissage` a rendu
**27,9 %** sur l'art du district du canon — et **j'ai écarté l'instrument plutôt que sa conclusion** :
voir §6, point 5.

---

## 0. L'écran, tel que la maquette le dit

*(écrit sur la référence SEULE, avant d'ouvrir la capture ; `front.md` ne fournit aucune puce « Montre »)*

**Le but.** C'est un écran de **décision**, pas de consultation : on choisit une famille rivale, on
choisit un homme, et on l'envoie ce soir. La maquette le dit en toutes lettres dans le titre de
l'écran — « Le coup de ce soir » — et dans son sous-titre : « On choisit une famille, on choisit un
homme, et on l'envoie. On saura demain. » Tout ce qui est dessiné sert cette phrase.

**L'ordre de lecture.** (1) La **serviette crème** : un rectangle clair de 326 px de haut posé au tiers
haut, seul aplat lumineux d'un écran sombre (242,236,224 sur un fond à 28-42 ⇒ 13,4:1). L'œil y tombe
avant tout le reste, et il y lit la phrase du plan. (2) Le **titre**, juste au-dessus, en sérif crème
sur sa propre bande. (3) La **liste des quatre familles**, quatre cartes identiques au rythme régulier.
(4) Le **bouton or** en bas — « L'ENVOYER CE SOIR », avec sa mise en garde « on ne pourra plus le
rappeler » — qui ferme la page comme un point final.

**Les zones.** Une bande d'en-tête close par un filet (le titre + la promesse) · un corps qui porte le
plan puis la liste · une bande basse détachée (fond plus froid, filet de 2 CSS) qui contient la voix du
lieutenant et le geste.

**Les traits d'identité** — ce qui fait qu'on reconnaît *cet* écran :
1. **Le sépia et le laiton.** Tout le contenu est brun chaud (indice R−B = +15,3 ; +20,2 sur les cartes)
   sur un dégradé qui s'assombrit du haut vers le bas. C'est une pièce éclairée à l'ampoule, pas un
   tableau de bord.
2. **La serviette.** Un plan ne se remplit pas dans un formulaire, il se griffonne sur une serviette au
   bar : c'est le seul objet clair, et c'est le sujet.
3. **L'écu.** Chaque famille porte un petit blason (26×30 CSS, coins bas arrondis, initiale en sérif
   laiton) — c'est ce qui fait d'une ligne de liste une **maison**.
4. **La carte à trois colonnes** : écu · nom + ce qu'ils sont · ce qu'on a vécu avec eux, aligné à droite
   et volontairement **pâle** (« jamais » à 2,86:1, la plus faible encre de l'écran — la maquette dit
   « les quatre auréoles sont dessinées pâles »).
5. **Le geste or, en bas, irréversible.**

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Un joueur qui ouvre cet écran voit, dans l'ordre : un gros titre blanc « **Le conflit** » (le NOM
de l'écran, pas ce qu'on y fait), une phrase qui annonce un **rapport** et non une décision, une mention
qui lui apprend qu'« **aucune route** » ne renseigne les familles, quatre pavés gris identiques, un
message qui lui dit qu'il lui **manque un homme**, puis **un cinquième de l'écran vide et noir**. Il ne
lui est jamais proposé de faire quoi que ce soit.

Les trois masses qui portaient la lecture de la maquette ont disparu ou changé de nature. La **serviette**
(19,6 % du rect libre, l'unique aplat clair) n'existe pas : l'écran n'a plus de sujet visuel, et la
première chose vue est devenue le titre par défaut. Le **bouton or** (dans la bande basse, 18,5 % du rect
libre) n'existe pas : il n'y a plus de point final, la page s'arrête en tombant dans le noir à **74,4 %**
du rect libre au lieu de 96,7 %. Et la **couleur** a changé de camp : la référence est chaude partout
(+15,3 / +20,2), la capture est froide partout (−4,0 / −11,2), exactement aussi froide que le dock de
nuit du canon (−10,1) — alors que le chrome de la **même capture** porte l'or-vif (Δ1), la braise
(Δ1 et Δ2), la crème (Δ0) et la crème-2 (Δ0) au pixel près. Les jetons chauds sont disponibles ; le contenu ne les emploie pas.

Ce qui **tient** : les quatre familles sont là, dans le bon ordre, avec leurs libellés d'identité au mot
près ; la mise en page respecte la gouttière (rien sous le bandeau, rien sous le dock) ; les gouttières
sont symétriques ; la largeur du bloc de contenu est à 1,4 % de celle de la maquette ; les contrastes
sont tous au-dessus de la doctrine ; et le **sens de l'état vide** est bon — « il vous en manque un — ce
n'est pas cassé, vous n'en avez tout simplement pas encore » plafonne et bloque sans faire croire à une
perte, ce que la maquette d'état vide (une table du fond, deux chaises libres sous la lampe) demandait.

**Les trois écarts de tête, par impact perçu** : (1) le plan sur la serviette absent ⇒ l'écran n'a plus
de sujet ; (2) l'absence de toute action ⇒ l'écran change de but, de « décider » à « lire » ; (3) la
bascule de la palette du sépia au bleu-gris ⇒ l'écran ne se reconnaît plus comme celui-là.

---

## 3. Écarts

Un finding par ligne. `dépend des données` distingue ce qu'un autre compte ferait bouger de ce qui est
vrai quelles que soient les données. La colonne `critère` vaut `NOUVEAU` partout : **premier tour**.

*(dans la colonne `mesure`, un nom en `police fixe` finissant par un mot — `m5_typo`, `m11_structure`… — renvoie au script `mesures/<nom>.py` ; à ne pas confondre avec les identifiants de findings `m1`…`m8`.)*

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | partiellement | Le bloc `.ordre` — la **serviette crème** : portrait, phrase du plan (« On envoie *Lt. Kest* chez *La Coil*, sur *l'entrepôt de Dépôt-Est* »), et « ce qu'on prend si ça marche » — est **absent**. L'écran perd son sujet et son premier arrêt de l'œil. | Réf. : y 677..1003 = **326 px = 19,6 %** du rect libre ; aplat (242,236,224) = jeton `#f2ece0` exact ; contraste 13,4:1 sur le fond. Capture : la classe la plus claire de la palette quantifiée du rect libre est **(90,95,99) à 5,3 %** — aucun aplat clair. `m2_couleurs`,`m9_palette`,`m17_normalisation` | Si l'absence est intégralement commandée par « aucun lieutenant éligible » : le cadre #61 de la même maquette (état de refus) **conserve** `.ordre`, donc la maquette ne l'efface pas quand ça bloque — mais #61 n'est pas rendu, je le lis en SOURCE. |
| `B2` | BLOQUANT | NOUVEAU | partiellement | La bande `.bas` — réplique du lieutenant (`.dit`) **et** CTA `.geste` « L'ENVOYER CE SOIR / on ne pourra plus le rappeler » — est **absente**. L'écran ne porte **aucune** action. | Réf. : y 1790..2098 = **308 px = 18,5 %** du rect libre ; fond (20,26,33) = `#141a21` exact, filet haut 2 CSS ; encre du CTA (217,171,78) = `#d9ab4e` exact, 7,91:1. Capture : de y=1643 à y=2160, **517 px** uniformes à (13,13,13) (18 échantillons à y=1900, tous identiques). `m2_couleurs`,`m6_chrome_gouttiere`,`m11_structure` | La **bande** elle-même (surface + filet) est une forme, pas une donnée ; le contenu du bouton dépend de l'état. Je ne peux pas voir si un bouton désactivé existe hors champ. |
| `M1` | MAJEUR | NOUVEAU | non | **Palette** : le contenu perd toute teinte chaude. Le sépia/laiton devient un bleu-gris. Ce n'est pas une divergence de DIRECTION (les deux sont nocturnes) : ce sont les jetons chauds qui ne sont pas employés. | Indice R−B moyen : réf. `.cfl6` **+15,32**, zone des 4 cartes **+20,23**. Capture : rect libre **−3,96**, zone des 4 cartes **−11,19** — soit aussi froid que le dock de nuit du canon (**−10,10**). Aucune des 8 classes de la palette quantifiée de la capture n'a R > B. Les jetons chauds sont pourtant présents dans le chrome de la **même** capture (or-vif Δ1, braise Δ1, crème Δ0). `m9_palette`,`m12_chaleur` | — |
| `M2` | MAJEUR | NOUVEAU | non | **Matière du fond** : le dégradé chaud (`#2a1e14` → `#1d1610` 46 % → `#141014`) est remplacé par un **aplat neutre**. | Réf., gouttière gauche y=440→1700 : (32,24,15) → (24,18,18), **amplitude 15/765** sur 8 bandes. Capture, y=150→2130 : **(13,13,13) constant, amplitude 0/765** sur 12 bandes. `m3_fond_bords`,`m12_chaleur` | — |
| `M3` | MAJEUR | NOUVEAU | non | La bande d'en-tête `.entete` est **absente** : titre et sous-titre flottent sur le fond au lieu d'occuper une surface propre close par un filet. | Réf. : y 434..637 = (32,24,15) = `#20180f` exact ; filet y 638..640 = (61,48,36) = `#3d3024` exact (3 px = 1 CSS) ; bande de **207 px = 57,5 CSS**. Capture : (13,13,13) sans une seule rupture de y=144 à y=666 hors glyphes. `m16_entete` | — |
| `M4` | MAJEUR | NOUVEAU | non | L'**écu** (blason à initiale) est **absent des 4 cartes** — le trait qui fait d'une ligne de liste une maison. | Réf. : 26×30 CSS = 93,6×108 px, à x 86..180, fond `#3a2d20`, bord `#574433`, initiale 11 CSS sérif `#c9a86a`. Capture : bande x 57..92 × y 866..1015 (**35×149 px**) uniforme à **0/255** ; le texte démarre à x=93, soit 36 px de simple retrait. `m11_structure` | — |
| `M5` | MAJEUR | NOUVEAU | non | La carte passe de **3 colonnes à 1** : la colonne `hist` alignée à droite (« jamais » + « on ne les a pas croisés ») devient une 3ᵉ ligne alignée à gauche. | Réf. : `hist` à x 881..1029, aligné à droite. Capture : ligne 3 à x 95..412, alignée à gauche comme les deux autres. `m5_typo`,`m10_contraste` | — |
| `M6` | MAJEUR | NOUVEAU | non | **Hiérarchie interne de la carte aplatie** : la ligne d'historique est rendue aussi forte que le nom de famille, alors que la maquette la fait la plus pâle des trois. | Contrastes sur fond de carte — réf. **13,54 / 4,26 / 2,86** (rapport fort:faible = **4,7×**) ; capture **8,70 / 8,08 / 8,70** (rapport **1,08×**). `m10_contraste` | — |
| `M7` | MAJEUR | NOUVEAU | non | **Sérif → sans-sérif** sur le titre d'écran et sur les 4 noms de famille. Ce n'est **pas** un arbitrage de substitution : la source nomme `'DejaVu Serif'`, `fc-match "DejaVu Serif"` rend `DejaVuSerif.ttf`, et le client embarque DejaVu Serif. | `.cfl6 .entete h3` et `.cfl6 .fam .id b` = `700 … 'DejaVu Serif'`. Chasse de « Tarcum » : **145 px à 25 px de capitale** (réf., sérif) contre **157 px à 24 px** (capture) — **+8,3 % de chasse pour −4 % de capitale**, signature d'un changement de famille. `m5_typo`, `fc-match`, vues `_vue_*_tarcum` | — |
| `M8` | MAJEUR | NOUVEAU | non | Les cartes n'ont **ni filet ni arrondi**. | Réf. : filet de **3 px** (61,48,36) = `#3d3024` exact sur les bords gauche **et** haut ; rayon mesuré **~10 px** (3 CSS) par croissance de largeur sur 9 lignes (966→980). Capture : passage direct (13,13,13) → (34,42,46), **0 px** de filet ; largeur pleine dès la 1ʳᵉ ligne ⇒ **rayon 0**. `m3_fond_bords`,`m4_rects` | — |
| `M9` | MAJEUR | NOUVEAU | partiellement | **Vide terminal de 517 px** non ancré sous le dernier texte : l'écran se lit comme inachevé. | Dernier pixel d'encre à y=1643 = **74,4 %** du rect libre ; dock à 2160. **517 px = 143,6 CSS = 21,5 %** de la hauteur d'écran = **25,6 %** du rect libre. Réf. : **3,3 %**. `m11_structure`,`m17_normalisation` | Cause commune avec `B2` — c'est la place que la bande basse occupait. |
| `M10` | MAJEUR | NOUVEAU | non | Le **titre d'écran ne dit plus ce qu'on vient y faire** : la maquette met un verbe d'action, la capture met le nom de l'écran ; le sous-titre change de promesse dans le même sens. | Réf. : « Le coup de ce soir » + « On choisit une famille, on choisit un homme, et on l'envoie. On saura demain. » Capture : « Le conflit » + « Ce que vos hommes rapportent des familles rivales, et qui vous reste pour y retourner. » Vues `_vue_ref_titre_zoom`, `_vue_cap_soustitre` | Si « Le conflit » est imposé par une table de titres d'écran partagée : je ne peux pas le voir depuis l'image. |
| `M11` | MAJEUR | NOUVEAU | non | Une **mention de fabrication atteint le joueur** sur l'écran nominal : « Dessinées, pas renseignées : aucune route ne dit ce qu'elles préparent ni ce qu'elles possèdent. » C'est le 3ᵉ bloc lu, avant les cartes. | 2 lignes, encre (184,194,204), contraste **10,76:1**, bbox (60,585)-(1017,638). Le cadre nominal #59 ne porte **rien** de tel ; le mot « route » n'existe dans la maquette que dans le cadre **#64**, un cadre dédié (« Ce qu'on ne peut pas faire »). `m10_contraste`, source #59/#64 | Si l'auteur assume ce ton sur l'écran nominal, c'est un arbitrage user, pas un défaut : je le signale, je ne le tranche pas (voir table ARBITRAGE, `A5`). |
| `M12` | MAJEUR | NOUVEAU | non | **Chrome partagé** : 2 des 4 règles `.tel.chaud` du canon HUD ne sont pas appliquées. | `.heatpct` (« Brûlant ») mesuré **(234,224,200) = `--creme`** au lieu de `--braise` (224,102,74) ⇒ **d = 126/255** ; `.aile.droite .val` (le tiret) **idem**. Les 2 autres sont exactes : filet (224,102,73) **d=1**, boîtier (222,101,72) **d=2**. `m7_chrome_chaud`,`m8_medaillon_aile` | Destinataire : le shell, pas cet écran. Je n'ai pas vérifié les autres écrans. |
| `m1` | MINEUR | NOUVEAU | non | Hauteur de capitale du **titre d'écran +44 %**. | 32 px → **46 px** (8,9 → 12,8 CSS). `m5_typo` | Si c'est un agrandissement délibéré (ruling lisibilité), `m1`-`m3` tombent — voir `A6`. |
| `m2` | MINEUR | NOUVEAU | non | Hauteur des **titrons +27 %**. | 22 px → **28 px** (les deux chaînes contiennent un `Q`, donc mesurées au même repère : bbox avec descendante). `m5_typo` | idem `A6`. |
| `m3` | MINEUR | NOUVEAU | non | Chasse de la **ligne d'identité de famille +25 %**. | « le port, et ce qui y entre » : **277 px → 346 px**, même chaîne, même police (DejaVu Sans des deux côtés) ⇒ 6,4 → ~8,0 CSS. `m5_typo` | idem `A6`. |
| `m4` | MINEUR | NOUVEAU | non | **Écart entre cartes +22 %** (tolérance 10 %). | 18 px (5 CSS, = `margin-bottom:5px` de `.fam`) → **22 px** (6,1 CSS). `m11_structure` | — |
| `m5` | MINEUR | NOUVEAU | non | Largeur du bloc de contenu **−1,4 %** et gouttière **+7 px**. | 980 px (272,2 CSS, x 50..1029) → 966 px (268,3 CSS, x 57..1022). Symétrique des deux côtés. `m4_rects` | — |
| `m6` | MINEUR | NOUVEAU | oui | Copie de l'historique changée et **mot d'accroche perdu** : « **jamais** / on ne les a pas croisés » → « on n'y est jamais allés » (une seule ligne, plus de gras). | Réf. `.hist b` = « jamais » en gras `#6f6350` + `.hist i` en dessous ; capture : une ligne unique. Vues `_vue_ref_familles`, `_vue_cap_carte1` | — |
| `m7` | MINEUR | NOUVEAU | oui | Deux accrocs de copie dans le message d'état vide : « **G**ros bras » porte une capitale en milieu de phrase (libellé d'archétype inséré tel quel), et « C'est **lui** qui part la nuit » n'a pas d'antécédent (la phrase précédente est négative). | Texte lu : « Aucun de vos lieutenants n'est du genre Gros bras. / C'est lui qui part la nuit. Il vous en manque un — ce n'est pas cassé, vous n'en avez tout simplement pas encore. » Vue `_vue_cap_quipart` | D'où vient « Gros bras » (jeton i18n ou libellé projeté) : aucun rapport juge-données n'existe pour cet écran. |
| `m8` | MINEUR | NOUVEAU | oui | **Chrome partagé** : la valeur ARGENT **touche** l'anneau du médaillon. | Dernier pixel d'encre or de la valeur à **x = 446** ; frange de l'anneau à **x = 447** (**1 px**), plein de l'anneau à x = 453 (**7 px = 2,5 CSS-HUD**), mesuré sur la bande des glyphes y 60..105. `m18_details` | Dépend de la longueur du montant : « 9 627 820,00 € » est une valeur non vérifiée (§6 point 4). Un montant plus court ne toucherait pas. Destinataire : le shell. |

**Compte : 2 BLOQUANT · 12 MAJEUR · 8 MINEUR = 22 findings.**

### Table ASSUMÉ *(jamais comptée avec les findings)*

| id | ce qu'on voit | pourquoi c'est assumé | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|
| `S1` | Phase de l'aile droite à « — » | État VOULU hors district (doctrine du dossier, mesuré par f2 le 06/09) ; ARGENT et JOUR sont alimentés | Un tiret alors qu'on EST en district ; ou ARGENT/JOUR eux aussi à « — » (⇒ chrome non alimenté, on ne juge plus le chrome) |
| `S2` | Bandeau plus court que celui du cadre de série 6 | Chrome partagé à ×2,755 (392 CSS-HUD) contre une **évocation** dessinée à ×3,6 dans le cadre | Une hauteur qui ne vaut plus 52 CSS-HUD (mesurée ici : 143 px = 51,9 CSS ✓) |
| `S3` | L'illustration d'état vide (`vide-conflit.png`, la table du fond) n'est nulle part à l'écran | Elle n'est montée dans **aucun** écran du client (dossier) : c'est un montage qui n'existe pas encore, pas un écart | Le jour où le montage existe ailleurs et pas ici |
| `S4` | Aucune famille en `.visee` (pas de bord or, pas de tag « CE SOIR ») | Dépend des données : aucun lieutenant éligible ⇒ aucun ordre composable ⇒ aucune cible désignée | Une capture où un ordre EST composable et où la cible reste sans marque |
| `S5` | Le sens de l'état vide de « QUI PART CE SOIR » | **Conforme, et je le salue** : il dit ce qui manque (« il vous en manque un ») et que rien n'est perdu (« ce n'est pas cassé ») — exactement le « ça plafonne et ça bloque » demandé | Un vide qui s'excuserait, parlerait du serveur, ou laisserait croire à une perte. ⚠️ il ne dit pas **comment** obtenir un Gros bras — la doctrine demande « ce qui manque **et** comment l'obtenir » |

### Table ARBITRAGE *(jamais comptée avec les findings)*

| id | ce qu'on voit | pourquoi ce n'est pas un défaut d'écran | destinataire |
|---|---|---|---|
| `A1` | Ronds du dock **vides**, aucune icône | Arbitrage user connu (« j'aime pas les icônes ») | — |
| `A2` | Flèche retour dans le bandeau | Arbitrage user connu | — |
| `A3` | Losange or sous le médaillon | Canonique (CSS du canon) | — |
| `A4` | Dock : 3ᵉ onglet « **FILIÈRE** » là où le canon HUD dit « **MARCHÉ** » | Chrome partagé, divergence de **nommage**, hors périmètre de cet écran ; je ne sais pas lequel des deux est en retard | user / shell |
| `A5` | Le ton « ce n'est pas branché » adressé au joueur (`M11`) | La maquette **l'autorise** dans son cadre #64 (« Ce qu'on ne peut pas faire », avec le compte exact des routes) — mais pas dans le cadre nominal #59. C'est une décision de voix, pas une erreur de rendu | user |
| `A6` | Corps de texte général **+25 à +44 %** (`m1`-`m3`) | Possiblement la réponse au ruling « je comprends pas les écrans » : tous les contrastes sont bons et rien n'est coupé. Si c'est délibéré, `m1`-`m3` tombent | user |
| `A7` | La référence dit « HEAT » dans le manomètre de son **évocation** de chrome | Maquette en retard sur le ruling « fr réel » — le client dit « CHALEUR » et a raison. À noter **une fois**, jamais comme écart | blender |
| `A8` | Le portrait du plan est un `#buste-homburg` (chapeau) | Ruling DA 2026-09-02 : plus de chapeaux 1950. La référence est en retard. Sans objet ici puisque le bloc `.ordre` est absent (`B1`) | blender |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, `capture-1080x2400.png` (1080×2400, 20:9) — le
dénominateur de la ligne GO le dit : « (a) deux résolutions 1920+2400 → **NON — 2400 seulement** ».
La 1920 est **absente**, pas défaillante : je n'ai rien mesuré à son sujet et je ne déduis rien.
⇒ **Tout ce rapport porte sur une seule résolution.** Ce qu'une seconde résolution trancherait :
si le vide terminal de 517 px (`M9`) grandit, se maintient ou se referme quand la hauteur change ;
si le bloc de contenu à 89,4 % de la largeur tient ; si la mention de `M11`, qui court jusqu'à 63 px
du bord droit, revient à la ligne ou se coupe.

---

## 6. Ce que je n'ai pas pu vérifier

1. **La seconde résolution (1920).** Absente du dossier. Mesure qui trancherait : la capture 1920×1080
   par la même chaîne.
2. **L'absence d'animation, côté client.** Aucune paire T / T+1 s n'est fournie ⇒ **non prouvée sur la
   capture**. ✅ Ce que j'ai pu établir, côté **maquette** : le bloc CSS de cet écran (`.cfl6`, 5 729
   octets, lignes 5359-5439 de `ecrans-brennar-6.html`) contient **0 `animation`, 0 `@keyframes`,
   0 `transition`** — contrôle positif : 58 occurrences de `cfl6` dans le bloc (c'est bien le bon
   bloc), et 593 `animation` / 315 `@keyframes` dans le fichier entier (un zéro y est donc
   significatif). Le bloc de gel des écrans neufs ne cite que `.serre6`, `.ecrin6`, `.labo6` — pas
   `.cfl6`, et il n'en a pas besoin. ⇒ **La référence n'embarque aucun artefact d'animation figé** :
   pas d'arbitrage blender de ce côté. Mesure qui trancherait côté client : deux captures du même état
   à T et T+1 s.
3. **L'onglet actif.** Le dock souligne **EMPIRE** alors que le chemin déclaré est « Plus → LE CONFLIT ».
   La capture est une **surimpression** : le chemin joueur n'est pas exercé, et le dossier le déclare
   non asserté. Je ne classe donc pas ça en écart. Mesure qui trancherait : une capture prise par le
   chemin joueur, ou une ligne de journal nommant l'onglet actif.
4. **Toutes les VALEURS de la capture.** L'identité du compte est **déclarée par corps de commit**,
   journal non joint ⇒ 9 627 820,00 € · JOUR 50 · Brûlant · 4 familles jamais croisées · 0 lieutenant
   « Gros bras » sont **non vérifiés**. Mesure qui trancherait : la ligne
   `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal du run.
   ⇒ Tout ce rapport juge la **FORME**.
5. **La forme du cadran du manomètre.** À l'agrandissement ×6, la capture montre **deux secteurs
   colorés qui se rejoignent en pointe avec une encoche sombre au sommet**, là où le canon montre
   **trois segments d'arc séparés** (teal · gris neutre · rouge) avec des jours entre eux.
   **Je n'ai pas su le chiffrer** : trois sondes successives ont échoué, et je les rapporte plutôt que
   de garder la conclusion. (a) rayon par angle autour d'un pivot estimé : bruit 5,94 contre 3,32 —
   ne discrimine pas ; (b) résidu à une droite ajustée sur le flanc montant : **10,00 px** sur la
   capture contre **4,48 px** sur le canon — le contrôle positif est **contaminé** par l'apex plat
   (le sommet d'un arc est presque droit en son milieu) ; (c) taux de remplissage coloré :
   **13,6 % (canon) contre 12,7 % (capture)** — **équivalents**, ce qui **réfute** l'hypothèse d'un
   secteur plein : c'est bien un trait, mais sa mise en segments diffère. Le contrôle négatif de (c) a
   rendu 27,9 % sur l'art du district ⇒ sonde non fiable hors du médaillon. ⇒ **constaté à l'œil,
   NON chiffré.** Mesure qui trancherait, hors image : le SVG du cadran du canon confronté à la
   géométrie du composant du shell.
6. **Le cadre d'ÉTAT homologue.** Aucun des huit cadres du groupe #59-66 ne montre « aucun lieutenant
   éligible ». **J'ai pris #59** (le cadre nominal) comme homologue, pour deux raisons mesurables :
   l'état des DONNÉES y est le même — les quatre familles à « jamais / on ne les a pas croisés »,
   comme les quatre « on n'y est jamais allés » de la capture — et c'est le **seul cadre rendu** en
   image. Le cadre le plus proche du refus est **#61** (« Deux choses ne collent pas ») : il conserve
   `.ordre` et remplace le geste par un `.geste.rouge` (« deux choses ne collent pas ») — je le cite
   en **SOURCE**, jamais en image, puisqu'il n'est pas rendu. Mesure qui trancherait : rendre #61 à
   ×3,6 par `Tools/rendre-tel.py`.
7. **Le rect imprimé au run.** Non préservé. J'ai vérifié sur l'image ce que le dossier dérivait du
   code : bandeau de 1080 px de large et **143 px** de haut (prédiction 143 ✓), donc j'utilise le reste
   de sa géométrie sans le recalculer.
8. **La matière.** J'ai établi l'**uniformité** de l'aplat du fond (0/255 sur 12 bandes) et de celui
   des cartes (0/255 sur 315×140 px) — donc l'absence de grain. Mais la maquette n'en demande pas non
   plus sur `.fam` : je n'ai **pas de témoin de grain** dans la référence, et je ne peux donc pas dire
   si une matière a été perdue au-delà du dégradé de fond (`M2`).
9. **Les contrastes du chrome sur l'art.** Le bandeau de cette capture est un aplat navy, sans art
   défilant : ce que la doctrine vise (texte clair sur art peint) n'est pas exercé ici. Non vérifié.
10. **L'origine des libellés.** Aucun rapport juge-données n'existe pour cet écran (écran neuf) :
    toute question « d'où vient cette valeur / ce libellé » (« Gros bras », « Dessinées, pas
    renseignées », « Le conflit ») est hors de mon instrument.
11. **Ce que la planche ne peut pas montrer, par construction.** C'est une capture **sous shell**
    (`CaptureSousShell`) : elle exerce bien le chrome et le placement face au dock — c'est pourquoi
    `M12`, `M9` et la gouttière sont mesurables — mais **pas** le chemin joueur (menu Plus), donc ni
    la navigation, ni l'onglet actif, ni ce qu'un vrai parcours changerait à l'état.

---

## Annexes

### 1. Inventaire de la référence (`reference-1080x2102.png`, cadre #59)

Repère : 1 CSS = 3,6 px. `.tel` : bordure 1 CSS ⇒ le contenu commence à x = 3,6 + 46,8 = **50,4 px**
(mesuré 50). Rect du `.cfl6` : y **434..2098** (1 664 px = 462,2 CSS ; la CSS annonce `height:462px` ✓).

| id | catégorie | parent | bbox (px) | forme | remplissage | bord | texte | relations |
|---|---|---|---|---|---|---|---|---|
| `R0` | panneau | `.tel` | (0,434)-(1080,2098) | rect | dégradé 180° (32,24,15)→(24,18,18), amplitude 15/765 | — | — | occupe le bas du `.tel` (`margin-top:auto`) |
| `R1` | bande d'en-tête | `R0` | (0,434)-(1080,640) | rect, 207 px = 57,5 CSS | (32,24,15) = `#20180f` exact | filet bas 3 px (61,48,36) = `#3d3024` exact | — | 0 → 12,4 % du rect libre |
| `R2` | titre | `R1` | encre (51,480)-(320,520) | — | — | — | « Le coup de ce soir », **sérif** gras, capitale **32 px**, encre (240,223,196) = `#f0dfc4`, **13,39:1** | 1ʳᵉ ligne de la bande |
| `R3` | texte courant | `R1` | encre y 543..570 | — | — | — | « On choisit une famille… », 2 lignes, encre (154,138,106) = `#9a8a6a`, **5,19:1** | sous `R2` |
| `R4` | **plaque (serviette)** | `R0` | (60,677)-(1020,1003) — **326 px = 19,6 %** du rect libre | rect, rayon 2 CSS, ombre portée | **(242,236,224) = `#f2ece0` exact**, 76,4 % de l'aire du bloc | — | phrase 9,5 CSS **sérif** (42,33,24) = `#2a2118`, **13,43:1** ; nom de la cible en rouge `#8c2f36` | **seul aplat clair de l'écran** ; 13,4:1 sur le fond ; 39 px sous `R1` |
| `R5` | médaillon | `R4` | rond 34 CSS, x 92..210 à y=770 | cercle | **(221,211,192) = `#ddd3c0` exact** | 1 CSS `#bfb39a` | silhouette `#buste-homburg` (207,196,166) | à gauche de la phrase |
| `R6` | séparateur + prise | `R4` | filet à y **864..866** (3 px = 1 CSS) | trait | **(203,191,164) = `#cbbfa4` exact** | — | « CE QU'ON PREND SI ÇA MARCHE » / « la ferraille de leur dépôt » (sérif, `#8c2f36`) | bas de la serviette |
| `R7` | titron | `R0` | encre (51,1037)-(686,1058) | — | — | — | « LES QUATRE FAMILLES DE BRENNAR », capitales, bbox **22 px** (Q descendant), (138,127,107) = `#8a7f6b`, **4,53:1** | 34 px sous `R4` ; **36,2 %** du rect libre |
| `R8` | carte (visée) | `R0` | (46,1084)-(1033,1249), **165 px** | rect, rayon 3 CSS | (46,33,20) = `#2e2114` exact | filet or `#8a6a22` + halo 1 px | écu « C » ; « La Coil » ; « les ferrailleurs de Spine » ; « jamais » ; tag **CE SOIR** | 47 px sous `R7` ; **39,1 %** du rect libre |
| `R9`-`R11` | cartes | `R0` | (50,1267)-(1029,1431) · (50,1449)-(1029,1614) · (50,1632)-(1029,1787) | rect, rayon **~10 px** (3 CSS) | **(36,28,20) = `#241c14` exact** | **filet 3 px (61,48,36) = `#3d3024` exact** | 3 colonnes : écu 26×30 CSS (x 86..180) · nom **sérif** 25 px de capitale (239,230,212) = `#efe6d4` **13,54:1** · identité (138,127,107) **4,26:1** · `hist` **aligné à droite** (111,99,80) = `#6f6350` **2,86:1** | largeur **980 px** ; écart **18 px** (= `margin-bottom:5px` ✓) ; **rapport fort:faible des 3 encres = 4,7×** |
| `R12` | bande basse | `R0` | (0,1790)-(1080,2098) — **308 px = 18,5 %** du rect libre | rect | **(20,26,33) = `#141a21` exact** (seule surface froide de la référence) | filet haut 2 CSS `#2c3640` | — | détachée du corps |
| `R13` | citation | `R12` | encre y 1827..1893 | — | — | — | « Lt. Kest : « Dites-moi seulement chez qui… » », italique **sérif** | — |
| `R14` | **bouton (CTA)** | `R12` | (60,1938)-(1020,2043) | rect, rayon 3 CSS | (36,28,17) | filet 1 CSS `#5a4a2a` | « L'ENVOYER CE SOIR » (217,171,78) = **`#d9ab4e` exact**, **7,91:1** + « on ne pourra plus le rappeler » | dernier pixel d'encre : **96,7 %** du rect libre |

**Couche globale (référence, `.cfl6`)** — palette quantifiée : 26,1 % (36,28,19) · 20,6 % (32,24,16) ·
**18,1 % (224,216,203)** · 11,8 % (57,46,32) · 11,1 % (22,24,27) · 10,1 % (38,29,21). Luminance moyenne
**68,26**. Densité d'encre (L>70) **21,99 %**. Indice de chaleur R−B **+15,32** (+20,23 sur les cartes).

### 2. Inventaire de la capture (`capture-1080x2400.png`)

Rect libre : y **143..2160** (2 017 px = 560,3 CSS). Bandeau 0..143 (mesuré : filet à y=141-142).
Dock : dégradé qui démarre à y≈2160.

| id | catégorie | parent | bbox (px) | forme | remplissage | bord | texte | relations |
|---|---|---|---|---|---|---|---|---|
| `C0` | fond d'écran | rect libre | (0,143)-(1080,2160) | rect | **(13,13,13) constant, amplitude 0/765** sur 12 bandes | — | — | aucun panneau, aucune bande |
| `C1` | bandeau (chrome) | shell | (0,0)-(1080,143) | rect | navy (13,13,27) | filet bas 2 px **(224,102,73) = `--braise` Δ1** | ARGENT (242,201,106) = `--or-vif` Δ1 · JOUR 50 (185,173,146) = `--creme-2` Δ0 · phase « — » (234,224,200) | flèche retour à gauche (arbitrage) ; **la valeur touche l'anneau : 1 px jusqu'à sa frange, 7 px jusqu'à son plein** (`m8`) |
| `C2` | médaillon (chrome) | `C1` | anneau mesuré x 450..629 à y=90 ⇒ **180 px** de large, centre x ≈ **540** (attendu 64 CSS-HUD × 2,755 = 176,3 px, Δ +2,1 %) | cercle | face navy (38,44,58) | anneau **(222,101,72) = `--braise` Δ2** | « Brûlant » **sérif** (234,224,200) — devrait être braise · « CHALEUR » | cadran : voir §6 point 5 |
| `C3` | titre | `C0` | encre (62,293)-(377,340) | — | — | — | « Le conflit », **sans-sérif** gras, capitale **46 px**, (238,241,242), **17,12:1** | 150 px sous le bandeau ; **7,4 %** du rect libre |
| `C4` | texte courant | `C0` | encre (59,405)-(994,473) | — | — | — | « Ce que vos hommes rapportent… », 2 lignes, (138,151,156), **6,47:1** | — |
| `C5` | titron | `C0` | encre (60,529)-(421,556) | — | — | — | « LES QUATRE FAMILLES », bbox **28 px** (Q descendant), (138,151,156), **6,47:1** | **19,1 %** du rect libre |
| `C6` | **mention (en trop)** | `C0` | encre (60,585)-(1017,638) | — | — | — | « Dessinées, pas renseignées : aucune route ne dit ce qu'elles préparent ni ce qu'elles possèdent. », 2 lignes, (184,194,204), **10,76:1** | **aucune contrepartie dans le cadre #59** |
| `C7`-`C10` | cartes | `C0` | (57,666)-(1022,835) · (57,857)-(1022,1026) · (57,1048)-(1022,1217) · (57,1239)-(1022,1408) | rect, **rayon 0** | **(34,42,46)** uniforme (0/255) | **aucun** | 3 lignes **empilées à gauche** : nom **sans-sérif** 24 px de capitale (191,201,212) **8,70:1** · identité (184,194,204) **8,08:1** · « on n'y est jamais allés » (191,201,212) **8,70:1** | largeur **966 px** ; écart **22 px** ; texte à x=93 (36 px de retrait, **pas d'écu**) ; **rapport fort:faible = 1,08×** |
| `C11` | titron | `C0` | encre (59,1456)-(349,1483) | — | — | — | « QUI PART CE SOIR », **6,47:1** | 48 px sous la 4ᵉ carte |
| `C12` | message d'état vide | `C0` | encre (57,1521)-(991,1551) | — | — | — | « Aucun de vos lieutenants n'est du genre Gros bras. » gras, (238,241,242), **17,12:1** | — |
| `C13` | texte courant | `C0` | encre (59,1587)-(943,1643) | — | — | — | « C'est lui qui part la nuit. Il vous en manque un — ce n'est pas cassé, vous n'en avez tout simplement pas encore. » (184,194,204), **10,76:1** | **dernier pixel d'encre : 74,4 %** du rect libre |
| `C14` | **vide (en trop)** | `C0` | (0,1643)-(1080,2160) | — | (13,13,13), 18/18 échantillons identiques | — | — | **517 px = 143,6 CSS = 25,6 %** du rect libre |
| `C15` | dock (chrome) | shell | (0,2160)-(1080,2400) | dégradé navy | — | — | EMPIRE (souligné or) · FAMILLE · **FILIÈRE** · PLUS | ronds vides (arbitrage) ; canon : « MARCHÉ » |

**Couche globale (capture, rect libre)** — palette quantifiée : **61,0 % (13,13,13)** ·
**26,1 % (34,42,46)** · 5,3 % (90,95,99) · 2,5 % (24,26,28) · 2,4 % (41,42,43) · 1,9 % (13,13,14).
Luminance moyenne **27,28**. Densité d'encre (L>70) **5,29 %**. Indice de chaleur R−B **−3,96**
(−11,19 sur les cartes). Au même cadrage vertical que la référence (1 664 px) : luminance **30,28**,
densité **6,47 %** ⇒ **2,25× plus sombre et 3,4× moins d'encre** que la maquette.

### 3. Correspondance des repères

- **Contenu** : référence et capture sont à **la même échelle**, 1 CSS = 3,6 px (dossier, rapport 1,00).
  Un écart de taille sur le contenu est donc **réel**.
- **Chrome** : ×2,755 (392 CSS-HUD → 1080 px). Le bandeau mesuré fait **143 px = 51,9 CSS-HUD** contre
  52 attendus. Le chrome se juge contre `hud-canon-1176.png` (1176 px = 392 CSS, ×3), le contenu contre
  le cadre de série 6.
- **Normalisation verticale** (doctrine : jamais le pixel absolu — aligner haut du contenu sur le bas du
  bandeau, bas du contenu sur le haut du dock). Rect libre référence y 434..2098 (1 664 px) ;
  capture y 143..2160 (2 017 px). Contrôle positif : bornes à 0,0 % et 100,0 % des deux côtés.

  | repère | réf. % | capture % |
  |---|---|---|
  | 1ᵉʳ pixel d'encre du contenu | 2,8 % | 7,4 % |
  | titron des familles | 36,2 % | 19,1 % |
  | haut de la 1ʳᵉ carte | 39,1 % | 25,9 % |
  | bas de la 4ᵉ carte | 81,3 % | 62,7 % |
  | **dernier pixel d'encre** | **96,7 %** | **74,4 %** |

- **Polices.** La source `.cfl6` nomme explicitement `'DejaVu Sans'` **et** `'DejaVu Serif'` (jamais
  Georgia). `fc-match "DejaVu Sans"` → `DejaVuSans.ttf` ; `fc-match "DejaVu Serif"` → `DejaVuSerif.ttf`.
  Le client embarque les deux ⇒ **aucune substitution, donc aucun arbitrage typographique sur cet
  écran** : la comparaison de famille est opposable (`M7`). Le HUD, lui, demande `Georgia,"Times New
  Roman",serif` pour `.heatpct` ⇒ Noto Serif au canon, DejaVu Serif au client : **là**, l'écart de
  famille est un arbitrage (`A`).

### 4. Scripts — `mesures/*.py`

Chacun imprime la taille des images qu'il ouvre et porte son contrôle positif (et, quand l'enjeu le
mérite, son contrôle négatif). Les vues citées (`mesures/_vue_*.png`) sont régénérables par `m0_vues.py`.

| script | grandeur | contrôle |
|---|---|---|
| `m0_vues.py` | régénère les 20 recadrages/agrandissements cités | imprime la taille des 4 sources |
| `m1_geometrie.py` | profil de luminance par ligne, frontières | + : largeur 1080 des deux côtés ; − : hauteurs différentes (2102 / 2400) |
| `m2_couleurs.py` | couleurs d'aplat (médiane de fenêtre, ≥3 px de tout bord) | + : 5 jetons CSS retrouvés au pixel ; − : carte visée ≠ carte normale |
| `m3_fond_bords.py` | dégradé du fond, filets des cartes | + : gradient et filet `#3d3024` trouvés sur la référence |
| `m4_rects.py` | rects et rayons (fond local par ligne) | + : largeur 272,2 CSS = `.cbody` moins ses paddings ; − : gouttière → `None` |
| `m5_typo.py` | hauteurs de capitale et chasses (bbox d'encre) | + : capitale de `.fam .id b` = 25 px, prédiction 0,729 × 9,5 × 3,6 = 24,9 ; − : bande vide → `None` |
| `m6_chrome_gouttiere.py` | bas du bandeau, haut du dock, rect libre | + : 143 px prédits, 143 mesurés ; − : ligne y=1900 uniforme, 18/18 |
| `m7_chrome_chaud.py` | les 4 règles `.tel.chaud` | + : filet à Δ1 de `--braise` ; − : fond du bandeau à d=211 |
| `m8_medaillon_aile.py` | anneau du médaillon, aile droite, ARGENT | + : `--or-vif` Δ1, `--creme-2` Δ0 ; − : centre du cadran non braise |
| `m9_palette.py` | palette quantifiée, luminance, densité | + : brun dominant côté référence ; − : la serviette seule → crème dominante |
| `m10_contraste.py` | encres et contrastes WCAG | + : 8 jetons CSS retrouvés au pixel ; − : bande vide → `None` |
| `m11_structure.py` | écu, rythme vertical, vide | + : écu trouvé sur la référence ; − : bande gauche de la carte capture uniforme à 0/255 |
| `m12_chaleur.py` | indice R−B, amplitude du dégradé, aplat | + : serviette +20,06 / dock du canon −10,10 ; − : aplat de carte à 0/255 |
| `m13_cadran.py`, `m14_arc_vs_chevron.py`, `m15_cadran_remplissage.py` | **sondes ÉCARTÉES** (arc contre chevron) | leurs contrôles ont **échoué** ou ont été contaminés ⇒ résultats non utilisés, voir §6 point 5 |
| `m16_entete.py` | bande `.entete` et son filet | + : `#20180f` et `#3d3024` au pixel ; − : capture sans rupture |
| `m17_normalisation.py` | positions en % du rect libre | + : bornes à 0,0 % et 100,0 % des deux côtés |
| `m18_details.py` | médaillon et filet de la serviette, écart valeur↔anneau, bbox de l'anneau | + : `#ddd3c0` et `#cbbfa4` retrouvés au pixel ; − : aucun anneau à gauche de x=180 |
