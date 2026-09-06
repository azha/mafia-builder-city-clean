# Juge visuel ⊥ — ⑥ La Famille (l'organigramme) — r1 — 2026-09-06

## Verdict : APPROUVÉ

Aucun BLOQUANT, aucun MAJEUR : l'écran en jeu se lit comme la maquette — même structure, même
palette, même rythme, mêmes largeurs à moins d'1 px CSS — et les dix écarts trouvés sont tous des
finitions visibles seulement côte à côte.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les grandeurs sont exprimées en **px CSS** (référence ÷ 2,0 ; capture : origine (13, 232) px,
÷ 1,88036 — voir annexe 3). « identique » = 0 sur les trois canaux.

| # | grandeur | référence | jeu | Δ | script |
|---|---|---|---|---|---|
| 1 | largeur du don-rang | 513,0 | 513,2 | +0,2 | `m5` |
| 2 | largeur d'un rang | 489,0 | 489,8 | +0,8 | `m5` |
| 3 | x0 des rangs / x0 du don-rang | 48,5 / 23,5 | 48,4 / 23,4 | −0,1 | `m5` |
| 4 | diamètre des médaillons (spec 70,93) | 71,0 | 70,7 – 71,3 | ≤ 0,4 | `m8` |
| 5 | centre x du médaillon de rang | 100,8 | 100,5 | −0,3 | `m8` |
| 6 | couleur du titre (`--or-vif` #f2c96b) | (242,201,107) | (242,201,106) | 1 | `m7` |
| 7 | couleur du sous-titre (`--creme-2`) | (185,173,146) | (185,173,146) | identique | `m7` |
| 8 | couleur du nom de rang (`--creme`) | (234,224,200) | (234,224,200) | identique | `m9` |
| 9 | couleur du texte de puce (`--cyan`) | (127,212,217) | (127,212,217) | identique | `m9` |
| 10 | couleur du libellé d'état | (185,173,146) | (185,173,146) | identique | `m12` |
| 11 | anneau laiton du médaillon de lieutenant | (176,141,62) | (173,139,61) | ≤ 3 | `m8` |
| 12 | hauteur de capitale du titre | 18,5 | 18,6 | +0,5 % | `m7` |
| 13 | hauteur de capitale de « Repos » (même mot) | 15,50 | 15,42 | −0,5 % | `m12` |
| 14 | hauteur de capitale du nom de rang | 16,50 | 17,02 | +3,2 % | `m10` |
| 15 | boîtes pointillées : x0..x1 / hauteur | 97,0..537,0 / 71,0 | 97,3..537,7 / 70,7 | ≤ 0,7 | `m16` |
| 16 | boîte « Recruter » : x0..x1 (largeur) | 22,5..537,0 (515,0) | 22,3..537,7 (515,9) | +0,9 | `m16` |
| 17 | centrage du texte dans les boîtes vides | −0,5 | −0,3 | 0,2 | `m26` |
| 18 | ergot horizontal du rang (x0..x1, longueur) | 31,5..48,0 (17,0) | 31,4..47,9 (17,0) | 0,1 | `m19` |
| 19 | rail principal : x0 · dégradé à 2 %/98 % | 31,5 · (175,140,61)→(55,50,34) | 31,4 · (176,141,62)→(54,48,35) | ≤ 3 | `m19`,`m20` |
| 20 | rails d'équipe : x0..x1 · couleur · hauteur | 73,0..74,0 · (72,62,37) · 63,5–64,0 | 73,4..75,0 · (73,63,40) · 63,8 | ≤ 3 | `m19` |
| 21 | hauteur d'un rang | 99,5 – 101,0 | 100,0 | ≤ 1,0 | `m2` |
| 22 | pas vertical rang→rang (avec boîte vide) | 101,0 | 101,6 | +0,6 % | `m2` |
| 23 | bouton retour : diamètre · x0 | 56,0×56,0 · 26,0 | 56,4×55,8 · 26,1 | ≤ 0,4 | `m6` |
| 24 | chevron « ‹ » : taille · couleur | 6,50×11,50 · (185,173,146) | 6,38×12,23 · (185,173,146) | couleur identique | `m31` |
| 25 | filet de tête : plateau au-dessus du fond | +154 | +152 | −1,3 % | `m30` |
| 26 | puce : hauteur · x0 | 28,00 · 153,0 | 27,65–28,19 · 153,2 | ≤ 0,4 | `m13` |
| 27 | bloc « état » aligné à droite (bord d'encre) | 518,5 – 521,0 | 520,1 | ≤ 1,6 | `m11` |
| 28 | écart dernier bloc équipe → boîte « Recruter » | 19,0 | 19,1 | +0,1 | `m16` |
| 29 | silhouette dans le médaillon (bbox en % du disque) | x 28,2–71,1 · y 41,8–92,9 | x 28,4–70,9 · y 41,4–91,0 | ≤ 1,9 pt | `m23` |
| 30 | liseré interne bas des rangs (ombre .5) | (7,10,14) | (7,10,17) | ≤ 3 | `m21` |
| 31 | luminance moyenne de la feuille · densité d'encre | 29,01/255 · 4,90 % | 28,05/255 · 4,52 % | −3,3 % · −0,38 pt | `m25` |
| 32 | contrastes (titre / nom / libellé / puce) | 11,22 · 13,68 · 8,31 · 10,35 | 11,00 · 13,37 · 8,36 · 10,61 | tous ≥ 7,8:1 | `m25` |
| 33 | période du pointillé | 5,00 | 5,32 | +6 % | `m35` |
| 34 | **espace de mélange** — contour de puce (#7fd4d955) | mesuré (54,87,96) ; prédiction sRGB (54,87,96) ; prédiction **linéaire** (77,131,135) | mesuré (56,89,98) ; prédiction sRGB (54,85,95) ; prédiction **linéaire** (77,130,135) | le jeu tombe sur la prédiction **sRGB** à ≤ 4/255 | `m14` |

**Le point 34 est le contrôle le plus important du tour** : le piège documenté du projet (navigateur en
sRGB, client en linéaire) **ne se déclenche pas ici**. Trois translucidités indépendantes (contour de
puce α=0,333 ; pointillé blanc α=0,133 — pic 52 contre 53 ; bordure or du don-rang α=0,267 — énergie
45,0 contre 51,1 par px CSS pour un contrôle positif opaque à 154,0 contre 161,7) tombent toutes sur la
prédiction sRGB, à 30 à 50/255 de la prédiction linéaire. **Aucune erreur de modèle.**

---

## 0. L'écran, tel que la maquette le dit

**But.** Le mur de photos de la Famille : voir d'un coup d'œil qui tient quoi. Le Don en tête, ses
lieutenants en rangs sous lui, et sous chacun ses hommes — ou le vide qui dit qu'il n'en a pas.

**Ordre de lecture.** (1) « LA FAMILLE » — le seul texte or-vif, le plus gros (capitale 18,5), en tête ;
(2) le rang du Don, isolé, seul bloc à porter une **bordure or** et le seul médaillon à anneau or-vif
avec halo ; (3) la colonne de médaillons des lieutenants, égrenée le long d'un rail laiton qui descend ;
(4) à droite de chaque rang, l'état, en gras ; (5) tout en bas, la seule invitation à agir.

**Zones.** Tête (retour · titre · compte, fermée par un filet laiton) — corps : rang du Don — arbre
(rail vertical + un ergot par rang) — pour chaque lieutenant : rang plein puis bloc « équipe » en
retrait sur son propre rail — pied : boîte pointillée de recrutement.

**Traits d'identité.** (a) L'**arbre** : un rail laiton qui s'éteint vers le bas + un ergot horizontal
qui pique chaque rang, et un second rail, plus court et plus pâle, par bloc d'équipe. (b) La
**hiérarchie par le métal** : or-vif = le Don (anneau + halo + bordure), laiton = les lieutenants,
blanc translucide = le vide. (c) Le **médaillon-buste** : disque bleu nuit strié en rayons, silhouette
crème, anneau fin. (d) Les **micro-libellés** en capitales espacées (VOUS · ÉTAT · DÉLÉGUÉ), toujours
plus petits et plus pâles que ce qu'ils qualifient. (e) Le **plein contre le pointillé** : ce qui existe
est un panneau plein sur dégradé ; ce qui manque est un cadre en pointillé, vide et centré.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui, et de près. Le but est immédiat, l'ordre de lecture est mot pour mot celui de la maquette
(titre or → rang du Don bordé d'or → colonne de lieutenants sur le rail → états à droite → invitation
en bas), et les cinq traits d'identité sont tous là : l'arbre avec son rail dégradé et ses ergots
(x0 à 0,1 CSS près, ergot 17,0 contre 17,0), la hiérarchie du métal, le médaillon-buste (silhouette à
moins de 2 points de la référence, aucune épaule tronquée), les micro-libellés, et l'opposition
plein/pointillé. Les couches globales se superposent : luminance 28,05 contre 29,01, densité d'encre
4,52 % contre 4,90 %, palette dominante dans le même ordre et les mêmes proportions, contrastes de
texte tous ≥ 7,8:1 des deux côtés.

Les trois écarts de tête, par impact perçu : (1) **l'en-tête respire 12 % de plus** — le filet laiton
descend de 13,7 CSS et l'air sous « 3 LIEUTENANTS » passe de 24,5 à 43,6 CSS, seul écart d'espacement
qui se voie sur la vue d'ensemble ; (2) **le Don est moins allumé** — le halo de son médaillon ne pèse
que 53 % de celui de la maquette, ce qui affaiblit (sans le supprimer : l'anneau reste or-vif contre
laiton, et la bordure du rang est juste) la seule marque de rang de l'écran ; (3) **le bouton retour a
perdu son cercle** — l'anneau ne porte plus que 38 % de son énergie de trait (contraste 1,30:1 contre
1,70:1), le chevron restant, lui, exact.

Rien de ce que j'ai mesuré ne change le sens, la hiérarchie ou la lisibilité. Aucune partie de la
maquette n'est absente pour une raison de forme ; aucune partie n'est en trop. Rien n'est coupé, rien
ne déborde, rien ne passe sous le bandeau ni sous le dock.

---

## 3. Écarts

Un finding par ligne. `ASSUMÉ` et `ARBITRAGE` sont dans des tables à part et **ne sont pas comptés
ici**. Toutes les mesures sont en px CSS ou en /255.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `MINEUR` | `NOUVEAU` | non | En-tête ~12 % plus haut : le filet laiton descend, et l'air entre le bas d'encre du sous-titre et le filet enfle de 78 % | hauteur de tête (bord haut de feuille → filet) **115,0 → 128,7** (+13,7 ; +11,9 %) · écart sous-titre→filet **24,5 → 43,6** (+19,1 ; +78,0 %) · le bloc titre+sous-titre, lui, monte de 4,5 (titre 38,0→33,5 ; sous-titre 79,0→72,9) et son interligne interne est stable (23,0 → 21,3) — `m6`, `m7`, `m36` | si l'en-tête du client réserve une zone (safe-area, hauteur fixe) que l'image ne montre pas |
| `F2` | `MINEUR` | `NOUVEAU` | non | L'anneau du bouton retour a perdu ~62 % de son énergie de trait ; le cercle se lit à peine comme un bouton | énergie de trait par px CSS **32,5 → 12,2** (38 %) · pic sur le fond **62 → 47** pour un fond **22 → 27** · contraste anneau/fond **1,70:1 → 1,30:1**. Le remplissage interne (#ffffff08) est juste (excès 7 → 6) et le chevron est exact (6,50×11,50 → 6,38×12,23, couleur identique) — `m18`, `m31`, `m36` | — |
| `F3` | `MINEUR` | `NOUVEAU` | non | Le halo du médaillon du Don pèse la moitié de celui de la maquette : la « seule marque de rang » est moins allumée | intégrale d'excès R par px CSS **90,5 → 48,4** (53 %) · pic d'excès au ras de l'anneau **+17 → +9** · portée comparable (~12 → ~11 CSS). **Contrôle négatif : 0,0 et 0,0** sur les médaillons de lieutenant des deux images (qui n'ont pas de halo) — `m24` | — |
| `F4` | `MINEUR` | `NOUVEAU` | non | Le libellé d'état n'est pas mis en capitales : « État » là où la maquette écrit « ÉTAT ». L'écran se contredit : tous ses autres micro-libellés (VOUS, LE DON, 3 LIEUTENANTS, RÉCENT) sont bien en capitales | casse lue au zoom ×4 sur les trois rangs ; hauteur de capitale 10,50 → 10,64 (égale), chasse 34,50 → 32,44, couleur identique (185,173,146) — `m11`, `m12`, `mesures/zoom_etat.png` | si le libellé vient d'une clé i18n déjà capitalisée à la source (indécidable depuis l'image) |
| `F5` | `MINEUR` | `NOUVEAU` | non | Interligne du bloc « qui » plus lâche : l'air entre le nom et la puce grandit de plus de moitié | écart nom(bas d'encre)→puce(haut) **8,00 → 12,23 et 12,76** (+53 % à +60 %), mesuré sur des témoins homologues sans jambage descendant (« Blanchiment » / « Cuisinier ») et sur des rangs à puce cyan des deux côtés. Décomposition : le nom monte de 1,4 (27,0 → 25,6 sous le haut du rang), la puce descend de 2,3 (52,0 → 54,3) — `m33`, `m36` | — |
| `F6` | `MINEUR` | `NOUVEAU` | non | Dans le rang du Don, l'écart inverse : le nom et son rôle se resserrent de 30 % | écart nom(bas)→rôle(haut) **19,0 → 13,3** (−30,0 %). Position du nom dans le rang identique (29,0..46,5 → 28,2..46,2 sous le haut du rang) — `m22`, `m36` | — |
| `F7` | `MINEUR` | `NOUVEAU` | non | Rayon des coins plus serré | rangs **20,3 → 18,1** (−2,2) · don-rang **20,1 → 16,5** (−3,6). Instrument identique des deux côtés (front du panneau, discriminant B−R ≥ 10 validé en `m2`), biais commun d'environ −2 CSS par rapport à la valeur CSS 22,4 : **seule la différence est opposable** — `m28` | la valeur absolue du rayon côté jeu (l'instrument sous-lit des deux côtés) |
| `F8` | `MINEUR` | `NOUVEAU` | non | La fente du NOM du rang du Don porte un pronom, pas un nom : « VOUS / LE DON » là où la maquette met « Don V. / VOUS ». Le traitement typographique est le bon (sérif, or-vif) mais la première ligne du mur de photos n'est plus un nom | hauteur de capitale 18,00 → 18,61, x0 132,5 → 130,3, couleur (242,201,107) → (242,201,106) : la **forme** est conforme, c'est le **contenu de la fente** qui change. La table des écarts assumés du dossier couvre les noms de lieutenants ; elle ne mentionne pas le rang du Don, et sa clause de sortie nomme « un nom vide » — `m22`, `mesures/zoom_don_nom.png` | s'il existe une source de nom pour le joueur (hors image) |
| `F9` | `MINEUR` | `NOUVEAU` | non | Le fond des rangs est plus saturé en haut de dégradé, ce qui déteint sur le liseré interne | sommet du dégradé (5 % de la hauteur) **(18,24,35) → (20,26,41)** : ΔB **+6** · liseré interne haut **(53,58,67) → (57,64,78)** : ΔB **+11**. Le pied du dégradé, lui, est égal ((15,20,29) → (15,18,28)). Le liseré est cohérent avec le fond qu'il surligne (prédit (55,60,73) pour le jeu) : c'est **une** cause, pas deux — `m20`, `m21` | — |
| `F10` | `MINEUR` | `NOUVEAU` | non | Deux traits « qui s'éteignent » s'éteignent moins : l'ombre portée sous les rangs et les extrémités du filet de tête | ombre portée : creux sous le fond **−11 → −7** /255, portée identique (~9 → ~9,6 CSS) · filet de tête : montée à 8 % de la largeur **+23 → +51**, à 12 % **+45 → +78**, plateau **+154 → +152** ⇒ le filet court presque bord à bord au lieu de s'éteindre — `m21`, `m30` | — |

