# Juge visuel ⊥ — ④ Accueil / « LA SUITE » — r4 — 2026-10-07

Captures jugées : `captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png` et `…_1080x2400.png`
(client `cd4c148c`, compte neuf, P1 prise APRÈS la lecture de LA SUITE — 3 lignes, 10 000 €,
jour 1, Aube, COLD).
Référence : `r2-2026-10-07/reference/cadre-4-la-suite.png` (1080 × 2102, atelier `b7d8c1a`).
Source de la maquette consultée pour **nommer** des valeurs, jamais pour contredire l'image :
`/home/erutheone/project/atelier3d-mafia/ecrans-brennar-accueil.html`.

**Échelle.** Les trois images font **1080 px de large** : toute mesure horizontale et toute mesure
de taille se compare en px bruts, sans normalisation. Les hauteurs diffèrent (2102 / 1920 / 2400) :
aucune position verticale absolue n'est comparée — seulement des distances entre repères.

---

## Verdict : **NON APPROUVÉ**

Les couleurs, les ors, les contrastes et le chrome sont revenus à la maquette au bit près, et
l'ordre de lecture est rétabli (le bouton or est redevenu le bloc le plus clair de l'écran aux
**deux** résolutions). Restent **trois écarts vus au premier regard**, et les trois vivent dans le
correctif du tour précédent : les deux boutons secondaires s'étirent désormais à la hauteur de leur
rangée (119 et 133 px contre **92** en maquette, et 90 px pour le bouton or juste au-dessus), les
textes sans-sérif secondaires sont **14 à 21 % trop petits** sur quatre mesures indépendantes, et le
filet laiton du bord haut du panneau est un **segment plat à bouts francs** là où la maquette pose
un dégradé.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence | jeu (1920 / 2400) | écart | script |
|---|---|---|---|---|---|
| 1 | largeur des trois images | 1080 | 1080 / 1080 | **0** | `m1` |
| 2 | **bords latéraux du panneau** | x 48 et 1032 | x 48 et 1030-1032 | **≤ 2 px** | `m3` |
| 3 | **couleur du liseré du panneau** | (33,38,50) | (34,38,46) | **≤ 4/255** | `m3`, `m16` |
| 4 | **couleur des séparateurs de rangée** | (29,34,44) | (28,34,42) | **≤ 2/255** | `m5`, `m15` |
| 5 | **étendue des séparateurs** | x 100..979 (880 px) | x 94..984 (891 px) | **+1,3 %** | `m29` |
| 6 | **dégradé du bouton or**, haut / milieu / bas | (231,194,104) / (217,175,81) / (203,157,59) | (231,194,103) / (217,176,82) / (204,158,60) | **≤ 1/255** | `m8` |
| 7 | **bord du bouton or** | (138,97,28), 3 px | (138,96,28), 3 px | **1/255** | `m8` |
| 8 | **couleur du filet laiton** du panneau | (176,141,62), 3 px | (176,141,61), 3 px | **1/255**, même épaisseur | `m2`, `m28` |
| 9 | **centre du filet laiton** | x 540 (panneau 48..1032) | x 539,5 | **0,5 px** | `m28` |
| 10 | **encre du titre de rangée** (or vif) | (242,201,107) | (242,201,106) | **1/255** | `m15` |
| 11 | **encre des sous-lignes** et de « LA SUITE » | (185,173,146) | (185,173,146) | **0/255** | `m15` |
| 12 | **encre des libellés de bouton fantôme** | (234,224,200) | (234,224,200) | **0/255** | `m10`, `m15` |
| 13 | **remplissage des boutons fantômes** | (20,26,36) / (18,23,34) | (22,28,34) | **≤ 4/255** | `m10`, `m11` |
| 14 | **bord des boutons fantômes** | (58,62,71), 3 px | (59,64,73), 3 px | **≤ 2/255**, même épaisseur | `m11` |
| 15 | **liseré de la plaque TRANCHER** | (41,52,70) | (42,53,71) | **1/255** (CSS `#2a3648`) | `m22` |
| 16 | **« LÉGÈRE » en gris chaud** | (139,129,112) | (140,130,114) | **≤ 2/255** | `m15` |
| 17 | **encre « Lt. … attend vos ordres »** | (218,209,185) | (218,209,188) | **≤ 3/255** | `m15` |
| 18 | **encre « TRANCHER »** | (236,196,104) | (233,197,106) | **≤ 3/255** | `m15` |
| 19 | **hauteur de capitale du titre sérif** (« L » de « Le labo ») | 29 px | 28 / 27 px | **−3 %** | `m14` |
| 20 | **hauteur de capitale de « LA SUITE »** | 17 px | 16 / 17 px | **−6 %** | `m14` |
| 21 | **interlettrage normalisé** (chasse ÷ capitale, chaînes identiques) | 16,00 · 11,14 · 9,53 · 17,45 · 13,08 · 9,48 | 14,83 · 10,22 · 9,19 · 16,89 · 13,84 · 9,00 | **−8 % à +6 %** | `m32` |
| 22 | **hauteur du bouton or** | 92 px | 90 / 89 px | **−2 px** | `m8` |
| 23 | **bord droit commun des trois boutons** | x 979 | x 984 | **+5 px** | `m8`, `m11` |
| 24 | **plaque TRANCHER** | 988 × 150 px | 986 × 149 px | **≤ 2 px** | `m23` |
| 25 | **dock : écarts entre ronds** | 189 / 187 / 186 | 188 / 187 / 187 | **≤ 1 px** | `m23` |
| 26 | **contrastes WCAG** de 6 textes du panneau | 11,81 · 8,44 · 8,37 · 13,42 · 12,75 · 4,91 | 12,28 · 8,72 · 8,64 · 13,07 · 12,75 · 5,12 | **≤ 0,5:1**, tous au-dessus du plancher (la 7ᵉ mesure, COMMANDER, est écartée : ma fenêtre tombe or-sur-or des deux côtés) | `m26` |
| 27 | **rang du bouton or** parmi les blocs 90×90 les plus clairs | **1 / 990** | **1 / 902** et **1 / 1144** | ordre de lecture **rétabli** | `m33` |
| 28 | **rien n'est coupé au cadre** | 0 % d'encre sur les 4 bords | 0 % d'encre d'interface sur les 4 bords | — | `m27` |

Le #6 et le #13 lus ensemble ferment la question du tour précédent : les quatre rôles de verre sont
de nouveau **quatre valeurs distinctes**, et chacune tombe à ≤ 4/255 de la maquette.

