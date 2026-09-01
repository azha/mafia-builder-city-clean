# Juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`) — r6 — 2026-08-31

## Verdict : **REFUSÉ**
(= **NON APPROUVÉ** au sens du mandat : quatre MAJEURs, aucun BLOQUANT.)
L'écran se lit comme la maquette — même but, même ordre, rien de coupé, rien hors cadre — mais le
fond de l'écran vire au vert sous le cadre, et le portrait, qui est l'élément héros et le seul
« trait » que ni le code ni les gardes ne savent lire, n'est plus le même homme.

**Compte, pris dans la table du §3** : **0 BLOQUANT · 4 MAJEUR · 14 MINEUR** — dont **3 `NOUVEAU`**
(2 MAJEUR, 1 MINEUR). Les 15 autres portent sur des propriétés que `dossier.md` ou
`angles-morts-declares.md` désignent explicitement.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Tout est ramené en **px CSS** (réf ÷ 3,0 ; capture ÷ 3,6) et rapporté au coin haut-gauche du cadre
(réf px (18, 376) ; capture px (18, 18)) — voir Annexe 3.

| # | grandeur | référence `m-120` | jeu `1080x1920` | script |
|---|---|---|---|---|
| 1 | **hauteur du cadre** | 451,0 CSS | 451,1 CSS | m01 |
| 2 | or du cadre / du trait / de la bordure du CTA | (176, 141, 62) | (176, 141, 61) | m13 |
| 3 | liseré des panneaux et des tuiles | (42, 54, 72) | (42, 53, 73) | m13 |
| 4 | peau du visage | (185, 173, 146) | (185, 173, 146) | m13 |
| 5 | or du titre « Le miroir » | (242, 201, 107) | (242, 201, 106) | m22 |
| 6 | crème du titre de verdict | (234, 224, 200) | (234, 224, 200) | m22 |
| 7 | vert de « Il vous écoute » | (125, 179, 106) | (125, 179, 106) | m22 |
| 8 | gris des sur-titres | (138, 151, 156) | (138, 151, 156) | m22 |
| 9 | cyan des compteurs | (127, 212, 217) | (127, 212, 217) | m16 |
| 10 | fond du panneau portrait | (12, 14, 14) | (13, 13, 13) | m13 |
| 11 | largeur des 3 tuiles | 86,7 CSS | 87,0 CSS | m11 |
| 12 | hauteur de la bande des tuiles | 31,0 CSS | 31,4 CSS | m15 |
| 13 | largeur de la carte du portrait | 117,7 CSS | 117,8 CSS | m04 |
| 14 | hauteur de capitale des compteurs | 10,33 CSS | 10,56 CSS (+2,2 %) | m16b |
| 15 | position du reflet du miroir | 32,1 % de la hauteur de la carte | 32,1 % | m20 |
| 16 | épaisseur du reflet | 2,0 CSS | 1,9 CSS | m20 |
| 17 | voyants des 4 rangées | ⌀ 7,0 CSS, aire/bbox 0,78, (42,54,72) | ⌀ 7,2 CSS, 0,73, (42,53,73) | m23 |
| 18 | gouttières entre les 4 rangées | 5,00 · 5,00 · 5,00 CSS | 4,86 · 5,00 · 5,00 CSS | m23 |
| 19 | pas des rangées : **régularité** | 32,33 · 32,33 · 32,33 | 29,72 · 29,86 · 29,86 (écart 0,14) | m23 |
| 20 | largeur des textes des 4 rangées | 41,7 / 57,0 / 67,7 / 68,3 / 61,3 / 36,3 / 47,0 / 77,3 | 41,9 / 56,7 / 68,3 / 68,1 / 62,2 / 35,8 / 47,2 / 76,9 | m22b |
| 21 | écarts entre blocs (4 des 6 joints) | plaque→tuiles 11,0 · tuiles→panneau 10,0 · panneau→verdict 10,0 · CTA→bas 9,0 | 11,1 · 9,7 · 10,55 · 9,2 | m15 |
| 22 | cou (rectangle de peau) | 15,3 × 15,0 CSS | 15,6 × 15,6 CSS | m08 |
| 23 | yeux | 5,7 × 7,0 CSS, écartement 39,4 % du visage | 5,8 × 7,2 CSS, 37,4 % | m29 |
| 24 | le col **est bien un triangle** | aire/bbox 0,410, décroissance linéaire | 0,396, décroissance linéaire | m24 |
| 25 | luminance moyenne du cadre / part d'encre | 32,3 / 8,3 % | 32,9 / 10,1 % | m02 |
| 26 | **stabilité T / T+1 s** | — | **1 pixel sur 2 073 600, écart 1/255** | m17 |
| 27 | **1080×2400 : intérieur du cadre** | — | identique au 1080×1920 (deltas 0–3/255 ; contrôle négatif à +40 px : 783 864 px différents) | m30 |

