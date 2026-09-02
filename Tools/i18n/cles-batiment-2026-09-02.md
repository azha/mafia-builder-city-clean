# ② — les clés `building.*` que le client demande (item 0.6 / TD-460)

> Généré depuis le code, pas écrit à la main : `49` clés, dérivées des littéraux qui
> passent désormais par `BuildingCardController.Cle(role, litteral)`.
>
> ⛔ **À ajouter en ADDITIF dans `string_table`, avec `en` = le littéral EXACT** (colonne de
> droite, byte-identique). Tant qu'elles n'y sont pas, l'écran affiche le littéral et **ne change
> pas d'un pixel** : `Connait` est testé avant `Traduire`. Rien ne presse, rien ne casse.

## Ce qui n'est PAS là, et pourquoi

⚠️ **Aucune valeur dynamique.** « Dans 30 j », « Raided — seized a moderate haul » et les autres
phrases calculées ne passent pas par une clé : en dériver une fabriquerait une clé par nombre
(`..._dans_30_j`, `..._29_j`, à l'infini). *Une clé nomme une phrase FERMÉE, jamais une phrase
calculée.* Ces textes-là relèvent d'un lot back (une clé + des params), pas d'une dérivation.

★ Et le compte à retenir n'est pas le nombre de clés ci-dessous : ② porte **152 littéraux
visibles** (45 directs + 107 rendus par ses résolveurs). Celles-ci couvrent les vocabulaires
FERMÉS et les libellés de rangée — le reste attend d'être trié entre « fermé » et « calculé ».

| clé | `en` attendu (byte-identique) |
|---|---|
| `building.cover.none` | `None` |
| `building.cover.standard` | `Standard` |
| `building.cover.strong` | `Strong` |
| `building.cover.weak` | `Weak` |
| `building.raid_risk.elevated` | `Elevated` |
| `building.raid_risk.high` | `High` |
| `building.raid_risk.imminent` | `Imminent` |
| `building.raid_risk.low` | `Low` |
| `building.row.alert` | `Alert` |
| `building.row.appointment` | `Appointment` |
| `building.row.capacity` | `Capacity` |
| `building.row.cold_chain` | `Cold chain` |
| `building.row.cover` | `Cover` |
| `building.row.crop` | `Crop` |
| `building.row.entretien` | `Entretien` |
| `building.row.forfeiture` | `Forfeiture` |
| `building.row.grow_stage` | `Grow stage` |
| `building.row.held` | `Held` |
| `building.row.holding_tier` | `Holding tier` |
| `building.row.hub_tier` | `Hub tier` |
| `building.row.husbandry` | `Husbandry` |
| `building.row.lab_tier` | `Lab tier` |
| `building.row.operational` | `Operational` |
| `building.row.payout` | `Payout` |
| `building.row.purity` | `Purity` |
| `building.row.raid_risk` | `Raid risk` |
| `building.row.roster` | `Roster` |
| `building.row.setup` | `Setup` |
| `building.row.structure` | `Structure` |
| `building.row.substance` | `Substance` |
| `building.row.temperature` | `Temperature` |
| `building.row.vehicles` | `Vehicles` |
| `building.row.yield` | `Yield` |
| `building.setup.in_setup` | `In setup` |
| `building.setup.not_converted` | `Not converted` |
| `building.setup.operational` | `Operational` |
| `building.structural.damaged` | `Damaged` |
| `building.structural.intact` | `Intact` |
| `building.structural.repairing` | `Repairing` |
| `building.substance.` | `—` |
| `building.substance.ash` | `Ash` |
| `building.substance.brindle` | `Brindle` |
| `building.substance.crick` | `Crick` |
| `building.substance.hush` | `Hush` |
| `building.temperature.hot` | `Hot` |
| `building.temperature.optimal_cold` | `Optimal (cold)` |
| `building.temperature.warming` | `Warming` |
| `building.yield.earning` | `Earning` |
| `building.yield.idle` | `Idle` |