---

## 0. L'écran, tel que la maquette le dit

**But.** On ouvre la journée et on répond à une seule question : *qu'est-ce que je fais
maintenant ?* L'écran ne montre pas un tableau de bord, il montre **trois gestes** et, en dessous,
la seule chose qui attend une décision.

**Ordre de lecture.** ① le **bouton or plein** — le seul aplat lumineux de l'écran ; ② le médaillon
cerclé de laiton, en haut au centre ; ③ le montant en or à gauche ; ④ les trois titres or ; ⑤ la
carte de file (« Lt. … attend vos ordres » / TRANCHER) ; ⑥ le dock.

**Zones.** (a) un chrome haut translucide posé *sur* l'art, clos par un filet laiton ; (b) l'art —
un quartier peint en isométrie, **tenu très sombre**, qui occupe la moitié haute sans jamais
réclamer l'œil ; (c) la plaque « LA SUITE », rectangle très arrondi, bleu nuit, avec un reflet de
laiton qui court sur son bord supérieur ; (d) la carte de file, plus basse, plus discrète ; (e) le
dock.

**Traits d'identité.** ① un seul point lumineux, le bouton or ; ② chaud sur bleu nuit (crème
185,173,146 · or vif 242,201,107 · laiton 176,141,62) ; ③ la ville est **peinte mais éteinte** — on
la devine, on ne la lit pas ; ④ les surfaces de verre sont **graduées** (fond de bouton fantôme <
séparateur < liseré du panneau < liseré de la carte de file) ; ⑤ **trois boutons d'une seule
hauteur**, calés sur un même bord droit, dont un seul est plein.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, pour l'essentiel, et c'est un saut par rapport au tour précédent. La ville est redevenue
sombre, le bouton or est redevenu le point lumineux de l'écran **aux deux résolutions** (rang
**1/902** et **1/1144** contre 13/1144), les quatre valeurs de verre sont revenues, le libellé des
boutons secondaires est remonté de 2,81:1 à **13,07:1**, l'eau du quai a cessé d'être bleu-pétrole.
Les 26 premières lignes du contrôle positif sont à ≤ 4/255 ou ≤ 2 px.

Ce qui ne se lit pas comme la maquette tient au **trait d'identité ⑤** et à la **taille du texte
secondaire**. Les trois boutons de la maquette font exactement la même hauteur (92 px) ; en jeu ils
en font trois différentes — 90, **119**, **133** — parce que les deux fantômes s'étirent à la
hauteur de leur rangée. BLANCHIR devient presque carré (221 × 133) et la colonne de droite perd son
rythme. Et quatre textes sans-sérif indépendants (la sous-ligne d'une rangée, le libellé d'un
bouton, le titre de la carte de file, TRANCHER) sont **tous** 14 à 21 % trop petits, du même signe :
ce n'est pas quatre erreurs, c'est une erreur d'échelle sur un style. Conséquence perçue : la
hiérarchie titre ↔ sous-ligne passe de 1,21 à **1,47** — l'explication sous chaque titre s'efface.

Le troisième écart est un objet : le filet laiton du bord haut du panneau. Couleur, épaisseur et
centre sont exacts, mais la maquette en fait un reflet qui s'allume au milieu et s'éteint aux
extrémités (plateau 358 px, deux rampes de ~180 px), tandis que le jeu en fait **650 px à pleine
intensité qui s'arrêtent net**. À 1:1 (`mesures/duo_filet.png`) la maquette montre un fil de laiton
dans l'ombre, le jeu montre une barre dorée à deux arrêts francs.

**Les trois écarts de tête, par ce qu'un joueur perçoit** : (1) les deux boutons secondaires trop
hauts et inégaux, qui cassent la rangée de trois ; (2) le texte secondaire trop petit, qui creuse la
hiérarchie ; (3) la barre de laiton franche là où la maquette a un reflet.

---

## 3. Écarts