---

## 0. L'écran, tel que la maquette le dit

**But.** « Le miroir » : on vient y lire ce que son lieutenant a **absorbé** des règles qu'on lui a
données. Sur `m-120` — compte neuf — la réponse est *rien*, et l'écran a le courage de le dire au
lieu de le maquiller en zéro.

**Ordre de lecture.** (1) « **Le miroir** », en or, en capitales espacées, seul texte doré du haut ;
(2) la **rangée de trois compteurs** cyan sur fond noir — 00 / 00⁄4 / 00 — qui chiffre le vide ;
(3) le **portrait du lieutenant**, cerclé d'or, seul élément figuratif de l'écran, avec sous lui le
verdict vert « Il vous écoute » ; puis, en balayage vers la droite, la **liste des quatre règles**
aux voyants éteints ; enfin le **panneau de verdict** et le **CTA doré** en pied.

**Zones.** cadre doré (une seule plaque, hauteur fixe 462 CSS) ▸ plaque de titre + trait doré ▸
bande de 3 tuiles compteur ▸ panneau portrait à deux colonnes (carte du portrait à gauche, liste
des 4 règles à droite) ▸ panneau de verdict ▸ CTA.

**Traits d'identité.** ① la palette : bleu nuit quasi noir, or (176,141,62), un seul cyan
(127,212,217), un seul vert ; ② le **reflet de miroir** — une barre cyan translucide qui traverse
tout le panneau au tiers haut, et qui est la raison d'être du nom de l'écran ; ③ le **portrait**,
figure plate à cinq traits porteurs de sens (buste, col, revers, montre, gants) ; ④ le rythme
vertical régulier : six blocs séparés par des écarts de 9 à 11 CSS ; ⑤ un fond presque noir de bout
en bout, l'or étant la seule chose qui brille.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, dans sa charpente. Le but est immédiatement lisible, l'ordre de lecture est le même
(titre → compteurs → portrait → liste → verdict → CTA), les six blocs sont là dans le bon ordre,
rien n'est coupé ni hors cadre, et le cadre fait exactement la hauteur promise (451,0 contre
451,1 CSS). Les couleurs d'aplat sont, à l'unité près, celles de la maquette : l'or, le liseré, la
peau, le crème, le vert et le cyan sont **identiques** — y compris les quatre couleurs hors
`DesignTokens`, dont la dette de code n'a effectivement aucune conséquence visible. Le compteur
ENFREINTES rend son « — » dans le cyan exact des deux autres chiffres et centré comme eux : le trou
se lit comme un trou.

Trois choses, pourtant, changent ce qu'un joueur perçoit.

**(1) Le bas de l'écran est vert.** Au même point du corps (99 % de sa hauteur), la maquette donne
(11,16,22) — L 15,4 — et le jeu (37,63,65) — L **57,6**, soit 3,7 fois plus clair, dans une teinte
verte franche. Le calcul tranche la cause : la lueur cyan du fond (`rgba(127,212,217,.07)`) mélangée
en sRGB donnerait (19,31,40) ; mélangée en **espace linéaire**, (36,64,69). Le jeu mesure (36,62,64).
Ce n'est pas un réglage de couleur, c'est un espace de mélange. À 1080×2400 — la cible téléphone —
ce voile occupe le tiers bas de l'écran. Le trait d'identité « fond presque noir, l'or seul brille »
tombe.

**(2) Le lieutenant n'est plus le même homme.** Dans la maquette, la masse sombre des cheveux est la
plus large **au niveau des yeux** (1,20 × la largeur du visage à 38 % de la carte) et redescend le
long des tempes : c'est une chevelure qui encadre un visage ovale (h/l = 1,058). En jeu, elle est la
plus large **huit points plus haut**, au-dessus du crâne (1,21 × à 30 %), et s'est rétractée à 0,99 ×
au niveau des yeux : c'est une **casquette plate posée sur une tête ronde** (h/l = 0,858, −19 %).
Et la montre — un des cinq traits censés porter une clé de donnée — a perdu ses aiguilles :
aire/bbox 0,81 contre 0,67, c'est-à-dire un disque plein. « Montre cachée » ne se lit plus comme une
montre.

