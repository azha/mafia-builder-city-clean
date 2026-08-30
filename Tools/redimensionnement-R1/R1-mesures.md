# R1 — mesures et publications · **premier chunk du lot redimensionnement**

Chunk **R1** du design v7 (`Tools/redimensionnement-design.md`). Aucune ligne de production
touchée. Chaque compte porte **commande, sortie, unité et portée** — la règle du §7 appliquée
à son premier consommateur.

⚠️ **Ce chunk est PARTIEL et le dit** : ⑤ (imprimer les insets **après** bascule) exige un run
PlayMode, et l'éditeur est verrouillé depuis 20:52. Les six autres livrables sont statiques et
sont ici.

---

## ① — Ancres re-mesurées @HEAD, **par symbole**

Le §2 imposait « par symbole quand c'est possible ». Fait : aucun numéro n'est recopié.

| ce qu'on cherche | fichier | symbole | @HEAD |
|---|---|---|---|
| hook district (P1, P6–P9) | `DistrictInteriorScreenController.cs` | `public void RebatirPourResolutionCourante` | **1807** |
| hook panneaux | `AppShell.cs` | `public void RebatirPanneauxAccueilPourResolutionCourante` | **771** |
| hook chrome | `AppShell.cs` | `public void RebatirChromePourResolutionCourante` | **1323** |
| seam zone sûre (§5) | `AppShell.cs` | `SafeAreaProvider =` | **814** |
| insets locaux, `static` (§5) | `AppShell.cs` | `SafeAreaInsetsLocal()` | 287 · 831 · **845** (décl.) |
| ordre obligatoire (§3) | `AppShell.cs` | `ORDRE D'APPEL, OBLIGATOIRE` | **757** |
| P5 feuille Famille | `LieutenantScreenController.cs` | `BottomInsetPx` | **1030** |
| `ClampAxis` (B3) | `DistrictMapNavigation.cs` | `private static float ClampAxis` | **223** |
| retour anticipé `ZoomTo` (c2) | `DistrictMapNavigation.cs` | `if (newIndex == ZoomIndex) return;` | **181** |
| `BuildZoomLevels` (c1/c3) | `DistrictMapNavigation.cs` | `levels.Sort();` | **95** |

✅ **Les trois ancres de reconstruction du §7 sont CONFIRMÉES** (1807 · 771 · 1323).
★ **Piège rencontré en les mesurant, et il vaut d'être écrit** : un premier balayage par
sous-chaîne rendait `137, 676, 702` pour le hook panneaux — des **sites d'appel et des mentions
en commentaire de doc**. J'ai failli déclarer l'ancre `:771` fausse. *Chercher un symbole par
sous-chaîne ne distingue pas la DÉCLARATION de ses usages* : viser `public void <Nom>`.

## ② — Les 11 TRANSIENT : **NON PUBLIABLES EN L'ÉTAT**, et voici pourquoi

⛔ **Le design n'a jamais défini ce qu'est un « cluster ».** Il en annonce **20 = 9 PERSIST +
11 TRANSIENT** depuis la v1, et aucune version n'écrit la règle qui groupe des sites en cluster.
⇒ **Les trois nombres ne sont donc pas reproductibles**, et R1 ne peut pas « re-vérifier » une
table dont le critère d'appartenance n'existe pas.

**Ce que j'ai pu mesurer, avec son unité** — sites de géométrie dépendant de la résolution, hors
commentaires, portée `Assets/Scripts/{Shell,CityMap,Operational,ShellContracts}` :

```
95 sites   ·   20 « cuits » (affectation de champ/propriété)   ·   75 recalculés (corps de méthode)
   DistrictInteriorScreenController.cs   25 recalculés ·  9 cuits
   TopBarController.cs                   18 recalculés ·  3 cuits
   AppShell.cs                           11 recalculés ·  5 cuits
   LieutenantScreenController.cs          7 recalculés
   CityMapController.cs                   3 · DistrictBackgroundAnchorDto.cs 3+1
   DistrictMapNavigation.cs 1 · BuildingCard 1 · ExceptionDetail 1 · ExceptionQueue 1
```

⚠️⚠️ **PIÈGE ÉVITÉ, et il aurait été convaincant** : mes « 20 cuits » **coïncident** avec les
20 clusters du design. **Ce n'est pas la même grandeur** — un cluster groupe plusieurs sites, un
site est un site. Conclure « les 20 se retrouvent » aurait été une **forme E** : deux quantités
comparées sans être mesurées dans la même unité, rendues crédibles par une coïncidence numérique.
*Le nombre qui tombe juste est le moment de vérifier l'unité, pas de conclure.*

