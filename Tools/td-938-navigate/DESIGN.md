# TD-938 (a) — suivre `navigate_screen` — DESIGN v3, 2026-11-11

## Changements v2 → v3 (re-revue ⊥ v2 : NOT_APPROVED)
- **A** — `AnnoncerUnRefus` est appelé **par ④**, pas par `AppShell` : un refus n'a pas d'`outcome navigate`, donc
  `SuivreLaNavigation` n'est jamais entrée sur ce chemin et l'appel y était **inatteignable**. L'appel se fait sur le
  composant **rendu par le montage** dans `MonterLesRapports()` (§6, §4 corrigé).
- **B** — la valeur passée est `client.DernierePhraseDeRefus` (**servie seule**, nullable), jamais `RefusRendu`
  (`HighestLeverageCardController.cs:221-222` : il retombe sur le littéral client « La décision n'a pas été prise. », ce qui
  aurait fait passer G5 (b) sur une phrase **inventée**, contre son propre contrôle). G5 (b) est assertée sur elle.
- **C** — ancres de §6b **re-mesurées par `grep -n`** (v2 les avait ajustées de tête, décalées d'une ligne) :
  `PhraseDuRefus = null` **`:197`** · `ReportsLoaded = false` / `ReportsError = null` **`:170-171`** · `Render()` de
  `LoadReports` **`:186`** · `RenderError()` appelé **`:180`** · `LoadReports` **`:154-188`** · garde du bloc `"Error"`
  **`:236`**, `NewText("Error", …, PhraseDuRefus, …)` **`:238`** (bloc `:235-242`).
- **D** — ⑤ : l'insertion **PRÉCÈDE** `DecisionDetailScreenController.cs:362` (`reponse` y est en portée), car cette ligne
  appelle `TrancheePourDeBon()` (`:469-473`) qui lève `OnDecisionTranchee` à **`:472`**.
- **Mineur** — le drapeau d'`AnnoncerUnRefus` est nommé (§6b) ; `IShellNavigator.cs` est sous **`ShellContracts/`**.
- **Mesure neuve** : c7 pose déjà `PhraseDuRefus = client.DernierePhraseDeRefus ?? Libelle.Gabarit("autonomie.refus.…")`
  (`:207-209`) ⇒ **c7 a son propre repli** ; `AnnoncerUnRefus` n'en ajoute aucun (sinon deux replis pour une phrase).

Arbre `/home/erutheone/project/mafia-unity-C1`, br. `lot/client1-navigate-2026-11-11`. Back LU @`35bdd6cb`
(`/home/erutheone/project/mafia-clean-city`). Tout fait porte `fichier:ligne` **re-mesuré dans cet arbre** ; le reste est
marqué **non mesuré**. Rien de joué, rien de commité.

## Changements v1 → v2
- **Rulings f2 11/11** : Q1 = `RequestCommit(0)` pour « Lire maintenant » (§6) · Q2 : 103 → ⑨ (il porte le total), 106 →
  branche inconnue assumée + TD-981/TD-985, **TD-980 disparaît** · Q3 : table dans `Shell`, `navigate_ids` → TD-982.
  ⇒ la table client a **3 valeurs menées sur 4**, la 4ᵉ **classée** « inconnue assumée » (§1, G1).
- **B1** : l'évènement ④→shell manquait. Spécifié (§3a) : nom, signature, édition exacte de `:231-236`, abonnements.
- **B2** : G2 (effet) est **dans ce lot**, écrite et typecheckée maintenant, jouée au prochain créneau (§5).
- **B3** : le contrôle positif de G3 est un écran **CONNU** ⇒ `NavigationsInconnues == 0` **et** 1 cible montée (§5).
- **B4/I4** : ordre `yield return null` → `Depiler()` → `yield return null` → montage (§3b).
- **I5** : la branche inconnue appelle `RelireLAccueilApresUneDecision()` **directement** côté shell (§2, §3b).
- **I6** : `DecisionsTranchees` tranché et sa doc amendée (§3c, V17 : paraphrase).
- **M7** : ancres de tests corrigées — `[Test]` purs à `CommitResponseDtoPlayModeTests.cs:30, :153, :224` (re-mesuré :
  13 `[Test]`, aucun `[UnityTest]`). v1 citait `:22, :160, :235` : faux.
- **M8** : `Assets/Scripts/Operational/Filiere/FiliereScreenController.cs` **ÉCARTÉ** — filière de BLANCHIMENT
  (`GET …/laundering`, `:117`, `:289`, `:337`), sans rapport avec la chaîne d'appro ni avec une trace.
- **Ancre relayée corrigée** : le patron de la coroutine est `AppShell.cs:575-579` (v1/revue disaient `:574-578`).
- **Q4 = (c)** (ruling f2) : la phrase servie du refus s'AFFICHE dans c7 par un puits minimal `AnnoncerUnRefus` (§6b) ;
  TD-986 **retirée**, c7 entre dans les fichiers touchés (§4), G5 (b) gagne son assertion d'effet et son contrôle (§5),
  **TD-987** ouverte (`RenderError` homonyme). Ancres re-mesurées : bloc `"Error"` `:235-242` (revue : `:236-241`),
  reset dans `Resolve` `:198` (revue : `:197`).

## 0. Servi par le back — RECOPIÉ (V15). `action: { kind: 'navigate'` : compte `$()` = **4**, 4 `screen` distincts
`hl-option-table.ts` : 103 `ESCALATION_BACKLOG_REVIEW` → `exceptions_escalations`, `ids: null` (`:89-90`) · 104
`AUTONOMY_REPORTS_PENDING` → `autonomy_reports`, `report_id` scalaire (`:93-94`) · 106 `BACKPRESSURE_CRITICAL_TRACE` →
`supply_chain_trace`, `building_ids` liste (`:101-102`) · 108 `CUE_CASCADE_FALLOUT` → `exceptions_queue`, `exception_ids`
liste (`:109-110`). `idsFromTargetRef` (`:144-149`) : scalaire ⇒ `[v]` · liste ⇒ filtrée · `targetRef` mal formé ⇒ `[]` ⇒
`navigate_ids` **toujours** un tableau, jamais null, parfois vide. Navigate **seulement** si `chosen_option: 0`
(`hl-commit-plan.ts:20` `HL_DEFAULT_CHOSEN_OPTION = 1`, `:75`). `hl-card.service.ts:260` réclame la carte AVANT la branche,
`:269` `recordAdvisoryDecision` ⇒ **terminale dès le 200**. `hl-commit-response.ts:29` `committed: true as const` ;
`hl-outcome-i18n.ts:52-53` `navigate → null` ⇒ **aucun mot servi** (D6).

## 1. Table `navigate_screen` → écran CLIENT (mesurée) — 3 menées, 1 classée inconnue
- **`exceptions_queue` → ⑨ `ExceptionQueueController`** ; ouvreurs d'aujourd'hui : `AppShell.cs:676-677` (privé,
  `MonterLocataireEnSurimpression<T>()`), `DashboardController.cs:453`, `HomeChromeController.cs:141`. `exception_ids`
  **IGNORÉS** : `OpenDetail(ExceptionCardDto)` (`:212`) prend un DTO, pas un id ; aucun setter de filtre ⇒ **écart**, TD-982.
- **`autonomy_reports` → c7 `AutonomyInboxController`** ; ouvreurs : `AppShell.cs:680-681` (privé),
  `HighestLeverageCardController.cs:180-186`, `DashboardController.cs:454`. `report_id` **IGNORÉ** : `LoadReports()` (`:154`)
  charge TOUT, aucun focus ⇒ **écart**, TD-982.
- **`exceptions_escalations` → ⑨ `ExceptionQueueController`** (ruling f2 : l'écran existant le plus proche qui MONTRE
  l'objet). Mesure : ⑨ **porte le total** des escalades — `EscaladesTotal` (`ExceptionQueueController.cs:952`), lu par
  `ExceptionsClient.GetEscalationsTotal` (`:58`, URL `:51-52` `?limit=1&offset=0`), rendu par `RendreLienEscalades`
  (`:986-1030`). **Écart assumé** : ce pied est **INERTE** — textes seuls, `raycastTarget=false` (`:998`), aucun `Button` sur
  `lienRoot` (`:1171`) ⇒ le joueur voit le compte, ne peut pas l'ouvrir. `ids = []` de toute façon (table `:90`).
- **`supply_chain_trace` → INCONNU ASSUMÉ** (ruling f2) : aucun écran de trace. ㉚ `ChaineDApproScreenController` est l'hôte
  **futur** (TD-981) : il découvre son propre bâtiment (`:192 DecouvrirBuildingId`, `:98 BuildingIdDecouvert`, aucun setter) et
  surtout `AppliquerChaine` (`:611-637`) **ne rend AUCUN nœud** — il pose un label (`:615-619`) puis, au plus, un message
  (`:625-637`), `null` dès qu'il existe un nœud non `silent` (`ToutSilencieux`, `:234`) ⇒ **TD-985** (classe A/B, détecteur).
  À la fermeture de TD-985, 106 → ㉚.
- **Écarté** : `Operational/Filiere/FiliereScreenController.cs` — blanchiment (`GET …/laundering`, `:117`), pas une trace.

**104 passe DÉJÀ ailleurs, et sans commit** (défaut de boucle) : `EstCarteDesRapports`
(`HighestLeverageCardController.cs:131-135`) ⇒ AGIR caché, seul `lireButton` montré (`:300`), câblé `:515` sur
`OuvrirLesRapports()` (`:180-186`) qui monte c7 par `ShellNavigatorLocator.Find()` — **aucun `RequestCommit`** ⇒ carte jamais
réclamée (back `:260`), resservie au prochain `session/open`. **Corrigé dans ce lot** (§6).

**⑤ ne peut PAS produire `navigate` aujourd'hui** : `DecisionDetailScreenController.cs:356` appelle `client.Commit` **sans
`optionChoisie`** ⇒ `HlCardClient.cs:51` `CorpsDuCommit(null)` = `{}` ⇒ défaut back 1 ⇒ `noted`. Branche **dormante**, câblée
quand même (un seul chemin), nommée par G4. `navigate_screen`/`navigate_ids` déclarés (`HlCardClient.cs:21-22`), **aucun
lecteur** (grep : DTO, tests de bijection, commentaire de TD-938).

## 2. Écran INCONNU (null, vide, hors des 3 menées — donc `supply_chain_trace` inclus)
Rien d'ouvert ; **le shell appelle `RelireLAccueilApresUneDecision()` directement** (`AppShell.cs:568`) — il ne peut pas lever
l'évènement de ④ (I5) — ⇒ le comportement d'aujourd'hui, inchangé. En plus : `NavigationsInconnues++` (crochet de test, sur
`AppShell`) et un `Debug.LogWarning` **nommant la valeur reçue**. Jamais d'écran deviné ni par défaut.

## 3. L'évènement, l'ordre, les compteurs

### 3a. B1 — l'évènement ④→shell (manquant en v1)
Défaut re-mesuré : `TrancheePourDeBon` (`HighestLeverageCardController.cs:231-236`) fait `DecisionsTranchees++` (`:233`),
`if (LeverLApres(…)) return;` (`:234`) — faux sur `navigate` car `ApresGesteHl.Vue` rend null faute de mot
(`ApresGesteHl.cs:122`, `:129`) — puis `OnDecisionTranchee?.Invoke()` (`:235`) ⇒ `AppShell.cs:1845` →
`RelireLAccueilApresUneDecisionCo` (`:573-581`) remonte l'Accueil.

- **NEW sur ④ et sur ⑤** : `public event System.Action<string, string[]> OnNavigate;` — porte `navigate_screen` **brut** et
  `navigate_ids`. ④/⑤ ne connaissent pas la table ; le shell classe.
- **Édition exacte de `:231-236`** — `:233` et `:234` inchangés ; **insérer entre `:234` et `:235`** :
  `if (EstUneNavigation(reponse)) { NavigationsSuivies++; OnNavigate?.Invoke(reponse.navigate_screen, reponse.navigate_ids); return; }`
  avec `private static bool EstUneNavigation(CommitResponseDto d) => d != null && string.Equals(d.outcome, "navigate", StringComparison.Ordinal);`
  ⇒ la clé de décision est `outcome` (**clé PRÉSENTE sur un corps de succès**, V19-5), jamais `navigate_screen != null` : un
  `navigate` à `screen` nul part quand même sur ce chemin et atterrit dans la branche inconnue (comptée, journalisée) au lieu
  de remonter l'Accueil en silence (V19-2).
- **⑤ (D)** : l'insertion **PRÉCÈDE** `DecisionDetailScreenController.cs:362`
  (`if (!PoserLApres(new …{ Carte = CarteAffichee, Reponse = reponse })) TrancheePourDeBon();`) — `reponse` y est en portée, et
  cette ligne appelle `TrancheePourDeBon()` (`:469-473`) qui lève `OnDecisionTranchee` à `:472`. Même garde `EstUneNavigation`,
  même `return` avant `:362`.
- **Abonnements dans `AppShell`** : `hlCard.OnNavigate += SuivreLaNavigation;` à poser juste après `:1845`. Les **trois**
  sites qui montent ⑤ (`:1844` lambda d'expression, `:1848-1853` dans `OnApresGeste` — montage `:1850` —, `:1863` pour le
  `calme`) passent par un **NEW** `private DecisionDetailScreenController MonterLeDetail()` qui monte ⑤ et câble les **deux**
  évènements en **un seul site** (même raison que `MonterLAccueil()`, `:528-533` : pas de dérive entre trois lambdas) ; `:1844`
  et `:1863` cessent d'être des lambdas d'expression.

### 3b. Ordre des gestes — un seul geste, jamais les deux
`public void SuivreLaNavigation(string screen, string[] ids)` → `StartCoroutine` d'une coroutine calquée sur
`RelireLAccueilApresUneDecisionCo` (`AppShell.cs:573-581`), patron **mesuré** `:575-579` :
1. `yield return null` ; `if (this == null) yield break;` — la coroutine du locataire qui annonce finit avant le démontage.
2. `if (SurimpressionOuverte) Depiler();` — ④ et ⑤ se dépilent ENSEMBLE vers la carte (`:585-594`).
3. `yield return null`.
4. `NavigationApresGeste.Pour(screen)` : `Aucune` ⇒ `NavigationsInconnues++`, `Debug.LogWarning` nommant `screen`,
   `RelireLAccueilApresUneDecision()` (§2) ; sinon `MonterLocataireEnSurimpression<Cible>()` (`:1581`, chemin normal —
   `ConstruireLocataire` pose parent + jeton).
5. **AUCUN `session/open` sur le chemin mené** : l'Accueil est détruit en (2) et **toute** réouverture le RELIT déjà
   (`RouvrirLAccueil` `:535` → `PanneauxDeLAccueilRouvert` `:548-559` ; `ToucherLOnglet(Tab.Empire)` `:513-516`) ⇒ la carte
   tranchée a disparu au retour, **sans double ouverture de session**, **sans écran empilé deux fois**.

⛔ `OnDecisionTranchee` **n'est pas levé** sur le chemin navigate (le `return` de `:234+`) : sinon
`RelireLAccueilApresUneDecisionCo` dépilerait notre écran à la frame suivante puis rouvrirait l'Accueil par-dessus.
**Écart assumé** : le retour système depuis la cible remonte la CARTE, pas l'Accueil (`Depiler` `:593`) — déjà le cas depuis
l'Accueil lui-même.

### 3c. I6 — ce que compte `DecisionsTranchees` après le changement
Mesure : `:233` incrémente **avant** toute branche, donc le compteur compte déjà les décisions dont la suite est l'après-geste
⑤ ; sa doc (`:64`, « combien de décisions ACCEPTÉES ont levé `OnDecisionTranchee` ») est **déjà fausse** aujourd'hui.
**Tranché** : `DecisionsTranchees` = **toute décision acceptée par le back (200 `committed`)**, quelle que soit la suite
(après-geste, navigate, ou remontée). Le compteur **ne change pas**, sa **doc `:64` est amendée** en ce sens (V17 :
paraphrasée, pas citée) ; l'assert `HighestLeverageCardControllerPlayModeTests.cs:154` (`== 1`, sur un 200 `committed`) reste
**vrai sans retouche** — vérifié en lisant son corps (`:149-154` : `RequestCommitViaTypedConfirm`, `LastCommitCommitted ==
true`). Le chemin navigate reçoit son **propre** compteur `NavigationsSuivies` (④/⑤) : deux grandeurs, deux noms.

## 4. Où vit la table (Q3)
**NEW** `Assets/Scripts/Shell/NavigationApresGeste.cs`, à côté de `ApresGesteHl.cs` — statique, **PURE**, testable sans scène :
`enum Cible { FileDesExceptions, BoiteDesRapports, Aucune }` · `Cible Pour(string)` · `EcransServis` (les **4** chaînes
recopiées de `hl-option-table.ts:89-110`) · `EcransMenes` (3) · `EcransInconnusAssumes` (1 : `supply_chain_trace`, TD-981).
Elle **ne nomme aucun `System.Type`** : le montage reste dans `SuivreLaNavigation` (`Shell.asmdef` référence déjà
`Operational` ⇒ aucune référence neuve).
⛔ Intouchés : `Assets/Scripts/ShellContracts/Mouvements/Regie.cs` (lot voisin) ; `Retour.cs` **absent de cet arbre**.
Pas de `Assets/Tests/EditMode` ⇒ gardes pures en `[Test]` dans l'assembly PlayMode (précédent **re-mesuré** :
`CommitResponseDtoPlayModeTests.cs:30, :153, :224` ; 13 `[Test]`, aucun `[UnityTest]`).

