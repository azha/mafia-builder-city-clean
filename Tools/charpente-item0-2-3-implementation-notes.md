# Items 0.2 + 0.3 (+ 0.3-bis) — implementation-notes.md

Design : `Tools/charpente-item0-2-3-design.md`. Périmètre : le dock ratifié (Empire · Famille ·
Filière · Plus), Empire = fusion de `Tab.Home`/`Tab.City` (EST la carte), la porte d'entrée du
district, et le retrait paraphrasé de l'énoncé daté d'`AppShell.cs`. **Round 3** étend le périmètre,
assumé par le contrôleur : la classe DESTINATION du dock (§ BLOQUANT 1) et le branchement minimal de
l'ouverture de session (décision B, § BLOQUANT 2) — le RENDU de cet écran reste l'item 0.5.

Logs bruts conservés hors du dépôt : `/tmp/charpente-0203/*.log` (round 1),
`/tmp/charpente-0203-r2/*.log` (round 2) et `/tmp/charpente-r3/*.log` (round 3 — seul fichier neuf
laissé dans `Tools/` ce round : `Tools/charpente-item0-2-3-implementation-notes.md` lui-même
(modifié) + `Assets/Tests/PlayMode/CharpenteOuvertureSessionOverlayPlayModeTests.cs` (neuf) ; le
design était déjà déposé par le contrôleur).

Méthode de run, identique au précédent d'item 0 (round 2) : les runs de contrôle négatif et de
vérification de correctif sont **scopés à la catégorie `Charpente` seule** (narrowing temporaire de
`Assets/Editor/MafiaCI.cs:Categories` à `{ "Charpente" }`, restauré à `{ "W4P4a", "W3UDA", "W3U1",
"W3U2", "Charpente" }` avant toute mesure finale). Le juge **complet** (5 catégories) a maintenant
été lancé **HUIT fois** au total (round 1 : deux — préliminaire + clôture ; round 2 : une
troisième ; round 3 : une quatrième — réconciliation § « Run complet du juge »). Round 4 en ajoute
une **cinquième** (§ Run E) et une **sixième** (§ Run F). Round 5 en ajoute une **septième**
(§ Run G) et round 6 une **huitième** (§ Run H, ci-dessous).

---

## ✅ FERMETURE DE L'OVERLAY ACCUEIL — LIVRÉE round 7 (historique de l'écart au ruling, rounds 4-6, ci-dessous)

Le ruling user 2026-08-25 (ratifié, `front.md` §4) dit : « posée en surimpression au-dessus de
l'Empire, **PUIS ON TOMBE SUR LA VILLE**. » Rounds 4-6 ne livraient que la première moitié, sur la
foi d'une raison mesurée **FAUSSE**, écrite ici même round 4 : « aucun mécanisme de démontage
n'existe dans `IShellNavigator`/`IShellTenant` — `MonterLocataireEnSurimpression<T>` MONTE, rien ne
DÉMONTE. » **Round 7 (revue ⊥) l'a réfutée par TROIS artefacts DE CE LOT, déjà présents avant ce
round et jamais relus ensemble** — « je change de décision, et c'est la mesure qui me le fait
faire » :
1. `AppShell.cs:298` — `ExitToCityMap() => ActivateTab(Tab.Empire)`, DÉJÀ câblé pour sortir d'un
   district (§3.3, jamais réutilisé pour l'overlay Accueil avant ce round).
2. `Tools/charpente-item0-2-3-design.md:109` et `:146` (F0.3-bis) : « le nom « ← Carte » du bandeau
   reste juste » / « l'action de tête du bandeau (« ← Carte ») ramène à la carte » — le geste et sa
   copie N'ÉTAIENT PAS spécifiés nulle part pour l'Accueil, mais ils l'étaient déjà pour le district,
   avec le MÊME mécanisme (`TopBar.SetLeadingAction`).
3. **F-A elle-même** (ci-dessous, inchangée depuis round 4), qui prouve depuis longtemps qu'une
   activation d'onglet détruit l'overlay — le retour à la carte était déjà résolu, jamais rebranché
   sur un second déclencheur.

⇒ **Livré, ZÉRO mécanisme neuf** : `TopBar.SetLeadingAction(TopBarController.LeadingAction.
BackToMap, ExitToCityMap)`, deux lignes, posées APRÈS `MonterLocataireEnSurimpression
<DashboardController>()` sur les DEUX branches d'`AcquireSessionThenActivateHome` (`AppShell.cs`,
branche repli-échec et branche succès) — APRÈS, parce qu'`ActivateTab` remet l'action de tête à
`None` (son propre reset défensif §3.3) : la poser avant l'aurait fait écraser. Vérifié par
contrôle négatif SUR LES DEUX BRANCHES (§ Deviations, entrée 10 réécrite ci-dessous, et § Run
round 7 plus bas) : ligne désarmée ⇒ les DEUX falsifiables positives rougissent, chacune nommant sa
propre branche ; restaurée ⇒ `passed=22 failed=0`.

