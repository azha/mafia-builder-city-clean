<!-- généré : python3 Tools/atelier-2026-09-22/inventaire-donnees-servies.py … (voir 25-donnees-servies-4-11-12-40-7.md) -->
## Données servies — `accueil` (`DashboardController.cs`)

> Corps réels : back servi `03cf564c` (main `11559fff`), 2026-09-22T13:23:16, compte `operational_demo@example.test`. Code : `Assets/Scripts/Operational/Dashboard/*.cs` à `c06b0600` (arbre `mafia-unity-F`). « lu » = lu par le code, pas dessiné.
> **47 champs lus · 136 non lus** (chaque non-lu est une question « passé à côté ? »).

### `GET /v1/autonomy-reports` — 13 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `reports[].report_id` | 8247c90d-16e6-44aa-bc09-2ed2b114c0e9 | **non — passé à côté ?** |
| `reports[].lieutenant_id` | 01a0c8d5-8822-7527-bb8e-ce6096ff1ceb | **non — passé à côté ?** |
| `reports[].backlog_age_cycles` | 2 | **non — passé à côté ?** |
| `reports[].issues[].issue_id` | iss_demo_1 · iss_demo_2 | **non — passé à côté ?** |
| `reports[].issues[].category` | PRODUCTION_OPS | **non — passé à côté ?** |
| `reports[].issues[].refused_action` | COOK | **non — passé à côté ?** |
| `reports[].issues[].decided` | null | **non — passé à côté ?** |
| `reports[].issues[].option_a.label_key` | autonomy.cook.now | **non — passé à côté ?** |
| `reports[].issues[].option_a.effect_kind` | COOK_NOW | **non — passé à côté ?** |
| `reports[].issues[].option_a.projected_outcome` | MINIMAL | **non — passé à côté ?** |
| `reports[].issues[].option_b.label_key` | autonomy.cook.refine | **non — passé à côté ?** |
| `reports[].issues[].option_b.effect_kind` | COOK_REFINE | **non — passé à côté ?** |
| `reports[].issues[].option_b.projected_outcome` | TRADEOFF | **non — passé à côté ?** |

### `GET /v1/city/district/{districtId}/heat` — 10 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `district` | district-1 | oui |
| `district_bucket` | WARM | **non — passé à côté ?** |
| `citywide_bucket` | BURNING | oui |
| `escalated` | false | oui |
| `buildings[].building` | b03705b3-e2a4-40e7-aa40-10876c24704a | **non — passé à côté ?** |
| `buildings[].heat_bucket` | WARM | **non — passé à côté ?** |
| `buildings[].name_i18n.key` | game.fiction.building.name | **non — passé à côté ?** |
| `buildings[].name_i18n.params.enseigne` | Messagerie Sarre | **non — passé à côté ?** |
| `buildings[].name_i18n.params.district` | Les Bassins | oui |
| `buildings[].name_i18n.params.block` | 1 | **non — passé à côté ?** |

### `GET /v1/city/district/{districtId}/interior` — 29 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `district` | district-1 | oui |
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
| `buildings[].name_i18n.params.district` | Les Bassins | oui |
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

### `GET /v1/economy/wallet` — 3 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `player_id` | 01a01f34-fd4e-7771-83b0-b75efa6e8023 | **non — passé à côté ?** |
| `cash_cents` | 962782000 | **non — passé à côté ?** |
| `wallet_band` | FLUSH | oui |

