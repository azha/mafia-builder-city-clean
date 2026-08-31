# Lot « redimensionnement » — **v10** — le client survit à un changement de taille en cours de vie

> **Ruling user 2026-08-30** : « supporter le redimensionnement pour de vrai ».
> **v1 NOT_APPROVED** (5B/7M/4m) · **v2 NOT_APPROVED** (3B/5M/5m) · **v3 NOT_APPROVED** (2B/4M/6m) ·
> **v4 NOT_APPROVED** (4B/6M/6m) · **v5 NOT_APPROVED** (6B/8I/4m) · **v6 NOT_APPROVED** (4B/8I/6m) ·
> **v7 NOT_APPROVED** (4B/8I/6m) · **v8 NOT_APPROVED** (5B/5I/4m) · **v9 NOT_APPROVED** (4B/5I/3m).
> ⛔ **CE BLOC SE TIENT PAR VERSION, JAMAIS PAR UN TOTAL RECOPIÉ** — un total se périme en silence
> à chaque tour, et il l'a fait DEUX fois (m1 en v7, B6 en v8 : le correctif de m1 n'a pas survécu
> à une version). **Ajouter une version OBLIGE à ajouter sa ligne** ; c'est la seule forme qui ne
> peut pas mentir par omission. ⇒ **9 versions, 9 refus.** Rapports hors dépôt : `/tmp/revue-redimensionnement-design{,-v2,-v3,-v4}.md`.
> *(v3 était omis de l'en-tête de la v4 — un document dont la thèse est la comptabilité honnête ne
> peut pas escamoter un de ses propres verdicts. Corrigé ici : quatre versions, quatre refus.)*
>
> ★★★ **LE MOTIF, CINQ FOIS DE SUITE, ET IL S'EST DÉPLACÉ VERS L'INTÉRIEUR À CHAQUE TOUR** :
> v1 émetteur sur une grandeur que le harnais ne bouge jamais · v2 garde sur la NULLITÉ là où le
> défaut vit dans la VARIANCE · v3 un mécanisme de production neuf que sa propre falsifiable ne
> voit pas · **v4 une falsifiable de cadrage qui asserte sur les deux grandeurs que le §3 de la
> MÊME version démontre, six lignes plus haut, ne pas survivre.**
> ⚠️ **m1 : ce bloc n'avait pas été rouvert depuis la v4 et sous-comptait ses propres refus.**
> ⇒ Ce n'est plus une observation, c'est un **taux** — **et il se lit sur la liste par version ci-dessus, jamais sur un total
> recopié ici** *(I1 de la v9 : deux totaux avaient survécu DANS le bloc qui venait de les
> interdire — le correctif d'un total recopié n'est pas d'en écrire un autre)*, et à chaque tour le défaut vivait dans le correctif du tour précédent. La conséquence
> opérationnelle est écrite au §11 : **aucun chunk de ce lot ne se livre sans sa revue ⊥**, et la
> petitesse d'un delta n'est jamais un motif de la sauter.

## 0. L'exposition — et pourquoi ses populations ne sont PAS opposables

```
defaultScreenOrientation: 0 + portrait seul   ⇒ ROTATION VERROUILLÉE
androidResizeableActivity: 1                  ⇒ SPLIT-SCREEN AUTORISÉ
androidRenderOutsideSafeArea: 1               ⇒ L'APP DESSINE SOUS L'ENCOCHE   ← ProjectSettings.asset:70
androidDefaultWindowWidth 1920 / Height 1080 · MinimumWindow 400×300
   ⇒ le multi-fenêtres déclare une fenêtre PAYSAGE : il SUSPEND le verrou d'orientation
```
⚠️ **`androidRenderOutsideSafeArea: 1` a été manqué par TROIS versions**, alors qu'il vit **quatre
lignes au-dessus** de la ligne que ce même § citait. Il décide le §5 : c'est lui qui rend le chemin
zone-sûre **porteur en production**, donc lui qui dit si P4/P5 sont des défauts joueur ou des
curiosités d'instrument. *On lit une ligne, on ne lit pas son voisinage.*

**Deux énoncés datés faux vivent dans le code. Ils sont désignés ici par INDEX — n°1 et n°2 — et
leur littéral n'apparaît nulle part dans ce document.** *(Décrire un correctif est un acte de
citation : reproduire la clause qu'on retire la réintroduit, et le contrôle qui la traque rend
alors un compte faux. Le littéral ne vit que dans la commande, scopée au fichier cible.)*

- **n°1** — l'énoncé qui affirme que la résolution est figée après le démarrage.
- **n°2** — l'énoncé qui affirme que le facteur d'échelle se dérive d'une grandeur d'écran plutôt
  que de se lire sur le canvas. C'est cette prémisse qui a mis une lecture d'écran dans le calcul
  d'insets — **la ligne même que le §5 discutait**, trente lignes plus bas que l'énoncé qui la
  justifiait. *La jointure du socle.*

⛔⛔ **ET LE FAIT NEUF DE LA v5, QUI CHANGE LE GESTE : LES POPULATIONS PUBLIÉES NE SONT PAS
REPRODUCTIBLES.** Trois balayages indépendants, trois résultats :

| balayage | n°1 | n°2 | chevauchement |
|---|---|---|---|
| celui publié par la v4 | 6 hits / 2 fichiers | 4 hits / 3 fichiers | non mesuré |
| celui de la revue ⊥ v4 | 3 hits | **1 hit** | « dans les mêmes docstrings » |
| le mien, `git ls-tree` @`5768e3d`, 143 fichiers | 5 hits / 3 fichiers | 6 hits / 4 fichiers | **0 à ±6 lignes** |

Aucun ne reproduit les deux autres, et **le mien contredit la revue sur le chevauchement même**.
⇒ **La conclusion de la revue tient quand même, et c'est ce qui compte** : une population obtenue
par une prose (« les formulations de n°1 ») n'est pas opposable, parce qu'elle dépend entièrement
du motif que le lecteur choisit. Là où la revue et moi divergeons, c'est sur le **mécanisme** ; là
où nous convergeons, c'est que **le contrôle par index n'est pas écrivable en l'état**.
⇒ *Quand on ne peut pas caractériser le mécanisme, on écrit l'observation et la pratique sûre,
jamais une loi.* **Pratique sûre imposée à R1** : le contrôle ne s'écrit qu'avec (i) un **prédicat
écrit** qui définit chaque proposition sans ambiguïté, (ii) sa **commande collée**, (iii) sa
**portée déclarée** (fichier / répertoire / arbre), (iv) la valeur **attendue AVANT et APRÈS par
index**, et (v) le jeu complet **exécuté d'abord sur les fichiers INTACTS** — un motif qui rend
déjà `0` avant l'édition est un motif **faux**, pas un motif satisfait.

## 1. L'API — MESURÉE, pas déduite (10 215 DLL, contrôle négatif à 0)

```
renderingDisplaySize             ✅ 29 hits / 3 DLL  (UnityEngine.UI, UIModule, UnityEngine)
OnRectTransformDimensionsChange  ✅  8 hits / 2 DLL  (UnityEngine.UI, TextMeshPro)
onScreenSizeChanged              ⛔  0 — N'EXISTE PAS
```
⚠️ **La première mesure était un FAUX NÉGATIF** : 175 DLL balayées, le hook à 0. Le périmètre était
trop étroit (`UnityEngine.UI.dll` vit dans `Library/PackageCache`). ⇒ *Un balayage qui rend
« aucun » exige qu'on demande d'abord quelle forme aurait échappé — et ici c'était le PÉRIMÈTRE,
pas le motif.*

## 2. Les clusters — la RÈGLE, et une liste qui remplace un compte