**Compte : 0 BLOQUANT · 0 MAJEUR · 10 MINEUR.**

### Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce que le dossier assume | ce que je mesure sur la capture | dans le périmètre ? |
|---|---|---|
| noms du compte de démo | « Cuisinier » ×3 : archétype **en français**, ni enum brut, ni repli anglais, ni nom vide, ni identifiant | oui |
| pas de « Loyauté 82 % » | aucune jauge, aucun pourcentage nulle part sur la feuille | oui |
| « Aucune équipe rattachée » sous chaque lieutenant | libellé présent sous les 3 rangs, jamais un slot vide ; boîte pointillée x 97,3..537,7, h 70,7 ; texte centré à 0,3 CSS près | oui |
| la puce montre l'ANCIENNETÉ | « RÉCENT » (jamais vide) ; forme conforme à `.chip.del` : hauteur 27,65–28,19 contre 28,00, x0 153,2 contre 153,0, texte (127,212,217) identique, contour sur la prédiction sRGB | oui |
| pas de chip « Retiré », pas de rang grisé | aucun rang atténué, aucune puce braise | oui |
| pas de « District du Don » | rien sous le rang du Don | oui |
| pas de bandeau « siège libre » | absent | oui |
| archétypes en français | « Cuisinier » (résolveur), aucun `COOK`/`BOOKKEEPER` | oui |
| bustes contemporains | Don tête nue + col, lieutenant à capuche ; bbox de la silhouette à ≤ 1,9 point de la référence en x et en y ; aucune épaule manquante, aucune masse ovale | oui — et la référence **porte déjà** les silhouettes contemporaines (bloc `<defs>` du 2026-09-02 dans `reference-source.html`) : **aucun arbitrage « couvre-chef » n'est ouvert sur cet écran** |

