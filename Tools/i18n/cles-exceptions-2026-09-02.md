# ⑨ — les clés `exceptions.*` (item 0.6) + UNE demande de clé ICU

> Généré depuis le code : `16` clés dérivées des littéraux passant par `Libelle.De`.
> **À ajouter en ADDITIF, `en` = le littéral EXACT.** Tant qu'elles manquent, l'écran ne change pas.

## ⚠️ Une clé qu'il faut ÉCRIRE, pas dériver : la ligne d'ambiance

L'écran assemble « **Trois attendent vos ordres — la file est calme** » à partir d'un COMPTE.

⛔ On ne peut pas la dériver : keyer ses fragments (« attendent vos ordres ») produit des
phrases intraduisibles — l'ordre des mots change d'une langue à l'autre, et le pluriel ne se
découpe pas ainsi. Keyer la phrase entière est impossible puisqu'elle varie avec le nombre.

⇒ **Sa forme juste est une clé ICU à pluriel avec le compte en paramètre**, exactement comme
`game.lieutenant.assignment.summary` que le bundle sert déjà :

```
exceptions.file.ambiance = {count, plural,
    =0 {Personne ne fait la queue — le comptoir est vide}
    one {Un seul attend vos ordres — la file est calme}
    other {# attendent vos ordres — la file est calme}}
```
★ Le résolveur client sait déjà rendre ce motif (`plural`, `#`, accolades imbriquées) : c'est
la seule des trois familles non converties qui appelle un lot back plutôt qu'un refus.

## Ce qui ne deviendra JAMAIS une clé, et pourquoi

· les **glyphes** `[!!!]` `[!!.]` `[!..]` `[?]` — des FORMES, pas de la langue. Elles portent la
  gravité pour qui ne distingue pas les couleurs (a11y) et sont identiques partout ;
· les **valeurs de domaine** des résolveurs de bande — une clé qui traduirait une valeur servant
  à la logique.

| clé | `en` attendu (byte-identique) |
|---|---|
| `exceptions.bloc.a_relire_a_tete_reposee` | `à relire à tête reposée` |
| `exceptions.bloc.escalades_archivees` | `Escalades archivées` |
| `exceptions.bloc.file_indisponible_verifier_la_pile` | `File indisponible — vérifier la pile` |
| `exceptions.bloc.il_attend_une_consigne` | `il attend une consigne` |
| `exceptions.bloc.ouvrir` | `Ouvrir` |
| `exceptions.categorie.conflit` | `CONFLIT` |
| `exceptions.categorie.diplomatie` | `DIPLOMATIE` |
| `exceptions.categorie.renseignement` | `RENSEIGNEMENT` |
| `exceptions.categorie.reputation` | `REPUTATION` |
| `exceptions.locuteur.la_ville` | `La ville` |
| `exceptions.nombre.cinq` | `Cinq` |
| `exceptions.nombre.deux` | `Deux` |
| `exceptions.nombre.plusieurs` | `Plusieurs` |
| `exceptions.nombre.quatre` | `Quatre` |
| `exceptions.nombre.six` | `Six` |
| `exceptions.nombre.trois` | `Trois` |