**Fichiers touchés par le lot** : (1) NEW `Shell/NavigationApresGeste.cs` · (2) `Shell/HighestLeverageCardController.cs`
(④ : `OnNavigate`, édition `:231-236`, `OuvrirLesRapports` §6, `NavigationsSuivies`, doc `:64`) · (3)
`Shell/DecisionDetailScreenController.cs` (⑤ : `OnNavigate`, insertion **AVANT** `:362` — D) · (4) `Shell/AppShell.cs`
(`SuivreLaNavigation`, `MonterLeDetail`, abonnements près de `:1844-1863`, `NavigationsInconnues`) — **aucun appel
d'`AnnoncerUnRefus` ici** (A : le repli de Q1 ne passe pas par le shell) · (5)
**`Assets/Scripts/Operational/Autonomy/AutonomyInboxController.cs`** (c7 : la seule méthode publique
`AnnoncerUnRefus(string)`, §6b — aucun élément visuel neuf, `Render()` `:220` et son bloc `"Error"` `:235-242` inchangés) ·
(6) NEW `Assets/Tests/PlayMode/NavigationApresGestePlayModeTests.cs`. Les `.meta` des deux fichiers neufs sont posés par
Unity : **non mesuré** hors porte, à vérifier au créneau.

## 5. Gardes — toutes dans ce lot (B2)
- **G1 BIJECTION (pure)** : `EcransServis` = exactement les 4 chaînes du back, comparées une à une, **compte asserté = 4** ;
  `EcransMenes` ∪ `EcransInconnusAssumes` = `EcransServis`, **intersection vide**, 3 + 1 = 4 ; chaque membre d'`EcransMenes`
  a `Pour(…) ≠ Aucune` et chaque membre d'`EcransInconnusAssumes` a `Pour(…) == Aucune`. ⇒ les 4 valeurs du back sont toutes
  **CLASSÉES**. *Contrôle positif* : le même corps rejoué sur une liste amputée d'une valeur **DOIT** rougir.
