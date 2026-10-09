# Juge visuel ⊥ — JUGE D'ENSEMBLE du décor (A01 + E01-E11) — r1 — 2026-10-08

## Verdict : NON APPROUVÉ

Le chrome, l'or, la grille et la typographie des douze écrans sont **un seul jeu** et tiennent à la
mesure ; ce qui ne tient pas, c'est **le corps des écrans** : quatre d'entre eux posent une matière
de fond pleine page qu'aucune maquette ne montre, trois laissent leur bandeau de titre vide, un
texte joueur est coupé en plein milieu de phrase, et l'élément héros de ⑭ a disparu.

**Compte pris dans la table du § 3**, recompté par script sur le fichier :
**4 BLOQUANT · 10 MAJEUR · 10 MINEUR** = **24 lignes**, dont **4 de classe `ENSEMBLE`** et **4
marquées « classe C »** (consignées, pas à traiter — ruling 07/10). Les deux résolutions sont jugées.

```
$ python3 - <<'EOF'   # recompte sur rapport.md lui-meme
  lignes de finding : 24
    BLOQUANT: 4
    MAJEUR: 10
    MINEUR: 10
    ecran=ENSEMBLE : 4
    classe C       : 4
    ids: F1 ... F24    doublons: []
```

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette liste, un instrument qui rendrait tout faux passerait pour sévère. Toutes ces grandeurs
sont produites par les scripts de `mesures/`.

| # | grandeur | maquette | jeu | écart |
|---|---|---|---|---|
| 1 | jeton OR d'un filet (médiane 7×7) | `(176, 141, 62)` | `(176, 141, 61)` | **1/255** |
| 2 | manomètre, diamètre de l'anneau (deux arcs) | 176 px (cadre 5, le seul cadre qui porte le shell) | 184 px | +8 px = 2,2 px CSS ; centre x = 539,5 des deux côtés |
| 3 | « ARGENT », hauteur de capitale | — | **19 px sur les 13 planches 2400** | 0 |
| 4 | dock, bbox des pastilles | — | `(0, 2100, 1078, 2338)` sur 10 des 12 planches 2400 | 0 |
| 5 | « LES EXTRAS — PAYÉS EN MARKS » (E07, même chaîne) | 637 px, gap 8 px, hcap 25 | 639 px, gap 8 px, hcap 26 | +2 px (0,3 %) |
| 6 | « LA VITRINE » (E07, même chaîne) | 343 px, gap 10 px, hcap 29 | 345 px, gap 10 px, hcap 30 | +2 px (0,6 %) |
| 7 | « À QUOI ÇA SERT » (E03, même chaîne) | 233 px, hcap 18 ; « À » = 17 px | 229 px, hcap 19 ; « À » = 17 px | −4 px (1,7 %) |
| 8 | or des six CTA allumés | — | `(217,171,77)` ×3 (E03, E05, E06), `(242,201,106)` (E10), `(186,146,65)` (E04) | une seule famille |
| 9 | teinte du kraft d'E04 (médiane au centre, y=1000) | `(129, 97, 59)` | `(138, 105, 65)` | Δ(9, 8, 6) |
| 10 | E05, les trois cartes d'avocat | vert / neutre / or + pastilles EN PLACE / DISPONIBLE / À VOS RISQUES + note à filet gauche (cadre 68) | mêmes trois cartes, même ordre, même note | structure identique |
| 11 | E01 et E10, charpente | cadre or extérieur + plaque de titre + 3 compteurs cyan (cadres 125 / 137) | idem | structure identique |
| 12 | décor, médiane de la bande y 250..420 | — | de `(4,7,15)` à `(8,14,25)` sur 9 planches sur 12 | un seul noir de scène |
| 13 | contraste « TENSION CALME · AUCUNE SEMAINE » (E08) | — | 6,56:1 | ≥ 4,5:1 |
| 14 | contraste de la ligne grise d'E10 | — | 5,05:1 | ≥ 4,5:1 |
| 15 | contraste du titre or « Le journal » (témoin haut) | — | **11,90:1** | l'instrument discrimine de 1,69 à 11,90 |

**Contrôles négatifs** (sans eux, rien ne prouve que les instruments mordent) : le détecteur de trous
rend **106 px (6,3 %)** sur une planche dense (E07) et **1 449 px (86,8 %)** sur E04 ; le masque
« feutrine » rend **0,0 %** sur onze planches et **35,8 %** sur E11 ; le masque « voile » rend
**≤ 4,6 %** sur onze planches et **54,4 %** sur E08.

---

## 0. Ce que les douze maquettes disent, prises ensemble

**But commun.** Chaque écran est **une décision du soir** : on y lit un état, on y lit ce qu'il
coûte, et on y pose **un geste principal**, nommé en toutes lettres en bas de l'écran.

