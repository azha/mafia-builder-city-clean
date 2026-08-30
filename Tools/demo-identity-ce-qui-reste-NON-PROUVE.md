# Surcharge d'identité de démo — ce que le lot NE prouve PAS

**Écrit le 2026-08-30, avant tout compile.** Tenue de registre volontaire : le lot est
`APPROUVÉ` par trois revues ⊥ et cette page existe pour que ce mot ne se relise pas
« vérifié ». Elle est datée et porte son mode d'emploi de péremption au §5.

État : `a83bfb7` sur `main` · 4 commits · 95 lignes de code de production · 23 gardes.

---

## 1. Le fait central, en une ligne

**Aucune ligne de ce lot n'a jamais été compilée, et aucune de ses 23 gardes n'a jamais
tourné.** Le socle de ce dépôt a un nom pour cet objet :

> « Une garde qui n'a jamais tourné n'est pas une garde ; c'est une prose datée avec un
> `[Test]` devant. »

⇒ **Ce lot livre aujourd'hui 23 proses datées.** Elles deviendront des gardes au premier run
vert, pas avant. Le mot `APPROUVÉ` porte sur la *lecture* du code, pas sur son *exécution*.

## 2. Par quoi les trois revues ont réellement conclu

Chaque vérification — les miennes comme celles des relecteurs — s'est faite par **oracles
Python répliquant les scanners C#** : on relit le texte des fichiers avec un second
instrument, en langage différent, écrit par quelqu'un d'autre.

**Ce que cette méthode a prouvé, et c'est réel** : elle a trouvé 2 BLOCKING puis 1 BLOCKING
sur trois rondes, dont un motif de garde qui aurait certifié le défaut qu'il surveillait.
Sur des gardes qui sont *elles-mêmes* des analyses de texte, un oracle textuel indépendant
est le bon instrument — il mesure la même grandeur que la garde.

**Ce qu'elle ne peut pas prouver, par construction** : qu'un fichier `.cs` compile. Un oracle
Python ne connaît ni les types C#, ni les `using`, ni les surcharges, ni les contraintes
génériques, ni le graphe d'assemblies d'Unity.

## 3. Les huit énoncés NON PROUVÉS, nommés

| # | énoncé | pourquoi il tient encore debout | ce qui le trancherait |
|---|---|---|---|
| **N1** | le lot **compile** | lu, jamais bâti | premier compile |
| **N2** | les 21 gardes du resolver **passent** | logique relue ligne à ligne | run scopé `DemoIdentity` |
| **N3** | les 2 gardes deux-comptes passent — **c'est l'OBJET du lot** | elles exigent un back vivant ET un éditeur | run avec la pile |
| **N4** | l'ajout de `DemoIdentity` au juge ne fait **pas** rougir | annoncé dès la ronde 2 comme conséquence attendue, jamais observé | premier run complet |
| **N5** | le `Debug.LogWarning` neuf **ne change pas** le retour de `Resolve()` | refactor relu, sémantiquement identique (`IsNullOrWhiteSpace(x) ? fb : x` → `xIsSet ? x : fb`) | les 5 `Resolve_*` |
| **N6** | les 4 variables d'env sont **réellement lues** par le processus Unity | `Environment.GetEnvironmentVariable` jamais exécuté ici | run avec variable posée |
| **N7** | `ResolveAndSignIn` **atteint** le back et s'authentifie | zéro appel réseau exécuté | N3 |
| **N8** | les 6 motifs de garde **mordent** sur du C# réel | vérifiés par oracle Python sur le même texte | run scopé |

★ **N4 mérite d'être lu deux fois.** L'ajout de la catégorie au juge est le geste qui *fait
entrer* trois classes sous un juge qui ne les voyait pas. C'est un progrès — et c'est aussi
la seule ligne du lot dont on a **écrit d'avance** qu'elle pouvait produire des rouges.
Un rouge y sera un défaut **démasqué**, jamais une régression : la distinction doit être
faite au premier run, pas après.

## 4. Ce qui EST prouvé, et ne doit pas être bradé

Ne pas relire cette page comme « le lot ne vaut rien ». Sont **comptés**, pas déduits :

- la population du 6ᵉ motif : **13 occurrences = {`DemoIdentityResolver.cs` 11, `AppShell.cs` 2}**,
  recomptée par un oracle indépendant du scanner C# ;
- le compte propre du fichier de garde **épinglé à 13**, recompté ligne à ligne ;
- les **4 noms de variables d'environnement distincts** ;
- le point d'entrée nommé `ResolveAndSignIn` **exprès** pour que la garde `.SignIn(` ne
  s'auto-matche pas — trouvé et corrigé en revue ;
- le chiffre faux du message de `bef6ae4` **corrigé explicitement** (`10 → 23`, pas `10 → 20`).

## 5. Mode d'emploi de péremption de cette page

