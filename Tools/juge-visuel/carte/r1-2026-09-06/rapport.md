# Juge visuel ⊥ — ③ La Carte de Brennar (city map) — r1 — 2026-09-06

## Verdict : NON APPROUVÉ
La peinture, son cadrage et les 18 noms sont justes ; ce sont les **plaques** posées sous ces noms
qui retournent l'écran — la couche la plus discrète de la maquette est devenue la plus lourde du jeu.

> ⚠️ **Chrome non alimenté, donc non jugé** (doctrine du dossier) : le bandeau porte « ARGENT — »,
> « JOUR — » et **« Unknown »** dans le médaillon. Je mesure sa géométrie (elle sert à borner le
> contenu) et je n'en tire **aucun finding**. Pour mémoire, sans être compté : le médaillon déborde
> sous le bandeau, le **filet or (y 138–142)** traverse la bande d'encre du mot « Unknown »
> (encre y 124–174), l'aiguille est verticale, et
> « Unknown » est un repli anglais qui atteint l'écran. Le CONTENU, lui, est jugé.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence | jeu | écart |
|---|---|---|---|---|
| C1 | échelle de la peinture — **un seul** facteur ajuste les DEUX axes | — | `s = 1,0225` | aucun étirement ; minimum convexe, contrôles négatifs 20,3 et 20,2 contre 12,0 (`m04`) |
| C2 | cadrage vertical (part de la peinture visible) | réf-y 219 … 2085 | réf-y 218,1 … 2095,8 | +0,9 / +10,8 px sur 1866 (**0,6 %**) |
| C3 | cadrage horizontal | réf-x 0 … 1080 | réf-x 11,7 … 1057,7 | 12 px de chaque bord (**1,1 %**) |
| C4 | 7 témoins de peinture (QUAI-NORD, SAINT-BRAND, LE TREILLIS, fleuve, mer du port, DÉPÔT-EST, LES ENTREPÔTS) | — | — | **≤ 1/255 par canal** sur les 7 (`m10`) |
| C5 | couleur du fleuve, médiane 41×41 | (24, 64, 82) | (23, 64, 82) | 1/255 |
| C6 | « LE THRENNY », peint dans la texture — hauteur de capitale | 18 px | 18 px | **×1,000** (`m07`) |
| C7 | « LE THRENNY » — inclinaison | 0,00° | −0,76° | 0,8° |
| C8 | les 18 noms de quartier | 18 | 18 | **18/18**, français, accents justes (DÉPÔT-EST, LES ENTREPÔTS, LA LISIÈRE), 0 slug, 0 troncature, 0 mot anglais (`vues/plaques_contact.png`) |
| C9 | chaque marqueur dans SON quartier | — | — | les 18 rects reportés tombent sur le libellé homologue (`vues/overlay_plaques_sur_ref.png`) |
| C10 | chevauchement de marqueurs | 0 paire | **0** paire sur 153 | `m22` |
| C11 | bras NORD de la rose des vents | y = 535 | y attendu 555,0 / obtenu 555 | **0,0 px** (`m15`) |
| C12 | luminance moyenne de la carte | 38,27 | 38,36 | **0,09/255** (`m14`) |
| C13 | masse visuelle hors marqueur, 4 fenêtres témoins | — | — | ×1,04 · ×1,06 · ×1,10 · ×1,18 (`m21`) — l'instrument n'enfle pas |
| C14 | gouttière | — | contenu 231 … 2151 | rien sous le bandeau, rien sous le dock |
| C15 | débordement / rognage des marqueurs | — | marge 63 px à gauche, 51 px à droite | aucun élément coupé par le cadre |
| C16 | écart global carte/carte hors marqueurs | — | — | médiane **0,45/255** sur 3158 cellules 24×24 (`m16`) |

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir la ville d'un coup d'œil et décider où aller : où ça chauffe, qui chasse, et où
l'on est chez soi. C'est une **carte peinte**, pas un tableau de bord — la ville est le sujet,
l'information est posée dessus comme une gravure.

