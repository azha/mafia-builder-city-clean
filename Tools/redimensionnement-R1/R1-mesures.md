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

**10 livrés · 4 dus.** ⚠️ **Ils ne sont PAS dus pour la même raison** — c'est la section
« mécanisme » plus bas qui les sépare, et la séparation commande l'ordre du découpage :

> ⛔ **AUCUN ÉDITEUR UNITY NE TOURNE** (mesuré 2026-09-01 20:00, deux oracles concordants). Aucun
> processus d'éditeur, aucun `Temp/UnityLockfile` dans l'un ou l'autre arbre : **le batchmode est
> possible dès maintenant.** Ces quatre livrables ne sont donc retenus ni par une indisponibilité
> ni par une file d'attente — voir la section « mécanisme » : **deux d'entre eux n'ont pas de
> moyen de mesure honnête tant que R4 n'est pas passé.**
> ⚠️ **CET ÉNONCÉ NE SE RECOPIE PAS, IL S'EXÉCUTE** : `Tools/editeur-unity-etat.sh`, commité, le
> re-tranche en une commande. Il porte son contrôle positif (s'il ne voit **aucun** processus Unity,
> pas même le Hub, il sort en erreur au lieu de conclure) et il refuse de trancher quand ses deux
> oracles divergent.
> ★★ **Pourquoi l'oracle existe : j'ai écrit DEUX raisons successives, toutes deux confortables et
> toutes deux fausses.** La première attribuait le blocage à une indisponibilité du serveur — vrai
> de mon point de terminaison, faux de l'éditeur. La seconde attribuait l'éditeur à une autre
> session : j'avais lu un fichier `.pid` **vivant et écoutant**, et il nomme le **pont MCP**, pas un
> éditeur. ⇒ ***Un `.pid` atteste qu'un processus existe, jamais l'identité de ce qu'il sert.***
> La vérification était rigoureuse et portait sur le mauvais objet — et les deux fois, l'erreur
> allait dans le sens qui m'arrangeait, puisqu'un empêchement extérieur dispense d'agir. *(La v1 de ce fichier datait son blocage à une
> heure précise sans dire comment le réfuter — exactement ce que le socle interdit : un tel énoncé
> reste vrai en apparence pour toujours. **Sa formulation n'est pas reproduite ici**, sans quoi le
> retrait serait annulé par la phrase qui l'explique.)*

---

## ⛔ RECTIFICATIF — « le log manquant portait 3 claims » était FAUX, et c'était une soustraction

Le commit `f8cd712` affirme que l'artefact ajouté à la population (`extrait-log-runA-1820.txt`)
portait **3 claims partagées**. **Mesuré ensuite, il en porte ZÉRO** — confronté un par un aux huit
autres artefacts, aucun bloc de 9 mots en commun.

⇒ **D'où venait le « 3 » : de `28 − 25`.** Le total avait bougé entre deux exécutions, et je l'ai
attribué à la seule chose que je venais d'ajouter. Or deux autres variables avaient bougé en même
temps — l'appartenance à la population, et **mes propres éditions du design et du rapport**.
***Deux variables qui bougent ensemble ne départagent rien***, appliqué à mon propre instrument.

⇒ **LA RÈGLE QUI EN SORT, et elle vaut pour tout compteur agrégé** : *un DELTA de total n'est pas
une ATTRIBUTION.* Pour dire « cet artefact apporte N claims », il faut le confronter **seul** au
reste — ce qui coûte une boucle et douze secondes. La soustraction est gratuite, disponible, et
elle désigne toujours le dernier changement qu'on a en tête.
★ **Troisième fois de la session que je publie un nombre DÉDUIT en le croyant compté** : un compte
de fichiers obtenu par soustraction et attribué à un seul répertoire alors qu'il en couvrait treize ;
un « 6 » d'un pair, juste pour un répertoire et faux pour le commit ; et celui-ci. **Les trois fois,
la commande qui tranchait tenait en une ligne.** *Ce qui est compté tient ; ce qui est déduit ment* —
y compris quand le déduit est un sous-produit d'une mesure par ailleurs correcte.

⚠️ **Ce que le rectificatif NE change PAS** : l'artefact manquait bel et bien à la population, la
quatrième forme du défaut d'allowlist est réelle, et la dérivation corrigée reste due. C'est
l'ATTRIBUTION du chiffre qui était fausse, pas le défaut de dénominateur.

## ⚠️ Note d'hygiène — ce que le commit `87ee672` porte en plus de son sujet

