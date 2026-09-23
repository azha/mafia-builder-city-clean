<!-- généré : python3 Tools/atelier-2026-09-22/inventaire-donnees-servies.py … (voir 25-donnees-servies-4-11-12-40-7.md) -->
## Données servies — `famille` (`LieutenantScreenController.cs`)

> Corps réels : back servi `03cf564c` (main `11559fff`), 2026-09-22T13:23:16, compte `operational_demo@example.test`. Code : `Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs` à `c06b0600` (arbre `mafia-unity-F`). « lu » = lu par le code, pas dessiné.
> **31 champs lus · 40 non lus** (chaque non-lu est une question « passé à côté ? »).

### `GET /v1/autonomy-reports` — 13 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `reports[].report_id` | 8247c90d-16e6-44aa-bc09-2ed2b114c0e9 | **non — passé à côté ?** |
| `reports[].lieutenant_id` | 01a0c8d5-8822-7527-bb8e-ce6096ff1ceb | oui |
| `reports[].backlog_age_cycles` | 2 | **non — passé à côté ?** |
| `reports[].issues[].issue_id` | iss_demo_1 · iss_demo_2 | **non — passé à côté ?** |
| `reports[].issues[].category` | PRODUCTION_OPS | oui |
| `reports[].issues[].refused_action` | COOK | **non — passé à côté ?** |
| `reports[].issues[].decided` | null | **non — passé à côté ?** |
| `reports[].issues[].option_a.label_key` | autonomy.cook.now | **non — passé à côté ?** |
| `reports[].issues[].option_a.effect_kind` | COOK_NOW | **non — passé à côté ?** |
| `reports[].issues[].option_a.projected_outcome` | MINIMAL | **non — passé à côté ?** |
| `reports[].issues[].option_b.label_key` | autonomy.cook.refine | **non — passé à côté ?** |
| `reports[].issues[].option_b.effect_kind` | COOK_REFINE | **non — passé à côté ?** |
| `reports[].issues[].option_b.projected_outcome` | TRADEOFF | **non — passé à côté ?** |

### `GET /v1/city/district/{districtId}/interior` — 29 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `district` | district-1 | **non — passé à côté ?** |
| `district_id` | 1 | **non — passé à côté ?** |
| `profile` | tidewater | **non — passé à côté ?** |
| `name_canonical` | Tidewater-1 | **non — passé à côté ?** |
| `name` | Les Bassins | oui |
| `bank_side` | north | **non — passé à côté ?** |
| `grid.width` | 10 | oui |
| `grid.height` | 4 | oui |
| `blocks[].block_id` | 1 · 2 · 3 · 4 · 5 · 6 | **non — passé à côté ?** |
| `blocks[].x` | 0 · 1 · 2 · 3 · 4 · 5 | oui |
| `blocks[].y` | 0 · 1 · 2 · 3 | oui |
| `day_phase` | DAY | **non — passé à côté ?** |
| `buildings[].building` | b03705b3-e2a4-40e7-aa40-10876c24704a | oui |
| `buildings[].block_id` | 1 | **non — passé à côté ?** |
| `buildings[].name_i18n.key` | game.fiction.building.name | **non — passé à côté ?** |
| `buildings[].name_i18n.params.enseigne` | Messagerie Sarre | **non — passé à côté ?** |
| `buildings[].name_i18n.params.district` | Les Bassins | **non — passé à côté ?** |
| `buildings[].name_i18n.params.block` | 1 | oui |
| `buildings[].operational_type` | distribution_hub | **non — passé à côté ?** |
| `buildings[].conversion_band` | OPERATIONAL | **non — passé à côté ?** |
| `buildings[].shell_state` | STANDING | **non — passé à côté ?** |
| `buildings[].condition_band` | SOUND | **non — passé à côté ?** |
| `buildings[].revenue_band` | IDLE | **non — passé à côté ?** |
| `buildings[].revenue_chain` | UNWIRED | **non — passé à côté ?** |
| `buildings[].activity_band` | IDLE | **non — passé à côté ?** |
| `buildings[].relance_band` | NOT_APPLICABLE | **non — passé à côté ?** |
| `buildings[].harvest_band` | NOTHING | **non — passé à côté ?** |
| `buildings[].lapse_phase_bucket` | WITHIN_WINDOW | **non — passé à côté ?** |
| `buildings[].maintenance_in_progress` | false | **non — passé à côté ?** |

### `GET /v1/lieutenants` — 6 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `lieutenants[].lieutenant_id` | 01a0c8d5-8822-7527-bb8e-ce6096ff1ceb · 01a0c8d5-9124-7740-b4f0-8adf83729c20 · 01a0c8d5-912b-735f-9adc-98f74c6754be | oui |
| `lieutenants[].name` | Lt. Quist · Lt. Varne · Lt. Marr | oui |
| `lieutenants[].archetype` | COOK | oui |
| `lieutenants[].op_state_band` | IDLE | oui |
| `lieutenants[].rule_count_band` | NONE | oui |
| `lieutenants[].tenure_bucket` | FRESH | oui |

### `GET /v1/lieutenants/{id}` — 18 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `name` | Lt. Quist | oui |
| `archetype` | COOK | oui |
| `granted_role` | executor | oui |
| `mode` | delegated | oui |
| `op_state_band` | IDLE | oui |
| `rule_count_band` | NONE | oui |
| `tenure_bucket` | FRESH | oui |
| `script_revision_cost` | COST_1 | oui |
| `reassignment_disruption` | DISRUPT_SHORT | oui |
| `role_efficiency_bonus` | BONUS_NONE | oui |
| `reassign_availability` | AVAILABLE | oui |
| `budget_bands.PRODUCTION_OPS` | depleted | oui |
| `drift_phase` | DIRECT_ALIGNED | **non — passé à côté ?** |
| `standing_order.freshness` | NONE | **non — passé à côté ?** |
| `standing_order.promotion_suggested` | false | **non — passé à côté ?** |
| `trust_budget_bucket` | high | **non — passé à côté ?** |
| `flag_frequency_band` | none | **non — passé à côté ?** |
| `script_source` |  | oui |

### `GET /v1/progression` — 5 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `vocabulary_tier` | 1 | oui |
| `progress_to_next` | LOCKED | oui |
| `next_tier` | 2 | **non — passé à côté ?** |
| `tier_label_i18n.key` | game.progression.tier_label | **non — passé à côté ?** |
| `tier_label_i18n.params.tier` | 2 | oui |