**Ordre de lecture de la maquette**, du plus fort au plus faible :
1. **le halo or de « chez vous »** (LA LISIÈRE) — l'unique tache claire de l'image, (209,173,92) sur une carte dont tout le reste vit sous L=90 ;
2. **les six écussons** corail/or/teal numérotés (1 CHASSE … 6 CHASSE) — les seules formes saturées ;
3. **les deux quartiers chauds** en lavis khaki (LES BASSINS, HAUTES-MARCHES, (86,77,62) contre (26,35,51) ailleurs) ;
4. **le fleuve** et le port, qui structurent les deux rives ;
5. **les 18 noms**, en dernier : capitales sérif crème très espacées, **posées à même la peinture, inclinées sur la trame de leur quartier**, sans fond — elles se lisent quand on les cherche et disparaissent quand on regarde la ville.

**Zones.** Bandeau (argent / chaleur / jour) · la carte plein cadre · une ligne d'aide italique en bas,
en fiction (« Brennar, la nuit — deux rives, dix-huit quartiers · pincez pour approcher, touchez un quartier »).

**Traits d'identité.** (a) la nuit bleue quasi monochrome, sans aucune couleur saturée hors écussons ;
(b) le nom **gravé**, incliné, sans plaque ; (c) le lavis de couleur sur **l'aire** du quartier ;
(d) le halo or de chez-soi ; (e) la typographie sérif espacée, jusque dans la ligne d'aide.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. La ville est **la même à l'octet près** (7 témoins à ≤1/255, écart médian 0,45/255 sur 3158
cellules) et son cadrage est juste à 0,6 % près : tout le travail de peinture arrive intact. Ce qui
change, c'est **ce qu'on pose dessus**.

Dans la maquette, le nom de quartier est la couche 5 sur 5. Dans le jeu, c'est la couche 1 : chaque
nom est enfermé dans un rectangle **opaque** de 177×34 px, gris clair uniforme, à coins vifs et sans
anti-crénelage. Mesuré comme un joueur le perçoit — la masse d'encre dans une fenêtre de 200×70 px
autour du marqueur — le nom pèse **×3,0 à ×7,9** plus lourd qu'en maquette (37 à 60 % de la fenêtre
remplie contre 8 à 17 %), quand quatre fenêtres témoins sans marqueur donnent ×1,04 à ×1,18.
**L'ordre de lecture est inversé** : on voit dix-huit étiquettes, puis la ville. C'est le finding F1,
et c'est le seul BLOQUANT.

Le paradoxe de ces plaques, c'est qu'elles **dégradent** ce qu'elles semblent servir : le nom y est
écrit en blanc sur gris à **2,80:1**, sous le plancher de 4,5:1, alors que la maquette obtient
**8,43:1** sur l'îlot navy et **4,44:1** sur son îlot le plus clair, sans aucun fond (F2). Et le nom
y est **37 % plus petit** (10 px de hauteur de capitale contre 16, contrôle positif à 1,000 sur un
mot peint, F3) et **redressé à l'horizontale** alors que la maquette lui donne un angle par quartier,
de −10,2° à +7,2° (F4). Trois choix qui vont tous dans le même sens : le nom cesse d'appartenir à la
carte pour devenir une étiquette posée dessus.

Deux conséquences directes de l'opacité : la plaque VERRIER **mange le bras sud de la rose des
vents** — 31 px sur 146, le bras nord coïncidant à 0,0 px (F5) — et 5,22 % de la carte disparaît sous
du gris uni, dont beaucoup pour rien : la plaque a une largeur **fixe**, si bien qu'« ORSEL » masque
129 px de peinture qui ne portent aucune lettre (F7).

Enfin, la bande du bas a changé de registre : la phrase en fiction de la maquette a laissé place à
une **légende** « Chaleur : affichée · Libre · Disputé · À vous · Rival » dont les pastilles
(242,189,49), (61,178,86), (209,66,66) sont **les seuls aplats saturés de tout l'écran**, sur une
carte dont la palette dominante plafonne à (85,87,77) — et dont le libellé à deux points relève du
vocabulaire d'outil, pas du jeu (F6).

