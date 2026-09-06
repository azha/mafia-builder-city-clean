# Juge visuel ⊥ — ⑯ La revue du jour — r1 — 2026-09-06

## Verdict : NON APPROUVÉ

Le contenu de l'écran est réduit à deux objets sur quatre : le décor du Verge d'Or n'est pas
rendu (92,3 % de la zone libre est du **noir pur**) et le bouton d'action principal
« CONFIRMER LA ROUTINE » est **absent** de l'état capturé, alors que le témoin d'état homologue
de la maquette le porte.

Témoin retenu : la capture montre l'état **« personne au comptoir »** (liste vide). Je juge donc
contre `etats/v4-1.png` (« Revue du jour — personne au comptoir »), rééchantillonné ×1,2 pour
passer de ×3,0 à ×3,6, et non contre `reference-1080x2102.png` (cadre nominal à trois jetons),
que je n'utilise que pour les grandeurs invariantes d'état (plaque du registre, chiffre du compte,
inclinaison) où il est natif — donc non rééchantillonné.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Dix-sept grandeurs, toutes produites par les scripts de `mesures/`.

| # | grandeur | maquette | capture | écart |
|---|---|---|---|---|
| 1 | largeur de l'image | 1080 | 1080 | 0 |
| 2 | bas du bandeau (filet doré `(200,126,66)`) | — | **y=143** | égal à la valeur dérivée du code par le dossier (143 px) |
| 3 | remplissage beige de la plaque du registre | (228,216,181) | (229,217,183) | ≤ 2/255 |
| 4 | encre du titre de la plaque | (46,32,17) | (42,28,13) | ≤ 4/255 |
| 5 | encre du sous-titre « rien n'a dévié » | (103,84,54) | (101,84,57) | ≤ 3/255 |
| 6 | encre du compte | (147,64,44) | (147,64,42) | ≤ 2/255 |
| 7 | couleur de la pastille | (79,127,63) | (79,127,63) | **0** |
| 8 | diamètre de la pastille | 36 px | 34 px | 2 px |
| 9 | hauteur d'encre du titre de la plaque | 34 px | 34 px | 0 |
| 10 | hauteur d'encre du sous-titre | 23 px | 22 px | 1 px |
| 11 | largeur de l'objet plaque (tranche comprise) | 1000 px (x 40..1039) | 1010 px (x 35..1044) | +0,9 % |
| 12 | rayon d'arrondi de la plaque | ≤ 3 px | ≤ 2 px | dans la tolérance (2 px) |
| 13 | contraste titre / beige | 11,11:1 | 11,76:1 | conforme (≥ 4,5:1) |
| 14 | contraste sous-titre / beige | 5,10:1 | 5,19:1 | conforme |
| 15 | contraste compte / beige | 4,91:1 | 4,97:1 | conforme |
| 16 | graisse du sous-titre (fût médian ÷ hauteur) | 0,130 | 0,136 | 0,96× — **c'est l'étalon de l'instrument de graisse (F5)** |
| 17 | gouttière | — | 1ᵉʳ contenu y=1924 (≫ 143), dernier y=2130 (< 2171) | respectée des deux côtés |