Un finding par ligne ; gravité dans la liste fermée **BLOQUANT / MAJEUR / MINEUR**, rien de compté
ailleurs. `critère` = `NOUVEAU` quand l'instrument ou la grandeur n'existait pas au r3. La
vérification des ASSUMÉS et les ARBITRAGES sont dans les deux sections qui suivent et ne sont **pas**
comptés ici.

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `R1` | **MAJEUR** | NOUVEAU | **Les deux boutons fantômes s'étirent à la hauteur de leur rangée** : la maquette donne aux **trois** boutons la même hauteur ; le jeu en produit trois différentes, et les deux fantômes sont les plus hauts de l'écran. La rangée de trois perd son unité et BLANCHIR devient presque carré. | Hauteurs — réf : COMMANDER **92**, VOIR LA VENTE **92**, BLANCHIR **92** (CSS `.g4{font:8px/1;padding:8px 10px;border:1px}` ⇒ 26 CSS × 3,6 = 93,6). Jeu, **identique aux deux résolutions** : COMMANDER **90** (✅), VOIR LA VENTE **119** (**+29 %**), BLANCHIR **133** (**+45 %**). Formes : réf 375×92 et 275×92 (pilules, rapport 4,1 et 3,0) ; jeu 267×119 et 221×133 (rapport 2,2 et **1,66**). `m8`, `m11`, `mesures/duo_boutons.png` | — |
| `R2` | **MAJEUR** | NOUVEAU | **Tous les textes sans-sérif secondaires sont 14 à 21 % trop petits**, quatre mesures indépendantes de même signe ⇒ une erreur d'échelle sur un style, pas quatre erreurs. Le sérif et « LA SUITE », eux, sont justes. | Hauteurs de capitale, **même famille de police des deux côtés** (la maquette déclare `DejaVu Sans` / `DejaVu Serif`, `ecrans-brennar-accueil.html:734-737`) : sous-ligne **24 → 19** (−21 %) · libellé de bouton **21 → 18** (−14 %) · « Lt. … » **25 → 21** (−16 %) · TRANCHER **23 → 19** (−17 %). Témoins justes : titre sérif **29 → 28**, « LA SUITE » **17 → 16**. Rapport titre/sous-ligne (invariant d'échelle) : **1,21 → 1,47**. `m14`, `m32` | La maquette déclare 8,4 px pour la sous-ligne et 8 px pour le libellé ; je ne peux pas dire **quelle** valeur le client applique, seulement le rapport. |
| `R3` | **MAJEUR** | NOUVEAU | **Le filet laiton du bord haut du panneau est un segment PLAT à bouts francs** là où la maquette pose un dégradé qui s'éteint. Même couleur, même épaisseur, même centre : c'est la **loi de décroissance** qui diffère, et elle met 1,8× plus de laiton à pleine intensité. | Profil R−B le long du filet — réf : plateau à **112-114** de x ≈ **360 à ≈ 720** (~360 px), puis rampes jusqu'à 0 vers x 170 et x 950 ; **la prédiction de la CSS** (`linear-gradient(90deg,transparent,#b08d3e 30%,#b08d3e 70%,transparent)` sur `left:14px;right:14px`) donne un plateau 361..719 — mon instrument tombe dessus au pixel (contrôle positif). Jeu : **115 constant de x 215 à 864** (650 px), **0 en dehors**, aux deux résolutions. `m2`, `m3`, `m28`, `mesures/duo_filet.png` | — |
| `R4` | MINEUR | DÉJÀ APPLIQUÉ (r3 `G1`/`G5`, **sens inversé**) | **Le diorama est maintenant trop sombre, et il perd ses ombres** : le correctif a dépassé la cible par le bas. L'ordre de lecture n'est **pas** touché ; ce qui est perdu est le détail des parties sombres de l'art. | Appariement REF↔JEU sur le **même contenu** (r = **0,973**, contrôle négatif image retournée **−0,060**, régression du jeu sur lui-même a=1,000 b=0,000) : luminance moyenne du décor **24,61 → 19,99** (**−18,8 %**) ; percentiles jeu/réf **p1 0,61 · p10 0,68 · p50 0,74 · p95 0,90 · p99 1,04** (les hautes lumières sont justes, le bas est écrasé) ; **part du décor sous lum 10 : 1,2 % → 18,8 %** ; sous lum 12 : 7,5 % → 32,6 %. Écart-type inchangé (11,98 → 12,31). `m18`, `m19`, `m20`, `m24`, `m39`, `mesures/duo_decor.png` | Je n'ai pas pu mesurer le **facteur de teinte** du jeu contre la texture source : l'instrument qui le ferait (`m36`) **échoue à son propre contrôle positif** (il ne retrouve pas le 0,42 déclaré sur la référence — il rend 0,21 à 0,36 — parce que l'appariement à la texture ne monte qu'à r=+0,74 et que la dilution de régression écrase la pente). Je ne conclus donc **rien** sur la valeur du facteur ; voir § « la question posée ». |
| `R5` | MINEUR | NOUVEAU | **Le verre du panneau a perdu son dégradé vertical et une partie de son bleu** : la maquette l'éclaire du haut, le jeu le rend en aplat neutre. | Médiane RGB par sixième de la hauteur du panneau, colonne x 58..90 (hors texte) — réf : (13,19,31) → (11,18,30) → (11,17,28) → (10,16,27) → (10,15,26) → (9,14,24), luminance **18,59 → 13,66 (−26 %)**. Jeu : **(13,13,22) partout**, luminance 14,58 → 13,65 (−6 %, dont 5 au bruit). B−R : réf **+18 → +15** ; jeu **+9**. CSS de la maquette : `background:linear-gradient(180deg,#0c1320ef,#080d17f6)`. `m30` | — |
| `R6` | MINEUR | DÉJÀ APPLIQUÉ (r3 `G9`/`G10`) | **Le panneau reste plus court que la maquette** — nettement moins qu'au tour précédent. La part qui n'est **pas** expliquée par le reflux vient du retrait haut et de `R2`. | Hauteur du panneau (bord haut → bord bas) : réf **795 px** (825→1620) ; jeu **620** (829→1449) et **621** (1235→1856) ⇒ **−22 %** (c'était −30 %). Seule la rangée 1 a le même nombre de lignes des deux côtés : **250 → 226 px (−9,6 %)**. Retrait haut panneau → « LA SUITE » : **47 → 37 px (−21 %)**. Rangées 2 et 3 : réf 259 et 286, jeu 188 et 206 — mais la maquette les met sur 2+2 lignes et le jeu sur 1+2 et 2+1, **reflux légitime** (la colonne de texte passe de 506 à 622 px parce que les boutons épousent leur libellé, ASSUMÉ). `m4`, `m5`, `m6` | La part exacte du reflux et celle du rembourrage ne se séparent pas depuis l'image pour les rangées 2 et 3 ; je ne chiffre l'écart de rythme que sur la rangée 1. |
| `R7` | MINEUR | NOUVEAU | **Le diorama est rendu à 91,7 % du zoom de la maquette** : le quartier est vu d'un peu plus loin. | L'homographie qui maximise la corrélation REF↔JEU est **s = 1,0910** (r=0,973 ; contrôle négatif −0,060) ⇒ le jeu rend le décor à **1/1,0910 = 91,7 %**. `m17`, `m18` | Je ne peux pas dire si c'est un cadrage voulu (la maquette et le jeu n'ont pas le même rapport d'aspect : 1080×2102 contre 1080×1920 et 1080×2400). |
| `R8` | MINEUR | NOUVEAU | **La gouttière entre le panneau et la plaque TRANCHER n'est pas constante entre les deux résolutions.** | Mesurée entre le bas du liseré du panneau et le haut du liseré de la plaque — réf **52 px** (1622 → 1674) ; jeu **37 px** à 1920 (1450 → 1487) et **49 px** à 2400 (1857 → 1906). `m4`, `m23` | — |
| `R9` | MINEUR | DÉJÀ APPLIQUÉ (r3 `G7`) | **Le rayon du bouton or reste un peu court**, et il n'est plus égal à celui des fantômes alors que la maquette donne le même rayon aux trois. | Même critère partout (dy où le retrait du bord gauche atteint ≤ 1 px) ; **contrôle positif** : les deux fantômes de la référence rendent **20 et 20**. Réf : or **21**, fantômes **20 / 20**. Jeu : or **17 / 16**, fantômes **18 / 19 / 19 / 19**. Soit −4 à −5 px sur l'or (c'était −10 px au r3). CSS : `border-radius:8px` ⇒ 28,8 px pour les trois. `m37` | — |
| `R10` | MINEUR | NOUVEAU | **Les marges intérieures du panneau sont légèrement plus serrées à droite qu'en maquette.** | Réf : encre du texte à x **99**, bord droit des boutons à x **979** ⇒ marges **49 / 53 px**. Jeu : x **96-97** et x **984** ⇒ **47 / 48 px**. `m3`, `m6`, `m8`, `m11` | — |

**Compte : 0 BLOQUANT · 3 MAJEUR · 7 MINEUR.**
Sur les 10, **7 sont `NOUVEAU`** et **3 `DÉJÀ APPLIQUÉ`**. L'élargissement vient de quatre
grandeurs que le r3 ne mesurait pas : la **hauteur** des boutons (il n'avait mesuré que leur
largeur), la hauteur de capitale des **textes sans-sérif autres que le titre de rangée**, la **loi
de décroissance** du filet laiton (il n'en avait mesuré que l'étendue et le centre, et l'avait
classé contrôle positif), et le **dégradé vertical** du verre. Le r3 comptait 1 BLOQUANT / 4 MAJEUR
/ 10 MINEUR.

> **Note de cause commune** (je ne fusionne pas les lignes) : `R1` est le défaut que le correctif de
> `G6` a introduit un cran plus bas — en faisant épouser au bouton la **largeur** de son libellé, il
> lui a aussi fait épouser la **hauteur** de sa rangée. `R6` est en partie une conséquence de `R2`
> (un texte plus petit fait une rangée plus courte) et du reflux. `R5` explique le reliquat du
> rapport liseré/verre que le r3 comptait en `G8` : le liseré est **juste** (≤ 4/255), c'est le
> verre qui est plus sombre.

---

## Vérification des écarts ASSUMÉS du dossier (non comptés ci-dessus)

| assumé | rendu proprement ? | mesure |
|---|---|---|
| **Chrome commun = maquette HUD v3.1** (filet du bandeau, typo, dock, losange, médaillon) | **OUI pour le filet, le dock et le médaillon ; l'interlettrage et le losange restent hors maquette ④** | Filet du bandeau : réf y=145, x 55..1024, 3 px, (95,80,45) ; jeu y=141, x 14..1065, 2 px, (125,100,47) — même objet, pleine largeur assumée. Dock : centres **250/439/626/812** (réf) contre **258/446/633/820**, écarts 189/187/186 contre 188/187/187, diamètres 91-99 contre 87-92 ⇒ **≤ 8 px de décalage, ≤ 7 px de diamètre**. Médaillon : centre **x=539, y=124 des deux côtés**, anneau x 380..699 des deux côtés. « ARGENT » : chasse 116 → 107, gaps moyens **6,6 → 3,8** (r3 `G11`, inchangé). Losange : plus grand (fenêtre contaminée par l'anneau, réf 43×32 contre jeu 74×36 — chiffre non opposable, cf. § 6). `m22`, `m23`, `m27`, `m38`, `m40` |
| **« LÉGÈRE » en gris chaud** | **OUI** — et c'est désormais exact | Réf **(139,129,112)**, jeu **(140,130,114)** : **≤ 2/255**. Le r3 mesurait +19/255. `m15` |
| **Fond = diorama peint DE NUIT** | **OUI pour la nature et pour la nuit ; le réglage dépasse d'un cran** | Même texture (r=0,973 après appariement, contrôle négatif −0,060). La ville est bien éteinte : L≥90 **3,3 % / 2,6 %** contre **3,9 %** en maquette, et le bouton or est redevenu le bloc le plus clair. L'excès est vers le **sombre** ⇒ `R4`. `m18`, `m33`, `m34` |
| **Pastille FAMILLE absente sur un compte neuf** | **OUI** — absence propre, aucun trou ni libellé de repli | Réf : **112 px or** autour du rond FAMILLE, bbox (497,1890)..(508,1901). Jeu : **0 px or**, aux deux résolutions ; le rond est rendu comme ses trois voisins. `m41` |
| **Largeur des boutons au contenu** | **OUI** — et c'est ce qui ferme `G6` | Réf : COMMANDER 329 · VOIR LA VENTE 375 · BLANCHIR 275, bord droit commun x 979. Jeu : **267 · 267 · 221**, bord droit commun x **984**. Les trois ne font plus la même largeur, ils épousent leur libellé et restent calés à droite. **Mais la HAUTEUR, elle, a suivi ⇒ `R1`.** `m8`, `m11` |

---

## Arbitrages (non comptés)

1. **Les soulignés pointillés de la référence ne sont PAS un élément de design.** Ils sont présents
   sous « LA SUITE », sous chaque titre, sous chaque sous-ligne et sous chaque libellé de bouton
   fantôme de la maquette (88 · 123 · 103 · 98 · 65 transitions mesurées, `m21`) et **absents
   partout** dans le jeu (0 transition, 0 px d'encre). **Je les ai cherchés comme un écart et je les
   retire après avoir ouvert la source** : `ecrans-brennar-accueil.html:722` porte
   `.acc4 .prop{text-decoration:underline dotted #b9ad92}`, l'en-tête de la page (`:696`) dit « Un
   mot souligné en pointillé est **proposé, non ratifié** », l'étiquette du cadre 4 (`:789`) se
   termine par « **(PROPOSÉ)** », et chaque texte du cadre 4 porte `class="prop"`. C'est une
   annotation éditoriale de l'atelier. **Un juge qui les compterait remonterait 9 faux écarts.**
   *(Contrôle : TRANCHER, qui ne porte pas `.prop`, n'a de souligné ni en maquette ni en jeu —
   mon instrument rend bien 0 des deux côtés.)*
2. **Le zoom du diorama** (`R7`) : la maquette et les captures n'ont pas le même rapport d'aspect ;
   un cadrage à 91,7 % peut être un choix. Rien dans `dossier.md` ne le dit.
3. **La gouttière non constante entre résolutions** (`R8`) : 37 px à 1920 et 49 px à 2400. Si la
   gouttière est voulue élastique, le finding tombe.

---

## La question posée : le diorama est-il « trop sombre », et dans quel sens corriger ?

**Est-ce perceptible ?** À peine, et pas comme un assombrissement global. La luminance moyenne
d'**écran** passe de 26,2 (réf) à **23,8** (−9 %, `m33`) ; sur le **même contenu de peinture**, le
décor passe de 24,61 à 19,99 (**−18,8 %**, `m19`). Côte à côte à 1:1 (`mesures/duo_decor.png`) la
différence se voit ; seule, la capture ne se lit pas « trop sombre ». **L'ordre de lecture n'est pas
touché** : le bouton or est le bloc 90×90 le plus clair de l'écran aux deux résolutions, et les cinq
premiers blocs sont tous le bouton (`m33`).

**Ce que ça coûte vraiment :** le détail des ombres. La part du décor sous luminance 10 passe de
**1,2 % à 18,8 %** ; sous 12, de 7,5 % à 32,6 % (`m19`). Un tiers de la peinture bascule dans le
quasi-noir : les rues, le sol et les façades non éclairées se referment. Les hautes lumières, elles,
sont justes (p95 à 0,90 et p99 à **1,04** de la référence).

**Dans quel sens corriger — tranché par la mesure, pas par l'argument.** Le déficit n'est **pas** un
gain, c'est un **plancher**. L'ajustement affine sur les pixels appariés donne
`REF = 0,749·JEU + 8,52` (R), `0,812·JEU + 8,51` (G), `0,949·JEU + 5,73` (B) : la référence a une
pente plus **faible** et une ordonnée à l'origine **positive** — un terme constant que le jeu n'a
pas (`m20`). J'ai simulé les correctifs sur les 276 480 pixels appariés (`m39`) :

| correctif simulé | écart absolu moyen à la référence (luminance) | part du décor sous lum 10 |
|---|---|---|
| *(contrôle positif)* le jeu tel quel | **5,48** | 18,8 % |
| **gain ×1,095** — c'est-à-dire teinte 0,42 → **0,46** | 3,94 | **14,0 %** |
| gain ×1,230 (calé sur la luminance moyenne) | 2,82 | 8,7 % |
| **plancher +5/255 sur les trois canaux** | **2,23** | **0,3 %** |
| plancher +7/255 | 2,95 | 0,0 % |
| gain ×1,05 **et** plancher +5/255 | 2,32 | 0,2 % |
| *(cible)* la référence | — | **1,1 %** |

⇒ **Monter la teinte de 0,42 à 0,46 ne ferme que 28 % de l'écart de luminance et laisse encore
14 % de la peinture dans le quasi-noir** (la maquette en a 1,1 %). Le levier juste est **additif** :
rendre au décor le terme constant que le voile de la maquette lui apporte (**≈ +5/255 sur les trois
canaux**), en laissant le gain tel quel. Un gain assez fort pour rattraper les ombres (×1,23)
dépasserait les hautes lumières, déjà à 1,04 de la référence.

⚠️ **Ce que je n'affirme pas** : la valeur du facteur de teinte appliquée par le client. L'instrument
qui la mesurerait contre la texture source (`m36`) **échoue à son contrôle positif** — il ne retrouve
pas le 0,42 déclaré sur la référence (0,21 à 0,36 selon la bande) parce que l'appariement à la
texture JPEG ne monte qu'à r = +0,74 et que la dilution de régression écrase la pente. Je rapporte
donc un **écart mesuré** et un **sens de correction**, pas un réglage.

---

## 5. Autres résolutions

**1080×1920 (9:16).** Rien de coupé, rien hors cadre, rien qui déborde de son parent (`m27` : 0 %
d'encre d'interface sur les quatre bords — les seuls pixels clairs des bords sont des fenêtres du
diorama). L'ordre de lecture tient : bouton or **1/902**. Tous les findings `R1` à `R3`, `R5`, `R7`,
`R9`, `R10` valent **à l'identique** (mesures citées des deux côtés). Écart propre à cette
résolution : la gouttière panneau → plaque vaut **37 px** contre **49 px** à 2400 (`R8`).

**1080×2400 (9:20) — la résolution cible.** Jugée comme capture principale. Rien de coupé non plus.
Le panneau garde **621 px** et la plaque **~150 px** : les 480 px de hauteur supplémentaires vont
**tous au décor**, qui passe de 1 095 px visibles au-dessus du panneau. Conséquence lisible : la
plaque « LA SUITE » ne pèse plus que **25,9 %** de la hauteur d'écran (37,8 % en maquette, 32,3 % à
1920), et l'écran se lit comme « une grande peinture avec une carte en bas ». **Ce n'est pas classé
en écart** : le panneau est ancré en bas, l'ordre de lecture est conservé (bouton or **1/1144**), et
la maquette n'a pas de témoin à ce rapport d'aspect. Je le signale parce qu'il change la respiration
de l'écran, et que la décision n'est pas la mienne.
Le r3 avait son BLOQUANT **propre à 2400** (bouton or 13ᵉ) : il est **fermé**, re-mesuré par
moi-même sur les nouvelles planches.

**Aucune troisième résolution fournie**, et aucune au rapport d'aspect de la référence (9:17,5).

---

## 6. Non vérifié

1. **Le facteur de teinte du diorama.** Mon instrument contre la texture source échoue à son propre
   contrôle positif (cf. plus haut). Ce qui trancherait, hors image : rendre la maquette avec
   `brightness(.46)` et refaire la comparaison appariée, ou disposer d'une capture du jeu à deux
   réglages ne différant que par ce facteur.
2. **Le rayon d'arrondi du PANNEAU.** Mes deux méthodes se contredisent entre résolutions (coin bas
   gauche : réf 7-9 px, 1920 12-13 px, 2400 2-7 px) — le décor derrière le coin brouille la
   détection. Je n'asserte rien. Ce qui trancherait : une capture sur fond uni. *(Même non-vérifié
   qu'au r3, et je n'ai pas fait mieux.)*
