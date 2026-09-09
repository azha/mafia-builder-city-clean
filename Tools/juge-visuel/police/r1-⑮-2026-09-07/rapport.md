# Juge visuel ⊥ — ⑮ Les inspections (MIS Inspection Queue) — r1 — 2026-09-07

## Verdict : NON APPROUVÉ

L'écran affiche la bonne information pour **un** district et rien d'autre : ni le résumé de la ville,
ni les cartes, ni l'action « déposer un signalement » de la maquette — et les onze valeurs qu'il
affiche sont **en anglais** (`None` ×8, `Predominant` ×2, `Moderate` ×1) sous un sous-titre qui
montre l'identifiant brut « district district-1 ».

---

## Quel cadre est l'homologue de cette capture — et pourquoi (question posée au juge)

**L'homologue est `etats/inspections-canon.png` — le canon de la série 2, écran 32,
« LES INSPECTIONS — par district », état garni.** Ce n'est **pas** le cadre `#31` fourni comme
référence dans `dossier.md`.

Quatre arguments, dont trois mesurés (`mesures/m16_ref31.py`, `mesures/m01_geometrie.py`) :

1. **Le titre est le même mot pour mot.** La capture affiche `LES INSPECTIONS` ; le canon de série 2
   affiche `LES INSPECTIONS`. Le cadre `#31` affiche `CE QU'ILS SAVENT`.
2. **Les champs sont les mêmes.** Capture : district · régime (`Nominal`) · charge · distribution par
   gravité (4 niveaux) · distribution par provenance (6 origines). Canon série 2 : district · `Charge ·
   modérée` · `Régime · arriéré` · `Gravité` · `Origine` (les six mêmes). Le cadre `#31` porte
   `belief` + `patrol_heat` par **précinct** — c'est le **commissariat** ⑰ (la source de série 2 nomme
   d'ailleurs son écran 34 « LE COMMISSARIAT — les six précincts »).
3. **La luminance tranche sans appel.** Luminance moyenne de la zone de contenu :
   capture **15,5** · canon série 2 **22,7** · cadre `#31` **141,2**. Écart capture↔canon = **7,2** ;
   écart capture↔`#31` = **125,8**, soit **17×** plus. `#31` est un panneau de liège clair à fiches
   bristol ; la capture et le canon série 2 sont deux écrans sombres.
4. Dans la série 6, le frère de cet écran est le cadre **`#32` « La police — le registre de
   dispatch »** (son commentaire de source cite `GET /v1/city/district/:id/inspection`,
   `queue_load`, `dispatcher_regime`, `type_distribution` — exactement les champs de la capture).
   Il n'est **pas rendu** dans ce dossier : seule sa source est lisible.

⇒ **Défaut de dossier**, à remonter : la référence rendue (`reference-⑮-1080x2102.png` = `#31`) est
la maquette de ⑰, pas de ⑮. Tout le corps de ce rapport compare la capture au **canon de série 2
garni**, avec le canon **vide** comme second témoin. Le cadre `#31` n'est utilisé que pour la couche
globale et l'argument ci-dessus. Voir aussi l'arbitrage `A5` (deux directions coexistent pour le même
domaine).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL (20 grandeurs)

| # | grandeur | mesure | script |
|---|---|---|---|
| 1 | largeur de la capture | 1080 px, conforme au dossier | `m01` |
| 2 | hauteur du bandeau dérivée du code (52 CSS-HUD × 2,755 = 143,3 px) | filet mesuré à y = 141‑142 → écart ≤ 2 px | `m11` |
| 3 | filet du bandeau, témoin `.tel.chaud` = `--braise` | mesuré (217, 99, 71) vs (224, 102, 74) → **écart 7/255** | `m18` |
| 4 | boîtier du médaillon, témoin `.chaud` = `--braise` | (210, 96, 69), anneau à halo | `m18` |
| 5 | losange sous le médaillon = `--laiton` | (176, 141, 61) vs (176, 141, 62) → **écart 1/255** | `m18` |
| 6 | valeur ARGENT = `--or-vif` (règle `.aile.gauche .val`) | (242, 201, 106) vs (242, 201, 107) → **écart 1/255** | `m18` |
| 7 | libellés ARGENT et « JOUR 50 » = `--creme-2` | (185, 173, 146) → **écart 0** | `m18` |
| 8 | `.heatlib` « CHALEUR » = `--creme-2` | (185, 173, 146) → **écart 0** | `m18` |
| 9 | hauteur de capitale du **titre** | capture 9,72 CSS · canon 10,00 CSS → **−2,8 %** (tolérance ±5 %) | `m10` |
| 10 | sens du manomètre — **aiguille NON inversée** | arc gauche froid (70, 98, 109), arc droit chaud (133, 76, 71), bout d'aiguille à **+9,2°** du pivot **vers la droite** | `m18` |
| 11 | rythme vertical des 6 rangées de provenance | pas 55 · 58 · 55 · 58 · 56 px → dispersion **7,0 %** (< 10 %) | `m12` |
| 12 | écarts entre pastilles | 7 px (Charge, ×4) et 7‑8 px (gravité/provenance) | `m13` |
| 13 | marge gauche du contenu | x = 37‑38 px sur les 12 rangées (± 1 px) | `m04` |
| 14 | libellés « porteurs » = `--creme` · valeurs secondaires = `--creme-2` | (234, 224, 200) et (185, 173, 146) → **écart 0** | `m07` |
| 15 | gouttière respectée | aucun pixel de contenu au‑dessus de y = 143 ni sous y = 2179 | `m02`, `m11` |
| 16 | rien de coupé, rien hors cadre | emprise d'encre x = 37…828 dans 0…1079 ; dernière rangée complète à y = 1113 | `m04`, `m17` |
| 17 | classe connue « rail à trou périodique (9‑slice) » — **NON applicable** | les rails hauts des 5 pastilles testées rendent **1 seul segment continu** ; contrôle négatif 6 px plus bas : 0 segment | `m13` |
| 18 | le montant ARGENT **ne recouvre pas** le médaillon | dernière colonne d'or x = 446 ; bord de l'anneau braise x = 450 → **4 px de dégagement** | `m12` |
| 19 | dock : 4 ronds réguliers | diamètres 126 · 127 · 127 · 126 px → dispersion **0,8 %** | `m18` |
| 20 | hiérarchie de saillance conservée | les 2 rangées porteuses sont à **14,80:1**, les 10 rangées « rien » à **4,34:1** — l'œil va bien aux valeurs | `m15` |

