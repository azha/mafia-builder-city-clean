# Juge visuel ⊥ — ④ L'ouverture (Accueil au repos) — tour BORNÉ « retour d'appui » — 2026-11-11

Juge à contexte vierge. N'ont été ouverts que : `mandat-juge.md`, ce dossier, et la copie épinglée
de la source de la maquette que `dossier.md` § Référence désigne nommément
(`…/scratchpad/pin/ecrans-brennar-accueil.html`). Aucun code client, aucune note d'implémentation,
aucun rapport de juge.

## Verdict : NON APPROUVÉ

Les deux changements du lot sont propres — **Q1 : non**, **Q2 : non** — mais **Q3 : oui** : trois
écarts A/B que ni la liste des ASSUMÉS ni Q1/Q2 ne couvrent, dont deux bloquants (le message d'état
« file vide » est illisible : ses deux lignes se croisent ; et les trois panneaux de contenu sont
rendus à 0,22–0,36× de leur largeur de maquette alors que la rangée de file, elle, est à 1,00×).

### Les trois lignes de verdict imposées

- **Q1 — la rangée TRANCHER : A/B ? NON.** Aucun finding. Mesures au contrôle positif ci-dessous
  (boîte 273,9 vs 274,4 px CSS ; TRANCHER centré à ±0,14 px CSS ; hauteur de capitale identique ;
  rien de coupé, rien qui déborde, aucune collision avec le texte de gauche). Résidus en classe C1–C3.
- **Q2 — le Pied de la carte retiré : A/B ? NON.** Aucun finding. La maquette de cet écran **ne
  dessine aucun pied de carte** (`carte-pied` : 1 occurrence dans la source épinglée = la règle CSS
  seule, 0 pose dans le balisage ; la carte se termine sur `csq4-rang`). Côté jeu le retrait ne
  laisse pas de trou (gardes haute/basse 5,3 / 4,2 px CSS en c6, 5,3 / 5,3 en c2 ; contrôle négatif
  à trou fabriqué = 3,32). **Réserve nommée en F6** si « Pied » désignait le `.rep` de la rangée.
- **Q3 — rien d'autre au repos : A/B ? OUI — F1, F2, F3, F4, F5, F7, F8.** (F6 est la réserve
  portée sur Q2, pas un écart de Q3.) Compte dans la table : **8 findings** — 3 BLOQUANT
  (F1, F2, F3), 2 MAJEUR (F4, F5), 3 MINEUR (F6, F7, F8) — plus 1 ASSUMÉ et 1 ARBITRAGE.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes ces grandeurs sont ramenées en px CSS (÷ 3,6 des deux côtés, cf. `dossier.md` § Échelle).

| # | grandeur | maquette | jeu | delta | script |
|---|---|---|---|---|---|
| 1 | largeur de la rangée de file | 274,4 px CSS (91,5 % écran) | 273,9 (91,3 %) | **0,5 px CSS** | m3, m6, m9 |
| 2 | hauteur de capitale de TRANCHER | 23 px img = 6,4 px CSS | 23 px img = 6,4 (1920) | **0** | m2 |
| 3 | idem, 1080×2400 | 6,4 px CSS | 22 px img = 6,1 | 0,3 px CSS (< 5 %) | m2 |
| 4 | TRANCHER, décalage au centre vertical de sa rangée | −0,83 px CSS | −0,14 (1920) / 0,00 (2400) | ≤ 0,8 px CSS | m3 |
| 5 | TRANCHER entièrement dans sa boîte | oui | oui, aux 2 résolutions | — | m3 |
| 6 | bord gauche de la rangée | x = 46 | x = 47 | 1 px img | m3 |
| 7 | bord droit de la rangée | x = 1033 | x = 1032 | 1 px img | m3 |
| 8 | garde basse de la carte (pas de trou après retrait du pied) | n/a (pas de pied) | 4,2–5,3 px CSS, = garde haute | rapport 0,79–1,00 | m8 |
| 9 | gabarit de la rangée identique aux 2 résolutions | — | x 47..1032, h 138 px img à 1920 **et** à 2400 | 0 | m3 |
| 10 | gabarit de la carte identique aux 2 résolutions | — | x 363..716 à 1920 **et** à 2400 | 0 | m6 |
| 11 | libellé de la jauge (boîte centrale du chrome) encré | 19,1 % de la boîte | 11,5 % | servi des deux côtés | m7 |
| 12 | rail bas (4 pastilles + EMPIRE/FAMILLE/FILIÈRE/PLUS, EMPIRE actif) | présent | présent, même ordre, mêmes libellés | — | lecture des captures |
| 13 | garde anti-vide : ≥ 5 % de pixels non noirs | 72–76 % | 72–79 % sur les 12 captures | — | m1 |
| 14 | largeur de toutes les images | 1080 | 1080 | 0 | m1 |
| 15 | **couleur de TRANCHER** (cœur de glyphe) | 237, 197, 104 (rangée courte) ; 242, 201, 107 (rangée haute) | 233, 197, 106 | **4/255** contre la rangée courte, 9/255 contre la haute ; la maquette se disperse déjà de 5/255 entre ses deux variantes | m10 |
| 16 | **couleur du titre de rangée** | RGB 220, 210, 188 | 218, 209, 188 | **≤ 2/255** | m10 |
| 17 | **couleur de la gravité « MODÉRÉE »**, contre son vrai homologue (cadre 3, pas cadre 4) | RGB 162, 152, 132 | 163, 153, 133 | **1/255** | m10 |
| 18 | remplissage de la boîte de rangée | L = 16,0/255 | L = 16,0 (1920) / 15,7 (2400) | ≤ 0,3 | m4 |