**(3) Le mou est parti au mauvais endroit.** Le cadre a la bonne hauteur totale et quatre de ses six
joints sont exacts au dixième — mais tous les blocs de contenu sont 4 à 9 % plus courts qu'en
maquette, et les trois centimètres ainsi gagnés se sont accumulés dans deux vides : sous la carte du
portrait (+33 %), sous la quatrième rangée (+34 %) et surtout **au-dessus du CTA (9,4 → 18,3 CSS,
+95 %)**. C'est exactement l'angle mort A3 que l'auteur déclare : les gardes mesurent des totaux, et
le total est juste.

Le reste — palette, densité (8,3 % contre 10,1 % d'encre), luminance moyenne, contrastes, régularité
du pas des rangées, absence d'animation — tient.

---

## 3. Écarts

| id | zone | gravité | référence | en jeu | écart | instrument | critère |
|---|---|---|---|---|---|---|---|
| F1 | fond de l'écran, lueur cyan du bas | **MAJEUR** | (11, 16, 22) — L 15,4 à 99 % du corps | (37, 63, 65) — L 57,6 | +26/+47/+43 par canal ; ×3,7 en luminance. Prédiction sRGB (19,31,40) / linéaire (36,64,69) → **espace de mélange linéaire** | `m18`, `m19` | DÉJÀ APPLIQUÉ (A2) |
| F2 | portrait — coiffe | **MAJEUR** | masse sombre maximale à y = 38 % de la carte, 1,20 × la largeur du visage ; 1,17 × encore à y = 46 % | maximum à y = 30 %, 1,21 × ; **0,99 × à y = 38 %** | le point le plus large monte de 8 points de carte et sort de la zone du visage : chevelure → casquette posée | `m28` | **NOUVEAU** (A7 ne nomme que buste, col, revers, montre, gants) |
| F3 | portrait — montre | **MAJEUR** | disque 13,3 × 8,7 CSS, **aire/bbox 0,67** (deux aiguilles évidées), à cheval sur le bord du buste | 15,6 × 9,7 CSS, **aire/bbox 0,81** (disque plein), à l'intérieur du buste | aiguilles absentes ; +17 % de largeur ; couleur identique (35,42,45) / (34,42,46) | `m25` | DÉJÀ APPLIQUÉ (A7) |
| F4 | portrait — visage | **MAJEUR** | 34,7 × 36,7 CSS, **h/l = 1,058** (ovale) | 37,2 × 31,9 CSS, **h/l = 0,858** | −19 % sur le rapport, invariant d'échelle ; +7 % de largeur, −13 % de hauteur | `m29` | **NOUVEAU** |
| F5 | joint panneau verdict → CTA | MINEUR | 9,4 CSS | 18,3 CSS | **+95 %**, écart **sélectif** : les 4 autres joints du cadre sont justes (11,0/11,1 · 10,0/9,7 · 10,0/10,55 · 9,0/9,2) → désigne un conteneur différent | `m14`, `m15` | DÉJÀ APPLIQUÉ (A3) |
| F6 | vide sous la carte du portrait, dans son panneau | MINEUR | 20,3 CSS | 27,0 CSS | +33 % | `m04`, `m15` | DÉJÀ APPLIQUÉ (A3) |
| F7 | vide sous la 4ᵉ rangée, dans le panneau portrait | MINEUR | 44,0 CSS | 58,8 CSS | +34 % | `m23`, `m15` | DÉJÀ APPLIQUÉ (A3) |
| F8 | hauteur des 4 rangées de règles | MINEUR | 27,33 CSS (pas 32,33) | 24,86 CSS (pas 29,8) | −9,0 % ; les gouttières, elles, sont justes (5,0 / 4,95) | `m23` | DÉJÀ APPLIQUÉ (A3) |
| F9 | carte du portrait — hauteur | MINEUR | 182,3 CSS, h/l = 1,550 | 173,9 CSS, h/l = 1,476 | −4,6 % à largeur identique (117,7 / 117,8) | `m04` | DÉJÀ APPLIQUÉ (A3) |
| F10 | portrait — centrage horizontal | MINEUR | visage, cou, col, buste et montre tous à **50,0 %** de la largeur de la carte ; textes à 50,0 % | figure entière à **47,3 %** ; textes toujours à 50,0 % | −3,2 CSS (−2,7 % de la carte) : le dessin est décalé à gauche, les textes non | `m08`, `m09`, `m22` | DÉJÀ APPLIQUÉ (A3 : « ni aucun rapport horizontal ») |
| F11 | portrait — barre claire sous la pointe du col | MINEUR | **rien** entre 72 % et 84 % de la hauteur de la carte, dans la fenêtre 28–72 % de sa largeur | barre horizontale (143, 136, 122), 21,7 × ≈1 CSS, à y = 75,1 % | **partie EN TROP** ; teinte inédite sur l'écran ; largeur exactement celle de la bbox du col | `m26` | DÉJÀ APPLIQUÉ (A7 : « revers ») |
| F12 | portrait — triangle du col | MINEUR | 16,7 × 16,7 CSS (14,2 % de la carte) | 21,7 × 20,8 CSS (18,4 %) | **+30 % de largeur, +25 % de hauteur** — or c'est la LARGEUR qui porte le signal ouvert/fermé. (Le triangle reste un triangle : l'écart assumé tient sur ce point.) | `m24` | DÉJÀ APPLIQUÉ |
| F13 | reflet du miroir — couleur | MINEUR | (59, 97, 106) au pic | (65, 112, 117) | +6/+15/+11 — même signe et même cause que F1 (mélange linéaire) ; position et épaisseur exactes | `m20` | DÉJÀ APPLIQUÉ (A2) |
| F14 | fond des 3 tuiles compteur | MINEUR | (13, 20, 28) | (13, 13, 22) | (0, −7, −6) — juste au-delà du seuil de 6/255 ; la tuile perd son bleu | `m13b` | DÉJÀ APPLIQUÉ (A2) |
| F15 | légende « ce qu'il a absorbé de vos règles » | MINEUR | 3 lignes sur une colonne de 48,7 CSS, hauteur d'encre 23,0 CSS | 2 lignes sur 55,8 CSS, hauteur d'encre 13,9 CSS | colonne +14 % → reflux ; l'entête de la colonne droite passe de 42,0 à 34,4 CSS (**−18 %**) | `m22` | **NOUVEAU** |
| F16 | retrait gauche dans les rangées de règles | MINEUR | voyant à 12,3 CSS du bord, texte à 23,3 CSS | 10,3 CSS et 21,3 CSS | −2,0 CSS sur les deux (−16 % / −9 %) | `m22b`, `m23b` | DÉJÀ APPLIQUÉ (A3 : « les paddings ») |
| F17 | hauteur du CTA | MINEUR | 25,3 CSS | 23,6 CSS | −6,7 % ; libellé, or et position du texte identiques | `m14` | DÉJÀ APPLIQUÉ (A3) |
| F18 | vide entre le titre de la carte et le sommet du crâne | MINEUR | 24,8 CSS (13,6 % de la carte) | 20,9 CSS (12,0 %) | −16 % ; même famille que F6–F9 | `m22`, `m28` | DÉJÀ APPLIQUÉ (A3) |