★ Le point 18 est une **rétractation** : ma première sonde (`m11`) annonçait « le montant déborde de
142 px sous le médaillon » ; elle confondait l'or du montant avec l'anneau braise (les deux
satisfont `R−B > 60`). Durcie en `R−G > 90` (`m12`), elle mesure **4 px de dégagement**. Le finding
n'existe pas.

★ Le point 9 est une **seconde rétractation** : une première mesure donnait le titre à −12 % parce
que ma bande verticale attrapait l'arc du rond de retour du canon (plus haut qu'une capitale).
Segmenté glyphe par glyphe (`m10`, 11 et 14 glyphes, dispersion 1 px), le titre est **égal**.

---

## 0. L'écran, tel que la maquette le dit

*(lu sur `etats/inspections-canon.png` et `etats/inspections-vide.png`, avant ouverture de la capture)*

- **But.** Savoir **où la police travaille dans la ville ce soir** — quels districts ont une file
  d'inspection, à quelle charge, sous quel régime, alimentée par quoi — et, de là, **déposer un
  signalement** sur un bâtiment pour orienter leur attention (action payante, avec un retour de
  bâton annoncé).
- **Ordre de lecture.** (1) `LES INSPECTIONS`, or vif, sérif, en haut à gauche, à côté du rond de
  retour ; (2) le sous‑titre qui **résume la ville en une ligne** — « JOUR 26 · **2** DISTRICTS SOUS
  CHARGE · 16 AU CALME », avec le compte en or ; (3) les **cartes de district**, deux plaques de
  verre gravé qui portent l'essentiel de la masse d'encre ; (4) le bandeau pointillé qui range les
  seize districts calmes en une phrase ; (5) le **CTA** ancré en bas.
- **Zones.** En‑tête (retour + titre + résumé + filet laiton) · corps (n cartes de district) ·
  bandeau d'état vide · CTA secondaire.
- **Traits d'identité.** (a) le **verre gravé** : panneau translucide, liseré clair, ombre portée,
  coins à 12 px ; (b) le **jeton bordé** (`.chip`) qui porte *à la fois* la catégorie et la valeur en
  capitales interlettrées, coloré par le sens (or = dominante, braise = alerte, cyan = calme,
  crème‑2 = aucune) ; (c) le **filet laiton** sous l'en‑tête ; (d) le **fond bleu‑encre gradué**
  (ville floutée + voile), jamais un noir plat ; (e) le **regroupement des zéros** : « HAUTE,
  CRITIQUE · AUCUNE » est **un** jeton, pas trois lignes.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Il se lit comme **un tableau de débogage** posé sur du noir.

Le but n'est plus atteignable : **l'action a disparu**. `mesures/m06` balaie les 2 050 lignes de la
zone de contenu et ne trouve **aucune** ligne portant un segment clair ≥ 480 px — donc **aucune
carte, aucun bandeau pointillé, aucun CTA, aucun filet** ; le canon, lui, en a **544 sur 1 500**
(36 %). « Déposer un signalement sur un bâtiment · 50 $ facturés plus tard » n'existe pas à l'écran.

La couverture n'est plus la ville mais **un district**, désigné par son identifiant technique :
« district district‑1 ». Le résumé qui portait la lecture (« 2 districts sous charge · 16 au
calme ») et la phrase qui range les autres (« Seize districts à charge vide — la police y passe,
rien n'y traîne ») sont absents. Le joueur ne sait ni combien de districts existent, ni où sont les
autres.

Et la lecture est **en anglais** là où elle compte : les onze valeurs de l'écran sont `None`,
`Predominant`, `Moderate`. La doctrine du projet est explicite — aucun repli anglais, aucun enum
brut ne doit atteindre l'écran.

Densité et rythme le disent aussi. L'encre couvre **2,65 %** de la zone de contenu — plus proche du
canon **VIDE** (2,22 %) que du canon **garni** (8,23 %) : un écran plein a la densité d'un écran
vide. Le plus grand vide contigu fait **1 064 px, 44,3 % de la hauteur d'écran**, contre 100 px
(5,7 %) dans le canon garni — et même **plus** que les 645 px du canon délibérément vide. Deux causes
opposées se cumulent : le bas est mort, pendant que le haut dépense **8 rangées sur 11** à répéter
« rien » — parce que la maquette **regroupe** les zéros en un jeton et que le client leur donne une
rangée pleine chacune.

La palette, enfin, n'est plus celle du projet : le fond est un noir **neutre** (13, 13, 13) à 94,5 %
de l'aire, sans décor ni voile ; et trois neutres purs (13/54/119) plus deux oranges (184, 113, 17 et
133, 116, 81) portent l'essentiel du dessin, alors que le jeton le plus proche est à **≥ 43/255**.

**Les trois écarts de tête**, par impact perçu : (1) l'anglais sur les onze valeurs, (2) le CTA et
tout le contenant absents, (3) l'identifiant brut à la place du nom de district et du résumé de
ville. Ce qui va **bien** : le titre est au bon endroit, à la bonne taille (−2,8 %) ; l'aiguille du
manomètre n'est pas inversée ; le chrome est alimenté, la gouttière est respectée, rien n'est coupé,
et la saillance distingue correctement les deux rangées qui portent une valeur.

---

## 3. Écarts

