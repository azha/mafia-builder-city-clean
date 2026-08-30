# Lot « redimensionnement » — **v5** — le client survit à un changement de taille en cours de vie

> **Ruling user 2026-08-30** : « supporter le redimensionnement pour de vrai ».
> **v1 NOT_APPROVED** (5B/7M/4m) · **v2 NOT_APPROVED** (3B/5M/5m) · **v3 NOT_APPROVED** (2B/4M/6m) ·
> **v4 NOT_APPROVED** (4B/6M/6m). Rapports hors dépôt : `/tmp/revue-redimensionnement-design{,-v2,-v3,-v4}.md`.
> *(v3 était omis de l'en-tête de la v4 — un document dont la thèse est la comptabilité honnête ne
> peut pas escamoter un de ses propres verdicts. Corrigé ici : quatre versions, quatre refus.)*
>
> ★★★ **LE MOTIF, CINQ FOIS DE SUITE, ET IL S'EST DÉPLACÉ VERS L'INTÉRIEUR À CHAQUE TOUR** :
> v1 émetteur sur une grandeur que le harnais ne bouge jamais · v2 garde sur la NULLITÉ là où le
> défaut vit dans la VARIANCE · v3 un mécanisme de production neuf que sa propre falsifiable ne
> voit pas · **v4 une falsifiable de cadrage qui asserte sur les deux grandeurs que le §3 de la
> MÊME version démontre, six lignes plus haut, ne pas survivre.**
> ⇒ Ce n'est plus une observation, c'est un **taux** : 4 versions, 4 refus, **14 BLOQUANTS, zéro
> réfuté**, et à chaque tour le défaut vivait dans le correctif du tour précédent. La conséquence
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

## 2. Les 20 clusters — PUBLIÉS

⚠️ **Toutes les ancres de ce document sont datées de `5768e3d`** et **`AppShell.cs` a pris +21
lignes depuis** (1417 → 1438, 6 commits). Elles étaient exactes à leur commit et sont **toutes
fausses à HEAD**. ⇒ **R1 les re-mesure à son ouverture**, par symbole quand c'est possible, jamais
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
⛔ **R1 publie les 11 TRANSIENT avec ancre**, re-vérifiés dans le corps — *un fait rapporté reste
DÉDUIT tant qu'on n'a pas lu le corps*. Deux (`MajEchelleFamille:1841`,
`EchelleMaquette.LargeurCanvas:114`) sont innocentés **par l'invariance de la largeur logique**.

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

⇒ **ASSERTIONS DE CADRAGE, RÉÉCRITES SUR DES GRANDEURS INVARIANTES :**
1. **`CurrentScale`** — la **grandeur** du zoom (`:102`), jamais son rang.
2. **le point de carte sous le centre du viewport** — invariant de résolution, contrairement à
   `anchoredPosition`.
3. **garde anti-vacuité obligatoire** : asserter que l'état d'AVANT **diffère de l'état par
   défaut** (`CurrentScale != ZoomLevels[rang de référence]` **ou** point de carte ≠ focus
   initial). Le mot « délibéré » de la v4 n'est pas une assertion : rien n'exigeait que l'état
   d'avant fût non-défaut, donc la garde était satisfaite par un scénario qui ne panne pas.

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
panneaux → district (`AppShell.cs:736-740`), les deux derniers lisant les insets que le chrome publie.

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
1. **Déclencheur** : `OnRectTransformDimensionsChange` (existence mesurée §1) sur un composant porté
   par le nœud racine du canvas — **pas** un sondage par frame.
2. **Amorçage** : la référence est semée **après `Canvas.ForceUpdateCanvases()` ET une frame
   écoulée**. Jamais dans la frame de création. *C'est le piège du facteur d'échelle lu trop tôt,
   qui rend une valeur PLAUSIBLE et non une erreur.*
3. **Delta** : tolérance **nommée en pixels**, jamais l'égalité flottante nue.
4. **Non-émission** : monter, laisser passer **N frames sans rien changer**, asserter **0
   reconstruction** — avec **contrôle positif** prouvant que le compteur sait monter.

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

