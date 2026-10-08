# Deux clés `famille.*` que le client demande et qu'aucun back n'a servies — fr et en (proposé, non ratifié)

> Atelier / DA, 2026-09-23. Mesure de l'orchestrateur : back contre la liste client `c06b0600`. Sites lus dans l'arbre `mafia-unity-F`
> à `e9db74eb`. Aucune maquette ratifiée ne porte ces mots (0 occurrence de « Nom » ni de « Mode inconnu » dans le texte des séries 1, 4
> et 6) : les deux sont **proposés, non ratifiés**. Vérifié : clé = `Libelle.De(domaine, rôle, littéral)` recopié (slug), et non servie.

| clé | fr | en | où, et dans quel état |
|---|---|---|---|
| `famille.ecran.nom` | Nom | Name | le titre de la PREMIÈRE ligne d'état du panneau de détail d'un lieutenant (⑥ / ⑦), `LieutenantScreenController.cs:929` — `AddStatusRow("nom", "Nom", …)` ; la valeur est le nom servi (`name`), « — » s'il manque. Le client pose aujourd'hui le littéral, faute de clé servie (commentaire `:921-924`) : il pourra passer par `Lib("Nom")` |
| `famille.mode.mode_inconnu` | Mode inconnu | Unknown mode | le repli de `FamilleLabels.Mode` (`FamilleLabels.cs:113-120`) quand `mode` n'est ni `delegated` ni `tasked` ; le client affiche aujourd'hui la valeur BRUTE en casse de titre (commentaire `:113-119`) |

- « Mode inconnu » suit la forme des replis déjà servis de la même famille : `famille.category.categorie_inconnue` « Catégorie inconnue » /
  « Unknown category », `famille.archetype.inconnu` « Inconnu » / « Unknown ». (La règle d'état vide de TD-644 — « un tiret n'a pas de
  langue » — vaut pour une valeur ABSENTE ; ici la valeur est présente mais hors domaine, et la famille a déjà choisi de la nommer.)
- « Nom » / « Name » : le titre de ligne, comme ses voisins servis (`famille.ecran.archetype` « Archétype », `famille.ecran.anciennete`
  « Ancienneté »).
