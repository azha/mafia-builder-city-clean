# Juge visuel ⊥ — ㊲ La réputation (`screen_b3`) — r1 — 2026-08-31

Référence : `reference/m-120.png` (étiquette **`vierge`** — « un lieutenant neuf n'a encore rien
absorbé »), 900×1752, ×3,0. Captures : `screen_b3_reputation_1080x1920.png`,
`…_1080x2400.png`, `…_1080x1920_t1s.png`, ×3,6.
Scripts : `mesures/m01…m10*.py` avec leurs sorties `mesures/sortie_*.txt`.
*(le mandat impose `mesures/` ; l'orchestrateur demandait `instruments/` — le mandat gagne.)*

---

## Verdict : NON APPROUVÉ

L'écran a les bonnes couleurs, les bons textes et les bonnes tailles de caractères — mais pas le
bon rythme : un tiers de la plaque est vide sous le bouton à la résolution cible, les quatre
voyants sont des ovales étirés, et le portrait est un assemblage de rectangles.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes ces grandeurs sont normalisées (réf ÷3,0, capture ÷3,6) ou invariantes d'échelle.

| # | grandeur | réf | jeu | script |
|---|---|---|---|---|
| 1 | **stabilité T / T+1 s** | — | **0 px** différent sur 2 073 600 (écart max canal = 0) | m03 |
| 2 | hauteur de capitale du « L » de *Le miroir* | 12,7 CSS | 12,5 CSS (−1,6 %) | m07 |
| 3 | hauteur des chiffres « 00 » du 1ᵉʳ compteur | 11,0 CSS | 10,8 CSS (−1,8 %) | m07 |
| 4 | hauteur de capitale du libellé « RÈGLES DONNÉES » | 5,0 CSS | 5,3 CSS (+6 %) | m07 |
| 5 | couleur du titre or | (242,201,107) | (242,201,106) — Δ1 | m09 |
| 6 | couleur du sous-titre / corps de texte | (185,173,146) | (185,173,146) — Δ0 | m09 |
| 7 | couleur du kicker et de « Pas encore jugeable » | (138,151,156) | (138,151,156) — Δ0 | m09 |
| 8 | couleur de « Il vous écoute » | (125,179,106) | (125,179,106) — Δ0 | m09 |
| 9 | couleur du titre de la note | (234,224,200) | (234,224,200) — Δ0 | m09 |
| 10 | couleur du liseré or | (176,141,62) | (176,141,61) — Δ1 | m02 |
| 11 | couleur des liserés de bloc | (42,54,72) | (42,53,73) — Δ≤1 | m02 |
| 12 | fond du panneau (aplat entre les blocs) | (11,16,22) | (13,13,22) — Δ≤3 | m02 |
| 13 | fond des cartes et de l'enseigne | (17,24,35) | (13,22,34) — Δ≤4 | m04 |
| 14 | teint du visage du portrait | (185,173,146) | (185,173,146) — Δ0 | m06 |
| 15 | padding haut du panneau | 7,0 CSS | 6,9 CSS | m09 |
| 16 | gouttière entre blocs (×4) | 9,0 CSS | 8,9 / 8,9 / 9,7 / 9,7 CSS | m09 |
| 17 | largeur totale de la rangée de compteurs | 90,3 %L | 91,5 %L | m04 |
| 18 | largeur de la carte portrait | 39,33 %L | 39,35 %L | m05 |
| 19 | largeur du bouton CTA | 93,11 %L | 93,89 %L | m05 |
| 20 | marges gauche/droite du paragraphe dans son bloc | 3,78 / 4,11 %L | 3,52 / 4,35 %L | m09 |
| 21 | largeur du voyant (la seule des deux dimensions qui soit juste) | 7,0 CSS | 6,7 CSS | m10 |
| 22 | largeur du cou (c'est elle qui porte l'état ouvert/fermé) | 5,11 %L | 5,19 %L | m06 |
| 23 | contrastes, sur le fond RÉEL | ≥ 4,5:1 | 6,05 · 6,43 · 6,47 · 7,38 · 8,19 · 11,32 · 11,55 · 12,53 · 13,85 | m08 |
| 24 | gouttière : rien ne sort du rect du panneau, aux deux résolutions | — | vérifié | m02/m04 |

Les couleurs de cet écran sont **exactes** : sur douze aplats et textes échantillonnés au centre,
l'écart maximal est de 4/255. Le piège « sRGB vs linéaire » du dossier **ne s'est pas réalisé ici**
— il n'y a ni translucidité ni dégradé porteur dans cet écran, et les aplats opaques tombent juste.
La typographie est également juste : trois hauteurs de capitale à ±6 %.

---

## 0. L'écran, tel que la maquette le dit

**But.** Regarder un de ses lieutenants comme dans un miroir : *qu'a-t-il pris de moi ?* On y vient
pour lire un jugement sur soi, pas sur lui — et pour en déclarer la suite (« donner une première
règle »).

**Ordre de lecture.** (1) Le titre or **Le miroir**, seul élément coloré et le plus gros de l'écran,
sur une enseigne close par un filet or. (2) La rangée des **trois compteurs** cyan — 00 / 00·4 / 00 —
qui chiffre l'état en un coup d'œil. (3) Le **bloc miroir**, moitié la plus haute de la plaque :
à gauche le portrait dans son cadre or, à droite les quatre traits absorbables, tous éteints.
(4) La **note** en pied qui explique pourquoi tout est à zéro, avec deux mots en or.
(5) Le **CTA** or pleine largeur qui ferme la plaque.

**Zones.** enseigne (fixe) · compteurs (fixe) · miroir (**élastique** : c'est lui qui prend la
hauteur restante) · note (fixe) · CTA (fixe), séparés par une gouttière constante de 9 CSS, le tout
dans une plaque à liseré or qui va du chrome au bas de l'écran.

**Traits d'identité.** (a) une **plaque or pleine**, sans respiration morte : le CTA en est le pied ;
(b) le **portrait dessiné en formes organiques** — épaules en dôme, calotte de cheveux épousant le
crâne, V du revers, montre ovale — qui fait de la fiche une *personne* ; (c) quatre **pastilles
rondes** éteintes, petites, alignées à gauche des traits ; (d) une palette bleu-nuit très sombre où
**l'or est rare** et donc directeur ; (e) le bloc miroir qui pèse à lui seul **47 % de la plaque**.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour le fond, non pour la forme. Le but est immédiatement lisible, l'ordre de lecture est
conservé (titre or → compteurs cyan → miroir → note → CTA), les textes sont les bons, les couleurs
sont exactes à 4/255 près et les contrastes tiennent. Un joueur comprend le même écran.

Mais trois traits d'identité sur cinq sont perdus. **La plaque n'est plus pleine** : sous le bouton
s'ouvre un vide de 99,2 CSS en 1080×1920 (19,0 % du panneau) et de 232,5 CSS en 1080×2400
(**35,5 %** — la résolution cible téléphone). Le bloc miroir, qui devait être l'élastique, ne
s'étire pas du tout : la bande de contenu des deux captures est **identique au pixel près** (m03,
écart max canal = 3), les 480 px supplémentaires du 20:9 tombent intégralement dans le vide. Ce qui
devait respirer est figé, et ce qui devait être fermé bâille. **Les quatre pastilles ne sont plus
rondes** : ce sont des ovales verticaux de rapport 3,08 (réf 1,000) qui remplissent 85 % de la
hauteur de leur carte au lieu de 25 % — c'est la chose la plus voyante de la moitié droite.
**Le portrait n'est plus une personne** : dôme d'épaules → rectangle, calotte → rectangle flottant,
montre ovale → rectangle, et le **sourire a disparu**.