Deux points de conformité en plus, non chiffrables en tableau :
- **Langue** : tout le texte de contenu est en français (« Personne au comptoir ce matin. »,
  « La routine, tenue sans vous », « rien n'a dévié ») — aucun énuméré brut, aucun repli anglais.
  Le client est ici **en avance sur la maquette**, qui affiche encore `HEAT` dans son manomètre.
- **Centrage** : le message d'état vide a son centre d'encre à x=538,5 pour un écran de centre 540.

---

## 0. L'écran, tel que la maquette le dit

**But.** C'est le matin, au Verge d'Or. Chaque homme qui a dévié de sa routine a laissé un jeton
de confiance sur le zinc ; on le lui rend (valider) ou on le garde. On ressort en tamponnant le
registre des routines.

**Ordre de lecture.** (1) Le **lieu** : la façade éclairée du Verge d'Or, son enseigne, le comptoir
et les tabourets occupent les deux tiers hauts — c'est ce qui dit *où* on est avant de dire *quoi
faire*. (2) Les **signalements**, bulles bleu nuit venues de la gauche, chacune reliée par une
pointe à un buste en médaillon, chacune flanquée à droite de son **jeton d'or « RENDRE »**. (3) La
**plaque beige du registre** — le seul objet clair, donc le seul repos de l'œil. (4) Le **CTA**
beige bordé de rouge, dernier de la colonne, qui referme la scène.

**Zones.** Bandeau (chrome) · scène peinte · pile de signalements (ou, à vide, le panneau
« CE MATIN, AU VERGE D'OR ») · plaque du registre · CTA · dock (chrome).

**Traits d'identité.**
1. Le **décor peint** du Verge d'Or — bâtiment, enseigne, zinc doré, tabourets.
2. La **plaque de registre** beige, posée **de travers** (−0,37°), avec sa **tranche rouge** à
   gauche et sa **pastille verte cerclée** : un livre de comptes, pas une barre d'interface.
3. Le **couple bleu nuit / or** : tout ce qui parle est une plaque bleu nuit à texte or.
4. Le **jeton d'or** de chaque signalement, écho du « jeton posé sur le zinc ».
5. Le **CTA beige** qui ferme la colonne, avec son compte tamponné (« · 9 »).

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. La maquette remplit sa zone libre à **95,3 %** d'encre pour une luminance moyenne de
**81,9/255** ; la capture la remplit à **7,0 %** pour **14,0/255** — **5,9 fois** plus sombre,
**13,6 fois** moins d'encre. **92,3 %** de la zone libre est du noir pur `(0,0,0)`, et sur la bande
y=243..1359 la mesure rend min = max = 0 : il n'y a strictement rien, pas un décor assombri.

Ce que ça coûte, dans l'ordre. **Le lieu disparaît** : il n'y a plus de Verge d'Or, plus de zinc,
plus de matin — l'écran ne dit plus *où* on est, et le trait d'identité n°1 s'en va avec.
**L'action principale disparaît** : entre le bas de la plaque et le haut du dock, la mesure rend
0 pixel non noir sur 43 200, alors que le témoin d'état homologue porte là un bouton de 194 px de
haut ; dans cet état, le joueur ne peut pas tamponner son registre. **La hiérarchie s'aplatit** :
le panneau bleu nuit qui portait le message d'accueil n'existe plus (0 segment bleu nuit détecté
sur toute la zone), son surtitre « CE MATIN, AU VERGE D'OR » non plus, le message passe de l'or au
gris et perd 19 % de hauteur de capitale.

L'ordre de lecture est donc réduit à deux temps au lieu de quatre, et le premier — le lieu — a été
supprimé. Ce qui subsiste est fidèle : la plaque du registre est presque exacte (beige à 2/255
près, encres à 4/255 près, contrastes à 0,1 près, largeur à 0,9 % près). C'est ce qui rend le
diagnostic sûr : l'instrument sait lire cette image, et il ne trouve rien ailleurs.

Les trois écarts de tête : **(1)** le décor absent, **(2)** le CTA absent, **(3)** le panneau
d'état vide absent et son message dégradé.

---

## 3. Écarts

Un finding par ligne. `dépend des données` distingue ce qu'une autre garniture du compte de démo
changerait de ce qui est vrai quelle que soit la donnée.

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | BLOQUANT | NOUVEAU | non | **Le décor du Verge d'Or n'est pas rendu.** La zone libre est du noir pur ; le lieu, donc le premier temps de lecture, disparaît. Même cause probable que `F15`. | zone libre y=143..2170 : **92,3 %** de `(0,0,0)` (2 021 056 / 2 190 240) ; sur y=243..1359, **12** bandes consécutives (11 de 100 lignes + une de 17) rendent somme R+G+B **min = max = 0**. Témoin : **0,0 %** de noir pur (646/2 115 720), médianes de bande de (18,16,12) à (104,96,96). Luminance moyenne 14,0 vs 81,9 ; encre 7,0 % vs 95,3 %. `04`, `11`, `14` | si le décor est absent ou présent-mais-noir : indiscernable depuis l'image (les deux rendent `(0,0,0)`) |
| `F2` | BLOQUANT | NOUVEAU | l'état oui, la règle non | **Le CTA « CONFIRMER LA ROUTINE · N » et son sous-titre sont absents.** L'action qui referme l'écran n'existe pas dans l'état capturé, alors que le témoin d'état homologue le dessine avec son propre libellé (« appui long — rien d'autre ne vous attend »). | **0** px non-noir sur **43 200** entre le bas de la plaque (y=2131) et le haut du dock (y=2171). Inventaire exhaustif de la zone libre : **4 éléments** (2 de chrome, le message, la plaque) — aucun n'est le CTA. Témoin : y=1859..2052, **h=194 px** (53,9 CSS), x=47..1032. `03`, `12`, `15` | si c'est un choix produit : la table des assumés du dossier ne le mentionne pas |
| `F3` | MAJEUR | NOUVEAU | non | **Le panneau du bloc « état vide » et son surtitre sont absents.** Le message flotte nu sur le noir au lieu d'être porté par une plaque bleu nuit surmontée de « CE MATIN, AU VERGE D'OR ». | témoin : plaque `(16,23,35)` x=40..1038 (**999 px**), y=1367..1643 (**277 px** = 77 CSS), surtitre h=22 px `(156,147,127)`. Capture : **0** segment bleu nuit sur y=143..1990, **0,24 %** de px bleu-nuit ; aucun surtitre. `06`, `10` | — |
| `F4` | MAJEUR | NOUVEAU | non | **La couleur du message d'état vide change de famille** : or → gris chaud. | maquette `(234,194,104)` (R−B = **130**) ; capture `(177,165,139)` (R−B = **38**). Contraste conservé (10,62:1 → 8,62:1). `10`, `14` | — |
| `F5` | MAJEUR | NOUVEAU | non | **Le titre de la plaque est rendu en graisse RÉGULIÈRE là où la maquette est en GRAS** — la seule hiérarchie typographique du seul objet de contenu s'aplatit. | fût médian ÷ hauteur de capitale = **0,114** (capture, 4/35) vs **0,176** (témoin, 6/34) → **1,54×**. Étalon : le sous-titre, régulier des deux côtés et de même texte, rend 0,136 vs 0,130 → **0,96×** — l'instrument ne mesure donc pas la famille de police. `16` | — |
| `F6` | MINEUR | NOUVEAU | non | La hauteur de capitale du message d'état vide chute. | « V » de « Vos » : **37 px** ; « P » de « Personne » : **30 px** → **−18,9 %** (tolérance 5 %). `10` | — |
| `F7` | MINEUR | NOUVEAU | non | Le message d'état vide est **centré** ; la maquette le **ferre à gauche** dans son panneau. Conséquence probable de `F3`. | témoin : les 3 lignes partagent le bord gauche x=**94 / 94 / 95** pour des bords droits 924 / 755 / 1039. Capture : marges 222 g / 224 d, centre d'encre 538,5. `15` | la mesure du bord droit du surtitre (1039) est contaminée par le liseré du panneau |
| `F8` | MINEUR | NOUVEAU | non | **La tranche rouge du registre** (le dos du livre, à gauche de la plaque) est absente. | témoin : **3 411** px « rouges » (r>g+20, r>b+20, r>60) sur x=40..61, bande de **22 px** (6,1 CSS). Capture : **0** px sur x=20..100. `07` | — |
| `F9` | MINEUR | NOUVEAU | non | **La pastille verte perd son anneau clair** et devient un disque nu. | témoin, profil à y=1747 : (172,185,139) x=66 → (225,209,171) x=69 → (166,176,128) x=75 → vert x=78, symétrique x=111..123 ⇒ anneau pâle, Ø extérieur ≈ **58 px** autour d'un disque de 36. Capture : le beige `(229,217,183)` touche le vert à x=72, **sans transition**. `09` | — |
| `F10` | MINEUR | NOUVEAU | non | **La plaque du registre est 12,6 % moins haute** ; les textes étant à la même taille, c'est le **rembourrage interne** qui est rogné. | hauteur perpendiculaire : **139 px** (constante sur x=200..950) vs **158–159 px**. Rembourrage haut 37 vs 47 px (−21 %), bas 36 vs 44 px (−18 %). Textes : titre 34/34, sous-titre 22/23. `08` | — |
| `F11` | MINEUR | NOUVEAU | non | **La plaque n'est plus posée de travers** — le « registre » redevient une barre d'interface. | référence **native** (aucun rééchantillonnage) : bord haut y=1670 à x=120 → y=1665 à x=900 ⇒ **−0,367°**. Capture : y=1992 sur x=120..900 ⇒ **+0,000°**. `13` | — |
| `F12` | MINEUR | NOUVEAU | oui (chaîne du compte) | Le chiffre du compte est plus haut que la référence. | « 34 » h=**48 px** (capture) vs « 17 » h=**43 px** (référence native) → **+11,6 %**. `09` | chaînes de chiffres différentes ; le « 3 » déborde d'environ 1–2 px par rondeur ⇒ écart réel estimé ≈ +8 % — non tranchable sans une capture affichant les mêmes chiffres |
| `F13` | MINEUR | NOUVEAU | non | **Chrome partagé** — les 4 pastilles du dock sont **vides** ; le canon HUD en porte 4 avec icône. À porter au gate du shell, pas à celui de cet écran. | canon (remis à 1080) : 4/4 pastilles à **8,1 / 14,6 / 15,0 / 23,3 %** de px clairs (L>110), Lmax ≈ **208**. Capture : 4/4 à **0,0 %**, Lmax = **37**. `17` | — |
| `F14` | MINEUR | NOUVEAU | possible | **Chrome partagé** — la 2ᵉ ligne du bloc « JOUR » est un tiret. | canon HUD : « JOUR 12 · SOIRÉE » + « 21:40 ». Cadre de série 4 : « JOUR 12 » + « Matin ». Capture : « JOUR 37 » + « **—** ». `z_cap_haut.png`, `z_canon_haut.png` | si le tiret est un repli légitime quand l'heure n'est pas disponible : indécidable depuis l'image |
| `F15` | MINEUR | NOUVEAU | non | **Chrome partagé** — le fond du bandeau est un aplat ; le canon y laisse transparaître l'art. Même cause probable que `F1`. | 4 sondes médianes 17×17 à y=60 : capture `(11,15,26)` aux **quatre** x (60/250/830/1020) ; canon `(33,39,44)` / `(15,21,30)` / `(19,27,38)` / `(25,29,38)`. `17` | — |

**Compte : 15 findings — 2 BLOQUANT, 3 MAJEUR, 10 MINEUR** (dont 3 de chrome partagé : `F13`, `F14`, `F15`).

---

## Écarts ASSUMÉS — vérification du périmètre

Comptés à part, jamais avec les findings. L'état capturé (liste vide) rend quatre des six assumés
**non applicables** : ils portent tous sur le contenu d'un signalement, et aucun signalement n'est
affiché le 2026-09-04.

| assumé (dossier) | ce que je vois | rendu proprement ? |
|---|---|---|
| ligne « motif » absente ou générique | non applicable — aucun signalement affiché | sortie de l'assumé (« clé brute », « identifiant opaque ») **non observée** |
| libellés génériques à la place de « Réacheminer la tournée 7 » | non applicable | sortie (« un UUID visible ») : **aucun UUID** dans l'inventaire exhaustif (4 éléments) |
| compte de routines en entier (« · 17 ») | la plaque affiche **« 34 »** en clair, comme la maquette dessine « 9 » | ✅ **rendu proprement**. En revanche le tampon « · N » du CTA n'existe pas — mais faute de CTA (`F2`), pas faute de scalaire |
| « Passer outre » sans feuille de confirmation | non applicable | — |
| bustes différents de la maquette | non applicable | ⚠️ sur la capture **auxiliaire** du 2026-09-02, le buste est une **rosace dorée sans silhouette ni médaillon** — ce que la colonne de sortie désigne (« un buste tronqué, ovale sans épaules, ou absent »). Observation **datée d'un autre build et d'un autre bundle**, à re-mesurer, pas retenue comme finding |
| noms des lieutenants = ceux du compte de démo | non applicable | ⚠️ sur la même capture auxiliaire, le nom affiché est **« Lieutenant » nu** — désigné explicitement par la colonne de sortie. Même réserve : observation datée, non retenue |

---

## Écarts d'ARBITRAGE

| id | arbitrage | mesure |
|---|---|---|
| `A1` | **Famille de police.** La maquette a été rendue en Noto Serif / Noto Sans (`fc-match`, dossier § Polices) ; le client embarque DejaVu. Non corrigible côté client sans changer la police. | à **hauteur de capitale égale** (35/35), le titre de la plaque occupe **574 px** contre **480** (+19,6 %) ; le sous-titre sans-sérif **191 px** contre **174** (+9,8 %). `09` |
| `A2` | **Format monétaire du bandeau** : « 406 653,08 € » (capture) contre « $ 24 850 » (maquette) et « $ 24 850 » (canon HUD). Chrome, et convention de format à trancher côté produit. | lecture directe, `z_cap_haut.png` / `z_canon_haut.png` |
| `A3` | **La maquette est en retard sur la doctrine i18n**, pas le client : le manomètre de la maquette dit `HEAT`, celui du client dit `CHALEUR` / `Brûlant`. Aucun défaut client — à ratifier côté maquette. | lecture directe |

---

## 5. Autres résolutions

**Aucune.** Le dossier ne fournit qu'une seule résolution pour l'état courant (1080×2400). Le
reflux, le débordement et la conservation des proportions à une seconde résolution **ne sont pas
vérifiés** ce tour — voir § 6.

Ce que la résolution unique laisse tout de même établir : la zone libre mesurée sur l'image
(bandeau 143 px, dock à partir de y=2171, soit **2028 px** de contenu) est cohérente avec la
géométrie dérivée du code par le dossier, et la gouttière est respectée aux deux bouts.

---

## 6. Non vérifié

1. **L'état NOMINAL (avec signalements) n'est pas capturé sur le build courant `76ee3cc`.**
   Toute la partie haute de l'écran — la bulle et sa pointe, le médaillon-buste, la pastille
   « SIGNALE RAREMENT », la puce « J11 », le jeton d'or « RENDRE », les trois points de RÉSERVE —
   n'est donc **pas jugée**. C'est, en surface, la majorité de l'écran.
   *Mesure qui trancherait* : une capture de l'état nominal sur `76ee3cc` avec le bundle courant.
2. **Une seule résolution.** *Mesure* : une seconde capture (1080×1920 ou 720×1600).
3. **Animation** : aucune paire T / T+1 s n'est fournie. Le ruling « aucune animation sur un
   nouvel écran » est donc invérifiable ce tour. *Mesure* : deux captures du même état à 1 s
   d'écart, comptage des pixels différents hors chrome.
4. **Décor absent ou décor rendu noir** : indiscernable depuis l'image, les deux produisant
   `(0,0,0)`. *Mesure* : une capture avec un fond de contrôle non noir, ou l'inventaire des
   objets de la scène.
5. **Ombre portée de la plaque** : le témoin en porte une (le fond passe de `(0,0,0)` au bord à
   `(5,8,13)` sur 14 px) ; sur un fond de noir pur, une ombre est **indétectable**. Non
   comparable tant que `F1` n'est pas fermé.
6. **Le losange doré ◆** mesuré à x=531..548, y=215..231 sous le manomètre n'existe dans aucun
   cadre de la série 4. Le canon HUD porte à cet endroit exact une pastille d'annotation « ② »,
   je ne peux donc pas trancher s'il est canonique. *Mesure* : le canon HUD **non annoté**.
7. **Le soulignement d'onglet actif est sous EMPIRE** alors que le chemin joueur du dossier est
   « Plus → LA REVUE DU JOUR » (sur la capture auxiliaire du 09-02, il est sous PLUS). L'écran
   étant monté « en surimpression », je ne peux pas dire quel comportement est correct.
8. **La chasse résiduelle du titre** : une fois retiré le +9,8 % systématique mesuré sur le
   sous-titre, il reste ~+10 % de chasse inexpliqués sur le titre. Famille, corps ou graisse : je
   ne peux pas les séparer depuis l'image. *Mesure* : les fichiers de police des deux côtés.
9. **La capture auxiliaire `capture-seuil-force-1080x2400.png` (2026-09-02)** est d'un autre monde
   ET d'un autre bundle. Elle laisse voir, en **pistes datées et non retenues comme findings** :
   les cartes de signalement rendues **en contour sans remplissage**, le CTA lui aussi **non
   rempli** (contour rouge sur noir là où la maquette a une plaque beige), la **pointe** de la
   bulle absente, la pastille « SIGNALE RAREMENT » absente, la puce « J38 » en rectangle **haut**
   au lieu d'une pilule **large**, le buste remplacé par une rosace, et un texte **en anglais**.
   Le décor y est absent aussi (76,8 % de noir pur) — ce qui rend `F1` indépendant du bundle.
   *Mesure* : une capture nominale sur le build courant (point 1).
10. **Le CTA absent est-il un choix produit ?** La table des écarts assumés du dossier ne le
    mentionne pas, et le témoin d'état homologue le dessine. Je le remonte donc comme défaut ; un
    ruling produit le déclasserait en assumé.
11. **Les gardes du test de capture** (compte de teintes distinctes, rect ≥ 200×200) : leurs
    valeurs ne sont pas préservées. J'ai vérifié sur l'image ce qui pouvait l'être — largeur 1080,
    bandeau 143 px conforme à la valeur dérivée du code — mais je n'ai **pas** le rect imprimé.

---

## Annexes

### 1. Inventaire de la référence — témoin `etats/v4-1.png` ×1,2 (1080×2102)

Zone libre du cadre : y ≈ 118..2102 (1984 px). Couche globale : luminance moyenne **81,9/255**,
encre **95,3 %**, **0,0 %** de noir pur. Palette dominante : (223,210,174) 15,8 % · (16,20,29)
14,4 % · (70,59,50) 13,5 % · (116,114,108) 13,4 % · (103,92,85) 11,7 % · (10,11,14) 11,7 % ·
(71,76,81) 10,6 % · (39,36,35) 8,9 %.

| id | catégorie | bbox (px) | forme / remplissage | texte |
|---|---|---|---|---|
| `R1.decor` | fond peint | y 118..1360, pleine largeur | scène peinte : façade + enseigne du Verge d'Or, comptoir, bouteilles, zinc doré (bande claire y≈1181..1189), 3 tabourets. Médianes de bande : (84,94,108) → (104,96,96) → (37,26,16) → (97,68,19) | — |
| `R2.vide` | panneau | (40, 1367, 1038, 1643) — 999 × 277 px | plaque arrondie, remplissage bleu nuit `(16,23,35)`, liseré clair | surtitre « CE MATIN, AU VERGE D'OR » h=22 px `(156,147,127)` ; message or `(234,194,104)` sur 2 lignes, capitale 37 px, ferré à gauche (x=94) |
| `R3.registre` | plaque | objet x 40..1039, beige y 1662..1826 (158–159 px perpendiculaires) | beige `(228,216,181)`, **inclinée −0,367°**, rayon ≤ 3 px, **tranche rouge** x=40..61 (22 px), ombre portée, pastille verte `(79,127,63)` Ø36 **cerclée** (Ø ext. ≈ 58) | titre **gras** (fût/capitale 0,176) h=34 ; sous-titre h=23 ; compte h=43 `(147,64,44)` |
| `R4.cta` | bouton | (47, 1859, 1032, 2052) — 986 × 194 px | plaque beige remplie, bordure rouge, coins arrondis | « CONFIRMER LA ROUTINE · 9 » + « appui long — rien d'autre ne vous attend » |

### 2. Inventaire de la capture — `capture-1080x2400.png`

Zone libre : y 143..2170 (2028 px). Couche globale : luminance moyenne **14,0/255**, encre
**7,0 %**, **92,3 %** de noir pur `(0,0,0)`. Palette dominante : (0,0,0) 92,3 % · (223,210,174)
2,3 % · (229,217,182) 1,6 % · (237,226,195) 1,2 % · (234,222,190) 1,2 % · (94,85,69) 0,4 %.

Inventaire **exhaustif** — 4 éléments, 255 lignes occupées sur 2028 (**12,6 %**) :

| id | catégorie | bbox (px) | forme / remplissage | texte |
|---|---|---|---|---|
| `C1.jauge` | chrome | (451, 143, 628, 203) | débord du manomètre sous le bandeau | — |
| `C2.losange` | chrome | (531, 215, 548, 231) — 18 × 17 | losange doré | — (voir § 6.6) |
| `C3.vide` | texte nu | (222, 1924, 855, 1961) — 634 × 38 | **aucun panneau, aucun surtitre**, sur noir pur | « Personne au comptoir ce matin. », capitale 30 px, `(177,165,139)`, centré |
| `C4.registre` | plaque | (35, 1992, 1044, 2130) — 1010 × 139 | beige `(229,217,183)`, **coins carrés**, **0,000° d'inclinaison**, **pas de tranche rouge**, pastille verte `(79,127,63)` Ø34 **sans anneau** | titre **régulier** (fût/capitale 0,114) h=34 ; sous-titre h=22 ; compte « 34 » h=48 `(147,64,42)` |
| — | — | y 2131..2170 | **0 px non-noir sur 43 200** — emplacement du CTA | — |

### 3. Correspondance des repères

| | référence / témoin | capture | rapport |
|---|---|---|---|
| facteur de rendu du contenu | ×3,6 (`reference-1080x2102`) · ×3,0 puis **×1,2** (`etats/v4-1`) | ×3,6 | **1,00** |
| largeur | 1080 | 1080 | 1,00 |
| origine verticale du contenu | bas du bandeau du cadre ≈ y=118 | bas du bandeau du shell, **y=143 mesuré** (filet doré 138..142) | alignement par le HAUT du contenu |
| fin du contenu | bas de l'image, y=2102 (le cadre de série 4 ne dessine pas de dock) | haut du dock, **y=2171 mesuré** | alignement par le BAS |
| hauteur de zone libre | 1984 px | 2028 px | +2,2 % (absorbé, dossier § Échelle) |

Toute mesure du § 3 cite cette correspondance ; les grandeurs invariantes d'état (inclinaison,
hauteur du chiffre) sont prises sur la référence **native** pour écarter tout artefact de
rééchantillonnage.

### 4. Scripts

Tous dans `mesures/`, tous impriment la taille des images qu'ils ouvrent.

| script | grandeur | contrôle |
|---|---|---|
| `01_reperes.py` | frontières horizontales majeures | — |
| `02_bandes.py` | bandes claires (plaque, CTA) et leur bbox | positif : la plaque existe des deux côtés |
| `03_cta_et_dock.py` | présence du CTA, début du dock | positif : plaque = 93,5 % · négatif : vide = 0,0 % |
| `04_decor.py` | noir pur et palette de la zone libre | positif : témoin à 0,0 % de noir pur |
| `05_etat_vide.py` | segments d'encre, bbox | positif : plaque détectée des deux côtés |
| `06_panneau_vide.py` | détecteur « bleu nuit » | positif : 3 bulles trouvées sur la référence nominale · négatif : 0 sur les deux captures |
| `07_plaque.py` | beige, bbox, arrondi, tranche rouge | positif : beige à 1/255 · négatif : tranche non vide côté maquette |
| `08_plaque_detail.py` | hauteur perpendiculaire, inclinaison, pastille, textes | négatif : inclinaison nulle côté capture |
| `09_typo_et_pastille.py` | densité d'encre, anneau, chiffres | positif : sous-titre = même texte des deux côtés |
| `10_etat_vide_texte.py` | panneau, surtitre, capitale, couleurs | — |
| `11_decor_bandes.py` | médianes de bande du décor | négatif : capture uniformément `(0,0,0)` |
| `12_coins_ombre.py` | rayon d'arrondi, ombre, absence du CTA | positif : coin capture rempli dès r=0 |
| `13_inclinaison.py` | inclinaison sur la référence **native** | négatif : capture à +0,000° |
| `14_lecture_globale.py` | luminance, densité, contrastes | positif : 3 contrastes de plaque égaux à ≤ 0,7 |
| `15_alignement.py` | ferrage, inventaire exhaustif | positif : la plaque apparaît dans l'inventaire |
| `16_graisse.py` | fût médian ÷ hauteur de capitale | **positif décisif : sous-titre à 0,96× ⇒ l'instrument ne mesure pas la famille** |
| `17_chrome.py` | bandeau, dock, icônes | positif : filet doré trouvé des deux côtés |

Les images intermédiaires (`vue_*.png`, `z_*.png`) sont dans le même répertoire.