Gravité : liste fermée `BLOQUANT | MAJEUR | MINEUR`. `ASSUMÉ` et `ARBITRAGE` sont dans des tables à
part et **ne sont pas comptés**. Critère : premier tour ⇒ tout est `NOUVEAU`.
Témoin du contenu = `etats/inspections-canon.png` (série 2, garni, ×3,0) ; témoin du chrome =
`hud-canon-1176.png` **plus** la variante `.tel.chaud` de `hud-brennar.html` (compte BRÛLANT).

| id | gravité | critère | dépend des données | écart | mesure | script | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | non | **Onze valeurs en anglais** portent toute l'information chiffrée de l'écran. La maquette écrit ces mêmes valeurs en français dans le jeton (`· dominante`, `· beaucoup`, `· aucune`, `Charge · modérée`). | `None` × **8** (rangées Critique, Élevée, Moyenne, Indicateur, Faux rapport, Rapport fondé, Cascade, Médico‑légal — segment de texte identique x 491…553, l = 63 px) · `Predominant` × **2** (Faible, Programmée — x 491…648, l = 158 px) · `Moderate` × **1** (x 674…789) | `m04` | que ces chaînes soient des valeurs d'enum brutes plutôt qu'une traduction manquante (je ne lis pas le code) |
| `B2` | BLOQUANT | NOUVEAU | oui (la chaîne) / non (la forme) | **Identifiant technique affiché** : le sous‑titre est « district district‑1 · Nominal » — le mot « district » y figure deux fois, dont une comme préfixe d'un slug. Le canon nomme le district (« Verge‑A », « Spine‑A ») et met le **résumé de la ville** dans le sous‑titre. | sous‑titre : encre x 338…740, y 344…368 ; 3 segments (« district district‑1 », « · », « Nominal ») ; aucun accent d'or (le canon met le compte en `--or-vif`, mesuré (242, 201, 107) à x = 318) | `m04`, `m17` | si le back projette un nom lisible pour ce district (relève du juge données) |
| `B3` | BLOQUANT | NOUVEAU | non | **L'action de l'écran est absente.** Pas de CTA « Déposer un signalement sur un bâtiment / 50 $ facturés plus tard — trop de faux, et la police se retourne ». Le but « lecture payante · dépôt de rapport » n'est pas atteignable depuis cet écran. | balayage des lignes portant un segment clair ≥ 480 px dans la zone de contenu : **0 / 2 050**. Canon : **544 / 1 500** lignes ≥ 400 px (contrôle positif y = 265 → 788 px ; contrôle négatif y = 660 → 0 px) | `m06` | si l'action vit sur un autre écran atteignable autrement |
| `M1` | MAJEUR | NOUVEAU | oui (le nombre de districts) / non (le résumé) | **La ville a disparu** : un seul district affiché, aucun résumé (« 2 districts sous charge · 16 au calme »), aucun bandeau « Seize districts à charge vide — la police y passe, rien n'y traîne ». Le SENS du vide (« ça plafonne, rien n'est perdu ») n'est porté nulle part. | canon garni : 2 cartes (274,0 CSS de large chacune) + 1 bandeau pointillé + 1 CTA. Capture : 0 carte, 0 bandeau, 0 CTA | `m05`, `m06` | si l'écran client est un **détail par district** appelé depuis une liste que la planche ne montre pas — auquel cas c'est la vue d'ensemble qui manque ailleurs, et ce finding se déplace |
| `M2` | MAJEUR | NOUVEAU | non | **Aucun contenant.** Le « verre gravé » (plaque translucide, liseré clair, ombre portée, coins 12 px) — trait d'identité (a) — n'existe pas : les rangées flottent sur l'aplat. | même balayage que `B3` : **0 / 2 050** lignes de la capture portent un segment clair ≥ 480 px, contre **544 / 1 500** dans le canon. Le plus long segment clair de tout le corps de la capture fait **149 px** — c'est un mot, pas un bord | `m06` | — |
| `M3` | MAJEUR | NOUVEAU | non | **Fond : matière remplacée par un aplat neutre.** Le canon compose ville floutée + voile + verre : aucune couleur au‑delà de 22,4 % de l'aire, toutes bleutées (R−B de −11 à −20). La capture est un noir **neutre** unique. | capture : **(13, 13, 13) sur 94,5 %** de l'aire de contenu, R−B = 0 ; écart au jeton `--encre` (11, 16, 22) = 9/255 mais surtout **perte de la teinte** (R−B : −11 → 0) | `m08`, `m16` | — |
| `M4` | MAJEUR | NOUVEAU | partiellement | **44,3 % de la hauteur d'écran est un vide absolu** entre la dernière rangée et le dock, alors que la maquette ancre son bandeau d'état vide et son CTA en bas de corps. Le vide de la capture est **plus grand** que celui du canon délibérément VIDE. | plus grand vide contigu (x borné à l'intérieur) : **capture 1 064 px = 44,3 %** (y 1114…2177) · canon VIDE 645 px = 36,8 % · canon GARNI 100 px = 5,7 % | `m19` | s'il existe un défilement (une seule image fixe, aucun indicateur visible) |
| `M5` | MAJEUR | NOUVEAU | non | **Couleurs hors du système de jetons.** Cinq valeurs pures, lues en coupe transversale (3 px de cœur identiques, pas un mélange d'anti‑crénelage) : trois **neutres purs** et deux oranges qu'aucun jeton n'approche. | texte atténué **(119, 119, 119)** — R−B = 0 sur 6 zones ; pastille éteinte **(54, 54, 54)** ; fond **(13, 13, 13)** ; pastille allumée « Charge » **(184, 113, 17)** → jeton le plus proche `--laiton` à **45/255** ; pastille allumée gravité/provenance **(133, 116, 81)** → `--laiton` à **43/255**. Témoin : le canon n'emploie que `--creme` / `--creme-2` / `--or` / `--or-vif` / `--braise` (écarts 0 à 6) | `m07`, `m08`, `m14` | quel jeton ces valeurs étaient censées porter (hors image) |
| `M6` | MAJEUR | NOUVEAU | non | **Contraste sous le seuil de doctrine** (≥ 4,5:1 petits textes) sur la majorité du texte : les 2 en‑têtes de section, les 8 libellés atténués et les 8 valeurs « None ». Les pastilles éteintes sont sous le seuil des 3:1. | (119, 119, 119) sur (13, 13, 13) = **4,34:1** (18 occurrences) · pastille éteinte (54, 54, 54) = **1,61:1** · témoin canon, même registre de texte : `--creme-2` sur son fond = **8,87:1**. Contrôles : blanc pur = 19,44:1, fond contre lui‑même = 1,00:1 | `m15` | la taille physique réelle sur l'appareil (mesurée ici en px CSS) |
| `m1` | MINEUR | NOUVEAU | non | **Titre au mauvais jeton d'or** : `--or` là où le canon pose `--or-vif`. Sens de l'écart : **plus sombre / plus saturé**, pas plus jaune ni plus gris. | capture (217, 171, 77) = `--or` #d9ab4e (écart 1) ; canon (242, 201, 107) = `--or-vif` #f2c96b (écart 0) → **delta max 30/255** | `m07` | — |
| `m2` | MINEUR | NOUVEAU | non | **En‑tête centré** au lieu d'aligné à gauche, et **sans rond de retour** dans l'écran (le canon pose un cercle de 30 CSS à gauche du titre, qui sert d'ancre à tout l'en‑tête). | titre capture : encre x 250…828, centre **539,0** (centre d'écran 539,5) ; titre canon : x 152…628, **aligné à gauche**, bord à 50,7 CSS | `m04`, `m05` | — |
| `m3` | MINEUR | NOUVEAU | non | **Filet laiton de tête absent** — trait d'identité (c). Aucune coupure entre l'en‑tête et le corps. | canon : filet à y 228…230, **697 px** de long (x 101…797), luminance de pic 96 ; capture : **aucune ligne** portant un segment ≥ 480 px sur toute la zone de contenu | `m05`, `m06` | — |
| `m4` | MINEUR | NOUVEAU | non | **Sous‑titre : casse et taille.** Casse mixte là où le canon met des capitales interlettrées (`text-transform:uppercase; letter-spacing:.14em`), et capitale plus courte. | hauteur de capitale : capture **6,11 CSS** · canon **6,67 CSS** → **−8,3 %** | `m10` | — |
| `m5` | MINEUR | NOUVEAU | non | **Libellés de rangée en casse mixte** (« Critique », « Élevée », « Médico‑légal ») là où le canon écrit ses libellés et ses jetons en capitales interlettrées — trait d'identité (b). | hauteur de capitale des en‑têtes de section : capture **5,56 CSS** · libellé homologue du canon **6,33 CSS** → **−12,3 %** ; valeur/jeton : **4,17** contre **5,00 CSS** → **−16,7 %** | `m10` | — |
| `m6` | MINEUR | NOUVEAU | non | **27 % de la largeur inutilisés à droite.** Le contenu s'arrête à 219 CSS ; la maquette occupe la largeur (cartes de 274 CSS, marges 13/13). | capture hors titre : encre x 37…789 → emprise **209,2 CSS / 300**, marge droite **80,6 CSS** ; canon : carte `.dist` x 39…860 → **274,0 CSS**, marges 13,0 / 13,0 | `m17` | — |
| `m7` | MINEUR | NOUVEAU | non | **Deux géométries et deux couleurs pour le même dispositif.** La jauge « Charge » et les jauges de distribution ne partagent ni la taille de pastille, ni la couleur d'allumé, ni la colonne. | pastille Charge **10,8 × 8,1 CSS** (×5, allumé (184, 113, 17)) contre distribution **15,8 × 6,9 CSS** (×3, allumé (133, 116, 81)) ; colonne de jauge à x = 427…652 pour Charge contre x = 284…470 pour les 10 autres rangées ; colonne de valeur à x = 674 contre x = 491 | `m04`, `m13`, `m14` | si les états intermédiaires (`SOME` / `MANY`) allument 1 ou 2 pastilles — cette planche ne montre que 0/3 et 3/3 |
| `m8` | MINEUR | NOUVEAU | non | **Variante `.tel.chaud` appliquée à moitié dans le chrome.** Sur les quatre règles que la source `hud-brennar.html` passe en `--braise` quand le compte est brûlant, deux le sont et deux ne le sont pas. | appliquées : `.barre::after` (217, 99, 71, écart 7) ✓ et `.medaillon .boitier` (210, 96, 69) ✓ — **non appliquées** : `.heatpct` (« Brûlant ») mesuré **(234, 224, 200)** = `--creme`, et `.aile.droite .val` mesuré **(234, 224, 200)**, là où la règle exige (224, 102, 74) → **écart 126/255** | `m18` | — |
| `m9` | MINEUR | NOUVEAU | non | **Flèche de retour en blanc froid**, hors palette (le jeton le plus clair du système est `--creme` (234, 224, 200)). | (238, 241, 242) → écart à `--creme` = **42/255**, et R−B = **−4** (froid) dans une palette chaude | `m18` | — |

**Compte : 3 BLOQUANT · 6 MAJEUR · 9 MINEUR.**

**Qui est en cause, pour chaque finding** (l'écran, la maquette, ou un arbitrage) :

- **L'ÉCRAN — destinataire : correcteur.** `B1` `B2` `B3` `M1` `M2` `M3` `M4` `M5` `M6` `m1` `m2`
  `m3` `m4` `m5` `m6` `m7` `m8` `m9` — **les 18**. Aucun de ces écarts n'est imputable à la
  maquette : sur chacun, le canon de série 2 porte la forme attendue et la capture ne la porte pas.
- **LA MAQUETTE — destinataire : blender.** Aucun **finding**, mais deux points hors table : `A6`
  (libellés anglais `HEAT` / `$ 24 850` dans la référence `#31` — maquette en retard sur le ruling
  « fr réel ») et le **défaut de dossier** `A7` (la référence rendue est celle de ⑰, pas de ⑮ : il
  manque un rendu du cadre `#32` de série 6, et/ou la désignation explicite du canon de série 2
  comme référence de ⑮).
- **ARBITRAGE USER / DA.** `A1` à `A5` (police substituée · flèche de retour · ronds du dock sans
  icône · `FILIÈRE` vs `MARCHÉ` · quelle DIRECTION fait autorité pour ⑮, le verre gravé de la
  série 2 ou le liège de la série 6).

⚠️ Une nuance sur `M1` : si le client a délibérément fait de ⑮ un **détail par district** appelé
depuis une liste amont, alors `M1` n'est pas un défaut de cet écran mais une vue d'ensemble absente
**ailleurs** — c'est le seul finding dont le destinataire pourrait basculer vers l'arbitrage produit.
Les 17 autres ne bougent pas.

### Écarts ASSUMÉS (non comptés) — vérifiés « rendus proprement »

| ce qu'on voit | pourquoi | rendu proprement ? | ce qui le ferait sortir de l'assumé |
|---|---|---|---|
| Aile droite : « JOUR 50 » puis « — » à la place de la phase | doctrine du dossier : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district ; ARGENT et JOUR **sont** alimentés ⇒ le reste du chrome se juge | **oui** — le tiret est un vrai tiret, pas une clé ni un libellé de repli ; il est aligné à droite comme la valeur | un « Unknown », une clé i18n brute, ou ARGENT/JOUR eux‑mêmes vides |
| Aucune illustration d'état vide | mesuré hors image par le correcteur : 0 chargement d'illustration d'état vide dans le client ; les planches de l'atelier ne sont montées nulle part | sans objet ici (l'écran n'est pas dans un état vide) | — ; mais le **texte** de sens, lui, est dû → compté en `M1` |

### ARBITRAGES (non comptés)

| id | sujet | mesure | destinataire |
|---|---|---|---|
| `A1` | **Police** : `Georgia` de la maquette a été rendue par **Noto Serif** (`fc-match`, dossier) ; le client embarque **DejaVu Serif**. Famille et chasse non opposables. | la seule grandeur comparable, la hauteur de capitale du titre, est **égale** (−2,8 %) ; à hauteur égale, la chasse du titre est quasi identique (160,8 CSS contre 159,0 CSS, +1,1 %) | aucun — arbitrage constaté, rien à corriger |
| `A2` | **Flèche de retour** dans le bandeau : domicile non tranché en série 6 | présente, x ≈ 60…110, y ≈ 60…90 | arbitrage user (déjà connu) |
| `A3` | **Ronds du dock sans icône** : le canon HUD pose une icône 20×20 dans chacun ; le client n'en pose aucune | 4 ronds vides, diamètres 126/127/127/126 px | arbitrage user (« j'aime pas les icônes ») |
| `A4` | **Dock : « FILIÈRE » au lieu de « MARCHÉ »** du canon HUD | libellé lisible sur la capture, 3ᵉ position | question de chrome déjà remontée — **notée, pas comptée** |
| `A5` | **Deux directions coexistent pour le même domaine** : le canon de série 2 est « verre gravé sombre » (luminance 22,7) ; le cadre de série 6 `#31`/`#32` est « liège, punaises, fiches bristol » puis « listing de dispatch perforé » (luminance 141,2). Le client suit la direction **série 2**. | écart de luminance moyenne **118,5** entre les deux canons du même domaine | arbitrage user / DA — quel canon fait autorité pour ⑮ |
| `A6` | **Libellés anglais dans la RÉFÉRENCE** `#31` (`HEAT`, `$ 24 850`) | ruling « fr réel » : le client a raison, la maquette est en retard | blender — maquette à mettre à jour ; **jamais un écart d'écran** |
| `A7` | **Le dossier fournit la mauvaise référence** : `#31` est la maquette de ⑰, pas de ⑮ (voir la section d'homologie) | luminance 141,2 contre 15,5 ; titre différent ; champs différents | orchestrateur / dossier — à corriger pour r2 |

---

## 5. Autres résolutions

**Non vérifié — une seule capture est fournie.** Le dossier publie lui‑même son dénominateur :
« (a) deux résolutions 1920 + 2400 → **NON** — 2400 seulement ». Rien ne peut être dit du reflux,
du recadrage ni des proportions à 1080×1920.

Ce que l'unique résolution permet d'affirmer : à **1080×2400**, rien n'est coupé, rien ne sort du
cadre, rien ne passe sous le bandeau (y ≤ 143) ni sous le dock (y ≥ 2179) — l'encre du contenu vit
entre y = 215 et y = 1113, x = 37 et x = 828.

Ce qu'elle ne permet pas : le vide de 1 064 px (`M4`) grandirait mécaniquement à une hauteur
supérieure et se réduirait à 1080×1920 ; sa gravité doit donc être relue sur la seconde résolution.

---

## 6. Non vérifié

| # | ce que je ne peux pas trancher depuis l'image | la mesure hors image qui trancherait |
|---|---|---|
| 1 | **La seconde résolution (1080×1920)** : absente du dossier | relancer la campagne de planche avec les deux résolutions |
| 2 | **Les VALEURS affichées** (9 627 820,00 € · JOUR 50 · district‑1 · Moderate · Predominant) : l'identité photographiée est *déclarée par corps de commit*, jamais relue ; aucun journal n'est joint. Je juge la **forme**, pas les valeurs. | la ligne `[DemoIdentityResolver] régime=env identité=…` du journal du run, jointe au dossier |
| 3 | **L'onglet actif** : le dock souligne **EMPIRE** alors que l'écran vient de « Plus ». La planche est une **surimpression** — le chemin joueur n'est pas exercé — donc ce n'est probablement pas un défaut d'écran mais un artefact de la chaîne de capture. Non compté. | une capture prise par le chemin joueur (Plus → LES INSPECTIONS) avec l'onglet actif asserté |
| 4 | **Un défilement éventuel** : rien ne prouve que le contenu s'arrête vraiment à `Médico‑légal` ; aucun indicateur de défilement n'est visible | une capture après un geste de défilement, ou le rect du conteneur imprimé au run |
| 5 | **Les états intermédiaires des jauges** (`SOME`, `MANY`) : la planche ne montre que 0/3 et 3/3 pastilles ; je ne peux pas dire si 1/3 et 2/3 s'allument | une capture sur un compte dont une distribution est intermédiaire |
| 6 | **L'animation** : le mandat amendé du 2026‑09‑07 dit que l'animation est **voulue** sur les écrans neufs et qu'un pixel qui bouge n'est pas un écart ; aucune paire T / T+1 s n'est fournie, donc je ne dis rien de l'animation — ni de sa présence, ni de l'endroit où l'image figée tombe | une paire T / T+1 s, et la présence de `@keyframes` dans la source |
| 7 | **Le jeton d'origine des cinq couleurs hors palette** (`M5`) : je mesure la valeur rendue, pas l'intention | lecture des jetons côté source (hors de mon périmètre) |
| 8 | **Si `M1` est un défaut de cet écran ou une vue d'ensemble manquante ailleurs** : je ne vois qu'un écran | la maquette de la liste amont, ou la question posée à l'arbitrage |
| 9 | **Le rect imprimé par le test** : non préservé ; la géométrie du chrome utilisée ici est **dérivée du code par le dossier** et je l'ai seulement **corroborée** sur l'image (bandeau prédit 143,3 px, filet mesuré à 141‑142) | le log du run avec `git rev-parse HEAD` et le rect imprimé |
| 10 | **La chaîne de capture** : le dossier avertit qu'un arrondi de position peut fabriquer des grandeurs suspectement rondes. Ici les pas mesurés **ne sont pas ronds** (55, 56, 58, 58, 59 px ; écarts 7 et 8 px) — donc **aucun soupçon** de ce côté, mais je ne peux pas l'exclure formellement | les appelants de `SnapToScreenPixel` (hors de mon périmètre) |

---

## Annexes

### Annexe 1 — Inventaire de la référence (canon de série 2, garni, 900×1752, ×3,0)

| id | catégorie | bbox px | bbox CSS | forme | remplissage | texte | relations |
|---|---|---|---|---|---|---|---|
| `R.retour` | bouton | (45, 78)–(121, 167) | **25,7 × 30,0 CSS** | cercle | `#ffffff08`, bord `#ffffff26` | chevron « ‹ » | à gauche du titre, ancre de l'en‑tête. La hauteur mesurée tombe exactement sur la valeur CSS (30) ; la largeur sort à 25,7 parce que le liseré de 1 px s'éteint sur les flancs au seuil retenu — limite d'instrument déclarée (`m20`) |
| `R.titre` | titre | (152, 64)–(628, 97) | 50,7…209,3 × 21,3…32,3 | texte | — | `LES INSPECTIONS`, sérif, capitales, interlettré, **cap 10,00 CSS**, `--or-vif` (242, 201, 107) | aligné à gauche |
| `R.sous` | texte | (149, 125)–(504, 191), 2 lignes | 49,7…168 | texte | — | `JOUR 26 · 2 DISTRICTS SOUS CHARGE · 16 AU CALME`, capitales interlettrées, **cap 6,67 CSS**, `--creme-2` (185, 173, 146) ; le compte « 2 » en gras `--or-vif` (242, 201, 107) mesuré à x = 318 | sous le titre |
| `R.filet` | séparateur | (101, 228)–(797, 230) | 33,7…265,7 × 76,0…76,7 | trait 1 CSS | dégradé transparent → laiton → transparent, pic de luminance 96 | — | ferme l'en‑tête |
| `R.dist1` | panneau | (39, 262)–(860, 640) | 13,0…286,7 × 87,3…213,3 | rect arrondi 12 px | verre : gradient bleuté + liseré `#ffffff24` + ombre | `Verge-A` sérif `--or-vif` ; jetons `CHARGE · MODÉRÉE` (`--or`) et `RÉGIME · ARRIÉRÉ` (`--braise`) ; lignes `GRAVITÉ` et `ORIGINE`, 3 jetons chacune | largeur **274,0 CSS**, marges 13,0 / 13,0 |
| `R.dist2` | panneau | (39, 673)–(860, 1090) | 13,0…286,7 × 224,3…363,3 | idem | idem | `Spine-A` ; `CHARGE · LÉGÈRE` (`--cyan`), `RÉGIME · NOMINAL` (`--creme-2`) ; 2 jetons par ligne (les zéros **regroupés**) | idem |
| `R.vide` | bandeau | (39, 1199)–(860, 1366) | **274,0 × 56,0 CSS** | rect arrondi 12 px, **bord pointillé** `#ffffff22` | fond nul | « Seize districts à charge **vide** — la police y passe, rien n'y traîne », `--creme-2` (185, 173, 146), centré | poussé vers le bas |
| `R.cta` | bouton | (39, 1466)–(860, 1716) | **274,0 × 83,7 CSS** | rect arrondi 11 px | `#ffffff0a`, bord `#ffffff2a` | « Déposer un signalement sur un bâtiment » (`--creme`, 234, 224, 200) + « 50 $ facturés plus tard — trop de faux, et la police se retourne » | **ancré en bas** : bord inférieur à 572,0 CSS d'un écran de 583,3 CSS |

**Couche globale (corps, y 231…1745).** Luminance moyenne **22,7**. Densité d'encre **8,23 %**.
Palette : 10 tons bleu‑encre, **aucun au‑dessus de 22,4 %**, R−B de −11 à −20. Plus grand vide
contigu **100 px (5,7 % de l'écran)**. Contraste des textes courants **8,87:1**.

*(Canon VIDE, second témoin : même en‑tête ; corps réduit à un bandeau pointillé centré portant
« La police n'a encore inspecté aucun district — **après son premier passage, les dix‑huit files
s'ouvrent d'un coup** » ; densité 2,22 %, plus grand vide 645 px = 36,8 %.)*

*(Référence `#31` fournie par le dossier, hors homologie : panneau de liège brun, 6 fiches bristol
punaisées, tampons `EN CHASSE` / `SOUPÇON` / `EN VEILLE`, pastilles de patrouilles. Luminance
moyenne **141,2** ; palette dominée par (217, 203, 169) 23,8 % et (92, 70, 39) 17,8 %, R−B de +42 à
+53. Aucun élément de cette maquette n'a de contrepartie dans la capture.)*

### Annexe 2 — Inventaire de la capture (1080×2400, contenu ×3,6, chrome ×2,755)

| id | catégorie | bbox px | forme / couleur | texte | note |
|---|---|---|---|---|---|
| `C.bandeau` | chrome | y 0…143 | verre sombre, filet **braise** (217, 99, 71) à y 141‑142 sur 1 007 px | — | hauteur conforme au dérivé 143,3 px |
| `C.retour` | chrome | (82, 66)–(104, 78), **23 × 13 px** | flèche, **(238, 241, 242)** | — | arbitrage `A2` ; couleur → `m9` |
| `C.argent` | chrome | x 179…446, y 55…110 | `--or-vif` (242, 201, 106) ; barre pleine 276 px + 89 px vides à y = 118 | `ARGENT` / `9 627 820,00 €` | libellé `--creme-2` ✓ ; 4 px de dégagement avant le médaillon |
| `C.medaillon` | chrome | disque centré ≈ x 450…630 | anneau **braise** (210, 96, 69) ✓ ; arc froid à gauche (70, 98, 109), chaud à droite (133, 76, 71) ; aiguille à **+9,2°** vers la droite | `Brûlant` **(234, 224, 200)** / `CHALEUR` (185, 173, 146) | valeur en crème au lieu de braise → `m8` |
| `C.aile-d` | chrome | x 930…1050 | libellé `--creme-2` ✓ ; valeur **(234, 224, 200)** | `JOUR 50` / `—` | tiret = ASSUMÉ ; couleur → `m8` |
| `C.losange` | chrome | x 531…548, y 215…231 | `--laiton` (176, 141, 61), écart 1 | — | canonique ✓ |
| `C.titre` | titre | x 250…828, y 268…303 | sérif, capitales interlettrées, **`--or` (217, 171, 77)**, cap **9,72 CSS** | `LES INSPECTIONS` | **centré** (centre 539,0) ; jeton → `m1` |
| `C.sous` | texte | x 338…740, y 344…368 | casse mixte, `--creme-2`, cap 6,11 CSS | `district district-1 · Nominal` | → `B2`, `m2`, `m4` |
| `C.charge` | rangée | libellé x 37…143 · jauge x 427…652 (5 pastilles 39×29 px, écarts 7 px) · valeur x 674…789 | libellé `--creme-2` · allumé **(184, 113, 17)** ×3 · éteint **(54, 54, 54)** ×2 · valeur `--creme` | `Charge` … `Moderate` | colonne propre, ≠ des 10 autres → `m7` |
| `C.h1` `C.h2` | en‑tête de section | x 38…239 et 38…321 | **(119, 119, 119)**, capitales, cap 5,56 CSS | `PAR GRAVITÉ` · `PAR PROVENANCE` | 4,34:1 → `M6` |
| `C.g1…g4` | rangées gravité | libellé x 37…173 · jauge x 284…470 (3 pastilles 57×25 px) · valeur x 491… | atténuées **(119, 119, 119)** ×3 (`None`) ; `Faible` en `--creme` + pastilles **(133, 116, 81)** + `Predominant` en `--creme-2` | `Critique` `Élevée` `Moyenne` `Faible` | pas 53/63/56 px (l'accent d'`Élevée` décale le haut d'encre) |
| `C.p1…p6` | rangées provenance | idem | `Programmée` allumée ; 5 atténuées | `Programmée` `Indicateur` `Faux rapport` `Rapport fondé` `Cascade` `Médico-légal` | pas 59/58/55/58/56 px, dispersion 7,0 % ✓ |
| `C.vide` | — | y 1114…2177 | **(13, 13, 13)** uniforme | — | **1 064 px = 44,3 % de l'écran** → `M4` |
| `C.dock` | chrome | y 2179…2341 | 4 ronds vides ⌀ 126‑127 px | `EMPIRE` (souligné or) · `FAMILLE` · `FILIÈRE` · `PLUS` | icônes absentes = `A3` ; `FILIÈRE` = `A4` ; onglet actif = non vérifié n° 3 |

**Couche globale (contenu, y 143…2210).** Luminance moyenne **15,5**. Densité d'encre **2,65 %**
(canon garni 8,23 %, canon vide 2,22 %). Palette : **(13, 13, 13) à 94,5 %**, R−B = 0. Rythme :
pas de rangée ≈ 57 ± 2 px (15,8 ± 0,6 CSS). Contrastes : 9,15:1 (titre) · 14,80:1 (2 rangées
porteuses) · 8,75:1 (sous‑titre, valeurs secondaires) · **4,34:1 (18 éléments)** · 1,61:1 (pastilles
éteintes).

### Annexe 3 — Correspondance des repères

| | px de l'image | largeur CSS | facteur | vérification indépendante |
|---|---|---|---|---|
| Capture, **contenu** | 1080 | 300 | **×3,600** | posé par le dossier |
| Capture, **chrome** | 1080 | 392 (CSS‑HUD) | **×2,755** | bandeau prédit 52 × 2,755 = **143,3 px** ; filet braise mesuré à **y = 141‑142** → écart ≤ 2 px (`m11`) |
| Canon série 2 (garni et vide) | 900 | 300 | **×3,000** | carte `.dist` mesurée **274,0 CSS** contre 276 CSS dérivés de la CSS (`.corps` padding 12 ⇒ 300 − 24) → **écart 0,7 %** ; marges mesurées 13,0 / 13,0 CSS contre 12 attendus |
| Référence `#31` (série 6) | 1080 | 300 | ×3,600 | posé par le dossier ; non utilisée pour la géométrie (non homologue) |
| **Rapport capture ÷ canon série 2** | | | **1,200** | toute grandeur de cette annexe et de la table d'écarts est exprimée en **px CSS** |

**Offsets.** Aucun décalage vertical global n'est appliqué : les hauteurs de bandeau et de dock
diffèrent entre la capture (chrome de shell) et les canons (cadre `.tel` autonome). Les positions
verticales ne sont donc comparées **qu'à l'intérieur de chaque image** (rythme, vides, ordre) ;
seules les **tailles** (capitales, largeurs, emprises) et les **couleurs** traversent la
correspondance d'échelle.

### Annexe 4 — Scripts

Tous dans `mesures/`, PIL seul, chacun imprime la taille des images qu'il ouvre et porte au moins un
contrôle positif ; les scripts qui décident portent aussi un contrôle négatif.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `m01_geometrie.py` | tailles, profils de luminance par ligne, bandes claires | + largeur = 1080 ; − hauteur capture ≠ hauteur référence |
| `m02_encre.py` | profil d'encre par ligne, blocs, zones sans encre | + filet du bandeau → 945 px ; − y = 1500 → 0 px |
| `m03_densite.py` | densité d'encre, seuil adaptatif déclaré | + bande du message du canon vide → 22 013 px ; − bande y 300…800 → 3 000 px (**contrôle imparfait : le liseré du cadre `.tel` traverse toutes les lignes** ; il discrimine d'un facteur 16, il ne vaut pas zéro) |
| `m04_rangees.py` | bbox et segments horizontaux des 17 bandes de la capture | + filet du bandeau → 3 segments quasi pleine largeur ; − y 1400…1410 → 0 segment |
| `m05_canon_serie2.py` | géométrie du canon de série 2, en px et en CSS | + largeurs = 900 ; − filet présent à y = 229 (696 px) et absent à y = 600 (146 px) |
| `m06_panneaux.py` | présence de **panneaux** (seuil bas, segments longs) | + canon y = 265 → 788 px ; − canon y = 660 → 0 px |
| `m07_couleurs.py` | couleurs d'encre (médiane du décile clair) contre les jetons | + fonds à ≤ 9/255 de `--encre` ; − titre à +204 R du fond |
| `m08_palette.py` | teinte R−B de l'encre ; palette quantifiée | + titre chaud (R−B = +140) ; − l'instrument rend 9 zones NEUTRES et 4 très chaudes ⇒ il discrimine |
| `m09_typo.py` | premières hauteurs de capitale (**dépassé par `m10`**) | + dispersion 1 px sur les titres ; − forte dispersion en casse mixte |
| `m10_typo_detail.py` | hauteurs glyphe par glyphe ; **corrige `m09`** (le max fusionnait des lettres et attrapait accents et jambages) | + médiane = max à 1 px près sur les deux titres |
| `m11_chrome_et_rythme.py` | filets pleine largeur, dock, rythme (**sonde de collision fausse, corrigée en `m12`**) | + bandeau ; − y = 1500 → 0 |
| `m12_collision_rythme.py` | collision ARGENT/médaillon, sonde durcie ; rythme sur haut de capitale | + anneau braise centré à 539,5 ; − sonde braise sur l'or du titre → **0 px** |
| `m13_jauges.py` | géométrie des pastilles, continuité des rails (classe 9‑slice) | + rail haut ≥ 20 px continus ; − 6 px sous la pastille → 0 segment |
| `m14_trait_pur.py` | **couleur pure** des traits, lue en coupe transversale | + fond (13, 13, 13) de part et d'autre ; − la coupe n'est pas uniforme |
| `m15_contraste.py` | couleur pure des textes + contraste WCAG | + blanc pur = 19,44:1 ; − fond contre lui‑même = 1,00:1 |
| `m16_ref31.py` | couche globale de `#31`, du canon et de la capture ; argument d'homologie | + `#31` clair (141,2 > 90) ; − capture sombre (15,5 < 40) |
| `m17_marges.py` | marges et emprise horizontale | + **le contrôle a ÉCHOUÉ** (300 CSS au lieu de 274) parce que le seuil bas attrapait le cadre `.tel` ⇒ le nombre du canon n'est **pas** repris de ce script, mais de `m05` (seuil 46, x borné) |
| `m18_chrome.py` | filet, médaillon, aiguille, losange, ailes, dock | + filet braise (écart 7 ≤ 10) ; − le même test sur le titre → écart 69 |
| `m19_vide_corrige.py` | plus grand vide contigu, **corrige `m03`** (x borné à l'intérieur du cadre) | + canon vide → 645 px ; − canon garni → 100 px |
| `m20_boites_estimees.py` | mesure les 4 boîtes que l'annexe n'avait qu'estimées à l'œil (rond de retour, bandeau pointillé, CTA, flèche) | + rond de retour quasi carré (**le contrôle signale 13 px d'écart** : le liseré s'éteint sur les flancs — limite déclarée) ; − bandeau pointillé 4,9× plus large que haut |

Sorties brutes reproductibles par `python3 mesures/<script>.py` depuis ce dossier.
Images de travail (recadrages et agrandissements) : `mesures/_crop_*.png`, `mesures/_zoom_*.png`.
