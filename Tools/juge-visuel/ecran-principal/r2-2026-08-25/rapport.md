# Juge visuel ⊥ — écran principal (district de Brennar) — r2 — 2026-08-25

## Verdict : NON APPROUVÉ

Le corps de l'écran — la fiche bâtiment, les boutons, le rythme, les jetons de couleur, la
géométrie du dock — est d'une fidélité remarquable (20 grandeurs mesurées ÉGALES, dont plusieurs
au 1/255 et au 1/20ᵉ de px CSS) ; ce qui bloque, ce sont **quatre écarts MAJEURS** : à la
résolution native de l'art (1080×1920), la barre haute est 2,06× plus claire et le dock 2,51×
plus clair que le canon, et **les quatre libellés du dock tombent à 3,88–4,03:1** — mesuré par deux méthodes
indépendantes —, sous le plancher de 4,5:1 que la doctrine du projet fixe elle-même aux petits
textes ; et le médaillon central
— trait d'identité de l'écran — a troqué son cerclage de laiton fin (1,67 CSS px, bord net)
contre un anneau mou de 3,3–3,6 CSS px, avec un arc de cadran 53 % plus grand et nettement plus
clair. **Aucun BLOQUANT.** Les deux premiers écarts n'existent pas à 1080×2400, où le chrome
retombe exactement sur le canon.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les valeurs sont en px CSS de la maquette (correspondance en annexe 3). Canon → capture.

| # | grandeur | canon | capture | Δ | script |
|---|---|---|---|---|---|
| 1 | largeur de la fiche | 368,00 | 368,04 | **+0,04** | 14 |
| 2 | boutons d'action, 3 blocs | 29,0–134,3 / 143,3–248,7 / 257,7–363,0 | 29,0–133,6 / 142,6–247,2 / 256,3–361,1 | ≤ 1,9 | 14 |
| 3 | gouttières entre boutons | 9,0 / 9,0 | 9,0 / 9,1 | +0,1 | 14 |
| 4 | dégradé du bouton or (haut / bas) | `#e7c368` / `#cb9c3a` | `#e7c267` / `#cb9d3a` | **≤ 1/255** | 15 |
| 5 | bordure du bouton or | `#8a611c` | `#8a611c` | **0** | 15 |
| 6 | boutons en ligne : fond / bordure / encre | `#131924` / `#383c45` / `#eae0c8` | `#151b26` / `#373d47` / `#eae0c8` | ≤ 2/255 | 15 |
| 7 | rythme vertical de la fiche (10 repères : titre, type, valeurs, libellés, boutons — haut et bas) | — | — | **tous ≤ 1,56** | 14 |
| 8 | séparateurs verticaux de la rangée de stats | x 139,7 · 251,3 | x 139,7 · 250,4 | ≤ 0,9 | 16 |
| 9 | remplissage de la fiche (haut / +80) | `#0f1724` / `#0e1420` | `#141b27` / `#0c141f` | ≤ 5/255 | 14 |
| 10 | luminance moyenne de la zone fiche | 36,0 | 35,4 (1920) · 35,7 (2400) | ≤ 0,6 | 30 |
| 11 | jetons de couleur : solde · libellés (×4) · valeur droite · filet | `#f2c96b` · `#b9ad92` · `#eae0c8` · `#b08d3e` | `#f2c96a` · `#b9ad92` · `#eae0c8` · `#b08d3d` | **≤ 1/255** | 9 · 5 |
| 12 | dock, centres des 4 ronds | 94 · 162 · 230 · 298 | 93,83 · 161,88 · 229,76 · 297,81 | ≤ 0,24 | 18 |
| 13 | dock, écarts entre centres | 68 · 68 · 68 | 68,06 · 67,87 · 68,06 | ≤ 0,13 | 18 |
| 14 | dock, rond 1 vertical | 615,70–661,70 | 617,76–662,04 | ≤ 2,06 | 19 |
| 15 | indicateur d'onglet actif (`.pointe`) | 14 CSS, centré 94, laiton | 13,8 CSS, centré 94,0, `#b08d3d` | ≤ 0,2 | 20 |
| 16 | libellés du dock : FAMILLE · PLUS · hauteur de capitale | 41,00 · 23,7 · 6,67 | 41,74 · 24,3 · 6,53 | ≤ 0,74 | 20 · 22 |
| 17 | barre de ratio, longueur | 74,00 | 74,04 | +0,04 | 7 |
| 18 | aile droite, bord droit | 375,00 | 375,30 | +0,30 | 6 |
| 19 | hauteur de la barre haute (filet laiton) | 51,00 | 50,09 | −0,91 | 1 · 5 |
| 20 | médaillon, centre horizontal · « CHALEUR/HEAT » hauteur de capitale · valeurs centrées dans leurs cellules | 195,83 · 5,00 · 84,3/196,3/308,2 | 195,82 · 5,08 · 83,8/195,1/306,2 | ≤ 2,0 | 5 · 11 · 30 |

