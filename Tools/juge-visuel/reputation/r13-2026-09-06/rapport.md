# Juge visuel ⊥ — ㊲ La réputation (« le miroir ») — r13 — 2026-09-06

## Verdict : NON APPROUVÉ

Le lot a **bien fermé B1** (le CTA ne passe plus sous le dock à 1920), mais il l'a fermé en remontant
le cadre de 88 px, ce qui **ouvre une collision neuve avec le chrome** à cette même résolution ; la
**coiffe reste ouverte** sur ses trois grandeurs (je tranche : NON FERMÉE), et le **halo des compteurs**
est bien celui du r12 — alpha ×2,1, rayon ×1,6, lumière ajoutée ×5,2.

## Convention de bord — déclarée

| objet mesuré | convention |
|---|---|
| filets, boîtes, rails | première et dernière rangée/colonne où le prédicat de matière est vrai (or : `r>120 ∧ g>90 ∧ b<120 ∧ r>b+55 ∧ r≥g` ; filet de panneau : ≤ 8/255 de `(42,54,72)` REF / `(42,53,73)` JEU) ⇒ **bord EXTÉRIEUR du filet** |
| masses (coiffe, peau, contour, torse, col, cadran) | classement au **plus proche nominal** parmi les matières relevées à l'histogramme de la carte ⇒ la frontière tombe **à mi-chemin entre deux teintes nominales** — c'est le « mi-alpha nominal » du r12 |
| textes | encre = distance de Chebyshev > 30 au fond du **panneau** ; hauteur de capitale = hauteur du bloc de rangées porteuses |
| halo | excès de luminance (0,2126 R + 0,7152 G + 0,0722 B) par distance de Chebyshev à l'encre, ligne de base = médiane des px à d ≥ 30 **dans la boîte du compteur** |
| aplats | médiane d'une fenêtre 9×9 (3×3 pour un filet de 3 px), jamais un px isolé |

## Correspondance des repères

- **Échelle du contenu : 1,00.** Référence et captures sont toutes deux à ×3,6 (300 CSS = 1080 px).
  Aucune conversion : un écart de taille sur le contenu est un écart réel.
- **Ancre verticale : le filet HAUT du cadre.** REF `y=452` · capture 2400 `y=482` · capture 1920 `y=162`.
  Toute grandeur verticale de ce rapport est donnée en **offset par rapport à cette ancre**.
- **Ancre horizontale : le rail gauche du cadre.** REF `x=21` · captures `x=18`.
- **Chrome** : canon HUD ramené ×0,9184 (1176 → 1080 px). Contrôle : le filet du bandeau tombe
  à `y=141` des **deux** côtés (`mesures/m18_chrome.py`).
- **Témoin retenu** : cadre **#120** (`reference-1080x2102.png`), l'état VIERGE — la capture montre
  bien l'état vierge (« UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ », 4 voyants éteints, « Rien n'a
  encore déteint », CTA « DONNER UNE PREMIÈRE RÈGLE »). Les cadres `etats/m-119…124` ne sont pas les
  homologues.
- **Polices : aucune substitution sur cet écran.** La source série 6 demande `'DejaVu Sans'` et
  `'DejaVu Serif'` (`chassis6.py:104,115,116,121…` · `generateur-reputation.py:73,76,85,89…`), qui sont
  exactement ce que le client embarque. ⇒ **les écarts de graisse et de chasse sont opposables ici**,
  ils ne relèvent PAS de l'arbitrage `Georgia → Noto` du dossier.

## Contrôle positif — ce que l'instrument trouve ÉGAL (24 grandeurs)

| # | grandeur | réf | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet à filet | 452..2078 = **1627 px** | 482..2109 = **1628 px** | +1 px | `m01`,`m08` |
| 2 | carte portrait, filet or hors-tout | 82..505 = **424 px** | 78..502 = **425 px** | +1 px | `m04` |
| 3 | gouttière carte → tuiles | **36 px** | **36 px** | **0** | `m21` |
| 4 | **13 aplats sur 13** (fond de cadre, enseigne, boîte de compteur, panneau élastique, carte, torse, panneau bas, boîte du CTA, filet or du cadre, filet de tuile, peau, crème, cyan) | — | — | **≤ 6/255**, 10 sur 13 à ≤ 3 | `m14` |
| 5 | profil du fond du cadre sur 8 hauteurs (offsets 10 → 1600) | — | — | **≤ 4/255** — le dégradé du cadre est conforme (ferme r9 F11) | `m14` |
| 6 | peau · crème du col · cyan des chiffres · libellé de compteur | (185,173,146) · (234,224,200) · (127,212,217) · (138,151,156) | idem | **0/255** | `m14`,`m07` |
| 7 | filet or du cadre | (176,141,62) | (176,141,61) | **1/255** | `m14` |
| 8 | titre « Le miroir » : capitale · largeur d'encre · contraste | 48 px · 417 px · 11,55:1 | 48 px · 419 px · 11,55:1 | 0 px · +0,5 % · 0,00 | `m16` |
| 9 | sous-titre : capitale · largeur · contraste | 41 px · 776 px · 8,31:1 | 41 px · 768 px · 8,19:1 | 0 · −1,0 % · −0,12 | `m16` |
| 10 | libellé de la carte portrait : 2 lignes, hauteurs · largeurs | 18/16 px · 227/166 px | 18/16 px · 220/164 px | ≤ 7 px | `m16` |
| 11 | « Il vous écoute » : capitale · largeur · contraste | 26 px · 240 px · 7,23:1 | 26 px · 242 px · 7,38:1 | 0 · +0,8 % | `m16` |
| 12 | titre du panneau bas (sérif) : capitale · largeur · contraste | 38 px · 612 px · 13,57:1 | 38 px · 607 px · 13,85:1 | 0 · −0,8 % | `m16` |
| 13 | libellé du CTA : capitale · largeur · contraste | 30 px · 611 px · 11,22:1 | 29 px · 607 px · 11,44:1 | −1 px · −0,7 % | `m16` |
| 14 | panneau bas : nombre de lignes | 5 | 5 | **0** | `m16` |
| 15 | gouttières entre les 4 tuiles | 14 / 15 / 15 px | 15 / 14 / 15 px | ≤ 1 px | `m17` |
| 16 | épaisseur de la ligne de balayage | 8 px | 7 px | 1 px | `m03` |
| 17 | position du reflet dans le panneau élastique | **31,6 %** de la hauteur | **29,3 %** | tiers haut des deux côtés ⇒ ASSUMÉ tenu | `m19` |
| 18 | le col reste un TRIANGLE (remplissage aire/boîte) | 0,403 | 0,394 | ⇒ ASSUMÉ tenu (0,9 aurait dit « pas un triangle ») | `m17` |
| 19 | axe du col vs axe du buste | centre x 293,0 | centre x 290,5 | 2,5 px | `m17` |
| 20 | tiret « ENFREINTES » : couleur · centrage dans sa boîte | (127,212,217) · — | (127,212,217) · **−0,5 px** | ⇒ ASSUMÉ tenu (un trou se lit comme un trou) | `m19` |
| 21 | la mention « lieutenant.name — non projeté (L0.4) » | **présente** dans la maquette | **ABSENTE** en jeu | ⇒ ASSUMÉ tenu, le nom du compte est projeté | `m16` |
| 22 | luminance moyenne du cadre entier | 32,15 | 31,93 | **−0,7 %** | `m13` |
| 23 | filet du bandeau (chrome) | canon ramené y=141 | capture y=141 | **0 px** | `m18` |
| 23-bis | garde entre le bas du CTA et le filet bas du cadre, à 2400 | **30 px** | **30 px** | **0 px** | `m01` |
| 24 | planches « écran seul » : rien de coupé en haut ni en bas (3 planches) | — | 0 px d'encre aux rangées 8 et H−9 | **rien hors cadre** | `m19` |

