# Revue ⊥ n°2 — `Tools/conformite-anim-2026-10-07/catalogue-mouvements.md` **v2** (1 268 l., 42 lignes, 47 `Entree`) + l'ajout **v4.2** du design (§2 `Melange`, §16)

Relecteur indépendant (⊥) n°2. Je n'ai écrit ni ce fichier ni la revue n°1. Dépôt :
`/home/erutheone/project/mafia-unity-anim`, branche `design/conformite-anim-2026-10-07`, HEAD `47326439`.
Lecture seule : aucun fichier du dépôt modifié, aucun commit, aucun stash, Unity non ouvert
(le serveur UnityMCP a refusé la connexion — sans effet, rien n'exigeait l'éditeur).
Référentiel : `design-couche-mouvement.md` **v4.1 jamais rejugé** (seuls la phrase « v4.2 » de §2 et le §16
sont dans mon périmètre), `inventaire-animations.md`, `mesure-ecrans-brennar-6.json`, `oracle-css-*.json`,
`transitions-*.json`, `Assets/Scripts/`, `~/project/mafia-lot-i18n/docs/tech/08_ui_screens/`,
`~/project/mafia-clean-city/front.md`. Les 10 mineurs de `dettes-design-mouvement.md` ne sont pas recomptés.

---

## 1. Verdict

# NON APPROUVÉ

**6 BLOCKING · 6 MAJOR · 8 mineurs.**

**Les 7 BLOCKING de la n°1 sont fermés, tous les sept, et vérifiés à la source** — y compris les deux qui
demandaient une mesure (`mk-veille` est bien `brightness 1 → 1,35 à p = 0,5 → 1`, et les 529/29/3/16 de §0.4
sont exacts au chiffre). Les trois sommes de contrôle de §V et les cinq de §I.3/§I.4 bouclent, recomptées de
zéro ligne par ligne. §I.4 est un vrai progrès : la projection champ par champ existe, et elle est fidèle à
§II sur 46 des 47 lignes.

Ce qui bloque n'est pas la thèse et ce n'est pas de la nuance : **la correction de BL-1 a déplacé la charge
de preuve sur la CIBLE, et la cible n'a pas été mesurée.** `Teinte` est devenu `Melange` avec
`CouleurA = Cible` — mais personne n'est allé voir, pour les 67 boutons et pour deux disques, ce que
`Graphic.color` vaut vraiment à l'attachement. Mesuré : sur 18 des 67 `Button`, le `Melange` de
`retour.appui` n'a aucune cible rendue (1 `TMP_Text`, 3 sans aucun `Graphic`, 14 à alpha nul) ; sur ㉝, la
couleur d'arrivée annoncée n'est pas celle que le code pose, et l'amplitude est nulle. S'y ajoutent l'autre
moitié de G11 — jamais invoquée de tout le fichier — qui tue une `Echelle`, un signe de translation resté en
repère CSS, et une entrée de ⑩ dont les deux bouts sont le même point.

Chacun des six est une mesure, pas une opinion. Aucun n'exige de rouvrir §0.1, ni une décision de f2.

---

## 2. Findings

### 2.1 BLOCKING — « le code écrit d'après ce catalogue serait FAUX »

