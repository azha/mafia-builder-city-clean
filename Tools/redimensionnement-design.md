# Lot « redimensionnement » — **v4** — le client survit à un changement de taille en cours de vie

> **Ruling user 2026-08-30** : « supporter le redimensionnement pour de vrai ».
> **v1 : NOT_APPROVED** (5B/7M/4m) · **v2 : NOT_APPROVED** (3B/5M/5m).
> Rapports : `/tmp/revue-redimensionnement-design.md`, `-v2.md`.
>
> ★★★ **Le motif de ce lot, trois fois de suite : je nomme le bon monde dégénéré et je durcis la
> MAUVAISE GRANDEUR.** v1 : émetteur sur `Screen.width`, que le harnais ne change jamais. v2 : garde
> sur la NULLITÉ de la zone sûre, alors que le défaut vit dans sa **VARIANCE**. C'est nommément
> l'entrée « aiguille inversée » du socle — *le monde dégénéré que je viens de nommer est-il
> exprimable dans la grandeur que j'asserte ?*
> ★★★ **Et v2 a reproduit le `somme ≠ total` de v1** : 20 clusters comptés, **4 publiés**.
>
> ## ✅ v3 : la question directrice est tranchée FAVORABLEMENT — l'émetteur est enfin sur la bonne grandeur
> `renderingDisplaySize` **bouge** sur la bascule de RenderTexture, **prouvé statiquement en 3 maillons** :
> `CanvasScaler.cs:304` la lit (et rien d'autre) · `m_MatchWidthOrHeight = 0` + refW 1280 ⇒
> `canvas.scaleFactor == renderingDisplaySize.x / 1280` **exactement** · `runA-1820.log:891→:917` :
> `Screen` reste à **640** pendant que `scaleFactor` passe de `0,5000` à `0,8438`, soit **640 → 1080**.
> Les 9 rangées ancrées du §2 sont **exactes une par une**, `P4/P5` sont bien **les deux seuls trous**
> (12 sites prod / 19 test sur `ShellChrome.*`), et `somme = total` **ferme**.
>
> ⛔ **Mais le motif s'est déplacé d'un cran pour la 4ᵉ fois : la v3 a créé un mécanisme de PRODUCTION
> NEUF — le sauvetage/restauration du cadrage (§3) — que sa propre falsifiable §6 ne peut pas voir, et
> qu'elle CONTREDIT dès qu'il est exercé.** J'avais écrit la règle au §10 (*le correctif crée le défaut
> suivant : demander quelle propriété je SUPPRIME*) **et je ne l'ai pas appliquée à mon propre §3.**

## 0. L'exposition — inchangée, vérifiée trois fois

```
defaultScreenOrientation: 0 + portrait seul   ⇒ ROTATION VERROUILLÉE
androidResizeableActivity: 1                  ⇒ SPLIT-SCREEN AUTORISÉ
androidDefaultWindowWidth 1920 / Height 1080 · MinimumWindow 400×300
   ⇒ le multi-fenêtres déclare une fenêtre PAYSAGE : il SUSPEND le verrou d'orientation
```
⚠️ **DEUX énoncés datés FAUX en production, pas un — et §0 des versions précédentes n'en couvrait qu'un.**
- **Proposition A** — « `Screen.width` ne change plus jamais ensuite » : ≥ 6 formulations sur 2 fichiers
  (`AppShell.cs:708,709,710,714,743` · `AccueilPanneaux…:294,304`).
- ⛔ **Proposition B (B2), NON COUVERTE jusqu'ici et c'est la plus grave** — `AppShell.cs:795-800`
  affirme que le facteur d'échelle est « **TOUJOURS `Screen.width / referenceResolution.x`**, calculé
  DIRECTEMENT plutôt que lu sur `canvas.scaleFactor` ». **Mesurablement faux** : `runA-1820.log` donne
  `scaleFactor = 0,8438` là où `Screen.width/1280 = 0,5000`. **4 formulations sur 3 fichiers**
  (`AppShell.cs:705`, `:718-719`, `:744-746`, `DistrictInteriorScreenController.cs:1793`) —
  et `DistrictInteriorScreenController.cs` n'était dans aucun « 2 fichiers ».
  ★★ **C'est cette prémisse qui a mis `Screen.width` à `:827`**, c'est-à-dire la ligne même que §5
  supprime : *le correctif déplace la lecture et laisse trente lignes plus haut l'énoncé qui la
  justifiait.* La jointure du socle, exactement.
