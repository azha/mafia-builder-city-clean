# Design — le RETOUR D'APPUI des boutons du client (**v5**) — document AUTONOME

> ⚠️ **MISE À JOUR DU 11/11/2026** (passe de mise à jour documentaire, CLIENT-1 ; le texte d'origine est LAISSÉ tel quel, ces lignes disent ce qui est périmé et où est l'autorité — rien n'est inventé, chaque correction cite sa source).
> - **Le code EXISTE** : l'en-tête ci-dessous (« Aucun code n'existe ») est périmé. Les lots E-R1 à E-R6 sont **fusionnés au cumul client** (`d5dbe22e`) : les 69 boutons passent par `Retour.NouveauBouton`, jugés sur effet réel (rendu + comptage de pixels) ; garde GP « couverture sites : **67 / 69** » (`Journal:923` et `Reputation:1429` non couvrables, `interactable=false`, nommés dans le commit).

> **STATUT — APPROUVÉ PAR ARBITRAGE (f2, 11/11/2026), sans seconde revue.** Texte relu par la revue ⊥ n°1 à `327b6afc` (`revue-v5-n1.md` : NOT_APPROVED, 2 BLOCKING + 5 IMPORTANT + 4 mineurs) ; correctifs de l'auteur au commit **`bf014613`**, ratifiés par f2 (« correctif vérifié par l'auteur » : les preuves avant/après sont à l'**annexe C**). Décisions de f2 portées : relâchement qui saute d'une frame (dette 32, classe C), règle de classement « effet mesuré < plancher ⇒ voile, jamais de k plus bas », E-R1 avant tout code. **N = 69** (mesuré, le 67 est périmé). **Aucun code n'existe** : la session suivante commence par E-R1 (§6), puis le code.

**Ce document REMPLACE le §17 de `design-couche-mouvement.md` v4.8.** Le §17 (et la partie « retour
d'appui » du §8) sont **PÉRIMÉS** à partir d'ici : ils ont été écrits sur l'arbre
`design/conformite-anim-2026-10-07` (HEAD `b7c522a7`) et **11 de leurs citations `fichier:ligne`
d'écran ne tiennent plus sur le cumul** (annexe A, comptées une par une). Ce qui reste valable du §17
est REPRIS ici, par référence,
avec sa citation **re-vérifiée à HEAD**.

**Base de mesure.** Worktree `/home/erutheone/project/mafia-unity-F`, branche
`design/retour-appui-67-boutons`, HEAD **`9b48b2ac`** (cumul client).
**Compte exact du périmé** (annexe A, chaque ligne relue) : sur les citations d'**écran** du §17/§8/du
catalogue que j'ai re-mesurées, **7 sont franchement fausses** (la ligne ne porte plus rien du propos :
`DistrictInteriorScreenController.cs:2312`, `:2282`, `:2128`, `ReputationScreenController.cs:994`,
`TopBarController.cs:940`, `InspectionScreenController.cs:415`, `BandeauEphemere.cs:253`), **3 sont
décalées** (`ExceptionDetailController.cs:570`, `DistrictInteriorScreenController.cs:691`,
`LaSuitePanelController.cs:223`) et **1 n'est pas vérifiable en l'état**
(`ExceptionQueuePanelController.cs:99`). Les citations du **mécanisme** (`Mouvements/`) sont, elles,
**toutes exactes** — le dossier n'a pas bougé (preuve en annexe A).
Toute affirmation sur le code
porte `fichier:ligne` **relu maintenant**, pas recopié de la v4.8 (qui a déjà eu une prémisse fausse :
dette 24).
**Statut : DESIGN. Rien n'est codé, aucun `.cs` n'est touché par ce document, aucun créneau Unity n'a
été pris, aucun typecheck lancé.** Les affirmations de comportement à l'exécution sont des **lectures
de source**, pas des mesures de run ; elles sont marquées là où la distinction décide.

**Décisions en vigueur, non rouvertes ici** (arbitrages f2) : `Echelle` **retirée** du retour d'appui
(08/10, dette 29) ⇒ **teinte + opacité seules** · **deux `Id`** `retour.appui` / `retour.appui-voile`,
pas de 3ᵉ · retour d'appui **jamais refusé** · **Mélange ≤ 10** · G14 par la propriété (les `Id` ne
sont pas des arguments) · B1/B2/B3 de `revue-s17-n5.md` tranchés par f2 (relayés le 11/11), intégrés
comme contraintes (§3.4, §4, §5).

---

## 0. Les décisions qui changeraient l'architecture — en tête

| # | décision | si elle bouge |
|---|---|---|
| **D1** | **Guichet unique de création** : les 69 sites `AddComponent<Button>()` passent par `Retour.NouveauBouton(...)`, et une garde de SOURCE interdit le motif ailleurs (§3.4, GS1) | sans elle, il n'existe aucune structure qui ferme la classe : ni fabrique de `Button` (mesuré : `ProceduralUI.cs` ⇒ **0** occurrence de `Button`), ni crochet « après le premier rendu » (le locataire construit sa mise en page dans son `Start()`, différé d'une frame après `AddComponent` — énoncé par le **commentaire** `AppShell.cs:36-42`, **non mesuré** : m2 ; l'argument qui porte seul est §3.4 (ii), un site produit n instances plus tard). Le repli serait un balayage par frame ou un appel à la main par site : plus de sites, et aucun signal de CI |
| **D2** | **Le relâchement n'est pas animé** : l'appui monte en 90 ms puis **TIENT** ; le relâchement est la **restitution** de `Detacher`, donc immédiate. Les **140 ms** promis par le §8 et par `catalogue-mouvements.md:422` **tombent** → dette 32 (§3.5, preuve mesurée) | si f2 veut les 140 ms : il faut **deux entrées de plus** (une par genre de canal) et une **3ᵉ méthode** de régie passant `retourAppui: true` — donc rouvrir « deux `Id` seulement » et la décision B1. Prix écrit en §3.5 |
| **D3** | **Le cas 5 n'est plus une issue, c'est un ROUGE** : tout bouton reçoit EXACTEMENT UN attachement **dont l'effet franchit le plancher** ; un bouton dont rien ne peut s'assombrir — ou **trop peu** (arbitrage f2 du 11/11 : *un retour invisible est un retour refusé*) — fait rougir la garde de population jusqu'à ce qu'une `surface` soit nommée (§3.1, GP) | la v4.8 comptait un `SansRetour` silencieux ; la v5 n°1 gardait le **handle** et pas l'**effet**. Dans les deux cas « jamais refusé » n'était pas tenu : il était seulement *compté*, puis seulement *attaché* |
| **D4** | **N se mesure à chaque lot** : N = 69 à `9b48b2ac`, 68 à `b7c522a7`, 67 au 08/10 (§1.3). Aucune garde, aucun test, aucun texte ne porte un littéral `67`/`69` | un littéral gelé ⇒ la garde de population devient verte sur un arbre qui a grossi : exactement la classe de défaut que ce lot doit fermer |

---

## 1. L'inventaire COMPTÉ

### 1.1 Ce qui est compté comme « bouton », et ce qui ne l'est pas

Un **bouton** = une instance de `UnityEngine.UI.Button` montée dans l'UI du client. L'UI est
**100 % procédurale** — donc l'inventaire des instances se ramène à l'inventaire des **sites de
création**, et cela se mesure :

```
$ find Assets -name '*.prefab' | wc -l
0
$ rtk proxy grep -rl 'Button' Assets --include='*.unity' | wc -l
0
```
(0 prefab dans tout `Assets` ; aucun des 195 `.unity` — tous des `InitTestScene<guid>` générés — ne
nomme `Button`.) ⇒ **aucun bouton ne vient d'un asset** : tous sont construits par du code.

