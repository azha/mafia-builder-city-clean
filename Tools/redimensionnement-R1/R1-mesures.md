# R1 — mesures et publications · **premier chunk du lot redimensionnement**

Chunk **R1** du design **v19** (`Tools/redimensionnement-design.md`). Aucune ligne de production
touchée. Chaque compte porte **commande, sortie, unité et portée** — la règle du §7 appliquée à son
premier consommateur.

⚠️ **CE RAPPORT SE DATE PAR LE DÉCOUPAGE, PAS PAR UNE VERSION RECOPIÉE.** La v1 de ce fichier épinglait
une version de design ANCIENNE dans son en-tête et n'a jamais bougé pendant que le découpage passait
à 14 livrables : elle en couvrait 7 et **rien ne le disait**. *(Le numéro fautif n'est pas reproduit
ici : le citer pour expliquer qu'on le retire le remet dans le fichier — et un contrôle qui cherche
« la vieille version est-elle encore mentionnée ? » resterait rouge pour toujours.)* ⇒ Le tableau d'état ci-dessous est produit par
`Tools/plancher-decoupage.py` (propriétaires) et re-vérifiable ; il ne se recopie pas.

## État des 14 livrables de R1

| | livrable | état |
|---|---|---|
| ① | ancres re-mesurées @HEAD, au grain du §2 | ✅ livré |
| ② | les TRANSIENT par la règle d'appartenance | ✅ livré |
| ④ | unité et portée de chaque compte du §7 | ✅ livré |
| ⑤ | insets **après** bascule | ⛔ exige l'éditeur |
| ⑥ | prédicat + commande + portée + contrôle positif du §0 | ✅ écrit, **non exécuté** (voir plus bas) |
| ⑮ | seconde largeur de capture | ⛔ exige l'éditeur |
| ⑱ | règle de clôture de l'ensemble de fichiers du §0 | ✅ livré |
| ㉔ | le log de la mesure du §5, commité | ✅ livré |
| ㉕ | sonde réduite du seam | ⛔ exige l'éditeur |
| ㉖ | détecteur de c3 | ✅ **livré ici** |
| ㉘ | la borne d'atteignabilité, par axe | ✅ **livré ici** |
| ㉙ | les DEUX points de S1, **rendus** | ⛔ exige l'éditeur |
| ㉚ | la conversion d'unités du cadrage | ✅ **livré ici** |
| ㉜ | le balayage exécutable dérivant le plancher du CORPS | ✅ **livré ici** |

**10 livrés · 4 bloqués.** Les quatre bloqués le sont par la MÊME cause, et elle est vérifiable :

> ⛔ **`UnityMCP` refuse la connexion** (`ConnectionRefused`) au 2026-08-31. Les quatre livrables
> restants exigent un rendu réel, pas un calcul.
> ⚠️ **MODE D'EMPLOI DE PÉREMPTION DE CET ÉNONCÉ** — il est daté, donc il porte comment le tuer :
> il cesse d'être vrai dès que `ListAgents`/le serveur MCP répond, ou qu'un run PlayMode aboutit.
> **Le vérifier, jamais le recopier.** *(La v1 de ce fichier écrivait « l'éditeur est verrouillé
> depuis 20:52 » — un énoncé daté sans mode d'emploi, exactement ce que le socle interdit : il
> serait resté vrai en apparence pour toujours.)*

---

## ① — Ancres re-mesurées @HEAD, **par symbole**

Le §2 impose le grain le plus fin possible. Fait : aucun numéro n'est recopié.

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
★ **Piège rencontré en les mesurant** : un premier balayage par sous-chaîne rendait `137, 676, 702`
pour le hook panneaux — des **sites d'appel et des mentions en commentaire**. J'ai failli déclarer
l'ancre `:771` fausse. *Chercher un symbole par sous-chaîne ne distingue pas la DÉCLARATION de ses
usages* : viser `public void <Nom>`.

## ② — Les clusters, énumérés par la règle du §2

### Les 9 PERSIST : vérifiées **dans le corps**, une par une

Chacune exige deux preuves — (i) une grandeur liée à la résolution, (ii) une lecture après la frame
qui l'écrit. Les deux symboles sont cherchés séparément, hors commentaires, @HEAD.

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

