# Items 0.2 + 0.3 (+ 0.3-bis) — implementation-notes.md

Design : `Tools/charpente-item0-2-3-design.md`. Périmètre : le dock ratifié (Empire · Famille ·
Filière · Plus), Empire = fusion de `Tab.Home`/`Tab.City` (EST la carte), la porte d'entrée du
district, et le retrait paraphrasé de l'énoncé daté d'`AppShell.cs`.

Logs bruts conservés hors du dépôt : `/tmp/charpente-0203/*.log` (round 1) et
`/tmp/charpente-0203-r2/*.log` (round 2 — seul fichier neuf laissé dans `Tools/` : celui-ci + le
design déjà déposé par le contrôleur).

Méthode de run, identique au précédent d'item 0 (round 2) : les runs de contrôle négatif et de
vérification de correctif sont **scopés à la catégorie `Charpente` seule** (narrowing temporaire de
`Assets/Editor/MafiaCI.cs:Categories` à `{ "Charpente" }`, restauré à `{ "W4P4a", "W3UDA", "W3U1",
"W3U2", "Charpente" }` avant toute mesure finale). Le juge **complet** (5 catégories) a maintenant
été lancé **TROIS fois** au total (round 1 : deux — préliminaire + clôture ; round 2 : une
troisième, réconciliation § « Run complet du juge »).

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
  Corrigés à l'oracle (`331`/`367` et `711-712`) ; TOUS les autres numéros de ligne de ce document
  ont été re-vérifiés à l'oracle Python/`$( )` (aucun autre écart trouvé).
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
terminal (socle CLAUDE.md — la commande n'était pas dans un pipe/`$( )`). RE-MESURÉ à l'oracle
(`$( )`, ci-dessous) : les vraies lignes sont `331` (repli) et `367` (succès) dans le worktree
actuel ; sur `af9893b` (avant ce lot, `Tab.Home` pas encore renommé `Tab.Empire`), les mêmes
positions sont `316` et `352` — confirmé par lecture directe du fichier aux deux révisions.
```
$ OUT=$(grep -n 'ActivateTab(Tab.Empire)' Assets/Scripts/Shell/AppShell.cs | grep -E '^(331|367):'); echo "$OUT"
331:                if (CurrentTab == (Tab)(-1)) ActivateTab(Tab.Empire); // repli : le locataire signera lui-même
367:            if (CurrentTab == (Tab)(-1)) ActivateTab(Tab.Empire);
```
Les deux occurrences (branche d'échec `:331`, branche de succès `:367`) portent le même garde,
recopié tel quel — vérifié par lecture directe du diff (`git diff af9893b -- Assets/Scripts/Shell/
AppShell.cs`, non collé ici pour éviter un pavé — la commande a été exécutée et relue en entier
avant de continuer). Les tests qui dépendent de ce sentinel
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

**ARMÉ** — `AppShell.cs:751`, `(Tab.More, "Plus")` → `(Tab.More, "PlusFaux")` (seul site touché,
restauré depuis `/tmp/charpente-0203/AppShell.cs.original-backup` ensuite, `diff` vérifié
IDENTIQUE).

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
com.unity.ext.nunit@*/package.json:5`). Le libellé est lu SOUS le bouton `Tab_{tab}` qui le porte
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

**ARMÉ** — `AppShell.cs:177`, `case Tab.Empire: MountTenant<CityMapController>();` →
`MountTenant<LieutenantScreenController>();` (un seul site touché — « l'onglet par défaut ne monte
plus la carte », suggestion verbatim du mandat) ; restauré ensuite, `diff` vérifié IDENTIQUE.

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
`303 − 201 = 102` = Screenshot 38 + HUDv31 31 + sans-catégorie 27 + Capture 4 + JUGE 2.

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

## Ce que je n'ai pas pu vérifier

- **Que le clic RÉEL sur « Entrer » (F0.3) soit exercé par un joueur AUTREMENT que dans ce test** —
  F0.3 prouve l'atteignabilité depuis le code de production (le même chemin que nav-F1), pas depuis
  un geste tactile physique (hors de portée du batchmode).
- **L'effet à long terme du choix Empire↔Org pour `HudF7`** (Deviation 3) sur un compte qui aurait,
  demain, une identité démo propre pour `LieutenantScreenController` — si `Org` acquiert un jour son
  propre repli à identité DIFFÉRENTE d'`operational_demo`, ce test resterait vert pour une raison
  plus riche qu'aujourd'hui (deux comptes concurrents au lieu d'un), sans qu'aucune régression n'en
  résulte — non vérifié faute d'un tel scénario existant à ce jour.
- **Item 0.5** (les 4 orphelins, dont `DashboardController` — sa destination, l'ouverture de
  session) — explicitement hors de ce lot, laissé débranché et dit (design §5).

---

## Run complet du juge (5 catégories) — TROIS mesures indépendantes, réconciliées (round 2)

⛔⛔ **CORRIGÉ (revue ⊥ round 2, MAJEUR M4)** — la version précédente de cette section réconciliait
`194 + 4 + 1 = 199` en déclarant `StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas`
« MARGINAL/FLAKY » **au passé**, sur la foi d'UNE SEULE observation (ce test était vert dans mon
run). Le run **indépendant** de la revue a rendu `passed=198 failed=3` (`194 + 4 = 198`, `3 = 3`,
**sans aucun `+1`**) — `StaleAbandonedShell` y échouait, sur sa prémisse (« A a bien une liste de
districts vivante avant l'entrée en scène de B »), avec ses 8 assertions inchangées depuis
`af9893b`. Une déduction tirée d'UNE observation n'est pas une mesure. **Un troisième run,
lancé par moi-même round 2**, tranche : voir tableau ci-dessous.

Trois runs complets (5 catégories), à trois moments distincts, TOUS en environnement calme (aucun
autre process Unity/Docker en vol) :

| run | quand | commande/log | `passed` | `failed` | `StaleAbandonedShell` |
|---|---|---|---|---|---|
| **A (moi, round 1)** | juste après le geste de code round 1, `MafiaCI.cs` restauré aux 5 catégories | `/tmp/charpente-0203/full-run-FINAL.log` | 199 | 2 (`NavD12`, `NavF4`) | **VERT** |
| **B (revue ⊥, round 1)** | mesure indépendante du même livrable round 1 | (log de la revue, non détenu par moi) | 198 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** |
| **C (moi, round 2)** | après TOUS les correctifs de ce round (C-α, C7, m2, m3) — ajoute 1 test neuf (`C7`) | `/tmp/charpente-0203-r2/full-run-THIRD.log` | 199 | 3 (`NavD12`, `StaleAbandonedShell`, `NavF4`) | **ROUGE** |

Commande du run C :
```
LOG_FILE=/tmp/charpente-0203-r2/full-run-THIRD.log timeout 900 Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Sortie réelle (`MafiaCI:` lines) :
```
MafiaCI: RunPlayModeTests started — 303 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)
MafiaCI: FAIL MafiaCleanCity.CityMap.Tests.DistrictMapNavigationPlayModeTests.NavD12_DistrictTitle_MargeGouttiere_Serif_EtOmbreSurMateriauDInstance —   scénario dimensionné — cette résolution DOIT produire une bande de letterbox (mesuré 0.0px), sinon l'assertion suivante ne teste pas le défaut visé
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.AppShellPlayModeTests.StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas —   prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B
MafiaCI: FAIL MafiaCleanCity.Shell.Tests.NavigationPlayModeTests.NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution —   nav-F4 (amendée) — the title does not overlap TopBarSlot's EFFECTIVE bounds (déjà inclusives du débordement du médaillon, 26.3px mesurés) — un titre qui ne réserve que 56px nominaux serait chevauché par l'anneau/le filet qui pendent en dessous
MafiaCI: RunPlayModeTests finished — passed=199 failed=3 skipped=0 inconclusive=0
```
`elapsed=244s timeout=900s issue=[sortie normale (RC=1)]`.

### Arithmétique honnête (pas de `+1` caché)

Baseline `af9893b` (mandat) : `passed=194 failed=3` (`NavD12`, `StaleAbandonedShell`, `NavF4`),
total **197**. Round 1 ajoute 4 tests neufs (`F0.2`, `F0.2-c`, `F0.3`, `F0.3-bis`), tous VERTS dans
les trois runs (A, B, C) — total **201**. Round 2 ajoute 1 test neuf (`C7`), VERT dans le run C —
total **202**.

- Run A : `194 + 4 = 198` passés de base, **+1 parce que `StaleAbandonedShell` était vert CE run** =
  **199** ; `3 − 1 = 2` échecs. `199 + 2 = 201`. ✔
- Run B : `194 + 4 = 198` — **`StaleAbandonedShell` rouge**, aucun `+1` : **198** ; `3` échecs
  inchangés. `198 + 3 = 201`. ✔
- Run C : `194 + 4 + 1(C7) = 199` — **`StaleAbandonedShell` rouge**, aucun `+1` supplémentaire ;
  `3` échecs. `199 + 3 = 202`. ✔

**Aucun résidu inexpliqué sur les trois runs** — mais `StaleAbandonedShell` est **VERT sur 1/3
mesures indépendantes, ROUGE sur 2/3**. La qualification précédente (« MARGINAL/FLAKY », présentée
comme une clôture) était une généralisation sur un échantillon de taille 1. La qualification
honnête : **intermittent, prédominance ROUGE (2/3)**.

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

## État final du dépôt (round 2, re-vérifié après tous les correctifs et contrôles négatifs)

- `Assets/Scripts/Shell/AppShell.cs`, les 7 fichiers de test listés en Deviation 7 (+ round 2 :
  `using MafiaCleanCity.Operational.Lieutenant;` ajouté à `CharpenteMontageLocatairesPlayModeTests.
  cs` pour `C7`) : modifiés, contenu final vérifié — **oracle Python**, pas `diff` nu (le round 2 a
  mesuré que `diff` nu peut rendre un FAUX « files are identical », § F0.2 Round 2 ci-dessus) :
  ```
  $ python3 -c "a=open('Assets/Scripts/Shell/AppShell.cs',encoding='utf-8').read(); b=open('/tmp/charpente-0203-r2/AppShell.cs.original-backup',encoding='utf-8').read(); print('IDENTICAL' if a==b else 'DIFFERENT')"
  IDENTICAL
  $ grep -c "PlusFaux" Assets/Scripts/Shell/AppShell.cs
  0
  $ grep -c "CONTRÔLE NÉGATIF" Assets/Scripts/Shell/AppShell.cs
  0
  ```
  Aucun résidu des DEUX contrôles négatifs de ce round (C-α : labels échangés ; C7 : `case Tab.Org`
  retirée).
- `Assets/Editor/MafiaCI.cs` : **INCHANGÉ** par rapport au commit `af9893b` — `git diff af9893b --
  Assets/Editor/MafiaCI.cs | cat` rend une sortie VIDE (re-vérifié round 2, après le
  narrowing/restauration de ce round en plus de celui du round 1) — le narrowing temporaire à
  `{ "Charpente" }` puis la restauration aux 5 catégories n'ont laissé aucune trace.
- `Assets/Fonts/DejaVuSans SDF.asset`, `Assets/Fonts/DejaVuSerif SDF.asset`,
  `Assets/TextMesh Pro/.../LiberationSans SDF.asset` — modifiés par les runs Unity (régénération
  d'atlas SDF, effet de bord connu de ce dépôt) — signalés, PAS commités, PAS restaurés par moi (le
  contrôleur fait le `git checkout` avant le commit, comme pour item 0 et le round 1).
- `Assets/InitTestScene*.unity` (7 fichiers `.unity` + leurs 7 `.meta` = 14 entrées, gitignorés —
  `git status --short --ignored` les liste, `git status --short` nu ne les montre pas — recompté
  round 2 : `git status --short --ignored | grep -i InitTestScene | grep -v '\.meta$' | wc -l` → 7,
  MÊME compte que round 1 malgré les 9 runs de ce round — pas de delta net mesuré, non investigué
  plus avant, hors périmètre) — accumulés par les runs successifs, artefact du test runner Unity en
  batchmode, pas du code de ce lot. Signalés, non supprimés (geste réservé au contrôleur, même
  patron qu'item 0 round 2 / round 1 de ce lot).
- `git status --short` (tracked) ne liste QUE les 8 fichiers modifiés attendus + les 3 assets de
  police + les fichiers `?? ` non liés à ce lot (`Tools/juge-donnees/*`, `Tools/juge-visuel/*`,
  `Tools/charpente-item0-2-3-design.md` — déposé par le contrôleur avant ce lot) — aucun fichier
  inattendu.