3. **La taille du losange sous le médaillon.** Ma fenêtre de mesure attrape le bas de l'anneau du
   médaillon ; le chiffre (réf 43×32 contre jeu 74×36) n'est pas opposable. C'est du chrome commun
   de toute façon : à mesurer avec les gardes du HUD v3.1, pas depuis ④.
4. **Animation.** Une seule capture par résolution ⇒ je ne peux ni constater ni infirmer un pixel
   qui bouge, ni dire si l'image figée tombe à un mauvais moment. Ce qui trancherait : deux captures
   du même état à T et T+1 s.
5. **Un seul état capturé** (jour 1, Aube, COLD, 3 lignes, 1 carte de file). Les cadres 0 à 3 de la
   maquette décrivent quatre autres états de ④ ; aucun n'a de capture. Celui qui m'inquiéterait est
   « rien à trancher », qui vide la plaque — et avec `R1`, une plaque vide ou à une seule rangée
   donnerait un bouton fantôme encore plus haut.
6. **La taille nominale des polices du client.** Je mesure des hauteurs de capitale et des rapports,
   jamais un corps. La maquette déclarant les **mêmes familles** que le client embarque (DejaVu),
   l'écart de `R2` n'est **pas** un arbitrage de police : il est réel. Ce qui donnerait la cause
   exacte : le corps appliqué par le client aux styles « sous-ligne » et « libellé de bouton ».