### Les TRANSIENT : énumérées par la règle — et le compte **ne tombe pas** sur celui qui était annoncé

Application **mécanique** des clauses (i)+(ii) du §2 — méthode nommée lisant une grandeur de
résolution, hors les hooks de reconstruction : **23 candidates**. Puis la clause **(iii)** du §2
*(citation — la règle est produite par le §2, ce rapport ne la redit pas)*, appliquée en lisant :

| candidate | verdict |
|---|---|
| `BuildTabBar` · `BuildLayout` (TopBar) · `PxTrait` | ✅ TRANSIENT — la barre d'onglets, la barre du haut, l'épaisseur de trait |
| `ClampPan` · `EffectiveScaleFactor` | ✅ TRANSIENT — le cadrage de la carte |
| `PivotLocalForBlock` · `PixelToFondLocal` · `FindParcel` | ✅ TRANSIENT — l'ancrage du fond de district |
| `MajEchelleFamille` | ✅ TRANSIENT, **mais innocentée par l'invariance de la largeur logique**, pas par le recalcul |
| `PoserBandeAccueil` · `PublierInsetsDuChrome` · `PublierInsets` · `BuildBuildingCell` · `BuildFiche` | ⛔ **déjà comptées en PERSIST** (P2, P3, P8, P9) — ce sont leurs ÉCRIVAINS, pas des clusters distincts |
| `FD` · `FDi` · `FXf` · `FXSerif` · `SnapToScreenPixel` · `Stretch` · `ClampAxis` · `SafeAreaInsetsLocal` · `FacteurEchelle` | ⛔ **helpers** — aucun nom que le joueur reconnaît ; échouent la clause (iii) |