**Contrôles négatifs exécutés** (un instrument qui ne discrimine pas ne mesure pas) : le halo mesuré
autour du **libellé crème** du même compteur rend **−1,3 à +0,2 pt** dans la référence (`m07`) ; une
boîte de fond pur rend **0 ligne de texte** (`m16`) ; la sonde de crème dans une zone sans col rend
**None** (`m17`) ; la sonde de filet dans un aplat rend **0 colonne** (`m21`) ; `T` contre lui-même
rend **0 px** (`m11`) ; la bande morte du 2400 ne contient **0 filet de panneau** (`m12`).

## 0. L'écran, tel que la maquette le dit

**But** — c'est le miroir : on vient lire ce que le lieutenant a *absorbé* des règles qu'on lui a
données. On ne vient pas y agir, on vient y **constater** ; le seul geste offert est en bas, une fois.

**Ordre de lecture** — (1) le titre sérif or « Le miroir », seul élément or vif de la moitié haute,
48 px de capitale sur un panneau calme ; (2) les **trois compteurs** cyan, la seule couleur froide
saturée de l'écran, alignés en rang ; (3) le **portrait**, masse claire unique sur fond sombre, qui
tient toute la colonne gauche ; (4) la colonne droite, quatre tuiles éteintes qui répondent aux
compteurs ; (5) le verdict en prose, sérif crème ; (6) le CTA or, en bas, seul bouton.

**Zones** — enseigne (identité) · rang de compteurs (le chiffre) · panneau élastique en deux colonnes
(portrait ↔ tuiles) · panneau de verdict (la phrase) · CTA.

