# Revue ⊥ ciblée — §17 (design v4.5), G9, §4 ligne E0, `retour.appui` / `retour.appui-voile`, et le code qui porte la règle de classe

Dépôt `/home/erutheone/project/mafia-unity-anim`, branche `design/conformite-anim-2026-10-07`, HEAD `a9845645`. Lecture seule, aucun Unity lancé. (Rapport rendu ici en entier, conformément à la clause de repli : mes instructions m'interdisent d'écrire un fichier de rapport.)

## 1. Verdict et comptes

**NON APPROUVÉ — 2 BLOCKING, 8 MAJOR, 5 mineurs.**

| compte | mesure |
|---|---|
| sites `AddComponent<Button>()` dans `Assets/Scripts` | **67** (vérifié binairement, `grep -c`) |
| sites classés par la règle v4.5 (cas 0-5) | **47** (44 fermes, 3 conditionnels) — table en §3 |
| sites **non** classés | **20** (nommés en §3) |
| sites nommés par les revues n°2-n°4 | **tous classés** (18/18) |
| sites qui posent `transition = Selectable.Transition.None` | **14** boutons (+ 1 `Scrollbar`) — le catalogue en annonce 15 |
| sites qui n'assignent **jamais** `targetGraphic` | **9** |
| cas 5 mesurés (aucun retour) | **2** (`CityMapController.cs:894`, `DistrictInteriorScreenController.cs:2128`), **aucun déclaré** |
| B4-1 / B4-2 / B4-3 (revue n°4) | **fermés** ✔ (vérifiés : plus aucun compte affirmé ; voile borné au parent direct ≤ 2× ; prédicats au `PointerDown`) |

Ce qui est juste et que je salue : les deux prédicats sont **calculables** tels quels (chaque terme est un champ uGUI lisible) ; `Couple.Realisable` ne peut pas refuser un voile (`Alpha` → `default: return true`, `RegieInterne.cs:106`, et `Init` pose le `CanvasGroup` manquant, `:118-121`) ; la discrimination §5(i) entre le voile et `carnet.en-main` est réellement implémentée et correcte (`PolitiqueMouvement.cs:30` + `PoseDefinie => PoseDeReposS >= 0f` avec `PoseALaFin = -1f`, `Modele.cs:155,178`) ; G12 n'est **pas** atteignable par `retour.appui` dans ce catalogue (j'ai vérifié les 6 `Melange Absolu` posés par `Attacher` : `Row_descente` n'a aucun `Button` — `DashboardController.AddStatusRow` n'en pose pas —, le jeton de ⑤, le glyphe `Regime` de ⑮, le `Rond` de ㉜, le cran de ⑰ ne sont le `targetGraphic` d'aucun bouton) ; le test du voile vérifie bien que le voile **assombrit** (`MouvementsRegiePlayModeTests.cs:111`).

## 2. Findings

### BLOCKING

**B1 — le retour d'appui est encore REFUSÉ par le quota non-`Ambiance` de 16, et `BasculesVoile` mentit alors.**

*Où* : `Assets/Scripts/ShellContracts/Mouvements/Regie.cs:85-99` (la méthode) et `:484-486` (le refus) ; design §17 cas 0 et §4 ligne E0 ; catalogue §XI l.1392.

*Constat* : `AttacherRetourAppui` ne garde **qu'un** des quatre chemins de refus de `Creer`. Les deux branches retombent dans `Creer`, qui refuse sur le quota AVANT tout test `Melange`.