Le rythme lui-même est redistribué : compteurs **+31,9 %**, miroir **−11,2 %**, CTA −10,3 % — un
écart sélectif, de signes opposés, qui désigne des contraintes de hauteur différentes selon le bloc
plutôt qu'une erreur d'échelle globale. Enfin la note perd ses deux emphases dorées (**0 px** d'or
dans le paragraphe en jeu contre 1 212 dans la maquette), donc les deux mots que la maquette voulait
faire retenir — *rien pris de vous*, *indéterminé* — ne se détachent plus.

**Les trois écarts de tête, par impact perçu** : ① le tiers vide sous le bouton (pire à la
résolution cible) ; ② les quatre voyants étirés ; ③ le portrait en blocs, sans sourire.

---

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| B1 | `P.vide-bas` | **BLOQUANT** | 8,0 CSS (1,78 % du panneau) | 99,2 CSS (**19,0 %**) en 1920 ; 232,5 CSS (**35,5 %**) en 2400 | +91,2 CSS / +1 140 % | m09 | trait d'identité « plaque pleine, CTA en pied » perdu. Cause commune avec B2 |
| B2 | `P.miroir` (élastique) | **BLOQUANT** | 47,04 % du panneau | 36,05 % en 1920, **inchangé** en 2400 | −11,2 % CSS ; **0 px de reflux** entre les deux résolutions | m03, m09 | le bloc censé absorber le ratio ne s'étire pas : bande 0..1541 identique au pixel près entre 1920 et 2400 (écart max canal 3 = anticrénelage). Classe de cause : hauteur imposée là où la maquette laisse croître |
| M1 | `P.miroir.voyant[1..4]` | **MAJEUR** | disque 7,0 × 7,0 CSS, **ratio h/l = 1,000** | ovale 6,7 × 20,6 CSS, **ratio 3,08** | hauteur ×2,94 | m10(a) | occupe 85 % de la hauteur de sa carte contre 25 %. Classe de cause : forme ronde dans un rect non carré, étiré verticalement — même famille que B2 |
| M2 | `P.compteurs` | **MAJEUR** | 32,0 CSS | 42,2 CSS | +10,2 CSS / **+31,9 %** | m09 | le contenu reste en haut : padding bas 13,6 CSS contre 5,3 CSS en réf — signature d'un bloc étiré, pas d'un bloc plus garni |
| M3 | `P.compteurs.tuile[1..3]` | **MAJEUR** | 28,56 / 28,56 / 28,56 %L (**égales**) | 33,70 / 26,57 / 27,22 %L | max/min = **1,268** | m04, m09 | la rangée n'est plus régulière : la 1ʳᵉ tuile est 27 % plus large que la 2ᵉ. Classe de cause : largeur prise sur le contenu au lieu d'un tiers égal |
| M4 | `P.miroir.portrait.buste` | **MAJEUR** | dôme arrondi, 26,33 × 9,33 %L, remplissage 66,4 % | **rectangle**, 25,83 × 11,85 %L, remplissage 76,3 % | h +27 % ; angles vifs | m06 | trait d'identité (b) |
| M5 | `P.miroir.portrait.cheveux` | **MAJEUR** | calotte arrondie, remplissage **35,5 %** | **rectangle**, remplissage **88,9 %** | forme | m06 | flotte au-dessus du crâne au lieu de l'épouser |
| M6 | `P.miroir.portrait.bouche` | **MAJEUR** | sourire tracé sous les yeux | **absent** | ABSENT EN JEU | crops `portrait_ref/cap` (à l'œil, non chiffré) | le visage passe de souriant à inexpressif alors que le libellé dit « Il vous écoute » |
| M7 | `P.miroir.portrait.montre` | **MAJEUR** | **ellipse** 4,44 × 2,78 %L (largeur 27/40/32 px à trois hauteurs) | **rectangle** 5,19 × 3,43 %L (largeur 56/56/56 px) | forme + 17 % / + 23 % | m10(b) | l'instrument discrimine : largeur variable en réf, constante en jeu |
| M8 | `P.note.emphases` | **MAJEUR** | 2 fragments en or gras (« rien pris de vous », « indéterminé »), **1 212 px** d'or | **0 px** d'or, paragraphe uniforme | emphases ABSENTES | m10(d) | les deux mots-clés de l'écran ne se détachent plus |
| m1 | `P.miroir.cartes[1..4]` | MINEUR | 28,3 CSS, gouttière 4,0 CSS | 24,2 CSS, gouttière 5,7 CSS | −14,5 % / +42 % | m10(c) | pas de 32,3 → 29,7 CSS. (la carte 1 sort à 23,7 CSS en réf : la ligne de scan animée coupe le liseré ; la vraie valeur est 28,3) |
| m2 | `P.*.titres` (graisse) | MINEUR | densité d'encre 29,0 / 38,4 / 38,8 % | 20,0 / 32,1 / 29,9 % | −16 à −31 %, **même signe sur 4 textes** | m10(e) | à hauteur de capitale ÉGALE (contrôle 2–4) et à famille identique (le dossier prouve qu'il n'y a pas de substitution) : c'est une **graisse** plus faible, une seule cause pour les quatre. Voir aussi le sous-titre de l'enseigne, gras en réf, maigre en jeu |
| m3 | `P.*` (apostrophes) | MINEUR | apostrophe typographique **’** | apostrophe droite **'** | glyphe | crops `sub_ref/cap`, `par_ref/cap` | partout : « N’A » → « N'A », « n’a » → « n'a », « qu’il » → « qu'il » |
| m4 | `P.CTA` | MINEUR | 26,3 CSS | 23,6 CSS | −10,3 % | m09 | |
| m5 | `P.enseigne` | MINEUR | 52,7 CSS | 51,1 CSS | −3,0 % | m09 | dans la tolérance haute |
| m6 | `P.note` | MINEUR | 76,3 CSS | 73,3 CSS | −3,9 % | m09 | |
| m7 | `P.miroir.cartes` (largeur) | MINEUR | 42,0 %L | 44,0 %L | +2,0 %L | m04 | les paddings latéraux du bloc miroir passent de 2,7 à 2,0 %L |
| m8 | `P.miroir.portrait` (axe) | MINEUR | carte, visage, cou et revers **tous à 245,5** (parfaitement centrés) | visage à −1,02 %L de l'axe de la carte | −1,02 %L | m10(f) | juste sous la tolérance, mais additionné à A1 ci-dessous il se voit |
| m9 | `P.miroir.portrait.col` (cou) | MINEUR | h 4,67 %L | h 6,02 %L | +29 % | m06 | la largeur, elle, est juste (contrôle 22) — donc l'état ouvert/fermé reste lisible |
| A1 | `P.miroir.portrait.revers` | **ASSUMÉ — mal rendu** | triangle en V, remplissage 41,0 %, **centré sur le cou (Δ 0,00 %L)** | carré plein, remplissage 91,0 %, **décalé de +1,57 %L à droite du cou** | forme assumée, **décentrage non assumé** | m06, m10(f) | le dossier assume « pas de primitive triangulaire » ; il n'assume pas que le carré sorte de l'axe du personnage. C'est le seul assumé qui n'est PAS rendu proprement |
| A2 | compteur ENFREINTES | ASSUMÉ | « 00 » | « — » cyan, centré | — | vue | rendu proprement, aligné sur les deux autres chiffres |
| A3 | nom du lieutenant | ASSUMÉ | « SALVATORE, VOTRE LIEUTENANT » + « Il vous écoute » | idem + « lieutenant.name — non projeté (L0.4) » | — | vue | rendu proprement, pas de libellé de repli |
| A4 | liserés des règles neutres | ASSUMÉ | idem en état `vierge` (m-120) : les 4 liserés sont déjà neutres | neutres | **0** | m02 | rien à vérifier : l'état vierge de la maquette est lui-même neutre |
| A5 | section `restraint`, bouton « retirer » | ASSUMÉ | absents de m-120 aussi | absents | **0** | — | non applicable à cet état |
| A6 | chrome (bandeau + dock) | ASSUMÉ | présent (y 0..375, 125,3 CSS) | absent | — | m02 | voir §6 : ce que son absence empêche de vérifier |
| A7 | ligne de scan `.elast::after` | ASSUMÉ | trait cyan figé à y≈905 dans le rendu | absent | — | m10(c) | **conforme** au ruling « aucune animation » du 2026-08-27, et confirmé par le contrôle 1 (0 px bougé en 1 s) |
| — | polices | **pas d'ARBITRAGE** | DejaVu Serif / DejaVu Sans | mêmes familles (dossier, `fc-match`) | — | — | le dossier ferme ce point : aucun arbitrage typographique à faire ici. m2 est donc un vrai défaut de graisse, pas une substitution |

---

## 5. Autres résolutions

**1080×2400 (20:9, cible téléphone) — NE TIENT PAS.**
Rien n'est coupé, rien ne sort du panneau, l'ordre de lecture est intact, et les proportions
horizontales sont conservées. Mais **il n'y a aucun reflux** : la bande y 0..1541 est identique à
celle du 1080×1920 (1 712 px différents sur 1 665 360, soit 0,10 %, écart max canal = 3 — de
l'anticrénelage, pas de la mise en page ; m03). Les 480 px de hauteur supplémentaires vont
intégralement au vide du bas, qui passe de 99,2 à **232,5 CSS**, soit **35,5 % du panneau**. C'est
la pire manifestation de B1/B2, et elle tombe sur la résolution que le dossier désigne comme cible.

**1080×1920 (16:9) — tient, aux écarts du §3 près.** L'inventaire du temps 2 s'y applique
intégralement (c'est la capture principale).

**1080×1920 T+1 s — tient parfaitement.** 0 pixel différent sur 2 073 600, écart max canal = 0. La
règle « aucune animation sur un écran neuf » est **vérifiée**, avec contrôle positif (auto-diff = 0)
et contrôle négatif (diff contre la référence redimensionnée = 99,998 % des pixels).

---

## 6. Non vérifié

1. **L'écran sous le chrome.** Les captures sont prises sans `AppShell` (assumé, raison mesurée).
   Je ne peux donc pas vérifier : (a) que le haut de la plaque ne passe pas sous le bandeau
   ARGENT / HEAT / JOUR ni que sa marge haute y reste correcte ; (b) que le CTA ne passe pas sous le
   dock — et **c'est précisément le point que B1 rend critique** : si un dock mangeait le bas, le
   vide serait moindre mais le CTA pourrait s'en approcher. *Ce qui trancherait : une capture montée
   dans le shell après l'override d'identité (angle mort A4 de l'auteur).*
2. **Les états `drifting` / `hostile` / `wary` / liste pleine.** Un seul état est capturé. Les quatre
   voyants étirés (M1) et les blocs à hauteur imposée (B2) sont mesurés à vide : je ne peux pas dire
   comment ils se comportent quand les cartes portent des liserés colorés et quand la liste des
   règles données se remplit. *Ce qui trancherait : un seed ou un scénario qui déclare 4 règles et
   provoque une violation (angle mort A5).*
3. **Quel trait du portrait porte quelle clé.** Je vois cinq objets (cheveux, visage+cou, buste,
   revers, un rectangle gris-vert en bas à gauche). Le dossier nomme cinq traits (buste incliné,
   col, revers, montre, gants) ; en état vierge tous sont éteints, et je ne peux pas apparier
   « montre » et « gants » depuis l'image seule — la maquette n'y montre qu'**un** accessoire, le
   jeu aussi. Je juge donc les formes, pas l'appariement. *Ce qui trancherait : une capture d'un
   état où les quatre traits sont absorbés (`canon`, m-119) rendue par le client.*
4. **L'inclinaison du buste.** Le dossier annonce un « buste incliné » ; ni la référence ni la
   capture ne montrent d'asymétrie mesurable en état vierge. Je ne peux ni confirmer ni infirmer que
   ce trait existe. *Même mesure que le point 3.*
5. **La disparition du sourire (M6) est constatée à l'œil, pas chiffrée.** L'aplat du visage est
   uniforme dans la fenêtre de la bouche en jeu et strié en réf, mais je n'ai pas produit de
   grandeur qui isole proprement le tracé du sourire de l'anticrénelage des yeux. Le classement
   MAJEUR repose sur la lecture des deux crops, pas sur un chiffre.
6. **La cause du vide (B1) : contenu figé ou conteneur trop haut ?** Les deux hypothèses produisent
   la même image. Le fait que le contenu soit **plus court** qu'en maquette (422,5 CSS contre
   450,0 CSS) alors qu'il dispose de **71,7 CSS de plus** penche pour « hauteurs imposées + pas
   d'élastique », mais l'image ne le prouve pas. *Ce qui trancherait : hors de mon périmètre (code).*
7. **Le rapport de contraste sous une luminosité d'écran réelle.** Mesuré sur les valeurs sRGB de
   l'image ; le client compose en linéaire, ce qui ne change pas un aplat opaque mais changerait un
   texte translucide. Aucun texte de cet écran ne semble translucide — non prouvé.

---

## Annexes

### 1. Inventaire de la référence — couche globale
- Palette du corps (y 376..1732), quantifiée : (17,24,35) 30,3 % · (11,14,18) 16,9 % ·
  (15,21,30) 16,4 % · (24,27,31) 8,7 % · (20,24,30) 8,3 % · **(119,115,94) 8,2 %** (l'encre claire) ·
  (13,17,22) 8,1 %.
- Luminance moyenne **0,0377** · densité d'encre **40,0 %** · fond dominant (17,24,35).
- Rythme vertical du panneau (450,0 CSS) : padding 7,0 · **enseigne 52,7** · 9,0 · **compteurs 32,0** ·
  9,0 · **miroir 211,7 (47,0 %)** · 9,0 · **note 76,3** · 9,0 · **CTA 26,3** · pied 8,0.
  Somme = 1 350 px = la hauteur du panneau mesurée indépendamment (contrôle positif, m09).
- Fiches détaillées : voir `mesures/sortie_m02*.txt` (frontières verticales),
  `sortie_m04*.txt` (frontières horizontales), `sortie_m05*.txt` / `sortie_m06*.txt` (formes).

### 2. Inventaire de la capture — couche globale
- Palette (y 18..1902) : **(13,22,34) 39,7 %** (fonds de cartes) · (13,13,22) 36,9 % (panneau + **vide**) ·
  (13,13,13) 10,5 % (bloc miroir) · (121,114,93) 6,7 % (encre claire) · (22,22,28) 6,2 % (silhouette).
- Luminance moyenne **0,0285** (−24 % vs réf, effet direct du vide) · densité d'encre 46,8 %.
- Rythme vertical du panneau (521,7 CSS) : padding 6,9 · enseigne 51,1 · 8,9 · **compteurs 42,2** ·
  8,9 · **miroir 188,1 (36,1 %)** · 9,7 · note 73,3 · 9,7 · CTA 23,6 · **vide 99,2 (19,0 %)**.
- Parties EN TROP par rapport à la maquette : **aucune**. Parties ABSENTES : le sourire (M6), les
  deux emphases du paragraphe (M8), la ligne de scan (A7, assumée).

### 3. Correspondance des repères
| | largeur px | largeur CSS | facteur | origine verticale du corps |
|---|---|---|---|---|
| référence `m-120.png` | 900 | 300 | **×3,0** | y = 376 (liseré or haut du panneau) |
| capture 1080×1920 | 1080 | 300 | **×3,6** | y = 18 (liseré or haut du panneau) |
| capture 1080×2400 | 1080 | 300 | **×3,6** | y = 18 |

Toute grandeur du §3 est soit exprimée en **px CSS** (px ÷ facteur), soit en **%L** (px ÷ largeur
d'image), soit en **rapport sans dimension** (h/l, remplissage, densité d'encre). Aucune comparaison
en px bruts n'apparaît dans ce rapport.

### 4. Scripts
| script | ce qu'il mesure | sortie |
|---|---|---|
| `m01_rythme_vertical.py` | profil de ligne (montre que le profil global NE discrimine pas ici — instrument écarté, gardé pour trace) | `sortie_m01_rythme_vertical.txt` |
| `m02_colonne_runs.py` | frontières verticales des blocs par runs de couleur | `sortie_m02_colonne_runs.txt` |
| `m03_stabilite_et_reflux.py` | T/T+1 s et reflux 1920↔2400, avec contrôles ± | `sortie_m03_stabilite_et_reflux.txt` |
| `m04_ligne_runs.py` | frontières horizontales (tuiles, cartes, colonnes) | `sortie_m04_ligne_runs.txt` |
| `m05_bbox.py` | bbox par proximité de couleur | `sortie_m05_bbox.txt` |
| `m06_portrait_traits.py` | les traits du portrait : bbox, ratio, remplissage | `sortie_m06_portrait_traits.txt` |
| `m07_typo_et_emphases.py` | hauteurs de capitale | `sortie_m07_typo_et_emphases.txt` |
| `m08_palette_contraste.py` | palette, luminance, densité, contrastes WCAG | `sortie_m08_palette_contraste.txt` |
| `m09_synthese.py` | rythme bloc à bloc en CSS, tuiles, couleurs de titres | `sortie_m09_synthese.txt` |
| `m10_formes_et_graisses.py` | voyants, montre, cartes, emphases, graisses, axe du portrait | `sortie_m10_formes_et_graisses.txt` |

Chaque script imprime la taille des images qu'il ouvre et porte au moins un contrôle positif ;
m03, m06 et m10 portent en plus un contrôle négatif explicite.
