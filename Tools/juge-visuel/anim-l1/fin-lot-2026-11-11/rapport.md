# Juge visuel ⊥ — ANIMATIONS lot L1 (`shell.entree` · `bandeau.entree` · `bascule.course`) — tour BORNÉ — 2026-11-11

## Verdict : **NON APPROUVÉ**

Les **trois entrées, prises en elles-mêmes, sont conformes au catalogue au sous-pixel** (courbe,
durées, amplitudes, couleurs) — mais **un QUATRIÈME mouvement, non déclaré, tourne pendant la
capture de `bascule.course`** : un fondu plein cadre de 160 ms calé sur le GESTE, qui laisse
l'écran ⑲ entier illisible (α = 0,012) à l'instant où le joueur vient d'actionner l'interrupteur.
Compte pris dans la table : **1 BLOQUANT, 0 MAJEUR, 0 MINEUR.**

| | |
|---|---|
| Q1 — conformité aux valeurs | **A/B ? oui — F1.** Les valeurs des trois entrées sont conformes (α, translation, course, courbe, couleur de piste) ; mais `shell.entree` se déclenche **hors de sa portée déclarée** (catalogue l.439 : « tout montage d'onglet »). |
| Q2 — retour au repos | **A/B ? oui — F1.** `shell.entree` et `bandeau.entree` reviennent au repos (mesuré). À `bascule-course_t140ms`, l'interrupteur est au repos (+0,13 px) mais **l'écran ne l'est pas** : contenu à α = 0,982, le fondu a encore ~20 ms à courir. |
| Q3 — états intermédiaires | **A/B ? oui — F1.** `shell-entree_t80ms` (contraste 7,93:1 / 6,13:1) et `bandeau-entree_t100ms` (9,44:1, aucun recouvrement de la barre haute) sont propres. `bascule-course_t0` ne l'est pas : **tout l'écran est illisible**. |

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Vingt grandeurs mesurées égales (script → sortie collée en annexe 4) :

| # | grandeur | réf / attendu | mesuré | script |
|---|---|---|---|---|
| 1 | `ease-out` = CSS `cubic-bezier(0, 0, 0.58, 1)` sur les **17 points** du journal | écart 0 | **max \|écart\| = 0,0005** | `06` |
| 2 | α du contenu à `shell-entree_t80ms` | journal 0,685 | **0,688** (p5 %) | `03` |
| 3 | α du contenu à `shell-entree_t0` / `_t160ms` | 0,000 / 1,000 | **0,000 / 1,000** | `03` |
| 4 | `shell.entree` « Pas de translation » (catalogue l.439) | (0, 0) px | **(0, 0) px**, corrélation 0,99947 | `08` |
| 5 | `shell-entree_t160ms` ≡ `bandeau-entree_t0` | — | **identiques octet pour octet**, sha256 `a6142643737e5640…` | `00` |
| 6 | le bandeau descend **d'un bloc** (4 tranches en x) | même valeur | **8,85 / 8,83 / 8,82 / 8,87 px** (étendue 0,05 px) | `11` |
| 7 | emprise horizontale du bandeau, t100 vs t200 | identique | **x = 118..961 des deux côtés** (écart 0 px) | `10` |
| 8 | α du bandeau à `t200ms` (rapport d'encre) | 1,000 | **1,007** (instrument : −1,7 % sur son témoin) | `13` |
| 9 | contraste du texte du bandeau à l'état final | ≥ 4,5:1 | **13,89:1** | `12` |
| 10 | course du curseur `t0 → t140ms` | `Dx` = 42,67 u = 36,00 px | **36,00 px = 42,66 u** (écart −0,01 px) | `17` |
| 11 | `bascule-course_avant` et `_t0` = même position physique | 0 px | **+0,00 px** (987,37 des deux côtés) | `17` |
| 12 | fraction parcourue à `t70ms` | ease-out 0,685 | **0,694** (−0,31 px) | `17` |
| 13 | curseur au repos « éteint » à `t140ms` | 951,24 px (géométrie) | **951,37 px** (+0,13 px) | `16`, `17` |
| 14 | couleur de piste `Or` à `avant` / `t70ms`, renormalisée | `#d9ab4e` = (217, 171, 78) | **(217, 171, 77) / (218, 172, 78)** | `15` |
| 15 | couleur de piste `Eteint` à `t140ms` | blanc α 0,18 (linéaire 0,180) | **(120, 120, 120)** = linéaire 0,188 | `15` |
| 16 | échelle sur l'image : largeur de piste | 93,9 u = 79,23 px | **78,77 px** (−0,46 px) ; « 1 u = 1 px » rejeté de 15,13 px | `16` |
| 17 | échelle sur l'image : largeur de curseur | 42,7 u = 36,03 px | **35,57 px** (−0,46 px) | `16` |
| 18 | **un seul** curseur à chacun des 4 instants | 1 zone | **1 zone** partout | `15` |
| 19 | garde anti-vide (≥ 5 % de pixels non noirs) | ≥ 5 % | **15,64 % à 100 %** sur les 11 captures | `00` |
| 20 | largeur du curseur constante pendant la course | invariante | **35,04 à 35,57 px** (étendue 0,52 px) | `17` |

Contrôles **négatifs** passés (un instrument qui ne discrimine pas ne mesure pas) : la courbe
`linéaire` est rejetée à 0,185 et `ease-in` à 0,370 sur le journal (`06`) ; sur les pixels du
curseur, `linéaire` est rejetée de **6,97 px** et `ease-in` de **13,63 px** (`17`) ; le détecteur de
translation retrouve un décalage imposé de (+3, −4) px (`08`) ; le corrélateur du bandeau retrouve
un décalage imposé de 5 px et de 6 px (`07`, `11`) ; le détecteur de curseur rend un score de 0,00
sur une bande sans curseur (`05`) ; le solveur d'alpha rend 0,685 et non 1,000 quand on lui donne
`t80ms` pour image finale (`13`).

Un instrument **rejeté** est signalé comme tel : le solveur « une seule couche » de `12` rendait
0,899 au lieu de 1,000 sur son témoin ⇒ **abandonné**, remplacé par le rapport d'encre de `13`.

---

## 0. Ce que la référence dit de ces trois mouvements

Il n'y a pas de maquette : la référence est écrite (`reference/catalogue-extrait.md`,
`reference/design-l1.md`). Pour un joueur, les trois entrées disent la même chose — **le passage a
une durée** :

- `shell.entree` : « on pousse une porte, et ce qu'il y a derrière se découvre le temps du geste » —
  un fondu de 160 ms sur le **contenu d'un onglet qu'on monte**, barres exclues, sans translation.
- `bandeau.entree` : « une annonce descend de la barre comme un billet qu'on vous passe par-dessus
  le comptoir » — 10 u de descente **et** un fondu, 200 ms.
- `bascule.course` : « un interrupteur a une course : le curseur passe d'un bout de la piste à
  l'autre **sous le pouce**, et le laiton de la piste s'allume quand il arrive au bout » — 140 ms,
  couleur non animée.

Les trois traits d'identité à préserver : (1) **seul le contenu bouge**, le chrome (barre haute,
barre d'onglets) reste stable ; (2) **un mouvement à la fois** par geste ; (3) **le geste du joueur
reste lisible pendant qu'il s'exécute** — c'est tout l'objet de `bascule.course`.

---

## 4. Lecture globale — les trois mouvements se lisent-ils comme la référence ?

`shell.entree` et `bandeau.entree` se lisent exactement comme la référence les écrit. Le fondu
d'onglet est **uniforme et sans glissement** : à `t80ms` l'écran Famille est entier, à sa place, à
α = 0,688, et il reste **largement lisible** (titre 7,93:1, corps 6,13:1 — très au-dessus du
plancher de 4,5:1). Le chrome ne bouge pas : barre haute et barre d'onglets sont identiques aux
quatre instants, ce qui est la preuve que l'effet porte bien sur `ContentSlot` et non sur la racine.
Le bandeau **descend d'un bloc** — filet central, losange, texte, bords de plaque se décalent tous
de 8,8 px — et arrive à plein alpha ; à mi-course il est déjà sous la barre haute, donc sans
recouvrement, et son texte est lisible à 9,44:1.

`bascule.course`, mesuré **seul**, est le plus propre des trois : la course vaut 36,00 px là où la
géométrie en prédit 36,00, le curseur part exactement d'où il était au repos (0,00 px d'écart entre
`avant` et `t0`), il n'y a jamais deux curseurs, et le laiton de la piste est posé à l'arrivée et
pas avant — à `t70ms` la piste est encore l'or `#d9ab4e` à 1/255 près.

