# `Tools/nouvel-ecran.py` + `Tools/planche-comparaison.py` — notes d'implémentation

Worktree dédié `mafia-scaffold` (`tools/nouvel-ecran`, base `main`), créé pour ne pas toucher au
worktree principal (`~/project/mafia-builder-city-clean`, tenu par une autre session) ni à
`pilote-B`/`pilote-F`. Aucun run Unity, aucun test PlayMode, aucun batchmode — Python et lecture
seule, comme demandé.

## Ce qui a été COMPTÉ (justifie chaque template)

- **13/13** fichiers `*Client.cs` sur `main` répètent l'idiome enveloppe/payload/data
  (`payload?.data` / `payload.data`) ; **8/13** posent `Idempotency-Key` (mutations seulement).
  → justifie le patron de `<Pascal>Client.cs`.
- **0/16** contrôleurs ne partagent de base commune pour `NouveauUI`/`AjouterFond`/`NouveauTexte`
  — chacun les redéclare `private static`/`private`. → le squelette REPRODUIT cette duplication
  plutôt que de la centraliser (une base partagée serait une décision d'architecture hors mandat
  d'un outil de scaffold).
- Namespace `Operational` : **split ~50/50** — `BuildingCard`/`Dashboard`/`Laundering` (11
  fichiers) en `MafiaCleanCity.Operational` (plat) contre `Autonomy`/`Exceptions`/`Lieutenant`
  (10 fichiers) en `.Operational.<Sous-namespace>`. La référence ㊲ (`ReputationScreenController`,
  seul écran construit ET jugé par les deux juges) est en PLAT → tranché en sa faveur (voir
  Deviations).
- Namespace des tests : **8/8** fichiers `*PlayModeTests.cs` vérifiés utilisent
  `MafiaCleanCity.Operational.Tests`, sans exception, quel que soit le sous-namespace du
  contrôleur testé. → aucune ambiguïté ici.
- `AppShell.cs` : `enum Tab { Empire, Org, Pipeline, More }` — `Tab.More` est actuellement une
  « destination vide » (mesuré, pas recopié : le générateur PARSE `AppShell.cs` à l'exécution
  pour lire l'enum et les montages actuels de chaque tab, jamais une liste en dur qui pourrait
  mentir si l'enum bouge).
- `RequireComponent(CanvasRenderer)` documenté à 3 endroits (`CityMapController`,
  `TopBarController`, `VerticalGradientImage`) — le piège (`AddComponent<T>()` n'honore pas la
  `RequireComponent` d'une classe de base à l'exécution) est repris tel quel dans
  `AjouterImage()`.

## Deviations (imprévu non bloquant, option conservatrice, consignées ici)

1. **Dérivation du nom Pascal — depuis `--nom`, pas depuis `--id`.** La commande de la tâche
   contredit sa propre convention de test : l'exemple concret (`--nom "La réputation"` →
   `ReputationClient.cs` etc.) prouve une dérivation depuis `--nom` ; l'instruction de nettoyage
   du test (« préfixe `screen_zz`/`Zz` ») suggère une dérivation depuis le suffixe de `--id`. Les
   deux ne peuvent pas être vraies en même temps pour `--nom Test` (qui donnerait `Test*`, pas
   `Zz*`). Choix conservateur : suivre l'exemple concret et exécuté (`Reputation` depuis
   `"La réputation"`), donc `--nom Test` → fichiers `Test*.cs`. Le nettoyage du test a été fait
   par **chemins exacts** (jamais un `git clean` par préfixe hasardeux), donc la divergence ne
   pouvait de toute façon rien casser — et j'ai vérifié après coup qu'aucune trace `screen_zz` ni
   `Zz`-quoi que ce soit ne subsistait.
2. **Namespace `MafiaCleanCity.Operational` (plat), jamais `.Operational.<Pascal>`.** Tranché en
   faveur de la référence ㊲ (voir ci-dessus) — bénéfice secondaire mesuré : `AppShell.cs` a déjà
   `using MafiaCleanCity.Operational;` en tête (ligne 8), donc aucune ligne `using` à ajouter au
   fichier d'une autre session.
3. **`EchelleMaquette.cs` n'est jamais édité.** Le squelette référence
   `EchelleMaquette.LargeurEcransBrennar` (300, la maquette la plus fréquente des 3 connues sur
   `main`) avec une ancre `// MÉTIER ICI` invitant à vérifier/ajouter une constante `Largeur<Nom>`
   si la maquette réelle diffère. Éditer un fichier partagé depuis un outil de scaffold par écran
   aurait été hors mandat.
