# Juge visuel ⊥ — ⑤ La décision du jour — r1 — 2026-09-06

Dossier : `/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/decision-du-jour/r1-2026-09-06/`
Référence : `reference-1080x2102.png` · Capture : `capture-1080x2400.png` (client `76ee3cc`, prise le 2026-09-04 11:22)
Scripts : `mesures/m01…m27` (dont cinq versions successives de `m26`) — chacun imprime la taille des images qu'il ouvre.

## Verdict : NON APPROUVÉ

L'écran en jeu n'est plus une carte distribuée sur une table de zinc : c'est une bannière posée au bas
d'un écran noir vide aux 43,8 %, dont le titre est l'identifiant brut anglais de la carte.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport n'est pas recevable. 16 grandeurs, toutes produites par un script.

| # | grandeur | référence | capture | script |
|---|---|---|---|---|
| C1 | largeur des deux images | 1080 px | 1080 px | m01 |
| C2 | **diamètre du médaillon** (ancre d'échelle partagée) | 144 px | 143 px (**rapport 0,9931**) | m12c |
| C3 | médaillon circulaire dans la référence | 144 × 144 | — | m11 |
| C4 | hauteur du bandeau (filet or) vs géométrie dérivée du dossier (52 CSS-HUD × 2,755 = 143,3) | — | filet à y=138..142 ⇒ **143 px** | m04 |
| C5 | nombre de pastilles par rangée | 3 + 3 | 3 + 3 | m13b |
| C6 | sémantique des jauges : Portée 2/3, Urgence 1/3 | 2 et 1 pleines | 2 et 1 pleines | m13b |
| C7 | hauteur de capitale du « L » de LES LIRE MAINTENANT | 31 px | 32 px (**+3,2 %**, dans la tolérance) | m21 |
| C8 | encre rouge du titre du CTA primaire | (147, 64, 44) | (147, 64, 42) — **Δ ≤ 2/255** | m09 |
| C9 | césure du sous-titre du CTA primaire (mot orphelin) | x=490..587 | x=493..587 — **Δ 3 px** | m15a |
| C10 | bas du CTA primaire, en % du rect libre | 97,4 % | 97,6 % (**+0,2 pt**) | m20 |
| C11 | bas de la carte / légende / CTA2 / CTA1, en % du rect libre | — | tous à **+3,7 à +5,9 pt** | m20 |
| C12 | gouttière — chevauchement contenu / bandeau | — | **aucun** (contenu à y≥1278, chrome ≤226) | m23 |
| C13 | gouttière — chevauchement contenu / dock | — | **aucun** (marge 49 px) | m23 |
| C14 | troncature au bord d'écran | — | **0 ligne** d'encre touche x=0 ou x=1079 | m23 |
| C15 | centrage horizontal du titre du CTA primaire (centre d'écran 540 px) | centre 536,5 (**−3,5 px**) | centre 542,0 (**+2,0 px**) | m27 |
| C16 | chaînes identiques : sourcil, légende, les deux CTA et leurs sous-titres | — | identiques | lecture directe |

> ⚠️ **Un contrôle positif a été retiré, et l'écart qui devait le remplacer a été RÉTRACTÉ.** La première
> version de C15 annonçait un interlettrage égal (+0,8 %), calculé sur des largeurs contaminées par l'art
> peint hors carte. Trois mesures successives ont ensuite donné −18,7 %, −18,2 %, −25,0 % — toutes
> contaminées à leur tour par le **filet rouge intérieur** de la carte, de la même brique que le texte.
> La mesure propre (`m26e`, qui écarte ce filet parce qu'un blanc de 51 px ne peut pas être un
> interlettrage quand aucun autre ne dépasse 17) rend **−9,6 %**, soit **dans** la tolérance de 10 % du
> mandat. **Ce n'est donc pas un écart, et il n'est pas remonté.** Seule la hauteur de capitale l'est (`F16`).

**Témoin.** La référence fournie est bien le cadre **#4** (« la carte distribuée ») : distance à `etats/v4-4.png`
**11,52** contre 36,24 pour le plus proche des quatre autres états (m06). L'état capturé est homologue
(une carte existe, jeton « 1 / libre »), le témoin est donc le bon.

---

## 0. L'écran, tel que la maquette le dit

**But.** Le joueur vient lire LA carte à fort levier du jour et la trancher : la garder pour plus tard
(*Laisser sur le zinc*) ou l'exécuter maintenant (*Les lire maintenant*). La fiction est une table de jeu :
on regarde la carte qu'on vous a distribuée, et le jeton de budget posé à côté d'elle.

**Ordre de lecture.** (1) La **carte crème** — un rectangle clair de **432 358 px de crème mesurés** au milieu d'un décor nocturne,
inclinée de 2°, scellée d'un cachet de cire rouge ; elle est la seule zone claire de la moitié haute et
l'œil n'a nulle part ailleurs où aller. (2) Son **titre**, gros sérif noir sur crème à 11,3:1. (3) Le
**jeton d'or « 1 / LIBRE » **, à droite, à mi-hauteur. (4) Les deux **verdicts** en pied, le second sur une
plaque crème qui reprend la matière de la carte — le geste terminal a la même matière que l'objet qu'il tranche.

**Zones.** décor peint plein cadre · barre haute (argent / chaleur / jour) · table de jeu (carte + jeton) ·
légende en zinc · verdict secondaire (panneau sombre cerclé) · verdict primaire (plaque crème sur bande d'or).

**Traits d'identité.** (a) une **carte à jouer** — portrait, crème, inclinée, cachet de cire ;
(b) un **décor peint** qui occupe tout le cadre et sur lequel la carte est posée ;
(c) la **paire crème** carte ↔ plaque du verdict primaire, seules matières claires de l'écran ;
(d) les **petites capitales espacées** rouge brique (TACTIQUE, PORTÉE, URGENCE, LIBRE) ;
(e) un **jeton moleté** — une pièce, pas un rond.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, et l'écart n'est pas une dérive de valeurs : c'est un changement d'objet.

La maquette est un écran **clair sur fond peint** : dans le rect libre, 22,1 % des pixels sont quasi-noirs
et la luminance moyenne vaut 98,6. En jeu, **94,5 %** des pixels sont quasi-noirs et la luminance moyenne
tombe à **18,4** — 5,35× moins. Le décor a disparu : la capture porte **1 046 lignes strictement uniformes**
(une seule teinte, (13,13,13)) là où la référence n'en a que 17, et 16 415 teintes distinctes sur la seule
bande y=400..700. L'écran n'a plus de lieu.

Ce vide n'est pas décoratif, il déplace la lecture. Un **trou de 1 051 px, 43,8 % de la hauteur**, sépare le
chrome du contenu ; la masse contrastée bascule de **43,0 % dans le tiers haut → 3,4 %**, et de 26,3 % dans le
tiers bas → **75,0 %**. Le contenu commence à **55,7 %** du rect libre au lieu de 29,3 % — conclusion
insensible à l'origine choisie (+22,5 à +30,8 points sur toute la plage testée, m25). La première chose que
l'œil rencontre n'est plus la carte : c'est du noir.

La carte elle-même a changé de nature. Elle passe du **portrait au paysage** (aspect 0,843 → 1,749, facteur
2,07×), perd 47 % de sa hauteur, et surtout **s'inverse** : plaque crème (219,206,171) → intérieur noir
(13,13,13). Le contrôle négatif est net — zéro pixel crème dans sa boîte, hors glyphes. Elle ne se lit plus
comme une carte posée mais comme un panneau d'interface, et la parenté de matière avec le verdict primaire,
qui subit la même inversion, est perdue des deux côtés à la fois.

Enfin, le geste principal devient le moins lisible de l'écran : privé de sa plaque, « LES LIRE MAINTENANT »
garde son encre rouge brique (147,64,42, identique à 2/255 près) mais sur du noir — **2,78:1** contre 4,33:1
dans la référence, sous le plancher de 3:1 des grands textes. La hiérarchie s'inverse : le verdict secondaire,
en crème sur noir, est désormais **5,3× plus contrasté** que le verdict primaire.

**Les trois écarts de tête, par impact perçu :** le fond peint absent (F1) — le vide de 43,8 % qui renverse
l'ordre de lecture (F2) — le titre rendu en identifiant brut anglais (F3).

---

## 3. Écarts

Format imposé par le dossier : un finding par ligne, une seule table, gravité ∈ {BLOQUANT, MAJEUR, MINEUR}.
`critère` = NOUVEAU partout (premier tour). `données` = l'écart dépend-il de l'état du compte de démo ?

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | BLOQUANT | NOUVEAU | non | **Le décor peint est absent** : le rect libre est un aplat noir. Le trait d'identité (b) disparaît — l'écran n'a plus de lieu. | px quasi-noirs 22,1 % → **94,5 %** ; luminance moyenne 98,56 → **18,43** ; bucket dominant 17,5 % → **94,4 %** ; plus longue plage de lignes strictement uniformes 17 px → **1 046 px**, **1 seule teinte** (13,13,13). Contrôle négatif : 16 415 teintes sur REF y=400..700. (m02, m07) | Si l'art est absent, ou présent sous un voile opaque : les deux produisent cet aplat. |
| `F2` | BLOQUANT | NOUVEAU | non | **Vide de 43,8 % de l'écran entre le chrome et le contenu** ; l'ordre de lecture s'inverse — la 1ʳᵉ chose vue n'est plus la carte. | trou contigu **1 051 px** (y=227..1277) ; masse contrastée tiers haut 43,0 % → **3,4 %**, tiers bas 26,3 % → **75,0 %** (**+48,8 pt**) ; début du contenu 29,3 % → **55,7 %** du rect libre ; contenu occupant 68,1 % → **41,8 %**. Robustesse : écart +22,5 à +30,8 pt selon l'origine (m05, m20, m25). | Si le vide est réservé à un contenu non encore construit ou s'il vient de l'ancrage de la mise en page. |
| `F3` | BLOQUANT | NOUVEAU | **non** (la *forme* ; le libellé, lui, dépend de la carte servie) | **Le titre de la carte est l'identifiant brut, en anglais** : « AUTONOMY REPORTS PENDING ». La source du cadre nomme la carte `AUTONOMY_REPORTS_PENDING` et affiche « Des rapports d'autonomie attendent votre lecture ». Underscores → espaces : c'est l'enum, pas une traduction manquante. **Hors du périmètre assumé** — le dossier nomme explicitement « un enum brut, un repli anglais » comme sortie de l'assumé, et la doctrine interdit tout repli anglais à l'écran. | chaîne lue sur la capture (crop `mesures/crop_cap_carte.png`) ; chaîne de référence et identifiant : `ecrans-brennar-4.html` l.639 et son commentaire de cadre. | Si les autres libellés de carte souffrent du même repli (un seul état capturé). |
| `F4` | BLOQUANT | NOUVEAU | non | **La carte perd sa matière** : plaque crème → intérieur noir. Trait d'identité (a) et (c) perdus ; l'objet cesse d'être une carte à jouer. | matière REF (219,206,171) lum 206,2 → CAP (13,13,13) lum **13,0**. Contrôle négatif : le détecteur « crème » rend 432 358 px dans la carte de référence et **0 px de fond** dans celle de la capture (les 15 409 px restants sont les glyphes clairs). (m10) | — |
| `F5` | BLOQUANT | NOUVEAU | non | **Le CTA primaire perd sa plaque crème** ; son texte passe sous le plancher de contraste et la hiérarchie des deux verdicts s'inverse. | plaque REF 987×241 px crème (216,202,167) → **0 px crème** en jeu, fond (13,13,13). Contraste du titre **4,33:1 → 2,78:1** (−36 %, plancher 3:1 grands textes) ; sous-titre 3,45:1 → **2,78:1** (plancher 4,5:1). Le CTA **secondaire** est à 14,80:1, soit **5,3×** le primaire. (m09, m18) | — |
| `F6` | MAJEUR | NOUVEAU | non | **Le contour du CTA secondaire est interrompu** sur le bord haut ET le bord bas ; sa terminaison droite flotte détachée. Classe de cause : un cadre composé de segments dont la partie médiane ne couvre pas la largeur. | couverture du trait **100,0 % → 61,4 %** (haut et bas) ; interruption unique **x=636..959, 324 px**, identique sur les deux bords. Contrôle positif : référence 100,0 %/100,0 %. (m16b) | — |
| `F7` | MAJEUR | NOUVEAU | oui, en partie (le titre tient sur 2 lignes au lieu de 4) | **La carte passe du portrait au paysage.** | 652×773 (aspect **0,843**) → 717×410 (aspect **1,749**) — facteur **2,07×** ; hauteur **−47,0 %**, largeur +10,0 %, aire **−41,7 %**. (m24) | La part de la hauteur imputable au nombre de lignes du titre plutôt qu'à la mise en page. |
| `F8` | MAJEUR | NOUVEAU | non | **Les pastilles changent de famille de couleur et de forme** : rouge brique → or, et la pastille « non atteinte » cesse d'être un anneau creux pour devenir un disque gris plein. | pleine (147,64,44) → (217,171,77), **Δ(+70,+107,+33)** ; vide : remplissage **0,24-0,26 (anneau)** → **0,80 (disque)**, centre (99,99,99) ; diamètre 28 → 25 px (−10,7 %). Contrôle positif : 3 pastilles par rangée des deux côtés. (m13b) | — |
| `F9` | MAJEUR | NOUVEAU | non | **Toutes les petites capitales espacées deviennent du bas-de-casse** — trait d'identité (d). Une seule cause, 5 instances : TACTIQUE→tactique, PORTÉE→Portée, URGENCE→Urgence, LIBRE→libre, LAISSER SUR LE ZINC→Laisser sur le zinc. | lecture directe des crops `crop_cap_carte.png`, `crop_cap_medaillon.png`, `crop_cap_cta2b.png`. La source du cadre écrit ces chaînes en bas-de-casse et les met en capitales au rendu : l'image ratifiée, qui fait autorité, montre des capitales. | — |
| `F10` | MAJEUR | NOUVEAU | non | **Les 4 pastilles du dock ne portent aucune icône** (cercles vides). Chrome hérité — mesuré contre le canon du HUD désigné par le dossier, pas contre le cadre de série 4. | glyphe blanc dans la bande des pastilles : canon **1 989 px** → capture **0 px**. Contrôle négatif : la bande des libellés rend 529 / 801 px des deux côtés (l'instrument voit bien du texte). (m17c) | Si le défaut est du shell ou de cet écran : il est partagé par tous les écrans. |
| `F11` | MAJEUR | NOUVEAU | non | **La disposition Portée / Urgence change** : deux colonnes (libellé en capitales, pastilles dessous, valeur dessous) → deux rangées empilées, tout en ligne. | REF : Portée x=148..254 y≈1416, Urgence x=570..676 y≈1400 (deux colonnes, deux hauteurs). CAP : Portée y=1571..1595, Urgence y=1617..1641, mêmes x (deux rangées). (m13b) | — |
| `F12` | MAJEUR | NOUVEAU | non | **Le filet séparateur sous le titre disparaît.** | REF : trait continu (195,163,131), **couverture 100,0 %** sur x=145..675 = **81 % de la largeur de la carte**, 1 segment. CAP : la bande homologue est un aplat parfait — luminance min = max = **13,00**, écart-type **0,00** sur 25 lignes. (m22c, m22b) | — |
| `F13` | MINEUR | NOUVEAU | non | **Le cachet de cire rouge (♦) au coin de la carte est absent.** | REF : composante de cire saturée présente (contrôle positif OK). CAP : **0 px** de cire rouge dans toute la zone de la carte (x=0..1080, y=1200..1750). (m11) | — |
| `F14` | MINEUR | NOUVEAU | non | **La carte n'est plus inclinée** — elle n'est plus « posée ». | bord gauche : **2,00°** (résidu 0,29 px sur 650 lignes) → **0,00°** (résidu 0,00). Contrôle positif et négatif tous deux OK. (m14) | — |
| `F15` | MINEUR | NOUVEAU | non | **Le jeton perd son moletage** : pièce moletée à bord cranté → disque plat. Trait d'identité (e). | écart-type de la couronne (0,44×D) : **71,31 → 1,25**, soit **57×** ; amplitude 14–185 → 107–112. (m12c) | — |
| `F16` | MINEUR | NOUVEAU | non | **Le sourcil grossit de 31 %** — hors tolérance (≤1 px ou ≤5 %). | hauteur de capitale du « C » initial (sans accent ni jambage) : **16 px → 21 px**, +31,2 %. Le « L » du CTA primaire, lui, tient (+3,2 %, C7) : l'écart est sélectif, il ne vient pas d'un facteur global. (m21) | — |
| `F17` | MINEUR | NOUVEAU | non | **La carte se colle au bord gauche** : marge divisée par 2,3. | sur la boîte entière : **81 px (22,5 CSS) → 35 px (9,7 CSS)**, −46 px (m24) ; à mi-hauteur, où la carte de référence n'est pas mordue par son inclinaison de 2° : **93 px → 35 px**, −58 px (m23b). Marge droite 348 → 329 px. | — |
| `F18` | MINEUR | NOUVEAU | non | **Les ors s'assombrissent**, de façon systématique et de même signe. | corps du jeton (217,188,123) → (202,174,113), lum **−7,3 %** ; libellé du jeton (239,198,105) → (185,173,106), lum **−14,6 %**. Deux mesures, même sens. (m19) | Avec deux points seulement je ne peux pas séparer un changement de jeton de couleur d'une erreur d'espace de mélange : il faudrait plusieurs translucidités sur le même fond. |
| `F19` | MINEUR | NOUVEAU | non | **La légende « Tactique — … » passe d'italique à romain.** | crops `crop_ref_cta2.png` / `crop_cap_cta2.png`, même chaîne, même position (+5,9 pt du rect libre). | — |
| `F20` | MINEUR | NOUVEAU | non | **Le médaillon se décale de 38 px vers la droite.** | centre x 874,5 → 912, **+38 px** (à diamètre identique, C2). (m12c) | — |
| `F21` | MINEUR | NOUVEAU | non | **L'apostrophe typographique devient une apostrophe droite** dans « AUJOURD'HUI ». | référence `’` (U+2019), capture `'` — crops `crop_ref_carte.png` / `crop_cap_carte.png`. | — |
| `F22` | MINEUR | NOUVEAU | oui | **Le bandeau n'affiche ni la phase du jour ni l'heure** : « JOUR 37 » puis un tiret. Chrome hérité, mesuré contre le canon du HUD. | canon : « JOUR 12 · SOIRÉE » + « 21:40 ». Capture : « JOUR 37 » + « — ». (crops `crop_canon_haut.png`, `crop_cap_haut.png`) | Si le tiret est un repli d'absence de donnée ou un état légitime. |

**Compte : 22 findings — 5 BLOQUANT, 7 MAJEUR, 10 MINEUR.** (Compté sur les lignes de la table par un
script, pas récapitulé de mémoire.)
Findings dont la nature ne dépend pas de l'état du compte : **20 sur 22** — géométrie, palette, typographie,
espacements, rythme. Les deux autres : `F7` en partie (le titre tient sur 2 lignes au lieu de 4) et `F22`.

> **Un finding rétracté.** L'interlettrage du sourcil, annoncé à −18,7 % par une mesure contaminée, vaut
> **−9,6 %** une fois le filet intérieur de la carte écarté — dans la tolérance. Il ne figure pas ci-dessus.

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce que le dossier assume | rendu proprement ? | mesure |
|---|---|---|
| les textes de la carte ne sont pas ceux de la maquette | **NON — le périmètre est sorti** : le dossier fait sortir de l'assumé « un enum brut, un repli anglais ». Le titre est les deux à la fois ⇒ remonté en **`F3`**, pas absorbé ici. | voir `F3` |
| « elle revient … au même rang » absent ou reformulé | OUI — la ligne est présente, complète, non tronquée, au même rang que dans la référence | CAP y=1818..1837, chaîne identique à la référence (m05, m15a) |
| 2 options exactement, ou plus | OUI — 2 options, aucun débordement, aucun chevauchement | CTA2 y=1779..1901, CTA1 y=1931..2130, écart 30 px ; 0 troncature au bord (m05, m23) |
| état VIDE possible | sans objet — une carte est présente (témoin #4 confirmé à 11,52 contre 36,24, m06) | m06 |
| chrome partagé à une autre échelle que le cadre (×2,755 vs ×3,6) | OUI — bandeau mesuré à 143 px, conforme à la géométrie dérivée du dossier ; aucune violation de gouttière | C4, C12, C13 |

## ARBITRAGES — pas corrigibles côté client

| point | constat |
|---|---|
| famille de police | La référence a été rendue avec **Noto Serif / Noto Sans** (`fc-match` du dossier) ; le client embarque **DejaVu**. Georgia n'a jamais été montrée à personne. Écart de famille et de chasse = arbitrage ; la hauteur de capitale, elle, est comparée (C7, C15, F16). |
| libellé du 3ᵉ onglet | canon du HUD « MARCHÉ », capture « FILIÈRE ». Décision produit, pas défaut de rendu. |
| format et devise de l'argent | référence « $ 24 850 », capture « 406 653,08 € ». Chrome, et changement de canon de fiction assumé ailleurs. |
| manomètre | canon « 37 % / HEAT », capture « Brûlant / CHALEUR ». Passage à la fiction française, hors périmètre de cet écran. |

---

## 5. Autres résolutions

**Une seule résolution est fournie** (1080×2400). La doctrine du dossier en demande deux ; le dossier le dit
lui-même et me demande de l'écrire plutôt que de le deviner. Ce que je peux affirmer sur celle-ci :
rien n'est coupé (0 ligne d'encre touchant x=0 ou x=1079), rien ne déborde de son parent, la gouttière est
respectée (49 px sous le contenu, 1 051 px au-dessus). Le reflux à une autre résolution n'est **pas vérifié** —
et c'est précisément le vide de `F2` qui rend cette vérification nécessaire : un contenu ancré en bas se
comporte tout autrement sur un écran plus court.

---

## 6. Non vérifié

| point | la mesure hors image qui trancherait |
|---|---|
| Décor absent, ou présent sous un voile opaque ? Les deux rendent un aplat (13,13,13). | une capture avec le voile désactivé, ou la valeur d'alpha du voile |
| Une seule résolution : reflux et ancrage non vérifiés | une capture 1080×1920 (ou 720×1280) du même état |
| **Aucune paire T / T+1 s** ⇒ le ruling « aucune animation sur un nouvel écran » n'est pas vérifié | deux captures du même état à 1 s d'intervalle, comptage des pixels différents |
| Un seul état capturé : je n'ai vu ni l'état vide (#5), ni « budget pris » (#6), ni « après le tampon » (#7), ni les états d'appui / appui long | une planche par état, contre les cadres `etats/v4-5..v4-8.png` |
| `F18` : je ne peux pas séparer un changement de jeton de couleur d'une erreur d'espace de mélange sRGB↔linéaire | 3 à 4 translucidités du même ton sur le même fond, comparées à leur prédiction linéaire |
| `F3` : je ne sais pas si les autres cartes souffrent du même repli | une planche sur deux ou trois cartes différentes |
| `F22` : le tiret est-il un repli d'absence de donnée ou un état légitime ? | le corps de réponse de la route qui alimente le bandeau |
| Le **rect imprimé par le test n'est pas fourni** (log non préservé) | j'ai vérifié la géométrie dérivée sur l'image : filet du bandeau à y=138..142 ⇒ 143 px, conforme aux 143,3 px annoncés (C4) |
| **Contradiction interne du dossier** : la section « Référence » désigne la série **4** (et la mesure le confirme : distance 11,52 à `v4-4`), la section « Échelle » dit de juger « le contenu contre le cadre de **série 6** ». J'ai jugé contre l'image fournie (série 4), comme le dit la règle « l'image fait autorité ». | une phrase du dossier tranchant laquelle des deux séries fait foi pour le contenu |
| **7 de mes propres instruments ont été réfutés par leur contrôle et refaits** (annexe 4), et un finding a été rétracté. Un juge n'est pas plus fiable que sa dernière mesure : les contrôles positifs de la 1ʳᵉ table sont ce qui borne ce rapport | — |

---

## Annexes

### Annexe 3 — Correspondance des repères

- **Échelle du contenu : 1:1.** Vérifiée, pas supposée : le médaillon mesure **144 px** en référence et
  **143 px** en capture (rapport 0,9931, m12c) — les deux côtés sont bien à ×3,6 px par px CSS.
  Toute comparaison de taille de ce rapport est donc un écart réel.
- **Chrome : hors de cette échelle** (×2,755). Le bandeau mesure 143 px (filet or y=138..142, m04),
  conforme à la géométrie dérivée du dossier. Le chrome est jugé contre le canon du HUD
  (`Tools/juge-visuel/ecran-principal/ecran-canon.png`), pas contre le cadre — findings `F10` et `F22`.
- **Rect libre**, base des pourcentages de rythme : référence y=211..2101 (h=1891), capture y=143..2178
  (h=2036). L'origine de la référence est un **choix** (le cadre n'a pas de frontière dure sous son bandeau) :
  m25 montre que la conclusion de `F2` est insensible à ce choix sur y₀ ∈ [100, 320].
- **Inclinaison de la carte de référence : 2,00°** (m14). Toute sonde horizontale sur la carte doit en tenir
  compte : le bord gauche suit x = a·y avec a = +0,0350, donc une horizontale de la carte suit dy/dx = **−0,0350**.

### Annexe 4 — Instruments refaits (et pourquoi)

**7 instruments ont rendu un résultat que leur propre contrôle a réfuté** — dont un, `m26`, sur cinq versions. Ils sont conservés dans
`mesures/` avec leur remplaçant, parce que l'erreur est instructive.

| script | ce que le contrôle a dit | cause | remplaçant |
|---|---|---|---|
| `m12_medaillon.py` | contrôle de circularité **ÉCHEC** (\|L−H\| = 38) | la fenêtre englobait le libellé « LIBRE » sous le jeton | `m12c` (ligne la plus large) |
| `m13_pastilles.py` | 2 pastilles trouvées au lieu de 3 | la carte est **inclinée** (les 2 colonnes ne sont pas à la même y) et la pastille vide est un **anneau dont l'intérieur vaut le fond** | `m13b` (composantes connexes) |
| `m16_bord_cta2.py` | contrôle positif **0 %** des deux côtés | fenêtres posées à l'œil, à côté du trait | `m16b` (localiser d'abord, mesurer ensuite) |
| `m22_filet.py` | contrôle positif **18,3 %** puis 23,6 % | **signe de la pente inversé** : la sonde suivait dy/dx = +0,035 au lieu de −0,035 | `m22c` (100,0 %) |
| `m23_final.py` (b) | largeur de carte 865 px, incohérente avec `m10` | le balayage attrapait le **médaillon** ; et `m10` bornait la recherche à x < 700 alors que le cadre or va à x=751 | `m23b` puis `m24` (717 px, recoupé) |
| `m20_rythme.py` (a), puis `m26`, `m26b`, `m26c`, `m26d` | +0,8 % (donné comme égalité) puis −18,7 %, −18,2 %, inexploitable, −25,0 % | d'abord l'**art peint** hors carte, ensuite quatre fois le **filet rouge intérieur** de la carte (x=696..698), de la même brique (147,64,44) que le texte | `m26e` : **−9,6 %**, dans la tolérance ⇒ **ni contrôle positif ni finding**. Cinq versions : le défaut a migré vers l'intérieur à chaque correctif |
| `m17_dock.py`, `m17b` | 2 disques puis 6 « disques » au lieu de 4, contrôle « incomplet » | détection de cercles instable (appariement de pics adjacents) | `m17c` (mesure de bande, contrôle positif + négatif) |

### Annexe 1 & 2 — Inventaires

Les fiches de la référence et de la capture sont portées par les scripts et leurs sorties collées ci-dessus :
géométrie et matière de la carte (m10, m24), médaillon (m11, m12c), pastilles (m13b), filet (m22c),
CTA primaire (m09), CTA secondaire (m16b), typographie (m15a, m21), couche globale — palette, luminance,
densité, part de quasi-noirs (m07) — et rythme vertical (m20).

### Annexe 4bis — Scripts

`mesures/m01_geometrie.py` · `m02_bandes.py` · `m03_chrome.py` · `m04_filets.py` · `m05_encre.py` ·
`m06_temoin.py` · `m07_palette.py` · `m08_extents.py` · `m09_cta_primaire.py` · `m10_carte.py` ·
`m11_jetons.py` · `m12_medaillon.py` · `m12b_medaillon.py` · `m12c_medaillon.py` · `m13_pastilles.py` ·
`m13b_pastilles.py` · `m14_inclinaison.py` · `m15_typo.py` · `m15a_lignes.py` · `m16_bord_cta2.py` ·
`m16b_bord_cta2.py` · `m17_dock.py` · `m17b_dock.py` · `m17c_dock.py` · `m18_contraste.py` · `m19_or.py` ·
`m20_rythme.py` · `m21_correctifs.py` · `m22_filet.py` · `m22b_filet.py` · `m22c_filet.py` ·
`m23_final.py` · `m23b_marges.py` · `m24_carte_box.py` · `m25_robustesse.py` · `m26_sourcil.py` · `m26b/c/d/e_sourcil.py` · `m27_centrage.py`
Crops : `crop_ref_carte.png` · `crop_cap_carte.png` · `crop_ref_cta2.png` · `crop_cap_cta2.png` ·
`crop_ref_cta2b.png` · `crop_cap_cta2b.png` · `crop_ref_medaillon.png` · `crop_cap_medaillon.png` ·
`crop_ref_filet.png` · `crop_cap_haut.png` · `crop_cap_dock.png` · `crop_canon_haut.png` · `crop_canon_dock.png`
