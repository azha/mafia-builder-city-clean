# Revue ⊥ n°4 — `Tools/conformite-anim-2026-10-07/catalogue-mouvements.md` v4 (1 368 l.) + `design-couche-mouvement.md` §16 / §17 (v4.4) / G11

# Verdict : **NON APPROUVÉ**

**3 BLOCKING · 5 MAJOR · 8 mineurs.** Les 10 mineurs de `dettes-design-mouvement.md` ne sont pas
recomptés. Le design v4.1 (§1-§15) n'est pas rejugé. §16 (`CouleurA = Cible`) : recontrôlé sur les
8 cibles de `Melange`, cohérent — rien à y reprendre.

**Les 8 BLOCKING de la n°3 sont tous fermés** (vérifiés un par un, §3 ci-dessous). Les 3 BLOCKING de ce
tour sont **tous dans §17** : le prédicat « rend » voit maintenant les trois façons de ne rien peindre,
mais il lit de l'**état mutable** sans dire à quel instant, et le repli du voile **remonte sans borne**.
Un site de plus tombe en cas (3) et le compte « 16 des 67 » est faux.

## 1. Comptes — recomptés de zéro, et JUSTES

| compte annoncé | mesure | verdict |
|---|---|---|
| **41 lignes** de §II | parsing des 41 lignes de tableau entre `:388` et `:951` | ✔ |
| **44 `Entree`** en §I.4 | 44 rangs parsés (`:339`-`:382`), ids tous uniques, 6 ids à `/` sur 3 lignes scindées | ✔ |
| Σ pistes **63** par `Entree` distincte | 40 × 1 + 7 (`famille.rang-ouvre`) + 3 (`main.distribuee`) + 6 (`police.dispatch`) + 7 (`conflit.salle`) = 63 | ✔ |
| Σ pistes **67** par attachement | 61 + 2 (les deux « 1 (par écran) » du comptoir) = 63 par ligne ; + 2 `comptoir.lampe` + 1 `comptoir.bouteilles` + 1 `bascule.course` = 67 | ✔ |
| genres **5 / 6 / 4 / 26** (lignes) | Alerte 5 · Ambiance 6 · Retour 4 · Transition 26 = 41 | ✔ |
| genres **5 / 6 / 4 / 29** (`Entree`) | compté sur §I.4 : 5 / 6 / 4 / 29 = 44 | ✔ |
| §V **45 / 67** par attachement, écart **+4 / +4** | les 21 lignes d'écran refaites à la main : lignes 39 + 6 transverses = 45 ; pistes 61 + 6 = 67 | ✔ |
| **§V recalculé ligne à ligne** | les 21 colonnes « G4 résolu » refaites : ④ 7 · ⑤ 9 · ⑥ 13 · ⑨ **10** · ⑩ **10** · ⑭ 7 · ⑮ 12 · ⑯ 11 · ⑰ 6 · ⑲ 6 · ㉒ 3 · ㉓ 7 · ㉔ 7 · ㉕ 7 · ㉘ 7 · ㉚ 6 · ㉛ 5 · ㉜ 8 · ㉝ 7 · ㉞ 7 · ㉙ **14** | ✔ (M3-1 fermé dans la table ; mais cf. **M4-1**) |
| G4 résolu : **㉙ 14**, **⑥ 13**, pire cas **18/48** | 9 + 1 + 2 + 2 = 14 ; 8 + 1 + 2 + 2 = 13 ; 14 + 4 `Alerte` du chrome = 18 | ✔ |
| **3 `SansHote`** | `semaine.aiguille`, `vitrine.reflet`, `distribution.photo` | ✔ |
| §I.3 : **40 paires** · 8 câblables · 32 non | 2+1+5+1+1+1+1+8+9+6+5 = 40 ; `inventaire-animations.md:85` « 29 + 11 = 40 » | ✔ |
| §I.3 : **80 lignes G2 / 83 rangs / 49 câblables** | 41 + 39 = 80 ; 34 + 46 = 80 ; 44 + 8 + 31 = 83 ; 49 + 34 = 83 | ✔ |
| 67 `Button` / 34 fichiers · 15 `Transition.None` · 52 | `grep AddComponent<Button>()` hors `Mouvements/` = **67** ; `transition = Selectable.Transition.None` = **15** ; 67 − 15 = 52 | ✔ |
| 5 instances de `retour.appui-long` | `TamponAuComptoir.cs:102`, `DecisionDetailScreenController.cs:428`, `HighestLeverageCardController.cs:371`, `DailyReviewScreenController.cs:583`, `:1276` ; `TamponAuComptoir` partagé ⑨ (`ExceptionQueueController.cs:837`) / ⑩ (`ExceptionDetailController.cs:449`) | ✔ |
| §I.2.9 : **20 poses** de CSF / **15** fichiers / **55** lignes · **306** `LayoutGroup` | mesuré : 20 / 15 / 55 ; 188 VLG + 118 HLG = 306 ; `GridLayoutGroup` = 1 occurrence, **en commentaire** (`DistrictInteriorScreenController.cs:708`) | ✔ (m3-5 fermé) |
| §I.2.7 : **11 `Entree`** sous masque | 1 + 1 + 3 + 2 + 2 + 2 = 11 | ✔ |
| §0.4 : **529 animations, 29 paires** | `inventaire-animations.md:39` | ✔ |

**Le seul compte faux du fichier est « 16 des 67 » de §17 (B4-1) ; et deux comptes de prose sont
périmés (M4-1, M4-2).** Tous les comptes de §I.4 et de §V sont justes — la méthode « §V calculé depuis
§I.4 » (§X `:1366`) tient.

---

## 2. Findings

### BLOCKING

#### B4-1 — « **16 des 67** » est faux : `ExceptionQueuePanelController.cs:440` est un **17ᵉ** cas (3), et le `Melange` y serait posé sur une `Image` à alpha 0

**Où** : `catalogue-mouvements.md:411` (la liste nominative des 16), `:410` (la règle), §X `:1351`.