**Traits d'identité** — (a) le **portrait** ; c'est le seul écran du jeu qui est un portrait ;
(b) la **coiffe qui encadre le visage** et le pose comme un buste dessiné, pas comme un pictogramme ;
(c) le rang de **trois compteurs cyan sur plaques sobres** ; (d) le **calme** : de grands aplats
très sombres, une seule famille chaude (l'or) et une seule froide (le cyan), aucune lueur diffuse ;
(e) le **reflet** discret qui passe en haut du panneau et dit « miroir ».

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour la structure, non pour deux des cinq traits d'identité. L'inventaire est complet : rien
d'absent, rien en trop dans le contenu (à 2400), les mêmes libellés en français, les mêmes couleurs
(12 aplats sur 13 à ≤ 6/255, luminance moyenne à −0,7 %), la même typographie (titre 48 px et
417→419 px d'encre : les deux côtés partagent DejaVu). Le but et l'ordre de lecture tiennent.

Ce qui a changé, un joueur le voit sans côte à côte. **Premièrement, les compteurs ne sont plus des
plaques sobres : ce sont trois lampes.** Le halo est ×2,1 en amplitude et ×1,6 en portée ; il déborde
de la boîte du chiffre jusqu'à recouvrir son propre libellé — mon détecteur de lignes, qui trouve
deux lignes dans la maquette, n'en trouve **plus qu'une** en jeu, parce que la lueur comble
l'interligne. Le fond derrière les chiffres passe de (26,42,50) à (53,89,94) et leur contraste de
**8,67:1 à 4,49:1**. Le trait (d), « le calme », est cassé — et c'est le deuxième objet de l'ordre de
lecture. **Deuxièmement, la coiffe n'encadre plus le visage** : là où la maquette pose 20 px de
sombre le long des tempes, le jeu en pose **1**, le sommet du crâne n'est plus pincé (80 % de la
largeur atteints à 16 px sous le sommet contre 35), et sur **6 rangées** la peau touche directement
le fond de la carte, sans contour. Le buste dessiné devient un pictogramme à bonnet posé. C'est le
trait (a)+(b), donc le héros de l'écran. **Troisièmement, le reflet n'est plus un reflet mais une
barre** : +58,6 % de long, il traverse maintenant le panneau de bord à bord (84 % de sa largeur
contre 54 %) en coupant le portrait ; c'est bien la ligne de balayage du r12, pas un objet neuf.

À cela s'ajoutent deux défauts de mise en page qui sont, aux deux résolutions, **les deux faces du
même mécanisme** : à 2400 le cadre laisse **340 px** de bande morte sous le bandeau et n'occupe que
**79,9 %** de la zone libre (contre 97,5 % dans la maquette) ; à 1920 il est au contraire collé à
20 px du filet, si bien que le **losange or du chrome se pose sur le titre** et que les anneaux du
médaillon traversent le panneau d'enseigne. Enfin l'écran **n'est pas stable** : 47 988 px (2,31 %)
bougent entre T et T+1 s parce que le nom du lieutenant arrive après la première frame.

Les trois écarts de tête, par impact perçu : **le halo des compteurs** · **la coiffe** · **le chrome
qui tombe dans le cadre à 1920**.

## Ce que le lot déclare — vérifié un par un

| ce que le lot déclare | mon verdict | mesure |
|---|---|---|
| **B1 fermé** : cadre remonté de 88 px, bas 1737 → 1649, sous la fin de zone libre 1681 | **FERMÉ** — mais avec deux conséquences non déclarées (voir `M3` et `M5`) | 1920 sous chrome : filet haut du cadre **162..164** (250 − 88 ✓) ; bas du CTA **1646..1649** (1737 − 88 ✓) ; **première encre du dock y=1699** ⇒ **50 px de dégagement**. Zone libre 142..1698 = 1557 px ; contenu (cadre + CTA) 162..1649 = 1488 px. (`m08`) |
| **M5 la coiffe** : correctif structurel (fenêtre de masque aux dimensions de la coiffe) ; le correcteur ne prétend pas l'avoir fermé et me demande de trancher | **NON FERMÉE** — les trois grandeurs restent hors tolérance ; deux sont inchangées, une s'améliore de 8 → 6 rangées | épaisseur latérale à 15 % : **20/20 px → 1/1 px** (r12 : 19-20 → 0) · sommet à 80 % : **35 px → 16 px** (r12 : 30 → 17) · rangées de crâne nu : **0 → 6** (r12 : 0 → 8). (`m05`,`m06`) |
| **M1 le halo** : inchangé délibérément ; le modèle analytique prédit un rapport de **8,1**, le r12 mesurait **2,9** | **INCHANGÉ**, et **8,1 n'est atteint à aucune distance ≤ 30 px** ; le rapport jeu/canon va de **2,32** (d2) à **≈5** (d26-30) | profil et décomposition ci-dessous ; **ni l'alpha ni le rayon ne suffit seul** |
| **une ligne cyan horizontale traverse le portrait** (signalé à l'œil, non diagnostiqué) | **c'est bien la ligne de balayage** (le « reflet »), au même endroit relatif, **+58,6 % plus longue** | pic REF y=1090 / JEU y=1104 ; position **31,6 % → 29,3 %** de la hauteur du panneau ; étendue à 25 % du pic **524 px (x264..787) → 831 px (x137..967)** ; à 10 % **805 px → 968 px (x56..1023)**, soit la largeur du panneau (46..1033) atteinte. (`m03`,`m19`,`m21`) |
| **la paire T / T+1 s** : au r12, 47 196 px bougeaient ; le nom arrivait après la 1ʳᵉ frame | **INCHANGÉ** : **47 988 px (2,314 %)**, et **non**, le nom n'est pas là à T | ≥ 8/255 : 44 182 · ≥ 32/255 : 20 419 · max 221/255 en (252,968) · colonnes mobiles (≥ 8/255) **x 147..434**, toutes dans la carte portrait. Libellé de la carte : **1 ligne à T (y 615..629) → 2 lignes à T+1 s (615..631 + 638..653)**. Les 4 autres planches portent déjà les 2 lignes. (`m11`,`m19`) |

## La coiffe — méthode d'isolement et verdict

**Ce qui rend cette mesure difficile, et comment je l'ai contourné.** La coiffe `(22,25,27)` REF /
`(22,22,28)` JEU et le fond de carte `(17,24,35)` / `(13,22,34)` ne sont séparés que de **8 et 9/255**
en Chebyshev : aucun seuil « distance au fond » ne les distingue (une première version de `m06`
utilisant un seuil de 12 a rendu une silhouette **vide** au-dessus de la ligne de balayage, et a pris
la ligne elle-même pour le sommet du crâne — l'échec est imprimé dans l'en-tête du script). Et la
**ligne de balayage** éclaire la coiffe en `(45,67,69)` / `(54,89,93)`, ce qui la rend *plus proche du
fond que d'elle-même* : elle **coupe la silhouette en deux**, et une mesure par composante connexe
repart du morceau du bas.

**Isolement retenu** — classement de chaque px de la carte au **plus proche nominal** parmi les cinq
matières relevées à l'histogramme (`m02`) : fond, peau, contour, coiffe, crème. `SOMBRE = {contour,
coiffe}`. Le **visage** est la plus grande composante connexe de PEAU (le libellé « LT. … » en est une
autre, plus petite : il est écarté sans réglage de seuil ; le cou y est rattaché, mais ses rangées font
54-56 px et les rangées du visage ≥ 60 px). La **tête** est mesurée **rangée par rangée**, sans
connexité, pour que l'exclusion des rangées de balayage (REF 1078..1095, JEU 1093..1110) ne coûte que
ces rangées-là. Contrôle positif : la largeur max du visage rend **126 px (REF) / 138 px (JEU)** et la
largeur max de la silhouette **153 px des deux côtés** — deux instruments indépendants (`m05` par
composante, `m06` par rangée) tombent sur la même valeur.

| grandeur | référence | jeu | r12 (pour mémoire) | verdict |
|---|---|---|---|---|
| **épaisseur latérale de sombre à 15 % de la hauteur du visage** | **20 / 20 px** | **1 / 1 px** | 19-20 → 0 | inchangé |
| profil complet (5/10/15/20/30/50 %) | 26/26 · 23/23 · **20/20** · 16/16 · 11/12 · 11/11 | 18/18 · 2/1 · **1/1** · 10/10 · 9/10 · 9/10 | — | le creux de 10 % à 15 % est intact |
| **hauteur sous le sommet où 80 % de la largeur max est atteinte** | **35 px** | **16 px** | 30 → 17 | inchangé |
| pincement (4/8/16/32 px sous le sommet, en % du max) | 34,0 · 45,8 · 60,1 · 78,4 % | 53,6 · 65,4 · 80,4 · 96,1 % | 38,5/50,0/63,5/81,8 → 52,9/64,5/79,4/95,5 | inchangé |
| **rangées où la peau touche le fond SANS contour** | **0** | **6** (y 1136..1144, soit 12 %..19 % du visage, côtés G et D) | 0 → 8 | amélioré de 2 rangées |

⇒ **Je tranche : M5 n'est PAS fermée.** Le correctif structurel n'a pas changé la forme de la coiffe ;
il a au mieux raccourci de deux rangées la bande où le crâne sort du dessin. Ce n'est **pas** un écart
de couvre-chef (l'arbitrage `fedora`/`casquette` du dossier ne s'applique pas : les deux côtés dessinent
la même calotte sombre) — c'est la **géométrie** de cette calotte : sommet plat au lieu de pincé,
et pas de descente sur les tempes.

## Le halo des compteurs — profil, rapport, et ce qui domine

Compteur 1 (« RÈGLES DONNÉES »), boîtes intérieures mesurées au gradient : REF `x54..358 × y706..812`,
JEU `x50..356 × y731..837`. Les px du libellé crème sont exclus ; les comptes par distance sont
comparables des deux côtés (361-425 px à d2, 226-237 à d30) ⇒ **la population n'explique pas l'écart**.

| d (Chebyshev) | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 22 | 26 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **réf** (pts de luminance) | +28,1 | +25,4 | +17,9 | +13,4 | +10,9 | +8,6 | +6,9 | +5,3 | +4,2 | +4,7 | +1,9 | +1,4 |
| **jeu** | +65,0 | +63,5 | +52,2 | +41,8 | +35,6 | +31,6 | +27,9 | +24,3 | +20,7 | +19,3 | +8,9 | +7,4 |
| **jeu / réf** | **2,32** | 2,50 | 2,92 | 3,11 | 3,28 | 3,66 | 4,07 | 4,57 | 4,97 | 4,07 | 4,78 | **5,17** |

- **Contraste des chiffres** : **8,67:1 → 4,49:1** (fond local de l'anneau d2..d4 : `(26,42,50)` → `(53,89,94)`).
  Le seuil de doctrine pour un grand texte est 3:1 : **le jeu passe encore**, mais il a perdu **48 %** de son contraste.
- **Portée** : dernière distance où l'excès dépasse +5 points — **d=16 (réf) → d=30 (jeu)**.
- **Ce qui domine.** Ajustement `A·exp(−d/λ)` sur d2..d12 : réf `A = 38,0 pts, λ = 8,01 px` ;
  jeu `A = 81,2 pts, λ = 12,56 px`. ⇒ **alpha ×2,13 · rayon ×1,57 · lumière totale ajoutée (A·λ²) ×5,2**.
  **Aucun des deux ne domine seul** : le rapport n'est pas constant avec la distance (il irait de 2,32
  partout si seul l'alpha avait bougé) et il ne tend pas vers 1 en d→0 (ce qu'il ferait si seul le
  rayon avait bougé). Concrètement : ramener **l'alpha seul** au canon (÷2,13) laisserait un halo encore
  **1,57× trop large**, qui porterait encore ≈ +10 pts à d=20 là où la maquette est à +1 ; ramener le
  **rayon seul** laisserait le contraste des chiffres vers 5,5:1 au lieu de 8,67:1.
  **Le rapport de 8,1 du modèle du correcteur n'est atteint à aucune distance ≤ 30 px** sur cette planche.
- **Preuve indépendante de la portée, sans aucun réglage de seuil** : mon inventaire automatique de
  lignes (`m16`) trouve **2 lignes** dans la boîte du compteur de la référence (chiffres y724..762,
  libellé y780..798) et **1 seule** en jeu (y747..823, h=77) — la lueur comble les 25 px d'interligne
  et **soude le chiffre à son libellé**.
- **Le compteur 3 est le pire cas** : pour un tiret de **4 px** de haut, l'excès est **+88,1 à d2** et
  **encore +17,5 à d30** (référence, avec « 00 » : +28,1 → +2,4). Le halo est de rayon fixe,
  indépendant du glyphe : un tiret de 185 px d'encre produit un disque lumineux.

## Animation — la paire T / T+1 s

Ruling user 2026-08-27 : **aucune animation sur un nouvel écran**. La paire est fournie (écran seul, 1920).

```
px ≥ 1/255 : 47 988  (2,314 %)   ·   ≥ 8/255 : 44 182   ·   ≥ 32/255 : 20 419
max 221/255 en (252, 968)        ·   colonnes mobiles (≥8/255) x 147..434  — toutes dans la carte portrait
blocs de rangées mobiles : 615..632 (libellé, ligne 1) · 638..653 (ligne 2 QUI APPARAÎT) · 707..1165 (le buste descend)
contrôle positif : T vs la planche SOUS CHROME de la même résolution → 58 457 px (échantillon 1/9)
contrôle négatif : T contre lui-même → 0 px
```

**Mécanisme** : le libellé de la carte passe de **1 ligne** (`y 615..629`) à **2 lignes**
(`615..631` + `638..653`) — « LT. TULL, » n'est pas là à T — et tout le portrait descend. Le nom
arrive **après** la première frame. Aucun chrome n'est exclu de ce compte : la paire est « écran seul ».
Les quatre autres planches portent déjà les deux lignes.

## 3. Écarts

Tous les écarts de cette table sont des écarts de **FORME** (géométrie, palette, typographie,
espacement, rythme, effet) : ils sont vrais quelles que soient les données. La seule exception est
`M8`, dont le déclencheur est l'arrivée d'une donnée — mais l'instabilité elle-même est une propriété
de l'écran. Les observations qui dépendent du compte photographié sont hors table (section
« Ce qui dépend des données »).

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `M1` | MAJEUR | DÉJÀ APPLIQUÉ | Le halo des compteurs n'est plus une ombre de texte : c'est un disque flou qui comble l'interligne et soude le chiffre à son libellé | alpha **×2,13** (A 38,0 → 81,2 pts), rayon **×1,57** (λ 8,01 → 12,56 px), lumière ajoutée **×5,2** ; portée à +5 pts **d16 → d30** ; contraste des chiffres **8,67:1 → 4,49:1** ; fond local **(26,42,50) → (53,89,94)** ; boîte du compteur : **2 lignes → 1** (`m07`,`m16`,`m20`) | la **valeur** du paramètre en cause ; je constate l'effet, pas son réglage. Le rapport « 8,1 » du modèle du correcteur n'est réfuté que sur **cette** planche et pour **d ≤ 30 px** |
| `M2` | MAJEUR | DÉJÀ APPLIQUÉ | La coiffe n'encadre plus le visage : pas de descente sur les tempes, sommet plat, crâne nu sur 6 rangées | 15 % : **20/20 → 1/1 px** · sommet à 80 % : **35 → 16 px** · rangées de crâne nu : **0 → 6** (y 1136..1144) (`m05`,`m06`) | si la calotte est un asset ou un tracé procédural ; la question de couvre-chef (le dessin est le même des deux côtés, donc l'arbitrage DA ne s'applique pas) |
| `M3` | MAJEUR | **NOUVEAU** | **1920 sous chrome** : le cadre remonte à 20 px du filet du bandeau ⇒ le **losange or du chrome se pose sur le titre** et les anneaux du médaillon traversent le panneau d'enseigne | à 2400 le chrome laisse sous son filet : médaillon **y143..203**, losange **x531..548 × y215..231** (18×17 px, `(176,141,61)`). À 1920 le cadre commence à **y=162** ⇒ le losange ajoute **162 px d'or** dans le panneau d'enseigne là où le contenu seul en porte **0**, sur les rangées du titre ; l'anneau du médaillon pose **138 px** d'or à y172..200 dans le panneau (`m09`,`m10`) | si le shell prévoit un `TopInset` différent à 16:9 ; je constate la collision sur l'image |
| `M4` | MAJEUR | DÉJÀ APPLIQUÉ | **2400 (résolution cible)** : 340 px de bande morte entre le bandeau et le cadre ; le cadre n'occupe que 79,9 % de la zone libre | zone libre **142..2179 = 2038 px** ; cadre **482..2109 = 1628 px** ⇒ **79,9 %**, contre **1627/1668 = 97,5 %** dans la maquette. Gouttière haute **+340 px**, basse **71 px** (`m08`) | — |
| `M5` | MAJEUR | DÉJÀ APPLIQUÉ | **1920** : le CTA déborde de 24 px **sous** le filet bas du cadre et le **masque** sur toute sa largeur (seuls les deux angles du cadre restent visibles) | filet bas du cadre **y1622..1625** (rail gauche 167..**1623**) ; bas du CTA **1646..1649**. À 2400, CTA **1989..2076** dans le cadre **482..2109**, garde de **30 px** — exactement celle de la maquette : conforme (`m08`) | — |
| `M6` | MAJEUR | DÉJÀ APPLIQUÉ | Le reflet n'est plus un reflet : la ligne de balayage traverse le panneau de bord à bord en coupant le portrait | étendue à 25 % du pic **524 px (x264..787) → 831 px (x137..967)**, **+58,6 %** ; à 10 % **805 → 968 px (x56..1023)** pour un panneau large de **988 px** ⇒ **84 %** de la largeur contre **53 %** ; pic d'excès 67,5 → 55,0 ; épaisseur 8 → 7 px (`m03`,`m21`) | — |
| `M7` | MAJEUR | DÉJÀ APPLIQUÉ | Le pied du panneau élastique reste vide : les deux colonnes ne finissent pas ensemble | vide sous la 4ᵉ tuile **165 px = 21,5 % → 245 px = 31,2 %** ; vide sous la carte **79 → 95 px** ; panneau `.elast` **766 → 784 px (+18)**, pile de 4 tuiles **447 → 414 px (−33)** (`m12`,`m17`) | — |
| `M8` | MAJEUR | DÉJÀ APPLIQUÉ | L'écran n'est pas stable : 2,31 % des px bougent entre T et T+1 s (ruling : aucune animation) | **47 988 px** ≥ 1/255, **20 419** ≥ 32/255, max **221/255** ; libellé **1 → 2 lignes**, buste décalé ; colonnes mobiles x 147..434 (`m11`) | ce qui se passe **au-delà** de T+1 s (une seule paire fournie) |
| `M9` | MAJEUR | DÉJÀ APPLIQUÉ | Le gras **sans-empattement** porte 15 à 25 % d'encre en moins à largeur et capitale égales ; le sérif, lui, en porte autant ou plus. **Mêmes polices des deux côtés** ⇒ ce n'est pas un arbitrage | à largeur d'encre égale (≤ 1 %) : CTA **7 334 → 6 075 px (−17,2 %)** · sous-titre **6 701 → 5 580 (−16,7 %)** · sur-titre du panneau bas **3 690 → 3 119 (−15,5 %)** · libellé de carte **2 980 → 2 225 (−25,3 %)**. Témoins sérif : titre **5 650 → 6 170 (+9,2 %)** · « Il vous écoute » **2 351 → 2 544 (+8,2 %)** · titre du panneau bas **9 438 → 9 094 (−3,6 %)** (`m16`) | le mécanisme (graisse synthétique, rendu SDF, ou autre) — hors image |
| `M10` | MAJEUR | DÉJÀ APPLIQUÉ | Les tuiles sont 8 % plus courtes et leur rythme se resserre ; le rembourrage a fondu, pas la typo | hauteurs **101/101/100/101 → 93/92/93/92 px** ; pas haut-à-haut **115/116/115 → 108/106/108** ; gouttières 14/15/15 → 15/14/15 ; largeur **456 → 463 px (+1,5 %)** (`m12`,`m17`,`m21`) | — |
| `m1` | MINEUR | DÉJÀ APPLIQUÉ | L'interligne de l'en-tête de la colonne droite reste serré | « Pas encore / jugeable » : pas haut-à-haut **42 → 36 px (−14,3 %)** ; témoin : le paragraphe du panneau bas est conforme (`m17`,`m16`) | — |
| `m2` | MINEUR | DÉJÀ APPLIQUÉ | L'aparté « ce qu'il a absorbé de vos règles » se replie sur 2 lignes au lieu de 3 | REF **3 lignes** (pas 29/30 px) → JEU **2 lignes** (pas 27) ; panneau élastique **980 → 988 px** (`m17`,`m21`) | — |
| `m3` | MINEUR | DÉJÀ APPLIQUÉ | La boîte du CTA est 7 px plus basse, le texte identique | **1952..2046 = 95 px → 1989..2076 = 88 px (−7,4 %)** ; libellé : capitale 30 → 29, largeur 611 → 607 (`m01`,`m16`) | — |
| `m4` | MINEUR | DÉJÀ APPLIQUÉ | Le bloc enseigne est plus court : le filet or remonte de 6 px et toute la suite se décale | filet or sous l'enseigne, en offset : **211..217 → 205..211** ; cascade sur les compteurs **−5**, sur `.elast` **−4** en haut / **+14** en bas (`m12`) | — |
| `m5` | MINEUR | DÉJÀ APPLIQUÉ | Le cadre est 6 px plus large et colle 3 px plus près du bord | hors-tout **1038 → 1044 px** ; marges d'écran **21 → 18 px** à gauche comme à droite ; filets horizontaux **3 → 4 px**, rails verticaux **3 → 3 px** (`m01`,`m21`) | — |
| `m6` | MINEUR | DÉJÀ APPLIQUÉ | Le visage est 9,5 % plus large pour 4,9 % de haut en plus — la transformation n'est pas homothétique | largeur max de la peau **126 → 138 px** ; hauteur du visage **123 → 129 px** ; silhouette de tête **153 → 153 px** (`m05`,`m06`) | — |
| `m7` | MINEUR | DÉJÀ APPLIQUÉ | Le col (triangle crème) est +25 % / +23 % et son aire +50 % | boîte **61×61 px, aire 1500 → 76×75 px, aire 2246** ; il reste un triangle (remplissage 0,403 → 0,394) et reste centré (293,0 → 290,5) (`m17`) | — |
| `m8` | MINEUR | DÉJÀ APPLIQUÉ | Le cadran de la montre est +11 % / +21 % et son aire +46 % | **47×24 px, aire 741 → 52×29 px, aire 1085** (`m17`) | — |
| `m9` | MINEUR | **NOUVEAU** | La bande intérieure haute du cadre porte une lueur **brune** là où la maquette en a une **bleue** — changement de famille de teinte | médiane par colonne sur la bande entre le filet du cadre et le panneau d'enseigne : REF bord **(16,23,34)** → pic **(23,29,36)** ; JEU bord **(16,22,31)** → pic **(43,37,33)**. Écart au pic **20/255** sur R. La même lueur déborde au-dessus du filet du cadre (y 417..510 à 2400) (`m09`,`m20`) | l'origine (voile chaud du fond d'écran, ou lueur propre au cadre) ; elle est identique sur les planches « écran seul », donc elle appartient au rendu de l'écran, pas au shell |
| `m10` | MINEUR | DÉJÀ APPLIQUÉ | Chrome partagé : le libellé « ARGENT » est plus étroit et sa capitale plus haute qu'au canon | canon ramené ×0,9184 : largeur **116 px**, capitale **18 px** ; capture **107 px (−7,8 %)**, capitale **19 px (+5,6 %)** ; le soulignement est à la même largeur (204 px), 6 px plus bas (`m18`) | — |

**ASSUMÉ et ARBITRAGE ne sont pas comptés ici** ; ils sont dans les deux tables ci-dessous.

## Les grandeurs du r12, retrouvées — égales ou non

Mes instruments ne sont pas ceux du r12 ; les valeurs de référence peuvent différer de quelques points
sur les grandeurs dérivées (ligne de base d'un halo, borne d'un profil). Ce qui se compare, c'est
**l'écart réf ↔ jeu**, mesuré ici avec un seul instrument des deux côtés.

| id r12 | grandeur | r12 | r13 (ce tour) | statut |
|---|---|---|---|---|
| B1 | 1920 : CTA sous le dock | posé 107 px sous le bandeau, débordement 56 px, 47-49 % des colonnes du filet perdues | posé **20 px** sous le bandeau ; bas du CTA 1649 ; **dock à 1699 ⇒ 50 px de garde** | **FERMÉ** |
| M1 | halo des compteurs | d2 +66,6 → d20 +22,8 ; contraste 7,41 → 4,11 | d2 **+65,0** → d20 **+23,2** ; contraste **8,67 → 4,49** | **OUVERT, inchangé** (`M1`) |
| M2 | CTA hors du cadre en mode élastique | C1920 cadre 250..1629, CTA 1650..1737 → dehors ; S2400 dehors | C1920 cadre **162..1625**, CTA **1562..1649** → **encore dehors de 24 px** ; **S2400 cadre 482..2109, CTA 1989..2076 → DEDANS** | **MOITIÉ FERMÉ** (`M5`) |
| M3 | 2400 : 339 px de bande morte, cadre à 80,0 % | 339 px · 80,0 % | **340 px · 79,9 %** | **OUVERT, inchangé** (`M4`) |
| M4 | pied du panneau élastique vide | 167 → 246 px (31,5 %) | **165 → 245 px (31,2 %)** | **OUVERT, inchangé** (`M7`) |
| M5 | la coiffe | 19-20 → 0 px · 30 → 17 px · 0 → 8 rangées | **20 → 1 px** · **35 → 16 px** · **0 → 6 rangées** | **OUVERT** (`M2`) |
| M6 | gras sans-empattement −15 à −30 %, sérif refermé | −15,3 à −30,5 % · sérif −2,5 à +5,1 % | **−15,5 à −25,3 %** · sérif **−3,6 à +9,2 %** | **OUVERT, inchangé** (`M9`) |
| M7 | col +28 % / +23 % | 61×61 → 78×75, aire 1507 → 2303 | **61×61 → 76×75, aire 1500 → 2246** | **OUVERT** (`m7`) |
| M8 | instabilité T/T+1 s | 47 196 px (2,276 %) ; nom absent à T | **47 988 px (2,314 %)** ; nom absent à T | **OUVERT, inchangé** (`M8`) |
| m1 | balayage +34,5 %, atteint les deux bords | 618 → 831 px | **524 → 831 px (+58,6 %)** au même seuil ; 831 px identique au r12 | **OUVERT** (`M6`) |
| m2 | tuiles 9 % plus courtes | 99 → 90 px ; pas 115 → 107 | **101 → 93 px ; pas 115 → 108** | **OUVERT, inchangé** (`M10`) |
| m3 | boîte du CTA −7,4 % | 95 → 88 px | **95 → 88 px** | **OUVERT, inchangé** (`m3`) |
| m4 | en-tête droit serré −14,3 % | 42 → 36 px | **42 → 36 px** | **OUVERT, inchangé** (`m1`) |
| m5 | aparté 2 lignes au lieu de 3 | 3 → 2 | **3 → 2** | **OUVERT, inchangé** (`m2`) |
| m6 | bouche plus fine | épaisseur 9,9 → 6,8 px | **non re-mesurée** (ma sonde attrapait le contour du visage) | **NON REJUGÉ** |
| m7 | cadran +11 % / +13 % | 47×30 → 52×34 | **47×24 → 52×29** (+10,6 % / +20,8 %) | **OUVERT** (`m8`) |
| m8 | cadre +6 px, marge 21 → 18, filet 3 → 4 | idem | **idem** | **OUVERT, inchangé** (`m5`) |
| m9 | enseigne −7 px, filet or remonté | 211..217 → 204..211 | **211..217 → 205..211** | **OUVERT, inchangé** (`m4`) |
| m10 | visage +8,7 % de large | 126 → 137 px | **126 → 138 px** | **OUVERT, inchangé** (`m6`) |
| m11 | chrome : ARGENT −7,5 % / capitale +8,9 % | 116/17,4 → 107/19 | **116/18 → 107/19** | **OUVERT, inchangé** (`m10`) |
| m12 | chrome : aile droite sans heure | 2 lignes → 1 ligne + tiret 3×35 px | **2 lignes → 1 ligne (JOUR 50) + tiret 3×35 px à y87..89** | **OUVERT** — forme F, noté une fois |
| — | grandeurs r12 déclarées **ÉGALES** (24) | — | **22 re-mesurées, toutes encore égales** (tableau de contrôle positif) ; 2 non re-mesurées : pastilles des tuiles, yeux | **TIENT** |

## ASSUMÉ — vérifiés « rendus proprement »

| ce qu'on voit | rendu proprement ? | mesure | ce qui le ferait sortir de l'assumé |
|---|---|---|---|
| compteur ENFREINTES à « — » | **OUI** | encre **(127,212,217)**, exactement celle des deux autres chiffres ; centrée à **−0,5 px** du centre de sa boîte ; y 770..773, au milieu de la bande des chiffres (749..785) | couleur ou position différentes — ni l'une ni l'autre |
| col rendu par un triangle plein | **OUI** | remplissage aire/boîte **0,394** (≈ 0,43 attendu, 0,9 = « pas un triangle ») ; centre x 290,5 contre un axe de buste à 287,5 ⇒ **3 px** ; ne recouvre pas le cou | remplissage ~0,9, décentré, ou recouvrant le cou — aucun |
| reflet du miroir FIXE | **OUI pour la position** | pic à **29,3 %** de la hauteur du panneau (maquette 31,6 %) ⇒ tiers haut des deux côtés ; il est présent | absent, ou hors du tiers haut — ni l'un ni l'autre. ⚠️ sa **longueur** sort du périmètre de l'assumé : c'est `M6` |
| 4 couleurs hors `DesignTokens` | **OUI** | fond de carte 4/255, torse 4/255, filet or 1/255, vert « Il vous écoute » 0/255 | que la couleur RENDUE s'écarte — elle ne s'écarte pas |
| le nom du lieutenant est celui du compte | **OUI** | « LT. TULL, VOTRE LIEUTENANT » sur 2 lignes ; la mention « lieutenant.name — non projeté (L0.4) » de la maquette est **ABSENTE** en jeu | « SALVATORE » en dur, ou la mention encore visible — aucune des deux |
| pas de section « gages » | **OUI** | aucune place réservée vide dans le panneau élastique ; le vide du pied est celui de `M7`, pas un emplacement | une place réservée vide |
| tiret « — » à la place de la PHASE (bandeau) | **OUI** | aile droite : « JOUR 50 » alimenté, ARGENT alimenté (9 627 820,00 €), médaillon alimenté (« Brûlant / CHALEUR ») ; le tiret fait 3×35 px | un tiret sur ARGENT/JOUR ou un médaillon vide — aucun |
| ronds du dock sans icône | **OUI** | 4 ronds, aucun coupé, libellés EMPIRE / FAMILLE / FILIÈRE / PLUS, soulignement or sous PLUS (onglet actif) | un rond coupé, un libellé de repli — aucun |
| roster / règles / chiffres non comparables | **OUI** | aucun slug, aucune clé brute, aucun mot anglais, aucun nom vide : tout est en français réel | un slug, une clé brute, un mot anglais — aucun |

## ARBITRAGE

| point | pourquoi c'est un arbitrage |
|---|---|
| ronds du dock **sans icône** | arbitrage user connu (« j'aime pas les icônes ») ; le canon HUD pose une icône 20×20 dans chaque rond |
| la maquette dit `HEAT` / `$ 24 850`, le client dit `CHALEUR` / `9 627 820,00 €` | ruling user 2026-09-02 « fr réel » : **le client a raison, la maquette est en retard**. Noté une fois, pas compté |
| l'aile droite ne porte **aucune heure** | forme F `game_minute` (back) — noté une fois, pas compté |
| filet du bandeau et anneau du médaillon **rouges** `(217,99,71)` là où le canon les a **or** `(186,148,64)` | teinte pilotée par l'état de chaleur (canon « 37 % / tiède », capture « Brûlant ») : c'est du chrome partagé, piloté par la donnée — pas une direction d'écran |
| **état 16:9** (1920) traité comme une résolution cible | arbitrage user ouvert sur les résolutions cibles ; je le mesure quand même, et le cadre élastique **ne le ferme pas** (`M3`, `M5`) |
| direction (sombre, napolitain, mafieux, fin 80s – début 90s) | maquette et capture ne divergent **pas** sur la direction : mêmes jetons, même luminance, même palette. Aucun écart de direction à signaler |

## Ce qui dépend des données (hors table)

Base post-campagne, **aucun corps réel comparable** ⇒ les VALEURS ne sont pas jugées, la FORME l'est.
Sont datées et non comptées : le nom « LT. TULL », le solde `9 627 820,00 €`, `JOUR 50`, l'état de
chaleur « Brûlant » et la teinte rouge du chrome qui en découle, les compteurs `00 / 00/4 / —`.
Identité de la planche : **« déclarée par la ligne GO, non relue »** — aucune ligne
`[DemoIdentityResolver] régime=env identité=…` n'est jointe au dossier.

## 5. Autres résolutions

| planche | tient ? | écarts propres |
|---|---|---|
| `capture-1080x2400.png` (PRINCIPALE, sous chrome) | inventaire complet, rien coupé, rien hors cadre | `M4` (bande morte 340 px) · `M7` (vide du pied 31,2 %) |
| `capture-1080x1920.png` (sous chrome — c'est ici que B1 se juge) | **B1 fermé** (50 px de garde CTA → dock) | `M3` (losange or sur le titre, anneaux du médaillon dans le panneau) · `M5` (CTA 24 px sous le filet du cadre, qu'il masque) · vide du pied ramené à ~20 % (meilleur qu'à 2400) |
| `capture-ecran-seul-1080x2400.png` | cadre **482..2109**, CTA **1989..2076 dedans** — **identique** à la planche sous chrome | le r12 mesurait ici un cadre à 730..2109 et un CTA dehors : **corrigé** |
| `capture-ecran-seul-1080x1920-T.png` | cadre 162..1625 comme sous chrome ; rien coupé | **le nom du lieutenant n'est pas là** (1 ligne au lieu de 2) |
| `capture-ecran-seul-1080x1920-T+1s.png` | identique à la précédente sauf le libellé et le buste | `M8` |

Les deux planches « écran seul » sont **aveugles par construction** à `M3` (chrome) : elles montrent le
cadre au même endroit, mais sans le médaillon ni le losange. Elles ne peuvent ni confirmer ni infirmer
cette collision — seule la catégorie `CaptureReputation` le peut, et elle le confirme.

## 6. Non vérifié

| point | ce qui trancherait |
|---|---|
| **Couverture de la ligne GO** — recopiée telle quelle : `(a)` deux résolutions 9/16 ÉTABLI · `(c)` onglet actif asserté 7/16 ÉTABLI, **inconnu pour ㊲** · `(d)` `[CHROME-ALIMENTE]` 3/16 ÉTABLI, **inconnu pour ㊲** · `(g)` SHA de l'arbre imprimé au run **0/16** · `(b)` paire T/T+1 **NON ÉTABLI** (fournie ici) · `(f)` état vide ET état riche **NON ÉTABLI** | imprimer le SHA de l'arbre au run et la ligne d'identité dans le journal, et le joindre au dossier |
| **Identité photographiée** : le dossier ne joint aucune ligne `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` | joindre le journal du run (ou son sidecar) |
| **Rect imprimé par le test** : non fourni (log non préservé) ; la géométrie du canvas est dérivée du code, pas lue | préserver le log du run |
| **État riche** : une seule variante d'état est capturée (l'état vierge #120). Les cadres #119, #121-#124 n'ont pas d'homologue en jeu dans ce dossier | une capture par état, ou au minimum #119 (garni) |
| **Au-delà de T+1 s** : je ne peux pas dire si l'écran se stabilise après une seconde | une triplette T / T+1 s / T+3 s |
| **Le mécanisme des écarts de graisse** (`M9`) : je mesure de l'encre, pas un réglage. La table `fc-match` du dossier ne liste pas `DejaVu Serif` | `fc-match "DejaVu Serif"` sur la machine de rendu |
| **La valeur du paramètre de halo** (`M1`) : je mesure l'effet, pas l'alpha ni le rayon posés | un balayage du paramètre, rendu et compté comme ici — c'est la seule façon d'écarter la garde « sur les paramètres » |
| **Pastilles des 4 tuiles** (diamètre et couleur) et **yeux** (écartement, boîte) : grandeurs déclarées ÉGALES au r12, non re-mesurées ce tour | les re-passer au prochain tour |
| **La bouche** (`m6` du r12) : ma sonde attrapait le contour du visage, je ne publie pas de chiffre | une sonde restreinte à l'intérieur du masque de peau |
| **Le diamètre des ronds du dock** contre le canon : le canon porte des **bulles d'annotation numérotées** (①…⑥) qui contaminent toute sonde de forme dans le dock et le bandeau | un canon HUD sans annotations |
| **L'origine de la lueur brune** (`m9`) : présente aussi sur les planches « écran seul », donc rendue par l'écran — mais je ne peux pas dire si c'est un voile de fond ou une lueur du cadre | une capture du cadre sur fond neutre |
| **Animation hors de la paire** : aucune paire n'est fournie à 2400 ni sous chrome | une paire par résolution |

## Annexes

### 1. Inventaire de la référence (parties, en offset depuis le filet haut du cadre `y=452`)

| id | catégorie | offset y | x | forme / remplissage / texte |
|---|---|---|---|---|
| `P0` | cadre | 0..1626 | 21..1058 (1038 px) | rectangle, filets or `(176,141,62)` 3 px horizontaux et verticaux ; fond en dégradé `(17,23,34)` → `(15,19,20)` |
| `P1` | panneau enseigne | 29..211 | 50..1029 | filet `(42,54,72)` ; fond `(12,18,28)` |
| `P1.titre` | titre sérif | 61..108 | 327..743 | « Le miroir », capitale **48 px**, `(242,201,107)`, contraste 11,55:1 |
| `P1.sous` | sous-titre capitales | 137..177 | 148..923 | 2 lignes, `(185,173,146)`, contraste 8,31:1 |
| `P1.filet` | filet or | 211..217 | 50..1029 | 7 px |
| `P2.1-3` | 3 boîtes de compteur | 250..363 | 50..362 · 383..695 · 716..1028 | filet `(42,54,72)` ; fond `(10,14,22)` |
| `P2.chiffres` | chiffres cyan | 272..310 | 170..238 (compteur 1) | « 00 », capitale **39 px**, `(127,212,217)`, contraste **8,67:1** ; halo A=38 pts, λ=8,0 px |
| `P2.libellé` | libellé de compteur | 328..346 | 87..321 | `(138,151,156)`, capitale 19 px |
| `P3` | panneau élastique | 396..1161 | 50..1029 (980 px) | filet `(42,54,72)` ; fond `(12,14,15)` |
| `P3.carte` | carte portrait | 425..1080 | 82..505 (424 px) | filet or ; fond `(17,24,35)` |
| `P3.carte.lib` | libellé de la carte | 461..503 | 179..405 | 2 lignes, 18/16 px |
| `P3.buste` | portrait | 577..1080 | ~205..385 | coiffe `(22,25,27)`, contour `(11,16,22)`, peau `(185,173,146)`, col crème `(234,224,200)` ; visage **126×123 px**, tête **153 px** de large |
| `P3.reflet` | ligne de balayage | 631..638 | 264..787 à 25 % du pic | teal, 8 px, pic +67,5 |
| `P3.verdict` | « Il vous écoute » | 981..1006 | 174..413 | sérif vert `(125,179,106)`, capitale 26 px |
| `P3.ref` | mention `lieutenant.name` | 1024..1042 | 125..462 | `(107,115,125)`, contraste 3,71:1 |
| `P3.tête` | en-tête colonne droite | 438..529 | 539..970 | 2 lignes, pas 42 px + aparté 3 lignes |
| `P3.t1..t4` | 4 tuiles | 548..994 | 542..997 (456 px) | hauteurs 101/101/100/101, pas 115/116/115, gouttières 14/15/15 ; pastille éteinte |
| `P4` | panneau bas | 1195..1467 | 50..1029 | 5 lignes ; sur-titre 19 px, titre sérif **38 px** `(234,224,200)` contraste 13,57:1, paragraphe 3 lignes |
| `P5` | CTA | 1500..1594 (95 px) | 46..1033 | filets or 3 px ; libellé capitale 30 px, largeur d'encre 611 px, contraste 11,22:1 |

**Couche globale (cadre entier)** : luminance moyenne **32,15**, médiane 23,31, densité d'encre
(L>40) **11,52 %** ; palette : `(24,24,40)` 33,6 % · `(8,24,24)` 22,3 % · `(8,8,8)` 11,1 % ·
`(24,24,24)` 10,7 % · `(8,8,24)` 6,8 % · `(40,56,72)` 2,8 % · `(184,136,56)` 2,1 %.

### 2. Inventaire de la capture (mêmes parties, offsets depuis `y=482`)

Toutes les parties de l'inventaire de la référence existent, dans le même ordre et avec le même
parent. **Rien d'absent, rien en trop** dans le contenu à 2400. Les offsets diffèrent comme suit
(mesurés sur les filets de panneau, `m12`) :

```
enseigne haut      29..31   ->  29..31    (0)
compteurs haut    250..252  -> 245..247   (-5)      compteurs bas   361..363 -> 357..359  (-4)
.elast haut       396..398  -> 392..395   (-4)
tuile 1  548..646 -> 515..604 (-33/-42) · tuile 2 663..761 -> 623..712 · tuile 3 779..876 -> 729..819
tuile 4  894..992 -> 837..926 (-57/-66)
.elast bas       1159..1161 -> 1173..1175 (+14)
panneau bas     1195..1467  -> 1208..1474 (+13/+6)
CTA             1500..1594  -> 1507..1594 (+7/0)
```

Différences de FORME relevées partie par partie : `P2.chiffres` halo A=81 pts λ=12,6 px (contraste
4,49:1) · `P3.buste` coiffe sans descente latérale, sommet plat, 6 rangées de crâne nu, visage
138×129 px · `P3.reflet` 831 px au lieu de 524 · `P3.t1..t4` 93/92/93/92 px · `P3.tête` pas 36 px,
aparté 2 lignes · `P5` 88 px de haut. **Une partie EN TROP à 1920 seulement** : le losange or du
chrome, 18×17 px, dans le panneau d'enseigne.

**Couche globale (cadre entier)** : luminance moyenne **31,93** (−0,7 %), médiane 20,95, densité
d'encre **12,71 %** (+1,2 pt — cohérent avec le halo) ; palette : `(8,24,40)` 42,6 % · `(8,8,8)`
17,5 % · `(24,24,24)` 13,9 % · `(8,24,24)` 5,7 % · `(8,8,24)` 4,9 % · `(40,56,72)` 2,9 % ·
`(184,136,56)` **2,09 %** (contre 2,10 % — la part d'or est la même à 0,01 point près).

### 3. Correspondance des repères — voir la section « Correspondance des repères » ci-dessus

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre et porte ses contrôles :

| script | ce qu'il mesure |
|---|---|
| `lib.py` | primitives partagées (luminance, contraste WCAG, médiane de fenêtre, distance de Chebyshev) |
| `m01_cadre.py` | filets or pleine largeur des 5 planches |
| `m02_sonde_couleurs.py` | histogramme des matières du portrait (fonde les nominaux de `m05`/`m06`) |
| `m03_balayage.py` | ligne de balayage : rangée de pic, épaisseur, étendue à 25 % et 10 % (ligne de base **par colonne**) |
| `m04_carte_portrait.py` | cadre et carte portrait sur les 5 planches |
| `m05_coiffe.py` | grandeurs 1 et 3 de la coiffe (classement au plus proche nominal, composantes connexes) |
| `m06_sommet.py` | grandeur 2 de la coiffe (rangée par rangée, robuste au balayage) — **imprime ses deux échecs précédents** |
| `m07_halo.py` | profil du halo, rapport par distance, ajustement `A·exp(−d/λ)`, contrôle négatif sur le libellé |
| `m08_gouttiere.py` | bandeau, cadre, CTA, dock aux deux résolutions |
| `m09_chrome_deborde.py` | ce que le chrome pose sous son filet, et ce qu'il recouvre à 1920 |
| `m10_losange.py` | isolement du losange par diff à une variable (bloc enseigne, translation de 320 px) |
| `m11_paire.py` | paire T / T+1 s |
| `m12_blocs.py` | filets de panneau : structure verticale complète des deux côtés |
| `m13_couche_globale.py` | palette quantifiée, luminance, densité |
| `m14_jetons.py` | 13 aplats + profil du fond du cadre sur 8 hauteurs |
| `m15_textes.py` | première passe sur les textes (boîtes posées à la main — remplacée par `m16`) |
| `m16_lignes.py` | inventaire automatique des lignes, panneau par panneau |
| `m17_details.py` | en-tête droit, aparté, tuiles, vide du pied, col, montre |
| `m18_chrome.py` | chrome contre le canon HUD ramené ×0,9184 |
| `m19_divers.py` | ronds du dock, tiret ENFREINTES, position du reflet, planches « écran seul », nom du lieutenant planche par planche |
| `m20_halo3_et_bandeau.py` | halo du tiret ENFREINTES, bande intérieure haute du cadre |
| `m21_largeurs.py` | largeurs des panneaux et des tuiles, gouttière carte → tuiles, marges d'écran |