**Cause commune.** F1 et F13 sont **une seule erreur**, pas deux : un mélange composé en espace
linéaire là où le navigateur compose en sRGB. Elle ne se voit que sur les deux éléments translucides
de l'écran, et elle est d'autant plus forte que le fond est sombre — ce qui est le cas partout ici.
F5 à F9, F16, F17 et F18 forment une seconde famille : tous les blocs de contenu raccourcissent de
4 à 9 %, et le mou se rassemble dans trois vides. F2, F3, F4, F11 et F12 forment la troisième : le
dessin du portrait.

### Écarts ASSUMÉS — vérifiés, rendus proprement (non comptés)

| écart assumé | ce qui le ferait sortir de l'assumé | mesuré |
|---|---|---|
| « Salvatore » + mention « lieutenant.name — non projeté (L0.4) » | mention absente, illisible, ou ailleurs que sous le verdict | **présente**, sous « Il vous écoute », gris (138,151,156) comme les autres sur-titres → **reste assumé** |
| ENFREINTES à « — » | tiret sans la couleur ni la position des deux autres chiffres | tiret = **(127, 212, 217)**, exactement le cyan des chiffres ; centré à 238,3 CSS pour un centre de tuile à 238,5 ; ligne médiane à 80,4 CSS pour un centre de chiffres à 79,0 → **reste assumé** |
| col rendu par un triangle plein | ce n'est pas un triangle (aire/bbox ≈ 0,9) · pas centré sur l'axe du cou · recouvre le cou | aire/bbox **0,396** avec décroissance linéaire de la largeur → c'est un triangle ; centré sur l'axe du cou (47,3 % tous les deux) ; recouvrement col/cou 3,0 CSS contre 1,5 en maquette, même signe → **reste assumé**. (Sa TAILLE, elle, sort du périmètre : F12.) |
| 4 couleurs hors `DesignTokens` | que la couleur rendue s'écarte de la maquette | `Encre` (234,224,200) ✓ · `Panneau` (12,14,14)/(13,13,13) ✓ · `Liseré` (42,54,72)/(42,53,73) ✓ · `Vert` (125,179,106) ✓ → **aucune conséquence visible** |
| reflet fixe, non animé | absent, ou hors du tiers haut du panneau | présent, à **32,1 %** de la hauteur de la carte dans les deux images, épaisseur 2,0/1,9 CSS → **reste assumé** (sa couleur, elle, sort : F13) |