Il annonce le design v19 et porte **3 fichiers de ce lot** ; un `git add -A` y a embarqué
**86 fichiers de plus** (85 PNG répartis sur 13 sous-répertoires de `Tools/juge-visuel/`, plus un
script). **Ils sont en LFS** — 85 pointeurs, **0 Mo de blob réel** — **rien ne les référence par
chemin**, et ils appartiennent à des captures de juges déjà suivies dans les deux arbres.
⇒ **Décision : non réécrit.** Le coût d'une réécriture d'historique dans un arbre que plusieurs
sessions partagent dépasse le gain, qui est cosmétique. Cette note existe pour qu'un balayage futur
ne rouvre pas la question.
⛔⛔ **ET LES 86 NE SONT PAS DE MÊME NATURE — 79 AJOUTÉS, 6 ÉCRASÉS.** Le décompte complet :
85 PNG sur 14 répertoires, dont **79 ajoutés** et **6 MODIFIÉS** (`Tools/juge-visuel/v6/m-119` à
`m-124`). Ajouter un fichier que rien ne référence ne coûte rien ; **écraser un artefact de
RÉFÉRENCE en est une autre**, parce que déplacer la référence sous les pieds de celui qui juge
contre elle est le défaut le plus cher de ce programme.
⇒ **Mesuré** : les 6 ont bien changé de contenu (oid ET taille différents des deux côtés), ils
appartiennent au lot des captures de juges livré le 2026-08-29, et **ce sont des régénérations
produites par une AUTRE session, laissées non commitées dans l'arbre** — mon `add -A` les a
commitées sous un message qui parle de bloquants de design.
⇒ **Aucune ratification ne repose dessus** : balayage du dépôt ENTIER (10 105 fichiers texte),
**0 référence** à ces six captures, avec contrôle positif (23 références `juge-visuel/<…>` existent
dans `Tools/*.md`, donc le motif mord). ⇒ **Non réécrit**, mais **consigné ici pour que le
propriétaire de ces captures sache que sa régénération est commitée à `87ee672`** et sous quel
message — sans quoi il chercherait son travail dans un commit qui ne le mentionne pas.
★ **Le piège de comptage, des deux côtés** : j'avais le bon total (86) attaché au mauvais
répertoire ; un pair avait le bon répertoire attaché au mauvais total (6). **Et son 6 coïncidait
exactement avec le nombre de fichiers MODIFIÉS** — deux grandeurs différentes, même nombre, donc
son étiquette fausse avait l'air confirmée. *Le nombre qui tombe juste est le moment de vérifier
l'unité, pas de conclure.*

⛔ **LA CLASSE, ELLE, EST LE GESTE — pas ces fichiers** : `git add -A` ne distingue pas un correctif
d'un état de travail voisin. Depuis, tout `git add` de ce lot **nomme ses chemins**. ★ Et le compte
qui a servi à signaler le problème était lui-même **déduit** (une soustraction `89 − 3`) et attribué
à un seul répertoire ; il en couvrait treize. *Un chiffre qu'on se rapporte à soi-même dans un
signalement de bonne foi reste un chiffre déduit* — la commande qui tranche tenait en une ligne.

## ① — Ancres re-mesurées, **par symbole**, épinglées à un SHA FIXE

Le §2 impose le grain le plus fin possible. Fait : aucun numéro n'est recopié.
**Base : `3a0f04c`** — un SHA fixe, jamais `HEAD` *(⚠️ la v1 déclarait une base MOBILE : le socle
exige un SHA fixe pour épingler un état git, sinon l'énoncé change de sens sans que rien ne bouge
dans le document. Les 10 ancres étaient exactes à la vérification, mais elles l'étaient **par
chance de calendrier**.)*
**Unité : numéro de ligne · portée : le fichier nommé sur chaque ligne, hors commentaires.**
⚠️ **Rectifié le 2026-09-01 (I2 de la r21)** : la ligne des insets locaux publiait **2 des 5 sites
d'appel** sous une forme qui se lisait exhaustive, et **sans déclarer sa portée** — dans le rapport
dont le livrable frère ④ rend cette déclaration obligatoire. Recompté et classé : **1 déclaration,
5 appels, 3 mentions en commentaire**. ★ Et l'avertissement que ce comptage violait est écrit
**quatre lignes plus bas dans cette même section**.

