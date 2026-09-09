# Juge visuel ⊥ — ⑰ Le commissariat (Precinct View) — r1 — 2026-09-07

## Verdict : NON APPROUVÉ

L'écran en jeu ne dit presque rien de ce que la maquette promet : la moitié basse est vide (51,5 %
du rect libre), les seuls jetons chiffrés sont **strictement vides** (8 pastilles rouges sans un
pixel d'encre à l'intérieur), et les deux seules actions de l'écran s'excusent en **langage de
serveur** — au point que « la route voisine vise les affaires internes, pas ce commissariat » est,
à la mesure de poids d'encre, **la deuxième zone la plus lourde de tout l'écran**.

---

## ⚠️ Le témoin : la référence rendue n'est PAS l'homologue de la capture

C'est le premier constat, et il commande tout le reste.

Le dossier rend comme référence nominale le **cadre #32 — « La police — le registre de dispatch »**.
Son sujet, écrit dans le commentaire de la source (`ecrans-brennar-6.html` l.1079) :
`18 × GET /v1/city/district/:id/inspection` — la file d'inspection des **18 districts**. C'est le
sujet de l'écran **⑮ inspections**, pas de ⑰.

La capture porte deux cartes : **« CE QU'ILS CROIENT »** et **« LA PATROUILLE »**. Ce sont
exactement les deux axes de données du **cadre #31 — « La police — le tableau : ce qu'ils savent »**
(l.1041) : `6 × GET /v1/city/precinct/:id/belief (DORMANT|WATCHFUL|SUSPICIOUS|HUNTING) + …/patrol`.

⇒ **L'homologue de la capture dans le groupe #31–35 est le cadre #31**, et non le #32 rendu.
Le #31 n'est **pas rendu ce tour** (le dossier l'écrit : « aucun rendu possible »). J'ai donc jugé :
- la **forme** contre les deux canons de **série 2** de `etats/` (`commissariat-canon.png`,
  `commissariat-vide.png`), homologues de SUJET, rendus, et à l'échelle exacte (×1,200 → 1080 px) ;
- la **structure** contre la **source** du #31, lue seule (aucun pixel opposable) ;
- le **chrome** contre `hud-canon-1176.png`, comme le dossier l'impose ;
- la référence #32 sert de **couche globale de série 6** (matière, palette), jamais de témoin
  partie-à-partie.

Sonde qui chiffre l'écart de génération : la matière « papier listing » (pixels clairs désaturés)
couvre **93,6 %** de la référence #32 et **0,167 %** du rect libre de la capture (`m15`). La capture
implémente la famille **série 2** ; la référence nominale est **série 6**. Quelle génération fait
foi est un **arbitrage**, pas un défaut d'implémentation — il est en table ARBITRAGE.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

18 grandeurs mesurées égales ou dans la tolérance. Sans elles, un rapport où « tout est faux »
accuserait d'abord l'instrument.

