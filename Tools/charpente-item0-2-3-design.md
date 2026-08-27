# Items 0.2 + 0.3 (+0.3-bis) — le dock ratifié, et l'Empire EST la carte

> Périmètre : les items **0.2**, **0.3** et **0.3-bis** de `front.md`. Rien d'autre.
> **Décisions A et B TRANCHÉES par ruling user du 2026-08-25** — voir `front.md` §4.
> Design écrit depuis la session principale ; **la revue ⊥ est déléguée à un `reviewer` frais**.

---

## 1. Le ruling, et ce qu'il change VRAIMENT

**`Empire · Famille · Filière · Plus`** — quatre bulles, aucune bulle « Carte », **parce que l'onglet
Empire EST la carte**. L'Accueil cesse d'être un onglet et devient l'ouverture de session, en
surimpression — **branchée par ce lot au round 3** (voir §5) ; seuls les 4 panneaux de l'écran ④
restent l'item 0.5.

⇒ **Le cycle fermé de l'item 0.3 ne se corrige pas : il cesse d'exister.** Mesuré avant :
`ActivateTab(Tab.City)` n'avait qu'un appelant de production, `ExitToCityMap()`, câblé uniquement
depuis l'intérieur d'un district ; et `EnterDistrict` n'était abonné qu'au montage de l'onglet City.
**City ← seulement depuis un district ← seulement depuis City.** Le jour où l'onglet par défaut EST
la carte, la première branche du cycle est ouverte par le démarrage lui-même.

### ⚠️ Une hypothèse que je prends, et qui se retourne en UNE ligne

**Empire monte la CARTE (les 18 districts), pas l'intérieur d'un district.** Ce n'est pas un détail :
c'est ce qu'on voit en lançant le jeu.

**Ce qui me décide** — la doctrine du dock, citée par le client lui-même pour justifier l'absence de
bouton Carte, dit « *on est déjà sur la carte* ». Elle n'a de sens que si la destination par défaut
**est** la carte. Et l'alternative exigerait d'**inventer** sur quel district on atterrit : aucune
donnée ne le fournit, et *jamais d'entité inventée pour scoper quoi que ce soit*.

⇒ Le parcours du jalon 1 devient : `démarrage → Empire (la carte) → tap d'un district → l'intérieur
→ tap d'un bâtiment → la fiche → COLLECTER → l'action de tête ramène à la carte` (round 11, revue ⊥
MINEUR m1 — PARAPHRASÉ, jamais cité : le libellé rendu est une flèche nue, `TopBarController.
LabelFor`, aucun texte à deux mots depuis round 8).
⚠️ Le §4 de `front.md` écrit « l'Empire (le district) », ce qui se lit dans l'autre sens — **c'est une
recommandation, pas un ruling**, et je la note comme telle. **Bascule = une ligne** (le type monté par
`Tab.Empire`). Si l'user veut l'autre lecture, il faudra d'abord dire **quel** district.

---

## 2. Ce qui est mesuré, sur `af9893b` (dernier commit des fichiers cités)

### 2.1 Le dock est gouverné par **TROIS** listes parallèles, pas deux

| # | ancre (sur `af9893b`, AVANT ce lot) | rôle |
|---|---|---|
| 1 | `AppShell.cs:717-720` | `AddTabButton` ×4 — construction initiale |
| 2 | `AppShell.cs:938-941` | `AddTabButton` ×4 — reconstruction (changement de résolution) |
| 3 | `AppShell.cs:956` | `Tab[] order` — l'ordre que lit `RefreshTabButtonVisuals` |

Le fichier **le dit lui-même** à la 3ᵉ : *« Deux listes qui doivent rester parallèles sont une
dette »* — et il en compte **trois**. La 3ᵉ porte en plus un avertissement explicite : un membre
laissé là **décalerait tous les indices** et poserait l'indicateur d'actif sur la mauvaise bulle.

