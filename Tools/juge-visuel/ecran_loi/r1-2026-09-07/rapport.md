# Juge visuel ⊥ — ㉛ La loi (« le parloir ») — r1 — 2026-09-07

## Verdict : NON APPROUVÉ

Le corps de l'écran est le bon (les trois avocats et leur aparté sont au mot près ceux du cadre
#68) et il est correctement gouttiéré, lisible et en français — mais **la bande basse du châssis
de série 6, présente dans les six cadres du groupe (voix du lieutenant + geste), est entièrement
absente**, et l'échelle typographique est sur-dimensionnée de +9 % à +53 % de façon non uniforme
alors que les boîtes, elles, sont à l'échelle : l'écran se lit comme une page en gros caractères
sans issue, là où la maquette est un dossier dense qui se termine par une phrase et un bouton.

---

## Ce que je juge, et contre quoi

- La capture montre un **état VIDE** (« Vous n'avez encore engagé personne. » / « Aucune affaire en
  cours. »). La référence rendue est le cadre **NOMINAL #67** (« Ils ont arrêté un de vos
  coursiers »), qui n'est pas son homologue.
- **Homologue retenu pour le CORPS : le cadre #68 « Lui trouver un avocat »**, et je dis pourquoi :
  le bloc « QUI PEUT VOUS DÉFENDRE » de la capture reprend **verbatim** les trois `.pl-choix` de
  #68 (« Commis d'office / gratuit — il fait ce qu'il peut » · « Un cabinet / ça coûte — il
  connaît les juges » · « La filière / ça coûte cher — et ça peut se retourner »), leurs trois
  jetons (`EN PLACE` · `DISPONIBLE` · `À VOS RISQUES`) et son `.pl-rien` (« La filière fait
  classer une affaire sans procès — mais elle se sert de gens qui, un jour, peuvent parler à leur
  tour. »). Aucun autre cadre du groupe ne porte ce contenu.
  ⚠️ **#68 n'est pas rendu ce tour** : ses grandeurs ne me sont connues que par la **SOURCE CSS**.
- **Le châssis `.parl6` est commun aux six cadres** (`.pl-tete`, `.pl-body`, `.pl-titron`,
  `.pl-item`, `.pl-bas` ont la même CSS partout) : pour ces parties je compare à l'**IMAGE rendue**
  de #67, et mon instrument y retrouve les jetons CSS **au bit près** (voir contrôle positif) —
  c'est ce qui rend opposables les valeurs que je ne peux lire que dans la CSS.
- Le **chrome** (bandeau, médaillon, dock) est jugé contre `hud-canon-1176.png`, jamais contre le
  cadre de série 6. **Le chrome EST alimenté** (ARGENT et JOUR portent des valeurs) : je le juge,
  hors la phase « — » qui est un état voulu.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Étalonnage d'abord (`mesures/xheight.py`, `mesures/cartes.py`, `mesures/contraste.py`) : sur
l'IMAGE de référence, mes sondes retrouvent les valeurs **écrites dans la CSS** :

| grandeur lue sur l'image de référence | CSS `.parl6` | mesuré | écart |
|---|---|---|---|
| aplat `.pl-item` | `#1e242b` | `#1e242b` (30,36,43) | 0 |
| bord `.pl-item` | `#303a44` | `#303a44` (48,58,68) | 0 |
| fond `.pl-tete` | `#1a1f26` | `#1a1f26` (26,31,38) | 0 |
| filet `.pl-tete` | `#333c46` | `#333c46` (51,60,70) | 0 |
| bord haut `.pl-bas` | `2px #2c3640` | 7 px = 1,94 CSS, (44,54,64) | ≤ 0,1 CSS |
| fond `.pl-bas` | `#141a21` | `#141a21` (20,26,33) | 0 |
| bord `.pl-geste` | `#5a4a2a` | `#5a4a2a` (90,74,42) | 0 |
| encre `.pl-tete h3` | `#eef3f9` | `#eef3f9` | 0 |
| encre `.pl-titron` | `#7e8b98` | `#7e8b98` | 0 |
| encre `.pl-item span` / `em` | `#c3ccd6` / `#8d99a6` | idem | 0 |
| taille `.pl-qui i` / `.pl-tete p` / `.pl-item span` | 6,6 / 7,0 / 7,6 CSS | 6,63 / 7,14 / 7,65 | ≤ 0,14 CSS |
| `.pl-body` padding gauche | 13 CSS | 46,8 px = 13,0 CSS | 0 |
| `.pl-tete` hauteur | 48,25 CSS dérivée | 173 px = 48,06 CSS | 0,19 CSS |

Puis, entre la **maquette et le jeu** :

1. **Échelle** — largeur écran 392,0 CSS-HUD des deux côtés (`chrome.py`) ; contenu ×3,6 des deux
   côtés (dossier) ⇒ rapport 1,00. Toutes les comparaisons ci-dessous sont donc des écarts réels.
2. **Hauteur de bandeau** — filet à **51,2 CSS-HUD** (capture) contre **51,0–52,0** (canon).
3. **Diamètre extérieur de l'anneau du médaillon** — **133,2 CSS** contre **133,0** au canon (Δ 0,15 %).
4. **Centre horizontal du médaillon** — **195,8 CSS** contre **195,7** au canon (centre théorique 196,0).
5. **Filet et anneau en BRÛLANT** — (224,102,73) contre le jeton braise `.tel.chaud` (224,102,74) : **Δ 1/255**.
6. **Retraits internes des cartes** — 10,56 CSS à gauche, 10,56 CSS à droite ; CSS `.pl-choix{padding:8px 10px}` ⇒ 10.
7. **Largeur de la plaque** — 966 px (jeu) contre 980 px (`.pl-item` rendu) : Δ 1,4 % de la largeur d'écran.
8. **Marge latérale du contenu** — 57 px contre 50 px : Δ 0,65 % de la largeur (tolérance 1,5 %).
9. **Aplat neutre de la carte** — (34,42,46) contre le jeton `#1e242b` (30,36,43) : Δ ≤ 6/255 par canal.
10. **Encre du titre** — `#eef1f2` contre `#eef3f9` : Δ ≤ 7/255, dans le bruit de la sonde d'anti-crénelage.
11. **Aucune ombre, aucun halo** sous ni sur les plaques, des deux côtés : profil `d = 0…14 px`
    strictement à **0,00/255** (jeu) et ≤ 0,5/255 (maquette, résidu de dégradé) — `mesures/ombres.py`.
    La portée est écrite : l'effet est nul **dès d = 1**, pas seulement au-delà.
