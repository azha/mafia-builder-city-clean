# Les répliques des six cartes d'exception qui s'affichaient en anglais machine — fr et en (proposé, non ratifié)

> Atelier / DA, 2026-09-23. Commande de l'orchestrateur : `exception.<famille>.card.descriptor` pour six familles, écrivain unique
> `exception-producer.service.ts:51` (back, tête `debee641`). **Registre** : celui de la réplique servie `exception.raid.card.descriptor`
> — le lieutenant parle au Don, à la première personne, en langue parlée (« Ils ont retourné le bâtiment cette nuit. J’ai pas de
> consigne pour ça. » / « They turned the building over last night. I’ve got no orders for this. »). ⑨ pose lui-même « Patron — »
> devant la réplique (`11-…` §3.9) : aucune réplique ne le répète. Vouvoiement quand le Don est nommé (`votre`), aucun genre pour
> celui qui parle (aucun participe à accorder), apostrophe `’` en fr comme en en (comme la réplique servie).
> **Statut : proposé, non ratifié.** Vérifié : `python3 Tools/atelier-2026-09-22/verifier-24.py`.

## Les six répliques

| clé | fr | en | la situation (source back) |
|---|---|---|---|
| `exception.lieutenant_cook.card.descriptor` | La chaleur monte autour du labo. J’ai pas de consigne pour ça. | The heat’s climbing around the lab. I’ve got no orders for this. | chaleur du bâtiment assigné ≥ bande, aucune règle (`cook-binding.ts:236`) |
| `exception.lieutenant_distribution.card.descriptor` | La caisse du dealer monte et personne ne la ramasse. Je la laisse comme ça ? | The dealer’s float keeps climbing and nobody’s collecting it. Do I leave it? | caisse du dealer haute, pas collectée, aucune règle de collecte (`distribution-binding.ts:382`) |
| `exception.lieutenant_intelligence.card.descriptor` | Le rival ne fait plus de bruit. Je le surveille quand même, ou j’attends qu’il bouge ? | The rival’s gone quiet. Do I keep watching anyway, or wait till they move? | rival dormant, l'observation tourne peut-être à vide (`intelligence-binding.ts:253`) |
| `exception.lieutenant_logistics.card.descriptor` | La marchandise s’entasse et rien ne part. J’ai pas de consigne pour l’expédier. | The product’s piling up and nothing’s going out. I’ve got no orders to dispatch it. | la marchandise s'entasse à la source, aucune règle d'expédition (`logistics-binding.ts:518`) |
| `exception.lieutenant_muscle.card.descriptor` | Le rival fait le mort. Tant qu’il bouge pas, j’ai personne à aller voir. | The rival’s playing dead. Until they move, I’ve got nobody to go see. | rival dormant, le Gros bras ne peut pas programmer d'assaut (`muscle-binding.ts:285`) |
| `exception.operator_input.card.descriptor` | Il me faut votre avis là-dessus. Je vois pas de bonne façon de s’y prendre. | I need your call on this one. I don’t see a good way to play it. | le lieutenant demande une décision, sans action proposée (`lieutenant-tick.service.ts:379` ; écrivait « operator_input_requested ») |

## Les mots, et pourquoi

- **« la caisse »**, pas « flottant » : le flottant du dealer s'appelle **la caisse** dans la maquette ratifiée (㉟, série 6, cadres 107-112 :
  « La caisse de Oskar — pleine à ras », « RAMASSER LA CAISSE »), dans le client et dans l'option déjà servie
  (`exception.lieutenant_distribution.collect.label` « Collecter la caisse automatiquement »). « flottant » : **0 emploi** dans les trois
  corpus (`mesurer-mot-money-holding.py 72e4202 201c57c1 debee641 flottant caisse`). En en, *float*, le mot de la même option servie.
  « ramasser » est le verbe de ㉟.
- **« la chaleur »**, **« la marchandise »** / *product*, **« expédier »** / *dispatch* : les mots des options déjà servies de ces cartes.
- Chaque réplique prépare les options qui la suivent : ⑨ montre la carte, puis sa main (`keep` / `pause` pour la cuisson, `observe_anyway`
  / `wait` pour le renseignement, `block_when_silent` / `wait` pour le Gros bras) — d'où les deux questions de l'intelligence et de la caisse.
- **Le rival** est un nom masculin : « le », « il » le reprennent en fr (c'est le nom, pas une personne) ; en en, *they* (une organisation).
- **« J’ai pas »**, **« il bouge pas »**, **« Je vois pas »** : la négation parlée de la réplique servie (« J’ai pas de consigne pour ça »),
  gardée pour que les sept répliques aient la même voix.
- Aucun chiffre, aucun genre pour celui qui parle.