---

## 0. L'écran, tel que la maquette le dit

**But.** Le joueur ouvre sa session et doit voir, en un coup d'œil, ce qu'on attend de lui
aujourd'hui : la décision du jour, la file des autres, et ce qu'il reste à mettre en route. Puis
trancher. C'est un écran de *triage*, pas de consultation.

**Ordre de lecture.** (1) La **carte de tête** : un panneau plein cadre posé bas sur la ville, titre
or en serif de deux lignes, c'est la seule chose grande et colorée de l'écran. (2) Les **deux
gestes** sous le titre, dont un seul est en or plein — l'œil sait immédiatement lequel est le geste
franc. (3) La **rangée de file** juste dessous, grise et basse, avec un TRANCHER or à droite qui
dit « il y en a d'autres ». Le chrome haut (ARGENT, jauge CHALEUR, JOUR) et le rail bas sont du
mobilier : ils se lisent après.

**Zones.** Chrome haut (3 cases : argent / jauge centrale en médaillon / jour) · vue de ville, qui
occupe la moitié haute et qu'on ne lit pas, on la regarde · **pile de contenu** : un et un seul
panneau plein cadre (carte de tête, ou plaque « Rien à signaler », ou panneau « La suite », ou
plaque « LES EXCEPTIONS ») · **rangée de file** · rail bas à 4 pastilles.

**Traits d'identité.** (a) Tout le contenu tient dans **un bandeau plein cadre de ~91 % de la
largeur**, aligné à gauche sur x = 46 et à droite sur x = 1033 — c'est la colonne de l'écran, la
même pour tous les états. (b) Fond **bleu nuit très sombre** (L ≈ 16–18/255) sous une ville en
contre-jour. (c) **Or chaud** réservé aux titres et au geste franc ; tout le reste est crème ou gris.
(d) Rythme **panneau puis rangée**, toujours dans cet ordre, toujours avec le même écart.
(e) Le mot **TRANCHER** n'est pas un bouton dessiné : c'est du texte or espacé, sans boîte.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Le but reste devinable et le vocabulaire est le bon, mais la **composition est inversée** :
là où la maquette pose une large planche de 91 % qui porte la décision, le jeu pose une **petite
vignette centrée** — 32,8 % de la largeur pour la carte de tête, 25,6 % pour « La suite »,
20,6 % pour la plaque « Rien à signaler » — qui flotte au-dessus de la ville comme une info-bulle.
La ville, qui devait être un décor, devient le sujet : elle occupe désormais l'essentiel de l'aire,
et la décision du jour se lit comme une légende. L'ordre de lecture bascule : la première chose vue
n'est plus le titre de la carte, c'est la rangée de file — seul bloc resté à sa largeur (1,00× ;
c'est le témoin qui prouve que le rétrécissement est **sélectif**, donc qu'un conteneur diffère, et
non que mon instrument rétrécit tout).