*Preuve* (citations exactes) :
```csharp
// Regie.cs:92
if (melange && !PlaceMelangeLibre && voile != null && cibleVoile != null)
{
    …
    BasculesVoile++;                                   // :95  — incrémenté AVANT l'attache
    return Attacher(voile, cibleVoile, Reglage.Defaut); // :96
}
return Attacher(appui, surface, Reglage.Defaut);        // :98
```
```csharp
// Regie.cs:484-486  — Genre.Retour ⇒ amb == false ⇒ compté dans nAutres
bool amb = e.Genre == Genre.Ambiance;
if (amb ? nAmbiance >= MouvementTunables.QuotaAmbiance : nAutres >= MouvementTunables.QuotaAlerteRetourTransition)
    return Refuser(e, "quota " + (amb ? "Ambiance" : "Alerte/Retour/Transition") + " atteint");
```
`MouvementTunables.cs:17` : `QuotaAlerteRetourTransition = 16`. Donc à `nAutres == 16` : handle nul, `Refus++` — et si le plafond `Melange` était plein, `BasculesVoile++` a déjà eu lieu : le compteur affirme une bascule qui n'a pas eu lieu, tandis que §4 affirme « aucune piste évincée, aucun refus » et §17 cas 0 « le retour d'appui n'est jamais refusé ».

*Atteignable, arithmétique entièrement sourcée* — pire cas non-`Ambiance`, ville en descente sur ⑮ :
- chrome : `chrome.pouls` **2 pistes** (cerclage + filet, design §9 ligne 1) + `chrome.tremble` 1 + `chrome.gyrophare` 1 (`CatalogueHud.cs:42,59,76`, les « 4 `Alerte` du chrome en descente » du catalogue §V l.1181) + `chrome.filet.virage` + `chrome.anneau.virage` + `chrome.aiguille.balayage` (`CatalogueHud.cs:95,99,102`), **qui TIENNENT leur emplacement** : `NotifierFins` ne libère une piste finie que si `FinRejointLaBase` (`Regie.cs:361`), faux pour un `Melange` qui finit à 1 (`:382`) et pour une `Rotation` qui finit hors base (`:385`) — dette 11 le dit explicitement ⇒ **7**
- ⑮ : `police.dispatch` **6** + `police.baton` 1 (catalogue §I.4 l.366-367) ⇒ **7**
- `shell.entree` **1** (§I.4 l.346) ; `bandeau.*` **1** (minorant ; §V l.1130 en majore 2)

**7 + 7 + 1 + 1 = 16** pistes non-`Ambiance` vivantes avant l'appui ⇒ le retour d'appui est le **17ᵉ** ⇒ refusé. (Le « pire cas 18 pistes sur 48 » du catalogue §V l.1181 sous-compte : il ne compte que les 4 `Alerte` du chrome et ignore ses 3 `Transition` tenues.)

*Pourquoi BLOCKING* : le barème nomme ce cas ; et le code écrit d'après §17 serait faux sur l'invariant central de la règle de classe ratifiée par f2.

*Correction proposée* : réserver au moins **un** emplacement non-`Ambiance` au retour d'appui (p. ex. `AttacherRetourAppui` passe par un chemin qui ignore le quota, ou `QuotaAlerteRetourTransition` = 16 dont 1 réservé) ; n'incrémenter `BasculesVoile` **qu'après** un handle non nul ; écrire dans §4/§17 la liste des chemins de refus que la règle de classe neutralise (quota 16, G12, `Realisable`, couples épuisés) et ce qu'il advient des autres.

---

**B2 — le catalogue contredit §17 cas 0 : la cause de `retour.appui-voile` n'inclut pas la bascule du plafond.**

*Où* : `catalogue-mouvements.md:415` (§II.0.a) et `:344` (§I.4) ; contre `design-couche-mouvement.md:243-244` (§17 cas 0) et `:83` (§4).

*Preuve* : §II.0.a l.415, colonne « déclencheur » de `retour.appui-voile` :
> « `PointerDown` sur un `Button` dont **ni la surface nommée ni le `targetGraphic` ne `RendSurface` À CET INSTANT** (cas 3-4 du design v4.5 §17). »

