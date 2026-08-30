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
