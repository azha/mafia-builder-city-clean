# Juge visuel ⊥ — ㉔ L'autonomie (« le burner ») — r1 — 2026-09-06

Dossier : `/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/autonomie/r1-2026-09-06/`
Référence : `reference-1080x2102.png` (cadre NOMINAL série 6 #25) · Capture : `capture-1080x2400.png`
(client `76ee3cc`, 2026-09-04 11:22, compte `operational_demo@example.test`).
Témoin : le cadre **#25** (nominal, « deux messages »), conformément au dossier — la capture montre
bien des rapports et non l'état vide, donc #25 est l'homologue et non #30.

## Verdict : NON APPROUVÉ

L'écran en jeu n'est pas une version imparfaite de la maquette : c'est **un autre écran**. Le
téléphone à clapet — châssis, dalle LCD verte, clavier numérique — est **absent en totalité**
(0 pixel vert dans le rect libre, contre 1 148 204 dans la référence). Il ne reste qu'un panneau gris
de 506 px de large collé sous le bandeau, dont le titre est tronqué, l'action principale percée par
le manomètre, et le texte en anglais avec des clés d'i18n brutes et un UUID en guise de nom.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Cette section établit que le « tout est faux » ci-dessous n'est pas un artefact d'instrument : le
**chrome est fidèle au 1/255 près**, et chaque détecteur porte son contrôle. C'est le contenu qui manque.

| # | grandeur | référence / canon | capture | delta | script |
|---|---|---|---|---|---|
| P1 | largeur d'image (échelle ×3,6 des deux côtés, cf. dossier) | 1080 px | 1080 px | **0** | `m1` |
| P2 | hauteur du bandeau (dérivée du code : 52 CSS-HUD) | 143 px attendus | règle orange mesurée y 138..142 ⇒ **143 px** | **0** | `m1` |
| P3 | or du solde (encre la plus claire) | (242, 201, 107) | (242, 201, 106) | **(0, 0, −1)** | `m7` |
| P4 | encre du libellé « ARGENT » | (185, 173, 146) | (185, 173, 146) | **(0, 0, 0)** | `m7` |
| P5 | encre du libellé « JOUR » | (185, 173, 146) | (185, 173, 146) | **(0, 0, 0)** | `m7` |
| P6 | fond du bandeau (aplat, coin gauche) | (11, 17, 27) | (13, 14, 27) | ≤ 3/255 | `m7` |
| P7 | centre horizontal du manomètre | 195,8 CSS (canon HUD) | 195,8 CSS | **0,0 CSS** | `m24b` |
| P8 | diamètre de l'anneau du manomètre | 64,0 CSS (canon HUD) | 66,1 CSS | +2,1 CSS (+3,3 %) | `m24b` |
| P9 | débord du manomètre sous le bandeau | 57 px = **19,0 CSS** (canon) | 59 px = **21,4 CSS** | +2,4 CSS — le débord est **canon** | `m12b`, `m13` |
| P10 | hauteur de capitale « ARGENT » | 6,33 CSS (canon HUD) | 6,90 CSS | +0,57 CSS (+9 %) → ARBITRAGE A1 | `m23` |
| P11 | détecteur de vert, **contrôle négatif** (bandeau de la référence, sans LCD) | 0,044 % | — | ne se déclenche pas hors LCD | `m5` |
| P12 | détecteur de vert, **contrôle positif** (marge verte maximale) | **95/255** | 12/255 | l'instrument discrimine | `m5b` |
| P13 | compteur de teintes, **contrôle positif** (panneau de la capture) | — | **1 209 teintes** | voit du contenu quand il y en a | `m20` |
| P14 | instrument de gouttière, **contrôle négatif** (référence, mêmes colonnes, dans son bandeau) | **0 transition**, amplitude ≤ 16/255 | — | la référence respecte sa gouttière | `m9` |
| P15 | « Choose B », bouton témoin non recouvert | — | or (255, 210, 64), **9,41:1**, encre y 297..305 (h 9 px) | lisible ⇒ le défaut de A est une occlusion, pas un défaut de rendu de texte | `m11b`, `m14` |
| P16 | empilement des deux blocs d'option (écart ASSUMÉ) | — | bouton A y 209..245, bouton B y 284..320, **écart 38 px, 0 recouvrement** | rendu proprement | `m10` |
| P17 | « COOK » (titre de carte), blanc sur carte | — | (238, 241, 242) sur (28, 28, 34) ⇒ **14,94:1**, h 8 px | au-dessus du plancher | `m11`, `m26` |
| P18 | carte de rapport intacte sous le manomètre | — | y 250, 265, 278, 325 : **aucun corps étranger** | le percement (F8) est localisé, pas un artefact global | `m28` |
| P19 | référence : la 4ᵉ rangée du clavier n'est **pas** coupée — réfutation de ma propre première lecture à l'œil | rangée 4 y 2011..2084, 17 px de marge sous elle | — | — | `m17` |

---

## 0. L'écran, tel que la maquette le dit

**But.** C'est un téléphone jetable. Le joueur y lit les messages des lieutenants qui ont refusé
d'agir seuls, et tranche au clavier : 1 ou 2.

**Ordre de lecture.** (1) La **dalle LCD verte** — 90,2 % de la largeur, 55,9 % de la hauteur, une
couleur qui n'existe nulle part ailleurs : l'œil ne peut pas commencer ailleurs. (2)
**« MESSAGES 2 »** au centre de l'en-tête, entre les barres de réseau et la batterie : combien de
choses m'attendent. (3) Les **deux cartes de message** (LT. KANE, LT. MARR), chacune avec son âge
« CE CYCLE » à droite. (4) Le pied du LCD, après un tiret pointillé :
**« ▲▼ CHOISIR · OK LIRE »** — le mode d'emploi. (5) Le **clavier 4×3** et la rangée
**LIRE / OK / OPTIONS**, qui disent physiquement comment on répond.

**Zones.** Bandeau HUD (chrome, évoqué) · bandeau de châssis « BIP » + « BRENNAR · GSM » ·
dalle LCD (en-tête / liste / vide / pied) · rangée de trois boutons · pavé numérique.

**Traits d'identité — ce qui fait que c'est *cet* écran.**
1. Le **vert phosphore monochrome** sur fond vert très sombre (72,5 % de l'aire de contenu est de
   famille verte) avec ses **lignes de balayage**.
2. Le **châssis de téléphone** : la dalle est encadrée, elle ne remplit pas l'écran.
3. Le **clavier numérique** — quatre rangées, qui occupent le quart bas.
4. La **typographie à chasse fixe, en capitales**, dans la dalle et elle seule.
5. Le **vide assumé** de la dalle sous les deux messages (57,7 % de sa hauteur) — mais un vide
   **encadré et texturé** (324 teintes distinctes), refermé en bas par le tiret pointillé et la
   ligne d'aide.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, et pas à la marge. Ouvrant la capture sans la référence, je vois : un manomètre (du chrome),
puis un **petit rectangle gris** haut perché, à peine plus large que la moitié de l'écran, à moitié
glissé **sous** le bandeau, et **rien** — 79,3 % du rect libre est un aplat de trois teintes
(amplitude 2/255). Rien ne dit qu'il s'agit d'un téléphone ; rien ne dit qu'on tape 1 ou 2.

L'ordre de lecture est **inversé**. Dans la maquette l'œil part de la dalle verte ; ici l'objet le
plus contrasté du rect libre est le mot **« Choose B »** en or (9,41:1), c'est-à-dire une action
secondaire, tandis que le titre de l'écran — ce qui devrait venir en premier — s'arrête à
**« RAPPORTS D'AU »** : aucune encre entre x 624 et x 900 dans sa bande. Le **disque opaque du
manomètre est dessiné par-dessus la carte de rapport** et y perce un trou de **162 px** de large,
qui descend jusque sur le libellé **« Choose A »** — l'action principale.

Les cinq traits d'identité disparaissent ensemble : **zéro pixel vert** dans le rect libre (marge
verte maximale 12/255 sur toute l'image, contre 95/255 dans la référence), pas de châssis, pas de
clavier, pas de chasse fixe, et le vide n'est plus un vide encadré mais un fond de page nu. La
palette bascule du vert (72,5 %) au noir neutre (89,4 % en (13,13,13)) et la luminance moyenne du
contenu tombe de 29,9 à 14,5 — **2,06× plus sombre**.

À quoi s'ajoute que le peu de texte présent ne veut rien dire pour un joueur : deux **clés d'i18n
brutes** (`autonomy.cook.now`, `autonomy.cook.refine`), trois libellés **anglais** (« Choose A »,
« Choose B », « Oldest: 2 cycles ») et un **UUID** à la place du nom du lieutenant.

**Les trois écarts de tête, par impact perçu** : F1/F2 (l'écran n'existe pas — ni dalle, ni châssis,
ni clavier) · F7/F8 (le titre est tronqué et l'action principale est percée par le chrome) ·
F3/F4/F5 (clés brutes, anglais, UUID).

---

## 3. Écarts — findings

Format imposé par le dossier : un finding par ligne, une seule table, gravité ∈ {BLOQUANT, MAJEUR,
MINEUR}. `critère` = `NOUVEAU` partout (premier tour). La colonne **données** sépare ce qui dépend du
compte photographié (observation DATÉE du 2026-09-04) de ce qui est vrai quelles que soient les données.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | BLOQUANT | NOUVEAU | non | **La dalle LCD verte n'existe pas.** Ni dalle, ni lignes de balayage, ni en-tête « MESSAGES N », ni barres de réseau, ni batterie, ni tiret pointillé, ni pied « ▲▼ CHOISIR · OK LIRE ». Le trait d'identité n° 1 de l'écran est absent. | Détecteur `g>r+8 ∧ g>b+8` : référence **1 148 204 px** verts (**56,76 %** de l'aire de contenu), bbox x 53..1026 × y 365..1538 ; capture **0 px** dans le rect libre, **70 px** sur l'image entière (le seul « ✓ Décidé »), **0** au seuil 16. Marge verte maximale : réf **95/255**, capture **12/255**. Contrôle négatif (bandeau de la référence) : 0,044 %. (`m5`, `m5b`) | — |
| `F2` | BLOQUANT | NOUVEAU | non | **Le châssis de téléphone est absent** : ni bandeau « BIP » + « BRENNAR · GSM », ni rangée LIRE / OK / OPTIONS, ni pavé numérique 4×3. Le joueur n'a aucun indice qu'il doit « taper 1 ou 2 » — le geste que l'écran existe pour porter. | Référence : badge BIP x 53..158 y 269..321 ; « BRENNAR · GSM » x 689..1019 y 286..302 ; rangée d'actions y 1576..1673 (h 98) ; clavier 4 rangées y 1708..1784 / 1809..1885 / 1910..1986 / 2011..2084, **pas 101 px**, h 77. Capture : encre du rect libre **confinée à y 143..563**, **aucune** structure sous y 563. (`m6b`, `m17`, `m25`, `m3`) | — |
| `F3` | BLOQUANT | NOUVEAU | non | **Clés d'i18n brutes à l'écran** : `autonomy.cook.now` et `autonomy.cook.refine` affichées telles quelles au-dessus de chaque option. Le dossier déclare ce cas explicitement **NON assumé** (S7-b). | Bloc B (mesuré au propre, hors manomètre) : clé y **256..265** (h 10 px) x 323..430 ; valeur « [<>] Arbitrage » y **271..280** (h 10 px) x 323..396. Encre grise (138, 151, 156) sur carte (28, 28, 34) ⇒ **5,64:1**. (`m26`, `m27`, `m11`) | Si le bundle `fr` de 674 clés porte ou non ces deux clés — non mesurable depuis l'image. |
| `F4` | BLOQUANT | NOUVEAU | non | **Libellés en anglais** là où la doctrine impose le français : « Choose A », « Choose B », « Oldest: 2 cycles ». L'archétype est aussi rendu en anglais (« COOK ») alors que la référence écrit « IL A REFUSE DE CUISINER ». Le reste de l'écran est en français (« ✓ Décidé »), donc c'est une résolution **partielle**, pas une locale globale. | « Choose A » / « Choose B » : encre or (255, 210, 64) x **515..565**, y 224..231 et 297..305. « Oldest: 2 cycles » : x **617..736**. « COOK » : x 319..353, y 162..169. (`m14`, `m25`, `m26`) | Si ces libellés existent en clé traduisible ou sont codés en dur — hors image. |
| `F5` | BLOQUANT | NOUVEAU | oui (la valeur) / non (la forme) | **Le nom du lieutenant est un UUID** : « Lt. 01a06b7a-43a8-7af0… ». Aucun joueur ne peut identifier l'expéditeur, alors que c'est l'information centrale d'une boîte de messages. La référence écrit « LT. KANE » / « LT. MARR ». | Encre (234, 224, 200), x **282..499**, contraste **13,72:1** — parfaitement lisible, et vide de sens. (`m11b`, `m18`, `m25`, `zoom_lt.png`) | Si le back projette un `name` que le client ignore, ou ne le projette pas — relève du `juge-donnees`. |
| `F6` | BLOQUANT | NOUVEAU | non | **Le contenu passe SOUS le bandeau.** Le titre, le sous-titre et **toute la première carte de rapport** (« COOK / ✓ Décidé ») sont dessinés dans la gouttière du chrome. Doctrine : « tout contenu SOUS le bandeau est un écart ». | Première encre de contenu à **y = 45** ; bas du bandeau **y = 142** ⇒ **98 px de contenu occultés**. Colonne x 300..395, à l'intérieur du bandeau : **14 transitions**, amplitude **204/255**. Contrôle négatif sur la référence, mêmes colonnes : **0 transition**, amplitude ≤ 16/255. Conteneur de contenu mesuré de y **71** à 563, alors que le rect libre commence à 143. (`m9`, `m10`, `m1`) | — |
| `F7` | BLOQUANT | NOUVEAU | non | **Le titre de l'écran est tronqué** : il s'arrête à « RAPPORTS D'AU ». Le premier repère de lecture de l'écran est perdu. | Encre du titre x **305..623/628** ; **aucune** encre entre x 624 et x 900 dans la bande du titre (pixel le plus clair = (14, 18, 28), soit le fond) — alors que le sous-titre, lui, ressort bien à droite du disque (x 617..736). (`m18`, `m19`, `m25`) | Si la fin du titre est **masquée** par le disque opaque ou **coupée** par son conteneur : les deux produisent la même image. Une capture sans le manomètre trancherait. |
| `F8` | BLOQUANT | NOUVEAU | non | **Le disque du manomètre est dessiné par-dessus la carte de rapport** et perce la zone de l'option A, jusqu'au losange doré qui tombe sur les lettres « o »/« s » de **« Choose A »** — l'action principale de l'écran. | Trou dans la carte (couleur ≠ (28,28,34)) : y 158 → x 459..620 (**162 px**) · y 170 → 146 px · y 185 → 118 px · y 200 → x 512..567 (56 px). Témoins **intacts** : y 250, 265, 278, 325. Losange : y 215 → x 539..540, y 222 → x 532..547. Encre du bouton A y **215..231 (h 17)** contre **y 297..305 (h 9)** pour le bouton B, identique et libre. (`m28`, `m28b`, `m14`, `zoom_chooseA.png`) | Si l'occlusion persiste aux autres résolutions — une seule capture fournie. |
| `F9` | MAJEUR | NOUVEAU | non | **Le contenu n'occupe que 46,9 % de la largeur** et reste centré, là où la dalle de la maquette en occupe 90,2 %. Classe de cause : un conteneur de largeur fixe, au lieu d'une mise en page qui remplit le rect libre. | Capture : panneau x **287..792**, l = **506 px** = **46,85 %** (140,6 CSS sur 300 à l'échelle série 6 ; 600 unités de canvas). Référence : LCD x 53..1026, l = **974 px** = **90,19 %** (270,6 CSS). Δ = **−43,3 points** de largeur d'écran. (`m8`, `m6b`) | — |
| `F10` | MAJEUR | NOUVEAU | partiellement | **79,3 % du rect libre est un vide nu.** La maquette a aussi un grand vide (57,7 % de la dalle), mais **encadré et texturé** ; ici c'est le fond de page, sans bord, sans pied, sans repère de fin de liste. | Encre confinée à y 143..563 (h **421 px**) sur un rect libre y 143..2178 (h **2036 px**) ⇒ **20,7 %** occupés. La zone y 564..2178 (**1 744 200 px**) ne porte que **3 teintes distinctes**, amplitude **(0,0,2)**. Contrôles : panneau de contenu **1 209 teintes** ; vide du LCD de la référence **324 teintes**. (`m3`, `m20`) | La **longueur** de la liste dépend du compte ; l'**absence de structure** sous la liste (ni pied, ni cadre, ni bord de dalle) n'en dépend pas. |
| `F11` | MAJEUR | NOUVEAU | non | **La palette bascule et l'identité chromatique est perdue.** Le vert monochrome ne survit nulle part ; le contenu devient un gris-bleu neutre et perd la moitié de sa luminance. | Référence, aire de contenu, famille verte = **72,47 %** ((15,28,10) 25,80 · (18,31,12) 18,60 · (23,32,22) 11,22 · (17,31,11) 7,93 · (12,22,12) 4,59 · (20,27,21) 4,33). Capture, rect libre : (13,13,13) **89,38 %**, **0 %** de vert. Luminance moyenne **29,9 → 14,5** (×0,49). (`m16`) | — |
| `F12` | MAJEUR | NOUVEAU | probablement oui | **Chrome — le moment de la journée a disparu.** Le canon du HUD écrit « JOUR 12 · SOIRÉE » ; la capture n'écrit que « JOUR 37 ». La référence série 6 écrit aussi « JOUR 26 / Soirée ». | Largeur de la ligne de jour : canon **86,6 CSS** (x 286,7..373,3) ; capture **33,7 CSS** (x 341,2..374,9) ⇒ **−61 %**. (`m21`) | Si la phase du jour est absente de la projection ou seulement non affichée. Chrome **partagé** : à porter au shell, pas nécessairement à cet écran. |
| `F13` | MAJEUR | NOUVEAU | probablement oui | **Chrome — l'horloge est réduite à un tiret.** Là où le canon affiche « 21:40 », la capture pose un trait de 3 px dans la même case. | Canon : encre y **25,7..35,7 CSS** (h **10,0 CSS**), x 341,0..374,7. Capture : encre y **31,6..32,3 CSS** (h **0,7 CSS**), x 362,6..374,9 — même case, **×14 moins haute**. (`m21`) | Si c'est une valeur manquante (`game_minute`) ou un glyphe de remplacement volontaire : indiscernable à l'image. Chrome partagé. |
| `F14` | MINEUR | NOUVEAU | non | **« Oldest: 2 cycles » sous le plancher de contraste** exigé pour du petit texte (≥ 4,5:1) — aggravé par le fait qu'il est dessiné dans la gouttière (F6), donc assombri par le bandeau. | Encre (96, 98, 100) sur fond (17, 23, 31) ⇒ **2,94:1**. (`m11b`) | Ce que serait le contraste hors gouttière : F6 le conditionne, non mesurable ici. |

**Compte : 14 findings — 8 BLOQUANT, 5 MAJEUR, 1 MINEUR.**

---

## Écarts ASSUMÉS — vérification « rendu proprement »

| ce que le dossier assume | rendu proprement ? | mesure |
|---|---|---|
| un rapport = UN point (jamais « point 2 sur 2 ») | **OUI** — un seul point, deux options empilées sans superposition | bouton A y 209..245, bouton B y 284..320, écart **38 px**, 0 recouvrement (`m10`) |
| catégorie et options suivent l'archétype (`COOK` → `cook.now` / `cook.refine`) | **OUI** — la logique est cohérente ; c'est la **langue** qui pèche (F3/F4), pas l'appariement | `zoom_panneau.png`, `m26` |
| pas de bandeau « 3 cycles » / couleur braise de l'âge | **pas de sortie de l'assumé par son critère** : le périmètre nomme « une place réservée VIDE » — il n'y en a pas. L'âge est même affiché (« Oldest: 2 cycles »), en anglais ⇒ part en **F4**, et sous le plancher de contraste ⇒ **F14** | x 617..736 (`m25`) |
| plusieurs rapports d'UN point pour le MÊME homme (âges 0, 1, 2…) | **NON — SORT de l'assumé.** Son périmètre dit : « un empilement qui déborde ou **coupe** ». La 1ʳᵉ carte (« COOK / ✓ Décidé ») est **coupée par le bandeau** ⇒ remonté en **F6** | carte 1 entièrement à y ≤ 148 ; bas du bandeau y = 142 (`m9`, `m10`, `zoom_carte1_boost.png`) |
| `label_key` brut : **NON assumé** par le dossier | — | ⇒ **F3** |

---

## ARBITRAGES — non tranchables par le juge

| id | sujet | mesure | pourquoi c'est un arbitrage |
|---|---|---|---|
| `A1` | **Famille de police** | La référence a été rendue par Chrome avec **Noto Serif / Noto Sans / Liberation Mono** (`fc-match`, dossier) ; le client embarque **DejaVu**. Georgia n'a jamais été montrée à personne. | Classé ARBITRAGE par le dossier. La **hauteur de capitale** reste comparable : « ARGENT » 6,33 CSS (canon) → 6,90 CSS (capture), **+9 %**, au-dessus de la tolérance de 5 % (`m23`). |
| `A2` | **Monnaie et format** | Référence série 6 : « $ 24 850 ». Capture : « 406 653,08 € » — euro, format français, **avec centimes**. | Le canon du jeu a été re-basé sur la fiction française ; la série 6 est en retard. Reste ouvert : **les centimes** sur un solde — décision produit, pas défaut client. |
| `A3` | **Bouton retour dans le bandeau** | La capture pose une flèche « ← » à x 29,8..37,7 CSS, et le bloc ARGENT est **décalé de +48,2 CSS** vers la droite (bord gauche 16,0 → 64,2 CSS). | Le seul canon de chrome fourni est celui de l'**écran principal**, qui par nature n'a aucun retour. Je ne peux pas dire si ce décalage est voulu pour un sous-écran (`m23`). |
| `A4` | **Débord du manomètre sous le bandeau** | 19,0 CSS dans le canon, 21,4 CSS dans la capture. | Le débord est **canon** : ce n'est pas lui, le défaut. Le défaut est que le contenu soit placé dessous (F6/F7/F8). Consigné pour qu'un correctif ne s'attaque pas au manomètre (`m12b`, `m13`). |

---

## 5. Autres résolutions

**Aucune autre résolution n'est fournie.** Le dossier ne livre qu'une capture,
`capture-1080x2400.png` (1080×2400, 20:9). La doctrine du projet demande un jugement à **deux**
résolutions ; ce tour ne le permet pas. Voir § 6.

---

## 6. Non vérifié

| ce que je n'ai pas pu trancher | la mesure hors image qui trancherait |
|---|---|
| Le comportement à une **seconde résolution** (reflux, débordement, coupe). Une seule capture. | Une capture du même état à une autre résolution cible (p. ex. 1080×1920). |
| **Animation** (ruling « aucune sur un nouvel écran »). Aucune paire T / T+1 s fournie. | Deux captures du même état à 1 s d'intervalle, puis compte des pixels différents hors chrome. |
| L'**étendue verticale exacte** du titre et du sous-titre de la capture : ces lignes partagent leurs rangées avec le bloc du solde et avec le halo du manomètre, mon instrument ne sait pas les isoler. Seules leurs étendues **horizontales** sont mesurées (F5, F7). | Une capture du contenu descendu sous la gouttière, ou l'écran sans chrome. |
| Si la fin du titre (F7) est **masquée** par le disque opaque ou **coupée** par son conteneur. | Idem — une capture sans le manomètre. |
| Si l'occlusion de « Choose A » (F8) se reproduit **aux autres résolutions** — manomètre et libellé sont tous deux centrés, donc c'est probable, mais non mesuré. | La même capture à une autre résolution. |
| Si les clés `autonomy.cook.now` / `.refine`, « Choose A/B » et « Oldest » **existent** dans le bundle `fr` de 674 clés. | Un `grep` de ces clés dans le bundle servi à la date de la capture. |
| Si le back **projette** un `lieutenant.name` que le client ignore (F5), ou ne le projette pas. | Le corps réel de la route d'autonomie sur le compte de démo — relève du `juge-donnees`. |
| Si « JOUR 37 » sans phase (F12) et le tiret d'horloge (F13) viennent d'une **valeur absente** ou d'un **affichage manquant**. | Le corps de `session/open` (clés `game_minute`, phase du jour) à la date de la capture. |
| Si le décalage de +48,2 CSS du bloc ARGENT (A3) est **voulu** pour un sous-écran. | Un canon de chrome pour un écran **avec** bouton retour ; celui fourni est l'écran principal. |
| Les **états** #26 (un message), #27 (le même homme chaque cycle), #28 (OPTIONS), #29 (après réponse) et #30 (aucun message) ne sont pas capturés. | Une capture par état, contre le cadre homologue de `etats/` ou de la source. |
| Les **valeurs mesurées par les gardes du test** (compte de teintes, rect imprimé) : le log n'a pas été préservé. J'observe seulement que le panneau porte **1 209 teintes** — de quoi satisfaire une garde de teintes — pendant que **79,3 % du rect libre en porte 3**. Je ne peux pas dire si la garde est scopée au rect libre. | Le log du run, ou la portée de la garde (hors mandat). |
| L'état du compte `operational_demo@example.test` au 2026-09-04 (2 rapports, archétype COOK, jour 37) : **non re-mesurable**. D'où la colonne « données » des findings. | Un nouveau tirage daté du même compte. |
| Je n'ai **pas** exécuté `fc-match` moi-même (contrainte machine : gate E2E en cours) : A1 reprend les valeurs du dossier. | Ré-exécution de `fc-match` sur la pile CSS. |

---

## Annexes

### 1. Inventaire de la référence

Repères : image 1080×2102, ×3,6 (300 CSS). Bandeau HUD évoqué : y 0..228.

| id | catégorie | parent | bbox px | dimension | forme, remplissage, texte |
|---|---|---|---|---|---|
| `R0` | chrome évoqué | écran | y 0..228 | 63,3 CSS de haut | ARGENT / solde or (242,201,107) · manomètre anneau y 25..218 (**entièrement dans le bandeau**) · « JOUR 26 / Soirée » |
| `R1` | badge | châssis | x 53..158, y 269..321 | 106×53 px, 9,8 % de large | pilule verte vive **(159, 212, 78)**, « BIP » en encre sombre |
| `R2` | libellé | châssis | x **689..1019**, y **286..302** | 331×17 px | « B R E N N A R · G S M », gris, très espacé, aligné à droite |
| `R3` | **plaque LCD** | châssis | **x 53..1026, y 365..1538** | **974×1174 px = 90,2 % × 55,9 %** | rect arrondi, bord vert clair, fond **(17, 31, 12)**, **lignes de balayage** de période ~10,5 px (bandes de 7-8 px) |
| `R3.1` | barres de réseau | R3 | x 86..130, y 402..429 | 45×28 | 4 barres croissantes, vert clair |
| `R3.2` | titre | R3 | x **424..648**, y **403..424** | h d'encre **22 px** | **« MESSAGES 2 »**, centré, chasse fixe, capitales |
| `R3.3` | batterie | R3 | x 948..999, y 405..429 | 52×25 | pictogramme plein |
| `R3.4` | filet | R3 | y 444..450 | — | trait horizontal vert sous l'en-tête |
| `R3.5` | carte message 1 | R3 | y **477..623**, h **147** | pas de **162 px** | cadre vert fin ; « ✉ LT. KANE » x 151..329, h **22 px**, encre **(212, 240, 138)**, **13,57:1** · « CE CYCLE » x 830..965, h **17 px**, aligné à droite · corps « IL A REFUSE DE CUISINER. MARGE EPUISEE. » h **22 px**, encre (159, 212, 78), **9,80:1** |
| `R3.6` | carte message 2 | R3 | y **639..785**, h **147** | — | idem, « LT. MARR » / « IL A REFUSE D EXPEDIER. MARGE EPUISEE. » |
| `R3.7` | vide de dalle | R3 | y 790..1466 | 677 px = **57,7 %** de la dalle | vide **voulu**, texturé (lignes de balayage) et **encadré** — **324 teintes** distinctes |
| `R3.8` | pied | R3 | y 1470..1490 | — | tiret pointillé, puis « ▲▼ CHOISIR · OK LIRE » centré |
| `R4` | rangée d'actions | châssis | y **1576..1673**, h 98 | — | **LIRE** (rect, gauche) · **OK** (cercle, centre) · **OPTIONS** (rect, droite) |
| `R5` | pavé numérique | châssis | y **1708..2084**, 4 rangées | pas **101 px**, h **77** | 1 2 3 / 4 5 6 / 7 8 9 / ∗ 0 # — touches (39, 43, 48), chiffres clairs. **Non coupé** : 17 px de marge sous la 4ᵉ rangée |

**Couche globale (aire de contenu, y 229..2102).** Palette : (15,28,10) 25,80 % · (18,31,12) 18,60 % ·
(39,46,46) 14,39 % · (65,75,70) 13,14 % · (23,32,22) 11,22 % · (17,31,11) 7,93 % · (12,22,12) 4,59 % ·
(20,27,21) 4,33 %. **Famille verte = 72,47 %.** Luminance moyenne **29,9/255**. Rythme vertical :
bandeau 229 → châssis → dalle 365 → messages 477 / 639 → vide → pied 1470 → bas de dalle 1538 →
actions 1576 → clavier 1708 (pas régulier de 101). **Pas de dock** : le clavier descend jusqu'au bas
du cadre.

### 2. Inventaire de la capture

Repères : image 1080×2400. Bandeau : y 0..142 (règle orange y 138..142). Dock : y 2179..2399.
**Rect libre : y 143..2178, h 2036 px.**

| id | catégorie | parent | bbox px | état | forme, remplissage, texte |
|---|---|---|---|---|---|
| `K0` | chrome | écran | y 0..142 | — | flèche « ← » x 82..104 · ARGENT / « 406 653,08 € » or (242,201,106) · manomètre (anneau y 18..201, **déborde de 59 px**) · **« JOUR 37 » seul** · **tiret** à la place de l'horloge |
| `K1` | titre | conteneur | x **305..628** | **tronqué**, **dans la gouttière** | « RAPPORTS D'AU… », encre (182, 127, 119) vue à travers le bandeau, **5,64:1** |
| `K2` | sous-titre | conteneur | uuid x **282..499** · « Oldest » x **617..736** | **dans la gouttière** | « Lt. 01a06b7a-43a8-7af0… » (234,224,200) **13,72:1** · « · Oldest: 2 cycles » (96,98,100) **2,94:1** |
| `K3` | carte de rapport 1 | conteneur | y ≤ **148** | **coupée** | « COOK » / « ✓ Décidé » (sarcelle) — entièrement sous le bandeau |
| `K4` | carte de rapport 2 | conteneur | x **304..775**, y **154..333** | percée par le chrome | fond (28,28,34), bord (34,42,46) 8 px ; titre « COOK » x 319..353, y 162..169, h **8 px**, blanc (238,241,242), **14,94:1** |
| `K4.1` | option A | K4 | texte ~y 182..205 ; bouton y **209..245** | **percée + recouverte** | clé brute `autonomy.cook.now` puis « [~] Minimal » ; bouton (42,46,56), libellé or (255,210,64) sous le losange du manomètre |
| `K4.2` | option B | K4 | clé y **256..265**, valeur y **271..280**, bouton y **284..320** | complète (témoin) | `autonomy.cook.refine` x 323..430 / « [<>] Arbitrage » x 323..396 ; « Choose B » or **9,41:1**, encre y 297..305 |
| `K5` | conteneur | rect libre | x **287..792**, y **71..563** | déborde en haut | aplat (22,22,28) ; **506 px = 46,9 %** de la largeur ; **230 px vides** sous la carte (y 334..563) |
| `K6` | **vide** | rect libre | y **564..2178**, pleine largeur | — | **1 744 200 px**, **3 teintes**, amplitude (0,0,2) — **79,3 % du rect libre** |
| `K7` | dock | écran | y **2179..2399**, h 221 | chrome | EMPIRE · FAMILLE · FILIÈRE · PLUS |

**Couche globale (rect libre, y 143..2178).** Palette : (13,13,13) **89,38 %** · (22,22,28) 5,60 % ·
(28,28,34) 1,92 % · (34,42,46) 1,81 % · (13,13,14) 0,93 % · (54,54,60) 0,20 % · (15,19,27) 0,09 % ·
(18,22,31) 0,06 %. **Famille verte = 0 %.** Luminance moyenne **14,5/255**. Densité d'encre
**9,62 %** du rect libre, **entièrement** concentrée dans y 143..563. Rythme vertical : **aucun** sous
y 563.

### 3. Correspondance des repères (échelle, offset)

| | px de l'image | CSS de référence | facteur | source |
|---|---|---|---|---|
| Contenu — référence série 6 | 1080 | 300 | **×3,600** | dossier |
| Contenu — capture | 1080 | 300 | **×3,600** | dossier |
| **rapport contenu, capture ÷ référence** | | | **1,000** | ⇒ tout écart de taille sur le contenu est RÉEL |
| Chrome — canon du HUD | 1176 | 392 | **×3,000** | dossier |
| Chrome — capture | 1080 | 392 | **×2,7551** | dossier (`1080/392`) |
| **rapport chrome, capture ÷ canon** | | | **0,9184** | toute grandeur de chrome est donnée en **CSS** dans ce rapport |

**Ancrages vérifiés sur l'image, non déduits.** Bandeau de la capture : règle orange mesurée à
y 138..142 ⇒ **143 px**, ce qui confirme les 52 CSS-HUD annoncés (52 × 2,7551 = 143,3). Canon du HUD :
règle à y 153..155 ⇒ 156 px = **52,0 CSS**. Dock de la capture : bord haut mesuré à **y 2179**
(transition de moyenne de ligne 13,67 → 21,63). **Offsets** : contenu de la capture aligné sur le bas
du bandeau (y 143) et le haut du dock (y 2179) ; contenu de la référence aligné sur y 229.

### 4. Scripts — `mesures/`

Chacun imprime la taille des images qu'il ouvre.

| script | grandeur |
|---|---|
| `m1_geometrie.py` | contrôle positif de largeur · règle orange du bandeau |
| `m2_dock.py` | bord haut du dock (moyennes de ligne) |
| `m3_bbox_contenu.py` | bbox et densité de l'encre dans le rect libre |
| `m4_ref_geometrie.py`, `m6_ref_parties.py`, `m6b_ref_parties.py`, `m15_ref_inventaire.py`, `m25_verifs.py` | découpage de la référence (LCD, cartes, actions, clavier) |
| `m5_lcd_vert.py`, `m5b_durcissement.py` | **détecteur de vert** + contrôles positif et négatif + durcissement à 5 seuils |
| `m7_couleurs.py` | échantillons médians, contrôles positifs du chrome |
| `m8_cap_parties.py`, `m10_conteneur.py`, `m26_lignes.py`, `m27_carteA.py` | bandes, colonnes et profils de la capture |
| `m9_gouttiere.py` | **instrument de gouttière** + contrôle négatif sur la référence |
| `m11_textes.py`, `m11b_textes.py` | hauteurs d'encre et contrastes |
| `m12_manometre.py`, `m12b_manometre.py`, `m19_disque.py`, `m28_trou.py`, `m28b_trou.py` | emprise du manomètre, percement de la carte, témoins |
| `m13_hud_canon.py`, `m21_chrome.py`, `m22_argent.py`, `m23_argent2.py`, `m24_controles.py`, `m24b_controles.py` | chrome contre le canon du HUD, en CSS |
| `m14_occlusion.py` | occlusion de « Choose A », témoin « Choose B » |
| `m16_palette.py` | palettes quantifiées, luminances moyennes |
| `m17_bas.py` | bas de la référence (non coupée) et du dock |
| `m18_titre.py` | troncature du titre |
| `m20_vide.py` | compteur de teintes distinctes + contrôles |

Zooms conservés : `zoom_panneau.png`, `zoom_titre.png`, `zoom_titre_boost.png`, `zoom_lt.png`,
`zoom_decide.png`, `zoom_carte1_boost.png`, `zoom_chooseA.png`, `zoom_chooseB.png`.

**Sorties collées — les six mesures qui portent le verdict :**

```
m5b  capture ENTIERE  seuil= 8 : 70 px (0.0027 %)   seuil=16 : 0 px
     pixel le PLUS vert de la capture   : marge=12  en (333,132,(28,96,84))
     CONTROLE POSITIF, reference        : marge=95  en (300,741,(82,177,78))

m9   CAPTURE   x300..395 y  8..137 : amplitude=(204,158,68)  transitions: 14
     REFERENCE x300..395 y  8..216 : amplitude=(  7, 10,16)  transitions: AUCUNE

m20  zone y564..2178 : aire=1744200 px, 3 teintes distinctes ; amplitude=(0,0,2)
     CONTROLE POSITIF panneau x287..792 y143..563 : 1209 teintes
     CONTROLE POSITIF vide du LCD de la REFERENCE : 324 teintes

m16  REFERENCE contenu : (15,28,10) 25.80 % (18,31,12) 18.60 % (23,32,22) 11.22 %
                         (17,31,11) 7.93 % (12,22,12) 4.59 % (20,27,21) 4.33 %
                         luminance moyenne = 29.9
     CAPTURE rect libre: (13,13,13) 89.38 % (22,22,28) 5.60 % (28,28,34) 1.92 %
                         luminance moyenne = 14.5

m28  y= 158 ligne du titre COOK  trou x 459..620  largeur=162 px
     y= 185 cle A                trou x 481..598  largeur=118 px
     y= 200 valeur A             trou x 512..567  largeur= 56 px
     y= 250 / 265 / 278 / 325    TEMOINS : AUCUN trou (carte intacte)

m14  bouton A (y209..245) : 310 px hors couleur de bouton, bbox x515..565 y215..231
     bouton B (y284..320) TEMOIN : 165 px, bbox x515..564 y297..305
     losange dore : y200 x523..556 (l=34) | y216 x538..541 | y220 x534..545
```