**Constat.** Le site est dans les 48 « `targetGraphic` qui rend » par défaut (il n'est pas dans la liste
des 16). Mesure : son `targetGraphic` est **forcé à alpha 0** sur le chemin de l'Accueil, après sa pose.

**Preuve.** `Assets/Scripts/Shell/ExceptionQueuePanelController.cs:437-441`

```
Image vaImg = viewAllGo.AddComponent<Image>();
vaImg.color = DesignTokens.Current.surfaceRow;
Button vaBtn = viewAllGo.AddComponent<Button>();
vaBtn.targetGraphic = vaImg;
```

puis `PoserEnLigneDeLAccueil()` (`:83`, `LigneDeLAccueil = true` `:86`), **appelé par le shell**
(`Assets/Scripts/Shell/AppShell.cs:1728` `exceptions.PoserEnLigneDeLAccueil();`), à `:98-100` :

```
Image vaImg = viewAllGo.GetComponent<Image>();
Color transparent = vaImg.color; transparent.a = 0f; vaImg.color = transparent;
viewAllLabel.gameObject.SetActive(false);
```

⇒ dans la configuration vivante de ④, `Rend(vaImg)` est **faux** (α 0). Le site est en cas (3), pas en
cas (2). Le compte réel est **3 / 47 / 17**, pas 3 / 48 / 16. Et sa sous-arborescence ne porte que
`viewAllLabel`, un `TMP_Text` **éteint** ⇒ le voile doit remonter (cf. B4-2).

**Pourquoi BLOCKING.** C'est exactement B2-2 / B3-1 — « un `Retour` invisible que G9 laisse passer » — à un
site de plus, sous un compte que le fichier déclare lui-même **déduit** (`:411` : « **Déduit** du
classement bouton par bouton de la revue ⊥ n°3 ») et non mesuré. Le brief de la n°3 n'avait pas à voir ce
site : sa règle v4.3 ne lisait pas l'alpha **après** `PoserEnLigneDeLAccueil`.

**Correction proposée.** Recompter les 67 **dans la configuration où chaque écran vit** (pas à la
construction), site par site, et écrire le compte obtenu — pas le déduire d'un classement fait sous une
autre règle. Classer `:440` en voile, et décider ce qui se passe hors Accueil, où `vaImg` rend.

---

#### B4-2 — Le voile remonte **sans borne** : trois sites nommés n'ont aucun descendant qui rend, et le voile atterrit sur **toute la barre** et sur **toute la carte**

**Où** : `design-couche-mouvement.md:244-246` (§17 (3)) ; `catalogue-mouvements.md:411`.

**Constat.** La règle est « cible du voile = `b` si `b` ou un de ses descendants porte un `Graphic` qui
rend ; **sinon son plus proche ancêtre dont la sous-arborescence en porte un** ». Rien ne borne cette
remontée. Mesuré sur les 16 : au moins **six** sites remontent, pas trois, et deux remontent jusqu'à la
racine d'un écran.

**Preuve.**

1. `Assets/Scripts/Shell/TopBarController.cs:912-913` — `leadingGo = new GameObject("LeadingAction", …);
   leadingGo.transform.SetParent(transform, false);` : **le parent direct est la racine de la barre**.
   `:938-939` `Color leadingFond = DesignTokens.Current.surfaceRow; leadingFond.a = 0f;
   leadingImg.color = leadingFond;` ; `:940-941` le `Button` et `leadingBtn.targetGraphic = leadingImg`.
   Son seul enfant est `leadingText` (`TextMeshProUGUI`, `:943-947`), que `Rend` exclut (`design:235`).
   ⇒ aucun `Graphic` qui rend dans la sous-arborescence ⇒ la cible du voile est **la racine de la barre**.
   Un `CanvasGroup` 1 → 0,80 posé là assombrit le médaillon, le montant, l'aiguille de chaleur et le
   bandeau — et **multiplie** les `CanvasGroup` que le design §9 pose sur `BoitierRing` et `hairline`
   pour le pouls. Toucher la flèche retour ferait clignoter tout le chrome.
2. `Assets/Scripts/CityMap/CityMapController.cs:894-895` — `cellButton.targetGraphic = hit` avec `:748`
   `hit.color = new Color(0f, 0f, 0f, 0f);`. Les **seuls** autres `Graphic` non texte de la cellule :
   - `halo` — `:766` `{ Color hc = halo.color; hc.a = 0f; halo.color = hc; }` (α 0, « inerte, pas supprimé ») ;
   - `badgeBg` (`:856`) sous `HeatBadge`, que `Assets/Scripts/CityMap/DistrictCellView.cs:65`
     **éteint** (`HeatBadge.SetActive(false)`) — appelé `:892`, **avant** le `Button` de `:894` ;
   - `sol` (`SolMien`, `:866`), que `DistrictCellView.cs:114` **éteint** (`:893`, avant le `Button`).
   ⇒ rien ne rend dans la cellule à la pose, et **les 18 cellules sont dans le même état** ⇒ la remontée
   ne s'arrête pas au conteneur des cellules : elle monte jusqu'au fond de carte. Toucher **un** quartier
   assombrit l'écran ③ entier.
3. `Assets/Scripts/Shell/DailyReviewScreenController.cs:1101` — le `Button` est posé sur
   `emptyStateText.gameObject` (un `TMP_Text`) **sans enfant** ⇒ la remontée atteint `plaqueVide`
   (`PlaqueDuMatin`), donc toute la plaque de l'état vide.

Et la ligne `:411` n'énumère que **trois** sites qui remontent — « *une zone de clic nue et transparente,
sans enfant, ne voile rien : `DelegationScreenController.cs:1527-1535`,
`DemolitionScreenController.cs:1453-1459`, `DistrictInteriorScreenController.cs:2125-2128` voilent leur
plaque ou leur `corps`* ». Il y en a au moins **six** : + `TopBarController.cs:940`,
`CityMapController.cs:894`, `DailyReviewScreenController.cs:1101`, et les deux « Trancher » de
`ExceptionQueuePanelController.cs:249` / `:314` (`trancherGo` est un GameObject sans enfant,
`zone.color` à α 0, `:247-251` / `:312-316`), plus `:440` (B4-1).

