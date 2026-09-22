# ③ La carte d'exception `random_world.coupling_discovery.card` — texte FR et EN

Atelier / DA, 2026-09-22. Clé émise par le back (`random-world-exception-producer.service.ts:43`), absente des deux bundles. À transmettre à f7 pour `string_table.ts`.

## Ce que la carte est (mesuré dans le back, `gate/cumul-2026-09-22` à `67e10e77`)

- Une carte d'exception **au niveau du joueur** (`lieutenant_id: null`), non modale, non enseignable, une seule en attente à la fois (dedup S14). Le client la fait parler par **« La ville »** (`ExceptionQueueController.QuiParle` : sans lieutenant, le locuteur est la ville).
- Doctrine du design (§3.6 / §6.1, R2.2) : une **note causale tournée vers l'arrière** — elle nomme l'existence du couplage (quelque chose dans un quartier, puis un glissement dans un quartier adjacent), **jamais** la probabilité, la condition, la magnitude, ni la paire technique. La clé n'a **aucun paramètre** (`CORPUS-SOURCE-v3.json:2428`, `params: []`) : le texte ne peut donc nommer ni les quartiers ni les systèmes. Il doit rester vrai pour les deux paires (réserve qui sature → coins disputés à côté ; bruit nocturne → attention de la police à côté).
- Ses deux issues existent déjà en FR : « Prendre acte du couplage » / « Escalader pour relecture » (`exception.random_world.*`, 4 clés). Le texte de la carte doit s'enchaîner avec « Prendre acte du couplage ».

## La maquette qui commande

- **⑨ cadre 12 « Exceptions — l'ardoise : le suivant s'avance »** : la carte de la ville y est dessinée `La ville | · grave · urgente | La chaleur est haute — vos opérations sont sous pression.` — une phrase, un tiret, un constat puis sa conséquence, sans guillemets (les guillemets sont réservés à la parole d'un lieutenant, cadres 9/10/13).
- **⑩ cadre 10** : le détail rend la même réplique en tête de carte, puis les issues.

## Le texte

| clé | FR | EN |
|---|---|---|
| `random_world.coupling_discovery.card` | Un quartier a bougé, et le quartier d'à côté a suivi — ces deux-là tiennent ensemble, maintenant vous le savez. | One district moved, and the district next door followed — those two hold together, and now you know it. |

- « quartier » est le mot de la carte (cadre 22 : « deux rives, dix-huit quartiers ») ; l'EN garde `district`, le nom propre du canon.
- Même forme que la carte du cadre 12 : un constat (le primaire puis le secondaire, dans l'ordre du temps), un tiret, ce que ça change pour le joueur (« maintenant vous le savez » — c'est l'overlay des couplages connus, §6.1, qui « grandit au fil de la campagne »).
- Aucun chiffre, aucun nom de système, aucun nom de quartier : tenable quelle que soit la paire.

## Ce que ce texte remplace

`docs/content/i18n-staging/PROPOSITIONS-non-ratifiees.{fr,en}.json:21` portent un brouillon plus long (« Deux choses que vous teniez pour indépendantes… ») : deux phrases, « district » en FR, et l'aveu « vous teniez pour indépendantes » que le joueur n'a jamais formulé. Le texte ci-dessus le ratifie en le remplaçant.

## ⚠️ Deux faits de câblage, pour f7 et pour le client — le texte ne suffit pas à lui seul

1. **Le producteur n'estampille pas la référence i18n.** `random-world-exception-producer.service.ts:89-97` écrit la clé dans `event_descriptor` (la colonne de prose) et ne pose **pas** `event_descriptor_i18n` ; la projection est un passe-plat (`exceptions.projection.service.ts:295`, `row.event_descriptor_i18n ?? null`). Or le client ne résout que `event_descriptor_i18n.key` (`ExceptionQueueController.cs:765-769`, `TexteServeur`). ⇒ Tant que le producteur ne pose pas `event_descriptor_i18n: { key, params: {} }`, la clé s'affichera **brute même une fois au bundle**. C'est le lot de f7, pas une décision d'atelier.
2. **Les guillemets.** `ExceptionBandes.Replique` (`ExceptionBandes.cs:171-177`) met « … » autour de tout texte qui contient une espace. Le cadre 12 dessine la carte de la ville **sans** guillemets. Une fois le texte servi, la carte de la ville sera entre guillemets, contrairement à la maquette — à trancher côté client (les guillemets sont la parole d'un lieutenant ; la ville constate).
