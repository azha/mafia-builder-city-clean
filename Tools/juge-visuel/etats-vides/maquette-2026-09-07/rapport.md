# Juge visuel ⊥ — États vides (12) — maquette — 2026-09-07

Juge à contexte vierge : je n'ai ni généré ces images ni construit les écrans. Je ne corrige rien,
je ne prescris pas de prompt. Tout chiffre de ce rapport sort d'un script de `mesures/`, chacun
avec son contrôle positif **et** son contrôle négatif ; ce qui est estimé à l'œil est dit tel quel
et va en « Non vérifié ».

## Verdict global : 7 recevables / 5 à reprendre / 4 arbitrages

**Zéro BLOQUANT** : aucune des 12 ne se lit franchement « tu as perdu ». La série est solide sur ce
qui se mesure (palette identique au bit près sur les 12, réserve de lisibilité crème ≥ 4,5:1 partout,
aucun anachronisme) et faible sur ce qui se nomme : **cinq images ne désignent pas leur écran**, et
l'une d'elles — ⑥ La Famille — montre un porte-manteau **plein** sur l'écran dont le seul travail est
de dire « il n'y a personne encore ».

| bucket | ids |
|---|---|
| recevables (RECEVABLE + MINEUR) | E1 E2 E3 E4 E6 E9 E12 |
| à reprendre (MAJEUR) | E5 E7 E8 E10 E11 |
| bloquants | — |

---

## Contrôle positif (procédé, tailles, palette de série)