**Pourquoi BLOCKING.** Le code écrit d'après §17 pose le voile sur un hôte **faux** à deux sites nommés
(la barre entière, la carte entière), et **G9 passe** : son critère est « le cas 3 a une cible dont la
sous-arborescence rend » — ce qui est vrai de la racine de n'importe quel écran. La garde est satisfaite
alors que le retour d'appui n'est plus un retour d'appui.

**Correction proposée.** Borner la remontée (un seul cran ; ou le premier ancêtre qui porte **lui-même**
un `Graphic` qui rend **et** dont le rect ne dépasse pas un facteur nommé de celui du bouton) ; autoriser
explicitement le voile **sur un `TMP_Text`** (c'est un `Alpha`, G6 le permet, et un `CanvasGroup` sur le
texte le fond — cf. M4-4), ce qui résout à lui seul `:1101` et `TopBar:940` ; puis énumérer les sites qui
remontent **avec leur cible mesurée**, comme la n°2 l'a fait pour les 67.

---

#### B4-3 — Le prédicat « rend » lit de l'état **mutable** et le design le fige « une fois, à la pose » sans dire quand cette pose a lieu : la même règle rend deux verdicts opposés selon l'instant

**Où** : `design-couche-mouvement.md:235-236` (le prédicat), `:238` (« choisit, **une fois, à la pose** »),
`:112` (« une piste `Retour` est attachée à `PointerDown` … jamais à `Retour.Poser` ») ;
`catalogue-mouvements.md:410`.

**Constat.** Trois des cinq conjonctions de `Rend` — `g.enabled`, `g.gameObject.activeInHierarchy`,
`g.color.a ≥ 0,1` — sont de l'état que les contrôleurs **réécrivent après la construction**, dans les
deux sens. Le design fixe le choix « une fois, à la pose » mais ne dit ni quand `Retour.Poser` est appelé
(création du `Button` ? premier rendu ? montage ?) ni ce qui arrive quand la réponse change. Mesuré, les
deux sens existent :

- **vrai → faux** : `ExceptionQueuePanelController.cs:438` pose `vaImg.color = surfaceRow` (opaque) puis
  `:99` le passe à α 0 (B4-1). Verdict à la création : cas (2) ; verdict en jeu : cas (3). Un `Melange`
  posé selon le premier est invisible.
- **faux → vrai** : `DistrictCellView.cs:65` et `:114` éteignent `HeatBadge` et `SolMien` **avant** le
  `Button` (`CityMapController.cs:892-894`), et `RenderDecisions` / `PoserPresence` les rallument plus
  tard (`DistrictCellView.cs:128` `SolMien.gameObject.SetActive(Mien)`). Verdict à la création : rien ne
  rend, le voile remonte (B4-2) ; en jeu : la cellule rend, le voile aurait dû rester sur elle.
- même mécanique sur `TopBarController.cs:974` `leadingGo.SetActive(false)` (après le `Button` de `:940`),
  `DailyReviewScreenController.cs:1106` `plaqueVide.SetActive(false)` (après le `Button` de `:1101`), et
  `InspectionScreenController.cs:317` `gl.enabled = sp != null;` — où `enabled` est une donnée serveur.

**Pourquoi BLOCKING.** La règle est **la** chose que §17 devait rendre calculable (« Calculable à la pose,
sans réflexion », `design:236`). Elle ne l'est pas de façon stable : son verdict dépend d'un instant que
le document ne nomme pas, et le brief de ce gate demande que la règle « soit calculable par du code et
couvre les 67 `Button` ». C'est la cause commune de B4-1 et de B4-2 : une seule décision écrite les ferme
tous les trois.

**Correction proposée.** Écrire l'instant et la réaction : soit (a) `Retour.Poser` est appelé au
**`PointerDown`** et le cas est rechoisi à chaque appui — la pose devient idempotente et gratuite (un
`Retour` est transitoire de toute façon, `design:112`) ; soit (b) le choix reste à la construction et le
design nomme les sites où il doit être **re-posé** après un changement d'état, avec le compteur et le
contrôle négatif qui vont avec. Dans les deux cas, G9 doit relever le cas **et l'instant** où il l'a
relevé, sinon sa mesure ne dit rien du jeu.

---

### MAJOR

**M4-1 — §V « Lecture » contredit §I.4 et la table qu'elle introduit, sur les écrans de
`retour.appui-long`.** `catalogue-mouvements.md:1125` : « `retour.appui-long` 1 sur **④ ⑤ ⑯ seulement**
(ses **4** instances mesurées) ». Mais §I.4 `:341` dit « `*` (**5** instances : ④ ⑤ ⑨ ⑩ ⑯) », §II.0.a
`:412` les nomme une par une, et les deux lignes de la table juste en dessous comptent bien le `+1` :
« ⑨ … 4 + 1 + 2 + **1** + 2 = 10 » et « ⑩ … = 10 ». Mesure : 5 `AddComponent<LongPressButton>`, et
`TamponAuComptoir` est partagé par ⑨ et ⑩. §X `:1358` annonce le traitement **fait**. Le texte de lecture
est resté en v3 ; un codeur qui le lit câblera 4 écrans. → corriger `:1125`.

**M4-2 — §0.1 porte des comptes de genre d'une version antérieure, et c'est la thèse du fichier.**
`:36` « **28 des 42 entrées** proposées sont des `Transition` » et `:40` « **Seules 6** sont des
`Ambiance` ». v4 mesurée : 41 lignes / 44 `Entree` ; `Transition` = **26** (lignes) ou **29**
(`Entree`) ; `Ambiance` = 6 dans les deux unités. Ni « 28 » ni « 42 » n'est un compte de cette version,
ni d'ailleurs de la v3 (42 lignes, mais 27 `Transition`). §V `:1172` dit, lui, « 26 des 41 lignes » —
juste. → aligner §0.1 sur §V, en nommant l'unité.