7. **Positions verticales absolues** : jamais comparées en px bruts (trois rapports d'aspect). Tout
   écart vertical de ce rapport est une distance entre deux repères.
8. **Chaînes différentes** du bandeau et de la carte de file (24 850 € / 10 000 € · Plein jour /
   Aube · Lt. Ilm / Lt. Marr) : je n'ai comparé que des hauteurs de capitale et des couleurs, jamais
   des chasses, sur ces blocs-là.
9. **La pastille FAMILLE** reste une question de **donnée**, pas de rendu — le dossier la déclare
   ASSUMÉE pour un compte neuf et la capture le confirme (0 px or) ; c'est au `juge-donnees` de dire
   si le compte devrait en avoir une.

---

## 7. Correspondance avec le r3 (15 écarts : 1 BLOQUANT, 4 MAJEUR, 10 MINEUR)

| r3 | intitulé | statut au r4 | mesure (re-exécutée par moi sur les nouvelles planches) |
|---|---|---|---|
| `G1` | **BLOQUANT** — fond non assombri, ordre de lecture inversé à 2400 | **FERMÉ**, et dépassé dans l'autre sens ⇒ `R4` | **Rang du bouton or : 1/902 (1920) et 1/1144 (2400)**, les 5 blocs les plus clairs sont tous le bouton (était 13/1144). Luminance d'écran **50,6 / 55,0 → 23,8 / 23,8** (réf 26,2). Pixels L≥90 **9,5 % / 12,8 % → 3,3 % / 2,6 %** (réf 3,9 %). `m33`, `m34` |
| `G2` | MAJEUR — un seul gris-ardoise (73,85,96) pour quatre rôles | **FERMÉ** | Les quatre rôles sont de nouveau distincts et chacun à ≤ 4/255 : liseré du panneau **(34,38,46)** / réf (33,38,50) · séparateur **(28,34,42)** / (29,34,44) · liseré TRANCHER **(42,53,71)** / (41,52,70) · fond de bouton fantôme **(22,28,34)** / (20,26,36). `m3`, `m5`, `m11`, `m15`, `m22` |
| `G3` | MAJEUR — boutons fantômes devenus plaques pleines | **FERMÉ quant au remplissage**, **rouvert quant à la hauteur** ⇒ `R1` | Remplissage **(22,28,34)** sur un verre à (13,13,22) ⇒ écart **+10** de luminance, exactement comme la maquette (+10). Le rapport des remplissages jeu/réf passe de ×3,05 à **×1,07**. `m10`, `m11` |
| `G4` | MAJEUR — libellé blanc froid à 2,81:1 | **FERMÉ** | Libellé **(234,224,200)** = le jeton exact, **0/255** d'écart ; contraste **13,07:1** contre 13,42:1 en référence (était 2,81:1). `m10`, `m15`, `m26` |
| `G5` | MAJEUR — bande d'eau en bleu-pétrole sous TRANCHER | **FERMÉ** | Médiane de la bande : réf **(13,22,31)** ; jeu **(13,21,33)** et **(13,21,32)** (était (28,55,74) / (29,59,79)). `m34` |
| `G6` | MINEUR — trois boutons de largeur fixe (324 px) | **FERMÉ** | Largeurs **267 / 267 / 221**, bord droit commun x 984. Les boutons épousent leur libellé. `m8`, `m11` |
| `G7` | MINEUR — rayon du bouton or ÷ 2,4 | **largement fermé**, reliquat ⇒ `R9` | Critère unique, contrôle positif sur les deux fantômes de la référence (20 et 20) : or réf **21** → jeu **17 / 16** (était 6-7). `m37` |
| `G8` | MINEUR — liseré du panneau deux fois trop contrasté | **FERMÉ quant au liseré** ; le reliquat est `R5` | Couleur du liseré **(34,38,46)** contre (33,38,50) : ≤ 4/255, épaisseur 3 px des deux côtés. Le rapport liseré/verre reste au-dessus (1,85 réf contre 2,58 jeu) **parce que le verre est plus sombre**, pas parce que le liseré est trop clair. `m3`, `m16`, `m30` |
| `G9` | MINEUR — rythme vertical comprimé de 22 à 35 % | **amélioré, pas fermé** ⇒ `R6` | Rangée 1 (seule à nombre de lignes identique) : **250 → 226 px, −9,6 %** (le r3 mesurait −23 à −34 % sur ses gouttières). Retrait haut : 47 → 37 px. `m4`, `m5`, `m6` |
| `G10` | MINEUR — panneau 30 % plus court | **amélioré, pas fermé** ⇒ `R6` | **795 → 621 px, −22 %** (était 810 → 564, −30 %). `m4`, `m5` |
| `G11` | MINEUR — interlettrage du bandeau réduit de moitié | **OUVERT, inchangé** — chrome commun **ASSUMÉ** | « ARGENT », chaîne identique : chasse **116 → 107**, gaps **[2,7,9,8,7] → [3,3,5,5,3]**, moyenne **6,6 → 3,8 (−42 %)**. À traiter avec les gardes du HUD v3.1, pas depuis ④ ⇒ non compté. `m38` |
| `G12` | MINEUR — médaillon +4 % | **OUVERT, inchangé** — chrome commun **ASSUMÉ** | Anneau or : réf x 380..699, y 22..226 ; jeu x 380..699, y 17..231 ⇒ même largeur, **+5 %** en hauteur. Centre **(539,124) des deux côtés**. Non compté. `m27` |
| `G13` | MINEUR — losange +42 % | **NON RE-MESURÉ proprement** — chrome commun **ASSUMÉ** | Ma fenêtre attrape le bas de l'anneau (réf 43×32, jeu 74×36) ⇒ chiffre non opposable, cf. § 6.3. Non compté. `m40` |
| `G14` | MINEUR — « LÉGÈRE » +19/255 trop clair | **FERMÉ** | Réf **(139,129,112)**, jeu **(140,130,114)** : **≤ 2/255** (était (157,149,129)). `m15` |
| `G15` | MINEUR — pastille FAMILLE absente | **ASSUMÉ par le dossier**, rendu propre | Réf 112 px or (497,1890)..(508,1901) ; jeu **0 px or** aux deux résolutions, rond identique à ses voisins. Question de donnée ⇒ `juge-donnees`. `m41` |

**Bilan : 8 fermés · 2 améliorés non fermés (`G9`/`G10` ⇒ `R6`) · 1 fermé-puis-rouvert-ailleurs
(`G3` ⇒ `R1`) · 1 fermé et dépassé dans l'autre sens (`G1` ⇒ `R4`) · 3 ASSUMÉS de chrome commun
restés tels quels (`G11`, `G12`, `G13`) · 1 ASSUMÉ de donnée (`G15`).**
Le r3 avait lui-même retiré les soulignés pointillés par arbitrage ; **je l'ai re-vérifié dans la
source avant d'écarter mes 9 observations** (cf. Arbitrages 1).

★ **Le motif qui mérite d'être noté** : les trois MAJEUR de ce tour sont tous dans du texte neuf.
`R1` vit **dans le correctif de `G6`** (épouser le libellé en largeur a fait épouser la rangée en
hauteur) ; `R3` vit dans une grandeur que le r3 avait classée **contrôle positif** (il avait mesuré
l'étendue et le centre du filet, pas sa loi de décroissance) ; `R4` est `G1` **corrigé d'un cran de
trop**.

---

## Annexes

### A1. Inventaire de la référence (cadre 4) — fiches

| id | catégorie | parent | bbox | forme | remplissage | bord | texte | relations |
|---|---|---|---|---|---|---|---|---|
| `C` | chrome haut | écran | (0,0)–(1079,146) | bandeau posé sur l'art | plaque sombre translucide, L=27,6 | filet laiton y 143..145, x 55..1024, (95,80,45) | — | flotte sur `A` |
| `C.argent` | libellé | `C` | (47,…)–(162,…) | caps interlettrées | (185,173,146) | — | « ARGENT », chasse **116**, gaps [2,7,9,8,7] | marge gauche 47 |
| `C.medaillon` | médaillon | `C` | anneau x 380..699, y 22..226, centre **(539,124)** | disque + anneau laiton | disque sombre, arc bicolore | — | « Tiède » / « CHALEUR » | chevauche l'art |
| `C.losange` | ornement | `C` | sous le médaillon, centre x 539 | losange | laiton | — | — | — |
| `A` | fond / décor | écran | plein cadre | quartier **peint**, tenu sombre | L moyenne **24,6** sur la bande visible ; **1,2 %** sous lum 10 | — | — | monte derrière le bandeau |
| `P` | plaque | écran | (48,825)–(1032,1620), **985 × 795** | rect. très arrondi | **dégradé vertical** (13,19,31) → (9,14,24) | liseré **(33,38,50)** 3 px + **filet laiton** sur le bord haut | — | 37,8 % de la hauteur |
| `P.filet` | filet laiton | `P` | y 827..829, plateau x **361..719**, rampes jusqu'à x 170 / 950 | trait 3 px **dégradé** | (176,141,62), R−B pic **114** | — | — | centré x 540 |
| `P.titre` | titre de section | `P` | (456,872)–(617,888) | caps interlettrées | (185,173,146) | — | « LA SUITE », capitale **17**, chasse **162** | centré ; 47 px sous le bord haut |
| `P.r1.titre` | titre de rangée | `P` | (99,948)–(606,976) | sérif | **(242,201,107)** | — | capitale **29**, chasse 506 | retrait gauche 99 |
| `P.r1.sous` | sous-ligne | `P` | (101,1007)–(414,1030) | sans | **(185,173,146)** | — | capitale **24** | 31 px sous la ligne de base du titre |
| `P.r1.cta` | bouton plein | `P` | (651,945)–(979,1036), **329 × 92** | rect. **rayon 21** | **dégradé** (231,194,104) → (203,157,59) | (138,97,28) 3 px | « COMMANDER » | calé à droite x 979 |
| `P.r2.cta` | bouton **fantôme** | `P` | (605,1159)–(979,1250), **375 × 92** | **pilule**, rayon 20 | **(20,26,36)** — +10 sur le verre | **(58,62,71)** 3 px | « VOIR LA VENTE » (234,224,200), capitale **21**, contraste 13,42:1 | calé à droite |
| `P.r3.cta` | bouton **fantôme** | `P` | (705,1418)–(979,1509), **275 × 92** | **pilule**, rayon 20 | **(18,23,34)** | (57,61,69) 3 px | « BLANCHIR », capitale **21** | calé à droite |
| `P.sep` | séparateur | `P` | y 1075 et 1334, x 100..979 | trait 3 px | **(29,34,44)** | — | — | 2 séparateurs, 880 px |
| `Q` | carte de file | écran | (46,1675)–(1033,1824), **988 × 150** | rect. arrondi | sombre | liseré **(41,52,70)** | « Lt. Ilm… » (218,209,185) capitale **25** / « LÉGÈRE » **(139,129,112)** / « TRANCHER » (236,196,104) capitale **23** | gouttière **52 px** sous `P` |
| `D` | dock | écran | ronds centrés 250/439/626/812 | 4 disques | dégradé sombre | liseré doux | libellés crème | écarts 189/187/186 |
| `D.pip` | pastille | `D` | (497,1890)–(508,1901), **112 px or** | disque | or | — | — | coin haut-droit de FAMILLE |

**Couche globale (réf)** : luminance moyenne **26,2** · L≥90 **3,9 %** · L≥140 **3,2 %** ·
L≥200 0,66 % · palette : (11,17,26) 23,6 % · (8,13,21) 21,5 % · (27,33,40) 20,9 % · (13,21,31)
14,0 % · (18,24,32) 12,2 % · (62,60,53) 7,8 % (somme 100,0 %) · densité d'encre (lum>70) **4,25 %**.
**Le bouton or est le bloc 90×90 le plus clair : rang 1 / 990.**

### A2. Inventaire de la capture (1080×1920 ; les écarts propres à 2400 sont notés)

| id | catégorie | bbox | forme | remplissage | texte | statut |
|---|---|---|---|---|---|---|
| `C` | chrome haut | (0,0)–(1079,143) | bandeau | L=24,3 | — | **ASSUMÉ**, rendu proprement |
| `C.argent` | libellé | (44,…)–(150,…) | caps | (185,173,146) | chasse **107**, gaps [3,3,5,5,3] | ASSUMÉ (chrome), interlettrage −42 % |
| `C.medaillon` | médaillon | anneau x 380..699, y 17..231, centre **(539,124)** | disque + anneau | — | « Froid » / « CHALEUR » | ASSUMÉ, +5 % en hauteur |
| `A` | fond / décor | plein cadre | quartier **peint, nuit** | L moyenne **20,0** sur la bande appariée ; **18,8 %** sous lum 10 | — | **ÉCART** `R4`, `R7` |
| `P` | plaque | (48,829)–(1032,1449), **985 × 621** | rect. arrondi | **(13,13,22) en aplat**, pas de dégradé | — | largeur **ÉGALE** ; hauteur `R6` ; verre `R5` |
| `P.filet` | filet laiton | y 822..824, x **215..864** à intensité **constante** | trait 3 px **plat** | (176,141,61), R−B **115** | — | couleur/épaisseur/centre **ÉGAUX** ; loi de décroissance `R3` |
| `P.titre` | titre de section | (467,866)–(613,881) | caps | **(185,173,146)** | capitale **16**, chasse 147 | **ÉGAL** ; 37 px sous le bord haut (`R6`) |
| `P.r1.titre` | titre de rangée | (97,938)–(569,965) | sérif | **(242,201,106)** | capitale **28** | **ÉGAL** |
| `P.r1.sous` | sous-ligne | (96,996)–(358,1014) | sans | **(185,173,146)** | capitale **19** | couleur **ÉGALE** ; taille `R2` |
| `P.r1.cta` | bouton plein | (718,931)–(984,1020), **267 × 90** | rect. rayon **17** | dégradé (231,194,103) → (204,158,60) | « COMMANDER » | dégradé/hauteur **ÉGAUX** ; rayon `R9` |
| `P.r2.cta` | bouton fantôme | (718,1090)–(984,1208), **267 × 119** | rect. arrondi, rayon 18 | **(22,28,34)** | « VOIR LA VENTE » (234,224,200), capitale **18**, contraste 13,07:1 | remplissage/couleur **ÉGAUX** ; **hauteur `R1`** ; taille `R2` |
| `P.r3.cta` | bouton fantôme | (764,1278)–(984,1410), **221 × 133** | rect. arrondi, rayon 19 | **(22,28,34)** | « BLANCHIR », capitale **18** | idem — **221 × 133, presque carré** |
| `P.sep` | séparateurs | y 1054-1055 et 1243, x 94..984 | trait 2-3 px | **(28,34,42)** | — | **ÉGAUX** (couleur et étendue) |
| `Q` | carte de file | (47,1487)–(1032,1635), **986 × 149** | rect. arrondi | sombre | « Lt. Marr… » (218,209,188) capitale **21** / « LÉGÈRE » **(140,130,114)** / « TRANCHER » (233,197,106) capitale **19** | géométrie et couleurs **ÉGALES** ; capitales `R2` ; gouttière `R8` |
| `D` | dock | ronds centrés 258/446/633/820 | 4 disques | — | — | **ASSUMÉ**, écarts 188/187/187 |
| `D.pip` | pastille | — | — | — | — | **ABSENTE** — ASSUMÉ (compte neuf) |

**Couche globale (jeu 1920)** : luminance moyenne **23,8** · L≥90 **3,3 %** · L≥140 2,6 % · L≥200
0,59 % · palette : (13,14,23) 26,1 % · (23,29,37) 22,3 % · (15,21,30) 20,8 % · (8,10,19) 12,8 % ·
(10,16,26) 10,4 % · (67,61,50) 7,6 % (somme 100,0 %) · densité d'encre **3,66 %**. **Bouton or :
rang 1 / 902.**
**Couche globale (jeu 2400)** : luminance moyenne **23,8** · L≥90 **2,6 %** · densité d'encre
**3,22 %**. **Bouton or : rang 1 / 1144.**

### A3. Correspondance des repères

- **Horizontale** : 1:1 entre les trois images (1080 px de large partout). Aucune normalisation.
- **Verticale** : aucune position absolue comparée. Repères utilisés — bord haut du panneau
  (réf 825 · 1920 829 · 2400 1235), séparateur 1 (1075 · 1054,5 · 1461,5), séparateur 2
  (1334 · 1243 · 1649,5), bord bas du panneau (1620 · 1449 · 1856), bord haut de la plaque
  (1675 · 1487 · 1906).
- **Diorama** : homographie `REF = 1,0910 × JEU + (−48, +3)`, corrélation **+0,973**, contrôle
  négatif (référence retournée) **−0,060**. C'est elle, et elle seule, qui autorise les comparaisons
  de luminance du § `R4` — sans elle on comparerait deux cadrages différents.
- **Échelle de la maquette** : 1080 px = 300 px CSS, soit **×3,6**. Valeurs CSS citées pour
  *nommer* les grandeurs, jamais pour contredire l'image.

### A4. Scripts — `mesures/*.py`, chacun avec sa sortie collée dans `mesures/sortie-*.txt`

| script | ce qu'il mesure |
|---|---|
| `m1`, `m2`, `m3`, `m4` | repères : profils de luminance, filet laiton, bords du panneau, séparateurs |
| `m5`, `m6` | rythme vertical du panneau, bandes d'encre de la colonne de texte |
| `m7`, `m8` | bouton or : bbox, dégradé, bord, rayon |
| `m9`, `m10`, `m11` | boutons fantômes : bbox par la couleur du bord, remplissage, hauteur |
| `m12`, `m13`, `m14` | hauteurs de capitale (dont la séparation d'avec le souligné pointillé) |
| `m15` | encre des textes et aplats |
| `m16` | bord haut du panneau sous et hors le filet |
| `m17`, `m18`, `m19`, `m20` | appariement du diorama, luminance sur le même contenu, nature du déficit |
| `m21` | présence / absence des soulignés pointillés (compte de transitions) |
| `m22`, `m23` | plaque TRANCHER, filet du bandeau, dock |
| `m24` | couche globale : palette, luminance, densité, translucidité, near-black |
| `m25` | panneau en contraste étiré (`ref_verre.png`, `cap_verre.png`) |
| `m26` | contrastes WCAG des 7 textes |
| `m27` | médaillon et contrôle « rien n'est coupé au cadre » |
| `m28` | profil du filet laiton et centrage de « LA SUITE » |
| `m29` | étendue des séparateurs |
| `m30` | dégradé vertical du verre |
| `m31`, `m35` | planches de comparaison 1:1 (`duo_filet.png`, `duo_boutons.png`, `duo_decor.png`) |
| `m32` | chasse normalisée par la capitale (chaînes identiques) |
| `m33` | **`m25` du r3 re-exécuté** sur les nouvelles planches : rang du bouton or, palette |
| `m34` | **`m2` du r3 re-exécuté** sur les nouvelles planches : fond peint par bandes |
| `m36` | **ÉCHOUE À SON CONTRÔLE POSITIF** — gain contre la texture source ; conservé pour cette raison |
| `m37` | rayons, un seul critère, contrôle positif sur les deux fantômes de la référence |
| `m38` | typo du bandeau (ASSUMÉ chrome) |
| `m39` | nature du déficit de luminance et simulation des correctifs |
| `m40`, `m41` | losange, pastille FAMILLE |
