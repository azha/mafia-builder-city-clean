# ㉚ « Les deux gestes » — revue ⊥, tour 2 (vérification des correctifs de `revue-1.md`)

Même relecteur ⊥, même régime : **statique**, Unity non lancé, porte non prise, **aucun fichier du lot modifié** —
ce document est le seul écrit. Worktree `/home/erutheone/project/mafia-unity-C1`, branche
`lot/client1-gestes-30-2026-11-11` @d886738a, changements non commités.

Chaque correctif a été vérifié **dans les fichiers actuels**, jamais dans `preuves.txt` (un journal n'est pas une
mesure).

## VERDICT : APPROVED

0 BLOCKING, 0 MAJOR. 6 MINOR, tous consignés, aucun ne commande un tour de plus.

---

## 1. Les correctifs, vérifiés à la source

### B1 — « Remaniement » retiré : **FAIT**, et sans orphelin

`ChaineDApproGestes.cs:84-88` : `Reconstruction` ne porte plus que `MINIMAL_REROUTE` et `FULL_GEOMETRIC_RESET`
(structurel). Le motif f2 est recopié au-dessus (`:82-83`) avec son ancre
(`poser-chaine-gestes.py:56-58,166-167`).

**Aucune clé orpheline** — comparaison d'ensembles, pas un coup d'œil :

```
DetteDatee (lot) = 20   ClesNeuves = 20
dans ClesNeuves mais PAS en dette : []
en dette mais PAS dans ClesNeuves : []
```

`appro.mode.remaniement` / `appro.mode_sous.remaniement` ont disparu des deux listes. Les 3 occurrences
résiduelles de « Remaniement » dans le code sont légitimes et vérifiées une par une :
`ChaineDApproDtos.cs:149` (le domaine que le **back** accepte sur `{mode}` — exact), et
`ChaineDApproGestesPlayModeTests.cs:909/911` (assertions **négatives** : aucun bouton, aucun mot).
`ValeurAttendue.Cle` (`Assets/Tests/PlayMode/ValeurAttendue.cs:19-23`) lit `I18nCatalog` **sans passer par
`Libelle`** : la clé citée en négatif ne compte donc aucun repli et ne pollue pas la garde D4.

**Le « corps de coûts à 3 lignes » tient.** `GestesB1` (`:897-919`) injecte
`ToutServi("12300").Servi("MODERATE_RESTRUCTURE","99900")` et mesure : exactement
`{Mode_MINIMAL_REROUTE, Mode_FULL_GEOMETRIC_RESET}`, `BoutonDuMode("MODERATE_RESTRUCTURE") == null`, ni le montant
`999,00 €` ni le mot dans `Textes`. Côté production rien à prouver : `ConstruireUnMode` est appelé en boucle sur
`spec.Modes` (`ChaineDApproFeuille.cs:99-103`), une ligne de coût sans mode n'est jamais lue — **ignorée par
construction, pas par une exception**. Contrôle positif présent : l'entretien garde ses TROIS modes (`:913-918`),
donc le compte n'a pas été écrasé partout.

Registres à jour : `DESIGN.md:74`, `implementation-notes.md:24`, et TD-1046 corrigé en « CINQ modes (3 + 2) »
(`dettes-client1.md:73`).

### M1 — ancrage au-dessus du chrome : **FAIT**, et géométriquement juste