- **G2 EFFET (écrite et typecheckée dans ce lot, jouée au prochain créneau)** : réponse 200 `navigate` /
  `navigate_screen = "exceptions_queue"` posée hors réseau (`DecisionAccepteePourTest`, `HighestLeverageCardController.cs:250`)
  ⇒ `ContentSlot.GetComponentsInChildren<ExceptionQueueController>(false).Length == 1` **et**
  `…<HighestLeverageCardController>(false).Length == 0` **et** `RelecturesApresDecision` inchangé. *Anti-vacuité* : la cible
  INERTE est `ExceptionQueuePanelController` (la ligne de l'Accueil), jamais un `ExceptionQueueController` — un compte qui ne
  distinguerait pas les deux serait vrai sans rien monter. Second cas : `"autonomy_reports"` ⇒ 1 `AutonomyInboxController`.
- **G3 INCONNU** : `"supply_chain_trace"`, `"ecran_qui_n_existe_pas"`, `null`, `""` ⇒ 0 cible montée,
  `NavigationsInconnues == 1` par cas, `RelecturesApresDecision == 1`, journal portant la valeur reçue.
  *Contrôle positif (B3)* : **écran CONNU** (`"exceptions_queue"`) ⇒ `NavigationsInconnues == 0` **et** 1 cible montée.
- **G4 DÉTECTEUR ⑤ (pure)** : `HlCardClient.CorpsDuCommit(null) == "{}"` ⇒ ⑤ est sur le chemin `noted` ; rougit le jour où ⑤
  posera une option (TD-983).
- **G5 EFFET « Lire maintenant » (§6, dans ce lot)** : (a) 200 `navigate`/`autonomy_reports` ⇒ `CommitRequestCount == 1` **et**
  1 `AutonomyInboxController` monté **et** 0 `HighestLeverageCardController` ; (b) refus servi (409 `already_resolved`) ⇒
  `CommitRequestCount == 1`, 1 `AutonomyInboxController` monté **quand même**, `RefusRendu` = la phrase SERVIE (non vide),
  **0** `DecisionDetailScreenController` monté (pas de table feutre sous les rapports, §6).
  **(b) EFFET du puits (§6b)** : sur un chargement de c7 **RÉUSSI**, un enfant de `rowsArea` nommé `"Error"` existe **et son
  texte est exactement `client.DernierePhraseDeRefus`** — la phrase **SERVIE**, jamais `RefusRendu` (B) —, asserté sur le
  TEXTE car `RenderError()` (`:264`) produit un homonyme avec un autre littéral (V19-8). *Contrôle* : même scénario **sans**
  phrase servie (corps de refus muet ⇒ `DernierePhraseDeRefus` nulle) ⇒ **aucun** enfant `"Error"` issu de ce chemin, et en
  particulier **pas** le littéral « La décision n'a pas été prise. » (toujours sur un chargement réussi : un chargement en
  échec fabriquerait un homonyme et la garde mesurerait autre chose).