⇒ **Contrôle avant/après par INDEX sur les DEUX propositions**, portée déclarée, jamais citer la
clause retirée (décrire un correctif est un acte de citation).

## 1. L'API — MESURÉE, pas déduite (10 215 DLL, contrôle négatif à 0)

```
renderingDisplaySize             ✅ 29 hits / 3 DLL  (UnityEngine.UI, UIModule, UnityEngine)
OnRectTransformDimensionsChange  ✅  8 hits / 2 DLL  (UnityEngine.UI, TextMeshPro)
onScreenSizeChanged              ⛔  0 — N'EXISTE PAS
```
⚠️ **Ma première mesure était un FAUX NÉGATIF** : 175 DLL balayées, `OnRectTransformDimensionsChange`
à 0. Le périmètre était trop étroit (`UnityEngine.UI.dll` vit dans `Library/PackageCache`).
⇒ *Un balayage qui rend « aucun » exige qu'on demande d'abord quelle forme aurait échappé au motif —
et ici c'était le PÉRIMÈTRE, pas le motif.*

## 2. Les 20 clusters — **PUBLIÉS**, c'est le geste que v1 et v2 ont tous deux manqué

### PERSIST — 9 clusters. **7 déjà couverts, 2 à découvert.**

| # | ce qui est cuit | ancre | hook |
|---|---|---|---|
| **P1** | `ZoomLevels` de la navigation | `Configure` appelé `:613`, composant créé **uniquement** `:602`, enfant de `root` | **`:1807` SEUL** |
| **P2** | *(à re-vérifier par R1 — non publié par v2, ancre non tenue par moi)* | — | — |
| **P3** | `ShellChrome.Top/BottomInsetPx` | `PublierInsetsDuChrome:820-821` | `AppShell.cs:1352` (dernière instruction de `:1302`) |
| **P4** | insets de zone sûre du district | `EnterDistrict:273-275` → `SetSafeInsets` → `DistrictInterior:119-120,127-128` (**champs**), relus `:383`,`:518` | ⛔ **AUCUN** — 1 seul appelant |
| **P5** | feuille de l'écran Famille | `LieutenantScreenController.cs:1027-1030`, `offsetMin/offsetMax` ← `ShellChrome.*InsetPx` | ⛔ **AUCUN** |
| **P6** | `fondRt.sizeDelta = tex / scaleFactor` | `:393` → `:458` | **`:1807` SEUL** |
| **P7** | letterbox du titre | `:473-476` (`root.rect.width`) | **`:1807` SEUL** |
| **P8** | tailles/offsets des cellules | `:646`, `:684-686` (`/ scaleFactor`) | **`:1807` SEUL** |
| **P9** | `ficheRoot.offsetMin` ← `BottomInsetPx` | `:1507` ; `BuildFiche(root)` `:1415` ⇒ enfant de `root` | **`:1807` SEUL** |
| **bande Accueil** | la bande des 4 panneaux | `PoserBandeAccueil:688` | `RebatirPanneauxAccueil…` |

⇒ **`:1807` est l'unique hook de CINQ clusters.** C'est le fait qui tranche §3.
⛔ **R1 doit publier les 11 TRANSIENT avec ancre**, repris de la table de la revue v1 **et
re-vérifiés** — je ne les tiens pas, et *un fait rapporté reste DÉDUIT tant qu'on n'a pas lu le corps*.
Deux d'entre eux (`MajEchelleFamille:1841`, `EchelleMaquette.LargeurCanvas:114`) sont innocentés **par
l'invariance de la largeur logique**, pas par le critère « recalculé à chaque appel ».

## 3. M7 — **TRANCHÉ ICI**, pour qu'aucun coder ne le tranche seul

