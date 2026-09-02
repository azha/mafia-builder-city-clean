# Famille (lieutenants) — les clés `famille.*` (item 0.6)

> `45` clés générées depuis le code, sur les **10 résolveurs `*Label`**.
> **`en` = le littéral EXACT**, en additif.

## ⛔ Les `*Glyph` ne sont PAS convertis, et ne doivent pas l'être

`ArchetypeGlyph` rend `[C]` `[S]` `[B]`… ; `BandLabel` rend `[####] Full`. Les crochets sont
des FORMES : ils portent l'information pour qui ne distingue pas les couleurs (a11y) et sont
identiques dans toutes les langues. Le dépôt sépare déjà `*Label` (ce qui se lit) de `*Glyph`
(ce qui se voit) — la conversion suit cette séparation au lieu d'en inventer une.

★ C'est la même règle que sur ⑨ : un glyphe n'est pas de la langue. Ici elle était déjà écrite
dans les NOMS DES MÉTHODES, il suffisait de la lire.

⚠️ Vérifié avant de convertir : aucun résultat de `*Label` ne sert à une comparaison ni ne part
dans une requête — ils ne font qu'alimenter des fabriques de texte. Sans ce contrôle, keyer un
`Label` utilisé comme valeur aurait produit la panne différée de ⑩ (`method` traduit).

| clé | `en` attendu (byte-identique) |
|---|---|
| `famille.archetype.bookkeeper` | `Bookkeeper` |
| `famille.archetype.cook` | `Cook` |
| `famille.archetype.distribution` | `Distribution` |
| `famille.archetype.laundering` | `Laundering` |
| `famille.archetype.logistics` | `Logistics` |
| `famille.archetype.security` | `Security` |
| `famille.archetype.unknown` | `Unknown` |
| `famille.band.depleted` | `[....] Depleted` |
| `famille.band.full` | `[####] Full` |
| `famille.band.low` | `[##..] Low` |
| `famille.band.nominal` | `[###.] Nominal` |
| `famille.band.unknown` | `[?] Unknown` |
| `famille.category.bookkeeping_audit` | `Bookkeeping audit` |
| `famille.category.cross_category_incident` | `Cross-category incident` |
| `famille.category.distribution_dispatch` | `Distribution dispatch` |
| `famille.category.laundering_flow` | `Laundering flow` |
| `famille.category.logistics_routing` | `Logistics routing` |
| `famille.category.production_ops` | `Production ops` |
| `famille.category.security_response` | `Security response` |
| `famille.category.unknown_category` | `Unknown category` |
| `famille.disruption.long_settling` | `Long settling` |
| `famille.disruption.medium_settling` | `Medium settling` |
| `famille.disruption.short_settling` | `Short settling` |
| `famille.disruption.very_long_settling` | `Very long settling` |
| `famille.efficiencybonus.no_yield_bonus` | `No yield bonus` |
| `famille.efficiencybonus.peak_yield_bonus` | `Peak yield bonus` |
| `famille.efficiencybonus.small_yield_bonus` | `Small yield bonus` |
| `famille.efficiencybonus.solid_yield_bonus` | `Solid yield bonus` |
| `famille.grantedrole.advisory` | `Advisory` |
| `famille.grantedrole.cohort_overseer` | `Cohort overseer` |
| `famille.grantedrole.delegated_owner` | `Delegated owner` |
| `famille.grantedrole.executor` | `Executor` |
| `famille.mode.delegated` | `Delegated` |
| `famille.mode.tasked` | `Tasked` |
| `famille.opstate.active` | `Active` |
| `famille.opstate.idle` | `Idle` |
| `famille.opstate.paused` | `Paused` |
| `famille.opstate.settling_in` | `Settling in` |
| `famille.revisioncost.cheap_to_re_script` | `Cheap to re-script` |
| `famille.revisioncost.costly_to_re_script` | `Costly to re-script` |
| `famille.revisioncost.pricey_to_re_script` | `Pricey to re-script` |
| `famille.revisioncost.very_costly_to_re_script` | `Very costly to re-script` |
| `famille.rulecount.a_few_rules` | `A few rules` |
| `famille.rulecount.many_rules` | `Many rules` |
| `famille.rulecount.no_rules` | `No rules` |
