# Item 0.5 — **v4 ✅ APPROUVÉE** (revue ⊥, 2026-08-27 : 0 finding de classe PRODUCTION) — C2 → C4a → C3

> **v4.** v1 NOT_APPROVED (3B/5M/4m) · v2 NOT_APPROVED (4B/6M/6m) · v3 NOT_APPROVED (4B/5M/8m).
> Rapports : `/tmp/revue-item05-design.md`, `-v2.md`, `-v3.md`.
> **Les fondations ont été recomptées TROIS fois par trois relecteurs indépendants — mêmes chiffres.**
> Les onze bloquants vivaient tous dans ce que le design **déduisait par-dessus**.
>
> ★★★ **Le motif, mesuré sur cinq revues : dans 5 cas sur 5, le correctif juste était DÉJÀ dans un
> fichier que le design citait.** Au v3, le mot qui réfutait la falsifiable (« SEEDÉE ») était dans le
> **message de l'assertion voisine de l'ancre copiée**. *Ouvrir un fichier ne le classe que sur la
> question qu'on lui a posée.*

## 0. Périmètre — corrigé DEUX FOIS, et les deux corrections comptent

| chunk | v3 disait | **v4, mesuré** |
|---|---|---|
| **C2** — les 4 panneaux | ⛔ « cycle d'assemblies » | ✅ **FAUX — livrable.** Les 4 panneaux **et** `AppShell` sont dans `Assets/Scripts/Shell/` = **même assembly** (`Shell.asmdef`). Seul `DashboardController` est dans `Operational/`. **Il n'y a pas de cycle.** La v3 consignait une **dette fausse**. |
| **C4** — DailyReview | « APRÈS C3, sinon un orphelin de plus » | ⚠️ **Prémisse fausse** — DailyReview a **0 mention** aujourd'hui, la population reste 16/6 quoi qu'il arrive. Et l'inverse est vrai : `MountTenant<T>` est `where T : IShellTenant` (`AppShell.cs:487`) ⇒ **C3 ne peut pas câbler l'entrée avant que C4 ait converti**. ⇒ **C4a AVANT C3.** |
| **C1** — Filière | hors périmètre | ✅ **confirmé fondé** : `back.md:769` `[ ] S8-a — ⛔⛔ nodeId N'A AUCUNE ROUTE AMONT` + `front.md:222` décision C « à ratifier », sans marqueur `TRANCHÉ`, recommandation = jalon 4. |

**Ordre : C2 → C4a → C3.** ⇒ **5 orphelins fermés sur 6.**

## 1. L'état mesuré *(trois recomptes concordants)*

```
16 *Controller.cs · 6 orphelins · 6 + 10 = 16 ✔
Tab.More → RIEN (AppShell.cs:197-201) — le dock RATIFIÉ porte un onglet MORT
OnEmptyMoreDestination : 9 sites (2 production, 7 tests)
screen_12 : 9 destinations, 1 seule (DAILY_REVIEW) a un contrôleur
```
⚠️ **Piège d'oracle, payé par un relecteur** : un scanner C# à base de regex a rendu **15 orphelins
sur 16** — un résultat **uniforme, donc suspect** : il avalait un fichier entier dès qu'un littéral de
caractère contenait un guillemet. *Avant de conclure d'un balayage uniforme, poser un contrôle positif
qui DOIT sortir non uniforme.* Le scanner correct lit caractère par caractère.

## 2. C2 — les 4 panneaux dans l'Accueil *(le plus gros : 4 orphelins sur 6)*

Les 4 sont des `MonoBehaviour` nus : **des panneaux DANS un écran, pas des locataires**. Ils ne
passent donc pas par `MountTenant<T>` — et ils n'en ont pas besoin : **`AppShell` est dans le même
assembly et peut les instancier directement**.

