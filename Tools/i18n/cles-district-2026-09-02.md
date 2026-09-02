# District (intérieur) — les clés `district.*` (item 0.6)

> `13` types de bâtiment, générés depuis le code. **`en` = le littéral EXACT**.

## ⚠️ Ce que cet écran a appris sur les ASSEMBLAGES

`CityMap.asmdef` ne référençait PAS `I18n`. Le contrôle de compilation sans éditeur — même
corrigé pour balayer tout `Assets/Scripts` — compile en un seul bloc et **ne voit aucune
frontière d'assemblage** : il rendait vert sur du code qu'Unity aurait refusé.
⇒ Un contrôle systématique a été passé sur tous les `.asmdef` : tout assemblage qui utilise
  `MafiaCleanCity.I18n` le référence désormais (Operational ✅, CityMap ✅).
★ C'est la deuxième fois que cet angle mort mord sur ce chantier. La parade n'est pas de s'en
  souvenir : c'est de relancer ce contrôle à chaque écran d'un dossier nouveau.

| clé | `en` attendu (byte-identique) |
|---|---|
| `district.type_batiment.cash_safehouse` | `Cash safehouse` |
| `district.type_batiment.dealer_spot_front` | `Dealer-spot front` |
| `district.type_batiment.distribution_hub` | `Distribution hub` |
| `district.type_batiment.front_shop` | `Front shop` |
| `district.type_batiment.grow_house` | `Grow house` |
| `district.type_batiment.lab` | `Lab` |
| `district.type_batiment.money_holding` | `Money holding` |
| `district.type_batiment.office` | `Office` |
| `district.type_batiment.press_house` | `Press house` |
| `district.type_batiment.refinery` | `Refinery` |
| `district.type_batiment.specialized_lab` | `Specialized lab` |
| `district.type_batiment.stash` | `Stash` |
| `district.type_batiment.vacant_lot` | `Vacant lot` |
