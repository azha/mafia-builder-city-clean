<!-- généré : python3 Tools/atelier-2026-09-22/inventaire-donnees-servies.py … (voir 25-donnees-servies-4-11-12-40-7.md) -->
## Données servies — `coffre` (`PipelineOverviewController.cs`)

> Corps réels : back servi `03cf564c` (main `11559fff`), 2026-09-22T13:23:16, compte `operational_demo@example.test`. Code : `Assets/Scripts/Operational/Laundering/PipelineOverviewController.cs` à `c06b0600` (arbre `mafia-unity-F`). « lu » = lu par le code, pas dessiné.
> **11 champs lus · 30 non lus** (chaque non-lu est une question « passé à côté ? »).

### `GET /v1/city/district/{districtId}/interior` — 29 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `district` | district-1 | **non — passé à côté ?** |
| `district_id` | 1 | **non — passé à côté ?** |
| `profile` | tidewater | **non — passé à côté ?** |
| `name_canonical` | Tidewater-1 | **non — passé à côté ?** |
| `name` | Les Bassins | oui |
| `bank_side` | north | **non — passé à côté ?** |
| `grid.width` | 10 | **non — passé à côté ?** |
| `grid.height` | 4 | **non — passé à côté ?** |
| `blocks[].block_id` | 1 · 2 · 3 · 4 · 5 · 6 | **non — passé à côté ?** |
| `blocks[].x` | 0 · 1 · 2 · 3 · 4 · 5 | **non — passé à côté ?** |
| `blocks[].y` | 0 · 1 · 2 · 3 | **non — passé à côté ?** |
| `day_phase` | DAY | **non — passé à côté ?** |
| `buildings[].building` | b03705b3-e2a4-40e7-aa40-10876c24704a | **non — passé à côté ?** |
| `buildings[].block_id` | 1 | **non — passé à côté ?** |
| `buildings[].name_i18n.key` | game.fiction.building.name | **non — passé à côté ?** |
| `buildings[].name_i18n.params.enseigne` | Messagerie Sarre | **non — passé à côté ?** |
| `buildings[].name_i18n.params.district` | Les Bassins | **non — passé à côté ?** |
| `buildings[].name_i18n.params.block` | 1 | **non — passé à côté ?** |
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

### `GET /v1/operational/laundering` — 5 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `nodes[].node` | 54ad5527-1ae4-493f-a36b-bc1809456bd3 · 4c52b333-3a70-4c0c-837e-20d4177aa930 · e120edbe-0b4f-483d-9ee3-0109f9bc6e5b · ad5617ba-143b-4ee6-a426-dc772a09095d | oui |
| `nodes[].stage_index` | 1 · 2 · 3 · 4 | **non — passé à côté ?** |
| `nodes[].cleanliness_band` | PARTIAL · MOSTLY_CLEAN · CLEAN | oui |
| `nodes[].terminal` | false · true | oui |
| `nodes[].has_cash` | false · true | oui |

### `GET /v1/operational/laundering/{nodeId}` — 3 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `node` | 54ad5527-1ae4-493f-a36b-bc1809456bd3 | oui |
| `cleanliness_band` | DIRTY | oui |
| `deviation_active` | false | **non — passé à côté ?** |

### `GET /v1/operational/laundering/{nodeId}/pipeline` — 4 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `stages[].node` | 54ad5527-1ae4-493f-a36b-bc1809456bd3 · 4c52b333-3a70-4c0c-837e-20d4177aa930 · e120edbe-0b4f-483d-9ee3-0109f9bc6e5b · ad5617ba-143b-4ee6-a426-dc772a09095d | oui |
| `stages[].cleanliness_band` | PARTIAL · MOSTLY_CLEAN · CLEAN | oui |
| `stages[].terminal` | false · true | oui |
| `stages[].has_cash` | false · true | oui |