**Ordre de lecture commun** (dans les douze maquettes) : ① le **chrome haut** — ARGENT à gauche,
manomètre de chaleur au centre, JOUR / moment à droite ; ② le **titre d'écran** et sa phrase
d'intention, alignés à gauche, juste sous le décor ; ③ la **pièce maîtresse** (plaque crème, tableau,
carte, jauge, liste) ; ④ la **voix d'un lieutenant** ou d'un tenancier, en italique ; ⑤ le **CTA or**,
pleine largeur, avec sa conséquence en petit à droite.

**Zones.** décor de scène (haut) · bandeau de titre · corps · bloc de voix · CTA · dock (bas).

**Traits d'identité** — ce qui fait reconnaître *ce* jeu et pas un autre :
1. un **noir de scène** très sombre et bleuté sur lequel l'art de ville respire ;
2. **l'or** `(176,141,61)` — filets, titres, CTA — seule couleur chaude du chrome ;
3. la **matière papier** (plaque crème, feuille de listing, carte) qui surgit *dans* le noir, toujours
   **rentrée** de ses bords, jamais à fond perdu ;
4. les **petites capitales espacées** pour tout ce qui est étiquette ;
5. un **rythme vertical** régulier : décor → titre → corps → voix → CTA.

C'est la grille de gravité : un écart qui casse l'un de ces cinq traits pèse plus qu'un écart dix
fois plus grand en pixels qui ne change rien à ce que l'œil lit.

---

## 4. Lecture globale — les douze écrans se lisent-ils comme un seul jeu ?

**Le chrome, oui, et sans réserve.** Manomètre, or, hauteur de capitale d'ARGENT, dock : identiques
d'un écran à l'autre à 1-8 px près, et conformes au seul cadre qui porte le shell (cadre 5). La
charpente partagée par E01 et E10 (cadre or, plaque de titre, trois compteurs cyan) est juste. Les
CTA allumés partagent un seul or. La typographie des capitales est, là où on peut comparer la même
chaîne, à 0,3-1,7 % près. **Rien de ce qui fait l'identité du chrome n'est cassé.**

