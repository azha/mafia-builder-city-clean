# Juge visuel ⊥ — ㉞ Les ordres du soir (« le carnet, la ville, ce qui arrive ») — r1 — 2026-09-07

Dossier : `Tools/juge-visuel/carnet/r1-2026-09-07/` · scripts et sorties : `mesures/`
Juge à contexte vierge. Aucun code client, aucune note d'implémentation, aucun rapport de juge
antérieur n'a été ouvert. Aucune compilation, aucun run, aucun Docker : PIL + python3 seulement.

---

## Verdict : NON APPROUVÉ

**La capture fournie ne montre pas l'écran ㉞.** Elle montre une fiche de lieutenant et son éditeur
de règles ; aucune des parties de la maquette du carnet n'y est présente. L'écran ㉞ n'a donc pas pu
être jugé ce tour — ce qui se juge, et qui l'est ci-dessous, c'est le **chrome du shell** (bandeau et
dock), qui est alimenté et lisible sur l'image.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport n'est pas recevable. Toutes les valeurs sortent des scripts de
`mesures/` ; l'unité est le **CSS-HUD** (392 CSS = 1080 px, ×2,7551) pour le chrome et le
**CSS-série 6** (300 CSS = 1080 px, ×3,6) pour le contenu.

| # | grandeur | référence / canon | capture | delta | script |
|---|---|---|---|---|---|
| 1 | hauteur du bandeau (fond jusqu'à 140, filet 141-142, contenu dès 143) | 52,0 CSS (dérivé du code, dossier) | 143 px = **51,9 CSS** | +0,1 CSS | `03`,`15` |
| 2 | marge droite de l'aile droite | canon **16,7 CSS** | **16,7 CSS** | **0,00** | `06` |
| 3 | dock — centre x du rond 2 | canon 161,5 CSS | 161,9 CSS | +0,4 CSS | `11` |
| 4 | dock — centres x des 4 libellés | canon 93,3 / 161,3 / 229,4 / 297,4 | 94,0 / 162,1 / 229,9 / 298,0 | +0,5 à +0,8 CSS | `11` |
| 5 | dock — hauteur de capitale d'EMPIRE | canon 18 px = 6,53 CSS | 18 px = **6,53 CSS** | **0,00** | `11` |
| 6 | dock — hauteur d'encre de FILIÈRE / MARCHÉ (accent compris) | canon 21 px = 7,62 CSS | 21 px = **7,62 CSS** | **0,00** | `11` |
| 7 | dock — diamètre des ronds | canon 46,1 CSS | 45,4 CSS | −0,7 CSS (−1,5 %) | `11` |
| 8 | dock — marqueur d'onglet actif | canon : barre or sous EMPIRE | barre or 38×5 px sous EMPIRE, centre 93,8 CSS | même onglet, même forme | `11` |
| 9 | filet du bandeau — couleur | `--braise` **(224,102,74)** attendu en état BRÛLANT (`.tel.chaud`) | **(224,102,73)** | 1/255 sur un canal | `04` |
| 10 | filet — structure du dégradé vers les bords | canon 30 → 176 sur 0..73 CSS | 24 → 224 sur 0..80 CSS | même forme (fondu, pas de coupure) | `17` |
| 11 | manomètre — **sens de l'aiguille** | BRÛLANT ⇒ vers l'arc braise | aiguille haut-**droite**, dans la braise | pas d'inversion | `zoom-cap-mano.png` |
| 12 | manomètre — bord extérieur de l'arc : résidu au cercle ajusté | réf 0,77 px · canon 0,39 px | **1,45 px** (max), 0,44 moyen | l'arc EST circulaire | `08` |
| 13 | manomètre — épaisseur de la bande / diamètre | réf 0,0637 | 0,0680 | +6,7 % (sous le seuil) | `08` |
| 14 | libellé CHALEUR — hauteur de capitale | canon HEAT 5,00 CSS | CHALEUR 5,08 CSS | +0,08 CSS | `17` |
| 15 | gouttière | rien du contenu sous le bandeau ni sous le dock | y 2120..2151 : **0 px d'encre** ; y<143 : chrome seul | conforme | `15` |
| 16 | échelle de la référence vérifiée sur l'image | CSS déclare réglure 26 px, pastille 15 px | 93,5 px = **25,97 CSS** · 54 px = **15,00 CSS** | l'échelle ×3,6 tient | `14`,`18` |
| 17 | glyphe « € » de la valeur ARGENT | — | encre pleine 443-445, demi-teinte 446, **fond pur 447-450** avant la lueur | **entier**, pas coupé | `05` |
| 18 | maquette — artefact d'animation figé | 228 `@keyframes` dans la page, **0** sur une classe du cadre #85 | — | la référence n'en embarque pas | `20` |

Deux soupçons visuels ont été **réfutés par la mesure** et ne figurent donc pas dans les écarts :
le « € coupé par le médaillon » (ligne 17) et « l'arc du manomètre est une forme à facettes »
(ligne 12 — l'escalier venait de mon agrandissement au plus proche voisin, ×4/×6).

---

## 0. L'écran, tel que la maquette le dit

*(écrit sur la référence SEULE, `reference-1080x2102.png`, avant ouverture de la capture)*

**But.** On ne donne pas un ordre : on **compose une soirée**. Le joueur voit la liste ordonnée des
gestes qui partiront ce soir, dans l'ordre, et décide s'il en ajoute ou s'il lance comme ça. C'est
un écran de **composition puis d'engagement**, pas de consultation.

**Ordre de lecture.** (1) La **page crème** — 42,5 % de l'aire de la zone de contenu, luminance 143
contre 22 pour le fond : c'est un objet clair posé dans un écran nuit, l'œil ne peut pas commencer
ailleurs. (2) Dans cette page, la **colonne des huit rangées numérotées**, cinq pleines puis trois
« — rien — » en italique gris : la capacité restante est lisible avant même de lire les mots.
(3) Le **titre** « Les ordres de ce soir » (hauteur de capitale 9,44 CSS) et son sous-titre, qui
donnent la règle du jeu (« Entre quatre et huit gestes »). (4) En bas, détaché sur un **pied bleu
nuit**, la réplique du lieutenant puis le **bouton d'engagement** « LANCER LA SOIRÉE » avec son
avertissement « une fois partie, on ne la reprend pas ».

**Zones.** ① évocation du bandeau (0 → 120,6 CSS, avec la scène de district sous voile) ·
② en-tête ocre `#1f1c17` (120,6 → 167,8 CSS) : titre + règle · ③ corps sombre (167,8 → 494,4 CSS)
portant la **page du carnet** (178,6 → 423,6 CSS) · ④ pied bleu nuit `#141a21` (496,4 → 579,2 CSS) :
la voix + le CTA.

**Traits d'identité — ce qui fait que c'est CET écran.**
1. **La page de carnet crème réglée**, avec sa réglure tous les 26 CSS et ses pastilles numérotées
   noires de 15 CSS : un objet de papier dans une interface nuit.
2. **Huit rangées, cinq remplies, trois vides nommées « — rien —»** : le plafond est montré, pas dit.
3. Le **compteur discret** « 5 ORDRES SUR 8 » en capitales espacées, aligné sur la ligne de base du
   titre de page.
4. Le **pied qui change de famille de couleur** (bleu nuit `#141a21` contre l'ocre du reste) : la
   voix du lieutenant et l'engagement sont détachés du carnet.
5. Le **CTA doré cerclé** (247,5 × 29,2 CSS) qui porte sa propre mise en garde à droite, en petit.

**Ce que dit le vide.** L'état vide de cet écran n'est pas une punition : les trois rangées « — rien
— » et la réplique « *Cinq ordres. On peut en mettre trois de plus, ou partir comme ça.* » disent
exactement « ça plafonne et ça bloque, rien n'est perdu ». La maquette d'atelier
`etats/vide-maquette-carnet.png` (lampe, bloc à spirale, stylo posé, quelques lignes écrites en haut
et beaucoup de réglure libre) dit la même chose en image : **le carnet attend**, il ne reproche rien.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, et pas par un écart de degré : **ce n'est pas le même écran**. La capture montre une fiche de
lieutenant (« Lt. Halde », « Cuisinier », « RÉCENT », « Au repos »), un bloc « Aucune équipe
rattachée », un appel « Recruter un nouveau lieutenant », une table de dix propriétés, puis
AUTONOMIE, RÉAFFECTER, ÉDITEUR DE RÈGLES et un bloc « Diagnostics » de 23 lignes.

La mesure le dit sans ambiguïté et de façon **non uniforme** — donc l'instrument discrimine :
l'aplat crème `#efe7d6`, qui est l'élément héros du carnet, couvre **34,36 %** des échantillons de
la référence et **0,144 %** de la capture ; le **canon du HUD**, écran dont on sait qu'il ne porte
aucun carnet, en porte **0,436 %**, c'est-à-dire **trois fois plus** que la capture. La luminance
moyenne de la zone de contenu tombe de **143,0** (référence) à **28,8** (capture) : l'écran
photographié est cinq fois plus sombre que la maquette. Aucune des huit rangées numérotées, aucune
réglure, aucun pied bleu, aucun CTA doré n'existe sur l'image.

Ce qui **est** jugeable, c'est le chrome, et il est alimenté (ARGENT et JOUR portent des valeurs ; la
phase « — » hors district est l'état voulu). Le dock est presque au canon au dixième de CSS près
(quatre lignes de contrôle positif à Δ ≤ 0,8 CSS), le filet est bien en braise comme l'exige l'état
BRÛLANT, l'aiguille pointe du bon côté. Le seul écart de chrome qu'un joueur verrait sans côte à
côte est le **déplacement de l'aile ARGENT** : elle commence à **16,4 %** de la largeur au lieu de
**4,1 %** au canon et **4,4 %** dans la maquette — deux témoins indépendants qui concordent. Le bloc
d'argent n'est plus dans le coin ; il est poussé au milieu-gauche et sa valeur vient mourir à
**1,45 CSS** de l'anneau du manomètre là où le canon lui laisse **87,00 CSS**. La cause probable est
sous les yeux : la **flèche retour** occupe le coin, et elle n'existe ni au canon ni dans les barres
de la série 6.

Les trois écarts de tête, par impact perçu : **(1)** l'écran n'est pas celui de la maquette ;
**(2)** l'aile ARGENT déplacée et serrée contre le manomètre ; **(3)** la valeur d'argent rendue
17,7 % plus petite qu'au canon.

---

## 3. Écarts

Un finding par ligne, une seule table, gravité en 2ᵉ colonne. `ASSUMÉ` et `ARBITRAGE` sont dans des
tables à part et **ne sont pas comptés** ici. Les observations sur l'écran *réellement* photographié
sont dans une table à part également, et ne sont **pas** comptées comme findings de ㉞ (elles ne lui
appartiennent pas).

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | **BLOQUANT** | NOUVEAU | non | **La capture ne montre pas l'écran ㉞.** L'intégralité de l'inventaire de la maquette est ABSENT EN JEU : page crème, 8 rangées numérotées, compteur « 5 ordres sur 8 », réglure, en-tête ocre, pied bleu nuit, réplique, CTA « LANCER LA SOIRÉE ». L'image montre une fiche de lieutenant + éditeur de règles. | crème `#efe7d6` : **34,361 %** des échantillons en référence, **0,144 %** en capture — et **0,436 %** sur le canon HUD (écran sans carnet, contrôle négatif) ⇒ la capture en contient **moins** qu'un écran connu pour ne pas en avoir. Luminance de la zone de contenu **143,0 → 28,8**. Palette dominante de la capture : (22,22,28) 55,4 % / (39,43,48) 26,9 % — 0 % de crème. Rythme vertical : la référence porte un saut de **+187** à y=643 (entrée dans la page) et **−194** à y=1525 ; la capture n'a aucun saut > 78 hors chrome. `mesures/01`, `02`, `14` | **Pourquoi** : je ne sais pas si l'écran ㉞ n'est pas monté, si le test de planche a photographié un autre locataire, ou si le fichier a été mal nommé à la source. Le PNG du dossier est **byte-identique** (sha256 `b04aaad9…`, 303 994 o) au fichier déclaré `Assets/Screenshots/planche_signer_l_ordre_1080x2400.png` : ce n'est **pas** une erreur d'assemblage du dossier. Aucune autre planche du répertoire n'est un doublon de celle-ci (les 22 autres planches du répertoire comparées pixel à pixel, écart minimal **40,2 %**), donc ce n'est pas non plus une copie d'une planche voisine. Trancherait : le journal du run avec le nom du locataire monté et le rect imprimé, ou une capture reprise en nommant le contrôleur. |
| `M1` | **MAJEUR** | NOUVEAU | non | **L'aile ARGENT du bandeau est déplacée vers le centre.** Elle ne commence plus au bord gauche : le libellé démarre à 16,4 % de la largeur au lieu de ~4 %. Chrome **partagé** : vaut pour tous les écrans sous shell, pas propre à ㉞. | bord gauche du libellé ARGENT : capture **177 px = 16,4 %** de la largeur ; canon HUD **48 px = 4,1 %** ; maquette série 6 **48 px = 4,4 %**. En CSS-HUD : **64,2** contre **16,0** ⇒ **+48,2 CSS**. La jauge dorée suit : début à **63,9 CSS** contre **16,3 CSS** au canon ; sa longueur passe de 149,0 à **74,0 CSS**. `mesures/16`, `19` | Je ne peux pas prouver depuis l'image que la flèche retour (x 84..108 px) est la cause ; c'est l'hypothèse que la géométrie désigne. Trancherait : une capture du même shell sans la flèche. |
| `m1` | MINEUR | NOUVEAU | **oui** | La valeur d'argent vient buter contre l'anneau du manomètre : il ne reste presque rien entre l'encre et la lueur. | écart minimal encre or ↔ premier pixel braise : **4 px = 1,45 CSS** (à y=91). Canon : **87,00 CSS**. Le glyphe « € » lui-même est **entier** (contrôle positif 17). `mesures/06` | Dépend de la longueur de la valeur (« 9 627 820,00 € », 14 caractères, contre « $ 24 850 » au canon). Trancherait : une capture avec un montant court. |
| `m2` | MINEUR | NOUVEAU | **oui** | La valeur d'argent est rendue nettement plus petite qu'au canon. | hauteur de capitale des chiffres : **11,25 CSS** (capture) contre **13,67 CSS** (canon) ⇒ **−17,7 %**, hors tolérance (≤ 5 %). Le libellé ARGENT, lui, est **plus grand** : 6,90 contre 6,33 CSS (+9 %). `mesures/16`, `17` | Le sens opposé des deux écarts (valeur −18 %, libellé +9 %) suggère un **rétrécissement automatique de la valeur pour tenir dans la place restante**, pas un jeton de taille faux — mais l'image ne peut pas le prouver. Trancherait : la même capture avec un montant court. |
| `m3` | MINEUR | NOUVEAU | non | Le médaillon du manomètre est un peu plus grand et son anneau plus épais qu'au canon. | diamètre extérieur de l'anneau, coupe par le centre : **62,43 CSS** (capture) contre **60,00 CSS** (canon) ⇒ **+4,0 %**. Trait de l'anneau : **1,81 CSS** contre **1,33 / 1,00 CSS**. Centre x : 195,8 CSS contre 194,8 (attendu 196) ⇒ centrage correct. `mesures/04`, `06` | Le canon est en état **calme** (laiton) et la capture en état **BRÛLANT** (braise) : je ne peux pas exclure que la variante `.chaud` épaississe légitimement le boîtier. La CSS `.tel.chaud` ne parle que de **couleur** (4 règles, toutes en `--braise`), pas d'épaisseur — mais je n'ai pas de rendu de référence en état chaud. |
| `m4` | MINEUR | NOUVEAU | non | Le mot de chaleur est posé deux fois plus près du moyeu que dans la maquette : il serre l'aiguille et son pivot. | haut du mot sous le moyeu : capture **+7 px = +2,5 CSS**, maquette série 6 **+20 px = +5,6 CSS**. Rapporté au diamètre du médaillon : **0,038** contre **0,111** (≈ ⅓). Largeur du mot : « Brûlant » **37,4 CSS** contre « tiède » **18,6 CSS**. `mesures/07`, `17` | Pas de témoin unique : le **canon** place au contraire son nombre **au-dessus** du moyeu (−0,115), donc canon et maquette ne disent pas la même chose ici. Et « Brûlant » n'est pas « tiède » : les longueurs et la casse diffèrent, la comparaison de hauteur n'est pas opposable. |

**Compte : 1 BLOQUANT, 1 MAJEUR, 4 MINEURS.** Aucun d'eux ne porte sur le contenu de ㉞ — il n'a pas
été photographié.

---

## Table ASSUMÉ *(non comptée)*

| id | ce qu'on voit | pourquoi c'est assumé | ce qui le ferait SORTIR de l'assumé | rendu proprement ? |
|---|---|---|---|---|
| `S1` | Aile droite : « JOUR 50 » puis « — » à la place de la phase | Doctrine du dossier : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district ; ARGENT et JOUR **sont** alimentés ⇒ état voulu hors ① | un « — » sur ARGENT ou sur JOUR, ou un « Unknown » dans le médaillon (⇒ chrome non alimenté, le chrome ne se jugerait plus) | oui — le tiret est centré, à la bonne hauteur (1,09 CSS d'encre), aucun libellé de repli visible |
| `S2` | Bandeau et dock de la capture ≠ ceux dessinés par le cadre de série 6 | Le cadre dessine une **évocation** à 300 CSS ; le chrome réel est celui du shell à 392 CSS — le dossier l'assume et impose le canon HUD comme témoin | un écart de chrome mesuré **contre le canon** (c'est le cas de `M1`, `m1`, `m2`, `m3`, qui sortent donc de l'assumé) | oui |
| `S3` | L'illustration d'état vide `vide-carnet.png` n'apparaît nulle part | Le dossier mesure 0 montage d'illustration d'état vide dans le client : le montage n'existe pas encore | l'apparition d'un état vide qui se lirait comme une **perte** ou un **écran cassé** plutôt que comme un plafond | non vérifiable ce tour : aucun état vide de ㉞ n'est capturé |

---

## Table ARBITRAGE *(non comptée — rien à corriger côté client)*

| id | objet | mesure | destinataire |
|---|---|---|---|
| `A1` | Les quatre ronds du dock sont **vides** ; le canon pose une icône dans chacun | 4 ronds de 45,4 CSS, 0 encre à l'intérieur ; canon : 4 icônes | arbitrage user connu (« j'aime pas les icônes ») — rien à faire |
| `A2` | **Flèche retour** en haut à gauche du bandeau (x 84..108 px, y ≈ 55..75) | absente du canon HUD et des barres de la série 6 | arbitrage user (« la flèche retour n'a pas de domicile en série 6 ») — mais c'est elle que la géométrie désigne comme cause de `M1` : si elle reste, l'aile ARGENT demande une place |
| `A3` | 3ᵉ onglet : **FILIÈRE** en jeu, **MARCHÉ** au canon | même x (centre 229,9 vs 229,4 CSS), même hauteur d'encre (7,62 CSS) | renommage produit ⇒ canon HUD à mettre à jour, pas un défaut d'écran |
| `A4` | Police du sérif | la source demande `Georgia,serif` ; `fc-match Georgia` sur la machine de rendu → **Noto Serif** ; le client embarque **DejaVu Serif** | la référence n'a jamais montré Georgia à personne : famille et chasse du sérif = arbitrage. Sur le **sans**, référence et client partagent DejaVu Sans ⇒ là, la comparaison reste opposable |
| `A5` | La maquette est en retard sur la langue et le format | référence : `HEAT`, `$ 24 850` · canon : `HEAT`, `JOUR 12 · SOIRÉE` · client : **CHALEUR**, **9 627 820,00 €** | ruling « fr réel » : le client a raison ⇒ **maquette à mettre à jour (blender)**, jamais un écart d'écran. Noté une fois. |
| `A6` | Le mot du manomètre est capitalisé (« Brûlant ») là où la maquette est en bas de casse (« tiède ») | hauteurs non comparables (casse et accents différents) | arbitrage de rédaction |

---

## Hors périmètre de ㉞ — observations sur l'écran RÉELLEMENT photographié *(non comptées)*

Un juge doit dire ce qu'il voit. Ces défauts sont réels et mesurés sur une planche commitée, mais ils
appartiennent à l'écran de lieutenant, pas à ㉞ : **ils ne sont pas comptés dans les findings
ci-dessus** et ils doivent être re-jugés dans le dossier de leur propre écran.

| id | observation | mesure |
|---|---|---|
| `H1` | **19 jetons d'enum bruts, en anglais et en SCREAMING_SNAKE**, atteignent l'écran dans le bloc « Diagnostics », sous des intitulés pourtant français (Déclencheurs, Actions, Combinateur) : `TIME`, `LIFECYCLE`, `ORDER_LIFECYCLE`, `PEER_EVENT`, `REQUEST_PLAYER_INPUT`, `REROUTE_TO`, `ALERT_PEER`, `ABORT_CURRENT_TASK`, `LOG_EVENT_AS`, `ASSIGN_SUBORDINATE`, `INCREMENT_DECOY_AT`, `FLAG_DISSENT`, `REQUEST_VETO_CLEAR`, `REVERT_DEFAULT_SCRIPT`, `PROMOTE_UNDERSTUDY`, `ESCALATE_TO_TIER`, `SEQ`, `COHORT`, `AND_IF` ; plus **15 « soon »** et **4 « Tier N »**. Doctrine : « aucun enum brut, aucun repli anglais ne doit atteindre l'écran ». | 23 lignes d'encre comptées entre y=1725 et 2145 (`mesures/12`), conformes au découpage 1+1+4+1+14+1+1. Crop lisible : `mesures/zoom-cap-diagnostics.png` |
| `H2` | Ce même bloc est **sous le plancher de contraste** : texte petit à 3,74:1 au pic, là où la doctrine exige 4,5:1. | encre réelle **(106,115,125)** sur fond **(22,22,28)** ⇒ **3,74:1** ; hauteur d'encre 9-11 px = **2,50 à 3,06 CSS**. Contrôles positifs du même instrument : « Lt. Halde » **13,50:1**, « EMPIRE » **8,51:1**, rangées de la table **6,85:1**. `mesures/13` |
| `H3` | Marqueurs ASCII de repli visibles en tête de chaque rangée de la table : `[*]`, `[>]`, `[>>]`, `[..]`, `[...]`, `[....]`. | 10 rangées, crop `mesures/zoom-cap-table.png` |
| `H4` | Incohérence de contenu : l'en-tête dit **« Lt. Halde »**, la rangée « Nom » de la table dit **« Lt. Rook »**. | même crop ; **dépend des données** |
| `H5` | Deux fragments de rail dorés orphelins à gauche, qui ne rejoignent rien. | x=72..103 → or à y=286..289 ; x=136..199 → or à y=232..354. `mesures/19` |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, en **1080×2400**. La ligne GO publie elle-même son
dénominateur : « (a) deux résolutions 1920+2400 → **NON — 2400 seulement** ». Le comportement en
1080×1920 (et donc tout risque de coupe, de débordement ou de reflux propre à cette hauteur) est
**non vérifié**. Sur la seule résolution fournie, la gouttière est respectée : 0 pixel d'encre de
contenu dans les 32 px au-dessus du dock, rien du contenu au-dessus de y=143, et seul le médaillon —
qui est du chrome — déborde sous le filet jusqu'à y=203.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Quel écran a été monté, et pourquoi ce n'est pas ㉞.** L'image ne le dit pas et le journal du run
   n'est pas joint. *Trancherait* : le journal du run (nom du locataire monté, rect imprimé, SHA de
   l'arbre), ou une reprise de la planche nommant explicitement `CarnetScreenController`.
2. **L'écran ㉞ lui-même** : géométrie, palette, typographie, espacements, rythme, état vide, sens du
   vide, contrastes. Rien n'a pu en être mesuré. *Trancherait* : une capture de ㉞.
3. **L'identité du compte photographié.** Déclarée par corps de commit (« 72 118 · 17 bâtiments ·
   3 lt · 2 planques · 7 cartes », compte gelé `demo_capture`), **journal non joint**. Aucune valeur
   de l'image n'est donc opposable ; seule la FORME a été jugée. *Trancherait* : la ligne
   `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal.
4. **Absence d'animation** (ruling « aucune animation sur un nouvel écran »). Une seule image : la
   ligne GO le dit (« (b) paire T / T+1 seconde → **NON** »). Côté maquette en revanche, c'est
   **vérifié** : la page compte 228 `@keyframes` mais **zéro** règle d'animation touche une classe du
   cadre #85 (contrôle positif du balayage : `.pot` en rend 2). *Trancherait* : deux captures du même
   état à T et T+1 s.
5. **L'onglet actif.** Le marqueur or est sous **EMPIRE**, alors que le contenu photographié relève de
   la famille. La planche est une **surimpression** : la ligne GO déclare « (c) onglet actif asserté
   → NON déclaré, le chemin joueur n'est pas exercé ». Je ne peux donc rien en conclure.
6. **Le cadre d'état homologue.** Le groupe #85–91 compte sept cadres et seul le **nominal (#85)** est
   rendu ; les six autres ne sont lisibles qu'en SOURCE. Puisque la capture ne montre aucun état du
   carnet, **je n'ai pas eu à choisir d'homologue** : c'est bien #85 (compteur « 5 ordres sur 8 »,
   huit pastilles, pied présent) qui reste le témoin, et la capture n'en montre aucun élément.
7. **Le manomètre en état chaud, côté maquette.** Le canon HUD est en état **calme** ; la variante
   `.tel.chaud` n'existe qu'en CSS (4 règles, toutes en `--braise`). Je peux donc valider la
   **couleur** de l'anneau mais pas son **épaisseur** ni son **diamètre** en état chaud (`m3`).
   *Trancherait* : un rendu du HUD avec `.tel.chaud`.
8. **La pollution du canon par ses pastilles d'annotation ①..⑥.** Elles faussent les bbox : la
   pastille ⑥ envahit le rond 1 du dock (D_x mesuré 55,2 CSS contre 46,1 en hauteur) et le rond 3 du
   canon rend 131,8 CSS, ce qui est absurde. J'ai **exclu x < 170** et je m'appuie sur les diamètres
   **verticaux** et sur les ronds 2 pour la comparaison ; les centres x des ronds 3 et 4 du canon ne
   sont donc pas mesurés (seuls ceux des **libellés** le sont, et ils concordent à 0,6 CSS près).
9. **La hauteur du dock au canon.** Le dock du canon est translucide sur l'art 3D : il n'a pas de
   frontière opaque. J'ai mesuré celle de la capture (**248 px = 90,0 CSS**) sans témoin opposable.
10. **Les valeurs affichées** (montant, jour, noms) : aucun corps réel comparable n'est fourni pour ce
    compte, et aucun rapport juge-données n'existe pour cet écran. Toute question « d'où vient cette
    valeur ? » reste ouverte.
11. **La chaîne de capture elle-même.** Le dossier avertit qu'un arrondi de positions monde
    (`SnapToScreenPixel`) a déjà déplacé des éléments jusqu'à ±96 px sur des planches de district. Je
    n'ai relevé **aucune position suspectement ronde** dans ce qui a été mesuré (les centres du dock
    tombent sur 93,8 / 161,9 / 229,8 / 297,8 CSS, pas sur des entiers), mais la chaîne reste un
    suspect tant que le correctif n'est pas posé.

---

## Annexes

### Annexe 1 — Inventaire de la référence (`reference-1080x2102.png`, 300 CSS = 1080 px, ×3,6)

**Frontières horizontales mesurées** (`mesures/18`) — y en px, puis en CSS :

| y (px) | y (CSS) | frontière |
|---|---|---|
| 3 | 0,8 | bord du `.tel` |
| 434 | 120,6 | bas de l'évocation du bandeau / haut de `.cn-tete` |
| 604-607 | 167,8-168,6 | filet de séparation `#3b352c`, bas de `.cn-tete` |
| 643 | 178,6 | **haut de la page crème** (saut de luminance **+187,1**) |
| 733/827/920/1014/1107/1201/1295/1388/1482 | 203,6 → 411,7 | les 9 traits de réglure (pas mesuré **93,5 px = 25,97 CSS**, CSS déclarée 26) |
| 1525 | 423,6 | **bas de la page crème** (saut **−193,9**) |
| 1787 | 496,4 | haut du pied `.cn-bas`, bordure supérieure 2 px |
| 1938-1941 / 2040-2043 | 538,3 / 566,7 | bordures du bouton `.cn-geste` |
| 2085 | 579,2 | bas du `.tel` |

**Fiches**

| id | catégorie | parent | bbox (px) | bbox (CSS) | forme / remplissage / texte |
|---|---|---|---|---|---|
| `P1.tete` | en-tête | `.panneau` | (0,434)-(1079,606) | 0-120,6 → 168,3 CSS | aplat `#1f1c17`, filet bas 1 px `#3b352c` |
| `P1.h3` | titre | `P1.tete` | (52,479)-(574,512) | gauche 14,4 CSS | « Les ordres de ce soir », hauteur de capitale **9,44 CSS**, sérif, crème `#f0dfc4` |
| `P1.p` | texte courant | `P1.tete` | (52,542)-(750,566) | gauche 14,4 CSS | « Entre quatre et huit gestes… », **6,94 CSS**, gris chaud `#9a8f78` |
| `P2.page` | plaque | `.cn-body` | (50,643)-(1029,1524) | **272,2 × 245,0 CSS**, marges **13,9 / 13,9 CSS** | rectangle r≈2, aplat mesuré **(239,231,214)** = `#efe7d6` ; réglure `#cbbfa4` tous les **25,97 CSS** ; ombre portée |
| `P2.h4` | titre de plaque | `P2.page` | (87,679)-(987,704) | hauteur d'encre **7,22 CSS** | « Carnet du soir » (sérif, gras) + « 5 ORDRES SUR 8 » à droite (capitales espacées, `#7f7663`) |
| `P2.slot1..5` | rangée | `P2.page` | pastilles centrées y = 786,5 / 879,5 / 973,5 / 1066,5 / 1160,5 | pas **25,83 à 26,11 CSS** | pastille ronde **D = 15,00 CSS** aplat `#2a2118`, chiffre crème ; titre sérif gras `#2a2118` ; sous-titre sans-sérif `#7f7663` |
| `P2.slot6..8` | rangée vide | `P2.page` | pastilles centrées y = 1254,5 / 1347,5 / 1438,5 | pas 25,83 / 25,28 CSS | pastille **`#cbbfa4`**, chiffre `#7f7663` ; libellé « — rien — » en **italique** `#a89e88`, centré |
| `P3.bas` | pied | `.carn6` | (0,1787)-(1079,2084) | hauteur **82,8 CSS** | aplat mesuré **(20,26,33)** ≈ `#141a21`, bordure haute 2 px `#2c3640` |
| `P3.dit` | citation | `P3.bas` | (51,1826)-(983,1899) | 2 lignes, **8,61 / 8,33 CSS** | « **Lt. Rin :** *« Cinq ordres… »* », sérif italique `#cdd6e0`, nom en romain gras |
| `P3.cta` | bouton | `P3.bas` | (96,1938)-(986,2043) | **247,2 × 29,2 CSS** | rectangle r≈3, bord `#5a4a2a`, fond `#241c11` ; « LANCER LA SOIRÉE » or `#d9ab4e` hauteur d'encre **7,50 CSS** ; à droite, « une fois partie, on ne la reprend pas » en petit `#9a8a6a` |

**Couche globale (référence)** — palette quantifiée (6 couleurs) :
écran entier (22,23,24) 39,9 % · **(239,231,214) 28,5 %** · (9,12,18) 19,9 % · (237,231,215) 5,3 % ·
(99,93,83) 3,5 % · (242,234,217) 2,9 % ; luminance moyenne **100,3**.
Zone de contenu (y 434..1780) : **(239,231,214) 42,5 %** · (22,21,19) 39,1 % · (234,226,208) 9,3 % ·
(242,234,217) 5,2 % · (93,88,78) 3,7 % ; luminance moyenne **143,0**.

### Annexe 2 — Inventaire de la capture (`capture-1080x2400.png`)

**Chrome — mesuré, jugé.**

| id | partie | mesure |
|---|---|---|
| `C1.bandeau` | bandeau | fond (12,19,26)→(12,20,26) de y=0 à 140 ; **filet braise (224,102,73) à y=141-142** ; contenu dès y=143 ⇒ **51,9 CSS** |
| `C1.retour` | flèche | ← blanc, x ≈ 84..108 px (30..39 CSS) — absent du canon (voir `A2`) |
| `C1.argent` | aile gauche | libellé « ARGENT » y 27..45, **6,90 CSS**, gauche **64,2 CSS**, largeur 38,5 CSS · valeur « 9 627 820,00 € » or **(242,201,106)** = `hudMoneyGold #f2c96b`, hauteur de capitale **11,25 CSS**, encre x 179..446 · jauge or y=118, x 176..379 (**74,0 CSS**) |
| `C1.mano` | médaillon | anneau **braise**, D extérieur **62,43 CSS**, trait **1,81 CSS**, centre x **195,8 CSS** ; arc à 3 secteurs (teal / sombre / braise), bord extérieur circulaire (résidu 1,45 px), bande **0,0680 D** ; aiguille crème vers le **haut-droite** ; moyeu or D ≈ 14 px ; « **Brûlant** » (5,44 CSS, 37,4 CSS de large) puis « **CHALEUR** » (5,08 CSS) |
| `C1.jour` | aile droite | « JOUR 50 » y 28..48 (**7,62 CSS**), x 940..1033 ; « **—** » y 87..89 ; marge droite **16,7 CSS** |
| `C4.dock` | dock | haut à **y=2152** ⇒ hauteur **248 px = 90,0 CSS** ; 4 ronds vides D **45,4 CSS**, centres **93,8 / 161,9 / 229,8 / 297,8 CSS** (pas 68,1 / 67,9 / 68,0) ; libellés **EMPIRE / FAMILLE / FILIÈRE / PLUS** ; barre or 38×5 px sous EMPIRE |

**Contenu — inventorié mais hors périmètre de ㉞** (fiche de lieutenant) : losange or (540,222) ·
carte lieutenant panneau (104,232)-(1024,~350), avatar cerclé or, « Lt. Halde » **18,06 CSS** de
hauteur d'encre, « Cuisinier », jeton « RÉCENT » cerclé teal, « Au repos / ÉTAT » à droite · bloc
pointillé « Aucune équipe rattachée » (**11,11 CSS**, contraste 8,11:1) · bloc pointillé « Recruter un
nouveau lieutenant » · table de 10 rangées (`[*]`…`[....]` + libellé + valeur teal/orange, hauteur
d'encre 12-15 px, contraste 6,85:1) · ÉTAT / Script de conduite / AUTONOMIE (4 boutons) / RÉAFFECTER /
ÉDITEUR DE RÈGLES (3 boutons) / Diagnostics (23 lignes, contraste **3,74:1**) · deux fragments de rail
or orphelins.

**Couche globale (capture, zone de contenu y 143..2151)** : (22,22,28) **55,4 %** · (39,43,48) 26,9 % ·
(15,16,20) 7,9 % · (17,22,34) 5,3 % · (22,22,27) 4,4 % · (29,22,23) 0,1 % ; luminance moyenne **28,8**
(référence : 143,0). **Aucune couleur crème dans les six dominantes.**

### Annexe 3 — Correspondance des repères

| | px | CSS | facteur | usage |
|---|---|---|---|---|
| Référence (cadre série 6, `.tel` 300 CSS) | 1080 × 2102 | 300 × 584 | **×3,6** | tout le CONTENU |
| Capture — contenu (dessiné à 300 CSS) | 1080 × 2400 | 300 × 666,7 | **×3,6** | rapport capture ÷ référence = **1,00** |
| Capture — chrome (shell, `.tel` 392 CSS) | 1080 | 392 | **×2,7551** | bandeau + dock |
| Canon HUD | 1176 × 2091 | 392 × 697 | **×3,0000** | témoin du chrome |
| Facteur canon → capture | | | **0,918367** | toute comparaison de chrome |

Ancrage vertical : le haut du contenu est calé sur le **bas du bandeau** (y=143 dans la capture,
y=434 dans la référence) et le bas sur le **haut du dock** (y=2152). Les 82,7 CSS de hauteur
supplémentaire de la capture sont absorbés par la zone de contenu, jamais par le pixel absolu.
**Vérifications de l'ancrage** : réglure de la référence 25,97 CSS pour 26 déclarés · pastilles
15,00 CSS pour 15 déclarés · hauteur du bandeau 51,9 CSS pour 52 dérivés du code.

### Annexe 4 — Scripts

Tous dans `mesures/`. Chacun imprime la taille des images qu'il ouvre. Les sorties sont reproductibles
par `python3 mesures/<script>.py` depuis `mesures/`.

| script | grandeur | contrôle |
|---|---|---|
| `lib_mes.py` | bibliothèque commune (luminance, contraste WCAG, bbox, profils, médiane de fenêtre) | — |
| `01_page_carnet.py` | présence de l'aplat crème et de la réglure | positif : référence 34,36 % · **négatif : canon HUD 0,44 %** |
| `02_rythme_vertical.py` | profil de luminance par ligne, frontières | positif : saut +187 à l'entrée de la page crème |
| `03_chrome_geometrie.py` | filet du bandeau, haut du dock | positif : bandeau = 143 px, conforme au code |
| `04_bandeau.py` | filet, médaillon, ailes, collision | prédicat braise vs or discriminé |
| `05_argent_coupe.py` | le « € » est-il coupé ? | **négatif interne : la braise doit rendre False** ; positif : fin du glyphe précédent sur fond pur |
| `06_medaillon_ailes.py` | anneau (bbox bornée **au-dessus du filet** — portée déclarée), épaisseur, écart argent/anneau | prédicats croisés braise ↔ laiton |
| `07_manometre.py` | moyeu, position du libellé | (première version du test d'arc : **contaminée** par le secteur médian gris — conservée, sa leçon est en `08`) |
| `08_arc_bande.py` | circularité du bord extérieur et épaisseur de la bande | positif : référence et canon (arcs SVG) rendent un résidu ≤ 0,77 px |
| `09_dome_interieur.py` | y a-t-il une forme pleine sous l'arc ? | profils croisés sur les trois images |
| `10_dock.py` / `11_dock_compare.py` | dock, ronds, libellés, marqueur actif | canon **remis à 1080 de large** ; **x < 170 exclu** (pastille ⑥) |
| `12_texte_contraste.py` | contrastes et comptage de lignes | positif : « Lt. Halde » 13,64:1 ; comptage 23 lignes = découpage attendu |
| `13_contraste_fin.py` | contraste au cœur des glyphes | positifs : titre, dock, table |
| `14_inventaire_reference.py` | page, réglure, pastilles, pied, CTA, palettes | positif : réglure 25,97 CSS / pastille 15,00 CSS |
| `15_goutiere_debord.py` | gouttière, débordements | positif : le filet couvre la largeur (hors médaillon) |
| `16_filet_aile_gauche.py` | étendue du filet, aile gauche, jauge | — |
| `17_valeur_argent.py` | hauteur de capitale de la valeur, dégradé du filet, libellé de chaleur | le dégradé du filet **réfute** l'écart d'étendue mesuré en `16` |
| `18_reference_zones.py` | frontières et textes de la référence | positif : pas des rangées 25,83-26,11 CSS |
| `19_aile_reference_et_rails.py` | position de l'aile ARGENT dans la référence, rails orphelins | deux témoins indépendants concordent (4,4 % / 4,1 %) |
| `20_animations_maquette.py` | la source du cadre #85 déclare-t-elle une animation ? | positif : le balayage rend 2 sur `.pot`, donc il est opérant ; 0 sur les classes du cadre |

Crops de lecture (non décisionnels, produits pour rendre les constats opposables) :
`zoom-cap-bandeau-gauche.png`, `zoom-cap-euro.png`, `zoom-cap-euro2.png`, `zoom-cap-mano.png`,
`zoom-can-mano.png`, `zoom-ref-mano.png`, `zoom-cap-dock.png`, `zoom-can-dock.png`,
`zoom-cap-haut-contenu.png`, `zoom-cap-table.png`, `zoom-cap-diagnostics.png`, `src-cadre85.txt`.