**M4-3 — `file.part` : le bout de départ `de = 1,00` n'est pas une valeur du propriétaire pour deux
attendants sur trois.** `:559`, et `§I.4:358`. `Assets/Scripts/Operational/Exceptions/ExceptionQueueController.cs:610-611` :

```
if (parti) a.AddComponent<CanvasGroup>().alpha = 0.28f;         // `.attendant.parti{opacity:.28}`
else if (!premier) a.AddComponent<CanvasGroup>().alpha = 0.78f;   // `.attendant{opacity:.78}`
```

L'attendant parti est rendu `premier: false` (`:576` `Attendant(trancheeCarte, "Parti", premier: false,
parti: true, buste)`) et, **avant** de partir, il valait **0,78** s'il n'était pas le premier de la file —
ce qui est possible : chaque attendant ouvre SA carte (`:608`), donc n'importe lequel des trois peut être
tranché. La ligne annonce « `Transitionner` `Alpha` **de 1,00 vers 0,28** (la valeur que le code pose,
`:610`) » : 0,28 est mesuré, **1,00 ne l'est pas**, et un `Transitionner` qui impose 1,00 fait sauter la
rangée de 0,78 à 1,00 (Δ 0,22, au-dessus du plancher §0.3) avant de l'effacer. → écrire « de l'alpha du
propriétaire (1,00 si `premier`, 0,78 sinon) », ou déclarer la valeur **prescrite**, comme le fait
`distribution.ficelle-tendue`.

**M4-4 — Le design §17 (3) autorise le voile « sur un texte » et G9 en fait un contrôle négatif nommé,
alors que le prédicat de cible l'interdit ; le catalogue §I.2.1 suit le design, pas le prédicat.**
`design-couche-mouvement.md:246` « sans échelle ; **permis sur un texte (G6)** » et `:256` « bouton posé
sur un `TMP_Text` (**cas 3 sur le texte**) » contre `:244-246` « cible du voile = … dont la
sous-arborescence porte un `Graphic` qui **rend** » et `:235-236` (`Rend` exclut `TMP_Text`). Côté
catalogue, `:219-221` l'affirme comme un fait pour un site nommé : « et `retour.appui-voile` **quand sa
cible de voile est un texte** (le `Button` de `DailyReviewScreenController.cs:1101`, posé sur
`emptyStateText`) ». Les deux ne peuvent pas être vrais ensemble. Mécaniquement, c'est le prédicat qui a
tort : un `CanvasGroup` posé sur un `TMP_Text` **fond bien le texte**, et G6 n'interdit que les canaux
≠ `Alpha`. → scinder : `Rend` pour `Melange` (un `Graphic` **non texte** dont le RGB se voit), et un
prédicat `Peint` pour le voile (tout `Graphic`, texte compris, `enabled`, actif, α ≥ 0,1, hors masque
invisible). Ça ferme aussi la moitié de B4-2.

**M4-5 — §II.0.a appelle « trois boutons » ce qui est trois SITES de création, dont un conditionnel.**
`:410` : « c'est le cas des **trois boutons** dont le `targetGraphic` est un masque qui ne peint pas :
`ExceptionDetailController.cs:570` …, `DistrictInteriorScreenController.cs:2312` …,
`LaSuitePanelController.cs:223` … ». Les 67 sont des **sites** (`AddComponent<Button>()`, 67 occurrences),
pas des boutons d'exécution : `:570` en crée un par carte de la main, `:2312` un par geste de fiche,
`:223` un par geste de « La suite ». Surtout, **`LaSuitePanelController.cs:223` n'est en cas (1) que pour
le PREMIER geste** : `:209-220` ne pose le `Mask` et ne crée `Degrade` que `if (premierGeste)` ; pour les
autres, `:208` `Arrondir(im, RayonGeste, FondGesteSombre)` avec `:302`
`FondGesteSombre => new Color32(20, 26, 36, 255)` ⇒ `im` **rend**, et le site est en cas (2). Un appelant
qui lit la ligne telle quelle passera `Degrade` à des boutons qui n'en ont pas. → écrire la condition
(`premierGeste`), et dire que les trois entrées de cas (1) sont des sites, pas des boutons.

---

### mineurs

- **m4-1** `carnet.encre` (`:918`) cite encore « — rien — » à `(:746-747)` ; mesuré :
  `CarnetScreenController.cs:745-746` (`:745` ouvre le `NouveauTexte`, `:746` le continue, `:747` est le
  commentaire ⛔). §X `:1364` annonce pourtant la correction (« `:745` … mesurés à nouveau »). Les deux
  autres ancres de la ligne sont justes (`Corps` `:736`, `Titre`/`Sous` `:756-760`).
- **m4-2** §I.2.3 (`:236`) restate G8 sans `retour.appui-voile` : « les `Retour` d'appui
  (`retour.appui`) ≤ 250 ms ». Le design G8 (`:135`) le nomme bien ; §X `:1364` annonce le traitement sans
  préciser qu'il n'a touché que le design.
- **m4-3** l'en-tête (`:8`) et « Entrées lues » (`:11`) citent le design en **v4.2** alors que l'objet
  soumis est **v4.4** (§17 réécrit, G11 au prédicat exact) ; `:12` cite « gardes G1-G13 §10 » — juste.
- **m4-4** §II ⑥ (`:503`) cite `:1860` pour l'alpha de `famille.rang-ouvre` ;
  `LieutenantScreenController.cs:1860` est `cg.alpha = recrutementDeplie ? 1f : 0f` — le `CanvasGroup` de
  **`barreRecrutement`**, pas une `sectionDetail`. §IX M2-2 (`:1331`) annonce pourtant « `:1860` retiré ».
  Les sept autres ancres de la ligne sont exactes (vérifiées une par une : `:1404 :1418 :1433 :1447 :3258
  :3275 :3283`, `SetActive(false)` `:3257 :3274 :3282`, rallumage `:3407-3411`, `CanvasGroup`
  `:1847-1848`, alpha `:1849`, `OpenLieutenant` `:637`/`:643`/`:644`, tap `:2733`).
- **m4-5** §II ㉙ (`:944`) appelle le badge « **CE SOIR** » ; le GameObject s'appelle bien `CeSoirCadre`
  (`ConflitScreenController.cs:788`) mais le libellé servi est `conflit.bloc.ce_soir` avec repli
  **« En cours »** (`:800-801`). Le mot à l'écran n'est pas celui de la ligne.
- **m4-6** `conflit.envoi` garde son id alors que son déclencheur est désormais le **choix**. La ligne le
  dit (`:950` « ⚠️ **Pas l'envoi** »), mais §I.4 (`:381-382`) ne porte que `conflit.envoi/bord` et
  `/cadre` : un lecteur de la seule table source lira « envoi ».
- **m4-7** §I.2.9 justifie « 0 `ContentSizeFitter` » pour `decision.cachet` et `semaine.jeton-depense`
  par **le fichier de l'écran**, alors que la moitié « échelle » de G11 regarde « n'importe quel
  ancêtre » — donc aussi la chaîne du shell. La conclusion tient (mesuré ici : les 20 poses de CSF sont
  dans 15 fichiers, et la seule du shell, `AppShell.cs:1374`, est sur le `contenu` du menu « Plus », qui
  n'est pas un ancêtre d'un locataire de `ContentSlot` — `ConstruireLocataire` parente sous `ContentSlot`,
  `AppShell.cs:1120`) ; l'argument, non.
- **m4-8** `DailyReviewScreenController.cs:1101` naît `interactable = false` (`:1103`) sur un `plaqueVide`
  éteint (`:1106`). G9 (« tout `Button` **monté** ») devra dire si un bouton non interactif compte, sinon
  la garde rougira ou blanchira au hasard de l'état.

---

## 3. Couverture — ce que j'ai vérifié, et ce que j'ai trouvé JUSTE

### (1) Les 8 BLOCKING de la n°3 — **tous fermés**, sans régression

- **B3-1 fermé.** Le prédicat « rend » (`design:235-236`, repris mot pour mot `catalogue:410`) couvre les
  trois mécanismes : `enabled`, `activeInHierarchy`, `Mask` à `showMaskGraphic = false`. Les trois sites
  masqués reçoivent une **surface nommée**, et les trois surfaces **rendent**, vérifiées une par une :
  `ExceptionDetailController.cs:540-548` (`Verre`, `verreImg.color` non écrit ⇒ blanc α 1 ; le `Mask` est
  sur `face` `:538`, pas sur `verre` ⇒ `Rend` vrai) ✔ ·
  `DistrictInteriorScreenController.cs:2263-2275` (`Remplissage`, `fondPeint.color = Color.white` dans la
  branche `or`, et `CouleurPourMelangeLineaire(…)` — une couleur **opaque** résolue par canal — dans
  l'autre, `:2281-2283`) ✔ · `LaSuitePanelController.cs:212-219` (`Degrade`, `degrade.color` non écrit ⇒
  blanc α 1) ✔. G9 porte un contrôle négatif **par façon de ne rien peindre** (`design:253-256`) ✔.
  Mesure de contrôle : les **16** `showMaskGraphic` du dépôt relevés ; les 3 pertinents pour un `Button`
  sont bien ceux-là ✔.
- **B3-2 fermé.** Plus aucune recherche automatique d'enfant (`:410` « Jamais de recherche automatique
  parmi les enfants (elle retenait l'ombre portée de ⑥) ») ✔ ; le compte est désormais **déclaré déduit**
  et renvoyé à G9 ✔ ; les 3 ex-cas (2) (`LieutenantScreenController.cs:2731`,
  `DistrictInteriorScreenController.cs:691`, `CityMapController.cs:894`) sont bien passés en voile ✔.
  L'arithmétique interne est cohérente (3 + 48 + 16 = 67) — mais le compte lui-même est faux d'un site
  (**B4-1**).
- **B3-3 fermé en texte, rouvert ailleurs.** Les trois zones de clic nues voilent bien un hôte qui rend :
  `DelegationScreenController.cs:1526-1535` et `DemolitionScreenController.cs:1452-1461`
  (`RendreCliquable` crée `zone` « Touche » sans enfant, `cible.color = new Color(0,0,0,0)` ⇒ remontée sur
  `go`, la plaque, qui porte son `AjouterFond` opaque) ✔ ;
  `DistrictInteriorScreenController.cs:2122-2130` (`zoneTete` α 0, remontée sur `corps`) ✔. Mais la
  remontée n'est pas bornée et trois autres sites y tombent (**B4-2**).
- **B3-4 fermé.** `conflit.envoi` est recalé sur `ChoisirFamille` et les deux cibles **existent** au rendu
  qui suit : `ConflitScreenController.cs:111-116` (`ChoixFamille = cle` `:114`, `AppliquerEtat()` `:115`)
  → `RendreTable` → `:708` `bool choisie = cle == ChoixFamille;` → `:714` `NouveauUI(choisie ?
  "BordChoisi" : "Bord", …)` avec le sprite `#8a6a22` `:717-718` ✔ ; `:786 if (cle == ChoixFamille)` →
  `:788` `NouveauUI("CeSoirCadre", …)` ✔. La mise en garde sur `:364` (`ChoixFamille = null`) est écrite
  dans la ligne ✔, et la cause est réécrite (« On **désigne** la famille pour ce soir ») ✔.