⛔ **Premier travail, avant toute ligne** — pour **chacun** des 4 : *(a)* quelle route sert sa donnée,
*(b)* **où mène chacune de ses affordances**, *(c)* **que rend-il quand la donnée manque ?**
⇒ *(b)* est la moitié que la v1 avait ratée : `HomeChromeController:83/:149/:161` livre **deux boutons
morts**, invisibles à la seule question « quelle route sert sa donnée ».
⇒ *(c)* est ce que la v3 a payé : `HighestLeverageCardController.cs:29` défaut `CardState.NoCard` ·
`HomeChromeController.cs:19` défaut `LoadingState` · `OrgVitalsPanelController.cs:56/:139-142` écrit
`"Cohesion: Unavailable"` **au build**. **Un panneau sans donnée rend un état vide NOMMÉ** — et une
garde qui asserte « il a rendu quelque chose » est donc satisfaite par le vide.

**Falsifiable C2**, différenciée par panneau — *il n'existe pas de garde uniforme, et c'est la
découverte du v3* :
- l'Accueil monte les 4, **nommés** (égalité d'ENSEMBLES, jamais un compte) ;
- pour chaque panneau, **le test DÉCLARE lequel des deux mondes il asserte** : soit un contenu réel
  porteur d'un identifiant issu de la réponse back, soit **l'état vide NOMMÉ, avec la raison mesurée**.
  ⛔ Un panneau dont le test n'énonce pas laquelle des deux **ne se branche pas** ce round.
- ⚠️ `OrgVitalsPanel` : `Cohesion` est déclarée indisponible (**D5**) ⇒ y asserter « N>0 » serait
  **faux**. C'est le modèle du trou DÉCLARÉ, à imiter, pas à corriger.

## 3. C4a — `DailyReviewScreenController` devient un locataire *(AVANT C3)*

Conversion vers `IShellTenant`. **Quatre symptômes mesurés, aucun geste encore écrit** :
1. cycle de vie `Awake` vs `Start` — ★ **l'option conservatrice est dans les 199 lignes** :
   `EnsureInitialized` est appelée par les 5 entrées publiques ⇒ **supprimer `Awake` suffit**, et le
   test `C8F3` survit. Vérifier avant d'agir.
2. hôte sans `RectTransform` (`AppShell.cs:455` parente sous un `Transform` nu) — **ouvert depuis la
   v1, toujours non mesuré**.
3. absence de tout `SignIn`.
4. ⛔ **`LoadReview` a ZÉRO appelant de production** (5 en test). Converti et monté, l'écran **ne
   chargerait jamais**. ⇒ **C'est un maillon, pas un détail** : le poser fait partie de C4a.

## 4. C3 — `screen_12`, le menu Plus. **Trois gestes ORDONNÉS**

### C3.1 — libérer le test qui SE SERT de l'onglet mort
`CharpenteMontageLocatairesPlayModeTests.cs:273-281` bascule sur `Tab.More` **parce qu'il ne monte
rien**. Et `:366` (`CollectionAssert.AreEquivalent`, ensemble EXACT de 6 types) est dans **le même
`[UnityTest]`** ⇒ monter quoi que ce soit donne **7 pour 6**, rouge.
⛔ Le geste prescrit par la v2 **n'existe pas** : `AppShell.cs:508 private void UnmountCurrentTenant()`
est **privé**. **Choisir et livrer le mécanisme d'abord.**

### C3.2 — la population, **balayée sur la PROPRIÉTÉ et non sur l'instrument**
⚠️ La v3 listait **7 ancres** ; le relecteur en a mesuré **≥14 de plus** (2 en production, 5 blocs
exécutables, 7 blocs de prose), et deux de ses ancres étaient fausses : **`:851` n'est pas atteint
pour More** (gardé par `:840`) — c'est une ancre de C1 —, et le geste naturel (retirer la branche
`if (membre == Tab.More)`) fait rougir `:651` et `:850` (`typeParTab.ContainsKey`) **tant que les
tables `:628-636` et `:761-766` ne gagnent pas More**, qu'aucune version n'a nommées.
⇒ **Deux énoncés de PRODUCTION deviennent faux** : `AppShell.cs:87-89` et `:198`.
⇒ **Écrire la CLASSE — « tout site qui affirme que More ne monte rien » — la mesurer sur TOUTE la
population, coller le compte.** C'est nommément la faute qui a rouvert 18 rounds au lot précédent.