**V19 — huit questions.** (1) ÉVÉNEMENT : une 5ᵉ valeur de `screen` au back, ou une des 4 renommée ⇒ G1 rougit ; classe
DONNÉE (chaînes). (2) DÉGÉNÉRÉ : une table vide, ou un `navigate` à `screen` nul, rendraient vraie une simple inclusion ⇒ G1
asserte le COMPTE **et** l'appartenance dans les deux sens, et `EstUneNavigation` lit `outcome`, pas `navigate_screen`.
(3) EFFET : G1 et G4 ne sont que des paramètres ; G2/G3/G5 comptent l'écran **monté** dans `ContentSlot`. (4) CONTRÔLES
POSITIFS : liste amputée (G1), écran CONNU (G3, B3), option posée par ⑤ (G4) ; anti-vacuité de G2 sur la cible INERTE
`ExceptionQueuePanelController`. (5) VALEUR d'une clé PRÉSENTE : G2/G5 partent d'un corps de SUCCÈS (`committed:true`,
`outcome:"navigate"`, `navigate_screen:"…"`), jamais d'une absence. (6) DIMENSIONNÉ : 3 écrans menés + 1 inconnu assumé + 2
valeurs hors table + 1 refus servi = 7 cas nommés. (7) LIGNES ACTIVES : G1 lit la table C# compilée — ni commentaire, ni
ordre de tableau, ni index. (8) MÊME CLÉ : tous les comptes de G2/G3/G5 sur `ContentSlot.GetComponentsInChildren<T>(false)`
— même racine, même inclusion d'inactifs.