Le second choc est textuel. Sur les 8 captures où la file est vide, les deux libellés de l'état
vide — « Aucune exception en attente » et « Personne ne fait la queue » — sont posés **hors de leur
plaque** et **l'un sur l'autre** : leur encre forme une seule bande continue, sans une seule ligne
de fond entre elles, et les jambages de la première traversent les capitales de la seconde. Le
message d'état n'est pas lisible. Dans la maquette, les mêmes phrases sont dans la plaque, sur des
lignes espacées de 13,9 px CSS, et sont complètes (« Aucune décision en attente · Aucune exception
en attente », « Personne ne fait la queue — la routine tient ») ; le jeu les coupe en morceaux et
en perd les queues.

Le troisième est de langue : le titre de la carte de tête, la seule chose que l'œil lit en premier
dans la maquette, s'affiche en **anglais** (« DAMAGED BUILDING REPAIR », « AUTONOMY REPORTS
PENDING »).

Ce qui tient, et tient très bien : la palette, la matière du fond, l'or des titres, le rail bas, et
**toute la rangée de file** — géométrie, centrage, taille et lisibilité de TRANCHER, aux deux
résolutions. Les deux changements du lot ne dégradent rien ; ce qui casse l'écran est ailleurs.

**Les 3 écarts de tête, par impact perçu** : F1 (les deux libellés d'état vide se croisent et
sortent de la plaque) · F2 (les panneaux de contenu à 0,22–0,36× de la largeur de maquette) ·
F3 (titre de carte en anglais).

---