### ARBITRAGES — pas corrigibles côté client

| id | arbitrage | mesure |
|---|---|---|
| `A1` | **Police sérif substituée dans la référence.** La CSS demande `Georgia,"Times New Roman",serif` ; `fc-match` sur la machine de rendu répond **Noto Serif** (dossier § Polices). Le client embarque **DejaVu Serif**. Georgia n'a jamais été montrée à personne | hauteur de capitale comparable et conforme : nom de rang 16,50 → 17,02 (+3,2 %), nom du Don 18,00 → 18,61, titre 18,5 → 18,6 ; ce sont les **formes de glyphes** qui diffèrent |
| `A2` | **Police sans-sérif substituée elle aussi.** ⚠️ Le dossier écrit « sur le sans-sérif, référence et client partagent la MÊME police » — **c'est faux pour CE fichier** : sa CSS demande `"Segoe UI",Roboto,system-ui,sans-serif`, donc **Noto Sans** par la table `fc-match` du dossier lui-même, et non `'DejaVu Sans'`. Un écart de chasse sur le sans-sérif est donc un ARBITRAGE ici, pas un défaut de taille | chasse mesurée sur **trois chaînes identiques**, à hauteur de capitale égale : « Repos » 61,0 → 67,5 (**+10,7 %**), « Aucune équipe rattachée » 239,5 → 264,8 (**+10,6 %**), « Recruter un nouveau lieutenant » 303,5 → 333,4 (**+9,9 %**). Trois mesures, un seul ratio ⇒ métrique de fonte, pas réglage de taille. Le poids est comparable (remplissage de bbox 37,8 % → 35,8 % sur « Repos ») |
| `A3` | Sous-titre « 3 LIEUTENANTS » ~7 % plus grand | hauteur de capitale 12,0 → 12,8 (+6,7 %), chasse 149,5 → 160,1 (+7,1 %). L'écart de chasse est expliqué par `A2` ; l'écart de hauteur (+0,8 CSS) est à la limite de la tolérance et je ne peux pas séparer, depuis l'image, un corps légèrement plus grand d'une métrique de fonte différente |