**Contrôle négatif de l'instrument** (script 8) : la sonde qui trouve 8,3 % d'encre dans la zone
de la volute gauche du canon rend **0,0 %** sur une zone vide du bandeau dans les trois images —
elle discrimine.

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir son quartier vivant, y repérer ses bâtiments, en toucher un pour savoir ce qu'il
vaut et décider quoi en faire. L'art est le sujet ; le chrome est un verre posé dessus.

**Ordre de lecture.** (1) le bâtiment héros au centre de l'art — l'écran est fait pour le
regarder ; (2) la plaque de verre du bas et, dedans, **l'unique pavé d'or** COLLECTER, seul
aplat coloré de l'écran ; (3) le médaillon central en haut, cerclé de laiton, qui **coupe** la
barre et déborde dessous ; (4) le solde en or, à gauche ; (5) le dock, volontairement discret.

**Zones.** barre haute (verre fumé + médaillon débordant) · bandeau d'alerte éphémère · l'art
(le district) · la fiche bâtiment · le dock.

**Traits d'identité** (ce qui fait que c'est *cet* écran) :
- **L'or est rationné** : le solde, le fil du ratio, le titre de la fiche, et UN seul aplat
  (COLLECTER). Tout le reste est crème (`#eae0c8`) ou crème-2 (`#b9ad92`).
- **Rien n'est opaque** : le chrome est un verre fumé charbon posé sur l'art, souligné d'un filet
  laiton qui **s'évanouit aux deux extrémités**.
- **Deux registres typographiques** : petites capitales très espacées pour les libellés, chiffres
  serif pour les valeurs.
- **Le médaillon-montre** : un cerclage de laiton **fin**, un losange en pendentif, un cadran
  discret — une montre à gousset, pas une jauge.
- **Les boutons du dock sont gravés** : jante claire, lumière venue du haut-à-gauche — jamais des
  pastilles pleines ni des trous.

**Ce que j'ai retiré de la référence avant de comparer** (décision assumée, evidence en annexe 3) :
les **six pastilles or numérotées 1–6**, le bouton 🌙 et le bouton 🔥 ne sont pas l'écran — ce
sont les call-outs et les bascules de démonstration de la page HTML (`.co`, `.bascule`, `.chaudb`,
`cursor:pointer`, référencés par la liste `<aside class="annexes">`). Les compter comme
« ABSENT EN JEU » aurait produit 8 faux écarts. En revanche l'une d'elles **masque** un élément
réel : voir §6.4.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

**Oui pour le bas, non pour le haut, et cela dépend de la résolution.** La fiche bâtiment est,
mesure après mesure, la maquette : même largeur au 1/25ᵉ de px, mêmes boutons, même rythme
vertical à 1,5 px près, mêmes jetons de couleur au 1/255. L'unique aplat d'or est là, à sa place,
avec son dégradé et sa bordure exacts. La règle « une seule action colorée » tient. La langue est
française partout. Le dock est *géométriquement* le canon (centres 93,8/161,9/229,8/297,8 pour
94/162/230/298 attendus).

Ce qui a changé, c'est **la matière du chrome**, et seulement à 1080×1920. Le canon pose un verre
fumé *charbon* : la barre haute et le dock y portent leur propre voile, si bien qu'ils restent
sombres quoi qu'il y ait dessous. Dans la capture 1920, la barre monte à **67,3** de luminance
moyenne (canon 32,7) et le dock à **82,7** (canon 32,9) : le haut devient une dalle grise, le bas
un champ bleu clair où les quatre ronds sombres se lisent comme des **trous percés** et non comme
des médaillons gravés — l'anneau clair n'y a plus aucun maximum local, le profil est monotone. Le
contraste des libellés du dock passe de 8,5:1 à **3,9–4,0:1** (deux sondes indépendantes, scripts 27 et 34). À 1080×2400 le même chrome retombe sur
le canon (32,1 et 38,5) : ce n'est donc pas un choix de couleur, c'est ce que la translucidité
laisse passer quand l'art clair arrive juste dessous.

Le troisième écart de tête est ailleurs : **le médaillon a changé de matière**. Là où le canon
trace un cerclage de laiton de 1,67 px CSS à bord net, le jeu pose un anneau **deux fois plus
large et à bord mou** (3,3 à 3,6 px CSS de signal), sur un disque 6,6 % plus grand, avec un arc
de cadran dont le rayon passe de 14,6 à 22,3 et dont les deux segments s'éclaircissent de +28 à
+51 par canal. La montre gravée devient une jauge lumineuse — un effet fort là où la maquette est
calme, au point exact où l'œil arrive en troisième.

**Les trois écarts de tête, par impact perçu** : (1) le dock illisible-limite et « percé » à
1920 ; (2) la barre haute grise à 1920 ; (3) le médaillon glacé de lumière, aux deux résolutions.