**Ne sont PAS comptés** (et ne reçoivent pas de retour d'appui dans ce lot — différés, §6.4) :

| ce qui est écarté | compte mesuré à HEAD | raison |
|---|---|---|
| `Scrollbar` | **1** (`ReputationScreenController.cs:960`) | ce n'est pas un `Button` ; son `Transition.None` est posé à `:964`. ⚠️ le §17 et le catalogue citent `:994` : **faux à HEAD** (`:994` est `hle.preferredHeight = …`) |
| `Slider` | **1** (`LieutenantScreenController.cs:4055`) | pas un appui de bouton (un glissement) |
| `TMP_InputField` | **3** (`ShopScreenController.cs:395`, `LieutenantScreenController.cs:4020`, `HighestLeverageCardController.cs:534`) | la saisie a son propre retour (le curseur) |
| `LongPressButton` | **7** sites (`ShopScreenController.cs:341`, `TamponAuComptoir.cs:102`, `DecisionDetailScreenController.cs:717`, `HighestLeverageCardController.cs:498` et `:501`, `DailyReviewScreenController.cs:583` et `:1276`) | ce n'est pas un `Selectable` : c'est un `MonoBehaviour` détecteur (`ShellContracts/LongPressButton.cs:15`). Là où il **partage** le GameObject d'un `Button` (mesuré : `TamponAuComptoir.cs:92` `Button` et `:102` `LongPressButton` sur le même `t`), le bouton est déjà compté ; là où il est seul, l'appui long n'a pas de retour de teinte — dette 33 |
| les `Button` de `Assets/Tests` | **3 lignes nomment le motif, 1 monte un `Button`** (revue n°1, I4) | mesuré : `ReputationScreenPlayModeTests.cs:907` `var temoin = temoinGo.AddComponent<Button>();` **monte** ; `VitrinePlayModeTests.cs:66` et `:69` sont des `StringAssert.DoesNotContain("AddComponent<Button>", …)` — des **chaînes de caractères**, pas des boutons. (Le motif de l'inventaire, avec parenthèses, en compte **2** dans `Assets/Tests` ; la commande ne lit que `Assets/Scripts`, donc N est intact.) Montages de test : **jamais** dans N, **jamais** dans l'inventaire, **jamais** dans GS2/GP — y compris le montage synthétique de GE4 (contrainte f2 B2) |

### 1.2 La commande, et sa sortie collée

```
$ rtk proxy grep -rn --include='*.cs' 'AddComponent<Button>()' Assets/Scripts | wc -l
69
```

Détail par fichier (même motif, regroupé ; `[lignes]`) :

```
 7  Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs  [1606,2732,2846,2887,3978,3999,4132]
 5  Assets/Scripts/CityMap/CityMapController.cs  [586,689,894,1031,1068]
 3  Assets/Scripts/Account/Settings/SettingsScreenController.cs  [283,302,374]
 3  Assets/Scripts/CityMap/DistrictInteriorScreenController.cs  [693,2137,2319]
 3  Assets/Scripts/Operational/Carnet/CarnetScreenController.cs  [578,606,648]
 3  Assets/Scripts/Operational/Conflit/ConflitScreenController.cs  [726,1111,1142]
 3  Assets/Scripts/Operational/Distribution/DistributionScreenController.cs  [718,827,922]
 3  Assets/Scripts/Operational/Exceptions/ExceptionDetailController.cs  [397,569,682]
 3  Assets/Scripts/Operational/Loi/LoiScreenController.cs  [238,366,513]
 3  Assets/Scripts/Shell/AppShell.cs  [1488,1647,2502]
 3  Assets/Scripts/Shell/ExceptionQueuePanelController.cs  [250,342,526]
 3  Assets/Scripts/Shell/HighestLeverageCardController.cs  [471,513,544]
 2  Assets/Scripts/Onboarding/TutorialScreenController.cs  [321,365]
 2  Assets/Scripts/Operational/Selling/SellingScreenController.cs  [441,503]
 2  Assets/Scripts/Shell/DailyReviewScreenController.cs  [590,1101]
 2  Assets/Scripts/Shell/HomeChromeController.cs  [238,252]
 1  Assets/Scripts/CitySim/Inspection/InspectionScreenController.cs  [474]
 1  Assets/Scripts/CoreLoops/Compression/CompressionScreenController.cs  [335]
 1  Assets/Scripts/Operational/Autonomy/AutonomyInboxController.cs  [370]
 1  Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs  [2423]
 1  Assets/Scripts/Operational/Dashboard/DashboardController.cs  [797]
 1  Assets/Scripts/Operational/Delegation/DelegationScreenController.cs  [1528]
 1  Assets/Scripts/Operational/Demolition/DemolitionScreenController.cs  [1458]
 1  Assets/Scripts/Operational/Exceptions/ExceptionQueueController.cs  [605]
 1  Assets/Scripts/Operational/Exceptions/TamponAuComptoir.cs  [92]
 1  Assets/Scripts/Operational/Filiere/FiliereScreenController.cs  [766]
 1  Assets/Scripts/Operational/Forensic/ForensicScreenController.cs  [505]
 1  Assets/Scripts/Operational/Journal/JournalScreenController.cs  [923]
 1  Assets/Scripts/Operational/Reputation/ReputationScreenController.cs  [1429]
 1  Assets/Scripts/Shell/BandeauEphemere.cs  [256]
 1  Assets/Scripts/Shell/DecisionDetailScreenController.cs  [743]
 1  Assets/Scripts/Shell/EcranEchecDeDemarrage.cs  [56]
 1  Assets/Scripts/Shell/LaSuitePanelController.cs  [233]
 1  Assets/Scripts/Shell/TopBarController.cs  [996]
 1  Assets/Scripts/ShellContracts/PiedDEcran.cs  [152]
TOTAL = 69  fichiers = 35
```

Reproduction exacte de ce tableau (zsh ; le glob est **quoté**, sinon zsh mange `--include=*.cs` et
`grep` rend 0 — piège vécu dans cette session) :

```
python3 -c "
import subprocess,collections
out=subprocess.run(['grep','-rn','--include=*.cs','AddComponent<Button>()','Assets/Scripts'],
                   capture_output=True,text=True).stdout.strip().split('\n')
d=collections.OrderedDict()
for l in out:
    f,n,_=l.split(':',2); d.setdefault(f,[]).append(n)
tot=0
for f in sorted(d,key=lambda k:(-len(d[k]),k)):
    tot+=len(d[f]); print('%2d  %s  [%s]'%(len(d[f]),f,','.join(d[f])))
print('TOTAL =',tot,' fichiers =',len(d))"
```

**Les 35 fichiers vivent dans 8 assemblies** — `Account, CityMap, CitySim, CoreLoops, Onboarding,
Operational, Shell, ShellContracts` — et les 7 premières **référencent `ShellContracts`** (mesuré, un
`asmdef` après l'autre ; `Economy` le référence aussi mais ne crée aucun `Button`). ⇒ un **unique**
`Retour.cs` dans `ShellContracts` est atteignable depuis les 69 sites (D1).
`ShellContracts.asmdef` référence `Theme`, `I18n`, `Unity.TextMeshPro` : le `TMP_Text` du prédicat
`Peint` y est lisible, et `Retour.cs` est **hors** du seul dossier scanné par G7
(`MouvementsGardesPlayModeTests.cs:478` : `Path.Combine(Application.dataPath,"Scripts","ShellContracts","Mouvements")`).

### 1.3 « 67 » ne tient plus — et c'est la leçon, pas un détail

```
$ rtk proxy git grep -c 'AddComponent<Button>()' b7c522a7 -- 'Assets/Scripts' | awk -F: '{s+=$NF}END{print s}'
68
$ rtk proxy git grep -c 'AddComponent<Button>()' HEAD      -- 'Assets/Scripts' | awk -F: '{s+=$NF}END{print s}'
69
```

**67** est le compte du 08/10 (`revue-s17-n2.md:13`, `catalogue-mouvements.md:415`,
`revue-catalogue-n4.md:30`, `inventaire-animations.md:81` — quatre documents, une seule mesure). Il
valait **68** au commit du design v4.8, et **69** à HEAD ; le site neuf du dernier intervalle est dans
`Shell/DecisionDetailScreenController.cs` (diff par fichier des deux relevés). **Mon compte fait foi :
N = 69.** Je ne force rien vers 67 : la population **grossit à chaque écran construit**, donc
(a) aucune garde ne portera le littéral, (b) toute garde de population **recompte** à l'exécution, et
(c) le chiffre de ce document est daté de `9b48b2ac`.

### 1.4 Ce que « hors E2 » exclut

« hors E2 » est lu comme : **l'inventaire est établi MAINTENANT, statiquement, en dehors de l'étape de
code E2** (gelée depuis le 08-09/10 : `dettes-design-mouvement.md` 31, « E2e GELÉ, aucun code du retour
d'appui avant un design APPROVED »). Il n'exclut donc **aucun bouton** : il exclut un **moyen** de
compter — le relevé de G9 au créneau, qui appartient à E2. Vérification que la lecture ne change pas N
sous l'autre lecture possible (« exclure les fichiers que E2 migre ») : `Mouvements/` ⇒ **0**
`AddComponent<Button>()`, et les trois fichiers migrés par le §9 qui en portent un
(`TopBarController.cs:996`, `BandeauEphemere.cs:256`, `Gyrophare` : 0) restent des boutons ordinaires
pour ce lot. ⚠️ **Hypothèse explicite** : si f2 entendait autre chose par « hors E2 », c'est le seul
point de ce document qui bouge, et il ne bouge que de 0 à 2 unités (les deux sites nommés ci-dessus).

### 1.5 Un site n'est PAS un bouton à l'écran

Mesuré : le site `DelegationScreenController.cs:1528` (`Button b = zone.AddComponent<Button>();`) est
le **seul** créateur de `Button` de ㉜, et il est atteint par **5** appels de `RendreCliquable`
(`:1176`, `:1177`, `:1338`, `:1361`, `:1396`), chacun dans un constructeur de rangée. ⇒ **un site
produit 0, 1 ou n instances** selon les données servies. Conséquence pour les gardes :

- **N = 69 sites** est la mesure **statique** : c'est l'obligation de couverture du guichet (GS1).
- **le nombre de boutons MONTÉS** est une mesure **d'exécution**, par écran et par état montable :
  c'est ce que comptent GS2 / GP (`GetComponentsInChildren<Button>(true)` sur la racine de l'écran).
  Il est ≥ N et **jamais** écrit en dur.

Confondre les deux produit soit une garde verte par vacuité (69 attendus, 12 montés), soit une garde
rouge par bruit. Les deux comptes sont donc **nommés séparément** partout dans ce document.

### 1.6 Autour du compte, deux nombres utiles (mesurés à HEAD)

- `Selectable.Transition.None` : **17** lignes, dont **16 sur un `Button`** (types vérifiés un par
  un : `fenPorte` `ForensicScreenController.cs:394`, `versLaFamille` `DailyReviewScreenController.cs:55`,
  `versAppro` **`LieutenantScreenController.cs:2846`** (`Transition.None` à `:2847` ; corrigé — revue n°1,
  m1 : un `:N` nu désignait le fichier précédent, qui n'a pas de ligne 2846), `SurfaceButton`
  `HighestLeverageCardController.cs:58`, `ligneOr`
  `DecisionDetailScreenController.cs:166`) et **1 sur la `Scrollbar`** (`ReputationScreenController.cs:964`).
  ⇒ **69 − 16 = 53** boutons perdent leur tintement `ColorTint` par défaut en adoptant le retour
  d'appui, 16 n'avaient déjà rien. (Le « 53 » du §8 était juste par un autre chemin — 67 − 14 — ; il
  reste juste à HEAD par 69 − 16. Le hasard n'est pas une preuve : c'est la mesure de HEAD qui compte.)
- `ContentSizeFitter` : **77** lignes dans **22** fichiers, dont **27** poses
  (`AddComponent<ContentSizeFitter>`). Le §17/dette 29 disent « 75 occurrences dans 22 fichiers » :
  22 fichiers ✔, 75 → **77** lignes à HEAD. Ce qui compte pour nous : **G11 ne mord pas** (§2 P2).

---

## 2. La PROPRIÉTÉ visée — quatre invariants, énoncés sur ce que le joueur perçoit

> **P0 — structurel, avant tout le reste.** La surface que le retour d'appui peint porte son
> `CanvasRenderer`, et sous un `Mask` c'est un `MaskableGraphic` dont `maskable` est vrai. *Pourquoi
> avant* : `AddComponent` à l'exécution **n'honore pas** `[RequireComponent]` — un `Graphic` sans
> `CanvasRenderer` ne dessine rien et la console est muette. Une garde sur la couleur écrite serait
> alors verte sur un objet invisible.

> **P1 — le geste change quelque chose de VISIBLE, et c'est rendu au relâchement.** Pour tout bouton
> monté, actif et `interactable` : entre le rendu au **repos** et le rendu **sous le doigt** (les deux
> pris à la même phase, horloge `Figee`), au moins **12 pixels** du rect de **la cible** diffèrent de
> **≥ 3/255** sur le plus grand canal R/G/B ; et après le relâchement, le rendu **redevient** celui du
> repos (mêmes pixels, à l'epsilon d'écriture près).
> **« La cible » est nommée sans ambiguïté** (revue ⊥ n°1, B2) : pour un `Melange`, la **surface
> peinte** (cas 1-2) ; pour un voile, le **GameObject qui porte le `CanvasGroup`** — `b` en cas 3,
> **`q` en cas 4**, jamais « le rect du bouton » (en cas 4 l'encre vit chez `q`, et rien n'oblige
> l'encre de `q` à tomber dans le rect de `b`).
> **Un effet sous ce plancher est un REFUS** (arbitrage f2, §3.1) : P1 et P2 ne sont pas deux
> propriétés séparées que l'on pourrait satisfaire l'une sans l'autre — un handle non nul dont les
> pixels ne bougent pas viole **P2 autant que P1**.
> *Les deux seuils sont des REUSE, pas des inventions* : `3/255` = `MouvementTunables.SeuilCouleurRendue`
> (`MouvementTunables.cs:76`, `3f / 255f`), le seuil de perception par propriété du design §6.2 ;
> `12 pixels` = le plancher d'anti-vacuité du design §6.3. **Mesuré sur les pixels RENDUS**, jamais sur
> l'arithmétique de `Color` : Unity compose en **linéaire**, et un facteur `× 0,85` sur une encre
> sombre peut rendre moins de 3/255 alors que le calcul sur `Color` annonce le contraire. ⚠️ La garde
> ne se calibre donc **pas** sur un bouton dont l'encre et le fond se confondent : un modèle faux y
> tombe juste.

> **P2 — jamais refusé par la régie.** Au `PointerDown` d'un bouton monté, actif et `interactable`,
> `Retour` obtient **exactement un** handle **non nul**, **dont l'effet franchit le plancher de P1**,
> et l'entrée de ce handle est l'un des **deux**
> `Id` (`retour.appui` ou `retour.appui-voile`) — **y compris** sous un ancêtre `ContentSizeFitter` /
> dans une liste défilante, **y compris** quota non-`Ambiance` plein, **y compris** plafond `Melange`
> plein. Aucune piste vivante n'est évincée, `Refus` est **inchangé**.
> *Pourquoi c'est vrai, mesuré* : (i) `Gardes.G11` n'a que deux branches — `if (c.EstTranslation)`
> (`Gardes.cs:199` ; `EstTranslation ⇔ TranslationX || TranslationY`, `Modele.cs:84`) et
> `else if (c.P == Propriete.Echelle && cible.GetComponentInParent<ContentSizeFitter>(true) != null)`
> (`Gardes.cs:211`), puis `return null` (`:213`) ⇒ **`null` sur `Melange` comme sur `Alpha`**, et
> `Regie.cs:546` (`if (g11 != null) return Refuser(e, g11);`) ne refuse pas. Ce n'est vrai **que** parce
> que l'`Echelle` est retirée : `Gardes.G11` ne voit pas le `Reglage`, un `KAmp = 0` ne l'aurait pas
> neutralisée, et `Creer` consulte G11 **canal par canal** en refusant l'**entrée entière**
> (`Regie.cs:545-546`). (ii) la place réservée : `MouvementTunables.PlacesReserveesRetourAppui = 1`
> (`MouvementTunables.cs:20`) et `plafondAutres = QuotaAlerteRetourTransition − (retourAppui ? 0 : 1)`
> (`Regie.cs:520`), les autres genres s'arrêtant à 15 (`:523`). (iii) le plafond `Melange` : bascule sur
> le voile, comptée **après** un handle non nul (`Regie.cs:94-100`).
> **Ce que la réserve ne neutralise PAS, et qui reste donc à traiter par le design** : deux appuis
> **simultanés** (la réserve est UNE place) ; une entrée `SansHote` (`Regie.cs:509`) ; G8
> (`Regie.cs:512-513`) ; `Couple.Realisable` (`RegieInterne.cs:97-108` — `Melange` exige un `Graphic`
> **sur la cible**, `:102`) ; G12 d'exécution (`Regie.cs:549-553`) ; les 48 pistes (`:537`) et les
> couples épuisés (`:559`). §3.1 et GP disent ce que `Retour` fait de chacun.

> **P3 — Mélange ≤ 10 : ce que ce nombre borne.** `MouvementTunables.PistesMelangeMax = 10`
> (`MouvementTunables.cs:26`) borne le nombre de **PISTES VIVANTES portant au moins un canal
> `Melange`**, **dans une régie** (le client n'en a qu'une, publiée par `AppShell` dans
> `RegieMouvement.Courante`) — pas par écran, pas par `Graphic`, pas par image. Une piste à deux canaux
> `Melange` compte pour **1** (`Regie.cs:526-527` calcule un booléen, `:571` incrémente `nMelange`
> une fois par piste, `:634` le décrémente à la libération ; lecture publique `PistesMelange`
> `Regie.cs:75`, `PlaceMelangeLibre` `:77`). Le refus est à `Regie.cs:529-533` et il est **compté**
> (`RefusMelange`, `:73`).
> *Pourquoi 10* : mesuré en E0 (`MouvementTunables.cs:21-25`) — animer `Graphic.color` **reconstruit
> les lots du canvas**, ≈ 100 fois le coût d'un `CanvasGroup.alpha` (125 µs contre 1,3 µs pour 48
> cibles) ; pire cas compté : 2 virages tenus du chrome + 6 voyants de ⑮ + 1 retour d'appui = 9, plus
> une marge (8 avait été proposé et jugé trop bas). **Limite déclarée** : c'est un coût CPU en
> batchmode sur poste de travail ; aucun seuil GPU n'en est tiré. **Conséquence pour nous** : le retour
> d'appui est, au pire, **1** piste `Melange` par doigt posé, et quand le plafond est atteint il passe
> au voile `Alpha` — qui, lui, ne reconstruit pas les lots (E0 (a)).

> **P4 — teinte et opacité seulement.** Les deux seules propriétés écrites par le retour d'appui sont
> `Melange` (RGB de `Graphic.color`, l'alpha du `Graphic` jamais touché) et `Alpha`
> (`CanvasGroup.alpha`). **Aucune** `Echelle`, aucune translation, aucune rotation, aucun `Eclat`,
> aucun `Remplissage`. Garde de donnée : les deux entrées n'ont, au catalogue, **que** ces canaux
> (§4 GD1) ; garde de propriété : aucun autre site ne peut poser ces deux `Id` (G14, §5 B1).
> *Provenance des deux amplitudes* : `Cible × 0,85` et `Alpha 1 → 0,80` sont des décisions **du
> client**, pas des valeurs recopiées d'une maquette — mesuré : `inventaire-animations.md:81`
> (« Retour d'appui : … **aucune animation d'appui écrite** » dans les 40 paires de maquette). ⇒ pas
> d'oracle CSS à respecter ici, **et pas de changement d'unité sRGB→linéaire à l'origine** ; le piège
> de l'unité reste entier **côté garde** (P1).

---

## 3. La CIBLE de l'effet

### 3.1 Quatre cas, et plus de cinquième

Au `PointerDown`, **à chaque appui** (jamais une décision figée à la pose : l'état qui décide est
mutable — un `targetGraphic` opaque à la construction peut être forcé à α 0 ensuite), `Retour` choisit :

| cas | cible | entrée | mesure qui décide |
|---|---|---|---|
| **1** | la `surface` **nommée au site de création** | `retour.appui` (`Melange` `Absolu`, `CouleurA = Cible` → `CouleurB = Cible × 0,85`) | `RendSurface(surface)` vrai |
| **2** | `b.targetGraphic`, **à défaut** le premier `Graphic` du GameObject du bouton | `retour.appui` | `RendSurface(…)` vrai |
| **3** | le **GameObject du bouton** (son `CanvasGroup`, posé par la régie s'il manque) | `retour.appui-voile` (`Alpha` `Multiplicatif` 1 → 0,80) | `Peint(b)` vrai |
| **4** | le **parent direct** `q` du bouton | `retour.appui-voile` | `Peint(q)` vrai **et** aire(`q`) ≤ 2 × aire(`b`) |
| ~~5~~ | — | — | **supprimé** : voir D3 |

**RÈGLE DE CLASSEMENT — un retour d'appui INVISIBLE est un retour REFUSÉ** (arbitrage f2 du 11/11 ;
revue ⊥ n°1 du v5, B1). Ce n'est pas un risque : c'est la règle qui décide, et elle a trois marches.

1. **Le cas 1-2 n'est retenu que si son effet franchit le plancher** — magnitude ≥ `3f/255f` **et**
   étendue ≥ 12 pixels (le plancher est défini une fois, en §3.2, et il est le **même** pour le
   prédicat qui décide à l'exécution et pour la garde qui mesure les pixels).
2. **Sous le plancher, le bouton BASCULE sur le voile** : `Retour` appelle `AttacherVoileDAppui`
   (cas 3-4) au lieu d'accepter un `Melange` que personne ne voit. La bascule est **comptée**.
3. **Si le voile non plus ne franchit rien, c'est un ROUGE**, levé en nommant une `surface` au site
   (c'est l'échelle de D3, étendue du cas structurel « rien ne peint » au cas perceptuel « trop peu
   peint »).

**L'amplitude `× 0,85` et le seuil `3f/255f` ne bougent JAMAIS vers le bas.** Un effet qu'on ne voit
pas ne se répare pas en abaissant la barre de ce qui compte comme vu : il se répare au **site**, en
nommant une matière qui peint. (C'est pourquoi le « correctif par un `k` plus bas » que la v5 listait
en risque est **retiré** du document : il est interdit.)

**Qui décide, et qui a raison.** À l'exécution, c'est le **prédicat** du §3.2 qui décide, parce qu'il
est le seul calculable au `PointerDown` — il travaille sur une arithmétique de `Color`, donc c'est un
**majorant** : il peut accepter une surface dont l'encre rendue, composée en **linéaire**, fait moins
que le plancher. C'est la **mesure de pixels** du relevé qui a raison, et son rôle est de **CALIBRER**
le prédicat : l'écart « le prédicat a dit cas 1-2, les pixels disent non » est **compté, publié écran
par écran** (GP) et **doit valoir 0 au gate**. Chaque écart se ferme **au site** — jamais par un
abaissement de seuil, jamais par une table d'exceptions par site (ce serait une garde par site, ce que
ce lot refuse). La règle est donc : *le prédicat décide, les pixels jugent, l'écart est une dette
chiffrée qui se solde avant le gate.*

**Le cas 5 de la v4.8 (« aucun retour, compté `SansRetour` ») est RETIRÉ.** Un bouton pressable dont
rien, ni lui ni son parent direct, ne peut s'assombrir **n'est pas un cas de la régie : c'est un défaut
d'écran** (le joueur touche une matière qui n'existe pas). Le design le traite donc comme un **ROUGE de
garde**, levé en nommant une `surface` au site. Les deux sites que les revues avaient déclarés cas 5,
re-mesurés à HEAD, ont tous les deux une surface disponible :

- `CityMapController.cs:894` `Button cellButton = cell.AddComponent<Button>();` + `:895`
  `cellButton.targetGraphic = hit;` où `hit` est une `Image` à α 0 (`:747-749`
  `hit.color = new Color(0f,0f,0f,0f); hit.raycastTarget = true;`) ⇒ `RendSurface(hit)` **faux** ; la
  `surface` à nommer est la plaque du quartier, **à relever** (la cellule n'est pas vide à l'écran).
- `DistrictInteriorScreenController.cs:2137` `Button tapTete = tete.AddComponent<Button>();` sur le
  GameObject `Tete_OuvrirFiche` créé à `:2131`, `Transition.None` à `:2138`. (Le §17 cite `:2128` :
  **faux à HEAD**, `:2128` est un commentaire.)

⚠️ **Ce que je n'affirme pas** : la répartition des 69 sites entre les cas 1-4. Elle se **relève** à
l'exécution, écran monté par écran monté, état montable par état montable (GP). Les revues successives
en ont donné 18, 16, 17 sous des règles différentes : **aucun de ces comptes n'est repris ici.**

**Sites de `surface` nommée connus, re-mesurés à HEAD** (le `targetGraphic` est un masque ou une zone
nue qui ne peint pas) :

| site de création (HEAD) | `surface` à nommer | citation v4.8 | état |
|---|---|---|---|
| `ExceptionDetailController.cs:569` (+ `:570` `choix.targetGraphic = fondCarte;`) | `Verre` (`:540` `NewUI("Verre", face.transform)`) | `:570` | ligne du `targetGraphic` ✔, à relire |
| `DistrictInteriorScreenController.cs:2319` | `Remplissage` (`:2272` `NewUI("Remplissage", go.transform)`) | `:2312` | **périmée** (`:2312` = un `NewText`) |
| `LaSuitePanelController.cs:233` | `Degrade` (`:223` `new GameObject("Degrade", …)`), **seulement `if (premierGeste)`** (`:220`) | `:223` | `:223` est le `Degrade`, le `Button` est à **`:233`** |

**Contrainte du guichet sur une `surface` nommée : elle est DANS le sous-arbre de son bouton**
(revue ⊥ n°1, I5). *Pourquoi* : si la surface d'un cas 1 est hors du sous-arbre, la bascule du cas 0
(plafond `Melange` plein) pose le voile sur le bouton, dont le sous-arbre peut ne rien peindre — handle
non nul, **0 pixel**. `RegieInterne.cs:106` (`default: return true`) prouve seulement qu'un `Alpha` est
**attachable**, jamais qu'il **peint** : l'argument de la v5 (« la bascule est toujours possible ») est
**corrigé ici**, il ne portait que sur l'attachabilité.
*Mesuré à HEAD, les trois sites la respectent déjà* : `Verre` (`ExceptionDetailController.cs:540`) ⊂
`face` (`:527`) ⊂ `carte` (`:523`), et le `Button` est sur `carte` (`:569`) · `Remplissage`
(`DistrictInteriorScreenController.cs:2272`) ⊂ `go`, `Button` sur `go` (`:2319`) · `Degrade`
(`LaSuitePanelController.cs:223-224`) ⊂ `geste`, `Button` sur `geste` (`:233`). **Aucune instance
fautive aujourd'hui** ⇒ la contrainte est une garde de non-régression, pas un correctif.
`Retour.NouveauBouton` la vérifie à la pose ; GP relève **la bascule du cas 0 site par site**, avec ses
pixels (GE2) ; un site qui la viole est un **rouge déclaré**, pas un `SansRetour` silencieux.

### 3.2 Les deux prédicats — REUSE du §17, avec ce qui est NEUF marqué

`RendSurface(g)` et `Peint(t)` sont **repris du §17 v4.8** (ils ont tenu cinq revues ⊥ ; la n°5 les a
relus sans finding) ; je ne les réécris pas, je les cite et je re-mesure ce dont ils dépendent :

- `RendSurface(g)` ⇔ `g` est un `Graphic` **non texte**, `g.enabled`, `g.gameObject.activeInHierarchy`,
  sans `Mask` à `showMaskGraphic = false` sur son GameObject, et **l'écart RENDU** de `Cible` à
  `Cible × 0,85` — en unités `Color` 0-1, sur **le plus grand** des canaux R/G/B, multiplié par
  `g.color.a` **et** par l'alpha cumulé des `CanvasGroup` du GameObject de `g` **et de ses ancêtres** —
  atteint `3f/255f`.
- `Peint(t)` ⇔ la sous-arborescence de `t` (lui compris) porte au moins un `Graphic` **texte compris**
  (`TMP_Text` non vide), `enabled`, actif, hors `Mask` invisible, dont l'écart rendu du voile
  (0,20 × max(R,G,B) × `color.a` × alphas cumulés) atteint `3f/255f`.

**LE PLANCHER — une seule définition, pour le prédicat ET pour la garde** (revue ⊥ n°1, I2). La v5
mettait le compte de pixels dans la garde et la seule magnitude dans le prédicat : une surface qui
franchit `3f/255f` sur **1 à 11** pixels (un liséré fin, un glyphe isolé) était alors classée cas 1-2
**à bon droit** par le mécanisme et faisait **rougir GE1** — un rouge pour la mauvaise raison. Le
plancher est donc **un seul critère à deux facteurs**, écrit ici une fois :

> **magnitude** ≥ `MouvementTunables.SeuilCouleurRendue` (`3f/255f`, `MouvementTunables.cs:76`)
> **ET étendue** ≥ **12 pixels d'écran** (le plancher d'anti-vacuité du design §6.3).

- **Dans le prédicat** (`RendSurface`, `Peint`), l'étendue est l'aire du rect de la cible **convertie
  en pixels d'écran** par le `scaleFactor` du `Canvas` — un calcul d'un rect, pas un rendu : il tient
  au `PointerDown`. C'est un **majorant** (un rect de 400 px peut ne porter que 6 px d'encre).
- **Dans la garde** (GE1/GE2), l'étendue est le **compte réel** de pixels qui franchissent la
  magnitude, mesuré sur deux rendus.
- **L'intervalle 1-11 a donc une règle écrite** : prédicat en dessous ⇒ **bascule sur le voile**
  (§3.1, marche 2) ; prédicat au-dessus et pixels en dessous ⇒ **écart compté, publié, soldé au site**
  (§3.1, « qui décide, et qui a raison »). Dans les deux cas, le plancher ne bouge pas.

**NEUF, et c'est le piège** : ce prédicat **n'est aucune** des deux branches de
`Gardes.FranchitLeSeuil` — re-mesuré à HEAD : la branche `Melange` (`Gardes.cs:272`,
`return amp * Couleurs.EcartRvb(a, b) >= MouvementTunables.SeuilCouleurRendue;`) ne porte **aucun**
alpha ; la branche `Alpha` (`Gardes.cs:265`, `return amp * ctx.AlphaGraphic >= …`) ne porte **aucune**
couleur, et son `amp` est l'amplitude des images clés, pas un alpha de `Graphic`.
`Couleurs.EcartRvb` (`Couleurs.cs:32-35`) est bien le « plus grand canal » (un `Mathf.Max` imbriqué,
alpha exclu). ⇒ les deux prédicats sont **du code neuf**, dans
`Assets/Scripts/ShellContracts/Retour.cs`. Réutiliser `FranchitLeSeuil` en n'y ajoutant que le
`CanvasGroup` classerait presque tout en cas 2 : il rend **0,15 × 0,851 = 0,128**, soit 11 fois le
seuil (`3/255 = 0,01176`), **quel que soit l'alpha de la cible**. Exemple qui le montre — corrigé
(revue ⊥ n°1, m4 : l'exemple de la v5, à α 0,18, donnait 0,023 > 0,01176, donc les deux formules
classaient **pareil** et n'illustraient rien) : à **α 0,039**, le prédicat complet rend
**0,15 × 0,851 × 0,039 = 0,0050 < 0,01176** ⇒ **cas 3** (voile), là où `FranchitLeSeuil` + `CanvasGroup`
rendrait toujours 0,128 ⇒ cas 2, c'est-à-dire un `Melange` que personne ne voit. *(α 0,039 est la
valeur que le §17 v4.8 donne à la variante `.btn.ligne` de `DistrictInteriorScreenController` ; sa
citation `:2282` est **périmée** à HEAD — annexe A — donc la valeur est reprise comme **exemple
arithmétique**, à re-relever au relevé, pas comme un fait d'écran.)*

**Trous mesurés à 0 et nommés** (re-mesurés à HEAD, `Assets/Scripts`) : `ignoreParentGroups` ⇒ **0**
(le jour où un `CanvasGroup` le pose, les deux prédicats deviennent faux **par excès** et doivent
s'arrêter à ce groupe) · `colorGradient` / `enableVertexGradient` ⇒ **0** (un `TMP_Text` est jugé sur
le `color` du composant) · `<alpha=` ⇒ **0** (sinon un texte opaque rendu transparent par balise ferait
un faux cas 3) · `<color` ⇒ **8** lignes, dont une est un commentaire ⇒ **7 sites** qui colorent par
balise : pour ceux-là le majorant « `color` du composant » peut être faux par excès, et **le cas retenu
est celui du relevé**, pas celui que ce document affirmerait.
Un `RectMask2D` n'entre pas dans le prédicat : il filtre aussi les raycasts, donc un bouton pressable
n'est jamais entièrement découpé ; son découpage partiel est un écart de **nuance (C)**.

### 3.3 Les trois cas limites que le brief nomme

- **Bouton sans `Graphic` propre.** `Couple.Realisable` exige un `Graphic` **sur la cible** pour
  `Melange` (`RegieInterne.cs:102`) — donc pas de `retour.appui` ; mais `Alpha` passe toujours
  (`RegieInterne.cs:106`, `default: return true`) et la régie **pose le `CanvasGroup`** si la cible
  n'en a pas (`RegieInterne.cs:118-121`, `cgPose = true`, restitué à 1 par `Detacher`). ⇒ cas 3, et il
  assombrit **tout le sous-arbre** du bouton, ce qui est précisément l'effet voulu. Exemple HEAD :
  `DailyReviewScreenController.cs:1101` `versLaFamille = emptyStateText.gameObject.AddComponent<Button>();`
  — un `Button` posé sur un `TMP_Text` : `RendSurface` est faux (texte exclu), `Peint` est vrai.
- **Bouton déjà animé.** Deux `Absolu` sur le même couple (cible, propriété) ⇒ G12 refuse
  (`Regie.cs:549-553`), **sauf** si l'occupant vient d'un `Transitionner` (il est alors remplacé). Le
  retour d'appui pose un `Melange Absolu` : il entre donc en conflit avec **tout autre `Melange`
  `Absolu` tenu sur la MÊME cible** — au catalogue, les virages du chrome
  (`chrome.filet.virage`, `chrome.anneau.virage`) sont sur le filet et l'anneau, pas sur un bouton.
  Règle du design : `Retour` **détache son propre handle précédent** avant d'attacher (un doigt, un
  handle), et deux boutons distincts ont des cibles distinctes. Le **seul** cas résiduel est une
  `surface` nommée **partagée** par deux boutons appuyés ensemble : handle nul, et GP rougit en nommant
  la surface partagée (c'est un défaut de site, pas un refus acceptable).
- **Bouton inactif ou non `interactable`.** Il **ne peut pas être pressé** : il est **relevé et
  compté**, jamais jugé sur l'effet (GP le classe « non pressable », avec son chemin). Il garde son
  composant (GS2 le vérifie) : l'état peut changer, et le composant ne coûte rien au repos.

### 3.4 L'attachement des 69 — la structure, pas 69 décisions

**Guichet unique** (D1) : un seul fichier neuf, `Assets/Scripts/ShellContracts/Retour.cs`, qui expose
la **seule** façon de créer un bouton dans ce client :

```
Retour.NouveauBouton(GameObject hote, Graphic surface = null) -> Button
```

Il crée le `Button`, **et** y pose le composant `RetourAppui` (un `MonoBehaviour`
`IPointerDownHandler` / `IPointerUpHandler` / `IPointerExitHandler`), en mémorisant la `surface`
nommée. Les 69 sites changent d'**une expression** chacun (`x.AddComponent<Button>()` →
`Retour.NouveauBouton(x)`) : **une seule édition, répétée 68 fois**, pas 68 décisions — et les 3 sites
du §3.1 passent leur `surface` en second argument. **Le 69ᵉ n'est pas une substitution d'expression**
(revue ⊥ n°1, m3) : à `LaSuitePanelController.cs:233`, la surface à passer (`degrade`, `:228`) est une
locale **du bloc `if (premierGeste)`** (`:220-231`) et n'est pas dans la portée du `Button` (`:233`) —
mesuré. Ce site demande en plus une **sortie de portée** (hisser la locale). ⇒ **68 substitutions + 1
site à reprendre**, pas « 69 expressions ».

**Ce qui ferme la classe**, et c'est une garde de SOURCE sur un motif qui **existe** (69 occurrences
aujourd'hui, contrairement au motif impossible de G14 v4.7) : **GS1** — `AddComponent<Button>` ⇒ 0
occurrence dans `Assets/Scripts` hors `Retour.cs`. Un bouton neuf écrit à l'ancienne fait **rougir**,
au lieu de naître sans retour d'appui.

**Pourquoi pas un balayage** (`GetComponentsInChildren<Button>` au montage) :
(i) le locataire construit sa mise en page dans son `Start()`, différé d'une frame après son
`AddComponent` ⇒ un balayage au montage passe **avant** les boutons. ⚠️ **Statut de cette
affirmation** (revue ⊥ n°1, m2) : `AppShell.cs:36-42` est un **COMMENTAIRE de code**, pas du code ; le
fait relève de la sémantique Unity, il n'est **pas mesuré** dans ce dépôt. Il n'est pas load-bearing :
l'argument (ii) ci-dessous suffit à écarter le balayage à lui seul ;
(ii) un site produit n instances **plus tard** (§1.5 : les rangées de liste) ⇒ il faudrait un balayage
par frame (coût non mesuré, et un scan par frame sur chaque `Selectable`) ou un appel à la main à
**chaque** site de construction paresseuse — plus de sites que les 69 éditions, et aucun d'eux visible
en CI ;
(iii) `ProceduralUI.cs` ⇒ **0** occurrence de `Button` : il n'existe aucune fabrique existante où se
brancher.

**L'unknown qui porte tout le reste**, nommé avant d'écrire une ligne de code : *plusieurs composants
`IPointerDownHandler` sur un même GameObject reçoivent-ils tous l'événement ?* Le dépôt **co-localise
déjà** les deux (`TamponAuComptoir.cs:92` `Button`, `:102` `LongPressButton`, sur le même `t`), et
`LongPressButton` déclare son chemin réel de pointeur (`ShellContracts/LongPressButton.cs:11-15`) —
mais **co-localisation n'est pas livraison d'événement**, et je n'ai pas joué de run. ⇒ **première
étape du plan de code : un test de 2 assertions qui le MESURE** (§6, E-R1). Si la réponse est non, D1
tombe et il faut un `Button` dérivé (`DoStateTransition`), donc une édition plus large aux 69 sites.

### 3.5 L'appui TIENT, le relâchement est RENDU — mais pas en 140 ms (D2)

Ce que la régie fait, mesuré :

1. **Appui** : `Melange` 0 → 1 en 90 ms (`EaseOut`). La piste finie **TIENT** sa valeur finale tant que
   celle-ci diffère de la base (dette 11, ratifiée par E1 : une piste finie est libérée **seulement**
   si la valeur finale de chaque canal égale la base). `Melange` finit à 1, base 0 ⇒ **elle tient**,
   sans coût d'évaluation supplémentaire, aussi longtemps que le doigt reste.
2. **Relâchement** : `Detacher(h)` → `LibererPiste(slot, true)` (`Regie.cs:188`) → `c.Restituer()`
   **immédiatement**, dans l'appel (`Regie.cs:628`), donc dans la même frame que le `PointerUp`. Le
   `Melange` revient à `CouleurA` (= `Cible`), le `CanvasGroup` posé revient à 1 (§3 du design,
   « Fin de piste »). ⇒ **la restitution est un saut d'une frame, pas une fondue de 140 ms.**
3. **Les 140 ms du §8 et de `catalogue-mouvements.md:422` ne sont pas implémentables tels quels**, et
   voici les trois murs mesurés : (a) `Transitionner` exige **UN canal `Absolu`** (`Regie.cs:169-170`,
   lève sinon) ⇒ le voile (`Alpha` **`Multiplicatif`**) ne peut pas être rendu par une transition ;
   (b) sur le couple déjà occupé par l'appui (issu d'`Attacher`, donc `occupantTransition == false`),
   G12 d'exécution **refuse** (`Regie.cs:549-553`) ⇒ il faudrait détacher d'abord, c'est-à-dire sauter
   d'abord ; (c) `Transitionner` appelle `Creer(..., retourAppui: false)` (`Regie.cs:171`) ⇒ G14 (c)
   **refuserait** les deux `Id` sur ce chemin.

**Défaut sûr retenu** : le relâchement est la restitution immédiate. Le joueur voit l'encre foncer en
90 ms et revenir au lâcher — P1 est tenu (« rendu au relâchement »). **Les 140 ms partent en dette 32**,
avec leur prix écrit : deux entrées de plus (une `Melange` `Absolu` de retour, une `Alpha` `Absolu` de
retour) **ou** un canal `Absolu` pour le voile, **plus** une troisième méthode de régie qui pose son
`Id` elle-même et passe `retourAppui: true`. Cela rouvre « deux `Id` seulement » : **décision f2**, pas
une décision de ce design. C'est la **question n°1** à poser à f2 si une seule peut l'être.
*(L'état « annulé » — `IPointerExitHandler`, ou relâchement forcé — emprunte le même chemin que le
relâchement : `Detacher`.)*

**Sous `Reduit`**, l'appui reste vivant, et c'est mesuré dans la règle de gel :
`GelDeMouvement.Gele` ne gèle pas un `Retour` dont le canal est `Melange`, ni un `Retour` `Alpha`
**sans `PoseDeReposS` déclarée** (`PolitiqueMouvement.cs:30`). ⇒ **contrainte de DONNÉE sur les deux
entrées neuves** : `retour.appui-voile` ne doit **pas** déclarer de `PoseDeReposS`, sinon le voile gèle
et le joueur perd son retour en mouvement réduit. Garde de donnée : GD1.

---

## 4. Les GARDES D'EFFET — on rend, on compte ; une garde de paramètre ne compte pas

Ordre imposé : **les structurelles d'abord** (une garde de valeur sur un objet qui ne dessine pas est
verte pour rien), puis la population, puis l'effet rendu. Chaque garde porte **son contrôle positif** :
une version fautive qui doit rougir **pour la bonne raison**, avec le **message exigé**.