et l.414, `retour.appui` : « … (2) sinon `button.targetGraphic` s'il `RendSurface` ; **sinon pas de `retour.appui`** : c'est `retour.appui-voile` (ligne suivante) ». Aucune des deux lignes, ni la cible de §I.4 l.344 (« le `Button` s'il `Peint`, sinon son parent direct (aire ≤ 2×) ; sinon aucun (compté) »), ne mentionne le cas 0 — alors que §17 l.243-244 dit l'inverse : « **si le plafond `Melange` du §4 est atteint, les cas 1-2 passent directement au voile (cas 3-4)** ».

*Pourquoi BLOCKING* : §I.4 est, de son propre aveu (l.332), « la table que E1 recopie dans `Catalogue` ». Un codeur qui implémente les deux entrées depuis le catalogue n'attache jamais le voile quand le plafond est plein : la règle de classe n'est pas implémentée, et c'est une contradiction §17 ↔ catalogue, cas explicitement BLOCKING au barème.

*Correction proposée* : une clause dans le déclencheur de `retour.appui-voile` (« …**ou** dont la surface `RendSurface` mais le plafond `Melange` du §4 est atteint (cas 0) : la bascule est comptée dans `Regie.BasculesVoile` ») et le même renvoi dans la colonne « cible » de §I.4 l.343-344.

### MAJOR

**M1 — rien n'oblige le retour d'appui à passer par `AttacherRetourAppui`.** `Regie.Attacher` reste ouvert aux deux `Id` (`Regie.cs:124`), aucune garde de source ne l'interdit (G7 ne vise que des motifs dans `Mouvements/`, §10 l.134), et §17 ne l'exige nulle part en tant que garde. Un `Retour.Poser` qui appelle `Attacher(retour.appui, …)` perd la règle de classe en silence. *Correction* : faire refuser/ rediriger ces deux `Id` dans `Attacher`, ou ajouter une garde de source nommée dans §10.

**M2 — `Peint` est VRAI sur un `TMP_Text` vide : une 5ᵉ façon de ne rien peindre, absente des contrôles négatifs, et c'est précisément l'exemple cas 3 du §17.** §17 l.266-269 promet « Contrôles négatifs NOMMÉS, **un par façon de ne rien peindre** » et en liste quatre. Mesuré : `TopBarController.cs:657` `default: return "";` (`LabelFor`) ⇒ pour toute `LeadingAction` ≠ `BackToMap`, le label du bouton de tête est la chaîne vide, `enabled`, actif, `color.a = 1` ⇒ `Peint` vrai, rendu nul. Deuxième défaut du même exemple : ce bouton **n'est jamais actif en production** — `TopBarController.cs:974` `leadingGo.SetActive(false)`, `:638` `leadingGo.SetActive(action != LeadingAction.None)`, et les deux seuls appels de production sont `SetLeadingAction(LeadingAction.None, null)` (`AppShell.cs:275`, `:1563`), avec une **garde de source** qui interdit `BackToMap` dans `Assets/Scripts` (`RetourSerie6PlayModeTests.cs:250`, `R3_AucunCodeNePoseLaFlecheDuBandeau`). Sous G9 v4.5, il est donc « relevé et compté, pas jugé » : §17 affirme un cas pour un site que G9 ne jugera jamais. *Correction* : ajouter `(g is TMP_Text t ⇒ !string.IsNullOrWhiteSpace(t.text))` à `Peint`, son contrôle négatif, et remplacer l'exemple par un site mesuré (p. ex. `ExceptionQueuePanelController.cs:249`, dont le mot « TRANCHER » est un libellé servi).

**M3 — les deux prédicats ignorent le `CanvasGroup` des ancêtres (et un `RectMask2D` qui clippe) : `RendSurface` peut être vrai avec un rendu ≈ 0.** Mesuré sur un site du périmètre : `BandeauEphemere.cs:207` pose un `CanvasGroup` sur le GameObject **qui porte le `Button`** (`:251`), et `:298` `groupe.alpha = 1f - t / FonduS` descend jusqu'à 0 pendant que le bouton reste actif (§3 du design prévoit même le toucher pendant le fondu). `fond.color.a = 0,933` (`:171,217-219`) : `RendSurface` reste vrai, le `Melange` est multiplié par l'alpha du groupe. *Correction* : ajouter l'alpha cumulé des `CanvasGroup` (et le clip) aux deux prédicats, ou dire explicitement que le voile/le mélange d'un bouton déjà en fondu n'est pas garanti perceptible.

**M4 — le seuil `color.a ≥ 0,1` de `RendSurface` n'est relié à aucun seuil de perception.** Le design en a un (`SeuilCouleurRendue = 3f/255f`, `MouvementTunables.cs:73`, §6.2) mais G13 ne protège que les `Ambiance` (§10 l.140). Pire cas mesuré : `InspectionScreenController.cs:415` `fondBouton.color = new Color(Or.r, Or.g, Or.b, 0.18f)` avec `Or = hudMoneyUnderlineGold` = (0,851 ; 0,671 ; 0,306) (`:81`, `DesignTokens.asset:73`) ⇒ Δ rendu = 0,18 × 0,851 × 0,15 = **5,9/255** sur le canal rouge, à peine au-dessus du seuil ; à α = 0,10 sur un fond sombre (p. ex. `#241c14`, `ConflitScreenController.cs:712`) on tombe à **0,5/255**, invisible, et la règle l'accepte. *Correction* : remplacer le seuil α par « Δ rendu de `Cible` → `Cible × 0,85` ≥ `SeuilCouleurRendue` », ou étendre G13 aux `Retour`.

**M5 — le cas 2 est structurellement inatteignable sur 9 des 67 sites, dont 4 qui ont tout pour porter le `Melange`.** Mesuré : 9 sites n'assignent jamais `targetGraphic`, et Unity ne le remplit **pas** à l'exécution — `Selectable.Reset()` est à l'intérieur d'un bloc `#if UNITY_EDITOR` (`Library/PackageCache/com.unity.ugui@96898ecd6c63/Runtime/UGUI/UI/Core/Selectable.cs:603-608`), et `Reset` est un message d'éditeur. Quatre de ces sites (`ShopScreenController.cs:321`, `TutorialScreenController.cs:321`, `SettingsScreenController.cs:275`, `CompressionScreenController.cs:317`) portent sur **leur propre GameObject** une `Image` opaque (sprite `RoundedRectOutline`, `color` par défaut a = 1 — `Bloc(...)` n'ajoute aucune `Image`, `TutorialScreenController.cs:425-438`) : ce sont des pilules **bordées**, et la règle leur donne le voile « surface sans bord ni plaque » (catalogue l.415) au lieu du `Melange` + `Echelle`. *Correction* : cas 2 = « `b.targetGraphic`, **à défaut le `Graphic` porté par `b.gameObject`** », et dire dans §17 que `targetGraphic` est nul à l'exécution quand personne ne l'assigne.