- **B3-5 fermé.** `accueil.carte-suivante` ne figure plus en §II (grep : seules les mentions historiques
  de `:3`, `:1240`, `:1354` subsistent) ✔ ; §0.2 porte la dette client (« **aucune entrée** : le client ne
  fait pas le swap … Dette client ») ✔ ; ④ est à **1 ligne / 1 piste** en §V ✔.
- **B3-6 fermé.** `premiere-fois.lecon` ne garde que la moitié entrante : `Alpha 0,00 → 1,00`, **110 ms**,
  sur le `Texte` **neuf**, et la ligne dit pourquoi (`:762` « La moitié sortante n'est pas animée »). Les
  ancres vérifiées : `TutorialScreenController.cs:227-228` (la boucle `Destroy` de `Rendre`) ✔,
  `:290-292` (le `Texte` neuf) ✔, `:295` (`Bouton("Compris") → MarquerVu(id)`) ✔, `:375`/`:380`
  (`MarquerVu` → `Charger`) ✔, `:114-120` (`PremierEligibleNonVu`) ✔. Règle 5 de §VI.2 écrite ✔.
- **B3-7 fermé, mesuré binairement.** Les deux cachets ont perdu leur `Echelle` et gardé
  `Rotation Additif +6° → 0` + `Alpha` — mécaniquement juste, un CSF écrit `sizeDelta`, pas
  `localRotation`. CSF relus ligne à ligne : `DailyReviewScreenController.cs:1304-1306` **sur le `Cachet`
  lui-même** ✔ (et l'inclinaison de repos `+14°` est bien à `:1293`, dans la plage citée `:1286-1311`) ·
  `ExceptionQueueController.cs:499-501` sur le `Cachet` ✔ **et** `:1132` sur `comptoirGo`, son ancêtre
  réel (`Cachet` `:477` ← `Apres` `:464` ← `BuildApres(comptoirGo.transform)` `:1162` ← `Comptoir`
  `:1106`) ✔. Les deux ancres sont citées dans la ligne, pas déléguées ✔.
- **B3-8 fermé.** Le prédicat exact (§I.2.9 `:268-273` et `design:138`) est mécaniquement juste et ses
  deux verdicts tiennent, remontés à la main :
  `bascule.course` — `Curseur` (`SettingsScreenController.cs:241`) ← `Interrupteur` (`:232`), qui porte un
  `LayoutElement` (`:234`) et une `Image` (`:237`) mais **aucun** `LayoutGroup` ✔ ; le `HorizontalLayoutGroup`
  est sur `ligne` (`:222` → `:421`), le grand-parent, qui pilote `Interrupteur` et non le curseur ✔ ;
  `main.distribuee` — `Face` (`ExceptionDetailController.cs:527`) ← `carte` (`:523`), qui reçoit
  `AddLayoutElement` (`:524-525`) et **aucun** `LayoutGroup` ✔ ; le HLG est sur `main` (`:366`) et le VLG
  de la `Face` (`:590`) pilote ses enfants ✔ ; **0** `ContentSizeFitter` dans tout le fichier ✔. Les
  ancres `:506-510` (le commentaire « un `translateY` posé sur le créneau serait effacé »), `:531`, `:532`
  sont exactes, comptées ligne à ligne ✔.

### (2) §17 sur les 67 `Button`

Les **67 sites** relevés par grep (hors `Mouvements/`) et classés par la règle v4.4. Vérifiés
**nominativement** : les 3 cas (1) (ci-dessus) ; les **16** du voile un par un —
`SettingsScreenController.cs:256-257` (`zone` α 0, sous-arborescence : `Interrupteur`/`Curseur` à `Creme`
⇒ voile sur la ligne ✔) · `TutorialScreenController.cs:365-369` (idem ✔) ·
`CarnetScreenController.cs:595-596` (`AjouterToucher` reprend l'`Image` déjà posée par `:461`, qui vaut
`new Color(0,0,0,0)` dès que `LigneEnMain != index` — la seule branche où `AjouterToucher` est appelée ✔) ·
`AppShell.cs:2349-2350` (`:2336-2338` `invisible.a = 0f` ; sous-arborescence : le rond + le libellé ✔) ·
`ExceptionQueueController.cs:605-606` (`fondA.color = new Color(0,0,0,0)` `:604` ; médaillon/rail/bulle
rendent ✔ — et le `CanvasGroup` préexistant à 0,78 de `:611` se compose, `design:71` « réutilisé s'il y
est déjà ») · `DemolitionScreenController.cs:1459` et `DelegationScreenController.cs:1533` (zones nues ✔) ·
`DistrictInteriorScreenController.cs:2128` et `:691` ✔ · `LieutenantScreenController.cs:2731` (`rang` sans
`Graphic` ⇒ `targetGraphic` nul ; l'`Ombre` du `:1939` rend, donc le voile tient sur le rang — et la règle
ne la **choisit** plus comme cible de `Melange`, ce qui était le défaut de B3-2 ✔) ·
`ExceptionQueuePanel.cs:249` / `:314`, `TopBarController.cs:940`, `DailyReviewScreenController.cs:1101`,
`CityMapController.cs:894` (⇒ **B4-2**).
Et **10 cas (2) pris à la main**, tous confirmés comme rendant : `ShopScreenController.cs:321`
(`bf` à sprite `RoundedRectOutline(Or)`, `color` non écrit ⇒ blanc α 1) · `SettingsScreenController.cs:275`
et `:347` (`RoundedRectOutline`, blanc) · `CompressionScreenController.cs:317` ·
`TutorialScreenController.cs:321` · `ConflitScreenController.cs:726-727` (`fondLigne.color = choisie ?
#2e2114 : #241c14`, opaque) · `AppShell.cs:1433-1434` (`ficheGlassTop` `#0c1320e6`, α 0,902) ·
`BuildingCardController.cs:2423-2424` et `LieutenantScreenController.cs:3970`/`:3991`/`:4124`
(`img.color = surfaceRaised`, opaque) · `LaSuitePanelController.cs:223` hors premier geste
(`FondGesteSombre = Color32(20,26,36,255)`).
**Balayage de contrôle** : toutes les affectations de couleur à alpha ≈ 0 du dépôt relevées par motif
(`.a = 0f`, `new Color(…,0f)`, `Color32(…,<20)`) et croisées avec les 48 `targetGraphic` — **une seule**
touche un `targetGraphic` non classé : `ExceptionQueuePanelController.cs:99` ⇒ **B4-1**. Les deux autres
alphas faibles (`ChaineDApproScreenController.cs:528` α 0,06 ; `BuildingCardController.cs:2404` α 0,035)
ne portent aucun `targetGraphic` ✔. Les deux seuls `Graphic.enabled = …` du dépôt
(`InspectionScreenController.cs:317`, `DistrictInteriorScreenController.cs:1064`) sont tous deux déjà
traités par le fichier ✔.
⇒ compte mesuré : **3 / 47 / 17**, pas 3 / 48 / 16.

### (3) Les lignes CHANGÉES en v4, vérifiées à fond

`retour.appui`, `retour.appui-voile`, `retour.appui-long` (5 sites), `premiere-fois.lecon`,
`revue.cachet`, `file.cachet`, `conflit.envoi`, `vitrine.acquis`, `famille.rang-ouvre`,
`distribution.ficelle-tendue`, `semaine.jeton-depense`, `comptoir.lampe`, `carnet.en-main` : **toutes**
relues à la source, déclencheur, cible, deux bouts, ancres comptées ligne à ligne.
Justes et non reprises ailleurs :
- `vitrine.acquis` — `/objet` retiré, l'`Objet` est bien construit pour tout sku et sa couleur ne dépend
  que de `argentReel` (`ShopScreenController.cs:223-228`) ✔ ; `Possede` à `:240-241`, `possede` à `:195`,
  `Acheter`/`Charger` à `:327`/`:334` ✔ ; ㉓ à 2 pistes ✔.
- `famille.rang-ouvre` — les 7 `sectionsDetail` aux 7 lignes citées, les 3 créées `SetActive(false)`
  (`:3257 :3274 :3282`), rallumées sous condition (`:3407-3411`), le `CanvasGroup` par section
  (`:1847-1848`), l'alpha en une affectation (`:1849`), le déclencheur réel (`OpenLieutenant` `:637` pose
  `LastRecruitedId` `:643` puis appelle `MajVisibiliteDetail` `:644`) ✔ ; « 7 = majorant » écrit ✔
  (une ancre fausse : m4-4).
- `distribution.ficelle-tendue` — `amplitude: Px(6f)` à `:523` ✔, `Mathf.Sin(t·2π) × amplitudeSerpent` à
  `:1392` ✔, signature `DefinirTrace` à `:1361-1363` avec **11** paramètres ✔, `DistributionFicelleGraphic`
  à `:1340` ✔, `:394`/`:399`/`:400` ✔ ; « **le second état est PRESCRIT** » écrit ✔ ; une seule ficelle par
  écran (`if (route != null)`, `:482`) ⇒ `Pistes = 1` cohérent ✔.
- `semaine.jeton-depense` — `Jeton(bool libre)` à `:231-239` ✔ (m3-6 fermé), `Decider` à `:322-335` ✔,
  **0** CSF dans `CompressionScreenController.cs` ✔ ⇒ `Echelle` permise par G11 ✔.
- `comptoir.lampe` — l'arithmétique est corrigée : 0,18 × 0,53 (α 0x88) = 0,096 ⇒ **24/255**, la même
  conversion que ⑥ (0,025 ⇒ 6/255) ✔ (m3-1 fermé). Ancre `DecorAuComptoir.cs:124` exacte ✔ ;
  `comptoir.bouteilles` : `Bouteilles` `:236`, 7 bouteilles `:247`, base α 0,80 `:260`, `dos.SetActive`
  `:135` ✔.
- `carnet.en-main` — `BrancherLigne` `:455-466`, `CouleurEnMain` posée `:461` et déclarée `:620`,
  `AppuiLong` + `Action` `:463-464` ✔ ; `Operational/Carnet/AppuiLong.cs:10` `public const float
  Duree = 0.5f;` ✔ (m3-2 fermé) ; `ShellContracts/LongPressButton.cs:20` `IsPressing` ✔ ; §5 (i) borné au
  voile, et la ligne le dit explicitement (`:919` « l'exception (i) d'un `Retour` est bornée au `Melange`
  et au voile … cet `Alpha`-ci n'en est pas ») ✔ (m3-9 fermé).

### (4) Gardes

- **G3** : les **11** `Ambiance`/`Alerte` évaluées à `PoseDeReposS` **sans** `PhaseS` donnent toutes une
  valeur hors repos sur **chaque** canal : 0,82 · 0,83 · 0,82 · `Melange` 1 (×4) · 0,62 · −21,3 u ·
  +382,7 u (33,6 % de 11,0 s) · +2,5° (3,7 s = la mi-période de 7,4) · `Melange` 1 au pic 0,800 s ✔.
- **G4** : les 21 lignes de §V refaites à la main, max 14 (㉙), 18/48 en pire cas simultané ✔.
- **G5** : la plus rapide est 1,100 s ⇒ 1,82 extremum/s ≤ 3 ✔.
- **G6** : les **8** cibles de `Melange` sont des `Image` non texte, et **les 8 rendent** au sens de §17,
  revérifié : `DashboardController.cs:754` (`#232a2d` opaque) · `DecisionDetailScreenController.cs:358`
  (`RadialDisc`, `color` non écrit ⇒ blanc) et `:416-419` (`tf.color = Hex("#d9cca9")`, opaque) ·
  `InspectionScreenController.cs:312-318` — **vérifié spécialement** parce que `:317` fait
  `gl.enabled = sp != null` : `DispatcherIcons` déclare et l'atelier a livré les **4/4** régimes
  (`DispatcherIcons.cs:4-32`, `RegimesCanoniques`), donc `SURGE`/`BACKLOGGED` ont leur sprite et le glyphe
  est `enabled` quand `tendu` ✔ · `PrecinctScreenController.cs:236-239` (`im.color = teinte`) ·
  `DelegationScreenController.cs:1051-1054` (`disque.color = Or`) et `:1129-1141` (`croImg.color`). Les
  **6** cibles `TMP_Text` sont en `Alpha` seul ✔, et les 2 conteneurs de texte aussi ✔.
- **G8** : aucune entrée `Bloquante` ✔ ; les 4 one-shots > 250 ms nommés et tous non bloquants ✔ ;
  `retour.appui` total 230 ms ✔ (l'omission de `retour.appui-voile` dans la restitution du catalogue :
  m4-2).
- **G11** : les 4 translations restantes et les 2 échelles restantes remontées parent par parent (§3 (1)
  B3-8 ci-dessus) ; `conflit.salle` hors masque ✔ ; `bandeau.entree` ancré à la main ✔ ; `revue.cachet` et
  `file.cachet` ont bien perdu leur `Echelle` ✔ ; `GridLayoutGroup` = 0 pose dans le dépôt, la branche a
  bien disparu du prédicat v4.4 ✔.
- **G12** : aucun couple (cible, propriété) ne reçoit deux `Absolu`. Les cas limites refaits : le jeton de
  ⑯ porte `retour.appui` (`Melange`) et `revue.jeton-rendu/jeton` (`Rotation`) — propriétés distinctes ✔ ;
  le tampon de ⑤ porte un `LongPressButton`, qui est un `MonoBehaviour` et **pas** un `Button`
  (`ShellContracts/LongPressButton.cs:15`), donc `retour.appui` ne s'y pose pas ✔ ; l'attendant de ⑨ porte
  `retour.appui-voile` (`Alpha Multiplicatif`) sur un `CanvasGroup` préexistant à 0,78 — composition
  multiplicative, pas un conflit ✔.

### (5) Les traitements annoncés en §X — présents dans le texte ?

B3-1 ✔ · B3-2 ✔ (mais le compte est faux : B4-1) · B3-3 ✔ (mais la remontée n'est pas bornée : B4-2) ·
B3-4 ✔ · B3-5 ✔ · B3-6 ✔ · B3-7 ✔ · B3-8 ✔ · M3-1 ✔ **en §I.4 et dans la table de §V**, ✗ dans le texte de
lecture de §V (M4-1) · M3-2 ✔ (17 contrôleurs cités, comptés ; règle 4 ajoutée ; « en régime » au lieu de
« en permanence ») · M3-3 ✔ · M3-4 ✔ · M3-5 ✔ · M3-6 ✔ · m3-1 ✔ · m3-2 ✔ · m3-3 ✔ (« effectif en fin
d'image ») · m3-4 ✔ (§VII renvoie bien à la n°4) · m3-5 ✔ (20 poses / 55 lignes, recomptés) · m3-6
**partiel** (`:231-239` ✔, `:745` ✗ — m4-1) · m3-7 ✔ · m3-8 ✔ dans le design, ✗ dans le catalogue (m4-2) ·
m3-9 ✔.

### (6) Le trou honnêtement documenté — **à garder, et je le salue**

`comptoir.lampe` (`:437`) et `famille.lampe-du-don` (`:502`) sont toujours sous le plancher §0.3, et le
fichier le dit toujours : Δ chiffré, « ⚠️ **Δ rendu sous le plancher §0.3, à MESURER** », critère de retrait
nommé (« la planche E4 le mesure, et sous 3/255 l'entrée est **retirée** »), règle générale à `:110`.
L'incohérence arithmétique de m3-1 est fermée (24/255 et 6/255 par la même conversion). **Ne pas supprimer
ces deux entrées, ne pas effacer la mention** : exiger seulement le commentaire de péremption au moment du
code (le critère de retrait n'a pas encore d'ancre de test). Même remarque pour les trois `SansHote` et
pour les deux hôtes « à créer » (`Ring Filled` de `retour.appui-long`, `Marque` de `carnet.en-main`) : ils
sont marqués, comptés et nommés, et §I.3 distingue correctement « `SansHote` » de « hôte client à créer ».

### (7) Affirmations fortes revérifiées justes

67 `AddComponent<Button>()` ✔ · 15 `Transition.None` ✔ · 52 = 67 − 15 ✔ · 5
`AddComponent<LongPressButton>` ✔ · 20 poses de CSF / 15 fichiers / 55 lignes ✔ · 306 `LayoutGroup`
(188 + 118) et 0 `GridLayoutGroup` ✔ · 40 paires d'inventaire (29 + 11) ✔ · 529 animations / 29 paires ✔ ·
`ConstruireLocataire` parente le host sous `ContentSlot` **avant** `AddComponent<T>` (`AppShell.cs:1120`,
`:1127`) — donc `activeInHierarchy` n'est pas globalement faux à la construction, et le prédicat ne
s'effondre pas en bloc ✔ (le défaut est local : B4-3) · ㉒ : **0** `AddComponent<Button>()` dans
`ProfileScreenController.cs` ✔, d'où le « 0 + 1 + 2 = 3 » de §V ✔.

### (8) Non rejugé / non vérifié

**Non rejugé** : le design v4.1 (§1-§15) ; les 10 mineurs de `dettes-design-mouvement.md` ; §16
(`CouleurA = Cible`), recontrôlé incidemment sur les 8 cibles de `Melange` et cohérent.
**Non vérifié** : la géométrie du manomètre de ⑭ (E4) ; les durées, formes et aisances de l'oracle CSS
(`oracle-css-*.json`, `transitions-*.json`) ; `famille.rang-ouvre` sous le `RectMask2D` de `:1331` (le
fichier le déclare lui-même « non mesuré ») ; le coût d'uGUI (E0) ; les fichiers NON SUIVIS de
`Assets/Scripts/ShellContracts/Mouvements/` et `Assets/Tests/PlayMode/Mouvements*.cs`, exclus de toutes
mes mesures comme demandé.
