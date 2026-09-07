# Juge visuel ⊥ — ⑭ La semaine (Compression Week Board) — r1 — 2026-09-07

## Verdict : NON APPROUVÉ

Le corps de l'écran n'existe pas : sous une phrase **coupée au bord gauche** et un sous-titre en
**anglais brut (« Calm · None »)**, **1 650 px sur 1 080 — 81 % du rect libre — ne contiennent pas
un seul pixel différent de (13,13,13)**, mesuré jusqu'au seuil 1/255, là où le témoin d'état le
plus vide de la maquette porte encore une plaque, deux jetons et une boîte d'état vide.

---

## Choix du témoin — obligatoire avant toute mesure

La capture affiche `Calm · None` et « aucune semaine de compression en cours ». Ce n'est **pas**
l'état de la référence rendue (`reference-1080x2102.png` = cadre **#25**, `{mounting, warning,
deferral_available:true}` — manomètre à la hausse, tampon « OUVRIR LA SEMAINE », filet « Reporter »).

Deux témoins homologues, concordants, tous deux fournis dans `etats/` :

| témoin | pourquoi c'est l'homologue |
|---|---|
| `etats/v4-29.png` (série 4) | la source `ecrans-brennar-4.html` l'annote **`<!-- 29 : state {calm, none, false} -->`** — les deux énumérés de la capture, mot pour mot |
| `etats/ecran-canon-vide.png` (série 2) | l'image porte **« JOUR 1 · TENSION CALME · AUCUNE SEMAINE »** — même écran (« LA COMPRESSION »), même état |

**Toutes les mesures d'écart de ce rapport sont prises contre ces deux témoins**, jamais contre #25.
La référence #25 est utilisée uniquement comme contrôle de couche globale (annexe 1).
⚠️ Le verdict ne dépend pas de ce choix : B1, B2 et B3 tombent aussi contre #25.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport n'est pas recevable. 17 grandeurs, toutes produites par un script de
`mesures/`, toutes dans la tolérance.

| # | grandeur | mesuré | attendu | écart | script |
|---|---|---|---|---|---|
| 1 | largeur de la capture | 1080×2400 | cible portrait 20:9 du dossier | 0 | `01` |
| 2 | bas du bandeau (dernière ligne bleutée) | y = 140 | 52 CSS-HUD × 2,7551 = **143,3 px** (dérivé du dossier) | −3 px | `10` |
| 3 | filet du bandeau, cœur | (218,100,71) | `--braise #e0664a` (224,102,74), variante `.chaud` | max 6/255 | `02`,`07` |
| 4 | losange | cœur (176,141,61) | `hudHairlineGold #b08d3e` (176,141,62) | **1/255** | `09` |
| 5 | titre « LA SEMAINE », cœur | (217,171,77) | `--or #d9ab4e` (217,171,78) — un jeton réel, pas une couleur libre | **1/255** | `09` |
| 6 | sous-titre, cœur | (185,173,146) | `--creme-2 #b9ad92` | **0/255** | `09` |
| 7 | ligne de lecture, cœur | (185,173,146) | `--creme-2 #b9ad92` | **0/255** | `09` |
| 8 | fond de contenu | (13,13,13) | `surfaceBase #0d0f10` (13,15,16) | 3/255 | `09` |
| 9 | hauteur de capitale du titre | 9,72 CSS | 10,00 CSS (canon série 2) | **−2,8 %** (tol. 5 %) | `08` |
| 10 | pas par caractère de la ligne de lecture | 6,100 CSS/car. | 6,222 (v4-29) | **−2,0 %** (tol. 10 %) ⇒ **le corps est celui de la maquette** | `13` |
| 11 | centrage du titre | marges 97,8 / 98,1 CSS | symétrique | 0,3 CSS | `12` |
| 12 | centrage du sous-titre | 124,4 / 124,4 CSS | symétrique | **0,0 CSS** | `12` |
| 13 | gouttière | médaillon du chrome jusqu'à y=203, 1er contenu à y=215 | aucun chevauchement | +12 px de dégagement ; **rien sous le bandeau, rien sous le dock** | `10` |
| 14 | contrastes | titre 9,15:1 · sous-titre 8,75:1 · ligne 8,75:1 | ≥ 3:1 grands / ≥ 4,5:1 petits | tous au-dessus | `10` |
| 15 | aiguille du médaillon (précédent « aiguille inversée ») | arc cyan à GAUCHE (x̄=515), arc braise à DROITE (x̄=551), bout de l'aiguille à DROITE (x̄=543), libellé « Brûlant » | l'aiguille du côté chaud | **côté correct** | `15` |
| 16 | langue du dock | EMPIRE / FAMILLE / FILIÈRE / PLUS | français, accents | aucun repli anglais | crop `crop_dock_libelles.png` |
| 17 | langue de la ligne de lecture | « Au calme — aucune semaine de compression en cours » | français, aucune clé i18n brute | conforme | crop |

---

## 0. L'écran, tel que la maquette le dit