⚠️ *(Titre corrigé en v9 : « Les 20 clusters — PUBLIÉS » était devenu faux au moment même où le corps établissait que 20 n'est pas reproductible et que les TRANSIENT sont un livrable À publier — B6, section restée à 0 delta pendant que le corps changeait sous elle.)*

⚠️ **Les ancres de ce document sont datées de `5768e3d`.** ⛔ **I1 de la v5 — « toutes fausses à
HEAD » était un verdict UNIFORME, et il est faux pour la majorité.** *Un résultat uniforme est le
premier signe qu'on mesure autre chose que ce qu'on croit.* Mesuré par empreinte de blob :

```
DistrictMapNavigation.cs             IDENTIQUE  ⇒ ancres exactes à HEAD aussi
DistrictInteriorScreenController.cs  IDENTIQUE  ⇒ idem
LieutenantScreenController.cs        DIFFÉRENT  (P5 glisse de +2)
AppShell.cs                          DIFFÉRENT  (1417 → 1438, +21 ; seules les ancres ≥ 80 glissent)
```
⇒ Les ancres `DistrictMapNavigation` du §3 (`:79-86`, `:90-96`, `:102`, `:177-181`), P1, P6, P7,
P8, P9 et le hook `:1807` sont **exactes aux deux commits**.
⛔ **I2 : ne PAS écrire « toutes les ancres du §3 ».** Le §3 porte aussi deux ancres `AppShell`
(`:663-672`, `:736-740`) et **celles-là glissent** — `:736` @`5768e3d` est à **`:757`** à HEAD.
*C'est le verdict uniforme de la v5 par l'autre bout : « toutes fausses » puis « toutes exactes »,
et les deux fois l'énumération ne couvrait qu'un seul fichier.*
⇒ **Base d'ancrage : `5768e3d` par défaut, déclarée PAR ANCRE quand elle diffère.** ⚠️ Les deux
ancres du §7 (`AppShell.cs:771`, `:1323`) sont **@HEAD** : à `5768e3d` elles valent `:750` et
`:1302`. Appliquer « +21 » à des ancres déjà @HEAD les déplacerait vers des lignes sans rapport. ⇒ **R1 les re-mesure à son ouverture**, par symbole quand c'est possible, jamais
par numéro recopié. *Un décalage uniforme de quelques lignes est précisément ce qu'un coder ne peut
pas deviner.*

### PERSIST — 9 clusters. **7 déjà couverts, 2 à découvert.**

| # | ce qui est cuit | ancre @`5768e3d` | hook |
|---|---|---|---|
| **P1** | `ZoomLevels` de la navigation | `Configure` appelé `:613`, composant créé **uniquement** `:602`, enfant de `root` | **`:1807` SEUL** |
| **P2** | la bande des 4 panneaux d'Accueil | `PoserBandeAccueil:688` | `RebatirPanneauxAccueil…` |
| **P3** | `ShellChrome.Top/BottomInsetPx` | `PublierInsetsDuChrome:820-821` | `AppShell.cs:1352` |
| **P4** | insets de zone sûre du district | `EnterDistrict:273-275` → `SetSafeInsets` → `:119-120,127-128`, relus `:383`,`:518` | ⛔ **AUCUN** |
| **P5** | feuille de l'écran Famille | `LieutenantScreenController.cs:1027-1030` | ⛔ **AUCUN** |
| **P6** | `fondRt.sizeDelta = tex / scaleFactor` | `:393` → `:458` | **`:1807` SEUL** |
| **P7** | letterbox du titre | `:473-476` | **`:1807` SEUL** |
| **P8** | tailles/offsets des cellules | `:646`, `:684-686` | **`:1807` SEUL** |
| **P9** | `ficheRoot.offsetMin` ← `BottomInsetPx` | `:1507` ; `BuildFiche(root):1415` | **`:1807` SEUL** |

⚠️ **La rangée P2 fantôme est CORRIGÉE** : les v2/v3/v4 envoyaient R1 « re-vérifier » un P2 non
publié tout en publiant, une rangée plus bas, la bande d'Accueil — **qui EST P2**. Un lecteur ne
pouvait pas savoir s'il y avait 2 ou 3 trous. Il y en a **2** : P4 et P5.
⇒ **`:1807` est l'unique hook de CINQ clusters.** C'est le fait qui tranche §3.
⛔⛔ **LE CRITÈRE D'APPARTENANCE À UN « CLUSTER » N'A JAMAIS ÉTÉ ÉCRIT — trouvé par R1, sept
versions et quatre revues ⊥ après la première publication du compte.** Le document annonce
**20 = 9 PERSIST + 11 TRANSIENT** depuis la v1 et **ne dit nulle part ce qui fait qu'un cluster
est un cluster**. ⇒ Les trois nombres ne sont **pas reproductibles**, et personne — ni R1, ni une
revue — ne peut « re-vérifier » une table dont l'appartenance n'est pas définie.

**Deux critères MÉCANIQUES ont été essayés, et les deux échouent** (mesuré, portée
`Assets/Scripts/{Shell,CityMap,Operational,ShellContracts}`) :

| critère essayé | définition | rend |
|---|---|---|
| **A** — par état persisté | un champ/propriété qui STOCKE une valeur dérivée de la résolution | **1** |
| **B** — par site de reconstruction | un groupe d'écritures restauré par UN appel de hook | **3** |

⇒ **Ni 1 ni 3 n'approchent 20.** Aucun critère mécanique simple ne rend ce compte.

⇒ **CONCLUSION, et elle change la nature de ②** : le découpage en clusters est **SÉMANTIQUE et
fait à la main** — chaque rangée nomme *une pièce de géométrie que le joueur perçoit comme une
chose* (les paliers de zoom, la bande de panneaux, la feuille de l'écran Famille, la letterbox du
titre…), pas une classe syntaxique. **Ce n'est pas un défaut en soi** : un inventaire à la main
est légitime. Le défaut est de l'avoir présenté comme un **compte**, donc comme quelque chose
d'opposable, alors qu'il n'est **vérifiable qu'article par article**.

⛔⛔ **B1 de la v8 — LA RÈGLE DE LA v8 SE CONTREDISAIT, ET SON SEUL UTILISATEUR L'A REMPLACÉE POUR
S'EN SERVIR.** Elle exigeait qu'un cluster soit « **LU après la frame qui l'a écrite** » puis
définissait TRANSIENT comme « **recalculé à chaque lecture** » — **mutuellement exclusifs** :
une valeur recalculée à chaque lecture n'est jamais lue *après* la frame qui l'écrit, l'écriture et
la lecture sont le même acte. ⇒ Lecture littérale : **TRANSIENT est vide**. Lecture large : la
clause **ne filtre rien**. ★ Et ce n'est pas une hypothèse : R1 a appliqué (ii) **littéralement**
pour les PERSIST et l'a **remplacée** par « méthode nommée lisant une grandeur de résolution » pour
les TRANSIENT — *la même clause avec deux sens dans le même rapport, donc deux moitiés de compte
qui ne sont pas dans la même unité.* **La forme E, appliquée à notre propre règle.**
⇒ **Et elle ne portait pas les critères qui font l'essentiel du filtrage** : sur les 23 candidates
de R1, la clause (iii) en retire 9, mais **la déduplication** (−5) et **le grain** (9 → 6) viennent
de critères que la règle ne contenait pas. **Quatre nombres — 14, 11-14, 9, 6 — du même corpus.**
Le nom du défaut était déjà au §11 : *« un prédicat énumérable SANS RÈGLE DE GRAIN rend n'importe
quel nombre »* — écrit pour les livrables, jamais repassé sur le §2 qui venait d'en créer un.

⇒ **RÈGLE D'APPARTENANCE — v9, en QUATRE pièces, dont trois que R1 a dû inventer sur le terrain :**
1. **Appartenance** : *une **méthode ou un champ NOMMÉ** qui lit une grandeur liée à la résolution.*
   *(remplace « lue après la frame qui l'écrit », qui n'a jamais servi à ça)*
2. **Déduplication** : *un **ÉCRIVAIN** d'un cluster déjà compté n'est pas un cluster distinct.*
   *(R1 a dû l'appliquer pour retirer 5 candidates ; elle n'était écrite nulle part)*
3. **Perception** : *porte un nom que le joueur ou la maquette reconnaît comme UNE chose.*
4. **Grain** : ***une chose perçue = un cluster***, quel que soit le nombre de méthodes qui la
   servent. ⇒ l'ancrage du fond compte pour **1**, pas 3.
⇒ **PERSIST / TRANSIENT n'est PAS un critère d'appartenance, c'est le DISCRIMINANT qu'on applique
après** : **PERSIST** si la valeur survit à un changement de résolution **sans être recalculée**
(⇒ fausse, à rebâtir) ; **TRANSIENT** si elle est **recalculée à chaque lecture** (⇒ se répare
seule). *C'est là que « lue après la frame qui l'écrit » a un sens, et nulle part ailleurs.*
⚠️ **Conséquence assumée : sous la règle de grain (4), R1 publie 9 méthodes pour 6 CHOSES perçues.**
Le compte à retenir est **6**, et la LISTE reste ce qui fait foi. R1 doit republier au grain déclaré.
⇒ **② devient donc une tâche BORNÉE et non la reproduction d'un nombre** : vérifier dans le corps
les **9 PERSIST nommées** (chacune a son ancre, elles sont vérifiables une par une), et énumérer
les TRANSIENT **par la même règle**, en publiant chaque nom avec son ancre. **Le compte tombe à la
fin ; il n'est pas la preuve.**
⚠️ Deux TRANSIENT déjà innocentées (`MajEchelleFamille`, `EchelleMaquette.LargeurCanvas`) le sont
**par l'invariance de la largeur logique**, pas par le critère « recalculé à chaque appel » — le
dire, sinon la règle a l'air de les couvrir et ne les couvre pas.

⚠️⚠️ **PIÈGE ÉVITÉ EN MESURANT CECI, et il aurait été convaincant** : un balayage des sites de
géométrie rend **20 sites « cuits »** — un nombre qui **coïncide exactement** avec les 20 clusters.
Ce n'est **pas la même grandeur** : un cluster GROUPE plusieurs sites. Écrire « les 20 se
retrouvent » aurait été une **forme E** — deux quantités comparées sans être mesurées dans la même
unité — rendue crédible par une coïncidence numérique. ⇒ ***Le nombre qui tombe juste est le
moment de vérifier l'UNITÉ, pas de conclure.***

## 3. La reconstruction — et la garde de cadrage, RÉÉCRITE

**DÉCISION (inchangée) : appeler `:1807`, en sauvegardant et restaurant le cadrage autour de
l'appel.** Interdire l'appel découvrirait P1, P6, P7, P8, P9 ; « repositionner » sans reconstruire
créerait une seconde trajectoire parallèle, la dette que `AppShell.cs:663-672` dénonce.

⛔⛔ **CE QUE LA v4 A ÉCRIT ICI ÉTAIT LA 5ᵉ OCCURRENCE DU MOTIF, ET C'EST LE BLOQUANT PRINCIPAL DE
SA REVUE.** La v4 a nommé, au bon endroit, que `Configure` **reconstruit** les paliers, **repose**
l'index de référence et **redérive** le pan — puis, huit lignes plus bas, elle a asserté sur
**l'index** et sur **la position de pan**. Le contrôle que ce document impose à tout le monde,
appliqué à lui-même :

- **(a) quel monde dégénéré la garde prétend-elle tuer ?** « le joueur perd son cadrage ».
- **(b) est-il exprimable dans l'index et la position ?** **NON.** L'index est un rang dans un
  tableau **que la reconstruction rebâtit**, et la position est en unités locales dont l'échelle
  dépend de la résolution.
- **(c) le monde le plus dégénéré qui rend l'assertion VRAIE** — il y en a **trois**, tous ancrés :

| | monde dégénéré | pourquoi l'assertion reste VERTE |
|---|---|---|
| **c1** | le tableau des paliers change de contenu | `:90-96` : `{1,2,3}` à une résolution, `{1, contain, 2, 3}` à une autre. **Même rang, autre zoom** — le docstring `:80-86` donne lui-même trois résolutions travaillées et conclut que le rang de référence n'est *jamais supposé être 0* |
| **c2** | la restauration est un no-op silencieux | `:177-181` : `ZoomTo` **retourne immédiatement** si le rang demandé est celui en cours. Un joueur au palier de référence qui a **pané** ne voit jamais son pan restauré, et l'assertion sur le rang est verte puisque le rang n'a pas changé |
| **c3** | le rang restauré est hors bornes | le tableau passe de longueur 3 à 4 selon la résolution ; `:180` **clampe** en silence ⇒ atterrissage sur un autre palier, assertion verte |

⇒ **ASSERTIONS DE CADRAGE — v6, après DEUX bloquants sur la v5 :**

⛔⛔ **B2 de la v5 — `CurrentScale` N'EST PAS UNE GRANDEUR INVARIANTE.** La v5 l'a choisie « la
grandeur du zoom, jamais son rang » : **c'est `ZoomLevels[ZoomIndex]`**, un élément du tableau
**MÊME** que la reconstruction rebâtit, lu un cran plus bas. Et l'unique mutateur d'échelle prend
un **rang** (`ZoomTo(int newIndex, …)`), donc l'ensemble atteignable de `CurrentScale` **est
exactement `ZoomLevels`**, reconstruit. Dès que la valeur d'avant sort du tableau d'après — le
palier `contain`, que le docstring `DistrictMapNavigation.cs:79-86` chiffre à ≈1,333 à 1440×3200
et ≈0,375 à 1280×720 contre `{1,2,3}` à 1080×1920 — **l'assertion est insatisfaisable par la
surface publique**. La rendre satisfaisable exigerait un setter d'échelle continue, qui casserait
l'invariant `CurrentScale == ZoomLevels[ZoomIndex]` dont dépendent `ZoomTo:183-195` et
`PanBy:170` ; ou de choisir des résolutions où le tableau ne bouge pas, c'est-à-dire **éviter le
monde que l'assertion existe pour détecter** — et contredire §6.1 qui impose une seconde largeur.
⇒ *Une garde qu'on ne peut satisfaire qu'en cassant ce qu'elle protège se remplace.*

⇒ **LA GRANDEUR QUI SURVIT EST LE RÔLE DU PALIER**, et la v5 ne l'a jamais envisagée : *contain
reste contain, ×1 reste ×1*. La règle de restauration s'écrit donc en trois temps —
**rôle → valeur atteignable à la nouvelle résolution → tolérance NOMMÉE** (la même exigence que
§4.3 pose déjà pour le delta de l'émetteur). **C'est CETTE règle qu'on asserte**, pas une valeur.

1. **le rôle du palier** est celui d'avant (contain / ×1 / ×2 / ×3).
2. **le point de carte sous le centre du viewport** — invariant de résolution, contrairement à
   `anchoredPosition`.
3. ⛔⛔ **B1 de la v5 — L'ANTI-VACUITÉ DISJONCTIVE EXCLUAIT LE MONDE QU'ELLE DEVAIT COUVRIR.**
   La v5 écrivait « `CurrentScale != ZoomLevels[rang de référence]` **OU** point ≠ focus initial ».
   Or `1f` est **toujours** dans le tableau (`:90`), donc `ZoomLevels[rang de référence] == 1f` à
   toute résolution : le premier disjoint signifie *« le joueur n'est PAS au palier de
   référence »*. **Et c2 exige littéralement l'inverse** — *un joueur AU palier de référence qui a
   pané*, dont la cause est le retour anticipé `DistrictMapNavigation.cs:181`. Un scénario qui satisfait la garde par le
   disjoint 1 **ne peut pas, par construction, exercer `:181`** : les deux assertions sont vertes
   et c2 vit en production. *La garde certifie le défaut, 6ᵉ occurrence.*
   ⇒ **DEUX SCÉNARIOS NOMMÉS, chacun avec le monde dégénéré qu'il tue** :
   - ~~**S1**~~ — **SUPPRIMÉ en v10** : le monde qu'il visait (c2) est **inatteignable** au corpus disponible. Voir le bloc B2 ci-dessous et le §8.
   - **S2 — hors palier de référence.** Tue **c1** (même rang, autre zoom). ⚠️ **PAS c3** — voir ci-dessous : c3 n'est atteignable à aucun couple disponible.
   *Une disjonction laisse le scénario choisir lequel il satisfait ; deux scénarios ne le laissent pas.*

   ⛔⛔ **B3 de la v6 — ET LES DEUX SCÉNARIOS ÉTAIENT VIDES, parce qu'ils contraignaient l'ÉTAT DU
   JOUEUR et jamais LE MONDE.** Le dépôt mesure lui-même que le monde n'existe pas aux résolutions
   du harnais :
   - **S1 était vide en portrait.** `DistrictMapNavigation.cs:227-229` : `ClampAxis` rend **`0f`**
     quand le contenu tient dans le viewport. Or `DistrictMapNavigationPlayModeTests.cs:502-515`
     établit que sur **les trois formats portrait réels** le fond (1080×1920) tient **entier à ×1**.
     ⇒ `PanBy` rend `(0,0)` quoi qu'on fasse, `:181` n'est jamais exercé, et les deux assertions
     sont **vertes parce que rien n'a pu bouger**. *7ᵉ occurrence, et cette fois dans le correctif
     écrit pour la 6ᵉ.*
   - **S2 était sous-dimensionné.** `BuildZoomLevels:87-97` n'ajoute `contain` que s'il diffère de
     `{1,2,3}`. Aux deux seuls points que le harnais exerce (1080×1920 et 1080×2400) `contain == 1`
     **des deux côtés** ⇒ tableau identique ⇒ ni c1 ni c3 ne peuvent survenir.

   ⇒ **CONDITIONS DE MONDE, écrites — et les valeurs sont déjà dans un `[TestCase]` commité** :
   | | condition de monde | couple de résolutions | garde de capacité |
   |---|---|---|---|
   ⛔⛔ **B2 de la v9 — S1 EST SUPPRIMÉ, et l'inversion de la v9 était un NON-SEQUITUR.**
   La v9 raisonnait : *« c2 exige un pan À RESTAURER, donc `contain < 1` À L'ARRIVÉE »*. **Faux** —
   un pan à restaurer doit exister **là où il est SAUVEGARDÉ**, donc **au DÉPART**. Et la table
   ci-dessous établit qu'au départ portrait, au palier de référence, **il n'existe aucun pan**.
   ⇒ Le nom même de la ligne — « épinglé au palier de référence, **AVEC un pan** » — décrivait un
   monde que sa propre condition interdisait.
   ⇒ **Et le défaut avait migré de l'assertion vers la GARDE DE CAPACITÉ.** « Asserter
   `PanPosition != zero` APRÈS la reconstruction » est **satisfaite par c2** — qui ne restaure rien
   et laisse en place le cadrage de `Configure:149` — et **ROUGE sur le correctif juste**, qui
   restaure `(0,0)`. *Le monde le plus dégénéré qui rend la garde VRAIE est le défaut lui-même.*
   ⇒ **c2 exige `contain < 1` AUX DEUX BOUTS** ; une seule des quatre résolutions l'a. **c2 est donc
   INATTEIGNABLE au corpus disponible, exactement comme c3**, et rejoint le §8 avec son détecteur
   plutôt qu'un scénario incapable de le rencontrer. *C'est le statut que la v9 avait donné à c3 et
   refusé à c2 — la classe fermée sur une instance, jamais repassée sur la population.*
   ⚠️ **Et une condition de DONNÉE, jamais écrite, l'aurait rendu aveugle même au bon couple** :
   `DistrictInteriorScreenController.cs:606-611` pose `initialFocus = Vector2.zero` en l'absence de
   bâtiment joueur ⇒ sans bâtiment, ou avec un barycentre centré en Y, **les deux mondes rendent
   `(0,0)`**. Une condition de monde qui couvre la RÉSOLUTION et pas la DONNÉE est incomplète.

   | **S2** | les deux points doivent rendre des `ZoomLevels` de **longueurs différentes** | **1080×1920 ↔ 1440×3200** (`contain` 1 vs 1,3333 ⇒ 3 vs 4 paliers) | asserter `ZoomLevels.Length` **différent** aux deux points |

   **La mesure qui fonde ces deux couples — refaite en VALEURS, pas en prose** (`ClampAxis` rend
   `0` dès que le contenu tient dans le viewport, `DistrictMapNavigation.cs:227-229`) :
```
   1280x720   contain=0,3750   contenu > viewport : Y   ⇒ pan possible à ×1 : OUI
   1080x1920  contain=1,0000   ni X ni Y               ⇒ pan FORCÉ à (0,0)
   1080x2400  contain=1,0000   ni X ni Y               ⇒ pan FORCÉ à (0,0)
   1440x3200  contain=1,3333   ni X ni Y               ⇒ pan FORCÉ à (0,0)
```
   ⇒ **Aux trois formats portrait, au palier de référence, il n'existe AUCUN pan.** Le couple de la
   v8 (`1280×720 → portrait`) mettait donc le pan **au départ** et l'interdisait **à l'arrivée** :
   son assertion « le point de carte sous le centre est préservé » aurait **rougi sur le correctif
   JUSTE**, et les deux mondes — restauration correcte, et c2 qui ne restaure rien — rendaient le
   **même observable `(0,0)`**. *Aveugle au défaut qu'elle existe pour voir, ET fausse sur le bon
   code.* ⇒ **Inversé.**

   ⛔⛔ **B5 de la v8 — ET c3 N'EST ATTEIGNABLE À AUCUN COUPLE DES QUATRE RÉSOLUTIONS MESURÉES.**
   c3 veut un rang clampé qui atterrisse sur un **autre rôle**. Or `contain` vaut au plus **1,3333**
   sur tout le jeu, donc le palier supplémentaire s'insère **toujours avant ×3** ⇒ `Length-1` est
   **toujours ×3** des deux côtés ⇒ clamper le seul rang hors bornes retombe **toujours sur ×3**.
   **c3 est indétectable par construction ici**, et le resterait pour toute résolution où
   `contain < 3`.
   ⇒ **C'est un DÉDUIT, pas un scénario** : porté au §8 avec son détecteur, et **S2 ne prétend plus
   le tuer** — elle ne tue que **c1**. *Le dire, comme la v8 l'a bien fait pour c2 en portrait→
   portrait : un scénario qui ne peut pas rencontrer son monde ne le rate pas par malchance.*
   ⚠️ **Et le dire** : c2 n'est **pas atteignable** dans le sens portrait → portrait. Un scénario
   qui l'ignore ne le rate pas par malchance, il ne peut pas le rencontrer.
   ★ *Le design avait ouvert ce fichier pour `PanBy:170`, afin d'établir un invariant — et n'a
   jamais demandé à `ClampAxis`, sept lignes plus bas, ce qu'il fait d'un pan à ×1.* **Ouvrir un
   fichier ne le classe que sur la question qu'on lui a posée.**

⛔⛔ **ET LE POINT QUE LA v4 A RETOURNÉ À L'ENVERS — il commande le découpage.** Elle a écrit que
l'état est « lisible sans accesseur neuf, donc ce n'est pas un différé ». **Lisible n'est pas
restaurable.** Surface publique complète, mesurée : le rang est `{ get; private set; }`, la
position est un getter **sans setter**, et le seul point d'entrée qui pose un cadrage prend un
focus **en unités locales** — or la taille du fond est elle-même divisée par le facteur d'échelle
(`DistrictInteriorScreenController.cs:458`), donc **le même point de carte a un focus différent à
chaque résolution**. Passer « le même focus » après un changement de taille est **une forme E**,
celle que le §4 nomme pour l'émetteur et que la v4 n'a pas appliquée à son propre §3.
⇒ **Le chemin de restauration est un MÉCANISME NEUF** : il doit être écrit (quel appel, dans quel
ordre, avec quelle conversion d'unités), et il porte donc sa propre garde. **C'est un livrable, il
a un propriétaire au §11.**
⚠️ La destruction est **différée** ⇒ **double `yield`**, et **l'ORDRE est imposé** : chrome →
panneaux → district. ⚠️ **m2 : l'ancre ne l'établit qu'à MOITIÉ.** `AppShell.cs:736-740` dit
« après `RebatirChromePourResolutionCourante()`, jamais avant » — donc **chrome → panneaux**, et
**rien sur la position du district** relativement aux panneaux. Les deux lectures sont sûres (les
deux lisent les insets du chrome), mais l'ordre district↔panneaux est **prescrit sans ancre** :
R2 le mesure ou l'écrit comme un choix assumé.

## 4. L'émetteur — la grandeur ET, pour la première fois, le MÉCANISME

**Grandeur (tranchée en v3, inchangée)** : le couple `(renderingDisplaySize, SafeAreaProvider())`.
`renderingDisplaySize` change quand la cible de rendu bascule **et** quand l'OS redimensionne ;
c'est la seule des trois grandeurs essayées qui voie les deux. Seule, elle est **aveugle à la
classe zone-sûre**, qui porte 4 des 9 clusters PERSIST dont les deux trous.
⚠️ **Les deux termes ne sont pas dans la même unité (forme E)** : l'un est en pixels d'écran,
l'autre en pixels de cible. **Écrire la conversion**, ne pas laisser deux unités s'additionner.

⛔⛔ **CE QUE LES QUATRE VERSIONS N'ONT JAMAIS ÉCRIT : COMMENT L'ÉMETTEUR FONCTIONNE.** Balayage du
corps de la v4 : `amorç` 0 · `delta` 0 · `frame` 0 · `debounce` 0 · le hook nommé **2 fois, dans la
table d'existence d'API du §1 uniquement, jamais comme mécanisme**. Le §4 tranchait la grandeur et
**rien d'autre**.
⇒ Or le §3 décide que l'émission **détruit `root`**. **Le monde dégénéré est donc la destruction
périodique de la vue du joueur** — et il est documenté dans le code que ce document cite déjà
(`AppShell.cs:803-805` @design) : *les hauteurs de rect ne sont valides qu'après une passe de
layout, et une valeur lue dans la frame de création rend un zéro parfaitement plausible.* Un
émetteur qui sème sa référence dans sa frame de création émet **un faux positif à la frame
suivante**. ⇒ **Ni (a) ni (b) ne peuvent le voir** : (a) compare à un montage natif, et une
reconstruction parasite **converge vers ce même montage natif** ; (b) ne le voit que si l'émission
parasite tombe après le pan, ce qui est un hasard d'ordonnancement.

⇒ **MÉCANISME, ÉCRIT :**
1. **Déclencheur du PREMIER terme** : `OnRectTransformDimensionsChange` (existence mesurée §1) sur
   un composant porté par le nœud racine du canvas — **pas** un sondage par frame.
   ⛔⛔ **B3 de la v5 — CE DÉCLENCHEUR NE PEUT PAS OBSERVER LE SECOND TERME.** Il ne se déclenche
   que sur un changement de dimensions du RectTransform. Or `androidRenderOutsideSafeArea: 1`
   (§0) : l'app dessine **sous** l'encoche, donc la surface couvre l'affichage et **la zone sûre
   peut changer sans que le rect bouge** (barres système, régime de découpe) ⇒ aucun événement ⇒
   le second terme n'est **jamais relu**, et il est inerte. La grandeur avait été choisie en v3
   précisément pour cette classe ; le mécanisme de la v5 rétablissait l'aveuglement une couche
   plus bas, **et le § ne disait nulle part QUAND le second terme est échantillonné.**
   ⇒ **Règle d'échantillonnage du SECOND terme, écrite** : relu à chaque rappel de rect **ET** sur
   `OnApplicationFocus` / `OnApplicationPause` — les deux moments où le système peut changer la
   découpe sans toucher la taille. Ce n'est pas un sondage par frame et la cadence est nommée.
   ⚠️ **Non vérifiable statiquement** : que ces rappels couvrent réellement toutes les transitions
   de zone sûre d'Android. Si R2 mesure qu'ils ne suffisent pas, le repli est un sondage à cadence
   **écrite**, jamais un sondage implicite.
2. **Amorçage** : la référence est semée **après `Canvas.ForceUpdateCanvases()` ET une frame
   écoulée**. Jamais dans la frame de création. *C'est le piège du facteur d'échelle lu trop tôt,
   qui rend une valeur PLAUSIBLE et non une erreur.*
3. **Delta** : tolérance **nommée en pixels**, jamais l'égalité flottante nue.
4. **Non-émission** — ⛔⛔ **B4 de la v5 : SA FENÊTRE S'OUVRAIT APRÈS LES FRAMES OÙ VIT LE
   DÉFAUT.** Le monde dégénéré est un faux positif *à la frame qui suit le semis*, et le semis a
   lieu **pendant** la séquence de montage (§4.2) ; ouvrir le compteur « après le montage » le
   laisse donc hors fenêtre ⇒ `0` ⇒ **vert sur le défaut exact**. Et un contrôle positif dans un
   scénario **séparé** prouve que le compteur sait monter, jamais que dans CE scénario l'émetteur
   était attaché, abonné, et observait le bon objet — composant absent ou objet désactivé rendent
   `0` aussi.
   ⇒ **Forme corrigée, en deux temps dans LE MÊME scénario** : (i) ouvrir la fenêtre **à
   l'attachement, avant le semis**, et asserter `0` sur **montage + N frames** ; (ii) **en aval des
   N frames**, changer la taille et asserter **exactement 1 ÉMISSION**. Le zéro et le un sortent alors du **même
   instrument armé** — c'est ça, l'anti-vacuité, et non un contrôle positif ailleurs.
   ⛔ **I7 : compter des ÉMISSIONS, jamais des « reconstructions ».** Le §7 établit **3** chemins
   de reconstruction et le §3 impose de les appeler tous les trois dans l'ordre ⇒ **une émission
   vaut trois reconstructions**. Un compteur de reconstructions rendrait `3` et l'assertion `1`
   serait **rouge sur le correctif juste**. *Un compte nu ne dit pas ce qu'il compte.*
   ⚠️ **Non vérifiable statiquement** : qu'un redimensionnement OS produise UN rappel et non N.
   Si R2 mesure N, l'assertion devient `≥ 1` **avec la raison écrite**, jamais un seuil ajusté
   après coup pour faire passer.

## 5. P4/P5 — ils sont DÉJÀ observables ; le changement de production prescrit en v4 est ANNULÉ

⛔⛔ **LA PRÉMISSE DU §5 DE LA v4 ÉTAIT RÉFUTÉE PAR LES DEUX LIGNES DE LOG QU'ELLE CITAIT.** Elle a
lu la colonne `Bottom` des deux lignes — invariante — et **pas la colonne `Top` des mêmes deux
lignes**. Re-mesuré indépendamment sur `scratchpad/runA-1820.log` :

```
$ python3 -c "…re.findall(r'ShellChrome\.(Top|Bottom)=([0-9.]+)'…)"
   Top    : valeurs distinctes = ['170.3', '275.0']   (2 lignes)   ← VARIE de 104,7
   Bottom : valeurs distinctes = ['294.4']            (2 lignes)   ← invariante
```
Or P4 et P5 consomment **la somme** (`insets de zone sûre + hauteur de barre + débord`), pas le
seul terme de zone sûre. ⇒ **Le terme est invariant, la somme ne l'est pas, et c'est la somme
qu'ils lisent.** P4/P5 sont donc **déjà observables dans le harnais, sans aucun changement de
production**.
⚠️ **I8 — MAIS OBSERVABLES SUR QUELLE CLASSE ?** Les deux points de mesure sont `Screen=640x480` et
un montage natif 1080×1920 ; **dans l'éditeur la zone sûre vaut le plein écran, donc son terme est
0 aux DEUX points.** Les 104,7 de variance viennent **entièrement** de la hauteur de barre et du
débord. ⇒ P4/P5 sont observables **comme clusters de GÉOMÉTRIE**, et leur dépendance
**ZONE SÛRE** ne l'est toujours pas — c'est exactement l'objet de ⑳, le livrable qui n'avait aucun
propriétaire dans la v5. *La boucle se referme là, et il faut l'écrire plutôt que la laisser
implicite.*
⚠️ Et la donnée qui porte cette annulation **n'est pas dans le dépôt** (`scratchpad/` non tracké) :
aucun lecteur futur ne peut la re-dériver. **R1 commite le log, ou un extrait réduit, avec ⑤.**

⇒ **DÉCISION ANNULÉE.** Le changement prescrit par la v4 était, mesuré : **(i)** non nécessaire ;
**(ii)** non compilable tel qu'écrit — la méthode visée est `static`, le canvas est d'instance, donc
« lui faire lire le canvas » n'est pas une substitution mais un refactor que le design ne
prescrivait pas ; **(iii)** porteur de la forme E qu'il nomme lui-même sans écrire la conversion ;
**(iv)** **sans effet joueur**, le document disant lui-même qu'en production c'est un no-op.
⇒ C'est exactement le motif que ce programme vient de payer : *un correctif dont le seul effet est
de rendre l'instrument observable, sur un chemin que le joueur n'emprunte pas.*
⇒ **À la place : le seam qui existe déjà.** `AppShell.cs:793` **@`5768e3d`** (= `:814` à HEAD — ⚠️ **I1 : la v6 annonçait cette correction dans son message de commit et ne l'avait PAS portée ; la ligne était byte-identique**) expose un délégué statique
remplaçable, exercé par une suite du dépôt. **Deux valeurs de provider aux deux points de mesure**
donnent la distinction que §6.2 exige, **sans toucher la production**.
⚠️ **I6 : cette décision était assignée à R1 alors que son instrument (⑳) appartient à R3, qui court
en DERNIER.** Si le verdict était « le seam ne suffit pas », le refactor tomberait dans R2 — déjà
passé. ⇒ **Une sonde réduite du seam remonte en R1 (㉕**, et non ⑤ qui est « imprimer les insets après bascule » — I2 de la v9 : le correctif de B3 avait atteint la table et pas la ligne du corps qui ASSIGNE**), et le refactor éventuel devient un
**R4 conditionnel** — et **défini ici**, parce que la v8 l'invoquait sans le définir, ce qui est
mot pour mot le BLOQUANT que le §11 adresse aux v1–v4 (« *invoquaient R1/R2/R3 sans jamais les
DÉFINIR* ») : **classe fermée sur trois instances et rouverte sur la quatrième, dans le même
document** (I4).
> **R4 — refactor du calcul d'insets. CONDITIONNEL** : ouvert **uniquement** si la sonde ㉕ de R1
> montre que le seam ne suffit pas. Livrables : le passage `static` → instance de
> `SafeAreaInsetsLocal`, **et** la conversion d'unités écran ↔ cible. Falsifiable : la zone sûre
> rend des valeurs distinctes aux deux points de mesure. Gate : revue ⊥.
> ⚠️ **Hors plancher tant qu'il est conditionnel** — mais il a un paragraphe, ce qui est
> précisément ce qui manquait.
⇒ **Ne toucher au calcul d'insets QUE si cette sonde montre que le seam ne suffit pas** — et
alors écrire le refactor `static`→instance ET la conversion d'unités.

## 6. La falsifiable

⛔ **DEUX propriétés, DEUX assertions, DEUX SCÉNARIOS :**
- **(a) GÉOMÉTRIE** : converge chiffre pour chiffre avec un montage natif à la taille d'arrivée
  (critère validé le 2026-08-30 : la bascule et le natif rendent `[0.0,1394.3 .. 1080.0,1776.3]`
  des deux côtés). ⛔ **(a) tourne dans un scénario SANS pan/zoom délibéré.** Sinon un cadrage
  restauré déplace la position **et** l'échelle du nœud de scène, donc **tous les rects écran de sa
  descendance**, et (a) **rougirait sur le correctif JUSTE**. *(Variante : nommer explicitement le
  sous-arbre exclu et la raison — mais deux scénarios coûtent moins cher qu'une exclusion à tenir.)*
- **(b) CADRAGE** — ⛔⛔ **B2 de la v6 : CE PARAGRAPHE ÉTAIT BYTE-IDENTIQUE À LA v5 ET PRESCRIVAIT
  LES DEUX GRANDEURS QUE LE §3 VENAIT DE RETIRER**, dans une phrase qui dit « voir §3 ». C'était
  **la seule occurrence PRESCRIPTIVE** du document — les autres sont la démonstration que la
  grandeur ne convient pas — donc un coder lisant le § intitulé « La falsifiable » réimplémentait
  les deux bloquants que le §3 venait de fermer. *La jointure du socle dans sa forme la plus pure :
  le texte que la correction devait rouvrir et n'a pas rouvert.*
  ⇒ **Ce qui est asserté, et rien d'autre** : la règle **rôle → valeur atteignable → tolérance
  nommée** (§3), dans les **deux scénarios S1 et S2** avec leurs conditions de monde (§3), chacun
  portant sa **garde de capacité**. Ni `CurrentScale` nu, ni le rang, ni la position brute, ni la
  garde de non-défaultitude — les quatre sont réfutés au §3.
1. ⛔ **DEUX LARGEURS *ET* DEUX ASPECTS**, la raison de chaque variation écrite à côté — une largeur
   seule laisse passer ce qui est cuit depuis le facteur d'échelle ; un aspect seul, ce qui est cuit
   depuis le rect. ⚠️ **Mesuré : le harnais n'a jamais exercé qu'UNE largeur** (`1080x1920` et
   `1080x2400`, facteur `0,8438` pour les deux). L'instrument est **paramétré en largeur et
   hauteur**, donc c'est faisable — mais **le second point de largeur est un livrable réel** et il a
   un propriétaire au §11.
2. **Zone sûre à valeurs DISTINCTES entre les deux points** (§5), via le seam — pas seulement non nulle.
3. **ASSERTER**, jamais imprimer : le test de montage natif porte **7 assertions et aucune sur le
   débordement** (recompté au commit du design, corps `AccueilPanneauxGeometriePhotoPlayModeTests.cs:315-431`). *Monde dégénéré : tous.*
4. **Contrôle positif** : saboter la reconstruction doit rougir **en nommant l'écran**.
   ⚠️ **Ancre du patron, due depuis 4 versions et enfin fournie** :
   `Tools/charpente-item05-C3-implementation-notes.md:95` (`passed=221 failed=1`) et `:131`
   (`passed=218 failed=4`), corroborées par `scratchpad/runC-restored.log:19456` et
   `scratchpad/runA-1820.log:19530`. *Sans ancre, c'était un témoignage.*
5. **Anti-vacuité** : nombre d'écrans éprouvés > 0 et **nommé**.
6. ⛔ **LA CATÉGORIE DU JUGE — et la classe est plus large que l'instance.** Mesuré au commit du
   design : **30 fichiers sur 68 ne sont joués par aucun juge** (18 hors-catégorie + 12 sans
   catégorie). ⛔ **I3 : la v5 disait « le fichier qui porte l'instrument de ce lot est hors filtre » sans le
   nommer, et c'était FAUX pour l'instrument qu'elle utilise.** Les lignes de diagnostic dont sort
   la mesure du §5 **et** les 7 assertions du §6.3 vivent dans
   `AccueilPanneauxGeometriePhotoPlayModeTests.cs`, `[Category("Charpente")]` — **dans le filtre
   aux deux commits**. Le fichier réellement hors filtre est `VuePrincipaleCapturePlayModeTests.cs`
   (`[Category("Capture")]`), que la v5 ne nommait pas non plus alors que la phrase décide ⑬ et ⑮.
   ⇒ **Deux catégories déjà dans le filtre conviennent** et sont mesurables sur place : `Charpente`
   et `W3U2`. **R3 en choisit une, l'ajoute si besoin, et publie le compte des fichiers rallumés**
   — en s'attendant à des **rouges dormants, qui sont une information et non une régression**.
   ⇒ **R3 publie aussi la table des 30**, sinon le geste ferme une instance et laisse la classe.

## 7. Les comptes déjà faits — avec leur commande, ou déclarés non reproduits

⚠️ **Ce paragraphe collait ses comptes sans commande dans le bloc même où il écrivait que tout
compte collé sans sa commande est un témoignage.** La règle s'applique d'abord au document qui la
pose. Statut honnête de chacun :

⛔⛔ **B6 de la v5 — MA « RÉFUTATION » DU COMPTE DE LA v4 ÉTAIT FAUSSE, ET ELLE PRESCRIVAIT DE
SUPPRIMER UN COMPTE JUSTE.** La v5 écrivait « *aucune classification ne rend 19* ». Recompté
(oracle python, population `Assets/**/*.cs`, motif `TopInsetPx|BottomInsetPx`) :

```
PROD : occurrences=12  lignes=11  occ.hors-comm=9   lignes.hors-comm=9
TEST : occurrences=19  lignes=16  occ.hors-comm=13  lignes.hors-comm=10
```
⇒ **Le « 12 » que la v5 ACCEPTE en prod est un compte d'occurrences, commentaires COMPRIS. La MÊME
règle appliquée aux tests rend exactement 19.** Le compte de la v4 reproduisait ; c'est ma
réfutation qui ne tenait pas. **Deux lignes du même tableau étaient comptées dans deux unités
différentes, aucune déclarée**, et l'écart était imputé au prédécesseur puis converti en livrable
— un coder l'exécutant aurait **supprimé un compte correct**.
⇒ *Une correction est plus dangereuse que l'erreur qu'elle corrige : elle arrive avec l'autorité
d'une mesure.* Et c'est arrivé dans le paragraphe qui écrit que la règle s'applique d'abord au
document qui la pose.
⇒ **RÈGLE : chaque compte déclare son UNITÉ et sa PORTÉE** — les clauses (ii)+(iii) du §0,
appliquées ici.

| compte | valeur | unité · portée | statut |
|---|---|---|---|
| locataires implémentant le contrat | **10** | classes · arbre | ✅ reproduit deux fois |
| chemins de reconstruction | **3** | points d'entrée publics · arbre | ⚠️ **corrigé** : la v5 disait « 1 », vrai du seul district (`DistrictInteriorScreenController.cs:1807`) ; il y a aussi `AppShell.cs:771` et `:1323`, que le §3 énumère lui-même |
| sites sur les insets publiés — **prod** | **12** | occurrences, commentaires compris · `Assets/Scripts` | ✅ |
| sites sur les insets publiés — **test** | **19** | occurrences, commentaires compris · `Assets/Tests` | ✅ **la v4 avait raison** |
| écritures de géométrie, 8 autres locataires | 72 → 82 | non déclarée | ⛔ ne se reproduit pas ; **mais « 0 non constante » est confirmé par sonde indépendante** — la conclusion tient, le compte non |
| occurrences du compte de démo | **16 / 8 fichiers** | littéraux · `Assets/Scripts` · **commentaires EXCLUS** | ⚠️ **I4 : la portée déclarée était fausse** (« arbre »). Sur le dépôt entier c'est 75/45, commentaires compris. Et les deux lignes voisines déclarent « commentaires COMPRIS » : *deux unités dans la colonne écrite pour fermer ce défaut* |
| `matchWidthOrHeight` | **5**, toutes en commentaire | occurrences · arbre | ✅ |
| scènes sans `CanvasScaler` sérialisé | **5** `.unity`, dont 0 sérialisé | fichiers `.unity` · arbre | ⚠️ **corrigé** : la v5 disait « 42 scènes » — le dépôt en porte **5**, et 42 ne reproduit sous aucune lecture (`.asset`=40, `.unity+.prefab+.asset`=45). La conclusion (largeur logique invariante) tient |

## 8. DÉDUITS restants — chacun avec son option conservatrice

| # | déduit | option conservatrice |
|---|---|---|
| 1 | `renderingDisplaySize` suit-elle un redimensionnement de fenêtre **OS** ? | **statiquement prouvée** sur la bascule de cible (3 maillons) ; **non exécutée** sur l'OS. Repli : comparer `(rect, facteur)` |
| 2 | le split-screen réel | **couche 4, non substituable** |
| 3 | les TRANSIENT — **combien de CHOSES perçues** (le « 11 » de la v1 est abandonné, cf. §2) | R1 les publie **au grain déclaré** et les re-vérifie |
| 4 | la valeur des insets **après** bascule (le log ne l'imprime qu'aux deux montages) | R1 l'imprime ; le §5 tient déjà sur la variance entre montages |
| 5 | ⚠️ **NEUF (I5)** — `OnApplicationFocus`/`OnApplicationPause` couvrent-ils toutes les transitions de zone sûre d'Android ? | repli **écrit** : sondage à cadence nommée. *Le §4 créait ce déduit et le §8, byte-identique depuis la v5, ne le portait pas — un registre « restants » qui n'est pas rouvert par la section qui en crée un est faux dès la ligne suivante.* |
| 6 | ⚠️ **NEUF (I7)** — un redimensionnement OS produit-il UN rappel de dimensions ou N ? | l'assertion devient `≥ 1` **avec la raison écrite**, jamais un seuil ajusté après coup |
| 7 | ⛔ **c3 — un rang clampé atterrit sur un AUTRE rôle : INATTEIGNABLE** tant que `contain < 3`. **B1 de la v9 : elle annonçait « porté au §8 avec son détecteur » et ne l'avait fait NI ici NI dans une cellule — le livrable oublié des DEUX côtés, que la bijection ne peut pas voir.** | **détecteur ㉖** : asserter `ZoomLevels[Length-1] == 3f` aux 4 résolutions. VERT aujourd'hui, **ROUGE dès qu'une résolution rend `contain ≥ 3`** — une épingle sur une VALEUR PRÉSENTE, jamais sur une absence |
| 8 | ⛔ **c2 — le no-op de `ZoomTo:181` : INATTEIGNABLE**, il exige `contain < 1` **aux deux bouts** et une seule des 4 résolutions l'a (B2) | **détecteur ㉗** : asserter qu'**exactement une** des résolutions rend `contain < 1`. Rouge dès qu'une seconde apparaît — c'est-à-dire dès que c2 devient testable |

## 9. Hors périmètre — ÉNONCÉ PÉRIMÉ, corrigé

⚠️ **Le §9 de la v4 interdisait d'écrire une surcharge d'identité de démo tant que l'user n'aurait
pas tranché. L'user a tranché, et le lot a été livré SEPT MINUTES après le commit de ce design**
(4 commits, 3 revues ⊥, APPROUVÉ, jamais compilé — son registre de non-prouvés est dans
`Tools/demo-identity-ce-qui-reste-NON-PROUVE.md`). Le seul paragraphe du document à porter une
interdiction opérationnelle était **périmé sept minutes après sa naissance**, sans mode d'emploi de
péremption — ce que le §0 exige de tous les autres.
⇒ **Rien de ce lot ne dépend plus de cette question.** Ce qui reste vrai et utile : deux éditeurs en
Play Mode sur le même compte de démo reproduiraient l'incident de gouverneur du 2026-08-21, et
c'est **précisément ce que la surcharge livrée supprime**.

## 10. La règle et ses corollaires

> **Le correctif énumère la population de l'INSTRUMENT qu'il vient d'écrire, pas celle de la PROPRIÉTÉ.**

★ Une règle posée dans un document s'applique d'abord à ce document. ★ Corriger une garde fait
descendre le défaut d'une grandeur. ★ Avant d'écrire « non mesuré », grep le fichier de tests de la
classe. ★ Le correctif crée le défaut suivant : demander *quelle propriété je SUPPRIME*.
★ Un instrument d'analyse faux produit une classification fausse **qui a l'air mesurée**.
★★★ **v4 → v5, et c'est le corollaire le plus cher du lot** : *nommer le bon monde dégénéré ne
suffit pas — il doit être **EXPRIMABLE dans la grandeur qu'on asserte**.* Cinq grandeurs justes en
apparence, cinq fois aveugles au défaut nommé quelques lignes plus haut. ⇒ **Avant d'écrire une
garde : simuler le monde dégénéré DANS la grandeur choisie et vérifier qu'il la fait bouger.**
★★★ **LE COROLLAIRE DE MÉTHODE DE LA v7, ET C'EST UNE PASSE OBLIGATOIRE, PAS UN CONSEIL** :
*après chaque correction, **diff PAR SECTION**, et pour chaque section à **0 delta**, demander quel
nombre, quelle borne ou quelle clause elle porte qui vient d'être changé AILLEURS.* Mesuré sur la
v6 : `§0`, `§1`, `§8`, `§9`, `§10` étaient **byte-identiques** à la v5 — et `§8` était devenu
**faux** du fait de `§4`, tandis que le §6(b), lui aussi inchangé, prescrivait les deux grandeurs
que le §3 venait de retirer. **Trois des quatre bloquants de la v6 vivaient dans du texte que la
correction aurait dû rouvrir et n'a pas rouvert.** La règle existait déjà au socle ; ce document ne
l'avait jamais fait tourner sur lui-même. Elle coûte cinq minutes.
★★★ **ET LE COROLLAIRE DE MÉTHODE DE LA v5** : *mesurer l'arbre de travail au lieu de l'arbre du
commit jugé fabrique des accusations fausses.* La revue ⊥ de la v4 a construit **trois** findings
de cette façon et **les a tous les trois rétractés elle-même** — tous « dans le sens qui
l'arrangeait ». C'est le même vice qui produit la dérive d'ancres du §2. ⇒ **Toute mesure qui juge
un commit se fait `git show`/`git ls-tree` SUR CE COMMIT**, jamais dans l'arbre de travail.

## 11. CHUNKS — R1/R2/R3 DÉFINIS, et l'arithmétique du découpage

⛔⛔ **Les quatre versions précédentes invoquaient R1/R2/R3 comme propriétaires d'obligations sans
jamais les DÉFINIR.** Balayage du corps de la v4 : `R1` 5 occurrences (toutes des renvois), `R2`
**ZÉRO**, `R3` 1 (« nommer la catégorie de R3 » — un chunk qui n'existait nulle part). Aucune
section ne disait ce que chacun livre, dans quel ordre, avec quelle falsifiable.
⇒ C'est le `somme ≠ total` que ce document reproche aux autres depuis la v1, **sur son propre
découpage**, et c'est un BLOQUANT de sa revue.

⛔⛔ **B5 de la v5 — « 6+6+5 = 17 = plancher ✅ » ÉTAIT UNE TAUTOLOGIE.** Le plancher avait été lu
**sur la table qu'il validait** : ses deux membres venaient de la même liste, donc le contrôle est
resté **VERT sur le défaut qu'il existe pour attraper**. C'est mot pour mot le reproche que ce §
adresse aux v1–v4, reproduit un cran plus bas — et c'est la 3ᵉ fois que ce document commet la
faute qu'il dénonce dans le paragraphe où il la dénonce.
⇒ **Le plancher se dérive du CORPS par un prédicat énumérable** : *tout impératif non conditionnel
des §0 à §8*. Énumération publiée avec ses ancres, PUIS assignation. **Quatre obligations
n'avaient aucun propriétaire** dans la v5 — dont le remplacement exact du changement de production
annulé par le §5, sans quoi la dépendance zone-sûre de P4/P5 n'est exercée par rien.

| chunk | livrables | falsifiable | gate |
|---|---|---|---|
| **R1 — mesures et publications** | ① re-mesurer les ancres @HEAD, **par fichier** (§2) · ② **(a)** vérifier dans le corps les **9 PERSIST nommées** ET **(b)** énumérer les TRANSIENT par la règle d'appartenance (§2), nom + ancre, **au grain déclaré** — le compte tombe à la fin, il n'est pas la preuve *(la v8 avait perdu la moitié (a) : le corps l'assignait, la cellule ne la demandait pas — I1)* · ④ **déclarer l'unité et la portée** de chaque compte du §7 *(et NON « retirer le 19 », cf. B6)* · ⑤ imprimer les insets **après** bascule · ㉖ **détecteur de c3** · ㉗ **détecteur de c2** (§8 — les deux mondes inatteignables portent une épingle qui rougit le jour où ils deviennent testables) · ㉕ **la sonde réduite du seam** (§5 — sans elle, la décision « ne toucher au calcul d'insets QUE si le seam ne suffit pas » dépend d'un instrument qu'aucun chunk ne possède : forme C dans le découpage) · ㉔ **commiter le log** qui porte la mesure du §5 (aujourd'hui dans `scratchpad/`, non tracké ⇒ non re-dérivable) · ⑥ écrire prédicat + commande + portée + **contrôle positif par motif** du contrôle §0 · ⑱ écrire la **règle de clôture** de l'ensemble de fichiers du §0 | chaque publication porte **commande + sortie collée + unité + portée** ; contrôle positif ET négatif | revue ⊥ |
| **R2 — production** | ⑦ l'émetteur sur le couple, mécanisme complet · ⑧ le chemin de restauration (rôle → valeur → tolérance) · ⑨ le retrait des deux énoncés datés, **avec le contrôle de retrait de R1 dans le MÊME commit** *(un numéro cerclé ne vit que dans la cellule qui le POSSÈDE — une référence croisée se nomme en toutes lettres, sinon l'oracle d'arithmétique compte une possession)* · ⑲ **écrire la conversion d'unités** des deux termes du couple (§4) · ㉓ **l'ordre de reconstruction district↔panneaux**, mesuré ou assumé (§3, m2) | ⑩ non-émission fenêtre-à-l'attachement + `1` en aval, **même scénario** · ⑪ (a) et (b) dans **deux scénarios distincts** · ⑫ anti-vacuité du cadrage par **S1 et S2 nommés** (non disjonctive) | revue ⊥ |
| **R3 — le juge** | ⑬ choisir la catégorie, l'ajouter, **et couvrir `ChromeSafeAreaPlayModeTests` + `ChromeMultiResolutionPlayModeTests`** (cf. I2) · ⑭ publier le compte des rallumés et **classer chaque rouge** démasqué / régression · ⑮ la seconde largeur de capture · ③ publier la table des 30 non joués · ⑯ le contrôle positif de sabotage, ancré · ⑳ **zone sûre à valeurs DISTINCTES aux deux points, via le seam** (§6.2) · ㉑ **ASSERTER le débordement**, jamais l'imprimer (§6.3) | ⑰ le test visé **relancé seul par son nom complet** · ㉒ anti-vacuité : **nombre d'écrans éprouvés > 0 et nommé** (§6.5) | revue ⊥ |

⛔⛔ **B4 de la v6 — L'ÉNUMÉRATION ÉTAIT ANNONCÉE ET JAMAIS PUBLIÉE, donc les deux membres du
contrôle sortaient ENCORE de la table.** La seule dérivation re-faisable de « 22 » était de compter
les numéros cerclés de la table elle-même. **B5 n'était pas fermé, il était redécoré.**
⚠️ **Et le prédicat ne DÉTERMINE PAS de nombre tant que sa GRANULARITÉ n'est pas fixée** : les
obligations s'emboîtent (§4 porte 4 sous-clauses sous ⑦, §0 en porte 5 sous ⑥), et le total varie
de ±7 selon le grain retenu. *Un prédicat « énumérable » sans règle de grain rend n'importe quel
nombre, et le contrôle est décoratif dans les deux sens.*
⇒ **RÈGLE DE GRAIN, écrite** : *un livrable = une obligation que R\<i\> peut livrer et faire
juger seule*. Les sous-clauses d'un même mécanisme (les 4 du §4, les 5 du §0) comptent pour **un**.

**ÉNUMÉRATION PUBLIÉE — dérivée du CORPS, ancre par ancre** (c'est elle le plancher ; la table est
l'autre membre, et les deux sont désormais construits séparément) :

| # | ancre du corps | obligation | chunk |
|---|---|---|---|
| 1 | §0 fin | prédicat + commande + portée + contrôle positif par motif | R1 ⑥ |
| 2 | §0 fin | règle de clôture de l'ensemble de fichiers | R1 ⑱ |
| 3 | §2 | re-mesurer les ancres, base déclarée par ancre | R1 ① |
| 4 | §2 | énumérer les TRANSIENT **par la règle d'appartenance du §2**, chacune avec son nom et son ancre | R1 ② |
| 5 | §3 | chemin de restauration : rôle → valeur → tolérance | R2 ⑧ |
| 6 | §3 | ordre de reconstruction district↔panneaux, mesuré ou assumé | R2 **㉓** |
| 7 | §3 | S1/S2 avec conditions de monde et gardes de capacité | R2 ⑫ |
| 8 | §4 | émetteur sur le couple, mécanisme complet | R2 ⑦ |
| 9 | §4 | conversion d'unités des deux termes | R2 ⑲ |
| 10 | §4 | assertion de non-émission, fenêtre à l'attachement | R2 ⑩ |
| 11 | §5 | imprimer les insets après bascule | R1 ⑤ |
| 12 | §5 | commiter le log qui porte la mesure du §5 | R1 **㉔** |
| 25 | §5 | **la sonde réduite du seam** — l'instrument dont dépend la décision d'annulation | R1 **㉕** |
| 26 | §8 | **détecteur de c3** — `ZoomLevels[Length-1] == 3f` aux 4 résolutions | R1 **㉖** |
| 27 | §8 | **détecteur de c2** — exactement une résolution à `contain < 1` | R1 **㉗** |
| 13 | §5 | zone sûre à valeurs distinctes via le seam | R3 ⑳ |
| 14 | §6 | (a) et (b) dans deux scénarios distincts | R2 ⑪ |
| 15 | §6.1 | seconde largeur de capture | R3 ⑮ |
| 16 | §6.3 | ASSERTER le débordement | R3 ㉑ |
| 17 | §6.4 | contrôle positif de sabotage, ancré | R3 ⑯ |
| 18 | §6.5 | anti-vacuité : écrans éprouvés > 0 et nommé | R3 ㉒ |
| 19 | §6.6 | choisir la catégorie, l'ajouter, couvrir les 5 fichiers hors filtre | R3 ⑬ |
| 20 | §6.6 | publier la table des 30 | R3 ③ |
| 21 | §6.6 | publier les rallumés et classer chaque rouge | R3 ⑭ |
| 22 | §6.6 | relancer le test visé seul par son nom complet | R3 ⑰ |
| 23 | §7 | déclarer unité et portée de chaque compte | R1 ④ |
| 24 | §0/§2 | retrait des deux énoncés datés, contrôle dans le MÊME commit | R2 ⑨ |

**Bijection cellules ↔ énumération : 25 = 25, R1 8 · R2 8 · R3 9, aucun orphelin.** Instrument
commité : `Tools/plancher-decoupage.py` (m3 — *un chiffre dont l'instrument n'est pas dans le
dépôt est un témoignage*), avec son jeu de symboles **EXPLICITE** et non une plage Unicode.

⛔⛔ **B2 de la v8 — ET CE CONTRÔLE NE FERME PAS LA CLASSE QU'IL A L'AIR DE FERMER.** La v8
affirmait que ses deux membres venaient de « sources DIFFÉRENTES ». **C'est faux** : l'énumération
et la table sont écrites dans le même §11, à la suite, par la même main. Un livrable oublié **des
DEUX côtés** reste invisible — et la revue en a trouvé un (la sonde du seam, B3, désormais ㉕).
⇒ **Ce que la bijection prouve** : aucun numéro orphelin, aucun numéro possédé deux fois. **Ce
qu'elle ne prouve pas** : que le plancher soit complet. *Un dispositif qui nomme un mécanisme réel
est le plus dangereux de sa famille — un lecteur vérifie qu'il existe, le trouve vert, et conclut.*
⇒ **Le geste qui fermerait vraiment B2** — et il n'est PAS fait : dériver l'énumération du corps
par un **balayage exécutable** (tout impératif non conditionnel des §0–§8), publier sa sortie, et
la comparer à la table. Tant qu'il n'existe pas, **le plancher est déclaré, pas mesuré**, et cette
ligne le dit à la place d'un ✅.

⚠️ **Contrôle de cohérence de propriétaire** (absent de la v5, qui disait « R3 publie la table des
30 » dans le corps et l'assignait à R1 dans la table) : tout « R\<i\> fait X » du corps doit
désigner le même chunk que la cellule qui porte X. Vérifié à cette version.

**Ordre imposé** : R1 → R2 → R3. R2 dépend des ancres re-mesurées de R1 ; R3 rallume des tests qui
doivent d'abord passer sous R2.
⛔ **Aucun chunk ne se livre sans sa revue ⊥, et la petitesse d'un delta n'est jamais un motif de
la sauter** — **zéro BLOQUANT réfuté sur neuf versions** *(le compte se lit en tête, I1)*, et à chaque tour le défaut
vivait dans le correctif du tour précédent.
