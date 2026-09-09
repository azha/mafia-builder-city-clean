# Juge visuel ⊥ — ㉝ Raser un site (« la fiche et la parcelle libérée ») — r1 — 2026-09-07

Capture jugée : `capture-1080x2400.png` (sha256 `173534a519d41ae4…`, conforme à `captures-provenance.md`).
Référence rendue : `reference-1080x2102.png` = cadre **#80**. Canon de chrome : `hud-canon-1176.png`.
Scripts : `mesures/*.py` (PIL seul), sorties `.out` à côté.

---

## Verdict : **NON APPROUVÉ**

Le châssis est juste au jeton près — mais l'écran montre une **liste de sites qui n'existe dans aucun
des six cadres du groupe**, et cette liste est **tranchée en plein texte** par le bandeau du bas.

---

## ⚠️ Témoin — le cadre rendu n'est PAS l'homologue de la capture

La référence fournie est le cadre **#80 « Ce bâtiment vous coûte »** (la fiche cartonnée).
**La capture montre le cadre #79 « L'organisation frotte »**, prouvé par trois marqueurs lus dans la
SOURCE (`ecrans-brennar-6.html`, l. 5067-5069), indépendants les uns des autres :

| marqueur | source #79 | capture | occurrences du motif dans TOUTE la page |
|---|---|---|---|
| `.dm-tete h3` | `L'organisation frotte` | `L'organisation frotte` | — |
| `.dm-tete p` | `Plus vous tenez de choses, plus elles se gênent entre elles.` | idem, mot pour mot | — |
| `.dm-glob .q i` | `… endroits se gênent entre eux. Chacun coûte un peu de ce que les autres rapportent.` | idem (avec 13 au lieu de 7) | — |
| `.dm-geste` | `VOIR CE QUI COÛTE LE PLUS` | `VOIR CE QUI COÛTE LE PLUS` | **1** (uniquement #79) |

⇒ **Homologue retenu : cadre #79, en SOURCE seulement** (aucun `etats/` dans le dossier, aucun rendu
de #79 possible ce tour). Conséquences, assumées et écrites :

- ce qui est comparable **au pixel** : tout ce que le châssis `.demo6` NOMME (47 règles CSS, jetons,
  tailles de police, paddings, marges) — et les parties **partagées** rendues par #80 (`.dm-tete`,
  `.dm-bas`, `.dm-dit`, `.dm-geste`, dont la CSS est identique entre #79 et #80) ;
- ce qui **ne l'est pas** : la couche globale (palette en %, luminance, densité). Mesurée quand même
  pour être honnête : référence 0,2573 de luminance moyenne contre 0,0324 en jeu — **écart entièrement
  produit par la fiche crème `#e9e4d4` de #80, qui occupe 29,2 % de l'image de référence et n'existe
  pas dans #79.** Ce ×8 n'accuse rien ; il est écrit ici pour qu'on ne le relise pas comme un défaut.
  (`mesures/13_or_et_bords.py`)

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes les valeurs ci-dessous sont mesurées sur la capture et confrontées au jeton **écrit dans la CSS
du châssis** (`mesures/css_demo6_full.txt`). Contrôle de l'instrument lui-même : les **9 mêmes sondes
passées sur la RÉFÉRENCE retrouvent 8/9 jetons à 0-3/255** (la 9ᵉ était ma fenêtre, mal placée), et le
contrôle négatif (fiche `#e9e4d4` contre verdict `#8c2f36`) rend 181/255 d'écart.

| # | grandeur | jeton / témoin | mesuré | écart |
|---|---|---|---|---|
| 1 | `.dm-tete` fond | `#1e1f1b` (30,31,27) | (28,28,28) | 3/255 |
| 2 | `.dm-tete` filet bas | `#3a3c34` (58,60,52) | (59,61,53) | 1/255 |
| 3 | `.dm-body` fond | `#20211d` (32,33,29) | (29,30,27) | 3/255 |
| 4 | `.dm-glob` fond / bord | `#232520` / `#3c3e35` | (34,38,34) / (59,59,51) | 2 / 3 |
| 5 | fond / bord des rangées | `#232520` / `#3c3e35` | (34,38,34) / (61,61,53) | 2 / 1 |
| 6 | `.dm-bas` fond | `#141a21` (20,26,33) | (22,28,34) | 2/255 |
| 7 | `.dm-geste` fond / bord | `#241c11` / `#5a4a2a` | (34,28,13) / (90,73,42) | 4 / 1 |
| 8 | encre des titres | `#eef3f9` | (238,243,249) | **0** |
| 9 | encre des textes secondaires (sous-titre, `.q i`, sous-titre de rangée, statut) | `#8f9285` | (143,146,133) / (141,144,131) | 0 à 2 |
| 10 | or du libellé de CTA **et** des statuts « quelqu'un y travaille » | `#d9ab4e` (217,171,78) | (217,171,77) | **1** — et *39* contre `accentGold #ffd23f`, *30* contre `hudMoneyGold #f2c96b` ⇒ c'est bien l'or du châssis, ni plus jaune ni plus gris |
| 11 | or du montant (bandeau) | `hudMoneyGold #f2c96b` (242,201,107) | (242,201,106) | **1** |
| 12 | anneau du médaillon | `--braise` (224,102,74), variante `.tel.chaud` | (222,101,73) | 2 — **conforme** au témoin `.chaud`, pas un laiton faux |
| 13 | gouttière gauche du contenu | 13 CSS × 3,6 = 46,8 px (réf : 46 px) | **46 px** | ≤1 px |
| 14 | largeur des cartes | réf 980 px | **988 px** | +8 px = **+0,8 %** |
| 15 | écart entre rangées | `.dm-offre{margin-bottom:5px}` → 18,0 px | **18 px, constant sur les 7 intervalles** | 0 |
| 16 | retrait du texte dans une rangée | `.dm-offre{padding:8px 10px}` → 36 px | 34 px (encre) ; statut finit à x=995 pour 994 attendu | 1-2 px |
| 17 | typographie du titre `h3` | réf : x-hauteur 24 px, ascendante 34 px | **24 px / 34 px** | 0 |
| 18 | typographie du sous-titre `p` | réf : x-hauteur 15 px, ascendante 20 px | **15 px / 20 px** | 0 |
| 19 | `.dm-titron` hauteur de capitale | 6,6 px × 0,729 × 3,6 = 17,3 px | 18 px | 0,7 px |
| 20 | `.dm-glob .gros` hauteur de chiffre | 15 px × 0,729 × 3,6 = 39,4 px | 41 px | 1,6 px |
| 21 | `.dm-geste` hauteur de capitale | 24,9 px attendus (réf : 25 px) | 26 px | 1 px |
| 22 | hauteur du bandeau | 52 CSS-HUD × 2,755 = 143,3 px (dérivé du dossier) | **143 px** | 0,3 px |
| 23 | gouttière respectée | contenu entre bandeau et dock | contenu 145 → 2152 ; bandeau finit 143 ; dock commence 2152 | **rien sous le chrome** |
| 24 | contrastes (11 mesures) | ≥ 3:1 grands, ≥ 4,5:1 petits | de 4,84:1 à 15,28:1 — **11/11 au-dessus du seuil** | — |
| 25 | aiguille du manomètre | canon 37 % → −43° (gauche) | « Brûlant » → **+85°, côté chaud** | **non inversée** |
| 26 | police | `fc-match "DejaVu Serif"` → DejaVu Serif ; `"DejaVu Sans"` → DejaVu Sans ; **0 `Georgia` dans le bloc `.demo6`** | référence et client sur la MÊME famille | **aucun ARBITRAGE de police sur cet écran** |
| 27 | rails horizontaux continus | un pointillé réel de la référence rend **151 runs / 48,7 %** ; un rail plein rend **1 run / 100 %** | **19 rails sur 19 : 1 run, 99,0-100,0 %, 0 trou ≥ 8 px** | voir la section « recherche ciblée » |
| 28 | langue | français réel, résolveurs nommés | 100 % français à l'écran, **aucune clé i18n brute, aucun repli anglais** | — |

---

## 0. L'écran, tel que la maquette le dit (cadre #79, source)

**But.** Faire comprendre au joueur que son organisation **frotte** : trop de choses tenues au même
endroit, chacune rogne le rendement des autres — et l'amener à **enlever une** de ces choses. C'est
le premier des six écrans du groupe ㉝ ; il ouvre sur la fiche du site (#80), puis la confirmation
(#81), puis la parcelle libérée (#83).

**Ordre de lecture voulu.**
1. le **titre** sérif blanc `#eef3f9`, 12 CSS gras — « L'organisation frotte » ;
2. le **grand nombre** de `.dm-glob` (15 CSS sérif gras, coloré `#d97a6a` dans l'état livré) et son
   verdict en une ligne — « Ça grince partout » ;
3. la **bande d'avertissement** `.dm-penal` (fond `#2e2114`, bord ambre `#8a6a22`, texte `#e8d3a4`) —
   « Tout produit moins en ce moment. » : la conséquence chiffrable ;
4. la **réplique du lieutenant** en italique sérif dans le bandeau bas navy — elle dit quoi faire ;
5. le **CTA** or bordé — « VOIR CE QUI COÛTE LE PLUS / *site par site* », **seul chemin vers la suite**.

**Zones.** `.dm-tete` (titre + sous-titre, fond `#1e1f1b`, filet bas) · `.dm-body` (l'état global :
une carte + une bande) · `.dm-bas` (socle navy `#141a21`, **filet haut 2 px `#2c3640`**, réplique,
CTA).

**Traits d'identité.** (a) le contraste de **famille chromatique** entre le corps olive-chaud
(`#20211d`, `#232520`, `#3c3e35`, `#8f9285`) et le socle **navy** du bas ; (b) le **grand nombre**
comme héros de la zone centrale ; (c) le **CTA or bordé, sur une seule ligne**, libellé + `<small>`
alignés en fin de course ; (d) une zone centrale **courte** — deux blocs, beaucoup d'air ; (e) la
typographie sérif pour les affirmations, sans-sérif pour les explications.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Le **châssis** est fidèle (27 grandeurs égales, dont tous les jetons de couleur à ≤4/255 et la
typographie au pixel), mais la **charpente de la page a changé** : là où #79 pose deux blocs courts et
laisse respirer, le client insère **une liste de 8 rangées sous un titron « VOS 17 SITES » qui occupe
58,4 % de la hauteur de contenu** (1 172 px sur 2 007) et qui n'a **aucune contrepartie** dans les six
cadres du groupe — les 13 classes `.dm-*` du châssis ne comportent aucune liste, et les motifs
`VOS … SITES`, `Colis Kofi`, `quelqu'un y travaille` rendent **0** dans toute la page.

Le premier regard s'en trouve renversé. L'œil ne va plus « titre → nombre → avertissement → CTA » mais
« titre → nombre → **mur de rangées** », et il bute sur une rangée **coupée en plein texte** : la 8ᵉ
n'est visible qu'à **46 %** (59 px sur 129), son sous-titre, son statut et son bord bas sont sous le
socle, et le titre « Laverie du Quai » perd ses jambages. Aucun filet ne sépare les deux couches — le
**filet 2 px `#2c3640`** que la référence porte sur exactement 7 px est **absent** (sonde validée : elle
trouve 7 518 px du jeton dans la référence, **97 pixels épars et aucune ligne** dans toute la zone de
contenu de la capture) : la coupe se lit donc comme une casse, pas comme un bord.

Troisième écart de tête, de **sens** : les deux premières choses lues se contredisent. Le titre dit
« L'organisation frotte », le sous-titre enfonce le clou (« plus elles se gênent entre elles »), le
compte dit « **13 endroits se gênent entre eux** » — et le verdict, juste à côté du 13, dit « **Ça
tient** ». La maquette n'a jamais eu à trancher ce cas (elle ne montre que l'état alarmant), mais un
joueur lit ici une alarme et un démenti dans le même bloc.

Le reste tient : palette, contrastes (11/11 au-dessus du seuil), gouttières, rythme des rangées à 18 px
exactement, or au bon jeton, français partout, aiguille du bon côté, rien sous le bandeau ni sous le
dock.

---

## 3. Écarts

Un finding par ligne. `critère` = `NOUVEAU` partout : premier tour, aucun instrument antérieur.
`données` = l'écart dépend-il du compte photographié ? (Géométrie, palette, typographie, rythme : non.)

| id | gravité | critère | écart | mesure | données | destinataire | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|---|
| `B1` | **BLOQUANT** | NOUVEAU | La liste est **tranchée en plein texte** par `.dm-bas` : la 8ᵉ rangée est coupée à mi-carte, ses jambages sont sectionnés, son sous-titre / son statut / son bord bas sont hors champ. Aucune affordance de défilement n'est visible. Le titron annonce **17 sites**, **7 sont lisibles**. | rangées pleines : haut 725/872/1020/1168/1315/1463/1610, hauteur 129-130 px. 8ᵉ rangée : haut 1758, `.dm-bas` commence à **1817** ⇒ **59 px visibles sur 129 = 46 %**. Compte d'encre sur les lignes juste avant la coupe : 192 px à y=1815, 172 px à y=1816, puis 0 — **l'encre est coupée à pleine intensité**, elle ne s'éteint pas. (`09_coupe.py`, `14_rythme.py`) | non | correcteur | si la liste **défile** — une image ne le dit pas ; et ce que porte le statut de la rangée coupée (« … » : trois points, ou le haut d'un mot ?) |
| `M1` | MAJEUR | NOUVEAU | **Zone EN TROP** : titron « VOS 17 SITES » + liste de rangées, sans homologue dans les 6 cadres du groupe. Elle devient le corps de l'écran et déplace l'ordre de lecture ; elle rend en outre le CTA redondant (il propose d'aller voir ce que la liste montre déjà). | 13 classes `.dm-*` définies dans le châssis, **aucune de liste** ; dans toute la page : `VOS `→3 (aucune suivie de `SITES`, motif `SITES`→**0**), `Colis Kofi`→0, `quelqu'un y travaille`→0, `dm-liste`/`dm-site`/`dm-rang`→0. La zone occupe **1 172 px sur 2 007 = 58,4 %** de la hauteur de contenu. (`mesures/src_cadres_79_84.txt`, `16_divers.py`) | non (la zone) / oui (son contenu) | arbitrage user, puis blender | si la liste est une décision produit déjà prise ailleurs — le dossier ne porte aucune table d'écarts assumés (premier tour) |
| `M2` | MAJEUR | NOUVEAU | **Contradiction de sens dans le bloc d'état** : le verdict `.q b` dit « Ça tient » pendant que le titre, le sous-titre et le compte disent l'inverse. | titre « L'organisation frotte » + sous-titre « … plus elles se gênent entre elles. » + `.q i` « **13** endroits se gênent entre eux » + titron « VOS **17** SITES » ⇒ 13 sites sur 17 en friction, verdict « Ça tient ». La chaîne « Ça tient » rend **0** dans toute la maquette (la seule variante écrite est « Ça grince partout »). | oui | arbitrage user (libellé de l'état calme), puis blender | le seuil au-delà duquel le back bascule le verdict — aucun rapport juge-données n'existe pour cet écran |
| `M3` | MAJEUR | NOUVEAU | **Deux rangées strictement identiques** (« Réparation Ilm · Un labo · c'est juste · quelqu'un y travaille ») et **aucune rangée ne porte le qualifiant de lieu** que la maquette attache à un site. Sur un écran dont le but est de choisir *quel* site raser, deux lignes indiscernables bloquent le choix. | rangées 5 et 6 : mêmes trois textes, même statut, même or (217,171,77) mesuré sur les deux. Convention de nommage de la maquette (`.dm-fiche h4`, cadres #80/#81/#82) : « **Imprimerie Skeld — Les Friches, îlot 1604** » — nom + quartier + îlot. Rangées en jeu : nom seul. | oui (le doublon) / non (le qualifiant absent) | correcteur | si le back projette le quartier/îlot pour ces rangées (pas de corps réel comparable au compte gelé dans le dossier) |
| `M4` | MAJEUR | NOUVEAU | **Le CTA passe sur deux lignes** : libellé replié en « VOIR CE QUI COÛTE LE / PLUS » et `<small>` replié en « le plus mauvais / rapport ». La maquette écrit un `<small>` court et le CTA tient sur une ligne. | `<small>` maquette = `site par site` (13 signes) ; en jeu = `le plus mauvais rapport` (23 signes) — chaîne absente de la page (`le plus mauvais`→0). Hauteur du CTA : **réf 105 px (29,2 CSS, une ligne)** contre **jeu 144 px (40,0 CSS, deux lignes)** = **+37 %**. (`14_rythme.py`) | non | correcteur (ou blender si le libellé long est voulu) | — |
| `m1` | MINEUR | NOUVEAU | **Absence du filet haut 2 px de `.dm-bas`** (`#2c3640`). C'est lui qui, dans la maquette, déclare le socle comme une couche distincte ; sans lui, la coupe de `B1` se lit comme une casse. | sonde par jeton ±8/255 : **référence 7 518 px sur les lignes 1780→1786 (7 px, = 2 CSS × 3,6)** ; **capture : 0 ligne** entre y=1780 et 1840, et **97 pixels épars** (anti-crénelage de texte) dans toute la zone de contenu. Contrôles positifs de la même sonde sur la capture : `#241c11`→31 052 px, `#3c3e35`→17 075 px, `#141a21`→53 200 px ⇒ **la sonde n'est pas muette**. (`09_coupe.py`, `15_absences.py`) | non | correcteur | — |
| `m2` | MINEUR | NOUVEAU | **`.dm-penal` absent** (la bande ambre « Tout produit moins en ce moment. »). Très probablement l'état calme — mais aucun cadre d'état calme n'est rendu, donc non tranchable. | sonde sur les 3 jetons de `.dm-penal` dans toute la zone de contenu : fond `#2e2114` → 1 081 px **épars de y=151 à 2093** (anti-crénelage, aucune bande) ; bord `#8a6a22` → 160 px **tous à l'intérieur du CTA** (y 1988-2057) ; texte `#e8d3a4` → **0**. (`15_absences.py`) | oui | — (à trancher au rendu du cadre d'état) | s'il existe un cadre d'état « calme » qui supprime légitimement la bande — non rendu ce tour |
| `m3` | MINEUR | NOUVEAU | **`.dm-tete` plus courte de 7 px** que la référence : la marge basse sous le sous-titre est raccourcie d'environ 2 CSS. | réf : `.dm-tete` 434→604 = **170 px** (47,2 CSS — la CSS prédit 47,25, mesure exacte). Jeu : 232→**395** = **163 px** (45,3 CSS). Le haut est identique (haut de capitale à +46 px du bord dans les deux) ; l'écart est **entièrement en bas**. (`02`, `13`) | non | correcteur | — |
| `m4` | MINEUR | NOUVEAU | Le grand nombre `.gros` est rendu en **gris-bleu froid** `#9aa6b3` là où le seul état écrit de la maquette met `#d97a6a`. La couleur existe ailleurs dans la série 6 (écart 0/255 sur `#9aa6b3`) mais **n'est pas un jeton du bloc `.demo6`** (13 classes, 0 occurrence). | encre mesurée (154,166,179) ; le motif `#9aa6b3` existe dans la page, **0** dans `chassis6.py` et **0** dans le bloc `.demo6`. Contraste 6,20:1 (au-dessus du seuil). (`04_couleurs.py`, grep des hex) | oui | arbitrage user (couleur de l'état calme) | quelle couleur le châssis prévoit pour un état calme — non écrite |
| `m5` | MINEUR | NOUVEAU | Le **statut de rangée** est un texte nu en bas de casse ; l'idiome le plus proche du châssis (`.dm-offre .tag`, la seule « étiquette de fin de rangée » que la maquette définisse) est **majuscule, gras, interlettré, encadré d'un filet 1 px `currentColor` et arrondi 2 px**. | `.dm-offre .tag{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.8px;border:1px solid currentColor;border-radius:2px;padding:3px 5px}` ; en jeu : « libre » / « quelqu'un y travaille » sans filet, sans majuscules, ascendante 18 px (≈6,6 CSS — **la taille est bonne**). | non | correcteur (si `.dm-offre` est l'idiome visé) | quel idiome le châssis destine à une rangée de liste — il n'en définit aucun (voir `M1`) |

**Compte : 1 BLOQUANT · 4 MAJEURS · 5 MINEURS.**

---

## Table à part — ASSUMÉ (vérifié « rendu proprement »)

| ce qu'on voit | pourquoi c'est assumé | rendu proprement ? |
|---|---|---|
| Phase de l'aile droite à « — » (JOUR 50 alimenté, ARGENT alimenté) | règle de doctrine : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district ⇒ état VOULU hors ① | oui — un tiret, pas un vide ni un « Unknown » |
| Anneau du médaillon en **braise** au lieu du laiton du canon | témoin = la CSS `.tel.chaud` (4 règles en `--braise`), pas le PNG calme. Mesuré (222,101,73) contre (224,102,74) | oui — et le filet du bandeau est braise lui aussi, cohérent |
| Hauteur du bandeau (143 px) ≠ l'évocation de barre du cadre de série 6 | chrome partagé, échelle ×2,755 et non ×3,6 | oui |
| Onglet actif = EMPIRE alors que le chemin annoncé est « Plus → RASER UN SITE » | la planche est une **surimpression sous chrome** ; le dossier déclare l'onglet actif **non asserté** | conséquence de la chaîne de capture, pas de l'écran |
| Locuteur « Dima » au lieu de « Lt. Rin » | nom du lieutenant du compte photographié ; la réplique est **identique mot pour mot** à celle de #79 | oui |

## Table à part — ARBITRAGE (non corrigible côté écran)

| point | mesure / source | à qui |
|---|---|---|
| **Flèche retour ←** dans le bandeau | aucune barre de la série 6 n'en porte ; arbitrage user connu | user (déjà tranché) |
| **Ronds du dock vides** (aucune icône) où le canon pose une icône 20×20 dans chacun | arbitrage user connu (« j'aime pas les icônes ») | user (déjà tranché) |
| Dock : 3ᵉ onglet **« FILIÈRE »** où le canon écrit « MARCHÉ » ; marqueur d'actif = **soulignement or sous le rond** où le canon met un **point or au-dessus** | comparaison directe au canon | shell, pas cet écran |
| **Losange or ◆** sous le médaillon (y≈224, dans la bande d'ornement de 87 px que le shell réserve) | le canon ne le montre pas — **mais sa pastille d'annotation ② occupe exactement cette position** ⇒ non tranchable sur cette image | shell + dossier (canon annoté) |
| Maquette en anglais / en dollars : `$ 24 850`, `Heat`, `HEAT` | ruling « fr réel » du 2026-09-02 : le client a raison (`9 627 820,00 €`, `CHALEUR`), la **maquette est en retard** | blender (mettre la maquette à jour) |
| **Aucun** arbitrage de police sur cet écran | `fc-match "DejaVu Serif"` → DejaVu Serif ; `"DejaVu Sans"` → DejaVu Sans ; **0 `Georgia` dans le bloc `.demo6`** (8 `DejaVu Serif`, 16 `DejaVu Sans`) ⇒ référence et client partagent la même famille, et les métriques sont opposables : elles sont **égales** (x-hauteur 24/24, ascendante 34/34) | — |

## Table à part — CHROME (jugé contre `hud-canon-1176.png`, ne relève pas de cet écran)

| observation | mesure |
|---|---|
| Manomètre : **aiguille du bon côté**, arcs bien **annulaires** | pointe crème à **+85°** (droite = chaud) contre **−43°** au canon pour 37 % ; bande radiale de l'arc teal r/R **0,41→0,52** en jeu et **0,48→0,56** au canon (un secteur plein donnerait une bande large) — arc chaud en jeu r/R 0,45→0,52, angles +22°→+86° |
| Montant du bandeau **au ras du médaillon** sans le toucher | dernière encre dorée à **x=446** ; bord gauche du disque **457,6 px** à y=71, **449,9 px** à y=97 ⇒ **jeu de 11,6 à 3,9 px** selon la ligne. Aucun recouvrement à cette valeur ; la marge est nulle pour un montant plus long. |
| Barre de progression du montant pleine (or sur toute sa longueur) là où le canon montre une portion grise | donnée du compte |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit que `1080×2400`. La ligne GO le publie elle-même : « (a) deux
résolutions 1920+2400 → **NON — 2400 seulement** ». Rien n'est donc jugé sur le reflux, le hors-cadre
ou le débordement à une autre taille — voir « non vérifié ».

---

## 6. Non vérifié

| # | ce que je n'ai pas pu voir | la mesure hors image qui trancherait |
|---|---|---|
| 1 | **Le cadre d'état homologue (#79) n'est pas rendu.** Tout ce que la CSS ne NOMME pas (couche globale, rythme réel de #79, longueur des blocs) reste hors de portée. La couche globale mesurée sur la référence (#80) est **inutilisable** : luminance 0,2573 contre 0,0324, écart entièrement dû à la fiche crème de #80 (29,2 % de l'image). | rendre `ecrans-brennar-6.html` #79 avec `Tools/rendre-tel.py … 3.6` |
| 2 | **Une seule résolution** (2400). Rien sur 1920 : coupe, reflux, débordement, proportions à l'autre taille. | la planche 1080×1920 de la même campagne |
| 3 | **Aucune paire T / T+1 s** ⇒ le ruling « aucune animation sur un écran neuf » (2026-08-27) est **non vérifiable** ici. | deux captures du même état à 1 s d'écart, puis compte des pixels qui bougent (chrome exclu, nommé) |
| 4 | **La liste défile-t-elle ?** L'image ne peut pas le dire ; `B1` est classé sur ce qu'un joueur *voit*, pas sur ce qu'il pourrait faire. | une capture après un geste de défilement, ou la déclaration de la suite |
| 5 | **Identité du compte photographié** : déclarée par corps de commit (`72 118` · 17 bâtiments · 3 lt · 2 planques · 7 cartes), journal **non joint**. Aucune valeur affichée n'est donc opposable. Note : le titron dit « VOS **17** SITES » et l'empreinte déclare **17 bâtiments** — cohérent, mais **non relu**. | joindre la ligne `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal du run |
| 6 | **Statut de la rangée coupée** (« … ») : trois points ou le haut d'un mot plus long — la coupe m'empêche de lire. | la même planche avec la liste non tronquée |
| 7 | **Rayons d'arrondi.** Ma sonde ne rend qu'une **borne inférieure** (rangée 5 px, `.dm-glob` 7 px, CTA 9 px) ; le contrôle négatif (coin carré du bandeau) rend bien 0, donc elle discrimine — mais elle ne permet pas d'affirmer la valeur. Les trois sont **compatibles** avec les 3 CSS (10,8 px) du châssis, sans le prouver. | une sonde qui ajuste un cercle sur le bord, ou un tour à plus haute résolution |
| 8 | **Le losange ◆** sous le médaillon : le canon ne le montre pas, mais **sa pastille d'annotation ② couvre exactement cette position**. Les pastilles ①..⑥ polluent aussi mes bornes verticales sur le canon (je n'ai donc rien conclu de la géométrie verticale du canon au-delà du bandeau). | un canon HUD **non annoté**, ou une capture du shell sur un autre écran |
| 9 | **D'où viennent les valeurs affichées** (13, 17, les statuts, « Ça tient ») : aucun rapport juge-données n'existe pour cet écran. | une passe `juge-donnees` sur les corps réels du compte gelé |
| 10 | **Les planches `ecran_demolition_*`** d'une campagne antérieure sont déclarées **vides** (0,000 % d'encre) et ne sont pas fournies : je n'ai pas pu vérifier cette déclaration. | les blobs de la campagne `1d3d412`, ou la mesure d'encre qui l'a établie |
| 11 | **Le SHA de l'arbre de rendu** n'est pas imprimé (« dernier commit » = commit du PNG). La capture est une mesure datée du 06/09 14:56 ; l'écran a pu bouger depuis. | `git rev-parse HEAD` imprimé au run par la suite de planches |

---

## Recherche ciblée — cadre pointillé à trou central (classe signalée par l'orchestrateur)

**Résultat : la classe n'est PAS présente sur ㉝ r1.** Mesuré, pas supposé (`mesures/17_pointilles.py`).

- **La sonde discrimine.** Contrôle positif sur un pointillé réel de la référence — le séparateur
  `.dm-fiche .l{border-top:1px dotted #c2bda4}` : **151 runs courts, 48,7 % de couverture**, sur les
  5 lignes (y = 790, 862, 934, 1005, 1077). Contrôle négatif sur un rail plein — le filet 2 px de
  `.dm-bas` : **1 run, 100,0 %**.
- **Les 19 rails horizontaux de la capture sont continus** : `.dm-glob` (haut + bas), les 8 rangées
  (haut + bas), le CTA (haut + bas), le filet bas de `.dm-tete` → **1 seul run chacun, couverture
  99,0 % à 100,0 %, et AUCUN trou ≥ 8 px**. Ni central, ni décentré, ni symétrique : aucun.
- **Aucun cadre pointillé n'existe sur cet écran.** Le seul bord tireté du châssis est
  `.dm-parcelle{border:2px dashed #5a5c4e}`, qui appartient aux cadres **#83 / #84** (la parcelle
  libérée), pas au cadre #79 que la capture montre. Balayage du jeton `#5a5c4e` ±8/255 sur toute la
  zone de contenu : **1 717 px épars de y=161 à y=1816** — la même sonde rend **42 px** sur la
  référence, où ce bord est également absent : dans les deux cas c'est le plancher de bruit
  (anti-crénelage des bords de carte `#3c3e35`, voisin à 30/255), **pas une bordure**.

⇒ Rien à classer « bord périodique étiré par un 9-slice » ici. Si la classe doit être suivie sur ㉝,
c'est **au tour où un cadre d'état #83/#84 sera monté** (la parcelle libérée est le seul écran du
groupe qui porte un cadre tireté) — non capturé ce tour.

---

## Annexes

### 1. Inventaire de la référence — cadre #79 (source) et #80 (rendu)

Châssis `.demo6` (l. 4997-5064 de `ecrans-brennar-6.html`, recopié dans `mesures/css_demo6_full.txt`) :
**13 classes**, `dm-bas · dm-body · dm-dit · dm-fiche · dm-geste · dm-glob · dm-offre · dm-parcelle ·
dm-penal · dm-rien · dm-tete · dm-titron · dm-verdict`. Aucune classe de liste.

| id | catégorie | bbox (réf #80, px) | forme | remplissage | bord | texte |
|---|---|---|---|---|---|---|
| `R.tete` | bandeau de titre | y 434→604 (170 px) ; x 4→1076 | rect plein | `#1e1f1b` mesuré exact | filet bas 1 CSS `#3a3c34` (3,6 px, mesuré 604-607) | `h3` 700 12 px DejaVu Serif `#eef3f9` (x-haut. 24 px, asc. 34 px) ; `p` 7 px DejaVu Sans `#8f9285` (x-haut. 15 px) |
| `R.body` | corps | y 607→1780 | — | dégradé `#20211d`→`#141513` (haut mesuré (29,30,27)) | — | padding 10 / 13 / 0 CSS — mesuré : première encre à 643 = 607 + 36 px, **exact** |
| `R.fiche` | carte (#80 seul) | y 643→1352 ; x 50→1030 | rect r=2 CSS | `#e9e4d4` mesuré exact | filet gauche 5 CSS `#8c7a3f` (x 50→68, mesuré 18 px) | `h4` 700 10 px serif ; 5 lignes `.l` séparées d'un pointillé `#c2bda4` (mesuré y 790/862/934/1005/1077, **pas de 71-72 px**) |
| `R.verdict` | bandeau rouge (#80 seul) | y 1181→1312 | rect r=2 CSS | `#8c2f36` mesuré exact | — | 700 8 px `#f6efe2` + `i` 6,4 px `#f0d8cf` |
| `R.bas` | socle | y 1780→2085 (305 px) | rect plein | `#141a21` mesuré exact | **filet haut 2 CSS `#2c3640` — 7 px, y 1780→1786, 7 518 px mesurés** | — |
| `R.dit` | réplique | y ≈1806→1860 | — | — | — | italique 8,6 px DejaVu Serif `#cdd6e0` (cap 24 px) ; `b` `#eef3f9` |
| `R.geste` | CTA | y 1938→2043 (**105 px**) ; x 50→1030 | rect r=3 CSS | `#241214` (variante `.rouge`) mesuré exact | 1 CSS `#5c2a2a` mesuré exact | 700 9,5 px `#d97a6a` (cap 25 px) + `small` 6,5 px, **une seule ligne**, contraste 5,93:1 |
| `#79.glob` | carte d'état (source) | — | rect r=3 CSS | `#232520` | 1 px `#3c3e35` | `.gros` 700 15 px serif ; `.q b` 700 9 px serif `#eef3f9` ; `.q i` 6,5 px `#8f9285` |
| `#79.penal` | bande d'alerte (source) | — | rect r=2 CSS | `#2e2114` | 1 px `#8a6a22` | 7,2 px `#e8d3a4`, `b` `#f0dfc4` |
| `#79.geste` | CTA (source) | — | rect r=3 CSS | `#241c11` | 1 px `#5a4a2a` | 700 9,5 px `#d9ab4e` + `small` 6,5 px `#9a8a6a` = « site par site » |

Couche globale (référence #80, **non comparable** — voir le bloc « Témoin ») : luminance moyenne
**0,2573** ; 6 premières couleurs quantifiées : (216,216,192) 29,2 % · (24,24,0) 14,9 % ·
(24,24,24) 14,2 % · (0,24,24) 11,4 % · (0,24,0) 8,7 % · (120,24,48) 5,8 %.

### 2. Inventaire de la capture

| id | catégorie | bbox (px) | forme | remplissage | bord | texte / relations |
|---|---|---|---|---|---|---|
| `C.bandeau` | chrome haut | y 0→143 | plein largeur | navy | filet bas **braise** (222,101,73) | ← · ARGENT / `9 627 820,00 €` en `#f2c96a` + barre or · JOUR 50 · phase « — » |
| `C.medaillon` | chrome | centre (539,5 ; 109,5) R=90,5 | disque | dial sombre | anneau braise | « Brûlant » serif + « CHALEUR » ; aiguille +85° ; déborde jusqu'à y=200 |
| `C.ornement` | chrome | y 145→232 (87 px, 4,3 %) | bande | `#20211d` (31,32,28) | — | losange or ◆ à y≈224 |
| `C.tete` | bandeau de titre | y **232→395** (163 px, 8,3 %) | rect plein | (28,28,28) = `#1e1f1b` à 3/255 | filet bas (59,61,53) sur 3 px | `h3` « L'organisation frotte » (x-haut. **24**, asc. **34**, `#eef3f9`, 15,28:1) ; `p` (x-haut. **15**, `#8d9083`, 5,37:1) |
| `C.glob` | carte d'état | y 435→610 (175 px, 8,7 %) ; x 46→1034 | rect arrondi | (34,38,34) = `#232520` à 2/255 | 4 px (59,59,51) = `#3c3e35` à 3/255 | `.gros` « 13 » **`#9aa6b3`** (chiffre 41 px, 6,20:1) ; `.q b` « Ça tient » `#eef3f9` 13,76:1 ; `.q i` sur 2 lignes `#8f9285` 4,84:1 |
| `C.titron` | libellé de section | encre y 658→675 ; x 47→ | — | — | — | « VOS 17 SITES » majuscules interlettrées, cap **18 px**, `#8f9285`, 5,28:1 — **conforme à `.dm-titron`** |
| `C.liste` | **EN TROP** | y 645→1817 (**1 172 px, 58,4 %**) | 8 rangées | idem `C.glob` | idem | 7 rangées pleines (129-130 px, **écart 18 px constant**) + 1 coupée à 46 % |
| `C.rangée` | carte de site | ex. y 725→854 ; x 46→1034 | rect arrondi | `#232520` | `#3c3e35` | titre serif gras cap **24 px** `#eef3f9` (13,76:1) ; sous-titre sans cap 18 px `#8f9285` (4,84:1) ; statut fin de ligne `#8f9285` ou **or `#d9ab4e`** (7,22:1), fin à x=995 |
| `C.bas` | socle | y **1817**→2152 (335 px, 16,7 %) | rect plein | (22,28,34) = `#141a21` à 2/255 | **aucun filet haut** | — |
| `C.dit` | réplique | y ≈1848→1905 | — | — | — | « **Dima :** « On a trop de choses au même endroit. Il va falloir en enlever une. » » italique serif `#cdd6e0`, 11,68:1 — texte identique à #79 |
| `C.geste` | CTA | y 1954→2098 (**144 px**) ; x 46→1034 | rect arrondi | (34,28,13) = `#241c11` à 4/255 | (90,73,42) = `#5a4a2a` à 1/255 | « VOIR CE QUI COÛTE LE / PLUS » `#d9ab4d` cap 26 px (7,97:1) + `small` « le plus mauvais / rapport » (151,135,104) (5,01:1) — **2 lignes** |
| `C.dock` | chrome bas | y 2152→2400 | 4 ronds vides + libellés | navy | cercle fin | EMPIRE (souligné or) · FAMILLE · FILIÈRE · PLUS |

Couche globale (zone de contenu 145→2152) : luminance moyenne **0,0324** ; couleurs quantifiées :
(24,24,24) 71,7 % · (24,24,0) 10,0 % · (0,24,24) 9,6 % · (48,48,48) 3,0 % · (0,24,0) 1,3 % ·
(216,240,240) 0,9 %. Densité d'encre claire ≈ 1 % — cohérente avec un cadre #79 (aucune carte crème
dans ce cadre), **non opposable** à la référence rendue.

### 3. Correspondance des repères

- **Contenu** : référence et capture toutes deux à **1 px CSS = 3,6 px**, rapport **1,00**. Tout écart
  de taille sur le contenu est un écart réel.
  *Vérifié* : gouttière 46 px des deux côtés (13 CSS = 46,8) ; `.dm-tete` de référence 170 px pour
  47,25 CSS prédits par la CSS (11 + 13,8 + 4 + 9,45 + 9) ; première encre de `.dm-body` à 643 = filet
  607 + padding 10 CSS × 3,6 = 36 px, **exact**.
- **Chrome** : ×2,755 px par px CSS-HUD. *Vérifié* : bandeau 143 px pour 52 CSS × 2,755 = 143,3.
- **Offset vertical référence → capture** : le haut de capitale du `h3` est à 480 (réf) et 280 (jeu),
  celui du `p` à 543 et 341 ⇒ **−200 / −202 px**. Toutes les comparaisons du temps 3 citent cet offset
  ou une grandeur invariante d'échelle (%, rapport interne).
- **Zones de référence** : réf `.demo6` 434→2097 (1 663 px = 462 CSS, valeur de l'attribut `style`) ;
  capture, contenu 145→2152 (2 007 px = 557,5 CSS). L'écart de hauteur est absorbé par la zone
  centrale — dans la capture, **par la liste**.
- **Non annoté / annoté** : `hud-canon-1176.png` porte les pastilles ①..⑥ ; je n'ai utilisé le canon
  que pour le **bandeau**, le **médaillon** et le **dock**, jamais pour une borne verticale globale.

### 4. Scripts

Tous dans `mesures/`, PIL seul, chacun imprime la taille des images qu'il ouvre ; sortie collée dans
le `.out` du même nom.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `01_geometrie.py` | bandes horizontales des 3 images par transition de médiane de ligne | contrôle négatif : les hauteurs diffèrent, l'instrument le dit |
| `02_profil_fin.py` | profil fin sur les plages douteuses + médianes de fenêtre | 4 jetons de la référence retrouvés exactement |
| `03_crops.py` | découpes d'inspection | chaque sortie imprime sa boîte et sa taille |
| `04_couleurs.py` | 10 aplats + 15 encres | **8/9 jetons de la référence à ≤3/255** ; négatif fiche/verdict = 181/255 |
| `05_manometre.py` | 1ʳᵉ tentative sur l'arc — **abandonnée** : verdict **uniforme** (26,2 px à tous les angles) ⇒ l'instrument mesurait autre chose ; la détection d'anneau était contaminée par le **filet braise pleine largeur** | conservé comme trace : la « collision montant/médaillon de 31,5 px » qu'il rendait est **fausse** |
| `06_arc_polaire.py` | bande radiale des arcs, anneau détecté **hors filet** | positif : le canon rend une bande étroite (0,09) |
| `07_aiguille.py` | angle de l'aiguille et spans angulaires | positif : canon à −43° pour 37 % |
| `08_geom.py` | bords verticaux des cartes, filet de `.dm-bas` | négatif : une bande vide ne rend que les bords du châssis |
| `09_coupe.py` | où la liste est coupée ; présence du filet | positif (réf) 7 lignes ; négatif (aplat) 0 ligne |
| `10_typo.py` / `11_typo2.py` | hauteurs d'encre par lettre, puis **par runs de glyphes** — c'est `11` qui fait foi : `10` comparait un `C` rond à un `L` plat et **surestimait l'écart de 10 %** | négatif : une bande sans texte rend 0 colonne |
| `12_contraste.py` | 18 contrastes WCAG | blanc/noir = 21,00:1 ; identique = 1,00:1 ; label de fiche = 3,39:1 pour ~3,4 prédits |
| `13_or_et_bords.py` | famille de l'or, bord exact de `.dm-tete`, couche globale | l'or retombe à 1/255 sur `#d9ab4e`, à 39 et 30 des deux autres candidats |
| `14_rythme.py` | rythme des rangées, retraits, rayons | négatif : coin carré du bandeau → rayon 0 |
| `15_absences.py` | absences de `.dm-penal` et du filet | 3 contrôles positifs à 17 000-53 000 px sur la même sonde |
| `16_divers.py` | jeu montant/médaillon, parts de hauteur | — |
| `17_pointilles.py` | runs contigus sur chaque rail horizontal ; recherche d'un cadre pointillé / d'un trou central | positif : pointillé de la fiche = 151 runs / 48,7 % ; négatif : rail plein = 1 run / 100 % |