⚠️ **CORRIGÉ round 9 (revue ⊥, MAJEUR 1)** — les 3 ancres ci-dessus décrivent le fichier `af9893b`,
**AVANT le round 1 de ce lot** (5 membres dans `Tab`, 3 listes séparées). Round 1 les a REMPLACÉES
par `DockRatifie` (§3.1) — elles ne sont donc PAS de simples ancres « décalées de +12 » par
l'insertion round 7 : le contenu qu'elles visaient a été RÉÉCRIT, pas déplacé, et un `+12` naïf
pointe sur du texte SANS RAPPORT (vérifié : `AppShell.cs:729-732`/`:950-953`/`:968` au tip
`255998a` parlent respectivement du dégradé du dock et de la couleur du libellé — aucun rapport
avec les 3 listes ci-dessus). **L'équivalent ACTUEL** — cité par SYMBOLE, pas par numéro de ligne
(round 11 — revue ⊥, BLOQUANT 1 : la citation par numéro « au tip 255998a » ci-dessus s'est révélée
fausse au tip suivant DANS LE MÊME COMMIT qui l'écrivait ; un nom de méthode ne glisse pas) : la
déclaration du champ `DockRatifie` est lue par ses DEUX consommateurs `AppShell.BuildTabBar()` et
`AppShell.RebatirChromePourResolutionCourante()`, et par `AppShell.RefreshTabButtonVisuals()` — une
seule source, trois lecteurs, exactement ce que §3.1 ci-dessous prescrit.

⇒ **Renommer les libellés à trois endroits est exactement la faute que ce lot doit ne pas commettre.**

### 2.2 L'enum et le montage

`AppShell.cs:49` — `public enum Tab { Home, City, Org, Pipeline, More }` (**5** membres).
`:165-173` — `Home → DashboardController` · `City → CityMapController` **+ abonnement
`OnEnterDistrict`** · `Org → LieutenantScreenController` · `Pipeline → LaunderingController` ·
`More → destination vide NOMMÉE` (assertée par sa valeur, jamais par l'absence d'un composant).

### 2.3 Le démarrage active Home

`AcquireSessionThenActivateHome` active `Tab.Home` sur **ses deux branches** (succès et repli
d'échec), chacune gardée par le sentinel `CurrentTab == (Tab)(-1)` — une garde posée exprès contre
la course « le joueur a déjà touché un autre onglet pendant les 2-4 allers-retours réseau ».
⛔ **Cette garde ne doit pas être perdue en changeant l'onglet par défaut** : elle a été payée deux
fois (verdict ⊥ HUD v3.1, motif 6/6).

---

## 3. Le geste

### 3.1 UNE seule liste ordonnée, et les trois sites la lisent

```csharp
// L'ORDRE du dock, défini UNE fois. Les trois sites qui en dépendaient — les deux constructions
// et l'ordre de rafraîchissement — le LISENT désormais au lieu de le recopier.
private static readonly (Tab onglet, string libelle)[] DockRatifie =
{
    (Tab.Empire,   "Empire"),
    (Tab.Org,      "Famille"),
    (Tab.Pipeline, "Filière"),   // « Marché » au jalon 4 — pas avant que screen_b1 existe
    (Tab.More,     "Plus"),
};
```

⇒ **3 listes → 1.** C'est ce qui rend la falsifiable de 0.2 impossible à contourner par dérive : la
garde et la construction lisent **la même source**.
⚠️ Une garde qui lirait `DockRatifie` **et** l'asserterait serait une **tautologie**. La falsifiable
lit donc **les boutons RÉELLEMENT construits dans la scène du build**, et compare leur ensemble à la
constante. *Deux grandeurs différentes, sinon on teste le test.*

### 3.2 `Tab.Home` → `Tab.Empire`, et Empire EST l'ancienne branche City

- `Tab.City` et `Tab.Home` fusionnent en **`Tab.Empire`**, qui monte `CityMapController` **avec son
  abonnement `OnEnterDistrict`** — la branche City existante, déplacée, **pas réécrite**.
- `DashboardController` **n'est plus monté par aucun ONGLET** — ⚠️ **et au round 1 ce lot s'arrêtait
  là, ce qui était un défaut** : il devenait alors le seul appelant manquant de 4 écrans, qui
  passaient d'atteignables à injoignables. La ligne qui suivait ici promettait « un déféré honnête,
  **avec son détecteur** : l'item 0.5 le reprend » — **le détecteur n'existait pas** : un plan de
  reprise n'est pas un détecteur, et l'item 0.5 ne l'énumérait même pas.
  ⇒ **Round 3** : le shell le monte **en surimpression** après l'acquisition de session (décision B,
  ratifiée ; mécanisme `MonterLocataireEnSurimpression<T>()` livré par l'item 0.4), sur les deux
  branches, sous le même sentinel de course.
- `AcquireSessionThenActivateHome` active **`Tab.Empire`** sur ses deux branches, **sentinel
  `(Tab)(-1)` conservé à l'identique**.
- `ExitToCityMap()` → `ActivateTab(Tab.Empire)`. La destination visée par l'action de tête du
  bandeau reste juste.
  ⚠️ **CORRIGÉ round 9 (revue ⊥, MAJEUR 2)** — cette ligne attribuait à cette action de tête un
  libellé à deux mots ; PARAPHRASÉ, jamais cité. Round 8 a depuis réduit son libellé RENDU à une
  flèche nue (`TopBarController.LabelFor`) — la destination, elle, n'a pas changé.

### 3.3 — 0.3-bis — le commentaire daté

`AppShell.cs:711` (sur `af9893b`, AVANT ce lot) porte encore l'énoncé qui affirme que la destination
reste atteignable. **Faux à la mesure quand il a été écrit ; vrai à nouveau après ce lot, mais pour
une AUTRE raison.**
⛔ **Le PARAPHRASER, jamais le citer** — citer l'énoncé qu'on retire le réintroduit. Le contrôle va
dans **le même commit** : `grep -cF` **scopé à ce seul fichier**, valeur **attendue AVANT et APRÈS**,
et le jeu complet **exécuté sur le fichier intact d'abord** — un motif qui rend déjà `0` avant
l'édition est un motif **faux**, pas un motif satisfait. Les comptes se collent ; les motifs se
désignent **par index**, jamais par leur littéral.

⚠️ **CORRIGÉ round 9 (revue ⊥, MAJEUR 1)** — `:711` décrit `af9893b`, PAS le tip `255998a` : ce
n'est PAS une ancre « décalée de +12 » (le round 1 de ce lot a déjà RETIRÉ cet énoncé, bien avant
l'insertion round 7) — un `+12` naïf pointerait sur `AppShell.cs:723`, qui n'a AUCUN rapport
(vérifié : « CE N'EST PLUS UNE BARRE », la ruling sur le dock). **La source de vérité ACTUELLE
n'est plus une ligne d'`AppShell.cs`** — l'énoncé a été retiré — **mais le test qui le prouve** :
`CharpenteMontageLocatairesPlayModeTests.F0_3bis_LEnonceDateSurLaDestinationAtteignable_
NeReapparaitPlusDansAppShell` (motif désigné par INDEX dans son propre fichier, `AppShell.cs`
compté à `0` occurrence au tip `255998a`).

---

## 4. Les falsifiables

### F0.2 — l'ENSEMBLE des libellés du dock, lu dans la scène du build

Depuis **la scène de démarrage du build** (même instrument que 0.1), l'ensemble des libellés des
boutons réellement construits **égale** `{Empire, Famille, Filière, Plus}` — égalité d'**ensembles**,
jamais un compte. *Un compte nu ne dit pas ce qu'il compte : asserter QUELS.*
⛔ Et **les deux chemins de construction** sont couverts : le test force une **reconstruction**
(le chemin `:938`) et ré-asserte. Sans ça, on corrige l'un et l'autre survit.

### F0.3 — l'intérieur de district est ATTEIGNABLE par des gestes de production

Depuis la scène du build, **sans jamais appeler `EnterDistrict` directement** : attendre le montage
de l'onglet par défaut, vérifier que c'est bien la carte, puis déclencher l'**événement de production**
qu'un tap de district émet, et asserter qu'un `DistrictInteriorScreenController` est monté **sous
`ContentSlot`**.
⛔ **Réachabilité, pas rendu** — on ne mesure aucun pixel ici.
⛔ **Garde anti-tautologie** : si le test appelle lui-même `EnterDistrict`, il prouve que la méthode
existe, pas qu'un joueur y arrive. *Une falsifiable qui emprunte un seam en AVAL du gate qu'elle
prétend franchir ne prouve pas le franchissement — elle le suppose.*

### F0.3-bis — le retour ferme la boucle

Depuis l'intérieur, l'action de tête du bandeau ramène à la carte : le locataire monté
redevient `CityMapController` et `CityTabDistrictId` retombe à **−1**, l'état NOMMÉ.
⚠️ **CORRIGÉ round 9 (revue ⊥, MAJEUR 2)** — cette ligne attribuait à cette action de tête un
libellé à deux mots ; PARAPHRASÉ, jamais cité (le libellé RENDU est une flèche nue depuis round 8,
`TopBarController.LabelFor` — la destination décrite ci-dessus n'a pas changé).

### F0.2-c — une seule liste

Population : les sites qui énumèrent l'ordre du dock dans `AppShell.cs`.
**Attendu AVANT : 3 · attendu APRÈS : 1.** Contrôle exécuté sur le fichier intact d'abord.

---

## 5. Ce que ce lot ne fait PAS

- ~~**Il ne branche pas l'ouverture de session**~~ — ⚠️ **AMENDÉ au round 3, et ce document ne
  l'avait pas suivi.** Le périmètre a changé parce qu'une revue ⊥ a mesuré que débrancher l'Accueil
  du dock rendait **4 écrans injoignables** (`BuildingCard`, `ExceptionQueue`, `Autonomy`,
  `ExceptionDetail`) — la forme C du socle, créée par un lot dont la raison d'être est
  l'atteignabilité. ⇒ **Le lot branche donc l'ouverture de session**, minimalement : le shell monte
  `DashboardController` en surimpression après l'acquisition de session, avec le mécanisme déjà
  livré par l'item 0.4. **Seuls les 4 panneaux de l'écran ④ restent l'item 0.5.**
  ★ *Ce paragraphe est resté faux pendant tout un round, dans le document qui DÉFINIT le périmètre
  du gate* — un lecteur venu y chercher ce que le lot livre y lisait l'inverse du livré. C'est la
  classe « texte inchangé dans un document corrigé », appliquée au document de périmètre lui-même.
- **Il ne renomme pas « Filière » en « Marché »** : `screen_b1` n'existe pas, et un bouton qui ment
  est pire qu'un bouton absent.
- **Il ne touche pas au rendu** : aucune capture, aucun pixel. Les items visuels des écrans ① ② ③
  restent leur propre travail.

## 6. Ce qui va rougir, et c'est LÉGITIME

Les tests qui assertent `CurrentTab == Home` après démarrage, ou `Home → DashboardController`,
**vont rougir** : le comportement change par ruling. ⛔ **Ils se METTENT À JOUR, ils ne se relâchent
pas.** Un test rendu vert en retirant l'assertion aurait changé de sujet.
⇒ Pour chacun : dire s'il assertait le **fait** (quel onglet démarre) ou le **mécanisme** (le shell
monte bien un locataire au démarrage). Le second se conserve tel quel en changeant l'onglet attendu ;
le premier est ce que le ruling remplace.