4. **Noms de méthode Client/DTO mécaniques** (`Verb + PascalCase(segments de chemin, "v1"/"me"
   retirés)`), pas des noms choisis à la main comme `DeclareHouseRule`. Sans lecture du back, la
   sémantique n'est pas déductible — chaque méthode générée porte un commentaire MÉTIER ICI
   invitant à renommer si un nom plus parlant existe (patron cité : `DeclareHouseRule` de ㊲).
5. **`DELETE` n'emporte jamais de corps** dans le générateur (seuls POST/PUT/PATCH). Convention
   REST standard ; aucune route DELETE dans les exemples fournis pour la contredire. À revoir si
   un domaine futur en a besoin.
6. **`front.md`/`AppShell.cs` : jamais écrits, seulement imprimés** — conforme à la consigne
   explicite (« NE modifie PAS AppShell.cs automatiquement »), étendu par prudence à `front.md`
   pour la même raison (checklist vivante tenue par l'orchestrateur, pas par cet outil). La ligne
   d'état imprimée dit explicitement que `[x] maquetté` est **assumé, non vérifié** par l'outil
   (aucune lecture de pixels du fichier `--maquette` autre que son existence en argument).
7. **`Tools/juge-visuel/<id>/dossier.md`** est un dossier `r1` par défaut (pas de détection de
   round précédent) — cet outil scaffold un ÉCRAN, pas un round de revue ; un round `r2+` se crée
   à la main comme toujours, la gabarit-mesure copiée reste identique.

## Ce que je n'ai PAS pu factoriser, et pourquoi

- **La géométrie réelle de l'écran** (`BuildLayout()` au-delà du fond) : impossible sans lire la
  maquette pixel par pixel — c'est tout le travail qu'un juge visuel puis une session humaine
  font APRÈS ce scaffold, jamais avant.
- **Les champs des DTO** : impossible sans mesurer le corps RÉEL de chaque route (juge-données),
  exactement la règle que ㊲ documente en tête de ses propres DTO. Un DTO généré avec des champs
  DEVINÉS serait pire qu'un DTO vide — il aurait l'air fini.
- **Le résolveur domaine→apparence réel** (`Severity`-like) : le domaine (quelles valeurs, quelle
  cardinalité) n'est connu qu'après lecture du contrôleur back — le squelette pose la FORME
  (switch exhaustif + `default: throw`, jamais un `default` silencieux) avec un enum `Inconnu`
  placeholder, pas le contenu.
- **Le test de parcours (couche 2 de la doctrine 4-couches)** : signup → `session/open` → la
  route, avec ses préconditions spécifiques (ex. ㊲ a besoin d'un lieutenant du kit de départ) ne
  se génère pas génériquement — chaque écran a sa propre précondition métier. Le squelette de test
  ne couvre que la garde structurelle (CanvasRenderer/MaskableGraphic) et la capture, toutes deux
  génériques à tout écran `IShellTenant`.

## Vérification exécutée (sortie réelle, voir aussi le rapport de session)

- `python3 -m py_compile` sur les deux scripts : OK.
- Comptage manuel de `{`/`}` et `(`/`)` sur les 4 fichiers `.cs` générés par l'invocation test :
  tous équilibrés (0 de différence).
- `nouvel-ecran.py --id screen_zz --nom Test --tab More --routes "GET /v1/me/test"` : 9 fichiers
  créés, comptes `MÉTIER ICI` = 2/3/9/4 (Client/Dtos/Controller/Tests), bloc AppShell + ligne
  front.md imprimés.
- Re-lancer la MÊME commande : refus propre (`exit=1`), liste des 9 fichiers déjà présents,
  « Rien n'a été écrit. » — rien de plus n'est apparu dans `git status`.
- `--tab Nope` et route `WOMBAT ...` : refus propre, `exit=1`, aucun fichier écrit.
- `planche-comparaison.py` sur deux PNG de même taille (`v4-14.png`/`v4-15.png`, 900×1752) et sur
  une paire maquette/capture réelle de tailles différentes (1680×3240 vs 1080×2400 redimensionnée
  à 1680 de large) : planche à 3 panneaux + bandeau titre écrite, écart moyen et bbox imprimés ;
  la zone hors recouvrement peinte en noir et signalée par un avertissement plutôt que mesurée en
  silence. Image relue visuellement (miniature) : 3 panneaux corrects, bbox rouge posée sur la
  zone de plus grand écart.
