# Revue ⊥ n°3 — `/home/erutheone/project/mafia-unity-anim/Tools/conformite-anim-2026-10-07/catalogue-mouvements.md` v3 (1 319 l.) + `design-couche-mouvement.md` §16/§17

# Verdict : **NON APPROUVÉ**

**8 BLOCKING · 6 MAJOR · 9 mineurs.** Les 10 mineurs de `dettes-design-mouvement.md` ne sont pas recomptés. Le design v4.1 n'est pas rejugé.

Comptes du fichier **recomptés de zéro et justes** : 46 `Entree` · Σ pistes 65 / 69 · genres 5/6/4/31 (`Entree`) et 5/6/4/27 (lignes) · §V 46/69 et 42/65, écarts +4/+4 · 81 lignes G2 / 85 rangs / 51 câblables. **Un seul compte de pistes est faux** (M3-1, sans faire basculer de verdict G4). Le compte « 18 des 67 » de §17 est faux (B3-2 : 13).

---

## 1. BLOCKING

### B3-1 — La règle de cible de §17 ne décide pas « une cible qui rend » : trois façons de ne rien peindre lui échappent, les trois présentes dans le dépôt

**Où** : `design-couche-mouvement.md:235-237` (§17 (1)(2)), `:244-246` (G9) ; `catalogue-mouvements.md:401` (§II.0.a).

**Constat** : le critère est « pas un `TMP_Text` » + « `color.a ≥ 0,1` » + « couvre au moins la moitié du rect ». Aucun de ces trois tests ne voit qu'un `Graphic` ne peint rien. Mesuré sur les 67 `Button`, trois mécanismes distincts :