### Observations qui DÉPENDENT DES DONNÉES (capture datée du 2026-09-04, compte `operational_demo@example.test`)

| observation | maquette | capture | note |
|---|---|---|---|
| archétypes des 3 lieutenants | Comptable · Sécurité · Blanchiment | Cuisinier ×3 | contenu du compte de démo |
| états | Actif · Repos · Actif | Repos ×3 | idem |
| puces | Délégué · Direct · Délégué | Récent ×3 | idem (et `ASSUMÉ` sur la sémantique) |
| bloc d'équipe du 2ᵉ rang | `.eq-resume` + puce « Voir l'équipe » (bloc court, 37,0 CSS de rail) | boîte « Aucune équipe rattachée » (63,8 CSS) | pas d'homologue : la **forme** de `.eq-chip` n'a pas pu être jugée |
| rang mis en avant (`.rang.actif` : fond plat (16,26,40) au lieu du dégradé) | présent sur le 1ᵉʳ rang | aucun rang ne diffère des autres | voir § 6 |
| hauteur de la feuille | 925 CSS (recadrée à l'encre) | 1021 CSS, dont **78 CSS de queue vide** sous la boîte « Recruter » | conséquence attendue d'un panneau qui occupe le rect libre du shell face à une référence recadrée ; ce n'est pas un écart de mise en page |

---

## 5. Autres résolutions

**Non jugeable ce tour : le dossier ne fournit qu'une seule capture (1080×2400).** Ce que je peux
tout de même vérifier sur celle-ci :

- **Gouttière respectée.** La feuille occupe y = 232 → 2151 px et x = 13 → 1065 px. Au-dessus, le
  bandeau se termine par son filet laiton à y = 138–142 et son ornement en losange descend jusqu'à
  y ≈ 230 : **aucun chevauchement**. En dessous, la feuille s'arrête à 2151 et le dock commence plus
  bas : **aucun contenu sous le dock**.
- **Rien de coupé, rien hors cadre.** Marges latérales symétriques (13 px à gauche, 14 px à droite) ;
  le contenu s'arrête à 942,9 CSS pour une feuille de 1021 CSS ; le nom le plus long se termine à
  255,8 CSS et la colonne d'état commence à 453,1 CSS — pas de collision.
- **Langue.** Tout ce qui est affiché est en français : LA FAMILLE · 3 LIEUTENANTS · VOUS · LE DON ·
  Cuisinier · RÉCENT · Repos · État · Aucune équipe rattachée · Recruter un nouveau lieutenant.
  Aucun enum brut, aucun repli anglais.

---

## 6. Non vérifié

1. **La deuxième résolution.** Le dossier n'en fournit qu'une ; la doctrine en demande deux. ⇒ mesure
   qui trancherait : une capture 1080×1920 (et une en 720×1280) par le même test de planche.
2. **L'absence d'animation.** Une seule capture ⇒ aucune paire T / T+1 s à comparer. ⇒ mesure qui
   trancherait : deux captures du même état à 1 s d'intervalle, et un compte de pixels différents hors
   chrome (bandeau + dock exclus).
3. **L'état « rang mis en avant » (`.rang.actif`).** La maquette traite son 1ᵉʳ rang différemment (fond
   plat (16,26,40) au lieu du dégradé, mesuré en `m20`) ; aucun rang de la capture ne diffère de ses
   voisins. Je ne peux pas dire, depuis l'image, si le client ne sait pas rendre cet état ou si aucun
   lieutenant du compte de démo n'y est. ⇒ mesure qui trancherait : une capture d'un compte où un
   lieutenant porte cet état, ou l'énoncé de la règle qui déclenche `.actif` (elle n'est pas dérivable
   du markup : le rang 3 de la maquette porte aussi « Actif » **sans** la classe).