| id | où | constat (cité) | preuve | pourquoi BLOCKING | correction proposée |
|---|---|---|---|---|---|
| **B2-1** | `catalogue-mouvements.md:301` (§I.4), `:379` (§II.0.a), `:209-214` (§I.2.1) | `retour.appui` · cible « le `Button` pressé » · canaux « `Echelle` Mult · **`Melange` Abs** » · « `Cible` → `Cible × 0,85` » ; et §I.2.1 : « **Les cinq `Entree` dont la cible est un `TMP_Text`** … sont **en `Alpha` seul** » | `Shell/DailyReviewScreenController.cs:1101` : `versLaFamille = emptyStateText.gameObject.AddComponent<Button>();` — le `Button` est posé sur le GameObject d'`emptyStateText`, déclaré `private TextMeshProUGUI emptyStateText;` (`:71`) et construit par `Texte(plaqueVide.transform, "Titre", …)` (`:1096`). Il est rendu interactif en jeu : `:366` `if (versLaFamille != null) versLaFamille.interactable = RienATenir;` (`RienATenir` posé `:361`). Ce site est **nommé par le catalogue lui-même** (`:1028`, Q6 : « le texte d'état vide de ⑯ (`DailyReviewScreenController.cs:1102`) ») parmi les 10 qui reçoivent, par design §8, **`Melange` seul, sans échelle** | `design:133` G6 : « pas de canal **≠ `Alpha`** sur un `TMP_Text` ». La garde n'est pas satisfaisable telle qu'écrite : sur ce bouton l'unique canal de `retour.appui` est celui que G6 interdit, et un `Melange` y recolorerait **le titre lui-même** (« donnez-leur une première règle »), pas une plaque. Et §I.2.1 affirme l'inverse : sa liste des cibles `TMP_Text` est incomplète | Soit une **exclusion nommée** de `retour.appui` pour ce site (le précédent existe : la `Scrollbar` de `ReputationScreenController:994` est l'exclusion nommée de G9, `design:136`), soit déplacer la cible sur `plaqueVide` ; et rectifier §I.2.1, qui doit compter **7** cibles texte, pas cinq |
| **B2-2** | `catalogue-mouvements.md:301` (§I.4), `:379` (§II.0.a), `:195-202` (§I.1 règle 3) ; `design-couche-mouvement.md:209-216` (§16) | `CouleurB = Cible × 0,85` sur « n'importe quel `Button` créé par le client (**67 sites**) » ; règle 3 ne ferme qu'un cas : « Un `Graphic` **blanc dont la couleur est cuite dans le sprite** … ne s'éclaircit pas » | Recensement **exhaustif des 67 sites** (`grep -rn 'AddComponent<Button>()' Assets/Scripts | wc -l` = **67**, 34 fichiers), hôte par hôte, helpers résolus (`NewUI`/`NouveauUI`/`Bloc` ne créent **aucun** `Graphic`) : **3 hôtes n'ont aucun `Graphic`** — `Operational/Exceptions/ExceptionDetailController.cs:569` (hôte `carte` = `NewUI` `:523` ; le `fondCarte` est sur l'enfant `Face` `:527`/`:534`, et c'est un stencil de `Mask` `showMaskGraphic = false` `:538`), `Operational/Lieutenant/LieutenantScreenController.cs:2731` (hôte `rang` = le conteneur de `BuildGlassPanel`, annoté `:2280` « **Il ne peint rien** »), `Shell/BandeauEphemere.cs:251` (hôte = le GameObject du bandeau : `CanvasGroup` `:207` seul, le `fond` est l'enfant `"Fond"` `:209-215`) — et **14 hôtes portent un `Graphic` à alpha 0**, hit zone pure : `DelegationScreenController.cs:1533` (`:1531` `cible.color = new Color(0f,0f,0f,0f)`), `SettingsScreenController.cs:256`, `CityMapController.cs:894`, `ExceptionQueuePanelController.cs:249` et `:314`, `ExceptionQueueController.cs:605`, `CarnetScreenController.cs:595`, `TopBarController.cs:940`, `TutorialScreenController.cs:365`, `HighestLeverageCardController.cs:342`, `DistrictInteriorScreenController.cs:691` et `:2128`, `AppShell.cs:2349`, `DemolitionScreenController.cs:1459`. Or `design:36` : `Melange` « écrit RGB dans `Graphic.color` **sans toucher l'alpha** » | **18 des 67 cibles ne rendent rien.** Sur les 3 premières il n'y a littéralement pas de `Graphic` à écrire (le canal ne s'applique pas à sa cible) ; sur les 14 autres l'alpha reste 0, donc le RGB écrit n'est jamais composé. Et ce sont les PIRES : le bandeau entier, la racine de la carte à fort levier, la plaque de ㉜, le bloc de ㉝, la rangée de ⑲, la ligne du carnet, la cellule de bâtiment — c'est-à-dire exactement la population que design §8 prive d'échelle, donc celle dont `Melange` est le **seul** canal. Le design §16 avait délégué ce devoir au catalogue (« **le catalogue l'interdit pour les autres genres (§I.1 du catalogue, règle 3)** ») et la règle 3 ne couvre qu'un tiers du problème | Écrire la règle qui manque, au choix dans §16 ou en §I.1 : « `CouleurA/CouleurB = Cible` est **refusée** si la cible n'a pas de `Graphic`, ou si `Graphic.color.a == 0` ». Puis, pour `retour.appui`, nommer la cible réelle : le `targetGraphic` quand il existe (il est sur l'hôte dans 52 cas sur 67) ou l'enfant peint, et traiter les 3 sites sans `Graphic` par exclusion nommée. *Mesuré au passage, à consigner* : **13 sites de plus** peignent un sprite de **contour** (`RoundedRectOutline`/`RadialDisc`) sous un `Image.color` resté au blanc par défaut (`SettingsScreenController.cs:275` et `:347`, `CompressionScreenController.cs:317`, `ShopScreenController.cs:321`, `TutorialScreenController.cs:321`, `SellingScreenController.cs:441` et `:503`, `DecisionDetailScreenController.cs:406`, `AppShell.cs:1592`, `LieutenantScreenController.cs:1605`, `:2838`, `:2879`, `DailyReviewScreenController.cs:590`) : le mélange y recolore **un trait de 1 px**, pas une surface — ce n'est pas faux, mais ce n'est pas « une pièce de plastique dur qui s'enfonce », et il faut le dire |
| **B2-3** | `catalogue-mouvements.md:328` (§I.4), `:683` (§II.㉓) | `vitrine.acquis/objet` · « l'`Objet` acheté » · « **`Echelle` Mult** » · « `Echelle` `Multiplicatif` **0,90 → 1,00**, **180 ms** » | `Economy/Shop/ShopScreenController.cs` : l'`Objet` est `pastille`, enfant de `tete` (`:223-224`), `tete` enfant de `r` (`:212`), `r` = `Bloc("Sku_" + s.sku_id, **etageres**, …)` (`:204`), et `etageres` = `listeRt` = le GameObject `liste` (`"Etageres"`, `:414`) qui porte **`var fitter = liste.AddComponent<ContentSizeFitter>(); fitter.verticalFit = PreferredSize;`** (`:434-435`), affecté `:437` `etageres = listeRt;`. L'`Objet` est donc **sous un `ContentSizeFitter`**, à deux niveaux | `design:138` G11, seconde moitié : « **`Echelle` n'est refusée que sous `ContentSizeFitter`** ». La garde refuse cette entrée telle qu'écrite — et le catalogue n'invoque **jamais** G11 pour une `Echelle`, nulle part : §VIII ne traite G11 que comme « trois translations retirées », et §I.2 ne liste pas la contrainte. **Le même défaut frappe `retour.appui`** (`Echelle` Mult sur `*`) sur au moins quatre sites vérifiés dont le `Button` est descendant d'un `ContentSizeFitter` : `DelegationScreenController.cs:1533` (sous `contenu`, CSF `:1004`, `zoneCentrale = ConstruireZoneCentrale(...)` `:925`), `DemolitionScreenController.cs:1459` (sous `contenu`, CSF `:1210`, `:1136`), `CarnetScreenController.cs:595` (sous `listeRoot` = `contenu`, CSF `:822`, `:824`, créneaux `:719`), `ConflitScreenController.cs:726` (sous `contenu`, CSF `:1235`) | `Alpha` seul sur l'`Objet` (le disque est de 40 px, un fondu se voit), **ou** poser l'`Echelle` sur un enfant étiré du disque — le patron que ⑩ emploie déjà (la `Face` sous la `carte`). Et ajouter à §I.2 une 9ᵉ contrainte dure : « `Echelle` refusée sous un `ContentSizeFitter` (G11) », avec le recensement des 55 occurrences de `ContentSizeFitter` du dépôt comme le fichier l'a fait pour les 306 `LayoutGroup` |
| **B2-4** | `catalogue-mouvements.md:342` (§I.4), `:864` (§II.㉝) | `demolition.offre-fermee/rang` · « **`CouleurA = Cible` = `BlocBord` `#3c3e35`**, `CouleurB = OrSombre` `#5a4a2a` » · « `Melange` **1 → 0** … **seulement si l'offre fermée était la première** (seule à porter `OrSombre`) » · cause : « et le numéro **perd sa dorure** » · source : « les couleurs d'arrivée et de départ sont **dans le code** (`:929`, `:967`, `DemolitionResolvers` `:1528`, `:1549`, `:1552`) » | `Operational/Demolition/DemolitionScreenController.cs:911` : `bool premiere = o.rank == 1;` — **dérivé du RANG seul**, jamais de `fermee`. `:929` : `disque.color = premiere ? DemolitionResolvers.OrSombre : DemolitionResolvers.BlocBord;`. Et l'offre fermée est précisément celle de rang 1 : `:843` `foreach (ReplacementOptionDto o in offres) ConstruireOffre(o, fermee && o.rank == 1);`. Donc au rendu qui suit la fermeture, `premiere` vaut **vrai** et `disque.color` vaut **`OrSombre`** (`:1552` `Hex(0x5a, 0x4a, 0x2a)`), **jamais** `BlocBord` (`:1528` `Hex(0x3c, 0x3e, 0x35)`). Le disque est bien un `RadialDisc(32, Color.white, Color.white)` (`:928`), donc `Image.color` **est** la couleur rendue : rien n'est cuit dans le sprite | `design:210` (§16) : « `Cible` = `Graphic.color` RGB **lu à l'`Attacher`/`Transitionner`, après que le propriétaire a posé son état d'arrivée** ». Ici l'état d'arrivée posé par le propriétaire est `OrSombre`, pas `BlocBord`. `CouleurA = Cible = OrSombre` et `CouleurB = OrSombre` ⇒ `Melange 1 → 0` parcourt **la même couleur** : amplitude **nulle**, aucune image ne change, et §6.3 (anti-vacuité) mesurerait 0. La cause déclarée (« le numéro perd sa dorure ») décrit un comportement que le code n'a pas. C'est le cas exact que mon mandat demandait de vérifier : « que `CouleurA = Cible` est la couleur d'arrivée posée par le propriétaire » | Deux issues honnêtes : (a) **retirer l'entrée** et consigner que le disque de rang ne change pas à la fermeture (le `Tag`, lui, change bien : `:967` `teinte = fermee ? TagFerme : premiere ? Or : Muet`, donc `demolition.offre-fermee/tag` est juste) ; (b) **déclarer la retouche du contrôleur** — `disque.color = premiere && !fermee ? OrSombre : BlocBord` à `:929` — et alors `CouleurA = Cible` vaut `BlocBord` et l'entrée tient telle quelle. Dans les deux cas, le dire : aujourd'hui le texte affirme une couleur d'arrivée que `:929` ne pose pas |
| **B2-5** | `catalogue-mouvements.md:304` (§I.4), `:390` (§II.0.b) | `bandeau.entree` · « `TranslationY` **−10 u de bandeau → 0** (= 27,6 px, le bandeau est ancré au bord haut, pivot haut, `BandeauEphemere.cs:204-206`) » · cause : « Une annonce **descend** de la barre comme un billet qu'on vous passe par-dessus le comptoir : **elle arrive** » | `Shell/BandeauEphemere.cs:204-206` relu : `rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 1f);` · `rt.pivot = new Vector2(0.5f, 1f);` · `rt.anchoredPosition = new Vector2(0f, -HautCss);` avec `HautCss = 78f` (`:168`, « `top:78px` se lit depuis le haut de la barre », `:156`). Le bandeau pend donc du bord **haut**. « Descendre » veut dire partir d'une ordonnée **supérieure** à son repos : en repère Unity (+Y vers le haut), l'offset de départ est **+10**, et la piste va de +10 à 0. **−10 est exactement la valeur CSS** : un bandeau qui descend s'écrit `translateY(-10px) → 0` en CSS, et `design:33` convertit — « **`TranslationY` Unity = − translateY CSS** (CSS vers le bas) » | « Signe/axe contraire au repère Unity » : écrit tel quel, le bandeau **monte** depuis le bas au lieu de descendre de la barre, et la cause déclarée n'est pas celle qui est codée. C'est la même classe que BL-5 de la n°1 (un signe lu dans le paramètre CSS) ; la n°1 ne l'a pas vue parce qu'elle n'a vérifié que **G11** sur cette ligne (`revue-catalogue-n1.md:151-152` : « `bandeau.entree` (`rt.anchoredPosition` posé à la main, `:206` ✔ »). Les deux autres lignes du fichier qui portent une translation verticale, elles, annoncent le repère : `main.distribuee` « **+48 u → 0** (repère Unity : la carte arrive d'au-dessus) » (`:552`) | Écrire **`TranslationY` +10 u → 0**, avec la mention « (repère Unity) » que portent déjà `main.distribuee` (`:552`) et `revue.jeton-rendu` (`:498`). Si f2 veut au contraire que l'annonce **monte**, c'est la cause qu'il faut réécrire — mais les deux ne peuvent pas rester ensemble |
| **B2-6** | `catalogue-mouvements.md:322` (§I.4), `:553` (§II.⑩) | `main.levee` · « `TranslationY` `Additif` **∓34 u → 0** (= 28,8 px ; `Px(8)` = `CssCarteLeve`, `:315`, appliqué `:383`) : **le contrôleur pose la levée d'arrivée, la piste part de l'ancienne** — la carte qui monte part de 34 u plus bas, celle qui retombe de 34 u plus haut » · source : « `PROPOSÉ` · **la levée de repos est dans le code** (`:383`) » | `Operational/Exceptions/ExceptionDetailController.cs` : la levée est passée **par RÔLE**, jamais par sélection — `:380-385` `Carte(…, levee: false, …, translateYCss: 6f)` / `Carte(…, levee: true, …, translateYCss: -CssCarteLeve)` / `Carte(…, levee: false, …, translateYCss: 6f)`, appliquée `:531` `frt.anchoredPosition = new Vector2(0f, -PxD(translateYCss));`. Le paramètre `levee` ne sert **qu'à** la couleur du filet : son unique usage est `:562` `… sombre ? Hex("#ffffff22") : (levee ? Bordeaux : Hex("#93402c66"))` — **il ne déplace rien**. Et `Choisir(a, escalade)` (`:477-482`) pose `selection` puis appelle `Render()` : au rendu suivant les trois cartes reprennent **les mêmes** levées, celles du rôle (`selection` n'est lu qu'à `:358`, `:442-450`, `:461-462`) | §I.1 règle 2 (`:190-192`) : « ses canaux de transformation sont `Additif` et **finissent à 0** — la fin d'une `Transition` est l'état du propriétaire, **que le contrôleur a déjà posé** ». Ici le propriétaire ne change **jamais** la levée : les deux bouts du mouvement sont le même point. Le code écrit d'après cette entrée produit un **aller-retour** — la carte revient exactement où elle était, et « on la sort du rang » ne se voit pas. L'amplitude est fausse en outre, même si le contrôleur était modifié : l'écart entre la place levée (+`Px(8)` = +34,1 u) et la place basse (−`Px(6)` = −25,6 u) vaut **`Px(14)` = 59,7 u = 50,4 px**, et le fichier du contrôleur nomme déjà ce 14 (`:319` `CssDebordEventail = 14f`, « les cartes ♠ et ♣ sont tournées de ±5° **ET descendues de 6 px** ») | Soit **déclarer la retouche** — la levée devient fonction de `selection` et non du rôle — et recaler l'amplitude à `Px(14)` = 59,7 u, soit **retirer l'entrée** et laisser le choix se dire par le filet (`:562`) et le tampon (`:442-450`), ce que le code fait déjà. *Réfutation acceptée d'avance* : si f2 lit la ligne comme une PRESCRIPTION assumée au contrôleur, B2-6 tombe en MAJOR — mais alors il faut retirer « la levée de repos est **dans le code** » de la colonne `source`, et corriger 34 u → 59,7 u |