**Provenance.** Les 12 `sha256` calculés ici commencent exactement par les 16 hexadécimaux de
`captures-provenance.md` — 12/12. C'est un contrôle de transport, pas une preuve que ces images sont
celles de `4e6697f` (je n'ai pas ouvert le dépôt source, hors mandat).

**Tailles.** `file` : 12/12 `PNG 1024 x 1024, 8-bit/color RGB, non-interlaced`. Chaque instrument
réimprime la taille de chaque image qu'il ouvre.

**Contrôles des instruments** (`mesures/sortie-*.txt`) :

| instrument | contrôle positif | contrôle négatif |
|---|---|---|
| `encres.py` (k-moyennes) | image synthétique 3 couleurs 50/25/25 → centres et parts exacts, inertie 0,00 ; + déterminisme (2 mesures identiques) | — |
| `palette.py` (palette littérale) | halo de tramage `#171d2c` absorbé dans `#161c2b`, parts 50/49/1 exactes | `#e0664a` posé sur 1 % du cadre → `hors = 1,00 %` |
| `reserve.py` (zone calme) | bande calme posée à y=120..159 → **trouvée** à y=120, σ=0,000 ; contraste symétrique, contraste(x,x)=1,00 | — |
| `reserve2.py` (part texte-sûre) | seuils **dérivés** (contraste(crème, L)=4,500 exactement) ; bande sombre → 100 % à la bonne position | gris `#787878` (L=0,1878, bande morte) → **0 % crème / 0 % encre** |
| `cadrage.py` (recadrage) | 2 barres, une dedans une dehors → perdu 50,0 % exact ; centre de gravité 0,488 attendu | tout le clair dans la bande → perdu 0,0 % |
| `bordure.py` (cadre peint) | cadre crème de 16 px posé → **épaisseur mesurée 16 px**, témoin intérieur 100 % sombre | aplat sans cadre → épaisseur 0 px |
| `objets.py` (composantes) | tache 40×20 → 1 composante de 800 px, boîte exacte ; tache de 25 px ignorée sous le plancher | — |
| `decoupes.py` (découpes) | ensemble des couleurs de chaque découpe **inclus** dans celui de la source (aucune interpolation) | — |

**★ Un contrôle a réellement mordu, deux fois.** (1) La première version de `encres.py` initialisait
ses centres par percentiles de luminance : sur l'image synthétique elle a **fusionné deux centres**
(parts 50/0/50) et l'instrument a refusé de publier. Init remplacée par un k-moyennes++ déterministe.
(2) Le premier balayage de signatures ne regardait que le coin **bas-droite**, celui où j'avais vu
quelque chose — un zéro obtenu sur une fenêtre choisie après coup. Repassé sur les **quatre** coins
(`mesures/planche-coins-*.png`) : les marques n'existent qu'en bas-droite, et le balayage large a
corrigé un faux positif (la « marque » de E12 est une **plaquette** sur le socle de la vitrine, pas
une signature).

**★ Et un résultat uniforme a d'abord fait suspecter l'instrument — à raison.** `encres.py` rendait
les **mêmes** centres et les **mêmes** parts aux 12 images. Vérification faite, l'uniformité est
vraie mais mal mesurée : ces images ne sont pas des amas continus, elles sont **tramées** à partir
d'un très petit nombre de couleurs littérales, et le k-moyennes moyennait chaque ancre avec son halo
(il rendait l'ocre à `(172,139,64)` alors que la couleur **posée** est `(176,141,62)`, soit `--laiton`
au bit près). La grandeur qui discrimine ici n'est pas un centre d'amas, c'est la couleur littérale.
D'où `palette.py`.

### La palette de série — mesurée, pas déduite

Les 12 images partagent **quatre** encres littérales, **identiques au bit près** :

| encre | hex | jeton du canon | écart Tchebychev | part d'aire (min–max sur les 12) |
|---|---|---|---|---|
| fond sombre | `#161c2b` | *aucun* — le plus proche est `--panneau #111823` | **8** (`--encre #0b1016` : 21) | 52,2 – 53,0 % |
| ardoise | `#2c3242` | *aucun* — le plus proche est `--lisere #2a3648` | **6** | 25,7 – 27,9 % |
| doré | `#b08d3e` | **`--laiton`** | **0** (bit-exact) | 10,6 – 14,9 % |
| clair | `#eae0c8` | **`--creme`** | **0** (bit-exact) | 2,8 – 5,6 % |

**Critère 4 (« écarts de palette entre images ≤ 6/255 par canal par encre ») : étendue mesurée
`(0,0,0)` sur les quatre encres, aux 12 images.** Le critère est satisfait avec la marge maximale
possible. Aucune encre hors famille. Le reste (« hors ancres », 2,6 – 7,3 %) est le halo de tramage,
à ≤ 12 de son ancre.

**Trois faits qui en découlent, et qu'il faut dire :**

1. **Le dossier annonce « 3 encres postérisées » pour les 12 : la mesure en trouve QUATRE**, et la
   deuxième (`#2c3242`) porte **26 % de l'aire** — plus que l'ocre et la crème réunis. Ce n'est pas
   un défaut d'image, c'est une carte à corriger : le procédé déclare trois encres, le territoire en
   porte quatre.
2. **Le fond `#161c2b` n'est aucun jeton du canon** — `grep -icF` sur `hud-brennar.html` et
   `ecrans-brennar-6.html` rend **0 / 0**. C'est la valeur par défaut codée en dur dans
   `source-aplat-fond.py` (« `#161c2b` »). Elle reste **dans la famille** : `hud-brennar.html:45`
   pose un dégradé de fond `#2c3242 → #141a26 → #0a0e16`, et `#161c2b` tombe dedans. Conséquence
   chiffrée pour l'intégration : contraste `#161c2b` / `--encre #0b1016` = **1,12:1** (et 1,05:1 avec `--panneau`) — une couture
   à peine visible si ces images jouxtent un panneau au fond canon. MINEUR de série.
3. **L'or employé est `--laiton`, jamais `--or`.** Écart `#b08d3e` ↔ `--or #d9ab4e` = **41** au canal
   max ; ↔ `--or-vif #f2c96b` = **66**. C'est cohérent sur les 12, donc délibéré ou du moins
   uniforme — mais si le chrome de l'UI dore en `--or`, l'écart de 41 sera visible au raccord.
   **ARBITRAGE**, pas défaut.

---

## Par image

Palette : les quatre encres ci-dessus, identiques aux 12 ; la colonne « encres » donne donc les
**parts d'aire** dans l'ordre `#161c2b / #2c3242 / #b08d3e / #eae0c8`.
« zone calme » : fenêtre 614×204 (60 % × 20 %) la plus uniforme (`reserve.py`) ; « texte » : part de
la meilleure boîte 614×204 où la crème tient à ≥ 4,5:1 (`reserve2.py`).
« cadrage » : part de l'encre CLAIRE perdue par un recadrage **plein cadre** (couvrir 1080×1900 ⇒ on
ne garde que 56,8 % de la largeur, x = 220..803). En emploi **bandeau** (1080×1080 dans le rect libre
1080×1900) : **0 px coupé sur les 12**.