## 3. Écarts

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` | `NOUVEAU` | État « file vide » : « Aucune exception en attente » et « Personne ne fait la queue » se **croisent** et sont posés **hors de leur plaque**. Les deux phrases sont aussi **amputées** de « Aucune décision en attente · » et de « — la routine tient ». c1, c2, c3, c5 × 1920 et 2400 = **8 captures sur 12**. | m5 : l'encre blanche des deux lignes forme **une seule bande continue** y 1629..1670 (1920) / 2109..2150 (2400), **aucune ligne de fond entre elles** ; pas de ligne à ligne de base = **17 px img = 4,7 px CSS** pour une hauteur de capitale de ~17 px img ⇒ rapport pas/capitale = **1,00** (en deçà de 1, les jambages traversent la ligne suivante). Maquette homologue (cadre 1) : pas = **50 px img = 13,9 px CSS**, avec 17 px de fond propre entre les deux bandes (contrôle positif de m5). Les libellés s'étendent x 357..721 alors que la plaque fait x 429..650 (m6, m9) : **−72 px à gauche, +71 px à droite (±20 px CSS)**, et 7 px sous le bord bas de la plaque (bords latéraux de la plaque jusqu'à y = 1663). | Si une animation d'entrée pose les deux libellés et que t = 0 les attrape superposés. Argument contre : la bande est **au pixel près identique** sur les 4 états et les 2 résolutions (y 1629..1670 partout), ce qu'une phase d'animation ne ferait pas. **Mesure hors image qui trancherait** : une seconde capture du même état à t > 0, ou les rects imprimés par le test. |
| `F2` | `BLOQUANT` | `NOUVEAU` | Les **trois panneaux de contenu** sont rendus à une fraction de leur largeur de maquette, alors que la **rangée de file est juste**. L'écran perd son trait d'identité « une planche pleine largeur » ; la décision du jour se lit comme une vignette sur un décor. | m9, instrument de liseré (maximum local horizontal), **contrôle négatif plein ciel = []** : plaque « Rien à signaler » 274,4 → **61,7 px CSS (0,22×)** ; carte de tête 274,4 → **98,3 px CSS (0,36×)** ; panneau « La suite » 279,4 → **76,7 px CSS (0,27×)** ; **rangée de file 274,4 → 273,9 px CSS (1,00×)**. Identique à 1920 et 2400 (m6 : carte x 363..716 aux deux). | Je ne peux pas dire si `dossier.md` § ASSUMÉS entend couvrir ceci par « proportions de la carte » : cette entrée cite, au même endroit, des éléments **qui n'existent pas sur cet écran** (filets-or, tampon, losange ♦ à côté de TACTIQUE, « votre grande décision du jour », passe-partout crème), donc elle semble recopiée d'un autre écran. Même si elle couvrait la *carte*, elle ne couvre ni la *plaque* ni le *panneau « La suite »*. **Mesure hors image qui trancherait** : le dossier de fin d'écran précédent, que je n'ai pas le droit d'ouvrir. |
| `F3` | `BLOQUANT` | `NOUVEAU` | Le **titre de la carte de tête est en anglais** : « DAMAGED BUILDING REPAIR » (c2, c6), « AUTONOMY REPORTS PENDING » (c3), là où la maquette écrit « Un local à remettre en état » et « Des rapports à lire ». Contraire à la doctrine du dossier (« langue affichée : français, via résolveurs / clés servies »). C'est la **première** chose que l'œil lit. 6 captures sur 12. | Découpe `mesures/decoupe-c6-carte-titre.png` (c6 1920, crop (340,1330)-(740,1520), ×4) : bandeau de titre or, 2 lignes, lecture directe. Le reste de la carte est en français (« PORTÉE modérée », « URGENCE faible », « PRENDRE ACTE ») ⇒ c'est le **seul** champ non résolu. | Si l'anglais vient du résolveur client ou de la donnée que le banc monte. **Mesure hors image qui trancherait** : la clé i18n servie pour ce titre dans la table de chaînes, au SHA de la pile. |
| `F4` | `MAJEUR` | `NOUVEAU` | Le **chrome haut ne sert aucune valeur** : ni le montant (« 24 850 € »), ni le jour (« JOUR 12 » / « Plein jour »), ni le palier de la jauge (« Tiède »). L'écran affiche « ARGENT » sans somme et « JOUR — ». **12 captures sur 12.** | m7, contrôle négatif ciel = 0 px sur les 4 images : boîte ARGENT **203 px d'encre = 1,2 %** de la boîte (référence : 2222 px = 13,5 %) ; boîte JOUR **105 px = 0,5 %** (référence : 2735 px = 13,2 %) ; boîte du libellé de jauge 882 px = 11,5 % (référence 1472 px = 19,1 %) — celle-là est servie (« CHALEUR »), mais pas le palier. | Si le banc projette ou non la session fixe sur le chrome ⑭ ; et si un compteur animé à t = 0 rendrait vide. **Hors du lot Accueil** (c'est le chrome ⑭), mais Q3 porte sur les 12 captures, donc je le compte. **Mesure hors image qui trancherait** : une capture du même banc à t > 0, ou les rects imprimés par le test. |
| `F5` | `MAJEUR` | `NOUVEAU` | c4 : la **plaque « LES EXCEPTIONS / saturée / Plusieurs attendent encore / d'autres attendent au-delà de ce que la file montre »** que la maquette cadre 4 dessine **au-dessus** de la rangée est absente de la capture. Rien ne la remplace : l'écran n'a plus qu'une rangée posée sur la ville. 2 captures (c4 × 2 résolutions). | Détection de liseré horizontal plein (> 70 % de la largeur), x 100..980 : `reference/cadre-4.png` → la plaque est bornée **y 1306..1637**, x 46..1033 ; `c4 1920` entre y 900 et 1515 → **aucun liseré**, et `c4 2400` entre y 1300 et 1995 → **aucun liseré**. Rien n'est dessiné au-dessus de la rangée. | `dossier.md` dit que c4 monte « 4 cartes en file, pas de carte de tête » — il ne dit pas que la file est **saturée**. La plaque des exceptions peut donc ne pas s'appliquer à la donnée montée. **Mesure hors image qui trancherait** : l'état de saturation que le banc monte pour c4. |
| `F6` | `MINEUR` | `NOUVEAU` | Réserve sur Q2. La rangée **haute** de la maquette (cadres 5 et 6, `class="rep"` ×2) porte la **voix du lieutenant** : « La chaleur est haute — vos opérations sont sous pression. » La rangée de c6 ne la porte pas. Si « le Pied » désignait ce `.rep` et non `.carte-pied`, alors l'élément retiré **est** dessiné par la maquette. | m4 : `reference/cadre-6.png` → **5 bandes de texte** dans la rangée (titre, gravité, `.rep` sur 2 lignes de rendu, `.plus`) ; `c6 1920/2400` → **3 bandes** (titre, gravité, `.plus`). Contrôle positif m4 : cadre 2 → 2 bandes, cadre 6 → 5 bandes ; contrôle négatif colonne vide x 735..768 → 0 bande. Découpes côte à côte : `mesures/decoupe-REF6-rangee-trancher.png` et `mesures/decoupe-c6-rangee-trancher.png`. | **Confusion de témoin assumée** : la capture monte une autre donnée que la maquette (« La ville … MODÉRÉE » contre « Lt. Ilm … légère »). L'image **ne peut pas** départager « retiré par le lot » de « non servi par la donnée montée ». **Mesure hors image qui trancherait** : une capture de c6 avec un lieutenant dont la voix est servie. |
| `F7` | `MINEUR` | `NOUVEAU` | Le titre de la rangée de file lit « **La ville** attend vos ordres » là où la maquette lit « Lt. Ilm / Lt. Quist attend vos ordres ». Possible **libellé de repli visible** pour un nom de lieutenant non servi. c4, c6 × 2 résolutions. | Découpes `mesures/decoupe-c6-rangee-trancher.png` contre `mesures/decoupe-REF6-rangee-trancher.png`. | Si « La ville » est un libellé voulu (la ville comme locuteur) ou un repli. **Mesure hors image qui trancherait** : la clé i18n servie et le roster que le banc monte. |
| `F8` | `MINEUR` | `NOUVEAU` | Panneau « La suite » : **un des deux filets de séparation manque**. Les deux premières rangées se touchent, la troisième est détachée — le groupement perçu est faux. c5 × 2 résolutions. | Détection de filet (maximum local vertical, > 70 % de la largeur du panneau) : `reference/cadre-5.png` → **2 filets internes pleins** (y 931..933 et 1191..1193) ; `c5 1920` → **1 seul** (y 1550). | — |
| `A1` | `ASSUMÉ` | `DÉJÀ APPLIQUÉ` | Carte de tête : un seul geste (« PRENDRE ACTE ») au lieu des deux options de la maquette avec leur conséquence. Couvert par `dossier.md` § ASSUMÉS. **Rendu proprement : oui** — pas de trou, pas de libellé de repli, bouton non rogné, gardes équilibrées. | m8 : gardes haute/basse de la carte 5,3 / 4,2 px CSS (c6) et 5,3 / 5,3 (c2) ⇒ rapports 0,79 et 1,00 ; contrôle négatif à trou fabriqué = 3,32 (l'instrument voit un trou quand il y en a un). | L'entrée ASSUMÉE annonce « Prendre acte / **Pas maintenant** » : le second bouton n'est pas dans la capture. Je ne rouvre pas (tour borné) mais je le signale. |
| `A2` | `ARBITRAGE` | `DÉJÀ APPLIQUÉ` | Chasse de TRANCHER : 56,9 px CSS en jeu contre 60,6 en maquette, **à hauteur de capitale égale** (6,4 px CSS des deux côtés). Écart de famille / d'interlettrage, pas de taille. | m2 : bbox or REF x 772..990 (218 px img) ; JEU x 796..1001 (205 px img). | La famille réelle en jeu — on ne lit pas une police dans une image. `dossier.md` donne le `fc-match` de la maquette (Georgia → Noto Serif, Segoe UI → Noto Sans) ; le client embarque DejaVu. |

**Note de cause commune** — F1, F2 et F8 pointent la même classe : les blocs de contenu ne sont pas
posés par le conteneur qui pose la rangée de file. Le témoin est dans F2 : **la rangée est à 1,00×
quand les trois panneaux sont à 0,22–0,36×**, dans la même image. Un écart sélectif désigne un
conteneur différent. Je ne nomme pas de ligne à changer.

### Classe C — consignés, ni correctif ni tour (ce ne sont pas des findings)

- **C1** Pas des lignes dans la rangée de file : jeu 10,0–12,2 px CSS, maquette 11,9–15,0 px CSS
  (−15 à −20 %). La rangée du jeu est plus serrée (m4).
- **C2** Marge droite de TRANCHER au bord intérieur de sa boîte : jeu 8,6 px CSS, maquette
  11,9 px CSS — soit 1,2 % de la largeur de la rangée, en deçà du plancher de 1,5 % du parent (m2, m3).
- **C3** Hauteur de la rangée : jeu 38,3 px CSS pour 3 lignes de texte, maquette 41,9 px CSS pour
  2 lignes (et 81,4 px CSS pour 4). Densité différente, pas de débordement (m3).
- **C4** Hauteur de capitale de TRANCHER à 2400 : 6,1 px CSS contre 6,4 à 1920 et en maquette
  (1 px d'image, sous le plancher de bruit) (m2).

---

## 5. Autres résolutions

- **1080×1920 (art natif)** — inventaire du temps 2 établi ici. Rien de coupé, rien hors cadre,
  rien sous la ligne de flottaison. Le rail bas et le chrome tiennent.
- **1080×2400 (téléphone 20:9)** — l'inventaire **tient intégralement** : mêmes gabarits au pixel
  (rangée x 47..1032 h 138 px ; carte x 363..716 ; plaque x 429..650), même centrage de TRANCHER
  (décalage 0,00 px CSS), même ordre de lecture, aucune troncature, aucun débordement du rail bas.
  Les blocs sont simplement décalés vers le bas de ~480 px d'image.
  **Aucun écart propre à cette résolution** : F1 à F8 s'y reproduisent à l'identique — F1 y occupe
  y 2109..2150, F2 y donne les mêmes largeurs.
- Pas de troisième résolution dans le dossier.

---

## 6. Non vérifié

1. **La zone de toucher de TRANCHER** (le cœur de Q1). Ni la maquette ni la capture ne dessinent de
   boîte autour du mot : une image ne peut pas montrer un rect de hit-test. Je ne peux donc affirmer
   que « le bouton épouse la hauteur de la rangée », seulement que **le mot** est centré, entier et
   bien placé. ⇒ **Mesure hors image** : les rects que le test imprime (`dossier.md` dit qu'il les
   imprime).
2. **Les quatre états c2, c3, c5 montent une file VIDE** alors que les cadres 2, 3 et 5 de la
   maquette dessinent une rangée de file (`class="suivant"` ×5 dans la source épinglée, pour les
   cadres 2 à 6). Q1 n'est donc jugeable que sur **c4 et c6**. Je ne compte pas l'absence de rangée
   comme un écart client : c'est la donnée montée par le banc. ⇒ **Mesure hors image** : l'état que
   le banc monte pour c2, c3 et c5.
3. **Le cadre 6 de la maquette ne montre qu'UNE ligne de file**, alors que `dossier.md` annonce
   « carte de tête + 4 cartes en file » pour c6 ; idem pour c4. Le témoin maquette et la donnée
   montée ne décrivent pas la même file. Mes mesures de rangée portent donc sur la **première**
   rangée des deux côtés — c'est le bon homologue, mais je ne peux pas juger la file au-delà.
4. **La liste des ASSUMÉS de `dossier.md` semble recopiée d'un autre écran** (filets-or, tampon,
   losange ♦ à côté de TACTIQUE, « votre grande décision du jour », passe-partout crème : rien de
   tout cela n'est sur ④). Cela rend « proportions de la carte » indécidable — d'où la réserve
   portée dans F2. ⇒ **Mesure hors image** : le dossier de fin d'écran précédent (interdit ici).
5. **Animation.** `dossier.md` et le mandat posent que l'animation est voulue et que la capture est
   figée à t = 0 : je n'ai classé aucun pixel en mouvement comme écart. Je n'ai pas pu vérifier que
   F1 et F4 ne sont pas des phases d'entrée ; l'argument contre est l'identité au pixel sur
   4 états × 2 résolutions. ⇒ **Mesure hors image** : une seconde capture à t > 0.
6. **Les familles de police** ne se lisent pas dans une image ; seules les hauteurs de capitale ont
   été comparées (A2). `fc-match` du dossier couvre la maquette, pas le rendu client.
7. **Le mélange linéaire / sRGB** : je n'ai comparé aucune opacité ni aucun dégradé recopié — les
   écarts rapportés sont géométriques, textuels ou d'encre présente/absente, aucun ne repose sur
   une valeur d'alpha. Le fond de rangée est d'ailleurs identique des deux côtés (L = 16,0).
8. **Les captures c2, c3 et c6 en 1920 sont la 2ᵉ photo** (`dossier.md` § Captures). Je n'ai vu
   **aucun** texte tronqué ni en cours de composition dans celles-là ; les textes amputés que je
   rapporte (F1) sont sur c1, c2, c3 et c5 **aux deux résolutions**, donc pas un artefact de prise.

---

## Annexes

### 1. Inventaire de la référence (extrait utile ; fiches complètes dans les sorties des scripts)

**Couche globale.** Fond bleu nuit, luminance médiane de l'aplat des panneaux L = 16,0–16,7/255.
Colonne de contenu invariante : **x 46 → 1033**, soit 274,4 px CSS = 91,5 % de l'écran, dans les
6 cadres. Or des titres et de TRANCHER : masque R > 150, R−B > 60, R ≥ G > B. Rythme vertical :
panneau de contenu, puis 48 px d'image de respiration, puis rangée de file, puis rail bas.

| id | catégorie | bbox (px img) | en % écran | notes |
|---|---|---|---|---|
| `R.boite` | rangée / liste | x 46..1033, y 1675..1825 (cadres 2–4) | 91,5 % × — | h 151 px img = 41,9 px CSS, 2 lignes |
| `R.boite` (haute) | rangée / liste | x 46..1033, y 1533..1825 (cadres 5–6) | 91,5 % | h 293 px img = 81,4 px CSS, 4 lignes |
| `R.act` | texte / CTA | x 772..990, y 1736..1759 (c2–4) ; y 1665..1688 (c5–6) | 71,5 → 91,7 % | « TRANCHER », or, capitale 6,4 px CSS, **centré** dans `R.boite` |
| `R.qui` | texte | 1ʳᵉ bande, 32 px img | — | « Lt. … attend vos ordres », crème |
| `R.grav` | texte | 2ᵉ bande, 22 px img | — | gravité en petites capitales grises |
| `R.rep` | texte | bandes 3–4 (cadres 5–6 seulement) | — | voix du lieutenant entre guillemets |
| `R.plus` | texte | dernière bande | — | « Plusieurs attendent encore », gris |
| `P.carte` | panneau | x 46..1033 (cadres 2, 3, 6) | 91,5 % | titre or 2 lignes, niveaux, 2 gestes, 2 conséquences — **pas de pied** |
| `P.vide` | plaque | x 46..1033 (cadre 1) | 91,5 % | 4 bandes de texte, pas 13,9 px CSS entre les deux lignes de corps |
| `P.suite` | panneau | x 46..1051 (cadre 5) | 93,1 % | 3 rangées, **2 filets internes** (y 931..933, 1191..1193) |
| `C.argent` | chrome | boîte (40,60)-(340,115) | — | encre 2222 px = 13,5 % |
| `C.jour` | chrome | boîte (700,55)-(1045,115) | — | encre 2735 px = 13,2 % |

### 2. Inventaire de la capture (extrait utile)

| id | catégorie | bbox (px img, 1920) | en % écran | statut |
|---|---|---|---|---|
| `R.boite` | rangée | x 47..1032, y 1523..1660 | 91,3 % | **ÉGAL** |
| `R.act` | texte / CTA | x 796..1001, y 1580..1602 | 73,7 → 92,7 % | **ÉGAL** (centré à −0,14 px CSS) |
| `R.qui` / `R.grav` / `R.plus` | texte | 3 bandes | — | **ÉGAL** en nombre pour une rangée courte ; `R.rep` **ABSENT EN JEU** (F6) |
| `P.carte` | panneau | x 363..716, y 1348..1511 | 32,8 % | **ÉCART** (F2) ; titre **anglais** (F3) ; pas de pied, garde équilibrée (Q2 OK) |
| `P.vide` | plaque | x 429..650, y 1582..~1663 | 20,6 % | **ÉCART** (F2) |
| `P.suite` | panneau | x 402..677 | 25,6 % | **ÉCART** (F2) ; 1 filet au lieu de 2 (F8) |
| `X.vide1` + `X.vide2` | texte hors parent | x 357..721, y 1629..1670 | 33,8 % | **EN TROP / hors parent** — se croisent (F1) |
| `P.exceptions` | plaque | — | — | **ABSENT EN JEU** en c4 (F5) |
| `C.argent` / `C.jour` | chrome | mêmes boîtes | — | **ÉCART** : 1,2 % et 0,5 % d'encre (F4) |
| rail bas | chrome | 4 pastilles + libellés | — | **ÉGAL** |

### 3. Correspondance des repères

- Échelle **imposée par `dossier.md`**, jamais déduite : 1 px CSS = **3,6 px d'image des deux
  côtés**. Rapport capture ÷ référence en X = **1,000** (largeurs relues sur les fichiers par m1 :
  1080 partout).
- **En Y il n'y a pas de rapport** (référence 2102 ; captures 1920 et 2400). Toute grandeur
  verticale est donc soit interne à un bloc (hauteur de boîte, pas de ligne, garde), soit exprimée
  en % de la hauteur du bloc. **Aucune comparaison de y absolu entre référence et capture** n'est
  faite dans ce rapport.
- Offset vertical observé entre les deux résolutions de capture : +480 px d'image (1920 → 2400),
  constant sur tous les blocs mesurés.

### 4. Scripts

Tous dans `mesures/`, tous impriment la taille des images qu'ils ouvrent, tous portent un contrôle
positif et un contrôle négatif qui **passent** (deux contrôles négatifs mal choisis ont été
remplacés en cours de route : le masque or attrapait le titre or de la plaque, et le détecteur
d'aplat attrapait le ciel — c'est exactement ce que le contrôle négatif sert à révéler).

| script | ce qu'il mesure | contrôle + | contrôle − |
|---|---|---|---|
| `m1_tailles_et_vide.py` | tailles des 18 images, garde anti-vide | largeurs toutes à 1080 | hauteurs 1920 / 2102 / 2400 distinctes |
| `m2_rangee_trancher.py` | bbox or de TRANCHER, chasse, capitale, marge droite | TRANCHER trouvé dans les 5 cadres | taux d'or : 0,95 % (réf) / 0,00 % (jeu) dans la moitié gauche de la rangée, contre 38,7 % / 42,1 % dans TRANCHER |
| `m3_boite_rangee.py` | boîte de la rangée, centrage vertical de TRANCHER | les 5 cadres donnent la même boîte x 46..1033 | plein ciel → aucun liseré |
| `m4_lignes_de_texte_rangee.py` | bandes de texte dans la rangée (Q2 / F6) | cadre 2 → 2 bandes, cadre 6 → 5 bandes | colonne vide x 735..768 → 0 bande |
| `m5_chevauchement_file_vide.py` | les deux libellés d'état vide (F1) | maquette : recouvrement −4 px | masque blanc sur le ciel → [] |
| `m6_panneaux.py` | largeurs par seuil (instrument **contaminé** par la ville — remplacé par m9 ; conservé pour sa remesure de la rangée) | rangée remesurée = m3 | **échoue** (ciel au-dessus du seuil) ⇒ ses largeurs de panneau ne sont PAS citées |
| `m7_chrome_et_decoupes.py` | encre des boîtes de valeur du chrome (F4) ; découpes | référence : 3 boîtes servies | ciel = 0 px sur les 4 images |
| `m8_pied_carte.py` | pose de `carte-pied` dans la source épinglée ; gardes haute/basse de la carte (Q2) | source : 1 occurrence CSS, 0 pose | trou fabriqué → rapport 3,32, détecté |
| `m9_largeurs_panneaux.py` | largeurs des 4 blocs par liseré (F2) | rangée de file = 1,00× | plein ciel → [] |
| `m10_couleurs_rangee.py` | couleurs de cœur de glyphe (TRANCHER, titre, gravité) | dispersion interne de la maquette ≤ 6/255 | remplissage sans glyphe → RGB 11, 19, 28 |

**Piège du témoin, rencontré et évité** : comparée à « GRAVE » (cadre 4), la gravité du jeu
(« MODÉRÉE ») donne un écart de 21/255 qui ressemble à un défaut. Son **vrai** homologue est
« MODÉRÉE » du cadre 3, et l'écart tombe à **1/255**. `m10` imprime les deux comparaisons côte à
côte pour que l'erreur de témoin reste visible.

Découpes citées : `mesures/decoupe-c1-chevauchement.png`, `mesures/decoupe-c6-carte-titre.png`,
`mesures/decoupe-c6-rangee-trancher.png`, `mesures/decoupe-REF6-rangee-trancher.png`,
`mesures/decoupe-c1-chrome.png`, `mesures/decoupe-REF1-chrome.png`.

### 5. Auto-audit du verdict

J'atteste avoir **réellement** ouvert et mesuré les 18 fichiers (m1 imprime leur taille), avoir lu
les 6 références et les 6 captures 1920 plus 2 captures 2400 en entier, et n'avoir porté dans la
table aucun chiffre qui ne sorte d'un script de `mesures/`. Les deux grandeurs lues à l'œil et non
produites par un script — le **contenu textuel** des titres (F3) et du titre de rangée (F7) — sont
signalées comme lectures de découpe, pas comme mesures. Les deux contrôles négatifs qui ont échoué
en cours de route ont été corrigés et leurs instruments re-exécutés ; la seule mesure dont
l'instrument reste disqualifié (`m6`, largeurs par seuil) n'est **pas** citée dans la table : F2
repose sur `m9`, dont les deux contrôles passent.
