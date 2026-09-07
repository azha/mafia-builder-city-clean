# Juge visuel ⊥ — ㊳ Le journal & la rue (« ce qui se dit ce matin ») — r1 — 2026-09-07

Juge à contexte vierge. Premier tour de cet écran. Aucun rapport de juge (visuel ou données),
aucune note d'implémentation, aucun `Assets/Scripts` n'a été ouvert. Aucun run, aucune compilation.
Instruments : `python3` + PIL, `grep`/`sed` sur la source de l'atelier, `fc-match`.

## Verdict : NON APPROUVÉ

Le panneau est au bon endroit, à la bonne largeur, avec les bons libellés français — mais on n'y lit
pas le journal : les titres et les noms de journaux sont des clés i18n brutes, la « une » n'existe
plus comme objet distinct, le pied et son unique geste ont disparu, et la dernière carte visible est
tranchée en plein milieu des lettres.

---

## Homologue retenu — quel cadre j'ai pris comme témoin, et pourquoi

Seul le cadre **NOMINAL #125** est rendu ce tour ; les cadres d'état #126–#130 ne sont lisibles
qu'en SOURCE (`ecrans-brennar-6.html`, l. 6119-6137, lue).

**J'ai retenu #125 comme témoin.** Raison : la capture montre une liste **non vide** de brèves du
matin, sous les trois compteurs `à la une / dans la rue / en cours` — c'est exactement le contrat de
#125. Les autres ne s'appliquent pas : #129 « Rien ce matin » est l'état **vide** (la capture a
5 items), #126 « Ce qui arrive à la ville », #127 « La rivière ne se retirera pas » et #128 « Ce que
vous avez compris » portent d'**autres** compteurs et d'autres blocs (`.evt`, `.cpl`), absents de la
capture ; #130 « Ce qui manque encore » n'est pas un état de jeu mais une **fiche de dette** de la
maquette.

⚠️ Ce que #130 déclare, et qui explique deux de mes bloquants : *« tout est en clés : titre, journal,
angle, descripteur, gabarit — cinquième écran à buter dessus »* (maillon **L1**) et *« Aller à un
enterrement … rien ne le relie à un événement affiché »* (maillon **L3**). **La maquette avait
anticipé B1 et B4.** Ce sont donc des trous connus, pas des surprises — je les classe quand même à
leur gravité perçue, mais le destinataire est un lot / un arbitrage, pas le correcteur d'écran.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les grandeurs ci-dessous sont mesurées par les scripts de `mesures/` (sorties dans
`mesures/SORTIES.txt`). L'échelle est celle imposée par `dossier.md` : **1 px CSS = 3,6 px** des
deux côtés pour le CONTENU.

| # | grandeur | référence | capture | écart | script |
|---|---|---|---|---|---|
| 1 | largeur du bloc de contenu | 986 px = **273,9 CSS** | 988 px = **274,4 CSS** | **+0,5 CSS (+0,2 %)** | `08`, `19` |
| 2 | marge gauche / droite du bloc | x=47 / x=1032 | x=46 / x=1033 | 1 px de chaque côté | `08`, `19` |
| 3 | largeur du bloc — 3 planches | — | 274,44 CSS sur les **3** | identique | `19` |
| 4 | gouttière entre tuiles de compteurs | 22 px = **6,11 CSS** | 21 px = **5,83 CSS** | −0,28 CSS | `17`, `18` |
| 5 | gouttière enseigne → compteurs | 32 px = **8,89 CSS** | 32 px = **8,89 CSS** | **0** | `01` |
| 6 | teal des chiffres de compteur | **(127, 212, 217)** `#7fd4d9` | **(127, 212, 217)** | **0/255 sur 3 canaux** | `04` |
| 7 | crème des titres de brève | **(234, 224, 200)** `#eae0c8` | **(234, 224, 200)** | **0/255 sur 3 canaux** | `04` |
| 8 | encre du sous-titre d'enseigne | **(185, 173, 146)** `#b9ad92` | **(185, 173, 146)** | **0/255 sur 3 canaux** | `04` |
| 9 | hauteur des chiffres de compteur | 39 px = 10,83 CSS | 41 px = 11,39 CSS | +2 px (**+5,1 %**, à la tolérance) | `10` |
| 10 | textes de chrome et d'écran, français | — | « À LA UNE », « DANS LA RUE », « EN COURS », « CE QUI SE DIT CE MATIN », « Le journal », « CHALEUR », « Brûlant » | **aucun enum brut, aucun repli anglais** dans ces 7 libellés | lecture |
| 11 | contraste — 7 textes de la référence | 4,58:1 à 13,57:1 | — | tous ≥ seuil | `12` |
| 12 | contraste — 7 textes de la capture | — | 8,11:1 à 13,72:1 | **tous ≥ seuil**, aucun sous 4,5:1 | `12` |
| 13 | hauteur du bandeau (chrome) | dérivée du code : 52 CSS-HUD × 2,755 = 143 px | filet mesuré à **y=138..142**, bandeau ≈ **143 px** | conforme à la dérivation du dossier | `01` |
| 14 | état du médaillon | témoin `.tel.chaud` (CSS) | « Brûlant », boîtier + filet **braise**, aiguille dans l'arc chaud | conforme au témoin `.chaud`, **pas** un laiton faux | `13` (crop) |
| 15 | luminance moyenne de la zone de contenu | **30,09** | **28,89** | −1,20 (−4 %) | `09` |
| 16 | onglet actif du dock | — | **PLUS** souligné en or, cohérent avec le chemin Plus → LE JOURNAL | — | `13` (crop) |
| 17 | uniformité des remplissages | — | gouttière : **sd = 0,00, 1 teinte** | aucun bruit, aucun artefact de compression | `15` |

**Contrôles d'instrument.** Chaque script porte son contrôle positif ET, quand l'enjeu le mérite,
son contrôle négatif. Trois de mes instruments ont été **réfutés par leur propre contrôle avant
toute conclusion**, et je le dis parce que c'est ce qui rend le reste opposable :

- `03_or.py` cherchait le laiton par le hex `#f2c96b` ± 34 : **contrôle positif ÉCHEC sur la
  référence elle-même** (0 px sur la bande du titre). Cause : bande mal choisie, et surtout un motif
  lié à un hex — la capture emploie **un autre jeton** (voir `M5`). Remplacé par `05_filets.py`,
  **générique** (« chaud » = R − B > 20 et L > 45), qui ne suppose aucun hex : contrôle positif OK
  (13 filets, 6 colonnes sur la référence).
