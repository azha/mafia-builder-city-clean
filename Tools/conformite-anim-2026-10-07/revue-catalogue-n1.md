# Revue ⊥ n°1 — `Tools/conformite-anim-2026-10-07/catalogue-mouvements.md` (1106 l., 42 entrées)

Relecteur indépendant (⊥). Je n'ai pas écrit ce fichier. Dépôt : `/home/erutheone/project/mafia-unity-anim`,
branche `design/conformite-anim-2026-10-07`, HEAD `900a5468`. Lecture seule : aucun fichier du dépôt modifié,
aucun commit, aucun stash, Unity non ouvert. Référentiel opposé au catalogue :
`design-couche-mouvement.md` **v4.1 APPROUVÉ** (jamais rejugé ici), `inventaire-animations.md` (85 lignes),
les JSON de mesure/oracle, `Assets/Scripts/`, le canon `~/project/mafia-lot-i18n/docs/tech/08_ui_screens/`.

---

## 1. Verdict

# NON APPROUVÉ

**7 BLOCKING · 17 MAJOR · 12 mineurs.**

Le squelette tient : les 42 entrées existent, les 46 attachements et les 68/63 pistes de §V sont **justes
au compte** (recomptés ligne à ligne, tableau au §4), les ancres de code sont d'une exactitude remarquable
(≈ 95 % au numéro de ligne exact, dont les 9 « porteuses » et les 5 lignes de `screen_14`), et les refus
argumentés (㉒, ㉛, ㉚, ⑰) sont vérifiés vrais dans le code. Ce qui bloque n'est pas la thèse, c'est la
**projection sur le modèle v4.1** : un canal `Teinte` qui n'existe pas (12 entrées), trois translations
posées sur des cibles pilotées par un `LayoutGroup` (G11), un signe de rotation lu dans le paramètre CSS
au lieu de la ligne qui le nie, une forme d'oracle inversée, et six `PoseDeReposS` qui tombent sur la valeur
d'identité (G3). Aucun de ces sept n'est une opinion : chacun est une mesure.

---

## 2. Findings

### 2.1 BLOCKING — « le code écrit d'après ce catalogue serait faux »

