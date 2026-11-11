# Revue ⊥ n°1 du design `design-retour-appui-v5.md` — **NOT_APPROVED**

**Objet.** `Tools/conformite-anim-2026-10-07/design-retour-appui-v5.md` (document autonome qui remplace
le §17 de `design-couche-mouvement.md` v4.8).
**Base.** worktree `/home/erutheone/project/mafia-unity-F`, branche `design/retour-appui-67-boutons`,
HEAD **`327b6afc`** (base cumul `9b48b2ac`). Aucun fichier du dépôt modifié ; aucun créneau Unity pris ;
aucun typecheck lancé. Les lectures de code sont faites par `python3` avec numérotation explicite ou
`rtk proxy grep -n` — jamais par `cat`/`head`.
**Périmètre borné (ruling f2)** : B1/B2/B3 + I1-I4 de `revue-s17-n5.md` tels que f2 les a tranchés, et
les pièces NEUVES du v5 (inventaire N, propriété, cible, gardes d'effet, plan). Non rouverts : retrait
de l'`Echelle`, deux `Id`, `Mélange ≤ 10`, « jamais refusé », N = 69 fait foi.
**Amendement f2 reçu en cours de revue** et jugé ici : (1) le saut d'une frame au relâchement est le
défaut sûr retenu (classe C, dette 32) ; (2) **un retour d'appui INVISIBLE est un retour REFUSÉ** ⇒ la
garde d'effet ne se calibre jamais vers le bas, un bouton sous le seuil **bascule sur le voile**, la
règle se mesure écran par écran, le compte des basculés est collé, l'invariant reste « N = un
attachement chacun » ; (3) E-R1 avant tout code confirmé.

**VERDICT : NOT_APPROVED — 2 BLOCKING · 5 IMPORTANT · 4 mineurs.**

Tout ce que ce design annonce avoir **compté** tombe juste : j'ai rejoué l'inventaire, le tableau par
fichier, les six comptes annexes et le script de l'annexe B — sorties identiques au caractère près (§0
ci-dessous). Les 42 citations du **mécanisme** et les 31 citations d'**écran** que j'ai relues ligne à
ligne sont exactes, y compris les 11 péremptions de l'annexe A. Le défaut est ailleurs, et il est
entier dans ce que le design **déduit** sans mesurer : la règle de classement que l'amendement f2
exige est laissée en **risque non tranché** (§6.3 #2) alors que la garde censée porter « jamais
refusé » (GP) ne regarde que le **handle**, et la garde du voile mesure le **mauvais rectangle** en
cas 4.

---

## 0. Ce que j'ai rejoué, et les sorties collées

```
$ rtk proxy grep -rn --include='*.cs' 'AddComponent<Button>()' Assets/Scripts | wc -l
69
$ rtk proxy grep -rn --include='*.cs' 'AddComponent<Button>()' Assets/Tests | wc -l
2          (+1 ligne `AddComponent<Button>` sans parenthèses : 3 lignes au total — cf. I4)
$ find Assets -name '*.prefab' | wc -l            → 0
$ rtk proxy grep -rl 'Button' Assets --include='*.unity' | wc -l → 0   (195 `.unity` au total)
```

Le tableau par fichier du §1.2, rejoué par le script du document lui-même : **identique**, 35 fichiers,
`TOTAL = 69`. Les 8 assemblies et les références : vérifiées un `asmdef` après l'autre —
`Account, CityMap, CitySim, CoreLoops, Onboarding, Operational, Shell` référencent toutes
`ShellContracts` ; `Economy` aussi et ne crée aucun `Button` ; `ShellContracts.asmdef` référence
exactement `Theme, I18n, Unity.TextMeshPro` (§1.2 exact). *Contrôle que le design ne fait pas et qui
aurait pu tout casser* : `UnityEngine.UI` n'est **pas** dans ses références — mais
`ShellContracts/PiedDEcran.cs:152` y crée déjà un `Button` (auto-référence du paquet uGUI), donc
`Retour.cs` y atteint `Button`, `Graphic` et `ContentSizeFitter`. **Pas un finding : une prémisse non
dite qui tient.**

Comptes annexes, tous reproduits à HEAD :

```
ContentSizeFitter : 77 lignes · 22 fichiers · 27 poses  (§1.6 exact, m2 fermé)
Transition.None   : 17 lignes — 16 sur un Button, 1 sur la Scrollbar (ReputationScreenController.cs:964)
                    ⇒ 69 − 16 = 53 reproduit
Scrollbar 1 · Slider 1 · TMP_InputField 3 · LongPressButton 7
<color 8 · ignoreParentGroups 0 · <alpha= 0 · colorGradient/enableVertexGradient 0
```

Les 16 `Transition.None` posés sur un `Button` : types vérifiés un par un par leur déclaration
(`ForensicScreenController.cs:394`, `DailyReviewScreenController.cs:55`,
`LieutenantScreenController.cs:2846`, `HighestLeverageCardController.cs:58`,
`DecisionDetailScreenController.cs:166`) — **16 confirmé**.

Annexe B rejouée telle quelle : `TOTAL A = 3` et `TOTAL B = 2`, mêmes lignes
(`A 351 352 353 422 423 424 1014 1335 1369` / `B 292 1369`), `:422` porte bien **2** occurrences
d'`Echelle` (appui ET relâchement) et `:423` la **négation** « Pas d'`Echelle`. ». Diff du mécanisme
`b7c522a7..HEAD` sur `Mouvements/` + les deux fichiers de test : **sortie vide** — l'annexe A dit vrai.

Citations du mécanisme relues (toutes exactes) : `Regie.cs` `:23 :54-60 :73 :75 :77 :86 :88 :89 :94-100
:96 :115-116 :122 :156 :159 :169-171 :188 :330 :473-478 :476 :480-490 :503 :505 :509 :512-513 :518 :520
:523 :526-533 :537 :544 :545-546 :549-553 :559 :571 :617-637 :628 :634` · `Gardes.cs` `:183-184 :196-214
:199 :211 :213 :253 :265 :272 :308-310` · `MouvementTunables.cs` `:18-20 :21-26 :76` · `Couleurs.cs:32-35`
· `RegieInterne.cs` `:97-108 :102 :106 :118-121` · `PolitiqueMouvement.cs:20-30` (`:30` : le `Retour`
`Alpha` **sans** `PoseDefinie` n'est pas gelé — GD1 est juste) · `Modele.cs:84` · `CatalogueHud.cs`
`:52-143 :149` (10 entrées, 0 occurrence de `appui`) · `AppShell.cs:40-42` · `LongPressButton.cs:11-15`
· `MouvementsGardesPlayModeTests.cs:478` · `MouvementsRegiePlayModeTests.cs:151-153 :206-224`.
`RegieMouvement.PourTest()` existe bien (`RegieMouvement.cs:47`, horloge `Figee(0)`) et toute `Regie`
admet `CatalogueHud.Entrees` dès sa construction (`Regie.cs:23`, `:54-60`) ⇒ le protocole « régie
vierge » du §4 résoudra les deux `Id` neufs. **Écrivable.**

Citations d'écran relues (exactes, y compris les 11 péremptions) : `CityMapController.cs:747-749 :894
:895` · `DistrictInteriorScreenController.cs:689-696 :2126-2140 :2272 :2282 :2312 :2319` ·
`ExceptionDetailController.cs:540 :569 :570` (et `Verre` ⊂ `face` ⊂ `carte` : la surface nommée est
**dans** le sous-arbre du bouton) · `LaSuitePanelController.cs:220 :223 :233` ·
`DailyReviewScreenController.cs:1101-1103` (+ `:366` `versLaFamille.interactable = RienATenir` : l'exemple
de cas 3 **est** pressable dans un état montable — la §3.3 dit vrai) ·
`DelegationScreenController.cs:1519-1531` · `DemolitionScreenController.cs:1456-1461` ·
`BandeauEphemere.cs:251-260` · `ReputationScreenController.cs:960-966 :992-996` ·
`TopBarController.cs:938-942 :994-998` · `InspectionScreenController.cs:413-417 :472-476` ·
`ExceptionQueuePanelController.cs:97-101` · `TamponAuComptoir.cs:90-104` ·
`catalogue-mouvements.md:292 :333 :351-353 :422 :423 :1066 :1076 :1337`.

**Le point fragile n°1 du rédacteur est correctement traité, et je le salue.** La livraison de
plusieurs `IPointerDownHandler` sur un même GameObject est nommée comme *l'unknown qui porte tout le
reste* (§3.4), le dépôt est cité pour ce qu'il prouve (`TamponAuComptoir.cs:92` + `:102` co-localisent
`Button` et `LongPressButton` — vérifié, même `t`) **et pour ce qu'il ne prouve pas**
(« co-localisation n'est pas livraison d'événement »), et le plan en fait **E-R1, première étape avec
créneau, avant toute ligne de code**, avec la conséquence écrite si la réponse est non (D1 tombe). Le
design ne bâtit pas dessus : E-R2/E-R3 (donnée + régie) survivent à la chute de D1. **Aucun finding.**

---

## BLOCKING

### B1 — la règle de classement de l'amendement f2 est un **RISQUE**, pas une règle, et **GP ne garde que le handle**

Deux citations exactes du design, à 100 lignes d'écart.

§5, cellule **B1** (ce qui est censé fermer « jamais refusé ») :

> **Condition f2 tenue** : c'est **GP** (§4), garde de population avec contrôle positif, qui tient
> « jamais refusé » — plus aucune affirmation sans garde

§4, cellule **GP** (ce que GP mesure réellement) :

> pour chaque bouton monté, actif et `interactable`, un `PointerDown` simulé rend **exactement un**
> handle **non nul** d'`Id` ∈ {`retour.appui`, `retour.appui-voile`} […] Rouge sur 0 attachement, sur
> 2, sur un handle **nul**.

§6.3, risque **2** (ce que le design fait du cas que f2 vient de trancher) :

> `Cible × 0,85` sur une encre déjà sombre, composée en **linéaire**, peut rendre moins d'un niveau :
> alors le cas 1-2 est *techniquement* attaché et *perceptuellement* nul […] Le correctif serait un `k`
> plus bas, ou la bascule sur le voile ; **non tranché ici**.

GP est une garde sur le **paramètre** de l'effet (un handle non nul), présentée comme la garde de son
**effet** (« jamais refusé »). Sous la définition que f2 vient de poser — *un retour d'appui invisible
est un retour refusé* — GP est **verte exactement sur le cas que f2 appelle un refus** : un bouton en
cas 1-2 dont les pixels ne bougent pas a bien « exactement un handle non nul de l'un des deux `Id` ».
C'est la classe de défaut que le socle nomme (« une garde sur les PARAMÈTRES d'un effet n'est pas une
garde sur son EFFET ») et que le design s'applique pourtant à lui-même partout ailleurs (GE1-GE4
rendent et comptent les pixels).

Le mécanisme de la bascule, lui, **existe** dans le document : le prédicat `RendSurface` du §3.2 porte
le seuil `3f/255f`, donc un bouton sous le seuil tombe en cas 3-4 (voile), et si le voile ne peint rien
D3 en fait un rouge. **Mais** : (i) §6.3 #2 déclare l'issue « non tranché » et propose comme remède un
`k` plus bas, c'est-à-dire un changement d'amplitude, alors que f2 l'interdit en bloc (« ne se calibre
JAMAIS vers le bas ») ; (ii) le prédicat décide sur une **arithmétique de `Color`** (§3.2 : « en unités
`Color` 0-1 […] multiplié par `g.color.a` **et** par l'alpha cumulé des `CanvasGroup` ») que la
propriété P1 du même document déclare non fiable **dans ce sens précis** (« un facteur `× 0,85` sur une
encre sombre peut rendre moins de 3/255 **alors que le calcul sur `Color` annonce le contraire** ») ;
(iii) rien ne publie le compte des basculés. Le document fournit même l'instance : le « Or à α 0,18 »
donne `0,15 × 0,851 × 0,18 = 0,023` ⇒ **5,9/255 ≥ 3/255**, donc cas 1-2 **accepté par le prédicat**, et
c'est précisément la classe que P1 dit pouvoir rendre 0 pixel.

Écrit tel quel, le lot donne : GP **verte**, GE1 **rouge**, et **aucune règle écrite** pour sortir —
le seul remède nommé est interdit par f2, l'autre est « non tranché ». Un relecteur de gate lirait
« 69/69 attachés, jamais refusé » sur un écran où le joueur ne voit rien.

**Défaut sûr demandé** (le choix reste à l'auteur ; ce sont quatre lignes, pas une réécriture) :

1. **§3.1 — en faire une règle, pas un risque** : le cas 1-2 n'est **retenu** que si l'effet de son
   `Melange` **mesuré sur les pixels** franchit le plancher ; sinon `AttacherVoileDAppui` (cas 3-4) ; si
   le voile non plus ne franchit rien, **rouge** jusqu'à ce qu'une `surface` soit nommée au site —
   c'est l'échelle de D3, étendue du cas structurel (« rien ne peint ») au cas perceptuel. L'amplitude
   `× 0,85` et le seuil `3/255` ne bougent **jamais** vers le bas.
2. **§4 GP — un seul relevé, un seul verdict par bouton** : « exactement un attachement » **ET**
   « l'effet de cet attachement franchit le plancher sur les pixels » (GE1 pour un `Melange`, GE2 pour
   un voile). Un handle non nul à effet nul est un **rouge de GP**, avec son chemin.
3. **GP publie, et le compte est collé au gate** : montés / pressables / non pressables / **basculés
   sur le voile** / sites non couverts, **écran par écran**.
4. **Dire que le décideur d'exécution est un prédicat, et que la mesure le CALIBRE** : le prédicat du
   §3.2 doit être évalué dans l'espace où le canvas compose (ou recalé sur la mesure de pixels), et
   l'écart prédicat/pixels doit être **compté et publié** par le relevé. Sans cette phrase, le
   prédicat et la garde jugent dans deux unités différentes — exactement le piège du socle (« recopier
   une opacité est un changement d'unité silencieux »).

### B2 — **GE2 mesure le mauvais rectangle en cas 4**, et contredit P1 du même document

§4, cellule **GE2** :

> | **GE2** effet du voile | idem sur **le rect du bouton**, pour `Alpha` 1 → 0,80 |

§2, **P1** (la propriété que GE2 est censée rendre) :

> au moins **12 pixels** du rect de **la cible** diffèrent de **≥ 3/255**

§3.1, **cas 4** (ce qu'est la cible du voile dans ce cas) :

> | **4** | le **parent direct** `q` du bouton | `retour.appui-voile` | `Peint(q)` vrai **et**
> aire(`q`) ≤ 2 × aire(`b`) |

En cas 4, le `CanvasGroup` est posé sur `q`, et c'est le sous-arbre de `q` qui s'assombrit. Le prédicat
`Peint(q)` (§3.2) n'exige **rien** sur la position de l'encre : « la sous-arborescence de `t` (lui
compris) porte au moins un `Graphic` […] dont l'écart rendu du voile […] atteint `3f/255f` ». La seule
contrainte géométrique est aire(`q`) ≤ 2 × aire(`b`) — qui n'interdit pas que **toute** l'encre de `q`
soit hors du rect de `b`. Un test écrit littéralement d'après GE2 compte alors les pixels d'un
rectangle où le voile ne change rien : **rouge sur un voile qui fonctionne**, et le rouge serait
attribué au mécanisme. Le cas n'est pas théorique : cas 4 est le cas mesuré du design
(`DelegationScreenController.cs:1528`), et il n'y échappe que parce que `zone` est `Etirer`é sur `go`
(`:1523-1524`, relu) — c'est-à-dire par un accident de ce site, pas par la règle.

**Défaut sûr** : GE2 compte les pixels du **rect de la cible du voile** — celui de `b` en cas 3, celui
de `q` en cas 4 (le GameObject qui porte le `CanvasGroup`) — ce qui est déjà le mot
juste de P1 et de GE1 (« rect de la cible »). Une cellule, aucun compte touché.

---

## IMPORTANT

### I1 — annexe B : le « **4 après** » du contrôle de B3 est faux (**5**), et la ligne oubliée est celle que l'auteur dit devoir survivre

Mesuré :

```
lignes de catalogue-mouvements.md contenant 'retour.appui' ET 'Echelle' = 6
  333  (la note du 08/10)          422  (les 2 clauses à retirer)      423  (« Pas d'Echelle. »)
  494  (decision.cachet)           542  (revue.cachet)                1337  (archive B2-3)
```

Le « 6 avant » est exact. Mais l'annexe B justifie son « 4 après » par
« le fichier **enregistre** le retrait (`:333`) et le **commente** (`:1337`, `:494`, `:542`) » — elle
**omet `:423`**, dont la même annexe écrit dix lignes plus haut : « l'unique survivant est `:423`, dont
le texte mesuré est « **Pas d'`Echelle`** » : une **négation**, qui est juste et **qui reste** ». Après
l'amendement de `:422` (et selon que la paraphrase de renvoi à la dette 29 nomme ou non l'`Echelle`),
le grep nu vaudra **5** ou **6**, jamais 4. Conséquence réelle : qui joue le contrôle à E-R0 lit 5, le
croit raté, et la seule façon d'atteindre 4 est d'effacer la négation de `:423` — l'exact contraire de
ce que l'annexe prescrit. **Défaut sûr** : annoncer **5** (ou 6, avec la paraphrase), en nommant les
cinq lignes.

### I2 — le plancher de **12 pixels** est dans la garde, absent du prédicat qui décide

GE1 exige « ≥ **12** pixels du rect de la cible [qui] diffèrent de ≥ **3/255** » ; `RendSurface` (§3.2)
n'impose **qu'une magnitude** (« atteint `3f/255f` »), **aucun compte de pixels**. Une surface qui
franchit le seuil sur 1 à 11 pixels (un liséré fin, un glyphe isolé) est donc classée **cas 1-2 à bon
droit** par le mécanisme et fait **rougir GE1** — rouge pour la mauvaise raison. Même asymétrie pour
`Peint`/GE2. **Défaut sûr** : le critère qui décide et le critère qui garde sont le **même** critère
(magnitude **et** compte), ou le plancher de 12 est déclaré plancher d'**anti-vacuité de la mesure**
avec la règle écrite pour l'intervalle 1-11 (bascule, ou rouge nommé). Lié à B1 (4).

### I3 — les deux contrôles positifs de **GE3** ne sont pas écrivables comme tests

§4, GE3 : « `PlacesReserveesRetourAppui = 0` (mutation) ⇒ l'appui est refusé ⇒ rouge. **Second**
contrôle : retirer la bascule du `Regie.cs:94` ⇒ rouge ». Or `PlacesReserveesRetourAppui` est
`public const int` (`MouvementTunables.cs:20`, relu) : une `const` C# est inlinée à la compilation,
aucun test ne peut la poser à 0. Et « retirer la bascule de `Regie.cs:94` » est une édition du code
livré. Les deux sont des **mutations de source jouées à la main**, pas des contrôles qui vivent en CI —
alors que le préambule du §4 promet, pour **chaque** garde, « son contrôle positif : une version
fautive qui doit rougir pour la bonne raison, avec le **message exigé** », et que E-R6 les range sous
« mutations vérifiées » sans dire qu'elles sont hors CI et non régressables. (À comparer avec GS1, dont
le contrôle est explicitement « un contenu synthétique […] passé au scan **dans le test** » : celui-là
est écrivable, et c'est pourquoi la fonction pure est la bonne idée.) **Défaut sûr** : soit dire que ces
deux contrôles sont des actes **manuels, uniques, journalisés au créneau** (et que rien ne les rejoue),
soit leur donner une couture de test (lire la réserve par une propriété que le test peut poser).

### I4 — « les `Button` de `Assets/Tests` : **3** — ce sont des montages de test » : 2 des 3 n'en sont pas

Mesuré :

```
Assets/Tests/PlayMode/VitrinePlayModeTests.cs:66: StringAssert.DoesNotContain("AddComponent<Button>", s, …)
Assets/Tests/PlayMode/VitrinePlayModeTests.cs:69: StringAssert.DoesNotContain("art.AddComponent<Button>()", s, …)
Assets/Tests/PlayMode/ReputationScreenPlayModeTests.cs:907: var temoin = temoinGo.AddComponent<Button>();
```

**3 lignes, 1 montage** : les deux premières sont des assertions d'**absence**, c'est-à-dire des
chaînes de caractères. La décision (exclure) est juste et l'exclusion ne touche pas N ; c'est le mot
qui est faux — et c'est exactement le reproche que ce document adresse lui-même au §17 en m2 (« « 75
occurrences » est un compte de lignes »). Dans la table qui **définit la frontière de l'inventaire**,
la règle doit tenir pour l'auteur aussi. **Défaut sûr** : « 3 lignes nomment le motif, **1** monte un
`Button` ».

### I5 — « la bascule du cas 0 est **toujours** possible » est un argument de `Realisable`, pas de pixels

§5, cellule B1 : « En cas 1-2, `cibleVoile` = le `RectTransform` **du bouton** : jamais nul, et
l'`Alpha` y est **toujours réalisable** (`RegieInterne.cs:106`), donc la bascule du cas 0 est
**toujours** possible. » `RegieInterne.cs:106` (`default: return true`, relu) prouve qu'un `Alpha` est
**attachable** — pas qu'il **peint**. Si la `surface` nommée d'un cas 1 est hors du sous-arbre du
bouton, le voile du cas 0 assombrit un sous-arbre qui peut ne rien peindre : handle non nul, 0 pixel.
GE3 ne ferme pas le trou : c'est **un** scénario sur **un** porteur, pas un relevé de population.
**Mesure qui limite la portée, et pourquoi ce n'est pas BLOCKING** : les 3 sites à `surface` nommée du
§3.1 ont tous leur surface **dans** le sous-arbre du bouton — `Verre` ⊂ `face` ⊂ `carte`
(`ExceptionDetailController.cs:523`, `:527`, `:540`, `:569`), `Remplissage` ⊂ `go`
(`DistrictInteriorScreenController.cs:2272`, `:2319`), `Degrade` ⊂ `geste`
(`LaSuitePanelController.cs:223-224`, `:233`). **Aucune instance aujourd'hui.** **Défaut sûr** : dire
que la bascule du cas 0 est relevée **par site de cas 1** dans GP (avec ses pixels), et poser au
guichet la contrainte « une `surface` nommée est dans le sous-arbre de son bouton » — sinon le cas 0 de
ce site est un rouge déclaré.

---

## mineurs

- **m1 — §1.6, `versAppro` `:2846`** : par la convention du document (un `:N` nu = le fichier nommé
  juste avant), cela désigne `DailyReviewScreenController.cs:2846` — **qui n'existe pas** (1335
  lignes). Le vrai porteur est `LieutenantScreenController.cs:2846`
  (`Button versAppro = vide.AddComponent<Button>();`, `Transition.None` à `:2847`). Le compte de 16
  n'en dépend pas : il est vérifié indépendamment.
- **m2 — §3.4 / D1, « mesuré : `AppShell.cs:40-42` »** : les lignes 36-42 sont un **commentaire** de
  code, pas du code. L'affirmation (un `Start()` différé d'une frame après `AddComponent`) est vraie de
  la sémantique Unity, et l'argument (ii) du même paragraphe (un site produit n instances plus tard) la
  porte tout seul — mais le mot « mesuré » ne convient pas à la lecture d'un commentaire, dans un
  document qui fait de cette distinction sa discipline.
- **m3 — §3.4, « une seule édition, répétée 69 fois »** : à `LaSuitePanelController.cs`, la `surface`
  à passer (`degrade`, `:228`) est une locale **du bloc `if (premierGeste)`** (`:220-231`) et n'est pas
  dans la portée du `Button` (`:233`). Ce site demande une sortie de portée, pas une substitution
  d'expression. Un sur 69, mais le coût annoncé est « 69 expressions ».
- **m4 — §3.2, l'illustration n'illustre pas** : « donnerait 0,15 × 0,851 = 0,128 ≥ 3/255 là où le
  prédicat veut 0,15 × 0,851 × 0,18 = 0,023 ». Les deux valeurs franchissent 3/255 (0,023 > 0,0118) :
  sur cet exemple, les deux formules classent **pareil** (cas 2), donc il ne montre pas le
  « classerait presque tout en cas 2 » qu'il doit montrer. L'arithmétique est juste (cf. revue n°5) ;
  il faut un exemple sous le seuil (α 0,039 ⇒ 0,005 < 0,0118).

---

## Ce qui est vérifié JUSTE et ne doit pas être rouvert

- **L'inventaire et sa méthode.** N = 69 à HEAD, 68 à `b7c522a7`, 67 au 08/10 : reproduit. D4 (aucun
  littéral gelé, toute garde recompte) est la bonne décision et elle est tenue dans tout le document.
  §1.5 (un **site** n'est pas un **bouton**, deux comptes nommés séparément, `DelegationScreenController.cs:1528`
  atteint par 5 `RendreCliquable` — relu) ferme la classe de défaut que ce lot doit fermer.
- **B3 et son contrôle** (hors I1) : `:422` porte bien les 2 clauses prescriptives, `:292` la contrainte
  des « échelles restantes », et le script de l'annexe B est mécanique et reproductible. Le refus de
  maquiller le 4 en 0 est la bonne réponse ; la **troisième cellule candidate signalée mais non amendée**
  (`:1337`, « `retour.appui` n'a d'`Echelle` que sans `ContentSizeFitter` d'ancêtre » — relue : elle
  énonce bien une règle au présent dans une table d'archive) est exactement le trou honnêtement
  documenté qu'on garde, renvoyé à f2 sans excès d'autorité. **À saluer.**
- **I2, I3, m1-m4 de la revue n°5** : fermés. `Regie.cs:122` `Inspecter` rend l'`Entree` de n'importe
  quelle piste vivante (relu) et l'abandon de la phrase d'unicité est le bon correctif ; les 4 appels de
  `Creer` sont bien `:98 :102 :159 :171` ; `:351/:352/:353` corrigent m1 ; 77/22/27 corrige m2 ;
  `DelegationScreenController.cs:1519-1531` et `DemolitionScreenController.cs:1449-1461` corrigent m3 ;
  la reformulation « G14 (c) **EMPÊCHE**, GS1 **rougit** » corrige m4 et nomme le bon signal de CI.
- **B1 de f2 (deux méthodes), I1, I3** : écrivables. Les trois levées (`Regie.cs:88 :89 :96`) deviennent
  effectivement inatteignables dès lors que les entrées sont résolues dans `admises`, lequel est peuplé
  par `CatalogueHud.Entrees` à la construction de toute `Regie` (`:23`, `:54-60`) ; la réécriture du
  contrôle négatif de `MouvementsRegiePlayModeTests.cs:151-153` sur la **raison** du refus est le bon
  geste, et les **6** tests touchés sont déclarés au gate.
- **B2 de f2 (montage synthétique hors de N)** : juste, et la raison est mesurée —
  `DelegationScreenController.cs:1522-1529` relu, aucun `targetGraphic`, seul `Graphic` à α 0, pas
  d'enfant ⇒ cas 1-2 impossibles ⇒ ce bouton ne peut pas porter GE4. L'exclusion explicite du montage
  de N, de l'inventaire et de GS2/GP est la bonne clôture.
- **GD1 et le gel** : `PolitiqueMouvement.cs:30` relu — un `Retour` `Alpha` **sans** `PoseDefinie` n'est
  pas gelé sous `Reduit`. La contrainte de donnée « `retour.appui-voile` ne déclare **pas** de
  `PoseDeReposS` » est juste, et sans elle le joueur perdrait son retour en mouvement réduit.
- **D2 et l'amendement f2 (1)** : les trois murs du §3.5 sont relus et tiennent —
  `Regie.cs:169-170` (`Transitionner` exige UN canal `Absolu`, le voile est `Multiplicatif`),
  `:549-553` (G12 refuse sur un couple issu d'`Attacher`), `:171` (`Transitionner` passe
  `retourAppui: false`, donc G14 (c) mordrait). Le saut d'une frame est bien le **défaut sûr**, la
  dette 32 porte son prix écrit, et le risque §6.3 #4 (un juge peut le classer A/B) est déclaré au bon
  endroit. Le trou **multi-touch** (§6.3 #5) est déclaré, non maquillé : à garder tel quel.
- **P0 avant tout le reste** (`CanvasRenderer`, `MaskableGraphic` sous un `Mask`, ordre de fratrie) et
  **GS0** : l'ordre « structurelles d'abord » est respecté, et c'est ce qui rend les gardes de valeur
  non vacuelles. GS1 comme **fonction pure** de (chemin, contenu) est la pièce qui rend le contrôle
  positif écrivable — bonne pièce.
- **Le protocole du relevé** (§4, dernier paragraphe) : régie vierge, `Detacher` après chaque bouton,
  chaque état montable nommé, et « le relevé **ne pose aucun composant** ». Ce dernier point ferme la
  garde-qui-répare-avant-de-mesurer. À conserver mot pour mot.

---

## Auto-audit du verdict

- **Chaque compte de ce rapport est une mesure que j'ai lancée**, jamais un chiffre relayé : 69, 2+1,
  0 prefab, 195 `.unity`, 77/22/27, 17/16/1, 1/1/3/7, 8/0/0/0, `TOTAL A = 3`, `TOTAL B = 2`, 6 lignes
  `retour.appui`+`Echelle`, diff mécanisme vide. Les sorties sont collées au §0.
- **Les deux BLOCKING portent chacun deux citations exactes du design qui se contredisent entre elles**
  (GP/§6.3 #2 et §5 B1 ; GE2/P1+cas 4), plus la ligne de code qui tranche (`MouvementTunables.cs:20`
  pour I3, `RegieInterne.cs:106` pour I5, `Regie.cs:169-171 :549-553` pour D2). Je n'ai retenu **aucun**
  BLOCKING sur une prémisse non démontrable depuis le dépôt : les deux se lisent entièrement dans le
  document et dans le code à HEAD.
- **Je n'ai pas rouvert ce qui est tranché** : retrait de l'`Echelle`, deux `Id`, `Mélange ≤ 10`,
  « jamais refusé », N = 69, le saut d'une frame au relâchement, E-R1 avant tout code. B1 ci-dessus ne
  rouvre pas « jamais refusé » : il demande **quelle garde le porte**, comme f2 l'a demandé.
- **Ce que je n'ai pas fait** : aucune exécution Unity, aucun créneau pris, aucun typecheck lancé,
  aucun pixel rendu. Mes affirmations sur le comportement à l'exécution sont des **lectures de source**
  — y compris celles qui portent les BLOCKING, dont la démonstration est textuelle (ce que la garde
  mesure vs ce que la propriété exige), pas expérimentale. Le point fragile n°1 du rédacteur reste à
  **mesurer** à E-R1 : je confirme qu'il est traité comme tel et je ne l'ai pas tranché.
- **Un trou honnêtement documenté se garde** : je n'ai demandé la disparition d'aucun test ni d'aucune
  ligne d'archive. Les deux dettes ouvertes (32, 33), la troisième cellule candidate `:1337` et le trou
  multi-touch sont à **conserver avec leur commentaire de péremption**.
- **Si l'auteur réfute un finding avec une mesure, je le lâche.** Le plus réfutable est **B2** : si
  l'auteur démontre qu'en cas 4 l'encre de `q` est toujours dans le rect de `b` (il faudrait une
  contrainte, pas l'accident d'`Etirer` de ㉜), B2 tombe en mineur de rédaction. **B1 n'est pas
  réfutable par une mesure** : il porte sur ce que la garde **énonce**, et c'est l'amendement f2 qui en
  fixe la barre.