## 6. Q1 retenu — « Lire maintenant » (104) passe par `RequestCommit(0)`
`OuvrirLesRapports()` (`HighestLeverageCardController.cs:180-186`, câblé `:515`) devient le lanceur d'une coroutine :
1. `if (!EstCarteDesRapports) return;` (inchangé, `:182`).
2. `yield return RequestCommit(HlCardClient.OptionAgir);` — `OptionAgir = 0` **recopié** de `HlCardClient.cs:47`. Le back
   navigue **et** réclame la carte (`hl-card.service.ts:260`, `:269`) ⇒ elle disparaît une fois lue.
3. **Chemin heureux** : `RequestCommit` a déjà appelé `TrancheePourDeBon` (`:219`), donc `OnNavigate` est parti (§3a) et le
   shell a monté c7 par `SuivreLaNavigation`. ④ ne monte rien.
4. **Refus ou échec** (ruling f2) : on ouvre **quand même** les rapports. Condition **locale et mesurable**, lue sur l'état
   que `RequestCommit` pose déjà : `LastCommitError != null` **ou** `LastCommitCommitted != true` **ou**
   `DerniereReponse.outcome != "navigate"` ⇒ `MonterLesRapports()`. La carte **reste** (aucun `committed`).
   **Corps de `MonterLesRapports()`** = celui de `:183-185` (mesuré : `IShellNavigator nav = ShellNavigatorLocator.Find();`
   `:183` · `if (nav != null) nav.MonterLocataireEnSurimpression<…AutonomyInboxController>();` `:184` ·
   `RapportsOuverts = true;` `:185`), avec **deux changements** : on **garde le composant rendu** par `:184`, et on l'annonce
   **tout de suite** — `rapports?.AnnoncerUnRefus(client.DernierePhraseDeRefus)` (§6b).
   ⛔ **A** : c'est bien **④** qui appelle, pas `AppShell` — un refus n'a pas d'`outcome navigate`, donc `SuivreLaNavigation`
   n'est jamais entrée ici et un appel côté shell serait **inatteignable** sur le seul chemin qui l'exige.
   ⛔ **B** : la valeur passée est `client.DernierePhraseDeRefus` — la phrase **SERVIE seule**, `null` quand rien n'est servi
   (alors rien n'est posé). **Jamais `RefusRendu`** : `:221-222` le fait retomber sur le littéral client « La décision n'a pas
   été prise. », ce qui afficherait une phrase **inventée** et rendrait G5 (b) verte contre son propre contrôle. `RefusRendu`
   reste ce qu'il est (posé sur `stateText` `:223`, crochet de test de ④).
5. ⛔ Sur ce chemin de repli, ④ **ne doit pas** faire monter ⑤ : `RequestCommit` lève `LeverLApres` sur un refus à clé servie
   (`:225`), ce qui monterait la table feutre **sous** les rapports (deux écrans pour un geste). ⇒ le geste « lire » passe par
   une variante de `RequestCommit` qui **n'appelle pas** `LeverLApres` sur le refus (un drapeau d'appel, pas un second chemin
   réseau : `RequestCommitViaTypedConfirm` `:259-264` est le précédent d'un déclencheur qui réutilise le MÊME corps).

### 6b. Q4 tranchée = (c) — la phrase servie s'AFFICHE dans c7. Ancres `grep -n`, lignes collées
Fichier : `Assets/Scripts/Operational/Autonomy/AutonomyInboxController.cs`.
```
68:        public string PhraseDuRefus { get; private set; }
97:        private void Start()
99:            EnsureInitialized();
100:            StartCoroutine(Boot());
154:        public IEnumerator LoadReports()
170:            ReportsLoaded = false;
171:            ReportsError = null;
180:                RenderError();
186:            Render();
197:            PhraseDuRefus = null;
207:                PhraseDuRefus = client.DernierePhraseDeRefus
220:        private void Render()
236:            if (!string.IsNullOrEmpty(PhraseDuRefus))
238:                TextMeshProUGUI errLine = NewText("Error", rowsArea, PhraseDuRefus, 13, TextAlignmentOptions.Left);
260:        private void RenderError()
264:            TextMeshProUGUI err = NewText("Error", rowsArea, "La boîte n'a pas répondu.", 14, TextAlignmentOptions.Left);
```
c7 **a déjà l'élément** : bloc `"Error"` `:235-242` (garde `:236`, élément `:238`, `AccentSevere` `:239`). `LoadReports`
(`:154-188`) **ne remet pas** `PhraseDuRefus` à null — il ne touche que `ReportsLoaded`/`ReportsError` (`:170-171`) puis
`Render()` (`:186`) ; le **seul** site qui l'annule est `Resolve` (`:197`). Et c7 pose déjà sa valeur depuis la **phrase
servie**, avec **son propre repli** (`:207-209` : `client.DernierePhraseDeRefus ?? Libelle.Gabarit("autonomie.refus.…")`).
⇒ **puits minimal, aucun élément visuel neuf** : `public void AnnoncerUnRefus(string phraseServie)` — pose `PhraseDuRefus`
**si `phraseServie` est non vide**, sinon **rien** (jamais effacer une phrase existante, jamais ajouter un second repli :
celui de `:208-209` est déjà le repli de c7), puis `if (initialized) Render();`.
**Drapeau nommé (mineur)** : `initialized` (`:78`), armé par `EnsureInitialized()` (`:103-106`), celui qui bâtit `headerText`
(`:450`) et `rowsArea` (`:462`) — les deux objets que `Render()` touche. C'est donc la condition *« la mise en page existe »*,
la seule qui rende `Render()` sûr.
**Ordre tranché** : ④ appelle `AnnoncerUnRefus` dans la **fenêtre SYNCHRONE du montage**, sur le composant **rendu** par
`MonterLocataireEnSurimpression<T>()` — contrat écrit `ShellContracts/IShellNavigator.cs:29-31` (« Rend le composant monté,
pour que l'appelant l'initialise AVANT son `Start()` (différé d'une frame après `AddComponent`) »), même créneau que
`SetToken`. Dans cette fenêtre `initialized` est **faux** (c'est `Start()` `:99` qui l'arme) ⇒ **aucun `Render()` prématuré**,
et le premier rendu est celui de `LoadReports` (`:186`), qui lit la phrase déjà posée. Le `Render()` conditionnel ne sert que
si l'écran était **déjà** monté et rendu.
⚠️ **Écart mesuré, consigné** : `RenderError()` (`:260-269`, emprunté quand `GetReports` échoue — appel `:180`) fabrique **sa
propre** ligne nommée `"Error"` (`:264`) avec le littéral « La boîte n'a pas répondu. » et **ignore `PhraseDuRefus`** ⇒ sur un
chargement de c7 en échec, la phrase servie est écrasée. Deux producteurs, **même nom d'objet** : la garde asserte le
**TEXTE**, jamais la présence d'un enfant `"Error"` (V19-8), et sur un chargement **réussi**. ⇒ TD-987.

## 7. Dettes (plage TD-980/989 ; TD-980 retirée par le ruling Q2)
- **TD-981** `supply_chain_trace` (106) : aucun écran de trace ⇒ branche inconnue assumée. Hôte futur ㉚
  `ChaineDApproScreenController`, qui ne sait pas recevoir `building_ids` (`:192`, `:98`). Se ferme avec TD-985.
- **TD-982** `navigate_ids` **IGNORÉS** sur les écrans menés (⑨ `OpenDetail` prend un DTO `:212` ; c7 `LoadReports` charge
  tout `:154`) : aucun ne sait se centrer ni filtrer. Écart assumé.
- **TD-983** ⑤ poste `{}` (`DecisionDetailScreenController.cs:356` + `HlCardClient.cs:51`) ⇒ `noted` : branche navigate
  **dormante** ; détecteur G4.
- **TD-985** (classe A/B, NEW) ㉚ `AppliquerChaine` (`:611-637`) **ne rend aucun nœud** : label (`:615-619`) + au plus un
  message (`:625-637`), `null` dès qu'un nœud n'est pas `silent` (`ToutSilencieux` `:234`) ⇒ écran muet sur une chaîne
  vivante. **Détecteur** : un `GetSupplyChainGraphResponseDto` à ≥ 1 nœud non `silent` ⇒ `chaineRoot` ne porte que le label
  (compte d'enfants asserté) ; rougit quand les nœuds seront rendus. Ticket suivant ; à sa fermeture, 106 → ㉚.
- **TD-986 : RETIRÉE** (ruling f2, Q4 = (c)) — le puits est dans ce lot (§6b), c7 avait déjà l'élément.
- **TD-987** (NEW, classe C) `RenderError()` (`AutonomyInboxController.cs:260-269`) écrase la phrase servie par son propre
  littéral sous le **même nom d'objet** `"Error"` : un refus annoncé par `AnnoncerUnRefus` est invisible si le chargement de
  c7 échoue au même instant. Se ferme quand `RenderError` lit `PhraseDuRefus` (ou quand les deux lignes portent des noms
  distincts). Détecteur : la garde du contrôle de G5 (b), qui ne tient que sur un chargement réussi, le dit déjà.
- **Écart consigné (non chiffré en dette)** : le pied des escalades de ⑨ est inerte (`:998`, `:1171`) — 103 mène à l'écran qui
  porte le total, pas à une liste des escalades.

## 8. Questions restantes
Aucune. Q1 à Q4 tranchées par f2 le 11/11 ; Q4 = (c), appliquée en §4, §6b, G5 (b) et §7.