### 2.2 MAJOR — le code ne serait pas faux, mais le texte trompe le codeur

| id | où | constat (cité) | preuve | pourquoi MAJOR | correction proposée |
|---|---|---|---|---|---|
| **M2-1** | `:243-254` (§I.2.7), `:1154-1156` (§V) | « **Entrées de ce catalogue sous un masque** : `famille.lampe-du-don` … `conflit.envoi/bord` et `/cadre` (`Alpha`). **Aucune ne pose plus de canal de transformation sous un masque** » ; et §V : « **Sous un `RectMask2D`** : **9 `Entree`** sur ⑥, ㉜, ㉝ et ㉙ …, **toutes en `Alpha` ou `Melange`** ; **aucune translation** sous un masque depuis la v2 » | La liste omet deux écrans que §I.2.7 nomme pourtant lui-même deux lignes plus haut. ㉓ : `vue.AddComponent<RectMask2D>()` (`ShopScreenController.cs:406`), `liste`/`Etageres` est enfant de `vue` (`:414`), `etageres = listeRt` (`:437`) ⇒ **`vitrine.acquis/objet` et `/possede` sont sous le masque**, et le premier porte une **`Echelle`**, c'est-à-dire un canal de transformation. ㉞ : `carnet.AddComponent<RectMask2D>()` (`CarnetScreenController.cs:810`), `contenu` enfant de `carnet` (`:812`), `listeRoot = rtc` (`:824`), créneaux enfants de `listeRoot` (`:719`) ⇒ **`carnet.encre` et `carnet.en-main` sont sous le masque**. Soit **≥ 13 `Entree`**, pas 9 | Le plafond de design §4 (« sous un masque, transformations plafonnées à **6 pistes** ») n'est pas franchi par 1 piste, donc **aucun verdict ne change** — d'où MAJOR. Mais le périmètre d'E0 (a)(b)(d) est sous-déclaré de 4 entrées, et la phrase « aucun canal de transformation sous un masque » est précisément celle sur laquelle un codeur s'appuiera pour ne pas mesurer | Recompter la liste de §I.2.7 à **13** (ou plus, cf. M2-2), déclarer `vitrine.acquis/objet` comme la seule transformation sous masque (1 ≤ 6 ✔), et recaler le point de §V |
| **M2-2** | `:315` (§I.4), `:472` (§II.⑥) | `famille.rang-ouvre` · cible « le `CanvasGroup` du détail » · **`Pistes` = 1** · « le **même** `CanvasGroup` : `Transitionner` `Alpha` de 0,00 vers 1,00 (le propriétaire pose 1 en une affectation, **`:1849`, `:1860`**) » | `Operational/Lieutenant/LieutenantScreenController.cs:1841` `private void MajVisibiliteDetail()` **boucle** : `:1844` `foreach (RectTransform sec in sectionsDetail)`, `:1847-1848` `CanvasGroup cg = sec.GetComponent<CanvasGroup>(); if (cg == null) cg = sec.gameObject.AddComponent<CanvasGroup>();`, `:1849` `cg.alpha = ouvert ? 1f : 0f;`. `sectionsDetail` reçoit **7** membres : `:1404`, `:1418`, `:1433`, `:1447`, `:3258`, `:3275`, `:3283`. `OpenLieutenant(id)` (`:637`) appelle `MajVisibiliteDetail()` (`:644`). ⇒ **7 cibles**, donc 7 pistes (`design:78` : « une piste = **une cible animée** »). Et `:1860` n'appartient pas à ce déclencheur : c'est l'alpha de `barreRecrutement`, gouverné par `recrutementDeplie` que pose `BasculerRecrutement()` (`:1827-1831`) | ⑥ passe de 2 à 8 pistes propres et son « G4 résolu » de 6 à **12 sur 16** : la garde reste verte, **aucun verdict ne change** ⇒ MAJOR. Mais la Σ par `Entree` distincte passe de 61 à 67, et le catalogue compte bien 7 pistes pour 7 silhouettes (`:345`) et 6 pour 6 voyants (`:325`) — l'incohérence est locale, pas méthodologique | `Pistes` = **7** pour `famille.rang-ouvre` ; ⑥ à 8 propres / 12 résolu ; Σ par entrée distincte à **67** ; et retirer `:1860` de la ligne (ou en faire une entrée distincte, `famille.recrutement-deplie`, avec son propre déclencheur) |
| **M2-3** | `:916` (§II.㉙), `:122-132` (§0.4), `:590`, `:405`, `:452`, `:836` | `conflit.salle` · colonne `réduit` : « figé à `PoseDeReposS` — **chaque silhouette arrêtée à sa propre place, pas toutes alignées** » ; et §0.4 : « **`Reglage.PhaseS`** est un choix de **mise en scène, pas une garde** », « **`PoseDeReposS`** … est l'instant où **le mouvement** est FIGÉ » | `PoseDeReposS` est un champ de **`MouvementDefini`** (`design:39`), `PhaseS` un champ de **`Reglage`**, par instance (`design:40`). Les 7 silhouettes sont **une seule `Entree` attachée 7 fois** (§I.1 règle 1, `:188` : « Plusieurs cibles qui reçoivent le **même** mouvement … les 7 silhouettes de ㉙ — restent **une** `Entree` »). Sous la lecture que §0.4 impose (le gel est sur le mouvement, la phase est de la mise en scène), les 7 gèlent donc **à la même valeur** : α 0,82 et −5 px CSS — exactement « toutes alignées ». Et la lecture inverse (phase incluse dans le gel) détruit trois autres affirmations : `police.dispatch` (phase −0,600 s, `PoseDeReposS` 0,800 s sur 1,600 s) gèlerait à p = 0,125, soit `Melange` ≈ 0,19 et **non « le pic »** (`:325`, `:590`) — c'est-à-dire la fermeture même de BL-6 —, et les quatre entrées en forme `mk-lampe` (phase −0,900 s sur 4,600 s) ne gèleraient plus « au creux » (`:405`, `:452`, `:836`, `:314`) | Le modèle ne peut pas servir les deux lectures, et le fichier en a besoin des deux. Le code n'est pas faux (G3 passe dans les deux lectures sur les 11 entrées, je l'ai calculé) ⇒ MAJOR ; mais la colonne `réduit` de ㉙ promet un rendu que le modèle ne sait pas produire, et G3 lit la valeur entre parenthèses | **Une phrase** en §0.4 : « le gel évalue le mouvement à `PoseDeReposS`, **sans `PhaseS`** » (c'est ce que §0.4 implique déjà). Puis corriger la colonne `réduit` de `conflit.salle` : « figé à `PoseDeReposS` — les 7 à la même pose (α 0,82 ; −5 px CSS) ; la phase ne survit pas au gel », ce qui est vrai et se voit sur une PNG |
| **M2-4** | `:100-112` (§0.3), `:310`/`:432`, `:337`/`:836`, `:306`/`:405`, `:345`/`:916` | « **Plancher adopté, et toute entrée sous ce plancher est écartée** … `Alpha` : **Δ ≥ 0,15** … `Melange` … : **Δ ≥ 0,12** » ; et « Un plancher se calcule sur la valeur **rendue**, pas sur le facteur » (`:108`) | Quatre entrées retenues sont sous ce plancher, et une seule le dit. ① `accueil.descente` : `RowBg => DesignTokens.Current.surfaceRow` (`DashboardController.cs:221`) = **#232a2d = (0,137 ; 0,165 ; 0,176)** (`Theme/DesignTokens.cs:53`), couleur pleine sans sprite (`:754` `row.AddComponent<Image>().color = RowBg;`) ⇒ `Cible × 1,22` = (0,167 ; 0,201 ; 0,215), **Δ rendu max 0,039 (10/255)** contre un plancher de 0,12. ② `service.jeton` : `RadialDisc(32, Color.white, Color.white)` (`DelegationScreenController.cs:1053`) sous `disque.color = Or` = **#d9ab4e** (`:1054`, `:1674`) ⇒ `× 0,88` donne **Δ max 0,102**. ③ `comptoir.lampe` : la crête n'est pas 1,00 **rendu** — `FiletHaut` est peint `Voile(Or, 0x88)` (`DecorAuComptoir.cs:124`, helper `:324-328`, alpha dérivé de 0x88/255 ≈ 0,53), et un `CanvasGroup` multiplie ⇒ Δ **rendu** ≈ 0,18 × 0,53 ≈ **0,10**, pas 0,18. ④ `conflit.salle`, canal `Alpha` : silhouettes `#05080d`/`#070a10` (`ConflitScreenController.cs:1338`) sur le ciel `hudGaugeFaceOuter` = **#0a0e16** (`:1329` ; `DesignTokens.cs:259`) ⇒ Δ rendu ≈ **1,6/255**, **sous le seuil G13 de 3/255** | Aucune garde exécutable ne les refuse : G13 ne vise que l'`Ambiance`, et `conflit.salle` passe G13 parce que son `TranslationX` (36 px) franchit **son** seuil. Donc le code n'est pas faux ⇒ MAJOR. Mais §0.3 a servi à **écarter nommément deux candidates** (le liseré de ㉓ « Δteinte invisible sous 25 % d'opacité », la ficelle de ㉘) : appliqué à certaines et pas aux autres, le plancher n'est plus une règle, et le codeur ne sait pas laquelle vaut. ③ est précisément ce que MA-15 de la n°1 demandait, et la v2 ne l'a appliqué qu'à `comptoir.bouteilles` (« rendu 0,66 → 0,80 → 0,66 » ✔) | Donner la valeur **rendue** pour les quatre, comme `famille.lampe-du-don` l'a reçue (`:471` : « ⚠️ **Δ rendu faible, à MESURER** : 0,18 × 0,14 ≈ 0,025 au centre … sous 3/255 l'entrée est **retirée** ») — c'est le modèle à suivre, et il est dans le fichier. Et dire explicitement que le canal `Alpha` de `conflit.salle` est sous le seuil (le mouvement tient à sa translation), sinon la planche E4 le découvrira |
| **M2-5** | `:327` (§I.4), `:609` (§II.⑰) | `commissariat.crans` · « le cran qui vient de s'allumer (**101 × 21,6 px**, **`im.color` = la teinte du rang**, `PrecinctScreenController.cs:239`) : … `Melange` **1 → 0** (`CouleurA = Cible`, **`CouleurB = Cible × 1,45`**, borné à 1 par canal) » | `CitySim/Precinct/PrecinctScreenController.cs` : la couleur est écrite **DEUX fois** — `:237` `im.sprite = ProceduralUI.RoundedRectOutline((int)Px(2f), Px(1f), i < rang ? teinte : Eteint);` **et** `:239` `im.color = i < rang ? teinte : Eteint;`. Le rendu est donc `sprite × Image.color` = **teinte²**, et `Melange = 1` rend `teinte × min(1, teinte × 1,45)`. Pour `teinte = Braise = DesignTokens.Current.hudGaugeArcHot` (`:67`, `:224`) = **#e0664a** (`Theme/DesignTokens.cs:261`) = (0,878 ; 0,400 ; 0,290) : le canal **R est écrêté** (0,878 × 1,45 = 1,27 → 1,0) et le Δ rendu max tombe à ≈ **0,107**, contre les ≈ 0,45 × teinte qu'« × 1,45 » laisse attendre | Le canal s'applique et le `Melange` finit bien sur l'état du propriétaire (`Melange 0` = `Cible` ✔, §I.1 règle 2 respectée) ⇒ pas BLOCKING. Mais l'amplitude écrite n'est pas l'amplitude rendue, et §I.1 règle 3 (`:199-201`) ne traite que « blanc + couleur cuite dans le sprite » — pas « couleur cuite **et** recopiée sur `Image.color` », qui est le cas ici et qui divise le contraste par la teinte | Écrire le Δ rendu (ou poser `CouleurB` en couleur **nommée** plutôt qu'en facteur, puisque le code n'a que trois teintes de rang : `Braise`/`Or`/`Creme`, `:224`), et étendre la règle 3 de §I.1 au cas « sprite teinté **sous** un `Image.color` de la même teinte » |
| **M2-6** | `:1218-1221` (§VII.3) vs `:282-287` (§I.3) | « **Ensuite** : E1 écrit le `Catalogue` à partir de **§I.4 (47 `Entree` de ce fichier)** **et de §I.3** (les 8 entrées du chrome du design §9, les **31 `SansHote`** des paires restantes) — **81 lignes G2**, dont **47 câblables** » | **47 + 8 + 31 = 86**, pas 81. §I.3 (`:282-287`) compte juste, mais en **lignes de §II** : « 42 lignes de ce fichier … **+ 39 paires** … = **81 lignes G2**, dont **34** non câblables … **47** sont câblables : **39 de mes lignes et les 8 paires du chrome**. Contrôle : 34 + 47 = 81 » ✔. En unités d'`Entree` — celles que E1 recopie, puisque §VII renvoie à §I.4 — la table fait **47 + 39 = 86** rangs, dont **52 câblables** (47 − 3 `SansHote` = 44, + 8 du chrome) et 34 non câblables ; 52 + 34 = 86 ✔ | C'est le chiffre que §VII donne à `coder` comme **taille de la table G2**, et la coïncidence entre « 47 `Entree` » et « 47 câblables en lignes » masque l'erreur. Aucun verdict de garde ne change ⇒ MAJOR, même classe que MA-10 de la n°1 | Écrire §VII.3 dans l'unité de §I.4 : « **86 rangs G2** = 47 `Entree` + 8 du chrome + 31 `SansHote`, dont **52 câblables** et 34 non », et garder le compte en lignes (81/47/34) là où il est, en §I.3, en disant que l'unité diffère |

### 2.3 mineurs

| id | où | constat | preuve |
|---|---|---|---|
| m2-1 | `:209-214` (§I.2.1) | « **Les cinq `Entree`** dont la cible est un `TMP_Text` » puis `autonomie.reponse` ajoutée à part : cela fait **6**, et **7** avec `retour.appui` (B2-1) | Les cibles `TMP_Text` sont `police.baton`, `autonomie.appel`, `premiere-fois.lecon`, `vitrine.acquis/possede`, `service.cartel/qui`, `autonomie.reponse` — et le `Button` de `DailyReviewScreenController.cs:1101` |
| m2-2 | `:886` (§II.㉞) | Le déclencheur de `carnet.en-main` n'existe pas comme identifiant lisible : « `AppuiLong` sur une ligne (`:463-464` ; `AppuiLong.cs:15-20`) » | `Operational/Carnet/AppuiLong.cs` n'expose **rien** de l'appui en cours : `private float depuis = -1f;` (`:11`), seuls `Action` (`:9`) et `Duree` (`:10`) sont publics. Le pendant de `LongPressButton.IsPressing` (`:20`), que `retour.appui-long` cite à juste titre, n'a pas d'équivalent ici — il faudra l'ajouter, et §I.1 exige « un identifiant **RÉEL** du code » |
| m2-3 | `:259-260` vs `:271`, `:571` | B11 est étiquetée **`ecrans-brennar-6`** alors que l'en-tête de la même table garde « **29 `ecrans-brennar-6`** … + **11 lignes HUD/⑭** » : si B11 est de `ecrans-brennar-6`, le couple devient 30 + 10 | `inventaire-animations.md:44-58` place B11 sous l'en-tête `## B. hud-brennar-canon.html` et `:60` la compte dans les 11 (« 7 transitions : 6 du HUD + l'aiguille de ⑭ ») ; `design:108` reprend « 29 maquette + 11 HUD/⑭ » ; MA-12 de la n°1 prescrivait `Source = hud-brennar-canon: B11`. **Mesuré** : la transition est physiquement dans `ecrans-brennar-6.html` (6 × `transition:transform .7s` sur des `<line>`, cadres **14-19**), et `hud-brennar-canon.html` ne porte que le seul `line#aiguille` de B10 — c'est donc **l'inventaire qui classe mal**, et le total de 40 est juste dans les deux lectures. À corriger là où est la cause, sans toucher le 40 |
| m2-4 | `:570` (§II.⑭) | `semaine.jeton-depense` cite « `:231-239` » pour le jeton ; la méthode `Jeton(bool libre)` tient **`:229-237`** | `CoreLoops/Compression/CompressionScreenController.cs:229` `private void Jeton(bool libre)` … `:236` `le.preferredWidth = …` `:237` `}`. Le fait est exact (`:233-234` : `RadialDisc((int)Px(13f), libre ? Or : Eteint, Hex("#7a5a14"))` — couleur bien cuite dans le sprite ✔), seule la borne haute glisse de 2 lignes |
| m2-5 | `:885` (§II.㉞) | `carnet.encre` cite « `:745-746` » pour « — rien — » ; le texte est créé **`:746-747`** | `Operational/Carnet/CarnetScreenController.cs:744` `if (vide)`, `:745` `{`, `:746-747` `TextMeshProUGUI rien = NouveauTexte(corps.transform, "Rien", Lib("— rien —"), Px(9f), …)`. Le reste de la ligne est exact au numéro : `Corps` `:736` ✔, `Titre`/`Sous` `:756-760` ✔ |
| m2-6 | `:345` (§I.4) | La valeur de gel de `conflit.salle` est donnée en « **−5 px CSS** » dans une table que §I.1 déclare en repère Unity et dont toutes les autres translations sont en u | `design:33` rend `TranslationX` invariant, donc la valeur n'est pas fausse ; elle est seulement dans une autre unité que ses voisines (§II `:916` donne bien « ±21,3 u ») |
| m2-7 | `:590` (§II.⑮) | « `brightness` **1,0 → 1,35 (p = 0,5) → 1,0**, mesuré dans `oracle-css-ecrans-brennar-6.json`, **3 200 ms**, `inventaire-animations.md:33` » — la ligne `:33` ne porte **aucune durée** | `inventaire-animations.md:33` = `| ㉑ Marché | mk-veille | 15 | 5 / 7 | 0 | la veille des voyants allumés | absente … |`. Les 3 200 ms sont réels mais viennent de l'oracle (`mk-veille.durS = 3.2`) et de la mesure (`dur` 3200 sur les 15 instances), tous deux confirmés. Comparer `:34` (`mk-scan`), qui **porte** sa durée : l'omission est propre à `:33` |
| m2-8 | `:880-881` (§II.㉞) | « Défilement : **`RectMask2D` seul** (`:810`), aucun `ScrollRect` » — vrai, mais le `Contenu` porte un **`ContentSizeFitter`** (`:822`) que le texte ne nomme pas | `CarnetScreenController.cs:810` `carnet.AddComponent<RectMask2D>();` ✔ et aucun `ScrollRect` dans le fichier ✔ ; `:822-823` `var fit = contenu.AddComponent<ContentSizeFitter>(); fit.verticalFit = PreferredSize;`, `:824` `listeRoot = rtc;`. C'est la garde G11 pertinente pour toute future `Echelle` sur une ligne du carnet (cf. B2-3) |

---

## 3. L'ajout v4.2 du design (§2 `Melange`, §16) — jugé à part

**Cohérent avec §3 et X3, sauf un trou, celui de B2-2.**

- **Mécanisme (§3)** ✔ : `Cible` est « le RGB de la cible lu à l'attachement, traité comme **la base d'un transform** »
  (`design:36`), et §16 (`:210-213`) referme la boucle exactement comme §3 l'exige — `Rebaser(cible, Melange)` la
  relit, la détection la relit si le propriétaire réécrit, `Detacher` la restitue. La liste d'epsilons de §3
  (`:65`) portait **déjà** `Melange` à 1/512, donc rien à ajouter. `Detacher` (`:67`, « `Melange`/`Hue` →
  `CouleurA` ») reste correct : `CouleurA = Cible` restitue la couleur du propriétaire, ce qui est le point.
- **G12 et règle de remplacement** ✔ inchangées (`:219-221`), et la dette 4 de `dettes-design-mouvement.md`
  (critère `Transitionner` remplacé / `Attacher` refusé) couvre déjà le reste.
- **§5 (i)** ✔ inchangé.
- **X3 (0 allocation par tick)** ✔ : « un `Color` par piste, lu une fois à l'attachement » (`:217`) — `Color`
  est une structure, stockée dans l'enregistrement de piste existant ; rien par `Tick`.
- **Le trou** : §16 ne raisonne que sur « un `Graphic` **blanc** dont la couleur est cuite dans le sprite »
  (`:214-216`) et délègue le reste — « **le catalogue l'interdit pour les autres genres (§I.1 du catalogue,
  règle 3)** ». Il ne dit rien d'une cible **sans `Graphic`** (3 sites) ni d'un `Graphic` à **alpha nul**
  (14 sites), alors que `Melange` « écrit RGB … **sans toucher l'alpha** » (`:36`) : rien n'est rendu. C'est
  B2-2, et la correction peut aussi bien vivre au §16 qu'au catalogue — mais elle doit vivre quelque part.

Le reste du design (v4.1) n'est pas rejugé.

---

## 4. Couverture — ce que j'ai vérifié et trouvé JUSTE (à ne pas refaire)

### 4.1 Les 7 BLOCKING de la n°1 : fermés, les sept, sans en créer un sur le même point

| n°1 | état | ce que j'ai mesuré |
|---|---|---|
| **BL-1** `Teinte` inexistant (12 entrées) | **FERMÉ** | `Teinte` n'apparaît plus comme canal : 3 occurrences du mot, toutes méta (`:3`, `:201`, `:1235`). Les 12 entrées sont en `Melange` ou `Alpha`, chacune avec `CouleurA`/`CouleurB` déclarées en §I.4. *Mais la charge de preuve s'est déplacée sur la cible : B2-2, B2-4, M2-5* |
| **BL-2** `file.part` sous `HorizontalLayoutGroup` | **FERMÉ** | `Alpha` seul, par `Transitionner` 1,00 → 0,28 (`:320`, `:528`), G11 nommée dans la ligne |
| **BL-3** `decision.distribuee` sous `HorizontalLayoutGroup` | **FERMÉ** | Translation retirée, G11 nommée (`:450`). `Rotation` `Additif` +5° → 0 « au-dessus du repos » : le repos est bien **+2° en repère Unity** — `DecisionDetailScreenController.cs:82` `InclinaisonCarteDeg = 2f` appliqué `:311` `carteRoot.localRotation = Quaternion.Euler(0f, 0f, InclinaisonCarteDeg);`, et le commentaire `:79-81` l'épingle : « `+` = sens trigonométrique …, **la convention d'Unity** » |
| **BL-4** `demolition.fiche-sortie` sous `VerticalLayoutGroup` + `ContentSizeFitter` | **FERMÉ** | `Alpha` seul, les deux composants nommés (`:863` cite `:1202` et `:1210`) |
| **BL-5** angles de ⑩ en repère CSS | **FERMÉ** | `ExceptionDetailController.cs:380-385` passe `rotationCss` −5 / 0 / +5, `:532` applique `frt.localRotation = Quaternion.Euler(0f, 0f, -rotationCss);` ⇒ repos Unity **+5° / 0° / −5°**, ce qu'écrit maintenant `:552`. *Mais la seconde entrée de ⑩ est tombée : B2-6* |
| **BL-6** `police.dispatch`, forme `mk-veille` inversée | **FERMÉ** | `oracle-css-ecrans-brennar-6.json`, clé `mk-veille` : `durS` **3.2**, `brightness` **1 → 1,35 à p = 0,5 → 1** (montée monotone sur les 17 points, maximum global à la mi-période), opacité constante 0,54. La forme écrite (`Melange` 0 → 1 → 0, pic à mi-période, `PoseDeReposS = 0,800` sur 1,600) a **le même ordre d'extrema et le même signe de dérivée** ⇒ X7 satisfait. *Sous réserve de M2-3 (la phase)* |
| **BL-7** six `PoseDeReposS` sur l'identité (G3) | **FERMÉ** | Les **11** `Ambiance`/`Alerte` recalculées une par une : `comptoir.lampe` 0,82 · `comptoir.bouteilles` 0,83 · `famille.lampe-du-don` 0,82 · `vitrine.reflet` 33,6 % de course · `distribution.photo` +2,5° · `conflit.salle` 0,82 **et** −5 px · `accueil.descente` `Melange` 1 · `decision.jeton` `Melange` 1 · `police.dispatch` `Melange` 1 · `autonomie.appel` α 0,62 · `service.jeton` `Melange` 1. Les onze donnent, **sur chaque canal**, une valeur ≠ repos (repos = `design:67` : α 1, facteur 1, `Melange` 0, `Eclat` 0, déplacement 0) ⇒ **G3 passe** |

### 4.2 §I.4 contre §II, et les contrôles de §I.4 — justes

J'ai relu les **47 lignes** de §I.4 contre la ligne de §II correspondante, colonne par colonne (cible,
canaux et modes, `Iteration`/durée/période, `PoseDeReposS`, `CouleurA`→`CouleurB`, `Hote`, `Pistes`).
**Un seul écart** : les `Pistes` de `famille.rang-ouvre` (M2-2). Les contrôles de `:349-353` sont exacts,
recomptés à la main :