⇒ **Ce qui est dû avant que ② soit livrable** : écrire la **règle de groupement** (qu'est-ce qui
fait qu'un cluster est un cluster ?), puis recompter. Tant qu'elle manque, « 20 = 9 + 11 » est un
compte hérité, jamais vérifié dans le corps — c'est-à-dire exactement ce que le §2 dit qu'il ne
faut pas propager.

## ㉔ — Le log de la décision du §5, commité

`Tools/redimensionnement-R1/extrait-log-runA-1820.txt` — extrait **réduit** (2 lignes décisives
sur 19 667, source 2,8 Mo hors dépôt), copié verbatim, avec sa provenance et sa lecture.
La décision du §5 repose dessus et **aucun lecteur futur ne pouvait la re-dériver**.

## ④ — Unité et portée des comptes du §7

Livré dans la v7 du design (chaque ligne du tableau porte désormais sa colonne unité · portée).

## ⑥ / ⑱ — Le contrôle du §0 : **prédicat écrit, non exécuté**

Le prédicat, la portée et la règle de contrôle positif sont écrits au §0 de la v7. **Non exécuté
ici** : il porte sur le retrait de deux énoncés (⑨, chunk R2), et le socle exige que le contrôle
vive **dans le même commit que la réécriture** — l'exécuter maintenant produirait des valeurs
« AVANT » sans « APRÈS », c'est-à-dire une moitié de preuve qui a l'air d'une preuve.

---

## Ce que R1 ne peut pas livrer, et pourquoi

| | livrable | obstacle |
|---|---|---|
| ⑤ | insets **après** bascule | exige un run PlayMode — éditeur verrouillé depuis 20:52 |
| ② | les 11 TRANSIENT | la règle de groupement n'existe pas (ci-dessus) |
| — | le **couple de résolutions** de S1/S2 | les valeurs sont dans un `[TestCase]` commité (1280×720 · 1080×1920 · 1080×2400 · 1440×3200) mais leur EFFET sur `ZoomLevels.Length` n'est pas observable sans run |

---

# ② — LIVRÉ, après que la v8 a écrit la règle d'appartenance

## Les 9 PERSIST : vérifiées **dans le corps**, une par une

Chacune exige deux preuves — (i) une grandeur liée à la résolution, (ii) une lecture après la
frame qui l'écrit. Les deux symboles sont cherchés séparément, hors commentaires, @HEAD.

| | fichier | symbole | sites |
|---|---|---|---|
| **P1** `ZoomLevels` | `DistrictMapNavigation.cs` | `ZoomLevels` + `levels.Sort()` | 62, 63, 87 |
| **P2** bande Accueil | `AppShell.cs` | `PoserBandeAccueil` | 674, 707, 778 |
| **P3** insets du chrome | `AppShell.cs` | `PublierInsetsDuChrome` | 552, 827, 1373 |
| **P4** insets district | `DistrictInteriorScreenController.cs` | `SetSafeInsets` | 125 |
| **P5** feuille Famille | `LieutenantScreenController.cs` | `BottomInsetPx` + `offsetMin` | 1030 |
| **P6** `fondRt.sizeDelta` | `DistrictInteriorScreenController.cs` | `sizeDelta` + `scaleFactor` | 382, 458, 473 |
| **P7** letterbox du titre | `DistrictInteriorScreenController.cs` | `root.rect.width` | 473, 646 |
| **P8** cellules | `DistrictInteriorScreenController.cs` | `scaleFactor` + `Cell` | 393, 458, 563 |
| **P9** `ficheRoot.offsetMin` | `DistrictInteriorScreenController.cs` | `ficheRoot` + `offsetMin` | 259, 1431, 1478 |

✅ **9 sur 9 confirmées dans le corps.** Ce n'est plus un compte hérité.

## Les TRANSIENT : énumérées par la règle — et le compte **ne tombe pas sur 11**

Application **mécanique** des clauses (i)+(ii) — méthode nommée lisant une grandeur de
résolution, hors les hooks de reconstruction : **23 candidates**.

Application de la clause **(iii)** — *« porte un nom que le joueur ou la maquette reconnaît comme
UNE chose »* — faite **en lisant**, verdict par verdict :

| candidate | verdict |
|---|---|
| `BuildTabBar` · `BuildLayout` (TopBar) · `PxTrait` | ✅ TRANSIENT — la barre d'onglets, la barre du haut, l'épaisseur de trait |
| `ClampPan` · `EffectiveScaleFactor` | ✅ TRANSIENT — le cadrage de la carte |
| `PivotLocalForBlock` · `PixelToFondLocal` · `FindParcel` | ✅ TRANSIENT — l'ancrage du fond de district |
| `MajEchelleFamille` | ✅ TRANSIENT, **mais innocentée par l'invariance de la largeur logique**, pas par le recalcul |
| `PoserBandeAccueil` · `PublierInsetsDuChrome` · `PublierInsets` · `BuildBuildingCell` · `BuildFiche` | ⛔ **déjà comptées en PERSIST** (P2, P3, P8, P9) — ce sont leurs ÉCRIVAINS, pas des clusters distincts |
| `FD` · `FDi` · `FXf` · `FXSerif` · `SnapToScreenPixel` · `Stretch` · `ClampAxis` · `SafeAreaInsetsLocal` · `FacteurEchelle` | ⛔ **helpers** — aucun nom que le joueur reconnaît ; échouent la clause (iii) |

⇒ **9 TRANSIENT retenues, pas 11.** Et **je ne comble pas l'écart** : les deux manquantes sont
soit dans un fichier hors de ma portée de balayage, soit un découpage que l'auteur d'origine
faisait plus finement (p. ex. compter séparément les trois méthodes d'ancrage du fond).

★★ **CE QUE CET ÉCART PROUVE, ET C'EST LE POINT** : la règle du §2 fonctionne — elle produit une
énumération **nommée et vérifiable** — et elle **ne reproduit pas** le compte hérité. C'est
exactement ce que la v8 annonçait : *le compte tombe à la fin, il n'est pas la preuve.* Un écart
de 2 sur une énumération publiée est **opposable et discutable** ; un « 11 » sans liste ne l'était
pas. ⇒ **Ce qui remplace « 11 » n'est pas « 9 » : c'est la LISTE.**

⚠️ **Et je n'ai pas cédé au piège symétrique** : le filtrage sémantique donne d'abord une fourchette
de 11 à 14 selon qu'on compte les trois méthodes d'ancrage comme une chose ou trois. **11 est dans
la fourchette.** M'y arrêter parce que le nombre attendu s'y trouve aurait été le même geste que
« 20 sites cuits = 20 clusters » — *choisir le grain qui fait tomber le compte juste*. Le grain est
donc déclaré d'abord (une chose perçue = un cluster ⇒ l'ancrage du fond compte pour **1**), et le
compte suit.