**Cette page ment à partir du moment où le premier run vert existe.** Elle ne se corrige pas
toute seule.

⇒ **Au premier run complet vert**, faire les trois gestes, dans cet ordre :
1. coller le compte réel (`passed=… failed=…`) et vérifier que les **23 gardes sont dans le
   compte** — les relancer **seules par leur nom complet**, jamais se fier au total (un
   filtre de catégorie inexact n'erreur pas : il exécute un autre jeu et le déclare vert) ;
2. rayer N1..N8 un par un, avec la sortie pour chacun — **jamais en bloc** ;
3. si un rouge sort, le classer **démasqué** ou **régression** avant tout correctif, en
   nommant lequel des huit énoncés il réfute.

⇒ **Tant que le §3 n'est pas rayé, tout document qui cite ce lot écrit « approuvé, non
exécuté », jamais « livré ».**

---

## N9 — la portée des gardes, et ce qu'elle ne voit pas

**Ajouté le 2026-08-31**, sur une règle venue d'une session voisine :

> **Une falsifiable dont le total est dérivé de la table qu'elle vérifie ne peut mesurer que
> l'EXACTITUDE, jamais la COUVERTURE.**

Mon épingle `13 = {DemoIdentityResolver 11, AppShell 2}` est **exacte**. Elle est aussi
**scopée à `Assets/Scripts`**, et l'exactitude sur une portée ne dit rien de ce qui vit
dehors. Population réelle de ce que le système compile :

| racine | fichiers | couverte par une garde ? |
|---|---|---|
| `Assets/Scripts` | 66 | **oui** — les 6 motifs |
| `Assets/Tests` | 70 | **exclue exprès**, mais pas nue (`…ScopedToAssetsTests`) |
| `Assets/Editor` | 8 | **NON — aucune garde** |
| `Assets/TutorialInfo` | 2 | non (gabarit Unity) |

**Mais le trou réel n'est pas de 8 fichiers : il est de DEUX**, et la raison est structurelle.

| fichier | assembly | voit `Shell`/`CityMap` ? |
|---|---|---|
| `AssetLint/` (6 fichiers) | `AssetLint` (`references: []`, `includePlatforms: ["Editor"]`) | **non — fermé par construction** |
| `MafiaCI.cs` | `Assembly-CSharp-Editor` (prédéfinie) | **oui** |
| `W4P4aArtImportPostprocessor.cs` | `Assembly-CSharp-Editor` (prédéfinie) | **oui** |

Une assembly **prédéfinie** référence automatiquement toute `asmdef` dont
`autoReferenced` est vrai — et les **cinq** assemblies de production le sont
(`Shell`, `CityMap`, `Operational`, `Theme`, `ShellContracts`). Ces deux fichiers
**peuvent donc appeler `DemoIdentityResolver`**, et **aucun balayage ne les lit**.

★ **Et l'ironie désigne le geste** : `MafiaCI.cs` est le point d'entrée du **juge**
lui-même — le fichier qui décide quelles catégories tournent. Un appel d'identité placé
là vivrait dans le seul fichier qui exécute les gardes, invisible à toutes.

**État de l'énoncé** : les deux fichiers portent **0 occurrence** des six motifs
surveillés aujourd'hui (vérifié aussi sur `GetEnvironmentVariable` et `MAFIA_*`).
★ **Contrôle positif, sans lequel ce zéro ne vaudrait rien** : le même instrument
trouve **36 `using` dans `Assets/Editor`** et 711 dans `Assets/Tests` — verdict **non
uniforme**, donc il lit vraiment ces fichiers. *Un balayage uniformément à zéro est le
premier signe qu'on mesure autre chose.*

⇒ **Donc « rien aujourd'hui », pas « rien par construction » : une prose datée.** Le geste
qui ferme N9 est d'**élargir la portée** des trois balayages à `Assets/Editor` — jamais
d'ajouter un second point d'entrée (le patron maison : on élargit, on ne duplique pas).

## N10 — mes gardes de compte comptent des OCCURRENCES, pas des AFFECTATIONS

Mesuré le même soir sur un chiffre voisin, et la classe vaut pour toutes mes épingles de
compte. L'item 0.9 de `front.md` établissait « **2** `localScale` dans `Assets/Scripts/Shell`,
tous deux le bandeau ». Re-mesuré : le `grep` brut rend **8** — **2 affectations réelles**
(`AppShell.cs:947`, `:1339`, les deux le bandeau : la conclusion tient) et **6 commentaires**
ajoutés depuis par le lot charpente.

⇒ **Une garde bâtie sur ce compte rougirait sur un commentaire, c'est-à-dire sur rien.**
Toute épingle de compte de ce lot — à commencer par le **13** — doit dire si elle compte des
**affectations/appels** ou des **occurrences de texte**, et compter la première.

## N11 — la vacuité par réparation : la classe s'applique, l'exposition est FAIBLE, et le message ne le dirait pas

**Classe reçue d'une session voisine le 2026-08-31** :

> **Corriger le défaut qu'une garde surveille peut rendre cette garde VIDE — et rien ne le
> signale, le compte reste flatteur.** Le remède est un **dénominateur imprimé**, comptant
> *ce qui pouvait faire rougir*. La seule forme immunisée est le **scénario qui fabrique sa
> population** ; un balayage d'un corpus existant est exposé par construction.

**Appliquée à mes 23 gardes — et le résultat est rassurant pour une raison de FORME, pas de
chance** : mes balayages assertent une **égalité d'ENSEMBLES contre un attendu NON VIDE**
(`CollectionAssert.AreEquivalent(allowlistNonVide, scan.FilesWithHits)`), et l'allowlist porte
`Assert.IsNotEmpty`. ⇒ **Un corpus vidé fait ROUGIR l'égalité, il ne la satisfait pas.** Et les
`Scan_New*_IsDetected` **fabriquent leur site** avant de l'observer : c'est nommément la forme
immunisée. ⇒ **Exposition faible.**

⚠️ **Ce qui reste vrai malgré tout, et c'est N11** : **aucune de ces gardes n'imprime de
dénominateur.** Si l'une devenait vide pour une raison que je n'ai pas prévue — racine
introuvable, jeton renommé, portée déplacée — **son message ne le dirait pas**. Le remède
(« 0 violation sur **N sites examinés** ») est juste et n'est pas appliqué.

⛔ **Pourquoi je ne le corrige PAS maintenant, et c'est une décision, pas un oubli** : ce
fichier n'a **jamais compilé ni tourné**. Ajouter du code non exécuté pour durcir du code non
exécuté augmente N1..N10 sans rien mesurer. ⇒ **À faire au PREMIER run vert**, quand le
dénominateur imprimé pourra être *lu* et donc *vérifié*. Le noter ici est le geste honnête ;
l'écrire à l'aveugle serait le geste rassurant.

★★ **Et la leçon de méthode de cette passe vaut plus que le finding** : j'ai voulu classer mes
23 gardes par un motif, **trois fois de suite, et les trois classifications étaient fausses** —
d'abord parce que le motif lisait des **blocs de commentaire**, puis parce qu'il attrapait des
**méthodes utilitaires** (`SignIn`, `SetIdentity`) prises pour des tests, puis parce qu'il
comptait les **contrôles positifs** comme des gardes exposées. *Un instrument d'étiquetage faux
produit une classification qui a l'air mesurée*, et c'est la **quatrième** fois cette nuit.
⇒ **Sur une population de 23, LIRE les corps coûte moins cher que réparer trois fois un
classifieur** — et c'est la lecture qui a donné la vraie réponse (l'attendu non vide), qu'aucun
de mes trois motifs n'avait vue.