**But.** C'est le baromètre du joueur : *où en est la pression, et qu'est-ce qui va m'être demandé
cette semaine.* Dans l'état « au calme », son travail est de **rassurer sans désengager** : dire que
rien ne presse, **et** expliquer ce qui fera monter la tension jusqu'à ouvrir la semaine.

**Ordre de lecture.** (1) le **manomètre TENSION** — un objet de laiton de 196×124 CSS, plein cadre,
avec sa plaque gravée et son aiguille : c'est l'élément héros, on le voit avant de lire quoi que ce
soit (série 4) ; en série 2 la même place est tenue par le **titre + la sur-ligne d'état**. (2) la
**phrase de lecture en or** (« Calme — vos affaires respirent ») qui traduit l'aiguille en français.
(3) la **plaque** : un petit kicker, un titre en or (« Rien ne presse — aucune semaine en vue »), et
un corps qui explique le mécanisme (« la tension monte quand les problèmes s'accumulent… et la
semaine s'ouvre »). (4) en série 2, **deux jetons d'état** (`TENSION · CALME`, `SEMAINE · AUCUNE`) et
une **boîte pointillée** qui nomme ce qui est absent.

**Zones.** chrome partagé (bandeau, dock) · instrument · phrase de lecture · plaque explicative ·
(série 2) jetons + boîte d'état vide · décor de district (série 4 seulement).

**Traits d'identité.** (a) le **laiton et l'or** — l'écran est un instrument de mesure, pas une liste ;
(b) le **manomètre** lui-même, qu'aucun autre écran ne porte ; (c) la **plaque de texte** qui explique
toujours l'état, même vide ; (d) le **bleu nuit** du fond, jamais le noir ; (e) la phrase de lecture
en **or**, une ligne, qui donne le ton avant tout chiffre.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Un joueur voit, dans l'ordre : le bandeau (correct, brûlant), **« LA SEMAINE »** en or — l'écran
s'annonce bien —, puis **« Calm · None »**, deux mots d'anglais qui sont les valeurs brutes du
serveur, puis une phrase beige **dont la première lettre est coupée par le bord de l'écran**, puis
**rien**. 1 650 px de noir parfaitement uniforme jusqu'au dock : au seuil 1/255, la sonde n'y trouve
**pas un pixel** qui diffère de (13,13,13), alors qu'elle voit sans peine la plaque du dock
(88 794 px) et le texte (4 311 px). Ce n'est pas « un écran calme », c'est un écran **inachevé**.

Les trois traits d'identité qui font *cet* écran ont disparu : le manomètre (héros de la série 4),
la plaque explicative (présente dans les **deux** témoins, y compris à l'état vide, parce que son
texte est de la copie fixe et non de la donnée), et l'or de la phrase de lecture — remplacé par le
crème secondaire, si bien que **plus rien ne porte l'œil** une fois le titre lu. Le fond a aussi
perdu son bleu : le bandeau du shell est (13,16,27) et le dock (13,18,28), mais la zone de contenu
retombe à (13,13,13) — le bleu nuit s'arrête net au filet.

Sur la couche globale : la capture rend **0,77 %** d'encre et **146 teintes** dans sa zone de
contenu, contre **4,80 % / 598 teintes** pour le témoin d'état le plus dépouillé et **10,80 % / 678**
pour l'homologue de série 4. Le vide terminal — la distance entre la dernière encre et le dock —
vaut **82,2 %** du rect libre, contre **26,3 %** (canon vide), **0,5 %** (v4-29) et **0,3 %** (#25) :
la sonde n'est pas uniforme, elle sépare bien quatre témoins, et la capture est **3,1× au-delà** du
plus vide d'entre eux.

Les trois écarts de tête, par impact perçu : **(1)** le corps de l'écran est absent ; **(2)** le seul
texte de contenu est coupé au bord ; **(3)** l'état est annoncé au joueur en anglais brut.

---

## 3. Écarts

Format imposé par `dossier.md`. `ASSUMÉ` et `ARBITRAGE` sont dans des tables à part et **ne sont pas
comptés** avec les findings. `dépend des données` = l'écart changerait si le compte photographié
changeait.

| id | gravité | critère | dépend des données | destinataire | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|---|
| `B1` | **BLOQUANT** | NOUVEAU | non | correcteur | **Le corps de l'écran est absent.** La plaque (kicker + titre + corps explicatif), les deux jetons d'état et la boîte d'état vide pointillée du témoin d'état — plus le manomètre `.instrument` de la série 4 — n'existent nulle part sur la capture. | témoin d'état `ecran-canon-vide` : plaque **274×155 CSS**, jetons **274×27 CSS**, boîte d'état vide **274×39 CSS** · v4-29 : `.instrument` **196×124 CSS** (CSS déclarée 196×118), plaque **289×117 CSS**. Capture : bandes y 520-900, 900-1400, 1400-2170 → **AUCUNE encre**. Balayage descendant jusqu'à **1/255** : **0 px** différent de (13,13,13) sur y 520..2169, soit **1 650×1 080 px = 68,8 % de l'écran**, échantillon 7×7 = une seule couleur. Contrôles : la même sonde voit la plaque du dock (88 794 px) et le texte (4 311 px). Vide terminal **82,2 %** vs 26,3 / 0,5 / 0,3 % pour les trois témoins. (`14`, `16`, `11`) | la CAUSE : je ne peux pas dire depuis l'image si le client ne compose pas la plaque ou si le back ne renvoie rien. La maquette la montre **même à l'état vide** (copie fixe, pas de donnée) ⇒ la classe est la composition. Trancherait : le corps réel de `GET /v1/compression/state` sur ce compte. |
| `B2` | **BLOQUANT** | NOUVEAU | non | correcteur | **La ligne de lecture est coupée au bord gauche.** Le « A » de « Au » n'a plus que son apex et sa jambe droite ; la ligne court d'un bord à l'autre sans aucune marge. | encre **x = 0..1075 = 99,6 % de la largeur** ; marge gauche **0,0 CSS**, marge droite **1,1 CSS**, là où la CSS de `.jetons-lib.lecture` déclare **`padding: 0 14px`** (14 CSS de chaque côté) et où le canon série 2 pose **7,7 CSS** de gouttière sur *tous* ses blocs. La colonne x=0 porte **6 px à la couleur de CŒUR** (185,173,146 ± 6) sur la bande y472..509 : une frange d'anti-crénelage n'a pas la couleur de cœur ⇒ **glyphe coupé**, pas bord légitime. Contrôles : le titre rend 97,8/98,1 CSS de marge, le filet du bandeau rend 0/0. (`03`, `12`, `13`, crop `crop_A_ampute.png`) | **de combien** le glyphe est amputé : non mesurable depuis l'image (la partie manquante n'y est pas). Trancherait : rendre la même chaîne en DejaVu Serif à 8,33 CSS de capitale et comparer la largeur totale à 300 CSS. |
| `B3` | **BLOQUANT** | NOUVEAU | **oui** (les deux mots sont les valeurs de l'état courant) | correcteur | **Deux énumérés bruts en anglais sont affichés au joueur** : « Calm · None » (= `stress_bucket=calm`, `week_state=none`), à la place exacte où le canon écrit **« JOUR 1 · TENSION CALME · AUCUNE SEMAINE »**. C'est la 3ᵉ chose que l'œil rencontre. | capture : bloc **51×7 CSS** à (448,348)-(631,371), `--creme-2` · canon : sur-ligne **228×25 CSS** à (45,118)-(727,191), française, structurée, l'état en gras. Doctrine du dossier : « aucun enum brut, aucun repli anglais ne doit atteindre l'écran » (bundle i18n `fr`, 674 clés). (`09`, `14`) | — |
| `B4` | **BLOQUANT** | NOUVEAU | non | correcteur | **Le SENS de l'état vide n'est pas rendu.** La capture énonce le fait (« aucune semaine de compression en cours ») et s'arrête : elle ne dit pas que **rien n'est perdu**, ni **ce qui fait monter la tension**, ni **ce qui ouvrira une semaine**. Posée seule au-dessus de 466 CSS de noir, elle se lit comme un écran cassé, pas comme un répit. | le témoin d'état porte les trois : un titre rassurant (« Rien ne presse — vos affaires respirent »), un corps mécanique (« La tension monte quand les problèmes s'accumulent sans réponse ; **montante**, puis **écrasante** — et la semaine s'ouvre »), et une boîte qui **nomme** l'absence. v4-29 idem (plaque **289×117 CSS**). Capture : **1 ligne**, 299×11 CSS, puis 82,2 % de vide. Règle user du 07/09 00:40 : un vide qui se lit comme un écran cassé est un défaut de SENS, **BLOQUANT si c'est la première lecture** — ici le vide EST la première lecture. (`11`, `14`) | *note : B1 et B4 partagent une cause (la plaque manque) mais pas un correctif — poser la plaque sans en reprendre la copie fermerait B1 et laisserait B4 ouvert.* |
| `M1` | **MAJEUR** | NOUVEAU | non | correcteur | **La ligne de lecture est en `--creme-2` là où la maquette déclare `--or-vif`** : la seule phrase de contenu de l'écran porte l'encre *secondaire*, la même que le sous-titre — plus rien ne porte l'œil après le titre. | cœur mesuré **(185,173,146) = `--creme-2 #b9ad92`, écart 0/255**. CSS de `.jetons-lib.lecture` (série 4) : **`color: var(--or-vif)`** = `#f2c96b`. Canon série 2, même rôle (titre de plaque) : cœur **(242,201,107) = `--or-vif`, écart 0/255**. Δ = **(−57,−28,+39)**, changement de famille or → parchemin. Contrôle positif de la sonde : le titre du canon tombe sur `--or-vif` à 0/255. (`09`) | si le crème vient d'un jeton *choisi* ou d'un or *voilé* : le cœur tombant **exactement** sur `#b9ad92` (0/255) plaide pour un jeton choisi ; un voile donnerait une valeur intermédiaire. Non tranché à 100 %. |
| `m1` | MINEUR | NOUVEAU | non | correcteur | Le titre d'écran est en **`--or`** là où le canon met **`--or-vif`** — même famille, un cran plus terne. | cœur **(217,171,77)** = `--or #d9ab4e` (1/255) vs canon **(242,201,107)** = `--or-vif #f2c96b` (0/255). Δ max **30/255** (tol. 6). (`09`) | — |
| `m2` | MINEUR | NOUVEAU | non | correcteur | **Hauteur de capitale de la ligne de lecture 13,8 % trop courte**, alors que le corps nominal est le bon. | capitale : **8,33 CSS** (capture) vs **9,67** (v4-29, −13,8 %) et **10,67** (canon série 2, −21,9 %) — au-delà de la tolérance de 5 %. Mais le **pas par caractère** vaut 6,100 vs 6,222 CSS/car. (**−2,0 %**, sous la tolérance) : le corps nominal est celui de la maquette. Contrôle : la même sonde rend 10,417 CSS/car. sur le titre ⇒ elle discrimine deux corps. (`08`, `13`) | classe de cause : substitution de police (la référence a rendu **Noto Serif**, le client embarque **DejaVu Serif** — rapports capitale/chasse différents à corps nominal égal). Le correctif est d'aligner la **capitale**, pas le corps. Voir `A1`. |
| `m3` | MINEUR | NOUVEAU | non | correcteur | **Le fond de la zone de contenu a perdu le bleu nuit** : il est neutre (R=G=B) alors que le chrome du même écran, 8 px plus haut, est bleuté. | contenu **(13,13,13)**, B−R = **0** en cinq points indépendants (y 400 / 700 / 1200 / 1800 / 2100) ⇒ `surfaceBase #0d0f10` (écart 3/255). Témoins : canon série 2 **(10,14,22)**, B−R = **+12** en quatre points ; v4-29 **+19 à +38**. Contrôle positif **interne** : le bandeau de la capture elle-même rend (13,16,27), B−R = **+14**, et sa plaque de dock (13,18,28), B−R = **+15**. Δ sur le canal bleu : **−9/255** (tol. 6). (`04`, `05`) | — |
| `m4` | MINEUR | NOUVEAU | **oui** (dépend de la longueur du solde) | correcteur (shell) | Dans le bandeau, la valeur ARGENT arrive **à 3 px** de l'anneau du médaillon : pas de recouvrement, mais aucun dégagement. | dernier pixel **or** de la valeur x=**446** ; premier pixel **braise** de l'anneau x=**449** ⇒ **gouttière de 3 px = 1,1 CSS-HUD**. Sonde discriminante (or : G≈171 ; braise : G≈102) — **contrôle négatif : 0 colonne** de braise dans le libellé « ARGENT ». (`07`) | ⚠️ **trois versions antérieures de cet instrument (`06` v2–v4) ont rendu des résultats UNIFORMES** (+139, +178,8/+178,6, +20,8/+19,5 px des deux côtés) : elles mesuraient la fenêtre de balayage, pas l'objet. Seule la version par la COULEUR, avec contrôle négatif, discrimine. Le canon HUD ne peut pas servir de contrôle positif chiffré ici (son solde est court : « $ 24 850 »). |

**Compte : 4 BLOQUANT · 1 MAJEUR · 4 MINEUR.**

> **Contrôle d'unicité de la citation CSS de `M1` et `B2`** (`mesures/17_unicite_regle_css.sh`, sortie
> jointe). `ecrans-brennar-4.html` porte **trois** blocs `<style>` (15 082 + 358 369 + 148 061 octets) :
> une seconde définition plus bas écraserait la première et rendrait ma citation fausse. Comptes pris
> dans un `$( )` (la couche d'affichage du proxy fausse tout compte lu au terminal) :
> `.jetons-lib.lecture{` → **1** · `.lecture{` → **1** (le même corps : les deux motifs matchent le
> même texte) · aucune autre règle finissant par `.lecture`. Contrôle positif du motif :
> `font-family:Georgia,serif` → **48**, donc l'outillage ne rend pas zéro pour la mauvaise raison.
> ⇒ `color: var(--or-vif)` et `padding: 0 14px` sont les **seules** déclarations de cette classe :
> `M1` et `B2` s'appuient sur un fait **compté**, plus sur une lecture unique.

---

### Table à part — ASSUMÉ (non compté ; vérifié « rendu proprement »)

| id | ce qu'on voit | pourquoi | rendu proprement ? |
|---|---|---|---|
| `S1` | Aile droite du bandeau : « JOUR 50 » alimenté, **phase = « — »** | doctrine du dossier : la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district — état VOULU hors ① | oui : le tiret est un vrai tiret, pas un libellé de repli ni « Unknown » |
| `S2` | Filet du bandeau et anneau du médaillon en **braise**, pas en laiton | le médaillon dit « Brûlant » ⇒ le témoin est la CSS `.chaud` (4 règles en `--braise`), pas le PNG calme `hud-canon-1176.png` | oui : cœur (218,100,71) vs `--braise` (224,102,74), écart max **6/255** ; et l'aiguille est du **bon côté** (contrôle 15) |
| `S3` | Bandeau (143 px) et dock (65,3 CSS-HUD) d'une autre échelle que le cadre de série 4 | chrome partagé du shell, `AppShell.Px = css × 1280/392` ⇒ ×2,755, contre ×3,6 pour le contenu | oui : le bas du bandeau tombe à **140 px** pour **143,3 dérivé** |
| `S4` | Le chrome EST alimenté (solde, jour, médaillon) | ⇒ l'exception « chrome non alimenté » ne s'applique pas : le chrome **se juge**, et il passe (contrôles 2, 3, 4, 15) | — |

### Table à part — ARBITRAGE (non compté)

| id | ce qui diverge | qui tranche | note |
|---|---|---|---|
| `A1` | **Police sérif** : `ecrans-brennar-4.html` demande `Georgia,serif` (**48 règles**, + 1 `Georgia,"Times New Roman",serif`) ; `fc-match Georgia` sur la machine de rendu → **Noto Serif** ; le client embarque **DejaVu Serif**. Georgia n'a jamais été montrée à personne. | arbitrage (embarquer la même police, ou accepter) | la **famille** et la **chasse** ne sont pas opposables. Mesuré : pas du titre **10,4 CSS/car.** (client) vs **14,1** (canon) sur des textes différents — non concluant, non retenu comme écart. La **capitale**, elle, se compare : voir `m2`. |
| `A2` | Titre d'écran **« LA SEMAINE »** vs canon série 2 **« LA COMPRESSION »** | user | deux noms pour le même écran ; `front.md` écrit « La semaine (Compression Week Board) » |
| `A3` | Les 4 ronds du dock sont **vides** (aucune icône) ; le canon HUD pose une icône 20×20 | user — arbitrage connu (« j'aime pas les icônes ») | jamais un écart d'écran |
| `A4` | **Flèche retour** dans le bandeau | user — arbitrage connu (la flèche n'a pas de domicile en série 6) | — |
| `A5` | **Décor de district absent** : la capture pose un aplat, le cadre de **série 4** peint la ville, le canon de **série 2** ne peint rien | user / DA | les deux maquettes du même écran divergent ; **le client suit la série 2** ⇒ je ne le compte pas comme écart. Mesuré : contenu de la capture à **146 teintes** vs 678 (v4-29, décor) et 598 (canon série 2, sans décor) — l'écart de richesse vient de `B1`, pas du décor. |
| `A6` | Format monétaire **« 9 627 820,00 € »** vs maquette « $ 24 850 » | user | le client a raison sur la langue (ruling « fr réel ») ; les **deux décimales** sur un solde à 9 chiffres sont un choix, et c'est ce qui produit `m4` |
| `A7` | La **référence** écrit « HEAT » sous le médaillon ; le client écrit « CHALEUR » | blender | **maquette à mettre à jour**, jamais un écart d'écran — noté une fois |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit que `capture-1080x2400.png`. La ligne GO le publie elle-même :
« (a) deux résolutions 1920+2400 → **NON — 2400 seulement** ». La 1920 est **absente**, pas
défaillante. Rien n'est donc établi sur le reflux, la coupe ou le débordement à une autre
résolution — voir §6.

Ce qui est vérifié **à 1080×2400** : rien n'est coupé en haut ni en bas (le contenu tient entre
y=215 et y=509, le bandeau finit à 140, le dock commence à 2179), rien ne déborde de son parent
verticalement, aucune barre de défilement — **mais** `B2` est précisément un débordement
**horizontal** à cette résolution même.

---

## 6. Non vérifié

1. **La seconde résolution (1080×1920).** Absente du dossier. `B2` (ligne coupée) est un défaut de
   largeur : à 1920 la largeur est la même (1080), donc il persisterait à l'identique — mais le
   **reflux vertical** et la position du contenu face au dock ne sont pas mesurés.
   *Trancherait :* une capture `1080x1920` prise par la même chaîne.
2. **Animation / mouvement.** Une seule capture, aucune paire T / T+1 s (« (b) → NON »). Je ne peux
   ni constater ni exclure un mouvement. *(Rappel : le ruling « un nouvel écran est SANS animation »
   est périmé depuis le 27/08 au soir — un mouvement ne serait de toute façon pas un écart.)*
   *Trancherait :* deux captures du même état à 1 s d'intervalle, comptage des pixels différents.
3. **Toutes les VALEURS affichées.** L'identité du compte est **déclarée par corps de commit**
   (`03efb90` : 72 118 min · 17 bâtiments · 3 lt · 2 planques · 7 cartes), **aucun journal joint**.
   Le solde « 9 627 820,00 € », « JOUR 50 », « Brûlant » et l'état `calm/none` lui-même ne sont donc
   **pas comparables** ; seule la FORME est jugée dans ce rapport. *Trancherait :* la ligne
   `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` du journal du run.
4. **L'onglet actif.** Le dock souligne **EMPIRE** alors que le chemin canon de cet écran est
   *Plus → LA SEMAINE*. La planche est une **surimpression** : le chemin joueur n'est pas exercé
   (« (c) → NON déclaré »), donc ce n'est pas jugeable ici. *Trancherait :* une capture prise par le
   chemin joueur réel.
5. **Le rect imprimé par le test.** Log non préservé, aucun rect fourni. J'ai pu **contrôler** la
   géométrie dérivée du code sur l'image (bas du bandeau : **140 px** mesurés pour **143,3** dérivés),
   mais la hauteur du dock que je mesure (**180 px = 65,3 CSS-HUD**) n'a aucune valeur dérivée à
   confronter. *Trancherait :* `TabDockHauteurCss` imprimé au run.
6. **L'ampleur de l'amputation de `B2`.** La partie manquante du glyphe n'est pas dans l'image.
   *Trancherait :* rendre « Au calme — aucune semaine de compression en cours » en DejaVu Serif à
   8,33 CSS de capitale et comparer la largeur obtenue à 300 CSS.
7. **La cause de `B1`.** Composition côté client, ou réponse back vide ? La maquette montre la plaque
   **même à l'état vide** (copie fixe), donc la classe est la composition — mais l'image ne le prouve
   pas. *Trancherait :* le corps réel de `GET /v1/compression/state` (rapport juge-données, que je
   n'ai pas lu et ne dois pas lire).
8. **La police réellement employée par le client.** J'observe un sérif compatible avec DejaVu Serif ;
   je ne peux pas l'établir depuis une image. Le dossier le déclare (`DesignTokens.hudSerifFont`).
   *Trancherait :* `fc-match` n'aide pas ici — il faudrait la constante du client.
9. **`M1` — jeton choisi ou or voilé ?** Le cœur tombe **exactement** sur `#b9ad92` (0/255), ce qui
   plaide fortement pour un jeton choisi ; un or `#f2c96b` voilé jusqu'à cette luminance donnerait
   une teinte intermédiaire, pas la valeur exacte d'un autre jeton nommé. Non tranché à 100 % depuis
   l'image seule.
10. **Aucun tour précédent.** Premier tour de cet écran : je n'ai aucune grandeur antérieure à quoi
    comparer, donc tout est `NOUVEAU` et je ne peux rien dire d'une évolution.

---

## Annexes

### Annexe 1 — Inventaire de la RÉFÉRENCE (témoins d'état) et couche globale

**Fiches — `etats/ecran-canon-vide.png` (série 2, « aucune semaine », 900×1752, ×3,0) —** bord de
cadre de téléphone = 16 px, exclu de toutes les mesures de marge.

| id | catégorie | bbox px | taille CSS | forme / remplissage | texte | relations |
|---|---|---|---|---|---|---|
| `R.retour` | bouton | rond, coin haut gauche | ~26 CSS Ø | cercle, bord `--lisere` | « ‹ » | à gauche du titre |
| `R.titre` | titre | (47,64)-(637,110) | 197×16 | — | « LA COMPRESSION », capitale **10,00 CSS**, cœur **(242,201,107) = `--or-vif`** | marge gauche 12,0 CSS |
| `R.surligne` | sur-ligne d'état | (45,118)-(727,191) | 228×25 | — | « JOUR 1 · TENSION **CALME** · AUCUNE SEMAINE », 2 lignes, cœur **(185,173,142) = `--creme-2`** | sous le titre |
| `R.filet` | séparateur | (53,228)-(845,230) | 264×1 | trait or | — | sous l'en-tête |
| `R.plaque` | plaque | (39,261)-(860,725) | **274×155** | rect arrondi, `surfaceCard`, bord `--lisere` | kicker « OÙ EN EST LA TENSION » · titre « Rien ne presse — vos affaires respirent » cœur **(242,201,107) = `--or-vif`**, capitale **10,67 CSS** · corps italique cœur **(185,173,146) = `--creme-2`** | marges **7,7 / 7,7 CSS** |
| `R.jetons` | jetons d'état | (39,480)-(860,560) | 274×27 | 2 pilules bordées | « TENSION · CALME » (vert), « SEMAINE · AUCUNE » (gris) | dans la plaque |
| `R.vide` | boîte d'état vide | (39,1174)-(860,1290) | **274×39** | rect arrondi, **bord pointillé** | « Aucune semaine de compression en vue », cœur **(185,173,146)** | marges **7,7 / 7,7 CSS** |

**Fiches — `etats/v4-29.png` (série 4, « au calme », 900×1752, ×3,0)**

| id | catégorie | bbox px | taille CSS | forme / remplissage | texte |
|---|---|---|---|---|---|
| `V.instrument` | instrument | (156,207)-(743,578) | **196×124** (CSS déclarée 196×118) | demi-disque, `border-radius:98px 98px 12px 12px`, bord **3 px laiton**, dégradé radial `#2a3245 → #0e1421`, arcs cyan/or/braise, aiguille crème, pivot `#b08d3e` | plaque gravée « TENSION » |
| `V.lecture` | ligne de lecture | (170,618)-(729,656) | 187×13 | — | « Calme — vos affaires respirent », capitale **9,67 CSS**, CSS : `Georgia,serif` **14 px**, `color: var(--or-vif)`, **`padding: 0 14px`** ; cœur mesuré (215,179,95) |
| `V.plaque` | plaque | (18,695)-(883,1045) | **289×117** | plein cadre | kicker « OÙ EN EST LA TENSION » · titre « Rien ne presse — aucune semaine en vue » (`--or-vif`, cœur 224,186,100) · sous-plaque `--creme-2` |
| `V.decor` | fond | plein cadre | — | photo de district, `brightness(.7)` | — |

**Couche globale (zone de contenu, sonde `04`)**

| image | palette dominante | lum moyenne | densité d'encre | teintes distinctes (5 bit) | vide terminal |
|---|---|---|---|---|---|
| `reference-1080x2102` (#25, nominal) | 25,1 % (27,37,48) · 14,5 % (19,24,34) · 13,3 % (193,175,138) | 48,75 | 17,14 % | **748** | 0,3 % |
| `etats/v4-29` (homologue série 4) | 27,7 % (23,44,59) · 17,3 % (19,25,35) | 35,07 | 10,80 % | **678** | 0,5 % |
| `etats/ecran-canon-vide` (homologue série 2) | 26,1 % (12,18,28) · 21,8 % (7,11,19) | 18,09 | 4,80 % | **598** | 26,3 % |
| `etats/ecran-canon` (semaine en cours, contrôle négatif) | — | — | — | — | 0,4 % |

### Annexe 2 — Inventaire de la CAPTURE et couche globale

| id | catégorie | bbox px | taille CSS | forme / remplissage | texte | relations |
|---|---|---|---|---|---|---|
| `C.bandeau` | chrome | y 0..140 | 52 CSS-HUD (×2,755) | plaque bleutée **(13,16,27)**, filet **braise (218,100,71)** en bas | « ARGENT / 9 627 820,00 € » (or, souligné), « JOUR 50 / — » | traverse toute la largeur (contrôle : x 0..1079) |
| `C.medaillon` | chrome | cercle centre (539,5 ; 109,5), **r = 95 px** | Ø 69 CSS-HUD | disque sombre, **anneau braise**, arc cyan **à gauche**, arc braise **à droite**, aiguille **à droite** | « Brûlant » / « CHALEUR » | déborde jusqu'à y=203, sous le filet |
| `C.losange` | séparateur | (531,215)-(548,231) | **5×5** | losange plein | — | cœur **(176,141,61) = `hudHairlineGold`** (1/255) — canonique |
| `C.titre` | titre | (352,268)-(726,303) | **104×10** | — | « LA SEMAINE », sérif, capitale **9,72 CSS**, cœur **(217,171,77) = `--or`** | marges **97,8 / 98,1 CSS** — centré |
| `C.soustitre` | sur-ligne d'état | (448,348)-(631,371) | **51×7** | — | **« Calm · None »**, sans-sérif, capitale 6,39 CSS, cœur **(185,173,146) = `--creme-2`** | marges **124,4 / 124,4 CSS** |
| `C.lecture` | ligne de lecture | **(0,472)-(1075,509)** | **299×11** | — | « **Λ**u calme — aucune semaine de compression en cours », **sérif**, capitale **8,33 CSS**, pas **6,100 CSS/car.**, cœur **(185,173,146) = `--creme-2`** | marges **0,0 / 1,1 CSS** — **coupée à gauche** |
| `C.vide` | fond | y 510..2178, pleine largeur | **300×464** | **aplat parfait (13,13,13)** = `surfaceBase #0d0f10` (3/255) | — | **0 px** différent au seuil 1/255 |
| `C.dock` | chrome | ronds y 2179..2305, libellés y 2324..2341, plaque y ≥ 2220 **(13,18,28)** | 65,3 CSS-HUD | 4 cercles **vides**, soulignement or sous EMPIRE | EMPIRE / FAMILLE / FILIÈRE / PLUS | traverse toute la largeur |

**Couche globale de la capture (zone de contenu y 150..2170)** : palette **98,6 % (13,13,13)** ·
0,5 % (13,13,14) · 0,3 % (185,173,146) · 0,2 % (27,26,32) · 0,2 % (137,101,72) · 0,1 % (216,170,77) —
lum moyenne **13,99**, médiane 13,00 — densité d'encre **0,77 %** — **146** teintes distinctes —
vide terminal **82,2 %** du rect libre. Rythme vertical : quatre bandes d'encre seulement
(215-231, 268-303, 348-371, 472-509), puis plus rien sur 1 669 px.

### Annexe 3 — Correspondance des repères

| | px | CSS | facteur | source |
|---|---|---|---|---|
| CONTENU — référence (`.tel` série 4/6, 300 CSS) | 1080 | 300 | **×3,6** | dossier, § Échelle |
| CONTENU — capture (`LargeurEcransBrennar6 = 300`) | 1080 | 300 | **×3,6** | dossier, § Échelle |
| **rapport capture ÷ référence sur le CONTENU** | | | **1,00** | ⇒ tout écart de taille du contenu est RÉEL |
| CONTENU — témoins d'état (900 px pour 300 CSS) | 900 | 300 | **×3,0** | dossier, table des références |
| CHROME — capture (`AppShell.Px = css × 1280/392`) | 1080 | 392 | **×2,7551** | dossier, § Échelle |
| CHROME — canon HUD `hud-canon-1176.png` | 1176 | 392 | **×3,0** | dossier |

**Offset vertical retenu** (le dossier interdit le pixel absolu) : le haut du contenu est aligné sur
le **bas du bandeau** (mesuré **y = 140**, dérivé 143,3) et le bas du contenu sur le **haut du dock**
(mesuré **y = 2179**, ronds). Rect libre = **y 141..2178 = 2 038 px = 566,1 CSS**. Toute mesure du
§3 cite ce repère. Hauteurs totales : référence **584 CSS** (2102 px) ; capture **666,7 CSS**
(2400 px) ; la différence de 82,7 CSS est absorbée par le rect libre.

### Annexe 4 — Scripts

Tous dans `mesures/`. Chacun imprime la taille des images qu'il ouvre et porte au moins un contrôle.

| script | grandeur | contrôle |
|---|---|---|
| `01_structure.py` | profil vertical d'encre, bandes, plus grands vides | écart à la médiane de la LIGNE (insensible aux dégradés) |
| `02_chrome.py` | filet du bandeau, profils de luminance haut/bas | + : la ligne la plus rouge sort à y=141-142 sur toute la largeur |
| `03_debordement.py` | étendue horizontale de chaque bande de texte | − : le filet DOIT toucher les deux bords ; + : le titre ne DOIT pas |
| `04_couche_globale.py` | palette quantifiée, luminance, densité, teintes | − : la référence peinte doit sortir plus riche que la capture |
| `05_fond.py` | teinte du fond en 5 points par image | + : le bandeau de la CAPTURE elle-même doit sortir bleuté |
| `06_bandeau_collision.py` | **(instrument abandonné)** 3 versions successives, **résultats uniformes** (+139 / +178,8 vs +178,6 / +20,8 vs +19,5) ⇒ mesurait la fenêtre, pas l'objet | conservé comme trace : un résultat uniforme accuse l'instrument |
| `07_collision_or_braise.py` | remplace `06` : séparation or (G≈171) / braise (G≈102) | − : **0 colonne** de braise dans le libellé « ARGENT » |
| `08_typo.py` | hauteurs de bande et couleurs médianes | + : le titre du canon doit rendre une capitale cohérente avec la CSS |
| `09_jetons.py` | appariement de chaque encre au **jeton** le plus proche (table recopiée de `chassis6.py`) | + : le titre du canon tombe sur `--or-vif` à **0/255** |
| `10_gouttiere_vide.py` | rect libre, remplissage, contrastes | + : le bas du bandeau doit retomber sur 143 px ; − : y=1200 doit rendre 0 |
| `11_vide_terminal.py` | vide terminal, sonde robuste au décor | 4 témoins, résultats **non uniformes** (0,3 / 0,4 / 0,5 / 26,3 %) ⇒ discrimine |
| `12_marges.py` | marges gauche/droite en CSS | cadre de téléphone (16 px) mesuré puis exclu, sinon toute marge rend 0 |
| `13_ligne_coupee.py` | coupe, capitale, pas par caractère | + : le titre rend 10,417 CSS/car. vs 6,100 ⇒ la sonde discrimine deux corps |
| `14_parties_absentes.py` | bbox de chaque partie, des deux côtés | + : titre et ligne de lecture rendent de l'encre des 2 côtés ; − : bande de vide pur = AUCUNE encre |
| `15_aiguille.py` | côté des arcs et de l'aiguille du médaillon | + : les deux arcs doivent tomber de côtés OPPOSÉS |
| `16_vide_seuil_bas.py` | balayage du vide de 25/255 à **1/255** | + : à 2/255 la sonde voit la plaque du dock (88 794 px) et le texte (4 311 px) |
| `17_unicite_regle_css.sh` (+ `.out`) | la règle CSS citée par `M1`/`B2` est-elle unique dans les 3 blocs `<style>` ? | + : `font-family:Georgia,serif` doit rendre **48**, pas 0 ; comptes pris dans un `$( )` |

Crops joints : `crop_ligne_debordante.png`, `crop_A_ampute.png`, `crop_fin_ligne.png`,
`crop_titre.png`, `crop_bandeau.png`, `crop_collision.png`, `crop_collision_canon.png`,
`crop_dock.png`, `crop_dock_libelles.png`.