**M6 — l'exemple cas 1 `DistrictInteriorScreenController.cs:2312 → Remplissage` est faux pour une des deux variantes.** Mesuré : la variante « or » pose `fondPeint.color = Color.white` (`:2274`) ⇒ RendSurface vrai ; la variante `.btn.ligne` pose `fondPeint.color = CouleurPourMelangeLineaire(Color.white, ficheGlassTop, 0.039f, out _)` (`:2282`), et cette fonction renvoie **l'alpha qu'on lui passe** : `ProceduralUI.cs:811` `srgb.a = alphaSrgb;` ⇒ α = **0,039 < 0,1** ⇒ cas 1 échoue, le site tombe en cas 3 (voile sur `go` : `Coins` à a = 1 et le `Texte` peignent). *Correction* : écrire les deux variantes dans §17, ou nommer `Coins` comme surface de repli.

**M7 — les cas 5 ne sont pas déclarés, et §17 n'en connaît qu'un sur (au moins) deux.** §17 l.259-260 dit que `CityMapController.cs:894` « doit être **déclaré** (une `surface` nommée ou une exclusion nommée de G9) » — et ne le déclare pas, ni le catalogue, ni `dettes-design-mouvement.md` (lu en entier : rien). G9 (§10 l.136) « un cas 5 non déclaré ROUGIT » ⇒ G9 est rouge par construction au créneau E2. Second site mesuré, non mentionné : `DistrictInteriorScreenController.cs:2128` (`Tete_OuvrirFiche`), `targetGraphic` = `zoneTete` à a = 0 (`:2125-2127`), **aucun enfant** ⇒ `Peint(b)` faux ; parent `corps` posé par `PoserDansFiche` sur toute la largeur (`:2206-2214`), hauteur de la tête 37,74 CSS contre `FicheHauteurCss = 169,19` (`:1878`) ⇒ aire du parent ≈ **4,5×** ⇒ cas 5. S'ajoute une tension de rédaction : §4 affirme « le retour d'appui du joueur n'est **JAMAIS** celui qu'on refuse » tandis que §17 cas 5 rend « aucun retour, compté ». *Correction* : déclarer les deux sites (surface nommée ou exclusion G9 avec sa raison) dans §17 ou dans les dettes, et borner la règle de classe en §4 (« jamais refusé **par la régie** ; un bouton qui ne peint rien se DÉCLARE »).