- **47 `Entree`** = 42 lignes de §II + 5 lignes à deux cibles ✔ (les 5 nommées sont bien les seules :
  `revue.jeton-rendu`, `vitrine.acquis`, `service.cartel`, `demolition.offre-fermee`, `conflit.envoi`) ;
  et §I.4 porte bien 47 rangs (`:301`-`:347`) ;
- **Σ `Pistes` par `Entree` distincte = 61** ✔ (43 rangs à 1 + 3 `main.distribuee` + 2 `main.levee` +
  6 `police.dispatch` + 7 `conflit.salle`) ;
- **genres 5 `Alerte` / 6 `Ambiance` / 3 `Retour` / 33 `Transition` = 47** ✔ (comptés nominativement sur
  les 47 rangs) ;
- **3 `SansHote`** ✔ (`semaine.aiguille`, `vitrine.reflet`, `distribution.photo`) ;
- `Bloquante = false` sur les 47 ✔, `Fonctionnelle = true` sur la seule `retour.appui-long` ✔.

### 4.3 §V — les trois sommes de contrôle, recomptées de zéro : justes

| | mon compte | §V | |
|---|---:|---:|:--:|
| lignes par attachement | **46** | 46 | ✔ |
| pistes par attachement | **65** | 65 | ✔ |
| genres par attachement | **5 / 9 / 3 / 29** | 5 / 9 / 3 / 29 | ✔ |
| lignes distinctes | **42** | 42 | ✔ |
| pistes par ligne distincte | **61** | 61 | ✔ |
| genres par ligne distincte | **5 / 6 / 3 / 28** | 5 / 6 / 3 / 28 | ✔ |
| écarts | **+4 / +4 / Ambiance +3, Transition +1** | idem | ✔ |