| ce qu'on cherche | fichier | symbole | @HEAD |
|---|---|---|---|
| hook district (P1, P6–P9) | `DistrictInteriorScreenController.cs` | `public void RebatirPourResolutionCourante` | **1807** |
| hook panneaux | `AppShell.cs` | `public void RebatirPanneauxAccueilPourResolutionCourante` | **771** |
| hook chrome | `AppShell.cs` | `public void RebatirChromePourResolutionCourante` | **1323** |
| seam zone sûre (§5) | `AppShell.cs` | `SafeAreaProvider =` | **814** |
| insets locaux, `static` (§5) | `AppShell.cs` | `SafeAreaInsetsLocal()` | **845** (décl.) · appels **287 · 831 · 919 · 1002 · 1342** |
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

⛔⛔ **CE QUE CETTE SORTIE NE PEUT PAS ÊTRE, ET POURQUOI LA PREMIÈRE L'ÉTAIT** : un compte collé ici
est une **mesure DATÉE**, pas une propriété du document. La v1 de cette section publiait un triplet
mesuré sur le design **avant la dernière édition du commit qui le publiait** — les deux moitiés du
commit étaient cohérentes séparément et se contredisaient ensemble, et le triplet n'était
reproductible à **aucun** commit du lot. Un livrable dont l'énoncé est « sortie publiée **et
comparée à la table** » ne peut pas s'appuyer sur une sortie irreproductible.
⇒ **La forme qui tient : la COMMANDE, et le SHA auquel elle a été passée.** Les chiffres ci-dessous
valent pour ce commit et se re-tranchent en une ligne ; s'ils ne se reproduisent pas, c'est le
document qui a bougé, et c'est exactement ce que ㉜ doit détecter.

```
python3 Tools/plancher-derive-du-corps.py Tools/redimensionnement-design.md
```

**Ce que le tri a donné** — 25 candidats à trancher, classés un par un :

| classe | n | ce que c'est |
|---|---|---|
| (c) règle de méthode, pas un livrable | 11 | les corollaires du §10, la règle d'unité du §7, la tenue de l'en-tête |
| (b) reformulation d'un livrable déjà possédé | 8 | la garde de delta et la garde de capacité (⑫), l'ordre de reconstruction (㉓), le compte d'émissions (⑩), le critère d'appartenance (②) |
| (c) prose de décision, hors plancher | 4 | le régime de R4 et les deux sections « hors périmètre » |
| **(a) DÉFAUT RÉEL** | **2** | ci-dessous |

⇒ **DEUX défauts (a), et les deux sont des ÉNONCÉS PÉRIMÉS que le corps portait encore.**
1. Le §8 prescrivait le détecteur de c3 sur une **population figée** que le §11 avait corrigée deux
   versions plus tôt *en écrivant pourquoi*. La correction avait atteint l'énumération et jamais le
   corps.
2. Le §5 concluait en **subordonnant le refactor des insets à une condition que le paragraphe R4,
   quinze lignes plus haut, venait de lever**.

★★ **CE QUE LE SECOND PROUVE, ET C'EST LA RAISON D'ÊTRE DE ㉜** : il a été trouvé **après** une passe
de balayage humaine qui venait d'en corriger trois dans ce même document, et qui l'a manqué. Le
balayage cherchait les occurrences d'un **mot** ; cette phrase exprime la même dépendance **sans
employer ce mot**. ⇒ *Une passe qui vise un MOTIF ne voit pas la phrase qui porte la même propriété
avec d'autres mots* — et c'est précisément le trou qu'un instrument dérivé du corps peut combler,
puisqu'il part des obligations et non du vocabulaire.

⚠️ **ET SA CÉCITÉ EST PUBLIÉE, PAS DÉDUITE** : la sortie porte une table **par section**. Sept
sections rendent **zéro candidat** en portant **11 lignes de plancher** — dont tout le §6, qui en
porte 10. Sur cette part, « aucun orphelin » signifierait « je n'ai pas regardé », et l'instrument
le dit à la place d'un ✅. *(La v1 comptait aussi le §11 parmi ses angles morts — or il est retiré du
corps en tête de script : une cécité tautologique qui sur-déclarait le chiffre et le rendait non
opposable.)*

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

⇒ **R2 ne peut pas s'ouvrir avant ㉕** — la sonde du seam est sa dépendance. Ce que ㉕ tranche a
changé le 2026-09-01 : il ne décide plus de l'EXISTENCE de R4 (elle est acquise), mais de ce que R4
doit couvrir côté zone sûre.