---

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| M1 | `dock.fond` + `dock.libellés` (**1080×1920 seulement**) | **MAJEUR** | luminance de zone 32,9 ; libellés à 7,80–8,53:1 | 82,7 ; **3,88–4,03:1** | ×2,51 ; contraste ÷2,1 | 20 · 27 · **34** · 30 | Sous le plancher **4,5:1** que la doctrine du projet fixe aux petits textes, mesuré sur l'art réel. Le canon porte un voile propre au dock (`background:linear-gradient(…,#070b12d8 40%)`) ⇒ lisible sur n'importe quel art. À 2400 : 7,85:1, conforme. |
| M2 | `barre.fond` (**1080×1920 seulement**) | **MAJEUR** | aplat `#111824`, luminance 32,7 ; textes 8,02–8,09:1 | `#373d48`, 67,3 ; 5,00–5,17:1 | ×2,06 | 5 · 21 · 29 · 30 | Même cause de classe que M1 : chrome translucide + fond de district non mis à l'échelle ⇒ à 1920 c'est le ciel clair qui passe dessous. Le « verre fumé charbon » devient une dalle grise. À 2400 : 32,1 — identique au canon. |
| M3 | `medaillon.anneau` | **MAJEUR** | largeur totale du signal **1,67** CSS (FWHM 1,33), bord net, `#b08d3e` | **3,27 / 3,63** CSS (FWHM 1,81 / 2,90), rampe symétrique | ×2,0 à ×2,2 | 26 | Profil RADIAL (la ligne horizontale par le centre du médaillon est radiale). Même couleur de crête (R−B = 114 des deux côtés) : c'est l'**étalement**, pas la teinte. |
| M4 | `medaillon.cadran` | **MAJEUR** | rayon médian de l'arc **14,6** ; cœur teal (65,98,109), braise (131,69,60) | **22,3** ; teal (108,149,153), braise (179,101,88) | +53 % ; **+28 à +51 par canal, même signe sur 6 mesures** | 28 · 29 | L'arc passe d'un liseré discret à une jauge qui frôle la jante (0,64 R contre 0,45 R). Le décalage de clarté est systématique — mais **rayon et clarté ont bougé ensemble**, la mesure ne départage pas le mécanisme (§6.5). |
| m1 | `fiche.bordure` + `fiche.ombre` | MINEUR | bordure 1 CSS px `#ffffff17` ⇒ pixel (37,44,56) ; ombre `0 10px 26px #000c` | aucune bordure claire ; profil **plat** sous la fiche | absent | 13 · 16 | Prouvé sur fond UNI (capture 2400) : (86,136,158) à +2 CSS comme à +11. La fiche ne « flotte » plus, elle est posée à plat. |
| m2 | `barre.libellés` (lettrage) | MINEUR | gouttières inter-lettres **2,33–3,33** ; « JOUR » 26,67 ; « ARGENT » 42,00 | **0,73–1,81** ; 20,69 ; 38,84 | −22 % / −7,5 % | 22 | **Ce n'est pas la police** : les libellés du DOCK, même corps, retombent à 2 % près (FAMILLE 41,74 pour 41,00 ; gouttières 2,06 pour 2,05). L'interlettrage des libellés de la barre est ~0 là où le canon met .22em. |
| m3 | `barre.volute` droite | MINEUR | 6,4 % d'encre dans x CSS [377,390] × y [18,34], pic `#515252` | **0,0 %** | absente | 8 | La volute GAUCHE est ASSUMÉE (remplacée par la flèche). La droite n'est déclarée nulle part. Contrôle négatif sur zone vide : 0 % partout. |
| m4 | `aile.gauche` (position) | MINEUR | « ARGENT » à x 16,00 ; barre de ratio 16,00–90,00 | 63,88 ; 63,88–137,93 | **+47,9** | 6 · 7 | Conséquence mécanique du bouton retour ASSUMÉ — mais le décalage lui-même n'est pas déclaré : le coin haut-gauche reste vide et le bloc du solde n'est plus au fer à gauche. |
| m5 | `fiche.titre` (corps + casse) | MINEUR | « L » de « LE » : **10,67** CSS, capitales espacées | « L » de « Lab » : **11,98** CSS, casse mixte | +12,3 % | 31 | Le canon met le titre en CAPITALES avec .13em ; le jeu en casse mixte. Le contenu (type au lieu du nom) est ASSUMÉ, pas la casse. |
| m6 | `fiche.filet` (haut) | MINEUR | plateau **231,3** CSS, centré 196,33 | **287,8**, centré 196,54 | +24 % | 31 | À seuil identique (R−B > 50). Le filet du canon s'évanouit plus tôt ; celui du jeu court plus près des bords. Même observation, moins nette, sur le filet de la barre haute (330,7 → 340,8 à 1920 · 365,5 à 2400 ; mesure dépendante du fond). |
| m7 | `dock.rond` (dégradé + jante) | MINEUR | lumière en haut-à-gauche : hg (25,34,48) > bd (14,21,33) ; jante +23 de luminance sur le fond | lumière **centrée** : centre (27,35,50) > hg (16,24,36) et bd (20,28,41) ; jante **+47** | direction inversée ; jante ×2 | 18 · 25 | Le canon grave (`radial-gradient(circle at 38% 30%,…)`), le jeu bombe. À 1920 la jante disparaît complètement (voir M1). |
| m8 | `barre.retour` (couleur) | MINEUR | — (volute crème `#eae0c8` à cet endroit) | flèche `#eef1f2` | hors palette | 8 · 9 | Blanc froid ; le crème du canon est `#eae0c8`. |
| m9 | `barre.ratio` (position) | MINEUR | y 40,67–42,33 | y 42,83–44,65 | +2,2 | 6 | Épaisseur conforme (2,00 → 2,18). |
| m10 | `medaillon.texte` (position interne) | MINEUR | valeur centrée sur le disque (+0,01 R) ; libellé à +0,41 R | valeur à **+0,25 R** ; libellé à **+0,61 R** | +8,5 CSS · +7,8 CSS | 33 · 11 | Le bloc de texte du médaillon est poussé vers le bas, vers la jante. Valeur : 8,67 → 7,62 CSS de hauteur (−12 %). |
| m11 | `medaillon.diametre` | MINEUR | **64,00** | **68,24** | +4,24 (+6,6 %) | 5 · 10 | Mesuré à deux hauteurs indépendantes (y = 36 et 40 CSS), les deux captures d'accord au 1/100ᵉ. |
| A1 | `barre.solde` (format) | ARBITRAGE | `$ 24 850` | `$10,000.00` | — | vue | Séparateur de milliers anglo-saxon, point décimal, centimes affichés, pas d'espace après le `$`. Contredit la règle « langue affichée : français ». Non corrigible par le juge : c'est un arbitrage produit. |
| A2 | typographie | ARBITRAGE | rendue en **Noto Serif / Noto Sans** (substitution — la maquette n'a jamais montré Georgia) | DejaVu Serif / DejaVu Sans | — | dossier | Les hauteurs de capitale se comparent (et le font : cf. contrôle positif n° 16 et 20) ; les chasses non. |
| A3 | `fiche.type` (« Lab ») | ARBITRAGE | « BAR · QUARTIER GÉNÉRAL » | « Lab » | — | vue | Le remplacement du nom par le type est ASSUMÉ. Mais « Lab » n'est pas un mot français ; je ne peux pas dire depuis l'image si c'est un libellé résolu ou la valeur d'enum telle quelle (§6.6). |
| S1 | `bandeau-alerte` | **ABSENT EN JEU** | bande éphémère « ✉ **Sal** a un rapport du soir — **lire** », 390 × 33,8 CSS à y = 79 | rien | absente | vue + 32 | Non déclarée dans les écarts ASSUMÉS. C'est le porteur de l'événement dans le canon (call-out n° 4 : « zéro badge permanent, les événements arrivent en bandeaux éphémères »). |
| S2 | `dock.disc` (pastille FAMILLE) | ABSENT EN JEU | 192 px d'or dans la zone (`.disc`, 8 CSS, coin haut-droit) | **0** px | absente | 22 | Vraisemblablement pilotée par la donnée ⇒ non tranchable sur une capture (§6.3). |
| S3 | `barre.ratio` (part grise) | ABSENT EN JEU | or 50,33 + **gris 23,67** = 74,00 (68 %) | or **74,04** (100 %), aucune part grise | l'information de ratio n'est plus lisible | 7 | Peut être parfaitement légitime : un joueur neuf à $10 000 a 100 % d'argent propre, et le canon dessinerait alors la même barre pleine. **Non tranchable** (§6.1). |
| S4 | `dock.rond` (icônes) | ASSUMÉ | icône 20 CSS, `#c7c7c7` | ronds vides | — | 20 | Rendu propre : pas de trou, pas de libellé de repli. Reste un arbitrage ouvert (« j'aime pas les icônes »). |
| S5 | `fiche.stats` (bandes qualitatives) | ASSUMÉ | `$ 2 400` · `$ 180/h` · `12%` | « Au repos » · « Coupée » · « Sain » | — | 30 | **Rendu propre** : les 3 cellules gardent leur position et leur rôle, chaque valeur est centrée dans sa cellule (centres 83,8/195,1/306,2 pour 85,3/196,0/306,7 théoriques) avec 21,5 à 40 CSS de marge — **aucun débordement**. La 3ᵉ valeur n'est pas en braise, mais l'état est « Sain » ⇒ non tranchable (§6.2). |
| S6 | `barre.medaillon` (valeur) | ASSUMÉ *non déclaré* | `37%` (scalaire) | « Froid » (bande) | — | 33 | Même raisonnement R2.2 que les 3 chiffres de la fiche, mais **absent de la liste des écarts assumés** du dossier. Rendu propre, en français, dans le disque. |
| S7 | `barre.retour` · `fiche.titre` · `aile.droite` · nom de district | ASSUMÉ | — | — | — | 21 · 26 | Tous rendus proprement : flèche présente et cliquable-plausible ; titre centré à l'or-vif exact ; « Aube » au crème exact et l'aile droite alignée à 0,30 CSS près ; nom de district lisible (4,88:1 à 1920, 8,89:1 à 2400). |

---

## 5. Autres résolutions

### 1080×2400 (le téléphone 19,5:9 réellement visé) — **tient, et mieux que 1920 sur le chrome**

- **Rien de coupé, rien hors cadre, rien qui déborde.** Le dock est à 21,1 CSS du bas (1920 :
  21,2 ; canon : 19,7) ; la fiche fait la même hauteur (169,50 CSS) et la même largeur (368,04)
  qu'à 1920 ; les 3 boutons occupent les mêmes x. Le reflux est celui attendu d'un
  `space-between` : la fiche descend à 68,8 % de la hauteur au lieu de 61,2 %.
- **M1 et M2 n'existent pas ici** : barre 32,1 (canon 32,7), dock 38,5 (canon 32,9), libellés du
  dock à **7,85:1**, nom de district à 8,89:1. C'est la meilleure des deux captures.
- **Écart propre à 2400** — *MINEUR* : un bandeau uni de **37,0 CSS de haut** (`#222631`)
  s'intercale entre le filet laiton et le haut de l'art (l'art, non mis à l'échelle, démarre à
  87,11 CSS au lieu de 51,90 — script 32). Le dossier annonce que des bandes unies ne sont pas un
  défaut de cadrage ; **leur lecture, si** : celle-ci se lit comme une **seconde barre**, portant
  le nom du district, et fait passer le chrome haut de 51 à 87 CSS, soit 10 % de la hauteur
  d'écran. Elle est propre (uniforme, couleur déclarée), mais elle change la silhouette du haut.
- M3, M4, m1–m11 : identiques à 1920 (les deux captures rendent les mêmes nombres au 1/100ᵉ sur
  toutes les grandeurs de chrome mesurées hors influence du fond).

### 1080×1920 (résolution native de l'art)

C'est la résolution qui porte **M1** et **M2**. À noter : c'est aussi celle où l'art est le plus
présent (aucune bande unie en haut, l'art démarre à 51,90 CSS) — les deux faits sont le même
fait.

---

## 6. Ce que je n'ai pas pu vérifier

1. **La part grise de la barre de ratio.** La capture montre une barre 100 % or ; le canon 68 %.
   Un joueur neuf à $10 000 sans blanchiment *doit* afficher 100 %. Je ne peux pas distinguer
   « le client ne dessine jamais la piste grise » de « ce joueur est à 100 % ».
   ⇒ **Ce qui trancherait** : une capture d'un locataire dont le ratio propre/sale < 100 %, ou la
   valeur du jeton de couleur de la piste.
2. **Le code couleur des 3 valeurs de la fiche.** Le canon code or / crème / **braise**
   (`#e0664a`, mesuré `#83453c` au cœur). La capture donne or / crème / **crème** — mais son 3ᵉ
   état est « Sain », pour lequel le crème est sémantiquement juste. Le canal d'alerte existe-t-il ?
   ⇒ **Ce qui trancherait** : une capture d'un bâtiment en mauvais état.
3. **La pastille de notification du dock** (`.disc`, or, sur FAMILLE) : 0 px d'or mesurés dans la
   capture, mais elle est vraisemblablement conditionnée à une notification en attente.
   ⇒ **Ce qui trancherait** : une capture avec un événement FAMILLE non lu.
4. **Le losange sous le médaillon n'a PAS de témoin dans la référence.** La pastille d'annotation
   n° 2 (`.co`, or, 22 CSS, `top:74px`) le **recouvre entièrement** : sur la colonne centrale du
   canon, `#d9ab4e` court de 76 à 92 CSS avec le glyphe `#1a1206` à 86–88 CSS (script 12). Le
   losange existe bien dans les deux captures (or, sous le médaillon, ~80–84 CSS), mais je ne peux
   comparer ni sa taille ni sa position.
   ⇒ **Ce qui trancherait** : un rendu de la maquette sans la couche `.co`.
5. **Le mécanisme du décalage de couleur de l'arc (M4).** L'écart est systématique et de même
   signe sur 6 mesures — la signature d'une erreur de modèle (espace de mélange sRGB vs linéaire).
   **Mais le rayon a bougé en même temps** (14,6 → 22,3), donc l'arc n'est pas sur le même fond :
   *deux variables qui bougent ensemble ne départagent rien*. Je refuse de nommer le mécanisme.
   ⇒ **Ce qui trancherait** : rendre l'arc du client à la géométrie du canon, ou comparer les
   couleurs et alphas déclarés des deux côtés. Argument *contre* l'hypothèse « espace de mélange » :
   le dégradé du bouton or et le remplissage translucide de la fiche, eux, tombent à 1 et 5/255 —
   la conversion est manifestement appliquée ailleurs.
6. **« Lab » : libellé résolu ou enum brut ?** Depuis l'image je vois un mot de trois lettres qui
   n'est pas français. La doctrine exige « aucun enum brut ne doit atteindre l'écran ».
   ⇒ **Ce qui trancherait** : le résolveur de type de bâtiment, hors image.
7. **Le voile du dock.** À 1920 le fond du dock s'assombrit de (84,135,158) à (31,51,63) en
   descendant — compatible avec un voile noir *comme* avec le dégradé propre de l'eau. Je ne peux
   pas dire si le client pose un voile trop faible ou n'en pose aucun.
   ⇒ **Ce qui trancherait** : une capture à 1920 sur un district dont le bas d'art est uniforme.
8. **L'état « fiche fermée » n'est pas fourni.** Je ne dis rien de la lecture de l'écran sans
   fiche, ni de l'animation d'ouverture.
9. **La palette globale, la luminance moyenne et l'art lui-même sont NON CONCLUSIFS** : la
   référence est en état NUIT et la capture en état JOUR (déclaré au dossier). Toutes mes mesures
   sont restreintes au chrome ; les seules valeurs globales que je publie (luminance de zone) sont
   accompagnées de la mesure homologue à 2400, qui sert de témoin.
10. **La distinction annotation / écran est mon interprétation.** J'ai retiré 6 pastilles et
    2 bascules de la référence sur la foi du CSS (`.co`, `.bascule`, `.chaudb`,
    `<aside class="annexes">`). Si l'user considère que la volute, le losange ou tel call-out font
    partie de l'écran ratifié, mes §3 et §6.4 changent.

---

## Annexes

### 1. Inventaire de la référence (fiches + couche globale)

**Couche globale (chrome uniquement)** — luminance moyenne / médiane / part d'encre claire :
barre 32,7 / 25,3 / 6,8 % · fiche 36,0 / 22,7 / 11,7 % · dock 32,9 / 24,7 / 14,0 %.
Palette dominante (6 couleurs quantifiées) : barre `#131a25` 23 % · `#0e141d` 22 % · `#161d29`
21 % · `#121722` 15 % · `#101722` 12 % · `#5a564d` 6 % — soit **93 % de l'aire en cinq bleus
nuit quasi indiscernables**, et 6 % d'encre crème. Fiche : idem + `#907b4e` 10 % (le pavé d'or).
Dock : cinq bleus nuit + `#585951` 9 % (icônes et libellés).

| id | catégorie | bbox (CSS) | forme | remplissage | bord | effet | texte | relations |
|---|---|---|---|---|---|---|---|---|
| `barre` | chrome | 0,0 → 392,52 | rect | verre fumé, résultante `#111824` (lum. 25) | filet laiton bas `#b08d3e`, 1 px, x 32,0→362,7 (fondu aux 2 bouts) | translucide sur l'art | — | plein écran |
| `barre.volute.g` / `.d` | ornement | 5→39 / 353→387, y 20→32 | trait | crème à 28 % ⇒ `#4f5050` / `#515252` | — | — | — | 8,3 % / 6,4 % d'encre |
| `aile.gauche.lib` | texte | 16,00→58,33 · y 10,67→16,67 | — | — | — | — | « ARGENT », capitale **6,33**, `#b9ad92`, 6 gouttières de 2,33–3,00 | fer à gauche |
| `aile.gauche.val` | texte | 17→77 · y 20,67→33,33 | — | — | — | — | « $ 24 850 », serif, `#f2c96b`, 13,00 de haut | sous le libellé |
| `barre.ratio` | jauge | 16,00→90,00 · y 40,67→42,33 | trait 2 px | **or 50,33 (68 %) `#d9ab4e` + gris 23,67 `#5a6376`** | — | — | — | sous le solde |
| `medaillon` | médaillon | Ø **64,00**, centre (195,83 · 40,0) | cercle | radial `#242b3a` → sombre | **anneau laiton `#b08d3e`, signal total 1,67, FWHM 1,33** | — | — | déborde de 20 CSS sous la barre |
| `medaillon.cadran` | jauge | rayon médian **14,6** | arc | teal `#41626d` (gauche) · braise `#83453c` (droite) · base grise | — | — | — | signal radial 4,2 (AA comprise) |
| `medaillon.val` / `.lib` | texte | y 36,0→44,67 / 50,67→55,67 | — | — | — | — | « 37% » 8,67 crème · « HEAT » **5,00** `#b8ac91` | +0,01 R / +0,41 R du centre |
| `medaillon.losange` | ornement | ~73→83 | losange laiton | — | — | — | — | **masqué par l'annotation n° 2** |
| `aile.droite` | texte | 277,33→375,00 | — | — | — | — | « JOUR 12 · SOIRÉE » capitale 7,67, gouttières 3,00–3,33 ; « 21:40 » `#eae0c8` | fer à droite, bord 375,00 |
| `bandeau-alerte` | bande | 1→391 · y 79→112,8 | rect à fondus | `#0c1220` à 93 % | filets `#ffffff14` haut et bas | — | « ✉ **Sal** a un rapport du soir — **lire** » | centré |
| `fiche` | plaque | **12,00→380,00** · y 426,67→593,67 | arrondi (bord gauche stable à 9,67 sous le filet) | dégradé `#0f1724` → `#0e1420`, translucide | **1 CSS px `#ffffff17` ⇒ (37,44,56)** | **ombre portée : (23,34,47) à +2 → (60,74,88) à +22** | — | marges 12/12 |
| `fiche.filet` | trait | plateau 231,3, centré 196,33 | 1 px | `#b08d3e` | — | — | — | en tête de plaque |
| `fiche.titre` | texte | 124,33→266,33 · +19,67→+30,67 | — | — | — | — | « LE VERGE D'OR », serif, **capitale 10,67**, `#f2c96b`, CAPITALES espacées | centré 195,33 |
| `fiche.type` | texte | 122,33→268,67 · +43,33→+50,33 | — | — | — | — | « BAR · QUARTIER GÉNÉRAL », capitale **7,00**, `#b9ad92` | centré 195,50 |
| `fiche.stats` | rangée | +69→+97,67 | 3 cellules 110,67 | — | 2 séparateurs à x 139,7 et 251,3 | — | valeurs `#f2c96b` / `#eae0c8` / **`#83453c`** capitale 10,67 ; libellés `#b9ad92` capitale 6,67 | valeurs centrées 84,3 / 196,3 / 308,2 |
| `fiche.actions` | 3 boutons | +113,33→+153,00 | arrondi | or : dégradé `#e7c368`→`#cb9c3a` ; lignes : `#131924` | or `#8a611c` ; lignes `#383c45` | — | encre `#241804` (or) / `#eae0c8` | 3 × 105,3, gouttières 9,0 |
| `dock` | chrome | 1→391 · y 605,7→695,9 | rect | **voile propre**, `#0a1018` à hauteur des libellés | — | dégradé vers le bas | — | ancré en bas |
| `dock.rond` ×4 | médaillon | Ø 46 *(nav.)*, centres 94/162/230/298 · y 615,7→661,7 *(nav.)* | cercles | radial **haut-gauche** (25,34,48) → (14,21,33) | jante claire, **+23** de luminance | — | icône `#c7c7c7` *(taille non mesurée : masquée par la pastille n° 6 sur le rond 1)* | écarts 68 |
| `dock.pointe` | indicateur | 16,3 × 3,7 mesurés (bruités par l'arc de jante), centré 94,15 | trait | `#b08d3e` | — | — | — | sous le rond actif ; le jeu rend 13,8 × 1,8 centré 94,0 |
| `dock.disc` | pastille | coin haut-droit de FAMILLE | cercle | or, **192 px mesurés** dans la zone | — | — | — | notification |
| `dock.libellés` | texte | y 670,67→677,33 | — | — | — | — | EMPIRE 36,3 · FAMILLE 41,0 · MARCHÉ 40,3 · PLUS 23,7 ; capitale **6,67** ; `#b8ac91` ; **7,80–8,51:1** | centrés sur les ronds |

### 2. Inventaire de la capture (fiches + couche globale)

**Couche globale (chrome)** — 1920 : barre **67,3** / 63,5 / 7,6 % · fiche 35,4 / 21,7 / 10,8 % ·
dock **82,7** / 86,0 / 27,0 %. 2400 : barre 32,1 / 22,7 / 8,5 % · fiche 35,7 / 22,0 / 10,8 % ·
dock 38,5 / 31,3 / 8,0 %.
Palette dominante, 1920 : barre `#353c46` 36 % · `#3c444e` 21 % · `#3a414b` 15 % · `#383e49`
12 % (**84 % de l'aire en gris moyen**) ; dock `#304d5c` 26 % · `#17222f` 20 % · `#3c6273` 16 % ·
`#4f7e93` 15 % · `#598799` 12 % (**80 % en bleu-teal moyen**). 2400 : barre et dock reviennent aux
bleus nuit du canon (`#111720` 34 % · `#10131f` 31 % ; `#151b26` 25 % · `#1f242f` 23 %).
Fiche, aux deux résolutions : `#111823` 30 % · `#0d131e` 16 % · … + le pavé d'or — **la même
distribution que le canon**.

Fiches par partie : chaque ligne du tableau §3 porte la valeur mesurée en jeu ; les parties non
citées au §3 sont ÉGALES et figurent au contrôle positif. **Parties EN TROP** par rapport à la
maquette : `barre.retour` (flèche `#eef1f2`, x CSS ~30–40, ASSUMÉE) et `district.nom`
(« Verge A », x 4,7→31,6, y 78–87, `#cdc4af`, ASSUMÉ). **Parties ABSENTES** : `bandeau-alerte`,
`barre.volute` (×2), `dock.disc`, `dock.rond.icone` (×4), part grise de `barre.ratio`.

### 3. Correspondance des repères

| | canon | captures |
|---|---|---|
| largeur image | 1176 px | 1080 px |
| largeur CSS | 392 | 392 |
| **échelle** | **3,0000 px/CSS** | **2,7551 px/CSS** |
| offset | (0,0) | (0,0) |
| hauteur | 697,00 CSS | 696,89 CSS (1920) · 871,11 CSS (2400) |

**Vérifiée sur trois ancres indépendantes**, sur trois axes et trois zones : centre horizontal du
médaillon 195,83 → 195,82 ; bord gauche de la fiche 12,00 → 11,98 ; bord droit de l'aile droite
375,00 → 375,30. La correspondance tient à **≤ 0,30 px CSS**. Toutes les mesures des §3 à §5 sont
exprimées dans ce repère.

Géométrie du canon reprise du dossier (mesure navigateur, `mesure-canon.txt`) et **recoupée sur
l'image** partout où c'était possible : `.barre` 52 → filet mesuré à 51,00 ; `.fiche` 366×169,19
à (13 · 424,52) → mesuré 368,00 de large, filet haut à 426,67 ; `.ratio` 74 → 74,00 ;
`.medaillon` 64 → 64,00 ; `.dockb .rond` 46 à (71 · 615,70) → centres 94/162/230/298 confirmés.

### 4. Scripts

Tous dans `mesures/`, tous impriment la taille des images qu'ils ouvrent. Chacun porte son
contrôle ; les sorties sont celles collées ci-dessus dans les colonnes « réf » / « jeu ».

| script | grandeur | contrôle embarqué |
|---|---|---|
| `lib.py` | helpers (médiane de fenêtre, bbox d'encre, contraste WCAG) | — |
| `01_structure.py` | filet laiton de la barre | 3 images, même méthode |
| `02..04_fiche*.py` | bbox de la fiche, 3 méthodes successives | la 3ᵉ retombe sur 366 CSS attendus |
| `05_bandeau.py` | hauteur de barre, aplat, diamètre du médaillon | diamètre mesuré à 4 hauteurs |
| `06_bandeau_textes.py` | segmentation des textes de la barre | — |
| `07_details_bandeau.py` | barre de ratio (or/gris), volutes | positif : le canon rend 68 % |
| `08_volutes.py` | volutes, zones non contaminées | **positif** (canon 8,3 %/6,4 %) **+ négatif** (zone vide 0 %) |
| `09_couleur_argent.py` | couleur d'encre du solde | positif : `#b9ad92` et `#eae0c8` retrouvés exacts |
| `10..12` | médaillon, textes internes, losange | découvre que l'annotation n° 2 masque le losange |
| `13..16` | fiche complète, boutons, séparateurs, ombre | positif : largeur 368 des deux côtés |
| `17..20` | dock (3 méthodes : plages sombres, anneau, obscurité) | positif : centres 94/162/230/298 |
| `21_contrastes.py` | contrastes sur l'art réel | seuils de la doctrine imprimés |
| `22_divers.py` | tracking par mot, pastille, capitales | **contrôle croisé** : FAMILLE égal ⇒ ce n'est pas la police |
| `23_bandes_art.py` · `32_seams.py` | bandes unies vs art, coutures | — |
| `24_crops.py` | vignettes comparatives (`cmp-*.png`) | — |
| `25..29` | anneau, arc, palettes, cœur de l'arc | profil radial, sommet lu et non classé |
| `30_global.py` | luminance de zone, débordement par cellule | — |
| `31_filet_fiche_titre.py` | filet de la fiche, capitale du titre | exclut la pastille d'annotation n° 5 |
| `33_heat_valeur.py` | hauteur de la valeur du manomètre | isole le « % » hors aiguille |
| `34_verif_contraste_dock.py` | **re-mesure du contraste du dock par une 2ᵉ méthode** (fond pris dans un rectangle plein ENTRE deux libellés, encre = le jeton `#b9ad92`) | **positif** : le canon rend 8,52 / 8,53:1 · **négatif** : la capture 2400 rend 7,84:1 — la sonde n'est donc pas uniformément alarmante |

Vignettes comparatives (canon / 1920 / 2400, ramenées à la même échelle) :
`mesures/cmp-bandeau.png`, `mesures/cmp-fiche.png`, `mesures/cmp-dock.png`.