### ARBITRAGES (non comptés, non corrigibles côté client)

- **Famille de police.** Les hauteurs de capitale concordent (compteurs 10,33 / 10,56 CSS ; titre
  13,3 / 12,8 ; titre de verdict 10,7 / 10,8), mais la **chasse** diffère : « 00 » mesure 19,0 CSS
  en maquette et 17,2 en jeu (−9,5 %). Écart de chasse à hauteur égale ⇒ arbitrage, pas défaut.

---

## 5. Autres résolutions

**1080×2400 (cible téléphone) — tient.** L'intérieur du cadre est **identique** au 1080×1920 (aucun
pixel au-delà de 3/255 sur des sondes réparties ; le contrôle négatif, la même fenêtre décalée de
40 px, donne 783 864 pixels différents — l'instrument discrimine). Le cadre garde sa hauteur fixe
(y 18 → 1644), rien n'est coupé, rien ne déborde, aucun reflux. Toute la hauteur supplémentaire va
sous le cadre : 276 px libres à 1920, **756 px à 2400**.

**Écart propre à 1080×2400 :** F1 y est bien plus visible. Le voile vert atteint L 34 dès
y = 1650 (68,8 % de l'écran) et culmine à L 57,6 : **le tiers bas de l'écran est vert**, contre
15,4 en maquette. Le dossier interdit de compter cet ESPACE comme un vide de mise en page — je ne le
compte pas ; sa COULEUR, elle, est un rendu, et elle est fausse.

**1080×1920 à T+1 s — tient.** 1 pixel différent sur 2 073 600, d'un écart de 1/255. Aucune
animation. Contrôle négatif de l'instrument : 1920 contre 2400, 395 482 pixels différents.

---

## 6. Ce que je n'ai pas pu vérifier

| point | ce qui trancherait |
|---|---|
| **Le chrome.** Les captures sont sans bandeau ni dock. Je ne peux donc vérifier ni que rien ne passe sous le bandeau haut, ni que rien ne touche le dock, ni surtout **quelle part des 756 px libres sous le cadre à 1080×2400 le dock couvre** — donc quelle part du voile vert de F1 reste visible en jeu réel. | une capture montée dans le shell, après l'override d'identité |
| **Le halo doré du haut** (`radial 72% 40% at 50% 22%`). Les deux corps n'ont pas la même hauteur (584 CSS en maquette, 533 / 667 en jeu, le chrome étant absent) : les arrêts du dégradé ne tombent pas au même endroit et la comparaison ne départage rien. Je n'ai tranché que sur le halo **bas**, dont le point à 99 % du corps est, lui, comparable. | une capture avec le shell monté, ou un rendu de la maquette au même gabarit de corps |
| **La largeur du reflet.** Mon instrument (`m31`) a **échoué son contrôle** : le profil d'amplitude est contaminé par la frontière carte/panneau et place le centre de la bande à 100,6 CSS en jeu contre 143,3 en maquette, ce qui est incompatible avec une bande symétrique. **Chiffres écartés** — je ne publie pas de largeur de reflet. | un profil pris sur un fond homogène sur toute la largeur, ou la valeur des arrêts du `linear-gradient` |
| **Le recouvrement col / cou.** La segmentation du cou par couleur a échoué (elle capturait tout le visage). La voie de repli par composantes connexes donne 3,0 CSS de recouvrement en jeu contre 1,5 en maquette : même signe, même ordre de grandeur. Je le déclare **non concluant** plutôt que défaut. | un rendu de la maquette avec le cou seul, ou les bbox du SVG source |
| **Une animation de période > 1 s.** La paire T / T+1 s prouve l'immobilité à cet intervalle, pas au-delà. | une troisième capture à T+5 s |
| **Les états `drifting` / `hostile` / `wary` / la liste pleine.** Aucune image dans le dossier ; l'angle mort A5 reste entier côté image comme côté contrat. | un scénario ou un seed qui déclare 4 règles et provoque une violation |
| **La famille de police.** Indécidable depuis une image ; seules les hauteurs de capitale et la chasse le sont. | `fc-match` sur la CSS de la maquette |
| **Le sens des cinq traits.** Je constate que la montre ne ressemble plus à une montre et que la coiffe ne ressemble plus à des cheveux ; je ne peux pas vérifier que chaque trait est bien câblé à sa clé de donnée, un seul état étant capturé. | une capture de deux états où un seul trait change |

---

## Annexes

### 1. Inventaire de la référence `m-120.png` (900 × 1752, ×3,0)

Couche globale du **cadre seul** (px 18,376 → 881,1731) : palette dominante (17,24,35) 30,4 % ·
(11,14,18) 16,9 % · (15,21,30) 16,4 % · (24,27,31) 8,7 % · (20,24,30) 8,3 % · (13,17,22) 8,1 % ·
**(118,115,94) 8,0 %** (l'or) ; luminance moyenne 32,3 ; part d'encre (L ≥ 60) 8,3 %.

Rythme vertical (CSS depuis le haut du cadre) :

| bloc | haut | bas | hauteur |
|---|---|---|---|
| plaque de titre | 8,00 | 58,7 (trait doré) | 50,7 |
| bande des 3 tuiles | 69,67 | 100,67 | 31,0 |
| panneau portrait | 110,67 | 321,33 | 210,7 |
| └ carte du portrait (bordure or) | 118,67 | 301,00 | 182,3 (117,7 de large) |
| └ rangée règle 1 | 152,67 | 180,00 | 27,33 |
| └ rangée règle 2 | 185,00 | 212,67 | 27,33 |
| └ rangée règle 3 | 217,67 | 245,00 | 27,33 |
| └ rangée règle 4 | 250,00 | 277,33 | 27,33 |
| panneau de verdict | 331,33 | 406,67 | 75,3 |
| CTA | 416,7 | 442,0 | 25,3 |
| bas du cadre | — | 451,0 | — |

Fiches des parties du portrait (en % de la carte) : visage 34,7 × 36,7 CSS, h/l 1,058, centre
(50,0 ; 44,0) — yeux 5,7 × 7,0, à x 29,8 % / 69,2 % — cou 15,3 × 15,0, centre (50,0 ; 60,0) —
col crème 16,7 × 16,7, aire/bbox 0,410, centre x 50,0 — buste 79,3 × 36,0, centre (50,0 ; 71,0),
bas à 80,8 % — montre 13,3 × 8,7, aire/bbox 0,67, centre (25,4 ; 78,3) — coiffe : masse sombre
maximale 1,20 × la largeur du visage à y = 38 %. Encolure symétrique au dixième autour de x = 50 %.

### 2. Inventaire de la capture `screen_b3_reputation_1080x1920.png` (1080 × 1920, ×3,6)

Couche globale du cadre : (13,22,34) 43,8 % · (13,13,13) 16,1 % · (27,35,40) 12,3 % · (21,22,28)
8,5 % · **(116,110,87) 8,4 %** · (13,13,22) 5,6 % · (15,19,25) 4,4 % ; luminance moyenne 32,9 ;
part d'encre 10,1 %.

| bloc | haut | bas | hauteur |
|---|---|---|---|
| plaque de titre | 7,78 | 56,7 | 48,9 |
| bande des 3 tuiles | 67,78 | 99,17 | 31,4 |
| panneau portrait | 108,89 | 316,67 | 207,8 |
| └ carte du portrait | 115,80 | 289,70 | 173,9 (117,8 de large) |
| └ rangée règle 1 | 143,75 | 168,61 | 24,86 |
| └ rangée règle 2 | 173,47 | 198,33 | 24,86 |
| └ rangée règle 3 | 203,33 | 228,19 | 24,86 |
| └ rangée règle 4 | 233,19 | 257,92 | 24,72 |
| panneau de verdict | 327,22 | 400,00 | 72,8 |
| CTA | 418,3 | 441,9 | 23,6 |
| bas du cadre | — | 451,1 | — |

Portrait : visage 37,2 × 31,9 (h/l 0,858), centre (47,3 ; 45,0) — yeux 5,8 × 7,2 à x 31,3 % /
68,7 % — cou 15,6 × 15,6, centre (47,3 ; 60,0) — col crème 21,7 × 20,8, aire/bbox 0,396, centre x
47,3 — buste 77,5 × 34,7, centre (47,4 ; 72,2), bas à 82,1 % — montre 15,6 × 9,7, aire/bbox 0,81,
centre (22,3 ; 79,4) — coiffe : maximum 1,21 × à y = 30 %, 0,99 × à y = 38 %.
**Partie EN TROP** : barre horizontale (143,136,122), 21,7 × ≈1 CSS, à y = 75,1 % de la carte.
Hors cadre : voile cyan-vert du fond, L 54 → 57,6 sur les 276 px sous le cadre.

### 3. Correspondance des repères

| | origine (px) | facteur | vérification |
|---|---|---|---|
| `m-120.png` | (18, 376) = coin haut-gauche extérieur du cadre doré | ÷ 3,0 | cadre : 863 px de large, 1355 de haut → 287,7 × 451,0 CSS |
| `…1080x1920.png` et `…1080x2400.png` | (18, 18) | ÷ 3,6 | cadre : 1043 × 1626 px → 289,7 × 451,1 CSS |

Toute mesure du §3 est exprimée dans ce repère, ou en % du parent (carte, tuile, visage) quand le
rapport interne est ce qui compte.

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `m01_reperes.py` | bordures dorées → repères et échelle | 5 images, dont 3 captures |
| `m02_palette.py` | palette quantifiée, luminance, densité du cadre | + : luminance quasi égale |
| `m03_rythme.py` | frontières horizontales par gradient | — |
| `m04_carte_portrait.py` | bbox de la carte, rendu normalisé côte à côte | + : largeur 117,7/117,8 |
| `m05`–`m08` | segmentation couleur + composantes connexes du portrait | − : le fond de carte n'est classé dans aucune classe |
| `m09_silhouette.py` | silhouette sombre (buste, coiffe) par `b − r` | + : fond de carte → False |
| `m10_zooms.py` | zooms normalisés (tête, col/cou, montre) | — |
| `m11`, `m15` | bbox des tuiles et des panneaux par la couleur du liseré | — |
| `m12`, `m13` | 27 sondes couleur nommées (médiane 5×5) | + : peau, or, liseré ; − : or vs fond |
| `m14_panneaux.py` | bandes de liseré pleine largeur | — |
| `m16`, `m16b` | compteurs : hauteur de capitale, chasse, couleur, centrage | + : T1 et T2 égaux |
| `m17_stabilite.py` | T vs T+1 s | − : 1920 vs 2400 → 395 482 px |
| `m18`, `m19` | fond de l'écran, lueur cyan du bas + prédiction sRGB / linéaire | + : marge du cadre égale ; − : marge vs centre |
| `m20_reflet.py` | reflet : position, épaisseur, amplitude | + : fond de carte de part et d'autre |
| `m21` | étendue horizontale du reflet, ordre de superposition | — |
| `m22`, `m22b` | 11 textes : hauteur d'encre, largeur, couleur, lignes | + : titre or ; − : zone sans texte |
| `m23`, `m23b` | pas des rangées (centroïde sous-pixel), voyants | + : pas régulier des deux côtés |
| `m24_col.py` | triangle du col : largeur par ligne, remplissage | + : décroissance linéaire = triangle |
| `m25`, `m26` | montre, barre horizontale sous le col | même critère des deux côtés |
| `m27_encolure.py` | profil du bord supérieur du buste | + : symétrie de la référence |
| `m28_coiffe.py` | largeur de la masse sombre / largeur du visage | invariant d'échelle |
| `m29_visage.py` | visage, yeux, bouche en % du visage | — |
| `m30_res2400.py` | 1080×2400 vs 1080×1920 dans le cadre | − : fenêtre décalée de 40 px |
| `m31_reflet_largeur.py` | largeur du reflet — **instrument écarté**, contrôle échoué | voir §6 |