### `GET /v1/exceptions/queue` — 36 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `exceptions[].exception_id` | e0be040d-5949-48b2-b46c-a936c19df200 · 56eca591-722e-420e-969f-6a39407a77e0 · af8fecb8-dcd1-4a44-96fb-bf4a6d62e47d · fedd425b-d317-46f4-b00b-e58823d9e06c · ced579d8-e824-416b-81fd-ae92ac6fc096 · 65e4b52c-18e2-4d51-a7bc-a171b2b50efe | oui |
| `exceptions[].lieutenant_id` | 01a0c8d5-8822-7527-bb8e-ce6096ff1ceb · null · 01a0c8d5-9124-7740-b4f0-8adf83729c20 | **non — passé à côté ?** |
| `exceptions[].lieutenant.id` | 01a0c8d5-8822-7527-bb8e-ce6096ff1ceb · 01a0c8d5-9124-7740-b4f0-8adf83729c20 | oui |
| `exceptions[].lieutenant.name` | Lt. Quist · Lt. Varne | oui |
| `exceptions[].event_descriptor` | exc_demo_teach_heat · exc_demo_raid_style · Citywide heat is high — your operations  · exc_demo_teach_idle · onboarding.preseed_exception.card · exc_demo_one_time | oui |
| `exceptions[].event_descriptor_i18n` | null | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].id` | teach_heat · let_ride · fix_quiet · pay_off · lay_low · acknowledge | oui |
| `exceptions[].candidate_actions[].label` | Teach: pause on high heat · Let it ride · Repair quietly · Bribe the inspector · Lay low · Acknowledge the pressure | oui |
| `exceptions[].candidate_actions[].add_rule_dsl` | WHEN EVENT(heat,>=,0.5) THEN PAUSE_OPS @ · null · WHEN STATE(cook_idle,==,true) THEN EXECU | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].projected_consequence` | Ops pause whenever heat spikes · The risk stays · Costs cash, sheds no heat · Cheaper but riskier · Free, ops slow down · You note the heat; no automatic action i | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].method` | ONE_TIME · LAY_LOW · ESCALATE | oui |
| `exceptions[].suggested_action.id` | teach_heat · fix_quiet · acknowledge · teach_idle · let_ride | oui |
| `exceptions[].suggested_action.label` | Teach: pause on high heat · Repair quietly · Acknowledge the pressure · Teach: restart when idle · Acknowledge the lab status · Let it ride | oui |
| `exceptions[].suggested_action.add_rule_dsl` | WHEN EVENT(heat,>=,0.5) THEN PAUSE_OPS @ · null · WHEN STATE(cook_idle,==,true) THEN EXECU | **non — passé à côté ?** |
| `exceptions[].suggested_action.projected_consequence` | Ops pause whenever heat spikes · Costs cash, sheds no heat · You note the heat; no automatic action i · The cook restarts when the lab sits idle · You note it; no automatic action is take · The risk stays | **non — passé à côté ?** |
| `exceptions[].suggested_action.method` | ONE_TIME | oui |
| `exceptions[].confidence_band` | confident · likely · tentative | **non — passé à côté ?** |
| `exceptions[].priority_band` | critical · urgent · watching · silent | **non — passé à côté ?** |
| `exceptions[].severity_band` | SEVERE · MODERATE · MILD | oui |
| `exceptions[].resolution_status` | pending | **non — passé à côté ?** |
| `exceptions[].script_complexity_band` | ok | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].effect.type` | REPAIR · BRIBE · LAY_LOW | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].effect.target_building_id` | 7f664c38-22ed-4efe-a65c-95052c163be6 | **non — passé à côté ?** |
| `exceptions[].suggested_action.effect.type` | REPAIR | **non — passé à côté ?** |
| `exceptions[].suggested_action.effect.target_building_id` | 7f664c38-22ed-4efe-a65c-95052c163be6 | **non — passé à côté ?** |
| `exceptions[].lieutenant` | null | **non — passé à côté ?** |
| `exceptions[].event_descriptor_i18n.key` | exception.heat_pressure.card.descriptor · onboarding.preseed_exception.card | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].source` | HEAT_PRESSURE · onboarding_preseed | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].label_i18n.key` | exception.heat_pressure.acknowledge.labe · exception.heat_pressure.escalate.label · exception.heat_pressure.lay_low.label · exception.onboarding_preseed.acknowledge · exception.onboarding_preseed.escalate.la | **non — passé à côté ?** |
| `exceptions[].candidate_actions[].projected_consequence_i18n.key` | exception.heat_pressure.acknowledge.cons · exception.heat_pressure.escalate.consequ · exception.heat_pressure.lay_low.conseque · exception.onboarding_preseed.acknowledge · exception.onboarding_preseed.escalate.co | **non — passé à côté ?** |
| `exceptions[].suggested_action.source` | HEAT_PRESSURE · onboarding_preseed | **non — passé à côté ?** |
| `exceptions[].suggested_action.label_i18n.key` | exception.heat_pressure.acknowledge.labe · exception.onboarding_preseed.acknowledge | **non — passé à côté ?** |
| `exceptions[].suggested_action.projected_consequence_i18n.key` | exception.heat_pressure.acknowledge.cons · exception.onboarding_preseed.acknowledge | **non — passé à côté ?** |
| `exceptions[].suggested_disposition` | ESCALATE | **non — passé à côté ?** |
| `queue_pressure_band` | normal | **non — passé à côté ?** |
| `backlog_badge` | false | **non — passé à côté ?** |

### `GET /v1/lieutenants/{id}` — 18 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `name` | Lt. Quist | oui |
| `archetype` | COOK | **non — passé à côté ?** |
| `granted_role` | executor | **non — passé à côté ?** |
| `mode` | delegated | **non — passé à côté ?** |
| `op_state_band` | IDLE | **non — passé à côté ?** |
| `rule_count_band` | NONE | **non — passé à côté ?** |
| `tenure_bucket` | FRESH | **non — passé à côté ?** |
| `script_revision_cost` | COST_1 | **non — passé à côté ?** |
| `reassignment_disruption` | DISRUPT_SHORT | **non — passé à côté ?** |
| `role_efficiency_bonus` | BONUS_NONE | **non — passé à côté ?** |
| `reassign_availability` | AVAILABLE | **non — passé à côté ?** |
| `budget_bands.PRODUCTION_OPS` | depleted | **non — passé à côté ?** |
| `drift_phase` | DIRECT_ALIGNED | **non — passé à côté ?** |
| `standing_order.freshness` | NONE | **non — passé à côté ?** |
| `standing_order.promotion_suggested` | false | **non — passé à côté ?** |
| `trust_budget_bucket` | high | **non — passé à côté ?** |
| `flag_frequency_band` | none | **non — passé à côté ?** |
| `script_source` |  | **non — passé à côté ?** |

### `GET /v1/me` — 7 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `account_id` | 01a01f34-fceb-79f3-9662-d0930f144fee | **non — passé à côté ?** |
| `handle` | operational_demo | oui |
| `email` | operational_demo@example.test | **non — passé à côté ?** |
| `lifecycle_state` | ACTIVE | **non — passé à côté ?** |
| `locale` | fr | **non — passé à côté ?** |
| `player_id` | 01a01f34-fd4e-7771-83b0-b75efa6e8023 | **non — passé à côté ?** |
| `meta_market_visibility_enabled` | true | **non — passé à côté ?** |

### `GET /v1/progression` — 5 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `vocabulary_tier` | 1 | oui |
| `progress_to_next` | LOCKED | oui |
| `next_tier` | 2 | **non — passé à côté ?** |
| `tier_label_i18n.key` | game.progression.tier_label | **non — passé à côté ?** |
| `tier_label_i18n.params.tier` | 2 | **non — passé à côté ?** |

### `GET /v1/world/districts` — 9 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `districts[].id` | 1 · 2 · 3 · 4 · 5 · 6 | oui |
| `districts[].profile` | tidewater · spine · lattice · stack · glass · verge | **non — passé à côté ?** |
| `districts[].index` | 1 · 2 · 3 · a · b · c | **non — passé à côté ?** |
| `districts[].name_canonical` | Tidewater-1 · Tidewater-2 · Tidewater-3 · Spine-A · Spine-B · Spine-C | **non — passé à côté ?** |
| `districts[].block_count` | 37 · 44 · 51 · 58 · 65 · 72 | **non — passé à côté ?** |
| `districts[].bank_side` | north · south | **non — passé à côté ?** |
| `districts[].control_state` | UNCONTESTED | **non — passé à côté ?** |
| `districts[].name` | Les Bassins · Quai-Nord · Sarnes · La Colonne · Hautes-Marches · Verrier | oui |
| `districts[].precinct_id` | 1 · 2 · 3 · 4 · 5 · 6 | **non — passé à côté ?** |

### `POST /v1/session/open` — 53 champs

| champ | exemple(s) servi(s) | lu par le code de l'écran ? |
|---|---|---|
| `session_id` | b530f076-22bb-42cf-a509-2686fccfcf0b | **non — passé à côté ?** |
| `hl_card.card_id` | aa144c2b-d1b0-47b8-8851-448b4b0af21b | oui |
| `hl_card.decision_type_key` | AUTONOMY_REPORTS_PENDING | oui |
| `hl_card.impact_bucket` | moderate | oui |
| `hl_card.urgency_bucket` | low | oui |
| `hl_card.options[].label` | hl.option.autonomy_reports.review_now · hl.option.autonomy_reports.leave_pending | oui |
| `hl_card.structural` | false | oui |
| `queue[].exception_id` | e0be040d-5949-48b2-b46c-a936c19df200 · 56eca591-722e-420e-969f-6a39407a77e0 · af8fecb8-dcd1-4a44-96fb-bf4a6d62e47d | oui |
| `queue[].lieutenant_id` | 01a0c8d5-8822-7527-bb8e-ce6096ff1ceb · null | **non — passé à côté ?** |
| `queue[].lieutenant.id` | 01a0c8d5-8822-7527-bb8e-ce6096ff1ceb | oui |
| `queue[].lieutenant.name` | Lt. Quist | oui |
| `queue[].event_descriptor` | exc_demo_teach_heat · exc_demo_raid_style · Citywide heat is high — your operations  | oui |
| `queue[].event_descriptor_i18n` | null | **non — passé à côté ?** |
| `queue[].candidate_actions[].id` | teach_heat · let_ride · fix_quiet · pay_off · lay_low · acknowledge | oui |
| `queue[].candidate_actions[].label` | Teach: pause on high heat · Let it ride · Repair quietly · Bribe the inspector · Lay low · Acknowledge the pressure | oui |
| `queue[].candidate_actions[].add_rule_dsl` | WHEN EVENT(heat,>=,0.5) THEN PAUSE_OPS @ · null | **non — passé à côté ?** |
| `queue[].candidate_actions[].projected_consequence` | Ops pause whenever heat spikes · The risk stays · Costs cash, sheds no heat · Cheaper but riskier · Free, ops slow down · You note the heat; no automatic action i | **non — passé à côté ?** |
| `queue[].candidate_actions[].method` | ONE_TIME · LAY_LOW · ESCALATE | oui |
| `queue[].suggested_action.id` | teach_heat · fix_quiet · acknowledge | oui |
| `queue[].suggested_action.label` | Teach: pause on high heat · Repair quietly · Acknowledge the pressure | oui |
| `queue[].suggested_action.add_rule_dsl` | WHEN EVENT(heat,>=,0.5) THEN PAUSE_OPS @ · null | **non — passé à côté ?** |
| `queue[].suggested_action.projected_consequence` | Ops pause whenever heat spikes · Costs cash, sheds no heat · You note the heat; no automatic action i | **non — passé à côté ?** |
| `queue[].suggested_action.method` | ONE_TIME | oui |
| `queue[].confidence_band` | confident | **non — passé à côté ?** |
| `queue[].priority_band` | critical · urgent | **non — passé à côté ?** |
| `queue[].severity_band` | SEVERE · MODERATE | oui |
| `queue[].resolution_status` | pending | **non — passé à côté ?** |
| `queue[].candidate_actions[].effect.type` | REPAIR · BRIBE · LAY_LOW | **non — passé à côté ?** |
| `queue[].candidate_actions[].effect.target_building_id` | 7f664c38-22ed-4efe-a65c-95052c163be6 | **non — passé à côté ?** |
| `queue[].suggested_action.effect.type` | REPAIR | **non — passé à côté ?** |
| `queue[].suggested_action.effect.target_building_id` | 7f664c38-22ed-4efe-a65c-95052c163be6 | **non — passé à côté ?** |
| `queue[].lieutenant` | null | **non — passé à côté ?** |
| `queue[].event_descriptor_i18n.key` | exception.heat_pressure.card.descriptor | **non — passé à côté ?** |
| `queue[].candidate_actions[].label_i18n.key` | exception.heat_pressure.acknowledge.labe · exception.heat_pressure.escalate.label · exception.heat_pressure.lay_low.label | **non — passé à côté ?** |
| `queue[].candidate_actions[].projected_consequence_i18n.key` | exception.heat_pressure.acknowledge.cons · exception.heat_pressure.escalate.consequ · exception.heat_pressure.lay_low.conseque | **non — passé à côté ?** |
| `queue[].suggested_action.label_i18n.key` | exception.heat_pressure.acknowledge.labe | **non — passé à côté ?** |
| `queue[].suggested_action.projected_consequence_i18n.key` | exception.heat_pressure.acknowledge.cons | **non — passé à côté ?** |
| `backlog_badge` | false | **non — passé à côté ?** |
| `queue_pressure_band` | normal | **non — passé à côté ?** |
| `structural_budget.used` | 0 | **non — passé à côté ?** |
| `structural_budget.cap_reached` | false | oui |
| `flag_review.pending_review_count` | 0 | **non — passé à côté ?** |
| `flag_review.auto_open` | false | **non — passé à côté ?** |
| `settling_glance.settling_count` | 0 | **non — passé à côté ?** |
| `settling_glance.all_clear` | true | **non — passé à côté ?** |
| `friction_glance.friction_bucket` | balanced | oui |
| `friction_glance.penalty_active` | false | **non — passé à côté ?** |
| `compression_glance.stress_bucket` | calm | oui |
| `compression_glance.week_state` | none | oui |
| `compression_glance.forced` | false | oui |
| `onboarding.funnel_step` | HOME_FIRST | **non — passé à côté ?** |
| `onboarding.first_decision_recorded` | false | **non — passé à côté ?** |
| `opened_game_day` | 55 | **non — passé à côté ?** |