### C3.3 — monter le menu, **conforme au canon**
⛔ **La falsifiable « 9 entrées, 1 active, 8 désactivées » CONTREDIT le canon qu'elle cite** —
signalé au v1, non fermé au v3 : `screen_12:142` « Compression Week … Sinon **ligne ABSENTE** — pas de
ligne "inactive" » · `:143`/`:178` « Backoffice … **absent** pour joueurs non-staff ».
⇒ **La bonne falsifiable asserte l'ensemble des entrées VISIBLES pour un joueur non-staff**, avec
l'état de chacune, et **asserte l'ABSENCE** de Backoffice et de Compression Week inactive. Une égalité
sur 9 forcerait un Backoffice chez tous les joueurs — **conflit avec le canon ⇒ STOP**, socle règle 5.
⚠️ **`front.md:562` — l'item 0.6 (résolveur i18n) est `[ ]`** et nomme l'écran ⑯ comme premier touché.
C3 livre 9 libellés : **mesurer d'abord** s'ils s'affichent ou restent des clés brutes.

## 5. Les falsifiables — ce que quatre versions ont appris

```
v1 « l'écran est ATTEINT »          → atteint et blanc
v2 « il a RENDU quelque chose »     → l'état vide NOMMÉ satisfait
v3 « la donnée du BACK »            → satisfaite par une donnée SEMÉE en SQL
v4 « une donnée produite par un GESTE JOUEUR ou un TICK DU MONDE, et ce que l'écran MONTRE »
```

⛔ **Et pour `DailyReview`, cette garde est INÉCRIVABLE — mesuré, pas supposé :**
```
flagged_items ← 1 seul INSERT (flag-discipline.repository.ts:259) ← flagItem ← 2 appelants :
   routine-item-generation.service.ts:126  (production, derrière FLAG_DISCIPLINE_TICK NIGHTLY/24)
   core-loops-test.controller.ts:675       (seam _test)
CITYSIM_CONTINUOUS_LOOPS : présent dans 1 compose sur 7 (staging seul)
Routes joueur : validate / dismiss / batch-confirm — elles RÉSOLVENT, aucune ne CRÉE.
```
⇒ **Aucun geste joueur ne crée de flag, hors staging.** Et **le dépôt le sait déjà** :
`DailyReviewScreenControllerPlayModeTests.cs:82-84` — `// a fresh player: no flags seeded` ⇒
`Assert.IsTrue(RenderedEmptyState)`, commité, **vert**, dans le juge.
★ La v3 déclarait ce point « non mesuré » : **BLOCKING documenté au lieu d'être mesuré**, à un grep
près, dans le fichier de tests de la classe qu'elle convertissait.

⇒ **Ce que C4a+C3 livrent honnêtement** : DailyReview est **joignable**, et il rend son **état vide**,
parce que la chaîne de production est morte en amont. La garde asserte **exactement ça** — et elle
porte un **détecteur qui rougira le jour où la chaîne s'ouvrira** (épingler la VALEUR d'une clé
présente, jamais l'absence d'une clé : le `toBe(404)` dans le bon sens). **C'est la forme A du socle,
rendue VISIBLE au lieu de rester invisible.** ⇒ Ouvrir l'item back correspondant.

⚠️ **Et un défaut de rendu indépendant, mesuré** : `DailyReviewScreenController.AddRow` (`:117-144`)
ne produit **aucun `TextMeshProUGUI` ni `.text`** ⇒ même avec de la donnée, le joueur verrait **deux
rectangles colorés par ligne, sans un mot**. À consigner, hors périmètre de la conversion.

⚠️ **Raycast** : `Rect.Contains` est **demi-ouvert** ⇒ tirer sur les 4 coins exacts en rate **3 sur 4**,
et le patron `:999` est **centre seul**. ⇒ tirer sur des points **en retrait** des coins, et asserter
`resultats[0].gameObject == cible` avec la précondition `HasActiveInputModule`.