| id | ce qu'elle rend / compte | contrôle positif (doit ROUGIR) | message exigé |
|---|---|---|---|
| **GS0** structurelle uGUI | pour chaque cible résolue au relevé : `GetComponent<CanvasRenderer>() != null` ; si un ancêtre porte un `Mask`, la cible est un `MaskableGraphic` avec `maskable` vrai ; l'ordre de fratrie de la cible est inchangé par l'attachement | une surface montée **sans** `CanvasRenderer` (posée par `AddComponent` à l'exécution, qui n'honore pas `[RequireComponent]`) | `GS0 : <chemin> — surface sans CanvasRenderer : rien ne sera dessiné` |
| **GS1** source, ferme la classe | 0 occurrence de `AddComponent<Button>` dans `Assets/Scripts` hors `Retour.cs`. Le scan est une **fonction pure** de (chemin, contenu) — c'est ce qui le rend contrôlable | un contenu synthétique portant le motif, passé au scan dans le test | `GS1 : <chemin>:<ligne> crée un Button hors Retour.NouveauBouton` |
| **GS2** composant | pour chaque écran monté, chaque `Button` de `GetComponentsInChildren<Button>(true)` porte **exactement un** `RetourAppui` (0 ⇒ rouge ; 2 ⇒ rouge) | un `Button` monté par `AddComponent<Button>` direct **dans le montage de test** | `GS2 : <chemin> porte <n> RetourAppui, attendu 1` |
| **GP** population (contrainte f2 B1) | **l'invariant P2 ENTIER**, sur la population RÉELLE, **un seul relevé et un seul verdict par bouton** : pour chaque bouton monté, actif et `interactable`, un `PointerDown` simulé rend **exactement un** handle **non nul** d'`Id` ∈ {`retour.appui`, `retour.appui-voile`} **ET l'effet de cet attachement franchit le plancher sur les pixels** (GE1 pour un `Melange`, GE2 pour un voile). **Rouge** sur 0 attachement, sur 2, sur un handle **nul**, **et sur un handle non nul à effet sous le plancher** — avec son chemin. Relève par bouton : écran, chemin, cas retenu, cible, `Id`, handle, **pixels mesurés**. **Publie, écran par écran** : montés · pressables · non pressables · **basculés sur le voile** (§3.1 marche 2) · **écarts prédicat ↔ pixels** (le prédicat a dit cas 1-2, les pixels disent non — doit valoir **0 au gate**) · **sites de l'inventaire non couverts par aucun état monté** (un site non exercé n'est **pas** prouvé) · bascules du cas 0 relevées site par site (§3.1, contrainte du guichet) | **deux** contrôles, dans le même montage de test : (a) un `Button` dont le `RetourAppui` est retiré avant l'appui ⇒ 0 attachement ; (b) un `Button` **cas 1** dont la surface est peinte à `Cible × 1,00` ⇒ **un** attachement, **effet nul** | (a) `GP : <ecran>/<chemin> — 0 attachement (cas <k>, cible <nom>) : le retour d'appui est perdu en silence` · (b) `GP : <ecran>/<chemin> — attachement <Id> à effet NUL (<n> px ≥ 3/255, plancher 12) : un retour invisible est un retour refusé` |
| **GE1** effet du mélange | **rend** et **compte les pixels** : repos vs sous le doigt, même phase (horloge `Figee`, piste évaluée à t = 0,09 s) ⇒ ≥ **12** pixels du rect de la cible diffèrent de ≥ **3/255** sur le plus grand canal ; puis après `Detacher`, retour aux pixels du repos | `CouleurB = Cible × 1,00` — un réglage **valide et non nul** qui ne produit **aucun** pixel | `GE1 : <chemin> — <n> pixels franchissent 3/255, attendu ≥ 12 : réglage valide, effet nul` |
| **GE2** effet du voile | idem, pour `Alpha` 1 → 0,80, sur le rect du **GameObject qui porte le `CanvasGroup`** — `b` en cas 3, **`q` en cas 4** (revue ⊥ n°1, B2 : « le rect du bouton » rendait la garde **rouge sur un voile qui marche** dès que l'encre de `q` tombe hors du rect de `b` ; rien ne l'interdit — `Peint(q)` n'impose aucune position, et la seule contrainte, aire(`q`) ≤ 2 × aire(`b`), ne la donne pas. Le cas mesuré de ㉜ n'y échappe que par l'`Etirer` de son site, un accident, pas une règle) | un voile posé sur un sous-arbre qui **ne peint rien** (0 pixel) — c'est l'ancien « cas 5 » devenu rouge | `GE2 : <chemin> — voile sans encre sur <nom de la cible du voile> : 0 pixel` |
| **GE3** jamais refusé, **par l'effet** | quota non-`Ambiance` rempli à 15 **et** plafond `Melange` rempli, puis un appui : handle non nul, **GE1 ou GE2 vert sur les pixels**, `Refus` inchangé, aucune piste tenue évincée, `BasculesVoile` + 1 | **par une COUTURE, pas par une mutation** (revue ⊥ n°1, I3) : (a) `regie.PlacesReserveesRetourAppui = 0` ⇒ l'appui **doit** être refusé (la sensibilité de l'assertion est prouvée **en CI**, sans toucher au code livré) ; (b) `regie.PistesMelangeMax = 0` ⇒ tout `Melange` est refusé, donc **la bascule doit tirer** : handle non nul, pixels de GE2, `Refus` inchangé — une régie **sans** la bascule rend ici un handle nul et `Refus` + 1, donc ce test **rougit sur sa disparition**, et il le refait à chaque CI | `GE3 : appui refusé (<raison de la régie>) alors que la règle de classe l'interdit` |
| **GE4** sous `ContentSizeFitter` (contrainte f2 B2) | un **montage de test synthétique** : ancêtre `ContentSizeFitter`, `Image` **opaque** sur le GameObject du `Button` ⇒ cas 2, handle **non nul**, `Refus` inchangé, GE1 vert. **Ce montage n'est JAMAIS compté** : ni dans N, ni dans l'inventaire, ni dans GS2/GP — il ne sert qu'à prouver que la garde **peut** rougir | rendre à `retour.appui` un canal `Echelle` ⇒ G11 (`Gardes.cs:211`) refuse l'entrée entière ⇒ rouge | `GE4 : handle nul sous un ContentSizeFitter ancêtre — <raison>` |
| **GD1** donnée | les deux entrées neuves portent **exactement** : `retour.appui` → 1 canal `Melange` `Absolu` ; `retour.appui-voile` → 1 canal `Alpha` `Multiplicatif`, **sans `PoseDeReposS`** (sinon le voile gèle sous `Reduit`, `PolitiqueMouvement.cs:30`) ; durées ≤ 250 ms (G8, `Gardes.cs:183-184` ; 90 + 0 = 90 ms après D2) | ajouter un canal (quel qu'il soit) ou une `PoseDeReposS` au voile | `GD1 <Id> : canaux attendus <…>, trouvés <…>` |

**La COUTURE que GE3 exige, et pourquoi elle est nécessaire** (revue ⊥ n°1, I3). Mesuré :
`MouvementTunables.PlacesReserveesRetourAppui` (`MouvementTunables.cs:20`) et `PistesMelangeMax`
(`:26`) sont des `public const int` — une `const` C# est **inlinée à la compilation**, donc **aucun
test ne peut la poser à 0** ; et `Regie.cs:520` et `:529` les lisent directement. « Muter la const » et
« retirer la bascule de `Regie.cs:94` », que la v5 donnait comme contrôles, sont des **éditions de
source jouées à la main** : elles ne vivent pas en CI et rien ne les rejoue. ⇒ **deux propriétés
d'instance sur `Regie`**, `PlacesReserveesRetourAppui` et `PistesMelangeMax`, **initialisées depuis les
`const`** (comportement de production **inchangé**, les `const` restent la valeur par défaut et la
source de vérité du canon) et lues par `Creer` à la place des `const`. Le test les pose ; la
production, jamais. C'est la même idée que la **fonction pure** de GS1 : ce qui rend un contrôle
positif **écrivable**, c'est une couture, pas un commentaire disant « à muter à la main ».
⚠️ Cela **touche du code livré** (`Regie.cs:520`, `:529`) : déclaré au gate, étape E-R3.

**Le bouton de ㉜ n'est le porteur d'aucun contrôle.** `DelegationScreenController.cs:1528` est cité
**uniquement comme exemple de cas 4** pour le relevé : mesuré à HEAD, `:1522` crée la zone, `:1525`
`Image cible = AjouterImage(zone);`, `:1526` `cible.color = new Color(0f,0f,0f,0f);`, `:1528` le
`Button`, `:1529` `Transition.None` — aucun `targetGraphic` assigné, le seul `Graphic` à α 0, pas
d'enfant ⇒ **cas 1-2 impossibles**. C'est exactement pourquoi il ne peut pas porter GE4 (§5 B2).

**Protocole du relevé** (GS2, GP, GE1, GE2) : régie **vierge** (`RegieMouvement.PourTest()`), un
`Detacher` **après chaque bouton relevé** — sans quoi les 10 premiers cas 1-2 remplissent le plafond
`Melange` et tous les suivants basculent sur le voile, faussant le relevé ; chaque site **conditionnel**
est relevé dans **chacun** de ses états montables, chaque état nommé. Le relevé **ne pose aucun
composant** : il observe la population dans l'état où la production la laisse (une garde qui réparerait
avant de mesurer ne prouverait rien).

---

## 5. Réponse point par point à `revue-s17-n5.md`

| finding | comment ce design le ferme |
|---|---|
| **B1** la signature à 2 arguments rend les cas 3-4 inatteignables (`surface == null` ⇒ `Creer` lève, `Regie.cs:505`) | **décision f2** appliquée : **deux méthodes publiques**, chacune posant son `Id` elle-même, **aucun `null` à convention** — `AttacherRetourAppui(RectTransform surface, RectTransform cibleVoile)` pour les cas 1-2 **et** la bascule interne du cas 0 ; `AttacherVoileDAppui(RectTransform cible)` pour les cas 3-4. En cas 1-2, `cibleVoile` = le `RectTransform` **du bouton** : jamais nul, et l'`Alpha` y est toujours **attachable** (`RegieInterne.cs:106`, `default: return true`). ⚠️ **Attachable n'est pas peint** (revue ⊥ n°1, I5) : la bascule du cas 0 n'est garantie **visible** que par la contrainte du guichet — une `surface` nommée vit **dans le sous-arbre de son bouton** (§3.1 ; les 3 sites existants la respectent, mesuré) — et par GP, qui relève **la bascule du cas 0 site par site, avec ses pixels**. Sans cette contrainte, le cas 0 d'un site à surface extérieure rendrait un handle non nul sur **0 pixel**. Les trois levées devenues mortes sont **retirées** : `Regie.cs:88` (`appui == null`), `:89` (`appui.Genre != Genre.Retour`), `:96` (`voile.Genre`) — re-mesurées à HEAD, les entrées résolues dans `admises` sont `Retour` par construction et `VerifierAdmise` (`:473-478`) garde G1. **Ce que devient le cas 0** : il reste **à l'intérieur** de `AttacherRetourAppui` (`Regie.cs:94-100`), inchangé dans son effet (bascule comptée **après** un handle non nul) ; la clause « `voile` ou `cibleVoile` nuls ⇒ refus ordinaire » **disparaît** avec les paramètres `Entree`. **Condition f2 tenue** : c'est **GP** (§4) qui tient « jamais refusé » — et GP garde l'**effet**, pas le paramètre : un attachement **et** ses pixels, par bouton (revue ⊥ n°1, B1 : la v5 faisait porter « jamais refusé » à une garde qui ne regardait que le handle, donc **verte exactement sur le cas que f2 appelle un refus**). Plus aucune affirmation sans garde, et plus aucune garde de paramètre présentée comme une garde d'effet |
| **B2** le contrôle positif était nommé sur un bouton que le code classe en cas 4 | **GE4** est un **montage de test synthétique** (ancêtre `ContentSizeFitter` + `Image` opaque ⇒ cas 2), explicitement **hors de N et hors de l'inventaire** ; le bouton de ㉜ n'est plus qu'un **exemple de cas 4**, avec ses 5 citations re-mesurées à HEAD. La garde, elle, court sur la population **réelle** (GP) |
| **B3** `Echelle` encore vivante dans le catalogue | **amendement du catalogue**, avec son contrôle mesuré : annexe B. Deux cellules : `catalogue-mouvements.md:422` (clause `Echelle` de l'**appui** ET du **relâchement**) et `:292` (`retour.appui` retiré de la liste des échelles restantes de §I.2.9), **renvoyées à la dette 29 en paraphrase**. Comptes **inchangés** (une `Entree` = une piste ; la colonne `Pistes` reste 1, §V intact). Je n'édite pas le catalogue : c'est l'étape E-R0 du plan |
| **I1** le contrôle négatif de la réserve devient vide après G14 (c) | le test `E0_RetourDAppui_JamaisRefuse_QuotaNonAmbiancePlein` (`MouvementsRegiePlayModeTests.cs:151-153`, re-lu à HEAD : `Assert.IsTrue(regie.Attacher(voile, …).EstNul, "hors AttacherRetourAppui, pas de réserve")`) est **réécrit** : son entrée devient une entrée `Retour` **synthétique** dont l'`Id` n'est **ni** `retour.appui` **ni** `retour.appui-voile`, et l'assertion porte sur la **raison** du refus (le quota), pas sur sa seule nullité. Il **rejoint la dette 30** avec les cinq autres : **6** tests déjà verts touchés, à déclarer au gate |
| **I2** « la seule voie restante » est démentie par `Inspecter` | la phrase d'unicité est **abandonnée**. Mesuré à HEAD : `Regie.cs:122` `public bool Inspecter(int rang, out Entree entree, out RectTransform cible)` rend l'`Entree` de n'importe quelle piste vivante. La propriété ne repose donc **pas** sur l'unicité d'une voie : elle repose sur le **refus dans `Creer`** (G14 (c)), qui mord sur l'`Id` **à l'intérieur** de `Creer` et couvre donc **toutes** les voies, connues ou non. Les 4 seuls appels de `Creer` restent `:98`, `:102` (`retourAppui: true`), `:159` (`Attacher`) et `:171` (`Transitionner`) — re-vérifiés |
| **I3** ce que devient le cas 0 / `Regie.cs:89` n'est pas dit | dit, en toutes lettres, dans la cellule **B1** ci-dessus : les trois levées sont retirées (lignes nommées), la clause « voile nul » disparaît, le cas 0 reste dans `AttacherRetourAppui`, et rien n'est à journaliser à la place (la condition ne peut plus se produire) |
| **I4** Q6 du catalogue affiche encore une ratification f2 opposée | `catalogue-mouvements.md:1066` (« Q6 … **RATIFIÉE** (f2 07/10) ») et `:1076` (la reco « ≤ 1/3 du cadre ») sont à marquer **ANNULÉE par l'arbitrage f2 du 08/10 (dette 29)** — une ligne, aucun compte touché. Même étape E-R0 que B3. (Mesuré : les deux lignes existent toujours à HEAD) |
| **m1** `:343` cité pour la ligne de §I.4 | à HEAD la ligne `retour.appui` de §I.4 est **`:351`** (`:343` est de la prose : « « Mult » = `Multiplicatif` … ») ; `:352` pour le voile, `:353` pour l'appui long. Corrigé partout dans ce document |
| **m2** « 75 occurrences » est un compte de lignes | re-mesuré à HEAD : **77 lignes** nomment `ContentSizeFitter`, dans **22 fichiers**, pour **27 poses** (`AddComponent<ContentSizeFitter>`). Les trois mots sont distingués ici (§1.6) |
| **m3** citations décalées au catalogue §II.0.a | l'amendement de l'annexe B **re-cite à HEAD** : `DelegationScreenController.cs:1519-1531` (`:1528` le `Button`) et `DemolitionScreenController.cs:1449-1461` (`:1458` le `Button`, `:1459` `Transition.None`) |
| **m4** « la garde rougit sur un site fautif » surévalue G14 (c) | reformulé : G14 (c) **EMPÊCHE** (handle nul, `Refus++`, un `Debug.LogWarning` par `Regie.cs:487-490`) ; ce qui **rougit en CI**, c'est le test du contrôle positif, et il rougit **sur la garde**, pas sur le site. Le signal de CI « un site neuf est fautif » est fourni par **GS1** (scan de source), pas par G14 |

---

## 6. Plan de code ORDONNÉ (rien n'est codé ici), coût, risques

### 6.1 L'ordre, et ce qui bloque quoi

| étape | contenu | pourquoi là | créneau |
|---|---|---|---|
| **E-R0** | **amendement des documents** : `catalogue-mouvements.md` `:422` + `:292` (B3) et Q6 `:1066`/`:1076` (I4) ; §17 de la v4.8 marqué PÉRIMÉ, renvoyant ici ; dettes 32 (140 ms), 33 (`LongPressButton` seul) ouvertes, dette 30 portée à 6 tests | aucun code ne doit lire deux consignes opposées. 0 `.cs` touché | non |
| **E-R1** | **la mesure qui porte tout** : un test de 2 assertions — deux `IPointerDownHandler` sur un même GameObject (`Button` + sonde) reçoivent-ils **tous deux** le `PointerDown` ? | si non, D1 tombe (§3.4) : inutile d'écrire les 68 éditions et la reprise de portée | **OUI** |
| **E-R2** | les **deux `Entree`** dans `CatalogueHud` (à **CRÉER** : mesuré, `appui`/`Appui` ⇒ 0 ligne dans `CatalogueHud.cs`, dont les 10 entrées sont `Pouls, Tremble, Gyrophare, FiletVirage, AnneauVirage, AiguilleBalayage, BandeauSortie, Neon, Fumee, Scintillement`, `:52-143`, listées `:149`), **sans champ public à leur nom** ; les constantes `CatalogueHud.IdRetourAppui` / `IdRetourAppuiVoile` ; `Gardes.cs:183` **consomme** ces constantes (sinon G8 devient muette sur un `Id` renommé) ; GD1 | donnée d'abord : tout le reste s'y résout par `Id` | non (typecheck) |
| **E-R3** | `Regie` : les **deux méthodes** de B1, les trois levées mortes retirées, le contrôle positif de G14 (c) dans `Creer` (`Regie.cs:503`, drapeau `retourAppui` déjà présent), **les deux coutures de GE3** (`PlacesReserveesRetourAppui` et `PistesMelangeMax` en propriétés d'instance initialisées depuis les `const`, lues par `Creer` à `:520` et `:529`) ; réécriture des **6** tests verts (dette 30 + I1) | la régie avant l'appelant ; sans les coutures, les contrôles positifs de GE3 ne sont pas écrivables (I3) | **OUI** |
| **E-R4** | `ShellContracts/Retour.cs` : `RendSurface`, `Peint`, `RetourAppui`, `Retour.NouveauBouton`, le scan de GS1 comme **fonction pure** | — | non (typecheck) |
| **E-R5** | les **68 substitutions + la sortie de portée** de `LaSuitePanelController.cs:233` + les 3 `surface` nommées (dans le sous-arbre de leur bouton, §3.1) + les 2 ex-cas 5 ; GS0, GS1, GS2 | mécanique, une fois E-R4 vert | non (typecheck) |
| **E-R6** | **GP** (relevé complet, tous états montables, **publication écran par écran** : montés / pressables / non pressables / **basculés** / **écarts prédicat ↔ pixels** / sites non couverts), **GE1-GE4** (rendre et compter les pixels), les contrôles positifs **par couture** (I3) | les planches coûtent un créneau groupé ; c'est **ici seulement** que le volume des bascules et des écarts se connaît (§6.3 #2) | **OUI**, groupé |

### 6.2 Coût

- **Fichiers neufs** : 1 (`Assets/Scripts/ShellContracts/Retour.cs`, + son `.meta` à la main, format
  minimal du dépôt, GUID neuf — dette 19).
- **Fichiers touchés** : `CatalogueHud.cs`, `Gardes.cs` (une ligne, `:183`), `Regie.cs` (les deux
  méthodes de B1, les 3 levées mortes, la garde G14 (c), **et les deux coutures de GE3** —
  `Regie.cs:520` et `:529` lisent des propriétés d'instance au lieu des `const`) ; **35**
  fichiers d'écran : **68 substitutions d'expression + 1 sortie de portée**
  (`LaSuitePanelController.cs:233`, m3) ; 2 fichiers de test existants
  (`MouvementsRegiePlayModeTests.cs`, le relevé des gardes) ; 2 documents (`catalogue-mouvements.md`,
  `dettes-design-mouvement.md`).
- **Mélange** : **+1 piste au plus par doigt posé**, et **0** quand le plafond est atteint (bascule
  voile). Le pire cas du §4 passe de 9 à 9 : le retour d'appui y était **déjà compté** pour 1.
- **Pistes** : le retour d'appui ne tient **aucune** piste au repos (attaché au `PointerDown`, détaché
  au relâchement) ⇒ **69 boutons ne consomment pas 69 pistes**. Il consomme la place réservée
  (`PlacesReserveesRetourAppui = 1`) pendant l'appui.
- **Par image, au repos** : 0 évaluation, 0 écriture, 0 octet alloué (aucune piste vivante). Le
  composant `RetourAppui` n'a **pas** d'`Update` (il ne doit pas en avoir : G10, liste fermée).

### 6.3 Risques, dans l'ordre de ce qui me ferait réécrire le design

1. **E-R1 répond non** (un seul `IPointerDownHandler` servi par GameObject) ⇒ D1 tombe, le guichet
   devient un `Button` dérivé et les 69 éditions changent de nature.
2. **Le VOLUME des bascules, et celui des écarts prédicat ↔ pixels.** L'issue, elle, n'est plus un
   risque : elle est **tranchée** en §3.1 (sous le plancher ⇒ voile ; voile sans encre ⇒ rouge ; le
   seuil et l'amplitude ne baissent jamais — **le « `k` plus bas » de la v5 est retiré du document**,
   f2 l'interdit). Ce qui reste inconnu est un **nombre** : combien de boutons basculent, et sur
   combien le prédicat (arithmétique de `Color`) se sépare des pixels (composés en **linéaire**). Si
   ce nombre est grand, le lot ne devient pas faux — il devient **long** : chaque écart se solde au
   site, un par un. Il ne se mesure qu'écran par écran, à E-R6, et GP le publie.
3. **Un site produit une instance que le relevé ne monte jamais** ⇒ GP publie un **compte de sites non
   couverts** ; si ce compte est élevé, la couverture réelle du lot est plus faible que N le suggère.
4. **Le relâchement sans fondue** (D2) peut être jugé A/B par un juge visuel, pas C. Le ruling du 07/10
   range les nuances en C, mais « l'encre revient d'un coup » est un geste, pas un pixel : si un juge
   le classe A/B, la dette 32 devient un correctif et f2 doit trancher.
5. **Deux appuis simultanés** : la réserve est UNE place. Le second doigt peut obtenir un handle nul
   ⇒ GP rougit **à juste titre** sur un multi-touch. Le protocole du relevé exclut le multi-touch, donc
   la garde ne le voit pas en CI : **trou déclaré**, non couvert par ce lot.

### 6.4 Ce que ce design ne couvre PAS

- La **classification** des 69 sites entre les cas 1-4 (c'est GP, à l'exécution) et la **carte
  site → écran** (⊂ GP : l'écran est nommé au relevé, pas deviné depuis un nom de fichier).
- `retour.appui-long` (l'arc de 1 000 ms, `Remplissage`), les **7** `LongPressButton` (dette 33), la
  `Scrollbar`, le `Slider`, les 3 `TMP_InputField`.
- Les **140 ms** du relâchement (dette 32) et les **−3 %** d'`Echelle` (dette 29).
- Le **coût GPU réel** : E0 n'a mesuré que du CPU en batchmode sur poste de travail ; aucun seuil GPU
  n'est tiré, et rien n'a été mesuré sur appareil.
- Le **son**, le retour haptique : hors périmètre.
- Toute **exécution** : aucun chiffre de ce document ne vient d'un run Unity.

---

## Annexe A — les citations du §17 v4.8 qui sont FAUSSES sur le cumul (mesuré à `9b48b2ac`)

La revue n°5 a recontrôlé 29 citations à `b7c522a7` et les a trouvées exactes. Le cumul a bougé les
fichiers d'écran. Relevé des citations du §17/§8/du catalogue que j'ai re-mesurées **une par une** :

| citation v4.8 | à HEAD | réalité à HEAD |
|---|---|---|
| `ExceptionDetailController.cs:570` (→ `Verre`) | `:569` le `Button`, `:570` `choix.targetGraphic = fondCarte;`, `:540` `NewUI("Verre", …)` | la ligne du `targetGraphic` tient, le site du `Button` est `:569` |
| `DistrictInteriorScreenController.cs:2312` (→ `Remplissage`) | **faux** — `:2312` est `TextMeshProUGUI t = NewText(…)` | `Button` à `:2319`, `Remplissage` à `:2272` |
| `DistrictInteriorScreenController.cs:2282` (variante α 0,039) | **faux** — `:2282` est `fondPeint.type = Image.Type.Simple;` | à relever |
| `DistrictInteriorScreenController.cs:2128` (`Tete_OuvrirFiche`, cas 5) | **faux** — `:2128` est un commentaire | `NewUI("Tete_OuvrirFiche")` `:2131`, `Button` `:2137`, `None` `:2138` |
| `DistrictInteriorScreenController.cs:691`, `:694` | `:693` le `Button`, `:694` `Transition.None` ✔ | décalé d'une ligne |
| `LaSuitePanelController.cs:223` (→ `Degrade`) | `:223` est bien le `GameObject("Degrade")` ; `if (premierGeste)` à `:220` | mais le `Button` est à **`:233`** |
| `ReputationScreenController.cs:994` (la `Scrollbar`) | **faux** — `:994` est `hle.preferredHeight = …` | `Scrollbar` `:960`, `Transition.None` `:964` |
| `TopBarController.cs:940` (la flèche) | **faux** — `:940` est un commentaire | le `Button` du fichier est à `:996` |
| `InspectionScreenController.cs:415` (`Or` à α 0,18) | **faux** — `:415` est `feuille.transform.SetParent(…)` | le `Button` du fichier est à `:474` |
| `ExceptionQueuePanelController.cs:99` (α forcé à 0) | `:99` est `Image vaImg = viewAllGo.GetComponent<Image>();` | à relire avant citation |
| `DailyReviewScreenController.cs:1101` (⑯, `Button` sur un texte) | ✔ `versLaFamille = emptyStateText.gameObject.AddComponent<Button>();` ; `None` à `:1102` | exact |
| `DelegationScreenController.cs:1519-1531`, `:1528` | ✔ exact (`:1522`, `:1525`, `:1526`, `:1528`, `:1529`) | exact |
| `DemolitionScreenController.cs:1449-1461` | ✔ `:1458` le `Button`, `:1459` `None` | exact |
| `BandeauEphemere.cs:146`, `:211`, `:279` | ✔ exacts | exact |
| `BandeauEphemere.cs:253` (toute la surface du bandeau, cité par la Q6 du catalogue, `:1069-1070`) | **faux** — `:253` est `Texte.enableWordWrapping = true;` | `Button` à `:256`, `Transition.None` à **`:258`** |
| `Regie.cs` `:23 :54-60 :86 :88 :89 :94-103 :115-116 :122 :156 :169-171 :330 :476 :480-490 :503 :505 :509 :512-513 :518 :520 :523 :526-533 :537 :544 :545-546 :549-553 :559 :571 :617-637` · `Gardes.cs` `:183-184 :196-214 :253 :265 :272 :309-310` · `Modele.cs` `:84 :192-204` · `MouvementTunables.cs` `:18-20 :21-26 :76` · `Couleurs.cs:32-35` · `RegieInterne.cs` `:97-108 :118-121 :123-128` · `PolitiqueMouvement.cs:20-30` · `MouvementsGardesPlayModeTests.cs:478` · `MouvementsRegiePlayModeTests.cs:105 :116 :145 :151-153 :206-224` | **tous exacts** | mesuré : `git diff --stat b7c522a7 HEAD -- Assets/Scripts/ShellContracts/Mouvements Assets/Tests/PlayMode/MouvementsRegiePlayModeTests.cs Assets/Tests/PlayMode/MouvementsGardesPlayModeTests.cs` ⇒ **sortie vide** : le mécanisme et ses tests n'ont pas bougé depuis `b7c522a7`. Seuls les **écrans** ont bougé |

**Leçon** : une citation d'écran ne survit pas à un cumul. Les lignes du **mécanisme** sont stables,
celles des **écrans** doivent être re-mesurées à chaque lot. C'est aussi pourquoi l'inventaire de ce
document est daté et re-mesurable par une commande, et non recopié.

## Annexe B — le contrôle de l'amendement B3 (comptes AVANT collés)

Commande (elle est **mécanique** : elle lit la première cellule de chaque rangée de table, et le
paragraphe « Échelles restantes » de §I.2.9) :

```
python3 - <<'EOF'
p='Tools/conformite-anim-2026-10-07/catalogue-mouvements.md'
L=open(p,encoding='utf-8').read().split('\n')
a=0
for i,l in enumerate(L):
    if not l.startswith('|'): continue
    c=l.split('|')
    if len(c)>1 and 'retour.appui' in c[1]:
        k=l.count('Echelle'); a+=k
        print('A %4d  1re cellule=%-26s Echelle x%d'%(i+1,c[1].strip(),k))
print('TOTAL A =',a)
b=0
for i,l in enumerate(L):
    if 'chelles restantes' in l:
        for j in range(i,min(i+6,len(L))):
            if 'retour.appui' in L[j]: b+=1; print('B %4d  %s'%(j+1,L[j].strip()[:120]))
print('TOTAL B =',b)
EOF
```

**AVANT (mesuré à `9b48b2ac`)** :

```
A  351  1re cellule=`retour.appui`             Echelle x0
A  352  1re cellule=`retour.appui-voile`       Echelle x0
A  353  1re cellule=`retour.appui-long`        Echelle x0
A  422  1re cellule=`retour.appui`             Echelle x2
A  423  1re cellule=`retour.appui-voile`       Echelle x1
A  424  1re cellule=`retour.appui-long`        Echelle x0
A 1014  1re cellule=`retour.appui-long`        Echelle x0
A 1335  1re cellule=**B2-1** `retour.appui` en `Melange` sur un `Button` posé sur un `TMP_Text` (⑯ `:1101`) Echelle x0
A 1369  1re cellule=M3-1 `retour.appui-long` : 5 sites, ⑨ ⑩ manquaient Echelle x0
TOTAL A = 3
B  292  `ContentSlot` — `AppShell.cs:1120`) ; `retour.appui`, conditionnée par sa règle. `revue.cachet` et
B 1369  | M3-1 `retour.appui-long` : 5 sites, ⑨ ⑩ manquaient | `Ecrans` = ④ ⑤ ⑨ ⑩ ⑯ | …
TOTAL B = 2
```

**APRÈS, attendu — et je donne le chiffre exact, pas « 0 »** :

- **A = 1**, et l'unique survivant est `:423`, dont le texte mesuré est « **Pas d'`Echelle`** » : une
  **négation**, qui est juste et qui reste. Les **2** occurrences de `:422` (appui ET relâchement)
  partent. ⇒ **occurrences qui PRESCRIVENT une `Echelle` : 2 → 0.**
- **B = 1**, et l'unique survivant est `:1369`, un **faux positif de ma fenêtre de 6 lignes** (une
  rangée de table d'une réponse de revue, sur `retour.appui-long`). Le vrai, `:292`, part. ⇒ **1 → 0
  dans le paragraphe de §I.2.9.**

**Le grep NU, et son vrai compte** (corrigé — revue ⊥ n°1, I1 : la v5 annonçait « 4 après » en
oubliant `:423`, c'est-à-dire **la ligne que la même annexe dit devoir survivre** ; qui aurait joué le
contrôle aurait lu 5, cru à un échec, et n'aurait pu atteindre 4 qu'en effaçant la négation de `:423`).
Mesuré :

```
$ python3 -c "L=open('Tools/conformite-anim-2026-10-07/catalogue-mouvements.md',encoding='utf-8').read().split('\n')
             n=0
             for i,l in enumerate(L):
                 if 'retour.appui' in l and 'Echelle' in l: n+=1; print('%4d | %s'%(i+1,l[:90]))
             print('TOTAL =',n)"
 333 | > La ligne **`retour.appui`** perd son canal **`Echelle` Mult (sous condition)**  (la note du 08/10)
 422 | | `retour.appui` | …                                                   (les 2 clauses à RETIRER)
 423 | | `retour.appui-voile` | …                                             (« Pas d'`Echelle`. »)
 494 | | `decision.cachet` | …                                                (autre entrée)
 542 | | `revue.cachet` | …                                                   (autre entrée)
1337 | | **B2-3** … `retour.appui` n'a d'`Echelle` que sans `ContentSizeFitter`  (archive)
TOTAL = 6
```

Un `grep -n Echelle` **nu** restreint aux lignes qui nomment `retour.appui` ne peut **pas** valoir 0
après l'amendement : il vaut **6 avant** et **5 après** — `:333`, **`:423`**, `:494`, `:542`, `:1337` —,
et **6 après** si la paraphrase de renvoi à la dette 29 nomme elle-même l'`Echelle` sur la ligne
amendée. Les cinq survivants sont nommés un par un ci-dessus : le fichier **enregistre** le retrait
(`:333`), le **nie** correctement (`:423`, « Pas d'`Echelle`. », qui **doit rester**), et le commente
(`:494`, `:542`, `:1337`). Effacer ces lignes effacerait l'historique de la décision — ou, pour `:423`,
la seule phrase qui dit la règle en vigueur : je ne le propose pas, et je ne maquille ni le 5 en 4 ni
le 4 en 0. **Le contrôle qui vaut 0 est le contrôle mécanique A/B ci-dessus, pas le grep nu.**
`:1337` (« `retour.appui` n'a d'`Echelle` que sans `ContentSizeFitter` d'ancêtre ») est une cellule
d'**archive** dont le texte énonce pourtant une règle au présent : **hors du mandat f2** (qui nomme
`:422` et `:292`), je la signale comme **troisième cellule candidate**, à trancher par f2, et je ne
l'amende pas de ma propre autorité.

## Annexe C — PREUVES DES CORRECTIFS (revue ⊥ n°1 : 2 BLOCKING, 5 IMPORTANT, 4 mineurs)

Cette annexe existe parce qu'il n'y aura **pas de revue de vérification** : c'est le correctif
lui-même qui est vérifié, donc la preuve est dans le texte. **AVANT** = numéro de ligne dans la version
relue par la revue n°1 (le commit immédiatement antérieur à celui-ci, 653 lignes) ; **APRÈS** = numéro
de ligne dans **ce fichier tel qu'il est commité** (778 lignes avant cette annexe), relu à la fin.
Les deux défauts sûrs BLOCKING sont ceux que **f2 a ratifiés** le 11/11.

| finding | AVANT (ligne + citation) | APRÈS (ligne) | ce qui le prouve |
|---|---|---|---|
| **B1** la règle de classement était un RISQUE, et GP ne gardait que le handle | `:462` GP — « rend **exactement un** handle **non nul** […] Rouge sur 0 attachement, sur 2, sur un handle **nul** » · `:488` §5 — « c'est **GP** […] qui tient « jamais refusé » » · `:536` §6.3 #2 — « Le correctif serait un `k` plus bas […] **non tranché ici** » | **règle** `:302-325` (§3.1, 3 marches : plancher → bascule → rouge ; « qui décide, qui a raison ») · **GP** `:545` · **§5** `:584` · **§6.3 #2** `:635` · **D3** `:41` · **P2** `:236` | GP dit désormais « un attachement **ET** l'effet franchit le plancher », mesuré : `grep -n "ET l'effet de cet attachement franchit le plancher"` ⇒ **1** (`:545`). Le remède interdit n'existe plus comme remède : `grep -n "plus bas"` ⇒ **2** (`:316`, `:637`), les deux disant qu'il est **retiré / interdit**. GP publie les **basculés** et les **écarts prédicat ↔ pixels** écran par écran (`:545`) |
| **B2** GE2 mesurait le rect du bouton, pas celui de la cible du voile | `:464` — « idem sur **le rect du bouton**, pour `Alpha` 1 → 0,80 » | **GE2** `:547` · **P1** `:220-222` | `grep -n "rect du bouton"` ⇒ **2** (`:222`, `:547`), et les deux disent **« jamais le rect du bouton »** / « sur le rect du **GameObject qui porte le `CanvasGroup`** — `b` en cas 3, `q` en cas 4 ». P1 et GE1 nommaient déjà « le rect de la cible » : les trois sont maintenant alignés |
| **I1** « 4 après » faux (5), et la ligne oubliée est `:423` | `:646` — « il vaut **6 avant** et **4 après** […] et le commente (`:1337`, `:494`, `:542`) » | `:746-773` | `grep -n "4 après"` ⇒ **1** (`:746`, et c'est la **citation de l'erreur**) · `grep -n "5 après"` ⇒ **1** (`:767`). Les **5** survivants sont nommés un par un, `:423` en tête, avec la sortie du grep (6 lignes) collée `:751-764`. Le « 6 après » (paraphrase nommant l'`Echelle`) est dit aussi |
| **I2** le plancher de 12 px était dans la garde, absent du prédicat | `:215` P1 (« au moins **12 pixels** ») sans contrepartie dans `RendSurface` (`:324-328`) ni `Peint` (`:329-331`), qui n'imposaient qu'une magnitude (« atteint `3f/255f` ») | **bloc PLANCHER** `:384-400` | une seule définition, à deux facteurs (magnitude **et** étendue), explicitement « pour le prédicat ET pour la garde » ; l'étendue du prédicat est un **rect converti en pixels** (calculable au `PointerDown`), celle de la garde un **compte de pixels** ; et **l'intervalle 1-11 a sa règle écrite** (bascule, ou écart soldé au site) |
| **I3** les contrôles de GE3 n'étaient pas écrivables (`const` inlinée, édition de source) | `:465` — « `PlacesReserveesRetourAppui = 0` (**mutation**) […] **Second** contrôle : **retirer la bascule** du `Regie.cs:94` » · `:514` E-R6 « mutations vérifiées » | **GE3** `:548` · **couture** `:552-563` · **E-R3** `:607` · **E-R6** `:610` · **coût** `:619` | `grep -n "mutations vérifiées"` ⇒ **0**. Les contrôles passent par **deux propriétés d'instance** (`PlacesReserveesRetourAppui`, `PistesMelangeMax`) initialisées depuis les `const` et lues par `Creer` (`Regie.cs:520`, `:529`) : le test les pose, la production jamais, et le test **rougit en CI** si la réserve ou la bascule disparaît. Le fait qui le rend nécessaire est mesuré : `MouvementTunables.cs:20` et `:26` sont des `public const int` |
| **I4** « 3 `Button` de `Assets/Tests` » : 2 des 3 sont des chaînes | `:71` — « les `Button` de `Assets/Tests` \| **3** \| ce sont des montages de test » | `:71` | re-mesuré, sortie collée dans la cellule : `ReputationScreenPlayModeTests.cs:907` **monte**, `VitrinePlayModeTests.cs:66` et `:69` sont des `StringAssert.DoesNotContain` ⇒ **3 lignes, 1 montage** (`grep -n "3 lignes nomment le motif"` ⇒ **1**, `:71`). N intact : la commande ne lit que `Assets/Scripts` |
| **I5** « la bascule du cas 0 est toujours possible » : argument de `Realisable`, pas de pixels | `:488` — « l'`Alpha` y est toujours **réalisable** (`RegieInterne.cs:106`), donc la bascule du cas 0 est **toujours** possible » | **contrainte du guichet** `:356-368` · **§5** `:584` | `grep -n "toujours réalisable"` ⇒ **0** ; le mot est devenu **attachable**, avec « ⚠️ attachable n'est pas peint ». La contrainte neuve (« une `surface` nommée vit **dans le sous-arbre de son bouton** ») est **mesurée sur les 3 sites existants** : `Verre` `ExceptionDetailController.cs:540` ⊂ `face` `:527` ⊂ `carte` `:523`, `Button` sur `carte` `:569` · `Remplissage` `DistrictInteriorScreenController.cs:2272` ⊂ `go`, `Button` `:2319` · `Degrade` `LaSuitePanelController.cs:223-224` ⊂ `geste`, `Button` `:233` ⇒ **0 instance fautive**, la contrainte est une garde de non-régression. GP relève la bascule du cas 0 **site par site**, avec ses pixels |
| **m1** `versAppro` `:2846` désignait un fichier de 1335 lignes | `:194` — « `versAppro` `:2846` » | `:194-195` | `grep -n "LieutenantScreenController.cs:2846"` ⇒ **1** (`:194`), avec `Transition.None` à `:2847`. Mesuré : `Button versAppro = vide.AddComponent<Button>();` y est bien |
| **m2** « mesuré : `AppShell.cs:40-42` » était la lecture d'un **commentaire** | `:39` (D1) et `:398` (§3.4 (i)) — « (**mesuré** : `AppShell.cs:40-42`…) » | `:39` · `:477-481` | `grep -n "AppShell.cs:40-42"` ⇒ **0** ; remplacé par `AppShell.cs:36-42` **nommé comme commentaire** et **« non mesuré »**, avec la phrase qui dit que l'argument (ii) porte seul |
| **m3** « une seule édition, répétée 69 fois » : 1 site demande une sortie de portée | `:388` — « **une seule édition, répétée 69 fois** » · `:521` coût — « 69 expressions » | `:464-469` · coût `:619` · **E-R5** `:609` | `grep -n "69 expressions"` ⇒ **1** (`:469`, et c'est la **négation** : « pas « 69 expressions » »). Mesuré : `LaSuitePanelController.cs:228` `Image degrade = …` est dans le bloc `if (premierGeste)` `:220-231`, le `Button` est à `:233` ⇒ **68 substitutions + 1 sortie de portée** |
| **m4** l'illustration n'illustrait pas (les deux formules classaient pareil) | `:341-343` — « donnerait 0,15 × 0,851 = 0,128 ≥ 3/255 là où le prédicat veut 0,15 × 0,851 × **0,18** = 0,023 — et classerait presque tout en cas 2 » | `:409-418` | l'exemple est passé **sous** le seuil : à **α 0,039**, `0,15 × 0,851 × 0,039 = 0,0050 < 0,01176` ⇒ **cas 3**, contre `0,128` ⇒ cas 2 pour `FranchitLeSeuil` — les deux formules classent enfin **différemment**. La provenance de 0,039 est marquée comme **exemple arithmétique** (sa citation d'écran `:2282` est périmée, annexe A) |

**Commandes de vérification, sorties collées** (toutes jouées sur ce fichier) :

```
$ for p in "plus bas" "rect du bouton" "4 après" "5 après" "toujours réalisable" \
           "AppShell.cs:40-42" "69 expressions" "mutations vérifiées" \
           "3 lignes nomment le motif" "LieutenantScreenController.cs:2846" ; do
      echo -n "$p : " ; rtk proxy grep -c -F "$p" design-retour-appui-v5.md ; done
plus bas : 2                         (les deux disent « retiré » / « interdit »)
rect du bouton : 2                   (les deux disent « jamais le rect du bouton »)
4 après : 1                          (la citation de l'erreur corrigée)
5 après : 1
toujours réalisable : 0
AppShell.cs:40-42 : 0
69 expressions : 1                   (dans « pas « 69 expressions » »)
mutations vérifiées : 0
3 lignes nomment le motif : 1
LieutenantScreenController.cs:2846 : 1
```

**Ce que ce correctif ne prétend pas** : aucun run Unity, aucun pixel rendu, aucun typecheck — les
deux BLOCKING étaient **textuels** (ce qu'une garde énonce contre ce qu'une propriété exige) et leur
correctif l'est aussi. Ce qui reste à **mesurer** est inchangé et nommé : E-R1 (la livraison de
l'événement à deux handlers), puis E-R6 (le **volume** des bascules et des écarts prédicat ↔ pixels,
§6.3 #2). Les trous déclarés de la v5 restent ouverts et non maquillés : dettes 32 et 33, la troisième
cellule candidate `:1337` du catalogue, le trou multi-touch (§6.3 #5).