Les 21 lignes d'écran et la ligne `*` sont justes une par une (⑨ 4/4, ⑩ 3/6, ⑮ 2/7, ⑯ 4/5, ㉓ 2/3, ㉜ 2/3,
㉝ 2/3, ㉙ 2/9, `*` 5/5…), et la colonne **« G4 résolu »** — l'ajout demandé par MA-17 — est arithmétiquement
exacte sur les 21 lignes, avec le bon majorant des transverses (`retour.appui-long` sur ④⑤⑯ seulement,
`retour.appui` partout sauf ㉒ qui n'a 0 `Button`, bandeau à 2). **Pire écran ㉙ à 13/16** ✔ ·
**pire cas simultané 17/48** ✔ (㉙ 13 + les 4 `Alerte` du chrome de `design:118`-`:120`). Avec M2-2, ⑥ passe
à 12/16 : **aucun verdict de plafond ne change**, et c'est pourquoi M2-2 n'est pas BLOCKING. `G4 résolu`
corrige bien la méthode que MA-17 attaquait.

### 4.4 §I.3 (40 paires) et §0.4 — justes au chiffre

- **Contrôle 2 + 1 + 5 + 1 + 1 + 1 + 1 + 8 + 9 + 6 + 5 = 40** ✔ · câblables **8** (B1-B3, B6-B10) ✔ ·
  non câblables **32** = B4 + B5 + B11 + `hl` + 23 de la fiche (serre 8 + labo 9 + Ash 6) + 5 du marché ✔ ·
  8 + 32 = 40 ✔. Confirmé à la source : `inventaire-animations.md:84` « **paires comptées (A + B) : 40.**
  Présentes 2 · partielles 1 · absentes 37 » et `:85` « A : 29 paires … B : 11 lignes … 29 + 11 = 40 ».
  ⇒ **MA-9 fermée** (la table est bien réécrite sur 40, avec B11 et `mk-eclat`).
- **81 = 42 + 39** ✔ et **34 + 47 = 81** ✔ en unités de lignes (voir M2-6 pour §VII).
- **§0.4 : les quatre nombres sont exacts**, remesurés sur `mesure-ecrans-brennar-6.json` :
  **529** instances · **29** noms distincts · **3** noms à délai négatif (`mk-scan` ×6 à −2 600 ;
  `mk-buee` ×6 à −2 100/−1 500/−900 ; `mk-eclat` ×4 à −4 200/−3 900/−2 600/−1 300) · **16** instances
  négatives · et les **26** autres paires démarrent toutes à ≥ 0, aucun nom ne mélange les signes. Les
  exemples cités sont justes un par un (`mk-veille` 0/+900 ; `mk-lampe` 0 ; `sf` +20 à +4 970 ; `po`, `pe`,
  `sc` à 0). ⇒ **MA-13 fermée**, et `mk-eclat` est bien cité parmi les phases négatives.
- **§0.5** : `mk-lampe` = **4** instances, `dur` **4 600**, délais tous 0, et l'oracle donne opacité
  **0,82 → 1,00 (p = 0,5) → 0,82**, `durS` **4,6** ⇒ la forme des cinq reprises est exacte en ordre et en
  signe. ⇒ **mi-2 fermée**. `mk-eclat` : **4** instances, `dur` **5 200**, **cadre 146** ⇒ **MA-11 fermée**,
  A1 est bien marquée FAITE.
- `transitions-hud.json` = 6 (5 en feuille + `inline line#aiguille`, qui est B10) · `transitions-brennar-6.json`
  = 6 × `inline line# / transform / .7s`, et ces six sont bien, mesuré dans la maquette, les aiguilles de ⑭
  aux cadres **14-19** ⇒ **MA-12 fermée** (`semaine.aiguille` = B11, `chrome.aiguille.balayage` = B10 ;
  B10 n'est plus réclamée deux fois). Reste m2-3 sur l'étiquette de fichier.

### 4.5 Les gardes, entrée par entrée

- **G3** ✔ sur les 11 (§4.1, BL-7), sous réserve de M2-3.
- **G5** ✔ : les 11 périodes en régime sont 1,100 · 1,600 ×2 · 4,600 ×5 · 7,400 · 11,000 ×2, **toutes
  ≥ 0,667 s**, et le seuil est désormais écrit « au plus 3 extrema par seconde (période ≥ 0,667 s) » aux deux
  endroits (`:232`, `:590`) ⇒ **MA-7 fermée**.
- **G6** → **B2-1**. Les 6 cibles `TMP_Text` déclarées sont bien **toutes en `Alpha` seul** ✔, et les deux
  conteneurs-de-textes sont bien **sans `Graphic`**, donc le `CanvasGroup` ne fond pas un texte seul :
  `ChaineDApproScreenController.cs:492` (`ligne` = `NouveauUI` + `HorizontalLayoutGroup` + `LayoutElement`,
  aucun `Image` ; `Libelle` `:498`, `Valeur` `:504`) ✔ et `CarnetScreenController.cs:736` (`Corps` =
  `NouveauUI` + `VerticalLayoutGroup` + `LayoutElement` ; `Titre`/`Sous` `:756-760`) ✔. La trouvaille (3) de
  §VIII est donc vraie et bien exécutée.
- **G8** ✔ : `Bloquante = false` sur les 47, et les **quatre** dépassements sont nommés avec leur source —
  1 000 (`UiTimingTunables.cs:19`), 700 (maquette), 500 (`AppuiLong.cs:10`, relu), 400
  (`BandeauEphemere.cs:167`, relu : `FonduS = 0.4f`) ⇒ **MA-8 fermée**. `retour.appui` total ≤ 230 ms ✔.
  Aucun canal n'écrit `blocksRaycasts`/`interactable`.
- **G11, translations restantes** ✔ **hiérarchies vérifiées moi-même** : `conflit.salle` — les 7
  `Silhouette_*` sont des enfants ancrés de `SceneHaute`, qui ne porte **qu'un `Image`** et aucun
  `LayoutGroup` ni `ContentSizeFitter` (`ConflitScreenController.cs:1320-1346`, relu en entier) ✔ ;
  `main.distribuee`/`main.levee` — la `Face` est un enfant **étiré** (`anchorMin` 0 / `anchorMax` 1 /
  offsets 0, `:528-530`) d'un `carte` qui n'a qu'un `LayoutElement` (`:523-525`), **aucun `LayoutGroup`** ✔ ;
  `bascule.course` et `bandeau.entree` ✔ (`anchoredPosition` posée à la main). *La moitié `Echelle` de G11,
  elle, n'a jamais été regardée : B2-3.*
- **G12** ✔ **aucun conflit démontrable**, et j'ai fermé le cas que la v2 ouvrait : `LongPressButton`
  (`ShellContracts/LongPressButton.cs:14`) et `AppuiLong` (`Operational/Carnet/AppuiLong.cs:7`) sont de
  simples `MonoBehaviour`, **pas** des `Button` — donc `retour.appui` **ne tombe pas** sur le `Tampon` de
  ⑤/⑨/⑯ ni sur une ligne de carnet, et le `Melange` `Absolu` de `decision.cachet` est seul sur sa cible.
  Les autres cibles de couleur sont soit enfants de leur `Button`, soit voisines d'une zone de toucher
  séparée : `service.jeton` (le `Rond` `:1051` vs la zone `Touche` `:1533`), `demolition.offre-fermee/rang`
  (le `Rang` `:926` vs `RendreCliquable` `:1452-1459`, et `:986` `if (!fermee)` : une offre fermée n'a
  **aucune** zone de toucher), `commissariat.crans` (les `C0..C3` sous un bloc `Crans` non cliquable).
- **G13** ✔ sauf M2-4. `famille.lampe-du-don` est **honnête et doit rester** : `Css(hudMoneyGold, 0.14f,
  FondPlaque)` (`LieutenantScreenController.cs:2379-2380`) rend bien une couleur dont **l'alpha vaut 0,14** —
  `CouleurPourMelangeLineaire` pose `srgb.a = alphaSrgb` (`ShellContracts/ProceduralUI.cs:810-811`) — puis
  `VoileRadial` (`:1008-1032`) la multiplie par un cosinus valant **1 au centre** : le « 0,18 × 0,14 ≈ 0,025,
  ≈ 6/255 au centre » du catalogue est **juste**, et la mention « sous 3/255 l'entrée est retirée » est
  exactement la bonne façon de porter ce trou. ⇒ **MA-16 fermée**.

### 4.6 Ancres de code relues ligne à ligne (toutes exactes sauf m2-2, m2-4, m2-5)

Nouvelles ou modifiées en v2, donc hors de la couverture de la n°1 — relues au numéro :
`DecisionDetailScreenController.cs:82`, `:311`, `:356-363` (`RadialDisc` `#f2d9a0`→`#7a5a14`, **`Image.color`
jamais posé** ⇒ blanc, donc `Cible × 0,88` assombrit bien ✔), `:416-419` (`tf.sprite` = outline `Rouge`,
`tf.color = Hex("#d9cca9")` ⇒ `Cible × 0,75` rend Δ ≈ 0,21 ✔) ;
`ExceptionDetailController.cs:315`, `:380-385`, `:523-532`, `:562`, `:569`, `:777` (**`HauteurDos = 0f` bien
à `:777`** ⇒ mi-5 fermée) ;
`ExceptionQueueController.cs:425`, `:517` (**`apresBloc.SetActive(montre)` bien à `:517`** ⇒ mi-6 fermée),
`:499-501`, `:605` ;
`PrecinctScreenController.cs:224`, `:232-242`, `:239` ;
`InspectionScreenController.cs:308`, `:318` (`gl.color = tendu ? Braise : Creme2`, sprite `DispatcherIcons.Pour`
⇒ `Cible × 1,35` : R écrêté à 1 mais G (+0,140) et B (+0,102) portent la variation, Δ ≈ 26-36/255 ✔ G13) ;
`DelegationScreenController.cs:1004`, `:1051-1054`, `:1133`, `:1528-1535`, `:1674-1675`, `:1692`, `:979-980` ;
`DemolitionScreenController.cs:843`, `:911`, `:926-929`, `:967-972`, `:986`, `:1185-1186`, `:1210`,
`:1452-1459`, `:1528`, `:1549`, `:1552` ;
`ConflitScreenController.cs:709-721` (le liseré `#8a6a22` est bien **cuit dans le sprite** et `filet.color`
n'est jamais posé ⇒ la lumière par l'`Alpha` est le bon choix ✔), `:1219-1220`, `:1235`, `:1322-1346` ;
`LieutenantScreenController.cs:637`, `:644`, `:1331`, `:1841-1860`, `:2266-2293`, `:2366-2384`, `:2731` ;
`DecorAuComptoir.cs:124`, `:135`, `:234-262` (base **α 0,80 par bouteille** à `:261` ✔ — la valeur rendue
0,66 → 0,80 que la v2 écrit est juste, **MA-15 fermée pour cette ligne**), `:324-328` ;
`CarnetScreenController.cs:455-466`, `:461`, `:463-464`, `:616`, `:620`, `:736`, `:756-760`, `:807`, `:810`,
`:822-824` — et le compte « **6 sites de création d'`Image`** (`:461`, `:576`, `:593`, `:638`, `:779`, `:807`) »
est **exact à l'occurrence** (grep : exactement ces six) ;
`CompressionScreenController.cs:194-204`, `:202-203`, `:231-237` ;
`ChaineDApproScreenController.cs:466`, `:490-506`, `:498`, `:504` ;
`ShopScreenController.cs:171-172`, `:195`, `:204`, `:212`, `:223-228`, `:321`, `:327`, `:334`, `:369-370`,
`:406`, `:409`, `:434-437` ;
`BandeauEphemere.cs:157-158`, `:166`, `:167`, `:204-206`, `:251-253`, `:261-275`, `:269`, `:286-291`, `:296-299` ;
`DashboardController.cs:221`, `:493-494`, `:751-763` ;
`DailyReviewScreenController.cs:366`, `:1096`, `:1101-1104`, `:1289`, `:1304-1306` ;
`Theme/DesignTokens.cs:53` (`surfaceRow` **#232a2d**), `:259` (`hudGaugeFaceOuter` **#0a0e16**), `:261`
(`hudGaugeArcHot` **#e0664a**) ;
`ShellContracts/ProceduralUI.cs:783-812`, `:938-955`, `:1008-1032` ;
`Tools/juge-visuel/INDEX.md:47` (**« 25 contrôleurs distincts »**, liste nominative, et la correction
manuscrite du 2026-10-07 y est bien ⇒ **mi-3 et mi-4 fermées**).

### 4.7 Les autres MAJOR et mineurs de la n°1 : fermés

**MA-1** I.1 recalée sur `design:39-41` (`MouvementDefini`, `Iteration`, `Alterne`, `Genre`) et `réduit` dit
**dérivé, non stocké** ✔ · **MA-2** §I.4 existe, une ligne par `Entree`, avec `Bloquante`/`Hote`/
`Fonctionnelle`/`CouleurA`-`CouleurB`/`Iteration`/`Alterne`/`PoseDeReposS` ✔ · **MA-3** Q1-Q4 marquées
RÉSOLUES, l'encadré de II.0 réécrit, §VII réécrit, et la chaîne « `Entree.Ecran` est un `string` singulier »
a disparu (grep : 0) ✔ · **MA-4** `distribution.ficelle-tendue` câblable, `Parametre` canal 0, `Transitionner`
✔ · **MA-5** les 5 `Alerte` sont **figées à `PoseDeReposS`** et la citation inventée a disparu (grep
« pulsation » : **0**) ✔ · **MA-6** `carnet.en-main` figé à `PoseDeReposS = 0`, avec la cible déplacée sur
une `Marque` enfant — la raison donnée (« un `CanvasGroup` posé sur la ligne ferait fondre ses textes ») est
**vraie** : `:461` pose le fond sur la ligne elle-même, dont les textes sont des enfants ✔ · **MA-10** les
sommes de §I.3 bouclent (voir M2-6 pour §VII) ✔ · **MA-14** l'exception R2.2 de ㉔ est consignée en §I.2.2,
avec son ancre `AutonomyInboxController.cs:285` ✔ · **MA-17** colonne « G4 résolu » ✔ · **mi-1** les 13
renvois sont recalés sur la numérotation de v4.2 (0 « G1-G9 », 0 « design v3 », 0 « §8 du design » ; les
« design §2/§3/§4/§5/§7/§8/§9/§11 » que j'ai échantillonnés pointent tous la bonne section) ✔ ·
**mi-7/mi-8/mi-9/mi-12** ✔ · **mi-10** l'affirmation 21/22 est désormais déclarée non mesurée (`:52` :
« compte par fichier non joint : affirmation non porteuse pour le code ») — c'est la bonne façon de garder
une statistique qu'on ne peut pas rejouer ✔.

Les **4 « trouvées en corrigeant »** de `:1261-1268` sont réelles et correctement exécutées, les quatre :
(1) les 5 lignes à deux cibles sont bien scindées en `ligne/cible` ; (2) `autonomie.reponse` n'anime plus
`Option_A`/`Option_B` (`AutonomyInboxController.cs:316-323`, `:463-469`) et ㉔ passe bien de 3 à 2 pistes en
§V ; (3) les deux conteneurs-de-textes (§4.5, G6) ; (4) `file.part` et `famille.rang-ouvre` sont bien en
`Transitionner(de, vers)`.

### 4.8 Vocabulaire, ère, monnaie, et les trous à garder

Balayage refait : **aucun objet 1930-1990** ; le vocabulaire est celui de 2000-2010 (lampe de bureau, console
de répartition à voyants LED, pager, plastique dur, stylo) ; le laiton et l'or du **chrome d'interface**
restent, comme la nuance de f2 le prévoit ; « jeton » n'est jamais une monnaie ; aucun montant exact animé.

**Les trous honnêtement documentés doivent rester, tels quels, avec leur ancre** — ils sont la bonne manière
de porter une dette, et je les salue : les deux `⛔ HÔTE À DESSINER` (A3 la vitre de ㉓, A4 la photo de ㉘),
le `SansHote:⑭ cadran absent` de `semaine.aiguille` avec son renvoi à E4, le « Δ rendu ≈ 6/255 au centre, à
MESURER à la planche E4, retiré sous 3/255 » de `famille.lampe-du-don` (`:471`), les refus argumentés de ㉒,
㉛, ㉚ et ⑰, le refus du rébus de ㉙ (`:900-905`), la contradiction canon flip/slide-out de ⑯ (`:498`), le
chemin mort de ⑨ relevé au passage (`:530-532` : `headerText`/`rowsArea` jamais assignés et déréférencés
`:1038-1039`), et l'aveu que le solde de ㉓ est un nombre que la fiction refuse (`:678-679`). Aucun de ces
dix n'est un finding, et aucun ne doit disparaître pour faire propre.

### 4.9 Non rejugé, et non vérifié

**Non rejugé, par consigne** : tout `design-couche-mouvement.md` v4.1 (seules la phrase « v4.2 » de §2 et le
§16 sont jugés, §3) ; les 10 mineurs de `dettes-design-mouvement.md` ; les 12 questions Q1-Q12, résolues.
**Non vérifié** : les géométries de l'atelier (`generateur-marche.py`, hors dépôt) ; les 21/22 écrans canon
de mi-10 (le catalogue déclare lui-même la mesure absente) ; l'`Aisance` de B10/B11, sans oracle (dette 6 du
design) ; le coût réel sous masque, qui est l'objet d'E0 et non d'une revue de texte.