⇒ **9 TRANSIENT retenues.** Et **je ne comble pas l'écart** avec le compte hérité : les manquantes
sont soit hors de ma portée de balayage, soit un découpage plus fin de l'auteur d'origine (p. ex.
compter séparément les trois méthodes d'ancrage du fond).

★★ **CE QUE CET ÉCART PROUVE** : la règle du §2 fonctionne — elle produit une énumération **nommée
et vérifiable** — et elle **ne reproduit pas** le compte hérité. Un écart sur une énumération publiée
est **opposable et discutable** ; un nombre sans liste ne l'était pas. ⇒ **Ce qui remplace le compte
hérité n'est pas un autre compte : c'est la LISTE.**

⚠️ **Piège symétrique, non cédé** : le filtrage sémantique donne d'abord une fourchette selon qu'on
compte les trois méthodes d'ancrage comme une chose ou trois — **et le compte hérité est DANS la
fourchette**. M'y arrêter parce que le nombre attendu s'y trouve aurait été *choisir le grain qui
fait tomber le compte juste*. Le grain est donc déclaré d'abord (une chose perçue = un cluster ⇒
l'ancrage du fond compte pour **1**), et le compte suit.

⚠️⚠️ **PIÈGE ÉVITÉ, unité et portée déclarées** — sites de géométrie dépendant de la résolution,
hors commentaires, portée `Assets/Scripts/{Shell,CityMap,Operational,ShellContracts}` :

```
95 sites   ·   20 « cuits » (affectation de champ/propriété)   ·   75 recalculés (corps de méthode)
   DistrictInteriorScreenController.cs   25 recalculés ·  9 cuits
   TopBarController.cs                   18 recalculés ·  3 cuits
   AppShell.cs                           11 recalculés ·  5 cuits
   LieutenantScreenController.cs          7 recalculés
   CityMapController.cs                   3 · DistrictBackgroundAnchorDto.cs 3+1
   DistrictMapNavigation.cs 1 · BuildingCard 1 · ExceptionDetail 1 · ExceptionQueue 1
```

Le nombre de sites « cuits » **coïncide** avec le nombre de clusters du design. **Ce n'est pas la
même grandeur** — un cluster groupe plusieurs sites, un site est un site. Conclure que les deux se
correspondent aurait été une **forme E** : deux quantités comparées sans être mesurées dans la même
unité, rendues crédibles par une coïncidence numérique. *Le nombre qui tombe juste est le moment de
vérifier l'unité, pas de conclure.* **Ce rapport est le producteur unique de cette mesure** — le
design la cite et n'en recopie pas les valeurs (balayage : `Tools/claims-partagees.py`).

## ㉘ · ㉖ · ㉚ — les trois livrables ARITHMÉTIQUES

Instrument commité : `Tools/redimensionnement-R1/mesures-statiques.py`. Ses constantes sont
**mesurées sur les assets**, jamais écrites de mémoire — le fond n'est pas une constante du code
(`fondRt.sizeDelta = new Vector2(tex.width, tex.height) / scaleFactor` : la grandeur vit dans la
TEXTURE). Quatre gardes d'ancrage, **toutes prouvées capables de rougir** : aucun fond → sortie 2 ·
fonds de tailles différentes → sortie 2 · `referenceResolution` introuvable → sortie 2.

```
    ANCRES  fond 2 fichier(s) @Assets/Art/District/Backgrounds → 1080×1920 · referenceResolution @DistrictInteriorScreenController.cs → 1280
    CONSTANTES  fond 1080×1920 px · largeur de référence 1280
    
    ㉘ — BORNE D ATTEIGNABILITÉ, PAR AXE, AUX DEUX PALIERS
       unité : fraction de la dimension de contenu à l échelle du palier · portée : les 5 résolutions rendues
       viewport       contain     X ×1     Y ×1     X ×2     Y ×2   rôle
       1920×1080       0.5625   0.0000   0.2188   0.0556   0.3594   S1 départ · paysage large
       1280×720        0.3750   0.0000   0.3125   0.2037   0.4062   S1 arrivée · paysage étroit
       1080×1920       1.0000   0.0000   0.0000   0.2500   0.2500   portrait de référence
       1080×2400       1.0000   0.0000   0.0000   0.2500   0.1875   portrait long
       1440×3200       1.3333   0.0000   0.0000   0.1667   0.0833   S2 départ · portrait dense
    
    ㉖ — DÉTECTEUR DE c3 : le dernier palier vaut-il 3 ?
       L épingle porte sur une VALEUR PRÉSENTE, jamais sur une absence : elle est VERTE aujourd hui
       et ROUGIT le jour où une résolution rend contain ≥ 3.
       1920×1080     paliers=[0.5625, 1.0, 2.0, 3.0]  dernier=3.0000  ✅
       1280×720      paliers=[0.375, 1.0, 2.0, 3.0]  dernier=3.0000  ✅
       1080×1920     paliers=[1.0, 2.0, 3.0]  dernier=3.0000  ✅
       1080×2400     paliers=[1.0, 2.0, 3.0]  dernier=3.0000  ✅
       1440×3200     paliers=[1.0, 1.3333, 2.0, 3.0]  dernier=3.0000  ✅
       ⇒ toutes vertes · c3 exigerait W ≥ 3240 ET H ≥ 5760
    
    ㉚ — CONVERSION D UNITÉS DU CADRAGE : chaque membre / (son PROPRE fond local × palier)
       Le diviseur change AUX DEUX BOUTS d un même scénario — c est ce qui rend la comparaison licite.
       S1 départ   facteur=1.50000  fond local=(   720.0,  1280.0)  diviseur ×1=(   720.0,  1280.0)
       S1 arrivée  facteur=1.00000  fond local=(  1080.0,  1920.0)  diviseur ×1=(  1080.0,  1920.0)
       S2 départ   facteur=1.12500  fond local=(   960.0,  1706.7)  diviseur ×2=(  1920.0,  3413.3)
       S2 arrivée  facteur=0.84375  fond local=(  1280.0,  2275.6)  diviseur ×2=(  2560.0,  4551.1)
    
    ⚠️ NON PROUVÉ ICI : le comportement réel du client. Ces tables sont ce que les formules
       IMPLIQUENT — ⑮ et ㉙ (deux points RENDUS) exigent l éditeur et restent dus.
```

⚠️ **Ce que ces tables NE prouvent PAS** : que le client se comporte ainsi. Elles disent ce que les
formules **impliquent**. La confrontation au comportement réel est ⑮/㉙, qui exigent l'éditeur.

★ **Un fait neuf que le design n'avait pas** : à `1080×2400`, l'atteignable en Y au palier ×2 vaut
**0,1875**, soit MOINS qu'à `1080×1920` (0,2500). Un scénario qui partirait de `1080×1920` pour
arriver en `1080×2400` **violerait donc l'inclusion des boîtes sur Y**, alors que les deux formats
sont « portrait » et que l'intuition dit l'inverse. ⇒ **S2 doit nommer ses deux bouts, jamais dire
« portrait vers portrait ».**

## ㉜ — Le plancher, dérivé du CORPS

Instrument commité : `Tools/plancher-derive-du-corps.py`. Il lit **§0–§8 seulement** et **jamais le
§11** — c'est ce qui en fait une source indépendante, ce qui manquait au contrôle de bijection
depuis la v8. Sa couverture est **partielle et déclarée** (prescriptions en gras sous un marqueur
d'obligation ; une obligation en prose nue lui échappe), et sa sortie est une **liste de revue**,
pas un verdict.

**Premier passage** : 30 candidats du corps, 10 déjà couverts, **20 à trancher**. Triés à la main :

| classe | nombre | exemples |
|---|---|---|
| (c) règle de méthode, pas un livrable | 12 | les corollaires du §10, la règle d'unité du §7 |
| (b) reformulation d'un livrable existant | 5 | la garde de delta (déjà dans ⑫), l'ordre de reconstruction (déjà ㉓) |
| (c) livrable d'un chunk **conditionnel** hors plancher | 2 | les deux livrables de R4, explicitement hors plancher |
| **(a) DÉFAUT RÉEL** | **1** | ci-dessous |

⛔ **LE DÉFAUT (a), ET C'EST LE PREMIER DE SA CLASSE TROUVÉ PAR UN INSTRUMENT** : le §8 prescrivait
le détecteur de c3 sur une **population figée**, alors que le §11 avait corrigé exactement ce point
deux versions plus tôt et écrit pourquoi. **La correction avait atteint l'énumération et jamais le
corps** — la jointure du socle dans sa forme pure. Neuf revues ⊥ d'affilée avaient trouvé un défaut
de cette famille ; c'est la première fois qu'un balayage le sort tout seul.
★ **Et il était doublé d'un piège de citation** : la parenthèse du §11 qui explique la correction
**reproduisait le littéral fautif**, donc le document le portait deux fois. Corrigé dans le même
commit, contrôle collé : motif fautif **2 → 0**, valeur attendue écrite avant l'édition.

## ㉔ — Le log de la décision du §5, commité

`Tools/redimensionnement-R1/extrait-log-runA-1820.txt` — extrait **réduit** (2 lignes décisives sur
19 667, source 2,8 Mo hors dépôt), copié verbatim, avec sa provenance et sa lecture. La décision du
§5 repose dessus et **aucun lecteur futur ne pouvait la re-dériver**.

## ④ — Unité et portée des comptes du §7

Livré : chaque ligne du tableau du §7 porte sa colonne unité · portée.

## ⑥ / ⑱ — Le contrôle du §0 : **prédicat écrit, non exécuté**

Le prédicat, la portée et la règle de contrôle positif sont écrits au §0. **Non exécuté ici** : il
porte sur le retrait des deux énoncés datés, qui est un livrable du chunk **R2** — et le socle exige
que le contrôle vive **dans le même commit que la réécriture**. L'exécuter maintenant produirait des
valeurs « AVANT » sans « APRÈS », c'est-à-dire une moitié de preuve qui a l'air d'une preuve.

---

## Ce que R1 ne peut pas livrer, et pourquoi

| | livrable | obstacle | comment il tombe |
|---|---|---|---|
| ⑤ | insets **après** bascule | exige un rendu réel | l'éditeur répond |
| ⑮ | seconde largeur de capture | exige un rendu réel | l'éditeur répond |
| ㉙ | les DEUX points de S1, rendus | exige un rendu réel | l'éditeur répond |
| ㉕ | sonde réduite du seam | exige un rendu réel | l'éditeur répond |

⇒ **Les quatre tombent ensemble**, à la même condition, et R2 ne peut pas s'ouvrir avant ㉕ : c'est
la sonde qui décide si le refactor conditionnel R4 doit exister.