**Le corps des écrans, non.** Quatre écrans sur douze posent une **matière de fond que leur maquette
ne montre pas**, et la posent **à fond perdu** : kraft sur ㉘ (57,4 % de l'image) et ⑮ (62,1 %), voile
gris-bleu à trame de points sur ⑭ (54,4 %), feutrine verte sur ⑤ (35,8 %) — contre ≤ 4,6 % sur les
huit autres. Le troisième trait d'identité (« la matière papier est rentrée de ses bords ») tombe
sur ces quatre-là : sur ㉘, la maquette rentre le kraft de 42 px à gauche et 43 px à droite ; le jeu
le met de 0 à 1 079.

**Et ces matières sont vides.** C'est là que l'ensemble se voit mieux qu'un écran seul : **les six
états vides de la série ne se ressemblent pas**. ㉚ et ㉛ laissent un bandeau de titre blanc de
365 px et 324 px ; ㉘ ne montre aucune des deux phrases de son erreur, juste un champ kraft de
86,8 % du corps ; ⑮ réduit sa feuille de listing de 74,6 % à 13,5 % et met du kraft à la place ; ㊵
garde son panneau à taille nominale (26,5 % de l'écran, 2,39 % d'encre) et le laisse **plus noir que
le fond qui l'entoure** ; ⑭ perd sa jauge. Aucun de ces vides ne se lit comme intentionnel : ils se
lisent comme non finis.

**L'ordre de lecture change sur trois écrans.** Sur ㉚, ㉛ et ㉘, l'œil ne rencontre plus le titre :
il tombe directement dans le corps, après un blanc. Sur ⑭, la jauge — le premier objet vu dans la
maquette — a disparu, et c'est un titre « LA SEMAINE » centré qui la remplace, alors que les onze
autres écrans alignent leur titre à gauche.

**Trois écarts de tête, par impact perçu** : ① la raison d'une carte de file **coupée en plein milieu
de phrase** sur l'écran d'ouverture ; ② l'état d'erreur de ㉘ **rendu comme un trou** de 86,8 % ;
③ la jauge de tension de ⑭ **absente** (or dans le corps : 5,4-5,9 % côté maquettes, 1,1 % en jeu).

---

## 3. Écarts — un finding par ligne, le compte se prend ici

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `A01` | `BLOQUANT` | `NOUVEAU` | La raison de la carte de file est **coupée en plein milieu de phrase**, sans guillemet fermant ni points de suite : « …je ne rallume pas le labo : il me faut » — puis plus rien. Une ligne entière de texte joueur manque. | Le journal déclare la raison **sur 3 lignes**. Bloc de citation mesuré : **65 px dans les DEUX variantes** (courte y 1896..1960, longue y 1879..1943) ⇒ 2 lignes rendues. Écart citation → « Plusieurs attendent encore » : **11 px** (courte) contre **45 px** (longue) ⇒ **+34 px de ligne réservée restent vides**. 82 px encore libres au bas du cadre : ce n'est pas un manque de place. Identique à 2400 et à 1920. `mesures/14` | — (une seule variable change entre les deux planches : la longueur de la raison) |
| `F2` | `E04` | `BLOQUANT` | `NOUVEAU` | L'état d'erreur **n'est pas décoré** : aucune des deux phrases de l'erreur n'est à l'écran. Le corps est un champ kraft vide. Titre d'écran, trois lignes d'info (LE CHEMIN / À TRAVERSER / CETTE ROUTE) et bloc Lt. Rin : tous absents. | Trou d'un seul tenant **y 430..1 878 = 1 449 px = 86,8 % du corps** à 2400 (969 px = **81,4 %** à 1920), encre < 1,5 % par ligne sur toute la bande. Kraft = **57,4 %** de l'image. `mesures/03`, `04`, `10` | Rien : l'écart assumé n° 1 du dossier porte sur le *fait* d'être en erreur ; la question posée est « rendu proprement ? » et la réponse est non |
| `F3` | `E08` | `BLOQUANT` | `NOUVEAU` | L'élément héros — **la jauge de TENSION** (arc or, aiguille, onglet « TENSION », légende « Calme — vos affaires respirent ») — est **absent**. L'écran ne se lit plus comme « la semaine / la tension ». | Part de px OR dans le corps : **5,41 %** (maquette d'état `v4-29` « au calme », ×3,0), **5,93 %** (cadre 25, ×3,6), contre **1,12 %** en jeu. Le même masque trouve 4,26 / 2,49 / 1,96 % dans le chrome des trois images : il mord des deux côtés. `mesures/13` | — |
| `F4` | `E11` | `BLOQUANT` | `NOUVEAU` | Le **geste « passer » a disparu** : le second bouton de la maquette, « LAISSER SUR LE ZINC — elle revient à la prochaine session, au même rang », n'existe pas. Le but de l'écran, tel que le dossier l'écrit, est « la trancher **ou la passer** » : seul « LES LIRE MAINTENANT » subsiste. | Absence, vérifiée aux deux résolutions sur toute la hauteur du corps | La carte est FABRIQUÉE (assumé n° 9). Je ne peux pas départager « le composant n'a plus ce bouton » de « cette donnée-là n'en propose pas » ; ce qui trancherait : une planche avec une carte servie |
| `F5` | **`ENSEMBLE`** (`E04`, `E08`, `E09`, `E11`) | `MAJEUR` | `NOUVEAU` | Quatre écrans posent une **matière de fond pleine largeur qu'aucune de leurs maquettes ne montre**, et la posent **à fond perdu** — kraft (㉘, ⑮), voile gris-bleu à trame de points (⑭), feutrine verte (⑤). La doctrine de gouttière (« le contenu reste dans le rect du fond ; seul le chrome traverse ») tombe sur ces quatre-là. | Part de l'image, 2400 : E04 kraft **57,4 %** · E09 kraft **62,1 %** · E08 voile **54,4 %** · E11 feutrine **35,8 %** — contre **≤ 4,6 %** sur les huit autres planches. Côté maquettes : E11 feutrine **0,0 %** ; E08 voile **1,2 %** (cadre 25) et **1,8 %** (v4-29) ; E09 kraft **1,3 %**. Gouttière, même ligne y=1000 : maquette E04 kraft de x=42 à x=1 036 (marges **42 / 43 px**), jeu de x=0 à x=1 079 (marges **0 / 0**). Tient à 1920 (E04 52,0 %, E09 57,7 %, E08 51,8 %, E11 28,9 %). `mesures/10`, `11` | — |
| `F6` | `E09` | `MAJEUR` | `NOUVEAU` | La **feuille de listing ne couvre plus le corps** : elle se réduit à son contenu et un champ kraft vide prend le reste. Et **le décor de scène disparaît** : ce qui suit le chrome n'est plus l'art de ville, c'est du kraft. | Feuille crème : **13,5 % de l'image, y 72..632** en jeu, contre **74,6 %, y 52..2 084** dans la maquette (cadre 31). Trou kraft d'un seul tenant **1 139 px = 68,2 % du corps** (668 px = 56,1 % à 1920). Première ligne de matière claire sous le chrome : **y=240 (10,0 % de la hauteur)** en jeu contre **y=401 (19,1 %)** dans la maquette — et sa couleur est le kraft `(125,95,50)`, pas la feuille. `mesures/04`, `10`, `16bis` | — |
| `F7` | `E09` | `MAJEUR` | `NOUVEAU` | **Quatre textes sous le seuil de contraste** sur le kraft réel. La doctrine est explicite : les maquettes passent la garde à 4,5:1, donc un texte sous le seuil dans le jeu est un écart. | WCAG sur l'art réel : « DÉPOSER UN SIGNALEMENT » **2,81:1** (grand texte, seuil 3:1) · « SUR · Atelier Vesk — La Lisière » **2,61:1** · « EFFET · une entrée de plus dans leur file » **2,66:1** · « ⚠ au bout de plusieurs, la police se retourne » **2,64:1** (seuil 4,5:1). Témoin haut de la même passe : 11,90:1. `mesures/06` | — |
| `F8` | `E03` | `MAJEUR` | `NOUVEAU` | Les **libellés de la plaque crème sont illisibles** : encre trop claire sur fond crème. Quatre lignes concernées (À QUOI ÇA SERT, CE QU'IL EN RESTE, LE PRIX, LE FOURNISSEUR). | Même chaîne, même plaque, deux côtés : **1,69:1 en jeu contre 4,55:1 dans la maquette**. `mesures/06` | — |
| `F9` | `E03` | `MAJEUR` | `NOUVEAU` | Le **filet pointillé mord sur les capitales** du libellé : l'accent de « À » se confond avec le filet. Quatre lignes concernées. | Écart filet → haut de capitale : **3 px (0,8 px CSS) en jeu contre 21 px (5,8 px CSS) dans la maquette**, soit **−86 %**. La typographie, elle, est juste (229 vs 233 px pour la même chaîne) : c'est bien l'espacement vertical, pas la police. `mesures/07` | — |
| `F10` | **`ENSEMBLE`** (`E03`, `E05`, `E04`) | `MAJEUR` | `NOUVEAU` | Le **bandeau de titre d'écran est présent mais vide** sur ㉚ et ㉛, et **absent** sur ㉘, alors que ㉞ et ㉝ portent le leur. L'œil tombe dans le corps sans avoir lu ce que l'écran demande. Maquettes : « Commander de la matière première / Sans elle, aucun labo ne rallume… », « Ils ont arrêté quelqu'un à vous / Il sait des choses… » (c.67) ou « Lui trouver un avocat / Trois façons de le défendre… » (c.68), « L'envoi de ce soir / On choisit d'où ça part… ». | Bande sans encre juste sous le décor : **E03 365 px (21,9 % du corps)**, **E05 324 px (19,4 %)** — contre **121 px (E06)** et **132 px (E02)** de marge haute normale sur les écrans qui portent leur titre. E04 : le kraft commence à y=430, le bandeau n'existe pas. Tient à 1920 (E03 22,3 %, E05 18,8 %). `mesures/03`, `04` | — |
| `F11` | `E10` | `MAJEUR` | `NOUVEAU` | Le **panneau des nœuds garde sa taille nominale et reste noir** pour une seule ligne de texte grise centrée — et il est **plus sombre que le corps qui l'entoure** : il se lit comme un trou, pas comme un contenant vide. | Intérieur du panneau **686 832 px² = 26,5 % de l'écran**, encre (px > 40/255) = **2,39 %**. Deux trous d'un seul tenant de **302 px (18,1 %)** et **299 px (17,9 %)** du corps, fond `(13,13,13)` contre `(22,22,28)` autour. À 1920 le panneau se résorbe (trou max 114 px, 9,6 %). `mesures/04`, `13` | — |
| `F12` | `E11` | `MAJEUR` | `NOUVEAU` | **Les deux tiers hauts de la feutrine sont vides** : la carte est poussée en bas d'écran, alors que la maquette la pose haut, centrée, l'art de ville visible autour. | Trou d'un seul tenant **y 837..1 481 = 645 px = 38,6 % du corps** à 2400 (325 px = **27,3 %** à 1920), fond mesuré `(34, 86, 60)` ; feutrine au centre `(43, 102, 71)`. `mesures/03`, `04` | — |
| `F13` | `E11` | `MAJEUR` | `NOUVEAU` | **La carte change de forme** : portrait (titre centré sur 4 lignes, filet de séparation, PORTÉE / URGENCE en deux colonnes avec les pastilles sous le libellé) → paysage (titre sur une ligne, PORTÉE et URGENCE en deux rangs en ligne). Le **cachet de cire rouge** du coin haut-droit est absent ; le médaillon « 1 / LIBRE » perd sa **tranche moletée** et devient un disque plat. | Comparaison de forme à forme, maquette `decision-du-jour/reference-1080x2102.png` contre les deux planches E11 | L'assumé n° 9 couvre la **donnée** de la carte (tactique / modérée / faible / libre), pas sa **mise en page** ; mais je ne peux pas exclure qu'une carte servie reprenne la forme portrait |
| `F14` | `E07` | `MAJEUR` | `NOUVEAU` | Le **bloc du tenancier** de la maquette — médaillon rond, « Wexler », « DERRIÈRE LE COMPTOIR », et sa réplique en italique — est **absent**. C'est la seule voix humaine de l'écran, et le cinquième trait de la grammaire commune (« une voix avant le CTA »). | Vérifié en haut **et en bas** de la liste : `E07_Boutique` et `E07_Boutique_bas`, aux deux résolutions | — |
| `F15` | **`ENSEMBLE`** (`E01`, `E02`) | `MINEUR` | `NOUVEAU` | **Deux CTA éteints, deux traitements.** E01 garde les capitales espacées et vire au **gris-bleu** ; E02 passe en **bas-de-casse** — « Lancer la soirée » là où la maquette écrit « LANCER LA SOIRÉE » — et vire au **rose-mauve**. Un seul état d'extinction devrait avoir une seule écriture. | Encre mesurée : E01 `(122, 131, 141)`, E02 `(152, 121, 121)` ; les six CTA allumés partagent l'or `(217,171,77)` ×3, `(242,201,106)`, `(186,146,65)`. `mesures/15` | Si l'extinction est légitime (0 ordre posé sur E02) n'est pas ma question ; la question est qu'elle s'écrive de deux façons |
| `F16` | **`ENSEMBLE`** (`E01`, `E05`) | `MINEUR` | `NOUVEAU` | **classe C** — interlettrage des petites capitales plus serré **par endroits**. Écart **sélectif** : il désigne un conteneur différent, pas un réglage global. | E01 « CE QUI SE DIT CE MATIN », même chaîne : **426 px contre 461 px** (gap médian **9** contre **10** px). E05, section des avocats : gaps interlettres **5-7 px contre 8-9 px** (cadre 68), gaps intermots **13-17 px contre 21-23 px**. Témoins identiques : E07 « LES EXTRAS… » 639/637 px gap 8/8 ; E07 « LA VITRINE » 345/343 px gap 10/10 ; E03 « À QUOI ÇA SERT » 229/233 px. `mesures/08`, `09` | — |
| `F17` | `E02` | `MINEUR` | `NOUVEAU` | Un bloc **« CE QUI S'OUVRIRA PLUS TARD / Rejouer une soirée — verrouillé »** occupe le bas du corps : il n'est dans aucun des cadres 85-91. En regard, la **réplique « Lt. Rin : … »** de la maquette est absente — le cinquième trait de la grammaire commune saute. | Présence / absence, planches `E02_Carnet` et `E02_Carnet_bas`, deux résolutions | La réplique peut être conditionnée au nombre d'ordres posés (0 ici) |
| `F18` | `E03` | `MINEUR` | `NOUVEAU` | Le **bloc d'alerte rouge « Il y a une pénurie en ville »** du cadre 48 n'est pas à l'écran, et le bloc **« LA CHAÎNE, EN REMONTANT »** qu'on y lit n'est dans aucun des cadres 48-53. | Présence / absence | L'humeur du fournisseur diffère (« il vous prend encore au sérieux » en jeu, « il vous fait attendre exprès » au cadre 48) : la pénurie peut légitimement ne pas être là. Ce qui trancherait : une planche où l'humeur vaut « il vous fait attendre exprès » |
| `F19` | `E01` | `MINEUR` | `NOUVEAU` | **Voix des libellés** : l'étiquette d'angle est servie **préfixée de son nom de champ** — « ANGLE CAS ISOLÉ » (planche `_bas`) — là où la maquette écrit une rubrique de journal, « FAIT DIVERS ». | Lu sur `E01_Journal_bas`, deux résolutions | — |
| `F20` | `E01` | `MINEUR` | `NOUVEAU` | **Voix des libellés** : deux journaux différents publient la **même phrase gabarit** — « The Tilbey Weekly publie la dépêche : une bagarre au coin de la rue » et « Brennar Daily Star publie la dépêche : une bagarre au coin de la rue » —, et la carte de tête répète « Petites nouvelles de <district>, qui restent des nouvelles » deux fois sur quatre. | Lu sur `E01_Journal` et `E01_Journal_bas` | Les **noms** de journaux en anglais sont l'assumé n° 5 et ne sont pas comptés ici ; c'est la phrase gabarit française qui est en cause |
| `F21` | `E01` | `MINEUR` | `NOUVEAU` | La **sous-ligne de la brève perd une moitié** : « news.beat.body_found · Dépôt-Est » (maquette) → « Hautes-Marches » (jeu). **Le jeu a raison et la maquette a tort** : la doctrine interdit l'enum brut à l'écran. Consigné pour qu'on ne « corrige » pas à l'envers. | Lu sur les deux images | — |
| `F22` | `E07` | `MINEUR` | `NOUVEAU` | **classe C** — sur `E07_Boutique_bas`, l'entête « LES MARKS — PAYÉS AU MAGASIN » est **tranché en deux** par le bandeau collant « LA VITRINE », sans fondu ni masque ; les pastilles « +40 % » et « +75 % » touchent la pile de pièces qu'elles surmontent. | Lu sur `E07_Boutique_bas`, deux résolutions | — |
| `F23` | `E03` | `MINEUR` | `NOUVEAU` | **classe C** — fond de la plaque crème `(234, 224, 200)` contre `(239, 231, 214)` : le canal bleu sort de la tolérance de 6/255. | Δ = (5, 7, 14). `mesures/07` | — |
| `F24` | `E01`, `E05` | `MINEUR` | `NOUVEAU` | **classe C** — les fenêtres de défilement **tranchent les cartes sans fondu** : sur `E05_Loi_bas_1080x1920` le bord haut de la carte « Commis d'office » est coupé net ; sur `E01_Journal_bas` la dernière carte est coupée à son bord bas ; sur `E01_Journal` (haut) la 4ᵉ brève est coupée en plein titre. | Lu sur les planches `_bas` et nominales | Les planches `_bas` **ferment** bien le débordement (garde de capture « contenu inatteignable » au vert) : ce n'est pas une perte de contenu, c'est la forme de la coupe |

**Écarts ASSUMÉS — vérification « rendu proprement ? »** (ils ne comptent pas dans la table ci-dessus) :

| assumé | rendu proprement ? |
|---|---|
| 1 — E04 en état d'erreur | **NON** — aucune des deux phrases n'est à l'écran ⇒ `F2` |
| 3 — E01 « dans la rue » à 00 | OUI — le compteur lit « 00 », les deux autres sont alignés avec lui |
| 4 — E01 étiquette d'angle non servie | **servie depuis**, mais préfixée ⇒ `F19` |
| 5 — noms de journaux en anglais | OUI — confirmé sur la planche (« THE TILBEY WEEKLY » ×3, « THE FREE WEEKLY », « BRENNAR DAILY STAR ») ; non compté |
| 6 — E08 état vide | **NON** — la jauge manque ⇒ `F3`, et le voile remplace le décor ⇒ `F5` |
| 7 — E09 état vide | **NON** — la feuille se rétracte et le kraft la remplace ⇒ `F6`, `F7` |
| 8 — E09 « budget coupé » en capitales dans 52 px | **non jugeable** : la table est vide, aucune cellule « budget coupé » n'est à l'écran (voir § 6) |
| 9 — E11 carte fabriquée | la **donnée** est rendue lisiblement ; la **forme** diverge ⇒ `F13` |
| 10 — A01 carte de tête neuve | la carte de tête elle-même est propre ; c'est la **ligne de file** sous elle qui coupe ⇒ `F1` |
| 11 — valeurs du HUD d'un compte neuf | OUI — 10 000 €, Froid, JOUR 1, Aube, mêmes places et mêmes graisses que les maquettes |

---

## 5. Autres résolutions — 1080×1920

Les **18 planches 1920** (hors `E12_*`) sont passées aux mêmes instruments (`mesures/03` adapté,
`mesures/10`). Synthèse :

- **Tous les findings tiennent à 1920**, avec des pourcentages plus petits puisqu'il y a moins de
  hauteur : E04 kraft 52,0 % (trou 81,4 % du corps) · E09 kraft 57,7 % (trou 56,1 %) · E08 voile
  51,8 % · E11 feutrine 28,9 % (trou 27,3 %) · E03 bandeau vide 22,3 % · E05 bandeau vide 18,8 %.
- **La coupure de `F1` est identique à 1920** : la même phrase s'arrête sur « il me faut ».
- **Un écart propre à 1920** : `E10` se comporte **mieux** à 1920 — le panneau des nœuds se résorbe
  (trou max 114 px = 9,6 % du corps, contre 302+299 px = 36,0 % à 2400). Le trou noir de `F11` est
  donc **spécifique à 1080×2400**, la résolution du téléphone visé.
- **Rien n'est hors cadre, rien ne déborde de son parent** à l'une ou l'autre résolution ; les
  planches `_bas` ferment bien le débordement annoncé au journal (E01, E02, E05@1920, E06@1920, E07).
- `E09_Inspections_1080x1920` : la bande de décor tombe à **235 px (12,2 %)**, même diagnostic que
  `F6`.

---

## 6. Ce que je n'ai pas pu vérifier

1. **L'animation.** Les captures T et T+1 s n'ont pas été prises (dossier, § Doctrine). Je ne peux ni
   confirmer ni infirmer quoi que ce soit sur le mouvement. *Ce qui trancherait* : deux captures
   espacées d'une seconde par écran, ou la déclaration de `@keyframes` côté source de la maquette.
2. **E04, assumé n° 2** — le sous-titre qui passe de deux phrases à une au chargement. Une seule
   image par écran : l'état d'avant chargement n'existe pas. *Ce qui trancherait* : une capture prise
   avant `DerniereErreur`.
3. **E09, assumé n° 8 — « budget coupé » en capitales dans une colonne de 52 px.** La question m'est
   posée et je ne peux pas y répondre : **la table est vide sur les deux planches**, aucune cellule
   « budget coupé » n'est à l'écran. Les quatre entêtes (DISTRICT / CHARGE / RÉGIME / ORIGINES) sont
   présents et lisibles. *Ce qui trancherait* : une planche de l'état chargé (`cadre-31-tableau` ou
   `cadre-34-retour-de-baton` ont la colonne peuplée).
4. **E01, assumé n° 3** — « dans la rue » à 00 : la **partie d'écran** qu'occuperait une brève de rue
   n'est pas jugeable. *Ce qui trancherait* : une planche sur un compte avec du trafic de rue.
5. **E03** — l'absence du bloc rouge « pénurie » peut être l'état (voir `F18`).
6. **E05** — le journal dit qu'**aucun cadre « parloir vide » n'existe**. L'état capturé n'a pas de
   maquette homologue : seuls le bandeau de titre et les trois cartes d'avocat (cadre 68) ont pu être
   appariés. Le reste de l'écran (« VOS AVOCATS », « AFFAIRES EN COURS ») est jugé sur la grammaire
   d'ensemble, pas contre une image.
7. **A01, la carte de tête** — le cadre 5 offre **deux** gestes sous un libellé « CE QU'ON PEUT
   FAIRE » souligné de pointillés, avec une explication sous chaque option ; le jeu n'en offre qu'un
   (« LIRE MAINTENANT »), sans ce libellé ni ces explications. La carte servie (« Des rapports à
   lire ») n'est pas celle du cadre 5 (« Un local à remettre en état ») : je ne peux pas dire si le
   second geste manque ou si cette carte-là n'en a qu'un. *Ce qui trancherait* : une planche avec une
   carte à deux options.
8. **Le bandeau « Lt. X attend vos ordres — trancher »** n'apparaît que sur `E01` et `E01_bas` ; sur
   les dix autres écrans il ne reste que le losange or à sa place. Les planches viennent de **quatre
   inscriptions distinctes** (journal, `P0` ×4) : je ne peux pas départager « le bandeau est
   conditionnel » de « il a disparu ». *Ce qui trancherait* : deux écrans capturés dans la **même**
   session.
9. **La police.** Les références de la série 4 (E08 nominal, E11, `v4-*`) sont **entièrement
   substituées** (Georgia → Noto Serif, Segoe UI → Noto Sans) : leur dessin de lettre ne fait pas foi,
   et je n'ai comparé sur elles que de la géométrie. Aucun écart de famille n'est reproché.
10. **E12** — les six planches `E12_Dossier_*` du même répertoire **n'ont pas été ouvertes** : elles
    sont le matériau d'un autre juge.

---

## Annexes

### Annexe 1 — Correspondance des repères (établie avant toute mesure)

| | px de l'image | largeur CSS | facteur |
|---|---|---|---|
| références nominales (1080×2102) | 1080 | 300 | **×3,6** |
| références d'état `v4-*` (900×1752) | 900 | 300 | **×3,0** |
| captures (1080×2400 et 1080×1920) | 1080 | 300 | **×3,6** |

⇒ **rapport capture ÷ référence nominale = 1,000 en X** : toute grandeur horizontale (largeur de
colonne, chasse, diamètre, marge) se compare **en px bruts** entre une capture et une référence
1080×2102. C'est pourquoi les mesures de typographie (M7, M8, M9) et de gouttière (M11) sont données
en px, et converties en px CSS (÷3,6) seulement pour la lisibilité.

⇒ **en Y, aucun rapport** : 2102 contre 2400 ou 1920. Toute grandeur verticale est donnée en
**% du corps** (y de 430 à H−300) ou **% de la hauteur de l'image**, jamais en px Y comparés.

⇒ Les deux seules références à **×3,0** employées ici sont `compression/v4-29.png` (E08 « au calme »)
et, pour mémoire, la famille `v4-*`. La seule mesure prise dessus (part d'or, M13) est une **part**,
donc invariante d'échelle — c'est exactement pour éviter le piège « tout est 20 % trop grand ».

### Annexe 2 — Inventaire : la couche globale, douze planches 2400

| écran | décor, médiane y 250..420 | plus long trou du corps | matière dominante | CTA |
|---|---|---|---|---|
| A01 | `(8,13,21)` | 141 px (8,4 %) | — | or (plaque) 8,64:1 |
| E01 ㊳ | `(5,8,15)` | 110 px (6,6 %) | — | **éteint** gris-bleu |
| E02 ㉞ | `(4,7,15)` | 132 px (7,9 %) | crème (plaque) | **éteint** rose-mauve |
| E03 ㉚ | `(4,7,15)` | **365 px (21,9 %) — bandeau de titre vide** | crème (plaque) | or 7,97:1 |
| E04 ㉘ | `(4,8,15)` | **1 449 px (86,8 %)** | **kraft 57,4 %** | or 5,87:1 |
| E05 ㉛ | `(4,7,15)` | **324 px (19,4 %) — bandeau de titre vide** | — | or 7,97:1 |
| E06 ㉝ | `(4,7,15)` | 362 px (21,7 %, bas de liste) | — | or 7,97:1 |
| E07 ㉓ | `(4,8,15)` | 106 px (6,3 %) | — | — |
| E08 ⑭ | `(8,14,25)` | 90 px (5,4 %) | **voile 54,4 %** | — |
| E09 ⑮ | crème (pas de décor) | **1 139 px (68,2 %)** | **kraft 62,1 %** | rouge sur crème |
| E10 ㊵ | `(4,8,15)` | **302 + 299 px (36,0 %)** | — | or 11,44:1 |
| E11 ⑤ | `(45,65,86)` | **645 px (38,6 %)** | **feutrine 35,8 %** | rouge sur crème |

### Annexe 3 — Scripts (`mesures/`), un par famille de grandeurs

Chacun **imprime la taille de chaque image qu'il ouvre**, et porte son contrôle positif.

| script | ce qu'il mesure | contrôle |
|---|---|---|
| `00-profil-lignes.py` | profil de médianes par ligne (repérage) | — |
| `01-chrome-ensemble.py` | manomètre, hauteur de capitale d'ARGENT, jeton or | or ref 176,141,62 / jeu 176,141,61 |
| `02-manometre.py`, `02b-manometre-runs.py` | diamètre de l'anneau par **deux arcs** (rejette le filet pleine largeur) | capture 184 px vs cadre 5 176 px |
| `03-trous-et-fond.py` | plus long intervalle du corps à encre < 1,5 %, et son fond | E07 106 px / E04 1 449 px |
| `04-tous-les-trous.py` | **tous** les intervalles > 120 px, pour séparer bandeau / trou / marge basse | E02 132 px vs E03 365 px |
| `05-gouttiere-et-dock.py` | matière aux bords et derrière le dock | les 12 planches |
| `06-contraste.py` | WCAG sur l'art réel, fenêtres de texte vérifiées à l'œil | 1,69 → 11,90:1 |
| `07-plaque-appro.py` | filet pointillé, capitale, écart, chasse (E03) | même chaîne des deux côtés |
| `08-interlettrage.py`, `09-interlettrage-ensemble.py` | chaînes **identiques** ref ↔ jeu | E07 639/637 px, gap 8/8 |
| `10-matieres-de-fond.py` | masques feutrine / kraft / voile sur les 12 | 0,0 % vs 35,8 % |
| `11-gouttiere-kraft.py` | marges du panneau kraft, même ligne y=1000 | teinte 129,97,59 vs 138,105,65 |
| `12-decor-dock-or.py` | décor, dock, part d'or dans le corps | dock identique sur 10/12 |
| `13-e08-jauge-e10-panneau.py` | or du corps (E08), panneau et encre (E10) | chrome 4,26 / 2,49 / 1,96 % |
| `14-a01-raison-coupee.py` | lignes de texte de la carte de file, deux variantes | la variante courte rend 2 lignes complètes |
| `15-ctas.py` | encre, fond et contraste des 8 CTA | six CTA or d'une seule famille |
| `16-hauteur-du-decor.py` | ⚠ **écarté** : le critère de texture ne discrimine pas (sd < 7 sur presque tous les décors, trop sombres). La hauteur de décor citée en `F6` vient d'une mesure de remplacement (« première ligne de matière claire sous le chrome »), collée au § 3 et reproductible en trois lignes. |

### Annexe 4 — Ce que j'ai refusé de conclure

- **« Le manomètre est trop petit dans le jeu »** : vu à l'œil, **réfuté à la mesure** (184 px contre
  176 px pour le cadre 5, centres confondus). Les références d'écran seul (194 px) ne portent pas le
  shell : ce n'étaient pas les bons témoins.
- **« Les capitales du jeu ne sont pas espacées »** : vu à l'œil sur E03, **réfuté à la mesure**
  (229 px contre 233 px pour la même chaîne, « À » à 17 px des deux côtés). L'écart réel y est le
  **contraste** et l'**écart au filet**, pas la chasse.
- **« Le kraft et la feutrine passent derrière le dock »** : vu à l'œil, **réfuté à la mesure** — le
  bandeau du dock lit `(13,19,30)` à `(27,26,31)` sur les douze planches, aux deux résolutions.