**F-B, qui épinglait l'ABSENCE de cette fermeture (rounds 4-6, patron `toBe(404)` du socle), a été
REMPLACÉE round 7** — « une épingle qui documente un trou devient inutile quand le trou est
bouché » — **par DEUX falsifiables POSITIVES** (une par branche d'acquisition) qui cliquent
RÉELLEMENT l'action de tête (`ProductionClickSupport.Click`, jamais `onClick.Invoke()` nu) et
prouvent que l'overlay disparaît et que `CityMapController` est révélé — MÊME assertion que F-A,
déclenchée par le bouton DÉDIÉ plutôt que par le dock. F-A reste inchangée : un SECOND chemin,
générique, qui coexiste avec l'action de tête dédiée.

⇒ **La seconde moitié du ruling est livrée.** Ce qui reste à l'item 0.5 est inchangé : le RENDU
propre du Dashboard (les 4 panneaux orphelins de l'écran ④) — jamais la fermeture, désormais close.

---

## ⛔⛔ ROUND 2 — revue ⊥ NOT_APPROVED (1 bloquant déjà fermé ailleurs, 4 majeurs, 3 mineurs) — correctifs

Le code du GESTE round 1 a été jugé bon ; ce qui bloquait, ce sont des gardes aveugles et des
attestations trop larges. Section par section, ce round :

- **C-α / MAJEUR M2** (§ « F0.2 — Round 2 ») : la garde d'ensemble sur les libellés était aveugle à
  la CORRESPONDANCE bouton↔libellé — la revue l'a EXÉCUTÉ (permutation en production, tout restait
  vert). Corrigé : `F0.2` asserte désormais des PAIRES. Balayage de la classe sur 5 sites de la
  population (ce lot + lot 0.4) : 1 corrigé, 1 déjà compensé par un test voisin (`F0.4-a`/`C5`), 3
  hors classe. Contrôle négatif ré-exécuté (armé/désarmé), sorties collées.
- **C-β / MAJEUR M3** (§ « C7 ») : `AppShell.Tab`, re-façonné par ce lot, n'avait AUCUN détecteur
  d'exhaustivité. Nouveau test `C7` (même patron que `C5`, item 0.4). Balayage : 1 seul `switch`
  dans les 8 fichiers de ce lot (sur `Tab`, fermé par `C7`) ; celui de `NavTarget` (lot 0.4) déjà
  fermé par `C5`. Contrôle négatif exécuté (case retirée du `switch`), sorties collées.
- **C-γ / MAJEUR M1** (§ « C-γ ») : `ChromeTabBarPlayModeTests.cs` et
  `VuePrincipaleCapturePlayModeTests.cs` (2 des 8 fichiers touchés) ne sont dans AUCUNE catégorie du
  filtre `MafiaCI.cs` — jamais exécutés par ce lot ni le précédent. **Catégories NON ajoutées au
  filtre** (consigne explicite) : la section documente honnêtement la portée réelle de
  l'attestation plutôt que d'élargir le filtre à l'aveugle.
- **MAJEUR M4** (§ « Run complet du juge ») : la réconciliation `194+4+1=199` reposait sur UNE seule
  observation où `StaleAbandonedShell` était vert. Un troisième run (le mien, ci-dessous) et le run
  de la revue sont maintenant TOUS DEUX présentés : `StaleAbandonedShell` est ROUGE sur 2/3 mesures
  indépendantes — pré-existant sur `af9893b`, intermittent, pas introduit par ce lot (raisonnement
  détaillé § dédiée), mais plus qualifié de « MARGINAL/FLAKY » comme s'il était clos.
- **MINEUR m1** : les numéros de ligne `:183`/`:221` (§ C-b) et `:669-672` (§ Désambiguïsation)
  n'ont jamais existé à ces valeurs — sortie `grep -n` lue via la couche d'affichage proxifiée.
  Corrigés à l'oracle (`331`/`367` et `711-712`).
  ⛔⛔ **RÉFUTÉ round 3 (majeur + mineur m1 round 3)** : l'attestation qui suivait ici — « TOUS les
  autres numéros de ligne de ce document ont été re-vérifiés à l'oracle Python/`$( )` (aucun autre
  écart trouvé) » — était FAUSSE. Deux contre-exemples SURVIVAIENT dans le même document au moment
  où elle a été écrite : (a) `Sortie réelle` du run C (§ « Run complet du juge ») collait `303`,
  byte-différent du log qu'elle cite (`304`, `full-run-THIRD.log`) ; (b) `package.json:5` (§ F0.2
  round 2) désignait la ligne `"unity": "2019.4"`, pas la ligne qui porte le fait cité (la
  description NUnit 3.5, `:6`). Une attestation de re-vérification exhaustive n'est une preuve que
  si l'exhaustivité a réellement eu lieu — ici elle ne l'avait pas. Les deux sont corrigés round 3
  (§ MAJEUR round 3, § MINEUR m1 round 3) ; **tous les numéros de ligne de ce document ont été
  RE-vérifiés à l'oracle Python round 3** (voir § Round 3 pour la méthode).

  ⛔⛔⛔ **RÉFUTÉ UNE SECONDE FOIS, round 4 (revue ⊥, MAJEUR)** — l'attestation ci-dessus était ELLE
  AUSSI fausse. Quatre ancres (§ C-b : `AppShell.cs:331`/`:367` ; § F0.2 contrôle négatif :
  `AppShell.cs:751` ; § F0.3 contrôle négatif : `AppShell.cs:177`) vivaient TOUTES dans des sections
  à delta **ZÉRO octet** entre `535dd87` et `653acf8` — round 3 a inséré 45 lignes AILLEURS dans
  `AppShell.cs` (extraction du sentinel en variable booléenne, branchement de l'overlay) qui les a
  décalées, et la « re-vérification exhaustive round 3 » ne les a pas rouvertes PARCE QUE leur texte
  n'avait pas changé. Même mécanisme que le socle CLAUDE.md « le défaut peut aussi vivre à la
  jointure : un texte inchangé dans un document corrigé devient faux si la correction a bougé ce
  qu'il référence » — ici appliqué à un NUMÉRO DE LIGNE plutôt qu'à une clause de prose. Les quatre
  sont corrigées round 4 (§ C-b, § F0.2, § F0.3).

  ⇒ **Attestation round 4, SCOPÉE ET DATÉE** (pas une nouvelle promesse d'exhaustivité globale —
  précisément la forme que cette classe de faute a fait échouer deux fois) : les ancres numériques
  des sections **§ C-b**, **§ F0.2 (contrôle négatif)** et **§ F0.3 (contrôle négatif)** de ce
  document ont été vérifiées contre le blob `git show 653acf8:Assets/Scripts/Shell/AppShell.cs`
  (commande + sortie collées dans chacune de ces trois sections), le **2026-08-26**. Aucune AUTRE
  section de ce document n'a été rebalayée pour cette passe — une revue future qui s'appuierait sur
  un AUTRE numéro de ligne cité ici doit le re-dériver lui-même contre le SHA courant plutôt que de
  le tenir pour acquis depuis cette attestation.

  ⇒ **Fermeture de la CLASSE (demandée par la revue)** : d'où vient le fait qu'une ancre se périme
  sans qu'on le voie ? Une correction de round N ne relit QUE les sections dont LE TEXTE a changé
  (diff non vide) — elle ne considère jamais qu'une section à delta ZÉRO peut citer un numéro de
  ligne d'un FICHIER TIERS qui, lui, a bougé. Le dispositif qui fermerait la classe, structurellement
  plutôt que par vigilance : **ne jamais citer un numéro de ligne nu dans ce document sans
  l'accompagner de la commande qui l'a produit** (patron déjà appliqué en § C-a — `git show
  <sha>:chemin | grep -n …` — mais jamais généralisé aux ARMÉs de contrôle négatif, qui citaient une
  ligne en PROSE sans la commande à côté). Une ancre accompagnée de sa commande se RE-DÉRIVE en
  ré-exécutant contre HEAD ; une ancre nue ne peut que se PÉRIMER en silence. Les trois corrections
  ci-dessus appliquent désormais ce patron ; le reste du document ne l'a pas encore, et n'est donc
  pas couvert par cette attestation.
- **MINEUR m2** (§ mineurs, VuePrincipaleCapturePlayModeTests.cs) : `yield return null;` ajouté
  entre le re-tap `ActivateTab(Tab.Empire)` et `FindFirstObjectByType<CityMapController>()`.
- **MINEUR m3** : le littéral retiré par 0.3-bis était reproduit verbatim EN PROSE dans ce document
  (§ F0.3-bis) et en commentaire dans `CharpenteMontageLocatairesPlayModeTests.cs` — paraphrasé,
  désigné par index dans les deux (le code qui EXÉCUTE la mesure — la constante et les commandes
  `grep -cF` — garde le littéral, c'est légitime ; seule la PROSE qui l'expliquait le citait à tort).

⚠️ **Piège nouveau mesuré ce round** : la commande `diff` NUE (pas `git diff`) a rendu un FAUX
« files are identical » sur `AppShell.cs` juste après une édition réelle — détecté uniquement parce
que la vérification suivante utilisait un oracle Python. Toutes les vérifications de restauration
de ce round ont donc été refaites via oracle Python, jamais via `diff` nu (détail § F0.2 Round 2).

---

## ⛔⛔ ROUND 3 — revue ⊥ NOT_APPROVED (2 bloquants, 1 majeur, 3 mineurs) — correctifs

Les correctifs du round 2 tiennent tous (permutation, doublons, enum, honnêteté de portée,
paraphrase, justification NUnit — TOUS reproduits par le relecteur). Ce qui bloquait ce round : deux
CLASSES non fermées.

- **BLOQUANT 1** (§ « BLOQUANT 1 — round 3 ») : `F0.2` (round 2) avait fermé la classe « aveugle à la
  CORRESPONDANCE » sur l'attribut LIBELLÉ seul — l'attribut DESTINATION (l'`onClick` du bouton) était
  resté ouvert, et c'est le SEUL qui décide de l'atteignabilité. Le relecteur l'a armé sur UNE
  variable, UN site (`AppShell.cs:835` à l'époque, `b.onClick.AddListener(() => ActivateTab(tab))` →
  `ActivateTab(Tab.Empire)`) : `Charpente` restait 15/0, juge complet inchangé. Nouveau test
  `F0.2-b` : un CLIC RÉEL sur chaque bouton du dock, comparé à une table de destinations ÉCRITE
  INDÉPENDAMMENT ; ferme AUSSI l'attribut ORDRE (jamais couvert par `F0.1-a`/`F0.2`,
  `CollectionAssert.AreEquivalent` étant insensible à l'ordre). Population RE-FAITE sur la bonne
  classe (« les correspondances que le DOCK transporte », pas « les assertions de test ») : 5
  attributs recensés, 2 fermés ici, 2 déjà fermés (nom, libellé), 1 hors-classe consigné
  (indicateur d'actif — style, pas atteignabilité). Contrôle négatif RÉ-ARMÉ à l'identique du
  relecteur, ROUGIT en nommant `Tab_Org`, restauré (oracle Python, IDENTICAL), re-vert confirmé.
- **BLOQUANT 2** (§ « BLOQUANT 2 — round 3 ») : débrancher `DashboardController` de TOUT onglet
  (round 1) l'a aussi débranché de TOUTE production — ses 4 seuls appelants
  (`BuildingCardController`/`ExceptionQueueController`/`AutonomyInboxController` via `OpenNav`,
  `ExceptionDetailController` via `ExceptionQueueController.OpenDetail`) devenaient injoignables
  (forme C du socle). Geste ASSUMÉ par le contrôleur (scope étendu, explicitement autorisé) : la
  décision B déjà ratifiée par l'user (« l'Accueil devient l'ouverture de session, posée en
  surimpression au-dessus de l'Empire ») branchée MINIMALEMENT — `AppShell.
  AcquireSessionThenActivateHome` monte désormais `DashboardController` EN SURIMPRESSION
  (`MonterLocataireEnSurimpression<T>`, item 0.4, AUCUN mécanisme nouveau) juste après avoir activé
  Empire, sur les DEUX branches, gardé par LE MÊME sentinel `(Tab)(-1)` que `ActivateTab(Tab.Empire)`.
  Nouveau fichier `CharpenteOuvertureSessionOverlayPlayModeTests.cs` : la chaîne ENTIÈRE (Dashboard
  NON fabriqué par le test → 5 boutons nav → ExceptionQueue → ExceptionDetail sur une carte SEEDÉE)
  atteinte par des gestes de production uniquement, anti-vacuité par liste NOMMÉE. Contrôle négatif
  (les 2 sites de montage retirés, simulant l'état round 2) ROUGIT en nommant le Dashboard manquant,
  restauré (oracle Python, IDENTICAL), re-vert confirmé. **Rendu propre des 4 panneaux orphelins
  (l'écran ④ lui-même) reste l'item 0.5, non repris — seule leur ATTEIGNABILITÉ est ce lot.**
- **MAJEUR** (§ « Run complet du juge », run C) : `Sortie réelle` collait `303`, byte-différent du
  log qu'elle cite (`/tmp/charpente-0203-r2/full-run-THIRD.log`, qui dit `304` — re-lu à l'oracle
  `grep -a`). Corrigé ; l'attestation « tous les numéros de ligne re-vérifiés, aucun écart » (round 2,
  MINEUR m1) était donc FAUSSE — RETRACTÉE (§ MINEUR m1 ci-dessus) et refaite entièrement round 3.
- **MINEUR m1** : `package.json:5` (§ F0.2 round 2) désignait `"unity": "2019.4"` — le fait cité
  (NUnit 3.5) vit à `:6`. Corrigé.
- **MINEUR m2** (§ « C7 — round 2 ») : le balayage `switch *(` collait `1` (mesuré round 2, AVANT
  que la docstring de `C7` n'existe) ; ré-exécuté sur l'état LIVRÉ round 3, il rend `3` — 2 des 3
  étant AUTO-RÉFÉRENTIELS (la docstring de `C7` cite verbatim `` `switch (tab)` `` deux fois pour
  expliquer ce qu'elle ferme). Refait à la forme du socle : AVANT (`af9893b`, re-mesuré : 1) / APRÈS
  (round 3, motif nu : 3, classé ligne par ligne) ; population RÉELLE (switch statements exécutables)
  inchangée à 1. Vérifié en plus : aucun `if/else`/ternaire de production n'échappe au `switch`
  unique (52 références `AppShell.Tab.<membre>` hors `AppShell.cs`, toutes en code de TEST).
- **MINEUR m3** : `303 − 201 = 102` (§ C-γ) survit-il round 3 ? Re-mesuré sur le run complet réel :
  `306 − 204 = 102` — les 3 tests ajoutés depuis (`C7`, `F0.2-b`, `BLOQUANT2_...`) sont TOUS
  `[Category("Charpente")]`, donc dans le côté FILTRÉ, jamais dans les 102 exclus. Confirmé.

★ **Le motif de méthode qui vaut plus que les deux BLOQUANT** : round 2 avait balayé « quelles
AUTRES GARDES assertent des paires » (population = les assertions de test) et conclu 5 sites/1
vulnérable — exact sur SA population, à côté de LA classe, qui porte sur « les correspondances que
le DOCK transporte » (nom, libellé, ordre, destination, indicateur d'actif). Le même document
applique par ailleurs la règle « anti-tautologie » à `EnterDistrict`/F0.3 (un geste RÉEL, jamais la
méthode appelée directement) sans se l'appliquer À LUI-MÊME sur le dock — `C7` appelle
`shell.ActivateTab(membre)`, exactement la forme qu'il proscrit ailleurs. Reconnu, corrigé, et la
classe est désormais fermée sur SA population réelle, avec le compte collé § BLOQUANT 1.

---

## ⛔⛔ ROUND 4 — revue ⊥ NOT_APPROVED (1 bloquant, 2 majeurs, 4 mineurs) — correctifs

Les correctifs des rounds 2-3 tiennent tous (contrôle négatif de destination reproduit et nommant
`Tab_Org`, garde anti-tautologie F0.3 vérifiée sans `new GameObject`, rayon de l'overlay validé).
Un seul défaut bloquait, et il était d'un cran plus bas que le round 3 : le GESTE de clic lui-même.

⚠️ **« 2 MAJEURS » du titre ci-dessus, clarifié par le contrôleur** : le mandat transmis à
l'implémenteur n'en détaillait qu'UN (l'attestation d'ancres périmée, § MAJEUR ci-dessous) — le
second (contradiction entre le design et le livré) avait DÉJÀ été corrigé par le contrôleur dans
`Tools/charpente-item0-2-3-design.md` avant dispatch. L'implémenteur a signalé l'écart plutôt que
d'inventer un second finding pour faire correspondre le compte — confirmé comme le bon geste.

- **BLOQUANT** (§ « ProductionClickSupport ») : `bouton.onClick.Invoke()` — utilisé par les 3 tests
  écrits par ce lot ET par 4 tests pré-existants du dépôt — appelle directement la `UnityEvent`,
  court-circuitant les DEUX gardes de `Button.Press()` (`IsActive()`/`IsInteractable()`). Mesuré par
  la revue : `b.interactable = false` sur UNE bulle (`Tab.Org`) laissait `F0_2b` VERT — un dock mort
  au doigt, certifié atteignable.

  **Fermeture STRUCTURELLE** (choisie sciemment, pas deux assertions ajoutées à côté — raisonnement
  dans le fichier lui-même) : nouveau fichier `Assets/Tests/PlayMode/ProductionClickSupport.cs`
  (`MafiaCleanCity.Tests`, même précédent DRY que `SeederSupport.cs` — utilitaire PARTAGÉ entre
  fichiers PRÉ-EXISTANTS et fichiers `Charpente`, contrairement au reste du chrome de scène/probe
  qui se DUPLIQUE volontairement par fichier). `ProductionClickSupport.Click(Button)` invoque
  `IPointerClickHandler.OnPointerClick` via `ExecuteEvents.Execute(..., ExecuteEvents.
  pointerClickHandler)`, qui appelle `Button.Press()` — les DEUX gardes sont donc honorées PAR TOUT
  appelant, y compris un site écrit demain qui oublierait de les vérifier à la main.

  **Balayage de la CLASSE, population = tout site d'`Assets/Tests` qui « appuie » sur un `Button`**
  (`grep -rn '\.Invoke(' Assets/Tests`, exclu les commentaires) :

  | # | site | AVANT (round 3) | APRÈS (round 4) |
  |---|---|---|---|
  | 1 | `NavigationPlayModeTests.cs` (Entrer, nav-F1) | `enterBtn.onClick.Invoke()` (interactable déjà vérifié) | `ProductionClickSupport.Click(enterBtn)` |
  | 2 | `NavigationPlayModeTests.cs` (← Carte, nav-F2) | `backBtn.onClick.Invoke()` (SEUL `activeSelf` vérifié, PAS `interactable`) | `ProductionClickSupport.Click(backBtn)` |
  | 3 | `AppShellPlayModeTests.cs` (Entrer) | `enterBtn.onClick.Invoke()` (interactable déjà vérifié) | `ProductionClickSupport.Click(enterBtn)` |
  | 4 | `CharpenteMontageLocatairesPlayModeTests.F0_3` (Entrer) | `enterBtn.onClick.Invoke()` (interactable déjà vérifié) | `ProductionClickSupport.Click(enterBtn)` |
  | 5 | `CharpenteMontageLocatairesPlayModeTests.F0_2b` (dock, ×4) | `bouton.onClick.Invoke()` — **AUCUNE garde** | `ProductionClickSupport.Click(bouton)` — **LE BLOQUANT** |
  | 6 | `CharpenteOuvertureSessionOverlayPlayModeTests` (5 boutons nav Dashboard) | `bouton.onClick.Invoke()` — **AUCUNE garde** | `ProductionClickSupport.Click(bouton)` |
  | 7 | `CharpenteOuvertureSessionOverlayPlayModeTests` (Ouvrir, carte d'exception) | `ouvrir.onClick.Invoke()` — **AUCUNE garde** | `ProductionClickSupport.Click(ouvrir)` |

  **Compte : 7 sites, 7 corrigés.** Un 8ᵉ site existe (`CharpenteMontageLocatairesPlayModeTests.cs`,
  ~ligne 556, `openNav.Invoke(dash, …)`) mais c'est un appel de **réflexion** sur une `MethodInfo`
  (`F0.4-a`, item 0.4 DÉJÀ CLOS) — le fichier le dit lui-même : « sur l'EFFET, JAMAIS sur l'appel »
  — il ne prétend PAS prouver l'atteignabilité par un geste de joueur (il exerce le mécanisme de
  `SetMountParent` sur des `DashboardController` nus, hors shell). HORS CLASSE, déjà auto-documenté ;
  non touché.

  **Contrôles négatifs, sur `AppShell.AddTabButton` (`Tab.Org`), restaurés après CHAQUE run
  (`cp` depuis `/tmp/charpente-r4/AppShell.cs.original-backup`, comparaison octet à octet en Python,
  `IDENTICAL` les deux fois)** :
  - **(a) `b.interactable = false`** — `LOG_FILE=/tmp/charpente-r4/neg-control-A-ARMED.log timeout
    600 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests` → `RC=1`,
    `passed=16 failed=1` :
    ```
    MafiaCI: FAIL ...F0_2b_ChaqueBoutonDuDock_ParUnClicReel_MeneALaDestinationRatifiee_EtDansLOrdre —
      le CLIC RÉEL sur Tab_Org doit monter EXACTEMENT LieutenantScreenController — trouvé
      CityMapController. Un clic qui route vers une AUTRE destination (ou vers Tab.Empire, le
      défaut EXACT armé par le relecteur round 3) doit ROUGIR ICI, en nommant la bulle fautive.
    ```
    Rougit en nommant `Tab_Org`, exactement comme demandé.
  - **(b) `btn.SetActive(false)`** — même commande (`neg-control-B-ARMED.log`) → `RC=1`,
    `passed=16 failed=1`, **message IDENTIQUE** (même assertion, même bulle nommée `Tab_Org`).
    Mesuré (pas déduit) : l'assertion d'ORDRE (`CollectionAssert.AreEqual` sur `nomsDansLOrdre`,
    `foreach (Transform enfant in shell.TabBarRoot)`) reste VERTE malgré la bulle inactive — le
    `foreach` sur un `Transform` énumère bien les enfants inactifs (confirmé par la revue,
    DÉDUIT ; ici MESURÉ : `passed=16` pas `passed=15`, donc AUCUNE autre assertion de ce test n'a
    rougi que la destination). Seule la destination (le clic, désormais gardé) le voit.
  - Restauration finale : `cp /tmp/charpente-r4/AppShell.cs.original-backup
    Assets/Scripts/Shell/AppShell.cs`, comparaison Python `IDENTICAL` (76820 octets des deux
    côtés), puis re-run vert : `passed=17 failed=0`.

- **MAJEUR** (§ C-b, § F0.2, § F0.3 ci-dessous) : 4 ancres (`AppShell.cs:331`/`:367`/`:751`/`:177`)
  périmées par les 45 lignes insérées round 3, dans des sections à delta ZÉRO octet — donc jamais
  rouvertes par l'attestation « tous les numéros re-vérifiés round 3 », ELLE-MÊME fausse pour la
  2ᵉ fois. Les quatre corrigées à l'oracle (`git show 653acf8:...`, indépendant du working tree),
  attestation RE-ÉMISE scopée et datée (§ C-b, motif de clôture de classe inclus).
- **MINEUR (indicateur d'actif hors juge)** : le commentaire de `F0_2b` disait « catégorie HUDv31,
  hors `Charpente` », lu comme « couvert ailleurs ». `HUDv31` n'est dans AUCUNE entrée de
  `MafiaCI.Categories` — corrigé pour dire NULLE PART, explicitement.
- **MINEUR (dock ment pendant l'overlay)** : consigné, non corrigé (Deviation 9 — item 0.5).
- **MINEUR (`GetComponentInChildren<DashboardController>(true)`)** : `true` → `false` — un Dashboard
  monté mais INACTIF doit faire échouer LE TEST tout de suite (`Assert.IsNotNull`), pas 30 s plus
  tard sur `DashboardLoaded` avec un message qui accuse le serveur.
- **MINEUR (overlay sans sortie)** : ESCALADE, non implémenté — Deviation 10, raisons détaillées
  là-bas (mécanisme de démontage inexistant + geste exact non spécifié par le ruling consultable +
  rattachement documenté à item 0.5 par ce lot lui-même).

Vérification finale round 4 : catégorie `Charpente` scopée, `passed=17 failed=0` (§ ci-dessus) ;
juge complet 5 catégories relancé § « Run complet du juge ».

---

## ⛔⛔ ROUND 5 — revue ⊥ NOT_APPROVED (1 bloquant, 2 majeurs, 4 mineurs) — correctifs

Logs bruts round 5, hors dépôt (consigne du contrôleur) : `/tmp/charpente-r5/*.log`.
Méthode de run inchangée (narrowing temporaire `MafiaCI.Categories` → `{ "Charpente" }` pour toutes
les mesures scopées ci-dessous, restauré aux 5 catégories AVANT toute mesure finale — vérifié
byte-identique à `HEAD` par comparaison Python après chaque restauration).

### BLOQUANT — `F0_2b` aveugle sur `Tab_Empire`

`WaitForEmpireMounted` monte `CityMapController` AVANT que la boucle `F0_2b` ne commence ; la
boucle clique ENSUITE sur `Tab_Empire` en premier et relit `MountedTenantType == CityMapController`
— un champ DÉJÀ vrai avant même le clic. Un clic AVALÉ sur CETTE bulle précise est donc
indiscernable d'un clic réussi, parce que le type monté ne change PAS de valeur dans ce cas
particulier (il change dans les 3 autres). Round 4 ne l'a pas vu parce que ses deux contrôles
négatifs armaient `Tab.Org`, jamais `Tab.Empire` — le silence sur Empire était gratuit dans son
propre contrôle (a) et n'a jamais été relu.

**Fermeture** : mémoriser `shell.MountedTenantGameObject` AVANT chaque clic (les 4 bulles, pas
seulement Empire) et asserter qu'il est Unity-DESTROYED (`== null`, jamais seulement
`activeSelf==false`) APRÈS — même patron que `NavigationPlayModeTests.cs:179`/`:193`
(`previousDistrictHost == null`, 2 frames après le clic). `AppShell.ActivateTab` est
« idempotent-ish » (docstring `AppShell.cs:159-160`, "re-activating the SAME tab still remounts —
no special-cased no-op") : un clic RÉEL, même sur l'onglet DÉJÀ actif, détruit toujours le host
précédent et en remonte un neuf ; un clic AVALÉ ne fait ni l'un ni l'autre.

**Les 4 contrôles négatifs, une bulle armée à la fois** (`if (tab == Tab.<X>) b.interactable =
false;` dans `AppShell.AddTabButton`, restauré après chaque run — comparaison Python `identical to
HEAD: True` après CHAQUE restauration) :

| bulle armée | log | `passed`/`failed` | qui rougit |
|---|---|---|---|
| `Tab.Empire` | `/tmp/charpente-r5/negcontrol-empire.log` | 18/2 | `F0_2b` (nommant `Tab_Empire`) **+ `FA_...`** (F-A, conséquence attendue et indépendante : Empire inatteignable rend aussi l'overlay Accueil injoignable par ce chemin) |
| `Tab.Org` | `/tmp/charpente-r5/negcontrol-org.log` | 19/1 | `F0_2b` (nommant `Tab_Org`) |
| `Tab.Pipeline` | `/tmp/charpente-r5/negcontrol-pipeline.log` | 19/1 | `F0_2b` (nommant `Tab_Pipeline`) |
| `Tab.More` | `/tmp/charpente-r5/negcontrol-more.log` | 19/1 | `F0_2b` (nommant `Tab_More`) |

Sortie réelle (cas Empire, le seul où round 4 était aveugle) :
```
MafiaCI: FAIL ...F0_2b_ChaqueBoutonDuDock_ParUnClicReel_MeneALaDestinationRatifiee_EtDansLOrdre —
  le CLIC RÉEL sur Tab_Empire doit avoir DÉTRUIT (Unity-DESTROYED, == null) le locataire monté
  AVANT ce clic — trouvé VIVANT. [...]
```
**Classe fermée sur SA population entière — 4/4 bulles, 4/4 rouges nommés correctement.**

### MAJEUR 1 — la moitié « hit-testing » n'était gardée nulle part

`ProductionClickSupport.cs` affirmait (avant correction) fermer « la CLASSE ». Mesuré, sur DEUX
mécanismes distincts, chacun `Charpente` 19/0 AVANT ce round (donc invisibles à toutes les gardes
existantes) : `img.raycastTarget = false` sur l'`Image` posée par `AppShell.AddTabButton` (l'UNIQUE
surface de test de collision du dock — les 4 autres enfants de chaque bulle sont DÉJÀ
`raycastTarget = false`) et `CanvasGroup.blocksRaycasts = false` sur `TabBarRoot`.
`ExecuteEvents.Execute` route DIRECTEMENT sur `bouton.gameObject`, sans jamais consulter un
`GraphicRaycaster` — bypass volontaire et documenté, cohérent avec l'idiome « bouton trouvé par nom,
jamais par une position d'écran » — donc CE helper ne peut structurellement pas couvrir le raycast
sans se contredire lui-même.

**Choix, mesuré avant de choisir (option (a) du mandat)** : geste (a), une garde de COLLISION
séparée — `F0_2c_ChaqueBoutonDuDock_RepondAuHitTesting_UnRaycastAuCentreVisePileLaBulle`
(`CharpenteMontageLocatairesPlayModeTests.cs`), un `GraphicRaycaster.Raycast` RÉEL au centre écran
de chaque bulle (`RectTransformUtility.WorldToScreenPoint(null, rect.position)` — Canvas
`ScreenSpaceOverlay`, `camera: null` est la conversion correcte), qui doit rendre la bulle ELLE-MÊME
comme premier résultat. Choisie plutôt que (b) parce que mesurée DÉTERMINISTE en batchmode :
baseline verte, 4/4 bulles, aucune flakiness observée sur les runs ci-dessous.

`ProductionClickSupport.cs` corrigé en parallèle (pas remplacé) : la revendication « ferme la
CLASSE » est désormais scopée EXPLICITEMENT à la classe des deux gardes de `Button.Press()`
(`IsActive()`/`IsInteractable()`), avec un paragraphe qui NOMME la classe non couverte
(raycastTarget / CanvasGroup.blocksRaycasts) et pointe vers `F0_2c` comme fermeture de l'autre
moitié — jamais « couvert, point final ».

**Baseline positive** — `passed=20 failed=0` (`/tmp/charpente-r5/baseline1.log`, catégorie
`Charpente` scopée, 19 tests round-4 + `F0_2c` neuf), `F0_2c` loggue les 4 bulles vérifiées.

**Contrôles positifs (la garde DOIT rougir sur les deux mécanismes mesurés par le relecteur)**,
chaque édition restaurée après coup (comparaison Python `identical to HEAD: True`) :

| mécanisme armé (sur `Tab_Org` ou `TabBarRoot`) | log | `passed`/`failed` | qui rougit |
|---|---|---|---|
| `img.raycastTarget = false` (Tab_Org) | `/tmp/charpente-r5/negcontrol-raycasttarget-org.log` | 19/1 | `F0_2c` SEUL (nommant `Tab_Org`, trouve `DashboardBackdrop` en premier) — `F0_2b` reste VERT, confirmant que les deux gardes couvrent des propriétés DISJOINTES |
| `CanvasGroup.blocksRaycasts = false` (TabBarRoot) | `/tmp/charpente-r5/negcontrol-blocksraycasts.log` | 19/1 | `F0_2c` SEUL (nommant `Tab_Empire`, premier bouton testé dans la boucle) |

Les deux mécanismes cités par le relecteur ROUGISSENT bien sur la garde neuve, et AUCUN des deux ne
touche `F0_2b` — la preuve que les deux moitiés (activation vs hit-testing) sont bien des classes
séparées, chacune avec sa propre garde.

**Mineurs 1-3, mêmes fichiers** :
- **Mineur 1** — `ProductionClickSupport.Click` retourne désormais `bool` (le retour
  d'`ExecuteEvents.Execute`, jeté round 4) et asserte dessus en interne (« aucun handler collecté »
  ≠ silence). Ne prouve pas que `Button.Press()` a produit un effet — seulement qu'un handler a été
  appelé — dit explicitement dans le message d'assertion et le docstring.
- **Mineur 2** — le docstring de `Click` ne dit plus « par l'EventSystem » (rhétorique :
  `ExecuteEvents` est un dispatcher statique, `EventSystem.current` ne remplit qu'un champ du
  `PointerEventData`) mais « par `Button.Press()` », ce qui est le gain réel.
  `Assert.IsNotNull(EventSystem.current)` conservée telle quelle (garde correcte).
  - **Mineur 3** — consigné en commentaire : `position`/`pressPosition`/`clickCount` du
  `PointerEventData` restent à leur défaut ; 0 consommateur aujourd'hui dans `Assets/Scripts`
  (mesuré) ; à poser explicitement le jour où un handler les lit.

### MAJEUR 2 — `F-B` épinglait un COMPTE NU

`CollectionAssert`/`Assert.AreEqual(5, nombreDeBoutons, ...)` ne distingue pas « une sortie est
apparue » de « une 6ᵉ destination de nav est apparue » — et le dépôt annonce LUI-MÊME deux causes
concurrentes de faire monter ce compte SANS jamais poser de sortie : le `ShortcutBar` de l'item 0.5
(`DashboardController.cs:42`, commentaire M1) et le libellé « Marché » du jalon 4
(`AppShell.cs:776,795`, si `screen_b1` gagne un jour sa propre destination `Nav_Marche`). Le mode
d'emploi round 4 prescrivait, sur le rouge le PLUS probable, exactement le mauvais geste : « c'est
très probablement l'item 0.5, retire ce test, coche le ruling ».

**Fermeture** : `CollectionAssert.AreEquivalent` sur l'ENSEMBLE NOMMÉ des `Button.gameObject.name`
sous `DashboardSheet` — chaque `AddNavButton` nomme son GameObject `"Nav_" + label.Replace(" ",
"")` (`DashboardController.cs:685`) — contre `{Nav_CityMap, Nav_BuildingCard, Nav_Filière,
Nav_Exceptions, Nav_Autonomy}`. Même classe, même remède que F0.2 au round 2 (garde d'ensemble
aveugle à la correspondance → paires/noms). Mode d'emploi réécrit pour énumérer les DEUX causes
connues et exiger, avant tout geste sur le ruling, que le lecteur distingue par le NOM du delta
— un `Nav_*` neuf ou un bouton posé sous un conteneur de raccourcis n'est PAS une fermeture ; seul
un nom désignant EXPLICITEMENT Close/Fermer/Dismiss/Exit l'est.

**Baseline positive** (`/tmp/charpente-r5/baseline1.log`) :
```
[Charpente] F-B — {Nav_CityMap, Nav_BuildingCard, Nav_Filière, Nav_Exceptions, Nav_Autonomy}
épinglés sous DashboardSheet (ENSEMBLE NOMMÉ, round 5), aucune affordance de fermeture dédiée [...]
```

**Contrôle négatif** — un 6ᵉ bouton `AddNavButton(navBar, "Marche", OpenPipeline)` ajouté
temporairement dans `DashboardController.BuildLayout` (édition restaurée après coup, comparaison
Python `identical to HEAD: True`), `/tmp/charpente-r5/negcontrol-fb-6th-button.log`,
`passed=19 failed=1` :
```
MafiaCI: FAIL ...FB_AucuneAffordanceDeFermetureSousLOverlay_EpingleAvecSonModeDEmploiDePeremption —
  [...] SI CET ENSEMBLE A CHANGÉ (trouvé {Nav_CityMap, Nav_BuildingCard, Nav_Filière,
  Nav_Exceptions, Nav_Autonomy, Nav_Marche}) : NE PAS cocher le ruling sur ce seul rouge [...]
```
Le rouge NOMME exactement le delta (`Nav_Marche`), et le message renvoie le lecteur à la
distinction par le nom avant tout geste sur le ruling — exactement le defect que round 4 aurait
laissé passer.

### Mineur 4 — un compte que j'avais donné, faux, recompté

`grep -rn "ProductionClickSupport\.Click(" Assets/Tests/` puis exclusion des lignes de commentaire
(`//` en tête) : **8 sites d'appel réels, dans 4 fichiers** — `NavigationPlayModeTests.cs` (×2),
`AppShellPlayModeTests.cs` (×1), `CharpenteOuvertureSessionOverlayPlayModeTests.cs` (×3),
`CharpenteMontageLocatairesPlayModeTests.cs` (×2) — confirme EXACTEMENT le compte du relecteur
(« 8 sites, 4 fichiers »), contre les « 19 appels sur 5 fichiers » que j'avais annoncés à tort
(motif qui comptait aussi la définition du helper et des mentions en commentaire).
`grep -rn "onClick\.Invoke(" Assets/Tests/` : les 11 hits sont TOUS dans des commentaires (aucune
ligne de code réelle) — confirme le « 0 hors commentaires ».

### Vérification finale round 5

Catégorie `Charpente` scopée (après restauration de toutes les éditions temporaires,
`Assets/Scripts/Shell/AppShell.cs`, `Assets/Scripts/Operational/Dashboard/DashboardController.cs`
et `Assets/Editor/MafiaCI.cs` tous re-vérifiés `identical to HEAD: True`) : `passed=20 failed=0`
(`/tmp/charpente-r5/baseline1.log`, déjà cité ci-dessus). Juge complet 5 catégories relancé
ci-dessous, § « Run complet du juge », **Run G** — puis RE-relancé une seconde fois
(`/tmp/charpente-r5/full-judge-round5-final.log`) après un correctif cosmétique post-Run-G (accord
« une balayage » → « un balayage », commentaire de `F0_2c`, zéro effet sur le comportement) :
`passed=204 failed=3`, LES 3 MÊMES rouges pré-existants — identique octet pour octet sur les
compteurs. **`full-judge-round5-final.log` est la mesure qui fait foi** (état exact des fichiers
livrés) ; `full-judge-round5.log` reste la première preuve, conservée pour la trace.

---

## ⛔⛔ ROUND 6 — revue ⊥ NOT_APPROVED (1 bloquant, 1 majeur, 5 mineurs) — correctifs

Logs bruts round 6, hors dépôt (consigne du contrôleur) : `/tmp/charpente-r6/*.log`. Méthode de run
inchangée (narrowing temporaire `MafiaCI.Categories` → `{ "Charpente" }` pour toutes les mesures
scopées ci-dessous, restauré aux 5 catégories AVANT la mesure finale — vérifié byte-identique à HEAD
par comparaison Python après CHAQUE restauration, pas seulement à la fin).

### BLOQUANT — `F0_2c` n'empruntait pas le chemin d'un doigt, et restait verte sur un client
entièrement intouchable

`raycaster.Raycast(donnees, resultats)` (round 5) appelait directement le `GraphicRaycaster` du
shell — une référence déjà en main, jamais la liste des raycasters ENREGISTRÉS ET ACTIFS que
consulte le seul chemin qu'un vrai doigt emprunte (`EventSystem.RaycastAll`,
`BaseRaycaster.cs:83-86` désenregistre sur `OnDisable`, `EventSystem.cs:274` saute tout module dont
`IsActive()` est faux). Un raycaster DÉSACTIVÉ — le client tout entier devenu intouchable au doigt —
laissait la garde VERTE, en IMPRIMANT « hit-testing RÉEL ».

**Fermeture** : `EventSystem.current.RaycastAll(donnees, resultats)` remplace l'appel direct sur
`raycaster`, qui redevient une simple précondition d'EXISTENCE (le Canvas du shell DOIT porter un
`GraphicRaycaster`). Un token de changement, qui ferme 3 des 4 cases manquantes recensées par le
relecteur d'un coup (raycaster participant, tri inter-canvas, module EventSystem) — la 4ᵉ
(`raycastTarget`/`blocksRaycasts`) était déjà couverte depuis round 5.

**Les TROIS contrôles négatifs, sous la NOUVELLE forme, chacun édité puis restauré (comparaison
Python `identical: True` après CHAQUE restauration)** :

| mécanisme armé | log | `passed`/`failed` | qui rougit |
|---|---|---|---|
| `img.raycastTarget = false` (Tab_Org) | `/tmp/charpente-r6/negcontrol-raycasttarget-org.log` | 19/1 | `F0_2c` (nommant `Tab_Org`, trouve `DashboardBackdrop` en premier) — reprouvé sous `RaycastAll`, le relecteur ne l'avait mesuré que sous l'ancienne forme |
| `CanvasGroup.blocksRaycasts = false` (TabBarRoot, `CanvasGroup` ajouté temporairement — aucun n'existe en production sur ce GameObject) | `/tmp/charpente-r6/negcontrol-blocksraycasts.log` | 19/1 | `F0_2c` (nommant `Tab_Empire`) — même reprevue |
| **NEUF round 6** : `ShellCanvas.GetComponent<GraphicRaycaster>().enabled = false` | `/tmp/charpente-r6/negcontrol-raycaster-disabled.log` | 19/1 | `F0_2c` — message : « un raycast au centre de Tab_Empire (...) ne touche RIEN — la bulle est invisible au hit-testing (aucun raycaster enregistré et actif ne la voit) » |

Sortie réelle du 3ᵉ contrôle (celui qui prouve exactement la fermeture du BLOQUANT — c'est le monde
où la garde livrée round 5 restait VERTE) :
```
MafiaCI: FAIL ...F0_2c_ChaqueBoutonDuDock_RepondAuHitTesting_UnRaycastAuCentreVisePileLaBulle —
  un raycast au centre de Tab_Empire ((236.73, 39.42)) ne touche RIEN — la bulle est invisible au
  hit-testing (aucun raycaster enregistré et actif ne la voit) : [...]
```
**Classe fermée, contrôlée sur les 3 mécanismes qui la composent — les 3 rouges nomment
correctement la bulle/le mécanisme.**

⚠️ **Ce qui reste LATENT, pas vivant, dit explicitement dans le commentaire du test** : rien dans
`Assets/Scripts` ne désactive de raycaster aujourd'hui, et `Boot.unity` n'en contient aucun — cette
garde ferme une CLASSE de défaut sans instance connue à ce jour dans ce dépôt, même statut que
`F0_2c` elle-même à sa naissance round 5.

### MAJEUR — `F-B` était aveugle à la fermeture la plus probable

L'épingle round 5 scopait `GetComponentsInChildren<Button>` à la seule `DashboardSheet` (la carte
visible). `DashboardBackdrop` — le fond PLEIN ÉCRAN, FRÈRE de `DashboardSheet` sous le MÊME `root`
(`DashboardController.BuildLayout`, `root = mountParent = ContentSlot`) — est DÉJÀ cible de raycast
(`F0_2c` le trouve EN PREMIER dès qu'une bulle du dock perd son `raycastTarget`, voir tableau
ci-dessus). Le § en tête de ce document (à l'époque « ÉCART AU RULING », renommé « FERMETURE DE
L'OVERLAY ACCUEIL » round 7) énumérait lui-même les gestes candidats pour fermer l'item 0.5
(« libellé ? tap sur le fond ? un bouton ? ») : si la fermeture choisie pose un
`Button` sur le fond, l'épingle round 5 restait VERTE à travers l'événement exact qu'elle existe
pour détecter — l'épingle ÉTAIT l'aveu.

**Fermeture** : scanner l'UNION `{DashboardBackdrop, DashboardSheet}` — EXACTEMENT les deux racines
que `BuildLayout` parente sous `root` — au lieu de la seule carte. **PAS** `shell.ContentSlot` en
entier (l'autre option offerte par le relecteur) : Empire reste monté DESSOUS en surimpression
(`MonterLocataireEnSurimpression<T>` ne le démonte pas, `AppShell.cs:484-486`), et ses propres
`Button` (cellules de district `CityMapController.cs:419`, bouton d'entrée `:542`, etc.) auraient
pollué l'ensemble nommé pour une raison SANS RAPPORT avec une fermeture — vérifié par lecture du
code, pas supposé : `CityMapController` construit des `Button` à 4 sites (`:316,419,505,542`), tous
parentés sous le même `ContentSlot` que le Dashboard (overlay, jamais démonté).

Mode d'emploi de péremption complété : cas **(a-bis)** (un renommage de libellé fait DISPARAÎTRE un
nom `Nav_*` ET en fait APPARAÎTRE un autre dans le MÊME rouge — REMPLACER dans `nomsAttendus`,
jamais élargir à la lettre du cas (a), sinon le test reste rouge pour toujours) et cas **(d)** (un
nom neuf trouvé sous `DashboardBackdrop`, quel que soit son nom, est le candidat structurellement le
plus probable pour la fermeture du ruling — lire son handler avant de classer par nom seul).

**Contrôle négatif** — un `Button` factice posé sur `DashboardBackdrop` (`backdrop.AddComponent
<Button>()`, édition temporaire de `DashboardController.BuildLayout`, restaurée après coup,
`identical: True`), `/tmp/charpente-r6/negcontrol-fb-button-on-backdrop.log`, `passed=19 failed=1` :
```
MafiaCI: FAIL ...FB_AucuneAffordanceDeFermetureSousLOverlay_EpingleAvecSonModeDEmploiDePeremption —
  [...] SI CET ENSEMBLE A CHANGÉ (trouvé {DashboardBackdrop, Nav_CityMap, Nav_BuildingCard,
  Nav_Filière, Nav_Exceptions, Nav_Autonomy}) : NE PAS cocher le ruling sur ce seul rouge [...]
```
Le rouge NOMME exactement le delta (`DashboardBackdrop`, un nom qui ne commence PAS par `Nav_`) —
exactement le défaut que round 5 aurait laissé passer.

### Mineur 1 — `ProductionClickSupport` affirmait une remontée aux parents qui n'existe pas

`ExecuteEvents.Execute` (`:87` et `:95` du fichier) ne regarde QUE `bouton.gameObject` LUI-MÊME
(`ExecuteEvents.cs:248-251` → `GetEventList<T>` → `:319-340`, `go.GetComponents(...)`) ; c'est
`ExecuteHierarchy` (`:290-302`), jamais appelé dans ce helper, qui remonte les parents. Les deux
occurrences de « ou/ni ses parents » corrigées, avec la citation exacte des lignes source
justifiant le retrait plutôt qu'une simple suppression silencieuse (comportement inchangé —
correction de PROSE seule, aucune assertion touchée).

### Mineur 2 — deux sémantiques de `null` dans le même bloc

`Assert.IsNotNull(locataireAvantLeClic, ...)` (`:791`) est une comparaison de RÉFÉRENCE NUnit :
elle passe sur un GameObject déjà Unity-DESTROYED, exactement l'inverse de la charge utile
(`locataireAvantLeClic == null`, l'opérateur UNITY, `:821`). La garde anti-vacuité ne gardait pas ce
qu'elle nomme. Remplacée par `Assert.IsTrue(locataireAvantLeClic != null, ...)`, même opérateur que
la charge utile.

### Mineur 3 — la sonde visait le PIVOT, pas le centre

`RectTransformUtility.WorldToScreenPoint(null, rect.position)` (`:893`) ne vise le centre visuel de
la bulle QUE parce qu'`AddTabButton` ne touche jamais `pivot` aujourd'hui — un fait du code
appelant, pas une propriété de `RectTransform`. Remplacé par `rect.TransformPoint(rect.rect.center)`
: une grandeur qui existe comme objet se mesure SUR l'objet, jamais reconstruite depuis une
hypothèse sur son pivot.

### Mineur 4 — l'ensemble de `F-B` dérive de libellés, un renommage n'est pas un ajout

Voir § MAJEUR ci-dessus : cas **(a-bis)** ajouté au mode d'emploi de péremption, distinct du cas (a)
(« ÉLARGIR ») — un `Nav_*` qui remplace un autre (ex. `Nav_Filière` → `Nav_Marche` au jalon 4,
`AppShell.cs:776,795`) doit être REMPLACÉ dans `nomsAttendus`, jamais seulement ajouté : élargir à
la lettre laisserait l'ancien nom, disparu pour de bon, dans l'ensemble attendu — le test resterait
ROUGE POUR TOUJOURS.

### Mineur 5 — aucune garde de résolution ne tourne dans ce juge, et la seule existante est périmée

Observation, pas une exigence de correctif. `ChromeMultiResolutionPlayModeTests.cs` porte
`[Category("HUDv31")]` (`:38`) — absent des 5 catégories de `MafiaCI.Categories`
(`Assets/Editor/MafiaCI.cs:34`), donc jamais exécuté par le juge qui certifie `Charpente`. Ce fichier
est de surcroît PÉRIMÉ par ce lot même : `tabCount = 5` en littéral (`:160` et `:176`, DEUX
occurrences, non lues par réflexion contrairement aux autres constantes du même fichier) alors que
le dock est ratifié à **4** bulles depuis ce lot (Empire/Org/Pipeline/More, `DockRatifie`).

**Décision (option qui change le moins de surface, consignée en Deviation 11 ci-dessous)** : NE PAS
ajouter `"HUDv31"` au filtre — ce fichier n'est qu'UN test parmi « des dizaines » de la catégorie
HUDv31 jamais exécutés par ce juge, et les élargir tous en même temps sortirait largement du
périmètre de ce lot de charpente. Consignée, non corrigée.

### Vérification finale round 6

Catégorie `Charpente` scopée (après restauration de TOUTES les éditions temporaires —
`Assets/Scripts/Shell/AppShell.cs` ×3 restaurations, `Assets/Scripts/Operational/Dashboard/
DashboardController.cs` ×1, `Assets/Editor/MafiaCI.cs` narrowing/restore — tous re-vérifiés
`identical: True` par comparaison Python après CHAQUE restauration, pas seulement à la fin) :
`passed=20 failed=0` (`/tmp/charpente-r6/baseline2-post-controls.log`, 20 tests inchangés — aucune
méthode `[Test]`/`[UnityTest]` neuve ce round, uniquement des corps et docstrings corrigés).

Juge complet (5 catégories) relancé — **HUITIÈME mesure indépendante**, § « Run complet du juge »,
**Run H** : `/tmp/charpente-r6/full-judge-round6.log`, `309 test(s) découverts`,
`passed=204 failed=3`, LES 3 MÊMES rouges pré-existants (`NavD12`, `StaleAbandonedShell`, `NavF4`) —
identique octet pour octet sur les compteurs à round 5 (`204/3`), zéro régression, zéro test neuf
(round 6 ne fait que corriger des corps de tests existants). Réconciliation arithmétique : 204 (G,
round 5) + 0 (aucun test ajouté round 6) = 204 (H, round 6), exact.

Puis RE-relancé une seconde fois (`/tmp/charpente-r6/full-judge-round6-final.log`) après un
correctif cosmétique post-Run-H sur `ProductionClickSupport.cs` (dénesting d'une parenthèse du
commentaire Mineur 1 — lisibilité seule, zéro effet sur le comportement, vérifié par un run scopé
`Charpente` intermédiaire, `/tmp/charpente-r6/baseline3-post-comment-cleanup.log`,
`passed=20 failed=0`, AVANT de relancer le juge complet) : `passed=204 failed=3`, LES 3 MÊMES
rouges — identique octet pour octet sur les compteurs. **`full-judge-round6-final.log` est la
mesure qui fait foi** (état exact des fichiers livrés) ; `full-judge-round6.log` reste la première
preuve, conservée pour la trace — même patron que round 5 (`full-judge-round5-final.log`).

---

## ⛔⛔ ROUND 7 — revue ⊥ NOT_APPROVED (2 bloquants, 2 majeurs, 3 mineurs) — correctifs

Logs bruts round 7, hors dépôt : `/tmp/charpente-r7/*.log`. Méthode de run inchangée (narrowing
temporaire `MafiaCI.Categories` → `{ "Charpente" }` pour toutes les mesures scopées ci-dessous,
restauré aux 5 catégories AVANT la mesure finale).

### BLOQUANT 1 — `F0_2c` affirmait fermer le cas « module d'entrée » sans jamais l'asserter, et
restait verte sur un client sans AUCUN module d'entrée actif

Le commentaire de `F0_2c` (round 6) affirmait qu'`EventSystem.current.RaycastAll` fermait « les 3
cases manquantes d'un coup (participant, tri inter-canvas, module) ». **Faux, mesuré par le
relecteur** : `RaycastAll` (`EventSystem.cs:266-281`, package `com.unity.ugui`) ne consulte QUE
`RaycasterManager.GetRaycasters()` — il ne lit JAMAIS `currentInputModule` (posé dans `Update()`,
où `RaycastAll` n'entre jamais). Reproduit : `AppShell.EnsureEventSystem()` privée de son
`AddComponent<InputSystemUIInputModule>()` (le seul geste qui pose un module) ⇒ `F0_2c` restait
VERTE (`passed=20 failed=0`, inchangé) alors qu'aucun tap ne peut plus jamais être dispatché en
production — la garde CERTIFIAIT le défaut exact qu'elle prétendait fermer.

**Fermeture** : (1) commentaire corrigé (`RaycastAll` ne ferme QUE 2 des 3 cases — participant, tri
inter-canvas) ; (2) une assertion DÉDIÉE ajoutée à `F0_2c`, sur un helper NOMMÉ
`HasActiveInputModule(EventSystem, out string)` (EventSystem actif + `currentInputModule` non null
+ module actif) — jamais déduite de la présence de `RaycastAll` ; (3) contrôle négatif PERMANENT
(`F0_2c_ControleNegatif_EventSystemSansModule_NestPasDetectePar_HasActiveInputModule`, `[Test]`
synchrone, EventSystem synthétique isolé, `DestroyImmediate` — PAS `Object.Destroy`, consigné en
Deviation ci-dessous : un `[Test]` ne tourne aucune frame, la destruction DIFFÉRÉE d'`Object.Destroy`
ne se serait pas exécutée avant le test suivant, risque de fuite d'un EventSystem synthétique dans
la liste statique `m_EventSystems`).

**Contrôle négatif SUR LA PRODUCTION** (celui que le relecteur avait exécuté lui-même) — ligne
`es.AddComponent<InputSystemUIInputModule>()` désarmée dans `AppShell.EnsureEventSystem()`, éditée
puis restaurée, comparaison Python `identical: True` après restauration :

| état | log | `passed`/`failed` | qui rougit |
|---|---|---|---|
| désarmé | `/tmp/charpente-r7/negcontrol-bloquant1-module-disarmed.log` | 21/1 | `F0_2c_ChaqueBoutonDuDock_...` — SEUL rouge |
| restauré | `/tmp/charpente-r7/run2-after-restore-verif.log` | 22/22 | aucun |

Sortie réelle (extraite par oracle Python indépendant, pas par le grep proxifié du dépôt) :
```
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteMontageLocatairesPlayModeTests.F0_2c_ChaqueBoutonDuDock_RepondAuHitTesting_UnRaycastAuCentreVisePileLaBulle —
  EventSystem.current n'a AUCUN module d'entrée actif (currentInputModule est null — aucun module
  d'entrée sélectionné) — EventSystem.RaycastAll (juste en dessous) ne le voit JAMAIS
  (EventSystem.cs:266-281 ne consulte que RaycasterManager.GetRaycasters()), donc ce test resterait
  VERT même si AUCUN tap ne pouvait jamais être dispatché en production. [...]
MafiaCI: RunPlayModeTests finished — passed=21 failed=1 skipped=0 inconclusive=0
```
**Classe fermée** — le rouge nomme exactement le test et la raison ; le monde dégénéré exact
(EventSystem hérité sans module, `AppShell.EnsureEventSystem` ne pose le module QUE si aucun
EventSystem n'existait déjà) reste LATENT, pas vivant, comme les BLOQUANT round 5/6 avant lui.

### BLOQUANT 2 — la fermeture de l'overlay Accueil, refusée round 4 sur une raison mesurée FAUSSE,
livrée round 7

Voir § « FERMETURE DE L'OVERLAY ACCUEIL » en tête de ce document ET Deviation 10 (réouverte et
close ci-dessous) pour l'historique complet. Résumé de la mesure : la raison « aucun mécanisme de
démontage n'existe » (round 4) est réfutée par `AppShell.cs:298`
(`ExitToCityMap() => ActivateTab(Tab.Empire)`), déjà câblé pour le district et jamais rebranché sur
l'Accueil. **Fermeture** : `TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap,
ExitToCityMap)`, deux lignes, posées APRÈS `MonterLocataireEnSurimpression<DashboardController>()`
sur les DEUX branches d'`AcquireSessionThenActivateHome` — APRÈS parce qu'`ActivateTab` remet
l'action de tête à `None` (§3.3, son propre reset défensif).

`F-B` (l'épingle rounds 4-6) est **REMPLACÉE** par deux falsifiables POSITIVES, une par branche
(`FB_LActionDeTeteFermeLOverlayEtRevelaLaVille_BrancheSucces` charge la scène de démarrage du build
— identité `operational_demo`, réussit ; `..._BrancheEchec` construit un `AppShell` MANUELLEMENT
avec une identité DÉLIBÉRÉMENT invalide, même idiome que `NavigationPlayModeTests.NavF3_...`, seul
précédent de ce dépôt pour forcer cette branche). Les deux partagent un corps commun
(`VerifierFermetureParActionDeTete`) : overlay monté (anti-vacuité) → action de tête == `BackToMap`
et interactable → clic RÉEL (`ProductionClickSupport.Click`) → overlay disparu, `CityMapController`
monté, confinement sous `ContentSlot`.

**Contrôle négatif, sur les DEUX lignes à la fois** (les deux `TopBar.SetLeadingAction(...)`
ajoutées ce round, désarmées puis restaurées, `identical: True` après restauration) :

| état | log | `passed`/`failed` | qui rougit |
|---|---|---|---|
| désarmé | `/tmp/charpente-r7/negcontrol-bloquant2-leadingaction-disarmed.log` | 20/2 | les DEUX `FB_..._BrancheSucces` et `..._BrancheEchec` — F-A et le reste restent VERTS |
| restauré | `/tmp/charpente-r7/run2-after-restore-verif.log` | 22/22 | aucun |

Sortie réelle (oracle Python) :
```
MafiaCI: FAIL ...FB_LActionDeTeteFermeLOverlayEtRevelaLaVille_BrancheEchec —
  round 7 (BLOQUANT 2, BRANCHE REPLI-ÉCHEC) — l'action de tête doit être BackToMap dès que
  l'overlay Accueil est monté (posée APRÈS ActivateTab, qui la remet sinon à None).
MafiaCI: FAIL ...FB_LActionDeTeteFermeLOverlayEtRevelaLaVille_BrancheSucces —
  round 7 (BLOQUANT 2, BRANCHE SUCCÈS) — l'action de tête doit être BackToMap dès que l'overlay
  Accueil est monté (posée APRÈS ActivateTab, qui la remet sinon à None).
MafiaCI: RunPlayModeTests finished — passed=20 failed=2 skipped=0 inconclusive=0
```
**Les DEUX branches rougissent séparément, chacune nommée** — preuve que les deux tests exercent
bien des chemins DISTINCTS (succès et repli-échec), pas le même chemin déguisé deux fois.

### MAJEUR 1 — le § « LIRE EN TÊTE » et Deviation 10 décrivaient une épingle PÉRIMÉE depuis DEUX
rounds

Mesuré à l'octet (round 7, avant correctif) : § ÉCART AU RULING (31 lignes) et Deviation 10
(40 lignes) étaient byte-identiques entre `7151309` et `1307c22` — ils décrivaient encore « le
compte ACTUEL des boutons sous `DashboardSheet` (5) » et prescrivaient « si ce compte a changé,
retire ce test, coche le ruling », alors que round 5 avait DÉJÀ élargi la portée à
`{DashboardBackdrop, DashboardSheet}` (round 6) et que `F-B` elle-même renvoyait le lecteur vers ce
§ périmé. **Fermeture** : les deux sections réécrites pour l'état LIVRÉ par ce round (§ en tête de
ce document, Deviation 10 amendée avec un bloc « RÉOUVERT ET FERMÉ round 7 ») — il n'y a plus
d'écart au ruling à documenter, il y a une fonctionnalité livrée à décrire.

### MINEUR 1 — trois renvois décrivaient `F0_2c` par le mécanisme round 5 (insuffisant, remplacé
round 6)

`ProductionClickSupport.cs:43` (renvoi en commentaire de classe), `:70` (docstring XML publique de
`Click`), et `CharpenteMontageLocatairesPlayModeTests.cs:9` (commentaire du `using
UnityEngine.EventSystems;`) décrivaient encore `F0_2c` comme un `GraphicRaycaster.Raycast` direct
— la forme que round 6 a remplacée par `EventSystem.current.RaycastAll` précisément parce que la
première restait verte sur un raycaster désactivé. Corrigés, les trois, pour nommer
`EventSystem.current.RaycastAll` (round 6). *(Les occurrences `:872/:875/:883/:940` du même fichier
étaient déjà correctes, marquées « CORRIGÉ round 6 » — non touchées.)*

### MINEUR 2 — la consignation de la garde multi-résolution (Deviation 11) était fausse et
incomplète

Voir Deviation 11 (réécrite) pour le détail complet : (a) « le dock est ratifié à 4 bulles depuis
CE lot » était faux — mesuré sur `af9893b` (item 0.1/0.4, lot PRÉCÉDENT), qui posait déjà 4
`AddTabButton` ; ce lot ne fait que renommer `Home`→`Empire`. (b) La consignation ne nommait que
`tabCount` alors que `ChromeMultiResolutionPlayModeTests.cs:158-159` recopie aussi
`tabBarPadding=8f`/`tabBarSpacing=4f` en littéraux, alors que `BuildTabBar` pose un padding
horizontal **0** et `spacing = Px(22f)`, et que `childForceExpandWidth = false` invalide le MODÈLE
de distribution (`available/buttonCount`) que ce test calcule — pas seulement ses constantes.
Consigné plus précisément ; **toujours PAS ajouté au filtre**, comme demandé.

### MINEUR 3 — `F-B` (remplacée) ne balaie que les `Button` — angle mort connu, consigné

Le corps partagé des deux nouvelles falsifiables (`VerifierFermetureParActionDeTete`) trouve
l'action de tête par `GetComponent<Button>()` — même idiome que `CliquerBoutonNav` (BLOQUANT 2,
round 3) et `ProductionClickSupport.Click` (qui exige un `Button`, § doc du fichier). Précédent
maison d'un handler qui N'EN EST PAS un : `LongPressButton.cs:15`. Mesuré (round 7) : **0**
`IPointerClickHandler`/`EventTrigger` dans `Assets/Scripts` aujourd'hui — angle mort SANS instance
connue. Ici il ne mord PAS : `TopBarController.cs:568` pose bien un vrai `Button` sur l'action de
tête (`leadingBtn = leadingGo.AddComponent<Button>();`), vérifié par lecture. Consigné pour la
population future, pas corrigé — hors périmètre de ce lot.

### Vérification finale scopée

Catégorie `Charpente` seule, après restauration de TOUTES les éditions temporaires (`AppShell.cs`
×4 restaurations — 2 négatifs BLOQUANT 1/2, `MafiaCI.cs` narrowing/restore — chacune re-vérifiée) :
`passed=22 failed=0` (`/tmp/charpente-r7/run2-after-restore-verif.log`, `311 test(s) découverts`).
Delta round 6 → round 7 : `+2` Charpente (+1 contrôle négatif permanent BLOQUANT 1, +1 net sur
BLOQUANT 2 — `F-B` unique remplacée par DEUX falsifiables) ; `20 → 22`, `309 → 311` découverts —
réconcilié.

---

## C-a — TROIS listes parallèles → UNE (`DockRatifie`)

**Population mesurée, sur le fichier INTACT (af9893b, commande + sortie réelle) :**
```
$ git show af9893b:Assets/Scripts/Shell/AppShell.cs | grep -nE 'AddTabButton\(Tab\.'
717:            AddTabButton(Tab.Home, "Accueil");
718:            AddTabButton(Tab.Org, "Famille");
719:            AddTabButton(Tab.Pipeline, "Filière");
720:            AddTabButton(Tab.More, "Plus");
938:            AddTabButton(Tab.Home, "Accueil");
939:            AddTabButton(Tab.Org, "Famille");
940:            AddTabButton(Tab.Pipeline, "Filière");
941:            AddTabButton(Tab.More, "Plus");
$ git show af9893b:Assets/Scripts/Shell/AppShell.cs | grep -cE 'AddTabButton\(Tab\.'
8
$ git show af9893b:Assets/Scripts/Shell/AppShell.cs | grep -nE 'Tab\[\] order'
956:            Tab[] order = { Tab.Home, Tab.Org, Tab.Pipeline, Tab.More };
```
**Compte : 2 blocs (8 appels) + 1 liste d'ordre = 3 sites.** Exactement la mesure du mandat.

**Après le geste (§3.1 du design)** : `private static readonly (Tab onglet, string libelle)[]
DockRatifie` déclaré une fois (`AppShell.cs`), les trois sites (`BuildTabBar`,
`RebatirChromePourResolutionCourante`, `RefreshTabButtonVisuals`) le **lisent** :
```
$ grep -cE 'AddTabButton\(Tab\.' Assets/Scripts/Shell/AppShell.cs
0
$ grep -n 'DockRatifie' Assets/Scripts/Shell/AppShell.cs
734:            // UNE seule liste ordonnée (`DockRatifie`, design §3.1) : les TROIS sites qui en
740:            foreach ((Tab onglet, string libelle) in DockRatifie) AddTabButton(onglet, libelle);
746:        private static readonly (Tab onglet, string libelle)[] DockRatifie =
972:            foreach ((Tab onglet, string libelle) in DockRatifie) AddTabButton(onglet, libelle);
982:            // ⚠️ MÊME ORDRE QUE `BuildTabBar`, LU À LA MÊME SOURCE (`DockRatifie`, design §3.1) —
986:            for (int i = 0; i < tabButtons.Count && i < DockRatifie.Length; i++)
988:                bool active = DockRatifie[i].onglet == CurrentTab;
```

**Contrôle exécutable, F0.2-c** (motif n°1 — régime AVANT/APRÈS mesuré sur les DEUX états réels,
pas seulement sur le fichier édité) :
```
$ python3 -c "
import re, subprocess
before = subprocess.check_output(['git','show','af9893b:Assets/Scripts/Shell/AppShell.cs']).decode()
after = open('Assets/Scripts/Shell/AppShell.cs', encoding='utf-8').read()
pb = re.compile(r'Tab\.Home\W[\s\S]{0,200}?Tab\.Org\W[\s\S]{0,200}?Tab\.Pipeline\W[\s\S]{0,200}?Tab\.More\b')
pa = re.compile(r'Tab\.Empire\W[\s\S]{0,200}?Tab\.Org\W[\s\S]{0,200}?Tab\.Pipeline\W[\s\S]{0,200}?Tab\.More\b')
print('AVANT', len(list(pb.finditer(before))))
print('APRES', len(list(pa.finditer(after))))
"
AVANT 3
APRES 1
```
Le test `F0_2c_UneSeuleListeEnumereLOrdreDuDock_LesTroisSitesLaLisentDesormais`
(`CharpenteBootScenePlayModeTests.cs`) exécute la forme APRÈS (regex qualifiée par la PROPRIÉTÉ —
les 4 enum dans l'ordre canon, à portée l'un de l'autre — pas par la syntaxe, puisque la forme AVANT
et la forme APRÈS n'ont pas la même syntaxe) et attend `1`. **Vérifié vert dans tous les runs
Charpente (14/14) et dans le run complet final (voir § Juge complet).**

---

## C-b — le sentinel de course ne se perd pas

`AcquireSessionThenActivateHome` (nom INCHANGÉ, design §3.2) active `Tab.Empire` sur ses DEUX
branches (succès `AppShell.cs` — repli d'échec), chacune toujours gardée par
`CurrentTab == (Tab)(-1)` :

⛔ **CORRIGÉ (revue ⊥ round 2, MINEUR m1)** — les deux numéros de ligne ci-dessous (`183`, `221`)
n'ont JAMAIS existé à ces valeurs : sortie `grep -n` lue via la couche d'affichage proxifiée du
terminal (socle CLAUDE.md — la commande n'était pas dans un pipe/`$( )`). RE-MESURÉ à l'oracle à
l'époque (`$( )`) : `331` (repli) et `367` (succès).

⛔⛔ **RE-CORRIGÉ round 4 (revue ⊥, MAJEUR)** — round 3 a inséré 45 lignes dans `AppShell.cs` AUX
SITES MÊMES de ce sentinel (extraction du garde en variable booléenne nommée, `pasEncoreActiveEchec`/
`pasEncoreActive`), décalant les deux ancres SANS que cette section (delta ZÉRO octet entre
`535dd87` et `653acf8`) ne soit rouverte — l'attestation de re-vérification exhaustive round 3
(ci-dessous) était donc fausse aussi POUR CETTE SECTION, en plus des deux déjà corrigées. RE-MESURÉ
à l'oracle Python (`git show 653acf8:...`, indépendant de tout état de working tree), CROISÉ avec
`grep -n` en `$( )` :
```
$ OUT=$(grep -n 'CurrentTab == (Tab)(-1)' Assets/Scripts/Shell/AppShell.cs | grep -E '^(360|407):'); echo "$OUT"
360:                bool pasEncoreActiveEchec = CurrentTab == (Tab)(-1);
407:            bool pasEncoreActive = CurrentTab == (Tab)(-1);
$ OUT=$(grep -n 'ActivateTab(Tab.Empire);' Assets/Scripts/Shell/AppShell.cs | grep -E '^(363|410):'); echo "$OUT"
363:                    ActivateTab(Tab.Empire); // repli : le locataire signera lui-même
410:                ActivateTab(Tab.Empire);
```
Les vraies lignes SUR `653acf8` : garde d'échec `:360` (guard) / `:363` (appel), garde de succès
`:407` (guard) / `:410` (appel) — le sentinel occupe désormais DEUX lignes par branche (extraction
en variable), plus une pour l'appel, là où il tenait sur une seule au round où `331`/`367` avaient
été mesurées.

Les deux occurrences (branche d'échec `:360-363`, branche de succès `:407-410`) portent le même
garde, recopié tel quel — vérifié par lecture directe du diff (`git diff af9893b -- Assets/Scripts/
Shell/AppShell.cs`, non collé ici pour éviter un pavé — la commande a été exécutée et relue en
entier avant de continuer). Les tests qui dépendent de ce sentinel
(`AppShellPlayModeTests.LateEmpireActivation_DoesNotOverride_PlayerNavigationDuringAcquisition`,
renommé depuis `LateHomeActivation_...`, mécanisme inchangé, onglet-témoin changé de `City` à `Org`
— voir Deviations) sont **verts** (voir § Juge complet).

---

## F0.2 — l'ENSEMBLE des libellés du dock, sur les DEUX chemins de construction

**Falsifiable** : `CharpenteBootScenePlayModeTests.F0_2_LEnsembleDesLibellesDuDock_
EgaleLEnsembleRatifie_SurLesDeuxCheminsDeConstruction`. Lit les libellés RÉELLEMENT AFFICHÉS
(`TextMeshProUGUI.text`) sur la scène du build, compare à une cible ÉCRITE DANS LE TEST (pas
`AppShell.DockRatifie` — anti-tautologie), sur la construction initiale PUIS après
`RebatirChromePourResolutionCourante()` (le second chemin).

### Contrôle négatif — F0.2 doit ROUGIR quand un libellé diverge

**ARMÉ** — `AppShell.cs:751` **à l'époque (round 2, sur le fichier d'alors)** — restauré depuis
`/tmp/charpente-0203/AppShell.cs.original-backup` ensuite, `diff` vérifié IDENTIQUE.

⛔⛔ **CORRIGÉ round 4 (revue ⊥, MAJEUR)** — cette ancre n'a JAMAIS été mise à jour après round 3
(45 lignes insérées ailleurs dans le fichier ont décalé tout ce qui suit), dans une section à
delta ZÉRO octet entre `535dd87` et `653acf8` — exactement la classe que ce MAJEUR nomme. RE-MESURÉ
à l'oracle sur `653acf8` (`git show`, indépendant du working tree) :
```
$ python3 -c "
import subprocess
out = subprocess.run(['git','show','653acf8:Assets/Scripts/Shell/AppShell.cs'], capture_output=True, text=True).stdout
for i,l in enumerate(out.split(chr(10)), start=1):
    if 'DockRatifie =' in l or '\"Plus\"' in l: print(i, repr(l))
"
791 '        private static readonly (Tab onglet, string libelle)[] DockRatifie ='
796 '            (Tab.More,     "Plus"),'
```
Sur `653acf8` : la déclaration du tableau `DockRatifie` est à `:791`, et le littéral `(Tab.More,
"Plus")` — la ligne EXACTEMENT touchée par cet ARMÉ — est à `:796` (5 lignes plus bas que le bloc
qui le porte, à cause du commentaire de résumé `:787-790`). L'ancre correcte pour reproduire CET
ARMÉ précis aujourd'hui est donc `AppShell.cs:796`, pas `:751` ni `:791` (le `:791` désigne le
DÉBUT du tableau, pas la ligne éditée).

Commande :
```
LOG_FILE=/tmp/charpente-0203/neg-control-F0.2-ARMED.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (`MafiaCI:` lines) :
```
MafiaCI: RunPlayModeTests started — 303 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteBootScenePlayModeTests.F0_2_LEnsembleDesLibellesDuDock_EgaleLEnsembleRatifie_SurLesDeuxCheminsDeConstruction —   la barre d'onglets de la scène de démarrage doit AFFICHER EXACTEMENT {EMPIRE, FAMILLE, FILIÈRE, PLUS} (construction initiale) — trouvé {EMPIRE, FAMILLE, FILIÈRE, PLUSFAUX}.
MafiaCI: RunPlayModeTests finished — passed=13 failed=1 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=33s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : F0.2 ROUGIT**, en **nommant l'écart d'ensemble** exact (PLUS vs PLUSFAUX). Aucun autre
test Charpente n'est touché (13 = 14 − 1) — la garde ne mord QUE sur le libellé, pas sur l'ordre ni
la structure (F0.2-c reste vert, insensible à ce défaut de contenu).

**DÉSARMÉ** — restauré (`cp /tmp/charpente-0203/AppShell.cs.original-backup
Assets/Scripts/Shell/AppShell.cs`, `diff` → IDENTIQUE).
Commande :
```
LOG_FILE=/tmp/charpente-0203/neg-control-F0.2-DESARME.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 303 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: RunPlayModeTests finished — passed=14 failed=0 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=33s timeout=900s issue=[sortie normale (RC=0)]`.

**Verdict : VERT — 14/14, aucun résiduel.**

### Round 2 — MAJEUR M2 : la garde d'ENSEMBLE était aveugle à la CORRESPONDANCE (EXÉCUTÉ par la revue)

La revue ⊥ round 2 a **permuté les libellés** de deux entrées de `DockRatifie` en production
(`(Tab.Empire, "Empire")` ↔ `(Tab.Org, "Famille")` devenant `(Tab.Empire, "Famille")` /
`(Tab.Org, "Empire")`) et mesuré que les TROIS gardes existantes restaient VERTES : F0.1-a (lit les
NOMS d'objets `Tab_{tab}`, inchangés par la permutation), F0.2 ci-dessus (lit l'ENSEMBLE des
libellés — `{EMPIRE, FAMILLE, FILIÈRE, PLUS}` reste le même multiset, peu importe QUI porte QUOI),
F0.2-c (lit l'ORDRE des membres d'enum dans le littéral `DockRatifie`, inchangé par un échange de
libellés). **Un dock affichant « FAMILLE » sous la bulle Empire aurait été certifié vert.**

**Geste** : `F0.2` asserte désormais l'ensemble des **PAIRES** (nom de bouton, libellé rendu SOUS
CE MÊME bouton), formatées en une seule chaîne `"{nomBouton}={libelle}"` (pas un `ValueTuple` comparé
par `CollectionAssert` — `com.unity.ext.nunit` embarqué ici est basé sur NUnit 3.5, antérieur au
support `ValueTuple` de `NUnitEqualityComparer` ; mesuré en écrivant d'abord la forme tuple et en la
gardant SEULEMENT après avoir vérifié la version du package — voir `Library/PackageCache/
com.unity.ext.nunit@*/package.json:6` — CORRIGÉ round 3, MINEUR m1 : `:5` est la ligne `"unity":
"2019.4"` ; `:6` porte la description citant NUnit 3.5, re-vérifiée à l'oracle Python). Le libellé
est lu SOUS le bouton `Tab_{tab}` qui le porte
(`GetComponentInChildren` scopé à cet enfant), jamais dans une liste à plat de tous les
`TextMeshProUGUI` de la barre — cette dernière forme est exactement ce qui rendait la permutation
invisible : un ensemble ne sait plus qui portait quoi. Anti-tautologie inchangée : la cible
(`pairesAttendues`) est écrite indépendamment de `AppShell.DockRatifie`, avec le même idiome que
F0.1-a (`$"Tab_{AppShell.Tab.X}"`).

**Balayage de la CLASSE sur la population** (« quelles autres gardes de ce lot et du lot 0.4
assertent un ensemble de valeurs qui viennent par paires ? ») — recherche exhaustive de
`CollectionAssert.AreEquivalent`/`HashSet<>`/`Dictionary<>` dans les 8 fichiers touchés par ce lot
(`AppShell.cs`, `AppShellPlayModeTests.cs`, `NavigationPlayModeTests.cs`, `HudPlayModeTests.cs`,
`CharpenteBootScenePlayModeTests.cs`, `CharpenteMontageLocatairesPlayModeTests.cs`,
`VuePrincipaleCapturePlayModeTests.cs`, `ChromeTabBarPlayModeTests.cs`) :

| # | site | forme | vulnérable à une permutation de CORRESPONDANCE ? |
|---|---|---|---|
| 1 | F0.1-a `ongletsAttendus`/`nomsOnglets` (Boot) | ensemble de NOMS seuls (une seule valeur par entrée) | NON — rien à permuter, il n'y a qu'un seul attribut par entrée (le nom) ; orthogonal à F0.2 par construction (labels = charge de F0.2) |
| 2 | F0.2 construction + reconstruction (Boot) | ensemble de LIBELLÉS seuls | **OUI — CORRIGÉ ci-dessus (2 sites, même correctif)** |
| 3 | F0.4-a `typesAttendus`/`typesTrouves` (Montage) | ensemble de TYPES résultant de 6 appels distincts (5 `OpenNav` + 1 `OpenDetail`) | OUI en isolation (une permutation de la correspondance NavTarget→Type laisserait le SET de 6 types résultants inchangé) — **mais COMPENSÉE dans le même fichier par `C5_ToutMembreDeNavTarget_AUnComportementNomme`**, qui assert la paire NavTarget→Type EXACTE par membre (table `typeParMembre`, `Assert.AreEqual` par membre, pas un ensemble). F0.4-a mesure une AUTRE propriété (containment sous `ContentSlot`), orthogonale à la correspondance — non modifié. |
| 4 | `HudPlayModeTests.ExpectedSeverityTokenFiles`/`ExpectedBucketLiteralFiles` | ensembles de NOMS DE FICHIERS (allowlist de scan) | NON — aucune correspondance à deux attributs n'est assertée, un fichier est ou n'est pas dans l'ensemble ; hors du champ de ce lot (touché seulement par un renommage `Home`→`Empire` sans rapport) |
| 5 | `ChromeTabBarPlayModeTests.chromeNames` (`{Hairline, BoitierRing, ActiveIndicator}`) | ensemble de NOMS pour un FILTRE de membership (pas une assertion finale) | NON — sert à sélectionner quels `Image` entrent dans un balayage de couleur, n'assert aucune paire |

**Compte : 5 sites examinés, 1 classe vulnérable (F0.2, 2 sites), 1 déjà compensée par un test
voisin existant (F0.4-a/C5), 3 hors classe (pas de correspondance à deux attributs).**

**Contrôle négatif — ARMÉ** (labels échangés en production, `AppShell.cs` `DockRatifie`,
`(Tab.Empire,"Empire")`/`(Tab.Org,"Famille")` → `(Tab.Empire,"Famille")`/`(Tab.Org,"Empire")` ; seul
site touché, restauré depuis `/tmp/charpente-0203-r2/AppShell.cs.original-backup` ensuite, restauration
vérifiée par **oracle Python**, pas par `diff` — voir MINEUR nouveau ci-dessous) :
```
$ LOG_FILE=/tmp/charpente-0203-r2/neg-control-Ca-ARMED.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
RC=1
$ grep -aE 'MafiaCI: RunPlayModeTests finished|MafiaCI: FAIL' /tmp/charpente-0203-r2/neg-control-Ca-ARMED.log
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteBootScenePlayModeTests.F0_2_LEnsembleDesLibellesDuDock_EgaleLEnsembleRatifie_SurLesDeuxCheminsDeConstruction —   la barre d'onglets de la scène de démarrage doit apparier EXACTEMENT {Tab_Empire=EMPIRE, Tab_Org=FAMILLE, Tab_Pipeline=FILIÈRE, Tab_More=PLUS} (construction initiale) — trouvé {Tab_Empire=FAMILLE, Tab_Org=EMPIRE, Tab_Pipeline=FILIÈRE, Tab_More=PLUS}. Un libellé au mauvais bouton (deux entrées ÉCHANGÉES) doit ROUGIR ici en nommant la paire fautive, même si l'ENSEMBLE des libellés reste inchangé (M2, revue ⊥ round 2).
MafiaCI: RunPlayModeTests finished — passed=14 failed=1 skipped=0 inconclusive=0
```
`elapsed=32s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : F0.2 ROUGIT en NOMMANT LA PAIRE FAUTIVE** (`Tab_Empire=FAMILLE`, `Tab_Org=EMPIRE` vs
attendu `Tab_Empire=EMPIRE`, `Tab_Org=FAMILLE`) — exactement le défaut que la revue a exécuté.
`passed=14 failed=1` = 15 (jeu Charpente après ajout de C7, voir § C7 plus bas) − 1 : aucun autre
test touché (F0.1-a, F0.2-c, C7 tous restés verts, comme prédit par le tableau de balayage).

**DÉSARMÉ** — restauré, vérifié IDENTIQUE par oracle Python (`open(...).read()` comparé
byte-à-byte, PAS `diff` — `diff` a rendu un FAUX « files are identical » sur ce fichier pendant ce
round, voir le MINEUR nouveau plus bas) :
```
$ python3 -c "a=open('Assets/Scripts/Shell/AppShell.cs',encoding='utf-8').read(); b=open('/tmp/charpente-0203-r2/AppShell.cs.original-backup',encoding='utf-8').read(); print('IDENTICAL' if a==b else 'DIFFERENT')"
IDENTICAL
$ LOG_FILE=/tmp/charpente-0203-r2/neg-control-Ca-DESARME.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
RC=0
$ grep -aE 'MafiaCI: RunPlayModeTests finished|MafiaCI: FAIL' /tmp/charpente-0203-r2/neg-control-Ca-DESARME.log
MafiaCI: RunPlayModeTests finished — passed=15 failed=0 skipped=0 inconclusive=0
```
`elapsed=33s timeout=900s issue=[sortie normale (RC=0)]`.

**Verdict : VERT — 15/15** (14 précédents + `C7`, § plus bas).

⚠️ **NOUVEAU PIÈGE MESURÉ CE ROUND, à ajouter à la vigilance socle** : la commande `diff
Assets/Scripts/Shell/AppShell.cs /tmp/.../AppShell.cs.original-backup` (nue, sortie directe au
terminal) a rendu **`[ok] Files are identical`** immédiatement après l'armement du contrôle négatif
ci-dessus — **FAUX**, les deux fichiers différaient de 2 lignes (mesuré ensuite : même longueur en
octets par coïncidence, `len==71509` des deux côtés, un swap de libellés ne change pas la taille du
fichier). Seul l'oracle Python (comparaison de chaîne directe) l'a détecté. Même famille que les
pièges `grep`/`git diff`/`git log` déjà au socle — `diff` nu en est un QUATRIÈME exemplaire.
⇒ Toutes les vérifications de restauration de ce round ont été refaites via oracle Python, jamais
via `diff` nu.

---

## F0.3 — l'intérieur de district ATTEIGNABLE par des gestes de production

**Falsifiable** : `CharpenteMontageLocatairesPlayModeTests.F0_3_LIntérieurDeDistrict_
EstAtteignable_ParDesGestesDeProductionDepuisLaCarteParDefaut`. Depuis la scène du build : attend
Empire monté (onglet par défaut), vérifie que c'est bien `CityMapController`, sélectionne le
district 16 (verge-a), attend l'interactabilité RÉELLE du bouton « Entrer », **clique** (jamais
`shell.EnterDistrict(...)` appelé directement), et vérifie qu'un `DistrictInteriorScreenController`
est monté sous `ContentSlot`.

### Contrôle négatif — F0.3 doit ROUGIR quand la porte est cassée

**ARMÉ** — `AppShell.cs:177` **à l'époque** (round 2, avant l'insertion round 3), `case Tab.Empire:
MountTenant<CityMapController>();` → `MountTenant<LieutenantScreenController>();` (un seul site
touché — « l'onglet par défaut ne monte plus la carte », suggestion verbatim du mandat) ; restauré
ensuite, `diff` vérifié IDENTIQUE.

⛔⛔ **CORRIGÉ round 4 (revue ⊥, MAJEUR)** — même classe que les deux corrections ci-dessus : cette
section est à delta ZÉRO octet entre `535dd87` et `653acf8`, et l'ancre n'a pas suivi les 45 lignes
insérées round 3. RE-MESURÉ sur `653acf8` (`git show`, indépendant du working tree) :
```
$ python3 -c "
import subprocess
out = subprocess.run(['git','show','653acf8:Assets/Scripts/Shell/AppShell.cs'], capture_output=True, text=True).stdout
for i,l in enumerate(out.split(chr(10)), start=1):
    if 'case Tab.Empire' in l or 'MountTenant<CityMapController>' in l: print(i, repr(l))
"
188 '                case Tab.Empire:'
189 '                    MountTenant<CityMapController>();'
```
L'ancre correcte sur `653acf8` est `AppShell.cs:188-189` (le `case` à `:188`, l'appel à `:189`),
pas `:177`.

Commande :
```
LOG_FILE=/tmp/charpente-0203/neg-control-F0.3-ARMED.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 303 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteMontageLocatairesPlayModeTests.F0_3_LIntérieurDeDistrict_EstAtteignable_ParDesGestesDeProductionDepuisLaCarteParDefaut —   l'onglet par défaut doit monter CityMapController — Empire EST la carte (ruling 2026-08-25)
MafiaCI: RunPlayModeTests finished — passed=13 failed=1 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=33s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : F0.3 ROUGIT**, à la PREMIÈRE assertion (l'onglet par défaut ne monte pas la carte) —
avant même d'exercer le geste de clic. Aucun autre test Charpente touché (13 = 14 − 1).

**DÉSARMÉ** — restauré, `diff` → IDENTIQUE.
Commande :
```
LOG_FILE=/tmp/charpente-0203/neg-control-F0.3-DESARME.log timeout 300 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 303 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: RunPlayModeTests finished — passed=14 failed=0 skipped=0 inconclusive=0
```
`MafiaCI-harness: elapsed=34s timeout=900s issue=[sortie normale (RC=0)]`.

**Verdict : VERT — 14/14, aucun résiduel.**

⚠️ **Ce que ce contrôle ne prouve pas** : que le clic RÉEL sur « Entrer » (le geste anti-tautologie)
mène bien jusqu'au district — il prouve seulement que la PRÉCONDITION (Empire monte la carte) est
gardée. Preuve du clic RÉEL : F0.3 lui-même, désarmé, passe en amont de cette précondition, et son
corps exécute `enterBtn.onClick.Invoke()` puis attend `DistrictInteriorScreenController` — un test
qui appellerait `shell.EnterDistrict(16)` directement aurait pu rester vert même porte cassée sur le
CLIC (pas sur le montage) ; ce n'est pas le cas ici car F0.3 n'appelle jamais cette méthode.

---

## F0.3-bis — l'énoncé daté retiré, jamais cité, motif désigné par index

⛔ **CORRIGÉ (revue ⊥ round 2, MINEUR m3)** — les deux paragraphes ci-dessous citaient le motif
retiré **verbatim en prose**, alors même qu'ils affirmaient l'avoir paraphrasé : citer l'énoncé
qu'on retire le réintroduit (socle CLAUDE.md), y compris quand la citation sert à EXPLIQUER le
retrait. Réécrit pour désigner par INDEX (« motif n°2 ») ; sa valeur exacte ne vit plus qu'à
l'endroit légitime — la constante `MotifEnonceDateSurLaDestination` du code (portée déclarée,
scopée au fichier cible) et les commandes `grep -cF` ci-dessous (le littéral vit dans la commande,
jamais dans la prose qui rapporte son résultat).

`AppShell.cs` (ancienne ancre `:711-712` sur `af9893b`, RE-VÉRIFIÉE à l'oracle round 2 — voir
MINEUR m1 plus bas) portait un énoncé daté affirmant, en substance, que le district restait
joignable même sans bulle dédiée dans le dock — motif n°2. PARAPHRASÉ dans le commentaire de
remplacement (§3.3 du geste, voir `AppShell.cs` autour de `DockRatifie`/`BuildTabBar`) — jamais
cité verbatim dans ce document ni dans le code neuf.

**Motif n°2** (sa valeur exacte vit UNIQUEMENT dans la constante `MotifEnonceDateSurLaDestination`
du test, `CharpenteMontageLocatairesPlayModeTests.cs` — jamais recopiée ici en prose),
compte AVANT/APRÈS, jeu complet exécuté sur le fichier INTACT d'abord :
```
$ git show af9893b:Assets/Scripts/Shell/AppShell.cs | grep -cF "elle ne prend simplement plus une bulle"
1
$ grep -cF "elle ne prend simplement plus une bulle" Assets/Scripts/Shell/AppShell.cs
0
```
**AVANT : 1 · APRÈS : 0.** Le motif n'était pas déjà à 0 avant édition (donc c'est un vrai motif,
pas un motif faux) et il est bien à 0 après (le retrait a eu lieu, pas seulement le contrôle).

**Contrôle exécutable** : `CharpenteMontageLocatairesPlayModeTests.F0_3bis_
LEnonceDateSurLaDestinationAtteignable_NeReapparaitPlusDansAppShell`, `[Test]` synchrone, scopé au
seul fichier `AppShell.cs`, réutilise `CompterOccurrencesLitterales` (déjà écrit pour F0.4-c,
item 0.4) — **vert dans tous les runs Charpente (14/14) et le run complet final**.

---

## ⚠️ Désambiguïsation nécessaire — DEUX choses distinctes portent le nom « 0.3-bis »

Le mandat et le design utilisent « 0.3-bis » pour DEUX objets différents, et mon nommage de test
hérite de cette ambiguïté — signalé ici pour qu'elle ne trompe pas la revue :

1. **`front.md` item `0.3-bis`** (= la classe **C-c** du mandat) : corriger le commentaire daté
   d'`AppShell.cs` — ancre `:711-712` sur `af9893b` (RE-VÉRIFIÉE à l'oracle round 2, MINEUR m1 : la
   citation initiale de cette section, `:669-672`, pointait vers un bloc SANS RAPPORT — le
   dégradé du fondu du dock — motif d'écart probable : sortie `grep -n` lue via la couche
   d'affichage proxifiée du terminal, socle CLAUDE.md). C'est un retrait de TEXTE, fermé par
   `CharpenteMontageLocatairesPlayModeTests.F0_3bis_LEnonceDateSurLaDestinationAtteignable_
   NeReapparaitPlusDansAppShell` (§ F0.3-bis ci-dessus) — nommé `F0_3bis` par cohérence avec le
   nom donné dans « Les falsifiables » du mandat, mais c'est bien la classe **C-c**, pas la
   falsifiable comportementale du design.
2. **La falsifiable `F0.3-bis` du design (§4)** : « Depuis l'intérieur, l'action de tête du
   bandeau (« ← Carte ») ramène à la carte : le locataire monté redevient `CityMapController` et
   `CityTabDistrictId` retombe à −1 ». Cette propriété est **DÉJÀ COUVERTE**, avant même ce lot, par
   `NavigationPlayModeTests.NavF2_BackToMap_DestroysDistrictHost_RemountsCityMap` (précédent du
   chunk nav-hud, `§3.3`) — ses assertions sont EXACTEMENT celles demandées :
   `MountedTenantType == CityMapController` et `CityTabDistrictId == -1` après le clic sur
   « ← Carte ». **Vérifié vert** dans les deux runs complets (`run1-full.log`,
   `full-run-FINAL.log` — aucune ligne `FAIL` sur ce nom dans l'un ou l'autre). Je n'ai pas écrit de
   second test pour cette propriété : un test qui l'asserte déjà, à l'identique, existe et reste
   vert après le renommage `Tab.City`→`Tab.Empire` (`ExitToCityMap()` appelle désormais
   `ActivateTab(Tab.Empire)`, même effet observable).

⇒ Les DEUX exigences (le retrait de texte ET la propriété comportementale) sont fermées ; le nom de
mon test ne porte que la PREMIÈRE. Consigné plutôt que renommé (un renommage aurait exigé un
nouveau run Unity pour un gain de clarté cosmétique seulement — option conservatrice).

---

## C7 — round 2, MAJEUR M3 : `AppShell.Tab` re-façonné par ce lot, AUCUN détecteur avant ce test

`Enum.GetValues(typeof(AppShell.Tab))` : **0 occurrence dans tout le dépôt** avant ce correctif. Le
`switch (tab)` d'`ActivateTab` (`AppShell.cs`) n'a pas de `default` — côté C#, une `switch`
STATEMENT sans `default` n'est PAS une erreur de compilation (CS0161 ne s'applique qu'à une méthode
qui DOIT rendre une valeur ; `ActivateTab` est `void`), et une `switch` EXPRESSION rendrait un
avertissement CS8509 dont il y a **0 occurrence** dans tout `Assets/Scripts`. Le seul détecteur
possible est un TEST qui énumère les membres — la forme exacte existe déjà dans le fichier même que
ce lot édite : `CharpenteMontageLocatairesPlayModeTests.C5_ToutMembreDeNavTarget_AUnComportementNomme`
(écrite pour l'item 0.4, `DashboardController.NavTarget`). Un 5e membre ajouté à `Tab` **et** à
`DockRatifie` ferait déjà rougir F0.1-a/F0.2 (constantes à 4 entrées, à la main) ; ajouté à L'ENUM
SEUL, il est INVISIBLE à F0.1-a/F0.2 (aucun des deux ne dérive sa cardinalité attendue
d'`Enum.GetValues`) — l'onglet inatteignable, exactement la classe que ce lot existe pour fermer.

**Geste** : `CharpenteMontageLocatairesPlayModeTests.
C7_ToutMembreDeTab_AUnComportementNomme_MonteParLeDockOuDocumenteHorsDock`. Énumère
`Enum.GetValues(typeof(AppShell.Tab))`, garde `Assert.AreEqual(4, membres.Length)` (portée de
l'exhaustivité elle-même — même famille que C5), puis pour chaque membre appelle
`shell.ActivateTab(membre)` (méthode PUBLIQUE, pas de réflexion nécessaire ici, contrairement à
`DashboardController.OpenNav` qui est privée) et compare `shell.MountedTenantType` à une table
`typeParTab` ÉCRITE DANS LE TEST (anti-tautologie, même patron que C5/F0.2) — `Tab.More` en est
volontairement absent, vérifié par la branche « destination vide ASSUMÉE » à la place.

**Balayage de la population — « quels autres enums la surface de ce lot touche-t-elle, et lesquels
ont un détecteur ? »** : recherche de `switch *(` dans les 8 fichiers touchés par ce lot (`AppShell.
cs`, `AppShellPlayModeTests.cs`, `NavigationPlayModeTests.cs`, `HudPlayModeTests.cs`,
`CharpenteBootScenePlayModeTests.cs`, `CharpenteMontageLocatairesPlayModeTests.cs`,
`VuePrincipaleCapturePlayModeTests.cs`, `ChromeTabBarPlayModeTests.cs`) :
```
$ for f in Assets/Scripts/Shell/AppShell.cs Assets/Tests/PlayMode/AppShellPlayModeTests.cs Assets/Tests/PlayMode/NavigationPlayModeTests.cs Assets/Tests/PlayMode/HudPlayModeTests.cs Assets/Tests/PlayMode/CharpenteBootScenePlayModeTests.cs Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs Assets/Tests/PlayMode/VuePrincipaleCapturePlayModeTests.cs Assets/Tests/PlayMode/ChromeTabBarPlayModeTests.cs; do grep -c "switch *(" "$f"; done | python3 -c "import sys; print(sum(int(l) for l in sys.stdin))"
1
```
**Un seul `switch` existe dans les 8 fichiers de CE lot** — `switch (tab)` dans `AppShell.cs`, sur
`AppShell.Tab` — désormais fermé par `C7`. Le `switch` sur `DashboardController.NavTarget` (lot 0.4)
vit dans `DashboardController.cs`, HORS des 8 fichiers de CE lot, mais dans le périmètre élargi
demandé (« ce lot et le lot 0.4 ») — déjà fermé par `C5` (tour précédent).

**Compte : 2 enums pilotés par un `switch` dans le périmètre élargi (ce lot + lot 0.4), 2
détecteurs après ce correctif (0 avant, pour `Tab` ; `C5` déjà présent, pour `NavTarget`).**

⛔⛔ **CORRIGÉ round 3, MINEUR m2** — ré-exécuté MOT POUR MOT sur l'état LIVRÉ (round 3, oracle
Python plutôt que le `grep -c "switch *("` en boucle shell d'origine — même motif, comptage
indépendant) :
```
$ python3 -c "
import re
files = ['Assets/Scripts/Shell/AppShell.cs','Assets/Tests/PlayMode/AppShellPlayModeTests.cs',
 'Assets/Tests/PlayMode/NavigationPlayModeTests.cs','Assets/Tests/PlayMode/HudPlayModeTests.cs',
 'Assets/Tests/PlayMode/CharpenteBootScenePlayModeTests.cs',
 'Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs',
 'Assets/Tests/PlayMode/VuePrincipaleCapturePlayModeTests.cs',
 'Assets/Tests/PlayMode/ChromeTabBarPlayModeTests.cs']
pat = re.compile(r'switch *\(')
total = 0
for f in files:
    lines = open(f, encoding='utf-8').readlines()
    hits = [(i+1, l.rstrip()) for i,l in enumerate(lines) if pat.search(l)]
    total += len(hits)
    if hits:
        print(f, '->', len(hits))
        for ln, txt in hits: print('   ', ln, ':', txt.strip()[:110])
print('TOTAL:', total)
"
Assets/Scripts/Shell/AppShell.cs -> 1
    183 : switch (tab)
Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs -> 2
    578 : // (AppShell.Tab))` comptait 0 occurrence dans tout le dépôt avant ce test. Le `switch (tab)`
    619 : // Table ÉCRITE ICI, indépendamment du corps du `switch (tab)` qu'elle vérifie
TOTAL: 3
```
Le motif nu rend désormais **3**, pas **1** — mais **ce n'est pas un régression de la CLASSE que ce
balayage traque** : les 2 hits de plus sont dans le **bloc de commentaire de `C7` que ce correctif a
lui-même écrit** (`:578`, `:619`) — la docstring de `C7` CITE `` `switch (tab)` `` verbatim pour
expliquer ce que le test ferme, et un motif nu qui cherche « ce syntagme existe-t-il » le retrouve
dans sa propre explication. Exactement la même classe que le piège d'anti-péremption du socle
(citer un motif qu'on retire le réintroduit) — ici appliqué à un balayage de POPULATION, pas à un
retrait de clause : **le contrôle a été lancé AVANT la rédaction de C7 (round 2, quand la docstring
n'existait pas encore) ; la rédaction, ARRIVÉE APRÈS, invalide le compte sans que personne ne
l'ait re-couru.**
⇒ **Forme du socle appliquée** : valeur **attendue AVANT / APRÈS, RE-MESURÉE sur les DEUX bornes**
(pas déduite) :
```
$ git show af9893b:Assets/Scripts/Shell/AppShell.cs | grep -n "switch \*("
163:        switch (tab)
```
(les 7 autres fichiers ne contenaient AUCUN hit sur `af9893b` — `CharpenteMontageLocatairesPlayModeTests
.cs` y existait déjà, sans encore la docstring de `C7`, écrite round 2). **AVANT : 1. APRÈS (round
3, motif nu) : 3 — dont 2 auto-référentiels**, classés ligne par ligne ci-dessus, PAS par leur
littéral dans cette prose. **La population RÉELLE (switch STATEMENTS exécutables) reste inchangée à
1** — `AppShell.cs:183` (déplacé de `:163` à `:183` par les insertions de commentaires de ce lot,
toujours le seul, toujours fermé
par `C7`.
⚠️ **Et la propriété visée, pas la syntaxe** (le relecteur : « un `if/else` ou une chaîne de
ternaires sur `Tab` échappe à `switch *(` ») — balayage de TOUTE référence `AppShell.Tab.<membre>`
hors d'`AppShell.cs` (52 hits, tous en code de TEST : attentes/assertions/tables anti-tautologie
écrites indépendamment — aucun `if/else` ni ternaire de PRODUCTION dispatchant un type monté par
membre) et, DANS `AppShell.cs`, de toute mention `Tab.<membre>` hors commentaire (17 lignes :
le `switch` lui-même, `ExitToCityMap`, les 2 sites `ActivateTab(Tab.Empire)` du round 3 gardés par
sentinel, `DockRatifie`, `OnEmptyMoreDestination = tab == Tab.More` — une comparaison à UN SEUL
membre, jamais un dispatch multi-membres). **Aucune forme dérivée (if/else, ternaire) n'échappe au
`switch` unique** — vérifié, pas supposé.
**Compte final round 3 : 1 population réelle (inchangée), 1 détecteur (`C7`, inchangé) — le motif
brut est passé de 1 à 3 par auto-référence, jamais par une régression de la classe surveillée.**

**Contrôle négatif — ARMÉ** (`case Tab.Org: MountTenant<LieutenantScreenController>(); break;`
retirée du `switch` d'`ActivateTab`, seul site touché, restauré ensuite — vérifié par oracle Python) :
```
$ python3 -c "a=open('Assets/Scripts/Shell/AppShell.cs',encoding='utf-8').read(); b=open('/tmp/charpente-0203-r2/AppShell.cs.original-backup',encoding='utf-8').read(); print('IDENTICAL' if a==b else 'DIFFERENT (attendu — armé)')"
DIFFERENT (attendu — armé)
$ LOG_FILE=/tmp/charpente-0203-r2/neg-control-C7-ARMED.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
RC=1
$ grep -aE 'MafiaCI: RunPlayModeTests finished|MafiaCI: FAIL' /tmp/charpente-0203-r2/neg-control-C7-ARMED.log
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteMontageLocatairesPlayModeTests.C7_ToutMembreDeTab_AUnComportementNomme_MonteParLeDockOuDocumenteHorsDock —   Tab.Org doit monter EXACTEMENT LieutenantScreenController — trouvé <rien>.
MafiaCI: RunPlayModeTests finished — passed=14 failed=1 skipped=0 inconclusive=0
```
`elapsed=34s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : C7 ROUGIT en NOMMANT LE MEMBRE SANS COMPORTEMENT** (`Tab.Org` → `<rien>` monté) —
exactement la classe visée (un membre d'enum sans traitement dans le `switch`). `passed=14 failed=1`
= 15 − 1 : seul `C7` touché, `F0.1-a`/`F0.2`/`F0.2-c` restent verts (retirer une `case` du `switch`
ne touche ni la construction du dock ni ses libellés ni son ordre — confirme l'orthogonalité entre
`C7` et `F0.2`, § tableau de balayage ci-dessus).

**DÉSARMÉ** — restauré, vérifié IDENTIQUE par oracle Python :
```
$ python3 -c "a=open('Assets/Scripts/Shell/AppShell.cs',encoding='utf-8').read(); b=open('/tmp/charpente-0203-r2/AppShell.cs.original-backup',encoding='utf-8').read(); print('IDENTICAL' if a==b else 'DIFFERENT')"
IDENTICAL
$ LOG_FILE=/tmp/charpente-0203-r2/neg-control-C7-DESARME.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
RC=0
$ grep -aE 'MafiaCI: RunPlayModeTests finished|MafiaCI: FAIL' /tmp/charpente-0203-r2/neg-control-C7-DESARME.log
MafiaCI: RunPlayModeTests finished — passed=15 failed=0 skipped=0 inconclusive=0
```
`elapsed=33s timeout=900s issue=[sortie normale (RC=0)]`.

**Verdict : VERT — 15/15.**

---

## C-γ — round 2, MAJEUR M1 : deux fichiers touchés ne s'exécutent JAMAIS (portée réelle de l'attestation)

`ChromeTabBarPlayModeTests.cs` est `[Category("HUDv31")]` et `VuePrincipaleCapturePlayModeTests.cs`
est `[Category("Capture")]` — **ni l'un ni l'autre dans le filtre** de `MafiaCI.cs` (`Categories =
{ "W4P4a", "W3UDA", "W3U1", "W3U2", "Charpente" }`). La revue confirme par arithmétique exacte :
`303 − 201 = 102` = Screenshot 38 + HUDv31 31 + sans-catégorie 27 + Capture 4 + JUGE 2. Mesure prise
AVANT que `C7` (round 2) et `F0.2-b`/`BLOQUANT2_...` (round 3) n'existent — 3 tests neufs, TOUS dans
la catégorie `Charpente` (filtrée), donc dans les 201, jamais dans les 102.

⛔⛔ **VÉRIFIÉ round 3, MINEUR m3** — le relecteur : « l'égalité survit en 304 − 202 = 102 » (round 2,
après `C7`). Re-mesuré round 3, sur le run complet réel (§ Run complet du juge, run D ci-dessous) :
`306 − 204 = 102`. Les 102 exclus (Screenshot/HUDv31/sans-catégorie/Capture/JUGE) sont EXACTEMENT
les mêmes tests qu'à la mesure d'origine — aucun des 3 tests ajoutés depuis (`C7`, `F0.2-b`,
`BLOQUANT2_DashboardMonteEnSurimpressionAuDemarrage_...`) n'est dans `ChromeTabBarPlayModeTests.cs`
ni `VuePrincipaleCapturePlayModeTests.cs` (les deux seuls fichiers hors-catégorie touchés par ce
lot) : `C7`/`F0.2-b` vivent dans `CharpenteMontageLocatairesPlayModeTests.cs`, `BLOQUANT2_...` dans
un fichier NEUF (`CharpenteOuvertureSessionOverlayPlayModeTests.cs`) — tous les trois
`[Category("Charpente")]`, donc dans le côté FILTRÉ (204), jamais dans le côté EXCLU (102).
**L'égalité est une invariante de la POPULATION exclue, pas de la population filtrée** — elle
survit à tout ajout de test dans les catégories déjà filtrées, et c'est exactement ce que round 2
et round 3 confirment l'un après l'autre.

⛔ **Je N'AJOUTE PAS ces catégories au filtre** (consigne explicite du round 2) : ça ferait entrer
d'un coup des dizaines de tests jamais exécutés contre le back actuel, et un rouge de masse ne
serait attribuable à rien — exactement le précédent maison de W3.U2/W6.2 (« un rouge de FIXTURE
n'est pas un rouge de test : tout ce qui vit derrière lui est NON COUVERT »).

**Ce que ce lot a modifié dans ces 2 fichiers, et ce que ça couvre RÉELLEMENT** :

- `ChromeTabBarPlayModeTests.cs` — 2 hunks, 6 insertions / 4 suppressions (`git diff --stat af9893b`
  re-vérifié round 2). Les deux sont des renommages MÉCANIQUES `Tab_Home`→`Tab_Empire` /
  `Home/City`→`Empire/CityMapController` en PROSE de commentaire — AUCUNE ligne de code exécutable
  changée. **Ce lot n'a AUCUNE preuve d'exécution que ce fichier compile encore correctement contre
  le reste du projet APRÈS le renommage de l'enum `Tab`** (le compilateur Unity, lui, DOIT compiler
  ce fichier pour que les autres catégories tournent — un run réussi de `Charpente`/`W3U2`/etc.
  prouve la COMPILATION du fichier entier, pas l'EXÉCUTION de ses tests). La ligne éditée
  (`shell.TabBarRoot.Find("Tab_Empire")`) n'a donc **jamais été exercée** par ce lot.
- `VuePrincipaleCapturePlayModeTests.cs` — 2 hunks, 12 insertions / 2 suppressions (re-mesuré après
  le correctif m2, `git diff af9893b -- <fichier> | cat` — la commande a été rejouée pour cette
  section précise après l'édition, jamais recopiée de mémoire). Même situation : renommage
  `Tab.City`→`Tab.Empire` mécanique + le correctif `yield` du MINEUR m2 (§ ci-dessous) — **jamais
  exécuté par ce lot**. Le `yield return null;` ajouté pour m2 n'a donc pas non plus été PROUVÉ par
  un run — sa justification est un raisonnement sur le code (`Object.Destroy` différé + absence
  d'ordre garanti de `FindFirstObjectByType`), pas une mesure avant/après.

**Compte, collé** : 8 fichiers touchés par ce lot, **6 exécutés** par au moins une catégorie du
filtre (`AppShell.cs` compile-vérifié par toute catégorie ; `AppShellPlayModeTests.cs` — `W3U1` ;
`NavigationPlayModeTests.cs`/`HudPlayModeTests.cs` — `W3U2` ; `CharpenteBootScenePlayModeTests.cs`/
`CharpenteMontageLocatairesPlayModeTests.cs` — `Charpente`), **2 NON EXÉCUTÉS**
(`ChromeTabBarPlayModeTests.cs`, `VuePrincipaleCapturePlayModeTests.cs` — compilation seulement).

⇒ **L'attestation de ce document se limite donc à** : (a) compilation propre du projet ENTIER,
`ChromeTabBarPlayModeTests.cs`/`VuePrincipaleCapturePlayModeTests.cs` compris (sinon AUCUNE
catégorie n'aurait pu tourner — les 15 runs Charpente de ce round, plus les 3 runs complets, sont
tous des preuves NÉGATIVES d'erreur de compilation sur ces 2 fichiers) ; (b) exécution VERTE réelle
sur 6 des 8 fichiers touchés ; (c) AUCUNE preuve d'exécution sur les comportements runtime touchés
dans les 2 fichiers restants (le nom `Tab_Empire` trouvé par `Find`, le `yield` ajouté au m2). Ce
n'est PAS « 0 régression sur toute la surface » — c'est « 0 régression sur la surface EXÉCUTÉE, et
0 erreur de COMPILATION sur le reste ».

---

## BLOQUANT 1 — round 3 : l'attribut DESTINATION du dock, jamais fermé

**Ce que le relecteur a armé** (une seule variable, un seul site à l'époque, `AppShell.cs:835`) :
`b.onClick.AddListener(() => ActivateTab(tab));` → `b.onClick.AddListener(() => ActivateTab
(Tab.Empire));` — le dock garde ses 4 noms, ses 4 libellés, son ordre ; FAMILLE/FILIÈRE/PLUS mènent
toutes à la carte. Mesuré par le relecteur : `Charpente` 15/0 et juge complet `passed=199 failed=3`
— **byte-identique au tip propre**. Aucune des 5 catégories ne voit le défaut.

**Pourquoi les 3 gardes existantes passaient** : `F0.1-a` compare l'ENSEMBLE des NOMS de bouton ;
`F0.2` compare des PAIRES (nom, **libellé**) — round 2 a fermé « aveugle à la correspondance » sur
CET attribut seul ; `C7` (round 2, `CharpenteMontageLocatairesPlayModeTests.cs`) énumère
`Enum.GetValues(typeof(AppShell.Tab))` et appelle **`shell.ActivateTab(membre)` directement** — il
prouve que le SWITCH route juste, jamais qu'une bulle CLIQUÉE appelle le bon membre. Mesuré (oracle
Python, balayage `Assets/Tests/`) : **0 `onClick.Invoke()` sur un `Tab_*` dans tout le dépôt** avant
ce round.

### L'erreur de méthode round 2, nommée et corrigée

Round 2 avait balayé « quelles AUTRES gardes assertent un ensemble de valeurs qui viennent par
paires » et conclu « 5 sites examinés, 1 vulnérable, 3 hors classe » — exact sur SA population
(les ASSERTIONS DE TEST), à côté de LA classe, qui porte sur **les correspondances que le DOCK
TRANSPORTE**. Repassé ici sur la bonne population — pour chaque attribut porté par une bulle,
ce qui l'asserte et par quoi :

| # | attribut | asserté par | fermé où |
|---|---|---|---|
| 1 | nom (`Tab_{tab}`) | ensemble (`F0.1-a`) + paire (`F0.2`) | round 1/2 |
| 2 | libellé (texte sous le bouton) | paire avec le nom (`F0.2`) | round 2 |
| 3 | **ordre gauche→droite** | **AUCUNE garde** — `CollectionAssert.AreEquivalent` (F0.1-a/F0.2) est insensible à l'ORDRE | **round 3, `F0.2-b`** |
| 4 | **destination** (`onClick` → type monté) | **AUCUNE garde** — `C7` route EN AVAL du bouton (`shell.ActivateTab` direct) | **round 3, `F0.2-b`** |
| 5 | indicateur d'actif (filet visible) | `ChromeTabBarPlayModeTests.ActiveTab_NeverFlatFill_OnlyThinIndicator` (catégorie `HUDv31`, hors `Charpente`) — style/bascule, par `shell.ActivateTab` direct LUI AUSSI (même angle mort que `C7`) | **hors périmètre — consigné, non repris** (le relecteur : « c'est le SEUL [attribut] qui décide de l'atteignabilité » = destination ; l'indicateur d'actif est un défaut de STYLE, pas d'atteignabilité) |

**Compte : 5 attributs identifiés, 2 fermés par ce round (ordre, destination), 2 déjà fermés (nom,
libellé), 1 hors-classe consigné honnêtement (indicateur d'actif).**

★ Le même document applique la règle anti-tautologie à `F0.3`/`EnterDistrict` (un CLIC RÉEL sur
« Entrer », jamais `shell.EnterDistrict(...)` appelé directement) sans se l'appliquer à lui-même sur
le dock : `C7` fait EXACTEMENT ce que `F0.3` proscrit. Reconnu.

### Le geste : `F0.2-b`, `CharpenteMontageLocatairesPlayModeTests.cs`

Pour chacun des 4 membres, DANS L'ORDRE : `shell.TabBarRoot.Find($"Tab_{membre}").GetComponent
<Button>().onClick.Invoke()` — le geste de production — puis compare `shell.MountedTenantType`
(et `OnEmptyMoreDestination` pour `More`) à une table écrite INDÉPENDAMMENT dans le test (même
anti-tautologie que `C7`/`F0.2`). L'ORDRE gauche→droite est fermé dans la MÊME passe
(`CollectionAssert.AreEqual`, PAS `AreEquivalent` — l'ordre EST l'attribut mesuré).

### Contrôle négatif — réarme EXACTEMENT le défaut du relecteur

**ARMÉ** (`Assets/Scripts/Shell/AppShell.cs`, seul site touché, backup Python
`/tmp/charpente-r3/AppShell.cs.original-backup`) :
```
$ python3 -c "
p = 'Assets/Scripts/Shell/AppShell.cs'
s = open(p, encoding='utf-8').read()
old = 'b.onClick.AddListener(() => ActivateTab(tab));'
new = 'b.onClick.AddListener(() => ActivateTab(Tab.Empire));'
assert s.count(old) == 1
open(p, 'w', encoding='utf-8').write(s.replace(old, new))
print('ARMED')
"
ARMED
```
Commande (catégorie `Charpente` narrowée, `Assets/Editor/MafiaCI.cs:Categories` temporaire) :
```
LOG_FILE=/tmp/charpente-r3/neg-control-F0.2b-ARMED.log timeout 280 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 306 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteMontageLocatairesPlayModeTests.F0_2b_ChaqueBoutonDuDock_ParUnClicReel_MeneALaDestinationRatifiee_EtDansLOrdre —   le CLIC RÉEL sur Tab_Org doit monter EXACTEMENT LieutenantScreenController — trouvé CityMapController. Un clic qui route vers une AUTRE destination (ou vers Tab.Empire, le défaut EXACT armé par le relecteur round 3) doit ROUGIR ICI, en nommant la bulle fautive.
MafiaCI: RunPlayModeTests finished — passed=16 failed=1 skipped=0 inconclusive=0
```
`elapsed=66s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : `F0.2-b` ROUGIT, en NOMMANT LA BULLE FAUTIVE** (`Tab_Org` — trouvé `CityMapController`
au lieu de `LieutenantScreenController`, `Tab_Empire` passe car sa propre destination EST déjà
`CityMapController`). `16 = 17 − 1` : seul `F0.2-b` touché.

**DÉSARMÉ** — restauré, vérifié OCTET À OCTET en Python (jamais `diff` nu, piège déjà mesuré round 2) :
```
$ cp /tmp/charpente-r3/AppShell.cs.original-backup Assets/Scripts/Shell/AppShell.cs
$ python3 -c "
a = open('Assets/Scripts/Shell/AppShell.cs', encoding='utf-8').read()
b = open('/tmp/charpente-r3/AppShell.cs.original-backup', encoding='utf-8').read()
print('IDENTICAL' if a == b else 'DIFFERENT'); print('len a =', len(a), 'len b =', len(b))
"
IDENTICAL
len a = 75017 len b = 75017
```
Commande :
```
LOG_FILE=/tmp/charpente-r3/neg-control-F0.2b-DESARME.log timeout 280 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 306 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: RunPlayModeTests finished — passed=17 failed=0 skipped=0 inconclusive=0
```
`elapsed=66s timeout=900s issue=[sortie normale (RC=0)]`.

**Verdict : VERT — 17/17, aucun résiduel.**

---

## BLOQUANT 2 — round 3 : `DashboardController` débranché de TOUTE production, 4 maillons morts

**Mesuré par le relecteur**, `af9893b` → `HEAD` (mentions de production, hors commentaires, hors le
fichier de la classe) : `DashboardController` `1 → 0`. Il est le SEUL référent de production de
`BuildingCardController`, `ExceptionQueueController`, `AutonomyInboxController` (les 3 via
`DashboardController.OpenNav`) ; et `ExceptionQueueController` est le seul référent de
`ExceptionDetailController` (via `OpenDetail`). Forme C du socle (« les écrivains existent,
l'APPELANT manque »), sur 4 maillons à la fois, dans un lot dont la raison d'être est
l'atteignabilité.

**Pourquoi rien ne le voyait** : la falsifiable de l'item 0.5 (« tout `*Controller.cs` a ≥ 1 mention
de production ») ne compte que des MENTIONS, pas la CHAÎNE ; `F0.4-a` reste verte parce qu'elle
FABRIQUE elle-même le Dashboard (un harnais local, `dashboardHarnaisGo`, jamais monté par la
production) que la production ne construit plus.

### Le geste — assumé par le contrôleur, périmètre étendu à la décision B déjà ratifiée

La décision B (« l'Accueil devient l'ouverture de session, posée en surimpression au-dessus de
l'Empire », `front.md` §4) est ratifiée par l'user. Le mécanisme est DÉJÀ livré par l'item 0.4 :
`IShellNavigator.MonterLocataireEnSurimpression<T>()`. Geste : après l'acquisition de session
(`AppShell.AcquireSessionThenActivateHome`), le shell monte `DashboardController` EN SURIMPRESSION
au-dessus d'Empire, sur les DEUX branches (succès et repli d'échec), gardé par LE MÊME sentinel
`(Tab)(-1)` qui protège déjà `ActivateTab(Tab.Empire)` (payé deux fois ailleurs dans ce fichier —
capturé dans une variable locale AVANT l'activation, puisqu'après `ActivateTab` `CurrentTab` n'est
plus le sentinel). Rien d'autre : les 4 panneaux orphelins de l'écran ④ (leur PROPRE rendu, au-delà
de leur seule atteignabilité) restent l'item 0.5, non repris ici.

**Risque de bord évalué AVANT d'écrire le code** (blast radius) : sur les 9 fichiers de test qui
bootent un `AppShell` réel (`grep -rln "AddComponent<AppShell>" Assets/Tests/`), 8 sont HORS
`Charpente` (`TopBarDoctrineV31PlayModeTests.cs`,
`NavigationPlayModeTests.cs`, `ChromeTabBarPlayModeTests.cs`, `ChromeSafeAreaPlayModeTests.cs`,
`HudPlayModeTests.cs`, `AppShellPlayModeTests.cs`, `VuePrincipaleCapturePlayModeTests.cs`,
`DistrictInteriorDioramaPlayModeTests.cs`). Vérifié POUR CHACUN qu'aucune assertion n'enumère un
ENSEMBLE FERMÉ de tenants sous `ContentSlot` ni un COMPTE EXACT de ses enfants (`AppShellPlayModeTests
.C1F2` compare `shell.ShellCanvas.transform.childCount` — inchangé, le Dashboard vit SOUS
`ContentSlot`, pas au niveau du Canvas — et `Find("CityMapRoot")`/`Find("LieutenantBackdrop")` par
NOM, jamais une énumération ; `VuePrincipaleCapturePlayModeTests` utilise un PLANCHER
`Assert.Greater(noeuds, 20)`, jamais un compte exact). Un commentaire PRÉ-EXISTANT sur
`af9893b` (`TopBarDoctrineV31PlayModeTests.cs:42`, jamais retouché par ce lot) documentait déjà —
avant que ce lot ne débranche Dashboard — que « Mounting a real AppShell triggers ITS OWN demo
sign-in + Home mount (DashboardController's own auth attempt) » : ce round RESTAURE ce régime
(devenu faux round 1, vrai à nouveau round 3, pour une AUTRE raison — surimpression, pas onglet
Home), et la co-existence Dashboard+heat-probe qu'il documente était déjà tolérée par
`ChromeTabBarPlayModeTests.BuildBareTopBar` (qui évite un `AppShell` réel PRÉCISÉMENT pour cette
raison, mécanisme inchangé par ce lot).

### Falsifiable — `CharpenteOuvertureSessionOverlayPlayModeTests.cs` (fichier neuf)

Depuis la scène du build, gestes de production UNIQUEMENT : Dashboard trouvé (JAMAIS fabriqué —
`shell.ContentSlot.GetComponentInChildren<DashboardController>(true)`), 5 boutons nav CLIQUÉS RÉELLEMENT
(`Nav_CityMap`/`Nav_BuildingCard`/`Nav_Filière`/`Nav_Exceptions`/`Nav_Autonomy`), puis un clic RÉEL
sur la ligne d'une carte SEEDÉE (`Tools/seed_operational_demo.mjs`, `[OneTimeSetUp]` — 4 cartes
déterministes, précondition SERVEUR réelle, anti-vacuité `Assert.Greater(queue.Cards.Length, 0)`)
pour atteindre `ExceptionDetailController`. Réachabilité, PAS rendu. Anti-vacuité du compte : liste
NOMMÉE de 7 écrans (`Dashboard`, `CityMap`, `BuildingCard`, `Pipeline`, `ExceptionQueue`, `Autonomy`,
`ExceptionDetail`) comparée par `CollectionAssert.AreEqual` à une cible écrite dans le test.

### Contrôle négatif — retire les 2 sites de montage (simule l'état round 2)

**ARMÉ** (les 2 lignes `MonterLocataireEnSurimpression<DashboardController>();` retirées par index
de ligne exact — jamais par substring, un piège de chevauchement d'indentation mesuré en cours de
route : une recherche par SOUS-CHAÎNE indentée matchait aussi, décalée, à l'intérieur de l'AUTRE
ligne plus indentée — corrigé en retirant par NUMÉRO DE LIGNE) :
```
$ python3 -c "
p = 'Assets/Scripts/Shell/AppShell.cs'
lines = open(p, encoding='utf-8').readlines()
assert 'MonterLocataireEnSurimpression<DashboardController>' in lines[363]
assert 'MonterLocataireEnSurimpression<DashboardController>' in lines[410]
del lines[410]; del lines[363]
open(p, 'w', encoding='utf-8').write(''.join(lines))
"
$ grep -c "MonterLocataireEnSurimpression<DashboardController>" Assets/Scripts/Shell/AppShell.cs
0
```
Commande :
```
LOG_FILE=/tmp/charpente-r3/neg-control-BLOQUANT2-ARMED.log timeout 280 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 306 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.CharpenteOuvertureSessionOverlayPlayModeTests.BLOQUANT2_DashboardMonteEnSurimpressionAuDemarrage_SaChaineDeNavEstAtteignableJusquADetail —   le Dashboard doit être monté AUTOMATIQUEMENT en surimpression au démarrage — sans lui, BuildingCardController/ExceptionQueueController/AutonomyInboxController/ExceptionDetailController sont TOUS injoignables (BLOQUANT 2, revue ⊥ round 3).
MafiaCI: RunPlayModeTests finished — passed=16 failed=1 skipped=0 inconclusive=0
```
`elapsed=60s timeout=900s issue=[sortie normale (RC=1)]`.

**Verdict : ROUGIT, en NOMMANT L'OBJET FAUTIF** (« le Dashboard doit être monté... » — le test ne
peut même pas progresser jusqu'aux 5 boutons, exactement la classe qu'il ferme). `16 = 17 − 1`.

**DÉSARMÉ** — restauré depuis le MÊME backup que BLOQUANT 1 (`AppShell.cs.original-backup` couvre
les deux régressions, jamais réécrit entre les deux), vérifié OCTET À OCTET :
```
$ cp /tmp/charpente-r3/AppShell.cs.original-backup Assets/Scripts/Shell/AppShell.cs
$ python3 -c "
a = open('Assets/Scripts/Shell/AppShell.cs', encoding='utf-8').read()
b = open('/tmp/charpente-r3/AppShell.cs.original-backup', encoding='utf-8').read()
print('IDENTICAL' if a == b else 'DIFFERENT'); print('len a =', len(a), 'len b =', len(b))
"
IDENTICAL
len a = 75017 len b = 75017
```

**Verdict : VERT — 17/17 confirmé au run final** (§ ci-dessous, run `charpente-only-final.log`).

---

## Deviations (imprévus non bloquants, option conservatrice, consignés)

0. **ROUND 2 — le run C (complet, 5 catégories) a dépassé le plafond par défaut de l'outil Bash et
   est passé en arrière-plan malgré la consigne « premier plan, bloquant ».** La commande elle-même
   était bien lancée sans `run_in_background`, mais je n'avais pas passé de `timeout` explicite à
   l'outil Bash ; son plafond par défaut (120 s) est inférieur à la durée réelle d'un run complet
   (~244 s, mesuré). Le harnais a donc basculé la commande en tâche de fond de son propre chef, et
   la notification de fin est arrivée normalement, sans perte d'information (log conservé, sortie
   lue en entier, réconciliée § « Run complet du juge »). Option conservatrice : je n'ai PAS relancé
   le run pour le forcer en premier plan (ça aurait coûté un 4e run complet inutile) — j'ai
   simplement traité la notification de fin comme preuve, exactement comme un run bloquant.
   ⇒ **Pour tout run complet futur, passer explicitement `timeout: 600000` (ou plus) à l'outil
   Bash** — c'est ce qui manquait ici, pas un choix de `run_in_background`.

1. **RÉGRESSION TROUVÉE ET CORRIGÉE — F0.4-a (item 0.4, déjà clos) cassait par un effet de bord non
   anticipé du ruling.** Le run préliminaire (5 catégories, AVANT correctif) a rendu
   `passed=197 failed=4` : 3 rouges pré-existants attendus (`NavD12`, `StaleAbandonedShell`,
   `NavF4`) **plus** `F0_4a_SousUnShell_ToutLocataireVivantEstDansContentSlot`, avec le message :
   ```
   les locataires vivants sous le shell doivent être EXACTEMENT {CityMapController, BuildingCardController,
   LaunderingController, ExceptionQueueController, AutonomyInboxController, ExceptionDetailController}
   (un de chaque) — trouvé {CityMapController, ExceptionDetailController, AutonomyInboxController,
   BuildingCardController, CityMapController, LaunderingController, ExceptionQueueController} (...
   Tenant_CityMapController (CityMapController), Tenant_CityMapController (CityMapController), ...)
   ```
   **Cause** : Empire (le nouvel onglet par défaut) monte lui-même un `CityMapController` — mon
   harnais Dashboard appelait ensuite `OpenCityMap()`, qui en montait un SECOND en surimpression
   (sans jamais démonter celui de l'onglet). Deux `CityMapController` vivants au lieu d'un.
   **Correctif (option qui change le moins de surface)** : `shell.ActivateTab(AppShell.Tab.More);`
   AVANT d'instancier le harnais — `More` ne monte rien (§0 hors périmètre) et `ActivateTab` démonte
   inconditionnellement le tenant courant. Repart d'un `ContentSlot` vide, les 6 gestes de
   production (5 `OpenNav` + `OpenDetail`) produisent alors EXACTEMENT 6 locataires, sans collision.
   **Vérifié** : run narrowed Charpente APRÈS correctif → `passed=14 failed=0` (voir § Juge complet
   pour le run 5-catégories). Ce n'est pas une déviation de DESIGN (le design ne prescrivait pas ce
   détail de harnais) — c'est un défaut de MON premier jet, trouvé par l'exécution réelle et corrigé
   avant de continuer, conformément à la règle « au moindre doute, corriger avant d'avancer ».
   **`typesAttendus` de F0.4-a passe de 7 à 6 types** (`DashboardController` en sort — ce n'est plus
   un locataire monté PAR le shell depuis ce lot, item 0.5 le concerne).

2. **Choix du harnais `DashboardController` hors shell pour F0.4-a** — le design de ce lot (0.2/0.3)
   ne prescrit pas comment adapter F0.4-a (item 0.4, DÉJÀ CLOS) à la disparition de `Tab.Home`. Le
   design §3.2 dit explicitement : « `DashboardController` n'est plus monté par aucun onglet […] Ce
   lot le laisse débranché et le DIT ». Option retenue (change le moins de surface) : instancier
   `DashboardController` comme un OBJET DE TEST NU (jamais monté via `ConstruireLocataire`), pour
   continuer à exercer `OpenNav`/`OpenDetail` (le MÉCANISME de l'item 0.4, inchangé —
   `ShellNavigatorLocator.Find()` ne dépend pas d'où l'appelant vit) — et le DÉTRUIRE avant
   l'énumération finale pour ne pas fausser la garde de containment avec un objet qui n'a jamais
   été un locataire monté par le shell. Alternative rejetée : laisser Dashboard mounté quelque part
   pour qu'il « compte » — aurait réintroduit une entité qui n'existe plus dans la topologie du
   dock, contrairement au principe « jamais d'entité inventée ».

3. **`HudPlayModeTests.HudF7` — alternance Empire↔Org au lieu de Home↔City.** Le test protège contre
   une classe de course (deux comptes démo différents pouvant prendre la main sur le TopBar). Depuis
   la fusion, il n'y a plus deux ONGLETS séparés portant chacun une identité démo distincte : Empire
   (CityMapController, repli `citymap_demo`) reste le SEUL locataire à identité démo PROPRE et
   DIFFÉRENTE ; Org (LieutenantScreenController) partage l'identité `operational_demo` du shell,
   comme le faisait l'ancien Home. Alterner Empire↔Org exerce donc EXACTEMENT la même classe de
   défaut (montage/démontage répété du seul locataire à identité concurrente) — le MÉCANISME est
   conservé, seuls les onglets qui l'exercent changent (le FAIT). Option qui change le moins de
   surface : GARDER le test, adapter l'alternance, ne pas le supprimer ni relâcher son assertion.

4. **`AppShellPlayModeTests.LateEmpireActivation_...` — onglet-témoin `Org` au lieu de `City`.**
   Le test prouve que le sentinel `(Tab)(-1)` empêche un montage tardif forcé d'écraser la
   navigation du joueur. Utiliser `Empire` comme « onglet déjà touché par le joueur » ne prouverait
   plus rien (c'est désormais l'onglet que le boot activerait de toute façon — aucune différence
   observable entre « le joueur a navigué » et « rien ne s'est encore passé »). `Org` restaure le
   contraste nécessaire. Mécanisme (le sentinel) inchangé ; fait (quel onglet illustre la
   navigation du joueur) changé — exactement la distinction du design §6.

5. **`C1F2_TenantMountsInContentSlot_...` — second tenant `Org`/`LieutenantBackdrop` au lieu de
   `City`/`CityMapRoot`.** Le test prouve la non-accumulation (deux montages successifs, le premier
   objet doit disparaître). Puisque le premier montage EST désormais Empire/CityMapController
   (l'onglet par défaut), le second doit être un AUTRE onglet pour rester une preuve de swap — `Org`
   choisi (déjà utilisé ailleurs dans le même fichier, `LieutenantBackdrop` confirmé par lecture du
   code de `LieutenantScreenController.BuildLayout`).

6. **Comptage des tests renommés vs mis à jour (design §6)** — classification explicite, comme
   demandé :
   - `AppShellPlayModeTests.C1F1_EachOfThe5Tabs_...` → `C1F1_EachOfThe4Tabs_...` : assertait le FAIT
     (Home monte Dashboard) — **remplacé** par le nouveau fait (Empire monte CityMapController) ;
     le MÉCANISME (chaque onglet monte le type attendu, le 4e est l'état vide nommé) est conservé.
   - `LateHomeActivation_...` → `LateEmpireActivation_...` : MÉCANISME (sentinel) conservé, FAIT
     (onglet-témoin) changé — voir Deviation 4.
   - `HudF1_..._TenantReceivesInjectedToken` : assertait le FAIT « Home monte DashboardController » ;
     mis à jour vers « Empire monte CityMapController ». MÉCANISME (injection du jeton du shell,
     sans repli) conservé, testé à l'identique.
   - `HudF7_SameCallsign_AcrossThreeHomeCityAlternations_...` → `...ThreeEmpireOrgAlternations_...` :
     voir Deviation 3.
   - `F0_4a` (item 0.4) : voir Deviations 1-2. Le MÉCANISME (containment sous ContentSlot pour tout
     locataire monté par `OpenNav`/`OpenDetail`) est conservé ; le FAIT « qui inclut Dashboard dans
     la population » a changé (Dashboard en sort, il n'est plus monté par le shell).
   Aucun test n'a été SUPPRIMÉ ni son assertion RELÂCHÉE — tous mis à jour avec le nouveau fait
   attendu, jamais en retirant une assertion.

7. **Comptage exhaustif des sites `Tab.Home`/`Tab.City` touchés** (compile-forcé par le retrait de
   l'enum, hors du périmètre strict AppShell.cs mais nécessaire à la compilation du projet) :
   `AppShell.cs` (le geste), `AppShellPlayModeTests.cs`, `NavigationPlayModeTests.cs`,
   `HudPlayModeTests.cs`, `CharpenteBootScenePlayModeTests.cs`,
   `CharpenteMontageLocatairesPlayModeTests.cs`, `VuePrincipaleCapturePlayModeTests.cs`,
   `ChromeTabBarPlayModeTests.cs` (littéral `"Tab_Home"`, pas `Tab.Home`). **8 fichiers, tous
   corrigés** — vérifié par balayage final (`grep -rnE '\bTab\.Home\b|\bTab\.City\b'` sur
   `Assets/Scripts` et `Assets/Tests`, 0 occurrence en code exécutable, uniquement dans des
   commentaires/messages de prose qui NOMMENT la fusion historique).
8. **ROUND 3, BLOQUANT 2 — brancher l'ouverture de session (décision B) est un dépassement de
   périmètre EXPLICITEMENT ASSUMÉ par le contrôleur**, pas une décision d'architecture prise seul :
   le design §5 de ce lot listait « il ne branche pas l'ouverture de session… c'est l'item 0.5 »
   comme HORS PÉRIMÈTRE. Le relecteur, en trouvant les 4 maillons morts que ce retrait produisait,
   a écrit verbatim « c'est un choix de périmètre que j'assume » et donné le mécanisme exact à
   utiliser (`MonterLocataireEnSurimpression<T>`, déjà livré). Exécuté tel quel — SEUL le point
   d'entrée est rebranché, le RENDU propre du Dashboard (item 0.5 : les 4 panneaux orphelins de
   l'écran ④) reste HORS de ce round.
   ⇒ **Risque de bord évalué AVANT d'écrire** (§ BLOQUANT 2 ci-dessus) : 9 fichiers hors `Charpente`
   bootent un `AppShell` réel ; vérifié qu'aucun n'énumère un ensemble FERMÉ de tenants ni un compte
   EXACT des enfants de `ContentSlot` — confirmé ENSUITE par le juge complet (§ Run complet, run D) :
   les 3 mêmes échecs pré-existants, 0 nouveau, sur 204 tests filtrés.
   ⇒ **Choix de précondition serveur pour la jambe ExceptionQueue→ExceptionDetail** (le nouveau
   test a besoin d'au moins une carte SEEDÉE pour qu'un clic réel sur « Ouvrir » atteigne
   `ExceptionDetailController`) : réutilisation du régime STANDARD déjà établi par ce dépôt
   (`SeederSupport.RunSeeder(OperationalSeeder, OperationalMarker)`, `[OneTimeSetUp]`, précédent
   `NavigationPlayModeTests`/`HudPlayModeTests`/`DashboardPlayModeTests`) — pas un geste neuf,
   REUSE d'un mécanisme déjà commun à ce dépôt. Isolé dans un fichier NEUF plutôt qu'ajouté aux deux
   fixtures `Charpente` existantes, pour ne pas leur imposer les ~40 s du seeder alors qu'aucune de
   leurs assertions n'en a besoin.
   ⇒ **Ordre gauche→droite ajouté à `F0.2-b` alors que le relecteur ne le demandait pas
   explicitement** : trouvé en énumérant honnêtement TOUS les attributs que le dock transporte
   (§ BLOQUANT 1) — un attribut non testé restait un trou identifié pendant le même balayage que
   celui qui a fermé la destination ; le fermer coûtait une liste ordonnée en plus d'une comparaison
   déjà écrite, jamais un mécanisme séparé — retenu par cohérence avec « repasser la classe sur
   TOUTE la population », pas laissé de côté par confort.

9. **ROUND 4, MINEUR 3 — `RefreshTabButtonVisuals` allume l'indicateur d'Empire pendant que
   l'overlay Dashboard recouvre la carte ; le dock ment sur ce qui est RÉELLEMENT à l'écran.**
   Consigné, non corrigé ce round (demande explicite de la revue : « Consigne (item 0.5) »). Le
   mécanisme : `AcquireSessionThenActivateHome` appelle `ActivateTab(Tab.Empire)` PUIS
   `MonterLocataireEnSurimpression<DashboardController>()` — la première met le tiret d'actif sous
   `Tab_Empire`, la seconde pose un backdrop plein écran PAR-DESSUS la carte. Un joueur au tout
   premier écran voit donc un dock qui prétend « tu es sur Empire » alors que rien de la carte n'est
   visible. Ce n'est PAS une régression de ce lot (le tiret d'actif existait déjà avant l'overlay) ;
   c'est un effet de bord du BLOQUANT 2 round 3 (brancher l'overlay) qui n'avait pas été nommé.
   Rattachement au bon item : le RENDU de l'écran d'accueil (savoir ce que le dock doit montrer
   PENDANT que l'overlay est dessus) est une décision de present­ation qui appartient au « rendu
   propre du Dashboard » — item 0.5, déjà le propriétaire nommé du reste du chrome de cet écran
   (design §5, § BLOQUANT 2 round 3 ci-dessus).

10. **ROUND 4, MINEUR 1 — l'overlay Accueil n'a AUCUN geste de sortie ; ESCALADÉ, PUIS TRANCHÉ PAR LE CONTRÔLEUR, PUIS RÉOUVERT ET FERMÉ round 7 (voir § « FERMETURE DE L'OVERLAY ACCUEIL » en tête de ce document, ex-« ÉCART AU RULING »).**
    La revue demande de « rendre l'overlay quittable », avec sa falsifiable, OU d'expliciter que
    c'est hors périmètre et de STOPPER plutôt que de trancher seul. Mesuré avant de décider :
    - **Aucun mécanisme de « démontage d'un locataire en surimpression » n'existe** dans
      `IShellNavigator`/`IShellTenant` — `MonterLocataireEnSurimpression<T>` MONTE, rien ne
      DÉMONTE. Le seul précédent dans ce dépôt est `ExceptionDetailController.Back()` +
      `OnDestroy()` (« BuildingCardController precedent », `ExceptionDetailController.cs:51-55,
      146-149`) : un bouton labellisé, qui `Destroy(gameObject)` sur le HOST et tear-down
      explicitement `backdropGo`/`sheetGo` (parentés sous `ContentSlot`, PAS sous le host —
      mêmes ancrage que `DashboardController.BuildLayout`, `root = mountParent = ContentSlot`).
    - **Mais le design de CE lot (§5) et le commentaire du BLOQUANT 2 round 3 nomment
      explicitement « le RENDU PROPRE du Dashboard » comme le périmètre de l'item 0.5** — et un
      geste de sortie sur l'écran d'accueil (bouton ? tap sur le fond ? quel libellé ?) EST une
      pièce du rendu propre de cet écran, pas un branchement d'ouverture-de-session au sens du
      BLOQUANT 2 (qui ne portait que sur les 4 PANNEAUX orphelins).
    - **Le geste exact n'est écrit NULLE PART** dans le ruling cité (« puis on tombe sur la
      ville ») ni dans front.md §4 (hors de ce dépôt, non consultable — ⛔ pas le dépôt back) :
      bouton visible avec quel libellé, tap sur le backdrop, ou autre. Deviner ce choix serait
      *deviner un choix d'architecture/produit à la place de l'auteur* — exactement l'unknown
      « Conflit » de ce rôle, pas un « imprévu non bloquant ».
    ⇒ **Décision : STOP et remonte, ne pas implémenter ce round.** Si le contrôleur tranche que
    c'est dans le périmètre de CE lot plutôt que de l'item 0.5, le patron le moins risqué à suivre
    est celui d'`ExceptionDetailController` ci-dessus (tracker `backdropGo`/`cardGo` en champs,
    `OnDestroy()` qui les détruit, un bouton qui appelle `Destroy(gameObject)`), adapté au fait que
    Dashboard n'a pas de `onBack` (rien n'attend son retour — c'est la racine de la session).

    ⛔⛔ **RÉSOLU round 4 (décision contrôleur, 2026-08-26)** — l'escalade était juste, dit le
    contrôleur : « merci de ne pas avoir tranché seul ». **Décision : PAS de geste de fermeture
    dans ce lot.** Mêmes raisons que celles mesurées ci-dessus (aucun mécanisme de démontage
    disponible, geste non spécifié, item 0.5 propriétaire du rendu de cet écran) — confirmées, pas
    contredites. « Un aveu n'est pas une épingle » : le contrôleur a demandé DEUX falsifiables à la
    place de cette note, livrées § Run F ci-dessous et dans
    `CharpenteOuvertureSessionOverlayPlayModeTests.cs` :
    - **F-A** — `FA_LaVilleEstAtteignableEnUnGesteDeProductionDepuisLeDemarrage_
      MalgreLAbsenceDeSortieDediee` : assertion POSITIVE que la ville reste atteignable en UN
      clic de production sur `Tab_Empire`, par le mécanisme EXISTANT `UnmountCurrentTenant()`
      (détruit TOUT enfant de `ContentSlot` à chaque activation d'onglet, overlay compris — AUCUN
      mécanisme neuf écrit). Anti-vacuité : précondition que l'overlay soit RÉELLEMENT monté avant
      le clic (même détecteur, `GetComponentInChildren<DashboardController>(false)`, déjà prouvé
      capable de rougir par le contrôle négatif de BLOQUANT 2 round 3).
    - **F-B** — `FB_AucuneAffordanceDeFermetureSousLOverlay_EpingleAvecSonModeDEmploiDePeremption` :
      épingle une VALEUR PRÉSENTE (le compte de `Button` sous `DashboardSheet`, **5** mesuré —
      jamais une absence vague), avec son mode d'emploi de péremption écrit DANS le message
      d'assertion elle-même (patron `toBe(404)` du socle) : « si ce compte a changé, c'est que
      l'item 0.5 a livré la sortie — retire ce test, coche le ruling ».

    ⛔⛔ **RÉOUVERT ET FERMÉ round 7 (revue ⊥, BLOQUANT 2) — la décision ci-dessus était fondée sur
    une raison mesurée FAUSSE, réfutée par le relecteur lui-même : « je change de décision, et c'est
    la mesure qui me le fait faire ».** Le premier point mesuré ci-dessus (« aucun mécanisme de
    démontage n'existe ») ne portait que sur un mécanisme de DÉMONTAGE explicite ; il ratait que le
    RETOUR à la carte n'a jamais eu besoin d'un démontage dédié — `ExitToCityMap() =>
    ActivateTab(Tab.Empire)` (`AppShell.cs:298`) et le reset ordinaire d'`ActivateTab` suffisent,
    EXACTEMENT le mécanisme déjà câblé pour sortir d'un district (§3.3), jamais rebranché sur
    l'Accueil. Livré en DEUX lignes (`TopBar.SetLeadingAction(TopBarController.LeadingAction.
    BackToMap, ExitToCityMap)`, posées APRÈS `MonterLocataireEnSurimpression<DashboardController>()`
    sur les deux branches d'`AcquireSessionThenActivateHome`) — ZÉRO mécanisme neuf, donc les deux
    autres raisons (item 0.5 propriétaire du RENDU, geste non spécifié) ne s'appliquaient jamais à
    CE geste précis : le libellé et le mécanisme étaient déjà écrits, pour le district.
    **F-B est REMPLACÉE** par `FB_LActionDeTeteFermeLOverlayEtRevelaLaVille_BrancheSucces` et
    `..._BrancheEchec` (`CharpenteOuvertureSessionOverlayPlayModeTests.cs`) — deux falsifiables
    POSITIVES, une par branche d'acquisition, qui cliquent RÉELLEMENT l'action de tête et prouvent
    la même chose que F-A (overlay disparu, `CityMapController` monté, confinement sous
    `ContentSlot`), déclenchées par le bouton DÉDIÉ. Contrôle négatif exécuté (§ Run round 7,
    ci-dessous) : les deux lignes désarmées ⇒ les DEUX falsifiables rougissent, chacune nommant sa
    propre branche ; restaurées ⇒ `passed=22 failed=0`.
    ⇒ **L'écart au ruling est CLOS.** Le § en tête de ce document (désormais « FERMETURE DE
    L'OVERLAY ACCUEIL — LIVRÉE round 7 ») porte l'état actuel ; cette Deviation ne porte plus que
    l'historique de la décision ET de sa réouverture.

11. **ROUND 6, MINEUR 5 — `ChromeMultiResolutionPlayModeTests.cs` ([Category("HUDv31")]) est ABSENT
    du filtre du juge et PÉRIMÉ ; consigné, non corrigé (demande explicite du relecteur : ne PAS
    ajouter la catégorie au filtre).** Mesuré : `Assets/Editor/MafiaCI.cs:34` porte
    `{ "W4P4a", "W3UDA", "W3U1", "W3U2", "Charpente" }` — `"HUDv31"` n'y figure pas, donc AUCUN test
    de ce fichier ne s'exécute dans le juge qui certifie `Charpente`.

    ⛔⛔ **CORRIGÉ round 7 (revue ⊥, MINEUR 2) — cette entrée était FAUSSE ET INCOMPLÈTE.**
    (a) « le dock est ratifié à 4 bulles **depuis ce lot** » est **faux, mesuré sur `af9893b`**
    (item 0.1/0.4, le lot PRÉCÉDENT) : `BuildTabBar` y posait déjà EXACTEMENT 4 `AddTabButton`
    (`Tab.Home`/`Tab.Org`/`Tab.Pipeline`/`Tab.More`) — ce lot (0.2/0.3) renomme `Tab.Home` en
    `Tab.Empire` et son libellé « Accueil » en « Empire », **il ne change pas le compte**. **La
    péremption de `tabCount = 5` PRÉCÈDE ce lot**, elle date d'`af9893b`.
    (b) La consignation ne nommait que `tabCount` — **incomplet** : `ChromeMultiResolutionPlayModeTests.cs:158-159`
    recopie AUSSI `tabBarPadding = 8f` et `tabBarSpacing = 4f` en constantes LITTÉRALES (avec un
    commentaire qui les cite verbatim comme non lues par réflexion), alors que
    `AppShell.BuildTabBar` (`AppShell.cs:770`) pose `hlg.padding = new RectOffset(0, 0, …, …)`
    (padding **HORIZONTAL nul**, pas 8) et `hlg.spacing = Px(TabDockEcartCss)` (`AppShell.cs:772`) avec
    `TabDockEcartCss = 22f` (soit `Px(22f)`, converti à l'échelle du canon — pas `4f` brut). Et
    `hlg.childForceExpandWidth = false` (`AppShell.cs:778`) — les bulles ne se PARTAGENT plus la
    largeur disponible (`.dock{justify-content:center}`, doctrine « les bulles se GROUPENT au
    centre ») : le modèle `ComputeTabButtonWidth(localWidth, padding, spacing, buttonCount) =>
    (localWidth − 2×padding − spacing×(buttonCount−1)) / buttonCount` de ce fichier suppose une
    répartition en largeur ÉGALE de l'espace disponible — **un modèle qui ne décrit plus l'objet du
    tout**, pas seulement un paramètre daté. Quelqu'un qui corrigerait le seul `tabCount = 5 → 4`
    livrerait une garde qui mesure une barre qui n'existe pas (mauvais padding, mauvais spacing,
    mauvais modèle de distribution).
    **Option retenue (inchangée, change le moins de surface) : ne PAS ajouter `"HUDv31"` au
    filtre.** Ce fichier reste latent, pas vivant — aucun juge de ce dépôt ne certifie aujourd'hui
    sur ces valeurs. Consigné plus précisément qu'avant ; toujours non corrigé, toujours à
    rattacher au lot qui touchera prochainement ce fichier (probablement un futur passage HUDv31
    sur le dock à 4 bulles), jamais à un lot de charpente.

12. **ROUND 7, MINEUR 3 — le corps partagé des deux nouvelles falsifiables F-B (`CharpenteOuverture
    SessionOverlayPlayModeTests.VerifierFermetureParActionDeTete`) ne balaie que les `Button`,
    angle mort connu, CONSIGNÉ, non corrigé.** Précédent maison d'un handler de clic qui N'EST PAS
    un `Button`/`IPointerClickHandler` conventionnel : `LongPressButton.cs:15`. Mesuré (round 7) :
    **0** `IPointerClickHandler`/`EventTrigger` dans `Assets/Scripts` aujourd'hui — la classe n'a
    aucune instance connue dans ce dépôt. Vérifié que ÇA NE MORD PAS ici : `TopBarController.cs:568`
    pose bien un vrai `Button` sur l'action de tête (`leadingBtn = leadingGo.AddComponent<Button
    >();`), lu dans le corps, pas supposé. **Option retenue (change le moins de surface)** : ne pas
    généraliser le corps partagé à un balayage `IPointerClickHandler` plus large — hors périmètre
    de ce lot, et le seul consommateur actuel (`TopBarController`) est un `Button` ordinaire. Si un
    futur écran remplace l'action de tête par un handler NON-`Button` (un `LongPressButton`, un
    `EventTrigger` nu), `boutonTeteT.GetComponent<Button>()` rendrait `null` et les DEUX falsifiables
    F-B échoueraient à `Assert.IsNotNull(boutonTete, ...)` — un rouge NOMMÉ, pas un faux vert : la
    classe reste couverte par construction (l'assertion échoue plutôt que de sauter le test), ce
    n'est que le MESSAGE qui accuserait le mauvais symptôme (« pas de Button » plutôt que « pas
    l'action de tête »).

## Ce que je n'ai pas pu vérifier

- **Que le clic RÉEL sur « Entrer » (F0.3) soit exercé par un joueur AUTREMENT que dans ce test** —
  F0.3 prouve l'atteignabilité depuis le code de production (le même chemin que nav-F1), pas depuis
  un geste tactile physique (hors de portée du batchmode).
- **L'effet à long terme du choix Empire↔Org pour `HudF7`** (Deviation 3) sur un compte qui aurait,
  demain, une identité démo propre pour `LieutenantScreenController` — si `Org` acquiert un jour son
  propre repli à identité DIFFÉRENTE d'`operational_demo`, ce test resterait vert pour une raison
  plus riche qu'aujourd'hui (deux comptes concurrents au lieu d'un), sans qu'aucune régression n'en
  résulte — non vérifié faute d'un tel scénario existant à ce jour.
- **Item 0.5 — RÉDUIT round 3, pas fermé.** L'ATTEIGNABILITÉ des 4 panneaux orphelins
  (`BuildingCardController`/`ExceptionQueueController`/`AutonomyInboxController`/
  `ExceptionDetailController`) est désormais prouvée (BLOQUANT 2, ci-dessus) : le point d'entrée
  (`DashboardController` monté en surimpression) est branché. Ce qui RESTE hors de ce round : le
  RENDU propre de l'écran ④ lui-même (screen_1 complet — HighestLeverageCard, top-3 avec actions
  inline, OrgVitalsPanel 4-barres, ContextualBanner, ShortcutBar, KPI riches — cf. le commentaire
  M1 déjà présent dans `DashboardController.cs`).
  ⚠️ **Ces trois lignes disaient encore, jusqu'au round 8, qu'aucune sortie n'existait** : elles
  niaient l'existence d'une affordance de fermeture, réduisaient les moyens de quitter l'overlay au
  re-tap d'onglet, et déclaraient qu'aucun dispositif dédié n'existait.
  **Les trois clauses sont fausses depuis le round 7**, qui livre l'action de tête du bandeau, et
  l'en-tête du MÊME document disait déjà l'inverse. Section à **delta ZÉRO** depuis `7151309` : le
  correctif du round 7 avait fermé les instances NOMMÉES (§ tête, Deviation 10, deux renvois) sans
  repasser la POPULATION des sections inchangées. **4ᵉ chute de cette classe sur ce lot.**
  ⇒ Balayage refait, et c'est lui qui compte : **18 sections byte-identiques entre `1307c22` et
  `c3247cf`, une seule portait une clause devenue fausse** — celle-ci. *Après toute correction :
  diff par SECTION, et pour chaque section à delta zéro, demander si un nombre, une borne ou une
  clause qu'elle porte vient d'être changé AILLEURS.*

---

## Run complet du juge (5 catégories) — QUATRE mesures indépendantes, réconciliées (round 3)

⛔⛔ **CORRIGÉ (revue ⊥ round 2, MAJEUR M4)** — la version précédente de cette section réconciliait
`194 + 4 + 1 = 199` en déclarant `StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas`
« MARGINAL/FLAKY » **au passé**, sur la foi d'UNE SEULE observation (ce test était vert dans mon
run). Le run **indépendant** de la revue a rendu `passed=198 failed=3` (`194 + 4 = 198`, `3 = 3`,
**sans aucun `+1`**) — `StaleAbandonedShell` y échouait, sur sa prémisse (« A a bien une liste de
districts vivante avant l'entrée en scène de B »), avec ses 8 assertions inchangées depuis
`af9893b`. Une déduction tirée d'UNE observation n'est pas une mesure. **Un troisième run,
lancé par moi-même round 2**, tranche : voir tableau ci-dessous.

Neuf runs complets (5 catégories) à ce jour, à neuf moments distincts (A-I — round 7 corrige à
nouveau ce compte : la phrase disait encore « sept » alors que H (round 6) l'avait déjà porté à
huit, la même classe de défaut que ce round corrige ailleurs dans ce document — un nombre qui ne se
recompte pas à chaque ajout de ligne), TOUS en environnement calme (aucun autre process Unity/Docker
en vol) :

| run | quand | commande/log | `passed` | `failed` | `StaleAbandonedShell` |
|---|---|---|---|---|---|
| **A (moi, round 1)** | juste après le geste de code round 1, `MafiaCI.cs` restauré aux 5 catégories | `/tmp/charpente-0203/full-run-FINAL.log` | 199 | 2 (`NavD12`, `NavF4`) | **VERT** |
| **B (revue ⊥, round 1)** | mesure indépendante du même livrable round 1 | (log de la revue, non détenu par moi) | 198 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** |
| **C (moi, round 2)** | après TOUS les correctifs de ce round (C-α, C7, m2, m3) — ajoute 1 test neuf (`C7`) | `/tmp/charpente-0203-r2/full-run-THIRD.log` | 199 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** |
| **D (moi, round 3)** | après TOUS les correctifs round 3 (BLOQUANT 1, BLOQUANT 2, MAJEUR, m1, m2, m3) — ajoute 2 tests neufs (`F0.2-b`, `BLOQUANT2_...`) | `/tmp/charpente-r3/full-judge-run1.log` | 201 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** |
| **E (moi, round 4)** | après le correctif BLOQUANT (`ProductionClickSupport`, 7 sites) + MAJEUR (4 ancres) + mineurs — AUCUN test neuf ajouté (mécanisme de clic changé, pas de méthode `[Test]`/`[UnityTest]` nouvelle) | `/tmp/charpente-r4/full-judge-round4.log` | 202 | 2 (`NavD12`, `NavF4`) | **VERT** |
| **F (moi, round 4bis)** | après ajout de F-A/F-B (écart au ruling, décision contrôleur) — ajoute 2 tests neufs | `/tmp/charpente-r4/full-judge-round4-runF.log` | 203 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** |
| **G (moi, round 5)** | après TOUS les correctifs round 5 (BLOQUANT — destroy-check F0.2-b, MAJEUR 1 — F0.2-c neuf + `ProductionClickSupport` re-scopé, MAJEUR 2 — F-B ensemble nommé, mineurs 1-4) — ajoute 1 test neuf (`F0.2-c`) | `/tmp/charpente-r5/full-judge-round5.log` | 204 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** — les 3 rouges sont les mêmes pré-existants connus (aucun n'est de ce lot ; réconciliation arithmétique : 203 (F) + 1 (`F0.2-c`) = 204, exact) |
| **H (moi, round 6)** | après TOUS les correctifs round 6 (BLOQUANT — `F0_2c` par `EventSystem.RaycastAll`, MAJEUR — `F-B` scopé à `DashboardBackdrop ∪ DashboardSheet`, mineurs 1-5) — AUCUN test neuf ajouté (corps/docstrings corrigés, pas de nouvelle méthode `[Test]`/`[UnityTest]`) | `/tmp/charpente-r6/full-judge-round6.log` | 204 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** — les 3 mêmes rouges pré-existants (réconciliation arithmétique : 204 (G) + 0 (aucun test ajouté) = 204, exact) |
| **I (moi, round 7)** | après TOUS les correctifs round 7 (BLOQUANT 1 — assertion `HasActiveInputModule` + contrôle négatif permanent, BLOQUANT 2 — fermeture de l'overlay livrée + `F-B` remplacée par 2 falsifiables positives, MAJEUR 1, mineurs 1-3) — ajoute **2** tests neufs (`F0_2c_ControleNegatif_...` + un net de +1 sur le remplacement `F-B` → 2 tests) | `/tmp/charpente-r7/full-judge-round7.log` | 206 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** — les 3 mêmes rouges pré-existants (réconciliation arithmétique : 204 (H) + 2 (tests ajoutés round 7) = 206, exact ; 309 (H) + 2 = 311 découverts) |

Commande du run C :
```
LOG_FILE=/tmp/charpente-0203-r2/full-run-THIRD.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (`MafiaCI:` lines) — CORRIGÉ round 3, MAJEUR : cette section collait `303`, byte-
différent du log qu'elle cite (`/tmp/charpente-0203-r2/full-run-THIRD.log`, re-lu à l'oracle
`grep -a` ci-dessous) — le vrai total découvert à ce round était **304** (round 2 ajoute `C7`, un
test neuf, `303 + 1(C7) = 304`) :
```
$ grep -a "RunPlayModeTests started" /tmp/charpente-0203-r2/full-run-THIRD.log
MafiaCI: RunPlayModeTests started — 304 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
```
```
MafiaCI: RunPlayModeTests started — 304 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.CityMap.Tests.DistrictMapNavigationPlayModeTests.NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance —   scénario dimensionné — cette résolution DOIT produire une bande de letterbox (mesuré 0.0px), sinon l'assertion suivante ne teste pas le défaut visé
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.AppShellPlayModeTests.StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas —   prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.NavigationPlayModeTests.NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution —   nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà inclusives du débordement du médaillon, 26.3px mesurés) — un titre qui ne réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous
MafiaCI: RunPlayModeTests finished — passed=199 failed=3 skipped=0 inconclusive=0
```
`elapsed=244s timeout=900s issue=[sortie normale (RC=1)]`.

### Run D (round 3) — commande, sortie réelle

```
LOG_FILE=/tmp/charpente-r3/full-judge-run1.log timeout 590 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (`MafiaCI:` lines) :
```
MafiaCI: RunPlayModeTests started — 306 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.CityMap.Tests.DistrictMapNavigationPlayModeTests.NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance —   scénario dimensionné — cette résolution DOIT produire une bande de letterbox (mesuré 0.0px), sinon l'assertion suivante ne teste pas le défaut visé
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.AppShellPlayModeTests.StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas —   prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.NavigationPlayModeTests.NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution —   nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà inclusives du débordement du médaillon, 26.3px mesurés) — un titre qui ne réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous
MafiaCI: RunPlayModeTests finished — passed=201 failed=3 skipped=0 inconclusive=0
```
`elapsed=225s timeout=590s issue=[sortie normale (RC=1)]`.

**Les 3 échecs sont BYTE-IDENTIQUES à ceux du run C** (mêmes 3 tests, mêmes messages, au caractère
près pour `NavF4`/`NavD12` — `StaleAbandonedShell` échoue sur la MÊME prémisse). **0 nouvelle
défaillance introduite par BLOQUANT 1 ni BLOQUANT 2**, sur les 4 catégories hors `Charpente`
(`W4P4a`, `W3UDA`, `W3U1`, `W3U2`) qui bootent des `AppShell` réels dans 9 fichiers non touchés par
ce round — confirme empiriquement l'évaluation de risque faite AVANT d'écrire le code de BLOQUANT 2
(§ ci-dessus).

### Run E (round 4) — commande, sortie réelle

```
LOG_FILE=/tmp/charpente-r4/full-judge-round4.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (`MafiaCI:` lines) :
```
MafiaCI: RunPlayModeTests started — 306 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.CityMap.Tests.DistrictMapNavigationPlayModeTests.NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance —   scénario dimensionné — cette résolution DOIT produire une bande de letterbox (mesuré 0.0px), sinon l'assertion suivante ne teste pas le défaut visé
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.NavigationPlayModeTests.NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution —   nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà inclusives du débordement du médaillon, 26.3px mesurés) — un titre qui ne réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous
MafiaCI: RunPlayModeTests finished — passed=202 failed=2 skipped=0 inconclusive=0
```
`elapsed=226s timeout=900s issue=[sortie normale (RC=1)]`.

**`StaleAbandonedShell` n'apparaît PAS dans ce run** (`grep -c StaleAbandonedShell` sur le log
entier → `0`) — VERT round 4, cohérent avec l'intermittence déjà établie (round 3 : ROUGE ; les
deux AUTRES échecs, `NavD12`/`NavF4`, sont BYTE-IDENTIQUES aux runs C et D, mêmes messages au
caractère près). **306 découverts, identique à round 3** — le correctif BLOQUANT round 4 a changé
le MÉCANISME de clic sur 7 sites existants, il n'a ajouté AUCUNE méthode `[Test]`/`[UnityTest]`
neuve, donc le total de tests ne bouge pas.

**Compte `Charpente` inclus dans ce run** :
```
$ python3 -c "print(open('/tmp/charpente-r4/full-judge-round4.log',encoding='utf-8',errors='replace').read().count('[Charpente] SetUp'))"
17
```
Identique à round 3 (aucun test `Charpente` ajouté ni retiré ce round) — le filtre a exécuté le
même jeu qu'avant, pas un autre.

⇒ **AUCUN des 2 échecs du run E n'est dans la catégorie `Charpente`, ni dans le périmètre du
BLOQUANT/MAJEUR/mineurs de ce round.** Verdict round 4 : lot **VERT sur toute sa surface** —
0 nouvelle défaillance, sur 204 tests filtrés (inchangé), `StaleAbandonedShell` intermittent
CONFIRME sa nature (round 3 rouge, round 4 vert, aucun changement de code sur son fichier entre les
deux — le seul diff de `AppShellPlayModeTests.cs` ce round est l'ajout de `using MafiaCleanCity.
Tests;` et le remplacement de `.onClick.Invoke()`, sans rapport avec sa prémisse réseau).

### Run F (round 4, après F-A/F-B) — commande, sortie réelle

Ajout des DEUX falsifiables demandées par le contrôleur en réponse à l'escalade (§ ÉCART AU RULING
en tête de ce document, § Deviation 10 amendée) : `FA_...` (positive) et `FB_...` (épingle). Compile
d'abord échoué (`CS1513 } expected` — la méthode `BLOQUANT2_...` avait perdu son accolade fermante
dans le découpage du fichier ; corrigé, re-vérifié par compilation réussie AVANT toute mesure). F-B
a d'abord ROUGI EN CONSTRUCTION (`trouvé 0` boutons) — MESURÉ, pas supposé : `DashboardController.
BuildNav()` (qui pose les 5 boutons) n'est appelée QUE depuis `Render()`/`RenderError()`, APRÈS le
chargement réseau du wallet, jamais depuis `BuildLayout()` (synchrone) — le test comptait AVANT que
`BuildNav` n'ait tourné. Corrigé en attendant `dashboard.DashboardLoaded || dashboard.WalletError`
(même patron que `BLOQUANT2_...`) avant de compter.

```
LOG_FILE=/tmp/charpente-r4/two-new-falsifiables-fixed.log timeout 600 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (scopé `Charpente` seul, narrowing temporaire vérifié restauré ensuite) :
```
MafiaCI: RunPlayModeTests started — 308 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: RunPlayModeTests finished — passed=19 failed=0 skipped=0 inconclusive=0
```
Lignes `[Charpente]` des deux nouveaux tests (sorties MESURÉES, pas des valeurs choisies à l'avance) :
```
[Charpente] F-A — la ville (CityMapController) est atteinte en UN clic de production sur Tab_Empire, l'overlay Accueil ayant réellement disparu de ContentSlot ; PAS un cul-de-sac, malgré l'absence d'affordance de fermeture dédiée.
[Charpente] F-B — 5 boutons épinglés sous DashboardSheet, aucune affordance de fermeture dédiée — voir mode d'emploi de péremption dans l'assertion.
```
**Population de F-B, MESURÉE en amont** (`grep -n "AddComponent<Button>" Assets/Scripts/Operational/Dashboard/DashboardController.cs` → 1 seul site, à l'intérieur d'`AddNavButton`, appelée 5 fois par `BuildNav()` — `City Map`/`Building Card`/`Filière`/`Exceptions`/`Autonomy` ; `DashboardBackdrop` ne porte qu'un `Image`, `0` bouton) — la valeur ATTENDUE (5) a été dérivée du code AVANT d'écrire l'assertion, puis CONFIRMÉE par le run, pas l'inverse.

**Anti-vacuité de F-A, réutilisée plutôt que réinventée** : la précondition
`GetComponentInChildren<DashboardController>(false) != null` est le MÊME détecteur que celui du
contrôle négatif de BLOQUANT 2 round 3 (§ ci-dessus), déjà prouvé capable de ROUGIR en nommant le
Dashboard manquant quand les 2 sites de montage sont retirés — pas un nouveau détecteur non testé.

Juge complet (5 catégories), après ajout de F-A/F-B :
```
LOG_FILE=/tmp/charpente-r4/full-judge-round4-runF.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle :
```
MafiaCI: RunPlayModeTests started — 308 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.CityMap.Tests.DistrictMapNavigationPlayModeTests.NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance —   scénario dimensionné — cette résolution DOIT produire une bande de letterbox (mesuré 0.0px), sinon l'assertion suivante ne teste pas le défaut visé
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.AppShellPlayModeTests.StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas —   prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.NavigationPlayModeTests.NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution —   nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà inclusives du débordement du médaillon, 26.3px mesurés) — un titre qui ne réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous
MafiaCI: RunPlayModeTests finished — passed=203 failed=3 skipped=0 inconclusive=0
```
`elapsed=230s timeout=900s issue=[sortie normale (RC=1)]`. `StaleAbandonedShell` ROUGE ce run (3/6
mesures indépendantes maintenant, § arithmétique ci-dessous) — les 3 échecs sont les 3 CONNUS,
BYTE-IDENTIQUES aux runs précédents. **AUCUN dans `Charpente`, aucun dans le périmètre de F-A/F-B.**

Compte `Charpente` inclus :
```
$ python3 -c "print(open('/tmp/charpente-r4/full-judge-round4-runF.log',encoding='utf-8',errors='replace').read().count('[Charpente] SetUp'))"
19
```
`19 = 17 (round 4, § Run E) + F-A + F-B` — le filtre a exécuté le jeu attendu, pas un autre.

⇒ **AUCUN des 3 échecs du run F n'est dans la catégorie `Charpente`, ni dans le périmètre de F-A/F-B.**
Verdict : lot **VERT sur toute sa surface**, y compris les deux falsifiables de l'écart au ruling.

### Arithmétique honnête (pas de `+1` caché)

Baseline `af9893b` (mandat) : `passed=194 failed=3` (`NavD12`, `StaleAbandonedShell`, `NavF4`),
total **197**. Round 1 ajoute 4 tests neufs (`F0.2`, `F0.2-c`, `F0.3`, `F0.3-bis`), tous VERTS dans
les quatre runs (A, B, C, D) — total **201**. Round 2 ajoute 1 test neuf (`C7`), VERT dans C et D —
total **202**. Round 3 ajoute 2 tests neufs (`F0.2-b`, `BLOQUANT2_DashboardMonteEnSurimpression
AuDemarrage_...`), VERTS dans D — total **204**.

- Run A : `194 + 4 = 198` passés de base, **+1 parce que `StaleAbandonedShell` était vert CE run** =
  **199** ; `3 − 1 = 2` échecs. `199 + 2 = 201`. ✔
- Run B : `194 + 4 = 198` — **`StaleAbandonedShell` rouge**, aucun `+1` : **198** ; `3` échecs
  inchangés. `198 + 3 = 201`. ✔
- Run C : `194 + 4 + 1(C7) = 199` — **`StaleAbandonedShell` rouge**, aucun `+1` supplémentaire ;
  `3` échecs. `199 + 3 = 202`. ✔
- Run D : `194 + 4 + 1(C7) + 2(F0.2-b, BLOQUANT2) = 201` — **`StaleAbandonedShell` rouge**, aucun
  `+1` supplémentaire ; `3` échecs inchangés. `201 + 3 = 204`. ✔
- Run E (round 4) : `194 + 4 + 1(C7) + 2(F0.2-b, BLOQUANT2) = 201` — **`StaleAbandonedShell` VERT
  ce run**, `+1` : **202** ; `3 − 1 = 2` échecs (`StaleAbandonedShell` en sort). `202 + 2 = 204`. ✔
- Run F (round 4bis) : `194 + 4 + 1(C7) + 2(F0.2-b, BLOQUANT2) + 2(F-A, F-B) = 203` —
  **`StaleAbandonedShell` rouge**, aucun `+1` : **203** ; `3` échecs. `203 + 3 = 206`. ✔

**Aucun résidu inexpliqué sur les six runs** — et `StaleAbandonedShell` est maintenant **VERT sur
2/6 mesures indépendantes, ROUGE sur 4/6** (A, E verts ; B, C, D, F rouges). La qualification honnête
reste : **intermittent, prédominance ROUGE (4/6)** — ⚠️ **pré-existant sur `af9893b`, aucun round ne
l'impute au lot** (voir § dédiée juste en dessous, inchangée depuis round 2).

### `StaleAbandonedShell` — pré-existant sur `af9893b`, pas introduit par ce lot

Le mandat cite `af9893b` lui-même à `passed=194 failed=3` avec `StaleAbandonedShell` DÉJÀ parmi les
3 rouges connus, **avant qu'aucune ligne de ce lot n'existe** — ce test échoue donc sur le commit
QUE ce lot part de modifier, pas sur un état que ce lot aurait dégradé. Son corps (voir extrait
ci-dessous) est touché par ce lot uniquement par le renommage compile-forcé `Tab.City`→`Tab.Empire`
(`shell.ActivateTab(AppShell.Tab.Empire)`, mécanique, comportement identique — Empire EST l'ancienne
branche City) ; sa prémisse rouge (« A a bien une liste de districts vivante ») porte sur le TIMING
réseau de `CityMapController.Populate()`, sans rapport avec le dock ou l'enum `Tab`.
⚠️ **Hypothèse non tranchée, consignée honnêtement** : Empire étant désormais l'onglet PAR DÉFAUT
(alors que Home/Dashboard ne faisait aucun appel réseau de carte avant ce lot), CHAQUE test qui boot
un shell dans le run complet déclenche maintenant un appel réseau `CityMapController`, ce qui AUGMENTE
la charge réseau totale d'un run à 200+ tests — un facteur PLAUSIBLE d'aggravation de la fenêtre de
timing dont dépend ce test, mais NON MESURÉ ici (mesurer ceci demanderait un run narrowed avant/après
ce lot avec charge réseau contrôlée, hors du périmètre de ce round). Ce que les trois runs ÉTABLISSENT :
le test échoue sur `af9893b` non modifié, ET après ce lot — il n'est donc pas une régression NOUVELLE
au sens strict, mais sa fréquence d'échec pourrait avoir changé. Non vérifié, dit honnêtement plutôt
que masqué par une étiquette de clôture.

### Attribution des rouges — AUCUN dans le périmètre de ce lot (C-a/C-b/F0.2/F0.3/F0.3-bis/C7)

- `DistrictMapNavigationPlayModeTests.cs` (porte `NavD12`) — **fichier non touché par ce lot**
  (`git status --short` sur ce fichier : vide, re-vérifié run C). Scan de la surface neuve
  (`grep -cE "DockRatifie|Tab\.Empire|F0_2|F0_3|ConstruireLocataire"`) → **0**.
- `NavigationPlayModeTests.cs` (porte `NavF4`) — fichier TOUCHÉ (renommage `Tab.City`→`Tab.Empire`
  dans `MountShellAtCityTab`, partagé par `NavF4`), mais le MESSAGE D'ÉCHEC est **byte-identique**
  sur LES TROIS runs (A, B — rapporté par la revue avec le même texte —, C) : même mesure `26.3px`,
  même texte, confirmé dans le run C ci-dessus. **Confirmé pré-existant et sans rapport avec ce
  lot** — cité dans le mandat comme l'un des 3 rouges connus sur `af9893b`.
- `AppShellPlayModeTests.cs` (porte `StaleAbandonedShell`) — voir discussion dédiée ci-dessus :
  pré-existant sur `af9893b`, intermittent, message byte-identique entre le run B (revue) et le run
  C (moi).

**Le compte des tests `Charpente`** (15 dans le run C — 14 précédents + `C7` — voir § C7 pour le
détail) est vérifié **inclus** dans ce run :
```
$ python3 -c "print(open('/tmp/charpente-0203-r2/full-run-THIRD.log',encoding='utf-8',errors='replace').read().count('[Charpente] SetUp'))"
15
```
identique au compte du run narrowed dédié (§ Round 2 plus haut, `passed=15 failed=0` désarmé) — le
filtre par préfixe (CLAUDE.md, piège connu) a bien exécuté le jeu attendu, pas un autre.

⇒ **AUCUN des 3 échecs des trois runs n'est dans la catégorie `Charpente`, ni dans le périmètre
C-a/C-b/F0.2/F0.3/F0.3-bis/C7.** Verdict : lot **VERT sur toute sa surface** — la conclusion
« 0 régression » de la version précédente reste juste, mais elle repose maintenant sur trois mesures
concordantes sur l'ATTRIBUTION (aucun des 3 fichiers en échec n'appartient à la surface de ce lot),
pas sur une arithmétique qui masquait un `StaleAbandonedShell` intermittent derrière un `+1`.

### Run D (round 3) — même vérification de compte, `Charpente` élargi à 17

```
$ python3 -c "print(open('/tmp/charpente-r3/full-judge-run1.log',encoding='utf-8',errors='replace').read().count('[Charpente] SetUp'))"
17
```
`17 = 15 (round 2) + F0.2-b (CharpenteMontageLocatairesPlayModeTests.cs) + BLOQUANT2_... (nouveau
fichier CharpenteOuvertureSessionOverlayPlayModeTests.cs, dont le `[UnitySetUp]` log lui aussi
`"[Charpente] SetUp (ouverture de session) — ..."`, capturé par le MÊME motif substring)` — identique
au compte du run narrowed round 3 dédié (`passed=17 failed=0` désarmé, § BLOQUANT 1/BLOQUANT 2
ci-dessus). Le filtre par préfixe a bien exécuté le jeu attendu round 3 aussi, pas un autre.

⇒ **AUCUN des 3 échecs du run D n'est dans la catégorie `Charpente`, ni dans le périmètre
BLOQUANT 1/BLOQUANT 2/MAJEUR/m1/m2/m3.** Verdict round 3 : lot **VERT sur toute sa surface** —
0 nouvelle défaillance, sur 204 tests filtrés (306 découverts, 102 hors filtre — § MINEUR m3).

## État final du dépôt (round 3, re-vérifié après tous les correctifs et contrôles négatifs)

- `Assets/Scripts/Shell/AppShell.cs` : modifié (BLOQUANT 2 — les 2 sites de montage en surimpression
  + les 2 blocs de commentaire d'amendement), contenu final vérifié **oracle Python**, pas `diff` nu
  (piège déjà mesuré round 2 : `diff` nu peut rendre un FAUX « files are identical ») :
  ```
  $ python3 -c "a=open('Assets/Scripts/Shell/AppShell.cs',encoding='utf-8').read(); b=open('/tmp/charpente-r3/AppShell.cs.original-backup',encoding='utf-8').read(); print('IDENTICAL' if a==b else 'DIFFERENT'); print(len(a), len(b))"
  IDENTICAL
  75017 75017
  $ grep -c "PlusFaux" Assets/Scripts/Shell/AppShell.cs
  0
  $ grep -c "CONTRÔLE NÉGATIF" Assets/Scripts/Shell/AppShell.cs
  0
  ```
  Aucun résidu des DEUX contrôles négatifs de round 2 (labels échangés ; `case Tab.Org` retirée) NI
  des DEUX contrôles négatifs de round 3 (destination détournée sur `Tab.Empire` ; les 2 lignes
  `MonterLocataireEnSurimpression<DashboardController>()` retirées) — `AppShell.cs.original-backup`
  (round 3, `/tmp/charpente-r3/`) a servi de référence aux DEUX contrôles négatifs de ce round, sans
  être ré-écrit entre les deux (vérifié IDENTICAL après chacun, § BLOQUANT 1/BLOQUANT 2 ci-dessus).
- `Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs` : modifié (`F0.2-b` ajouté après
  `C7`) — pas de contrôle négatif propre au fichier lui-même (le contrôle négatif de `F0.2-b` porte
  sur `AppShell.cs`, ci-dessus).
- `Assets/Tests/PlayMode/CharpenteOuvertureSessionOverlayPlayModeTests.cs` (+ son `.meta`) : NEUF ce
  round, `[Category("Charpente")]`, contient `BLOQUANT2_DashboardMonteEnSurimpressionAuDemarrage_
  SaChaineDeNavEstAtteignableJusquADetail`.
- `Tools/charpente-item0-2-3-implementation-notes.md` : ce document, modifié (§ ROUND 3 + toutes les
  corrections MAJEUR/m1/m2/m3).
- `Assets/Editor/MafiaCI.cs` : **INCHANGÉ** par rapport au commit `af9893b` — `git diff af9893b --
  Assets/Editor/MafiaCI.cs | cat` rend une sortie VIDE (re-vérifié round 3, après LE TROISIÈME
  cycle narrowing/restauration — round 1, round 2, round 3 — sur ce même fichier) :
  ```
  $ git diff af9893b -- Assets/Editor/MafiaCI.cs | cat
  (rien)
  ```
  Le narrowing temporaire à `{ "Charpente" }` (2 runs round 3) puis la restauration aux 5 catégories
  n'ont laissé aucune trace, vérifié aussi par oracle Python (backup
  `/tmp/charpente-r3/MafiaCI.cs.original-backup` == fichier final, IDENTICAL).
- `Assets/Fonts/DejaVuSans SDF.asset`, `Assets/Fonts/DejaVuSerif SDF.asset`,
  `Assets/TextMesh Pro/.../LiberationSans SDF.asset` — modifiés par les runs Unity (régénération
  d'atlas SDF, effet de bord connu de ce dépôt, INCHANGÉ round 3) — signalés, PAS commités, PAS
  restaurés par moi (le contrôleur fait le `git checkout` avant le commit).
- `Assets/InitTestScene*.unity` (gitignorés) — recompté round 3 après 9 runs Unity de ce round (2
  Charpente-only + 2 négatifs + 1 vert final + 1 compile-check + 1 judge complet) :
  `git status --short --ignored | grep -i InitTestScene | grep -v '\.meta$' | wc -l` → **13**
  (round 2 : 7 — le compte AUGMENTE avec le nombre de runs Unity de la session, confirmant qu'il
  s'agit d'un artefact du RUNNER batchmode, jamais du code de ce lot — non investigué plus avant,
  hors périmètre, signalé au contrôleur comme round 1/round 2).
- `git status --short` (tracked) liste EXACTEMENT : `Assets/Scripts/Shell/AppShell.cs`,
  `Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs`,
  `Tools/charpente-item0-2-3-implementation-notes.md`, les 3 assets de police, plus les fichiers
  `?? ` non liés à ce lot (`Tools/juge-donnees/*`, `Tools/juge-visuel/*`, présents dès avant ce
  round) et les 2 entrées NEUVES `Assets/Tests/PlayMode/CharpenteOuvertureSessionOverlayPlayModeTests
  .cs(.meta)` — aucun fichier inattendu. ⚠️ Rien commité (consigne explicite du mandat : « Tu ne
  commites rien »).


## État final du dépôt (round 4, re-vérifié après le correctif BLOQUANT et les négatifs)

- `Assets/Scripts/Shell/AppShell.cs` : **NON modifié** par ce round dans l'état final (les DEUX
  contrôles négatifs — (a) `interactable=false`, (b) `SetActive(false)`, `Tab.Org` les deux fois —
  ont chacun été restaurés IMMÉDIATEMENT après leur run, vérifiés octet à octet en Python) :
  ```
  $ python3 -c "
  with open('/tmp/charpente-r4/AppShell.cs.original-backup','rb') as f: a = f.read()
  with open('Assets/Scripts/Shell/AppShell.cs','rb') as f: b = f.read()
  print('IDENTICAL' if a == b else 'DIFFERENT')
  "
  IDENTICAL
  ```
  Confirmé aussi par `git diff` (vide) — cohérent avec `git status --short` ci-dessous qui ne liste
  PAS `AppShell.cs`.
- `Assets/Editor/MafiaCI.cs` : **INCHANGÉ** par rapport au commit `af9893b`, comme aux rounds
  précédents — narrowing à `{ "Charpente" }` (2 runs round 4) puis restauration aux 5 catégories,
  `git diff af9893b -- Assets/Editor/MafiaCI.cs | cat` rend une sortie VIDE.
- `Assets/Tests/PlayMode/ProductionClickSupport.cs` — **NEUF ce round** (`?? ` dans `git status`),
  `MafiaCleanCity.Tests`, aucune méthode `[Test]`/`[UnityTest]` (c'est un HELPER, pas une suite —
  d'où le total de tests inchangé, 306 découverts, § Run E).
- `Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs`,
  `CharpenteOuvertureSessionOverlayPlayModeTests.cs`, `AppShellPlayModeTests.cs`,
  `NavigationPlayModeTests.cs` — modifiés (les 7 sites `.onClick.Invoke()` → `ProductionClickSupport
  .Click(...)`, § BLOQUANT ; `includeInactive` `true`→`false` dans le 2ᵉ fichier, § MINEUR ;
  commentaires mis à jour dans le 3ᵉ, § MINEUR indicateur d'actif).
- `Tools/charpente-item0-2-3-implementation-notes.md` : ce document, modifié (§ ROUND 4 + les 3
  corrections MAJEUR d'ancres + attestation re-émise + Deviations 9/10 + Run E).
- `git status --short` (tracked, hors assets de police déjà connus et `charpente-item0-2-3-design.md`
  — corrigé PAR LE CONTRÔLEUR avant ce round, pas par moi) liste EXACTEMENT les 4 fichiers `.cs`
  ci-dessus + ce document ; `git status --short --ignored` (untracked non-meta) ajoute
  `ProductionClickSupport.cs` — aucun fichier inattendu, `Tools/juge-donnees/*`/`Tools/juge-visuel/*`
  déjà présents avant ce round (non liés à ce lot). ⚠️ Rien commité.


## État final du dépôt (round 4bis, après F-A/F-B — re-vérifié)

- `Assets/Scripts/Shell/AppShell.cs` : toujours **NON modifié** (aucun contrôle négatif nouveau ce
  sous-round — F-A/F-B ne touchent que des fichiers de test).
- `Assets/Editor/MafiaCI.cs` : toujours **INCHANGÉ** par rapport à `af9893b` — narrowing/restauration
  répété une 3ᵉ et 4ᵉ fois ce round (baseline F-A/F-B, puis judge complet run F), `git diff af9893b --
  Assets/Editor/MafiaCI.cs | cat` rend une sortie VIDE (re-vérifié ci-dessus, avant le run F).
- `Assets/Tests/PlayMode/CharpenteOuvertureSessionOverlayPlayModeTests.cs` : modifié une seconde fois
  ce round — ajout de `FA_...`/`FB_...` et du bloc de tête § ÉCART AU RULING.
- `Tools/charpente-item0-2-3-implementation-notes.md` : ce document, modifié une seconde fois ce
  round (§ ÉCART AU RULING en tête, Deviation 10 amendée avec la décision du contrôleur, § Run F).
- `git status --short` (tracked) : inchangé dans sa LISTE de fichiers par rapport à l'État final
  précédent (§ round 4) — seul le CONTENU de `CharpenteOuvertureSessionOverlayPlayModeTests.cs` et de
  ce document a grossi. `git status --short --ignored` (untracked non-meta) : inchangé,
  `ProductionClickSupport.cs` toujours la seule entrée neuve liée à ce lot. ⚠️ Rien commité.


## État final du dépôt (round 7, re-vérifié après les 2 BLOQUANT/2 MAJEUR/3 MINEUR et les 2 contrôles négatifs)

- `Assets/Editor/MafiaCI.cs` : **INCHANGÉ** par rapport à `HEAD` (`1307c22`) — narrowing à
  `{ "Charpente" }` (tous les runs scopés round 7) puis restauration aux 5 catégories AVANT le juge
  complet, `git diff HEAD -- Assets/Editor/MafiaCI.cs | cat` rend une sortie VIDE :
  ```
  $ git diff HEAD -- Assets/Editor/MafiaCI.cs | cat
  (rien)
  ```
- `Assets/Scripts/Shell/AppShell.cs` : **+12 lignes, 0 suppression** par rapport à `HEAD` — les DEUX
  sites `TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, ExitToCityMap)` (branche
  repli-échec + branche succès d'`AcquireSessionThenActivateHome`), chacun avec son commentaire.
  **Aucune autre ligne touchée** (`git diff --stat HEAD -- Assets/Scripts/Shell/AppShell.cs` → `12
  insertions(+)`, `0 deletions(-)`) — les DEUX négatifs BLOQUANT 1 (`EnsureEventSystem`) et BLOQUANT 2
  (les 2 `SetLeadingAction`) ont chacun été désarmés puis restaurés IMMÉDIATEMENT après leur run,
  vérifiés par `git diff` vide après restauration ET par comparaison Python (`identical: True`) pour
  `EnsureEventSystem`.
- `Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs` : modifié — comment de méthode
  `F0_2c` corrigé (BLOQUANT 1), assertion `HasActiveInputModule` ajoutée, helper + contrôle négatif
  permanent `[Test]` ajoutés (fin de fichier), `using UnityEngine.EventSystems;` renvoi corrigé
  (MINEUR 1).
- `Assets/Tests/PlayMode/CharpenteOuvertureSessionOverlayPlayModeTests.cs` : modifié — bloc de tête
  réécrit (MAJEUR 1), F-A recadrée (commentaire seul, assertions inchangées), F-B REMPLACÉE par
  `FB_..._BrancheSucces` + `FB_..._BrancheEchec` + corps partagé `VerifierFermetureParActionDeTete`,
  `using System.Linq;` retiré (devenu inutile).
- `Assets/Tests/PlayMode/ProductionClickSupport.cs` : modifié — 2 renvois à `F0_2c` corrigés
  (MINEUR 1, lignes du commentaire de classe et du docstring XML de `Click`).
- `Tools/charpente-item0-2-3-implementation-notes.md` : ce document, modifié — § en tête réécrit
  (MAJEUR 1, ex-« ÉCART AU RULING » devenu « FERMETURE DE L'OVERLAY ACCUEIL — LIVRÉE round 7 »),
  Deviation 10 réouverte-et-fermée, Deviation 11 corrigée (MINEUR 2), § ROUND 7 ajouté, cette section.
- `Assets/Fonts/DejaVuSans SDF.asset`, `Assets/Fonts/DejaVuSerif SDF.asset`,
  `Assets/TextMesh Pro/.../LiberationSans SDF.asset` — modifiés par les runs Unity (régénération
  d'atlas SDF, effet de bord CONNU de ce dépôt depuis round 3, INCHANGÉ round 7) — signalés, PAS
  commités, PAS restaurés par moi (le contrôleur fait le `git checkout` avant le commit, même
  consigne que round 3).
- `Assets/InitTestScene*.unity` (gitignorées) : `git status --short --ignored | grep -i
  InitTestScene | grep -v '\.meta$' | wc -l` → **12** — artefact du RUNNER batchmode (5 runs Unity ce
  round : 1 compile-check, 3 scopés Charpente dont 2 négatifs, 1 juge complet), pas du code de ce
  lot, non investigué plus avant (même statut que round 3/4).
- `git status --short` (tracked) liste EXACTEMENT les 5 fichiers `.cs`/`.md` ci-dessus + les 3
  assets de police + les entrées `??` non liées à ce lot (`Tools/juge-donnees/*`,
  `Tools/juge-visuel/*`, déjà présentes avant ce round) — aucun fichier inattendu, aucune entrée
  `Assets/Editor/MafiaCI.cs`. ⚠️ Rien commité (consigne explicite du mandat).

**Mesure finale, catégorie `Charpente` seule** : `passed=22 failed=0`
(`/tmp/charpente-r7/run2-after-restore-verif.log`, `311 test(s) découverts`).

**Juge complet (5 catégories)** : `/tmp/charpente-r7/full-judge-round7.log`, `311 test(s)
découverts`, `passed=206 failed=3` — **les 3 MÊMES rouges pré-existants** (`NavD12_...`,
`StaleAbandonedShell_...`, `NavF4_...`), nommés à l'identique de round 6 (`204/3` sur `309`
découverts, `20` Charpente). Réconciliation arithmétique : `204 + 2 (Charpente round 7) = 206` ;
`3 + 0 = 3` ; `309 + 2 = 311` ; `20 + 2 = 22`. Sortie réelle (oracle Python) :
```
MafiaCI: RunPlayModeTests started — 311 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.CityMap.Tests.DistrictMapNavigationPlayModeTests.NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance —   scénario dimensionné — cette résolution DOIT produire une bande de letterbox (mesuré 0.0px), sinon l'assertion suivante ne teste pas le défaut visé
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.AppShellPlayModeTests.StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas —   prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.NavigationPlayModeTests.NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution —   nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà inclusives du débordement du médaillon, 26.3px mesurés) — un titre qui ne réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous
MafiaCI: RunPlayModeTests finished — passed=206 failed=3 skipped=0 inconclusive=0
```
Ces 3 rouges portent sur `DistrictMapNavigationPlayModeTests`/`AppShellPlayModeTests`/
`NavigationPlayModeTests` (catégories `W3U2`/`W3U1`) — AUCUN rapport avec les fichiers touchés ce
round (`AppShell.cs` seulement pour son changement de COMPORTEMENT, `CharpenteMontage...` et
`CharpenteOuvertureSessionOverlay...` pour leurs tests). `StaleAbandonedShell` reste l'intermittent
déjà nommé round 3-6.