- `06_traits_continus.py` rendait **zéro partout** sur les trois captures. Un résultat uniforme
  accuse d'abord l'instrument : j'ai donc écrit `07_bords.py`, qui ne cherche **aucune couleur** mais
  demande s'il existe, entre l'extérieur et l'intérieur d'un boîtier, une rangée qui n'est **ni l'un
  ni l'autre**. Contrôle positif OK (3 rangées `(42,54,72)` sur la référence), contrôle négatif OK
  (0 en plein aplat). Le zéro de la capture est alors un fait, pas un artefact.
- `14_decor.py` : contrôle négatif ÉCHEC (bande choisie contenant du texte). Refait en `15_fond.py`
  sur des bandes vérifiées vides. Et la grandeur discriminante n'était **pas** l'écart-type (3,95
  contre mon seuil de 4 — j'avais mal choisi le seuil) mais le **nombre de teintes** : 159–190 contre
  **1**. Séparation absolue.

---

## 0. L'écran, tel que la maquette le dit

**But.** On vient y lire ce que la ville raconte ce matin : un titre de une, quelques brèves de rue,
et savoir ce qu'on peut en faire. Ce n'est pas un tableau de bord — c'est une **page de journal**.
L'écran ne demande pas de décider : il demande de **prêter attention**.

**Ordre de lecture.**
1. **« Le journal »** — capitale de 12,5 CSS, or `#f2c96b`, centrée, sur une plaque à filet laiton :
   c'est une manchette, elle se lit avant tout le reste.
2. **Les trois compteurs teal** `01 / 04 / 03` — 10,8 CSS de chiffre, `#7fd4d9` avec halo, sur fond
   presque noir : le seul teal de l'écran, donc le second point d'accroche. Ils annoncent la
   **taxonomie** de la page : à la une · dans la rue · en cours.
3. **La une** — un bloc à part : nom du journal en petites capitales or, **filet laiton**, puis le
   titre en sérif crème sur deux lignes (8,9 CSS de capitale), sa clé de source en gris effacé, et
   une **étiquette d'angle** encadrée (« FAIT DIVERS »).
4. **Les trois brèves** — rangées basses (30 CSS) : puce ronde, titre sans-sérif, source grise,
   **horodatage à droite** (« CE MATIN », « HIER »).
5. **Le pied** — un CTA encadré laiton « Y PRÊTER ATTENTION », puis la phrase-thèse de l'écran :
   *« on peut assister à ce qui se passe — c'est le seul geste que la rue accepte »*.

**Zones.** Manchette · compteurs · **puits de liste** (un caisson plus sombre, encadré, qui contient
les items et **garde son vide en bas** : il y a de la place, il n'y a rien de plus ce matin) · pied.

**Traits d'identité** — les cinq choses qui font que c'est *cet* écran :
1. le **cerne laiton** qui encadre toute la page comme un filet d'imprimerie (1 CSS, 452 CSS de haut) ;
2. l'**encre bleu nuit** : tous les remplissages sont des navys (`#111823`, `#0b1016`, `#0d0f10`) et
   le fond porte deux halos radiaux (or en haut, teal en bas) ;
3. la **hiérarchie une / rue** : un bloc haut et riche, puis des rangées basses et sèches ;
4. le **teal** réservé aux compteurs, l'**or** réservé aux enseignes et au geste ;
5. le **puits de liste** encadré, qui rend le vide lisible comme une réserve et non comme un manque.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. La **place** est juste — largeur à 0,2 % près, marges au pixel, gouttières justes, français
partout, contrastes tous au-dessus des seuils — mais **le contenu et la matière ne le sont pas**.

Ce qu'un joueur rencontre, dans l'ordre : (1) « Le journal », plus gros et **plus jaune** qu'à la
maquette ; (2) les compteurs, dans des tuiles **39 % trop hautes** et **inégales entre elles**
(20,6 % d'écart, là où la maquette les fait strictement égales) ; (3) **cinq pavés identiques** dont
le texte le plus gros est `news_beat.digest.ambient_micro.tilbey_weekly.headline`. À ce moment
l'écran a perdu : les compteurs annoncent « à la une » et « dans la rue », et rien dans la liste ne
distingue les deux — la **une n'existe plus comme objet**. Puis la dernière carte s'arrête net : à
1080×1920 elle est **tranchée au milieu des lettres** (294 px d'encre sur ses 3 dernières rangées).
Enfin il n'y a **pas de pied** : aucun geste, et la phrase qui donne son sens à l'écran a disparu.

La matière a changé de famille. La maquette est une page **bleu nuit encadrée de laiton** : 94 % de
ses teintes dominantes ont B − R entre +16 et +32, six colonnes de laiton tiennent le cerne, chaque
boîtier porte un trait `#2a3648`, deux filets laiton scandent la manchette. La capture est **grise
et sans trait** : 94,4 % de l'aire en `(16,16,16)` / `(0,0,0)` avec **B − R = 0**, **zéro** colonne
chaude, **zéro** bordure sur **sept** bords profilés, aucun filet, aucun décor (1 teinte contre 159
à 190). Le B − R moyen tombe de **+7,09 à +1,16** : la teinte bleue est réduite de 84 %. Ce n'est
pas une couleur ratée, c'est **un aplat à la place d'une matière**.

Les trois écarts qui pèsent le plus, dans l'ordre de ce qu'on perçoit : **B1** on ne peut pas lire le
journal (clés brutes en titre) ; **B3** la hiérarchie une/rue a disparu alors que les compteurs
l'annoncent ; **M2/M1/M3/M6** l'écran a perdu son trait et son bleu — il ne ressemble plus à une page
imprimée. **B2** (texte tranché) est plus petit à l'œil mais indéfendable : à 1920 un mot est coupé
en deux dans la hauteur.

**Ce qui est bien fait et qu'il faut garder** : le panneau « CE QUE LE SERVEUR ENVOIE VRAIMENT /
*Aucune de ces brèves n'a de texte* » est **hors du cadre nominal**, mais c'est un trou **honnêtement
documenté à l'écran**, dans la forme `.pann` que la maquette emploie précisément pour ça (#126–#130).
Il ne se supprime pas : il se garde **jusqu'à ce que les textes existent**, et il mérite un
commentaire de péremption. Je le compte en MINEUR « EN TROP », pas plus.

---

## 3. Écarts

Gravité : liste fermée `BLOQUANT` / `MAJEUR` / `MINEUR`. `ASSUMÉ` et `ARBITRAGE` sont dans des tables
à part et **ne sont pas comptés** ici. Critère : premier tour ⇒ tout est `NOUVEAU`.
`données ?` = l'écart dépendrait-il d'un autre jeu de données ? `dest.` = destinataire.

| id | gravité | critère | écart | mesure | données ? | dest. | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|---|
| **B1** | BLOQUANT | NOUVEAU | **Clés i18n brutes en rôle de TITRE**, sur 5/5 cartes et sur les 3 planches : le nom du journal (`press.outlet.free_weekly.name`, `…tilbey_weekly…`, `…brennar_daily_star…`) et surtout le **titre**, qui est le plus gros texte de chaque carte (`news_beat.digest.ambient_micro.free_weekly.headline`, `news_beat.hindsight.op_ed.free_weekly.headline`). Homologues maquette : « LE CLAIRON DE BRENNAR » et « Un corps repêché sous le pont de Stack » | 5 cartes × 2 clés = **10 clés brutes** par planche ; hauteur de capitale du titre-clé **10,83 CSS** (le plus gros texte du corps) ; contraste 13,72:1 — **parfaitement lisible et illisible de sens** | **non** (même défaut sur les 2 campagnes, `31d8e43` et `fd0e21e`) | back / lot contenu | si une route de textes existe déjà ailleurs ; d'où vient `hindsight.op_ed` (aucun juge-données sur cet écran) |
| **B2** | BLOQUANT | NOUVEAU | **La dernière carte de la liste est tranchée par le bas du contenant**, sans ellipse, sans dégradé, sans indice de défilement — le contenant coupe **au pixel** et non à la frontière d'item | 1080×**1920** : carte 3 haute de **133 px** au lieu de 214 ⇒ **294 px d'encre** sur ses 3 dernières rangées, marge sous l'encre = **0** (témoin : cartes 1-2 → 29-30 px de marge, **0** px d'encre). 1080×**2400** : carte 5 haute de **149 px** au lieu de 214 (−65 px = −30 %), marge **0**, **12 px** d'encre sur les 3 dernières rangées, et la 3ᵉ ligne `district-N · fresh` — présente sur les 4 autres cartes — **entièrement absente** | **non** (les 2 campagnes, les 2 résolutions) | correcteur | si un défilement existe et n'est simplement pas visible sur une image fixe ; une capture après geste de scroll trancherait |
| **B3** | BLOQUANT | NOUVEAU | **Le bloc « à la une » n'existe pas** : la maquette a 1 bloc héros + 3 rangées de brève, la capture a **5 rangées identiques**. Les trois compteurs annoncent pourtant « À LA UNE », « DANS LA RUE », « EN COURS » — **rien dans la liste ne distingue ces trois familles** | héros réf = **92,5 CSS** (y 855..1188), brève réf = **30,0 CSS** (y 1203..1310, 1322..1429, 1441..1549) ⇒ rapport **3,1 : 1**. Capture : 59,4 / 59,7 / 59,4 / 59,4 CSS ⇒ rapport **1,00 : 1** | **non** | correcteur | — |
| **B4** | BLOQUANT | NOUVEAU | **Le pied est absent** : ni le CTA encadré « Y PRÊTER ATTENTION », ni la note *« on peut assister à ce qui se passe — c'est le seul geste que la rue accepte »*. L'écran n'offre **aucun geste** et perd sa phrase-thèse | réf : boîtier CTA délimité par 2 filets laiton continus à **y=1902-1904** et **y=1993-1995** (run 980 px), capitale du CTA **6,39 CSS**, note à y=2019-2041. Capture : **0** filet laiton continu dans tout le contenu (run max chaud = **545 px**, et c'est du texte) ; rien entre le bas du panneau explicatif (y=2116) et le dock | **non** | arbitrage / lot (maquette #130 déclare le maillon **L3**) | si la route du geste existe côté back |
| **M1** | MAJEUR | NOUVEAU | **Le cerne laiton est absent** — le filet d'imprimerie qui encadre toute la page, trait d'identité n°1 | réf : **6 colonnes chaudes** (x=21,22,23 et 1056,1057,1058), chacune **1612-1617 px** de haut, + 2 filets horizontaux (y=452-454, y=2076-2078) ⇒ rectangle de **452,0 CSS** de haut (contrôle : `.jrn6` 462 − 2×5 d'inset = **452** ✓). Capture : **0 colonne chaude** sur les 3 planches, détecteur **générique** (aucun hex supposé) | **non** | correcteur | — |
| **M2** | MAJEUR | NOUVEAU | **Aucun boîtier de la capture ne porte de bordure.** La maquette encadre chaque boîtier d'un trait `#2a3648` de 1 CSS. La capture passe du fond au remplissage en **une marche**, sans même une rangée d'anti-crénelage | 7 bords profilés (haut/bas de carte, haut de tuile, haut d'enseigne, haut du panneau explicatif, gauche et droite de carte) : **0 rangée/colonne étrangère** sur les 7. Témoin réf : **3 rangées** `(42,54,72)` en haut de brève, **3 colonnes** à gauche. Transition capture : `(13,13,13)` → `(22,22,28)`, net | **non** | correcteur | cause commune probable avec M1/M3 : rien n'est **tracé**, tout est **rempli** |
| **M3** | MAJEUR | NOUVEAU | **Les deux filets laiton de la manchette sont absents** : le filet de 2 CSS sous « Le journal / CE QUI SE DIT CE MATIN », et celui de 1 CSS sous le nom du journal dans la une | réf : y=**640-646** (7 px = 1,94 CSS, run 976 px) et y=**926-928** (3 px = 0,83 CSS, run 846 px). Capture : aucun run chaud > 545 px, et les 545 px sont une ligne de **texte** (contrôle : réf y=1236, ligne de texte, run = **17 px**) | **non** | correcteur | — (même cause que M2) |
| **M4** | MAJEUR | NOUVEAU | **Le puits de liste est absent.** La maquette pose un caisson encadré, plus sombre que la page, qui contient les items et conserve son vide en bas ; la capture pose les cartes à même la page | réf `.elast` : bordures froides à y=**825-827** et y=**1867-1869** (run 986 px), intérieur `(13,15,16)` **plus sombre** que la page `(23,28,36)`, hauteur **290 CSS**, dont **88 CSS de vide** conservé sous la dernière brève. Capture : entre deux cartes, la couleur est celle de la page — `(13,13,13)` — sd **0,00**, **1 teinte** | **non** | correcteur | — |
| **M5** | MAJEUR | NOUVEAU | **Mauvais jeton d'or**, sur les 3 planches : `accentGold` là où l'art veut `hudMoneyGold`. Sens : **plus jaune** (saturation), pas plus gris | réf **(242, 201, 107)** = `#f2c96b` ; capture **(255, 210, 64)** = `#ffd23f`. Écart par canal **(+13, +9, −43)** — le bleu chute de **43/255**, soit **7× la tolérance d'aplat** (6/255). Identique sur les 3 planches | **non** | correcteur | — |
| **M6** | MAJEUR | NOUVEAU | **Le fond de page est un aplat neutre** là où la maquette pose trois couches : dégradé vertical navy + halo radial or en haut + halo radial teal en bas | réf, dans les gouttières : `(23,28,36)` L=27,5 B−R=**+13** → `(13,15,16)` L=14,6 → `(20,28,29)` L=26,4 B−R=**+9**. Capture : **`(13,13,13)` à toutes les hauteurs**, B−R=**0**, sd=**0,00**, **1 teinte**. Globalement B−R moyen **+7,09 → +1,16** (−84 %) ; les 2 teintes dominantes de la capture couvrent **94,4 %** de l'aire, toutes deux B−R=0 | **non** | correcteur | — (cause commune avec M11) |
| **M7** | MAJEUR | NOUVEAU | **La ligne de source ne recule plus.** La maquette met la clé/le lieu en gris effacé sous le titre ; la capture la met dans le même crème chaud que tout le reste, si bien qu'elle **concurrence** le titre | réf `.cle` **(107,115,125)** `#6b737d`, L=**114,0** ; capture `district-N · fresh` **(185,173,146)** `#b9ad92`, L=**173,6** ⇒ **ΔL = +59,6**. Même jeton employé aussi pour le libellé de compteur : réf **(138,151,156)** `#8a979c` → capture **(185,173,146)**, écart **(+47, +22, −10)** | **non** | correcteur | — |
| **M8** | MAJEUR | NOUVEAU | **Les trois tuiles de compteur sont inégales** : elles se dimensionnent sur leur libellé au lieu d'être des tiers égaux | réf (mesure sur la bordure haute) : **86,67 / 86,67 / 86,67 CSS** — dispersion **0,00 CSS**. Capture : **80,83 / 97,50 / 84,44 CSS** — dispersion **16,67 CSS = +20,6 %**. Les gouttières, elles, sont justes (5,83 contre 6,11 CSS) | **non** | correcteur | — |
| **M9** | MAJEUR | NOUVEAU | **Les tuiles de compteur sont 39 % trop hautes** | réf `.fen` y=679..793 = 114 px = **31,67 CSS** (contrôle : la CSS source somme 4+14+3+6+3+2 = **32**). Capture y=483..642 = 159 px = **44,17 CSS**. Δ **+12,50 CSS = +39,5 %** | **non** | correcteur | — |
| **M10** | MAJEUR | NOUVEAU | **Le mobilier de la brève est absent** : la puce ronde, l'horodatage aligné à droite (« CE MATIN » / « HIER ») et l'étiquette d'angle encadrée (« FAIT DIVERS ») de la une | réf : puce `.pt` 5 CSS ; horodatage `.qd` à droite, or `#f2c96b` ou `#b9ad92` selon la fraîcheur ; chip `.angle` = bande d'encre y=1121-1135 (**4,17 CSS**) dans un cadre `#2a3648`. Capture : **aucun** des trois — la fraîcheur passe dans la ligne de source sous forme du mot `fresh` (voir M12) | **non** | correcteur | — |
| **M11** | MAJEUR | NOUVEAU | **Aucun décor** dans la bande entre le bandeau et le panneau, là où la maquette laisse voir la ville | réf x60..420 : **159 teintes**, sd 3,95 ; x660..1020 : **190 teintes**, sd 3,38. Capture (mêmes fenêtres) : **1 teinte**, sd **0,00** des deux côtés. Contrôle négatif (vraie gouttière d'aplat) : 1 teinte, sd 0,00 — l'instrument discrimine | **non** | correcteur / shell | à qui appartient cette bande (fond d'écran ou fond de shell) : je ne peux pas le dire depuis l'image |
| **M12** | MAJEUR | NOUVEAU | **Un mot anglais et un identifiant technique atteignent l'écran** sur la 3ᵉ ligne de chaque carte : `district-13 · fresh`. La maquette y met le **nom** du quartier (`Dépôt-Est`, `La Lisière`, `Les Entrepôts`, `Marne-Basse`). La doctrine du dossier est explicite : aucun enum brut, aucun repli anglais | 4 cartes sur 5 portent la ligne, **4/4 en `district-N · fresh`** ; 0 nom de quartier sur les 3 planches. Le mot `fresh` est le **descripteur de fraîcheur**, qui dans la maquette est porté par l'horodatage français « CE MATIN » / « HIER » (voir M10) | **oui** en partie (le nom du quartier vient du back) ; **non** pour `fresh` | back + correcteur | — |
| **m1** | MINEUR | NOUVEAU | **Les hauteurs de capitale sont systématiquement supérieures**, toujours dans le même sens, sur quatre corps indépendants ⇒ une cause, pas quatre erreurs | capitale du titre **45 → 50 px** (+11,1 %) · sous-titre CAPS **20 → 23 px** (+15,0 %) · libellé de compteur **14 → 17 px** (+21,4 %) · chiffre de compteur **39 → 41 px** (+5,1 %). Le surplus **relatif croît quand le corps diminue** — signature d'un plancher de taille, pas d'une échelle uniforme | **non** | correcteur | quel mécanisme exactement : une image ne le dit pas |
| **m2** | MINEUR | NOUVEAU | La plaque d'enseigne est plus haute que la maquette | réf y=481..647 = **46,1 CSS** (contrôle CSS : 7+17+5+6,4+8+3 ≈ 46,4) ; capture y=267..451 = **51,1 CSS**. Δ **+5,0 CSS = +10,8 %** | **non** | correcteur | — (conséquence probable de m1) |
| **m3** | MINEUR | NOUVEAU | La gouttière entre items est trop large | réf `.brv` : 12 px = **3,33 CSS** (mesuré 3×, identique). Capture : 18 px = **5,00 CSS**, identique sur les 4 intervalles. Δ **+1,67 CSS = +50 %** | **non** | correcteur | — |
| **m4** | MINEUR | NOUVEAU | **EN TROP** — un panneau explicatif « CE QUE LE SERVEUR ENVOIE VRAIMENT / *Aucune de ces brèves n'a de texte* / … » occupe la place du pied. Il n'est pas dans le cadre nominal #125 ; c'est la forme `.pann` des cadres #126–#130 | capture y=1784..2116 = **92,2 CSS** ; 3 bandes de texte (sur-titre 6,67 CSS, titre 10,56 CSS, corps 3 lignes). Son titre est en **or** `(255,210,64)` là où `.pann b` de la maquette est en crème `#eae0c8` ; son sur-titre, lui, est bien gris-chaud `(185,173,146)` — les deux **diffèrent**, le contrôle discrimine (`20_verifs_finales.py`) | **non** | arbitrage | — |

**Note commune M1 · M2 · M3 · M4** : une seule cause désignée par la mesure — dans la capture, **rien
n'est tracé, tout est rempli**. Aucune bordure sur 7 bords, aucun filet continu, aucun cerne, aucun
caisson. Ce n'est pas quatre réglages, c'est l'absence d'un mécanisme de trait.
**Note commune M6 · M11** : le fond de l'écran est un **aplat unique** (1 teinte, sd 0,00) là où la
maquette superpose un dégradé, deux halos radiaux et un décor.
**Note commune m1 · m2 · M9** : les trois vont dans le même sens (tout est plus haut) et le surplus
relatif croît quand le corps diminue.

**Salut explicite sur `m4`** : ce panneau dit la vérité au joueur là où l'écran ne peut pas la lui
montrer. Il ne doit **pas** disparaître au prochain tour ; il doit porter son **commentaire de
péremption** (« à retirer le jour où `news_beat.*.headline` rend du texte »). Le supprimer sans
livrer les textes remplacerait un trou visible par un trou muet.

**Compte : 4 BLOQUANT · 12 MAJEUR · 4 MINEUR = 20 findings.**

---

## Table à part — ASSUMÉ (non compté)

| id | ce qu'on voit | pourquoi c'est assumé | rendu proprement ? | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|---|
| `S1` | Aile droite du bandeau : « JOUR 50 » puis « **—** » à la place de la phase | Doctrine du dossier (mesure f2 du 2026-09-06) : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district ; ARGENT et JOUR **sont** alimentés | **Oui** — un tiret centré, aligné sur la ligne de valeur ; pas de « Unknown », pas de boîte vide, pas de libellé de repli | un tiret sur **ARGENT** ou **JOUR** aussi ; ou « Unknown » dans le médaillon |
| `S2` | Bandeau et dock du client ≠ barre et dock dessinés par le cadre de série 6 | Échelles différentes et assumées par `dossier.md` : chrome à ×2,755 (392 CSS), contenu à ×3,6 (300 CSS) ; le cadre de série 6 dessine une **évocation** du chrome | **Oui** — bandeau 143 px conforme à la dérivation, médaillon, losange, dock complets | une différence dans la zone de **contenu**, entre bandeau et dock |
| `S3` | Planches « écran seul » : ni bandeau, ni dock, et 284 px noirs sous le contenu | Suite **hors shell** (`JournalScreenPlayModeTests`) : ces 284 px sont la réserve du dock, pas un trou. Ces planches **ne peuvent pas** montrer un défaut de chrome ni de placement face au dock | **Oui** — le contenu occupe la même bande qu'en planche sous chrome (repères identiques au pixel : 267/451/483/642/675/888/906/1121) | du contenu qui déborderait dans cette réserve sur la planche **sous chrome** |

---

## Table à part — ARBITRAGE (non compté)

| id | objet | mesure | destinataire |
|---|---|---|---|
| `A1` | **Trait de balayage teal figé sur la RÉFÉRENCE.** `.elast::after` porte `animation: jrn6-scan 7,5s linear infinite; animation-delay: −2,6s` — dispositif de capture voulu, **pas** un artefact ni un écart d'animation. Ce qui est à signaler, c'est **où il tombe** : il **traverse du texte** | Bande continue de **798-799 px teal** sur **y = 1068..1075** (8 px), couleur `(49,79,89)` ; toutes les autres rangées teal du puits en comptent ≤ 92 (anti-crénelage de texte). Position : **243-250 px sous le haut du puits = 67,5-69,4 CSS** (conforme au ~62 CSS déclaré, plus la bordure et le retrait du puits). Il coupe la **4ᵉ rangée d'encre du bloc héros**, la ligne de source `news.beat.body_found · Dépôt-Est` (bande 1066-1086), qui porte **505 px d'encre claire** sur la rangée y=1072 | **blender** — « état antérieur au correctif z-index (déclaré, rendus non refaits) ». **Pas un écart d'écran.** |
| `A2` | Ronds du dock **vides** (aucune icône) là où le canon HUD pose une icône 20×20 | 4 ronds, 0 icône, sur la planche sous chrome | arbitrage user connu (« j'aime pas les icônes ») |
| `A3` | Aucune flèche retour dans le bandeau | absente sur la planche sous chrome | arbitrage user connu |
| `A4` | **La maquette est en retard sur la langue et le format.** Référence : `$ 24 850`, `HEAT`. Client : `9 627 820,00 €`, `CHALEUR` | 2 libellés | **blender** — maquette à mettre à jour ; le client a raison (ruling « fr réel »). Noté **une fois**, jamais comme écart d'écran |
| `A5` | **Aucun arbitrage de police n'est disponible pour le CONTENU de cet écran** — et c'est une correction du dossier | Le bloc `.jrn6` de `ecrans-brennar-6.html` (l. 6021-6116) ne cite que **`'DejaVu Sans'` (19 règles)** et **`'DejaVu Serif'` (7 règles)** ; **zéro `Georgia`**. `fc-match` sur cette machine : `DejaVu Serif → DejaVuSerif.ttf`, `DejaVu Sans → DejaVuSans.ttf` — **pas de substitution**. Le client embarque DejaVu Sans / DejaVu Serif ⇒ **référence et capture ont rendu les MÊMES familles**. L'arbitrage `Georgia → Noto Serif` du dossier ne vaut que pour le **CHROME** (`hud-brennar.html`) | pour information — **conséquence : `m1` (hauteurs de capitale) n'a aucune excuse typographique et reste un écart d'écran** |

---

## 5. Autres résolutions

**1080×2400, planche « écran seul » (`fd0e21e`)** — tient. Repères verticaux **identiques au pixel**
à la planche sous chrome (enseigne 267-451, compteurs 483-642, cartes 675-888 / 906-1121 /
1139-1353 / 1371-1585 / 1603-1752, panneau 1784-2116) ; largeur de bloc **274,44 CSS** ; **même
jeton d'or** `(255,210,64)`. Confirme que **tous les écarts ci-dessus sont de FORME et non de
données** : ils survivent au changement de campagne et de contenu. Écart propre : aucun. Sa dernière
carte est coupée un peu moins bas (marge 4 px sous l'encre, 0 px sur les 3 dernières rangées) mais
lui manque aussi entièrement sa ligne `district-N · fresh` — **même défaut B2**, sur une frontière de
ligne plutôt qu'au milieu d'un glyphe.

**1080×1920, planche « écran seul » (`fd0e21e`)** — **ne tient pas** : c'est ici que `B2` est le plus
grave. La liste n'affiche que **3 cartes** et la troisième est tranchée à y=1272, **au milieu de la
hauteur des lettres** de `y.headline` (crop `mesures/crop_1920_carte3_coupee.png` : les moitiés
hautes des lettres sont visibles, les moitiés basses sont absentes ; **294 px d'encre** sur les 3
dernières rangées du cadre). Rien d'autre n'est coupé ni hors cadre : largeur de bloc **274,44 CSS**,
mêmes repères hauts, panneau explicatif entier (1304-1636), reflux correct — le panneau et la liste
se déplacent ensemble du delta exact (480 px), donc **l'ordre de lecture est conservé**. Le vide de
284 px sous le panneau est la réserve du dock (`S3`), pas un écart.

**Aucune troisième résolution** n'est fournie, et **aucune planche sous chrome à 1920** : je ne peux
donc pas dire si, sous le chrome à 1920, la coupe tombe au même endroit.

---

## 6. Non vérifié

1. **Toutes les VALEURS de la planche principale.** `31d8e43` a une identité **MUETTE** : aucune
   déclaration, aucune empreinte dans le corps de commit, aucune ligne
   `[DemoIdentityResolver] régime=… identité=…` jointe. ⇒ ARGENT `9 627 820,00 €`, `JOUR 50`,
   compteurs `20 / 13 / 02`, noms de journaux et numéros de district **ne sont comparables à rien**.
   Seule la FORME a été jugée. *Ce qui trancherait* : la ligne d'identité du journal du run, ou son
   sidecar, jointe au dossier.
2. **Animation.** Aucune paire T / T+1 s n'est fournie (ligne GO : (b) NON). Je ne peux pas dire si
   quoi que ce soit bouge à l'écran. *Ce qui trancherait* : deux captures du même état à 1 s
   d'écart, comptage des pixels différents hors chrome.
3. **Les cadres d'ÉTAT #126–#130 ne sont pas rendus.** Je les ai lus en SOURCE seulement. Mon
   témoin est #125 (justifié en tête). *Ce qui trancherait* : rendre #129 (« Rien ce matin ») et
   #130, pour juger l'état vide et la fiche de dette.
4. **L'état VIDE de l'écran n'est pas capturé.** La maquette d'atelier `etats/vide-maquette-journal.png`
   (1024×1024, navy + laiton + crème) est une illustration d'ambiance **non montée** : elle m'a servi
   à confirmer la direction de palette voulue (navy + laiton — celle que `M5`/`M6` mesurent perdue),
   pas à retrouver une image. Je ne peux pas dire ce que l'écran affiche quand la liste est vide, ni
   si ce vide se lit « ça plafonne et ça bloque, rien n'est perdu ». *Ce qui trancherait* : une
   capture sur un compte sans brève du matin.
5. **Onglet actif non asserté** (ligne GO : (c) NON déclaré ; surimpression). Le dock montre PLUS
   souligné, ce qui est cohérent avec le chemin Plus → LE JOURNAL, mais aucune assertion de test ne
   le garantit. *Ce qui trancherait* : une assertion d'onglet actif dans la suite de capture.
6. **Aucun rect imprimé au run** (ligne GO : (g) NON imprimé). J'ai vérifié la géométrie **dérivée**
   sur l'image : largeur 1080 sur les 4 fichiers, bandeau 143 px conforme à 52 CSS-HUD × 2,755,
   largeur de contenu 274 CSS conforme à 300 − 2×13. Je n'ai **pas** pu vérifier le `scaleFactor`.
7. **Les compteurs annoncent 20 + 13 + 02 = 35 items ; la liste en montre 5.** Je ne peux pas dire
   si c'est une troncature par conception, une pagination, ou le clipping mesuré en `B2`. Je ne le
   compte **pas** comme écart : la maquette a le même genre d'écart (01 + 04 = 5 annoncés, 4 items
   dessinés). *Ce qui trancherait* : un rapport `juge-donnees` sur cet écran — il n'en existe aucun
   (écran neuf).
8. **Provenance des textes affichés.** Aucun corps réel comparable n'est fourni (ceux de
   `corps-reels/` datent du 04/09 sur `operational_demo`). Je ne peux pas dire si
   `news_beat.hindsight.op_ed.free_weekly.headline` est une famille de brève supplémentaire ou un
   repli. *Ce qui trancherait* : le corps réel de la route consommée.
9. **Espace de mélange sRGB ↔ linéaire : non testable ici.** La capture ne contient **aucune**
   translucidité — tous les remplissages sont des aplats opaques (sd 0,00, 1 teinte). Je ne peux donc
   ni confirmer ni infirmer l'erreur de modèle sur cet écran. *Ce qui trancherait* : un élément
   translucide rendu des deux côtés sur le même fond.
10. **Barre de progression sous ARGENT.** Le canon HUD montre deux segments (or puis gris) ; la
    capture semble n'en montrer qu'un (or). **Vu à l'œil, non mesuré**, et cela appartient au shell,
    pas à cet écran. *Ce qui trancherait* : une mesure de la longueur des deux segments sur le canon
    et sur la capture, ramenée à leur échelle respective.
11. **Rayons d'arrondi.** Je n'ai pas mesuré de rayon sub-pixel ; maquette et capture paraissent
    toutes deux à angles vifs (seul `.cerne`, absent en jeu, porte un rayon de 3 CSS).
12. **Défilement.** Une image fixe ne peut pas montrer qu'une liste défile. Si la liste de `B2`
    défile, la coupe reste un défaut (aucune ellipse, aucun dégradé, aucun indice), mais sa gravité
    changerait. *Ce qui trancherait* : une capture après un geste de défilement.

---

## Annexes

### Annexe 1 — Inventaire de la RÉFÉRENCE (fiches + couche globale)

Repère : `.jrn6` occupe **y 434 → 2097**, soit **462,0 CSS** de haut (contrôle : la source écrit
`style="height:462px"`). Bloc de contenu : **x 47 → 1032**, **273,9 CSS** de large (contrôle :
300 − 2×13 = **274**).

| id | catégorie | parent | bbox (px) | hauteur (CSS) | forme / remplissage / bord | texte (hauteur de capitale) |
|---|---|---|---|---|---|---|
| `R.cerne` | cadre | `.jrn6` | (21, 452, 1058, 2078) | 452,0 | rect r=3 CSS, **6 colonnes + 2 filets laiton** `#b08d3e`, 1 CSS, halo 12 px | — |
| `R.enseigne` | plaque | `.jrn6` | (47, 481, 1032, 647) | 46,1 | fond navy dégradé, bord `#2a3648`, **bord bas laiton 2 CSS** (y 640-646, run 976) | « Le journal » **12,50 CSS**, or `(242,201,107)` · « CE QUI SE DIT CE MATIN » **5,56 CSS**, `(185,173,146)` |
| `R.fen×3` | tuile | `.compteurs` | (50-361 / 384-695 / 718-1029, 679, ·, 793) | 31,7 | 3 tuiles **strictement égales** (86,67 CSS), gouttières 6,11 CSS, fond `#0a0e16`, bord `#2a3648`, halo teal interne | chiffres **10,83 CSS** teal `(127,212,217)` · libellés **3,89 CSS** `(138,151,156)` |
| `R.elast` | puits | `.jrn6` | (47, 825, 1032, 1869) | 290,0 | caisson bordé `#2a3648`, intérieur `(13,15,16)` **plus sombre que la page**, ombre interne ; **88 CSS de vide conservé** sous le dernier item | — |
| `R.une` | carte héros | `.elast` | x 82..1009 (largeur **928 px = 257,8 CSS**, comptée ; les bornes min/max brutes sont polluées par le cadre du téléphone), y 855..1188 | **92,5** | fond `#111823`, bord `#2a3648` | manchette **5,56 CSS** or + **filet laiton** (y 926-928) · titre sérif 2 lignes **8,89 CSS** `(234,224,200)` · source **(107,115,125)** L=114 · chip encadré **4,17 CSS** |
| `R.brv×3` | rangée | `.elast` | x 82..1009 (**928 px = 257,8 CSS**), y 1203..1310 / 1322..1429 / 1441..1549 | **30,0** ×3 | fond `#111823`, bord `#2a3648`, gouttière **3,33 CSS** | puce 5 CSS · titre **5,83 CSS** · source `(107,115,125)` · **horodatage à droite** |
| `R.pied` | pied | `.jrn6` | (47, 1902, 1032, 2041) | 38,6 | **CTA encadré laiton** (2 filets, y 1902-1904 et 1993-1995, run 980) | CTA **6,39 CSS** or · note **6,39 CSS** avec segments or |
| `R.decor` | décor | `.tel` | bande mesurée x 60..420 et x 660..1020, y **210..420** | — | art de ville à brightness .24 : **159** et **190 teintes**, sd 3,95 et 3,38. La structure monte de 5 teintes/rangée vers y≈176 à 20-26 vers y≈188-244 : **je n'ai pas mesuré de bas de barre net**, la transition est graduelle | — |

**Couche globale (référence, zone `.jrn6`)** : luminance moyenne **30,09** · densité d'encre (L>45)
**9,43 %** · couleur moyenne `(26,30,33)`, **B − R = +7,09** · palette dominante `(16,16,32)` 34,2 % ·
`(0,16,16)` 15,9 % · `(0,0,16)` 14,0 % · `(0,0,0)` 11,9 % · `(16,16,16)` 11,0 % · `(32,48,64)` 2,8 %
— **les cinq premières ont B − R ≥ 0, dont trois à +16 et une à +32**. Contrastes : 4,58:1 à 13,57:1,
tous au-dessus du seuil.

### Annexe 2 — Inventaire de la CAPTURE (fiches + couche globale)

| id | catégorie | bbox (px) | hauteur (CSS) | forme / remplissage / bord | texte | statut |
|---|---|---|---|---|---|---|
| `C.enseigne` | plaque | (46, 267, 1033, 451) | **51,1** | aplat `(22,22,28)`, **aucun bord**, **aucun filet laiton** | « Le journal » **13,89 CSS** or `(255,210,64)` · sous-titre **6,39 CSS** `(185,173,146)` | ÉCART (m2, M3, M5, M2) |
| `C.tuile×3` | tuile | (46-336 / 358-708 / 730-1033, 483, ·, 642) | **44,2** | aplats `(22,22,28)`, **aucun bord**, largeurs **80,83 / 97,50 / 84,44 CSS** | chiffres **11,39 CSS** teal `(127,212,217)` ✓ · libellés **4,72 CSS** `(185,173,146)` | ÉCART (M8, M9, M2, M7) |
| `C.carte×4` | carte | (46, 674/906/1139/1371, 1033, 888/1121/1353/1585) | **59,4** ×4 | aplats `(22,22,28)`, **aucun bord**, gouttières **5,00 CSS** | ligne 1 : **clé d'outlet** or **5,56 CSS** · ligne 2-3 : **clé de headline** sérif **10,83 CSS** `(234,224,200)` ✓ · ligne 4 : `district-N · fresh` **5,28 CSS** `(185,173,146)` | ÉCART (B1, B3, M2, M7, M10, M12, m3) |
| `C.carte5` | carte | (46, 1603, 1033, 1752) | **41,4** | idem, mais **tronquée de 65 px** ; ligne 4 absente ; encre au ras du bord | idem | ÉCART (B2) |
| `C.pann` | panneau | (46, 1784, 1033, 2116) | 92,2 | aplat `(22,22,28)`, aucun bord | sur-titre **6,67 CSS** · titre **10,56 CSS** **or** (la maquette met crème) · corps 3 lignes | **EN TROP** (m4) |
| — | puits de liste | — | — | **ABSENT** | — | ÉCART (M4) |
| — | cerne | — | — | **ABSENT** (0 colonne chaude) | — | ÉCART (M1) |
| — | pied / CTA | — | — | **ABSENT** | — | ÉCART (B4) |
| — | décor | — | — | **ABSENT** (1 teinte, sd 0,00) | — | ÉCART (M11) |
| `C.chrome` | bandeau | (0, 0, 1080, 143) | — | filet **braise** y 138-142 ; médaillon « Brûlant / CHALEUR » à boîtier braise ; losange sous le médaillon | ARGENT `9 627 820,00 €` · `JOUR 50` · phase « — » | conforme au témoin `.chaud` ; S1, S2, A2, A3, A4 |
| `C.dock` | dock | (0, ~2160, 1080, 2400) | — | 4 ronds **vides**, PLUS souligné en or | EMPIRE · FAMILLE · FILIÈRE · PLUS | A2 |

**Couche globale (capture sous chrome, zone de contenu)** : luminance moyenne **28,89** · densité
d'encre **5,34 %** · couleur moyenne `(29,28,30)`, **B − R = +1,16** · palette dominante
`(16,16,16)` **73,5 %** · `(0,0,0)` **20,9 %** · `(224,224,192)` 1,5 % · `(176,160,144)` 0,8 % ·
`(240,208,64)` 0,7 % — **les deux premières font 94,4 % de l'aire et ont toutes deux B − R = 0**.
Contrastes : 8,11:1 à 13,72:1, tous au-dessus du seuil.

### Annexe 3 — Correspondance des repères

- **Échelle du contenu : 1,00** (référence ×3,6 et capture ×3,6 ; imposée par `dossier.md`, non
  déduite). Toute grandeur du corps du rapport est donnée en px **et** en CSS = px ÷ 3,6.
- **Contrôle de l'échelle sur la référence, par une valeur ÉCRITE dans la source** : le cerne mesure
  y 452 → 2078, soit **1627 px = 451,9 CSS**, quand la source impose `.jrn6{height:462px}` avec
  `.cerne{inset:5px}` ⇒ 462 − 10 = **452**. Écart **0,1 CSS**.
- **Offset vertical** : les inventaires ne se comparent **jamais** en y absolu. Ancrage : bas du
  bandeau ↔ haut du bloc de contenu. Référence `.jrn6` haut = 434 ; capture enseigne haut = 267
  (bandeau à 143). Toutes les hauteurs de partie sont comparées **entre elles**, en CSS.
- **Offset horizontal** : référence x 47..1032, capture x 46..1033 ⇒ décalage ≤ 1 px, largeur
  **273,9 vs 274,4 CSS**. C'est le repère qui autorise les comparaisons de largeur (`M8`).
- **Chrome** : jamais comparé au cadre de série 6 (échelle ×2,755, cf. `S2`) ; comparé au canon
  `hud-canon-1176.png`, et pour l'état chaud au témoin CSS `.tel.chaud` (cf. contrôle positif n°14).

### Annexe 4 — Scripts

Tous dans `mesures/`, PIL uniquement, chacun **imprime la taille des images qu'il ouvre**. Sorties
complètes collées dans **`mesures/SORTIES.txt`** (753 lignes).

| script | grandeur | contrôles |
|---|---|---|
| `01_reperes.py` | frontières verticales par profil de luminance médiane | + largeur = 1080 sur 4 fichiers ; − frontières différentes entre 2102 et 2400 |
| `02_coupe.py` | encre par rangée dans chaque carte, marge sous la dernière encre | + cartes 1-4 : 29-30 px de marge, 0 px sur 3 dernières rangées ; − dernière carte |
| `03_or.py` | *(réfuté)* laiton par hex `#f2c96b` | **+ ÉCHEC** — motif lié à un hex ; remplacé par `05` |
| `04_echantillon.py` | couleur réelle de l'encre et du fond (médianes) | − bande de fond nu : encre = fond |
| `05_filets.py` | filets/colonnes **chauds génériques** (R−B>20, L>45) | + réf : 13 filets, 6 colonnes |
| `06_traits_continus.py` | plus long run contigu (filet vs texte) | + réf y=641 run 976 ; − réf y=1236 (texte) run 17 ; + froid y=1185 run 916 |
| `07_bords.py` | existence d'un bord **sans supposer de couleur** | + réf 3 rangées / 3 colonnes étrangères ; − plein aplat 0 |
| `08_structure.py` | étendues des traits, boîtes en CSS | + cerne = 452 CSS (valeur écrite dans la source) |
| `09_palette.py` | palette quantifiée, luminance, densité, B−R | + somme des parts ≤ 100 % |
| `10_typo.py` / `11_typo2.py` | hauteurs de capitale, bandes de ligne | + sous-titre réf 20 px ≈ 6,4 CSS × 3,6 ; − bande vide → aucune encre |
| `12_contraste.py` | contraste WCAG, 14 textes | + blanc/noir = 21,00 ; − couleur sur elle-même = 1,00 |
| `13_crops.py` | découpes d'inspection (8 PNG) | imprime taille et boîte |
| `14_decor.py` | *(réfuté)* structure du décor | **− ÉCHEC** (bande contenant du texte) ; refait en `15` |
| `15_fond.py` | décor et dégradé de fond, bandes vérifiées vides | + réf 159-190 teintes ; − aplat 1 teinte, sd 0,00 |
| `16_balayage.py` | position du trait de balayage teal figé (A1) | + chiffres teal 7754 px ; − titre or 0 px |
| `17_compteurs.py` | tuiles et gouttières de la capture | + étendue = 274,44 CSS ; − rangée de gouttière → 0 tuile |
| `18_tuiles_ref.py` | tuiles de la référence, mesurées sur la **bordure** | + 3 segments ; − rangée hors bordure → 0 segment |
| `19_verif_croisee.py` | stabilité de la forme entre les 3 planches | + largeur 274,44 CSS sur les 3 ; même jeton d'or sur les 3 |
| `20_verifs_finales.py` | bornes des cartes, structure du décor par rangée, couleurs du panneau explicatif | + sur-titre et titre du panneau **diffèrent** (gris-chaud vs or) |

Découpes d'inspection : `crop_1920_carte3_coupee.png` (la coupe au milieu des lettres),
`crop_2400_carte5_coupee.png`, `crop_2400_chrome_haut.png`, `crop_2400_dock.png`,
`crop_ref_hero_une.png`, `crop_ref_pied_cta.png`, `crop_canon_chrome_haut.png`, `crop_canon_dock.png`.