4. **La forme de la puce « Voir l'équipe » (`.eq-chip`)** et son ergot horizontal (`.eq-resume::before`) :
   aucune contrepartie dans la capture (données). ⇒ une capture d'un compte avec au moins une équipe.
5. **Le rect imprimé par le test** n'est pas fourni (log non préservé). L'échelle ×1,88036 est **dérivée
   de l'image** (largeur d'encre de la feuille 1053 px ÷ 560) et corroborée par l'égalité des largeurs
   de rang à 0,8 CSS près — mais elle n'est pas confirmée par une source indépendante.
6. **L'origine verticale de la référence** est supposée être le bord haut exact de la feuille (recadrage
   « à l'encre »). Deux corroborations : x0 du don-rang identique à 0,1 CSS près, et marge basse mesurée
   19,0 CSS pour un `padding-bottom` CSS de 18,67. Ce n'est pas une preuve : si le recadrage avait rogné
   N lignes en haut, `F1` en serait faussé d'autant. ⇒ mesure qui trancherait : la hauteur nominale de
   la feuille rendue, hors image.
7. **La contradiction du dossier sur le sans-sérif** (voir `A2`) : je conclus « police substituée » depuis
   la CSS du fichier de référence et la table `fc-match` du dossier, pas depuis un rendu. ⇒ mesure qui
   trancherait : `fc-match "Segoe UI"` sur la machine de rendu — le dossier la donne déjà (Noto Sans),
   mais son propre commentaire l'ignore.
