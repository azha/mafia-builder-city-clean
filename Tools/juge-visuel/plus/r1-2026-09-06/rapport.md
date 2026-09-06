# Juge visuel ⊥ — ⑱ Le menu Plus (« le Bureau du patron ») — r1 — 2026-09-06

## Verdict : NON APPROUVÉ

L'écran en jeu n'est pas une variante de la maquette : c'est un autre objet — une liste de 19 bandes
d'ardoise pleine largeur, sans bureau, sans plaque, sans carte, sans icône, sans compteur — et sa mise
en page déborde : deux entrées passent **sous le dock**, une troisième est **coupée par le bord bas**,
et le libellé de la première est **traversé par l'anneau du manomètre**.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence / canon | capture | écart |
|---|---|---|---|---|
| C1 | largeur d'écran (échelle du contenu) | 1080 px = 300 CSS ×3,6 | 1080 px = 300 CSS ×3,6 | 0 (rapport 1,00) |
| C2 | liseré de bas de bandeau | canon HUD y=155 → **51,7 CSS** | y=140 → **50,8 CSS-HUD** | 0,9 CSS = **1,7 %** ✔ |
| C3 | le contenu commence au bas du bandeau | — | liseré 138..143, 1ʳᵉ bande **y=144** | 1 px ✔ |
| C4 | centrage horizontal des libellés | centre écran 540 | centre d'encre **539,5..541,0** | ≤ **1,0 px** (tol. 2) ✔ |
| C5 | hauteur de rangée (18 rangées) | — | **108,83 px**, écart-type **0,37** | régulier ✔ |
| C6 | pas vertical (17 intervalles) | — | **122,59 px**, écart-type **0,49** | régulier ✔ |
| C7 | gouttière entre rangées | — | **13,76 px** (13..14) | régulier ✔ |
| C8 | contraste libellé/fond | ≥ 4,5:1 exigé | **6,57:1** — (185,173,146) sur (34,42,46) | ✔ |
| C9 | contraste du libellé voilé par le dock | ≥ 4,5:1 | **7,32:1** | ✔ (la lisibilité n'est pas le défaut, cf. F1) |
| C10 | langue affichée | français, aucun enum brut | 19 libellés **tous en français** ; « LES INSPECTIONS », « LE COMMISSARIAT » au mot près | ✔ |
| C11 | aucun readout « 0 » | canon `screen_12:193` | **0 occurrence** | ✔ (trivialement : aucun compteur rendu) |
| C12 | dock — 4 onglets réguliers | — | centres x **258 / 446 / 634 / 821** (pas 187,5), ∅ ~123 px | ✔ |
| C13 | onglet actif | PLUS | trait or **x 802..839, y 2312..2316** → **4ᵉ pastille = PLUS** | ✔ bon onglet |
| C14 | manomètre — arcs et aiguille | teal à gauche, rouge à droite | **teal à gauche, rouge à droite** | ✔ (pas d'inversion) |
| C15 | débordement horizontal du contenu | — | toute l'encre de rangée dans **x 393..686** | ✔ aucun |

---

## 0. L'écran, tel que la maquette le dit

**But.** C'est le seul menu du jeu. On y vient choisir une destination qui n'est pas un onglet, et on
veut savoir **d'un coup d'œil ce qui réclame une action** : les compteurs sont l'information, la liste
n'est que le support.

**Ordre de lecture.** (1) La **plaque dorée** « LE BUREAU — TOUT LE RESTE », posée sous une lampe de
banquier verte, sur un plateau d'acajou — elle dit où l'on est. (2) Le **bloc « CE QUI VOUS ATTEND »**
et ses **trois compteurs dorés** (3, 5, 2), qui sont les seuls objets brillants du panneau et attirent
l'œil avant les mots. (3) La **carte mise en avant** « La chaufferie », plus haute, cerclée d'or, avec
sa ligne rouge « la semaine s'annonce : reporter, ou ouvrir ». (4) Ensuite seulement les groupes
« LA VILLE » et « LE COFFRE », neutres, sans compteur.

**Zones.** Bandeau HUD (argent, manomètre, jour) · bureau en bois + lampe + plaque de titre · panneau
acajou encadré de rouge sombre, contenant 3 intertitres de section et 9 cartes crème · dock (évoqué).

**Traits d'identité** (ce qui fait qu'on reconnaît *cet* écran) :
1. Le **bureau** : acajou chaud (11,5 % de l'aire) + lampe verte (mesurée (36,102,61)).
2. Les **cartes crème** (55,7 % de l'aire du contenu) : l'écran est **clair sur fond sombre**.
3. La **plaque de titre dorée**, 804 px de large, sous la lampe.
4. Chaque destination est une **carte à trois postes** : médaillon d'icône à gauche, titre sérif +
   sous-titre au centre, **compteur doré** et chevron à droite.
5. Le **groupement en 3 sections** avec intertitres en petites capitales dorées.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, et pas d'un cran : les cinq traits d'identité sont absents ensemble. La maquette est un **objet
clair sur un meuble** (luminance moyenne **122,3/255**, densité d'encre **48,9 %**, 55,7 % de crème) ;
la capture est un **empilement sombre et uniforme** (luminance **36,0/255**, densité **2,9 %**, 73,7 %
d'un seul gris d'ardoise (34,42,46)). Le bois, l'or et la lampe rendent respectivement **11,53 → 0,18 %**,
**5,50 → 0,05 %**, **1,157 → 0,000 %**. Aucun élément de mobilier ne subsiste.

L'ordre de lecture est perdu parce que **ce qui le portait n'est pas rendu** : il n'y a ni plaque, ni
compteur, ni carte mise en avant. Les 18 bandes ont exactement la même hauteur (écart-type 0,37 px) et
le même pas (0,49 px) : rien ne se détache, l'œil n'a aucune prise et lit la liste de haut en bas au
lieu de sauter aux actions dues. La destination est écrite en **capitales sans-sérif de 17-18 px** —
c'est-à-dire à la taille et dans le style que la maquette réserve à ses **intertitres de section**
(18-20 px), pas à ses titres de carte (26 px) : la hiérarchie est aplatie d'un cran vers le bas.

Et la mise en page ne tient pas. Le dossier assume le **nombre** d'entrées, pas leur mise en page, et
nomme lui-même ce qui la ferait sortir de l'assumé : « une entrée COUPÉE par le dock ». C'est le cas
deux fois. Les rangées ne sont pas confinées au rect libre : elles continuent **sous le dock** (l'aplat
(34,42,46) est encore lu à x=20, y=2394, voilé à (15,21,31), et la ligne noire de séparation y 2340..2346
transparaît sous le voile) et **jusqu'au bord bas de l'image**. La 19ᵉ bande n'a que **49 px sur 109**
et son libellé **4 px d'encre sur ~18**. En haut, l'arc du manomètre traverse « LA RÉPUTATION » sur
**109 px, soit 61 % de la largeur du libellé**.

**Les trois écarts de tête, par impact perçu** : (1) la liste déborde sous le dock et par le bas — deux
entrées inatteignables à l'œil, une illisible ; (2) l'identité de l'écran a disparu (bureau, plaque,
cartes, lampe : quatre masques à zéro) ; (3) plus aucun compteur, donc l'information même que l'écran
existe pour donner n'est plus affichée.

---

## 3. Écarts

Gravité : liste fermée `BLOQUANT` / `MAJEUR` / `MINEUR`. Critère : `NOUVEAU` partout (premier tour).
`dép. données` : **non** = vrai quelles que soient les données ; **oui** = observation datée du
2026-09-04 sur `operational_demo@example.test`.

| id | gravité | critère | dép. données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | BLOQUANT | NOUVEAU | non | Le contenu n'est pas confiné au rect libre : les rangées passent **sous le dock**. Deux entrées (`LA LOI`, r18 ; la 19ᵉ) y sont enfouies. Sort explicitement de l'ASSUMÉ (« une entrée COUPÉE par le dock »). | pastilles du dock **y 2183..2305**, voile dès **y≈2156** ; bandes de rangée détectées jusqu'à **y 2336** puis **2351..2400** ; à x=20 l'aplat (34,42,46) est encore lu voilé à **(15,21,31) y=2394** et la séparation noire **y 2340..2346** transparaît ⇒ le dock est **par-dessus**, le contenu continue dessous. Pastille opaque : px(258,2220)=(23,32,46) là où la séparation vaut (3,5,10) hors pastille. `mesures/03,04,05,13,15` | si la liste est **défilable au doigt** (une image ne le dit pas) |
| `F2` | BLOQUANT | NOUVEAU | non | La 19ᵉ entrée est **coupée par le bord bas** de l'écran ; son libellé est illisible. | bande r19 **2351..2400 = 49 px visibles sur 109 (45 %)** ; encre du libellé présente seulement **y 2396..2399 = 4 px** sur une hauteur de capitale de **18 px (22 %)** ; luminance max **47** sur fond (15,21,31). `mesures/04,14,15` | le libellé exact (illisible) |
| `F3` | BLOQUANT | NOUVEAU | non | Le libellé de la **1ʳᵉ** entrée est **traversé par l'anneau or du manomètre**, en plein milieu des lettres. | libellé « LA RÉPUTATION » **x 451..628 (178 px), y ≈185..205** ; arc or (R−B>60, lum>90) **x 485..594 à y=184**, se refermant jusqu'à x 527..552 à y=201 ⇒ **109 px de recouvrement = 61 % de la largeur du libellé**, sur **y 185..201** ; contrôle positif : la même sonde rend **None** sur la rangée 3. `mesures/16,21` | — |
| `F4` | BLOQUANT | NOUVEAU | non | **L'identité de l'écran a disparu** : ni bureau d'acajou, ni lampe verte, ni plaque, ni cartes crème. Quatre masques identiques appliqués aux deux zones de contenu. | crème **55,72 % → 0,63 %** · or **5,50 % → 0,05 %** · bois/acajou **11,53 % → 0,18 %** · vert (lampe, pleine hauteur) **1,157 % → 0,000 %**. Luminance moyenne **122,3 → 36,0** ; densité d'encre **48,9 % → 2,9 %** ; 73,7 % de la capture est un seul gris (34,42,46). `mesures/01,08,09` | — |
| `F5` | BLOQUANT | NOUVEAU | non | La **carte à trois postes** devient une bande de texte nue : **plus d'icône, plus de compteur, plus de chevron, plus de sous-titre**. | RÉF : chaque carte porte de l'encre à gauche (médaillon) **1997..2399 px** et à droite (chevron/badge) **308..1574 px** — 8/8 cartes. JEU : sur **15 rangées mesurées**, **somme gauche = 0** et **somme droite = 0** ; toute l'encre tient en **une seule ligne** par rangée. Contrôle négatif validé (fenêtre vide dans une carte = 0). `mesures/17` | — |
| `F6` | BLOQUANT | NOUVEAU | non | Les **3 compteurs dorés** — l'information même de l'écran — ne sont pas rendus. | RÉF : 3 badges or **119×82 px** (n≈5000 px chacun) sur les cartes 1-3, plus 9 chevrons **10×20 px**. JEU : le jeton or (176,141,61) n'existe que **3 fois** dans tout l'écran — anneau du manomètre (chrome), losange de r1, trait d'onglet actif — **493 px au total**, aucun dans une rangée. `mesures/20` (le contrôle attendait 3 amas et en a rendu 9 : la lecture des tailles sépare 3 badges de 6 chevrons — l'attente était sous-spécifiée, pas le masque) ; `mesures/14` | si l'absence vient d'un compte de démo sans action due (cf. F14) ⇒ **je ne peux pas trancher** : aucune rangée ne porte **d'emplacement** de compteur, ce qui rend l'hypothèse « données vides » insuffisante |
| `F7` | MAJEUR | NOUVEAU | non | Les **3 sections** (« CE QUI VOUS ATTEND » / « LA VILLE » / « LE COFFRE ») ont disparu : la liste est un continuum sans groupe. | RÉF : 3 intertitres mesurés, capitale **18..20 px**, encre (157,126,78) sur acajou, contraste 4,36:1 ; ruptures de rythme visibles dans les pas de cartes (**148,147,141,250,147,148,219,148** — les 250 et 219 sont les sauts de section). JEU : 18 bandes, hauteur **108,83 ± 0,37**, pas **122,59 ± 0,49** ⇒ **aucune rupture**. `mesures/19,20` | — |
| `F8` | MAJEUR | NOUVEAU | non | **Hiérarchie typographique aplatie** : la destination est rendue à la taille des *intertitres* de la maquette, pas à celle de ses *titres*. | titre de carte RÉF : capitale **26 px = 7,2 CSS**, sérif, casse de phrase, aligné à gauche. Libellé JEU : capitale **17..18 px = 4,7..5,0 CSS**, sans-sérif, CAPITALES, centré ⇒ **−31 %**. Intertitre RÉF : **18..20 px** — la valeur du jeu. `mesures/11` | — |
| `F9` | MAJEUR | NOUVEAU | non | La **carte mise en avant** (« La chaufferie ») n'a pas d'équivalent : rien ne se détache. | RÉF : **168 px** de haut et **959 px** de large (halo + bord or) contre 130/945 pour les 8 autres ; 4 lignes de texte dont une en rouge. JEU : écart-type des hauteurs **0,37 px** sur 18 rangées ⇒ aucune rangée distinguée. `mesures/19,20` | l'état réel du compte (`warning` non dessiné dans la maquette — écart assumé A4) |
| `F10` | MAJEUR | NOUVEAU | non | La **plaque de titre** « LE BUREAU — TOUT LE RESTE » (et la lampe qui la surplombe) est absente : rien ne nomme l'écran. | RÉF : plaque **y 330..406 (77 px)**, **x 138..941 (804 px = 74,4 % de la largeur)**, remplissage (186,152,73) ; lampe verte **x 690..996, y 118..214**, (36,102,61). JEU : entre le liseré (y=143) et la 1ʳᵉ bande (y=144) il n'y a **rien**, et le masque vert rend **0,000 %** sur toute la hauteur. `mesures/07,09` | — |
| `F11` | MAJEUR | NOUVEAU | non | La liste déborde et **aucun indice de défilement** ne le dit. | écart-type de luminance par colonne sur y 300..2090 : bord gauche **12,56** = bord droit **12,56** (identiques ⇒ rien à droite qui n'existe à gauche) ; contrôle positif au centre **36,69**. `mesures/16` | si un indice apparaît **pendant** le geste (non capturable ici) |
| `F12` | MAJEUR | NOUVEAU | non | La **largeur** du contenu passe de 87,5 % à 100 % : les marges du panneau disparaissent, les bandes touchent les deux bords. | RÉF : cartes **x 68..1012** ⇒ largeur **945 px = 87,50 %**, marges **6,30 % / 6,20 %** ; cadre du panneau à x≈32. JEU : bandes **x 0..1079 = 100 %**, marge **0**. `mesures/06,20` | — |
| `F13` | MAJEUR | NOUVEAU | **partiel** | Le manomètre affiche **« Unknown »** — jeton brut anglais atteignant l'écran, contre la doctrine « français via résolveurs nommés, aucun repli anglais ». | canon HUD : **« 37% »** ; capture : **« Unknown »** (sérif, dans le médaillon). *La valeur* dépend des données ; *le choix d'un jeton anglais comme repli* est de la forme. `mesures/crop_rangee1.png`, `crop_canon_hud.png` | si un repli français existe pour un autre état du compte |
| `F14` | MAJEUR | NOUVEAU | **oui** | Le bandeau est **vide de ses quatre valeurs** : argent, n° de jour, moment, heure sont des tirets. | canon HUD : valeur d'argent **n=3167 px** sur x 48..268 · « JOUR 12 · SOIRÉE » **x 837..1120 = 24,1 %** · « 21:40 » x 900..1124, encre **h=48 px**. Capture : zone valeur **n=472 px** (dont la barre or) · « JOUR — » **x 947..1034 = 8,1 %** · tiret **x 999..1033, y 87..89 = 3 px de haut**. `mesures/18` | l'état du compte au 2026-09-04 n'est pas re-mesurable ; le log du run n'est pas fourni |
| `F15` | MINEUR | NOUVEAU | non | Un **losange or** sans équivalent dans la maquette est posé sous le libellé de la 1ʳᵉ rangée, et là seulement. | (176,141,61), **x 531..548, y 215..231 = 18×17 px** ; le balayage du même jeton sur toute la zone de contenu rend **3 bandes seulement** : anneau (chrome), ce losange, trait d'onglet actif. `mesures/22` | sa **fonction** (marqueur d'état ? séparateur ?) — aucun état homologue n'est fourni pour trancher |

**Compte : 15 findings — 6 BLOQUANT, 8 MAJEUR, 1 MINEUR.** (Le compte se prend ici, pas dans la synthèse.)

---

## Écarts ASSUMÉS — vérification « rendu proprement »

| assumé (dossier) | rendu proprement ? | mesure |
|---|---|---|
| **21 entrées** au lieu de ~8 | **NON — sort de l'assumé** | le périmètre écrit dit « une entrée COUPÉE par le dock … un débordement hors du panneau … un défilement sans indice ». Les trois sont réalisés : F1, F2, F11. **19 bandes** sont dessinées dans le cadre ; si le dossier dit vrai (21 entrées), **2 sont entièrement hors cadre** (les rangées 20 et 21 commenceraient à y=2474 et y=2597). Arithmétique du débordement : rect libre **144 → 2183 = 2039 px** ÷ pas **122,59** = **16,6 rangées** ⇒ 16 entières, la 17ᵉ voilée, les 18ᵉ/19ᵉ sous le dock, la 19ᵉ coupée. |
| aucun readout « 0 » | oui (trivialement) | 0 occurrence — mais **aucun compteur n'est rendu du tout** (F6), donc l'assumé est satisfait sans être testé. |
| pas de badge sur « Inspections » | oui (trivialement) | idem : aucun badge nulle part. |
| état `warning` de la semaine non dessiné | non vérifiable | la maquette ne dessine que `none`/`active` ; la capture ne rend **aucune** carte de semaine distinguée (F9). |

## ARBITRAGES — hors table des findings

| id | sujet | constat | pourquoi ce n'est pas un défaut du client |
|---|---|---|---|
| `A1` | familles de police | la référence a été rendue en **Noto Serif / Noto Sans** (`Georgia` substituée, `fc-match` du dossier) ; le client embarque **DejaVu**. | Écart de famille non corrigible côté client. **Sans objet pour le contenu de cet écran** : la capture ne contient **aucun sérif** dans le contenu (F5/F8 portent sur la taille et la casse, mesurées, pas sur la famille). Il ne subsiste que pour « Unknown », rendu en sérif dans le chrome. |
| `A2` | `CHALEUR` vs `HEAT` | la maquette **et** le canon HUD écrivent **« HEAT »** ; le client écrit **« CHALEUR »**. | La doctrine impose le français : **le client a raison, les deux artefacts de référence sont en retard**. À arbitrer côté canon, pas côté client. |
| `A3` | silhouettes / couvre-chefs (ruling DA 2026-09-02) | — | Sans objet : aucun buste sur cet écran, ni dans la maquette ni dans la capture. |

---

## 5. Autres résolutions

**Une seule résolution est fournie** (1080×2400). La section est donc vide de mesures, et son contenu
part en non-vérifié (§6, point 1) — avec la dérivation, explicitement non mesurée, qui dit où regarder.

---

## 6. Non vérifié

1. **Les autres résolutions.** Une seule capture. *Dérivation, pas mesure* : le `CanvasScaler` est
   piloté par la largeur (`matchWidthOrHeight = 0`), donc le bandeau (143 px) et le dock (217 px
   mesurés : 2183→2400) gardent la même hauteur en px quelle que soit la hauteur d'écran. En
   **1080×1920** le rect libre vaudrait **1920 − 143 − 217 = 1560 px**, soit **1560 ÷ 122,59 = 12,7
   rangées** ⇒ **~8 entrées hors rect** au lieu de ~5. **La mesure qui trancherait : une capture réelle
   en 1080×1920.**
2. **L'absence d'animation** (ruling 2026-08-27). Aucune paire T / T+1 s n'est fournie. **La mesure qui
   trancherait : deux captures du même état à 1 s d'intervalle, différence de pixels comptée, chrome
   exclu nommément.**
3. **Le nombre réel d'entrées dans ce build.** Je compte **19 bandes** dans le cadre ; le dossier
   annonce **21** (mesure du 2026-09-04, source : le dossier, pas l'image). Si le dossier dit vrai,
   2 entrées ne sont pas dans l'image. **Non mesurable sur une image.**
4. **La liste est-elle défilable ?** Une image ne le dit pas, et aucun indice visuel n'existe (F11).
   **La mesure qui trancherait : une capture après un geste de défilement.**
5. **La fonction du losange or de la rangée 1** (F15) : marqueur d'état, séparateur, ornement ?
   Aucun état homologue n'est fourni. **La mesure qui trancherait : une capture d'un autre onglet
   actif, ou le cadre d'état correspondant dans la source.**
6. **L'état du compte au moment de la capture** n'est pas re-mesurable (le dossier le dit) : F13 et
   F14 sont des observations **datées du 2026-09-04**, et F6 pourrait en partie en dépendre — mais
   aucune rangée ne porte d'**emplacement** de compteur, ce qu'un compte vide n'expliquerait pas.
7. **Les valeurs des gardes du test** (compte de teintes distinctes, rect imprimé) : le log n'a pas
   été préservé. J'ai **re-mesuré la géométrie du chrome sur l'image** au lieu de la déduire — liseré
   à **y 138..143** contre les **143 px** dérivés par le dossier, et **50,8 CSS-HUD** contre **51,7 CSS**
   au canon (Δ 1,7 %). La dérivation du dossier est donc **confirmée par la mesure**, pas empruntée.
8. **Défaut de dossier.** Le dossier ordonne de juger le chrome contre
   `Tools/juge-visuel/ecran-principal/ecran-canon.png` mais ne le **place pas** dans le dossier. Je
   suis allé le lire à l'emplacement qu'il nomme (1176×2091, ×3) ; sans cela, F13 et F14 auraient été
   non mesurables.
9. **Le témoin.** Le dossier fournit deux canons de **série 2** dans `etats/` (900×1752). Ils
   appartiennent à une **autre génération de DA** (luminance moyenne **21,3/255**, palette bleu nuit,
   cartes sombres) et **ne sont pas l'homologue d'état** de cette capture — l'état capturé est bien le
   nominal. J'ai donc jugé contre le cadre **NOMINAL de série 6** (`reference-1080x2102.png`), comme le
   dossier l'ordonne, et je le dis parce que le choix du témoin change tout : contre la série 2, F4
   (palette, luminance) serait à re-mesurer, mais **F5, F6, F7, F9, F10 tiendraient à l'identique** —
   la série 2 porte elle aussi médaillons, compteurs, chevrons, sections et titre.
10. **Les contrôles de mes propres instruments qui ont échoué**, et ce que j'en ai fait — déclarés
    parce qu'un instrument non contrôlé ne mesure rien :
    - `mesures/08` : le contrôle positif du masque **vert** a rendu **0,00 %** sur la référence, parce
      que la zone de contenu (y≥264) **exclut la lampe** (y 118..214). Le masque ne mesurait rien dans
      cette zone ⇒ re-mesuré sur la **pleine hauteur** dans `mesures/09` (**1,157 % → 0,000 %**).
    - `mesures/17` : le contrôle négatif « bande de fond » a rendu **tous** les pixels, parce que
      l'acajou est sombre (lum<120) et entre dans le masque « encre ». Le masque n'est valide **qu'à
      l'intérieur d'une carte** (fond crème, lum 217), ce qui est le cas de toutes les fenêtres
      employées ⇒ contrôle négatif **corrigé et rejoué** : fenêtre vide dans une carte = **0**.
    - `mesures/20` : le contrôle positif attendait **3** amas et en a rendu **9**. Le masque est bon ;
      **l'attente était sous-spécifiée** — il attrape aussi les **chevrons**. La lecture des tailles
      sépare sans ambiguïté 3 badges (119×82, n≈5000) de 6 chevrons (10×20, n≈31).
    - `mesures/10` : les hauteurs de capitale rendues (99..106 px) étaient **contaminées** — la fenêtre
      étroite prenait la 2ᵉ ligne, « LA RÉPUTATION » prenait le médaillon, « LA DISTRIBUTION » prenait
      les pastilles du dock. Remplacé par `mesures/11` (segmentation en lignes de texte, fenêtres
      serrées). **Les chiffres de `10` ne sont pas utilisés dans ce rapport.**
11. **Ce que je n'ai pas regardé, délibérément** : `Assets/Scripts`, les notes d'implémentation, tout
    rapport de juge antérieur. Les causes que je nomme (« le contenu n'est pas clippé au rect libre »,
    « l'anneau est dessiné par-dessus la 1ʳᵉ rangée ») sont des **classes désignées par la mesure**,
    pas des lignes de code.

---

## Annexes

### 1. Inventaire de la référence (`reference-1080x2102.png`, 1080×2102, échelle ×3,6)

**Couche globale.** Palette (8 couleurs quantifiées) : crème (230,218,184) **20,0 %** · acajou
(48,20,16) **19,8 %** · crème (228,214,175) **15,1 %** · noir de bandeau (8,9,14) **10,9 %** · bois
(82,60,41) **10,1 %** · crème (236,225,193) **9,9 %** · acajou (37,14,12) **9,3 %** · crème
(212,196,151) **4,8 %**. Luminance moyenne **122,3/255**. Densité d'encre **48,9 %**.

| id | catégorie | bbox px | % largeur | forme / remplissage | texte | relations |
|---|---|---|---|---|---|---|
| `R.chrome` | bandeau | y 0..263 | — | noir (3,5,8) ; manomètre centré | ARGENT / $ 24 850 · tiède/HEAT · JOUR 26 / Soirée | évocation de chrome, **pas** le chrome |
| `R.bureau` | fond | y 264.. | 100 % | bois (122,74,34) puis acajou (43,18,12) | — | porte la plaque et le panneau |
| `R.lampe` | décor | x 690..996, y 118..214 | 28,3 % | abat-jour vert (36,102,61) + tige laiton | — | surplombe la plaque |
| `R.plaque` | titre | x 138..941, y 330..406 | 74,4 % | rectangle or, dégradé, centre (186,152,73) | « LE BUREAU — TOUT LE RESTE », capitales espacées | sous la lampe |
| `R.panneau` | panneau | bord à x≈32, intérieur dès x≈39 | — | acajou (43,18,12), cadre rouge sombre (107,42,32) | — | contient sections + cartes |
| `R.sec1..3` | intertitre | y 500..519 / 1187..1204 / 1700..1718 | — | — | « CE QUI VOUS ATTEND » / « LA VILLE » / « LE COFFRE » ; capitale **18..20 px** ; encre (157,126,78) ; contraste **4,36:1** | ouvre chaque groupe |
| `R.c1..c9` | carte | x 68..1012 ; h **130 px** (sauf `c4` : x 61..1019, h **168**) | 87,5 % (88,8 %) | crème (229,217,183), coins arrondis | titre sérif capitale **26 px**, contraste **11,51:1** ; sous-titre capitale ~26 px, contraste **6,13:1** | pas **147..148 px** en section, **219..250 px** entre sections |
| `R.ic1..9` | médaillon | x 80..200 dans chaque carte | — | cercle, trait sombre | — | **1997..2399 px d'encre** par carte |
| `R.b1..3` | compteur | x 862..980, **119×82 px** | 11,0 % | plaque or | « 3 » / « 5 » / « 2 » | cartes 1-3 seulement |
| `R.ch1..9` | chevron | x 971..980, **10×20 px** | — | « › » | — | une par carte |

### 2. Inventaire de la capture (`capture-1080x2400.png`, 1080×2400, échelle contenu ×3,6)

**Couche globale.** Palette : ardoise (34,42,46) **73,7 %** · bleu nuit (20,26,35) **12,1 %** · noir
(2,2,4) **9,5 %** · (34,42,45) **2,4 %** · or pâle (142,129,102) **1,5 %**. Luminance moyenne
**36,0/255**. Densité d'encre **2,9 %**.

| id | catégorie | bbox px | forme / remplissage | texte | relations |
|---|---|---|---|---|---|
| `J.chrome` | bandeau | y 0..143 (liseré or 138..143) | (15,21,29) → liseré (141,116,58) | « ARGENT » + tiret + barre or x 44..247 ; « JOUR — » x 947..1034 ; tiret x 999..1033 | **50,8 CSS-HUD** (canon 51,7) |
| `J.mano` | médaillon | x ~445..635, y 17..206 | disque bleu nuit, anneau or | **« Unknown »** (sérif) + « CHALEUR » | descend **63 px sous le bandeau**, dans `J.r1` |
| `J.r1..r18` | rangée | x 0..1079, h **108,83 ± 0,37 px**, pas **122,59 ± 0,49**, gouttière **13,76 px** | aplat (34,42,46), **aucun bord, aucun rayon mesurable** | **un** libellé centré, capitales, capitale **17..18 px**, encre (185,173,146), contraste **6,57:1** | **G = 0** et **D = 0** px d'encre sur les 15 rangées mesurées |
| `J.r19` | rangée | y 2351..2400 (**49 px sur 109**) | idem, voilée | encre **y 2396..2399** seulement | coupée par le bord bas |
| `J.losange` | ornement | x 531..548, y 215..231 (**18×17**) | losange (176,141,61) | — | unique dans l'écran |
| `J.dock` | dock | pastilles y 2183..2305 ; voile dès y≈2156 | 4 disques ∅ ~123 px, centres x 258/446/634/821 ; opaque (couvre la séparation noire) | EMPIRE · FAMILLE · FILIÈRE · PLUS ; trait or actif x 802..839 | **par-dessus** `J.r17..r19` |

### 3. Correspondance des repères

- **Contenu** : référence et capture à la **même échelle**, ×3,6 (1080 px = 300 CSS). Rapport **1,00**.
  Toute différence de taille sur le contenu est réelle.
- **Chrome** : capture à **×2,755** (1080 px = 392 CSS-HUD) ; canon HUD à **×3** (1176 px = 392 CSS).
  Rapport canon/capture **1,0889** ⇒ toutes les grandeurs du bandeau sont comparées **en % de la
  largeur**, jamais en px bruts.
- **Origine verticale** : le haut du contenu est aligné sur le **bas du bandeau** — référence y=264,
  capture y=144 — jamais sur le pixel absolu, comme le dossier l'impose. Le bas est aligné sur le
  **haut du dock** (capture : y=2183 mesuré ; la référence n'a qu'une évocation de dock).
- **Contrôle du repère** : le liseré de bandeau, mesuré des deux côtés, tombe à **50,8 CSS-HUD**
  (capture) contre **51,7 CSS** (canon) — Δ **1,7 %**, dans le bruit.

### 4. Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre et porte ses contrôles.

| script | grandeur |
|---|---|
| `01_couche_globale.py` | palette quantifiée, luminance, densité (3 images) |
| `02_chrome_capture.py` | liseré de bas de bandeau (profil R−B par ligne) |
| `03_dock_capture.py` | profil de la moitié basse, repérage du dock |
| `04_rangees_capture.py` | segmentation rangées / séparations noires |
| `05_gouttiere.py` | colonne de bord x=20, contenu sous le dock |
| `06_cartes_reference.py` | bandes crème = cartes (bornes, hauteurs, remplissage) |
| `07_ref_panneau_plaque.py` | bandeau, plaque, lampe, cadre du panneau |
| `08_parties_ref_dans_capture.py` | 4 masques d'identité sur les deux zones de contenu |
| `09_lampe_et_pleine_hauteur.py` | **correctif du contrôle positif de 08** (masque vert, pleine hauteur) |
| `10_typographie.py` | *(bbox contaminées — remplacé par 11, chiffres non utilisés)* |
| `11_typo_v2.py` | segmentation en lignes de texte + hauteurs de capitale |
| `12_contraste.py` | contrastes WCAG sur cœur de glyphe (érosion 1 px) |
| `13_dock_occlusion.py` | géométrie des 4 pastilles, z-ordre, encre des rangées basses |
| `14_libelles_bas.py` | encre **chaude** seule (exclut le cerclage des pastilles) |
| `15_r18_r19.py` | fenêtres serrées sur `LA LOI` et la 19ᵉ rangée ; voile du dock |
| `16_haut_et_defilement.py` | descente du médaillon ; indice de défilement (écart-type par colonne) |
| `17_structure_rangees.py` | encre gauche/centre/droite par carte et par rangée (+ contrôle corrigé) |
| `18_bandeau.py` | bandeau de la capture contre le canon HUD, en % de largeur |
| `19_controle_positif.py` | régularité des rangées, centrage, onglet actif |
| `20_ref_badges_sections.py` | badges, chevrons, carte mise en avant, marges, rythme |
| `21_collision_medaillon.py` | emprise de l'anneau or sur la bande du libellé de r1 |
| `22_jeton_or.py` | où vit le jeton or (176,141,61) dans la zone de contenu : 3 bandes, 493 px |
| `crop_haut.png` `crop_bas.png` `crop_milieu.png` `crop_rangee1.png` `crop_laloi.png` `crop_r19.png` `crop_canon_hud.png` | découpes à l'appui |
