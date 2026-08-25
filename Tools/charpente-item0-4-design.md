# Item 0.4 — les locataires montent **DANS** le shell

> Périmètre : l'item **0.4** de `front.md` (« Les 5 boutons nav du Dashboard remontés dans le
> shell »). Rien d'autre. Les items 0.2 / 0.3 attendent l'arbitrage user **A** ; 0.5 → 0.8 sont hors
> de ce lot.
> Design écrit depuis la session principale (ruling user 2026-08-25 — l'auteur tient les mesures).
> **La revue ⊥ est déléguée à un `reviewer` frais : auteur ≠ relecteur.**

---

## 1. Ce qui est mesuré — le 2026-08-25, sur `fe00b0a` (dernier commit de tous les fichiers cités)

### 1.1 Deux sites de production créent une racine de scène

```
$ grep -rEn 'new GameObject\(.{0,3}"?\$?"Nav_' Assets/Scripts
Assets/Scripts/Operational/Dashboard/DashboardController.cs:301:            GameObject host = new GameObject($"Nav_{target}");
Assets/Scripts/Operational/Exceptions/ExceptionQueueController.cs:160:            LastNavGameObject = new GameObject("Nav_ExceptionDetail");
```

**2 hits, portée = `Assets/Scripts` (arbre de production entier).**

⚠️ **Le motif a dû être durci pour les trouver tous les deux.** Un premier balayage écrit avec une
alternance BRE (`\|`) n'a rendu que le second : `rg` est proxifié vers `grep` nu dans cet
environnement, et une alternance nue matche **littéralement**. Le `-E` ci-dessus est la forme
opposable. *Deux formulations de la même propriété (chaîne littérale · chaîne interpolée) exigeaient
deux formes de motif — c'est la propriété qu'on vise, pas la tournure qu'on a vue en premier.*

`DashboardController.cs:296-311` — le corps, recopié du fichier :

```csharp
private void OpenNav(NavTarget target)
{
    LastNavTarget = target;
    GameObject host = new GameObject($"Nav_{target}");
    switch (target)
    {
        case NavTarget.CityMap: host.AddComponent<CityMapController>(); break;
        case NavTarget.BuildingCard: host.AddComponent<BuildingCardController>(); break;
        case NavTarget.Pipeline: host.AddComponent<LaunderingController>(); break;
        case NavTarget.Exceptions: host.AddComponent<ExceptionQueueController>(); break;
        case NavTarget.Autonomy: host.AddComponent<AutonomyInboxController>(); break;
    }
    LastNavGameObject = host;
}
```

⇒ **ni `SetMountParent` ni `SetToken`** sur aucune des 5 branches.

`ExceptionQueueController.cs:153-165` (`OpenDetail`) fait le même geste pour
`ExceptionDetailController`, et sa docstring le nomme elle-même « OpenNav idiom ».

### 1.2 La conséquence est écrite dans le dépôt, par le dépôt

`IShellTenant.cs:10-20` (verbatim, c'est la source, pas une paraphrase de ma part) :

> les contrôleurs **DÉCOUVRENT** leur Canvas via `FindFirstObjectByType<Canvas>()` et étirent un fond
> plein écran **À LA RACINE** du Canvas trouvé […] Monté dans un shell propriétaire du Canvas, ce
> comportement **RECOUVRE TabBar + TopBar** […] tout nav-bouton legacy comme
> `DashboardController.OpenCityMap`.

⇒ Le dépôt **documente le défaut, nomme le site fautif, et ne le corrige pas**. Les 4 écrans canon
que ces boutons desservent (`screen_2`, `screen_2a`, `screen_5`, `screen_c7`) ne sont donc
atteignables que par un chemin qui **efface les deux barres** et qui, faute de jeton, **repart en
`SignIn()`** au lieu de recevoir celui du shell.

### 1.3 Aucun contre-exemple correct n'existe

Appelants de `SetMountParent` : **`AppShell.cs:211` et `:375`**, et rien d'autre.
Appelant de `SetToken` : **`AppShell.cs:384`**, et rien d'autre.
⇒ **Le modèle est `AppShell.MountTenant<T>` lui-même, pas un locataire.**

### 1.4 Dix classes implémentent `IShellTenant` — la population de la classe de défaut

| # | classe | assembly |
|---|---|---|
| 1 | `CityMapController` | `CityMap` |
| 2 | `DistrictInteriorScreenController` | `CityMap` |
| 3 | `DashboardController` | `Operational` |
| 4 | `BuildingCardController` | `Operational` |
| 5 | `LaunderingController` | `Operational` |
| 6 | `PipelineOverviewController` | `Operational` |
| 7 | `LieutenantScreenController` | `Operational` |
| 8 | `ExceptionQueueController` | `Operational` |
| 9 | `ExceptionDetailController` | `Operational` |
| 10 | `AutonomyInboxController` | `Operational` |

Contrôle d'arithmétique : `Assets/Scripts` porte **16** `*Controller.cs` ; **10** sont locataires,
**6** ne le sont pas (`TopBarController` = chrome ; `DailyReviewScreenController`,
`ExceptionQueuePanelController`, `HighestLeverageCardController`, `HomeChromeController`,
`OrgVitalsPanelController` = les orphelins de l'**item 0.5**, hors de ce lot). **10 + 6 = 16** ✔

### 1.5 La contrainte d'assembly, et le précédent maison qui la résout DÉJÀ

`Shell.asmdef` référence `CityMap` **et** `Operational`. ⇒ un locataire **ne peut pas** référencer
`Shell` : asmdef refuse le cycle (mesuré ailleurs dans ce dépôt : CS0234 en tentant de lire
`TopBarController.BarPaddingX` depuis `DistrictInteriorScreenController`).

**`ShellContracts` est la frontière établie pour exactement ce problème, et elle porte déjà un
localisateur dans le sens locataire → shell** : `ShellSessionSinkLocator`
(`ShellContracts/IShellSessionSink.cs:35-42`), **consommé en production** par
`DashboardController.cs:244`.

⇒ **Ce lot n'invente aucun mécanisme. Il ajoute un second contrat au même endroit, sur le même
idiome, pour le même sens de dépendance.**

### 1.6 `MountTenant<T>` fait déjà les quatre gestes justes

`AppShell.cs:354-388` : (a) `host.transform.SetParent(ContentSlot, false)` · (b)
`PublierInsetsDuChrome()` · (c) `tenant.SetMountParent(ContentSlot)` **dans la fenêtre synchrone** ·
(d) `if (!string.IsNullOrEmpty(Token)) tenant.SetToken(Token)`.

Et son corps est **déjà dupliqué une fois** : `EnterDistrict` (`AppShell.cs:213-221`) le recopie
verbatim, en le déclarant « ── EXACTLY MountTenant<T>'s body ── ». **Deux exemplaires en vie :
corriger l'un laisserait l'autre.**

---

## 2. Le geste — trois pièces, aucune invention

### 2.1 `Assets/Scripts/ShellContracts/IShellNavigator.cs` — **fichier neuf**

Calqué sur `IShellSessionSink.cs` : une interface + son localisateur statique, même raison
(`FindObjectsByType<T>` exige `T : UnityEngine.Object`, qu'une interface ne satisfait jamais).

```csharp
public interface IShellNavigator
{
    /// Monte `T` comme locataire du shell : hôte enfant de ContentSlot, insets publiés,
    /// SetMountParent + SetToken dans la fenêtre synchrone. Rend le composant, pour que
    /// l'appelant l'initialise AVANT son Start() (différé d'une frame).
    T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant;
}

public static class ShellNavigatorLocator
{
    public static IShellNavigator Find() { /* même corps que ShellSessionSinkLocator.Find() */ }
}
```

⛔ **« En surimpression » n'est pas de la décoration : c'est la sémantique EXACTE d'aujourd'hui, et
la conserver est ce qui rend ce lot sûr.** Le détail d'exception **recouvre** sa file sans la
détruire — son `onBack` rappelle `LoadQueue()` sur le contrôleur de file, qui doit donc être
**encore vivant**. Un montage qui *remplace* le locataire courant tuerait ce rappel, et le lot
livrerait une régression fonctionnelle en croyant corriger un défaut d'agencement.

⛔ **Et cette méthode NE TOUCHE PAS `MountedTenantGameObject` / `MountedTenantType`.** Ces deux
champs signifient « quel écran l'onglet courant a monté » ; les écraser ferait dire au shell qu'il
est sur `ExceptionDetailController` alors que l'onglet actif est Accueil — et **6 assertions
existantes** d'`AppShellPlayModeTests` lisent `MountedTenantType`. *Un champ dont le sens change
sans que son nom change est une dette qu'on paie au test suivant.*

### 2.2 `AppShell` — implémente le contrat, **et fusionne les deux exemplaires du corps de montage**

1. `public class AppShell : MonoBehaviour, IShellSessionSink, IShellNavigator`.
2. Extraire le corps commun en **une** méthode privée
   `private T ConstruireLocataire<T>(out GameObject host) where T : MonoBehaviour, IShellTenant`
   portant les 4 gestes de §1.6, et la faire appeler par **les trois** sites :
   `MountTenant<T>` (qui, en plus, enregistre les champs de locataire courant),
   `EnterDistrict` (qui perd sa copie verbatim), et `MonterLocataireEnSurimpression<T>`.
   ⇒ **un seul corps de montage, trois appelants** — au lieu de deux exemplaires et d'un troisième
   qui allait naître.
3. S'enregistrer / se retirer :
   - `EnsureInitialized()` → `ShellNavigatorLocator` trouve le shell par balayage (comme
     `ShellSessionSinkLocator`), donc **aucun registre à tenir** : il suffit qu'`AppShell`
     implémente l'interface. *Un localisateur par balayage n'a pas d'état à désynchroniser — c'est
     précisément pourquoi le précédent maison est écrit ainsi.*

### 2.3 Les deux sites d'appel

`DashboardController.OpenNav` et `ExceptionQueueController.OpenDetail` demandent le navigateur ; s'il
existe, ils montent par lui ; **sinon** ils gardent **exactement** le corps d'aujourd'hui.

```csharp
IShellNavigator nav = ShellNavigatorLocator.Find();
if (nav != null) { /* nav.MonterLocataireEnSurimpression<T>() */ }
else             { /* corps d'aujourd'hui, inchangé */ }
```

⛔ **Le repli n'est PAS une échappatoire, et sa légitimité est bornée par écrit.** `IShellTenant.cs:24-28`
l'autorise **hors shell** — et c'est le régime de **tous** les tests PlayMode existants qui montent un
contrôleur seul (`AppShellPlayModeTests`, `ExceptionQueuePlayModeTests`, …). La falsifiable F0.4-a
ci-dessous mesure que **sous un shell, ce repli n'est jamais emprunté**. *La branche existe pour un
monde où il n'y a pas de barres ; ce lot prouve qu'elle est morte dans le monde où il y en a.*

---

## 3. Les falsifiables

### F0.4-a — **sur l'EFFET, pas sur l'appel** : sous un shell, tout locataire vivant est dans `ContentSlot`

**Grandeur mesurée** : la *place dans la hiérarchie* de chaque `IShellTenant` vivant — jamais
« `SetMountParent` a-t-il été appelé ».

> **Pourquoi ce choix et pas l'autre**, `front.md` le dit et il faut l'entendre : une garde sur
> l'**appel** de `SetToken`/`SetMountParent` **resterait VERTE** sur deux locataires dont le corps de
> `SetToken` est vide (`ExceptionDetailController.cs:306`, `DistrictInteriorScreenController.cs:191`).
> *Une garde sur les paramètres d'un dispositif n'est pas une garde sur son effet.*

Déroulé :
1. Charger **la scène de démarrage du build** (le shell de production, pas un `AddComponent` de test
   — même grandeur discriminante que l'item 0.1, et même instrument).
2. Attendre le montage d'Accueil, puis exercer **les gestes de production** : les 5 `OpenNav` du
   Dashboard, puis `OpenDetail` de la file d'exceptions.
3. Énumérer **par balayage des objets vivants** (`FindObjectsByType<MonoBehaviour>().OfType<IShellTenant>()`)
   — **jamais une liste écrite à la main** : un locataire ajouté demain entre dans le compte tout seul.
4. Pour chacun : assertion qu'il est **descendant de `shell.ContentSlot`**.

⛔ **Garde anti-vacuité, obligatoire** : « tous les locataires sont dans `ContentSlot` » est **VRAI à
vide**. La falsifiable exige donc d'abord un **compte ≥ 2** de locataires vivants, et **nomme
lesquels** dans son message. *Un compte nu ne dit pas ce qu'il compte : asserter QUELS, pas seulement
combien.*

⛔ **Contrôle négatif exigé avant de déclarer le lot fini** : réarmer un seul site (rendre à
`OpenDetail` sa racine de scène) et **prouver par un run que F0.4-a rougit**, en collant la sortie.
Une garde qu'on n'a jamais vue rougir est une prose datée avec un `[Test]` devant.

### F0.4-b — le jeton : **le locataire monté par le shell ne signe pas lui-même**

Expérience à **UNE seule variable** — le même type de locataire, monté deux fois, la seule différence
étant la présence du shell :

| monde | montage | attendu |
|---|---|---|
| A | par le shell de la scène du build | `tenant.Token` **non vide** et **égal** à `shell.Token` |
| B | seul, hors shell (repli de `IShellTenant.cs:24-28`) | `tenant.Token` non vide et **≠** celui de A |

⇒ L'assertion qui mord est **`A ≠ B`**. Une égalité `A == shell.Token` seule serait satisfaite par un
monde où le locataire signe lui-même *et tombe sur le même jeton* ; c'est la **différence** entre les
deux mondes qui prouve que la branche de repli n'a pas été prise.

**Locataire à choisir** : un dont le corps de `SetToken` **n'est pas vide** — `ExceptionQueueController`
(`:108`) ou `CityMapController` (`:150`). ⛔ **Jamais** `ExceptionDetailController` ni
`DistrictInteriorScreenController` : leurs corps sont des no-op, la garde y serait verte sans rien
mesurer.

⚠️ **Cette falsifiable a besoin de la stack** (signin réel). Si elle ne peut pas tourner, elle est
`[Ignore]` **avec la raison écrite**, jamais silencieusement absente.

### F0.4-c — le corps de montage est **unique**

Après la fusion de §2.2, `AppShell` ne contient plus qu'un seul endroit qui fait
`AddComponent` + `SetParent(ContentSlot)` + `SetMountParent` + `SetToken`.
**Contrôle exécutable, portée = le seul fichier `Assets/Scripts/Shell/AppShell.cs`** — motif **n°1**,
la forme *invoquée sur le locataire* : **attendu AVANT : 2 · attendu APRÈS : 1**.

⛔ **Ce contrôle a été lancé sur le fichier INTACT d'abord, et il a rougi — sur MOI.** La première
rédaction de ce §3 visait le nom de méthode **nu** et annonçait `2` ; le fichier en rend **3**, parce
que la troisième occurrence vit dans un **commentaire** (`AppShell.cs:25`). Un contrôle qui compte
une mention de prose comme un site d'appel aurait fait croire à un site survivant après la fusion,
et le lot aurait été « corrigé » une fois de trop. Le motif n°1 est donc **qualifié par son
récepteur**, ce qui exclut la prose par construction. **Contrôle positif du motif** : il retrouve
bien les deux sites connus (`:211`, `:375`) — un motif qui rend `0` n'est pas un motif satisfait,
c'est un motif faux.

⇒ *Un dispositif de sécurité neuf est le texte le moins relu du document : il est neuf, il vient de
son auteur, et il a l'air d'être la solution. Celui-ci n'a été attrapé que parce qu'il a été
EXÉCUTÉ avant d'être cru.*

Les comptes se collent au commit ; les motifs se désignent **par index**, jamais par leur littéral.

---

## 4. Ce que ce lot ne fait PAS — et pourquoi

- **Il ne touche pas aux libellés d'onglets** (item 0.2) ni à la porte d'entrée de la carte
  (item 0.3) : les deux dépendent de l'arbitrage user **A**, ouvert.
- **Il ne branche ni ne retire les 6 contrôleurs orphelins** (item 0.5) : leur destination dépend des
  arbitrages **B** et **C**.
- **Il ne supprime pas la branche de repli** des locataires : elle reste le régime légitime hors
  shell, et **tous** les tests PlayMode existants en dépendent. La supprimer ferait rougir la suite
  pour une raison qui n'est pas le sujet.

---

## 5. Deux choses que je n'ai PAS mesurées — dites, pas contournées

1. **Que les 5 branches d'`OpenNav` soient toutes atteignables par un joueur.** J'ai mesuré que le
   *code* les câble ; je n'ai pas remonté chaque bouton jusqu'à un geste de production. Si l'un ne
   l'est pas, F0.4-a le montrera : le locataire correspondant **n'apparaîtra pas** dans le compte, et
   la garde anti-vacuité **nomme** ceux qu'elle a vus.
2. **L'effet de ce lot sur la suite complète.** Le dernier compte consigné (`289/289`) date de
   `c7595e4`, et `fe00b0a` a ensuite changé 511 lignes **sans en consigner aucun** : je ne dispose
   donc d'**aucune ligne de base fiable sur HEAD**. Le run complet de clôture de ce lot en établira
   une — et c'est cette mesure-là, pas la précédente, qui vaudra preuve dans `front.md`.
