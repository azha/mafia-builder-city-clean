# 37 — ② la fiche bâtiment : les 83 mots sans clé servie, un par un

> Atelier / DA, 2026-09-23. Commande f2 : la base du prochain lot de CLIENT-2 sur ②. Pas de dessin : ② est déjà dessinée par ①.
> Table : `37-fiche-batiment-mots-2026-09-23.tsv` (mot · cadres · classe · clé · fr · en · note), générée et contrôlée par
> `generer-37-fiche-batiment-mots.py` (back `e6fabd72`). Les mots viennent du balayage `34-…` : cadres série 6 36-47 et 92-94.
> Le script vérifie :
> - que les 83 mots sont tous couverts ;
> - qu'une clé « servie » existe au back ;
> - qu'une clé « proposée » n'y est pas ;
> - que la clé dérive du slug du fr pour les rôles `row`, `bloc`, `replique`, `action` ;
> - ’, D17 et D13.
>
> Résultat : **0 défaut**.

## Le compte

| classe | nombre | ce que c'est |
|---|---|---|
| servie | 6 | une clé servie dit déjà la même chose. Exemples : l'archétype « Cuisinier », la ligne « Rendez-vous », la chaîne du froid, la saisie, la réplique de Nestor. |
| servie · D14 | 11 | la clé existe, mais la maquette RATIFIÉE dit un autre mot : la **valeur** est à aligner, la clé reste (contrat additif). Stades de la serre : Bouture · Croissance · Floraison · Récolte. Santé : Vigoureuse · Correcte · À soigner. Palier de l'atelier : de base · amélioré · au meilleur niveau. Et « L’atelier ». |
| proposée | 42 | clés neuves, sous la forme que le client dérive (`building.row|bloc|replique|action.<slug>`, familles `building.cook_stage.*`, `building.stock.*`), avec fr (D10, D17) et en ; + 6 compléments de famille (valeurs que la maquette ne dessine pas) |
| note | 24 | pas un libellé : 8 noms de plant d'exemple, 3 noms de lieu d'exemple, 2 scalaires en degrés (R2.2), 4 gestes du fourneau sans route, 3 états de scène de la descente, 1 glyphe (D11), 3 gloses « prix » sans donnée |

## Tranché par f2 (23/09)

- **« L’atelier » l’emporte** sur « Taille du labo » (D14) : la valeur de `building.row.taille_du_labo` devient « L’atelier » PARTOUT, dans
  l'écrin d'Ash et sur la fiche du labo. La clé reste.
- **J14 et J11** : ce sont des EXEMPLES de maquette (point 19). Ils ne s'affichent pas tant qu'aucun champ ne les porte. Classés en note, et
  pas en question pour l'user.
- **Les 11 valeurs D14** et les clés proposées partent au back, et la table part à CLIENT-2 pour son lot sur ②.

## À trancher, en attente de la mesure du back (f2)

1. **« pyralin »** : le labo le commande, et le servi le nomme (`appro.bloc.nestor_…`), mais le catalogue `building.precursor.*` ne le porte
   pas (Racine verdoyante, Résine de lull, Lys de verre). Deux cas possibles :
   - c'est un type de précurseur RÉEL du domaine, et il entre au catalogue (D12) ;
   - c'est un mot de réplique, et il doit venir d'un `{param}`.
2. **« Nestor : » en dur** dans `appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas`. Deux cas possibles :
   - un personnage FIXE du canon (un fournisseur ?) : le nom en dur est alors de la fiction légitime ;
   - un `{nom}` manquant, comme « Lt. Hara » (33 §5).

## Ce qui ne devient PAS un libellé

- **Les 8 noms de plant** (KESTREL 4, MARSH BLUE…) : ils viennent du générateur de plantes, aucune donnée ne nomme un plant.
- **Les 4 gestes du fourneau** (Touiller, Baisser le feu, Tirer le produit, Une passe de plus) : aucune route. Le labo ratifié (39-44) a
  les siens, qui existent :
  - « Allumer le feu » : `POST …/lab/:id/cook` ;
  - « Commander du pyralin » : `POST …/precursors/order` ;
  - « Faire sortir la marchandise » : le dispatch.
- **« pure · bon prix » et les deux autres** : la pureté est servie, un prix ne l'est pas (R2.2). Le gain réel est `payout_band`.
- **« 4° », « 12° »** : la bande servie `building.temperature.*` porte le cadran.