| id | image | écran | objet lu | SENS + indice | identité | style | encres (% aire) | zone calme + contrastes | cadrage | classe |
|---|---|---|---|---|---|---|---|---|---|---|
| **E1** | `vide-appro.png` | ㉚ Appro | listing en continu **vierge** (cases à cocher vides) drapé sur un bureau, pile de feuillets vierges derrière, lampe d'architecte, stylo posé | **RIEN ENCORE** — attente : cases **vides**, stylo prêt, lampe allumée, pile **pleine** de formulaires neufs. Perte : aucune | bonne — bon de commande + réserve de formulaires ; mise en scène partagée avec E2 | **période exacte** : papier listing à bandes Caroll = bureau fin 80s. L'objet le plus daté (juste) de la série | 53,0 / 25,8 / 10,9 / 3,1 | (312,24) haut, σ=0,24 ; L p50 0,0118 → **crème 12,95:1**, encre 1,12:1 ; texte **100 %** | **25,6 %** — la lampe (gauche) **et** toute la pile (droite) sortent | **MINEUR** |
| **E2** | `vide-carnet.png` | ㉞ Carnet | carnet à spirale sous une lampe allumée, stylo posé en travers | **RIEN ENCORE** — attente : lampe allumée, stylo posé, page presque nue. Réserve : le **tiers gauche porte de l'écriture** — le carnet n'est pas tout à fait vierge | **exacte** | période plausible | 52,9 / 26,0 / 12,0 / 4,3 | (360,192) haut, **σ=0,00** ; crème **12,95:1** ; texte **100 %** | 16,1 % — base de lampe et pointe du stylo | **RECEVABLE** |
| **E3** | `vide-coffre.png` | ⑪ Coffre | coffre-fort **ouvert**, quatre étagères nues, porte battante, flaque de lumière au sol | **AMBIGU — « rien encore » domine.** Attente : coffre **intact**, cadran et charnières en place, étagères d'équerre, rien de renversé dedans, sol propre. Perte, mesurée : **une pièce au sol**, hors du coffre, ellipse ocre pleine de **34×11 px** en x=152..185 / y=933..943 ; + mur haut-gauche **taché/écaillé**. La pièce n'a **aucune autre fonction** que de dire « quelque chose est sorti d'ici » | **exacte** | coffre à cadran : lit plus 1930-50 que 1990, mais toujours en service — pas un anachronisme | 52,3 / 27,9 / 10,6 / 5,5 | (0,312) milieu, σ=34,58 ; p95 → crème **2,38:1** (le mur ocre) ; texte **92,3 %** | 20,1 % — la **porte ouverte** sort du cadre | **MINEUR** |
| **E4** | `vide-conflit.png` | ㉙ Conflit | deux chaises **droites** face à face autour d'une table, lampe allumée au centre | **RIEN ENCORE** — attente : chaises **debout** (jamais renversées), assises propres, lampe allumée, table nette : la réunion n'a pas eu lieu. Perte : aucune | défendable (le *sit-down*) mais **même objet que E10** — voir arbitrage A4 | période exacte, intérieur domestique | 52,2 / 26,6 / 12,5 / 3,3 | (24,376) milieu, σ=14,13 ; crème **12,95:1** ; texte **98,7 %** | 34,5 % — **la moitié extérieure des deux chaises** ; il ne reste que la lampe et la table | **MINEUR** |
| **E5** | `vide-distribution.png` | ㉘ Distribution | **je ne peux pas nommer l'objet** : un grand panneau encadré (ou une embrasure) vide sous une suspension, pelote de ficelle et cordon dénoué au sol, buffet à gauche | **AMBIGU.** Attente : lampe allumée, sol balayé, ficelle prête à lier. Perte : la flaque est **criblée de petits points sombres** et porte deux formes fichées — cela se lit comme des **trous de punaise** et des punaises restantes, donc « ce qui était affiché ici a été enlevé » ; cordon **dénoué** qui traîne | **faible — défaut principal.** Rien ne dit « distribution » : ni cageot, ni charrette, ni colis, ni tournée. Objet non nommable sans la légende | période plausible | 52,6 / 26,1 / 11,6 / 5,0 | (0,8) haut, σ=6,05 ; crème **12,95:1** ; texte **99,9 %** | **11,4 %** (2ᵉ meilleur) — le buffet de gauche | **MAJEUR** |
| **E6** | `vide-exceptions.png` | ⑨ Exceptions | **bannette à courrier vide**, sous une suspension conique, sur une table de bois | **RIEN ENCORE** — attente : bac **propre**, vide, éclairé, encoche de préhension dégagée, aucun papier, aucun résidu. Perte : aucune | **exacte** — c'est le modèle que le dossier cite lui-même (« une corbeille pour la file d'exceptions ») | période plausible | 52,6 / 26,7 / 12,3 / 5,4 | (32,320) milieu, σ=6,31 ; crème **12,95:1** ; texte **100 %** | 34,3 % — les deux bouts du bac ; la lampe reste centrée | **RECEVABLE** |
| **E7** | `vide-famille.png` | ⑥ La Famille | porte-manteau mural sous une lampe, **un** manteau éclairé au centre — **et d'autres manteaux dans l'ombre** | **AMBIGU — et c'est la lecture « ce n'est PAS vide » qui domine.** Mesuré sur `mesures/detail-famille-bas.png` : la masse sombre de gauche est un **vêtement**, avec **deux boutons ronds visibles** (x≈300–320, y≈735 et y≈900), un col et un rabat ; deux autres masses portent une **ligne d'épaule**. Le portant est **garni**, pas vide. Pas de punition — mais l'écran dit l'inverse de son message | métaphore juste **si le portant est vide** ; garni, elle dit « la famille est déjà là, dans le noir » | période plausible (patères en fonte, lampe à abat-jour) | 52,8 / 25,8 / 12,5 / 5,6 | (392,816) bas, σ=17,49 ; crème **12,95:1** ; texte **97,8 %** | **2,1 %** — **la plus tolérante au recadrage des 12** | **MAJEUR** |
| **E8** | `vide-journal.png` | ㊳ Journal & rue | six panneaux verticaux sombres à arêtes ocres, ombres triangulaires en pied — **présentoir à journaux vide**, lisible seulement après effort | **AMBIGU.** Attente : casiers **propres**, aucun lambeau de papier, aucune casse. Punition : l'abstraction admet frontalement la lecture **« barreaux / cage »** — une grille verticale sombre, cadrée serré, sur un téléphone. C'est exactement la lecture que le ruling interdit | **faible** : objet non nommable sans la légende ; et rien de « la rue » | aucun objet datable | 52,4 / 25,7 / 11,3 / 4,8 | (136,712) bas, σ=24,45 ; p95 → crème 5,16:1 ; texte **95,4 %** | 45,5 % — 3 casiers sur 6 ; le motif se répète, la lecture survit | **MAJEUR** |
| **E9** | `vide-marche.png` | ㉑ Marché | **ardoise vierge** pincée par une patte, sur un lavis ocre | **RIEN ENCORE** — attente : ardoise **propre**, aucune trace de craie effacée, aucun prix barré, patte en place. Perte : aucune | bonne (ardoise de prix) ; un peu générique (une ardoise est aussi un menu) | période plausible, intemporel | 52,6 / 27,1 / 14,9 / 2,8 | (200,352) milieu, **σ=0,00** ; crème **12,95:1** ; texte **100 %** — **le meilleur fond de texte des 12** | **56,9 %**, le pire : l'ardoise **perd ses deux bords** et cesse d'être une ardoise pour devenir un aplat sombre | **MINEUR** |
| **E10** | `vide-recrutement.png` | ⑳ Recrutement | deux chaises paillées vides côte à côte contre un mur, flaque de lumière au sol | **RIEN ENCORE** — attente : chaises **debout**, propres, alignées, éclairées ; salle d'attente avant l'entretien. Perte : aucune | **interchangeable avec E4** : même objet (« deux chaises vides »), et adossées à un mur c'est le motif le plus générique de la série — il conviendrait aussi bien à ⑨, ㉙ ou ⑥ | période plausible | 52,3 / 26,9 / 11,9 / 4,2 | (272,24) haut, σ=11,83 ; crème 9,74:1 ; texte **99,8 %** | 37,2 % — la moitié extérieure des deux chaises | **MAJEUR** |
| **E11** | `vide-revue.png` | ⑯ Revue du jour | **aucun objet** : un abat-jour, un cône de lumière, une surface nue, du grain | **RIEN ENCORE** — attente : lampe **allumée**, plan de travail dégagé. Réserve : le grain est **dense et irrégulier** (`mesures/detail-revue-grain.png` : semis de points sombres jusque **hors** de la flaque, plus des taches de 10-20 px) ; il se lit poussière/salissure plutôt que trame | **la plus faible des 12** : pas d'objet du tout. Sa mise en scène est le **dénominateur commun** de E1, E2 et E6 — donc elle ne désigne aucun écran | période plausible | 52,9 / 26,2 / 11,9 / 4,8 | (200,624) bas, σ=3,62 ; crème 9,74:1 ; texte **100 %** | **0,0 %** — la seule image **totalement** indemne au recadrage | **MAJEUR** |
| **E12** | `vide-vitrine.png` | La vitrine | **vitrine vitrée à rayonnages vides**, éclairée par le haut, plancher clair devant | **RIEN ENCORE** — « rayons dévalisés » est sur la liste de perte du dossier, mais **rien ne l'appuie ici** : caisson intact, vitres entières, tablettes d'équerre, **aucun débris, aucune étiquette restée, aucun carton renversé**, sol propre, éclairage allumé. Le vide est **propre**, pas ruiné | **exacte** (rayons = vitrine) | période plausible | 52,7 / 26,5 / 12,5 / 5,4 | (280,456) milieu, σ=28,54 ; p95 → crème 8,00:1 ; texte **95,7 %** | 38,0 % — les deux côtés du caisson ; le rayonnage se répète, la lecture survit | **RECEVABLE** |