8. **Le décalage et le flou exacts de l'ombre portée** des rangs (`0 4px 12px #000a`) : je mesure sa
   profondeur et sa portée verticale, pas son décalage ni son rayon de flou.
9. **Le profil colorimétrique.** Aucun profil ICC n'est déclaré dans les deux PNG ; je suppose sRGB des
   deux côtés. Une divergence de profil déplacerait toutes les couleurs d'un même biais — ce que
   l'égalité exacte de cinq couleurs de texte (points 7 à 10 du contrôle positif) rend improbable.
10. **La fraîcheur du contenu.** Les planches ont été prises le 2026-09-04 sur `operational_demo@example.test` ;
    ce compte peut avoir été recréé depuis. Tout ce qui est dans la table « dépend des données » est une
    observation datée, pas une propriété de l'écran.

---

## Annexes

### Annexe 3 — Correspondance des repères

| | référence | capture |
|---|---|---|
| fichier | `reference-1120.png` 1120×1850 | `capture-1080x2400.png` 1080×2400 |
| zone jugée | l'image entière (recadrée à l'encre de la feuille) | la feuille : x 13..1065, y 232..2151 (mesuré, `m1`/`m4`) |
| largeur d'encre de la feuille | 1120 px | **1053 px** |
| **facteur** | **×2,0** (1120 ÷ 560) | **×1,88036** (1053 ÷ 560) |
| origine (0,0) en CSS | pixel (0, 0) | pixel (13, 232) |
| conversion | `CSS = px ÷ 2,0` | `CSS = (px − origine) ÷ 1,88036` |