v2 se contredisait : R1 disait « appeler les 3 hooks », §5 disait « repositionner plutôt que
reconstruire ». **Interdire l'appel découvre P1, P6, P7, P8, P9** ; et « repositionner » revient à
réécrire la géométrie de `Render` — donc **une seconde trajectoire parallèle**, exactement la dette
que `AppShell.cs:663-672` dénonce (« *deux copies qui doivent rester parallèles sont une dette* »).

⇒ **DÉCISION : appeler `:1807`, en SAUVEGARDANT et RESTAURANT le cadrage (pan/zoom) autour de
l'appel.** `RebatirPourResolutionCourante` détruit `root` — donc un joueur perdrait sa vue en cours de
partie, ce qui serait un **défaut joueur** livré par le lot censé en supprimer un.
⛔⛔ **B1 — ET LE SAUVETAGE A BESOIN DE SA PROPRE GARDE, QUE §6 NE PEUT PAS PORTER.**
`DistrictMapNavigation.cs:136` **reconstruit `ZoomLevels`** depuis les nouvelles tailles ; `:143`
repose `ZoomIndex = referenceZoomIndex` ; `:148-149` dérive le pan de `initialFocusLocal × CurrentScale`
puis `ClampPan`. ⇒ **les deux grandeurs que je nommais entre parenthèses sont précisément celles qui ne
survivent PAS.**
⇒ Et « converger chiffre pour chiffre avec un montage NATIF » (§6) est **soit vide, soit
auto-contradictoire** : un montage natif **repose toujours le cadrage par défaut**. Si le test ne panne
jamais, la restauration est un **no-op** et §6 est verte que le save/restore soit juste, faux **ou
absent** ; s'il panne, **§6 rougit sur le correctif JUSTE**.
⇒ **DEUX propriétés distinctes, deux assertions séparées** :
   (a) **géométrie** : converge chiffre pour chiffre avec le montage natif ;
   (b) **cadrage** : après un pan/zoom DÉLIBÉRÉ puis redimensionnement, `ZoomIndex` et la cible de pan
       sont ceux d'AVANT — **jamais** ceux d'un montage natif.
⇒ **L'état est lisible sans accesseur neuf** : `ZoomIndex:101`, `PanPosition:103`, et `Configure:124`
prend déjà un focus. ⇒ **Ce n'est donc PAS un différé** : trois lectures le tranchent, et il décide la
forme de la falsifiable.
⚠️ Et la destruction est **différée** ⇒ **double `yield`** obligatoire, et **l'ORDRE est imposé** :
**chrome → panneaux → district** (`AppShell.cs:736-740`), parce que les panneaux et le district lisent
les insets que le chrome publie.

## 4. L'émetteur — sur la taille en PIXELS

⛔ **v1 : `Screen.width`** — que le harnais ne change jamais (`-screen-width` ignoré en batchmode ;
`CapturerA` bascule `cam.targetTexture` + `canvas.worldCamera`, `:300-311`, sans toucher `Screen`).
⛔ **v2 : le rect du canvas** — fonction du seul **ASPECT** : `rect = (1280, 1280·H/W)`, `scaleFactor =
W/1280`, **indépendants**. `1080×1920 → 1440×2560` change le `scaleFactor` de ×1,33 avec un **rect
IDENTIQUE** ⇒ émetteur muet. Or les deux défauts historiques cités (0,9375 du chrome, 0,9000 du
district) sont des **rapports de `scaleFactor`**.
✅ **v3 : `canvas.renderingDisplaySize`** — la taille en pixels de la cible de rendu. Elle change quand
`CapturerA` bascule la RenderTexture **et** quand l'OS redimensionne la fenêtre. C'est la seule des
trois qui voie les deux.
⛔ **M1 — `renderingDisplaySize` SEULE est aveugle à la classe zone-sûre**, qui porte **4 des 9
clusters PERSIST, dont les DEUX trous (P4, P5)**. Une encoche qui change sans que la taille change
laisserait l'émetteur muet.
⇒ **L'émetteur porte sur le COUPLE `(renderingDisplaySize, SafeAreaProvider())`.**
⚠️ **M3 — et les deux termes ne sont pas dans la même unité (forme E)** : `SafeAreaProvider()` est en
**pixels d'ÉCRAN**, `renderingDisplaySize` en **pixels de CIBLE**. Dans le harnais ça donne
`topPx = 1500` sur un écran de 1920 ; en production c'est un no-op (canvas en `ScreenSpaceOverlay`,
`AppShell.cs:845`). **L'écrire**, et convertir explicitement — ne pas laisser deux unités s'additionner.
★ Le repli `(rect, scaleFactor)` est **redondant** : c'est une bijection de `renderingDisplaySize`.