**M8 — le test `E0_RetourDAppui_JamaisRefuse_PlafondPlein_BasculeSurLeVoile` prouve moins que son nom.** Il prouve exactement ce qu'il montre, contrôle négatif compris — 10 `Melange` tenus, `PlaceMelangeLibre` faux (`:92`), handle non nul (`:106`), `BasculesVoile == 1` (`:107`), `Refus` inchangé (`:108`), aucune piste évincée (`:109`), **et le voile assombrit vraiment** `Assert.Less(bouton.GetComponent<CanvasGroup>().alpha, 1f)` (`:111`), puis un vrai négatif : une place libérée ⇒ pas de nouvelle bascule (`:114-118`). Mais : (a) les 10 pistes tenues sont des `Alerte` ⇒ `nAutres = 10`, le quota de 16 **n'est jamais approché** : aucun test ne couvre B1 ; (b) la même `RectTransform` sert de surface et de cible de voile (`:105`) ⇒ la sélection des cas 3-4 n'est pas exercée ; (c) `BasculesVoile` est asserté sans qu'aucun test ne vérifie qu'une bascule comptée implique un handle non nul. *Correction* : ajouter `E0_RetourDAppui_JamaisRefuse_QuotaNonAmbiancePlein` (16 `Alerte` vivantes + plafond `Melange` plein ⇒ handle non nul, `Refus` inchangé) — c'est le test qui rougira avant le correctif de B1.

### mineurs

