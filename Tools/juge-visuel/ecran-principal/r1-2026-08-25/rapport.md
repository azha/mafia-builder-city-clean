# Juge visuel ⊥ — écran principal (district de Brennar) — r1 — 2026-08-25

Dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/`
Instruments : `mesures/*.py` (PIL, sans numpy). Échelle posée par le dossier : **1 px CSS =
largeur/392** ⇒ canon ×3,0000 · captures ×2,7551. Toutes les grandeurs ci-dessous sont en **px CSS**
sauf mention contraire.

---

## Verdict : **NON APPROUVÉ**

Le chrome est fidèle dans ses jetons (couleurs exactes au canal près, largeurs de boutons, hauteur de
la fiche, hauteurs de capitale) mais l'écran ne se **lit** pas comme la maquette : un enum anglais
occupe la place de l'heure, la plaque du dock est recouverte par l'art à 1080×1920 (contraste des
libellés 3,49:1, sous le plancher 4,5:1 écrit au dossier), et **six surfaces translucides sur six**
rendent trop fort — une erreur de modèle, pas six erreurs.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | canon | jeu | script |
|---|---|---|---|---|
| 1 | **surface OPAQUE témoin** (intérieur du bouton COLLECTER) | (217,175,81) L=177,1 | (216,175,81) L=176,9 · **ΔL = −0,2** | `21` |
| 2 | dégradé du CTA or, haut → bas | (233,197,107) → (206,160,62) | (232,195,105) → (202,156,58) | `20` |
| 3 | encre du CTA (pixel le plus sombre) | (36,24,4) | (34,22,0) | `33` |
| 4 | jeton crème-2 (libellés) | (185,173,146) | (185,173,146) — **identique** | `15` |
| 5 | jeton crème (valeurs) | (234,224,200) | (234,224,200) — **identique** | `15` |
| 6 | jeton or-vif (argent, titre) | (242,201,107) | (242,201,106) | `15`,`17` |
| 7 | largeur des 3 boutons / écarts | 105,3 / 9,0 | 106,0 / 9,1 | `19` |
| 8 | hauteur de la fiche | 169,0 | 168,8 | `12`,`13` |
| 9 | largeur de la fiche (marge latérale) | 366,0 (13,0) | 368,1 (12,0) | `12` |
| 10 | filet laiton haut de fiche | 1,00 d'épaisseur, centré | 1,09, centré (541 px vs axe 539,5) | `12`,`18` |
| 11 | médaillon : diamètre / axe X | 64,0 / 195,8 | 62,4 / 195,8 | `8` |
| 12 | le filet laiton **ne coupe pas** le disque | 0 px laiton dans le disque | 0 px laiton dans le disque | `33` |
| 13 | le filet croise le médaillon à | 67,7 % de sa hauteur | 66,2 % | `8` |
| 14 | libellé du manomètre, hauteur de capitale | 5,00 (HEAT) | 5,08 (CHALEUR) | `36` |
| 15 | hauteur de capitale « ARGENT » | 6,33 | 6,53 | `16` |
| 16 | hauteur de capitale des libellés du dock | 6,00 | 5,81 | `27` |
| 17 | écart entre deux ronds du dock (bord à bord) | 22,2 | 21,1 | `28` |
| 18 | indicateur d'onglet actif (laiton) | 14,0 × 2,0 | 13,4 × 1,8, sous le bon rond | `27` |
| 19 | losange laiton sous le médaillon | présent, sur l'axe | présent, sur l'axe (195,8) | `32` |
| 20 | or de la barre de ratio | (217,171,78) | (217,171,77) | `35` |
| 21 | densité d'encre de la fiche (L>90) | 9,71 % | 9,71 % | `31` |
| 22 | bandeau : L moyenne / densité | 32,2 / 4,91 % | 31,2 / 6,34 % | `31` |
| 23 | titre + sous-titre de la fiche : centrage | axe 195,0 | axe 195,8 | `17` |
| 24 | **aiguille du bon côté** (non inversée) | −42,5° pour 37 % (teal à gauche) | −60° pour « Froid » (teal à gauche) | `10` |
| 25 | troncature / débordement | — | **0 px d'encre touche un bord**, aux 2 résolutions | `32` |
| 26 | mise en page identique entre les 2 résolutions | — | masque d'encre de la fiche : **0,026 %** de différence | `32` |
| 27 | l'art est **bit-identique** entre les 2 captures | — | écart moyen **0,00 L** au décalage d=240, sur 4 lignes éloignées | `25` |
| 28 | sous-titre de la fiche, hauteur de capitale | 6,33 (« BAR ») | 6,90 (« OP » de OPÉRATIONNEL) | `40` |
| 29 | valeur de stat, hauteur de capitale | 10,00 (« 180/h ») | 11,25 (« Sain ») | `41` |

Le point 1 est le contrôle qui autorise tout le reste : sur une surface opaque les deux images
donnent le même pixel à 0,2 L près, donc les écarts mesurés plus bas ne viennent pas de l'instrument
ni d'un profil couleur.

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir son quartier vivant, y repérer ses bâtiments, en toucher un pour savoir ce qu'il vaut
et décider quoi en faire. Tout le reste est du chrome posé sur la ville.

**Ordre de lecture.**
1. **La ville** — elle occupe 100 % du cadre, plein bord, et c'est la seule zone qui bouge/vit
   (fenêtres allumées, néons). Rien ne la borde.
2. **L'argent en or, en haut à gauche** — le seul or de la barre, en serif, sur fond de verre fumé,
   avec sous lui un fil de 2 px propre/sale.
3. **Le médaillon central** — montre de gousset : un cadran à aiguille dont le nombre est écrit
   *sur* le cadran, l'aiguille lui passant dessus.
4. **La fiche** — plaque de verre fumé **plus sombre que la carte**, filet laiton en tête, titre
   serif or, trois chiffres codés par couleur (or = argent, crème = neutre, braise = danger), et
   **une seule action colorée** : COLLECTER.
5. **Le dock** — la bande la plus sombre de l'écran, quatre ronds charbon gravés, trait laiton sous
   l'actif.

**Zones.** barre unique (0 → 51) · bandeau éphémère (78 → 89) · ville (plein cadre, sous tout) ·
fiche (426 → 594) · dock (606 → 696).

**Traits d'identité** — les cinq choses qui font que c'est *cet* écran :
- **la ville plein cadre** : le chrome flotte dessus, il ne l'encadre pas ;
- **une seule barre de verre fumé, bord à bord**, traversée d'un filet laiton d'1 px ;
- **l'or réservé à l'argent** (et au seul CTA) ;
- **la fiche plus sombre que la carte** — une plaque, pas une vitre ;
- **le dock = le sol** : la valeur la plus basse de l'écran, tout en bas.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, sur trois points, et un seul d'entre eux est une affaire de pixels.

**Ce qui tient.** Le squelette est là et il est juste : la fiche fait la bonne hauteur (168,8 contre
169,0), ses trois boutons la bonne largeur (106,0 contre 105,3), le CTA or est *exactement* le bon
or, le médaillon est sur l'axe, le filet laiton le traverse au même endroit, l'aiguille est du bon
côté. Un lecteur qui cherche « est-ce le bon écran ? » répond oui du premier coup d'œil.

**Ce qui change la lecture.** (1) **La ville n'est plus plein cadre** : elle est posée à 90 % de sa
taille dans une fenêtre bordée d'un aplat uni — 12,9 % de l'écran à 1080×1920, **21,3 % à
1080×2400**, où une bande vide de 125,6 CSS s'ouvre entre le chrome et l'art. Le chrome n'est plus
*sur* la ville, il est *à côté* d'elle. (2) **À 1080×1920 le dock devient le point le plus clair de
la moitié basse** : sa bande passe d'une luminance moyenne de 29,7 (canon) à **82,1**, et de 3,75 %
à **46,8 %** de pixels au-dessus de L=90, parce que l'art déborde sous la fiche et recouvre la
plaque. Le « sol » de l'écran s'allume ; l'œil y descend avant d'aller à la fiche, et les libellés
de navigation tombent à **3,49:1**. (3) **La fiche n'est plus une plaque, c'est une vitre** : elle
laisse passer **7,4×** plus de fond que le canon, si bien que grues, docks et eau se lisent derrière
« Au repos · Coupée · Sain ».

**Les trois écarts de tête, par impact perçu.**
1. **« Dawn »** — le mot le plus gros du coin droit est un enum anglais, là où la maquette met
   l'heure. Un joueur francophone le lit avant tout le reste du bandeau.
2. **Le dock allumé à 1080×1920** (×2,8 en luminance, ×12,5 en densité claire) et ses libellés sous
   le plancher de contraste écrit au dossier.
3. **Les six surfaces translucides trop fortes** — bordures de boutons, fonds de boutons,
   séparateurs, les deux arcs du manomètre, la plaque de la fiche : toutes du même côté. Le résultat
   perçu est un écran « plus clair et plus bavard » que la maquette, où les filets discrets
   deviennent des traits.

---

## 3. Écarts

Tri : BLOQUANT → MAJEUR → MINEUR → ASSUMÉ → ARBITRAGE. `réf` = canon, `jeu` = capture 1080×1920 sauf
mention. Une cause commune à plusieurs lignes est signalée en `note`, les lignes ne sont pas fusionnées.

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| 1 | `bar.droite.val` — l'heure | **BLOQUANT** | « 21:40 », crème, serif, cap 10,00 | « **Dawn** », crème, serif, cap 9,80 | contenu | `16` | Enum brut **en anglais** dans un écran français ⇒ viole la doctrine « aucun enum brut ne doit atteindre l'écran ». Et l'**heure disparaît** : le canon la donne comme 3ᵉ information de la barre (annotation ③ : « elle pilote la scène jour/nuit »). Le libellé au-dessus perd aussi la phase et le « · » : « JOUR 12 · SOIRÉE » → « JOUR 1 ». |
| 2 | `dock.libelle` — contraste (1080×1920) | **BLOQUANT** | encre (185,173,146) sur (11,16,25) ⇒ **8,48:1** | encre (185,173,146) sur (53,87,102) ⇒ **3,49:1** | −59 % | `27` | Plancher écrit au dossier : **≥ 4,5:1** pour les petits textes (cap 5,8). Mesuré sur les 4 libellés : 3,54 / 3,49 / 3,49 / 3,49. À 1080×2400 le même texte est à **7,74:1** ⇒ écart **propre à la résolution**. Même cause que #3. |
| 3 | `dock.fond` (1080×1920) | **BLOQUANT** | L moyenne **29,7**, 3,75 % de pixels > L90 | L moyenne **82,1**, **46,8 %** > L90 | ×2,8 / ×12,5 | `31`,`24` | La colonne d'art (972×1728) dépasse le bas de l'écran à cette résolution et recouvre la plaque du dock d'une nappe claire (85,135,157 → 36,60,73). Le dock, bande **la plus sombre** de la maquette, devient la plus claire de la moitié basse ⇒ hiérarchie de valeurs verticale inversée. À 1080×2400 la nappe s'arrête au-dessus des ronds et la plaque réapparaît (L 53,2 · 24,9 %). |
| 4 | `art` — cadrage | **MAJEUR** | plein cadre, 0 % d'aplat | colonne **972 × 1728 px**, aplat (34,38,49) sur **12,9 %** de l'écran | +12,9 pts | `3`,`39`,`25` | Bandes latérales de **19,6 CSS** de chaque côté + bande haute de **38,5 CSS**. 972/1080 = 1728/1920 = **0,9000** exactement ⇒ l'art annoncé natif 1080×1920 est rendu à 0,9× (à confronter à la doctrine « le fond n'est JAMAIS mis à l'échelle »). Contrôle : l'art est **bit-identique** entre les deux captures (0,00 L d'écart au décalage 240) ⇒ pas de mise à l'échelle *variable*, une mise à l'échelle *fixe*. |
| 5 | `art` — cadrage (1080×2400) | **MAJEUR** | — | bande vide pleine largeur **1080 × 346 px = 125,6 CSS** (11 % de la hauteur), aplat total **21,3 %** | — | `3`,`39` | 264 lignes **100 % aplat** (y 216..479), rien dedans. Le bandeau et la ville sont séparés par un vide plus haut que le bandeau lui-même. |
| 6 | surfaces translucides (6) | **MAJEUR** | mélange **sRGB** | mélange **linéaire** | voir note | `20`,`21`,`22` | Six surfaces indépendantes, **toutes** trop fortes, **même signe** : bordure de bouton-filet ×2,11 · fond de bouton-filet ×4,78 · séparateur de stats ×3,42 · arc froid ×1,47 · arc chaud ×1,42 · plaque de la fiche ×7,4 (transmittance). **Expérience à une variable** (`22`) : pour trois jetons d'alphas différents (42, 10, 16 /255) sur le fond réellement mesuré, la prédiction **sRGB** colle au canon à **0,3–6,0/255** et rate le jeu de **30–58/255** ; la prédiction **linéaire** colle au jeu à **1,0–6,7/255** et rate le canon de **34–52/255**. Ce n'est pas six erreurs, c'est une erreur de **modèle**. |
| 7 | `fiche.plaque` — opacité | **MAJEUR** | transmittance apparente **0,029** | **0,214** (1920) · **0,275** (2400) | ×7,4 / ×9,5 | `13`,`14` | Mesure : dispersion p5–p95 dans une bande sans texte, divisée par la dispersion de l'art juste au-dessus. Contrôle négatif sur une surface opaque : **0,0000**. Conséquence perçue : l'art (grues, docks, eau) se lit à travers la fiche ; la L moyenne de la bande passe de 35,2 à 46,2 **à densité d'encre identique** (9,71 % dans les deux). Trait d'identité perdu : « fiche = verre fumé PLUS SOMBRE que la carte ». Même cause que #6. |
| 8 | `fiche.stats.valeur` — couleur | **MAJEUR** | or (242,201,107) · crème (234,224,200) · **braise (224,102,74)** | crème, crème, crème | 2 couleurs perdues sur 3 | `17` | Le canon code : or = argent, braise = danger. En jeu les trois bandes sont de la même couleur ⇒ aucun signal de gravité, et l'or quitte la fiche (il n'y reste que le titre et le CTA). *Le remplacement des chiffres par des bandes est ASSUMÉ ; la perte du codage couleur ne l'est pas.* |
| 9 | `fiche` — rythme vertical | **MAJEUR** | marge sous les boutons **15,0** | **42,9** | **+186 %** | `18` | Toute la pile est comprimée et calée en haut : filet→titre 20,7→16,3 · titre→sous-titre 10,6→5,9 · sous-titre→valeurs 17,4→15,6 · valeurs→libellés 8,9→**3,3** · libellés→boutons 16,0→**7,2**. Le déficit cumulé (22,5) se retrouve en bas : **un quart de la plaque est vide** sous les boutons. |
| 10 | `medaillon.arc` — secteurs | **MAJEUR** | teal −85..−3° · **NEUTRE +3..+27°** · braise +28..+87° | teal −96..−9° · saumon clair −6..+39° · saumon soutenu +42..+90° | secteur neutre supprimé ; rouge 59°→**93°** | `10`,`11` | Le rouge commence à **12 h** au lieu de +28°. La moitié droite du cadran lit « alarme » en permanence. Couleurs : froid (68,101,113)→(108,149,153) ; chaud (132,70,61)→(179,101,88) — voir #6. |
| 11 | `bar` — emprise | MINEUR | barre **bord à bord**, 392,0 de large, 50,7 de haut | carte flottante à coins arrondis, **367,7** de large, **46,8** de haut | −6,2 % / −7,7 % | `29` | 12,3 CSS d'aplat de chaque côté ⇒ le filet laiton s'arrête aussi 12 CSS avant les bords. Se cumule avec #4 : le chrome entier est encadré. |
| 12 | `bar.lib` — interlettrage | MINEUR | « ARGENT » : 42,0 de chasse pour cap 6,33 | 36,3 pour cap 6,53 | **−16 %** à hauteur égale | `16`,`27` | **Écart SÉLECTIF, avec son propre témoin** : le **même mot** « FAMILLE », même fonte, même écran, dans le dock : 41,0 → 38,8 pour des capitales de 6,00 → 5,81, soit **−2 %** à hauteur égale. ⇒ le défaut désigne le **conteneur du bandeau**, pas la typographie du client. (Sens de contrôle : DejaVu est plus large que Noto, donc une simple substitution de fonte élargirait, elle ne rétrécirait pas.) |
| 13 | `bar.aile.gauche` — position | MINEUR | « ARGENT » débute à **17,0** ; barre de ratio à 16,0..89,7 | débute à **72,6** ; ratio à 72,2..141,2 | **+56 CSS** | `15`,`35` | L'argent quitte le bord et se rapproche du médaillon. Le bouton retour (ASSUMÉ) occupe le bord. |
| 14 | `fiche.stats` — colonnes | MINEUR | séparateurs à **140,0 / 251,7** ⇒ 110,7 · 110,7 · 110,7 | **153,5 / 269,7** ⇒ **125,5 · 116,2 · 94,0** | max/min = **1,34** | `19` | Colonnes dimensionnées au contenu, pas en tiers égaux. Conséquence : la valeur centrale est à **212,2** au lieu de 196,0, soit **+16,3 CSS hors de l'axe de l'écran**. |
| 15 | `fiche.btn` — hauteur | MINEUR | **40,0** (plaque + bordure) | **34,1** | −14,7 % | `19` | Largeurs et écarts, eux, sont justes (contrôle #7). |
| 16 | `dock.rond` — diamètre | MINEUR | **46,0 × 46,3** | **42,8 × 43,6** | −6,5 % | `28` | L'écart entre ronds, lui, est conservé (22,2 → 21,1). |
| 17 | `medaillon` — composition interne | MINEUR | moyeu à **56 %** de la hauteur du disque ; valeur « 37 % » y 108..135, arc coloré jusqu'à y=131 ⇒ **recouvrement 24 px** | moyeu à **42 %** ; « Froid » y 116..135, arc coloré jusqu'à y=99 ⇒ **écart de 17 px** | −14 pts | `37`,`42` | Le canon écrit le nombre **sur le cadran**, l'aiguille lui passant dessus : ça se lit comme une montre. Le jeu empile trois rangs séparés — arc, valeur, libellé. |
| 17b | `medaillon` — hiérarchie interne | MINEUR | valeur **9,33** / libellé **5,00** ⇒ rapport **1,87** | valeur **7,26** / libellé **5,08** ⇒ rapport **1,43** | −22 % sur la valeur | `42`,`36` | Le libellé est à la bonne taille (contrôle #14) ; c'est la **valeur** qui rétrécit, donc le contraste de taille entre les deux se réduit d'un quart. |
| 18 | `bar.volute.d` | MINEUR | volute décorative présente à droite (x 363..377) | **rien** : L max = 37,9 = la couleur d'aplat | absente | `29` | À gauche la flèche de retour occupe la place de la volute (ASSUMÉ). À droite rien ne la remplace ⇒ la barre perd sa symétrie. |
| 19 | `bar.filet` — épaisseur | MINEUR | **1,00** (3 px) | **1,81** (5 px) | +81 % | `6` | Un filet « discret » devient un trait. |
| 20 | `fiche` ↔ `dock` — jointure | MINEUR | 11,3 CSS d'art visible entre le bas de la fiche et le dock | **0** : la fiche finit à y=1653, la nappe commence à 1654 | −11,3 | `13` | La fiche est collée au dock. |
| 21 | `bar.aile.gauche.val` — corps | MINEUR | chiffres hauts de **11,33** | **10,53** | −7,1 % | `16` | Conséquence probable du format plus long (10 glyphes contre 8) — voir ARBITRAGE #31. |
| 22 | `Verge-A` | **EN TROP** / MINEUR | — | texte 6,17 de haut, x 24,3..50,8, y 62,1..67,9, encre **(224,227,228)** | — | `29` | Encre **hors palette** (ni crème 234,224,200 ni crème-2 185,173,146). Chaîne à allure d'identifiant (casse mixte + tiret), calée à gauche, là où le canon centre son bandeau éphémère. |
| 23 | `bandeau-alerte` | **ABSENT** / MINEUR | bandeau centré sous la barre (y 78..89), « ✉ **Sal** a un rapport du soir — **lire** » | rien | — | `29` | Peut être un état **sans événement** (le canon appelle ces bandeaux « éphémères ») : non tranchable sur une seule capture — voir §6. |
| 24 | `dock.famille.disc` | **ABSENT** / MINEUR | pastille or **5,3 × 5,3** en haut à droite du rond FAMILLE | 0 px laiton dans la zone, aux 2 résolutions | — | `27` | Idem : peut être un état sans notification. |
| 25 | `bar.ratio` — part sale | **ABSENT** / MINEUR | or (217,171,78) sur 68 %, puis **gris (90,99,118)** sur 32 % | or (217,171,77) sur **100 %** de la barre | — | `35` | Légitime si le joueur n'a que de l'argent propre à J1 ; mais une barre pleine se lit comme un soulignement, pas comme une jauge. Largeur 74,0 → 69,3 (−6,4 %), épaisseur 2,0 → 1,8. |
| 26 | 3 chiffres → 3 bandes | **ASSUMÉ** | `$ 2 400` · `$ 180/h` · `12%` | « Au repos » · « Coupée » · « Sain » | — | `17` | **Rendu proprement** : positions et rôles conservés, libellés traduits (REVENU · CHAÎNE · ÉTAT), aucun libellé de repli visible. Deux réserves qui ne sont *pas* couvertes par l'assumé : la couleur (#8) et l'égalité des colonnes (#14). |
| 27 | nom → type (« Lab ») | **ASSUMÉ** | « LE VERGE D'OR » | « Lab » | — | `17`,`18` | **Rendu proprement** : or-vif exact (242,201,106), centré sur l'axe (195,8), cap 12,34 contre 11,00 (+12 %). |
| 28 | libellés du dock | **ASSUMÉ** | EMPIRE · FAMILLE · MARCHÉ · PLUS | ACCUEIL · FAMILLE · FILIÈRE · PLUS | — | `27` | **Rendu proprement** : interlettrage conservé, accents corrects (FILIÈRE), indicateur d'actif au bon endroit. |
| 29 | ronds vides (sans icône) | **ASSUMÉ** | icône 20×20 gravée dans chaque rond | ronds vides | — | `28` | **Rendu proprement** (pas de trou, pas de carré de repli). Réserve de lecture : 4 disques vides de 42,8 CSS forment une grande surface muette, et l'onglet actif n'est plus signalé que par le trait laiton de 2 px. |
| 30 | flèche de retour | **ASSUMÉ** | volute décorative | flèche 7,6 × 4,4, encre (238,241,242) | — | `15` | **Rendu proprement**. Réserve : l'encre est un blanc pur, **hors palette**. |
| 31 | format monétaire | **ARBITRAGE** | `$ 24 850` (fr, espace, sans décimales) | `$10,000.00` (en-US, virgule de milliers, 2 décimales) | — | `16` | Écran par ailleurs francophone. |
| 32 | familles de police | **ARBITRAGE** | rendu en **Noto Serif / Noto Sans** (substitution de Georgia / Segoe UI, cf. `fc-match` du dossier) | DejaVu Serif / DejaVu Sans | — | `16`,`36` | Non corrigible côté client, et **les hauteurs de capitale concordent** (+3 % ARGENT, +2 % libellé du manomètre, −7 % chiffres) ⇒ rien à faire, sauf à trancher l'embarquement de la même fonte. |
| 33 | état jour / nuit | **ARBITRAGE** | image de référence = état **NUIT** (`JOUR 12 · SOIRÉE`, 21:40, fond nuit) | capture = état **JOUR** (`day_phase = Dawn`) | — | `30` | **Cet écart n'est pas dans la liste des ASSUMÉS et devrait y être.** Il rend non concluante toute comparaison de palette globale, de luminance moyenne et de l'art lui-même (L moyenne 60,4 canon contre 78,7 jeu : deux variables bougent ensemble). Toutes les mesures du présent rapport ont donc été restreintes au chrome. |
| 34 | pastilles numérotées ①..⑥ | *non-écart* | 6 disques or numérotés posés sur le téléphone | absentes | — | `29` | Ce sont les **annotations** du document source (`.co`, z-index 6), pas du chrome d'écran : leur absence en jeu **n'est pas un écart**. Conséquence pour moi : la pastille ② **occulte le losange du canon** ⇒ voir §6. |

---

## 5. Autres résolutions

### 1080×1920 (résolution native annoncée de l'art)
- **Tient** : aucun débordement, aucune troncature (0 px d'encre sur les 4 bords) ; le bandeau est
  **bit-identique** à celui de 1080×2400 (0 pixel différent sur 216 000) ; la fiche a la même mise en
  page (masque d'encre : 0,026 % de différence).
- **Écarts propres à cette résolution** : #2 (contraste du dock à **3,49:1**, contre 7,74:1 à 2400)
  et #3 (plaque du dock recouverte, L 82,1 contre 53,2). La colonne d'art fait 1728 px de haut et
  démarre à y=240 ⇒ elle finit à y=1968, soit **48 px au-delà du bas de l'écran**, et sa nappe
  basse recouvre les 267 px du dock.

### 1080×2400 (téléphone 19,5:9 réellement visé)
- **Tient** : aucun débordement ni troncature ; la fiche, le dock et le bandeau conservent leurs
  proportions en % de largeur ; contraste des libellés du dock rétabli à **7,74:1** ; la plaque du
  dock est visible (L moyenne 53,2).
- **Écart propre à cette résolution** : #5 — une bande **100 % vide** de 1080 × 264 px (392 × 95,8
  CSS) entre le filet laiton et le haut de l'art, et **21,3 %** de l'écran en aplat de remplissage.
  Ni le canon ni la résolution 1920 ne montrent ça.
- Le reflux se fait donc **entièrement en haut** : tout l'espace supplémentaire va au vide et à
  l'art, aucun à la fiche ni au dock (fiche 465 px et nappe 267 px, identiques aux deux résolutions).

---

## 6. Ce que je n'ai pas pu vérifier

1. **L'état « fiche fermée »** — non fourni. Le canon ne le montre pas non plus, mais c'est l'état
   par défaut de l'écran : ce qui remplit les 169 CSS de la fiche quand rien n'est sélectionné est
   inconnu. *Trancherait : une capture sans sélection.*
2. **L'état NUIT** — la référence est nuit, la capture est jour (écart #33). Toute la couche globale
   (palette dominante, luminance moyenne, densité, contrastes sur l'art) est **non comparable** :
   deux variables bougent ensemble. *Trancherait : une capture à `day_phase` = soirée.*
3. **La bordure claire de la fiche** (`#ffffff17`, +21 L sur l'intérieur au canon). En jeu la fiche
   n'est jamais adossée à un fond assez sombre pour la rendre visible : à gauche et à droite l'aplat
   (34,38,49) est **plus clair** que la bordure attendue, en bas c'est la nappe teal. Je mesure
   **aucune ligne intermédiaire** au bord bas (14 lignes à (17,29,39) puis saut direct au teal) mais
   je ne peux pas conclure « absente ». *Trancherait : une capture où la fiche chevauche l'art
   sombre, ou une mesure du bord haut hors du filet laiton.*
4. **La taille exacte du losange du canon** — occulté par la pastille d'annotation ②. Je peux dire
   qu'il est présent et sur l'axe dans les deux, pas comparer ses dimensions (jeu : 5,8 × 5,8).
   *Trancherait : un rendu de la maquette sans les `.co`.*
5. **La barre de ratio** : je ne peux pas distinguer « la part sale n'est pas dessinée » de « le
   joueur n'a que de l'argent propre à J1 ». *Trancherait : une capture avec de l'argent sale.*
6. **Le bandeau-alerte et la pastille FAMILLE** : absence de dispositif ou absence d'événement ?
   *Trancherait : une capture avec un événement / une notification en attente.*
7. **La justesse de l'aiguille** : elle est du bon **côté** (−60°, dans le secteur froid, libellé
   « Froid ») et l'arc n'est pas inversé — mais avec **une seule bande capturée** je ne peux pas
   vérifier que l'angle suit la valeur. *Trancherait : deux captures à deux bandes différentes, en
   vérifiant que l'aiguille bouge ET du bon côté* (le socle du dépôt documente exactement ce piège :
   une garde « angles strictement croissants » verte sur une aiguille inversée).
8. **La mise à l'échelle de l'art à 0,9×** est **déduite**, pas mesurée sur la source : je mesure un
   conteneur de 972 × 1728 px et le rapport 972/1080 = 1728/1920 = 0,9000 exact, en croisant avec
   l'affirmation du dossier que l'art natif fait 1080×1920. Si la texture source faisait déjà
   972×1728, il n'y aurait aucune mise à l'échelle. *Trancherait : un `identify` de la texture de
   district, hors image.*
9. **Animations, transitions, états `chaud` / `descente`** (chrome qui se réchauffe, aiguille qui
   tremble, gyrophare dans la ville) : hors de portée d'une capture fixe.
10. **La police réellement utilisée par le client** : le `fc-match` du dossier documente la machine de
    rendu de la **maquette**, pas le rendu Unity. Les hauteurs de capitale concordent, donc le point
    est sans conséquence ici, mais je ne l'ai pas vérifié à la source.
11. **Le paysage et les écrans plus larges** : non fournis, hors mandat (le projet vise le portrait).

---

## Annexes

### 1. Inventaire de la référence (`ecran-canon.png`, 1176×2091, ×3,0000)

**Couche globale (chrome seul — l'art n'est pas comparable, cf. §6.2)** : bandeau L moyenne 32,2 /
densité d'encre 4,91 % · fiche 35,2 / 9,71 % · dock 29,7 / 3,75 %. Rythme vertical (CSS) : barre
0→50,7 · filet 51,3 · bandeau-alerte 78→89,3 · fiche 425,7→594,3 · dock 605,7→696.

| id | catégorie | bbox / forme (CSS) | remplissage | bord | texte |
|---|---|---|---|---|---|
| `bar` | chrome | 0..392 × 0..50,7, bord à bord | verre fumé, L moy 32,2 | filet laiton 1,00 en bas | — |
| `bar.aile.gauche.lib` | texte | x 16,0.., cap 6,33, chasse 42,0 | — | — | « ARGENT », (185,173,146), interlettré |
| `bar.aile.gauche.val` | texte | chiffres h 11,33, chasse 47,0 | — | — | « $ 24 850 », (242,201,107), serif |
| `bar.ratio` | jauge | x 16,0..89,7 × 2,0 | or (217,171,78) 68 % + gris (90,99,118) 32 % | — | — |
| `medaillon` | médaillon | Ø 64,0, centre (195,8 · 40,0) | disque sombre | anneau laiton | — |
| `medaillon.arc` | jauge | r ≈ 52 % du rayon, moyeu à 56 % de la hauteur | teal (68,101,113) −85..−3° · neutre +3..+27° · braise (132,70,61) +28..+87° | — | — |
| `medaillon.aiguille` | trait | −42,5° | crème (234,224,200) | — | — |
| `medaillon.val` | texte | y 108..135, **chevauche l'arc de 24 px** | — | — | « 37% », crème, cap **9,33** |
| `medaillon.lib` | texte | 68,2..74,0 % du disque | — | — | « HEAT », cap 5,00, (185,173,146) |
| `medaillon.losange` | ornement | sur l'axe, sous le disque | laiton | — | — |
| `bar.aile.droite.lib` | texte | x ..373,3, cap 8,00 | — | — | « JOUR 12 · SOIRÉE », interlettré |
| `bar.aile.droite.val` | texte | cap 10,00 | — | — | « 21:40 », crème, serif |
| `bar.volute.g/d` | ornement | x 4..38 et 354..388 | crème à faible opacité | — | — |
| `alerte` | bandeau | 78..89,3, centré | dégradé sombre | 1 px clair haut/bas | « ✉ **Sal** a un rapport du soir — **lire** » |
| `fiche` | plaque | 13,0..379,0 × 425,7..594,7 (366,0 × 169,0), r 14 | verre fumé, **transmittance 0,029** | 1 CSS clair (+21 L) | — |
| `fiche.filet` | trait | haut de fiche, 1,00 | laiton, dégradé aux bouts | — | — |
| `fiche.titre` | texte | centré 195,0, cap 11,00 | — | — | « LE VERGE D'OR », (242,201,107) |
| `fiche.type` | texte | centré, cap **6,33** (mesuré sur « BAR », sans accent) | — | — | « BAR · QUARTIER GÉNÉRAL », (185,173,146) |
| `fiche.stats` | rangée | 3 colonnes **110,7 · 110,7 · 110,7**, séparateurs à 140,0 / 251,7 (1,00, L 34) | — | — | — |
| `fiche.stats.val` | texte | cap **10,00** (mesuré sur « 180/h », hors « $ ») | — | — | or / crème / **braise (224,102,74)** |
| `fiche.stats.lib` | texte | cap **6,67** (« REVENUS ») ; 8,33 avec l'accent de « À » | — | — | À COLLECTER · REVENUS · HEAT LOCAL |
| `fiche.btn.or` | CTA | 105,3 × 40,0, r 9 | dégradé (233,197,107)→(206,160,62) | 1 px laiton foncé | « COLLECTER », encre (36,24,4) |
| `fiche.btn.ligne` ×2 | bouton | 105,3 × 40,0, écart 9,0 | fond +8,3 L sur la plaque | bordure **+45,5 L** | crème, cap 8,33 |
| `dock` | chrome | 1..391 × 605,7..696 | dégradé transparent → charbon (L 24) | — | — |
| `dock.rond` ×4 | médaillon | Ø **46,0**, écart 22,2, centres 93,8 / 162 / 230 / 298 | radial charbon | 1 px clair (+29 L) | icône 20×20 |
| `dock.pointe` | indicateur | 14,0 × 2,0 sous le rond actif | laiton | — | — |
| `dock.disc` | pastille | 5,3 × 5,3, coin haut-droit du rond FAMILLE | or | — | — |
| `dock.lib` ×4 | texte | cap 6,00, chasse 36,3 (EMPIRE) / 41,0 (FAMILLE) | — | — | (185,173,146), **contraste 8,48:1** |

### 2. Inventaire de la capture (`capture-1080x1920.png`, 1080×1920, ×2,7551)

**Couche globale (chrome seul)** : bandeau L 31,2 / 6,34 % · fiche 46,2 / 9,71 % · dock **82,1 /
46,8 %**. Aplat de remplissage : **12,9 %** de l'écran (16,49 % des pixels sont exactement à la
couleur d'aplat déclarée (34,38,49) ± 6, plaque du dock comprise). Rythme vertical (CSS) : barre
0→46,8 · filet 47,5 · « Verge-A » 62,1→67,9 · aplat 48,7→87,1 · art 87,1→431,2 · fiche
431,2→600,1 · nappe + dock 600,4→697.

| id | catégorie | bbox / forme (CSS) | remplissage | bord | texte |
|---|---|---|---|---|---|
| `bar` | chrome | **12,3..380,0** × 0..46,8, **coins arrondis** | verre fumé, L moy 31,2 | filet laiton **1,81** | — |
| `bar.retour` | bouton | 7,6 × 4,4, x ≈ 40 | — | — | flèche, encre (238,241,242) — **EN TROP / ASSUMÉ** |
| `bar.aile.gauche.lib` | texte | x **72,6**.., cap 6,53, chasse **36,3** | — | — | « ARGENT », (185,173,146) |
| `bar.aile.gauche.val` | texte | chiffres h 10,53, chasse 63,2 | — | — | « $10,000.00 », (242,201,106) |
| `bar.ratio` | jauge | x 72,2..141,2 × 1,8 | or (217,171,77) **100 %** | — | — |
| `medaillon` | médaillon | Ø 62,4, centre (195,8 · 37,4) | disque sombre | anneau laiton | — |
| `medaillon.arc` | jauge | r ≈ 52 % du rayon, moyeu à **42 %** | teal (108,149,153) −96..−9° · saumon clair (182,127,119) −6..+39° · saumon (179,101,88) +42..+90° | — | — |
| `medaillon.aiguille` | trait | **−60°** | crème (234,224,200) | — | — |
| `medaillon.val` | texte | y 116..135, **17 px sous** la dernière ligne colorée de l'arc | — | — | « Froid », crème, cap **7,26** |
| `medaillon.lib` | texte | 77,3..84,9 % du disque | — | — | « CHALEUR », cap 5,08, (185,173,146) |
| `medaillon.losange` | ornement | 5,8 × 5,8, sur l'axe (195,8 · 75,7) | laiton | — | — |
| `bar.aile.droite.lib` | texte | cap 7,26, chasse 26,9 | — | — | « JOUR 1 » |
| `bar.aile.droite.val` | texte | cap 9,80 | — | — | **« Dawn »**, crème, serif |
| `bar.volute.d` | — | **absente** (L max = aplat) | — | — | — |
| `Verge-A` | texte **EN TROP** | x 24,3..50,8, y 62,1..67,9, cap 6,17 | — | — | encre (224,227,228), hors palette |
| `art` | décor | colonne **19,6..372,4 × 87,1..714,4** (972 × 1728 px) | art de district, jour | — | — |
| `aplat` | fond déclaré | bande haute 392 × 38,5 + 2 bandes de 19,6 | (34,38,49) uni (étendue L = 0,0) | — | — |
| `fiche` | plaque | 12,0..380,0 × 431,2..600,1 (368,1 × 168,8), r ≈ 14 | verre fumé, **transmittance 0,214** | non concluant (§6.3) | — |
| `fiche.filet` | trait | haut de fiche, 1,09, centré | laiton | — | — |
| `fiche.titre` | texte | centré 195,8, cap 12,34 | — | — | « Lab », (242,201,106) |
| `fiche.type` | texte | centré 196,0, cap 6,90 | — | — | « OPÉRATIONNEL », (185,173,146) |
| `fiche.stats` | rangée | 3 colonnes **125,5 · 116,2 · 94,0**, séparateurs à 153,5 / 269,7 (1,1, **L 76**) | — | — | — |
| `fiche.stats.val` | texte | cap **11,25** (« Sain ») / 10,89 (« Au repos », hors descendante) — crème ×3 | — | — | « Au repos » · « Coupée » · « Sain » |
| `fiche.stats.lib` | texte | cap 6,90 | — | — | REVENU · CHAÎNE · ÉTAT |
| `fiche.btn.or` | CTA | 106,3 × **34,1** | dégradé (232,195,105)→(202,156,58) | 1 px laiton foncé | « COLLECTER », encre (34,22,0) |
| `fiche.btn.ligne` ×2 | bouton | 106,0 × 34,1, écart 9,1 | fond **+39,6 L** sur la plaque | bordure **+96,0 L** | crème, cap 9,07 |
| `nappe` | art (débord) | 19,6..372,4 × 600,4..697 | dégradé (85,135,157)→(36,60,73) | — | recouvre la plaque du dock |
| `dock` | chrome | pleine largeur, gradient (34,38,49)→(20,25,36) | **masqué par `nappe`** | — | — |
| `dock.rond` ×4 | médaillon | Ø **42,8**, écart 21,1, centres 100,2 / 164,1 / 227,6 / 291,5 | radial charbon (25,33,47) | anneau clair (L 96, ×2 du canon) | **vide** |
| `dock.pointe` | indicateur | 13,4 × 1,8 sous ACCUEIL | laiton | — | — |
| `dock.disc` | — | **absente** | — | — | — |
| `dock.lib` ×4 | texte | cap 5,81, chasse 38,8 (FAMILLE) | — | — | (185,173,146), **contraste 3,49:1** |

### 3. Correspondance des repères

- Échelle : **1 px CSS = largeur/392** ⇒ canon **×3,0000**, captures **×2,7551** (donnée du dossier,
  vérifiée : `.medaillon` = 192 px = 64,0 CSS au canon, `.dockb .rond` = 138 px = 46,0 CSS, `.fiche`
  = 1098 px = 366,0 CSS à x=39 px = 13,0 CSS — les trois collent aux valeurs de `mesure-canon.txt`).
- Origine : les deux images sont ancrées en haut à gauche (0,0), aucun décalage à appliquer.
- Repère vertical commun le plus fiable : le **filet laiton** de la barre (canon y=154 px = 51,3 CSS ;
  jeu y=131 px = 47,5 CSS) et le **filet laiton de la fiche** (canon y=1281 px = 427,0 ; jeu y=1189
  px = 431,5).
- Entre les deux captures : l'art est translaté de **+240 px** exactement (2400 par rapport à 1920),
  écart moyen **0,00 L** ; le chrome haut est bit-identique ; la fiche est décalée de **+480 px**.

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre.

| script | ce qu'il mesure |
|---|---|
| `lib.py` | médiane de fenêtre, luminance, contraste WCAG, profils |
| `01-repere.py` | échelle, contrôle positif du diamètre attendu |
| `02-cadre.py` · `03-zones.py` · `39-aplat.py` | étendue de l'aplat de remplissage |
| `04-vertical.py` · `24-dock-fond.py` | bornes chrome / art / fiche / dock |
| `05..08` · `29-bandeau.py` | médaillon, anneau, filet, volutes, losange |
| `09..11`, `37`, `38` | arc du manomètre : rayon, secteurs, couleurs, composition |
| `10-aiguille.py` | angle de l'aiguille (**contrôle positif : −42,5° mesuré contre −42° dans la CSS du canon**) |
| `12-fiche-geo.py` · `18` · `19` | fiche : bbox, filet, bandes de texte, séparateurs, boutons |
| `13-translucidite.py` · `14-transmittance.py` | opacité de la plaque (**contrôle négatif : 0,0000 sur une surface unie**) |
| `15`, `16`, `17`, `27`, `33..36` | métrique typographique, contrastes |
| `20`, `21`, `22-modele-melange.py` | surfaces translucides ; **expérience à une variable sRGB vs linéaire** |
| `23`, `26`, `28` | dock : fond, ronds, libellés, indicateurs |
| `25-art-echelle.py` | l'art est-il à la même échelle aux deux résolutions (**0,00 L à d=240**) |
| `30-global.py` · `31-bandes.py` | couche globale, restreinte au chrome |
| `32-divers.py` | débordements, troncatures, identité de mise en page entre résolutions |
| `40`, `41`, `42` | re-vérifications : hauteurs de capitale hors accents, hors anneau, hors aiguille (trois de mes premières mesures étaient contaminées et ont été refaites) |

**Sortie décisive collée** — `22-modele-melange.py`, trois jetons translucides, fond réellement
mesuré sous chacun :

```
=== bordure du bouton-filet  alpha=42/255 ===
  CANON    fond mesure=(9, 16, 26)  resultat MESURE=(57, 61, 69)
           prediction sRGB    =(50, 55, 64)  ecart moyen=  6.0/255
           prediction LINEAIRE=(114, 114, 116)  ecart moyen= 52.3/255
  CAPTURE  fond mesure=(15, 28, 40)  resultat MESURE=(122, 122, 124)
           prediction sRGB    =(55, 65, 75)  ecart moyen= 57.7/255
           prediction LINEAIRE=(114, 116, 118)  ecart moyen=  6.7/255

=== fond du bouton-filet     alpha=10/255 ===
  CANON    resultat MESURE=(18, 24, 35)   sRGB (19,25,35) ecart  0.7   LINEAIRE (58,59,63) ecart 34.3
  CAPTURE  resultat MESURE=(63, 66, 71)   sRGB (24,37,48) ecart 30.3   LINEAIRE (59,63,69) ecart  3.0

=== separateur des stats     alpha=16/255 ===
  CANON    resultat MESURE=(28, 35, 45)   sRGB (28,34,45) ecart  0.3   LINEAIRE (73,74,78) ecart 39.0
  CAPTURE  resultat MESURE=(74, 76, 81)   sRGB (31,38,49) ecart 37.7   LINEAIRE (74,75,79) ecart  1.0
```

Et le contrôle qui valide l'instrument (`21-translucides2.py`) :

```
### CONTROLE POSITIF du meme instrument : le bouton OR (opaque) ###
    canon interieur COLLECTER    (217, 175, 81) L= 177.1
    c19 interieur COLLECTER      (216, 175, 81) L= 176.9
      ecart canon->capture sur une surface OPAQUE : dL=-0.2 (doit etre ~0)
```