| id | où | constat (cité) | preuve | pourquoi BLOCKING | correction proposée |
|---|---|---|---|---|---|
| **BL-1** | `catalogue-mouvements.md:104`, `:268`, `:305`, `:321`, `:340`, `:341`, `:459`, `:479`, `:498`, `:725`, `:726`, `:753`, `:806` | 12 entrées animent un canal nommé **`Teinte`** : « `Teinte` 1,00 → 0,85 » (`:268`), « `Teinte` de l'`Image` de fond de `Row_descente` … **1,22 → 1,00 → 1,22** » (`:321`), « `Teinte` **1,28 → 1,00 → 1,28** » (`:479`), « `Teinte` **1,45 → 1,00** » (`:498`), « `Teinte` 1,00 → 1,55 → 1,00 » (`:806`), « `Teinte` 1,00 → 0,42 » (`:459`), « `Teinte` 1,00 → 0,70 » (`:753`) | `design-couche-mouvement.md:36` énumère **12** `Propriete` et aucune ne s'appelle `Teinte` : `Alpha · Melange · Hue · Eclat · TranslationX · TranslationY · Rotation · Echelle · EchelleX · EchelleY · Remplissage · Parametre`. (`TeinteA` à `:25`/`:120` est une **méthode** de `Gyrophare`, pas une propriété.) `Melange` = « 0..1 entre `CouleurA` et `CouleurB` » ; `Eclat` = alpha 0..1 d'un calque `Eclat` ; aucun ne porte un facteur **> 1** (1,22 / 1,28 / 1,45 / 1,55) | Une propriété qui n'existe pas dans l'enum : `Regie.Attacher` ne peut pas la router, et les valeurs > 1 ne sont portables ni par `Melange` (borné 0..1) ni par `Eclat` (alpha). 12 des 42 entrées sont inimplémentables telles qu'écrites | Réécrire chaque canal en `Melange` (assombrissement/virage : `retour.appui`, `bascule.course`, `service.cartel`, `demolition.offre-fermee`, `semaine.jeton-depense`) **avec `CouleurA`/`CouleurB` déclarés**, et en `Eclat` 0→x pour les sur-brillances (`accueil.descente`, `decision.jeton`, `police.dispatch`, `commissariat.crans`, `service.jeton`, `conflit.envoi`, `decision.cachet`) |
| **BL-2** | `catalogue-mouvements.md:417` (`file.part`) | « `CanvasGroup` de l'attendant : `Alpha` 1,00 → 0,28 et **`TranslationY` 0 → −9 u** » | La cible est l'attendant `a` : créé enfant de `fileRoot` (`ExceptionQueueController.cs:598` `GameObject a = NewUI(nomGo, fileRoot);`), `fileRoot` porte un **`HorizontalLayoutGroup`** (`:1149`), et `a` reçoit un `LayoutElement` via `AddLayoutElement` (`:618`) dont le corps (`:1420-1430`) **n'écrit jamais `ignoreLayout`**. Le `CanvasGroup` visé est bien sur `a` (`:610` `if (parti) a.AddComponent<CanvasGroup>().alpha = 0.28f;`) | G11 (`design:138`) : « pas de canal **`TranslationX/Y`** sous un `LayoutGroup` … sauf `LayoutElement.ignoreLayout` ». La garde refuse l'entrée, et à l'exécution la passe de layout écraserait le delta | Soit `Alpha` seul (le canon `screen_5:340` ne demande qu'un fade), soit poser le `TranslationY` sur un enfant stretché de `a` (le patron de ⑩ : la `Face`) |
| **BL-3** | `catalogue-mouvements.md:339` (`decision.distribuee`) | « `carteRoot` (`:302-328`) : **`TranslationX` −34 u → 0** … `Rotation` +7,0° → +2,0° » | `carteRoot` = le `Bloc("CarteDuJour", table.transform, …)` (`DecisionDetailScreenController.cs:302-303`), enfant **direct** de `table` = `Bloc("TableDeJeu", …, horizontal: true)` qui porte un `HorizontalLayoutGroup` (`:300`) ; `carte.AddComponent<LayoutElement>().flexibleWidth = 1f` (`:328`), `ignoreLayout` jamais posé (grep `ignoreLayout` dans ce fichier : 0) | Même garde G11, même écrasement : la carte « distribuée » resterait collée | Translater un enfant stretché de `CarteDuJour` (ou poser `ignoreLayout` sur la carte, ce qui casse le `flexibleWidth`) ; la `Rotation` et l'`Alpha`, eux, passent |
| **BL-4** | `catalogue-mouvements.md:752` (`demolition.fiche-sortie`) | « la `Fiche` : **`TranslationX` −51 u → 0** … ⚠️ Canal de transformation sous un `RectMask2D` (`:1185`) : c'est **le cas qui décide E0** » | La `Fiche` est créée enfant de `zoneCentrale` (`DemolitionScreenController.cs:629` → `:673`), et `zoneCentrale` = le « Contenu » du défilement qui porte **`VerticalLayoutGroup`** (`:1202`) **et `ContentSizeFitter`** (`:1210`). Seul son enfant `Dos` a `ignoreLayout` (`:682`), pas la `Fiche` | G11 refuse `TranslationX/Y` sous `LayoutGroup` **et** sous `ContentSizeFitter`. Le catalogue ne nomme que le masque (E0) et manque la garde qui tue l'entrée | Nommer G11, et retomber sur `Alpha` seul (l'entrée le prévoit déjà en cas de refus E0) ou translater un enfant stretché |
| **BL-5** | `catalogue-mouvements.md:431-433` et `:441` (`main.distribuee`, `main.levee`) | « chacune à son angle **statique** (**−5° risquée ♠ · 0° suggérée ♦ · +5° apprendre ♣**) … `ExceptionDetailController.cs:380-385`, `:531-532` » et « `Rotation` **−14,0° → repos** (−5° / 0° / +5°) … les 3 angles … sont **lus dans le code** (`:380-385`) » | `:381/:383/:385` passent `rotationCss: -5f / 0f / +5f` — ce sont les valeurs **CSS**. `:532` les **nie** : `frt.localRotation = Quaternion.Euler(0f, 0f, -rotationCss);`. Les angles de repos **Unity** sont donc **+5° / 0° / −5°**. Conforme à `design:33` (« `Rotation` Unity = − rotation CSS ») et au précédent inscrit dans le code voisin (`DecisionDetailScreenController.cs:305-310` : « ce dépôt a déjà payé un signe déduit d'une magnitude — l'aiguille du manomètre inversée ») | Signe contraire à la convention de repère §2 sur une entrée dont la valeur d'arrivée est présentée comme « lue dans le code » : les trois cartes arriveraient en éventail **inversé** | Écrire les repos en repère Unity : **+5° / 0° / −5°**, et citer `:532` (la ligne qui applique) plutôt que `:381-385` (les paramètres CSS) |
| **BL-6** | `catalogue-mouvements.md:479` (`police.dispatch`) | « `Teinte` **1,28 → 1,00 → 1,28**, **période 1,600 s** … `PoseDeReposS = 0,800 s` … forme **REUSE** `ecrans-brennar-6: mk-veille` (… `filter:brightness(1 → 1.35)`) » | `oracle-css-ecrans-brennar-6.json`, clé `mk-veille` (mesurée, `durS` 3.2) : `brightness` **1,0 à p=0 → 1,35 à p=0,5 → 1,0 à p=1** (opacité constante 0,54). La forme du catalogue est l'**ordre des extrema inversé** : extremum à t0, valeur neutre au milieu | X7 (`design:107`) exige « **signe de la dérivée à chaque extremum et ordre des extrema identiques** » pour une forme reprise d'une paire d'inventaire. Et l'inversion propage l'erreur : `PoseDeReposS = 0,800 s` (mi-période) tombe sur **1,00**, la valeur d'identité, au lieu du pic | `Eclat` **0 → 1 → 0** (pic à mi-période), `PoseDeReposS = 0,800 s` ⇒ pic ; garder l'écart de période (1,6 s vs 3,2 s) tel qu'il est déjà déclaré |
| **BL-7** | `catalogue-mouvements.md:294` (`comptoir.lampe`), `:321` (`accueil.descente`), `:341` (`decision.jeton`), `:360` (`famille.lampe-du-don`), `:479` (`police.dispatch`), `:725` (`service.jeton`) | Six entrées en régime posent `PoseDeReposS` = **exactement la mi-période** d'une forme symétrique à deux extrema, donc sur l'image clé 50 % : « figé à `PoseDeReposS` = l'image riche (**α 1,00**), pas la 0 % » (`:294`), « figé à `PoseDeReposS` (α 1,00) » (`:360`), facteur **1,00** pour les quatre `Teinte` | G3 (`design:130`) : « `PoseDeReposS` donne une valeur **≠ repos** (frame riche) ». Le repos est défini par `design:67` (**Fin de piste**) : « `CanvasGroup` posé par la régie **→ 1** … `Eclat` **→ 0** » — α 1,00 et un facteur 1,00 **sont** l'état sans piste. Le gel est donc pixel-identique à « aucune animation » : c'est ce que G3 interdit, et l'anti-vacuité §6.3 mesurerait 0 sur cette image | G3 est refusable entrée par entrée : décaler `PoseDeReposS` hors de la mi-période (p. ex. 1,15 s sur 4,6 s ⇒ α ≈ 0,91) **ou** réécrire la forme pour que la mi-période porte l'extremum non neutre (`Eclat` 0 → 1 → 0, cf. BL-6) |

> **Réfutation possible de BL-7, dite d'avance** : si f2 lit « repos » comme *l'image clé 0 %/100 %*
> (0,82 pour la lampe), les six passent et BL-7 tombe en MAJOR. Je retiens la lecture stricte parce que
> c'est la seule que le design **définit** (`:67`, les valeurs de restitution) et parce que l'objet de la
> garde — qu'une PNG gelée prouve le mouvement — n'est pas servi par un gel sur la valeur d'identité.
> Les cinq autres entrées en régime passent G3 : `comptoir.bouteilles` (0,96 ≠ 1,00),
> `autonomie.appel` (0,62), `vitrine.reflet` (33,6 % de course), `distribution.photo` (+2,5°),
> `conflit.salle` (translation +5 px CSS ; **son canal `Alpha` tombe, lui, sur 1,00** — à corriger avec BL-7).

### 2.2 MAJOR — le code ne serait pas faux, mais le catalogue trompe le codeur

| id | où | constat (cité) | preuve | pourquoi MAJOR | correction proposée |
|---|---|---|---|---|---|
| **MA-1** | `:156-166` (table I.1) | « | colonne | champ du **design §1** | … | `mouvement` | `Entree.M` : `Mouvement { PeriodeS, Canaux[Propriete, ImageCle[]], **Iterations**, **Direction**, PoseDeReposS }` … | `genre` | `Entree.G` … | `réduit` | **`Entree.DegradeReduit`** | appliqué du **§4 du design** » | `design:39` : le type s'appelle **`MouvementDefini`** et porte `Id; Genre G; PeriodeS; Canal[]; **Iteration**; **bool Alterne**; PoseDeReposS; CouleurA, CouleurB; Fonctionnelle`. `design:41` : le champ est **`Genre`** (pas `G`), et **`DegradeReduit` n'existe pas** — le dégradé est *dérivé* par la règle par genre du **§5**. Le modèle est au **§2**, pas §1 | Quatre des neuf colonnes pointent vers des noms de champs inexistants : un codeur qui part de I.1 écrit une classe que les gardes du design ne reconnaissent pas | Recaler I.1 sur `design:39-41` : `MouvementDefini`, `Iteration`, `Alterne`, `Genre`, et pour `réduit` : « *dérivé* du §5, non stocké » |
| **MA-2** | `:156-166`, et les 42 lignes | Aucune colonne ne porte **`Bloquante`**, **`Hote`**, **`Fonctionnelle`**, `CouleurA/CouleurB`, `Iteration`, `Alterne` | `design:41` : `Entree { … ; bool **Bloquante**; **Hote** ("client" \| "SansHote:<raison>") }` ; `design:39` : `MouvementDefini { … bool **Fonctionnelle** }` ; G8 (`design:135`) ne lit **que** `Bloquante` ; §5 (ii) ne s'applique qu'à une entrée **`Fonctionnelle`** | Les deux champs dont dépendent G8 et le dégradé réduit des deux appuis longs ne sont déclarés **nulle part**, pour aucune des 42 entrées (seule la prose dit « non bloquant » sur 4 d'entre elles) | Ajouter deux colonnes `bloquante` et `hôte` (et marquer `Fonctionnelle` sur `retour.appui-long`), ou une ligne de déclaration par entrée |
| **MA-3** | `:253-256`, `:838-845`, `:847-866`, `:868-877`, `:879-893`, `:1094-1096`, `:640`, `:873` | « ⚠️ **`Entree.Ecran` est un `string` singulier** dans le design (§1 : « `string Ecran (sym ①…㊵)` »). Ces 8 lignes **ne tiennent donc pas dans le modèle tel qu'il est écrit** » ; Q2 « **Reco** : ajouter `bool Bloquante` à `Entree` » ; Q3 « l'enum `Propriete` (design §1) n'a **aucun puits** » ; §VII.1 « Quatre d'entre elles (Q1, Q2, Q3, Q4) **modifient le design avant E1** » | v4.1 porte déjà les quatre : `design:41` « `string[] **Ecrans** (ou "*")` … **Une `Entree` à plusieurs écrans** compte, pour G4, **sur chacun des écrans résolus** » ; `design:41` `bool Bloquante` ; `design:36` « **`Parametre`** (puits générique : `IParametreAnime.PoserParametre` … **la ficelle de ㉘**) » ; `design:92` « le réglage du joueur dans ⑲ est **un REUSE du canon** … pas une question produit ». La chaîne « `string Ecran (sym ①…㊵)` » n'existe plus dans le fichier (grep : 0) | Le catalogue envoie f2 trancher quatre questions déjà tranchées, et déclare hors-modèle 8 entrées que le modèle porte. §VII fait de ce faux-blocage la première action du lot | Marquer Q1-Q4 **RÉSOLUES par v4.1** (comme Q7/Q10 le sont déjà), supprimer l'encadré `:253-256`, et retirer « modifient le design » de §VII.1 |
| **MA-4** | `:640`, `:1032-1033`, `:240-241` | « ⛔ **DIFFÉRÉ, et c'est un trou du design, pas une préférence** : l'enum `Propriete` … ⇒ **Q3**. Sans Q3, cette entrée **sort du catalogue** » ; et `distribution.ficelle-tendue` compté parmi « **4 entrées ne sont pas câblables aujourd'hui** » | `design:36` nomme `Parametre` **et son cas d'usage** (« la ficelle de ㉘ ») ; `DistributionScreenController.cs:518-523` expose bien `DefinirTrace(… amplitude: Px(6f))`, l'hôte existe (`:1340` `DistributionFicelleGraphic : MaskableGraphic`) | Une entrée câblable est comptée comme différée : le compte « 4 non câblables / 38 câblables » et le plan E1 en héritent | Passer `distribution.ficelle-tendue` en câblable, `Propriete = Parametre`, et ramener le compte à 3 non câblables |
| **MA-5** | `:321`, `:341`, `:479`, `:598`, `:725` | Cinq `Alerte` portent en colonne `réduit` : « `Alerte` + `Teinte` ⇒ **conservé** (design §4 : « **la pulsation d'un voyant reste** ») », « ⇒ **conservé** : tant qu'il reste une décision, on doit le voir même en mouvement réduit » | `design:91` (§5) : « **`Reduit`** : tout est figé à `PoseDeReposS`, **y compris `Alerte`** (son état statique nommé existe sans pulsation). **Exceptions** : (i) `Retour` … (ii) une entrée **`Fonctionnelle`** ». La phrase citée (« la pulsation d'un voyant reste ») **n'existe pas** dans v4.1 (grep « pulsation » : 0) | La colonne `réduit` ne suit pas la règle par genre du §5 pour 5 entrées, sur une citation inventée ; du code écrit là-dessus viole X5 (mouvement réduit conforme au canon F2) | Mettre « figé à `PoseDeReposS` » pour les 5, et porter l'information de jeu par un état **statique nommé** (ce que §5 prévoit) ; si f2 veut l'exception, elle doit entrer au §5, pas au catalogue |
| **MA-6** | `:775` (`carnet.en-main`) | « réduit : **PAS un gel** : même règle que `retour.appui-long` — la marque apparaît d'un coup au seuil » | L'entrée est `Retour` et son canal est **`Alpha`** (fond de ligne 0,00 → 1,00). §5 (i) ne garde pour `Retour` que « le **mélange** de couleur à l'appui … sans échelle » ; §5 (ii) ne vise qu'une entrée **`Fonctionnelle`** = « un **`Remplissage`** de progression ». Ni l'un ni l'autre ne couvre un `Alpha` | Le dégradé réclamé sort des deux exceptions du §5 : tel quel, la règle gèle l'entrée | Soit déclarer l'entrée `Fonctionnelle` (et justifier qu'un appui long non destructif l'est), soit passer le canal en `Melange` pour tomber sous l'exception (i) |
| **MA-7** | `:191`, `:479` | « **Un `Alerte` en `Alpha`/`Teinte` ne varie pas plus de 3 fois par seconde (période ≥ 0,4 s, G5)** » ; « (G5 : 1,6 s ≥ **0,4 s**, soit 1,25 variation/s) » | `design:93` : « au plus 3 extrema par seconde (**période ≥ 0,667 s**) » | Le seuil transcrit est 1,7× trop permissif : une garde écrite d'après le catalogue accepterait une pulsation de 0,5 s (4 extrema/s). **Mesuré : aucune entrée actuelle ne franchit 0,667 s** (la plus rapide est `accueil.descente` à 1,100 s ✔), donc le risque est dans la garde, pas dans les lignes | Remplacer « ≥ 0,4 s » par « ≥ 0,667 s » aux deux endroits |
| **MA-8** | `:187-190` vs `:849-857` | « **`Retour` et `Transition` ≤ 250 ms** (X8, G8). **Trois entrées dépassent**, toutes non bloquantes, toutes nommées : `retour.appui-long` (1 000), `carnet.en-main` (500), `semaine.aiguille` (700) » | Le §IV Q2 du même fichier en liste **quatre** : la table `:852-857` ajoute `bandeau.sortie` **400 ms** (`BandeauEphemere.cs:296-299` relu : `FonduS = 0.4f` à `:167` ✔) | La liste des exceptions à G8 est fausse dans la section qui prétend les nommer toutes ; c'est exactement l'endroit où un codeur ira chercher le périmètre de la garde | Lire « **quatre** entrées dépassent » et ajouter `bandeau.sortie` à I.2.3 |
| **MA-9** | `:212`, `:218-231`, `:227`, `:230-231` | « ⚠️ **Recalé le 08/10** : … Lire la table ci-dessous **sans ces six lignes** » puis la table garde ses 9 blocs, dont les `*6-scan` et « **`mk-eclat` n'a toujours aucun hôte** » ; « **Contrôle : … = 44.** Présentes 2 · partielle 1 · **absentes 41** (`inventaire-animations.md:87-89`, inchangé) » | `inventaire-animations.md` fait **85 lignes** (`wc -l`) : `:87-89` n'existe pas. Son §F (`:84-85`) dit « **40** … Présentes 2 · partielles 1 · **absentes 37** ». Et **aucune ligne de la table ne porte B11** (l'aiguille de ⑭), que l'encadré annonce pourtant comme ajoutée | La table G2 du catalogue reste écrite sur 44 avec une somme de contrôle fausse et une ancre vers un intervalle inexistant ; le lecteur doit faire le recalage de tête | Réécrire la table sur 40 : supprimer les 6 lignes `*6-scan`, passer `mk-eclat` en « hôte présent (cadre 146) », **ajouter une ligne B11** avec son `SansHote:⑭ cadran absent`, et recaler le contrôle sur 2/1/37 |
| **MA-10** | `:237-242`, `:1101-1102` | « le `Catalogue` final comptera **42 + 40 = 82 lignes**, dont **38 non câblables** … **38 attendent quelque chose ; 48 sont câblables.** » | **38 + 48 = 86 ≠ 82.** Le détail (`:238-241`) compte « 6 à hôte non vérifié (les `*6-scan`) » **parmi les 82**, alors que ces 6 paires sont sorties de l'inventaire (40) et du catalogue (`:21`, `:212`, Q10 `:943`) | Deux des trois sommes de contrôle finales du fichier ne bouclent pas, et c'est le chiffre que §VII donne à `coder` comme taille de la table | Recompter : 82 = 28 sans hôte + B11 + 3 des miennes (après MA-4) ⇒ **32 non câblables, 50 câblables** — à refaire à la ligne, pas au mot |
| **MA-11** | `:227`, `:233-235`, `:817` (A1) | « **`mk-eclat` n'a toujours aucun hôte** ⇒ demande **A1** » ; « `mk-eclat` **n'est pas** l'une des 44 : l'inventaire le classe en §C (défini, **0 instance mesurée**, `inventaire-animations.md:69`) parce qu'**aucun cadre ne montre son hôte** » ; A1 cite « `inventaire-animations.md:69` : « **`mk-eclat` RESTE** (hôte = grappe de prismes … **qu'aucun cadre ne montre**) » » | `mesure-ecrans-brennar-6.json` : `mk-eclat` = **4 instances mesurées**, `dur` 5200, délais **−4200 / −3900 / −2600 / −1300**, **cadre 146**. `inventaire-animations.md:37` le compte dans les 29 paires de §A (4 instances) et `:65` dit : « **`mk-eclat` a maintenant son hôte : le cadre 146** (tuile Ash du marché, demande A1) porte 4 éclats ». La phrase citée à `:69` n'existe pas (`:69` = « Série 4 … : 0 animation en cours ») | Demande à l'atelier **contredite par ce que l'atelier a déjà fait** (cadre 146), appuyée sur une citation introuvable et sur un « 0 instance » démenti par le JSON de mesure | Réécrire A1 en « vérifier/retoucher la grappe existante du cadre 146 », et donner à `mk-eclat` une entrée ou un `SansHote` côté client (㉑ non monté) |
| **MA-12** | `:460` (`semaine.aiguille`), `:818` (A2) | « **`hud-brennar-canon: aiguille`** = la paire d'inventaire **B10** (`inventaire-animations.md:62` : « transition `transform .7s` (aiguille) … ») » ; A2 « débloque … **et avec elle la paire d'inventaire B10** » | `inventaire-animations.md:57` = **B10**, « ① HUD … l'aiguille du **manomètre du HUD** », hôte **présent** (`SetCitywideHeatBucket:703`) ; `:58` = **B11**, « **⑭ La semaine** … aiguille du cadran TENSION, 6 cadres 14-19 ». Les 6 transitions de ⑭ sont dans `transitions-brennar-6.json` (6 × `transform .7s`), celle du HUD dans `transitions-hud.json` (« inline line#aiguille »). `:62` est le titre de la section C. Et B10 est déjà attribuée ailleurs : `design:119` (`SetCitywideHeatBucket` → `Transitionner(chrome.aiguille.balayage)`) et `design:151` (E3) | L'entrée de ⑭ revendique la paire du HUD : B10 est réclamée deux fois et B11 n'est réclamée nulle part dans le catalogue. G2 (mesure ⇄ catalogue, qui lit `transitions-brennar-6.json`) ne peut pas apparier. *Non BLOCKING parce que `design:108` porte déjà le `SansHote:⑭ cadran absent` de B11* | `Source = hud-brennar-canon: B11` (+ ligne B11 en I.3, cf. MA-9), ancre `inventaire-animations.md:58`, et A2 « débloque **B11** » |
| **MA-13** | `:112-115` (§0.4) | « Mesuré sur `mesure-ecrans-brennar-6.json` (**554 animations réelles**) : **8 paires sur 34** seulement portent un `animation-delay` négatif (les **6 `*6-scan`** à −2,600 s et `mk-buee` …, `mk-scan` …) — soit **45 instances sur 554**. Les **26** autres paires … » | Compté dans le fichier cité : **529** animations, **29** noms distincts, **3** noms à délai négatif (`mk-scan` 6 instances, `mk-buee` 6, **`mk-eclat` 4**), **16** instances négatives. Les `*6-scan` n'y sont plus (une seule clé « scan » : `mk-scan`). 554 est le compte **d'avant le dégel** (`inventaire-animations.md:42` : « 491 sur 554 ») | Quatre nombres mesurés sur quatre sont périmés dans le paragraphe qui fonde la décision « la phase négative est à CHOISIR », et la liste des paires à délai négatif **omet `mk-eclat`**, qui en porte quatre. La conclusion survit (26 des 29 démarrent à ≥ 0 ✔) mais aucun de ses appuis n'est reproductible | Recompter contre le JSON : 529 / 29 / 3 paires / 16 instances, et citer `mk-eclat` parmi les phases négatives mesurées |
| **MA-14** | `:181-186` (I.2.2) | « **Aucun montant exact animé ni affiché** (R2.2) … Aucune entrée n'anime un nombre. **Les seuls chiffres touchés sont des comptes d'items actionnables** (le « 1 » du jeton de ⑤, les 8 créneaux de ㉞) » | `autonomie.appel` (`:598`) anime l'`Alpha` du `ReportHeader`, dont le texte est construit à `AutonomyInboxController.cs:285` : `"Lt " + report.lieutenant_id + "  •  Oldest: " + report.backlog_age_cycles + " cycles"` — **un scalaire de simulation exact**, pas un compte d'items actionnables | La contrainte 2 du catalogue est fausse là où elle est la plus vérifiable ; un relecteur qui s'y fie ne regarde pas ⑭/㉔. (L'affichage préexiste au catalogue : ce n'est pas lui qui crée le manquement à R2.2, mais il l'efface du périmètre) | Rectifier I.2.2 : nommer `autonomie.appel` comme **exception consignée** (le support animé porte un scalaire servi), et consigner la dette R2.2 pour ㉔ comme le design le fait pour `monte` |
| **MA-15** | `:295` (`comptoir.bouteilles`) | « `Alpha` **0,80 → 0,96 → 0,80** sur un `CanvasGroup` posé sur la rangée `Bouteilles` (`DecorAuComptoir.cs:236` … dégradés … **à α 0,80**, `:255-260`) » | `DecorAuComptoir.cs:260` (relu) : `img.color = new Color(1f, 1f, 1f, 0.8f); // opacity:.8` — la base **mesurée** est 0,80 par bouteille. Un `CanvasGroup` **multiplie** : les valeurs annoncées rendent 0,64 → 0,77 ; lues comme valeurs **rendues**, 0,96 est inatteignable (`design:121` : « un `CanvasGroup` ne dépasse pas l'alpha du `Graphic`, la crête est donc la base ») | C'est l'erreur que la revue n°4 a fermée pour `AmbientPulseLoop` (MA-2, `design:197`) et que le catalogue réintroduit : l'amplitude écrite n'est pas l'amplitude rendue | Écrire des **facteurs** (p. ex. `[1,00 .. 0,83]`, crête = base) et dire la valeur rendue correspondante, comme `design:121` |
| **MA-16** | `:360` (`famille.lampe-du-don`), `:103`, `:107-108` | « `Alpha` **0,82 → 1,00 → 0,82** … `Halo` (le voile radial d'or du Don, 225 × 225 u) » — admis par le plancher « `Alpha` : **Δ ≥ 0,15** » — alors que §0.3 **écarte** le liseré de ㉓ « (4,27 u à α 0x40 : Δteinte invisible **sous 25 % d'opacité**) » | `LieutenantScreenController.cs:2381-2383` : le halo est un `VoileRadial` de `Css(hudMoneyGold, **0.14f**, FondPlaque)` — 14 % d'opacité, **et dégradé radialement**. Le Δ **rendu** vaut 0,18 × 0,14 ≈ **0,025**, soit ≈ 5 niveaux /255 au centre et moins partout ailleurs | Le plancher est calculé sur le **facteur** du `CanvasGroup`, pas sur le contraste rendu : la marge G13 (≥ 3/255, `design:102`+§6.2) ne tient qu'au centre, et le même raisonnement a servi à écarter une autre entrée. Prémisse déduite, non mesurée | Mesurer le Δ rendu (ou le faire mesurer par la planche E0/E4) et, si besoin, demander à l'atelier un halo plus opaque — ou retirer l'entrée comme le liseré de ㉓ |
| **MA-17** | `:968-1001` (§V), `:195-197` | « une entrée transverse est comptée sur **chaque** écran qu'elle sert » — mais les 5 entrées `Ecran = "*"` sont comptées sur une ligne « `*` transverses », aucun écran réel ; et « Le pire cas simultané : ㉙ à 9 pistes + les 3 `Alerte` du chrome + **3 transverses** = 15 » | `design:41` : « Une `Entree` à plusieurs écrans compte, pour G4, **sur chacun des écrans résolus** ». Les transverses sont **5**, pas 3. Recompté par moi (tableau §4) : ㉙ **14**, ⑮ 12, ⑩ 12, ⑯ 10 — **tous ≤ 16**, et le pire cas simultané est 17/48 | La colonne « ≤ 16 ? » de §V n'est pas celle que G4 calculera : le tableau sous-compte chaque écran de 4 à 5 pistes. **Aucun verdict de plafond ne change** (d'où MAJOR et non BLOCKING), mais le lot E1 ne peut pas s'appuyer sur ce tableau pour la garde | Ajouter une colonne « + transverses `*` résolues » et refaire la ligne « pire cas » avec 5 |

### 2.3 mineurs

| id | où | constat | preuve |
|---|---|---|---|
| mi-1 | `:1`, `:5`, `:9`, `:81`, `:164`, `:196`, `:197`, `:199`, `:221`, `:360`, `:827`, `:916`, `:1030`, `:1102` | En-tête « — **v1** » et 13 renvois périmés : « design **v3** §2 », « **§4** mouvement réduit, gardes **G1-G9** », « oracle CSS (design **§5**) », « §4 du design » (réduit, ×3), « design **§3** » (MaxPistes 48, cadence 30 Hz, plafond 6 sous masque, E0 — tous au **§4**), « **§8** du design » (les 3 `Alerte` du chrome — **§9**), « gardes G1 à **G9** » | v4.1 : modèle §2, régie §3, coût §4, réduit §5, preuve §6, oracle §7, appui §8, migration §9, gardes **G1-G13** §10, plan §11 |
| mi-2 | `:132` | « durée confirmée à 4 600 ms sur **3 instances** par `mesure-ecrans-brennar-6.json` (`mk-lampe`) » | Compté : **4** instances `mk-lampe`, `dur` 4600, délais tous 0 (= `inventaire-animations.md:36`). La durée ✔, le compte non |
| mi-3 | `:10` vs `:12`, `:36` | « INDEX.md (les 35 écrans, **26** contrôleurs montés) » puis « les **24** contrôleurs eux-mêmes », « J'ai relevé les **24** contrôleurs » | `Tools/juge-visuel/INDEX.md:47` : « Montés par `AppShell.cs` : **25** contrôleurs distincts » (liste nominative). Deux chiffres différents dans le même fichier, aucun égal à la source |
| mi-4 | `:1085` | « ⇒ **`INDEX.md:15` et `:47` sont périmés sur cette ligne** (générés le 2026-09-22, la veille du ruling) » | `INDEX.md:47` porte la correction : « *(corrigé à la main le **2026-10-07** : l'INDEX avait été généré le 22/09, la veille du ruling qui sort ⑪ du chemin joueur …)* ». La ligne citée comme périmée dit déjà ce que le catalogue lui reproche de taire |
| mi-5 | `:295` | « son zinc est posé à `HauteurDos = 0f` (`Operational/Exceptions/ExceptionDetailController.cs:**781**`) » | `HauteurDos = 0f` est à **`:777`** ; `:781` = `public const float ZincMain = 0.15f;` (le « zinc à 15 % » cité ailleurs). Écart 4 lignes, fait exact |
| mi-6 | `:416` | « `ApresPresent` devient vrai (`:425`, posé par `trancheeIssue`/`garderTranchee` **`:418-420`**, bloc activé **`:508`**) » | `:418`/`:420` sont les **déclarations** de champs ; `:508` = `apresBloc.SetActive(**false**)` — l'activation est à `:517` (`apresBloc.SetActive(montre)`). `:425` ✔ exact |
| mi-7 | `:433`, `:442` | « la suggérée est remontée de `Px(8)` = `CssCarteLeve` », « (`:319`, `:384`) » | `CssCarteLeve = 8f` est à **`:315`** ; l'appel qui l'applique à **`:383`**. Valeurs ✔ |
| mi-8 | `:305` | « piste `Px(22)` = 93,9 u, **curseur `Px(5)`** = 42,7 u » | `SettingsScreenController.cs:245` : `crt.sizeDelta = new Vector2(Px(10f), Px(10f))` — le curseur fait **`Px(10)`** (42,7 u ✔) ; `Px(5)` est le **rayon du masque** (`:248`). La course 42,7 u = 36,0 px est juste (recalculée : 93,9 − 42,7 − 2×4,27) |
| mi-9 | `:77` | « interdits : spinner bloquant · `HealthBar`/`StatBar`/`ProgressBar` (R4.2) … `global_conventions_core.md:112` · `screen_1:319` » | `global_conventions_core.md:112` = la ligne `LoadingState` ; l'interdiction explicite (« Jamais spinner ») est à **`:209`**. `screen_1:319` **définit** `VitalBar` ; la « liste Jamais (R4.2) » est évoquée à **`:374`** |
| mi-10 | `:50` | « **21 des 22 écrans canon** y portent au moins une règle de mouvement » | Affirmation sans mesure jointe (ni compte par fichier, ni grep) ; non porteuse pour le code, mais c'est la seule statistique de §0.2 qu'un relecteur ne peut pas rejouer |
| mi-11 | `:177-180` | « **Les six entrées** dont l'hôte est un `TMP_Text` … sont **en `Alpha` seul** » | Au moins **sept** : `service.cartel` anime aussi un `TMP_Text` (`Qui`, `DelegationScreenController.cs:1164`) et `autonomie.reponse` le `Decided` (`AutonomyInboxController.cs:319`). **Toutes en `Alpha`** ⇒ G6 reste verte ; seul le compte est faux |
| mi-12 | `:38-39` | « **0 `fillAmount`, 0 `Image.Type.Filled`, 0 `Animator`, 0 `ParticleSystem`** dans tout `Assets/Scripts` » | Vrai **en mécanisme** (vérifié : les 12 occurrences textuelles sont toutes dans des commentaires — `ProceduralUI.cs:81,:90`, `TopBarController.cs:366,1210,1212,1213,1374,1379,1380,1439,1596,1599`). À dire « 0 **usage** », puisque `retour.appui-long` propose justement `Image.type = Filled` |

---

## 3. Couverture — ce que j'ai vérifié et trouvé JUSTE (à ne pas refaire)

**Modèle.** Les 42 entrées existent et sont uniques (recomptées : 8 transverses + 34 d'écran = 42 ; genres
5 `Alerte` / 6 `Ambiance` / 3 `Retour` / 28 `Transition` = 42 ✔, exactement les chiffres de §V et de §0.1).
`Entree.Id`, `Ecrans`, `Source`, `Cause` (toutes > 20 car., aucune « TODO ») et `Pistes` (entiers ≥ 1) sont
portés par les colonnes ⇒ **G1 passe**. Ce qui manque est en MA-1/MA-2 ; `Propriete` : **12** membres au §2
(le brief en annonçait 13 — compté, c'est 12), **3** `Mode` ✔.

**Ancres de code relues ligne à ligne (toutes exactes sauf mi-5/6/7/8)** — les 9 porteuses de §0.2 :
`AppShell.cs:1858-1863` (destruction synchrone + vidage de `ContentSlot` ✔, fonde VI.2),
`DailyReviewScreenController.cs:658` (`b.Bulle.alpha = 0.72f` ✔) et `:667`
(`localRotation = Euler(0,0,12f)` ✔ — **et le commentaire du code confirme le repère** : « `rotate(-12deg)`
en CSS … = +12° en z dans Unity »), `ConflitScreenController.cs:1345` (±3° des 7 silhouettes ✔),
`ExceptionQueueController.cs:577` (`int places = ApresPresent ? 2 : 3;` ✔),
`UiTimingTunables.cs:18-19` (250 / 1000 ✔), `global_conventions_core.md:136` ✔,
`screen_14:71 / :146 / :208 / :251 / :298` ✔ **les cinq au mot** (dont i18n FR « Mouvement réduit » et rôle
`switch`) — plus `:78`/`:212` pour le second interrupteur ✔.
Également relus et exacts : `TopBarController.cs:763`, `:770`, `:782` (`PoulsPeriodeS = 1.1f`),
`:703`, `:735`, `:822/:836/:851` ; `LongPressButton.cs:18` (`RequiredHoldMs = DestructiveLongpressMs`), `:20` ;
`AppShell.cs:1480/1525/329/1328/1701/1348/1978/1991/294` ; `HighestLeverageCardController.cs:343/371/376-384` ;
`DashboardController.cs:493-494/675/639/751-763` ; `DecisionDetailScreenController.cs:82 (2°)/174/198/302/311/356/412/428-429` ;
`LieutenantScreenController.cs:1331/1849/1860/2243/2366/2733/2742` ; `DailyReviewScreenController.cs:443/583/662/722/735/1276/1286` ;
`ExceptionQueueController.cs:425/477/482 (+8°, avec la note de signe)/610/632/1149` ;
`ExceptionDetailController.cs:70/365/380-385/449/531-532/569-574` ; `CompressionScreenController.cs:194/202-204/231/322/461` ;
`InspectionScreenController.cs:263/286/308/310/351/433` ; `PrecinctScreenController.cs:211/224/232/271-272/278-279` ;
`ShopScreenController.cs:63 (K = 1280/300)/171/195/223/228/241/327/334/369/406/409` ;
`AutonomyInboxController.cs:192/285/316/319/339/413/418/463` ; `TutorialScreenController.cs:114/227/290/295/344-363/365-370/375` ;
`DistributionScreenController.cs:394/399-400/518/523 (amplitude Px(6))/1091/1340/1350/1392/1396/1410/1430` ;
`ChaineDApproScreenController.cs:382/466/470/498/504/526/582/753` ;
`DelegationScreenController.cs:360-362/534/735/979-980/1051/1129/1164/1254/1534` ;
`CarnetScreenController.cs:411/461/463-464/480/616/620/807/810/819` ; `AppuiLong.cs:10` (`Duree = 0.5f` ✔) ;
`ConflitScreenController.cs:14/322/714/788/937/1219-1220/1322-1330/1335-1346` ;
`DecorAuComptoir.cs:124 (Plateau/FiletHaut, Px(2), or α 0x88)/135/234-236/255-260 (7 bouteilles)` ;
`BandeauEphemere.cs:157-158 (« à ratifier »)/166 (5 s)/167 (0,4 s)/204-206/253/261/269/286/293/296-299` ;
`ReputationScreenController.cs:994` (**c'est bien une `Scrollbar`** ✔, Q6 confirmée) ;
`ProceduralUI.cs:241` (`Ring`) ✔.

**Comptes du dépôt refaits à la main, tous justes** : **15** `Selectable.Transition.None` ✔ · **67**
`AddComponent<Button>()` dans **34** fichiers ✔ · **306** `LayoutGroup` ✔ · ProfileScreenController **0**
`Button` ✔ (fonde ㉒) · SettingsScreenController **0** `CanvasGroup`/**0** `ScrollRect` ✔ (fonde ⑲) ·
LoiScreenController **0** `ProceduralUI` ✔ (fonde ㉛) · 0 `Animator`/`ParticleSystem`/`fillAmount` **en usage** ✔ (cf. mi-12).

**Canon.** Citations vérifiées au mot : `global_conventions_core.md:124` (« Durée max **bloquante** … 250 ms »),
`:125`, `:126` (« pas d'animation sur chemin critique cold-open »), `:136`, `:33`, `:127`, `:150` ;
`screen_1:386` ; `screen_11:255` (**flip-out**) **et `:280` (slide-out) — la contradiction relevée par le
catalogue existe vraiment** ; `screen_13:281`, `:308`, `:372`, `:120`, `:123`, `:285` ; `screen_5:340`
(« row disparaît (fade out …) ») ; `screen_5a:254` ; `screen_3:451` ; `screen_12:223`, `:193` ;
`screen_2a:279`, `:300`, `:258`, **`:314`** (« Arc long-press Demolish : animation coupée → **indicateur
statique + compteur textuel secondes** » — citation **exacte**, le cœur de Q2/§5 (ii) tient).

**Gardes passées en revue, entrée par entrée** : G1 ✔ · G2 → MA-9/MA-12 · G3 → **BL-7** (6 entrées ; les
5 autres en régime calculées et conformes) · G4 ✔ (recompté, aucun écran > 16 même en résolvant les
transverses — MA-17 ne porte que sur la méthode) · G5 ✔ **mesurée sur les 11 entrées en régime** : périodes
1,1 / 1,6 / 1,6 / 4,6 ×4 / 7,4 / 11,0 ×2 s, toutes ≥ 0,667 s (seuil mal transcrit : MA-7) · G6 ✔ **verte**
(les 7 hôtes `TMP_Text` sont tous en `Alpha` seul ; le `Tag` de ㉝ relu : la cible porte une `Image`
`RoundedRectOutline` (`DemolitionScreenController.cs:966-971`), le `TMP` est son **enfant** — pas de canal
sur le texte, cf. mi-11) · G8 → MA-8 (aucune entrée bloquante > 250 ms ; les 4 dépassements sont tous
non bloquants, vérifié dans le code pour les 4) · **G11 → BL-2/BL-3/BL-4** ; les autres translations sont
**saines, hiérarchies vérifiées** : `main.distribuee`/`main.levee` (cible = `Face`, enfant stretché d'un
`carte` **sans** LayoutGroup ✔), `conflit.salle` (silhouettes ancrées sous `SceneHaute`, aucun LayoutGroup ✔),
`bascule.course` (curseur ancré sous `Interrupteur`, aucun LayoutGroup ✔), `bandeau.entree`
(`rt.anchoredPosition` posé à la main, `:206` ✔) · G12 ✔ **aucun conflit démontrable** : toutes les cibles
de couleur sont des **enfants** des `Button` que `retour.appui` touche (`Tag`/`Rang` sous `Offre_N`,
`Rond` sous la plaque, `BordChoisi` sous la rangée) · G13 ✔ sauf MA-16 (marges recalculées pour les 6 `Ambiance`).

**Repère et oracle.** `tremble` CSS 52 → 56 → 52 confirmé dans `oracle-css-hud.json` (⇒ Unity 0 → −4 → 0,
`design:33` ✔). `mk-lampe` : `durS` 4,6 et opacité **0,82 → 1,00 (p = 0,5) → 0,82** ⇒ la forme du §0.5 et des
cinq reprises est **exacte en ordre et en signe** ✔. `mk-eclat` : `0 %,72 %,100 % → .16` / `82 % → .85`,
`durS` 5,2 ⇒ la citation de A1 est exacte ✔. `mk-scan` : `ty` −6 → 184, opacité 0 → .5 → 0, `durS` 7,5,
délai −2 600 ✔ (A9). `mk-buee` : `sx` 0,9 → 1,25 ⇒ `EchelleX` ✔. `pouls` : 1,1 s, 1 → 0,45 → 1 ✔
(= `PoulsCreux = 0.45f`). Seul **`mk-veille` est inversé** ⇒ BL-6. Les 6 transitions de
`transitions-hud.json` et les 6 de `transitions-brennar-6.json` lues une par une (⇒ MA-12).

**§V.** Les trois sommes de contrôle sont **arithmétiquement justes** : 46 − 42 = +4 (2 + 1 + 1 ✔),
68 − 63 = +5 (2 + 1 + 2 ✔), genres 5 + 6 + 3 + 28 = 42 et 5 + 9 + 3 + 29 = 46 ✔. Recomptées de zéro par moi,
ligne par ligne : identiques (tableau §4). Le « pire écran : ㉙ à 9 pistes » ✔ et « 15 sur 48 » est juste
avec 3 transverses (17 avec les 5 réelles — mi/MA-17), donc **aucun plafond n'est approché**.

**Vocabulaire / ère / monnaie.** Balayage fait : **aucun** objet 1930-1990 (0 « bakélite », 0 « standard à
fiches », 0 « lampe d'époque ») ; le vocabulaire est bien celui de 2000-2010 (lampe de bureau, console de
répartition à voyants LED, plastique dur, pager). « Jeton » : employé **uniquement** comme **objet de table**
(laiton, tapis, zinc) et comme jeton de *décision/confiance* servi par le back — jamais comme monnaie ; les
Marks sont nommés comme la seule monnaie (`:558-559`). Aucun montant exact **animé**. Le seul manquement à
I.2.2 est MA-14.

**Non rejugé (hors périmètre, par consigne)** : la règle G8 elle-même, le §5 (ii) et ses citations
`screen_2a:314`/`screen_13:308` (vérifiées exactes au passage), les 10 mineurs de
`dettes-design-mouvement.md`, l'absence de `UiTimingTunables.AppuiLongDeplacementMs` (dette 1 connue).
**Non vérifié** : la présence réelle de l'hôte des `*6-scan` (le catalogue ne l'affirme pas non plus, A9),
les géométries de l'atelier dans `~/project/atelier3d-mafia/generateur-marche.py` (hors dépôt),
et les 21/22 écrans canon de mi-10.

---

## 4. Σ pistes par écran — recompté par moi, à côté de §V

`propres` = entrées de la section §II de l'écran. `nommées` = transverses non-`*` (`comptoir.lampe` ⑨⑩⑯,
`comptoir.bouteilles` ⑨⑯, `bascule.course` ⑲㉕). `G4 résolu` = + les 5 entrées `Ecran = "*"` résolues au
pire cas (`shell.entree` partout ; `retour.appui` partout où il y a un `Button` ; `retour.appui-long` sur
④⑤⑯ seulement — 4 instances mesurées ; `bandeau.entree`/`.sortie` comptés partout, majorant).

| écran | pistes propres | + nommées | **Σ (mon compte)** | **§V** | ✔ | G4 résolu (mon majorant) | ≤ 16 ? |
|---|---:|---:|---:|---:|:--:|---:|:--:|
| ④ Accueil | 2 | 0 | **2** | 2 | ✔ | 2 + 1 + 1 + 1 + 2 = **7** | ✔ |
| ⑤ Décision du jour | 3 | 0 | **3** | 3 | ✔ | 3 + 1 + 1 + 1 + 2 = **8** | ✔ |
| ⑥ La Famille | 2 | 0 | **2** | 2 | ✔ | 2 + 1 + 1 + 2 = **6** | ✔ |
| ⑨ Exception Queue | 2 | 2 | **4** | 4 | ✔ | 4 + 1 + 1 + 2 = **8** | ✔ |
| ⑩ Exception Detail | 5 | 1 | **6** | 6 | ✔ | 6 + 1 + 1 + 2 = **10** | ✔ |
| ⑭ La semaine | 2 | 0 | **2** | 2 | ✔ | 2 + 1 + 1 + 2 = **6** | ✔ |
| ⑮ Les inspections | 7 | 0 | **7** | 7 | ✔ | 7 + 1 + 1 + 2 = **11** | ✔ |
| ⑯ Revue du jour | 3 | 2 | **5** | 5 | ✔ | 5 + 1 + 1 + 1 + 2 = **10** | ✔ |
| ⑰ Le commissariat | 1 | 0 | **1** | 1 | ✔ | 1 + 1 + 1 + 2 = **5** | ✔ |
| ⑲ Les réglages | 0 | 2 | **2** | 2 | ✔ | 2 + 1 + 1 + 2 = **6** | ✔ |
| ㉒ Votre profil | 0 | 0 | **0** | 0 | ✔ | 0 + 1 + 0 (0 `Button`) + 2 = **3** | ✔ |
| ㉓ La vitrine | 3 | 0 | **3** | 3 | ✔ | 3 + 1 + 1 + 2 = **7** | ✔ |
| ㉔ Rapports d'autonomie | 3 | 0 | **3** | 3 | ✔ | 3 + 1 + 1 + 2 = **7** | ✔ |
| ㉕ La première fois | 1 | 2 | **3** | 3 | ✔ | 3 + 1 + 1 + 2 = **7** | ✔ |
| ㉘ La distribution | 2 | 0 | **2** | 2 | ✔ | 2 + 1 + 1 + 2 = **6** | ✔ |
| ㉚ La chaîne d'appro | 1 | 0 | **1** | 1 | ✔ | 1 + 1 + 1 + 2 = **5** | ✔ |
| ㉛ La loi | 0 | 0 | **0** | 0 | ✔ | 0 + 1 + 1 + 2 = **4** | ✔ |
| ㉜ Ce que vous avez confié | 3 | 0 | **3** | 3 | ✔ | 3 + 1 + 1 + 2 = **7** | ✔ |
| ㉝ Raser un site | 3 | 0 | **3** | 3 | ✔ | 3 + 1 + 1 + 2 = **7** | ✔ |
| ㉞ Les ordres du soir | 2 | 0 | **2** | 2 | ✔ | 2 + 1 + 1 + 2 = **6** | ✔ |
| ㉙ Le conflit | 9 | 0 | **9** | 9 | ✔ | 9 + 1 + 1 + 2 = **13** | ✔ |
| `*` transverses | 5 | — | **5** | 5 | ✔ | (résolues ci-dessus) | — |
| **Σ par attachement** | — | — | **68** | **68** | ✔ | pire écran = **13** (㉙) | ✔ |
| **Σ par entrée distincte** | — | — | **63** | **63** | ✔ | — | — |

**Conclusion du recompte** : §V est **juste** sur tous ses nombres ; son seul défaut est la **méthode**
(MA-17) — et même en résolvant les transverses au pire cas, **aucun écran ne dépasse 13 pistes sur 16**, et
le pire cas simultané vaut **17 sur 48**. Aucun verdict de plafond ne change : c'est pourquoi MA-17 n'est
pas un BLOCKING.

---

## 5. Ce qu'il faut pour passer le gate

Les 7 BLOCKING sont tous **locaux et mesurés** : un renommage de canal avec `CouleurA/B` (BL-1, 12 lignes),
trois cibles de translation à déplacer d'un cran dans la hiérarchie (BL-2/3/4), deux signes/ordres à prendre
dans la ligne qui applique plutôt que dans le paramètre CSS (BL-5, BL-6), et six `PoseDeReposS` à décaler
hors de la mi-période (BL-7). Rien n'exige de rouvrir la thèse de §0.1, ni une décision de f2 — sauf la
lecture de « repos » dans G3, que la note sous BL-7 isole exprès.

Un trou honnêtement documenté se garde : les `⛔ HÔTE À DESSINER` (A2/A3/A4), le refus argumenté de ㉒/㉛/㉚,
le « 240 ms non bloquant » de ⑩ et la contradiction canon flip/slide-out de ⑯ sont **exactement** la bonne
manière de porter une dette — qu'ils restent, avec leur ancre.