Mais le joueur ne voit pas `bascule.course` seul. **Entre l'image `avant` et l'image `t0`, c'est-à-
dire à travers le geste lui-même, le contenu de l'écran ⑲ passe de α = 1,000 à α = 0,012** : titre
« LES RÉGLAGES », les deux lignes de langue, les trois lignes d'interrupteur, le bouton « FERMER LE
COFFRE », tous les textes disparaissent. Ils reviennent par un fondu dont la durée ajustée est
**160 ms — celle de `shell.entree`, pas les 140 ms de la course** (160 ms colle à 0,0056 ; 140 ms est
rejetée à 0,072, soit douze fois la résolution de l'instrument). Autrement dit : **la première
moitié de la course se joue sur un écran éteint**. Le mouvement qui devait rendre le geste lisible
est recouvert par un mouvement qui l'efface — c'est l'inverse exact de « sous le pouce ».

Les trois écarts de tête, par impact perçu : **(1)** l'écran ⑲ entier s'éteint et se rallume à
chaque bascule (F1) ; **(2)** conséquence directe, à `t140ms` la course est finie mais l'écran ne
l'est pas (α = 0,982) ; **(3)** rien d'autre — le reste est du sous-pixel, consigné en classe C.

---

## 3. Écarts — table unique, un finding par ligne

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| **F1** | **BLOQUANT** | **NOUVEAU** | Un **fondu plein cadre de 160 ms**, non déclaré pour ce geste, tourne pendant `bascule.course` et est **calé sur le geste** : à `bascule-course_t0` (1 ms après le geste, journal l.25) **tout le contenu de ⑲ est à α = 0,012** — illisible ; à `t70ms` α = 0,620 ; à `t140ms` α = 0,982, donc **pas encore au repos**. L'image `bascule-course_avant`, prise « au repos avant le geste », est à α = 1,000 : la chute se produit **à travers le geste**. La durée ajustée est **160 ms = `shell.entree`** (catalogue l.360), pas les 140 ms de la course ⇒ `shell.entree` se déclenche sur un appui d'interrupteur, hors de sa portée déclarée (« tout montage d'onglet », l.439). Effet joueur : la moitié de la course se joue sur un écran éteint, et chaque bascule fait clignoter l'écran entier. | `03` (instrument étalonné : rend 0,688 là où le journal écrit 0,685) : α contenu = **1,000** (`avant`) / **0,000–0,012** (`t0`) / **0,620** (`t70ms`) / **0,982** (`t140ms`). `14` : ajustement de la durée sur ces trois alphas — **160 ms : erreur max 0,0056 (COMPATIBLE)** ; 140 ms : 0,0723 ; 180 ms : 0,0558 ; 120 ms : 0,1573 — toutes REJETÉES. Témoin de l'ajusteur : il retrouve 160 ms sur les 8 échantillons de `shell.entree` (erreur 0,0005). `01` : profil de luminance par bande de 100 px — `t0` = `24 16 1 0 1 1 0 1 1 2 …` contre `25 22 18 17 24 26 …` à `avant`. `00` : `bascule-course_t0` = **18,24 %** de pixels non noirs contre **100 %** à `avant` et `t140ms`. | **Lequel des deux mondes le produit.** Lecture (a), celle que les mesures désignent : l'appui sur l'interrupteur **re-déclenche** `shell.entree` (le contrôleur reconstruit la ligne « à chaque rendu », design §3 ; si ce rendu repasse par un montage, le fondu part). Lecture (b) : le **banc** a monté ⑲ et tapé l'interrupteur **dans la même image**, auquel cas le produit est sain mais les trois captures de `bascule.course` ne peuvent répondre ni à Q1 ni à Q3 à `t0`/`t70ms`. Je ne peux pas trancher sans sortir de l'image. **Mesure hors image qui tranche** : refaire les captures de `bascule.course` en laissant tourner ≥ 200 ms de temps simulé entre le montage de ⑲ et le geste — si le fondu réapparaît, c'est (a). Corroboration faible, à ne pas compter comme preuve : `dossier.md` l.23 ne liste que `shell-entree_t0` comme légitimement quasi vide, pas `bascule-course_t0`. |

*Dans les deux lectures, ce tour ne peut pas approuver `bascule.course` : soit l'écran s'éteint sous
le pouce du joueur, soit les captures ne montrent pas ce qu'elles prétendent montrer.*

### Écarts ASSUMÉS inventoriés — vérifiés rendus proprement, non rouverts

| écart assumé (`dossier.md`) | vérification |
|---|---|
| La sortie de l'écran précédent n'est pas animée (`shell-entree_avant` → `t0`) | `00`/`01` : `avant` (l'onglet Empire, 100 % non noir) → `t0` (contenu noir pur, lignes y 204..2161 entièrement noires). Disparition d'un coup, **sans résidu** : aucun pixel de l'ancien onglet ne subsiste. Propre. |
| Pas de translation sur `shell.entree` | `08` : décalage (0, 0) px, corrélation 0,99947. Propre. |
| `shell-entree_t0` quasi vide par construction (α = 0) | `00` : 15,64 % de pixels non noirs = **les deux barres seules**. Non compté comme défaut. |
| Couleur de piste non animée, posée à l'arrivée | `15` : or `#d9ab4e` à `avant` **et** à `t70ms` (écart ≤ 1/255 après renormalisation par α), gris `Eteint` seulement à `t140ms`. Propre. |
| Polices substituées (Georgia → Noto Serif, Segoe UI → Noto Sans) | Visible sur les captures (empattements Noto Serif sur « LA FAMILLE », « LES RÉGLAGES »). ARBITRAGE de substitution, non rouvert. |

### Classe C — consignés, ni correctif ni tour (sans gravité, hors du compte)

| id | constat | mesure |
|---|---|---|
| C1 | La descente du bandeau mesure **8,84 px** entre les phases 0,685 et 1,000, là où l'échelle du dossier en prédit 8,68 (soit 2,806 px/u au lieu de 2,755 — +1,9 % sur la course extrapolée de 10 u). Sous le pixel, imperceptible. | `07` |
| C2 | À `bascule-course_t140ms` le contenu est à α = 0,982 et non 1,000 (−1,8 %). Imperceptible seul ; c'est le symptôme de F1, pas un écart indépendant. | `03` |
| C3 | Le curseur mesure 35,04 px de large à `t70ms` contre 35,54–35,57 aux trois autres instants (−0,5 px) : c'est le crénelage d'une position à mi-pixel, pas un changement de taille. | `17` |
| C4 | Le retrait gauche piste → curseur à l'arrêt mesure 3,97 px contre 3,60 prédits par `Px(1)` = 4,27 u (+0,37 px). | `16` |
| C5 | La largeur de piste mesurée à mi-hauteur (78,77 px) est 0,46 px sous les 79,23 px attendus — la frange de crénelage de la pilule, pas une géométrie fausse. | `16` |

---

## 5. Autres résolutions

**Aucune.** Les 11 captures sont toutes en **1080 × 2400** (vérifié : `00`, contrôle positif « toutes
les images en 1080×2400 ? OUI »). Le dossier n'en fournit pas d'autre et interdit d'en demander. Le
mandat du juge visuel exige normalement **au moins deux résolutions, dont une portrait téléphone** :
la portrait téléphone est bien là, la seconde manque. ⇒ **rien de ce rapport ne dit ce que ces trois
mouvements deviennent à une autre taille** (voir § 6).

---

## 6. Ce que je n'ai pas pu vérifier

1. **Qui cause le fondu de F1** — produit (lecture a) ou banc (lecture b). *Mesure qui tranche* :
   des captures de `bascule.course` prises après ≥ 200 ms de temps simulé depuis le montage de ⑲.
2. **L'intervalle 0 → 86 ms de la descente du bandeau — et c'est exactement l'intervalle qui
   compte.** Le bord haut du bandeau est **au-dessus de y = 204** (la frontière du `ContentSlot`,
   établie indépendamment par `shell-entree_t0`) de t = 0 à t ≈ 86 ms, pendant que α monte jusqu'à
   0,61 ; or la barre haute porte **988 px d'encre** dans la bande balayée (y 187..203), **toute
   située en x 480..599** — le médaillon central — et l'emprise du bandeau (x 118..961) le couvre
   entièrement (`09`, `10`). Les captures fournies sont t0 (α = 0, rien à voir) et t100 (bord haut
   déjà redescendu à y = 206,3) : **aucune ne tombe dans l'intervalle de recouvrement**. Je ne peux
   donc dire ni que le bandeau passe proprement sous le médaillon, ni qu'il le barre, ni qu'un
   masque le coupe. *Mesure qui tranche* : une capture à **t ≈ 50–70 ms**.
3. **Si `shell-entree_t160ms` et `bandeau-entree_t0` sont deux rendus indépendants** ou le même
   fichier écrit deux fois. L'identité octet pour octet (`00`) prouve que les deux images SONT la
   même image ; elle ne prouve pas deux captures séparées. Les PNG ne portent **aucun chunk de
   métadonnée** (vérifié : `IHDR`, `IDAT`, `IEND` seulement) — donc aucun horodatage à comparer.
   C'est ce qui limite la force de la réponse Q2 pour `shell.entree` : le retour au repos est établi
   *relativement* à cette image-là. *Mesure qui tranche* : le script du banc, ou un horodatage dans
   les captures.
4. **Si le noir de `shell-entree_t0` est bien α = 0 et non une UI pas encore construite.**
   `design-l1.md` §4 prévient lui-même que « rendre à t = 0 est DÉGÉNÉRÉ » : `ContentSlot` est vide à
   t = 0 même sans animation. Mes pixels ne distinguent pas les deux. *Mesure qui tranche* : la même
   capture sous `Reduit` (durée 0) — noire aussi ⇒ c'est l'UI ; pleine ⇒ c'est le fondu.
5. **Toute autre résolution** (§ 5) : reflux, débordement et coupure à une autre taille ne sont pas
   jugés.
6. **Les états non capturés** : « mouvement réduit » (durée 0), les surimpressions, le premier
   montage de session, `bandeau.sortie`, le second sens de `bascule.course` (ici seul **allumé →
   éteint** est capturé ; le design §4 demande les deux sens), et les 9 classes de capture à
   identifiants — exclusions écrites du dossier.
7. **L'ordre de dessin** du bandeau par rapport au médaillon de la barre haute : indécidable depuis
   des images où ils ne se superposent jamais.

---

## Annexes

### 1. Inventaire de la référence (écrite)

| entrée | cible | canaux | durée | courbe | valeurs |
|---|---|---|---|---|---|
| `shell.entree` | `ContentSlot` | `Alpha` Mult | 160 ms | `ease-out` | 0,00 → 1,00 ; **pas de translation** |
| `bandeau.entree` | racine du bandeau | `TranslationY` Add + `Alpha` Mult | 200 ms | `ease-out` | y +10 u → 0 (= 27,55 px écran) ; α 0,00 → 1,00 |
| `bascule.course` | `Curseur` | `TranslationX` Abs (`Transitionner`) | 140 ms | `ease-out` | `de` → `vers`, `Dx` = 42,67 u = 36,00 px ; piste `Px(22)` = 93,9 u ; curseur `Px(10)` = 42,7 u ; retrait `Px(1)` = 4,27 u ; couleur **non animée** (`Or #d9ab4e` ↔ `Eteint` blanc α 0,18) |

Couche globale de la référence : aucune image. Le catalogue (l.93-95) prévient que le canon ne
spécifie **aucune** courbe — `ease-out` est une proposition. **Elle est tenue** : les 17 points du
journal tombent sur `cubic-bezier(0, 0, 0.58, 1)` à 0,0005 près (`06`).

### 2. Inventaire de la capture

**Repères communs** (établis, puis cités par toute mesure du temps 3) :

| repère | valeur | établi par |
|---|---|---|
| toutes les captures | 1080 × 2400 | `00` |
| échelle | 1 u = 0,84375 px — **vérifiée sur l'image** : piste 78,77 px pour 93,9 u (−0,46 px) ; « 1 u = 1 px » rejeté de 15,13 px | `16` |
| `ContentSlot` | y = **204 à 2161** (lignes entièrement noires de `shell-entree_t0`) ; confirmé par l'encre de `bandeau-entree_t0` qui s'arrête à y = 203 | `02`, `09` |
| barre haute | y = 0..203 ; encre dans la bande y 187..203 : **988 px, tous en x 480..599** (médaillon) | `09`, `10` |
| piste de l'interrupteur animé | x = **929,62..1008,39**, y = **947..989** (« Dire mes prix au marché », 2ᵉ interrupteur de ⑲) | `04`, `16` |
| bandeau au repos | encre y = **215..289**, x = **118..961** (78,1 % de la largeur) | `07`, `10` |
| échelle du bandeau | 1 u de canal = 3,265 × 0,84375 = 2,755 px écran (mesuré 2,806 — C1) | `07` |

**Fiches par instant** (ce qui est visible, y compris ce qui n'a pas de contrepartie attendue) :

| capture | contenu | α contenu | chrome | note |
|---|---|---|---|---|
| `shell-entree_avant` | onglet **Empire** (vue de ville, bandeau « Lt. Hara attend vos ordres » + CTA « TRANCHER ») | 1,000 | stable | écran précédent |
| `shell-entree_t0` | **noir pur** y 204..2161 | 0,000 | stable, intact | 15,64 % non noir = les barres seules |
| `shell-entree_t80ms` | onglet **Famille** entier, à sa place | 0,688 | stable | titre 7,93:1, corps 6,13:1 |
| `shell-entree_t160ms` | onglet Famille | 1,000 | stable | ≡ `bandeau-entree_t0` octet pour octet |
| `bandeau-entree_t0` | Famille, **aucune encre de bandeau** | 1,000 | stable | prouve α bandeau = 0 |
| `bandeau-entree_t100ms` | Famille + bandeau « Les indics parlent : la brigade s'agite », encre y 206..281 | 1,000 | stable | bandeau à α 0,685, 9,44:1 |
| `bandeau-entree_t200ms` | idem, encre y 215..289 | 1,000 | stable | bandeau à α 1,007, 13,89:1 |
| `bascule-course_avant` | ⑲ **LES RÉGLAGES** entier, 2ᵉ interrupteur **or, curseur à droite** | 1,000 | stable | 100 % non noir |
| `bascule-course_t0` | ⑲ **quasi éteint** ; curseur à droite (centre 987,37) | **0,012** | **stable, à pleine luminosité** | 18,24 % non noir — **F1** |
| `bascule-course_t70ms` | ⑲ assombri ; curseur à 962,40, piste encore **or** | **0,620** | stable | 21,36 % non noir — **F1** |
| `bascule-course_t140ms` | ⑲ ; curseur à 951,37 (gauche), piste **grise** | **0,982** | stable | couleur posée à l'arrivée ✓ |

Couche globale : le **chrome est identique dans toutes les captures d'un même scénario** (barre haute
à L ≈ 24 et barre d'onglets à L ≈ 20-21 sur tous les profils de `01`), ce qui confirme que les effets
portent sur le contenu et jamais sur les barres. La seule couche globale qui bouge hors contrat est
celle de `bascule.course`.

### 3. Correspondance des repères

Aucun offset entre référence et capture : la référence est **écrite**, pas dessinée. Toutes les
grandeurs d'image sont ramenées en **u** par 1 u = 0,84375 px (vérifiée sur l'image, repère ci-dessus)
et, pour le bandeau seul, par 1 u de canal = 2,755 px écran (`TopBarEchelle` × 3,265). Les temps
viennent des noms de fichier et du journal ; le décalage « geste → écriture du départ » vaut 1 ms
(journal l.25) et est repris tel quel dans l'ajustement de `14`.

### 4. Scripts — `mesures/*.py`

Chaque script imprime la taille des images qu'il ouvre (sauf `06` et `14`, qui ne lisent pas
d'image et le disent) et porte au moins un contrôle positif ; les contrôles négatifs sont listés
plus haut.

| script | ce qu'il mesure |
|---|---|
| `00-inventaire.py` | tailles, sha256, % de pixels non noirs, doublons octet pour octet |
| `01-vignettes.py` | vignettes 1/4 + profil de luminance par bande de 100 px |
| `02-alpha-contenu.py` | bornes du `ContentSlot` ; α du contenu (médiane) — **biais +0,049 détecté sur son témoin** |
| `03-alpha-quantiles.py` | α du contenu débiaisé par quantile bas — **témoin : 0,688 pour 0,685** |
| `04-localise-bascule.py` | boîte des pixels qui changent `avant` → `t140ms` ; crops ×8 |
| `05-course-curseur.py` | centre du curseur au pixel entier + rejet de `linéaire` et `ease-in` |
| `06-courbe-ease-out.py` | `cubic-bezier(0,0,.58,1)` contre les 17 points du journal |
| `07-bandeau-translation.py` | décalage vertical du bandeau par corrélation normalisée |
| `08-shell-sans-translation.py` | corrélation 2D : `shell.entree` translate-t-il ? |
| `09-superposition-barre-haute.py` | encre de la barre haute ; trajectoire du bord haut du bandeau |
| `10-bandeau-emprise.py` | emprise horizontale du bandeau ; crops du haut d'écran |
| `11-bandeau-elements.py` | le bandeau descend-il d'un bloc (4 tranches en x) |
| `12-bandeau-alpha-final.py` | **instrument REJETÉ** (témoin 0,899 ≠ 1,000) + contrastes |
| `13-bandeau-alpha-ratio.py` | α du bandeau à t200 par rapport d'encre — **témoin 1,435 pour 1,460** |
| `14-fondu-pendant-la-bascule.py` | ajustement de la durée du fondu de F1 (160 ms vs 140) |
| `15-q3-lisibilite-et-piste.py` | contrastes à t80 ; un seul curseur ; couleur de piste renormalisée |
| `16-echelle-sur-image.py` | vérification de l'échelle u → px sur les pixels |
| `17-course-sous-pixel.py` | centre du curseur au sous-pixel ; course ; courbe |

Sous-produits lisibles à l'œil : `mesures/vignettes/` (11 vignettes 270×600) et `mesures/crops/`
(interrupteur ×8 aux 4 instants, haut d'écran ×2 aux 3 instants du bandeau).