## 6. Ce qui reste DÉDUIT — et l'option conservatrice de chacun

| # | déduit | option conservatrice si ça tourne mal |
|---|---|---|
| 1 | ce que chaque panneau consomme (C2) | le panneau ne se branche pas, il part en dette avec sa mesure |
| 2 | l'hôte sans `RectTransform` (C4a) | **ouvert depuis la v1** — le mesurer est le premier geste |
| 3 | le mécanisme de C3.1 | changer la prémisse du test plutôt qu'exposer une API |
| 4 | les 9 libellés vs l'item 0.6 | livrer les clés brutes **en le déclarant**, jamais en les masquant |

## 7. `somme = total`, honnêtement

**C2(4) + C4a(0, la conversion ne donne aucune mention) + C3(1, c'est LUI qui ferme DailyReview) = 5**
orphelins sur 6. **C1(1) reste ouvert** avec sa raison mesurée. ⚠️ *Aucun chunk ne ferme DailyReview
seul : c'est la **paire** C4a+C3.*

## 8. Les pièges de cette machine, mesurés le 2026-08-27

- **`MafiaCI.Categories = { W4P4a, W3UDA, W3U1, W3U2, Charpente }`** (`MafiaCI.cs:34`) — un test hors
  liste **ne tourne pas** et le run rend un compte plausible + RC normal. **Compte les `SetUp`.**
- **`LOG_FILE=/tmp/…` obligatoire** (`run-unity-check.sh:46-50`), sinon le log part dans un `mktemp`
  **supprimé**.
- **`-screen-width` IGNORÉ en batchmode** (`Screen.width` reste 640, mesuré sur deux runs).
- **`rg` proxifié vers `grep` nu** : `|` matche littéralement, zéro en silence. **La vue directe est
  LOSSY** (1 vs 2 occurrences mesurées). ★ Et le motif se choisit **serré** : `NodeId =` a compté 3
  écrivains pour 2, en matchant `headNodeId =`.
- **Tout balayage `/proc` par cmdline tue le shell parent** ⇒ `/proc/PID/exe`.
- **Un seul pilote Unity.** Après tout run : restaurer les 3 atlas SDF, vérifier par `git status`.

## 9. La règle, et ses trois corollaires payés

> **Le correctif énumère la population de l'INSTRUMENT qu'il vient d'écrire, pas celle de la PROPRIÉTÉ.**

★ **v2** : une règle posée dans un document s'applique d'abord à ce document.
★ **v3** : quand on corrige une garde, **le défaut descend d'une grandeur** — après chaque correctif,
redemander *quel monde satisfait encore cette version ?*
★ **v4** : **avant d'écrire « non mesuré », grep le fichier de tests de la classe concernée.**
Cinq fois sur cinq, la réponse y était déjà.


---

## 10. Notes d'implémentation — les 14 findings PREUVE de la revue qui a APPROUVÉ

> *« Les 8 IMPORTANT ne changent pas ce que le lot FAIT ; ils changent ce qu'il PROUVE. »* — à traiter
> pendant l'implémentation, pas après.

**I1 — déclarer la COUCHE dans le NOM du test.** Le §2 prescrit « un identifiant issu de la réponse
back » — c'est la grandeur v3, satisfaite par une donnée **SEMÉE** (`CharpenteOuvertureSessionOverlay
PlayModeTests.cs:51-57` `[OneTimeSetUp] RunSeeder`, puis `:277-279` `"Card_" + …exception_id`). Semer
est **légitime à la couche 3** ; le ⛔ du socle est de ne pas le DIRE. ⇒ **le nom du test porte la
couche et la précondition semée.**

**I2 — nommer les grandeurs du détecteur.** `RenderedEmptyState == true` (⛔ **jamais**
`RenderedCardCount == 0` : `LoadReview:63` avale l'erreur, `Render` n'est pas appelé, l'état vide
reste `SetActive(false)` `:176` ⇒ le compte à 0 est VRAI sur un écran qui n'a jamais parlé au back).
★ **Et la clé du détecteur de péremption, trouvée par la revue** : `SessionDtos.cs:40-46` /
`:95` — `flag_review.pending_review_count`, **une des 12 clés de `session/open`**, déjà stockée dans
`AppShell.cs:111 LastSessionOpen`. **Clé PRÉSENTE, valeur 0 aujourd'hui, qui bascule côté SERVEUR** le
jour où la chaîne s'ouvre. Citer `C8F5` (`…Tests.cs:89-100`) comme **garde de CAPACITÉ** : flag semé ⇒
`RenderedCardCount == 1` — elle prouve que la sonde SAIT trouver une carte.

**I3 — le déduit n°2 était MAL CADRÉ.** `DailyReviewScreenController.cs:151` **ajoute lui-même** son
`RectTransform`, et `…Tests.cs:59 hostGo.AddComponent<RectTransform>()` **pré-empte la condition** —
voilà pourquoi personne ne l'a mesuré en quatre versions. La vraie question est la **GÉOMÉTRIE**.
⇒ Option conservatrice, écrite dans les 10 autres locataires : **bâtir sous `mountParent`, ne jamais
toucher `ConstruireLocataire`.**

**I4 — coller le compte de C3.2** : 5 sites de production, 7 blocs exécutables, 7 blocs de prose
(`CharpenteBootScenePlayModeTests.cs:187/:273` = hits **vus mais hors classe**).
⛔⛔ **Non dit jusqu'ici et décisif** : si `OnEmptyMoreDestination` est **REMPLACÉ** au lieu d'être
conservé, `AppShellPlayModeTests.cs:85/:90/:95` **CESSENT DE COMPILER** ⇒ juge rouge partout.

**I5 — C2 est MOINS CHER que ce design l'implique.** **3 des 4 panneaux ne consomment AUCUNE route**
(`SetPayload` / `SetQueue` / `SetFrictionStress` / `SetLoadCircumstances`) ; `HlCardClient` n'a que
`Commit`/`Skip`. **La source unique des quatre est `POST /v1/session/open`, déjà dans
`AppShell.cs:111`.** ⇒ La question (a) du §2 était posée au mauvais objet.

**I6 — `HomeChrome`** : asserter `EmptyState` (`:54`), ⛔ **jamais `LoadingState`** — `:19` (défaut
jamais câblé) et `:56` (« tout est chargé ») portent la MÊME valeur : indiscriminante dans les deux sens.

**I7 — les deux absences de C3.3 ne sont PAS de même nature.** Le client a **zéro** notion
d'`AdminAccessFlag` ⇒ l'absence de Backoffice est produite **par le CODE** : épingle **tautologique**,
aucun contrôle positif écrivable — **le dire**. Celle de Compression Week est **pilotée par la DONNÉE**
(`week_state`) et porte, elle, un vrai contrôle.

**I8 — la réconciliation `front.md` a DISPARU en v4** au lieu d'être fermée (finding aux v1/v2/v3).
★ **Précision que la revue ne pouvait pas avoir** : le hunk non commité qui dit « 6 » n'est **pas**
d'une autre session — **c'est le mien**, écrit le 2026-08-27 avec son contrôle d'anti-péremption
(7 motifs, régime AVANT/APRÈS collé, portée déclarée). `front.md` **@HEAD** dit encore SEPT ⇒ **le
commit de clôture doit porter ce hunk**.

**MINEURS** : M1 « seul `DashboardController` dans `Operational/` » est **FAUX** — `PipelineOverview`
y est aussi · M2 « jalon 4 » est la reco de **C-bis** (`front.md:235`), pas de C (`:222`) · M3 « deux
ancres fausses » puis une seule nommée · M4 le **17ᵉ** contrôleur créé par C3 n'est pas compté ·
M5 `front.md:562` n'est valide que dans l'arbre de travail, **portée à déclarer** · M6 la convention
i18n du client est l'**inverse** de ce que suppose le déduit n°4 (**48 sites `.text = "littéral"`**),
et le précédent de résolveur local est `FamilleLabels.cs:9-18` · M6-bis `AppShell.cs:359-361` nomme
les **mauvais quatre** contrôleurs.