## 5. B1 — rendre P4/P5 falsifiables, ou déclarer qu'ils ne le sont pas

`SafeAreaInsetsLocal` (`AppShell.cs:827,829`) lit **`Screen.width/height`**, que `CapturerA` ne change
jamais. ⇒ Forcer un `SafeAreaProvider` non trivial fait passer les insets de 0 à non-0, **mais le
nombre de valeurs distinctes entre résolutions reste 1** — le dépôt le mesure déjà :
`scratchpad/runA-1820.log` donne `ShellChrome.Bottom = 294,4` **à 640×480 ET en natif 1080×1920**.
★★ **v2 a durci la NULLITÉ là où le défaut vit dans la VARIANCE.** Les deux seuls livrables du lot
seraient partis avec **zéro couverture, sous une garde verte**.

⇒ **DÉCISION : faire lire au calcul d'insets `canvas.renderingDisplaySize` au lieu de `Screen.*`**
(l'API existe, mesurée §1). P4/P5 deviennent alors observables dans le harnais.
⇒ **Sinon** — si la mesure de R1 montre que ça ne suffit pas — **écrire noir sur blanc que P4/P5 ne
sont couverts que par la COUCHE 4** (APK + écran partagé), et ne pas promettre une couverture qu'on
n'a pas. *Une section « non vérifié » honnête vaut mieux qu'une garde qui certifie.*

## 6. La falsifiable

⛔ **DEUX propriétés, DEUX assertions — ne jamais les confondre (B1)** :
- **(a) GÉOMÉTRIE** : converge sur celle d'un montage natif à la taille d'arrivée, **les mêmes rects,
  chiffre pour chiffre** (critère validé le 2026-08-30 : `CapturerA` et natif rendent
  `[0.0,1394.3 .. 1080.0,1776.3]` des deux côtés).
- **(b) CADRAGE** : après un **pan/zoom délibéré** puis redimensionnement, `ZoomIndex` et la cible de
  pan sont **ceux d'AVANT**, jamais ceux d'un montage natif. ⛔ **Le critère (a) est FAUX pour cette
  propriété** — un montage natif repose toujours le cadrage par défaut.
1. ⛔ **DEUX LARGEURS *ET* DEUX ASPECTS**, avec **la raison de chaque variation écrite à côté** — une
   largeur seule laisse passer tout ce qui est cuit depuis `scaleFactor` ; un aspect seul laisse
   passer tout ce qui est cuit depuis le rect.
2. **Zone sûre à valeurs DISTINCTES entre les deux points** (§5), pas seulement non nulle.
3. **ASSERTER**, jamais imprimer : le test de montage natif porte **7 assertions et aucune sur le
   débordement** (recompté, corps `:315-431`). *Monde dégénéré : tous.*
4. **Contrôle positif** : saboter la reconstruction doit rougir **en nommant l'écran** (patron maison
   `221/1 → 218/4`, 3 dépendants rouges ensemble, restauration SHA-256).
5. **Anti-vacuité** : nombre d'écrans éprouvés > 0 et **nommé**.
6. ⛔ **NOMMER LA CATÉGORIE `MafiaCI` — et la classe est BIEN plus large qu'une instance.**
   Mesuré : **30 fichiers sur 68 ne sont joués par aucun juge** (18 hors-catégorie + 12 sans catégorie).
   Le patron cité (`ChromeSafeAreaPlayModeTests.cs:20`) est en **`HUDv31`**, absent de `MafiaCI.cs:34`.
   ⛔⛔ **Et `VuePrincipaleCapturePlayModeTests.cs` est `[Category("Capture")]`** — *le fichier qui porte
   `CapturerA`*, l'instrument même de ce lot, **n'a jamais tourné sous le juge**.
   ⇒ Fermer **une** instance ici serait la faute que ce document dénonce partout ailleurs. **Nommer la
   catégorie de R3, l'ajouter, et publier le compte des fichiers rallumés** — en s'attendant à des
   rouges dormants, qui sont une information et non une régression.

