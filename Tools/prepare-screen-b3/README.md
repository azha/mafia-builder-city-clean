# ㊲ La réputation (`screen_b3`) — deux fichiers PRÊTS, délibérément hors `Assets/`

## Pourquoi ils sont ici et pas à leur place

Ces deux fichiers sont du code de production fini, qui n'attend qu'un `git mv`. Ils ne sont pas
sous `Assets/` pour **une** raison, et elle n'est pas la prudence :

> Déposer un `.cs` sous `Assets/` déclenche une recompilation dans l'éditeur ouvert sur ce
> worktree. Or **c'est exactement l'événement que la première sonde du brief doit OBSERVER**
> (« provoque une recompilation dans B, regarde la console de A »). Le provoquer avant de pouvoir
> l'observer ne rend pas la sonde plus difficile : il la rend **impossible**, parce qu'on aura
> consommé l'événement sans instrument. Une sonde qu'on exécute sans regarder n'est pas une sonde
> ratée, c'est une sonde qu'on a détruite.

Unity ne compile que ce qui vit sous `Assets/` (mesuré : 143 `.cs` sous `Assets/`, 0 sous `Tools/`
avant ceux-ci). Les poser ici est donc inerte — pas un contournement, un stationnement.

## Le geste, quand le canal MCP est rétabli

1. Rétablir le canal (geste user : `/mcp`) — `.mcp.json` pointe déjà sur **8081**, le serveur
   project-scoped de ce worktree. Le 8080 du brief était celui de l'autre session, et il est mort.
2. **Passer les deux sondes**, dans cet ordre, en les regardant :
   - recompilation provoquée ici ⇒ la console de l'éditeur A ne doit rien montrer ;
   - réimport provoqué ici ⇒ idem.
   L'état actuel de la question est écrit dans `Tools/reputation-mesures-prealables.md` §1-bis :
   la sonde 2 est déjà **répondue par la configuration** (aucun Cache Server ni Accelerator nulle
   part — les 11 clés des préférences globales ont été énumérées, pas filtrées), et la sonde 1 a
   une **observation concordante mais non concluante** (2 h 35 d'écart entre les mtimes des deux
   `Library/ScriptAssemblies`). Rien ne contredit l'isolation ; rien ne l'a encore établie.
3. Alors seulement :

       git mv Tools/prepare-screen-b3/ReputationDtos.cs   Assets/Scripts/Operational/Reputation/
       git mv Tools/prepare-screen-b3/ReputationClient.cs Assets/Scripts/Operational/Reputation/

   (le répertoire `Reputation/` est à créer ; il suivra le patron des voisins de
   `Assets/Scripts/Operational/` — `Lieutenant/`, `Laundering/`, `Autonomy/`…)

## Ce que ces fichiers portent, et pourquoi ils sont stables

Ils dérivent du **contrat back mesuré** — les corps réels de
`Tools/juge-donnees/reputation/maquette-2026-08-30/mesures/`, pas l'interface TypeScript lue
seule, et pas la maquette. **Aucun des trois écarts arbitrés le 2026-08-30 ne les invalide** :
un DTO décrit ce que le serveur envoie, pas ce que l'écran en fait.

Ils portent en commentaire, à leur point d'usage, les cinq pièges que le juge-données a mesurés —
pour qu'aucun site d'appel futur ne les repaie :

- **la tenue est celle du LIEUTENANT**, jamais du joueur (PK `lieutenant_id` ; canon : posture et
  tenue sur le même portrait) — tranché, la maquette v2 ne dessine plus qu'un portrait ;
- **la polarité** : actif = `buttoned/rolled/visible/clean`, neutre = `open/down/hidden/dirty`.
  C'est `UniformTellsDto.ActifEstAbsorbe(Pose)` qui la porte, **en fonction nommée** et nulle part
  ailleurs — une correspondance dispersée en littéraux n'a aucune forme exécutable à asserter, et
  la garde écrite ensuite ne verrait pas sa cible ;
- **`restraint` est OMISE** sans `counterparty_id`, et un `!= null` ne suffirait pas à le
  détecter : `ReputationSurfaceDto.RestraintEstPresente` teste la **présence d'une valeur**, pas
  l'absence d'une clé — correct quel que soit le comportement de `JsonUtility`, qui n'a pas pu
  être mesuré faute d'éditeur ;
- **`marginalia` n'est pas des noms** : `["settlement-1",…]`, étiquettes positionnelles, et ce
  sont les ≤3 derniers règlements **avec cette contrepartie**, pas un palmarès ;
- **`counterparty_id` non-UUID ⇒ 500**, pas 404 (défaut back consigné S13-i) : le client ne passe
  ce paramètre que s'il tient un identifiant **venant du serveur**.

## Vérification statique — ce qui a pu être contrôlé SANS compiler

Six fichiers écrits sans jamais pouvoir compiler, c'est six fichiers dont on ne sait rien. Une
passe de contrôle a donc été faite sur tout ce qui est vérifiable par lecture — chaque erreur
trouvée ici est un cycle de compilation économisé plus tard :

| ce qui a été contrôlé | méthode | résultat |
|---|---|---|
| les 16 membres `DesignTokens.Current.*` appelés | extraits du code, confrontés aux champs déclarés | **16/16 existent**, 0 manquant |
| `ProceduralUI.RadialDisc` · `RoundedRectOutline` · `RoundedRectMask` | signatures relues à la source | conformes aux appels |
| `AuthClient.SignUp(callsign, password, onOk, onErr)` | signature relue à la source | conforme |
| références d'assembly | `Operational.asmdef` → `ShellContracts`, `Theme`, `Unity.TextMeshPro`, `UnityEngine.UI` ; `CityMap.PlayMode.Tests.asmdef` → `Operational` | **pas de cycle**, tout est joignable |
| namespaces | `EchelleMaquette`, `ShellChrome`, `IShellTenant`, `ProceduralUI` sont tous dans `MafiaCleanCity.Shell` ; le `using` est présent | conforme |
| aucune géométrie depuis `Screen.*` | balayage des 5 fichiers de code, **avec contrôle positif** (le motif `EchelleMaquette` sort 6 et 3 sur les deux fichiers de géométrie) | **0**, et le zéro est un vrai zéro |

**Un seul symbole manque volontairement** : `EchelleMaquette.LargeurEcransBrennar6`, fourni par
`PATCH-EchelleMaquette.md`. Si le patch n'est pas appliqué, ça ne compile pas — c'est le
comportement voulu.

⚠️ Ce que cette passe NE dit PAS : que le code compile. Elle contrôle les symboles externes et les
frontières d'assembly, pas la syntaxe ni les conversions de type. **La première compilation reste
due**, et elle rendra probablement des erreurs — c'est normal et c'est prévu.

## Ce qu'ils ne portent PAS, volontairement

Le contrôleur d'écran et sa mise en page. Deux avertissements de construction s'y appliquent, tous
deux hérités et non négociables : **aucune géométrie cuite depuis `Screen.*`** ni depuis un `rect`
lu une seule fois au montage (l'échelle passe par `EchelleMaquette`, et la maquette v6 doit
**déclarer sa propre largeur** — 300 px CSS mesurés, à ne pas confondre avec le `300f` homonyme
d'`ecrans-brennar.html`, qui est une autre maquette) ; et **`Canvas.scaleFactor` lu la frame de la
création rend 1,0**, une valeur plausible et fausse — il faut un `yield return null`.

La suite PlayMode devra porter `session/close` juste après `signin`, jamais supposer le régime
hérité.