- **m1** `Regie.cs:488` : « et au plus **8** pistes `Melange` vivantes à la fois » alors que `MouvementTunables.PistesMelangeMax = 10` (`:23`) ; même reliquat en tête du catalogue §XI l.1392 (« au plus 8 pistes `Melange` vivantes ») avant que la phrase suivante ne dise 10.
- **m2** catalogue §II.0.a titre (l.404) : « 15 sites `Transition.None` sur 67 `Button` ». Mesuré : **14** `Button` posent `Transition.None` ; le 15ᵉ site est `ReputationScreenController.cs:994`, une `Scrollbar` (`sb`, `:993`). Donc le design §8 (« perdent le tintement `ColorTint` par défaut (52 d'entre eux) ») doit lire **53**.
- **m3** §17 « Gardes » (l.264) résume G9 en « tout `Button` monté a un `RetourAppui` » et laisse tomber « **actif et `interactable`** » que §10 l.136 vient d'ajouter en v4.5 ; aligner les deux phrases (c'est cette précision qui met `TopBarController.cs:940` hors jugement).
- **m4** `RendSurface` juge un `Graphic`, mais l'API prend une `RectTransform` (`Regie.cs:85`) et le `Melange` re-résout la cible par `rt.GetComponent<Graphic>()` (`RegieInterne.cs:124`) : si le GameObject portait deux `Graphic`, la régie animerait un autre objet que celui validé. À borner dans §17 (« la surface nommée est le premier `Graphic` de son GameObject »).
- **m5** `AttacherRetourAppui` impose `Reglage.Defaut` aux deux branches et n'offre pas de `quandFini` (`Regie.cs:96,98`) : à dire dans §17 si c'est voulu (le détachement au relâchement se fait alors par `Detacher`, jamais par `quandFini`).

## 3. Couverture — les 47 sites classés (cas · cible · preuve)

`tG` = `targetGraphic`. « a= » = `color.a` mesuré.

| # | site (`Assets/Scripts/…`) | cas | cible du mouvement | preuve |
|---|---|---|---|---|
| 1 | `Operational/Exceptions/ExceptionDetailController.cs:569` | **1** | `Face/Verre` | tG = `fondCarte`, `Mask` `showMaskGraphic=false` sur `Face` (`:538`) ; `Verre` = `Image` sprite dégradé, a=1 (`:540-549`) |
| 2 | `CityMap/DistrictInteriorScreenController.cs:2310` | **1** (or) / **3** (ligne) | `Remplissage` / voile sur `go` | tG = `fond`, masque invisible (`:2261`) ; `Remplissage` a=1 (`:2274`) ou **a=0,039** (`:2282` + `ProceduralUI.cs:811`) |
| 3 | `Shell/LaSuitePanelController.cs:222` | **1** (1ᵉʳ geste) / **2** | `Degrade` / `im` | `Mask` `showMaskGraphic=false` seulement `if (premierGeste)` (`:211`) ; sinon `im` opaque (`Arrondir`, `:207`) |
| 4 | `Shell/TopBarController.cs:940` | **non jugé** (inactif) | — | `:938` a=0 ; `:974` `SetActive(false)` ; prod n'appelle que `None` (`AppShell.cs:275,1563`) + garde R3 (`RetourSerie6PlayModeTests.cs:250`) |
| 5 | `CityMap/CityMapController.cs:894` | **5** | aucun (à déclarer) | tG = `hit` a=0 (`:748`) ; calques de cellule allumés par `DistrictCellView` |
| 6 | `Operational/Delegation/DelegationScreenController.cs:1533` | **4** | le bloc parent | tG jamais assigné ; `cible.color` a=0 (`:1531`) ; zone `Etirer` ⇒ aires égales (`:1529`) |
| 7 | `Operational/Demolition/DemolitionScreenController.cs:1459` | **4** | le bloc parent | idem (`:1455-1457`) |
| 8 | `Shell/DailyReviewScreenController.cs:1101` | **3** | le `TMP_Text` lui-même | tG non assigné ; `interactable` ⟺ `RienATenir` et le texte est posé dans la même branche (`:362-366`) |
| 9 | `Shell/ExceptionQueuePanelController.cs:440` | **2** (panneau) / **4** (accueil) | `vaImg` / **tout le panneau** | `surfaceRow` a=1 (`DesignTokens.asset:17`) ; en accueil a=0 (`:99`), label inactif (`:100`), étiré sur le panneau (`:96-98`) |
| 10-11 | `Shell/ExceptionQueuePanelController.cs:249` et `:314` | **3** | `trancherGo` | tG = `zone` a=0 (`:247`, `:312`) ; enfant `mot` « TRANCHER » peint (`:257`, `:322`) |
| 12 | `Shell/HighestLeverageCardController.cs:342` | **3** | la racine de la carte | `surface.color` a=0 (`:339-341`) |
| 13-15 | `…:380`, `…:418`, `…:431` | **2** | `skipImg`, `typedConfirmImg`, `lireImg` | `surfaceRow`/`surfaceRaised`/`CtaColor`, a=1 (`DesignTokens.asset:17-18`) |
| 16-19 | `Economy/Shop/…:321`, `Onboarding/Tutorial…:321`, `Account/Settings/…:275`, `CoreLoops/Compression/…:317` | **3** | voile sur le bouton | tG jamais assigné (`Selectable.Reset` = `#if UNITY_EDITOR`) ; `Image` propre opaque ⇒ M5 |
| 20 | `Account/Settings/SettingsScreenController.cs:347` | **3** | la rangée `r` | tG non assigné ; `Puce` (`RadialDisc`) + `Nom` peignent (`:343-346`) |
| 21 | `Account/Settings/SettingsScreenController.cs:256` | **3** | la rangée | tG = `zone`, `transparent.a = 0f` (`:254`) |
| 22 | `Operational/Lieutenant/…:2731` | **3** | le rang | tG non assigné ; `Panneau` est le graphique d'un masque invisible (`:2298-2299`) mais `Panneau/Plaque` peint (`:2308-2310`) |
| 23-25 | `…:2838`, `…:2879`, `…:1605` | **2** | `img`, `img`, le disque (`cible`) | tG assignés (`:2840`, `:2881`, `:1607`) |
| 26 | `Onboarding/TutorialScreenController.cs:365` | **3** | la ligne | tG = `zone` a=0 (`:367-368`) ; `Interrupteur/fond` (a=1 ou 0,18) + textes peignent |
| 27 | `Operational/Carnet/CarnetScreenController.cs:595` | **2** (en main) / **3** | `img` / voile sur la ligne | `CouleurEnMain` (`:461`) sinon fond a=0 (`:593`) |
| 28 | `Operational/Carnet/CarnetScreenController.cs:578` | **2** | `fond` | `CouleurEncre`/`CouleurPapierFonce` (`:577`) |
| 29 | `CitySim/Inspection/InspectionScreenController.cs:416` | **2** | `fondBouton` | a=**0,18** (`:415`) ⇒ Δ rendu 5,9/255 (M4) |
| 30 | `Shell/BandeauEphemere.cs:251` | **2** | `fond` | a=0,933 (`:171,217-219`) ; `CanvasGroup` du même objet peut valoir ~0 (M3) |
| 31-32 | `Shell/AppShell.cs:1433`, `:1592` | **2** | `fond` (`ficheGlassTop` a=0,937), `cadre` (a=1) | `:1436`, `:1591` + `DesignTokens.asset:86` |
| 33-34 | `CityMap/CityMapController.cs:586`, `:1068` | **2** | `img`, `enterImg` | `mapChipBg` a=1 (`DesignTokens.asset:43`) ; `:1068` `interactable=false` au départ |
| 35-36 | `Operational/Exceptions/ExceptionDetailController.cs:397`, `:682` | **2** | `talonImg`, `img` | `AccentSevere` (`:396`), `surfaceRaised` a=1 (`:681`) |
| 37-40 | `Operational/Autonomy/…:370`, `Operational/Dashboard/…:795`, `Operational/Filiere/…:724`, `Operational/ChaineDAppro/…:585` | **2** | `img`/`img`/`Image` du bouton/`fond` | `surfaceRaised` a=1 ; `Or` (`ChaineDAppro:584`) |
| 41 | `Operational/Conflit/ConflitScreenController.cs:726` | **2** | `fondLigne` | `#2e2114`/`#241c14` opaques (`:712`) |
| 42-43 | `Shell/HomeChromeController.cs:238`, `:252` | **2** | `drImg`, `secImg` | `surfaceRow` a=1 (`:237`, `:251`) |
| 44 | `Shell/DailyReviewScreenController.cs:590` | **2** | `jetonImg` | sprite `RadialDisc`, `color` par défaut a=1 (`:570-571`) |
| 45 | `Operational/Exceptions/ExceptionQueueController.cs:605` | **3 ou 4** | à mesurer par G9 | tG = `fondA` a=0 (`:604`) |
| 46 | `CityMap/DistrictInteriorScreenController.cs:691` | **3 ou 5** | à mesurer par G9 | tG = `zone` a=0 (`:688-690`) ; dépend des calques allumés de la cellule |
| 47 | `CityMap/DistrictInteriorScreenController.cs:2128` | **5** | aucun (**non déclaré**) | tG = `zoneTete` a=0 (`:2125-2127`) ; sans enfant ; parent `corps` ≈ 4,5× l'aire (`:2206-2214`, `:1878`) |

**20 sites non classés** (je n'ai pas lu la couleur décisive de leur `targetGraphic`, tous l'assignent) : `Shell/AppShell.cs:2349` · `CityMap/CityMapController.cs:689`, `:1031` · `Operational/Conflit/…:1111`, `:1142` · `Operational/Loi/…:297`, `:400` · `Operational/Selling/…:441`, `:503` · `Operational/Distribution/…:675`, `:783`, `:869` · `Operational/BuildingCard/…:2423` · `Operational/Reputation/…:1488` · `Shell/DecisionDetailScreenController.cs:406` · `Shell/EcranEchecDeDemarrage.cs:56` · `Operational/Lieutenant/…:3970`, `:3991`, `:4124` · `Operational/Exceptions/TamponAuComptoir.cs:92`. (⚠️ `AppShell.cs:2349` est voisin d'un `invisible.a = 0f` à `:2337` : candidat cas 3, à mesurer.)

**Ce que le voile assombrit réellement, pour chaque cas 3-4 classé** : cas 3 ⇒ un `CanvasGroup` posé sur le `Button` lui-même (`RegieInterne.cs:118-121`), donc exactement son sous-arbre — vérifié non vide pour #8, #10, #11, #12, #16-22, #26 ; cas 4 ⇒ le `CanvasGroup` va sur le parent direct, donc sur **le bouton et toute sa fratrie** : #6 et #7 (le bloc de ㉜/㉝ avec ses filets et ses textes — c'est bien « la plaque »), #9 en mode accueil (**tout le panneau de la file**, `Trancher` compris). À noter : la borne « aire ≤ 2× » est un **rapport**, pas une surface : une zone `Etirer`ée sur son parent la satisfait toujours, quelle que soit la taille du parent (#6, #7, #9). Les deux dangers nommés par la revue n°4 sont bien attrapés (#4 zone 48×48 contre toute la barre ; #5 cellule contre la grille ⇒ rapport > 2 ⇒ cas 5).

---

## Message de synthèse

**NON APPROUVÉ** — 2 BLOCKING, 8 MAJOR, 5 mineurs. Comptes : 67 sites `Button` mesurés, **47 classés** (44 fermes, 3 conditionnels), **20 non classés** ; 14 sites `Transition.None` (le catalogue en dit 15 : le 15ᵉ est une `Scrollbar`) ; 9 sites sans `targetGraphic` ; 2 cas 5 mesurés, aucun déclaré ; B4-1/B4-2/B4-3 de la revue n°4 **fermés**.

- **BLOCKING B1** — le retour d'appui reste REFUSABLE : `Regie.AttacherRetourAppui` (`Regie.cs:92`) ne garde que le plafond `Melange`, et les deux branches retombent sur le refus de quota `nAutres >= 16` (`Regie.cs:485-486`), atteint dès 7 pistes de chrome tenues + 7 de ⑮ + `shell.entree` + bandeau = 16 ; pire, `BasculesVoile++` (`:95`) est compté avant un refus possible.
- **BLOCKING B2** — le catalogue contredit §17 cas 0 : la cause de `retour.appui-voile` (`catalogue-mouvements.md:415`, cible en `:344`) ne connaît que les cas 3-4 (« ni la surface nommée ni le `targetGraphic` ne `RendSurface` »), donc un codeur qui recopie §I.4 n'attache jamais le voile quand le plafond `Melange` est plein.

Fichiers lus pour le verdict : `/home/erutheone/project/mafia-unity-anim/Tools/conformite-anim-2026-10-07/design-couche-mouvement.md`, `/home/erutheone/project/mafia-unity-anim/Tools/conformite-anim-2026-10-07/catalogue-mouvements.md`, `/home/erutheone/project/mafia-unity-anim/Tools/conformite-anim-2026-10-07/dettes-design-mouvement.md`, `/home/erutheone/project/mafia-unity-anim/Assets/Scripts/ShellContracts/Mouvements/Regie.cs`, `RegieInterne.cs`, `MouvementTunables.cs`, `PolitiqueMouvement.cs`, `Modele.cs`, `CatalogueHud.cs`, `/home/erutheone/project/mafia-unity-anim/Assets/Tests/PlayMode/MouvementsRegiePlayModeTests.cs`, plus les 47 sites de construction cités et `/home/erutheone/project/mafia-unity-anim/Library/PackageCache/com.unity.ugui@96898ecd6c63/Runtime/UGUI/UI/Core/Selectable.cs:603-608`.