Corroborations du repère : largeur du don-rang 513,0 contre 513,2 CSS · largeur d'un rang 489,0 contre
489,8 · x0 des boîtes pointillées 97,0 contre 97,3 · ergot horizontal 17,0 contre 17,0 · diamètre des
médaillons 71,0 contre 70,7–71,3.

Le chrome du shell (bandeau, dock, manomètre) n'est **pas** jugé ici : la référence n'en a pas.

### Annexe 1 — Inventaire de la référence (couche globale)

Palette dominante (quantifiée par pas de 16, 1 px sur 4) : (16,16,16) 58,48 % · (16,16,32) 23,48 % ·
(0,16,16) 8,39 % · (16,32,32) 1,43 % · (16,32,48) 0,75 % · (0,0,0) 0,65 %. Luminance moyenne 29,01/255.
Densité d'encre (lum > 45) 4,90 %. Rythme vertical (CSS, origine feuille) : tête 0→115 · don-rang
136→236 · rang1 252,5→353 · vide 368,5→439 · rang2 454,5→553,5 · eq-resume ~562→599 · rang3 629,5→728,5 ·
vide 745→816 · « Recruter » 835→906 · pied 925.

### Annexe 2 — Inventaire de la capture (couche globale)

Palette dominante : (16,16,16) 60,48 % · (16,16,32) 21,96 % · (0,16,16) 6,19 % · (32,32,32) 2,46 % ·
(0,0,16) 1,47 % · (32,16,16) 1,40 %. Luminance moyenne 28,05/255. Densité d'encre 4,52 %.
Rythme vertical (CSS, origine feuille) : tête 0→128,7 · don-rang 150→247,3 · rang1 264,3→363,8 ·
vide 380,2→450,4 · rang2 465,9→565,3 · vide 581,8→652 · rang3 667,4→766,9 · vide 782,8→853,6 ·
« Recruter » 872,7→942,9 · queue vide 942,9→1021.