### Critère 5 — conclusion d'ensemble

**Aucun MAJEUR de lisibilité.** Les 12 portent une boîte de texte 614×204 où la crème tient à
≥ 4,5:1 sur **92,3 à 100 %** de sa surface (`reserve2.py`). Le seuil du dossier (« en dessous de
4,5:1 pour les DEUX : MAJEUR ») n'est atteint nulle part. En revanche l'**encre** du canon ne tient
nulle part sur le fond dominant (1,12:1) : **le texte de ces états vides est crème, sans alternative.**

Positions utiles : haut → E1 E5 E10 ; milieu → E3 E6 E9 E12 ; bas → E7 E8 E11 ; E2 haut-milieu.

---

## Les 3 images de tête (par impact sur un joueur neuf)

Classées par **dégât**, et une image qui dit le **faux** est plus coûteuse qu'une image qui ne dit rien.

1. **E7 — `vide-famille.png` (⑥ La Famille).** L'écran qui doit dire « tu n'as encore personne »
   montre un **portant garni**. Ce n'est pas une impression : `mesures/detail-famille-bas.png` montre
   un second vêtement avec **deux boutons, un col et un rabat**, plus deux masses à ligne d'épaule.
   Un joueur neuf lit « ils sont déjà là, dans le noir » — l'exact contraire du message, et sur l'un
   des écrans les plus structurants du jeu. **C'est le seul cas de la série où l'image contredit sa
   propre fonction.**