`ChaineDApproFeuille.cs:76-80` :
```csharp
rt.anchorMin = Vector2.zero; rt.anchorMax = new Vector2(1f, 0f); rt.pivot = new Vector2(0.5f, 0f);
rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
rt.anchoredPosition = new Vector2(0f, ShellChrome.BottomInsetPx);   // pivot en bas : le BAS du panneau est à `BottomInsetPx`
```
L'axe X reste **étiré** (`anchorMin.x = 0`, `anchorMax.x = 1`, `anchoredPosition.x = 0` ⇒ `offsetMin.x =
offsetMax.x = 0`) : la pleine largeur n'est pas perdue. Pivot `y = 0` + `ContentSizeFitter` verticale : le panneau
pousse **vers le haut** depuis `BottomInsetPx`. Le voile reste plein écran (`Etirer`, `:65`) — il barre tout le
clic, ce qui est bien ce qu'on voulait garder.

La garde `GestesM1` (`:924-949`) **mesure** la géométrie plutôt que le réglage : `Bas()` convertit les coins du
panneau dans l'espace de la racine et compare à l'inset publié (120 px). Contrôle positif réel (`:944-946` :
`anchoredPosition = Vector2.zero` ⇒ le bas repasse sous la barre ⇒ rouge), et le voile est vérifié à 0.
`ShellChrome.PublierInsets(0f, 0f)` est rendu **deux fois** — `finally` du test (`:948`) **et** `TearDown`
(`:57`) : un global statique n'est pas laissé au voisin (TD-576). Bien.

### M2 — jeton dépensé localement : **FAIT**, sans cap fabriqué

- `JetonDeStructure.cs:60` : `public static void DepenseLocalement() => Utilises++;` — `Connu` et
  `PlafondAtteint` **ne bougent pas**. Aucun chiffre affirmé que personne n'a mesuré.
- `ChaineDApproScreenController.cs:1090-1095` : `AppliquerLeSucces(mode)` ferme la feuille **puis** dépense
  seulement si `mode.Structurel`. Appelé depuis le vrai chemin (`GesteCoroutine:1085`) **et** depuis le crochet
  `ReussirPourTest:1129` : le test n'exerce pas une porte dérobée, c'est la même méthode.
- `ChaineDApproGestes.cs:95` : `MarqueDuJeton => JetonDisponible && JetonDeStructure.Utilises == 0`, et
  `ChaineDApproFeuille.cs:220` conditionne la marque dessus. **`Actionnable` est inchangé** (`:101-105`) : le mode
  reste allumé, le back arbitre par son 409 servi. C'est exactement la forme recommandée.
- `GestesM2` (`:954-999`) mesure les trois faits séparément : `Utilises == 1`, `Connu` **faux**,
  `PlafondAtteint` **faux** ; la marque disparaît des **deux** gestes ; les modes restent `interactable`. Deux
  contrôles positifs (un mode non structurel ne dépense rien ; `OublierPourTest` ⇒ la marque revient) et la preuve
  que `Publier` du shell **reprend la main** (`:994-998`).
- TD-1080 ouverte aux **trois** registres : `dettes-client1.md:77` (entrée complète, avec la demande BACK-1
  « servir `cap`, ou une route de relecture du budget hors `session/open` »), `DESIGN.md:71`,
  `implementation-notes.md:10`.

### Régressions cherchées sur `DepenseLocalement` — aucune trouvée

Recensement **exhaustif** des lecteurs des trois statiques (grep sur tout `Assets`) :

| lecteur | lit | touché par `DepenseLocalement` ? |
|---|---|---|
| `DemolitionScreenController.cs:372-374` | `Connu`, `PlafondAtteint` | **non** |
| `DelegationScreenController.cs:360-362` | `Connu`, `PlafondAtteint` | **non** |
| `ChaineDApproGestes.cs:91` (`JetonDisponible`) | `Connu`, `PlafondAtteint` | **non** |
| `ChaineDApproGestes.cs:95` (`MarqueDuJeton`) | `Utilises` | oui — c'est l'effet voulu |
| `EtatPublieParLeShell.cs:49/58` | les trois | oui (voir ci-dessous) |

- **Démolition et Délégation ne lisent jamais `Utilises`** : leur rendu est strictement inchangé. Le seul écrit
  était déjà le leur (`Publier`).
- **`EtatPublieParLeShell.Vierge`** (`:47-51`) exige `Utilises == 0`, et `MafiaCI.cs:635-640` le vérifie à la
  sortie de **chaque** classe. La classe de tests ㉚ remet le jeton en `SetUp` **et** en `TearDown`
  (`:41`, `:55`) : rien ne fuit chez le voisin.
- **`EtatDuShellPlayModeTests.S1`** ne peut pas rougir : `StatiquesMutables` énumère des **`FieldInfo`**
  (`EtatDuShellPlayModeTests.cs:39-45`), pas des méthodes — `DepenseLocalement` n'ajoute aucun champ, et
  `Utilises` est déjà dans `Couverts` (`EtatPublieParLeShell.cs:25`).
- **Tests partagés qui comptent sur le jeton** : `DelegationScreenPlayModeTests.cs:404-559` n'assertent que
  `PlafondAtteint` — intacts.
- **Rétro-compatibilité du crochet** : `ReussirPourTest(relu, mode = null)` — un appelant à un seul argument ne
  dépense rien. Grep : les deux seuls appelants sont dans `GestesM2`.

### m1, m4, m5 — faits ; m2, m3, m6 — tenus comme trous déclarés

- **m1** (`:804-813`) : le contrôle du mode éteint asserte désormais la prémisse (`interactable == false`) **et**
  deux témoins qu'aucune requête n'est partie (`DernierCodeErreur` et `DerniereErreur` inchangés), plus la feuille
  restée ouverte. Le « passe pour la mauvaise raison » est fermé.
- **m5** (`:1069-1088`) : `try { … } finally { gesteEnCours = false; }` — un `yield return` dans un `try/finally`
  sans `catch` est légal en C#, et le drapeau retombe par un seul chemin (refus comme succès).
- **m2** : seuils G-S2 **inchangés**, trou laissé avec son commentaire de péremption
  (`implementation-notes.md:27`). C'est la bonne décision : la garde échouerait en ROUGE franc, jamais en faux
  vert. À ré-ancrer sur la mesure au premier run, et la mesure à coller dans `preuves.txt`.
- **m3** : contrôle S1 gardé tel quel, noté (`implementation-notes.md:28`).
- **m6** : consigné classe C, rattaché à TD-1043 (`implementation-notes.md:29`) — ni correctif ni tour de juge,
  conforme au ruling du 07/10.

### m4 — `maintaining` au premier niveau : **MESURÉ**, pas raisonné

C'était le correctif le plus risqué : `CleBooleenneAuPremierNiveau` (`ChaineDApproClient.cs:44-63`) repose sur
`new Regex("\\G\\s*:\\s*(true|false)\\b")` suivi de `ValeurBooleenne.Match(objet, fin + 1)`. **Si `\G`
n'ancrait pas à `startat`**, le moteur chercherait en avant et `{"note":"maintaining","bypassed":true}` passerait
pour servi — un faux positif silencieux. Je n'ai pas voulu l'affirmer : j'ai recompilé la méthode **à l'identique**
sous le Mono de l'éditeur (binaire autonome, aucun projet Unity ouvert, aucune porte) :

```
$ mcs -out:VerifCle.exe VerifCle.cs && mono VerifCle.exe
OK    attendu=True  obtenu=True   clé 1er niveau, true            {"leg_id":"x","maintaining":true}
OK    attendu=True  obtenu=True   clé 1er niveau, false (SERVIE)  {"leg_id":"x","maintaining":false}
OK    attendu=True  obtenu=True   espaces autour du :             {"leg_id":"x","maintaining" : true }
OK    attendu=False obtenu=False  absente                         {"leg_id":"x"}
OK    attendu=False obtenu=False  autre nom                       {"leg_id":"x","maintenance":true}
OK    attendu=False obtenu=False  m4 : clé d'un SOUS-OBJET        {"sub":{"maintaining":true},"bypassed":false}
OK    attendu=False obtenu=False  m4 : le mot comme VALEUR…       {"note":"maintaining","bypassed":true}
OK    attendu=False obtenu=False  valeur chaîne, pas booléenne    {"maintaining":"true"}
OK    attendu=False obtenu=False  clé dans un tableau d'objets    {"a":[{"maintaining":true}],"b":1}
OK    attendu=False obtenu=False  nom dans une chaîne échappée    {"note":"a\"maintaining\"b","c":true}
OK    attendu=True  obtenu=True   première clé                    {"maintaining":true,"x":1}
OK    attendu=False obtenu=False  valeur en FIN d'objet           {"note":"maintaining"}
écarts = 0
```

12 cas, **0 écart** : `\G` ancre bien, le sous-objet ne compte pas, le tableau imbriqué non plus, et une valeur
chaîne n'est pas lue comme un booléen. Le harnais vit dans le bac à sable de session, hors du dépôt.

---

## MINOR (consignés, aucun ne retient le gate)

### n1 — `MarqueDuJeton` confond « dépensé localement » et « compté par le serveur »

`ChaineDApproGestes.cs:95` lit `Utilises`, qui est aussi le champ que le shell écrit depuis la valeur servie.
Si une session s'ouvre sur `{used: 1, cap_reached: false}` — possible : le cap est « unlockable to 2 »
(`core-loops-tunables.ts:423-434`) — la marque est **cachée alors que le joueur a bien une décision devant lui**.
Au cap par défaut (1) il n'y a aucune différence visible : le mode est éteint de toute façon. Conservateur, donc
acceptable ; un drapeau local distinct (« j'ai dépensé pendant CETTE session de l'écran ») serait exact. À
mentionner à f2 avec TD-1080.

### n2 — Délégation promeut la dépense locale en valeur « mesurée »

`DelegationScreenController.cs:688`, `:755`, `:798` republient `Publier(JetonDeStructure.Utilises, …)`. Après une
dépense locale d'Appro, ce `Utilises` **fabriqué** passe avec `Connu = true` et devient indiscernable d'une valeur
servie. Portée réelle : `MarqueDuJeton` et la chaîne de diagnostic `EtatPublieParLeShell.Decrire()`. Sans effet
joueur aujourd'hui ; une ligne dans TD-1080 suffit.

### n3 — le `finally` ne couvre pas la destruction de l'objet

Unity n'appelle pas `Dispose()` sur l'itérateur d'une coroutine qu'il abandonne (objet détruit, `StopCoroutine`) :
`finally { gesteEnCours = false; }` (`ChaineDApproScreenController.cs:1088`) ne s'exécute pas dans ce cas. Sans
conséquence — le champ meurt avec l'instance. Le gain réel de m5 est le chemin de sortie unique, et il est acquis.

### n4 — `GestesD1:408` attend maintenant `spec.Modes.Length` : auto-référentiel

Le compte attendu est tiré de l'objet sous test ; si `Modes` redevenait faux, D1 s'y adapterait en silence.
L'anti-tautologie vit désormais **ailleurs** : `GestesB1:912` (`AreEqual(2, …Modes.Length)`) et `GestesW1:880`
(tableau écrit à la main). Correct en l'état — à ne pas affaiblir ces deux-là sans rendre son compte littéral à D1.

### n5 — l'inset est lu à l'ouverture seulement

`ChaineDApproFeuille.cs:80` lit `ShellChrome.BottomInsetPx` dans `Ouvrir()`. Un inset republié **pendant** que la
feuille est ouverte (rotation, changement de zone sûre) n'est pas suivi. Cas rare, visuel, classe C.

### n6 — conflit de canon à notifier, pas à re-trancher

Le lot suit désormais la maquette ratifiée (2 modes) et le documente partout. Mais le brief relayé disait
« 3 modes » : **une ligne à f2** reste due pour que la correction soit ratifiée côté canon, pas seulement côté
code. Ce n'est pas un défaut du lot — c'est une notification à ne pas oublier au commit.

---

## Auto-audit du verdict

J'atteste avoir ouvert et relu, dans leur état actuel : `ChaineDApproGestes.cs`, `ChaineDApproFeuille.cs`,
`ChaineDApproClient.cs`, `ChaineDApproScreenController.cs` (zones gestes + routes + crochets),
`JetonDeStructure.cs` (intégral), `ChaineDApproGestesPlayModeTests.cs` (les 3 tests neufs + S1/D1/R2/TearDown),
`EtatPublieParLeShell.cs`, `EtatDuShellPlayModeTests.cs:38-60`, `ValeurAttendue.cs`,
`DemolitionScreenController.cs:372-374`, `DelegationScreenController.cs:360-362,688-798`,
`DESIGN.md`, `implementation-notes.md`, `dettes-client1.md`. Le diff a été lu via `rtk proxy git diff` (jamais
`cat`/`head`), et le recensement des lecteurs du jeton par `grep -rn` sur **tout** `Assets`.

Deux comptes qui décident ont été **mesurés**, pas estimés :
- l'égalité d'ensembles DetteDatee ↔ `ClesNeuves` (20 = 20, deux différences vides — script collé plus haut) ;
- le comportement de `\G` + `Match(input, startat)` sous le **vrai** moteur Mono (12 cas, 0 écart — sortie collée).

**Ce que ce verdict n'atteste pas** : aucun test n'a été JOUÉ (Unity non lancé, porte non prise), aucune capture,
aucun pixel compté, aucun juge visuel. En particulier **M1 et S2 restent à MESURER au premier créneau** — M1 par
sa garde avec inset publié, S2 par le ré-ancrage de ses seuils. Le typecheck n'a pas été rejoué : il n'est pas
dans ce verdict.

**Aucun fichier du lot n'a été modifié par cette revue.**