### N11-bis — la LISTE des dénominateurs à poser, écrite maintenant pour ne pas être reconstruite

À faire **au premier run vert**, pas avant (voir N11 : ne pas durcir à l'aveugle du code jamais
exécuté). Forme imposée : **« 0 violation sur N sites examinés »**, où **N compte ce qui POUVAIT
faire rougir**, jamais « N fichiers ouverts ».

**12 gardes balaient un corpus existant** — ce sont exactement celles que la classe vise :

| garde | ce que N doit compter |
|---|---|
| `RealNetworkSignInCalls_LiveOnlyInsideTheResolver_…` | fichiers `.cs` lus sous `Assets/Scripts` |
| `RealNetworkSignUpCalls_NeverOccurOutsideTests_…` | idem |
| `DirectUrlAccess_NeverOccursOutsideAuthClient_…` | idem |
| `ExplicitIdentityOverrides_MatchTheReviewedAllowlist_…` | fichiers lus sous `Assets/Tests` |
| `AllowEnvironmentOverrideSites_MatchTheReviewedAllowlist_…` | fichiers lus sous `Assets/Scripts` |
| `ExplicitIdentityOverride_SelfFileOwnCount_IsPinned` | occurrences examinées dans le fichier épinglé |
| `Scan_SelfExclusion_DoesNotBlindRealCallsElsewhere` | fichiers lus, **hors** celui qui est exclu |
| les 5 `Scan_New*_IsDetected` / `_BreaksTheSet_…` | *(immunisées : elles FABRIQUENT leur site — le dénominateur y est facultatif, mais l'imprimer coûte une ligne et rend la lecture uniforme)* |

⚠️ **Et le compte « 12 » lui-même porte la réserve de N11** : mon balayage rend **13**, dont
`SignIn` qui est une **méthode utilitaire**, pas un test. *Cinquième instrument d'étiquetage à
corriger cette nuit.* Le chiffre opposable est **12**, obtenu en lisant, pas en grepant.