**(a) un `Mask` à `showMaskGraphic = false` sur le même GameObject que l'Image retenue** — sa couleur n'est jamais écrite dans le tampon de couleur, elle ne sert que de stencil :
- `Assets/Scripts/Operational/Exceptions/ExceptionDetailController.cs:570` `choix.targetGraphic = fondCarte;` avec `:537` `fondCarte.color = Color.white;` et `:538` `face.AddComponent<Mask>().showMaskGraphic = false;` (même GO `face`). ⇒ cas (1) retenu sur un stencil invisible ; la surface peinte est l'enfant `Verre` (`:540-548`).
- `Assets/Scripts/CityMap/DistrictInteriorScreenController.cs:2312` `b.targetGraphic = fond;` avec `:2258` `fond.color = Color.white;` et `:2260-2261` `var masque = go.AddComponent<Mask>(); masque.showMaskGraphic = false;`. Le fichier le dit lui-même à `:2251` : « Le graphique du masque n'est pas affiché (`showMaskGraphic = false`) : il découpe, **il ne peint pas**. »
- `Assets/Scripts/Shell/LaSuitePanelController.cs:223` `b.targetGraphic = im;` avec `:211` `geste.AddComponent<Mask>().showMaskGraphic = false;` (premier geste seulement ; le peint passe dans l'enfant `Degrade` `:212-219`).

**(b) `Graphic.enabled == false`** — `DistrictInteriorScreenController.cs:691` : cas (1) écarté (`zone` à alpha 0, `:689`), cas (2) retient `BuildingSprite`, étiré exactement sur la cellule (`:1068`), couleur blanche — mais `:1064` `spriteImg.enabled = !FondPorteDejaLesBatiments;` avec `:1584` `private const bool FondPorteDejaLesBatiments = true;` ⇒ **désactivé**.

**(c) `gameObject.activeSelf == false`** — `CityMapController.cs:894` : cas (2) retient `SolMien`, que `Assets/Scripts/CityMap/DistrictCellView.cs:114` éteint à la construction : `if (SolMien != null) SolMien.gameObject.SetActive(false);`.

**Pourquoi BLOCKING** : « BLOCKING si la règle de cible ne peut pas être appliquée telle qu'écrite par du code (critère non calculable, **cas non couvert**) ». Le code écrit d'après §17 pose un `Melange` sur cinq cibles qui ne peignent rien. Et **G9 dans sa forme v4.3 passe** : son contrôle négatif ne teste que « un cas 1/2 vise un `Graphic` d'alpha < 0,1 » — aucun des cinq sites n'a un alpha < 0,1. La garde est satisfaite alors que le retour d'appui est invisible. C'est le trou de B2-2 de la n°2, déplacé, pas fermé — la n°2 avait même nommé le masque de `:538` dans sa preuve.

**Correction proposée** : ajouter au critère de (1) et (2) « et qui REND » = `graphic.enabled` **et** `graphic.gameObject.activeInHierarchy` **et** pas de `Mask` à `showMaskGraphic = false` sur le même GameObject (16 occurrences de `showMaskGraphic` dans le dépôt, 3 pertinentes). Étendre le contrôle négatif de G9 à ces trois cas, nommément.

---

### B3-2 — « 18 des 67 » est faux : la règle de §17 en donne 13, et aucun des 3 sites dits « sans aucun `Graphic` » ne tombe en cas (3)

**Où** : `catalogue-mouvements.md:402` (§II.0.a), `:326` (§I.4), `:218-222` (§I.2.1) ; `design-couche-mouvement.md:226-232`.

**Constat** : les 67 sites classés un par un **par la règle telle qu'écrite** donnent **51 cas (1) · 3 cas (2) · 13 cas (3)**. Les trois sites que le texte annonce « sans aucun `Graphic` » ne sont pas en cas (3) :
- `ExceptionDetailController.cs:569` ⇒ **cas (1)** : `targetGraphic` est assigné explicitement (`:570`), alpha 1 (cf. B3-1a).
- `Shell/BandeauEphemere.cs:251` ⇒ **cas (1)** : `:252` `bouton.targetGraphic = fond;` où `fond` est l'`Image` de l'enfant `"Fond"` (`:212`), à `:217-219` `verre.a = AlphaFond` et `:171` `private const float AlphaFond = 0xee / 255f;` = **0,933**. Elle rend.
- `Operational/Lieutenant/LieutenantScreenController.cs:2731` ⇒ **cas (2) sur l'OMBRE PORTÉE**. `rang` ne porte aucun `Graphic` (`:2280` « Il ne peint rien »), donc `Selectable.Awake()` (`GetComponent<Graphic>()`) laisse `targetGraphic` nul. Le premier `Graphic` enfant non texte couvrant ≥ la moitié du rect est `Ombre` : créé en PREMIER (`:2288` `if (ombre) BuildOmbrePortee(go.transform);`, avec `ombre: true` posé à `:2554`), à `:1939`, dilaté **au-delà** du rect (`:1956-1958` `flou = FXf(12f)`, offsets ±flou), `Image` à `:1959` sans couleur écrite (blanc, a = 1). La plaque du rang, elle, est `Panneau` (`:2293`) — et c'est le masque invisible (`:2298-2299`). ⇒ le retour d'appui teinte le flou autour de la carte.

La population réelle des 13 cas (3) : `Demolition:1459`, `Settings:256`, `ExceptionQueueController:605`, `Delegation:1533`, `Tutorial:365`, `DistrictInterior:2128`, `ExceptionQueuePanel:249` et `:314`, `Carnet:595`, `AppShell:2349`, `DailyReview:1101`, `HighestLeverageCard:342`, `TopBar:940`.

**Pourquoi BLOCKING** : « incohérence §I.4 ↔ §II » et mesure fausse sous une affirmation de mesure. Le chapeau v3 (`:3`) annonce « Les cibles des `Melange` sont désormais **MESURÉES** » ; la mesure portée est celle de l'HÔTE (celle de la n°2), alors que la règle §17 lit le `targetGraphic`. Les deux ne coïncident pas, et c'est le compte qui fonde §I.4 (`retour.appui-voile`), §I.2.1 (« le seul `Button` posé sur un texte ») et la ligne « 18 des 67 ».

**Correction proposée** : recompter par la règle (1)/(2)/(3) corrigée de B3-1 et écrire le compte obtenu, site par site, comme la n°2 l'a fait pour les 67.

---

### B3-3 — Le voile du cas (3) n'assombrit rien quand le `Button` est une zone de clic transparente dédiée

**Où** : `design-couche-mouvement.md:239-242` (§17 (3)) ; `catalogue-mouvements.md:402` (« tout ce qu'il porte s'assombrit d'un cran »).

**Constat** : le voile est un `Alpha Multiplicatif 1 → 0,80` sur un `CanvasGroup` « posé **sur le `Button` lui-même** ». Trois sites posent le `Button` sur un calque dédié, étiré, `ignoreLayout`, **dont le seul contenu est une `Image` entièrement transparente** ; le peint est chez le PARENT ou chez les frères :
- `Assets/Scripts/Operational/Delegation/DelegationScreenController.cs:1527-1535` : `GameObject zone = NouveauUI("Touche", go.transform);` · `:1531` `cible.color = new Color(0f, 0f, 0f, 0f);` · `:1533` `Button b = zone.AddComponent<Button>();`. Docstring `:1521-1523` : « La cible de rayon est une image TRANSPARENTE dédiée, jamais le fond peint ». `zone` n'a aucun enfant.
- `Assets/Scripts/Operational/Demolition/DemolitionScreenController.cs:1453-1459` : identique (`:1457` `cible.color = new Color(0f,0f,0f,0f);`).
- `Assets/Scripts/CityMap/DistrictInteriorScreenController.cs:2128` : `zoneTete` à alpha nul (`:2125-2126`) ; le titre et le type peints sont des **frères** dans `corps` (`:2105`, `:2115`).

0,80 × 0 = 0 : rien ne change à l'écran. Or ces deux call-sites servent 8 surfaces interactives (Delegation `:1181`/`:1182` exclusifs, `:1343`, `:1366`, `:1401` ; Demolition `:609`, `:986`, `:1289`, `:1328`) — **les plaques de ㉜ et les blocs de ㉝**, c'est-à-dire exactement la population que §17 dit servir (`design:231-232` « ce sont justement les panneaux pleine largeur que le §8 prive d'échelle » ; `:241-242` « sans lui ces 18 boutons n'auraient plus aucun retour »).

**Pourquoi BLOCKING** : cas non couvert par la règle, et G9 passe (le cas 3 est accepté sans condition de rendu) alors qu'aucun pixel ne bouge — un `Retour` invisible est un `Retour` sans cause.

**Correction proposée** : poser le `CanvasGroup` du voile sur **le plus proche ancêtre qui peint** quand le `Button` est un calque de clic nu (détectable : le `Button` porte un `Graphic` à alpha 0 et aucun enfant `Graphic`), ou exclure nommément ces trois sites. Dans les deux cas, le dire et étendre le contrôle négatif de G9.

---

### B3-4 — `conflit.envoi` : le déclencheur EFFACE le choix ; ni `BordChoisi` ni `CeSoirCadre` n'existe au rendu qui suit

**Où** : `catalogue-mouvements.md:942` (§II ㉙), `:369-370` (§I.4).

**Constat** : le texte dit « `EnvoyerCeSoirEtRecharger` aboutit (`:322`) : la famille choisie reçoit son badge « CE SOIR » (`:788-804`) et son liseré passe en laiton (`:714-721`) ». Le code dit l'inverse. `Assets/Scripts/Operational/Conflit/ConflitScreenController.cs:364` :

```
ChoixFamille = null; ChoixLieutenant = null; ChoixAxe = null;   // l'envoi est parti : on repart de zéro
```

puis `:365` `yield return Charger();` → `AppliquerEtat()` (`:370`) → `RendreTable(...)` (`:378`). Avec `ChoixFamille == null` :
- `:708` `bool choisie = cle == ChoixFamille;` est **faux pour chaque famille** ⇒ `:714` crée l'objet nommé **`"Bord"`** (pas `"BordChoisi"`) avec le sprite `#3d3024` (`:718`), pas `#8a6a22` ;
- `:786` `if (cle == ChoixFamille)` est **faux** ⇒ `:788` **`CeSoirCadre` n'est jamais créé**.

Les deux objets n'apparaissent qu'à `ChoisirFamille` (`:111-116`), le TAP sur la famille, pas l'envoi.

**Pourquoi BLOCKING** : « ancre ou déclencheur faux » et « les cibles existent au rendu qui suit le geste ». Le code écrit d'après cette ligne appellerait `Attacher` sur deux cibles absentes. Elle coûte 2 `Entree` / 2 pistes à ㉙.

**Correction proposée** : recaler le déclencheur sur `ChoisirFamille` (`:111-116`) et réécrire la cause (c'est le CHOIX de la famille, pas l'envoi), ou retirer l'entrée et recompter ㉙ (2 lignes → 1, 9 pistes → 7, G4 résolu 14 → 12, et le pire écran devient ⑥ à 13).

---

### B3-5 — `accueil.carte-suivante` : le Skip ne rend aucune carte suivante — la transition n'a pas de second bout

**Où** : `catalogue-mouvements.md:454` (§II ④), `:334` (§I.4).

**Constat** : déclencheur annoncé « `SkipButton` de la carte à plus fort levier (`HighestLeverageCardController.cs:376-384`), **puis la carte suivante est rendue** » ; cause « On écarte la carte et on en distribue une autre ». Le code : `Assets/Scripts/Shell/HighestLeverageCardController.cs:192-201`

```
public IEnumerator RequestSkip()
{
    EnsureInitialized();
    if (CurrentCard == null) yield break;
    SkipRequestCount++;
    LastSkipError = null;
    yield return client.Skip(token, CurrentCard.card_id,
        dto => LastSkipSkipped = dto.skipped,
        (code, msg) => LastSkipError = $"{code}: {msg}");
}
```

Aucun rechargement, aucun `Render()`, aucun événement. `SkipRequestCount` (`:55`) et `LastSkipSkipped` (`:57`) sont lus **par un seul lecteur dans tout le dépôt** : `Assets/Tests/PlayMode/HighestLeverageCardControllerPlayModeTests.cs:178-182`. Zéro lecteur de production. La carte ne change pas.

**Pourquoi BLOCKING** : exactement la classe de B2-6 de la n°2 (`main.levee`), que la v3 a fermée en retirant la ligne — les deux bouts du mouvement sont le même état, et la colonne `source` invoque le canon (`screen_1:386`) là où le client ne fait pas le swap. ④ perdrait 1 ligne / 1 piste (2→1, G4 résolu 8→7).

**Correction proposée** : soit **déclarer la retouche** du contrôleur (`RequestSkip` recharge et re-rend), et alors la ligne tient — mais retirer « puis la carte suivante est rendue » du présent ; soit retirer l'entrée et recompter ④.

---

### B3-6 — `premiere-fois.lecon` (et la même structure dans `accueil.carte-suivante`) : un fondu croisé écrit comme UNE `Entree` sur UNE cible, à travers un rebuild

**Où** : `catalogue-mouvements.md:754` (§II ㉕), `:454` (§II ④), contre `:187-191` (§I.1 règle 1) et `:1205-1213` (§VI.2.1).

**Constat** : la ligne est « `Alpha` 1,00 → 0,00 en **90 ms** `ease-in`, **puis** 0,00 → 1,00 en **110 ms** `ease-out` », 1 piste, cible « le `Texte` de la leçon ». Or `Assets/Scripts/Onboarding/TutorialScreenController.cs:295` → `MarquerVu` (`:375-381`) → `:380` `yield return Charger(token);` → `Rendre` détruit **tous** les enfants de `corps` (`:227-228`), et le `Texte` de la leçon suivante est un objet **NEUF** (`:290`).

§I.1 règle 1 impose qu'une `Entree` applique tous ses canaux à UNE cible ; §VI.2.1 impose de l'attacher « au rendu **qui suit** ». Les deux ensemble donnent : la piste unique joue `1,00 → 0,00 → 1,00` sur le **nouveau** texte — la leçon suivante paraît, s'efface, reparaît. La moitié sortante n'a plus de cible : l'ancien `Texte` est détruit.

**Pourquoi BLOCKING** : le code écrit d'après cette ligne produit un clignotement, pas un tournage de page. `accueil.carte-suivante` porte la même structure 90 + 110 (en plus de B3-5).

**Correction proposée** : scinder en deux `Entree` (`…/sortie` attachée AU GESTE sur l'objet encore vivant, `…/entree` attachée au rendu suivant), ou garder la seule moitié entrante (0 → 1, 110 ms) et le dire. Et compléter §VI.2.1 : un fondu croisé n'est pas attachable « au rendu qui suit ».

---

### B3-7 — G11, seconde moitié : `revue.cachet` et `file.cachet` portent un `ContentSizeFitter`, et §I.2.9 l'affirme le contraire **par déduction**, pas par mesure

**Où** : `catalogue-mouvements.md:274-276` (§I.2.9).

Citation exacte : « Échelles restantes : `decision.cachet`, `revue.cachet`, `file.cachet`, `semaine.jeton-depense` — **sans `ContentSizeFitter` d'ancêtre selon la revue ⊥ n°2, qui n'a refusé que `vitrine.acquis/objet`** ».

**Constat, mesuré binairement** :
- `revue.cachet` — la cible est `tamponCachet` (`Assets/Scripts/Shell/DailyReviewScreenController.cs:1286`) et le `ContentSizeFitter` est posé **sur elle**, à `:1304-1306` : `ContentSizeFitter ajuste = tamponCachet.AddComponent<ContentSizeFitter>(); ajuste.horizontalFit = …PreferredSize; ajuste.verticalFit = …PreferredSize;` — à l'intérieur même de la plage que la ligne cite (`:1286-1311`).
- `file.cachet` — la cible est `cachet` (`Assets/Scripts/Operational/Exceptions/ExceptionQueueController.cs:477`), `ContentSizeFitter` sur elle à `:499-501`, **et sur un ancêtre réel** : `Cachet` ← `apresBloc` `"Apres"` (`:464`, bâti par `BuildApres(comptoirGo.transform)` `:1162`) ← `comptoirGo` `"Comptoir"` (`:1106`) avec `:1132` `ContentSizeFitter ajuste = comptoirGo.AddComponent<ContentSizeFitter>();`.
- (`decision.cachet` et `semaine.jeton-depense` sont propres : **0** occurrence de `ContentSizeFitter` dans `DecisionDetailScreenController.cs` et dans `CompressionScreenController.cs`.)

**Pourquoi BLOCKING** : « garde G1-G13 non satisfaisable ». G11 (design `:138` « `Echelle` n'est refusée que sous `ContentSizeFitter` », §I.2.9 « « sous » = n'importe quel ancêtre ») refuse ces deux `Echelle` ; le catalogue les déclare conformes. `file.cachet` est violé sous la lecture la plus stricte d'« ancêtre ». Et la clause « **selon la revue ⊥ n°2** » est une déduction déléguée : c'est précisément une affirmation sans mesure, là où la v3 annonce avoir mesuré.

**Correction proposée** : `Alpha` seul sur les deux cachets, **ou** poser l'`Echelle` sur un enfant étiré du cachet (le patron que ⑩ emploie déjà : la `Face` sous la `carte`), **ou** dire explicitement que la garde ne regarde pas un CSF posé sur la cible elle-même — avec l'argument mécanique (un CSF écrit `sizeDelta`, pas `localScale`). Dans tous les cas, mesurer et citer, pas renvoyer à la n°2.

---

### B3-8 — G11 : le prédicat écrit refuse deux entrées que §I.2.9 déclare vérifiées

**Où** : `catalogue-mouvements.md:268-273` (§I.2.9).

**Constat** : §I.2.9 pose le prédicat — « « sous » = **n'importe quel ancêtre** » — puis déclare conformes deux translations en ne regardant que le parent DIRECT (« `bascule.course` (curseur sous `Interrupteur`, **sans layout**) », « `main.distribuee` (la `Face`, enfant étiré d'une carte **sans layout**) »). Hiérarchies réelles :
- `bascule.course` : `Curseur` (`Assets/Scripts/Account/Settings/SettingsScreenController.cs:241-242`) ← `Interrupteur` (`:232-233`, `LayoutElement` `:234` sans `ignoreLayout`) ← `ligne = Bloc(nom, corps, true, Px(8f))` (`:222`) qui fait `go.AddComponent<HorizontalLayoutGroup>()` (`:421`). Idem côté ㉕ : `Assets/Scripts/Onboarding/TutorialScreenController.cs:353-354` ← `:344-345` ← `:330` → HLG `:430`. **Zéro `ignoreLayout` dans ces deux fichiers.**
- `main.distribuee` : `Face` (`Assets/Scripts/Operational/Exceptions/ExceptionDetailController.cs:527`) ← `carte` (`:523`) ← `main` (`:365`) avec `HorizontalLayoutGroup` (`:366`) ; et `Face` porte en outre son **propre** `VerticalLayoutGroup` (`:590`).

**Pourquoi BLOCKING** : un runner G11 écrit d'après le prédicat énoncé rougit sur 2 entrées / 4 pistes (`bascule.course` ×2 écrans + `main.distribuee` ×3) que le catalogue affirme conformes. Le prédicat et les verdicts ne peuvent pas être vrais ensemble.

**Correction proposée** : resserrer le prédicat de la moitié 1 à « le parent direct, ou le premier ancêtre qui pilote réellement la cible » — c'est la lecture mécaniquement juste (un `LayoutGroup` ne réécrit que la position de ses **enfants directs** ; `ExceptionDetailController.cs:506-510` dit en commentaire que la `Face` a été interposée **pour** échapper au groupe) — et retirer la glose « n'importe quel ancêtre ». Noter alors que `ignoreLayout` sur `Face`/`Curseur` serait inopérant, leur parent direct n'étant pas un groupe. **Ce resserrement ne sauve pas B3-7** : là le CSF est sur la cible elle-même et sur un ancêtre de ligne directe.

---

## 2. MAJOR

**M3-1 — `retour.appui-long` : 5 sites `LongPressButton`, pas 4 ; ⑨ et ⑩ manquent.** `catalogue-mouvements.md:403` et `:327` (« `*` (4 instances : ④ ⑤ ⑯ ×2) »). Mesure : `grep -rn 'AddComponent<LongPressButton>' Assets/Scripts` = `Operational/Exceptions/TamponAuComptoir.cs:102`, `Shell/DecisionDetailScreenController.cs:428`, `Shell/HighestLeverageCardController.cs:371`, `Shell/DailyReviewScreenController.cs:583`, `:1276`. `TamponAuComptoir` est partagé par ⑨ (`ExceptionQueueController.cs:837`) et ⑩ (`ExceptionDetailController.cs:449`) — et le catalogue le sait : `:572` dit de ⑩ « le même `Tampon` que ⑨ (`:449-453`, `surTap: null` — **seul l'appui long agit** ) ». Conséquence : §V ⑨ « 4 + 1 + 2 + 2 = 9 » et ⑩ « 4 + 1 + 2 + 2 = 9 » doivent devenir **10** chacun (`+1` pour `retour.appui-long`), et deux `Ring` `Filled` de plus sont à créer. Aucun verdict G4 ne bascule (≤ 16), d'où MAJOR et non BLOCKING. → Corriger `Ecrans`, les deux lignes de §V, et la liste des hôtes à créer.

**M3-2 — « Sept contrôleurs du périmètre détruisent tous leurs enfants à chaque rendu » : au moins 19 des 21 écrans le font, et la règle ne couvre que les `Transition`.** `catalogue-mouvements.md:1206-1210`. Non nommés, mesurés : ④ `Operational/Dashboard/DashboardController.cs:812-813` (`ClearRows`, appelée en tête de `Render` `:471`) **et `:557-558`** — c'est l'hôte de `accueil.descente` ; ⑥ `LieutenantScreenController.cs:2892` ; ⑨ `ExceptionQueueController.cs:570-571` ; ⑩ `ExceptionDetailController.cs:788-789` ; ⑭ `CompressionScreenController.cs:189-192` ; ⑮ `InspectionScreenController.cs:214-215` ; ⑯ `DailyReviewScreenController.cs:314` ; ⑰ `PrecinctScreenController.cs:178-179` ; ㉘ `DistributionScreenController.cs:1159-1160` ; ㉚ `ChaineDApproScreenController.cs:866-867` ; ㉝ `DemolitionScreenController.cs:1359` ; ㉙ `ConflitScreenController.cs:1447-1448`. La direction est prudente (la règle s'applique plus largement), mais elle est **écrite pour les `Transition` seules** (« Une `Transition` est déclenchée par le GESTE ») : or 4 des 5 `Alerte` et 1 `Ambiance` vivent sur un hôte rebâti à chaque rendu (`accueil.descente`, `police.dispatch`, `autonomie.appel`, `service.jeton`, `famille.lampe-du-don`). Leurs ancres pointent bien dans le chemin de rendu (donc le rattachement par rendu marche), mais §VI.2 ne le dit pas, et §V `:1173-1174` « 11 lignes au plus **en permanence** » décrit une permanence que le code n'a pas. → Ajouter une 4ᵉ règle : une `Ambiance`/`Alerte` dont l'hôte est rebâti se ré-attache **à chaque rendu**, la piste précédente étant libérée par la cible nulle (design §3).

**M3-3 — `vitrine.acquis/objet` fait paraître un objet déjà visible.** `catalogue-mouvements.md:708`. `Assets/Scripts/Economy/Shop/ShopScreenController.cs:223-228` construit l'`Objet` pour **tout** sku ; sa couleur ne dépend que de `argentReel` (`:226`), jamais de `possede`. L'achat rebâtit les étagères (`:171-172`) et le disque reparaît identique : le fondu 0 → 1 ne montre aucun changement d'état. Seul `/possede` (le libellé « ACQUIS », `:240-241`) apparaît réellement. Même classe que `conflit.envoi/bord` (`Alpha 0,35 → 1,00` sur un liseré déjà à 1). → Soit retirer `/objet` (㉓ passe à 2 pistes), soit déclarer que la valeur 0 de départ est une PRESCRIPTION et non un état du code.

**M3-4 — `famille.rang-ouvre` : 3 des 7 cibles sont inactives.** `catalogue-mouvements.md:495` (« les 7 ensemble », `Pistes = 7`). Les sept `sectionsDetail` sont bien aux lignes citées (`:1404`, `:1418`, `:1433`, `:1447`, `:3258`, `:3275`, `:3283`) et chacune reçoit son propre `CanvasGroup` (`:1847-1848`) ✔ — mais `:3257`, `:3274`, `:3282` les posent `SetActive(false)` et elles ne se rallument que sur des conditions séparées (`:3407`, `:3409`, `:3411`). Une piste sur une cible inactive tient un emplacement 30 s d'horloge de régie (design §3) et n'animera rien. Le 7 reste un **majorant prudent** pour G4 : le dire.

**M3-5 — `distribution.ficelle-tendue` : l'amplitude d'arrivée n'a aucune source, et une ancre est fausse.** `catalogue-mouvements.md:776`. `Assets/Scripts/Operational/Distribution/DistributionScreenController.cs:523` passe `amplitude: Px(6f)` en constante ; les seules entrées de `DefinirTrace` (signature réelle `:1361-1363`, 11 paramètres) sont `sinuosity_bucket`, les franchissements et `route_state` (`:519-521`) — rien ne dérive une amplitude de `enTransit` (`:394`) ni de `transit_band` (`:400`). `Px(2)` est inventé. Légitime pour une entrée `PROPOSÉ`, mais la ligne se lit comme si les deux bouts étaient dans le code. Par ailleurs `:1392` contient `float decalage = Mathf.Sin(t·2π) × amplitudeSerpent;`, pas `Px(6)` (qui est à `:523`). → Dire que le second état est prescrit ; corriger l'ancre.

**M3-6 — l'ancre du déclencheur de `revue.cachet` est fausse.** `catalogue-mouvements.md:522` cite « `TamponSigne` / `lotSigne > 0` (`:722`) ». `Assets/Scripts/Shell/DailyReviewScreenController.cs:722` est `lotSigne = confirmees;`, dans `AppliquerLotSigne` (`:719-724`) ; `TamponSigne` est défini à `:751` (`public bool TamponSigne => lotSigne > 0 && tamponCachet != null && tamponCachet.activeSelf;`). Non dit non plus : `:395` `tamponRoot.SetActive(tamponDisponible)` peut éteindre tout le tampon, `Cachet` compris, au rendu suivant.

---

## 3. mineurs

- **m3-1** `comptoir.lampe` (`:428`) : « 0,18 × 0,53 (α 0x88) ≈ 0,096 d'alpha, soit ≈ **9/255** ». Par la conversion que le fichier applique lui-même à ⑥ (`:494`, 0,025 → « ≈ 6/255 »), 0,096 vaut ≈ **24/255**. Sous-estimation de ×2,6 — donc prudente, G13 passe a fortiori — mais les deux lignes doivent employer la même arithmétique.
- **m3-2** `AppuiLong.cs` (cité sans chemin à `:238` et `:911`, et sous-entendu dans `ShellContracts/` par le design §8 et la liste G10) vit en réalité à `Assets/Scripts/Operational/Carnet/AppuiLong.cs` ; la ligne 10 est juste (`public const float Duree = 0.5f;`).
- **m3-3** « `UnmountCurrentTenant` détruit l'ancien locataire **de façon synchrone** » (`:1214-1215`, `:412`) : `Assets/Scripts/Shell/AppShell.cs:1858` et `:1861-1863` appellent `Object.Destroy`, différé en fin d'image (`DestroyImmediate` serait synchrone). La conclusion — pas de fondu de sortie sans retouche du shell — tient.
- **m3-4** §VII.1 (`:1238`) annonce encore « **Revue ⊥ n°2** de cette **v2** » sur une v3 soumise à la n°3.
- **m3-5** §I.2.9 (`:277`) : « Le dépôt porte **55** `ContentSizeFitter` » — 55 est le compte de LIGNES ; les **poses** (`AddComponent<ContentSizeFitter>()`) sont **20**, sur 15 fichiers (26 lignes sont des réglages de `FitMode`, 9 des commentaires, 0 `GetComponent`). À distinguer, comme le fichier distingue déjà les 306 `LayoutGroup` (vérifiés : 188 `VerticalLayoutGroup` + 118 `HorizontalLayoutGroup`, **0 `GridLayoutGroup`** — la branche `GridLayoutGroup` de G11 n'a aucune prise).
- **m3-6** Ancres décalées de quelques lignes : `semaine.jeton-depense` « `:229-239` » (le jeton est `:231-239`, `:229` ferme `Rendre`) ; `carnet.encre` « « — rien — » (`:746-747`) » (c'est `:745-746`) ; `demolition.offre-fermee` « le disque de `Rang` … (`:911` ; `:929`) » (le disque est `:926-930`) ; `autonomie.reponse` « `AddOptionBlock`, `:316-323` » (appels `:328`/`:332`, définition `:336`).
- **m3-7** §I.2.3 (`:236`) « Quatre dépassent 250 ms » ne compte que les one-shots ; les 11 entrées en régime ont des périodes de 1,1 à 11,0 s. Écrire que « durée » désigne un one-shot.
- **m3-8** G8 (design `:135`) nomme « les `Retour` d'APPUI (`retour.appui`) ≤ 250 ms » ; `retour.appui-voile` dure aussi 230 ms et n'est pas nommée. Ajouter l'id.
- **m3-9** §5 (i) v4.3 étend l'exception au « voile `Alpha` » ; `carnet.en-main` est un `Retour` en `Alpha` que §II ㉞ (`:911`) gèle à α 0. Un lecteur peut lui appliquer l'exception. Dire qu'elle est bornée à `retour.appui-voile`.

---

## 4. Couverture — ce que j'ai vérifié et trouvé JUSTE (à ne pas refaire)

**(1) Les 6 BLOCKING de la n°2.** **B2-1 fermé** : `DailyReviewScreenController.cs:1101` pose le `Button` sur `emptyStateText.gameObject` (créé par `Texte(...)` `:1096`) ; `Selectable.Awake()` (`com.unity.ugui` 2.0.0, `Selectable.cs:422-426` : `if (m_TargetGraphic == null) m_TargetGraphic = GetComponent<Graphic>();`) y résout le `TextMeshProUGUI`, que la règle (1) écarte, et le GO n'a aucun enfant ⇒ cas (3), `Alpha` permis par G6 ✔. **B2-3 fermé** pour `vitrine.acquis/objet` (`Alpha` seul ; CSF sur `Etageres` confirmé, `ShopScreenController.cs:434-435`), et les 4 sites `retour.appui` sous CSF nommés par la n°2 sont bien exclus d'`Echelle` par la condition §17 — condition **calculable** (remontée d'ancêtres), CSF vérifiés à `DelegationScreenController.cs:1004`, `DemolitionScreenController.cs:1210`, `CarnetScreenController.cs:822`, `ConflitScreenController.cs:1235` ✔. **B2-4 fermé** (`/rang` retiré ; `DemolitionScreenController.cs:926-930` confirme que le disque suit le rang seul). **B2-5 fermé** (`TranslationY +10 u → 0`, repère Unity écrit). **B2-6 fermé** (`main.levee` retirée, ⑩ à 4 pistes). **B2-2 NON fermé** → B3-1, B3-2, B3-3.

**(2) §17 sur les 67 `Button`.** Les 67 classés un par un, chaque classement adossé à une ligne lue : 51 cas (1), 3 cas (2), 13 cas (3). Les 18 cités par le texte vérifiés nominativement. Les **4 sites `retour.appui` à `Echelle`** de la n°2 : condition G11 correcte et calculable ✔.

**(3) §I.4 contre §II, ligne à ligne (46).** Aucune divergence de cible, canal, mode, durée, `CouleurA`/`CouleurB`, `PoseDeReposS`, `Pistes`. Contrôles : **46** `Entree` (42 lignes + 4 scindées : `revue.jeton-rendu`, `vitrine.acquis`, `service.cartel`, `conflit.envoi`) ✔ · **Σ pistes 65** (42×1 + 7 + 3 + 6 + 7) ✔ · genres **5 / 6 / 4 / 31 = 46** ✔ · 3 `SansHote` ✔. **§V** : les 22 lignes recomptées — 46/69/5/9/4/28 par attachement ✔, 42/65/5/6/4/27 par ligne ✔, écarts **+4/+4**, Ambiance +3 / Transition +1 ✔, chaque « G4 résolu » refait à la main ✔ (sauf ⑨ et ⑩, M3-1), **㉙ 14** et **⑥ 13** ✔, pire cas **14 + 4 = 18/48** ✔. **§I.3** : 2+1+5+1+1+1+1+8+9+6+5 = **40** ✔, confronté à `inventaire-animations.md` (A : 1+8+9+6+5 = 29 ; B : B1-B11 = 11) — **aucune paire sans `Entree` ni `SansHote`** ✔ ; 42+39 = **81** ✔ ; 34+47 = 81 ✔ ; 46+8+31 = **85** ✔ ; 51 câblables (43+8) ✔ ; **81 lignes / 85 rangs / 51** confirmés.

**(4) Gardes.** **G3** : les 11 `Ambiance`/`Alerte` évaluées à `PoseDeReposS` **sans** `PhaseS` donnent toutes une valeur hors repos sur **chaque** canal — 0,82 · 0,83 · `Melange` 1 (×4) · 0,62 · −21,3 u · +382,7 u (= 33,6 % de 11,0 s) · +2,5° ✔. **G5** : la plus rapide est 1,1 s, 2 extrema/période = 1,8/s ≤ 3 ✔. **G6** : les 8 cibles de `Melange` sont des `Image` non texte, vérifiées une par une (`DashboardController.cs:754`, `DecisionDetailScreenController.cs:416` et `:358`, `InspectionScreenController.cs:312`, `PrecinctScreenController.cs:236`, `DelegationScreenController.cs:1052` et `:1130`) ; les 6 cibles `TMP_Text` sont en `Alpha` seul ✔. **G11** : les 11 cibles de translation/échelle remontées parent par parent → `bandeau.entree` ✔ et `conflit.salle` ✔ satisfaites ; `decision.cachet` ✔ et `semaine.jeton-depense` ✔ propres ; les 5 autres → B3-7/B3-8. **G12** : aucun couple (cible, propriété) ne reçoit deux `Absolu`. Le cas limite est le tampon de ⑤ — `LongPressButton` est un `MonoBehaviour` (`ShellContracts/LongPressButton.cs:15`), **pas** un `Button`, donc `retour.appui` ne s'y pose pas ✔ ; le jeton de ⑯ porte `retour.appui` (`Melange`) et `revue.jeton-rendu/jeton` (`Rotation`) : propriétés distinctes ✔.

**(5) Les Δ « rendu » chiffrés.** **5 sur 6 exacts à la mesure** : `accueil.descente` 39/255 = 0,153 (`surfaceRow` = 0,137/0,165/0,176, `DesignTokens.asset:17`, posée `DashboardController.cs:221`/`:754` ; `#4a2a24` = 0,290) ✔ · `decision.jeton` 0,18 × 0,949 = 0,171 (`RadialDisc(Px(40), #f2d9a0, #7a5a14)` `:358-359`, `Image.color` non écrit = blanc) ✔ · `service.jeton` 0,18 × 0,851 = 0,153 (`Or = Hex(0xd9,0xab,0x4e)` `:1674`, sprite blanc `:1053`, `disque.color = Or` `:1054`) ✔ · `commissariat.crans` t − t² : Braise (`hudGaugeArcHot`, `:77`) vert 0,4 − 0,16 = **0,24**, Or (`hudMoneyUnderlineGold`, `:73`) vert 0,671 − 0,450 = **0,22**, Creme (`hudCreme`, `:78`) bleu 0,784 − 0,615 = **0,17** — les trois justes, et `CouleurA = Cible` est bien la couleur posée par le propriétaire (`PrecinctScreenController.cs:239`) ✔ · `famille.lampe-du-don` 0,18 × 0,14 = 0,025 ≈ 6/255 ✔ (α 0,14 à `:2380`). Seul `comptoir.lampe` est incohérent, et dans le sens prudent (m3-1).

**(6) Traitements annoncés en §IX, réellement dans le texte** : B2-1 ✔, B2-3 ✔, B2-4 ✔, B2-5 ✔, B2-6 ✔ ; B2-2 présent en texte (règle de cible + voile) mais **non valide en mesure** (B3-1/B3-2/B3-3). M2-1 à M2-6 ✔ présents ; m2-8 (le CSF de ㉞ `:822`) ✔ nommé.

**(7) Affirmations fortes vérifiées justes** : §0.1 « 0 usage de `fillAmount`/`Image.Type.Filled`/`Animator`/`ParticleSystem` (12 occurrences textuelles, toutes en commentaire) » — **exact**, les 12 lues ✔ · 67 `AddComponent<Button>()` / 34 fichiers ✔ · 15 `Transition.None` ✔ · 52 = 67 − 15 ✔ · `INDEX.md:47` « 25 contrôleurs distincts » ✔ · `UiTimingTunables.cs:18` `AnimMaxBlockMs = 250`, `:19` `DestructiveLongpressMs = 1000` ✔, `AppuiLongDeplacementMs` bien absent (« à créer ») ✔ · §II.0.c ⑩ sans étagère : `ExceptionDetailController.cs:777` `p.HauteurDos = 0f;` + `DecorAuComptoir.cs:135` `dos.gameObject.SetActive(hauteurDos > 0f);` ✔ · `comptoir.lampe` sur `Trait(..., "FiletHaut", Px(2f), Voile(Or, 0x88))` `:124` ✔ · `comptoir.bouteilles` base α 0,80 à `:260`, 7 bouteilles `:247` ✔ · `revue.jeton-rendu` : `:662` `if (verdict.token_returned)`, `:667` `Euler(0,0,12f)`, `:658` `b.Bulle.alpha = 0.72f`, deux bouts distincts ✔ · `famille.rang-ouvre` : **sept** `sectionsDetail` aux sept lignes citées, chacune son `CanvasGroup` ✔ · `conflit.salle` hors masque (`SceneHaute` parenté à `racine.transform` `:1212`, `RectMask2D` sur `Corps` `:1219`) ✔ · §I.2.7 : les 12 `Entree` sous masque recomptées = 12 ✔.

**(8) Le trou honnêtement documenté — à GARDER tel quel, et je le salue.** `comptoir.lampe` (`:428`) et `famille.lampe-du-don` (`:494`) sont sous le plancher §0.3, et le fichier le dit : chiffre à l'appui, « ⚠️ Δ rendu … à MESURER », critère de retrait nommé (« la planche E4 le mesure, et sous 3/255 l'entrée est **retirée** »), règle générale écrite à `:110`. C'est la bonne forme : ne pas supprimer ces entrées, ne pas effacer la mention — exiger seulement la cohérence arithmétique de m3-1 et le commentaire de péremption au moment du code.

**(9) Non rejugé** : le design v4.1 (§1-§15) ; les 10 mineurs de `dettes-design-mouvement.md` ; §16 (`CouleurA = Cible`), déjà jugé cohérent par la n°2 et confirmé ici sur `commissariat.crans`, `service.cartel/cro`, `decision.jeton`, `service.jeton` et `accueil.descente` — dans les cinq cas `Cible` est bien la couleur que le propriétaire pose. **Non vérifié** : la géométrie du manomètre de ⑭ (E4), les durées/formes de l'oracle CSS, et `famille.rang-ouvre` sous le `RectMask2D` de `:1331` (le catalogue le déclare lui-même « non mesuré », à vérifier en E4 — honnête).

---

## Message de verdict

**NON APPROUVÉ — 8 BLOCKING, 6 MAJOR, 9 mineurs.** Comptes du fichier justes (46 `Entree`, Σ 65/69, genres 5/6/4/31, §V 46/69 et 42/65 écarts +4/+4, ㉙ 14 / ⑥ 13, 18/48, 81 lignes / 85 rangs / 51 câblables) ; les 6 BLOCKING de la n°2 sont fermés **sauf B2-2**, dont le traitement §17 rouvre le trou ailleurs.

- **B3-1** — §17 : le critère `color.a ≥ 0,1` ne décide pas « rend » — un `Mask` `showMaskGraphic = false` (`ExceptionDetailController.cs:538`, `DistrictInteriorScreenController.cs:2261`, `LaSuitePanelController.cs:211`), un `Graphic.enabled = false` (`DistrictInteriorScreenController.cs:1064` + `:1584`) et un `gameObject` inactif (`DistrictCellView.cs:114`) passent la règle ET G9.
- **B3-2** — « 18 des 67 » est faux : la règle donne **13** cas (3), et les 3 sites dits « sans aucun `Graphic` » sont en cas (1) (`:570` alpha 1 ; `BandeauEphemere.cs:252` α 0,933) ou en cas (2) **sur l'ombre portée** (`LieutenantScreenController.cs:1939`).
- **B3-3** — le voile du cas (3) n'assombrit rien sur une zone de clic transparente dédiée (`DelegationScreenController.cs:1531`, `DemolitionScreenController.cs:1457`, `DistrictInteriorScreenController.cs:2125`) — 8 surfaces de ㉜ et ㉝, la population même que §17 dit servir.
- **B3-4** — `conflit.envoi` : `ConflitScreenController.cs:364` met `ChoixFamille = null` avant de recharger ⇒ ni `BordChoisi` (`:708`/`:714`) ni `CeSoirCadre` (`:786`/`:788`) n'existe au rendu qui suit ; les deux naissent au TAP (`:111-116`), pas à l'envoi.
- **B3-5** — `accueil.carte-suivante` : `HighestLeverageCardController.cs:192-201` ne recharge ni re-rend rien, et `SkipRequestCount`/`LastSkipSkipped` n'ont qu'un lecteur, un test (`HighestLeverageCardControllerPlayModeTests.cs:178-182`) — la carte suivante n'existe pas.
- **B3-6** — `premiere-fois.lecon` (et la même structure 90+110 dans `accueil.carte-suivante`) : fondu croisé écrit comme **une** `Entree` sur **une** cible alors que `TutorialScreenController.cs:227-228` détruit la cible sortante et `:290` en crée une neuve ⇒ la leçon suivante clignote.
- **B3-7** — G11 : `revue.cachet` porte un `ContentSizeFitter` **sur lui-même** (`DailyReviewScreenController.cs:1304-1306`, dans la plage citée) et `file.cachet` sur lui-même **et sur `Comptoir`** (`ExceptionQueueController.cs:499` + `:1132`) — §I.2.9 les déclare propres « **selon la revue ⊥ n°2** », par déduction.
- **B3-8** — G11 : le prédicat « « sous » = n'importe quel ancêtre » (§I.2.9) refuse `bascule.course` (`SettingsScreenController.cs:222`→`:421`) et `main.distribuee` (`ExceptionDetailController.cs:365-366`), que la même ligne déclare vérifiées sur le parent direct.