| # | grandeur | capture | témoin | écart | script |
|---|---|---|---|---|---|
| 1 | largeur d'écran | 1080 px | référence 1080 px | **0** | `m0` |
| 2 | facteur canon série 2 → capture | ×1,200 | 900 × 1,2 = 1080 | **exact** | `m10` |
| 3 | hauteur du bandeau (filet) | y=141 → 51,2 CSS-HUD | canon HUD y=153 → 51,0 | 0,2 CSS | `m9` |
| 4 | diamètre du médaillon | 184 px = 17,04 % | canon HUD 190 px = 16,16 % | 0,88 pp | `m9` |
| 5 | filet du bandeau (compte BRÛLANT) | cœur `#e06649`, y=141-142 | `--braise` (224,102,74) via `.tel.chaud` | **1/255** | `m17` |
| 6 | fidélité du jeton braise sur l'accroche *(le jeton est bien celui du projet — que ce soit le BON jeton pour ce texte est l'objet de `M6`)* | cœur `#e06649` (n=5618) | `--braise` (224,102,74) | **1/255** | `m17` |
| 7 | hauteur de capitale du titre | 36 px | canon 31 px × 1,2 = 37,2 | 3,2 % (tol. 5 %) | `m6`,`m10` |
| 8 | or de la valeur ARGENT | `#f2c96a` | jeton `hudMoneyGold` `#f2c96b` | **1/255** | `m6` |
| 9 | losange sous le médaillon | `#b08d3d` | `#b08d3e` (châssis, pivot d'aiguille) | **1/255** | `m6` |
| 10 | centres des 4 ronds du dock | 23,9 / 41,3 / 58,6 / 76,0 % | canon HUD 24,0 / 41,4 / 58,8 / 76,1 % | ≤ 0,2 pp | `m7` |
| 11 | diamètre des ronds du dock (maximum sur la colonne) | 126 px = **11,67 %** | canon HUD 138 px = **11,73 %** | **0,06 pp** | `m17` |
| 12 | jeton des libellés (ARGENT, JOUR, dock, sous-titres) | `#b9ad92` | canon série 2, surtitre `#b9ad92` | **0** | `m6`,`m10` |
| 13 | gouttière haute | 1ʳᵉ encre de contenu à y=215 | bas du bandeau y=143 | rien sous le bandeau | `m16` |
| 14 | gouttière basse | dernière encre y=1151 | haut du dock y=2220 | 1069 px de marge | `m16` |
| 15 | rien de coupé aux bords | 0 px d'encre en x 0..3 et 1076..1079 | — | **0** | `m16` |
| 16 | cadres des deux cartes | rails continus **100 %** | (contrôle du détecteur de `M1`) | — | `m5` |
| 17 | hiérarchie interne de la carte 1 | valeur/surtitre = **4,70** (bon sens) | canon accroche/surtitre = 8,61 | même sens | `m11` |
| 18 | centrage des jetons | empan 322..757, centre **539,5** | écran 1080, centre 540 | 0,5 px | `m3` |

Langue : **tout est en français**, aucune clé i18n brute, aucun repli anglais visible sur la capture.

---

## 0. L'écran, tel que la maquette le dit

*(écrit sur les références seules, avant d'ouvrir la capture)*

**But.** Savoir ce que la police a retenu de vous, et agir dessus. Le canon série 2
(« LES COMMISSARIATS ») pose la question en une phrase — *« Quatre précincts vous chassent — la
ville vous a dans le viseur »* — puis la décompose commissariat par commissariat. Le cadre série 6
homologue (#31, « ce qu'ils savent ») fait la même chose en **tableau de liège** : six fiches
punaisées, photo, identité, état, patrouilles, note manuscrite.

**Ordre de lecture (canon série 2, mesuré).**
1. le **titre or** `#f2c96b` en capitales espacées, hauteur de capitale 31 px (×1,2 = 37,2) ;
2. la **ligne d'état** juste dessous — *« JOUR 26 · 6 PRÉCINCTS · QUATRE VOUS CHASSENT »* — qui
   donne le jour, le compte et l'enjeu en une ligne ;
3. l'**accroche** du panneau de croyance, la plus lourde de l'écran (poids d'encre 105 568, soit
   **8,61×** son surtitre) — or `#f2c96b` (n=6671) mêlé de crème `#eae0c8` (n=1249) ;
4. les **jetons libellés** (`CONVICTION · EN CHASSE ×4`, `SOUPÇONNEUSE ×1`, `EN VEILLE ×1`) ;
5. la **liste des six commissariats**, chacun une plaque remplie portant un médaillon numéroté or
   `#e1bc64`, un nom, et deux jetons libellés.

**Zones.** (a) titre + ligne d'état ; (b) panneau « ce que la police croit » ; (c) inventaire des
six commissariats ; (d) — en état vide — un **cartouche à bord pointillé** unique, texte or
`#f2c96b`, qui dit *« La police n'a encore rien retenu de vous — ni conviction, ni patrouille »*.

**Traits d'identité (5).**
1. **Le sol bleu nuit avec de la matière** : `#0a0e16` à `#0c121e`, étendue 5-6 par canal (vignette),
   jamais un aplat.
2. **Des plaques posées sur ce sol, pas des fils de fer** : l'intérieur d'une carte est **+8 à
   +11 L** au-dessus du sol, et sa bordure est un chuchotement bleu-gris (`#0d1420`…`#1d2432`,
   R−B = −19 à −22, **+9 à +13 L**).
3. **Le compte est toujours écrit dans le jeton** : chaque pastille porte son libellé et son ×N.
4. **L'écran est plein** : six commissariats, un par ligne — l'inventaire *est* l'écran.
5. **Un vocabulaire entièrement in-fiction**, jusque dans le vide (« la police n'a encore rien
   retenu de vous »), jamais un mot sur le serveur.

Côté **série 6** (#31/#32), l'identité est autre et plus matérielle : liège et punaises pour #31,
**papier listing** cassé de bandes vertes pour #32 (crème `#e9e6d8` / vert `#cfe0cd`, **29
perforations** à gauche, pas 58 px, diamètre 18 px, `#c9c6b8`), typographie monospace. C'est cette
matière-là qui est absente à 0,167 % contre 93,6 % (`m15`).

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Le but reste lisible — on comprend qu'on est au commissariat et que la police vous cherche —
mais **l'écran a perdu sa substance et son ton**.

L'ordre de lecture, mesuré par poids d'encre sur des bandes de 40 px (`m16`), donne :
**1. le titre** (21 488), **2. le sous-titre de la 2ᵉ rangée d'action** (16 348), **3. l'accroche
de la carte 1** (12 540). La deuxième chose que l'œil attrape est donc *« la route voisine vise les
affaires internes, pas ce commissariat »* — une note de développeur. Au canon, la 2ᵉ place revient
à la ligne d'état, et la 3ᵉ à l'accroche ; ici la ligne d'état **n'existe pas**.

La couche globale confirme un écran vidé : luminance moyenne **17,3** contre 24,1 au canon garni
et 14,6 au canon **vide** — la capture est plus près de l'état vide que de l'état garni ; densité
d'encre **3,40 %** contre 7,00 % et 2,06 %. Le contenu s'arrête à y=1151 et **51,5 % du rect libre
reste noir**. L'inventaire des six commissariats, qui *est* l'écran au canon, n'apparaît nulle part.

La matière a disparu des deux côtés : le sol est un aplat **neutre** `#0d0d0d` (étendue **0** sur
2832 échantillons) alors que le chrome du **même** écran, lui, garde le bleu nuit `#0d121c`
(B−R = +15) ; et les quatre blocs de contenu sont des **fils de fer** — intérieur identique au sol
**au bit près** (+0 L) et bordure neutre vive `#6a6a6a`/`#777777` à **+93/+106 L**, là où le canon
pose des plaques allumées à bordure discrète. L'écran ne se lit plus comme un objet posé sur un
fond, mais comme un gabarit.

Les trois écarts de tête, par impact perçu : **(1)** les deux actions s'expliquent en langage de
serveur et pèsent plus que ce qu'elles proposent ; **(2)** les huit jetons rouges sont vides —
quatre marques identiques, deux fois, dont rien ne dit ce qu'elles comptent ; **(3)** l'inventaire
par commissariat est absent et la moitié de l'écran avec lui.

---

## 3. Écarts

Un finding par ligne. `ASSUMÉ` et `ARBITRAGE` sont en tables séparées et **ne sont pas comptés ici**.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | non | Les deux seules actions de l'écran s'excusent en **langage de serveur** : « aucune route n'existe encore » et « la route voisine vise les affaires internes, pas ce commissariat ». Défaut de SENS au sens du ruling états vides : un vide qui parle du back, pas de la fiction. Le canon dit la même absence en fiction : *« La police n'a encore rien retenu de vous — ni conviction, ni patrouille »* | poids d'encre par bande de 40 px : le sous-titre de la rangée 2 (y=1103) pèse **16 348**, 2ᵉ zone de tout l'écran derrière le titre (21 488) et devant l'accroche (12 540) — `m16`. Couleurs : sous-titres `#b9ad92`, contraste 8,75:1 — `m6` | — |
| `B2` | BLOQUANT | NOUVEAU | forme : non · le nombre 4 : oui | **8 pastilles rouges strictement vides**, 4 par carte, aucun libellé, aucun ×N. Le canon met un libellé dans chaque jeton (`CONVICTION · EN CHASSE ×4`) ; #31 met le mot « patrouilles » à côté de ses 4 témoins. Ici quatre marques identiques apparaissent deux fois et rien ne dit ce qu'elles comptent | intérieur strict (inset 6 px) des 8 pastilles : **étendue de luminance = 0** sur 979 px (carte 1) et 1068 px (carte 2), médiane `#0d0d0d` = le fond au bit près. Contrôle positif : même sonde sur un jeton libellé du canon → **étendue 110** sur 14 400 px. Contrôle négatif : fond nu → 0. Géométrie : 4 × 101×21 px, pas 112 px — `m3`,`m4` | si le libellé est **animé en fondu**, une capture à t=0 le montrerait vide sans qu'il manque : aucune paire T/T+1 n'est fournie ⇒ non tranché |
| `B3` | BLOQUANT | NOUVEAU | oui (partiellement) | L'**inventaire par commissariat** — six fiches au canon série 2, six fiches punaisées au cadre #31 — est **absent**. L'écran se réduit à deux lignes agrégées ; la moitié basse est vide | dernière encre du contenu **y=1151** ; rect libre y=143..2220 (2077 px) ⇒ **1069 px = 51,5 %** de vide continu. Densité d'encre 3,40 % contre 7,00 % (canon garni) et 2,06 % (canon vide) ; luminance moyenne 17,3 contre 24,1 / 14,6 — `m0`,`m11` | je ne sais pas si le back sait rendre les 6 commissariats : la source du #31 note elle-même « précinct = ⌈district/3⌉ (L1 : calculé 2× côté serveur, **0 route**) ». Un juge-données trancherait |
| `M1` | MAJEUR | NOUVEAU | non | Le **cadre des deux rangées d'action est rompu** : les deux rails horizontaux s'arrêtent net et le bout droit est dessiné détaché. Le contour lit « ( … ] » | rail haut et rail bas, rangées 1 **et** 2, à l'identique : segment x=61..633 (573 px) puis **TROU x=634..999 (366 px)** puis x=1000..1018 (19 px) ⇒ couverture **61,8 %**. Le trou est **symétrique haut/bas** mais **PAS central** : centre du trou 816,5 contre centre du cadre 539,5, **décalage +277 px**. Contrôle positif : les cadres des cartes 1 et 2 rendent **1 segment, 100 %** — `m5` | classe : ce n'est **pas** le motif connu (cadre pointillé, trou symétrique **et central**, bord périodique étiré par un 9-slice) — le cadre est **plein** et le trou est décentré de +29 % de la largeur ⇒ **autre cause**, non enquêtée par mandat |
| `M2` | MAJEUR | NOUVEAU | non | **Plaques remplacées par des fils de fer** : les 4 blocs de contenu n'ont aucun remplissage et portent une bordure neutre vive, là où le canon pose une plaque allumée à bordure chuchotée | intérieur − sol : capture **+0 L** (`#0d0d0d` = `#0d0d0d`, 4 blocs sur 4) ; canon **+9** (panneau), **+11** et **+8** (cartes 1 et 3). Bordure : capture `#6a6a6a` et `#777777`, **R−B = 0**, **+93 / +106 L** au-dessus du sol ; canon `#0d1420` et `#1d2432`, **R−B = −19 / −22**, **+9 / +13 L** — `m12`,`m13`,`m14` | — |
| `M3` | MAJEUR | NOUVEAU | non | **Hiérarchie aplatie, voire inversée, dans les rangées d'action** : le sous-titre (l'excuse) pèse plus que le titre (l'action) | somme de contraste sur le fond mesuré : R1 titre **9 376** contre sous-titre **14 553** ⇒ rapport **1,55** ; R2 titre 12 516 contre 31 120 ⇒ **2,49**. Contrôles du bon sens : carte 1 valeur/surtitre **4,70**, canon accroche/surtitre **8,61** — `m11` | — |
| `M4` | MAJEUR | NOUVEAU | non | **Texte hors du système de jetons** : surtitres des cartes et titres des deux rangées en gris **neutre** `#777777` (R=G=B), alors que tout le reste de l'image — ARGENT, JOUR, libellés du dock, sous-titres — tient le jeton chaud `#b9ad92`. Le canon met `#b9ad92` sur son surtitre | `#777777` : contraste sur fond **4,34:1** ; canon `#b9ad92` : **8,70:1**. Écart au jeton chaud : ΔR 66, ΔG 54, ΔB 27 — `m6`,`m10` | — |
| `M5` | MAJEUR | NOUVEAU | **non** | La **ligne d'état sous le titre** est absente. Le canon porte « JOUR 26 · 6 PRÉCINCTS · QUATRE VOUS CHASSENT » — jour, compte et enjeu en une ligne | aucune encre entre y=304 et y=346 ; l'intervalle titre→carte 1 fait **43 px**, alors que la ligne du canon occupe 69 px ×1,2 = **82,8 px** ⇒ la mise en page n'a **pas de fente** pour elle : c'est une absence de STRUCTURE, pas une ligne vide faute de données — `m1`,`m6`,`m10` | — |
| `M6` | MAJEUR | NOUVEAU | non | L'**accroche des cartes est en braise** `#e06649` là où le canon met l'or `#f2c96b` mêlé de crème `#eae0c8`. Le plus gros texte de chaque carte passe donc en couleur d'alarme | accroche capture `#e06649` (= `--braise` 224,102,74 à 1/255) sur 6749 px (carte 1) et 2978 px (carte 2) ; accroche canon : or `#f2c96b` **n=6671** et crème `#eae0c8` n=1249 — `m6`,`m11` | je ne peux pas dire depuis l'image si la braise est un **mappage de gravité** délibéré (le compte est BRÛLANT) ou une substitution de jeton. La mesure qui trancherait : la même planche sur un compte **CALME** — si l'accroche redevient or, c'est un mappage, donc un arbitrage, pas un défaut |
| `m1` | MINEUR | NOUVEAU | non | **Or du titre plus sombre** que celui du canon : même teinte, valeur plus basse | titre capture `#d9ab4d` (H 40,3°, S 0,645, V 217) contre canon `#f2c96b` (H 41,8°, S 0,558, V 242) ⇒ Δ = (25,30,30), **−10 % de valeur**. Ce n'est ni « plus jaune » ni « plus gris » : c'est **plus sombre à teinte égale** — `m6`,`m10` | — |
| `m2` | MINEUR | NOUVEAU | non | **Sol de la zone de contenu : aplat neutre** au lieu du bleu nuit avec matière. Classé MINEUR et pas MAJEUR parce qu'à L=13 la teinte est quasi invisible — mais elle est mesurable et elle contredit le chrome du même écran | capture `#0d0d0d`, **B−R = 0**, **étendue 0** par canal sur 2832 échantillons (zone 1000×800). Chrome du même écran `#0d121c`, B−R = **+15**. Canon vide `#0a0e16`, B−R = +12, **étendue 5-6** (matière). Contrôle : l'instrument discrimine (il voit varier le canon) — `m2` | — |
| `m3` | MINEUR | NOUVEAU | non | **Cartes plus étroites** que les plaques du canon | capture x=64..1015 ⇒ **88,15 %** de la largeur, marge gauche **5,93 %** ; canon carte précinct 40..860 ⇒ **91,1 %**, marge gauche **4,44 %**. Δ = 3,0 pp de largeur, 1,5 pp de marge — `m12` | — |
| `m4` | MINEUR | NOUVEAU | oui (déclenché par la longueur de la valeur) | La **valeur ARGENT bute sur le médaillon** : le « € » s'arrête à 3 px de l'anneau. Aucun glyphe n'est perdu à cette valeur, mais l'aile gauche n'a **aucune réserve** — une valeur plus longue passerait sous le médaillon | or du texte x=179..444 ; anneau braise x=448..631 ⇒ **écart +3 px = 0,28 %** de la largeur. Canon HUD : texte jusqu'à x=231, anneau à x=493 ⇒ **262 px = 22,3 %** — `m8`,`m9` | chrome partagé : je constate la géométrie, je ne dis pas où le réglage vit |
| `m5` | MINEUR | NOUVEAU | non | **Titre au singulier** : « LE COMMISSARIAT » contre « LES COMMISSARIATS » au canon. Cohérent avec `B3` (un écran qui ne porte plus l'inventaire des six) mais c'est un observable distinct | bbox titre capture (251,268,831,303), centré à 541 sur 1080 ; canon (156,64,723,94) — `m6`,`m10` | — |
| `m6` | MINEUR | NOUVEAU | non | **Un troisième rouge, hors du jeton braise** : le contour des 8 pastilles n'est pas la braise du filet ni celle de l'accroche, mais un rouge nettement plus saturé. Classé MINEUR et non MAJEUR parce que je ne l'ai **pas** vu au premier regard : il faut les deux rouges côte à côte | contour des jetons `#c5240e` (197,36,14), H 7,2°, **S 0,93** ; braise `#e06649` (224,102,74), H 11,2°, S 0,67 ⇒ Δ = (−27,−66,−60). Contrôle : le filet et l'accroche, eux, tombent à **1/255** de la braise — `m17` | — |
| `m7` | MINEUR | NOUVEAU | non | **La jauge d'argent n'a pas de piste** : seule la portion remplie est dessinée, rien ne dit sur quoi elle se remplit. Chrome **partagé** : cet écart se reproduira sur tous les écrans | capture : or `#d9ab4d` x=176..379 (204 px, épaisseur 6 px, y=118..123) puis **fond du bandeau** `#0d131a` à x=385/400/420/440. Canon HUD : or x=48..198 (151 px) **puis piste** `#5a6376` jusqu'à ≈x=270 — `m17` | — |

**Compte : 3 BLOQUANT · 6 MAJEUR · 7 MINEUR.**

---

## Table ASSUMÉ — vérifiés « rendus proprement », non comptés

| ce qu'on voit | pourquoi c'est assumé | rendu proprement ? | ce qui le ferait SORTIR de l'assumé |
|---|---|---|---|
| Phase « — » dans l'aile droite | doctrine du dossier : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district ; ARGENT et JOUR sont alimentés ⇒ état voulu hors ① | **oui** — un vrai cadratin `#eae0c8`, bbox (999,87)-(1033,89), pas de clé brute ni de « Unknown » (`m6`) | un tiret alors que ARGENT ou JOUR seraient eux aussi vides (chrome non alimenté), ou une clé i18n visible |
| Flèche retour ← dans le bandeau | arbitrage user connu (la flèche n'a pas de domicile en série 6) | oui — glyphe complet, bbox (82,66,104,78), 23×13 px, `#cfd2d3`, dans le bandeau, ne recouvre rien (`m17`) | qu'elle recouvre un libellé ou sorte du bandeau |
| Ronds du dock **sans icône** | arbitrage user connu (« j'aime pas les icônes ») | oui — 4 ronds réguliers, centres à 23,9/41,3/58,6/76,0 % (canon 24,0/41,4/58,8/76,1), diamètre 11,7 % (canon 11,5 %) — `m7` | un rond manquant, un rond hors gabarit, ou un libellé coupé |
| Filet du bandeau et anneau du médaillon en **braise** | témoin = la CSS `.tel.chaud` et non le PNG calme : sur un compte BRÛLANT, `.barre::after`, la valeur d'aile, `.heatpct` et le boîtier passent en `--braise` | oui — cœur du filet `#e06649` = braise à **1/255** ; anneau `#cc5d43` (−20/−9/−7, gradient de l'anneau) — `m17` | un filet braise sur un compte **calme**, ou un laiton sur un compte brûlant |

---

## Table ARBITRAGE — non corrigible côté client, non compté

| point | mesure | destinataire |
|---|---|---|
| **Génération de maquette.** Le client implémente la famille **série 2** (« LES COMMISSARIATS » : titre or, cartes, jetons libellés) ; la référence nominale de ce dossier est la **série 6** (#32, papier listing ; #31, tableau de liège). Aucune des deux matières série 6 n'est présente | matière « papier » : **93,6 %** de la référence #32 contre **0,167 %** du rect libre de la capture (`m15`). Le vocabulaire de la capture (« CE QU'ILS CROIENT ») suit celui du canon série 2 (« CE QUE LA POLICE CROIT »), pas celui du #31 (« CE QU'ILS SAVENT ») | **arbitrage user** — puis blender ou correcteur selon la réponse |
| **Le dossier rend le mauvais cadre** comme référence nominale de ⑰ : #32 est le sujet de ⑮ (18 districts × inspection) ; l'homologue de ⑰ est #31 (6 précincts × belief + patrol) | lecture des commentaires de source l.1041 et l.1079 ; correspondance exacte des deux cartes de la capture avec les deux axes du #31 | **orchestrateur** (défaut de dossier) |
| Dock : **« FILIÈRE »** là où le canon HUD porte **« MARCHÉ »** | libellés lus et mesurés : EMPIRE / FAMILLE / **FILIÈRE** / PLUS, tous `#b9ad92` (`m6`,`m7`) | question de chrome **déjà remontée** — notée, non comptée |
| **Polices** : la source demande `Georgia,serif` pour le sérif ⇒ la référence a été rendue en **Noto Serif**, le client embarque **DejaVu Serif**. Aucune comparaison de FAMILLE ni de chasse n'est opposable sur les éléments sérif | la hauteur de capitale, elle, se compare et **passe** : titre 36 px contre 37,2 px attendus, écart 3,2 % (tol. 5 %) — `m6`,`m10`,`m16` | arbitrage (embarquer la même police, ou consigner) |
| **Maquette en retard sur le ruling « fr réel » du 2026-09-02** — noté **une seule fois**, jamais compté : la référence affiche `$ 24 850`, `HEAT`, `tiède` ; la capture affiche `9 627 820,00 €`, `CHALEUR`, `Brûlant`. **Le client a raison** | — | **blender** (mettre la maquette à jour) |

---

## 5. Autres résolutions

**Aucune.** Une seule capture est fournie (1080×2400). La 1920 annoncée par la ligne GO est
**absente** (le dossier l'écrit : « (a) deux résolutions 1920+2400 — NON, 2400 seulement »).
⇒ Rien n'est vérifié sur le reflux, la conservation des proportions ou le débordement à une autre
résolution. En particulier, `m4` (la valeur ARGENT à 3 px du médaillon) est **le genre d'écart qui
change de signe avec la résolution** : à 1920 de haut la largeur reste 1080, donc l'écart devrait
tenir — mais je ne l'ai pas mesuré, je le déduis, et je ne le compte pas.

---

## 6. Non vérifié

1. **La seconde résolution (1920)** — absente du dossier. *Mesure qui trancherait :* une capture
   1080×1920 du même écran, même campagne.
2. **La paire T / T+1 seconde** — absente. Conséquence directe et non spéculative : je ne peux pas
   exclure que les libellés des 8 pastilles (`B2`) soient **animés en fondu** et capturés à t=0.
   *Mesure qui trancherait :* deux captures à une seconde d'intervalle. (Rappel de mandat : un pixel
   qui bouge n'est pas un écart ; ce qui se juge, c'est **où tombe l'image figée**.)
3. **Toutes les VALEURS affichées** — l'identité du compte est **déclarée par corps de commit**
   (`03efb90`, 72 118 min · 17 bâtiments · 3 lt · 2 planques · 7 cartes), **journal non joint**. Je
   n'ai donc comparé **aucune valeur** à une source : « JOUR 50 », « 9 627 820,00 € », « Brûlant »,
   « Ils vous cherchent », « Partout », le nombre **4** des pastilles — tous **non vérifiés**. Seule
   la FORME est jugée. *Mesure qui trancherait :* la ligne
   `[DemoIdentityResolver] régime=env identité=…` du journal du run, jointe au dossier.
4. **L'onglet actif.** Le dock souligne **EMPIRE** alors que le chemin joueur annoncé est
   « Plus → LE COMMISSARIAT ». Le dossier déclare l'onglet actif **non asserté** (surimpression : le
   chemin joueur n'est pas exercé) ⇒ je ne le compte pas. *Mesure qui trancherait :* une capture
   prise par le chemin joueur réel, ou l'assertion d'onglet dans le test.
5. **`B3` — le back sait-il rendre 6 commissariats ?** La source du cadre #31 note elle-même
   « précinct = ⌈district/3⌉ (L1 : calculé 2× côté serveur, **0 route**) ». L'absence de
   l'inventaire peut donc être un manque de **donnée** autant qu'un manque d'**écran**.
   *Mesure qui trancherait :* un juge-données sur les corps réels du domaine police.
6. **`M6` — la braise de l'accroche est-elle un mappage de gravité ?** *Mesure qui trancherait :*
   la même planche sur un compte **calme**.
7. **`M1` — la cause du trou de 366 px.** Je l'ai mesurée et classée (**pas** le motif 9-slice
   connu : cadre plein, trou décentré de +277 px) ; je n'ai pas le droit d'ouvrir `Assets/Scripts`
   et je ne l'ai pas fait. *Mesure qui trancherait :* la largeur native du sprite de bordure et ses
   réglages de découpe, lus hors image.
8. **Le cadre #31 lui-même** n'est pas rendu : je l'ai lu en **source**, jamais en pixels. Toute
   comparaison partie-à-partie avec lui serait une déduction. *Mesure qui trancherait :*
   `Tools/rendre-tel.py ecrans-brennar-6.html 31 … 3.6`.
9. **`m4` : le « € » est-il coupé ?** Non à cette valeur (bbox complète, 3 px de marge). Je n'ai
   pas pu vérifier ce qui arrive à une valeur plus longue — aucune autre capture.
10. **Le rect imprimé par le test** n'est pas fourni (log non préservé). La géométrie du dossier est
    **dérivée du code** ; je l'ai recoupée sur l'image (largeur 1080, bandeau à 51,2 CSS-HUD contre
    51,0 attendus) et elle tient — mais aucun rect n'a été **lu**.
11. **Aucune trace de la chaîne de capture suspecte** ici : les positions mesurées ne sont pas
    « trop rondes » (jetons à 322/434/545/657, pas 112 ; trou à 634..999). Le soupçon
    `SnapToScreenPixel` ne s'applique pas à cet écran, mais je ne peux pas le **réfuter** sans le
    log du run.

---

## Annexes

### 1. Inventaire de la référence — cadre #32 (couche globale de série 6)

| id | catégorie | bbox / grandeur | forme, remplissage, texte |
|---|---|---|---|
| `R.chrome` | bandeau (évocation, 300 CSS) | y 0..≈380 | art sombre `#0c121c` ; ARGENT `$ 24 850` or ; médaillon `tiède / HEAT` ; `JOUR 26 / Nuit` |
| `R.papier` | panneau plein-cadre | x 3..1076 = **99,4 %** de la largeur | papier listing ; crème `#e9e6d8` ; bandes vertes `#cfe0cd` alternées |
| `R.perfos` | perforations | 29 trous à gauche, **pas 58 px**, diamètre 18 px, `#c9c6b8` sur `#e9e6d8` | + une ligne de déchirure pointillée |
| `R.tete` | titre du listing | y≈420..445 | `BPD · REGISTRE DE DISPATCH` / `12H · JOUR 26`, monospace, capitales espacées |
| `R.cols` | en-tête de colonnes | y≈490..520 | `DISTRICT · N · CHARGE · REGIME · ORIGINES` |
| `R.lignes` | 18 lignes de district | y≈540..1900 | greenbar ; colonne ORIGINES avec pavés `▓` |
| `R.pied` | pied | y≈1930..1990 | `18 DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES PARTOUT À LA FOIS` |

**Couche globale (`m0`)** : luminance moyenne **175,4** ; densité d'encre **78,60 %** ; palette
`#d3e1cf` 33,7 % · `#e9e6d8` 32,0 % · `#0b1019` 19,9 % · `#999e94` 8,1 %.

### 1-bis. Inventaire du canon série 2 — homologue de sujet (`m10`, `m13`, `m14`)

| id | bbox (900×1752) | hauteur ×1,2 | couleur | note |
|---|---|---|---|---|
| `C.titre` | (156,64,723,94) | **37,2** | `#f2c96b` | contraste 12,27:1 |
| `C.etat` | (152,123,772,191) | 82,8 | `#b9ad92` | « JOUR 26 · 6 PRÉCINCTS · QUATRE VOUS CHASSENT » |
| `C.surtitre` | (79,306,486,329) | 28,8 | `#b9ad92` | « CE QUE LA POLICE CROIT » |
| `C.accroche` | (78,369,776,463) | 114,0 | or `#f2c96b` n=6671 + crème `#eae0c8` n=1249 | poids 105 568 = 8,61× le surtitre |
| `C.jetons` | y 499..551 | — | rouge, **libellés** | intérieur : étendue 110 sur 14 400 px |
| `C.carte1` | (40,685,860,839) | 186,0 | plaque **+11 L**, bordure `#0d1420` (+13 L, R−B −19) | médaillon numéroté or `#e1bc64` |
| `C.fond` | — | — | `#0a0e16`..`#0c121e`, B−R **+12/+18**, étendue 5-6 | matière |
| `V.cartouche` | (39,905,860,1072) | 201,6 | bord **pointillé**, texte `#f2c96b` | état vide : *« La police n'a encore rien retenu de vous — ni conviction, ni patrouille »* |

**Couche globale** : garni luminance 24,1 / densité 7,00 % ; vide luminance 14,6 / densité 2,06 %.

### 2. Inventaire de la capture (1080×2400)

| id | catégorie | bbox | forme / remplissage | texte |
|---|---|---|---|---|
| `P.bandeau` | chrome | y 0..142, filet braise **`#e06649`** y=141-142 | fond `#0d111b` (B−R +14) | — |
| `P.retour` | chrome | (82,66,104,78), 23×13 px | flèche ←, gris neutre `#cfd2d3` | arbitrage connu |
| `P.argent` | chrome | lib (177,27,282,45) `#b9ad92` · val (179,62,459,104) `#f2c96a` · jauge (176,**118**,379,**123**) `#d9ab4d`, épaisseur 6 px, **sans piste** | — | `ARGENT` / `9 627 820,00 €` |
| `P.medaillon` | chrome | anneau x 448..631 (Ø 184 = 17,04 %) | anneau braise (cœur `#cc5d43`, −20/−9/−7 sur la braise), disque sombre | `Brûlant` / `CHALEUR` |
| `P.jour` | chrome | (940,28,1034,48) `#b9ad92` ; phase (999,87,1033,89) `#eae0c8` | — | `JOUR 50` / `—` |
| `P.losange` | contenu | (531,215,548,231) | plein `#b08d3d` | — |
| `P.titre` | contenu | (251,268,831,303), h **36** | `#d9ab4d`, capitales espacées, centré | `LE COMMISSARIAT` |
| — | **ligne d'état** | — | **ABSENTE** | — |
| `P.c1` | carte | rails y=348 et y=587, x 64..1015 (**88,15 %**) | **creuse** (+0 L), bordure `#6a6a6a` (+93 L, R−B 0) | — |
| `P.c1.sur` | texte | (380,387,701,410) h 24 | `#777777`, **4,34:1** | `CE QU'ILS CROIENT` |
| `P.c1.val` | texte | (275,445,807,489) h **45** | `#e06649` | `Ils vous cherchent` |
| `P.c1.jetons` | jetons | 4 × 101×21, x 322/434/545/657, y 524..544 | contour `#c5240e`, **intérieur vide (étendue 0)** | **aucun** |
| `P.c2` | carte | rails y=622 et y=861, mêmes x | idem `P.c1` | — |
| `P.c2.sur` | texte | (417,661,663,681) h 21 | `#777777` | `LA PATROUILLE` |
| `P.c2.val` | texte | (435,721,647,763) h **43** | `#e06649` | `Partout` |
| `P.c2.jetons` | jetons | 4 × 101×21, y 798..819 | idem — **vides** | **aucun** |
| `P.r1` | rangée | rails y=895 et y=1006 ; **trou x 634..999** | creuse, bordure `#777777` (+106 L) | — |
| `P.r1.t` | texte | (353,921,729,952) h 32 | `#777777`, 4,34:1, poids 9 376 | `Recruter un greffier` |
| `P.r1.s` | texte | (362,962,717,980) h 19 | `#b9ad92`, 8,75:1, poids **14 553** | `aucune route n'existe encore` |
| `P.r2` | rangée | rails y=1039 et y=1151 ; **même trou** | idem | — |
| `P.r2.t` | texte | (287,1066,792,1097) h 32 | `#777777`, poids 12 516 | `Acheter un renseignement` |
| `P.r2.s` | texte | (161,1106,920,1129) h 24 | `#b9ad92`, poids **31 120** | `la route voisine vise les affaires internes, pas ce commissariat` |
| `P.vide` | — | y 1152..2220 | `#0d0d0d`, étendue 0 | **51,5 % du rect libre** |
| `P.dock` | chrome | ronds **y 2179..2305, Ø 127 px**, centres 23,9/41,3/58,6/76,0 % ; libellés y 2320..2341 `#b9ad92` | ronds bleu nuit **sans icône** ; soulignement or sous EMPIRE | `EMPIRE · FAMILLE · FILIÈRE · PLUS` |

**Couche globale (`m0`)** : luminance moyenne **17,3** ; densité d'encre **3,40 %** ;
palette `#0d0d0d` **72,56 %** · `#0d0d15` 12,2 % · `#231f22` 9,8 % · `#0a0b0b` 3,8 %.

### 3. Correspondance des repères

| | px | CSS | facteur | source |
|---|---|---|---|---|
| Contenu — référence #32 | 1080 | 300 | ×3,6 | dossier |
| Contenu — capture | 1080 | 300 | ×3,6 | dossier |
| ⇒ rapport contenu capture ÷ référence | | | **1,00** | tout écart de taille est réel |
| Canon série 2 → capture | 900 → 1080 | 300 | **×1,200** | vérifié : 900 × 1,2 = 1080 (`m10`) |
| Chrome — canon HUD | 1176 | 392 | ×3,0 | dossier |
| Chrome — capture | 1080 | 392 | ×2,755 | dossier ; **recoupé** : filet à y=141 ⇒ 51,2 CSS-HUD contre 51,0 au canon (`m9`) |

Toutes les grandeurs du §3 sont exprimées en px **et** en % de la largeur d'écran ; aucune
comparaison en px bruts n'a été faite entre deux échelles différentes.

### 4. Scripts — `mesures/*.py`

| script | grandeur | sortie clé |
|---|---|---|
| `commun.py` | helpers (médiane de fenêtre, luminance WCAG, palette quantifiée, bbox d'encre, profils) | chaque script imprime la taille des images ouvertes |
| `m0_couche_globale.py` | tailles, palettes, luminance, densité | capture 17,3 / 3,40 % · canon 24,1 / 7,00 % · vide 14,6 / 2,06 % · réf 175,4 / 78,60 % |
| `m1_geometrie_capture.py` | bandes de contenu, filet, fond | 9 bandes ; filet `#d86347` y=141 ; fond `#0d0d0d` partout |
| `m2_fond_matiere.py` | aplat contre matière | capture étendue **0**, B−R 0 ; canon vide étendue 5-6, B−R +12 ; chrome capture B−R +15 |
| `m3_pastilles.py` | jetons rouges : compte, géométrie, encre intérieure | 4+4 jetons 101×21 ; contrôle positif canon 1463 px d'encre ; contrôle négatif 0 |
| `m4_pastilles_interieur.py` | étendue de luminance intérieure | **0** sur les 8 ; canon **110** ; fond nu 0 |
| `m5_cadres_rangees.py` | continuité des rails | rangées **61,8 %**, trou 366 px décalé +277 px ; cartes **100 %** |
| `m6_textes.py` | bbox, hauteur de capitale, couleur, contraste | table complète (annexe 2) |
| `m7_chrome.py` | médaillon, dock, échelle | 4 ronds, centres à 0,2 pp du canon |
| `m8_argent_medaillon.py` | collision ARGENT / médaillon | +3 px contre +262 px au canon |
| `m9_medaillon_taille.py` | diamètre sur ligne centrale, filet | 17,04 % contre 16,16 % ; filet 51,2 contre 51,0 CSS-HUD |
| `m10_canon2_inventaire.py` | inventaire du canon série 2 ramené ×1,2 | annexe 1-bis |
| `m11_hierarchie_vide.py` | poids d'encre, part de vide | rapports 1,55 / 2,49 / 4,70 / 8,61 ; vide **51,5 %** |
| `m12_bordures_marges.py` | couleurs de bordure, marges, rayons | capture `#6a6a6a`/`#777777` R−B 0 ; largeur 88,15 % |
| `m13_bordures_canon.py` | bordures du canon par contraste local | `#1d2432` / `#0d1420`, R−B −19/−22 |
| `m14_plaque_remplissage.py` | remplissage des plaques | canon +8/+11 L ; capture **+0 L** |
| `m15_reference_serie6.py` | matière papier, perforations | **93,6 %** contre **0,167 %** ; 29 perfos, pas 58 px |
| `m16_lecture_gouttiere.py` | ordre de lecture, gouttière, bords | 2ᵉ zone la plus lourde = le sous-titre de R2 (16 348) |
| `m17_verifs.py` | flèche retour, jauge et sa piste, ronds du dock, **cœurs** de rouge | filet et accroche = braise à 1/255 ; jetons `#c5240e` ; jauge sans piste |

Sorties collées : chaque script est ré-exécutable tel quel depuis `mesures/`
(`cd mesures && python3 mXX_….py`) ; tous portent un contrôle positif, plusieurs un contrôle négatif.