2. **E8 — `vide-journal.png` (㊳ Journal & rue).** Six panneaux verticaux sombres à arêtes ocres :
   au format d'un téléphone, en portrait, c'est d'abord une **grille de barreaux**. Le ruling
   interdit précisément la lecture de punition, et ici elle n'est pas apportée par un détail qu'on
   peut retirer : elle est portée par la **composition entière**. Second dégât : l'objet n'est pas
   nommable — j'ai dû l'inférer de la légende, ce qu'un joueur n'aura pas.
3. **E5 — `vide-distribution.png` (㉘ Distribution).** Je ne peux pas nommer l'objet, et ce que je
   finis par y lire — un **panneau d'affichage criblé de trous de punaises**, deux punaises
   restantes, un cordon dénoué — dit « ce qui était affiché ici a été enlevé ». Un joueur neuf sur
   l'écran de distribution y verra soit rien, soit un départ.

*(E11 arrive juste derrière : elle ne dit rien de faux, elle ne dit rien du tout.)*

---

## Série — les 12 se lisent-elles comme une main ?

**Oui sur la matière, non sur la mise en scène.** Le partage est net, et les deux côtés se mesurent.

### Ce qui tient (et tient remarquablement)

- **Palette : identique au bit près.** Étendue `(0,0,0)` par canal sur les quatre encres, aux 12.
  Aucune série jugée ici ne peut faire mieux.
