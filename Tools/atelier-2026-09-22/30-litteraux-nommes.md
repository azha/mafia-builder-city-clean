# Les 107 valeurs nommées rendues en littéral — l'EN, le FR des 5 littéraux anglais, les heurts (proposé, non ratifié)

> Atelier / DA, 2026-09-23. Source : la table de CLIENT-2, `Tools/juge-donnees/i18n-litteraux-nommes-2026-09-23.tsv` (`14dffe6d`, 107 sites).
> Sortie, **même format + une colonne « signal atelier »** : `30-litteraux-nommes-2026-09-23.tsv` (générée par `generer-30-litteraux-nommes.py`).
> Vérifié : `verifier-30.py` — mêmes 107 sites dans le même ordre, clé = `<domaine>.<rôle>.` + slug(fr), aucun `'` dans le fr, un en par ligne,
> et les 2 clés déjà servies (`distribution.bloc.tient`, `appro.bloc.il_n_y_a_plus_rien`) servies avec nos mots — 0 défaut.
> Le fr existant n'est **pas** réécrit (commande f2) : seul le `’` est appliqué (D10) ; les heurts sont SIGNALÉS (32 lignes).

## 1. Les 5 littéraux anglais de l'éditeur de règles — leur FR (l'en reste le littéral actuel)

| site | valeur | clé | fr | en |
|---|---|---|---|---|
| `LieutenantScreenController.cs:3554` | EXECUTE_DEFAULT (bouton) | `famille.regle.comme_d_habitude` | Comme d’habitude | Run default |
| `LieutenantScreenController.cs:3554` | PAUSE_OPS (bouton) | `famille.regle.suspendre` | Suspendre | Pause ops |
| `RuleModel.cs:401` | same_building | `famille.regle.dans_mon_batiment` | dans mon bâtiment | in my building |
| `RuleModel.cs:430` | EXECUTE_DEFAULT (phrase) | `famille.regle.faire_comme_d_habitude` | faire comme d’habitude | run the default behavior |
| `RuleModel.cs:431` | PAUSE_OPS (phrase) | `famille.regle.suspendre_les_operations` | suspendre les opérations | pause operations |

« suspendre les opérations » est le mot déjà servi des options de carte (`exception.lieutenant_cook.pause.label` « Suspendre les opérations… »).
« dans mon bâtiment » : la règle est la parole du lieutenant (« je » : son bâtiment).

## 2. Les trois domaines proposés

- **`vente.bloc`** (Selling) — **validé** : le nom de l'écran (« La vente », ㉟) ; aucun domaine `vente` n'existe au back (0 clé), aucune collision.
- **`commissariat.bloc`** (Precinct) — **à renommer `police.bloc`** : l'écran s'appelle « La police » (⑮ ⑰, dossier `police/`) ; « commissariat »
  est l'OBJET qu'il montre (« six commissariats », ⑰). Les autres domaines portent le nom de l'écran (`appro`, `conflit`, `loi`…). Aucune clé
  `police.*` au back : pas de collision.
- **`famille.regle`** (éditeur de règles) — **validé** : l'éditeur vit dans l'écran Famille (`famille.ecran.*` porte déjà ses boutons).

## 3. Les heurts avec un mot ratifié ou servi (le fr n'est pas réécrit — à trancher par f2)

- **Les noms de type de bâtiment de Distribution et de Démolition ne sont pas ceux du catalogue** (`building.type.*`, servis) : Distribution dit
  « l’entrepôt de distribution » (servi : Relais), « la boutique » (Commerce-écran), « la ferme » (Serre), « la planque-coffre » (Planque) ;
  Démolition dit « Une façade », « Une presse » (servi : Imprimerie), « Un point de distribution » (Relais), « Un bureau » (Agence ; « Bureau »
  = ⑫). ⚠️ Trois heurts graves : Distribution nomme `stash` « la planque » quand « Planque » est servi pour `cash_safehouse` (deux types, un mot) ;
  « le comptoir » (`dealer_spot_front`) est déjà le comptoir de ⑨ ; Démolition nomme `money_holding` « Une société-écran » contre d4
  (« la banque », servi « Banque »). C'est le « un mot par type » ouvert depuis `22-…` §3.4 — ces deux résolveurs en font une TROISIÈME et
  une QUATRIÈME famille.
- **Genre présumé** : l'ancienneté (« Acclimaté », « Aguerri », « Ancien », « Enraciné ») s'accorde au masculin avec LE LIEUTENANT (règle :
  aucun genre) — sans accord : l'accorder avec « Ancienneté » (« établie », « solide »…), ou des noms. Même accord pour le dealer (« INACTIF »,
  « ABSENT », « COMPROMIS ») et le coursier (« arrivé », « prêt ») : à dire si la règle vaut pour eux.
- **Un nombre inventé** : « trois ponts » pour `multiple` — la donnée ne dit pas trois ; « plusieurs ponts ».
- **Les mots des maquettes** : ㉟ dit « au travail », « au repos », « grillé(s) » (le client : AU POSTE, INACTIF, COMPROMIS) ; ⑰ dit
  « EN CHASSE », « SOUPÇON », « EN VEILLE » (le client : « Ils vous cherchent », « Ils se méfient », « Ils regardent »).
- **« Matin »** : la série 6 écrit « Matin » dans la barre de 114 cadres ; aucune phase servie ne se dit ainsi (DAWN « Aube », DAY « Plein
  jour »). Maquette en retard, ou mot manquant.
- **Mon propre heurt** : `26-…` (⑦) proposait « nouveau venu » pour FRESH ; le client écrit déjà « Récent » — je m'aligne sur « Récent ».
- Mineur : « une serre » (Démolition) est seul en minuscule de sa série ; « le labo » nomme `lab` et `specialized_lab`.