### Annexe 4 — Scripts

Tous dans `mesures/`, tous impriment la taille des images qu'ils ouvrent.

| script | ce qu'il mesure |
|---|---|
| `m1_reperes.py` | bords de la feuille, couleurs de fond |
| `m2_rythme.py` | bandes de panneau (discriminant B−R ≥ 10) — **avec contrôle positif et négatif** |
| `m3_couleurs_panneau.py` | couleurs de panneau échantillonnées |
| `m4_feuille.py` | extension verticale de la feuille, facteur d'échelle |
| `m5_bboxes.py` | largeurs et x0 des rangs |
| `m6_tete.py` | filet de tête, bouton retour |
| `m7_textes_tete.py` | titre et sous-titre : bbox, capitale, chasse, couleur |
| `m8_medaillons.py` | diamètres et couleurs d'anneau |
| `m9_rang_textes.py` | textes du rang témoin |
| `m10_glyphes.py` | découpe en glyphes, hauteurs de capitale |
| `m11_etat.py` / `m12_etat_detail.py` | bloc « état » : lignes, capitale, couleurs |
| `m13_chip.py` | puce : bbox, hauteur, couleur de contour |
| `m14_translucides.py` | **translucidités : mesuré contre prédiction sRGB ET prédiction linéaire** |
| `m15_boites_vide.py` / `m16_vide_bbox.py` | boîtes pointillées |
| `m17_traits_energie.py` | énergie de trait normalisée — **contrôle positif : filet opaque** |
| `m18_epaisseurs.py` | profils bruts (c'est lui qui a réfuté le « pointillé plus terne » de `m16`) |
| `m19_rails.py` | rails et ergots de l'arbre |
| `m20_fond_rang.py` | dégradés de fond et du rail |
| `m21_bords_rang.py` | liserés internes et ombre portée |
| `m22_don.py` | rang du Don : nom, rôle, glyphes |
| `m23_medaillon_detail.py` | halo et silhouette |
| `m24_halo_don.py` | halo du Don — **contrôle négatif : médaillons de lieutenant, 0,0** |
| `m25_couche_globale.py` | palette, luminance, densité, contrastes |
| `m26_rayons_et_vide.py` | textes des boîtes vides, centrage |
| `m27_rayon_et_tete.py` / `m28_rayon_v2.py` | rayon des coins (v2 = instrument retenu) |
| `m29..m30` | séparateur : étendue et profil |
| `m31_chevron.py` | chevron du bouton retour |
| `m32..m33` | écart nom→puce sur témoins homologues |
| `m34_poids_et_bordure.py` | poids typographique, bordure or du don-rang |
| `m35_pointilles.py` | période du pointillé |
| `m36_synthese.py` | recalcul des grandeurs citées dans le rapport |

**Deux réfutations que mes propres contrôles ont produites, consignées parce qu'elles auraient fait
deux findings faux :**

1. `m16` mesurait la **médiane** des pixels du trait pointillé et rendait (52,54,56) contre (42,43,46) —
   « le pointillé du jeu est 10/255 plus terne ». `m18`, en profil brut, montre que le **pic** vaut 53
   contre 52 : la médiane comptait les pixels d'anti-crénelage, plus nombreux à ×1,88 qu'à ×2,0. Il n'y
   a **aucun** écart de couleur sur ce trait.
2. Le pic de l'anneau or-vif du Don vaut 217 contre 242 — « l'anneau du Don est 10 % plus terne ». Son
   **énergie** intégrée vaut 316 contre 309 par px CSS : c'est le même trait, seulement étalé sur un
   demi-pixel de plus. Écart **nul**.