- **Budget d'encre : constant.** Sombre 52,2–53,0 % · ardoise 25,7–27,9 % · doré 10,6–14,9 % ·
  crème 2,8–5,6 %. Un écart de moins d'un point sur l'encre dominante, à travers douze compositions
  qui n'ont rien en commun : c'est la signature d'une seule main.
- **Traitement : une seule échelle.** Aplat postérisé + tramage de bord, partout, sans exception.
- **Aucun anachronisme.** Les 12 objets datables (lampe d'architecte, listing à bandes, carnet à
  spirale, coffre à cadran, patères en fonte, suspension conique, ardoise, vitrine, chaises paillées)
  sont antérieurs à ~1995. **E1 est même daté juste et avec précision** : le papier en continu est
  l'objet de bureau des années 80 par excellence.
- **Lumière : un motif commun.** 8 des 12 portent un luminaire visible et allumé ; les 4 autres
  (E3, E8, E9, E10) portent la flaque sans la source. Le geste « lampe allumée = ça t'attend » est
  cohérent et il **sert le ruling** : c'est lui qui empêche la plupart de ces images de basculer.

### Ce qui casse la main

1. **★ Le cadre peint n'existe que sur 5 images sur 12 — et sur l'une d'elles il n'est même pas de
   la même encre.** Mesuré par `bordure.py` (anneau 0–23 px comparé à un témoin intérieur 60–83 px,
   pour ne pas confondre un cadre avec un bord clair) :

   | | épaisseur | anneau clair / témoin clair | encre du cadre |
   |---|---|---|---|
   | E1 | **16 px** | 72,9 % / 0,0 % | **ocre** (`#b08d3e` 72,9 %, crème 0,0 %) |
   | E4 | **20 px** | 87,5 % / 14,2 % | crème + ocre |
   | E6 | **20 px** | 79,2 % / 14,6 % | **crème** (55,7 %) |
   | E8 | **20 px** | 89,0 % / 20,3 % | **crème** (59,2 %) |
   | E10 | **20 px** | 77,8 % / 20,6 % | **crème** (49,1 %) |
   | E2 E3 E5 E7 E9 E11 E12 | **0 px** | anneau ≈ témoin | *aucun cadre* |

   Un joueur qui navigue entre ces écrans verra **deux systèmes graphiques**, et l'un des cinq
   cadres est doré quand les quatre autres sont crème. En emploi bandeau le cadre est intégralement
   visible ; en plein cadre les bords gauche/droit sautent mais **le haut et le bas restent**. La
   séparation 5/7 survit aux deux emplois.