## 7. Les comptes déjà faits — collés, pour qu'ils ne soient pas refaits

```
locataires : 10 · chemins de reconstruction : 1
écritures de géométrie dans les 8 autres : 72 annoncé → **82 recompté** (⚠️ ne se reproduit pas)
   MAIS « 0 non constante » est CONFIRMÉ par sonde indépendante — la conclusion tient, le compte non
compte de démo : 26 annoncé → **16 littéraux / 8 fichiers** (je comptais les COMMENTAIRES)
matchWidthOrHeight : 5 occurrences, TOUTES en commentaire · 0 CanvasScaler sérialisé sur 42 scènes
   ⇒ le déduit n°4 de la v2 est RÉSOLU, favorablement : la largeur logique est bien invariante
⇒ **Tout compte collé sans sa commande est un témoignage** : 2 des 6 de la v3 ne se sont pas reproduits.
```

## 8. DÉDUITS restants — chacun avec son option conservatrice

| # | déduit | option conservatrice |
|---|---|---|
| 1 | `renderingDisplaySize` bouge-t-il sur une bascule de RenderTexture ? | comparer `(rect, scaleFactor)` |
| 2 | ce qu'il faut sauver pour restaurer le cadrage (§3) | le mesurer avant d'écrire |
| 3 | le split-screen réel | **couche 4, non substituable** |
| 4 | les 11 TRANSIENT (ancres non tenues par moi) | R1 les publie et les re-vérifie |

## 9. Hors périmètre — signalé, pas traité

Une autre session monte un **second worktree Unity** (`~/project/mafia-unity-B`, `pilote-B`) et demande
une surcharge par variable d'environnement du compte de démo — **26 occurrences / 10 fichiers**,
mesuré. Deux éditeurs en Play Mode sur `operational_demo` reproduiraient l'incident du 2026-08-21
(59/59 → 0/59, gouverneur « une décision de structure par session »). **C'est mon périmètre mais pas
ce lot, et l'user n'a pas tranché** ⇒ ne rien écrire tant qu'il n'a pas répondu.

## 10. La règle et ses corollaires

> **Le correctif énumère la population de l'INSTRUMENT qu'il vient d'écrire, pas celle de la PROPRIÉTÉ.**

★ Une règle posée dans un document s'applique d'abord à ce document. ★ Corriger une garde fait
descendre le défaut d'une grandeur. ★ Avant d'écrire « non mesuré », grep le fichier de tests de la
classe. ★ Le correctif crée le défaut suivant : demander *quelle propriété je SUPPRIME*.
★ **Un instrument d'analyse faux produit une classification fausse qui a l'air mesurée** — vérifier un
oracle qui étiquette sur un cas CONNU avant de classer.
★★★ **v4, et c'est la 4ᵉ occurrence du même mécanisme** : *un correctif qui ajoute un MÉCANISME ajoute
une propriété à garder — et la falsifiable existante ne la voit pas.* Le sauvetage du cadrage (§3) est
neuf, et §6 tel qu'écrit était **verte qu'il soit juste, faux ou absent**. ⇒ **Après avoir ajouté un
mécanisme, demander : quelle NOUVELLE propriété vient d'apparaître, et quelle assertion la porte ?**
★★★ **v3, payé trois fois de suite** : *nommer le bon monde dégénéré ne suffit pas — il faut que ce
monde soit EXPRIMABLE dans la grandeur qu'on asserte.* `Screen.width`, puis le rect, puis la nullité
de la zone sûre : trois grandeurs justes en apparence, trois fois aveugles au défaut nommé deux lignes
plus haut. ⇒ **Avant d'écrire une garde : simuler le monde dégénéré DANS la grandeur choisie, et
vérifier qu'il la fait bouger.**