## ⛔⛔ ET LES QUATRE NE TOMBENT PAS ENSEMBLE — mesuré AVANT de demander le créneau

Le créneau éditeur est rationné et partagé. Avant de le demander, j'ai mesuré **par quel mécanisme**
chacun des quatre se rendrait — et deux d'entre eux n'ont pas de mécanisme honnête aujourd'hui.

**Ce que le dépôt possède**, mesuré hors commentaires sur `Assets/` + `Tools/` :

| mécanisme | occurrences | verdict |
|---|---|---|
| `Screen.SetResolution` | **0** | inexistant |
| `GameViewSizes` (API interne) | **0** | **refusé délibérément** — `ChromeMultiResolutionPlayModeTests.cs:16-22` écrit pourquoi : un test qui dépend d'une API interne casse à l'upgrade Unity pour une raison sans rapport avec une régression produit |
| caméra → `RenderTexture` + `ScreenSpaceCamera` | **7 · 6** | **committé et employé** (`AccueilPanneauxGeometriePhotoPlayModeTests.cs:323-326`, `:459-462`) — c'est la seule voie |

⇒ **La seule voie est la RenderTexture.** Et elle a une conséquence que le design n'a jamais écrite :

⛔ **`AppShell.cs:845-854` — `SafeAreaInsetsLocal()` RECALCULE son propre facteur d'échelle depuis
`Screen`** :
```csharp
float screenW = Screen.width, screenH = Screen.height;
float scaleFactor = screenW / ReferenceResolutionWidth;
```
**Il ne lit PAS `ShellCanvas.scaleFactor`.** Sous la voie RenderTexture, le canvas suit la texture
cible pendant que `Screen.width` reste celui du Game View (et vaut **640** en batchmode — le
commentaire du helper de capture le dit, `:43-44`). ⇒ **Le canvas se redimensionne, le chrome NON** :
une capture « à 1920×1080 » montrerait une géométrie **hybride que le joueur n'a jamais**.

| | ce qu'il mesure | la voie RenderTexture le rend-elle honnête ? |
|---|---|---|
| ㉕ | deux valeurs de `SafeAreaProvider` donnent-elles des insets DISTINCTS ? | ✅ **oui** — le facteur est le même des deux côtés, donc la DISTINCTION survit |
| ⑤ | les insets **après** bascule | ⛔ **non** — la valeur absolue dépend du facteur, qui vient de `Screen` |
| ⑮ ㉙ | deux points **rendus** | ⛔ **non** — c'est exactement la géométrie hybride ci-dessus |

★★ **C'est le défaut de la charpente, encore vivant, et il est ANTÉRIEUR à ce lot** : le seul
recalcul d'échelle hors canvas vit dans une méthode que tout le chrome traverse. Il avait été trouvé
une fois (« le juge photographiait une géométrie que le joueur n'a jamais eue ») ; **il n'a pas été
refermé**, et il rend deux livrables de R1 non mesurables par le seul mécanisme disponible.

⇒ **CE QUE ÇA CHANGE, ET C'EST UN ARBITRAGE QUI REMONTE** :
1. **㉕ est faisable dès le créneau** — c'est aussi celui dont R2 dépend. **Il passe en premier.**
2. **⑤ ⑮ ㉙ exigent d'abord que `SafeAreaInsetsLocal` dérive son facteur du CANVAS et non de
   `Screen`.** C'est **une ligne de production**, donc hors de R1 (« aucune ligne de production
   touchée »). ⚠️ **RÉVISÉ le 2026-09-01, et c'est MON raisonnement qui était faux** : j'avais classé
ce correctif comme distinct de R4. Lecture faite du corps de R4, **il en EST la charge utile, mot
pour mot**. Lui ouvrir un chunk aurait donné **deux propriétaires à un seul refactor** — le bloquant
que ce document combat depuis dix-neuf versions. Ce qui devait changer n'était pas le propriétaire :
c'était le **déclencheur** de R4, qui en avait un là où il en fallait deux.
3. ⇒ **Le découpage a besoin d'un maillon qui n'existe pas** : soit R2 le porte, soit un chunk
   R0 le porte avant tout le reste. **Je ne tranche pas seul un ajout au découpage** : c'est la
   question ouverte que ce rapport remonte.
★ **Ce que cette mesure a évité** : demander le créneau, rendre deux captures, les publier comme
« les deux points de S1 », et livrer une comparaison entre deux hybrides. Le run aurait été VERT.