2. **★ Sept images sur douze portent une signature manuscrite dans le coin bas-droite.** Balayage
   des **quatre** coins à 1:1 (`mesures/planche-coins-*.png`) : les marques n'existent qu'en
   bas-droite, sur **E1, E3, E4, E5, E8, E9, E10** — *décompte fait à l'œil sur les planches à
   1:1, pas par un script : la découpe est instrumentée, la reconnaissance ne l'est pas* (voir
   « Non vérifié » 10). Quatre sont lisibles comme un **nom de personne** — « G.T. Rob » (E3), « Doylos » (E8), « Tilin » (E9), « Pdrilon » (E10). Celle de E3 est
   **lisible mot à mot** à un agrandissement ×4 (`mesures/detail-coffre-signature.png`) et son encre
   occupe les lignes y=987..1009 ; sa **largeur exacte n'est pas instrumentée** — le plancher ocre
   partage la même bande et met en défaut un profil de colonnes (mesuré : le balayage rend
   x=870..1023, c'est-à-dire le sol, pas le texte). Ce que je peux affirmer sans l'œil : la marque
   est de la même encre que le décor et n'est donc masquée par aucun contraste. C'est un artefact de
   génération, il signe une œuvre que personne n'a signée, et il tombe
   pile dans le coin où un élément de HUD se pose. *(Contrôle : la marque que j'avais cru voir sur
   E12 est une **plaquette** sur le socle de la vitrine — `mesures/detail-vitrine-marque.png` —
   donc 7 et non 8.)*

3. **Deux images sur douze montrent un contenant qui n'est pas vide.** E7 (portant garni, mesuré) et,
   beaucoup plus légèrement, E2 (le tiers gauche du carnet est écrit). Même famille, deux gravités.

4. **La mise en scène se répète.** « Lampe + objet posé sur un plan » vaut pour E1, E2, E6 **et**
   E11 — et E11 n'ayant pas d'objet, elle **est** le dénominateur commun des trois autres. « Deux
   chaises vides » vaut pour E4 et E10. Sur douze images destinées à distinguer douze écrans, six
   partagent l'un de ces deux gabarits.

5. **L'emploi n'est pas le même coût pour tous.** En bandeau, 0 px coupé partout. En plein cadre,
   l'encre claire perdue va de **0,0 %** (E11) à **56,9 %** (E9), et pour E1, E4, E9 et E10 le
   recadrage emporte l'élément qui **fait** l'objet (la pile et la lampe ; les deux chaises ; les
   bords de l'ardoise ; les deux chaises).

---

## Arbitrages (divergences de direction, pas défauts)

**A1 — L'emploi n'est pas tranché, et il décide de 8 images sur 12.** Bandeau 1080×1080 : rien n'est
coupé, il reste 820 px sous l'image dans le rect libre 1080×1900. Plein cadre couvrant 1080×1900 :
on ne garde que 56,8 % de la largeur (x = 220..803) et **8 images sur 12 perdent plus de 20 % de
leur encre claire**, dont quatre perdent leur élément identifiant. Tant que l'emploi n'est pas
décidé, mes pourcentages sont une géométrie, pas un verdict.

**A2 — « Napolitain / mafieux » est absent, mesurable par ce qui n'y est pas.** Les 12 lisent
« noir nocturne, bureau et intérieur », et c'est une direction **cohérente et plausible**. Mais rien
n'y est napolitain (aucune architecture, aucun carrelage, aucune enseigne, aucune iconographie
religieuse ou méditerranéenne) et presque rien n'y est mafieux — E4 (le *sit-down*) est la seule
image qui porte une idiome du genre. Ce n'est pas un anachronisme : c'est une **direction à
ratifier ou à corriger**, et elle engage les 12 d'un bloc.

**A3 — Le doré est `--laiton`, pas `--or`.** Uniforme sur les 12, donc assumé. Écart avec `--or` :
**41** au canal max. À trancher contre le chrome de l'UI, sous peine de deux dorés au raccord.

**A4 — E4 et E10 sont le même objet.** « Deux chaises vides » ne peut pas désigner deux écrans
différents. Les deux sont bonnes séparément ; ensemble, elles s'annulent. Je classe E4 MINEUR (la
table + la lampe + le face-à-face en font une idiome spécifique) et E10 MAJEUR (des chaises adossées
à un mur conviendraient tout autant à ⑨, ㉙ ou ⑥) — mais le choix de **laquelle** garde le motif est
un arbitrage produit, pas une mesure.

---

## Non vérifié — et ce que ça empêche de conclure

1. **Aucune capture en jeu** (le dossier le dit : le client affiche du texte sur du noir). Je juge
   des maquettes, pas des écrans. ⇒ Je ne peux rien conclure sur **le rendu réel après import
   Unity**. Trois risques nommés, aucun mesurable ici : (a) le projet est en espace **linéaire** et
   ces valeurs viennent d'un pipeline sRGB — tout voile, toute opacité posée **par-dessus** ne
   rendra pas ce que la maquette laisse croire ; (b) ces images sont un **aplat tramé**, la classe
   de contenu que la compression de texture (ETC2/ASTC) dégrade le plus visiblement — le tramage
   peut baver et faire apparaître des blocs ; (c) l'échelle réelle à l'écran. *Mesure qui
   trancherait :* une capture PlayMode à 1080×2400 avec son rect imprimé, comparée à la source.
2. **Aucun texte ni gabarit de superposition.** Je mesure une **réserve**, pas une lisibilité. Mes
   « ≥ 4,5:1 » sont ceux d'un aplat de crème sur le fond mesuré ; un texte **fin** en crème posé sur
   le tramage ocre/sombre perdra localement, et je ne sais ni la taille, ni la graisse, ni s'il
   portera un voile. *Mesure :* poser le gabarit réel, recompter la part de la boîte à ≥ 4,5:1, et
   ajouter une sonde de frange d'anti-crénelage.