⇒ **DÉCISION ANNULÉE.** Le changement prescrit par la v4 était, mesuré : **(i)** non nécessaire ;
**(ii)** non compilable tel qu'écrit — la méthode visée est `static`, le canvas est d'instance, donc
« lui faire lire le canvas » n'est pas une substitution mais un refactor que le design ne
prescrivait pas ; **(iii)** porteur de la forme E qu'il nomme lui-même sans écrire la conversion ;
**(iv)** **sans effet joueur**, le document disant lui-même qu'en production c'est un no-op.
⇒ C'est exactement le motif que ce programme vient de payer : *un correctif dont le seul effet est
de rendre l'instrument observable, sur un chemin que le joueur n'emprunte pas.*
⇒ **À la place : le seam qui existe déjà.** `AppShell.cs:814` expose un délégué statique
remplaçable, exercé par une suite du dépôt. **Deux valeurs de provider aux deux points de mesure**
donnent la distinction que §6.2 exige, **sans toucher la production**.
⇒ **Ne toucher au calcul d'insets QUE si une mesure de R1 montre que le seam ne suffit pas** — et
alors écrire le refactor `static`→instance ET la conversion d'unités.

## 6. La falsifiable

⛔ **DEUX propriétés, DEUX assertions, DEUX SCÉNARIOS :**
- **(a) GÉOMÉTRIE** : converge chiffre pour chiffre avec un montage natif à la taille d'arrivée
  (critère validé le 2026-08-30 : la bascule et le natif rendent `[0.0,1394.3 .. 1080.0,1776.3]`
  des deux côtés). ⛔ **(a) tourne dans un scénario SANS pan/zoom délibéré.** Sinon un cadrage
  restauré déplace la position **et** l'échelle du nœud de scène, donc **tous les rects écran de sa
  descendance**, et (a) **rougirait sur le correctif JUSTE**. *(Variante : nommer explicitement le
  sous-arbre exclu et la raison — mais deux scénarios coûtent moins cher qu'une exclusion à tenir.)*
- **(b) CADRAGE** : voir §3 — `CurrentScale` **et** le point de carte sous le centre, jamais le rang
  ni la position brute, **avec** la garde anti-vacuité sur la non-défaultitude de l'état d'avant.
1. ⛔ **DEUX LARGEURS *ET* DEUX ASPECTS**, la raison de chaque variation écrite à côté — une largeur
   seule laisse passer ce qui est cuit depuis le facteur d'échelle ; un aspect seul, ce qui est cuit
   depuis le rect. ⚠️ **Mesuré : le harnais n'a jamais exercé qu'UNE largeur** (`1080x1920` et
   `1080x2400`, facteur `0,8438` pour les deux). L'instrument est **paramétré en largeur et
   hauteur**, donc c'est faisable — mais **le second point de largeur est un livrable réel** et il a
   un propriétaire au §11.
2. **Zone sûre à valeurs DISTINCTES entre les deux points** (§5), via le seam — pas seulement non nulle.
3. **ASSERTER**, jamais imprimer : le test de montage natif porte **7 assertions et aucune sur le
   débordement** (recompté au commit du design, corps `:315-431`). *Monde dégénéré : tous.*
4. **Contrôle positif** : saboter la reconstruction doit rougir **en nommant l'écran**.
   ⚠️ **Ancre du patron, due depuis 4 versions et enfin fournie** :
   `Tools/charpente-item05-C3-implementation-notes.md:95` (`passed=221 failed=1`) et `:131`
   (`passed=218 failed=4`), corroborées par `scratchpad/runC-restored.log:19456` et
   `scratchpad/runA-1820.log:19530`. *Sans ancre, c'était un témoignage.*
5. **Anti-vacuité** : nombre d'écrans éprouvés > 0 et **nommé**.
6. ⛔ **LA CATÉGORIE DU JUGE — et la classe est plus large que l'instance.** Mesuré au commit du
   design : **30 fichiers sur 68 ne sont joués par aucun juge** (18 hors-catégorie + 12 sans
   catégorie). Le fichier qui porte l'instrument de capture de ce lot est dans une catégorie
   **absente du filtre** : *l'instrument même de ce lot n'a jamais tourné sous le juge.*
   ⇒ **Deux catégories déjà dans le filtre conviennent** et sont mesurables sur place : `Charpente`
   et `W3U2`. **R3 en choisit une, l'ajoute si besoin, et publie le compte des fichiers rallumés**
   — en s'attendant à des **rouges dormants, qui sont une information et non une régression**.
   ⇒ **R3 publie aussi la table des 30**, sinon le geste ferme une instance et laisse la classe.

## 7. Les comptes déjà faits — avec leur commande, ou déclarés non reproduits

⚠️ **Ce paragraphe collait ses comptes sans commande dans le bloc même où il écrivait que tout
compte collé sans sa commande est un témoignage.** La règle s'applique d'abord au document qui la
pose. Statut honnête de chacun :

| compte | valeur | statut |
|---|---|---|
| locataires implémentant le contrat | **10** | ✅ reproduit par la revue ⊥ |
| chemins de reconstruction | **1** | ✅ reproduit |
| sites prod sur les insets publiés | **12** | ✅ reproduit |
| sites **test** sur les mêmes | v4 annonçait 19 | ⛔ **NE SE REPRODUIT PAS** — 13 en test, ou 17 avec les commentaires. **Aucune classification ne rend 19.** R1 le recompte ou le retire |
| écritures de géométrie dans les 8 autres locataires | 72 → 82 | ⛔ ne se reproduit pas ; **mais « 0 non constante » est confirmé par sonde indépendante** — la conclusion tient, le compte non |
| occurrences du compte de démo | 26 → **16 / 8 fichiers** | ✅ corrigé : je comptais les commentaires |
| `matchWidthOrHeight` | 5, **toutes en commentaire** · 0 sérialisé sur 42 scènes | ✅ ⇒ la largeur logique est bien invariante |

## 8. DÉDUITS restants — chacun avec son option conservatrice

| # | déduit | option conservatrice |
|---|---|---|
| 1 | `renderingDisplaySize` suit-elle un redimensionnement de fenêtre **OS** ? | **statiquement prouvée** sur la bascule de cible (3 maillons) ; **non exécutée** sur l'OS. Repli : comparer `(rect, facteur)` |
| 2 | le split-screen réel | **couche 4, non substituable** |
| 3 | les 11 TRANSIENT | R1 les publie et les re-vérifie |
| 4 | la valeur des insets **après** bascule (le log ne l'imprime qu'aux deux montages) | R1 l'imprime ; le §5 tient déjà sur la variance entre montages |

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

| chunk | livrables | falsifiable | gate |
|---|---|---|---|
| **R1 — mesures et publications** | ① re-mesurer TOUTES les ancres @HEAD (§2) · ② publier les 11 TRANSIENT vérifiés dans le corps · ③ publier la table des 30 fichiers non joués (§6.6) · ④ recompter ou retirer le compte non reproduit du §7 · ⑤ imprimer les insets **après** bascule (déduit 4) · ⑥ écrire le prédicat + la commande + la portée du contrôle du §0, exécuté d'abord sur les fichiers INTACTS | chaque publication porte **commande + sortie collée + portée** ; contrôle positif sur un cas connu | revue ⊥ |
| **R2 — production** | ⑦ l'émetteur sur le couple, avec **mécanisme complet** (§4 : déclencheur, amorçage, delta) · ⑧ le **chemin de restauration du cadrage** (§3), mécanisme neuf, avec sa conversion d'unités · ⑨ le retrait des deux énoncés datés du §0, par index | ⑩ **assertion de non-émission** (N frames, 0 reconstruction) + contrôle positif · ⑪ assertions (a) et (b) du §6 dans **deux scénarios distincts** · ⑫ garde anti-vacuité sur la non-défaultitude du cadrage d'avant | revue ⊥ |
| **R3 — le juge** | ⑬ choisir la catégorie (§6.6), l'ajouter au filtre · ⑭ publier le compte des fichiers rallumés et **classer chaque rouge dormant** démasqué / régression · ⑮ la **seconde largeur** de capture (§6.1) · ⑯ le contrôle positif de sabotage, ancré | ⑰ le test visé **relancé seul par son nom complet** — un filtre de catégorie inexact exécute un autre jeu et le déclare vert | revue ⊥ |

**Arithmétique** : livrables établis par le corps de ce document = **17**. Assignés : R1 = 6,
R2 = 6, R3 = 5. **6 + 6 + 5 = 17 = plancher.** ✅
⚠️ **Ce contrôle est une falsifiable du DÉCOUPAGE lui-même** : si une révision de ce document ajoute
une obligation sans l'assigner, la somme cesse d'égaler le plancher. **Le recompter à chaque
version.**

**Ordre imposé** : R1 → R2 → R3. R2 dépend des ancres re-mesurées de R1 ; R3 rallume des tests qui
doivent d'abord passer sous R2.
⛔ **Aucun chunk ne se livre sans sa revue ⊥, et la petitesse d'un delta n'est jamais un motif de
la sauter** — sur ce lot, 4 versions ont donné 14 BLOQUANTS fondés et zéro réfuté, et les deux
derniers deltas d'un lot voisin faisaient *un mot* et *un nombre* en portant chacun un BLOQUANT.