Ce qui manque par ailleurs — halo or de chez-soi, écussons, lavis de chaleur — est **assumé** par le
dossier et je ne le compte pas ; mais il faut dire que ces trois absences retirent les rangs 1, 2 et
3 de l'ordre de lecture. La question « où ça chauffe ? », qui est la raison d'être de l'écran, n'a
aucune réponse visible sur cette capture : **0 cellule sur 1959** est plus chaude que la maquette,
contre 333 plus froides. Les 18 plaques portent exactement `(140,140,148)`, c'est-à-dire **la couleur
même de la pastille « Libre »** de la légende — l'indice que la conviction est portée par la plaque
et vaut « Libre » partout sur ce compte. Je ne peux pas le prouver depuis une capture à données
uniformes : c'est le point 4 des non-vérifiés.

---

## 3. Écarts

Une ligne par finding. `dépend des données` sépare ce qui est vrai quelles que soient les données
(géométrie, palette, typographie, espacements) de ce qui est une observation datée du compte
`operational_demo@example.test` au 2026-09-04 11:22.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` | `NOUVEAU` | non | **Hiérarchie inversée** : les 18 noms de quartier sont posés sur une plaque rectangulaire **opaque**, là où la maquette grave le texte à même la peinture sans aucun fond. Le rang de lecture du nom passe de 5/5 à 1/5. | Masse visuelle (px dépassant le fond de +20 L, fenêtre 200×70 autour du marqueur) : **×3,00** LES BASSINS · **×4,49** HAUTES-MARCHES · **×3,95** SAINT-BRAND · **×7,85** LE TREILLIS · **×4,94** LES FRICHES — soit 37 à 60 % de la fenêtre remplie contre 8 à 17 % en maquette. 4 fenêtres témoins **sans** marqueur : ×1,04 / ×1,06 / ×1,10 / ×1,18. Opacité 100 % : 45 échantillons répartis dans la plaque VERRIER (dont au-dessus du parc vert et de la rose des vents) rendent tous exactement `(140,140,148)`. Surface opaque ajoutée 18 × 177×34 = **108 324 px = 5,22 %** de la carte. (`m21`, `m05`, `m14`) | si un état sélectionné/pressé change cette plaque (aucun état sélectionné n'est capturé) |
| `F2` | `MAJEUR` | `NOUVEAU` | non | Le contraste du nom **descend sous le plancher de doctrine** à cause de la plaque — et la maquette faisait mieux **sans** plaque. | encre `(235,235,236)` sur plaque `(140,140,148)` = **2,80:1**, plancher doctrine **4,5:1** (petit texte, hauteur de capitale 10 px = 2,8 CSS). Maquette : encre `(198,189,166)` sur îlot navy `(26,35,51)` = **8,43:1** ; sur l'îlot le plus clair, le khaki `(86,77,62)` = **4,44:1**. Plaque contre carte : 4,84:1. (`m06`, `m14`) | — |
| `F3` | `MAJEUR` | `NOUVEAU` | non | Le nom de quartier est **37 % plus petit** qu'en maquette. | Hauteur de capitale mesurée en tranches verticales de 24 px (insensible à l'inclinaison) : **médiane 16 px** en maquette (15–19 sur 8 mots) contre **10 px** en jeu (10–11). Rapport médian **0,625**. Contrôle positif : « LE THRENNY », peint dans la texture, rend 18 px des deux côtés (**1,000**). (`m07`) | — |
| `F4` | `MAJEUR` | `NOUVEAU` | non | Les noms ne suivent plus la **trame de leur quartier** : tous redressés à l'horizontale. | Maquette, un angle par quartier : LES BASSINS **−10,21°**, LES FRICHES −6,38°, QUAI-NORD −3,51°, MARNE-BASSE +0,09°, HAUTES-MARCHES +2,86°, SAINT-BRAND +3,04°, DÉPÔT-EST **+7,23°** — amplitude **17,4°**. Jeu : −0,10° / +0,06° / +0,39°. Contrôle positif « LE THRENNY » : 0,00° / −0,76°. (`m18`) | — |
| `F5` | `MAJEUR` | `NOUVEAU` | non | La plaque **VERRIER** recouvre le bras SUD de la **rose des vents** (repère peint) et un tronçon de la route or. | Sur l'axe de l'étoile (réf x=985 → jeu x=995) : la maquette porte l'encre crème `(166,160,141)` de y=663 à y=677 ; aux lignes homologues du jeu (686…700) il n'y a que `(140,140,148)`. Bras nord : **écart 0,0 px** (contrôle positif). Hauteur attendue 146,2 px, obtenue 115 ⇒ **31 px perdus = 21 %**. Même plaque sur la route or (réf y=689). (`m15`) | — |
| `F6` | `MAJEUR` | `NOUVEAU` | non | Une **bande de légende EN TROP** en bas à gauche — « Chaleur : affichée » + 4 pastilles Libre / Disputé / À vous / Rival — absente de la maquette, et seuls aplats saturés de l'écran. | Delta capture − maquette sur la fenêtre (40,2108)–(500,2136) : **+38,0 / +36,1 / +31,4** (l'élément est ajouté) ; témoin 10 px plus bas : −5,6/−7,3/−9,4. Puce `(140,140,148)` de 209×15 px ; pastilles `(242,189,49)`, `(61,178,86)`, `(209,66,66)` ; texte **blanc pur** `(242,242,242)`, hauteur d'encre 9–11 px. Palette dominante de la carte : 6 jetons, le plus clair `(85,87,77)`. (`m13`, `m17`, `m14`) | si cette bande est un dispositif de mise au point destiné à disparaître (non lisible depuis l'image) |
| `F7` | `MINEUR` | `NOUVEAU` | non | La plaque a une **largeur fixe** et ne suit pas son encre : elle masque de la peinture au-delà du texte, et sa marge varie de 9 à 65 px selon le nom. | Les 18 plaques mesurent **177×34 px** (±1) ; l'encre va de **48 px** (ORSEL) à **158 px** (PLACE DES COMPTES). Marges latérales : 65/65 px pour ORSEL (soit **129 px de plaque, 73 %, sans aucune lettre**), 10/9 px pour PLACE DES COMPTES. (`m05`, `m06`) | ce que devient un libellé plus long que « PLACE DES COMPTES » — 9 px de marge seulement (aucun tel district ici) |
| `F8` | `MINEUR` | `NOUVEAU` | non | Les noms sont posés **systématiquement plus bas** qu'en maquette, et l'un d'eux nettement décalé en x. | Centroïde d'encre, repère commun : dy = **+5,7 à +12,5 px**, médiane **+8,4**, les 7 du même signe ; dx de **−25,1** (LES BASSINS) à +11,0, médiane +1,0. Tolérance du mandat : 2 px, ou 1,5 % du parent = 16 px. (`m19`) | la part due à la comparaison d'un mot incliné (maquette) avec un mot horizontal (jeu) — le dy commun n'en dépend pas, le dx de LES BASSINS peut en dépendre |
| `F9` | `MINEUR` | `NOUVEAU` | non | **Famille de teinte** de l'encre du nom : crème chaude → blanc neutre. | Maquette `(173,164,144)` à `(205,189,165)`, r−b = **29 à 40**. Jeu `(235,235,236)` et `(246,246,247)`, r−b = **1**. (`m20`) | — |
| `F10` | `MINEUR` | `NOUVEAU` | non | La plaque n'a **ni rayon d'arrondi, ni bord, ni anti-crénelage** — un rectangle brut dans un écran dont toute la langue graphique est adoucie. | Transition en **1 px** : x=254 `(140,140,148)` → x=255 `(22,36,49)` ; coin haut-gauche plein dès (78,483) ; aucun pixel intermédiaire sur les 4 côtés testés. Rayon 0 (maquette : aucune plaque, donc aucun rayon à comparer — c'est la présence même de l'arête qui est l'écart). (`m14`) | — *(même cause que F1)* |

**Compte : 10 findings — 1 BLOQUANT, 5 MAJEURS, 4 MINEURS. Aucun ne dépend des données.**

---

## Écarts ASSUMÉS — vérification « rendu proprement »

| ligne du dossier | ce que je mesure | rendu proprement ? |
|---|---|---|
| la ville est la peinture, pas une donnée | **échelle uniforme** : un seul facteur `s = 1,0225` ajuste les deux axes (minimum convexe ; contrôles négatifs 20,3 et 20,2 contre 12,0) ⇒ **aucun étirement**, rapport d'aspect conservé. Aucun quartier coupé par le cadre : le jeu couvre réf-y 218,1…2095,8 contre 219…2085 en maquette (0,6 %) et réf-x 11,7…1057,7 (1,1 %). Aucun marqueur hors de son quartier (18/18, report visuel). 7 témoins de peinture à **≤ 1/255**. | **oui** — aucune des trois conditions de sortie n'est atteinte |
| 18 noms de quartier en français | 18/18 présents, orthographe et accents justes, aucun slug, aucune troncature, **0 chevauchement** sur 153 paires. « PLACE DES COMPTES » confirmé : la maquette cache son début derrière l'écusson 5. | **oui** |
| le mot de la chaleur peut manquer ou différer | aucun mot de chaleur sur la carte ; **aucune clé brute, aucun mot anglais** dans le contenu (les 18 noms + « Chaleur : affichée », « Libre », « Disputé », « À vous », « Rival » sont en français). | **oui** |
| les écussons de conviction peuvent manquer | absents ; les 6 écussons de la maquette ressortent comme zones de différence 1, 2, 4 et 5 de `m16`, **toutes de signe négatif** (rien n'est mis à leur place, pas de trou, pas de repli). | **oui** |
| « VOUS ÊTES ICI » / quartier or peut manquer | absent : sur LA LISIÈRE, la maquette a `(209,173,92)`, le jeu `(27,34,50)` — delta −182/−139/−42. Rien n'est posé ⇒ le contrôle de sortie (« chez vous » sur le mauvais quartier) **ne peut pas se déclencher**. À noter pour l'user : la maquette pose « chez vous » sur **LA LISIÈRE** alors que le dossier mesure les 4 bâtiments du kit au **district 1, Les Bassins** — désaccord entre la maquette et la donnée, pas défaut du client. | **oui** |
| « LE THRENNY », « LE PORT » peuvent manquer | **présents** (peints dans la texture) — « LE THRENNY » : 18 px de hauteur de capitale des deux côtés, angle 0,00°/−0,76°. | **oui** |
| « pincez pour approcher » peut différer | la ligne d'aide de la maquette est **absente** : delta −13,1/−11,3/−7,8 sur la fenêtre (120,2015)–(960,2100). Sa place est prise par la légende (comptée en F6, qui est un ajout et non une substitution). | **oui** pour l'absence |
| libellé de type de bâtiment de la bande du bas | la bande du bas ne porte aucun libellé de bâtiment dans cette capture. Sans objet. | sans objet |
| la bande de chaleur peut être JOUR / état différent | **aucune teinte de chaleur nulle part** : sur 1959 cellules 24×24 hors plaques, **0** est plus chaude que la maquette (seuil +12 sur dR−dB) et **333** sont plus froides. Les 18 plaques valent exactement `(140,140,148)` = **la couleur de la pastille « Libre »** de la légende. Lecture : la conviction serait portée par la plaque et vaudrait « Libre » sur les 18 — non démontrable ici (non-vérifié n°4). | **oui** au sens du dossier (« l'écran peut n'en montrer qu'une partie »), mais c'est ce qui prive l'écran de sa première raison d'être — voir §4 |

---

## Écarts d'ARBITRAGE

| # | sujet | mesure | pourquoi ce n'est pas un défaut du client |
|---|---|---|---|
| `A1` | **famille de police** des noms | maquette : capitales **sérif** très espacées ; jeu : capitales **sans-sérif**. Le dossier établit que la maquette a été rendue avec Noto Serif (`fc-match Georgia`), et que le client embarque DejaVu. | la référence n'a jamais montré Georgia à personne ; l'écart de famille s'arbitre, il ne se corrige pas. La **hauteur de capitale**, elle, se compare et est comptée en F3. |
| `A2` | libellés anglais **de la maquette** | son bandeau porte « HEAT » et « $ 24 850 ». | ruling 2026-09-02 « fr réel » : le client a raison, **la maquette est à mettre à jour**. Noté une fois. |
| `A3` | silhouettes / couvre-chefs | aucun buste sur cet écran. | sans objet. |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, `capture-1080x2400.png` (1080×2400, 20:9), et
annonce lui-même cette limite. Le reflux, les débordements et le rognage à une seconde résolution
sont **non vérifiés** (voir §6, point 1). La seule chose que je peux dire à 1080×2400 : rien n'est
coupé par le cadre — marge de 63 px à gauche, 51 px à droite pour les marqueurs, et le contenu vit
strictement entre 231 et 2151, donc ni sous le bandeau ni sous le dock.

---

## 6. Non vérifié

1. **Une seule résolution.** La doctrine en vise deux ; à 720×1600 ou 1080×1920, la plaque de 177 px
   de large (16,4 % de la largeur) et l'encre de 158 px de « PLACE DES COMPTES » n'ont pas été
   éprouvées. *Ce qui trancherait :* la même capture à une seconde résolution.
2. **Aucune preuve d'absence d'animation.** Une seule image. *Ce qui trancherait :* une paire T /
   T+1 s du même état, et le compte de pixels différents hors bandeau et hors dock.
3. **Le rect imprimé par le test n'est pas fourni** (log non préservé). Toute la géométrie de chrome
   que je cite (bandeau 0…230 ; filet or mesuré à y 138–142 et bord bas de la barre à **y=143**, soit exactement 52 CSS-HUD × 2,755 = 143,3 ; dock 2151…2400) est **mesurée
   sur l'image**, pas confirmée par le run.
4. **Je ne sais pas distinguer « le client ne peint pas la chaleur sur l'aire d'un quartier » de
   « toutes les données valent Libre sur ce compte ».** L'égalité exacte, sur trois canaux, entre le
   fond des 18 plaques et la pastille « Libre » `(140,140,148)` est un indice fort du second cas,
   pas une preuve. *Ce qui trancherait :* une capture sur un compte où au moins un district est
   Disputé / À vous / Rival, ou les 18 valeurs de `heat` / `belief` du back à l'heure de la capture.
   C'est **le point le plus important de cette liste** : il décide si le but premier de l'écran est
   servi ou non.
5. **L'état du compte de démo au 2026-09-04 11:22 n'est pas re-mesurable** ici — le dossier le dit.
   Tout ce qui touche à la chaleur, à la conviction et au « chez vous » est une observation datée ;
   c'est pourquoi aucun de mes 10 findings n'en dépend.
6. **Comportement d'un libellé plus long que « PLACE DES COMPTES »** (9 px de marge dans une plaque
   de largeur fixe) : troncature, ellipse ou rétrécissement ? Aucun des 18 districts ne le teste.
7. **Aucun état d'interaction n'est capturé** (quartier survolé, pressé, sélectionné, « ENTRER dans
   le quartier ») : je ne juge ni l'ordre de superposition ni le retour visuel du toucher.
8. La capture antérieure `capture-carte-seule-1080x2400.png` porte la même forme de plaque, mais le
   dossier interdit de s'en servir pour un delta : **je n'en compte rien**.
9. **Le chrome** (bandeau, médaillon, dock) est écarté par doctrine, capture non alimentée. Rien de
   ce que j'en dis en tête de rapport n'est compté.

---

## Annexes

### 1. Inventaire de la référence (extrait — fiches des parties qui portent les écarts)

| id | catégorie | bbox (px de l'image) | forme | remplissage | texte | relations |
|---|---|---|---|---|---|---|
| `R.carte` | fond / décor | (0, 219, 1080, 2085) | plein cadre, coins arrondis du châssis `.tel` | peinture de nuit ; palette dominante `(24,38,53)` 18,0 %, `(42,59,64)` 14,5 %, `(24,30,41)` 14,5 %, `(11,18,26)` 13,3 %, `(16,24,35)` 12,1 %, `(85,87,77)` 10,6 % | — | luminance moyenne 38,27 ; densité (L>60) **16,0 %** |
| `R.nom.*` (×18) | marqueur de nom | variable, suit l'encre | **aucun fond** ; texte gravé + ombre portée | encre `(173,164,144)` à `(205,189,165)` | capitales sérif espacées, hauteur de capitale **15–19 px** (médiane 16), inclinaison **−10,21° à +7,23°** | contraste sur navy **8,43:1**, sur khaki **4,44:1** ; masse d'encre 8–17 % d'une fenêtre 200×70 |
| `R.chezvous` | halo + épingle | centré ~ (900, 1600) | disque flou or + épingle | `(209,173,92)` au cœur | « LA LISIÈRE » en or, « VOUS ÊTES ICI · ⌂ 4 » | l'élément le plus clair de l'écran |
| `R.ecusson.*` (×6) | écusson de conviction | 6 boucliers | bouclier à pointe basse | corail (1,2,3,6), or (4), teal (5) | chiffre + CHASSE / SOUPÇON / VEILLE | seules formes saturées |
| `R.chaleur.*` (×2) | lavis de quartier | aire du quartier | lavis khaki | `(59,51,33)` à `(86,77,62)` | — | LES BASSINS, HAUTES-MARCHES |
| `R.aide` | texte courant | (118, 1961, 961, 2044) | deux lignes centrées | encre `(185,173,146)` sur voile `(11,16,26)` | italique sérif, contraste **8,57:1**, 6 078 px d'encre | occupe le bas, en fiction |
| `R.rose` | repère peint | axe x=985, y 535…677 | étoile à 4 branches | crème `(166,160,141)` | « N » au-dessus | hauteur 143 px sur l'axe |

### 2. Inventaire de la capture (extrait)

| id | catégorie | bbox | forme | remplissage | texte | relations |
|---|---|---|---|---|---|---|
| `J.carte` | fond / décor | (0, 231, 1080, 2151) | plein cadre | même peinture ; dominantes `(22,29,42)` 16,0 %, `(30,53,66)` 15,1 %, `(11,18,27)` 14,4 %, `(30,37,53)` 13,7 %, `(16,23,34)` 12,0 %, `(24,36,51)` 11,5 % | — | luminance 38,36 ; densité (L>60) **12,2 %** |
| `J.plaque.*` (×18) | plaque de nom | 3 colonnes × 6 rangées, **177×34 px** chacune | rectangle, **rayon 0**, sans bord, sans anti-crénelage | `(140,140,148)` **opaque** | capitales sans-sérif, encre `(235,235,236)` à `(246,246,247)`, hauteur de capitale **10–11 px**, angle 0,0° | contraste encre/plaque **2,80:1** ; plaque/carte 4,84:1 ; 0 chevauchement ; marges 63 px / 51 px aux bords |
| `J.legende.puce` | puce | (46, 2114, 254, 2128) | rectangle | `(140,140,148)` | « Chaleur : affichée », blanc, encre 11 px | bas-gauche |
| `J.legende.pastilles` | légende | x 206…478, y ~2112…2130 | 4 carrés + libellés | `(140,140,148)`, `(242,189,49)`, `(61,178,86)`, `(209,66,66)` | Libre / Disputé / À vous / Rival, `(242,242,242)`, encre 9 px | seuls aplats saturés de l'écran |
| `J.chrome` | bandeau + dock | 0…230 et 2151…2400 | — | `(28,28,34)` | « ARGENT — », « JOUR — », « Unknown / CHALEUR », EMPIRE / FAMILLE / FILIÈRE / PLUS | **non jugé** (chrome non alimenté) |
| — | halo « chez vous », écussons, lavis de chaleur, ligne d'aide | — | **absents** | — | — | voir table ASSUMÉS |

### 3. Correspondance des repères

Ajustement exhaustif (échelle uniforme + deux décalages) minimisant l'écart absolu moyen sur
4 284 points de la carte, images floutées à 6 px pour absorber le rééchantillonnage :

    X_capture = 1,0225 · x_référence − 12        Y_capture = 1,0225 · y_référence + 8

Score au minimum **12,019/255** ; carte des scores convexe autour du minimum ; contrôles négatifs
`s = 1,20` → 20,275 et `dy + 120` → 20,178. Toutes les mesures du §3 citent ce repère.
Échelle du dossier : 1 px CSS = 3,6 px des deux côtés pour le contenu — le facteur 1,0225 est donc
un **écart réel de cadrage de 2,25 %**, absorbé par la hauteur de zone libre (1920 px en jeu contre
1866 en maquette, rapport 1,029), et non un artefact d'instrument.

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre.

| script | ce qu'il mesure | contrôle |
|---|---|---|
| `m00_bandes.py` | frontières horizontales par dérivée de luminance | — (exploratoire) |
| `m01_rect_contenu.py` | transitions de couleur sur les colonnes de bord | — |
| `m02_reperes.py` | bande teal du fleuve par colonne | contrôle négatif **réfuté** : la mer du port est teal elle aussi ⇒ le prédicat ne sépare pas fleuve et mer ; résultat conservé seulement comme indice d'échelle (≈1,02), remplacé par `m04` |
| `m03_landmarks.py` | centroïdes de repères ponctuels (parcs, rose) | la rose n'a pas été trouvée dans la référence avec le prédicat choisi ⇒ **abandonné** au profit de `m04` |
| `m04_alignement.py` | **ajustement global** (s, dx, dy) | carte de scores convexe + 2 contrôles négatifs |
| `m05_plaques.py` | inventaire des 18 plaques (bbox, couleur) | le compte doit valoir 18 — il vaut 18 |
| `m06_texte_marqueurs.py` | encre, largeurs, contrastes | ⚠️ ses **hauteurs côté référence sont polluées** (pastilles or, écussons) ⇒ remplacées par `m07` ; ses contrastes et largeurs de plaque restent valides |
| `m07_capheight.py` | **hauteur de capitale** en tranches de 24 px | contrôle positif « LE THRENNY » → 1,000 |
| `m08_overlay.py` | report des 18 rects dans le repère référence | image de contrôle `vues/overlay_plaques_sur_ref.png` |
| `m09_carte_des_ecarts.py` | carte des écarts par cellules 36×30 | positif : fleuve 0,30/255 · négatif : plaques 73,2 |
| `m10_teintes_quartiers.py` | teinte de fond des quartiers | **7 témoins à ≤1/255** |
| `m11_chaleur_presente.py` | y a-t-il une teinte chaude en jeu ? | 0 cellule > +12 contre 333 < −12 |
| `m12_gouttiere.py` | bandeau / contenu / dock sur la colonne x=8 | la barre du HUD est attendue à 143 px (52 CSS-HUD × 2,755 = 143,3) — bord bas mesuré à **y=143** |
| `m13_bande_bas.py` | bande du bas des deux côtés | la puce doit valoir la même couleur que les plaques — elle la vaut |
| `m14_global.py` | palette, luminance, densité, contrastes, géométrie de plaque | occultation de la rose **mal fenêtrée ici** ⇒ refaite proprement en `m15` |
| `m15_rose.py` | troncature de la rose des vents | bras nord à 0,0 px |
| `m16_residus.py` | zones de différence **hors** plaques | positif : les 6 écussons, le halo, les lavis, l'aide ressortent tous |
| `m17_zone_bas.py` | légende EN TROP / aide ABSENTE | deux signes opposés attendus, deux signes opposés obtenus |
| `m18_inclinaison.py` | angle des noms | contrôle positif « LE THRENNY » 0,00°/−0,76° |
| `m19_positions.py` | déplacement des noms | — |
| `m20_fiches.py` | jetons de couleur | la pastille « Libre » doit égaler la plaque — elle l'égale |
| `m21_masse.py` | **masse visuelle** du marqueur | 4 fenêtres témoins : ×1,04 à ×1,18 ; le 2ᵉ témoin du premier jet tombait sur le bord du halo or ⇒ **rejeté et remplacé**, c'est dit dans la sortie |
| `m22_verifs.py` | chevauchements, marges, plaque 17 | 0 chevauchement ; la hauteur 38 de la plaque 17 était un artefact de composante, la plaque mesure bien 35 px à x=160 |

Images de travail dans `mesures/vues/` (dont `overlay_plaques_sur_ref.png`, `plaques_contact.png`,
`ref_rehaussee.png`).