3. **Aucun gabarit de recadrage** (arbitrage A1) — voir ci-dessus.
4. **Les prompts de génération ne sont pas fournis** (seul le procédé est copié). ⇒ Pour chaque
   écart je ne peux pas dire s'il est **demandé** ou **subi** : le doré à `--laiton`, le cadre peint
   sur 5 images, la signature, les trous de punaise de E5. *Mesure :* les sidecars `.fal.json` que
   `source-generer.py` écrit à côté de chaque image (modèle, prompt, seed) — ils ne sont pas dans le
   dossier. **Pour E5 en particulier, la classe changerait** : si le prompt demandait « panneau
   d'affichage vide », les trous de punaise sont délibérés et l'identité redevient discutable au lieu
   d'être absente.
5. **La doctrine v3.3 « matières » est hors mandat** (le dossier l'exclut). Je n'ai donc jugé aucune
   conformité de matière, seulement couleur, géométrie et lecture.
6. **Provenance : transportée, pas sourcée.** Les 12 `sha256` concordent avec les préfixes de
   `captures-provenance.md` (12/12), mais je n'ai pas ouvert `4e6697f` ni la branche
   `da/portraits-lieutenants` (hors mandat). « Ce sont les images du commit annoncé » reste un fait
   **déclaré**. *Mesure :* `git cat-file` sur les blobs cités.
7. **Les signatures : je les lis comme hallucinées, je ne l'ai pas prouvé.** Aucun réseau, aucun
   accès à un crédit d'auteur. *Mesure :* le prompt (point 4) — s'il ne demande aucune signature,
   la conclusion est acquise.
8. **E5 : je n'ai pas pu trancher la nature de l'objet**, et c'est le finding lui-même. Je le
   consigne comme tel plutôt que de choisir la lecture qui m'arrange.
10. **Trois de mes constats sont des lectures À L'ŒIL sur des découpes instrumentées, pas des
    sorties de script**, et je les isole ici plutôt que de les laisser passer pour des mesures :
    (a) le décompte « 7 signatures sur 12 » et l'identification des quatre noms ; (b) les **boutons**
    du second manteau de E7 et leurs coordonnées approchées ; (c) la nature des objets de E5 (trous
    de punaise) et la lecture « barreaux » de E8. Les découpes sont reproductibles et commitées
    (`decoupes.py`, `marques.py`, contrôle : les couleurs de sortie sont incluses dans celles de la
    source, donc aucune interpolation n'a inventé de forme) — mais la **reconnaissance de forme**
    n'est pas mesurée. *Mesure qui trancherait pour (a) :* un détecteur de traits fins isolés dans
    une bande exempte de décor. Pour (b) et (c) : rien de purement programmatique ; c'est un
    désaccord de lecture qui se tranche à deux paires d'yeux.
11. **Je n'ai pas jugé la série contre les 48 écrans du canon** — seulement contre les 12 écrans que
   le dossier attribue. Je ne peux donc pas dire si un objet de cette série **entre en collision
   avec un écran que je n'ai pas vu** (au-delà des collisions internes E4/E10 et E1/E2/E6/E11).

---

## Annexes — scripts et sorties

Tous dans `mesures/`, PIL seul, aucun réseau, aucun rendu, aucune compilation. Chacun imprime la
taille de chaque image qu'il ouvre et refuse de publier si son contrôle échoue.

| script | grandeur | sortie |
|---|---|---|
| `encres.py` | k-moyennes k=3 et k=4 (conservé : son résultat **uniforme** est ce qui a mené à `palette.py`) | `sortie-encres.txt` |
| `palette.py` | palette **littérale** + parts d'aire + étendue de série | `sortie-palette.txt` |
| `reserve.py` | fenêtre 60 %×20 % la plus uniforme, percentiles L, contrastes WCAG | `sortie-reserve.txt` |
| `reserve2.py` | part de la boîte de texte tenant à ≥ 4,5:1 (seuils **dérivés**) | `sortie-reserve2.txt` |
| `cadrage.py` | encre claire perdue par le recadrage plein cadre, centre de gravité vertical | `sortie-cadrage.txt` |
| `bordure.py` | présence, épaisseur et encre du cadre peint | `sortie-bordure.txt` |
| `objets.py` | composantes connexes (la pièce de E3), écart des dorés | `sortie-objets.txt` |
| `decoupes.py`, `marques.py` | découpes de lecture et planches des 4 coins | `detail-*.png`, `planche-coins-*.png` |