12. **Contraste** — tous les textes ≥ 4,5:1, minimum mesuré **6,47:1** (libellés de section). Doctrine
    (≥ 3:1 grands, ≥ 4,5:1 petits) satisfaite partout, sur l'art réel.
13. **Langue** — 100 % français ; **zéro clé i18n brute**, zéro repli anglais sur la capture.
14. **Gouttière** — première encre de contenu à y=215 (filet du bandeau à 143), dernière à y=1450
    (haut du dock à 2179) : rien sous le bandeau, rien sous le dock.
15. **Ordre et copie des trois avocats** — identiques au cadre #68, y compris l'aparté, au mot près.
16. **Pas de défaut sélectif d'espacement** — pas des cartes régulier (22, 22 px) ; l'écart n'accuse
    donc pas un conteneur particulier.
17. **Direction respectée** — l'écran est bien sombre ; le médaillon en braise est le bon témoin
    d'état BRÛLANT, pas un laiton faux.

---

## 0. L'écran, tel que la maquette le dit

*(écrit sur les cadres #67–#72 SEULS, avant d'ouvrir la capture)*

**Le but.** Un de vos hommes est tombé. Cet écran est le parloir : il vous dit **qui** est pris,
**ce qu'il sait**, **combien de jours** il reste, et vous laisse **un seul geste** — lui trouver un
avocat, prendre l'accord, le retirer de l'affaire. C'est le seul endroit du jeu où ne rien faire
coûte quelque chose d'irréversible : ce qui sort ne rentre pas.

**L'ordre de lecture.** (1) le **titre sérif**, qui est une phrase d'état (« Ils ont arrêté
quelqu'un à vous », « Il commence à parler ») et non un nom d'écran — c'est l'élément le plus gros
(12 CSS) et le plus clair (14,85:1) ; (2) le **corps** — le prévenu derrière la vitre avec son
compte à rebours en gros chiffres, ou les trois avocats sur des plaques **teintées par leur état**
(vert = pris, ambre = risqué) ; (3) la **bande basse**, toujours là : la voix du lieutenant en
italique sérif, puis le **geste** sur une plaque d'or.

**Les zones.** `.pl-tete` (plaque d'en-tête #1a1f26 + filet, titre + accroche) · `.pl-body` (le
dossier : vitre, liste, ou choix) · `.pl-bas` (plaque #141a21 séparée par un filet de 2 CSS, voix +
bouton), **épinglée en bas** — le corps est `flex:1`, le mou va au milieu, jamais en dessous.

**Les traits d'identité.** (a) un panneau **bleu nuit en dégradé** (#1b1f24 → #14181d → #101317) ;
(b) le **sérif pour les noms et les titres**, le sans pour tout le reste ; (c) des plaques
**bordées** d'un filet froid de 1 CSS, coins à 3 CSS ; (d) l'**état porté par la plaque elle-même**
(teinte + bordure), pas seulement par une étiquette ; (e) **la bande basse toujours présente** —
elle est la signature du châssis autant que sa fonction.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, sur trois plans.

**Le but** est reconnaissable et honnête : « Le parloir · Vos avocats, et ce qu'ils peuvent faire
pour vous », trois avocats, trois revers, et deux états vides bien écrits. L'état vide de la
priorité 1 est **conforme au sens voulu** : « Aucune affaire en cours. » + « Une affaire naît d'une
descente — rien sur cet écran n'en crée. » dit ce qui manque, d'où ça vient, et déclare la limite ;
rien ne se lit comme une perte, une punition ou une panne. C'est le point fort du tour.

**L'ordre de lecture est changé.** Premier regard : « Le parloir », correct. Deuxième : ce n'est pas
une plaque, c'est le **cyan `EN PLACE`** — chroma 158 contre 74 au jeton sauge de la maquette, le
point le plus saturé de l'écran, une teinte qui n'appartient à aucune partie de la direction
sombre-napolitaine. Puis le jaune `À VOS RISQUES` (chroma 191 contre 139). Les trois plaques, qui
devaient porter l'état, arrivent **après** leurs étiquettes, toutes au même gris.

**Le troisième temps a disparu.** La bande basse n'existe pas : ni voix, ni geste, ni filet. À sa
place, **729 px — 35,8 % du rect libre — de fond strictement (13,13,13)** : sur y 1451..2100, **0
pixel** s'écarte du fond de plus de 1/255. L'écran se termine par une phrase d'aide, puis rien.

**Les couches globales** confirment. Panneau : la maquette descend de (26,31,38) à (18,22,26) en
dégradé bleu ; le jeu est un **aplat neutre (13,13,13)** de bout en bout, 0,31× la luminance du
haut de la maquette, sans une seule teinte intermédiaire. Densité d'encre 9,4 % (maquette, panneau
entier) contre 23,5 % (jeu, rect libre) : le jeu met **moins de choses, plus gros**. Le gris
secondaire est **1,70× plus lumineux** (#8d99a6 → #b8c2cc) et le type est sur-dimensionné de +9 % à
+53 % — **alors que les boîtes, elles, sont à l'échelle** (largeur de plaque à 1,4 %, retraits à
0,56 CSS). Ce n'est donc pas un facteur d'échelle global : c'est la rampe typographique et les
jetons de gris qui ont été redéfinis, et la hiérarchie s'en trouve écrasée — le sous-titre d'écran
(10,7 CSS) est presque aussi gros que le TITRE de la maquette (12 CSS).

**Les trois écarts de tête** : ① la bande basse absente (BLOQUANT) ; ② l'échelle typographique
sur-dimensionnée et non uniforme (MAJEUR) ; ③ l'état des plaques non rendu — trois cartes au même
aplat, sans bordure (MAJEUR).

---

## 3. Écarts

Gravité : liste fermée `BLOQUANT` / `MAJEUR` / `MINEUR`. ASSUMÉ et ARBITRAGE sont dans des tables à
part et ne sont **pas** comptés ici. Premier tour ⇒ tous `NOUVEAU`.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | non | **La bande basse `.pl-bas` est entièrement absente** : ni filet de séparation, ni voix du lieutenant (`.pl-dit`, italique sérif), ni geste (`.pl-geste`, plaque d'or). Les **six** cadres du groupe en portent une (cinq avec un `.pl-geste`, #70 avec un `.pl-rien` terminal) ; c'est le troisième temps de la lecture et la seule affordance de l'écran. | réf #67 : bande y 1745..2085 = **340 px = 94,4 CSS = 20,6 %** du panneau, filet `2px #2c3640` à y=1745..1751, bouton `.pl-geste` y 1904..2043 bordé `#5a4a2a`. jeu : **0 px**, aucun filet, aucun bouton. Conséquence mesurée : **729 px (202,5 CSS, 35,8 % du rect libre)** de fond pur — y 1451..2100 : **0 pixel** à plus de **±1/255** de (13,13,13) (`mesures/vide.py`, contrôle positif 12 485 px sur la bande du paragraphe). | Si le geste a migré **sur les rangées** (cartes tapables), l'absence du bouton change de nature — une image ne le dit pas. L'absence de la **voix**, elle, n'est pas concernée. Je ne peux pas exclure que le vide soit le bas d'une zone **défilante**. |
| `M1` | MAJEUR | NOUVEAU | non | **Échelle typographique sur-dimensionnée et NON uniforme (+9 % à +53 %)**, alors que les boîtes sont à l'échelle : la rampe de la maquette n'est pas agrandie, elle est **réordonnée**. | titre 12,0 → **16,7 CSS (+39 %)** · sous-titre 7,0 → **10,7 (+53 %)** · libellé de section 6,6 → **8,4 (+27 %)** · titre de carte 9,0 → **9,8 (+9 %)** · sous-titre de carte 6,4 → **8,7 (+35 %)** · aparté 6,9 → **8,2 (+18 %)**. Conséquence : hauteur de carte 37,9 → **44,4 CSS (+17 %)**. Étalonnage de la sonde sur la référence : 6,63 / 7,14 / 7,65 pour 6,6 / 7,0 / 7,6 CSS (erreur ≤ 2 %). `mesures/typo.py`, `mesures/xheight.py` | Les tailles de `.pl-choix .n b/i` et `.pl-rien` ne sont opposables que par la **CSS** (cadre #68 non rendu) ; celles du titre, du sous-titre et du libellé le sont par l'**image** de #67. |
| `M2` | MAJEUR | NOUVEAU | non | **Le gris du texte secondaire est 1,70× plus lumineux** : la maquette range le corps secondaire à 5,4–5,7:1, le jeu le monte à 8,1–10,8:1 — presque au niveau du texte primaire (12,9:1). La hiérarchie primaire/secondaire s'aplatit. | `#8d99a6` → `#b8c2cc`, Δ **(+43, +41, +38)** ; contraste `.pl-choix .n i` 5,39:1 → **8,08:1** ; « Aucune affaire en cours. » et l'aparté à **10,76:1**. `mesures/contraste.py`, `mesures/jetons2.py` | — |
| `M3` | MAJEUR | NOUVEAU | oui (l'état « pris » dépend du compte) | **Les états `.pris` et `.risque` de la plaque ne sont pas rendus** : les trois cartes ont exactement le même aplat et **aucune bordure**. Dans la maquette la plaque prise est teintée vert et bordée vert, la risquée teintée ambre et bordée ambre — l'état se lit sur la plaque, pas seulement sur l'étiquette. | jeu : les 3 cartes à **(34,42,46)** identiques ; transition fond→aplat **directe** à x=57, aucune colonne de bordure (`mesures/boites.py`). CSS : `.pris` fond `#22301f` bord `#4f7f3f` ; `.risque` fond `#2e2114` bord `#8a6a22` ; base bord `#303a44`. Contrôle positif : la même sonde trouve le bord `#303a44` sur 3 px dans la référence. | Bordure et teintes d'état ne sont opposables que par la CSS (#68 non rendu) ; la **bordure de base**, elle, est prouvée par l'image de #67. |
| `M4` | MAJEUR | NOUVEAU | non | **Sérif → sans** sur le titre d'écran et sur les noms d'avocats. Le châssis de série 6 se reconnaît à son sérif sur les titres et les noms propres ; la capture n'en porte aucun dans le contenu. **Ce n'est pas un arbitrage de substitution** : `fc-match 'DejaVu Serif'` → **DejaVu Serif Book** (la maquette a bien rendu DejaVu Serif, la police que le client embarque), et le client **sait** la rendre — « Brûlant » dans le médaillon est en sérif. | CSS `.pl-tete h3` et `.pl-choix .n b` : `700 … 'DejaVu Serif'`. Référence, zoom ×3 : empattements francs sur « Lt. Tull ». Capture, zoom ×3 : « Commis d'office » **sans aucun empattement** ; « Le parloir » idem. `mesures/crop_zoom_serif.png`, `mesures/crop_titres.png`, `mesures/crop_brulant_x6.png` | Je juge la FAMILLE (sérif/sans) sur la forme des glyphes, pas la fonte exacte du client. |
| `M5` | MAJEUR | NOUVEAU | non | **Le fond du panneau est un aplat neutre `#0d0d0d`** : le dégradé vertical bleu nuit du châssis est absent, et avec lui la teinte de l'écran. | maquette (colonne de fond) : (26,31,38) → (26,30,35) → (24,28,33) → (20,24,29) → (18,22,26), dégradé continu ; jeu : **(13,13,13) invariant** de y=150 à y=2160, **une seule classe à 75,3 %** dans l'histogramme quantifié. Δ en haut **(−13, −18, −25)**, en bas **(−5, −9, −13)** — même signe, croissant vers le haut. Luminance 0,31× (haut) / 0,52× (bas). `mesures/fond.py`, `mesures/global.py` | — |
| `M6` | MAJEUR | NOUVEAU | oui (le jeton dépend de l'état de l'avocat) | **Le jeton `EN PLACE` change de famille de teinte** : vert sauge sourd → **cyan saturé**. C'est le point le plus saturé de l'écran et il passe devant les plaques dans l'ordre de lecture. | `#7fc99a` (127,201,154) → `#42e0c0` (66,224,192) ; Δ **(−61, +23, +38)**, **chroma +84** (74 → 158), luminance ×1,20. `mesures/jetons.py`, `mesures/jetons2.py` | Valeur de la maquette lue dans le style inline du cadre #68 (SOURCE), pas sur une image rendue. |
| `m1` | MINEUR | NOUVEAU | non | **La plaque d'en-tête `.pl-tete` et son filet ont disparu** : le titre et l'accroche flottent sur le même noir que le corps, sans plaque ni séparateur — l'écran perd sa césure haute. | maquette : plaque `#1a1f26` sur 173 px + filet `1px #333c46` (mesuré (51,60,70) sur 3 px à y=604..606). jeu : **aucune rupture de médiane de ligne entre y=143 et y=670** (`mesures/geometrie.py`). | — |
| `m2` | MINEUR | NOUVEAU | non | **Rayon d'arrondi des plaques : 0 au lieu de 3 CSS.** Coins vifs. | jeu : premier x d'encre **constant à 57 dès la première ligne** de la carte (y=670). maquette (`.pl-item`, rayon 2 CSS) : le bord entre sur **7 px** (y=961→968). CSS `.pl-choix{border-radius:3px}` = **10,8 px** attendus. `mesures/cartes.py` | Le rayon de `.pl-choix` (3 CSS) n'est opposable que par la CSS ; celui de `.pl-item` (2 CSS) est prouvé par l'image. |
| `m3` | MINEUR | NOUVEAU | non | **Le cadre du jeton est absent** : la maquette fait des étiquettes **encadrées** (`border:1px solid currentColor; border-radius:2px; padding:3px 5px`) ; le jeu pose du texte nu. | bbox de `EN PLACE` = (842,704)–(984,724), **21 px de haut = l'encre seule** ; un cadre ferait ≈ 45 px et laisserait deux plages horizontales dans la fenêtre balayée (y 690..740) : **aucune**. `mesures/jetons.py` | Forme lue dans la CSS (#68 non rendu). |
| `m4` | MINEUR | NOUVEAU | oui | **`À VOS RISQUES` sort du jeu de jetons de la maquette : plus JAUNE.** `#ffd240` est `accentGold` à 1/255 près, pas l'or de la série 6. | `#d9ab4e` (217,171,78) → `#ffd240` (255,210,64) ; Δ **(+38, +39, −14)**, chroma +52, luminance ×1,52. Sens : **plus jaune** (jeton), pas plus gris (désaturation). `mesures/jetons2.py` | — |
| `m5` | MINEUR | NOUVEAU | non | **`letter-spacing:1.5px` absent des libellés de section** : la maquette les compose en petites capitales très espacées (trait de châssis), le jeu en capitales ordinaires. | écarts inter-glyphes : maquette **7–9 px** (espace-mot 21) ; jeu **1–4 px** (espace-mot 14). Δ ≈ **5 px ≈ 5,4 px** = exactement le `letter-spacing` ×3,6. `mesures/carte_interne.py` | — |
| `m6` | MINEUR | NOUVEAU | non | **Deux gris de la maquette fondus en un seul** : le libellé de section et l'accroche partagent `#8a979c`, là où la maquette distingue `#7e8b98` (libellé) de `#8d99a6` (accroche). Le libellé cesse d'être plus discret que l'accroche. | libellé `#7e8b98` → `#8a979c`, Δ (+12,+12,+4) ; accroche `#8d99a6` → `#8a979c`. Les deux mesurés **identiques** dans le jeu. `mesures/contraste.py` | — |
| `m7` | MINEUR | NOUVEAU | non | **L'aparté `.pl-rien` perd son filet gauche et son retrait** : c'est un aside encadré dans la maquette (`border-left:2px solid #3b4650; padding:8px 10px`), du texte courant dans le jeu. | jeu : colonnes x=40..58 **strictement au fond** (une seule teinte), encre à partir de x=60 — **aucun filet, aucun retrait**. Contrôle positif de la sonde : elle voit le filet de 2 CSS de `.pl-bas` sur la référence. `mesures/divers.py` | Forme lue dans la CSS (#68 non rendu). |
| `m8` | MINEUR | NOUVEAU | non | **Écart entre plaques trop grand de 22 %.** | 22 px = **6,11 CSS** contre `margin-bottom:5px` (18 px). Régulier sur les deux intervalles (22 / 22), donc pas un défaut sélectif de conteneur. `mesures/carte_interne.py` | — |
| `m9` | MINEUR | NOUVEAU | non | **Losange doré EN TROP sous le médaillon** : absent du canon HUD comme des cadres de série 6. | bbox x 517..562, y 200..231 = **46×32 px**, centre à 195,5 CSS-HUD (centre d'écran 196), couleur (176,141,61) ≈ `#b08d3e`. `mesures/divers.py` | S'il s'agit d'un ornement de shell commun à tous les écrans, il sort du périmètre de ㉛ — je ne peux pas le savoir depuis une image. |
| `m10` | MINEUR | NOUVEAU | oui | **La valeur ARGENT frôle le médaillon : plus aucun budget de largeur.** ⚠️ *J'ai d'abord écrit « coupée » ; le zoom ×8 le RÉFUTE — le glyphe `€` est entier (bol, deux barres, deux terminaisons).* Ce qui reste vrai est le dégagement. | dernière encre or **x=446**, premier pixel de l'anneau **x=449** à la ligne la plus serrée ⇒ **5 px = 1,81 CSS-HUD** (min sur y=60..100 : 5 · 6 · 8 px). Un montant plus long est occulté. `mesures/argent2.py`, `mesures/crop_euro_x8.png` | Le montant lui-même (9 627 820,00 €) n'est pas vérifié : compte de capture, identité déclarée par corps de commit. |
| `m11` | MINEUR | NOUVEAU | oui | **Contradiction de lecture dans l'état vide** : « Vous n'avez encore engagé personne. » est immédiatement suivi de « Commis d'office — **EN PLACE** ». Le sens fictionnel tient (le commis est commis d'office, pas engagé), la lecture non. | deux lignes consécutives, y=536..568 puis y=704..724, séparées de **136 px**. | Aucun rapport juge-données n'existe pour cet écran : je ne sais pas d'où vient chacune des deux affirmations. |

**Compte : 1 BLOQUANT · 6 MAJEUR · 11 MINEUR.**

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| # | ce qu'on voit | pourquoi c'est assumé | rendu proprement ? | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|---|
| `A1` | Phase de l'aile droite à « — » (JOUR 50 alimenté) | doctrine du dossier : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district — état VOULU hors ① | oui : un tiret propre, aligné à droite comme la valeur du canon ; **pas** un « Unknown », pas une clé brute | un tiret sur **ARGENT** ou **JOUR** aussi ⇒ chrome non alimenté, le chrome ne se juge plus |
| `A2` | Anneau et filet du bandeau en braise (224,102,73) au lieu du laiton du canon | le canon est l'état CALME ; en BRÛLANT le témoin est la CSS `.tel.chaud`, qui met filet, valeur d'aile, `.heatpct` et boîtier en `--braise` (224,102,74) | oui : Δ **1/255** sur le jeton ; anneau et filet cohérents entre eux | une braise sur un compte **non** brûlant, ou un laiton sur un compte brûlant |
| `A3` | Le haut de l'écran ne ressemble pas au cadre de série 6 (évocation de barre à 434 px) | le cadre dessine sa propre barre à 300 CSS ; le chrome réel est à ×2,755 d'après `hud-brennar.html` — différence assumée par le dossier | oui : bandeau à **51,2 CSS-HUD** contre 51,0–52,0 au canon | un écart de bandeau **contre le canon**, pas contre le cadre |
| `A4` | Ni prévenu (`.pl-vitre`), ni compte à rebours (`.pl-jours`), ni liste `.pl-sait` | aucune affaire en cours sur ce compte : ces trois blocs n'ont pas de contenu à porter | oui : rien n'est laissé en moignon, pas de plaque vide, pas de « 0 jours » | une affaire réellement en cours **sans** ces blocs ⇒ défaut, plus un état |
| `A5` | Ronds du dock sans icône | arbitrage user connu (« j'aime pas les icônes ») | oui : ronds propres, pleine taille, non tronqués | un rond **coupé** ou déformé, qui serait un défaut de dock et non l'arbitrage |

---

## ARBITRAGES — pas corrigibles côté client

| # | destinataire | ce qui diverge | mesure |
|---|---|---|---|
| `R1` | **user** | **Le modèle d'écran a changé** : les six cadres portent un titre d'**ÉTAT** (une phrase : « Ils ont arrêté quelqu'un à vous ») ; le jeu porte un **NOM d'écran** (« Le parloir ») plus une accroche de rubrique. Ce n'est pas un défaut d'implémentation : **la maquette n'a aucun cadre d'état vide**, donc rien ne dit ce que l'écran doit montrer quand il n'y a ni affaire ni avocat. | titre jeu « Le parloir » (10 car.) vs #67 « Ils ont arrêté quelqu'un à vous » (32 car.) ; 0 des 6 cadres du groupe est un état vide |
| `R2` | **blender** | Corollaire de R1 : **il manque au groupe ㉛ un cadre « parloir vide »** (aucune affaire, aucun avocat retenu) — et, s'il doit exister, une bande basse pour cet état. Tant qu'il n'existe pas, B1 ne peut pas être jugé sur une image de référence, seulement sur la règle « les six cadres en ont une ». | 6 cadres inventoriés (#67–#72), 0 état vide |
| `R3` | **user** | **Flèche retour ← en haut à gauche** du bandeau : absente du canon HUD. Fonctionnellement légitime sur un écran atteint par un menu (le canon dépeint l'accueil, qui n'en a pas besoin) ⇒ je ne le compte pas comme un écart, mais il pousse le libellé ARGENT de ~130 px vers la droite. | ARGENT à x≈175 (jeu) contre x≈45 normalisé (canon) |
| `R4` | **user** | **Dock : « FILIÈRE » là où le canon écrit « MARCHÉ »** — renommage de la fiction, chrome partagé, hors périmètre de ㉛. | 4 libellés : EMPIRE · FAMILLE · **FILIÈRE** · PLUS |
| `R5` | **blender** | **Devise et format** : le jeu écrit « 9 627 820,00 € », la maquette « $ 24 850 ». Ruling « fr réel » : le client a raison, la maquette est en retard. Idem « CHALEUR » (jeu) vs « Heat » (maquette). | — |
| `R6` | *(note, pas un arbitrage)* | **Le bouclier « Noto ↔ DejaVu » ne s'applique PAS à cet écran.** La source demande `'DejaVu Sans'` et `'DejaVu Serif'`, et `fc-match` rend **DejaVu Sans Book** et **DejaVu Serif Book** : référence et client partagent les deux familles. Aucun écart de fonte n'est donc absorbable en arbitrage ici — c'est ce qui rend `M4` opposable. | `fc-match "DejaVu Serif"` → `DejaVuSerif.ttf: "DejaVu Serif" "Book"` |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une capture, **1080×2400**. La ligne GO le publie elle-même :
« (a) deux résolutions 1920+2400 → **NON — 2400 seulement** ». Le comportement en 1080×1920
(reflux, coupe, débordement, ordre de lecture) est donc **non vérifié**. Sur la seule résolution
fournie : rien de coupé, rien hors cadre, rien qui déborde de son parent — la plaque la plus large
(966 px) laisse 57 px à gauche et 58 px à droite, le texte le plus long (`.pl-rien`) s'arrête à
x=1019 sur 1080.

⚠️ Ce que cette capture **ne peut pas** montrer, par construction : elle est prise en
**surimpression sous le chrome** par le test de planche — le chemin joueur (Plus → LA LOI) n'est
pas exercé. L'onglet actif souligné est **EMPIRE**, ce qui n'est donc pas opposable.

---

## 6. Non vérifié

| # | ce que mon instrument ne voit pas | la mesure hors image qui trancherait |
|---|---|---|
| 1 | **1080×1920** — deuxième résolution absente | une capture 1080×1920 du même état |
| 2 | **Aucune animation** (ruling 2026-08-27) — une seule image | une paire T / T+1 s du même état ; compter les pixels qui bougent, chrome exclu |
| 3 | **Le cadre homologue #68 n'est pas rendu** : toutes les grandeurs de `.pl-choix`, `.tag`, `.pl-rien` (teintes d'état, bordures, rayon, cadre du jeton, filet gauche, tailles) sont opposées à la **CSS**, pas à une image. Le châssis partagé (`.pl-tete`, `.pl-body`, `.pl-titron`, `.pl-item`, `.pl-bas`), lui, est opposé à l'image de #67 et mes sondes y retrouvent les jetons au bit près | `Tools/rendre-tel.py ecrans-brennar-6.html 68 … 3.6` |
| 4 | **Aucun cadre d'état vide** dans la maquette : le titre, l'accroche et les deux blocs vides du jeu n'ont **aucun homologue** — je les ai jugés au SENS seulement (règle « ça plafonne et ça bloque, rien n'est perdu »), jamais au pixel | un cadre « parloir vide » à l'atelier (voir R2) |
| 5 | **Identité du compte photographié** déclarée par corps de commit, journal non joint : toutes les VALEURS (9 627 820,00 € · JOUR 50 · « Brûlant » · 3 avocats · 0 affaire) sont **non vérifiées** | la ligne `[DemoIdentityResolver] régime=env identité=…` du journal du run, jointe au dossier |
| 6 | **Les plaques d'avocat sont-elles tapables ?** Si le geste a migré sur les rangées, `B1` reste fondé sur la voix mais change de nature sur le bouton | le journal du run, ou une capture après appui |
| 7 | **L'écran défile-t-il ?** Les 729 px de vide pourraient, en théorie, être le bas d'une zone défilante partiellement remplie | une capture après un geste de défilement, ou la hauteur de contenu imprimée au run |
| 8 | **Onglet actif** : EMPIRE souligné alors que le chemin canon est Plus → LA LOI ; la capture est une **surimpression**, le chemin joueur n'est pas exercé ⇒ non opposable | une capture prise par le chemin joueur (suite `Capture…` sous shell) |
| 9 | **« filière » en gras dans l'aparté ?** La source #68 écrit `La <b>filière</b> fait classer` ; ma sonde d'épaisseur de fût n'a pas discriminé le gras du romain à cette taille | une capture à résolution supérieure, ou le rendu de #68 |
| 10 | **Position verticale du dock vs canon** : la bbox du canon est polluée par la pastille d'annotation ⑥ (le dossier le prévient) ⇒ comparaison non concluante. Idem pour l'extension VERTICALE du médaillon (pastilles ② et ④) — seuls son **diamètre d'anneau** et son **centre horizontal** sont opposables, et ils sont ÉGAUX | un canon HUD **sans** pastilles d'annotation |
| 11 | **Rect imprimé du run** non fourni (log non préservé) : la géométrie de la capture est dérivée du code par le dossier. Je l'ai vérifiée sur l'image (largeur 1080, bandeau à 51,2 CSS-HUD, médaillon centré à 195,8) mais je ne l'ai **pas lue** dans un journal | `git rev-parse HEAD` et le rect imprimés par la suite au run |
| 12 | **Espace de mélange sRGB ↔ linéaire** : je n'ai trouvé **aucune translucidité, aucun voile, aucune ombre** sur cet écran, des deux côtés (profils à 0,00/255 dès d=1) — il n'y a donc rien à opposer au piège. S'il existe un effet sous mon seuil, je ne l'ai pas vu | — (rien à mesurer tant qu'aucun effet translucide n'est posé) |
| 13 | **Positions suspectement rondes** : la marge de contenu (57 px), le pas des plaques (22 px) et l'aplat de fond exactement (13,13,13) sont réguliers, mais **rien ici ne ressemble au motif d'arrondi de `SnapToScreenPixel`** (pas de multiples d'un pas monde, pas de résidu nul suspect sur des objets libres). Je ne soupçonne donc **pas** la chaîne de capture sur cet écran — mais je ne peux pas l'exclure | les appelants de `SnapToScreenPixel` sur le chemin de cet écran |

---

## Annexes

### 1. Inventaire de la référence (cadre #67 rendu · cadre #68 en source)

**Repère** : image 1080×2102 ; `.tel` avec un liseré de 3 px (58,67,86) de chaque côté ⇒ écran utile
x 3..1076 ; évocation de barre y 3..433 ; panneau `.parl6` y **434..2085** (1651 px = **458,6 CSS**
à ×3,6 ; l'inline dit `height:462px`). Échelle du contenu **×3,6**.

| id | catégorie | parent | bbox (px) | forme | remplissage | bord | effet | texte | relations |
|---|---|---|---|---|---|---|---|---|---|
| `R.tete` | plaque d'en-tête | panneau | (3, 434)–(1076, 607) | rect | `#1a1f26` aplat | bas `1px #333c46` (mesuré 3 px, (51,60,70)) | aucun | — | 48,06 CSS de haut ; padding 11/13/9 CSS |
| `R.tete.h3` | titre | `R.tete` | x 51.. ; capitale y 479..511 | — | encre `#eef3f9` | — | aucun | « Ils ont arrêté quelqu'un à vous », **sérif** DejaVu, 700, capitale **33 px = 12,0 CSS**, 14,85:1 | 13 CSS du bord |
| `R.tete.p` | accroche | `R.tete` | x 52.. ; x-height y 548..561 | — | encre `#8d99a6` | — | aucun | « Il sait des choses… », sans, **7,14 CSS** mesuré, 5,71:1 | 4 CSS sous le titre |
| `R.vitre` | vitre (prévenu) | `R.body` | (50, 643)–(1029, 865) | rect r=3 CSS | dégradé `#222a32` → `#1b2128` | `1px #3b4650` | rayures diagonales `#ffffff09`, pas 13 CSS | — | 10 CSS sous `R.tete` |
| `R.titron` | libellé de section | `R.body` | x 51..699 ; capitale y 905..923 | — | `#7e8b98` | — | aucun | « CE QU'IL SAIT — … », capitales, **inter-glyphes 7–9 px** (letter-spacing 1,5 CSS), 4,97:1 | 11 CSS sous la vitre |
| `R.item[1..5]` | plaque de liste | `R.body` | (50, 961)–(1029, 1035) etc. | rect r=2 CSS (bord entre sur 7 px) | `#1e242b` | `1px #303a44` | aucune ombre (profil ≤ 0,5/255) | libellé `#c3ccd6` 7,65 CSS · poids `#8d99a6` | pas **89 px = 24,7 CSS** |
| `R.bas` | bande basse | panneau | (3, 1745)–(1076, 2085) | rect | `#141a21` | haut `2px #2c3640` (mesuré 7 px) | aucun | — | **épinglée en bas**, 94,4 CSS = 20,6 % du panneau |
| `R.dit` | voix | `R.bas` | x 50..1013, y 1770..1815 | — | `#cdd6e0` / `b` `#eef3f9` | — | aucun | « Lt. Rin : … », **italique sérif**, 15,69:1 | 9 CSS sous le filet |
| `R.geste` | bouton | `R.bas` | (50, 1904)–(1029, 2043) | rect r=3 CSS | `#241c11` | `1px #5a4a2a` (mesuré (90,74,42)) | aucun | « LUI TROUVER UN AVOCAT » `#d9ab4e` capitale 48 px + `small` `#9a8a6a`, 7,91:1 | 139 px de haut |
| `R68.choix[1..3]`* | plaque de choix | `R.body` | — | rect r=3 CSS | base `#1e242b` · `.pris` `#22301f` · `.risque` `#2e2114` | `1px` : `#303a44` / `#4f7f3f` / `#8a6a22` | aucun | nom **sérif** 9 CSS `#eef3f9` + ligne 6,4 CSS `#8d99a6` | margin-bottom 5 CSS |
| `R68.tag[1..3]`* | jeton | `R68.choix` | — | pilule r=2 CSS, padding 3/5 CSS | transparent | `1px solid currentColor` | aucun | `EN PLACE` `#7fc99a` · `DISPONIBLE` `#8d99a6` · `À VOS RISQUES` `#d9ab4e`, 6,6 CSS, ls 0,8 | à droite, flex none |
| `R68.rien`* | aparté | `R.body` | — | rect | transparent | **gauche `2px #3b4650`** | aucun | 6,9 CSS `#8d99a6`, `b` `#cdd6e0` | padding 8/10 CSS, margin-top 9 CSS |

\* fiches établies sur la **SOURCE** du cadre #68 (non rendu ce tour) — voir « non vérifié » n° 3.

**Couche globale (panneau `.parl6` de #67)** — palette quantifiée à 8 classes : `#1e242b` 28,3 % ·
`#13161b` 22,0 % · `#1a1f26` 12,3 % · `#141920` 11,9 % · `#161a1f` 7,4 % · `#221e18` 6,9 % ·
`#464c50` 6,5 % · `#181c21` 4,8 % — **toutes bleutées** (B > R de 6 à 13). Luminance moyenne
**34,8**, médiane 28,9. Densité d'encre **9,36 %**. Rythme vertical (frontières, en px) : 434
(panneau) · 607 (filet d'en-tête) · 643/865 (vitre) · 961→1392 (5 plaques, pas 89) · 1745 (bande
basse) · 1904/2043 (bouton). Contrastes principaux : 14,85 · 5,71 · 4,97 · 9,63 · 15,69 · 7,91.

### 2. Inventaire de la capture (1080×2400)

**Repère** : chrome à ×2,755 (bandeau y 0..143, filet braise y 141..143 ; dock à partir de y≈2184,
ronds y 2179..2305, libellés y 2320..2341) ; contenu à ×3,6 ; rect libre y **144..2178**
(2036 px = 565,6 CSS).

| id | catégorie | parent | bbox (px) | forme | remplissage | bord | effet | texte | relations |
|---|---|---|---|---|---|---|---|---|---|
| `J.retour` | flèche | bandeau | ≈ (75, 55)–(105, 75) | glyphe ← | clair | — | aucun | — | **EN TROP vs canon** (R3) |
| `J.argent` | valeur | bandeau | encre or x 179..446, y 60..100 | — | or `#d9ab4e` | — | aucun | « 9 627 820,00 € », `€` **entier** (zoom ×8) | dégagement au médaillon **5 px** (m10) |
| `J.barre` | jauge | bandeau | x 176..379, y≈115..122 | rect plein | `#d9ab4e` (217,171,77) | — | aucun | — | **74,0 CSS-HUD** ; canon : 33 CSS d'or + reste gris |
| `J.mano` | médaillon | bandeau | anneau Ø **133,2 CSS**, centre x 195,8 CSS | disque + anneau | disque sombre bleuté | anneau **braise (224,102,73)** | aucun | « Brûlant » **sérif** + « CHALEUR » | ÉGAL au canon en Ø et en centre |
| `J.jour` | aile droite | bandeau | droite, y≈25..80 | — | clair | — | aucun | « JOUR 50 » + « — » | phase à « — » = A1 |
| `J.filet` | filet | bandeau | y 141..143, pleine largeur | trait 3 px | braise (220,100,72) | — | aucun | — | **51,2 CSS-HUD** (canon 51–52) |
| `J.losange` | ornement | ? | (517, 200)–(562, 231) | losange 46×32 | `#b08d3e` | — | aucun | — | **EN TROP** (m9) |
| `J.titre` | titre | contenu | x 62..388, capitale y 294..339 | — | `#eef1f2` | — | aucun | « Le parloir », **SANS** 700, capitale **46 px = 16,7 CSS**, 17,12:1 | 150 px sous le filet ; **aucune plaque d'en-tête** (m1) |
| `J.accroche` | accroche | contenu | x 57..939, x-height y 410..430 | — | `#8a979c` | — | aucun | « Vos avocats, et ce qu'ils peuvent faire pour vous. », **10,70 CSS**, 6,47:1 | 51 px sous le titre |
| `J.lbl1` | libellé de section | contenu | x 57..280, y 487..510 | — | `#8a979c` | — | aucun | « VOS AVOCATS », capitale 23 px = **8,4 CSS**, **inter-glyphes 1–4 px** | 50 px sous l'accroche |
| `J.vide1` | état vide | contenu | x 57..671, y 536..568 | — | `#b8c2cc` | — | aucun | « Vous n'avez encore engagé personne. », **9,68 CSS**, 10,76:1 | 26 px sous le libellé |
| `J.lbl2` | libellé de section | contenu | x 59..497, y 613..645 | — | `#8a979c` | — | aucun | « QUI PEUT VOUS DÉFENDRE » | 45 px |
| `J.choix1` | plaque | contenu | (57, 670)–(1022, 829) | **rect à coins vifs** | `#222a2e` (34,42,46) | **aucun** | **aucune ombre (0,00/255 à d=1..14)** | « Commis d'office » **SANS** 9,8 CSS `#eef1f2` 12,86:1 + « gratuit — … » **8,66 CSS** `#b8c2cc` 8,08:1 | h **44,4 CSS** ; padding 10,56/10,56 CSS |
| `J.tag1` | jeton | `J.choix1` | (842, 704)–(984, 724) | **texte nu, pas de cadre** | — | **aucun** | aucun | « EN PLACE » **`#42e0c0` cyan**, 8,80:1 | 10,56 CSS du bord droit |
| `J.choix2` | plaque | contenu | (57, 851)–(1022, 1010) | idem | `#222a2e` **identique** | aucun | aucun | « Un cabinet » + « ça coûte — il connaît les juges » | 22 px sous `J.choix1` |
| `J.tag2` | jeton | `J.choix2` | (805, 885)–(984, 905) | texte nu | — | aucun | aucun | « DISPONIBLE » `#b8c2cc`, 8,08:1 | — |
| `J.choix3` | plaque | contenu | (57, 1032)–(1022, 1190) | idem | `#222a2e` **identique** | aucun | aucun | « La filière » + « ça coûte cher — et ça peut se retourner » | 22 px |
| `J.tag3` | jeton | `J.choix3` | (750, 1061)–(983, 1089) | texte nu | — | aucun | aucun | « À VOS RISQUES » **`#ffd240`**, 10,11:1 | — |
| `J.rien` | aparté | contenu | x 59..1019, y 1216..1279 | texte courant | — | **aucun filet gauche** | aucun | 2 lignes, **8,15 CSS**, `#b8c2cc`, 10,76:1 | **même marge que tout le reste** (m7) |
| `J.lbl3` | libellé de section | contenu | x 57..388, y 1329..1352 | — | `#8a979c` | — | aucun | « AFFAIRES EN COURS » | 50 px |
| `J.vide2` | état vide | contenu | x 57..449, y 1378..1403 | — | `#b8c2cc` | — | aucun | « Aucune affaire en cours. », **9,68 CSS** | 26 px |
| `J.vide3` | aide d'état vide | contenu | x 59..904, y 1429..1450 | — | `#b8c2cc` | — | aucun | « Une affaire naît d'une descente — rien sur cet écran n'en crée. », **8,15 CSS** | 26 px |
| `J.trou` | **vide** | contenu | y 1451..2178, pleine largeur | — | `#0d0d0d` **pur** | — | — | — | **729 px = 35,8 % du rect libre ; 0 pixel à ±1/255** |
| `J.dock` | dock | chrome | y ≈2184..2400 | 4 ronds + libellés | dégradé (13,14,16)→(13,18,28) | ronds cerclés bleu sombre | aucun | EMPIRE (souligné or) · FAMILLE · FILIÈRE · PLUS | **ronds vides** = A5 |

**Aucune fiche pour** : `.pl-vitre`, `.pl-jours`, `.pl-sait`, `.pl-bas` — les trois premières
légitimement (A4), la dernière est `B1`.

**Couche globale (rect libre y 144..2178)** — palette quantifiée à 8 classes : `#0d0d0d` **75,3 %** ·
`#222a2e` 20,0 % · `#c5cecb` 1,8 % · `#727679` 1,5 % · `#0d0d0e` 1,0 % · `#3b2a27` 0,2 % ·
`#191a20` 0,2 % · `#0f0d0d` 0,0 %. Luminance moyenne **23,8**, médiane **13,0**. Densité d'encre
**23,50 %** sur le rect libre (36,34 % sur la seule zone occupée). Rythme vertical (px) : 143
(filet) · 215/231 (losange) · 293/352 (titre) · 403/437 · 487/510 · 536/568 · 613/645 · 670/829 ·
851/1010 · 1032/1190 · 1216/1279 · 1329/1352 · 1378/1403 · 1429/1450 · **rien** · 2179 (dock).
Contrastes : 17,12 · 6,47 · 6,47 · 10,76 · 12,86 · 8,08 · 8,80 · 8,08 · 10,11 · 10,76.

### 3. Correspondance des repères

| | référence | capture |
|---|---|---|
| échelle du **contenu** | ×3,6 (300 CSS = 1080 px) | ×3,6 (`LargeurEcransBrennar6 = 300`) ⇒ **rapport 1,00** |
| échelle du **chrome** | *(le cadre dessine une évocation à 300 CSS — non comparable)* | ×2,755 (392 CSS-HUD = 1080 px), comparée au canon à ×3,000 |
| liseré de maquette | 3 px de chaque côté, x 3..1076 | aucun |
| origine verticale du contenu | haut du panneau **y = 434** | bas du filet du bandeau **y = 144** |
| fin verticale du contenu | bas du panneau **y = 2085** | haut du dock **y = 2179** |
| hauteur de la zone de contenu | 1651 px = **458,6 CSS** | 2036 px = **565,6 CSS** |

Règle appliquée : **aucune comparaison en px absolus**. Les grandeurs verticales sont soit des
deltas rapportés à ces deux origines, soit exprimées en CSS ; les grandeurs de chrome sont en
CSS-HUD. Toute mesure du § 3 cite cette table implicitement.

### 4. Scripts — `mesures/`

Chacun imprime la taille des images qu'il ouvre et porte son contrôle positif (et, quand l'enjeu le
mérite, son contrôle négatif) en tête de fichier.

| script | ce qu'il mesure | contrôle |
|---|---|---|
| `extraire_cadres.py` | extrait les cadres #67–#72 de la source atelier | positif : l'étiquette de #67 doit être celle annoncée par le dossier ⇒ **6/6 exactes** |
| `geometrie.py` | profils de médiane de ligne, ruptures | positif/négatif : hauteurs 2102 ≠ 2400 |
| `dock_bandeau.py` | bandes d'encre par max de ligne | positif y=142 → 224,4 ; négatif y=1600 → 13,0 |
| `marges.py`, `marges2.py` | marges latérales | positif : `.pl-body` à 13 CSS ⇒ **x0 = 51** mesuré |
| `boites.py` | bords des boîtes par transition | positif : bord `#303a44` + aplat `#1e242b` retrouvés ; négatif : rien à y=1500 |
| `cartes.py` | aplats, bords, rayons | positif : `#1e242b` / `#303a44` exacts ; négatif : le dégradé de la vitre rend deux valeurs |
| `jetons.py`, `jetons2.py` | couleurs et cadres des jetons | positif : titre de carte `#eef1f2` ; négatif : bbox nulle sur un aplat |
| `chrome.py`, `chrome2.py`, `medaillon.py` | bandeau, médaillon | positif : 392,0 CSS des deux côtés ; négatif : laiton (canon) ≠ braise (jeu) |
| `argent.py`, `argent2.py` | valeur ARGENT, barre, dégagement | positif : les chiffres sortent en or ; négatif : y=108 → 0 colonne. **`argent2.py` RÉFUTE la lecture « valeur coupée » de `argent.py`** |
| `typo.py`, `typo2.py`, `xheight.py` | hauteurs de capitale et d'x | positif : 6,63 / 7,14 / 7,65 CSS pour 6,6 / 7,0 / 7,6 (≤ 2 %) ; négatif : 0 colonne sur le fond |
| `contraste.py` | contrastes WCAG | positif : blanc/carte = 14,60:1 ; négatif : fond/fond = 1,00:1 |
| `global.py`, `fond.py` | palette, luminance, densité, dégradé | positif : `#1a1f26` et `#141a21` exacts ; le dégradé sort en 5 paliers |
| `carte_interne.py` | retraits, pas, interlettrage | positif : `.pl-item` rend une seule bande de texte ; négatif : rien entre deux cartes |
| `divers.py` | filet gauche de l'aparté, losange | positif : le filet de 2 CSS de `.pl-bas` est vu |
| `vide.py` | la zone basse est-elle vide ? | positif : 12 485 px sur la bande du paragraphe ; négatif : 0 sur deux lignes de fond. Seuils **±2 puis ±1** |
| `ombres.py` | ombre / halo autour des plaques | **portée écrite dès d = 1**, positif à d = 0 (33/255), négatif en zone vide |

Crops joints : `crop_titres.png`, `crop_cartes.png`, `crop_zoom_serif.png`, `crop_carte_i.png`,
`crop_bandeau_cap.png`, `crop_bandeau_canon.png`, `crop_dock_cap.png`, `crop_euro.png`,
`crop_euro_x8.png`, `crop_brulant_x6.png`, `crop_ref_corps.png`.
